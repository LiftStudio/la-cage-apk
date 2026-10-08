// =====================================================================
//  ZONE Z16 — LE BOSQUET OUEST (lot B8)
// =====================================================================
// La moitié sud de la terrasse haute (x -133 à -57 ; z 46 à 152 ; y +10,5 à +12,5 ; conception § 1.3), entre les
// parterres de la perspective (Z13), la grille du boulevard (Z18), la limite sud (serres municipales, orangerie) et
// l'allée haute (Z17) : une futaie haute de tilleuls, marronniers, platanes et sophoras (les arbres de arbres.bin, lot
// A5 : AUCUN n'est planté ici, règle 4), et dessous, ce qu'on y fait.
//
// CE QUE LES PHOTOS MONTRENT (tools/parc/references_gmaps/SYNTHESE.md, fiche Z16, et R4.md § Z16 ; photos 9 et 10 de
// tools/parc_becon_references.md), et ce qu'on en fait :
//  - le SOL : de la TERRE BATTUE ROSE-BEIGE partout sous la futaie (#c8ad98 ; #c4a48e au soleil, #9a6e58 à l'ombre),
//    sans bordures, plus sombre et jonchée de feuilles au pied des arbres (A7-0, A7-2, A7-3, photo 10). Le sol du monde
//    n'a pas cette matière (sa carte de mélange ne connaît que la terre grise du quai) : on la pose en nappe drapée ;
//  - deux CLAIRIÈRES en pelouse, C vers (-86 ; 89) (SAT-2, ortho : 8 à 10 m plus à l'est que dans la conception) et B
//    vers (-70 ; 61), avec son PETIT KIOSQUE rond à toit rayé rouge et blanc (ortho, (-66,5 ; 60,5)) ;
//  - les deux CHEMINS du bosquet (gabarits chemin_bosquet_118 et chemin_bosquet_91, 2,5 m) : un stabilisé tassé, un peu
//    plus clair que la terre battue ; l'ALLÉE SUD, éclairée, en asphalte gris à bordures (gabarit allee_sud) ; le
//    PORTAIL E2 (portillon PSO de monde.json, fermé : grille noire à deux vantaux, R4 photo H) et la GRILLE de la limite
//    sud, noire, à barreaux droits, sur un bahut de pierre ;
//  - le KIOSQUE « LA VOISINE » (« Le petit kiosque du parc de Bécon » sur Google ; K0, K4, K5, K8, KA0, KA3) : un
//    MODULE À TOIT PLAT vert sapin de 7,5 x 2,8 x 2,6 m (turquoise en 2022), deux guichets éclairés, une porte pleine,
//    l'enseigne blanche sur le toit, le flanc et l'arrière bâchés de blanc gris ; devant lui, sa TERRASSE de stabilisé
//    brun clair (11 x 9 m, emprise Google x -88 à -76, z 116 à 127) : parasols carrés vert-bleu, tables et chaises de
//    jardin en plastique vert, JARDINIÈRES de bois brun-rouge plantées d'arbustes panachés, palissade de planches,
//    poteaux de bois et guirlande guinguette. Il regarde x+ (K0 : pris de la terrasse vers x-, soleil du soir à gauche) ;
//  - l'AIRE DE JEUX DE LA PHOTO 9, contre le flanc bâché du kiosque (la « buvette blanche » de la photo) : sol de
//    COPEAUX d'écorce, PORTIQUE DE BALANÇOIRES en bois, clôture métallique basse, bancs, POTEAUX D'ÉCLAIRAGE rouge
//    orangé (les « poteaux jaune orangé » de K5), massifs bas rougeâtres, et le grand CÈDRE de arbres.bin en (-78 ; 140) ;
//    SYNTHESE (§ B-4) laisse ouverte l'attribution de la photo 9 : on la met ici, à côté du kiosque qu'elle montre ;
//  - l'AIRE (-69 ; 98) de G8 : sol souple vert, TOUR À CABANE et TOBOGGAN TUBE SPIRALÉ vert sombre, seconde tour à
//    panneaux jaunes, jeu à ressort rouge, bancs, barrière Vauban ; l'AIRE (-97,5 ; 133,5) (SAT-1 : petit carré vert)
//    et sa CABANE À POTEAUX ROUGES (A7-3 : toit de bardeaux sombres, panneaux jaunes cadrés de bleu), qui est aussi le
//    « petit kiosque rouge au fond » de la photo 10 vue de PV19 ;
//  - deux dalles de PING-PONG (A7-1 : béton gris, deux tables de béton à plateau vert et filet fixe) en (-96,5 ; 70,2)
//    et (-105,4 ; 54,4) ; des BANCS VERTS de square, isolés, tournés vers les clairières et les aires ; des tables de
//    pique-nique en béton clair ; des corbeilles ; des LAMPADAIRES fins vert-noir à lanterne le long des chemins et de
//    l'allée sud ; des BARRIÈRES VAUBAN EMPILÉES (photo 10) ; la petite construction à toit brun de SAT-2 (-111 ; 72).
//
// LES VOISINES : la grande allée nord de la perspective (Z13) borde le bosquet à z 44,6 ; l'allée haute (Z17) à
// x -58,75 : la terre battue va jusqu'à leurs bords. La grille du boulevard est à Z18 (seul son portail sud-ouest est
// dessiné ici, avec la limite sud), et avec elle la LISIÈRE de persistants sombres qui la double côté parc (les
// lauriers-cerises de 2 m de A7-0 : lot B6, à 1,4 à 2,4 m de la grille ; on n'en plante pas une seconde ici) ; la
// placette du théâtre et l'orangerie à Z12.
//
// RÈGLES DE ZONE (conception § 3.3) : aucun Math.random (hasard de position : alea) ; toute hauteur par le sol du
// monde ; matériaux du kit (et le feuillage du coteau) ; aucun arbre planté (les troncs de arbres.bin, relevés dans
// TRONCS, ne servent qu'à ne rien poser dessus) ; tout dans le groupe du morceau. Les revêtements à plat sont hors de
// l'ombre cuite et des ombres de contact (aPlat, voir js/parc/zones/z17_allee_haute.js).
import * as THREE from 'three';
import { Monde } from '../../monde.js';
import {
  alea, donnees, parId, lin, versTeinte, drape, aPlat, gardeCorps, lanterneMat, petitArbuste, couperZ,
  xAxe as xAxeHaute, LARG as LARG_HAUTE, teinteAsphalte,
} from './z17_allee_haute.js';
import { allee, plaque, decouper, Nappe, maillageSol, bordures, Touffes, maillageFeuillage, dansBoite, surLigne, projeter } from './coteau.js';

// ============================================================================================ les données
// Les tracés (gabarits de la zone Z16, recopiés de monde.json ; relus dans les données quand elles sont là)
const REPLI = {
  chemin_bosquet_118: [[-114.2, 150.9], [-118.4, 74.4], [-117.4, 65.6], [-118.2, 60.4], [-119.6, 55.3], [-122.2, 47.8], [-123.3, 42.6]],
  chemin_bosquet_91: [[-91.31, 29.93], [-91.78, 41.93], [-91.96, 67.07], [-93.95, 87.7], [-100.8, 112.15], [-114.17, 150.86]],
  allee_sud: [[-126.0, 151.5], [-114.2, 150.9], [-56.5, 147.7], [-56.4, 144.9]],
};
const CHEMIN_118 = REPLI.chemin_bosquet_118, CHEMIN_91 = REPLI.chemin_bosquet_91, ALLEE_SUD = REPLI.allee_sud;
const L_CHEMIN = 2.5, L_SUD = 3.0;
// La limite sud (monde.json > clotures > limite_sud) jusqu'à l'angle nord-ouest de l'orangerie (x -67,8) : au-delà, c'est
// le mur de l'orangerie qui ferme le parc (zone Z12) ; et le portail E2 (portillon PSO)
const LIMITE_SUD = [[-125.8, 154.9], [-106.2, 153.0], [-67.8, 151.2]];
const PORTAIL = { x: -126.0, z: 151.5, cap: 90, largeur: 3.0 };
// La grille du boulevard (Z18) : x en fonction de z, entre (-132,33 ; 45,62) et (-126,07 ; 150)
const xGrille = (z) => -132.33 + ((z - 45.62) * 6.26) / 104.38;
// Le bord des voisines : la grande allée nord (Z13, 4 m sur z 42,6) et l'allée haute (Z17)
const Z_NORD = 44.8;
const xEst = (z) => xAxeHaute(z) - LARG_HAUTE / 2;

// Les troncs de arbres.bin dans le bosquet (x, z ; relevés au demi-mètre, empreinte 28f82ed889b750d9, les mêmes à
// l'empreinte 91c7146265ce9a9e : les deux arbres retirés par le lot B8 sont au pied de la placette du théâtre) : on n'y
// pose ni banc, ni lampadaire, ni table.
const TRONCS = [[-129, 43.5], [-98.5, 44.5], [-65, 47.5], [-114.5, 48], [-108.5, 48], [-126.5, 48.5], [-73, 51.5], [-115, 52], [-85, 52.5],
  [-66, 56.5], [-116, 57], [-109, 57], [-59, 58], [-94.5, 59], [-78.5, 59], [-83, 59.5], [-105, 61], [-124, 65], [-100, 65.5], [-86, 67],
  [-73, 68], [-120, 68.5], [-106, 68.5], [-66.5, 69.5], [-91, 70.5], [-86.5, 72], [-59, 72], [-122, 73.5], [-72, 73.5], [-130, 74], [-96, 75],
  [-68.5, 75.5], [-110, 78.5], [-59, 78.5], [-96.5, 81], [-126.5, 81.5], [-63.5, 81.5], [-120, 82], [-90, 82.5], [-103.5, 83], [-79, 83.5],
  [-97.5, 85.5], [-59, 85.5], [-70, 88], [-62.5, 88], [-74, 88.5], [-121.5, 91], [-104, 91], [-93.5, 91.5], [-110, 92], [-59, 92],
  [-114.5, 94], [-69.5, 94.5], [-78.5, 98], [-112, 98.5], [-119.5, 101.5], [-88, 104], [-58.5, 105], [-94.5, 107.5], [-71.5, 107.5],
  [-103.5, 108], [-110, 110], [-83, 110], [-118.5, 111], [-104.5, 112], [-58.5, 113.5], [-100, 114], [-122.5, 115], [-108.5, 116.5],
  [-104, 117.5], [-88.5, 119.5], [-58.5, 119.5], [-110.5, 120.5], [-117.5, 121.5], [-67.5, 122.5], [-97.5, 123], [-102, 125.5],
  [-68, 127.5], [-120, 128.5], [-72, 128.5], [-125, 129], [-105, 129], [-84.5, 132], [-58.5, 132.5], [-107, 134], [-113, 137.5],
  [-60.5, 138], [-85.5, 139], [-78, 140], [-104.5, 140.5], [-109, 141], [-65, 142], [-82, 143], [-70.5, 143], [-123, 146], [-108.5, 146],
  [-69, 150], [-88.5, 151], [-75, 151]];
const libre = (x, z, r) => TRONCS.every(([a, b]) => Math.hypot(a - x, b - z) > r);

// LES LIEUX DU BOSQUET (repère du terrain 1)
// le kiosque (le module, sa terrasse devant lui côté x+, la palissade derrière)
const KIOSQUE = { x0: -86.0, x1: -83.2, z0: 117.75, z1: 125.25, h: 2.6 };
const TERRASSE = { x0: -83.2, x1: -75.7, z0: 116.0, z1: 127.0 };
const PALISSADE = [[-88.4, 115.6], [-88.4, 127.4]];
// l'aire de la photo 9 (copeaux), au sud du kiosque ; son entrée côté terrasse
const COPEAUX = { x0: -83.2, x1: -73.7, z0: 130.0, z1: 139.0 };
const PORTE_COPEAUX = [-77.6, -76.3];
// l'aire de G8 (sol souple, tour et toboggan tube) et celle de SAT-1 (cabane rouge)
const AIRE_G8 = { x0: -74.7, x1: -63.7, z0: 96.0, z1: 104.5 };
const AIRE_S = { x0: -101.2, x1: -94.2, z0: 130.0, z1: 137.0 };
// les dalles de ping-pong (6 x 9 m, deux tables chacune)
const PINGPONG = [{ x: -96.7, z: 70.0 }, { x: -105.2, z: 54.5 }].map((p) => ({ ...p, x0: p.x - 3, x1: p.x + 3, z0: p.z - 4.5, z1: p.z + 4.5 }));
// les clairières en pelouse (ellipses)
const CLAIRIERES = [{ x: -86.0, z: 89.0, rx: 6.5, rz: 7.5 }, { x: -69.5, z: 61.0, rx: 7.0, rz: 5.5 }];
const dansClairiere = (x, z, m = 0) => CLAIRIERES.some((c) => ((x - c.x) / (c.rx + m)) ** 2 + ((z - c.z) / (c.rz + m)) ** 2 < 1);
// le contour d'une clairière (40 points, bord un peu ondulé : une pelouse tondue n'est pas une ellipse parfaite)
function contourClairiere(c) {
  const P = [];
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, f = 1 + 0.05 * Math.sin(a * 3 + c.x) + 0.03 * Math.sin(a * 7 + c.z); P.push([c.x + Math.cos(a) * c.rx * f, c.z + Math.sin(a) * c.rz * f]); }
  return P;
}
// le petit kiosque rond à toit rayé de la clairière B, la cabane de jardinier, les barrières empilées
const KIOSQUE_RAYE = { x: -66.5, z: 60.8, r: 2.1 };
const CABANE = { x: -111.5, z: 72.5, w: 3.0, d: 2.6 };
// (les barrières, dans le champ de PV19, à gauche du tilleul qui en masque le centre)
const VAUBAN = { x: -103.2, z: 97.8 };
const dansRect = (R, x, z, m = 0) => x > R.x0 - m && x < R.x1 + m && z > R.z0 - m && z < R.z1 + m;
// Ce qui a son propre sol : la terre battue (cases d'1 m) passe DESSOUS sur une case, plus bas de quelques millimètres
// (bord à bord, les deux nappes ne suivaient pas le relief entre leurs sommets de la même façon — trames d'1 m et de
// 0,5 m — et laissaient voir un fil vert du sol du monde le long de la terrasse du kiosque)
function aSonSol(x, z) {
  return dansRect(TERRASSE, x, z, -0.55) || dansRect(COPEAUX, x, z, -0.55) || dansRect(AIRE_G8, x, z, -0.55) || dansRect(AIRE_S, x, z, -0.55)
    || PINGPONG.some((p) => dansRect(p, x, z, -0.55)) || dansClairiere(x, z, -0.75);
}

// Les bancs verts de square (kit.banc 'ville_paris') : x, z, cap (regard de la personne assise, degrés)
const BANCS = [
  { x: -92.4, z: 88.2, cap: 95 }, { x: -86.5, z: 97.4, cap: 178 }, { x: -79.3, z: 90.5, cap: 262 },       // clairière C
  { x: -72.5, z: 54.6, cap: 8 }, { x: -76.9, z: 63.2, cap: 100 },                                           // clairière B
  { x: -101.0, z: 70.2, cap: 90 }, { x: -100.8, z: 54.4, cap: 270 },                                        // ping-pong
  { x: -104.1, z: 101.2, cap: 205 }, { x: -101.0, z: 105.3, cap: 250 },                                     // vus de PV19 (photo 10)
  { x: -115.3, z: 88.0, cap: 270 }, { x: -120.4, z: 125.0, cap: 90 },                                       // chemin 118
  { x: -103.0, z: 147.4, cap: 0 }, { x: -80.0, z: 146.1, cap: 0 }, { x: -64.8, z: 145.4, cap: 0 },           // allée sud
  { x: -84.3, z: 128.9, cap: 180 }, { x: -72.3, z: 134.5, cap: 270 },                                       // aire de la photo 9
  { x: -75.8, z: 97.6, cap: 90 }, { x: -75.8, z: 102.6, cap: 90 }, { x: -69.2, z: 105.8, cap: 180 },       // aire G8
  { x: -102.3, z: 133.5, cap: 90 },                                                                         // aire de la cabane rouge
];
// Les tables de pique-nique en béton clair (A7-3) : x, z, angle (degrés : 0 = le long de x)
const PIQUE_NIQUE = [{ x: -101.6, z: 128.1, a: 0 }, { x: -112.8, z: 118.2, a: 80 }, { x: -91.0, z: 63.6, a: 90 }];
// Les corbeilles
const CORBEILLES = [[-93.3, 86.0], [-100.1, 67.6], [-104.6, 147.3], [-74.2, 96.0], [-85.3, 129.0], [-118.8, 88.6]];

// LES LAMPADAIRES (pur) : le long des chemins tous les 24 m et de l'allée sud tous les 20 m, à 1,3 m du bord, du côté
// est des chemins (x+) et côté bosquet de l'allée (z-) ; décalés de 2 m en 2 m tant qu'un tronc est à moins d'1,3 m.
function lampadaires() {
  const L = [];
  const le = (trace, larg, pas, cote, s0, s1) => {
    for (let s = s0; s < s1; s += pas) {
      for (let d = 0; d < 8; d += 2) {
        const q = surLigne(trace, s + d), x = q.x - q.tz * (larg / 2 + 1.3) * cote, z = q.z + q.tx * (larg / 2 + 1.3) * cote;
        if (libre(x, z, 1.3) && z > Z_NORD + 1 && x < xEst(z) - 1) { L.push({ x, z }); break; }
      }
    }
  };
  le(CHEMIN_118, L_CHEMIN, 24, 1, 8, 103);
  le(CHEMIN_91, L_CHEMIN, 24, -1, 22, 124);
  le(ALLEE_SUD, L_SUD, 20, -1, 16, 68);
  return L;
}
// Les massifs bas rougeâtres le long de la clôture de l'aire de la photo 9, côté x+ et côté z-
function massifsBas() {
  const L = [];
  for (let z = COPEAUX.z0 + 0.6; z < COPEAUX.z1; z += 1.2) L.push({ x: COPEAUX.x1 + 0.75, z, h: 0.7, R: 0.55, pal: 'rougeatre' });
  for (let x = COPEAUX.x0 + 0.8; x < PORTE_COPEAUX[0] - 0.4; x += 1.25) L.push({ x, z: COPEAUX.z0 - 0.65, h: 0.65, R: 0.5, pal: 'rougeatre' });
  return L;
}
let LAMPES = null, MASSIFS_BAS = null;
function preparer() { if (!LAMPES) { LAMPES = lampadaires(); MASSIFS_BAS = massifsBas(); } }

// ============================================================================================ couleurs
// La terre battue : la texture du kit (terre_battue, rose-beige, de moyenne #c2a891), ramenée à #a58670 — sous la
// futaie, celle des photos est à l'ombre : entre le soleil (#c4a48e) et l'ombre (#9a6e58) de SYNTHESE, la lumière du
// jeu fait le reste (à #c8ad98, elle sortait blanchâtre, comme du sable). Des taches lentes ; plus sombre et plus brune
// au pied des arbres (humus, racines, feuilles tombées : A7-0).
const T_TERRE = versTeinte('#c2a891', '#a58670');
function teinteTerre(troncs) {
  return (x, z) => {
    const n = 0.5 + 0.5 * Math.sin(x * 0.31 + Math.sin(z * 0.17) * 2.1) * Math.sin(z * 0.27 - x * 0.11);
    let pied = 0;
    for (const [a, b] of troncs) { const d = Math.hypot(a - x, b - z); if (d < 3.2) pied = Math.max(pied, 1 - d / 3.2); }
    const f = (0.9 + 0.16 * n) * (1 - 0.22 * pied * pied) * (0.97 + 0.06 * alea(Math.floor(x), Math.floor(z), 1611));
    return [T_TERRE[0] * f * (1 - 0.05 * pied), T_TERRE[1] * f * (1 - 0.1 * pied), T_TERRE[2] * f * (1 - 0.14 * pied)];
  };
}
// Les chemins de terre tassée et la terrasse du kiosque (stabilisé brun clair, #b49c82 au soleil sur K0) : la même
// matière que la terre battue, un peu plus claire et plus grise pour les chemins, plus brune pour la terrasse (le
// « stabilisé » du kit, un gravier photographié, brillait comme du sable sous le soleil rasant).
const T_CHEMIN = versTeinte('#c2a891', '#b29d8a');
const teinteChemin = (x, z, e) => { const f = (1 - 0.12 * Math.max(0, Math.abs(e) - 0.6) / 0.4) * (0.95 + 0.08 * alea(Math.floor(x * 1.5), Math.floor(z * 1.5), 1612)); return [T_CHEMIN[0] * f, T_CHEMIN[1] * f, T_CHEMIN[2] * f]; };
const T_TERRASSE = versTeinte('#c2a891', '#a39079');
const T_COPEAUX = versTeinte('#cbc2af', '#7c5034');     // (le gravier du kit, #cbc2af, ramené au brun-orangé de l'écorce)
// (relecture : #4a6a50 sortait d'un vert de billard à côté de G8, où le sol souple, usé et poussiéreux, est vert-de-gris)
const T_SOUPLE = versTeinte('#cfcac0', '#54665a');
const T_DALLE_PP = versTeinte('#cfcac0', '#8a867e');
// La peinture et le bois (sRGB)
const C = {
  vertSapin: '#1e4d38', vertToit: '#173a2a', bache: '#dcdcd6', guichet: '#f0dfb4', cadre: '#dcdad2', affiche: '#e6c34a',
  parasol: '#2f5a50', mat: '#e8e6e0', chaiseClaire: '#8fae8a', chaiseSombre: '#2f4a3a', jardiniere: '#6b3a2e', terreJ: '#3a2c22',
  palissade: '#6a4a35', poteauBois: '#8a8378', orange: '#d9772e', cloture: '#3d4a42', pin: '#9a7a58', caoutchouc: '#222222',
  chaine: '#8c8f90', rouge: '#c0302a', jaune: '#e0c020', bleu: '#2a5ab0', anis: '#b8d070', boisClair: '#c8a878', toboggan: '#2f5e48',
  bardeau: '#3a3634', galva: '#a3a8a6', tableVerte: '#3f8a4a', betonGris: '#8d8a84', betonClair: '#d8d4cc', blanc: '#f2f2ee',
  rougeToit: '#b8322a', blancToit: '#eeeae0', cabaneMurs: '#7a5a3e', cabaneToit: '#4e3527',
};

// ============================================================================================ petits outils
// Une boîte w (le long de x local) x h x d, centrée en (x, y, z), tournée de `a` degrés autour de la verticale.
function boite(lot, cle, x, y, z, w, h, d, a, couleur, o = {}) {
  const m = new THREE.Matrix4().makeRotationY((a * Math.PI) / 180).setPosition(x, y, z);
  lot.boite(cle, w, h, d, m, { couleur, bande: cle === 'peinture', chanfrein: o.chanfrein || 0 });
}
// Un point en repère local (u le long de x local, v le long de z local) tourné de `a` degrés autour de (x, z).
function loc(x, z, a, u, v) { const r = (a * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return [x + c * u + s * v, z - s * u + c * v]; }

// ============================================================================================ 1. LES SOLS
function* sols(ctx, B) {
  const { kit, groupe } = ctx;
  const D = donnees(ctx);
  // les troncs du morceau (arbres.bin, s'il est là : sinon le relevé) pour assombrir la terre à leur pied
  let troncs = TRONCS;
  if (D && D.tableArbres) {
    troncs = [];
    const T = D.tableArbres;
    for (let i = 0; i + 5 < T.length; i += 6) if (T[i] > B[0] - 4 && T[i] < B[2] + 4 && T[i + 1] > B[1] - 4 && T[i + 1] < B[3] + 4) troncs.push([T[i], T[i + 1]]);
  }
  troncs = troncs.filter(([a, b]) => a > B[0] - 4 && a < B[2] + 4 && b > B[1] - 4 && b < B[3] + 4);
  const lot = new kit.Lot('sols du bosquet');
  // la terre battue : dans le bosquet, hors des lieux qui ont leur sol, hors du massif de la lisière, et sous le bord
  // des allées (elles la recouvrent)
  const allees = [[CHEMIN_118, L_CHEMIN], [CHEMIN_91, L_CHEMIN], [ALLEE_SUD, L_SUD]];
  const dedans = (x, z) => z > Z_NORD && x > xGrille(z) + 0.4 && x < xEst(z) - 0.15 && z < zLimite(x) - 0.35;
  const sousAllee = (x, z) => allees.some(([t, l]) => projeter(t, x, z).d < l / 2 - 0.45);
  // (par bandes de 6 m : 1 300 cellules d'un coup, avec leurs tests et leurs teintes, prenaient 25 ms d'un seul tenant)
  const garder = (x, z) => dedans(x, z) && !aSonSol(x, z) && !sousAllee(x, z), teinte = teinteTerre(troncs);
  for (let z0 = B[1]; z0 < B[3]; z0 += 6) {
    drape(kit, lot, 'terreBattue#sol', [B[0], z0, B[2], Math.min(B[3], z0 + 6)], garder, { pas: 1, dy: 0.018, teinte });
    if (ctx.budget()) yield;
  }
  // les clairières (pelouse) : une plaque découpée par le contour de l'ellipse, un peu irrégulier (un bord lisse, pas
  // les marches d'une trame), 5 mm au-dessus de la terre battue qu'elle recouvre sur ses 75 derniers centimètres
  // (par bandes de 4 m, la main rendue entre deux : d'un bloc, une clairière prenait 10 ms)
  const gazon = new Nappe();
  for (const c of CLAIRIERES) {
    for (let zb = B[1]; zb < B[3]; zb += 4) {
      const P = decouper(contourClairiere(c), [B[0], zb, B[2], Math.min(B[3], zb + 4)]);
      if (P.length < 3) continue;
      // (une pelouse de fin septembre sous la futaie, « sèche l'été » : R4 ; le gazon du kit, d'un vert de printemps,
      // tiré vers le jaune paille, avec des plaques plus sèches encore — les zones piétinées, au soleil)
      plaque(P, { pas: 0.5, dy: 0.023, tuile: 1.2, uv: (x, z) => [x, z, 0],
        teinte: (x, z) => {
          const f = 0.88 + 0.22 * alea(Math.floor(x * 1.7), Math.floor(z * 1.7), 1621);
          const s = Math.max(0, Math.sin(x * 0.53 + Math.sin(z * 0.41) * 1.7) * Math.sin(z * 0.47 - x * 0.19)) * 0.8;
          return [(0.86 + 0.1 * s) * f, (0.82 - 0.03 * s) * f, (0.62 - 0.1 * s) * f];
        } }, gazon);
      if (ctx.budget()) yield;
    }
  }
  const mg = maillageSol(gazon.geometrie(), kit.materiau('gazon'), 'bosquet · clairières');
  if (mg) groupe.add(aPlat(mg));
  if (ctx.budget()) yield;
  // les sols des lieux
  if (dansRect({ x0: B[0], x1: B[2], z0: B[1], z1: B[3] }, (TERRASSE.x0 + TERRASSE.x1) / 2, (TERRASSE.z0 + TERRASSE.z1) / 2)) {
    drape(kit, lot, 'terreBattue#sol', [TERRASSE.x0, TERRASSE.z0, TERRASSE.x1, TERRASSE.z1], () => true, { pas: 0.5, dy: 0.024,
      teinte: (x, z) => { const f = 0.93 + 0.12 * alea(Math.floor(x * 2), Math.floor(z * 2), 1622); return [T_TERRASSE[0] * f, T_TERRASSE[1] * f, T_TERRASSE[2] * f]; } });
    // (relecture : sur la terre du sous-bois, fine et lisse, les copeaux faisaient un tapis brun uni ; le grain du
    // gravier du kit, agrandi quatre fois (une tuile de 2,4 m : ses gravillons font alors 2 à 5 cm), teinté brun-orangé
    // et semé de plaques plus claires ou plus sombres, se lit comme des éclats d'écorce)
    drape(kit, lot, 'gravier#sol', [COPEAUX.x0, COPEAUX.z0, COPEAUX.x1, COPEAUX.z1], () => true, { pas: 0.5, dy: 0.03, tuile: 2.4,
      teinte: (x, z) => {
        const f = (0.82 + 0.3 * alea(Math.floor(x * 2.5), Math.floor(z * 2.5), 1623)) * (0.92 + 0.16 * Math.sin(x * 1.3 + Math.sin(z * 0.9) * 2) * Math.sin(z * 1.1 - x * 0.4));
        return [T_COPEAUX[0] * f, T_COPEAUX[1] * f, T_COPEAUX[2] * f];
      } });
  }
  // (un lieu à cheval sur deux morceaux est dessiné par moitiés, chacune dans le sien)
  const dansB = (R) => [Math.max(R.x0, B[0]), Math.max(R.z0, B[1]), Math.min(R.x1, B[2]), Math.min(R.z1, B[3])];
  for (const R of [AIRE_G8, AIRE_S]) {
    if (!croise(B, R)) continue;
    drape(kit, lot, 'beton#sol', dansB(R), () => true, { pas: 0.5, dy: 0.035, tuile: 1.0,
      teinte: (x, z) => { const f = 0.95 + 0.08 * alea(Math.floor(x * 2), Math.floor(z * 2), 1624); return [T_SOUPLE[0] * f, T_SOUPLE[1] * f, T_SOUPLE[2] * f]; } });
  }
  for (const P of PINGPONG) {
    if (!croise(B, P)) continue;
    drape(kit, lot, 'beton#sol', dansB(P), () => true, { pas: 0.5, dy: 0.03,
      teinte: (x, z) => { const f = 0.92 + 0.12 * alea(Math.floor(x / 1.5), Math.floor(z / 1.5), 1625); return [T_DALLE_PP[0] * f, T_DALLE_PP[1] * f, T_DALLE_PP[2] * f]; } });
  }
  if (ctx.budget()) yield;
  groupe.add(aPlat(lot.maillages('bosquet · sols')));
  if (ctx.budget()) yield;
  // les bordures de béton des aires et des dalles (elles, portent ombre et touchent le sol)
  const bord = new kit.Lot('bordures du bosquet');
  for (const R of [AIRE_G8, AIRE_S, ...PINGPONG]) {
    if (!dansBoite(B, (R.x0 + R.x1) / 2, (R.z0 + R.z1) / 2)) continue;
    kit.bordure({ ligne: [[R.x0, R.z0], [R.x1, R.z0], [R.x1, R.z1], [R.x0, R.z1]], ferme: true, largeur: 0.12, hauteur: 0.06, materiau: 'beton' }, bord);
  }
  if (bord.parts.size) groupe.add(bord.maillages('bosquet · bordures des aires'));
}
const croise = (B, R) => R.x1 > B[0] && R.x0 < B[2] && R.z1 > B[1] && R.z0 < B[3];
// Le z de la limite sud au droit de x (la grille, puis l'angle de l'orangerie)
function zLimite(x) {
  const L = [...LIMITE_SUD, [-60.1, 151.0]];
  for (let i = 1; i < L.length; i++) {
    const [ax, az] = L[i - 1], [bx, bz] = L[i];
    if ((x - ax) * (x - bx) <= 0 && ax !== bx) return az + ((bz - az) * (x - ax)) / (bx - ax);
  }
  return 151;
}

// ============================================================================================ 2. LES ALLÉES, LA GRILLE, LE PORTAIL
function* allees(ctx, B) {
  const { kit, groupe } = ctx;
  const D = donnees(ctx), al = (id) => { const a = parId(D && D.allees, id); return a && a.trace ? a.trace : REPLI[id]; };
  const t118 = al('chemin_bosquet_118'), t91 = al('chemin_bosquet_91'), tSud = al('allee_sud');
  // les chemins de terre battue tassée (stabilisé clair), sans bordures ; coupés au bord de la grande allée (Z13)
  const stab = new Nappe();
  const bc = [B[0], Math.max(B[1], Z_NORD - 0.2), B[2], B[3]];
  allee({ trace: t118, largeur: L_CHEMIN, boite: bc, tuile: 3.0, dy: 0.028, teinte: teinteChemin }, stab);
  if (ctx.budget()) yield;
  allee({ trace: t91, largeur: L_CHEMIN, boite: bc, tuile: 3.0, dy: 0.031, teinte: teinteChemin }, stab);
  const ms = maillageSol(stab.geometrie(), kit.materiau('terreBattue'), 'bosquet · chemins');
  if (ms) groupe.add(aPlat(ms));
  if (ctx.budget()) yield;
  // l'allée sud, asphalte gris éclairé, bordures de béton (jusqu'au bout de l'allée haute, où Z17 prend le relais)
  const gris = new Nappe();
  allee({ trace: tSud, largeur: L_SUD, boite: [B[0], B[1], Math.min(B[2], -54.6), B[3]], tuile: 4.04, dy: 0.036, teinte: teinteAsphalte }, gris);
  const ma = maillageSol(gris.geometrie(), kit.materiau('asphalte'), 'bosquet · allée sud');
  if (ma) groupe.add(aPlat(ma));
  if (ctx.budget()) yield;
  for (const cote of [1, -1]) yield* bordures(kit, groupe, tSud, L_SUD, cote, (x, z) => dansBoite(B, x, z) && x < -58.8 && x > -124.5, { budget: ctx.budget });
  // la grille de la limite sud, noire à barreaux droits sur un bahut de pierre (R4 photo H), par tronçons de 12 m
  const lim = couperX(LIMITE_SUD, B[0], B[2]);
  if (lim.length >= 2) {
    // (par tronçons de 6 m : un tronçon de 12 m de barreaux à pointes prenait 8 ms d'un tenant)
    const L = kit.longueur(lim), n = Math.max(1, Math.round(L / 6));
    for (let i = 0; i < n; i++) {
      const tr = morceauDeLigne(lim, (L * i) / n, (L * (i + 1)) / n);
      groupe.add(kit.grilleBarreaux({ ligne: tr, h: 1.9, muret: 0.3, ep: 0.32, pas: 0.12, pointes: true }));
      if (ctx.budget()) yield;
    }
  }
  // le portail E2 (fermé)
  if (dansBoite(B, PORTAIL.x + 1, PORTAIL.z)) groupe.add(kit.portail({ x: PORTAIL.x, z: PORTAIL.z, cap: PORTAIL.cap, largeur: PORTAIL.largeur, type: 'simple', ouvert: 0 }));
}
// Une ligne qui avance selon x, coupée à [x0, x1] (rendue dans le sens des x croissants).
function couperX(ligne, x0, x1) {
  return couperZ(ligne.map(([x, z]) => [z, x]), x0, x1).map(([z, x]) => [x, z]);
}
// Le morceau d'une ligne entre les abscisses s0 et s1.
function morceauDeLigne(ligne, s0, s1) {
  const out = [];
  let s = 0;
  for (let i = 0; i + 1 < ligne.length; i++) {
    const [ax, az] = ligne[i], [bx, bz] = ligne[i + 1], l = Math.hypot(bx - ax, bz - az);
    const a = Math.max(s0, s), b = Math.min(s1, s + l);
    if (b > a) {
      const p = (t) => [ax + ((bx - ax) * (t - s)) / l, az + ((bz - az) * (t - s)) / l];
      if (!out.length) out.push(p(a));
      out.push(p(b));
    }
    s += l;
  }
  return out;
}

// ============================================================================================ 3. LE KIOSQUE ET SA TERRASSE
function* kiosque(ctx) {
  const { kit, K, groupe } = ctx;
  const lot = new kit.Lot('kiosque La Voisine');
  const K0 = KIOSQUE, y0 = kit.sol((K0.x0 + K0.x1) / 2, (K0.z0 + K0.z1) / 2), cx = (K0.x0 + K0.x1) / 2, cz = (K0.z0 + K0.z1) / 2;
  const W = K0.x1 - K0.x0, Dz = K0.z1 - K0.z0, H = K0.h;
  // le module, sur un socle sombre, et son toit plat à fin débord
  boite(lot, 'peinture', cx, y0 + 0.06, cz, W + 0.04, 0.2, Dz + 0.04, 0, lin('#3b3d3a'));
  boite(lot, 'peinture', cx, y0 + 0.16 + (H - 0.3) / 2, cz, W, H - 0.3, Dz, 0, lin(C.vertSapin));
  boite(lot, 'peinture', cx, y0 + H - 0.08, cz, W + 0.22, 0.16, Dz + 0.22, 0, lin(C.vertToit));
  // la bâche blanc gris du flanc et de l'arrière : des lés verticaux de 0,35 m, un sur deux en retrait (les plis)
  const bache = (xa, za, xb, zb, nx, nz) => {
    const L = Math.hypot(xb - xa, zb - za), n = Math.round(L / 0.35), a = (Math.atan2(xb - xa, zb - za) * 180) / Math.PI - 90;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = xa + (xb - xa) * t + nx * (i % 2 ? 0.035 : 0.018), z = za + (zb - za) * t + nz * (i % 2 ? 0.035 : 0.018);
      const f = i % 2 ? 0.93 : 1.0;
      boite(lot, 'peinture', x, y0 + 0.2 + (H - 0.45) / 2, z, L / n + 0.01, H - 0.45, 0.012, a, lin(C.bache, f));
    }
  };
  bache(K0.x0, K0.z0, K0.x0, K0.z1, -1, 0);                  // l'arrière (x-)
  bache(K0.x0, K0.z1, K0.x1, K0.z1, 0, 1);                   // le flanc côté aire de jeux (z+)
  bache(K0.x1, K0.z0, K0.x0, K0.z0, 0, -1);                  // l'autre bout (z-)
  // la façade (x+) : deux guichets éclairés (cadre clair, lumière chaude, tablette), une porte pleine au bout z-, des
  // affichettes jaunes ; l'enseigne blanche sur le toit, à gauche (bout z+)
  const xf = K0.x1;
  for (const zg of [120.9, 123.2]) {
    boite(lot, 'peinture', xf + 0.015, y0 + 1.6, zg, 0.03, 1.2, 1.62, 0, lin(C.cadre));
    boite(lot, 'peinture', xf + 0.03, y0 + 1.6, zg, 0.02, 1.02, 1.42, 0, lin(C.guichet));
    boite(lot, 'peinture', xf + 0.14, y0 + 1.0, zg, 0.28, 0.04, 1.6, 0, lin(C.cadre, 0.9));
  }
  boite(lot, 'peinture', xf + 0.02, y0 + 1.2, 118.6, 0.04, 2.05, 0.92, 0, lin(C.vertToit));
  boite(lot, 'peinture', xf + 0.05, y0 + 1.15, 118.95, 0.04, 0.03, 0.14, 0, lin('#b0b0a8'));
  for (const [zA, yA] of [[119.75, 1.75], [124.35, 1.9], [124.35, 1.35], [122.05, 2.3]]) boite(lot, 'peinture', xf + 0.012, y0 + yA, zA, 0.01, 0.4, 0.3, 0, lin(C.affiche));
  boite(lot, 'peinture', xf - 0.2, y0 + H + 0.35, 124.2, 0.05, 0.5, 2.0, 0, lin(C.blanc));
  boite(lot, 'peinture', xf - 0.17, y0 + H + 0.35, 124.2, 0.02, 0.2, 1.55, 0, lin(C.vertSapin));
  for (const zp of [123.4, 125.0]) boite(lot, 'peinture', xf - 0.24, y0 + H + 0.05, zp, 0.03, 0.2, 0.03, 0, lin('#555'));
  if (ctx.budget()) yield;

  // LA TERRASSE : parasols (mât blanc, toile carrée de 3 m), tables et chaises de jardin en plastique vert
  const P = [];
  for (const x of [-81.2, -78.0]) for (const z of [118.4, 121.6, 124.8]) P.push([x, z]);
  // (relecture : la toile était un tronc de pyramide à 16° fermé par un fond PLAT, et son lambrequin un bandeau épais :
  // de la terrasse, six dalles sombres qui se touchaient en plafond. K0 et K8 montrent des parasols de marché en
  // pointe, dont on voit le DESSOUS de la toile — la même pyramide, vue de l'intérieur — et les baleines claires.)
  for (const [x, z] of P) {
    const y = kit.sol(x, z), hT = 2.12, hP = 0.66;
    lot.tour('peinture', [[0.028, 0], [0.024, hT + hP + 0.08]], 6, new THREE.Matrix4().makeTranslation(x, y, z), { bande: true, couleur: lin(C.mat) });
    const T = new THREE.Matrix4().makeTranslation(x, y + hT, z);
    // la toile (dessus), puis son revers (le profil parcouru à l'envers : faces tournées vers le bas), plus sombre
    lot.tour('peinture', [[2.12, 0], [0.07, hP]], 4, T, { bande: true, couleur: lin(C.parasol), a0: Math.PI / 4, facettes: true, vif: true });
    lot.tour('peinture', [[0.07, hP - 0.012], [2.1, -0.012]], 4, T, { bande: true, couleur: lin(C.parasol, 0.72), a0: Math.PI / 4, facettes: true, vif: true });
    // le lambrequin (9 cm), dehors et dedans
    lot.tour('peinture', [[2.13, -0.09], [2.13, 0.005]], 4, T, { bande: true, couleur: lin(C.parasol, 0.9), a0: Math.PI / 4, facettes: true, vif: true });
    lot.tour('peinture', [[2.115, 0.0], [2.115, -0.085]], 4, T, { bande: true, couleur: lin(C.parasol, 0.62), a0: Math.PI / 4, facettes: true, vif: true });
    // les quatre baleines, du haut du mât aux coins de la toile, et le chapeau
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) lot.barre([x, y + hT + hP - 0.1, z], [x + sx * 1.46, y + hT - 0.03, z + sz * 1.46], 0.018, 0.012, { couleur: lin(C.mat, 0.9) });
    lot.tour('peinture', [[0.05, 0], [0.04, 0.05], [0.001, 0.1]], 6, new THREE.Matrix4().makeTranslation(x, y + hT + hP - 0.01, z), { bande: true, couleur: lin(C.parasol, 0.8) });
  }
  let k = 0;
  const tables = [...P.map(([x, z]) => [x + 0.15, z + 0.1]), [-79.6, 116.9], [-79.6, 126.2], [-76.8, 120.0], [-76.8, 123.3]];
  for (const [x, z] of tables) {
    const y = kit.sol(x, z), claire = alea(x, z, 1631) < 0.5, ct = lin(claire ? C.chaiseClaire : C.chaiseSombre);
    lot.tour('peinture', [[0.001, 0.69], [0.45, 0.69], [0.46, 0.72], [0.001, 0.73]], 12, new THREE.Matrix4().makeTranslation(x, y, z), { bande: true, couleur: ct });
    for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2; lot.barre([x + Math.cos(a) * 0.3, y, z + Math.sin(a) * 0.3], [x + Math.cos(a) * 0.25, y + 0.7, z + Math.sin(a) * 0.25], 0.035, 0.035, { couleur: ct }); }
    const nc = 2 + Math.floor(alea(z, x, 1632) * 3);
    for (let i = 0; i < nc; i++) {
      const a = (i / nc) * Math.PI * 2 + alea(x, z + i, 1633) * 0.8, cxx = x + Math.cos(a) * 0.72, czz = z + Math.sin(a) * 0.72;
      chaise(lot, cxx, kit.sol(cxx, czz), czz, (Math.atan2(x - cxx, z - czz) * 180) / Math.PI + (alea(i, x, 1634) - 0.5) * 30, lin(alea(cxx, czz, 1635) < 0.5 ? C.chaiseClaire : C.chaiseSombre));
    }
    if (++k % 4 === 0 && ctx.budget()) yield;
  }
  // les jardinières de bois brun-rouge qui ferment la terrasse (côtés z-, x+ et z+ ; l'entrée au milieu du côté x+) :
  // trois planches couchées de 15 cm, chacune de sa nuance, sur un caisson sombre qu'on voit dans les joints (K8) ; et
  // dedans, deux arbustes panachés touffus qui débordent de la caisse (K8 : ils la dépassent de 0,8 m)
  const J = jardinieres(), feu = new Touffes();
  k = 0;
  for (const j of J) {
    if (++k % 6 === 0 && ctx.budget()) yield;
    const y = kit.sol(j.x, j.z);
    boite(lot, 'bois', j.x, y + 0.25, j.z, j.w - 0.03, 0.5, j.d - 0.03, j.a, lin(C.jardiniere, 0.8));
    for (let i = 0; i < 3; i++) boite(lot, 'bois', j.x, y + 0.1 + i * 0.162, j.z, j.w, 0.15, j.d, j.a, lin(C.jardiniere, 2.0 * (0.88 + 0.24 * alea(j.x + i, j.z, 1638))));
    boite(lot, 'peinture', j.x, y + 0.49, j.z, j.w - 0.08, 0.02, j.d - 0.08, j.a, lin(C.terreJ));
    for (const d of [-0.28, 0.28]) { const [ax, az] = loc(j.x, j.z, j.a, d, 0); petitArbuste(feu, { x: ax, z: az, y0: y + 0.46, h: 0.8 + 0.15 * alea(ax, az, 1639), R: 0.4, pal: 'panache' }); }
  }
  if (ctx.budget()) yield;
  // la palissade de planches derrière le kiosque (lattes verticales, deux traverses)
  const [pa, pb] = PALISSADE, np = Math.round((pb[1] - pa[1]) / 0.13);
  for (let i = 0; i < np; i++) {
    const z = pa[1] + (i + 0.5) * (pb[1] - pa[1]) / np, x = pa[0], y = kit.sol(x, z);
    boite(lot, 'bois', x, y + 0.5, z, 0.025, 1.0 + 0.04 * alea(z, x, 1636), 0.115, 0, lin(C.palissade, 2.0 * (0.9 + 0.2 * alea(x, z, 1637))));
  }
  for (const h of [0.25, 0.8]) boite(lot, 'bois', pa[0] - 0.04, kit.sol(pa[0], (pa[1] + pb[1]) / 2) + h, (pa[1] + pb[1]) / 2, 0.04, 0.08, pb[1] - pa[1], 0, lin(C.palissade, 1.6));
  if (ctx.budget()) yield;
  // les poteaux de bois brut aux coins de la terrasse et la guirlande guinguette qui court de l'un à l'autre
  const POT = [[TERRASSE.x0 + 0.15, TERRASSE.z0 - 0.35], [TERRASSE.x1 + 0.25, TERRASSE.z0 - 0.35], [TERRASSE.x1 + 0.25, TERRASSE.z1 + 0.35], [TERRASSE.x0 + 0.15, TERRASSE.z1 + 0.35]];
  const hp = 3.8;
  for (const [x, z] of POT) boite(lot, 'bois', x, kit.sol(x, z) + hp / 2 - 0.1, z, 0.11, hp + 0.2, 0.11, 0, lin(C.poteauBois, 1.9));
  for (const [a, b] of [[0, 1], [1, 2], [2, 3], [0, 2], [1, 3]]) { guirlande(kit, lot, POT[a], POT[b], hp - 0.15); if (ctx.budget()) yield; }
  if (ctx.budget()) yield;
  groupe.add(lot.maillages('bosquet · kiosque et terrasse'));
  if (ctx.budget()) yield;
  const m = maillageFeuillage(feu, K, 'bosquet · jardinières', true);
  if (m) groupe.add(m);
  yield;
}
// Un fauteuil de jardin en plastique MOULÉ d'une pièce (K5, K8 : le « monobloc » vert sombre des terrasses) en (x, y, z),
// tourné vers `a` : assise, dossier plein un peu renversé percé de trois fentes (plus sombres), accoudoirs posés sur
// les pieds avant, pieds larges.
function chaise(lot, x, y, z, a, c) {
  boite(lot, 'peinture', x, y + 0.42, z, 0.48, 0.04, 0.44, a, c);
  const [bx, bz] = loc(x, z, a, 0, -0.25), r = (a * Math.PI) / 180, M = (px, py, pz) => new THREE.Matrix4().makeRotationY(r).multiply(new THREE.Matrix4().makeRotationX(-0.2)).setPosition(px, py, pz);
  lot.boite('peinture', 0.46, 0.44, 0.03, M(bx, y + 0.68, bz), { couleur: c, bande: true });
  // (les fentes suivent le dossier penché : décalées le long de sa pente, 17 mm devant sa face)
  const sombre = [c[0] * 0.35, c[1] * 0.35, c[2] * 0.35], co = Math.cos(0.2), si = Math.sin(0.2);
  for (const t of [-0.08, 0, 0.08]) {
    const [fx, fz] = loc(bx, bz, a, 0, -t * si + 0.017 * co);
    lot.boite('peinture', 0.32, 0.022, 0.005, M(fx, y + 0.68 + t * co + 0.017 * si, fz), { couleur: sombre, bande: true });
  }
  for (const s of [-1, 1]) { const [px, pz] = loc(x, z, a, s * 0.25, -0.02); boite(lot, 'peinture', px, y + 0.62, pz, 0.05, 0.03, 0.46, a, c); }
  for (const [u, v, h] of [[-0.22, 0.18, 0.62], [0.22, 0.18, 0.62], [-0.22, -0.2, 0.44], [0.22, -0.2, 0.44]]) { const [px, pz] = loc(x, z, a, u, v); boite(lot, 'peinture', px, y + h / 2, pz, 0.05, h, 0.05, a, c); }
}
// Les jardinières (x, z, longueur w, profondeur d, angle a)
function jardinieres() {
  const J = [], T = TERRASSE;
  for (let x = T.x0 + 0.9; x < T.x1 - 0.3; x += 1.25) { J.push({ x, z: T.z0 - 0.35, w: 1.2, d: 0.6, a: 0 }); J.push({ x, z: T.z1 + 0.35, w: 1.2, d: 0.6, a: 0 }); }
  for (let z = T.z0 + 0.3; z < T.z1 - 0.2; z += 1.25) if (z < 120.4 || z > 122.6) J.push({ x: T.x1 + 0.35, z, w: 1.2, d: 0.6, a: 90 });
  return J;
}
// Une guirlande guinguette de a à b (fil qui pend de 40 cm, ampoules rondes tous les 0,6 m), attachée à `h` m.
function guirlande(kit, lot, a, b, h) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(4, Math.round(L / 0.6)), ya = kit.sol(a[0], a[1]) + h, yb = kit.sol(b[0], b[1]) + h;
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push([a[0] + (b[0] - a[0]) * t, ya + (yb - ya) * t - 0.4 * 4 * t * (1 - t), a[1] + (b[1] - a[1]) * t]); }
  lot.prisme('peinture', [[-0.005, -0.005], [0.005, -0.005], [0.005, 0.005], [-0.005, 0.005]], pts, { bande: true, couleur: lin('#1a1a1a') });
  for (let i = 1; i < n; i++) lot.tour('verre', [[0.001, -0.075], [0.03, -0.06], [0.035, -0.035], [0.02, -0.015], [0.012, 0]], 6, new THREE.Matrix4().makeTranslation(pts[i][0], pts[i][1], pts[i][2]));
}

// ============================================================================================ 4. LES AIRES DE JEUX
// L'aire de la photo 9 : copeaux, portique de balançoires en bois, clôture basse, poteaux rouge orangé, jeu à ressort
function* aireCopeaux(ctx) {
  const { kit, K, groupe } = ctx;
  const lot = new kit.Lot('aire de la photo 9'), R = COPEAUX;
  // la clôture métallique basse (barreaux, deux lisses), ouverte côté terrasse
  const ring = [[PORTE_COPEAUX[1], R.z0], [R.x1, R.z0], [R.x1, R.z1], [R.x0, R.z1], [R.x0, R.z0], [PORTE_COPEAUX[0], R.z0]];
  gardeCorps(kit, lot, ring, { h: 1.0, bordure: 0, pas: 0.14, couleur: C.cloture, travee: 2.2, rayon: 0.008 });
  // le portique : deux chevalets en A de pin traité, la poutre à 2,35 m, deux balançoires
  const zP = 135.3, xa = -80.8, xb = -76.6, yP = kit.sol((xa + xb) / 2, zP), hP = 2.35, bois = lin(C.pin, 1.8);
  for (const x of [xa, xb]) for (const s of [-1, 1]) lot.barre([x, yP - 0.05, zP + s * 0.95], [x, yP + hP, zP], 0.1, 0.1, { cle: 'bois', couleur: bois, haut: [1, 0, 0] });
  for (const x of [xa, xb]) lot.barre([x, yP + 0.9, zP - 0.62], [x, yP + 0.9, zP + 0.62], 0.08, 0.06, { cle: 'bois', couleur: bois, haut: [1, 0, 0] });
  lot.barre([xa - 0.25, yP + hP + 0.04, zP], [xb + 0.25, yP + hP + 0.04, zP], 0.12, 0.12, { cle: 'bois', couleur: bois });
  for (const xs of [-79.7, -77.7]) {
    for (const s of [-1, 1]) lot.barre([xs + s * 0.2, yP + hP - 0.02, zP], [xs + s * 0.2, yP + 0.47, zP], 0.012, 0.012, { couleur: lin(C.chaine) });
    boite(lot, 'peinture', xs, yP + 0.45, zP, 0.46, 0.04, 0.19, 0, lin(C.caoutchouc));
  }
  // le jeu à ressort (un cheval rouge sur son ressort)
  ressort(lot, -81.6, 131.7, lin(C.rouge));
  // les poteaux d'éclairage rouge orangé, aux coins, dehors
  for (const [x, z] of [[R.x0 - 0.6, R.z0 - 0.4], [R.x1 + 0.4, R.z0 - 0.4], [R.x1 + 0.4, R.z1 + 0.5], [R.x0 - 0.6, R.z1 + 0.5]]) {
    const y = kit.sol(x, z), o = lin(C.orange);
    lot.tour('peinture', [[0.07, -0.05], [0.07, 0.3], [0.055, 0.34], [0.05, 3.0]], 8, new THREE.Matrix4().makeTranslation(x, y, z), { bande: true, couleur: o });
    // la tête : un cylindre de verre sous un chapeau plat orangé
    lot.tour('verre', [[0.075, 0.0], [0.075, 0.2]], 8, new THREE.Matrix4().makeTranslation(x, y + 3.0, z));
    lot.tour('peinture', [[0.06, 0.2], [0.11, 0.22], [0.11, 0.26], [0.001, 0.28]], 8, new THREE.Matrix4().makeTranslation(x, y + 3.0, z), { bande: true, couleur: o, fond: true });
  }
  groupe.add(lot.maillages('bosquet · aire de la photo 9'));
  if (ctx.budget()) yield;
  const feu = new Touffes();
  for (const a of MASSIFS_BAS) petitArbuste(feu, a);
  const m = maillageFeuillage(feu, K, 'bosquet · massifs bas', true);
  if (m) groupe.add(m);
}
// Un jeu à ressort : socle, ressort (hélice), corps et poignées, en (x, z).
function ressort(lot, x, z, c) {
  const y = Monde.sol(x + Monde.dx, z), pts = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 2 * 5; pts.push(new THREE.Vector3(x + Math.cos(a) * 0.1, y + 0.05 + t * 0.4, z + Math.sin(a) * 0.1)); }
  lot.geo('peinture', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.018, 5, false), null, { bande: true, couleur: lin('#3a3a3a') });
  boite(lot, 'peinture', x, y + 0.03, z, 0.5, 0.05, 0.5, 0, lin('#555550'));
  boite(lot, 'peinture', x, y + 0.6, z, 0.75, 0.22, 0.3, 0, c, { chanfrein: 0.05 });
  boite(lot, 'peinture', x + 0.36, y + 0.8, z, 0.18, 0.36, 0.22, 0, c, { chanfrein: 0.04 });
  boite(lot, 'peinture', x + 0.3, y + 0.86, z, 0.04, 0.04, 0.46, 0, lin('#e0c020'));
}

// L'aire de G8 : sol souple, tour à cabane et toboggan tube spiralé, seconde tour à panneaux jaunes, jeu à ressort
function* aireG8(ctx) {
  const { kit, groupe } = ctx;
  const lot = new kit.Lot('aire à la tour');
  const bc = lin(C.boisClair, 1.9);
  // la tour principale : plate-forme de 1,4 m à 1,5 m, quatre poteaux, garde-corps de panneaux vert anis, toit à deux pans
  const tx = -70.9, tz = 100.3, ty = kit.sol(tx, tz), c = 0.7;
  for (const [u, v] of [[-c, -c], [c, -c], [c, c], [-c, c]]) lot.barre([tx + u, ty - 0.05, tz + v], [tx + u, ty + 2.6, tz + v], 0.1, 0.1, { cle: 'bois', couleur: bc, haut: [1, 0, 0] });
  boite(lot, 'bois', tx, ty + 1.5, tz, 1.5, 0.07, 1.5, 0, bc);
  boite(lot, 'peinture', tx, ty + 1.9, tz - c, 1.4, 0.7, 0.03, 0, lin(C.anis));
  boite(lot, 'peinture', tx - c, ty + 1.9, tz, 0.03, 0.7, 1.4, 0, lin(C.anis));
  for (const s of [-1, 1]) {
    const m = new THREE.Matrix4().makeRotationX(s * 0.62).setPosition(tx, ty + 2.87, tz + s * 0.42);
    lot.boite('bois', 1.8, 0.05, 1.02, m, { couleur: s > 0 ? bc : lin(C.anis) });
  }
  // l'échelle, côté x-
  for (let i = 0; i < 6; i++) boite(lot, 'bois', tx - c - 0.45 + i * 0.075, ty + 0.25 * i + 0.1, tz + 0.3, 0.05, 0.04, 0.5, 0, bc);
  for (const s of [-1, 1]) lot.barre([tx - c - 0.55, ty, tz + 0.3 + s * 0.27], [tx - c, ty + 1.5, tz + 0.3 + s * 0.27], 0.06, 0.06, { cle: 'bois', couleur: bc });
  // le toboggan tube spiralé vert sombre : de la plate-forme (côté x+) jusqu'au sol, un tour et quart autour d'un axe
  const cx = tx + c + 1.15, cz = tz, pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, a = Math.PI + t * Math.PI * 2.5;
    pts.push(new THREE.Vector3(cx + Math.cos(a) * 1.15, ty + 1.95 - t * 1.55, cz + Math.sin(a) * 1.15));
  }
  lot.geo('peinture', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 56, 0.4, 12, false), null, { bande: true, couleur: lin(C.toboggan) });
  lot.tour('peinture', [[0.08, -0.05], [0.07, ty + 1.9 - kit.sol(cx, cz)]], 8, new THREE.Matrix4().makeTranslation(cx, kit.sol(cx, cz), cz), { bande: true, couleur: lin('#555550') });
  if (ctx.budget()) yield;
  // la seconde tour, plus petite, à panneaux jaunes et petit toit
  const sx = -65.9, sz = 102.7, sy = kit.sol(sx, sz), d = 0.5;
  for (const [u, v] of [[-d, -d], [d, -d], [d, d], [-d, d]]) lot.barre([sx + u, sy - 0.05, sz + v], [sx + u, sy + 1.95, sz + v], 0.09, 0.09, { cle: 'bois', couleur: bc, haut: [1, 0, 0] });
  boite(lot, 'bois', sx, sy + 0.9, sz, 1.1, 0.06, 1.1, 0, bc);
  for (const [u, v, w, dd] of [[0, d, 1.0, 0.03], [d, 0, 0.03, 1.0], [0, -d, 1.0, 0.03]]) boite(lot, 'peinture', sx + u, sy + 1.25, sz + v, w, 0.6, dd, 0, lin(C.jaune));
  lot.tour('peinture', [[0.85, 0], [0.02, 0.55]], 4, new THREE.Matrix4().makeTranslation(sx, sy + 1.95, sz), { bande: true, couleur: lin(C.jaune, 0.9), a0: Math.PI / 4, facettes: true, vif: true, fond: true });
  // le jeu à ressort rouge, la barrière Vauban posée au coin
  ressort(lot, -66.6, 97.6, lin(C.rouge));
  vauban(lot, -63.2, 94.8, 0, 0);
  groupe.add(lot.maillages('bosquet · aire à la tour'));
}

// L'aire de la cabane rouge (A7-3) : poteaux rouges, panneaux jaunes cadrés de bleu, toit de bardeaux sombres
function* aireCabane(ctx) {
  const { kit, groupe } = ctx;
  const lot = new kit.Lot('aire de la cabane rouge');
  const x = -97.9, z = 133.8, y = kit.sol(x, z), c = 0.8, rouge = lin(C.rouge);
  for (const [u, v] of [[-c, -c], [c, -c], [c, c], [-c, c]]) lot.barre([x + u, y - 0.05, z + v], [x + u, y + 2.3, z + v], 0.11, 0.11, { couleur: rouge, haut: [1, 0, 0] });
  boite(lot, 'bois', x, y + 0.8, z, 1.7, 0.07, 1.7, 0, lin(C.boisClair, 1.6));
  for (const [u, v, w, d] of [[0, -c, 1.5, 0.03], [-c, 0, 0.03, 1.5], [0, c, 1.5, 0.03]]) {
    boite(lot, 'peinture', x + u, y + 1.15, z + v, w, 0.55, d, 0, lin(C.jaune));
    boite(lot, 'peinture', x + u, y + 1.45, z + v, w + (d > 0.1 ? 0.04 : 0), 0.05, d + (w > 0.1 ? 0.04 : 0), 0, lin(C.bleu));
    boite(lot, 'peinture', x + u, y + 0.87, z + v, w + (d > 0.1 ? 0.04 : 0), 0.05, d + (w > 0.1 ? 0.04 : 0), 0, lin(C.bleu));
  }
  for (const s of [-1, 1]) {
    const m = new THREE.Matrix4().makeRotationZ(-s * 0.55).setPosition(x + s * 0.5, y + 2.55, z);
    lot.boite('peinture', 1.15, 0.06, 2.1, m, { couleur: lin(C.bardeau), bande: true });
  }
  // un petit toboggan droit qui descend côté x+
  const m = new THREE.Matrix4().makeRotationZ(-0.52).setPosition(x + c + 0.75, y + 0.45, z + 0.3);
  lot.boite('peinture', 1.75, 0.04, 0.5, m, { couleur: lin(C.jaune), bande: true });
  ressort(lot, -95.4, 131.5, lin(C.jaune));
  groupe.add(lot.maillages('bosquet · aire de la cabane rouge'));
  yield;
}

// ============================================================================================ 5. LE RESTE DU MOBILIER
// Une barrière Vauban galvanisée de 2 m (cadre, 13 barreaux, deux pieds plats), en (x, z), le long de `a` degrés,
// penchée de `incl` radians (les barrières empilées de la photo 10).
function vauban(lot, x, z, a, incl, dh = 0) {
  const y = Monde.sol(x + Monde.dx, z) + dh, g = lin(C.galva), r = (a * Math.PI) / 180, ux = Math.cos(r), uz = -Math.sin(r);
  const nx = -uz, nz = ux, P = (u, h) => [x + ux * u + nx * Math.sin(incl) * h, y + h * Math.cos(incl), z + uz * u + nz * Math.sin(incl) * h];
  const tube = (A, B, w = 0.035) => lot.barre(A, B, w, w, { couleur: g });
  tube(P(-1, 0.12), P(-1, 1.1)); tube(P(1, 0.12), P(1, 1.1)); tube(P(-1, 1.1), P(1, 1.1)); tube(P(-1, 0.2), P(1, 0.2));
  for (let i = 1; i < 14; i++) { const u = -1 + (i * 2) / 14; tube(P(u, 0.2), P(u, 1.1), 0.014); }
  for (const u of [-1.02, 1.02]) lot.barre([x + ux * u - nx * 0.3, y + 0.02, z + uz * u - nz * 0.3], [x + ux * u + nx * 0.3, y + 0.02, z + uz * u + nz * 0.3], 0.05, 0.02, { couleur: g });
}
// Une table de pique-nique en béton clair : plateau, deux bancs, deux pieds pleins en trapèze.
function piqueNique(lot, t) {
  const y = Monde.sol(t.x + Monde.dx, t.z), c = lin(C.betonClair, 1.05);
  boite(lot, 'beton', t.x, y + 0.74, t.z, 2.0, 0.07, 0.8, t.a, c, { chanfrein: 0.01 });
  for (const s of [-1, 1]) { const [bx, bz] = loc(t.x, t.z, t.a, 0, s * 0.68); boite(lot, 'beton', bx, y + 0.44, bz, 2.0, 0.06, 0.3, t.a, c, { chanfrein: 0.01 }); }
  for (const s of [-1, 1]) { const [px, pz] = loc(t.x, t.z, t.a, s * 0.72, 0); boite(lot, 'beton', px, y + 0.37, pz, 0.12, 0.74, 1.55, t.a, c); }
}
// Une table de ping-pong en béton (A7-1) : plateau vert de 2,74 x 1,52 à 0,76 m, lignes blanches, filet fixe, pied
// central massif. Posée le long de z.
function tablePingPong(lot, x, z) {
  const y = Monde.sol(x + Monde.dx, z), vert = lin(C.tableVerte), gris = lin(C.betonGris, 1.15);
  lot.boite('beton', 1.52, 0.08, 2.74, new THREE.Matrix4().makeTranslation(x, y + 0.72, z), { couleur: (xx, yy, zz, nx, ny) => (ny > 0.9 ? vert : gris), chanfrein: 0.01 });
  boite(lot, 'beton', x, y + 0.34, z, 0.5, 0.7, 1.3, 0, gris);
  const b = lin(C.blanc);
  for (const s of [-1, 1]) { boite(lot, 'peinture', x + s * 0.74, y + 0.765, z, 0.02, 0.005, 2.74, 0, b); boite(lot, 'peinture', x, y + 0.765, z + s * 1.36, 1.52, 0.005, 0.02, 0, b); }
  boite(lot, 'peinture', x, y + 0.765, z, 0.01, 0.005, 2.74, 0, b);
  boite(lot, 'beton', x, y + 0.84, z, 1.62, 0.15, 0.04, 0, lin('#7a7a76', 1.2));
}
// Le petit kiosque rond de la clairière B (ortho : un octogone à toit rayé rouge et blanc de 4 à 5 m) : plancher de bois,
// huit poteaux blancs, toit conique en seize pans alternés.
function kiosqueRaye(kit, lot) {
  const { x, z, r } = KIOSQUE_RAYE, y = kit.sol(x, z), T = (dy) => new THREE.Matrix4().makeTranslation(x, y + dy, z);
  lot.tour('bois', [[r + 0.15, -0.1], [r + 0.15, 0.14], [0.001, 0.14]], 8, T(0), { couleur: lin('#9a7a5a', 1.7), facettes: true, vif: true, a0: Math.PI / 8 });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; lot.barre([x + Math.cos(a) * r, y + 0.1, z + Math.sin(a) * r], [x + Math.cos(a) * r, y + 2.3, z + Math.sin(a) * r], 0.09, 0.09, { couleur: lin('#eeeeea'), haut: [1, 0, 0] }); }
  lot.tour('peinture', [[r + 0.08, 2.18], [r + 0.08, 2.32]], 8, T(0), { bande: true, couleur: lin('#eeeeea'), facettes: true, vif: true, a0: Math.PI / 8 });
  const n = 16, R = r + 0.45, yb = y + 2.3, ys = y + 3.6;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
    const A = [x + Math.cos(a0) * R, yb, z + Math.sin(a0) * R], Bp = [x + Math.cos(a1) * R, yb, z + Math.sin(a1) * R], S = [x, ys, z];
    const nrm = new THREE.Vector3(Math.cos(am) * (ys - yb), R, Math.sin(am) * (ys - yb)).normalize().toArray();
    const coul = lin(i % 2 ? C.blancToit : C.rougeToit), uv = (xx, yy, zz, out) => { out[0] = 0.25; out[1] = 0.5; };
    lot.polygone('peinture', [A, Bp, S], nrm, { couleur: coul, uv });
    lot.polygone('peinture', [A, Bp, S], [-nrm[0], -nrm[1], -nrm[2]], { couleur: lin(i % 2 ? C.blancToit : C.rougeToit, 0.55), uv });
  }
  lot.tour('peinture', [[0.06, 0], [0.04, 0.3], [0.08, 0.36], [0.001, 0.45]], 8, T(3.55), { bande: true, couleur: lin(C.rougeToit) });
}
// La cabane de jardinier à toit brun (SAT-2) : planches, porte, toit à deux pans débordant.
function cabane(kit, lot) {
  const { x, z, w, d } = CABANE, y = kit.sol(x, z), mur = lin(C.cabaneMurs, 1.8);
  boite(lot, 'bois', x, y + 1.05, z, w, 2.2, d, 0, mur);
  boite(lot, 'peinture', x - 0.6, y + 0.95, z - d / 2 - 0.02, 0.9, 1.9, 0.04, 0, lin('#3a2a1e'));
  boite(lot, 'peinture', x + 0.7, y + 1.5, z - d / 2 - 0.02, 0.6, 0.45, 0.03, 0, lin('#2a3234'));
  for (const s of [-1, 1]) {
    const m = new THREE.Matrix4().makeRotationX(s * 0.45).setPosition(x, y + 2.42, z + s * 0.72);
    lot.boite('bois', w + 0.4, 0.06, 1.68, m, { couleur: lin(C.cabaneToit, 1.6) });
  }
}

function* mobilier(ctx, B) {
  const { kit, groupe } = ctx;
  preparer();
  const lot = new kit.Lot('mobilier du bosquet');
  for (const l of LAMPES) if (dansBoite(B, l.x, l.z)) lanterneMat(kit, lot, l.x, l.z);
  for (const t of PIQUE_NIQUE) if (dansBoite(B, t.x, t.z)) piqueNique(lot, t);
  for (const P of PINGPONG) if (dansBoite(B, P.x, P.z)) { tablePingPong(lot, P.x - 1.45, P.z); tablePingPong(lot, P.x + 1.45, P.z); }
  if (dansBoite(B, KIOSQUE_RAYE.x, KIOSQUE_RAYE.z)) kiosqueRaye(kit, lot);
  if (dansBoite(B, CABANE.x, CABANE.z)) cabane(kit, lot);
  if (dansBoite(B, VAUBAN.x, VAUBAN.z)) for (let i = 0; i < 5; i++) vauban(lot, VAUBAN.x + i * 0.075, VAUBAN.z + i * 0.03, 90, 0.1, 0.012 * i);
  groupe.add(lot.maillages('bosquet · mobilier'));
  if (ctx.budget()) yield;
  for (const b of BANCS) if (dansBoite(B, b.x, b.z)) groupe.add(kit.banc({ x: b.x, z: b.z, cap: b.cap, style: 'ville_paris', long: 1.8 }));
  for (const [x, z] of CORBEILLES) if (dansBoite(B, x, z)) groupe.add(kit.poubelle({ x, z, cap: 0 }));
  yield;
}

// ============================================================================================ les morceaux
const BOITES = {
  Z16a: [-133.5, 44.5, -95, 81.33], Z16b: [-95, 44.5, -56.5, 81.33], Z16c: [-133.5, 81.33, -95, 116.67],
  Z16d: [-95, 81.33, -56.5, 116.67], Z16e: [-133.5, 116.67, -95, 156.0], Z16f: [-95, 116.67, -54.5, 156.0],
};
function* construireMorceau(ctx, id) {
  const B = BOITES[id];
  yield* sols(ctx, B);
  yield* allees(ctx, B);
  if (id === 'Z16f') { yield* kiosque(ctx); yield* aireCopeaux(ctx); }
  if (id === 'Z16d') yield* aireG8(ctx);
  if (id === 'Z16e') yield* aireCabane(ctx);
  yield* mobilier(ctx, B);
}

// ============================================================================================ la zone
export default {
  id: 'Z16', nom: 'Bosquet ouest',
  emprise: [[-133, 46], [-57, 46], [-57, 152], [-133, 152]],
  morceaux: Object.keys(BOITES).map((id) => ({ id, boite: BOITES[id], construire: (ctx) => construireMorceau(ctx, id) })),
  // PUR : ce qui arrête le joueur, le vélo et la balle (la grille de la limite sud et le portail sont déjà dans
  // monde.json)
  obstacles(o) {
    preparer();
    const dur = (h) => ({ h, type: 'dur' });
    for (const l of LAMPES) o.cercle(l.x, l.z, 0.12, dur(4.2));
    for (const b of BANCS) { const a = (b.cap * Math.PI) / 180; o.boite(b.x, b.z, 0.93, 0.32, -a, dur(0.9)); }
    for (const [x, z] of CORBEILLES) o.cercle(x, z, 0.28, dur(0.9));
    for (const t of PIQUE_NIQUE) o.boite(t.x, t.z, 1.0, 0.85, -(t.a * Math.PI) / 180, dur(0.8));
    for (const P of PINGPONG) for (const s of [-1, 1]) o.boite(P.x + s * 1.45, P.z, 0.76, 1.37, 0, dur(0.8));
    // le kiosque, la palissade, les jardinières (l'entrée de la terrasse reste libre), les poteaux et les mâts
    const Kq = KIOSQUE;
    o.boite((Kq.x0 + Kq.x1) / 2, (Kq.z0 + Kq.z1) / 2, (Kq.x1 - Kq.x0) / 2 + 0.05, (Kq.z1 - Kq.z0) / 2 + 0.05, 0, dur(2.9));
    o.segment(PALISSADE[0][0], PALISSADE[0][1], PALISSADE[1][0], PALISSADE[1][1], { e: 0.08, h: 1.0, type: 'dur' });
    for (const j of jardinieres()) o.boite(j.x, j.z, j.a ? 0.3 : 0.6, j.a ? 0.6 : 0.3, 0, dur(1.1));
    for (const x of [-81.2, -78.0]) for (const z of [118.4, 121.6, 124.8]) o.cercle(x, z, 0.06, dur(2.5));
    // l'aire de la photo 9 : sa clôture (ouverte côté terrasse), le portique, les massifs bas
    const R = COPEAUX;
    o.segment(PORTE_COPEAUX[1], R.z0, R.x1, R.z0, { e: 0.06, h: 1.0, type: 'grille' });
    o.segment(R.x1, R.z0, R.x1, R.z1, { e: 0.06, h: 1.0, type: 'grille' });
    o.segment(R.x1, R.z1, R.x0, R.z1, { e: 0.06, h: 1.0, type: 'grille' });
    o.segment(R.x0, R.z1, R.x0, R.z0, { e: 0.06, h: 1.0, type: 'grille' });
    o.segment(R.x0, R.z0, PORTE_COPEAUX[0], R.z0, { e: 0.06, h: 1.0, type: 'grille' });
    for (const x of [-80.8, -76.6]) o.boite(x, 135.3, 0.1, 0.95, 0, dur(2.4));
    for (const a of MASSIFS_BAS) o.cercle(a.x, a.z, a.R * 0.6, { h: a.h, type: 'haie' });
    // les tours, le toboggan, les cabanes, le kiosque rayé (ses poteaux), la cabane de jardinier, les barrières
    o.boite(-70.9, 100.3, 0.8, 0.8, 0, dur(2.9));
    o.cercle(-70.9 + 0.7 + 1.15, 100.3, 1.5, dur(2.0));
    o.boite(-65.9, 102.7, 0.55, 0.55, 0, dur(2.5));
    o.boite(-97.9, 133.8, 0.9, 0.9, 0, dur(2.8));
    for (const [x, z] of [[-81.6, 131.7], [-66.6, 97.6], [-95.4, 131.5]]) o.cercle(x, z, 0.4, dur(0.9));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; o.cercle(KIOSQUE_RAYE.x + Math.cos(a) * KIOSQUE_RAYE.r, KIOSQUE_RAYE.z + Math.sin(a) * KIOSQUE_RAYE.r, 0.08, dur(2.3)); }
    o.boite(CABANE.x, CABANE.z, CABANE.w / 2 + 0.05, CABANE.d / 2 + 0.05, 0, dur(2.6));
    o.boite(VAUBAN.x + 0.15, VAUBAN.z + 0.06, 0.3, 1.05, 0, { h: 1.1, type: 'grille' });
    o.boite(-63.2, 94.8, 1.02, 0.1, 0, { h: 1.1, type: 'grille' });
  },
  bancs(b) {
    for (const x of BANCS) { const a = (x.cap * Math.PI) / 180; b.push({ x: x.x + Math.sin(a) * 0.1, z: x.z + Math.cos(a) * 0.1, cap: x.cap, y: 0.45, source: 'Z16' }); }
  },
  lieux: [],
};
