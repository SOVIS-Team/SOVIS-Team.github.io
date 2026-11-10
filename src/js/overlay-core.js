/* 앱의 VisualizerEngine.kt 를 웹으로 옮긴 것이다. 좌우 최대 크기를 넣으면 앱과 같은 계산으로 8방향 깊이를 내고,
   같은 도형으로 캔버스에 그린다. 기본값(크기 50, 속도 20, 진하기 50, 민감도 15)도 앱과 같다.
   방향 순서: 0 위, 1 오른쪽 위, 2 오른쪽, 3 오른쪽 아래, 4 아래, 5 왼쪽 아래, 6 왼쪽, 7 왼쪽 위 */
(function () {
  'use strict';

  var COLORS = { ambient: [255, 255, 255], speech: [255, 255, 0], danger: [255, 0, 0] };
  var WAVE_N = 150;

  function edgePos(d_, w, h, P) {
    var d = ((d_ % P) + P) % P;
    if (d <= w / 2) return [w / 2 + d, 0];
    if (d <= w / 2 + h) return [w, d - w / 2];
    if (d <= w / 2 + h + w) return [w - (d - (w / 2 + h)), h];
    if (d <= w / 2 + h + w + h) return [0, h - (d - (w / 2 + h + w))];
    return [d - (w / 2 + h + w + h), 0];
  }

  function catmull(t, dp, pos) {
    t = ((t % 1) + 1) % 1;
    var n = pos.length, i1 = 0, i;
    for (i = 0; i < n; i++) if (pos[i] <= t) i1 = i;
    var i0 = (i1 - 1 + n) % n, i2 = (i1 + 1) % n, i3 = (i1 + 2) % n;
    var p1 = pos[i1], p2 = pos[i2];
    if (p2 <= p1) p2 += 1;
    var at = t;
    if (at < p1) at += 1;
    var seg = p2 - p1, lt = seg > 0 ? (at - p1) / seg : 0;
    lt = Math.max(0, Math.min(1, lt));
    var d0 = dp[i0], d1 = dp[i1], d2 = dp[i2], d3 = dp[i3];
    var a = -.5 * d0 + 1.5 * d1 - 1.5 * d2 + .5 * d3, b = d0 - 2.5 * d1 + 2 * d2 - .5 * d3, c = -.5 * d0 + .5 * d2;
    return Math.max(0, a * lt * lt * lt + b * lt * lt + c * lt + d1);
  }

  function quad(t, p0, p1, p2) {
    var u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
  }

  function roundedInner(d_, w, h, P, d, dtr, dbr, dbl, dtl) {
    var ctr = w / 2, cbr = w / 2 + h, cbl = cbr + w, ctl = cbl + h, lim = Math.min(w / 2, h / 2);
    var Rtr = Math.min(dtr * 2, lim), Rbr = Math.min(dbr * 2, lim), Rbl = Math.min(dbl * 2, lim), Rtl = Math.min(dtl * 2, lim);
    var dTL = d_ - ctl;
    if (d_ < w / 2) dTL = d_ + P - ctl;
    if (Rtr > 0 && Math.abs(d_ - ctr) <= Rtr) return quad((d_ - ctr + Rtr) / (2 * Rtr), [w - Rtr, d], [w - d, d], [w - d, Rtr]);
    if (Rbr > 0 && Math.abs(d_ - cbr) <= Rbr) return quad((d_ - cbr + Rbr) / (2 * Rbr), [w - d, h - Rbr], [w - d, h - d], [w - Rbr, h - d]);
    if (Rbl > 0 && Math.abs(d_ - cbl) <= Rbl) return quad((d_ - cbl + Rbl) / (2 * Rbl), [Rbl, h - d], [d, h - d], [d, h - Rbl]);
    if (Rtl > 0 && Math.abs(dTL) <= Rtl) return quad((dTL + Rtl) / (2 * Rtl), [d, Rtl], [d, d], [Rtl, d]);
    var e = edgePos(d_, w, h, P);
    if (d_ <= ctr || d_ > ctl) return [Math.max(d, Math.min(w - d, e[0])), d];
    if (d_ <= cbr) return [w - d, Math.max(d, Math.min(h - d, e[1]))];
    if (d_ <= cbl) return [Math.max(d, Math.min(w - d, e[0])), h - d];
    return [d, Math.max(d, Math.min(h - d, e[1]))];
  }

  function buildWavePath(ctx, w, h, bd, dp, cache) {
    var P = 2 * (w + h);
    var pos = [0, w / 2, w / 2 + h / 2, w / 2 + h, w / 2 + h + w / 2, w / 2 + h + w, w / 2 + h + w + h / 2, w / 2 + h + w + h]
      .map(function (v) { return v / P; });
    function at(t) { return Math.min(bd, Math.max(0, catmull(t, dp, pos))); }
    var dtr = at((w / 2) / P), dbr = at((w / 2 + h) / P), dbl = at((w / 2 + h + w) / P), dtl = at((w / 2 + h + w + h) / P);
    for (var i = 0; i < WAVE_N; i++) {
      var dd = (P * i) / WAVE_N;
      cache[i] = roundedInner(dd, w, h, P, at(dd / P), dtr, dbr, dbl, dtl);
    }
    ctx.moveTo(cache[0][0], cache[0][1]);
    for (var j = 0; j < WAVE_N; j++) {
      var p0 = cache[(j - 1 + WAVE_N) % WAVE_N], p1 = cache[j], p2 = cache[(j + 1) % WAVE_N], p3 = cache[(j + 2) % WAVE_N];
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    ctx.closePath();
  }

  function waveBrush(ctx, w, h, c) {
    var g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) / 2);
    g.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
    g.addColorStop(.7, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.627)');
    g.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',1)');
    return g;
  }

  function drawCircle(ctx, w, h, c, dp, sm) {
    var cx = w / 2, cy = h / 2, baseR = Math.min(w, h) * (0.05 + (40 - 10) / 90 * 0.35), vis = false, i;
    for (i = 0; i < 8; i++) {
      sm[i] += (Math.min(dp[i] * 0.35, h * 0.4) - sm[i]) * 0.25;
      if (sm[i] > 1) vis = true;
    }
    if (!vis) return;
    var N = 64;
    ctx.beginPath();
    for (i = 0; i < N; i++) {
      var ang = 2 * Math.PI * i / N, mi = (ang / (2 * Math.PI)) * 8 + 2;
      if (mi >= 8) mi -= 8;
      var i0 = Math.floor(mi) % 8, i1 = (i0 + 1) % 8, ft = (1 - Math.cos((mi - Math.floor(mi)) * Math.PI)) / 2;
      var r = baseR + (sm[i0] * (1 - ft) + sm[i1] * ft);
      var px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    for (i = 0; i < N; i++) {
      var a2 = 2 * Math.PI * (N - 1 - i) / N, qx = cx + Math.cos(a2) * baseR, qy = cy + Math.sin(a2) * baseR;
      if (i === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    ctx.fill('evenodd');
  }

  function drawPad(ctx, w, h, c, dp, sm) {
    var P = 2 * (w + h), N = 16, any = false;
    var cd = [0, w / 2, w / 2 + h / 2, w / 2 + h, w / 2 + h + w / 2, w / 2 + h + w, w / 2 + h + w + h / 2, w / 2 + h + w + h];
    ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    ctx.beginPath();
    for (var ch = 0; ch < 8; ch++) {
      sm[ch] += (Math.min(dp[ch] * 0.25, 55) - sm[ch]) * 0.3;
      if (sm[ch] < 0.5) continue;
      any = true;
      var mx = sm[ch], barLen = h / 4, start = cd[ch] - barLen / 2, outer = [], inner = [];
      for (var i = 0; i <= N; i++) {
        var dp2 = start + (barLen * i) / N, e = edgePos(dp2, w, h, P);
        outer.push(e);
        var t = i / N, th = mx * Math.pow(Math.sin(t * Math.PI), 0.6);
        var dm = ((dp2 % P) + P) % P, ix = e[0], iy = e[1];
        if (dm <= w / 2 || dm > w / 2 + h + w + h) { iy += th; ix = Math.max(th, Math.min(w - th, ix)); }
        else if (dm <= w / 2 + h) { ix -= th; iy = Math.max(th, Math.min(h - th, iy)); }
        else if (dm <= w / 2 + h + w) { iy -= th; ix = Math.max(th, Math.min(w - th, ix)); }
        else { ix += th; iy = Math.max(th, Math.min(h - th, iy)); }
        inner.push([ix, iy]);
      }
      ctx.moveTo(outer[0][0], outer[0][1]);
      for (var k = 1; k <= N; k++) ctx.lineTo(outer[k][0], outer[k][1]);
      for (var m = N; m >= 0; m--) ctx.lineTo(inner[m][0], inner[m][1]);
      ctx.closePath();
    }
    if (any) ctx.fill('evenodd');
  }

  function drawMode(ctx, w, h, mode, col, dp, bd, st) {
    var i, any = false;
    for (i = 0; i < 8; i++) if (dp[i] > 3) any = true;
    if (mode === 0) {
      if (!any) return;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      buildWavePath(ctx, w, h, bd, dp, st.pts);
      ctx.fillStyle = waveBrush(ctx, w, h, col);
      ctx.fill('evenodd');
    } else if (mode === 1) {
      drawPad(ctx, w, h, col, dp, st.pad);
    } else if (mode === 2) {
      drawCircle(ctx, w, h, col, dp, st.cir);
    } else {
      if (!any) return;
      ctx.beginPath();
      buildWavePath(ctx, w, h, bd, dp, st.pts);
      ctx.strokeStyle = waveBrush(ctx, w, h, col);
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  /* 앱의 upmix(): 두 채널을 8방향으로 펼친다. rear 값은 공간 리플 효과를 위해 네 틱 전의 값이다. */
  function upmix(t, fl, fr, rearL, rearR) {
    var mid = Math.min(fl, fr), sideL = Math.max(0, fl - fr), sideR = Math.max(0, fr - fl);
    var rearMid = Math.min(rearL, rearR);
    t[0] = mid * 1.2;
    t[1] = fr * .9;
    t[7] = fl * .9;
    t[2] = sideR * 1.5;
    t[6] = sideL * 1.5;
    t[3] = Math.max(0, rearR - rearL) * 1.2;
    t[4] = rearMid * .8;
    t[5] = Math.max(0, rearL - rearR) * 1.2;
  }

  function createEngine(opt) {
    opt = opt || {};
    var size = opt.size === undefined ? 50 : opt.size;
    var speed = opt.speed === undefined ? 20 : opt.speed;
    var sensitivity = opt.sensitivity === undefined ? 15 : opt.sensitivity;
    var tL = 0, tR = 0, pL = 0, pR = 0, fresh = false, smoothTotal = 0;
    var ring = [], ringAt = 0, t = new Float64Array(8), dist = new Float64Array(8), depth = new Float64Array(8);
    var st = { pts: new Array(WAVE_N), pad: new Float64Array(8), cir: new Float64Array(8) };
    for (var i = 0; i < 5; i++) ring.push([0, 0]);
    for (i = 0; i < 8; i++) dist[i] = .125;
    var tickAcc = 0;

    return {
      /* 소리 버퍼 하나가 들어온 것과 같다 */
      feed: function (l, r) { pL = l; pR = r; fresh = true; },
      setSize: function (v) { size = v; },
      setSensitivity: function (v) { sensitivity = v; },
      /* 8방향 값을 넣으면 upmix 대신 그 값을 쓴다. Windows 의 7.1 채널 경로와 같다. */
      channels: null,
      step: function (dtMs, w, h) {
        var k = Math.min(3, dtMs / 16.667), j;
        var decay = Math.pow(.87, k);
        if (fresh) { tL = pL; tR = pR; fresh = false; }
        else { tL = Math.max(tL * decay, 0); tR = Math.max(tR * decay, 0); }
        tickAcc += k;
        while (tickAcc >= 1) {
          tickAcc -= 1;
          ring[ringAt] = [tL, tR];
          ringAt = (ringAt + 1) % 5;
        }
        var old = ring[ringAt];
        if (this.channels) { for (j = 0; j < 8; j++) t[j] = this.channels[j]; }
        else upmix(t, tL, tR, old[0], old[1]);
        var total = 0;
        for (j = 0; j < 8; j++) total += t[j];
        var sfT = Math.min(1, Math.max(.1, sensitivity * .25) / 100 * k);
        smoothTotal += (total - smoothTotal) * sfT;
        var sfP = Math.min(1, Math.max(.1, speed) / 100 * k);
        if (total > .0001) for (j = 0; j < 8; j++) dist[j] += (t[j] / total - dist[j]) * sfP;
        var maxBase = Math.min(w, h) / 2 - 10, base = maxBase * size / 100;
        for (j = 0; j < 8; j++) depth[j] = Math.min(base, base * smoothTotal * dist[j]);
        this.base = base;
      },
      draw: function (ctx, w, h, mode, kind, opacity) {
        ctx.save();
        ctx.globalAlpha = (opacity === undefined ? 50 : opacity) / 100;
        drawMode(ctx, w, h, mode, COLORS[kind] || COLORS.ambient, depth, this.base, st);
        ctx.restore();
      },
      /* 지금 소리가 어느 쪽으로 치우쳤는지 (-1 왼쪽 … 1 오른쪽) */
      pan: function () {
        var l = dist[5] + dist[6] + dist[7], r = dist[1] + dist[2] + dist[3], s = l + r;
        return s > 0 ? (r - l) / s : 0;
      },
      level: function () { return smoothTotal; }
    };
  }

  /* 캔버스 크기를 부모에 맞춘다. 레티나에서도 부담이 적게 1.5배까지만 쓴다. */
  function fit(canvas) {
    var box = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.max(1, Math.round(box.width)), h = Math.max(1, Math.round(box.height));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  window.SV = { createEngine: createEngine, fit: fit, COLORS: COLORS };
})();
