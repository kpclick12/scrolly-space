(() => {
  'use strict';
  const root = document.querySelector('.observatory-v3');
  if (!root) return;
  const scenes = [...root.querySelectorAll('[data-observation]')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedReduce = new URLSearchParams(location.search).get('motion') === 'reduce';
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
  let frame = 0;
  let immersive = false;
  let sceneMeasurements = [];
  let initialHashPending = Boolean(location.hash);
  let pageShown = document.readyState === 'complete';
  let fontsReady = !document.fonts;
  let hashFrame = 0;

  function measure() {
    // Read all layout before writing visual styles. The svh figure is the pacing unit.
    sceneMeasurements = scenes.map(scene => ({
      scene,
      image: scene.querySelector('.observation-image'),
      copy: scene.querySelector('.observation-copy'),
      height: scene.querySelector('.observation-image').offsetHeight
    }));
  }
  function render() {
    frame = 0;
    if (document.hidden || !immersive) return;
    const section = root.getBoundingClientRect();
    if (section.bottom < 0 || section.top > innerHeight) return;
    const snapshots = sceneMeasurements.map(item => ({
      ...item,
      sceneRect: item.scene.getBoundingClientRect(),
      copyRect: item.copy.getBoundingClientRect()
    }));
    snapshots.forEach(({scene, image, copy, height, sceneRect, copyRect}) => {
      if (sceneRect.bottom < 0 || sceneRect.top > innerHeight) return;
      const y = -sceneRect.top;
      const h = Math.max(1, height);
      // Reveal over 6–30svh. Prose starts at 150svh and enters at 50svh,
      // keeping 20svh for the photograph before the first line appears.
      const enter = smooth((y - h * .06) / (h * .24));
      // Start fading only after the final line leaves the viewport.
      // Tail=1.25H: sticky ends at copy.bottom=-.25H, after fade reaches zero at -.22H.
      const leave = smooth((copyRect.bottom + h * .22) / (h * .22));
      const light = enter * leave;
      // Overlapping black tails must not cover the preceding still-lit photograph.
      scene.classList.toggle('is-lit', light > 0);
      const focus = smooth((y - h * .30) / (h * 1.65 + copyRect.height));
      const wipe = smooth((y - h * .48) / (h * .95 + copyRect.height * .45));
      const caption = 1 - smooth((innerHeight * 1.1 - copyRect.top) / (h * .30));
      image.style.setProperty('--observation-light', light.toFixed(4));
      image.style.setProperty('--observation-focus', focus.toFixed(4));
      image.style.setProperty('--observation-wipe', wipe.toFixed(4));
      image.style.setProperty('--observation-caption', caption.toFixed(4));
      copy.classList.toggle('is-reading', copyRect.top < innerHeight * .85 && copyRect.bottom > 0);
    });
  }
  function schedule() {
    if (!frame && immersive && !document.hidden) frame = requestAnimationFrame(render);
  }
  function refresh() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    measure();
    render();
  }
  function applyPreference() {
    immersive = !forcedReduce && !preference.matches;
    root.classList.toggle('is-immersive', immersive);
    refresh();
  }
  function restoreHash() {
    if (!location.hash) return;
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target || !root.contains(target)) return;
    // A scene anchor lands at the start of its prose, after the picture introduction.
    const scene = target.closest('.observation-scene');
    const destination = immersive && target === scene ? scene.querySelector('.observation-copy') : target;
    destination.scrollIntoView({block:'start', behavior:'instant'});
    refresh();
  }
  function queueInitialHash() {
    if (!initialHashPending || !pageShown || !fontsReady || hashFrame) return;
    // Native anchor restoration runs after module initialization. Let it finish
    // before applying the local prose destination, once, after pageshow/fonts.
    hashFrame = requestAnimationFrame(() => {
      hashFrame = requestAnimationFrame(() => {
        hashFrame = 0;
        if (!initialHashPending) return;
        restoreHash();
        initialHashPending = false;
      });
    });
  }
  function cancelInitialHash() {
    initialHashPending = false;
    if (hashFrame) cancelAnimationFrame(hashFrame);
    hashFrame = 0;
  }
  addEventListener('wheel', cancelInitialHash, {passive:true});
  addEventListener('touchstart', cancelInitialHash, {passive:true});
  addEventListener('keydown', event => {
    if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) cancelInitialHash();
  });
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', refresh, {passive:true});
  addEventListener('hashchange', restoreHash);
  addEventListener('pageshow', event => {
    refresh();
    pageShown = true;
    if (event.persisted) cancelInitialHash();
    else queueInitialHash();
  });
  document.addEventListener('visibilitychange', () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (!document.hidden) refresh();
  });
  preference.addEventListener('change', applyPreference);
  root.addEventListener('focusin', schedule);
  document.fonts?.ready.then(() => {
    fontsReady = true;
    refresh();
    queueInitialHash();
  });
  applyPreference();
  queueInitialHash();
})();
