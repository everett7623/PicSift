const SUPPORTED_HOSTS = [
  'alibaba.com', '1688.com', 'made-in-china.com', 'amazon.com', 'aliexpress.com',
  'taobao.com', 'tmall.com', 'jd.com', 'ebay.com', 'shopee.com'
];
const FILTER_STORAGE_KEY = 'picSiftFilters';
const ARCHIVE_FETCH_CONCURRENCY = 4;
const ARCHIVE_FETCH_TIMEOUT_MS = 20000;
const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;
const ARCHIVE_URL_LIFETIME_MS = 5 * 60 * 1000;
const CRC32_TABLE = createCrc32Table();
let sourceTabId = getSourceTabId();

let extractedImages = [];
let extractedVideos = [];
const selectedImages = new Set();
const selectedVideos = new Set();
let currentTab = 'images';
let isWorking = false;
let imageExtractionCompleted = false;
let videoExtractionCompleted = false;

const elements = {
  extractBtn: document.getElementById('extractBtn'),
  extractVideosBtn: document.getElementById('extractVideosBtn'),
  selectAllBtn: document.getElementById('selectAllBtn'),
  deselectAllBtn: document.getElementById('deselectAllBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  downloadLabel: document.getElementById('downloadLabel'),
  imageGrid: document.getElementById('imageGrid'),
  videoGrid: document.getElementById('videoGrid'),
  status: document.getElementById('status'),
  statusText: document.getElementById('statusText'),
  selectedCount: document.getElementById('selectedCount'),
  tabImages: document.getElementById('tabImages'),
  tabVideos: document.getElementById('tabVideos'),
  imageFilters: document.getElementById('imageFilters'),
  imageTabCount: document.getElementById('imageTabCount'),
  videoTabCount: document.getElementById('videoTabCount'),
  versionBadge: document.getElementById('versionBadge'),
  resultTitle: document.getElementById('resultTitle'),
  resultCount: document.getElementById('resultCount'),
  siteBadge: document.getElementById('siteBadge'),
  siteName: document.getElementById('siteName'),
  previewDialog: document.getElementById('previewDialog'),
  previewTitle: document.getElementById('previewTitle'),
  previewImage: document.getElementById('previewImage'),
  previewVideo: document.getElementById('previewVideo'),
  previewMeta: document.getElementById('previewMeta'),
  previewOriginalLink: document.getElementById('previewOriginalLink'),
  closePreviewBtn: document.getElementById('closePreviewBtn'),
  minWidthInput: document.getElementById('minWidth'),
  minHeightInput: document.getElementById('minHeight'),
  filterSquare: document.getElementById('filterSquare'),
  filterLandscape: document.getElementById('filterLandscape'),
  filterPortrait: document.getElementById('filterPortrait')
};

elements.tabImages.addEventListener('click', () => switchTab('images'));
elements.tabVideos.addEventListener('click', () => switchTab('videos'));
elements.extractBtn.addEventListener('click', () => extractMedia('images'));
elements.extractVideosBtn.addEventListener('click', () => extractMedia('videos'));
elements.selectAllBtn.addEventListener('click', selectAll);
elements.deselectAllBtn.addEventListener('click', deselectAll);
elements.downloadBtn.addEventListener('click', downloadSelected);
elements.siteBadge.addEventListener('click', focusSourceTab);
elements.closePreviewBtn.addEventListener('click', () => elements.previewDialog.close());
elements.previewDialog.addEventListener('click', event => {
  if (event.target === elements.previewDialog) elements.previewDialog.close();
});
elements.previewDialog.addEventListener('close', resetPreview);

[
  elements.minWidthInput,
  elements.minHeightInput,
  elements.filterSquare,
  elements.filterLandscape,
  elements.filterPortrait
].forEach(input => input.addEventListener('change', saveFilters));

elements.minWidthInput.addEventListener('blur', normalizeFilterInputs);
elements.minHeightInput.addEventListener('blur', normalizeFilterInputs);

initializePopup();

async function initializePopup() {
  if (globalThis.chrome?.runtime?.getManifest) {
    elements.versionBadge.textContent = `v${chrome.runtime.getManifest().version}`;
  }
  renderImages();
  renderVideos();
  switchTab('images');

  await Promise.allSettled([
    restoreFilters(),
    refreshSiteContext()
  ]);
}

function switchTab(tabName) {
  if (isWorking || tabName === currentTab) {
    updateSelection();
    return;
  }

  currentTab = tabName;
  const showingImages = currentTab === 'images';

  elements.tabImages.classList.toggle('active', showingImages);
  elements.tabVideos.classList.toggle('active', !showingImages);
  elements.tabImages.setAttribute('aria-selected', String(showingImages));
  elements.tabVideos.setAttribute('aria-selected', String(!showingImages));
  elements.imageFilters.hidden = !showingImages;
  elements.extractBtn.hidden = !showingImages;
  elements.extractVideosBtn.hidden = showingImages;
  elements.imageGrid.hidden = !showingImages;
  elements.videoGrid.hidden = showingImages;
  elements.resultTitle.textContent = showingImages ? '图片' : '视频';

  updateSelection();
}

async function extractMedia(type) {
  if (isWorking) return;

  const isImage = type === 'images';
  setWorking(true);
  setStatus(`正在扫描本页${isImage ? '图片' : '视频'}…`, 'busy');

  try {
    const { tab } = await getSupportedActiveTab();
    const request = isImage
      ? { action: 'extractImages', filters: getFilters() }
      : { action: 'extractVideos' };
    const response = await sendMessageToSourceTab(tab.id, request);

    if (!response?.success) {
      throw new Error(response?.error || '页面未返回有效结果');
    }

    if (isImage) {
      extractedImages = normalizeExtractedItems(response.images, 'images');
      selectedImages.clear();
      imageExtractionCompleted = true;
      renderImages();
      setStatus(`扫描完成，找到 ${extractedImages.length} 张符合条件的图片`, 'success');
    } else {
      extractedVideos = normalizeExtractedItems(response.videos, 'videos');
      selectedVideos.clear();
      videoExtractionCompleted = true;
      renderVideos();
      setStatus(`扫描完成，找到 ${extractedVideos.length} 个直链视频`, 'success');
    }
  } catch (error) {
    setStatus(getFriendlyError(error), 'error');
    console.error(`${isImage ? '图片' : '视频'}提取失败:`, error);
  } finally {
    setWorking(false);
  }
}

async function sendMessageToSourceTab(tabId, request) {
  try {
    return await chrome.tabs.sendMessage(tabId, request);
  } catch (error) {
    if (!isMissingContentScriptError(error)) throw error;

    setStatus('正在连接来源商品页…', 'busy');
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });
    return chrome.tabs.sendMessage(tabId, request);
  }
}

function isMissingContentScriptError(error) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /receiving end does not exist|could not establish connection/i.test(message);
}

function normalizeExtractedItems(items, type) {
  if (!Array.isArray(items)) return [];

  const seenUrls = new Set();
  return items.filter(item => {
    if (!item || typeof item !== 'object' || !isValidMediaUrl(item.url)) return false;
    if (seenUrls.has(item.url)) return false;
    if (type === 'images' && (!Number.isFinite(item.width) || !Number.isFinite(item.height))) return false;
    seenUrls.add(item.url);
    return true;
  });
}

function selectAll() {
  if (isWorking) return;

  const items = getCurrentItems();
  const selectedSet = getCurrentSelection();
  items.forEach(item => selectedSet.add(item.url));
  updateSelection();
}

function deselectAll() {
  if (isWorking) return;
  getCurrentSelection().clear();
  updateSelection();
}

async function downloadSelected() {
  if (isWorking) return;

  const downloadType = currentTab;
  const selectedSet = getCurrentSelection();
  const selectedItems = Array.from(selectedSet);
  if (selectedItems.length === 0) return;

  const shouldCreateArchive = downloadType === 'images' && selectedItems.length > 1;
  setWorking(true);
  setStatus(
    shouldCreateArchive
      ? `正在准备 ${selectedItems.length} 张图片的 ZIP…`
      : `正在提交 ${selectedItems.length} 个${downloadType === 'images' ? '图片' : '视频'}下载…`,
    'busy'
  );

  try {
    const { url } = await getSupportedActiveTab();
    const folderName = `${url.hostname}_${getLocalDateString()}`;
    const response = shouldCreateArchive
      ? await downloadImageArchive(selectedItems, folderName, (completed, total) => {
        setStatus(`正在获取图片并生成 ZIP：${completed}/${total}`, 'busy');
      })
      : await chrome.runtime.sendMessage({
        action: downloadType === 'images' ? 'downloadImages' : 'downloadVideos',
        items: selectedItems,
        folderName
      });

    if (!response?.success) {
      throw new Error(response?.error || '后台下载服务未响应');
    }

    const failedItems = Array.isArray(response.failedItems) ? response.failedItems : [];
    selectedSet.clear();
    failedItems.forEach(urlValue => selectedSet.add(urlValue));

    const itemType = downloadType === 'images' ? '图片' : '视频';
    if (response.failed > 0) {
      const tone = response.downloaded > 0 ? 'neutral' : 'error';
      const successMessage = shouldCreateArchive
        ? `已将 ${response.downloaded} 张图片打包为一个 ZIP`
        : `已开始 ${response.downloaded} 个${itemType}下载`;
      setStatus(`${successMessage}，${response.failed} 个失败并保留选择`, tone);
    } else if (shouldCreateArchive) {
      setStatus(`已将 ${response.downloaded} 张图片打包为一个 ZIP 下载`, 'success');
    } else {
      setStatus(`已开始下载 ${response.downloaded} 个${itemType}`, 'success');
    }
  } catch (error) {
    setStatus(getFriendlyError(error), 'error');
    console.error('下载失败:', error);
  } finally {
    setWorking(false);
  }
}

async function downloadImageArchive(items, folderName, onProgress = () => {}) {
  const { entries, failedItems } = await fetchArchiveEntries(items, onProgress);
  if (entries.length === 0) {
    throw new Error('所有图片都无法获取，未生成 ZIP；请检查页面登录状态或图片访问权限');
  }

  const archive = buildZipArchive(entries);
  const archiveUrl = URL.createObjectURL(archive);

  try {
    const downloadId = await chrome.downloads.download({
      url: archiveUrl,
      filename: `PicSift/${folderName}/images.zip`,
      conflictAction: 'uniquify',
      saveAs: false
    });
    if (!Number.isInteger(downloadId)) {
      throw new Error('浏览器未接受 ZIP 下载任务');
    }
  } catch (error) {
    URL.revokeObjectURL(archiveUrl);
    throw error;
  }

  setTimeout(() => URL.revokeObjectURL(archiveUrl), ARCHIVE_URL_LIFETIME_MS);
  return {
    success: true,
    downloaded: entries.length,
    failed: failedItems.length,
    failedItems
  };
}

async function fetchArchiveEntries(items, onProgress) {
  const entries = new Array(items.length);
  const failedItems = [];
  let nextIndex = 0;
  let completed = 0;
  let totalBytes = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      const url = items[index];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ARCHIVE_FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          cache: 'force-cache',
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentType = response.headers.get('content-type') || '';
        if (contentType && !contentType.toLowerCase().startsWith('image/')) {
          throw new Error(`返回了非图片内容：${contentType}`);
        }

        const data = new Uint8Array(await response.arrayBuffer());
        if (data.length === 0) throw new Error('图片内容为空');
        if (totalBytes + data.length > MAX_ARCHIVE_BYTES) {
          throw new Error('ZIP 内容超过 256 MB 上限');
        }

        totalBytes += data.length;
        entries[index] = {
          name: `images/${String(index + 1).padStart(3, '0')}.${getImageExtension(url, contentType)}`,
          data
        };
      } catch (error) {
        console.warn(`无法加入 ZIP: ${url}`, error);
        failedItems.push(url);
      } finally {
        clearTimeout(timeoutId);
        completed++;
        onProgress(completed, items.length);
      }
    }
  }

  const workerCount = Math.min(ARCHIVE_FETCH_CONCURRENCY, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return { entries: entries.filter(Boolean), failedItems };
}

function getImageExtension(url, contentType = '') {
  const extensionByType = {
    'image/avif': 'avif',
    'image/bmp': 'bmp',
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/svg+xml': 'svg',
    'image/tiff': 'tiff',
    'image/webp': 'webp'
  };
  const normalizedType = contentType.split(';', 1)[0].trim().toLowerCase();
  if (extensionByType[normalizedType]) return extensionByType[normalizedType];

  try {
    const match = new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i);
    if (match && ['avif', 'bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'tif', 'tiff', 'webp']
      .includes(match[1].toLowerCase())) {
      return match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
    }
  } catch {
    // 使用安全的默认扩展名。
  }
  return 'jpg';
}

function buildZipArchive(entries, modifiedAt = new Date()) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('ZIP 中没有可写入的文件');
  }
  if (entries.length > 65535) {
    throw new Error('ZIP 文件数量超过格式上限');
  }

  const encoder = new TextEncoder();
  const dateParts = getDosDateTime(modifiedAt);
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  let centralSize = 0;

  entries.forEach(entry => {
    const name = encoder.encode(entry.name);
    const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
    const crc32 = calculateCrc32(data);
    const localHeader = createLocalZipHeader(name, data.length, crc32, dateParts);
    const centralHeader = createCentralZipHeader(
      name,
      data.length,
      crc32,
      dateParts,
      localOffset
    );

    localParts.push(localHeader, name, data);
    centralParts.push(centralHeader, name);
    localOffset += localHeader.length + name.length + data.length;
    centralSize += centralHeader.length + name.length;
  });

  const endRecord = createEndOfCentralDirectory(entries.length, centralSize, localOffset);
  return new Blob([...localParts, ...centralParts, endRecord], { type: 'application/zip' });
}

function createLocalZipHeader(name, size, crc32, dateParts) {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, dateParts.time, true);
  view.setUint16(12, dateParts.date, true);
  view.setUint32(14, crc32, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, name.length, true);
  view.setUint16(28, 0, true);
  return header;
}

function createCentralZipHeader(name, size, crc32, dateParts, localOffset) {
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, dateParts.time, true);
  view.setUint16(14, dateParts.date, true);
  view.setUint32(16, crc32, true);
  view.setUint32(20, size, true);
  view.setUint32(24, size, true);
  view.setUint16(28, name.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localOffset, true);
  return header;
}

function createEndOfCentralDirectory(entryCount, centralSize, centralOffset) {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  view.setUint16(20, 0, true);
  return record;
}

function getDosDateTime(value) {
  const date = value instanceof Date && Number.isFinite(value.getTime()) ? value : new Date();
  const year = Math.min(2107, Math.max(1980, date.getFullYear()));
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  };
}

function createCrc32Table() {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
}

function calculateCrc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getFilters() {
  return {
    minWidth: normalizeDimension(elements.minWidthInput.value),
    minHeight: normalizeDimension(elements.minHeightInput.value),
    square: elements.filterSquare.checked,
    landscape: elements.filterLandscape.checked,
    portrait: elements.filterPortrait.checked
  };
}

function normalizeDimension(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(10000, Math.max(0, Math.round(number))) : 0;
}

function normalizeFilterInputs() {
  elements.minWidthInput.value = String(normalizeDimension(elements.minWidthInput.value));
  elements.minHeightInput.value = String(normalizeDimension(elements.minHeightInput.value));
}

async function restoreFilters() {
  if (!globalThis.chrome?.storage?.local) return;

  try {
    const stored = await chrome.storage.local.get(FILTER_STORAGE_KEY);
    const filters = stored[FILTER_STORAGE_KEY];
    if (!filters || typeof filters !== 'object') return;

    elements.minWidthInput.value = String(normalizeDimension(filters.minWidth));
    elements.minHeightInput.value = String(normalizeDimension(filters.minHeight));
    elements.filterSquare.checked = filters.square === true;
    elements.filterLandscape.checked = filters.landscape === true;
    elements.filterPortrait.checked = filters.portrait === true;
  } catch (error) {
    console.warn('无法恢复筛选设置:', error);
  }
}

async function saveFilters() {
  normalizeFilterInputs();
  if (!globalThis.chrome?.storage?.local) return;

  try {
    await chrome.storage.local.set({ [FILTER_STORAGE_KEY]: getFilters() });
  } catch (error) {
    console.warn('无法保存筛选设置:', error);
  }
}

function renderImages() {
  elements.imageGrid.replaceChildren();
  elements.imageGrid.classList.toggle('is-empty', extractedImages.length === 0);

  if (extractedImages.length === 0) {
    const title = imageExtractionCompleted ? '没有符合条件的图片' : '等待提取图片';
    const hint = imageExtractionCompleted ? '可降低尺寸条件或调整图片比例' : '设置筛选条件，然后扫描当前商品页';
    elements.imageGrid.appendChild(createEmptyState(title, hint));
  } else {
    extractedImages.forEach((image, index) => {
      elements.imageGrid.appendChild(createImageCard(image, index));
    });
  }

  elements.imageTabCount.textContent = String(extractedImages.length);
  updateSelection();
}

function createImageCard(image, index) {
  const item = createMediaButton(image.url, `选择第 ${index + 1} 张图片`);
  item.classList.add('image-item');

  const imageElement = document.createElement('img');
  imageElement.src = image.url;
  imageElement.alt = `商品图片 ${index + 1}`;
  imageElement.loading = 'lazy';
  imageElement.decoding = 'async';
  imageElement.draggable = false;

  const placeholder = createMediaPlaceholder('图片加载失败');
  placeholder.hidden = true;
  imageElement.addEventListener('error', () => {
    imageElement.hidden = true;
    placeholder.hidden = false;
  }, { once: true });

  item.append(
    imageElement,
    placeholder,
    createCheckbox(),
    createInfo(`${image.width} × ${image.height}`)
  );
  item.addEventListener('click', () => toggleSelection(image.url, selectedImages));
  item.addEventListener('dblclick', event => {
    event.preventDefault();
    openPreview(image, 'images');
  });
  return item;
}

function renderVideos() {
  elements.videoGrid.replaceChildren();
  elements.videoGrid.classList.toggle('is-empty', extractedVideos.length === 0);

  if (extractedVideos.length === 0) {
    const title = videoExtractionCompleted ? '没有找到直链视频' : '等待提取视频';
    const hint = videoExtractionCompleted ? '流媒体或受保护视频暂不支持' : '切换到视频后扫描当前商品页';
    elements.videoGrid.appendChild(createEmptyState(title, hint));
  } else {
    extractedVideos.forEach((video, index) => {
      elements.videoGrid.appendChild(createVideoCard(video, index));
    });
  }

  elements.videoTabCount.textContent = String(extractedVideos.length);
  updateSelection();
}

function createVideoCard(video, index) {
  const item = createMediaButton(video.url, `选择第 ${index + 1} 个视频`);
  item.classList.add('video-item');

  const videoElement = document.createElement('video');
  videoElement.src = video.url;
  videoElement.muted = true;
  videoElement.preload = 'metadata';
  videoElement.playsInline = true;
  if (isValidMediaUrl(video.poster)) videoElement.poster = video.poster;

  const placeholder = createMediaPlaceholder('视频预览不可用');
  placeholder.hidden = true;
  videoElement.addEventListener('error', () => {
    videoElement.hidden = true;
    placeholder.hidden = false;
  }, { once: true });

  const mediaIcon = document.createElement('span');
  mediaIcon.className = 'media-icon';
  mediaIcon.setAttribute('aria-hidden', 'true');
  mediaIcon.textContent = '▶';

  item.append(
    videoElement,
    placeholder,
    mediaIcon,
    createCheckbox(),
    createInfo(formatVideoType(video.type))
  );
  item.addEventListener('click', () => toggleSelection(video.url, selectedVideos));
  item.addEventListener('dblclick', event => {
    event.preventDefault();
    openPreview(video, 'videos');
  });
  return item;
}

function createMediaButton(url, label) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'media-item';
  item.dataset.url = url;
  item.setAttribute('aria-label', label);
  item.setAttribute('aria-pressed', 'false');
  return item;
}

function createCheckbox() {
  const checkbox = document.createElement('span');
  checkbox.className = 'checkbox';
  checkbox.setAttribute('aria-hidden', 'true');
  return checkbox;
}

function createInfo(text) {
  const info = document.createElement('span');
  info.className = 'info';
  info.textContent = text;
  return info;
}

function createMediaPlaceholder(text) {
  const placeholder = document.createElement('span');
  placeholder.className = 'media-placeholder';
  placeholder.textContent = text;
  return placeholder;
}

function createEmptyState(title, hint) {
  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';

  const content = document.createElement('div');
  const heading = document.createElement('strong');
  const description = document.createElement('span');
  heading.textContent = title;
  description.textContent = hint;
  content.append(heading, description);
  emptyState.appendChild(content);
  return emptyState;
}

function toggleSelection(url, selectedSet) {
  if (isWorking) return;
  if (selectedSet.has(url)) selectedSet.delete(url);
  else selectedSet.add(url);
  updateSelection();
}

function updateSelection() {
  const selectedSet = getCurrentSelection();
  const grid = currentTab === 'images' ? elements.imageGrid : elements.videoGrid;

  grid.querySelectorAll('.media-item').forEach(item => {
    const selected = selectedSet.has(item.dataset.url);
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-pressed', String(selected));
  });

  const itemCount = getCurrentItems().length;
  const itemType = currentTab === 'images' ? '图片' : '视频';
  elements.selectedCount.textContent = String(selectedSet.size);
  elements.resultCount.textContent = `${itemCount} 项`;
  elements.downloadLabel.textContent = currentTab === 'images' && selectedSet.size > 1
    ? `打包下载 ${selectedSet.size} 张图片`
    : `下载选中${itemType}`;
  updateControls();
}

function updateControls() {
  const selectedCount = getCurrentSelection().size;
  const itemCount = getCurrentItems().length;

  elements.tabImages.disabled = isWorking;
  elements.tabVideos.disabled = isWorking;
  elements.extractBtn.disabled = isWorking;
  elements.extractVideosBtn.disabled = isWorking;
  elements.selectAllBtn.disabled = isWorking || itemCount === 0 || selectedCount === itemCount;
  elements.deselectAllBtn.disabled = isWorking || selectedCount === 0;
  elements.downloadBtn.disabled = isWorking || selectedCount === 0;
}

function setWorking(value) {
  isWorking = value;
  updateControls();
}

function setStatus(message, tone = 'neutral') {
  elements.status.dataset.tone = tone;
  elements.statusText.textContent = message;
}

function openPreview(item, type) {
  if (!isValidMediaUrl(item.url)) return;
  if (elements.previewDialog.open) elements.previewDialog.close();

  const isImage = type === 'images';
  elements.previewTitle.textContent = isImage ? '查看原图' : '视频预览';
  elements.previewMeta.textContent = isImage
    ? `${item.width} × ${item.height}`
    : formatVideoType(item.type);
  elements.previewOriginalLink.href = item.url;
  elements.previewImage.hidden = !isImage;
  elements.previewVideo.hidden = isImage;

  if (isImage) {
    elements.previewImage.src = item.url;
  } else {
    elements.previewVideo.src = item.url;
    if (isValidMediaUrl(item.poster)) elements.previewVideo.poster = item.poster;
  }

  elements.previewDialog.showModal();
}

function resetPreview() {
  elements.previewImage.removeAttribute('src');
  elements.previewVideo.pause();
  elements.previewVideo.removeAttribute('src');
  elements.previewVideo.removeAttribute('poster');
  elements.previewVideo.load();
}

function getCurrentItems() {
  return currentTab === 'images' ? extractedImages : extractedVideos;
}

function getCurrentSelection() {
  return currentTab === 'images' ? selectedImages : selectedVideos;
}

async function refreshSiteContext() {
  try {
    const { url } = await getSupportedActiveTab();
    elements.siteBadge.dataset.state = 'connected';
    elements.siteName.textContent = url.hostname;
    elements.siteBadge.title = `已连接到 ${url.hostname}`;
    elements.siteBadge.disabled = false;
  } catch (error) {
    const message = getFriendlyError(error);
    elements.siteBadge.dataset.state = 'warning';
    elements.siteName.textContent = '未连接商品页';
    elements.siteBadge.title = `${message}；点击尝试重新连接`;
    elements.siteBadge.disabled = false;
    setStatus(message, 'error');
  }
}

async function getSupportedActiveTab() {
  let tab;
  let sourceTabMissing = false;
  if (sourceTabId !== null) {
    try {
      tab = await chrome.tabs.get(sourceTabId);
    } catch {
      sourceTabMissing = true;
    }
  }

  if (!tab) {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  }

  let context = getSupportedTabContext(tab);
  if (!context) {
    const fallbackTab = await findMostRecentSupportedTab(tab?.id);
    context = getSupportedTabContext(fallbackTab);
  }

  if (!context) {
    if (sourceTabMissing) {
      throw new Error('来源商品页已关闭，请打开商品页后重新点击 PicSift 图标');
    }
    throw new Error('未连接商品页，请切回商品页后重新点击 PicSift 图标');
  }

  rememberSourceTabId(context.tab.id);
  return context;
}

function getSupportedTabContext(tab) {
  if (!Number.isInteger(tab?.id) || !tab.url) return null;

  try {
    const url = new URL(tab.url);
    if (url.protocol !== 'https:' || !isSupportedHostname(url.hostname)) return null;
    return { tab, url };
  } catch {
    return null;
  }
}

async function findMostRecentSupportedTab(excludedTabId) {
  try {
    const tabs = await chrome.tabs.query({});
    return tabs
      .filter(tab => tab.id !== excludedTabId && getSupportedTabContext(tab))
      .sort((left, right) => (right.lastAccessed || 0) - (left.lastAccessed || 0))[0] || null;
  } catch (error) {
    console.warn('无法查找可恢复的来源商品页:', error);
    return null;
  }
}

function rememberSourceTabId(tabId) {
  if (!Number.isInteger(tabId) || tabId <= 0) return;
  sourceTabId = tabId;

  if (typeof globalThis.history?.replaceState !== 'function' || !window.location.href) return;
  const dashboardUrl = new URL(window.location.href);
  if (dashboardUrl.searchParams.get('sourceTabId') === String(tabId)) return;
  dashboardUrl.searchParams.set('sourceTabId', String(tabId));
  globalThis.history.replaceState(null, '', dashboardUrl.href);
}

async function focusSourceTab() {
  try {
    if (sourceTabId === null) await getSupportedActiveTab();
    if (sourceTabId === null) throw new Error('未连接商品页');
    const tab = await chrome.tabs.get(sourceTabId);
    await chrome.tabs.update(sourceTabId, { active: true });
    if (Number.isInteger(tab.windowId)) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  } catch (error) {
    setStatus('来源商品页已关闭，请从商品页重新打开工作台', 'error');
  }
}

function getSourceTabId() {
  const value = new URLSearchParams(window.location.search).get('sourceTabId');
  if (!value) return null;
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function isSupportedHostname(hostname) {
  const normalizedHostname = hostname.toLowerCase();
  return SUPPORTED_HOSTS.some(domain =>
    normalizedHostname === domain || normalizedHostname.endsWith(`.${domain}`)
  );
}

function isValidMediaUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatVideoType(type) {
  const labels = {
    video: '页面视频',
    'alibaba-video': '阿里视频',
    'taobao-video': '淘宝视频',
    'made-in-china-video': '中国制造网视频'
  };
  return labels[type] || '直链视频';
}

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getFriendlyError(error) {
  const message = error instanceof Error ? error.message : String(error || '未知错误');
  if (/receiving end does not exist|could not establish connection/i.test(message)) {
    return '无法连接来源商品页，请确认页面仍然打开后重试';
  }
  if (/cannot access contents|cannot access a chrome/i.test(message)) {
    return '当前页面未获得访问权限，请在受支持的商品页重新打开工作台';
  }
  return message;
}
