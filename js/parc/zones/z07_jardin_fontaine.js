// =====================================================================
//  ZONE Z07 : LE JARDIN DE LA FONTAINE ET LE PAVILLON DES DOUCEURS (lot B9 du chantier « parc entier »)
// =====================================================================
// Le jardin bas rénové en 2022, entre le seuil de la rampe ouest (z ≈ 57) et le city-stade (z ≈ 120), du pied du coteau
// (x ≈ -27) au rideau taillé du quai (x ≈ 6). Ce qu'on y voit, d'après tools/parc/references_gmaps/SYNTHESE.md § Z07 et
// R5.md § Z07 (qui priment sur la conception) — photos d'avis de janv. 2026 et mars 2025, Commons « Nouvelle partie
// rénovée » 01 et 03 (2022), et surtout l'ORTHOPHOTO IGN pour le plan (le satellite de Google montre encore les tennis) :
//
//   - L'HÉMICYCLE ouvert vers le quai : un GRAND ARC d'allée de 19 m de rayon autour de la fontaine, aplati le long du
//     rideau (x -0,4), doublé dehors d'un MASSIF EN ARC planté régulièrement (arbustes ronds, graminées) ; au nord et
//     au sud, deux allées courbes de 24 à 25 m de rayon ; l'allée RAYONNANTE de 3 m vers la promenade ; les deux allées
//     parallèles du nord (x -25,5 et -18,5), la traverse, la PLACE BLANCHE et son ÉDICULE blanc ; des allées de
//     stabilisé clair à BORDURETTES D'ACIER, des pelouses semées de JEUNES ARBRES tuteurés (deux ou trois piquets,
//     cuvette de paillis) ;
//   - la FONTAINE OCTOGONALE en eau, 8,3 m hors tout, centrée en (-17,8 ; 104,0), sur sa PLACETTE ronde de 8 m de rayon :
//     margelle de 0,47 m en pierre claire, tablette de 0,38 m, eau à 10 cm sous la tablette, socle central et JET UNIQUE
//     d'environ 1,3 m, une gerbe d'écume blanche (Commons 03, 2022), six pots sombres plantés de graminées autour ;
//   - le PAVILLON DES DOUCEURS (café-glacier, WC), x -31,0…-24,4, z 94,8…113,3 : un niveau de 4 m, TOIT EN CROUPE très
//     plat caché derrière un ACROTÈRE clair, parement de grands blocs crème (0,7 x 0,4 m) rythmé de PILASTRES
//     anthracite, sur la façade côté fontaine six portes-fenêtres à petits bois sous IMPOSTES EN DEMI-CERCLE et une porte
//     pleine grise au milieu ; au pignon nord, les deux portes des WC dans des niches cintrées, une applique, le boîtier
//     vert du défibrillateur ; au pignon sud, une porte vitrée à deux vantaux ;
//   - sa TERRASSE SURÉLEVÉE de 0,5 m (dallage gris, plan des données à -0,30), sa face de pierre claire au-dessus de la
//     placette, sa RAMPE dallée vers le nord et son ESCALIER de 3 marches vers la placette, accolé à la margelle ; les
//     tables d'anthracite et les chaises vertes, deux parasols blancs fermés (fin septembre), le grand BAC ROND noir ;
//   - la PERGOLA d'acier noir sans couverture (x -27,2…-20,1, z 113,6…118) au bout sud, sur un sol de stabilisé ;
//   - le mobilier « du bas » (SYNTHESE.md § C) : LAMPADAIRES à fût rouille et lanterne cylindrique noire, BORNES rouille,
//     BANCS NOIRS à lattes.
//
// LES LIMITES. Au nord, le SEUIL de la rampe ouest (son bout asphalté, de x -25 à la promenade) et l'ESCALIER DE 11
// MARCHES qui en descend sont dessinés ici ; la rampe elle-même est à Z11 (js/parc/zones/z11_coteau_sud.js, coupée à
// x = -25), l'escalier de 13 marches qui descend du seuil vers la terrasse du bassin à Z05. À l'est, la promenade et son
// rideau sont à Z03 (l'allée rayonnante s'arrête au bord de la promenade). Au sud, l'allée de sable, le city-stade et les
// jeux sont à Z08 (js/parc/zones/z08_city_stade.js, qui reprend les outils d'ici : outilsB9). À l'ouest, le coteau (Z11)
// commence à x = -27.
//
// LES DONNÉES (tools/parc/gabarits.json, zones Z07 et Z08) : le pied du pavillon (plan à -0,72 : le MNT, interpolé sous
// le bâtiment, y faisait monter le talus jusque sur ses pignons), la terrasse (plan à -0,30) et sa face, sa rampe et son
// escalier, le plan d'eau de la fontaine (la balle y tombe et revient au joueur), les allées (tracés recopiés ci-dessous,
// ceux de monde.json, lus de préférence dans les données), les surfaces (placette, parvis, sol de la pergola, MASSIFS en
// arc, non marchables), les jeunes arbres (arbres.bin : la zone n'en plante aucun, elle dessine leurs tuteurs) ;
// l'obstacle « bâtiment » du pavillon vient d'OSM. Toute hauteur vient du sol du monde, sauf la fontaine et la terrasse,
// posées à hauteur fixe sur leurs plans.
//
// NON VU (R5.md Z07.3), donc tenu simple et plausible : l'hémicycle en vue d'ensemble (plan d'après l'ortho), la hauteur
// et l'essence du massif en arc (arbustes ronds de 0,7 à 1 m), la place blanche et la forme de l'édicule (un volume
// blanc enduit, une porte), le seuil nord, la façade ouest et le détail du toit du pavillon, le jet récent.
//
// RÈGLES DE ZONE : aucun Math.random (kit.alea, kit.bruit, avecHasard pour les arbustes) ; matériaux du kit, plus trois
// propres (le parement de blocs du pavillon, une toile dessinée au premier appel ; la gerbe et l'écume du jet, animées et
// transparents) ; aucun arbre planté ; rien hors du groupe du morceau ; l'eau et le jet sont `dynamique` et `nofuse`.
import * as THREE from 'three';
import { outilsB7 } from './z14_haut_nord_est.js';
import { outilsB2 } from './z04_butte_pin.js';
import { allee, plaque, Nappe, maillageSol, bord, Touffes, arbuste, maillageFeuillage, couvreSol, bancsNoirs } from './coteau.js';
import { DRAPEAU, SURFACE } from '../../monde.js';

// ============================================================================================ les données
// (repère du terrain 1)
// La fontaine : centre, demi-largeur hors tout (entre faces : 8,3 m), largeur de la tablette, hauteur de la margelle
export const FONTAINE = { x: -17.8, z: 104.0, ap: 4.15, tab: 0.38, h: 0.47 };
// Le pavillon : façade côté fontaine (x+) et façade du talus (x-), pignons nord (z-) et sud (z+) ; plancher et dessus du
// parement (sous l'acrotère) ; les sept travées de la façade x+ (centres en z, du nord au sud), toutes devant la terrasse
const PAV = { xE: -24.4, xO: -31.0, zN: 94.8, zS: 113.3, yP: -0.30, haut: 3.6, acro: 0.4, ep: 0.35 };
const TRAVEES = [0, 1, 2, 3, 4, 5, 6].map((i) => 96.0 + 0.95 + i * 1.9);
const BAIE = { l: 1.5, h: 2.35, r: 0.75 };                // porte-fenêtre : largeur, hauteur du dormant droit, rayon de l'imposte
// La terrasse surélevée (gabarit terrasse_douceurs), sa rampe vers le nord, son escalier vers la placette
const TERRASSE = { x0: -24.4, x1: -21.95, z0: 96.0, z1: 109.3, y: -0.30, zRampe: 90.8 };
const ESC3 = { de: [-23.175, 109.3, -0.30], a: [-23.175, 110.6, -0.80], largeur: 2.45, marches: 3 };
// Le muret-parapet de la terrasse côté fontaine (R5.md Z07-F02), posé sur la face : du haut de la rampe au haut de
// l'escalier, 0,42 m au-dessus du dallage
const PARAPET = { x0: -22.0, x1: -21.7, z0: 96.0, z1: 109.3, h: 0.42 };
// La pergola d'acier noir et l'édicule de la place blanche
const PERGOLA = { x0: -27.2, x1: -20.1, z0: 113.6, z1: 118.0, h: 3.0 };
const EDICULE = { x0: 0.0, x1: 2.0, z0: 69.0, z1: 77.0, h: 2.5 };
const PLACE_BLANCHE = [[-9.0, 66.0], [0.0, 66.0], [0.0, 80.0], [-9.0, 80.0]];
const BACS = [[-2.9, 68.2, -0.6, 71.4], [-2.9, 74.4, -0.6, 78.2]];

// Les tracés (monde.json, empreinte 43ea777551d37781) : lus dans les données quand elles sont là (parId), sinon ceux-ci.
const REPLI = {
  hemicycle_arc: [[-17.8, 84.8], [-15.79, 84.91], [-13.81, 85.22], [-11.87, 85.74], [-9.99, 86.46], [-8.2, 87.37], [-6.51, 88.47], [-4.95, 89.73],
    [-3.53, 91.15], [-2.36, 92.71], [-1.55, 94.4], [-1.03, 96.19], [-0.72, 98.07], [-0.55, 100.01], [-0.46, 101.99], [-0.44, 104.0], [-0.46, 106.01],
    [-0.55, 107.99], [-0.72, 109.93], [-1.03, 111.81], [-1.55, 113.6], [-2.36, 115.29], [-3.53, 116.85], [-4.95, 118.27], [-6.51, 119.53], [-8.2, 120.63],
    [-9.99, 121.54], [-11.87, 122.26], [-13.81, 122.78], [-15.79, 123.09], [-17.8, 123.2]],
  hemicycle_arc_nord: [[-17.28, 79.21], [-15.21, 79.34], [-12.64, 79.74], [-10.14, 80.41], [-7.71, 81.34], [-5.4, 82.52], [-3.22, 83.94], [-1.21, 85.57], [-0.73, 86.01]],
  hemicycle_arc_sud: [[-15.4, 127.78], [-13.5, 127.51], [-11.5, 127.05], [-9.5, 126.41], [-7.5, 125.57], [-5.5, 124.49], [-3.5, 123.15], [-1.4, 121.39]],
  hemicycle_rayon: [[-9.8, 104.15], [7.0, 104.15]],
  hemicycle_x24: [[-25.45, 67.8], [-25.45, 94.4]],
  hemicycle_traverse: [[-17.3, 72.0], [-9.0, 72.0]],
  allee_hemicycle: [[-18.55, 66.5], [-18.55, 95.2], [-13.0, 97.5], [-11.9, 104.0], [-13.0, 110.5], [-15.72, 117.33], [-16.4, 139.61], [-16.86, 151.24]],
  rampe_ouest: [[-30.4, 58.41], [-24.67, 57.05], [-18.63, 56.56], [9.0, 56.81]],
  escalier11_seuil: { de: [-18.5, 58.9, 1.0], a: [-18.1, 65.6, -0.8], largeur: 1.6, marches: 11 },
};
const LARGEURS = { hemicycle_arc: 2.5, hemicycle_arc_nord: 2.1, hemicycle_arc_sud: 2.0, hemicycle_rayon: 3.0, hemicycle_x24: 1.4, hemicycle_traverse: 2.0, allee_hemicycle: 2.5 };
// Le bord de la promenade (Z03 : trace x 9,0 à z 56,8, 8,0 à z 165,3 ; 3 m) : les allées s'y arrêtent
export const xPromenade = (z) => 9.0 - ((z - 56.8) * 1.0) / 108.5 - 1.5;

// Les massifs en arc (surfaces « massif » des données) : la bande de 1,95 m qui double dehors le grand arc, en trois
// morceaux (nord et quai ; quai au sud de l'allée rayonnante ; sud), coupée par l'allée rayonnante et l'allée est des jeux.
const MASSIFS = [
  [[-15.63, 83.37], [-14.89, 83.48], [-14.23, 83.59], [-13.49, 83.7], [-12.76, 83.9], [-12.12, 84.07], [-11.39, 84.27], [-10.69, 84.53], [-10.06, 84.77], [-9.36, 85.04],
    [-8.69, 85.38], [-8.09, 85.68], [-7.42, 86.03], [-6.79, 86.44], [-6.23, 86.8], [-5.6, 87.22], [-5.02, 87.68], [-4.5, 88.1], [-3.91, 88.58], [-3.38, 89.11], [-2.91, 89.58],
    [-2.35, 90.15], [-1.71, 91.0], [-1.04, 91.9], [-0.56, 92.89], [-0.1, 93.85], [0.2, 94.86], [0.48, 95.85], [0.65, 96.88], [0.82, 97.88], [0.91, 98.9], [1.0, 99.91],
    [1.04, 100.93], [1.09, 101.94], [3.04, 101.88], [2.99, 100.84], [2.94, 99.78], [2.85, 98.73], [2.75, 97.63], [2.58, 96.56], [2.38, 95.42], [2.07, 94.32], [1.72, 93.15],
    [1.2, 92.04], [0.63, 90.89], [-0.15, 89.83], [-0.86, 88.89], [-1.53, 88.2], [-2.0, 87.73], [-2.61, 87.13], [-3.27, 86.59], [-3.79, 86.17], [-4.45, 85.64], [-5.16, 85.17],
    [-5.73, 84.8], [-6.45, 84.34], [-7.21, 83.95], [-7.81, 83.64], [-8.57, 83.26], [-9.36, 82.95], [-9.99, 82.71], [-10.79, 82.41], [-11.61, 82.19], [-12.26, 82.01],
    [-13.09, 81.8], [-13.93, 81.66], [-14.59, 81.56], [-15.42, 81.43]],
  [[1.09, 106.06], [1.04, 107.07], [1.0, 108.09], [0.91, 109.1], [0.82, 110.12], [0.65, 111.12], [0.48, 112.15], [0.2, 113.14], [2.07, 113.68], [2.38, 112.58], [2.58, 111.44],
    [2.75, 110.37], [2.85, 109.27], [2.94, 108.22], [2.99, 107.16], [3.04, 106.12]],
  [[-3.91, 119.42], [-4.5, 119.9], [-5.02, 120.32], [-5.6, 120.78], [-6.23, 121.2], [-6.79, 121.56], [-7.42, 121.97], [-8.09, 122.32],
    [-8.69, 122.62], [-9.36, 122.96], [-10.06, 123.23], [-10.69, 123.47], [-11.39, 123.73], [-12.12, 123.93], [-12.76, 124.1], [-13.49, 124.3], [-13.09, 126.2],
    [-12.26, 125.99], [-11.61, 125.81], [-10.79, 125.59], [-9.99, 125.29], [-9.36, 125.05], [-8.57, 124.74], [-7.81, 124.36], [-7.21, 124.05], [-6.45, 123.66],
    [-5.73, 123.2], [-5.16, 122.83], [-4.45, 122.36], [-3.79, 121.83]],
];
// Les surfaces claires dessinées ici (les mêmes que les données) : la placette ronde (arrêtée à la face de la terrasse),
// les parvis nord et sud du pavillon, le sol de la pergola
const PLACETTE = (() => {
  const P = [];
  for (let k = 0; k <= 48; k++) {
    const a = -Math.PI / 2 + (k / 48) * Math.PI * 2, x = FONTAINE.x + 8 * Math.cos(a), z = FONTAINE.z + 8 * Math.sin(a);
    P.push([Math.max(x, TERRASSE.x1), z]);
  }
  return P;
})();
// (le parvis nord s'arrête au bord ouest de l'allée du nord, qui le longe : x -19,8 ; les données le prolongent sous elle ;
// au sud, il suit le bord de la placette jusqu'à la face de la terrasse — relecture : arrêté à z 96,1, il laissait entre
// eux un coin de terre nue)
const PARVIS_NORD = [[-26.2, 88.0], [-19.8, 88.0], [-19.8, 96.4], [-21.0, 96.75], [-21.95, 97.3], [-21.95, 90.8], [-24.4, 90.8], [-24.4, 94.8], [-26.2, 94.8]];
const PARVIS_SUD = [[-24.4, 110.6], [-22.3, 110.6], [-20.1, 111.66], [-17.8, 112.0], [-15.0, 111.49], [-15.0, 121.9], [-19.4, 121.9], [-19.4, 118.0],
  [-20.1, 118.0], [-20.1, 113.6], [-24.4, 113.6]];
const SOL_PERGOLA = [[PERGOLA.x0, PERGOLA.z0], [PERGOLA.x1, PERGOLA.z0], [PERGOLA.x1, PERGOLA.z1], [PERGOLA.x0, PERGOLA.z1]];

// Les jeunes arbres du jardin rénové (gabarits.json > arbres > ajouter, zones Z07 et Z08) : la zone dessine leurs tuteurs
// et leur cuvette de paillis ; 2 ou 3 piquets (R5.md Z07-F03, F07, F09)
export const JEUNES_ARBRES = [[-22.4, 72.5, 3], [-22.4, 79.5, 3], [-22.4, 86.5, 3], [-13.0, 76.2, 3], [-8.0, 94.5, 3], [-4.2, 99.0, 3], [-8.0, 113.8, 3], [-25.0, 119.3, 2]];

// Un point d'une trace à la fraction `f` de sa longueur, décalé de `d` m à sa DROITE (pour le grand arc, parcouru du nord
// au sud : la droite est le dedans, vers la fontaine) ; et le cap (degrés) de qui, posé là, regarde la fontaine. Pur.
function surTrace(L, f, d) {
  let tot = 0;
  for (let i = 1; i < L.length; i++) tot += Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]);
  let s = f * tot;
  for (let i = 1; i < L.length; i++) {
    const [ax, az] = L[i - 1], [bx, bz] = L[i], l = Math.hypot(bx - ax, bz - az);
    if (s <= l || i === L.length - 1) {
      const t = Math.min(1, s / l), tx = (bx - ax) / l, tz = (bz - az) / l, x = ax + (bx - ax) * t - tz * d, z = az + (bz - az) * t + tx * d;
      return [+x.toFixed(2), +z.toFixed(2), +((Math.atan2(FONTAINE.x - x, FONTAINE.z - z) * 180) / Math.PI).toFixed(1)];
    }
    s -= l;
  }
  return null;
}
// Le mobilier (pur : les obstacles le relisent). Lampadaires « du bas » (fût rouille) : [x, z] ; bornes ; bancs noirs :
// [x, z, cap] (cap : la direction du regard de qui s'assoit, en degrés, 0 = z+, 90 = x+). Autour de l'hémicycle : les
// lampadaires dans la pelouse, au bord intérieur du grand arc ; les bancs sur l'allée, adossés au massif, tournés vers la
// fontaine (R5.md Z07-F03 : « un banc noir, un lampadaire à fût rouille » au bord de l'allée courbe).
const ARC = REPLI.hemicycle_arc;
const LAMPES = {
  Z07a: [[-20.15, 69.5], [-20.15, 83.5], [-9.6, 66.4], [-9.6, 79.6], [-11.6, 59.35]],
  Z07b: [[-10.4, 98.6], [-10.4, 109.4], ...[0.12, 0.3, 0.43, 0.57, 0.7, 0.88].map((f) => surTrace(ARC, f, 1.75).slice(0, 2))],
  Z07c: [[-20.6, 89.4], [-19.0, 112.9]],
};
const BORNES = {
  Z07a: [[-19.75, 66.4], [-16.45, 66.4], [-0.35, 68.6], [-0.35, 77.4]],
  Z07b: [[1.4, 102.35], [1.4, 105.95], [5.6, 102.35], [5.6, 105.95]],
  Z07c: [],
};
const BANCS = {
  Z07a: [[-8.4, 68.6, 90], [-8.4, 77.4, 90]],
  Z07b: [0.2, 0.36, 0.64, 0.8].map((f) => surTrace(ARC, f, -0.8)),
  Z07c: [],
};
// Les tables de la terrasse (x, z) et ses deux parasols (fermés : fin septembre), le grand bac rond noir du parvis nord ;
// (relecture : au milieu de la terrasse, elles barraient le passage de la rampe à l'escalier : elles sont contre la
// façade, le passage d'1,4 m longe la fontaine)
const TABLES = [[-23.78, 97.4], [-23.78, 100.4], [-23.78, 103.4], [-23.78, 106.4]];
const PARASOLS = [[-23.85, 98.9], [-23.85, 104.9]];
const BAC_ROND = { x: -20.25, z: 92.6, r: 0.5, h: 0.7 };

// Les morceaux : le nord (seuil, escalier, allées du nord, place blanche), l'hémicycle (fontaine, placette, arcs,
// massifs), le pavillon (et sa terrasse, sa pergola). Boîtes de 48 m au plus (conception, § 3.5).
const BOITES = { Z07a: [-27.5, 50.0, 9.0, 88.0], Z07b: [-22.0, 80.5, 9.0, 129.0], Z07c: [-32.0, 86.0, -17.0, 120.5] };

// ============================================================================================ petits outils
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const parId = (liste, id) => (liste || []).find((e) => e && e.id === id) || null;
function donnees(ctx) { const s = ctx && ctx.scene && ctx.scene.userData && ctx.scene.userData.solParc; return (s && s.d) || null; }
// le tracé d'une allée de la zone (données, sinon le repli)
const trace = (D, id) => ((parId(D && D.allees, id) || {}).trace) || REPLI[id];

// Les teintes du « bas » (SYNTHESE.md § C) : relevées sur les photos, rendues un cran plus sombres au sol (un sol
// horizontal reçoit tout le ciel : la teinte photographiée, telle quelle, sortait presque blanche — même remarque que
// le lot B7, teinteEsplanade de js/parc/zones/z14_haut_nord_est.js)
export const COULEURS = {
  stabilise: '#aaa394', bordure: '#4a4038', rouille: '#7d4430', noir: '#1d1f20', pierre: '#c9c1b3', pierreOmbre: '#b3ab9f',
  dallage: '#a7a39b', paillis: '#5e4330', piquet: '#9a8361', anthracite: '#3c4046', vertChaise: '#3f6b4a', vitre: '#4a5860',
  creme: '#e4dccb', pilastre: '#4a5058', acrotere: '#d9dad6', zinc: '#a9adae', menuiserie: '#3a3f45', porte: '#6a6f74',
};

// ============================================================================================ les outils du lot B9
// outilsB9(kit, Monde) : ce que Z07 et Z08 partagent — le mobilier du bas (lampadaire rouille, borne), les allées de
// stabilisé à bordurettes d'acier, les tuteurs des jeunes arbres, la teinte du sol. Comme les outils des lots B2 et B7,
// tout dépend du kit et du monde, passés en paramètres.
export function outilsB9(kit, Monde) {
  const O = outilsB7(kit, Monde), T = outilsB2(kit, Monde), B = {};
  B.O = O; B.T = T;
  // la teinte d'un sol clair : multiplicateur de la matière du kit, des taches lentes, les bords un peu plus sombres
  B.teinteSol = (mat, hex, graine, ampl = 0.12) => {
    const base = O.c(mat, hex), out = [0, 0, 0];
    return (x, z, e = 0) => {
      const f = (1 - 0.12 * lisse(0.78, 1, Math.abs(e))) * (1 + ampl * (kit.bruit(x / 3.5, z / 3.5, graine) - 0.5)) * (1 + 0.5 * ampl * (kit.bruit(x / 0.8, z / 0.8, graine + 1) - 0.5));
      out[0] = base[0] * f; out[1] = base[1] * f; out[2] = base[2] * f;
      return out;
    };
  };
  // LE LAMPADAIRE DU BAS (R5.md Z07-F01, F08 ; Z08-C03) : fût d'acier brun rouille de 3,7 m, légèrement effilé, collier et
  // lanterne cylindrique noirs (verre dépoli autour, chapeau plat), 4,45 m en tout. Dans le Lot du morceau (peinture et
  // verre : deux appels pour tous les lampadaires du morceau).
  B.lampe = (lot, x, z) => {
    const y = kit.sol(x, z), M = (yy) => O.T(x, y + yy, z), rouille = O.p(COULEURS.rouille), noir = O.p(COULEURS.noir);
    lot.tour('peinture', [[0.085, -0.15], [0.085, 0.12], [0.07, 0.18], [0.055, 3.62], [0.05, 3.7]], 10, M(0), { bande: true, couleur: rouille });
    lot.tour('peinture', [[0.06, 0], [0.075, 0.04], [0.075, 0.1], [0.12, 0.12], [0.125, 0.16]], 12, M(3.68), { bande: true, couleur: noir, fond: true });
    lot.tour('verre', [[0.112, 0.16], [0.112, 0.58]], 12, M(3.68));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4, cx = Math.cos(a) * 0.118, cz = Math.sin(a) * 0.118;
      lot.barre([x + cx, y + 3.84, z + cz], [x + cx, y + 4.27, z + cz], 0.018, 0.018, { couleur: noir });
    }
    lot.tour('peinture', [[0.125, 4.26], [0.15, 4.28], [0.15, 4.33], [0.06, 4.39], [0.001, 4.4]], 12, M(0), { bande: true, couleur: noir, fond: true });
  };
  // LA BORNE BASSE (1 m, même fût rouille, verre et chapeau noirs)
  B.borne = (lot, x, z) => {
    const y = kit.sol(x, z), M = O.T(x, y, z);
    lot.tour('peinture', [[0.09, -0.1], [0.09, 0.82], [0.085, 0.86]], 10, M, { bande: true, couleur: O.p(COULEURS.rouille) });
    lot.tour('verre', [[0.082, 0.86], [0.082, 0.98]], 10, M);
    lot.tour('peinture', [[0.1, 0.97], [0.105, 1.0], [0.07, 1.04], [0.001, 1.05]], 10, M, { bande: true, couleur: O.p(COULEURS.noir), fond: true });
  };
  // LES ALLÉES DE STABILISÉ (coteau.js, allee : sections au tracé exact des données, coupées par une boîte) : dans une
  // nappe, matière « gravier » du kit (le stabilisé clair des photos), teinte du bas.
  // (deux allées qui se croisent sont dans la même nappe : chacune son `dy`, à 2 mm près, pour qu'elles ne se disputent
  // pas la profondeur au croisement)
  // (un GÉNÉRATEUR : la main rendue entre deux allées quand le budget de l'image est épuisé — `budget` : ctx.budget)
  B.allees = function* (nappe, liste, boite, teinte, budget = () => false) {
    for (const a of liste) {
      allee({ trace: a.trace, largeur: a.largeur, boite: a.boite || boite, tuile: kit.TUILES.gravier, dy: a.dy ?? 0.024, teinte, pas: 0.5 }, nappe);
      if (budget()) yield;
    }
  };
  // LES BORDURETTES D'ACIER (R5.md Z07-F03, F08, Commons 01 : une lame d'acier sombre au ras du sol, des deux côtés des
  // allées et autour des pelouses) : le long des deux bords d'une allée, interrompues là où une autre allée, un dallage,
  // un escalier ou l'eau s'y raccorde (on sonde le monde à 45 cm au-delà du bord, comme les bordures du coteau) ; dans
  // le Lot (matière peinture : un appel). `garder(x, z)` : la part de la zone ou du morceau. GÉNÉRATEUR, comme B.allees :
  // la main rendue entre deux tronçons de 15 m au plus.
  B.bordurettes = function* (lot, ligne, larg, garder = () => true, budget = () => false) {
    for (const cote of [-1, 1]) {
      const E = bord(ligne, larg / 2 + 0.01, cote, 0.5), P = bord(ligne, larg / 2 + 0.45, cote, 0.5);
      let cur = [];
      const fin = () => { if (cur.length >= 2) kit.bordure({ ligne: cur, largeur: 0.012, hauteur: 0.018, materiau: 'acier' }, lot); cur = []; };
      for (let i = 0; i < E.length; i++) {
        const p = P[i], f = Monde.drapeaux(p.x + Monde.dx, p.z), s = Monde.surface(p.x + Monde.dx, p.z);
        const raccord = (f & (DRAPEAU.ALLEE | DRAPEAU.ESCALIER | DRAPEAU.EAU)) !== 0 || s === SURFACE.DALLES;
        if (!raccord && garder(E[i].x, E[i].z)) {
          cur.push([E[i].x, E[i].z]);
          if (cur.length > 30) { const d = cur[cur.length - 1]; fin(); cur.push(d); if (budget()) yield; }
        } else fin();
      }
      fin();
      if (budget()) yield;
    }
  };
  // Une bordurette le long d'un contour (placette, parvis) : seulement où il touche la pelouse ou un massif (sondé à 45 cm
  // dehors, en s'éloignant de `centre` : son centre, sinon la moyenne de ses sommets) ; `ferme` : le contour fait le tour
  B.bordContour = (lot, poly, garder = () => true, ferme = true, centre = null) => {
    const pts = kit.reechantillonner(poly, 0.5, ferme);
    const cx = centre ? centre[0] : poly.reduce((s, p) => s + p[0], 0) / poly.length, cz = centre ? centre[1] : poly.reduce((s, p) => s + p[1], 0) / poly.length;
    let cur = [];
    const fin = () => { if (cur.length >= 2) kit.bordure({ ligne: cur, largeur: 0.012, hauteur: 0.018, materiau: 'acier' }, lot); cur = []; };
    for (const q of pts) {
      const dx = q.x - cx, dz = q.z - cz, l = Math.hypot(dx, dz) || 1, px = q.x + (dx / l) * 0.45, pz = q.z + (dz / l) * 0.45;
      const s = Monde.surface(px + Monde.dx, pz);
      if ((s === SURFACE.HERBE || s === SURFACE.MASSIF || s === SURFACE.SOUS_BOIS) && garder(q.x, q.z)) cur.push([q.x, q.z]); else fin();
    }
    fin();
  };
  // LES TUTEURS d'un jeune arbre (R5.md Z07-F03, F07 : deux ou trois piquets de bois clair d'environ 1,6 m autour de la
  // tige, reliés par une traverse ; cuvette de paillis brun de 1,5 m) ; le paillis va dans `sol` (le Lot du sol)
  B.tuteurs = (lot, sol, x, z, n = 3) => {
    O.disque(sol, 'terre#sol', x, z, 0.75, 0, { dy: 0.035, couleur: O.taches(O.c('terre', COULEURS.paillis), 611, 0.25), segments: 18 });
    const y = kit.sol(x, z), bois = O.c('bois', COULEURS.piquet), a0 = kit.alea(x, z, 613) * Math.PI;
    // (relecture à l'écran : à 0,32 m de l'axe, les piquets se perdaient dans l'empattement du tronc que
    // js/monde_vegetation.js donne à ces arbres de 4 à 6 m ; à 0,4 m, ils restent dehors, comme sur Commons 03)
    const P = [];
    for (let k = 0; k < n; k++) { const a = a0 + (k / n) * Math.PI * 2; P.push([x + Math.cos(a) * 0.4, z + Math.sin(a) * 0.4]); }
    for (const [px, pz] of P) lot.tour('bois', [[0.032, -0.3], [0.032, 1.55], [0.02, 1.6]], 6, O.T(px, y, pz), { couleur: bois });
    for (let k = 0; k < n; k++) {
      const A = P[k], C = P[(k + 1) % n];
      if (n === 2 && k === 1) break;
      lot.barre([A[0], y + 1.32, A[1]], [C[0], y + 1.32, C[1]], 0.045, 0.025, { cle: 'bois', couleur: bois });
    }
  };
  return B;
}

// La teinte d'un enrobé (multiplicateur) : celle de la rampe ouest, comme Z11 (coteau.js, teinteEnrobe)
const enrobe = (kit) => (x, z, e) => {
  const f = (1 - 0.16 * lisse(0.72, 1, Math.abs(e))) * (1 + 0.1 * (kit.bruit(x / 3.5, z / 3.5, 41) - 0.5)) * (1 + 0.035 * (1 - e * e));
  return [f, f, f * 0.99];
};

// ============================================================================================ les matériaux propres
// LE PAREMENT DU PAVILLON (le seul matériau « de pierre » propre de la zone) : grands blocs de pierre reconstituée crème,
// assises de 0,4 m, blocs de 0,7 m à joints croisés, joints fins gris (R5.md Z07-F01, F07). Une toile de 1024 px pour
// 2,8 m (4 blocs, 7 assises), et sa carte de relief (les joints en creux). Les couleurs de sommet du Lot y ajoutent la
// patine (pied, coulures).
const TUILE_PAREMENT = 2.8;
let _parement = null;
function materiauParement(kit) {
  if (_parement) return _parement;
  const N = 1024, c = document.createElement('canvas'); c.width = N; c.height = N;
  const r = document.createElement('canvas'); r.width = N; r.height = N;
  const g = c.getContext('2d'), h = r.getContext('2d'), px = N / TUILE_PAREMENT, J = 3;
  // (relecture à l'écran : le crème des photos, #d9cbb0 au soleil, sortait jaune sous la lumière du soir ; les blocs sont
  // tenus plus pâles et moins saturés, les joints d'un gris chaud clair)
  // (relecture B9, à côté de Commons 03 : le parement y est d'un crème presque neutre, plus clair que le stabilisé ; dans
  // l'ombre du soir, il sortait encore beige jaune et plus sombre que le sol : un cran plus clair, moins de jaune)
  g.fillStyle = '#c1bcb1'; g.fillRect(0, 0, N, N);
  h.fillStyle = '#404040'; h.fillRect(0, 0, N, N);
  for (let j = 0; j < 7; j++) for (let i = -1; i < 5; i++) {
    const x0 = Math.round((i * 0.7 + (j % 2) * 0.35) * px), y0 = Math.round(j * 0.4 * px), w = Math.round(0.7 * px), hh = Math.round(0.4 * px);
    const t = kit.alea(i + 7, j, 621), u = kit.alea(j, i + 3, 622);
    g.fillStyle = `rgb(${(234 + 12 * (t - 0.5)) | 0},${(230 + 11 * (t - 0.5)) | 0},${(218 + 10 * (u - 0.5)) | 0})`;
    g.fillRect(x0 + J, y0 + J, w - 2 * J, hh - 2 * J);
    h.fillStyle = '#c8c8c8'; h.fillRect(x0 + J, y0 + J, w - 2 * J, hh - 2 * J);
    // le grain de la pierre reconstituée : de petites taches, plus claires ou plus grises
    for (let k = 0; k < 26; k++) {
      const a = kit.alea(i * 31 + k, j * 17, 623), b = kit.alea(j * 13 + k, i * 7, 624), s = 2 + 5 * kit.alea(k, i + j, 625);
      g.fillStyle = kit.alea(i, k + j, 626) < 0.5 ? 'rgba(255,250,235,0.18)' : 'rgba(120,110,95,0.12)';
      g.fillRect(x0 + J + a * (w - 2 * J - s), y0 + J + b * (hh - 2 * J - s), s, s);
    }
  }
  const t = new THREE.CanvasTexture(c), tb = new THREE.CanvasTexture(r);
  for (const x of [t, tb]) { x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 4; }
  t.colorSpace = THREE.SRGBColorSpace;
  _parement = new THREE.MeshStandardMaterial({ map: t, bumpMap: tb, bumpScale: 2.2, roughness: 0.86, metalness: 0, vertexColors: true });
  _parement.name = 'Z07 · parement du pavillon';
  return _parement;
}
// LE JET D'EAU (R5.md Z07-F07 : un jet vertical unique d'environ 1,2 m) et son écume : deux matériaux translucides, sans
// écriture de profondeur ; leurs maillages sont `dynamique` et `nofuse` (ils bougent : ctx.animer).
// (relecture B9 : la transparence du jet varie le long de son profil — gerbe dense au milieu, pointe et pied qui
// s'effacent, brume très claire autour — par un alpha de sommet : couleurs à quatre composantes, que three lit avec
// `vertexColors`. Une pointe d'émissif garde l'eau blanche du côté de l'ombre, comme l'écume de la photo)
let _jet = null, _ecume = null;
function materiauxJet() {
  if (!_jet) {
    _jet = new THREE.MeshStandardMaterial({ color: 0xf4f7f7, emissive: 0x2a2e30, roughness: 0.3, metalness: 0, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    _jet.name = 'Z07 · jet de la fontaine';
    _ecume = new THREE.MeshBasicMaterial({ color: 0xe8eeee, transparent: true, opacity: 0.22, depthWrite: false });
    _ecume.name = 'Z07 · écume du jet';
  }
  return [_jet, _ecume];
}

// ============================================================================================ Z07a : LE NORD
// Le seuil de la rampe ouest, l'escalier de 11 marches, les allées du nord, la traverse, l'allée courbe du nord, la place
// blanche et son édicule, le sous-bois du talus.
function* nord(ctx) {
  const { kit, groupe, K } = ctx, B9 = outilsB9(kit, ctx.Monde), O = B9.O, D = donnees(ctx), b = ctx.budget, id = 'Z07a', BX = BOITES.Z07a;
  // ---- 1. LE SEUIL : le bout asphalté de la rampe ouest (asphalte gris de Z11), de x = -25 au bord de la promenade
  const rampe = (parId(D && D.rampes, 'rampe_ouest') || {}).trace || REPLI.rampe_ouest;
  // (en deux moitiés, une par tranche : 32 m d'un bloc faisaient une tranche de 10 ms)
  const gris = new Nappe();
  allee({ trace: rampe, largeur: 3.5, boite: [-25.0, 50.0, -9.0, 62.0], tuile: 4.04, dy: 0.03, teinte: enrobe(kit) }, gris);
  if (b()) yield;
  allee({ trace: rampe, largeur: 3.5, boite: [-9.0, 50.0, xPromenade(56.8) + 0.05, 62.0], tuile: 4.04, dy: 0.03, teinte: enrobe(kit) }, gris);
  const mg = maillageSol(gris.geometrie(), kit.materiau('asphalte'), 'seuil de la rampe ouest');
  if (mg) groupe.add(O.horsContact(mg));
  if (b()) yield;
  // ses bordures de béton, comme celles de la rampe (coteau.js, bordures : ouvertes au droit des escaliers)
  const lot = new kit.Lot(id), sol = new kit.Lot(id + ' · sol');
  // (les tronçons d'abord, de 12 m au plus ; puis un par tranche)
  const troncons = [];
  for (const cote of [-1, 1]) {
    const E = bord(rampe, 3.5 / 2 + 0.07, cote, 0.45), P = bord(rampe, 3.5 / 2 + 0.6, cote, 0.45);
    let cur = [];
    const fin = () => { if (cur.length > 2) troncons.push(cur); cur = []; };
    for (let i = 0; i < E.length; i++) {
      const e = E[i], p = P[i], f = ctx.Monde.drapeaux(p.x + ctx.Monde.dx, p.z);
      if (e.x > -25 && e.x < xPromenade(e.z) - 0.1 && !(f & (DRAPEAU.ALLEE | DRAPEAU.ESCALIER))) { cur.push([e.x, e.z]); if (cur.length > 27) { const d = cur[cur.length - 1]; fin(); cur.push(d); } } else fin();
    }
    fin();
  }
  for (const t of troncons) {
    const g = kit.bordure({ ligne: t, largeur: 0.12, hauteur: 0.06, materiau: 'beton' }); assombrir(g, 0.55); groupe.add(g);
    if (b()) yield;
  }
  // ---- 2. L'ESCALIER DE 11 MARCHES, du seuil au jardin (béton, mains courantes des deux côtés : données) ; ses limons
  // sont ceux de sa voisine, la volée de 13 marches qui descend du même seuil vers la terrasse du bassin (Z05) : des
  // blocs de calcaire brut posés en file sur le talus (outilsB2, limonsRocaille) — non vu de près (R5.md Z07.3)
  const e11 = parId(D && D.escaliers, 'escalier11_seuil') || REPLI.escalier11_seuil;
  groupe.add(kit.escalier({ de: e11.de, a: e11.a, marches: e11.marches || 11, largeur: e11.largeur || 1.6, limon: false, mainCourante: 'deux', materiau: 'beton', usure: 0.5 }));
  if (b()) yield;
  B9.T.limonsRocaille(lot, e11, e11.largeur || 1.6);
  if (b()) yield;
  // ---- 3. LES ALLÉES DU NORD : l'allée du nord (jusqu'au parvis du pavillon), l'allée parallèle x ≈ -25,5, la traverse,
  // l'allée courbe du nord ; stabilisé clair, bordurettes d'acier
  const st = B9.teinteSol('gravier', COULEURS.stabilise, 631);
  const pierre = new Nappe();
  const liste = [
    { trace: trace(D, 'allee_hemicycle'), largeur: LARGEURS.allee_hemicycle, boite: [-21.0, 64.0, -16.0, 86.0], dy: 0.025 },
    { trace: trace(D, 'hemicycle_x24'), largeur: LARGEURS.hemicycle_x24, boite: [-27.0, 64.0, -23.0, 88.0] },
    { trace: trace(D, 'hemicycle_traverse'), largeur: LARGEURS.hemicycle_traverse, boite: [-17.3, 64.0, -9.0, 80.0], dy: 0.023 },
    { trace: trace(D, 'hemicycle_arc_nord'), largeur: LARGEURS.hemicycle_arc_nord, boite: [-17.3, 64.0, 9.0, 88.0], dy: 0.023 },
  ];
  yield* B9.allees(pierre, liste, BX, st, b);
  // la place blanche (un stabilisé un peu plus clair : l'ortho la montre plus blanche que les allées)
  plaque(PLACE_BLANCHE, { pas: 1, dy: 0.026, tuile: kit.TUILES.gravier, uv: (x, z) => [x, z, 0], teinte: B9.teinteSol('gravier', '#b6b0a3', 633) }, pierre);
  const mp = maillageSol(pierre.geometrie(), kit.materiau('gravier'), 'allées du nord');
  if (mp) groupe.add(O.horsContact(mp));
  if (b()) yield;
  for (const a of liste) yield* B9.bordurettes(lot, a.trace, a.largeur, (x, z) => x >= a.boite[0] && x <= a.boite[2] && z >= a.boite[1] && z <= a.boite[3], b);
  B9.bordContour(lot, PLACE_BLANCHE);
  if (b()) yield;
  // ---- 4. L'ÉDICULE BLANC de la place (2 x 8 x 2,5 m, vu à l'ortho seulement) : un volume enduit blanc, dalle de toit
  // débordante, une porte grise et deux grilles de ventilation vers la place ; et les deux bacs plantés de béton
  {
    const E = EDICULE, y0 = Math.min(kit.sol(E.x0, E.z0), kit.sol(E.x1, E.z1), kit.sol(E.x0, E.z1), kit.sol(E.x1, E.z0)) - 0.1;
    // (un enduit lisse et blanc : la peinture du kit ; le béton, grenu et gris, en faisait un bloc de granit)
    const cx = (E.x0 + E.x1) / 2, cz = (E.z0 + E.z1) / 2, H = E.h + 0.1, blanc = O.p('#d9d7d0');
    lot.boite('peinture', E.x1 - E.x0, H, E.z1 - E.z0, O.T(cx, y0 + H / 2, cz), { chanfrein: 0.02, couleur: blanc, bande: true });
    lot.boite('peinture', E.x1 - E.x0 + 0.2, 0.14, E.z1 - E.z0 + 0.2, O.T(cx, y0 + H + 0.07, cz), { chanfrein: 0.015, couleur: O.p('#c9c7c0'), bande: true });
    const yd = kit.sol(E.x0, cz);
    lot.boite('peinture', 0.05, 2.1, 0.95, O.T(E.x0 - 0.01, yd + 1.05, cz - 1.6), { bande: true, couleur: O.p(COULEURS.porte) });
    for (const dz of [0.6, 2.4]) lot.boite('peinture', 0.04, 0.45, 0.7, O.T(E.x0 - 0.01, yd + 1.7, cz + dz), { bande: true, couleur: O.p('#8c9093') });
    for (const [x0, z0, x1, z1] of BACS) {
      const yb = kit.sol((x0 + x1) / 2, (z0 + z1) / 2);
      lot.boite('beton', x1 - x0, 0.55, z1 - z0, O.T((x0 + x1) / 2, yb + 0.2, (z0 + z1) / 2), { chanfrein: 0.02, couleur: O.c('beton', '#bdb9b0') });
      lot.boite('terre#sol', x1 - x0 - 0.16, 0.02, z1 - z0 - 0.16, O.T((x0 + x1) / 2, yb + 0.46, (z0 + z1) / 2), { couleur: [0.75, 0.72, 0.7] });
    }
  }
  if (b()) yield;
  // ---- 5. LE MOBILIER : lampadaires, bornes, bancs noirs ; les tuteurs des jeunes arbres
  for (const [x, z] of LAMPES[id]) B9.lampe(lot, x, z);
  for (const [x, z] of BORNES[id]) B9.borne(lot, x, z);
  bancsNoirs(K, groupe, BANCS[id].map(([x, z, cap]) => ({ x, z, rot: (cap * Math.PI) / 180 })));
  for (const [x, z, n] of JEUNES_ARBRES) if (dansB(BX, x, z) && z < 88) B9.tuteurs(lot, sol, x, z, n);
  if (b()) yield;
  // ---- 6. LES ARBUSTES DES BACS et LE SOUS-BOIS DU TALUS (du seuil au jardin, et la lisière du coteau, x < -26,2) :
  // lierre et feuilles là où le monde met du sous-bois ou une pente trop raide pour être tondue (coteau.js, couvreSol)
  const feu = new Touffes();
  for (const [x0, z0, x1, z1] of BACS) for (let z = z0 + 0.5; z < z1 - 0.3; z += 0.75) {
    arbuste(feu, { x: (x0 + x1) / 2 + 0.25 * (kit.alea(z, x0, 641) - 0.5), z, h: 0.55 + 0.35 * kit.alea(x0, z, 642), R: 0.42, pal: kit.alea(z, z0, 643) < 0.5 ? 'moyen' : 'eleagnus' });
  }
  const mf = maillageFeuillage(feu, K, 'arbustes des bacs', true);
  if (mf) groupe.add(mf);
  if (b()) yield;
  const couvre = new Touffes();
  const evite = [{ trace: rampe, demi: 1.75 }, { trace: [e11.de.slice(0, 2), e11.a.slice(0, 2)], demi: 1.0 }, { trace: trace(D, 'hemicycle_x24'), demi: 0.7 }];
  yield* couvreSol(couvre, [-27.5, 58.6, 7.0, 66.0], evite, { pas: ctx.mobile ? 1.6 : 1.1, budget: b, graine: 71 });
  yield* couvreSol(couvre, [-27.5, 66.0, -26.3, 88.0], evite, { pas: ctx.mobile ? 1.6 : 1.1, budget: b, graine: 73 });
  const mc = maillageFeuillage(couvre, K, 'sous-bois du talus nord', false);
  if (mc) groupe.add(mc);
  if (b()) yield;
  groupe.add(O.horsContact(sol.maillages('ZONE ' + id + ' · sol')));
  if (b()) yield;
  groupe.add(maillagesLot(lot, 'ZONE ' + id));
}

// ============================================================================================ Z07b : L'HÉMICYCLE
// La fontaine, sa placette et ses pots, le grand arc, l'allée rayonnante, l'allée courbe du sud, le bout de l'allée du
// nord et le parvis sud, les massifs en arc, le mobilier.
function* hemicycle(ctx) {
  const { kit, groupe, K } = ctx, B9 = outilsB9(kit, ctx.Monde), O = B9.O, T = B9.T, D = donnees(ctx), b = ctx.budget, id = 'Z07b', BX = BOITES.Z07b;
  const lot = new kit.Lot(id), sol = new kit.Lot(id + ' · sol');
  // ---- 1. LE SOL CLAIR : la placette ronde, le parvis sud, les allées (stabilisé), leurs bordurettes
  const st = B9.teinteSol('gravier', COULEURS.stabilise, 651);
  const pierre = new Nappe();
  // (la placette est un peu plus claire que les allées, ses bords s'assombrissent vers la pelouse)
  plaque(PLACETTE, { pas: 1, dy: 0.03, tuile: kit.TUILES.gravier, uv: (x, z) => [x, z, Math.min(1, Math.hypot(x - FONTAINE.x, z - FONTAINE.z) / 8)], teinte: B9.teinteSol('gravier', '#b2ab9c', 653) }, pierre);
  if (b()) yield;
  plaque(PARVIS_SUD, { pas: 1, dy: 0.028, tuile: kit.TUILES.gravier, uv: (x, z) => [x, z, 0], teinte: st }, pierre);
  if (b()) yield;
  // (le bout de l'allée du nord s'arrête au bord de la placette, 30 cm dedans : z 96,3 ; au-delà, les données la font
  // contourner la fontaine par l'est, sur la placette elle-même)
  const liste = [
    { trace: trace(D, 'hemicycle_arc'), largeur: LARGEURS.hemicycle_arc, dy: 0.022 },
    { trace: trace(D, 'hemicycle_rayon'), largeur: LARGEURS.hemicycle_rayon, boite: [-10.2, 80, xPromenade(104) + 0.05, 129], dy: 0.026 },
    { trace: trace(D, 'hemicycle_arc_sud'), largeur: LARGEURS.hemicycle_arc_sud, dy: 0.024 },
    { trace: [[-18.55, 86.0], [-18.55, 96.3]], largeur: LARGEURS.allee_hemicycle, dy: 0.025 },
  ];
  yield* B9.allees(pierre, liste, BX, st, b);
  const mp = maillageSol(pierre.geometrie(), kit.materiau('gravier'), 'placette et allées de l\'hémicycle');
  if (mp) groupe.add(O.horsContact(mp));
  if (b()) yield;
  for (const a of liste) yield* B9.bordurettes(lot, a.trace, a.largeur, (x, z) => (a.boite ? dansB(a.boite, x, z) : true) && z > 80.5, b);
  B9.bordContour(lot, PLACETTE.filter(([x]) => x > TERRASSE.x1 + 0.01), () => true, false, [FONTAINE.x, FONTAINE.z]);
  B9.bordContour(lot, PARVIS_SUD);
  if (b()) yield;
  // ---- 2. LA FONTAINE
  yield* fontaine(ctx, B9, lot, sol);
  if (b()) yield;
  // ---- 3. LES MASSIFS EN ARC : une terre paillée, deux rangs d'arbustes ronds en quinconce (l'ortho : des points
  // sombres réguliers), des graminées entre eux ; un massif de vivaces bas en lisière, côté grand arc
  const terre = O.taches(O.c('terre', '#4b3a2b'), 661, 0.2);
  for (const poly of MASSIFS) {
    O.drape(sol, 'terre#sol', poly, { dy: 0.03, couleur: terre, pas: 1 });
    if (b()) yield;
  }
  const feu = new Touffes(), gram = [], arc = trace(D, 'hemicycle_arc');
  {
    // la ligne milieu de la bande (le grand arc décalé de 2,5 m vers l'extérieur), un arbuste tous les 1,15 m, deux rangs
    // (relecture : à 1,35 m, la terre paillée se voyait trop entre eux ; l'ortho montre une bande sombre presque pleine)
    const L = bord(arc, 2.52, -1, 0.5);
    let s0 = -10, nA = 0;
    for (let i = 0; i < L.length; i++) {
      const q = L[i];
      if (q.s - s0 < 0.575) continue;
      s0 = q.s;
      const k = Math.round(q.s / 0.575), rang = k % 2 ? 0.45 : -0.45, A = L[Math.max(0, i - 1)], C = L[Math.min(L.length - 1, i + 1)];
      const tx = C.x - A.x, tz = C.z - A.z, l = Math.hypot(tx, tz) || 1, x = q.x - (tz / l) * rang, z = q.z + (tx / l) * rang;
      if (!dansMassif(x, z, 0.35)) continue;
      if (kit.alea(x, z, 663) < 0.2) { gram.push([x, z, 0.8 + 0.25 * kit.alea(z, x, 664)]); continue; }
      arbuste(feu, { x, z, h: 0.75 + 0.3 * kit.alea(x, z, 665), R: 0.56 + 0.12 * kit.alea(z, x, 666), pal: ['moyen', 'sombre', 'eleagnus', 'moyen'][Math.floor(kit.alea(x, z, 667) * 4)] });
      if (++nA % 6 === 0 && b()) yield;
    }
  }
  const mf = maillageFeuillage(feu, K, 'massifs en arc', true);
  if (mf) groupe.add(mf);
  if (b()) yield;
  T.graminees(lot, gram, { eventails: 6 });
  // ---- 4. LE MOBILIER : lampadaires, bornes de l'allée rayonnante, bancs noirs tournés vers la fontaine ; les tuteurs
  for (const [x, z] of LAMPES[id]) B9.lampe(lot, x, z);
  for (const [x, z] of BORNES[id]) B9.borne(lot, x, z);
  bancsNoirs(K, groupe, BANCS[id].map(([x, z, cap]) => ({ x, z, rot: (cap * Math.PI) / 180 })));
  for (const [x, z, n] of JEUNES_ARBRES) if (dansB(BX, x, z) && z >= 88 && x > -21) B9.tuteurs(lot, sol, x, z, n);
  if (b()) yield;
  groupe.add(O.horsContact(sol.maillages('ZONE ' + id + ' · sol')));
  if (b()) yield;
  groupe.add(maillagesLot(lot, 'ZONE ' + id));
}

// LA FONTAINE OCTOGONALE (R5.md Z07-F02, F07, F10) : margelle de pierre claire à tablette, eau à 10 cm sous la tablette,
// fond clair, socle central et jet unique ; six pots sombres plantés de graminées autour (ortho : huit taches sombres ; les
// deux du côté de la terrasse n'y ont pas la place). Hauteurs fixes : le plan d'eau des données (-0,80) et la placette.
function* fontaine(ctx, B9, lot, sol) {
  const { kit, groupe } = ctx, O = B9.O, T = B9.T, F = FONTAINE, b = ctx.budget;
  // le pied : la placette autour (le plus bas du sol, côté est), la margelle 0,47 m plus haut
  let yMin = Infinity;
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; yMin = Math.min(yMin, kit.sol(F.x + Math.cos(a) * (F.ap + 0.4), F.z + Math.sin(a) * (F.ap + 0.4))); }
  const y0 = kit.sol(F.x + F.ap + 0.6, F.z), yTop = y0 + F.h, yEau = yTop - 0.1, yFond = y0 + 0.08;
  const R = (ap) => ap / Math.cos(Math.PI / 8), ai = F.ap - F.tab;
  const pierre = (x, y, z) => { const f = 0.92 + 0.12 * kit.bruit(x * 1.3 + y, z * 1.3, 671) - 0.1 * (1 - lisse(yMin, y0 + 0.25, y)); return O.c('taille', COULEURS.pierre, f); };
  // la margelle : face extérieure, chanfrein, tablette, face intérieure, fond (un tour à huit facettes, faces selon les axes)
  lot.tour('taille', [[R(F.ap), yMin - 0.12], [R(F.ap), yTop - 0.035], [R(F.ap - 0.02), yTop], [R(ai + 0.02), yTop], [R(ai), yTop - 0.02], [R(ai), yFond], [0.001, yFond]],
    8, O.T(F.x, 0, F.z), { a0: Math.PI / 8, facettes: true, vif: true, couleur: pierre(F.x, y0, F.z) });
  // les joints de la tablette : un bloc par côté (des lignes sombres aux huit angles)
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + (k / 8) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    lot.barre([F.x + c * R(ai + 0.01), yTop + 0.002, F.z + s * R(ai + 0.01)], [F.x + c * R(F.ap - 0.01), yTop + 0.002, F.z + s * R(F.ap - 0.01)], 0.012, 0.004, { cle: 'taille', couleur: O.c('taille', '#8e877b') });
  }
  if (b()) yield;
  // l'eau (kit.eauBassin : animée, `dynamique` et `nofuse`), un octogone juste plus grand que la face intérieure
  const eau = [];
  for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + (k / 8) * Math.PI * 2; eau.push([F.x + Math.cos(a) * R(ai + 0.01), F.z + Math.sin(a) * R(ai + 0.01)]); }
  groupe.add(kit.eauBassin({ poly: eau, y: yEau, couleur: '#5f7e82' }));
  // le socle central (pierre, Ø 0,5 m, 0,35 m au-dessus de l'eau) et la buse
  lot.tour('taille', [[0.27, yFond - 0.02], [0.27, yEau + 0.3], [0.25, yEau + 0.35], [0.06, yEau + 0.36]], 16, O.T(F.x, 0, F.z), { couleur: pierre(F.x, yEau, F.z) });
  lot.tour('peinture', [[0.06, yEau + 0.35], [0.045, yEau + 0.42], [0.03, yEau + 0.43]], 10, O.T(F.x, 0, F.z), { bande: true, couleur: O.p('#5a5e5c') });
  // le jet et son écume sur le bassin (animés)
  // (relecture à l'écran : un voile en cloche de 0,3 m de rayon se lisait comme un obélisque de verre)
  // (relecture B9 : la colonne fine et lisse qui l'avait remplacé, coiffée d'une jupe, se lisait comme un bâton sous un
  // abat-jour. Commons 03, agrandie : le jet est une GERBE D'ÉCUME, une flamme blanche large à l'eau (l'eau qui retombe
  // couvre le socle), effilée en pointe ronde vers 1,3 m. Deux tours de révolution à alpha de sommet [rayon, hauteur
  // au-dessus de la buse, alpha] : la gerbe, dense, et une brume plus large et très claire qui en adoucit le bord. L'eau
  // du bassin est 0,42 m sous la buse)
  const [mJet, mEcume] = materiauxJet();
  const yb = yEau + 0.42;
  // (LatheGeometry range ses sommets méridien par méridien : le sommet k est le point k % prof.length du profil, sur le
  // méridien ⌊k / prof.length⌋ ; chaque méridien a sa transparence, du hasard du kit : des filets d'eau plus ou moins
  // denses, qui scintillent quand la gerbe tourne. Le dernier méridien referme le premier : même valeur)
  // (`bosse` : chaque sommet s'écarte de l'axe d'une part tirée au hasard du kit — une gerbe bosselée, comme l'écume, et
  // non un cône lisse ; les normales sont recalculées après)
  const tourAlpha = (prof, n, graine, bosse = 0) => {
    const gT = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), n), nb = gT.attributes.position.count, col = new Float32Array(nb * 4);
    const P = gT.attributes.position.array;
    for (let k = 0; k < nb; k++) {
      const i = Math.floor(k / prof.length) % n, j = k % prof.length, filet = 0.62 + 0.38 * kit.alea(i, graine, 675);
      col[k * 4] = col[k * 4 + 1] = col[k * 4 + 2] = 1; col[k * 4 + 3] = prof[j][2] * filet;
      if (bosse) { const f = 1 + bosse * (kit.alea(i, j + 10 * graine, 676) - 0.5); P[k * 3] *= f; P[k * 3 + 2] *= f; }
    }
    if (bosse) gT.computeVertexNormals();
    gT.setAttribute('color', new THREE.BufferAttribute(col, 4));
    return gT;
  };
  const gerbe = [[0.31, -0.44, 0.3], [0.3, -0.25, 0.55], [0.27, -0.05, 0.72], [0.21, 0.18, 0.82], [0.14, 0.42, 0.86], [0.092, 0.6, 0.8], [0.062, 0.74, 0.62], [0.042, 0.83, 0.42], [0.02, 0.89, 0.2], [0.001, 0.91, 0]];
  const brume = [[0.4, -0.44, 0.1], [0.37, -0.15, 0.16], [0.3, 0.15, 0.18], [0.2, 0.45, 0.16], [0.12, 0.7, 0.12], [0.05, 0.9, 0.05], [0.001, 0.95, 0]];
  const jet = new THREE.Mesh(tourAlpha(gerbe, 18, 1, 0.22), mJet), aura = new THREE.Mesh(tourAlpha(brume, 14, 2, 0.16), mJet);
  for (const [m, nom, ordre] of [[aura, 'brume du jet', 0], [jet, 'jet de la fontaine', 1]]) {
    m.position.set(F.x + ctx.Monde.dx, yb, F.z); m.name = nom; m.castShadow = false; m.receiveShadow = false; m.renderOrder = ordre;
  }
  const gE = new THREE.RingGeometry(0.3, 0.62, 24).rotateX(-Math.PI / 2);
  const ecume = new THREE.Mesh(gE, mEcume); ecume.position.set(F.x + ctx.Monde.dx, yEau + 0.012, F.z); ecume.name = 'écume du jet'; ecume.castShadow = false;
  const g = new THREE.Group(); g.name = 'jet'; g.add(aura, jet, ecume);
  g.userData.dynamique = true; g.userData.nofuse = true;
  g.traverse((o) => { o.userData.dynamique = true; o.userData.nofuse = true; });
  groupe.add(g);
  // (la gerbe palpite : sa hauteur, son évasement et l'écume, sur deux rythmes ; une image sur deux au plus)
  ctx.animer((dt, t) => {
    const p = 1 + 0.04 * Math.sin(t * 7.3) + 0.025 * Math.sin(t * 13.1 + 1.3);
    jet.scale.set(1 + 0.04 * Math.sin(t * 5.1), p, 1 + 0.04 * Math.sin(t * 5.1 + 2.0));
    aura.scale.set(1 + 0.07 * Math.sin(t * 4.3 + 0.7), 1 + 0.6 * (p - 1), 1 + 0.07 * Math.sin(t * 4.7));
    jet.rotation.y = t * 0.4; aura.rotation.y = -t * 0.3;
    ecume.scale.setScalar(1 + 0.06 * Math.sin(t * 6.2));
  });
  if (b()) yield;
  // les six pots sombres (Ø 0,7 m, 0,55 m), plantés de graminées qui partent du terreau
  for (let k = 0; k < 8; k++) {
    if (k === 3 || k === 4) continue;
    const a = Math.PI / 8 + (k / 8) * Math.PI * 2, x = F.x + Math.cos(a) * (R(F.ap) + 0.62), z = F.z + Math.sin(a) * (R(F.ap) + 0.62), y = kit.sol(x, z);
    lot.tour('peinture', [[0.26, -0.03], [0.3, 0.06], [0.35, 0.5], [0.36, 0.55], [0.32, 0.55], [0.3, 0.5]], 16, O.T(x, y, z), { bande: true, couleur: O.p('#2e3134') });
    lot.tour('terre#sol', [[0.31, 0.48], [0.001, 0.5]], 12, O.T(x, y, z), { couleur: [0.6, 0.55, 0.5] });
    T.graminees(lot, [[x, z, 0.62]], { y: y + 0.5, eventails: 6 });
  }
}

// ============================================================================================ Z07c : LE PAVILLON
// Le pavillon des Douceurs, sa terrasse (dallage, face de pierre, rampe, escalier), le mobilier de la terrasse, le parvis
// nord, la pergola et son sol, le bout sud de l'allée parallèle.
function* pavillonDesDouceurs(ctx) {
  const { kit, groupe, K } = ctx, B9 = outilsB9(kit, ctx.Monde), O = B9.O, D = donnees(ctx), b = ctx.budget, id = 'Z07c';
  const lot = new kit.Lot(id), sol = new kit.Lot(id + ' · sol');
  // ---- 1. LE SOL : parvis nord, sol de la pergola, bout de l'allée parallèle (stabilisé) ; terrasse et rampe (dallage
  // gris, à hauteur fixe sur le plan des données)
  const pierre = new Nappe(), st = B9.teinteSol('gravier', COULEURS.stabilise, 681);
  plaque(PARVIS_NORD, { pas: 1, dy: 0.028, tuile: kit.TUILES.gravier, uv: (x, z) => [x, z, 0], teinte: st }, pierre);
  plaque(SOL_PERGOLA, { pas: 1, dy: 0.028, tuile: kit.TUILES.gravier, uv: (x, z) => [x, z, 0], teinte: B9.teinteSol('gravier', '#a69a86', 683) }, pierre);
  // (le bout sud de l'allée parallèle x ≈ -25,5, de z 88 au pignon, est sous le parvis : la nappe claire de l'ortho)
  const mp = maillageSol(pierre.geometrie(), kit.materiau('gravier'), 'parvis du pavillon');
  if (mp) groupe.add(O.horsContact(mp));
  B9.bordContour(lot, PARVIS_NORD, (x, z) => z < 94.7 || x > -21.9);
  B9.bordContour(lot, SOL_PERGOLA);
  if (b()) yield;
  // le dallage de la terrasse (dalles grises de 0,6 m) et de sa rampe : posé sur le plan, 2 cm au-dessus
  const dal = B9.teinteSol('dalles', COULEURS.dallage, 685, 0.08), Tz = TERRASSE;
  B9.T.plaque(sol, 'dalles#sol', [[Tz.x0, Tz.z0], [Tz.x1, Tz.z0], [Tz.x1, Tz.z1], [Tz.x0, Tz.z1]], 5, 22, { y: Tz.y + 0.02, couleur: (x, z) => dal(x, z) });
  B9.T.plaque(sol, 'dalles#sol', [[Tz.x0, Tz.zRampe], [Tz.x1, Tz.zRampe], [Tz.x1, Tz.z0], [Tz.x0, Tz.z0]], 5, 9, { dy: 0.025, couleur: (x, z) => dal(x, z) });
  if (b()) yield;
  // ---- 2. LA FACE DE LA TERRASSE : pierre claire (comme la margelle), de la rampe au bout sud ; elle s'efface au droit de
  // la fontaine, dont la margelle est au même nu (R5.md Z07-F02 : de la terrasse, on voit l'eau par-dessus la margelle)
  {
    // (le côté ouest de l'octogone touche la face de z 102,28 à 105,72 ; ailleurs, la face se voit, jusque dans les deux
    // coins entre la terrasse et les côtés en biais de la margelle)
    // (relecture à l'écran : le sol du monde tient sa marche à mi-chemin entre ses deux nœuds, x -22,0 et -21,5, soit à
    // x -21,75 ; posée sur la ligne du gabarit (-21,95), la face laissait voir devant elle la paroi de terre du sol et le
    // bord de la terrasse : elle avance donc jusqu'à x -21,70)
    // (relecture B9 : le long de la rampe, des blocs à dessus plat montaient en escalier — une marche de 6 cm par bloc, un
    // mur de rocaille. Ils y sont CISAILLÉS : leur dessus suit la pente de la rampe, d'un seul trait jusqu'au dallage)
    const pente = 0.5 / (Tz.z0 - Tz.zRampe), yHaut = (z) => (z < Tz.z0 ? -0.8 + pente * (z - Tz.zRampe) : Tz.y);
    const x = -21.7, dz = FONTAINE.ap * Math.tan(Math.PI / 8);
    for (const [za, zb] of [[Tz.zRampe, Tz.z0], [Tz.z0, FONTAINE.z - dz], [FONTAINE.z + dz, Tz.z1]]) {
      const n = Math.max(1, Math.round((zb - za) / 1.2)), rampe = zb <= Tz.z0;
      for (let i = 0; i < n; i++) {
        const z = za + ((zb - za) * i) / n, z1 = za + ((zb - za) * (i + 1)) / n, zm = (z + z1) / 2, f = O.c('taille', COULEURS.pierre, 0.94 + 0.1 * kit.alea(zm, x, 687));
        const yb = Math.min(kit.sol(x + 0.4, zm), -0.8) - 0.12;
        if (rampe) {
          // le dessus au milieu du bloc, la pente en cisaillement (y += pente·z local) ; le pied, abaissé d'autant, reste enterré
          const yt = yHaut(zm) + 0.035, ybas = yb - (pente * (z1 - z)) / 2, h = yt - ybas;
          lot.boite('taille', 0.32, h, z1 - z - 0.01, O.T(x - 0.16, yt - h / 2, zm).multiply(new THREE.Matrix4().makeShear(0, 0, 0, 0, 0, pente)), { chanfrein: 0.012, couleur: f });
          continue;
        }
        const yt = Math.max(yHaut(z1), yHaut(z)) + 0.035;
        if (yt - yb > 0.15) lot.boite('taille', 0.32, yt - yb, z1 - z - 0.01, O.T(x - 0.16, (yt + yb) / 2, zm), { chanfrein: 0.012, couleur: f });
      }
    }
  }
  // l'escalier de 3 marches, accolé à la margelle, vers la placette (pierre claire, comme la face) ; élargi jusqu'à la
  // marche du sol (x -21,70, voir la face), sur le même plan incliné
  groupe.add(kit.escalier({ de: [ESC3.de[0] + 0.125, ESC3.de[1], ESC3.de[2]], a: [ESC3.a[0] + 0.125, ESC3.a[1], ESC3.a[2]], marches: ESC3.marches, largeur: ESC3.largeur + 0.25, limon: false, materiau: 'taille', usure: 0.4 }));
  // le MURET-PARAPET de même pierre (R5.md Z07-F02, photo prise d'une table : entre la table et l'eau, un muret de
  // pierre claire ; SYNTHESE.md § Z07 « un muret-parapet de pierre claire côté fontaine ») : des blocs de 1,1 m sur la
  // face, 0,42 m au-dessus du dallage, et leur tablette débordante ; au droit de la fontaine, il est son côté ouest, posé
  // sur la tablette de la margelle (de la terrasse, on voit l'eau par-dessus)
  {
    const P = PARAPET, n = Math.round((P.z1 - P.z0) / 1.1), yb = Tz.y - 0.07, yt = Tz.y + P.h, ep = P.x1 - P.x0, cx = (P.x0 + P.x1) / 2;
    for (let i = 0; i < n; i++) {
      const z = P.z0 + ((P.z1 - P.z0) * i) / n, z1 = P.z0 + ((P.z1 - P.z0) * (i + 1)) / n, zm = (z + z1) / 2, f = 0.94 + 0.1 * kit.alea(zm, cx, 689);
      lot.boite('taille', ep, yt - 0.06 - yb, z1 - z - 0.012, O.T(cx, (yb + yt - 0.06) / 2, zm), { chanfrein: 0.008, couleur: O.c('taille', COULEURS.pierreOmbre, f) });
      lot.boite('taille', ep + 0.06, 0.06, z1 - z - 0.006, O.T(cx, yt - 0.03, zm), { chanfrein: 0.01, couleur: O.c('taille', COULEURS.pierre, f) });
    }
  }
  if (b()) yield;
  // ---- 3. LE PAVILLON
  yield* pavillon(ctx, B9, lot);
  if (b()) yield;
  // ---- 4. LA TERRASSE : tables d'anthracite, chaises vertes, deux parasols blancs fermés ; le grand bac rond noir du
  // parvis nord, planté de graminées
  for (const [x, z] of TABLES) {
    const y = Tz.y + 0.02, anth = O.p(COULEURS.anthracite), vert = O.p(COULEURS.vertChaise);
    lot.boite('peinture', 0.7, 0.03, 0.7, O.T(x, y + 0.74, z), { bande: true, couleur: anth });
    lot.tour('peinture', [[0.035, 0], [0.035, 0.72]], 8, O.T(x, y, z), { bande: true, couleur: anth });
    lot.tour('peinture', [[0.26, 0], [0.24, 0.025], [0.04, 0.04]], 12, O.T(x, y, z), { bande: true, couleur: anth });
    for (const s of [-1, 1]) chaise(lot, O, x, y, z + s * 0.62, s < 0 ? 0 : 180, vert);
  }
  for (const [x, z] of PARASOLS) {
    const y = Tz.y + 0.02;
    lot.tour('peinture', [[0.25, 0], [0.25, 0.08], [0.03, 0.1], [0.022, 2.35], [0.012, 2.45]], 12, O.T(x, y, z), { bande: true, couleur: O.p('#5c5f61') });
    // (relecture B9 : en fuseau symétrique, la toile se lisait comme un cocon. Fermée, elle pend du moyeu, au sommet, et
    // se ramasse en plis vers le bas, où les baleines se serrent contre le mât : une goutte renversée, la pointe en haut ;
    // huit pans, le nombre de baleines, et une sangle sombre)
    lot.tour('peinture', [[0.035, 1.02], [0.1, 1.12], [0.145, 1.36], [0.14, 1.66], [0.105, 1.98], [0.055, 2.24], [0.028, 2.33]], 8, O.T(x, y, z), { bande: true, couleur: O.p('#e6e2d6') });
    lot.tour('peinture', [[0.148, 1.47], [0.148, 1.53]], 8, O.T(x, y, z), { bande: true, couleur: O.p('#6d6a62') });
  }
  {
    const { x, z, r, h } = BAC_ROND, y = kit.sol(x, z);
    lot.tour('peinture', [[r - 0.02, -0.05], [r, 0.04], [r, h], [r - 0.04, h], [r - 0.05, h - 0.04]], 24, O.T(x, y, z), { bande: true, couleur: O.p('#141516') });
    lot.tour('terre#sol', [[r - 0.04, h - 0.06], [0.001, h - 0.05]], 16, O.T(x, y, z), { couleur: [0.6, 0.55, 0.5] });
    const pts = [[x, z, 1.0], [x + 0.22, z + 0.12, 0.8], [x - 0.2, z + 0.15, 0.78], [x + 0.05, z - 0.24, 0.82]];
    B9.T.graminees(lot, pts, { y: y + h - 0.06, eventails: 6 });
  }
  if (b()) yield;
  // ---- 5. LA PERGOLA d'acier noir (R5.md Z07-F07 : tubes carrés de 0,12 m, poteaux à 3,5 m d'entraxe, 3 m, poutres et
  // chevrons sans couverture)
  // (relecture : sur Commons 03, un acier gris anthracite plutôt que noir, des chevrons fins et espacés)
  {
    const P = PERGOLA, noir = O.p('#34383b'), xs = [P.x0, (P.x0 + P.x1) / 2, P.x1], zs = [P.z0, P.z1];
    for (const x of xs) for (const z of zs) { const y = kit.sol(x, z); lot.barre([x, y - 0.1, z], [x, y + P.h, z], 0.11, 0.11, { couleur: noir }); }
    const yH = kit.sol((P.x0 + P.x1) / 2, (P.z0 + P.z1) / 2) + P.h;
    for (const z of zs) lot.barre([P.x0 - 0.2, yH - 0.05, z], [P.x1 + 0.2, yH - 0.05, z], 0.1, 0.12, { couleur: noir });
    for (const x of xs) lot.barre([x, yH + 0.06, P.z0 - 0.15], [x, yH + 0.06, P.z1 + 0.15], 0.08, 0.1, { couleur: noir });
    for (let x = P.x0 + 0.88; x < P.x1 - 0.4; x += 0.88) lot.barre([x, yH + 0.13, P.z0 - 0.08], [x, yH + 0.13, P.z1 + 0.08], 0.04, 0.06, { couleur: noir });
  }
  // ---- 6. LE MOBILIER et les tuteurs
  for (const [x, z] of LAMPES[id]) B9.lampe(lot, x, z);
  for (const [x, z, n] of JEUNES_ARBRES) if (x <= -21 && z >= 88) B9.tuteurs(lot, sol, x, z, n);
  if (b()) yield;
  groupe.add(O.horsContact(sol.maillages('ZONE ' + id + ' · sol')));
  if (b()) yield;
  groupe.add(maillagesLot(lot, 'ZONE ' + id));
}

// LE PAVILLON DES DOUCEURS. Les murs de parement sont des FORMES PERCÉES (THREE.Shape et ses trous) extrudées sur 0,35 m,
// dans un Lot à part dont le maillage reçoit la toile du parement (materiauParement) ; tout le reste (pilastres, acrotère,
// menuiseries, vitres, portes, toit) est dans le Lot du morceau.
function* pavillon(ctx, B9, lot) {
  const { kit, groupe } = ctx, O = B9.O, b = ctx.budget, P = PAV;
  const lotP = new kit.Lot('parement');
  const yP = P.yP, yH = yP + P.haut, L = P.zS - P.zN, Wd = P.xE - P.xO;
  // le pied : le plus bas du sol le long des quatre façades, moins 15 cm
  let yMin = Infinity;
  for (let s = 0; s <= 1.0001; s += 0.05) {
    yMin = Math.min(yMin, kit.sol(P.xE + 0.3, P.zN + L * s), kit.sol(P.xO + Wd * s, P.zN - 0.3), kit.sol(P.xO + Wd * s, P.zS + 0.3));
  }
  yMin -= 0.15;
  const v0 = yMin - yP;
  // la patine du parement (couleur de sommet, multiplie la toile) : pied grisé, coulures sous l'acrotère, taches lentes
  const patine = (x, y, z) => {
    const h = y - yMin, tache = 0.96 + 0.08 * kit.bruit(x * 0.4 + z * 0.4, y * 0.6, 691);
    const coul = Math.max(0, kit.bruit((x + z) * 2.1, 0.5, 692) * 1.6 - 0.9) * Math.exp(-(yH - y) / 1.2);
    const f = tache * (1 - 0.12 * (1 - lisse(0, 0.7, h))) * (1 - 0.25 * coul);
    return [f, f * 0.995, f * 0.98];
  };
  // UNE FACE PERCÉE : rect (u de 0 à long, v de v0 à haut), trous [{ u, l, bas, haut, r }] (r : rayon de l'arc, 0 : droit) ;
  // placée par M (u -> le long de la face, v -> y - yP, profondeur -> vers l'intérieur)
  const face = (long, trous, M) => {
    const f = new THREE.Shape();
    f.moveTo(0, v0); f.lineTo(long, v0); f.lineTo(long, P.haut); f.lineTo(0, P.haut); f.lineTo(0, v0);
    for (const t of trous) {
      const p = new THREE.Path(), a = t.u - t.l / 2, c = t.u + t.l / 2;
      p.moveTo(a, t.bas); p.lineTo(c, t.bas); p.lineTo(c, t.haut);
      if (t.r > 0) p.absarc(t.u, t.haut, t.l / 2, 0, Math.PI, false); else p.lineTo(a, t.haut);
      p.lineTo(a, t.bas);
      f.holes.push(p);
    }
    const g = new THREE.ExtrudeGeometry(f, { depth: P.ep, bevelEnabled: false, curveSegments: 10 });
    lotP.geo('taille', g, M, { couleur: patine, uvBoite: true, tuile: TUILE_PAREMENT });
    g.dispose();
  };
  // les repères des quatre faces : u le long, v en hauteur (depuis le plancher), la profondeur vers l'intérieur
  const mE = new THREE.Matrix4().set(0, 0, -1, P.xE, 0, 1, 0, yP, 1, 0, 0, P.zN, 0, 0, 0, 1);                 // u = z - zN ; dehors x+
  const mN = new THREE.Matrix4().set(1, 0, 0, P.xO, 0, 1, 0, yP, 0, 0, 1, P.zN, 0, 0, 0, 1);                  // u = x - xO ; dehors z-
  const mS = new THREE.Matrix4().set(1, 0, 0, P.xO, 0, 1, 0, yP, 0, 0, -1, P.zS, 0, 0, 0, 1);                 // u = x - xO ; dehors z+
  const mO = new THREE.Matrix4().set(0, 0, 1, P.xO, 0, 1, 0, yP, 1, 0, 0, P.zN, 0, 0, 0, 1);                  // u = z - zN ; dehors x-
  // la façade x+ : sept travées devant la terrasse (six portes-fenêtres, la porte pleine au milieu)
  face(L, TRAVEES.map((z) => ({ u: z - P.zN, l: BAIE.l, bas: 0, haut: BAIE.h, r: BAIE.l / 2 })), mE);
  if (b()) yield;
  // le pignon nord : les deux portes des WC, dans leurs niches cintrées (seuil au sol du parvis)
  const yWC = kit.sol(-27.6, P.zN - 0.4), bWC = yWC - yP + 0.03, WC = [-28.6, -26.5];
  face(Wd, WC.map((x) => ({ u: x - P.xO, l: 1.15, bas: bWC, haut: bWC + 2.15, r: 0.575 })), mN);
  // le pignon sud : la porte vitrée à deux vantaux, droite (Commons 03), vers la pergola
  const ySud = kit.sol(-27.7, P.zS + 0.4), bS = ySud - yP + 0.03;
  face(Wd, [{ u: -27.7 - P.xO, l: 1.9, bas: bS, haut: bS + 2.5, r: 0 }], mS);
  if (b()) yield;
  // la façade du talus, aveugle
  face(L, [], mO);
  if (b()) yield;
  const mesP = lotP.maillages('pavillon · parement');
  const matP = materiauParement(kit);
  for (const m of mesP.children) { m.material = matP; m.castShadow = true; m.receiveShadow = true; }
  groupe.add(mesP);
  // ---- le socle de pierre grise (0,3 m, 4 cm en saillie) au pied des quatre faces
  const socle = O.c('taille', '#aaa59a');
  lot.boite('taille', 0.08, 0.32, L + 0.08, O.T(P.xE + 0.02, yMin + 0.16, (P.zN + P.zS) / 2), { chanfrein: 0.01, couleur: socle });
  lot.boite('taille', Wd + 0.08, 0.32, 0.08, O.T((P.xO + P.xE) / 2, yMin + 0.16, P.zN - 0.02), { chanfrein: 0.01, couleur: socle });
  lot.boite('taille', Wd + 0.08, 0.32, 0.08, O.T((P.xO + P.xE) / 2, yMin + 0.16, P.zS + 0.02), { chanfrein: 0.01, couleur: socle });
  // ---- les PILASTRES anthracite (0,3 m, 5 cm en saillie) : entre les travées, aux angles, et aux bouts de la terrasse
  const pil = O.p(COULEURS.pilastre), hP = yH - yMin;
  const pilastresE = [P.zN + 0.15, 96.0, ...TRAVEES.map((z) => z + 0.95), P.zS - 0.15];
  for (const z of pilastresE) lot.boite('peinture', 0.06, hP, 0.3, O.T(P.xE + 0.03, yMin + hP / 2, z), { bande: true, couleur: pil });
  for (const x of [P.xO + 0.15, P.xE - 0.15]) for (const z of [P.zN - 0.03, P.zS + 0.03]) lot.boite('peinture', 0.3, hP, 0.06, O.T(x, yMin + hP / 2, z), { bande: true, couleur: pil });
  for (const x of [-27.55]) for (const z of [P.zN - 0.03]) lot.boite('peinture', 0.3, hP, 0.06, O.T(x, yMin + hP / 2, z), { bande: true, couleur: pil });
  if (b()) yield;
  // ---- l'ACROTÈRE : un bandeau clair de 0,4 m tout autour (quatre murets de 0,2 m sur le haut des murs), une fine
  // corniche en pied, la couvertine ; dedans, la dalle du toit, qui ferme le dessus des murs (vu du belvédère)
  // (relecture B9, à côté de Commons 03 : le bandeau y est lisse et plus clair que le parement, presque blanc, sous une
  // couvertine nette ; le béton grenu du kit le rendait gris moucheté, plus sombre que le mur. Peinture claire, lisse)
  const ac = O.p(COULEURS.acrotere), cx = (P.xO + P.xE) / 2, cz = (P.zN + P.zS) / 2, ea = 0.2;
  for (const [w, d, x, z] of [[ea, L + 0.1, P.xE + 0.05 - ea / 2, cz], [ea, L + 0.1, P.xO - 0.05 + ea / 2, cz], [Wd + 0.1, ea, cx, P.zN - 0.05 + ea / 2], [Wd + 0.1, ea, cx, P.zS + 0.05 - ea / 2]]) {
    lot.boite('peinture', w, P.acro, d, O.T(x, yH + P.acro / 2, z), { chanfrein: 0.01, bande: true, couleur: ac });
    lot.boite('peinture', w + 0.04, 0.05, d + 0.04, O.T(x, yH + P.acro + 0.025, z), { chanfrein: 0.01, bande: true, couleur: O.p('#c8c9c5') });
  }
  lot.boite('peinture', Wd + 0.2, 0.06, L + 0.2, O.T(cx, yH + 0.02, cz), { chanfrein: 0.015, bande: true, couleur: O.p('#c4c5c1') });
  lot.boite('beton', Wd - 0.2, 0.1, L - 0.2, O.T(cx, yH + 0.1, cz), { couleur: O.c('beton', '#8e8f8c') });
  // le TOIT EN CROUPE très plat (zinc gris clair), en retrait derrière l'acrotère : quatre pans de 8°
  {
    const e = 0.25, yE = yH + 0.2, xa = P.xE - e, xr = P.xO + e, za = P.zN + e, zb = P.zS - e, d = (xa - xr) / 2, yF = yE + d * Math.tan((8 * Math.PI) / 180);
    const xm = (xa + xr) / 2, fa = [za + d, zb - d], zinc = O.p(COULEURS.zinc);
    const pan = (pts) => {
      const A = new THREE.Vector3(...pts[0]), Bv = new THREE.Vector3(...pts[1]), C = new THREE.Vector3(...pts[2]);
      const n = new THREE.Vector3().subVectors(Bv, A).cross(new THREE.Vector3().subVectors(C, A)).normalize();
      if (n.y < 0) n.negate();
      lot.polygone('peinture', pts, n.toArray(), { couleur: zinc, uv: (x, y, z, out) => { out[0] = 0.25; out[1] = 0.5; } });
    };
    pan([[xa, yE, za], [xa, yE, zb], [xm, yF, fa[1]], [xm, yF, fa[0]]]);
    pan([[xr, yE, za], [xr, yE, zb], [xm, yF, fa[1]], [xm, yF, fa[0]]]);
    pan([[xa, yE, za], [xr, yE, za], [xm, yF, fa[0]]]);
    pan([[xa, yE, zb], [xr, yE, zb], [xm, yF, fa[1]]]);
  }
  if (b()) yield;
  // ---- LES MENUISERIES de la façade x+ : dormant, deux vantaux à petits bois (3 x 6 carreaux), imposte cintrée à rayons ;
  // la porte du milieu est pleine, grise, à deux panneaux, sous la même imposte vitrée
  const men = O.p(COULEURS.menuiserie), vit = O.p(COULEURS.vitre), pv = 0.12, r = BAIE.l / 2;
  const Pt = (z, v, d) => [P.xE - d, yP + v, z];
  const barre = (a, c, w = 0.045) => lot.barre(a, c, w, w, { couleur: men, haut: [1, 0, 0] });
  for (let i = 0; i < TRAVEES.length; i++) {
    const z = TRAVEES[i];
    if (i % 3 === 2 && b()) yield;
    // la vitre (ou le panneau de la porte) : un plan à 12 cm en retrait, la forme de la baie
    const f = new THREE.Shape();
    f.moveTo(-r, 0); f.lineTo(r, 0); f.lineTo(r, BAIE.h); f.absarc(0, BAIE.h, r, 0, Math.PI, false); f.lineTo(-r, 0);
    const gv = new THREE.ShapeGeometry(f, 10);
    lot.geo('peinture', gv, new THREE.Matrix4().set(0, 0, 1, P.xE - pv - 0.02, 0, 1, 0, yP, -1, 0, 0, z, 0, 0, 0, 1), { couleur: vit, bande: true });
    gv.dispose();
    const porte = i === 3;
    if (porte) {
      lot.boite('peinture', 0.05, BAIE.h, BAIE.l, O.T(P.xE - pv - 0.01, yP + BAIE.h / 2, z), { bande: true, couleur: O.p(COULEURS.porte) });
      for (const s of [-0.38, 0.38]) for (const [v0p, h] of [[0.15, 0.9], [1.25, 0.95]]) lot.boite('peinture', 0.02, h, 0.56, O.T(P.xE - pv + 0.02, yP + v0p + h / 2, z + s), { bande: true, couleur: O.p('#5a5f64') });
      lot.boite('peinture', 0.04, 0.03, 0.16, O.T(P.xE - pv + 0.04, yP + 1.05, z - 0.08), { bande: true, couleur: O.p('#b8b8b2') });
    }
    // le dormant, le meneau, la traverse d'imposte
    barre(Pt(z - r + 0.03, 0, pv), Pt(z - r + 0.03, BAIE.h, pv), 0.07); barre(Pt(z + r - 0.03, 0, pv), Pt(z + r - 0.03, BAIE.h, pv), 0.07);
    barre(Pt(z - r, BAIE.h, pv), Pt(z + r, BAIE.h, pv), 0.07);
    if (!porte) {
      barre(Pt(z - r, 0.04, pv), Pt(z + r, 0.04, pv), 0.08);
      barre(Pt(z, 0, pv), Pt(z, BAIE.h, pv), 0.06);
      for (const du of [(-2 * r) / 3, -r / 3, r / 3, (2 * r) / 3]) barre(Pt(z + du, 0.05, pv), Pt(z + du, BAIE.h, pv), 0.025);
      for (let k = 1; k < 6; k++) { const v = (BAIE.h * k) / 6; barre(Pt(z - r, v, pv), Pt(z + r, v, pv), 0.025); }
    }
    // l'arc de l'imposte et ses rayons
    const arc = [];
    for (let k = 0; k <= 10; k++) { const a = (Math.PI * k) / 10; arc.push(Pt(z + Math.cos(a) * (r - 0.035), BAIE.h + Math.sin(a) * (r - 0.035), pv)); }
    lot.prisme('peinture', [[-0.035, -0.035], [0.035, -0.035], [0.035, 0.035], [-0.035, 0.035]], arc, { bande: true, couleur: men, haut: [1, 0, 0] });
    for (let k = 1; k < 4; k++) { const a = (Math.PI * k) / 4; barre(Pt(z, BAIE.h, pv), Pt(z + Math.cos(a) * (r - 0.05), BAIE.h + Math.sin(a) * (r - 0.05), pv), 0.025); }
  }
  if (b()) yield;
  // ---- le PIGNON NORD : les deux portes grises des WC au fond de leurs niches, l'applique noire, le boîtier vert
  for (const x of WC) {
    const f = new THREE.Shape();
    f.moveTo(-0.575, 0); f.lineTo(0.575, 0); f.lineTo(0.575, 2.15); f.absarc(0, 2.15, 0.575, 0, Math.PI, false); f.lineTo(-0.575, 0);
    const g = new THREE.ShapeGeometry(f, 10);
    // (le fond de la niche regarde dehors, vers z- : repère miroir, le Lot retourne les triangles)
    lot.geo('peinture', g, new THREE.Matrix4().set(1, 0, 0, x, 0, 1, 0, yWC + 0.03, 0, 0, -1, P.zN + 0.12, 0, 0, 0, 1), { couleur: O.p('#d2c7ad'), bande: true });
    g.dispose();
    lot.boite('peinture', 0.9, 2.05, 0.05, O.T(x, yWC + 0.03 + 1.025, P.zN + 0.1), { bande: true, couleur: O.p(COULEURS.porte) });
    lot.boite('peinture', 0.14, 0.03, 0.04, O.T(x + 0.3, yWC + 1.05, P.zN + 0.06), { bande: true, couleur: O.p('#b8b8b2') });
  }
  lot.boite('peinture', 0.14, 0.22, 0.12, O.T(-27.55, yWC + 2.75, P.zN - 0.1), { bande: true, couleur: O.p(COULEURS.noir) });
  lot.boite('verre', 0.1, 0.12, 0.02, O.T(-27.55, yWC + 2.7, P.zN - 0.16));
  lot.boite('peinture', 0.42, 0.55, 0.16, O.T(-25.05, yWC + 1.35, P.zN - 0.09), { bande: true, couleur: O.p('#1f7a4a') });
  lot.boite('peinture', 0.3, 0.12, 0.02, O.T(-25.05, yWC + 1.5, P.zN - 0.18), { bande: true, couleur: O.p('#e9e9e4') });
  // ---- le PIGNON SUD : la porte vitrée à deux vantaux (dormant, meneau, imposte droite, petits bois)
  {
    const x = -27.7, rr = 0.95, h0 = ySud + 0.03, H = 2.5;
    lot.boite('peinture', 1.9, H, 0.02, O.T(x, h0 + H / 2, P.zS - pv - 0.02), { bande: true, couleur: vit });
    const Q = (u, v) => [x + u, h0 + v, P.zS - pv];
    const bS = (a, c, w = 0.045) => lot.barre(a, c, w, w, { couleur: men, haut: [0, 0, 1] });
    bS(Q(-rr + 0.03, 0), Q(-rr + 0.03, H), 0.07); bS(Q(rr - 0.03, 0), Q(rr - 0.03, H), 0.07); bS(Q(0, 0), Q(0, 2.05), 0.07);
    bS(Q(-rr, H - 0.03), Q(rr, H - 0.03), 0.07); bS(Q(-rr, 2.05), Q(rr, 2.05), 0.06); bS(Q(-rr, 0.04), Q(rr, 0.04), 0.08);
    for (const u of [-rr / 2, rr / 2]) bS(Q(u, 0.05), Q(u, 2.05), 0.025);
    for (let k = 1; k < 5; k++) bS(Q(-rr, (2.05 * k) / 5), Q(rr, (2.05 * k) / 5), 0.025);
  }
}

// Une chaise de jardin métallique verte (assise et dossier à lattes, quatre pieds), `cap` : direction du regard
function chaise(lot, O, x, y, z, cap, couleur) {
  const R = O.repere(x, y, z, cap);
  lot.boite('peinture', 0.42, 0.025, 0.42, R(0, 0.45, 0), { bande: true, couleur });
  lot.boite('peinture', 0.42, 0.42, 0.025, R(0, 0.68, -0.2, new THREE.Matrix4().makeRotationX(-0.12)), { bande: true, couleur });
  for (const [u, w] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) lot.barre(R.pt(u, 0, w), R.pt(u * 1.05, 0.45, w), 0.02, 0.02, { couleur });
}

// Les maillages d'un Lot de zone : les cartes détourées (graminées) ne portent pas d'ombre et sont du feuillage.
function maillagesLot(lot, nom) {
  const g = lot.maillages(nom);
  for (const m of g.children) if (m.material && m.material.alphaTest > 0) { m.castShadow = false; m.userData.feuillage = true; }
  return g;
}
// Assombrit les couleurs de sommet d'un groupe (les bordures de béton du kit, presque blanches au soleil : coteau.js)
function assombrir(g, f) {
  g.traverse((m) => { const c = m.isMesh && m.geometry.attributes.color; if (c) { for (let i = 0; i < c.array.length; i++) c.array[i] *= f; c.needsUpdate = true; } });
}
const dansB = (B, x, z) => x >= B[0] && x <= B[2] && z >= B[1] && z <= B[3];
function dansPoly(x, z, poly) {
  let d = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) d = !d;
  }
  return d;
}
// Un point est-il dans un massif en arc, à `m` m au moins de son bord ? (on sonde quatre points autour)
function dansMassif(x, z, m = 0) {
  return MASSIFS.some((P) => dansPoly(x, z, P) && dansPoly(x + m, z, P) && dansPoly(x - m, z, P) && dansPoly(x, z + m, P) && dansPoly(x, z - m, P));
}

// ============================================================================================ la silhouette (loin)
// Le pavillon vu de loin (du belvédère, de la rampe ouest) : un volume crème, la bande sombre des vitres, l'acrotère clair,
// le toit gris.
function* silhouettePavillon(ctx) {
  const { kit } = ctx, O = outilsB7(kit, ctx.Monde), P = PAV, lot = new kit.Lot('silhouette du pavillon');
  const yMin = Math.min(kit.sol(P.xE + 0.3, P.zS), kit.sol(P.xE + 0.3, P.zN)) - 0.1, yH = P.yP + P.haut;
  const cx = (P.xO + P.xE) / 2, cz = (P.zN + P.zS) / 2, L = P.zS - P.zN, Wd = P.xE - P.xO;
  lot.boite('taille', Wd, yH - yMin, L, O.T(cx, (yH + yMin) / 2, cz), { couleur: O.c('taille', COULEURS.creme) });
  lot.boite('peinture', 0.04, 2.9, TRAVEES[6] - TRAVEES[0] + BAIE.l, O.T(P.xE + 0.01, P.yP + 1.45, (TRAVEES[0] + TRAVEES[6]) / 2), { bande: true, couleur: O.p(COULEURS.vitre) });
  lot.boite('peinture', Wd + 0.1, P.acro, L + 0.1, O.T(cx, yH + P.acro / 2, cz), { bande: true, couleur: O.p(COULEURS.acrotere) });
  ctx.groupe.add(lot.maillages('silhouette du pavillon'));
  yield;
}

// ============================================================================================ la zone
export default {
  id: 'Z07', nom: 'Jardin de la fontaine et pavillon des Douceurs',
  emprise: [[-45, 50], [8, 50], [8, 118], [-45, 118]],
  morceaux: [
    { id: 'Z07a', nom: 'seuil, escalier de 11 marches, allées du nord, place blanche', boite: BOITES.Z07a, construire: nord },
    { id: 'Z07b', nom: 'fontaine, placette, hémicycle et massifs en arc', boite: BOITES.Z07b, construire: hemicycle },
    { id: 'Z07c', nom: 'pavillon des Douceurs, terrasse et pergola', boite: BOITES.Z07c, construire: pavillonDesDouceurs, silhouette: silhouettePavillon },
  ],
  // PUR (sans three) : appelé à l'installation pour tous les joueurs. Le plan d'eau et les massifs sont dans les données
  // (non marchables), la face de la terrasse aussi (frontière de nappes) ; le pavillon est l'obstacle « bâtiment »
  // d'OSM. Ici : la margelle (la balle y rebondit), les pots, l'édicule et les bacs, les rampes de l'escalier de 11
  // marches, la terrasse (tables, parasols), le bac rond, la pergola, les lampadaires, les bornes, les bancs.
  obstacles(o) {
    const dur = (h, type = 'dur') => ({ h, type });
    const F = FONTAINE, R = (ap) => ap / Math.cos(Math.PI / 8), am = F.ap - F.tab / 2;
    // la margelle : sept des huit côtés (le côté ouest est la face de la terrasse, au même nu)
    for (let k = 0; k < 8; k++) {
      const a0 = (k * Math.PI) / 4 - Math.PI / 8, a1 = a0 + Math.PI / 4;
      if (k === 4) continue;
      o.segment(F.x + Math.cos(a0) * R(am), F.z + Math.sin(a0) * R(am), F.x + Math.cos(a1) * R(am), F.z + Math.sin(a1) * R(am), { e: F.tab, ...dur(F.h) });
    }
    for (let k = 0; k < 8; k++) {
      if (k === 3 || k === 4) continue;
      const a = Math.PI / 8 + (k / 8) * Math.PI * 2;
      o.cercle(F.x + Math.cos(a) * (R(F.ap) + 0.62), F.z + Math.sin(a) * (R(F.ap) + 0.62), 0.36, dur(0.55));
    }
    // l'édicule et les bacs de la place blanche
    const E = EDICULE;
    o.boite((E.x0 + E.x1) / 2, (E.z0 + E.z1) / 2, (E.x1 - E.x0) / 2, (E.z1 - E.z0) / 2, 0, dur(E.h));
    for (const [x0, z0, x1, z1] of BACS) o.boite((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2, 0, dur(0.5));
    // les mains courantes de l'escalier de 11 marches (les données ne ferment ses côtés que là où le sol tombe en travers)
    {
      const v = REPLI.escalier11_seuil, [x0, z0] = v.de, [x1, z1] = v.a, Lh = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / Lh, uz = (z1 - z0) / Lh;
      for (const c of [-1, 1]) {
        const ox = -uz * (v.largeur / 2 + 0.1) * c, oz = ux * (v.largeur / 2 + 0.1) * c;
        for (let i = 0; i < 3; i++) {
          const a = 0.2 + ((Lh - 0.4) * i) / 3, bb = 0.2 + ((Lh - 0.4) * (i + 1)) / 3;
          o.segment(x0 + ux * a + ox, z0 + uz * a + oz, x0 + ux * bb + ox, z0 + uz * bb + oz, { e: 0.2, h: 1.0, type: 'dur' });
        }
      }
    }
    // le muret-parapet de la terrasse (sur la face, et au droit de la fontaine, son côté ouest : porté par le sol le plus
    // haut de ses deux côtés, le dallage, il le dépasse de 0,42 m)
    o.segment((PARAPET.x0 + PARAPET.x1) / 2, PARAPET.z0, (PARAPET.x0 + PARAPET.x1) / 2, PARAPET.z1, { e: PARAPET.x1 - PARAPET.x0 + 0.06, ...dur(PARAPET.h) });
    // la terrasse, le bac rond, la pergola
    for (const [x, z] of TABLES) o.cercle(x, z, 0.42, dur(0.76));
    for (const [x, z] of PARASOLS) o.cercle(x, z, 0.22, dur(2.4));
    o.cercle(BAC_ROND.x, BAC_ROND.z, BAC_ROND.r, dur(BAC_ROND.h));
    const P = PERGOLA;
    for (const x of [P.x0, (P.x0 + P.x1) / 2, P.x1]) for (const z of [P.z0, P.z1]) o.cercle(x, z, 0.09, { h: P.h, type: 'poteau', camera: false });
    // le mobilier
    for (const k of Object.keys(LAMPES)) for (const [x, z] of LAMPES[k]) o.cercle(x, z, 0.1, { h: 3.7, type: 'poteau', camera: false });
    for (const k of Object.keys(BORNES)) for (const [x, z] of BORNES[k]) o.cercle(x, z, 0.1, { h: 1.0, type: 'poteau' });
    for (const k of Object.keys(BANCS)) for (const [x, z, cap] of BANCS[k]) {
      const a = (cap * Math.PI) / 180;
      // (le banc est long selon sa droite : la boîte est tournée de -cap autour de y ; a en radians de x+ vers z+)
      o.boite(x - Math.sin(a) * 0.05, z - Math.cos(a) * 0.05, 0.95, 0.3, -a, { h: 0.9, type: 'banc' });
    }
  },
  // les bancs où l'on s'assoit (y : hauteur de l'assise) et les chaises de la terrasse
  bancs(b) {
    for (const k of Object.keys(BANCS)) for (const [x, z, cap] of BANCS[k]) b.push({ x, z, cap, y: 0.46, source: 'Z07 banc noir' });
  },
  lieux: [],
};
