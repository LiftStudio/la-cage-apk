// =====================================================================
//  ZONE Z18 : LA BORDURE DU BOULEVARD SAINT-DENIS (lot B6 du parc entier)
// =====================================================================
// Conception, § 1.3 (Z18) et lot B6 ; références : tools/parc/references_gmaps/SYNTHESE.md (fiche Z18, qui prime sur la
// conception) et R2.md (onze panoramas Street View le long du boulevard, 2021 à 2025). La limite ouest du parc haut,
// de la venelle du cinéma (z ≈ -114) à l'entrée sud-ouest E2 (z ≈ 151), et ce qu'on en voit du dehors.
//
// LA COUPE TYPE (Z18-11, Z18-16), du parc vers le boulevard (x-) :
//   - dans le parc, la LISIÈRE de persistants sombres (lauriers, aucubas) qu'on voit à travers la grille ;
//   - le MURET de calcaire beige gris (#c9c0a8, 0,5 m, blocs d'un mètre, chaperon clair) et la GRILLE NOIRE de 1,65 m
//     au-dessus (2,15 m en tout) : barreaux tous les 11,5 cm à fers de lance, FRISE D'ANNEAUX sous la lisse haute,
//     poteaux tous les 2,5 m. Sa ligne est celle des données (monde.json > clôtures > grille_boulevard) : c'est elle
//     que le joueur et la balle ne franchissent pas ;
//   - le TROTTOIR asphalté (#8e8d89) de 4,7 m, les TILLEULS dans leurs fosses d'un mètre, près de la bordure ;
//   - la BORDURE de granit, puis les PLACES EN BATAILLE (2,4 x 5 m, lignes blanches) ; au-delà, la chaussée, qui est
//     au pourtour (zone Z20).
// LE RIDEAU DE TILLEULS (tree_row OSM 1222927777, un pied tous les 7 m) est sur le trottoir, pas dans le parc : des
// tilleuls conduits en rideau, fût de 2,2 à 2,5 m, charpentières recoupées en « têtes de chat », couronne TAILLÉE EN
// BOÎTE aux faces verticales, de 3 à 7,6 m, jointive d'un arbre à l'autre (Z18-16, Z18-22). Comme les rideaux du quai
// (zone Z03), ce sont des arbres taillés : gabarits.json les retire de arbres.bin (arbres.exclure) et cette zone les
// dessine, fûts et feuillage, avec les feuilles et l'écorce du rideau du plateau (js/court_parc.js,
// rideauQuaiPourZones), et déclare leurs fûts. Le rideau s'interrompt devant la moitié gauche de la grille du 156
// (Z13-15 : un seul tilleul sur le parvis, à droite de l'axe).
//
// CE QUI CHANGE LE LONG DU BOULEVARD (SYNTHESE, écarts à la conception) :
//   - au COIN NORD-EST, pas de grille : des PANNEAUX RIGIDES de treillis soudé vert sombre (#2e4a3a, 2 m), le long du
//     boulevard jusqu'à l'entrée E3 et le long de la venelle jusqu'à x = -128 (au-delà : zone Z14), terminés par un
//     poteau de maçonnerie gris (Z18-01, Z18-02) ;
//   - devant la PMI (z -86 à -57), pas de grille non plus : les bâtiments (pourtour, zone Z20) sont derrière une
//     bordure de béton et un massif d'euphorbes et d'arbustes panachés (Z18-05, Z18-09) ;
//   - devant l'ENTRÉE E3 (z ≈ -100), une allée pavée de granit traverse le trottoir entre deux petits massifs de boules
//     de buis, à la place de deux places ; la colonne Morris bleu nuit est à côté (Z18-03) ; les portails E3 et E2
//     eux-mêmes sont ceux des zones Z14 et Z16 (conception, § 1.3) ;
//   - devant le 156 et l'arrêt de bus (z 17 à 50), pas de stationnement : le parvis asphalté va jusqu'à la bordure,
//     longée d'une bande de pavés et de potelets ; son mobilier est celui de la zone Z13 ;
//   - devant l'entrée E2 (z 146 à 155), le parvis de pavés de granit (Z18-24).
//
// RÈGLES DE ZONE : aucun Math.random (kit.alea ; les arbustes libres de js/parc/zones/coteau.js tirent le leur sous
// une graine fixée par leur position) ; toute hauteur par le sol du monde ; les matériaux du kit, plus les feuilles et
// l'écorce du rideau du plateau (partagées avec les zones Z03 et Z19) et le feuillage des massifs du coteau (zones Z10
// et Z11) ; aucun arbre de arbres.bin planté ; rien n'est écrit hors du groupe du morceau.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Monde } from '../../monde.js';
import { outilsB2 } from './z04_butte_pin.js';
import { decouper, materiauxRideau, feuillesRideau, Cartes, carte } from './z03_promenade.js';
import { ENTREE_156, GRILLE_BD_SUD, GRILLE_BD_NORD, xSurLigne } from './z13_perspective.js';
import { Touffes, arbuste, maillageFeuillage } from './coteau.js';

// ============================================================================================ les données
// (repère du terrain 1 ; monde.json > clôtures > grille_boulevard, et l'orthophoto)
// LA LIGNE DE LA RUE : la grille sans le renfoncement du 156 (le trottoir et la bordure la suivent)
const RUE = [[-142.3, -131.0], [-142.05, -113.55], [-141.3, -101.2], [-141.12, -98.2], [-133.6, 26.36], [-132.33, 45.62], [-126.07, 150.0], [-125.76, 154.92], [-125.6, 157.5]];
// LA GRILLE NOIRE SUR SON MURET : les morceaux de la grille des données, moins l'ensemble du 156 (zone Z13), moins la
// façade de la PMI (pas de grille : z -86,2 à -56,8) ; le petit bout au sud de l'entrée E2
const PMI = { z0: -86.2, z1: -56.8 };
const GRILLES = [
  ...decouper(GRILLE_BD_SUD, -98.2, PMI.z0), ...decouper(GRILLE_BD_SUD, PMI.z1, ENTREE_156.z0),
  ...decouper(GRILLE_BD_NORD, ENTREE_156.z1, 150.0),
  [[-125.88, 153.0], [-125.76, 154.92]],
];
// LES PANNEAUX RIGIDES VERTS du coin nord-est : le long de la venelle (jusqu'à x = -128), puis du boulevard jusqu'à E3
const PANNEAUX_VERTS = [[-128.0, -114.36], [-142.05, -113.55], [-141.3, -101.2]];
// les poteaux de maçonnerie grise : au bout des panneaux verts, et aux deux bouts de la façade de la PMI
const PILASTRES = [[-141.3, -101.2], [xSurLigne(GRILLE_BD_SUD, PMI.z0), PMI.z0], [xSurLigne(GRILLE_BD_SUD, PMI.z1), PMI.z1]];
// LE RIDEAU : les pieds de la rangée OSM (ceux qu'y plantait arbres.bin, tous les 7 m ; sans celui qui tombait au milieu
// de l'allée pavée de E3, ni celui devant la moitié gauche de la grille du 156), en deux boîtes
const PIEDS = [[-146.93, -127.27], [-146.51, -120.28], [-146.09, -113.29], [-145.67, -106.31], [-144.84, -92.33],
  [-144.42, -85.34], [-144.0, -78.36], [-143.58, -71.37], [-143.16, -64.38], [-142.74, -57.39], [-142.33, -50.41], [-141.91, -43.42],
  [-141.49, -36.43], [-141.07, -29.44], [-140.65, -22.46], [-140.24, -15.47], [-139.82, -8.48], [-139.4, -1.49], [-138.98, 5.49],
  [-138.56, 12.48], [-138.14, 19.47], [-137.73, 26.46], [-136.89, 40.43], [-136.47, 47.42], [-136.05, 54.41], [-135.63, 61.39],
  [-135.22, 68.38], [-134.8, 75.37], [-134.38, 82.36], [-133.96, 89.34], [-133.54, 96.33], [-133.13, 103.32], [-132.71, 110.31],
  [-132.29, 117.29], [-131.87, 124.28], [-131.45, 131.27], [-131.03, 138.26], [-130.62, 145.24]];
const xRideau = (z) => -146.93 + 0.0598 * (z + 127.27);
const RIDEAUX = [{ z0: -130.8, z1: 29.9 }, { z0: 37.0, z1: 148.7 }];
const RIDEAU = { larg: 4.4, bas: 3.0, haut: 7.6 };
// LES BANDES DU TROTTOIR, en décalage depuis la ligne de la rue (vers la chaussée, x-) : trottoir de 0,2 (le pied du
// muret) à 4,9 m, places de 4,9 à 9,9 m ; les tronçons sans places (parvis, entrées) vont jusqu'à 9,9 m.
const B_MUR = 0.2, B_TROT = 4.9, B_RUE = 9.9;
const SECTIONS = [
  { z0: -131.0, z1: -104.5, places: true },
  { z0: -104.5, z1: -95.0, places: false, e3: true },
  { z0: -95.0, z1: 17.0, places: true },
  { z0: 17.0, z1: 50.0, places: false, parvis: true },
  { z0: 50.0, z1: 146.0, places: true },
  { z0: 146.0, z1: 157.5, places: false, e2: true },
];
const E3 = { z0: -101.45, z1: -97.95 };                 // l'allée pavée devant le portail E3 (3,5 m)
const PMR = { z0: 70.2, z1: 73.5 };                     // la place bleue (Z13-26, Z18-20)
const MORRIS = { d: 4.2, z: -93.6 };                    // la colonne Morris, sur le trottoir près de E3
const PANNEAUX_P = [-80.0, -31.0, 4.0, 62.0, 101.0, 131.0];   // panneaux de stationnement (z), sur mât fin
// Les morceaux (≤ 48 m ; 26 à 27 m ici : la grille à frise d'anneaux pèse 1 400 triangles par mètre)
const COUPES = [-131.0, -104.5, -78.0, -51.0, -24.0, 3.0, 30.0, 57.0, 84.0, 111.0, 138.0, 157.5];

// ============================================================================================ outils
// Le point de la ligne de la rue à l'ordonnée z, et sa normale vers la chaussée (x-, à gauche du sens des z croissants).
function surRue(z) {
  let i = 1; while (i < RUE.length - 1 && RUE[i][1] < z) i++;
  const [x0, z0] = RUE[i - 1], [x1, z1] = RUE[i], l = Math.hypot(x1 - x0, z1 - z0) || 1, t = (z - z0) / ((z1 - z0) || 1);
  return { x: x0 + (x1 - x0) * t, z, nx: -(z1 - z0) / l, nz: (x1 - x0) / l };
}
// Un point à `d` m de la ligne de la rue (vers la chaussée), à l'ordonnée z (le long de la ligne).
function aDistance(z, d) { const p = surRue(z); return [p.x + p.nx * d, p.z + p.nz * d]; }
// Le quadrilatère de la bande [da, db] (décalages) entre les ordonnées za et zb.
function quad(za, zb, da, db) { return [aDistance(za, da), aDistance(za, db), aDistance(zb, db), aDistance(zb, da)]; }
const M4 = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
// Les tailles des arbustes arrondies au décimètre : kit.bouleBuis dessine UN modèle par taille (et par aplatissement,
// essence, variante), puis le pose en instances qui partagent sa géométrie ; des tailles tirées au hasard en faisaient
// autant de modèles, fabriqués un par un en construisant le morceau (17 ms d'une traite devant la PMI).
const pas10 = (r) => Math.round(r * 10) / 10;
// Recolore les sommets d'un groupe rendu par le kit (géométrie propre à la pièce, jamais une instance partagée).
function teinter(groupe, f, filtre) {
  groupe.traverse((m) => {
    if (!m.isMesh || m.userData.kitModele || !filtre(m.material.userData.kit)) return;
    const c = m.geometry.attributes.color;
    if (!c) return;
    for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * f[0], c.getY(i) * f[1], c.getZ(i) * f[2]);
    c.needsUpdate = true;
  });
  return groupe;
}
// LA LISIÈRE DE PERSISTANTS, dans le parc, derrière la grille (Z18-11, Z18-15, Z18-23 : lauriers, aucubas, fusains) :
// des massifs sombres de 1,4 à 2,4 m, à 1,2 à 2,6 m de la grille, avec des trous ; chacun est une touffe de deux ou
// trois masses de tailles différentes, enfoncées dans le sol (une file de boules isolées, la première version, avait
// l'air d'une bordure de buis taillés). PURE (obstacles et construction) : [x, z, r, essence] ; ni devant les
// entrées, ni devant la PMI, ni au 156 (le seuil de la zone Z13).
const ESSENCES_LISIERE = ['if', 'haie', 'haie', 'if'];              // (des persistants sombres : pas le troène, trop clair)
function lisiere(alea) {
  const out = [];
  for (let z = -95.0; z < 147.0; z += 2.6) {
    if ((z > PMI.z0 - 1.5 && z < PMI.z1 + 1.5) || (z > 24 && z < 49)) continue;
    if (alea(z, 7.7, 1801) < 0.25) continue;
    const p = surRue(z), d = -(1.4 + 1.0 * alea(z, 1.1, 1802)), r = pas10(0.95 + 0.4 * alea(z, 2.3, 1803));
    const x = p.x + p.nx * d, zz = z + (alea(z, 3.1, 1804) - 0.5) * 0.8;
    const ess = ESSENCES_LISIERE[Math.floor(alea(z, 4.3, 1805) * ESSENCES_LISIERE.length)];
    out.push([x, zz, r, ess]);
    // les masses d'appoint : de part et d'autre, plus petites, un peu plus loin de la grille ou plus près
    for (const s of [-1, 1]) {
      if (alea(z, s + 5.5, 1806) < 0.35) continue;
      const r2 = pas10(r * (0.5 + 0.25 * alea(z, s + 6.5, 1807))), d2 = d - 0.2 - 0.5 * alea(z, s + 7.5, 1808);
      out.push([p.x + p.nx * d2, zz + s * (0.7 + 0.5 * alea(z, s + 8.5, 1809)) * r, r2, alea(z, s, 1810) < 0.5 ? ess : 'if']);
    }
  }
  return out;
}

// ============================================================================================ le rideau taillé
// LE FEUILLAGE D'UNE BOÎTE DU RIDEAU entre za et zb (fonction génératrice) : le cœur (une boîte à section en
// super-ellipse, rentrée de 35 cm, en feuillage sombre du kit : ce qu'on voit entre les cartes), puis les cartes de
// feuilles du rideau du plateau semées sur toute sa surface (comme les rideaux de la zone Z03), et les calottes des vrais
// bouts. Le dessous est à 3 m au-dessus du trottoir, le faîte à 7,6 m, un peu ondulé ; tout se tire de la position.
function* feuillageRideau(kit, lot, C, R, za, zb, dens, budget) {
  const { alea, bruit } = kit, W = RIDEAU.larg / 2, N = 12, EXP = 5;
  const z0 = Math.max(za, R.z0), z1 = Math.min(zb, R.z1);
  if (z1 - z0 < 0.2) return;
  const sol = (x, z) => kit.sol(x, z);
  const bas = (x, z) => Math.max(sol(x, z), sol(x - W * 0.7, z), sol(x + W * 0.7, z)) + RIDEAU.bas;
  const faite = (z) => RIDEAU.haut + 0.14 * Math.sin(z * 0.8) + 0.07 * Math.sin(z * 2.3 + 1.1);
  const section = (n) => {
    const out = [];
    for (let k = 0; k <= n; k++) {
      const th = -Math.PI / 2 + (k / n) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
      out.push([Math.sign(c) * Math.pow(Math.abs(c), 2 / EXP), Math.sign(s) * Math.pow(Math.abs(s), 2 / EXP)]);
    }
    return out;
  };
  // (relecture du lot : la super-ellipse échantillonnée à angle constant serre ses points dans les quatre coins et les
  // espace au milieu des faces ; les cartes, tirées d'un indice de `fin`, laissaient 10 % d'entre elles au milieu des
  // flancs, qui font 27 % du pourtour : une bande sombre à mi-hauteur de la boîte, où l'on voyait le cœur, vue du parc
  // et du trottoir. On la rééchantillonne à longueur d'arc égale.)
  const aLongueurEgale = (pts, n) => {
    const cumul = [0];
    for (let k = 1; k < pts.length; k++) cumul.push(cumul[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    const out = [], tot = cumul[cumul.length - 1];
    for (let i = 0, k = 1; i <= n; i++) {
      const s = (tot * i) / n;
      while (k < pts.length - 1 && cumul[k] < s) k++;
      const t = (s - cumul[k - 1]) / ((cumul[k] - cumul[k - 1]) || 1);
      out.push([pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * t, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * t]);
    }
    return out;
  };
  const prof = section(N), fin = aLongueurEgale(section(960), 96);
  const pc = lot.part('feuillage'), col = [0, 0, 0], dir = [0.0598, 1]; const ld = Math.hypot(dir[0], dir[1]);
  const dx = dir[0] / ld, dz = dir[1] / ld, sx = -dz, sz = dx;          // l'axe du rideau, et sa perpendiculaire
  // UN ANNEAU DU CŒUR en (x, z) ; `e` : rétrécissement du bout
  const anneau = (x, z, e = 1) => {
    const yB = bas(x, z), Hl = faite(z) - RIDEAU.bas, ids = [];
    for (let k = 0; k <= N; k++) {
      const [ps, pu] = prof[k % N], [qs, qu] = prof[(k + 1) % N], [rs, ru] = prof[(k - 1 + N) % N];
      let ns = (qu - ru) * Hl / 2, nu = -(qs - rs) * W; const nl = Math.hypot(ns, nu) || 1; ns /= nl; nu /= nl;
      const S = ps * (W - 0.35) * e, U = Hl / 2 + ((0.35 + (pu + 1) / 2 * (Hl - 0.7)) - Hl / 2) * e;
      const px = x + sx * S, py = yB + U, pz = z + sz * S;
      const f = (0.36 + 0.2 * Math.max(0, nu)) * (0.9 + 0.2 * bruit(px * 0.4, pz * 0.4 + py * 0.3, 1811));
      col[0] = 0.72 * f; col[1] = 0.82 * f; col[2] = 0.46 * f;
      ids.push(lot.s(pc, px, py, pz, sx * ns, nu, sz * ns, z / 1.7, (k / N) * 12 / 1.7, col));
    }
    return ids;
  };
  // LES CARTES d'une station (x, z) : `n` cartes semées à longueur égale sur le pourtour de la section
  const semer = (x, z, n) => {
    const yB = bas(x, z), Hl = faite(z) - RIDEAU.bas, centre = [x, yB + Hl / 2, z], rV = Math.max(W, Hl / 2) + 0.2;
    const phase = alea(x * 1.9, z * 1.9, 1812);
    for (let i = 0; i < n; i++) {
      const h = (k) => alea(x * 3.7 + i * 1.31, z * 3.7 - i * 0.77, 1813 + i * 7 + k);
      const u = (((i + 0.1 + 0.8 * h(1)) / n + phase) % 1) * 96, k = Math.min(95, Math.floor(u)), a = u - k;
      const ps = fin[k][0] + (fin[k + 1][0] - fin[k][0]) * a, pu = fin[k][1] + (fin[k + 1][1] - fin[k][1]) * a;
      let ns = (fin[k + 1][1] - fin[k][1]) * Hl / 2, nu = -(fin[k + 1][0] - fin[k][0]) * W; const nl = Math.hypot(ns, nu) || 1; ns /= nl; nu /= nl;
      const nx = sx * ns, ny = nu, nz = sz * ns;
      const d = h(2) < 0.66 ? 0.12 - 0.37 * h(3) : -0.25 - 0.3 * h(3);
      const px = x + sx * ps * W + nx * d, py = yB + (pu + 1) / 2 * Hl + ny * d, pz = z + sz * ps * W + nz * d;
      const faiteC = pu > 0.55;
      let s = 1.1 + 0.4 * h(4), sy = s, tangage = -Math.asin(Math.max(-1, Math.min(1, ny))) + (h(5) - 0.5) * 0.88, roulis = (h(7) - 0.5) * 0.7, py2 = py;
      const cap = Math.atan2(nx, nz) + (h(6) - 0.5) * 0.9;
      if (faiteC && h(8) < 0.55) { s = 0.34 + 0.18 * h(9); sy = 0.8 + 0.8 * h(10); tangage = (h(11) - 0.6) * 0.5; roulis = Math.PI + (h(12) - 0.5) * 0.8; py2 = py + sy * 0.3; }
      let t = 0.92 + 0.26 * h(14);
      if (d < -0.24) t *= 0.62; else if (pu > -0.55 && h(15) < 0.18) t *= 1.25;
      if (faiteC) t *= 1.18;
      // (fin septembre : un tilleul sur six tourne au jaune, par plaques)
      // (les tilleuls du boulevard sont d'un vert plus jaune que les mûriers-platanes du quai, dont on reprend les
      // feuilles : Z18-16, Z18-21 ; les cartes sont donc un peu moins bleues que celles des rideaux de la zone Z03)
      const jaune = bruit(z / 9, 3.3, 1814) > 0.62 ? 0.5 : 0.07;
      const tir = h(16), tt = tir < jaune ? [1.18, 1.06, 0.52] : tir < jaune + 0.1 ? [1.0, 1.04, 0.74] : [1.1, 1.07, 0.66];
      carte(C, px, py2, pz, tangage, cap, roulis, s, sy, centre, rV, t, tt, h(17) < 0.5);
    }
  };
  // UNE CALOTTE de bout (sens : -1 au début, +1 à la fin) : des cartes sur toute la face, tournées vers le dehors
  const calotte = (x, z, sens) => {
    const yB = bas(x, z), Hl = faite(z) - RIDEAU.bas, H2 = Hl / 2, n = Math.round(Math.PI * W * H2 * dens * 1.6);
    const centre = [x, yB + H2, z], rV = Math.max(W, H2) + 0.2;
    for (let i = 0; i < n; i++) {
      const h = (k) => alea(x * 2.3 + i * 0.71, z * 2.3 - i * 1.13, 1820 + k);
      const r = Math.sqrt((i + 0.5) / n) * 0.97, th = i * 2.39996, a = r * Math.cos(th), b = r * Math.sin(th), c = Math.sqrt(Math.max(0, 1 - r * r));
      let nx = sx * a / W + dx * sens * c / 1.2, ny = b / H2, nz = sz * a / W + dz * sens * c / 1.2;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const d = h(2) < 0.66 ? 0.1 - 0.25 * h(3) : -0.2;
      const px = x + sx * a * (W - 0.1) + dx * sens * c * 1.2 + nx * d, py = yB + H2 + b * (H2 - 0.1) + ny * d, pz = z + sz * a * (W - 0.1) + dz * sens * c * 1.2 + nz * d;
      const s = 1.2 + 0.5 * h(4);
      carte(C, px, py, pz, -Math.asin(Math.max(-1, Math.min(1, ny))) + (h(5) - 0.5) * 0.8, Math.atan2(nx, nz) + (h(6) - 0.5) * 0.8, (h(7) - 0.5) * 0.7,
        s, s, centre, rV, (0.92 + 0.26 * h(14)) * (d < -0.15 ? 0.62 : 1), [1.1, 1.07, 0.66], h(17) < 0.5);
    }
  };
  // le cœur, par stations de 0,9 m ; ses vrais bouts se referment en trois anneaux qui rétrécissent, puis un éventail
  const nA = Math.max(1, Math.round((z1 - z0) / 0.9));
  let prev = null;
  for (let j = 0; j <= nA; j++) {
    const z = z0 + ((z1 - z0) * j) / nA, x = xRideau(z), ring = anneau(x, z);
    if (prev) for (let k = 0; k < N; k++) lot.quad(pc, prev[k], prev[k + 1], ring[k + 1], ring[k]);
    for (const [vrai, sens] of [[j === 0 && Math.abs(z - R.z0) < 0.01, -1], [j === nA && Math.abs(z - R.z1) < 0.01, 1]]) {
      if (!vrai) continue;
      let r0 = ring;
      for (const [dd, e] of [[0.45, 0.9], [0.85, 0.66], [1.1, 0.32]]) {
        const Z = z + dz * dd * sens, r1 = anneau(xRideau(Z), Z, e);
        for (let k = 0; k < N; k++) lot.quad(pc, r0[k], r0[k + 1], r1[k + 1], r1[k]);
        r0 = r1;
      }
      let mx = 0, my = 0, mz = 0; const A = pc.pos.a;
      for (let k = 0; k < N; k++) { mx += A[r0[k] * 3]; my += A[r0[k] * 3 + 1]; mz += A[r0[k] * 3 + 2]; }
      col[0] = 0.3; col[1] = 0.33; col[2] = 0.24;
      const c = lot.s(pc, mx / N, my / N, mz / N + 0.1 * sens, 0, 0, sens, 0.5, 0.5, col);
      for (let k = 0; k < N; k++) lot.tri(pc, r0[k], r0[k + 1], c);
      calotte(x, z, sens);
    }
    prev = ring;
    if (j % 6 === 5 && budget()) yield;
  }
  // les cartes, par stations de 30 cm
  const per = 2 * (RIDEAU.haut - RIDEAU.bas + 2 * W) * 0.9, nS = Math.max(1, Math.round((z1 - z0) / 0.3));
  for (let i = 0; i < nS; i++) {
    const z = z0 + ((i + 0.5) * (z1 - z0)) / nS;
    semer(xRideau(z), z, Math.round(per * 0.3 * dens));
    if (i % 12 === 11 && budget()) yield;
  }
}
// LES FÛTS du rideau entre za et zb : des tilleuls conduits en tête de chat (Z18-11) : un fût lisse et moussu de 2,3 m,
// puis cinq charpentières courtes en vase, chacune terminée par sa « tête » (le moignon renflé des tailles annuelles),
// qui entrent dans la boîte de feuillage.
function futsRideau(kit, bois, tuyau, za, zb) {
  const { alea } = kit, V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const [x, z] of PIEDS) {
    if (z < za || z >= zb) continue;
    const y0 = kit.sol(x, z) - 0.15, yF = y0 + 2.35 + 0.25 * alea(x, z, 1830);
    bois.push(tuyau([V(x, y0, z), V(x, y0 + 0.6, z), V(x + 0.03, y0 + 1.5, z), V(x, yF, z + 0.02)], [0.24, 0.19, 0.17, 0.16], 6, 10));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + alea(x, z, 1831) * 6.28, r = 0.55 + 0.3 * alea(x + k, z, 1832), hh = 0.9 + 0.5 * alea(x, z + k, 1833);
      const P1 = V(x + Math.cos(a) * r * 0.5, yF + hh * 0.5, z + Math.sin(a) * r * 0.5), P2 = V(x + Math.cos(a) * r, yF + hh, z + Math.sin(a) * r);
      bois.push(tuyau([V(x, yF - 0.3, z), V(x, yF, z), P1, P2], [0.1, 0.09, 0.075, 0.1], 4, 6));
    }
  }
}

// ============================================================================================ un morceau
function* construireMorceau(ctx, za, zb) {
  const { kit, groupe } = ctx, T = outilsB2(kit, Monde), { alea } = kit, budget = ctx.budget || (() => false);
  const mobile = !!ctx.mobile;
  // ---- 1. LE TROTTOIR, LES PLACES, LES PAVÉS ----
  const sol = new kit.Lot('Z18 trottoir');
  const trot = T.taches([1.0, 0.995, 0.985], 1841, 0.12), places = T.taches([0.66, 0.66, 0.655], 1842, 0.1);
  const paves = T.taches([0.5, 0.51, 0.52], 1843, 0.14), pavesC = T.taches([0.56, 0.575, 0.6], 1844, 0.12);
  const bande = (a, b, da, db, cle, couleur, o = {}) => {
    const A = Math.max(a, za), B = Math.min(b, zb);
    if (B - A < 0.05) return;
    // (maillé tous les 0,8 m environ, près du pas du sol du monde : drapée par carreaux de 1,5 m, la plaque coupait les
    // plis du sol, et les lignes des places, posées par-dessus avec d'autres sommets, s'y enfonçaient par endroits)
    const n = Math.max(1, Math.round((B - A) / 1.5));
    for (let i = 0; i < n; i++) {
      const z0 = A + ((B - A) * i) / n, z1 = A + ((B - A) * (i + 1)) / n;
      T.plaque(sol, cle, quad(z0, z1, da, db), Math.max(1, Math.round((db - da) / 0.8)), Math.max(1, Math.round((z1 - z0) / 0.8)), { dy: o.dy ?? 0.03, couleur, tuile: o.tuile });
    }
  };
  for (const S of SECTIONS) {
    if (S.z1 <= za || S.z0 >= zb) continue;
    if (budget()) yield;
    if (S.places) {
      // le trottoir (devant la PMI, il laisse la place au massif : il part de 0,9 m), puis les places
      if (S.z0 < PMI.z1 && S.z1 > PMI.z0) {
        bande(S.z0, PMI.z0, B_MUR, B_TROT, 'asphalte#sol', trot); bande(PMI.z0, PMI.z1, 0.9, B_TROT, 'asphalte#sol', trot); bande(PMI.z1, S.z1, B_MUR, B_TROT, 'asphalte#sol', trot);
      } else bande(S.z0, S.z1, B_MUR, B_TROT, 'asphalte#sol', trot);
      bande(S.z0, S.z1, B_TROT, B_RUE, 'asphalte#sol', places);
    } else if (S.e3) {
      // devant E3 : le trottoir, l'allée pavée, et de part et d'autre (à la place de deux places) les massifs
      bande(S.z0, E3.z0, B_MUR, B_TROT, 'asphalte#sol', trot); bande(E3.z1, S.z1, B_MUR, B_TROT, 'asphalte#sol', trot);
      bande(E3.z0, E3.z1, B_MUR, B_RUE, 'dalles#sol', paves, { tuile: 0.45 });
      bande(S.z0, E3.z0 - 0.15, B_TROT, B_RUE, 'terre#sol', () => [0.8, 0.78, 0.74], { dy: 0.06 });
      bande(E3.z1 + 0.15, S.z1, B_TROT, B_RUE, 'terre#sol', () => [0.8, 0.78, 0.74], { dy: 0.06 });
    } else if (S.parvis) {
      // le parvis du 156 et l'arrêt de bus : asphalte jusqu'à la bordure, une bande de pavés de granit le long d'elle
      bande(S.z0, S.z1, B_MUR, B_RUE - 1.0, 'asphalte#sol', trot);
      bande(S.z0, S.z1, B_RUE - 1.0, B_RUE, 'dalles#sol', pavesC, { tuile: 0.4 });
    } else if (S.e2) {
      bande(S.z0, S.z1, B_MUR, B_RUE, 'dalles#sol', pavesC, { tuile: 0.45 });
    }
  }
  // le renfoncement du 156 : de la ligne de la rue jusqu'au pied de la grille (et, sous le portail, jusqu'à son plan)
  if (za < 45.62 && zb > 26.36) {
    const E = ENTREE_156, xDedans = (z) => (z >= E.z0 && z <= E.z1 ? E.x : xSurLigne(z < E.z0 ? GRILLE_BD_SUD : GRILLE_BD_NORD, z) - B_MUR);
    const A = Math.max(26.36, za), B = Math.min(45.62, zb), n = Math.max(1, Math.round((B - A) / 0.5));
    for (let i = 0; i < n; i++) {
      const z0 = A + ((B - A) * i) / n, z1 = A + ((B - A) * (i + 1)) / n;
      const o0 = aDistance(z0, B_MUR), o1 = aDistance(z1, B_MUR), i0 = xDedans(z0), i1 = xDedans(z1);
      if (i0 - o0[0] < 0.02 && i1 - o1[0] < 0.02) continue;
      const larg = Math.max(i0 - o0[0], i1 - o1[0]);
      T.plaque(sol, 'asphalte#sol', [o0, [Math.max(i0, o0[0]), z0], [Math.max(i1, o1[0]), z1], o1], Math.max(1, Math.ceil(larg / 0.6)), 1, { dy: 0.03, couleur: trot });
    }
  }
  if (budget()) yield;
  // LES LIGNES DES PLACES (peinture blanche, 10 cm, tous les 2,4 m) et la place bleue
  // (la peinture du kit est un atlas : on reste dans sa bande de peinture unie, u de 0,06 à 0,44, sans y projeter le sol)
  const blanc = [0.78, 0.78, 0.76], BANDE = { tuile: 1e4, uDecal: 0.25, vDecal: 0.5 };
  for (const S of SECTIONS) {
    if (!S.places || S.z1 <= za || S.z0 >= zb) continue;
    for (let z = S.z0 + 0.6; z <= S.z1 - 0.3; z += 2.4) {
      if (z < za || z >= zb) continue;
      T.plaque(sol, 'peinture#sol', quad(z - 0.05, z + 0.05, B_TROT + 0.3, B_RUE - 0.05), 8, 1, { dy: 0.055, couleur: () => blanc, ...BANDE });
    }
    if (PMR.z0 >= za && PMR.z0 < zb && S.z0 <= PMR.z0 && S.z1 >= PMR.z1) {
      T.plaque(sol, 'peinture#sol', quad(PMR.z0 + 0.1, PMR.z1 - 0.1, B_TROT + 0.4, B_RUE - 0.2), 8, 6, { dy: 0.05, couleur: () => [0.05, 0.14, 0.42], ...BANDE });
    }
  }
  if (budget()) yield;
  // LES FOSSES DES TILLEULS (1 x 1 m, gazon, cadre de béton)
  for (const [x, z] of PIEDS) {
    if (z < za || z >= zb) continue;
    T.plaque(sol, 'gazon#sol', [[x - 0.45, z - 0.45], [x + 0.45, z - 0.45], [x + 0.45, z + 0.45], [x - 0.45, z + 0.45]], 2, 2, { dy: 0.045, couleur: () => [0.78, 0.82, 0.7] });
    kit.bordure({ ligne: [[x - 0.5, z - 0.5], [x + 0.5, z - 0.5], [x + 0.5, z + 0.5], [x - 0.5, z + 0.5]], largeur: 0.1, hauteur: 0.05, materiau: 'beton', ferme: true }, sol);
  }
  if (budget()) yield;
  // LA BORDURE DE GRANIT : entre trottoir et places ; au bord de la chaussée là où il n'y a pas de places ; et les
  // retours en travers aux changements de tronçon
  const bord = (a, b, d) => {
    const A = Math.max(a, za), B = Math.min(b, zb);
    if (B - A < 0.1) return;
    const pts = []; for (let z = A; z <= B + 1e-6; z += Math.max(0.5, (B - A) / Math.ceil((B - A) / 3))) pts.push(aDistance(Math.min(z, B), d));
    if (pts.length < 2) pts.push(aDistance(B, d));
    kit.bordure({ ligne: pts, largeur: 0.18, hauteur: 0.06, materiau: 'taille' }, sol);
  };
  for (const S of SECTIONS) {
    if (S.z1 <= za || S.z0 >= zb) continue;
    if (S.places) bord(S.z0, S.z1, B_TROT + 0.09);
    else if (S.e3) { bord(S.z0, E3.z0, B_TROT + 0.09); bord(E3.z1, S.z1, B_TROT + 0.09); bord(E3.z0, E3.z1, B_RUE); }
    else bord(S.z0, S.z1, B_RUE);
    for (const zc of [S.z0]) {
      if (zc < za || zc >= zb || zc <= -131) continue;
      const a = aDistance(zc, B_TROT + 0.18), b = aDistance(zc, B_RUE);
      kit.bordure({ ligne: [a, b], largeur: 0.18, hauteur: 0.06, materiau: 'taille' }, sol);
    }
  }
  groupe.add(sol.maillages('Z18 trottoir'));
  if (budget()) yield;

  // ---- 2. LA GRILLE NOIRE SUR SON MURET (par tronçons de 5 m au plus, coupés aux multiples de 5 m : une pièce ne rend
  // pas la main, et 10 m de cette grille à frise d'anneaux prenaient 6 à 7 ms d'une traite) ----
  for (const ligne of GRILLES) {
    for (let zc = za; zc < zb;) {
      const z2 = Math.min(zb, (Math.floor(zc / 5 + 1e-9) + 1) * 5);
      for (const bout of decouper(ligne, zc, z2)) {
        const g = kit.grilleBarreaux({ ligne: bout, h: 1.65, muret: 0.5, ep: 0.4, pas: 0.115, travee: 2.5, pointes: true, anneaux: true });
        // le calcaire du muret, beige gris (#c9c0a8 ; la pierre taillée du kit est plus blonde et plus claire)
        groupe.add(teinter(g, [0.86, 0.83, 0.76], (n) => n === 'taille'));
      }
      if (budget()) yield;
      zc = z2;
    }
  }
  // les panneaux rigides verts du coin nord-est, et les poteaux de maçonnerie
  const vert = new kit.Lot('Z18 panneaux verts'), cV = kit.lin('#2e4a3a');
  for (const bout of decouper(PANNEAUX_VERTS, za, zb)) panneauxRigides(kit, vert, bout, cV);
  for (const [x, z] of PILASTRES) {
    if (z < za || z >= zb) continue;
    const y = kit.sol(x, z);
    vert.boite('beton', 0.42, 2.25, 0.42, M4(x, y + 1.0, z), { chanfrein: 0.02, couleur: [0.72, 0.72, 0.7] });
    vert.boite('beton', 0.5, 0.08, 0.5, M4(x, y + 2.16, z), { chanfrein: 0.015, couleur: [0.78, 0.78, 0.76] });
  }
  if (vert.parts.size) groupe.add(vert.maillages('Z18 panneaux verts'));
  if (budget()) yield;

  // ---- 3. DEVANT LA PMI : la bordure de béton et le massif d'arbustes (euphorbes, fusains panachés, pittosporums) ----
  const feu = new Touffes();                                     // (le feuillage des arbustes libres : massif et lisière)
  if (za < PMI.z1 && zb > PMI.z0) {
    const A = Math.max(za, PMI.z0), B = Math.min(zb, PMI.z1), mas = new kit.Lot('Z18 massif PMI');
    const pts = []; for (let z = A; z <= B + 1e-6; z += 1.5) pts.push(aDistance(Math.min(z, B), 0.85));
    kit.bordure({ ligne: pts, largeur: 0.12, hauteur: 0.15, materiau: 'beton' }, mas);
    for (let z = A; z < B; z += 1.5) T.plaque(mas, 'terre#sol', quad(z, Math.min(B, z + 1.5), -0.5, 0.8), 2, 1, { dy: 0.05, couleur: () => [0.7, 0.66, 0.6] });
    groupe.add(mas.maillages('Z18 massif PMI'));
    // (relecture du lot : des arbustes libres de 0,9 à 1,7 m — euphorbes vert-jaune, fusains panachés gris-vert —, et
    // non des boules taillées de 60 cm, qui faisaient une bordure basse là où Z18-05 montre un massif touffu)
    for (let z = A + 0.5, i = 0; z < B - 0.3; z += 0.95, i++) {
      const [x, zz] = aDistance(z, i % 2 ? 0.3 : -0.1), pal = ['cognassier', 'eleagnus', 'moyen', 'cognassier'][Math.floor(alea(z, 1.9, 1851) * 4)];
      arbuste(feu, { x, z: zz, h: 0.9 + 0.8 * alea(z, 2.9, 1852), R: 0.55 + 0.25 * alea(z, 3.9, 1852), pal });
      if (i % 4 === 3 && budget()) yield;
    }
    if (budget()) yield;
  }
  // devant E3 : les boules de buis des deux petits massifs
  if (za < E3.z1 + 4 && zb > E3.z0 - 4) {
    for (const [z0, z1] of [[-104.3, E3.z0 - 0.3], [E3.z1 + 0.3, -95.2]]) {
      for (let z = z0 + 0.6; z < z1 - 0.3; z += 1.1) for (const d of [6.1, 7.4, 8.7]) {
        if (z < za || z >= zb || alea(z, d, 1853) < 0.25) continue;
        const [x, zz] = aDistance(z, d);
        groupe.add(kit.bouleBuis({ x, z: zz, r: alea(z, d, 1854) < 0.5 ? 0.36 : 0.42, aplat: 0.85, essence: 'if' }));
      }
    }
  }

  // ---- 4. LA LISIÈRE DE PERSISTANTS, dans le parc derrière la grille ----
  // (relecture du lot : des arbustes LIBRES — lauriers, aucubas, fusains : Z18-15, Z18-23 —, pas des boules taillées.
  // Les boules du kit, même groupées par deux ou trois, faisaient de la lisière, vue du parc, une bordure de buis de
  // jardin à la française le long de 240 m de grille. Ce sont les touffes en croix des massifs du plateau et du coteau
  // (arbusteFond, par js/parc/zones/coteau.js), de 1 à 2,6 m ; avec le massif de la PMI, un seul maillage de feuillage
  // par morceau.)
  let nL = 0;
  for (const [x, z, r, ess] of lisiere(alea)) {
    if (z < za || z >= zb) continue;
    if (++nL % 4 === 0 && budget()) yield;
    const pal = ess === 'if' ? 'sombre' : ['laurier', 'laurier', 'moyen', 'sombre'][Math.floor(alea(z, x, 1856) * 4)];
    arbuste(feu, { x, z, h: 0.3 + 1.35 * r + 0.5 * alea(x, z, 1855), R: r * 1.05, pal });
  }
  if (budget()) yield;
  const mFeu = maillageFeuillage(feu, ctx.K, 'Z18 lisière et massifs', true);
  if (mFeu) groupe.add(mFeu);
  if (budget()) yield;

  // ---- 5. LE MOBILIER DE RUE : potelets, panneaux de stationnement, colonne Morris ----
  const rue = new kit.Lot('Z18 mobilier');
  for (const S of SECTIONS) {
    if (S.places || S.e3 || S.z1 <= za || S.z0 >= zb) continue;
    for (let z = S.z0 + 0.8; z < S.z1 - 0.5; z += 1.6) {
      if (z < za || z >= zb || (S.parvis && z > 20.3 && z < 26.2)) continue;
      const [x, zz] = aDistance(z, B_RUE - 0.35), y = kit.sol(x, zz);
      rue.tour('peinture', [[0.045, -0.1], [0.045, 0.62], [0.05, 0.64], [0.05, 0.9], [0.03, 0.93], [0.001, 0.95]], 8, M4(x, y, zz), { bande: true, couleur: [0.03, 0.03, 0.03] });
      rue.tour('peinture', [[0.047, 0.72], [0.047, 0.8]], 8, M4(x, y, zz), { bande: true, couleur: [0.85, 0.85, 0.83] });
    }
  }
  for (const z of PANNEAUX_P) {
    if (z < za || z >= zb) continue;
    const [x, zz] = aDistance(z, B_TROT - 0.35), y = kit.sol(x, zz);
    rue.barre([x, y - 0.1, zz], [x, y + 2.7, zz], 0.05, 0.05, { couleur: [0.45, 0.46, 0.46], haut: [1, 0, 0] });
    rue.boite('peinture', 0.03, 0.45, 0.45, M4(x - 0.03, y + 2.4, zz), { bande: true, couleur: kit.lin('#1f4fa0'), chanfrein: 0.01 });
    rue.boite('peinture', 0.01, 0.28, 0.2, M4(x - 0.05, y + 2.4, zz), { bande: true, couleur: [0.9, 0.9, 0.9] });
  }
  if (MORRIS.z >= za && MORRIS.z < zb) {
    // la colonne Morris (Z18-03 : bleu nuit #1f2a3a, Ø 1,2 m, 3,8 m, affiches, coupole et épi)
    const [x, z] = aDistance(MORRIS.z, MORRIS.d), y = kit.sol(x, z), bleu = kit.lin('#1f2a3a');
    rue.tour('peinture', [[0.68, -0.1], [0.68, 0.25], [0.6, 0.32], [0.6, 2.85], [0.66, 2.92], [0.66, 3.05], [0.5, 3.1], [0.3, 3.45], [0.08, 3.6], [0.1, 3.72], [0.001, 3.9]], 20, M4(x, y, z), { bande: true, couleur: bleu });
    // les affiches : une bande de lès de couleurs, collés autour du fût
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3, c = [[0.85, 0.82, 0.74], [0.75, 0.2, 0.18], [0.9, 0.78, 0.3], [0.2, 0.3, 0.55], [0.88, 0.86, 0.82], [0.3, 0.45, 0.3]][k];
      rue.boite('peinture', 0.012, 1.9, 0.58, new THREE.Matrix4().makeRotationY(-a).setPosition(x + Math.cos(a) * 0.605, y + 1.55, z + Math.sin(a) * 0.605), { bande: true, couleur: c });
    }
  }
  if (rue.parts.size) groupe.add(rue.maillages('Z18 mobilier'));
  if (budget()) yield;

  // ---- 6. LE RIDEAU DE TILLEULS TAILLÉS : le cœur, les cartes de feuilles, puis les fûts ----
  const RQ = materiauxRideau(ctx), lotF = new kit.Lot('rideau du boulevard'), cartes = new Cartes(), bois = [];
  for (const R of RIDEAUX) {
    if (R.z1 < za || R.z0 > zb) continue;
    yield* feuillageRideau(kit, lotF, cartes, R, za, zb, mobile ? 2.0 : 3.2, budget);
  }
  futsRideau(kit, bois, RQ.tuyau, za, zb);
  if (lotF.parts.size) groupe.add(lotF.maillages('rideau du boulevard'));
  if (budget()) yield;
  const feuilles = feuillesRideau(ctx, RQ, cartes, 'rideau du boulevard · feuilles');
  if (feuilles) groupe.add(feuilles);
  if (budget()) yield;
  if (bois.length) {
    const futs = new THREE.Mesh(RQ.aLOmbre(mergeGeometries(bois), 0.0, 0.2), RQ.ecorce);
    futs.name = 'rideau du boulevard · fûts'; futs.castShadow = true; futs.receiveShadow = true; futs.position.x = Monde.dx;
    for (const b of bois) b.dispose();
    groupe.add(futs);
  }
  // (le feuillage taillé est de la végétation : conception § 3.3, règle 6)
  groupe.traverse((o) => { if (o.isMesh && ['feuillage', 'frange'].includes(o.material.userData.kit)) o.userData.feuillage = true; });
  yield;
}

// LES PANNEAUX RIGIDES de treillis soudé (2 m, vert sombre) le long d'une ligne : un poteau tous les 2,5 m, des fils
// verticaux tous les 10 cm, deux fils horizontaux et trois plis en V (les nervures des panneaux).
function panneauxRigides(kit, lot, ligne, c) {
  for (let i = 0; i < ligne.length - 1; i++) {
    const [ax, az] = ligne[i], [bx, bz] = ligne[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 2.5));
    const ux = (bx - ax) / L, uz = (bz - az) / L, haut = [ux, 0, uz];
    for (let k = 0; k <= n; k++) {
      const x = ax + ux * (L * k) / n, z = az + uz * (L * k) / n, y = kit.sol(x, z);
      lot.barre([x, y - 0.1, z], [x, y + 2.05, z], 0.06, 0.06, { couleur: c, haut });
      if (k === n) continue;
      const Lp = L / n, nf = Math.round(Lp / 0.1);
      for (let f = 1; f < nf; f++) {
        const s = (L * k) / n + (Lp * f) / nf, xf = ax + ux * s, zf = az + uz * s, yf = kit.sol(xf, zf);
        lot.barre([xf, yf + 0.04, zf], [xf, yf + 1.98, zf], 0.006, 0.006, { couleur: c, haut });
      }
      const x1 = x + ux * Lp, z1 = z + uz * Lp, y1 = kit.sol(x1, z1);
      for (const h of [0.08, 0.45, 1.0, 1.55, 1.95]) lot.barre([x, y + h, z], [x1, y1 + h, z1], 0.012, h === 0.08 || h === 1.95 ? 0.008 : 0.03, { couleur: c });
    }
  }
}

// LA SILHOUETTE d'un morceau (≤ 2 000 triangles) : le rideau en boîte à huit pans, le muret en bande de pierre.
function* silhouetteMorceau(ctx, za, zb) {
  const { kit } = ctx, lot = new kit.Lot('silhouette Z18'), W = RIDEAU.larg / 2 - 0.2;
  for (const R of RIDEAUX) {
    const A = Math.max(za, R.z0), B = Math.min(zb, R.z1);
    if (B - A < 0.5) continue;
    const pts = []; for (let z = A; z <= B + 1e-6; z += Math.max(1, (B - A) / Math.ceil((B - A) / 6))) pts.push([xRideau(Math.min(z, B)), Math.min(z, B)]);
    const H = RIDEAU.haut - RIDEAU.bas;
    const pr = [[-W, 0.4], [-W * 0.7, 0], [W * 0.7, 0], [W, 0.4], [W, H - 0.4], [W * 0.7, H], [-W * 0.7, H], [-W, H - 0.4]];
    lot.prisme('feuillage', pr, pts.map(([x, z]) => [x, kit.sol(x, z) + RIDEAU.bas, z]), { vertical: true, couleur: [0.45, 0.5, 0.36] });
  }
  for (const ligne of GRILLES) {
    for (const bout of decouper(ligne, za, zb)) {
      lot.prisme('taille', [[-0.2, -0.1], [0.2, -0.1], [0.2, 0.5], [-0.2, 0.5]], bout.map(([x, z]) => [x, kit.sol(x, z), z]), { vertical: true, couleur: [0.8, 0.77, 0.7] });
    }
  }
  if (lot.parts.size) ctx.groupe.add(lot.maillages('silhouette Z18'));
}

// La boîte d'un morceau : les z de la coupe, les x de la ligne de la rue (la chaussée à 10 m, le parc à 3,5 m).
function boite(za, zb) {
  let x0 = Infinity, x1 = -Infinity;
  for (let z = za; z <= zb; z += 1) { const p = surRue(z); x0 = Math.min(x0, p.x - 11); x1 = Math.max(x1, p.x + 3.5); }
  return [x0, za, x1, zb];
}

export default {
  id: 'Z18', nom: 'Bordure du boulevard Saint-Denis',
  emprise: [[-153.5, -131], [-128, -131], [-121, 157.5], [-137, 157.5]],
  morceaux: COUPES.slice(0, -1).map((za, i) => {
    const zb = COUPES[i + 1], id = 'Z18' + String.fromCharCode(97 + i);
    return { id, boite: boite(za, zb), construire: (ctx) => construireMorceau(ctx, za, zb), silhouette: (ctx) => silhouetteMorceau(ctx, za, zb) };
  }),
  // PUR (sans three). La grille du boulevard, ses portails et le portillon du 156 sont dans monde.json (clôtures,
  // portillons) : ici, les fûts du rideau (ils ne sont plus dans arbres.bin), la colonne Morris, les mâts, et, dans le
  // parc, la lisière de persistants.
  obstacles(o) {
    for (const [x, z] of PIEDS) o.cercle(x, z, 0.26, { h: 2.6, type: 'arbre', source: 'Z18 rideau taillé' });
    const [mx, mz] = aDistance(MORRIS.z, MORRIS.d);
    o.cercle(mx, mz, 0.68, { h: 3.8, type: 'dur' });
    for (const z of PANNEAUX_P) { const [x, zz] = aDistance(z, B_TROT - 0.35); o.cercle(x, zz, 0.06, { h: 2.7, type: 'poteau', camera: false }); }
    const alea = (x, z, k = 0) => { const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };
    for (const [x, z, r] of lisiere(alea)) o.cercle(x, z, r * 0.8, { h: 1.6, type: 'haie' });
    for (const [x, z] of PILASTRES) o.boite(x, z, 0.21, 0.21, 0, { h: 2.2, type: 'dur' });
  },
  bancs() {},
  lieux: [],
};
