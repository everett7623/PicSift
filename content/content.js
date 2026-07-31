// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractImages') {
    extractImages(request.filters)
      .then(images => sendResponse({ success: true, images }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开启
  }

  if (request.action === 'extractVideos') {
    extractVideos()
      .then(videos => sendResponse({ success: true, videos }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * 提取页面中的商品图片
 * @param {Object} filters - 筛选条件
 * @returns {Promise<Array>} 图片列表
 */
async function extractImages(filters) {
  const images = [];
  const seenUrls = new Set();

  // 1. 提取 <img> 标签图片
  const imgElements = document.querySelectorAll('img');
  for (const img of imgElements) {
    const url = getHighResUrl(img.src || img.dataset.src);
    if (url && !seenUrls.has(url)) {
      const dimensions = await getImageDimensions(url);
      if (dimensions && passFilters(dimensions, filters)) {
        images.push({
          url,
          width: dimensions.width,
          height: dimensions.height,
          type: 'img'
        });
        seenUrls.add(url);
      }
    }
  }

  // 2. 提取背景图片
  const elementsWithBg = document.querySelectorAll('[style*="background"]');
  for (const el of elementsWithBg) {
    const bgStyle = window.getComputedStyle(el).backgroundImage;
    const urlMatch = bgStyle.match(/url\(['"]?(.*?)['"]?\)/);
    if (urlMatch && urlMatch[1]) {
      const url = getHighResUrl(urlMatch[1]);
      if (url && !seenUrls.has(url)) {
        const dimensions = await getImageDimensions(url);
        if (dimensions && passFilters(dimensions, filters)) {
          images.push({
            url,
            width: dimensions.width,
            height: dimensions.height,
            type: 'background'
          });
          seenUrls.add(url);
        }
      }
    }
  }

  // 3. 阿里巴巴特定提取逻辑
  if (isAlibabaSite()) {
    const aliImages = extractAlibabaImages();
    for (const url of aliImages) {
      const highResUrl = getHighResUrl(url);
      if (highResUrl && !seenUrls.has(highResUrl)) {
        const dimensions = await getImageDimensions(highResUrl);
        if (dimensions && passFilters(dimensions, filters)) {
          images.push({
            url: highResUrl,
            width: dimensions.width,
            height: dimensions.height,
            type: 'alibaba'
          });
          seenUrls.add(highResUrl);
        }
      }
    }
  }

  // 4. 淘宝/天猫特定提取
  if (isTaobaoSite()) {
    const taobaoImages = extractTaobaoImages();
    for (const url of taobaoImages) {
      const highResUrl = getHighResUrl(url);
      if (highResUrl && !seenUrls.has(highResUrl)) {
        const dimensions = await getImageDimensions(highResUrl);
        if (dimensions && passFilters(dimensions, filters)) {
          images.push({
            url: highResUrl,
            width: dimensions.width,
            height: dimensions.height,
            type: 'taobao'
          });
          seenUrls.add(highResUrl);
        }
      }
    }
  }

  // 5. 京东特定提取
  if (isJDSite()) {
    const jdImages = extractJDImages();
    for (const url of jdImages) {
      const highResUrl = getHighResUrl(url);
      if (highResUrl && !seenUrls.has(highResUrl)) {
        const dimensions = await getImageDimensions(highResUrl);
        if (dimensions && passFilters(dimensions, filters)) {
          images.push({
            url: highResUrl,
            width: dimensions.width,
            height: dimensions.height,
            type: 'jd'
          });
          seenUrls.add(highResUrl);
        }
      }
    }
  }

  // 6. 中国制造网特定提取
  if (isMadeInChinaSite()) {
    const micImages = extractMadeInChinaImages();
    for (const url of micImages) {
      const highResUrl = getHighResUrl(url);
      if (highResUrl && !seenUrls.has(highResUrl)) {
        const dimensions = await getImageDimensions(highResUrl);
        if (dimensions && passFilters(dimensions, filters)) {
          images.push({
            url: highResUrl,
            width: dimensions.width,
            height: dimensions.height,
            type: 'made-in-china'
          });
          seenUrls.add(highResUrl);
        }
      }
    }
  }

  return images;
}

/**
 * 判断是否为阿里系网站
 */
function isAlibabaSite() {
  const hostname = window.location.hostname;
  return hostname.includes('alibaba.com') ||
         hostname.includes('1688.com') ||
         hostname.includes('aliexpress.com');
}

/**
 * 判断是否为淘宝/天猫
 */
function isTaobaoSite() {
  const hostname = window.location.hostname;
  return hostname.includes('taobao.com') || hostname.includes('tmall.com');
}

/**
 * 判断是否为京东
 */
function isJDSite() {
  const hostname = window.location.hostname;
  return hostname.includes('jd.com');
}

/**
 * 判断是否为中国制造网
 */
function isMadeInChinaSite() {
  const hostname = window.location.hostname;
  return hostname.includes('made-in-china.com');
}

/**
 * 提取阿里巴巴特定图片
 */
function extractAlibabaImages() {
  const images = [];

  // 主图轮播
  const mainImages = document.querySelectorAll('.images-view-item img, .img-thumb img');
  mainImages.forEach(img => {
    if (img.src) images.push(img.src);
    if (img.dataset.src) images.push(img.dataset.src);
  });

  // 详情图
  const detailImages = document.querySelectorAll('.detail-gallery img, .description img');
  detailImages.forEach(img => {
    if (img.src) images.push(img.src);
    if (img.dataset.src) images.push(img.dataset.src);
  });

  return images;
}

/**
 * 提取淘宝/天猫特定图片
 */
function extractTaobaoImages() {
  const images = [];

  // 主图轮播
  const mainImages = document.querySelectorAll('.tb-booth img, .tb-thumb img, #J_ImgBooth img');
  mainImages.forEach(img => {
    if (img.src) images.push(img.src);
    if (img.dataset.src) images.push(img.dataset.src);
  });

  // 详情图
  const detailImages = document.querySelectorAll('#description img, .detail-content img');
  detailImages.forEach(img => {
    if (img.src) images.push(img.src);
    if (img.dataset.src) images.push(img.dataset.src);
  });

  return images;
}

/**
 * 提取京东特定图片
 */
function extractJDImages() {
  const images = [];

  // 主图轮播
  const mainImages = document.querySelectorAll('#spec-list img, .spec-items img, #preview img');
  mainImages.forEach(img => {
    if (img.src) images.push(img.src);
    if (img.dataset.src) images.push(img.dataset.src);
  });

  // 详情图
  const detailImages = document.querySelectorAll('.detail-content img, #detail img');
  detailImages.forEach(img => {
    if (img.src) images.push(img.src);
    if (img.dataset.src) images.push(img.dataset.src);
  });

  return images;
}

/**
 * 提取中国制造网特定图片
 */
function extractMadeInChinaImages() {
  const images = [];

  // 主图轮播
  const mainImages = document.querySelectorAll('.pic-scroll img, .product-img img, .img-main img');
  mainImages.forEach(img => {
    if (img.src) images.push(img.src);
    if (img.dataset.src) images.push(img.dataset.src);
    if (img.dataset.original) images.push(img.dataset.original);
  });

  // 详情图
  const detailImages = document.querySelectorAll('.detail-desc img, .product-detail img');
  detailImages.forEach(img => {
    if (img.src) images.push(img.src);
    if (img.dataset.src) images.push(img.dataset.src);
    if (img.dataset.original) images.push(img.dataset.original);
  });

  return images;
}

/**
 * 提取页面中的视频
 * @returns {Promise<Array>} 视频列表
 */
async function extractVideos() {
  const videos = [];
  const seenUrls = new Set();

  // 1. 提取 <video> 标签
  const videoElements = document.querySelectorAll('video');
  videoElements.forEach(video => {
    const url = video.src || video.currentSrc;
    if (url && !seenUrls.has(url)) {
      videos.push({
        url,
        type: 'video',
        poster: video.poster || '',
        width: video.videoWidth || 0,
        height: video.videoHeight || 0
      });
      seenUrls.add(url);
    }

    // 提取 <source> 标签
    const sources = video.querySelectorAll('source');
    sources.forEach(source => {
      const url = source.src;
      if (url && !seenUrls.has(url)) {
        videos.push({
          url,
          type: 'video',
          poster: video.poster || '',
          width: video.videoWidth || 0,
          height: video.videoHeight || 0
        });
        seenUrls.add(url);
      }
    });
  });

  // 2. 提取阿里系视频
  if (isAlibabaSite()) {
    const aliVideos = extractAlibabaVideos();
    aliVideos.forEach(url => {
      if (!seenUrls.has(url)) {
        videos.push({ url, type: 'alibaba-video' });
        seenUrls.add(url);
      }
    });
  }

  // 3. 提取淘宝视频
  if (isTaobaoSite()) {
    const taobaoVideos = extractTaobaoVideos();
    taobaoVideos.forEach(url => {
      if (!seenUrls.has(url)) {
        videos.push({ url, type: 'taobao-video' });
        seenUrls.add(url);
      }
    });
  }

  // 4. 提取中国制造网视频
  if (isMadeInChinaSite()) {
    const micVideos = extractMadeInChinaVideos();
    micVideos.forEach(url => {
      if (!seenUrls.has(url)) {
        videos.push({ url, type: 'made-in-china-video' });
        seenUrls.add(url);
      }
    });
  }

  return videos;
}

/**
 * 提取阿里巴巴视频
 */
function extractAlibabaVideos() {
  const videos = [];

  // 阿里巴巴国际站视频
  const videoContainers = document.querySelectorAll('[data-video-url], [data-video-src]');
  videoContainers.forEach(el => {
    const url = el.dataset.videoUrl || el.dataset.videoSrc;
    if (url) videos.push(url);
  });

  return videos;
}

/**
 * 提取淘宝视频
 */
function extractTaobaoVideos() {
  const videos = [];

  // 淘宝商品视频
  const videoElements = document.querySelectorAll('[data-video], [data-video-url]');
  videoElements.forEach(el => {
    const url = el.dataset.video || el.dataset.videoUrl;
    if (url) videos.push(url);
  });

  return videos;
}

/**
 * 提取中国制造网视频
 */
function extractMadeInChinaVideos() {
  const videos = [];

  // 视频标签
  const videoElements = document.querySelectorAll('video');
  videoElements.forEach(video => {
    if (video.src) videos.push(video.src);
    const sources = video.querySelectorAll('source');
    sources.forEach(source => {
      if (source.src) videos.push(source.src);
    });
  });

  // data 属性视频
  const dataVideoElements = document.querySelectorAll('[data-video-url], [data-video-src]');
  dataVideoElements.forEach(el => {
    const url = el.dataset.videoUrl || el.dataset.videoSrc;
    if (url) videos.push(url);
  });

  return videos;
}

/**
 * 将图片 URL 转换为高清版本
 * @param {string} url - 原始 URL
 * @returns {string} 高清 URL
 */
function getHighResUrl(url) {
  if (!url || url.startsWith('data:')) return null;

  let cleanUrl = url;

  // 阿里系图片处理
  if (url.includes('alicdn.com')) {
    // 移除尺寸后缀，如 _300x300.jpg
    cleanUrl = url.replace(/_\d+x\d+\./, '.');
    // 移除缩略图参数
    cleanUrl = cleanUrl.split('?')[0];
  }

  // 亚马逊图片处理
  if (url.includes('amazon.com') || url.includes('ssl-images-amazon')) {
    cleanUrl = url.replace(/\._.*?_\./, '.');
  }

  // 淘宝/天猫图片处理
  if (url.includes('taobaocdn.com') || url.includes('alicdn.com')) {
    // 移除尺寸参数
    cleanUrl = url.split('_')[0] + url.substring(url.lastIndexOf('.'));
  }

  // 京东图片处理
  if (url.includes('jd.com') || url.includes('360buyimg.com')) {
    // 移除尺寸后缀，获取原图
    cleanUrl = url.replace(/!.*$/, '');
  }

  // 中国制造网图片处理
  if (url.includes('made-in-china.com')) {
    // 过滤模板图片
    if (isTemplateImage(url)) {
      return null;
    }
    // 移除尺寸参数，如 _300x300.jpg
    cleanUrl = url.replace(/_\d+x\d+\./, '.');
    // 移除缩略图标记
    cleanUrl = cleanUrl.replace(/\/s_/, '/');
  }

  return cleanUrl;
}

/**
 * 判断是否为模板图片（非产品图）
 * @param {string} url - 图片 URL
 * @returns {boolean}
 */
function isTemplateImage(url) {
  // Made-in-China 模板图特征
  const templatePatterns = [
    '/template/',
    '/common/',
    '/static/',
    '/icon/',
    '/logo/',
    '/banner/',
    '/bg_',
    '/background',
    'placeholder',
    'default-image',
    'no-image'
  ];

  return templatePatterns.some(pattern => url.toLowerCase().includes(pattern));
}

/**
 * 获取图片真实尺寸
 * @param {string} url - 图片 URL
 * @returns {Promise<Object>} {width, height}
 */
function getImageDimensions(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * 检查图片是否通过筛选条件
 */
function passFilters(dimensions, filters) {
  const { width, height } = dimensions;
  const { minWidth, minHeight, square, landscape, portrait } = filters;

  // 尺寸过滤
  if (width < minWidth || height < minHeight) return false;

  // 过滤过小图片（可能是图标、logo）
  if (width < 200 || height < 200) return false;

  // 比例过滤
  if (square || landscape || portrait) {
    const ratio = width / height;
    const isSquare = ratio >= 0.9 && ratio <= 1.1;
    const isLandscape = ratio > 1.1;
    const isPortrait = ratio < 0.9;

    if (square && !isSquare) return false;
    if (landscape && !isLandscape) return false;
    if (portrait && !isPortrait) return false;
  }

  return true;
}
