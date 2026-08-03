// 使用 var 允许脚本在同一隔离世界被安全地重复注入。
var IMAGE_LOAD_CONCURRENCY = 16;
var IMAGE_LOAD_TIMEOUT_MS = 4000;
var IMAGE_EXTRACTION_TIMEOUT_MS = 18000;
var MAX_IMAGE_CANDIDATES = 350;
var MAX_EMBEDDED_SCRIPT_CHARS = 1500000;

// 动态补注入时保持监听器幂等，避免一次请求收到多个响应。
if (!globalThis.__picSiftMessageListenerInstalled) {
  globalThis.__picSiftMessageListenerInstalled = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request?.action === 'ping') {
      sendResponse({ success: true, ready: true });
      return false;
    }

    if (request?.action === 'extractImages') {
      extractImages(request.filters)
        .then(images => sendResponse({ success: true, images }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }

    if (request?.action === 'extractVideos') {
      extractVideos()
        .then(videos => sendResponse({ success: true, videos }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }

    return false;
  });
}

/**
 * 提取页面中的商品图片。
 */
async function extractImages(filters = {}) {
  if (isAlibabaAccessBlocked()) {
    throw new Error('Alibaba 要求登录或安全验证，请完成验证并返回商品页后重试');
  }

  const candidates = new Map();
  const normalizedFilters = normalizeFilters(filters);
  const extractionDeadline = Date.now() + IMAGE_EXTRACTION_TIMEOUT_MS;

  const addCandidate = (rawUrl, type) => {
    if (candidates.size >= MAX_IMAGE_CANDIDATES) return;
    const url = getHighResUrl(rawUrl);
    if (url && !candidates.has(url)) candidates.set(url, type);
  };

  // 先加入站点专用商品图，避免大型页面的通用素材占满候选上限。
  if (isAlibabaSite()) {
    extractAlibabaImages().forEach(url => addCandidate(url, 'alibaba'));
    extractDocumentMetadataImages().forEach(url => addCandidate(url, 'alibaba-meta'));
    extractAlibabaEmbeddedImages().forEach(url => addCandidate(url, 'alibaba-data'));
    extractLoadedResourceImages().forEach(url => addCandidate(url, 'alibaba-resource'));
  }
  if (isTaobaoSite()) {
    extractTaobaoImages().forEach(url => addCandidate(url, 'taobao'));
  }
  if (isJDSite()) {
    extractJDImages().forEach(url => addCandidate(url, 'jd'));
  }
  if (isMadeInChinaSite()) {
    extractMadeInChinaImages().forEach(url => addCandidate(url, 'made-in-china'));
  }

  document.querySelectorAll('img').forEach(img => {
    getImageSourceCandidates(img).forEach(url => addCandidate(url, 'img'));
  });

  // 提取内联背景图，避免遍历整页计算样式造成明显卡顿。
  document.querySelectorAll('[style*="background"]').forEach(element => {
    extractCssUrls(window.getComputedStyle(element).backgroundImage)
      .forEach(url => addCandidate(url, 'background'));
  });

  document.querySelectorAll('[data-background-image], [data-bg], [data-lazy-background]')
    .forEach(element => {
      const value = element.dataset.backgroundImage || element.dataset.bg || element.dataset.lazyBackground;
      const urls = extractCssUrls(value);
      (urls.length > 0 ? urls : [value]).forEach(url => addCandidate(url, 'background'));
    });

  const entries = Array.from(candidates, ([url, type]) => ({ url, type }));
  const results = await mapWithConcurrency(entries, IMAGE_LOAD_CONCURRENCY, async candidate => {
    const remainingTime = extractionDeadline - Date.now();
    if (remainingTime <= 0) return null;

    const dimensions = await getImageDimensions(
      candidate.url,
      Math.min(IMAGE_LOAD_TIMEOUT_MS, remainingTime)
    );
    if (!dimensions || !passFilters(dimensions, normalizedFilters)) return null;
    return { ...candidate, ...dimensions };
  });

  return results.filter(Boolean);
}

function getImageSourceCandidates(img) {
  const candidates = [
    img.getAttribute('data-zoom-image'),
    img.getAttribute('data-original'),
    img.getAttribute('data-large'),
    getLargestSrcsetCandidate(img.getAttribute('data-srcset')),
    getLargestSrcsetCandidate(img.getAttribute('srcset')),
    img.getAttribute('data-lazy-src'),
    img.getAttribute('data-ks-lazyload'),
    img.getAttribute('data-src'),
    img.currentSrc,
    img.getAttribute('src')
  ];

  return Array.from(new Set(candidates.filter(candidate => normalizeMediaUrl(candidate))));
}

function getLargestSrcsetCandidate(srcset) {
  if (!srcset || typeof srcset !== 'string') return null;

  const candidates = srcset.split(',')
    .map(item => {
      const [url, descriptor = '1x'] = item.trim().split(/\s+/);
      const score = Number.parseFloat(descriptor) || 1;
      return { url, score };
    })
    .filter(candidate => candidate.url);

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.url || null;
}

function extractCssUrls(value) {
  if (!value || typeof value !== 'string') return [];
  return Array.from(value.matchAll(/url\(['"]?(.*?)['"]?\)/g), match => match[1]).filter(Boolean);
}

function extractImagesFromSelectors(selectors) {
  return Array.from(document.querySelectorAll(selectors))
    .flatMap(getImageSourceCandidates);
}

function extractAlibabaImages() {
  return extractImagesFromSelectors(
    '.images-view-item img, .img-thumb img, .detail-gallery img, .description img, ' +
    '[class*="product-image"] img, [class*="image-gallery"] img, [class*="detail-content"] img'
  );
}

function extractDocumentMetadataImages() {
  const urls = [];
  const selectors = [
    'meta[property="og:image"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="twitter:image"]',
    'link[rel="image_src"]',
    'link[rel="preload"][as="image"]'
  ].join(', ');

  document.querySelectorAll(selectors).forEach(element => {
    const value = element.getAttribute('content') || element.getAttribute('href');
    if (value) urls.push(value);
  });
  return urls;
}

function extractLoadedResourceImages() {
  if (typeof globalThis.performance?.getEntriesByType !== 'function') return [];

  return globalThis.performance.getEntriesByType('resource')
    .filter(entry => entry?.initiatorType === 'img' || isLikelyImageUrl(entry?.name))
    .map(entry => entry.name)
    .filter(Boolean);
}

function extractAlibabaEmbeddedImages() {
  const urls = [];
  let scannedChars = 0;

  document.querySelectorAll('script:not([src])').forEach(script => {
    if (scannedChars >= MAX_EMBEDDED_SCRIPT_CHARS) return;

    const rawText = String(script.textContent || '');
    if (!/(?:alicdn|alibabausercontent)/i.test(rawText)) return;

    const remainingChars = MAX_EMBEDDED_SCRIPT_CHARS - scannedChars;
    const text = rawText.slice(0, remainingChars);
    scannedChars += text.length;
    extractImageUrlsFromText(text).forEach(url => urls.push(url));
  });

  return urls;
}

function extractImageUrlsFromText(value) {
  if (!value || typeof value !== 'string') return [];

  const normalizedText = value
    .replace(/\\u003a/gi, ':')
    .replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&');
  const matches = normalizedText.match(/(?:https?:)?\/\/[^"'<>\\\s]+/g) || [];

  return Array.from(new Set(matches.filter(isLikelyImageUrl)));
}

function isLikelyImageUrl(value) {
  const normalizedUrl = normalizeMediaUrl(value);
  if (!normalizedUrl) return false;

  try {
    const url = new URL(normalizedUrl);
    const isImagePath = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)(?:_|$)/i.test(url.pathname);
    const isAlibabaCdn = isHost(url.hostname, 'alicdn.com') ||
      isHost(url.hostname, 'alibabausercontent.com');
    return isImagePath && isAlibabaCdn;
  } catch {
    return false;
  }
}

function extractTaobaoImages() {
  return extractImagesFromSelectors(
    '.tb-booth img, .tb-thumb img, #J_ImgBooth img, #description img, .detail-content img'
  );
}

function extractJDImages() {
  return extractImagesFromSelectors(
    '#spec-list img, .spec-items img, #preview img, .detail-content img, #detail img'
  );
}

function extractMadeInChinaImages() {
  return extractImagesFromSelectors(
    '.pic-scroll img, .product-img img, .img-main img, .detail-desc img, .product-detail img'
  );
}

/**
 * 提取页面中的直链视频。
 */
async function extractVideos() {
  const videos = [];
  const seenUrls = new Set();

  const addVideo = (rawUrl, type = 'video', poster = '', width = 0, height = 0) => {
    const url = normalizeMediaUrl(rawUrl);
    if (!url || seenUrls.has(url)) return;

    videos.push({
      url,
      type,
      poster: normalizeMediaUrl(poster) || '',
      width: Number(width) || 0,
      height: Number(height) || 0
    });
    seenUrls.add(url);
  };

  document.querySelectorAll('video').forEach(video => {
    addVideo(
      video.currentSrc || video.getAttribute('src'),
      'video',
      video.getAttribute('poster'),
      video.videoWidth,
      video.videoHeight
    );

    video.querySelectorAll('source').forEach(source => {
      addVideo(
        source.getAttribute('src'),
        source.getAttribute('type') || 'video',
        video.getAttribute('poster'),
        video.videoWidth,
        video.videoHeight
      );
    });
  });

  if (isAlibabaSite()) {
    extractAlibabaVideos().forEach(url => addVideo(url, 'alibaba-video'));
  }
  if (isTaobaoSite()) {
    extractTaobaoVideos().forEach(url => addVideo(url, 'taobao-video'));
  }
  if (isMadeInChinaSite()) {
    extractMadeInChinaVideos().forEach(url => addVideo(url, 'made-in-china-video'));
  }

  return videos;
}

function extractAlibabaVideos() {
  return extractDataVideoUrls('[data-video-url], [data-video-src]', ['videoUrl', 'videoSrc']);
}

function extractTaobaoVideos() {
  return extractDataVideoUrls('[data-video], [data-video-url]', ['video', 'videoUrl']);
}

function extractMadeInChinaVideos() {
  return extractDataVideoUrls('[data-video-url], [data-video-src]', ['videoUrl', 'videoSrc']);
}

function extractDataVideoUrls(selector, keys) {
  const urls = [];
  document.querySelectorAll(selector).forEach(element => {
    const value = keys.map(key => element.dataset[key]).find(Boolean);
    if (value) urls.push(value);
  });
  return urls;
}

/**
 * 将相对地址归一化，并移除常见平台的缩略图后缀。
 */
function getHighResUrl(rawUrl) {
  const normalizedUrl = normalizeMediaUrl(rawUrl);
  if (!normalizedUrl) return null;

  const url = new URL(normalizedUrl);
  const hostname = url.hostname.toLowerCase();

  if (isHost(hostname, 'made-in-china.com') && isTemplateImage(url.href)) {
    return null;
  }

  if (isHost(hostname, 'alicdn.com') || isHost(hostname, 'taobaocdn.com')) {
    url.pathname = url.pathname
      .replace(
        /(\.(?:avif|gif|jpe?g|png|webp))_\d+x\d+[^./]*\.(?:avif|gif|jpe?g|png|webp)(?:_\.webp)?$/i,
        '$1'
      )
      .replace(/_\d+x\d+(?=\.[^./]+$)/i, '');
    url.searchParams.delete('x-oss-process');
  }

  if (isHost(hostname, 'amazon.com') ||
      isHost(hostname, 'media-amazon.com') ||
      isHost(hostname, 'ssl-images-amazon.com')) {
    url.pathname = url.pathname.replace(/\._[^/]+_\.(?=[^./]+$)/, '.');
  }

  if (isHost(hostname, 'jd.com') || isHost(hostname, '360buyimg.com')) {
    url.pathname = url.pathname.replace(/!.*$/, '');
  }

  if (isHost(hostname, 'made-in-china.com')) {
    url.pathname = url.pathname
      .replace(/_\d+x\d+(?=\.[^./]+$)/i, '')
      .replace(/\/s_/, '/');
  }

  return url.href;
}

function normalizeMediaUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue.startsWith('data:')) return null;

  try {
    const url = new URL(trimmedValue, document.baseURI);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

function isTemplateImage(url) {
  const templatePatterns = [
    '/template/', '/common/', '/static/', '/icon/', '/logo/', '/banner/',
    '/bg_', '/background', 'placeholder', 'default-image', 'no-image'
  ];
  const normalizedUrl = url.toLowerCase();
  return templatePatterns.some(pattern => normalizedUrl.includes(pattern));
}

function getImageDimensions(url, timeoutMs = IMAGE_LOAD_TIMEOUT_MS) {
  return new Promise(resolve => {
    const image = new Image();
    let settled = false;

    const finish = dimensions => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      image.onload = null;
      image.onerror = null;
      resolve(dimensions);
    };

    const timeoutId = setTimeout(() => finish(null), Math.max(1, timeoutMs));
    image.decoding = 'async';
    image.onload = () => finish({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => finish(null);
    image.src = url;
  });
}

function normalizeFilters(filters = {}) {
  const normalizeDimension = value => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(10000, Math.max(0, Math.round(number))) : 0;
  };

  return {
    minWidth: normalizeDimension(filters.minWidth),
    minHeight: normalizeDimension(filters.minHeight),
    square: filters.square === true,
    landscape: filters.landscape === true,
    portrait: filters.portrait === true
  };
}

function passFilters(dimensions, filters = {}) {
  const { width, height } = dimensions;
  const normalizedFilters = normalizeFilters(filters);

  if (width < normalizedFilters.minWidth || height < normalizedFilters.minHeight) return false;
  if (width < 200 || height < 200) return false;

  const hasRatioFilter = normalizedFilters.square || normalizedFilters.landscape || normalizedFilters.portrait;
  if (!hasRatioFilter) return true;

  const ratio = width / height;
  const matchesSquare = normalizedFilters.square && ratio >= 0.9 && ratio <= 1.1;
  const matchesLandscape = normalizedFilters.landscape && ratio > 1.1;
  const matchesPortrait = normalizedFilters.portrait && ratio < 0.9;

  return matchesSquare || matchesLandscape || matchesPortrait;
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function isAlibabaSite() {
  const hostname = window.location.hostname;
  return isHost(hostname, 'alibaba.com') ||
    isHost(hostname, '1688.com') ||
    isHost(hostname, 'aliexpress.com');
}

function isAlibabaAccessBlocked() {
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname || '';
  if (/^(login|passport|accounts)\./.test(hostname) && isHost(hostname, 'alibaba.com')) {
    return true;
  }
  if (pathname.includes('/_____tmd_____/')) return true;

  const loginJumpLink = typeof document.getElementById === 'function'
    ? document.getElementById('a-link')
    : null;
  return Boolean(loginJumpLink?.href?.includes('login.alibaba.com'));
}

function isTaobaoSite() {
  const hostname = window.location.hostname;
  return isHost(hostname, 'taobao.com') || isHost(hostname, 'tmall.com');
}

function isJDSite() {
  return isHost(window.location.hostname, 'jd.com');
}

function isMadeInChinaSite() {
  return isHost(window.location.hostname, 'made-in-china.com');
}

function isHost(hostname, domain) {
  const normalizedHostname = hostname.toLowerCase();
  return normalizedHostname === domain || normalizedHostname.endsWith(`.${domain}`);
}
