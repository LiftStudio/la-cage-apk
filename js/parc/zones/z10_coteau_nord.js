// =====================================================================
//  ZONE Z10 — LE COTEAU BOISÉ NORD, LA RAMPE EST ET L'ALLÉE DU MUR (lot B5)
// =====================================================================
// Du dos du mur de meulière du plateau jusqu'à la crête (x -57 à -20,6 ; z -121 à +17 ; conception, § 1.3) : un
// sous-bois en pente de 30 à 35 % sous de grands arbres (ceux de arbres.bin, lot A5 : aucun n'est planté ici), et ce
// qu'on y parcourt.
//
// DERRIÈRE LE MUR (photos de Haythem du 28/09, 17 h 17 : 171705, 171706, 171709, 171717 ; tools/parc_becon_references.md
// § 11 à 13 ; conception § 8). Drapeau baissé, js/court_parc.js les dessine déjà (abordsMur) sur un talus inventé ; ici,
// drapeau levé, on refait LA MÊME CHOSE SUR LE VRAI RELIEF, avec les mêmes pièces (exportées par js/court_parc.js :
// l'asphalte rouge, les bancs, l'épicéa, les fleurs, les arbustes et leur feuillage) :
//  - L'ALLÉE DU MUR : asphalte rouge brique de 3,5 m, TOUT CONTRE la face arrière du mur (x -24,15 à -27,65), au niveau
//    du replat (+1,44 le long du plateau), qui file jusqu'au palier des escaliers de la façade Charras (z -48, +2,45).
//    Le gabarit de l'outil de données (tools/parc/gabarits.json, allee_mur) a été élargi à ces 3,5 m et teinté en rouge
//    pour ce lot : le sol du monde est plat en travers exactement là où l'allée est dessinée ;
//  - LA FOURCHE ET L'ÎLOT : là où la rampe est rejoint l'allée (z ≈ +3), une pointe arrondie bordée d'une PALISSADE de
//    rondins, la plate-bande de fleurs jaunes et violettes derrière elle, l'ÉPICÉA BLEU, trois BANCS NOIRS à lattes,
//    dos à l'îlot, face au mur ; une plaque d'égout, des herbes folles au pied du mur ;
//  - LA RAMPE EST, asphalte rouge de 3,5 m, qui monte dans le sous-bois jusqu'à l'allée haute ; bordures de béton ; le
//    TALUS D'ARBUSTES DENSES qui la borde côté coteau (lauriers, cognassier, éléagnus : 171709).
// Le dos du mur et le grillage posé sur son chaperon restent ceux de js/court_parc.js (murArriere).
//
// LE RESTE DU COTEAU : la rampe (jusqu'à l'allée haute), l'escalier de 34 marches (14 + 20, palier à +6,1, main
// courante des deux côtés, éclairé : OSM 121309599) qui descend de la rampe vers la façade Charras — l'escalier de 12
// marches qui le prolonge jusqu'à l'esplanade est à la zone Z02 —, le chemin x = -41 (asphalte gris, du palier nord des
// caves à la rampe), les candélabres (le pied et le palier de l'escalier, le carrefour du chemin), et le couvre-sol du
// sous-bois (lierre, feuilles).
//
// LES LIMITES AVEC LES VOISINES. Chaque allée est coupée net au bord de l'emprise de la zone qui la continue : la rampe
// est s'arrête à x = -23,7 (au-delà, côté pin, c'est le « chemin rouge de la rampe est » de Z04) et à x = -54,9 (le bord
// de l'allée haute, Z17). Ce qui est à cheval (l'emprise de Z04 mord sur celle de Z10 derrière le bout du mur) reste à
// Z04 : la masse d'arbustes du bout du mur, le biais vers le jardin.
//
// LE RELIEF est celui du monde (Monde.sol), pas celui d'abordsMur : la rampe, tenue à 11 % au plus pour le vélo (voir
// tools/parc/LISEZMOI.md § 9), arrive à la fourche à +3,1 et au coin du mur à +2,0, là où le terrain réel est à +1,9 et
// +1,4. L'îlot est donc un talus planté entre les deux allées, et le mur dépasse moins de l'allée au bout côté pin que
// sur la photo 171717.
import * as THREE from 'three';
import { Monde } from '../../monde.js';
import { epiceaBleu } from '../../court_parc.js';
import {
  alea, avecHasard, bord, projeter, surLigne, surAllee, dansBoite, rampesEnObstacles, sol, solVu, lin, Nappe, allee, plaque,
  maillageSol, bordures, materiauCoteau, fondreEtProteger, Touffes, maillageFeuillage, arbuste, couvreSol, herbes, bancsNoirs, candelabre,
} from './coteau.js';

// ============================================================================================ les données
// Les tracés, repère du terrain 1, tels que tools/parc/gabarits.json les donne à l'outil de données (le sol du monde
// y est donc tenu exactement : pente régulière, dévers nul). Les hauteurs, elles, viennent toujours de Monde.sol.
// La rampe est (OSM 121309615, retouchée par l'outil : voir la `source` du gabarit rampe_est), du haut vers le coin.
export const RAMPE_EST = [[-56.6, -63.1], [-53.6, -60.5], [-50.6, -48.7], [-47.3, -34.8], [-41.1, -19.4], [-30.4, 1.9], [-27.4, 6.6],
  [-25.0, 11.0], [-21.0, 13.8], [-18.1, 14.2], [-8.0, 14.4], [10.0, 14.7]];
const LR = 3.5;
// L'allée du mur (gabarit allee_mur : 3,5 m contre le dos du mur ; au sud, elle s'élargit sur le palier des escaliers)
const ALLEE_MUR = [[-27.6, -48.0], [-26.1, -42.5], [-25.9, -36.0], [-25.9, 6.2]];
const LA = 3.5, XD = -24.15, XO = XD - LA;        // le dos du mur, le bord côté îlot
// Le chemin x = -41 (OSM 121309611), du palier nord des caves à la rampe
const CHEMIN_X41 = [[-41.0, 20.8], [-40.6, 3.7], [-41.1, -19.4]];
// (relecture R2) Le bord de la rampe du côté du chemin : la droite parallèle à son tronçon (-41,1 ; -19,4) -> (-30,4 ;
// 1,9), à une demi-largeur de son axe, tournée vers le chemin ([ax, az, nx, nz], voir couperDroite). Le chemin rejoint la
// rampe en biais (une dizaine de degrés) et finit sur son axe : ses quatre derniers mètres étaient dessinés SOUS la
// rampe, deux rubans à 5 mm l'un de l'autre (dy 0,025 et 0,03), et le gris perçait le rouge par plaques, en scintillant,
// vers (-40 ; -15). Il s'arrête désormais net sur ce bord.
const BORD_RAMPE_X41 = (() => {
  const [a, b] = [RAMPE_EST[4], RAMPE_EST[5]], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l;
  return [a[0] + nx * LR / 2, a[1] + nz * LR / 2, nx, nz];
})();
// L'escalier de 34 marches (OSM 121309599, 14 + 20 marches, palier à +6,1) et son palier ; celui de 12 marches (Z02)
const ESCALIERS = [
  { de: [-48.9, -48.6, 8.9], a: [-42.5, -48.2, 6.15], largeur: 1.8, marches: 14 },
  { de: [-38.5, -47.9, 6.05], a: [-28.5, -47.1, 2.45], largeur: 1.8, marches: 20 },
];
const PALIER34 = [-42.5, -49.1, -38.5, -47.2];
const ESC12 = { de: [-27.0, -46.8], a: [-22.2, -43.8] };
// Les allées voisines, pour que le sous-bois ne pousse pas dessus (l'allée haute, Z17 ; l'escalier de 12 marches, Z02)
const ALLEE_HAUTE = [[-57.7, 12.5], [-57.3, -5.2], [-56.6, -63.1], [-56.9, -70.9]];
// L'aire de jeux au bord du coteau (Z14 : x -56 à -45, z -88 à -64) : rien d'ici n'y pousse
const JEUX_NE = [-56.5, -88.5, -44.5, -63.5];

// Toutes les allées, avec leur demi-largeur (le sous-bois et les arbustes s'en écartent)
const ALLEES = [
  { trace: RAMPE_EST, demi: LR / 2 }, { trace: ALLEE_MUR, demi: LA / 2 }, { trace: CHEMIN_X41, demi: 1.25 },
  { trace: ALLEE_HAUTE, demi: 1.75 },
  ...ESCALIERS.map((e) => ({ trace: [e.de, e.a], demi: e.largeur / 2 + 0.25 })),
  { trace: [[PALIER34[0], (PALIER34[1] + PALIER34[3]) / 2], [PALIER34[2], (PALIER34[1] + PALIER34[3]) / 2]], demi: 1.2 },
  { trace: [ESC12.de, ESC12.a], demi: 1.15 },
];
// Ce qui n'est pas au coteau : le plateau et le mur (x > -24,3 le long du plateau), l'esplanade Charras, Z04 derrière
// le bout du mur, l'aire de jeux du haut.
function horsCoteau(x, z) {
  if (x > -24.3 && z < 10.6) return true;
  if (x > -23.7) return true;
  if (x > -27.5 && z < -44) return true;
  return dansBoite(JEUX_NE, x, z);
}

// Les morceaux (monde.json > morceaux : boîtes de 48 m au plus). Z10c va jusqu'à z = +21 : le chemin x = -41 monte au
// palier nord des caves (+20,8). (Relecture : la limite entre Z10b et Z10c passe de z -29 à -27, sans quoi Z10c
// faisait 50 m de côté, plus que les 48 m de la conception, § 3.3 et D9.)
const BOITES = { Z10a: [-57, -121, -20.6, -75], Z10b: [-57, -75, -20.6, -27], Z10c: [-57, -27, -20.6, 21] };

// ============================================================================================ la fourche (pur)
// L'ÎLOT, sa pointe arrondie : la palissade longe l'allée du mur (x = XO - 0,07) depuis `zAllee`, fait la pointe (arc de
// 70 cm tangent aux deux bords, 171709 : un bout bien rond) et redescend le long de la rampe sur 3,5 m. Même dessin que
// contourIlot de js/court_parc.js, sur la rampe du monde (dont l'abscisse, ici, croît VERS le coin : elle part du haut).
function contourIlot() {
  const r = 0.7, xA = XO - 0.07, qB = LR / 2 + 0.07;
  const E = bord(RAMPE_EST, qB, -1, 0.05);
  let T0 = null;
  for (let i = 1; i < E.length && !T0; i++) {
    const a = E[i - 1], b = E[i];
    if (a.x < xA && b.x >= xA && b.z > -10 && b.z < 10) {
      const t = (xA - a.x) / (b.x - a.x);
      T0 = { x: xA, z: a.z + t * (b.z - a.z), s: a.s + t * (b.s - a.s) };
    }
  }
  const d = surLigne(RAMPE_EST, T0.s);
  // les deux bords, en s'éloignant de la pointe : l'allée vers z-, la rampe vers son bas (abscisse décroissante)
  const bx = 0 - d.tx, bz = -1 - d.tz, lb = Math.hypot(bx, bz), b = [bx / lb, bz / lb];
  const dC = r / Math.max(0.05, Math.abs(b[0]));
  const C = [xA + b[0] * dC, T0.z + b[1] * dC];
  const nL = [d.tz, -d.tx];                                   // la normale de la rampe côté îlot (à gauche)
  const tA = [xA, C[1]], tR = [C[0] - nL[0] * r, C[1] - nL[1] * r];
  const a0 = Math.atan2(tA[1] - C[1], tA[0] - C[0]), a1 = Math.atan2(tR[1] - C[1], tR[0] - C[0]);
  let da = a1 - a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  // (l'arc passe par l'avant de la pointe, à l'opposé de la bissectrice)
  if (Math.cos(a0 + da / 2) * -b[0] + Math.sin(a0 + da / 2) * -b[1] < 0) da = da > 0 ? da - 2 * Math.PI : da + 2 * Math.PI;
  const zAllee = C[1] - 1.8, pts = [[xA, zAllee], tA];
  for (let i = 1; i < 8; i++) { const a = a0 + (da * i) / 8; pts.push([C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r]); }
  pts.push(tR);
  // puis le long de la rampe, vers son bas, 3,5 m
  const sR = projeter(RAMPE_EST, tR[0], tR[1]).s;
  const cote = E.filter((e) => e.s < sR - 0.4 && e.s > sR - 3.55).sort((p, q) => q.s - p.s).filter((e, i) => i % 10 === 0);
  for (const e of cote) pts.push([e.x, e.z]);
  return { pts, zAllee, C, r, T0, sR };
}
// Un point est-il dans la pointe de l'îlot, à `m` m au moins de sa palissade ?
function dansIlot(x, z, m) {
  if (x > ILOT.pts[0][0] - m) return false;
  const p = projeter(RAMPE_EST, x, z);
  if (p.cote !== -1 || p.d < LR / 2 + 0.07 + m) return false;
  return z < ILOT.C[1] || Math.hypot(x - ILOT.C[0], z - ILOT.C[1]) < ILOT.r - m;
}
// La plate-bande : la pointe de l'îlot, jusqu'à quatre mètres derrière elle (au-delà, sa pelouse, l'épicéa, ses arbres)
const dansPlateBande = (x, z, m) => z > -4.2 && dansIlot(x, z, m);
// Les bancs noirs, dos à l'îlot (171709 : trois à la file après la plate-bande ; 171706)
function bancsDeLIlot() {
  const L = [];
  for (let z = ILOT.zAllee - 1.05; z > -8.3; z -= 2.1) L.push({ x: -27.28, z, rot: Math.PI / 2 });
  CORBEILLE = { x: -27.33, z: L[L.length - 1].z - 1.35 };
  return L;
}
let CORBEILLE = null;
// L'épicéa bleu derrière la plate-bande (171709), et deux arbustes au dos de l'îlot (abordsMur, fondMur)
const EPICEA = { x: -29.6, z: -5.0 };

// ============================================================================================ les arbustes (pur)
// Le TALUS D'ARBUSTES qui borde la rampe côté coteau (171709, à gauche : des masses de 3 à 4 m qui descendent jusqu'à la
// bordure), une rangée plus basse le long de la rampe dès qu'elle monte, et le sous-étage clairsemé du coteau. Mêmes
// règles que fondMur (js/court_parc.js), sur la rampe du monde. `a` : { x, z, h, R, pal }.
function arbustes() {
  const L = [], R = RAMPE_EST;
  const sCoin = projeter(R, -25.0, 11.0).s, sF = ILOT.sR, sBois = projeter(R, -36.0, -9.0).s;
  // `a.m` : l'écart minimal (m) entre le centre et le bord d'une allée. Par défaut, l'arbuste entier reste hors de
  // l'allée (0,75 R + 0,25) ; ceux du talus et de la rangée basse ont a.m = 0,55 R + 0,05 : leur disque d'obstacle
  // (0,55 R) reste hors de l'allée, leur feuillage déborde au-dessus de la bordure (171709). (Relecture : avec l'écart
  // par défaut, le talus et la rangée basse, posés à 0,8 m du bord, étaient presque tous refusés — un talus de pelouse
  // nue à gauche de la rampe, là où la photo montre une masse d'arbustes continue.)
  const poser = (a) => {
    if (horsCoteau(a.x, a.z) || surAllee(ALLEES, a.x, a.z, a.m ?? a.R * 0.75 + 0.25) || dansPlateBande(a.x, a.z, -0.3)) return;
    for (const b of L) if (Math.hypot(b.x - a.x, b.z - a.z) < (a.R + b.R) * 0.55) return;
    L.push(a);
  };
  const aDroite = (s, e) => { const p = surLigne(R, s); return [p.x - p.tz * e, p.z + p.tx * e]; };   // côté coteau
  const aGauche = (s, e) => { const p = surLigne(R, s); return [p.x + p.tz * e, p.z - p.tx * e]; };   // côté îlot
  const essence = (t) => (t < 0.5 ? 'sombre' : t < 0.72 ? 'cognassier' : t < 0.86 ? 'laurier' : 'eleagnus');
  // 1. le talus dense, du coin du mur jusqu'à l'entrée dans le bois : une masse continue de 3 à 5 m (cognassier aux
  // fruits jaunes, éléagnus gris-vert, lauriers : 171709) qui descend jusqu'à la bordure ; au coin, une pelouse devant
  // elle (la plaque d'égout de 171709, en bas à gauche), 2,4 m au bout du mur, qui se resserre à rien six mètres après
  // la pointe de l'îlot ; derrière la première rangée, une seconde, plus haute (le talus a cinq à six mètres d'épaisseur)
  const sP = sF - 6;
  for (let s = sCoin + 1.0, k = 0; s > sBois; s -= 1.25 + 0.5 * alea(s, k, 301), k++) {
    const R1 = 1.35 + 0.5 * alea(s, 5, 306), pelouse = 2.4 * Math.min(1, Math.max(0, (s - sP) / (sCoin - sP)));
    const e = LR / 2 + 0.7 * R1 + 0.1 + pelouse + 0.3 * alea(s, 2, 303);
    const [x, z] = aDroite(s, e);
    poser({ x, z, h: 3.0 + 1.4 * alea(s, 4, 305), R: R1, pal: essence(alea(s, 3, 304)), m: 0.55 * R1 + 0.05 });
    const R2 = 1.6 + 0.6 * alea(s, 7, 307), [x2, z2] = aDroite(s + 0.6, e + 0.9 * (R1 + R2) + 0.3 * alea(s, 8, 308));
    poser({ x: x2, z: z2, h: 3.8 + 1.4 * alea(s, 9, 309), R: R2, pal: essence(alea(s, 10, 310)) });
  }
  // 2. la rangée basse au ras de la bordure, dès que la rampe monte (côté îlot, seulement au-delà de sa pointe)
  for (let s = sF - 5, k = 0; s > sBois - 6; s -= 1.1 + 0.5 * alea(s, k, 311), k++) {
    for (const cote of [1, -1]) {
      const Rb = 0.8 + 0.3 * alea(s, cote, 314), e = LR / 2 + 0.6 * Rb + 0.1 + 0.3 * alea(s, cote, 312);
      const [x, z] = cote > 0 ? aDroite(s, e) : aGauche(s, e);
      // (côté îlot, une touffe sur trois : c'est de là qu'on voit le plateau à travers les troncs, PV04)
      if (cote < 0 && (z > -4.5 || alea(s, k, 316) > 0.36)) continue;
      poser({ x, z, h: 1.4 + 0.8 * alea(s, cote, 313), R: Rb, pal: alea(s, cote, 315) < 0.6 ? 'sombre' : 'moyen', m: 0.55 * Rb + 0.05 });
    }
  }
  // 3. au dos de l'îlot, derrière l'épicéa (abordsMur : deux arbustes isolés)
  poser({ x: -30.25, z: -5.2, h: 1.6, R: 0.9, pal: 'sombre' });
  poser({ x: -31.15, z: -7.4, h: 2.2, R: 1.2, pal: 'moyen' });
  // 4. le long de la rampe, plus haut dans le bois : un arbuste tous les 3 à 6 m, de part et d'autre
  for (let s = sBois - 6, k = 0; s > 4; s -= 3 + 3 * alea(s, k, 321), k++) {
    const cote = alea(s, k, 322) < 0.5 ? 1 : -1, e = LR / 2 + 0.7 + 1.8 * alea(s, k, 323);
    const [x, z] = cote > 0 ? aDroite(s, e) : aGauche(s, e);
    poser({ x, z, h: 1.3 + 1.4 * alea(s, k, 324), R: 0.7 + 0.6 * alea(s, k, 325), pal: ['sombre', 'moyen', 'laurier'][Math.floor(alea(s, k, 326) * 3)] });
  }
  // 5. le sous-étage clairsemé du coteau : une maille de 6 m, un arbuste sur trois environ
  for (let z = -118; z < 16; z += 6) for (let x = -55; x < -24; x += 6) {
    const jx = x + (alea(x, z, 331) - 0.5) * 4, jz = z + (alea(z, x, 332) - 0.5) * 4;
    if (alea(jx, jz, 333) > 0.36) continue;
    poser({ x: jx, z: jz, h: 1.2 + 1.8 * alea(jx, jz, 334), R: 0.7 + 0.8 * alea(jx, jz, 335), pal: ['sombre', 'moyen', 'laurier', 'sombre'][Math.floor(alea(jx, jz, 336) * 4)] });
  }
  return L;
}

// ============================================================================================ les candélabres (pur)
// L'escalier de 34 marches est éclairé (OSM : lit=yes) : un candélabre de fonte à crosse en haut, au palier et en bas,
// du côté de l'esplanade ; et un au carrefour du chemin x = -41 avec la rampe. (Les rampes elles-mêmes ne le sont pas :
// OSM lit=no.)
function candelabres() {
  const L = [];
  const cote = (e, t, d) => {
    const [x0, z0] = e.de, [x1, z1] = e.a, l = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / l, uz = (z1 - z0) / l;
    let nx = -uz, nz = ux; if (nz > 0) { nx = -nx; nz = -nz; }            // la normale vers z- (côté Charras)
    const px = x0 + ux * l * t, pz = z0 + uz * l * t;
    return { x: px + nx * d, z: pz + nz * d, vers: [px, pz] };
  };
  L.push(cote(ESCALIERS[0], 0.05, ESCALIERS[0].largeur / 2 + 0.55));
  L.push({ x: -40.5, z: PALIER34[1] - 0.35, vers: [-40.5, -48.2] });
  L.push(cote(ESCALIERS[1], 0.93, ESCALIERS[1].largeur / 2 + 0.55));
  // au carrefour du chemin x = -41 : sur le bord aval de la rampe, quatre mètres et demi en amont du débouché du chemin
  const s = projeter(RAMPE_EST, -41.1, -19.4).s, p = surLigne(RAMPE_EST, s - 4.5), e = LR / 2 + 0.5;
  L.push({ x: p.x + p.tz * e, z: p.z - p.tx * e, vers: [p.x, p.z] });
  return L;
}

// Tout ce qui précède est calculé UNE fois, à la première demande (obstacles, bancs ou premier morceau) : drapeau
// baissé, ou sur un autre terrain, la zone ne calcule rien.
let ILOT = null, BANCS = null, ARBUSTES = null, CANDELABRES = null;
function preparer() {
  if (ILOT) return;
  ILOT = contourIlot(); BANCS = bancsDeLIlot(); ARBUSTES = arbustes(); CANDELABRES = candelabres();
}

// ============================================================================================ le dessin
const dansMorceau = (b) => (x, z) => dansBoite(b, x, z);

// Les allées d'un morceau : la rampe (rouge), l'allée du mur (rouge), le chemin x = -41 (gris) ; leurs bordures.
function* allees(ctx, id, noter = () => {}) {
  const { kit, K, groupe } = ctx, B = BOITES[id], budget = ctx.budget || (() => false);
  const rouge = new Nappe(), gris = new Nappe();
  // la rampe, coupée au bord de l'allée haute et au bord de Z04
  allee({ trace: RAMPE_EST, largeur: LR, boite: [Math.max(B[0], -54.9), B[1], Math.min(B[2], -23.7), B[3]], dy: 0.03 }, rouge);
  noter('rampe');
  yield;
  // l'allée du mur, jusqu'à la fourche (z ≈ +3) : au-delà, c'est la rampe qui la recouvre, et la PLAQUE de la fourche
  // (le triangle entre le mur, le bord de l'îlot et le bord de la rampe) raccorde les deux
  // (relecture : coupée aussi à x = -28,45, au pied de la seconde volée de l'escalier de 34 marches, qui arrive sur son
  // bout sud — le ruban, drapé sur le plan incliné des données, recouvrait d'un triangle rouge ses deux dernières
  // marches)
  // (relecture : le ruban s'arrête désormais à zS, un demi-mètre avant la pointe de l'îlot, et la plaque de la fourche
  // part de là. Coupé à zCoupe, là où le sol monte déjà vers la rampe, le ruban — dont chaque sommet reste au moins à la
  // hauteur de son axe, dévers nul — et la plaque — posée sur le sol — ne se rejoignaient pas : 2 à 8 cm d'écart, une
  // fente où l'on voyait le sol du monde, deux traits noirs en travers de la fourche. À zS, le replat est plat en
  // travers de l'allée (+1,44) : ruban et plaque s'y rejoignent exactement.)
  const zCoupe = zFourche(), zS = Math.min(zCoupe, ILOT.C[1] - 0.5);
  // (relecture du lot B4 : au sud, le ruban recouvrait la moitié haute de l'escalier de 12 marches — une nappe rouge à la
  // hauteur de son axe, d'où ne dépassait plus qu'un nez de marche. Il est désormais en deux morceaux : du côté z+ du
  // RETOUR du mur de meulière (sa face côté allée : js/parc/zones/z02_esplanade_charras.js, MUR), qui borde la volée ;
  // et, de l'autre côté, seulement au-delà de la dernière marche (HAUT12, la ligne du haut de la volée telle que Z02 la
  // dessine) : le palier où arrivent les deux volées reste rouge.)
  const RETOUR = [-24.04, -43.37, -0.53, 0.848], HAUT12 = [-26.8, -46.67, -0.848, -0.53];
  const boiteMur = [Math.max(B[0], ESCALIERS[1].a[0] + 0.05), B[1], B[2], Math.min(B[3], zS)];
  // (relecture du lot C6 : la main rendue entre deux pièces de ce pas — d'une traite, 21 ms, la plus longue tranche du
  // tour à vélo)
  allee({ trace: ALLEE_MUR, largeur: LA, boite: boiteMur, dy: 0.025, couper: [RETOUR] }, rouge);
  if (budget()) yield;
  allee({ trace: ALLEE_MUR, largeur: LA, boite: boiteMur, dy: 0.025, couper: [RETOUR.map((v, i) => (i > 1 ? -v : v)), HAUT12] }, rouge);
  if (budget()) yield;
  if (dansBoite(B, -25, zCoupe + 0.5)) {
    const Eg = bord(RAMPE_EST, LR / 2, -1, 0.25).filter((p) => p.x >= XO && p.x <= XD && p.z > zCoupe - 0.01 && p.z < 12);
    const poly = [[XD, zS], [XO, zS], [XO, zCoupe], ...Eg.map((p) => [p.x, p.z]), [XD, Eg.length ? Eg[Eg.length - 1].z : zCoupe + 6]];
    // (mêmes UV que l'allée : u en travers depuis le mur, v le long d'elle ; un sommet tous les 25 cm : c'est le talus de
    // l'accotement de la rampe, qui descend d'un mètre sur un mètre et demi, et un maillage plus lâche que le sol le
    // laissait percer)
    const uvAllee = (x, z) => [XD - x, z + 48.204, (XD - x) / (LA / 2) - 1];
    // Sur les bords qu'elle partage avec un ruban, la plaque prend la hauteur de celui-ci : l'axe de la rampe sur le bord
    // de la rampe (le sol y descend déjà vers l'accotement), l'axe de l'allée du mur sur sa coupe (z = zS).
    const plancherFourche = (x, z) => {
      let y = -1e9;
      const p = projeter(RAMPE_EST, x, z);
      if (p.d <= LR / 2 + 0.03) { const q = surLigne(RAMPE_EST, p.s); y = sol(q.x, q.z); }
      if (Math.abs(z - zS) < 0.02) y = Math.max(y, sol(-25.9, zS));
      return y;
    };
    plaque(poly, { dy: 0.03, pas: 0.25, uv: uvAllee, plancher: plancherFourche }, rouge);
    if (budget()) yield;
    // L'ÉPERON : entre l'arrondi de la pointe de l'îlot et le bord de la rampe, de l'enrobé jusqu'aux rondins (171709 ;
    // abordsMur fait de même) — sans lui, un triangle de talus nu restait entre les deux allées, devant la palissade
    const P = ILOT.pts, tR = P[9], sR = projeter(RAMPE_EST, tR[0], tR[1]).s, sC = projeter(RAMPE_EST, XO, zCoupe).s;
    const Er = bord(RAMPE_EST, LR / 2, -1, 0.2).filter((p) => p.s > sR && p.s < sC).sort((u, v) => v.s - u.s);
    const eperon = [[XO, ILOT.C[1]], [XO, zCoupe], ...Er.map((p) => [p.x, p.z]), tR, ...P.slice(2, 9).reverse(), P[1]];
    plaque(eperon, { dy: 0.03, pas: 0.25, uv: uvAllee, plancher: plancherFourche }, rouge);
    if (budget()) yield;
  }
  if (dansBoite([B[0], B[1], B[2], B[3]], -41, 0)) allee({ trace: CHEMIN_X41, largeur: 2.5, boite: B, tuile: 4.04, dy: 0.025, couper: [BORD_RAMPE_X41] }, gris);
  if (budget()) yield;
  const mr = maillageSol(rouge.geometrie(), materiauCoteau('rouge', K), 'asphalte rouge');
  if (mr) groupe.add(mr);
  if (budget()) yield;
  const mg = maillageSol(gris.geometrie(), kit.materiau('asphalte'), 'asphalte');
  if (mg) groupe.add(mg);
  noter('rubans');
  yield;
  // LES BORDURES. Rampe : des deux côtés, sauf aux raccords (lus dans les données), sauf le long de la palissade de
  // l'îlot. Allée du mur : côté îlot seulement (de l'autre côté, c'est le mur), à partir du bout de la palissade.
  const ici = dansMorceau(B), palissade = ILOT.pts;
  const loinPalissade = (x, z) => projeter(palissade, x, z).d > 0.3;
  const autres = (moi) => ALLEES.filter((a) => a.trace !== moi);
  const garder = (moi) => (x, z) => ici(x, z) && !horsCoteau(x, z) && loinPalissade(x, z) && !surAllee(autres(moi), x, z, 0.05);
  yield* bordures(kit, groupe, RAMPE_EST, LR, 1, garder(RAMPE_EST), { budget });
  noter('bordure 1');
  yield;
  yield* bordures(kit, groupe, RAMPE_EST, LR, -1, garder(RAMPE_EST), { budget });
  yield* bordures(kit, groupe, ALLEE_MUR, LA, 1, (x, z) => garder(ALLEE_MUR)(x, z) && z < ILOT.zAllee - 0.1, { budget });
  yield* bordures(kit, groupe, CHEMIN_X41, 2.5, 1, garder(CHEMIN_X41), { budget });
  yield* bordures(kit, groupe, CHEMIN_X41, 2.5, -1, garder(CHEMIN_X41), { budget });
  noter('bordures');
}
// z où le bord de la rampe (côté îlot) coupe le bord de l'allée du mur côté îlot : l'allée y est coupée
let _zF = null;
function zFourche() {
  if (_zF !== null) return _zF;
  const E = bord(RAMPE_EST, LR / 2, -1, 0.05);
  _zF = 3;
  for (let i = 1; i < E.length; i++) if (E[i - 1].x < XO && E[i].x >= XO && E[i].z > -10 && E[i].z < 10) { const t = (XO - E[i - 1].x) / (E[i].x - E[i - 1].x); _zF = E[i - 1].z + t * (E[i].z - E[i - 1].z); break; }
  return _zF;
}

// L'îlot : palissade de rondins, plate-bande, épicéa, bancs, plaque d'égout, herbes folles du pied du mur.
function* ilot(ctx, feu) {
  const { kit, K, groupe } = ctx, mobile = ctx.mobile;
  // LA PALISSADE : des rondins de 12 cm, jointifs, de 42 à 55 cm hors sol, gris-brun délavés (bois du kit, teinté). Le
  // talus de l'îlot monte derrière eux (la rampe est tenue plus haut que le terrain réel, voir l'en-tête) : ils le
  // retiennent sur leur hauteur, pas plus — à 60 cm au-dessus de l'allée, comme sur 171709, la pente de gazon et de
  // fleurs continue au-dessus d'eux
  const lot = new kit.Lot('palissade'), cyl = new THREE.CylinderGeometry(0.058, 0.062, 1, 7, 1, false).translate(0, 0.5, 0);
  const m4 = new THREE.Matrix4(), T = new THREE.Matrix4(), S = new THREE.Matrix4(), pasR = mobile ? 0.2 : 0.13, P = ILOT.pts, C = ILOT.C;
  let reste = 0;
  for (let i = 0; i + 1 < P.length; i++) {
    const [xa, za] = P[i], [xb, zb] = P[i + 1], L = Math.hypot(xb - xa, zb - za);
    for (let u = reste; u < L; u += pasR) {
      const x = xa + ((xb - xa) * u) / L, z = za + ((zb - za) * u) / L;
      const ix = C[0] - x, iz = C[1] - 1.5 - z, li = Math.hypot(ix, iz) || 1;
      const yE = sol(x, z), yI = sol(x + (ix / li) * 0.25, z + (iz / li) * 0.25);
      const pied = Math.min(yE, yI) - 0.08;
      const haut = Math.min(yE + 0.62, Math.max(yE + 0.42 + 0.13 * alea(x, z, 401), yI + 0.1 + 0.1 * alea(z, x, 402)));
      const pen = (alea(x, z, 403) - 0.5) * 0.04, v = 0.86 + 0.18 * alea(x, z, 404);
      m4.makeRotationZ(pen).premultiply(T.makeTranslation(x, pied, z)).multiply(S.makeScale(1, haut - pied, 1));
      // (gris-brun délavé, #857766 : le rondin de abordsMur)
      lot.geo('bois', cyl, m4, { couleur: [0.46 * v, 0.38 * v, 0.3 * v] });
    }
    reste = reste + Math.ceil((L - reste) / pasR) * pasR - L;
  }
  groupe.add(lot.maillages('palissade'));
  yield;
  // LA PLATE-BANDE derrière la palissade (171709, 171706 : un massif serré de petites fleurs qui déborde des rondins) :
  // surtout du JAUNE D'OR, des VIOLETTES (sauges en épis, asters), quelques touffes roses et une blanche çà et là.
  // (Relecture : les touffes étaient les fleurs jaunes de js/court_parc.js (fleursTexture), « violettes » par leurs
  // couleurs de sommet — mais un jaune multiplié par un violet donne un brun orangé : le massif sortait roux, sans une
  // fleur violette. On prend l'atlas des vivaces du kit (fleurs_vivaces, tools/parc/textures_kit.py : douze touffes de
  // profil, quatre vues de dessus), dont on choisit les cases : un matériau du kit, partagé.) Chaque touffe : deux cartes
  // de profil croisées, basses, et un COUSSIN — une vue de dessus DRAPÉE sur le sol, chaque coin à sa hauteur — qui fait
  // le tapis serré de la photo ; posé à plat au-dessus des tiges comme le fait kit.massifFleurs (massifs à plat), sur le
  // talus de l'îlot il flottait en plateaux.
  // (le massif de abordsMur : cent vingt touffes serrées dans la pointe, sur trois mètres derrière son arrondi — étalées
  // le long de toute la palissade, elles ne faisaient plus qu'un semis de points)
  // cases de l'atlas [profil, coussin, poids, teinte] : 2 jaune (moins orangé que l'atlas : les jaunes de 171709 tirent
  // sur l'or), 4-5 violet en épis, 0-1 violet, 9 rose, 8 blanc ; coussins 14 jaune et violet, 12 violet, 13 rose, 15 blanc
  const J = [1.15, 1.3, 0.8], U = [1, 1, 1];
  const CASES = [[2, 14, 0.6, J], [4, 14, 0.12, U], [5, 12, 0.08, U], [0, 12, 0.06, U], [1, 14, 0.05, U], [9, 13, 0.05, U], [8, 15, 0.04, U]];
  const lf = new kit.Lot('plate-bande'), pF = lf.part('fleurs_vivaces'), col = [0, 0, 0];
  const carte = (c, x, y, z, ax, az, s, h0, h1, couche, t, tc) => {
    const u0 = (c % 4) / 4, v0 = 1 - (Math.floor(c / 4) + 1) / 4, b = pF.n;
    const coins = couche
      ? [[-0.5, -0.5, 0.004, 0.004], [0.5, -0.5, 0.246, 0.004], [0.5, 0.5, 0.246, 0.246], [-0.5, 0.5, 0.004, 0.246]]
      : [[-0.5, 0, 0.004, 0.004], [0.5, 0, 0.246, 0.004], [0.5, 1, 0.246, 0.246], [-0.5, 1, 0.004, 0.246]];
    for (const [du, dv, uu, vv] of coins) {
      const px = couche ? x + (ax * du - az * dv) * s : x + ax * du * s, pz = couche ? z + (az * du + ax * dv) * s : z + az * du * s;
      const py = couche ? sol(px, pz) + h0 : y + h0 + dv * (h1 - h0), ao = couche ? 1 : 0.5 + 0.5 * dv;
      col[0] = t * ao * tc[0]; col[1] = t * ao * tc[1]; col[2] = t * ao * tc[2];
      lf.s(pF, px, py, pz, couche ? 0 : -az * 0.25, 1, couche ? 0 : ax * 0.25, u0 + uu, v0 + vv, col);
    }
    lf.quad(pF, b, b + 1, b + 2, b + 3);
  };
  const n = mobile ? 90 : 210, z0 = C[1] - 2.8;
  for (let k = 0, essais = 0; k < n && essais < 8000; essais++) {
    const x = C[0] - 2.2 + 2.9 * alea(essais, 1, 411), z = z0 + (C[1] + 0.7 - z0) * alea(essais, 2, 412);
    if (!dansPlateBande(x, z, 0.12) || projeter(P, x, z).d > 1.05) continue;
    k++;
    let u = alea(x, z, 415), q = 0;
    while (q < CASES.length - 1 && u > CASES[q][2]) { u -= CASES[q][2]; q++; }
    const [cp, cd, , tc] = CASES[q], y = sol(x, z) - 0.02, s = 0.24 + 0.12 * alea(x, z, 413), rot = alea(z, x, 414) * Math.PI;
    const t = 0.92 + 0.22 * alea(x, z, 416), ca = Math.cos(rot), sa = Math.sin(rot);
    carte(cp, x, y, z, ca, sa, s, -0.03 * s, 0.97 * s, false, t, tc);
    carte(cp, x, y, z, -sa, ca, s, -0.03 * s, 0.97 * s, false, t, tc);
    carte(cd, x, y, z, ca, sa, s * 1.35, 0.1 * s, 0, true, t, tc);
  }
  const gf = lf.maillages('plate-bande de l’îlot');
  for (const m of gf.children) { m.castShadow = false; m.userData.feuillage = true; }
  groupe.add(gf);
  yield;
  // L'ÉPICÉA BLEU (epiceaBleu, js/court_parc.js), son fût dans le bois du kit
  // (son hasard — la place de chaque rameau — est fixé : le même épicéa chez tous les joueurs)
  const tmp = new THREE.Group();
  avecHasard('Z10c:epicea', () => epiceaBleu(tmp, K, EPICEA.x + Monde.dx, sol(EPICEA.x, EPICEA.z), EPICEA.z));
  for (const m of [...tmp.children]) {
    if (m.material && m.material.alphaTest > 0) m.userData.nofuse = true;
    else m.material = kit.materiau('bois');
    m.name = 'épicéa bleu';
    groupe.add(m);
  }
  yield;
  // LES BANCS NOIRS, et au bout de leur rangée la corbeille (171706 : une corbeille sombre entre les bancs et la façade ;
  // celle du kit, sa peinture verte assombrie presque au noir par ses couleurs de sommet)
  bancsNoirs(K, groupe, BANCS);
  const cb = kit.poubelle({ x: CORBEILLE.x, z: CORBEILLE.z, cap: 90 });
  cb.traverse((m) => { const c = m.isMesh && m.geometry.attributes.color; if (c) { const a = c.array.slice(); for (let i = 0; i < a.length; i++) a[i] *= 0.45; m.geometry = m.geometry.clone(); m.geometry.setAttribute('color', new THREE.BufferAttribute(a, 3)); } });
  groupe.add(cb);
  yield;
  // UNE PLAQUE D'ÉGOUT dans l'allée, au coin (171706, en bas de la photo)
  const lp = new kit.Lot('plaque'), cx = -26.1, cz = 7.4, N = { x: 0, y: 1, z: 0 };
  Monde.normale(cx + Monde.dx, cz, N);
  const pts = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, x = cx + Math.cos(a) * 0.32, z = cz + Math.sin(a) * 0.32; pts.push([x + Monde.dx, solVu(x, z) + 0.04, z]); }
  lp.polygone('peinture', pts, [N.x, N.y, N.z], { couleur: lin('#2b2826'), tuile: 0.3 });
  const gp = lp.maillages('plaque', 0);
  for (const m of gp.children) m.castShadow = false;
  groupe.add(gp);
  // LES HERBES FOLLES au pied du mur (171706 : une touffe tous les deux à trois mètres, dans le joint de l'allée)
  for (let z = -43; z < zFourche() + 5; z += 0.6) {
    if (alea(z, 1, 421) > 0.42) continue;
    herbes(feu, XD - 0.05 - 0.04 * alea(z, 2, 422), z + 0.3 * alea(z, 3, 423), 0.1 + 0.1 * alea(z, 4, 424), 425 + Math.floor(z * 10));
  }
}

// L'escalier de 34 marches (Z10b) : les deux volées (kit.escalier : béton, limons, main courante des deux côtés), le
// palier de béton entre elles.
function* escalier34(ctx) {
  const { kit, groupe } = ctx;
  for (const e of ESCALIERS) {
    groupe.add(yield* kit.escalierPas({ de: e.de, a: e.a, marches: e.marches, largeur: e.largeur, limon: 'deux', mainCourante: 'deux', materiau: 'beton', usure: 0.6 }, ctx.budget));   // (lot C6 : en tranches)
    yield;
  }
  const n = new Nappe(), [x0, z0, x1, z1] = PALIER34;
  plaque([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], { dy: 0.02, tuile: 2, uv: (x, z) => [x, z, 0], teinte: () => [0.94, 0.94, 0.93] }, n);
  const m = maillageSol(n.geometrie(), kit.materiau('beton'), 'palier de l’escalier');
  if (m) groupe.add(m);
}

// Le sous-bois d'un morceau : les arbustes (qui portent ombre) par paquets de huit, puis le couvre-sol (qui n'en porte
// pas : il n'en porterait que sur lui-même), en rangées ; deux maillages de feuillage.
function* sousBois(ctx, id, feuSol, noter) {
  const { K, groupe } = ctx, B = BOITES[id], mobile = ctx.mobile, budget = ctx.budget || (() => false);
  const feu = new Touffes();
  let k = 0;
  for (const a of ARBUSTES) {
    if (!dansBoite(B, a.x, a.z)) continue;
    arbuste(feu, a);
    if (++k % 8 === 0 && budget()) yield;
  }
  noter('arbustes ' + feu.n);
  const m = maillageFeuillage(feu, K, 'arbustes du coteau', true);
  if (m) groupe.add(m);
  noter('arbustes cousus');
  yield;
  // (le couvre-sol s'arrête à z = +17, le bord de la zone : au-delà, les terrasses des caves et du bassin)
  // (relecture du lot B8 : ni au-dessus de la crête, le long de l'allée haute, de z -72 à +17 — pas de touffe centrée
  // à x < -53,9 : ses feuilles s'étalent de 50 cm, et la crête est à -54,1. Sur l'esplanade de stabilisé et au bord de
  // l'allée (Z17), ses touffes de lierre passaient sous le garde-corps et posaient des plaques vert sombre)
  yield* couvreSol(feuSol, [B[0], B[1], B[2], Math.min(B[3], 17)], ALLEES, { pas: mobile ? 1.6 : 1.05, budget,
    garder: (x, z) => !horsCoteau(x, z) && !dansPlateBande(x, z, -0.2) && !(x < -53.9 && z > -72), graine: 11 + id.charCodeAt(3) });
  noter('couvre-sol ' + feuSol.n);
  const s = maillageFeuillage(feuSol, K, 'couvre-sol du coteau', false);
  if (s) groupe.add(s);
  noter('couvre-sol cousu');
}

// Un morceau : ce qui tombe dans sa boîte, en tranches (une par pièce, ou plus fin quand `ctx.budget()` le demande).
// Les pièces reprises de js/court_parc.js tirent leur hasard sous avecHasard, par tranche et à graine fixe : le même
// morceau est le même chez tous les joueurs, dans quelque ordre qu'on construise les morceaux. `groupe.userData.tranches` :
// la durée de chaque étape (ms), pour la mise au point.
function* construireMorceau(ctx, id) {
  const T = ctx.groupe.userData.tranches = [];
  let t0 = performance.now();
  const noter = (nom) => { const t = performance.now(); T.push([nom, Math.round((t - t0) * 10) / 10]); t0 = t; };
  preparer(); noter('preparer');
  const B = BOITES[id];
  yield* allees(ctx, id, noter); noter('allees');
  yield;
  if (id === 'Z10b') { yield* escalier34(ctx); noter('escalier'); yield; }
  const feuSol = new Touffes();
  if (id === 'Z10c') { yield* ilot(ctx, feuSol); noter('ilot'); yield; }
  for (const c of CANDELABRES) if (dansBoite(B, c.x, c.z)) candelabre(ctx.kit, ctx.groupe, c);
  noter('candelabres');
  yield* sousBois(ctx, id, feuSol, noter);
  yield* fondreEtProteger(ctx);
  noter('fusion');
}

// ============================================================================================ la zone
export default {
  id: 'Z10', nom: 'Coteau boisé nord et rampe est',
  emprise: [[-57, -121], [-20.6, -121], [-20.6, 17], [-57, 17]],
  morceaux: Object.keys(BOITES).map((id) => ({ id, boite: BOITES[id], construire: (ctx) => construireMorceau(ctx, id) })),
  // PUR : les obstacles, déclarés à l'installation, avant le relief (voir coteau.js)
  obstacles(o) {
    preparer();
    // les arbustes assez gros pour qu'on ne les traverse pas (les plus petits se frôlent)
    for (const a of ARBUSTES) if (a.R >= 0.9) o.cercle(a.x, a.z, a.R * 0.55, { h: a.h, type: 'arbuste' });
    // les bancs noirs (1,9 x 0,6 m), la palissade de l'îlot (on n'entre pas dans la plate-bande), l'épicéa
    for (const b of BANCS) o.boite(b.x, b.z, 0.3, 0.95, 0, { h: 0.9, type: 'dur' });
    o.cercle(CORBEILLE.x, CORBEILLE.z, 0.28, { h: 0.9, type: 'dur' });
    const P = ILOT.pts;
    for (let i = 0; i + 1 < P.length; i++) o.segment(P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], { e: 0.12, h: 0.45, type: 'dur' });
    o.cercle(EPICEA.x, EPICEA.z, 1.1, { h: 7, type: 'arbuste' });
    for (const c of CANDELABRES) o.cercle(c.x, c.z, 0.15, { h: 3.6, type: 'dur' });
    // les rampes de fer des deux volées de l'escalier de 34 marches : on n'en sort pas par le côté (relecture)
    for (const e of ESCALIERS) rampesEnObstacles(o, e);
  },
  bancs(b) { preparer(); for (const q of BANCS) b.push({ x: q.x + 0.08, z: q.z, cap: 90, y: 0.47 }); },
  lieux: [],
};
