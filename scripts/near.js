// Opening and classroom chapter. Deliberately independent of the later scenes.
(() => {
  'use strict';
  const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
  const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedReduce = new URLSearchParams(location.search).get('motion') === 'reduce';
  const reduced = () => forcedReduce || preference.matches;
  const prologue = document.querySelector('.prologue');
  const hero = prologue?.querySelector('.hero');
  const dawn = prologue?.querySelector('.earthrise');
  const sun = prologue?.querySelector('.solar-sun');
  const stage = prologue?.querySelector('.prologue-stage');
  const question = prologue?.querySelector('.solar-question');
  const answer = prologue?.querySelector('.solar-answer');
  const clock = prologue?.querySelector('.solar-clock strong');
  const journey = prologue?.querySelector('.solar-journey');
  const boardStory = document.querySelector('.board-story');
  const board = boardStory?.querySelector('.blackboard');
  const boardSteps = [...document.querySelectorAll('.board-step[data-board]')];
  const boardPages = [...document.querySelectorAll('.board-page[data-board]')];
  const boardCopies = boardPages.map(page => page.querySelector('.board-lesson'));
  const wave = board?.querySelector('.board-wave-stretch');
  const wavePeaks = board?.querySelector('.board-wave-peaks');
  const waveMeasure = board?.querySelector('.board-wave-measure');
  const waveLabel = board?.querySelector('.board-wave-label');
  let boardStride = 1, boardInset = 16;
  let frame = 0, origin, mobileJourney, currentBoard = -1, currentSeconds = -1;
  const inView = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.bottom >= 0 && r.top <= innerHeight; };
  const mobile = () => innerWidth <= 700;

  function measureLayout() {
    if (prologue && dawn && stage) {
      const w = dawn.offsetWidth, h = dawn.offsetHeight;
      const fit = Math.max(w / 1536, h / 1024);
      const localX = (w - 1536 * fit) * (mobile() ? 1 : .75) + 1370 * fit;
      const localY = (h - 1024 * fit) * .5 + 402 * fit;
      origin = { x: dawn.offsetLeft + localX, y: dawn.offsetTop + localY };
      dawn.style.transformOrigin = `${localX}px ${localY}px`;
      if (mobile()) {
        const H = stage.clientHeight;
        journey.style.setProperty('--near-question-gap', `${Math.round(H * .70)}px`);
        const qTop = question.getBoundingClientRect().top - prologue.getBoundingClientRect().top;
        const qHeight = question.offsetHeight;
        // Read the whole question before launching. The measured answer follows
        // the completed flight rather than sharing the diagram's reading field.
        const settleAt = qTop - 24;
        const travelStart = settleAt + qHeight + H * .15;
        const travelEnd = travelStart + H * .65;
        const answerTop = travelEnd + H + 32;
        journey.style.setProperty('--near-answer-gap', `${Math.ceil(answerTop - qTop - qHeight)}px`);
        const sceneY = Math.min(H - 125, Math.max(H * .65, 24 + qHeight + 108));
        prologue.style.setProperty('--near-scene-y', `${sceneY}px`);
        prologue.style.setProperty('--near-note-y', `${sceneY + 97}px`);
        mobileJourney = { settleAt, travelStart, travelEnd, sceneY, sceneBottom: sceneY + 131 };
      } else {
        journey.style.removeProperty('--near-question-gap');
        journey.style.removeProperty('--near-answer-gap');
        mobileJourney = null;
      }
    }
    if (board) {
      const enhanced = !reduced();
      boardStory.classList.toggle('board-enhanced', enhanced);
      if (enhanced) {
        const isMobile = mobile();
        const textHeight = Math.max(...boardCopies.map(copy => copy.offsetHeight));
        const style = getComputedStyle(board);
        const surround = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth']
          .reduce((sum, prop) => sum + parseFloat(style[prop]), 0);
        const topHeight = board.querySelector('.board-top').offsetHeight;
        // Native text determines the remaining drawing area. Keep every page
        // the same height so changes in wrapping do not move the board.
        boardInset = Math.max(12, Math.min(28, innerHeight * .035));
        const available = innerHeight - boardInset * 2 - surround - topHeight - 24;
        const drawingHeight = isMobile
          ? Math.max(110, Math.min(220, available - textHeight - 16))
          : Math.max(150, Math.min(390, available));
        const pageHeight = isMobile ? textHeight + drawingHeight + 16 : Math.max(textHeight, drawingHeight);
        board.style.setProperty('--board-page-height', `${Math.ceil(pageHeight)}px`);
        board.style.setProperty('--board-drawing-height', `${Math.ceil(drawingHeight)}px`);
        board.style.setProperty('--board-inset', `${boardInset}px`);
        board.style.setProperty('--board-height', `${board.offsetHeight}px`);
        boardStride = Math.max(330, innerHeight * .72);
        boardSteps.forEach((step, i) => {
          step.style.height = `${Math.ceil(i === 3 ? board.offsetHeight + boardStride * .6 : boardStride)}px`;
        });
      } else {
        boardPages.forEach(page => page.classList.remove('is-current'));
        board.style.removeProperty('--board-page-height');
        board.style.removeProperty('--board-drawing-height');
        updateWave(1);
        currentBoard = -1;
      }
    }
  }

  function updatePrologue() {
    if (!inView(prologue) || !origin || !question || !answer) return;
    const y = -prologue.getBoundingClientRect().top;
    const h = hero.offsetHeight, isMobile = mobile();
    const H = stage.clientHeight;
    const qTop = question.getBoundingClientRect().top + y;
    const settleAt = isMobile ? mobileJourney.settleAt : qTop - innerHeight * .14;
    const t = reduced() ? +(y > h * .62) : clamp((y - h * .13) / Math.max(1, settleAt - h * .13));
    const move = smooth(t);
    const targetX = stage.clientWidth * (isMobile ? .19 : .20);
    const targetY = isMobile ? mobileJourney.sceneY : H * .65;
    const x = origin.x + (targetX - origin.x) * move;
    const sy = origin.y + (targetY - origin.y) * move;
    const answerTop = answer.getBoundingClientRect().top;
    const end = isMobile
      ? smooth((answerTop - mobileJourney.sceneBottom - 20) / Math.max(40, H * .12))
      : (reduced() ? +(answerTop > innerHeight * .48) : smooth((answerTop - innerHeight * .48) / (innerHeight * .19)));
    dawn.style.transform = reduced() ? 'none' : `translate(${x - origin.x}px,${sy - origin.y}px) scale(${1 + 3.8 * smooth(t / .8)})`;
    prologue.style.setProperty('--dawn-opacity', 1 - smooth((t - .2) / .43));
    prologue.style.setProperty('--hero-opacity', reduced() ? 1 - t : 1 - smooth(y / (h * .36)));
    prologue.style.setProperty('--solar-opacity', smooth((t - .72) / .28) * end);
    prologue.style.setProperty('--question-opacity', isMobile ? (reduced() ? +(y >= settleAt) : smooth((y - settleAt) / (H * .08))) : smooth((t - .70) / .30));
    sun.style.left = `${x}px`; sun.style.top = `${sy}px`;
    const approach = smooth(t / .62), settle = smooth((t - .62) / .38);
    const peak = isMobile ? 1.6 : 1.65;
    sun.style.setProperty('--sun-scale', reduced() ? 1 : (.06 + (peak - .06) * approach) * (1 - settle) + settle);
    sun.style.opacity = smooth((t - .12) / .25) * end;
    sun.style.setProperty('--sun-detail', smooth((t - .28) / .37));
    const travel = reduced() ? 1 : (isMobile
      ? clamp((y - mobileJourney.travelStart) / (mobileJourney.travelEnd - mobileJourney.travelStart))
      : clamp((y - settleAt) / Math.max(innerHeight * .35, answer.offsetTop - innerHeight * .90 - settleAt)));
    prologue.style.setProperty('--travel', `${travel * 100}%`);
    const seconds = Math.round(travel * 500);
    if (seconds !== currentSeconds && clock) {
      clock.innerHTML = `${Math.floor(seconds / 60)} <small>min</small> ${String(seconds % 60).padStart(2, '0')} <small>s</small>`;
      currentSeconds = seconds;
    }
  }

  function updateWave(progress) {
    if (!wave || !waveMeasure || !wavePeaks || !waveLabel) return;
    const wavelength = 100 + 160 * progress;
    const points = [];
    for (let x = 70; x <= 650; x += 3) points.push(`${x === 70 ? 'M' : 'L'}${x} ${(180 - 45 * Math.sin((x - 70) * Math.PI * 2 / wavelength)).toFixed(2)}`);
    const peak = 70 + wavelength * .25;
    wave.setAttribute('d', points.join(' '));
    wavePeaks.setAttribute('d', `M${peak} 135V265M${peak + wavelength} 135V265`);
    waveMeasure.setAttribute('d', `M${peak} 265v-14m0 7h${wavelength}m0-7v14`);
    waveLabel.setAttribute('x', peak + wavelength * .5);
  }

  function updateBoard() {
    if (reduced() || !inView(boardStory) || !board || !boardPages.length) return;
    const progress = Math.max(0, (boardInset - boardStory.getBoundingClientRect().top) / boardStride);
    const index = Math.min(boardPages.length - 1, Math.floor(progress + .08));
    if (index !== currentBoard) {
      boardPages.forEach((page, i) => page.classList.toggle('is-current', i === index));
      board.querySelectorAll('.board-progress i').forEach((mark, i) => mark.classList.toggle('is-current', i === index));
      currentBoard = index;
    }
    board.style.setProperty('--ink', 1);
    if (index === 3) updateWave(smooth((progress - 2.92) / .55));
  }

  function render() {
    frame = 0;
    if (document.hidden) return;
    updatePrologue(); updateBoard();
  }
  function schedule() { if (!frame && !document.hidden) frame = requestAnimationFrame(render); }
  function restore() { if (frame) cancelAnimationFrame(frame); frame = 0; render(); }
  function resize() { measureLayout(); restore(); }
  function showBoardPage(page) {
    if (!page || reduced() || !boardStory?.classList.contains('board-enhanced')) return;
    const index = Number(page.dataset.board);
    const top = scrollY + boardStory.getBoundingClientRect().top - boardInset + index * boardStride;
    scrollTo({ top, behavior: 'instant' });
    restore();
  }
  function restoreOwnedAnchor() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = id ? document.getElementById(id) : null;
    if (target?.matches('.board-page[data-board]')) showBoardPage(target);
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', resize, { passive: true });
  addEventListener('hashchange', () => { resize(); restoreOwnedAnchor(); });
  addEventListener('pageshow', event => { resize(); if (!event.persisted) restoreOwnedAnchor(); });
  preference.addEventListener('change', () => {
    document.documentElement.classList.toggle('reduced-motion', reduced());
    resize();
  });
  document.addEventListener('visibilitychange', restore);
  document.addEventListener('focusin', event => {
    const page = event.target.closest('.board-page');
    if (page && !page.classList.contains('is-current')) showBoardPage(page);
  });
  document.fonts?.ready.then(() => { resize(); restoreOwnedAnchor(); });
  document.fonts?.addEventListener('loadingdone', resize);
  if (typeof ResizeObserver !== 'undefined') {
    // Observe intrinsic text boxes, never the padded scroll containers.
    const observer = new ResizeObserver(resize);
    [question, answer, ...boardCopies].filter(Boolean).forEach(el => observer.observe(el));
  }
  measureLayout();
  render();
  restoreOwnedAnchor();
})();
