/* =========================================================
   PASSPORT — interactions
   - 3D book with scroll-driven page turns (paper curl via nested strips)
   - visa stamps drawn on canvas, slammed in when a page settles
   - KOR / ENG / 中 switch (translations from the live site)
   - globe (Three.js, lazy) or flat map in the light version
   - boarding pass: tear the stub to copy the email
   ========================================================= */
(function(){
  'use strict';
  var html = document.documentElement;
  var FULL = html.classList.contains('full');
  var REDUCE = html.classList.contains('reduce');
  var FORCED = /[?&]mode=/.test(location.search);
  var $ = function(s, c){ return (c || document).querySelector(s); };
  var $$ = function(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function(v, a, b){ return v < a ? a : v > b ? b : v; };
  var lerp = function(a, b, t){ return a + (b - a) * t; };
  var smooth = function(t){ return t * t * (3 - 2 * t); };
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var inSection = 'passport';

  /* ---------------- i18n ---------------- */
  var LANG_ATTR = {ko:'ko', en:'en', zh:'zh-Hans'};
  var D = window.PP_DICT || {ko:{}, en:{}, zh:{}};
  D.ko = D.ko || {}; D.en = D.en || {}; D.zh = D.zh || {};
  var EXTRA = {
    en: {'ui.scroll':'Scroll to turn the pages', 'ui.tear':'Tear off to copy the email', 'city.sel':'Seoul', 'city.szv':'Suzhou', 'city.sin':'Singapore'},
    zh: {'ui.scroll':'向下滚动，翻开护照', 'ui.tear':'撕下票根即可复制邮箱', 'city.sel':'首尔', 'city.szv':'苏州', 'city.sin':'新加坡'}
  };
  Object.keys(EXTRA).forEach(function(l){ Object.keys(EXTRA[l]).forEach(function(k){ D[l][k] = EXTRA[l][k]; }); });
  $$('[data-i18n]').forEach(function(el){
    var k = el.getAttribute('data-i18n');
    if (!(k in D.ko)) D.ko[k] = el.innerHTML.replace(/\s+/g, ' ').trim();
  });
  if (!D.ko['ui.copied']) D.ko['ui.copied'] = '복사됨';

  var cur = 'ko', langGroup = $('.langs'), langBtns = $$('.langs button');
  var onLang = [];
  function setLang(l){
    if (!D[l]) l = 'ko';
    cur = l;
    html.lang = LANG_ATTR[l];
    langGroup.setAttribute('data-active', l);
    langBtns.forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === l)); });
    $$('[data-i18n]').forEach(function(el){
      var h = D[l][el.getAttribute('data-i18n')];
      if (h != null && el.innerHTML !== h) el.innerHTML = h;
    });
    onLang.forEach(function(fn){ fn(l); });
  }
  langBtns.forEach(function(b){
    b.addEventListener('click', function(){
      var l = b.getAttribute('data-lang');
      if (l === cur) return;
      setLang(l);
      try { localStorage.setItem('jin-lang', l); } catch(e){}
      try {
        var u = new URL(location.href);
        if (l === 'ko') u.searchParams.delete('lang'); else u.searchParams.set('lang', l);
        history.replaceState(null, '', u);
      } catch(e){}
    });
  });
  function initialLang(){
    try { var q = new URLSearchParams(location.search).get('lang'); if (q && D[q]) return q; } catch(e){}
    try { var s = localStorage.getItem('jin-lang'); if (s && D[s]) return s; } catch(e){}
    var n = (navigator.language || 'ko').toLowerCase();
    if (n.indexOf('ko') === 0) return 'ko';
    if (n.indexOf('zh') === 0) return 'zh';
    return 'en';
  }

  /* ---------------- toast + copy ---------------- */
  var toastEl = $('#toast'), toastT = 0;
  function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function(){ toastEl.classList.remove('show'); }, 2200);
  }
  function copyText(val){
    return new Promise(function(res){
      function fallback(){
        try {
          var ta = document.createElement('textarea');
          ta.value = val; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          var ok = document.execCommand('copy'); document.body.removeChild(ta); res(ok);
        } catch(e){ res(false); }
      }
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext){
        navigator.clipboard.writeText(val).then(function(){ res(true); }, fallback);
      } else fallback();
    });
  }
  $$('.copy').forEach(function(btn){
    btn.addEventListener('click', function(){
      var val = btn.getAttribute('data-copy');
      copyText(val).then(function(){
        btn.classList.add('done');
        btn.textContent = D[cur]['ui.copied'];
        clearTimeout(btn._t);
        btn._t = setTimeout(function(){ btn.classList.remove('done'); btn.innerHTML = D[cur]['ui.copy']; }, 1600);
        toast(D[cur]['ui.copied'] + ' — ' + val);
      });
    });
  });

  /* ---------------- sound (off by default, synthesized) ---------------- */
  var soundBtn = $('#soundBtn'), soundOn = false, actx = null, master = null, noiseBuf = null;
  function audio(){
    if (actx) return actx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
    master = actx.createGain(); master.gain.value = 0.55; master.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return actx;
  }
  function thump(){
    if (!soundOn || !audio()) return;
    var t = actx.currentTime;
    var o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.95, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.3);
    var n = actx.createBufferSource(), f = actx.createBiquadFilter(), ng = actx.createGain();
    n.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = 1700;
    ng.gain.setValueAtTime(0.6, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    n.connect(f); f.connect(ng); ng.connect(master); n.start(t); n.stop(t + 0.1);
  }
  function swish(){
    if (!soundOn || !audio()) return;
    var t = actx.currentTime;
    var n = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    n.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + 0.3);
  }
  function rip(){
    if (!soundOn || !audio()) return;
    var t = actx.currentTime;
    for (var i = 0; i < 7; i++){
      var n = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(), s = t + i * 0.022 + Math.random() * 0.01;
      n.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 2200 + Math.random() * 1500;
      g.gain.setValueAtTime(0.25, s); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.03);
      n.connect(f); f.connect(g); g.connect(master); n.start(s, Math.random() * 0.3); n.stop(s + 0.04);
    }
  }
  soundBtn.addEventListener('click', function(){
    soundOn = !soundOn;
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    if (soundOn && audio()){ if (actx.state === 'suspended') actx.resume(); thump(); }
  });

  /* ---------------- view toggle (3D / list) ---------------- */
  $('#viewBtn').addEventListener('click', function(){
    var next = FULL ? 'list' : '3d';
    try { localStorage.setItem('pp-mode', next); } catch(e){}
    var u = new URL(location.href);
    u.searchParams.set('mode', next);
    u.hash = '';
    location.href = u.toString();
  });

  /* ---------------- guilloche background ---------------- */
  (function(){
    var W = 240, H = 120, p = '', q = '';
    for (var k = 0; k < 7; k++){
      var d = '', e = '';
      for (var x = 0; x <= W; x += 4){
        var a = x / W * Math.PI * 2;
        var y = H / 2 + Math.sin(a * 2 + k * 0.9) * (16 + k * 3) + Math.sin(a * 3 + k) * 6;
        var z = H / 2 + Math.cos(a * 2 + k * 0.7) * (22 + k * 2) - Math.sin(a + k) * 4;
        d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1);
        e += (x ? 'L' : 'M') + x + ' ' + z.toFixed(1);
      }
      p += '<path d="' + d + '"/>'; q += '<path d="' + e + '"/>';
    }
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H + "'>" +
      "<g fill='none' stroke='rgb(60,110,90)' stroke-opacity='.11' stroke-width='.7'>" + p + "</g>" +
      "<g fill='none' stroke='rgb(190,70,60)' stroke-opacity='.07' stroke-width='.6'>" + q + "</g></svg>";
    html.style.setProperty('--guilloche', 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")');
  })();

  /* ---------------- stamps (canvas → blob image) ---------------- */
  var FONT_MONO = '"Geist Mono", ui-monospace, "Noto Sans KR", monospace';
  var FONT_SANS = '"Geist", "Noto Sans KR", "Noto Sans SC", sans-serif';
  var FONT_SERIF = '"Noto Serif KR", "Noto Serif SC", serif';
  function fitFont(ctx, text, weight, size, family, maxW){
    var s = size;
    do { ctx.font = weight + ' ' + s + 'px ' + family; s -= 0.5; } while (ctx.measureText(text).width > maxW && s > 7);
  }
  function spaced(ctx, text, x, y, sp, align){
    // draw text with letter spacing; align: 'center' | 'left'
    var w = 0, i, cw = [];
    for (i = 0; i < text.length; i++){ cw[i] = ctx.measureText(text[i]).width; w += cw[i] + (i < text.length - 1 ? sp : 0); }
    var cx = align === 'center' ? x - w / 2 : x;
    ctx.textAlign = 'left';
    for (i = 0; i < text.length; i++){ ctx.fillText(text[i], cx, y); cx += cw[i] + sp; }
    return w;
  }
  function arcText(ctx, text, cx, cy, r, mid, top, sp){
    // characters along a circle, centred at angle `mid` (radians); top=true reads clockwise on the outside
    var widths = [], total = 0, i;
    for (i = 0; i < text.length; i++){ widths[i] = ctx.measureText(text[i]).width + sp; total += widths[i]; }
    total -= sp;
    var ang = mid + (top ? -1 : 1) * total / r / 2;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (i = 0; i < text.length; i++){
      var a = ang + (top ? 1 : -1) * (widths[i] - sp) / r / 2;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.rotate(a + (top ? Math.PI / 2 : -Math.PI / 2));
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
      ang += (top ? 1 : -1) * widths[i] / r;
    }
    ctx.textBaseline = 'alphabetic';
  }
  function star(ctx, x, y, r){
    ctx.beginPath();
    for (var i = 0; i < 10; i++){
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }
  function plane(ctx, x, y, s, rot){
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s / 24, s / 24);
    ctx.beginPath();
    ctx.moveTo(0, -11); ctx.quadraticCurveTo(1.8, -11, 1.8, -7); ctx.lineTo(1.8, -2.5); ctx.lineTo(11, 3); ctx.lineTo(11, 5.2);
    ctx.lineTo(1.8, 2.4); ctx.lineTo(1.6, 8); ctx.lineTo(4.4, 10.2); ctx.lineTo(4.4, 11.8); ctx.lineTo(0, 10.6);
    ctx.lineTo(-4.4, 11.8); ctx.lineTo(-4.4, 10.2); ctx.lineTo(-1.6, 8); ctx.lineTo(-1.8, 2.4); ctx.lineTo(-11, 5.2);
    ctx.lineTo(-11, 3); ctx.lineTo(-1.8, -2.5); ctx.lineTo(-1.8, -7); ctx.quadraticCurveTo(-1.8, -11, 0, -11); ctx.fill();
    ctx.restore();
  }
  function poly(ctx, cx, cy, r, n, rot){
    ctx.beginPath();
    for (var i = 0; i < n; i++){
      var a = rot + i * Math.PI * 2 / n;
      ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  function rrect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function rng(seed){ return function(){ seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function drawStamp(d){
    var dims = {circle:[300,300], rect:[360,228], oval:[360,240], oct:[300,300], hex:[300,300]}[d.shape] || [300,300];
    var W = dims[0], H = dims[1], SC = 2;
    var c = document.createElement('canvas'); c.width = W * SC; c.height = H * SC;
    var x = c.getContext('2d'); x.scale(SC, SC);
    var ink = d.ink, R = rng(parseInt(d.no, 10) * 977 + 13);
    x.fillStyle = x.strokeStyle = ink; x.lineJoin = 'round'; x.lineCap = 'round';
    x.shadowColor = ink; x.shadowBlur = 0.8;
    var place = d.place.toUpperCase();

    if (d.shape === 'circle'){
      var cx = 150, cy = 150;
      x.lineWidth = 7; x.beginPath(); x.arc(cx, cy, 140, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, 127, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 2.5; x.beginPath(); x.arc(cx, cy, 86, 0, Math.PI * 2); x.stroke();
      var fs = 19; x.font = '700 ' + fs + 'px ' + FONT_MONO;
      while (x.measureText(place).width + place.length * 2.5 > 105 * Math.PI * 1.1 && fs > 11){ fs -= 1; x.font = '700 ' + fs + 'px ' + FONT_MONO; }
      arcText(x, place, cx, cy, 106, -Math.PI / 2, true, 2.5);
      x.font = '600 14px ' + FONT_SANS;
      arcText(x, 'ADMITTED · 입국 · 入境', cx, cy, 106, Math.PI / 2, false, 1.6);
      star(x, cx - 106, cy, 7); star(x, cx + 106, cy, 7);
      x.textAlign = 'center';
      x.font = '900 32px ' + FONT_SERIF; x.fillText(d.glyph, cx, 114);
      x.font = '700 44px ' + FONT_SANS; spaced(x, d.code, cx, 160, 4, 'center');
      x.lineWidth = 1.6; x.beginPath(); x.moveTo(84, 172); x.lineTo(216, 172); x.moveTo(84, 199); x.lineTo(216, 199); x.stroke();
      fitFont(x, d.date, '700', 16, FONT_MONO, 124); x.textAlign = 'center'; x.fillText(d.date, cx, 191);
      x.font = '600 11px ' + FONT_MONO; x.fillText(d.mode, cx, 218);
    }
    else if (d.shape === 'rect'){
      x.lineWidth = 7; rrect(x, 6, 6, 348, 216, 18); x.stroke();
      x.lineWidth = 2; rrect(x, 18, 18, 324, 192, 10); x.stroke();
      x.font = '600 13px ' + FONT_SANS; x.textAlign = 'left'; x.fillText('ARRIVAL · 입국 · 入境', 32, 44);
      x.font = '700 13px ' + FONT_MONO; x.textAlign = 'right'; x.fillText('Nº ' + d.no, 328, 44);
      x.lineWidth = 1.6; x.beginPath(); x.moveTo(30, 56); x.lineTo(330, 56); x.stroke();
      x.textAlign = 'center';
      x.font = '900 60px ' + FONT_SERIF; x.fillText(d.glyph, 76, 128);
      x.font = '700 28px ' + FONT_SANS; spaced(x, d.code, 76, 178, 3, 'center');
      x.beginPath(); x.moveTo(128, 70); x.lineTo(128, 196); x.stroke();
      x.textAlign = 'left';
      fitFont(x, d.date, '700', 23, FONT_MONO, 188); x.fillText(d.date, 142, 100);
      var words = place.split(' '), line = '', lines = [];
      x.font = '700 14px ' + FONT_MONO;
      words.forEach(function(w){ var t = line ? line + ' ' + w : w; if (x.measureText(t).width > 186 && line){ lines.push(line); line = w; } else line = t; });
      lines.push(line);
      lines.slice(0, 2).forEach(function(l, i){ x.fillText(l, 142, 130 + i * 19); });
      x.font = '600 15px ' + FONT_SANS; x.fillText(d.mode, 142, 188);
      plane(x, 318, 186, 22, Math.PI / 2);
    }
    else if (d.shape === 'oval'){
      x.lineWidth = 6; x.beginPath(); x.ellipse(180, 120, 172, 112, 0, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 2; x.beginPath(); x.ellipse(180, 120, 157, 97, 0, 0, Math.PI * 2); x.stroke();
      x.textAlign = 'center';
      x.font = '600 13px ' + FONT_SANS; x.fillText('IMMIGRATION · 입국 · 入境', 180, 54);
      x.font = '900 40px ' + FONT_SERIF; x.fillText(d.glyph, 104, 124);
      x.font = '700 50px ' + FONT_SANS; spaced(x, d.code, 196, 126, 5, 'center');
      plane(x, 276, 108, 24, Math.PI / 2);
      x.lineWidth = 1.6; x.beginPath(); x.moveTo(62, 142); x.lineTo(298, 142); x.moveTo(62, 172); x.lineTo(298, 172); x.stroke();
      fitFont(x, d.date, '700', 19, FONT_MONO, 220); x.fillText(d.date, 180, 164);
      fitFont(x, place, '700', 13, FONT_MONO, 210); x.fillText(place, 180, 196);
      x.font = '600 10px ' + FONT_MONO; x.fillText(d.mode, 180, 214);
    }
    else { // oct / hex
      var n = d.shape === 'oct' ? 8 : 6, rot = d.shape === 'oct' ? Math.PI / 8 : 0;
      x.lineWidth = 7; poly(x, 150, 150, 142, n, rot); x.stroke();
      x.lineWidth = 2; poly(x, 150, 150, 127, n, rot); x.stroke();
      x.textAlign = 'center';
      x.font = '600 12px ' + FONT_SANS; x.fillText('ADMITTED · 입국 · 入境', 150, 70);
      x.font = '900 46px ' + FONT_SERIF; x.fillText(d.glyph, 150, 120);
      x.font = '700 38px ' + FONT_SANS; spaced(x, d.code, 150, 164, 4, 'center');
      x.lineWidth = 1.6; x.beginPath(); x.moveTo(56, 178); x.lineTo(244, 178); x.moveTo(56, 206); x.lineTo(244, 206); x.stroke();
      fitFont(x, d.date, '700', 17, FONT_MONO, 180); x.fillText(d.date, 150, 198);
      fitFont(x, place, '700', 12, FONT_MONO, 150); x.fillText(place, 150, 228);
      star(x, 100, 228 - 4, 4); star(x, 200, 228 - 4, 4);
      x.font = '600 10px ' + FONT_MONO; x.fillText(d.mode, 150, 246);
    }

    // ink texture: speckles, uneven pressure, a couple of dry streaks
    x.shadowBlur = 0;
    x.globalCompositeOperation = 'destination-out';
    var i;
    for (i = 0; i < 1500; i++){
      var r = Math.pow(R(), 3) * 2.4 + 0.3;
      x.fillStyle = 'rgba(0,0,0,' + (0.12 + R() * 0.6).toFixed(2) + ')';
      x.beginPath(); x.arc(R() * W, R() * H, r, 0, Math.PI * 2); x.fill();
    }
    var ang = R() * Math.PI * 2, gx = W / 2 + Math.cos(ang) * W * 0.55, gy = H / 2 + Math.sin(ang) * H * 0.55;
    var g = x.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,.62)'); g.addColorStop(0.55, 'rgba(0,0,0,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.lineWidth = 1.2;
    for (i = 0; i < 5; i++){
      x.strokeStyle = 'rgba(0,0,0,' + (0.2 + R() * 0.3).toFixed(2) + ')';
      var sy = R() * H;
      x.beginPath(); x.moveTo(-10, sy); x.bezierCurveTo(W * 0.3, sy + R() * 20 - 10, W * 0.6, sy + R() * 20 - 10, W + 10, sy + R() * 30 - 15); x.stroke();
    }
    x.globalCompositeOperation = 'source-over';
    return c;
  }
  var stamps = $$('.stamp');
  function renderStamps(){
    stamps.forEach(function(st){
      var d = st.dataset;
      st.style.setProperty('--rot', (d.rot || 0) + 'deg');
      st.style.setProperty('--sx', (d.x || 55) + '%');
      st.style.setProperty('--sy', (d.y || 52) + '%');
      var img = new Image();
      img.alt = 'Visa stamp — ' + d.place + ' · ' + d.date;
      img.decoding = 'async';
      var c = drawStamp(d);
      var sh = document.createElement('span'); sh.className = 'st-shadow';
      st.appendChild(sh);
      st.appendChild(img);
      if (c.toBlob) c.toBlob(function(b){ img.src = URL.createObjectURL(b); }, 'image/png');
      else img.src = c.toDataURL('image/png');
    });
  }
  stamps.forEach(function(st){ if (!REDUCE) st.classList.add('pending'); });
  var fontsReady = (document.fonts && document.fonts.load) ? Promise.race([
    Promise.all([
      document.fonts.load('700 20px "Geist Mono"'),
      document.fonts.load('600 20px "Geist"'),
      document.fonts.load('700 20px "Geist"'),
      document.fonts.load('900 40px "Noto Serif KR"', '演仲海酒齒金醫軍'),
      document.fonts.load('600 14px "Noto Sans KR"', '입국'),
      document.fonts.load('600 14px "Noto Sans SC"', '入境')
    ]),
    new Promise(function(r){ setTimeout(r, 2500); })
  ]).catch(function(){}) : Promise.resolve();
  fontsReady.then(renderStamps);

  /* stamp slam */
  function slam(st, opts){
    opts = opts || {};
    if (!st || st.dataset.stamped) return;
    st.dataset.stamped = '1';
    var img = st.querySelector('img'), sh = st.querySelector('.st-shadow');
    st.classList.remove('pending');
    if (REDUCE || !img || !img.animate){ return; }
    var dur = 460;
    img.animate([
      {transform:'translateY(-14%) scale(2.5)', opacity:0, filter:'blur(5px)'},
      {offset:.66, transform:'translateY(0) scale(.94)', opacity:1, filter:'blur(0px)'},
      {offset:.8, transform:'scale(1.035)', opacity:1},
      {transform:'scale(1)', opacity:1}
    ], {duration:dur, easing:'cubic-bezier(.55,0,.75,.15)', fill:'backwards'});
    if (sh) sh.animate([{opacity:0, transform:'scale(1.6)'}, {offset:.62, opacity:.75, transform:'scale(1)'}, {opacity:0, transform:'scale(1)'}], {duration:dur + 120, easing:'ease-in'});
    setTimeout(function(){
      thump();
      // ink spray
      var ink = st.dataset.ink;
      for (var i = 0; i < 9; i++){
        var dot = document.createElement('span'); dot.className = 'ink-dot';
        var a = Math.random() * Math.PI * 2, dist = 46 + Math.random() * 26;
        dot.style.background = ink; dot.style.left = 50 + Math.cos(a) * 30 + '%'; dot.style.top = 50 + Math.sin(a) * 30 + '%';
        var s = 0.4 + Math.random() * 0.9;
        st.appendChild(dot);
        dot.animate([{opacity:.9, transform:'translate(0,0) scale(' + s + ')'}, {opacity:0, transform:'translate(' + Math.cos(a) * dist + 'px,' + Math.sin(a) * dist + 'px) scale(' + s * 0.5 + ')'}], {duration:520 + Math.random() * 200, easing:'cubic-bezier(.2,.7,.2,1)'}).onfinish = (function(el){ return function(){ el.remove(); }; })(dot);
      }
      if (opts.shake){
        opts.shake.animate([
          {transform:'translate(0,0)'}, {transform:'translate(-3px,2px)'}, {transform:'translate(2px,-2px)'},
          {transform:'translate(-1px,1px)'}, {transform:'translate(0,0)'}
        ], {duration:260, easing:'ease-out'});
      }
    }, dur * 0.64);
  }

  /* ---------------- cover statement rotation ---------------- */
  var CAP = {ko:'말은 달라도, 뜻은 하나로.', en:'Different words. One meaning.', zh:'言语不同，心意相通。'};
  var TAG = {ko:'KOR', en:'ENG', zh:'中'}, ORDER = ['ko','en','zh'];
  (function(){
    var si = 0;
    function show(){
      $$('.cv-statement').forEach(function(p){
        var tx = $('.cvs-text', p), tg = $('.cvs-tag', p);
        var l = ORDER[si];
        if (!REDUCE && tx.animate){
          tx.animate([{opacity:0, transform:'translateY(.3em)', filter:'blur(3px)'}, {opacity:1, transform:'none', filter:'blur(0)'}], {duration:520, easing:'cubic-bezier(.2,.7,.2,1)'});
        }
        tx.textContent = CAP[l]; tx.lang = LANG_ATTR[l]; tg.textContent = TAG[l];
      });
    }
    show();
    if (!REDUCE) setInterval(function(){ if (document.hidden) return; si = (si + 1) % 3; show(); }, 3400);
  })();

  /* ---------------- topbar progress ---------------- */
  var prog = $('#prog'), tbPage = $('#tbPage');
  var sectionLabel = '';
  function docProgress(){
    var max = html.scrollHeight - html.clientHeight;
    prog.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
  }

  /* =========================================================
     FULL: the 3D book
     ========================================================= */
  var Book = null;
  if (FULL) Book = createBook();

  function createBook(){
    var stage = $('#ppStage'), pp = $('#passport'), src = $('#ppSrc'), bookEl = $('#book'), wrap = $('#bookWrap');
    var snaps = $('#ppSnaps'), rail = $('#ppRail'), pill = $('#pillLabel'), prev = $('#pillPrev'), next = $('#pillNext');
    var pageNodes = $$('#ppSrc > .page');
    var byKind = {}; pageNodes.forEach(function(n){ var k = n.getAttribute('data-page'); (byKind[k] = byKind[k] || []).push(n); });
    var visas = byKind.visa.map(function(a){
      var v = $('.pg-visual', a), t = $('.pg-text', a), g = $('.big-glyph, .pv-head .hanja', a);
      t.setAttribute('data-g', g ? g.textContent.trim() : '');
      return {article:a, visual:v, text:t, stamp:$('.stamp', a), label:a.getAttribute('data-label')};
    });
    // visa ledger + MRZ line under each visa text page (decorative; data from the stamp)
    visas.forEach(function(v, i){
      var d = v.stamp.dataset, led = document.createElement('div');
      led.className = 'pt-ledger mono'; led.setAttribute('aria-hidden', 'true');
      var rows = [['Port of entry', d.place], ['Date', d.date], ['Languages', d.mode], ['Visa Nº', d.no + ' / 08']];
      rows.forEach(function(r){ var c = document.createElement('div'); c.innerHTML = '<small></small><b></b>'; c.firstChild.textContent = r[0]; c.lastChild.textContent = r[1]; led.appendChild(c); });
      var mrz = document.createElement('p'); mrz.className = 'pt-mrz mono'; mrz.setAttribute('aria-hidden', 'true');
      var line = ('V<' + d.code + d.date.replace(/\D/g, '') + '<<' + d.place.toUpperCase().replace(/[^A-Z]+/g, '<') + '<<' + d.glyph).padEnd(60, '<').slice(0, 44);
      mrz.textContent = line;
      v.text.appendChild(led); v.text.appendChild(mrz);
    });
    var B = {spread:false, leaves:[], states:0, info:[], P:0, Pr:0, step:600, top:0, pw:0, ph:0, strips:7, lastW:0, lastH:0};
    var perfLow = false;

    function restore(){
      visas.forEach(function(v){ v.article.appendChild(v.visual); v.article.appendChild(v.text); });
      pageNodes.forEach(function(n){ src.appendChild(n); });
    }
    function paperFor(node, side, num, extra){
      var p = document.createElement('div');
      p.className = 'paper' + (extra ? ' ' + extra : '');
      if (node) p.appendChild(node);
      else {
        p.classList.add('blank');
        var wm = document.createElement('span'); wm.className = 'wm'; wm.textContent = '通譯'; wm.setAttribute('aria-hidden', 'true');
        p.appendChild(wm);
      }
      if (num != null){
        var n = document.createElement('span'); n.className = 'pnum ' + side; n.textContent = (num < 10 ? '0' : '') + num; n.setAttribute('aria-hidden', 'true');
        p.appendChild(n);
      }
      return p;
    }
    function measure(){
      var W = window.innerWidth, H = stage.clientHeight || window.innerHeight;
      var mobileBar = W < 900;
      var top = mobileBar ? 54 : 58, bottom = mobileBar ? 58 : 64;
      var avH = H - top - bottom - (W >= 960 ? 34 : 10);
      var spread = W >= 960 && H >= 560;
      var pw, ph;
      if (spread){
        var side = W >= 1280 ? 2 * 270 : 2 * 40;
        pw = Math.min(avH / 1.42, (W - side) / 2, 520);
        ph = pw * 1.42;
      } else {
        pw = Math.min(W - 24, 470);
        ph = Math.min(avH, pw * 1.95);
        if (ph < pw * 1.2) pw = Math.max(240, ph / 1.2);
      }
      return {W:W, H:H, spread:spread, pw:Math.round(pw), ph:Math.round(ph)};
    }

    function build(){
      var m = measure();
      B.lastW = m.W; B.lastH = m.H;
      restore();
      B.spread = m.spread; B.pw = m.pw; B.ph = m.ph;
      B.strips = perfLow ? 3 : (m.spread ? 8 : 6);
      bookEl.innerHTML = '';
      bookEl.style.setProperty('--pw', m.pw + 'px');
      bookEl.style.setProperty('--ph', m.ph + 'px');
      bookEl.style.setProperty('--bw', (m.spread ? m.pw * 2 : m.pw) + 'px');
      bookEl.style.setProperty('--spine', (m.spread ? m.pw : 0) + 'px');
      stage.style.setProperty('--pw', m.pw + 'px');
      B.base = (m.spread ? Math.min(19, Math.max(13, m.pw / 26)) : Math.min(16.5, Math.max(13.5, m.pw / 24)));

      var cover = byKind.cover[0], inside = byKind.inside[0], bio = byKind.bio[0], endorse = byKind.endorse[0], end = byKind.end[0];
      var R, L, info = [];
      if (m.spread){
        R = [cover, bio].concat(visas.map(function(v){ return v.text; }));
        L = [inside].concat(visas.map(function(v){ return v.visual; })).concat([endorse]);
      } else {
        R = [cover, bio].concat(visas.map(function(v){ return v.article; })).concat([endorse]);
        L = R.map(function(){ return null; });
      }
      info.push({no:'—', label:'Cover', tb:'P.00 — Cover'});
      info.push({no:'P1', label:'Identity', tb:'P.01 — Identity'});
      visas.forEach(function(v, i){ var n = '0' + (i + 1); info.push({no:'V' + n, label:v.label, tb:'Visa ' + n + ' · ' + v.label, visa:v, pill:'<b>Visa ' + n + '/08</b>' + v.label}); });
      info.push({no:'EN', label:'Endorsements', tb:'Endorsements'});
      if (!m.spread) info.push({no:'OB', label:'Observations', tb:'Observations'});
      B.info = info;

      // structure
      var sh = document.createElement('div'); sh.className = 'shadow'; bookEl.appendChild(sh);
      var shl = document.createElement('div'); shl.className = 'shadow l'; bookEl.appendChild(shl);
      B.edgeR = document.createElement('div'); B.edgeR.className = 'edge r'; bookEl.appendChild(B.edgeR);
      B.edgeL = document.createElement('div'); B.edgeL.className = 'edge l'; bookEl.appendChild(B.edgeL);
      var base = document.createElement('div'); base.className = 'base';
      var bf = document.createElement('div'); bf.className = 'face front';
      bf.appendChild(paperFor(end, 'r', m.spread ? R.length * 2 - 1 : R.length));
      base.appendChild(bf); bookEl.appendChild(base);
      B.castR = document.createElement('div'); B.castR.className = 'cast r'; bookEl.appendChild(B.castR);
      B.castL = document.createElement('div'); B.castL.className = 'cast l'; bookEl.appendChild(B.castL);
      B.flash = document.createElement('div'); B.flash.className = 'fx-flash';

      B.leaves = R.map(function(node, i){
        var leaf = document.createElement('div'); leaf.className = 'leaf';
        var f = document.createElement('div'); f.className = 'face front';
        var b = document.createElement('div'); b.className = 'face back';
        var isCover = node === cover;
        var fp = paperFor(node, 'r', isCover ? null : (m.spread ? i * 2 - 1 : i), isCover ? 'cover' : '');
        var bp = paperFor(L[i], 'l', m.spread ? i * 2 : null, '');
        if (isCover && !m.spread) bp.classList.add('inner-cover');
        f.appendChild(fp); b.appendChild(bp);
        var curl = document.createElement('div'); curl.className = 'curl'; curl.setAttribute('aria-hidden', 'true'); curl.inert = true;
        leaf.appendChild(f); leaf.appendChild(b); leaf.appendChild(curl);
        bookEl.appendChild(leaf);
        return {el:leaf, front:f, back:b, fp:fp, bp:bp, curl:curl, built:false, strips:null, t:-1, mode:'', off:null};
      });
      B.states = B.leaves.length + 1;
      fitAll();
      scrollLayout();
      buildRail();
      B.leaves.forEach(function(l){ l.t = -1; });
      B.Pr = B.P = currentP();
      render(true);
    }

    function fitPaper(p){
      var node = p.firstElementChild;
      if (!node || p.classList.contains('blank')) return;
      var fs = B.base, min = B.spread ? 11.5 : 12;
      var over = function(){
        node.style.height = 'auto';
        var need = node.offsetHeight;
        node.style.height = '';
        return need > p.clientHeight + 1;
      };
      p.style.setProperty('--pfs', fs + 'px');
      var guard = 0;
      while (over() && fs > min && guard++ < 30){
        fs -= 0.5; p.style.setProperty('--pfs', fs + 'px');
      }
    }
    function fitAll(){
      B.leaves.forEach(function(l){ fitPaper(l.fp); fitPaper(l.bp); l.built = false; });
      $$('.base .paper', bookEl).forEach(fitPaper);
    }

    /* ---- scroll mapping ---- */
    function scrollLayout(){
      var H = stage.clientHeight || window.innerHeight;
      B.step = Math.max(H * 0.82, 460);
      pp.style.setProperty('--pp-h', ((B.states - 1) * B.step + H) + 'px');
      snaps.innerHTML = '';
      for (var k = 0; k < B.states; k++){
        var i = document.createElement('i'); i.style.top = (k * B.step) + 'px'; snaps.appendChild(i);
      }
      B.top = pp.getBoundingClientRect().top + window.scrollY;
    }
    function currentP(){ return clamp((window.scrollY - B.top) / B.step, 0, B.states - 1); }
    function goTo(k){
      k = clamp(k, 0, B.states - 1);
      window.scrollTo({top:B.top + k * B.step + 1, behavior:'smooth'});
    }

    /* ---- rail / pill ---- */
    function buildRail(){
      rail.innerHTML = '';
      B.info.forEach(function(inf, k){
        var li = document.createElement('li'), b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = '<i></i><b>' + inf.no + '</b><span></span>';
        b.lastChild.textContent = inf.label;
        b.addEventListener('click', function(){ goTo(k); });
        li.appendChild(b); rail.appendChild(li);
      });
    }
    var lastState = -1;
    function updateUI(state){
      if (state === lastState) return;
      lastState = state;
      var inf = B.info[state] || B.info[0];
      $$('button', rail).forEach(function(b, i){
        b.setAttribute('aria-current', String(i === state));
        b.classList.toggle('done', !!(B.info[i].visa && B.info[i].visa.stamp && B.info[i].visa.stamp.dataset.stamped));
      });
      pill.innerHTML = inf.pill || ('<b>' + (inf.no === '—' ? 'P.00' : inf.no) + '</b>' + inf.label);
      prev.disabled = state === 0;
      if (inSection === 'passport') tbPage.textContent = inf.tb;
    }
    prev.addEventListener('click', function(){ goTo(Math.round(B.P) - 1); });
    next.addEventListener('click', function(){
      var k = Math.round(B.P) + 1;
      if (k >= B.states){ var r = $('#route'); window.scrollTo({top:r.getBoundingClientRect().top + window.scrollY, behavior:'smooth'}); }
      else goTo(k);
    });

    /* ---- curl strips ---- */
    function buildCurl(l){
      var N = B.strips, w = B.pw / N;
      l.curl.innerHTML = '';
      var parent = l.curl, list = [];
      for (var k = 0; k < N; k++){
        var s = document.createElement('div'); s.className = 'strip'; s.style.width = (w + 1.2) + 'px'; if (k) s.style.left = w + 'px';
        var f = document.createElement('div'); f.className = 'sface f';
        var b = document.createElement('div'); b.className = 'sface b';
        var cf = l.fp.cloneNode(true), cb = l.bp.cloneNode(true);
        cf.style.setProperty('--off', (-k * w) + 'px');
        cb.style.setProperty('--off', (-(N - 1 - k) * w) + 'px');
        $$('[id]', cf).concat($$('[id]', cb)).forEach(function(e){ e.removeAttribute('id'); });
        $$('img[loading]', cf).concat($$('img[loading]', cb)).forEach(function(e){ e.removeAttribute('loading'); });
        var shf = document.createElement('i'); shf.className = 'sh'; var hlf = document.createElement('i'); hlf.className = 'hl';
        var shb = document.createElement('i'); shb.className = 'sh'; var hlb = document.createElement('i'); hlb.className = 'hl';
        f.appendChild(cf); f.appendChild(shf); f.appendChild(hlf);
        b.appendChild(cb); b.appendChild(shb); b.appendChild(hlb);
        s.appendChild(f); s.appendChild(b);
        parent.appendChild(s); parent = s;
        list.push({el:s, shf:shf, hlf:hlf, shb:shb, hlb:hlb, a:0});
      }
      l.strips = list; l.built = true;
    }

    /* ---- render ---- */
    var tilt = {x:0, y:0, tx:0, ty:0}, sway = 0, lastTime = performance.now(), running = false, visible = true;
    var lastBookT = '', flipCross = [];
    function shade(ang, front){
      var v = front ? -ang / 180 : 1 + ang / 180; // 0 when flat, grows as the sheet turns away
      return 'rgba(27,15,8,' + (0.48 * v * v * (3 - 2 * v)).toFixed(3) + ')';
    }
    function gloss(ang, front){
      var c = Math.max(0, Math.cos((ang + (front ? 50 : 130)) * Math.PI / 180));
      return 'rgba(255,250,240,' + (Math.pow(c, 10) * 0.5).toFixed(3) + ')';
    }
    function turnT(P, j){ return smooth(clamp((P - j - 0.12) / 0.76, 0, 1)); }

    function render(force){
      var n = B.leaves.length, dz = 0.7, Pr = B.Pr;
      var fast = Math.abs(B.P - B.Pr) > 1.3;
      var castLeaf = null, castBest = 0;
      var cur = Math.round(Pr);
      for (var j = 0; j < n; j++){
        var l = B.leaves[j];
        var t = turnT(Pr, j);
        // cull leaves buried in a stack
        var off = (j < cur - 2) || (j > cur + 1);
        if (off !== l.off){ l.el.classList.toggle('off', off); l.off = off; }
        if (off) { l.t = -1; continue; }
        if (!force && t === l.t) continue;
        // crossing sound
        if (l.t >= 0 && !force && ((l.t < 0.5 && t >= 0.5) || (l.t > 0.5 && t <= 0.5)) && !fast) swish();
        l.t = t;
        var zr = (n - j) * dz, zl = (j + 1) * dz;
        var z = lerp(zr, zl, t) + Math.sin(Math.PI * t) * 4;
        var A = -180 * t;
        var curling = t > 0.001 && t < 0.999 && !fast;
        if (curling){
          if (!l.built) buildCurl(l);
          if (l.mode !== 'curl'){ l.el.classList.add('curling'); l.mode = 'curl'; }
          l.el.style.transform = 'translateZ(' + z.toFixed(2) + 'px)';
          var N = l.strips.length, bend = (B.spread ? 46 : 52) * Math.sin(Math.PI * t), prevA = 0, angs = [];
          for (var k = 0; k < N; k++) angs[k] = clamp(A - bend * Math.pow(k / (N - 1), 1.35), -180, 0);
          for (k = 0; k < N; k++){
            var a = angs[k], s = l.strips[k];
            s.el.style.transform = 'rotateY(' + (a - prevA).toFixed(2) + 'deg)';
            prevA = a;
            // shade + highlight as gradients across each strip so the curl reads as one smooth sheet
            var a0 = k ? (angs[k - 1] + a) / 2 : a, a1 = k < N - 1 ? (a + angs[k + 1]) / 2 : a;
            s.shf.style.background = 'linear-gradient(90deg,' + shade(a0, 1) + ',' + shade(a1, 1) + ')';
            s.shb.style.background = 'linear-gradient(90deg,' + shade(a1, 0) + ',' + shade(a0, 0) + ')';
            s.hlf.style.background = 'linear-gradient(90deg,' + gloss(a0, 1) + ',' + gloss(a1, 1) + ')';
            s.hlb.style.background = 'linear-gradient(90deg,' + gloss(a1, 0) + ',' + gloss(a0, 0) + ')';
          }
          var edgeA = clamp(A - bend, -180, 0);
          var strength = Math.sin(Math.PI * t);
          if (strength > castBest){ castBest = strength; castLeaf = {j:j, edgeA:edgeA, s:strength, z:z}; }
        } else {
          if (l.mode !== 'flat'){ l.el.classList.remove('curling'); l.mode = 'flat'; }
          l.el.style.transform = 'translateZ(' + z.toFixed(2) + 'px) rotateY(' + A.toFixed(2) + 'deg)';
        }
      }
      // cast shadows
      if (castLeaf){
        var c = Math.cos(castLeaf.edgeA * Math.PI / 180);
        var jz = castLeaf.j;
        if (c > 0){
          B.castR.style.opacity = (castLeaf.s * 0.95).toFixed(3);
          B.castR.style.setProperty('--cw', (c * 100).toFixed(1) + '%');
          B.castR.style.transform = 'translateZ(' + ((n - jz) * dz - dz * 0.5) + 'px)';
          B.castL.style.opacity = 0;
        } else {
          B.castL.style.opacity = (castLeaf.s * 0.95).toFixed(3);
          B.castL.style.setProperty('--cw', (-c * 100).toFixed(1) + '%');
          B.castL.style.transform = 'translateZ(' + (jz * dz + dz * 0.5) + 'px)';
          B.castR.style.opacity = 0;
        }
      } else { B.castR.style.opacity = 0; B.castL.style.opacity = 0; }

      // book pose
      var t0 = turnT(Pr, 0);
      var closed = 1 - t0;
      var shift = B.spread ? -B.pw / 2 * closed : 0;
      var rx = 12 * closed - tilt.y * (closed > 0.5 ? 9 : 4);
      var ry = tilt.x * (closed > 0.5 ? 14 : 6) + (B.spread ? 0 : sway * closed * 3.5);
      var rz = -3.5 * closed;
      var sc = 1 - 0.05 * closed;
      var bt = 'translateX(' + shift.toFixed(1) + 'px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
      if (bt !== lastBookT){ bookEl.style.transform = bt; lastBookT = bt; }
      var gx = 50 + (coarse ? sway * 40 * closed : tilt.x * 70), gy = 28 + (coarse ? 0 : tilt.y * 60);
      bookEl.style.setProperty('--gx', gx.toFixed(1) + '%');
      bookEl.style.setProperty('--gy', gy.toFixed(1) + '%');
      // stacks
      var turned = 0; for (var q = 0; q < n; q++) turned += turnT(Pr, q);
      B.edgeR.style.setProperty('--er', (2 + (n - turned) * 0.8).toFixed(1) + 'px');
      B.edgeL.style.setProperty('--el', B.spread ? (Math.max(0, turned - 0.5) * 0.8).toFixed(1) + 'px' : '0px');
      bookEl.style.setProperty('--lshadow', B.spread ? t0.toFixed(3) : 0);
      stage.style.setProperty('--open', clamp(Pr, 0, 1).toFixed(3));

      // settle → stamp
      var near = Math.abs(Pr - cur) < 0.05 && Math.abs(B.P - cur) < 0.05;
      var inf = B.info[cur];
      if (near && inf && inf.visa && inf.visa.stamp && !inf.visa.stamp.dataset.stamped && inf.visa.stamp.querySelector('img')){
        slam(inf.visa.stamp, {shake:wrap});
        lastState = -1;
      }
      updateUI(cur);
    }

    function loop(now){
      var dt = Math.min(0.05, (now - lastTime) / 1000); lastTime = now;
      B.P = currentP();
      var d = B.P - B.Pr;
      B.Pr = Math.abs(d) < 0.0006 ? B.P : B.Pr + d * (1 - Math.exp(-dt * 8.5));
      tilt.x += (tilt.tx - tilt.x) * (1 - Math.exp(-dt * 6));
      tilt.y += (tilt.ty - tilt.y) * (1 - Math.exp(-dt * 6));
      if (coarse && !perfLow) sway = Math.sin(now / 1400);
      render(false);
      if (visible) requestAnimationFrame(loop); else running = false;
      probe(dt);
    }
    function start(){ if (!running){ running = true; lastTime = performance.now(); requestAnimationFrame(loop); } }

    // pointer tilt (mouse only)
    window.addEventListener('pointermove', function(e){
      if (e.pointerType !== 'mouse') return;
      tilt.tx = clamp(e.clientX / window.innerWidth - 0.5, -0.5, 0.5);
      tilt.ty = clamp(e.clientY / window.innerHeight - 0.5, -0.5, 0.5);
    }, {passive:true});
    document.addEventListener('pointerleave', function(){ tilt.tx = 0; tilt.ty = 0; });

    // keyboard page turning
    window.addEventListener('keydown', function(e){
      if (inSection !== 'passport' || e.altKey || e.metaKey || e.ctrlKey) return;
      if (/input|textarea|select/i.test((e.target.tagName || ''))) return;
      if (e.key === 'ArrowRight'){ e.preventDefault(); goTo(Math.round(B.P) + 1); }
      if (e.key === 'ArrowLeft'){ e.preventDefault(); goTo(Math.round(B.P) - 1); }
    });

    // perf probe: lighten things if the device struggles
    var pf = {n:0, sum:0, done:FORCED};
    function probe(dt){
      if (pf.done) return;
      if (performance.now() < 1500) return;
      pf.n++; pf.sum += dt;
      if (pf.n >= 90){
        pf.done = true;
        if (pf.sum / pf.n > 0.045){ perfLow = true; html.classList.add('perf-low'); B.strips = 3; B.leaves.forEach(function(l){ l.built = false; }); }
      }
    }

    new IntersectionObserver(function(es){
      visible = es[0].isIntersecting;
      if (visible) start();
    }).observe(pp);

    var rT = 0;
    window.addEventListener('resize', function(){
      clearTimeout(rT);
      rT = setTimeout(function(){
        var W = window.innerWidth, H = stage.clientHeight || window.innerHeight;
        if (W === B.lastW && Math.abs(H - B.lastH) < 140) { scrollLayout(); return; }
        build();
      }, 180);
    });
    onLang.push(function(){ fitAll(); render(true); });

    // preload images in the book shortly after first paint
    setTimeout(function(){ $$('img[loading="lazy"]', bookEl).forEach(function(i){ i.loading = 'eager'; }); }, 1200);

    // entrance
    build();
    if (!REDUCE && wrap.animate){
      wrap.animate([{opacity:0, transform:'translateY(40px) scale(.96)'}, {opacity:1, transform:'none'}], {duration:1100, easing:'cubic-bezier(.2,.7,.2,1)'});
    }
    start();
    return {B:B, build:build, scrollLayout:scrollLayout, goTo:goTo};
  }

  /* =========================================================
     LITE: stamps on enter
     ========================================================= */
  if (!FULL){
    if (REDUCE){ stamps.forEach(function(s){ s.dataset.stamped = '1'; s.classList.remove('pending'); }); }
    else {
      var sio = new IntersectionObserver(function(es){
        es.forEach(function(e){
          if (!e.isIntersecting) return;
          var st = e.target;
          sio.unobserve(st);
          fontsReady.then(function(){ setTimeout(function(){ st.classList.add('in'); slam(st); }, 150); });
        });
      }, {threshold:0.6});
      stamps.forEach(function(s){ sio.observe(s); });
    }
  }

  /* =========================================================
     Sections → topbar label
     ========================================================= */
  var secIO = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if (!e.isIntersecting) return;
      inSection = e.target.id;
      if (inSection === 'route') tbPage.textContent = 'Route — SEL · SZV · SIN';
      else if (inSection === 'contact') tbPage.textContent = 'Boarding — Contact';
      else if (Book) { tbPage.textContent = (Book.B.info[Math.round(Book.B.Pr)] || {}).tb || ''; }
      else tbPage.textContent = 'Passport';
    });
  }, {rootMargin:'-50% 0px -50% 0px'});
  ['passport','route','contact'].forEach(function(id){ var el = document.getElementById(id); if (el) secIO.observe(el); });

  /* =========================================================
     ROUTE: globe (3D) or flat map (light)
     ========================================================= */
  var CITIES = {sel:{lat:37.5665, lon:126.978}, szv:{lat:31.2989, lon:120.5853}, sin:{lat:1.3521, lon:103.8198}};
  var LEGS = $$('.leg').map(function(li){ return [li.getAttribute('data-from'), li.getAttribute('data-to')]; });
  var route = $('#route'), routeSteps = $('#routeSteps'), legEls = $$('.leg'), legNo = $('#legNo');
  var globe = null, routeTop = 0, routeH = 0;
  function routeLayout(){
    if (!FULL) return;
    var H = window.innerHeight;
    route.style.setProperty('--route-h', (H + LEGS.length * Math.max(H * 0.7, 420)) + 'px');
    routeTop = route.getBoundingClientRect().top + window.scrollY;
    routeH = route.offsetHeight;
    routeSteps.innerHTML = '';
  }
  function routeProgress(){
    if (!FULL) return LEGS.length;
    var H = window.innerHeight;
    var q = clamp((window.scrollY - routeTop) / Math.max(1, routeH - H), 0, 1);
    return q * LEGS.length;
  }
  var lastLeg = -1;
  function routeUpdate(){
    var f = routeProgress();
    var active = Math.min(LEGS.length - 1, Math.floor(f));
    if (FULL && active !== lastLeg){
      lastLeg = active;
      legEls.forEach(function(el, i){ el.classList.toggle('on', i === active); });
      legNo.textContent = 'LEG ' + (active + 1) + ' / ' + LEGS.length;
      if (inSection === 'route') tbPage.textContent = 'Route — LEG ' + (active + 1) + ' / ' + LEGS.length;
    }
    if (globe && globe.setProgress) globe.setProgress(f);
  }
  if (!FULL){ legEls.forEach(function(el){ el.classList.add('on'); }); legNo.textContent = 'SEL · SZV · SIN'; }

  function drawFlatMap(){
    // light fallback: dot-matrix map of East & Southeast Asia, drawn once
    var box = $('#globeBox'), cv = $('#globeCanvas');
    var size = box.clientWidth, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    var x = cv.getContext('2d'); x.scale(dpr, dpr);
    var lon0 = 92, lon1 = 140, lat0 = -6, lat1 = 46;
    function px(lon, lat){ return [(lon - lon0) / (lon1 - lon0) * size, (lat1 - lat) / (lat1 - lat0) * size]; }
    var bits = null;
    try { var b = atob(window.PP_LAND || ''); bits = b; } catch(e){}
    x.fillStyle = 'rgba(239,231,216,.28)';
    if (bits){
      for (var la = lat1 - 0.5; la > lat0; la -= 1){
        for (var lo = lon0 + 0.5; lo < lon1; lo += 1){
          var r = Math.floor(90 - la), c = Math.floor(lo + 180), i = r * 360 + c;
          if ((bits.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1){ var p = px(lo, la); x.beginPath(); x.arc(p[0], p[1], size / 150, 0, Math.PI * 2); x.fill(); }
        }
      }
    }
    x.lineWidth = 2; x.strokeStyle = '#ef4b2d'; x.setLineDash([6, 6]);
    LEGS.forEach(function(lg, k){
      var a = px(CITIES[lg[0]].lon, CITIES[lg[0]].lat), b2 = px(CITIES[lg[1]].lon, CITIES[lg[1]].lat);
      var mx = (a[0] + b2[0]) / 2, my = (a[1] + b2[1]) / 2, dx = b2[0] - a[0], dy = b2[1] - a[1];
      var bow = (k % 2 ? -1 : 1) * 0.22;
      x.beginPath(); x.moveTo(a[0], a[1]); x.quadraticCurveTo(mx - dy * bow, my + dx * bow, b2[0], b2[1]); x.stroke();
    });
    x.setLineDash([]);
    Object.keys(CITIES).forEach(function(k){
      var p = px(CITIES[k].lon, CITIES[k].lat);
      x.fillStyle = '#ef4b2d'; x.beginPath(); x.arc(p[0], p[1], 5, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(239,75,45,.4)'; x.lineWidth = 1; x.beginPath(); x.arc(p[0], p[1], 11, 0, Math.PI * 2); x.stroke();
      var lab = $('.g-lab[data-city="' + k + '"]');
      if (lab){ lab.style.transform = 'translate(' + (p[0] + 12) + 'px,' + (p[1] - 12) + 'px)'; lab.classList.add('vis'); }
    });
  }

  var globeStarted = false;
  function startGlobe(){
    if (globeStarted) return; globeStarted = true;
    if (!FULL){ drawFlatMap(); return; }
    import('./globe.js').then(function(mod){
      return mod.createGlobe({
        canvas:$('#globeCanvas'), box:$('#globeBox'), labels:$$('.g-lab'),
        cities:CITIES, legs:LEGS, land:window.PP_LAND, low:html.classList.contains('perf-low') || coarse && (navigator.hardwareConcurrency || 8) <= 4
      });
    }).then(function(g){ globe = g; routeUpdate(); })
      .catch(function(){ html.classList.add('no-webgl'); drawFlatMap(); });
  }
  new IntersectionObserver(function(es){
    if (es[0].isIntersecting) startGlobe();
    if (globe && globe.setActive) globe.setActive(es[0].isIntersecting);
  }, {rootMargin:'600px 0px'}).observe(route);

  /* =========================================================
     BOARDING PASS: tear the stub
     ========================================================= */
  (function(){
    var stub = $('#stub'), slot = $('#stubSlot'), email = stub.getAttribute('data-copy');
    // barcode from the email's characters
    var bars = '', xx = 0;
    for (var i = 0; i < email.length * 2; i++){
      var code = email.charCodeAt(i % email.length) + i * 7;
      var w = 1 + (code % 3), gap = 1 + ((code >> 2) % 3);
      bars += '<rect x="' + xx + '" y="0" width="' + w + '" height="10"/>'; xx += w + gap;
    }
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + xx + " 10' preserveAspectRatio='none'><g fill='%231e1a16'>" + bars.replace(/"/g, "'") + "</g></svg>";
    $('.stub-bar', stub).style.background = 'url("data:image/svg+xml,' + svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23') + '") center/100% 100% no-repeat';

    var drag = null, torn = false;
    var vertical = function(){ return window.innerWidth < 900; };
    var TH = function(){ return vertical() ? 90 : 110; };
    function setT(x, y, r){ stub.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + r.toFixed(2) + 'deg)'; }

    stub.addEventListener('pointerdown', function(e){
      if (torn || e.button > 0) return;
      drag = {x:e.clientX, y:e.clientY, lx:e.clientX, ly:e.clientY, t:performance.now(), vx:0, vy:0, moved:false, id:e.pointerId};
      try { stub.setPointerCapture(e.pointerId); } catch(err){}
      stub.classList.remove('back'); stub.classList.add('tearing');
    });
    stub.addEventListener('pointermove', function(e){
      if (!drag || torn) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now(), dt = Math.max(1, now - drag.t);
      drag.vx = (e.clientX - drag.lx) / dt * 16; drag.vy = (e.clientY - drag.ly) / dt * 16;
      drag.lx = e.clientX; drag.ly = e.clientY; drag.t = now;
      var dist = Math.hypot(dx, dy);
      if (dist > 6) drag.moved = true;
      // perforation resists, then gives
      var k = dist < TH() ? 0.55 : 1;
      var rot = vertical() ? clamp(dx * 0.05, -10, 10) : clamp(dy * 0.05 + dx * 0.02, -12, 12);
      setT(dx * k, dy * k, rot);
      if (dist > TH()) tear(drag.vx, drag.vy, rot);
    });
    function end(e){
      if (!drag || torn) { drag = null; return; }
      var moved = drag.moved;
      drag = null;
      if (!moved){ tear(vertical() ? 0 : 7, vertical() ? 7 : -2, 0); return; }
      stub.classList.remove('tearing'); stub.classList.add('back'); stub.style.transform = '';
    }
    stub.addEventListener('pointerup', end);
    stub.addEventListener('pointercancel', function(){ if (drag && !torn){ drag = null; stub.classList.remove('tearing'); stub.classList.add('back'); stub.style.transform = ''; } });
    stub.addEventListener('click', function(e){ if (e.detail === 0 && !torn) tear(vertical() ? 0 : 8, vertical() ? 8 : -2, 0); });

    function tear(vx, vy, rot){
      torn = true; drag = null;
      rip();
      stub.classList.add('torn');
      copyText(email).then(function(ok){
        toast((D[cur]['ui.copied'] || 'Copied') + ' — ' + email);
      });
      var m = (stub.style.transform.match(/translate\(([-\d.]+)px,([-\d.]+)px\)/) || [0, 0, 0]);
      var x = +m[1], y = +m[2], r = rot || 0;
      vx = clamp(vx || 0, -40, 40); vy = clamp(vy || 0, -40, 40);
      if (Math.hypot(vx, vy) < 4){ vx = vertical() ? 2 : 9; vy = vertical() ? 9 : -3; }
      var vr = (Math.random() - 0.5) * 6 + vx * 0.15, op = 1, t0 = performance.now();
      if (REDUCE){
        stub.animate([{opacity:1}, {opacity:0}], {duration:250, fill:'forwards'});
        setTimeout(respawn, 900);
        return;
      }
      (function fly(now){
        var age = (now - t0) / 1000;
        vy += 0.9; vx *= 0.99; x += vx; y += vy; r += vr;
        if (age > 0.45) op = Math.max(0, op - 0.05);
        stub.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + r.toFixed(1) + 'deg)';
        stub.style.opacity = op;
        if (op > 0 && age < 2.5) requestAnimationFrame(fly);
        else setTimeout(respawn, 700);
      })(t0);
    }
    function respawn(){
      stub.getAnimations && stub.getAnimations().forEach(function(a){ a.cancel(); });
      stub.classList.remove('torn', 'tearing', 'back');
      stub.style.transform = ''; stub.style.opacity = '';
      void stub.offsetWidth;
      stub.classList.add('reprint');
      setTimeout(function(){ stub.classList.remove('reprint'); torn = false; }, 720);
    }
  })();

  /* =========================================================
     Scroll + init
     ========================================================= */
  var ticking = false;
  function onScroll(){
    ticking = false;
    docProgress();
    routeUpdate();
  }
  window.addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(onScroll); } }, {passive:true});
  window.addEventListener('resize', function(){
    clearTimeout(window._ppR);
    window._ppR = setTimeout(function(){ routeLayout(); if (Book) Book.scrollLayout(); if (!FULL && globeStarted) drawFlatMap(); onScroll(); }, 220);
  });

  setLang(initialLang());
  routeLayout();
  onScroll();
  // layout can shift after web fonts load
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){
    if (Book) { Book.build(); }
    routeLayout(); onScroll();
  });
  // honour a deep link like #contact after the book has sized itself
  if (location.hash && FULL){
    var target = document.getElementById(location.hash.slice(1));
    if (target) setTimeout(function(){ window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY); }, 60);
  }
})();
