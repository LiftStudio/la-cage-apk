// =====================================================================
//  ZONE Z08 : LE CITY-STADE, LES JEUX DU SUD-OUEST ET LE JARDIN SUD (lot B9 du chantier « parc entier »)
// =====================================================================
// Au sud du jardin de la fontaine (Z07), entre le pied du coteau (x ≈ -32) et le rideau taillé du quai (x ≈ 6), de
// z 118 à 150 (le théâtre de verdure, Z09, commence au-delà). D'après tools/parc/references_gmaps/SYNTHESE.md § Z08 et
// R5.md § Z08, qui corrigent la conception — mais la zone est MAL COUVERTE par les photos (aucune fiche Google, aucune
// sphère ; une seule photo rapprochée, Commons « Nouvelle partie rénovée » 02, 2022 ; le reste vu du quai à travers la
// grille) : le plan vient de l'ORTHOPHOTO IGN (relue en luminance au pas de 0,5 m pour ce lot), le reste est tenu sobre
// et plausible.
//
//   - le CITY-STADE (x -30,0…-19,6, z 120,8…144,4, ortho) : sol sportif beige sable à lignes blanches ; une ENCEINTE DE
//     4 M en barreaux ronds d'acier galvanisé entre lisses et poteaux (Commons 02), doublée côté coteau (x-) d'un
//     BARDAGE de panneaux nervurés beige gris sur 2,2 m ; aux deux bouts, un BUT en tube argent de 3 x 2 m intégré à la
//     palissade (en niche) et un PANIER DE BASKET au-dessus ; l'entrée côté allée par une CHICANE de garde-corps de 1,1 m ;
//     la plaque ronde blanche à liseré vert du règlement, la corbeille noire à lames ;
//   - l'ALLÉE DE SABLE (x ≈ -16, de z 118 à 150) entre le city-stade et les jeux ;
//   - l'AIRE DE JEUX, close de CLÔTURES TUBULAIRES BLANC GRIS (1,2 m ; 2 m côté promenade) : au nord, l'aire de SABLE
//     orangé (x -13…-4,4, z 128,6…135) et ses jeux à ressort ; au sud, sur les copeaux, la STRUCTURE DE JEUX EN BOIS
//     (rondins et madriers bruns, une tour à TOIT EN PAVILLON et une petite tour, passerelle, toboggan, rampe à
//     tasseaux) — c'est elle la « pergola brune » de la conception ; entre les deux, la traverse des jeux, qui entre sous
//     l'ARCHE D'ENTRÉE (deux arcs parallèles de tube gris argent reliés de traverses, surbaissés, 5 m de portée, 3 m)
//     depuis l'allée est ; l'allée diagonale ;
//   - le long de la promenade, au pied du rideau, le MUR BAS EN PANNEAUX ANTHRACITE (0,9 m) et un brise-vue en
//     CANISSE vers z 125…132 ; les lampadaires « du bas » (fût rouille, js/parc/zones/z07_jardin_fontaine.js, outilsB9).
//
// CE QUI MANQUE (R5.md Z08.3, à faire compléter par Haythem sur place : trois ou quatre photos suffiraient) : l'intérieur
// de l'aire de jeux et la forme exacte de la structure en bois (ici : deux tours, une passerelle, un toboggan, une rampe),
// les jeux de l'aire de sable (ici : deux jeux à ressort et une bascule), le MARQUAGE du city-stade (ici : un tracé de
// handball simplifié) et ses paniers (ici : un panneau et un cercle au-dessus de chaque but), son côté ouest (ici : le
// bardage de la photo 02 sur tout le côté), la fonction et la place exacte de l'arche (ici : l'entrée de la traverse des
// jeux depuis l'allée est), le jardin sud.
//
// LES LIMITES : le grand arc, l'allée courbe du sud, les massifs en arc et le parvis sud de la placette sont à Z07 ; la
// promenade, son rideau et ses bancs à Z03 ; au-delà de z 150, le théâtre (Z09). LES DONNÉES (tools/parc/gabarits.json,
// zone Z08) : les sols (city-stade en béton clair, sable, copeaux : le pas et le roulement de la balle), l'allée est, la
// diagonale, la traverse ; toute hauteur vient du sol du monde.
//
// LA BALLE : l'enceinte du city-stade est faite d'obstacles « grille » sur 4 m (la balle y rebondit et y reste), le
// bardage est « dur », le fond et les côtés des niches de but sont des « filets », les panneaux de basket arrêtent la
// balle à leur hauteur seulement. Les clôtures des jeux (1,2 et 2 m), le mur bas, la structure, l'arche : obstacles aussi.
//
// RÈGLES DE ZONE : aucun Math.random ; les matériaux du kit, aucun propre ; aucun arbre planté (le jeune tilleul du nord
// du city-stade est dans gabarits.json, ses tuteurs sont dessinés par Z07) ; rien hors du groupe du morceau.
import * as THREE from 'three';
import { outilsB9, COULEURS } from './z07_jardin_fontaine.js';
import { Nappe, maillageSol, bancsNoirs, Touffes, arbuste, maillageFeuillage } from './coteau.js';

// ============================================================================================ les données
// (repère du terrain 1)
// Le city-stade : emprise (ortho), hauteur de l'enceinte, hauteur du bardage ; les buts (centre en x, largeur, hauteur,
// profondeur de la niche) ; l'entrée côté allée (z de l'ouverture) et sa chicane
export const CITY = { x0: -30.0, x1: -19.6, z0: 120.8, z1: 144.4, h: 4.0, bardage: 2.2 };
const BUT = { x: (CITY.x0 + CITY.x1) / 2, l: 3.0, h: 2.0, niche: 0.8 };
// (relecture B9 : l'entrée a un linteau à 2,25 m et ses barreaux au-dessus — l'obstacle « grille » des données y
// arrêtait déjà la balle ; sans eux, elle rebondissait sur du vide)
const ENTREE = { z0: 130.4, z1: 131.6, h: 2.25 };
const CHICANE = [[CITY.x1 + 0.05, 129.4], [CITY.x1 + 1.0, 129.4], [CITY.x1 + 1.0, 132.2]];
// Les jeux : l'aire de sable (contour des données), l'enclos de la structure en bois, l'arche d'entrée (dans le plan
// x = ARCHE.x, de z0 à z1)
const SABLE = [[-13.0, 128.6], [-4.4, 128.6], [-7.3, 134.9], [-13.0, 134.9]];
const COPEAUX = [[-12.8, 137.4], [-3.6, 137.4], [-3.6, 145.2], [-12.8, 145.2]];
// (relecture B9, à côté de la vue du quai d'oct. 2025 : l'arche y est un arc SURBAISSÉ — flèche d'environ 0,15 fois la
// portée — sur des montants droits qui montent à hauteur de la clôture de 2 m ; avec 1,2 m de flèche sur 2 m de pieds,
// elle sortait en plein cintre, haute et étroite)
const ARCHE = { x: -3.55, z0: 132.3, z1: 137.3, pied: 2.25, fleche: 0.75, prof: 0.9 };
// Les clôtures blanches : [ligne, hauteur] ; les portillons laissent passer (enclos nord ouvert au sud au milieu, enclos
// sud ouvert au nord au milieu)
const CLOTURES = [
  [[[-10.8, 134.95], [-13.15, 134.95], [-13.15, 128.45], [-4.25, 128.45], [-7.2, 134.95]], 1.2],
  [[[-8.8, 134.95], [-7.2, 134.95]], 1.2],
  [[[-9.3, 137.3], [-12.95, 137.3], [-12.95, 145.35], [-3.55, 145.35]], 1.2],
  [[[-3.55, 145.35], [-3.55, 137.3]], 2.0],
  [[[-3.55, 137.3], [-7.3, 137.3]], 1.2],
];
// La structure de jeux en bois : la grande tour (plate-forme à 1,4 m, toit en pavillon), la petite tour (1,0 m), entre
// elles une passerelle ; le toboggan descend de la grande tour vers le nord, la rampe à tasseaux y monte par l'ouest
const TOUR = { x: -9.4, z: 140.8, c: 2.4, y: 1.4, faite: 4.6 };
const PETITE = { x: -5.4, z: 142.4, c: 1.6, y: 1.0, faite: 3.3 };
// Les deux jeux à ressort et la bascule de l'aire de sable
const RESSORTS = [[-10.9, 130.9, '#b8574a'], [-8.6, 132.5, '#6d9a4a']];
const BASCULE = { x: -11.4, z: 133.5 };
// Le mur bas en panneaux anthracite, au pied du rideau (les fûts de Z03 sont à x 6,2 → 5,9 de z 118 à 152) ; la canisse
const xMur = (z) => 6.2 - (0.3 * (z - 117.9)) / 34.2 - 0.72;
const MUR = { z0: 118.6, z1: 149.6, h: 0.9, ep: 0.2 };
const CANISSE = { z0: 124.6, z1: 132.0, h: 1.2, recul: 0.4 };
// Le mobilier : lampadaires rouille, bancs noirs [x, z, cap], la plaque du règlement, la corbeille
const LAMPES = {
  Z08a: [[-18.35, 126.0], [-18.35, 140.5], [-14.3, 148.6]],
  Z08b: [[-0.55, 124.8], [-0.55, 139.6], [-14.2, 136.9]],
};
// (les deux bancs, au bord est de l'allée de sable, regardent le city-stade)
const BANCS = { Z08a: [], Z08b: [[-14.35, 131.9, 270], [-14.35, 141.6, 270]] };
// (relecture à l'écran : posée en z 133,2, au milieu du débouché de la chicane — la fente d'un mètre entre l'enceinte et
// le garde-corps —, la corbeille en fermait l'accès : un joueur venu de l'allée butait dessus et n'entrait plus dans le
// city-stade. Commons 02 montre, de gauche à droite en regardant le terrain, le garde-corps, la corbeille, puis la
// plaque : la corbeille est dans le coin, au pied de l'enceinte, contre le bras nord du garde-corps, hors du passage ;
// la plaque un mètre plus au nord)
const PLAQUE = { x: CITY.x1 + 0.12, z: 127.9 };
const CORBEILLE = { x: CITY.x1 + 0.55, z: 128.75 };

// Les tracés (monde.json, empreinte 43ea777551d37781), lus dans les données quand elles sont là
const REPLI = {
  allee_hemicycle: [[-15.72, 117.33], [-16.4, 139.61], [-16.86, 151.24]],
  jeux_allee_est: [[-1.6, 114.4], [-2.0, 120.0], [-2.25, 128.0], [-2.25, 148.6]],
  jeux_diagonale: [[-6.4, 135.6], [-2.6, 127.6]],
  jeux_traverse: [[-15.0, 136.0], [-2.5, 136.0]],
};
const LARGEURS = { allee_hemicycle: 2.5, jeux_allee_est: 2.4, jeux_diagonale: 1.8, jeux_traverse: 1.5 };

const BOITES = { Z08a: [-31.0, 118.0, -14.0, 150.0], Z08b: [-15.0, 114.0, 8.0, 150.0] };

// ============================================================================================ petits outils
const parId = (liste, id) => (liste || []).find((e) => e && e.id === id) || null;
function donnees(ctx) { const s = ctx && ctx.scene && ctx.scene.userData && ctx.scene.userData.solParc; return (s && s.d) || null; }
const trace = (D, id) => ((parId(D && D.allees, id) || {}).trace) || REPLI[id];
const dansB = (B, x, z) => x >= B[0] && x <= B[2] && z >= B[1] && z <= B[3];
function maillagesLot(lot, nom) {
  const g = lot.maillages(nom);
  for (const m of g.children) if (m.material && m.material.alphaTest > 0) { m.castShadow = false; m.userData.feuillage = true; }
  return g;
}
// L'arc segmentaire de l'arche : le point à la fraction t (0 → 1) de la portée, sur le plan x = xa
function pointArche(xa, t) {
  const A = ARCHE, L = A.z1 - A.z0, R = (L * L / 4 + A.fleche * A.fleche) / (2 * A.fleche), zc = A.z0 + L / 2, yc = A.pied + A.fleche - R;
  const z = A.z0 + L * t, y = yc + Math.sqrt(Math.max(0, R * R - (z - zc) * (z - zc)));
  return [xa, y, z];
}

// ============================================================================================ Z08a : LE CITY-STADE
function* cityStade(ctx) {
  const { kit, groupe, K } = ctx, B9 = outilsB9(kit, ctx.Monde), O = B9.O, T = B9.T, D = donnees(ctx), b = ctx.budget, id = 'Z08a';
  const lot = new kit.Lot(id), sol = new kit.Lot(id + ' · sol'), C = CITY;
  // ---- 1. LE SOL SPORTIF beige sable (Commons 02 : #d9cfbc ; un cran plus sombre au sol, voir Z07) et ses lignes blanches
  const beige = B9.teinteSol('beton', '#bdb2a0', 701, 0.08);
  O.drape(sol, 'beton#sol', [[C.x0, C.z0], [C.x1, C.z0], [C.x1, C.z1], [C.x0, C.z1]], { dy: 0.025, pas: 1, couleur: (x, z) => beige(x, z) });
  if (b()) yield;
  // (un tracé de handball simplifié : le tour à 0,3 m du bord, la ligne médiane, le rond central, deux zones en D)
  const blanc = [1.05, 1.05, 1.02], ligne = (pts, ferme = false) => T.bande(sol, 'beton#sol', ferme ? [...pts, pts[0]] : pts, 0.06, { dy: 0.031, couleur: () => blanc, pas: 0.4, axe: true });
  const m = 0.3, cx = BUT.x, cz = (C.z0 + C.z1) / 2;
  ligne([[C.x0 + m, C.z0 + m], [C.x1 - m, C.z0 + m], [C.x1 - m, C.z1 - m], [C.x0 + m, C.z1 - m]], true);
  ligne([[C.x0 + m, cz], [C.x1 - m, cz]]);
  const rond = []; for (let k = 0; k <= 32; k++) { const a = (k / 32) * Math.PI * 2; rond.push([cx + Math.cos(a) * 1.8, cz + Math.sin(a) * 1.8]); }
  ligne(rond);
  for (const [z0, s] of [[C.z0 + m, 1], [C.z1 - m, -1]]) {
    const D6 = []; for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI; D6.push([cx + Math.cos(a) * 3.6, z0 + s * Math.sin(a) * 3.6]); }
    ligne(D6);
  }
  if (b()) yield;
  // ---- 2. L'ENCEINTE de 4 m : poteaux tubulaires tous les 2,5 m environ, lisses, barreaux ronds galvanisés tous les
  // 13 cm ; côté coteau, le bardage de panneaux nervurés sur 2,2 m ; aux bouts, la niche du but et le panier au-dessus
  const galva = O.p('#a9aeb0'), galvaS = O.p('#9ca1a3'), y0 = (x, z) => kit.sol(x, z);
  const cotes = [
    { a: [C.x0, C.z0], c: [C.x1, C.z0], but: true },     // bout nord
    { a: [C.x1, C.z0], c: [C.x1, C.z1], entree: true },  // côté allée
    { a: [C.x1, C.z1], c: [C.x0, C.z1], but: true },     // bout sud
    { a: [C.x0, C.z1], c: [C.x0, C.z0], bardage: true }, // côté coteau
  ];
  for (const s of cotes) {
    const [ax, az] = s.a, [bx, bz] = s.c, L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
    const P = (t, y) => [ax + ux * t, y0(ax + ux * t, az + uz * t) + y, az + uz * t];
    // les trous : le but (de -l/2 à +l/2 autour du milieu, sur 2 m), l'entrée
    const tBut = s.but ? [L / 2 - BUT.l / 2, L / 2 + BUT.l / 2] : null;
    const tEnt = s.entree ? [ENTREE.z0 - az, ENTREE.z1 - az] : null;
    const bas = (t) => (tBut && t > tBut[0] - 0.01 && t < tBut[1] + 0.01 ? BUT.h : tEnt && t > tEnt[0] - 0.01 && t < tEnt[1] + 0.01 ? ENTREE.h : s.bardage ? C.bardage : 0.06);
    // les poteaux
    const n = Math.max(2, Math.round(L / 2.5)), ts = [];
    for (let k = 0; k <= n; k++) ts.push((L * k) / n);
    if (tBut) ts.push(tBut[0], tBut[1]);
    if (tEnt) ts.push(tEnt[0], tEnt[1]);
    for (const t of ts) { const A = P(t, -0.1), B = P(t, C.h + 0.05); lot.tour('peinture', [[0.05, 0], [0.05, B[1] - A[1]], [0.035, B[1] - A[1] + 0.03]], 10, O.T(A[0], A[1], A[2]), { bande: true, couleur: galva }); }
    // les lisses (basse, haute, et à 2,2 m), coupées aux trous : des tubes (section octogonale) qui suivent le sol
    const lisse = (y, t0, t1) => {
      if (t1 - t0 < 0.05) return;
      const n = Math.max(1, Math.round((t1 - t0) / 2)), pts = [];
      for (let k = 0; k <= n; k++) pts.push(P(t0 + ((t1 - t0) * k) / n, y));
      lot.prisme('peinture', octo(0.03), pts, { bande: true, couleur: galvaS, lisse: true });
    };
    const plages = (y) => {
      const out = [[0, L]];
      for (const tr of [tBut, tEnt]) {
        if (!tr) continue;
        const h = tr === tBut ? BUT.h : ENTREE.h;
        if (y > h) continue;
        for (let i = out.length - 1; i >= 0; i--) { const [p0, p1] = out[i]; if (tr[1] <= p0 || tr[0] >= p1) continue; out.splice(i, 1, [p0, tr[0]], [tr[1], p1]); }
      }
      return out.filter(([p0, p1]) => p1 - p0 > 0.05);
    };
    for (const y of [0.12, 2.2, C.h - 0.05, ...(tBut ? [BUT.h + 0.05] : [])]) for (const [t0, t1] of plages(y)) lisse(y, t0, t1);
    // le linteau de l'entrée, d'un poteau à l'autre
    if (tEnt) lisse(ENTREE.h + 0.03, tEnt[0], tEnt[1]);
    if (b()) yield;
    // les barreaux
    const nb = Math.round(L / 0.13);
    for (let k = 1; k < nb; k++) {
      const t = (L * k) / nb, yb = bas(t);
      if (yb >= C.h) continue;
      lot.barre(P(t, yb), P(t, C.h - 0.05), 0.026, 0.026, { couleur: galva });
      if (k % 60 === 0 && b()) yield;
    }
    if (b()) yield;
    // le bardage : un panneau beige gris de 2,2 m, nervuré tous les 10 cm (côté coteau, dedans comme dehors)
    // (relecture à côté de Commons 02 : le bardage y est d'un beige gris clair, nervures nettes ; à #b4ad9d, à l'ombre
    // du coteau et dans la lumière du soir, il sortait kaki : un cran plus clair et plus chaud)
    // (relecture B9 : dans l'ombre du coteau, #c3b9a6 sortait encore olive, plus sombre que le sol du terrain ; sur la
    // photo, le bardage est d'un beige gris à peine plus sombre que le sol : encore un cran plus clair, moins jaune)
    if (s.bardage) {
      const bard = O.p('#ddd6c7'), nx = -uz, nz = ux;
      for (let t = 0; t < L - 0.01; t += 1.2) {
        const t1 = Math.min(L, t + 1.2), A = P(t, 0), B = P(t1, 0), yb = Math.min(A[1], B[1]) - 0.1;
        lot.boite('peinture', Math.hypot(B[0] - A[0], B[2] - A[2]) - 0.01, C.bardage + 0.1, 0.03, new THREE.Matrix4().makeBasis(new THREE.Vector3(ux, 0, uz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx, 0, nz)).setPosition((A[0] + B[0]) / 2, yb + (C.bardage + 0.1) / 2, (A[2] + B[2]) / 2), { bande: true, couleur: bard });
      }
      for (let t = 0.05; t < L; t += 0.1) for (const sgn of [-1, 1]) {
        const A = P(t, 0);
        lot.barre([A[0] + nx * 0.025 * sgn, A[1], A[2] + nz * 0.025 * sgn], [A[0] + nx * 0.025 * sgn, A[1] + C.bardage, A[2] + nz * 0.025 * sgn], 0.022, 0.022, { couleur: O.p('#cdc5b5') });
      }
      if (b()) yield;
    }
    // la niche du but (fond et côtés en barreaux serrés, 0,8 m dehors) et son cadre de tube argent à angles arrondis ;
    // au-dessus, le panier de basket (panneau blanc, cercle orange), sur une potence prise dans l'enceinte
    if (tBut) {
      const out = s.a[1] === C.z0 ? -1 : 1;      // (la niche sort du terrain : z- au nord, z+ au sud)
      const M = P(L / 2, 0), dz = out * BUT.niche, xg = M[0] - BUT.l / 2, xd = M[0] + BUT.l / 2, zf = M[2] + dz;
      for (let x = xg; x <= xd + 1e-6; x += 0.1) { const yb = kit.sol(x, zf); lot.barre([x, yb, zf], [x, yb + BUT.h, zf], 0.02, 0.02, { couleur: galvaS }); }
      for (const xs of [xg, xd]) for (let z = 0.1; z < BUT.niche; z += 0.1) { const zz = M[2] + out * z, yb = kit.sol(xs, zz); lot.barre([xs, yb, zz], [xs, yb + BUT.h, zz], 0.02, 0.02, { couleur: galvaS }); }
      lot.barre([xg, M[1] + BUT.h, zf], [xd, M[1] + BUT.h, zf], 0.04, 0.04, { couleur: galvaS });
      for (const xs of [xg, xd]) lot.barre([xs, M[1] + BUT.h, M[2]], [xs, M[1] + BUT.h, zf], 0.04, 0.04, { couleur: galvaS });
      if (b()) yield;
      // le cadre du but : deux montants et la barre, arrondis aux angles (tube de 8 cm, argent)
      const cadre = [[xg + 0.04, M[1] - 0.05], [xg + 0.04, M[1] + BUT.h - 0.18], [xg + 0.1, M[1] + BUT.h - 0.06], [xg + 0.22, M[1] + BUT.h], [xd - 0.22, M[1] + BUT.h], [xd - 0.1, M[1] + BUT.h - 0.06], [xd - 0.04, M[1] + BUT.h - 0.18], [xd - 0.04, M[1] - 0.05]]
        .map(([x, y]) => [x, y, M[2]]);
      lot.prisme('peinture', octo(0.04), cadre, { bande: true, couleur: O.p('#c9cdcf'), lisse: true });
      // le panier : potence, panneau de 1,2 x 0,9 m (bas à 2,9 m), cercle à 3,05 m, 0,4 m devant le panneau
      const zp = M[2] - out * 0.06, yP = M[1];
      lot.boite('peinture', 1.2, 0.9, 0.04, O.T(M[0], yP + 3.35, zp), { bande: true, couleur: O.p('#e6e6e1') });
      lot.boite('peinture', 0.5, 0.36, 0.045, O.T(M[0], yP + 3.15, zp - out * 0.002), { bande: true, couleur: O.p('#bf4a2c') });
      lot.boite('peinture', 0.42, 0.28, 0.05, O.T(M[0], yP + 3.15, zp - out * 0.004), { bande: true, couleur: O.p('#e6e6e1') });
      const cercle = []; for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 2; cercle.push([M[0] + Math.cos(a) * 0.23, yP + 3.05, zp - out * 0.4 + Math.sin(a) * 0.23]); }
      lot.prisme('peinture', octo(0.01), cercle, { bande: true, couleur: O.p('#c2532a') });
      lot.barre([M[0], yP + 3.05, zp - out * 0.05], [M[0], yP + 3.05, zp - out * 0.17], 0.04, 0.12, { couleur: O.p('#c2532a') });
      for (const sx of [-0.45, 0.45]) lot.barre([M[0] + sx, yP + 2.95, zp + out * 0.02], [M[0] + sx, yP + C.h - 0.05, zp + out * 0.02], 0.06, 0.06, { couleur: galva });
      // le filet du panier : un cône de brins
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; lot.barre([M[0] + Math.cos(a) * 0.22, yP + 3.04, zp - out * 0.4 + Math.sin(a) * 0.22], [M[0] + Math.cos(a + 0.5) * 0.14, yP + 2.62, zp - out * 0.4 + Math.sin(a + 0.5) * 0.14], 0.008, 0.008, { couleur: O.p('#e9e9e4') }); }
    }
    if (b()) yield;
  }
  // ---- 3. LA CHICANE de garde-corps (tube de 1,1 m), la plaque du règlement, la corbeille noire à lames
  {
    const gc = O.p('#b8bcbe'), pts = CHICANE.map(([x, z]) => [x, kit.sol(x, z) + 1.1, z]);
    lot.prisme('peinture', octo(0.024), pts, { bande: true, couleur: gc });
    for (const [x, z] of CHICANE) { const y = kit.sol(x, z); lot.barre([x, y - 0.1, z], [x, y + 1.1, z], 0.05, 0.05, { couleur: gc }); }
    lot.prisme('peinture', octo(0.02), CHICANE.map(([x, z]) => [x, kit.sol(x, z) + 0.5, z]), { bande: true, couleur: gc });
    // la plaque ronde blanche à liseré vert, sur son poteau, tournée vers l'allée
    const yp = kit.sol(PLAQUE.x, PLAQUE.z), Rp = O.repere(PLAQUE.x, yp, PLAQUE.z, 90);
    lot.barre([PLAQUE.x, yp - 0.1, PLAQUE.z], [PLAQUE.x, yp + 2.3, PLAQUE.z], 0.05, 0.05, { couleur: galva });
    lot.geo('peinture', new THREE.CylinderGeometry(0.32, 0.32, 0.012, 24).rotateX(Math.PI / 2), Rp(0, 2.0, 0.05), { bande: true, couleur: O.p('#4a8a4a') });
    lot.geo('peinture', new THREE.CylinderGeometry(0.29, 0.29, 0.016, 24).rotateX(Math.PI / 2), Rp(0, 2.0, 0.052), { bande: true, couleur: O.p('#eeeeea') });
    const yc = kit.sol(CORBEILLE.x, CORBEILLE.z), noir = O.p('#1c1e1f');
    lot.tour('peinture', [[0.18, 0], [0.18, 0.04], [0.04, 0.06], [0.04, 0.12]], 10, O.T(CORBEILLE.x, yc, CORBEILLE.z), { bande: true, couleur: noir });
    for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2; lot.barre([CORBEILLE.x + Math.cos(a) * 0.21, yc + 0.12, CORBEILLE.z + Math.sin(a) * 0.21], [CORBEILLE.x + Math.cos(a) * 0.23, yc + 0.82, CORBEILLE.z + Math.sin(a) * 0.23], 0.025, 0.006, { couleur: noir }); }
    lot.tour('peinture', [[0.23, 0.8], [0.245, 0.82], [0.245, 0.85], [0.21, 0.86]], 18, O.T(CORBEILLE.x, yc, CORBEILLE.z), { bande: true, couleur: noir });
  }
  if (b()) yield;
  // ---- 4. L'ALLÉE DE SABLE (de la sortie du grand arc, z ≈ 124,3, au bout sud), ses bordurettes ; les lampadaires
  const sable = B9.teinteSol('gravier', '#ab9f87', 703);
  const pierre = new Nappe(), liste = [{ trace: trace(D, 'allee_hemicycle'), largeur: LARGEURS.allee_hemicycle, boite: [-19.0, 124.3, -13.5, 150.0], dy: 0.024 }];
  yield* B9.allees(pierre, liste, BOITES.Z08a, sable, b);
  const mp = maillageSol(pierre.geometrie(), kit.materiau('gravier'), 'allée de sable');
  if (mp) groupe.add(O.horsContact(mp));
  yield* B9.bordurettes(lot, liste[0].trace, liste[0].largeur, (x, z) => z > 124.3 && z < 150, b);
  for (const [x, z] of LAMPES[id]) B9.lampe(lot, x, z);
  if (b()) yield;
  groupe.add(O.horsContact(sol.maillages('ZONE ' + id + ' · sol')));
  if (b()) yield;
  groupe.add(maillagesLot(lot, 'ZONE ' + id));
}

// ============================================================================================ Z08b : LES JEUX
function* jeux(ctx) {
  const { kit, groupe, K } = ctx, B9 = outilsB9(kit, ctx.Monde), O = B9.O, D = donnees(ctx), b = ctx.budget, id = 'Z08b';
  const lot = new kit.Lot(id), sol = new kit.Lot(id + ' · sol');
  // ---- 1. LES SOLS : les allées (allée est, diagonale, traverse), l'aire de sable orangé, les copeaux
  const st = B9.teinteSol('gravier', COULEURS.stabilise, 711);
  const pierre = new Nappe(), liste = [
    { trace: trace(D, 'jeux_allee_est'), largeur: LARGEURS.jeux_allee_est, dy: 0.023 },
    { trace: trace(D, 'jeux_diagonale'), largeur: LARGEURS.jeux_diagonale, dy: 0.025 },
    { trace: trace(D, 'jeux_traverse'), largeur: LARGEURS.jeux_traverse, dy: 0.027 },
  ];
  yield* B9.allees(pierre, liste, BOITES.Z08b, st, b);
  const mp = maillageSol(pierre.geometrie(), kit.materiau('gravier'), 'allées des jeux');
  if (mp) groupe.add(O.horsContact(mp));
  for (const a of liste) yield* B9.bordurettes(lot, a.trace, a.largeur, () => true, b);
  if (b()) yield;
  O.drape(sol, 'terreBattue#sol', SABLE, { dy: 0.03, pas: 1, couleur: O.taches(O.c('terreBattue', '#b48d68'), 713, 0.18) });
  O.drape(sol, 'terre#sol', COPEAUX, { dy: 0.03, pas: 1, couleur: O.taches(O.c('terre', '#6d5039'), 715, 0.22) });
  B9.bordContour(lot, SABLE);
  B9.bordContour(lot, COPEAUX);
  if (b()) yield;
  // ---- 2. LES CLÔTURES TUBULAIRES BLANC GRIS : poteaux carrés tous les 2 m, lisses haute et basse, barreaux tous les
  // 11 cm (R5.md Z08-C03 : « tubes carrés, barreaux » ; 1,2 m, et 2 m côté promenade)
  const blanc = O.p('#d8d9d4');
  for (const [ligne, h] of CLOTURES) {
    const pts = kit.reechantillonner(ligne, 2.0);
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i], y = kit.sol(q.x, q.z);
      lot.barre([q.x, y - 0.1, q.z], [q.x, y + h + 0.04, q.z], 0.06, 0.06, { couleur: blanc });
      if (i === pts.length - 1) break;
      const r = pts[i + 1], y2 = kit.sol(r.x, r.z), Lr = Math.hypot(r.x - q.x, r.z - q.z), n = Math.max(2, Math.round(Lr / 0.11));
      for (const hh of [0.08, h - 0.03]) lot.barre([q.x, y + hh, q.z], [r.x, y2 + hh, r.z], 0.04, 0.04, { couleur: blanc });
      for (let k = 1; k < n; k++) {
        const t = k / n, x = q.x + (r.x - q.x) * t, z = q.z + (r.z - q.z) * t, yb = y + (y2 - y) * t;
        lot.barre([x, yb + 0.08, z], [x, yb + h - 0.03, z], 0.018, 0.018, { couleur: blanc, bouts: false });
      }
    }
    if (b()) yield;
  }
  // ---- 3. L'ARCHE D'ENTRÉE (R5.md Z08-C03, C04 ; SYNTHESE.md, contre-visite : deux arcs parallèles de tube gris argent
  // reliés par des traverses, environ 5 m de portée et 3 m de haut), au débouché de la traverse sur l'allée est
  {
    const A = ARCHE, argent = O.p('#b7bbbd'), xs = [A.x - A.prof / 2, A.x + A.prof / 2], N = 18, y0 = kit.sol(A.x, (A.z0 + A.z1) / 2);
    for (const xa of xs) {
      const pts = [];
      pts.push([xa, kit.sol(xa, A.z0) - 0.1, A.z0]);
      for (let k = 0; k <= N; k++) { const p = pointArche(xa, k / N); pts.push([p[0], y0 + p[1], p[2]]); }
      pts.push([xa, kit.sol(xa, A.z1) - 0.1, A.z1]);
      lot.prisme('peinture', octo(0.045), pts, { bande: true, couleur: argent, lisse: true });
    }
    for (let k = 1; k < N; k++) {
      const p = pointArche(0, k / N);
      lot.barre([xs[0], y0 + p[1], p[2]], [xs[1], y0 + p[1], p[2]], 0.035, 0.035, { couleur: argent });
    }
    // les traverses des montants, et le petit panneau rond au sommet
    for (const hh of [0.5, 1.5]) for (const z of [A.z0, A.z1]) lot.barre([xs[0], kit.sol(A.x, z) + hh, z], [xs[1], kit.sol(A.x, z) + hh, z], 0.035, 0.035, { couleur: argent });
    const top = pointArche(A.x + A.prof / 2 + 0.03, 0.5);
    lot.tour('peinture', [[0.28, -0.008], [0.28, 0.008]], 20, new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(top[0] + 0.02, y0 + top[1] - 0.45, top[2]), { bande: true, couleur: O.p('#e3e2dc') });
  }
  if (b()) yield;
  // ---- 4. LA STRUCTURE DE JEUX EN BOIS (R5.md Z08-C02 : rondins et madriers bruns #7a5a3e, tours de 4 à 5 m, plates-formes,
  // toit en pavillon brun ; ortho : un carré brun à arêtes diagonales vers (-8 ; 141))
  yield* structureBois(ctx, B9, lot);
  // ---- 5. L'AIRE DE SABLE : deux jeux à ressort et une bascule
  for (const [x, z, coul] of RESSORTS) {
    const y = kit.sol(x, z), R = O.repere(x, y, z, kit.alea(x, z, 721) * 360), c = O.p(coul);
    lot.boite('peinture', 0.5, 0.06, 0.5, R(0, 0.03, 0), { bande: true, couleur: O.p('#5c5f61') });
    // le ressort : une hélice de fil épais
    const hel = []; for (let k = 0; k <= 40; k++) { const a = (k / 40) * Math.PI * 2 * 6; hel.push(R.pt(Math.cos(a) * 0.09, 0.06 + (0.36 * k) / 40, Math.sin(a) * 0.09)); }
    lot.prisme('peinture', octo(0.012), hel, { bande: true, couleur: O.p('#3b3d3f'), lisse: true });
    lot.boite('peinture', 0.32, 0.26, 0.7, R(0, 0.58, 0), { bande: true, couleur: c, chanfrein: 0.06 });
    lot.boite('peinture', 0.26, 0.3, 0.28, R(0, 0.82, 0.32), { bande: true, couleur: c, chanfrein: 0.06 });
    lot.barre(R.pt(-0.16, 0.86, 0.22), R.pt(0.16, 0.86, 0.22), 0.03, 0.03, { couleur: O.p('#e2c74a') });
  }
  {
    const { x, z } = BASCULE, y = kit.sol(x, z), R = O.repere(x, y, z, 90), bois = O.c('bois', '#7a5a3e'), jaune = O.p('#e2c74a');
    const incl = (m) => new THREE.Matrix4().makeRotationX(0.12).multiply(m);
    lot.boite('bois', 0.3, 0.4, 0.3, R(0, 0.2, 0), { couleur: bois, chanfrein: 0.02 });
    lot.boite('bois', 0.16, 0.06, 2.6, R(0, 0.46, 0, incl(new THREE.Matrix4())), { couleur: O.c('bois', '#8a6848'), chanfrein: 0.01 });
    // (relecture à l'écran : les poignées flottaient au-dessus de la planche ; chacune a son montant, posé sur la planche
    // inclinée — le dessus de la planche, à `w` m du pivot, est à 0,49 - 0,12 w — et un siège sombre au bout)
    for (const s of [-1, 1]) {
      const w = s * 0.8, yb = 0.49 - Math.sin(0.12) * w;
      lot.barre(R.pt(0, yb - 0.01, w), R.pt(0, yb + 0.32, w), 0.035, 0.035, { couleur: jaune });
      lot.barre(R.pt(-0.16, yb + 0.32, w), R.pt(0.16, yb + 0.32, w), 0.035, 0.035, { couleur: jaune });
      lot.boite('peinture', 0.24, 0.035, 0.32, R(0, 0.46, 0, incl(new THREE.Matrix4().makeTranslation(0, 0.045, s * 1.1))), { bande: true, couleur: O.p('#3b3d3f') });
    }
  }
  if (b()) yield;
  // ---- 6. LE MUR BAS EN PANNEAUX ANTHRACITE (0,9 m) au pied du rideau, et la canisse
  {
    const anth = O.p('#3a3d40'), anthH = O.p('#2f3234');
    for (let z = MUR.z0; z < MUR.z1 - 0.01; z += 2.0) {
      const z1 = Math.min(MUR.z1, z + 2.0), xa = xMur(z), xb = xMur(z1), ya = kit.sol(xa, z), yb = kit.sol(xb, z1), yBas = Math.min(ya, yb) - 0.1;
      const L = Math.hypot(xb - xa, z1 - z) - 0.02, cxm = (xa + xb) / 2, czm = (z + z1) / 2, a = Math.atan2(xb - xa, z1 - z);
      const M = new THREE.Matrix4().makeRotationY(a).setPosition(cxm, yBas + (MUR.h + 0.1) / 2 + (Math.max(ya, yb) - Math.min(ya, yb)) / 2, czm);
      lot.boite('peinture', MUR.ep, MUR.h + 0.1 + Math.abs(ya - yb), L, M, { bande: true, couleur: anth, chanfrein: 0.01 });
      lot.boite('peinture', MUR.ep + 0.04, 0.04, L, new THREE.Matrix4().makeRotationY(a).setPosition(cxm, Math.max(ya, yb) + MUR.h + 0.02, czm), { bande: true, couleur: anthH });
    }
    const roseau = O.c('bois', '#b59a6a');
    for (let z = CANISSE.z0; z < CANISSE.z1 - 0.01; z += 1.85) {
      const z1 = Math.min(CANISSE.z1, z + 1.85), xa = xMur(z) - CANISSE.recul, xb = xMur(z1) - CANISSE.recul, ya = kit.sol(xa, z);
      const M = new THREE.Matrix4().makeRotationY(Math.atan2(xb - xa, z1 - z)).setPosition((xa + xb) / 2, ya + 0.08 + CANISSE.h / 2, (z + z1) / 2);
      lot.boite('bois', 0.03, CANISSE.h, Math.hypot(xb - xa, z1 - z) - 0.01, M, { couleur: roseau });
      lot.barre([xa, ya - 0.1, z], [xa, ya + CANISSE.h + 0.12, z], 0.04, 0.04, { couleur: O.p('#4a4d4f') });
    }
  }
  if (b()) yield;
  // ---- 7. LE MOBILIER : lampadaires rouille, bancs noirs tournés vers les jeux ; quelques arbustes au pied des clôtures
  for (const [x, z] of LAMPES[id]) B9.lampe(lot, x, z);
  bancsNoirs(K, groupe, BANCS[id].map(([x, z, cap]) => ({ x, z, rot: (cap * Math.PI) / 180 })));
  const feu = new Touffes();
  for (const [x, z] of [[-13.75, 129.3], [-13.75, 133.9], [-13.75, 138.5], [-13.75, 143.6], [-11.2, 146.2], [-7.4, 146.3], [-4.6, 146.2]]) {
    arbuste(feu, { x, z, h: 0.8 + 0.4 * kit.alea(x, z, 731), R: 0.5 + 0.15 * kit.alea(z, x, 732), pal: kit.alea(x, z, 733) < 0.5 ? 'moyen' : 'eleagnus' });
  }
  const mf = maillageFeuillage(feu, K, 'arbustes des jeux', true);
  if (mf) groupe.add(mf);
  if (b()) yield;
  groupe.add(O.horsContact(sol.maillages('ZONE ' + id + ' · sol')));
  if (b()) yield;
  groupe.add(maillagesLot(lot, 'ZONE ' + id));
}

// La structure de jeux en bois : poteaux-rondins, planchers de madriers, garde-corps de planches, deux toits en pavillon,
// la passerelle entre les tours, le toboggan d'inox, la rampe à tasseaux, une échelle.
function* structureBois(ctx, B9, lot) {
  const { kit } = ctx, O = B9.O, b = ctx.budget;
  const brun = O.c('bois', '#7a5a3e'), brunF = O.c('bois', '#5e4430'), toit = O.c('bois', '#5a3f2c');
  const rondin = (x, z, y0, y1, r = 0.065) => lot.tour('bois', [[r, 0], [r, y1 - y0], [r * 0.7, y1 - y0 + 0.03]], 8, O.T(x, y0, z), { couleur: brun });
  const tour = (T) => {
    const y0 = kit.sol(T.x, T.z), d = T.c / 2;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) rondin(T.x + sx * d, T.z + sz * d, y0 - 0.2, y0 + T.faite - 1.35 - (T === TOUR ? 0.15 : 0));
    // le plancher et ses solives
    lot.boite('bois', T.c, 0.08, T.c, O.T(T.x, y0 + T.y, T.z), { couleur: brunF, chanfrein: 0.01 });
    for (let k = 0; k < Math.round(T.c / 0.15); k++) lot.boite('bois', 0.012, 0.004, T.c - 0.04, O.T(T.x - d + 0.075 + k * 0.15, y0 + T.y + 0.042, T.z), { couleur: O.c('bois', '#3e2f22') });
    // les garde-corps : deux lisses et des planches verticales, ouverts d'un côté (l'accès)
    const yL = y0 + T.y, cotes = [[[-d, -d], [d, -d]], [[d, -d], [d, d]], [[d, d], [-d, d]], [[-d, d], [-d, -d]]];
    cotes.forEach(([A, B], i) => {
      if ((T === TOUR && (i === 0 || i === 3)) || (T === PETITE && (i === 2 || i === 3))) return;
      const a = [T.x + A[0], T.z + A[1]], c = [T.x + B[0], T.z + B[1]];
      for (const hh of [0.35, 0.82]) lot.barre([a[0], yL + hh, a[1]], [c[0], yL + hh, c[1]], 0.07, 0.04, { cle: 'bois', couleur: brun });
      const n = Math.round(T.c / 0.14);
      for (let k = 1; k < n; k++) { const t = k / n, x = a[0] + (c[0] - a[0]) * t, z = a[1] + (c[1] - a[1]) * t; lot.barre([x, yL + 0.06, z], [x, yL + 0.86, z], 0.09, 0.025, { cle: 'bois', couleur: brun, haut: [0, 1, 0] }); }
    });
    // le toit en pavillon : quatre pans de planches brunes, débord de 0,3 m, épi
    const yT = y0 + T.faite - 1.4, e = d + 0.3, sommet = [T.x, y0 + T.faite, T.z];
    const C4 = [[T.x - e, yT, T.z - e], [T.x + e, yT, T.z - e], [T.x + e, yT, T.z + e], [T.x - e, yT, T.z + e]];
    for (let i = 0; i < 4; i++) {
      const A = C4[i], B = C4[(i + 1) % 4], n = new THREE.Vector3(...B).sub(new THREE.Vector3(...A)).cross(new THREE.Vector3(...sommet).sub(new THREE.Vector3(...A))).normalize();
      if (n.y < 0) n.negate();
      lot.polygone('bois', [A, B, sommet], n.toArray(), { couleur: toit });
      lot.polygone('bois', [A, sommet, B].map((p) => [p[0], p[1] - 0.04, p[2]]), [-n.x, -n.y, -n.z], { couleur: brunF });
    }
    lot.tour('bois', [[0.05, 0], [0.04, 0.25], [0.001, 0.3]], 8, O.T(T.x, y0 + T.faite - 0.02, T.z), { couleur: toit });
    return y0;
  };
  const yT = tour(TOUR), yP = tour(PETITE);
  if (b()) yield;
  // la passerelle : de la grande tour (côté est) à la petite (côté ouest), madriers et deux lisses de corde
  {
    const xa = TOUR.x + TOUR.c / 2, xb = PETITE.x - PETITE.c / 2, z = PETITE.z - 0.3, ya = yT + TOUR.y, yb = yP + PETITE.y, w = 0.65;
    for (let k = 0; k < 9; k++) {
      const t = (k + 0.5) / 9, x = xa + (xb - xa) * t, y = ya + (yb - ya) * t;
      lot.boite('bois', ((xb - xa) / 9) * 0.82, 0.05, w, O.T(x, y, z), { couleur: brunF, chanfrein: 0.008 });
    }
    for (const s of [-1, 1]) {
      lot.barre([xa, ya + 0.7, z + s * w / 2], [xb, yb + 0.7, z + s * w / 2], 0.025, 0.025, { cle: 'bois', couleur: O.c('bois', '#c9b38a') });
      for (const t of [0, 0.5, 1]) { const x = xa + (xb - xa) * t, y = ya + (yb - ya) * t; rondin(x, z + s * w / 2, y - 0.05, y + 0.72, 0.04); }
    }
  }
  // le toboggan d'inox : de la grande tour (côté nord) vers le nord, avec ses joues
  {
    const x = TOUR.x - 0.3, z0 = TOUR.z - TOUR.c / 2, y0 = yT + TOUR.y, z1 = z0 - 2.4, y1 = kit.sol(x, z1) + 0.28, inox = O.p('#c5c9cb');
    const pts = [[x, y0 + 0.02, z0 + 0.1], [x, y0 - 0.05, z0 - 0.35], [x, (y0 + y1) / 2, (z0 + z1) / 2], [x, y1 + 0.08, z1 + 0.35], [x, y1, z1]];
    lot.prisme('peinture', [[-0.28, 0.0], [0.28, 0.0], [0.3, 0.2], [0.26, 0.2], [0.24, 0.04], [-0.24, 0.04], [-0.26, 0.2], [-0.3, 0.2]], pts, { bande: true, couleur: inox });
    for (const dz of [0.6, 1.5]) { const zz = z0 - dz, yy = y0 - ((y0 - y1) * dz) / 2.4; rondin(x - 0.32, zz, kit.sol(x, zz) - 0.1, yy - 0.02, 0.045); rondin(x + 0.32, zz, kit.sol(x, zz) - 0.1, yy - 0.02, 0.045); }
  }
  // la rampe à tasseaux, par l'ouest de la grande tour ; l'échelle de la petite tour, au sud
  {
    const xa = TOUR.x - TOUR.c / 2, z = TOUR.z + 0.3, x0 = xa - 2.0, ya = yT + TOUR.y, y0 = kit.sol(x0, z);
    lot.boite('bois', Math.hypot(2.0, ya - y0), 0.05, 0.8, new THREE.Matrix4().makeRotationZ(Math.atan2(ya - y0, 2.0)).setPosition((xa + x0) / 2, (ya + y0) / 2, z), { couleur: brunF, chanfrein: 0.01 });
    for (let k = 1; k < 7; k++) { const t = k / 7, x = x0 + (xa - x0) * t, y = y0 + (ya - y0) * t + 0.04; lot.boite('bois', 0.06, 0.04, 0.72, O.T(x, y, z), { couleur: brun }); }
    const xe = PETITE.x, zs = PETITE.z + PETITE.c / 2, yb = yP + PETITE.y;
    for (const sx of [-0.25, 0.25]) lot.barre([xe + sx, kit.sol(xe, zs + 0.6), zs + 0.6], [xe + sx, yb + 0.8, zs + 0.02], 0.06, 0.06, { cle: 'bois', couleur: brun });
    const ys = kit.sol(xe, zs + 0.6);
    for (let k = 1; k < 5; k++) { const t = k / 5, y = ys + (yb - ys) * t, z = zs + 0.6 * (1 - t); lot.barre([xe - 0.25, y, z], [xe + 0.25, y, z], 0.04, 0.04, { cle: 'bois', couleur: brun }); }
  }
}

// Une section octogonale de tube, de rayon r (pour lot.prisme)
function octo(r) { const p = []; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; }

// ============================================================================================ la zone
export default {
  id: 'Z08', nom: 'City-stade, jeux sud-ouest, jardin sud',
  emprise: [[-34, 118], [4, 118], [4, 150], [-34, 150]],
  morceaux: [
    { id: 'Z08a', nom: 'city-stade et allée de sable', boite: BOITES.Z08a, construire: cityStade },
    { id: 'Z08b', nom: 'aire de jeux, arche, mur bas du quai', boite: BOITES.Z08b, construire: jeux },
  ],
  // PUR (sans three) : appelé à l'installation pour tous les joueurs.
  obstacles(o) {
    const C = CITY, G = { h: C.h, type: 'grille', camera: false };
    // L'ENCEINTE DU CITY-STADE : 4 m de barreaux (« grille » : la balle y rebondit et reste dedans), le bardage du côté
    // coteau (« dur » jusqu'à 2,2 m), l'entrée côté allée, les buts en niche (fond et côtés en « filet ») et l'enceinte
    // au-dessus d'eux, les panneaux de basket
    o.segment(C.x0, C.z0, C.x0, C.z1, { e: 0.12, h: C.bardage, type: 'dur' });
    o.segment(C.x0, C.z0, C.x0, C.z1, { e: 0.1, h: C.h, bas: C.bardage, type: 'grille', camera: false });
    o.segment(C.x1, C.z0, C.x1, C.z1, { e: 0.1, ...G, trous: [[ENTREE.z0 - C.z0, ENTREE.z1 - C.z0]] });
    o.segment(C.x1, ENTREE.z0, C.x1, ENTREE.z1, { e: 0.1, h: C.h, bas: ENTREE.h, type: 'grille', camera: false });
    for (const [z, out] of [[C.z0, -1], [C.z1, 1]]) {
      const xg = BUT.x - BUT.l / 2, xd = BUT.x + BUT.l / 2, zf = z + out * BUT.niche;
      o.segment(C.x0, z, C.x1, z, { e: 0.1, ...G, trous: [[xg - C.x0, xd - C.x0]] });
      o.segment(xg, z, xd, z, { e: 0.1, h: C.h, bas: BUT.h, type: 'grille', camera: false });
      o.segment(xg, zf, xd, zf, { e: 0.08, h: BUT.h, type: 'filet', camera: false });
      o.segment(xg, z, xg, zf, { e: 0.08, h: BUT.h, type: 'filet', camera: false });
      o.segment(xd, z, xd, zf, { e: 0.08, h: BUT.h, type: 'filet', camera: false });
      o.segment(BUT.x - 0.6, z - out * 0.06, BUT.x + 0.6, z - out * 0.06, { e: 0.06, h: 3.8, bas: 2.9, type: 'dur', qui: 'balle' });
    }
    // la chicane, la plaque, la corbeille
    for (let i = 0; i + 1 < CHICANE.length; i++) o.segment(CHICANE[i][0], CHICANE[i][1], CHICANE[i + 1][0], CHICANE[i + 1][1], { e: 0.06, h: 1.1, type: 'grille', camera: false });
    o.cercle(PLAQUE.x, PLAQUE.z, 0.08, { h: 2.5, type: 'poteau', camera: false });
    o.cercle(CORBEILLE.x, CORBEILLE.z, 0.25, { h: 0.86, type: 'dur' });
    // LES JEUX : les clôtures blanches, l'arche (ses quatre pieds), la structure en bois, les jeux de l'aire de sable
    for (const [ligne, h] of CLOTURES) for (let i = 0; i + 1 < ligne.length; i++) o.segment(ligne[i][0], ligne[i][1], ligne[i + 1][0], ligne[i + 1][1], { e: 0.07, h, type: 'cloture', camera: false });
    for (const x of [ARCHE.x - ARCHE.prof / 2, ARCHE.x + ARCHE.prof / 2]) for (const z of [ARCHE.z0, ARCHE.z1]) o.cercle(x, z, 0.06, { h: ARCHE.pied, type: 'poteau', camera: false });
    o.boite(TOUR.x, TOUR.z, TOUR.c / 2 + 0.1, TOUR.c / 2 + 0.1, 0, { h: TOUR.faite, type: 'dur' });
    o.boite(PETITE.x, PETITE.z, PETITE.c / 2 + 0.1, PETITE.c / 2 + 0.1, 0, { h: PETITE.faite, type: 'dur' });
    o.boite((TOUR.x + TOUR.c / 2 + PETITE.x - PETITE.c / 2) / 2, PETITE.z - 0.3, (PETITE.x - PETITE.c / 2 - TOUR.x - TOUR.c / 2) / 2, 0.35, 0, { h: 2.0, type: 'dur' });
    o.boite(TOUR.x - 0.3, TOUR.z - TOUR.c / 2 - 1.2, 0.35, 1.2, 0, { h: 1.5, type: 'dur' });
    o.boite(TOUR.x - TOUR.c / 2 - 1.0, TOUR.z + 0.3, 1.0, 0.42, 0, { h: 1.2, type: 'dur' });
    for (const [x, z] of RESSORTS) o.cercle(x, z, 0.4, { h: 0.95, type: 'dur' });
    o.boite(BASCULE.x, BASCULE.z, 1.35, 0.2, 0, { h: 0.8, type: 'dur' });
    // LE MUR BAS ANTHRACITE et la canisse
    for (let z = MUR.z0; z < MUR.z1 - 0.01; z += 6.0) { const z1 = Math.min(MUR.z1, z + 6.0); o.segment(xMur(z), z, xMur(z1), z1, { e: MUR.ep, h: MUR.h, type: 'dur' }); }
    o.segment(xMur(CANISSE.z0) - CANISSE.recul, CANISSE.z0, xMur(CANISSE.z1) - CANISSE.recul, CANISSE.z1, { e: 0.06, h: CANISSE.h + 0.1, type: 'haie' });
    // le mobilier
    for (const k of Object.keys(LAMPES)) for (const [x, z] of LAMPES[k]) o.cercle(x, z, 0.1, { h: 3.7, type: 'poteau', camera: false });
    for (const k of Object.keys(BANCS)) for (const [x, z, cap] of BANCS[k]) { const a = (cap * Math.PI) / 180; o.boite(x - Math.sin(a) * 0.05, z - Math.cos(a) * 0.05, 0.95, 0.3, -a, { h: 0.9, type: 'banc' }); }
  },
  bancs(b) {
    for (const k of Object.keys(BANCS)) for (const [x, z, cap] of BANCS[k]) b.push({ x, z, cap, y: 0.46, source: 'Z08 banc noir' });
  },
  lieux: [],
};
