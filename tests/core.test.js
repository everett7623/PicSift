const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repositoryRoot = path.resolve(__dirname, '..');

function loadScript(relativePath, extraContext = {}) {
  const source = fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
  const context = vm.createContext({
    URL,
    console,
    clearTimeout,
    setTimeout,
    ...extraContext
  });
  vm.runInContext(source, context, { filename: relativePath });
  return context;
}

function loadContentScript() {
  const listenerRegistrations = [];
  return loadScript('content/content.js', {
    listenerRegistrations,
    chrome: {
      runtime: {
        onMessage: {
          addListener(listener) {
            listenerRegistrations.push(listener);
          }
        }
      }
    },
    document: {
      baseURI: 'https://detail.1688.com/offer/123.html'
    },
    window: {
      location: { hostname: 'detail.1688.com', pathname: '/offer/123.html' }
    }
  });
}

function createFakeElement() {
  return {
    addEventListener() {},
    append() {},
    appendChild() {},
    checked: false,
    classList: {
      add() {},
      toggle() {}
    },
    close() {},
    dataset: {},
    disabled: false,
    hidden: false,
    load() {},
    open: false,
    pause() {},
    querySelectorAll() {
      return [];
    },
    removeAttribute() {},
    replaceChildren() {},
    setAttribute() {},
    showModal() {},
    textContent: '',
    value: '800'
  };
}

function loadPopupScript(options = {}) {
  const elements = new Map();
  const historyCalls = [];
  const document = {
    createElement() {
      return createFakeElement();
    },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createFakeElement());
      return elements.get(id);
    }
  };
  const defaultTabs = {
    get: async () => ({ id: 42, url: 'https://www.alibaba.com/product-detail/test.html' }),
    query: async () => [{ id: 42, url: 'https://www.alibaba.com/product-detail/test.html' }],
    sendMessage: async () => ({ success: true }),
    update: async () => {}
  };
  const search = options.search || '';

  return loadScript('popup/popup.js', {
    Blob,
    DataView,
    TextEncoder,
    Uint8Array,
    URLSearchParams,
    chrome: {
      downloads: { download: async () => 1 },
      runtime: {
        getManifest: () => ({ version: '0.0.0' }),
        sendMessage: async () => ({ success: true, downloaded: 1, failed: 0 })
      },
      scripting: { executeScript: async () => {} },
      storage: {
        local: {
          get: async () => ({}),
          set: async () => {}
        }
      },
      tabs: { ...defaultTabs, ...options.tabs },
      windows: { update: async () => {} }
    },
    document,
    history: {
      replaceState(state, title, url) {
        historyCalls.push({ state, title, url });
      }
    },
    historyCalls,
    window: {
      location: {
        href: `chrome-extension://test/popup/popup.html${search}`,
        search
      }
    }
  });
}

function loadBackgroundScript() {
  const dashboardCalls = [];
  return loadScript('background/background.js', {
    dashboardCalls,
    chrome: {
      action: { onClicked: { addListener() {} } },
      downloads: { download: async () => 1 },
      runtime: {
        getURL: value => `chrome-extension://test/${value}`,
        onInstalled: { addListener() {} },
        onMessage: { addListener() {} }
      },
      storage: {
        session: {
          async get(key) {
            dashboardCalls.push({ action: 'get-storage', key });
            return {};
          },
          async remove(key) {
            dashboardCalls.push({ action: 'remove-storage', key });
          },
          async set(value) {
            dashboardCalls.push({ action: 'set-storage', value });
          }
        }
      },
      tabs: {
        async create(options) {
          dashboardCalls.push({ action: 'create-tab', options });
          return { id: 99 };
        },
        async get(tabId) {
          dashboardCalls.push({ action: 'get-tab', tabId });
          throw new Error('Tab not found');
        },
        async update(tabId, options) {
          dashboardCalls.push({ action: 'update-tab', tabId, options });
        }
      },
      windows: {
        async update(windowId, options) {
          dashboardCalls.push({ action: 'update-window', windowId, options });
        }
      }
    }
  });
}

test('ratio filters match any selected orientation', () => {
  const context = loadContentScript();
  const filters = { square: true, landscape: true, portrait: false };

  assert.equal(context.passFilters({ width: 1000, height: 1000 }, filters), true);
  assert.equal(context.passFilters({ width: 1400, height: 800 }, filters), true);
  assert.equal(context.passFilters({ width: 800, height: 1400 }, filters), false);
});

test('content script can be reinjected without duplicate listeners', () => {
  const context = loadContentScript();
  const source = fs.readFileSync(path.join(repositoryRoot, 'content/content.js'), 'utf8');

  vm.runInContext(source, context, { filename: 'content/content.js' });
  assert.equal(context.listenerRegistrations.length, 1);
});

test('media URLs resolve relative forms and reject unsafe protocols', () => {
  const context = loadContentScript();

  assert.equal(
    context.normalizeMediaUrl('../images/item.jpg#preview'),
    'https://detail.1688.com/images/item.jpg'
  );
  assert.equal(context.normalizeMediaUrl('javascript:alert(1)'), null);
  assert.equal(context.normalizeMediaUrl('data:image/png;base64,AAAA'), null);
});

test('high-resolution URL conversion removes known thumbnail suffixes', () => {
  const context = loadContentScript();

  assert.equal(
    context.getHighResUrl('//cbu01.alicdn.com/img/ibank/item_300x300.jpg'),
    'https://cbu01.alicdn.com/img/ibank/item.jpg'
  );
  assert.equal(
    context.getHighResUrl('https://m.media-amazon.com/images/I/item._AC_SX300_.jpg'),
    'https://m.media-amazon.com/images/I/item.jpg'
  );
  assert.equal(
    context.getHighResUrl('https://s.alicdn.com/@sc04/kf/item.png_960x960q80.jpg'),
    'https://s.alicdn.com/@sc04/kf/item.png'
  );
  assert.equal(
    context.getHighResUrl(
      'https://s.alicdn.com/@sc04/kf/item.jpg?x-oss-process=image%2Fresize%2Cw_720'
    ),
    'https://s.alicdn.com/@sc04/kf/item.jpg'
  );
});

test('Alibaba embedded image URLs and access blocks are recognized', () => {
  const context = loadContentScript();
  const urls = context.extractImageUrlsFromText(
    '{"image":"https\\u003a\\u002f\\u002fs.alicdn.com\\/@sc04\\/kf\\/item.png_960x960q80.jpg"}'
  );

  assert.deepEqual(Array.from(urls), [
    'https://s.alicdn.com/@sc04/kf/item.png_960x960q80.jpg'
  ]);
  assert.equal(context.isAlibabaAccessBlocked(), false);

  context.window.location.hostname = 'login.alibaba.com';
  assert.equal(context.isAlibabaAccessBlocked(), true);
});

test('ZIP builder writes valid store records and CRC32 values', async () => {
  const context = loadPopupScript();
  const data = new TextEncoder().encode('123456789');
  const archive = context.buildZipArchive([{ name: 'images/001.txt', data }]);
  const bytes = new Uint8Array(await archive.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = bytes.length - 22;
  const centralOffset = view.getUint32(endOffset + 16, true);

  assert.equal(context.calculateCrc32(data), 0xcbf43926);
  assert.equal(archive.type, 'application/zip');
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(14, true), 0xcbf43926);
  assert.equal(view.getUint32(centralOffset, true), 0x02014b50);
  assert.equal(view.getUint32(endOffset, true), 0x06054b50);
  assert.equal(view.getUint16(endOffset + 10, true), 1);
});

test('download input validation removes invalid and duplicate URLs', () => {
  const context = loadBackgroundScript();
  const normalized = context.normalizeDownloadItems([
    'https://example.com/a.jpg',
    'javascript:alert(1)',
    'https://example.com/a.jpg',
    'http://example.com/b.png'
  ]);

  assert.deepEqual(Array.from(normalized), [
    'https://example.com/a.jpg',
    'http://example.com/b.png'
  ]);
});

test('generated paths sanitize folders and preserve safe extensions', () => {
  const context = loadBackgroundScript();
  const filename = context.generateFilename(
    'https://example.com/item/photo.webp?size=large',
    0,
    '../unsafe:folder',
    'images'
  );

  assert.match(filename, /^PicSift\/-unsafe-folder\/images\/001_\d+\.webp$/);
  assert.equal(filename.includes('..'), false);
});

test('full-screen dashboard keeps the source product tab id', async () => {
  const context = loadBackgroundScript();
  const dashboardTabId = await context.openDashboard({ id: 42 });
  const createCall = context.dashboardCalls.find(call => call.action === 'create-tab');
  const storageCall = context.dashboardCalls.find(call => call.action === 'set-storage');

  assert.equal(dashboardTabId, 99);
  assert.equal(createCall.options.url, 'chrome-extension://test/popup/popup.html?sourceTabId=42');
  assert.equal(storageCall.value.picSiftDashboardTabId, 99);
});

test('dashboard clicks preserve the previously connected source tab', () => {
  const context = loadBackgroundScript();
  const sourceTabId = context.resolveSourceTabId({
    id: 99,
    url: 'chrome-extension://test/popup/popup.html?sourceTabId=42'
  });

  assert.equal(sourceTabId, 42);
  assert.throws(
    () => context.resolveSourceTabId({ id: 99, url: 'chrome-extension://test/popup/popup.html' }),
    /未连接商品页/
  );
});

test('dashboard recovers the most recently used supported product tab', async () => {
  const dashboardTab = {
    id: 99,
    url: 'chrome-extension://test/popup/popup.html?sourceTabId=99'
  };
  const olderProductTab = {
    id: 41,
    lastAccessed: 100,
    url: 'https://www.alibaba.com/product-detail/older.html'
  };
  const recentProductTab = {
    id: 42,
    lastAccessed: 200,
    url: 'https://www.alibaba.com/product-detail/recent.html'
  };
  const context = loadPopupScript({
    search: '?sourceTabId=99',
    tabs: {
      get: async tabId => tabId === 99 ? dashboardTab : recentProductTab,
      query: async query => query.active
        ? [dashboardTab]
        : [dashboardTab, olderProductTab, recentProductTab]
    }
  });
  const result = await context.getSupportedActiveTab();

  assert.equal(result.tab.id, 42);
  assert.equal(result.url.hostname, 'www.alibaba.com');
  assert.match(context.historyCalls.at(-1).url, /sourceTabId=42$/);
});

test('result grid keeps large image batches in explicit non-overlapping rows', () => {
  const popupCss = fs.readFileSync(path.join(repositoryRoot, 'popup/popup.css'), 'utf8');

  assert.match(popupCss, /\.image-grid\s*\{[^}]*grid-auto-rows:\s*220px;/s);
  assert.match(popupCss, /\.image-item\s*\{[^}]*aspect-ratio:\s*auto;/s);
  assert.match(popupCss, /\.image-item img\s*\{[^}]*object-fit:\s*contain;/s);
  assert.match(popupCss, /\.media-grid\.is-empty\s*\{[^}]*grid-auto-rows:\s*auto;/s);
});

test('manifest permits automatic source-page reinjection', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'manifest.json'), 'utf8'));
  const popupHtml = fs.readFileSync(path.join(repositoryRoot, 'popup/popup.html'), 'utf8');

  assert.equal(manifest.version, '0.0.5');
  assert.match(popupHtml, />v0\.0\.5</);
  assert.equal(manifest.permissions.includes('scripting'), true);
  assert.equal(Object.hasOwn(manifest.action, 'default_popup'), false);
});
