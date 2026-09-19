const $ = selector => document.querySelector(selector);
const sequence = $('.sequence'), stage = $('.stage'), frame = $('#car-frame');
const holder = $('#car-holder'), still = $('#car-still');
const reduced = matchMedia('(prefers-reduced-motion: reduce)'), mobile = matchMedia('(max-width:700px)');
const intro = $('#intro'), introStatus = $('#intro-status'), status = $('#asset-status');
const clamp = value => Math.min(1, Math.max(0, value));
const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
let viewer = null, queued = false, introPlaying = false, docked = false, generation = 0;
let controller, introRAF, timeout, introReturnFocus, snapshotKey = '';

function setApproach(value) {
  frame.style.setProperty('--approach', value);
  frame.dataset.approach = value.toFixed(3);
}
function setAtmosphere(value) {
  stage.style.setProperty('--intro-darkness', .94 * (1 - value));
  frame.style.setProperty('--car-exposure', .34 + .66 * value);
}
function finishIntro() {
  const returnFocus = intro.contains(document.activeElement);
  introPlaying = false; cancelAnimationFrame(introRAF); viewer?.setLights(0);
  setApproach(1);
  setAtmosphere(1);
  document.body.classList.remove('is-loading'); intro.hidden = true; schedule();
  document.querySelectorAll('header, main, footer').forEach(element => { element.inert = false; });
  if (returnFocus && introReturnFocus?.isConnected) introReturnFocus.focus({ preventScroll: true });
}
function openIntro() {
  if (!introPlaying) introReturnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body && !intro.contains(document.activeElement) ? document.activeElement : null;
  window.scrollTo({ top: 0, behavior: 'instant' });
  setApproach(.7);
  setAtmosphere(0);
  introPlaying = true; intro.hidden = false; document.body.classList.add('is-loading');
  document.querySelectorAll('header, main, footer').forEach(element => { element.inert = true; });
  intro.focus({ preventScroll: true });
}
function fallback(message) {
  controller?.abort(); clearTimeout(timeout); viewer?.dispose(); viewer = null;
  frame.classList.remove('has-model', 'is-docked'); still.hidden = true; docked = false;
  status.textContent = message; $('#replay').hidden = true; $('#retry').hidden = false;
  finishIntro();
}
function update() {
  queued = false;
  const distance = sequence.offsetHeight - stage.offsetHeight;
  const progress = reduced.matches || navigator.connection?.saveData || introPlaying ? 0 : clamp(-sequence.getBoundingClientRect().top / Math.max(1, distance));
  const rotation = smooth(progress / .78), docking = smooth((progress - .53) / .43);
  const w = stage.clientWidth, h = stage.clientHeight;
  const heroZoom = mobile.matches ? 1.12 : 1.3;
  // Ease back to the original orbit framing before the car reaches its card.
  frame.style.setProperty('--hero-scale', 1 + (heroZoom - 1) * (1 - smooth(rotation / .5)));
  const origin = mobile.matches ? { x: 0, y: h * .29, w, h: h * .34 } : { x: w * .10, y: h * .28, w: w * .80, h: h * .54 };
  // Follow the visible front bumper, accounting for the transparent frame margins.
  const introScale = Math.min(origin.w / 1280, origin.h / 720) * (mobile.matches ? 1.6 : 1) * heroZoom;
  if (mobile.matches) {
    // Reserve real space for text on short phones instead of overlapping the car.
    const copyTop = $('.hero-copy').offsetTop;
    origin.y = Math.min(origin.y, copyTop - 24 - origin.h / 2 - (640 - 360) * introScale);
    const detailBottom = $('.settled-copy').offsetTop + $('.settled-copy').offsetHeight;
    const cardTop = Math.max(h * .46, detailBottom + 32);
    holder.style.top = `${cardTop}px`;
    holder.style.height = `${Math.min(h * .36, Math.max(120, h - cardTop - 70))}px`;
  } else {
    holder.style.removeProperty('top'); holder.style.removeProperty('height');
  }
  const bumperBottom = origin.y + origin.h / 2 + (640 - 360) * introScale;
  intro.style.setProperty('--skip-top', `${Math.min(h - 110, bumperBottom + 64)}px`);
  const target = { x: holder.offsetLeft, y: holder.offsetTop, w: holder.clientWidth, h: holder.clientHeight };
  const mix = (a, b) => a + (b - a) * docking;
  Object.assign(frame.style, { left: `${mix(origin.x, target.x)}px`, top: `${mix(origin.y, target.y)}px`, width: `${mix(origin.w, target.w)}px`, height: `${mix(origin.h, target.h)}px` });
  stage.style.setProperty('--intro-copy', 1 - smooth(progress / .24));
  stage.style.setProperty('--detail-copy', smooth((progress - .79) / .15));
  holder.style.opacity = smooth((progress - .62) / .3);
  $('.hero-copy').inert = progress > .2 || introPlaying;
  $('#replay').tabIndex = progress > .2 ? -1 : 0;
  const shouldDock = docking === 1 && !!viewer, key = `${Math.round(target.w)}x${Math.round(target.h)}`;
  if (viewer) {
    let frameReady;
    if (!shouldDock || !docked || snapshotKey !== key) { viewer.setActive(true); frameReady = viewer.setProgress(rotation); }
    if (shouldDock && (!docked || snapshotKey !== key)) {
      // Resize first, then exchange the canvas for a still of exactly the same pixels.
      const currentViewer = viewer;
      Promise.resolve(frameReady).then(() => requestAnimationFrame(() => {
        if (viewer !== currentViewer || !frame.classList.contains('is-docked')) return;
        still.onload = () => {
          if (!viewer || !docked) return;
          still.hidden = false; frame.classList.add('has-still'); viewer.setActive(false);
        };
        still.src = viewer.snapshot(); snapshotKey = key;
      }));
    }
    if (!shouldDock) { still.hidden = true; frame.classList.remove('has-still'); }
  }
  docked = shouldDock; frame.classList.toggle('is-docked', shouldDock);
  frame.dataset.phase = introPlaying ? 'intro' : shouldDock ? 'docked' : progress > 0 ? 'turning' : 'front';
}
function schedule() { if (!queued) { queued = true; requestAnimationFrame(update); } }
function playIntro() {
  if (!viewer || reduced.matches) return finishIntro();
  openIntro();
  introStatus.textContent = 'A moment before motion.';
  viewer.setActive(true); viewer.setProgress(0); viewer.setLights(1, .34);
  still.hidden = true; frame.classList.remove('is-docked'); docked = false; update();
  let start;
  function tick(now) {
    start ??= now;
    const elapsed = now - start;
    setApproach(.7 + .3 * smooth(elapsed / 2200));
    const settling = smooth((elapsed - 650) / 3200);
    setAtmosphere(settling);
    viewer?.setLights(1 - settling, .34 + .66 * settling);
    if (elapsed < 4050 && introPlaying) introRAF = requestAnimationFrame(tick); else finishIntro();
  }
  introRAF = requestAnimationFrame(tick);
}
async function load() {
  const attempt = ++generation;
  controller?.abort(); controller = new AbortController(); viewer?.dispose(); viewer = null;
  frame.classList.remove('has-model', 'is-docked', 'has-still'); still.hidden = true; $('#retry').hidden = true; $('#replay').hidden = true;
  document.body.classList.toggle('static-view', reduced.matches || !!navigator.connection?.saveData);
  if (reduced.matches || navigator.connection?.saveData) {
    status.textContent = 'A quieter view. Motion is turned off.'; finishIntro(); return;
  }
  openIntro();
  introStatus.textContent = 'Preparing your GT3…'; update();
  timeout = setTimeout(() => {
    if (attempt === generation) { generation++; fallback('The car took too long to load. You can retry below.'); }
  }, 25000);
  try {
    const response = await fetch(new URL('./assets/model.json', import.meta.url), { signal: controller.signal });
    if (!response.ok) throw new Error('Model configuration unavailable');
    const config = await response.json(); config.src = new URL(config.src, import.meta.url).href;
    const { createViewer } = await import('./reference-viewer.js');
    if (attempt !== generation) return;
    const instance = await createViewer($('#viewer'), config, {
      signal: controller.signal,
      onProgress(loaded, total) { introStatus.textContent = total && loaded < total ? `Loading your GT3 · ${Math.round(loaded / total * 100)}%` : 'Finishing the details…'; },
      onContextLost() { generation++; fallback('The 3D view paused. Retry to return to the car.'); },
    });
    if (attempt !== generation) { instance.dispose(); return; }
    clearTimeout(timeout); viewer = instance; frame.classList.add('has-model');
    status.textContent = 'Scroll to explore every angle'; $('#replay').hidden = false;
    if (introPlaying) playIntro(); else { viewer.setLights(0); schedule(); }
  } catch (error) {
    if (attempt !== generation) return;
    console.warn('Using the car poster.', error); fallback('The animation is unavailable. The car preview is ready.');
  }
}
$('#skip-intro').addEventListener('click', finishIntro);
intro.addEventListener('keydown', event => {
  if (event.key === 'Escape') finishIntro();
  if (event.key === 'Tab') { event.preventDefault(); $('#skip-intro').focus(); }
});
$('#replay').addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'instant' }); playIntro(); });
$('#retry').addEventListener('click', load);
addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule);
document.fonts.ready.then(schedule);
reduced.addEventListener('change', () => { generation++; clearTimeout(timeout); finishIntro(); load(); });
addEventListener('pagehide', () => { generation++; clearTimeout(timeout); cancelAnimationFrame(introRAF); controller?.abort(); viewer?.dispose(); });
addEventListener('pageshow', event => { if (event.persisted) load(); });
update(); load();
