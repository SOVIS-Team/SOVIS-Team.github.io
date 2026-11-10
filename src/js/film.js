/* 첫 화면: 재생 중인 영상의 실제 좌우 소리 크기를 앱과 같은 계산으로 브라우저 창 가장자리에 그린다. */
(function () {
  'use strict';
  var root = document.querySelector('[data-film]');
  if (!root || !window.SV || !window.SV_TRACK) return;

  var T = window.SV_TRACK;
  var NAMES = { ambient: '환경음', speech: '사람 소리', danger: '위협음' };
  var video = root.querySelector('video');
  var canvas = root.querySelector('canvas');
  var kindEl = root.querySelector('[data-now-kind]');
  var dirEl = root.querySelector('[data-now-dir]');
  var pauseBtn = root.querySelector('[data-pause]');
  var soundBtn = root.querySelector('[data-sound]');
  var modeBtns = root.querySelectorAll('[data-mode]');

  var count = T.l.length / 2;
  function peak(s, i) { return (+s.substr(i * 2, 2)) / 100; }

  var engine = SV.createEngine();
  var mode = 0, paused = false, visible = true, last = 0, clock = 0, lastIdx = -1, raf = 0;
  var shownKind = '', shownDir = '', dirSince = 0, dirNext = '';

  function sceneAt(t) {
    var s = T.scenes[0];
    for (var i = 0; i < T.scenes.length; i++) if (T.scenes[i].t <= t) s = T.scenes[i];
    return s;
  }

  function videoReady() { return video && video.readyState >= 2 && !video.error; }

  function setLabel(scene, now) {
    if (scene.kind !== shownKind) {
      shownKind = scene.kind;
      kindEl.textContent = NAMES[scene.kind];
      root.setAttribute('data-kind', scene.kind);
      root.style.setProperty('--focus', scene.focus + '%');
    }
    var pan = engine.pan();
    var dir = engine.level() < .05 ? '조용함' : pan < -.1 ? '왼쪽' : pan > .1 ? '오른쪽' : '가운데';
    if (dir !== dirNext) { dirNext = dir; dirSince = now; }
    if (dir !== shownDir && now - dirSince > 260) { shownDir = dir; dirEl.textContent = dir; }
  }

  function frame(now) {
    raf = 0;
    if (!visible) return;
    var dt = Math.min(60, now - (last || now));
    last = now;
    if (!paused) clock = (clock + dt / 1000) % T.duration;
    var t = !paused && videoReady() ? video.currentTime : clock;
    if (paused && videoReady()) t = video.currentTime;
    var idx = Math.min(count - 1, Math.floor(t * T.rate));
    if (idx !== lastIdx && !paused) {
      lastIdx = idx;
      engine.feed(peak(T.l, idx), peak(T.r, idx));
    }
    var s = SV.fit(canvas);
    s.ctx.clearRect(0, 0, s.w, s.h);
    var scene = sceneAt(t);
    if (!paused) engine.step(dt, s.w, s.h);
    engine.draw(s.ctx, s.w, s.h, mode, scene.kind, 50);
    setLabel(scene, now);
    raf = requestAnimationFrame(frame);
  }

  function run() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }

  function setPaused(v) {
    paused = v;
    pauseBtn.textContent = v ? '재생' : '일시정지';
    pauseBtn.setAttribute('aria-pressed', v ? 'true' : 'false');
    if (v) video.pause();
    else { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
  }

  modeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      mode = +b.getAttribute('data-mode');
      modeBtns.forEach(function (o) { o.setAttribute('aria-checked', o === b ? 'true' : 'false'); });
    });
  });
  pauseBtn.addEventListener('click', function () { setPaused(!paused); });
  soundBtn.addEventListener('click', function () {
    video.muted = !video.muted;
    soundBtn.textContent = video.muted ? '소리 켜기' : '소리 끄기';
    soundBtn.setAttribute('aria-pressed', video.muted ? 'false' : 'true');
  });

  document.addEventListener('sv:motion', function (e) { setPaused(!e.detail.on); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) { if (!paused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); } run(); }
      else video.pause();
    }, { threshold: .05 }).observe(root);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { visible = false; }
    else { visible = true; run(); }
  });

  /* 데이터 절약을 켠 사람에게는 영상을 자동으로 받지 않는다 */
  var saving = navigator.connection && navigator.connection.saveData;
  if (saving) setPaused(true);
  else {
    var first = video.play();
    if (first && first.catch) first.catch(function () {});
  }
  run();
})();
