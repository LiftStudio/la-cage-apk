// Animation du panier : le cercle fléchit comme un vrai « breakaway » (charnière au panneau, ressort amorti) et le filet
// est simulé corde par corde (points reliés par des contraintes de distance, intégration de Verlet) : il se gonfle quand
// la balle le traverse, ondule, retombe. Le haut du filet est accroché au cercle et suit donc sa flexion.
//
// Un HoopFx par panier. Créé tout de suite avec son filet (buildNet) ; le cercle 3D arrive plus tard (chargement du GLB)
// et vient se greffer sur le pivot par attachRim(). Mis à jour par scene.userData.animate → update(dt, ballPos).
import * as THREE from 'three';

const G = -9.81;
const SPRING_K = 420;      // raideur du ressort du cercle (ω ≈ 20 rad/s ≈ 3,3 Hz)
const SPRING_C = 5.5;      // amortissement (quelques oscillations visibles)
const TILT_MAX = 0.26;     // flexion maximale (rad ≈ 15°) : le tore de collision, lui, ne bouge pas
const TILT_MIN = -0.020;   // léger rebond au-dessus du repos

// ---------- filet : forme au repos (rayons et hauteurs par rang, relatifs au centre du cercle) ----------
const N_COL = 12;
const NET_R = [0.2255, 0.200, 0.176, 0.153, 0.133, 0.120, 0.117, 0.124];   // la taille (11,7 cm) est plus serrée que la balle : elle écarte les mailles
const NET_Y = [0, -0.065, -0.13, -0.195, -0.26, -0.322, -0.372, -0.412];
const CORD_R = 0.0032, HEM_R = 0.0038;
const RADIAL = 5;          // côtés d'une corde
const RINGS = 3;           // anneaux le long d'une corde (milieu = ventre)

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
const _u = new THREE.Vector3(), _v = new THREE.Vector3(), _t = new THREE.Vector3(), _p = new THREE.Vector3();
const UPV = new THREE.Vector3(0, 1, 0), ALT = new THREE.Vector3(1, 0, 0);

export class HoopFx {
  // hp : { x, y, z, sgn } du panier ; boardDist : distance du centre du cercle au plan du panneau (m)
  constructor(scene, hp, boardDist) {
    this.hp = hp; this.boardDist = boardDist;
    this.tilt = 0; this.tiltVel = 0; this.rim = null; this.hitCd = 0; this.asleep = false; this.maxV2 = 0;
    // pivot = charnière au panneau ; on y suspend le cercle, et le haut du filet suit la même rotation
    this.pivot = new THREE.Group();
    this.pivot.position.set(hp.x, hp.y, hp.z + hp.sgn * boardDist);
    scene.add(this.pivot);
    this.hinge = new THREE.Vector3().copy(this.pivot.position);
    this.buildNet(scene);
  }

  // le cercle 3D chargé : on le replace en coordonnées du pivot pour qu'il tourne avec la charnière
  attachRim(group) {
    this.tilt = 0; this.tiltVel = 0;                  // charnière au repos : la conversion monde → pivot est alors exacte
    this.pivot.rotation.x = 0; this.pivot.updateMatrixWorld(true);
    group.position.sub(this.pivot.position);
    this.pivot.add(group);
    this.rim = group; this.asleep = false;
  }

  // impulsion sur le cercle : s en rad/s (≈ 1 pour une balle qui claque, ≈ 6 pour un dunk)
  // La collision balle/cercle est évaluée 3 fois par image (sous-pas de Ball.update) : dans une même fenêtre on garde
  // la plus forte impulsion au lieu de les additionner, sinon un simple contact secouerait le cercle comme un dunk.
  hit(s) {
    s = Math.max(0, s); if (!s) return;
    if (this.hitCd > 0) this.tiltVel = Math.max(this.tiltVel, s);
    else { this.tiltVel += s; this.hitCd = 0.07; }
    this.asleep = false;
  }

  // ---------- filet ----------
  buildNet(scene) {
    const rows = NET_R.length, n = rows * N_COL;
    this.rows = rows;
    this.rest = new Float32Array(n * 3);     // position au repos, dans le repère du pivot (pour les nœuds accrochés)
    this.restW = new Float32Array(n * 3);    // la même en monde, recalculée quand le cercle fléchit (rappel de forme)
    this.pos = new Float32Array(n * 3);      // position monde
    this.prev = new Float32Array(n * 3);
    this.pinned = new Uint8Array(n);
    const hp = this.hp;
    for (let k = 0; k < rows; k++) for (let j = 0; j < N_COL; j++) {
      const i = k * N_COL + j, ang = (j + (k % 2 ? 0.5 : 0)) * Math.PI * 2 / N_COL;
      // repère du pivot : le centre du cercle est à z = -sgn * boardDist du pivot
      const x = Math.cos(ang) * NET_R[k], y = NET_Y[k], z = Math.sin(ang) * NET_R[k] - hp.sgn * this.boardDist;
      this.rest[i * 3] = x; this.rest[i * 3 + 1] = y; this.rest[i * 3 + 2] = z;
      const wx = hp.x + Math.cos(ang) * NET_R[k], wy = hp.y + NET_Y[k], wz = hp.z + Math.sin(ang) * NET_R[k];
      this.pos[i * 3] = this.prev[i * 3] = wx;
      this.pos[i * 3 + 1] = this.prev[i * 3 + 1] = wy;
      this.pos[i * 3 + 2] = this.prev[i * 3 + 2] = wz;
      if (k === 0) this.pinned[i] = 1;        // rang du haut : accroché aux crochets du cercle
    }
    // cordes : mailles en losange entre rangs + ourlet du bas
    const cords = [];
    const at = (k, j) => k * N_COL + ((j % N_COL) + N_COL) % N_COL;
    for (let k = 0; k < rows - 1; k++) for (let j = 0; j < N_COL; j++) {
      cords.push([at(k, j), at(k + 1, k % 2 ? j : j - 1), CORD_R]);
      cords.push([at(k, j), at(k + 1, k % 2 ? j + 1 : j), CORD_R]);
    }
    for (let j = 0; j < N_COL; j++) cords.push([at(rows - 1, j), at(rows - 1, j + 1), HEM_R]);
    this.cords = cords;
    this.len = new Float32Array(cords.length);
    for (let c = 0; c < cords.length; c++) {
      const [ia, ib] = cords[c];
      this.len[c] = Math.hypot(this.pos[ia * 3] - this.pos[ib * 3], this.pos[ia * 3 + 1] - this.pos[ib * 3 + 1], this.pos[ia * 3 + 2] - this.pos[ib * 3 + 2]);
    }
    // géométrie : un petit tube (RINGS anneaux de RADIAL côtés) par corde, reconstruit à chaque image
    const vpc = RINGS * RADIAL, nv = cords.length * vpc;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    const idx = [];
    for (let c = 0; c < cords.length; c++) {
      const o = c * vpc;
      for (let r = 0; r < RINGS - 1; r++) for (let s = 0; s < RADIAL; s++) {
        const s2 = (s + 1) % RADIAL, a = o + r * RADIAL + s, b = o + r * RADIAL + s2, cc = o + (r + 1) * RADIAL + s, dd = o + (r + 1) * RADIAL + s2;
        idx.push(a, cc, b, b, cc, dd);
      }
    }
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(hp.x, hp.y - 0.2, hp.z), 0.6);
    this.geo = geo;
    this.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xf2f0e8, roughness: 0.95, metalness: 0 }));
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;   // le filet passe dans l'ombre du panneau
    // Hors de la passe de normales de l'occlusion (GTAO, js/fx.js) : sur des cordes de 3 mm, elle calculait une
    // occlusion absurde qui rendait le filet gris « chaîne » en haute et au-dessus, et sa profondeur posait une
    // auréole sombre sur la planche. La photo 1000051601 montre un filet de nylon blanc.
    this.mesh.userData.sansNormales = true;
    scene.add(this.mesh);
    this.writeGeometry();
  }

  // ---------- simulation ----------
  update(dt, ball) {
    if (!(dt > 0)) return;
    dt = Math.min(dt, 1 / 30);
    this.hitCd = Math.max(0, this.hitCd - dt);
    // ressort du cercle (oscillateur amorti), puis rotation du pivot autour de l'axe du panneau
    this.tiltVel += (-SPRING_K * this.tilt - SPRING_C * this.tiltVel) * dt;
    const t2 = this.tilt + this.tiltVel * dt;
    this.tilt = Math.max(TILT_MIN, Math.min(TILT_MAX, t2));
    if (t2 !== this.tilt) this.tiltVel = 0;                    // butée : on ne continue pas à pousser contre
    this.pivot.rotation.x = -this.hp.sgn * this.tilt;
    this.pivot.updateMatrixWorld(true);
    // filet : sous-pas quand la balle est proche (une balle rapide traverserait les mailles en une image)
    const bp = ball && ball.pos;
    const near = bp && Math.abs(bp.y - this.hp.y) < 1.1 && Math.hypot(bp.x - this.hp.x, bp.z - this.hp.z) < 0.9;
    // au repos (cercle immobile, filet immobile, balle ailleurs) : on saute la simulation ET la reconstruction du maillage
    if (this.asleep && !near) return;
    const speed = near && ball.vel ? ball.vel.length() : 0;
    const steps = near ? Math.min(6, 2 + Math.floor(speed / 3)) : 1, h = dt / steps;
    this.maxV2 = 0;
    for (let s = 0; s < steps; s++) this.step(h, near ? ball : null);
    this.writeGeometry();
    this.asleep = !near && Math.abs(this.tilt) < 2e-4 && Math.abs(this.tiltVel) < 2e-3 && this.maxV2 < 4e-9;
  }

  step(dt, ball) {
    const pos = this.pos, prev = this.prev, rest = this.rest, restW = this.restW, n = this.pinned.length;
    const damp = 0.985, g = G * dt * dt, m = this.pivot.matrixWorld;
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      _p.set(rest[o], rest[o + 1], rest[o + 2]).applyMatrix4(m);       // forme au repos, suspendue au cercle fléchi
      restW[o] = _p.x; restW[o + 1] = _p.y; restW[o + 2] = _p.z;
      if (this.pinned[i]) {                                            // rang du haut : accroché aux crochets
        prev[o] = pos[o]; prev[o + 1] = pos[o + 1]; prev[o + 2] = pos[o + 2];
        pos[o] = _p.x; pos[o + 1] = _p.y; pos[o + 2] = _p.z;
        continue;
      }
      const vx = (pos[o] - prev[o]) * damp, vy = (pos[o + 1] - prev[o + 1]) * damp, vz = (pos[o + 2] - prev[o + 2]) * damp;
      const v2 = vx * vx + vy * vy + vz * vz; if (v2 > this.maxV2) this.maxV2 = v2;
      prev[o] = pos[o]; prev[o + 1] = pos[o + 1]; prev[o + 2] = pos[o + 2];
      pos[o] += vx; pos[o + 1] += vy + g; pos[o + 2] += vz;
    }
    if (ball) this.dragBall(ball, dt);
    this.restore(Math.min(0.4, 3.0 * dt));                     // rappel souple (≈ 3 /s) : le filet retrouve sa forme sans être rigide
    for (let it = 0; it < 3; it++) {
      this.solveCords();
      if (ball) this.collideBall(ball.pos);
    }
  }

  // la balle entraîne les cordes qu'elle touche : c'est ce qui fait claquer le filet au passage (le « swish »)
  dragBall(ball, dt) {
    const v = ball.vel; if (!v || ball.state === 'held') return;
    const pos = this.pos, pin = this.pinned, bp = ball.pos, R = (ball.r || 0.12) + CORD_R + 0.02;
    const kx = v.x * dt * 0.55, ky = v.y * dt * 0.55, kz = v.z * dt * 0.55;
    for (let i = 0; i < pin.length; i++) {
      if (pin[i]) continue;
      const o = i * 3, dx = pos[o] - bp.x, dy = pos[o + 1] - bp.y, dz = pos[o + 2] - bp.z;
      if (dx * dx + dy * dy + dz * dz >= R * R) continue;
      pos[o] += kx; pos[o + 1] += ky; pos[o + 2] += kz;
    }
  }

  // rappel élastique vers la forme au repos : le filet garde sa silhouette (les cordes ne se vrillent pas) et retombe
  // en place après le passage de la balle, sans empêcher le gonflement (facteur faible).
  restore(k) {
    const pos = this.pos, restW = this.restW, pin = this.pinned;
    for (let i = 0; i < pin.length; i++) {
      if (pin[i]) continue;
      const o = i * 3;
      pos[o] += (restW[o] - pos[o]) * k;
      pos[o + 1] += (restW[o + 1] - pos[o + 1]) * k;
      pos[o + 2] += (restW[o + 2] - pos[o + 2]) * k;
    }
  }

  solveCords() {
    const pos = this.pos, cords = this.cords, len = this.len, pin = this.pinned;
    for (let c = 0; c < cords.length; c++) {
      const ia = cords[c][0], ib = cords[c][1], oa = ia * 3, ob = ib * 3;
      const dx = pos[ob] - pos[oa], dy = pos[ob + 1] - pos[oa + 1], dz = pos[ob + 2] - pos[oa + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
      const k = (d - len[c]) / d * 0.5;
      const pa = pin[ia], pb = pin[ib];
      if (pa && pb) continue;
      const ka = pb ? 2 * k : k, kb = pa ? 2 * k : k;
      if (!pa) { pos[oa] += dx * ka; pos[oa + 1] += dy * ka; pos[oa + 2] += dz * ka; }
      if (!pb) { pos[ob] -= dx * kb; pos[ob + 1] -= dy * kb; pos[ob + 2] -= dz * kb; }
    }
  }

  // la balle repousse les nœuds vers l'extérieur de sa sphère : c'est ce qui fait gonfler le filet au passage
  collideBall(bp) {
    const pos = this.pos, pin = this.pinned, R = 0.12 + CORD_R;
    for (let i = 0; i < pin.length; i++) {
      if (pin[i]) continue;
      const o = i * 3, dx = pos[o] - bp.x, dy = pos[o + 1] - bp.y, dz = pos[o + 2] - bp.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= R * R || d2 < 1e-9) continue;
      const d = Math.sqrt(d2), k = (R - d) / d;
      pos[o] += dx * k; pos[o + 1] += dy * k; pos[o + 2] += dz * k;
    }
  }

  // ---------- rendu : un tube par corde, légèrement bombé vers l'extérieur (le filet pend, il n'est pas tendu) ----------
  writeGeometry() {
    const pos = this.pos, cords = this.cords, P = this.geo.attributes.position.array, NR = this.geo.attributes.normal.array;
    const cx = this.hp.x, cz = this.hp.z, vpc = RINGS * RADIAL;
    for (let c = 0; c < cords.length; c++) {
      const ia = cords[c][0] * 3, ib = cords[c][1] * 3, rad = cords[c][2];
      _a.set(pos[ia], pos[ia + 1], pos[ia + 2]); _b.set(pos[ib], pos[ib + 1], pos[ib + 2]);
      _d.subVectors(_b, _a);
      const L = _d.length() || 1e-6; _d.multiplyScalar(1 / L);
      _u.copy(Math.abs(_d.y) > 0.9 ? ALT : UPV).cross(_d).normalize();
      _v.crossVectors(_d, _u);
      // ventre : le milieu de la corde s'écarte du centre du panier
      _t.set((_a.x + _b.x) / 2 - cx, 0, (_a.z + _b.z) / 2 - cz);
      const rr = _t.length() || 1; _t.multiplyScalar(0.012 / rr); _t.y = -0.004;
      for (let r = 0; r < RINGS; r++) {
        const f = r / (RINGS - 1), bul = 1 - Math.abs(2 * f - 1);
        _p.lerpVectors(_a, _b, f).addScaledVector(_t, bul);
        for (let s = 0; s < RADIAL; s++) {
          const ang = s * Math.PI * 2 / RADIAL, ca = Math.cos(ang) * rad, sa = Math.sin(ang) * rad;
          const o = (c * vpc + r * RADIAL + s) * 3;
          P[o] = _p.x + _u.x * ca + _v.x * sa; P[o + 1] = _p.y + _u.y * ca + _v.y * sa; P[o + 2] = _p.z + _u.z * ca + _v.z * sa;
          NR[o] = (_u.x * ca + _v.x * sa) / rad; NR[o + 1] = (_u.y * ca + _v.y * sa) / rad; NR[o + 2] = (_u.z * ca + _v.z * sa) / rad;
        }
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.normal.needsUpdate = true;
  }
}
