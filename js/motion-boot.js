/* Runs before first paint. A failed or slow motion bundle must never hide content. */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('motion-ready');
  window.taaMotionFallback = setTimeout(() => {
    document.documentElement.classList.remove('motion-ready');
    document.documentElement.dataset.motion = 'fallback';
  }, 3500);
})();
