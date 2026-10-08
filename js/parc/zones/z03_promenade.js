// =====================================================================
//  ZONE Z03 : LA BANDE DU QUAI ET LA PROMENADE BASSE (lot B1 du parc entier)
// =====================================================================
// Conception, § 1.3 (Z03) et § 4 (lot B1). La bande de terrain entre le plateau (et, plus loin, la terrasse du bassin
// et les jardins bas) et la grille du quai, de la sortie nord-est (portillon du quai, z ≈ -99) jusqu'au portillon
// sud-ouest (z ≈ 185). Tout y suit la PROMENADE BASSE, l'axe cyclable principal du parc : 3 m d'asphalte rouge
// délavé, presque plate (-0,8 à -1,4), qui descend à 8 % vers la rue au bout nord-est (gabarits « promenade_basse »
// et « descente_ne » de tools/parc/gabarits.json, dont on recopie ici les tracés).
//
// CE QU'ON Y VOIT (photos 171717 et 171718 du 28/09 depuis le bout du mur, 1000051339 et 343 depuis le plateau,
// photo 3 du drone ; orthophoto du jeu) :
//  - LE DOUBLE RIDEAU D'ARBRES TAILLÉS : deux rangées de tilleuls palissés (rangées OSM 1222927751 à 54), fûts nus
//    jusqu'à 2,8 m au-dessus de l'allée, puis une masse de feuillage taillée en boîte de 4 à 5 m de large et de 8 m de
//    haut ; vues d'en haut (ortho), les deux couronnes se touchent au-dessus de l'allée : on marche dans un tunnel vert.
//    Au nord-est, la rangée intérieure est celle que js/court_parc.js dessine déjà le long du plateau (tilleulsEnRideau,
//    x = 7,7, de z 7 à -45) : on la PROLONGE jusqu'à -99,5 (elle part de -42, son bout noyé dans le sien) ; la rangée
//    extérieure (x ≈ 13,7 à 14,5) va de z 10 à -91.
//    Au sud-ouest (z 60 à 178), les deux rangées encadrent l'allée à x ≈ 6 et 11. Entre les deux (z 8 à 60), en face
//    de la terrasse du bassin, pas d'arbres : une haie basse sur la crête du talus, et la vue sur la Seine.
//  - LE TALUS du quai (50 %, 2 m) planté d'arbustes, jusqu'au MURET et à la GRILLE NOIRE À BARREAUX (x ≈ 16), avec le
//    portillon nord-est, fermé (v1) ;
//  - les bancs bruns à cinq lattes de l'allée du quai (photos 1000051339 et 343 : on les voit de dos, derrière la haie
//    du plateau, tournés vers la Seine), des corbeilles, des candélabres ;
//  - au bout nord-est, la haie qui sépare la promenade du parking de l'immeuble (clôture « limite_ne » de monde.json).
//
// LES ARBRES : la conception (§ 3.3, règle 4) veut qu'ils viennent de arbres.bin. Les rangées du quai y étaient
// plantées comme des tilleuls libres ; ce sont des arbres TAILLÉS (des haies sur échasses, comme les haies et les ifs
// taillés que les zones dessinent elles-mêmes) : gabarits.json les retire de arbres.bin (arbres.exclure, « rideaux
// taillés de la promenade ») et cette zone les dessine, fûts et feuillage, et déclare leurs fûts comme obstacles.
//
// LE FEUILLAGE DES RIDEAUX est celui du rideau du plateau (js/court_parc.js, tilleulsEnRideau : photos 1000051343 et
// 185558, de grandes feuilles de mûrier-platane en grappes, validées photo par photo) : mêmes cartes de feuilles, même
// matériau (rideauQuaiPourZones), même écorce grise. On passe du rideau du plateau à ses prolongements sans couture.
//
// Hauteurs : TOUT passe par Monde.sol (kit.sol, kit.poserSurSol). Matériaux : ceux du kit (asphalte rouge, béton,
// feuillage, peinture, pierre de taille, bois, verre), plus deux matériaux propres, les feuilles et l'écorce du rideau
// du plateau (partagés avec Z19). Aucun Math.random : le hasard est celui du parc (kit.alea), lié à la position.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Monde } from '../../monde.js';
import { rideauQuaiPourZones } from '../../court_parc.js';

// ============================================================================================ les données
// La promenade basse et sa descente nord-est, d'un seul tenant, du bout nord-est (la rue, z = -111) au portillon
// sud-ouest : les tracés des gabarits « descente_ne » et « promenade_basse » (tools/parc/gabarits.json), mis bout à
// bout, z croissant.
export const TRACE_PROMENADE = [[10.0, -111.0], [10.0, -86.0], [10.6, -57.3], [11.1, -30.8], [10.4, 0.0], [10.0, 14.7],
  [9.9, 23.6], [9.1, 47.8], [9.0, 56.8], [8.0, 165.3], [-1.4, 185.3]];
const LARGEUR = 3.0;
// La grille noire du quai sur son muret (monde.json > clotures > grille_quai, déjà trouée au portillon nord-est) ; le
// bout ouest du portillon sud-ouest (x < -0,4) et ce portillon sont ceux de la zone Z09 (théâtre, entrée sud-ouest).
const GRILLE = [
  [[-0.4, 185.33], [2.12, 185.33], [13.04, 167.23], [13.96, 159.41], [16.47, -60.23], [16.28, -89.08], [10.88, -97.72]],
  [[9.29, -100.26], [6.3, -105.05]],
];
// Le portillon du quai, bout nord-est (monde.json > portillons > PQN), dans le trou de la grille
const PORTILLON_NE = { x: 10.085, z: -98.99, cap: 302, largeur: 2.8 };
// La haie de la limite nord-est, le long du parking de l'immeuble (monde.json > clotures > limite_ne, sa partie qui
// borde la promenade ; son obstacle est déjà dans monde.json)
const LIMITE_NE = [[7.0, -59.9], [6.8, -75.0], [6.3, -89.0], [6.3, -105.0]];

// LES RIDEAUX TAILLÉS. `troncs` : les pieds (rangées OSM plantées tous les 5,7 m, comme les plaçait arbres.bin ; la
// rangée intérieure nord-est est prolongée jusqu'au portillon en suivant l'allée, à 2 m de son axe) ; `axe` : décalage
// en x de l'axe du feuillage par rapport aux pieds ; `larg` : largeur de la boîte ; `debut`, `fin` : ses bouts (z) ;
// `bas`, `haut` : dessous et faîte au-dessus du sol le plus haut sous la couronne (l'allée) ; `graine` : leur hasard ;
// `sansBout` : le bout laissé ouvert (facultatif).
// La rangée intérieure nord-est entre dans le rideau du plateau, qui finit net à z = -45 (son dernier fût est à -44,6) :
// elle y commence à z = -42, par un bout arrondi et couvert de feuilles, noyé dans le feuillage du plateau. (Elle y
// entrait d'un mètre, bout OUVERT : de la promenade, sous le rideau, on voyait par l'ouverture le dessous du cœur, une
// plaque sombre suspendue à 2,5 m — relecture du lot B1.)
export const RIDEAUX = [
  { nom: 'rangée intérieure nord-est', troncs: [[8.6, -50.9], [8.6, -56.6], [8.55, -62.3], [8.45, -68.0], [8.3, -73.7],
    [8.15, -79.4], [8.05, -85.1], [8.0, -90.8], [8.0, -96.3]],
  axe: -0.2, larg: 4.2, debut: -42.0, fin: -99.5, bas: 2.8, haut: 8.6, hautDebut: 9.3, graine: 11 },
  { nom: 'rangée extérieure nord-est', troncs: [[13.6, 7.8], [13.7, 2.1], [13.7, -3.6], [13.8, -9.3], [13.8, -15.0], [13.9, -20.7],
    [13.9, -26.4], [14.0, -32.1], [14.0, -37.8], [14.1, -43.5], [14.1, -49.2], [14.2, -54.9], [14.2, -60.6], [14.3, -66.3],
    [14.3, -72.0], [14.4, -77.7], [14.4, -83.4], [14.5, -89.1]],
  axe: -0.15, larg: 4.6, debut: 10.2, fin: -91.6, bas: 2.8, haut: 8.4, graine: 23 },
  { nom: 'rangée intérieure sud-ouest', troncs: [[6.6, 60.9], [6.6, 66.6], [6.6, 72.3], [6.5, 78.0], [6.5, 83.7], [6.4, 89.4],
    [6.4, 95.1], [6.3, 100.8], [6.3, 106.5], [6.2, 112.2], [6.2, 117.9], [6.2, 123.6], [6.1, 129.3], [6.1, 135.0], [6.0, 140.7],
    [6.0, 146.4], [5.9, 152.1], [5.9, 157.8], [5.8, 163.5]],
  axe: -0.1, larg: 4.4, debut: 58.3, fin: 166.2, bas: 2.8, haut: 8.2, graine: 37 },
  { nom: 'rangée extérieure sud-ouest', troncs: [[11.6, 59.7], [11.5, 65.4], [11.5, 71.1], [11.4, 76.8], [11.3, 82.5], [11.2, 88.2],
    [11.2, 93.9], [11.1, 99.6], [11.0, 105.3], [10.9, 111.0], [10.8, 116.7], [10.8, 122.4], [10.7, 128.1], [10.6, 133.8],
    [10.5, 139.5], [10.4, 145.2], [10.4, 150.9], [10.3, 156.6], [10.2, 162.3], [9.3, 167.8], [6.8, 172.9], [4.4, 178.1]],
  axe: 0.2, larg: 4.4, debut: 57.0, fin: 180.4, bas: 2.8, haut: 8.2, graine: 49 },
];

// Les bancs bruns (z), côté parc de l'allée, tournés vers la Seine ; les quatre premiers sont ceux que l'ancienne allée
// du quai portait au droit du plateau (photos 1000051339 et 343), les autres entre deux fûts du rideau intérieur.
// (en face de la terrasse du bassin, z 20 à 55, le bord de l'allée est celui de la zone Z05 : pas de banc)
const BANCS = [-93.55, -76.55, -59.45, -36.0, -20.0, -14.0, -2.1, 8.4, 69.45, 92.25, 115.05, 137.85, 154.95];
// Les lanternes, côté quai de l'allée, à mi-chemin entre deux fûts du rideau extérieur : des BORNES (lanterne sur un
// fût d'un mètre) sous les rideaux, dont le feuillage descend à 2,8 m au-dessus de l'allée ; des candélabres à crosse
// là où l'allée est à découvert, en face de la terrasse du bassin.
const LAMPES = [[-86.25, 'borne'], [-63.45, 'borne'], [-40.65, 'borne'], [-17.85, 'borne'], [4.95, 'borne'], [26, 'crosse'],
  [44, 'crosse'], [68.25, 'borne'], [91.05, 'borne'], [113.85, 'borne'], [136.65, 'borne'], [159.45, 'borne']];

// Les tronçons PLEINS de la haie du plateau (haieQuai, js/court_parc.js, TRONCONS : z0, z1, hauteur) : on leur fait un dos
const DOS_HAIE = [[-45.6, -33.4, 1.0], [-32.3, -21.9, 1.03], [-20.8, -12.2, 1.0], [-7.0, -2.6, 1.0], [-0.8, 5.2, 1.02]];

// Les morceaux (monde.json > morceaux, Z03a à Z03g : 42,6 m chacun). La boîte déborde en x vers l'ouest au bout
// sud-ouest, où l'allée tourne vers le portillon.
const MORCEAUX = [['Z03a', -111, -68.43], ['Z03b', -68.43, -25.86], ['Z03c', -25.86, 16.71], ['Z03d', 16.71, 59.29],
  ['Z03e', 59.29, 101.86], ['Z03f', 101.86, 144.43], ['Z03g', 144.43, 187]];

// ============================================================================================ outils de lignes
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function longueur(l) { let s = 0; for (let i = 1; i < l.length; i++) s += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]); return s; }
// Les morceaux d'une ligne 2D [[x, z], ...] compris entre za et zb (en z). Une ligne qui sort puis rentre donne
// plusieurs morceaux. Les bouts coupés tombent pile sur za ou zb : deux morceaux de zone voisins se raccordent.
export function decouper(ligne, za, zb) {
  const out = []; let cur = null;
  for (let i = 0; i < ligne.length - 1; i++) {
    const A = ligne[i], B = ligne[i + 1], dz = B[1] - A[1];
    let t0 = 0, t1 = 1;
    if (Math.abs(dz) < 1e-9) { if (A[1] < za || A[1] > zb) { cur = null; continue; } } else {
      let ta = (za - A[1]) / dz, tb = (zb - A[1]) / dz;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(0, ta); t1 = Math.min(1, tb);
      if (t0 > t1) { cur = null; continue; }
    }
    const P = (t) => [A[0] + (B[0] - A[0]) * t, A[1] + dz * t];
    if (!cur || t0 > 1e-9) { cur = [P(t0)]; out.push(cur); }
    cur.push(P(t1));
    if (t1 < 1 - 1e-9) cur = null;
  }
  return out.filter((m) => m.length >= 2 && longueur(m) > 0.05);
}
// x de la ligne (monotone en z) à l'ordonnée z, prolongée aux bouts
export function xSur(ligne, z) {
  const L = ligne[0][1] <= ligne[ligne.length - 1][1] ? ligne : [...ligne].reverse();
  if (z <= L[0][1]) return L[0][0];
  for (let i = 1; i < L.length; i++) if (z <= L[i][1]) { const [x0, z0] = L[i - 1], [x1, z1] = L[i]; return z1 > z0 ? x0 + (x1 - x0) * (z - z0) / (z1 - z0) : x1; }
  return L[L.length - 1][0];
}

// ============================================================================================ les matériaux du rideau
// Les feuilles et l'écorce du rideau du plateau (js/court_parc.js, rideauQuaiPourZones) : un jeu par construction du
// parc (ctx.K, le kit de js/court.js, est neuf à chaque buildArena), partagé par tous les morceaux de Z03 et de Z19.
const _rideau = new WeakMap();
export function materiauxRideau(ctx) {
  let r = _rideau.get(ctx.K);
  if (!r) { r = rideauQuaiPourZones(ctx.K); _rideau.set(ctx.K, r); }
  return r;
}
// Le maillage des cartes de feuilles d'un morceau (voir Cartes) : normales ramenées à l'ombre du couchant (comme le
// rideau du plateau, aLOmbre : le soleil bas du parc ne les allume pas en lanternes), ombre découpée, déclaré avec le
// feuillage (la passe de normales de l'occlusion ambiante l'ignore), protégé de la fusion (un seul maillage).
export function feuillesRideau(ctx, RQ, C, nom) {
  if (!C.n) return null;
  const m = new THREE.Mesh(RQ.aLOmbre(C.geometrie(), 0.0, 0.25), RQ.feuilles);
  m.name = nom; m.castShadow = false; m.receiveShadow = false; m.customDepthMaterial = RQ.feuilles.userData.ombre;
  m.position.x = Monde.dx;
  m.userData.feuillage = true; m.userData.nofuse = true;
  // (avec le chargement par morceaux, lot A5, c'est son registre des plans découpés qui l'inscrit et le retire avec le
  // morceau : la liste des feuillages déclarés, jamais vidée, garderait sinon chaque morceau libéré pour toute la partie)
  if (!ctx.scene.userData.registreDecoupes) RQ.declarerFeuillage(ctx.scene, m);
  return m;
}

// LES CARTES DE FEUILLES : des plans d'un mètre et quelque, accumulés dans des tableaux (quatre sommets chacun), puis
// UN maillage par morceau. Chaque carte est tournée comme celles du rideau du plateau (cap, tangage, roulis, dans
// l'ordre YXZ de three : le plan regarde d'abord +z) et éclairée comme elles (coudre, js/court_parc.js) : la normale de
// chaque sommet sort du CENTRE du volume, un peu relevée vers le ciel — la rangée s'éclaire comme un volume de
// feuilles, pas comme un tas de cartes —, et sa couleur fonce vers le cœur et le dessous (occlusion), avec une teinte
// par carte (7 % jaunies, 10 % bleutées). Tout le hasard vient de la position (alea) : deux joueurs voient les mêmes.
export class Cartes {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.col = []; this.idx = []; this.n = 0; }
  geometrie() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.n < 65536 ? new THREE.Uint16BufferAttribute(this.idx, 1) : new THREE.Uint32BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return g;
  }
}
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _mc = new THREE.Matrix4();
const COINS = [[-0.5, -0.5, 0, 0], [0.5, -0.5, 1, 0], [0.5, 0.5, 1, 1], [-0.5, 0.5, 0, 1]];
// (x, y, z) : le centre de la carte ; `s`, `sy` : sa taille ; `c` : [cx, cy, cz] centre du volume, `r` son rayon ; `t` :
// teinte de la carte ; `tt` : [r, g, b] sa couleur de famille ; `miroir` : la carte retournée (la tuile n'est pas
// symétrique, on varie ainsi les grappes)
export function carte(C, x, y, z, tangage, cap, roulis, s, sy, c, r, t, tt, miroir) {
  _e.set(tangage, cap, roulis); _mc.makeRotationFromEuler(_e);
  const e = _mc.elements, base = C.n;
  for (const [a, b, u, v] of COINS) {
    const px = x + e[0] * a * s + e[4] * b * sy, py = y + e[1] * a * s + e[5] * b * sy, pz = z + e[2] * a * s + e[6] * b * sy;
    const dx = px - c[0], dy = py - c[1], dz = pz - c[2], ny = dy + r * 0.45, l = Math.hypot(dx, ny, dz) || 1;
    const prof = Math.min(1, Math.hypot(dx, dy, dz) / r), haut = Math.min(1, Math.max(0, dy / r * 0.5 + 0.5));
    const k = t * (0.62 + 0.38 * prof) * (0.85 + 0.15 * haut);
    C.pos.push(px, py, pz); C.nor.push(dx / l, ny / l, dz / l); C.uv.push(miroir ? 1 - u : u, v);
    C.col.push(k * tt[0], k * tt[1], k * tt[2]);
  }
  C.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  C.n += 4;
}

// ============================================================================================ le rideau taillé
// LE FEUILLAGE D'UNE RANGÉE TAILLÉE, entre za et zb. Vue d'en haut (ortho, photo 3 du drone) c'est une boîte : les
// tilleuls sont palissés et taillés chaque hiver ; vue de dessous et de près (photos 1000051343, 171718), c'est un
// rideau de grandes feuilles en grappes, des rameaux qui retombent entre deux fûts, des pousses qui dépassent du faîte.
// Donc deux couches :
//  - LE CŒUR : la boîte (section en super-ellipse aux arêtes arrondies), rentrée de 35 cm, en feuillage sombre du kit
//    (la texture de petites feuilles, assombrie de moitié) : ce qu'on voit entre les cartes, jamais le ciel au travers ;
//  - LES CARTES DE FEUILLES du rideau du plateau, semées sur toute la surface de la boîte (3,4 par m², 1,1 à 1,5 m),
//    de 55 cm dedans à 12 cm dehors, tournées face au dehors à ±25° près ; sous la boîte, tournées vers le bas (on les
//    voit de la promenade) et qui pendent entre deux fûts ; sur le faîte, les pousses de l'année, étroites et dressées.
// Deux morceaux voisins se raccordent sans couture (tout se tire de la position). Les bouts sont arrondis, et couverts de
// cartes sur toute leur calotte (voir fermer). Générateur : il rend la main quand `budget()` le demande (lot A5).
function* feuillageRideau(K, lot, C, R, za, zb, mobile, budget) {
  const sol = K.sol, bruit = K.bruit, alea = K.alea;
  // l'axe du feuillage : les pieds, prolongés en ligne droite jusqu'aux deux bouts
  const pieds = [...R.troncs].sort((a, b) => a[1] - b[1]);
  const z0 = Math.min(R.debut, R.fin), z1 = Math.max(R.debut, R.fin);
  const axe = [[pieds[0][0] + R.axe, pieds[0][1]], ...pieds.slice(1).map((p) => [p[0] + R.axe, p[1]])];
  const ext = (A, B, z) => [A[0] + (B[0] - A[0]) * (z - A[1]) / (B[1] - A[1]), z];
  if (z0 < axe[0][1]) axe.unshift(ext(axe[0], axe[1], z0));
  if (z1 > axe[axe.length - 1][1]) axe.push(ext(axe[axe.length - 2], axe[axe.length - 1], z1));
  const W = R.larg / 2, N = 12, EXP = 5, tu = 1.7;
  const zPieds = pieds.map((p) => p[1]);
  const pres = (z) => { let b = 0; for (const zt of zPieds) b = Math.max(b, Math.exp(-(((z - zt) / 1.9) ** 2))); return b; };
  // le faîte : plus haut au début si demandé (raccord au rideau du plateau, plus haut), une ondulation lente
  const faite = (z) => (R.hautDebut ? R.haut + (R.hautDebut - R.haut) * (1 - lisse(0, 9, Math.abs(z - R.debut))) : R.haut)
    + 0.18 * Math.sin(z * 0.9 + R.graine) + 0.08 * Math.sin(z * 2.7);
  // la section unitaire (super-ellipse) : grossière pour le cœur, fine (128 points) pour semer les cartes
  const section = (n) => {
    const out = [];
    for (let k = 0; k <= n; k++) {
      const th = -Math.PI / 2 + (k / n) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
      out.push([Math.sign(c) * Math.pow(Math.abs(c), 2 / EXP), Math.sign(s) * Math.pow(Math.abs(s), 2 / EXP)]);
    }
    return out;
  };
  const prof = section(N), NF = 128, fin = section(NF);
  // Son abscisse curviligne, en mètres pour la section nominale : les cartes se sèment À LONGUEUR ÉGALE. (Semées à
  // angle égal, elles se serraient aux arêtes et laissaient le milieu du dessous presque nu : la super-ellipse y file
  // vite ; de la promenade, on voyait le cœur sombre par un trou de trois mètres.)
  const abs = [0];
  for (let k = 1; k <= NF; k++) abs.push(abs[k - 1] + Math.hypot((fin[k][0] - fin[k - 1][0]) * W, (fin[k][1] - fin[k - 1][1]) * (R.haut - R.bas) / 2));
  // un point de la section à la fraction u de son tour (en longueur) : [S, U, ns, nu, pu] (mètres, normale, hauteur)
  const pointSection = (u, Hl, sag, ech = 1) => {
    const L = u * abs[NF];
    let k = 0, a0 = 0, a1 = NF;
    while (a1 - a0 > 1) { const m = (a0 + a1) >> 1; if (abs[m] <= L) a0 = m; else a1 = m; }
    k = Math.min(NF - 1, a0);
    const a = (L - abs[k]) / Math.max(1e-9, abs[k + 1] - abs[k]), [ps0, pu0] = fin[k], [ps1, pu1] = fin[k + 1];
    const ps = ps0 + (ps1 - ps0) * a, pu = pu0 + (pu1 - pu0) * a;
    let ns = (pu1 - pu0) * Hl / 2, nu = -(ps1 - ps0) * W; const nl = Math.hypot(ns, nu) || 1; ns /= nl; nu /= nl;
    let U = (pu + 1) / 2 * Hl; U = Hl / 2 + (U - Hl / 2) * ech;
    if (pu < -0.3) U -= sag * (-pu - 0.3) / 0.7;                            // le dessous pend entre deux fûts
    return [ps * W * ech, U, ns, nu, pu];
  };
  const pc = lot.part('feuillage'), col = [0, 0, 0];
  const perimetre = (Hl) => 2 * (Hl + 2 * W) * 0.9;                       // (pour la densité des cartes)
  const bas = (x, z, sx, sz) => Math.max(sol(x, z), sol(x - sx * W * 0.75, z - sz * W * 0.75), sol(x + sx * W * 0.75, z + sz * W * 0.75)) + R.bas;
  // UNE STATION DU CŒUR : l'anneau de la section en (x, z), direction (dx, dz) ; `ech` : rétrécissement du bout
  const anneau = (x, z, dx, dz, ech = 1, penteBout = 0) => {
    const sx = -dz, sz = dx, yB = bas(x, z, sx, sz);
    const Hl = faite(z) - R.bas, sag = 0.42 * (1 - pres(z)), ids = [];
    for (let k = 0; k <= N; k++) {
      const [ps, pu] = prof[k % N === 0 && k > 0 ? 0 : k], [qs, qu] = prof[(k + 1) % N], [rs, ru] = prof[(k - 1 + N) % N];
      let ns = (qu - ru) * Hl / 2, nu = -(qs - rs) * W; const nl = Math.hypot(ns, nu) || 1; ns /= nl; nu /= nl;
      // (rentré de 35 cm : ce sont les cartes qui font la surface)
      const S = ps * (W - 0.35) * ech;
      let U = 0.35 + (pu + 1) / 2 * (Hl - 0.7); U = Hl / 2 + (U - Hl / 2) * ech;
      if (pu < -0.3) U -= sag * (-pu - 0.3) / 0.7;
      let nx = sx * ns + dx * penteBout, ny = nu, nz = sz * ns + dz * penteBout;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const px = x + sx * S, py = yB + U, pz = z + sz * S;
      const f = (0.36 + 0.2 * lisse(-0.9, 0.6, ny)) * (0.9 + 0.2 * bruit(px * 0.4, pz * 0.4 + py * 0.3, R.graine + 2));
      col[0] = 0.72 * f; col[1] = 0.8 * f; col[2] = 0.56 * f;
      ids.push(lot.s(pc, px, py, pz, nx, ny, nz, z / tu, (k / N) * 12 / tu, col));
    }
    return ids;
  };
  // LES CARTES d'une station : `n` cartes semées sur le pourtour de la section en (x, z) ; `ech` : le bout arrondi
  const semer = (x, z, dx, dz, n, ech = 1, penteBout = 0) => {
    const sx = -dz, sz = dx, yB = bas(x, z, sx, sz);
    const Hl = faite(z) - R.bas, sag = 0.42 * (1 - pres(z)), centre = [x, yB + Hl / 2, z], rV = Math.max(W, Hl / 2) + 0.2;
    // (tirage STRATIFIÉ autour de la section : la i-ième carte tombe dans le i-ième n-ième du tour, à un décalage près
    // propre à la station — une couverture régulière, sans alignement d'une station à l'autre)
    const phase = alea(x * 1.9, z * 1.9, R.graine + 99);
    for (let i = 0; i < n; i++) {
      const g = R.graine + i * 7, h = (k) => alea(x * 3.7 + i * 1.31, z * 3.7 - i * 0.77, g + k);
      const [S, U, ns, nu, pu] = pointSection((((i + 0.1 + 0.8 * h(1)) / n + phase) % 1), Hl, sag, ech);
      let nx = sx * ns + dx * penteBout, ny = nu, nz = sz * ns + dz * penteBout;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      // la profondeur : les deux tiers dans les 25 premiers centimètres, le reste jusqu'à 55 cm dedans
      const d = h(2) < 0.66 ? 0.12 - 0.37 * h(3) : -0.25 - 0.3 * h(3);
      const px = x + sx * S + nx * d, py = yB + U + ny * d, pz = z + sz * S + nz * d;
      const faiteCarte = pu > 0.55, dessous = pu < -0.55;
      let s = 1.1 + 0.4 * h(4), sy = s, tangage = -Math.asin(Math.max(-1, Math.min(1, ny))) + (h(5) - 0.5) * 0.88;
      const cap = Math.atan2(nx, nz) + (h(6) - 0.5) * 0.9;
      let roulis = (h(7) - 0.5) * 0.7, py2 = py;
      if (faiteCarte && h(8) < 0.55) {
        // une pousse de l'année, dressée sur le faîte : carte étroite, tête-bêche (les grappes montent au lieu de pendre)
        s = 0.34 + 0.18 * h(9); sy = 0.8 + 0.8 * h(10); tangage = (h(11) - 0.6) * 0.5; roulis = Math.PI + (h(12) - 0.5) * 0.8; py2 = py + sy * 0.3;
      } else if (dessous) {
        // sous la voûte : des rameaux qui pendent, plus bas entre deux fûts
        py2 = py - 0.25 * (1 - pres(z)) * h(13);
      }
      let t = 0.92 + 0.26 * h(14);
      if (d < -0.24) t *= 0.62;                                                    // le fond, dans l'ombre
      else if (!dessous && h(15) < 0.18) t *= 1.25;                                // des grappes au soleil
      if (faiteCarte) t *= 1.18;                                                   // le faîte prend le ciel
      const tir = h(16), tt = tir < 0.07 ? [1.08, 1.02, 0.8] : tir < 0.17 ? [0.94, 1.0, 1.04] : [1, 1, 0.96];
      carte(C, px, py2, pz, tangage, cap, roulis, s, sy, centre, rV, t, tt, h(17) < 0.5);
    }
  };
  const dens = mobile ? 2.0 : 3.4, PAS = 0.3;
  // LA CALOTTE D'UN BOUT, VUE DE FACE. Les cartes des anneaux qui rétrécissent (semer) ne tombent que sur leur POURTOUR :
  // de face — de la terrasse du bassin vers le bout du rideau extérieur (z = 10,2), de la promenade vers les bouts
  // nord-est et sud-ouest —, on voyait par le milieu le cœur sombre, une plaque d'un vert noir de quatre mètres sur
  // cinq, cerclée de cartes vues par la tranche (relecture du lot B1). On sème donc toute la calotte : un
  // demi-ellipsoïde de la section de la station (x, z) et de 1,45 m de flèche, en spirale (à aire égale), chaque carte
  // tournée selon la normale de la calotte, de 35 cm dedans à 12 cm dehors, comme celles du flanc.
  const calotte = (x, z, dx, dz, sens) => {
    const sx = -dz, sz = dx, yB = bas(x, z, sx, sz), Hl = faite(z) - R.bas, H2 = Hl / 2, F = 1.45;
    const centre = [x, yB + H2, z], rV = Math.max(W, H2) + 0.2, n = Math.round(Math.PI * W * H2 * dens * 1.8);
    const sag = 0.42 * (1 - pres(z));
    for (let i = 0; i < n; i++) {
      const h = (k) => alea(x * 2.3 + i * 0.71, z * 2.3 - i * 1.13, R.graine + 300 + k);
      const r = Math.sqrt((i + 0.5) / n) * 0.97, th = i * 2.39996 + (h(1) - 0.5) * 0.6;
      const a = r * Math.cos(th), b = r * Math.sin(th), c = Math.sqrt(Math.max(0, 1 - r * r));
      // la normale de l'ellipsoïde (a / W, b / H2, c / F), ramenée dans le repère du monde
      let nx = sx * a / W + dx * sens * c / F, ny = b / H2, nz = sz * a / W + dz * sens * c / F;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const d = h(2) < 0.66 ? 0.12 - 0.3 * h(3) : -0.2 - 0.15 * h(3);
      // (le dessous pend entre deux fûts, comme celui du cœur : voir anneau)
      const px = x + sx * a * (W - 0.1) + dx * sens * c * F + nx * d, py = yB + H2 + b * (H2 - 0.1) + ny * d - (b < -0.3 ? sag * (-b - 0.3) / 0.7 : 0);
      const pz = z + sz * a * (W - 0.1) + dz * sens * c * F + nz * d;
      const s = 1.2 + 0.5 * h(4), tangage = -Math.asin(Math.max(-1, Math.min(1, ny))) + (h(5) - 0.5) * 0.8;
      const cap = Math.atan2(nx, nz) + (h(6) - 0.5) * 0.8, roulis = (h(7) - 0.5) * 0.7;
      let t = 0.92 + 0.26 * h(14);
      if (d < -0.2) t *= 0.62; else if (b > 0.5) t *= 1.12;
      const tir = h(16), tt = tir < 0.07 ? [1.08, 1.02, 0.8] : tir < 0.17 ? [0.94, 1.0, 1.04] : [1, 1, 0.96];
      carte(C, px, py, pz, tangage, cap, roulis, s, s, centre, rV, t, tt, h(17) < 0.5);
    }
  };
  // on coupe l'axe à [za, zb] : les bouts coupés ne sont pas fermés (le morceau voisin continue), les vrais bouts oui
  for (const bout of decouper(axe, za, zb)) {
    const pts = K.reechantillonner(bout, 0.9);
    let prev = null;
    const fermer = (ring, cx, cz, dx, dz, sens) => {
      // le bout : on rétrécit l'anneau (et ses cartes) sur 1,35 m, puis un éventail vers son centre, 10 cm plus loin :
      // en largeur comme en hauteur, le demi-ellipsoïde de 1,45 m de flèche que la calotte couvre de cartes. (Le cœur ne
      // rétrécissait d'abord qu'à moitié en hauteur : son bout, une plaque de 0,9 x 2,7 m, perçait la calotte.)
      let r0 = ring;
      for (const [d, e] of [[0.35, 0.97], [0.7, 0.87], [1.05, 0.69], [1.35, 0.36]]) {
        const X = cx + dx * d * sens, Z = cz + dz * d * sens;
        const r1 = anneau(X, Z, dx, dz, e, sens * (1 - e) * 1.2);
        for (let k = 0; k < N; k++) lot.quad(pc, r0[k], r0[k + 1], r1[k + 1], r1[k]);
        semer(X, Z, dx, dz, Math.round(perimetre(faite(Z) - R.bas) * e * dens * 0.35), e, sens * (1 - e) * 1.2);
        r0 = r1;
      }
      let mx = 0, my = 0, mz = 0; const A = pc.pos.a;
      for (let k = 0; k < N; k++) { mx += A[r0[k] * 3]; my += A[r0[k] * 3 + 1]; mz += A[r0[k] * 3 + 2]; }
      col[0] = 0.3; col[1] = 0.33; col[2] = 0.24;
      const c = lot.s(pc, mx / N + dx * 0.1 * sens, my / N, mz / N + dz * 0.1 * sens, dx * sens, 0, dz * sens, 0.5, 0.5, col);
      for (let k = 0; k < N; k++) lot.tri(pc, r0[k], r0[k + 1], c);
      calotte(cx, cz, dx, dz, sens);
    };
    for (let j = 0; j < pts.length; j++) {
      const A = pts[Math.max(0, j - 1)], B = pts[Math.min(pts.length - 1, j + 1)], Q = pts[j];
      let dx = B.x - A.x, dz = B.z - A.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const ring = anneau(Q.x, Q.z, dx, dz);
      if (prev) for (let k = 0; k < N; k++) lot.quad(pc, prev[k], prev[k + 1], ring[k + 1], ring[k]);
      const vraiDebut = j === 0 && Math.abs(Q.z - z0) < 0.01, vraieFin = j === pts.length - 1 && Math.abs(Q.z - z1) < 0.01;
      const ouvert = R.sansBout !== undefined && Math.abs(Q.z - R.sansBout) < 0.01;
      if (vraiDebut && !ouvert) fermer(ring, Q.x, Q.z, dx, dz, -1);
      if (vraieFin && !ouvert) fermer(ring, Q.x, Q.z, dx, dz, 1);
      prev = ring;
      if (budget()) yield;
    }
    // les cartes, par stations de 30 cm le long du bout (celles de chaque station se tirent de sa position)
    const fine = K.reechantillonner(bout, PAS / 3), L = fine[fine.length - 1].s, nS = Math.max(1, Math.round(L / PAS));
    for (let i = 0, k = 1; i < nS; i++) {
      const sM = (i + 0.5) * L / nS;
      while (k < fine.length - 1 && fine[k].s < sM) k++;
      const qa = fine[k - 1], q = fine[k], t = (sM - qa.s) / Math.max(1e-6, q.s - qa.s);
      const x = qa.x + (q.x - qa.x) * t, z = qa.z + (q.z - qa.z) * t;
      let dx = q.x - qa.x, dz = q.z - qa.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      semer(x, z, dx, dz, Math.round(perimetre(faite(z) - R.bas) * PAS * dens));
      if (i % 8 === 7 && budget()) yield;
    }
  }
}

// LES FÛTS d'une rangée taillée, entre za et zb, comme ceux du rideau du plateau (tuyauQuai de js/court_parc.js : même
// écorce grise, même pied évasé à trois contreforts) : fût lisse qui fourche en candélabre sous le feuillage, deux
// charpentières dans le plan du rideau, une qui monte, et chacune entre dans la couronne.
function futsRideau(K, bois, tuyau, R, za, zb) {
  const sol = K.sol, alea = K.alea, V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const [x, z] of R.troncs) {
    if (z < za || z >= zb) continue;
    const y0 = sol(x, z) - 0.15, W = R.larg / 2;
    const yB = Math.max(sol(x + R.axe, z), sol(x + R.axe - W * 0.75, z), sol(x + R.axe + W * 0.75, z)) + R.bas;
    const yF = yB - 0.3 - 0.25 * alea(x, z, 71);                    // la fourche, juste sous le feuillage
    const F = [x + (alea(x, z, 72) - 0.5) * 0.14, yF, z + (alea(x, z, 73) - 0.5) * 0.14];
    const phi = alea(x, z, 74) * 6.28;
    const contreforts = (t, a) => 1 + 0.13 * Math.max(0, 1 - t * 4.5) * Math.cos(3 * a + phi) + 0.04 * Math.cos(2 * a + 2 * phi);
    bois.push(tuyau([V(x, y0, z), V(x, y0 + 0.5, z), V(x + 0.02, y0 + 1.25, z + 0.02), V(...F)], [0.44, 0.35, 0.3, 0.26], 8, 12, contreforts));
    for (const [sz, th] of [[-1, 0.62 + 0.23 * alea(x, z, 75)], [1, 0.62 + 0.23 * alea(x, z, 76)], [0, 0.3]]) {
      const ex = sz === 0 ? 1 : (alea(x, z, 77 + sz) - 0.4) * 0.4, ez = sz === 0 ? (alea(x, z, 79) - 0.5) * 0.6 : sz, hn = Math.hypot(ex, ez);
      const dir = (t) => [Math.sin(t) * ex / hn, Math.cos(t), Math.sin(t) * ez / hn];
      const d1 = dir(th), d2 = dir(th * 0.55), l1 = 1.6 + 0.4 * alea(x, z, 80 + sz), l2 = 1.6 + 0.6 * alea(x, z, 83 + sz);
      const P1 = [F[0] + d1[0] * l1, yF + d1[1] * l1, F[2] + d1[2] * l1], P2 = [P1[0] + d2[0] * l2, P1[1] + d2[1] * l2, P1[2] + d2[2] * l2];
      bois.push(tuyau([V(F[0], yF - 0.35, F[2]), V(...F), V(...P1), V(...P2)], sz === 0 ? [0.17, 0.15, 0.1, 0.04] : [0.19, 0.17, 0.12, 0.05], 8, 8));
    }
  }
}

// ============================================================================================ le banc brun
// LE BANC BRUN DE L'ALLÉE DU QUAI (photos 1000051339 et 343) : deux flasques de fonte noire (pied avant, pied arrière
// qui monte en montant de dossier), cinq lattes d'assise et quatre de dossier en bois peint brun sombre, usé plus clair
// dessus. Dessiné une fois, posé partout (géométrie partagée) ; face vers +z, comme les pièces du kit.
let _banc = null;
function modeleBanc(K) {
  if (_banc) return _banc;
  const lot = new K.Lot('banc brun'), L = 1.9, brun = [0.3, 0.215, 0.165], fonte = K.TEINTES.fonte;
  const M = (x, y, z, rx = 0) => new THREE.Matrix4().makeRotationX(rx).setPosition(x, y, z);
  for (const x of [-L / 2 + 0.2, L / 2 - 0.2]) {
    const barre = (a, b, w = 0.045, h = 0.03) => lot.barre([x, a[1], a[0]], [x, b[1], b[0]], w, h, { couleur: fonte, haut: [1, 0, 0] });
    barre([0.22, 0], [0.18, 0.43]);                                // pied avant
    barre([-0.2, 0], [-0.26, 0.44]); barre([-0.26, 0.44], [-0.34, 0.86]);   // pied arrière et montant du dossier
    barre([0.24, 0.42], [-0.27, 0.43], 0.04, 0.03);                // support d'assise
  }
  // les lattes : une teinte par latte (le bois n'est jamais uni), plus claire dessus (usure)
  const latte = (y, z, rx, w, i) => {
    const k = 0.9 + 0.2 * K.alea(i, y * 7, 91);
    lot.boite('bois', L, 0.032, w, M(0, y, z, rx), { chanfrein: 0.008, couleur: [brun[0] * k, brun[1] * k, brun[2] * k] });
  };
  [0.19, 0.1, 0.01, -0.08, -0.17].forEach((z, i) => latte(0.462, z, 0, 0.075, i));
  [0.53, 0.63, 0.73, 0.83].forEach((y, i) => latte(y, -0.29 - (y - 0.53) * 0.2, 0.2, 0.085, i + 7));
  _banc = lot.maillages('banc brun', 0);
  return _banc;
}
// Pose un modèle partagé (repère du modèle : pied à l'origine, face vers +z) en (x, z), tourné de `cap` degrés.
function poser(K, groupe, modele, x, z, cap, dy = 0) {
  const y = K.sol(x, z) + dy;
  for (const m of modele.children) {
    const c = new THREE.Mesh(m.geometry, m.material);
    c.castShadow = m.castShadow; c.receiveShadow = m.receiveShadow;
    c.position.set(x + Monde.dx, y, z); c.rotation.y = (cap * Math.PI) / 180;
    c.name = m.name; c.userData.kitModele = 'banc brun';
    groupe.add(c);
  }
}

// ============================================================================================ un morceau
function* construireMorceau(ctx, za, zb) {
  const K = ctx.kit, g = ctx.groupe, mobile = !!ctx.mobile, budget = ctx.budget || (() => false);
  // 1. LA PROMENADE : le ruban d'asphalte rouge délavé et ses bordures de béton (171717 : une bordure basse de chaque
  // côté). Le tracé est arrondi en entier (coudes de 4 m de rayon) avant d'être coupé : deux morceaux voisins se
  // raccordent exactement.
  const trace = K.arrondir(TRACE_PROMENADE, 4);
  for (const bout of decouper(trace, za, zb)) {
    g.add(yield* K.rubanPas({ trace: bout, largeur: LARGEUR, materiau: 'asphalte_rouge', bordure: 'beton', arrondi: false, pas: 1 }, budget));   // (relecture C6 : en tranches)
  }
  yield;
  // 2. LES RIDEAUX TAILLÉS : le cœur, les cartes de feuilles, puis les fûts (matériaux du rideau du plateau)
  const RQ = materiauxRideau(ctx);
  const lotF = new K.Lot('rideau du quai'), cartes = new Cartes(), bois = [];
  for (const R of RIDEAUX) {
    const zMin = Math.min(R.debut, R.fin) - 1.5, zMax = Math.max(R.debut, R.fin) + 1.5;
    if (zMax < za || zMin > zb) continue;
    yield* feuillageRideau(K, lotF, cartes, R, za, zb, mobile, budget);
    futsRideau(K, bois, RQ.tuyau, R, za, zb);
    yield;
  }
  g.add(lotF.maillages('rideau du quai'));
  if (budget()) yield;
  const feuilles = feuillesRideau(ctx, RQ, cartes, 'rideau du quai · feuilles');
  if (feuilles) g.add(feuilles);
  if (budget()) yield;
  if (bois.length) {
    const futs = new THREE.Mesh(RQ.aLOmbre(mergeGeometries(bois), 0.0, 0.2), RQ.ecorce);
    futs.name = 'rideau du quai · fûts'; futs.castShadow = true; futs.receiveShadow = true; futs.position.x = Monde.dx;
    for (const b of bois) b.dispose();
    g.add(futs);
  }
  yield;
  // 3. LE TALUS DU QUAI : des arbustes taillés en masses basses (troène, laurier), à mi-pente entre la couronne du
  // rideau extérieur et la grille, enfoncés dans la pente ; et en face de la terrasse du bassin (z 8 à 60), où il n'y a
  // pas de rideau, une haie basse sur la crête du talus (photo 171718 : la bande vert sombre au bord du quai).
  const pieds = RIDEAUX.flatMap((R) => R.troncs);
  for (let z = Math.ceil(za / 1.7) * 1.7; z < zb; z += 1.7) {
    if (z < -88 || z > 158) continue;
    const xg = xSur(GRILLE[0].slice(3), z);                            // la grille, partie droite (z de -89 à 159)
    if (K.alea(z, 3.1, 101) < 0.22) continue;                           // des trous : ce n'est pas une haie
    const x = xg - 1.05 - 0.5 * K.alea(z, 1.3, 102);
    if (pieds.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.0)) continue;
    const r = [0.55, 0.72, 0.9][Math.floor(K.alea(x, z, 103) * 3)];
    const b = K.bouleBuis({ x, z, r, aplat: 0.62, essence: K.alea(x, z, 104) < 0.5 ? 'haie' : 'troene' });
    for (const m of b.children) m.position.y -= r * 0.35;
    g.add(b);
    if (budget()) yield;
  }
  const crete = decouper([[12.55, 8.5], [12.5, 30], [12.45, 45], [12.2, 59.5]], za, zb);
  // (basse : 75 cm ; sur 171717 et 171718, de la butte du pin, on voit les cars garés au-dessus d'elle)
  for (const bout of crete) g.add(K.haieTaillee({ ligne: bout, h: 0.75, ep: 0.7, essence: 'troene' }));
  if (budget()) yield;
  // LE DOS DE LA HAIE DU PLATEAU (haieQuai, js/court_parc.js) : elle n'était faite que pour être vue du plateau — une
  // face de touffes, un cœur sombre à 25 cm derrière ; de la promenade, on voyait ce cœur par les trous. Là où elle est
  // pleine, une haie taillée mince (34 cm, de x = 6,69 à 7,03) lui fait un dos, collé à son cœur : du plateau on ne la
  // voit pas (la face de touffes est devant), et les tronçons maigres — la trouée devant le banc brun, le bout des
  // platanes — restent ajourés, comme sur les photos 1000051339 et 343.
  for (const [a, b, h] of DOS_HAIE) {
    for (const bout of decouper([[6.86, a + 0.15], [6.86, b - 0.15]], za, zb)) { g.add(K.haieTaillee({ ligne: bout, h: h - 0.07, ep: 0.34, essence: 'haie' })); if (budget()) yield; }
  }
  yield;
  // 4. LA HAIE DE LA LIMITE NORD-EST (1,8 m, sombre), le long du parking de l'immeuble
  for (const bout of decouper(LIMITE_NE, za, zb)) { g.add(K.haieTaillee({ ligne: bout, h: 1.8, ep: 1.0, essence: 'haie' })); if (budget()) yield; }
  // 5. LA GRILLE NOIRE DU QUAI sur son muret de pierre, et le portillon nord-est, fermé
  // (par tronçons de 10 m en z, coupés aux multiples de 10 : une grille de 42 m d'un seul tenant prenait 30 à 45 ms d'une
  // traite, sans rendre la main ; les travées de 2,5 m tombent juste aux coupures, qui ne se voient pas)
  for (const l of GRILLE) {
    for (let zc = za; zc < zb;) {
      const z2 = Math.min(zb, (Math.floor(zc / 10 + 1e-9) + 1) * 10);
      for (const bout of decouper(l, zc, z2)) g.add(K.grilleBarreaux({ ligne: bout, h: 2.0, muret: 0.5, ep: 0.35, pas: 0.13, travee: 2.5, pointes: true }));
      if (budget()) yield;
      zc = z2;
    }
  }
  if (PORTILLON_NE.z >= za && PORTILLON_NE.z < zb) g.add(K.portail({ ...PORTILLON_NE, type: 'simple', ouvert: 0 }));
  yield;
  // 6. LE MOBILIER : bancs bruns (et une corbeille à côté d'un banc sur deux), lanternes côté quai. (Placés sur le tracé
  // des gabarits, comme leurs obstacles : l'arrondi des coudes ne les déplace que de quelques millimètres.)
  const banc = modeleBanc(K);
  BANCS.forEach((z, i) => {
    if (z < za || z >= zb) return;
    const x = xSur(TRACE_PROMENADE, z) - LARGEUR / 2 - 0.42;
    poser(K, g, banc, x, z, 90);
    if (i % 2 === 0) g.add(K.poubelle({ x: x + 0.05, z: z + 1.35, cap: 90 }));
  });
  for (const [z, style] of LAMPES) {
    if (z < za || z >= zb) continue;
    g.add(K.lampadaire({ x: xSur(TRACE_PROMENADE, z) + LARGEUR / 2 + 0.45, z, style, cap: 270 }));
  }
  yield;
  // la fusion, faite ICI (et les blocs protégés ensuite) : l'optimiseur du décor (js/court.js, optimiserDecor), qui
  // passe après sur toute la scène, fondrait sinon les morceaux de la zone entre eux, et avec les autres zones, en blocs
  // de plusieurs centaines de mètres qu'on ne pourrait plus écarter de l'image (conception, § 3.5 : 35 m au plus).
  // (tout ce qui est feuillage, rideaux, arbustes, haies, est de la végétation : conception § 3.3, règle 6)
  // (La fusion ne se coupe pas : c'est la tranche la plus longue du morceau, 10 à 15 ms sur PC. Le lot A5 fond lui-même
  // ses morceaux en tranches ; quand le décor ne sera plus refondu d'un bloc après coup, elle pourra lui être laissée.)
  g.traverse((o) => { if (o.isMesh && ['feuillage', 'frange'].includes(o.material.userData.kit)) o.userData.feuillage = true; });
  yield* K.fusionnerPas(g, budget);           // (lot C6 : en tranches)
  g.traverse((o) => { if (o.isMesh) o.userData.nofuse = true; });
}

// LA SILHOUETTE d'un morceau (conception, § 3.5 : version lointaine, ≤ 2 000 triangles, 1 à 3 appels) : l'allée en un
// ruban grossier, les rideaux en boîtes à huit pans, sans rameaux ni fûts.
function* silhouetteMorceau(ctx, za, zb) {
  const K = ctx.kit, g = ctx.groupe;
  const lot = new K.Lot('silhouette Z03'), sol = K.sol;
  for (const bout of decouper(TRACE_PROMENADE, za, zb)) {
    const pts = K.reechantillonner(bout, 6), p = lot.part('asphalteRouge#sol');
    let prev = null;
    for (let j = 0; j < pts.length; j++) {
      const A = pts[Math.max(0, j - 1)], B = pts[Math.min(pts.length - 1, j + 1)], Q = pts[j];
      let dx = B.x - A.x, dz = B.z - A.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const r = [-1, 1].map((c) => { const x = Q.x - dz * c * LARGEUR / 2, z = Q.z + dx * c * LARGEUR / 2; return lot.s(p, x, sol(x, z) + 0.03, z, 0, 1, 0, 0, Q.s / 4, [1, 1, 1]); });
      if (prev) lot.quad(p, prev[0], prev[1], r[1], r[0]);
      prev = r;
    }
  }
  const p = lot.part('feuillage'), c = [0.62, 0.7, 0.5];
  for (const R of RIDEAUX) {
    const axe = [...R.troncs].sort((a, b) => a[1] - b[1]).map(([x, z]) => [x + R.axe, z]);
    for (const bout of decouper(axe, za, zb)) {
      const pts = K.reechantillonner(bout, 4);
      let prev = null;
      for (const Q of pts) {
        const yB = sol(Q.x, Q.z) + R.bas, W = R.larg / 2, H = R.haut - R.bas;
        const ring = [[-W, 0], [W, 0], [W, H * 0.8], [W * 0.7, H], [-W * 0.7, H], [-W, H * 0.8]].map(([s, u], k) =>
          lot.s(p, Q.x + s, yB + u, Q.z, s / W, u > 0 ? 0.6 : -1, 0, Q.z / 2, k / 2, c));
        if (prev) for (let k = 0; k < 6; k++) lot.quad(p, prev[k], prev[(k + 1) % 6], ring[(k + 1) % 6], ring[k]);
        prev = ring;
      }
    }
  }
  yield;
  g.add(lot.maillages('silhouette Z03'));
  g.traverse((o) => { if (o.isMesh) o.userData.nofuse = true; });
}

// ============================================================================================ la zone
export default {
  id: 'Z03', nom: 'Bande du quai et promenade basse',
  emprise: [[6.3, -111], [16.5, -111], [16.5, 187], [-2, 187], [6.3, 150]],
  morceaux: MORCEAUX.map(([id, za, zb]) => ({
    id, boite: [id === 'Z03g' ? -2 : 5.5, za, 17, zb],
    construire: (ctx) => construireMorceau(ctx, za, zb),
    silhouette: (ctx) => silhouetteMorceau(ctx, za, zb),
  })),
  // Les obstacles (purs, sans three) : les fûts des rideaux (ils ne sont plus dans arbres.bin), les lanternes, les
  // bancs, les corbeilles, la haie de crête. La grille, son portillon et la haie de la limite nord-est sont déjà dans
  // monde.json (clôtures) ; les arbustes du talus sont dans sa pente de 50 %, où l'on ne marche pas.
  obstacles(o) {
    // (0,34 m : comme les fûts du rideau du plateau, js/court_parc.js — 0,44 au pied, 0,30 à un mètre, contreforts compris)
    for (const R of RIDEAUX) for (const [x, z] of R.troncs) o.cercle(x, z, 0.34, { h: 2.6, type: 'arbre', source: 'Z03 rideau taillé' });
    const trace = TRACE_PROMENADE;
    for (const [z, style] of LAMPES) o.cercle(xSur(trace, z) + LARGEUR / 2 + 0.45, z, style === 'borne' ? 0.16 : 0.13, { h: style === 'borne' ? 1.9 : 3.6, type: 'poteau', camera: false });
    BANCS.forEach((z, i) => {
      const x = xSur(trace, z) - LARGEUR / 2 - 0.42;
      o.boite(x - 0.05, z, 0.32, 0.95, 0, { h: 0.9, type: 'banc' });
      if (i % 2 === 0) o.cercle(x + 0.05, z + 1.35, 0.28, { h: 0.9, type: 'corbeille' });
    });
    o.segment(12.55, 8.5, 12.5, 30, { e: 0.7, h: 0.75, type: 'haie' });
    o.segment(12.5, 30, 12.45, 45, { e: 0.7, h: 0.75, type: 'haie' });
    o.segment(12.45, 45, 12.2, 59.5, { e: 0.7, h: 0.75, type: 'haie' });
  },
  bancs(b) {
    for (const z of BANCS) b.push({ x: xSur(TRACE_PROMENADE, z) - LARGEUR / 2 - 0.42, z, cap: 90, y: 0.46, source: 'Z03 banc brun' });
  },
  lieux: [{ id: 'promenade', nom: 'Promenade du quai', x: 10.6, z: -30, cap: 180 }],
};
