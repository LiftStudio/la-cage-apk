// =====================================================================
//  LES VRAIS PLATANES DES TERRAINS (lot L12, 01/10/2026)
//
//  Les arbres du décor sont des clones de tree2.glb (js/court.js loadTreeModel) : un arbre « low poly » dont la
//  charpente est faite de BANDES plates à peu de côtés. Au loin, on ne le voit pas ; de près, si : à Jemmapes, les
//  deux platanes poussent DANS l'enceinte, et en caméra de diffusion deux « rubans » beiges traversent tout le haut
//  de l'image ; à La Cage, les deux platanes de l'enceinte sont au bord du terrain (audit des autres terrains, défaut
//  A1 : « un platane parisien a des branches rondes »). Ces quatre arbres-là, et eux seuls, sont refaits ici :
//    - une CHARPENTE EN TUBES : le fût, évasé au pied et un peu galbé, fourche vers 30 % de la hauteur (les platanes
//      d'alignement sont élagués haut) en trois à cinq charpentières qui montent à 20-45° de la verticale ; chacune se
//      divise en branches puis en rameaux, de moins en moins épais (la somme des sections se conserve à chaque
//      fourche, comme dans un vrai arbre), sinueuses, qui se redressent vers la lumière ; le gros arbre de La Cage a son
//      tronc DOUBLE (deux fûts soudés qui s'écartent en montant, photos du 17/09) ;
//    - l'ÉCORCE est celle des autres platanes (plaques crème, olive et gris-vert dessinées, grain et relief de la photo :
//      js/court.js plataneBark et ecorcePhotoPlatane), à sa taille réelle — une tuile de 1,4 m —, dans un matériau à
//      elle (une copie) qui reçoit la photo en même temps que les autres ;
//    - les FEUILLES sont les cartes du rameau de platane photographié (le matériau des couronnes de tree2, déjà venté,
//      translucide, désaturé : mêmes réglages, même ombre découpée), accrochées par la tige au bout des rameaux et
//      pendantes, tournées vers l'extérieur de la couronne ;
//    - tout est FUSIONNÉ : un appel de dessin pour le bois et un pour les feuilles, pour les deux arbres d'un terrain
//      (plus leurs ombres) ;
//    - la forme est tirée d'un hasard LIÉ À LA PLACE de l'arbre : le même arbre à chaque partie.
//  tree2 reste pour tous les autres arbres (au loin). VERSION TÉLÉPHONE : un niveau de rameaux de moins, des tubes à
//  moins de côtés, moins de cartes mais plus grandes (environ 3 000 triangles par arbre au lieu de 11 000 sur PC).
//  Option « Décor détaillé » décochée (js/options_rendu.js) : les clones de tree2 reviennent à leur place, sans
//  recharger.
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OPTIONS_RENDU, surOptions } from './options_rendu.js';
import { TELEPHONE } from './appareil.js';

const LEGER = TELEPHONE;   // js/appareil.js : la même détection pour tout le jeu (et `?tel=1`)

const UP = new THREE.Vector3(0, 1, 0), BAS = new THREE.Vector3(0, -1, 0);
// une tuile d'écorce couvre 2,2 m de tour et autant de haut : des plaques de 9 à 12 cm, qui se groupent en pans de
// 20 à 40 cm (à 1,4 m, le fût se lisait comme une peau de léopard : des pastilles sombres serrées sur fond crème)
const TUILE = 2.2;
// Le détail par niveau : côtés des tubes et nombre de tronçons (le fût, les charpentières, les branches, les rameaux)
const COTES = LEGER ? [10, 7, 5, 4] : [16, 11, 7, 5];
const TRONCONS = LEGER ? [9, 5, 4, 3] : [12, 7, 5, 4];
const NIVEAU_MAX = LEGER ? 2 : 3;        // le dernier niveau porte les feuilles

// un hasard reproductible (mulberry32), tiré de la place de l'arbre : R() dans [0, 1[, R(a, b) dans [a, b[
// (hasard, carte et devier servent aussi au grand platane de la haie de La Cage, js/platane_haie.js)
export function hasard(x, z) {
  let a = (Math.floor(x * 7919 + z * 104729) ^ 0x5bd1e995) >>> 0;
  return (lo = 0, hi = 1) => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return lo + (hi - lo) * (((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}

// UN TUBE le long d'un chemin (points et rayons), repère transporté parallèlement d'un anneau à l'autre (il ne
// vrille pas dans les coudes). UV en mètres ramenés à la tuile d'écorce : le tour du tube en un nombre ENTIER de
// tuiles (pas de couture), la longueur cumulée le long du chemin. `rep` : la répétition propre à la texture (les UV
// de three sont multipliés par elle). Faces vers l'extérieur.
const _q = new THREE.Quaternion(), _T = new THREE.Vector3(), _T2 = new THREE.Vector3(), _N = new THREE.Vector3(), _B = new THREE.Vector3(), _d = new THREE.Vector3();
function tube(chemin, rayons, cotes, rep) {
  const n = chemin.length, pos = new Float32Array(n * (cotes + 1) * 3), nor = new Float32Array(pos.length), uv = new Float32Array(n * (cotes + 1) * 2);
  _T.subVectors(chemin[1], chemin[0]).normalize();
  _N.crossVectors(_T, Math.abs(_T.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0)).normalize();
  _B.crossVectors(_T, _N);
  const nu = Math.max(1, Math.round(2 * Math.PI * rayons[0] / TUILE));
  let L = 0, k = 0, ku = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      L += chemin[i].distanceTo(chemin[i - 1]);
      _T2.subVectors(chemin[Math.min(n - 1, i + 1)], chemin[i - 1]).normalize();
      _q.setFromUnitVectors(_T, _T2); _N.applyQuaternion(_q); _B.applyQuaternion(_q); _T.copy(_T2);
    }
    const r = rayons[i], p = chemin[i];
    for (let j = 0; j <= cotes; j++) {
      const a = j / cotes * Math.PI * 2;
      _d.copy(_N).multiplyScalar(Math.cos(a)).addScaledVector(_B, Math.sin(a));
      pos[k] = p.x + _d.x * r; pos[k + 1] = p.y + _d.y * r; pos[k + 2] = p.z + _d.z * r;
      nor[k] = _d.x; nor[k + 1] = _d.y; nor[k + 2] = _d.z; k += 3;
      uv[ku++] = j / cotes * nu / rep.x; uv[ku++] = L / TUILE / rep.y;
    }
  }
  const idx = [];
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < cotes; j++) {
    const a = i * (cotes + 1) + j, b = a + 1, c = a + cotes + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// UNE CARTE DE FEUILLES : le rameau photographié (tige en haut au milieu de l'image, deux rameaux qui pendent ; UV de
// glTF, v = 0 en haut), accroché par sa tige au point `p`, pendant selon `g`, tourné vers `dehors`.
export function carte(cartes, p, g, dehors, taille, R) {
  const s = _d.crossVectors(g, dehors);
  if (s.lengthSq() < 1e-4) s.set(1, 0, 0);
  s.normalize().applyAxisAngle(g, R(-0.5, 0.5));            // un peu de roulis : les cartes ne sont pas toutes alignées
  const hx = s.x * taille / 2, hy = s.y * taille / 2, hz = s.z * taille / 2;
  const bx = g.x * taille, by = g.y * taille, bz = g.z * taille;
  // la tige 6 % sous le bord haut de l'image : on recule le haut de la carte d'autant au-dessus du point d'attache
  const ox = p.x - bx * 0.06, oy = p.y - by * 0.06, oz = p.z - bz * 0.06;
  cartes.pos.push(ox - hx, oy - hy, oz - hz, ox + hx, oy + hy, oz + hz, ox - hx + bx, oy - hy + by, oz - hz + bz, ox + hx + bx, oy + hy + by, oz + hz + bz);
  const nx = g.y * s.z - g.z * s.y, ny = g.z * s.x - g.x * s.z, nz = g.x * s.y - g.y * s.x;   // normale de la carte
  // (normales penchées vers le haut et vers l'extérieur, comme une couronne : le dessus d'un arbre est plus clair)
  const lx = nx * 0.4 + dehors.x * 0.5, ly = ny * 0.4 + 0.6, lz = nz * 0.4 + dehors.z * 0.5, ln = Math.hypot(lx, ly, lz) || 1;
  for (let i = 0; i < 4; i++) cartes.nor.push(lx / ln, ly / ln, lz / ln);
  cartes.uv.push(0, 0, 1, 0, 0, 1, 1, 1);
  const b = cartes.n * 4;
  cartes.idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
  cartes.n++;
}

// UN ARBRE : la charpente (géométries de tubes poussées dans `bois`) et ses cartes de feuilles (dans `cartes`).
// `t` : l'emplacement de js/court.js (x, z, h, spread = demi-envergure, fat, tilt, tiltDir, double, rot).
function unPlatane(t, bois, cartes, rep) {
  const R = hasard(t.x, t.z);
  const h = t.h, fat = Math.min(1.35, Math.max(0.8, t.fat || 1));
  const env = (t.spread || h * 0.45) * Math.min(1.15, Math.max(0.9, fat));   // demi-envergure de la couronne
  const rb = 0.021 * h * fat;                     // rayon du fût à hauteur d'homme
  const hf = h * R(0.27, 0.31);                   // la fourche : fût nu sur le premier tiers (élagage des rues)
  const base = new THREE.Vector3(t.x, 0, t.z);
  const penche = new THREE.Vector3(Math.sin(t.tiltDir || 0) * (t.tilt || 0), 1, Math.cos(t.tiltDir || 0) * (t.tilt || 0)).normalize();
  const yFeuilles = Math.max(4.6, hf - 0.4);      // pas une feuille sous la fourche
  const yHaut = h;

  // une branche : un chemin sinueux qui se redresse, puis ses enfants. `niv` : 0 charpentière ... NIVEAU_MAX rameau.
  const branche = (p0, d0, L, r0, niv) => {
    const n = TRONCONS[Math.min(niv + 1, 3)], chemin = [p0.clone()], rayons = [r0];
    const d = d0.clone(), p = p0.clone();
    const rFin = r0 * (niv >= NIVEAU_MAX ? 0.35 : 0.62);
    const redresse = niv === 0 ? 0.03 : 0.09;     // gravitropisme : le bout des branches remonte vers la lumière
    for (let i = 1; i <= n; i++) {
      d.x += R(-0.22, 0.22); d.z += R(-0.22, 0.22); d.y += R(-0.12, 0.12) + redresse;
      // la couronne reste dans son enveloppe : au-delà de la demi-envergure, la branche est ramenée vers le haut
      const hx = p.x - t.x, hz = p.z - t.z, dh = Math.hypot(hx, hz);
      if (dh > env * 0.85) { d.x -= hx / dh * 0.25; d.z -= hz / dh * 0.25; d.y += 0.15; }
      if (p.y > yHaut - 1.2) d.y -= 0.3;          // et sous la hauteur voulue
      d.normalize();
      p.addScaledVector(d, L / n);
      chemin.push(p.clone()); rayons.push(r0 + (rFin - r0) * (i / n));
    }
    bois.push(tube(chemin, rayons, COTES[Math.min(niv + 1, 3)], rep));
    const bout = chemin[n], dirBout = d.clone();
    if (niv >= NIVEAU_MAX) { feuilles(chemin, dirBout); return; }
    // les enfants : une fourche au bout (deux, parfois trois), et une ou deux branches latérales en chemin. La somme
    // des sections est conservée à chaque fourche (r² parent = somme des r² enfants, un peu plus : les rameaux sont
    // proportionnellement plus épais).
    const fourche = R() < 0.25 ? 3 : 2, lat = niv === 0 ? 2 : 1, nb = fourche + lat;
    const rEnf = rFin * Math.sqrt(1.25 / nb) * 1.25;
    const az0 = R(0, Math.PI * 2);
    for (let k = 0; k < fourche; k++) {
      const dd = devier(dirBout, R(0.32, 0.6), az0 + k * Math.PI * 2 / fourche + R(-0.4, 0.4));
      branche(bout, dd, L * R(0.62, 0.78), rEnf, niv + 1);
    }
    // (un peu de feuillage sur les branches elles-mêmes : le cœur de la couronne n'est pas vide)
    if (niv >= 1 && R() < 0.6) feuilles(chemin, dirBout);
    for (let k = 0; k < lat; k++) {
      const i = Math.max(1, Math.min(n - 1, Math.round(n * R(0.35, 0.75))));
      const dd = devier(chemin[i + 1].clone().sub(chemin[i]).normalize(), R(0.6, 1.0), R(0, Math.PI * 2));
      branche(chemin[i], dd, L * R(0.45, 0.65), Math.min(rayons[i] * 0.7, rEnf), niv + 1);
    }
  };
  // les cartes d'un rameau : le long de sa seconde moitié et autour de son bout
  const feuilles = (chemin, dBout) => {
    const n = chemin.length - 1, nc = LEGER ? 5 : 7;
    for (let c = 0; c < nc; c++) {
      const f = c < 2 ? 1 : R(0.35, 1), i = Math.min(n - 1, Math.floor(f * n)), a = f * n - i;
      const p = chemin[i].clone().lerp(chemin[i + 1], Math.min(1, a));
      p.x += R(-0.35, 0.35); p.y += R(-0.25, 0.35); p.z += R(-0.35, 0.35);
      if (p.y < yFeuilles) continue;
      const dehors = new THREE.Vector3(p.x - t.x, 0, p.z - t.z);
      if (dehors.lengthSq() < 0.01) dehors.set(R(-1, 1), 0, R(-1, 1));
      dehors.normalize();
      // pendante, mais en BIAIS : vers le bas, dans le sens du rameau et vers l'extérieur — à peu près à 45°. Toutes
      // verticales, les cartes se voyaient PAR LA TRANCHE depuis le terrain (on regarde la couronne d'en dessous) : des
      // traînées vertes étirées au lieu de feuilles
      const g = BAS.clone().multiplyScalar(0.5).addScaledVector(dBout, 0.35).addScaledVector(dehors, 0.55);
      g.x += R(-0.3, 0.3); g.y += R(-0.2, 0.15); g.z += R(-0.3, 0.3); g.normalize();
      carte(cartes, p, g, dehors, (LEGER ? 2.4 : 1.8) * R(0.85, 1.15) * Math.min(1.15, h / 15), R);
    }
  };

  // LE FÛT (ou les deux fûts soudés), évasé au pied, un peu galbé, penché selon l'emplacement
  const futs = t.double ? [[-1, 0.74], [1, 0.74]] : [[0, 1]];
  const azF = R(0, Math.PI * 2);
  for (const [cote, kr] of futs) {
    const ecart = new THREE.Vector3(Math.cos(azF), 0, Math.sin(azF)).multiplyScalar(cote);
    const n = TRONCONS[0], chemin = [], rayons = [];
    const galbe = new THREE.Vector3(R(-1, 1), 0, R(-1, 1)).normalize().multiplyScalar(R(0.05, 0.12) * h / 15);
    const yF = hf * (t.double ? R(0.95, 1.08) : 1);
    for (let i = 0; i <= n; i++) {
      const f = i / n, y = -0.25 + (yF + 0.25) * f;
      const p = base.clone().addScaledVector(penche, y);
      p.addScaledVector(galbe, Math.sin(Math.PI * f));
      // deux fûts soudés au pied qui s'écartent en montant (10° environ chacun)
      if (cote) p.addScaledVector(ecart, rb * 0.35 + Math.max(0, y - 0.6) * 0.17);
      chemin.push(p);
      const evase = 1 + 0.5 * Math.exp(-Math.max(0, y) / 0.45);         // contreforts au ras du sol
      rayons.push(rb * kr * evase * (1 - 0.18 * f));
    }
    bois.push(tube(chemin, rayons, COTES[0], rep));
    // LES CHARPENTIÈRES, de la tête du fût : trois à cinq (deux ou trois par fût quand il est double), réparties
    // autour, à 20-45° de la verticale ; une presque droite prolonge le fût (la flèche)
    const tete = chemin[n], rTete = rayons[n];
    const nb = t.double ? (R() < 0.5 ? 2 : 3) : (R() < 0.4 ? 3 : R() < 0.75 ? 4 : 5);
    const az0 = R(0, Math.PI * 2);
    for (let k = 0; k < nb; k++) {
      const fleche = k === 0;
      const az = fleche ? R(0, Math.PI * 2) : az0 + k * Math.PI * 2 / nb + R(-0.35, 0.35) + (cote ? Math.atan2(ecart.z, ecart.x) * 0.5 : 0);
      // (les charpentières s'ouvrent franchement, 33 à 57° : la couronne d'un platane d'alignement est un large dôme,
      // et c'est le dessous de ces gros bras qu'on voit depuis le terrain ; plus droites, l'arbre faisait une colonne)
      const incl = fleche ? R(0.1, 0.25) : R(0.58, 1.0);
      const dir = new THREE.Vector3(Math.sin(incl) * Math.cos(az), Math.cos(incl), Math.sin(incl) * Math.sin(az));
      if (cote) dir.addScaledVector(ecart, 0.25).normalize();
      const L = (h - yF) * (fleche ? R(0.5, 0.6) : R(0.5, 0.64));
      const r0 = rTete * Math.sqrt(1.2 / nb) * (fleche ? 1.05 : 0.95);
      branche(tete.clone().addScaledVector(dir, -rTete * 0.5), dir, L, r0, 0);
    }
  }
}

// une direction écartée de `d` d'un angle `ang`, dans le plan d'azimut `az` autour de d
export function devier(d, ang, az) {
  const a = Math.abs(d.y) < 0.95 ? UP : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(d, a).normalize(), v = new THREE.Vector3().crossVectors(d, u);
  const o = u.multiplyScalar(Math.cos(az)).addScaledVector(v, Math.sin(az));
  return d.clone().multiplyScalar(Math.cos(ang)).addScaledVector(o, Math.sin(ang)).normalize();
}

// LES PLATANES D'UN TERRAIN. `spots` : les emplacements marqués `detaille` (js/court.js modelTree), `m` : les
// matériaux des arbres de tree2 déjà préparés par loadTreeModel ({ ecorce, feuilles, ombreFeuilles }). Rend le
// matériau d'écorce de ces arbres (une copie de celui de tree2, à ajouter à la liste qui reçoit la photo) et le
// groupe. Les clones de tree2 de ces emplacements (spot.arbre, posés après) sont cachés tant que l'option est cochée.
export function platanesDetailles(scene, spots, m) {
  if (!spots.length || !m.ecorce || !m.feuilles) return null;
  const t0 = performance.now();
  const ecorce = m.ecorce.clone();
  ecorce.name = 'ecorce platane detaille';
  ecorce.normalMap = null;           // (celle du modèle suit SES UV ; le relief de la photo arrive avec elle)
  const rep = (ecorce.map && ecorce.map.repeat) ? ecorce.map.repeat.clone() : new THREE.Vector2(1, 1);
  const bois = [], cartes = { pos: [], nor: [], uv: [], idx: [], n: 0 };
  for (const t of spots) unPlatane(t, bois, cartes, rep);
  const groupe = new THREE.Group();
  groupe.name = 'platanes detailles'; groupe.userData.nofuse = true; groupe.userData.spots = spots;
  const charpente = new THREE.Mesh(mergeGeometries(bois, false), ecorce);
  for (const g of bois) g.dispose();
  charpente.castShadow = true; charpente.receiveShadow = true;
  groupe.add(charpente);
  const gf = new THREE.BufferGeometry();
  gf.setAttribute('position', new THREE.Float32BufferAttribute(cartes.pos, 3));
  gf.setAttribute('normal', new THREE.Float32BufferAttribute(cartes.nor, 3));
  gf.setAttribute('uv', new THREE.Float32BufferAttribute(cartes.uv, 2));
  gf.setIndex(cartes.idx); gf.computeBoundingSphere();
  const couronnes = new THREE.Mesh(gf, m.feuilles);
  couronnes.castShadow = true; couronnes.receiveShadow = true; couronnes.userData.feuillage = true;
  if (m.ombreFeuilles) couronnes.customDepthMaterial = m.ombreFeuilles;
  groupe.add(couronnes);
  scene.add(groupe);
  const appliquer = (o) => {
    groupe.visible = o.decor;
    for (const t of spots) if (t.arbre) t.arbre.visible = !o.decor;
  };
  surOptions(appliquer);
  groupe.userData.appliquer = () => appliquer(OPTIONS_RENDU);
  const tri = (charpente.geometry.index.count + gf.index.count) / 3;
  console.info('[décor] platanes détaillés :', spots.length, 'arbres,', Math.round(charpente.geometry.index.count / 3), 'triangles de bois,',
    cartes.n, 'cartes de feuilles (', Math.round(tri), 'triangles en tout ),', Math.round(performance.now() - t0), 'ms', LEGER ? '· téléphone' : '');
  return { ecorce, groupe };
}
