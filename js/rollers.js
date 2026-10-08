// =====================================================================
//  LES ROLLERS (lot C4, « Et autre ») — pas une monture : des roues sous les pieds
// =====================================================================
// Achetés chez le marchand (js/shop.js), chaussés EN BALADE SEULEMENT — jamais en match : le jeu de basket reste
// celui des baskets. Ils changent trois choses au joueur (js/player.js, Player.move) :
//  - LA VITESSE : × 1,3 en courant et × 1,1 au sprint sur un sol dur (enrobé, asphalte, béton, dalles), × 0,75 sur un
//    sol meuble (gravier, herbe, terre : on y marche en canard) ;
//  - L'INERTIE : on prend son élan en 0,78 s au lieu de 0,13 (constante de temps × ROLLERS.elan), et l'on GLISSE en
//    s'arrêtant (1 s au lieu de 0,085, × ROLLERS.glisse : 6 à 7 m de glisse lancé) ; en changeant de direction, l'élan
//    d'avant se tourne peu à peu — c'est la sensation du roller ;
//    (relecture C4 : ces chiffres sont ceux des constantes ci-dessous ; l'en-tête annonçait encore × 1,45, 0,55 s et 0,7 s)
//  - LA POSE : en patinant sans ballon, une foulée de patineur procédurale (poseRollers) — buste penché, genoux
//    fléchis, une jambe qui pousse en dehors et en arrière pendant que l'autre glisse, les bras qui balancent ; avec
//    le ballon, les clips habituels (dribble, tir) gardent la main, on roule simplement plus vite.
// LE MODÈLE (chausser) : sous chaque chaussure, une platine d'aluminium et quatre roues en ligne de 60 mm (frein sous
// le talon droit). La platine est rangée DANS l'os du pied, à la place exacte de la semelle dans la pose de liaison du
// maillage (les sommets de la chaussure, lus dans l'espace de liaison) : elle suit le pied comme la chaussure, sans
// rien recalculer par image. Le joueur est soulevé de la hauteur des roues (Player.hRol).
// Pas de fichier, pas de texture : quelques primitives par pied.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SURFACE } from './monde.js';

export const ROLLERS = {
  // la vitesse de course × 1,3 (6,2 à 7 m/s), le sprint × 1,1 seulement (7,8 m/s au plus : 28 km/h, déjà vif) ; sur un
  // sol meuble, × 0,75
  vitesse: 1.3, vitesseSprint: 1.1, vitesseMeuble: 0.75,
  // multiplicateurs des constantes de temps de Player.move : lancer sa course (0,78 s), s'arrêter (1 s de glisse)
  elan: 6, glisse: 12,
  // roues de 60 mm ; leurs axes à 5 cm sous la semelle : 8 cm de roues sous les chaussures
  roueR: 0.030, platine: 0.050,
};
// Les sols durs où l'on roule (les autres : on marche dessus en canard)
const DURS = new Set([SURFACE.ENROBE, SURFACE.ASPHALTE_ROUGE, SURFACE.BETON_CLAIR, SURFACE.DALLES, SURFACE.CHAUSSEE, SURFACE.TROTTOIR]);
export const solRoulant = (s) => DURS.has(s);

// ---------------------------------------------------------------- le modèle
let MAT = null;
function materiaux() {
  if (!MAT) MAT = {
    platine: new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.3, metalness: 0.85 }),
    roue: new THREE.MeshStandardMaterial({ color: 0xe9e4d6, roughness: 0.45, metalness: 0 }),
  };
  return MAT;
}
const _m = new THREE.Matrix4(), _v = new THREE.Vector3();

// Les sommets de chaque chaussure dans l'ESPACE DE LIAISON du maillage (bindMatrix · v) : ceux que pilotent surtout
// l'os du pied ou celui des orteils. Rend { Left: { min, max }, Right: ... } (boîtes englobantes) et, par côté, le
// maillage et l'indice de l'os du pied dans son squelette.
function semelles(A, modele) {
  const out = {};
  for (const cote of ['Left', 'Right']) out[cote] = { min: new THREE.Vector3(Infinity, Infinity, Infinity), max: new THREE.Vector3(-Infinity, -Infinity, -Infinity), n: 0, mesh: null, os: -1 };
  modele.traverse((o) => {
    if (!o.isSkinnedMesh || !o.skeleton) return;
    const B = o.skeleton.bones, pos = o.geometry.attributes.position, si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight;
    if (!pos || !si || !sw) return;
    const cible = new Map();
    for (const cote of ['Left', 'Right']) {
      const pied = A.bone(cote + 'Foot'), orteils = A.bone(cote + 'ToeBase');
      B.forEach((b, i) => { if (b === pied || b === orteils) cible.set(i, cote); });
      const ip = B.indexOf(pied);
      if (ip >= 0 && !out[cote].mesh) { out[cote].mesh = o; out[cote].os = ip; }
    }
    if (!cible.size) return;
    for (let i = 0; i < pos.count; i++) {
      let best = -1, w = 0.5;
      for (let k = 0; k < 4; k++) { const wk = sw.getComponent(i, k); if (wk > w) { w = wk; best = si.getComponent(i, k); } }
      const cote = cible.get(best);
      if (!cote) continue;
      _v.fromBufferAttribute(pos, i).applyMatrix4(o.bindMatrix);
      out[cote].min.min(_v); out[cote].max.max(_v); out[cote].n++;
    }
  });
  return out;
}

// La platine et ses roues d'un pied, dans l'espace de liaison : sous la semelle (y = min), de son talon à ses orteils
// (le personnage regarde vers +z dans sa pose de liaison). `u` : mètres -> unités du modèle.
function platine(S, u, couleur, frein) {
  const M = materiaux(), y0 = S.min.y, cx = (S.min.x + S.max.x) / 2;
  // la platine dépasse un peu la chaussure aux deux bouts : quatre roues de 60 mm y tiennent sans se toucher
  const z0 = S.min.z - 0.008 * u, z1 = S.max.z + 0.004 * u, L = z1 - z0, r = ROLLERS.roueR * u, ep = 0.005 * u;
  const yA = y0 - ROLLERS.platine * u;                      // les axes des roues
  const geoP = [], geoR = [], geoC = [];
  // la semelle de coque, colorée, sous la chaussure (bords arrondis), et ses deux blocs de fixation, talon et pointe
  const coque = new THREE.BoxGeometry(0.074 * u, 0.016 * u, L, 1, 1, 1); coque.translate(cx, y0 - 0.008 * u, (z0 + z1) / 2); geoC.push(coque);
  for (const zb of [z0 + 0.04 * u, z1 - 0.05 * u]) {
    const haut = y0 - 0.016 * u, bas = yA + 0.006 * u;            // de la coque jusque dans les rails
    const b = new THREE.BoxGeometry(0.03 * u, haut - bas, 0.04 * u); b.translate(cx, (haut + bas) / 2, zb); geoC.push(b);
  }
  // les deux rails d'aluminium, à hauteur des axes : la roue dépasse dessus et dessous
  for (const s of [-1, 1]) {
    const f = new THREE.BoxGeometry(ep, 0.022 * u, L - 0.01 * u); f.translate(cx + s * 0.0145 * u, yA + 0.003 * u, (z0 + z1) / 2); geoP.push(f);
  }
  // quatre roues en ligne (polyuréthane clair, moyeu sombre) et leurs axes
  for (let i = 0; i < 4; i++) {
    const z = z0 + r * 1.05 + (L - 2.1 * r) * (i / 3);
    const w = new THREE.CylinderGeometry(r, r, 0.02 * u, 20); w.rotateZ(Math.PI / 2); w.translate(cx, yA, z); geoR.push(w);
    const h = new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.022 * u, 10); h.rotateZ(Math.PI / 2); h.translate(cx, yA, z); geoP.push(h);
    const a = new THREE.CylinderGeometry(0.005 * u, 0.005 * u, 0.036 * u, 8); a.rotateZ(Math.PI / 2); a.translate(cx, yA, z); geoP.push(a);
  }
  // le frein sous le talon droit
  if (frein) { const fr = new THREE.BoxGeometry(0.028 * u, 0.034 * u, 0.04 * u); fr.translate(cx, yA - 0.004 * u, z0 - 0.016 * u); geoC.push(fr); }
  const g = new THREE.Group();
  const poser = (geos, mat) => { const m = new THREE.Mesh(mergeGeometries(geos.map((x) => x.toNonIndexed()), false), mat); m.castShadow = true; m.receiveShadow = true; g.add(m); };
  poser(geoP, M.platine); poser(geoR, M.roue);
  poser(geoC, new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.4, metalness: 0.15 }));
  return g;
}

// CHAUSSER les rollers de couleur `couleur` au joueur J (avatar chargé). Rend la hauteur dont il faut le soulever
// (mètres), ou 0 si l'avatar n'a pas de pieds lisibles.
export function chausser(J, couleur) {
  oter(J);
  const A = J.avatar, modele = J.avatarModel;
  if (!A || !modele || !A.aJambe('Left') || !A.aJambe('Right')) return 0;
  const S = semelles(A, modele);
  if (S.Left.n < 20 || S.Right.n < 20 || S.Left.os < 0 || S.Right.os < 0) return 0;
  // l'échelle de l'espace de liaison au monde (taille de l'avatar comprise) : un mètre = u unités de liaison
  const pied = A.bone('LeftFoot');
  pied.updateWorldMatrix(true, false);
  const k = _m.multiplyMatrices(pied.matrixWorld, S.Left.mesh.skeleton.boneInverses[S.Left.os]).getMaxScaleOnAxis();
  const u = k > 1e-6 ? 1 / k : 1;
  const parts = [];
  for (const cote of ['Left', 'Right']) {
    const s = S[cote], g = platine(s, u, couleur, cote === 'Right');
    // de l'espace de liaison au repère de l'os du pied : l'inverse de liaison de cet os
    g.applyMatrix4(s.mesh.skeleton.boneInverses[s.os]);
    g.name = 'rollers ' + cote;
    A.bone(cote + 'Foot').add(g);
    parts.push(g);
  }
  J._rollersMesh = parts;
  // la hauteur des roues sous la semelle, en mètres du monde
  return ROLLERS.platine + ROLLERS.roueR;
}
export function oter(J) {
  // (la coque est à la couleur de CES rollers, sa matière part avec eux ; la platine et les roues sont communes)
  const M = materiaux();
  if (J._rollersMesh) for (const g of J._rollersMesh) {
    g.removeFromParent();
    g.traverse((o) => { if (!o.isMesh) return; o.geometry.dispose(); if (o.material !== M.platine && o.material !== M.roue) o.material.dispose(); });
  }
  J._rollersMesh = null;
}

// ---------------------------------------------------------------- la foulée du patineur
// Pose procédurale (Player._pose) : `ph` la phase de la foulée (un cycle = une poussée de chaque jambe), `pousse` vrai
// quand on accélère (sinon on glisse, jambes parallèles), `k` le mélange depuis la pose de repos.
export function poseRollers(P, REST, ph, pousse, vit) {
  const s = Math.sin(ph * Math.PI * 2), c = Math.cos(ph * Math.PI * 2);
  const a = pousse ? Math.min(1, 0.45 + vit / 6) : 0.15;
  const pG = Math.max(0, s) * a, pD = Math.max(0, -s) * a;
  P.torsoX = 0.42 + 0.08 * a; P.headX = -0.36; P.torsoY = 0.12 * s * a;
  // la jambe qui pousse part en dehors et en arrière en se tendant ; l'autre, fléchie, porte le corps
  P.tL = -0.38 + 0.42 * pG; P.tLz = 0.06 + 0.42 * pG; P.kL = 0.78 - 0.62 * pG;
  P.tR = -0.38 + 0.42 * pD; P.tRz = 0.06 + 0.42 * pD; P.kR = 0.78 - 0.62 * pD;
  // les bras balancent en travers, à l'opposé de la jambe qui pousse
  P.aL = REST.aL - 0.55 * c * a; P.aR = REST.aR + 0.55 * c * a;
  P.aLz = 0.22 + 0.25 * pD; P.aRz = -0.22 - 0.25 * pG;
  P.eL = -0.55; P.eR = -0.55;
  // (le corps descend de ce que les genoux fléchis remontent les pieds : mesuré sur l'avatar, la semelle de la jambe
  // d'appui reste au sol — 4 cm de moins, et les roues s'enfonçaient dans l'enrobé)
  P.bob = -0.05 - 0.012 * Math.abs(s) * a;
  return P;
}
