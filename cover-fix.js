(() => {
  'use strict';

  const IMAGE_RE = /(?:^|\/)media\/(image\d+)\.(?:jpe?g|png|webp)(?:[?#].*)?$/i;

  function normalizedCoverUrl(raw) {
    if (!raw || /^(?:data:|blob:|https?:)/i.test(raw)) return raw;
    const match = String(raw).match(IMAGE_RE);
    if (!match) return raw;
    return new URL(`media/${match[1]}.webp`, document.baseURI).href;
  }

  function repairImage(img) {
    const raw = img.getAttribute('src');
    const fixed = normalizedCoverUrl(raw);
    if (fixed && fixed !== raw) img.setAttribute('src', fixed);
  }

  function scan(root = document) {
    if (root instanceof HTMLImageElement) repairImage(root);
    root.querySelectorAll?.('img[src]').forEach(repairImage);
  }

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') repairImage(record.target);
      record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) scan(node);
      });
    }
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['src']
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan(), { once: true });
  } else {
    scan();
  }
})();
