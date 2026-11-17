/* Globe for the PASSPORT concept — Three.js from CDN, loaded only when the route section is near. */
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

function hasWebGL(){
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

export async function createGlobe(o){
  if (!hasWebGL()) throw new Error('no-webgl');
  const THREE = await import(THREE_URL);
  const { canvas, box, labels, cities, legs, land, low } = o;
  const reduce = document.documentElement.classList.contains('reduce');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const dprCap = low ? 1.25 : 2;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 4.25);

  const world = new THREE.Group();
  world.rotation.order = 'XYZ';
  scene.add(world);

  const toVec = (lat, lon, r = 1) => {
    const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    return new THREE.Vector3(Math.cos(la) * Math.sin(lo) * r, Math.sin(la) * r, Math.cos(la) * Math.cos(lo) * r);
  };

  /* ocean */
  const ocean = new THREE.Mesh(
    new THREE.SphereGeometry(1, low ? 48 : 96, low ? 32 : 64),
    new THREE.ShaderMaterial({
      uniforms: { base: { value: new THREE.Color('#17110f') }, rim: { value: new THREE.Color('#ef4b2d') } },
      vertexShader: `varying vec3 vN; varying vec3 vP;
        void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.); vP = mv.xyz; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 base; uniform vec3 rim; varying vec3 vN; varying vec3 vP;
        void main(){
          vec3 v = normalize(-vP);
          float f = pow(1. - max(dot(vN, v), 0.), 2.6);
          float l = max(dot(vN, normalize(vec3(-.5,.6,.8))), 0.);
          vec3 c = base + vec3(.07,.055,.045) * l + rim * f * .35;
          gl_FragColor = vec4(c, 1.);
        }`
    })
  );
  world.add(ocean);

  /* atmosphere */
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 40),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `varying vec3 vN; void main(){ float i = pow(max(.68 - dot(vN, vec3(0,0,1.)), 0.), 2.4); gl_FragColor = vec4(vec3(1., .55, .35) * i, i); }`
    })
  );
  atmo.scale.setScalar(1.17);
  scene.add(atmo);

  /* land dots from the 1° bitmap */
  let bits = '';
  try { bits = atob(land || ''); } catch (e) {}
  const isLand = (lat, lon) => {
    if (!bits) return false;
    const r = Math.min(179, Math.max(0, Math.floor(90 - lat))), c = ((Math.floor(lon + 180) % 360) + 360) % 360;
    const i = r * 360 + c;
    return ((bits.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1) === 1;
  };
  const N = low ? 14000 : 26000, pos = [], hot = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const cityVecs = Object.fromEntries(Object.entries(cities).map(([k, c]) => [k, toVec(c.lat, c.lon)]));
  for (let i = 0; i < N; i++){
    const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = golden * i;
    const x = Math.cos(th) * rad, z = Math.sin(th) * rad;
    const lat = Math.asin(y) * 180 / Math.PI, lon = Math.atan2(x, z) * 180 / Math.PI;
    if (!isLand(lat, lon)) continue;
    pos.push(x * 1.002, y * 1.002, z * 1.002);
    let h = 0;
    for (const k in cityVecs){ const d = cityVecs[k].distanceTo(new THREE.Vector3(x, y, z)); h = Math.max(h, 1 - Math.min(1, d / 0.16)); }
    hot.push(h);
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  dotGeo.setAttribute('hot', new THREE.Float32BufferAttribute(hot, 1));
  const dotMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { size: { value: 2.2 }, pr: { value: 1 } },
    vertexShader: `attribute float hot; uniform float size; uniform float pr; varying float vF; varying float vH;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.);
        vF = dot(normalize(normalMatrix * position), vec3(0.,0.,1.));
        vH = hot;
        gl_PointSize = size * pr * (2.6 / -mv.z) * (1. + hot * .6);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying float vF; varying float vH;
      void main(){
        vec2 c = gl_PointCoord - .5; float d = length(c);
        if (d > .5) discard;
        float a = smoothstep(.5, .3, d) * smoothstep(-.05, .45, vF);
        vec3 col = mix(vec3(.93,.9,.84), vec3(1.,.62,.45), vH);
        gl_FragColor = vec4(col, a * (.55 + vH * .45));
      }`
  });
  world.add(new THREE.Points(dotGeo, dotMat));

  /* graticule */
  const gr = [];
  for (let lat = -60; lat <= 60; lat += 30){
    for (let lon = 0; lon < 360; lon += 4){ const a = toVec(lat, lon, 1.001), b = toVec(lat, lon + 4, 1.001); gr.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  }
  for (let lon = 0; lon < 360; lon += 30){
    for (let lat = -88; lat < 88; lat += 4){ const a = toVec(lat, lon, 1.001), b = toVec(lat + 4, lon, 1.001); gr.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  }
  const grGeo = new THREE.BufferGeometry(); grGeo.setAttribute('position', new THREE.Float32BufferAttribute(gr, 3));
  world.add(new THREE.LineSegments(grGeo, new THREE.LineBasicMaterial({ color: 0xefe7d8, transparent: true, opacity: .05 })));

  /* cities */
  const rings = [];
  for (const k in cityVecs){
    const v = cityVecs[k];
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), new THREE.MeshBasicMaterial({ color: 0xef4b2d }));
    dot.position.copy(v.clone().multiplyScalar(1.004));
    world.add(dot);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.026, 40), new THREE.MeshBasicMaterial({ color: 0xef4b2d, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.copy(v.clone().multiplyScalar(1.006));
    ring.lookAt(v.clone().multiplyScalar(2));
    world.add(ring);
    rings.push(ring);
  }

  /* arcs */
  const RAD = 6, SEG = 160;
  const planeShape = new THREE.Shape();
  [[0, 1], [0.12, 0.62], [0.12, 0.2], [0.95, -0.25], [0.95, -0.42], [0.12, -0.2], [0.1, -0.68], [0.36, -0.86], [0.36, -1], [0, -0.92], [-0.36, -1], [-0.36, -0.86], [-0.1, -0.68], [-0.12, -0.2], [-0.95, -0.42], [-0.95, -0.25], [-0.12, 0.2], [-0.12, 0.62]]
    .forEach(([x, y], i) => i ? planeShape.lineTo(x, y) : planeShape.moveTo(x, y));
  const planeGeo = new THREE.ShapeGeometry(planeShape);
  planeGeo.rotateX(-Math.PI / 2); // lie flat, nose toward -Z
  planeGeo.rotateY(Math.PI);      // nose toward +Z (lookAt direction)
  const arcs = legs.map(([a, b], i) => {
    const A = cityVecs[a], B = cityVecs[b];
    const ang = A.angleTo(B), h = 0.06 + ang * 0.5;
    const side = new THREE.Vector3().crossVectors(A, B).normalize().multiplyScalar((i % 2 ? -1 : 1) * Math.min(0.12, ang * 0.35));
    const pts = [];
    for (let s = 0; s <= 64; s++){
      const t = s / 64, bow = Math.sin(Math.PI * t);
      const v = new THREE.Vector3().copy(A).lerp(B, t).addScaledVector(side, bow).normalize(); // fine for short legs
      pts.push(v.multiplyScalar(1 + h * bow + 0.004));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, SEG, 0.0055, RAD, false),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xf2d690 : 0xef4b2d, transparent: true, opacity: 1, depthWrite: false })
    );
    tube.geometry.setDrawRange(0, 0);
    world.add(tube);
    const plane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ color: 0xfff5e0, side: THREE.DoubleSide }));
    plane.scale.setScalar(0.032);
    plane.visible = false;
    world.add(plane);
    const mid = new THREE.Vector3().copy(A).add(B).normalize();
    return { curve, tube, plane, mid, total: tube.geometry.index.count };
  });

  /* focus helpers */
  const latOf = v => Math.asin(v.y) * 180 / Math.PI, lonOf = v => Math.atan2(v.x, v.z) * 180 / Math.PI;
  const focus = arcs.map(a => ({ rx: latOf(a.mid) * Math.PI / 180 - 0.06, ry: -lonOf(a.mid) * Math.PI / 180 }));
  let target = 0, shown = 0, active = true, raf = 0, last = performance.now();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  box.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = box.getBoundingClientRect();
    pointer.tx = (e.clientX - r.left) / r.width - 0.5; pointer.ty = (e.clientY - r.top) / r.height - 0.5;
  });
  box.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });

  const tmp = new THREE.Vector3(), tmpN = new THREE.Vector3(), camDir = new THREE.Vector3(0, 0, 1);
  const labelEls = {};
  labels.forEach(el => { labelEls[el.getAttribute('data-city')] = el; });
  let W = 0, H = 0;
  function resize(){
    const r = box.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    const pr = Math.min(window.devicePixelRatio || 1, dprCap);
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    dotMat.uniforms.pr.value = pr * (H / 520);
  }
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(box);

  function frame(now){
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    shown += (target - shown) * (reduce ? 1 : 1 - Math.exp(-dt * 5));
    pointer.x += (pointer.tx - pointer.x) * 0.06; pointer.y += (pointer.ty - pointer.y) * 0.06;
    const f = Math.max(0, shown);
    // focus between leg midpoints
    const i = Math.min(arcs.length - 1, Math.floor(f)), k = Math.min(1, Math.max(0, (f - i - 0.62) / 0.38));
    const a = focus[i], b = focus[Math.min(arcs.length - 1, i + 1)], e = k * k * (3 - 2 * k);
    const drift = reduce ? 0 : Math.sin(now / 3000) * 0.025;
    world.rotation.x = a.rx + (b.rx - a.rx) * e + pointer.y * 0.25;
    world.rotation.y = a.ry + (b.ry - a.ry) * e + pointer.x * 0.4 + drift;
    // arcs
    arcs.forEach((arc, j) => {
      const p = Math.min(1, Math.max(0, (f - j) / 0.62));
      const n = Math.floor(p * SEG) * RAD * 6;
      arc.tube.geometry.setDrawRange(0, n);
      arc.tube.material.opacity = j < i ? 0.45 : 1;
      if (p > 0.002 && p < 0.998 && j === i){
        const s = Math.min(0.999, p);
        arc.curve.getPointAt(s, tmp);
        arc.plane.position.copy(tmp);
        arc.curve.getPointAt(Math.min(1, s + 0.01), tmpN);
        arc.plane.up.copy(tmp).normalize();
        arc.plane.lookAt(tmpN.applyMatrix4(world.matrixWorld));
        arc.plane.visible = true;
      } else arc.plane.visible = false;
    });
    // pulse rings
    const ph = (now / 1600) % 1;
    rings.forEach((r, j) => { const q = (ph + j * 0.33) % 1; r.scale.setScalar(1 + q * 2.2); r.material.opacity = (1 - q) * 0.9; });
    world.updateMatrixWorld();
    renderer.render(scene, camera);
    // labels
    for (const key in cityVecs){
      const el = labelEls[key]; if (!el) continue;
      tmp.copy(cityVecs[key]).applyMatrix4(world.matrixWorld);
      const facing = tmp.clone().normalize().dot(camDir);
      tmp.project(camera);
      const x = (tmp.x + 1) / 2 * W, y = (1 - tmp.y) / 2 * H;
      el.style.transform = `translate(${(x + 12).toFixed(1)}px, ${(y - 14).toFixed(1)}px)`;
      el.classList.toggle('vis', facing > 0.2);
    }
    raf = active ? requestAnimationFrame(frame) : 0;
  }
  raf = requestAnimationFrame(frame);

  return {
    setProgress(f){ target = f; },
    setActive(v){
      active = v;
      if (v && !raf){ last = performance.now(); raf = requestAnimationFrame(frame); }
    }
  };
}
