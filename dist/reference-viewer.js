// All frames come from the approved Blender scene, including the opening poster.
// Keep only a small decoded working set; compressed frame blobs are prefetched.
export async function createViewer(container, config, { onProgress, signal } = {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  container.append(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) { canvas.remove(); throw new Error('Canvas rendering is unavailable'); }
  const blobs = new Map(), decoded = new Map(), decoding = new Map();
  const last = config.frameCount - 1;
  let poster, progress = 0, lights = 1, active = true, disposed = false, visible = true;
  let latest = 0, width = 0, height = 0, prefetchTimer;
  const frameURL = index => {
    const url = new URL(`${config.frames}turn-${String(index).padStart(3, '0')}.webp`, import.meta.url);
    if (config.frameVersion) url.searchParams.set('v', config.frameVersion);
    return url;
  };
  function blob(index) {
    if (!blobs.has(index)) {
      const task = fetch(frameURL(index), { signal }).then(response => {
        if (!response.ok) throw new Error(`Car frame ${index} unavailable`);
        return response.blob();
      }).catch(error => { blobs.delete(index); throw error; });
      blobs.set(index, task);
    }
    return blobs.get(index);
  }
  function trim() {
    const protectedFrames = new Set([0, last, Math.floor(progress * last), Math.ceil(progress * last)]);
    for (const [index, image] of decoded) {
      if (decoded.size <= 10) break;
      if (!protectedFrames.has(index)) { image.close(); decoded.delete(index); }
    }
  }
  async function frame(index) {
    if (disposed) throw new DOMException('Viewer disposed', 'AbortError');
    if (decoded.has(index)) {
      const image = decoded.get(index); decoded.delete(index); decoded.set(index, image);
      return image;
    }
    if (!decoding.has(index)) {
      const task = blob(index).then(data => createImageBitmap(data)).then(image => {
        if (disposed) { image.close(); throw new DOMException('Viewer disposed', 'AbortError'); }
        decoded.set(index, image); decoding.delete(index); trim(); return image;
      }).catch(error => { decoding.delete(index); throw error; });
      decoding.set(index, task);
    }
    return decoding.get(index);
  }
  function imagePlacement() {
    const turn = Math.min(1, progress / .5);
    const frontZoom = matchMedia('(max-width:700px)').matches ? 1 + .6 * (1 - turn * turn * (3 - 2 * turn)) : 1;
    const ratio = Math.min(canvas.width / 1280, canvas.height / 720) * frontZoom;
    const w = 1280 * ratio, h = 720 * ratio;
    return { x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, w, h, ratio };
  }
  function paint(image, opacity = 1) {
    const { x, y, w, h } = imagePlacement();
    ctx.globalAlpha = opacity;
    ctx.drawImage(image, x, y, w, h);
  }
  function highBeams() {
    // Projector positions in the 1280 × 720 reference camera. The DRLs are
    // baked into every frame; only this optical bloom fades out after the intro.
    const { x, y, ratio } = imagePlacement();
    ctx.save();
    ctx.translate(x, y); ctx.scale(ratio, ratio);
    ctx.globalAlpha = lights; ctx.globalCompositeOperation = 'screen';
    for (const centerX of [408, 871]) {
      const centerY = 405;
      const halo = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 105);
      halo.addColorStop(0, 'rgba(235,249,255,1)');
      halo.addColorStop(.12, 'rgba(208,240,255,.95)');
      halo.addColorStop(.28, 'rgba(158,218,255,.5)');
      halo.addColorStop(.58, 'rgba(102,183,255,.13)');
      halo.addColorStop(1, 'rgba(102,183,255,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(centerX - 105, centerY - 105, 210, 210);
      const streak = ctx.createLinearGradient(centerX - 115, 0, centerX + 115, 0);
      streak.addColorStop(0, 'rgba(175,226,255,0)');
      streak.addColorStop(.5, 'rgba(228,247,255,.8)');
      streak.addColorStop(1, 'rgba(175,226,255,0)');
      ctx.fillStyle = streak;
      ctx.fillRect(centerX - 115, centerY - .8, 230, 1.6);
      ctx.fillStyle = '#f4fcff';
      ctx.beginPath(); ctx.ellipse(centerX, centerY, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function draw(force = false) {
    if (disposed || !poster || (!force && (!active || !visible || document.hidden))) return;
    const position = progress * last, low = Math.floor(position), high = Math.ceil(position);
    const first = decoded.get(low), second = decoded.get(high);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (first) {
      paint(first);
      if (second && high !== low) paint(second, position - low);
    } else {
      const nearest = [...decoded.keys()].sort((a, b) => Math.abs(a - position) - Math.abs(b - position))[0];
      paint(decoded.get(nearest) || poster);
    }
    ctx.globalAlpha = 1;
    if (progress === 0 && lights > 0) highBeams();
  }
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w; height = h;
    const dpr = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    draw();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; draw(); });
  observer.observe(container);
  const onVisibility = () => draw();
  document.addEventListener('visibilitychange', onVisibility);
  function dispose() {
    if (disposed) return;
    disposed = true; clearTimeout(prefetchTimer);
    resizeObserver.disconnect(); observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    signal?.removeEventListener('abort', dispose);
    decoded.forEach(image => image.close()); decoded.clear(); blobs.clear();
    poster?.close(); canvas.remove();
  }
  signal?.addEventListener('abort', dispose, { once: true });
  try {
    const response = await fetch(new URL(config.poster, import.meta.url), { signal });
    if (!response.ok) throw new Error('Reference poster unavailable');
    poster = await createImageBitmap(await response.blob());
    if (disposed) { poster.close(); throw new DOMException('Viewer disposed', 'AbortError'); }
    onProgress?.(1, 3);
    await frame(0); onProgress?.(2, 3);
    await frame(last); onProgress?.(3, 3);
    resize(); draw();
    // Fill the HTTP/blob cache with bounded concurrency. Decode only frames needed on screen.
    let next = 1;
    const worker = async () => {
      while (!disposed && next < last) {
        const index = next++;
        try { await blob(index); } catch { /* A demanded frame is retried by setProgress. */ }
      }
    };
    prefetchTimer = setTimeout(() => { Promise.all([worker(), worker(), worker()]); }, 0);
  } catch (error) { dispose(); throw error; }
  return {
    setProgress(value) {
      progress = Math.max(0, Math.min(1, value));
      const request = ++latest, position = progress * last;
      draw();
      return Promise.all([frame(Math.floor(position)), frame(Math.ceil(position))]).then(() => {
        if (request === latest) draw();
      }).catch(error => { if (error.name !== 'AbortError') console.warn('Keeping the nearest car frame.', error); });
    },
    setLights(value) { lights = value; container.dataset.lights = value.toFixed(3); draw(); },
    setActive(value) { active = value; if (value) { resize(); draw(); } },
    snapshot() { resize(); draw(true); return canvas.toDataURL('image/png'); },
    dispose,
  };
}
