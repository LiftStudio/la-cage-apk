import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

// =====================================================================
//  Clips Mixamo (FBX "Without Skin") appliqués à un avatar au squelette
//  standard (Hips, Spine, LeftArm...). Le préfixe "mixamorig" est retiré,
//  seules les rotations sont gardées + la translation des hanches
//  (mise à l'échelle du rig source vers l'avatar, x/z annulés : c'est
//  le jeu qui déplace le joueur).
// =====================================================================

const fbxLoader = new FBXLoader();
const cache = {};

export async function loadManifest(url) {
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

async function loadFbx(url) {
  if (!cache[url]) cache[url] = fbxLoader.loadAsync(url);
  return cache[url];
}
async function loadGlb(url) {
  if (!cache[url]) cache[url] = gltfLoader.loadAsync(url).then((g) => { g.scene.animations = g.animations; return g.scene; });
  return cache[url];
}
// "mixamorig:Hips_00" (export Sketchfab) ou "mixamorigHips" -> "Hips"
const boneName = (n) => n.replace(/^mixamorig:?/, '').replace(/_\d+$/, '');

// Clip CMU (json produit par scratchpad/cmu_convert.py) : rotations MONDE de chaque os relatives à la T-pose CMU.
// Retarget : q_local = Pt⁻¹ · (Δp⁻¹ · Wp⁻¹ · Wj · Δj) · Pt · restT, avec Pt/restT = T-pose de l'avatar (AvatarRig.tpose)
// et Δ = rotation amenant la direction de repos de l'os Mixamo sur celle de l'os CMU (jambes écartées de 20° dans le rig CMU...).
const _wj = new THREE.Quaternion(), _wp = new THREE.Quaternion(), _l = new THREE.Quaternion(), _o = new THREE.Quaternion();
export async function loadCmuClip(url, name, def, rig) {
  if (!rig || !rig.tpose) return null;
  let j;
  try { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); j = await r.json(); } catch (e) { console.warn('Clip CMU absent :', url); return null; }
  // range [t0, t1] (s) : fenêtre du clip (point de boucle calculé par tools/loop_find.py)
  if (def.range) {
    const f0 = Math.max(0, Math.round(def.range[0] * j.fps)), f1 = Math.min(j.frames, Math.round(def.range[1] * j.fps));
    if (f1 - f0 > 2) {
      for (const b of j.bones) if (j.quat[b]) j.quat[b] = j.quat[b].slice(f0 * 4, f1 * 4);
      j.hips = j.hips.slice(f0 * 3, f1 * 3); j.frames = f1 - f0;
      if (j.ball) { j.ball.pos = j.ball.pos.slice(f0 * 3, f1 * 3); j.ball.hold = j.ball.hold.slice(f0, f1); }
    }
  }
  // REMONTER LE TEMPS. Une chute en arriere et un releve sont le meme geste joue dans les deux sens : on
  // n'a jamais capture quelqu'un qui tombe (la base CMU n'en contient pas de propre), mais on a un releve
  // tres net. Retourner l'ordre des images donne une chute credible — le corps part en arriere, les mains
  // cherchent le sol, le bassin finit a plat — et surtout les deux clips se raccordent PARFAITEMENT, puisque
  // la derniere image de la chute est, au pixel pres, la premiere du releve.
  if (def.reverse) {
    const n0 = j.frames;
    const retourne = (tab, pas) => {
      const r = new Array(n0 * pas);
      for (let i = 0; i < n0; i++) for (let k = 0; k < pas; k++) r[i * pas + k] = tab[(n0 - 1 - i) * pas + k];
      return r;
    };
    for (const b of j.bones) if (j.quat[b]) j.quat[b] = retourne(j.quat[b], 4);
    j.hips = retourne(j.hips, 3);
    if (j.ball && j.ball.pos) { j.ball.pos = retourne(j.ball.pos, 3); j.ball.hold = j.ball.hold.slice().reverse(); }
  }
  const T = rig.tpose, n = j.frames, fps = j.fps;
  const times = new Float32Array(n); for (let i = 0; i < n; i++) times[i] = i / fps;
  const delta = {};
  for (const b of j.bones) {
    const e = T[b]; if (!e) continue;
    const dc = new THREE.Vector3(...(j.dirs[b] || [0, 1, 0])).normalize();
    delta[b] = dc.lengthSq() > 0.5 ? new THREE.Quaternion().setFromUnitVectors(e.dir, dc) : new THREE.Quaternion();
  }
  const tracks = [];
  for (const b of j.bones) {
    const e = T[b]; if (!e) continue;
    const p = j.parents[b], q = j.quat[b], qp = p ? j.quat[p] : null, dj = delta[b], dp = p ? delta[p] : null;
    const vals = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      _wj.set(q[i * 4], q[i * 4 + 1], q[i * 4 + 2], q[i * 4 + 3]);
      _l.identity();
      if (qp) { _wp.set(qp[i * 4], qp[i * 4 + 1], qp[i * 4 + 2], qp[i * 4 + 3]); _l.copy(dp).invert().multiply(_wp.invert()); }
      _l.multiply(_wj).multiply(dj);
      _o.copy(e.Pinv).multiply(_l).multiply(e.P).multiply(e.rest);
      vals[i * 4] = _o.x; vals[i * 4 + 1] = _o.y; vals[i * 4 + 2] = _o.z; vals[i * 4 + 3] = _o.w;
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${b}.quaternion`, times, vals));
  }
  relaxClavicles(tracks);
  // hanches : hauteur CMU (m) ramenée à l'échelle de l'avatar (bassin debout = 90e percentile), x/z à zéro
  const ys = []; for (let i = 0; i < n; i++) ys.push(j.hips[i * 3 + 1]);
  const sorted = [...ys].sort((a, b) => a - b), stand = j.standHipsY || sorted[Math.floor(sorted.length * 0.9)] || 1;   // standHipsY : hauteur jambes tendues fournie par le convertisseur (clip accroupi de bout en bout)
  const k = (rig.tposeHipsY || 0.95) / stand;
  const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos[i * 3 + 1] = ys[i] * k;
  tracks.push(new THREE.VectorKeyframeTrack('Hips.position', times, pos));
  // ballon animé dans le fichier (tools/rigid_to_cmu.py) : centre par image dans le repère du joueur + main qui le tient -> Game.dribbleTrack
  if (j.ball && j.ball.pos && j.ball.pos.length === n * 3) {
    // yMin = point le plus bas du ballon dans le clip : le ballon de la source a un autre rayon et ne touchait pas
    // vraiment le sol, on s'en sert côté jeu pour recaler le rebond pile sur le bitume.
    let yMin = Infinity;
    for (let i = 1; i < j.ball.pos.length; i += 3) if (j.ball.pos[i] < yMin) yMin = j.ball.pos[i];
    def.ballTrack = { fps, pos: Float32Array.from(j.ball.pos), hold: j.ball.hold, k, yMin, radius: j.ball.radius || 0.12 };
  }
  const clip = new THREE.AnimationClip(name, n / fps, tracks);
  return finishClip(clip, def);
}

// =====================================================================
//  Retarget « monde » des clips FBX/GLB (rig source ≠ rig Avaturn) : copier les quaternions locaux ne marche que si les
//  repères locaux des os coïncident (faux pour les pieds, jambes, clavicules : jambes tordues, pieds de travers).
//  Ici : rotation monde de chaque os source par rapport à sa T-pose → appliquée à la T-pose de l'avatar (même formule
//  que la mocap CMU : q = P⁻¹ · (Δp⁻¹ · Rp⁻¹ · Rj · Δj) · P · rest), échantillonnée à 30 fps avec un AnimationMixer.
// =====================================================================
const CHILD_OF = { Hips: 'Spine', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head', LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', LeftHand: 'LeftHandMiddle1', RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand', RightHand: 'RightHandMiddle1', LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase' };
const PARENT_OF = { Spine: 'Hips', Spine1: 'Spine', Spine2: 'Spine1', Neck: 'Spine2', Head: 'Neck', LeftShoulder: 'Spine2', LeftArm: 'LeftShoulder', LeftForeArm: 'LeftArm', LeftHand: 'LeftForeArm', RightShoulder: 'Spine2', RightArm: 'RightShoulder', RightForeArm: 'RightArm', RightHand: 'RightForeArm', LeftUpLeg: 'Hips', LeftLeg: 'LeftUpLeg', LeftFoot: 'LeftLeg', LeftToeBase: 'LeftFoot', RightUpLeg: 'Hips', RightLeg: 'RightUpLeg', RightFoot: 'RightLeg', RightToeBase: 'RightFoot' };
function retargetClip(srcRoot, srcClip, rig, fps = 30) {
  const T = rig.tpose; if (!T || !T.Hips) return null;
  const srcBones = {}; srcRoot.traverse((o) => { const n = boneName(o.name); if (T[n] && !srcBones[n]) srcBones[n] = o; });
  if (!srcBones.Hips || !srcBones.LeftArm || !srcBones.LeftUpLeg) return null;
  srcRoot.updateMatrixWorld(true);
  const rootInv = new THREE.Quaternion(); srcRoot.getWorldQuaternion(rootInv).invert();
  const restW = {}, delta = {}, wp = new THREE.Vector3(), cp = new THREE.Vector3();
  for (const [n, o] of Object.entries(srcBones)) {
    restW[n] = o.getWorldQuaternion(new THREE.Quaternion()).premultiply(rootInv);
    const child = srcBones[CHILD_OF[n]]; delta[n] = new THREE.Quaternion();
    if (child) { o.getWorldPosition(wp); child.getWorldPosition(cp); const d = cp.sub(wp).applyQuaternion(rootInv).normalize(); if (d.lengthSq() > 0.5) delta[n].setFromUnitVectors(T[n].dir, d); }
  }
  // repos source = T-pose ? (bras gauche à l'horizontale vers +x comme sur l'avatar) sinon on renonce
  srcBones.LeftArm.getWorldPosition(wp); srcBones.LeftForeArm.getWorldPosition(cp); cp.sub(wp).applyQuaternion(rootInv).normalize();
  if (cp.dot(T.LeftArm.dir) < 0.6) return null;
  const mixer = new THREE.AnimationMixer(srcRoot), action = mixer.clipAction(srcClip); action.play();
  const n = Math.max(2, Math.round(srcClip.duration * fps) + 1), times = new Float32Array(n);
  const names = Object.keys(srcBones), vals = {}, R = {};
  for (const b of names) { vals[b] = new Float32Array(n * 4); R[b] = new THREE.Quaternion(); }
  const Wj = new THREE.Quaternion(), L = new THREE.Quaternion(), O = new THREE.Quaternion(), tmp = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const t = Math.min(srcClip.duration - 1e-4, i / fps); times[i] = i / fps;
    mixer.setTime(t); srcRoot.updateMatrixWorld(true);
    for (const b of names) { srcBones[b].getWorldQuaternion(Wj).premultiply(rootInv); R[b].copy(Wj).multiply(tmp.copy(restW[b]).invert()); }
    for (const b of names) {
      const e = T[b], p = PARENT_OF[b], Rp = p && R[p];
      L.identity(); if (Rp) L.copy(delta[p]).invert().multiply(tmp.copy(Rp).invert());
      L.multiply(R[b]).multiply(delta[b]);
      O.copy(e.Pinv).multiply(L).multiply(e.P).multiply(e.rest);
      O.toArray(vals[b], i * 4);
    }
  }
  mixer.stopAllAction(); mixer.uncacheRoot(srcRoot);
  const tracks = names.map((b) => new THREE.QuaternionKeyframeTrack(`${b}.quaternion`, times, vals[b]));
  relaxClavicles(tracks);
  return tracks;
}

// Clavicules « détendues » : pose moyenne des clips Mixamo (Dribble) dans le repère local du rig Avaturn. Les clips CMU
// retargetés (et DeepMotion avant traitement) laissent les clavicules ~30° trop hautes : épaules haussées et serrées.
// On impose cette pose et on contre-tourne le bras (q_arm' = q_new⁻¹ · q_old · q_arm) pour ne pas déplacer la main.
export const NATURAL_CLAV = { Left: new THREE.Quaternion(0.4502, 0.5507, -0.5306, 0.4611), Right: new THREE.Quaternion(0.4145, -0.5752, 0.5364, 0.4578) };
const _qo = new THREE.Quaternion(), _qa = new THREE.Quaternion();
function relaxClavicles(tracks) {
  for (const side of ['Left', 'Right']) {
    const sh = tracks.find((t) => t.name === side + 'Shoulder.quaternion'), arm = tracks.find((t) => t.name === side + 'Arm.quaternion');
    if (!sh || !arm || sh.times.length !== arm.times.length) continue;
    const qn = NATURAL_CLAV[side], qi = qn.clone().invert();
    for (let i = 0; i < sh.times.length; i++) {
      _qo.fromArray(sh.values, i * 4); _qa.fromArray(arm.values, i * 4);
      _qa.premultiply(_qo).premultiply(qi);
      _qa.toArray(arm.values, i * 4); qn.toArray(sh.values, i * 4);
    }
  }
}

// PHASE DE LA FOULEE. Pour melanger une marche et une course il faut que les deux clips aient le MEME pied
// devant au meme instant : sinon on additionne une jambe gauche en avant et une jambe droite en avant, et le
// joueur avance les deux pieds joints en tremblant. On repere donc, dans chaque clip, l'image ou la cuisse
// GAUCHE est la plus en avant, et on s'en sert comme origine des phases.
// La mesure : la rotation locale de LeftUpLeg appliquee a la direction de repos de l'os (vers le bas) donne
// la direction de la cuisse dans le repere du bassin ; sa composante z est le balancement vers l'avant,
// puisque l'avatar regarde +z.
const _qf = new THREE.Quaternion(), _vf = new THREE.Vector3();
function phaseFoulee(clip) {
  const t = clip.tracks.find((k) => k.name === 'LeftUpLeg.quaternion');
  if (!t || t.times.length < 3 || clip.duration <= 0) return 0;
  let best = -Infinity, bt = 0;
  for (let i = 0; i < t.times.length; i++) {
    _qf.fromArray(t.values, i * 4);
    _vf.set(0, -1, 0).applyQuaternion(_qf);
    if (_vf.z > best) { best = _vf.z; bt = t.times[i]; }
  }
  return bt / clip.duration;
}

// MIROIR GAUCHE / DROITE (`mirror: true` dans le manifeste, 06/10/2026). Le même geste de l'autre main sans
// fichier de plus : on échange les pistes Left*/Right* et on reflète chaque rotation, q -> (x, -y, -z, w), et la
// translation x -> -x. C'est exactement ce que fait tools/dm_mirror.py sur les GLB DeepMotion ; ça vaut ici pour
// tout clip déjà ramené dans les repères locaux du rig Avaturn (retarget CMU ou Mixamo), qui sont symétriques.
function miroirPistes(tracks) {
  for (const t of tracks) {
    const dot = t.name.lastIndexOf('.'), os = t.name.slice(0, dot), prop = t.name.slice(dot + 1);
    const m = os.startsWith('Left') ? 'Right' + os.slice(4) : os.startsWith('Right') ? 'Left' + os.slice(5) : os;
    t.name = m + '.' + prop;
    const v = t.values;
    if (prop === 'quaternion') for (let i = 0; i < v.length; i += 4) { v[i + 1] = -v[i + 1]; v[i + 2] = -v[i + 2]; }
    else if (prop === 'position') for (let i = 0; i < v.length; i += 3) v[i] = -v[i];
  }
}

// timings auto (accroupi / apogée) + durée, communs aux clips FBX et CMU
function finishClip(clip, def) {
  if (def.mirror) miroirPistes(clip.tracks);
  def = { ...def, duration: clip.duration };
  // Clip de locomotion : on note sa FOULEE — la distance parcourue en un cycle complet. C'est elle qui permet
  // ensuite de faire avancer l'animation au rythme du SOL plutot qu'a son rythme a elle : les pieds ne
  // patinent plus, quelle que soit la vitesse du joueur.
  if (def.loco) { def.phase0 = phaseFoulee(clip); def.foulee = Math.max(0.2, (def.speedRef || 1) * clip.duration); }
  const hipsTrack = clip.tracks.find((t) => t.name === 'Hips.position');
  if (hipsTrack && def.autoTiming !== false && (def.set === undefined || def.release === undefined)) {
    const times = hipsTrack.times, v = hipsTrack.values;
    let iMax = 0; for (let i = 1; i < times.length; i++) if (v[i * 3 + 1] > v[iMax * 3 + 1]) iMax = i;
    let iMin = 0; for (let i = 1; i < iMax; i++) if (v[i * 3 + 1] < v[iMin * 3 + 1]) iMin = i;
    if (def.set === undefined) def.set = times[iMin];
    if (def.release === undefined) def.release = Math.max(times[iMax], def.set + 0.15);
    def.apex = times[iMax];
  }
  return { clip, def };
}

// CLIPS DÉJÀ RECIBLÉS (04/10/2026). Recibler un clip sur un avatar (retargetClip, loadCmuClip) rejoue le clip image par
// image : ~130 ms de calcul bloquant par avatar sur un PC rapide, quatre à six fois plus sur un téléphone — et un 5 contre
// 5 charge dix avatars d'un coup, d'où les saccades au coup d'envoi. Or le résultat ne dépend que du clip, de sa fiche et
// de la POSE DE RÉFÉRENCE de l'avatar (rig.tpose : repos, repère et direction de chaque os, hauteur des hanches) et de sa
// longueur de jambe ; beaucoup d'avatars Avaturn ont exactement la même (Haythem, Marc Antoine, Massyl...). On garde
// donc le clip calculé sous cette signature, et l'avatar suivant en reçoit une copie (clip.clone : quelques copies de
// tableaux). Deux poses différentes, même d'un millième, ont deux signatures : jamais de clip d'un autre gabarit.
const _clipsRecibles = new Map();
function signatureRig(rig) {
  if (!rig || !rig.tpose) return '-';
  if (rig._signature) return rig._signature;
  const f = (v) => v.toFixed(4);
  rig._signature = Object.keys(rig.tpose).sort().map((n) => {
    const e = rig.tpose[n];
    return n + ':' + [...e.rest.toArray(), ...e.P.toArray(), ...e.dir.toArray()].map(f).join(',');
  }).join('|') + '|h' + f(rig.tposeHipsY || 0);
  return rig._signature;
}
// (la fiche du manifeste est partagée et loadCmuClip y pose `ballTrack` : on ne le compte pas dans la clé)
const sansBallTrack = (k, v) => (k === 'ballTrack' ? undefined : v);
// hipsY : hauteur au repos des hanches de l'avatar (m). Retourne null si le fichier manque.
// Accepte les FBX Mixamo, les GLB (Sketchfab) dont le squelette est un rig Mixamo, et les json CMU (via rig).
export function loadMixamoClip(url, name, def, hipsY, rig = null) {
  const h = typeof hipsY === 'object' && hipsY ? `${(hipsY.hipsY || 0).toFixed(4)}/${(hipsY.legLen || 0).toFixed(4)}` : String(hipsY);
  const cle = `${url}|${name}|${JSON.stringify(def, sansBallTrack)}|${h}|${signatureRig(rig)}`;
  let p = _clipsRecibles.get(cle);
  if (!p) {
    p = chargerClip(url, name, def, hipsY, rig);
    _clipsRecibles.set(cle, p);
    p.then((r) => { if (!r) _clipsRecibles.delete(cle); }, () => _clipsRecibles.delete(cle));   // un échec se retente
  }
  return p.then((r) => (r ? { clip: r.clip.clone(), def: { ...r.def } } : null));
}
async function chargerClip(url, name, def, hipsY, rig = null) {
  const path = url.split('?')[0];
  if (/\.json$/i.test(path)) return loadCmuClip(url, name, def, rig);
  let fbx;
  try { fbx = /\.glb$|\.gltf$/i.test(path) ? await loadGlb(url) : await loadFbx(url); } catch (e) { console.warn('Animation absente :', url); return null; }
  // `def.index ? ...` : ZERO est falsy, donc « index: 0 » retombait sur animations[0]. C'était le bon
  // clip, mais par hasard : dès qu'une entrée à l'index 0 porte aussi un `range` ou un `fit`, on cherche
  // longtemps. On teste donc la PRÉSENCE du champ.
  const src = fbx.animations && (def.index !== undefined ? fbx.animations[def.index] : fbx.animations[0]);
  if (!src) return null;
  // échelle des translations : longueur de jambe source -> cible (robuste aux unités et aux hiérarchies Sketchfab)
  const find = (re) => { let b = null; fbx.traverse((o) => { if (!b && re.test(o.name)) b = o; }); return b; };
  const srcHips = find(/Hips(_\d+)?$/), srcLeg = find(/LeftLeg(_\d+)?$/), srcFoot = find(/LeftFoot(_\d+)?$/);
  let scale;
  if (typeof hipsY === 'object' && hipsY.legLen && srcLeg && srcFoot) {
    const srcLegLen = srcLeg.position.length() + srcFoot.position.length();
    scale = srcLegLen > 1e-6 ? hipsY.legLen / srcLegLen : 1;
  } else {
    const target = typeof hipsY === 'object' ? hipsY.hipsY : hipsY;
    const srcHipsY = srcHips ? Math.abs(srcHips.position.y) || 100 : 100;
    scale = target / srcHipsY;
  }
  const tracks = [];
  const sameRig = def.dm || /\/dm\//.test(path);                       // clip DeepMotion généré sur l'avatar lui-même
  const rt = !sameRig && rig ? retargetClip(fbx, src, rig) : null;
  if (rt) tracks.push(...rt); else if (!sameRig && rig && rig.tpose && rig.tpose.Hips) console.warn('Retarget impossible (repos source ≠ T-pose), copie directe :', url);
  for (const t of src.tracks) {
    const dot = t.name.lastIndexOf('.');
    const node = boneName(t.name.slice(0, dot)), prop = t.name.slice(dot + 1);
    if (prop === 'quaternion') { if (!rt) { const nt = t.clone(); nt.name = `${node}.quaternion`; tracks.push(nt); } }
    else if (prop === 'position' && node === 'Hips') {
      const nt = t.clone(); nt.name = 'Hips.position';
      const v = nt.values;
      for (let i = 0; i < v.length; i += 3) { v[i] = 0; v[i + 1] *= scale; v[i + 2] = 0; }
      tracks.push(nt);
    }
  }
  let clip = new THREE.AnimationClip(name, src.duration, tracks);
  // range [t0, t1] (s) : ne garde qu'une fenêtre du clip (ex. le geste utile d'une vidéo DeepMotion)
  if (def.range) {
    const ht = tracks.find((t) => t.times.length > 1) , fps = ht ? Math.round(1 / (ht.times[1] - ht.times[0])) : 30;
    const f0 = Math.max(0, Math.round(def.range[0] * fps)), f1 = Math.min(Math.round(clip.duration * fps), Math.round(def.range[1] * fps));
    if (f1 > f0 + 2) clip = THREE.AnimationUtils.subclip(clip, name, f0, f1, fps);
  }
  // autoRange 'dip' : ne garde que le geste autour du point le plus bas des hanches (ex. « Picking Up » = 10 s dont 1 s utile)
  if (def.autoRange === 'dip') {
    const ht = tracks.find((t) => t.name === 'Hips.position');
    if (ht) {
      let iMin = 0; for (let i = 1; i < ht.times.length; i++) if (ht.values[i * 3 + 1] < ht.values[iMin * 3 + 1]) iMin = i;
      const tMin = ht.times[iMin], before = def.before ?? 0.55, after = def.after ?? 0.65;
      const f0 = Math.max(0, Math.round((tMin - before) * 30)), f1 = Math.min(Math.round(clip.duration * 30), Math.round((tMin + after) * 30));
      if (f1 > f0 + 2) clip = THREE.AnimationUtils.subclip(clip, name, f0, f1, 30);
    }
  }
  return finishClip(clip, def);
}

// OS DU HAUT DU CORPS et leur poids dans une couche « haut du corps » (voir AnimPlayer.jouerHaut). Le bas du dos
// reste en partie à la foulée : un buste entièrement repris par un geste filmé à l'arrêt se visserait sur des
// hanches qui courent.
const poidsHaut = (os) => (os === 'Spine' ? 0.35 : os === 'Spine1' ? 0.7
  : /^(Spine2|Neck|Head)/.test(os) || (/^(Left|Right)/.test(os) && !/UpLeg|Leg|Foot|Toe/.test(os)) ? 1 : 0);
const _qh = new THREE.Quaternion();
const lisseA = (k) => k * k * (3 - 2 * k);

// Lecteur : un AnimationMixer par avatar, fondus entre clips
export class AnimPlayer {
  constructor(model) {
    this.mixer = new THREE.AnimationMixer(model);
    this.racine = model;
    this.actions = {}; this.defs = {}; this.current = null; this.currentName = null;
    this.loco = [];                  // couches de locomotion en cours (noms), vide hors marche/course
    this.locoW = {};                 // le melange entre allures, somme toujours a 1
    this.locoPres = 0;               // la presence du groupe face au reste du jeu, de 0 a 1 en entrant en course
    this.jumeaux = {};               // seconde action du même clip (voir play : relancer un geste en fondu)
    this.coupe = false;              // un clip vient de partir SANS fondu (rien ne jouait) : Player en fait un fondu de pose
    this.haut = null;                // couche « haut du corps » en cours (voir jouerHaut)
    this._pistesHaut = {};           // par clip : os, interpolant, poids (créés une fois, au premier usage)
  }
  add(name, clip, def) {
    const a = this.mixer.clipAction(clip);
    this._regler(a, def);
    this.actions[name] = a; this.defs[name] = def;
  }
  _regler(a, def) {
    a.setLoop(def.loop === false ? THREE.LoopOnce : def.loop === 'pingpong' ? THREE.LoopPingPong : THREE.LoopRepeat, Infinity);   // pingpong : aller-retour (dribble sur place sans saut de boucle)
    a.clampWhenFinished = def.loop === false;
  }
  // DEUX PASSES DE SUITE. Relancer un clip qui joue encore, c'était le remettre à zéro sur place : three ne sait
  // pas fondre une action vers elle-même, et la deuxième passe (ou le deuxième crossover) partait de la première
  // image d'un coup sec. On garde donc une seconde action du même clip — un AnimationClip qui PARTAGE les pistes
  // du premier (aucune copie de tableau) — et on fond de l'une vers l'autre ; elles échangent leurs rôles.
  _jumeau(name) {
    let b = this.jumeaux[name];
    if (!b) {
      const a = this.actions[name], c = a.getClip();
      b = this.jumeaux[name] = this.mixer.clipAction(new THREE.AnimationClip(c.name + '~2', c.duration, c.tracks));
      this._regler(b, this.defs[name]);
    }
    return b;
  }
  has(name) { return !!this.actions[name]; }
  // ---------- LOCOMOTION CALEE SUR LA DISTANCE ----------
  // Les clips de marche, de course et de sprint ne sont plus « joues » : on les ECHANTILLONNE a une PHASE de
  // foulee partagee, que le jeu fait avancer proportionnellement a la distance reellement parcourue au sol
  // (action.paused = true, action.time impose). Le pied touche le sol quand il doit, a toute vitesse, et
  // changer d'allure n'est plus une transition mais un glissement de poids.
  //
  // Chaque clip garde un POIDS PERSISTANT qui glisse vers sa cible : 1 pour celui qu'on demande, 0 pour tous
  // les autres. Entrer en course, changer d'allure, en sortir — tout n'est plus qu'un changement de cible, et
  // il n'y a plus d'etat de fondu a tenir a jour.
  //
  // C'est precisement ce qui manquait a ma premiere version, et ca se voyait. Elle POSAIT les poids a leur
  // valeur finale des la premiere image. Or three normalise la somme des poids accumules, et le clip
  // precedent, lui, commencait tout juste a fondre : il valait encore 0,9. L'image affichee etait donc a 52 %
  // le nouveau clip la ou un vrai fondu en aurait montre 9. Quarante points de saut en une image, a chaque
  // depart en course. Pire : si une deuxieme allure arrivait avant la fin du fondu — ce qui est le cas a
  // CHAQUE demarrage, les deux seuils etant franchis a 0,13 s d'intervalle pour un fondu de 0,16 — l'etat de
  // fondu repartait de l'ancienne source et redonnait 90 % du poids a un clip qui n'etait plus qu'a 17 % a
  // l'ecran. Avec des poids persistants, ces deux cas n'existent plus : rien ne repart jamais de zero.
  //
  // Le glissement est LINEAIRE, comme les fondus de three : quand la couche monte pendant que le clip
  // precedent descend, les deux droites se croisent et leur somme reste voisine de 1. Une montee
  // exponentielle contre une descente lineaire creuserait un trou au milieu du fondu.
  FONDU_LOCO = 0.16;

  // Fait glisser les poids d'une image, et rend la foulee du melange obtenu — c'est elle qui donne la
  // cadence, donc il faut la connaitre AVANT d'avancer la phase.
  // DEUX CHOSES SEPAREES, et c'est la clef :
  //   - la PRESENCE du groupe (`locoPres`), qui monte de 0 a 1 en entrant en course pendant que le clip
  //     precedent s'efface : c'est le fondu enchaine avec le reste du jeu ;
  //   - le MELANGE INTERNE (`locoW`), qui somme TOUJOURS a 1 : ce qu'une allure perd, la suivante le prend.
  // Les avoir confondus creusait un trou. Au demarrage, la montee du groupe etait interrompue par le premier
  // changement d'allure — marche vers trot a 0,10 s, trot vers course a 0,23 s, alors que la montee dure
  // 0,16 — et le total restait bloque a 0,62 pendant que le clip d'avant, lui, finissait de s'effacer.
  // Or quand la somme des poids passe sous 1, three comble le manque avec la pose de repos du squelette :
  // le joueur partait en course en se degonflant d'un tiers. Mesure au banc : somme 0,625 de 0,16 s a 0,42 s.
  majPoidsLoco(nom, dt) {
    const W = this.locoW, pas = (dt || 0) / this.FONDU_LOCO;
    this.locoPres = Math.min(1, this.locoPres + pas);
    if (W[nom] === undefined) W[nom] = 0;
    let somme = 0;
    for (const n of Object.keys(W)) {
      W[n] += Math.max(-pas, Math.min(pas, (n === nom ? 1 : 0) - W[n]));
      if (W[n] <= 0.004 && n !== nom) { delete W[n]; continue; }
      somme += W[n];
    }
    // JAMAIS PLUS DE DEUX DEMARCHES A LA FOIS. Filet de sécurité : si une troisième traîne encore — un
    // changement de famille au milieu d'un fondu — on la fait disparaître trois fois plus vite au lieu de
    // la laisser polluer la moyenne. Trois démarches superposées, ce n'est plus un fondu, c'est une bouillie.
    const noms = Object.keys(W);
    if (noms.length > 2) {
      noms.sort((a, b) => W[b] - W[a]);
      for (const n of noms) {
        if (n === nom || n === noms[0] || (noms[0] === nom && n === noms[1])) continue;
        W[n] -= pas * 2; somme -= pas * 2;
        if (W[n] <= 0.004) { somme -= W[n]; delete W[n]; }
      }
      somme = Object.keys(W).reduce((t, n) => t + W[n], 0);
    }
    if (somme < 1e-4) { W[nom] = 1; somme = 1; }
    let foulee = 0, vRef = 0;
    for (const n of Object.keys(W)) {
      W[n] /= somme;
      const d = this.defs[n] || {};
      foulee += (d.foulee || 1) * W[n]; vRef += (d.speedRef || 1) * W[n];
    }
    return { foulee: Math.max(0.3, foulee), vRef };
  }

  // Pose les couches a la phase demandee. `phase0` est le decalage propre a chaque clip, mesure a la lecture
  // du fichier : la phase 0 signifie « cuisse gauche en avant » dans TOUS les clips.
  appliquerLoco(phase, dt) {
    const W = this.locoW, vivantes = [];
    for (const n of Object.keys(W)) {
      const a = this.actions[n];
      if (!a) { delete W[n]; continue; }
      const d = this.defs[n] || {}, dur = a.getClip().duration || 1;
      a.enabled = true;
      // On ne (re)demarre l'action QUE si elle n'etait pas deja une couche a l'image d'avant. Le test
      // naturel — isRunning() — est un piege ici : il repond faux pour toute action en pause, et les notres
      // le sont TOUTES par construction. On appelait donc reset() a chaque image, ce qui efface au passage
      // les interpolants de poids et le compteur de boucles.
      if (!this.loco.includes(n)) { a.reset(); a.play(); a.timeScale = 1; }
      a.paused = true; a.setEffectiveWeight(W[n] * this.locoPres);
      a.time = ((((phase + (d.phase0 || 0)) % 1) + 1) % 1) * dur;
      vivantes.push(n);
    }
    if (!vivantes.length) return false;
    for (const n of this.loco) if (!vivantes.includes(n)) { const a = this.actions[n]; if (a) { a.setEffectiveWeight(0); a.paused = false; a.stop(); } }
    // Le clip simple d'avant s'efface pendant que les couches montent : les deux courbes se croisent, leur
    // somme reste voisine de 1, et la normalisation de three en fait un vrai fondu enchaine.
    if (this.current && !vivantes.includes(this.currentName)) { this.current.fadeOut(this.FONDU_LOCO); this.current = null; this.currentName = null; }
    this.loco = vivantes;
    this.mixer.update(dt);
    return true;
  }

  // On quitte la locomotion pour un clip unique. AUCUNE couche n'est coupee : on les fait toutes FONDRE,
  // et c'est la seule facon correcte de s'y prendre.
  //
  // La raison est dans three, et elle est contre-intuitive : un fondu y est MULTIPLICATIF. `fadeOut` ne fait
  // pas descendre le poids de 1 a 0, il multiplie le poids COURANT par une rampe de 1 a 0 — une couche a 0,5
  // descend donc de 0,5 a 0. Et quand la somme des poids accumules tombe SOUS 1, PropertyMixer.apply comble
  // le manque avec la pose d'origine sauvegardee, c'est-a-dire la pose de repos du squelette.
  //
  // Ma premiere version coupait la couche secondaire au couteau et cedait la dominante avec son poids
  // partiel. Mesure image par image sur le three du projet : a l'image suivante la somme valait 0,556 — 44 %
  // de pose de repos melangee de force — et le membre repartait vingt degres EN ARRIERE avant de rattraper
  // en neuf images. A l'ecran : le personnage se degonfle un dixieme de seconde chaque fois qu'un geste part
  // dans les 0,16 s qui suivent un changement d'allure. Un tir apres un sprint, une passe en relachant le
  // sprint, une sortie de crossover : ca arrive plusieurs fois par possession.
  //
  // Comme les poids des couches somment exactement a 1, un fondu commun laisse la somme rigoureusement egale
  // a 1 a chaque image : (w1 + w2)(1 - u) + u = 1. Ni pose de repos, ni saut.
  _quitterLoco(vers, fondu = 0.15) {
    let dom = null, nomDom = null, pMax = -1;
    for (const n of this.loco) {
      const a = this.actions[n]; if (!a) continue;
      const w = this.locoW[n] || 0;
      if (w > pMax) { pMax = w; dom = a; nomDom = n; }
    }
    for (const n of this.loco) {
      const a = this.actions[n]; if (!a) continue;
      a.paused = false; a.timeScale = 1;          // elles reprennent leur cours pendant qu'elles s'effacent
      if (a !== dom) a.fadeOut(fondu);
    }
    this.loco = []; this.locoW = {}; this.locoPres = 0;
    if (!dom) { this.current = null; this.currentName = null; return; }
    // Il RESTE le clip courant, meme si c'est celui qu'on s'apprete a jouer. Le mettre a null dans ce cas
    // faisait tomber play() dans la branche « nouveau clip » : reset() effacait le temps cale sur la phase
    // partagee, et il n'y avait aucun fondu. Coupe franche a chaque fois qu'on repassait de la course a la
    // course. Et s'il s'agit bien du meme clip, on lui rend son poids plein tout de suite : play() va sortir
    // par son raccourci sans programmer de fondu, et sans ca la somme baisserait pendant que l'autre couche
    // s'efface.
    if (dom === vers) dom.setEffectiveWeight(1);
    this.current = dom; this.currentName = nomDom;
  }

  // joue un clip (restart = true pour relancer un clip "once" déjà en cours)
  play(name, { fade = 0.15, speed = 1, restart = false } = {}) {
    let a = this.actions[name];
    if (!a) return false;
    if (this.loco.length) this._quitterLoco(a, fade);
    if (this.current === a && !restart) { a.timeScale = speed; return true; }
    // relance d'un clip encore visible (en cours, ou en train de s'effacer) : on passe sur son jumeau
    if (fade > 0 && (this.current === a || (a.isRunning() && a.getEffectiveWeight() > 0.01))) {
      const b = this._jumeau(name);
      this.actions[name] = b; this.jumeaux[name] = a;
      a = b;
    }
    // Rien ne jouait (pose procédurale, ou couches de locomotion coupées net) : le clip part à plein poids sur
    // une pose qui n'a rien à voir. On le signale ; le joueur fond la pose de l'image d'avant vers celle-ci.
    if (!this.current && !this.loco.length) this.coupe = true;
    a.reset(); a.enabled = true; a.timeScale = speed; a.setEffectiveWeight(1);
    if (this.current && this.current !== a) this.current.crossFadeTo(a, fade, false);
    a.play();
    this.current = a; this.currentName = name;
    return true;
  }
  stop(fade = 0.15) {
    if (this.loco.length) this._quitterLoco(null, fade);
    if (this.current) { this.current.fadeOut(fade); this.current = null; this.currentName = null; }
  }
  // Passage à la pose procédurale (banc, vélo, emote maison, réception de rebond au sol) : on arrête tout. Le
  // raccord VISUEL n'est pas fait ici mais par le joueur (Player : fondu de pose depuis la dernière image), qui
  // seul sait ce qui va s'afficher ensuite.
  couper() {
    this.mixer.stopAllAction(); this.current = null; this.currentName = null;
    this.loco = []; this.locoW = {}; this.locoPres = 0;
  }
  // Tout couper (changement d'etat brutal : on se fait bousculer au milieu d'une foulee).
  couperLoco() { if (this.loco.length) { for (const n of this.loco) { const a = this.actions[n]; if (a) { a.setEffectiveWeight(0); a.paused = false; a.stop(); } } this.loco = []; } this.locoW = {}; this.locoPres = 0; }
  setSpeed(s) { if (this.current) this.current.timeScale = s; }
  get time() { return this.current ? this.current.time : 0; }
  get finished() { return !!this.current && !this.current.isRunning(); }
  update(dt) { this.mixer.update(dt); }

  // ---------- COUCHE « HAUT DU CORPS » ----------
  // Une passe, une réception, un chambrage EN COURANT. Le clip entier figeait les jambes au milieu de la foulée
  // pendant que le joueur continuait d'avancer : il glissait sur le bitume, immobile. Ici les jambes et le
  // bassin restent à la locomotion, et seuls le buste, la tête et les bras suivent le geste.
  // Le mélangeur de three ne sait pas pondérer une action os par os : on échantillonne donc nous-mêmes les
  // pistes du haut du corps (un interpolant par piste, créé une fois) et on pose le résultat PAR-DESSUS la pose
  // que le mélangeur vient d'écrire, avec une enveloppe (0,08 s d'entrée, 0,12 s de sortie).
  // `cle` identifie le geste : la même clé continue, une autre relance.
  jouerHaut(name, cle, vit = 1, t0 = 0) {
    const a = this.actions[name]; if (!a) return false;
    const H = this.haut;
    if (H && H.cle === cle && !H.stop) { H.vit = vit; return true; }
    this.haut = { name, cle, vit, t: t0, k: H && !H.stop ? Math.min(H.k, 0.5) : 0, stop: false, dur: a.getClip().duration, pistes: this._pistesDe(name) };
    return true;
  }
  stopHaut() { if (this.haut) this.haut.stop = true; }
  _pistesDe(name) {
    let P = this._pistesHaut[name];
    if (P) return P;
    P = this._pistesHaut[name] = [];
    const clip = this.actions[name].getClip();
    for (const t of clip.tracks) {
      const dot = t.name.lastIndexOf('.'), os = t.name.slice(0, dot);
      if (t.name.slice(dot + 1) !== 'quaternion') continue;
      const w = poidsHaut(os), o = w > 0 ? this.racine.getObjectByName(os) : null;
      if (o) P.push({ o, w, it: t.createInterpolant(new Float32Array(4)) });
    }
    return P;
  }
  // Après le mélangeur. Rend le poids appliqué (0 = plus de couche).
  appliquerHaut(dt) {
    const H = this.haut; if (!H) return 0;
    H.t += dt * H.vit;
    H.k = H.stop ? H.k - dt / 0.12 : Math.min(1, H.k + dt / 0.08);
    const fin = Math.max(0, (H.dur - H.t) / Math.max(1e-3, 0.12 * H.vit));
    const k = lisseA(Math.max(0, Math.min(H.k, fin, 1)));
    if (H.k <= 0 || H.t >= H.dur) { this.haut = null; return 0; }
    const t = Math.min(H.t, H.dur - 1e-4);
    for (const e of H.pistes) {
      _qh.fromArray(e.it.evaluate(t));
      e.o.quaternion.slerp(_qh, k * e.w);
    }
    return k;
  }
}
