// NeuroHand 3D training scene: a first-person view of two hands resting on a wooden table
// beside a cup, like a real motor-imagery feedback setup. The fingers curl when the
// imagined movement is recognized.
//
// It reads the same state the 2D scene uses, so the session logic doesn't change:
//   #sim-left / #sim-right .sim-hand  style --c  (0 = open, 1 = closed)
//   .sim-hand-wrap.cued                           (the hand the cue points to)
// If WebGL or the models are unavailable, the 2D scene stays.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from '../vendor/three/examples/jsm/environments/RoomEnvironment.js';

const sim = document.getElementById('sim');
if (sim) init();

function init() {
  const canvas = document.createElement('canvas');
  canvas.className = 'sim-3d';
  canvas.setAttribute('aria-hidden', 'true');
  sim.prepend(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    canvas.remove();
    return; // no WebGL: keep the 2D scene
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0907);
  scene.fog = new THREE.Fog(0x0d0907, 0.7, 1.9);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environmentIntensity = 0.35;

  // Camera roughly where a seated person's eyes are, looking down at the table
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 10);
  const camHome = new THREE.Vector3(0, 0.33, 0.37);
  camera.position.copy(camHome);
  const LOOK = new THREE.Vector3(0, 0.0, -0.17);
  camera.lookAt(LOOK);

  // ---------- Lights: a warm key light from above-left, soft fill, faint rim ----------
  scene.add(new THREE.HemisphereLight(0xffe9d6, 0x24160d, 0.35));
  // Overhead lamp: a soft pool of warm light that falls off toward the edges
  const key = new THREE.SpotLight(0xffeedd, 4.2, 2.4, 0.7, 0.8, 1.3);
  key.position.set(-0.18, 0.95, 0.18);
  key.target.position.set(0.02, 0, -0.1);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.3; key.shadow.camera.far = 2.0;
  key.shadow.bias = -0.0003; key.shadow.normalBias = 0.008;
  key.shadow.radius = 5;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xffdcc0, 0.35);
  fill.position.set(0.6, 0.35, 0.7);
  scene.add(fill);
  const rimLight = new THREE.DirectionalLight(0xffe4cc, 0.45);
  rimLight.position.set(0.1, 0.3, -0.9);
  scene.add(rimLight);

  // ---------- Table: procedural walnut wood ----------
  const tableMat = new THREE.MeshStandardMaterial({ map: woodTexture(renderer), roughness: 0.62, metalness: 0 });
  const table = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), tableMat);
  table.rotation.x = -Math.PI / 2;
  table.position.z = -1.0;
  table.receiveShadow = true;
  scene.add(table);

  // ---------- Cup ----------
  const cup = new THREE.Group();
  const cupMat = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.38, metalness: 0.15 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.031, 0.075, 64, 1, true), cupMat);
  body.position.y = 0.0375; body.castShadow = true; body.receiveShadow = true;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.028, 0.072, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.6, side: THREE.BackSide }));
  inner.position.y = 0.039;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0325, 0.0016, 12, 64), cupMat);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.075;
  const base = new THREE.Mesh(new THREE.CircleGeometry(0.031, 64), cupMat);
  base.rotation.x = -Math.PI / 2; base.position.y = 0.003;
  cup.add(body, inner, rim, base);
  cup.position.set(0, 0, -0.2);
  scene.add(cup);

  // ---------- Hands ----------
  const skin = (color) => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.55, metalness: 0, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffa58c),
    clearcoat: 0.05, clearcoatRoughness: 0.7, side: THREE.DoubleSide, emissive: new THREE.Color(0x9fe3cf), emissiveIntensity: 0
  });
  const SKIN = 0xc98d6c;
  const hands = {};
  const glow = {};
  const loader = new GLTFLoader();
  const base3d = new URL('../assets/hands/', import.meta.url).href;

  Promise.all(['left', 'right'].map((side) => loader.loadAsync(base3d + side + '.glb').then((g) => setupHand(side, g))))
    .then(() => {
      sim.classList.add('has-3d');
      ready = true;
      resize();
    })
    .catch(() => { canvas.remove(); });

  function setupHand(side, gltf) {
    const mat = skin(SKIN);
    const root = gltf.scene;
    const bones = {};
    root.traverse((o) => {
      if (o.isMesh || o.isSkinnedMesh) {
        o.material = mat; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        if (o.geometry) o.geometry.computeVertexNormals();
      }
      if (o.isBone || /finger|thumb|wrist/.test(o.name)) bones[o.name] = o;
    });
    // Rest pose of every joint, to curl from
    const rest = {};
    Object.keys(bones).forEach((n) => { rest[n] = { p: bones[n].position.clone(), q: bones[n].quaternion.clone() }; });

    // Lay the hand palm-down on the table, fingers pointing away from the viewer.
    // WebXR joints: local -Z runs along the bone toward the fingertip, local +Y is the back of the hand.
    const holder = new THREE.Group();
    holder.add(root);
    const s = side === 'left' ? -1 : 1;
    const wq = rest.wrist.q;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(wq);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(wq);
    const mBasis = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(up, fwd.clone().negate()).normalize(), up, fwd.clone().negate());
    const wBasis = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1));
    root.quaternion.setFromRotationMatrix(wBasis.multiply(mBasis.transpose()));
    root.updateMatrixWorld(true);
    // Centre the wrist at the holder's origin
    const wrist = new THREE.Vector3();
    bones.wrist.getWorldPosition(wrist);
    root.position.sub(wrist);
    holder.position.set(0.095 * s, 0.015, 0.0);
    holder.rotation.y = -0.2 * s;       // fingers angle slightly toward the cup
    holder.rotation.z = 0.12 * s;       // little-finger side rests lower, like a relaxed hand
    holder.rotation.x = 0.16;           // level the palm so the fingers lie along the table
    scene.add(holder);

    // Forearm: a tapered, slightly flattened limb from the wrist toward the viewer
    const arm = new THREE.Mesh(forearmGeometry(), mat);
    arm.castShadow = true; arm.receiveShadow = true;
    arm.position.set(0, -0.005, -0.03);
    arm.rotation.x = -0.16;            // undo the palm tilt so the arm stays flat on the table
    holder.add(arm);

    // Soft glow on the table under the cued hand
    const g = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({
      map: glowTexture(), color: 0x9fe3cf, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    g.rotation.x = -Math.PI / 2;
    g.position.set(holder.position.x, 0.001, -0.07);
    scene.add(g);
    glow[side] = g;

    hands[side] = { holder, bones, rest, mat, close: 0, cue: 0, side: s, flex: -1 };
    const h = hands[side];
    const tip0 = rest['index-finger-tip'].p.clone();
    bendChain(h, CHAIN.map((p) => 'index-finger-' + p), [0, 0.5, 0, 0]);
    const moved = bones['index-finger-tip'].position.clone().sub(tip0);
    if (moved.dot(up) > 0) h.flex = 1;   // moved toward the back of the hand: bend the other way
    applyCurl(hands[side], 0);
  }

  // ---------- Finger curl (forward kinematics over the flat WebXR joint list) ----------
  const FINGERS = ['index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
  const CHAIN = ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'];
  // Bend angles (radians) at a full fist for metacarpal, proximal, intermediate, distal joints
  const FIST = [0.08, 1.45, 1.6, 0.9];
  const RELAX = [0.0, 0.06, 0.1, 0.04];  // a relaxed open hand is only slightly curved
  const THUMB = ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'];
  const THUMB_FIST = [0.35, 0.75, 0.9];
  const THUMB_RELAX = [0.05, 0.12, 0.15];
  const X = new THREE.Vector3(1, 0, 0);
  const tmpQ = new THREE.Quaternion();
  const tmpV = new THREE.Vector3();
  const axis = new THREE.Vector3();

  function bendChain(h, names, angles) {
    // Work from the fingertip back to the knuckle: each joint rotates everything beyond it
    for (let k = angles.length - 1; k >= 0; k--) {
      const j = h.bones[names[k]];
      if (!j || !angles[k]) continue;
      axis.copy(X).applyQuaternion(j.quaternion).normalize();
      tmpQ.setFromAxisAngle(axis, h.flex * angles[k]);  // h.flex makes this bend toward the palm
      for (let m = k + 1; m < names.length; m++) {
        const b = h.bones[names[m]];
        if (!b) continue;
        tmpV.copy(b.position).sub(j.position).applyQuaternion(tmpQ).add(j.position);
        b.position.copy(tmpV);
        b.quaternion.premultiply(tmpQ);
      }
      j.quaternion.premultiply(tmpQ);
    }
  }

  function applyCurl(h, c) {
    Object.keys(h.rest).forEach((n) => { h.bones[n].position.copy(h.rest[n].p); h.bones[n].quaternion.copy(h.rest[n].q); });
    const e = c * c * (3 - 2 * c);   // smoothstep feels more like a real grip
    FINGERS.forEach((f, i) => {
      const lag = 1 - i * 0.04;       // the little finger follows the index slightly
      bendChain(h, CHAIN.map((p) => f + '-' + p), FIST.map((a, k) => RELAX[k] + (a - RELAX[k]) * e * lag));
    });
    bendChain(h, THUMB, THUMB_FIST.map((a, k) => THUMB_RELAX[k] + (a - THUMB_RELAX[k]) * e));
  }

  // ---------- Loop ----------
  let ready = false, running = false, last = 0, slow = 0, lowQuality = false;
  const readState = (side) => {
    const wrap = document.getElementById('sim-' + side);
    const svg = wrap && wrap.querySelector('.sim-hand');
    return { c: svg ? parseFloat(svg.style.getPropertyValue('--c')) || 0 : 0, cued: !!(wrap && wrap.classList.contains('cued')) };
  };
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    ['left', 'right'].forEach((side) => {
      const h = hands[side];
      if (!h) return;
      const st = readState(side);
      // Ease toward the target so the movement looks natural, not stepped
      const target = Math.max(0, Math.min(1, st.c));
      const prev = h.close;
      h.close += (target - h.close) * Math.min(1, dt * 9);
      if (Math.abs(h.close - prev) > 1e-4 || !h.drawn) { applyCurl(h, h.close); h.drawn = true; }
      h.cue += ((st.cued ? 1 : 0) - h.cue) * Math.min(1, dt * 6);
      h.mat.emissiveIntensity = 0.08 * h.cue;
      glow[side].material.opacity = 0.55 * h.cue;
    });
    // A very slow, slight head sway so the view feels alive (off when reduced motion is on)
    if (!reduce && !window.NH3D.freezeCamera) {
      const t = now / 1000;
      camera.position.set(camHome.x + Math.sin(t * 0.23) * 0.004, camHome.y + Math.sin(t * 0.31) * 0.003, camHome.z);
      camera.lookAt(LOOK);
    }
    renderer.render(scene, camera);
    // Slow computer: drop to lower resolution and simpler shadows once, instead of stuttering
    if (!lowQuality) {
      slow = dt > 0.045 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 90) {
        lowQuality = true;
        renderer.setPixelRatio(1);
        key.shadow.mapSize.set(1024, 1024); key.shadow.map && key.shadow.map.dispose(); key.shadow.map = null;
        resize();
      }
    }
    requestAnimationFrame(frame);
  }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const w = sim.clientWidth || window.innerWidth, h = sim.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // On a tall phone screen, step back so both hands stay in view
    // Narrow screens (phones): step back and look more from above so both hands fit
    const a = w / h;
    const k = a >= 1.3 ? 0 : Math.min(1, (1.3 - a) / 0.85);
    camHome.set(0, 0.33 + 0.27 * k, 0.37 + 0.2 * k);
    camera.fov = 42 + 14 * k;
    camera.position.copy(camHome);
    camera.lookAt(LOOK);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // Only render while the training scene is open
  const sync = () => {
    const open = !sim.hidden;
    if (open && !running) { running = true; resize(); last = performance.now(); requestAnimationFrame(frame); }
    if (!open) running = false;
  };
  new MutationObserver(sync).observe(sim, { attributes: true, attributeFilter: ['hidden'] });
  sync();
  window.NH3D = { scene, camera, hands, applyCurl, render: () => renderer.render(scene, camera), get ready() { return ready; } };
}

// ---------- Procedural textures ----------
function woodTexture(renderer) {
  const W = 2048, H = 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#4b2f1d';
  g.fillRect(0, 0, W, H);
  // Seeded random so the grain is the same every time
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // Planks
  const planks = 5;
  for (let p = 0; p < planks; p++) {
    const y0 = (p * H) / planks;
    const tone = 0.85 + rnd() * 0.25;
    g.fillStyle = `rgba(${Math.round(92 * tone)},${Math.round(58 * tone)},${Math.round(36 * tone)},0.6)`;
    g.fillRect(0, y0, W, H / planks);
    // Long grain lines with gentle waves
    for (let i = 0; i < 90; i++) {
      const y = y0 + rnd() * (H / planks);
      const amp = 2 + rnd() * 6, freq = 0.002 + rnd() * 0.004, ph = rnd() * 6.28;
      const dark = rnd() < 0.6;
      g.strokeStyle = dark ? `rgba(30,16,8,${0.06 + rnd() * 0.12})` : `rgba(140,96,62,${0.03 + rnd() * 0.07})`;
      g.lineWidth = 1 + rnd() * 3.5;
      g.beginPath();
      for (let x = 0; x <= W; x += 16) {
        const yy = y + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1 + ph) * amp * 0.3;
        if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
      }
      g.stroke();
    }
    // Plank seam
    g.fillStyle = 'rgba(20,10,5,0.55)';
    g.fillRect(0, y0, W, 2);
  }
  // A few knots
  for (let k = 0; k < 2; k++) {
    const x = rnd() * W, y = rnd() * H, r = 8 + rnd() * 10;
    const grad = g.createRadialGradient(x, y, 1, x, y, r * 2.4);
    grad.addColorStop(0, 'rgba(35,18,8,0.35)');
    grad.addColorStop(0.4, 'rgba(60,32,16,0.15)');
    grad.addColorStop(1, 'rgba(60,32,16,0)');
    g.fillStyle = grad;
    g.beginPath(); g.ellipse(x, y, r * 2.4, r, 0, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;   // no visible seam where it repeats
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.rotation = Math.PI / 2;   // grain runs away from the viewer, like in the reference photo
  tex.repeat.set(1.6, 1);
  tex.center.set(0.5, 0.5);
  return tex;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function forearmGeometry() {
  // A lathe profile (wrist narrow, widening toward the elbow), flattened like a real forearm
  const pts = [];
  const L = 0.52;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const r = 0.0235 + 0.008 * Math.pow(t, 0.7) + 0.003 * Math.sin(t * Math.PI);
    pts.push(new THREE.Vector2(r, t * L));
  }
  const geo = new THREE.LatheGeometry(pts, 48);
  geo.rotateX(Math.PI / 2);           // along +Z (toward the viewer)
  geo.scale(1.22, 0.68, 1);           // wider than it is tall
  // Keep the underside resting on the table as the arm gets thicker toward the elbow
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i), t = Math.max(0, Math.min(1, z / L));
    const r = 0.0235 + 0.008 * Math.pow(t, 0.7) + 0.003 * Math.sin(t * Math.PI);
    pos.setY(i, pos.getY(i) + (r - 0.0235) * 0.68);
  }
  geo.computeVertexNormals();
  // Close the wrist end so no hole shows
  return geo;
}
