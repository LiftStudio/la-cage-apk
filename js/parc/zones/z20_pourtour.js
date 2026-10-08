// =====================================================================
//  ZONE Z20 : LE POURTOUR LOINTAIN (lot B11 du parc entier)
// =====================================================================
// Conception, § 1.3 (Z20, « hors parc : décor seulement ») et lot B11 ; références : tools/parc/references_gmaps/
// SYNTHESE.md (fiche Z20, dont les ÉCARTS À LA CONCEPTION priment) et R6.md (§ Z20 : 39 vues, l'île, l'horizon de
// Paris, La Défense, le pavillon des Indes, le boulevard regardé dos au parc), plus les photos de Haythem (j1, j4 :
// le belvédère au-dessus de la terrasse du bassin, l'île en face). Tout ce qu'on voit PAR-DESSUS les grilles du parc
// et qu'on n'atteint jamais : des SILHOUETTES, pas un décor qu'on touche. Budget de la conception (lot B11) : 40 appels
// de dessin et 80 000 triangles au plus pour TOUT le pourtour.
//
// CE QUI EST ICI, d'ouest en est :
//  - LE BOULEVARD SAINT-DENIS (Z18 s'arrête au bord de ses places en bataille, à 9,9 m de la grille) : la chaussée à
//    deux voies et sa ligne médiane, le stationnement en long et le trottoir d'en face, des voitures garées ; les
//    IMMEUBLES D'EN FACE, et seulement en face (R6 : côté parc, il n'y a que la PMI) : boîtes de 6 à 8 niveaux,
//    l'immeuble « paquebot » face au 156 (rotondes, balcons courbes continus, au-dessus du belvédère vu de la
//    terrasse), l'haussmannien de la rue Franklin, la meulière à encadrements de brique et le pavillon crème à comble
//    d'ardoise vers z 146, et, derrière, les deux tours de 15 à 16 niveaux de la rue Franklin ;
//  - LA PMI, au bord du parc (z -86 à -57) : enduit clair, toits en croupe de tuiles plates brun rouge ;
//  - AU NORD : l'école en U à toits de tuiles et sa cour, l'école au toit gris, la bibliothèque Charcot, le cinéma
//    Abel Gance, et la VIGNE de Bécon en rangs (OSM, landuse=vineyard) derrière le musée ;
//  - AU NORD-EST : l'IMMEUBLE À GRADINS (blanc, cinq niveaux, ses blocs décalés le long du parc, de la façade Charras
//    à la venelle du cinéma), son parking, l'annexe derrière Charras, et le carrefour du quai (immeubles crème et à
//    loggias brunes) ;
//  - AU SUD : le PAVILLON DES INDES (la seule pièce détaillée : l'atelier de brique à pignon polychrome et verrière,
//    le pavillon de bois peint rouge brun, sa crête ajourée et ses BULBES DORÉS en LatheGeometry, l'enclos à piliers
//    crème, la pelouse ronde) ; à l'emplacement de la conception (x -130 à -110, z 169 à 184 : l'épingle de Google est
//    100 m trop au sud-ouest) ; les SERRES municipales (une serre de verre, deux tunnels blancs, des remises), la
//    VIGNE EN RANGS du terrain des serres, les résidences blanches à terrasses en gradins de la rue Carpeaux ;
//  - L'ÎLE DE LA JATTE, en face, de z- à z+ (R6 § Z20.2, j1, Z20-08) : immeuble beige, BUREAUX À MUR-RIDEAU DE VERRE
//    gris bleu, long immeuble vitré hérissé d'édicules, immeubles beiges à ATTIQUE DE ZINC, immeubles beige gris
//    à toits plats, résidences blanches à terrasses en gradins et maison à toit d'ardoise ; derrière, la RANGÉE DE
//    PEUPLIERS D'ITALIE qui dépasse des toits. (Le quai, la Seine, la rive et ses arbres restent à la zone Z19, qui
//    lit ILE_IMMEUBLES pour ne pas planter d'arbre dans un immeuble.)
//  - L'HORIZON, en panneaux SUR LE CIEL : la TOUR EIFFEL (direction (0,99 ; 0,15) depuis le belvédère, 3,9° de haut)
//    et la TOUR MONTPARNASSE (bloc sombre, un peu à gauche de l'axe), qu'on ne voit QUE du belvédère et des parterres
//    (au-dessus des peupliers de l'île) ; LA DÉFENSE en bouquet au bout du quai (caps 230 à 255 : tour à couronnement
//    en pointe oblique au milieu, tours rectangulaires bleues, tour à coque arrondie à droite, immeubles de 40 à 80 m
//    au pied), minuscule depuis la promenade ; le PONT DE COURBEVOIE en travers de la Seine, tout au bout ; sous La
//    Défense et sous les deux tours de Paris, une bande de toits qui s'efface dans la brume (sans elle, vues d'en
//    haut, elles flottaient sur le ciel).
//
// LES HAUTEURS ET LES EMPREINTES viennent des données (js/parc/zones/z20_donnees.js, produit par
// tools/parc/pourtour.py) : bâtiments d'OpenStreetMap, hauteurs du MNS LiDAR HD (90e centile sous l'empreinte),
// styles d'après les fiches de R6. Dans la grille du monde, tout se pose sur Monde.sol (règle 2) ; au-delà (le
// boulevard d'en face au-delà de x -160, le nord au-delà de z -135, le sud au-delà de z 200), sur le MNT des données,
// raccordé au bord de la grille ; et la zone y pose aussi le SOL (SOL_LOIN), sans quoi on voyait le ciel entre les
// immeubles d'en face.
//
// LES FAÇADES : un ATLAS dessiné une fois (une bande de 64 px par étage type : 3 m de haut, 24 m de large qui se
// répètent), une bande par style (blanc à balcons, crème des années 1960, beige à loggias, pierre haussmannienne,
// meulière, paquebot, mur-rideau, enduit de la PMI, école, attique de zinc, mur aveugle, toits de gravier, de tuiles,
// d'ardoise, vitrage de serre, haie, sol). Chaque mur est découpé en étages ; chaque étage prend la bande de son
// style (rez-de-chaussée, étage courant, attique). Tous les immeubles d'un morceau, leurs toits et le sol lointain
// sont UN SEUL maillage, donc un appel de dessin.
//
// L'HORIZON est dessiné à part : un matériau à lui (ShaderMaterial), en géométrie à sa VRAIE place (la tour Eiffel à
// 4,8 km), sa profondeur ramenée sur le plan du fond (gl_Position.xyww) : il passe derrière TOUT ce qui est dessiné
// (les peupliers de l'île le cachent depuis la promenade, la rive le cache depuis le plateau), sans être coupé par
// camera.far (280 m en balade). Il ne s'éclaire pas, prend la brume du ciel (mêlé à la couleur du brouillard) et
// s'efface par temps couvert. Tour Eiffel et Montparnasse ne se montrent qu'au-dessus de y = 6 à 9 m (le belvédère,
// les parterres, le haut du parc) : d'en bas, rien ne les laisse voir (R6, Z20.2, « Horizon »).
//
// RÈGLES DE ZONE : aucun Math.random (hasard déterministe du parc, kit.alea) ; toute hauteur par Monde.sol dans la
// grille ; matériaux du kit (asphalte, peinture, brique, ardoise, pierre de taille, gravier, gazon, feuillage) plus
// CINQ propres à la zone : les façades (atlas), les façades lointaines de l'île (brume allégée, comme celles de Z19),
// le feuillage des peupliers (idem), l'or des bulbes, l'horizon ; aucun arbre planté (les peupliers de l'île et la
// vigne sont du décor lointain hors de arbres.bin, comme la rive de Z19) ; rien hors du groupe du morceau ; rien
// n'est animé. Aucun obstacle : tout est hors de l'enceinte (grilles et portillons fermés de monde.json), et les
// bâtiments de la grille ont déjà leur boîte dans monde.json.
import * as THREE from 'three';
import { Monde } from '../../monde.js';
import { BATIMENTS, SOL_LOIN } from './z20_donnees.js';

// ============================================================================================ repères
// La grille du monde (monde.json > repere) : dedans, Monde.sol ; dehors, le MNT des données.
const GRILLE = { x0: -160, x1: 60, z0: -135, z1: 200 };
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const borne = (x, a, b) => (x < a ? a : x > b ? b : x);
// Le MNT des données (SOL_LOIN, décimètres), lu en bilinéaire.
function solMnt(x, z) {
  const S = SOL_LOIN, fi = borne((x - S.x0) / S.pas, 0, S.nx - 1.001), fk = borne((z - S.z0) / S.pas, 0, S.nz - 1.001);
  const i = Math.floor(fi), k = Math.floor(fk), u = fi - i, v = fk - k, D = S.dm, a = k * S.nx + i;
  return ((D[a] * (1 - u) + D[a + 1] * u) * (1 - v) + (D[a + S.nx] * (1 - u) + D[a + S.nx + 1] * u) * v) / 10;
}
// Le sol du pourtour : Monde.sol dans la grille ; au-delà, le MNT, raccordé à la valeur du bord de la grille sur 12 m
// (le MNT et le sol du monde diffèrent de quelques centimètres : pas de marche à la couture).
function solPourtour(kit, x, z) {
  const xc = borne(x, GRILLE.x0, GRILLE.x1), zc = borne(z, GRILLE.z0, GRILLE.z1), bord = kit.sol(xc, zc);
  const d = Math.hypot(x - xc, z - zc);
  if (d < 1e-6) return bord;
  return bord + (solMnt(x, z) - bord) * lisse(0, 12, d);
}
const dansGrille = (x, z) => x > GRILLE.x0 && x < GRILLE.x1 && z > GRILLE.z0 && z < GRILLE.z1;

// ============================================================================================ l'atlas des façades
// 1024 x 1536 px : 24 bandes de 64 px. Une bande = UN ÉTAGE de 3 m de haut sur 24 m de large (42,7 px/m en largeur,
// 21,3 px/m en hauteur), qui se répète en largeur (RepeatWrapping en u, rien en v : on lit chaque bande entre ses
// deux bords, à 3 px près, pour que les mipmaps ne mêlent pas trop deux bandes voisines).
const AW = 1024, BH = 64, NB = 24, AH = BH * NB, REPET = 24;
const BANDES = ['blanc_rdc', 'blanc', 'creme_rdc', 'creme', 'beige', 'pierre_rdc', 'pierre', 'meuliere', 'brique', 'paquebot',
  'verre', 'loggias', 'enduit', 'bureau', 'attique', 'aveugle', 'toit', 'tuiles', 'ardoise', 'serre', 'haie', 'sol', 'ecole', 'gradins'];
const BANDE = Object.fromEntries(BANDES.map((n, i) => [n, i]));
// v de la bande (texture retournée à l'envoi : la rangée 0 du canevas est en haut, v = 1)
function vBande(nom) {
  const b = BANDE[nom];
  return { bas: 1 - (b * BH + BH - 3) / AH, haut: 1 - (b * BH + 3) / AH };
}
// Les styles : la bande du rez-de-chaussée, celle des étages ; la teinte de base (multipliée par la texture).
const STYLES = {
  blanc: { rdc: 'blanc_rdc', etage: 'blanc' }, creme: { rdc: 'creme_rdc', etage: 'creme' }, beige: { rdc: 'creme_rdc', etage: 'beige' },
  pierre: { rdc: 'pierre_rdc', etage: 'pierre' }, meuliere: { rdc: 'meuliere', etage: 'meuliere' }, brique: { rdc: 'brique', etage: 'brique' },
  paquebot: { rdc: 'blanc_rdc', etage: 'paquebot' }, verre: { rdc: 'verre', etage: 'verre' }, loggias: { rdc: 'creme_rdc', etage: 'loggias' },
  enduit: { rdc: 'enduit', etage: 'enduit' }, bureau: { rdc: 'blanc_rdc', etage: 'bureau' }, ecole: { rdc: 'ecole', etage: 'ecole' },
  gradins: { rdc: 'blanc_rdc', etage: 'gradins' }, aveugle: { rdc: 'aveugle', etage: 'aveugle' },
};

// Le dessin de l'atlas (fait une fois, à la première silhouette). `alea` : le hasard du parc.
function dessinerAtlas(c, alea) {
  const PX = AW / REPET, PY = BH / 3;                       // px par mètre (largeur, hauteur)
  // rectangle en mètres dans la bande b : x de la gauche, y du BAS de l'étage
  const R = (b, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x * PX), Math.round(b * BH + BH - (y + h) * PY), Math.max(1, Math.round(w * PX)), Math.max(1, Math.round(h * PY))); };
  const fond = (b, col) => { c.fillStyle = col; c.fillRect(0, b * BH, AW, BH); };
  // une vitre : sombre, le reflet du ciel plus clair en haut, une traverse et un dormant
  const vitre = (b, x, y, w, h, o = {}) => {
    R(b, x - 0.06, y - 0.06, w + 0.12, h + 0.12, o.cadre || '#f1f0ec');
    const g = c.createLinearGradient(0, b * BH + BH - (y + h) * PY, 0, b * BH + BH - y * PY);
    // (le reflet du ciel en haut, la pièce sombre en bas ; une vitre vue du dehors, de jour, reste un gris moyen)
    g.addColorStop(0, o.haut || '#8e9ba6'); g.addColorStop(0.45, o.milieu || '#56626c'); g.addColorStop(1, o.bas || '#434d56');
    c.fillStyle = g; c.fillRect(Math.round(x * PX), Math.round(b * BH + BH - (y + h) * PY), Math.round(w * PX), Math.round(h * PY));
    if (o.croisee !== false) { R(b, x + w / 2 - 0.03, y, 0.06, h, o.cadre || '#e9e8e3'); }
    if (o.volet) R(b, x, y + h * (1 - o.volet), w, h * o.volet, o.voletCol || '#b7b2a8');
  };
  // un bruit de fond : des taches lentes (salissures, enduit repris)
  const taches = (b, n, cols, k) => {
    for (let i = 0; i < n; i++) {
      const x = alea(i, b, k) * REPET, y = alea(i, b, k + 1) * 3, w = 0.3 + alea(i, b, k + 2) * 2.5, h = 0.2 + alea(i, b, k + 3) * 1.4;
      R(b, x, y, w, h, cols[i % cols.length]);
    }
  };
  // un grain fin (gravier, tuiles, haie) : des points
  const grain = (b, n, cols, k, taille = 1) => {
    for (let i = 0; i < n; i++) {
      c.fillStyle = cols[Math.floor(alea(i, b, k) * cols.length)];
      c.fillRect(Math.floor(alea(i, b, k + 1) * AW), b * BH + Math.floor(alea(i, b, k + 2) * BH), taille, taille);
    }
  };
  let b;
  // --- blanc récent : balcons à dalle blanche et garde-corps de verre une travée sur deux (Z20-29, Z20-31)
  b = BANDE.blanc_rdc; fond(b, '#e7e5df'); R(b, 0, 0, REPET, 0.45, '#b9b6ae');
  for (let i = 0; i < 8; i++) { const x = i * 3; if (i === 3) vitre(b, x + 0.3, 0.05, 2.4, 2.3, { croisee: false, cadre: '#6b6f72' }); else vitre(b, x + 0.8, 0.9, 1.4, 1.4, { volet: alea(i, 1, 2) < 0.4 ? 0.5 : 0 }); }
  R(b, 0, 2.82, REPET, 0.18, '#f4f3ef');
  b = BANDE.blanc; fond(b, '#eeede8'); taches(b, 10, ['rgba(120,115,105,0.05)'], 11);
  for (let i = 0; i < 8; i++) {
    const x = i * 3, balcon = i % 2 === 0;
    if (balcon) { vitre(b, x + 0.75, 0.2, 1.5, 2.25, { volet: alea(i, 2, 3) < 0.3 ? 0.35 : 0 }); R(b, x, 0, 3, 0.2, '#f6f5f1'); R(b, x + 0.05, 0.2, 2.9, 0.9, 'rgba(172,190,198,0.55)'); R(b, x, 1.08, 3, 0.05, '#d6d6d2'); }
    else vitre(b, x + 0.8, 0.85, 1.4, 1.45, { volet: alea(i, 2, 4) < 0.35 ? 0.4 : 0 });
  }
  // --- crème des années 1960 : fenêtres régulières, volets roulants à demi baissés, quelques balconnets
  b = BANDE.creme_rdc; fond(b, '#ddd5c2'); R(b, 0, 0, REPET, 0.6, '#aaa396');
  for (let i = 0; i < 8; i++) { const x = i * 3; if (i === 5) vitre(b, x + 0.6, 0.0, 1.8, 2.3, { croisee: false, cadre: '#5c544a', milieu: '#2c2925' }); else { vitre(b, x + 0.9, 1.0, 1.2, 1.3, { cadre: '#ece6d6' }); for (let k = 0; k < 6; k++) R(b, x + 0.9 + k * 0.22, 1.0, 0.03, 1.3, '#6d6a64'); } }
  b = BANDE.creme; fond(b, '#e3dccb'); taches(b, 12, ['rgba(110,95,70,0.05)'], 13);
  for (let i = 0; i < 16; i++) {
    const x = i * 1.5 + 0.2, v = alea(i, 3, 5);
    vitre(b, x, 0.9, 1.1, 1.45, { cadre: '#efeadf', volet: v < 0.45 ? 0.3 + 0.5 * alea(i, 3, 6) : 0, voletCol: '#c4bdb0' });
    if (i % 4 === 1) { R(b, x - 0.1, 0.85, 1.3, 0.08, '#c9c2b2'); R(b, x - 0.05, 0.9, 1.2, 0.55, 'rgba(40,40,40,0.55)'); }
  }
  R(b, 0, 0, REPET, 0.1, '#d3cbb8');
  // --- beige à loggias et balcons (Z20-27), derniers étages en retrait
  b = BANDE.beige; fond(b, '#ddd3bf'); taches(b, 10, ['rgba(100,85,60,0.05)'], 17);
  for (let i = 0; i < 6; i++) {
    const x = i * 4;
    R(b, x + 0.4, 0.15, 2.6, 2.55, '#5c5850');                          // la loggia, dans l'ombre
    vitre(b, x + 0.6, 0.25, 2.2, 2.2, { cadre: '#6a665e', haut: '#6f7a83', milieu: '#343c43' });
    R(b, x + 0.4, 0.15, 2.6, 0.95, 'rgba(70,62,52,0.9)'); R(b, x + 0.4, 1.05, 2.6, 0.06, '#2c2a27');   // le garde-corps
    vitre(b, x + 3.25, 0.95, 0.6, 1.3, { croisee: false, cadre: '#e8e1d0' });
  }
  R(b, 0, 0, REPET, 0.15, '#cfc4ae');
  // --- pierre de taille haussmannienne : refends au rez-de-chaussée, hautes fenêtres à balcons de fer (Z20-31)
  b = BANDE.pierre_rdc; fond(b, '#d6c6a3');
  for (let y = 0.4; y < 3; y += 0.45) R(b, 0, y, REPET, 0.04, '#b8a682');
  for (let i = 0; i < 6; i++) { const x = i * 4 + 0.8; vitre(b, x, 0.05, 2.4, 2.4, { croisee: false, cadre: '#c9b893', milieu: '#3a3530', bas: '#2a2622' }); R(b, x, 2.45, 2.4, 0.15, '#d9cbaa'); }
  b = BANDE.pierre; fond(b, '#d8c8a6');
  for (let y = 0.5; y < 3; y += 0.5) R(b, 0, y, REPET, 0.025, '#c6b48f');
  for (let x = 0.7; x < REPET; x += 1.4) R(b, x, 0, 0.02, 3, 'rgba(160,140,105,0.25)');
  for (let i = 0; i < 12; i++) {
    const x = i * 2 + 0.45;
    R(b, x - 0.15, 0.25, 1.4, 2.35, '#e3d7bd');
    vitre(b, x, 0.3, 1.1, 2.15, { cadre: '#ebe6da', haut: '#808b93', milieu: '#3b4248' });
  }
  R(b, 0, 0.3, REPET, 0.05, '#1d1d1d'); R(b, 0, 1.25, REPET, 0.06, '#1d1d1d');   // le balcon filant
  for (let x = 0.05; x < REPET; x += 0.18) R(b, x, 0.3, 0.025, 0.95, 'rgba(25,25,25,0.85)');
  R(b, 0, 0.1, REPET, 0.2, '#cdbb96');
  // --- meulière à encadrements de brique (Z20-33)
  b = BANDE.meuliere; fond(b, '#b89a78');
  for (let i = 0; i < 900; i++) { const x = alea(i, 7, 21) * REPET, y = alea(i, 7, 22) * 3; R(b, x, y, 0.15 + alea(i, 7, 23) * 0.35, 0.1 + alea(i, 7, 24) * 0.2, ['#a88a68', '#c4a886', '#9c7e5c', '#b39270'][i % 4]); }
  for (let i = 0; i < 8; i++) { const x = i * 3 + 0.85; R(b, x - 0.22, 0.65, 1.74, 1.95, '#a4553c'); vitre(b, x, 0.85, 1.3, 1.6, { cadre: '#efe9dc' }); }
  R(b, 0, 2.7, REPET, 0.16, '#a4553c');
  // --- brique rouge à bandeaux clairs
  b = BANDE.brique; fond(b, '#a4553c'); grain(b, 4000, ['#94492f', '#b0614a', '#8c4632'], 25, 2);
  for (let i = 0; i < 8; i++) { const x = i * 3 + 0.9; vitre(b, x, 0.8, 1.2, 1.55, { cadre: '#efe9dc' }); R(b, x - 0.1, 2.35, 1.4, 0.12, '#e0cfa4'); }
  R(b, 0, 2.75, REPET, 0.14, '#e0cfa4');
  // --- l'immeuble « paquebot » : dalles de balcons blanches continues, garde-corps vitrés, baies sombres (Z20-30)
  b = BANDE.paquebot; fond(b, '#e4e3dd');
  for (let i = 0; i < 16; i++) vitre(b, i * 1.5 + 0.1, 0.25, 1.3, 2.35, { croisee: false, cadre: '#f3f2ee', haut: '#7c8994', milieu: '#384450' });
  R(b, 0, 0, REPET, 0.28, '#f6f5f2'); R(b, 0, 0.0, REPET, 0.05, '#c9c8c2');
  R(b, 0, 0.28, REPET, 0.85, 'rgba(190,205,212,0.6)'); R(b, 0, 1.1, REPET, 0.05, '#f0f0ec');
  // --- mur-rideau de verre gris bleu (bureaux de l'île, Z20-04) : allèges opaques, montants clairs
  b = BANDE.verre; fond(b, '#7f93a3');
  for (let i = 0; i < 16; i++) {
    const x = i * 1.5, k = alea(i, 10, 31);
    const g = c.createLinearGradient(0, b * BH, 0, b * BH + BH);
    g.addColorStop(0, k < 0.3 ? '#9fb2c0' : '#8ca1b1'); g.addColorStop(0.6, k < 0.5 ? '#61768a' : '#6c8194'); g.addColorStop(1, '#55697b');
    c.fillStyle = g; c.fillRect(Math.round(x * PX), b * BH, Math.round(1.5 * PX), BH);
  }
  R(b, 0, 0, REPET, 0.75, '#93a3b0'); R(b, 0, 0.72, REPET, 0.06, '#cdd3d7');
  for (let x = 0; x < REPET; x += 1.5) R(b, x, 0, 0.07, 3, '#c9cfd3');
  // --- loggias brunes (carrefour nord-est, Z20-19)
  b = BANDE.loggias; fond(b, '#d9d0bf');
  for (let i = 0; i < 6; i++) { const x = i * 4 + 0.3; R(b, x, 0.1, 3.3, 2.7, '#8b6a52'); R(b, x + 0.2, 0.2, 2.9, 2.5, '#5a463a'); vitre(b, x + 0.35, 0.3, 2.6, 2.1, { cadre: '#7a6252', milieu: '#2f3439' }); R(b, x, 0.1, 3.3, 1.0, '#8b6a52'); }
  // --- enduit clair de la PMI : petites fenêtres, coffres de volets roulants gris
  b = BANDE.enduit; fond(b, '#e9e6df'); taches(b, 8, ['rgba(120,110,90,0.05)'], 33);
  for (let i = 0; i < 8; i++) { const x = i * 3 + 0.95; vitre(b, x, 0.9, 1.1, 1.3, { cadre: '#f2f0ea', volet: alea(i, 12, 7) < 0.5 ? 0.6 : 0.15, voletCol: '#9a9a96' }); R(b, x - 0.05, 2.2, 1.2, 0.18, '#9a9a96'); }
  R(b, 0, 0, REPET, 0.35, '#c9c4b8');
  // --- bandeaux blancs et fenêtres en bandes (long immeuble de l'île, Z20-10)
  b = BANDE.bureau; fond(b, '#e6e3db');
  { const g = c.createLinearGradient(0, b * BH + BH - 2.55 * PY, 0, b * BH + BH - 0.95 * PY); g.addColorStop(0, '#6e7c88'); g.addColorStop(1, '#36414b'); c.fillStyle = g; c.fillRect(0, Math.round(b * BH + BH - 2.55 * PY), AW, Math.round(1.6 * PY)); }
  for (let x = 0; x < REPET; x += 1.2) R(b, x, 0.95, 0.06, 1.6, '#d9d7d0');
  R(b, 0, 0, REPET, 0.08, '#cfccc4');
  // --- attique de zinc à lucarnes (île, boulevard)
  b = BANDE.attique; fond(b, '#5f6468');
  for (let x = 0; x < REPET; x += 0.5) R(b, x, 0, 0.04, 3, '#6d7276');
  for (let i = 0; i < 8; i++) { const x = i * 3 + 0.9; R(b, x - 0.15, 0.4, 1.5, 1.9, '#7a7f83'); vitre(b, x, 0.55, 1.2, 1.45, { cadre: '#e8e7e2' }); }
  R(b, 0, 0, REPET, 0.12, '#4c5054');
  // --- mur aveugle (pignons, annexes, garages)
  b = BANDE.aveugle; fond(b, '#d9d5cc'); taches(b, 30, ['rgba(110,100,85,0.07)', 'rgba(255,255,255,0.08)'], 35);
  for (let x = 0; x < REPET; x += 3.7) R(b, x, 0, 0.05, 3, 'rgba(90,85,75,0.12)');
  // --- toit de gravier (toits plats) : le grain seul, la teinte vient des sommets
  b = BANDE.toit; fond(b, '#8f8d88'); grain(b, 6000, ['#7e7c77', '#a09d97', '#8a8782', '#99968f'], 37, 2);
  // --- tuiles plates brun rouge (PMI, écoles) et ardoise
  b = BANDE.tuiles; fond(b, '#9a5a45');
  for (let y = 0; y < 3; y += 0.3) R(b, 0, y, REPET, 0.05, '#7a4434');
  grain(b, 3000, ['#a8654e', '#8c503d', '#a35f4a'], 39, 3);
  b = BANDE.ardoise; fond(b, '#5b6168');
  for (let y = 0; y < 3; y += 0.25) R(b, 0, y, REPET, 0.04, '#4a4f55');
  grain(b, 2500, ['#646a71', '#53585e', '#5f656c'], 41, 3);
  // --- vitrage de serre (verre clair, petits bois blancs)
  b = BANDE.serre; fond(b, '#c9d6d3');
  for (let x = 0; x < REPET; x += 0.75) R(b, x, 0, 0.06, 3, '#f2f4f2');
  for (let y = 0.6; y < 3; y += 0.6) R(b, 0, y, REPET, 0.05, '#eef1ef');
  for (let i = 0; i < 32; i++) R(b, i * 0.75 + 0.06, 0, 0.69, 3, `rgba(${alea(i, 19, 3) < 0.5 ? '120,150,120' : '255,255,255'},0.12)`);
  // --- haie, vigne (des feuilles en grain)
  b = BANDE.haie; fond(b, '#34492b'); grain(b, 9000, ['#2a3d23', '#43592f', '#506a36', '#24341e'], 43, 3);
  // --- sol neutre (la teinte vient des sommets : jardins, cours, rues lointaines)
  b = BANDE.sol; fond(b, '#8a8a84'); grain(b, 5000, ['#7f7f79', '#94948d', '#868680'], 45, 3);
  // --- école : enduit beige, grandes fenêtres à petits bois
  b = BANDE.ecole; fond(b, '#e6dccb'); R(b, 0, 0, REPET, 0.5, '#b8ad9a');
  for (let i = 0; i < 7; i++) { const x = i * 3.43 + 0.7; vitre(b, x, 0.8, 2.0, 1.75, { cadre: '#f3efe6' }); R(b, x, 1.4, 2.0, 0.05, '#f3efe6'); }
  // --- résidences blanches à terrasses en gradins (rue Carpeaux, île) : garde-corps vitrés continus, grandes baies
  b = BANDE.gradins; fond(b, '#ecebe6');
  for (let i = 0; i < 8; i++) vitre(b, i * 3 + 0.4, 0.2, 2.2, 2.3, { croisee: false, cadre: '#f6f6f3' });
  R(b, 0, 0, REPET, 0.22, '#f6f6f3'); R(b, 0, 0.22, REPET, 0.9, 'rgba(185,199,206,0.55)'); R(b, 0, 1.1, REPET, 0.04, '#d8d8d4');
}

// LES MATÉRIAUX DE LA ZONE (règle 3 : au plus six, ils sont cinq ; faits une fois, partagés par tous les morceaux)
const MAT = {};
// `part` : la part du brouillard qu'il prend (l'île à 250 m n'en prend qu'un septième, comme dans Z19) ; `emission` :
// la part de sa propre couleur qu'il renvoie en plus (la lumière du ciel sur une façade à contre-jour du couchant).
// `tasser` : la profondeur au-delà de 90 % de camera.far est TASSÉE dans les derniers 10 % (sans jamais les dépasser),
// au lieu d'être coupée par le plan du fond. C'est pour l'île : des parterres et de la grille du 156 (PV09), ses
// immeubles et ses peupliers sont à 290-400 m de l'œil, au-delà de camera.far (280 m en balade, préréglage haut) ; la
// photo 1 et Z20-13 y montrent pourtant, au-dessus de la balustrade du belvédère, le faîte des immeubles clairs et le
// mur sombre des peupliers, d'où sortent Montparnasse et la tour Eiffel. Tassée en douceur (d0 + L·(1 - e^(-(d-d0)/L)),
// de pente 1 au départ), la profondeur garde son ordre : les immeubles restent devant les peupliers, et les arbres de
// la rive (zone Z19), à 26 m et plus devant les façades, devant elles. Rien ne change en deçà de 0,9·far (le far se
// lit dans la matrice de projection : P[3][2] / (P[2][2] + 1) ; caméra en perspective seulement).
// (relecture du lot B11 : on tasse la DISTANCE à l'œil, plus la seule profondeur, et dans [min(0,9·far, far - 30) ;
// far - 20] au lieu des 10 derniers % : la JUPE DE BRUME de js/monde_charge.js, une sphère de fogFar + 2 = far - 18 m
// autour de l'œil, 2,5° sous l'horizon et plus bas, écrit la profondeur. Tassé derrière elle — en profondeur, sur les
// bords de l'image, une sphère est bien plus près que le plan du fond —, tout ce qui passait sous sa lisière
// disparaissait : du drone, PV21, des immeubles de la rue Franklin ne restait qu'un bandeau, le haut, qui flottait sur
// la brume. La profondeur suit la distance tassée le long du même rayon : l'ordre reste le même sur chaque pixel.)
// `voile` (0 : sans) : la part de brouillard VERS laquelle on glisse au-delà de la fin du brouillard (de 0,72 à 1,08 fois
// fogFar). C'est pour les façades du boulevard, dessinées APRÈS l'anneau de brume du ciel (voir apresLaBrume) : elles
// n'en prennent plus le voile d'un coup, à 240 m (relecture du lot B11 : vu du drone, PV21, un immeuble à cheval sur
// l'anneau sortait net devant, fantôme blanc derrière, coupé en biais), elles s'y fondent peu à peu, elles-mêmes.
function brumeAllegee(m, part, emission, tasser = false, voile = 0) {
  m.onBeforeCompile = (sh) => {
    if (tasser) sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
	if ( projectionMatrix[ 2 ][ 3 ] < - 0.5 ) {
		float loinZ20 = projectionMatrix[ 3 ][ 2 ] / ( projectionMatrix[ 2 ][ 2 ] + 1.0 );
		float dZ20 = - mvPosition.z, rZ20 = length( mvPosition.xyz );
		float r0Z20 = min( 0.9 * loinZ20, loinZ20 - 30.0 ), lZ20 = loinZ20 - 20.0 - r0Z20;
		if ( rZ20 > r0Z20 && dZ20 > 1.0 ) {
			float d2Z20 = dZ20 * ( r0Z20 + lZ20 * ( 1.0 - exp( - ( rZ20 - r0Z20 ) / lZ20 ) ) ) / rZ20;
			gl_Position.z = ( projectionMatrix[ 2 ][ 2 ] * ( - d2Z20 ) + projectionMatrix[ 3 ][ 2 ] ) / d2Z20 * gl_Position.w;
		}
	}`);
    if (emission) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
	totalEmissiveRadiance += diffuseColor.rgb * ${emission.toFixed(2)};`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	fogFactor *= ${part.toFixed(2)};
	${voile ? `#ifndef FOG_EXP2
		fogFactor = mix( fogFactor, ${voile.toFixed(2)}, smoothstep( 0.72 * fogFar, 1.08 * fogFar, vFogDepth ) );
	#endif` : ''}
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`);
  };
  m.customProgramCacheKey = () => 'z20 brume ' + part.toFixed(2) + ' ' + emission.toFixed(2) + (tasser ? ' tassée' : '') + (voile ? ' voile ' + voile.toFixed(2) : '');
  return m;
}
function atlas(ctx) {
  if (!MAT.atlas) {
    const t = ctx.K.canvasTex(AW, AH, (c) => dessinerAtlas(c, ctx.kit.alea), [1, 1], false, 8);
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
    MAT.atlas = t;
  }
  return MAT.atlas;
}
// (la brume : sept dixièmes de celle du parc. À 0,85, les immeubles de 250 à 400 m — vus du haut du parc ou du drone,
// PV21 — sortaient plus clairs que le ciel bleu derrière eux, en fantômes de verre ; à 0,7, ils restent des immeubles
// pâles, aux fenêtres encore lisibles, et à 100 m rien ne change à l'œil.)
// (relecture du lot B11 : dessinées après l'anneau de brume du ciel, comme l'île — apresLaBrume —, la profondeur tassée
// au-delà de 0,9·far, et le voile pris peu à peu jusqu'à 0,86 au-delà de la fin du brouillard. Avant, l'anneau, à 240 m
// de l'œil en balade, les voilait d'un coup et camera.far les coupait à 280 m : du drone, PV21, les immeubles de la rue
// Franklin sortaient en boîtes de verre pâles, tranchées en biais sur le ciel, devant d'autres restés nets.)
function materiauFacades(ctx) {
  if (!MAT.facades) {
    MAT.facades = brumeAllegee(new THREE.MeshStandardMaterial({ map: atlas(ctx), vertexColors: true, roughness: 0.88, metalness: 0 }), 0.7, 0.16, true, 0.86);
    MAT.facades.name = 'pourtour · façades';
  }
  return MAT.facades;
}
function materiauFacadesLoin(ctx) {
  if (!MAT.loin) {
    MAT.loin = brumeAllegee(new THREE.MeshStandardMaterial({ map: atlas(ctx), vertexColors: true, roughness: 0.85, metalness: 0 }), 0.14, 0.3, true);
    MAT.loin.name = 'pourtour · façades de l\'île';
  }
  return MAT.loin;
}
// Le feuillage des peupliers : celui du kit, à brume allégée (ses textures recopiées à leur arrivée)
function materiauPeupliers(ctx) {
  if (!MAT.peupliers) {
    const base = ctx.kit.materiau('feuillage'), m = brumeAllegee(base.clone(), 0.14, 0.06, true);
    m.name = 'pourtour · peupliers de l\'île';
    const copier = () => { for (const s of ['map', 'normalMap', 'aoMap', 'roughnessMap', 'metalnessMap']) m[s] = base[s]; m.needsUpdate = true; };
    copier(); ctx.kit.precharger(['feuillage']).then(copier);
    MAT.peupliers = m;
  }
  return MAT.peupliers;
}
// L'or des bulbes du pavillon des Indes (#d9a93c) : un métal, qui prend le reflet du ciel et le soleil du soir
function materiauOr() {
  if (!MAT.or) { MAT.or = new THREE.MeshStandardMaterial({ color: 0xd9a93c, metalness: 0.85, roughness: 0.32, vertexColors: true }); MAT.or.name = 'pourtour · or des bulbes'; }
  return MAT.or;
}

// ============================================================================================ le tampon de géométrie
// Des triangles pour UN matériau, dans des tableaux qui grandissent ; les triangles sont tournés d'après la normale de
// leurs sommets (comme le Lot du kit). Attributs : position, normal, uv, color (ceux du kit).
class Tampon {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; this.nb = 0; }
  s(x, y, z, nx, ny, nz, u, v, c) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.u.push(u, v); this.c.push(c[0], c[1], c[2]);
    return this.nb++;
  }
  tri(a, b, c) {
    const P = this.p, N = this.n;
    const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
    const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * cx + cy * cy + cz * cz < 1e-12) return;
    const d = cx * (N[a * 3] + N[b * 3] + N[c * 3]) + cy * (N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1]) + cz * (N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2]);
    if (d >= 0) this.i.push(a, b, c); else this.i.push(a, c, b);
  }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  get vide() { return this.i.length === 0; }
  geometrie() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.nb > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeBoundingSphere();
    return g;
  }
  // le maillage (décalé de Monde.dx, comme ceux du kit) ; rien du pourtour ne porte d'ombre (à 20 m et plus de tout
  // ce qu'on parcourt, hors de la carte d'ombre qui suit le joueur la plupart du temps)
  maillage(mat, nom, ombre = false) {
    if (this.vide) return null;
    const m = new THREE.Mesh(this.geometrie(), mat);
    m.name = nom; m.castShadow = ombre; m.receiveShadow = true; m.position.x = Monde.dx;
    return m;
  }
}
const mul = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const BLANC = [1, 1, 1];

// ============================================================================================ les bâtiments
// Le mur d'un bord (a -> b) d'un polygone tourné dans le sens trigonométrique (dans (x, z) : sa normale sortante est
// (dz, -dx)), découpé en étages de `fh` m depuis y0 : la bande de chaque étage selon `bandeDe(j)`. `s0` : où commence
// ce bord dans le tour du bâtiment (u continu d'un mur à l'autre, décalé par immeuble).
function mur(T, a, b, y0, n, fh, bandeDe, s0, couleur) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
  if (L < 0.05) return s0;
  const nx = dz / L, nz = -dx / L;
  const u0 = s0 / REPET, u1 = (s0 + L) / REPET;
  for (let j = 0; j < n; j++) {
    const v = vBande(bandeDe(j)), ya = y0 + j * fh, yb = ya + fh;
    const c = j === 0 ? mul(couleur, 0.96) : couleur;
    const i0 = T.s(a[0], ya, a[1], nx, 0, nz, u0, v.bas, c), i1 = T.s(b[0], ya, b[1], nx, 0, nz, u1, v.bas, c);
    const i2 = T.s(b[0], yb, b[1], nx, 0, nz, u1, v.haut, c), i3 = T.s(a[0], yb, a[1], nx, 0, nz, u0, v.haut, c);
    T.quad(i0, i1, i2, i3);
  }
  return s0 + L;
}
// Un polygone horizontal (toit plat, dalle) à la hauteur y, bande `bande`, UV en mètres sur la largeur de l'atlas.
function dalle(T, poly, y, bande, couleur) {
  const v = vBande(bande), vm = (v.bas + v.haut) / 2, dv = (v.haut - v.bas) * 0.45;
  const tris = THREE.ShapeUtils.triangulateShape(poly.map((p) => new THREE.Vector2(p[0], p[1])), []);
  const base = T.nb;
  for (const p of poly) T.s(p[0], y, p[1], 0, 1, 0, p[0] / REPET, vm + dv * Math.sin(p[1] * 0.37), couleur);
  for (const t of tris) T.tri(base + t[0], base + t[1], base + t[2]);
}
// LE TOIT EN CROUPE d'une aile (quatre coins, dans n'importe quel ordre) : le rectangle qui l'enveloppe, le long de
// son plus grand côté, débord de 0,35 m ; faîtage à yF, égout à yE ; deux longs pans et deux croupes.
function croupe(T, coins, yE, yF, bande, couleur, debord = 0.35) {
  let e1 = null, Lmax = 0;
  for (let k = 0; k < coins.length; k++) {
    const a = coins[k], b = coins[(k + 1) % coins.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L > Lmax) { Lmax = L; e1 = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; }
  }
  const e2 = [-e1[1], e1[0]];
  let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
  for (const p of coins) {
    const s = p[0] * e1[0] + p[1] * e1[1], t = p[0] * e2[0] + p[1] * e2[1];
    a0 = Math.min(a0, s); a1 = Math.max(a1, s); b0 = Math.min(b0, t); b1 = Math.max(b1, t);
  }
  a0 -= debord; a1 += debord; b0 -= debord; b1 += debord;
  const ha = (a1 - a0) / 2, hb = (b1 - b0) / 2, sc = (a0 + a1) / 2, tc = (b0 + b1) / 2;
  const P = (s, t) => [e1[0] * s + e2[0] * t, e1[1] * s + e2[1] * t];
  const r = Math.max(0, ha - hb);
  const C = [P(sc - ha, tc - hb), P(sc + ha, tc - hb), P(sc + ha, tc + hb), P(sc - ha, tc + hb)];
  const F = [P(sc - r, tc), P(sc + r, tc)];
  const v = vBande(bande);
  const face = (pts, uv) => {
    // la normale du pan, vers le haut
    const [p0, p1, p2] = pts;
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const idx = pts.map((p, k) => T.s(p[0], p[1], p[2], nx, ny, nz, uv[k][0], uv[k][1], couleur));
    if (idx.length === 4) T.quad(idx[0], idx[1], idx[2], idx[3]); else T.tri(idx[0], idx[1], idx[2]);
  };
  const L2 = (2 * ha) / REPET, W2 = (2 * hb) / REPET;
  // les longs pans (côtés t = tc - hb et t = tc + hb), puis les croupes
  face([[C[0][0], yE, C[0][1]], [C[1][0], yE, C[1][1]], [F[1][0], yF, F[1][1]], [F[0][0], yF, F[0][1]]],
    [[0, v.bas], [L2, v.bas], [L2 * (ha + r) / (2 * ha), v.haut], [L2 * (ha - r) / (2 * ha), v.haut]]);
  face([[C[2][0], yE, C[2][1]], [C[3][0], yE, C[3][1]], [F[0][0], yF, F[0][1]], [F[1][0], yF, F[1][1]]],
    [[0, v.bas], [L2, v.bas], [L2 * (ha + r) / (2 * ha), v.haut], [L2 * (ha - r) / (2 * ha), v.haut]]);
  face([[C[1][0], yE, C[1][1]], [C[2][0], yE, C[2][1]], [F[1][0], yF, F[1][1]]], [[0, v.bas], [W2, v.bas], [W2 / 2, v.haut]]);
  face([[C[3][0], yE, C[3][1]], [C[0][0], yE, C[0][1]], [F[0][0], yF, F[0][1]]], [[0, v.bas], [W2, v.bas], [W2 / 2, v.haut]]);
}
// Les toits en croupe de TUILES (brun rouge : la PMI, l'école en U, les villas et les maisons) ; les autres sont
// d'ardoise (l'école au toit gris, la bibliothèque, le pavillon crème à comble d'ardoise).
const TUILES = new Set([82241220, 82250519, 242177280, 82241067, 82241132, 82250193, 82250688]);
// Le pied d'un bâtiment : dans la grille, le plus bas du sol du monde sous ses sommets (et son centre) ; au-delà, le
// MNT des données (raccordé au bord) ; 25 cm plus bas, pour qu'aucun mur ne flotte au-dessus d'une pente.
function piedDe(kit, poly) {
  let y = Infinity, cx = 0, cz = 0;
  for (const p of poly) { y = Math.min(y, solPourtour(kit, p[0], p[1])); cx += p[0]; cz += p[1]; }
  y = Math.min(y, solPourtour(kit, cx / poly.length, cz / poly.length));
  return y - 0.25;
}
// UN BÂTIMENT des données : [id, style, toit, h, pied, [x, z, ...], ailes]. `y0` : son pied, s'il est connu (l'île) ;
// sinon le sol du pourtour sous lui (piedDe).
function batiment(kit, T, B, y0 = null) {
  const [id, style, toit, h, , plat, ailes] = B;
  const poly = [];
  for (let k = 0; k < plat.length; k += 2) poly.push([plat[k], plat[k + 1]]);
  if (aireSignee(poly) < 0) poly.reverse();
  const S = STYLES[style] || STYLES.creme;
  if (y0 === null) y0 = piedDe(kit, poly);
  // la teinte : celle du style, un peu de patine propre à chaque immeuble
  const g = String(id).length + Number(String(id).replace(/\D/g, '').slice(-5) || 7);
  const f = 0.93 + 0.1 * kit.alea(g, 3.1, 2001);
  const couleur = [f, f * (0.99 + 0.02 * kit.alea(g, 1.7, 2002)), f * (0.97 + 0.04 * kit.alea(g, 5.3, 2003))];
  // la hauteur des murs : à l'égout (toits plats et attiques) ; sous la croupe (toits en croupe : h est le faîtage)
  let hMur = h, montee = 0;
  if (toit === 'croupe') {
    const larg = Math.min(...(ailes || [poly]).map((q) => largeurMin(q)));
    montee = borne(0.42 * larg, 1.8, 4.5); hMur = Math.max(2.6, h - montee);
  }
  // l'ATTIQUE DE ZINC : le dernier niveau en brisis (rentré de 0,9 m) sur les polygones simples ; sur les autres, une
  // bande de zinc verticale (un brisis rentré se recouperait dans les redans)
  const brisisOk = toit === 'zinc' && poly.length <= 12 && h >= 9;
  const hMurs = brisisOk ? hMur - 3 : hMur;
  const n = Math.max(1, Math.round(hMurs / 3.0)), fh = hMurs / n;
  const bandeDe = (j) => (j === 0 && n > 1 ? S.rdc : (toit === 'zinc' && !brisisOk && j === n - 1 && n > 2 ? 'attique' : S.etage));
  let s = 24 * kit.alea(g, 9.9, 2004);
  for (let k = 0; k < poly.length; k++) s = mur(T, poly[k], poly[(k + 1) % poly.length], y0, n, fh, bandeDe, s, couleur);
  const yT = y0 + hMurs;
  if (toit === 'croupe') {
    const bande = TUILES.has(id) ? 'tuiles' : 'ardoise';
    for (const q of ailes || [poly]) croupe(T, q, yT, yT + montee, bande, mul(BLANC, 0.95 + 0.08 * kit.alea(g, 4.4, 2005)));
  } else if (brisisOk) {
    const haut = brisis(T, poly, yT, 3, BLANC);
    dalle(T, haut, yT + 3, 'toit', mul(BLANC, 0.85 + 0.15 * kit.alea(g, 6.6, 2006)));
  } else {
    // l'acrotère (0,5 m, mur aveugle un peu plus sombre), le toit de gravier 10 cm sous son arête
    let s2 = s;
    for (let k = 0; k < poly.length; k++) s2 = mur(T, poly[k], poly[(k + 1) % poly.length], yT, 1, 0.5, () => 'aveugle', s2, mul(couleur, 0.9));
    dalle(T, poly, yT + 0.4, 'toit', mul(BLANC, 0.85 + 0.15 * kit.alea(g, 6.6, 2006)));
  }
}
// La plus petite largeur d'un polygone (épaisseur le long de la normale de son plus grand côté) : la pente d'un toit
function largeurMin(q) {
  let e = null, Lm = 0;
  for (let k = 0; k < q.length; k++) {
    const a = q[k], b = q[(k + 1) % q.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L > Lm) { Lm = L; e = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; }
  }
  let t0 = Infinity, t1 = -Infinity;
  for (const p of q) { const t = -e[1] * p[0] + e[0] * p[1]; t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
  return t1 - t0;
}

// ============================================================================================ le boulevard Saint-Denis
// SON AXE (OSM : Boulevard Saint-Denis, ways 1126672440, 1126672441, 1130585817, 30596764), du nord au sud. C'est la
// ligne médiane de la chaussée (orthophoto : les tirets au droit du 156 tombent dessus à 30 cm près).
const AXE = [[-167.3, -264.89], [-163.83, -215.25], [-162.86, -199.19], [-162.05, -187.81], [-160.09, -160.44], [-158.23, -134.4],
  [-157.62, -126.35], [-156.85, -120.43], [-155.59, -113.95], [-154.7, -106.95], [-153.78, -99.29], [-148.63, -24.81], [-148.07, -14.13],
  [-147.2, -1.34], [-145.44, 27.06], [-144.59, 37.54], [-142.73, 64.65], [-141.48, 83.04], [-140.83, 93.1], [-139.66, 111.36],
  [-138.04, 137.51], [-137.33, 148.87], [-136.97, 154.42], [-136.65, 159.17], [-134.61, 188.63], [-133.15, 212.25], [-131.01, 246.89],
  [-128.23, 292.02]];
// La LIGNE DE LA RUE de la zone Z18 (la grille sans le renfoncement du 156 : z18_boulevard.js, RUE) : ses places en
// bataille finissent à 9,9 m de cette ligne, et notre chaussée commence là (recopiée, pour ne pas toucher à Z18).
const RUE_Z18 = [[-142.3, -131.0], [-142.05, -113.55], [-141.3, -101.2], [-141.12, -98.2], [-133.6, 26.36], [-132.33, 45.62], [-126.07, 150.0], [-125.76, 154.92], [-125.6, 157.5]];
const BORD_Z18 = 9.9;
// Un point d'une polyligne (rangée par z croissants) à l'ordonnée z, et sa normale vers x- (vers la chaussée, loin du
// parc : la gauche quand on va vers z+).
function surLigne(L, z) {
  let i = 1; while (i < L.length - 1 && L[i][1] < z) i++;
  const [x0, z0] = L[i - 1], [x1, z1] = L[i], l = Math.hypot(x1 - x0, z1 - z0) || 1, t = (z - z0) / ((z1 - z0) || 1);
  return { x: x0 + (x1 - x0) * t, z, nx: -(z1 - z0) / l, nz: (x1 - x0) / l };
}
// La coupe du boulevard, en décalages `s` depuis l'axe, comptés vers x- (loin du parc) :
//  - le BORD CÔTÉ PARC de la chaussée : le bord des places de Z18 (z -131 à 157,5) ; au-delà, l'axe + 3,2 m (on y
//    revient sur 25 m) ;
//  - la chaussée jusqu'à 3,8 m ; le stationnement en long d'en face jusqu'à 6,1 ; la bordure de granit ; le trottoir
//    d'en face jusqu'à 10 m (R6, Z20-26 à Z20-33 : un trottoir de 3,5 à 4 m, des arbres, des haies, des piliers) ;
//  - hors du tronçon de Z18, le trottoir côté parc (le long de l'école au nord, de l'enclos des Indes au sud).
const COUPE = { chaussee: 3.8, stationnement: 6.1, bordure: 6.3, trottoir: 10.0, trottoirParc: 3.4 };
const Z18 = [RUE_Z18[0][1], RUE_Z18[RUE_Z18.length - 1][1]];
function bordParc(z) {
  const sAxe = (zz) => {
    const A = surLigne(AXE, zz), R = surLigne(RUE_Z18, zz);
    const ex = R.x + R.nx * BORD_Z18;
    return (ex - A.x) / A.nx;
  };
  if (z >= Z18[0] && z <= Z18[1]) return sAxe(z);
  if (z < Z18[0]) return sAxe(Z18[0]) + (-3.2 - sAxe(Z18[0])) * lisse(Z18[0], Z18[0] - 25, z);
  return sAxe(Z18[1]) + (-3.0 - sAxe(Z18[1])) * lisse(Z18[1], Z18[1] + 25, z);
}
const surAxe = (z, s) => { const A = surLigne(AXE, z); return [A.x + A.nx * s, A.z + A.nz * s]; };

// LA CHAUSSÉE ET LES TROTTOIRS d'un tronçon [za, zb] : des rubans drapés sur le sol (asphalte du kit), la bordure de
// granit en relief (13 cm), la ligne médiane en tirets (3 m tous les 10 m) et le bord du stationnement.
// `detail` faux (la silhouette, vue de 70 m et plus) : la bordure de granit est un ruban d'asphalte de sa teinte, et
// les lignes peintes ne sont pas tracées ; un appel de dessin au lieu de trois (conception § 3.3 : une silhouette,
// c'est 1 à 3 appels).
function* boulevard(ctx, lot, za, zb, detail = true) {
  const kit = ctx.kit, pas = 3, n = Math.max(1, Math.ceil((zb - za) / pas));
  const pA = lot.part('asphalte#sol'), pP = detail ? lot.part('peinture#sol') : null, pB = detail ? lot.part('beton#sol') : pA;
  const GR = [0.93, 0.92, 0.9], CH = [0.78, 0.77, 0.76], ST = [0.86, 0.85, 0.83], TR = [1.02, 1.0, 0.97], BL = [0.95, 0.95, 0.93];
  // un ruban de s0 à s1 (décalages), à dy au-dessus du sol
  const ruban = (p, s0f, s1f, dy, col, tuile = 4.04) => {
    let prev = null;
    for (let j = 0; j <= n; j++) {
      const z = za + ((zb - za) * j) / n, s0 = s0f(z), s1 = s1f(z), rang = [];
      for (const s of [s0, (s0 + s1) / 2, s1]) {
        const [x, zz] = surAxe(z, s), y = solPourtour(kit, x, zz) + dy;
        rang.push(lot.s(p, x, y, zz, 0, 1, 0, x / tuile, zz / tuile, col));
      }
      if (prev) for (let i = 0; i < 2; i++) lot.quad(p, prev[i], prev[i + 1], rang[i + 1], rang[i]);
      prev = rang;
    }
  };
  // une face verticale de bordure, le long de s, de dy0 à dy1
  const face = (p, sf, dy0, dy1, col, versParc) => {
    let prev = null;
    for (let j = 0; j <= n; j++) {
      const z = za + ((zb - za) * j) / n, s = sf(z), [x, zz] = surAxe(z, s), y = solPourtour(kit, x, zz), A = surLigne(AXE, z);
      const nx = versParc ? -A.nx : A.nx, nz = versParc ? -A.nz : A.nz;
      const r = [lot.s(p, x, y + dy0, zz, nx, 0, nz, zz / 2, dy0, col), lot.s(p, x, y + dy1, zz, nx, 0, nz, zz / 2, dy1, col)];
      if (prev) lot.quad(p, prev[0], r[0], r[1], prev[1]);
      prev = r;
    }
  };
  const C = COUPE;
  ruban(pA, bordParc, () => C.chaussee, 0.035, CH);
  if (ctx.budget()) yield;
  ruban(pA, () => C.chaussee, () => C.stationnement, 0.03, ST);
  ruban(pB, () => C.stationnement, () => C.bordure, 0.16, GR, 2);
  face(pB, () => C.stationnement, 0.03, 0.16, GR, true);
  ruban(pA, () => C.bordure, () => C.trottoir, 0.16, TR);
  // hors du tronçon de Z18 : le trottoir côté parc
  const z0p = Math.max(za, -260), z1p = Math.min(zb, Z18[0]), z2p = Math.max(za, Z18[1]), z3p = Math.min(zb, 290);
  for (const [a, b] of [[z0p, z1p], [z2p, z3p]]) {
    if (b - a < 1) continue;
    const m = Math.max(1, Math.ceil((b - a) / pas));
    let prev = null, prevF = null;
    for (let j = 0; j <= m; j++) {
      const z = a + ((b - a) * j) / m, s1 = bordParc(z), s0 = s1 - C.trottoirParc;
      const r = [s0, s1 - 0.2, s1].map((s, k) => { const [x, zz] = surAxe(z, s), y = solPourtour(kit, x, zz) + 0.16; return lot.s(k < 2 ? pA : pB, x, y, zz, 0, 1, 0, x / 4.04, zz / 4.04, k < 2 ? TR : GR); });
      const [xf, zf] = surAxe(z, s1), yf = solPourtour(kit, xf, zf), A = surLigne(AXE, z);
      const f = [lot.s(pB, xf, yf + 0.03, zf, A.nx, 0, A.nz, zf / 2, 0, GR), lot.s(pB, xf, yf + 0.16, zf, A.nx, 0, A.nz, zf / 2, 0.13, GR)];
      if (prev) { lot.quad(pA, prev[0], prev[1], r[1], r[0]); }
      if (prevF) lot.quad(pB, prevF[0], f[0], f[1], prevF[1]);
      prev = r; prevF = f;
    }
  }
  if (ctx.budget()) yield;
  if (!detail) return;
  // la ligne médiane (tirets de 3 m tous les 10 m) et la ligne continue du stationnement d'en face
  for (let z = Math.ceil(za / 10) * 10; z < zb - 3; z += 10) {
    const m = (bordParc(z) + C.chaussee) / 2;
    tiret(lot, pP, kit, z, z + 3, m, 0.13, BL);
  }
  for (let z = za; z < zb - 0.5; z += 6) tiret(lot, pP, kit, z, Math.min(zb, z + 6), C.chaussee - 0.1, 0.12, BL);
}
// Un trait de peinture le long de l'axe, de z0 à z1, centré sur le décalage s, large de l
function tiret(lot, p, kit, z0, z1, s, l, col) {
  const pts = [[z0, s - l / 2], [z1, s - l / 2], [z1, s + l / 2], [z0, s + l / 2]].map(([z, ss]) => {
    const [x, zz] = surAxe(z, ss); return lot.s(p, x, solPourtour(kit, x, zz) + 0.045, zz, 0, 1, 0, 0.25, 0.5, col);
  });
  lot.quad(p, pts[0], pts[1], pts[2], pts[3]);
}

// LES VOITURES GARÉES (détail seulement) : le long du trottoir d'en face, en file, avec des trous ; des boîtes basses
// (caisse, habitacle vitré, roues), sept teintes courantes. Une géométrie par teinte, posée par matrices : un appel
// pour toutes (peinture du kit).
const TEINTES_VOITURES = ['#e8e8e6', '#9ea2a6', '#2a2c30', '#1f2c45', '#c7c9cb', '#7a1f1f', '#5d6066'].map((h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; });
function voiture(lot, m4, col) {
  const VITRE = [0.06, 0.07, 0.08], PNEU = [0.03, 0.03, 0.03];
  lot.boite('peinture', 1.76, 0.62, 4.2, new THREE.Matrix4().makeTranslation(0, 0.55, 0).premultiply(m4), { bande: true, couleur: col, chanfrein: 0.12 });
  lot.boite('peinture', 1.56, 0.5, 2.3, new THREE.Matrix4().makeTranslation(0, 1.08, -0.25).premultiply(m4), { bande: true, couleur: VITRE, chanfrein: 0.14 });
  lot.boite('peinture', 1.5, 0.06, 1.9, new THREE.Matrix4().makeTranslation(0, 1.34, -0.3).premultiply(m4), { bande: true, couleur: col, chanfrein: 0.02 });
  for (const [x, z] of [[-0.78, 1.35], [0.78, 1.35], [-0.78, -1.35], [0.78, -1.35]]) {
    lot.boite('peinture', 0.22, 0.6, 0.6, new THREE.Matrix4().makeTranslation(x, 0.3, z).premultiply(m4), { bande: true, couleur: PNEU });
  }
}
function* voituresBoulevard(ctx, lot, za, zb) {
  const kit = ctx.kit, s = (COUPE.chaussee + COUPE.stationnement) / 2;
  let k = 0;
  for (let z = za + 2; z < zb - 3; z += 5.6) {
    k++;
    if (kit.alea(z, 3.3, 2101) < 0.28) continue;
    const zz = z + 0.6 * (kit.alea(z, 4.4, 2102) - 0.5), [x, z2] = surAxe(zz, s), A = surLigne(AXE, zz);
    // (garées dans le sens de la file d'en face, vers z+ : on roule à droite) ; la tangente de l'axe est (nz, -nx)
    const m4 = new THREE.Matrix4().makeRotationY(Math.atan2(A.nz, -A.nx)).setPosition(x, solPourtour(kit, x, z2) + 0.03, z2);
    voiture(lot, m4, TEINTES_VOITURES[Math.floor(kit.alea(z, 5.5, 2103) * TEINTES_VOITURES.length)]);
    if (k % 6 === 0 && ctx.budget()) yield;
  }
}

// ============================================================================================ le sol lointain
// Au-delà de la grille du monde, une nappe de 10 m de pas sur le MNT (SOL_LOIN), 30 cm sous le sol (elle ne sert que
// de fond, entre les immeubles et derrière eux), teintée de jardins, de cours et de rues ; ni sur le quai ni sur la
// Seine (zone Z19). Les cases qui chevauchent la grille sont rognées à son bord quand elles la touchent d'un côté.
function solLointain(ctx, T, boite) {
  const kit = ctx.kit, S = SOL_LOIN, v = vBande('sol'), vm = (v.bas + v.haut) / 2, dv = (v.haut - v.bas) * 0.4;
  const VERT = [0.52, 0.6, 0.42], GRIS = [0.8, 0.8, 0.77], SOMBRE = [0.58, 0.6, 0.55];
  const teinte = (x, z) => {
    const a = kit.bruit(x / 23, z / 23, 2201), b = kit.bruit(x / 7, z / 7, 2202);
    const c = a > 0.55 ? VERT : a < 0.3 ? GRIS : SOMBRE;
    return mul(c, 0.9 + 0.2 * b);
  };
  for (let k = 0; k < S.nz - 1; k++) for (let i = 0; i < S.nx - 1; i++) {
    let xa = S.x0 + i * S.pas, xb = xa + S.pas, za = S.z0 + k * S.pas, zb = za + S.pas;
    const cx = (xa + xb) / 2, cz = (za + zb) / 2;
    if (cx < boite[0] || cx >= boite[2] || cz < boite[1] || cz >= boite[3]) continue;
    if (xa >= 18) continue;                                         // le quai et la Seine : zone Z19
    const dedansX = xa >= GRILLE.x0 && xb <= GRILLE.x1, dedansZ = za >= GRILLE.z0 && zb <= GRILLE.z1;
    if (dedansX && dedansZ) continue;
    // rognée au bord de la grille quand elle la chevauche d'un seul côté
    if (dedansX && za < GRILLE.z0 && zb > GRILLE.z0) zb = GRILLE.z0;
    if (dedansX && za < GRILLE.z1 && zb > GRILLE.z1) za = GRILLE.z1;
    if (dedansZ && xa < GRILLE.x0 && xb > GRILLE.x0) xb = GRILLE.x0;
    const pts = [[xa, za], [xb, za], [xb, zb], [xa, zb]];
    const idx = pts.map(([x, z]) => T.s(x, solPourtour(kit, x, z) - 0.3, z, 0, 1, 0, x / REPET, vm + dv * Math.sin(z * 0.41), teinte(x, z)));
    T.quad(idx[0], idx[1], idx[2], idx[3]);
  }
}

// ============================================================================================ outils de pièces
// Décale un polygone (sens trigonométrique dans (x, z)) de d m vers l'extérieur (d < 0 : vers l'intérieur), à
// l'onglet. Pour des polygones simples (les attiques de zinc, les auvents) : rien de plus.
function decaler(poly, d) {
  const n = poly.length, out = [];
  for (let k = 0; k < n; k++) {
    const p = poly[(k - 1 + n) % n], c = poly[k], s = poly[(k + 1) % n];
    const l1 = Math.hypot(c[0] - p[0], c[1] - p[1]) || 1, l2 = Math.hypot(s[0] - c[0], s[1] - c[1]) || 1;
    const n1 = [(c[1] - p[1]) / l1, -(c[0] - p[0]) / l1], n2 = [(s[1] - c[1]) / l2, -(s[0] - c[0]) / l2];
    let bx = n1[0] + n2[0], bz = n1[1] + n2[1];
    const lb = Math.hypot(bx, bz) || 1; bx /= lb; bz /= lb;
    const cosA = Math.max(0.35, bx * n1[0] + bz * n1[1]);
    out.push([c[0] + (bx * d) / cosA, c[1] + (bz * d) / cosA]);
  }
  return out;
}
const aireSignee = (poly) => { let s = 0; for (let k = 0; k < poly.length; k++) { const a = poly[k], b = poly[(k + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
// L'ATTIQUE DE ZINC en brisis : du nu du mur (y0) au polygone rentré de 0,9 m (y0 + h), bande « attique »
function brisis(T, poly, y0, h, couleur) {
  const haut = decaler(poly, -0.9), v = vBande('attique');
  let s = 0;
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k], b = poly[(k + 1) % poly.length], A = haut[k], B = haut[(k + 1) % poly.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 0.05) continue;
    // la normale du pan : dehors et vers le haut (pente de 0,9 m sur h)
    const nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L, l = Math.hypot(h, 0.9), cx = nx * h / l, cy = 0.9 / l, cz = nz * h / l;
    const i0 = T.s(a[0], y0, a[1], cx, cy, cz, s / REPET, v.bas, couleur), i1 = T.s(b[0], y0, b[1], cx, cy, cz, (s + L) / REPET, v.bas, couleur);
    const i2 = T.s(B[0], y0 + h, B[1], cx, cy, cz, (s + L - 0.9) / REPET, v.haut, couleur), i3 = T.s(A[0], y0 + h, A[1], cx, cy, cz, (s + 0.9) / REPET, v.haut, couleur);
    T.quad(i0, i1, i2, i3);
    s += L;
  }
  return haut;
}
// Les sommets d'une géométrie three (position, normale), transformés par m4, recopiés dans un tampon (UV nulles : les
// matériaux sans carte, l'or), à la couleur donnée.
function recopier(T, g, m4, couleur) {
  const P = g.attributes.position, N = g.attributes.normal, base = T.nb, v = new THREE.Vector3(), n = new THREE.Vector3();
  const mn = new THREE.Matrix3().getNormalMatrix(m4);
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i).applyMatrix4(m4); n.fromBufferAttribute(N, i).applyMatrix3(mn).normalize();
    T.s(v.x, v.y, v.z, n.x, n.y, n.z, 0, 0, couleur);
  }
  if (g.index) { const I = g.index.array; for (let i = 0; i < I.length; i += 3) T.i.push(base + I[i], base + I[i + 1], base + I[i + 2]); }
  else for (let i = 0; i < P.count; i += 3) T.i.push(base + i, base + i + 1, base + i + 2);
}

// ============================================================================================ le pavillon des Indes
// (R6, Z20-34 à Z20-39 ; orthophoto : l'atelier contre le trottoir du boulevard, le pavillon indien à l'est, ses
// bulbes au nord, à l'est et au sud d'une terrasse claire, la pelouse ronde au nord, dans l'enclos de stabilisé.)
// L'ATELIER : un rectangle de 13 x 8,2 m le long du boulevard (son mur ouest suit le trottoir, en biais de 18°),
// pignon polychrome vers le jardin (z-), toit d'ardoise à forte pente, VERRIÈRE de 4 x 4 m sur le pan du boulevard,
// cheminée ; bandeaux de brique claire. LE PAVILLON INDIEN : l'empreinte d'OSM (10 x 10 m, angles est en redans),
// deux niveaux de bois peint rouge brun, claustras vert gris au rez-de-chaussée sous un auvent à consoles, bow-windows
// à rideaux blancs à l'étage, corniche à 8 m, CRÊTE AJOURÉE rouge et or, un GRAND BULBE doré au centre (Ø 3 m, épi à
// 13,5 m) et trois petits (Ø 1,8 m) sur des kiosques d'angle.
const ATELIER = { A: [-126.45, 168.7], u: [-0.3068, 0.9518], p: [0.9518, 0.3068], long: 13.0, large: 8.2, egout: 7.2, faite: 12.4 };
const PAVILLON = [[-120.3, 171.2], [-113.1, 171.16], [-113.09, 172.51], [-111.75, 172.53], [-111.69, 173.85], [-110.32, 173.82],
  [-110.22, 178.12], [-111.59, 178.22], [-111.53, 179.52], [-112.91, 179.61], [-112.85, 180.92], [-120.26, 181.2]];
const BULBES = [{ x: -115.2, z: 176.0, r: 1.5, socle: 1.4, grand: true }, { x: -112.6, z: 172.3, r: 0.9 }, { x: -110.9, z: 176.0, r: 0.9 }, { x: -112.6, z: 179.9, r: 0.9 }];
const ENCLOS = { jardin: [[-128.6, 156.0], [-105.6, 153.8], [-104.9, 184.3], [-121.5, 184.6], [-126.45, 168.7]], pelouse: { x: -116.8, z: 164.3, r: 4.0 },
  grille: [[-128.6, 156.0], [-126.6, 167.9]], murs: [[[-130.4, 181.1], [-130.1, 184.5], [-104.9, 184.3], [-105.6, 153.8]]] };
// Le profil d'un bulbe en oignon (rayon, hauteur) pour un rayon de panse de 1 : collet, panse, pointe concave, épi
const OIGNON = [[0.001, 0], [0.74, 0], [0.78, 0.12], [0.98, 0.55], [1.0, 0.78], [0.92, 1.08], [0.68, 1.42], [0.4, 1.74], [0.2, 2.0], [0.08, 2.22],
  [0.05, 2.45], [0.11, 2.55], [0.05, 2.66], [0.025, 2.95], [0.001, 3.05]];
function* pavillonDesIndes(ctx, detail) {
  const kit = ctx.kit, g = ctx.groupe, lot = new kit.Lot('pavillon des Indes'), tOr = new Tampon(), L = kit.lin;
  const BOIS = L('#6e2a22'), PANNEAU = L('#9c3a2e'), CLAUSTRA = L('#6f7a6c'), VITRE = L('#2a3238'), RIDEAU = L('#d6d3cc');
  const CREME = L('#d8d0bd'), CLAIRE = L('#e0cfa4'), SOMBRE = L('#6a3a2c'), BLANC_MUR = L('#ece9e1'), OR = [1, 1, 1];
  const At = ATELIER, P = (s, t) => [At.A[0] + At.u[0] * s + At.p[0] * t, At.A[1] + At.u[1] * s + At.p[1] * t];
  const coins = [P(0, 0), P(At.long, 0), P(At.long, At.large), P(0, At.large)];
  const y0 = Math.min(...coins.map(([x, z]) => kit.sol(x, z))) - 0.15, yE = y0 + At.egout, yF = y0 + At.faite;
  const nU = [At.u[0], 0, At.u[1]], nP = [At.p[0], 0, At.p[1]];
  // --- L'ATELIER : les murs de brique (deux longs pans, deux pignons), les bandeaux de brique claire
  const v3 = ([x, z], y) => [x, y, z];
  const m0 = P(0, At.large / 2), m1 = P(At.long, At.large / 2);
  lot.polygone('brique', [v3(coins[0], y0), v3(coins[1], y0), v3(coins[1], yE), v3(coins[0], yE)], [-nP[0], 0, -nP[2]]);
  lot.polygone('brique', [v3(coins[3], y0), v3(coins[2], y0), v3(coins[2], yE), v3(coins[3], yE)], nP);
  lot.polygone('brique', [v3(coins[0], y0), v3(coins[3], y0), v3(coins[3], yE), v3(m0, yF), v3(coins[0], yE)], [-nU[0], 0, -nU[2]]);
  lot.polygone('brique', [v3(coins[1], y0), v3(coins[2], y0), v3(coins[2], yE), v3(m1, yF), v3(coins[1], yE)], nU);
  for (const yb of [y0 + 3.45, y0 + 6.95]) {
    const ext = [P(-0.04, -0.04), P(At.long + 0.04, -0.04), P(At.long + 0.04, At.large + 0.04), P(-0.04, At.large + 0.04)];
    // (le chemin tourne dans le sens horaire vu d'en haut : la droite du sens de marche, S, est le dehors)
    lot.prisme('taille', [[0, 0], [0, 0.22]], [...ext, ext[0]].map(([x, z]) => [x, yb, z]), { ferme: false, vertical: true, couleur: CLAIRE, tuile: 1 });
  }
  // --- le toit d'ardoise (débord de 0,4 m) et la VERRIÈRE sur le pan du boulevard ; la cheminée
  const d = 0.4, eW = [P(-d, -d), P(At.long + d, -d)], eE = [P(-d, At.large + d), P(At.long + d, At.large + d)], r = [P(-d, At.large / 2), P(At.long + d, At.large / 2)];
  const pente = (eA, eB, nn) => lot.polygone('ardoise', [v3(eA[0], yE - 0.25), v3(eA[1], yE - 0.25), v3(eB[1], yF + 0.05), v3(eB[0], yF + 0.05)], nn);
  const hR = yF - yE, demi = At.large / 2, lp = Math.hypot(hR, demi);
  pente(eW, r, [-nP[0] * hR / lp, demi / lp, -nP[2] * hR / lp]);
  pente(eE, r, [nP[0] * hR / lp, demi / lp, nP[2] * hR / lp]);
  // (la verrière : un panneau de verre sombre de 4 x 4 m, 6 cm au-dessus des ardoises, ses petits fers en détail)
  const surPan = (s, f, dy = 0.06) => { const [x, z] = P(s, -d + (demi + d) * f); return [x, yE - 0.25 + (hR + 0.3) * f + dy, z]; };
  const nW = [-nP[0] * hR / lp, demi / lp, -nP[2] * hR / lp];
  lot.polygone('peinture', [surPan(4.5, 0.2), surPan(8.5, 0.2), surPan(8.5, 0.82), surPan(4.5, 0.82)], nW, { couleur: L('#3a4752'), tuile: 1 });
  if (detail) for (let k = 0; k <= 4; k++) lot.barre(surPan(4.5 + k, 0.2, 0.09), surPan(4.5 + k, 0.82, 0.09), 0.05, 0.03, { couleur: L('#25292c') });
  const ch = P(At.long - 1.6, At.large / 2 + 0.9);
  lot.boite('brique', 0.9, yF + 1.6 - y0 - 8, 0.9, new THREE.Matrix4().makeTranslation(ch[0], (y0 + 8 + yF + 1.6) / 2, ch[1]), { couleur: [1, 1, 1] });
  // --- les baies : porte-fenêtre cintrée et grande fenêtre du pignon du jardin ; fenêtres du boulevard ; le décor
  // du pignon (frise de losanges claire et sombre, médaillon)
  // une baie (verre sombre, 3 cm devant le mur), centrée en (s, t) dans le repère de l'atelier, `dir` le long du mur
  const baie = (s, t, y, w, h, nn, dir, col = VITRE) => {
    const c = P(s, t), pts = [];
    for (const [fu, fy] of [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]]) pts.push([c[0] + dir[0] * w * fu + nn[0] * 0.03, y + h * fy, c[1] + dir[1] * w * fu + nn[2] * 0.03]);
    lot.polygone('peinture', pts, nn, { couleur: col, tuile: 1 });
  };
  const nG = [-nU[0], 0, -nU[2]], nB = [-nP[0], 0, -nP[2]];
  baie(0, At.large / 2, y0 + 0.1, 1.6, 2.6, nG, At.p);
  baie(0, At.large / 2, y0 + 3.9, 2.3, 2.2, nG, At.p);
  for (const s of [2.4, 6.5, 10.6]) { baie(s, 0, y0 + 0.9, 1.2, 1.8, nB, At.u); baie(s, 0, y0 + 4.2, 1.2, 1.8, nB, At.u); }
  if (detail) {
    // la frise de losanges et le médaillon du pignon (Z20-34) ; les deux balcons de bois rouge côté boulevard ; le
    // balcon de fer de la fenêtre du pignon
    for (let k = -3; k <= 3; k++) {
      const t = At.large / 2 + k * 0.95, y = y0 + 7.75, c = P(-0.035, t), col = k % 2 ? CLAIRE : SOMBRE;
      lot.polygone('peinture', [[c[0], y - 0.38, c[1]], [c[0] + At.p[0] * 0.42, y, c[1] + At.p[1] * 0.42], [c[0], y + 0.38, c[1]], [c[0] - At.p[0] * 0.42, y, c[1] - At.p[1] * 0.42]], nG, { couleur: col, tuile: 1 });
    }
    const md = P(-0.04, At.large / 2);
    lot.tour('taille', [[0.001, 0], [0.55, 0], [0.55, 0.06]], 16, new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(new THREE.Matrix4().makeRotationY(Math.atan2(nG[0], nG[2]))).setPosition(md[0], y0 + 9.5, md[1]), { couleur: CLAIRE });
    for (const s of [2.4, 10.6]) {
      const c = P(s, -0.55), m4 = new THREE.Matrix4().makeRotationY(Math.atan2(At.u[0], At.u[1])).setPosition(c[0], y0 + 4.05, c[1]);
      lot.boite('peinture', 1.1, 0.12, 2.2, m4, { bande: true, couleur: PANNEAU });
      lot.boite('peinture', 0.05, 0.9, 2.2, new THREE.Matrix4().makeTranslation(-0.52, 0.5, 0).premultiply(m4), { bande: true, couleur: PANNEAU });
    }
    const bf = P(-0.45, At.large / 2);
    lot.boite('peinture', 2.5, 0.05, 0.05, new THREE.Matrix4().makeRotationY(Math.atan2(At.u[0], At.u[1]) + Math.PI / 2).setPosition(bf[0], y0 + 4.85, bf[1]), { bande: true, couleur: kit.TEINTES.fer });
  }
  if (ctx.budget()) yield;
  // --- LE PAVILLON INDIEN : rez-de-chaussée, auvent, étage, corniche, terrasse
  const yI = Math.min(...PAVILLON.map(([x, z]) => kit.sol(x, z))) - 0.15;
  const sens = aireSignee(PAVILLON) > 0 ? 1 : -1;
  const etage = (poly, ya, yb, col) => {
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length], Lk = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (Lk < 0.05) continue;
      const n = [sens * (b[1] - a[1]) / Lk, 0, -sens * (b[0] - a[0]) / Lk];
      lot.polygone('peinture', [[a[0], ya, a[1]], [b[0], ya, b[1]], [b[0], yb, b[1]], [a[0], yb, a[1]]], n, { couleur: col, tuile: 1 });
    }
  };
  const plaque = (poly, y, col, dessous = false) => lot.polygone('peinture', poly.map(([x, z]) => [x, y, z]), [0, dessous ? -1 : 1, 0], { couleur: col, tuile: 1 });
  etage(PAVILLON, yI, yI + 4.0, BOIS);
  const auvent = decaler(sens > 0 ? PAVILLON : [...PAVILLON].reverse(), 0.9);
  etage(auvent, yI + 4.0, yI + 4.18, BOIS); plaque(auvent, yI + 4.18, PANNEAU); plaque(auvent, yI + 4.0, BOIS, true);
  etage(PAVILLON, yI + 4.18, yI + 7.6, PANNEAU);
  const corniche = decaler(sens > 0 ? PAVILLON : [...PAVILLON].reverse(), 0.4);
  etage(corniche, yI + 7.6, yI + 8.0, BOIS); plaque(corniche, yI + 8.0, L('#4a2a24')); plaque(corniche, yI + 7.6, BOIS, true);
  // claustras et bow-windows : des panneaux de 1,6 m sur chaque côté assez long, 4 cm devant le mur
  for (let k = 0; k < PAVILLON.length; k++) {
    const a = PAVILLON[k], b = PAVILLON[(k + 1) % PAVILLON.length], Lk = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (Lk < 2.4) continue;
    const t = [(b[0] - a[0]) / Lk, (b[1] - a[1]) / Lk], n = [sens * t[1], 0, -sens * t[0]], nb = Math.floor(Lk / 2.1);
    for (let i = 0; i < nb; i++) {
      const c = (Lk * (i + 0.5)) / nb, cx = a[0] + t[0] * c + n[0] * 0.04, cz = a[1] + t[1] * c + n[2] * 0.04;
      const pan = (ya, yb, col, w = 1.5) => lot.polygone('peinture', [[cx - t[0] * w / 2, ya, cz - t[1] * w / 2], [cx + t[0] * w / 2, ya, cz + t[1] * w / 2],
        [cx + t[0] * w / 2, yb, cz + t[1] * w / 2], [cx - t[0] * w / 2, yb, cz - t[1] * w / 2]], n, { couleur: col, tuile: 1 });
      pan(yI + 0.6, yI + 3.5, CLAUSTRA);
      pan(yI + 4.6, yI + 7.2, VITRE, 1.3);
      if (detail) {
        // le rideau blanc (le bas de la vitre), les croisillons du claustra
        const cx2 = cx + n[0] * 0.01, cz2 = cz + n[2] * 0.01;
        lot.polygone('peinture', [[cx2 - t[0] * 0.6, yI + 4.7, cz2 - t[1] * 0.6], [cx2 + t[0] * 0.6, yI + 4.7, cz2 + t[1] * 0.6], [cx2 + t[0] * 0.6, yI + 5.9, cz2 + t[1] * 0.6], [cx2 - t[0] * 0.6, yI + 5.9, cz2 - t[1] * 0.6]], n, { couleur: RIDEAU, tuile: 1 });
        for (let q = 1; q < 6; q++) lot.barre([cx2 - t[0] * 0.75, yI + 0.6 + q * 0.48, cz2 - t[1] * 0.75], [cx2 + t[0] * 0.75, yI + 0.6 + q * 0.48, cz2 + t[1] * 0.75], 0.05, 0.03, { couleur: L('#4f5a4e') });
        // une console sous l'auvent
        lot.boite('peinture', 0.18, 0.5, 0.18, new THREE.Matrix4().makeTranslation(a[0] + t[0] * c + n[0] * 0.5, yI + 3.75, a[1] + t[1] * c + n[2] * 0.5), { bande: true, couleur: BOIS });
      }
    }
  }
  // la crête ajourée : un bandeau rouge tout autour, et en détail ses fleurons d'or tous les 35 cm
  const crete = decaler(sens > 0 ? PAVILLON : [...PAVILLON].reverse(), 0.3);
  etage(crete, yI + 8.0, yI + 8.25, PANNEAU);
  if (detail) {
    for (let k = 0; k < crete.length; k++) {
      const a = crete[k], b = crete[(k + 1) % crete.length], Lk = Math.hypot(b[0] - a[0], b[1] - a[1]), nb = Math.max(1, Math.round(Lk / 0.35));
      for (let i = 0; i < nb; i++) {
        const f = (i + 0.5) / nb, x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
        recopier(tOr, geoFleuron(), new THREE.Matrix4().makeTranslation(x, yI + 8.25, z), OR);
      }
    }
  }
  if (ctx.budget()) yield;
  // --- LES BULBES : le grand sur son tambour octogonal, les trois petits sur des kiosques d'angle
  const cotes = detail ? 16 : 10;
  for (const B of BULBES) {
    if (B.grand) {
      lot.tour('peinture', [[1.32, 0], [1.32, B.socle], [1.42, B.socle + 0.05], [1.42, B.socle + 0.2]], 8, new THREE.Matrix4().makeTranslation(B.x, yI + 8.0, B.z), { couleur: PANNEAU, facettes: true, bande: true, dessus: true });
      recopier(tOr, geoBulbe(cotes), new THREE.Matrix4().makeScale(B.r, B.r * 1.05, B.r).setPosition(B.x, yI + 8.0 + B.socle + 0.2, B.z), OR);
    } else {
      lot.boite('peinture', 1.3, 1.0, 1.3, new THREE.Matrix4().makeTranslation(B.x, yI + 8.5, B.z), { bande: true, couleur: PANNEAU, chanfrein: 0.05 });
      lot.boite('peinture', 1.5, 0.12, 1.5, new THREE.Matrix4().makeTranslation(B.x, yI + 9.05, B.z), { bande: true, couleur: BOIS });
      recopier(tOr, geoBulbe(cotes), new THREE.Matrix4().makeScale(B.r, B.r * 1.1, B.r).setPosition(B.x, yI + 9.1, B.z), OR);
    }
  }
  // --- L'ENCLOS : le jardin de stabilisé, la pelouse ronde ; les murs enduits blancs (2 m) ; en détail, la grille
  // noire du boulevard et ses piliers de pierre crème (3 m, chapeau mouluré)
  const yJ = (x, z) => kit.sol(x, z) + 0.035;
  const tris = THREE.ShapeUtils.triangulateShape(ENCLOS.jardin.map(([x, z]) => new THREE.Vector2(x, z)), []);
  {
    const p = lot.part('gravier#sol'), base = [];
    for (const [x, z] of ENCLOS.jardin) base.push(lot.s(p, x, yJ(x, z), z, 0, 1, 0, x / 0.7, z / 0.7, L('#e4d8b8')));
    for (const t of tris) lot.tri(p, base[t[0]], base[t[1]], base[t[2]]);
    const q = lot.part('gazon#sol'), E = ENCLOS.pelouse, c = lot.s(q, E.x, yJ(E.x, E.z) + 0.02, E.z, 0, 1, 0, E.x / 1.2, E.z / 1.2, [1, 1, 1]), ring = [];
    for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 2, x = E.x + Math.cos(a) * E.r, z = E.z + Math.sin(a) * E.r; ring.push(lot.s(q, x, yJ(x, z) + 0.02, z, 0, 1, 0, x / 1.2, z / 1.2, [1, 1, 1])); }
    for (let k = 0; k < 24; k++) lot.tri(q, c, ring[k], ring[k + 1]);
  }
  // (le mur est un ENDUIT lisse : le béton du kit, blanchi ; la peinture du kit, à bandes, en faisait une tôle ondulée.
  // Un chaperon de 4 cm le coiffe.)
  for (const ligne of ENCLOS.murs) {
    const pts = ligne.map(([x, z]) => [x, kit.sol(x, z) - 0.1, z]);
    lot.prisme('beton', [[-0.15, 0], [0.15, 0], [0.15, 2.1], [-0.15, 2.1]], pts, { vertical: true, couleur: BLANC_MUR });
    lot.prisme('taille', [[-0.19, 2.1], [0.19, 2.1], [0.19, 2.16], [-0.19, 2.16]], pts, { vertical: true, couleur: CREME, tuile: 1 });
  }
  // LES PILIERS de pierre crème (3 m, chapeau mouluré) de la grille du boulevard, voisins du parvis de l'entrée E2 : on
  // les voit du parc et du boulevard, en silhouette aussi ; la grille noire, en détail seulement.
  if (detail) g.add(yield* kit.grillePas({ ligne: ENCLOS.grille, h: 1.9, muret: 0.45, pointes: true }, ctx.budget));   // (lot C6 : en tranches)
  for (const [x, z] of [ENCLOS.grille[0], [(ENCLOS.grille[0][0] + ENCLOS.grille[1][0]) / 2, (ENCLOS.grille[0][1] + ENCLOS.grille[1][1]) / 2], ENCLOS.grille[1]]) {
    const y = kit.sol(x, z);
    lot.boite('taille', 0.6, 3.0, 0.6, new THREE.Matrix4().makeTranslation(x, y + 1.5, z), { couleur: CREME, chanfrein: 0.02 });
    lot.boite('taille', 0.78, 0.16, 0.78, new THREE.Matrix4().makeTranslation(x, y + 3.08, z), { couleur: CREME, chanfrein: 0.04 });
  }
  const ml = lot.maillages('pavillon des Indes');
  if (!detail) ml.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  g.add(ml);
  const mo = tOr.maillage(materiauOr(), 'pavillon des Indes · bulbes dorés', detail);
  if (mo) g.add(mo);
}
// LA SILHOUETTE DU PAVILLON DES INDES (vue de 70 m et plus : du bosquet ouest, de l'allée sud, de la placette du
// théâtre) : DEUX appels au lieu de huit (conception § 3.3 : une silhouette, c'est 1 à 3 appels ; les matériaux du kit
// en faisaient sept, plus l'or). Tout passe dans l'atlas des façades : l'atelier dans la bande de brique (ses fenêtres
// et ses bandeaux clairs y sont déjà), son toit dans celle d'ardoise ; le pavillon indien dans la même bande de
// brique, teintée rouge brun (#6e2a22 : le bois peint), sa terrasse dans celle des toits ; les murs enduits de l'enclos
// et ses trois piliers crème dans celle du mur aveugle. Les bulbes d'or, en huit côtés, gardent leur matériau.
function* pavillonSilhouette(ctx) {
  const kit = ctx.kit, g = ctx.groupe, T = new Tampon(), tOr = new Tampon(), At = ATELIER, OR = [1, 1, 1];
  const BOIS = [0.42, 0.22, 0.29], CREME = [1.02, 1.0, 0.92], ENDUIT = [1.1, 1.1, 1.07];
  const P = (s, t) => [At.A[0] + At.u[0] * s + At.p[0] * t, At.A[1] + At.u[1] * s + At.p[1] * t];
  const ccw = (q) => (aireSignee(q) > 0 ? q : [...q].reverse());
  // --- l'atelier : deux étages de brique, puis le toit d'ardoise à deux pans (faîtage le long du boulevard) et ses
  // pignons de brique
  const coins = [P(0, 0), P(At.long, 0), P(At.long, At.large), P(0, At.large)];
  const y0 = Math.min(...coins.map(([x, z]) => kit.sol(x, z))) - 0.15, yE = y0 + At.egout, yF = y0 + At.faite;
  const Q = ccw(coins);
  let s = 0;
  for (let k = 0; k < 4; k++) s = mur(T, Q[k], Q[(k + 1) % 4], y0, 2, At.egout / 2, () => 'brique', s, BLANC);
  const d = 0.4, demi = At.large / 2, hR = yF - yE, lp = Math.hypot(hR, demi + d), vA = vBande('ardoise'), vB = vBande('brique');
  for (const [t0, sg] of [[-d, -1], [At.large + d, 1]]) {
    const a = P(-d, t0), b = P(At.long + d, t0), c = P(At.long + d, demi), e = P(-d, demi);
    const nx = sg * At.p[0] * hR / lp, ny = (demi + d) / lp, nz = sg * At.p[1] * hR / lp, L = (At.long + 2 * d) / REPET;
    T.quad(T.s(a[0], yE - 0.25, a[1], nx, ny, nz, 0, vA.bas, BLANC), T.s(b[0], yE - 0.25, b[1], nx, ny, nz, L, vA.bas, BLANC),
      T.s(c[0], yF + 0.05, c[1], nx, ny, nz, L, vA.haut, BLANC), T.s(e[0], yF + 0.05, e[1], nx, ny, nz, 0, vA.haut, BLANC));
  }
  for (const [s0, sg] of [[0, -1], [At.long, 1]]) {
    const a = P(s0, 0), b = P(s0, At.large), c = P(s0, demi), nx = sg * At.u[0], nz = sg * At.u[1], W = At.large / REPET;
    T.tri(T.s(a[0], yE, a[1], nx, 0, nz, 0, vB.bas, BLANC), T.s(b[0], yE, b[1], nx, 0, nz, W, vB.bas, BLANC), T.s(c[0], yF, c[1], nx, 0, nz, W / 2, vB.haut, BLANC));
  }
  // --- le pavillon indien : deux niveaux de 4 m de bois peint, la terrasse, la crête (un bandeau de 25 cm)
  const yI = Math.min(...PAVILLON.map(([x, z]) => kit.sol(x, z))) - 0.15, Pv = ccw(PAVILLON);
  s = 0;
  for (let k = 0; k < Pv.length; k++) s = mur(T, Pv[k], Pv[(k + 1) % Pv.length], yI, 2, 4, () => 'brique', s, BOIS);
  dalle(T, Pv, yI + 8, 'toit', [0.62, 0.5, 0.48]);
  const crete = decaler(Pv, 0.3);
  s = 0;
  for (let k = 0; k < crete.length; k++) s = mur(T, crete[k], crete[(k + 1) % crete.length], yI + 7.75, 1, 0.5, () => 'aveugle', s, [0.6, 0.2, 0.17]);
  if (ctx.budget()) yield;
  // --- les bulbes : le grand sur son tambour, les trois petits sur leurs kiosques d'angle (des boîtes de bois peint)
  for (const B of BULBES) {
    const r = B.grand ? 1.32 : 0.65, h = B.grand ? B.socle + 0.2 : 1.0, yb = yI + 8.0;
    const q = [[B.x - r, B.z - r], [B.x + r, B.z - r], [B.x + r, B.z + r], [B.x - r, B.z + r]];
    s = 0;
    for (let k = 0; k < 4; k++) s = mur(T, q[k], q[(k + 1) % 4], yb, 1, h, () => 'brique', s, BOIS);
    recopier(tOr, geoBulbe(8), new THREE.Matrix4().makeScale(B.r, B.r * (B.grand ? 1.05 : 1.1), B.r).setPosition(B.x, yb + h, B.z), OR);
  }
  // --- l'enclos : les murs enduits de 2,1 m (les deux faces d'un mur de 30 cm), les piliers crème de la grille
  for (const ligne of ENCLOS.murs) {
    for (let k = 0; k + 1 < ligne.length; k++) {
      const a = ligne[k], b = ligne[k + 1], ya = Math.min(kit.sol(a[0], a[1]), kit.sol(b[0], b[1])) - 0.1;
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ox = ((b[1] - a[1]) / L) * 0.15, oz = (-(b[0] - a[0]) / L) * 0.15;
      mur(T, [a[0] + ox, a[1] + oz], [b[0] + ox, b[1] + oz], ya, 1, 2.16, () => 'aveugle', 0, ENDUIT);
      mur(T, [b[0] - ox, b[1] - oz], [a[0] - ox, a[1] - oz], ya, 1, 2.16, () => 'aveugle', 0, ENDUIT);
    }
  }
  for (const [x, z] of [ENCLOS.grille[0], [(ENCLOS.grille[0][0] + ENCLOS.grille[1][0]) / 2, (ENCLOS.grille[0][1] + ENCLOS.grille[1][1]) / 2], ENCLOS.grille[1]]) {
    boiteSol(T, kit, x - 0.3, z - 0.3, x + 0.3, z + 0.3, 3.1, 'aveugle', CREME);
  }
  const m = T.maillage(materiauFacades(ctx), 'pavillon des Indes (silhouette)');
  if (m) g.add(apresLaBrume(m));
  const mo = tOr.maillage(materiauOr(), 'pavillon des Indes · bulbes dorés (silhouette)');
  if (mo) g.add(mo);
}
// La géométrie d'un bulbe (rayon de panse 1), tournée une fois par nombre de côtés.
const _bulbes = new Map();
function geoBulbe(cotes) {
  if (!_bulbes.has(cotes)) _bulbes.set(cotes, new THREE.LatheGeometry(OIGNON.map(([r, y]) => new THREE.Vector2(r, y)), cotes));
  return _bulbes.get(cotes);
}
// Un fleuron de la crête : une petite flamme (losange épais) de 0,45 m
let _fleuron = null;
function geoFleuron() {
  if (!_fleuron) _fleuron = new THREE.LatheGeometry([[0.001, 0], [0.06, 0.05], [0.07, 0.18], [0.03, 0.32], [0.001, 0.45]].map(([r, y]) => new THREE.Vector2(r, y)), 4);
  return _fleuron;
}

// ============================================================================================ serres, vignes, potager
// Le terrain des serres municipales (OSM « Serres municipales », plant_nursery ; orthophoto) : une SERRE DE VERRE à
// deux pans, deux TUNNELS de plastique blanc, deux remises ; la VIGNE EN RANGS à l'est de l'enclos des Indes et un
// potager au sud ; et, au nord, la VIGNE de Bécon (OSM, landuse=vineyard) derrière le musée. Dans l'atlas (serre,
// haie, sol) : le même maillage que les immeubles.
function toitDeuxPans(T, x0, z0, x1, z1, yE, yF, bande, couleur) {
  // faîtage le long de z, pignons au nord et au sud
  const xm = (x0 + x1) / 2, v = vBande(bande), lz = (z1 - z0) / REPET;
  for (const [xa, sgn] of [[x0, -1], [x1, 1]]) {
    const l = Math.hypot(xm - xa, yF - yE), nx = sgn * (yF - yE) / l, ny = Math.abs(xm - xa) / l;
    const i0 = T.s(xa, yE, z0, nx, ny, 0, 0, v.bas, couleur), i1 = T.s(xa, yE, z1, nx, ny, 0, lz, v.bas, couleur);
    const i2 = T.s(xm, yF, z1, nx, ny, 0, lz, v.haut, couleur), i3 = T.s(xm, yF, z0, nx, ny, 0, 0, v.haut, couleur);
    T.quad(i0, i1, i2, i3);
  }
  for (const [z, sgn] of [[z0, -1], [z1, 1]]) {
    const a = T.s(x0, yE, z, 0, 0, sgn, 0, v.bas, couleur), b = T.s(x1, yE, z, 0, 0, sgn, (x1 - x0) / REPET, v.bas, couleur), c = T.s(xm, yF, z, 0, 0, sgn, (x1 - x0) / 2 / REPET, v.haut, couleur);
    T.tri(a, b, c);
  }
}
function tunnel(T, kit, xc, z0, z1, r, couleur) {
  const v = vBande('serre'), y0 = Math.min(solPourtour(kit, xc, z0), solPourtour(kit, xc, z1)) - 0.1, n = 8;
  let prev = null;
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * Math.PI, cx = Math.cos(a), cy = Math.sin(a), u = (a * r) / REPET * 4;
    const pa = T.s(xc + cx * r, y0 + cy * r, z0, cx, cy, 0, u, v.bas, couleur), pb = T.s(xc + cx * r, y0 + cy * r, z1, cx, cy, 0, u, v.haut, couleur);
    if (prev) T.quad(prev[0], prev[1], pb, pa);
    prev = [pa, pb];
  }
  for (const [z, sgn] of [[z0, -1], [z1, 1]]) {
    const c = T.s(xc, y0 + r * 0.4, z, 0, 0, sgn, 0.1, (v.bas + v.haut) / 2, couleur), ring = [];
    for (let k = 0; k <= n; k++) { const a = (k / n) * Math.PI; ring.push(T.s(xc + Math.cos(a) * r, y0 + Math.sin(a) * r, z, 0, 0, sgn, 0.1 + Math.cos(a) * 0.05, v.bas + (v.haut - v.bas) * Math.sin(a), couleur)); }
    for (let k = 0; k < n; k++) T.tri(c, ring[k], ring[k + 1]);
  }
}
// Une boîte posée sur le sol du pourtour (rangs de vigne, remises) : quatre murs et un dessus, bande `bande`
function boiteSol(T, kit, x0, z0, x1, z1, h, bande, couleur, dessus = bande) {
  const poly = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  const y0 = Math.min(...poly.map(([x, z]) => solPourtour(kit, x, z))) - 0.05;
  let s = 0;
  for (let k = 0; k < 4; k++) s = mur(T, poly[k], poly[(k + 1) % 4], y0, 1, h, () => bande, s, couleur);
  dalle(T, poly, y0 + h, dessus, couleur);
}
// Un aplat de sol (potager, terre de la vigne), à 4 cm au-dessus du sol du pourtour
function aplat(T, kit, x0, z0, x1, z1, couleur, pas = 4) {
  const v = vBande('sol'), vm = (v.bas + v.haut) / 2, nx = Math.max(1, Math.ceil((x1 - x0) / pas)), nz = Math.max(1, Math.ceil((z1 - z0) / pas));
  const id = [];
  for (let k = 0; k <= nz; k++) for (let i = 0; i <= nx; i++) {
    const x = x0 + ((x1 - x0) * i) / nx, z = z0 + ((z1 - z0) * k) / nz;
    id.push(T.s(x, solPourtour(kit, x, z) + 0.04, z, 0, 1, 0, x / REPET, vm, couleur));
  }
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) { const a = k * (nx + 1) + i; T.quad(id[a], id[a + 1], id[a + nx + 2], id[a + nx + 1]); }
}
const VIGNE = [0.78, 0.98, 0.62], TERRE = [0.7, 0.55, 0.42];
function serresEtVignes(ctx, T) {
  const kit = ctx.kit;
  // la serre de verre (14 x 18 m, égout 2,4 m, faîtage 4,6 m)
  { const x0 = -77, z0 = 187, x1 = -63, z1 = 205, poly = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    const y0 = Math.min(...poly.map(([x, z]) => solPourtour(kit, x, z))) - 0.05, c = [0.96, 1.02, 0.98];
    let s = 0; for (let k = 0; k < 4; k++) s = mur(T, poly[k], poly[(k + 1) % 4], y0, 1, 2.4, () => 'serre', s, c);
    toitDeuxPans(T, x0, z0, x1, z1, y0 + 2.4, y0 + 4.6, 'serre', c); }
  // les deux tunnels blancs
  tunnel(T, kit, -52.5, 175, 197, 2.9, [1.12, 1.12, 1.1]);
  tunnel(T, kit, -46.0, 175, 197, 2.9, [1.12, 1.12, 1.1]);
  // les remises (blanches, toits plats)
  boiteSol(T, kit, -86, 160, -78, 167, 3.0, 'aveugle', [1.04, 1.04, 1.02], 'toit');
  boiteSol(T, kit, -84, 168.5, -76, 174, 2.8, 'aveugle', [1.04, 1.04, 1.02], 'toit');
  // la vigne en rangs (est de l'enclos des Indes) : dix rangs de 1,3 m, tous les 1,6 m, sur leur terre
  aplat(T, kit, -104, 167.5, -87, 186.5, TERRE);
  for (let i = 0; i < 10; i++) { const x = -102.6 + i * 1.6; boiteSol(T, kit, x - 0.22, 168.5, x + 0.22, 185.5, 1.3, 'haie', mul(VIGNE, 0.92 + 0.12 * kit.alea(i, 1, 2301))); }
  // le potager au sud : terre et rangs bas
  aplat(T, kit, -103, 188, -88, 203, mul(TERRE, 1.08));
  for (let k = 0; k < 7; k++) { const z = 189.5 + k * 2; boiteSol(T, kit, -102, z - 0.3, -89, z + 0.3, 0.4, 'haie', [0.9, 1.08, 0.7]); }
}
// la vigne de Bécon, au nord (OSM 765716565) : douze rangs le long de son grand côté
function vigneNord(ctx, T) {
  const kit = ctx.kit, A = [-56.04, -140.65], B = [-58.15, -168.28], C = [-36.77, -169.96];
  const u = [B[0] - A[0], B[1] - A[1]], lu = Math.hypot(u[0], u[1]), w = [C[0] - B[0], C[1] - B[1]], lw = Math.hypot(w[0], w[1]);
  const nR = Math.floor(lw / 1.7);
  aplat(T, kit, Math.min(A[0], B[0], C[0]), Math.min(A[1], B[1], C[1]), Math.max(A[0], B[0], C[0]), Math.max(A[1], B[1], C[1]), TERRE, 6);
  for (let i = 0; i < nR; i++) {
    const f = (i + 0.5) / nR, ox = A[0] + w[0] * f, oz = A[1] + w[1] * f;
    const a = [ox + u[0] * 0.04, oz + u[1] * 0.04], b = [ox + u[0] * 0.96, oz + u[1] * 0.96];
    // un rang : une haie mince de 1,3 m le long de u
    const t = [u[0] / lu, u[1] / lu], n = [-t[1] * 0.22, t[0] * 0.22];
    const poly = [[a[0] - n[0], a[1] - n[1]], [b[0] - n[0], b[1] - n[1]], [b[0] + n[0], b[1] + n[1]], [a[0] + n[0], a[1] + n[1]]];
    const y0 = Math.min(...poly.map(([x, z]) => solPourtour(kit, x, z))) - 0.05;
    const P = aireSignee(poly) > 0 ? poly : [...poly].reverse();
    let s = 0; for (let k = 0; k < 4; k++) s = mur(T, P[k], P[(k + 1) % 4], y0, 1, 1.3, () => 'haie', s, mul(VIGNE, 0.92 + 0.12 * kit.alea(i, 2, 2302)));
    dalle(T, P, y0 + 1.3, 'haie', VIGNE);
  }
}
// Le parking de l'immeuble à gradins (orthophoto : x -9 à 4, z -116 à -74) et, en détail, ses voitures
function* parkingNordEst(ctx, lot, detail) {
  const kit = ctx.kit, p = lot.part('asphalte#sol'), id = [], x0 = -9, x1 = 4, z0 = -116, z1 = -75;
  for (let k = 0; k <= 8; k++) for (let i = 0; i <= 2; i++) {
    const x = x0 + ((x1 - x0) * i) / 2, z = z0 + ((z1 - z0) * k) / 8;
    id.push(lot.s(p, x, kit.sol(x, z) + 0.04, z, 0, 1, 0, x / 4.04, z / 4.04, [0.8, 0.79, 0.78]));
  }
  for (let k = 0; k < 8; k++) for (let i = 0; i < 2; i++) { const a = k * 3 + i; lot.quad(p, id[a], id[a + 1], id[a + 4], id[a + 3]); }
  if (!detail) return;
  for (const [x, z, a, c] of [[-6.8, -108, 0, 0], [-6.8, -100.5, 0, 3], [-6.8, -93, 0, 1], [1.5, -97, Math.PI, 4], [1.5, -89.5, Math.PI, 2], [-6.8, -82, 0, 6]]) {
    voiture(lot, new THREE.Matrix4().makeRotationY(a + Math.PI / 2).setPosition(x, kit.sol(x, z) + 0.04, z), TEINTES_VOITURES[c]);
  }
  if (ctx.budget()) yield;
}

// ============================================================================================ l'île de la Jatte
// La rive de l'île (zone Z19, X.ile) et son sol (Y_EAU + 4,3) ; le quai, la Seine, la rive et ses arbres sont à Z19.
const P_ILE = -3.82 / 335, Y_ILE = -8.22 + 4.3;
const xIle = (z) => 156 + P_ILE * z;
// LES IMMEUBLES DE L'ÎLE, de z- à z+ (R6, Z20.2 : positions à ± 20 m) : [z0, z1, recul de la façade depuis la rive,
// profondeur, hauteur à l'égout, style, toit, édicules]. `gradins` : le dernier niveau en retrait de 3 m côté Seine.
const ILE = [
  [-330, -300, 34, 13, 15, 'blanc', 'plat'], [-292, -262, 32, 14, 18, 'creme', 'plat'], [-255, -228, 36, 13, 15, 'beige', 'zinc'],
  [-220, -190, 32, 14, 18, 'blanc', 'plat'], [-182, -142, 35, 13, 16, 'creme', 'plat'],
  // 1. l'immeuble d'habitation beige de 6 niveaux, en partie caché par les arbres (Z20-03)
  [-136, -103, 34, 14, 19, 'beige', 'plat'],
  // 2. les BUREAUX À MUR-RIDEAU de verre gris bleu, 6 niveaux et un couronnement clair, ses édicules (Z20-04, Z20-08)
  [-98, -44, 30, 16, 22, 'verre', 'couronne', 3],
  // 3. le LONG IMMEUBLE de 7 à 8 niveaux, toit hérissé d'édicules (Z20-09, Z20-10). (Relecture du lot B11 : en façade
  // de verre gris bleu à allèges en bandes, comme les bureaux voisins. Blanc cassé sur la sphère S1 de 2018, prise soleil
  // de face, il est bleu gris sur j1 et sur Z20-08, la référence de septembre 2025 : de l'axe vers la gauche, une seule
  // longue bande vitrée. En blanc, c'était l'objet le plus clair de toute la vue du belvédère.)
  [-40, 12, 30, 14, 24, 'verre', 'plat', 5],
  // 4. les immeubles de 5 niveaux + ATTIQUE DE ZINC à lucarnes, beige clair (Z20-02, Z20-08)
  [16, 36, 32, 13, 18, 'beige', 'zinc'], [41, 61, 30, 13, 18, 'beige', 'zinc'],
  // 5. les immeubles beige gris de 4 à 5 niveaux à toits plats (Z20-05)
  [67, 85, 33, 13, 15, 'creme', 'plat'], [91, 109, 31, 12, 14, 'creme', 'plat'],
  // 6. les résidences blanches à terrasses en gradins, la maison à toit d'ardoise (Z20-06, Z20-07)
  [116, 140, 30, 14, 16, 'gradins', 'gradins'], [147, 171, 31, 14, 16, 'gradins', 'gradins'], [177, 188, 26, 11, 9, 'creme', 'croupe'],
  [196, 222, 33, 13, 15, 'blanc', 'plat'], [230, 262, 31, 14, 18, 'beige', 'zinc'], [270, 300, 34, 13, 15, 'gradins', 'gradins'],
  // (au fond, plus haute que le reste, la tour de bureaux vitrée de la photo 171717, que dessinait Z19)
  [206, 224, 68, 16, 27, 'verre', 'plat', 1],
  [308, 340, 32, 14, 18, 'blanc', 'plat'], [348, 380, 35, 13, 15, 'creme', 'plat'], [388, 420, 32, 14, 18, 'beige', 'zinc'], [428, 465, 33, 13, 15, 'blanc', 'plat'],
];
// (pour la zone Z19 : où sont les immeubles de l'île, pour n'y planter aucun arbre — { x, z, w le long de la rive, d })
export const ILE_IMMEUBLES = ILE.map(([z0, z1, recul, prof]) => ({ x: xIle((z0 + z1) / 2) + recul + prof / 2, z: (z0 + z1) / 2, w: z1 - z0, d: prof }));
// Le quadrilatère d'un immeuble de l'île (sens trigonométrique), du recul `r` à r + prof derrière la rive, de z0 à z1 :
// ses façades suivent la rive (qui gagne P_ILE m en x par mètre de z, comme le quai).
function rectIle(z0, z1, r, prof) {
  const P = (zz, rr) => [xIle(zz) + rr, zz];
  return [P(z0, r), P(z0, r + prof), P(z1, r + prof), P(z1, r)];
}
// LES PEUPLIERS D'ITALIE, en rangée derrière les immeubles (25 à 28 m, Ø 4 m, tous les 6 à 8 m), avec des trous ; de
// z -150 à 330, ce que l'on voit du belvédère, de la promenade et du quai. Un fuseau de feuillage (le feuillage du
// kit) : 7 côtés, 8 rangs.
// (le haut arrondi en ogive : vue du belvédère, une pointe fine par arbre faisait une file de cyprès, quand j1 montre
// un faîte de dômes serrés)
const PEUPLIER = [[0.3, 0], [0.95, 1.4], [1.0, 3.5], [1.0, 10], [0.99, 15], [0.95, 19], [0.86, 22], [0.7, 24.4], [0.46, 26], [0.18, 26.9], [0.01, 27.2]];
// Quatre fuseaux bosselés (le bord d'une couronne de peuplier n'est jamais lisse : un tour régulier faisait une file de
// cyprès en cônes) : le profil, déformé par un bruit lent autour de l'axe et le long de la hauteur, recousu à la
// couture (le bruit se lit sur le cercle).
const _fuseaux = [];
function geoPeuplier(kit, v) {
  if (!_fuseaux[v]) {
    const g = new THREE.LatheGeometry(PEUPLIER.map(([r, y]) => new THREE.Vector2(r, y)), 7), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
      if (r < 1e-4) continue;
      const c = x / r, s = z / r, b = 1 + 0.34 * (kit.bruit(c * 1.6 + v * 3.1, y * 0.33 + s * 1.6, 2421 + v) - 0.5) + 0.12 * (kit.bruit(c * 4 + y * 0.9, s * 4 - y * 0.7, 2425 + v) - 0.5);
      p.setXYZ(i, x * b, y * (1 + 0.04 * (b - 1)), z * b);
    }
    g.computeVertexNormals();
    _fuseaux[v] = g;
  }
  return _fuseaux[v];
}
// L'ÎLE PASSE APRÈS LA BRUME D'HORIZON. Le ciel de js/court.js pose un anneau de brume (opaque à 80 % au ras de
// l'horizon) à 455 m de l'œil, ramené à 240 m en balade (camera.far, monde_charge.js, _suivreCiel) ; dessiné APRÈS tout
// ce qui est opaque, il voilait aux quatre cinquièmes les immeubles de l'île, à 250-270 m du belvédère : des fantômes
// blancs, là où j1 et Z20-08 les montrent nets au-dessus de la rive. Leurs deux matériaux sont donc dessinés dans la
// passe transparente (opaques quand même : opacité 1, profondeur écrite), juste après l'anneau (ordre -3,9 ; l'anneau
// est à -4, l'horizon à -3,5 : il reste derrière l'île). Leur brume, ils la prennent eux-mêmes (un septième).
// (relecture : les façades du boulevard et des autres morceaux passent aussi par là, avec leur propre voile lointain :
// voir materiauFacades)
function apresLaBrume(m) {
  m.material.transparent = true; m.material.depthWrite = true; m.material.opacity = 1;
  m.renderOrder = -3.9;
  return m;
}
function* ile(ctx) {
  const kit = ctx.kit, g = ctx.groupe, T = new Tampon();
  for (const [z0, z1, recul, prof, h, style, toit, edicules] of ILE) {
    const y0 = Y_ILE - 0.3;
    if (toit === 'gradins') {
      // le corps, puis le dernier niveau en retrait de 3 m côté Seine (sa terrasse)
      batiment(kit, T, ['ile' + z0, style, 'plat', h - 3, 0, rectIle(z0, z1, recul, prof).flat(), null], y0);
      batiment(kit, T, ['ile' + z0 + 'h', style, 'plat', 3, 0, rectIle(z0 + 1.5, z1 - 1.5, recul + 3, prof - 3.5).flat(), null], y0 + h - 3 + 0.4);
    } else if (toit === 'couronne') {
      // le mur-rideau, puis un couronnement clair (un niveau de mur blanc, en léger retrait)
      batiment(kit, T, ['ile' + z0, style, 'plat', h - 2.6, 0, rectIle(z0, z1, recul, prof).flat(), null], y0);
      batiment(kit, T, ['ile' + z0 + 'c', 'bureau', 'plat', 2.6, 0, rectIle(z0 + 0.6, z1 - 0.6, recul + 0.6, prof - 1.2).flat(), null], y0 + h - 2.6 + 0.4);
    } else {
      batiment(kit, T, ['ile' + z0, style, toit, h, 0, rectIle(z0, z1, recul, prof).flat(), null], y0);
    }
    // les édicules du toit : cages d'escalier et machineries, de 2 à 3,5 m
    for (let k = 0; k < (edicules || 0); k++) {
      const f = (k + 0.5 + 0.4 * (kit.alea(z0, k, 2401) - 0.5)) / edicules, zc = z0 + (z1 - z0) * f, w = 3 + 3 * kit.alea(z0, k, 2402);
      const he = 2 + 1.5 * kit.alea(z0, k, 2403), rr = recul + 2 + (prof - 7) * kit.alea(z0, k, 2404);
      batiment(kit, T, ['ile' + z0 + 'e' + k, 'aveugle', 'plat', he, 0, rectIle(zc - w / 2, zc + w / 2, rr, 4).flat(), null], y0 + h + 0.4);
    }
    if (ctx.budget()) yield;
  }
  const m = T.maillage(materiauFacadesLoin(ctx), 'pourtour · immeubles de l\'île');
  if (m) g.add(apresLaBrume(m));
  // la rangée de peupliers (un lot du kit, puis le feuillage à brume allégée)
  const lot = new kit.Lot('peupliers de l\'île');
  // (serrés — tous les 4,3 m, couronnes jointives : une muraille sombre au faîte inégal, j1 et Z20-08 —, et un second
  // rang, décalé, par endroits ; les trous sont rares)
  // (hauts de 20 à 24 m : au-dessus des toits de cinq niveaux, mais SOUS la tour Montparnasse vue du belvédère, Z20-08)
  // (lot B11, fin : un peu plus larges — Ø 5,4 à 7 m — et le second rang plus souvent là, pour que les couronnes se
  // touchent ; la hauteur suit en plus un bruit lent, des tronçons plus hauts, d'autres plus bas, comme sur j1)
  for (let z = -125, k = 0; z < 285; z += 4.3, k++) {
    const a = kit.alea(z, 1.1, 2411), b = kit.alea(z, 2.2, 2412), trou = kit.bruit(z / 40, 3.3, 2413), lent = kit.bruit(z / 55, 7.7, 2416);
    if (trou < 0.22 && a < 0.6) continue;
    for (const rang of [0, 1]) {
      if (rang === 1 && kit.alea(z, 4.4, 2415) < 0.4) continue;
      const h = 19.5 + 2.6 * (rang ? a : b) + 2.4 * lent, R = 2.7 + 0.8 * (rang ? b : a), x = xIle(z) + 50 + 4 * kit.alea(z, 3.3, 2414) + rang * 5;
      const zz = z + 1.5 * (b - 0.5) + rang * 2.1, t = 0.27 + 0.08 * (rang ? b : a);
      const m4 = new THREE.Matrix4().makeScale(R, h / 27, R * (0.9 + 0.2 * a)).premultiply(new THREE.Matrix4().makeRotationY(a * 6.28)).setPosition(x, Y_ILE - 0.5, zz);
      lot.geo('feuillage', geoPeuplier(kit, k % 4), m4, { uvBoite: true, tuile: 1.4, couleur: (px, py, pz, nx, ny) => { const l = 0.66 + 0.34 * lisse(-0.5, 0.8, ny); return [0.78 * t * l, 0.95 * t * l, 0.58 * t * l]; } });
    }
  }
  const f = lot.maillages('peupliers de l\'île');
  f.traverse((o) => { if (o.isMesh) { o.material = materiauPeupliers(ctx); o.castShadow = false; o.userData.feuillage = true; apresLaBrume(o); } });
  g.add(f);
}

// ============================================================================================ l'horizon
// Les silhouettes lointaines, dessinées dans une toile (1024 x 512) et posées à leur vraie place sur des panneaux
// tournés vers le parc (voir l'en-tête : profondeur ramenée au fond, pas de brouillard, brume du ciel, porte de hauteur).
// [nom, centre (x, z), y du pied, largeur, hauteur (m), région de la toile [x, y, l, h] (px), brume, porte (1 : Paris)]
const HORIZON = [
  // LA VILLE AU PIED DE LA DÉFENSE (Courbevoie, Puteaux : des toits de 10 à 30 m) : une bande sous le bouquet de tours,
  // qui s'efface dans la brume vers le bas et sur les côtés. Sans elle, vu d'en haut (PV21, le drone de la photo 3 :
  // le pied des tours est 1° SOUS l'horizon), le bouquet flottait au-dessus d'une bande de ciel. Dessinée AVANT les
  // tours (le même maillage, dans l'ordre des panneaux) : leur pied passe par-dessus ses toits.
  // (300 m de haut : vue de 14 m — les parterres, l'allée sud —, le sol du jeu s'arrête à camera.far, 2° à 3° sous
  // l'horizon ; vue du drone, 9° ; entre les deux, il n'y avait que la brume. Plus bas, le sol du jeu la cache.)
  { nom: 'ville au pied de La Défense', cap: 243, d: 2300, y: -300, l: 1062, h: 310, toile: [240, 272, 784, 176], brume: 0.55, porte: 0 },
  // LA DÉFENSE (R6, Z20-15 à Z20-17) : au bout du quai, cap 243 depuis le plateau, à 2,3 km ; 26° de large
  { nom: 'La Défense', cap: 243, d: 2300, y: 2, l: 1062, h: 282, toile: [0, 0, 1024, 272], brume: 0.48, porte: 0 },
  // PARIS, SOUS LES DEUX TOURS : la même bande de toits (sa région de la toile), à 5 km, deux fois plus grande, plus
  // brumeuse, avec la même porte de hauteur. Des parterres (PV09), l'île est au-delà de camera.far : sans elle, la tour
  // Montparnasse flottait en bloc gris au-dessus de la balustrade du belvédère, sur le ciel ; du belvédère (PV08), les
  // peupliers et les immeubles de l'île la cachent (ils sont dessinés à leur place, elle au fond).
  { nom: 'Paris', x: 5000, z: 380, y: -560, l: 5800, h: 590, toile: [240, 272, 784, 176], brume: 0.72, porte: 1 },
  // LA TOUR EIFFEL (+4800 ; +720) : 330 m, gris brun #6f6556 ; LA TOUR MONTPARNASSE (+7353 ; -153) : 210 m, sombre
  { nom: 'tour Eiffel', x: 4800, z: 720, y: -0.9, l: 140, h: 336, toile: [0, 272, 160, 240], brume: 0.26, porte: 1 },
  // (sa brume : 0,3. À 0,38, elle sortait gris pâle au-dessus des peupliers, presque de la couleur du ciel, là où Z20-08
  // et Z20-13 la décrivent en « bloc sombre » ; la tour Eiffel, plus proche, garde son gris brun léger)
  { nom: 'tour Montparnasse', x: 7353, z: -153, y: 22, l: 64, h: 230, toile: [160, 272, 80, 240], brume: 0.3, porte: 1 },
];
// LE PONT DE COURBEVOIE (R6, Z20-15, Z20-17) : poutre de béton gris sur cinq piles, garde-corps vert d'eau ; à
// z ≈ 785, en travers de la Seine (x 20 à 180). Panneau face au parc, région basse de la toile.
const PONT = { x0: 20, x1: 180, z: 785, y0: -8.3, y1: 2.3, toile: [240, 448, 784, 64], brume: 0.3 };
function dessinerHorizon(c, alea) {
  // --- LA DÉFENSE : région [0, 0, 1024, 272], 0,964 px/m ; X de 0 (gauche, côté Seine) à 1062 m, Y du pied
  const k = 1024 / 1062, X = (m) => m * k, Y = (m) => 272 - m * k;
  const tour = (x, w, h, col, o = {}) => {
    const g = c.createLinearGradient(X(x), 0, X(x + w), 0);
    g.addColorStop(0, o.clair || col); g.addColorStop(0.55, col); g.addColorStop(1, o.sombre || col);
    c.fillStyle = g; c.fillRect(X(x), Y(h), X(w), Y(0) - Y(h));
    // les étages (des lignes à peine visibles) et les montants
    c.fillStyle = 'rgba(255,255,255,0.07)';
    for (let y = 4; y < h; y += 4) c.fillRect(X(x), Y(y), X(w), 1);
    if (o.couronne) { c.fillStyle = o.couronne; c.fillRect(X(x), Y(h), X(w), X(4)); }
  };
  // les immeubles du pied (40 à 80 m, beiges et blancs), de part et d'autre
  for (let x = 60, i = 0; x < 1010; i++) {
    const w = 14 + 26 * alea(i, 1, 2501), h = 22 + 55 * alea(i, 2, 2502) * (x > 380 && x < 640 ? 1.25 : 0.85);
    const col = ['#d8cfbd', '#e6e3dc', '#bfc2c3', '#cfc6b4', '#aeb6bd'][Math.floor(alea(i, 3, 2503) * 5)];
    tour(x, w, h, col, { sombre: '#a9a49a' });
    x += w + 2 + 10 * alea(i, 4, 2504);
  }
  // les grandes tours, de gauche à droite (R6 Z20-15 : tours rectangulaires gris bleu, la plus haute à couronnement en
  // pointe oblique au milieu, une tour bleu sombre, la tour à coque arrondie à résille à droite, deux tours bleues)
  tour(170, 34, 150, '#a9b8c6', { clair: '#c3cfd9', sombre: '#8e9dab' });
  tour(232, 54, 166, '#8fa3b5', { clair: '#a9bac8', sombre: '#73879a', couronne: '#9fb0be' });
  // la plus haute : corps à 186 m, couronnement taillé en pointe oblique jusqu'à 222 m
  {
    const x = 326, w = 46;
    tour(x, w, 186, '#8fa3b5', { clair: '#b2c2cf', sombre: '#6e8296' });
    c.fillStyle = '#9db0c1';
    c.beginPath(); c.moveTo(X(x), Y(186)); c.lineTo(X(x), Y(197)); c.lineTo(X(x + w * 0.38), Y(222)); c.lineTo(X(x + w * 0.52), Y(204));
    c.lineTo(X(x + w), Y(192)); c.lineTo(X(x + w), Y(186)); c.closePath(); c.fill();
    c.fillStyle = 'rgba(60,75,90,0.35)'; c.fillRect(X(x + w * 0.62), Y(186), X(w * 0.38), Y(0) - Y(186));
  }
  tour(404, 34, 182, '#3e5268', { clair: '#55697f', sombre: '#2f4053', couronne: '#5b6e82' });
  // des tours d'habitation plus basses au milieu (70 à 105 m)
  for (const [x, w, h] of [[452, 26, 92], [484, 22, 104], [512, 30, 86], [548, 24, 98], [578, 30, 74]]) tour(x, w, h, '#ddd6c8', { sombre: '#b8b1a3' });
  // la tour à coque arrondie (D2) : un corps et un dôme en ogive, gris sombre, sa résille en losanges plus claire
  {
    const x = 640, w = 40, h = 171, cx = X(x + w / 2);
    c.fillStyle = '#50555b';
    c.beginPath(); c.moveTo(X(x), Y(0)); c.lineTo(X(x), Y(120));
    c.bezierCurveTo(X(x), Y(160), cx - X(w * 0.3), Y(h), cx, Y(h)); c.bezierCurveTo(cx + X(w * 0.3), Y(h), X(x + w), Y(160), X(x + w), Y(120));
    c.lineTo(X(x + w), Y(0)); c.closePath(); c.fill();
    c.save(); c.clip(); c.strokeStyle = 'rgba(170,180,190,0.35)'; c.lineWidth = 1;
    for (let d = -200; d < 260; d += 9) { c.beginPath(); c.moveTo(X(x) + d * 0.4, Y(0)); c.lineTo(X(x) + d * 0.4 + 180, Y(h)); c.stroke(); c.beginPath(); c.moveTo(X(x + w) - d * 0.4, Y(0)); c.lineTo(X(x + w) - d * 0.4 - 180, Y(h)); c.stroke(); }
    c.restore();
  }
  tour(722, 50, 150, '#4a6a8c', { clair: '#5f80a1', sombre: '#3b5674' });
  tour(790, 34, 165, '#3e5268', { clair: '#53687e', couronne: '#8fa3b5' });
  tour(850, 40, 112, '#a9b8c6', { sombre: '#8796a5' });
  // --- LA VILLE AU PIED DES TOURS : région [240, 272, 784, 176] ; X de 0 à 1062 m (comme les tours), Y de -300 à 10 m
  // (le panneau de Paris reprend la même région, à une autre échelle).
  // Dessinée à part (une petite toile), puis masquée : opaque en haut, effacée vers le bas (y -30 à -300) et sur les
  // côtés (les 15 % de chaque bout), recopiée dans sa région ; un masque posé sur la grande toile l'effacerait toute.
  // Une rangée de toits (des blocs de 8 à 32 m, faîtes de -3 à 9 m), puis, dessous, la masse de la ville : des bandes
  // de toits plus sombres et plus claires, de plus en plus serrées (la perspective d'une plaine de toits).
  {
    const W = 784, H = 176, vx = (m) => (m * W) / 1062, vy = (m) => H - ((m + 300) * H) / 310;
    const o = document.createElement('canvas'); o.width = W; o.height = H;
    const v = o.getContext('2d');
    v.fillStyle = '#aea89c'; v.fillRect(0, vy(-3), W, H - vy(-3));          // le fond, entre les toits
    for (let x = 0, i = 0; x < 1062; i++) {
      const w = 8 + 24 * alea(i, 5, 2511), h = -3 + 12 * alea(i, 6, 2512);
      const col = ['#cfc7b6', '#bdbab3', '#d9d4c9', '#b3aa98', '#c4c6c4', '#a9a294'][Math.floor(alea(i, 7, 2513) * 6)];
      v.fillStyle = col; v.fillRect(vx(x), vy(h), vx(w) + 1, vy(-14) - vy(h));
      v.fillStyle = 'rgba(70,70,72,0.4)'; v.fillRect(vx(x), vy(h), vx(w) + 1, 1);       // l'arête du toit
      x += w + 0.5 + 3 * alea(i, 8, 2514);
    }
    for (let y = -14, k = 0; y > -300; k++) {
      const e = 5 + 0.08 * (-y);                                              // l'épaisseur d'une bande (m)
      for (let x = 0, i = 0; x < 1062; i++) {
        const w = 10 + 40 * alea(i, k, 2515);
        v.fillStyle = ['#a39d91', '#b9b2a4', '#8f8c86', '#c3beb3', '#9b978e'][Math.floor(alea(i, k, 2516) * 5)];
        v.fillRect(vx(x), vy(y), vx(w) + 1, vy(y - e) - vy(y) + 1);
        x += w;
      }
      y -= e;
    }
    v.globalCompositeOperation = 'destination-in';
    const gv = v.createLinearGradient(0, vy(-30), 0, vy(-300));
    gv.addColorStop(0, 'rgba(0,0,0,1)'); gv.addColorStop(0.35, 'rgba(0,0,0,0.85)'); gv.addColorStop(1, 'rgba(0,0,0,0)');
    v.fillStyle = gv; v.fillRect(0, 0, W, H);
    const gh = v.createLinearGradient(0, 0, W, 0);
    gh.addColorStop(0, 'rgba(0,0,0,0)'); gh.addColorStop(0.15, 'rgba(0,0,0,1)'); gh.addColorStop(0.85, 'rgba(0,0,0,1)'); gh.addColorStop(1, 'rgba(0,0,0,0)');
    v.fillStyle = gh; v.fillRect(0, 0, W, H);
    c.drawImage(o, 240, 272);
  }
  // --- LA TOUR EIFFEL : région [0, 272, 160, 240] ; X de -70 à 70 m, Y de 0 à 336 m
  {
    const kx = 160 / 140, ky = 240 / 336, ex = (m) => (m + 70) * kx, ey = (m) => 512 - m * ky;
    const demi = (y) => (y < 57 ? 62 - 25 * Math.pow(y / 57, 0.8) : y < 116 ? 37 - 16 * (y - 57) / 59 : y < 276 ? 21 * Math.pow(1 - (y - 116) / 160, 1.55) + 4.2 : y < 300 ? 3.6 - (y - 276) * 0.07 : 1.2 - (y - 300) * 0.03);
    c.fillStyle = 'rgba(111,101,86,0.96)';
    c.beginPath(); c.moveTo(ex(-62), ey(0));
    for (let y = 0; y <= 330; y += 3) c.lineTo(ex(-demi(y)), ey(y));
    for (let y = 330; y >= 0; y -= 3) c.lineTo(ex(demi(y)), ey(y));
    c.closePath(); c.fill();
    // l'arche entre les pieds, les plateformes
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.moveTo(ex(-37), ey(0)); c.quadraticCurveTo(ex(-30), ey(36), ex(0), ey(40)); c.quadraticCurveTo(ex(30), ey(36), ex(37), ey(0)); c.closePath(); c.fill();
    // (le treillis, invisible à 4,8 km, ne laisse qu'un peu de jour au milieu des jambes)
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath(); c.moveTo(ex(-30), ey(63)); c.lineTo(ex(-17), ey(115)); c.lineTo(ex(17), ey(115)); c.lineTo(ex(30), ey(63)); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = 'rgba(96,88,75,1)';
    c.fillRect(ex(-40), ey(63), ex(40) - ex(-40), ey(57) - ey(63));
    c.fillRect(ex(-24), ey(121), ex(24) - ex(-24), ey(115) - ey(121));
    c.fillRect(ex(-6), ey(281), ex(6) - ex(-6), ey(275) - ey(281));
  }
  // --- LA TOUR MONTPARNASSE : région [160, 272, 80, 240] ; X de -32 à 32 m, Y de 0 à 230 m
  {
    const kx = 80 / 64, ky = 240 / 230, mx = (m) => 160 + (m + 32) * kx, my = (m) => 512 - m * ky;
    const g = c.createLinearGradient(mx(-28), 0, mx(28), 0);
    g.addColorStop(0, '#4a4d53'); g.addColorStop(0.5, '#3b3d42'); g.addColorStop(1, '#2e3034');
    c.fillStyle = g; c.fillRect(mx(-28), my(201), mx(28) - mx(-28), my(0) - my(201));
    c.fillStyle = '#5c6067'; c.fillRect(mx(-27), my(210), mx(27) - mx(-27), my(201) - my(210));
    c.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 4; y < 200; y += 3.6) c.fillRect(mx(-28), my(y), mx(28) - mx(-28), 1);
    c.fillStyle = '#4f5257'; c.fillRect(mx(-1), my(228), mx(1) - mx(-1), my(210) - my(228));
  }
  // --- LE PONT : région [240, 448, 784, 64] ; X de 0 à 160 m, Y de -8,3 à 2,3 m
  {
    const kx = 784 / 160, ky = 64 / 10.6, px = (m) => 240 + m * kx, py = (m) => 512 - (m + 8.3) * ky;
    c.fillStyle = '#8d8d87';
    for (const x of [35, 60, 85, 110, 135]) c.fillRect(px(x - 1.5), py(-1), px(x + 1.5) - px(x - 1.5), py(-8.3) - py(-1));
    c.fillStyle = '#9a9a94'; c.fillRect(px(0), py(1), px(160) - px(0), py(-1) - py(1));
    c.fillStyle = '#7c7c77'; c.fillRect(px(0), py(-0.6), px(160) - px(0), py(-1) - py(-0.6));
    c.fillStyle = '#7fb3a8'; c.fillRect(px(0), py(2.1), px(160) - px(0), py(1.9) - py(2.1));
    for (let x = 0; x <= 160; x += 2.5) c.fillRect(px(x), py(2.1), 2, py(1) - py(2.1));
  }
}
const HORIZON_VS = `
attribute vec2 voile;
varying vec2 vUv;
varying vec2 vVoile;
void main() {
  vUv = uv; vVoile = voile;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;            // au fond : derrière tout ce qui est dessiné, jamais coupé par camera.far
}`;
const HORIZON_FS = `
uniform sampler2D carte;
uniform vec3 brume;
uniform float paris;
uniform float vis;
varying vec2 vUv;
varying vec2 vVoile;
void main() {
  vec4 t = texture2D(carte, vUv);
  float a = t.a * vis * mix(1.0, paris, vVoile.y);
  if (a < 0.01) discard;
  gl_FragColor = vec4(mix(t.rgb, brume, vVoile.x), a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
function* horizon(ctx) {
  const kit = ctx.kit;
  if (!MAT.horizon) {
    const t = ctx.K.canvasTex(1024, 512, (c) => dessinerHorizon(c, kit.alea), null, true, 4);
    MAT.horizon = new THREE.ShaderMaterial({
      uniforms: { carte: { value: t }, brume: { value: new THREE.Color(0xe9eef2) }, paris: { value: 1 }, vis: { value: 1 } },
      vertexShader: HORIZON_VS, fragmentShader: HORIZON_FS, transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, fog: false,
    });
    MAT.horizon.name = 'pourtour · horizon';
  }
  const pos = [], uv = [], voile = [], idx = [];
  // un panneau : quatre coins (gauche-bas, droite-bas, droite-haut, gauche-haut), la région de la toile, brume, porte
  const panneau = (pts, R, brume, porte) => {
    const b = pos.length / 3, [rx, ry, rw, rh] = R;
    const u0 = rx / 1024, u1 = (rx + rw) / 1024, v0 = 1 - (ry + rh) / 512, v1 = 1 - ry / 512;
    for (const [p, q] of [[pts[0], [u0, v0]], [pts[1], [u1, v0]], [pts[2], [u1, v1]], [pts[3], [u0, v1]]]) { pos.push(p[0] + Monde.dx, p[1], p[2]); uv.push(q[0], q[1]); voile.push(brume, porte); }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  for (const H of HORIZON) {
    let cx, cz;
    if (H.cap !== undefined) { const a = ((H.cap - 150.75) * Math.PI) / 180; cx = -8.7 + Math.cos(a) * H.d; cz = Math.sin(a) * H.d; } else { cx = H.x; cz = H.z; }
    // tourné vers le plateau : la gauche du regard est (dz, -dx)
    const dx = cx + 8.7, dz = cz, l = Math.hypot(dx, dz), gx = dz / l, gz = -dx / l, w = H.l / 2;
    panneau([[cx + gx * w, H.y, cz + gz * w], [cx - gx * w, H.y, cz - gz * w], [cx - gx * w, H.y + H.h, cz - gz * w], [cx + gx * w, H.y + H.h, cz + gz * w]], H.toile, H.brume, H.porte);
  }
  // le pont : face au parc (z-) ; regardé vers z+, la Seine (x+) est à gauche
  panneau([[PONT.x1, PONT.y0, PONT.z], [PONT.x0, PONT.y0, PONT.z], [PONT.x0, PONT.y1, PONT.z], [PONT.x1, PONT.y1, PONT.z]], PONT.toile, PONT.brume, 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('voile', new THREE.Float32BufferAttribute(voile, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, MAT.horizon);
  m.name = 'pourtour · horizon (La Défense, tour Eiffel, Montparnasse, pont de Courbevoie)';
  m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false;
  // après le ciel et sa brume d'horizon (js/court.js : dômes -8 et -7, brume -4), avant l'auréole du soleil (-3)
  m.renderOrder = -3.5;
  m.userData.nofuse = true; m.userData.ciel = true;
  // À CHAQUE IMAGE : la brume du ciel (la couleur du brouillard), la porte de hauteur de Paris (y de 6 à 9 m), et le
  // temps (le voile couvert de js/court.js efface l'horizon : 90 % par temps bouché)
  const U = MAT.horizon.uniforms;
  m.onBeforeRender = (renderer, scene, camera) => {
    if (scene.fog) U.brume.value.copy(scene.fog.color);
    U.paris.value = lisse(6, 9, camera.position.y);
    const cv = scene.userData.ciel && scene.userData.ciel.couvert;
    U.vis.value = 1 - 0.9 * (cv ? cv.material.opacity : 0);
  };
  ctx.groupe.add(m);
}

// ============================================================================================ les morceaux
// Le pourtour en neuf morceaux. `boite` : leur emprise (pour l'ordonnanceur, et pour répartir les bâtiments par leur
// centre et le sol lointain par ses cases) ; `bd` : le tronçon du boulevard.
const PARTS = {
  Z20a: { nom: 'boulevard, nord (PMI, coin nord-est)', boite: [-300, -265, -125, -40], bd: [-262, -40] },
  Z20b: { nom: 'boulevard, au droit du 156 (l\'immeuble paquebot)', boite: [-300, -40, -125, 75], bd: [-40, 75] },
  Z20c: { nom: 'boulevard, sud (rue Franklin, les tours)', boite: [-360, 75, -125, 335], bd: [75, 290] },
  Z20d: { nom: 'nord : écoles, cinéma, bibliothèque, vigne de Bécon', boite: [-125, -265, -30, -116] },
  Z20e: { nom: 'nord-est : immeuble à gradins, parking, carrefour du quai', boite: [-30, -265, 18, -55] },
  Z20g: { nom: 'sud : serres, vigne, rue Carpeaux', boite: [-125, 150, 18, 335] },
};
const ORDRE = ['Z20a', 'Z20b', 'Z20c', 'Z20d', 'Z20e', 'Z20g'];
const BATIMENTS_PAR_PART = (() => {
  const t = Object.fromEntries(ORDRE.map((k) => [k, []]));
  for (const B of BATIMENTS) {
    const p = B[5];
    let cx = 0, cz = 0; for (let k = 0; k < p.length; k += 2) { cx += p[k]; cz += p[k + 1]; } cx /= p.length / 2; cz /= p.length / 2;
    const id = ORDRE.find((k) => { const b = PARTS[k].boite; return cx >= b[0] && cx < b[2] && cz >= b[1] && cz < b[3]; });
    if (id) t[id].push(B);
  }
  return t;
})();
function* construirePart(ctx, id, detail) {
  const P = PARTS[id], kit = ctx.kit, T = new Tampon(), lot = new kit.Lot('pourtour ' + id);
  let n = 0;
  for (const B of BATIMENTS_PAR_PART[id]) { batiment(kit, T, B); if (++n % 4 === 0 && ctx.budget()) yield; }
  solLointain(ctx, T, P.boite);
  if (ctx.budget()) yield;
  if (P.bd) { yield* boulevard(ctx, lot, P.bd[0], P.bd[1], detail); if (detail) yield* voituresBoulevard(ctx, lot, P.bd[0], P.bd[1]); }
  if (id === 'Z20d') vigneNord(ctx, T);
  if (id === 'Z20e') yield* parkingNordEst(ctx, lot, detail);
  if (id === 'Z20g') serresEtVignes(ctx, T);
  const m = T.maillage(materiauFacades(ctx), 'pourtour · ' + P.nom);
  // (après l'anneau de brume du ciel, comme l'île : voir materiauFacades)
  if (m) ctx.groupe.add(apresLaBrume(m));
  const l = lot.maillages('pourtour · ' + P.nom + ' (sols)');
  l.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  ctx.groupe.add(l);
}

// ============================================================================================ la zone
export default {
  id: 'Z20', nom: 'Pourtour lointain',
  emprise: [[-360, -265], [18, -265], [18, 335], [-360, 335]],
  // (chaque morceau a sa silhouette, faite au démarrage et toujours là : le pourtour EST une silhouette. Le détail, à
  // moins de 70 m (haute), y ajoute les voitures garées, le parking, la grille et les fers du pavillon des Indes)
  morceaux: [
    ...ORDRE.map((id) => ({ id, nom: PARTS[id].nom, boite: PARTS[id].boite,
      construire: (ctx) => construirePart(ctx, id, true), silhouette: (ctx) => construirePart(ctx, id, false) })),
    { id: 'Z20f', nom: 'pavillon des Indes et son enclos', boite: [-131, 153, -104, 186],
      construire: (ctx) => pavillonDesIndes(ctx, true), silhouette: pavillonSilhouette },
    // (l'île et l'horizon ne sont jamais à moins de 125 m : leur silhouette est tout ce qu'on en voit)
    { id: 'Z20h', nom: 'île de la Jatte : immeubles et peupliers', boite: [180, -340, 280, 480], construire: ile, silhouette: ile },
    { id: 'Z20i', nom: 'horizon : La Défense, tour Eiffel, Montparnasse, pont de Courbevoie', boite: [4000, -2000, 8000, 2600], construire: horizon, silhouette: horizon },
  ],
  // Rien à déclarer : tout est hors de l'enceinte (grilles et portillons fermés de monde.json), et les bâtiments de la
  // grille ont déjà leur boîte dans monde.json (batiments_depuis_mns).
  obstacles() {},
};
