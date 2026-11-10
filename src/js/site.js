/* 모든 페이지에 공통으로 쓰는 동작: 메뉴, 나타나기, 영상 재생, 앱 조각, 자주 묻는 질문, 소식 거르기 */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  html.classList.add('js');

  function all(sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); }
  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
  }

  /* 메뉴 */
  var menuBtn = doc.querySelector('[data-menu]');
  var nav = doc.getElementById('nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.textContent = open ? '닫기' : '메뉴';
    });
  }

  /* 나타나기: 구역마다 읽는 순서대로 */
  var risers = all('.rise');
  if ('IntersectionObserver' in window && risers.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: matchMedia('(prefers-reduced-motion: reduce)').matches ? '0px' : '0px 0px -8% 0px' });
    risers.forEach(function (el) { io.observe(el); });
  } else risers.forEach(function (el) { el.classList.add('in'); });

  /* 영상: 보일 때만 재생한다. 사용자가 움직임을 꺼 두면 표지 그림으로 멈춘다. */
  var motionOn = store('sv-motion') !== 'off';
  var loops = all('video[data-loop]');
  var seen = new Map();
  function sync(v) {
    if (motionOn && seen.get(v)) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    else v.pause();
  }
  if ('IntersectionObserver' in window && loops.length) {
    var vo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { seen.set(e.target, e.isIntersecting); sync(e.target); });
    }, { rootMargin: '120px' });
    loops.forEach(function (v) { vo.observe(v); });
  }
  var motionBtn = doc.querySelector('[data-motion]');
  function paintMotion() {
    if (motionBtn) {
      motionBtn.textContent = motionOn ? '영상 멈추기' : '영상 재생';
      motionBtn.setAttribute('aria-pressed', motionOn ? 'false' : 'true');
    }
  }
  if (motionBtn) {
    motionBtn.addEventListener('click', function () {
      motionOn = !motionOn;
      store('sv-motion', motionOn ? 'on' : 'off');
      paintMotion();
      loops.forEach(sync);
      doc.dispatchEvent(new CustomEvent('sv:motion', { detail: { on: motionOn } }));
    });
  }
  paintMotion();
  if (!motionOn) setTimeout(function () { doc.dispatchEvent(new CustomEvent('sv:motion', { detail: { on: false } })); }, 0);

  /* 앱 조각의 하나만 선택되는 버튼 묶음 */
  all('[data-pick]').forEach(function (group) {
    var items = all('button', group);
    items.forEach(function (b) {
      b.addEventListener('click', function () {
        items.forEach(function (o) { o.setAttribute('aria-checked', o === b ? 'true' : 'false'); });
        group.dispatchEvent(new CustomEvent('pick', { detail: { value: b.getAttribute('data-value') } }));
      });
    });
  });
  all('[data-switch]').forEach(function (b) {
    b.addEventListener('click', function () {
      b.setAttribute('aria-checked', b.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
    });
  });

  /* 실행 버튼 조각 */
  var runBox = doc.querySelector('[data-run]');
  if (runBox) {
    var runBtn = runBox.querySelector('button'), runState = runBox.querySelector('[data-run-state]');
    runBtn.addEventListener('click', function () {
      var on = runBox.classList.toggle('on');
      runBtn.textContent = on ? '실행 종료' : '실행';
      runState.textContent = on ? '상태: 실행 중' : '상태: 실행 대기 중';
    });
  }

  /* 작은 미리보기: 앱의 튜토리얼 그림처럼 같은 엔진으로 그린다 */
  var minis = all('canvas[data-mini]');
  if (window.SV && minis.length) {
    var items = minis.map(function (c) {
      return { c: c, e: SV.createEngine({ size: +c.getAttribute('data-size') || 50 }), mode: +c.getAttribute('data-mini'), on: false, kind: c.getAttribute('data-kind') || 'ambient' };
    });
    var mo = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
      es.forEach(function (e) { items.forEach(function (it) { if (it.c === e.target) it.on = e.isIntersecting; }); });
      kick();
    }) : null;
    items.forEach(function (it) { if (mo) mo.observe(it.c); else it.on = true; });
    var t0 = performance.now(), lastT = 0, rid = 0;
    var tick = function (now) {
      rid = 0;
      var live = items.filter(function (i) { return i.on; });
      if (!live.length) return;
      var dt = Math.min(60, now - (lastT || now));
      lastT = now;
      var t = (now - t0) / 1000;
      var swing = motionOn ? Math.sin(t * 1.1) : 0;
      var beat = motionOn ? .55 + .3 * Math.abs(Math.sin(t * 3.1)) : .7;
      live.forEach(function (it) {
        var s = SV.fit(it.c);
        it.e.feed(beat * (.65 - .35 * swing), beat * (.65 + .35 * swing));
        it.e.step(dt, s.w, s.h);
        s.ctx.clearRect(0, 0, s.w, s.h);
        it.e.draw(s.ctx, s.w, s.h, it.mode, it.kind, 85);
      });
      rid = requestAnimationFrame(tick);
    };
    var kick = function () { if (!rid) { lastT = 0; rid = requestAnimationFrame(tick); } };
    kick();
    all('[data-mini-mode]').forEach(function (g) {
      var target = items.filter(function (i) { return i.c.id === g.getAttribute('data-mini-mode'); })[0];
      if (target) g.addEventListener('pick', function (e) { target.mode = +e.detail.value; });
    });
  }

  /* 값이 방문자의 입력으로 정해지는 숫자 */
  var calc = doc.querySelector('[data-calc]');
  if (calc) {
    var range = calc.querySelector('input'), out = calc.querySelector('[data-calc-out]'), val = calc.querySelector('[data-calc-val]');
    var paint = function () {
      var min = +range.value;
      val.textContent = min + '분';
      out.textContent = (min * 60 * 4).toLocaleString('ko-KR');
      range.style.setProperty('--at', ((min - range.min) / (range.max - range.min) * 100) + '%');
    };
    range.addEventListener('input', paint);
    paint();
  }

  /* 자주 묻는 질문: 한 번에 하나의 답 */
  all('[data-faq]').forEach(function (box) {
    var qs = all('[data-q]', box), pane = box.querySelector('[data-pane]');
    var show = function (b) {
      qs.forEach(function (o) {
        var on = o === b;
        o.setAttribute('aria-expanded', on ? 'true' : 'false');
        o.closest('li').classList.toggle('on', on);
      });
      if (pane) {
        pane.classList.remove('swap');
        void pane.offsetWidth;
        pane.innerHTML = b.closest('li').querySelector('[data-a]').innerHTML;
        pane.classList.add('swap');
      }
    };
    qs.forEach(function (b) {
      b.addEventListener('click', function () { show(b); });
      b.addEventListener('mouseenter', function () { if (pane && innerWidth > 900) show(b); });
      b.addEventListener('focus', function () { if (pane && innerWidth > 900) show(b); });
    });
    if (qs[0]) show(qs[0]);
  });

  /* 패널 설명에 손을 올리면 해당 조작이 표시된다 */
  var board = doc.querySelector('[data-board]');
  if (board) {
    all('[data-note]', board).forEach(function (n) {
      var key = n.getAttribute('data-note');
      var mark = function (on) { all('[data-part="' + key + '"]', board).forEach(function (p) { p.classList.toggle('lit', on); }); };
      n.addEventListener('mouseenter', function () { mark(true); });
      n.addEventListener('mouseleave', function () { mark(false); });
      n.addEventListener('focusin', function () { mark(true); });
      n.addEventListener('focusout', function () { mark(false); });
    });
  }

  /* 소식 거르기 */
  var filter = doc.querySelector('[data-news-filter]');
  if (filter) {
    filter.addEventListener('pick', function (e) {
      all('[data-tag]').forEach(function (row) {
        row.hidden = e.detail.value !== 'all' && row.getAttribute('data-tag') !== e.detail.value;
      });
    });
  }

  /* 표현 모드 영상 넘기기 */
  all('[data-switcher]').forEach(function (box) {
    var v = box.querySelector('video'), cap = box.querySelector('[data-cap]');
    var group = box.querySelector('[data-pick]');
    group.addEventListener('pick', function (e) {
      var b = group.querySelector('[data-value="' + e.detail.value + '"]');
      v.poster = b.getAttribute('data-poster');
      v.src = b.getAttribute('data-src');
      if (cap) cap.textContent = b.getAttribute('data-text');
      if (motionOn) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
  });

  /* 메일 주소 복사 */
  var copy = doc.querySelector('[data-copy]');
  if (copy && navigator.clipboard) {
    copy.addEventListener('click', function () {
      navigator.clipboard.writeText(copy.getAttribute('data-copy')).then(function () {
        copy.textContent = '복사했습니다';
        setTimeout(function () { copy.textContent = '주소 복사'; }, 1800);
      });
    });
  }
})();
