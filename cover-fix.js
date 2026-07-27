(() => {
  'use strict';

  const LOCAL_COVER_RE = /(?:^|\/)media\/image\d+\.(?:jpe?g|png|webp)(?:[?#].*)?$/i;
  const CACHE_KEY = 'atlas-online-cover-cache-v1';
  const pending = new Map();
  let active = 0;
  const queue = [];

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
    catch { return {}; }
  }

  function writeCache(cache) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }
    catch { /* El navegador puede bloquear almacenamiento en modo privado. */ }
  }

  const cache = readCache();

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function titleFromImage(img) {
    return String(img.alt || '')
      .replace(/^Portada de\s+/i, '')
      .trim();
  }

  function improveGoogleUrl(url) {
    return String(url || '')
      .replace(/^http:/i, 'https:')
      .replace(/zoom=1/i, 'zoom=2')
      .replace(/&edge=curl/gi, '');
  }

  async function googleCover(title) {
    const query = `intitle:${title}`;
    const endpoint = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&printType=books&projection=lite`;
    const response = await fetch(endpoint, { mode: 'cors' });
    if (!response.ok) throw new Error(`Google Books respondió ${response.status}`);
    const data = await response.json();
    const target = normalize(title);
    const candidates = (data.items || [])
      .map(item => item.volumeInfo || {})
      .filter(info => info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail)
      .map(info => {
        const candidate = normalize(info.title);
        let score = 0;
        if (candidate === target) score = 100;
        else if (candidate.startsWith(target) || target.startsWith(candidate)) score = 80;
        else if (candidate.includes(target) || target.includes(candidate)) score = 60;
        return { score, url: improveGoogleUrl(info.imageLinks.thumbnail || info.imageLinks.smallThumbnail) };
      })
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.url || '';
  }

  async function openLibraryCover(title) {
    const endpoint = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=5&fields=title,cover_i`;
    const response = await fetch(endpoint, { mode: 'cors' });
    if (!response.ok) return '';
    const data = await response.json();
    const target = normalize(title);
    const candidates = (data.docs || [])
      .filter(book => book.cover_i)
      .map(book => {
        const candidate = normalize(book.title);
        const score = candidate === target ? 100 : candidate.includes(target) || target.includes(candidate) ? 70 : 10;
        return { score, url: `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` };
      })
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.url || '';
  }

  async function lookup(title) {
    if (Object.prototype.hasOwnProperty.call(cache, title)) return cache[title] || '';
    let url = '';
    try { url = await googleCover(title); } catch { /* Se prueba la fuente alternativa. */ }
    if (!url) {
      try { url = await openLibraryCover(title); } catch { /* Se conserva el marcador visual. */ }
    }
    cache[title] = url || null;
    writeCache(cache);
    return url;
  }

  function schedule(title) {
    if (pending.has(title)) return pending.get(title);
    const promise = new Promise(resolve => queue.push({ title, resolve }));
    pending.set(title, promise);
    pump();
    return promise;
  }

  function pump() {
    while (active < 2 && queue.length) {
      const job = queue.shift();
      active += 1;
      lookup(job.title)
        .then(job.resolve)
        .finally(() => {
          active -= 1;
          pending.delete(job.title);
          pump();
        });
    }
  }

  async function repairImage(img) {
    const raw = img.getAttribute('src') || '';
    if (!LOCAL_COVER_RE.test(raw) || img.dataset.atlasCoverLookup === 'done') return;
    img.dataset.atlasCoverLookup = 'done';
    const title = titleFromImage(img);
    if (!title) return;
    const cached = cache[title];
    if (cached) {
      img.src = cached;
      return;
    }
    img.style.opacity = '0.35';
    const url = await schedule(title);
    if (url) img.src = url;
    img.style.opacity = '';
  }

  function scan(root = document) {
    if (root instanceof HTMLImageElement) void repairImage(root);
    root.querySelectorAll?.('img[src]').forEach(img => void repairImage(img));
  }

  const observer = new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) scan(node);
      });
    }
  });

  observer.observe(document.documentElement, { subtree: true, childList: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan(), { once: true });
  else scan();
})();
