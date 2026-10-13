// Adapted from the user-supplied 21st.dev GridPulse prompt for this static site.
// Canvas only runs on larger fine-pointer screens; the faint CSS grid is the fallback.
(() => {
  const stage = document.querySelector('.hero-stage');
  const layer = stage?.querySelector('[data-grid-pulse]');
  const canvas = layer?.querySelector('canvas');
  if (!stage || !layer || !canvas) return;

  const motion = window.matchMedia('(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const size = 30;
  const reach = 2.5;
  const limit = 120;
  const palette = ['#EA3726', '#EA3726', '#EA3726', '#747675', '#B3B2AF'];
  let stop = () => {};

  function start() {
    const context = canvas.getContext('2d');
    if (!context) return () => {};
    const cells = new Map();
    let width = 0;
    let height = 0;
    let columns = 1;
    let rows = 1;
    let protectedLines = [];
    let visible = true;
    let frame = 0;
    let pendingPaint = 0;
    let beat = 0;
    let remeasure = 0;
    let pointer = null;

    function measureText() {
      const origin = layer.getBoundingClientRect();
      protectedLines = [...stage.querySelectorAll('[data-grid-avoid]')].flatMap((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
        return (rects.length ? rects : [element.getBoundingClientRect()]).map((rect) => ({
          left: rect.left - origin.left - 6,
          top: rect.top - origin.top - 6,
          right: rect.right - origin.left + 6,
          bottom: rect.bottom - origin.top + 6,
        }));
      });
    }

    function measure() {
      width = layer.clientWidth;
      height = layer.clientHeight;
      columns = Math.max(1, Math.ceil(width / size));
      rows = Math.max(1, Math.ceil(height / size));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      cells.clear();
      measureText();
    }

    function strength(col, row) {
      const x = col * size + size / 2;
      const y = row * size + size / 2;
      let distance = Infinity;
      for (const line of protectedLines) {
        const dx = Math.max(line.left - x, 0, x - line.right);
        const dy = Math.max(line.top - y, 0, y - line.bottom);
        distance = Math.min(distance, Math.hypot(dx, dy));
        if (distance === 0) break;
      }
      return distance === Infinity ? 1 : .08 + .92 * Math.min(1, distance / (size * 2.5));
    }

    function draw(now) {
      frame = 0;
      if (!visible || document.hidden) return;
      context.clearRect(0, 0, width, height);
      for (const [key, cell] of cells) {
        const fadeIn = Math.min(1, Math.max(0, (now - cell.born) / 160));
        const fadeOut = now < cell.until ? 1 : 1 - Math.min(1, ((now - cell.until) / 750) ** 2);
        if (fadeOut <= 0) { cells.delete(key); continue; }
        context.globalAlpha = cell.opacity * cell.dim * (1 - (1 - fadeIn) ** 2) * fadeOut;
        context.fillStyle = cell.colour;
        context.fillRect(cell.col * size + 1, cell.row * size + 1, size - 1, size - 1);
      }
      context.globalAlpha = 1;
      if (cells.size) frame = requestAnimationFrame(draw);
    }

    function wake() {
      if (visible && !document.hidden && !frame) frame = requestAnimationFrame(draw);
    }

    function light(col, row, hold) {
      if (col < 0 || row < 0 || col >= columns || row >= rows) return;
      const key = `${col},${row}`;
      const now = performance.now();
      const current = cells.get(key);
      if (current && now < current.until) return;
      if (!current && cells.size >= limit) return;
      const colour = current?.colour || palette[Math.floor(Math.random() * palette.length)];
      cells.set(key, {
        col, row, colour,
        opacity: colour === '#EA3726' ? .48 : .4,
        dim: strength(col, row),
        born: now,
        until: now + hold,
      });
      wake();
    }

    function paint() {
      pendingPaint = 0;
      if (!pointer || !visible) return;
      const col = Math.floor(pointer.x / size);
      const row = Math.floor(pointer.y / size);
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const distance = Math.hypot(dx, dy);
          if (distance > reach || Math.random() > 1 - distance / (reach + .6)) continue;
          light(col + dx, row + dy, 260 + Math.random() * 850);
        }
      }
    }

    function onMove(event) {
      const bounds = layer.getBoundingClientRect();
      pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      if (!pendingPaint) pendingPaint = requestAnimationFrame(paint);
    }

    function drift() {
      if (visible && !document.hidden) {
        light(Math.floor(Math.random() * columns), Math.floor(Math.random() * rows), 900 + Math.random() * 1400);
        light(Math.floor(Math.random() * columns), Math.floor(Math.random() * rows), 900 + Math.random() * 1400);
      }
      beat = window.setTimeout(drift, 1500 + Math.random() * 1600);
    }

    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        context.clearRect(0, 0, width, height);
      } else wake();
    }

    const sight = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) wake();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
        context.clearRect(0, 0, width, height);
      }
    });
    const resize = new ResizeObserver(measure);
    sight.observe(stage);
    resize.observe(stage);
    stage.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    measure();
    beat = window.setTimeout(drift, 500);
    remeasure = window.setTimeout(measureText, 1800);
    document.fonts?.ready.then(measureText).catch(() => {});

    return () => {
      sight.disconnect();
      resize.disconnect();
      stage.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pendingPaint);
      clearTimeout(beat);
      clearTimeout(remeasure);
      cells.clear();
      context.clearRect(0, 0, width, height);
    };
  }

  function reconcile() {
    stop();
    stop = motion.matches ? start() : () => {};
  }
  motion.addEventListener('change', reconcile);
  reconcile();
})();
