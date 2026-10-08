// =====================================================================
//  ZONE Z19 : LE QUAI, LA BERGE, LA SEINE ET L'ÎLE DE LA JATTE (lot B1 du parc entier)
// =====================================================================
// Conception, § 1.3 (Z19), § 0 (décision D5) et § 4 (lot B1). Hors du parc, du décor seulement (on ne sort pas en v1) :
// ce qu'on voit par-dessus la grille, du plateau à travers le rideau, de la promenade, du belvédère.
//
// LE QUAI À SA VRAIE PLACE (D5) : le décor d'aujourd'hui (lesQuais de js/court_parc.js, que le parc entier saute)
// posait le trottoir à x = 12,3, la route à -1,9 et l'eau à -6,5 ; le vrai quai (orthophoto, MNT LiDAR) est 4,7 m plus
// loin et plus bas. Les gabarits de la zone (tools/parc/gabarits.json : quai_trottoir, quai_chaussee, seine,
// garde_parapet_quai) ont déjà mis le SOL à sa place ; on y pose ici, en suivant Monde.sol :
//  - le trottoir côté parc, de la grille (x ≈ 16) à la bordure de granit (x ≈ 19,3), à -2,85 au droit du plateau ;
//  - la chaussée (17 m, à -3,0) : une file de stationnement de chaque côté, deux voies par sens, les marquages relevés
//    sur l'orthophoto (tirets de 3 m tous les 13 m, ligne continue au milieu) ; les VÉHICULES GARÉS de vehiculesGares,
//    déplacés avec la route (le car bleu « voyages » de z 12 à 24, le grand fourgon blanc à -6,6, l'utilitaire à -22 :
//    ceux que l'on voit du plateau sur les photos 1000051339, 342 et 343), plus un car blanc, un autocar bleu et un minibus (photos
//    171717 et 171718) et des voitures le long de la berge (ortho) ; la CIRCULATION, deux voies par sens ;
//  - la bande plantée (x 36,5 à 40,5), sa bordure et son trottoir de berge, les candélabres du quai, à bras au-dessus
//    de la chaussée (ortho : les têtes au-dessus des voies). SES ARBRES NE SONT PAS ICI (règle 4 du contrat d'une zone :
//    une zone ne plante pas d'arbres). Ce sont des platanes de la berge, et ils viennent de arbres.bin comme tous les
//    arbres du monde (js/monde_vegetation.js, lot A5) : ceux que le MNH LiDAR a vus, plus ceux que l'orthophoto montre
//    et que le plafond du pourtour lui faisait perdre (tools/parc/gabarits.json > arbres.ajouter, « berge du quai »).
//    (La première version les plantait ici, un tous les 8 m, en boules taillées dans le feuillage du kit : ils auraient
//    doublé ceux de arbres.bin dès l'arrivée du lot A5, et l'ortho n'en montre qu'une rangée au nord-est, clairsemée
//    ensuite — relecture du lot B1.) ;
//  - le PARAPET de pierre (x ≈ 40,7), puis le PERRÉ : la pente de pierres claires jusqu'à l'eau (ortho : bande beige
//    de 9 m, quelques arbustes), un rang d'enrochements au pied ;
//  - la SEINE (-8,3) jusqu'à l'ÎLE DE LA JATTE (x ≈ 156) : berge boisée, une péniche amarrée (photo 6 de la
//    conception). Les IMMEUBLES de l'île et ses peupliers sont au pourtour (zone Z20, lot B11 : les bureaux à
//    mur-rideau, le long immeuble blanc, les attiques de zinc de R6) ; la rive en lit l'emprise (ILE_IMMEUBLES).
// Aux deux bouts, les rues qui partent du quai (carrefour nord-est, rue en biais au sud-ouest : surfaces 13 et 14 de
// monde.json), et le quai qui file au-delà de la grille du monde (le sol y est prolongé à plat).
//
// Les morceaux (monde.json > morceaux) : Z19a à Z19g, tranches de 48 m en z de la grille à la berge ; plus Z19s, la
// Seine au large et la rive de l'île, qui ne sont vues que de loin (en silhouette : l'eau, la rive et une bande de
// feuillage à la place des arbres).
// Matériaux : ceux du kit (asphalte, pierre de taille, moellons, peinture, verre, feuillage, ardoise, eau) ; propres à
// la zone : la carrosserie du car bleu (sa toile), les carrosseries,
// et le feuillage et le zinc de l'île à brume allégée. Aucun Math.random (hasard du parc).
// La construction rend la main (ctx.budget(), lot A5) entre deux rangs des longues pièces : pas de tranche de plus de
// quelques millisecondes, sauf la fusion finale du morceau.
import * as THREE from 'three';
import { Monde } from '../../monde.js';
import { enTranchesPas } from '../../monde_vue.js';
import { decouper, materiauxRideau } from './z03_promenade.js';
import { ILE_IMMEUBLES } from './z20_pourtour.js';

// ============================================================================================ les lignes du quai
// Le quai est oblique dans le repère du jeu : chaque ligne gagne P m en x par mètre de z (gabarits.json).
const P = -3.82 / 335;
const ligne = (x0, z0) => (z) => x0 + P * (z - z0);
const X = {
  trottoir: ligne(17.65, -135),      // bord du trottoir côté parc (polygone quai_trottoir)
  route: ligne(20.85, -135),         // bordure trottoir / chaussée
  loin: ligne(37.85, -135),          // bord de la chaussée côté Seine (bande plantée au-delà)
  parapet: ligne(42.25, -135),       // axe du parapet (garde_parapet_quai)
  seine: ligne(52.05, -135.5),       // bord de l'eau (polygone seine)
  ile: ligne(156, 0),                // rive de l'île de la Jatte
};
const ANGLE = Math.atan(P);          // (rotation autour de y d'un objet posé le long du quai)
const Y_EAU = -8.22;                 // la Seine (plan « seine » à -8,3 : l'eau 8 cm au-dessus du fond du sol)
// La grille du parc (monde.json > clotures > grille_quai), pour le bord du trottoir : sa partie droite, de z -89 à 159
// ((16,28 ; -89,08) -> (16,47 ; -60,23) -> (13,96 ; 159,41))
const xGrille = (z) => (z < -60.23 ? 16.28 + (z + 89.08) * (0.19 / 28.85) : 16.47 + (z + 60.23) * ((13.96 - 16.47) / 219.64));
// bord intérieur du trottoir : contre le muret de la grille là où elle longe le quai, sinon le polygone du trottoir
const xTrottoir = (z) => (z > -89 && z < 159.4 ? Math.max(xGrille(z) + 0.24, X.trottoir(z) - 0.6) : X.trottoir(z) - 0.6);
// La chaussée, en travers (mètres depuis la bordure côté parc, 17 m en tout) : stationnement côté parc (0 à 2,4), deux
// voies vers z+ (on roule à droite : le sens z+ longe le parc), la ligne continue du milieu à 8,8, deux voies vers z-,
// stationnement côté Seine (15 à 17).
const VOIES = { stationParc: 1.25, versPlus: [4.0, 7.2], ligneMilieu: 8.8, versMoins: [10.4, 13.5], stationSeine: 16.05 };
const Z_LOIN = [-185, 250];          // le quai file au-delà de la grille du monde (z -135 à 200), jusqu'au brouillard

const TRANCHES = [['Z19a', -135, -87.14], ['Z19b', -87.14, -39.29], ['Z19c', -39.29, 8.57], ['Z19d', 8.57, 56.43],
  ['Z19e', 56.43, 104.29], ['Z19f', 104.29, 152.14], ['Z19g', 152.14, 200]];
// les bouts dessinés d'une tranche : les deux tranches du bout prolongent le quai jusqu'au loin
const etendue = (za, zb) => [za <= -135 ? Z_LOIN[0] : za, zb >= 200 ? Z_LOIN[1] : zb];

// ============================================================================================ outils
const BLANC = [1, 1, 1];
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Une NAPPE drapée sur le sol : de xa(z) à xb(z), de z0 à z1, un rang tous les `pas` m, `nX` colonnes. `couleur` :
// (x, z, t) -> [r, g, b] (t de 0 à 1 en travers) ; UV en mètres / tuile, alignées sur le monde (deux nappes voisines
// se raccordent). `cle` : la clé du Lot (« asphalte#sol » : sans ombre portée).
function nappe(K, lot, cle, xa, xb, z0, z1, o = {}) {
  const pas = o.pas ?? 1, nX = o.nX ?? 2, dy = o.dy ?? 0.03, tu = o.tuile ?? 4, p = lot.part(cle), n = { x: 0, y: 1, z: 0 };
  const nZ = Math.max(1, Math.ceil((z1 - z0) / pas));
  let prev = null;
  for (let j = 0; j <= nZ; j++) {
    const z = z0 + ((z1 - z0) * j) / nZ, a = xa(z), b = xb(z), rang = [];
    for (let i = 0; i <= nX; i++) {
      const t = i / nX, x = a + (b - a) * t, y = (o.y ? o.y(x, z) : K.sol(x, z)) + dy;
      if (o.y) { n.x = 0; n.y = 1; n.z = 0; } else Monde.normale(x + Monde.dx, z, n);
      rang.push(lot.s(p, x, y, z, n.x, n.y, n.z, x / tu, z / tu, o.couleur ? o.couleur(x, z, t) : BLANC));
    }
    if (prev) for (let i = 0; i < nX; i++) lot.quad(p, prev[i], prev[i + 1], rang[i + 1], rang[i]);
    prev = rang;
  }
}
// Un ruban plat le long du quai (marquage, bande de peinture) : de x(z) - l/2 à x(z) + l/2, de z0 à z1, à dy du sol
function bandeQuai(K, lot, cle, xf, l, z0, z1, dy, couleur) {
  const p = lot.part(cle);
  const a = [xf(z0) - l / 2, xf(z0) + l / 2], b = [xf(z1) - l / 2, xf(z1) + l / 2];
  const ya = K.sol(xf(z0), z0) + dy, yb = K.sol(xf(z1), z1) + dy;
  const i0 = lot.s(p, a[0], ya, z0, 0, 1, 0, 0.25, 0.5, couleur), i1 = lot.s(p, a[1], ya, z0, 0, 1, 0, 0.25, 0.5, couleur);
  const i2 = lot.s(p, b[1], yb, z1, 0, 1, 0, 0.25, 0.5, couleur), i3 = lot.s(p, b[0], yb, z1, 0, 1, 0, 0.25, 0.5, couleur);
  lot.quad(p, i0, i1, i2, i3);
}
// Une matrice de pose : en (x, y, z), tournée de `cap` radians autour de y (le long du quai : ANGLE)
const pose = (x, y, z, cap = 0, e = null) => {
  const m = new THREE.Matrix4().makeRotationY(cap);
  if (e) m.multiply(new THREE.Matrix4().makeScale(e[0], e[1], e[2]));
  return m.setPosition(x, y, z);
};

// ============================================================================================ les véhicules
// Les modèles sont dessinés UNE fois (Lot, matériau « peinture » du kit : la couleur est celle des sommets), puis posés
// par des maillages qui partagent leur géométrie (fondus ensuite, un appel pour tous les véhicules d'un morceau). Repère
// du modèle : roues au sol (y = 0), avant vers +z, milieu en (0, 0).
const VITRE = [0.05, 0.065, 0.075], PNEU = [0.03, 0.03, 0.032], JANTE = [0.42, 0.43, 0.44], PHARE = [0.9, 0.88, 0.8], FEU = [0.5, 0.04, 0.03];
// un profil de côté (z, y) extrudé sur la largeur (x) : les pans, le toit et le capot d'un coup
function extrude(lot, profil, largeur, couleur, dx = 0) {
  lot.prisme('peinture', profil.map(([z, y]) => [z, y]), [[dx - largeur / 2, 0, 0], [dx + largeur / 2, 0, 0]],
    { haut: [0, 1, 0], bande: true, couleur, lisse: false });
}
function roues(lot, L, l, r, empattement, arriere = null) {
  const zs = arriere ? [empattement / 2, ...arriere] : [empattement / 2, -empattement / 2];
  for (const z of zs) for (const sx of [-1, 1]) {
    const m = new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(sx * (l / 2 - 0.12), r, z);
    lot.tour('peinture', [[r * 0.96, -0.11], [r, -0.08], [r, 0.08], [r * 0.96, 0.11]], 12, m, { bande: true, couleur: PNEU, fond: true, dessus: true });
    const mj = new THREE.Matrix4().makeRotationZ(sx * Math.PI / 2).setPosition(sx * (l / 2 - 0.005), r, z);
    lot.tour('peinture', [[r * 0.62, 0], [r * 0.5, 0.012]], 10, mj, { bande: true, couleur: JANTE, dessus: true });
  }
}
// VOITURE (berline) : 4,3 x 1,8 m, 1,45 de haut ; `c` : la couleur de la caisse
function modeleVoiture(lot, c) {
  const L = 4.35, l = 1.8;
  // la caisse : bas de caisse, capot, pare-brise, toit, lunette, coffre (profil de côté, z vers l'avant)
  extrude(lot, [[-2.17, 0.3], [2.17, 0.3], [2.2, 0.62], [2.05, 0.78], [1.0, 0.9], [-1.75, 0.94], [-2.15, 0.86], [-2.2, 0.55]], l, c);
  // l'habitacle vitré, plus étroit : vitres sombres, montants et toit de la couleur de la caisse
  extrude(lot, [[0.98, 0.9], [0.18, 1.36], [-1.05, 1.4], [-1.72, 0.94]], l - 0.14, VITRE);
  extrude(lot, [[0.14, 1.35], [-1.05, 1.39], [-1.02, 1.42], [0.13, 1.39]], l - 0.12, c);
  for (const z of [0.95, -0.2, -1.62]) extrude(lot, [[z + 0.04, 0.9], [z - 0.04, 0.9], [z - 0.04 + (z > 0.5 ? -0.75 : z < -1 ? 0.63 : 0), 1.38], [z + 0.04 + (z > 0.5 ? -0.75 : z < -1 ? 0.63 : 0), 1.38]], l - 0.12, c);
  // phares, feux, plaques, calandre
  for (const sx of [-0.62, 0.62]) {
    lot.boite('peinture', 0.34, 0.1, 0.05, pose(sx, 0.68, 2.19), { bande: true, couleur: PHARE });
    lot.boite('peinture', 0.3, 0.1, 0.05, pose(sx, 0.74, -2.19), { bande: true, couleur: FEU });
  }
  lot.boite('peinture', 0.52, 0.11, 0.03, pose(0, 0.45, 2.2), { bande: true, couleur: [0.85, 0.85, 0.85] });
  lot.boite('peinture', 0.52, 0.11, 0.03, pose(0, 0.48, -2.21), { bande: true, couleur: [0.85, 0.85, 0.85] });
  lot.boite('peinture', 1.7, 0.12, 0.1, pose(0, 0.36, 2.15), { bande: true, couleur: [0.06, 0.06, 0.06] });
  roues(lot, L, l, 0.31, 2.65);
}
// UTILITAIRE (fourgonnette haute, type Kangoo / Trafic) : 5,1 x 1,95, 2,0 de haut
function modeleUtilitaire(lot, c) {
  const l = 1.95;
  extrude(lot, [[-2.55, 0.32], [2.5, 0.32], [2.55, 0.7], [2.45, 0.95], [1.75, 1.2], [1.25, 1.95], [-2.5, 1.98], [-2.56, 1.9]], l, c);
  extrude(lot, [[1.7, 1.21], [1.28, 1.86], [0.7, 1.86], [0.7, 1.21]], l + 0.02, VITRE);
  for (const sx of [-0.7, 0.7]) {
    lot.boite('peinture', 0.3, 0.14, 0.05, pose(sx, 0.8, 2.53), { bande: true, couleur: PHARE });
    lot.boite('peinture', 0.14, 0.34, 0.05, pose(sx * 1.25, 1.0, -2.57), { bande: true, couleur: FEU });
  }
  lot.boite('peinture', 1.85, 0.16, 0.12, pose(0, 0.4, 2.5), { bande: true, couleur: [0.07, 0.07, 0.07] });
  roues(lot, 5.1, l, 0.34, 3.2);
}
// LE GRAND FOURGON BLANC (photo 43 : 5,6 m, caisse haute de 2,6 m sur 35 cm de garde, toit à 2,95 m ; cabine et capot
// plus bas devant) — celui de vehiculesGares, redessiné
function modeleFourgon(lot, c) {
  const l = 1.95;
  extrude(lot, [[-2.8, 0.35], [2.25, 0.35], [2.8, 0.45], [2.82, 1.3], [2.3, 1.45], [1.95, 2.6], [1.6, 2.95], [-2.8, 2.95]], l, c);
  extrude(lot, [[2.28, 1.46], [1.97, 2.52], [1.55, 2.52], [1.55, 1.46]], l + 0.02, VITRE);
  for (const sx of [-0.72, 0.72]) {
    lot.boite('peinture', 0.28, 0.16, 0.05, pose(sx, 1.05, 2.82), { bande: true, couleur: PHARE });
    lot.boite('peinture', 0.14, 0.4, 0.05, pose(sx * 1.25, 1.1, -2.82), { bande: true, couleur: FEU });
  }
  lot.boite('peinture', 2.0, 0.24, 0.14, pose(0, 0.5, 2.83), { bande: true, couleur: [0.07, 0.07, 0.07] });
  roues(lot, 5.6, l, 0.36, 3.75);
}
// UN CAR (12 x 2,55 x 3,4 m) peint en couleurs de sommets : caisse, bandeau vitré, toit clair, jupe sombre, deux essieux
// arrière ; `c` : caisse, `v` : vitres
function modeleCar(lot, c, v = [0.2, 0.22, 0.23], L = 12, H = 3.4, bande = null) {
  const l = 2.55, h0 = 0.4;
  extrude(lot, [[-L / 2, h0], [L / 2 - 0.1, h0], [L / 2, h0 + 0.5], [L / 2, H - 0.25], [L / 2 - 0.25, H], [-L / 2 + 0.15, H], [-L / 2, H - 0.2]], l, c);
  extrude(lot, [[L / 2 - 0.4, H - 1.05], [L / 2 - 0.4, H - 0.12], [-L / 2 + 0.3, H - 0.12], [-L / 2 + 0.3, H - 1.05]], l + 0.02, v);
  extrude(lot, [[L / 2 + 0.01, h0 + 1.1], [L / 2 + 0.01, H - 0.3], [L / 2 - 0.02, H - 0.3], [L / 2 - 0.02, h0 + 1.1]], l - 0.2, v);
  extrude(lot, [[-L / 2 + 0.2, H - 0.06], [L / 2 - 0.3, H - 0.06], [L / 2 - 0.3, H + 0.02], [-L / 2 + 0.2, H + 0.02]], l - 0.1, [0.86, 0.87, 0.85]);
  extrude(lot, [[-L / 2, h0], [L / 2 - 0.1, h0], [L / 2 - 0.1, h0 + 0.2], [-L / 2, h0 + 0.2]], l + 0.01, [0.09, 0.1, 0.1]);
  // une bande de couleur le long des soutes (le car blanc de 171717 : un bas gris)
  if (bande) extrude(lot, [[-L / 2 + 0.02, h0 + 0.22], [L / 2 - 0.12, h0 + 0.22], [L / 2 - 0.12, h0 + 0.62], [-L / 2 + 0.02, h0 + 0.62]], l + 0.012, bande);
  // les deux rétroviseurs en « oreilles de lapin » d'un autocar, et les feux
  for (const sx of [-1, 1]) {
    lot.barre([sx * (l / 2 - 0.05), H - 0.35, L / 2 - 0.05], [sx * (l / 2 + 0.28), H - 0.45, L / 2 + 0.3], 0.04, 0.03, { couleur: [0.06, 0.06, 0.07] });
    lot.boite('peinture', 0.08, 0.32, 0.18, pose(sx * (l / 2 + 0.3), H - 0.7, L / 2 + 0.3), { bande: true, couleur: [0.06, 0.06, 0.07] });
    lot.boite('peinture', 0.34, 0.12, 0.04, pose(sx * 0.9, h0 + 0.55, L / 2 + 0.01), { bande: true, couleur: PHARE });
    lot.boite('peinture', 0.16, 0.36, 0.04, pose(sx * 1.1, h0 + 0.9, -L / 2 - 0.01), { bande: true, couleur: FEU });
  }
  roues(lot, L, l, 0.5, 0, [L / 2 - 1.7, -L / 2 + 2.4, -L / 2 + 3.6]);
}

// LE CAR BLEU « voyages » (photos 1000051339, 342 et 343) : sa toile, reprise de busBleu (js/court_parc.js) — caisse
// bleu vif, liseré de toit blanc, bandeau vitré gris de 0,9 m où l'on devine les appuie-têtes, l'anneau blanc à cheval
// sur la limite vitres / caisse, le mot « voyages » ; une toile de 1 024 x 256 px : les deux flancs (0 à 512 et 512 à
// 1 024 sur la rangée du haut), l'avant et l'arrière (rangée du bas). Matériau propre de la zone : la caisse à l'ombre,
// le couchant dans le dos, est éclairée par sa propre couleur (émission), comme le réglage validé sur les photos.
let _car = null;
function materiauCarBleu(K, CK) {
  if (_car) return _car;
  const tex = CK.canvasTex(1024, 256, (c) => {
    const flanc = (x0) => {
      const w = 512, h = 128;
      c.save(); c.translate(x0, 0);
      c.fillStyle = '#2a64c8'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#d8dcd8'; c.fillRect(0, 0, w, 9);
      c.fillStyle = '#6f7772'; c.fillRect(0, 9, w, 38);
      for (let u = 10, k = 0; u < w - 40; u += 36, k++) { c.fillStyle = K.alea(k, x0, 3) < 0.5 ? '#50575a' : '#636a6b'; c.beginPath(); c.ellipse(u + (K.alea(k, x0, 4) - 0.5) * 6, 33, 8, 9, 0, 0, 6.29); c.fill(); }
      c.fillStyle = '#565c5a'; for (let u = 0; u < w; u += 62) c.fillRect(u, 9, 3, 38);
      c.fillStyle = '#35393a'; c.fillRect(w * 0.9, 9, 22, 110);
      c.fillStyle = '#1f3f7c'; c.fillRect(0, 112, w, 2);
      c.fillStyle = '#23272a'; c.fillRect(0, 121, w, 7);
      for (let u = 150; u < 380; u += 90) { c.fillStyle = 'rgba(20,30,50,0.35)'; c.fillRect(u, 68, 2, 44); }
      c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.beginPath(); c.arc(w * 0.558, 47, 19, 0, 6.29); c.stroke();
      c.font = 'italic bold 20px Arial, sans-serif'; c.fillStyle = '#ffffff'; c.textBaseline = 'middle'; c.fillText('voyages', w * 0.1, 90);
      c.restore();
    };
    flanc(0); flanc(512);
    // l'avant (0 à 128, rangée du bas) et l'arrière (128 à 256)
    c.fillStyle = '#2a64c8'; c.fillRect(0, 128, 256, 128);
    c.fillStyle = '#d8dcd8'; c.fillRect(0, 128, 256, 9);
    c.fillStyle = '#3c4246'; c.fillRect(6, 140, 116, 62); c.fillRect(138, 142, 108, 34);
    c.fillStyle = '#23272a'; c.fillRect(0, 246, 256, 10);
    c.fillStyle = '#eef0ea'; c.fillRect(8, 228, 18, 8); c.fillRect(102, 228, 18, 8);
    c.fillStyle = '#8a2020'; c.fillRect(134, 224, 10, 16); c.fillRect(240, 224, 10, 16);
    c.fillStyle = '#e6ebe5'; c.fillRect(256, 128, 256, 128);            // le toit
  }, null, false, 4);
  _car = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.45 });
  _car.name = 'zone quai · car bleu';
  return _car;
}
function carBleu(K, CK, x, z, dir) {
  // la caisse : une boîte de 2,55 x 3,0 x 12 m (sur 0,4 m de garde), ses six faces prennent leur case de la toile
  const g = new THREE.BoxGeometry(2.55, 3.0, 12), uv = g.attributes.uv;
  // faces de BoxGeometry : +x, -x, +y, -y, +z, -z (4 sommets chacune)
  const cases = [[0.5, 0.5, 1, 1], [0, 0.5, 0.5, 1], [0.25, 0, 0.5, 0.5], [0.25, 0, 0.5, 0.5], [0, 0, 0.125, 0.5], [0.125, 0, 0.25, 0.5]];
  for (let f = 0; f < 6; f++) {
    const [u0, v0, u1, v1] = cases[f];
    for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0)); }
  }
  g.translate(0, 1.9, 0);
  const m = new THREE.Mesh(g, materiauCarBleu(K, CK));
  m.position.set(x + Monde.dx, K.sol(x, z), z); m.rotation.y = (dir > 0 ? 0 : Math.PI) + ANGLE;
  m.castShadow = true; m.receiveShadow = true; m.name = 'car bleu';
  const lot = new K.Lot('roues du car');
  roues(lot, 12, 2.55, 0.5, 0, [4.3, -2.9, -4.1]);
  const r = lot.maillages('roues du car', 0);
  for (const c of r.children) { c.position.copy(m.position); c.rotation.copy(m.rotation); }
  return [m, ...r.children];
}

// La bibliothèque des modèles (une géométrie par modèle et par couleur)
const _modeles = new Map();
function modele(K, cle, fabriquer, carrosserie = false) {
  let m = _modeles.get(cle);
  if (!m) {
    const lot = new K.Lot(cle); fabriquer(lot); m = lot.maillages(cle, 0); _modeles.set(cle, m);
    if (carrosserie) for (const c of m.children) if (c.material === K.materiau('peinture')) c.material = materiauCarrosserie();
  }
  return m;
}
// LES CARROSSERIES. Garés côté parc, les cars et les fourgons tournent au parc leur flanc à l'ombre (le couchant est
// dans leur dos) : dans la peinture du kit, le car blanc et le fourgon blanc sortaient gris sombre, là où les photos du
// 28/09 (171717, 171718) et du plateau (1000051343) les montrent blancs dans la lumière diffuse du soir. Comme le car
// bleu du plateau (busBleu, js/court_parc.js), une caisse peinte renvoie une part de sa propre couleur (émission =
// couleur × 0,32 : la lumière du ciel qu'elle diffuse) ; les vitres et les pneus, sombres, le restent. Matériau propre
// de la zone (sans texture : la couleur est celle des sommets, et de l'instance pour la circulation).
let _carrosserie = null;
function materiauCarrosserie() {
  if (_carrosserie) return _carrosserie;
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.05, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.32;');
  };
  m.customProgramCacheKey = () => 'carrosserie 0.32';
  m.name = 'zone quai · carrosseries';
  _carrosserie = m;
  return m;
}
function poserModele(K, groupe, m, x, z, cap, y = null) {
  const yy = y ?? K.sol(x, z);
  for (const c0 of m.children) {
    const c = new THREE.Mesh(c0.geometry, c0.material);
    c.castShadow = c0.castShadow; c.receiveShadow = c0.receiveShadow;
    c.position.set(x + Monde.dx, yy, z); c.rotation.y = cap; c.name = c0.name; c.userData.kitModele = c0.name;
    groupe.add(c);
  }
}
const COULEURS = [[0.86, 0.87, 0.86], [0.08, 0.085, 0.09], [0.36, 0.38, 0.4], [0.62, 0.64, 0.66], [0.45, 0.05, 0.05], [0.9, 0.9, 0.88],
  [0.12, 0.2, 0.36], [0.55, 0.52, 0.46], [0.18, 0.25, 0.2], [0.7, 0.71, 0.72]];

// LES VÉHICULES GARÉS : [z, côté (0 parc, 1 Seine), sorte, couleur, sens]. Côté parc : ceux de vehiculesGares (le
// car bleu de 12 à 24, le fourgon à -6,6, l'utilitaire à -22), puis ceux de l'ortho et des photos du 28/09. Côté
// Seine : une file de voitures, avec ses trous (tirée du hasard du parc, fixe).
const GARES = (() => {
  const l = [[18, 0, 'carBleu', null, 1], [-6.6, 0, 'fourgon', [0.9, 0.91, 0.89], 1], [-22, 0, 'utilitaire', [0.85, 0.87, 0.85], 1],
    // (171717 et 171718, de la butte du pin : en face de la terrasse, un car blanc, puis un autocar bleu à grand bandeau
    // vitré ; plus loin un minibus)
    [-41.5, 0, 'fourgon', [0.9, 0.91, 0.89], 1], [31.5, 0, 'carBlanc', null, 1], [45.5, 0, 'autocarBleu', null, 1], [60, 0, 'minibus', null, 1],
    [78.5, 0, 'voiture', 1, 1], [117, 0, 'voiture', 4, 1], [124.5, 0, 'utilitaire', [0.86, 0.86, 0.84], 1], [-118, 0, 'voiture', 1, 1]];
  // côté Seine, pas de 5,6 m, deux fois sur trois une voiture
  for (let z = -128; z < 196; z += 5.6) {
    const a = Math.abs(Math.sin(z * 12.9898 + 78.233 * 3.7) * 43758.5453) % 1;
    if (a > 0.66 || (z > -106 && z < -96)) continue;                  // (le passage piéton du bout nord-est)
    const s = Math.abs(Math.sin(z * 4.1 + 1.7) * 9731.3) % 1;
    l.push([z + (a - 0.3) * 0.8, 1, s < 0.18 ? 'utilitaire' : 'voiture', Math.floor(s * 97) % COULEURS.length, 1]);
  }
  return l;
})();
function poserGare(K, CK, g, v) {
  const [z, cote, sorte, c, sens] = v;
  const x = X.route(z) + (cote ? VOIES.stationSeine : VOIES.stationParc) + (sorte === 'carBleu' || sorte.startsWith('car') || sorte === 'autocarBleu' ? 0.1 : 0);
  const cap = (sens > 0 ? 0 : Math.PI) + ANGLE;
  if (sorte === 'carBleu') { for (const m of carBleu(K, CK, x, z, sens)) g.add(m); return; }
  const coul = Array.isArray(c) ? c : COULEURS[c ?? 0];
  const cle = sorte + ':' + coul.map((v) => v.toFixed(2)).join(',');
  const m = modele(K, cle, (lot) => {
    if (sorte === 'voiture') modeleVoiture(lot, coul);
    else if (sorte === 'utilitaire') modeleUtilitaire(lot, coul);
    else if (sorte === 'fourgon') modeleFourgon(lot, coul);
    else if (sorte === 'carBlanc') modeleCar(lot, [0.86, 0.87, 0.87], [0.22, 0.25, 0.28], 12.2, 3.5, [0.62, 0.64, 0.66]);
    else if (sorte === 'autocarBleu') modeleCar(lot, [0.08, 0.24, 0.62], [0.14, 0.17, 0.2], 12, 3.45, [0.9, 0.91, 0.92]);
    else if (sorte === 'minibus') modeleCar(lot, [0.9, 0.91, 0.9], [0.16, 0.18, 0.2], 7.4, 2.8);
  }, true);
  poserModele(K, g, m, x, z, cap);
}

// LA CIRCULATION : des voitures qui roulent sur les quatre voies, de z -185 à 250, toujours à la même place à la même
// heure (la position est fonction du temps : les morceaux voisins s'accordent sans se parler). Chaque morceau montre
// celles qui passent devant lui, dans UN maillage instancié (un appel, couleur par instance), mis à jour juste avant
// d'être dessiné ; marqué `dynamique` (ni ombre cuite, ni fusion).
const CIRCULATION = (() => {
  const l = [], L = Z_LOIN[1] - Z_LOIN[0];
  // (des berlines seulement : un seul modèle, donc un seul appel de dessin par tranche)
  const voies = [[VOIES.versPlus[0], 1], [VOIES.versPlus[1], 1], [VOIES.versMoins[0], -1], [VOIES.versMoins[1], -1]];
  voies.forEach(([dx, sens], v) => {
    const n = v === 1 || v === 2 ? 5 : 4;
    for (let i = 0; i < n; i++) {
      const a = Math.abs(Math.sin((v * 7 + i) * 12.9898) * 43758.5453) % 1;
      l.push({ dx, sens, z0: Z_LOIN[0] + (L * (i + a * 0.6)) / n, v: 8.5 + 3 * a + v * 0.4, c: COULEURS[(v * 3 + i * 7) % COULEURS.length] });
    }
  });
  return l;
})();
const _mat4 = new THREE.Matrix4(), _col = new THREE.Color();
function circulation(K, za, zb, animer = null) {
  const m0 = modele(K, 'circulation:voiture', (lot) => modeleVoiture(lot, BLANC), true), src = m0.children[0];
  const im = new THREE.InstancedMesh(src.geometry, src.material, CIRCULATION.length);
  im.name = 'circulation du quai'; im.castShadow = true; im.receiveShadow = true;
  im.userData.dynamique = true; im.userData.nofuse = true;
  im.count = 0; im.visible = false;
  // la sphère de tri : la tranche de chaussée (les voitures n'en sortent pas tant qu'elles sont montrées ici)
  const zm = (za + zb) / 2;
  im.boundingSphere = new THREE.Sphere(new THREE.Vector3(X.route(zm) + 8.5 + Monde.dx, K.sol(X.route(zm) + 8, zm) + 1, zm), (zb - za) / 2 + 12);
  // UNE FOIS PAR IMAGE, AVANT LE RENDU (Monde.taches, appelé par Monde.maj) : les voitures présentes dans la tranche
  // sont rangées en tête (count), les autres ne coûtent rien ; une tranche sans voiture n'est pas dessinée du tout
  // (un maillage instancié à zéro instance fait quand même son appel de dessin). La tâche se retire d'elle-même quand le
  // morceau n'est plus dans la scène (libéré par le chargement par morceaux).
  const L = Z_LOIN[1] - Z_LOIN[0];
  const tache = () => {
    let racine = im; while (racine.parent) racine = racine.parent;
    if (!racine.isScene) { if (im.userData.vu) { const i = Monde.taches.indexOf(tache); if (i >= 0) Monde.taches.splice(i, 1); } return; }
    im.userData.vu = true;
    const t = performance.now() / 1000;
    let n = 0;
    for (const a of CIRCULATION) {
      let z = a.z0 + a.sens * a.v * t; z = Z_LOIN[0] + (((z - Z_LOIN[0]) % L) + L) % L;
      if (z < za || z >= zb) continue;
      const x = X.route(z) + a.dx;
      _mat4.makeRotationY((a.sens > 0 ? 0 : Math.PI) + ANGLE).setPosition(x + Monde.dx, K.sol(x, z), z);
      im.setMatrixAt(n, _mat4); im.setColorAt(n, _col.setRGB(a.c[0], a.c[1], a.c[2])); n++;
    }
    im.count = n; im.visible = n > 0;
    if (n) { im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; }
  };
  // (la couleur par instance existe dès maintenant : le programme de rendu est compilé avec elle)
  im.setColorAt(0, _col.setRGB(1, 1, 1));
  // Avec le chargement par morceaux (lot A5), la tâche est confiée au morceau (ctx.animer : appelée à chaque image tant
  // qu'il est construit, oubliée quand il est libéré ou que son chantier est abandonné — sinon, un morceau abandonné
  // avant d'entrer dans la scène laissait sa tâche dans Monde.taches pour toute la partie). En attendant : Monde.taches.
  if (animer) animer(tache); else Monde.taches.push(tache);
  return im;
}

// ============================================================================================ le mobilier du quai
// LE CANDÉLABRE DU QUAI (ortho : les têtes des lampes au-dessus des voies ; 171717 : les mâts gris qui dépassent) : mât
// d'acier gris effilé de 9 m, crosse de 2,3 m qui avance au-dessus de la chaussée, lanterne plate (verre dessous, qui
// s'allume la nuit avec les autres : kit.allumer). Repère : pied à l'origine, crosse vers +z.
function modeleCandelabreQuai(lot) {
  const acier = [0.4, 0.42, 0.43];
  lot.tour('peinture', [[0.14, 0], [0.14, 0.35], [0.1, 0.42], [0.075, 5.5], [0.06, 9.0]], 12, null, { bande: true, couleur: acier, dessus: true });
  const bras = [[0, 8.7, 0], [0, 9.05, 0.35], [0, 9.2, 1.0], [0, 9.22, 2.3]];
  lot.prisme('peinture', [[-0.03, -0.03], [0.03, -0.03], [0.03, 0.03], [-0.03, 0.03]], bras, { bande: true, couleur: acier, lisse: true });
  lot.boite('peinture', 0.34, 0.12, 0.72, pose(0, 9.17, 2.45), { bande: true, couleur: acier, chanfrein: 0.03 });
  lot.boite('verre', 0.28, 0.02, 0.6, pose(0, 9.1, 2.45));
}
// UN ARBRE DE LA RIVE DE L'ÎLE, vu de 100 à 300 m (photos 171717, 171718, j1 : une masse de grands arbres vert sombre,
// de hauteurs inégales, devant et entre les immeubles) : un houppier de cinq à sept lobes bosselés, taillés dans la
// texture de feuillage du kit, plus clairs en haut ; un fût court et SOMBRE (à 150 m, le fût gris clair de l'écorce du
// quai traçait sous les couronnes une ligne de bâtonnets blancs que les photos ne montrent pas). `y0` : le pied (hors de
// la grille du monde : Monde.sol y rendrait le bord de la grille, la Seine), `h` : hauteur, `R` : rayon du houppier,
// `f` : hauteur du fût, `t` : clarté du feuillage (vert sombre de la rive : 0,3 à 0,45). Posé dans le lot du feuillage (le fût aussi).
const _lobes = new Map();
function lobe(K, v, finesse = 1) {
  // une sphère bosselée (trois variantes par finesse, faites une fois)
  const cle = v + ':' + finesse;
  if (!_lobes.has(cle)) {
    const g = new THREE.IcosahedronGeometry(1, finesse), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const b = 1 + 0.22 * (K.bruit(x * 1.7 + v * 5, z * 1.7 + y * 1.3, 131 + v) - 0.5) + 0.1 * (K.bruit(x * 4 + y, z * 4 - y, 137 + v) - 0.5);
      p.setXYZ(i, x * b, y * b, z * b);
    }
    g.computeVertexNormals();
    _lobes.set(cle, g);
  }
  return _lobes.get(cle);
}
function arbreIle(K, lotF, x, y0, z, h, R, f, graine, t) {
  const a = (k) => K.alea(x, z, graine + k), bois = [0.06, 0.055, 0.05];
  // (le fût dans le FEUILLAGE, en couleur de sommets sombre, comme en silhouette : l'écorce claire du rideau du quai
  // faisait, vue du belvédère, une rangée de bâtons blancs sous les couronnes ; relecture du lot B11. Un appel de moins.)
  cyl(lotF, [x, y0 - 0.1, z], [x, y0 + f + 0.8, z], 0.3, 0.2, 6, bois, 'feuillage');
  // le houppier : un cœur, puis quatre à six lobes autour, dans un ovoïde, qui se chevauchent (des masses rondes, pas
  // une boule), du haut du fût au faîte
  // (le centre un peu sous le milieu du houppier, et des lobes tout autour, bas compris : vus de loin, des couronnes
  // posées haut sur des fûts minces semblaient flotter au-dessus de la rive)
  const n = 5 + Math.floor(a(10) * 3), HV = (h - f) / 2, yc = y0 + f + HV * 0.9;
  const ev = Math.min(1.25, Math.max(0.75, HV / R)) * 0.92;              // (l'allongement vertical des lobes)
  const teinte = [(0.8 + 0.1 * a(11)) * t, (0.9 + 0.08 * a(12)) * t, (0.6 + 0.08 * a(13)) * t], out = [0, 0, 0];
  const couleur = (px, py, pz, nx, ny) => {
    const l = 0.66 + 0.34 * lisse(-0.8, 0.9, ny) * (0.8 + 0.2 * lisse(yc - HV, yc + HV, py));
    const b = 0.86 + 0.28 * K.bruit(px * 0.6, pz * 0.6 + py * 0.5, graine);
    out[0] = teinte[0] * l * b; out[1] = teinte[1] * l * b; out[2] = teinte[2] * l * b; return out;
  };
  for (let k = 0; k < n; k++) {
    // (k = 0 : le cœur ; les autres sur une sphère aplatie, la moitié haute plus garnie)
    const u = a(20 + k) * 6.28, v = Math.acos(1 - 1.9 * a(25 + k)), rr = k === 0 ? 0 : 0.6 + 0.3 * a(30 + k);
    // (des lobes gros et serrés, qui se fondent en une seule masse bosselée : plus petits et plus écartés, on voyait un
    // tas de boules, chacune avec son dessous sombre)
    const cx = x + Math.cos(u) * Math.sin(v) * R * rr * 0.55, cz = z + Math.sin(u) * Math.sin(v) * R * rr * 0.55;
    const cy = yc + Math.cos(v) * HV * rr * 0.55;
    const s = k === 0 ? R * 0.8 : R * (0.5 + 0.2 * a(50 + k));
    const m4 = new THREE.Matrix4().makeRotationY(a(60 + k) * 6.28).scale(new THREE.Vector3(s, s * ev, s)).setPosition(cx, cy, cz);
    lotF.geo('feuillage', lobe(K, k % 3, 1), m4, { uvBoite: true, tuile: 1.4, couleur });
  }
}
function cyl(lot, a, b, r0, r1, cotes, couleur, piece = 'bois') {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length();
  if (L < 1e-4) return;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  lot.tour(piece, [[r0, 0], [(r0 + r1) / 2, L / 2], [r1, L]], cotes, new THREE.Matrix4().compose(new THREE.Vector3(...a), q, new THREE.Vector3(1, 1, 1)), { couleur, tuile: 1.2 });
}

// ============================================================================================ une tranche du quai
function* construireTranche(ctx, za, zb) {
  const K = ctx.kit, g = ctx.groupe, sol = K.sol, budget = ctx.budget || (() => false);
  const [z0, z1] = etendue(za, zb);
  const lot = new K.Lot('quai');
  // 1. LE TROTTOIR côté parc : asphalte gris clair, taché ; au bout nord-est, là où la grille s'écarte en biais vers le
  // portillon, et au sud-ouest, il s'élargit vers le parc (le polygone du trottoir, fondu)
  nappe(K, lot, 'asphalte#sol', xTrottoir, (z) => X.route(z) - 0.1, z0, z1, { nX: 9, dy: 0.025,
    couleur: (x, z) => { const f = 1.08 + 0.1 * (K.bruit(x * 0.4, z * 0.4, 141) - 0.5); return [f, f, f * 0.99]; } });
  // la BORDURE de granit (15 cm) : des blocs d'un mètre, un joint entre deux
  const bordure = (xf, cote, zA, zB, chanfrein = 0.015) => {
    for (let z = Math.ceil(zA); z < zB; z += 1) {
      const zc = z + 0.5, x = xf(zc), yH = sol(x - cote * 0.35, zc) + 0.03, yB = sol(x + cote * 0.35, zc) - 0.12, t = 0.66 + 0.08 * K.alea(z, x, 143);
      lot.boite('taille', 0.2, yH - yB, 0.985, pose(x, (yH + yB) / 2, zc, ANGLE), { chanfrein, couleur: [t, t, t * 0.98], tuile: 0.8 });
    }
  };
  bordure(X.route, 1, z0, z1);
  yield;
  // 2. LA CHAUSSÉE : enrobé plus sombre, les bandes de roulement un peu plus claires, le stationnement plus mat
  const traces = [VOIES.versPlus[0], VOIES.versPlus[1], VOIES.versMoins[0], VOIES.versMoins[1]];
  nappe(K, lot, 'asphalte#sol', X.route, (z) => X.loin(z) + 0.1, z0, z1, { nX: 17, dy: 0.03, pas: 1.5,
    couleur: (x, z) => {
      const d = x - X.route(z);
      let f = 0.66 + 0.06 * (K.bruit(x * 0.25, z * 0.25, 145) - 0.5);
      for (const c of traces) f += 0.035 * (Math.exp(-(((d - c + 0.8) / 0.35) ** 2)) + Math.exp(-(((d - c - 0.8) / 0.35) ** 2)));
      if (d < 2.4 || d > 15) f *= 0.95;
      return [f, f, f * 1.01];
    } });
  // les marquages : tirets de 3 m tous les 13 m entre deux voies de même sens, ligne continue au milieu, ligne de
  // stationnement (tirets courts) des deux côtés
  const blanc = [0.92, 0.92, 0.9];
  const sur = (d) => (z) => X.route(z) + d;
  const tirets = (d, lg, per, l) => { for (let z = Math.ceil(z0 / per) * per; z < z1; z += per) bandeQuai(K, lot, 'peinture', sur(d), l, z, Math.min(z + lg, z1), 0.045, blanc); };
  tirets(5.6, 3, 13, 0.13); tirets(12.0, 3, 13, 0.13);
  tirets(2.4, 0.5, 2.0, 0.1); tirets(15.0, 0.5, 2.0, 0.1);
  for (let z = z0; z < z1; z += 6) bandeQuai(K, lot, 'peinture', sur(VOIES.ligneMilieu), 0.13, z, Math.min(z + 6, z1), 0.045, blanc);
  // au bout nord-est, le passage piéton vers la berge (z -104 à -100), et la rue qui part vers le parking
  if (za <= -100 && zb > -104) {
    for (let d = 0.6; d < 16.6; d += 1.0) bandeQuai(K, lot, 'peinture', (z) => X.route(z) + d, 0.5, -104, -100, 0.047, blanc);
  }
  if (za <= -112 && zb > -122) {
    nappe(K, lot, 'asphalte#sol', (z) => 0.5 + (z + 122) * 0.1, (z) => X.trottoir(z) - 0.3, -121.8, -112.6, { nX: 8, dy: 0.03,
      couleur: () => [0.66, 0.66, 0.67] });
  }
  // au bout sud-ouest, la rue en biais qui quitte le quai vers la ville (x 13,5 à z 175, x 6,5 à z 190), son trottoir
  // contre la grille du parc
  if (zb >= 165) {
    const axe = [[17.6, 165], [13.5, 175], [6.5, 190], [2.2, 200], [-1.5, 208]];
    // (le ruban du kit, assombri comme la chaussée du quai ; son trottoir, plus clair, le long de la grille)
    const assombrir = (grp, f) => { for (const m of grp.children) { const c = m.geometry.attributes.color; for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * f, c.getY(i) * f, c.getZ(i) * f); } return grp; };
    g.add(assombrir(K.ruban({ trace: axe, largeur: 5.8, materiau: 'asphalte', arrondi: true, dy: 0.03 }), 0.68));
    g.add(K.ruban({ trace: axe.map(([x, z]) => [x - 4.4, z - 0.6]).slice(1), largeur: 2.6, materiau: 'asphalte', dy: 0.035 }));
  }
  yield;
  // 3. LES VÉHICULES GARÉS
  for (const v of GARES) if (v[0] >= z0 && v[0] < z1) poserGare(K, ctx.K, g, v);
  yield;
  // 4. LA BANDE PLANTÉE, son trottoir de berge et sa bordure, les candélabres (ses arbres : arbres.bin, voir l'en-tête)
  bordure(X.loin, -1, z0, z1, 0);
  nappe(K, lot, 'asphalte#sol', (z) => X.parapet(z) - 1.55, (z) => X.parapet(z) - 0.2, z0, z1, { nX: 2, dy: 0.03,
    couleur: (x, z) => { const f = 1.02 + 0.1 * (K.bruit(x * 0.4, z * 0.4, 147) - 0.5); return [f, f, f]; } });
  bordure((z) => X.parapet(z) - 1.6, -1, z0, z1, 0);
  if (budget()) yield;
  const cq = modele(K, 'candélabre du quai', modeleCandelabreQuai);
  for (let z = Math.ceil((z0 + 6) / 38) * 38 - 6; z < z1; z += 38) {
    // côté parc (crosse vers la chaussée), puis côté Seine, décalé d'une demi-portée
    poserModele(K, g, cq, X.route(z) - 0.45, z, Math.PI / 2 + ANGLE);
    const z2 = z + 19;
    if (z2 < z1) poserModele(K, g, cq, X.loin(z2) + 0.5, z2, -Math.PI / 2 + ANGLE);
  }
  yield;
  // 5. LE PARAPET de pierre (1 m au-dessus du trottoir de berge) : blocs de 1,2 m chanfreinés, couronnement débordant
  for (let z = Math.ceil(z0 / 1.2) * 1.2; z < z1; z += 1.2) {
    const zc = z + 0.6, x = X.parapet(zc), y = sol(x - 0.6, zc) - 0.15, t = 0.86 + 0.1 * K.alea(z, 3, 161);
    const pat = (px, py) => { const v = t * (1 - 0.18 * Math.max(0, 1 - (py - y) / 0.5)); return [v, v * 0.98, v * 0.94]; };
    lot.boite('taille', 0.42, 1.03, 1.19, pose(x, y + 0.515, zc, ANGLE), { chanfrein: 0.012, couleur: pat, tuile: 1.6 });
    lot.boite('taille', 0.52, 0.14, 1.19, pose(x, y + 1.1, zc + 0.3, ANGLE), { chanfrein: 0.02, couleur: [t * 1.04, t * 1.03, t], tuile: 1.6 });
  }
  if (budget()) yield;
  // 6. LE PERRÉ : la pente de pierres claires du parapet à l'eau, plus sombre et verdie au ras de l'eau ; des
  // enrochements au pied, quelques arbustes accrochés dans le haut (ortho)
  nappe(K, lot, 'moellons#sol', (z) => X.parapet(z) + 0.2, (z) => X.seine(z) + 1.2, z0, z1, { nX: 10, dy: 0.02, pas: 1.2, tuile: 1.6,
    couleur: (x, z) => {
      const y = sol(x, z), eau = lisse(-6.6, -8.1, y), f = (0.95 + 0.14 * (K.bruit(x * 0.5, z * 0.5, 163) - 0.5)) * (1 - 0.35 * eau);
      return [f * (1 - 0.06 * eau), f * (1 + 0.02 * eau), f * (0.94 - 0.05 * eau)];
    } });
  for (let z = Math.ceil(z0 / 1.6) * 1.6; z < z1; z += 1.6) {
    const a = K.alea(z, 5, 165), x = X.seine(z) - 0.8 + a * 1.2, s = 0.35 + 0.35 * K.alea(z, 6, 166);
    lot.geo('taille', lobe(K, Math.floor(a * 3), 1), new THREE.Matrix4().makeRotationY(a * 6).scale(new THREE.Vector3(s * 1.3, s * 0.7, s)).setPosition(x, Y_EAU + s * 0.25, z),
      { uvBoite: true, tuile: 1.2, couleur: [0.62 + 0.1 * a, 0.6 + 0.1 * a, 0.55 + 0.08 * a] });
    if (K.alea(z, 7, 167) < 0.12) {
      const xb = X.parapet(z) + 1.5 + 2.5 * K.alea(z, 8, 168);
      const b = K.bouleBuis({ x: xb, z, r: [0.55, 0.75, 0.95][Math.floor(K.alea(z, 9, 169) * 3)], aplat: 0.7, essence: 'haie' });
      for (const m of b.children) m.position.y -= 0.25;
      g.add(b);
    }
  }
  yield;
  // les maillages : le quai (un par matériau)
  g.add(lot.maillages('quai'));
  yield;
  // la fusion, ici, puis les blocs protégés (voir js/parc/zones/z03_promenade.js : l'optimiseur de la scène les
  // souderait sinon d'une tranche à l'autre)
  g.traverse((o) => { if (o.isMesh && ['feuillage', 'frange'].includes(o.material.userData.kit)) o.userData.feuillage = true; });
  yield* K.fusionnerPas(g, budget);           // (lot C6 : en tranches)
  g.traverse((o) => { if (o.isMesh) o.userData.nofuse = true; });
  // la circulation, après la fusion (elle bouge)
  g.add(circulation(K, za <= -135 ? Z_LOIN[0] - 1 : za, zb >= 200 ? Z_LOIN[1] + 1 : zb, ctx.animer));
}

// La silhouette d'une tranche : trottoir, chaussée, bande plantée et perré en quatre nappes grossières, le parapet
function* silhouetteTranche(ctx, za, zb) {
  const K = ctx.kit, g = ctx.groupe;
  const [z0, z1] = etendue(za, zb);
  const lot = new K.Lot('silhouette Z19');
  nappe(K, lot, 'asphalte#sol', xTrottoir, X.loin, z0, z1, { nX: 2, pas: 24, dy: 0.04, couleur: (x, z, t) => { const f = t < 0.18 ? 1.05 : 0.68; return [f, f, f]; } });
  nappe(K, lot, 'moellons', (z) => X.parapet(z) + 0.2, (z) => X.seine(z) + 1.2, z0, z1, { nX: 3, pas: 24, dy: 0.04, tuile: 1.6 });
  nappe(K, lot, 'taille', (z) => X.parapet(z) - 0.2, (z) => X.parapet(z) + 0.2, z0, z1, { nX: 1, pas: 24, dy: 1.05 });
  yield;
  g.add(lot.maillages('silhouette Z19'));
  g.traverse((o) => { if (o.isMesh) o.userData.nofuse = true; });
}

// ============================================================================================ la Seine et l'île
// LE LOINTAIN MOINS VOILÉ. Le brouillard du parc (60 à 300 m, js/court.js) est réglé pour le plateau ; à 150-200 m,
// il noyait l'île à moitié dans le blanc, là où les photos 171717 et 171718 la montrent nette : arbres vert sombre,
// façades blanches, toits gris. Les matériaux de l'île n'en prennent qu'un septième (il suit toujours la météo).
// La Seine devant elle en prend un quart (relecture du lot B1) : avec tout le brouillard, à 150-200 m du belvédère et de
// la promenade, l'eau sortait blanche comme le ciel — une bande laiteuse sous une île nette —, là où la photo j1 la
// montre vert-de-gris, sombre sous la rive boisée.
const BRUME_ILE = 0.14, BRUME_SEINE = 0.25;
// `emission` : la part de sa propre couleur qu'un matériau renvoie en plus (la lumière diffuse du ciel sur une façade
// blanche tournée vers le parc, à contre-jour du couchant ; les façades de l'île, zone Z20, font de même).
function brumeAllegee(m, part = BRUME_ILE, emission = 0) {
  m.onBeforeCompile = (sh) => {
    if (emission) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
	totalEmissiveRadiance += diffuseColor.rgb * ${emission.toFixed(2)};`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor * ${part.toFixed(2)} );
#endif`);
  };
  m.customProgramCacheKey = () => 'brume ' + part.toFixed(2) + (emission ? ' émission ' + emission.toFixed(2) : '');
  return m;
}
// Le feuillage et le zinc de l'île : ceux du kit, à brume allégée (leurs textures sont recopiées à leur arrivée)
const _loin = new Map();
// (Ils passent APRÈS la brume d'horizon du ciel, comme les immeubles de l'île de la zone Z20 : l'anneau de brume de
// js/court.js, ramené à 240 m de l'œil en balade et dessiné après tout ce qui est opaque, voilait aux quatre cinquièmes
// tout ce qui est au-delà — vues du belvédère, les couronnes du bout de l'île sortaient en nuages blancs. Dessinés dans
// la passe transparente, opaques quand même, juste après lui : voir APRES_BRUME.)
const APRES_BRUME = -3.9;
function lointain(K, nom) {
  if (_loin.has(nom)) return _loin.get(nom);
  const base = K.materiau(nom), m = brumeAllegee(base.clone());
  m.transparent = true; m.depthWrite = true; m.opacity = 1;
  m.name = 'zone quai · ' + nom + ' de l’île';
  const copier = () => { for (const s of ['map', 'normalMap', 'aoMap', 'roughnessMap', 'metalnessMap']) m[s] = base[s]; };
  K.precharger([nom]).then(copier);
  _loin.set(nom, m);
  return m;
}
// L'ÎLE, TELLE QU'ON LA VOIT DU PARC (photos 171717, 171718 et j1). Une première version rangeait un mur continu
// d'arbres tous pareils, de 17 à 25 m, sur la rive, et les immeubles 42 à 88 m derrière : on ne voyait plus que leurs
// toits, et la rive faisait une file de sucettes (même hauteur, même boule, un fût clair sous chacune). Les photos
// montrent autre chose : des immeubles de quatre à huit niveaux assez près de l'eau, dont on voit les façades
// au-dessus et ENTRE des bouquets d'arbres vert sombre de hauteurs inégales, à peine plus hauts qu'elles par endroits.
//  - LES IMMEUBLES sont au pourtour (zone Z20, js/parc/zones/z20_pourtour.js, lot B11), d'après les relevés de R6 :
//    de z- à z+, un immeuble beige, les bureaux à mur-rideau de verre gris bleu, le long immeuble vitré hérissé
//    d'édicules, les immeubles beiges à attique de zinc, les beige gris à toits plats, les résidences blanches à
//    terrasses en gradins, et la rangée de peupliers d'Italie qui dépasse des toits ; ILE_IMMEUBLES dit où ils sont ;
//  - LA RIVE BOISÉE (ici) : des BOUQUETS de trois à six arbres (13 à 23 m, à la hauteur des toits) séparés de TROUÉES
//    où les façades se montrent en entier ; derrière eux, une rangée plus clairsemée, et quelques grands arbres entre
//    les immeubles, au fond ; à leur pied, des buissons ronds le long de la berge.
// Tout se tire d'un hasard fixe (hache) : les deux joueurs voient la même île.
const hache = (k, s) => Math.abs(Math.sin(k * s + 1.3) * 43758.5453) % 1;
// Les arbres de l'île : [x, z, h, R, f, clarté]. Les bouquets suivent un bruit lent le long de la rive (une trouée là où
// il tombe bas) ; la hauteur, un autre, plus rapide (des bouquets hauts, d'autres bas). De z -260 à 400 : au-delà, le
// brouillard et camera.far les effacent de partout dans le parc (§ 3.6). Le rang du fond, entre les immeubles, est
// clairsemé (on n'en voit que le haut) : l'île tient en 70 000 triangles de feuillage.
const Z_ILE = [-260, 400];
const ARBRES_ILE = (() => {
  const l = [], lent = (z, s) => 0.5 + 0.3 * Math.sin(z * 0.043 + s) + 0.2 * Math.sin(z * 0.11 + 2 * s);
  for (let z = Z_ILE[0], k = 0; z < Z_ILE[1]; z += 6.5, k++) {
    const a = hache(k, 12.1), b = hache(k, 4.7), c = hache(k, 9.3), bouquet = lent(z, 0.7), haut = lent(z, 2.9);
    if (bouquet < 0.3 && a < 0.8) continue;                                    // une trouée : les façades en entier
    const h = 13 + 10 * haut * (0.75 + 0.5 * b);
    l.push([X.ile(z) + 3 + 5 * a, z + (b - 0.5) * 3, h, 3.8 + 2.4 * c, 0.8 + 0.8 * b, 0.32 + 0.12 * c]);
    // la seconde rangée, plus clairsemée, un peu plus haute ; et au fond, entre les immeubles, de grands arbres
    if (c > 0.45 && bouquet > 0.45) l.push([X.ile(z) + 11 + 6 * b, z + 3.2, h + 2 + 3 * a, 3.8 + 1.8 * a, 3, 0.3 + 0.1 * b]);
    if (a > 0.85) l.push([X.ile(z) + 45 + 25 * c, z + 1.5, 13 + 6 * b, 4.5 + 2 * c, 3.5, 0.34 + 0.1 * a]);
  }
  // (pas d'arbre planté dans un immeuble : son pied à moins de 2 m d'une façade, il saute)
  const dedans = ([x, z]) => ILE_IMMEUBLES.some((I) => Math.abs(x - I.x) < I.d / 2 + 2 && Math.abs(z - I.z) < I.w / 2 + 2);
  return l.filter((A) => !dedans(A));
})();
function* construireSeine(ctx, detail) {
  const K = ctx.kit, g = ctx.groupe, budget = ctx.budget || (() => false);
  // L'EAU : de la berge du parc (au pied du perré) à la rive de l'île, et loin en amont et en aval. Vert-de-gris sombre
  // (photo j1), un reflet du ciel retenu (le ciel de la carte d'environnement est celui du plateau : à 150 m, au ras de
  // l'eau, il blanchissait toute la surface, là où l'eau reflète surtout la rive boisée de l'île) et le brouillard
  // allégé. (Le matériau de l'eau du kit est rangé sous sa couleur : celui-ci n'est qu'à la Seine.)
  const poly = [[X.seine(-400) - 2.5, -400], [X.ile(-400) + 3, -400], [X.ile(520) + 3, 520], [X.seine(520) - 2.5, 520]];
  const eau = K.eauBassin({ poly, y: Y_EAU, couleur: '#3f5a4d' });
  for (const m of eau.children) {
    const me = m.material;
    if (!me.userData.seine) {
      me.userData.seine = true; me.envMapIntensity = 0.5; me.clearcoat = 0.3; me.roughness = 0.22;
      brumeAllegee(me, BRUME_SEINE); me.needsUpdate = true;
    }
  }
  g.add(eau);
  // L'ÎLE : la rive (un liseré de pierre claire au ras de l'eau, j1, puis un talus planté, sombre sous les arbres), le
  // sol, les arbres (les immeubles : zone Z20). (En silhouette, pas de liseré : trois appels en tout, l'eau, le sol et
  // le feuillage.)
  const lot = new K.Lot('île'), lotF = new K.Lot('île feuillage');
  const pp = detail ? lot.part('taille') : null, p = lot.part('gazon#sol'), yI = Y_EAU + 4.3;
  let prev = null, prevP = null;
  // (relecture du lot B11, d'après Z20-08 : de l'eau vers les immeubles, le talus planté SOMBRE — à l'ombre des
  // couronnes, à contre-jour —, le petit mur de quai de pierre grise (≈ 1,3 m, SYNTHESE, Z19) et le chemin clair à son
  // sommet, puis la pelouse. Un seul talus vert clair de 5 m, éclairé par tout le ciel, faisait une bande de gazon
  // lumineuse sous les arbres, vue du belvédère : une pelouse de parc là où la photo montre une rive boisée et son mur.
  // Le mur se dessine en couleurs de sommets, dans la même pièce que le sol : aucun appel de plus.)
  // (le talus : couleur très sombre et normale presque couchée vers le parc — sous un septième de brouillard, en
  // linéaire, une surface tournée vers le ciel restait claire quelle que soit sa couleur)
  const SOMBRE = [0.15, 0.19, 0.12], MUR = [0.78, 0.75, 0.66], CHEMIN = [0.72, 0.68, 0.58], PELOUSE = [0.38, 0.44, 0.32];
  for (let z = -400; z <= 520; z += 20) {
    const x0 = X.ile(z);
    const rp = pp && [[x0 - 1.4, Y_EAU - 0.3], [x0 - 1.1, Y_EAU + 0.9], [x0 + 0.6, Y_EAU + 1.0]].map(([x, y]) => lot.s(pp, x, y, z, -0.6, 0.8, 0, z / 2, y / 2, [0.78, 0.76, 0.7]));
    // [x, y, normale x, normale y, couleur] : le pied (dans l'eau en silhouette, sur le liseré en détail), le haut du
    // talus, le pied et le haut du mur (sommets doublés : le mur garde sa couleur), le chemin, la pelouse
    const r = [[pp ? x0 + 0.6 : x0 - 1.4, pp ? Y_EAU + 1.0 : Y_EAU - 0.3, -0.88, 0.47, SOMBRE], [x0 + 3.6, yI - 1.35, -0.88, 0.47, SOMBRE],
      [x0 + 3.62, yI - 1.35, -0.99, 0.12, MUR], [x0 + 3.8, yI - 0.04, -0.99, 0.12, MUR], [x0 + 3.84, yI, 0, 1, CHEMIN], [x0 + 6.4, yI, 0, 1, CHEMIN],
      [x0 + 6.6, yI, 0, 1, PELOUSE], [x0 + 160, yI, 0, 1, PELOUSE]].map(([x, y, nx, ny, c]) => lot.s(p, x, y, z, nx, ny, 0, x / 3, z / 3, c));
    if (prevP) for (let i = 0; i < 2; i++) lot.quad(pp, prevP[i], prevP[i + 1], rp[i + 1], rp[i]);
    if (prev) for (let i = 0; i < r.length - 1; i++) lot.quad(p, prev[i], prev[i + 1], r[i + 1], r[i]);
    prev = r; prevP = rp;
  }
  yield;
  // (les immeubles de l'île : zone Z20)
  // LA RIVE BOISÉE (voir ARBRES_ILE). Vue de 150 m au moins : des lobes grossiers (80 triangles), cinq à sept par
  // arbre ; en silhouette, une bande de feuillage qui suit les mêmes bouquets.
  if (detail) {
    for (let i = 0; i < ARBRES_ILE.length; i++) {
      const [x, z, h, R, f, t] = ARBRES_ILE[i];
      arbreIle(K, lotF, x, yI, z, h, R, f, 183, t);
      if (i % 12 === 11 && budget()) yield;
    }
    // les buissons de la berge : des masses rondes de 2 à 5 m, serrées au pied des couronnes, avec des trous. (Une
    // bande continue de 4 à 8 m, plus haute que l'œil du promeneur, faisait un mur vert au sommet plat sur lequel les
    // arbres semblaient posés.)
    for (let z = Z_ILE[0], k = 0; z <= Z_ILE[1]; z += 5, k++) {
      const a = hache(k, 21.7), b = hache(k, 8.3);
      if (a < 0.18) continue;
      const sx = 2.2 + 1.8 * b, sy = 1.6 + 2.4 * a * b + 0.8 * a;
      const m4 = new THREE.Matrix4().makeRotationY(a * 6.28).scale(new THREE.Vector3(sx, sy, sx * (0.8 + 0.4 * a))).setPosition(X.ile(z) + 2.5 + 2.5 * a, yI + sy * 0.55, z + (b - 0.5) * 2);
      const t = 0.34 + 0.1 * b;
      lotF.geo('feuillage', lobe(K, k % 3, 1), m4, { uvBoite: true, tuile: 1.4, couleur: (px, py, pz, nx, ny) => { const l = 0.55 + 0.45 * lisse(-0.8, 0.9, ny); return [0.82 * t * l, 0.92 * t * l, 0.62 * t * l]; } });
      if (k % 24 === 23 && budget()) yield;
    }
  } else {
    // EN SILHOUETTE (du belvédère et du haut du parc, à 200 m et plus) : les mêmes arbres qu'en détail (ARBRES_ILE),
    // deux lobes chacun et sans fût — des couronnes de hauteurs inégales, avec les trouées où les immeubles de l'île
    // (zone Z20) se montrent, comme sur j1. (La bande continue d'avant, un talus vert au faîte lisse, cachait le bas de
    // leurs façades d'un bout à l'autre : lot B11.)
    // (trois lobes : le cœur, un plus haut, un de côté ; un fût sombre dessous, du même matériau, pour qu'elles ne
    // flottent pas au-dessus de la rive)
    const FUT = [0.06, 0.055, 0.05];
    for (const [x, z, h, R, f, t] of ARBRES_ILE) {
      const HV = (h - f) / 2, yc = yI + f + HV * 0.9, a = (k) => K.alea(x, z, 183 + k), ev = Math.min(1.25, Math.max(0.75, HV / R)) * 0.95;
      const couleur = (px, py, pz, nx, ny) => { const l = 0.62 + 0.38 * lisse(-0.8, 0.9, ny); return [0.82 * t * l, 0.92 * t * l, 0.62 * t * l]; };
      lotF.geo('feuillage', lobe(K, 0, 1), new THREE.Matrix4().makeRotationY(a(1) * 6.28).scale(new THREE.Vector3(R * 0.92, R * ev, R * 0.92)).setPosition(x, yc, z), { uvBoite: true, tuile: 1.4, couleur });
      lotF.geo('feuillage', lobe(K, 1, 0), new THREE.Matrix4().makeRotationY(a(2) * 6.28).scale(new THREE.Vector3(R * 0.62, R * 0.62 * ev, R * 0.62)).setPosition(x + (a(3) - 0.5) * R, yc + HV * 0.5, z + (a(4) - 0.5) * R), { uvBoite: true, tuile: 1.4, couleur });
      lotF.geo('feuillage', lobe(K, 2, 0), new THREE.Matrix4().makeRotationY(a(5) * 6.28).scale(new THREE.Vector3(R * 0.6, R * 0.55 * ev, R * 0.6)).setPosition(x + (a(6) - 0.5) * R * 0.8, yc - HV * 0.35, z + (a(7) > 0.5 ? 0.55 : -0.55) * R), { uvBoite: true, tuile: 1.4, couleur });
      lotF.tour('feuillage', [[0.32, 0], [0.24, f + HV * 0.6]], 5, new THREE.Matrix4().makeTranslation(x, yI - 0.2, z), { couleur: FUT, tuile: 1.4 });
    }
  }
  if (detail) {
    // LA PÉNICHE amarrée le long du perré (photo 6) : coque noire de 38,5 x 5,05 m (Freycinet), bordé rouge, timonerie
    // blanche à l'arrière, bâche verte sur la cale
    const xP = X.seine(129) + 3.3, zP = 129;
    const coque = [[-2.52, 0], [2.52, 0], [2.52, 1.35], [-2.52, 1.35]];
    lot.prisme('peinture', coque, [[xP, Y_EAU - 0.8, zP - 19.25], [xP, Y_EAU - 0.8, zP + 19.25]], { vertical: true, bande: true, couleur: [0.07, 0.07, 0.075] });
    lot.prisme('peinture', [[-2.53, 1.2], [2.53, 1.2], [2.53, 1.42], [-2.53, 1.42]], [[xP, Y_EAU - 0.8, zP - 19.3], [xP, Y_EAU - 0.8, zP + 19.3]], { vertical: true, bande: true, couleur: [0.55, 0.1, 0.08] });
    lot.prisme('peinture', [[-2.1, 1.35], [2.1, 1.35], [1.6, 2.4], [-1.6, 2.4]], [[xP, Y_EAU - 0.8, zP - 12], [xP, Y_EAU - 0.8, zP + 15]], { vertical: true, bande: true, couleur: [0.2, 0.33, 0.24] });
    lot.boite('peinture', 4.2, 2.3, 4.5, pose(xP, Y_EAU + 0.55 + 1.15, zP - 16.4), { bande: true, couleur: [0.9, 0.9, 0.87], chanfrein: 0.05 });
    lot.boite('peinture', 4.3, 0.9, 4.6, pose(xP, Y_EAU + 0.55 + 1.6, zP - 16.4), { bande: true, couleur: [0.12, 0.14, 0.16] });
  }
  yield;
  const il = lot.maillages('île');
  // (le sol de l'île et le liseré de pierre aussi, à brume allégée : avec tout le brouillard, la rive sortait en bande
  // blanche sous les couronnes)
  for (const m of il.children) for (const nom of ['ardoise', 'gazon', 'taille']) if (m.material === K.materiau(nom)) { m.material = lointain(K, nom); m.renderOrder = APRES_BRUME; }
  g.add(il);
  const f = lotF.maillages('île feuillage');
  for (const m of f.children) { m.userData.feuillage = true; if (m.material === K.materiau('feuillage')) { m.material = lointain(K, 'feuillage'); m.renderOrder = APRES_BRUME; } }
  g.add(f);
  g.traverse((o) => { if (o.isMesh && ['feuillage', 'frange'].includes(o.material.userData.kit)) o.userData.feuillage = true; });
  yield* K.fusionnerPas(g, budget);           // (lot C6 : en tranches)
  // (à 150 m et plus, hors de la carte d'ombre : rien n'y porte d'ombre)
  g.traverse((o) => { if (o.isMesh) { o.userData.nofuse = true; o.castShadow = false; } });
  // (lot R1) LES BLOCS DE L'ÎLE, longs de 920 m (sphères de 400 à 470 m : jamais écartés du cadre, toujours dessinés en
  // entier, feuillage compris), découpés en tranches de 70 m le long de la rive dans un BatchedMesh (js/monde_vue.js) :
  // three écarte les tranches hors du cadre, le reste se dessine toujours en un appel par matériau. L'eau reste d'un bloc
  // (quelques triangles, animée). En tranches de temps (relecture du lot R1 : d'un bloc, 120 à 180 ms d'à-coup).
  const blocs = [];
  g.traverse((o) => { if (o.isMesh && !o.isBatchedMesh && !o.userData.dynamique) blocs.push(o); });
  for (const o of blocs) {
    const b = yield* enTranchesPas(o, 70, 'z', budget);
    if (b === o) continue;
    o.parent.add(b); o.parent.remove(o); o.geometry.dispose();
  }
}

// ============================================================================================ la zone
export default {
  id: 'Z19', nom: 'Quai, berge, Seine et île de la Jatte',
  emprise: [[16, -135], [160, -135], [160, 200], [16, 200]],
  morceaux: [
    ...TRANCHES.map(([id, za, zb]) => ({ id, boite: [16, za, 60, zb],
      construire: (ctx) => construireTranche(ctx, za, zb), silhouette: (ctx) => silhouetteTranche(ctx, za, zb) })),
    // la Seine au large et l'île : vues de loin seulement, la silhouette est presque le détail
    { id: 'Z19s', boite: [44, -135, 160, 200], construire: (ctx) => construireSeine(ctx, true), silhouette: (ctx) => construireSeine(ctx, false) },
  ],
  // Rien à déclarer : le quai est hors du parc (grille, portillons fermés : obstacles de monde.json), le parapet est
  // dans monde.json (garde_parapet_quai).
  obstacles() {},
};
