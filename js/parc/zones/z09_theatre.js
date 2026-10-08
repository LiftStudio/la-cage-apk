// =====================================================================
//  ZONE Z09 — LE THÉÂTRE DE VERDURE ET L'ENTRÉE SUD-OUEST (lot B10)
// =====================================================================
// L'amphithéâtre des frères Vera (1952, restauré en 2021), au bas du coteau sud, entre la placette et l'orangerie (Z12,
// au-dessus) et le quai (Z03, Z19, derrière la scène) ; puis le bout sud-ouest du parc, jusqu'au portillon du quai
// (conception § 1.3, Z09 ; emprise x -45 à 8, z 150 à 187).
//
// CE QUE LES PHOTOS MONTRENT (tools/parc/references_gmaps/SYNTHESE.md, fiche Z09, et R5.md § Z09, qui corrigent la
// conception ; photo 5 de tools/parc_becon_references.md), et ce qu'on en fait. Le public regarde x+ : la Seine.
//  - DEUX BLOCS DE GRADINS de béton clair en arcs très ouverts (R5-T16, la photo Commons de 2022 prise de l'orchestre),
//    pas un arc continu : en bas, un SOUBASSEMENT de moellons (0,7 m) puis 5 rangs de 0,9 x 0,44 m ; un PALIER ; un
//    MUR MÉDIAN de moellons (0,8 m) ; en haut, 10 rangs de 0,85 x 0,40 m. Deux DÉGAGEMENTS de 1,1 m dans le bloc bas, un
//    au centre du bloc haut (1 m) : deux demi-marches de 0,20 à 0,22 par rang ; au pied de chacun, deux PILES-
//    JARDINIÈRES de pierre jaune à liseré de brique. Le long du flanc z-, l'ESCALIER LATÉRAL de pierre qui monte à la
//    terrasse (R5-T01, T07).
//  - L'ORCHESTRE (le sol plat au pied des gradins) en stabilisé gris-beige, découpé par cinq BANDES RAYONNANTES de pierre
//    claire qui partent de la scène, deux petits projecteurs posés devant le premier rang.
//  - LA SCÈNE : un demi-disque dallé (opus incertum) surélevé de 0,9 m (contremarche de moellons sous une tablette), un
//    ESCALIER DE 5 MARCHES à chaque bout, contre lui, qui monte vers le fond. Derrière, le MUR EN REDANS : un demi-
//    polygone de moellons crème (un pan axial et deux pans de chaque côté, puis les retours qui reviennent vers les
//    gradins le long des escaliers), des PILES saillantes plus hautes que les pans, la NICHE cintrée du pan axial avec
//    son gradin demi-circulaire, un garde-corps clair au-dessus d'elle (R5-T06), du lierre sur deux piles. Au-delà des
//    retours, les murs de l'orchestre filent vers z- (porte des coulisses) et vers z+ (porte, et derrière le bâtiment
//    de service enduit de blanc, R5-T01).
//  - LA TERRASSE HAUTE en sable ocre (depuis 2021 : plus d'asphalte rouge), bordée côté gradins de deux HAIES TAILLÉES
//    en arc (0,6 m) ouvertes de 3 m dans l'axe, plantées de PALMIERS DE CHINE ; contre le mur de la placette (Z12), le
//    TALUS PLANTÉ de R5-T01 et R4-T0 (graminées, fougères, lauriers, fusains, petits palmiers), qui couvre le bas du mur
//    de 4 m que les données du monde y dressent (rupture 70 du MNT) ; deux mâts de bois brun d'éclairage scénique.
//  - LA COUR DE SERVICE derrière la scène (le « petit terrain sablé » de la conception) : sol sablé, clôture de treillis
//    galvanisé de 3,5 m, un petit bâtiment de moellons à toit plat (R5-T10, T11 ; non praticable).
//  - LA LIMITE SUD-OUEST : muret en opus incertum de 0,9 m et grille noire de 1,3 m (R5-T13) ; le PORTILLON SO, fermé
//    (portillon PQS de monde.json), le vantail de planches claires et le portail de tôle anthracite du service des
//    espaces verts, son panneau blanc ; six arceaux à vélos dehors.
// Les arbres viennent de arbres.bin (règle 4) : le GRAND CONIFÈRE côté z- de la scène et son voisin, le grand platane
// et le tilleul dont les houppiers couvrent la scène (tools/parc/gabarits.json, arbres.retirer et ajouter, lot B10).
// Les deux conifères sont de l'essence « if_conique » : au-delà de 5 m, js/parc/kit.js (ifConique) les dessine en port
// libre, des masses de rameaux sur un fût (relecture du lot), et non plus en cône taillé.
//
// LE PLAN (tools/parc/gabarits.json, gabarits de la zone Z09 ; les valeurs ci-dessous en sont RECOPIÉES : qui change un
// gabarit change sa constante ici). Les arcs des gradins et du palier ont tous le même centre, (-1 ; 160,3), lu dans le
// MNT et le MNS (premiers échos LiDAR, nets à ciel ouvert) : pied du soubassement à x -20,4 dans l'axe, palier plat de
// x -27 à -25, haut des gradins à -35,5 ; SYNTHESE et R5 plaçaient le centre de la SCÈNE en (-17 ; 159), là où les
// relevés voient les rangs du bloc bas. La scène, sous les houppiers, est calée sur le MNS : une plate-forme à -1,2
// vue entre les feuillages de x -14,8 à -12 ; son centre est donc en (-10 ; 160,3), dans l'axe des gradins.
//
// LES MORCEAUX (conception § 3.3 et 3.5) : Z09a les gradins (rangs, dégagements, soubassement, mur médian, palier, joues,
// jardinières, escalier latéral) ; Z09b l'orchestre et la scène (sol, bandes, projecteurs, escalier d'entrée, scène,
// mur en redans, murs de l'orchestre, bâtiment de service) ; Z09c la terrasse haute (sable, haies, palmiers, talus
// planté, mâts) ; Z09d la cour de service ; Z09e la limite sud-ouest et le portillon. Silhouettes : Z09a et Z09b.
//
// RÈGLES DE ZONE (conception § 3.3) : aucun Math.random (le hasard de position, alea et bruit) ; toute hauteur par le sol
// du monde (kit.sol, kit.poserSurSol), sauf sur les plans des données (orchestre -2,2, scène -1,3, palier +0,7, rangs
// des gradins), plats par construction, où l'on pose à leur hauteur ; les matériaux du kit, le feuillage du coteau
// (partagé) et un seul matériau propre, le treillis galvanisé de la cour ; aucun arbre planté (palmiers, arbustes et
// haies sont du décor de zone) ; tout dans le groupe du morceau. Les revêtements à plat (sable, orchestre, dessus des
// rangs, dallage de la scène) sont hors de l'ombre cuite et des ombres de contact (aPlat, js/parc/zones/z17_allee_haute.js).
import * as THREE from 'three';
import { Monde } from '../../monde.js';
import { alea, lin, versTeinte, drape, aPlat, unArbuste, petitArbuste } from './z17_allee_haute.js';
import { Touffes, maillageFeuillage, bruit, teinte as teinteCoteau } from './coteau.js';
import { outilsB2 } from './z04_butte_pin.js';
import { carteFond } from '../../court_parc.js';

// ============================================================================================ les données
// (repère du terrain 1 ; recopiées de tools/parc/gabarits.json, zone Z09)
// Le centre des arcs des gradins (gabarits gradins_theatre, gradins_theatre_haut, palier_theatre) ; ils montent vers x-.
const C = { x: -1.0, z: 160.3 };
// Les deux bouts des gradins (le `clip` des gabarits) : les rangs s'arrêtent net sur ces deux droites z = cte.
const Z0 = 150.4, Z1 = 171.0;
// Les deux blocs : le rang k (1..n) va du rayon r0 + (k-1)·p à r0 + k·p, à la hauteur y1 + (k-1)·h.
const BAS = { r0: 19.5, p: 0.9, h: 0.44, n: 5, y1: -1.5 };
const HAUT = { r0: 26.0, p: 0.85, h: 0.40, n: 10, y1: 1.5 };
const PALIER = { r0: 24.0, r1: 26.0, y: 0.7, z0: 149.0 };
const Y_ORCH = -2.2;
// Les dégagements (escalier13_theatre_n et _s, escalier22_theatre) : angle de leur axe autour de C (rad, 0 = x-,
// positif vers z+) et largeur. Les deux du bas passent par les deux piles-jardinières vues à l'ortho (z 157,1 et 158,9).
const DEG_BAS = [{ t: -0.118225, w: 1.1 }, { t: 0.118225, w: 1.1 }];
const DEG_HAUT = [{ t: 0, w: 1.0 }];
// L'escalier latéral du flanc z- (escalier_lateral_theatre), du palier à la terrasse
const ESC_LAT = { de: [-24.7, 149.6, 0.7], a: [-34.9, 149.6, 5.2], largeur: 1.2, marches: 23 };
// La scène (plateau_scene_theatre) : demi-disque de 4,8 m côté gradins, dessus à -1,3 ; ses deux escaliers de 5 marches
// (escalier_scene_n et _s), qui montent vers x+ entre elle et les retours du mur.
const S = { x: -10.0, z: 160.3, r: 4.8, y: -1.3 };
const ESC_SCENE = [{ de: [-11.95, 154.85, Y_ORCH], a: [-10.0, 154.85, S.y], largeur: 1.5, marches: 5 },
  { de: [-11.95, 165.75, Y_ORCH], a: [-10.0, 165.75, S.y], largeur: 1.5, marches: 5 }];
// L'escalier de béton de l'orchestre (escalier_orchestre_theatre), qui descend du jardin sud (bout de l'allée de
// l'hémicycle, zone Z07) dans le coin z- de l'orchestre ; son palier (escalier_orchestre_palier) le prolonge à plat.
const ESC_ORCH = { de: [-16.6, 148.7, -1.25], a: [-16.6, 151.3, Y_ORCH], largeur: 2.4, marches: 5 };
// LE MUR EN REDANS et les murs de l'orchestre (mur_orchestre, mur_orchestre_sud) : l'axe des pans, du bout z- au bout
// z+. Ses sommets portent les piles : les deux piles de tête (en avant, au bout des retours), les deux piles d'angle
// (au bout du diamètre de la scène), puis le demi-polygone de rayon 6,2 m autour du centre de la scène (piles à ±54°
// et ±18°, le pan axial entre les deux dernières). `haut` : le dessus du pan qui part de ce sommet vers le suivant ;
// `pile` : le dessus de la pile (R5 : piles de 3,8 m au-dessus de la scène, pans de 3,4 m ; les retours et les têtes
// plus bas, la silhouette crénelée descend vers les gradins, R5-T01).
const ANGLE = (deg) => [S.x + 6.2 * Math.cos((deg * Math.PI) / 180), S.z + 6.2 * Math.sin((deg * Math.PI) / 180)];
const REDANS = [
  { p: [-12.1, 153.7], pile: 1.6, haut: 1.35, pied: Y_ORCH },
  { p: [-10.0, 153.7], pile: 2.25, haut: 1.9, pied: Y_ORCH },
  { p: ANGLE(-54), pile: 2.45, haut: 2.1, pied: S.y },
  { p: ANGLE(-18), pile: 2.6, haut: 2.15, pied: S.y, axial: true },
  { p: ANGLE(18), pile: 2.6, haut: 2.1, pied: S.y },
  { p: ANGLE(54), pile: 2.45, haut: 1.9, pied: S.y },
  { p: [-10.0, 166.9], pile: 2.25, haut: 1.35, pied: Y_ORCH },
  { p: [-12.1, 166.9], pile: 1.6, pied: Y_ORCH },
];
const EP_PAN = 0.45, PILE = { l: 0.9, p: 1.0 };
// Les deux murs de l'orchestre au-delà des têtes (axe x -12,1), chacun percé d'une porte de coulisses (R5-T02 : 1 x 2,2 m)
const FLANCS = [
  { a: [-12.1, 150.4], b: [-12.1, 153.7], porte: [151.2, 152.2] },
  { a: [-12.1, 166.9], b: [-12.1, 172.9], porte: [168.2, 169.2] },
];
const Y_FLANC = 0.35;
// Le bâtiment de service enduit de blanc, derrière le mur de l'orchestre côté z+ (R5-T01, T07)
const ANNEXE = { x0: -11.8, x1: -6.4, z0: 167.4, z1: 172.4, haut: 1.55 };
// LA TERRASSE HAUTE : la ligne du mur de soutènement de la placette (gabarit mur_placette_theatre, zone Z12), dont la
// face côté théâtre est à 0,3 m de la ligne ; les deux haies en arc (rayon 35,25 autour de C) et leur ouverture.
const MUR_Z12 = [[-45.9, 148.6], [-46.3, 151.6], [-45.6, 153.5], [-45.5, 155.4], [-45.3, 157.3], [-45.7, 159.2], [-45.3, 161.1], [-45.1, 163.1],
  [-45.1, 165.0], [-45.7, 167.0], [-46.7, 168.8], [-47.2, 170.6]];
const R_HAIE = 35.25;
const HAIES = [{ z0: 151.9, z1: 158.75 }, { z0: 161.85, z1: 169.4 }];
// Le talus planté au pied du mur de la placette : de z 152,6 à 170, jusqu'à 2,3 m du mur, son haut à +7,3
const TALUS = { z0: 152.6, z1: 170.0, larg: 2.3, haut: 7.3 };
// Les palmiers de Chine des massifs de haies (R5-T01, T06 : « des massifs plantés de palmiers de 2 à 4 m ») : z, hauteur
// du stipe ; et les deux mâts de bois brun d'éclairage scénique au haut des gradins (photo Commons, R5-T07)
const PALMIERS_HAIE = [{ z: 153.6, h: 2.4 }, { z: 156.9, h: 3.3 }, { z: 164.2, h: 2.0 }, { z: 167.5, h: 3.7 }];
const MATS = [{ t: -0.235 }, { t: 0.235 }];
// LA COUR DE SERVICE (x -3,2 à 3 ; z 150,6 à 172,6 : l'ortho, le satellite, R5-T10 et T11) et son petit bâtiment
const COUR = { x0: -3.2, x1: 3.0, z0: 150.6, z1: 172.6, h: 3.5 };
const BATIMENT = { x0: -2.8, x1: 1.6, z0: 151.0, z1: 155.2, haut: 3.0 };
// LA LIMITE SUD-OUEST (clôture limite_sud de monde.json, sa partie de la zone) et le portillon du quai (PQS)
const LIMITE = [[-45.8, 168.0], [-45.8, 173.7], [-4.3, 172.8], [-5.0, 185.3], [-2.45, 185.32]];
const PQS = { x: -1.4, z: 185.3, largeur: 2.0 };
const ARCEAUX = { z: 186.7, x0: -4.6, pas: 0.9, n: 6 };

// ============================================================================================ petits outils
const rad = (d) => (d * Math.PI) / 180;
const borne = (v, a, b) => (v < a ? a : v > b ? b : v);
// Un point des gradins : sur l'arc de rayon R autour de C, à l'angle t (0 = vers x-, positif vers z+)
const PA = (R, t) => [C.x - R * Math.cos(t), C.z + R * Math.sin(t)];
// L'angle où l'arc de rayon R coupe la droite z = cte (un bout des gradins)
const tBout = (R, z) => Math.asin(borne((z - C.z) / R, -1, 1));
// Le demi-angle qu'occupe un dégagement de largeur w sur l'arc R (ses bords sont parallèles à son axe)
const demiAngle = (R, w) => Math.asin(Math.min(1, w / 2 / R));
// Le x de l'arc R à la hauteur z (côté x-)
const xArc = (R, z) => C.x - Math.sqrt(Math.max(0, R * R - (z - C.z) * (z - C.z)));
// La hauteur du rang k d'un bloc
const yRang = (B, k) => B.y1 + (k - 1) * B.h;
// Le x de la ligne du mur de la placette à la hauteur z (pur : les obstacles s'en servent)
function xMurZ12(z) {
  const L = MUR_Z12;
  for (let i = 1; i < L.length; i++) {
    const [ax, az] = L[i - 1], [bx, bz] = L[i];
    if ((z - az) * (z - bz) <= 0 && az !== bz) return ax + ((bx - ax) * (z - az)) / (bz - az);
  }
  return z < L[0][1] ? L[0][0] : L[L.length - 1][0];
}
// Les travées d'un rang entre les arcs Ra et Rb, coupé par les dégagements `coupures` : [[ta0, ta1, tb0, tb1], ...]
// (angles sur Ra, puis sur Rb). Le bord d'un dégagement est une droite : ses deux bouts sont sur la même parallèle à l'axe.
function travees(Ra, Rb, coupures, z0 = Z0, z1 = Z1) {
  const bornes = (R) => {
    const L = [tBout(R, z0)];
    for (const c of coupures) { const d = demiAngle(R, c.w); L.push(c.t - d, c.t + d); }
    L.push(tBout(R, z1));
    return L;
  };
  const A = bornes(Ra), B = bornes(Rb), out = [];
  for (let i = 0; i < A.length; i += 2) out.push([A[i], A[i + 1], B[i], B[i + 1]]);
  return out;
}

// LES TEINTES (multiplicateurs des textures du kit, en couleurs de sommets ; moyennes des textures relevées sur les
// fichiers de assets/parc/kit et assets/parc/tex, cibles des photos R5)
const T_BETON = versTeinte('#cfcac0', '#bfc0bc');        // béton (bâtiments de service)
// LE BÉTON LISSE DES GRADINS (#bcbdb9 neuf, #a9aaa6 patiné ; R5-T16 : lisse, arêtes vives, légères taches sombres).
// (relecture du lot B10) Le « béton » du kit est un béton lavé, à gravillons apparents : de près (PV17, le haut des
// gradins), chaque rang était semé de cailloux de 3 à 5 cm, un sol de terrasse et non les gradins coulés des photos.
// La « pierre de taille » du kit, lisse et marbrée, ramenée au gris du béton, en a le grain.
const MAT_G = 'taille';
const T_GRADIN = versTeinte('#dfd9cb', '#bfc0bc');
const T_MOELLON = versTeinte('#d6cdb9', '#d8cba8');      // moellons calcaires jaune crème des soubassements
const T_MUR = versTeinte('#d6cdb9', '#ddd4c2');          // moellons équarris du mur en redans
const T_TAILLE = versTeinte('#dfd9cb', '#d6cfc1');       // tablettes, couronnements
const T_BANDE = versTeinte('#dfd9cb', '#d2cbbd');        // bandes rayonnantes de l'orchestre
const T_DALLE = versTeinte('#dfd9cb', '#c9c1b0');        // dalles de la scène
const T_BRIQUE = versTeinte('#954535', '#8a4b3a');       // piles-jardinières
// (le stabilisé de l'orchestre est PLUS SOMBRE que le béton des gradins : R5-T01 et T16, un gris-beige terne où les
// bandes de pierre claire ressortent ; à #bdb4a4, la texture claire du gravier le rendait plus blanc que les rangs)
const T_ORCH = versTeinte('#ccbe9f', '#a59c8c');         // stabilisé de l'orchestre
const T_SABLE = versTeinte('#c3a892', '#cdb48f');        // sable de la terrasse
const T_COUR = versTeinte('#ccbe9f', '#cdbf9f');         // sol sablé de la cour
const T_ENDUIT = versTeinte('#dfd9cb', '#e6e2d8');       // enduit blanc du bâtiment de service
// Le béton des gradins : taches lentes, dessus plus clairs (usés), contremarches un peu plus sombres, coulures sombres
// sous les nez par places (R5-T16 : « légères taches sombres »).
function teinteBeton(graine) {
  const c = [0, 0, 0];
  return (x, y, z, haut) => {
    const tache = 0.95 + 0.1 * bruit(x * 0.45 + 3.1, z * 0.45, graine) + 0.04 * (bruit(x * 2.3, z * 2.3 + y, graine + 1) - 0.5);
    const coul = haut ? 1.03 : 0.9 - 0.08 * Math.max(0, bruit((x + z) * 1.3, y * 0.5, graine + 2) - 0.55);
    const f = tache * coul;
    c[0] = T_GRADIN[0] * f; c[1] = T_GRADIN[1] * f; c[2] = T_GRADIN[2] * f;
    return c;
  };
}
// La patine d'une maçonnerie (moellons) : pied verdi et assombri, coulures et mousse sous le couronnement, taches lentes.
// `yPied`, `yHaut` : nombres ou fonctions (x, z).
function patine(base, yPied, yHaut, graine = 7) {
  const c = [0, 0, 0], P = typeof yPied === 'function' ? yPied : () => yPied, H = typeof yHaut === 'function' ? yHaut : () => yHaut;
  return (x, y, z) => {
    const h = y - P(x, z), d = H(x, z) - y;
    const tache = 0.95 + 0.09 * bruit(x * 0.5 + z * 0.5, y * 0.7, graine);
    const pied = 1 - 0.18 * Math.max(0, 1 - h / 0.8);
    const coulure = Math.max(0, bruit((x + z) * 2.1, 0.5, graine + 1) * 1.7 - 0.85) * Math.exp(-Math.max(0, d) / 1.2);
    const f = tache * pied * (1 - 0.32 * coulure);
    c[0] = base[0] * f * (1 - 0.06 * coulure); c[1] = base[1] * f; c[2] = base[2] * f * (1 - 0.1 * coulure);
    return c;
  };
}
const fixe = (t, f = 1) => [t[0] * f, t[1] * f, t[2] * f];

// LES PIÈCES DE GRADIN, dans un Lot du kit (repère du terrain 1 ; le Lot ajoute Monde.dx aux maillages).
const PAS_ARC = 0.45;                 // un sommet tous les 45 cm le long des arcs
// L'OCCLUSION DES ANGLES RENTRANTS (reprise du lot B10). Vu du haut des gradins (PV17, R5-T01) ou de l'orchestre
// (R5-T16), un rang ne se lit que par ses ombres douces : le fond du giron, au pied de la contremarche suivante, est
// plus sombre ; le nez, qui voit tout le ciel, plus clair ; la contremarche, verticale, s'assombrit vers son pied. Sans
// elles, tous les dessus ont la même teinte et les quinze rangs se fondent en un seul plan de béton, d'où ne dépassaient
// que les joues des dégagements, comme des dents. Facteurs [bord A, bord B] des couleurs de sommets.
const AO_NEZ = [1.05, 1.0];            // moitié avant d'un giron : du nez (A) au milieu (B)
const AO_FOND = [1.0, 0.8];            // moitié arrière : du milieu (A) au fond, contre la contremarche suivante (B)
const AO_GIRON = [1.05, 0.82];         // un giron d'une seule pièce (demi-marche, marche en avant)
const AO_CM = [0.8, 0.98];             // une contremarche : pied (A), tête (B)
const AO_MOELLON = [0.9, 1.0];         // un mur de moellons (soubassement, mur médian) : sa patine assombrit déjà le pied
// LE NEZ DES MARCHES. Vu du haut des gradins (PV17), la ligne de visée descend presque selon la pente des rangs (25°) :
// le nez de chaque rang cache tout son giron sauf une lisière de quelques centimètres derrière le nez du rang d'en
// dessous. Ce qu'on voit des quinze rangs, ce sont donc leurs nez, empilés ; l'occlusion du fond des girons n'y paraît
// pas. Le nez porte une arête usée et salie, plus sombre (4 cm) : d'en haut, chaque rang se lit comme un arc fin.
const NEZ = 0.04, F_NEZ = 0.72;
// Le DESSUS d'une travée de rang, entre les arcs Ra et Rb, à la hauteur y (UV projetées sur le sol) ; `ao` : facteurs
// de teinte sur l'arc Ra et sur l'arc Rb ; `nez` : vrai pour le giron d'un rang, dont la lisière de NEZ m côté Ra est
// sombre (F_NEZ)
function dessus(lot, cle, Ra, Rb, y, tr, couleur, tu, ao = null, nez = false) {
  if (nez) {
    // (l'angle d'un bord à la lisière : interpolé entre ceux des deux arcs, à 4 cm près le bord d'un dégagement est droit)
    const [ta0, ta1, tb0, tb1] = tr, k = NEZ / (Rb - Ra), Rn = Ra + NEZ, tn = [ta0 + (tb0 - ta0) * k, ta1 + (tb1 - ta1) * k];
    dessus(lot, cle, Ra, Rn, y, [ta0, ta1, tn[0], tn[1]], couleur, tu, [F_NEZ, F_NEZ]);
    dessus(lot, cle, Rn, Rb, y, [tn[0], tn[1], tb0, tb1], couleur, tu, ao);
    return;
  }
  const [ta0, ta1, tb0, tb1] = tr;
  const p = lot.part(cle), n = Math.max(1, Math.ceil((Math.max(Math.abs(ta1 - ta0) * Ra, Math.abs(tb1 - tb0) * Rb)) / PAS_ARC));
  const [fa, fb] = ao || [1, 1], ca = [0, 0, 0], cb = [0, 0, 0];
  const ombre = (c, f, out) => { out[0] = c[0] * f; out[1] = c[1] * f; out[2] = c[2] * f; return out; };
  let pa = -1, pb = -1;
  for (let i = 0; i <= n; i++) {
    const u = i / n, [xa, za] = PA(Ra, ta0 + (ta1 - ta0) * u), [xb, zb] = PA(Rb, tb0 + (tb1 - tb0) * u);
    const ia = lot.s(p, xa, y, za, 0, 1, 0, xa / tu, za / tu, ombre(couleur(xa, y, za, true), fa, ca));
    const ib = lot.s(p, xb, y, zb, 0, 1, 0, xb / tu, zb / tu, ombre(couleur(xb, y, zb, true), fb, cb));
    if (i) lot.quad(p, pa, pb, ib, ia);
    pa = ia; pb = ib;
  }
}
// Une CONTREMARCHE : la face verticale de l'arc R, de yb à yh, entre les angles t0 et t1, tournée vers le centre (vers
// l'extérieur avec `dos`). `yb` : un nombre, ou une fonction (x, z) quand le pied suit le sol (bord du palier, dos du
// dernier rang). `ao` : facteurs de teinte au pied et en tête (AO_CM par défaut).
function contremarche(lot, cle, R, yb, yh, t0, t1, couleur, tu, dos = false, ao = AO_CM) {
  if (Math.abs(t1 - t0) < 1e-5) return;
  const p = lot.part(cle), n = Math.max(1, Math.ceil((Math.abs(t1 - t0) * R) / PAS_ARC)), s = dos ? -1 : 1;
  const c0 = [0, 0, 0], c1 = [0, 0, 0], ombre = (c, f, out) => { out[0] = c[0] * f; out[1] = c[1] * f; out[2] = c[2] * f; return out; };
  let pb = -1, ph = -1;
  for (let i = 0; i <= n; i++) {
    const t = t0 + (t1 - t0) * (i / n), [x, z] = PA(R, t), nx = s * Math.cos(t), nz = -s * Math.sin(t), u = (R * t) / tu;
    const y0 = Math.min(typeof yb === 'function' ? yb(x, z) : yb, yh - 0.005);
    const ib = lot.s(p, x, y0, z, nx, 0, nz, u, y0 / tu, ombre(couleur(x, y0, z, false), ao[0], c0));
    const ih = lot.s(p, x, yh, z, nx, 0, nz, u, yh / tu, ombre(couleur(x, yh, z, false), ao[1], c1));
    if (i) lot.quad(p, pb, ib, ih, ph);
    pb = ib; ph = ih;
  }
}
// Un PAN VERTICAL de A à B ([x, z]), de yb à yh (nombres ou paires [yA, yB]), sa normale tournée vers le point `vers`
function pan(lot, cle, A, B, yb, yh, vers, couleur, tu) {
  const [ybA, ybB] = Array.isArray(yb) ? yb : [yb, yb], [yhA, yhB] = Array.isArray(yh) ? yh : [yh, yh];
  if (Math.max(yhA - ybA, yhB - ybB) < 0.005) return;
  const dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz) || 1;
  let nx = -dz / L, nz = dx / L;
  if ((vers[0] - A[0]) * nx + (vers[1] - A[1]) * nz < 0) { nx = -nx; nz = -nz; }
  const p = lot.part(cle), u0 = (A[0] + A[1]) / tu;
  const a = lot.s(p, A[0], ybA, A[1], nx, 0, nz, u0, ybA / tu, couleur(A[0], ybA, A[1], false));
  const b = lot.s(p, B[0], ybB, B[1], nx, 0, nz, u0 + L / tu, ybB / tu, couleur(B[0], ybB, B[1], false));
  const c = lot.s(p, B[0], yhB, B[1], nx, 0, nz, u0 + L / tu, yhB / tu, couleur(B[0], yhB, B[1], false));
  const d = lot.s(p, A[0], yhA, A[1], nx, 0, nz, u0, yhA / tu, couleur(A[0], yhA, A[1], false));
  lot.quad(p, a, b, c, d);
}
// Une BOÎTE posée le long du segment A -> B ([x, z]) : longueur |AB| (+ `ral` de chaque bout), épaisseur `ep` (centrée
// sur la ligne, décalée de `dec` vers sa droite), de yb à yh. UV en tuiles dans le repère de la boîte (une pierre garde
// sa vraie taille quel que soit le biais du mur).
// (relecture du lot B10) La « peinture » du kit n'est pas une matière qu'on répète : c'est un ATLAS (la bande de peinture,
// u de 0,06 à 0,44, puis les cases du verre, des plaques « 156 », des pictogrammes, du bronze). Projetées en tuiles d'un
// mètre, ses boîtes montraient tout l'atlas : le portail de tôle du service, deux plaques « 156 » et des chiens barrés ;
// les portes des coulisses, les projecteurs, le panneau, des morceaux de plaques. Une boîte de peinture reste donc dans
// la bande (`bande`, comme les barres et les tours du kit).
const enBande = (cle, o) => o.bande ?? cle.split('#')[0] === 'peinture';
function boiteLe(lot, cle, A, B, ep, yb, yh, o = {}) {
  const dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux, dec = o.dec || 0;
  const cx = (A[0] + B[0]) / 2 + nx * dec, cz = (A[1] + B[1]) / 2 + nz * dec;
  const m = new THREE.Matrix4().set(ux, 0, nx, cx, 0, 1, 0, (yb + yh) / 2, uz, 0, nz, cz, 0, 0, 0, 1);
  lot.boite(cle, L + 2 * (o.ral || 0), yh - yb, ep, m, { couleur: o.couleur, chanfrein: o.chanfrein || 0, uvDecal: o.uvDecal, bande: enBande(cle, o) });
}
// Une boîte d'aplomb, centrée en (x, z), tournée de `a` (rad, de x+ vers z+), w le long de l'axe tourné, d en travers
function boiteEn(lot, cle, x, z, a, w, d, yb, yh, o = {}) {
  const c = Math.cos(a), s = Math.sin(a);
  const m = new THREE.Matrix4().set(c, 0, -s, x, 0, 1, 0, (yb + yh) / 2, s, 0, c, z, 0, 0, 0, 1);
  lot.boite(cle, w, yh - yb, d, m, { couleur: o.couleur, chanfrein: o.chanfrein || 0, uvDecal: o.uvDecal, bande: enBande(cle, o) });
}
// UNE VOLÉE DU KIT, avancée d'un demi-giron vers le bas (comme js/parc/zones/z06_axe_chateau.js et z12_placette.js) :
// le nez de chaque marche tombe sur le plan incliné du sol des données, le giron entier est au-dessus.
// (lot C6 : un générateur — `yield* volee(kit, v, o, ctx.budget)` —, la volée faite en tranches : kit.escalierPas)
function volee(kit, v, o = {}, budget = () => false) {
  const [x0, z0, y0] = v.de, [x1, z1, y1] = v.a, L = Math.hypot(x1 - x0, z1 - z0), g = L / v.marches;
  const bas = y0 <= y1 ? 1 : -1, ux = ((x1 - x0) / L) * bas, uz = ((z1 - z0) / L) * bas, k = g / 2;
  return kit.escalierPas({
    de: [x0 - ux * k, z0 - uz * k, y0 + 0.01], a: [x1 - ux * k, z1 - uz * k, y1 + 0.01],
    marches: v.marches, largeur: o.largeur ?? v.largeur, limon: o.limon ?? true, mainCourante: o.mainCourante, materiau: o.materiau || 'taille', usure: o.usure ?? 0.5,
  }, budget);
}
// Les maillages d'un Lot, ses cartes détourées (graminées) déclarées comme du feuillage (voir outilsB2, js/parc/zones/
// z04_butte_pin.js)
function maillagesLot(lot, nom) {
  const g = lot.maillages(nom);
  for (const m of g.children) if (m.material && m.material.alphaTest > 0) { m.castShadow = false; m.userData.feuillage = true; }
  return g;
}

// ============================================================================================ 1. LES GRADINS (Z09a)
// Le béton des rangs est dessiné à leurs hauteurs exactes (celles des gabarits « gradins », où le sol des données est
// plat rang par rang) : les dessus à 2 cm au-dessus, les contremarches pile sur les rayons où le sol change de nappe.
// Le maillage du sol y dessine des marches crénelées par sa trame de 0,5 m (des jupes verticales entre deux rangs) :
// elles tombent toutes DERRIÈRE nos contremarches et SOUS nos dessus.
const DY = 0.02;
// La travée d'un dégagement entre les arcs Ra et Rb, et un point de son bord (s = -1 : côté z-, +1 : côté z+)
function travee(c, Ra, Rb) { const da = demiAngle(Ra, c.w), db = demiAngle(Rb, c.w); return [c.t - da, c.t + da, c.t - db, c.t + db]; }
const bord = (c, R, s) => PA(R, c.t + s * demiAngle(R, c.w));
// UNE DEMI-MARCHE de dégagement dans un rang (R5-T16 : deux demi-marches par rang) : entre Ra et Rm, la moitié avant du
// rang est abaissée d'une demi-hauteur ; ses deux contremarches, et les deux joues de l'entaille dans le rang. `L` :
// { d : le Lot des dessus, f : celui des faces }.
function demiMarche(L, c, Ra, Rm, yPrec, y, h, cB, tu) {
  const ym = y - h / 2;
  dessus(L.d, MAT_G + '#sol', Ra, Rm, ym + DY, travee(c, Ra, Rm), cB, tu, AO_GIRON, true);
  const tr = travee(c, Ra, Ra), tm = travee(c, Rm, Rm);
  contremarche(L.f, MAT_G, Ra, yPrec, ym + DY, tr[0], tr[1], cB, tu);
  contremarche(L.f, MAT_G, Rm, ym, y + DY, tm[0], tm[1], cB, tu);
  // (les joues de l'entaille, dans l'ombre du rang : plus sombres, pour que le dégagement se lise d'en haut)
  const vers = PA((Ra + Rm) / 2, c.t), cJ = (x, yy, z) => fixe(cB(x, yy, z, false), 0.78);
  for (const s of [-1, 1]) pan(L.f, MAT_G, bord(c, Ra, s), bord(c, Rm, s), ym, y + DY, vers, cJ, tu);
}
// LES MARCHES EN AVANT d'un dégagement (devant le soubassement, devant le mur médian) : un petit massif de béton posé sur
// le sol bas (yBase), une marche par intervalle de `Rs`, aux hauteurs `ys` ; ses flancs descendent jusqu'au sol.
function marchesEnAvant(L, c, Rs, ys, yBase, cB, tu) {
  for (let i = 0; i < ys.length; i++) {
    const Ra = Rs[i], Rb = Rs[i + 1], y = ys[i], yPrec = i ? ys[i - 1] : yBase - 0.05;
    dessus(L.d, MAT_G + '#sol', Ra, Rb, y + DY, travee(c, Ra, Rb), cB, tu, AO_GIRON, true);
    const tr = travee(c, Ra, Ra);
    contremarche(L.f, MAT_G, Ra, yPrec, y + DY, tr[0], tr[1], cB, tu);
    for (const s of [-1, 1]) pan(L.f, MAT_G, bord(c, Ra, s), bord(c, Rb, s), yBase - 0.05, y + DY, PA((Ra + Rb) / 2, c.t + s * 0.5), cB, tu);
  }
}
// UNE PILE-JARDINIÈRE (R5-T16 : 0,45 x 0,45 x 0,7 m, plantée) au flanc d'un dégagement : au rayon R, à `off` m de son
// axe (le long de l'arc), du sol yb à yh ; les touffes vertes vont dans `feu`.
// (relecture du lot B10, la photo Commons de 2022 vue en grand) Ce n'est pas un pilier de brique rouge : c'est un petit
// massif des MÊMES blocs calcaires jaune pâle que le soubassement, en DEUX GRADINS (devant, bas, côté orchestre ;
// derrière, à hauteur du rang qu'il flanque), chaque gradin creusé d'un bac planté et couronné d'un rang de briques
// rouge sombre posées de chant. La brique n'est que ce liseré ; toute rouge, la pile ressortait comme quatre bornes.
function jardiniere(lot, feu, c, R, off, yb, yh) {
  const [x0, z0] = PA(R, c.t), tx = Math.sin(c.t), tz = Math.cos(c.t), rx = -Math.cos(c.t), rz = Math.sin(c.t), a = Math.atan2(tz, tx);
  const coul = (xx, yy, zz) => { const f = 0.85 + 0.2 * alea(Math.floor(xx * 9), Math.floor(yy * 14 + zz * 9), 501); return [T_BRIQUE[0] * f, T_BRIQUE[1] * f, T_BRIQUE[2] * f]; };
  const cPierre = patine(T_MOELLON, yb, yh, 503);
  // [décalage radial (vers les gradins), profondeur, dessus]
  for (const [dr, prof, yt] of [[-0.125, 0.25, yb + 0.45 * (yh - yb)], [0.125, 0.25, yh]]) {
    const x = x0 + tx * off + rx * dr, z = z0 + tz * off + rz * dr;
    boiteEn(lot, 'moellons', x, z, a, 0.45, prof, yb, yt - 0.07, { couleur: cPierre, chanfrein: 0.01 });
    boiteEn(lot, 'brique', x, z, a, 0.46, prof + 0.01, yt - 0.075, yt, { couleur: coul, chanfrein: 0.006 });
    petitArbuste(feu, { x, z, y0: yt - 0.05, h: dr < 0 ? 0.22 : 0.34, R: dr < 0 ? 0.16 : 0.2, pal: alea(x, z, 502) < 0.5 ? 'moyen' : 'laurierCerise' });
  }
}

function* gradins(ctx) {
  const { kit, groupe } = ctx;
  const tuB = kit.TUILES[MAT_G], tuM = kit.TUILES.moellons;
  const L = { d: new kit.Lot('gradins · dessus'), f: new kit.Lot('gradins · faces') };
  const cB = teinteBeton(31), cBf = teinteBeton(37);
  const cSoub = patine(T_MOELLON, Y_ORCH, BAS.y1, 33), cMed = patine(T_MOELLON, PALIER.y, HAUT.y1, 35);
  // ---- LE BLOC BAS : 5 rangs. Le dessus du rang 1 est la tablette du soubassement ; la moitié avant des rangs 2 à 5 est
  // entaillée aux deux dégagements.
  for (let k = 1; k <= BAS.n; k++) {
    const Ra = BAS.r0 + (k - 1) * BAS.p, Rm = Ra + BAS.p / 2, Rb = Ra + BAS.p, y = yRang(BAS, k), yPrec = k === 1 ? Y_ORCH : yRang(BAS, k - 1);
    for (const tr of travees(Ra, Rm, k === 1 ? [] : DEG_BAS)) dessus(L.d, MAT_G + '#sol', Ra, Rm, y + DY, tr, cB, tuB, AO_NEZ, true);
    for (const tr of travees(Rm, Rb, [])) dessus(L.d, MAT_G + '#sol', Rm, Rb, y + DY, tr, cB, tuB, AO_FOND);
    for (const tr of travees(Ra, Ra, DEG_BAS)) {
      if (k === 1) contremarche(L.f, 'moellons', Ra, Y_ORCH - 0.1, y + DY, tr[0], tr[1], cSoub, tuM, false, AO_MOELLON);
      else contremarche(L.f, MAT_G, Ra, yPrec, y + DY, tr[0], tr[1], cBf, tuB);
    }
    if (k > 1) for (const c of DEG_BAS) demiMarche(L, c, Ra, Rm, yPrec, y, BAS.h, cB, tuB);
    if (ctx.budget()) yield;
  }
  // les marches des deux dégagements, en avant du soubassement : de l'orchestre (-2,2) au rang 1 (-1,5), trois marches
  // de 0,233 (deux en avant, la troisième dans le soubassement)
  for (const c of DEG_BAS) {
    marchesEnAvant(L, c, [18.9, 19.2, 19.5], [-1.967, -1.733], Y_ORCH, cB, tuB);
    const tr = travee(c, BAS.r0, BAS.r0);
    contremarche(L.f, MAT_G, BAS.r0, -1.733, BAS.y1 + DY, tr[0], tr[1], cBf, tuB);
  }
  // ---- LE PALIER (+0,7) : un anneau de 24 à 26 m, jusqu'à z 149 (le palier de l'escalier latéral) ; une demi-marche
  // de plus aux deux dégagements du bas, sur ses 45 premiers centimètres
  const yBas5 = yRang(BAS, BAS.n), Rp = PALIER.r0 + 0.45;
  for (const tr of travees(PALIER.r0, Rp, DEG_BAS, PALIER.z0, Z1)) dessus(L.d, MAT_G + '#sol', PALIER.r0, Rp, PALIER.y + DY, tr, cB, tuB, AO_NEZ, true);
  for (const tr of travees(Rp, PALIER.r1, [], PALIER.z0, Z1)) dessus(L.d, MAT_G + '#sol', Rp, PALIER.r1, PALIER.y + DY, tr, cB, tuB, AO_FOND);
  for (const tr of travees(PALIER.r0, PALIER.r0, DEG_BAS)) contremarche(L.f, MAT_G, PALIER.r0, yBas5, PALIER.y + DY, tr[0], tr[1], cBf, tuB);
  for (const c of DEG_BAS) demiMarche(L, c, PALIER.r0, Rp, yBas5, PALIER.y, BAS.h, cB, tuB);
  // (au-delà du bout z- du bloc bas, le bord du palier tombe sur le terrain)
  contremarche(L.f, MAT_G, PALIER.r0, (x, z) => kit.sol(x + 0.35, z) - 0.12, PALIER.y + DY, tBout(PALIER.r0, PALIER.z0), tBout(PALIER.r0, Z0), cBf, tuB);
  if (ctx.budget()) yield;
  // ---- LE BLOC HAUT : 10 rangs ; le mur médian de moellons sous le rang 1 ; le dégagement central
  for (let k = 1; k <= HAUT.n; k++) {
    const Ra = HAUT.r0 + (k - 1) * HAUT.p, Rm = Ra + HAUT.p / 2, Rb = Ra + HAUT.p, y = yRang(HAUT, k), yPrec = k === 1 ? PALIER.y : yRang(HAUT, k - 1);
    for (const tr of travees(Ra, Rm, DEG_HAUT)) dessus(L.d, MAT_G + '#sol', Ra, Rm, y + DY, tr, cB, tuB, AO_NEZ, true);
    for (const tr of travees(Rm, Rb, [])) dessus(L.d, MAT_G + '#sol', Rm, Rb, y + DY, tr, cB, tuB, AO_FOND);
    for (const tr of travees(Ra, Ra, DEG_HAUT)) {
      if (k === 1) contremarche(L.f, 'moellons', Ra, PALIER.y - 0.03, y + DY, tr[0], tr[1], cMed, tuM, false, AO_MOELLON);
      else contremarche(L.f, MAT_G, Ra, yPrec, y + DY, tr[0], tr[1], cBf, tuB);
    }
    for (const c of DEG_HAUT) demiMarche(L, c, Ra, Rm, k === 1 ? 1.1 : yPrec, y, HAUT.h, cB, tuB);
    if (ctx.budget()) yield;
  }
  // les deux marches du dégagement central en avant du mur médian, sur le palier (de +0,7 à +1,1)
  for (const c of DEG_HAUT) marchesEnAvant(L, c, [25.3, 25.65, 26.0], [0.9, 1.1], PALIER.y, cB, tuB);
  // le dos du dernier rang, au bord de la terrasse de sable
  const RH = HAUT.r0 + HAUT.n * HAUT.p, yH = yRang(HAUT, HAUT.n);
  contremarche(L.f, MAT_G, RH, (x, z) => kit.sol(x - 0.4, z) - 0.12, yH + DY, tBout(RH, Z0), tBout(RH, Z1), cBf, tuB, true, [0.8, 0.95]);
  // ---- LES JOUES : les bouts des rangs et du palier, coupés net sur z = 150,4 et z = 171, jusqu'au sol de part et d'autre
  const joue = (Ra, Rb, y, yPrec, zb, s) => {
    const A = [xArc(Ra, zb), zb], B = [xArc(Rb, zb), zb];
    const yb = (p) => Math.min(kit.sol(p[0], zb + s * 0.35), yPrec) - 0.12;
    pan(L.f, MAT_G, A, B, [yb(A), yb(B)], y + DY, [A[0], zb + s], cBf, tuB);
  };
  for (const [zb, s] of [[Z0, -1], [Z1, 1]]) {
    for (let k = 1; k <= BAS.n; k++) joue(BAS.r0 + (k - 1) * BAS.p, BAS.r0 + k * BAS.p, yRang(BAS, k), k === 1 ? Y_ORCH : yRang(BAS, k - 1), zb, s);
    for (let k = 1; k <= HAUT.n; k++) joue(HAUT.r0 + (k - 1) * HAUT.p, HAUT.r0 + k * HAUT.p, yRang(HAUT, k), k === 1 ? PALIER.y : yRang(HAUT, k - 1), zb, s);
  }
  joue(PALIER.r0, PALIER.r1, PALIER.y, yBas5, Z1, 1);
  joue(PALIER.r0, PALIER.r1, PALIER.y, yBas5, PALIER.z0, -1);
  if (ctx.budget()) yield;
  groupe.add(aPlat(L.d.maillages('gradins · dessus')));
  groupe.add(L.f.maillages('gradins · contremarches et joues'));
  if (ctx.budget()) yield;
  // ---- LES PILES-JARDINIÈRES de brique : deux au pied de chaque dégagement du bas (sur l'orchestre, contre le
  // soubassement), deux de part et d'autre de celui du mur médian (sur le palier)
  const br = new kit.Lot('gradins · jardinières'), feu = new Touffes();
  for (const c of DEG_BAS) for (const s of [-1, 1]) jardiniere(br, feu, c, 19.18, s * (c.w / 2 + 0.31), Y_ORCH - 0.05, BAS.y1);
  for (const c of DEG_HAUT) for (const s of [-1, 1]) jardiniere(br, feu, c, 25.55, s * (c.w / 2 + 0.31), PALIER.y - 0.03, HAUT.y1);
  groupe.add(br.maillages('gradins · jardinières'));
  const mf = maillageFeuillage(feu, ctx.K, 'gradins · touffes des jardinières', true);
  if (mf) groupe.add(mf);
  if (ctx.budget()) yield;
  // ---- L'ESCALIER LATÉRAL (flanc z-) : marches de pierre grises du palier à la terrasse, entre deux limons
  groupe.add(yield* volee(kit, ESC_LAT, { materiau: 'beton', limon: true, usure: 0.4 }, ctx.budget));
  yield;
}
// La silhouette des gradins (au loin : du belvédère, de la rampe ouest) : chaque rang en une bande grossière et sa
// contremarche, le palier ; moins de 1 500 triangles, un seul matériau.
function* silhouetteGradins(ctx) {
  const { kit, groupe } = ctx, lot = new kit.Lot('gradins (silhouette)'), c = (x, y, z, haut) => fixe(T_GRADIN, haut ? 1.02 : 0.88), tu = kit.TUILES[MAT_G];
  const rangs = [];
  for (let k = 1; k <= BAS.n; k++) rangs.push([BAS.r0 + (k - 1) * BAS.p, BAS.r0 + k * BAS.p, yRang(BAS, k), k === 1 ? Y_ORCH : yRang(BAS, k - 1)]);
  rangs.push([PALIER.r0, PALIER.r1, PALIER.y, yRang(BAS, BAS.n)]);
  for (let k = 1; k <= HAUT.n; k++) rangs.push([HAUT.r0 + (k - 1) * HAUT.p, HAUT.r0 + k * HAUT.p, yRang(HAUT, k), k === 1 ? PALIER.y : yRang(HAUT, k - 1)]);
  // (des arcs à six segments par travée, au lieu d'un sommet tous les 45 cm)
  for (const [Ra, Rb, y, yp] of rangs) {
    const tr = travees(Ra, Rb, []);
    for (const t of tr) {
      const n = 6, p = lot.part(MAT_G), iA = [], iB = [], iH = [], iL = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, [xa, za] = PA(Ra, t[0] + (t[1] - t[0]) * u), [xb, zb] = PA(Rb, t[2] + (t[3] - t[2]) * u), ta = t[0] + (t[1] - t[0]) * u;
        iA.push(lot.s(p, xa, y + DY, za, 0, 1, 0, xa / tu, za / tu, c(0, 0, 0, true)));
        iB.push(lot.s(p, xb, y + DY, zb, 0, 1, 0, xb / tu, zb / tu, c(0, 0, 0, true)));
        iL.push(lot.s(p, xa, yp, za, Math.cos(ta), 0, -Math.sin(ta), 0, 0, c(0, 0, 0, false)));
        iH.push(lot.s(p, xa, y + DY, za, Math.cos(ta), 0, -Math.sin(ta), 0, 1, c(0, 0, 0, false)));
      }
      for (let i = 0; i < n; i++) { lot.quad(p, iA[i], iB[i], iB[i + 1], iA[i + 1]); lot.quad(p, iL[i], iL[i + 1], iH[i + 1], iH[i]); }
    }
  }
  groupe.add(lot.maillages('gradins (silhouette)'));
  yield;
}

// ============================================================================================ 2. L'ORCHESTRE ET LA SCÈNE (Z09b)
// Le contour de l'orchestre (gabarit orchestre_theatre) : jusqu'aux murs de l'orchestre (x -12,1), et entre les deux
// retours du mur en redans jusqu'au diamètre de la scène (x -10).
const ORCH_POLY = [[-21.0, 150.4], [-12.1, 150.4], [-12.1, 153.7], [-10.0, 153.7], [-10.0, 166.9], [-12.1, 166.9], [-12.1, 172.9], [-21.0, 172.9]];
function dansOrch(x, z) {
  let d = false;
  for (let i = 0, j = ORCH_POLY.length - 1; i < ORCH_POLY.length; j = i++) {
    const [xi, zi] = ORCH_POLY[i], [xj, zj] = ORCH_POLY[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) d = !d;
  }
  return d;
}
const rC = (x, z) => Math.hypot(x - C.x, z - C.z);
const rS = (x, z) => Math.hypot(x - S.x, z - S.z);
// Les bandes rayonnantes (R5-T01, T16 : cinq bandes de pierre claire de 0,4 m qui partent de la scène) : leurs angles
// autour du centre de la scène (degrés : 180 = l'axe, vers les gradins)
const BANDES = [180, 155, 205, 130, 230];
// Les deux petits projecteurs carrés posés au pied du premier rang, de part et d'autre de l'axe (R5-T01)
const PROJECTEURS = [-0.04, 0.04];

// Le sol de l'orchestre : une trame plate à -2,18 (le plan des données est plat), par cases de 0,5 m calées sur celles du
// sol ; une case n'est dessinée que si une part d'elle est hors de la scène et au pied des gradins (ce qui déborde
// passe sous la scène et sous le soubassement, qui le cachent). Pas sous l'escalier d'entrée.
function solOrchestre(kit, lot) {
  const p = lot.part('gravier#sol'), tu = kit.TUILES.gravier, y = Y_ORCH + 0.02, c = [0, 0, 0], pas = 0.5;
  const X0 = -24.7 + Math.floor((-21.0 + 24.7) / pas) * pas, Z0c = -16 + Math.floor((150.4 + 16) / pas) * pas;
  for (let z = Z0c; z < 172.9; z += pas) {
    for (let x = X0; x < -10.0; x += pas) {
      const cx = x + pas / 2, cz = z + pas / 2;
      const coins = [[x, z], [x + pas, z], [x + pas, z + pas], [x, z + pas]];
      // (une case à cheval sur le bord est gardée : ce qui dépasse passe sous le mur bas ou sous le sol, plus haut)
      if (!dansOrch(cx, cz) && !coins.some(([a, b]) => dansOrch(a + Math.sign(cx - a) * 0.05, b + Math.sign(cz - b) * 0.05))) continue;
      if (coins.every(([a, b]) => rS(a, b) < S.r - 0.05 && a <= S.x + 0.01)) continue;
      if (coins.every(([a, b]) => rC(a, b) > BAS.r0 + 0.05)) continue;
      if (cx > ESC_ORCH.de[0] - ESC_ORCH.largeur / 2 && cx < ESC_ORCH.de[0] + ESC_ORCH.largeur / 2 && cz < ESC_ORCH.a[1]) continue;
      const id = coins.map(([a, b]) => {
        const f = (0.93 + 0.1 * bruit(a / 3.2, b / 3.2, 511)) * (0.97 + 0.05 * bruit(a * 1.3, b * 1.3, 512));
        c[0] = T_ORCH[0] * f; c[1] = T_ORCH[1] * f; c[2] = T_ORCH[2] * f;
        return lot.s(p, a, y, b, 0, 1, 0, a / tu, b / tu, c);
      });
      lot.quad(p, id[0], id[1], id[2], id[3]);
    }
  }
}
// Une bande rayonnante : du bord de la scène (rayon 4,9) au pied des gradins (rayon 19,45 autour de C), 0,4 m de large
function bandeRayonnante(kit, lot, deg) {
  const a = rad(deg), dx = Math.cos(a), dz = Math.sin(a), tu = kit.TUILES.taille, p = lot.part('taille#sol');
  // (fin : la rencontre du rayon et du pied des gradins, |S + r·d - C| = 19,45)
  const ox = S.x - C.x, oz = S.z - C.z, b = ox * dx + oz * dz, r1 = -b + Math.sqrt(b * b - (ox * ox + oz * oz - 19.45 * 19.45));
  const r0 = S.r + 0.1, n = Math.max(2, Math.ceil((r1 - r0) / 1.0)), nx = -dz, nz = dx, y = Y_ORCH + 0.035, c = [0, 0, 0];
  let pa = -1, pb = -1;
  for (let i = 0; i <= n; i++) {
    const r = r0 + ((r1 - r0) * i) / n, x = S.x + dx * r, z = S.z + dz * r;
    const f = 0.92 + 0.12 * alea(Math.floor(r / 0.6), deg, 521);                    // (des pierres de 60 cm, une à une)
    c[0] = T_BANDE[0] * f; c[1] = T_BANDE[1] * f; c[2] = T_BANDE[2] * f;
    const ia = lot.s(p, x + nx * 0.2, y, z + nz * 0.2, 0, 1, 0, (x + nx * 0.2) / tu, (z + nz * 0.2) / tu, c);
    const ib = lot.s(p, x - nx * 0.2, y, z - nz * 0.2, 0, 1, 0, (x - nx * 0.2) / tu, (z - nz * 0.2) / tu, c);
    if (i) lot.quad(p, pa, pb, ib, ia);
    pa = ia; pb = ib;
  }
}

// LE DALLAGE DE LA SCÈNE (R5-T02 : « grandes dalles irrégulières, beige gris clair, joints fins » ; T07 : brun rosé au
// soleil) : des anneaux de dalles autour du centre de la scène, coupés à des angles tirés au hasard de position, chaque
// dalle un peu rentrée (le joint, 3 cm, laisse voir un fond plus sombre), un peu plus haute ou plus basse, plus grise ou
// plus rose que sa voisine. Devant le diamètre, jusqu'à la tablette (4,5 m) ; derrière, jusque sous le mur.
const ANNEAUX_AV = [0.35, 1.05, 1.8, 2.55, 3.3, 4.05, 4.52];
const ANNEAUX_AR = [4.52, 5.2, 5.95];
// (quelques dalles plus brunes ou plus roses, peu nombreuses et proches du fond : vu des gradins, le plateau se lit
// comme une seule pierre beige gris, pas comme une rose des vents bariolée)
const T_DALLE_BRUN = versTeinte('#dfd9cb', '#b6a998'), T_DALLE_ROSE = versTeinte('#dfd9cb', '#c9b5a0');
function dallage(kit, lot) {
  const p = lot.part('taille#sol'), tu = kit.TUILES.taille, c = [0, 0, 0], joint = 0.028;
  // le fond des joints : un éventail sombre sous tout le plateau
  const fond = [], yF = S.y + 0.012, cf = fixe(T_DALLE, 0.62);
  for (let i = 0; i <= 24; i++) { const a = rad(90 + (180 * i) / 24); fond.push([S.x + 4.55 * Math.cos(a), S.z + 4.55 * Math.sin(a)]); }
  for (let i = 0; i <= 24; i++) { const a = rad(-90 + (180 * i) / 24); fond.push([S.x + 5.95 * Math.cos(a), S.z + 5.95 * Math.sin(a)]); }
  const ic = lot.s(p, S.x, yF, S.z, 0, 1, 0, S.x / tu, S.z / tu, cf), idf = fond.map(([x, z]) => lot.s(p, x, yF, z, 0, 1, 0, x / tu, z / tu, cf));
  for (let i = 0; i < idf.length; i++) lot.tri(p, ic, idf[i], idf[(i + 1) % idf.length]);
  // une dalle : le secteur [ra, rb] x [a0, a1], rentré du demi-joint
  const dalle = (ra, rb, a0, a1, k) => {
    const h = S.y + 0.024 + 0.006 * (alea(ra, a0, 531) - 0.5), u = alea(a0 * 7, rb, 532), f = 0.88 + 0.15 * alea(rb, a1 * 5, 533);
    const T = u < 0.1 ? T_DALLE_BRUN : u < 0.2 ? T_DALLE_ROSE : T_DALLE;
    c[0] = T[0] * f; c[1] = T[1] * f; c[2] = T[2] * f;
    const ri = ra + joint / 2, re = rb - joint / 2, da0 = a0 + joint / 2 / Math.max(ri, 0.3), da1 = a1 - joint / 2 / Math.max(ri, 0.3);
    if (re - ri < 0.05 || da1 <= da0) return;
    const n = Math.max(1, Math.ceil(((da1 - da0) * re) / 0.35)), id = [];
    for (let i = 0; i <= n; i++) { const a = da0 + ((da1 - da0) * i) / n, x = S.x + re * Math.cos(a), z = S.z + re * Math.sin(a); id.push(lot.s(p, x, h, z, 0, 1, 0, x / tu + k, z / tu, c)); }
    for (let i = n; i >= 0; i--) { const a = da0 + ((da1 - da0) * i) / n, x = S.x + ri * Math.cos(a), z = S.z + ri * Math.sin(a); id.push(lot.s(p, x, h, z, 0, 1, 0, x / tu + k, z / tu, c)); }
    for (let i = 0; i < n; i++) lot.quad(p, id[i], id[i + 1], id[2 * n + 1 - i - 1], id[2 * n + 1 - i]);
  };
  // la dalle ronde du centre
  { const n = 16, h = S.y + 0.026, id = [], cc = fixe(T_DALLE, 0.97), mid = lot.s(p, S.x, h, S.z, 0, 1, 0, S.x / tu, S.z / tu, cc);
    for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n, x = S.x + (0.35 - joint / 2) * Math.cos(a), z = S.z + (0.35 - joint / 2) * Math.sin(a); id.push(lot.s(p, x, h, z, 0, 1, 0, x / tu, z / tu, cc)); }
    for (let i = 0; i < n; i++) lot.tri(p, mid, id[i], id[(i + 1) % n]); }
  const anneau = (R, a0, a1, g) => {
    for (let k = 0; k + 1 < R.length; k++) {
      const ra = R[k], rb = R[k + 1], rm = (ra + rb) / 2, n = Math.max(2, Math.round(((a1 - a0) * rm) / 0.85));
      const cuts = [a0];
      for (let j = 1; j < n; j++) cuts.push(a0 + ((a1 - a0) * (j + 0.6 * (alea(j, ra + g, 534) - 0.5))) / n);
      cuts.push(a1);
      for (let j = 0; j + 1 < cuts.length; j++) {
        // (un joint radial sur deux est coupé par une dalle à cheval sur deux anneaux : l'appareil ne fait pas de croix)
        dalle(ra + 0.03 * (alea(j, rb, 535) - 0.5), rb + 0.03 * (alea(rb, j, 536) - 0.5), cuts[j], cuts[j + 1], alea(j, k + g, 537) * 3);
      }
    }
  };
  anneau(ANNEAUX_AV, rad(90), rad(270), 1);
  anneau(ANNEAUX_AV, rad(-90), rad(90), 2);
  anneau(ANNEAUX_AR, rad(-90), rad(90), 3);
}
// La contremarche de la scène (moellons, R5-T02 : 0,7 à 0,9 m) et sa tablette de pierre de taille, sur le demi-cercle
function bordScene(kit, murs) {
  const tuM = kit.TUILES.moellons, tuT = kit.TUILES.taille, pM = murs.part('moellons'), pT = murs.part('taille');
  const cM = patine(versTeinte('#d6cdb9', '#cbbfa5'), Y_ORCH, S.y, 541), cT = (x, y, z) => fixe(T_TAILLE, 0.93 + 0.08 * alea(Math.floor(x * 2), Math.floor(z * 2), 542));
  const n = 48, r = S.r, rt = S.r + 0.06, yb = Y_ORCH - 0.08, ym = S.y - 0.1, yt = S.y + 0.035;
  let a0 = -1, a1 = -1, b0 = -1, b1 = -1, c0 = -1, c1 = -1;
  for (let i = 0; i <= n; i++) {
    const a = rad(90 + (180 * i) / n), ca = Math.cos(a), sa = Math.sin(a), s = (r * a) / tuM;
    const x = S.x + r * ca, z = S.z + r * sa, xt = S.x + rt * ca, zt = S.z + rt * sa, xi = S.x + (r - 0.3) * ca, zi = S.z + (r - 0.3) * sa;
    const A0 = murs.s(pM, x, yb, z, ca, 0, sa, s, yb / tuM, cM(x, yb, z)), A1 = murs.s(pM, x, ym, z, ca, 0, sa, s, ym / tuM, cM(x, ym, z));
    // la tablette : face avant (en saillie de 6 cm), dessus
    const B0 = murs.s(pT, xt, ym - 0.02, zt, ca, 0, sa, (rt * a) / tuT, 0, cT(xt, ym, zt)), B1 = murs.s(pT, xt, yt, zt, ca, 0, sa, (rt * a) / tuT, 0.07, cT(xt, yt, zt));
    const C0 = murs.s(pT, xt, yt, zt, 0, 1, 0, xt / tuT, zt / tuT, cT(xt, yt, zt)), C1 = murs.s(pT, xi, yt, zi, 0, 1, 0, xi / tuT, zi / tuT, cT(xi, yt, zi));
    if (i) { murs.quad(pM, a0, A0, A1, a1); murs.quad(pT, b0, B0, B1, b1); murs.quad(pT, c0, C0, C1, c1); }
    a0 = A0; a1 = A1; b0 = B0; b1 = B1; c0 = C0; c1 = C1;
  }
}

// LE MUR EN REDANS. Les pans sont des boîtes de moellons d'un sommet à l'autre (les bouts noyés dans les piles), sous un
// couronnement de pierre de taille ; les piles, des boîtes plus hautes, posées en travers de l'angle et avancées vers la
// scène (saillie de 0,5 m sur les pans, R5 : 0,4 à 0,6). Le pan axial est percé de la NICHE (voir niche).
function tangente(i) {
  const P = REDANS[i].p, A = REDANS[Math.max(0, i - 1)].p, B = REDANS[Math.min(REDANS.length - 1, i + 1)].p;
  let tx = 0, tz = 0;
  if (i > 0) { const l = Math.hypot(P[0] - A[0], P[1] - A[1]); tx += (P[0] - A[0]) / l; tz += (P[1] - A[1]) / l; }
  if (i < REDANS.length - 1) { const l = Math.hypot(B[0] - P[0], B[1] - P[1]); tx += (B[0] - P[0]) / l; tz += (B[1] - P[1]) / l; }
  const l = Math.hypot(tx, tz) || 1;
  return [tx / l, tz / l];
}
// la normale d'un sommet tournée vers la scène (ou, pour les têtes, vers l'escalier de la scène qui les longe)
function versScene(i) {
  const [tx, tz] = tangente(i), P = REDANS[i].p;
  let nx = -tz, nz = tx;
  const cible = i === 0 || i === REDANS.length - 1 ? [-11.0, S.z] : [S.x, S.z];
  if ((cible[0] - P[0]) * nx + (cible[1] - P[1]) * nz < 0) { nx = -nx; nz = -nz; }
  return [nx, nz];
}
function piedPan(i) { return Math.max(REDANS[i].pied, REDANS[i + 1].pied) - 0.05; }
// LA NICHE du pan axial (R5-T01, T02, T07 ; vue de T01 en grand) : un renfoncement cintré de 2 m de large, haut de 2,55 m
// au-dessus de la scène, creusé de 0,3 m dans le pan ; à son pied, un gradin demi-circulaire de pierre en deux degrés.
// Le pan est une forme extrudée (son contour porte l'encoche de la niche) devant une boîte mince (le fond de la niche).
const NICHE = { l: 2.0, h: 1.55, prof: 0.3 };
function panAxial(kit, murs, i) {
  const A = REDANS[i].p, B = REDANS[i + 1].p, pied = piedPan(i), haut = REDANS[i].haut, H = haut - pied;
  const dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  // la normale du pan vers la scène, la même pour tout le pan (le pan axial est droit)
  let px = -uz, pz = ux;
  if ((S.x - A[0]) * px + (S.z - A[1]) * pz < 0) { px = -px; pz = -pz; }
  const uc = L / 2, r = NICHE.l / 2, yN = 0.02 + (S.y - pied);
  const f = new THREE.Shape();
  f.moveTo(0, 0); f.lineTo(uc - r, 0); f.lineTo(uc - r, yN + NICHE.h); f.absarc(uc, yN + NICHE.h, r, Math.PI, 0, true);
  f.lineTo(uc + r, 0); f.lineTo(L, 0); f.lineTo(L, H); f.lineTo(0, H); f.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(f, { depth: NICHE.prof, bevelEnabled: false, curveSegments: 12 });
  // repère (u le long du pan, v en haut, w vers le fond) : la face avant du pan est à EP_PAN / 2 de son axe, côté scène
  const ox = A[0] + px * (EP_PAN / 2), oz = A[1] + pz * (EP_PAN / 2);
  const M = new THREE.Matrix4().set(ux, 0, -px, ox, 0, 1, 0, pied, uz, 0, -pz, oz, 0, 0, 0, 1);
  murs.geo('moellons', g, M, { couleur: patine(T_MUR, pied, haut, 551), uvBoite: true, tuile: kit.TUILES.moellons });
  g.dispose();
  // le fond de la niche et le dos du pan : une boîte de la profondeur restante
  boiteLe(murs, 'moellons', A, B, EP_PAN - NICHE.prof, pied, haut, { dec: (px * (-uz) + pz * ux) > 0 ? -(NICHE.prof / 2) : NICHE.prof / 2, couleur: patine(T_MUR, pied, haut, 552) });
  // (reprise du lot B10) le fond de la niche, dans l'ombre de son cintre : un parement plus sombre posé à 1 cm devant le
  // fond, de la forme de l'ouverture. Sans lui, le fond avait la teinte du pan et la niche ne se lisait pas de loin
  // (R5-T01 : un renfoncement sombre au pied du pan axial).
  const fn = new THREE.Shape(), yF = yN;
  fn.moveTo(uc - r, yF); fn.lineTo(uc + r, yF); fn.lineTo(uc + r, yN + NICHE.h); fn.absarc(uc, yN + NICHE.h, r, 0, Math.PI, false); fn.lineTo(uc - r, yF);
  const gf = new THREE.ShapeGeometry(fn, 12), dF = NICHE.prof - 0.01;
  const MF = new THREE.Matrix4().set(ux, 0, px, ox - px * dF, 0, 1, 0, pied, uz, 0, pz, oz - pz * dF, 0, 0, 0, 1);
  murs.geo('moellons', gf, MF, { couleur: (x, y) => fixe(T_MUR, 0.74 - 0.14 * Math.min(1, Math.max(0, (y - S.y) / 2.4))), uvBoite: true, tuile: kit.TUILES.moellons });
  gf.dispose();
  // le gradin demi-circulaire : deux demi-disques de pierre adossés au fond de la niche, qui débordent vers la scène
  const fondX = ox - px * NICHE.prof, fondZ = oz - pz * NICHE.prof, cxN = fondX + ux * uc, czN = fondZ + uz * uc;
  for (const [R, hh] of [[0.95, 0.2], [0.62, 0.4]]) {
    const d = new THREE.Shape(); d.moveTo(R, 0); d.absarc(0, 0, R, 0, Math.PI, false); d.lineTo(R, 0);
    const gd = new THREE.ExtrudeGeometry(d, { depth: hh, bevelEnabled: false, curveSegments: 14 });
    const Md = new THREE.Matrix4().set(ux, px, 0, cxN, 0, 0, 1, S.y, uz, pz, 0, czN, 0, 0, 0, 1);
    murs.geo('taille', gd, Md, { couleur: fixe(T_TAILLE, 0.9), uvBoite: true, tuile: kit.TUILES.taille });
    gd.dispose();
  }
  return { ox, oz, px, pz, ux, uz, L };
}
function* murEnRedans(ctx, murs) {
  const { kit } = ctx, tuT = kit.TUILES.taille;
  const cCour = (x) => fixe(T_TAILLE, 0.9 + 0.08 * alea(Math.floor(x * 3), 0, 561));
  let axial = null;
  for (let i = 0; i + 1 < REDANS.length; i++) {
    const A = REDANS[i].p, B = REDANS[i + 1].p, pied = piedPan(i), haut = REDANS[i].haut;
    if (REDANS[i].axial) axial = panAxial(kit, murs, i);
    else boiteLe(murs, 'moellons', A, B, EP_PAN, pied, haut, { couleur: patine(T_MUR, pied, haut, 560 + i), uvDecal: [alea(i, 1, 562) * 3, alea(i, 2, 562) * 3] });
    // le couronnement, un peu débordant, d'une pile à l'autre
    boiteLe(murs, 'taille', A, B, EP_PAN + 0.08, haut, haut + 0.12, { couleur: cCour(A[0] + A[1]), chanfrein: 0.015 });
    if (ctx.budget()) yield;
  }
  for (let i = 0; i < REDANS.length; i++) {
    // (les piles des retours, aux bouts, restent sur l'axe du mur et moins profondes : l'escalier de la scène les longe)
    const bout = i <= 1 || i >= REDANS.length - 2, av = bout ? 0 : 0.2, pr = bout ? 0.8 : PILE.p;
    const R = REDANS[i], [tx, tz] = tangente(i), [nx, nz] = versScene(i), cx = R.p[0] + nx * av, cz = R.p[1] + nz * av;
    boiteEn(murs, 'moellons', cx, cz, Math.atan2(tz, tx), PILE.l, pr, R.pied - 0.05, R.pile, { couleur: patine(T_MUR, R.pied, R.pile, 570 + i), chanfrein: 0.02, uvDecal: [alea(i, 3, 571) * 3, alea(i, 4, 571) * 3] });
    boiteEn(murs, 'taille', cx, cz, Math.atan2(tz, tx), PILE.l + 0.1, pr + 0.1, R.pile, R.pile + 0.14, { couleur: cCour(cx + cz), chanfrein: 0.02 });
  }
  if (ctx.budget()) yield;
  // LES MURS DE L'ORCHESTRE au-delà des têtes, et leur porte de coulisses (un vantail de bois sombre en retrait)
  for (const F of FLANCS) {
    const [ax, az] = F.a, [, bz] = F.b, [p0, p1] = F.porte, yP = Y_ORCH + 2.15, cF = patine(T_MUR, Y_ORCH, Y_FLANC, 580 + az);
    boiteLe(murs, 'moellons', [ax, az], [ax, p0], EP_PAN, Y_ORCH - 0.05, Y_FLANC, { couleur: cF });
    boiteLe(murs, 'moellons', [ax, p1], [ax, bz], EP_PAN, Y_ORCH - 0.05, Y_FLANC, { couleur: cF });
    boiteLe(murs, 'moellons', [ax, p0], [ax, p1], EP_PAN, yP, Y_FLANC, { couleur: cF });
    boiteLe(murs, 'taille', [ax, p0 - 0.1], [ax, p1 + 0.1], EP_PAN + 0.04, yP - 0.02, yP + 0.16, { couleur: fixe(T_TAILLE, 0.92) });     // le linteau
    boiteLe(murs, 'taille', [ax, az], [ax, bz], EP_PAN + 0.08, Y_FLANC, Y_FLANC + 0.12, { couleur: cCour(az), chanfrein: 0.015 });
    boiteLe(murs, 'peinture', [ax, p0], [ax, p1], 0.06, Y_ORCH, yP, { couleur: lin('#3a2e26') });
    for (let k = 1; k < 5; k++) boiteLe(murs, 'peinture', [ax - 0.035, p0 + k * 0.2 - 0.008], [ax - 0.035, p0 + k * 0.2 + 0.008], 0.012, Y_ORCH + 0.05, yP - 0.05, { couleur: lin('#2a221c') });
  }
  if (ctx.budget()) yield;
  // LE GARDE-CORPS CLAIR au-dessus du pan axial (R5-T06 : une terrasse de service derrière le mur), tubes gris clair
  if (axial) {
    const { ox, oz, px, pz, ux, uz, L } = axial, y0 = REDANS[3].haut + 0.12, gris = lin('#c3c7c4');
    const P = (u, y) => [ox - px * (EP_PAN - 0.08) + ux * u, y, oz - pz * (EP_PAN - 0.08) + uz * u];
    for (const u of [0.35, L / 2, L - 0.35]) murs.barre(P(u, y0 - 0.02), P(u, y0 + 1.0), 0.045, 0.045, { couleur: gris });
    for (const y of [y0 + 0.5, y0 + 1.0]) murs.barre(P(0.3, y), P(L - 0.3, y), 0.04, 0.04, { couleur: gris });
  }
}
// LE LIERRE sur deux piles (R5-T06, T08 : « du lierre court sur deux piles, du pied jusqu'à 3 m environ ») : des cartes de
// feuilles presque plaquées sur la face des piles côté scène (carteFond de js/court_parc.js), palette « lierre » du coteau.
function lierrePiles(feu) {
  for (const i of [2, 4]) {
    const R = REDANS[i], [tx, tz] = tangente(i), [nx, nz] = versScene(i), fx = R.p[0] + nx * 0.71, fz = R.p[1] + nz * 0.71;
    const ry = Math.atan2(nx, nz);
    for (let k = 0; k < 150; k++) {
      const v = Math.pow(alea(k, i, 591), 1.4) * 3.1, u = (alea(i, k, 592) - 0.5) * (1.05 - 0.18 * v / 3.1);
      const x = fx + tx * u + nx * 0.02 * alea(k, k + i, 593), z = fz + tz * u + nz * 0.02 * alea(k, k + i, 593), y = R.pied + 0.05 + v, s = 0.3 + 0.14 * alea(i + k, v, 594);
      const vol = { c: [x - nx * 0.6 + Monde.dx, y, z - nz * 0.6], r: 0.8, t: 0.8 + 0.25 * alea(k, i, 595) };
      carteFond(feu, x + Monde.dx, y, z, (alea(k, i, 596) - 0.5) * 0.6, ry + (alea(i, k, 597) - 0.5) * 0.5, alea(k + i, v, 598) * 6.28, s, s * 0.9, vol, teinteCoteau('lierre', alea(x, y, 599)));
    }
    // (et, débordant du dessus de la pile, quelques rameaux qui retombent sur ses côtés)
    for (let k = 0; k < 24; k++) {
      const u = (alea(k, i, 601) - 0.5) * 1.1, x = fx + tx * u - nx * 0.4 * alea(i, k, 602), z = fz + tz * u - nz * 0.4 * alea(i, k, 602), y = R.pile + 0.1 + 0.15 * alea(k, i, 603);
      carteFond(feu, x + Monde.dx, y, z, -Math.PI / 2 + 0.6 * alea(k, i, 604), alea(i, k, 605) * 6.28, 0, 0.36, 0.32, { c: [x + Monde.dx, y - 0.4, z], r: 0.7, t: 0.85 }, teinteCoteau('lierre', alea(y, x, 606)));
    }
  }
}
// LE BÂTIMENT DE SERVICE enduit de blanc, derrière le mur de l'orchestre côté z+ (R5-T01 : « derrière, on devine un mur
// enduit blanc ») : un volume à toit plat, son acrotère, deux petites fenêtres et une porte sur sa face z-.
function annexe(kit, lot) {
  const A = ANNEXE, yb = Math.min(kit.sol(A.x0, A.z0), kit.sol(A.x1, A.z1), kit.sol(A.x0, A.z1), kit.sol(A.x1, A.z0)) - 0.1;
  const cE = (x, y, z) => { const f = (0.93 + 0.08 * bruit(x * 0.8, z * 0.8 + y, 611)) * (1 - 0.12 * Math.max(0, 1 - (y - yb) / 0.6)) * (1 - 0.1 * Math.max(0, bruit((x + z) * 1.7, 0, 612) * 1.6 - 0.9) * Math.exp(-(A.haut - y) / 1.2)); return fixe(T_ENDUIT, f); };
  boiteEn(lot, 'taille', (A.x0 + A.x1) / 2, (A.z0 + A.z1) / 2, 0, A.x1 - A.x0, A.z1 - A.z0, yb, A.haut, { couleur: cE });
  boiteEn(lot, 'beton', (A.x0 + A.x1) / 2, (A.z0 + A.z1) / 2, 0, A.x1 - A.x0 + 0.12, A.z1 - A.z0 + 0.12, A.haut, A.haut + 0.18, { couleur: fixe(T_BETON, 0.78) });
  const sombre = lin('#2b2d2e');
  for (const [x, w, y0, y1] of [[-10.2, 0.9, 0.0, 0.9], [-8.6, 0.9, 0.0, 0.9], [-7.3, 1.0, kit.sol(-7.3, A.z0 - 0.3), kit.sol(-7.3, A.z0 - 0.3) + 2.1]]) {
    boiteEn(lot, 'peinture', x, A.z0 - 0.015, 0, w, 0.04, y0, y1, { couleur: sombre });
    boiteEn(lot, 'taille', x, A.z0 - 0.03, 0, w + 0.2, 0.08, y1, y1 + 0.12, { couleur: fixe(T_TAILLE, 0.85) });
  }
}

function* orchestreEtScene(ctx) {
  const { kit, groupe } = ctx;
  // ---- le sol de l'orchestre, ses bandes rayonnantes ; la scène dallée
  const plat = new kit.Lot('orchestre · sol');
  solOrchestre(kit, plat);
  for (const d of BANDES) bandeRayonnante(kit, plat, d);
  if (ctx.budget()) yield;
  dallage(kit, plat);
  groupe.add(aPlat(plat.maillages('orchestre et scène · sols')));
  if (ctx.budget()) yield;
  const murs = new kit.Lot('scène · maçonneries');
  bordScene(kit, murs);
  // les deux projecteurs carrés au pied du premier rang
  for (const t of PROJECTEURS) {
    const [x, z] = PA(BAS.r0 - 0.45, t);
    boiteEn(murs, 'peinture', x, z, -t, 0.3, 0.26, Y_ORCH, Y_ORCH + 0.2, { couleur: lin('#1d1e1f'), chanfrein: 0.01 });
    boiteEn(murs, 'verre', x + 0.135 * Math.cos(t), z - 0.135 * Math.sin(t), -t, 0.012, 0.18, Y_ORCH + 0.04, Y_ORCH + 0.17, {});
  }
  if (ctx.budget()) yield;
  yield* murEnRedans(ctx, murs);
  annexe(kit, murs);
  // le mur bas qui tient le bord z- de l'orchestre, de part et d'autre de l'escalier d'entrée (le jardin sud est 0,7 à
  // 1 m plus haut)
  const zM = Z0 - 0.15, hM = (x) => Math.max(kit.sol(x, zM - 0.45), Y_ORCH + 0.4) + 0.1;
  for (const [xa, xb] of [[-18.25, ESC_ORCH.de[0] - ESC_ORCH.largeur / 2 - 0.12], [ESC_ORCH.de[0] + ESC_ORCH.largeur / 2 + 0.12, -12.35]]) {
    const n = Math.max(1, Math.round((xb - xa) / 1.2));
    for (let k = 0; k < n; k++) {
      const a = xa + ((xb - xa) * k) / n, b = xa + ((xb - xa) * (k + 1)) / n, h = Math.max(hM(a), hM(b));
      boiteLe(murs, 'moellons', [a, zM], [b, zM], 0.3, Y_ORCH - 0.05, h, { couleur: patine(T_MOELLON, Y_ORCH, h, 620 + k) });
      boiteLe(murs, 'taille', [a, zM], [b, zM], 0.36, h, h + 0.08, { couleur: fixe(T_TAILLE, 0.92) });
    }
  }
  groupe.add(murs.maillages('scène · maçonneries'));
  if (ctx.budget()) yield;
  // ---- les escaliers : les deux de la scène (pierre de taille, sans limon, R5-T01), celui de l'entrée (béton)
  for (const e of ESC_SCENE) { groupe.add(yield* volee(kit, e, { materiau: 'taille', limon: false, largeur: 1.4, usure: 0.7 }, ctx.budget)); if (ctx.budget()) yield; }
  groupe.add(yield* volee(kit, ESC_ORCH, { materiau: 'beton', limon: true, usure: 0.3 }, ctx.budget));
  if (ctx.budget()) yield;
  // ---- le lierre des deux piles
  const feu = new Touffes();
  lierrePiles(feu);
  const mf = maillageFeuillage(feu, ctx.K, 'scène · lierre des piles', true);
  if (mf) groupe.add(mf);
  yield;
}
// La silhouette de la scène et du mur (au loin) : le plateau en éventail, les pans et les piles en boîtes nues.
function* silhouetteScene(ctx) {
  const { kit, groupe } = ctx, lot = new kit.Lot('scène (silhouette)'), p = lot.part('taille');
  const c = fixe(T_DALLE, 0.95), ic = lot.s(p, S.x, S.y + 0.03, S.z, 0, 1, 0, 0, 0, c), id = [];
  for (let i = 0; i <= 12; i++) { const a = rad(90 + 15 * i); id.push(lot.s(p, S.x + S.r * Math.cos(a), S.y + 0.03, S.z + S.r * Math.sin(a), 0, 1, 0, 0, 0, c)); }
  for (let i = 0; i < 12; i++) lot.tri(p, ic, id[i], id[i + 1]);
  for (let i = 0; i + 1 < REDANS.length; i++) boiteLe(lot, 'moellons', REDANS[i].p, REDANS[i + 1].p, EP_PAN, piedPan(i), REDANS[i].haut, { couleur: fixe(T_MUR, 0.95) });
  for (const R of REDANS) boiteEn(lot, 'moellons', R.p[0], R.p[1], 0, 0.9, 0.9, R.pied, R.pile, { couleur: fixe(T_MUR, 0.95) });
  for (const F of FLANCS) boiteLe(lot, 'moellons', F.a, F.b, EP_PAN, Y_ORCH, Y_FLANC, { couleur: fixe(T_MUR, 0.95) });
  boiteEn(lot, 'taille', (ANNEXE.x0 + ANNEXE.x1) / 2, (ANNEXE.z0 + ANNEXE.z1) / 2, 0, ANNEXE.x1 - ANNEXE.x0, ANNEXE.z1 - ANNEXE.z0, -1.7, ANNEXE.haut, { couleur: fixe(T_ENDUIT, 0.95) });
  groupe.add(lot.maillages('scène (silhouette)'));
  yield;
}

// ============================================================================================ 3. LA TERRASSE HAUTE (Z09c)
// UN PALMIER DE CHINE (Trachycarpus fortunei : R5-T01, T06, R4-T0) : un stipe brun fibreux et une tête de feuilles en
// éventail, les jeunes dressées, les vieilles retombantes et jaunies. Chaque éventail : un pétiole, puis des folioles
// étroites (des triangles de « peinture » verte, vus des deux côtés) qui partent du même point et retombent du bout.
// `y0` : le pied (un talus, une haie : pas forcément le sol).
function palmier(lot, x, z, h, y0) {
  lot.tour('bois', [[0.15, -0.08], [0.125, 0.25], [0.105, h * 0.6], [0.12, h]], 7, new THREE.Matrix4().makeTranslation(x, y0, z), { couleur: lin('#4a3a2c', 1.6) });
  const T = new THREE.Vector3(x, y0 + h, z), nf = h < 1.2 ? 9 : 15, uv = (xx, yy, zz, out) => { out[0] = 0.25; out[1] = 0.5; };
  const face = (pts, c) => {
    const V = pts.map((q) => q.toArray()), nn = new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0])).normalize();
    if (nn.y < 0) nn.negate();
    lot.polygone('peinture', V, nn.toArray(), { couleur: c, uv });
    lot.polygone('peinture', V, nn.clone().negate().toArray(), { couleur: [c[0] * 0.9, c[1] * 0.93, c[2] * 0.85], uv });
  };
  for (let i = 0; i < nf; i++) {
    const th = i * 2.39996 + alea(x, z, 701) * 6.28, age = (i % 5) / 4;
    const el = 1.0 - age * 1.45 + (alea(i, x, 702) - 0.5) * 0.3, lp = (h < 1.2 ? 0.3 : 0.5) + 0.2 * alea(z, i, 703);
    const d = new THREE.Vector3(Math.cos(el) * Math.cos(th), Math.sin(el), Math.cos(el) * Math.sin(th)), P = T.clone().addScaledVector(d, lp);
    lot.barre(T.toArray(), P.toArray(), 0.02, 0.012, { couleur: lin('#5a6a3a') });
    const p = new THREE.Vector3(-Math.sin(th), 0, Math.cos(th)), n = new THREE.Vector3().crossVectors(d, p).normalize();
    const R = (h < 1.2 ? 0.4 : 0.58) + 0.12 * alea(i, z, 704), nF = 12, vert = age > 0.75 ? lin('#8e8a4c') : lin(i % 2 ? '#577f3a' : '#6c9645');
    for (let k = 0; k <= nF; k++) {
      const b = -1.6 + (3.2 * k) / nF, dir = d.clone().multiplyScalar(Math.cos(b)).addScaledVector(p, Math.sin(b));
      dir.y -= 0.28 * age * Math.abs(Math.sin(b)); dir.normalize();
      const t = new THREE.Vector3().crossVectors(n, dir).normalize(), w0 = 0.032, bout = P.clone().addScaledVector(dir, R);
      bout.y -= (0.18 + 0.28 * age) * R;
      const c = (k + i) % 2 ? vert : [vert[0] * 0.85, vert[1] * 0.85, vert[2] * 0.85];
      face([P.clone().addScaledVector(t, w0), P.clone().addScaledVector(t, -w0), bout], c);
    }
  }
}
// LE TALUS PLANTÉ au pied du mur de la placette (R5-T01 et R4-T0 : sous la placette, un talus d'environ 2 m planté de
// graminées, de fougères, de fusains, de lauriers et de petits palmiers ; les données du monde y dressent un mur de 4 m,
// la rupture 70 du MNT, que la zone Z12 habille de lierre). Une butte de terre adossée au mur, de +7,3 contre lui à la
// terrasse 2,3 m plus loin, effilée aux deux bouts ; elle cache les deux premiers mètres du mur. (Pur : les plantes et
// l'obstacle se calculent sans le monde, sauf la hauteur du pied, lue au dessin.)
const PROFIL_TALUS = [[0.3, 1], [0.75, 0.84], [1.3, 0.57], [1.85, 0.26], [TALUS.larg, 0]];
function forceTalus(z) { const a = (z - TALUS.z0) / 1.6, b = (TALUS.z1 - z) / 1.6; const t = Math.max(0, Math.min(1, a, b)); return t * t * (3 - 2 * t); }
function hauteurTalus(kit, x, z) {
  const d = x - xMurZ12(z), f = forceTalus(z), base = kit.sol(xMurZ12(z) + TALUS.larg + 0.15, z);
  if (d >= TALUS.larg) return base;
  let s = 1;
  for (let i = 1; i < PROFIL_TALUS.length; i++) {
    const [d0, s0] = PROFIL_TALUS[i - 1], [d1, s1] = PROFIL_TALUS[i];
    if (d <= d1) { s = s0 + ((s1 - s0) * (Math.max(d, d0) - d0)) / (d1 - d0); break; }
  }
  return base + (TALUS.haut - base) * s * f;
}
function plantesTalus() {
  const L = [];
  for (let z = TALUS.z0 + 0.3, k = 0; z < TALUS.z1 - 0.2; z += 0.55, k++) {
    for (const d0 of [0.5, 1.0, 1.5, 2.0]) {
      const zz = z + (alea(z, d0, 711) - 0.5) * 0.4, d = d0 + (alea(d0, z, 712) - 0.5) * 0.25, u = alea(zz, d, 713);
      if (forceTalus(zz) < 0.25 && u < 0.6) continue;
      // les petits palmiers et le palmier nain, peu nombreux (R4-T0 : trois à cinq)
      if (alea(Math.floor(zz / 4.5), 7, 714) > 0.55 && Math.abs(d - 1.0) < 0.3 && L.filter((q) => q.type === 'palmier' && Math.abs(q.z - zz) < 4).length === 0) {
        L.push({ type: 'palmier', z: zz, d, h: 1.6 + 1.0 * alea(zz, 1, 715) });
        continue;
      }
      // (relecture du lot B10) LE RANG DU FOND, contre le mur : des lauriers et des photinias de 1,7 à 2,5 m. Les données
      // dressent là un mur de 4 m (la placette à +9,5) ; le talus en cache 2. Avec des arbustes d'1 à 1,7 m, les deux
      // mètres du haut restaient nus, une bande de pierre en travers du haut des gradins, que ni R5-T16 (de l'orchestre :
      // la haie, puis une masse d'arbustes et de palmiers) ni R5-T06 ne montrent.
      const fond = d0 === 0.5 && forceTalus(zz) > 0.6;
      const type = fond ? (u < 0.55 ? 'laurierCerise' : u < 0.8 ? 'photinia' : 'graminee')
        : u < 0.3 ? 'graminee' : u < 0.48 ? 'fougere' : u < 0.62 ? 'panache' : u < 0.82 ? 'laurierCerise' : 'photinia';
      const h = type === 'graminee' ? 0.65 + 0.3 * alea(z, d, 716) : type === 'fougere' ? 0.45 + 0.2 * alea(z, d, 716) : type === 'panache' ? 0.6 + 0.3 * alea(z, d, 716)
        : fond ? 1.7 + 0.8 * alea(z, d, 716) : 1.0 + 0.7 * alea(z, d, 716);
      L.push({ type, z: zz, d, h, R: type === 'fougere' ? 0.45 : 0.38 + 0.3 * alea(d, zz, 717) + (h > 1 ? 0.2 : 0) + (h > 1.7 ? 0.15 : 0) });
    }
  }
  return L;
}
let PLANTES_TALUS = null;
const plantesDuTalus = () => PLANTES_TALUS || (PLANTES_TALUS = plantesTalus());
// les deux haies en arc, en points tous les 50 cm (pur)
function ligneHaie(H) { const L = []; for (let z = H.z0; z <= H.z1 + 1e-6; z = Math.min(H.z1, z + 0.5)) { L.push([xArc(R_HAIE, z), z]); if (z >= H.z1) break; } return L; }

function* terrasse(ctx) {
  const { kit, groupe } = ctx, T = outilsB2(kit, Monde);
  // ---- le sable de la terrasse (R5-T01 : #cdb48f, traces de balai), du dos des gradins au pied du mur de la placette
  const RH = HAUT.r0 + HAUT.n * HAUT.p;
  const sable = new kit.Lot('terrasse · sable');
  drape(kit, sable, 'terreBattue#sol', [-46.4, 147.4, -33.6, 172.2], (x, z) => rC(x, z) > RH + 0.02 && x > xMurZ12(z) + 0.28 && z < 171.9
    && !(z < 152.4 && x < -39.4) && !(z < 150.35 && x > -35.4), {
    pas: 0.5, dy: 0.02, teinte: (x, z) => { const f = (0.92 + 0.1 * bruit(x / 2.5, z / 2.5, 721)) * (0.97 + 0.05 * bruit(x * 1.7, z * 0.4, 722)); return [T_SABLE[0] * f, T_SABLE[1] * f, T_SABLE[2] * f]; } });
  groupe.add(aPlat(sable.maillages('terrasse · sable')));
  if (ctx.budget()) yield;
  // ---- les deux haies taillées en arc (0,6 m), ouvertes de 3 m dans l'axe
  for (const H of HAIES) { groupe.add(kit.haieTaillee({ ligne: ligneHaie(H), h: 0.62, ep: 0.72, essence: 'haie' })); if (ctx.budget()) yield; }
  // ---- les palmiers des massifs de haies, et les deux mâts de bois brun de l'éclairage scénique
  const pal = new kit.Lot('terrasse · palmiers et mâts');
  for (const q of PALMIERS_HAIE) { const x = xArc(R_HAIE, q.z); palmier(pal, x, q.z, q.h, kit.sol(x, q.z) + 0.25); if (ctx.budget()) yield; }
  for (const m of MATS) {
    const [x, z] = PA(RH + 1.5, m.t), y = kit.sol(x, z), brun = lin('#4a3626', 1.5);
    boiteEn(pal, 'bois', x, z, -m.t, 0.13, 0.13, y - 0.1, y + 2.7, { couleur: brun });
    boiteEn(pal, 'peinture', x + 0.12 * Math.cos(m.t), z - 0.12 * Math.sin(m.t), -m.t, 0.24, 0.18, y + 2.45, y + 2.65, { couleur: lin('#1b1c1d'), chanfrein: 0.01 });
  }
  // ---- le talus planté : la butte de terre, ses plantes, ses petits palmiers
  const terre = new kit.Lot('terrasse · talus'), p = terre.part('terre'), tu = kit.TUILES.terre, cT = [0.78, 0.72, 0.66];
  let prev = null;
  for (let z = TALUS.z0; z <= TALUS.z1 + 1e-6; z += 0.5) {
    const xm = xMurZ12(z), rang = [];
    for (let i = 0; i < PROFIL_TALUS.length; i++) {
      const d = PROFIL_TALUS[i][0], x = xm + d, y = hauteurTalus(kit, x, z) + (i === PROFIL_TALUS.length - 1 ? -0.04 : 0.0);
      const pente = (hauteurTalus(kit, x - 0.2, z) - hauteurTalus(kit, x + 0.2, z)) / 0.4, l = Math.hypot(pente, 1);
      rang.push(terre.s(p, x, y, z, pente / l, 1 / l, 0, x / tu, z / tu, cT));
    }
    if (prev) for (let i = 0; i + 1 < rang.length; i++) terre.quad(p, prev[i], prev[i + 1], rang[i + 1], rang[i]);
    prev = rang;
  }
  groupe.add(terre.maillages('terrasse · talus'));
  if (ctx.budget()) yield;
  const feu = new Touffes(), herbes = new kit.Lot('terrasse · graminées');
  let k = 0;
  for (const q of plantesDuTalus()) {
    const x = xMurZ12(q.z) + q.d, y0 = hauteurTalus(kit, x, q.z);
    if (q.type === 'palmier') palmier(pal, x, q.z, q.h, y0 - 0.1);
    else if (q.type === 'graminee') T.graminees(herbes, [[x, q.z, q.h]], { y: y0 - 0.03, eventails: 6 });
    else if (q.type === 'fougere' || q.type === 'panache') petitArbuste(feu, { x, z: q.z, y0: y0 - 0.04, h: q.h, R: q.R, pal: q.type === 'fougere' ? 'moyen' : 'panache' });
    else unArbuste(feu, { x, z: q.z, y0: y0 - 0.08, h: q.h, R: q.R, pal: q.type });
    if (++k % 10 === 0 && ctx.budget()) yield;
  }
  groupe.add(pal.maillages('terrasse · palmiers et mâts'));
  if (herbes.parts.size) groupe.add(T.maillages(herbes, 'terrasse · graminées du talus'));
  const mf = maillageFeuillage(feu, ctx.K, 'terrasse · talus planté', true);
  if (mf) groupe.add(mf);
  yield;
}

// ============================================================================================ 4. LA COUR DE SERVICE (Z09d)
// LE TREILLIS GALVANISÉ (R5-T10, T11 : panneaux de 2,5 m, poteaux ronds gris clair, deux lisses, 3,5 m) : le seul
// matériau propre de la zone, une texture détourée dessinée une fois (fils verticaux tous les 5 cm, horizontaux tous
// les 20 cm, comme les panneaux de treillis soudé), gris clair.
let _treillis = null;
function materiauTreillis() {
  if (_treillis) return _treillis;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128); g.strokeStyle = '#ffffff'; g.lineWidth = 1.5;
  for (let i = 0; i < 10; i++) { const x = 6.4 + i * 12.8; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  g.lineWidth = 2.2;
  for (let j = 0; j < 3; j++) { const y = 21 + j * 42.7; g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  _treillis = new THREE.MeshStandardMaterial({ color: 0xb4b9b8, map: t, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.45, metalness: 0.55 });
  _treillis.name = 'Z09 · treillis galvanisé';
  return _treillis;
}
// Les panneaux le long d'une ligne [A, B] : un plan par travée de 2,5 m, du sol à 3,5 m (UV : 64 cm par tuile)
function panneauxTreillis(kit, A, B, h) {
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.max(1, Math.round(L / 2.5)), pos = [], uv = [], idx = [];
  for (let k = 0; k < n; k++) {
    const a = [A[0] + ((B[0] - A[0]) * k) / n, A[1] + ((B[1] - A[1]) * k) / n], b = [A[0] + ((B[0] - A[0]) * (k + 1)) / n, A[1] + ((B[1] - A[1]) * (k + 1)) / n];
    const ya = kit.sol(a[0], a[1]) + 0.05, yb = kit.sol(b[0], b[1]) + 0.05, base = pos.length / 3, lu = L / n / 0.64;
    pos.push(a[0] + Monde.dx, ya, a[1], b[0] + Monde.dx, yb, b[1], b[0] + Monde.dx, yb + h, b[1], a[0] + Monde.dx, ya + h, a[1]);
    uv.push(0, 0, lu, 0, lu, h / 0.64, 0, h / 0.64);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, materiauTreillis());
  m.castShadow = false; m.receiveShadow = true; m.name = 'cour · treillis'; m.userData.feuillage = true;
  return m;
}
const COTES_COUR = [[[COUR.x0, COUR.z0], [COUR.x1, COUR.z0]], [[COUR.x1, COUR.z0], [COUR.x1, COUR.z1]], [[COUR.x1, COUR.z1], [COUR.x0, COUR.z1]], [[COUR.x0, COUR.z1], [COUR.x0, COUR.z0]]];
function* cour(ctx) {
  const { kit, groupe } = ctx, B = BATIMENT;
  // ---- le sol sablé (R5 : #cdbf9f)
  const sol = new kit.Lot('cour · sol');
  drape(kit, sol, 'gravier#sol', [COUR.x0 + 0.08, COUR.z0 + 0.08, COUR.x1 - 0.08, COUR.z1 - 0.08], (x, z) => !(x > B.x0 - 0.1 && x < B.x1 + 0.1 && z > B.z0 - 0.1 && z < B.z1 + 0.1), {
    pas: 0.5, dy: 0.02, teinte: (x, z) => { const f = 0.9 + 0.12 * bruit(x / 2.2, z / 2.2, 731); return [T_COUR[0] * f, T_COUR[1] * f, T_COUR[2] * f]; } });
  groupe.add(aPlat(sol.maillages('cour · sol')));
  if (ctx.budget()) yield;
  // ---- la clôture : poteaux ronds et lisses gris clair, panneaux de treillis
  const fer = new kit.Lot('cour · clôture'), gris = lin('#b4b8b8');
  for (const [A, Bp] of COTES_COUR) {
    const L = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]), n = Math.max(1, Math.round(L / 2.5));
    for (let k = 0; k <= n; k++) {
      const x = A[0] + ((Bp[0] - A[0]) * k) / n, z = A[1] + ((Bp[1] - A[1]) * k) / n, y = kit.sol(x, z);
      fer.tour('peinture', [[0.035, -0.1], [0.035, COUR.h + 0.02], [0.02, COUR.h + 0.05]], 8, new THREE.Matrix4().makeTranslation(x, y, z), { bande: true, couleur: gris, dessus: true });
    }
    for (const h of [0.12, COUR.h - 0.05]) fer.barre([A[0], kit.sol(A[0], A[1]) + h, A[1]], [Bp[0], kit.sol(Bp[0], Bp[1]) + h, Bp[1]], 0.03, 0.03, { couleur: gris });
    groupe.add(panneauxTreillis(kit, A, Bp, COUR.h - 0.1));
    if (ctx.budget()) yield;
  }
  groupe.add(fer.maillages('cour · clôture'));
  // ---- le petit bâtiment de moellons à toit plat, sa baie sombre sous un linteau de béton (R5-T11)
  const bat = new kit.Lot('cour · bâtiment'), yb = Math.min(kit.sol(B.x0, B.z0), kit.sol(B.x1, B.z1)) - 0.1, yh = kit.sol(B.x1, (B.z0 + B.z1) / 2) + B.haut;
  boiteEn(bat, 'moellons', (B.x0 + B.x1) / 2, (B.z0 + B.z1) / 2, 0, B.x1 - B.x0, B.z1 - B.z0, yb, yh, { couleur: patine(T_MUR, yb + 0.1, yh, 741) });
  boiteEn(bat, 'beton', (B.x0 + B.x1) / 2, (B.z0 + B.z1) / 2, 0, B.x1 - B.x0 + 0.2, B.z1 - B.z0 + 0.2, yh, yh + 0.2, { couleur: fixe(T_BETON, 0.85) });
  const yP = kit.sol(B.x1, (B.z0 + B.z1) / 2);
  boiteEn(bat, 'peinture', B.x1 + 0.01, (B.z0 + B.z1) / 2, 0, 0.04, 2.2, yP, yP + 2.1, { couleur: lin('#1e2021') });
  boiteEn(bat, 'beton', B.x1 + 0.03, (B.z0 + B.z1) / 2, 0, 0.1, 2.6, yP + 2.1, yP + 2.32, { couleur: fixe(T_BETON, 0.9) });
  // ---- deux bornes lumineuses rouille à chapeau noir, le long du chemin du quai (R5-T10, SYNTHESE § C)
  for (const z of [156.4, 166.6]) {
    const x = COUR.x1 + 0.9, y = kit.sol(x, z);
    bat.tour('peinture', [[0.09, -0.05], [0.09, 0.85], [0.075, 0.9]], 10, new THREE.Matrix4().makeTranslation(x, y, z), { bande: true, couleur: lin('#8a4a32') });
    bat.tour('peinture', [[0.12, 0.88], [0.13, 0.92], [0.06, 1.0], [0.001, 1.02]], 10, new THREE.Matrix4().makeTranslation(x, y, z), { bande: true, couleur: lin('#151617'), fond: true });
  }
  groupe.add(bat.maillages('cour · bâtiment et bornes'));
  yield;
}

// ============================================================================================ 5. LA LIMITE SUD-OUEST (Z09e)
// Le muret en opus incertum (0,9 m, R5-T13 : pierres de 20 à 40 cm, crème #d6cdb8) et la grille noire d'1,3 m qui le
// surmonte, le long de la limite du parc ; coupés pour le portail de service et son vantail de planches (z 177,5 à 181,4).
const X_LIM = (z) => -4.3 + (-0.7 * (z - 172.8)) / 12.5;
const PORTAIL_SERVICE = { z0: 177.5, z1: 179.8 }, VANTAIL = { z0: 180.1, z1: 181.4 };
function troncons() {
  const T = [];
  T.push([LIMITE[0], LIMITE[1]]);
  // le long côté (41 m) en quatre pièces
  const [a, b] = [LIMITE[1], LIMITE[2]];
  for (let k = 0; k < 4; k++) T.push([[a[0] + ((b[0] - a[0]) * k) / 4, a[1] + ((b[1] - a[1]) * k) / 4], [a[0] + ((b[0] - a[0]) * (k + 1)) / 4, a[1] + ((b[1] - a[1]) * (k + 1)) / 4]]);
  T.push([LIMITE[2], [X_LIM(PORTAIL_SERVICE.z0 - 0.15), PORTAIL_SERVICE.z0 - 0.15]]);
  T.push([[X_LIM(VANTAIL.z1 + 0.15), VANTAIL.z1 + 0.15], LIMITE[3], LIMITE[4]]);
  return T;
}
function* limite(ctx) {
  const { kit, groupe } = ctx;
  for (const ligne of troncons()) {
    groupe.add(kit.grilleBarreaux({ ligne, h: 1.3, muret: 0.9, ep: 0.4, pas: 0.12, travee: 2.5, pointes: false, materiauMuret: 'moellons' }));
    if (ctx.budget()) yield;
  }
  // le portillon du quai (PQS), fermé
  groupe.add(kit.portail({ x: PQS.x, z: PQS.z, cap: 180, largeur: PQS.largeur, type: 'simple', h: 1.9, ouvert: 0 }));
  if (ctx.budget()) yield;
  const lot = new kit.Lot('limite · portail de service');
  // le portail de tôle anthracite et le vantail de planches claires, entre trois poteaux
  const ys = (z) => kit.sol(X_LIM(z), z), poteau = (z) => boiteEn(lot, 'peinture', X_LIM(z), z, 0, 0.1, 0.1, ys(z) - 0.1, ys(z) + 2.2, { couleur: lin('#26292b') });
  for (const z of [PORTAIL_SERVICE.z0 - 0.1, PORTAIL_SERVICE.z1 + 0.15, VANTAIL.z1 + 0.1]) poteau(z);
  boiteLe(lot, 'peinture', [X_LIM(PORTAIL_SERVICE.z0), PORTAIL_SERVICE.z0], [X_LIM(PORTAIL_SERVICE.z1), PORTAIL_SERVICE.z1], 0.05, ys(PORTAIL_SERVICE.z0) + 0.05, ys(PORTAIL_SERVICE.z0) + 2.0, { couleur: lin('#3e4246') });
  for (let z = VANTAIL.z0; z < VANTAIL.z1 - 0.05; z += 0.14) {
    const f = 0.88 + 0.2 * alea(z, 3, 751);
    boiteLe(lot, 'bois', [X_LIM(z), z], [X_LIM(z + 0.13), z + 0.13], 0.035, ys(z) + 0.06, ys(z) + 1.95, { couleur: fixe(lin('#b99a6a', 1.5), f) });
  }
  // le panneau blanc à logo vert du service des espaces verts, sur la grille près du portillon (R5-T13, T14)
  const yp = kit.sol(-3.6, 185.3);
  boiteEn(lot, 'peinture', -3.6, 185.42, 0, 0.62, 0.025, yp + 1.15, yp + 1.95, { couleur: lin('#efefea') });
  boiteEn(lot, 'peinture', -3.6, 185.44, 0, 0.22, 0.02, yp + 1.62, yp + 1.84, { couleur: lin('#2f7a3c') });
  // six arceaux à vélos dehors, sur le trottoir de la petite rue (conception, Z09)
  const gris = lin('#3b3e41');
  for (let i = 0; i < ARCEAUX.n; i++) {
    const x = ARCEAUX.x0 + i * ARCEAUX.pas, z = ARCEAUX.z, y = kit.sol(x, z), pts = [];
    for (let k = 0; k <= 10; k++) { const a = (Math.PI * k) / 10; pts.push([x, y + (k === 0 || k === 10 ? -0.05 : 0.45 + 0.3 * Math.sin(a)), z - 0.35 * Math.cos(a)]); }
    pts[0] = [x, y - 0.05, z - 0.35]; pts[10] = [x, y - 0.05, z + 0.35];
    lot.prisme('peinture', [[-0.025, -0.025], [0.025, -0.025], [0.025, 0.025], [-0.025, 0.025]], pts, { bande: true, couleur: gris, haut: [1, 0, 0] });
  }
  groupe.add(lot.maillages('limite · portail de service, panneau, arceaux'));
  yield;
}

// ============================================================================================ la zone
const BOITES = {
  Z09a: [-37.0, 147.5, -16.5, 172.0],
  Z09b: [-22.0, 147.5, -2.5, 173.5],
  Z09c: [-46.5, 146.5, -33.5, 174.0],
  Z09d: [-4.0, 149.5, 4.5, 174.0],
  Z09e: [-46.5, 165.5, 1.0, 188.0],
};
// (les obstacles sont déclarés par morceaux de 2 m au plus : leur hauteur se lit sur le sol au milieu de chacun)
function segments(o, ligne, opt, pas = 2) {
  for (let i = 0; i + 1 < ligne.length; i++) {
    const [ax, az] = ligne[i], [bx, bz] = ligne[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / pas));
    for (let k = 0; k < n; k++) o.segment(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, ax + ((bx - ax) * (k + 1)) / n, az + ((bz - az) * (k + 1)) / n, opt);
  }
}
export default {
  id: 'Z09', nom: 'Théâtre de verdure et entrée sud-ouest',
  emprise: [[-46, 146.5], [8, 146.5], [8, 187], [-46, 187]],
  morceaux: [
    { id: 'Z09a', nom: 'gradins, palier, escalier latéral', boite: BOITES.Z09a, construire: gradins, silhouette: silhouetteGradins },
    { id: 'Z09b', nom: 'orchestre, scène et mur en redans', boite: BOITES.Z09b, construire: orchestreEtScene, silhouette: silhouetteScene },
    { id: 'Z09c', nom: 'terrasse haute, haies, talus planté', boite: BOITES.Z09c, construire: terrasse },
    { id: 'Z09d', nom: 'cour de service', boite: BOITES.Z09d, construire: cour },
    { id: 'Z09e', nom: 'limite sud-ouest et portillon', boite: BOITES.Z09e, construire: limite },
  ],
  // PUR : ce que les données du monde ne savent pas. Les marches des gradins, de la scène et des escaliers, le bord de
  // l'orchestre, les murs de l'orchestre et la grille de la limite y sont déjà (gabarits, clôture limite_sud, portillon
  // PQS) ; ici : le mur en redans (pans et piles), le bâtiment de service, les jardinières, les projecteurs, les haies,
  // les palmiers et les mâts, le pied du talus planté, la cour (clôture, bâtiment) et les bornes.
  obstacles(o) {
    const dur = (h) => ({ h, type: 'dur' });
    for (let i = 0; i + 1 < REDANS.length; i++) segments(o, [REDANS[i].p, REDANS[i + 1].p], { e: EP_PAN, h: REDANS[i].haut - Math.max(REDANS[i].pied, REDANS[i + 1].pied) + 0.1, type: 'dur' });
    for (let i = 0; i < REDANS.length; i++) {
      const bout = i <= 1 || i >= REDANS.length - 2, [tx, tz] = tangente(i), [nx, nz] = versScene(i), av = bout ? 0 : 0.2;
      o.boite(REDANS[i].p[0] + nx * av, REDANS[i].p[1] + nz * av, PILE.l / 2, (bout ? 0.8 : PILE.p) / 2, Math.atan2(tz, tx), dur(REDANS[i].pile - REDANS[i].pied));
    }
    for (const F of FLANCS) segments(o, [F.a, F.b], { e: EP_PAN, h: Y_FLANC - Y_ORCH + 0.1, type: 'dur' });
    // LE BORD DESSINÉ DE LA SCÈNE (reprise du lot B10) : le demi-disque des données (gabarit plateau_scene_theatre) a
    // 4,44 m de rayon, celui du dessin 4,8 m (contremarche de moellons, voir bordScene). Un anneau épais couvre la bande
    // entre les deux : depuis l'orchestre, on bute sur la contremarche dessinée au lieu d'y entrer jusqu'aux genoux ; depuis
    // la scène, on s'arrête avant le bord des données (sans tomber dans la bande, d'où l'on ne ressortirait plus). On
    // descend par les deux escaliers ; l'anneau s'arrête à 5° du diamètre pour laisser libre le haut de leurs marches.
    const anneauScene = [];
    for (let a = 95; a <= 265 + 1e-6; a += 10) anneauScene.push([S.x + 4.62 * Math.cos(rad(a)), S.z + 4.62 * Math.sin(rad(a))]);
    segments(o, anneauScene, { e: 0.4, h: S.y - Y_ORCH, type: 'dur' }, 1.0);
    // LE SOUBASSEMENT ET LE MUR MÉDIAN (même cas) : sous trame_dessous (tools/parc/construire_monde.py, g_gradins), le
    // rang qui les surmonte ne commence dans les données que 0,2 à 0,7 m derrière leur face dessinée (relevé de Monde.sol
    // tous les 10 cm sur six rayons : soubassement à 19,7-20,0 pour une face à 19,5 ; mur médian à 26,4-26,7 pour 26,0).
    // Une bande pleine couvre cet écart, coupée aux dégagements (leur largeur dessinée, plus 5 cm de jeu de chaque côté) :
    // on y bute sur la maçonnerie au lieu d'y entrer jusqu'aux cuisses ; d'en haut, on ne saute plus de 0,7 ou 0,8 m dans
    // l'orchestre ou sur le palier, on descend par les dégagements. (Entre deux rangs de béton, 0,4 m, on garde l'écart :
    // une bande y interdirait aussi de descendre les gradins rang par rang.) Pour les piétons et les montures (la roue
    // avant du vélo, arrêtée par les données, entrait d'un demi-mètre dans le soubassement), pas pour la balle : le pied
    // d'une bande tombe tantôt sur le sol bas, tantôt sur le rang (leur limite la traverse), elle y rebondirait au hasard ;
    // elle garde les faces des données.
    const bande = (R, e, coupures, h) => {
      // (la coupure : la largeur dessinée, 5 cm de jeu de chaque côté, et le demi-bout arrondi d'un segment épais, e / 2)
      for (const [t0, t1] of travees(R, R, coupures.map((c) => ({ t: c.t, w: c.w + 0.1 + e })))) {
        const n = Math.max(1, Math.ceil((Math.abs(t1 - t0) * R) / 1.0)), pts = [];
        for (let i = 0; i <= n; i++) pts.push(PA(R, t0 + ((t1 - t0) * i) / n));
        for (const qui of ['pieton', 'velo']) segments(o, pts, { e, h, type: 'dur', qui }, 1.0);
      }
    };
    bande(BAS.r0 + 0.25, 0.5, DEG_BAS, BAS.y1 - Y_ORCH);
    bande(HAUT.r0 + 0.35, 0.7, DEG_HAUT, HAUT.y1 - PALIER.y);
    o.boite((ANNEXE.x0 + ANNEXE.x1) / 2, (ANNEXE.z0 + ANNEXE.z1) / 2, (ANNEXE.x1 - ANNEXE.x0) / 2, (ANNEXE.z1 - ANNEXE.z0) / 2, 0, dur(3.2));
    for (const c of DEG_BAS) for (const s of [-1, 1]) { const [x, z] = PA(19.18, c.t); o.boite(x + Math.sin(c.t) * s * (c.w / 2 + 0.31), z + Math.cos(c.t) * s * (c.w / 2 + 0.31), 0.25, 0.25, 0, dur(0.75)); }
    for (const c of DEG_HAUT) for (const s of [-1, 1]) { const [x, z] = PA(25.55, c.t); o.boite(x + Math.sin(c.t) * s * (c.w / 2 + 0.31), z + Math.cos(c.t) * s * (c.w / 2 + 0.31), 0.25, 0.25, 0, dur(0.85)); }
    for (const t of PROJECTEURS) { const [x, z] = PA(BAS.r0 - 0.45, t); o.cercle(x, z, 0.18, dur(0.2)); }
    for (const H of HAIES) segments(o, ligneHaie(H), { e: 0.72, h: 0.62, type: 'haie' }, 1.5);
    for (const q of PALMIERS_HAIE) o.cercle(xArc(R_HAIE, q.z), q.z, 0.16, dur(q.h));
    const RH = HAUT.r0 + HAUT.n * HAUT.p;
    for (const m of MATS) { const [x, z] = PA(RH + 1.5, m.t); o.cercle(x, z, 0.1, dur(2.7)); }
    // le pied du talus planté (on ne marche pas dans les plantes) : une ligne tous les 2 m, à 2,1 m du mur
    const pied = [];
    for (let z = TALUS.z0 + 0.6; z <= TALUS.z1 - 0.6 + 1e-6; z += 1) pied.push([xMurZ12(z) + 2.1, z]);
    segments(o, pied, { e: 0.3, h: 1.6, type: 'haie' });
    for (const [A, B] of COTES_COUR) segments(o, [A, B], { e: 0.08, h: COUR.h, type: 'grille' });
    o.boite((BATIMENT.x0 + BATIMENT.x1) / 2, (BATIMENT.z0 + BATIMENT.z1) / 2, (BATIMENT.x1 - BATIMENT.x0) / 2, (BATIMENT.z1 - BATIMENT.z0) / 2, 0, dur(BATIMENT.haut));
    for (const z of [156.4, 166.6]) o.cercle(COUR.x1 + 0.9, z, 0.1, dur(1.0));
  },
  // DES PLACES SUR LES GRADINS (le contrat des bancs, conception § 3.3) : tous les 3 m environ sur trois rangs de chaque
  // bloc, hors des dégagements, tournées vers la scène ; `y` : l'assise est le dessus du rang.
  bancs(b) {
    const rangs = [[BAS, 2], [BAS, 4], [HAUT, 2], [HAUT, 5], [HAUT, 8]];
    for (const [B, k] of rangs) {
      const R = B.r0 + (k - 1) * B.p + 0.25, t0 = tBout(R, Z0 + 0.8), t1 = tBout(R, Z1 - 0.8), n = Math.max(2, Math.round(((t1 - t0) * R) / 3));
      for (let i = 0; i <= n; i++) {
        const t = t0 + ((t1 - t0) * i) / n;
        if ((B === BAS ? DEG_BAS : DEG_HAUT).some((c) => Math.abs(t - c.t) * R < c.w / 2 + 0.6)) continue;
        const [x, z] = PA(R, t), cap = (Math.atan2(C.x - x, C.z - z) * 180) / Math.PI;
        b.push({ x, z, cap, y: 0.0, source: 'Z09' });
      }
    }
  },
  lieux: [],
};
