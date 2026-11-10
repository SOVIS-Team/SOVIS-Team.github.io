/* 체험 화면. 브라우저는 다른 앱의 소리를 받을 수 없으므로, 방문자가 소리와 위치를 정하면 그 소리를 합성해 들려주고
   앱과 같은 계산으로 그린다. 2채널은 Android, 8방향은 Windows 7.1 과 같은 경로다. */
(function () {
  'use strict';
  var stage = document.querySelector('[data-stage]');
  if (!stage || !window.SV) return;

  var box = stage.querySelector('[data-area]');
  var canvas = stage.querySelector('canvas');
  var kindEl = stage.querySelector('[data-now-kind]');
  var dirEl = stage.querySelector('[data-now-dir]');
  var dotEl = stage.querySelector('[data-now-dot]');
  var marker = stage.querySelector('[data-marker]');

  var NAMES = { ambient: '환경음', speech: '사람 소리', danger: '위협음' };
  var DIRS = ['위', '오른쪽 위', '오른쪽', '오른쪽 아래', '아래', '왼쪽 아래', '왼쪽', '왼쪽 위'];
  var ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

  function pulses(times, k) {
    return function (t) {
      var v = 0;
      for (var i = 0; i < times.length; i++) { var x = t - times[i]; if (x >= 0) v = Math.max(v, Math.exp(-x * k)); }
      return v;
    };
  }
  function voiceEnv(len, rate) {
    return function (t) {
      var w = Math.min(1, t * 9) * Math.min(1, (len - t) * 3.6);
      return Math.max(0, w * (.5 + .42 * Math.sin(t * rate) * Math.sin(t * 3.1)));
    };
  }
  var SOUNDS = {
    brook: { nm: '시냇물', kind: 'ambient', dur: 2, env: function (t) { return Math.min(1, t * 4) * Math.min(1, (2 - t) * 3) * (.5 + .05 * Math.sin(t * 15)); } },
    step: { nm: '발소리', kind: 'ambient', dur: 1.5, env: pulses([0, .32, .64, .96], 5.5) },
    talk: { nm: '말소리', kind: 'speech', dur: 1.8, env: voiceEnv(1.8, 11.3) },
    call: { nm: '부르는 소리', kind: 'speech', dur: 1.1, env: voiceEnv(1.1, 8) },
    siren: { nm: '사이렌', kind: 'danger', dur: 2.4, env: function (t) { return Math.min(1, t * 5) * Math.min(1, (2.4 - t) * 4) * (.74 + .14 * Math.sin(t * 5)); } },
    horn: { nm: '경적', kind: 'danger', dur: 1, env: function (t) { return Math.min(1, t * 20) * Math.min(1, (1 - t) * 8) * .9; } }
  };

  var engine = SV.createEngine({ size: 50 });
  var opts = { mode: 0, opacity: 50, multi: stage.getAttribute('data-out') === '8', sound: stage.getAttribute('data-preview') || 'siren', angle: 90, muted: false };
  var live = [], shown = null, shownAt = 0, held = null, last = 0, rid = 0, visible = true;

  /* 합성음 */
  var ac = null, master = null, noiseBuf = null;
  function audio() {
    if (opts.muted) return null;
    if (!ac) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = .45;
      master.connect(ac.destination);
      var n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      noiseBuf = b;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function route(node, angle) {
    var r = angle * Math.PI / 180;
    var lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200 + 15000 * (Math.cos(r) * .5 + .5);
    node.connect(lp);
    if (ac.createStereoPanner) {
      var p = ac.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, Math.sin(r)));
      lp.connect(p);
      p.connect(master);
    } else lp.connect(master);
  }
  function envGain(pts) {
    var g = ac.createGain(), t = ac.currentTime;
    g.gain.setValueAtTime(pts[0][1], t);
    for (var i = 1; i < pts.length; i++) g.gain.exponentialRampToValueAtTime(Math.max(.0001, pts[i][1]), t + pts[i][0]);
    return g;
  }
  function noise(dur) {
    var s = ac.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    s.start();
    s.stop(ac.currentTime + dur);
    return s;
  }
  function tone(type, freq, dur) {
    var o = ac.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.start();
    o.stop(ac.currentTime + dur);
    return o;
  }
  function play(id, angle) {
    if (!audio()) return;
    var t = ac.currentTime, g, s, f;
    if (id === 'brook') {
      s = noise(2);
      f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3400; f.Q.value = .5;
      g = envGain([[0, .0001], [.3, .16], [1.6, .15], [2, .0001]]);
      s.connect(f); f.connect(g); route(g, angle);
    } else if (id === 'step') {
      [0, .32, .64, .96].forEach(function (off) {
        var o = ac.createOscillator();
        o.frequency.setValueAtTime(92, t + off);
        o.frequency.exponentialRampToValueAtTime(46, t + off + .13);
        var gg = ac.createGain();
        gg.gain.setValueAtTime(.0001, t + off);
        gg.gain.exponentialRampToValueAtTime(.5, t + off + .012);
        gg.gain.exponentialRampToValueAtTime(.0001, t + off + .18);
        o.connect(gg); route(gg, angle);
        o.start(t + off); o.stop(t + off + .21);
      });
    } else if (id === 'talk' || id === 'call') {
      var call = id === 'call', dur = call ? 1 : 1.8, step = call ? .16 : .088;
      s = tone('sawtooth', call ? 240 : 186, dur + .05);
      if (call) s.frequency.setValueAtTime(320, t + .5);
      var lfo = tone('sine', 5.6, dur), lg = ac.createGain();
      lg.gain.value = 18; lfo.connect(lg); lg.connect(s.frequency);
      f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1900; f.Q.value = .8;
      g = ac.createGain(); g.gain.value = 0;
      for (var i = 0, n = Math.round(dur / step); i < n; i++) g.gain.setValueAtTime(i % 5 === 4 ? .025 : .18 + .07 * Math.sin(i * 1.7), t + i * step);
      g.gain.setValueAtTime(.0001, t + dur);
      s.connect(f); f.connect(g); route(g, angle);
    } else if (id === 'siren') {
      s = tone('triangle', 900, 2.4);
      var sw = tone('sine', .85, 2.4), sg = ac.createGain();
      sg.gain.value = 300; sw.connect(sg); sg.connect(s.frequency);
      g = envGain([[0, .0001], [.15, .3], [2.1, .28], [2.4, .0001]]);
      s.connect(g); route(g, angle);
    } else if (id === 'horn') {
      g = envGain([[0, .0001], [.03, .2], [.85, .2], [1, .0001]]);
      f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
      [392, 494].forEach(function (hz) { tone('sawtooth', hz, 1.02).connect(f); });
      f.connect(g); route(g, angle);
    }
  }

  function fire(id, angle) {
    /* 새 소리가 앞선 소리를 대신한다. 소리를 고를 때마다 표시가 바로 따라와야 한다. */
    live.length = 0;
    live.push({ id: id, def: SOUNDS[id], t0: performance.now() / 1000, angle: angle });
    play(id, angle);
    kick();
  }

  function dirName(a) { return DIRS[Math.round((((a % 360) + 360) % 360) / 45) % 8]; }
  function chGain(ch, src) {
    var c = Math.cos((ch - src) * Math.PI / 180);
    return c <= 0 ? 0 : Math.pow(c, 1.6);
  }
  function showMarker(a) {
    if (!marker) return;
    var r = (a - 90) * Math.PI / 180, b = box.getBoundingClientRect();
    var rx = b.width / 2 - 14, ry = b.height / 2 - 14;
    var m = Math.max(Math.abs(Math.cos(r)) / rx, Math.abs(Math.sin(r)) / ry);
    marker.style.transform = 'translate(' + (Math.cos(r) / m) + 'px,' + (Math.sin(r) / m) + 'px)';
  }

  function frame(now) {
    rid = 0;
    if (!visible) return;
    var sec = now / 1000, dt = Math.min(60, now - (last || now));
    last = now;
    var best = null, bestAmp = 0, L = 0, R = 0, ch = [0, 0, 0, 0, 0, 0, 0, 0];
    function mix(amp, angle, def) {
      if (amp > bestAmp) { bestAmp = amp; best = { def: def, angle: angle }; }
      if (opts.multi) {
        for (var i = 0; i < 8; i++) ch[i] = Math.max(ch[i], amp * chGain(ANGLES[i], angle));
      } else {
        var p = Math.sin(angle * Math.PI / 180);
        L = Math.max(L, amp * Math.sqrt((1 - p) / 2));
        R = Math.max(R, amp * Math.sqrt((1 + p) / 2));
      }
    }
    for (var i = live.length - 1; i >= 0; i--) {
      var e = live[i], t = sec - e.t0;
      if (t > e.def.dur) { live.splice(i, 1); continue; }
      if (t >= 0) mix(e.def.env(t), held && held.ev === e ? held.angle : e.angle, e.def);
    }
    if (held) mix(.75, held.angle, SOUNDS[held.ev.id]);
    if (opts.multi) engine.channels = ch; else { engine.channels = null; engine.feed(L, R); }
    var s = SV.fit(canvas);
    s.ctx.clearRect(0, 0, s.w, s.h);
    engine.step(dt, s.w, s.h);
    if (best) { shown = best; shownAt = sec; }
    else if (sec - shownAt > .8) shown = null;
    engine.draw(s.ctx, s.w, s.h, opts.mode, shown ? shown.def.kind : 'ambient', opts.opacity);
    if (shown) {
      kindEl.textContent = NAMES[shown.def.kind] + ', ' + shown.def.nm;
      if (dirEl) dirEl.textContent = dirName(shown.angle);
      stage.setAttribute('data-kind', shown.def.kind);
      showMarker(shown.angle);
      stage.classList.add('sounding');
    } else {
      kindEl.textContent = '소리 없음';
      if (dirEl) dirEl.textContent = '';
      stage.setAttribute('data-kind', 'none');
      stage.classList.remove('sounding');
    }
    if (live.length || held || engine.level() > .02 || shown) rid = requestAnimationFrame(frame);
    else { s.ctx.clearRect(0, 0, s.w, s.h); last = 0; }
  }
  function kick() { if (!rid) { last = 0; rid = requestAnimationFrame(frame); } }

  function angleAt(ev) {
    var b = box.getBoundingClientRect();
    var x = ev.clientX - b.left - b.width / 2, y = ev.clientY - b.top - b.height / 2;
    return (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
  }

  if (box.hasAttribute('data-press')) {
    box.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      box.setPointerCapture(ev.pointerId);
      opts.angle = angleAt(ev);
      fire(opts.sound, opts.angle);
      held = { ev: live[live.length - 1], angle: opts.angle };
    });
    box.addEventListener('pointermove', function (ev) { if (held) { held.angle = angleAt(ev); opts.angle = held.angle; } });
    var end = function () { held = null; };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
  }

  /* 소리 버튼: 누르면 선택되고, 마지막 위치에서 바로 난다. 키보드로도 쓸 수 있다. */
  var soundBtns = stage.querySelectorAll('[data-sound-id]');
  soundBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      opts.sound = b.getAttribute('data-sound-id');
      soundBtns.forEach(function (o) { o.setAttribute('aria-checked', o === b ? 'true' : 'false'); });
      fire(opts.sound, opts.angle);
    });
  });

  /* 방향 버튼 */
  stage.querySelectorAll('[data-angle]').forEach(function (b) {
    b.addEventListener('click', function () {
      opts.angle = +b.getAttribute('data-angle');
      stage.querySelectorAll('[data-angle]').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      fire(opts.sound, opts.angle);
    });
  });

  var modeGroup = stage.querySelector('[data-stage-mode]');
  if (modeGroup) modeGroup.addEventListener('pick', function (e) { opts.mode = +e.detail.value; if (!live.length) fire(opts.sound, opts.angle); });
  var outGroup = stage.querySelector('[data-stage-out]');
  if (outGroup) outGroup.addEventListener('pick', function (e) { opts.multi = e.detail.value === '8'; fire(opts.sound, opts.angle); });

  stage.querySelectorAll('input[data-set]').forEach(function (input) {
    var out = input.parentNode.querySelector('output');
    var key = input.getAttribute('data-set');
    var apply = function () {
      var v = +input.value;
      if (out) out.textContent = v;
      input.style.setProperty('--at', ((v - input.min) / (input.max - input.min) * 100) + '%');
      if (key === 'size') engine.setSize(v);
      if (key === 'opacity') opts.opacity = v;
      if (key === 'sensitivity') engine.setSensitivity(v);
    };
    input.addEventListener('input', apply);
    apply();
  });

  var muteBtn = stage.querySelector('[data-mute]');
  if (muteBtn) {
    muteBtn.addEventListener('click', function () {
      opts.muted = !opts.muted;
      muteBtn.textContent = opts.muted ? '소리 켜기' : '소리 끄기';
      muteBtn.setAttribute('aria-pressed', opts.muted ? 'true' : 'false');
    });
  }

  /* 자동 시연 */
  var autoBtn = stage.querySelector('[data-auto]');
  if (autoBtn) {
    var SHOW = [['step', 270, 0], ['talk', 45, 1900], ['siren', 90, 4000], ['horn', 315, 6800], ['brook', 180, 8100]];
    var timers = [];
    var stopAuto = function () {
      timers.forEach(clearTimeout);
      timers = [];
      autoBtn.textContent = '자동 시연';
      autoBtn.setAttribute('aria-pressed', 'false');
    };
    autoBtn.addEventListener('click', function () {
      if (timers.length) { stopAuto(); return; }
      autoBtn.textContent = '시연 멈추기';
      autoBtn.setAttribute('aria-pressed', 'true');
      SHOW.forEach(function (s) {
        timers.push(setTimeout(function () { opts.angle = s[1]; fire(s[0], s[1]); }, s[2]));
      });
      timers.push(setTimeout(stopAuto, 10400));
    });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(stage);
  }

  /* 처음 온 사람도 무엇을 하면 되는지 보이도록 소리 없이 한 번 그려 둔다 */
  var hint = stage.getAttribute('data-preview');
  function preview() {
    var saved = opts.muted;
    opts.muted = true;
    fire(hint, opts.angle);
    opts.muted = saved;
  }
  if (hint && 'IntersectionObserver' in window) {
    var once = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { once.disconnect(); preview(); }
    }, { threshold: .4 });
    once.observe(box);
  } else if (hint) preview();
})();
