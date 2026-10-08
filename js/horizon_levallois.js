// =====================================================================
//  L'HORIZON DE LEVALLOIS (lot L12, 01/10/2026)
//
//  Au playground Rudy Gobert, le monde s'arrêtait : vers le panier du côté +Z, une pelouse unie filait jusqu'au ciel ;
//  au-dessus du gradin (−X, le fond de la caméra de match), des arbres du parc puis le ciel, sans une façade (audit des
//  autres terrains, défaut 11 : « Levallois, le monde s'arrête »). Or le terrain est un bout de parc entre la Seine et
//  la ville : derrière le parc, la rue du quai et ses platanes d'alignement, puis les immeubles de logements de
//  Levallois — des barres et des plots modernes de sept à neuf niveaux, enduits clairs, beige, blanc cassé, gris
//  pâle, toits plats. On ferme donc l'horizon de ces deux côtés :
//    - un FRONT BÂTI de chaque côté (la « fabrique de bâtiments » commune, js/court.js building : la même façade
//      calculée que la berge d'en face, style moderne, mitoyens aveugles, toits avec leur acrotère et leurs édicules),
//      à 70 m derrière le gradin et 85 m au-delà du panier +Z, hauteurs et largeurs tirées d'un hasard fixe ;
//    - devant lui, la RUE (une bande d'enrobé) et un RIDEAU D'ARBRES d'alignement, plus quelques bouquets dans le parc,
//      en cartes croisées d'un houppier dessiné (au-delà de 45 m, un arbre n'est plus qu'une silhouette bosselée ;
//      les clones de tree2 coûteraient deux appels de dessin par arbre) ;
//    - tout est FUSIONNÉ par matériau, dans un groupe à lui que l'optimisation du décor ne touche pas : une dizaine
//      d'appels de dessin pour l'ensemble, aucun ne porte d'ombre (à 60 m et plus, hors de la carte d'ombre) ;
//    - TÉLÉPHONE : un arbre sur deux (couronnes plus larges), une seule teinte de façade et pas de rue : 6 appels de
//      dessin au lieu de 9 (sur PC, 9 appels et 4 300 triangles, mesurés le 01/10).
//  Option « Décor détaillé » (js/options_rendu.js) : l'horizon est construit à la demande, la première fois que
//  l'option est cochée, puis simplement montré ou caché.
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OPTIONS_RENDU, surOptions } from './options_rendu.js';
import { TELEPHONE } from './appareil.js';

const LEGER = TELEPHONE;   // js/appareil.js : la même détection pour tout le jeu (et `?tel=1`)

// les deux fronts : `axe` le long duquel ils courent, la ligne de façade, l'étendue, et le côté qui regarde le terrain
// (les deux fronts se rejoignent à l'angle (−70 ; 85) sans se chevaucher : le premier s'arrête avant la rue du second)
const FRONTS = [
  { nom: 'gradin', axe: 'z', facade: -70, de: -125, a: 80, face: 1 },    // derrière le gradin (−X) : façades vers +x
  { nom: 'aval', axe: 'x', facade: 85, de: -66, a: 12, face: -1 },       // au-delà du panier +Z : façades vers −z (le quai s'arrête à x ≈ 17)
];

// un hasard fixe (mulberry32) : le même horizon à chaque partie
function hasard(graine) {
  let a = graine >>> 0;
  return (lo = 0, hi = 1) => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return lo + (hi - lo) * (((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}

// LE HOUPPIER DESSINÉ : une silhouette bosselée (des lobes qui se chevauchent), remplie de petites feuilles, plus
// sombre en bas et au cœur (l'ombre propre de la couronne), un peu plus claire en haut. Couverture pleine au cœur,
// déchiquetée au bord : vue à 50-120 m, c'est ce qu'on lit d'un platane ou d'un tilleul de rue.
function texHouppier(canvasTex) {
  const R = hasard(4242);
  return canvasTex(256, 256, (g, w, h) => {
    const lobes = [];
    for (let i = 0; i < 9; i++) {
      const a = R(0, Math.PI * 2), d = R(0, 0.22) * w;
      lobes.push([w / 2 + Math.cos(a) * d, h * 0.47 + Math.sin(a) * d * 0.8, R(0.17, 0.27) * w]);
    }
    const dedans = (x, y) => lobes.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) < r);
    // (le vert des platanes de tree2 du parc, vus à la même distance : un vert-jaune clair et sourd — plus sombre, le
    // rideau faisait des sucettes vert bouteille devant les façades)
    // (relecture L12 : un rien moins saturé — à 80 m, l'air grise déjà les verts : 0,38 de saturation mesurée contre
    // 0,28 sur les platanes de tree2 du parc, plus proches)
    const PAL = [[86, 106, 66], [96, 118, 72], [105, 125, 77], [78, 96, 61], [117, 135, 85], [72, 87, 57]];
    for (let i = 0; i < 2600; i++) {
      const x = R(0, w), y = R(0, h);
      if (!dedans(x, y)) continue;
      const c = PAL[Math.floor(R(0, PAL.length))];
      const k = 0.62 + 0.55 * (1 - y / h) + R(-0.08, 0.08);            // plus clair en haut
      g.fillStyle = `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
      g.save(); g.translate(x, y); g.rotate(R(0, 6.28));
      g.beginPath(); g.ellipse(0, 0, R(3, 6), R(2, 4), 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }, null, true);
}
// la rue : un enrobé gris, grenu, tuile de 6 m
function texRue(canvasTex) {
  const R = hasard(777);
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#5d5e60'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = Math.round(R(70, 120)); g.fillStyle = `rgba(${v},${v},${v + 3},0.5)`; g.fillRect(R(0, w), R(0, h), 1.5, 1.5); }
  });
}

// une couronne : trois cartes verticales croisées (0, 60 et 120°) et deux plus petites, décalées, pour les bosses.
// (Relecture L12 : chaque carte avait la normale de son plan, et le matériau était double face. Le soleil éclairait donc
// une moitié de chaque carte et laissait l'autre dans le noir : des « sucettes » coupées en deux, claires d'un côté,
// sombres de l'autre, et à 60 de luminance pour 96 à 136 sur les platanes de tree2 du parc, plus proches. Les normales
// sont maintenant celles d'un DÔME — celle d'une boule autour du centre de la couronne, penchée vers le haut —, la
// même des deux côtés de la carte : chaque carte est doublée, envers retourné, et le matériau est simple face. La
// couronne s'éclaire comme un volume : plus claire en haut et du côté du soleil, sans coupure.)
const _n = new THREE.Vector3();
function couronne(geos, x, y, z, larg, haut, R) {
  const a0 = R(0, Math.PI);
  for (let k = 0; k < 5; k++) {
    const p = new THREE.PlaneGeometry(1, 1);
    const petit = k >= 3, s = petit ? R(0.55, 0.7) : 1;
    p.scale(larg * s, haut * s, 1);
    p.rotateY(a0 + (petit ? R(0, Math.PI) : k * Math.PI / 3));
    p.translate(x + (petit ? R(-0.25, 0.25) * larg : 0), y + (petit ? R(0, 0.25) * haut : 0), z + (petit ? R(-0.25, 0.25) * larg : 0));
    const pos = p.attributes.position, nor = p.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      _n.set((pos.getX(i) - x) / larg, (pos.getY(i) - y) / haut + 0.45, (pos.getZ(i) - z) / larg).normalize();
      nor.setXYZ(i, _n.x, _n.y, _n.z);
    }
    const envers = p.clone(), ix = envers.index;            // l'envers : mêmes sommets, triangles retournés
    for (let i = 0; i < ix.count; i += 3) { const b = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, b); }
    geos.push(p, envers);
  }
}

// Les morceaux du groupe fondus par matériau (mêmes attributs) : un maillage par matériau.
function fondre(groupe) {
  groupe.updateMatrixWorld(true);
  const familles = new Map();
  groupe.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || !o.geometry.attributes.position) return;
    const g = o.geometry;
    const cle = o.material.uuid + '#' + Object.keys(g.attributes).sort().join(',') + '#' + !!g.index;
    if (!familles.has(cle)) familles.set(cle, []);
    familles.get(cle).push(o);
  });
  const blocs = [];
  for (const [, lot] of familles) {
    const geos = lot.map((o) => o.geometry.clone().applyMatrix4(o.matrixWorld));
    let g = null;
    try { g = geos.length > 1 ? mergeGeometries(geos, false) : geos[0]; } catch (e) { g = null; }
    if (geos.length > 1) for (const x of geos) x.dispose();
    if (!g) continue;
    const m = new THREE.Mesh(g, lot[0].material);
    m.castShadow = false; m.receiveShadow = true; m.renderOrder = lot[0].renderOrder; m.matrixAutoUpdate = false;
    // (hors de la passe de normales de l'occlusion, js/fx.js _decoupes : à 60 m et plus, une occlusion de 60 cm de
    // rayon n'a rien à y faire, et chaque bloc y coûtait un appel de dessin de plus)
    m.userData.sansNormales = true;
    blocs.push(m);
    for (const o of lot) { if (o.parent) o.parent.remove(o); o.geometry.dispose(); }
  }
  // (ce qui n'était pas un maillage simple — groupes vides — est retiré)
  for (const c of [...groupe.children]) groupe.remove(c);
  for (const b of blocs) groupe.add(b);
  return blocs.length;
}

function construire(scene, K) {
  const t0 = performance.now();
  const groupe = new THREE.Group();
  groupe.name = 'horizon levallois'; groupe.userData.nofuse = true;
  const R = hasard(1789);
  // les façades : enduits clairs des logements de Levallois (vitrages froids : style « moderne »), deux avec balcons
  // (un ton plus bas que le blanc pur : en plein soleil, les façades blanc cassé sortaient plus claires que le ciel)
  // (au téléphone, UNE seule façade : chaque teinte d'enduit a son bandeau de toit, donc son appel de dessin)
  const facades = [
    K.windowsTexture(10, 8, '#d9d2c4', '#3b4a5c', true),
    K.windowsTexture(8, 7, '#cbc6bb', '#34424f', false),
    K.windowsTexture(12, 9, '#e0dbd1', '#465569', true),
    K.windowsTexture(9, 8, '#c4bcad', '#2f3c4a', false),
  ].slice(0, LEGER ? 1 : 4);
  // (simple face : chaque carte a son envers, voir couronne)
  const feuilles = new THREE.MeshStandardMaterial({ map: texHouppier(K.canvasTex), alphaTest: 0.5, side: THREE.FrontSide, roughness: 0.9 });
  const tronc = new THREE.MeshStandardMaterial({ color: 0x6f6a60, roughness: 0.95 });
  const tRue = texRue(K.canvasTex); tRue.wrapS = tRue.wrapT = THREE.RepeatWrapping;
  const rue = new THREE.MeshStandardMaterial({ map: tRue, roughness: 0.95 });
  const geosF = [], geosT = [], geosR = [];
  let nImm = 0, nArb = 0;
  for (const F of FRONTS) {
    const surZ = F.axe === 'z';
    // LA RUE, devant le front bâti : 12 m de chaussée et de trottoirs, à 6 m des façades
    const lRue = F.a - F.de, pRue = 12, cRue = F.facade + F.face * 9;
    const pr = new THREE.PlaneGeometry(surZ ? pRue : lRue, surZ ? lRue : pRue);
    pr.rotateX(-Math.PI / 2);
    const uv = pr.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (surZ ? pRue : lRue) / 6, uv.getY(i) * (surZ ? lRue : pRue) / 6);
    pr.translate(surZ ? cRue : (F.de + F.a) / 2, 0.02, surZ ? (F.de + F.a) / 2 : cRue);
    if (!LEGER) geosR.push(pr);                          // (pas de rue au téléphone : la pelouse va jusqu'aux façades)
    // LES IMMEUBLES, côte à côte avec des passages de 2 à 9 m (tous, au téléphone aussi : fondus, ils ne coûtent pas un
    // appel de dessin de plus, et en portrait un front troué laissait revoir le vide derrière le panier)
    let s = F.de, k = 0;
    while (s < F.a - 10) {
      const larg = R(18, 38), haut = R(19, 30), prof = R(12, 17), ecart = R(2, 9);
      const f = facades[Math.floor(R(0, facades.length))];
      const c = s + larg / 2, d = F.facade - F.face * prof / 2;
      if (surZ) K.building(groupe, d, c, prof, haut, larg, f, { roof: true });
      else K.building(groupe, c, d, larg, haut, prof, f, { roof: true });
      nImm++;
      s += larg + ecart; k++;
    }
    // LE RIDEAU D'ARBRES de la rue (tous les 8 m environ, un sur deux au téléphone), et des bouquets du parc plus près
    k = 0;
    // (couronnes de 10 à 14 m pour un pas de 8 m : elles se touchent et font un rideau continu, comme les platanes
    // d'alignement d'un quai ; plus étroites, on voyait une rangée de sucettes)
    for (let s2 = F.de + R(0, 4); s2 < F.a; s2 += R(7, 9.5), k++) {
      if (LEGER && k % 2) continue;
      const ha = R(12, 16), la = R(10, 14) * (LEGER ? 1.2 : 1), recul = F.facade + F.face * R(15.5, 17.5);
      const [x, z] = surZ ? [recul, s2] : [s2, recul];
      couronne(geosF, x, ha * 0.62, z, la, ha * 0.78, R);
      const ft = new THREE.CylinderGeometry(0.16, 0.24, ha * 0.4, 6); ft.translate(x, ha * 0.2, z); geosT.push(ft);
      nArb++;
    }
    for (let i = 0; i < (LEGER ? 4 : 8); i++) {
      const s3 = F.de + 30 + R(0, F.a - F.de - 60), recul = F.facade + F.face * R(26, 40), ha = R(9, 14);
      const [x, z] = surZ ? [recul, s3] : [s3, recul];
      couronne(geosF, x, ha * 0.6, z, R(6, 9), ha * 0.8, R);
      const ft = new THREE.CylinderGeometry(0.14, 0.2, ha * 0.35, 6); ft.translate(x, ha * 0.18, z); geosT.push(ft);
      nArb++;
    }
  }
  for (const [geos, mat] of [[geosF, feuilles], [geosT, tronc], [geosR, rue]]) {
    if (!geos.length) continue;
    const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
    for (const g of geos) g.dispose();
    groupe.add(m);
  }
  const appels = fondre(groupe);
  scene.add(groupe);
  let tri = 0;
  groupe.traverse((o) => { if (o.isMesh) tri += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  console.info('[décor] horizon de Levallois :', nImm, 'immeubles,', nArb, 'arbres,', appels, 'appels de dessin,', Math.round(tri), 'triangles,',
    Math.round(performance.now() - t0), 'ms', LEGER ? '· téléphone' : '');
  return groupe;
}

// Pose l'horizon (à la demande : seulement quand l'option « Décor détaillé » est cochée) et le suit dans les Options.
export function horizonLevallois(scene, K) {
  let groupe = null;
  const appliquer = (o) => {
    if (o.decor && !groupe) groupe = construire(scene, K);
    if (groupe) groupe.visible = o.decor;
  };
  appliquer(OPTIONS_RENDU);
  surOptions(appliquer);
}
