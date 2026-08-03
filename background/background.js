const MAX_DOWNLOAD_ITEMS = 500;
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tif', 'tiff', 'avif']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'avi', 'flv', 'm4v']);
const DASHBOARD_TAB_KEY = 'picSiftDashboardTabId';

// 点击扩展图标时，在独立标签页打开可复用的全屏工作台。
chrome.action.onClicked.addListener((sourceTab) => {
  openDashboard(sourceTab).catch(error => {
    console.error('无法打开 PicSift 工作台:', error);
  });
});

async function openDashboard(sourceTab) {
  const sourceTabId = resolveSourceTabId(sourceTab);

  const dashboardUrl = new URL(chrome.runtime.getURL('popup/popup.html'));
  dashboardUrl.searchParams.set('sourceTabId', String(sourceTabId));

  const stored = await chrome.storage.session.get(DASHBOARD_TAB_KEY);
  const existingTabId = stored[DASHBOARD_TAB_KEY];

  if (Number.isInteger(existingTabId)) {
    try {
      const existingTab = await chrome.tabs.get(existingTabId);
      await chrome.tabs.update(existingTabId, { url: dashboardUrl.href, active: true });
      if (Number.isInteger(existingTab.windowId)) {
        await chrome.windows.update(existingTab.windowId, { focused: true });
      }
      return existingTabId;
    } catch {
      await chrome.storage.session.remove(DASHBOARD_TAB_KEY);
    }
  }

  const dashboardTab = await chrome.tabs.create({ url: dashboardUrl.href });
  if (!Number.isInteger(dashboardTab.id)) {
    throw new Error('工作台标签页创建失败');
  }

  await chrome.storage.session.set({ [DASHBOARD_TAB_KEY]: dashboardTab.id });
  return dashboardTab.id;
}

function resolveSourceTabId(sourceTab) {
  if (!Number.isInteger(sourceTab?.id)) {
    throw new Error('无法识别当前标签页');
  }

  const dashboardUrl = chrome.runtime.getURL('popup/popup.html');
  const sourceUrl = sourceTab.url || sourceTab.pendingUrl || '';
  if (!sourceUrl.startsWith(dashboardUrl)) return sourceTab.id;

  try {
    const recoveredTabId = Number(new URL(sourceUrl).searchParams.get('sourceTabId'));
    if (Number.isInteger(recoveredTabId) && recoveredTabId > 0 && recoveredTabId !== sourceTab.id) {
      return recoveredTabId;
    }
  } catch {
    // 由下方统一返回可操作的错误信息。
  }

  throw new Error('工作台未连接商品页，请切回商品页后重新点击 PicSift 图标');
}

// 监听来自 popup 的下载请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const typeByAction = {
    downloadImages: 'images',
    downloadVideos: 'videos'
  };
  const type = typeByAction[request?.action];

  if (!type) return false;

  handleDownloadRequest(request, type)
    .then(result => sendResponse({ success: true, ...result }))
    .catch(error => sendResponse({ success: false, error: error.message }));

  return true; // 异步响应时保持消息通道开启
});

/**
 * 校验并执行批量下载。
 * @param {Object} request - popup 发来的下载请求
 * @param {'images'|'videos'} type - 下载类型
 */
async function handleDownloadRequest(request, type) {
  const items = normalizeDownloadItems(request.items);
  if (items.length === 0) {
    throw new Error('没有可下载的有效 HTTP(S) 地址');
  }

  const fallbackFolder = `unknown_${new Date().toISOString().slice(0, 10)}`;
  const folderName = sanitizePathSegment(request.folderName, fallbackFolder);
  const result = await downloadItems(items, folderName, type);

  return {
    downloaded: result.success,
    failed: result.failed,
    failedItems: result.failedItems,
    skipped: Array.isArray(request.items) ? request.items.length - items.length : 0
  };
}

/**
 * 批量下载，并保留失败地址供 popup 重试。
 */
async function downloadItems(items, folderName, type) {
  let successCount = 0;
  const failedItems = [];
  const delay = type === 'images' ? 100 : 200;

  for (let index = 0; index < items.length; index++) {
    const url = items[index];

    try {
      await chrome.downloads.download({
        url,
        filename: generateFilename(url, index, folderName, type),
        conflictAction: 'uniquify',
        saveAs: false
      });
      successCount++;
    } catch (error) {
      console.error(`下载失败: ${url}`, error);
      failedItems.push(url);
    }

    if (index < items.length - 1) {
      await sleep(delay);
    }
  }

  return {
    success: successCount,
    failed: failedItems.length,
    failedItems
  };
}

/**
 * 过滤无效协议、重复地址并限制单批数量。
 */
function normalizeDownloadItems(items) {
  if (!Array.isArray(items)) return [];

  const uniqueItems = new Set();
  for (const item of items) {
    if (uniqueItems.size >= MAX_DOWNLOAD_ITEMS) break;
    if (isAllowedDownloadUrl(item)) uniqueItems.add(item);
  }

  return Array.from(uniqueItems);
}

function isAllowedDownloadUrl(value) {
  if (typeof value !== 'string' || value.length > 8192) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 生成安全的下载路径。
 */
function generateFilename(url, index, folderName, type = 'images') {
  const safeFolder = sanitizePathSegment(folderName, 'unknown');
  const extension = getDownloadExtension(url, type);
  const timestamp = Date.now();
  const filename = `${String(index + 1).padStart(3, '0')}_${timestamp}.${extension}`;

  return `PicSift/${safeFolder}/${type}/${filename}`;
}

function getDownloadExtension(url, type) {
  const fallback = type === 'images' ? 'jpg' : 'mp4';
  const allowedExtensions = type === 'images' ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS;

  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
    const extension = match?.[1].toLowerCase();
    return extension && allowedExtensions.has(extension) ? extension : fallback;
  } catch {
    return fallback;
  }
}

function sanitizePathSegment(value, fallback) {
  const sanitized = String(value || '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[. ]+/g, '')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 80);

  if (!sanitized) return fallback;
  if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(sanitized)) return `_${sanitized}`;
  return sanitized;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('PicSift 安装成功');
  } else if (details.reason === 'update') {
    console.log('PicSift 更新成功');
  }
});
