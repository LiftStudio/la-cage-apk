import * as THREE from 'three';
import { NATURAL_CLAV } from './anim.js';

// Applique les poses procédurales (mêmes valeurs que le bonhomme en primitives)
// sur un squelette standard Mixamo/Avaturn (Hips, Spine, LeftArm, LeftForeArm, ...).
//
// Principe : chaque rotation est exprimée dans le repère du personnage "comme si
// tous les parents étaient au repos" :  q = P⁻¹ · R · P · rest
// (P = orientation au repos du parent). Le repos utilisé = T-pose avec les bras
// ramenés le long du corps, pour que "rotation X négative = membre vers l'avant".

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion(), _r = new THREE.Quaternion(), _t = new THREE.Quaternion();
const _S = new THREE.Vector3(), _E = new THREE.Vector3(), _W = new THREE.Vector3(), _T = new THREE.Vector3();
const _d = new THREE.Vector3(), _p = new THREE.Vector3(), _e2 = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
const _M = new THREE.Vector3(), _I = new THREE.Vector3(), _K = new THREE.Vector3(), _f = new THREE.Vector3(), _l = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Vector3();
const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _q0 = new THREE.Quaternion();
const _eu = new THREE.Euler(), _qd = new THREE.Quaternion(), _qp = new THREE.Quaternion();

const BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
const FINGERS = [];
for (const side of ['Left', 'Right']) for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (let i = 1; i <= 3; i++) FINGERS.push(`${side}Hand${f}${i}`);

export class AvatarRig {
  constructor(model) {
    this.bones = {};
    model.traverse((o) => { if (o.isBone) this.bones[o.name.replace(/^mixamorig:?/, '')] = o; });
    model.updateMatrixWorld(true);
    this.rootInv = new THREE.Quaternion();
    model.getWorldQuaternion(this.rootInv).invert();
    this.entries = {};
    // 0) T-pose d'origine (bras à l'horizontale) : repos + directions des os, pour retargeter la mocap CMU
    this.tpose = {};
    if (!model.userData.armsDown) {
      const CHILD = { Hips: 'Spine', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head', Head: 'HeadTop_End',
        LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', LeftHand: 'LeftHandMiddle1',
        RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand', RightHand: 'RightHandMiddle1',
        LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase' };
      const FALLBACK_DIR = { Head: [0, 1, 0], LeftHand: [1, 0, 0], RightHand: [-1, 0, 0], LeftFoot: [0, -0.3, 0.95], RightFoot: [0, -0.3, 0.95] };
      const wp = new THREE.Vector3(), cp = new THREE.Vector3();
      for (const n of BONES) {
        const b = this.bones[n]; if (!b || !b.parent) continue;
        const P = new THREE.Quaternion(); b.parent.getWorldQuaternion(P).premultiply(this.rootInv);
        const child = this.bones[CHILD[n]];
        let dir;
        if (child) { b.getWorldPosition(wp); child.getWorldPosition(cp); dir = cp.clone().sub(wp).normalize(); }
        else dir = new THREE.Vector3(...(FALLBACK_DIR[n] || [0, 1, 0])).normalize();
        this.tpose[n] = { bone: b, rest: b.quaternion.clone(), P, Pinv: P.clone().invert(), dir };
      }
      const hips = this.bones.Hips; this.tposeHipsY = hips ? hips.position.y : 0.95;
    }
    // 1) bras le long du corps (T-pose -> bras baissés, légèrement écartés) — une seule fois par modèle
    if (!model.userData.armsDown) {
      this._prep('LeftArm'); this._prep('RightArm');
      this._set('LeftArm', 0, -Math.PI / 2 + 0.1);
      this._set('RightArm', 0, Math.PI / 2 - 0.1);
      model.updateMatrixWorld(true);
      model.userData.armsDown = true;
    }
    // 2) on capture ce repos pour tous les os pilotés
    for (const n of [...BONES, ...FINGERS]) this._prep(n);
    this.ok = !!(this.entries.LeftArm && this.entries.LeftUpLeg && this.entries.Spine);
    // 3) CLAVICULES DÉTENDUES (06/10/2026). La pose procédurale remettait les clavicules à leur repos — celui de la
    // T-pose, épaules haussées et serrées — alors que tous les clips les posent à la pose détendue (relaxClavicles,
    // js/anim.js). Chaque fois que les bras passaient du clip à la pose du jeu (passe, réception, dribble en
    // course), les épaules sautaient de 30°. On impose la même pose détendue, et on contre-tourne le bras
    // (q_bras' = N⁻¹ · repos · q_bras) : la main reste exactement où la pose procédurale la met.
    this._clav = {};
    for (const s of ['Left', 'Right']) {
      const e = this.entries[s + 'Shoulder'];
      if (e) this._clav[s] = { nat: NATURAL_CLAV[s].clone(), comp: NATURAL_CLAV[s].clone().invert().multiply(e.rest) };
    }
    // 4) mémoire des os pilotés, pour les reprises par-dessus le mélangeur et le fondu de pose (voir surDebut)
    this._liste = Object.values(this.entries).map((e) => e.bone);
    const n4 = this._liste.length * 4;
    // (Float64 : la comparaison à l'identique de surAnnuler échouerait sur des valeurs arrondies en 32 bits)
    this._pre = new Float64Array(n4); this._post = new Float64Array(n4); this._src = new Float64Array(n4);
    this._preH = new THREE.Vector3(); this._postH = new THREE.Vector3(); this._srcH = new THREE.Vector3();
    this._surOk = false; this._postOk = false; this._fondu = { t: 0, dur: 0 };
  }

  // REPRISES PAR-DESSUS LE MÉLANGEUR. Les bras procéduraux, la couche « haut du corps », la hauteur du saut et le
  // fondu de pose écrivent dans des os que le mélangeur vient de poser. Or three n'écrit un os que si la valeur
  // qu'il calcule A CHANGÉ depuis l'image d'avant (PropertyMixer.apply) : un clip figé à sa dernière image, une
  // couche arrêtée à une phase donnée, et notre reprise restait dans l'os pour de bon — un bras levé qui ne
  // redescendait plus. Même remède que pour les couches de vie (couchesAnnuler) : on retient la pose écrite par
  // le mélangeur (surDebut) et la pose finale (surFin) ; au pas suivant, un os que personne n'a réécrit reprend
  // la valeur du mélangeur avant que celui-ci ne passe.
  surDebut() {
    const L = this._liste, a = this._pre;
    for (let i = 0, j = 0; i < L.length; i++, j += 4) { const q = L[i].quaternion; a[j] = q._x; a[j + 1] = q._y; a[j + 2] = q._z; a[j + 3] = q._w; }
    const h = this.entries.Hips; if (h) this._preH.copy(h.bone.position);
    this._surOk = true;
  }
  surFin() {
    const L = this._liste, a = this._post;
    for (let i = 0, j = 0; i < L.length; i++, j += 4) { const q = L[i].quaternion; a[j] = q._x; a[j + 1] = q._y; a[j + 2] = q._z; a[j + 3] = q._w; }
    const h = this.entries.Hips; if (h) this._postH.copy(h.bone.position);
    this._postOk = true;
  }
  surAnnuler() {
    if (!this._surOk) return;
    this._surOk = false;
    const L = this._liste, a = this._post, b = this._pre;
    for (let i = 0, j = 0; i < L.length; i++, j += 4) {
      const q = L[i].quaternion;
      if (q._x === a[j] && q._y === a[j + 1] && q._z === a[j + 2] && q._w === a[j + 3]
        && (a[j] !== b[j] || a[j + 1] !== b[j + 1] || a[j + 2] !== b[j + 2] || a[j + 3] !== b[j + 3])) q.fromArray(b, j);
    }
    const h = this.entries.Hips; if (h && h.bone.position.equals(this._postH)) h.bone.position.copy(this._preH);
  }
  // FONDU DE POSE. Passer d'un clip à la pose procédurale (rebond reçu au sol, emote maison, s'asseoir), ou
  // d'une pose procédurale à un clip qui part à plein poids, se faisait d'une image à l'autre : tout le corps
  // sautait. On part de la DERNIÈRE pose affichée (surFin du pas d'avant) et on glisse vers la nouvelle en
  // `dur` secondes, os par os. `dy` (unités du modèle) recale la hauteur des hanches quand la hauteur du saut
  // passe du groupe du joueur à l'os des hanches, ou l'inverse.
  fonduDepuis(dur, dy = 0) {
    if (!this._postOk || !(dur > 0)) return;
    this._src.set(this._post); this._srcH.copy(this._postH); this._srcH.y += dy;
    this._fondu.t = 0; this._fondu.dur = dur;
  }
  get enFondu() { return this._fondu.dur > 0; }
  fonduAppliquer(dt) {
    const F = this._fondu; if (!(F.dur > 0)) return;
    F.t += dt;
    const u = Math.min(1, F.t / F.dur), w = u * u * (3 - 2 * u);
    if (u >= 1) { F.dur = 0; return; }
    const L = this._liste, a = this._src;
    for (let i = 0; i < L.length; i++) { _qa.fromArray(a, i * 4).slerp(L[i].quaternion, w); L[i].quaternion.copy(_qa); }
    const h = this.entries.Hips; if (h) h.bone.position.lerpVectors(this._srcH, h.bone.position, w);
  }

  // clavicule détendue + bras contre-tourné, mélangés à la pose en place selon k (1 = pose procédurale pure)
  _bras(side, rx, rz, ry, k) {
    const C = this._clav[side], sh = this.entries[side + 'Shoulder'], e = this.entries[side + 'Arm'];
    if (!e) return;
    _r.setFromAxisAngle(X, rx);
    if (ry) { _t.setFromAxisAngle(Y, ry); _r.multiply(_t); }
    _t.setFromAxisAngle(Z, rz); _r.multiply(_t);
    _q.copy(e.Pinv).multiply(_r).multiply(e.P).multiply(e.rest);
    if (C && sh) {
      _q.premultiply(C.comp);
      if (k >= 1) sh.bone.quaternion.copy(C.nat); else sh.bone.quaternion.slerp(C.nat, k);
    }
    if (k >= 1) e.bone.quaternion.copy(_q); else e.bone.quaternion.slerp(_q, k);
  }
  // _set mélangé : l'os va de sa pose actuelle (celle du clip) vers la pose procédurale, selon k
  _setK(name, rx, rz, ry, k) {
    if (k >= 1) { this._set(name, rx, rz, ry); return; }
    const e = this.entries[name];
    if (!e || !(k > 0)) return;
    _r.setFromAxisAngle(X, rx);
    if (ry) { _t.setFromAxisAngle(Y, ry); _r.multiply(_t); }
    _t.setFromAxisAngle(Z, rz); _r.multiply(_t);
    _q.copy(e.Pinv).multiply(_r).multiply(e.P).multiply(e.rest);
    e.bone.quaternion.slerp(_q, k);
  }

  _prep(name) {
    const b = this.bones[name];
    if (!b || !b.parent) return;
    const P = new THREE.Quaternion();
    b.parent.getWorldQuaternion(P).premultiply(this.rootInv);
    this.entries[name] = { bone: b, rest: b.quaternion.clone(), restPos: b.position.clone(), P, Pinv: P.clone().invert() };
  }

  // rx : avant/arrière (négatif = vers l'avant), rz : écart latéral, ry : torsion
  _set(name, rx, rz, ry = 0) {
    const e = this.entries[name];
    if (!e) return;
    _r.setFromAxisAngle(X, rx);
    if (ry) { _t.setFromAxisAngle(Y, ry); _r.multiply(_t); }
    _t.setFromAxisAngle(Z, rz); _r.multiply(_t);
    _q.copy(e.Pinv).multiply(_r).multiply(e.P).multiply(e.rest);
    e.bone.quaternion.copy(_q);
  }

  bone(name) { return this.bones[name]; }

  // COUCHES (js/couches.js). `repere` donne l'orientation MONDE du personnage pour ce pas ; `ajouter` tourne
  // ensuite un os PAR-DESSUS sa pose actuelle — celle du clip ou de la pose procédurale — d'une rotation
  // exprimée dans le repère du personnage : rx > 0 penche vers l'avant un os qui monte (et recule un os qui
  // descend), ry > 0 tourne vers SA gauche, rz > 0 couche vers sa droite. Le clip garde son mouvement, on
  // ne fait qu'y ajouter.
  repere(C, Ci) { this._C = C; this._Ci = Ci; }
  // PAS D'EMPILEMENT. Un os que le clip n'écrit pas — les clavicules, la rotation du bassin en pose
  // procédurale — garde d'un pas à l'autre ce que les couches lui ont fait. Sans précaution, l'ajout du pas
  // suivant s'empilait sur celui d'avant : au bout d'une minute de respiration, Pierrick avait les bras en
  // croix et le joueur un bras à la verticale. On retient donc, pour chaque os que les couches peuvent
  // toucher, sa pose AVANT couches et sa pose APRÈS ; au pas suivant, si personne ne l'a réécrit entre-temps,
  // on lui rend sa pose d'avant avant de recommencer.
  //
  // Et on le fait AU DÉBUT du pas, avant le mélangeur de clips (couchesAnnuler, appelé par Player.update) :
  // quand un clip démarre, three.js mémorise la pose COURANTE des os comme « état d'origine » et la remet
  // en place quand plus aucun clip ne les anime. S'il la mémorisait avec nos ajouts dedans, le regard vers
  // le panier s'empilait d'un rebond à l'autre et la tête finissait renversée en arrière.
  couchesAnnuler(noms) {
    const M = this._mem; if (!M) return;
    for (const n of noms) {
      const b = this.bones[n], m = b && M.get(b); if (!m) continue;
      if (b.quaternion.equals(m.q1)) b.quaternion.copy(m.q0);
      if (b.position.equals(m.p1)) b.position.copy(m.p0);
    }
  }
  couchesDebut(noms) {
    const M = this._mem || (this._mem = new Map());
    for (const n of noms) {
      const b = this.bones[n]; if (!b) continue;
      let m = M.get(b);
      if (!m) { m = { q0: new THREE.Quaternion(), q1: new THREE.Quaternion(2, 2, 2, 2), p0: new THREE.Vector3(), p1: new THREE.Vector3(1e9, 1e9, 1e9) }; M.set(b, m); }
      m.q0.copy(b.quaternion); m.p0.copy(b.position);
    }
  }
  couchesFin(noms) {
    const M = this._mem; if (!M) return;
    for (const n of noms) { const b = this.bones[n], m = b && M.get(b); if (m) { m.q1.copy(b.quaternion); m.p1.copy(b.position); } }
  }
  ajouter(nom, rx, ry = 0, rz = 0) {
    const b = this.bones[nom];
    if (!b || !b.parent || !this._C || (!rx && !ry && !rz)) return;
    _eu.set(rx, ry, rz, 'YXZ'); _qd.setFromEuler(_eu);
    _qd.premultiply(this._C).multiply(this._Ci);                  // D = C · R · C⁻¹
    // orientation monde de l'os = celle de son parent × la sienne : une seule remontée de la chaîne
    b.parent.getWorldQuaternion(_qa);
    _qp.copy(_qa).multiply(b.quaternion).premultiply(_qd);
    _qa.invert().multiply(_qp);
    if (Number.isFinite(_qa.x + _qa.y + _qa.z + _qa.w)) b.quaternion.copy(_qa);
  }

  // Tourne un os (en coordonnées MONDE) pour que la direction `de` devienne `vers`, en gardant tout le reste.
  // (une direction nulle ou invalide ne tourne rien : une IK ne doit JAMAIS écrire NaN dans un os — il y
  // resterait, et le ballon qui suit la main avec lui)
  _viser(os, de, vers, k = 1) {
    if (!(de.lengthSq() > 1e-10) || !(vers.lengthSq() > 1e-10)) return;
    _qa.setFromUnitVectors(de, vers);
    // Mélange partiel : on ramène la rotation vers l'identité de (1 - k). SURTOUT PAS
    // `_qa.slerpQuaternions(identité, _qa, k)` : three y fait `this.copy(qa).slerp(qb, t)`, et comme qb est
    // _qa lui-même, il vient d'être écrasé par l'identité — la rotation était PERDUE dès que k < 1 (30/09).
    // C'était le cas du pied en triple menace (js/dribble.js : _posture, k = 0,99999…) : il n'était jamais
    // tourné vers ses orteils, gardait la rotation du tibia replié et piquait de la pointe 4 cm sous le sol,
    // ce qui empêchait de reposer l'autre pied (js/player.js : _suivreSolPosture). Idem pour les pouces qui
    // tiennent le téléphone (k × 0,9).
    if (k < 1) _qa.slerp(_q0.identity(), 1 - k);
    os.getWorldQuaternion(_qb).premultiply(_qa);
    os.parent.getWorldQuaternion(_q).invert();
    _q.multiply(_qb);
    if (!Number.isFinite(_q.x + _q.y + _q.z + _q.w)) return;
    os.quaternion.copy(_q);
    os.updateMatrixWorld(true);
  }
  // Oriente un os vers un point du monde (le pouce vers l'écran).
  viserPoint(nom, enfant, cible, k = 1) {
    const b = this.bones[nom], c = this.bones[enfant];
    if (!b || !c) return;
    b.getWorldPosition(_a); c.getWorldPosition(_b);
    this._viser(b, _b.sub(_a).normalize(), _d.subVectors(cible, _a).normalize(), k);
  }
  // Repère de la main en MONDE : doigts (f), normale de la PAUME (n), à partir des os de la paume.
  repereMain(cote, W, f, n) {
    const B = this.bones;
    B[cote + 'Hand'].getWorldPosition(W);
    B[cote + 'HandMiddle1'].getWorldPosition(_M); B[cote + 'HandIndex1'].getWorldPosition(_I); B[cote + 'HandPinky1'].getWorldPosition(_K);
    f.subVectors(_M, W).normalize();
    _l.subVectors(_I, _K);
    if (cote === 'Right') n.crossVectors(_l, f); else n.crossVectors(f, _l);
    n.addScaledVector(f, -n.dot(f)).normalize();
  }
  aMains(cote) { const B = this.bones; return !!(B[cote + 'Arm'] && B[cote + 'ForeArm'] && B[cote + 'Hand'] && B[cote + 'HandMiddle1'] && B[cote + 'HandIndex1'] && B[cote + 'HandPinky1']); }

  // CINÉMATIQUE INVERSE DU BRAS. On veut le poignet en `cible`, les doigts dans la direction `fDes` et la
  // paume tournée vers `nDes` ; le coude plie du côté de `pole`. Deux os, donc une solution exacte : le
  // triangle épaule-coude-poignet est connu par ses trois côtés, le coude est sur le cercle qu'ils
  // définissent, et `pole` choisit le point du cercle. `k` mélange avec la pose que le bras avait déjà.
  ikBras(cote, cible, fDes, nDes, pole, k = 1) {
    if (!this.aMains(cote) || !(k > 0)) return false;
    if (!Number.isFinite(cible.x + cible.y + cible.z + pole.x + pole.y + pole.z + fDes.x + fDes.y + fDes.z + nDes.x + nDes.y + nDes.z)) return false;
    const B = this.bones, bras = B[cote + 'Arm'], avant = B[cote + 'ForeArm'], main = B[cote + 'Hand'];
    bras.getWorldPosition(_S); avant.getWorldPosition(_E); main.getWorldPosition(_W);
    const a = _S.distanceTo(_E), b = _E.distanceTo(_W);
    _T.copy(_W).lerp(cible, k);
    _d.subVectors(_T, _S);
    const d = Math.min(a + b - 1e-3, Math.max(Math.abs(a - b) + 1e-3, _d.length()));
    _d.normalize(); _T.copy(_S).addScaledVector(_d, d);
    const cos = (a * a + d * d - b * b) / (2 * a * d), sin = Math.sqrt(Math.max(0, 1 - cos * cos));
    _p.subVectors(pole, _S); _p.addScaledVector(_d, -_p.dot(_d));
    if (_p.lengthSq() < 1e-8) _p.set(0, -1, 0); _p.normalize();
    _e2.copy(_S).addScaledVector(_d, cos * a).addScaledVector(_p, sin * a);
    this._viser(bras, _a.subVectors(_E, _S).normalize(), _b.subVectors(_e2, _S).normalize());
    avant.getWorldPosition(_E); main.getWorldPosition(_W);
    this._viser(avant, _a.subVectors(_W, _E).normalize(), _b.subVectors(_T, _E).normalize());
    // la main : on fait coïncider son repère (doigts, paume) avec celui qui est demandé
    this.repereMain(cote, _W, _f, _n);
    _c.crossVectors(_f, _n); _m1.makeBasis(_f, _n, _c);
    _n.copy(nDes).addScaledVector(fDes, -nDes.dot(fDes));
    if (!(_n.lengthSq() > 1e-8) || !(fDes.lengthSq() > 1e-8)) return true;      // repère demandé dégénéré : on garde la main
    _n.normalize();
    _c.crossVectors(fDes, _n); _m2.makeBasis(fDes, _n, _c);
    _qa.setFromRotationMatrix(_m2); _qb.setFromRotationMatrix(_m1).invert(); _qa.multiply(_qb);
    if (k < 1) _qa.slerpQuaternions(_q0.identity(), _qa, k);
    main.getWorldQuaternion(_qb).premultiply(_qa);
    main.parent.getWorldQuaternion(_q).invert();
    _q.multiply(_qb);
    if (!Number.isFinite(_q.x + _q.y + _q.z + _q.w)) return true;
    main.quaternion.copy(_q);
    main.updateMatrixWorld(true);
    return true;
  }
  // CINÉMATIQUE INVERSE DE LA JAMBE — même triangle que pour le bras (hanche, genou, cheville), le genou
  // plie du côté de `pole`. Puis le PIED : on le tourne pour que les orteils visent `orteil`, ce qui pose la
  // semelle à plat sur la pédale au lieu de laisser le pied pendre à la verticale.
  aJambe(cote) { const B = this.bones; return !!(B[cote + 'UpLeg'] && B[cote + 'Leg'] && B[cote + 'Foot'] && B[cote + 'ToeBase']); }
  ikJambe(cote, cible, orteil, pole, k = 1) {
    if (!this.aJambe(cote) || !(k > 0)) return false;
    if (!Number.isFinite(cible.x + cible.y + cible.z + pole.x + pole.y + pole.z) || (orteil && !Number.isFinite(orteil.x + orteil.y + orteil.z))) return false;
    const B = this.bones, cuisse = B[cote + 'UpLeg'], tibia = B[cote + 'Leg'], pied = B[cote + 'Foot'];
    cuisse.getWorldPosition(_S); tibia.getWorldPosition(_E); pied.getWorldPosition(_W);
    const a = _S.distanceTo(_E), b = _E.distanceTo(_W);
    _T.copy(_W).lerp(cible, k);
    _d.subVectors(_T, _S);
    const d = Math.min(a + b - 1e-3, Math.max(Math.abs(a - b) + 1e-3, _d.length()));
    _d.normalize(); _T.copy(_S).addScaledVector(_d, d);
    const cos = (a * a + d * d - b * b) / (2 * a * d), sin = Math.sqrt(Math.max(0, 1 - cos * cos));
    _p.subVectors(pole, _S); _p.addScaledVector(_d, -_p.dot(_d));
    if (_p.lengthSq() < 1e-8) _p.set(0, 0, 1); _p.normalize();
    _e2.copy(_S).addScaledVector(_d, cos * a).addScaledVector(_p, sin * a);
    this._viser(cuisse, _a.subVectors(_E, _S).normalize(), _b.subVectors(_e2, _S).normalize());
    tibia.getWorldPosition(_E); pied.getWorldPosition(_W);
    this._viser(tibia, _a.subVectors(_W, _E).normalize(), _b.subVectors(_T, _E).normalize());
    if (orteil) this.viserPoint(cote + 'Foot', cote + 'ToeBase', orteil, k);
    return true;
  }
  // Longueurs utiles au réglage de la selle et à la posture (en mètres, échelle de l'avatar comprise).
  longueurs() {
    const B = this.bones, L = (x, y) => (B[x] && B[y] ? B[x].getWorldPosition(_a).distanceTo(B[y].getWorldPosition(_b)) : 0);
    return {
      jambe: L('LeftUpLeg', 'LeftLeg') + L('LeftLeg', 'LeftFoot'),
      bras: L('LeftArm', 'LeftForeArm') + L('LeftForeArm', 'LeftHand'),
    };
  }

  // doigts repliés : c = [phalange 1, 2, 3], pour tenir un objet
  plierDoigts(cote, c, k = 1) {
    const s = cote === 'Left' ? -1 : 1;
    for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (let i = 1; i <= 3; i++) {
      const base = f === 'Index' ? 0.18 : 0.38;
      this._set(`${cote}Hand${f}${i}`, 0, s * (base + (c[i - 1] - base) * k));
    }
  }

  // seulement les bras (par-dessus un clip qui anime jambes et buste) : dribble en mouvement, tir, dunk.
  // Clavicules à la pose détendue des clips, bras contre-tournés (voir _bras) ;
  // kSpine > 0 : le buste et la tête suivent aussi la pose (dunk : dos droit, bras tendu jusqu'au cercle).
  // k : poids des bras procéduraux face au clip (0 → 1 en 0,12 s, voir Player : kBras) — un geste qui se pose
  // par-dessus la foulée y entre en fondu au lieu de claquer d'une image à l'autre.
  applyArms(c, kSpine = 0, k = 1) {
    if (kSpine === true) kSpine = 1; else if (kSpine === false) kSpine = 0;
    if (kSpine > 0) { for (const s of ['Spine', 'Spine1', 'Spine2']) this._setK(s, c.torsoX / 3, 0, (c.torsoY || 0) / 3, kSpine); this._setK('Head', c.headX, 0, 0, kSpine); }
    if (!(k > 0)) return;
    this._bras('Left', c.aL, c.aLz, c.aLy || 0, k); this._bras('Right', c.aR, c.aRz, c.aRy || 0, k);
    this._setK('LeftForeArm', c.eL, 0, c.eLy || 0, k); this._setK('RightForeArm', c.eR, 0, c.eRy || 0, k);
    this._setK('LeftHand', c.hL, 0, 0, k); this._setK('RightHand', c.hR, 0, 0, k);
    for (const f of FINGERS) { const left = f.startsWith('Left'); const amt = f.includes('Index') ? 0.18 : 0.38; this._setK(f, 0, left ? -amt : amt, 0, k); }
  }

  apply(c) {
    // les clips Mixamo déplacent les hanches : on les remet au repos en mode procédural
    const hips = this.entries.Hips;
    if (hips) hips.bone.position.copy(hips.restPos);
    // Le cou, les clavicules et la rotation du bassin n'étaient écrits par personne en pose procédurale : ils
    // gardaient ce que le dernier clip (ou le mélangeur en s'arrêtant) y avait laissé. On repart du repos (les
    // clavicules : de la pose détendue des clips, voir _bras).
    this._set('Hips', 0, 0); this._set('Neck', 0, 0);
    this._set('LeftUpLeg', c.tL, c.tLz); this._set('RightUpLeg', c.tR, -c.tRz);
    this._set('LeftLeg', c.kL, 0); this._set('RightLeg', c.kR, 0);
    this._set('LeftFoot', -c.kL * 0.5, 0); this._set('RightFoot', -c.kR * 0.5, 0); // pied qui compense le genou
    this._bras('Left', c.aL, c.aLz, c.aLy || 0, 1); this._bras('Right', c.aR, c.aRz, c.aRy || 0, 1);
    this._set('LeftForeArm', c.eL, 0, c.eLy || 0); this._set('RightForeArm', c.eR, 0, c.eRy || 0);
    this._set('LeftHand', c.hL, 0); this._set('RightHand', c.hR, 0);
    for (const s of ['Spine', 'Spine1', 'Spine2']) this._set(s, c.torsoX / 3, 0, (c.torsoY || 0) / 3);
    this._set('Head', c.headX, 0);
    // mains légèrement fermées (naturel) ; l'index reste plus droit
    for (const f of FINGERS) {
      const left = f.startsWith('Left');
      const amt = f.includes('Index') ? 0.18 : 0.38;
      this._set(f, 0, left ? -amt : amt);
    }
  }
}
