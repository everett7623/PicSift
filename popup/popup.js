// 状态管理
let extractedImages = [];
let extractedVideos = [];
let selectedImages = new Set();
let selectedVideos = new Set();
let currentTab = 'images'; // 'images' or 'videos'

// DOM 元素
const extractBtn = document.getElementById('extractBtn');
const extractVideosBtn = document.getElementById('extractVideosBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const downloadBtn = document.getElementById('downloadBtn');
const imageGrid = document.getElementById('imageGrid');
const videoGrid = document.getElementById('videoGrid');
const status = document.getElementById('status');
const selectedCount = document.getElementById('selectedCount');

// Tab 切换
const tabImages = document.getElementById('tabImages');
const tabVideos = document.getElementById('tabVideos');
const imageFilters = document.getElementById('imageFilters');

// 筛选器元素
const minWidthInput = document.getElementById('minWidth');
const minHeightInput = document.getElementById('minHeight');
const filterSquare = document.getElementById('filterSquare');
const filterLandscape = document.getElementById('filterLandscape');
const filterPortrait = document.getElementById('filterPortrait');

// Tab 切换逻辑
tabImages.addEventListener('click', () => {
  currentTab = 'images';
  tabImages.classList.add('active');
  tabVideos.classList.remove('active');
  imageFilters.style.display = 'block';
  extractBtn.style.display = 'inline-block';
  extractVideosBtn.style.display = 'none';
  imageGrid.style.display = 'grid';
  videoGrid.style.display = 'none';
  updateSelection();
});

tabVideos.addEventListener('click', () => {
  currentTab = 'videos';
  tabVideos.classList.add('active');
  tabImages.classList.remove('active');
  imageFilters.style.display = 'none';
  extractBtn.style.display = 'none';
  extractVideosBtn.style.display = 'inline-block';
  imageGrid.style.display = 'none';
  videoGrid.style.display = 'grid';
  updateSelection();
});

// 提取图片
extractBtn.addEventListener('click', async () => {
  try {
    status.textContent = '正在提取图片...';
    extractBtn.disabled = true;

    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 向 content script 发送提取请求
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractImages',
      filters: getFilters()
    });

    if (response.success) {
      extractedImages = response.images;
      selectedImages.clear();
      renderImages();
      status.textContent = `找到 ${extractedImages.length} 张图片`;
    } else {
      status.textContent = response.error || '提取失败';
    }
  } catch (error) {
    status.textContent = `错误: ${error.message}`;
    console.error('提取图片失败:', error);
  } finally {
    extractBtn.disabled = false;
  }
});

// 提取视频
extractVideosBtn.addEventListener('click', async () => {
  try {
    status.textContent = '正在提取视频...';
    extractVideosBtn.disabled = true;

    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 向 content script 发送提取请求
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractVideos'
    });

    if (response.success) {
      extractedVideos = response.videos;
      selectedVideos.clear();
      renderVideos();
      status.textContent = `找到 ${extractedVideos.length} 个视频`;
    } else {
      status.textContent = response.error || '提取失败';
    }
  } catch (error) {
    status.textContent = `错误: ${error.message}`;
    console.error('提取视频失败:', error);
  } finally {
    extractVideosBtn.disabled = false;
  }
});

// 全选
selectAllBtn.addEventListener('click', () => {
  if (currentTab === 'images') {
    extractedImages.forEach(img => selectedImages.add(img.url));
  } else {
    extractedVideos.forEach(video => selectedVideos.add(video.url));
  }
  updateSelection();
});

// 取消全选
deselectAllBtn.addEventListener('click', () => {
  if (currentTab === 'images') {
    selectedImages.clear();
  } else {
    selectedVideos.clear();
  }
  updateSelection();
});

// 下载选中图片/视频
downloadBtn.addEventListener('click', async () => {
  const selectedSet = currentTab === 'images' ? selectedImages : selectedVideos;
  if (selectedSet.size === 0) return;

  try {
    downloadBtn.disabled = true;
    status.textContent = `正在下载 ${selectedSet.size} 个${currentTab === 'images' ? '图片' : '视频'}...`;

    // 获取当前网站域名用于创建文件夹
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 安全处理 tab.url，避免 chrome:// 等特殊页面抛出异常
    let hostname = 'unknown';
    try {
      if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        hostname = new URL(tab.url).hostname;
      }
    } catch (error) {
      console.warn('无法解析 URL:', tab.url);
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const folderName = `${hostname}_${dateStr}`;

    // 发送下载请求到 background
    const response = await chrome.runtime.sendMessage({
      action: currentTab === 'images' ? 'downloadImages' : 'downloadVideos',
      items: Array.from(selectedSet),
      folderName: folderName
    });

    if (response.success) {
      const itemType = currentTab === 'images' ? '图片' : '视频';
      if (response.failed > 0) {
        status.textContent = `下载完成：${response.downloaded} 个${itemType}成功，${response.failed} 个失败`;
      } else {
        status.textContent = `成功下载 ${response.downloaded} 个${itemType}`;
      }
      selectedSet.clear();
      updateSelection();
    } else {
      status.textContent = `下载失败: ${response.error}`;
    }
  } catch (error) {
    status.textContent = `下载错误: ${error.message}`;
    console.error('下载失败:', error);
  } finally {
    downloadBtn.disabled = false;
  }
});

// 获取筛选条件
function getFilters() {
  return {
    minWidth: parseInt(minWidthInput.value) || 0,
    minHeight: parseInt(minHeightInput.value) || 0,
    square: filterSquare.checked,
    landscape: filterLandscape.checked,
    portrait: filterPortrait.checked
  };
}

// 渲染图片网格
function renderImages() {
  imageGrid.innerHTML = '';

  if (extractedImages.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.style.cssText = 'grid-column: 1/-1; text-align: center; color: #6b7280;';
    emptyMsg.textContent = '暂无图片';
    imageGrid.appendChild(emptyMsg);
    return;
  }

  extractedImages.forEach(img => {
    // 验证 URL 协议
    if (!isValidImageUrl(img.url)) {
      console.warn('Invalid image URL:', img.url);
      return;
    }

    const item = document.createElement('div');
    item.className = 'image-item';
    item.dataset.url = img.url; // 存储 URL 用于选择状态同步
    if (selectedImages.has(img.url)) {
      item.classList.add('selected');
    }

    // 使用 DOM API 创建元素，避免 XSS
    const imgEl = document.createElement('img');
    imgEl.src = img.url;
    imgEl.alt = '商品图片';
    imgEl.loading = 'lazy';

    const checkbox = document.createElement('div');
    checkbox.className = 'checkbox';

    const info = document.createElement('div');
    info.className = 'info';
    info.textContent = `${img.width} × ${img.height}`;

    item.appendChild(imgEl);
    item.appendChild(checkbox);
    item.appendChild(info);

    item.addEventListener('click', () => {
      if (selectedImages.has(img.url)) {
        selectedImages.delete(img.url);
      } else {
        selectedImages.add(img.url);
      }
      updateSelection();
    });

    imageGrid.appendChild(item);
  });
}

// 验证图片 URL 是否合法
function isValidImageUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// 渲染视频网格
function renderVideos() {
  videoGrid.innerHTML = '';

  if (extractedVideos.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.style.cssText = 'grid-column: 1/-1; text-align: center; color: #6b7280;';
    emptyMsg.textContent = '暂无视频';
    videoGrid.appendChild(emptyMsg);
    return;
  }

  extractedVideos.forEach(video => {
    // 验证 URL 协议
    if (!isValidImageUrl(video.url)) {
      console.warn('Invalid video URL:', video.url);
      return;
    }

    const item = document.createElement('div');
    item.className = 'video-item';
    item.dataset.url = video.url; // 存储 URL 用于选择状态同步
    if (selectedVideos.has(video.url)) {
      item.classList.add('selected');
    }

    // 使用 DOM API 创建元素
    const videoEl = document.createElement('video');
    videoEl.src = video.url;
    videoEl.muted = true;
    videoEl.preload = 'metadata';
    if (video.poster) {
      videoEl.poster = video.poster;
    }

    const playIcon = document.createElement('div');
    playIcon.className = 'play-icon';

    const checkbox = document.createElement('div');
    checkbox.className = 'checkbox';

    const info = document.createElement('div');
    info.className = 'info';
    info.textContent = video.type || 'video';

    item.appendChild(videoEl);
    item.appendChild(playIcon);
    item.appendChild(checkbox);
    item.appendChild(info);

    item.addEventListener('click', () => {
      if (selectedVideos.has(video.url)) {
        selectedVideos.delete(video.url);
      } else {
        selectedVideos.add(video.url);
      }
      updateSelection();
    });

    videoGrid.appendChild(item);
  });
}

// 更新选中状态
function updateSelection() {
  const selectedSet = currentTab === 'images' ? selectedImages : selectedVideos;
  const gridClass = currentTab === 'images' ? '.image-item' : '.video-item';

  // 更新视觉状态 - 使用 data-url 而非索引
  document.querySelectorAll(gridClass).forEach((item) => {
    const url = item.dataset.url;
    if (selectedSet.has(url)) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });

  // 更新计数和按钮状态
  selectedCount.textContent = selectedSet.size;
  downloadBtn.disabled = selectedSet.size === 0;
}
