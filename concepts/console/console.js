/* =========================================================
   CONSOLE — interpreter booth mixing desk
   Vanilla JS, no dependencies.
   ========================================================= */
(function(){
  'use strict';

  var H = document.documentElement;
  function $(s, c){ return (c || document).querySelector(s); }
  function $$(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
  function pad(n, w){ n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }

  var lite = H.classList.contains('lite');
  var reduce = H.classList.contains('reduce');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  /* ---------------------------------------------------------
     DICTIONARIES
     --------------------------------------------------------- */
  var D = window.JIN_D || {ko:{}, en:{}, zh:{}};
  var U = {
    ko:{hint:'페이더를 올리면 사이트 언어가 바뀝니다', tracks:'▶ 재생 버튼을 누르면 경력 내용과 사진이 열립니다', all:'전체 펼치기', none:'전체 접기',
        micOn:'마이크 ON — 목소리에 미터와 파형이 반응합니다 (녹음·전송 없음)', micOff:'마이크 OFF', micDenied:'마이크 권한이 거부되었거나 사용할 수 없습니다',
        liteAuto:'기기 성능에 맞춰 가벼운 모드로 전환했습니다 · FX 버튼으로 다시 켤 수 있어요', liteOn:'FX OFF — 가벼운 모드', liteOff:'FX ON — 전체 효과',
        sndOn:'버튼 클릭음 ON', sndOff:'버튼 클릭음 OFF'},
    en:{hint:'Push a fader up to switch the site language', tracks:'Press ▶ on a track — details and photos open', all:'Expand all', none:'Collapse all',
        micOn:'MIC ON — meters and scope follow your voice (nothing is recorded or sent)', micOff:'MIC OFF', micDenied:'Microphone permission denied or unavailable',
        liteAuto:'Switched to light mode for this device · press FX to turn effects back on', liteOn:'FX OFF — light mode', liteOff:'FX ON — full effects',
        sndOn:'Button sounds ON', sndOff:'Button sounds OFF'},
    zh:{hint:'推起推子即可切换网站语言', tracks:'按下 ▶ 播放曲目，查看经历详情与照片', all:'全部展开', none:'全部收起',
        micOn:'麦克风已开启 — 电平表与波形随您的声音变化（不录音、不上传）', micOff:'麦克风已关闭', micDenied:'麦克风权限被拒绝或不可用',
        liteAuto:'已根据设备性能切换为轻量模式 · 可按 FX 重新开启特效', liteOn:'FX 关闭 — 轻量模式', liteOff:'FX 开启 — 完整特效',
        sndOn:'按键音已开启', sndOff:'按键音已关闭'}
  };
  var LANG_ATTR = {ko:'ko', en:'en', zh:'zh-Hans'};
  var ORDER = ['ko','en','zh'];
  var TAG = {ko:'KOR', en:'ENG', zh:'中'};
  var ST = {ko:['말은 달라도,','뜻은 하나로.'], en:['Different words.','One meaning.'], zh:['言语不同，','心意相通。']};
  var CAP = {ko:'말은 달라도, 뜻은 하나로.', en:'Different words. One meaning.', zh:'言语不同，心意相通。'};
  var POOL = {
    ko:'가나다라마바사아자차카타파하말뜻달은하나로통역현장언어목소리',
    en:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    zh:'的一是不了人我在有他这中大来上国个到说们为子和你地出道也时年得就那要下以生会'
  };

  var i18nEls = $$('[data-i18n]');
  i18nEls.forEach(function(el){
    var k = el.getAttribute('data-i18n');
    if (!(k in D.ko)) D.ko[k] = el.innerHTML.replace(/\s+/g, ' ').trim();
  });
  var uiEls = $$('[data-ui]');
  var cur = 'ko';

  /* ---------------------------------------------------------
     TOAST
     --------------------------------------------------------- */
  var toastEl = $('#toast'), toastT = 0;
  function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function(){ toastEl.classList.remove('show'); }, 3200);
  }

  /* ---------------------------------------------------------
     AUDIO (click sounds — off by default) + MIC
     --------------------------------------------------------- */
  var AC = null, out = null, noiseBuf = null, sndOn = false;
  function ac(){
    if (!AC){
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      AC = new C();
      out = AC.createGain(); out.gain.value = 0.55; out.connect(AC.destination);
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.25, AC.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function nz(t, dur, type, freq, q, gain){
    var s = AC.createBufferSource(); s.buffer = noiseBuf;
    var f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    var g = AC.createGain();
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(t, Math.random() * 0.15); s.stop(t + dur + 0.02);
  }
  function osc(t, dur, type, f0, f1, gain){
    var o = AC.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var g = AC.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.02);
  }
  var lastTick = 0;
  function sfx(kind){
    if (!sndOn) return;
    var a = ac(); if (!a) return;
    var t = a.currentTime;
    if (kind === 'tick'){
      if (t - lastTick < 0.03) return; lastTick = t;
      nz(t, 0.012, 'highpass', 3200, 0.7, 0.22);
    } else if (kind === 'fader'){
      if (t - lastTick < 0.045) return; lastTick = t;
      nz(t, 0.03, 'bandpass', 900, 1.4, 0.16);
    } else if (kind === 'switch'){
      nz(t, 0.03, 'bandpass', 2200, 1.1, 0.5); osc(t, 0.05, 'sine', 160, 70, 0.35); osc(t + 0.02, 0.06, 'square', 1320, 1320, 0.025);
    } else if (kind === 'play'){
      nz(t, 0.03, 'bandpass', 1800, 1.1, 0.45); osc(t, 0.05, 'sine', 150, 60, 0.3); osc(t + 0.03, 0.32, 'sawtooth', 55, 220, 0.035);
    } else if (kind === 'stop'){
      nz(t, 0.03, 'bandpass', 1500, 1.1, 0.45); osc(t, 0.3, 'sawtooth', 220, 40, 0.03);
    } else {
      nz(t, 0.025, 'bandpass', 1900, 1.2, 0.45); osc(t, 0.045, 'sine', 140, 60, 0.3);
    }
  }

  var sndBtn = $('#sndBtn');
  sndBtn.addEventListener('click', function(){
    sndOn = !sndOn;
    sndBtn.setAttribute('aria-pressed', String(sndOn));
    if (sndOn){ ac(); sfx('switch'); }
    toast(U[cur][sndOn ? 'sndOn' : 'sndOff']);
  });

  var mic = {on:false, stream:null, an:null, buf:null, rms:0};
  var micBtn = $('#micBtn'), onair = $('#onair');
  function micStop(){
    if (mic.stream) mic.stream.getTracks().forEach(function(tk){ tk.stop(); });
    mic.on = false; mic.stream = null; mic.an = null; mic.rms = 0;
    micBtn.setAttribute('aria-pressed', 'false');
    onair.classList.remove('on');
    if (lite) drawStatic();
  }
  micBtn.addEventListener('click', function(){
    sfx('switch');
    if (mic.on){ micStop(); toast(U[cur].micOff); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ toast(U[cur].micDenied); return; }
    var a = ac(); if (!a){ toast(U[cur].micDenied); return; }
    navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}}).then(function(stream){
      mic.stream = stream;
      var src = a.createMediaStreamSource(stream);
      mic.an = a.createAnalyser(); mic.an.fftSize = 1024; mic.an.smoothingTimeConstant = 0.6;
      src.connect(mic.an);
      mic.buf = new Float32Array(mic.an.fftSize);
      mic.on = true;
      micBtn.setAttribute('aria-pressed', 'true');
      onair.classList.add('on');
      toast(U[cur].micOn);
      kick();
    }).catch(function(){
      micBtn.classList.add('denied');
      toast(U[cur].micDenied);
    });
  });
  function micRead(){
    if (!mic.on || !mic.an) return 0;
    if (mic.an.getFloatTimeDomainData) mic.an.getFloatTimeDomainData(mic.buf);
    var s = 0; for (var i = 0; i < mic.buf.length; i++) s += mic.buf[i] * mic.buf[i];
    var r = Math.sqrt(s / mic.buf.length);
    mic.rms += (Math.min(1, r * 7) - mic.rms) * 0.35;
    return mic.rms;
  }

  /* ---------------------------------------------------------
     DIALS — drag to rotate (angle-based), keys, double-click reset
     --------------------------------------------------------- */
  var dials = {};
  var gain = {ko:.72, en:.66, zh:.8};
  var timeBase = .4;
  function applyDial(o){
    var v = o.v, k = o.key;
    o.el.style.setProperty('--v', v.toFixed(4));
    o.el.setAttribute('aria-valuenow', String(Math.round(v * 100)));
    o.el.setAttribute('aria-valuemin', '0');
    o.el.setAttribute('aria-valuemax', '100');
    if (k === 'noise') H.style.setProperty('--noise', v.toFixed(3));
    else if (k === 'glow') H.style.setProperty('--glow', v.toFixed(3));
    else if (k === 'time') timeBase = v;
    else if (k.indexOf('gain-') === 0) gain[k.slice(5)] = v;
  }
  function setDial(o, v){
    v = clamp(v, 0, 1);
    var step = Math.floor(v * 24) !== Math.floor(o.v * 24);
    o.v = v; applyDial(o);
    if (step) sfx('tick');
    if (lite && !mic.on) drawStatic();
  }
  $$('.dial').forEach(function(el){
    var o = {el:el, key:el.getAttribute('data-dial'), v:+el.getAttribute('data-v'), def:+el.getAttribute('data-v')};
    dials[o.key] = o; applyDial(o);
    var cx = 0, cy = 0, lastA = 0, lastY = 0, id = null;
    el.addEventListener('pointerdown', function(e){
      e.preventDefault();
      var r = el.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      lastA = Math.atan2(e.clientY - cy, e.clientX - cx); lastY = e.clientY;
      id = e.pointerId; el.setPointerCapture(id); el.classList.add('drag');
    });
    el.addEventListener('pointermove', function(e){
      if (id !== e.pointerId) return;
      var dx = e.clientX - cx, dy = e.clientY - cy, dist = Math.sqrt(dx * dx + dy * dy);
      var a = Math.atan2(dy, dx), d;
      if (dist > 10){
        d = a - lastA;
        if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI;
        d = d / (1.5 * Math.PI);
      } else {
        d = (lastY - e.clientY) / 160;
      }
      lastA = a; lastY = e.clientY;
      setDial(o, o.v + d);
    });
    function up(e){ if (id !== e.pointerId) return; id = null; el.classList.remove('drag'); }
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('dblclick', function(){ setDial(o, o.def); });
    el.addEventListener('keydown', function(e){
      var k = e.key, s = e.shiftKey ? .1 : .04;
      if (k === 'ArrowUp' || k === 'ArrowRight'){ setDial(o, o.v + s); e.preventDefault(); }
      else if (k === 'ArrowDown' || k === 'ArrowLeft'){ setDial(o, o.v - s); e.preventDefault(); }
      else if (k === 'Home'){ setDial(o, 0); e.preventDefault(); }
      else if (k === 'End'){ setDial(o, 1); e.preventDefault(); }
    });
  });

  /* ---------------------------------------------------------
     FADERS — push a channel up to put that language on air
     --------------------------------------------------------- */
  var UNITY = 5 / 7, LOW = 0.1, SWITCH_AT = 0.5;
  var faders = {};
  function faderText(v){
    if (v < 0.02) return '-∞ dB';
    var db = (v - UNITY) * 40; // rough
    return (db >= 0 ? '+' : '') + db.toFixed(1) + ' dB';
  }
  function setFaderV(o, v){
    o.v = clamp(v, 0, 1);
    o.el.style.setProperty('--v', o.v.toFixed(4));
    o.el.setAttribute('aria-valuenow', String(Math.round(o.v * 100)));
    o.el.setAttribute('aria-valuetext', faderText(o.v) + (o.lang === cur ? ' — on air' : ''));
  }
  function animFader(o, target){
    o.target = target;
    if (o.drag) return;
    if (reduce || lite){ setFaderV(o, target); return; }
    if (o.anim) return;
    o.anim = true;
    (function step(){
      if (o.drag){ o.anim = false; return; }
      var d = o.target - o.v;
      if (Math.abs(d) < 0.002){ setFaderV(o, o.target); o.anim = false; return; }
      setFaderV(o, o.v + d * 0.16);
      requestAnimationFrame(step);
    })();
  }
  $$('.fader').forEach(function(el){
    var o = {el:el, lang:el.getAttribute('data-lang'), v:LOW, target:LOW, drag:false, anim:false};
    faders[o.lang] = o; setFaderV(o, LOW);
    var cap = $('.fader-cap', el), id = null, off = 0, lastV = 0;
    function valAt(y){
      var r = el.getBoundingClientRect(), ch = cap.offsetHeight;
      return 1 - (y - r.top - ch / 2) / Math.max(1, r.height - ch);
    }
    el.addEventListener('pointerdown', function(e){
      e.preventDefault();
      id = e.pointerId; el.setPointerCapture(id);
      o.drag = true; el.classList.add('drag');
      var pv = valAt(e.clientY);
      off = (e.target === cap || cap.contains(e.target)) ? pv - o.v : 0;
      lastV = o.v;
      move(pv - off);
    });
    function move(v){
      setFaderV(o, v);
      if (Math.abs(o.v - lastV) > 0.035){ sfx('fader'); lastV = o.v; }
      if (o.lang !== cur && o.v > SWITCH_AT) setLang(o.lang, true);
    }
    el.addEventListener('pointermove', function(e){
      if (id !== e.pointerId) return;
      move(valAt(e.clientY) - off);
    });
    function up(e){
      if (id !== e.pointerId) return;
      id = null; o.drag = false; el.classList.remove('drag');
      animFader(o, o.lang === cur ? UNITY : LOW);
    }
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('keydown', function(e){
      var k = e.key, up_ = (k === 'ArrowUp' || k === 'ArrowRight' || k === 'PageUp' || k === 'End');
      var dn = (k === 'ArrowDown' || k === 'ArrowLeft' || k === 'PageDown' || k === 'Home');
      if (!up_ && !dn) return;
      e.preventDefault();
      if (up_ && o.lang !== cur){ setLang(o.lang, true); return; }
      setFaderV(o, o.v + (up_ ? .05 : -.05)); sfx('fader');
      clearTimeout(o.kt);
      o.kt = setTimeout(function(){ animFader(o, o.lang === cur ? UNITY : LOW); }, 900);
    });
  });

  /* ---------------------------------------------------------
     LANGUAGE
     --------------------------------------------------------- */
  var chBtns = $$('.ch-sel button'), selBtns = $$('.sel'), strips = $$('.strip');
  var crt = $('#crt'), lines = $$('.st-line'), subText = $('#subText'), subTag = $('#subTag'), osdRoute = $('#osdRoute');
  function inView(el){ var r = el.getBoundingClientRect(); return r.bottom > -40 && r.top < window.innerHeight + 40 && r.width > 0; }
  function swap(el, html, animate){
    if (!animate || lite || !inView(el)){ el.innerHTML = html; return; }
    el.classList.remove('tuning'); void el.offsetWidth; el.classList.add('tuning');
    clearTimeout(el._sw);
    el._sw = setTimeout(function(){ el.innerHTML = html; }, 130);
    clearTimeout(el._tn);
    el._tn = setTimeout(function(){ el.classList.remove('tuning'); }, 380);
  }
  var subIdx = 1;
  function setLang(l, animate){
    if (!D[l]) l = 'ko';
    var changed = l !== cur;
    cur = l;
    H.lang = LANG_ATTR[l];
    chBtns.forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === l)); });
    selBtns.forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === l)); });
    strips.forEach(function(s){ s.classList.toggle('live', s.getAttribute('data-lang') === l); });
    i18nEls.forEach(function(el){
      var h = D[l][el.getAttribute('data-i18n')];
      if (h != null) swap(el, h, animate);
    });
    uiEls.forEach(function(el){
      var h = U[l][el.getAttribute('data-ui')];
      if (el.id === 'allBtnT') return;
      if (h != null) swap(el, h, animate);
    });
    updateAllLabel();
    // statement on the CRT
    lines.forEach(function(ln, i){ ln.lang = LANG_ATTR[l]; swap(ln, ST[l][i], animate); });
    subIdx = 1; subtitle(animate);
    // faders follow
    ORDER.forEach(function(k){ if (faders[k]) animFader(faders[k], k === l ? UNITY : LOW); });
    if (animate && changed){
      sfx('switch');
      sig.burst = 1;
      if (!lite){ crt.classList.add('burst'); setTimeout(function(){ crt.classList.remove('burst'); }, 260); }
      try { localStorage.setItem('jin-lang', l); } catch(e){}
      try {
        var u = new URL(location.href);
        if (l === 'ko') u.searchParams.delete('lang'); else u.searchParams.set('lang', l);
        history.replaceState(null, '', u);
      } catch(e){}
      if (lite) drawStatic();
    }
  }
  function onPick(b){
    b.addEventListener('click', function(){
      var l = b.getAttribute('data-lang');
      if (l !== cur) setLang(l, true); else sfx('key');
    });
  }
  chBtns.forEach(onPick); selBtns.forEach(onPick);

  /* subtitle: the CRT "interprets" the statement into the other two languages */
  var typeRaf = 0;
  function subtitle(animate){
    var others = ORDER.filter(function(k){ return k !== cur; });
    var b = others[(subIdx - 1) % 2];
    var route = TAG[cur] + ' → ' + TAG[b];
    subTag.textContent = route; osdRoute.textContent = route;
    subText.lang = LANG_ATTR[b];
    cancelAnimationFrame(typeRaf);
    var text = CAP[b];
    if (!animate || lite){ subText.textContent = text; return; }
    var t0 = performance.now(), per = b === 'en' ? 34 : 70, pool = POOL[b];
    (function step(now){
      var n = Math.floor((now - t0) / per);
      if (n >= text.length){ subText.textContent = text; return; }
      var s = text.slice(0, n), tail = '';
      for (var i = n; i < Math.min(text.length, n + 2); i++) tail += /[\s.,，。]/.test(text[i]) ? text[i] : pool[(Math.random() * pool.length) | 0];
      subText.innerHTML = '';
      subText.appendChild(document.createTextNode(s));
      var sp = document.createElement('span'); sp.className = 'scr'; sp.textContent = tail;
      subText.appendChild(sp);
      typeRaf = requestAnimationFrame(step);
    })(t0);
  }
  if (!lite){
    setInterval(function(){
      if (!heroVis || document.hidden) return;
      subIdx = subIdx === 1 ? 2 : 1;
      subtitle(true);
    }, 5200);
  }

  function initialLang(){
    try { var q = new URLSearchParams(location.search).get('lang'); if (q && D[q]) return q; } catch(e){}
    try { var s = localStorage.getItem('jin-lang'); if (s && D[s]) return s; } catch(e){}
    var n = (navigator.language || 'ko').toLowerCase();
    if (n.indexOf('ko') === 0) return 'ko';
    if (n.indexOf('zh') === 0) return 'zh';
    return 'en';
  }

  /* ---------------------------------------------------------
     SIGNAL ENGINE — synthetic speech envelope (or the mic)
     --------------------------------------------------------- */
  var sig = {cur:0, target:0, next:0, on:false, burst:0, hist:new Float32Array(90), hi:0};
  function synth(now, dt){
    if (now > sig.next){
      if (Math.random() < 0.05){ sig.target = 0.02; sig.next = now + 420 + Math.random() * 700; }
      else {
        sig.on = !sig.on;
        sig.target = sig.on ? 0.42 + Math.random() * 0.58 : Math.random() * 0.14;
        sig.next = now + (sig.on ? 70 + Math.random() * 170 : 40 + Math.random() * 120);
      }
    }
    var src = mic.on ? micRead() : sig.target;
    var k = src > sig.cur ? 0.5 : 0.12;
    sig.cur += (src - sig.cur) * Math.min(1, k * dt / 16);
    sig.burst *= Math.pow(0.9, dt / 16);
    sig.hist[sig.hi = (sig.hi + 1) % sig.hist.length] = sig.cur;
  }
  function delayed(n){ var i = (sig.hi - n + sig.hist.length * 4) % sig.hist.length; return sig.hist[i]; }

  /* meters */
  var meterEls = {};
  strips.forEach(function(s){
    var l = s.getAttribute('data-lang');
    meterEls[l] = $$('.meter', s).map(function(m){ return {el:m, lv:0, pk:0, hold:0, slv:-1, spk:-1}; });
  });
  function chLevel(l, now){
    var f = faders[l] ? faders[l].v : 0;
    var base;
    if (l === cur) base = sig.cur;
    else {
      // interpretation channel listens to the source a beat later, quieter
      base = l === ORDER[(ORDER.indexOf(cur) + 1) % 3] ? delayed(28) * 0.55 : delayed(50) * 0.3;
    }
    return clamp((base * (0.35 + gain[l] * 1.05) * (0.25 + f * 1.05)) + sig.burst * 0.6 + 0.015, 0, 1);
  }
  function meters(now, dt){
    ORDER.forEach(function(l, ci){
      var target = chLevel(l, now);
      meterEls[l].forEach(function(m, side){
        var t = clamp(target * (side ? 0.93 + 0.07 * Math.sin(now / 97 + ci) : 0.97 + 0.03 * Math.sin(now / 71)), 0, 1);
        if (t > m.lv) m.lv += (t - m.lv) * 0.7; else m.lv -= Math.min(m.lv - t, dt * 0.0016);
        if (m.lv >= m.pk){ m.pk = m.lv; m.hold = now + 700; }
        else if (now > m.hold) m.pk = Math.max(m.lv, m.pk - dt * 0.0006);
        if (Math.abs(m.lv - m.slv) > 0.004){ m.el.style.setProperty('--lv', m.lv.toFixed(3)); m.slv = m.lv; }
        if (Math.abs(m.pk - m.spk) > 0.004){ m.el.style.setProperty('--pk', m.pk.toFixed(3)); m.spk = m.pk; }
      });
    });
    sigLed.classList.toggle('on', sig.cur > 0.55);
  }
  var sigLed = $('#sigLed');

  /* ---------------------------------------------------------
     OSCILLOSCOPE (source trace + delayed interpretation trace)
     --------------------------------------------------------- */
  var scope = $('#scope'), sctx = scope.getContext('2d');
  var sw = 0, sh = 0;
  function sizeScope(){
    var r = scope.getBoundingClientRect(), d = lite ? 1 : Math.min(DPR, 1.5);
    sw = Math.max(1, Math.round(r.width * d)); sh = Math.max(1, Math.round(r.height * d));
    if (scope.width !== sw || scope.height !== sh){ scope.width = sw; scope.height = sh; }
  }
  var FREQ = {ko:[3.1, 7.3, 13.7], en:[2.4, 5.9, 11.2], zh:[4.3, 8.9, 15.1]};
  function trace(t, amp, fq, y0, color, width, alpha){
    var n = Math.min(260, Math.round(sw / 4)), mul = 0.35 + timeBase * 2.6;
    sctx.beginPath();
    for (var i = 0; i <= n; i++){
      var x = i / n, X = x * sw;
      var y;
      if (mic.on && mic.buf && color === 0){
        var j = Math.floor(x * (mic.buf.length - 1));
        y = mic.buf[j] * 2.6 * (0.4 + gain[cur]);
      } else {
        var env = 0.6 + 0.4 * Math.sin(x * 9 + t * 0.0021);
        y = amp * env * (Math.sin((x * fq[0] * mul + t * 0.0031) * 6.283) * 0.55 +
                         Math.sin((x * fq[1] * mul - t * 0.0047) * 6.283) * 0.3 +
                         Math.sin((x * fq[2] * mul + t * 0.0071) * 6.283) * 0.15);
      }
      var Y = y0 - y * sh * 0.2;
      if (i) sctx.lineTo(X, Y); else sctx.moveTo(X, Y);
    }
    var glow = +getGlow();
    sctx.strokeStyle = color === 0 ? 'rgb(255,196,110)' : 'rgb(110,255,170)';
    sctx.lineWidth = width * 4.5; sctx.globalAlpha = alpha * (0.08 + glow * 0.22); sctx.stroke();
    sctx.lineWidth = width; sctx.globalAlpha = alpha; sctx.stroke();
    sctx.globalAlpha = 1;
  }
  var glowCache = .55;
  function getGlow(){ return dials.glow ? dials.glow.v : glowCache; }
  function drawScope(now){
    if (!sw) sizeScope();
    if (lite){ sctx.clearRect(0, 0, sw, sh); }
    else {
      sctx.globalCompositeOperation = 'destination-out';
      sctx.fillStyle = 'rgba(0,0,0,0.32)'; sctx.fillRect(0, 0, sw, sh);
      sctx.globalCompositeOperation = 'source-over';
    }
    var d = Math.min(DPR, 1.5);
    var out = ORDER[(ORDER.indexOf(cur) + 1) % 3];
    var a1 = (sig.cur * (0.4 + gain[cur]) * (0.3 + faders[cur].v)) + sig.burst * 0.8 + 0.03;
    var a2 = (delayed(28) * 0.8 * (0.4 + gain[out])) + sig.burst * 0.5 + 0.02;
    trace(now, a2, FREQ[out], sh * 0.6, 1, 1.2 * d, 0.32);
    trace(now, a1, FREQ[cur], sh * 0.6, 0, 1.6 * d, 0.5);
  }

  /* CRT noise — a few pre-baked frames, cycled */
  var noise = $('#noise'), nctx = noise.getContext('2d'), nFrames = [], nIdx = 0, nLast = 0;
  function bakeNoise(){
    var w = 320, h = 200; noise.width = w; noise.height = h;
    for (var f = 0; f < 5; f++){
      var img = nctx.createImageData(w, h), d = img.data;
      for (var i = 0; i < d.length; i += 4){
        var v = Math.random() * 255 | 0;
        d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = Math.random() < 0.5 ? 255 : 0;
      }
      nFrames.push(img);
    }
  }
  var roll = 0;
  function drawNoise(now, dt){
    if (now - nLast < 55) return;
    nLast = now;
    if (!nFrames.length) bakeNoise();
    nctx.putImageData(nFrames[nIdx = (nIdx + 1) % nFrames.length], 0, 0);
    roll = (roll + dt * 0.02) % 130;
    nctx.fillStyle = 'rgba(255,255,255,0.10)';
    nctx.fillRect(0, (roll - 15) * 2, 320, 24);
  }

  /* timecode */
  var tcEl = $('#tc'), t0 = performance.now(), lastTc = '';
  function timecode(now){
    var ms = now - t0, s = Math.floor(ms / 1000), f = Math.floor(ms / 1000 * 30) % 30;
    var str = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60) + ':' + pad(f);
    if (str !== lastTc){ tcEl.textContent = str; lastTc = str; }
  }

  /* static frame for light mode */
  function drawStatic(){
    sizeScope();
    sig.cur = 0.55; sig.burst = 0;
    for (var i = 0; i < sig.hist.length; i++) sig.hist[i] = 0.5;
    drawScope(1000);
    ORDER.forEach(function(l){
      var v = chLevel(l, 0);
      meterEls[l].forEach(function(m){ m.lv = m.pk = v; m.el.style.setProperty('--lv', v.toFixed(3)); m.el.style.setProperty('--pk', v.toFixed(3)); });
    });
  }

  /* ---------------------------------------------------------
     TRACKS — press play: waveform rolls, story + photo appear
     --------------------------------------------------------- */
  function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function waveData(seed, n){
    var r = rng(seed), a = [], env = 0.5, tgt = 0.6, k = 0;
    for (var i = 0; i < n; i++){
      if (k-- <= 0){ k = 2 + (r() * 7 | 0); tgt = r() < 0.12 ? 0.06 : 0.3 + r() * 0.7; }
      env += (tgt - env) * 0.45;
      a.push(clamp(env * (0.7 + r() * 0.3), 0.04, 1));
    }
    return a;
  }
  var DUR = 30000; // a "track" loops every 30 s
  var tracks = $$('.track').map(function(el, i){
    var tr = {
      el:el, i:i, btn:$('.trk-play', el), head:$('.trk-head', el),
      mini:$('.trk-mini', el), wave:$('.trk-wave', el), tc:$('.tp-tc', el),
      data:waveData(+el.getAttribute('data-seed') || i * 7 + 3, 600),
      open:false, t0:0, prog:0, vis:false, lastMini:0
    };
    tr.btn.addEventListener('click', function(e){ e.stopPropagation(); toggle(tr); });
    tr.head.addEventListener('click', function(e){
      if (window.getSelection && String(window.getSelection()).length) return;
      toggle(tr);
    });
    return tr;
  });
  var playing = null;
  function sizeCanvas(c){
    var r = c.getBoundingClientRect(), w = Math.max(1, Math.round(r.width * DPR)), h = Math.max(1, Math.round(r.height * DPR));
    if (c.width !== w || c.height !== h){ c.width = w; c.height = h; }
    return [w, h];
  }
  function drawMini(tr, prog){
    var c = tr.mini; if (!c.offsetParent) return;
    var s = sizeCanvas(c), w = s[0], h = s[1], x = c.getContext('2d');
    x.clearRect(0, 0, w, h);
    var bw = 2 * DPR, gap = 1.5 * DPR, n = Math.floor(w / (bw + gap)), pc = Math.floor(n * prog);
    for (var i = 0; i < n; i++){
      var v = tr.data[Math.floor(i / n * tr.data.length)];
      var bh = Math.max(DPR, v * h * 0.92);
      x.fillStyle = i < pc ? '#ffb21e' : (tr.open ? '#6b7178' : '#4a4f55');
      x.fillRect(i * (bw + gap), (h - bh) / 2, bw, bh);
    }
  }
  function drawWave(tr, now){
    var c = tr.wave; if (!c.offsetParent) return;
    var s = sizeCanvas(c), w = s[0], h = s[1], x = c.getContext('2d');
    x.clearRect(0, 0, w, h);
    var el = playing === tr ? (now - tr.t0) : 0;
    var prog = (el % DUR) / DUR;
    var bw = 3 * DPR, gap = 2 * DPR, step = bw + gap, n = Math.ceil(w / step) + 1;
    var head = Math.round(w * 0.32);
    var shift = el / 1000 * 18; // bars per second
    var off = (shift % 1) * step;
    var base = Math.floor(shift);
    var live = playing === tr ? sig.cur : 0;
    for (var i = 0; i < n; i++){
      var X = i * step - off;
      var idx = (base + i) % tr.data.length;
      var v = tr.data[idx];
      var near = Math.abs(X - head) < step * 2.5;
      if (near && playing === tr) v = clamp(v * (0.7 + live * 0.8), 0.05, 1);
      var bh = Math.max(DPR * 2, v * h * 0.9);
      x.fillStyle = X < head ? 'rgba(255,178,30,.95)' : 'rgba(150,156,163,.45)';
      x.fillRect(X, (h - bh) / 2, bw, bh);
    }
    x.fillStyle = '#ff4130';
    x.fillRect(head, 0, 2 * DPR, h);
    x.fillStyle = 'rgba(255,65,48,.25)';
    x.fillRect(head - 3 * DPR, 0, 8 * DPR, h);
    var secs = el / 1000, f = Math.floor(secs * 30) % 30;
    tr.tc.textContent = pad(Math.floor(secs / 60) % 60) + ':' + pad(Math.floor(secs) % 60) + ':' + pad(f);
    tr.prog = prog;
    if (now - tr.lastMini > 120 || !playing){ drawMini(tr, prog); tr.lastMini = now; }
  }
  function openTrack(tr, opts){
    tr.open = true;
    tr.el.classList.add('open');
    tr.btn.setAttribute('aria-expanded', 'true');
    tr.btn.setAttribute('aria-label', 'Stop track ' + pad(tr.i + 1));
    if (opts.anim && !lite){
      tr.el.classList.remove('anim'); void tr.el.offsetWidth; tr.el.classList.add('anim');
      clearTimeout(tr.at); tr.at = setTimeout(function(){ tr.el.classList.remove('anim'); }, 1100);
    }
    if (opts.play && !lite){
      if (playing && playing !== tr) stopPlay(playing);
      playing = tr; tr.t0 = performance.now();
      tr.el.classList.add('playing');
      kick();
    }
    requestAnimationFrame(function(){ drawWave(tr, performance.now()); drawMini(tr, tr.prog); });
  }
  function stopPlay(tr){
    tr.el.classList.remove('playing');
    if (playing === tr) playing = null;
  }
  function closeTrack(tr){
    stopPlay(tr);
    tr.open = false; tr.prog = 0;
    tr.el.classList.remove('open', 'anim');
    tr.btn.setAttribute('aria-expanded', 'false');
    tr.btn.setAttribute('aria-label', 'Play track ' + pad(tr.i + 1));
    tr.tc.textContent = '00:00:00';
    drawMini(tr, 0);
  }
  function toggle(tr){
    if (tr.open){ sfx('stop'); closeTrack(tr); }
    else { sfx('play'); openTrack(tr, {anim:true, play:true}); }
    updateAllLabel();
  }
  var allBtn = $('#allBtn'), allT = $('.key-t', allBtn);
  allT.id = 'allBtnT';
  function updateAllLabel(){
    var allOpen = tracks.every(function(t){ return t.open; });
    allBtn.setAttribute('aria-pressed', String(allOpen));
    allT.textContent = U[cur][allOpen ? 'none' : 'all'];
  }
  allBtn.addEventListener('click', function(){
    sfx('key');
    var allOpen = tracks.every(function(t){ return t.open; });
    tracks.forEach(function(t){ if (allOpen) closeTrack(t); else if (!t.open) openTrack(t, {anim:false, play:false}); });
    updateAllLabel();
  });

  /* ---------------------------------------------------------
     MAIN LOOP — runs only while something visible needs it
     --------------------------------------------------------- */
  var heroVis = true, running = false, last = 0, reelA = 0;
  var fps = {n:0, sum:0, done:H.classList.contains('fx-forced') || lite, start:0};
  function need(){
    if (document.hidden) return false;
    if (mic.on) return true;
    if (lite) return false;
    return heroVis || (playing && playing.vis);
  }
  function kick(){
    if (running || !need()) return;
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  }
  function frame(now){
    var raw = now - last, dt = Math.min(64, raw); last = now;
    synth(now, dt);
    if (heroVis){
      meters(now, dt);
      drawScope(now);
      if (!lite) drawNoise(now, dt);
      timecode(now);
    }
    if (playing && playing.vis){
      drawWave(playing, now);
      reelA += dt * 0.25; setReels();
    }
    if (!fps.done){
      if (!fps.start) fps.start = now;
      if (now - fps.start > 700){ fps.n++; fps.sum += Math.min(raw, 250); }
      if (fps.n >= 60 || (fps.n >= 8 && now - fps.start > 3500)){
        fps.done = true;
        if (fps.sum / fps.n > 34){ setLite(true, true); }
      }
    }
    if (need()) requestAnimationFrame(frame); else running = false;
  }
  document.addEventListener('visibilitychange', kick);

  /* FX switch (full effects / light mode) */
  var fxBtn = $('#fxBtn');
  function setLite(on, auto){
    lite = on;
    H.classList.toggle('lite', on);
    fxBtn.setAttribute('aria-pressed', String(!on));
    sizeScope();
    if (on){
      if (playing) stopPlay(playing);
      drawStatic();
      if (auto) toast(U[cur].liteAuto);
    } else {
      H.classList.add('fx-forced'); fps.done = true;
      kick();
    }
  }
  fxBtn.setAttribute('aria-pressed', String(!lite));
  fxBtn.addEventListener('click', function(){
    sfx('switch');
    setLite(!lite, false);
    try { localStorage.setItem('jin-fx', lite ? 'off' : 'on'); } catch(e){}
    toast(U[cur][lite ? 'liteOn' : 'liteOff']);
  });

  /* ---------------------------------------------------------
     OBSERVERS: hero visibility, tracks, sections, LCDs, contact
     --------------------------------------------------------- */
  var hasIO = 'IntersectionObserver' in window;
  if (hasIO){
    new IntersectionObserver(function(es){
      heroVis = es[0].isIntersecting;
      kick();
    }, {rootMargin:'0px 0px -10% 0px'}).observe(crt);

    var tIO = new IntersectionObserver(function(es){
      es.forEach(function(e){
        var tr = tracks.filter(function(t){ return t.el === e.target; })[0];
        if (tr){ tr.vis = e.isIntersecting; if (tr.vis) kick(); }
      });
    });
    tracks.forEach(function(t){ tIO.observe(t.el); });

    // section label on the rail
    var railSec = $('#railSec');
    var sIO = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) railSec.textContent = e.target.getAttribute('data-sec'); });
    }, {rootMargin:'-45% 0px -55% 0px'});
    $$('[data-sec]').forEach(function(s){ sIO.observe(s); });

    // power-on reveal
    var pwEls = $$('.sec-head, .brief, .lcd, .track, .input, .cred, .rows, .jack, .talkback, .tr-bar');
    pwEls.forEach(function(el){ el.classList.add('pw'); });
    var pIO = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (!e.isIntersecting) return;
        var el = e.target;
        var sib = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
        el.style.transitionDelay = (lite ? 0 : Math.min(sib, 6) * 45) + 'ms';
        el.classList.add('on');
        if (el.classList.contains('jack')){ el.classList.add('lit'); setTimeout(function(){ el.classList.remove('lit'); }, 900 + sib * 60); }
        pIO.unobserve(el);
      });
    }, {threshold:0.08, rootMargin:'0px 0px -4% 0px'});
    pwEls.forEach(function(el){ pIO.observe(el); });

    // LCD count-up
    if (!lite){
      var cIO = new IntersectionObserver(function(es){
        es.forEach(function(e){
          if (!e.isIntersecting) return;
          cIO.unobserve(e.target);
          var v = $('.v', e.target), n = +e.target.getAttribute('data-count'), s0 = performance.now();
          (function run(now){
            var p = Math.min(1, (now - s0) / 1400), k = 1 - Math.pow(1 - p, 3);
            v.textContent = pad(p < 1 ? Math.floor(n * k + Math.random() * 3 * (1 - p)) : n);
            if (p < 1) requestAnimationFrame(run);
          })(s0);
        });
      }, {threshold:0.6});
      $$('[data-count]').forEach(function(el){ $('.v', el).textContent = '00'; cIO.observe(el); });
    }

    // talkback lamp
    var lamp = $('#tbLamp');
    new IntersectionObserver(function(es){
      lamp.classList.toggle('on', es[0].isIntersecting);
    }, {threshold:0.25}).observe($('#contact'));
  } else {
    $$('.track').forEach(function(t){ t.classList.add('on'); });
  }

  /* ---------------------------------------------------------
     SCROLL: rail progress, tape counter, reels
     --------------------------------------------------------- */
  var prog = $('#railProg'), counter = $('#railCounter'), reelL = $('#reelL'), reelR = $('#reelR'), ticking = false, lastY = window.scrollY;
  function setReels(){
    reelL.style.setProperty('--r', reelA.toFixed(1) + 'deg');
    reelR.style.setProperty('--r', (reelA * 0.8).toFixed(1) + 'deg');
  }
  function onScroll(){
    var de = document.documentElement, max = de.scrollHeight - de.clientHeight, y = window.scrollY;
    var p = max > 0 ? y / max : 0;
    prog.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    counter.textContent = pad(Math.round(p * 9999), 4);
    if (!reduce){ reelA += (y - lastY) * 0.6; setReels(); }
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(onScroll); } }, {passive:true});

  /* ---------------------------------------------------------
     COPY BUTTONS
     --------------------------------------------------------- */
  $$('.copy').forEach(function(btn){
    var label = $('span[data-i18n]', btn);
    btn.addEventListener('click', function(){
      var val = btn.getAttribute('data-copy');
      sfx('key');
      function ok(){
        btn.classList.add('done');
        label.textContent = D[cur]['ui.copied'];
        clearTimeout(btn._t);
        btn._t = setTimeout(function(){ btn.classList.remove('done'); label.innerHTML = D[cur]['ui.copy']; }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(val).then(ok, function(){});
      } else {
        try {
          var ta = document.createElement('textarea'); ta.value = val; document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta); ok();
        } catch(e){}
      }
    });
  });

  /* generic key press sound */
  $$('.key-cta, .btn, .plate, .foot a').forEach(function(b){ b.addEventListener('click', function(){ sfx('key'); }); });

  /* ---------------------------------------------------------
     BOOT
     --------------------------------------------------------- */
  setLang(initialLang(), false);
  ORDER.forEach(function(k){ setFaderV(faders[k], k === cur ? UNITY : LOW); });
  updateAllLabel();
  onScroll();
  var resizeT = 0;
  window.addEventListener('resize', function(){
    clearTimeout(resizeT);
    resizeT = setTimeout(function(){
      sizeScope();
      tracks.forEach(function(t){ drawMini(t, t.prog); if (t.open) drawWave(t, performance.now()); });
      if (lite) drawStatic();
    }, 120);
  });
  function afterFonts(){
    sizeScope();
    tracks.forEach(function(t){ drawMini(t, 0); });
    if (lite) drawStatic();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(afterFonts); else afterFonts();
  if (!lite){
    crt.classList.add('boot');
    setTimeout(function(){ crt.classList.remove('boot'); }, 1000);
    kick();
  } else {
    drawStatic();
  }
})();
