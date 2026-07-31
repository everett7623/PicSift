// 监听来自 popup 的下载请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadImages') {
    downloadImages(request.items, request.folderName)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开启
  }

  if (request.action === 'downloadVideos') {
    downloadVideos(request.items, request.folderName)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * 批量下载图片
 * @param {Array<string>} imageUrls - 图片 URL 列表
 * @param {string} folderName - 文件夹名称
 */
async function downloadImages(imageUrls, folderName) {
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    const filename = generateFilename(url, i, folderName, 'images');

    try {
      await chrome.downloads.download({
        url: url,
        filename: filename,
        conflictAction: 'uniquify', // 文件名冲突时自动重命名
        saveAs: false // 不显示保存对话框
      });
    } catch (error) {
      console.error(`下载失败: ${url}`, error);
      // 继续下载下一张
    }

    // 避免下载过快导致浏览器卡顿
    if (i < imageUrls.length - 1) {
      await sleep(100);
    }
  }
}

/**
 * 批量下载视频
 * @param {Array<string>} videoUrls - 视频 URL 列表
 * @param {string} folderName - 文件夹名称
 */
async function downloadVideos(videoUrls, folderName) {
  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];
    const filename = generateFilename(url, i, folderName, 'videos');

    try {
      await chrome.downloads.download({
        url: url,
        filename: filename,
        conflictAction: 'uniquify',
        saveAs: false
      });
    } catch (error) {
      console.error(`下载视频失败: ${url}`, error);
    }

    // 视频文件较大，延迟更长
    if (i < videoUrls.length - 1) {
      await sleep(200);
    }
  }
}

/**
 * 生成文件名
 * @param {string} url - 文件 URL
 * @param {number} index - 索引
 * @param {string} folderName - 文件夹名称
 * @param {string} type - 文件类型 ('images' or 'videos')
 * @returns {string} 完整文件路径
 */
function generateFilename(url, index, folderName, type = 'images') {
  // 提取文件扩展名
  let ext = type === 'images' ? 'jpg' : 'mp4';
  const urlPath = url.split('?')[0]; // 去除查询参数

  if (type === 'images') {
    const match = urlPath.match(/\.(jpg|jpeg|png|webp|gif)$/i);
    if (match) {
      ext = match[1].toLowerCase();
    }
  } else {
    const match = urlPath.match(/\.(mp4|webm|mov|avi|flv)$/i);
    if (match) {
      ext = match[1].toLowerCase();
    }
  }

  // 生成文件名: 序号_时间戳.扩展名
  const timestamp = Date.now();
  const filename = `${String(index + 1).padStart(3, '0')}_${timestamp}.${ext}`;

  // 返回完整路径: PicSift/文件夹名/类型/文件名
  return `PicSift/${folderName}/${type}/${filename}`;
}

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 插件安装/更新时的处理
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('PicSift 安装成功');
  } else if (details.reason === 'update') {
    console.log('PicSift 更新成功');
  }
});
