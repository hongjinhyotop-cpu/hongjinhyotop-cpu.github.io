/* ==========================================================================
   BABEL — the tower where scattered languages are put back together.
   Full mode : Three.js letter particles + tower climb, GSAP/ScrollTrigger, Lenis
   Lite mode : same content, static glyphs, no WebGL (reduced motion / low-end)
   ========================================================================== */
import { D } from './i18n.js';

const CDN = {
  three: 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js',
  gsap: 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js',
  st: 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js',
  lenis: 'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js'
};

const root = document.documentElement;
const Q = new URLSearchParams(location.search);
const R = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const SMALL = () => innerWidth < 900;
const MOBILE = matchMedia('(max-width: 899px), (pointer: coarse)').matches;
const NODEGRADE = Q.has('nodegrade');

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const LANG_ATTR = { ko: 'ko', en: 'en', zh: 'zh-Hans' };
const ORDER = ['ko', 'en', 'zh'];
const WORDS = { ko: '말', en: 'Words', zh: '话' };
const ST = { ko: ['말은 달라도,', '뜻은 하나로.'], en: ['Different words.', 'One meaning.'], zh: ['言语不同，', '心意相通。'] };

let STAGE = null, FX = null, RIPPLE = null, lenis = null, gsap = null;
const hooks = { lang: [], zone: [] };

/* ==========================================================================
   i18n  (Korean is read from the page, EN / 中文 from i18n.js)
   ========================================================================== */
const i18nEls = $$('[data-i18n]');
i18nEls.forEach(el => {
  const k = el.dataset.i18n;
  if (!(k in D.ko)) D.ko[k] = el.innerHTML.replace(/\s+/g, ' ').trim();
});
const langGroup = $('.langs'), langBtns = $$('.langs button'), stEl = $('#heroStatement');
let cur = 'ko';

function applyLang(l) {
  cur = l;
  root.lang = LANG_ATTR[l];
  langGroup.dataset.active = l;
  langBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
  i18nEls.forEach(el => {
    const h = D[l][el.dataset.i18n];
    if (h != null && el.innerHTML !== h) el.innerHTML = h;
  });
  stEl.lang = LANG_ATTR[l];
  stEl.innerHTML = ST[l].map(s => `<span>${s}</span>`).join(' ');
}

function setLang(l, animate) {
  if (!D[l]) l = 'ko';
  if (animate && l === cur) return;
  const from = cur;
  if (animate && FX && root.classList.contains('full')) FX.transition(from, l, () => applyLang(l));
  else if (animate && !R) liteSwap(() => applyLang(l));
  else applyLang(l);
  hooks.lang.forEach(f => f(l, animate));
}

function liteSwap(fn) {
  const els = [...i18nEls, stEl];
  els.forEach(el => { el.style.opacity = '0'; });
  setTimeout(() => { fn(); els.forEach(el => { el.style.opacity = ''; }); }, 220);
}

langBtns.forEach(b => b.addEventListener('click', () => {
  const l = b.dataset.lang;
  if (l === cur) return;
  setLang(l, true);
  try { localStorage.setItem('jin-lang', l); } catch (e) {}
  try {
    const u = new URL(location.href);
    if (l === 'ko') u.searchParams.delete('lang'); else u.searchParams.set('lang', l);
    history.replaceState(null, '', u);
  } catch (e) {}
}));

function initialLang() {
  try { const q = Q.get('lang'); if (q && D[q]) return q; } catch (e) {}
  try { const s = localStorage.getItem('jin-lang'); if (s && D[s]) return s; } catch (e) {}
  const n = (navigator.language || 'ko').toLowerCase();
  if (n.startsWith('ko')) return 'ko';
  if (n.startsWith('zh')) return 'zh';
  return 'en';
}
applyLang(initialLang());

/* ---------- copy buttons ---------- */
$$('.copy').forEach(btn => btn.addEventListener('click', () => {
  const val = btn.dataset.copy;
  const ok = () => {
    btn.classList.add('done');
    btn.textContent = D[cur]['ui.copied'];
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = D[cur]['ui.copy']; }, 1600);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(val).then(ok, () => {});
  else {
    try {
      const ta = document.createElement('textarea'); ta.value = val; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta); ok();
    } catch (e) {}
  }
}));

/* ---------- mode toggle link in footer ---------- */
(() => {
  const a = $('#modeToggle'); if (!a) return;
  const u = new URL(location.href);
  const isFull = root.classList.contains('full');
  u.searchParams.delete(isFull ? 'full' : 'lite');
  u.searchParams.set(isFull ? 'lite' : 'full', '');
  a.href = u.pathname + u.search.replace(/=(&|$)/g, '$1') + u.hash;
  a.textContent = isFull ? 'Motion: Full → Lite' : 'Motion: Lite → Full';
})();

/* ==========================================================================
   Zones: which "floor" of the tower is at the reading line
   ========================================================================== */
const hero = $('#top'), dirSec = $('#work'), contactSec = $('#contact');
const floors = $$('.floor');
const zones = [
  { el: hero, key: 'hero', id: 'top', no: 'G', han: '通', txt: 'Ground' },
  { el: dirSec, key: 'scatter', id: 'work', no: 'G', han: '經', txt: 'Directory' },
  ...floors.map((f, i) => ({
    el: f, key: 'floor', i, id: f.id, glyph: f.dataset.glyph, side: f.dataset.side,
    no: 'F' + String(i + 1).padStart(2, '0'), han: f.dataset.glyph, txt: $('.f-dom', f).textContent.replace(f.dataset.glyph, '').trim()
  })),
  { el: contactSec, key: 'contact', id: 'contact', glyph: '通', side: 'l', no: 'TOP', han: '通', txt: 'Summit — Contact' }
];
let zone = zones[0];
const chipNo = $('#chipNo'), chipHan = $('#chipHan'), chipTxt = $('#chipTxt'), rail = $('.rail');
const railLinks = $$('.rail a');

function setZone(z) {
  if (z === zone) return;
  zone = z;
  chipNo.textContent = z.no; chipHan.textContent = z.han; chipTxt.textContent = z.txt;
  rail.classList.toggle('on', z.key === 'floor' || z.key === 'contact');
  railLinks.forEach(a => a.classList.toggle('on', a.dataset.zone === z.id));
  hooks.zone.forEach(f => f(z));
}
function zoneAtLine() {
  const line = innerHeight * (SMALL() ? 0.42 : 0.5);
  for (let i = zones.length - 1; i >= 0; i--) {
    const r = zones[i].el.getBoundingClientRect();
    if (r.top <= line) return zones[i];
  }
  return zones[0];
}
let zoneTick = false;
addEventListener('scroll', () => {
  if (zoneTick) return; zoneTick = true;
  requestAnimationFrame(() => { zoneTick = false; setZone(zoneAtLine()); progress(); });
}, { passive: true });
const prog = $('#prog');
function progress() {
  const max = root.scrollHeight - innerHeight;
  prog.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max, 0, 1) : 0})`;
}
setZone(zoneAtLine()); progress();

/* ==========================================================================
   Lite hero: a CSS word that cycles 말 → Words → 话
   ========================================================================== */
const heroWord = $('#heroWord'), heroLangs = $$('#heroLangs li');
function markHeroLang(l) { heroLangs.forEach(li => li.classList.toggle('on', li.dataset.l === l)); }
let liteIdx = 0, liteTimer = 0;
function liteHeroCycle() {
  if (root.classList.contains('full') || R) return;
  liteTimer = setTimeout(() => {
    if (!root.classList.contains('full')) {
      heroWord.classList.add('swap');
      setTimeout(() => {
        liteIdx = (liteIdx + 1) % 3;
        const l = ORDER[liteIdx];
        heroWord.textContent = WORDS[l];
        heroWord.classList.toggle('latin', l === 'en');
        markHeroLang(l);
        heroWord.classList.remove('swap');
      }, 480);
    }
    liteHeroCycle();
  }, 3200);
}
function toLiteVisuals() {
  clearTimeout(liteTimer);
  liteHeroCycle();
}

/* ==========================================================================
   Boot
   ========================================================================== */
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = () => res(); s.onerror = () => rej(new Error('load ' + src));
    document.head.appendChild(s);
  });
}
function fontsReady() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const all = Promise.all([
    document.fonts.load('900 120px "Noto Serif KR"', '말演仲海酒齒金醫軍通'),
    document.fonts.load('900 120px "Noto Serif SC"', '话'),
    document.fonts.load('italic 800 120px "Fraunces"', 'Words'),
    document.fonts.load('500 60px "Noto Sans KR"', '말글뜻ABC'),
    document.fonts.load('500 60px "Noto Sans SC"', '话语言')
  ]).catch(() => {});
  return Promise.race([all, new Promise(r => setTimeout(r, 3000))]);
}

async function boot() {
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000));
  const libs = Promise.all([
    import(CDN.three),
    loadScript(CDN.gsap).then(() => loadScript(CDN.st)),
    loadScript(CDN.lenis)
  ]);
  const [THREE] = await Promise.race([libs, timeout]);
  await fontsReady();
  initMotion();
  STAGE = initStage(THREE);
  FX = initFX();
  if (FINE) RIPPLE = initRipple(THREE);
}

function goLite(reason) {
  root.classList.remove('full');
  root.classList.add('lite');
  root.dataset.mode = reason;
  if (STAGE) { STAGE.dispose(); STAGE = null; }
  if (RIPPLE) { RIPPLE.dispose(); RIPPLE = null; }
  FX = null;
  toLiteVisuals();
}

if (root.classList.contains('full')) {
  boot().catch(err => { console.warn('[babel] falling back to lite mode:', err && err.message); goLite('fallback'); });
} else {
  liteHeroCycle();
  // Lite: plain anchor scrolling is handled by CSS scroll-behavior.
}

/* ==========================================================================
   Motion layer: Lenis, ScrollTrigger reveals, magnetic, skew, cursor
   ========================================================================== */
function initMotion() {
  gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const t = id === '#top' ? 0 : $(id);
    if (t == null) return;
    e.preventDefault();
    lenis.scrollTo(t, { offset: 0, duration: 1.6, easing: x => 1 - Math.pow(1 - x, 4) });
    if (t !== 0 && t.focus) { t.setAttribute('tabindex', '-1'); setTimeout(() => t.focus({ preventScroll: true }), 900); }
  });

  /* reveals */
  gsap.from('.rv-h', { y: 40, opacity: 0, duration: 1.3, stagger: .12, ease: 'power3.out', delay: .15 });
  gsap.from('.hero-langs', { y: 16, opacity: 0, duration: 1, ease: 'power3.out', delay: .9 });
  $$('.card').forEach(card => {
    gsap.from(card, { y: 70, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 94%', once: true } });
    const m = $('.media', card);
    if (m && !m.classList.contains('c-portrait')) gsap.fromTo(m, { clipPath: 'inset(0 0 100% 0 round 10px)' }, {
      clipPath: 'inset(0 0 0% 0 round 10px)', duration: 1.4, ease: 'expo.out', clearProps: 'clipPath',
      scrollTrigger: { trigger: m, start: 'top 92%', once: true }
    });
  });
  hooks.lang.push(() => setTimeout(() => ScrollTrigger.refresh(), 700));
  gsap.from('.dir-row', { opacity: 0, x: -28, duration: .8, stagger: .06, ease: 'power3.out', scrollTrigger: { trigger: '.dir-list', start: 'top 88%', once: true } });

  /* scroll-velocity skew on display type */
  const skewEls = $$('.skew'), visible = new Set();
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) visible.add(e.target);
    else { visible.delete(e.target); e.target.style.transform = ''; }
  }));
  skewEls.forEach(el => io.observe(el));
  let sk = 0;
  gsap.ticker.add((t, dms) => {
    const dt = Math.min(dms, 50) / 1000;
    const v = lenis.velocity || 0;
    sk = damp(sk, clamp(-v * 0.16, -9, 9), 10, dt);
    const s = Math.abs(sk) < 0.02 ? '' : `skewY(${sk.toFixed(2)}deg)`;
    visible.forEach(el => { if (el.style.transform !== s) el.style.transform = s; });
  });

  /* magnetic buttons */
  if (FINE) {
    const mags = $$('[data-magnetic]').map(el => ({ el, k: +el.dataset.magnetic || .3, x: 0, y: 0, tx: 0, ty: 0 }));
    addEventListener('pointermove', e => {
      mags.forEach(m => {
        const r = m.el.getBoundingClientRect();
        const cx = r.left + r.width / 2 - m.x, cy = r.top + r.height / 2 - m.y;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        // pull only while the pointer is on (or just around) the element, and never far
        // enough to cover a neighbouring control
        const reach = Math.max(r.width, r.height) / 2 + 28, cap = Math.min(16, Math.min(r.width, r.height) * .3);
        if (Math.hypot(dx, dy) < reach) { m.tx = clamp(dx * m.k, -cap, cap); m.ty = clamp(dy * m.k, -cap, cap); }
        else { m.tx = 0; m.ty = 0; }
      });
    }, { passive: true });
    gsap.ticker.add((t, dms) => {
      const dt = Math.min(dms, 50) / 1000;
      mags.forEach(m => {
        const nx = damp(m.x, m.tx, 9, dt), ny = damp(m.y, m.ty, 9, dt);
        if (Math.abs(nx - m.x) + Math.abs(ny - m.y) < 0.01 && !m.tx && !m.ty && !m.x && !m.y) return;
        m.x = Math.abs(nx) < 0.05 && !m.tx ? 0 : nx; m.y = Math.abs(ny) < 0.05 && !m.ty ? 0 : ny;
        m.el.style.transform = m.x || m.y ? `translate3d(${m.x.toFixed(2)}px,${m.y.toFixed(2)}px,0)` : '';
      });
    });

    /* cursor ring */
    const ring = $('.cursor');
    let cx = -100, cy = -100, rx = -100, ry = -100;
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      cx = e.clientX; cy = e.clientY;
      ring.classList.add('on');
      ring.classList.toggle('hot', !!e.target.closest('a, button, .rp-host'));
    }, { passive: true });
    document.addEventListener('pointerleave', () => ring.classList.remove('on'));
    gsap.ticker.add((t, dms) => {
      const dt = Math.min(dms, 50) / 1000;
      rx = damp(rx, cx, 18, dt); ry = damp(ry, cy, 18, dt);
      ring.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0)`;
    });
  }
}

/* ==========================================================================
   WebGL stage
   ========================================================================== */
const PAL = {
  parch: [0.95, 0.92, 0.85],
  gold: [0.96, 0.73, 0.36],
  lapis: [0.44, 0.53, 1.0]
};
const ATLAS_CHARS = Array.from('말글뜻통역언소리한빛길꿈나라다리하로우AEGHKLMNRSTWYabdeghnrsw话语言通译文字心意相同巴别塔天人和信行中华').slice(0, 64);

function makeAtlas(THREE) {
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S * 8;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ATLAS_CHARS.forEach((ch, i) => {
    const x = (i % 8) * S + S / 2, y = Math.floor(i / 8) * S + S / 2;
    ctx.font = `500 ${S * 0.66}px "Noto Sans KR", "Noto Sans SC", sans-serif`;
    ctx.fillText(ch, x, y + S * 0.03);
  });
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  t.anisotropy = 1;
  t.needsUpdate = true;
  return t;
}

const FRAG_CHARS = /* glsl */`
  uniform sampler2D uAtlas;
  varying vec3 vCol; varying float vChar; varying float vA; varying float vSize;
  void main(){
    vec2 pc = gl_PointCoord;
    float cell = floor(vChar + .5);
    vec2 uv = (vec2(mod(cell, 8.), floor(cell / 8.)) + clamp(pc, .04, .96)) / 8.;
    float g = texture2D(uAtlas, uv).r;
    float dotA = 1. - smoothstep(.12, .5, length(pc - .5));
    float a = mix(dotA * .85, g * 1.15, smoothstep(3.5, 8., vSize));
    gl_FragColor = vec4(vCol * a * vA, 1.);
  }`;

const VERT_GLYPH = /* glsl */`
  attribute vec3 aFrom; attribute vec4 aRnd; attribute float aChar;
  uniform float uTime, uProg, uScatter, uBurst, uPx, uDpr, uGD, uAlpha, uMouseOn, uRepelR, uRepelS;
  uniform vec2 uMouse; uniform vec3 uColA, uColB;
  varying vec3 vCol; varying float vChar; varying float vA; varying float vSize;
  void main(){
    float d = aRnd.x * .35;
    float t = clamp((uProg - d) / .65, 0., 1.);
    float e = t < .5 ? 4. * t * t * t : 1. - pow(-2. * t + 2., 3.) / 2.;
    vec3 p = mix(aFrom, position, e);
    float s = sin(3.14159 * t);
    vec3 dir = normalize(aRnd.yzw - .5 + 1e-4);
    p += dir * s * uScatter * (.5 + aRnd.x);
    p.xy += vec2(-dir.y, dir.x) * s * uScatter * .6;
    p += vec3(sin(uTime * .9 + aRnd.y * 6.283), cos(uTime * .7 + aRnd.z * 6.283), sin(uTime * .5 + aRnd.w * 6.283)) * .025 * uGD / 14.;
    p += dir * uBurst * (1.2 + 2.4 * aRnd.x) * uGD / 14.;
    vec2 dm = p.xy - uMouse; float dl = length(dm);
    float f = uMouseOn * smoothstep(uRepelR, 0., dl);
    p.xy += (dm / max(dl, 1e-3)) * f * uRepelS * (.6 + aRnd.y * .8);
    p.z += f * 1.6 * (aRnd.z - .2);
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    float size = uPx * uDpr * (.6 + aRnd.w * .8) * (1. + f * 1.1 + uBurst * .8) * (uGD / max(-mv.z, .1));
    gl_PointSize = size; vSize = size;
    float heat = clamp(f * 1.4 + s * .7 + uBurst, 0., 1.);
    vCol = mix(uColA, uColB, heat);
    vA = uAlpha * (.55 + .45 * aRnd.y);
    vChar = aChar;
  }`;

const VERT_TOWER = /* glsl */`
  attribute vec4 aRnd; attribute float aChar; attribute vec2 aInfo;
  uniform float uTime, uPx, uDpr, uFloor, uFade;
  uniform vec3 uLapis, uGold, uParch;
  varying vec3 vCol; varying float vChar; varying float vA; varying float vSize;
  void main(){
    vec3 p = position;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    float z = -mv.z;
    gl_Position = projectionMatrix * mv;
    float glow = 1. - smoothstep(0., 1.1, abs(aInfo.x - uFloor));
    float size = uPx * uDpr * (.6 + aRnd.x * .9) * (1. + glow * .5) * 24. / max(z, .5);
    gl_PointSize = min(size, 34. * uDpr); vSize = gl_PointSize;
    float tw = .5 + .5 * sin(uTime * (.5 + aRnd.y * 1.7) + aRnd.z * 6.283);
    vA = (.35 + .65 * tw) * smoothstep(120., 22., z) * smoothstep(2., 7., z) * uFade;
    vec3 c = mix(uLapis, uParch, .3 * aRnd.w);
    c = mix(c, uGold, step(.5, aInfo.y) * .7);
    c = mix(c, uGold * 1.2, glow * .8);
    vCol = c * (1.05 + glow * .9);
    vChar = aChar;
  }`;

const VERT_DUST = /* glsl */`
  attribute vec4 aRnd; attribute float aChar;
  uniform float uTime, uPx, uDpr, uFade; uniform vec3 uParch;
  varying vec3 vCol; varying float vChar; varying float vA; varying float vSize;
  void main(){
    vec3 p = position;
    p.y = mod(p.y + 14. + uTime * (.25 + aRnd.x * .6), 68.) - 14.;
    float a = uTime * .03 * (aRnd.y - .5);
    p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    float z = -mv.z;
    gl_Position = projectionMatrix * mv;
    float size = uPx * uDpr * (.5 + aRnd.w) * 24. / max(z, .5);
    gl_PointSize = min(size, 40. * uDpr); vSize = gl_PointSize;
    vA = (.35 + .45 * aRnd.z) * smoothstep(90., 20., z) * smoothstep(1.5, 6., z) * uFade;
    vCol = uParch;
    vChar = aChar;
  }`;

const POST_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const POST_FRAG = /* glsl */`
  uniform sampler2D tDiffuse; uniform vec2 uMouse, uVel; uniform float uAspect, uOn, uTime;
  varying vec2 vUv;
  void main(){
    vec2 uv = vUv;
    vec2 d = uv - uMouse; d.x *= uAspect;
    float r = length(d);
    float f = smoothstep(.34, 0., r) * uOn;
    vec2 off = -d * f * f * .32;
    off -= uVel * f * 1.6;
    off += vec2(sin(uv.y * 30. + uTime * 3.), cos(uv.x * 26. + uTime * 2.4)) * .0035 * f;
    off.x /= uAspect;
    vec2 s = uv + off;
    float ca = f * .007 + length(uVel) * f * .25;
    vec3 col = vec3(texture2D(tDiffuse, s + vec2(ca, 0.)).r, texture2D(tDiffuse, s).g, texture2D(tDiffuse, s - vec2(ca, 0.)).b);
    float v = smoothstep(1.35, .3, length((vUv - .5) * vec2(uAspect, 1.)));
    col *= mix(.5, 1., v);
    gl_FragColor = vec4(col, 1.);
  }`;

function initStage(THREE) {
  const canvas = $('#stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x07080d, 1);
  let dprCap = MOBILE ? 1.5 : 2;
  let dpr = Math.min(devicePixelRatio || 1, dprCap);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 300);
  scene.add(camera);
  const atlas = makeAtlas(THREE);
  const COUNT = MOBILE ? { glyph: 3400, tower: 5200, dust: 900 } : { glyph: 9000, tower: 13000, dust: 2600 };
  const TH = 4.2, TIERS = 8, GD = 14;
  const FOVT = Math.tan(THREE.MathUtils.degToRad(20));

  /* ----- glyph particles (camera-attached) ----- */
  const gN = COUNT.glyph;
  const gFrom = new Float32Array(gN * 3), gTo = new Float32Array(gN * 3), gRnd = new Float32Array(gN * 4), gChar = new Float32Array(gN);
  for (let i = 0; i < gN; i++) {
    gRnd[i * 4] = Math.random(); gRnd[i * 4 + 1] = Math.random(); gRnd[i * 4 + 2] = Math.random(); gRnd[i * 4 + 3] = Math.random();
    gChar[i] = Math.floor(Math.random() * 64);
    const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 10;
    gFrom[i * 3] = gTo[i * 3] = Math.cos(a) * r;
    gFrom[i * 3 + 1] = gTo[i * 3 + 1] = Math.sin(a) * r * .6;
    gFrom[i * 3 + 2] = gTo[i * 3 + 2] = (Math.random() - .5) * 6;
  }
  const gGeo = new THREE.BufferGeometry();
  const toAttr = new THREE.BufferAttribute(gTo, 3), fromAttr = new THREE.BufferAttribute(gFrom, 3);
  gGeo.setAttribute('position', toAttr);
  gGeo.setAttribute('aFrom', fromAttr);
  gGeo.setAttribute('aRnd', new THREE.BufferAttribute(gRnd, 4));
  gGeo.setAttribute('aChar', new THREE.BufferAttribute(gChar, 1));
  const gU = {
    uTime: { value: 0 }, uProg: { value: 0 }, uScatter: { value: 2.2 }, uBurst: { value: 0 },
    uPx: { value: MOBILE ? 4.6 : 7 }, uDpr: { value: dpr }, uGD: { value: GD }, uAlpha: { value: .9 },
    uMouse: { value: new THREE.Vector2(99, 99) }, uMouseOn: { value: 0 }, uRepelR: { value: 2 }, uRepelS: { value: 1.6 },
    uColA: { value: new THREE.Vector3(...PAL.parch) }, uColB: { value: new THREE.Vector3(...PAL.gold) },
    uAtlas: { value: atlas }
  };
  const gMat = new THREE.ShaderMaterial({
    uniforms: gU, vertexShader: VERT_GLYPH, fragmentShader: FRAG_CHARS,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
  });
  const glyph = new THREE.Points(gGeo, gMat);
  glyph.frustumCulled = false; glyph.renderOrder = 10;
  const gGroup = new THREE.Group();
  gGroup.position.set(0, 0, -GD);
  gGroup.add(glyph);
  camera.add(gGroup);

  /* ----- tower ----- */
  const tN = COUNT.tower;
  const tPos = new Float32Array(tN * 3), tRnd = new Float32Array(tN * 4), tChar = new Float32Array(tN), tInfo = new Float32Array(tN * 2);
  const radius = k => 9.4 - k * .82;
  const weights = []; let wsum = 0;
  for (let k = 0; k < TIERS; k++) { wsum += radius(k); weights.push(wsum); }
  for (let i = 0; i < tN; i++) {
    let x, y, z, tier, kind = 0;
    const pick = Math.random();
    if (pick < .06) { // ground of fallen letters
      const a = Math.random() * Math.PI * 2, r = 10 + Math.pow(Math.random(), .6) * 26;
      x = Math.cos(a) * r; z = Math.sin(a) * r; y = -.2 + Math.random() * .3; tier = -2; kind = 0;
    } else if (pick < .1) { // unfinished spire
      const h = Math.random(), r = (1 - h) * 2.6 + .15, a = Math.random() * Math.PI * 2;
      x = Math.cos(a) * r; z = Math.sin(a) * r; y = TIERS * TH + h * 5.2; tier = TIERS; kind = 1;
    } else {
      const w = Math.random() * wsum; tier = 0;
      while (weights[tier] < w) tier++;
      const r = radius(tier), y0 = tier * TH, sub = Math.random();
      if (sub < .7) { // wall with arches
        let a, h, tries = 0;
        do {
          a = Math.random() * Math.PI * 2; h = Math.random() * TH;
          const nA = Math.round(r * 1.5) * 2, u = ((a / (Math.PI * 2)) * nA) % 1, du = (u - .5) / .2;
          const open = Math.abs(du) < 1 && h > TH * .1 && h < TH * .5 + TH * .22 * Math.sqrt(Math.max(0, 1 - du * du));
          if (!open) break;
        } while (++tries < 6);
        x = Math.cos(a) * r; z = Math.sin(a) * r; y = y0 + h;
      } else if (sub < .86) { // ledge
        const a = Math.random() * Math.PI * 2, rr = r + .25 + Math.random() * .35;
        x = Math.cos(a) * rr; z = Math.sin(a) * rr; y = y0 + TH - .06 + Math.random() * .12; kind = 1;
      } else { // spiral ramp
        const s = Math.random(), a = s * Math.PI * 2 + tier * .7, rr = r + .55 + Math.random() * .5;
        x = Math.cos(a) * rr; z = Math.sin(a) * rr; y = y0 + s * TH + Math.random() * .1; kind = 1;
      }
      x += (Math.random() - .5) * .08; z += (Math.random() - .5) * .08;
    }
    tPos[i * 3] = x; tPos[i * 3 + 1] = y; tPos[i * 3 + 2] = z;
    for (let j = 0; j < 4; j++) tRnd[i * 4 + j] = Math.random();
    tChar[i] = Math.floor(Math.random() * 64);
    tInfo[i * 2] = tier; tInfo[i * 2 + 1] = kind;
  }
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  tGeo.setAttribute('aRnd', new THREE.BufferAttribute(tRnd, 4));
  tGeo.setAttribute('aChar', new THREE.BufferAttribute(tChar, 1));
  tGeo.setAttribute('aInfo', new THREE.BufferAttribute(tInfo, 2));
  const tU = {
    uTime: { value: 0 }, uPx: { value: MOBILE ? 2.6 : 3 }, uDpr: { value: dpr }, uFloor: { value: -5 }, uFade: { value: 0 },
    uLapis: { value: new THREE.Vector3(...PAL.lapis) }, uGold: { value: new THREE.Vector3(...PAL.gold) }, uParch: { value: new THREE.Vector3(...PAL.parch) },
    uAtlas: { value: atlas }
  };
  const tower = new THREE.Points(tGeo, new THREE.ShaderMaterial({
    uniforms: tU, vertexShader: VERT_TOWER, fragmentShader: FRAG_CHARS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  tower.frustumCulled = false;
  scene.add(tower);

  /* ----- drifting letter dust ----- */
  const dN = COUNT.dust;
  const dPos = new Float32Array(dN * 3), dRnd = new Float32Array(dN * 4), dChar = new Float32Array(dN);
  for (let i = 0; i < dN; i++) {
    const a = Math.random() * Math.PI * 2, r = 3 + Math.pow(Math.random(), .7) * 38;
    dPos[i * 3] = Math.cos(a) * r; dPos[i * 3 + 1] = Math.random() * 68 - 14; dPos[i * 3 + 2] = Math.sin(a) * r;
    for (let j = 0; j < 4; j++) dRnd[i * 4 + j] = Math.random();
    dChar[i] = Math.floor(Math.random() * 64);
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute('aRnd', new THREE.BufferAttribute(dRnd, 4));
  dGeo.setAttribute('aChar', new THREE.BufferAttribute(dChar, 1));
  const dU = { uTime: { value: 0 }, uPx: { value: MOBILE ? 2.6 : 3.2 }, uDpr: { value: dpr }, uFade: { value: 0 }, uParch: { value: new THREE.Vector3(...PAL.parch) }, uAtlas: { value: atlas } };
  const dust = new THREE.Points(dGeo, new THREE.ShaderMaterial({
    uniforms: dU, vertexShader: VERT_DUST, fragmentShader: FRAG_CHARS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  dust.frustumCulled = false;
  scene.add(dust);

  /* ----- mouse lens post pass (fine pointers only) ----- */
  let post = FINE && !Q.has('nopost');
  let rt = null, postScene = null, postCam = null, pU = null;
  if (post) {
    rt = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false });
    pU = { tDiffuse: { value: rt.texture }, uMouse: { value: new THREE.Vector2(.5, .5) }, uVel: { value: new THREE.Vector2() }, uAspect: { value: 1 }, uOn: { value: 0 }, uTime: { value: 0 } };
    postScene = new THREE.Scene();
    postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: pU, vertexShader: POST_VERT, fragmentShader: POST_FRAG, depthTest: false, depthWrite: false })));
  }

  /* ----- sizing ----- */
  let W = 1, H = 1, halfH = 1, halfW = 1;
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    if (w === W && h === H) return false;
    W = w; H = h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    halfH = GD * FOVT; halfW = halfH * camera.aspect;
    gU.uDpr.value = tU.uDpr.value = dU.uDpr.value = dpr;
    gU.uRepelR.value = halfH * (SMALL() ? .3 : .26);
    gU.uRepelS.value = halfH * .2;
    if (rt) { rt.setSize(Math.round(W * dpr), Math.round(H * dpr)); pU.uAspect.value = W / H; }
    return true;
  }
  resize();

  /* ----- text sampling ----- */
  const FONT = {
    '말': '900 200px "Noto Serif KR", serif',
    'Words': 'italic 800 200px "Fraunces", "Noto Serif KR", serif',
    '话': '900 200px "Noto Serif SC", "Noto Serif KR", serif'
  };
  const cache = new Map();
  function sample(text) {
    if (cache.has(text)) return cache.get(text);
    const font = FONT[text] || '900 200px "Noto Serif KR", serif';
    const c = document.createElement('canvas'), ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.font = font;
    const tw = ctx.measureText(text).width;
    const cw = Math.ceil(tw + 160), ch = 340;
    c.width = cw; c.height = ch;
    ctx.font = font; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, cw / 2, ch / 2);
    const data = ctx.getImageData(0, 0, cw, ch).data;
    const px = []; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let y = 0; y < ch; y += 2) for (let x = 0; x < cw; x += 2) {
      if (data[(y * cw + x) * 4 + 3] > 128) { px.push(x, y); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const n = px.length / 2, out = new Float32Array(gN * 3);
    if (!n) { cache.set(text, { pts: out, aspect: 1 }); return cache.get(text); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hh = Math.max(1, y1 - y0), asp = (x1 - x0) / hh;
    const order = new Uint32Array(n); for (let i = 0; i < n; i++) order[i] = i;
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    const halo = Math.floor(gN * .05);
    for (let i = 0; i < gN; i++) {
      if (i >= gN - halo) { // loose letters orbiting the word
        const a = Math.random() * Math.PI * 2, r = .62 + Math.random() * .5;
        out[i * 3] = Math.cos(a) * r * Math.max(asp, 1) * .9; out[i * 3 + 1] = Math.sin(a) * r * .8; out[i * 3 + 2] = (Math.random() - .5) * .6;
        continue;
      }
      const k = i < n ? order[i] : order[Math.floor(Math.random() * n)];
      out[i * 3] = (px[k * 2] - cx + (Math.random() - .5) * 2) / hh;
      out[i * 3 + 1] = -(px[k * 2 + 1] - cy + (Math.random() - .5) * 2) / hh;
      out[i * 3 + 2] = (Math.random() - .5) * .06;
    }
    const res = { pts: out, aspect: asp };
    cache.set(text, res);
    return res;
  }

  /* ----- glyph targets ----- */
  const morph = { prog: 1, dur: 1.9 };
  const gpos = { x: 0, y: 0, tx: 0, ty: 0 };
  const col = { a: [...PAL.parch], b: [...PAL.gold], ta: PAL.parch, tb: PAL.gold, alpha: .9, talpha: .9 };
  let heroLang = cur, heroT = 0, lastSpec = null;

  function freeze() {
    const p = morph.prog;
    for (let i = 0; i < gN; i++) {
      const d = gRnd[i * 4] * .35, t = clamp((p - d) / .65, 0, 1), e = easeIO(t);
      const o = i * 3;
      gFrom[o] += (gTo[o] - gFrom[o]) * e; gFrom[o + 1] += (gTo[o + 1] - gFrom[o + 1]) * e; gFrom[o + 2] += (gTo[o + 2] - gFrom[o + 2]) * e;
    }
  }
  function layout(z) {
    const small = SMALL();
    if (z.key === 'hero') {
      const s = sample(WORDS[heroLang]);
      let h = small ? halfH * .42 : halfH * .6;
      const maxW = halfW * (small ? 1.6 : 1.3);
      if (h * s.aspect > maxW) h = maxW / s.aspect;
      return { text: WORDS[heroLang], h, x: 0, y: small ? halfH * .1 : halfH * .1, ca: PAL.parch, cb: PAL.gold, alpha: .9 };
    }
    if (z.key === 'scatter') return { scatter: true, x: 0, y: 0, ca: PAL.parch, cb: PAL.gold, alpha: .5 };
    const glyphText = z.glyph;
    if (small) return { text: glyphText, h: halfH * .42, x: 0, y: halfH * .56, ca: PAL.gold, cb: PAL.parch, alpha: 1 };
    const side = z.side === 'l' ? 1 : -1;
    return { text: glyphText, h: halfH * .95, x: side * halfW * .47, y: -halfH * .02, ca: PAL.gold, cb: PAL.parch, alpha: 1 };
  }
  function setTarget(z, instant) {
    const L = layout(z);
    lastSpec = z;
    if (!instant) freeze();
    if (L.scatter) {
      for (let i = 0; i < gN; i++) {
        gTo[i * 3] = (Math.random() - .5) * halfW * 2.1;
        gTo[i * 3 + 1] = (Math.random() - .5) * halfH * 1.9;
        gTo[i * 3 + 2] = (Math.random() - .5) * 8;
      }
    } else {
      const s = sample(L.text).pts;
      for (let i = 0; i < gN * 3; i++) gTo[i] = s[i] * L.h;
    }
    if (instant) gFrom.set(gTo);
    fromAttr.needsUpdate = true; toAttr.needsUpdate = true;
    morph.prog = instant ? 1 : 0;
    gU.uScatter.value = L.scatter ? halfH * .1 : Math.max(.6, L.h * .5);
    gpos.tx = L.x; gpos.ty = L.y;
    if (instant) { gpos.x = L.x; gpos.y = L.y; }
    col.ta = L.ca; col.tb = L.cb; col.talpha = L.alpha;
    heroT = 0;
    if (z.key === 'hero') markHeroLang(heroLang);
  }
  hooks.zone.push(z => setTarget(z));
  hooks.lang.push((l, animate) => {
    if (!animate) return;
    heroLang = l;
    if (zone.key === 'hero') setTarget(zone);
    gsap.killTweensOf(gU.uBurst);
    gsap.timeline().to(gU.uBurst, { value: 1, duration: .35, ease: 'power2.out' }).to(gU.uBurst, { value: 0, duration: 1.1, ease: 'power3.inOut' });
  });
  setTarget(zone, false);

  /* ----- pointer ----- */
  const ptr = { x: 0, y: 0, nx: 0, ny: 0, on: 0, ton: 0, vx: 0, vy: 0, lastT: 0, ux: .5, uy: .5, pux: .5, puy: .5 };
  addEventListener('pointermove', e => {
    ptr.nx = (e.clientX / innerWidth) * 2 - 1;
    ptr.ny = -((e.clientY / innerHeight) * 2 - 1);
    ptr.ux = e.clientX / innerWidth; ptr.uy = 1 - e.clientY / innerHeight;
    ptr.ton = 1; ptr.lastT = performance.now();
  }, { passive: true });
  addEventListener('pointerdown', e => {
    ptr.nx = (e.clientX / innerWidth) * 2 - 1; ptr.ny = -((e.clientY / innerHeight) * 2 - 1);
    ptr.ton = 1; ptr.lastT = performance.now();
  }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.ton = 0; });
  addEventListener('blur', () => { ptr.ton = 0; });

  /* ----- scroll → camera path ----- */
  let anchors = null;
  function measure() {
    const off = el => el.getBoundingClientRect().top + scrollY;
    const tw = $('#tower');
    anchors = { dir: off(dirSec), towerTop: off(tw), towerH: tw.offsetHeight, contactTop: off(contactSec), contactH: contactSec.offsetHeight };
  }
  measure();
  const camState = { y: 2, r: 34, a: .5, ly: 13, init: false };
  function camTarget() {
    const y = lenis ? lenis.animatedScroll : scrollY, vh = innerHeight;
    const A = anchors;
    const pre = clamp(y / Math.max(1, A.towerTop - vh * .5), 0, 1);
    const q = clamp((y + vh * .5 - A.towerTop) / A.towerH, 0, 1);
    const c = clamp((y + vh * .5 - A.contactTop) / A.contactH, 0, 1);
    const top = TIERS * TH;
    let cy, r, a, ly;
    if (q <= 0) {
      cy = lerp(1.2, 2.6, pre); r = lerp(SMALL() ? 44 : 34, 27, pre); a = lerp(.5, .2, pre); ly = lerp(SMALL() ? 15 : 13, 4.5, pre);
    } else {
      cy = 2.6 + q * (top - 2.6); r = lerp(27, 17, q); a = .2 + q * Math.PI * 2.2; ly = cy + 1.4;
    }
    if (c > 0) {
      cy = lerp(cy, top + 9, c); r = lerp(r, 13, c); ly = lerp(ly, top + 2.5, c);
    }
    return { cy, r, a, ly, q, pre, c };
  }

  /* ----- frame ----- */
  let time = 0, frameNo = 0, fadeIn = 0, perf = { acc: 0, n: 0, warm: 0, level: 0 }, running = true;
  const camLook = new THREE.Vector3();
  function frame(t, dms) {
    if (!running || document.hidden) return;
    const dt = Math.min(dms, 60) / 1000;
    time += dt;
    if (resize()) { measure(); setTarget(zone, true); }
    else if ((++frameNo % 20) === 0) measure();

    // camera
    const T = camTarget();
    const k = camState.init ? 1 - Math.exp(-6 * dt) : 1; camState.init = true;
    camState.y = lerp(camState.y, T.cy, k); camState.r = lerp(camState.r, T.r, k);
    camState.a = lerp(camState.a, T.a, k); camState.ly = lerp(camState.ly, T.ly, k);
    const ca = camState.a + time * .015;
    camera.position.set(Math.cos(ca) * camState.r, camState.y, Math.sin(ca) * camState.r);
    camLook.set(0, camState.ly, 0);
    camera.lookAt(camLook);

    // tower lights the floor being read
    const fz = zone.key === 'floor' ? zone.i : zone.key === 'contact' ? 8 : -5;
    tU.uFloor.value = damp(tU.uFloor.value, fz, 3, dt);
    fadeIn = Math.min(1, fadeIn + dt * .6);
    tU.uFade.value = dU.uFade.value = easeIO(fadeIn);
    tU.uTime.value = dU.uTime.value = gU.uTime.value = time;

    // glyph
    morph.prog = Math.min(1, morph.prog + dt / morph.dur);
    gU.uProg.value = morph.prog;
    gpos.x = damp(gpos.x, gpos.tx, 3.2, dt); gpos.y = damp(gpos.y, gpos.ty, 3.2, dt);
    gGroup.position.x = gpos.x; gGroup.position.y = gpos.y;
    for (let i = 0; i < 3; i++) { col.a[i] = damp(col.a[i], col.ta[i], 3, dt); col.b[i] = damp(col.b[i], col.tb[i], 3, dt); }
    gU.uColA.value.set(col.a[0], col.a[1], col.a[2]); gU.uColB.value.set(col.b[0], col.b[1], col.b[2]);
    col.alpha = damp(col.alpha, col.talpha, 3, dt);
    gU.uAlpha.value = col.alpha * Math.min(1, fadeIn * 2);

    // hero cycle: 말 → Words → 话
    if (zone.key === 'hero' && morph.prog >= 1) {
      heroT += dt;
      if (heroT > 2.4) {
        heroLang = ORDER[(ORDER.indexOf(heroLang) + 1) % 3];
        setTarget(zone);
      }
    }

    // pointer
    if (ptr.ton && performance.now() - ptr.lastT > (FINE ? 2500 : 900)) ptr.ton = 0;
    ptr.on = damp(ptr.on, ptr.ton, 5, dt);
    ptr.x = damp(ptr.x, ptr.nx, 12, dt); ptr.y = damp(ptr.y, ptr.ny, 12, dt);
    gU.uMouse.value.set(ptr.x * halfW - gpos.x, ptr.y * halfH - gpos.y);
    gU.uMouseOn.value = ptr.on;

    if (post) {
      const vx = ptr.ux - ptr.pux, vy = ptr.uy - ptr.puy;
      ptr.pux = ptr.ux; ptr.puy = ptr.uy;
      ptr.vx = damp(ptr.vx, clamp(vx, -.05, .05), 6, dt); ptr.vy = damp(ptr.vy, clamp(vy, -.05, .05), 6, dt);
      pU.uMouse.value.set(damp(pU.uMouse.value.x, ptr.ux, 10, dt), damp(pU.uMouse.value.y, ptr.uy, 10, dt));
      pU.uVel.value.set(ptr.vx, ptr.vy);
      pU.uOn.value = ptr.on;
      pU.uTime.value = time;
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);
    } else {
      renderer.render(scene, camera);
    }

    // adaptive quality: drop resolution, then post, then particles, then go lite
    perf.warm += dt;
    if (perf.warm > 3 && !NODEGRADE) {
      perf.acc += dt; perf.n++;
      if (perf.n >= 90) {
        const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
        if (avg > 1 / 34) degrade();
      }
    }
  }
  function degrade() {
    perf.level++;
    root.dataset.quality = String(perf.level);
    if (perf.level === 1) { dpr = Math.min(dpr, 1); W = 0; }
    else if (perf.level === 2) { post = false; gGeo.setDrawRange(0, gN >> 1); tGeo.setDrawRange(0, tN >> 1); dGeo.setDrawRange(0, dN >> 1); gU.uPx.value *= 1.3; }
    else goLite('slow-device');
  }
  gsap.ticker.add(frame);
  if (Q.has('debug')) window.__babel = { THREE, scene, camera, tower, dust, glyph, tU, dU, gU, renderer };
  addEventListener('resize', () => { measure(); }, { passive: true });
  ScrollTriggerRefresh(measure);

  return {
    dispose() {
      running = false;
      gsap.ticker.remove(frame);
      [gGeo, tGeo, dGeo].forEach(g => g.dispose());
      [gMat, tower.material, dust.material].forEach(m => m.dispose());
      atlas.dispose();
      if (rt) rt.dispose();
      renderer.dispose();
    }
  };
}
function ScrollTriggerRefresh(fn) {
  if (window.ScrollTrigger) window.ScrollTrigger.addEventListener('refresh', fn);
  addEventListener('load', fn);
}

/* ==========================================================================
   Language switch: page text shatters into letters and re-forms
   ========================================================================== */
function initFX() {
  const c = $('#fx'), ctx = c.getContext('2d');
  const POOLS = {
    ko: Array.from('말글뜻한국어통역소리가나다라마바사아자차카타파하빛길'),
    en: Array.from('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPRSTUVWY'),
    zh: Array.from('话语言通译文字心意相同中天人和信行之以为是有')
  };
  const BUDGET = MOBILE ? 650 : 1700;
  let dpr = 1, W = 0, H = 0, raf = 0, job = null;
  const sprites = {}; // lang -> {canvas, size, map}
  function sizeCanvas() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  }
  function sheet(lang) {
    if (sprites[lang]) return sprites[lang];
    const S = 48, chars = POOLS[lang], cols = 16, rows = Math.ceil(chars.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * S; cv.height = rows * S * 2; // row block 0: parchment, block 1: gold
    const x = cv.getContext('2d');
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `500 ${S * .72}px "Noto Sans KR", "Noto Sans SC", sans-serif`;
    ['#ece6d6', '#f0c06a'].forEach((color, b) => {
      x.fillStyle = color;
      chars.forEach((ch, i) => x.fillText(ch, (i % cols) * S + S / 2, (Math.floor(i / cols) + b * rows) * S + S / 2 + 1));
    });
    return (sprites[lang] = { cv, S, cols, rows, n: chars.length });
  }
  function lineRects(el) {
    const r = document.createRange();
    r.selectNodeContents(el);
    return Array.from(r.getClientRects()).filter(b => b.width > 2 && b.height > 2 && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth);
  }
  function slots(els) {
    const out = [];
    els.forEach(el => {
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize) || 16;
      const gold = el.classList.contains('f-role') || el.closest('.big-mail') ? 1 : 0;
      lineRects(el).forEach(b => {
        const step = fs * .62, n = Math.max(1, Math.floor(b.width / step));
        for (let i = 0; i < n; i++) out.push({ x: b.left + (i + .5) * (b.width / n), y: b.top + b.height / 2, fs, gold });
      });
    });
    return out;
  }
  function draw() {
    const now = performance.now(), j = job;
    const t = now - j.t0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!j.swapped && t >= 430) {
      j.swapped = true;
      j.swap();
      const tgts = slots(j.els);
      for (let i = tgts.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); const tmp = tgts[i]; tgts[i] = tgts[k]; tgts[k] = tmp; }
      j.ps.forEach((p, i) => {
        p.mx = p.x; p.my = p.y;
        const g = tgts.length ? tgts[i % tgts.length] : { x: p.x, y: p.y, fs: p.fs };
        p.tx = g.x; p.ty = g.y; p.tfs = g.fs;
        p.ch = Math.floor(Math.random() * POOLS[j.to].length);
      });
    }
    if (!j.shown && t >= 960) { j.shown = true; j.els.forEach(el => el.classList.remove('fx-hide')); }
    const sh = sheet(j.swapped ? j.to : j.from);
    j.ps.forEach(p => {
      let a = 1, x, y, fs;
      if (!j.swapped) {
        const k = clamp(t / 430, 0, 1), e = 1 - Math.pow(1 - k, 3);
        x = p.x0 + p.vx * e + Math.sin(t * .01 + p.ph) * 4 * k;
        y = p.y0 + p.vy * e + Math.cos(t * .012 + p.ph) * 4 * k;
        p.x = x; p.y = y; fs = p.fs * (1 + .5 * e);
        a = 1 - .25 * e;
      } else {
        const k = clamp((t - 430 - p.delay) / 520, 0, 1), e = easeIO(k);
        x = lerp(p.mx, p.tx, e) + Math.sin(k * Math.PI) * p.curl;
        y = lerp(p.my, p.ty, e) - Math.sin(k * Math.PI) * Math.abs(p.curl) * .6;
        fs = lerp(p.fs * 1.5, p.tfs, e);
        a = t < 960 ? .75 + .25 * e : clamp(1 - (t - 960) / 340, 0, 1);
      }
      if (a <= 0) return;
      const s = fs * .95, idx = p.ch % sh.n;
      ctx.globalAlpha = a;
      ctx.drawImage(sh.cv, (idx % sh.cols) * sh.S, (Math.floor(idx / sh.cols) + p.gold * sh.rows) * sh.S, sh.S, sh.S, x - s / 2, y - s / 2, s, s);
    });
    ctx.globalAlpha = 1;
    if (t < 1320) raf = requestAnimationFrame(draw);
    else { ctx.clearRect(0, 0, W, H); job = null; raf = 0; }
  }
  function finish() {
    if (!job) return;
    cancelAnimationFrame(raf);
    if (!job.swapped) job.swap();
    job.els.forEach(el => el.classList.remove('fx-hide'));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
    job = null;
  }
  addEventListener('resize', () => { finish(); sizeCanvas(); }, { passive: true });
  sizeCanvas();

  return {
    transition(from, to, swap) {
      finish();
      const els = [...i18nEls, stEl].filter(el => lineRects(el).length);
      let src = slots(els);
      if (src.length > BUDGET) { for (let i = src.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); const t = src[i]; src[i] = src[k]; src[k] = t; } src = src.slice(0, BUDGET); }
      if (!src.length) { swap(); return; }
      els.forEach(el => el.classList.add('fx-hide'));
      const ps = src.map(s => {
        const ang = Math.random() * Math.PI * 2, sp = (20 + Math.random() * 70) * (s.fs / 16);
        return {
          x0: s.x, y0: s.y, x: s.x, y: s.y, fs: s.fs, gold: s.gold,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp * .7 - 14,
          ph: Math.random() * 6.283, delay: Math.random() * 160, curl: (Math.random() - .5) * 90,
          ch: Math.floor(Math.random() * POOLS[from].length)
        };
      });
      job = { from, to, swap, els, ps, t0: performance.now(), swapped: false, shown: false };
      raf = requestAnimationFrame(draw);
    }
  };
}

/* ==========================================================================
   Photo ripple: hovering a photo turns it to water
   ========================================================================== */
function initRipple(THREE) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const r = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, premultipliedAlpha: false });
  const dpr = Math.min(devicePixelRatio || 1, 2);
  r.setPixelRatio(dpr);
  const U = {
    uTex: { value: null }, uMouse: { value: new THREE.Vector2(.5, .5) }, uTime: { value: 0 }, uAmp: { value: 0 },
    uAspect: { value: 1 }, uScale: { value: new THREE.Vector2(1, 1) }, uOff: { value: new THREE.Vector2(0, 0) }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: /* glsl */`
      uniform sampler2D uTex; uniform vec2 uMouse, uScale, uOff; uniform float uTime, uAmp, uAspect;
      varying vec2 vUv;
      void main(){
        vec2 uv = vUv;
        vec2 d = uv - uMouse; d.x *= uAspect;
        float r = length(d);
        float wave = sin(r * 46. - uTime * 7.5) * exp(-r * 3.6);
        vec2 dir = d / max(r, 1e-4); dir.x /= uAspect;
        uv += dir * wave * .02 * uAmp;
        uv += vec2(sin(uv.y * 16. + uTime * 2.), cos(uv.x * 14. + uTime * 1.6)) * .003 * uAmp;
        vec2 t = uOff + clamp(uv, 0., 1.) * uScale;
        vec3 c = texture2D(uTex, t).rgb;
        c += wave * .07 * uAmp;
        gl_FragColor = vec4(c, 1.);
      }`
  });
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const tex = new Map();
  let active = null, amp = 0, target = 0, time = 0;

  function cover(img) {
    const w = img.clientWidth, h = img.clientHeight, nw = img.naturalWidth || w, nh = img.naturalHeight || h;
    const cs = getComputedStyle(img);
    if (cs.objectFit !== 'cover') { U.uScale.value.set(1, 1); U.uOff.value.set(0, 0); return; }
    const ia = nw / nh, ea = w / h;
    let sx = 1, sy = 1;
    if (ia > ea) sx = ea / ia; else sy = ia / ea;
    const pos = cs.objectPosition.split(' ').map(v => parseFloat(v) / 100);
    const px = isNaN(pos[0]) ? .5 : pos[0], py = isNaN(pos[1]) ? .5 : pos[1];
    U.uScale.value.set(sx, sy);
    U.uOff.value.set(px * (1 - sx), 1 - py * (1 - sy) - sy);
  }
  function activate(host, img) {
    if (!img.complete || !img.naturalWidth) return;
    if (active && active.img !== img) deactivate();
    if (!tex.has(img)) {
      const t = new THREE.Texture(img);
      t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
      tex.set(img, t);
    }
    U.uTex.value = tex.get(img);
    canvas.className = img.className.replace(/\brp\b/, '') + ' rp-canvas';
    canvas.style.cssText = getComputedStyle(img).objectFit === 'cover' ? '' : '';
    img.after(canvas);
    const w = img.clientWidth, h = img.clientHeight;
    r.setSize(w, h, false);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    if (host.classList.contains('c-portrait')) canvas.style.borderRadius = '50%';
    U.uAspect.value = w / h;
    cover(img);
    active = { host, img };
  }
  function deactivate() {
    if (!active) return;
    canvas.remove();
    active = null; amp = 0;
  }
  $$('img.rp').forEach(img => {
    const host = img.closest('.media') || img.parentElement;
    host.classList.add('rp-host');
    host.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; activate(host, img); target = 1; });
    host.addEventListener('pointermove', e => {
      if (!active || active.img !== img) return;
      const b = img.getBoundingClientRect();
      U.uMouse.value.set((e.clientX - b.left) / b.width, 1 - (e.clientY - b.top) / b.height);
    });
    host.addEventListener('pointerleave', () => { target = 0; });
  });
  function frame(t, dms) {
    if (!active) return;
    const dt = Math.min(dms, 60) / 1000;
    time += dt;
    amp = damp(amp, target, target ? 4 : 2.6, dt);
    if (!target && amp < .01) { deactivate(); return; }
    U.uTime.value = time; U.uAmp.value = amp;
    r.render(scene, cam);
  }
  gsap.ticker.add(frame);
  return {
    dispose() { gsap.ticker.remove(frame); deactivate(); tex.forEach(t => t.dispose()); mat.dispose(); r.dispose(); }
  };
}
