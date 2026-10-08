// =====================================================================
//  ZONE Z02 : L'ESPLANADE DES PLATANES ET LA FAÇADE DE LA CASERNE CHARRAS (lot B4 du chantier « parc entier »)
// =====================================================================
// Le fond de scène du plateau côté platanes : au bout de l'esplanade (le quinconce de platanes taillés, que dessine
// déjà js/court_parc.js et que prolongent les arbres de arbres.bin), la placette pavée et la FAÇADE de l'ancienne
// caserne Charras (1756, pavillon central remonté en 1968), qui regarde le plateau (z+).
//
// LES SOURCES, et ce qu'elles corrigent dans la conception (conception § 1.3, Z02) : le rapport de recherche R1
// (tools/parc/references_gmaps/R1.md, § 2 : la fiche de construction) et sa synthèse (SYNTHESE.md, Z02) : photos
// Google de face (été 2021 et hiver 2021 : R1-01, R1-02), photos Commons de trois quarts, du pignon, du tympan et de
// l'escalier (C1 à C5), satellite ; photos de Haythem du 28/09 (171705, 171706 : la façade au bout de l'allée du mur, le
// grillage qui continue sur le mur, puis la grille noire basse) ; orthophoto IGN (tools/parc/sources/ortho_jeu.jpg).
//  - LA FAÇADE fait 19 m (19,4 hors tout, pilastres d'angle compris) sur le nu z = -51,2, de x -23,3 à -3,9 : trois
//    travées, TROIS NIVEAUX de fenêtres (pas deux), un FRONTON triangulaire sur toute la largeur dont le sommet est à
//    16,4 m au-dessus du pavé, la corniche à 13,8 m (pas 12 à 14 m), une porte en plein cintre, un perron de 4 marches
//    qui s'évase de 5,3 m en haut à 8 m en bas. Pierre blonde (#dcc9a0), refends continus aux quatre pilastres, croûtes
//    noires et coulures sous les saillies.
//  - DERRIÈRE, une simple BOÎTE de 4,3 m à toit plat gris foncé, invisible du sol, et des PIGNONS AVEUGLES en moellons
//    sous un couronnement de zinc : PAS de toit brisé en ardoise.
//  - LA PLACETTE est pavée EN GRILLE : deux rangées de trois grands carrés de pavés gris clair, séparés et bordés par
//    des bandes de terre cuite, la croix alignée sur la porte ; au coin côté quai, une nappe d'ASPHALTE ROUGE qui
//    descend vers la promenade, bordée d'une haie en courbe ; des massifs de bégonias au pied de la façade.
//  - L'ESCALIER DE 12 MARCHES n'est pas la suite de celui de 34 : c'est une volée courte qui monte vers x- contre l'angle
//    de la façade, entre la FIN DU MUR DE MEULIÈRE (côté z+) et un LIMON D'ÉCHIFFRE en béton gris (côté façade), qui
//    retient le talus planté (fusains dorés) entre l'escalier et l'angle du bâtiment.
//  - LE MUR DE MEULIÈRE du plateau se PROLONGE le long de l'esplanade (gabarit mur_meuliere, zone Z02) jusqu'à
//    l'escalier, avec son chaperon de béton gris ; sur ses sept premiers mètres le treillis vert du plateau continue,
//    puis vient la GRILLE NOIRE BASSE (171705, 171706, C1, C3), qui tourne avec le mur au-dessus de l'escalier.
// Le bas de l'escalier de 34 marches (ses deux volées et son palier) est dessiné par la zone Z10 (lot B5) : ici, on s'y
// raccorde par le haut de l'escalier de 12, sur le palier rouge de l'allée du mur.
//
// LES MORCEAUX (conception § 3.3 et 3.5) : Z02a la façade, le bâtiment et le perron (et sa silhouette, visible de loin :
// du coteau, de la promenade, du plateau par la voûte) ; Z02b la placette, l'escalier de 12, l'échiffre et le talus, le
// coin rouge et ses haies, le mobilier ; Z02c le mur de meulière le long de l'esplanade, son chaperon, son treillis et
// sa grille. Chacun sous 25 appels de dessin et 60 000 triangles.
//
// RÈGLES DE ZONE : aucun Math.random (kit.alea, kit.bruit ; les arbustes de js/court_parc.js sous avecHasard) ; toute
// hauteur vient du sol du monde (kit.sol, qui lit Monde.sol) — la façade est posée sur le pavé de la placette au pied du
// perron, lu dans les données ; les matériaux sont ceux du kit, plus deux en propre : le TYMPAN (sa texture de relief,
// dessinée par le jeu : sculpture en carte de normales) et le TREILLIS soudé du haut du mur ; aucun arbre planté ici
// (arbres.bin, gabarits.json > arbres) ; tout va dans le groupe du morceau.
import * as THREE from 'three';
import { Monde } from '../../monde.js';
import { Nappe, plaque, maillageSol, Touffes, arbuste, maillageFeuillage } from './coteau.js';

// ============================================================================================ les données
// (repère du terrain 1 ; x+ vers la Seine, z+ vers le plateau et le pin)

// LA FAÇADE (R1 § 2.1, OSM 82241216, ortho). `x0`, `x1` : hors tout (les pilastres d'angle débordent de 20 cm sur les
// pignons, C1) ; `xb0`, `xb1` : la boîte derrière (OSM) ; `z` : le nu des trumeaux ; `zDos` : le mur arrière.
const FA = { x0: -23.3, x1: -3.9, xc: -13.6, z: -51.2, xb0: -23.1, xb1: -4.1, zDos: -55.6, ep: 0.6 };
// Les travées, de x- à x+ (R1-02 : angle 2,0 | travée 4,2 | pilastre 1,7 | centre 3,8 | pilastre 1,7 | travée 4,2 |
// angle 2,0 m, ramenés aux 19,4 m de la façade)
const TR = {
  angleG: [-23.3, -21.32], gauche: [-21.32, -17.16], pilG: [-17.16, -15.48], centre: [-15.48, -11.72],
  pilD: [-11.72, -10.04], droite: [-10.04, -5.88], angleD: [-5.88, -3.9],
};
const PILASTRES = [TR.angleG, TR.pilG, TR.pilD, TR.angleD];
// Les hauteurs au-dessus du pavé de la placette (R1-02, ± 10 %) : socle, bandeau (cordon au niveau des naissances de
// l'arc de la porte), frise et corniche, sommet du fronton ; les baies des travées latérales (appui, haut) ; la
// fenêtre centrale sur son appui à consoles ; la porte (seuil en haut du perron, haut des vantaux, naissance de l'arc).
const H = {
  socle: 0.42, bandeau: [5.0, 5.35], frise: [12.0, 12.6], corniche: 13.8, sommet: 16.4,
  rdc: [1.0, 3.8], premier: [5.62, 7.72], second: [9.1, 11.12], centre: [8.42, 10.72], appuiCentre: 8.22,
  seuil: 0.64, vantaux: 4.1, naissance: 5.03,
};
const LF = 1.7;                              // largeur des baies (R1 : 0,09 de la façade)
const RP = 1.375;                            // demi-largeur de la porte (2,75 m) : rayon de son plein cintre
const RA = RP + 0.24;                        // rayon extérieur de l'archivolte
// Le perron (R1-02b) : 4 marches de 16 x 35 cm, de 8 m en bas à 5,3 m en haut ; le palier devant la porte. Le monde le
// connaît (gabarit perron_charras de tools/parc/gabarits.json : un plan incliné de 5,3 m de large, du pavé au seuil).
const PERRON = { zBas: -49.45, giron: 0.35, haut: 0.16, largeurs: [8.0, 7.1, 6.2, 5.3] };

// LA PLACETTE (R1 § 2.2, satellite R1-23, ortho) : deux rangées de trois carrés de pavés gris clair (5 x 4 m), séparés
// et bordés de bandes de terre cuite d'1,1 m ; la croix centrale est dans l'axe de la porte. `xs` : bords des bandes et
// des carrés (le mur de meulière, les carrés, la limite côté quai) ; `zs` : de la façade (le devant des massifs) vers
// l'esplanade.
const PL = { xs: [-23.62, -22.2, -17.2, -16.1, -11.1, -10.0, -5.0, -3.9], zs: [-50.35, -49.3, -45.3, -44.2, -40.2, -39.1] };
// Les massifs de bégonias au pied de la façade, de part et d'autre du perron (R1 : 0,8 à 1 m, bordure de béton)
const MASSIFS = [[-22.72, -17.75], [-9.45, -4.25]];
const Z_MASSIF = [-51.15, -50.4];

// L'ESCALIER DE 12 MARCHES (gabarit escalier12 : OSM 1066219846) : `de` en haut, `a` en bas.
const ESC12 = { de: [-27.0, -46.8, 2.45], a: [-22.2, -43.8, 0.43], largeur: 1.8, marches: 12 };
// Le pied de la volée (dessinée un demi-giron plus bas que le plan des données, voir placette) : sa PREMIÈRE CONTREMARCHE
// passe par `a`, en travers ; ses deux bouts (côté mur, côté échiffre). Le pavage s'arrête là : drapé sur le plan incliné
// des données, il perçait l'arrière de chaque giron.
const PIED12 = [[-22.68, -43.04], [-21.72, -44.56]];
// Le LIMON D'ÉCHIFFRE (C3, R1-02c) : il longe l'escalier côté façade (à 10 cm de son bord), puis quitte la volée vers
// l'angle x- de la façade et y retient le talus ; l'échiffre commence à 80 cm du bas de la volée (le bas des marches
// reste dégagé côté placette, C3). (Relecture : le sol de la placette est tenu à plat au pied de son retour — gabarit
// echiffre_charras de tools/parc/gabarits.json — : le MNT y montait vers le talus et gauchissait le pavage.)
const ECHIFFRE =[[-26.47, -47.65], [-22.35, -45.06], [-23.02, -51.15]];
// Le talus planté derrière lui (R1-23 : un massif « vert et brun » de 3 x 5 m au bout x- de la façade ; C3 : des fusains
// dorés) : { x, z, h, R, pal } (palettes du coteau, js/parc/zones/coteau.js)
const TALUS = [
  { x: -23.75, z: -48.5, h: 1.45, R: 0.95, pal: 'cognassier' },
  { x: -23.55, z: -50.35, h: 1.25, R: 0.8, pal: 'cognassier' },
  { x: -24.55, z: -46.75, h: 1.5, R: 0.85, pal: 'cognassier' },
  { x: -25.85, z: -48.4, h: 2.3, R: 1.2, pal: 'laurier' },
  { x: -25.1, z: -51.9, h: 1.9, R: 1.05, pal: 'sombre' },
  { x: -24.05, z: -52.7, h: 1.35, R: 0.85, pal: 'moyen' },
];

// LE COIN CÔTÉ QUAI (R1-23, R1-04, ortho) : la nappe d'asphalte rouge, sa pointe coupée en biais (une bordure de béton,
// la ligne claire de l'ortho), et le chemin qui descend vers la promenade basse, entre le bout du grillage du quai
// (z -48,1, js/court_parc.js) et la haie (son sol : le gabarit chemin_rouge_charras, une pente régulière de 8,7 %
// depuis le milieu de la nappe, qu'on descend à vélo) ; les haies taillées : en courbe autour de la nappe, le long du
// pignon x+ (R1-04 : haie vert sombre, pyracantha, spirées) et du côté de la promenade.
const NAPPE_ROUGE = [[-3.9, -51.0], [1.9, -51.0], [1.9, -45.6], [-0.9, -42.2], [-3.9, -42.2]];
const CHEMIN_ROUGE = [[1.85, -48.2], [9.24, -48.5], [9.24, -50.85], [1.85, -51.0]];
const HAIES = [
  { ligne: [[2.6, -47.95], [2.6, -45.4], [2.1, -44.2], [1.0, -43.0], [-0.5, -42.0], [-2.4, -41.45]], h: 1.0, ep: 0.7, essence: 'troene' },
  { ligne: [[-2.9, -51.7], [-2.9, -57.6]], h: 1.2, ep: 0.8, essence: 'haie' },
  { ligne: [[2.6, -51.25], [2.6, -57.4]], h: 1.2, ep: 0.8, essence: 'haie' },
];
// les arbustes entre les deux haies (pyracantha, spirées), devant le pignon x+
const ARBUSTES_PIGNON = [
  { x: -1.55, z: -53.3, h: 2.1, R: 1.05, pal: 'sombre' },
  { x: 0.1, z: -56.4, h: 1.3, R: 0.8, pal: 'moyen' },
  { x: -1.4, z: -56.9, h: 1.2, R: 0.75, pal: 'moyen' },
];

// LE MOBILIER (R1 § 2.4 ; C1 : un banc vert devant le perron en 2012) : deux bancs verts au bord de la placette, sous la
// lisière de la voûte, tournés vers la façade ; des corbeilles ; deux lampadaires à fût gris clair (R1-17).
const BANCS = [{ x: -13.6, z: -38.45, cap: 180 }, { x: -22.1, z: -38.45, cap: 180 }];
const CORBEILLES = [{ x: -11.75, z: -38.55 }, { x: -3.2, z: -41.9 }];
const LAMPADAIRES = [{ x: 2.05, z: -47.5, cap: 270 }, { x: -23.05, z: -40.6, cap: 90 }];

// LE MUR DE MEULIÈRE le long de l'esplanade (gabarit mur_meuliere : face à x = -23,7) : son AXE (face - demi-épaisseur),
// du bout du mur du plateau (z -9,5, js/court_parc.js murMeuliere) à l'escalier de 12 marches, puis son RETOUR le long
// de la volée, côté z+, jusqu'au palier du haut. Même hauteur que le mur du plateau (2,30 m de maçonnerie, 12 cm de
// chaperon : 2,42), qui est le mur même : le sol du haut (l'allée du mur, zone Z10) monte vers lui jusqu'à l'affleurer
// au bout.
const MUR = { ligne: [[-23.925, -9.5], [-23.925, -43.56], [-27.59, -45.85]], ep: 0.45, haut: 2.30, chaperon: 0.12 };
// le treillis vert du plateau continue sur le chaperon (171705 : sept mètres environ, comme le dessinait déjà
// js/court_parc.js drapeau baissé), puis la grille noire basse (C1, C3 : barreaux simples, 1 m)
const TREILLIS = { x: -23.83, z0: -9.55, z1: -16.5, h: 1.75 };
const GRILLE = [[-23.83, -16.5], [-23.83, -43.5], [-27.45, -45.76]];

// Les boîtes des morceaux (repère du terrain 1 : [x0, z0, x1, z1])
const BOITES = { Z02a: [-24.0, -56.2, -3.2, -48.8], Z02b: [-26.5, -58.0, 9.5, -38.0], Z02c: [-28.2, -46.5, -22.5, -9.1] };

// ============================================================================================ petits outils
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function alea(x, z, k = 0) { const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); }
// Une couleur sRGB (#rrggbb) en valeurs linéaires, comme l'attribut `color` des sommets.
function lin(hex) { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; }
// Le multiplicateur qui amène la moyenne linéaire `m` d'une texture du kit (mesurée sur l'image) à la couleur `hex`.
const vers = (hex, m) => { const c = lin(hex); return [c[0] / m[0], c[1] / m[1], c[2] / m[2]]; };
const M_TAILLE = [0.742, 0.7, 0.601], M_MOELLONS = [0.684, 0.621, 0.497], M_BETON = [0.637, 0.605, 0.54];
const M_BRIQUE = [0.313, 0.067, 0.041], M_BOIS = [0.614, 0.616, 0.6];
// La pierre blonde de la façade (R1 : #dcc9a0 au soleil), le gris du perron (#8e8b84), les moellons des pignons
// (#cfc4ae), le chêne patiné de la porte (#6e5238), le béton de l'échiffre et des marches, la terre cuite des bandes.
// (le blond est pris un peu moins saturé que #dcc9a0 : sous le soleil du soir du jeu, la façade sortait ocre, là où la
// photo R1-02 la montre crème ; le chêne de la porte, patiné, tire sur le miel : #8a6a4a en haut de la fourchette de R1)
const BLOND = vers('#dccdaa', M_TAILLE), GRIS_PERRON = vers('#8e8b84', M_TAILLE), PIGNON = vers('#cfc4ae', M_MOELLONS);
const CHENE = vers('#80613f', M_BOIS), BETON_GRIS = vers('#b3afa6', M_BETON), TOIT = vers('#4a4c4f', M_BETON);
const TERRE_CUITE = vers('#9a5e52', M_BRIQUE), CHAPERON = vers('#9d9c96', M_BETON);
// Les peintures (couleur directe : la texture « peinture » du kit est blanche)
const MENUISERIE = lin('#ecebe5'), VITRE = lin('#48535c'), VITRE_RDC = lin('#9a9e9e'), FER_SOMBRE = lin('#2b2b2b');
const AMBRE = lin('#b08a4a'), ZINC = lin('#8f9597'), VERT_TREILLIS = lin('#2a3e31');
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

// Une soustraction d'intervalles : `L` ([[a, b], ...]) privé de [c, d].
function soustraire(L, c, d) {
  const out = [];
  for (const [a, b] of L) {
    if (d <= a || c >= b) { out.push([a, b]); continue; }
    if (c > a) out.push([a, c]);
    if (d < b) out.push([d, b]);
  }
  return out;
}

// UN BLOC aligné sur les axes, de (x0, y0, z0) à (x1, y1, z1), dans la matière `cle` du kit (boîte chanfreinée : les
// joints se lisent à la lumière, sans texture de joint) ; `o` : chanfrein, couleur, uvDecal (lot.boite du kit).
const _m4 = new THREE.Matrix4();
function bloc(lot, cle, x0, x1, y0, y1, z0, z1, o = {}) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  if (w < 0.005 || h < 0.005 || d < 0.002) return;
  _m4.makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  lot.boite(cle, w, h, d, _m4, { chanfrein: o.chanfrein ?? 0, couleur: o.couleur, uvDecal: o.uvDecal, bande: o.bande });
}
// UN POLYGONE de la façade [[x, y], ...] (vu de face : x à droite, y en haut ; dans n'importe quel sens) EXTRUDÉ en
// profondeur de z0 à z1 : ses deux faces et ses flancs (lot.prisme du kit, le long de +z : S = -x, U = +y).
function extruder(lot, cle, poly, z0, z1, o = {}) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; }
  const ccw = a > 0 ? poly : poly.slice().reverse();
  const pr = ccw.map(([x, y]) => [-x, y]).reverse();
  lot.prisme(cle, pr, [[0, 0, z0], [0, 0, z1]], { haut: [0, 1, 0], couleur: o.couleur, bande: o.bande, uDecal: o.uDecal, vDecal: o.vDecal });
}
// Un quadrilatère plan (points 3D dans l'ordre du tour), normale `n`, couleur `c`, UV projetées (tuile `t`).
function quad(lot, cle, P, n, c, o = {}) { lot.polygone(cle, P, n, { couleur: c, tuile: o.tuile, uv: o.uv }); }

// ============================================================================================ la pierre de la façade
// La couleur d'un bloc de la façade (multiplicateur de la matière « taille » du kit) : le blond de la pierre, la teinte
// propre du bloc (`t`, une pierre n'est jamais de la même carrière que sa voisine ; quelques blocs de réparation, plus
// clairs et moins jaunes : R1 § 2.1), des taches lentes, le PIED verdi et assombri par les rejaillissements, et les
// COULURES grises (#7b776c) qui descendent de la corniche et, plus courtes, du bandeau. `Y0` : le pavé.
function pierre(kit, Y0, t = 1, reparation = false) {
  const out = [0, 0, 0];
  return (x, y, z) => {
    const h = y - Y0;
    const tache = 1 + 0.12 * (kit.bruit(x * 0.45 + z * 0.3, y * 0.55, 3) - 0.5);
    const pied = 1 - lisse(0.15, 1.1, h);
    const cc = Math.max(0, kit.bruit(x * 1.6, 0.5, 5) * 1.7 - 0.75);
    const sousCorniche = h < 12.62 ? cc * Math.exp(-(12.62 - h) / 1.5) : 0;
    const sousBandeau = h < 5.0 && h > 3.0 ? 0.55 * cc * Math.exp(-(5.0 - h) / 0.7) : 0;
    const c = Math.min(0.65, sousCorniche + sousBandeau), k = t * tache;
    out[0] = BLOND[0] * k * (1 - 0.3 * pied) * (1 - 0.45 * c);
    out[1] = BLOND[1] * k * (1 - 0.2 * pied) * (1 - 0.38 * c);
    out[2] = BLOND[2] * k * (1 - 0.16 * pied) * (1 - 0.18 * c);
    if (reparation) { out[0] *= 1.05; out[1] *= 1.08; out[2] *= 1.16; }
    return out;
  };
}
// La teinte d'un bloc tirée de sa place (déterministe) : [teinte, réparation]
function teinteBloc(x, y, k) { const a = alea(x, y, k); return [0.92 + 0.13 * alea(y, x, k + 1), a < 0.06]; }

// L'APPAREIL D'UN TRUMEAU : des blocs de 0,9 à 1,3 m sur des assises de 0,5 m (R1 : lits d'environ 0,5 m à joints
// fins), joints montants croisés d'une assise à l'autre, taillés autour des `trous` (baies, chambranles, clés, appuis :
// rectangles [x0, x1, y0, y1], y absolus). Face des blocs au nu (z = FA.z), 7 cm d'épaisseur.
// GÉNÉRATEUR : il rend la main toutes les deux assises quand `budget()` le demande (un trumeau entier : 8 à 16 ms).
function* appareil(kit, lot, Y0, xa, xb, ya, yb, trous, graine, budget = () => false) {
  const n = Math.max(1, Math.round((yb - ya) / 0.5)), hr = (yb - ya) / n, zF = FA.z;
  for (let r = 0; r < n; r++) {
    if ((r & 1) && budget()) yield;
    const y0 = ya + r * hr, y1 = y0 + hr;
    const T = trous.filter((t) => t[2] < y1 - 1e-4 && t[3] > y0 + 1e-4 && t[1] > xa && t[0] < xb);
    const xs = [xa, xb];
    for (const t of T) { if (t[0] > xa && t[0] < xb) xs.push(t[0]); if (t[1] > xa && t[1] < xb) xs.push(t[1]); }
    xs.sort((a, b) => a - b);
    const dec = (r % 2) * 0.55 + 0.25 * alea(r, graine, 3);
    for (let i = 0; i + 1 < xs.length; i++) {
      const c0 = xs[i], c1 = xs[i + 1];
      if (c1 - c0 < 0.01) continue;
      const cm = (c0 + c1) / 2;
      let libres = [[y0, y1]];
      for (const t of T) if (t[0] <= cm && t[1] >= cm) libres = soustraire(libres, t[2], t[3]);
      for (const [s0, s1] of libres) {
        if (s1 - s0 < 0.03) continue;
        const joints = [c0];
        for (let x = xa - 2.2 + dec; x < c1 - 0.25; x += 0.9 + 0.4 * alea(Math.round(x * 100), r + graine, 4)) if (x > c0 + 0.25) joints.push(x);
        joints.push(c1);
        for (let j = 0; j + 1 < joints.length; j++) {
          const [t, rep] = teinteBloc(joints[j], s0, graine);
          bloc(lot, 'taille', joints[j], joints[j + 1], s0, s1, zF - 0.07, zF, { chanfrein: 0.008, couleur: pierre(kit, Y0, t, rep),
            uvDecal: [alea(joints[j], s0, 5) * 3, alea(s0, joints[j], 6) * 3] });
        }
      }
    }
  }
}

// ============================================================================================ les baies
// UNE FENÊTRE d'une travée (R1 § 2.1) : baie de LF m de `y0` à `y1` (absolus), centrée en `xc` ; CHAMBRANLE plat de
// 22 cm en saillie de 6 cm, à CROSSETTES (oreilles aux angles du haut, rez-de-chaussée), CLÉ (trapèze, `cle` :
// [largeur en bas, en haut, hauteur, saillie]), APPUI saillant, ALLÈGE à table (rez-de-chaussée) ; TABLEAUX de 24 cm ; la
// MENUISERIE blanc cassé à deux vantaux, quatre carreaux de large et `rangs` rangs, vitres `verre`. Rend les trous
// qu'elle fait dans l'appareil. (Relecture sur la photo R1-02 : des chambranles de 18 cm en saillie de 4,5 cm ne se
// lisaient plus sous le soleil rasant de face ; ils sont plus larges, plus saillants et un peu plus clairs que le mur.)
function fenetre(kit, lot, Y0, xc, y0, y1, o = {}) {
  const zF = FA.z, w = LF / 2, ch = o.cadre ?? 0.22, pier = pierre(kit, Y0, 1.08), trous = [];
  const x0 = xc - w, x1 = xc + w;
  // le chambranle : deux montants et le linteau (des blocs du nu -7 cm à +6 cm)
  const cad = { chanfrein: 0.014, couleur: pier };
  bloc(lot, 'taille', x0 - ch, x0, y0, y1 + ch, zF - 0.07, zF + 0.06, cad);
  bloc(lot, 'taille', x1, x1 + ch, y0, y1 + ch, zF - 0.07, zF + 0.06, cad);
  bloc(lot, 'taille', x0, x1, y1, y1 + ch, zF - 0.07, zF + 0.06, cad);
  trous.push([x0 - ch, x1 + ch, y0, y1 + ch]);
  // un filet en relief sur le chambranle (la moulure qui dessine le cadre)
  for (const [a, b, c, d] of [[x0 - ch + 0.06, x0 - 0.06, y0, y1 + ch - 0.06], [x1 + 0.06, x1 + ch - 0.06, y0, y1 + ch - 0.06], [x0 - 0.06, x1 + 0.06, y1 + 0.06, y1 + ch - 0.06]]) {
    bloc(lot, 'taille', a, b, c, d, zF + 0.055, zF + 0.075, { couleur: pier });
  }
  // les crossettes : aux deux angles du haut, le chambranle déborde de 9 cm sur 24 cm de haut
  if (o.crossettes) {
    for (const [a, b] of [[x0 - ch - 0.09, x0 - ch], [x1 + ch, x1 + ch + 0.09]]) {
      bloc(lot, 'taille', a, b, y1 + ch - 0.24, y1 + ch, zF - 0.07, zF + 0.06, cad);
      trous.push([a, b, y1 + ch - 0.24, y1 + ch]);
    }
  }
  // la clé : un trapèze posé sur le linteau
  if (o.cle) {
    const [lb, lh, hc, sc] = o.cle, yb = y1 + ch - 0.02;
    extruder(lot, 'taille', [[xc - lb / 2, yb], [xc + lb / 2, yb], [xc + lh / 2, yb + hc], [xc - lh / 2, yb + hc]], zF - 0.07, zF + sc, { couleur: pierre(kit, Y0, 1.05) });
    // (le trou prend la largeur du bas : les pierres voisines passent derrière les flancs évasés de la clé)
    trous.push([xc - lb / 2, xc + lb / 2, yb, yb + hc]);
  }
  // l'appui : une pierre qui déborde de 14 cm, 12 cm de large de plus que le chambranle de chaque côté
  if (o.appui !== false) {
    bloc(lot, 'taille', x0 - ch - 0.1, x1 + ch + 0.1, y0 - 0.1, y0, zF - 0.07, zF + 0.14, { chanfrein: 0.015, couleur: pierre(kit, Y0, 0.97) });
    trous.push([x0 - ch - 0.1, x1 + ch + 0.1, y0 - 0.1, y0]);
  }
  // l'allège à table : un cadre de 5 cm en léger relief sous l'appui
  if (o.allege) {
    const a0 = x0 - 0.02, a1 = x1 + 0.02, b0 = Y0 + H.socle + 0.12, b1 = y0 - 0.16, e = 0.05;
    for (const [a, b, c, d] of [[a0, a1, b0, b0 + e], [a0, a1, b1 - e, b1], [a0, a0 + e, b0, b1], [a1 - e, a1, b0, b1]]) bloc(lot, 'taille', a, b, c, d, zF - 0.01, zF + 0.018, { couleur: pier });
  }
  // les tableaux : la pierre retourne dans l'épaisseur du mur, plus sombre au fond
  const t = 0.24, tb = mul(BLOND, 0.78);
  quad(lot, 'taille', [[x0, y0, zF], [x0, y1, zF], [x0, y1, zF - t], [x0, y0, zF - t]], [1, 0, 0], tb);
  quad(lot, 'taille', [[x1, y0, zF], [x1, y0, zF - t], [x1, y1, zF - t], [x1, y1, zF]], [-1, 0, 0], tb);
  quad(lot, 'taille', [[x0, y1, zF], [x1, y1, zF], [x1, y1, zF - t], [x0, y1, zF - t]], [0, -1, 0], mul(tb, 0.8));
  quad(lot, 'taille', [[x0, y0, zF], [x0, y0, zF - t], [x1, y0, zF - t], [x1, y0, zF]], [0, 1, 0], tb);
  // la menuiserie, au fond du tableau
  menuiserie(lot, x0, x1, y0, y1, zF - 0.2, o.rangs ?? 5, o.verre || VITRE);
  return trous;
}
// UNE MENUISERIE à deux vantaux et petits bois (quatre carreaux de large, `rangs` de haut), à `zm` (m) ; la vitre derrière.
function menuiserie(lot, x0, x1, y0, y1, zm, rangs, verre) {
  const uvVerre = (x, y, z, out) => { out[0] = 0.57; out[1] = y; };
  lot.polygone('peinture', [[x0, y0, zm - 0.015], [x1, y0, zm - 0.015], [x1, y1, zm - 0.015], [x0, y1, zm - 0.015]], [0, 0, 1], { couleur: verre, uv: uvVerre });
  const B = (a, b, w, e) => lot.barre(a, b, w, e, { couleur: MENUISERIE, haut: Math.abs(a[1] - b[1]) > 1e-6 ? [0, 0, 1] : [0, 1, 0] });
  const d = 0.055;
  // le dormant (6 cm) et le meneau du milieu (les deux vantaux)
  B([x0 + d / 2, y0, zm], [x0 + d / 2, y1, zm], d, 0.05);
  B([x1 - d / 2, y0, zm], [x1 - d / 2, y1, zm], d, 0.05);
  lot.barre([x0, y1 - d / 2, zm], [x1, y1 - d / 2, zm], 0.05, d, { couleur: MENUISERIE, haut: [0, 1, 0] });
  lot.barre([x0, y0 + 0.04, zm + 0.005], [x1, y0 + 0.04, zm + 0.005], 0.06, 0.08, { couleur: MENUISERIE, haut: [0, 1, 0] });
  const xm = (x0 + x1) / 2;
  B([xm, y0, zm + 0.005], [xm, y1, zm + 0.005], 0.07, 0.06);
  // les petits bois : un montant au milieu de chaque vantail, une traverse par rang
  for (const x of [(x0 + xm) / 2, (xm + x1) / 2]) B([x, y0, zm], [x, y1, zm], 0.024, 0.03);
  for (let r = 1; r < rangs; r++) {
    const y = y0 + ((y1 - y0) * r) / rangs;
    lot.barre([x0, y, zm], [x1, y, zm], 0.03, 0.024, { couleur: MENUISERIE, haut: [0, 1, 0] });
  }
}

// ============================================================================================ la façade (Z02a)
function* facade(ctx) {
  const { kit, groupe } = ctx, mobile = !!ctx.mobile, budget = ctx.budget || (() => false);
  const Y0 = kit.sol(FA.xc, -48.6), Y = (h) => Y0 + h, zF = FA.z;
  // (trois lots, cousus chacun à la fin de sa partie : un seul, de 26 000 triangles, prenait 12 ms à coudre d'un tenant)
  let lot = new kit.Lot('façade Charras · baies');
  const { x0, x1, xc } = FA;
  const trous = [];

  // ---- 1. LES BAIES des travées latérales : rez-de-chaussée (crossettes, clé trapézoïdale qui monte dans le bandeau,
  // allège à table), 1er et 2e (chambranle plat, petite clé)
  for (const T of [TR.gauche, TR.droite]) {
    const xm = (T[0] + T[1]) / 2;
    trous.push(...fenetre(kit, lot, Y0, xm, Y(H.rdc[0]), Y(H.rdc[1]), { crossettes: true, cle: [0.24, 0.36, H.bandeau[0] - H.rdc[1] - 0.16, 0.085], allege: true, rangs: 5, verre: VITRE_RDC }));
    if (budget()) yield;
    trous.push(...fenetre(kit, lot, Y0, xm, Y(H.premier[0]), Y(H.premier[1]), { cadre: 0.2, cle: [0.2, 0.28, 0.32, 0.08], rangs: 4 }));
    if (budget()) yield;
    trous.push(...fenetre(kit, lot, Y0, xm, Y(H.second[0]), Y(H.second[1]), { cadre: 0.2, cle: [0.2, 0.28, 0.32, 0.08], rangs: 4 }));
    if (budget()) yield;
  }

  // ---- 2. LA TRAVÉE CENTRALE : la porte en plein cintre, son archivolte et sa clé en cartouche ; la fenêtre centrale sur
  // son appui porté par deux consoles à volutes, et sa petite corniche
  const yN = Y(H.naissance), yS = Y(H.seuil);
  const pierC = pierre(kit, Y0, 1.03);
  // l'archivolte : les deux montants moulurés, puis l'arc (un profil balayé le long du demi-cercle, au milieu de la bande)
  for (const [a, b] of [[xc - RA, xc - RP], [xc + RP, xc + RA]]) {
    bloc(lot, 'taille', a, b, yS - 0.02, yN, zF - 0.07, zF + 0.04, { chanfrein: 0.012, couleur: pierC });
    bloc(lot, 'taille', a + 0.05, b - 0.05, yS - 0.02, yN, zF + 0.035, zF + 0.06, { couleur: pierC });
  }
  const arc = (r, n = 24) => { const P = []; for (let i = 0; i <= n; i++) { const t = Math.PI - (Math.PI * i) / n; P.push([xc + Math.cos(t) * r, yN + Math.sin(t) * r]); } return P; };
  const rm = (RP + RA) / 2, lb = (RA - RP) / 2;
  lot.prisme('taille', [[-lb, -0.07], [lb, -0.07], [lb, 0.04], [lb - 0.05, 0.04], [lb - 0.05, 0.06], [-lb + 0.05, 0.06], [-lb + 0.05, 0.04], [-lb, 0.04]],
    arc(rm, mobile ? 16 : 28).map(([x, y]) => [x, y, zF]), { haut: [0, 0, 1], couleur: pierC });
  // les écoinçons : la pierre entre l'arc et le rectangle de la baie (deux blocs taillés en quart de lune)
  // (le coin du rectangle, le haut de la baie, puis l'extrados de l'arc, 2 cm sous le bord de l'archivolte qui le couvre)
  for (const s of [-1, 1]) {
    const P = [[xc + s * RA, yN], [xc + s * RA, yN + RA], [xc, yN + RA]];
    for (let i = 1; i <= 10; i++) { const t = (Math.PI / 2) * (i / 10); P.push([xc + s * Math.sin(t) * (RA - 0.02), yN + Math.cos(t) * (RA - 0.02)]); }
    extruder(lot, 'taille', P, zF - 0.07, zF, { couleur: pierre(kit, Y0, 0.99) });
  }
  trous.push([xc - RA, xc + RA, yS - 0.02, yN + RA]);
  if (budget()) yield;
  // la clé en cartouche (R1-02b : sculptée de feuilles d'acanthe, elle monte toucher le panneau sous l'appui de la
  // fenêtre centrale) : un trapèze en fort relief, un médaillon ovale bombé, des feuilles de part et d'autre, un bandeau
  // et deux enroulements. La sculpture est patinée (plus grise que le mur) et ses creux sont sombres : sous le soleil
  // rasant de face, c'est la couleur qui la dessine, pas l'ombre (relecture : une clé couleur de mur ne se voyait plus)
  const yk = yN + RP - 0.06, yk1 = Y(H.appuiCentre) - 0.82, ykm = (yk + yk1) / 2;
  const sculpte = (k = 1) => (x, y, z, nx, ny, nz) => { const c = pierre(kit, Y0, 0.9 * k)(x, y, z), f = nz > 0.7 ? 1 : 0.62; return [c[0] * f * 0.94, c[1] * f * 0.95, c[2] * f * 1.02]; };
  extruder(lot, 'taille', [[xc - 0.24, yk], [xc + 0.24, yk], [xc + 0.36, yk1], [xc - 0.36, yk1]], zF - 0.07, zF + 0.16, { couleur: sculpte() });
  bloc(lot, 'taille', xc - 0.42, xc + 0.42, yk1, yk1 + 0.11, zF - 0.07, zF + 0.2, { chanfrein: 0.02, couleur: pierre(kit, Y0, 1.0) });
  {
    const med = new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI);
    lot.geo('taille', med, new THREE.Matrix4().makeScale(0.15, 0.23, 0.08).premultiply(new THREE.Matrix4().makeTranslation(xc, ykm + 0.05, zF + 0.16)), { couleur: sculpte(1.08), uvBoite: true });
    med.dispose();
  }
  {
    // le cadre du médaillon (un anneau ovale en relief) et les deux enroulements du haut
    const cadre = new THREE.TorusGeometry(1, 0.13, 6, 24);
    lot.geo('taille', cadre, new THREE.Matrix4().makeScale(0.18, 0.27, 0.35).premultiply(new THREE.Matrix4().makeTranslation(xc, ykm + 0.05, zF + 0.17)), { couleur: sculpte(1.0), uvBoite: true });
    cadre.dispose();
  }
  for (const s of [-1, 1]) {
    lot.tour('taille', [[0.001, -0.08], [0.08, -0.07], [0.095, 0], [0.07, 0.07], [0.001, 0.08]], 8,
      new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(xc + s * 0.3, yk1 - 0.1, zF + 0.14)), { couleur: sculpte(1.05) });
  }
  // (les trous de l'appareil prennent la largeur du BAS du trapèze : les pierres passent derrière ses flancs évasés)
  trous.push([xc - 0.24, xc + 0.24, yk, yk1], [xc - 0.42, xc + 0.42, yk1, yk1 + 0.11]);
  // les tableaux de la porte (35 cm) : jambages, puis l'intrados de l'arc
  const tp = 0.35, tb = mul(BLOND, 0.72);
  quad(lot, 'taille', [[xc - RP, yS, zF], [xc - RP, yN, zF], [xc - RP, yN, zF - tp], [xc - RP, yS, zF - tp]], [1, 0, 0], tb);
  quad(lot, 'taille', [[xc + RP, yS, zF], [xc + RP, yS, zF - tp], [xc + RP, yN, zF - tp], [xc + RP, yN, zF]], [-1, 0, 0], tb);
  {
    const A = arc(RP, mobile ? 16 : 28), p = lot.part('taille'), tu = kit.TUILES.taille;
    let prec = null;
    for (const [x, y] of A) {
      const nx = -(x - xc) / RP, ny = -(y - yN) / RP;
      const v = [lot.s(p, x, y, zF, nx, ny, 0, x / tu, 0, tb), lot.s(p, x, y, zF - tp, nx, ny, 0, x / tu, tp / tu, mul(tb, 0.85))];
      if (prec) lot.quad(p, prec[0], v[0], v[1], prec[1]);
      prec = v;
    }
  }
  if (budget()) yield;
  // la porte elle-même, au fond du tableau
  porte(kit, lot, Y0, zF - 0.3);
  if (budget()) yield;
  // la fenêtre centrale : consoles, appui, panneau, baie, corniche
  const yA = Y(H.appuiCentre);
  for (const s of [-1, 1]) {
    const pr = [[0, yA - 0.84], [0.05, yA - 0.84], [0.11, yA - 0.81], [0.13, yA - 0.74], [0.1, yA - 0.66], [0.1, yA - 0.5], [0.14, yA - 0.34], [0.2, yA - 0.2], [0.26, yA - 0.12], [0.27, yA - 0.04], [0.26, yA], [0, yA]];
    const xk = xc + s * 0.98;
    lot.prisme('taille', pr, [[xk - 0.085, 0, zF], [xk + 0.085, 0, zF]], { vertical: true, couleur: pierre(kit, Y0, 1.04) });
  }
  // (le prisme des consoles est tiré le long de +x : S = +z, U = +y ; son profil est en (profondeur, hauteur))
  bloc(lot, 'taille', xc - 1.22, xc + 1.22, yA, yA + 0.14, zF - 0.07, zF + 0.29, { chanfrein: 0.02, couleur: pierre(kit, Y0, 0.98) });
  trous.push([xc - 1.22, xc + 1.22, yA, yA + 0.14]);
  for (const [a, b, c, d] of [[xc - 0.82, xc + 0.82, yA - 0.72, yA - 0.66], [xc - 0.82, xc + 0.82, yA - 0.12, yA - 0.06], [xc - 0.82, xc - 0.76, yA - 0.72, yA - 0.06], [xc + 0.76, xc + 0.82, yA - 0.72, yA - 0.06]]) {
    bloc(lot, 'taille', a, b, c, d, zF - 0.01, zF + 0.02, { couleur: pierC });
  }
  trous.push(...fenetre(kit, lot, Y0, xc, Y(H.centre[0]), Y(H.centre[1]), { cadre: 0.2, appui: false, rangs: 5 }));
  const yCo = Y(H.centre[1]) + 0.2;
  lot.prisme('taille', [[-0.07, yCo], [0.1, yCo], [0.1, yCo + 0.04], [0.17, yCo + 0.11], [0.17, yCo + 0.2], [-0.07, yCo + 0.2]],
    [[xc - 1.16, 0, zF], [xc + 1.16, 0, zF]], { vertical: true, couleur: pierre(kit, Y0, 1.02) });
  trous.push([xc - 1.16, xc + 1.16, yCo, yCo + 0.2]);
  // les plaques à droite de la porte (R1-03 : le nom du monument, gris clair ; « monument historique », gris métal et
  // logo bordeaux), vers 1,6 à 2 m
  const xp = xc + RA + 0.13;
  bloc(lot, 'peinture', xp - 0.125, xp + 0.125, Y(1.92), Y(2.04), zF, zF + 0.012, { couleur: lin('#c9c8c2'), bande: true });
  bloc(lot, 'peinture', xp - 0.15, xp + 0.15, Y(1.5), Y(1.8), zF, zF + 0.012, { couleur: lin('#7f8385'), bande: true });
  bloc(lot, 'peinture', xp - 0.07, xp + 0.07, Y(1.58), Y(1.72), zF + 0.012, zF + 0.016, { couleur: lin('#7a2430'), bande: true });
  yield;
  groupe.add(lot.maillages('façade Charras · baies'));
  lot = new kit.Lot('façade Charras · appareil');
  yield;

  // ---- 3. LE SOCLE, LES PILASTRES À REFENDS, L'APPAREIL DES TRUMEAUX
  // le socle : une assise de 42 cm, en légère saillie, enterrée (le pavé descend de 0,8 m vers le quai)
  for (let x = x0; x < x1 - 0.01;) {
    const L = Math.min(x1 - x, 1.2 + 0.5 * alea(x, 7, 8)), [t] = teinteBloc(x, 0.2, 9);
    bloc(lot, 'taille', x, x + L, Y0 - 0.6, Y(H.socle), zF - 0.07, zF + 0.05, { chanfrein: 0.015, couleur: pierre(kit, Y0, t * 0.97), uvDecal: [alea(x, 1, 10) * 3, 0.2] });
    x += L;
  }
  // les pilastres : refends continus (assises de 37 cm, joints en creux de 3 à 4 cm : le chanfrein des blocs), saillie de
  // 9 cm ; ceux d'angle retournent sur le pignon (leurs blocs font 59 cm de profondeur)
  const nR = Math.round((H.frise[0] - H.socle) / 0.374), hR = (H.frise[0] - H.socle) / nR;
  for (const P of PILASTRES) {
    const angle = P === TR.angleG || P === TR.angleD;
    bloc(lot, 'taille', P[0], P[1], Y0 - 0.6, Y(H.socle), zF - (angle ? 0.5 : 0.1), zF + 0.13, { chanfrein: 0.02, couleur: pierre(kit, Y0, 0.96) });
    for (let r = 0; r < nR; r++) {
      const ya = Y(H.socle + r * hR), yb = ya + hR;
      if (ya > Y(H.bandeau[0]) - 0.05 && yb < Y(H.bandeau[1]) + 0.05) continue;
      const [t, rep] = teinteBloc(P[0], ya, 11);
      bloc(lot, 'taille', P[0], P[1], ya, yb, zF - (angle ? 0.5 : 0.1), zF + 0.09, { chanfrein: 0.034, couleur: pierre(kit, Y0, t, rep),
        uvDecal: [alea(P[0], r, 12) * 3, alea(r, P[0], 13) * 3] });
    }
    if (budget()) yield;
  }
  // l'appareil lisse des trumeaux (travées latérales, travée centrale), du socle à la frise
  const trumeaux = [TR.gauche, TR.centre, TR.droite];
  for (let i = 0; i < trumeaux.length; i++) {
    const T = trumeaux[i];
    yield* appareil(kit, lot, Y0, T[0], T[1], Y(H.socle), Y(H.frise[0]), trous, 20 + i * 7, budget);
    if (budget()) yield;
  }
  yield;
  groupe.add(lot.maillages('façade Charras · appareil'));
  lot = new kit.Lot('façade Charras · corniches et volume');
  yield;

  // ---- 4. LE BANDEAU (arrêté de part et d'autre par l'archivolte de la porte, qui monte au travers : R1-02), LA FRISE,
  // LA CORNICHE (et leurs retours sur les pignons)
  const bandeau = [[-0.05, Y(H.bandeau[0])], [0.16, Y(H.bandeau[0])], [0.16, Y(H.bandeau[0]) + 0.05], [0.21, Y(H.bandeau[0]) + 0.14], [0.21, Y(H.bandeau[1]) - 0.06], [0.18, Y(H.bandeau[1])], [-0.05, Y(H.bandeau[1])]];
  lot.prisme('taille', bandeau, [[x0, 0, zF - 0.55], [x0, 0, zF], [xc - RA + 0.02, 0, zF]], { vertical: true, couleur: pierre(kit, Y0, 1.02) });
  lot.prisme('taille', bandeau, [[xc + RA - 0.02, 0, zF], [x1, 0, zF], [x1, 0, zF - 0.55]], { vertical: true, couleur: pierre(kit, Y0, 1.02) });
  bloc(lot, 'taille', x0, x1, Y(H.frise[0]), Y(H.frise[1]), zF - 0.55, zF + 0.09, { chanfrein: 0.012, couleur: pierre(kit, Y0, 1.0) });
  // (le profil : un filet, une moulure de lit, le LARMIER — dessous plat, face droite, R1-02a : « à doucine et larmier » —
  // puis la doucine du haut ; le dessous du larmier, tourné vers le sol, fait la ligne sombre qui dessine la corniche)
  // (relecture : la saillie ramenée de 68 à 50 cm, R1-02a : « corniche d'environ 0,5 m » ; à 68 cm, elle cachait le
  // tympan à qui la regardait de la placette)
  const pc = [[-0.3, H.frise[1]], [0.0, H.frise[1]], [0.05, 12.64], [0.05, 12.72], [0.11, 12.78], [0.15, 12.88], [0.17, 12.95], [0.41, 12.98],
    [0.42, 13.02], [0.42, 13.4], [0.45, 13.46], [0.46, 13.55], [0.49, 13.68], [0.5, 13.76], [0.5, H.corniche], [-0.3, H.corniche]];
  const corniche = pc.map(([s, h]) => [s, Y(h)]);
  // (la corniche est tirée sur la face de la frise, à 9 cm du nu, et retourne d'un mètre sur chaque pignon : C2)
  const ret = [[x0 - 0.0, 0, zF - 1.0], [x0, 0, zF + 0.09], [x1, 0, zF + 0.09], [x1, 0, zF - 1.0]];
  // (les dessus, où se posent la suie et les pigeons, plus sombres ; les dessous — le larmier — dans leur ombre propre :
  // sous le soleil rasant de face, c'est ce qui dessine la corniche)
  lot.prisme('taille', corniche, ret, { vertical: true, couleur: (x, y, z, nx, ny) => { const c = pierre(kit, Y0, 1.0)(x, y, z); const k = ny > 0.5 ? 0.8 : ny < -0.3 ? 0.58 : 1; return [c[0] * k, c[1] * k, c[2] * k]; } });
  yield;

  // ---- 5. LE FRONTON : corniche rampante, tympan (sa sculpture : js ci-dessous), mur du fronton vu de derrière
  const yC = Y(H.corniche), yT = Y(H.sommet);
  // (relecture, sur C4 : la corniche rampante fait le cinquième de la hauteur du tympan, pas le tiers ; amincie de 55
  // à 46 cm, sa saillie de 57 à 49 cm — le tympan visible y gagne 9 cm, voir TY)
  const rampant = [[-0.62, -0.46], [0.1, -0.46], [0.13, -0.42], [0.16, -0.37], [0.4, -0.35], [0.41, -0.32], [0.41, -0.1], [0.45, -0.06], [0.49, 0.0], [0.49, 0.02], [-0.62, 0.02]];
  lot.prisme('taille', rampant, [[x0 - 0.05, yC, zF + 0.03], [xc, yT, zF + 0.03], [x1 + 0.05, yC, zF + 0.03]], { vertical: true,
    couleur: (x, y, z, nx, ny) => { const c = pierre(kit, Y0, 0.98)(x, y, z); const k = ny > 0.5 ? 0.62 + 0.25 * kit.bruit(x * 2, z * 3, 17) : ny < -0.3 ? 0.58 : 1; return [c[0] * k, c[1] * k, c[2] * k * 0.97]; } });
  // le mur du fronton et de l'attique, vu de derrière (au-dessus du toit)
  const zB = zF - FA.ep, dos = mul(BLOND, 0.84);
  lot.polygone('taille', [[x0, Y(12.3), zB], [x1, Y(12.3), zB], [x1, yC, zB], [xc, yT, zB], [x0, yC, zB]], [0, 0, -1], { couleur: dos });
  if (budget()) yield;
  groupe.add(yield* tympan(ctx, Y0));
  yield;

  // ---- 6. LE VOLUME DERRIÈRE : pignons aveugles en moellons, mur arrière, toit plat, couronnement de zinc, descente d'eau
  // (les pignons partent de l'intérieur des pilastres d'angle, dont les blocs retournent de 50 cm : pas de fente entre
  // eux ; le toit passe sous le mur de l'attique)
  const bas = -2.6, hAv = Y(12.95), hAr = Y(12.45), zAv = zF - 0.45;
  const mo = (x, y, z) => {
    const h = y - bas, c = Math.max(0, kit.bruit((x + z) * 1.3, 0.5, 21) * 1.6 - 0.7) * Math.exp(-(hAv - y) / 1.8);
    const t = 1 + 0.1 * (kit.bruit(x * 0.4 + z * 0.4, y * 0.5, 22) - 0.5);
    return [PIGNON[0] * t * (1 - 0.35 * c), PIGNON[1] * t * (1 - 0.32 * c), PIGNON[2] * t * (1 - 0.25 * c)];
  };
  const tuM = kit.TUILES.moellons;
  const uvZ = (x, y, z, out) => { out[0] = z / tuM; out[1] = y / tuM; }, uvX = (x, y, z, out) => { out[0] = x / tuM; out[1] = y / tuM; };
  lot.polygone('moellons', [[FA.xb0, bas, zAv], [FA.xb0, bas, FA.zDos], [FA.xb0, hAr, FA.zDos], [FA.xb0, hAv, zAv]], [-1, 0, 0], { couleur: mo, uv: uvZ });
  lot.polygone('moellons', [[FA.xb1, bas, zAv], [FA.xb1, hAv, zAv], [FA.xb1, hAr, FA.zDos], [FA.xb1, bas, FA.zDos]], [1, 0, 0], { couleur: mo, uv: uvZ });
  lot.polygone('moellons', [[FA.xb0, bas, FA.zDos], [FA.xb1, bas, FA.zDos], [FA.xb1, hAr, FA.zDos], [FA.xb0, hAr, FA.zDos]], [0, 0, -1], { couleur: mo, uv: uvX });
  if (budget()) yield;
  // le toit plat, gris foncé, sous le couronnement ; deux édicules de ventilation (R1-23)
  lot.polygone('beton', [[FA.xb0, Y(12.3), zAv], [FA.xb1, Y(12.3), zAv], [FA.xb1, Y(12.3), FA.zDos], [FA.xb0, Y(12.3), FA.zDos]], [0, 1, 0], { couleur: TOIT });
  bloc(lot, 'beton', -18.4, -17.6, Y(12.3), Y(12.95), -54.1, -53.4, { chanfrein: 0.02, couleur: mul(BETON_GRIS, 0.95) });
  bloc(lot, 'beton', -9.9, -9.3, Y(12.3), Y(12.8), -54.6, -54.0, { chanfrein: 0.02, couleur: mul(BETON_GRIS, 0.9) });
  // le couronnement de zinc des pignons et du mur arrière (C1, C2 : légèrement en pente vers l'arrière)
  const zc = [[-0.3, -0.06], [0.3, -0.06], [0.3, 0.03], [-0.3, 0.03]];
  lot.prisme('peinture', zc, [[FA.xb0 + 0.2, hAv, zAv], [FA.xb0 + 0.2, hAr, FA.zDos + 0.2]], { haut: [0, 1, 0], bande: true, couleur: ZINC });
  lot.prisme('peinture', zc, [[FA.xb1 - 0.2, hAv, zAv], [FA.xb1 - 0.2, hAr, FA.zDos + 0.2]], { haut: [0, 1, 0], bande: true, couleur: ZINC });
  lot.prisme('peinture', zc, [[FA.xb0 + 0.2, hAr, FA.zDos + 0.2], [FA.xb1 - 0.2, hAr, FA.zDos + 0.2]], { haut: [0, 1, 0], bande: true, couleur: ZINC });
  // la descente d'eau grise à l'angle arrière x+ (C1)
  const xd = FA.xb1 + 0.09, zd = FA.zDos + 0.16, yd0 = kit.sol(xd + 0.3, zd) - 0.1;
  lot.barre([xd, yd0, zd], [xd, hAr - 0.1, zd], 0.1, 0.1, { couleur: ZINC, haut: [0, 0, 1] });
  lot.barre([xd, hAr - 0.1, zd], [xd - 0.25, hAr - 0.02, zd], 0.08, 0.08, { couleur: ZINC, haut: [0, 1, 0] });
  bloc(lot, 'peinture', xd - 0.1, xd + 0.1, hAr - 0.35, hAr - 0.1, zd - 0.1, zd + 0.1, { couleur: ZINC, bande: true });
  yield;

  // ---- 7. LE PERRON : quatre marches de pierre grise qui s'évasent (8 m en bas, 5,3 m en haut), le palier devant la
  // porte ; les nez plus clairs (usés), le pied plus sombre
  for (let k = 0; k < 4; k++) {
    const W = PERRON.largeurs[k] / 2, zA = PERRON.zBas - PERRON.giron * k, yt = Y0 + PERRON.haut * (k + 1);
    bloc(lot, 'taille', xc - W, xc + W, Y0 - 0.35, yt, zF, zA, { chanfrein: 0.014,
      couleur: (x, y, z) => { const n = z > zA - 0.06 && y > yt - 0.05 ? 1.14 : 1, f = (0.93 + 0.1 * kit.bruit(x * 1.3, z * 2 + k, 31)) * n * (0.8 + 0.2 * lisse(Y0 - 0.1, Y0 + 0.2, y)); return mul(GRIS_PERRON, f); },
      uvDecal: [k * 0.37, k * 0.53] });
  }
  yield;
  groupe.add(lot.maillages('façade Charras · corniches et volume'));
}

// LA PORTE (R1-02b) : deux vantaux de chêne patiné à grand panneau haut et panneau bas à losange, une imposte de bois à
// deux panneaux, puis l'imposte vitrée en éventail (huit secteurs, demi-cercle intérieur, cadre sombre, un carreau
// ambré). `zp` : le plan de la porte, au fond du tableau.
function porte(kit, lot, Y0, zp) {
  const xc = FA.xc, yS = Y0 + H.seuil, yV = Y0 + H.vantaux, yN = Y0 + H.naissance;
  const chene = (k = 1) => (x, y, z) => mul(CHENE, k * (0.88 + 0.22 * kit.bruit(x * 3, y * 0.7, 41)));
  bloc(lot, 'bois', xc - RP, xc + RP, yS, yN, zp - 0.06, zp, { couleur: chene(0.9) });
  // les cadres des vantaux, le battement du milieu, la traverse sous l'imposte
  const e = 0.13;
  for (const [a, b, c, d] of [[xc - RP, xc - RP + e, yS, yV], [xc + RP - e, xc + RP, yS, yV], [xc - 0.07, xc + 0.07, yS, yV], [xc - RP, xc + RP, yV - 0.12, yV + 0.02],
    [xc - RP, xc + RP, yS, yS + 0.16], [xc - RP, xc + RP, yS + 1.02, yS + 1.14], [xc - RP, xc + RP, yN - 0.07, yN]]) {
    bloc(lot, 'bois', a, b, c, d, zp, zp + 0.045, { chanfrein: 0.008, couleur: chene(1.05) });
  }
  // les panneaux : haut (grand, à cadre mouluré), bas (un losange en relief)
  for (const s of [-1, 1]) {
    const a = s < 0 ? xc - RP + e : xc + 0.07, b = s < 0 ? xc - 0.07 : xc + RP - e, m = (a + b) / 2;
    bloc(lot, 'bois', a + 0.05, b - 0.05, yS + 1.19, yV - 0.17, zp, zp + 0.025, { chanfrein: 0.012, couleur: chene(1.0) });
    const y0 = yS + 0.2, y1 = yS + 0.98, ym = (y0 + y1) / 2;
    extruder(lot, 'bois', [[m, y0 + 0.04], [b - 0.08, ym], [m, y1 - 0.04], [a + 0.08, ym]], zp, zp + 0.035, { couleur: chene(1.12) });
    // l'imposte de bois : deux panneaux horizontaux
    bloc(lot, 'bois', a + 0.04, b - 0.04, yV + 0.1, yN - 0.12, zp, zp + 0.025, { chanfrein: 0.01, couleur: chene(0.98) });
  }
  // l'imposte vitrée : la vitre (un demi-disque), le cadre sombre, les rayons, le demi-cercle intérieur, le carreau ambré
  const uvVerre = (x, y, z, out) => { out[0] = 0.57; out[1] = y; };
  const disque = (r, a0 = 0, a1 = Math.PI, n = 24) => { const P = []; for (let i = 0; i <= n; i++) { const t = a0 + ((a1 - a0) * i) / n; P.push([xc + Math.cos(t) * r, yN + Math.sin(t) * r]); } return P; };
  lot.polygone('peinture', [...disque(RP - 0.02).map(([x, y]) => [x, y, zp - 0.04]), [xc - RP, yN, zp - 0.04]], [0, 0, 1], { couleur: mul(VITRE, 0.9), uv: uvVerre });
  const sect = disque(0.45, (5 * Math.PI) / 8, (6 * Math.PI) / 8, 3).concat(disque(RP - 0.06, (6 * Math.PI) / 8, (5 * Math.PI) / 8, 3));
  lot.polygone('peinture', sect.map(([x, y]) => [x, y, zp - 0.035]), [0, 0, 1], { couleur: AMBRE, uv: uvVerre });
  const F = { couleur: FER_SOMBRE, haut: [0, 0, 1] };
  const A = disque(RP - 0.05, 0, Math.PI, 20), I = disque(0.45, 0, Math.PI, 12);
  for (let i = 0; i + 1 < A.length; i++) lot.barre([A[i][0], A[i][1], zp - 0.02], [A[i + 1][0], A[i + 1][1], zp - 0.02], 0.07, 0.04, F);
  for (let i = 0; i + 1 < I.length; i++) lot.barre([I[i][0], I[i][1], zp - 0.02], [I[i + 1][0], I[i + 1][1], zp - 0.02], 0.05, 0.04, F);
  for (let k = 1; k < 8; k++) {
    const t = (Math.PI * k) / 8, c = Math.cos(t), s = Math.sin(t);
    lot.barre([xc + c * 0.45, yN + s * 0.45, zp - 0.02], [xc + c * (RP - 0.06), yN + s * (RP - 0.06), zp - 0.02], 0.035, 0.035, F);
  }
  lot.barre([xc - RP, yN + 0.03, zp - 0.02], [xc + RP, yN + 0.03, zp - 0.02], 0.07, 0.06, { couleur: FER_SOMBRE, haut: [0, 1, 0] });
}

// ============================================================================================ le tympan (Z02a)
// LE TYMPAN SCULPTÉ (R1-02a, C4) : au centre un ÉCU OVALE strié horizontalement, dans un cartouche à volutes et des
// palmes, sommé d'une COURONNE ROYALE fermée ; de part et d'autre, des TROPHÉES militaires en haut relief qui s'étalent
// jusqu'aux deux tiers du tympan : drapeaux roulés et drapés sur leurs hampes, tambour et pile de boulets à gauche,
// canon sur son affût à droite. Croûtes noires (#4d4a44) sur les dessus, coulures grises (#7a766b) sous la corniche.
// On le fait comme le demande la conception : une CARTE DE NORMALES et des VOLUMES réels. La carte est calculée ICI, en
// mémoire, UNE fois (partagée par parc et parc2), en tranches : une carte de hauteurs où l'on « sculpte » des bosses et
// des bourrelets (le plus haut l'emporte), un flou, puis les normales et la couleur, posées dans deux DataTexture. (Le
// premier essai la dessinait sur une toile 2D : relire une toile dessinée par la carte graphique pendant que le jeu
// tourne attendait la fin de ses images — 2,7 s d'un seul tenant, relevé en balade.)
// (Relecture du lot B4, sur R1-02 et C4. D'abord, les volumes : le tympan était un triangle PLAT au fond de la corniche,
// avec seulement l'écu et la couronne en relief ; vu de la placette, la corniche, qui avançait de 77 cm devant lui,
// en cachait la moitié basse — il ne restait qu'un liseré, là où la photo montre d'abord la sculpture. Le tympan est
// désormais une trame de 6,5 cm POUSSÉE EN AVANT par la même carte de hauteurs, jusqu'à 35 cm : la sculpture sort du
// plan comme le haut relief de C4, s'y dresse devant la corniche et y porte ses ombres ; la carte de normales garde le
// détail fin. Ensuite, la composition : elle tenait dans une bande basse de 1,3 m, en petits pictogrammes cernés de
// noir ; sur C4, la sculpture occupe toute la hauteur du tympan — l'écu d'un mètre dans sa couronne de laurier, la
// couronne royale qui touche le sommet, les grands drapeaux qui montent vers les rampants — et ses creux sont gris, pas
// noirs.)
// Le triangle visible sous la corniche rampante (le dessus de celle-ci va des angles, 5 cm au-delà des pilastres, au
// sommet ; son dessous est 46 cm plus bas) : sa base (sur la corniche) de xc - 8,0 à xc + 8,0, son sommet à 2,14 m
// au-dessus. Rangée 0 de la carte : la base (v = 0). `relief` : la saillie de la sculpture (m) pour une hauteur de
// carte de 1 ; `fond` : la hauteur de carte du nu du tympan.
const TY = { demi: 8.0, haut: 2.14, relief: 0.38, fond: 0.08 };
let _tympan = null;
function* materiauTympan(mobile, budget) {
  if (_tympan) return _tympan;
  const W = mobile ? 512 : 1024, Hc = Math.round((W * TY.haut) / (2 * TY.demi));
  const s = W / (2 * TY.demi);                                       // pixels par mètre
  const I = (x) => (x + TY.demi) * s - 0.5, J = (y) => y * s - 0.5;  // (x depuis l'axe, y depuis la base) → pixels
  const Hm = new Float32Array(W * Hc);                               // hauteurs : 1 = TY.relief (38 cm) de relief
  // ---- LES PRIMITIVES (mètres ; le plus haut l'emporte)
  // une BOSSE elliptique (cx, cy, rx, ry ; h au centre, `bord` × h au bord ; rot en radians) : profil 1 → 0,85 à 60 %
  // du rayon → bord
  const bosse = (cx, cy, rx, ry, h, rot = 0, bord = 0.25) => {
    const R = Math.max(rx, ry), i0 = Math.max(0, Math.floor(I(cx - R))), i1 = Math.min(W - 1, Math.ceil(I(cx + R)));
    const j0 = Math.max(0, Math.floor(J(cy - R))), j1 = Math.min(Hc - 1, Math.ceil(J(cy + R))), c = Math.cos(rot), sn = Math.sin(rot);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = (i + 0.5) / s - TY.demi - cx, dy = (j + 0.5) / s - cy, u = (dx * c + dy * sn) / rx, v = (-dx * sn + dy * c) / ry, d = Math.sqrt(u * u + v * v);
      if (d >= 1) continue;
      const val = d < 0.6 ? h * (1 - 0.25 * d) : h * (0.85 + (bord - 0.85) * ((d - 0.6) / 0.4));
      const o = j * W + i; if (val > Hm[o]) Hm[o] = val;
    }
  };
  // un BOURRELET le long d'un tracé (hampe, fût de canon, pli d'étoffe, volute) : une demi-section ronde de rayon r
  // (r1 au bout, s'il s'effile), de hauteur h au sommet
  // (segment par segment, chacun sur sa petite boîte : le plus haut l'emporte, c'est la distance au segment le plus
  // proche qui compte ; une boîte pour tout le tracé et tous les segments à chaque pixel coûtait dix fois plus)
  const bourrelet = (pts, r, h, r1 = r) => {
    let L = 0; const cum = [0];
    for (let k = 1; k < pts.length; k++) { L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); cum.push(L); }
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1], [bx, by] = pts[k], ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1e-9;
      const ra = r + (r1 - r) * (cum[k - 1] / (L || 1)), rb = r + (r1 - r) * (cum[k] / (L || 1)), R = Math.max(ra, rb);
      const i0 = Math.max(0, Math.floor(I(Math.min(ax, bx) - R))), i1 = Math.min(W - 1, Math.ceil(I(Math.max(ax, bx) + R)));
      const j0 = Math.max(0, Math.floor(J(Math.min(ay, by) - R))), j1 = Math.min(Hc - 1, Math.ceil(J(Math.max(ay, by) + R)));
      for (let j = j0; j <= j1; j++) {
        const y = (j + 0.5) / s;
        for (let i = i0; i <= i1; i++) {
          const x = (i + 0.5) / s - TY.demi, t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2));
          const dx = x - ax - ex * t, dy = y - ay - ey * t, d2 = dx * dx + dy * dy, rr = ra + (rb - ra) * t;
          if (d2 >= rr * rr) continue;
          const val = h * Math.sqrt(1 - d2 / (rr * rr)), o = j * W + i;
          if (val > Hm[o]) Hm[o] = val;
        }
      }
    }
  };
  // un POLYGONE plein (l'étoffe d'un drapeau) à la hauteur h
  // (rangée par rangée : les croisements des arêtes avec la rangée, triés, bornent les pixels dedans)
  const plein = (P, h) => {
    let ya = Infinity, yb = -Infinity;
    for (const [, y] of P) { ya = Math.min(ya, y); yb = Math.max(yb, y); }
    const X = [];
    for (let j = Math.max(0, Math.floor(J(ya))); j <= Math.min(Hc - 1, Math.ceil(J(yb))); j++) {
      const y = (j + 0.5) / s;
      X.length = 0;
      for (let k = 0, m = P.length - 1; k < P.length; m = k++) {
        const yk = P[k][1], ym = P[m][1];
        if ((yk > y) !== (ym > y)) X.push(P[k][0] + ((P[m][0] - P[k][0]) * (y - yk)) / (ym - yk));
      }
      X.sort((p, q) => p - q);
      for (let n = 0; n + 1 < X.length; n += 2) {
        for (let i = Math.max(0, Math.ceil(I(X[n]))); i <= Math.min(W - 1, Math.floor(I(X[n + 1]))); i++) { const o = j * W + i; if (h > Hm[o]) Hm[o] = h; }
      }
    }
  };
  const tube = (x0, y0, x1, y1, r0, r1, h) => bourrelet([[x0, y0], [x1, y1]], r0, h, r1);
  // UNE ÉTOFFE (drapeau) attachée à sa hampe de `a` à `b`, son bord libre décalé de `off` (m) et gonflé au milieu ; ses
  // plis en gros bourrelets ondulés, de la hampe au bord libre, qui se touchent (une étoffe qui ondule, pas une toile
  // plate barrée de nervures : relecture, le premier dessin faisait des peignes). `off` vers le haut : un drapeau qui
  // flotte ; vers le bas : un drapeau qui pend.
  const etoffe = (a, b, off, h, graine) => {
    const n = 14, bords = [], libre = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, g = 0.55 + 0.45 * Math.sin(t * Math.PI), x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      bords.push([x, y]);
      libre.push([x + off[0] * g + 0.06 * Math.sin(i * 1.9 + graine), y + off[1] * g + 0.05 * Math.sin(i * 1.7 + graine)]);
    }
    plein([...bords, ...libre.slice().reverse()], h * 0.7);
    for (let i = 1; i < n; i += 3) {
      const [xa, ya] = bords[i], [xb, yb] = libre[i], r = 0.13 + 0.03 * Math.sin(i * 2.3 + graine);
      bourrelet([[xa, ya], [(xa + xb) / 2 + 0.07 * Math.sin(i + graine), (ya + yb) / 2 + 0.04 * Math.cos(i * 1.3 + graine)], [xb, yb]], r, h * (0.88 + 0.1 * Math.sin(i * 1.7 + graine)), r * 0.6);
    }
  };
  // une VOLUTE (spirale de `r0` au départ, qui s'enroule sur 1,2 tour à partir de l'angle `a0`) ; `e` : l'épaisseur
  // du rouleau
  const volute = (cx, cy, r0, sensA, h, e = 0.04, a0 = 0) => {
    const P = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24, a = a0 + sensA * t * Math.PI * 2.4, r = r0 * (1 - t * 0.72); P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    bourrelet(P, e, h, e * 0.6);
  };
  // une FEUILLE (laurier, palme, acanthe) : une bosse effilée, couchée selon `ang`, et sa nervure
  const feuille = (x, y, L, l, ang, h) => {
    bosse(x, y, L, l, h, ang, 0.35);
    bourrelet([[x - Math.cos(ang) * L * 0.8, y - Math.sin(ang) * L * 0.8], [x + Math.cos(ang) * L * 0.8, y + Math.sin(ang) * L * 0.8]], 0.012, h * 1.04);
  };
  const ellipse = (cx, cy, rx, ry, n = 48) => { const P = []; for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2; P.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]); } return P; };
  // La composition (R1-02a, C4), en mètres depuis l'axe et depuis la base ; la hauteur libre du triangle à l'abscisse x
  // est 2,14 x (1 - |x| / 8) : 1,87 m à 1 m de l'axe, 1,34 m à 3 m, 0,8 m à 5 m. Relevé sur C4 (le tympan de face,
  // 1,32 px par cm) : l'écu d'un mètre de large, son centre à 0,85 m ; sa couronne de laurier de 1,4 m ; la couronne
  // royale de 0,9 m, de 1,5 à 2 m ; les grands drapeaux qui flottent de part et d'autre, de 0,9 à 2,7 m de l'axe et
  // jusqu'à 1,5 m de haut ; en bas, le tambour et la pile de boulets à gauche, le canon à droite ; puis les trophées
  // couchés qui s'amenuisent jusqu'à 6,7 m de l'axe (R1-02 : ils occupent les deux tiers du tympan et plus).
  const X = 0, CY = 0.85;
  const etapes = [
    // le fond, à 8 %, et les joints des blocs du tympan, à peine creusés (assises de 0,55 m, joints montants tous les
    // 1,1 m environ : la photo les montre fins)
    () => {
      Hm.fill(TY.fond);
      for (let j = 0; j < Hc; j++) {
        const y = (j + 0.5) / s, joint = Math.abs(y / 0.55 - Math.round(y / 0.55)) * 0.55 < 0.005 && y > 0.1, r = Math.floor(y / 0.55);
        for (let i = 0; i < W; i++) {
          const x = (i + 0.5) / s - TY.demi, xm = x - (r % 2) * 0.55 - 0.3;
          if (joint || Math.abs(xm / 1.1 - Math.round(xm / 1.1)) * 1.1 < 0.005) Hm[j * W + i] = 0.045;
        }
      }
    },
    // de chaque côté, les hampes et les armes en éventail : la hampe du grand drapeau (qui monte vers le rampant), celle
    // du drapeau bas, une pique, une lance couchée au bout ; leurs pommes et leurs fers ; un sabre en travers
    ...[-1, 1].map((sens) => () => {
      tube(sens * 0.9, 0.28, sens * 2.7, 1.16, 0.055, 0.04, 0.66);
      bosse(sens * 2.74, 1.18, 0.085, 0.085, 0.74);
      tube(sens * 1.1, 0.1, sens * 4.4, 0.84, 0.05, 0.035, 0.62);
      bosse(sens * 4.45, 0.85, 0.075, 0.075, 0.7);
      tube(sens * 1.3, 0.2, sens * 5.25, 0.6, 0.032, 0.024, 0.52);
      bosse(sens * 5.36, 0.62, 0.16, 0.065, 0.6, sens > 0 ? 0.1 : Math.PI - 0.1);
      tube(sens * 3.1, 0.05, sens * 5.9, 0.36, 0.038, 0.026, 0.5);
      bosse(sens * 6.0, 0.37, 0.14, 0.055, 0.54, sens > 0 ? 0.11 : Math.PI - 0.11);
      tube(sens * 3.9, 0.55, sens * 5.55, 0.12, 0.026, 0.018, 0.56);
      bosse(sens * 3.86, 0.57, 0.1, 0.04, 0.6, sens > 0 ? -0.26 : Math.PI + 0.26);
    }),
    // les étoffes : le GRAND DRAPEAU, qui flotte au-dessus de sa hampe vers le haut et vers l'écu (C4 : la plus grosse
    // masse après l'écu) ; le DRAPEAU BAS, qui pend de la sienne vers l'extérieur ; une flamme au bout de la pique
    // (relecture, sur C4 : le grand drapeau monte jusque sous le rampant, et une grosse touffe d'acanthe comble le vide
    // entre lui et la couronne)
    ...[-1, 1].map((sens) => () => etoffe([sens * 1.25, 0.46], [sens * 2.66, 1.14], [-sens * 0.5, 0.48], 0.88, 1 + sens)),
    ...[-1, 1].map((sens) => () => etoffe([sens * 2.3, 0.4], [sens * 4.35, 0.83], [sens * 0.36, -0.46], 0.8, 3 + sens)),
    ...[-1, 1].map((sens) => () => {
      for (let k = 0; k < 7; k++) {
        const t = k / 6, a = sens > 0 ? 0.5 + 1.6 * t : Math.PI - 0.5 - 1.6 * t;
        feuille(sens * 1.12 + Math.cos(a) * 0.22, 1.42 + Math.sin(a) * 0.18, 0.16, 0.06, a, 0.8);
      }
      volute(sens * 1.12, 1.42, 0.14, sens, 0.84, 0.04);
    }),
    ...[-1, 1].map((sens) => () => etoffe([sens * 4.2, 0.48], [sens * 5.15, 0.58], [sens * 0.18, -0.3], 0.66, 5 + sens)),
    // le TAMBOUR (à gauche) : un fût couché, ses cercles et son laçage ; la PILE DE BOULETS (4 + 3 + 2 + 1) ; un casque
    // à cimier au bout, sur un bouclier couché
    () => {
      bosse(-1.55, 0.31, 0.32, 0.28, 1.0, 0, 0.6);
      for (let k = -3; k <= 3; k++) bourrelet([[-1.55 + k * 0.085 - 0.04, 0.07], [-1.55 + k * 0.085 + 0.04, 0.56]], 0.018, 1.02);
      bourrelet([[-1.87, 0.57], [-1.23, 0.57]], 0.05, 1.04); bourrelet([[-1.87, 0.06], [-1.23, 0.06]], 0.05, 1.04);
      for (let rg = 0; rg < 4; rg++) for (let i = 0; i < 4 - rg; i++) bosse(-2.72 + i * 0.18 + rg * 0.09, 0.1 + rg * 0.155, 0.095, 0.095, 0.92, 0, 0.3);
      bosse(-4.9, 0.24, 0.22, 0.19, 0.95, 0, 0.5);
      bourrelet([[-5.08, 0.42], [-4.9, 0.5], [-4.7, 0.42]], 0.05, 1.0);
      bosse(-4.9, 0.08, 0.26, 0.06, 0.85);
    },
    // le CANON (à droite) : le fût et ses renforts, sa bouche ; l'affût ; la roue à rayons ; trois boulets ; un casque
    () => {
      tube(1.25, 0.3, 3.4, 0.64, 0.16, 0.1, 0.98);
      for (const t of [0.08, 0.3, 0.72, 0.97]) bosse(1.25 + 2.15 * t, 0.3 + 0.34 * t, 0.035, 0.17 - 0.05 * t, 1.02, -0.16);
      bosse(3.45, 0.65, 0.08, 0.08, 0.98);
      tube(1.0, 0.06, 2.7, 0.22, 0.07, 0.07, 0.7);
      bosse(1.95, 0.32, 0.3, 0.3, 0.55, 0, 0.9);
      for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; bourrelet([[1.95, 0.32], [1.95 + Math.cos(a) * 0.27, 0.32 + Math.sin(a) * 0.27]], 0.028, 0.96); }
      bourrelet(ellipse(1.95, 0.32, 0.29, 0.29, 32), 0.045, 1.02);
      bosse(1.95, 0.32, 0.075, 0.075, 1.02);
      for (let i = 0; i < 3; i++) bosse(3.62 + i * 0.19 - (i > 1 ? 0.28 : 0), 0.1 + (i > 1 ? 0.16 : 0), 0.095, 0.095, 0.92, 0, 0.3);
      bosse(4.9, 0.24, 0.22, 0.19, 0.95, 0, 0.5);
      bourrelet([[4.7, 0.42], [4.9, 0.5], [5.08, 0.42]], 0.05, 1.0);
      bosse(4.9, 0.08, 0.26, 0.06, 0.85);
    },
    // au bout des trophées, des branches de laurier couchées qui meurent dans l'angle
    ...[-1, 1].map((sens) => () => {
      for (let k = 0; k < 9; k++) {
        const t = k / 8, x = sens * (5.9 + 0.75 * t), y = 0.14 + 0.1 * Math.sin(t * Math.PI), c = k & 1 ? 1 : -1;
        feuille(x, y + 0.055 * c, 0.1, 0.035, sens > 0 ? 0.35 * c : Math.PI - 0.35 * c, 0.6);
      }
      bourrelet([[sens * 5.85, 0.14], [sens * 6.3, 0.22], [sens * 6.7, 0.16]], 0.018, 0.58);
    }),
    // le CARTOUCHE : l'agrafe en bas (une coquille qui mord sur la corniche), les grands rinceaux d'acanthe en C de
    // chaque côté de la couronne de laurier (C4 : ils la débordent de 30 à 50 cm), les palmes qui montent vers la
    // couronne royale
    () => {
      bosse(X, 0.14, 0.3, 0.17, 0.92, 0, 0.5);
      for (let k = -3; k <= 3; k++) bourrelet([[X, 0.03], [X + k * 0.09, 0.28]], 0.022, 0.98);
      for (const sens of [-1, 1]) {
        volute(X + sens * 0.24, 0.2, 0.1, sens, 0.94, 0.03);
        volute(X + sens * 0.98, 0.45, 0.27, -sens, 0.95, 0.06, sens > 0 ? Math.PI : 0);
        volute(X + sens * 0.93, 1.2, 0.2, sens, 0.9, 0.05, sens > 0 ? Math.PI : 0);
        bourrelet([[X + sens * 0.98, 0.72], [X + sens * 1.06, 0.95], [X + sens * 0.93, 1.02]], 0.055, 0.92, 0.04);
        for (let k = 0; k < 6; k++) {
          const t = k / 5, x = X + sens * (0.78 + 0.42 * Math.sin(t * Math.PI)), y = 0.2 + 0.95 * t;
          feuille(x + sens * 0.1, y, 0.13, 0.05, sens > 0 ? 0.6 + t : Math.PI - 0.6 - t, 0.78);
        }
        for (let k = 0; k < 6; k++) {
          const t = k / 5, x = X + sens * (0.5 + 0.55 * t), y = 1.22 + 0.4 * t - 0.25 * t * t;
          feuille(x, y, 0.12, 0.04, sens > 0 ? 0.3 + 0.5 * t : Math.PI - 0.3 - 0.5 * t, 0.74);
        }
      }
    },
    // la COURONNE DE LAURIER autour de l'écu : deux branches, nouées en bas, qui s'ouvrent sous la couronne royale ;
    // leurs feuilles deux à deux, en épi
    () => {
      for (const sens of [-1, 1]) {
        const P = [];
        for (let k = 0; k <= 22; k++) { const a = -Math.PI / 2 + sens * (0.12 + (k / 22) * 2.6); P.push([X + Math.cos(a) * 0.7, CY + Math.sin(a) * 0.66]); }
        bourrelet(P, 0.035, 0.8);
        for (let k = 1; k < P.length; k++) {
          const [x, y] = P[k], a = Math.atan2(P[k][1] - P[k - 1][1], P[k][0] - P[k - 1][0]), nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2);
          for (const c of [-1, 1]) feuille(x + nx * c * 0.07, y + ny * c * 0.07, 0.085, 0.035, a + c * 0.5, 0.86);
        }
      }
      bosse(X, CY - 0.66, 0.12, 0.08, 0.92);
      for (const sens of [-1, 1]) bourrelet([[X, CY - 0.68], [X + sens * 0.12, CY - 0.8], [X + sens * 0.2, CY - 0.78]], 0.03, 0.9);
    },
    // l'ÉCU ovale et son bord, strié horizontalement ; la COURONNE ROYALE fermée : son bandeau et ses pierres, ses
    // fleurons, ses trois arceaux, le globe et la croix ; les RUBANS qui en tombent de part et d'autre de l'écu
    () => {
      bosse(X, CY, 0.5, 0.44, 1.0, 0, 0.78);
      bourrelet(ellipse(X, CY, 0.52, 0.46), 0.045, 1.02);
      for (let j = Math.max(0, Math.floor(J(CY - 0.44))); j <= Math.min(Hc - 1, Math.ceil(J(CY + 0.44))); j++) {
        const y = (j + 0.5) / s;
        if (Math.abs(((y - CY) / 0.065) - Math.round((y - CY) / 0.065)) * 0.065 > 0.011) continue;
        for (let i = Math.floor(I(-0.5)); i <= Math.ceil(I(0.5)); i++) {
          const x = (i + 0.5) / s - TY.demi;
          if ((x / 0.48) ** 2 + ((y - CY) / 0.42) ** 2 < 1) Hm[j * W + i] *= 0.8;
        }
      }
      bosse(X, 1.52, 0.47, 0.075, 0.95, 0, 0.8);
      for (let k = -3; k <= 3; k++) bosse(X + k * 0.13, 1.52, 0.035, 0.035, 1.02);
      for (let k = -2; k <= 2; k++) { bosse(X + k * 0.2, 1.65, 0.06, 0.1, 0.92); bosse(X + k * 0.2, 1.73, 0.03, 0.04, 0.95); }
      for (const k of [-1, 0, 1]) {
        const P = [];
        for (let i = 0; i <= 8; i++) { const t = i / 8, a = 1 - t; P.push([a * a * (X + k * 0.42) + 2 * a * t * (X + k * 0.26) + t * t * X, a * a * 1.58 + 2 * a * t * 1.9 + t * t * 1.86]); }
        bourrelet(P, 0.03, 0.86);
      }
      bosse(X, 1.9, 0.07, 0.07, 0.95); bosse(X, 1.98, 0.018, 0.05, 0.9); bosse(X, 1.985, 0.045, 0.016, 0.9);
      for (const sens of [-1, 1]) {
        bourrelet([[X + sens * 0.2, 1.45], [X + sens * 0.52, 1.36], [X + sens * 0.62, 1.2], [X + sens * 0.58, 1.02]], 0.04, 0.9, 0.03);
      }
    },
  ];
  for (const f of etapes) { f(); if (budget()) yield; }
  // ---- LE FLOU (passes de moyenne glissante, en x puis en y : presque un flou gaussien) : la pierre sculptée n'a pas
  // d'arêtes vives de pixel ; et le même, très large, qui donne la hauteur moyenne alentour (les creux s'assombrissent)
  // (générateur : la main est rendue entre deux demi-passes)
  function* flouter(src, r, passes) {
    const a = Float32Array.from(src), b = new Float32Array(src.length), n = 2 * r + 1;
    for (let p = 0; p < passes; p++) {
      for (let j = 0; j < Hc; j++) {                                    // en x
        const o = j * W;
        let acc = 0;
        for (let i = -r; i <= r; i++) acc += a[o + (i < 0 ? 0 : i)];
        for (let i = 0; i < W; i++) { b[o + i] = acc / n; const ip = i + r + 1, im = i - r; acc += a[o + (ip < W ? ip : W - 1)] - a[o + (im > 0 ? im : 0)]; }
      }
      if (budget()) yield;
      for (let i = 0; i < W; i++) {                                     // en y
        let acc = 0;
        for (let j = -r; j <= r; j++) acc += b[(j < 0 ? 0 : j) * W + i];
        for (let j = 0; j < Hc; j++) { a[j * W + i] = acc / n; const jp = j + r + 1, jm = j - r; acc += b[(jp < Hc ? jp : Hc - 1) * W + i] - b[(jm > 0 ? jm : 0) * W + i]; }
      }
      if (budget()) yield;
    }
    return a;
  }
  const hauteur = yield* flouter(Hm, 1, mobile ? 1 : 2);
  const autour = yield* flouter(Hm, mobile ? 3 : 5, 2);
  // (la carte qui pousse la trame en avant : plus lisse encore, 7 à 8 cm, pour qu'un sommet sur deux ne tombe pas sur
  // une hampe de 4 cm et l'autre à côté — des dents)
  const saillie = yield* flouter(Hm, mobile ? 1 : 2, 2);
  // ---- LA CARTE DE NORMALES ET LA COULEUR (croûtes noires sur les dessus, creux plus sombres, coulures)
  const Dn = new Uint8Array(W * Hc * 4), Dc = new Uint8Array(W * Hc * 4);
  const k = (TY.relief * s) / 2;                                     // le relief de la trame, différences centrées
  // (la sculpture est plus sombre que le fond : sur R1-02 et C4, les trophées sortent gris, encrassés, sur un tympan
  // crème ; relecture : un peu moins sombre qu'au premier essai — la trame en relief porte maintenant ses propres
  // ombres — et des creux gris, plus des cernes noirs qui dessinaient chaque pièce comme un pictogramme)
  const fond = [214, 203, 176], sculpt = [190, 180, 158], croute = [80, 76, 68], coulure = [128, 123, 111];
  // (les hasards de la couleur : les COULURES par bandes de 16 pixels (24 cm, fondues sur les bords : des bandes de 4
  // pixels faisaient un velours côtelé sur tout le tympan), les croûtes par case de 4 x 4)
  const colonnes = new Float32Array(W), plaques = new Float32Array(W);
  for (let i = 0; i < W; i++) colonnes[i] = Math.max(0, alea(i >> 4, 3, 9) * 1.7 - 1.0) * Math.sin(Math.PI * ((i & 15) + 0.5) / 16);
  for (let j = 0; j < Hc; j++) {
    if ((j & 3) === 0) for (let i = 0; i < W; i++) plaques[i] = 0.55 + 0.45 * alea(i >> 2, j >> 2, 7);
    const lb = (j > 0 ? j - 1 : 0) * W, lh = (j < Hc - 1 ? j + 1 : j) * W;       // les rangées voisines (bas, haut)
    for (let i = 0; i < W; i++) {
      const q = j * W + i, o = q * 4, hv = hauteur[q], ig = i > 0 ? i - 1 : 0, id = i < W - 1 ? i + 1 : i;
      const sx = (hauteur[j * W + id] - hauteur[j * W + ig]) * k, sy = (hauteur[lh + i] - hauteur[lb + i]) * k;
      const l = Math.sqrt(sx * sx + sy * sy + 1), nx = -sx / l, ny = -sy / l, nz = 1 / l;
      Dn[o] = (nx * 0.5 + 0.5) * 255; Dn[o + 1] = (ny * 0.5 + 0.5) * 255; Dn[o + 2] = (nz * 0.5 + 0.5) * 255; Dn[o + 3] = 255;
      const relief = Math.max(0, hv - 0.1), m = Math.min(1, relief * 4);
      const creux = Math.max(0, autour[q] - hv) * 1.4;
      let c0 = fond[0] + (sculpt[0] - fond[0]) * m, c1 = fond[1] + (sculpt[1] - fond[1]) * m, c2 = fond[2] + (sculpt[2] - fond[2]) * m;
      const ao = 1 - Math.min(0.3, creux) - 0.75 * Math.max(0, TY.fond - hv);
      c0 *= ao; c1 *= ao; c2 *= ao;
      // les croûtes noires : sur les dessus du relief (normale tournée vers le ciel), en plaques
      const cr = relief > 0.03 ? (0.05 + 0.75 * lisse(0.15, 0.6, ny)) * plaques[i] * Math.min(1, relief * 6) : 0;
      c0 += (croute[0] - c0) * cr; c1 += (croute[1] - c1) * cr; c2 += (croute[2] - c2) * cr;
      // les coulures grises : sous la corniche rampante (le haut du triangle), en traînées verticales
      const x = (i + 0.5) / s - TY.demi, y = (j + 0.5) / s, bordHaut = TY.haut * (1 - Math.abs(x) / TY.demi) - y;
      const cu = colonnes[i] > 0 ? colonnes[i] * Math.exp(-Math.max(0, bordHaut) / 0.6) : 0;
      c0 += (coulure[0] - c0) * cu * 0.7; c1 += (coulure[1] - c1) * cu * 0.7; c2 += (coulure[2] - c2) * cu * 0.7;
      Dc[o] = c0; Dc[o + 1] = c1; Dc[o + 2] = c2; Dc[o + 3] = 255;
    }
    if ((j & 3) === 3 && budget()) yield;
  }
  const tex = (D, srgb) => {
    const t = new THREE.DataTexture(D, W, Hc, THREE.RGBAFormat);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
    return t;
  };
  const m = new THREE.MeshStandardMaterial({ map: tex(Dc, true), normalMap: tex(Dn, false), normalScale: new THREE.Vector2(1.9, 1.9), roughness: 0.95, metalness: 0, vertexColors: true });
  m.name = 'Z02 · tympan sculpté';
  _tympan = { mat: m, saillie, W, Hc, s };
  return _tympan;
}
// LE MAILLAGE DU TYMPAN : une trame de `pas` m sur le triangle (et 25 cm au-delà, sous les corniches), chaque sommet
// poussé en avant de la saillie de la sculpture (lecture bilinéaire de la carte lissée) ; les normales restent celles du
// plan (la carte de normales dit la pente, la trame dit le volume : l'ombre portée, et ce que la corniche ne cache plus).
// Texture projetée en plan (u selon x, v selon y). Le nu du tympan est dans le plan de la frise (9 cm devant celui des
// trumeaux), comme sur C4 : la sculpture y pose sur la corniche.
function* tympan(ctx, Y0) {
  const T = yield* materiauTympan(!!ctx.mobile, ctx.budget || (() => false));
  const yb = Y0 + H.corniche, zT = FA.z + 0.09, xc = FA.xc, pas = ctx.mobile ? 0.11 : 0.065;
  const { saillie: S, W, Hc, s } = T;
  // la saillie (m) en (x depuis l'axe, y depuis la base) : bilinéaire, bornée à la carte
  const sailliePt = (x, y) => {
    const fi = Math.min(W - 1.001, Math.max(0, (x + TY.demi) * s - 0.5)), fj = Math.min(Hc - 1.001, Math.max(0, y * s - 0.5));
    const i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j, o = j * W + i;
    const h = (S[o] * (1 - u) + S[o + 1] * u) * (1 - v) + (S[o + W] * (1 - u) + S[o + W + 1] * u) * v;
    // (les bords de la carte, sous les corniches, restent au nu : pas de sculpture tronquée qui dépasse d'une arête)
    const bord = Math.min(1, Math.max(0, (TY.haut * (1 - Math.abs(x) / TY.demi) - y) / 0.08 + 0.5));
    return Math.max(0, h - TY.fond) * TY.relief * bord;
  };
  const x0 = -TY.demi - 0.6, y0 = -0.02, nx = Math.ceil((2 * TY.demi + 1.2) / pas) + 1, ny = Math.ceil((TY.haut + 0.27) / pas) + 1;
  const P = new Float32Array(nx * ny * 3), N = new Float32Array(nx * ny * 3), U = new Float32Array(nx * ny * 2), C = new Float32Array(nx * ny * 3).fill(1);
  for (let j = 0; j < ny; j++) {
    const y = Math.min(TY.haut + 0.25, y0 + j * pas);
    for (let i = 0; i < nx; i++) {
      const x = Math.min(TY.demi + 0.6, x0 + i * pas), q = j * nx + i;
      P[q * 3] = xc + x; P[q * 3 + 1] = yb + y; P[q * 3 + 2] = zT + sailliePt(x, y);
      N[q * 3 + 2] = 1;
      U[q * 2] = (x + TY.demi) / (2 * TY.demi); U[q * 2 + 1] = y / TY.haut;
    }
    if ((j & 7) === 7 && ctx.budget && ctx.budget()) yield;
  }
  // les triangles dont le centre est dans le triangle visible, élargi de 25 cm (ses bords passent sous les corniches)
  const dans = (x, y) => y < TY.haut * (1 - Math.abs(x) / TY.demi) + 0.25;
  const idx = [];
  for (let j = 0; j + 1 < ny; j++) for (let i = 0; i + 1 < nx; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    if (!dans(P[a * 3] - xc + pas / 2, P[a * 3 + 1] - yb + pas / 2)) continue;
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  g.setIndex(nx * ny > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, T.mat);
  m.position.x = Monde.dx; m.castShadow = true; m.receiveShadow = true; m.name = 'tympan sculpté';
  return m;
}

// ============================================================================================ la silhouette (Z02a, loin)
// Le bâtiment en quelques boîtes : la façade (plus claire), le fronton, la boîte grise derrière. Moins de 100 triangles.
function* silhouetteFacade(ctx) {
  const { kit } = ctx, Y0 = kit.sol(FA.xc, -48.6), lot = new kit.Lot('silhouette Charras');
  const b = mul(BLOND, 0.95);
  bloc(lot, 'taille', FA.x0, FA.x1, Y0 - 0.6, Y0 + H.corniche, FA.z - FA.ep, FA.z + 0.1, { couleur: b });
  extruder(lot, 'taille', [[FA.x0, Y0 + H.corniche], [FA.x1, Y0 + H.corniche], [FA.xc, Y0 + H.sommet]], FA.z - FA.ep, FA.z + 0.05, { couleur: b });
  bloc(lot, 'taille', FA.xb0, FA.xb1, -2.6, Y0 + 12.6, FA.zDos, FA.z - FA.ep, { couleur: mul(PIGNON, 0.8) });
  // (les baies, en taches sombres : on lit les trois niveaux de loin)
  for (const T of [TR.gauche, TR.droite]) {
    const xm = (T[0] + T[1]) / 2;
    for (const [a, c] of [H.rdc, H.premier, H.second]) bloc(lot, 'taille', xm - LF / 2, xm + LF / 2, Y0 + a, Y0 + c, FA.z + 0.1, FA.z + 0.11, { couleur: [0.22, 0.22, 0.24] });
  }
  bloc(lot, 'taille', FA.xc - RP, FA.xc + RP, Y0 + H.seuil, Y0 + H.naissance + 1.2, FA.z + 0.1, FA.z + 0.11, { couleur: [0.2, 0.16, 0.12] });
  ctx.groupe.add(lot.maillages('silhouette Charras'));
}

// ============================================================================================ la placette (Z02b)
function* placette(ctx) {
  const { kit, groupe, K } = ctx, mobile = !!ctx.mobile, budget = ctx.budget || (() => false);
  const [X, Z] = [PL.xs, PL.zs];
  // ---- 1. LE PAVAGE EN GRILLE : les carrés gris clair mouchetés (le béton à gravillons du kit) et les bandes de terre
  // cuite (briques du kit, posées en long). Drapé sur le sol du monde, 3 cm au-dessus du stabilisé de l'esplanade.
  // (Premier essai : les dalles du kit, un damier de petits carreaux de deux tons qui sortait en échiquier ; sur C1 et
  // C5 les panneaux gris sont d'un grain uniforme, moucheté.)
  const carres = new Nappe(), bandes = new Nappe();
  const tDal = kit.TUILES.beton, tBri = kit.TUILES.brique;
  // (le gris des carrés : #b5afa5 en moyenne, entre le satellite, #c3bcb3, et la vidéo R1-04 à l'ombre, #a8a39b ;
  // relecture : 15 % plus sombre et un peu plus chaud — au jeu, les carrés sortaient plus clairs que la façade au
  // soleil, presque blancs, quand R1-01 les montre nettement plus sombres qu'elle et à peine plus clairs que les bandes)
  const teinteCarre = (x, z) => { const f = (0.93 + 0.1 * kit.bruit(x / 3, z / 3, 51)) * (0.97 + 0.05 * alea(Math.floor(x * 2), Math.floor(z * 2), 52)); return [f * 0.635, f * 0.61, f * 0.585]; };
  const teinteBande = (x, z) => { const f = 0.78 + 0.14 * kit.bruit(x / 2.5, z / 2.5, 53); return mul(TERRE_CUITE, f); };
  for (const [a, b] of [[X[1], X[2]], [X[3], X[4]], [X[5], X[6]]]) for (const [c, d] of [[Z[1], Z[2]], [Z[3], Z[4]]]) {
    plaque([[a, c], [b, c], [b, d], [a, d]], { dy: 0.03, tuile: 1, uv: (x, z) => [x / tDal, z / tDal, 0], teinte: teinteCarre }, carres);
    if (budget()) yield;
  }
  // les bandes : les trois rangées en travers, puis les montants entre les carrés ; au bout x-, le bord suit l'échiffre
  // et le pied de l'escalier (voir ECHIFFRE)
  const xE = (z) => { const [ax, az] = ECHIFFRE[1], [bx, bz] = ECHIFFRE[2]; return ax + ((bx - ax) * (z - az)) / (bz - az); };
  // (la bande du pied de la façade s'interrompt sous le perron, dont le sol des données monte en plan incliné vers le
  // seuil : posée dessus, elle recouvrait les marches — relevé à la première régénération du monde ; seule la lisière
  // devant la première marche reste pavée)
  const pW = PERRON.largeurs[0] / 2 + 0.02, zP = PERRON.zBas;
  // (au bout x-, les bandes s'arrêtent au pied de l'escalier de 12 marches : sur la ligne de sa première contremarche
  // (PIED12), puis le long de son bord côté échiffre jusqu'au coin de l'échiffre, et, côté mur, le long de son bord z+
  // jusqu'à la face du mur)
  const [[pax, paz], [pbx, pbz]] = PIED12;
  const xPied = (z) => pax + ((pbx - pax) * (z - paz)) / (pbz - paz), zPied = (x) => paz + ((pbz - paz) * (x - pax)) / (pbx - pax);
  const zBordMur = paz + ((ESC12.de[1] - ESC12.a[1]) / (ESC12.de[0] - ESC12.a[0])) * (X[0] - pax);
  const bandesPoly = [
    [[xE(Z[0]), Z[0]], [FA.xc - pW, Z[0]], [FA.xc - pW, Z[1]], [xE(Z[1]), Z[1]]],
    [[FA.xc + pW, Z[0]], [X[7], Z[0]], [X[7], Z[1]], [FA.xc + pW, Z[1]]],
    [[FA.xc - pW, zP], [FA.xc + pW, zP], [FA.xc + pW, Z[1]], [FA.xc - pW, Z[1]]],
    [[xE(Z[2]), Z[2]], [X[7], Z[2]], [X[7], Z[3]], [xPied(Z[3]), Z[3]], PIED12[1], ECHIFFRE[1]],
    [[X[0], Z[4]], [X[7], Z[4]], [X[7], Z[5]], [X[0], Z[5]]],
    [[xE(Z[1]), Z[1]], [X[1], Z[1]], [X[1], Z[2]], [xE(Z[2]), Z[2]]],
    [[X[0], zBordMur], PIED12[0], [X[1], zPied(X[1])], [X[1], Z[4]], [X[0], Z[4]]],
  ];
  for (const [a, b] of [[X[2], X[3]], [X[4], X[5]], [X[6], X[7]]]) for (const [c, d] of [[Z[1], Z[2]], [Z[3], Z[4]]]) bandesPoly.push([[a, c], [b, c], [b, d], [a, d]]);
  for (const P of bandesPoly) {
    // (les briques courent le long de la bande : u en travers, v en long)
    const enX = Math.abs(P[1][0] - P[0][0]) > Math.abs(P[2][1] - P[1][1]);
    plaque(P, { dy: 0.03, tuile: 1, uv: (x, z) => (enX ? [z / tBri, x / tBri, 0] : [x / tBri, z / tBri, 0]), teinte: teinteBande }, bandes);
    if (budget()) yield;
  }
  const mc = maillageSol(carres.geometrie(), kit.materiau('beton'), 'placette · carrés');
  if (mc) groupe.add(mc);
  const mb = maillageSol(bandes.geometrie(), kit.materiau('brique'), 'placette · bandes de terre cuite');
  if (mb) groupe.add(mb);
  yield;

  // ---- 2. LE COIN ROUGE : la nappe d'asphalte et le chemin vers la promenade ; la bordure de sa pointe en biais
  const rouge = new Nappe(), tuR = kit.TUILES.asphalteRouge;
  const teinteRouge = (x, z) => { const f = (0.86 + 0.14 * kit.bruit(x / 3.5, z / 3.5, 55)) * 0.94; return [f * 0.97, f * 0.93, f * 0.93]; };
  plaque(NAPPE_ROUGE, { dy: 0.028, tuile: 1, uv: (x, z) => [x / tuR, z / tuR, 0], teinte: teinteRouge }, rouge);
  if (budget()) yield;
  plaque(CHEMIN_ROUGE, { dy: 0.028, tuile: 1, uv: (x, z) => [x / tuR, z / tuR, 0], teinte: teinteRouge }, rouge);
  const mr = maillageSol(rouge.geometrie(), kit.materiau('asphalteRouge'), 'coin d’asphalte rouge');
  if (mr) groupe.add(mr);
  groupe.add(kit.bordure({ ligne: [[NAPPE_ROUGE[2][0] + 0.05, NAPPE_ROUGE[2][1] - 0.2], [NAPPE_ROUGE[3][0] - 0.05, NAPPE_ROUGE[3][1] + 0.08], [NAPPE_ROUGE[4][0] + 0.9, NAPPE_ROUGE[4][1] + 0.08]], largeur: 0.12, hauteur: 0.05, materiau: 'beton' }));
  yield;

  // ---- 3. LES MASSIFS de bégonias au pied de la façade, leur bordure de béton basse (#c4c0b8)
  for (const [a, b] of MASSIFS) {
    groupe.add(kit.massifFleurs({ poly: [[a, Z_MASSIF[0]], [b, Z_MASSIF[0]], [b, Z_MASSIF[1]], [a, Z_MASSIF[1]]], palette: 'rouge', densite: mobile ? 0.8 : 1.15, bombe: 0.05 }));
    groupe.add(kit.bordure({ ligne: [[a - 0.07, Z_MASSIF[0] + 0.02], [a - 0.07, Z_MASSIF[1] + 0.07], [b + 0.07, Z_MASSIF[1] + 0.07], [b + 0.07, Z_MASSIF[0] + 0.02]], largeur: 0.1, hauteur: 0.08, materiau: 'beton' }));
    if (budget()) yield;
  }
  yield;

  // ---- 4. L'ESCALIER DE 12 MARCHES (béton gris, comme la volée de 34 : C3), avancé d'un demi-giron vers le bas, comme
  // les volées de la zone Z06 : le plan incliné du sol des données ne touche plus que l'angle rentrant des marches
  {
    const [x0, z0, y0] = ESC12.a, [x1, z1, y1] = ESC12.de, L = Math.hypot(x1 - x0, z1 - z0), gi = L / ESC12.marches;
    const ux = (x1 - x0) / L, uz = (z1 - z0) / L, k = gi / 2;
    groupe.add(kit.escalier({ de: [x0 - ux * k, z0 - uz * k, y0 + 0.01], a: [x1 - ux * k, z1 - uz * k, y1 + 0.01], marches: ESC12.marches, largeur: ESC12.largeur,
      limon: false, materiau: 'beton', usure: 0.6 }));
  }
  if (budget()) yield;
  // ---- 5. L'ÉCHIFFRE : béton gris lisse, 22 cm, dont le dessus suit le talus qu'il retient (8 cm au-dessus de la terre,
  // 30 cm au moins au-dessus du pied)
  const lotE = new kit.Lot('échiffre');
  echiffre(kit, lotE);
  groupe.add(lotE.maillages('échiffre'));
  yield;

  // ---- 6. LES HAIES TAILLÉES, puis les arbustes (le talus de l'échiffre, le pied du pignon x+)
  for (const h of HAIES) { groupe.add(kit.haieTaillee({ ligne: h.ligne, h: h.h, ep: h.ep, essence: h.essence })); if (budget()) yield; }
  const feu = new Touffes(), tous = [...TALUS, ...ARBUSTES_PIGNON];
  for (let i = 0; i < tous.length; i++) { arbuste(feu, tous[i]); if ((i & 1) && budget()) yield; }
  const mf = maillageFeuillage(feu, K, 'arbustes de la placette', true);
  if (mf) groupe.add(mf);
  yield;

  // ---- 7. LE MOBILIER : bancs verts, corbeilles (noires : la peinture verte du kit assombrie), lampadaires gris clair
  for (const b of BANCS) groupe.add(kit.banc({ x: b.x, z: b.z, cap: b.cap, style: 'lattes_vertes' }));
  for (const c of CORBEILLES) {
    const cb = kit.poubelle({ x: c.x, z: c.z, cap: 0 });
    cb.traverse((m) => { const col = m.isMesh && m.geometry.attributes.color; if (col) { const a = col.array.slice(); for (let i = 0; i < a.length; i++) a[i] *= 0.4; m.geometry = m.geometry.clone(); m.geometry.setAttribute('color', new THREE.BufferAttribute(a, 3)); } });
    groupe.add(cb);
  }
  for (const l of LAMPADAIRES) groupe.add(kit.lampadaire({ x: l.x, z: l.z, style: 'moderne', cap: l.cap }));
}

// L'ÉCHIFFRE (voir placette) : une paroi de béton de 22 cm le long de ECHIFFRE, son dessus lissé, ses deux bouts fermés.
// Le côté HAUT (le talus) est à gauche du sens de parcours de la ligne : la terre y est lue à 40 cm ; le côté BAS (les
// marches, puis la placette) à droite.
function echiffre(kit, lot) {
  const pts = kit.reechantillonner(ECHIFFRE, 0.4), e = 0.11, p = lot.part('beton'), tu = kit.TUILES.beton;
  const N = pts.map((q, i) => {
    const A = pts[Math.max(0, i - 1)], B = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(B.x - A.x, B.z - A.z) || 1;
    return [-(B.z - A.z) / l, (B.x - A.x) / l];                         // la droite du sens de parcours : le côté bas
  });
  let haut = pts.map((q, i) => {
    const [nx, nz] = N[i], terre = kit.sol(q.x - nx * 0.4, q.z - nz * 0.4), pied = kit.sol(q.x + nx * 0.4, q.z + nz * 0.4);
    return Math.max(terre + 0.08, pied + 0.3);
  });
  for (let pass = 0; pass < 3; pass++) haut = haut.map((y, i) => (y + haut[Math.max(0, i - 1)] + haut[Math.min(haut.length - 1, i + 1)]) / 3);
  const col = (y, f = 1) => mul(BETON_GRIS, f * (0.94 + 0.08 * kit.bruit(y * 3, 0.3, 57)));
  let prec = null;
  for (let i = 0; i < pts.length; i++) {
    const q = pts[i], [nx, nz] = N[i], yb = Math.min(kit.sol(q.x - nx * 0.4, q.z - nz * 0.4), kit.sol(q.x + nx * 0.4, q.z + nz * 0.4)) - 0.35, yt = haut[i];
    const L = [q.x - nx * e, q.z - nz * e], R = [q.x + nx * e, q.z + nz * e];
    const v = [
      lot.s(p, R[0], yb, R[1], nx, 0, nz, q.s / tu, yb / tu, col(yb, 0.85)), lot.s(p, R[0], yt, R[1], nx, 0, nz, q.s / tu, yt / tu, col(yt)),
      lot.s(p, L[0], yb, L[1], -nx, 0, -nz, q.s / tu, yb / tu, col(yb, 0.8)), lot.s(p, L[0], yt, L[1], -nx, 0, -nz, q.s / tu, yt / tu, col(yt, 0.92)),
      lot.s(p, R[0], yt, R[1], 0, 1, 0, q.s / tu, 0, col(yt, 1.06)), lot.s(p, L[0], yt, L[1], 0, 1, 0, q.s / tu, 0.22 / tu, col(yt, 1.06)),
    ];
    if (prec) { lot.quad(p, prec[0], v[0], v[1], prec[1]); lot.quad(p, prec[2], v[2], v[3], prec[3]); lot.quad(p, prec[4], v[4], v[5], prec[5]); }
    if (i === 0 || i === pts.length - 1) {
      const A = pts[i === 0 ? 1 : i - 1], sx = q.x - A.x, sz = q.z - A.z, l = Math.hypot(sx, sz) || 1;
      lot.polygone('beton', [[R[0], yb, R[1]], [R[0], yt, R[1]], [L[0], yt, L[1]], [L[0], yb, L[1]]], [sx / l, 0, sz / l], { couleur: col(yt, 0.95) });
    }
    prec = v;
  }
}

// ============================================================================================ le mur (Z02c)
// LE MUR DE MEULIÈRE le long de l'esplanade (voir MUR) : le mur du kit (moellons de meulière, les deux faces : celle de
// l'esplanade et le parement arrière, vu de l'allée du mur, zone Z10), son CHAPERON de dalles de béton gris (12 cm, 7 cm
// de débord, comme celui du plateau : js/court_parc.js murMeuliere), le TREILLIS vert sur ses sept premiers mètres et la
// GRILLE NOIRE basse ensuite, qui tourne avec le mur au-dessus de l'escalier.
function* murEsplanade(ctx) {
  const { kit, groupe } = ctx, budget = ctx.budget || (() => false);
  // (sur téléphone, le mur est coupé en deux pièces : une pièce du kit ne rend pas la main en cours de route)
  const L = MUR.ligne, pieces = ctx.mobile ? [[L[0], [-23.925, -26.5]], [[-23.925, -26.5], L[1], L[2]]] : [L];
  for (const ligne of pieces) {
    groupe.add(yield* kit.murPierrePas({ ligne, ep: MUR.ep, pierre: 'meuliere', cote: 'gauche', yHaut: MUR.haut, chaperon: 0, chaines: false, plinthe: false }, budget));   // (lot C6 : en tranches)
    yield;
  }
  // le chaperon : des dalles de béton d'un mètre, joints de 5 mm, dessus un peu bombé ; plus sombres de lichen par places
  const lot = new kit.Lot('chaperon et grilles'), w = MUR.ep / 2 + 0.07, hc = MUR.chaperon;
  const pr = [[-w, 0], [w, 0], [w, hc - 0.02], [w - 0.02, hc], [-w + 0.02, hc], [-w, hc - 0.02]];
  for (let i = 0; i + 1 < L.length; i++) {
    const [ax, az] = L[i], [bx, bz] = L[i + 1], l = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(l / 1.0));
    const ux = (bx - ax) / l, uz = (bz - az) / l, d0 = i === 0 ? 0 : -w, d1 = i + 2 === L.length ? 0.1 : w;
    for (let k = 0; k < n; k++) {
      const s0 = (l * k) / n + (k === 0 ? d0 : 0.0025), s1 = (l * (k + 1)) / n + (k === n - 1 ? d1 : -0.0025);
      const A = [ax + ux * s0, MUR.haut, az + uz * s0], B = [ax + ux * s1, MUR.haut, az + uz * s1];
      const t = 0.92 + 0.12 * alea(A[0], A[2], 61), li = kit.bruit(A[2] * 0.7, A[0], 62) > 0.62 ? 0.82 : 1;
      lot.prisme('beton', pr, [A, B], { vertical: true, couleur: mul(CHAPERON, t * li), uDecal: alea(A[2], 1, 63), vDecal: alea(A[2], 2, 63) });
    }
  }
  // le treillis vert : panneaux de treillis soudé (matériau propre), poteaux tous les 2,4 m, quatre lisses (171705)
  const yT = MUR.haut + MUR.chaperon, V = VERT_TREILLIS;
  for (let z = TREILLIS.z0; z >= TREILLIS.z1 - 0.01; z -= 2.4) {
    const zz = Math.max(TREILLIS.z1, z);
    bloc(lot, 'peinture', TREILLIS.x - 0.0225, TREILLIS.x + 0.0225, yT, yT + TREILLIS.h + 0.02, zz - 0.0225, zz + 0.0225, { couleur: V, bande: true });
  }
  bloc(lot, 'peinture', TREILLIS.x - 0.0225, TREILLIS.x + 0.0225, yT, yT + TREILLIS.h + 0.02, TREILLIS.z1 - 0.0225, TREILLIS.z1 + 0.0225, { couleur: V, bande: true });
  for (const f of [0.05, 0.25, 0.58, 0.91]) lot.barre([TREILLIS.x - 0.03, yT + f * TREILLIS.h, TREILLIS.z0], [TREILLIS.x - 0.03, yT + f * TREILLIS.h, TREILLIS.z1], 0.03, 0.03, { couleur: V, haut: [0, 1, 0] });
  groupe.add(lot.maillages('chaperon et grilles'));
  groupe.add(panneauTreillis(yT));
  yield;
  // la grille noire basse : barreaux simples d'1 m sur le chaperon, poteaux tous les 2 m (en trois pièces du kit : une
  // seule, de 32 m, faisait une tranche de 10 ms)
  const zm = (GRILLE[0][1] + GRILLE[1][1]) / 2;
  for (const ligne of [[GRILLE[0], [GRILLE[0][0], zm]], [[GRILLE[0][0], zm], GRILLE[1]], [GRILLE[1], GRILLE[2]]]) {
    groupe.add(kit.grilleBarreaux({ ligne, h: 1.0, pointes: false, muret: 0, y: yT, pas: 0.12, travee: 2.0 }));
    if (budget()) yield;
  }
}
// LE PANNEAU DE TREILLIS : un plan double face, texture détourée (fils verticaux tous les 5 cm, horizontaux tous les
// 10 cm, légèrement ondulés : 171705), dessinée une fois.
let _treillis = null;
function materiauTreillis() {
  if (_treillis) return _treillis;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128); g.strokeStyle = '#ffffff'; g.lineWidth = 1.6;
  for (let i = 0; i < 10; i++) { const x = 6.4 + i * 12.8; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 128; y += 8) g.lineTo(x + 0.8 * Math.sin(y * 0.4 + i), y); g.stroke(); }
  g.lineWidth = 2.0;
  for (let j = 0; j < 5; j++) { const y = 12.8 + j * 25.6; g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  _treillis = new THREE.MeshStandardMaterial({ color: 0x3d5646, map: t, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.2 });
  _treillis.name = 'Z02 · treillis soudé';
  return _treillis;
}
function panneauTreillis(yT) {
  const L = TREILLIS.z0 - TREILLIS.z1, g = new THREE.PlaneGeometry(L, TREILLIS.h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (L / 0.5), uv.getY(i) * (TREILLIS.h / 0.5));
  const m = new THREE.Mesh(g, materiauTreillis());
  m.rotation.y = Math.PI / 2; m.position.set(TREILLIS.x + Monde.dx, yT + TREILLIS.h / 2 + 0.01, (TREILLIS.z0 + TREILLIS.z1) / 2);
  m.castShadow = false; m.receiveShadow = true; m.name = 'treillis du mur'; m.userData.feuillage = true;
  return m;
}

// ============================================================================================ la zone
// (les obstacles sont déclarés par morceaux de 2 m au plus : leur hauteur se lit sur le sol au milieu de chacun)
function segments(o, ligne, opt, pas = 2) {
  for (let i = 0; i + 1 < ligne.length; i++) {
    const [ax, az] = ligne[i], [bx, bz] = ligne[i + 1], l = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(l / pas));
    for (let k = 0; k < n; k++) o.segment(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, ax + ((bx - ax) * (k + 1)) / n, az + ((bz - az) * (k + 1)) / n, opt);
  }
}
export default {
  id: 'Z02', nom: 'Esplanade des platanes et façade Charras',
  emprise: [[-25, -60], [9, -60], [9, -9.1], [-25, -9.1]],
  morceaux: [
    { id: 'Z02a', nom: 'façade de la caserne Charras et son perron', boite: BOITES.Z02a, construire: facade, silhouette: silhouetteFacade },
    { id: 'Z02b', nom: 'placette, escalier de 12 marches, coin rouge', boite: BOITES.Z02b, construire: placette },
    { id: 'Z02c', nom: 'mur de meulière de l’esplanade', boite: BOITES.Z02c, construire: murEsplanade },
  ],
  // PUR (sans three) : le bâtiment et le perron sont dans les données (monde.json > obstacles, gabarit perron_charras) ;
  // ici, ce que la zone pose sur le sol
  obstacles(o) {
    // les massifs du pied de la façade (on n'y entre pas), l'échiffre, la grille au-dessus de l'escalier
    // (0,5 m : à 0,35, la hauteur d'un pas, le joueur montait dans les bégonias et marchait jusqu'au pied du mur)
    for (const [a, b] of MASSIFS) o.boite((a + b) / 2, (Z_MASSIF[0] + Z_MASSIF[1]) / 2, (b - a) / 2 + 0.05, (Z_MASSIF[1] - Z_MASSIF[0]) / 2 + 0.05, 0, { h: 0.5, type: 'dur' });
    segments(o, ECHIFFRE, { e: 0.22, h: 0.9, type: 'dur' });
    segments(o, MUR.ligne.slice(1), { e: 0.3, h: 1.1, type: 'grille' });
    // les haies
    for (const h of HAIES) segments(o, h.ligne, { e: h.ep, h: h.h, type: 'haie' });
    // les arbustes assez gros pour qu'on ne les traverse pas
    for (const a of [...TALUS, ...ARBUSTES_PIGNON]) if (a.R >= 0.8) o.cercle(a.x, a.z, a.R * 0.55, { h: a.h, type: 'arbuste' });
    // le mobilier
    for (const b of BANCS) o.boite(b.x, b.z, 0.95, 0.3, 0, { h: 0.9, type: 'dur' });
    for (const c of CORBEILLES) o.cercle(c.x, c.z, 0.28, { h: 0.9, type: 'dur' });
    for (const l of LAMPADAIRES) o.cercle(l.x, l.z, 0.12, { h: 4.6, type: 'dur' });
  },
  bancs(b) { for (const q of BANCS) b.push({ x: q.x, z: q.z - 0.08, cap: q.cap, y: 0.47 }); },
  lieux: [],
};
