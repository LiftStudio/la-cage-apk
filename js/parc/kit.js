// =====================================================================
//  LE KIT DU PARC : les pièces communes à toutes les zones du parc de Bécon
// =====================================================================
// Le parc entier (conception, § 3.1 et lot A8) est construit zone par zone, chacune dans son fichier
// (js/parc/zones/zNN_*.js). Ce qui revient partout — un mur de calcaire, une volée de marches, une allée, une
// balustrade de fer forgé, une grille à barreaux, un portail, une lanterne, un banc, une corbeille, une haie taillée,
// un buis, un if, un massif de fleurs, une bordure, l'eau d'un bassin — est dessiné UNE fois, ici, avec ses matériaux.
// Une zone ne fait qu'assembler ces pièces, paramétrées par ses données (tools/parc/gabarits.json, monde.json).
//
// LES RÈGLES DU KIT
//  - LE REPÈRE est celui du TERRAIN 1, comme toutes les données du monde (monde.json, gabarits.json) : x+ vers la
//    Seine, z+ vers le pin, y vers le haut. Le kit ajoute lui-même `Monde.dx` (le décalage de 16,1 m de parc2) aux
//    MAILLAGES qu'il rend, jamais aux groupes : un groupe du kit reste à l'origine, si bien que la fusion du décor
//    (optimiserDecor, js/court.js, qui recopie les blocs fondus à la racine du groupe qu'on lui donne) ne décale rien.
//  - TOUTE HAUTEUR vient de `Monde.sol` (conception, § 3.3, règle 2) : `poserSurSol(obj, x, z, dy)` pour un objet,
//    et chaque pièce qui suit le sol (allée, muret, haie, bordure) échantillonne le sol elle-même. Monde à plat (les
//    autres terrains, la page de démonstration) : le sol est à 0.
//  - DÉTERMINISTE : aucun Math.random. Le « naturel » (teinte d'une pierre, bosse d'une haie, touffe de fleurs) vient
//    de `alea(x, z, k)`, le hasard déterministe du parc (le même que js/court_parc.js), et de `bruit(x, z)` qui le
//    lisse. Deux joueurs voient le même mur, pierre pour pierre.
//  - PEU D'APPELS DE DESSIN. Chaque pièce rend un THREE.Group d'UN ou DEUX maillages, un par matériau, déjà fondus
//    (voir `Lot`). Les matériaux sont PARTAGÉS (un seul « calcaire taillé » pour tout le parc) et ORDINAIRES
//    (MeshStandardMaterial, sans onBeforeCompile) : optimiserDecor, appelé sur le groupe d'un morceau, fond donc
//    les vingt bancs d'un morceau en deux blocs, bois et peinture. Seule exception : l'eau, animée, marquée
//    `dynamique` et `nofuse` (comme le demande la règle 5 de la conception : ne pas refaire le bug des passants).
//  - TOUT PORTE DES COULEURS DE SOMMETS. Elles font la patine, à l'échelle du mur entier (pied verdi, coulures sous
//    le couronnement, taches lentes), l'usure (le milieu des marches, poli et plus clair) et la PEINTURE : le fer
//    forgé, la fonte, les menuiseries, les vitres et la corbeille partagent un seul matériau (« peinture ») dont la
//    texture est blanche ; c'est la couleur du sommet qui dit noir, vert bouteille ou crème. Toutes les géométries
//    du kit ont donc les mêmes attributs (position, normal, uv, color) et un index : la fusion les coud ensemble.
//  - LES TEXTURES sont des photos CC0 (Poly Haven) préparées par tools/parc/textures_kit.py, et des textures
//    dessinées par le même outil (peinture, feuillage, fleurs, eau) : assets/parc/kit/, crédits dans
//    tools/credits_kit.md. Plus les photos déjà servies au parc (assets/parc/tex : enrobé, gravier, dalles, gazon,
//    terre, meulière). PC : 1024, ou 512 pour les matières à petite tuile ou vues de loin, et pour les cartes arm
//    (voir MATIERES : 151 Mo de mémoire vidéo pour le kit entier, toutes matières chargées) ; téléphone : 512
//    (67 Mo). Les UV sont en TUILES (mètres divisés par la taille réelle de la photo, `TUILES`) : une pierre fait
//    partout sa vraie taille. Un matériau est utilisable tout de suite : il porte une texture neutre d'un texel, la
//    sienne (voir neutre), remplacée quand la vraie arrive (pas de flash noir, pas de recompilation).
//
// CE QUE LE KIT OFFRE (les paramètres de chaque pièce sont décrits au-dessus de sa fonction) :
//   murPierre, escalier, ruban, balustradeFerForge, grilleBarreaux, portail, lampadaire, banc, poubelle,
//   haieTaillee, bouleBuis, ifConique, massifFleurs, bordure, eauBassin, poserSurSol
//   materiau(nom), MATERIAUX, TUILES, TEINTES, alea, bruit, sol, hauteurLe (une hauteur qui suit un profil : le haut
//   d'un mur, le pied d'une balustrade), Lot (pour une zone qui dessine ses propres pièces avec les matériaux du
//   kit), fusionner(groupe), allumer(f) (les lanternes, la nuit), demoKit(game)
//
// COÛT (mesuré sur la page de démonstration, ?debug=1&kit=1 : voir demoKit tout en bas) : chaque pièce fait 1 ou 2
// appels de dessin après fusion (un mur percé de fenêtres : 3, sa menuiserie est de la peinture). Construction sur
// PC (relecture du lot A8, médiane de 9) : portail 156 6 ms, escalier de 16 marches à limons et rampes 7 ms, volée
// de 31 marches du belvédère 9 ms, mur de 12 m à quatre baies 9 ms, balustrade de 12 m 4 ms ; bancs, candélabres,
// buis, ifs : moins d'un dixième (géométrie partagée). Une pièce ne rend pas la main en cours de route : une zone
// construit ses morceaux en tranches (générateurs, conception § 3.5) et rend la main ENTRE deux pièces ; sur
// téléphone (trois à quatre fois plus lent), elle coupe les longues pièces (balustrade, mur, volée) en tronçons de
// quelques mètres pour tenir l'à-coup de 16 ms.
// (Lot C6) Sauf les longues pièces, qui ont maintenant leur version EN TRANCHES, un générateur qui rend la main en
// cours de route quand on lui passe `ctx.budget` : escalierPas, balustradePas, grillePas, murPierrePas, et
// fusionnerPas pour la fusion d'un morceau — `groupe.add(yield* kit.escalierPas(o, ctx.budget))`. Et la ferronnerie
// (volutes, pointes de lance, anneaux, pommeaux, barreaux de rampe) et les bordures sont faites en DEUX NIVEAUX :
// voir Lot.maillages (« #fin », « #loin ») et js/monde_vue.js (7).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Monde } from '../monde.js';
import { TELEPHONE } from '../appareil.js';

// ============================================================================================ réglages, hasard
export const MOBILE = TELEPHONE;   // js/appareil.js : la même détection pour tout le jeu (et `?tel=1`)
// Sur téléphone, les courbes (volutes, lanternes, topiaires) ont 60 % de leurs segments.
const QUALITE = MOBILE ? 0.6 : 1;
const segs = (n, min = 3) => Math.max(min, Math.round(n * QUALITE));

// Le hasard déterministe du parc : même formule que js/court_parc.js (alea). Rend un nombre de [0, 1[.
export function alea(x, z, k = 0) {
  const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
  return s - Math.floor(s);
}
// Le même, lissé : un bruit de valeur sur une grille de pas 1 (on l'appelle avec x / taille). Rend [0, 1].
export function bruit(x, z, k = 0) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = alea(i, j, k), b = alea(i + 1, j, k), c = alea(i, j + 1, k), d = alea(i + 1, j + 1, k);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
// En trois dimensions (les bosses d'une haie, d'un buis) : deux plans de bruit croisés.
function bruit3(x, y, z, k = 0) {
  return 0.5 * (bruit(x + 0.37 * y, z - 0.61 * y, k) + bruit(z + 0.53 * y + 17.1, x - 0.29 * y + 5.3, k + 1));
}
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const borne = (x, a, b) => (x < a ? a : x > b ? b : x);

// Le sol sous (x, z), repère du terrain 1 (Monde.sol attend le monde AFFICHÉ : on lui rend son décalage).
export function sol(x, z) { return Monde.sol(x + Monde.dx, z); }
// Pose un objet sur le sol : (x, z) dans le repère du terrain 1, `dy` au-dessus du sol. Rend l'objet.
export function poserSurSol(obj, x, z, dy = 0) {
  obj.position.set(x + Monde.dx, sol(x, z) + dy, z);
  return obj;
}

// ============================================================================================ couleurs
// Une couleur sRGB (#rrggbb) en valeurs LINÉAIRES, comme les attend l'attribut `color` des sommets.
export function lin(hex) { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; }
// Les peintures et les teintes relevées sur les photos (documentation, § 9 ; photos du plateau du 26/09, j1 à j6).
// Pour le matériau « peinture », c'est LA couleur de l'objet ; pour « feuillage », un multiplicateur de la texture.
export const TEINTES = {
  blanc: [1, 1, 1],
  fer: lin('#1c1c1c'),            // fer forgé noir : grilles, balustrades, rampes, lanternes
  fonte: lin('#222423'),          // fonte des bancs et des candélabres, un peu moins noire
  vertBanc: lin('#2c4b38'),       // lattes des bancs verts (photos 1000051341, 10)
  vertFonte: lin('#1f2d24'),      // flasques des bancs Davioud
  vertCorbeille: lin('#2f4d37'),
  creme: lin('#e2dbc8'),          // menuiseries des fenêtres du mur des caves (photo j3)
  vitre: lin('#1f282c'),          // une vitre vue du dehors, de jour
  noir: lin('#08090a'),           // le fond d'un soupirail
  acier: lin('#72767a'),          // candélabre moderne
  corten: lin('#6a3c22'),         // bordure d'acier des allées
  rougeMusee: lin('#8a2a22'), vertMusee: lin('#3a5a3c'), bleuMusee: lin('#3c5a78'), jauneMusee: lin('#c99b3c'),
  // feuillages taillés (multiplicateurs de la texture de feuilles)
  buis: [1.0, 1.02, 0.78], if: [0.5, 0.66, 0.56], troene: [0.86, 0.96, 0.78], charmille: [0.98, 1.0, 0.7],
  haie: [0.66, 0.76, 0.62],       // la haie sombre du belvédère (photo j5)
  conifere: [0.48, 0.66, 0.5],    // le conifère en port libre du théâtre (vert sombre #2f4a2c, R5-T01 ; coniferLibre)
};
const BLANC = TEINTES.blanc;

// ============================================================================================ textures, matériaux
const KIT = 'assets/parc/kit/', TEX = 'assets/parc/tex/';
// Les matières du kit. `k` : texture de assets/parc/kit (couleur, normale, arm = occlusion / rugosité / métal) ;
// `t` : photo de assets/parc/tex (couleur, normale, rugosite), recolorée par `cible` (sa `moyenne` linéaire, mesurée
// par l'outil, est ramenée à la couleur du parc) ; `tuile` : côté réel de la texture (m) ; `rugo` : facteur de
// rugosité ; `ombre` : porte ombre ; `sol` : matière d'allée (reçoit l'ombre, n'en porte pas).
// `pc: 512` : la matière est chargée en 512 sur PC aussi. MÉMOIRE VIDÉO : une image de 1024 coûte 5,3 Mo sur la
// carte (RGBA et mipmaps), une de 2048, 21 Mo ; le kit entier, tout en 1024 (moellons en 2048), en prenait 291 sur
// PC, plus que les 250 Mo que la conception (§ 3.6, préréglage high) accorde à TOUT le parc. En 512 sur PC : les
// matières à petite tuile, où 512 px font déjà plus de 500 px par mètre (bois 0,6 m, brique 1 m), l'ardoise des
// toits (vue de loin), et les photos de assets/parc/tex que js/surfaces_parc.js charge déjà en 512 sur PC (herbe,
// gravier, dalles, terre : même fichier, téléchargé une fois). Les arm sont toujours en 512 (voir materiau).
const MATIERES = {
  moellons: { k: 'moellons', tuile: 1.52, ombre: true },
  taille: { k: 'taille', tuile: 2.0, ombre: true },
  brique: { k: 'brique', tuile: 1.0, ombre: true, pc: 512 },
  ardoise: { k: 'ardoise', tuile: 3.0, ombre: true, pc: 512 },
  bois: { k: 'bois', tuile: 0.6, ombre: true, pc: 512 },
  beton: { k: 'beton', tuile: 2.0, ombre: true },
  terreBattue: { k: 'terre_battue', tuile: 3.0, sol: true },
  peinture: { k: 'peinture', tuile: 1.0, ombre: true, normale: 0.6 },
  feuillage: { k: 'feuillage', tuile: 0.8, ombre: true, normale: 1.2 },
  meuliere: { t: 'mur_pierre_jaune', tuile: 2.0, moyenne: [0.4358, 0.3145, 0.1909], cible: '#b9a483', ombre: true },
  asphalte: { t: 'asphalte', tuile: 4.04, moyenne: [0.239, 0.2235, 0.2126], cible: '#8e8a85', sol: true },
  asphalteRouge: { t: 'asphalte', tuile: 4.04, moyenne: [0.239, 0.2235, 0.2126], cible: '#a97c74', sol: true },
  gravier: { t: 'gravier', tuile: 0.7, moyenne: [0.6146, 0.5256, 0.3589], cible: '#cbc2af', sol: true, pc: 512 },
  stabilise: { t: 'gravier', tuile: 0.7, moyenne: [0.6146, 0.5256, 0.3589], cible: '#c8ad98', sol: true, pc: 512 },
  dalles: { t: 'dalles_beton', tuile: 1.8, moyenne: [0.243, 0.2016, 0.1624], cible: '#cac4b8', sol: true, pc: 512 },
  dallesSombres: { t: 'dalles_beton', tuile: 1.8, moyenne: [0.243, 0.2016, 0.1624], cible: '#7d7874', sol: true, pc: 512 },
  gazon: { t: 'herbe', tuile: 1.2, moyenne: [0.1257, 0.1601, 0.0347], cible: '#6f8a45', rugo: 3.4, sol: true, pc: 512 },
  terre: { t: 'sol_foret', tuile: 2.0, moyenne: [0.3484, 0.2262, 0.14], cible: '#4a3a2b', sol: true, pc: 512 },
  // LES VARIANTES (relecture R2). La brique du kit est un MUR DE BRIQUES ROUGE VIF aux joints clairs (#944535 en
  // moyenne), son béton un béton LAVÉ À GROS GRAVILLONS : ni l'une ni l'autre ne vont partout. Les zones les tordaient
  // à coups de couleurs de sommet — la brique rose du terre-plein des caves multipliée par [0,9 ; 2,4 ; 2,55] (Z06),
  // les piliers de la fontaine (Z14) — et le béton à gravillons servait aussi de dessus de table de ping-pong, de
  // couvertine, de sol de jeux peint (Z14, Z16), où l'on attend une surface lisse. Deux matières de plus, tirées des
  // MÊMES images au chargement (`derive` : rien de nouveau à télécharger, aucune texture recuite), avec les mêmes
  // normales, la même carte arm et le même tuilage ; `brique` et `beton` ne changent pas, les zones qui s'en servent
  // non plus :
  //  - briquePassee : la brique désaturée de 58 % et éclaircie, rose-brun (#9a6e64 en moyenne), joints de chaux
  //    presque blancs : la brique de sol et des piliers anciens, que le temps a passée (photos j1, Z14 de SYNTHESE) ;
  //  - betonLisse : le béton sans ses gravillons (l'image réduite au douzième puis agrandie : il en reste les nuances
  //    lentes, de 10 à 30 cm), son relief à 35 % : béton coulé, plateaux, couvertines, sols peints.
  briquePassee: { k: 'brique', tuile: 1.0, ombre: true, pc: 512, derive: 'passee' },
  betonLisse: { k: 'beton', tuile: 2.0, ombre: true, normale: 0.35, derive: 'lisse' },
};
// Côté réel d'une tuile de texture, par matériau (m) : les UV du kit sont des mètres divisés par ce nombre.
export const TUILES = Object.fromEntries(Object.entries(MATIERES).map(([k, d]) => [k, d.tuile]));
TUILES.frange = 1; TUILES.verre = 1; TUILES.eau = 3;
for (const p of ['tulipes', 'rouge', 'vivaces']) TUILES['fleurs_' + p] = 1;
export const MATERIAUX = [...Object.keys(MATIERES), 'verre', 'frange', 'fleurs_tulipes', 'fleurs_rouge', 'fleurs_vivaces', 'eau'];
// Les noms des données du monde (tools/parc/gabarits.json : « surface », « materiau ») vers ceux du kit : une zone
// passe la surface d'un gabarit telle quelle à ruban() ou escalier().
const ALIAS = {
  asphalte_rouge: 'asphalteRouge', enrobe: 'asphalte', chaussee: 'asphalte', gravier_blanc: 'gravier', beton_clair: 'beton',
  terre_battue: 'terreBattue', dalles_sombres: 'dallesSombres', trottoir: 'beton', herbe: 'gazon', massif: 'terre',
  calcaire: 'taille', meulière: 'meuliere', béton: 'beton', brique_passee: 'briquePassee', beton_lisse: 'betonLisse',
};
export function nomMatiere(n) { return ALIAS[n] || n; }

// Filtrage anisotrope : réglé sur la carte graphique par `reglerRendu(renderer)` (appelé par la zone ou la démo).
let ANISO = MOBILE ? 4 : 8;
export function reglerRendu(renderer) {
  if (renderer && renderer.capabilities) ANISO = Math.min(MOBILE ? 4 : 8, renderer.capabilities.getMaxAnisotropy());
}
// Texture neutre d'un texel, le temps que la vraie arrive (le shader tourne tout de suite, sans flash noir).
// UNE PAR MATÉRIAU (`pour`), jamais partagée entre deux matériaux. optimiserDecor (js/court.js), appelé sur le groupe
// d'un morceau, commence par dedupliquerMateriaux, qui fond en un seul les matériaux de mêmes réglages et de mêmes
// textures (comparées par leur uuid). Avec une neutre commune, tous les matériaux photo du kit (moellons, taille,
// peinture, bois, feuillage...) avaient la même signature tant que leurs photos n'étaient pas arrivées, ce qui est
// le cas des premiers morceaux construits : relecture du lot A8, un morceau de mur, banc, buis, massif et escalier
// passait de 8 matériaux à 3, et tout sortait en moellons.
const _neutres = new Map();
function neutre(r, g, b, srgb = false, pour = '') {
  const cle = `${r},${g},${b},${srgb},${pour}`;
  let t = _neutres.get(cle);
  if (!t) {
    t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true; _neutres.set(cle, t);
  }
  return t;
}
// Chargement partagé : une adresse = une texture, quel que soit le nombre de matériaux qui la lisent.
const _textures = new Map();
function charger(url, srgb) {
  let p = _textures.get(url);
  if (!p) {
    p = new Promise((ok) => new THREE.TextureLoader().load(url, (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      ok(t);
    }, undefined, () => { console.warn('[kit] texture non chargée : ' + url); ok(null); }));
    _textures.set(url, p);
  }
  return p;
}
// Pose `url` dans les emplacements `slots` du matériau (la neutre d'abord, la vraie à l'arrivée). Changer la texture
// d'un emplacement déjà occupé ne recompile rien : le shader reste le même.
// `derive` (relecture R2, voir les variantes de MATIERES) : l'image couleur est retravaillée une fois, dans un canevas,
// à son arrivée ; la texture rendue est à part (son propre uuid : la fusion du décor ne la confond pas avec l'originale).
function poser(mat, slots, url, srgb, tNeutre, derive = null) {
  for (const s of slots) mat[s] = tNeutre;
  (derive ? deriver(url, derive) : charger(url, srgb)).then((t) => { if (t) for (const s of slots) mat[s] = t; });
}
const _derives = new Map();
function deriver(url, mode) {
  const cle = url + '#' + mode;
  let p = _derives.get(cle);
  if (!p) {
    p = charger(url, true).then((t) => {
      const im = t && t.image;
      if (!im || typeof document === 'undefined') return t;
      const W = im.width, H = im.height, c = document.createElement('canvas'), g = c.getContext('2d');
      if (mode === 'lisse') {
        // le flou SANS COUTURE : l'image posée en 3 x 3 dans un canevas au douzième, dont on agrandit le carré du milieu
        // (ses bords lisent les copies voisines : la tuile se raccorde) ; 256 px suffisent à ce qui reste
        const w = Math.max(8, Math.round(W / 12)), h = Math.max(8, Math.round(H / 12)), s = document.createElement('canvas');
        s.width = 3 * w; s.height = 3 * h;
        const gs = s.getContext('2d'); gs.imageSmoothingEnabled = true; gs.imageSmoothingQuality = 'high';
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) gs.drawImage(im, i * w, j * h, w, h);
        c.width = Math.min(W, 256); c.height = Math.min(H, 256);
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        g.drawImage(s, w, h, w, h, 0, 0, c.width, c.height);
      } else {
        // 'passee' : désaturée (42 % de la couleur gardés autour de la luminance), éclaircie d'un tiers, un rien plus
        // rose que rouge
        c.width = W; c.height = H; g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, W, H), a = d.data;
        for (let i = 0; i < a.length; i += 4) {
          const L = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2];
          a[i] = (L + (a[i] - L) * 0.42) * 1.3 + 4; a[i + 1] = (L + (a[i + 1] - L) * 0.42) * 1.3 + 4; a[i + 2] = (L + (a[i + 2] - L) * 0.42) * 1.28 + 4;
        }
        g.putImageData(d, 0, 0);
      }
      const n = new THREE.CanvasTexture(c);
      n.wrapS = n.wrapT = THREE.RepeatWrapping; n.anisotropy = ANISO; n.colorSpace = THREE.SRGBColorSpace;
      n.name = 'kit · ' + mode;
      return n;
    });
    _derives.set(cle, p);
  }
  return p;
}
// Les textures du kit à précharger (une zone peut attendre `precharger()` avant son premier morceau).
export function precharger(noms = MATERIAUX) { for (const n of noms) materiau(n); return Promise.all([..._textures.values()]); }

const _mats = new Map();
// Le matériau partagé `nom` (voir MATIERES et MATERIAUX). Créé à la première demande, puis toujours le même.
export function materiau(nom) {
  nom = nomMatiere(nom);
  let m = _mats.get(nom);
  if (m) return m;
  const D = MATIERES[nom];
  if (D) {
    m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: D.rugo || 1, metalness: 0, vertexColors: true });
    // (téléphone, ou matière en 512 sur PC aussi : voir `pc` dans MATIERES)
    const petit = MOBILE || D.pc === 512;
    if (D.k) {
      const suf = petit ? '_512.webp' : '.webp', b = KIT + D.k + '_';
      poser(m, ['map'], b + 'couleur' + suf, true, neutre(200, 190, 175, true, nom), D.derive || null);
      poser(m, ['normalMap'], b + 'normale' + suf, false, neutre(128, 128, 255, false, nom));
      // la carte arm (occlusion, rugosité, métal) : des variations lentes, en 512 partout
      poser(m, ['aoMap', 'roughnessMap', 'metalnessMap'], b + 'arm_512.webp', false, neutre(255, 200, 0, false, nom));
      m.aoMapIntensity = 1; m.metalness = 1;          // (c'est le bleu de la carte arm qui décide : 0 partout sauf le bronze)
    } else {
      const suf = petit ? '_512.jpg' : '.jpg', b = TEX + D.t + '_';
      poser(m, ['map'], b + 'couleur' + suf, true, neutre(128, 128, 128, true, nom));
      poser(m, ['normalMap'], b + 'normale' + suf, false, neutre(128, 128, 255, false, nom));
      poser(m, ['roughnessMap'], b + 'rugosite' + suf, false, neutre(230, 230, 230, false, nom));
      const c = lin(D.cible);
      m.color.setRGB(c[0] / D.moyenne[0], c[1] / D.moyenne[1], c[2] / D.moyenne[2]);
    }
    const f = D.normale || 1; m.normalScale.set(f, f);
  } else if (nom === 'verre') {
    // le verre dépoli des lanternes : blanc laiteux ; `allumer()` le fait briller la nuit
    m = new THREE.MeshStandardMaterial({ color: 0xf0ede4, roughness: 0.3, metalness: 0, vertexColors: true,
      emissive: 0xffc98a, emissiveIntensity: 0 });
  } else if (nom === 'frange' || nom.startsWith('fleurs_')) {
    // cartes détourées : rameaux des topiaires, touffes de fleurs. alphaTest (pas de transparence) : elles se fondent
    // et se trient comme le reste ; js/fx.js les retire de la passe de normales de l'occlusion (map + alphaTest).
    m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0, vertexColors: true,
      alphaTest: 0.45, side: THREE.DoubleSide });
    // (la frange n'existe qu'en 512 : quatre touffes de 256 px, on ne la voit jamais de plus près)
    const suf = MOBILE || nom === 'frange' ? '_512.webp' : '.webp';
    poser(m, ['map'], KIT + nom + suf, true, neutre(90, 120, 60, true, nom));
  } else if (nom.startsWith('eau')) {
    return eauMateriau(nom);
  } else {
    throw new Error('[kit] matériau inconnu : ' + nom);
  }
  m.name = 'kit · ' + nom;
  m.userData.kit = nom;
  _mats.set(nom, m);
  return m;
}
// Les lanternes s'allument (0 = éteintes, le jour ; 1 = la nuit).
export function allumer(f = 1) { materiau('verre').emissiveIntensity = 1.6 * f; }
const ombreDe = (cle) => { const D = MATIERES[cle]; return D ? !!D.ombre : cle === 'verre'; };

// ============================================================================================ LE LOT : géométrie par matériau
// Un Lot accumule des triangles PAR MATÉRIAU dans des tableaux qui grandissent (pas un objet three par pièce), puis
// rend un maillage par matériau : une pièce du kit est ainsi, dès sa construction, un ou deux maillages. Tous les
// sommets ont position, normale, uv et couleur (la fusion du décor ne coud que des géométries aux mêmes attributs).
// Les triangles sont ORIENTÉS AUTOMATIQUEMENT d'après la normale des sommets (voir tri) : un générateur n'a pas à se
// soucier du sens de parcours, seulement des normales.
class Tab {
  constructor(T = Float32Array, n = 2048) { this.T = T; this.a = new T(n); this.l = 0; }
  place(k) {
    if (this.l + k <= this.a.length) return;
    const b = new this.T(Math.max(this.a.length * 2, this.l + k)); b.set(this.a); this.a = b;
  }
  fin() { return this.a.slice(0, this.l); }
}
class Part {
  constructor() { this.pos = new Tab(); this.nor = new Tab(); this.uv = new Tab(); this.col = new Tab(); this.idx = new Tab(Uint32Array); this.n = 0; }
}
const _m3 = new THREE.Matrix3();

export class Lot {
  constructor(nom = 'kit') { this.nom = nom; this.parts = new Map(); }
  part(cle) {
    let p = this.parts.get(cle);
    if (!p) { materiau(cle.split('#')[0]); p = new Part(); this.parts.set(cle, p); }
    return p;
  }
  // un sommet ; `c` : couleur linéaire [r, g, b]
  s(p, x, y, z, nx, ny, nz, u, v, c) {
    const P = p.pos, N = p.nor, U = p.uv, C = p.col;
    P.place(3); N.place(3); U.place(2); C.place(3);
    P.a[P.l++] = x; P.a[P.l++] = y; P.a[P.l++] = z;
    N.a[N.l++] = nx; N.a[N.l++] = ny; N.a[N.l++] = nz;
    U.a[U.l++] = u; U.a[U.l++] = v;
    C.a[C.l++] = c[0]; C.a[C.l++] = c[1]; C.a[C.l++] = c[2];
    return p.n++;
  }
  // Un triangle, tourné pour que sa face avant regarde du côté de la normale de ses sommets.
  tri(p, a, b, c) {
    const P = p.pos.a, N = p.nor.a;
    const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2];
    const ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az;
    const vx = P[c * 3] - ax, vy = P[c * 3 + 1] - ay, vz = P[c * 3 + 2] - az;
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * cx + cy * cy + cz * cz < 1e-18) return;               // triangle plat : rien
    const nx = N[a * 3] + N[b * 3] + N[c * 3], ny = N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1], nz = N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2];
    const I = p.idx; I.place(3);
    I.a[I.l++] = a;
    if (cx * nx + cy * ny + cz * nz >= 0) { I.a[I.l++] = b; I.a[I.l++] = c; } else { I.a[I.l++] = c; I.a[I.l++] = b; }
  }
  quad(p, a, b, c, d) { this.tri(p, a, b, c); this.tri(p, a, c, d); }

  // Recopie une géométrie three (indexée ou non) transformée par `m4`. `o.couleur` : [r, g, b] ou fonction
  // (x, y, z, nx, ny, nz) -> [r, g, b] (coordonnées monde) ; `o.uv` : fonction (u, v, x, y, z, nx, ny, nz, out) ;
  // `o.uvBoite` : UV recalculées par projection sur la face dominante, en tuiles de `o.tuile` m (coordonnées LOCALES
  // de la géométrie, pour qu'une pierre tournée garde sa texture) ; `o.bande` : UV ramenées dans la bande de la
  // peinture (u de 0,06 à 0,44).
  geo(cle, g, m4 = null, o = {}) {
    // (boucle écrite à la main, sans objet intermédiaire : c'est par ici que passent les milliers de motifs d'une
    // balustrade ; ~40 ns par sommet au lieu de ~600 avec Vector3 et getX)
    const p = this.part(cle), P = g.attributes.position.array, N = g.attributes.normal ? g.attributes.normal.array : null;
    const UV = g.attributes.uv ? g.attributes.uv.array : null, n = g.attributes.position.count;
    const base = p.n, col = o.couleur || BLANC, fn = typeof col === 'function', tuile = o.tuile || TUILES[cle.split('#')[0]] || 1;
    const e = m4 ? m4.elements : null;
    let a0 = 1, a1 = 0, a2 = 0, a3 = 0, a4 = 1, a5 = 0, a6 = 0, a7 = 0, a8 = 1;
    if (m4) { const q = _m3.getNormalMatrix(m4).elements; a0 = q[0]; a1 = q[1]; a2 = q[2]; a3 = q[3]; a4 = q[4]; a5 = q[5]; a6 = q[6]; a7 = q[7]; a8 = q[8]; }
    const PO = p.pos, NO = p.nor, UO = p.uv, CO = p.col;
    PO.place(3 * n); NO.place(3 * n); UO.place(2 * n); CO.place(3 * n);
    const pa = PO.a, na = NO.a, ua = UO.a, ca = CO.a, uvo = [0, 0], dec = o.uvDecal;
    for (let i = 0; i < n; i++) {
      const lx = P[i * 3], ly = P[i * 3 + 1], lz = P[i * 3 + 2];
      let x = lx, y = ly, z = lz;
      if (e) { x = e[0] * lx + e[4] * ly + e[8] * lz + e[12]; y = e[1] * lx + e[5] * ly + e[9] * lz + e[13]; z = e[2] * lx + e[6] * ly + e[10] * lz + e[14]; }
      let nx = 0, ny = 1, nz = 0, lnx = 0, lny = 1, lnz = 0;
      if (N) {
        lnx = N[i * 3]; lny = N[i * 3 + 1]; lnz = N[i * 3 + 2];
        nx = a0 * lnx + a3 * lny + a6 * lnz; ny = a1 * lnx + a4 * lny + a7 * lnz; nz = a2 * lnx + a5 * lny + a8 * lnz;
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l;
      }
      let u = UV ? UV[i * 2] : 0, v = UV ? UV[i * 2 + 1] : 0;
      if (o.uvBoite) {
        const ax = Math.abs(lnx), ay = Math.abs(lny), az = Math.abs(lnz);
        if (ax >= ay && ax >= az) { u = lz / tuile; v = ly / tuile; } else if (ay >= az) { u = lx / tuile; v = lz / tuile; } else { u = lx / tuile; v = ly / tuile; }
        if (dec) { u += dec[0]; v += dec[1]; }
      } else if (o.bande) { u = 0.06 + 0.38 * (u - Math.floor(u)); }
      if (o.uv) { o.uv(u, v, x, y, z, nx, ny, nz, uvo); u = uvo[0]; v = uvo[1]; }
      const c = fn ? col(x, y, z, nx, ny, nz) : col;
      pa[PO.l++] = x; pa[PO.l++] = y; pa[PO.l++] = z;
      na[NO.l++] = nx; na[NO.l++] = ny; na[NO.l++] = nz;
      ua[UO.l++] = u; ua[UO.l++] = v;
      ca[CO.l++] = c[0]; ca[CO.l++] = c[1]; ca[CO.l++] = c[2];
    }
    p.n += n;
    const inverse = m4 && m4.determinant() < 0, I = p.idx;
    if (g.index) {
      const X = g.index.array, m = g.index.count;
      I.place(m);
      for (let i = 0; i < m; i += 3) {
        I.a[I.l++] = base + X[i];
        if (inverse) { I.a[I.l++] = base + X[i + 2]; I.a[I.l++] = base + X[i + 1]; } else { I.a[I.l++] = base + X[i + 1]; I.a[I.l++] = base + X[i + 2]; }
      }
    } else {
      I.place(n);
      for (let i = 0; i < n; i += 3) { I.a[I.l++] = base + i; if (inverse) { I.a[I.l++] = base + i + 2; I.a[I.l++] = base + i + 1; } else { I.a[I.l++] = base + i + 1; I.a[I.l++] = base + i + 2; } }
    }
    return this;
  }

  // Un polygone plan (points 3D dans l'ordre, coplanaires), normale `n` ; UV : fonction (x, y, z, out) ou
  // projection sur la face dominante en tuiles.
  polygone(cle, pts, n, o = {}) {
    const p = this.part(cle), tuile = o.tuile || TUILES[cle.split('#')[0]] || 1, col = o.couleur || BLANC, fn = typeof col === 'function';
    const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
    const i0 = ax >= ay && ax >= az ? 2 : ay >= az ? 0 : 0, i1 = ax >= ay && ax >= az ? 1 : ay >= az ? 2 : 1;
    const tris = o.tris || trianguler(pts.map((q) => [q[i0], q[i1]]));
    const base = p.n, uvo = [0, 0];
    for (const q of pts) {
      let u = q[i0] / tuile, v = q[i1] / tuile;
      if (o.uv) { o.uv(q[0], q[1], q[2], uvo); u = uvo[0]; v = uvo[1]; }
      this.s(p, q[0], q[1], q[2], n[0], n[1], n[2], u, v, fn ? col(q[0], q[1], q[2], n[0], n[1], n[2]) : col);
    }
    for (const t of tris) this.tri(p, base + t[0], base + t[1], base + t[2]);
    return this;
  }

  // BALAYAGE d'un profil 2D le long d'un chemin 3D (lisses, mains courantes, chaperons, barreaux, volutes, haies).
  //  profil : [[x, y], ...] dans le repère (S, U) du chemin : S à DROITE du sens de marche, U vers le haut, tourné
  //           dans le sens trigonométrique (la normale sortante d'une arête (dx, dy) est (dy, -dx)).
  //  chemin : [[x, y, z], ...].
  //  o.ferme (vrai) : profil fermé ; o.lisse : normales moyennées d'une arête à l'autre (sinon arêtes vives) ;
  //  o.vertical : S et U tirés de la tangente HORIZONTALE et de la verticale (les faces verticales restent
  //    d'aplomb quand le chemin monte : murets, haies, bordures) ; sinon o.haut ([0, 1, 0]) sert de référence ;
  //  o.echelles : facteur par point du chemin, appliqué autour du centre du profil (chanfreins de bout de bloc) ;
  //  o.bouts : fermer les deux extrémités (profil fermé) ; o.tuile, o.uDecal, o.vDecal ; o.bande (peinture) ;
  //  o.couleur : [r, g, b] ou fonction (x, y, z, nx, ny, nz).
  prisme(cle, profil, chemin, o = {}) {
    const p = this.part(cle), nP = profil.length, nC = chemin.length;
    if (nC < 2 || nP < 2) return this;
    const ferme = o.ferme !== false, tuile = o.tuile || TUILES[cle.split('#')[0]] || 1;
    const col = o.couleur || BLANC, fn = typeof col === 'function', haut = o.haut || [0, 1, 0];
    // les repères le long du chemin
    const F = [];
    let longueur = 0, Sp = null;
    for (let j = 0; j < nC; j++) {
      const P = chemin[j], A = chemin[Math.max(0, j - 1)], B = chemin[Math.min(nC - 1, j + 1)];
      let tx, ty, tz;
      if (j > 0 && j < nC - 1) {
        const l1 = Math.hypot(P[0] - A[0], P[1] - A[1], P[2] - A[2]) || 1, l2 = Math.hypot(B[0] - P[0], B[1] - P[1], B[2] - P[2]) || 1;
        tx = (P[0] - A[0]) / l1 + (B[0] - P[0]) / l2; ty = (P[1] - A[1]) / l1 + (B[1] - P[1]) / l2; tz = (P[2] - A[2]) / l1 + (B[2] - P[2]) / l2;
      } else { tx = B[0] - A[0]; ty = B[1] - A[1]; tz = B[2] - A[2]; }
      let Sx, Sy, Sz, Ux, Uy, Uz;
      if (o.vertical) {
        const lh = Math.hypot(tx, tz) || 1;
        Sx = -tz / lh; Sy = 0; Sz = tx / lh; Ux = 0; Uy = 1; Uz = 0;
      } else {
        const lt = Math.hypot(tx, ty, tz) || 1; tx /= lt; ty /= lt; tz /= lt;
        Sx = ty * haut[2] - tz * haut[1]; Sy = tz * haut[0] - tx * haut[2]; Sz = tx * haut[1] - ty * haut[0];
        let ls = Math.hypot(Sx, Sy, Sz);
        if (ls < 1e-6) { if (Sp) { [Sx, Sy, Sz] = Sp; ls = 1; } else { Sx = 1; Sy = 0; Sz = 0; ls = 1; } }
        Sx /= ls; Sy /= ls; Sz /= ls;
        Ux = Sy * tz - Sz * ty; Uy = Sz * tx - Sx * tz; Uz = Sx * ty - Sy * tx;
      }
      Sp = [Sx, Sy, Sz];
      // onglet : aux coudes, la section s'élargit pour garder son épaisseur (1 / cos du demi-angle)
      let m = 1;
      if (o.onglet !== false && j > 0 && j < nC - 1) {
        const dx = P[0] - A[0], dz = P[2] - A[2], l = Math.hypot(dx, dz);
        if (l > 1e-6) {
          const sx = -dz / l, sz = dx / l;
          m = 1 / Math.max(0.35, Math.abs(sx * Sx + sz * Sz) / (Math.hypot(Sx, Sz) || 1));
          if (!o.vertical) m = Math.min(m, 1.6);
        }
      }
      if (j > 0) longueur += Math.hypot(P[0] - A[0], P[1] - A[1], P[2] - A[2]);
      const lt = Math.hypot(tx, ty, tz) || 1;
      F.push({ P, S: [Sx, Sy, Sz], U: [Ux, Uy, Uz], T: [tx / lt, ty / lt, tz / lt], m, v: longueur, e: o.echelles ? o.echelles[j] : 1 });
    }
    // le profil : centre, arêtes, normales, périmètre
    let cx = 0, cy = 0; for (const q of profil) { cx += q[0]; cy += q[1]; } cx /= nP; cy /= nP;
    const nA = ferme ? nP : nP - 1, aretes = [];
    let per = 0;
    for (let i = 0; i < nA; i++) {
      const a = profil[i], b = profil[(i + 1) % nP], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1e-9;
      aretes.push({ a, b, nx: dy / l, ny: -dx / l, u0: per, u1: per + l });
      per += l;
    }
    if (o.lisse) {                                    // normales moyennées aux sommets du profil
      for (let i = 0; i < nA; i++) {
        const e = aretes[i], pr = aretes[(i - 1 + nA) % nA], nx = aretes[(i + 1) % nA];
        const okP = ferme || i > 0, okN = ferme || i < nA - 1;
        e.na = okP ? norm2(e.nx + pr.nx, e.ny + pr.ny) : [e.nx, e.ny];
        e.nb = okN ? norm2(e.nx + nx.nx, e.ny + nx.ny) : [e.nx, e.ny];
      }
    }
    const uDe = (u) => (o.bande ? 0.06 + 0.38 * (u / per) : u / tuile + (o.uDecal || 0));
    const vDe = (v) => (o.bande ? v : v / tuile + (o.vDecal || 0));
    const pt = (f, x, y) => {
      const e = f.e, X = (cx + (x - cx) * e) * f.m, Y = cy + (y - cy) * e;
      return [f.P[0] + f.S[0] * X + f.U[0] * Y, f.P[1] + f.S[1] * X + f.U[1] * Y, f.P[2] + f.S[2] * X + f.U[2] * Y];
    };
    const nrm = (f, nx, ny) => {
      const x = f.S[0] * nx + f.U[0] * ny, y = f.S[1] * nx + f.U[1] * ny, z = f.S[2] * nx + f.U[2] * ny, l = Math.hypot(x, y, z) || 1;
      return [x / l, y / l, z / l];
    };
    for (const e of aretes) {
      const na = o.lisse ? e.na : [e.nx, e.ny], nb = o.lisse ? e.nb : [e.nx, e.ny];
      let pa = -1, pb = -1;
      for (let j = 0; j < nC; j++) {
        const f = F[j], A = pt(f, e.a[0], e.a[1]), B = pt(f, e.b[0], e.b[1]), NA = nrm(f, na[0], na[1]), NB = nrm(f, nb[0], nb[1]);
        const ia = this.s(p, A[0], A[1], A[2], NA[0], NA[1], NA[2], uDe(e.u0), vDe(f.v), fn ? col(A[0], A[1], A[2], NA[0], NA[1], NA[2]) : col);
        const ib = this.s(p, B[0], B[1], B[2], NB[0], NB[1], NB[2], uDe(e.u1), vDe(f.v), fn ? col(B[0], B[1], B[2], NB[0], NB[1], NB[2]) : col);
        if (j > 0) this.quad(p, pa, pb, ib, ia);
        pa = ia; pb = ib;
      }
    }
    if (ferme && o.bouts !== false) {
      const tris = triangulerProfil(profil);
      for (const [f, s] of [[F[0], -1], [F[nC - 1], 1]]) {
        const base = p.n, N = [f.T[0] * s, f.T[1] * s, f.T[2] * s];
        if (o.vertical) { const l = Math.hypot(N[0], N[2]) || 1; N[0] /= l; N[1] = 0; N[2] /= l; }
        for (const q of profil) {
          const A = pt(f, q[0], q[1]);
          this.s(p, A[0], A[1], A[2], N[0], N[1], N[2], o.bande ? 0.25 : q[0] / tuile, o.bande ? 0.5 : q[1] / tuile, fn ? col(A[0], A[1], A[2], N[0], N[1], N[2]) : col);
        }
        for (const t of tris) this.tri(p, base + t[0], base + t[1], base + t[2]);
      }
    }
    return this;
  }

  // TOUR (lathe) autour de l'axe y local, puis `m4` : profil [[r, y], ...] du bas vers le haut, `cotes` côtés.
  // o.facettes : faces planes autour (socle octogonal) ; o.vif : arêtes vives le long du profil (moulures) ;
  // o.bande (peinture) ; o.a0 : angle de départ ; o.fond / o.dessus : disques de fermeture.
  tour(cle, profil, cotes, m4 = null, o = {}) {
    // (la même moulure revient des centaines de fois : pommeaux, pointes, bagues) : géométrie gardée par profil
    const cleT = JSON.stringify([profil, cotes, o.a0 || 0, !!o.facettes, !!o.vif, !!o.fond, !!o.dessus, !!o.bande, o.tuile || 1]);
    let g = _tours.get(cleT);
    if (!g) { g = tourGeo(profil, cotes, o); if (_tours.size < 600) _tours.set(cleT, g); }
    this.geo(cle, g, m4, { couleur: o.couleur, bande: o.bande, tuile: o.tuile });
    return this;
  }

  // BOÎTE de w x h x d centrée à l'origine, transformée par `m4`, aux arêtes CHANFREINÉES de `o.chanfrein` m (un
  // bloc de pierre taillée : les joints se lisent à la lumière, sans texture de joint). UV en tuiles, projetées face
  // par face dans le repère de la boîte (+ o.uvDecal).
  boite(cle, w, h, d, m4 = null, o = {}) {
    this.geo(cle, boiteGeo(w, h, d, o.chanfrein || 0), m4, { couleur: o.couleur, uvBoite: !o.bande, bande: o.bande, uvDecal: o.uvDecal, tuile: o.tuile });
    return this;
  }

  // BARREAU de section carrée (ou rectangulaire w x h) de a à b ; `haut` oriente la section. Peinture par défaut.
  barre(a, b, w, h = w, o = {}) {
    const r = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    return this.prisme(o.cle || 'peinture', r, [a, b], { bande: true, couleur: o.couleur || TEINTES.fer, haut: o.haut || [0, 1, 0], bouts: o.bouts });
  }

  // Les maillages : un par matériau (clé « nom#ombre » : le même matériau sans ombre portée, pour les sols).
  // Le décalage de parc2 (Monde.dx) va sur les maillages, le groupe reste à l'origine (voir l'en-tête).
  maillages(nom = this.nom, dec = Monde.dx) {
    const g = new THREE.Group(); g.name = nom;
    for (const [cle, p] of this.parts) {
      if (!p.idx.l) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(p.pos.fin(), 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(p.nor.fin(), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(p.uv.fin(), 2));
      geo.setAttribute('color', new THREE.BufferAttribute(p.col.fin(), 3));
      const idx = p.idx.fin();
      geo.setIndex(new THREE.BufferAttribute(p.n < 65536 ? new Uint16Array(idx) : idx, 1));   // (copie directe, sans itérateur)
      geo.computeBoundingSphere();
      const [mat, suffixe] = cle.split('#'), m = new THREE.Mesh(geo, materiau(mat));
      m.castShadow = suffixe === 'sol' || suffixe === 'loin' ? false : suffixe === 'ombre' ? true : ombreDe(mat);
      m.receiveShadow = true;
      // (lot C6) LES DEUX NIVEAUX DE LA FERRONNERIE : « nom#fin », le détail fin (volutes, pointes de lance, anneaux,
      // pommeaux, barreaux d'une rampe), qui n'est dessiné que de près ; « nom#loin », sa version simple, CACHÉE d'office,
      // que js/monde_vue.js montre au-delà (la distance `fin` du préréglage, js/monde_charge.js) et qui ne porte pas
      // d'ombre (le détail fin garde la sienne, à toute distance). Sans la vue du parc entier (la page de démonstration du
      // kit), on ne voit que le détail fin.
      if (suffixe === 'fin') m.userData.lod = 'pres';
      else if (suffixe === 'loin') { m.userData.lod = 'loin'; m.visible = false; }
      m.position.x = dec;
      m.name = nom + ' · ' + mat;
      g.add(m);
    }
    return g;
  }
}
function norm2(x, y) { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; }
// Triangulation d'un profil (bouts des prismes) : en éventail s'il est convexe (le cas courant : barreaux, lisses,
// blocs), sinon par three (ShapeUtils), gardée en mémoire. ShapeUtils à chaque barreau coûtait les trois quarts du
// temps de construction d'un escalier.
const _trisProfils = new WeakMap(), _eventails = [];
function convexe(pts) {
  let signe = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], c = pts[(i + 2) % n];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(z) < 1e-12) continue;
    if (signe === 0) signe = Math.sign(z); else if (Math.sign(z) !== signe) return false;
  }
  return true;
}
function eventail(n) {
  let t = _eventails[n];
  if (!t) { t = []; for (let i = 1; i < n - 1; i++) t.push([0, i, i + 1]); _eventails[n] = t; }
  return t;
}
function trianguler(pts) {
  if (pts.length <= 3 || convexe(pts)) return eventail(pts.length);
  try { return THREE.ShapeUtils.triangulateShape(pts.map((q) => new THREE.Vector2(q[0], q[1])), []); } catch (e) { return []; }
}
function triangulerProfil(profil) {
  let t = _trisProfils.get(profil);
  if (!t) { t = trianguler(profil); _trisProfils.set(profil, t); }
  return t;
}

// Géométrie d'une boîte chanfreinée (6 faces, 12 chanfreins d'arête, 8 coins), non indexée à plat : 44 triangles.
const _boites = new Map();
function boiteGeo(w, h, d, e) {
  const cle = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)},${e.toFixed(3)}`;
  let g = _boites.get(cle);
  if (g) return g;
  const H = [w / 2, h / 2, d / 2], c = Math.min(e, H[0] * 0.45, H[1] * 0.45, H[2] * 0.45);
  const pos = [], nor = [], uv = [], idx = [];
  const sommet = (p, n) => { pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]); uv.push(0, 0); return pos.length / 3 - 1; };
  const orient = (a, b, cc, n) => {   // triangle tourné vers n
    const P = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
    const A = P(a), B = P(b), C = P(cc);
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    if (x * n[0] + y * n[1] + z * n[2] >= 0) idx.push(a, b, cc); else idx.push(a, cc, b);
  };
  const q = (pts, n) => { const i = pts.map((p) => sommet(p, n)); orient(i[0], i[1], i[2], n); orient(i[0], i[2], i[3], n); };
  // faces
  for (let ax = 0; ax < 3; ax++) for (const s of [-1, 1]) {
    const j = (ax + 1) % 3, k = (ax + 2) % 3, n = [0, 0, 0]; n[ax] = s;
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => { const p = [0, 0, 0]; p[ax] = s * H[ax]; p[j] = a * (H[j] - c); p[k] = b * (H[k] - c); return p; });
    q(pts, n);
  }
  if (c > 1e-5) {
    // chanfreins d'arête
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) for (const si of [-1, 1]) for (const sj of [-1, 1]) {
      const k = 3 - i - j, n = [0, 0, 0]; n[i] = si * Math.SQRT1_2; n[j] = sj * Math.SQRT1_2;
      const pts = [];
      for (const [di, dj, sk] of [[0, c, -1], [0, c, 1], [c, 0, 1], [c, 0, -1]]) {
        const p = [0, 0, 0]; p[i] = si * (H[i] - di); p[j] = sj * (H[j] - dj); p[k] = sk * (H[k] - c); pts.push(p);
      }
      q(pts, n);
    }
    // coins
    const r3 = 1 / Math.sqrt(3);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const n = [sx * r3, sy * r3, sz * r3], S = [sx, sy, sz], pts = [];
      for (let a = 0; a < 3; a++) { const p = [0, 0, 0]; for (let b = 0; b < 3; b++) p[b] = S[b] * (H[b] - (a === b ? 0 : c)); pts.push(p); }
      const i = pts.map((p) => sommet(p, n)); orient(i[0], i[1], i[2], n);
    }
  }
  g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  if (_boites.size < 400) _boites.set(cle, g);
  return g;
}

const _tours = new Map();
// Géométrie d'un tour (voir Lot.tour). Normales : le long du profil, par arête (vif) ou moyennées ; autour, lisses
// ou par facette.
function tourGeo(profil, cotes, o = {}) {
  const pos = [], nor = [], uv = [], idx = [];
  const a0 = o.a0 || 0, nP = profil.length;
  const arete = (i) => { const [r0, y0] = profil[i], [r1, y1] = profil[i + 1]; const n = norm2(y1 - y0, -(r1 - r0)); return n; };
  // longueur du profil (v)
  const L = [0]; for (let i = 1; i < nP; i++) L.push(L[i - 1] + Math.hypot(profil[i][0] - profil[i - 1][0], profil[i][1] - profil[i - 1][1]));
  const rMoy = profil.reduce((s, q) => s + q[0], 0) / nP, tuile = o.tuile || 1;
  const ajouter = (r, y, nr, ny, ang, angN, u, v) => {
    const c = Math.cos(ang), s = Math.sin(ang), cn = Math.cos(angN), sn = Math.sin(angN);
    pos.push(r * c, y, r * s); nor.push(nr * cn, ny, nr * sn); uv.push(u, v);
    return pos.length / 3 - 1;
  };
  for (let i = 0; i < nP - 1; i++) {
    const nA = arete(i);
    // normales aux deux bouts de l'arête
    let na = nA, nb = nA;
    if (!o.vif) {
      if (i > 0) na = norm2(nA[0] + arete(i - 1)[0], nA[1] + arete(i - 1)[1]);
      if (i < nP - 2) nb = norm2(nA[0] + arete(i + 1)[0], nA[1] + arete(i + 1)[1]);
    }
    const ring = [];
    for (let k = 0; k <= cotes; k++) {
      const f = k / cotes, ang = a0 + f * Math.PI * 2;
      const u = o.bande ? 0.06 + 0.38 * f : (f * Math.PI * 2 * Math.max(rMoy, 0.05)) / tuile;
      if (o.facettes && k > 0 && k < cotes) {
        // deux sommets par méridien : chaque facette garde sa normale
        const angA = ang - Math.PI / cotes, angB = ang + Math.PI / cotes;
        ring.push([ajouter(profil[i][0], profil[i][1], na[0], na[1], ang, angA, u, L[i] / tuile), ajouter(profil[i + 1][0], profil[i + 1][1], nb[0], nb[1], ang, angA, u, L[i + 1] / tuile),
          ajouter(profil[i][0], profil[i][1], na[0], na[1], ang, angB, u, L[i] / tuile), ajouter(profil[i + 1][0], profil[i + 1][1], nb[0], nb[1], ang, angB, u, L[i + 1] / tuile)]);
      } else {
        const angN = o.facettes ? (k === 0 ? ang + Math.PI / cotes : ang - Math.PI / cotes) : ang;
        const a = ajouter(profil[i][0], profil[i][1], na[0], na[1], ang, angN, u, L[i] / tuile);
        const b = ajouter(profil[i + 1][0], profil[i + 1][1], nb[0], nb[1], ang, angN, u, L[i + 1] / tuile);
        ring.push([a, b, a, b]);
      }
    }
    for (let k = 0; k < cotes; k++) {
      const A = ring[k], B = ring[k + 1];
      // (A[2], A[3]) : côté « après » du méridien k ; (B[0], B[1]) : côté « avant » du méridien k + 1
      idx.push(A[2], B[0], B[1], A[2], B[1], A[3]);
    }
  }
  for (const [iP, s] of [[0, -1], [nP - 1, 1]]) {
    if (!(s < 0 ? o.fond : o.dessus) || profil[iP][0] < 1e-5) continue;
    const [r, y] = profil[iP], c0 = pos.length / 3;
    pos.push(0, y, 0); nor.push(0, s, 0); uv.push(0.25, 0.5);
    for (let k = 0; k <= cotes; k++) { const a = a0 + (k / cotes) * Math.PI * 2; pos.push(r * Math.cos(a), y, r * Math.sin(a)); nor.push(0, s, 0); uv.push(0.25, 0.5); }
    for (let k = 0; k < cotes; k++) idx.push(c0, c0 + 1 + k, c0 + 2 + k);
  }
  // orientation : triangles tournés vers leur normale
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
    const P = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
    const A = P(a), B = P(b), C = P(c);
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    const nx = nor[a * 3] + nor[b * 3] + nor[c * 3], ny = nor[a * 3 + 1] + nor[b * 3 + 1] + nor[c * 3 + 1], nz = nor[a * 3 + 2] + nor[b * 3 + 2] + nor[c * 3 + 2];
    if (x * nx + y * ny + z * nz < 0) { idx[t + 1] = c; idx[t + 2] = b; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// ============================================================================================ lignes
// Longueur d'une ligne 2D [[x, z], ...].
export function longueur(ligne) { let s = 0; for (let i = 1; i < ligne.length; i++) s += Math.hypot(ligne[i][0] - ligne[i - 1][0], ligne[i][1] - ligne[i - 1][1]); return s; }
// Des points tous les `pas` m au plus le long de la ligne, sommets gardés : [{ x, z, s, coin }].
export function reechantillonner(ligne, pas, ferme = false) {
  const L = ferme ? [...ligne, ligne[0]] : ligne, out = [];
  let s = 0;
  for (let i = 0; i < L.length - 1; i++) {
    const [ax, az] = L[i], [bx, bz] = L[i + 1], l = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(l / pas - 1e-6));
    for (let k = 0; k < n; k++) out.push({ x: ax + (bx - ax) * k / n, z: az + (bz - az) * k / n, s: s + l * k / n, coin: k === 0 });
    s += l;
  }
  const [lx, lz] = L[L.length - 1]; out.push({ x: lx, z: lz, s, coin: true });
  return out;
}
// Arrondit les coudes d'une ligne (allées, haies) : chaque sommet intérieur devient un arc de rayon `r` au plus.
export function arrondir(ligne, r, n = 6) {
  if (ligne.length < 3 || r <= 0) return ligne.slice();
  const out = [ligne[0]];
  for (let i = 1; i < ligne.length - 1; i++) {
    const [ax, az] = ligne[i - 1], [bx, bz] = ligne[i], [cx, cz] = ligne[i + 1];
    const l1 = Math.hypot(ax - bx, az - bz), l2 = Math.hypot(cx - bx, cz - bz);
    if (l1 < 1e-6 || l2 < 1e-6) continue;
    const d1 = [(ax - bx) / l1, (az - bz) / l1], d2 = [(cx - bx) / l2, (cz - bz) / l2];
    const cosA = borne(d1[0] * d2[0] + d1[1] * d2[1], -1, 1), phi = Math.acos(cosA);
    if (phi > Math.PI - 0.05) { out.push(ligne[i]); continue; }
    const t = Math.min(r / Math.tan(phi / 2), l1 * 0.48, l2 * 0.48);
    const p1 = [bx + d1[0] * t, bz + d1[1] * t], p2 = [bx + d2[0] * t, bz + d2[1] * t];
    for (let k = 0; k <= n; k++) {
      const u = k / n, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
      out.push([a * p1[0] + b * bx + c * p2[0], a * p1[1] + b * bz + c * p2[1]]);
    }
  }
  out.push(ligne[ligne.length - 1]);
  return out;
}
// Les segments d'une ligne, avec direction unitaire, normale à droite (-dz, dx) et abscisse de départ.
function segments(ligne) {
  const out = []; let s = 0;
  for (let i = 0; i < ligne.length - 1; i++) {
    const [ax, az] = ligne[i], [bx, bz] = ligne[i + 1], L = Math.hypot(bx - ax, bz - az);
    if (L < 1e-6) continue;
    const dx = (bx - ax) / L, dz = (bz - az) / L;
    out.push({ ax, az, bx, bz, dx, dz, rx: -dz, rz: dx, L, s0: s });
    s += L;
  }
  return out;
}
// Point et direction à l'abscisse s d'une ligne.
function surLigne(segs, s) {
  let g = segs[segs.length - 1];
  for (const q of segs) if (s <= q.s0 + q.L) { g = q; break; }
  const t = borne(s - g.s0, 0, g.L);
  return { x: g.ax + g.dx * t, z: g.az + g.dz * t, dx: g.dx, dz: g.dz, rx: g.rx, rz: g.rz };
}
// Abscisse (le long de la ligne) de la projection du point (x, z).
function abscisse(segs, x, z) {
  let best = Infinity, sb = 0;
  for (const q of segs) {
    const t = borne((x - q.ax) * q.dx + (z - q.az) * q.dz, 0, q.L), px = q.ax + q.dx * t, pz = q.az + q.dz * t, d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; sb = q.s0 + t; }
  }
  return sb;
}
// Une ligne décalée de `d` m à DROITE (négatif : à gauche), coudes en onglet.
function decaler(ligne, d) {
  const n = ligne.length, out = [];
  for (let i = 0; i < n; i++) {
    const A = ligne[Math.max(0, i - 1)], B = ligne[i], C = ligne[Math.min(n - 1, i + 1)];
    let rx = 0, rz = 0;
    if (i > 0) { const l = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1; rx += -(B[1] - A[1]) / l; rz += (B[0] - A[0]) / l; }
    if (i < n - 1) { const l = Math.hypot(C[0] - B[0], C[1] - B[1]) || 1; rx += -(C[1] - B[1]) / l; rz += (C[0] - B[0]) / l; }
    const l = Math.hypot(rx, rz) || 1; rx /= l; rz /= l;
    let m = 1;
    if (i > 0 && i < n - 1) { const l1 = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1; m = 1 / Math.max(0.35, rx * -(B[1] - A[1]) / l1 + rz * (B[0] - A[0]) / l1); }
    out.push([B[0] + rx * d * m, B[1] + rz * d * m]);
  }
  return out;
}
// Une HAUTEUR LE LONG D'UNE LIGNE : un nombre, un PROFIL [[s, y], ...] (s : abscisse curviligne depuis le premier point
// de la ligne, en m ; interpolé linéairement, prolongé aux bouts), ou une fonction (s) -> y. Rend la fonction (s) -> y.
// Le profil est la forme de `profil` des murs de monde.json ([[s, yHaut, yBas], ...], tous les 2 m : seules les deux
// premières colonnes sont lues) : une zone passe `yHaut: mur.profil` tel quel à murPierre. Les murs du parc n'ont pas
// un dessus horizontal (relecture du lot A8 : mur de meulière de +1,45 à +2,31, placette du théâtre de +7,97 à
// +9,50) : un yHaut constant laissait des trous ou des marches d'un mètre et demi.
export function hauteurLe(h) {
  if (typeof h === 'function') return h;
  if (Array.isArray(h)) {
    const p = h.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0]);
    if (!p.length) return () => 0;
    return (s) => {
      if (s <= p[0][0]) return p[0][1];
      for (let i = 1; i < p.length; i++) {
        if (s <= p[i][0]) { const [s0, y0] = p[i - 1], [s1, y1] = p[i]; return s1 > s0 ? y0 + ((y1 - y0) * (s - s0)) / (s1 - s0) : y1; }
      }
      return p[p.length - 1][1];
    };
  }
  return () => h;
}
// Point dans un polygone 2D (règle du nombre de croisements).
export function dansPolygone(x, z, poly) {
  let dedans = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dedans = !dedans;
  }
  return dedans;
}
function distanceBord(x, z, poly) {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i], ux = bx - ax, uz = bz - az, L2 = ux * ux + uz * uz;
    const t = L2 > 0 ? borne(((x - ax) * ux + (z - az) * uz) / L2, 0, 1) : 0;
    d = Math.min(d, Math.hypot(x - ax - ux * t, z - az - uz * t));
  }
  return d;
}

// ============================================================================================ patine
// La patine d'une maçonnerie, en couleur de sommet (multiplicateur de la texture, à l'échelle du mur entier) :
//  - des taches lentes (±7 %) : une pierre plus blonde, un pan plus gris ;
//  - le PIED verdi et assombri par les rejaillissements (sur 0,9 m) ;
//  - des COULURES sous le couronnement : bandes verticales, plus sombres en haut, qui s'effacent en descendant ;
//  - `o.teinte` : la teinte propre du bloc (une pierre de taille n'est jamais de la même carrière que sa voisine).
// `pied(x, z)` : hauteur du pied du mur ; `haut` : hauteur du couronnement (nombre, ou fonction (x, z) quand le haut
// du mur suit un profil).
function patine(pied, haut, o = {}) {
  const out = [0, 0, 0], f0 = o.force ?? 1, t = o.teinte || BLANC, H = typeof haut === 'function' ? haut : null;
  return (x, y, z) => {
    const h = y - pied(x, z);
    const tache = 1 + 0.14 * (bruit(x * 0.55 + z * 0.55, y * 0.8, 3) - 0.5) * f0;
    const p = (1 - lisse(0, 0.9, h)) * f0;
    const c = Math.max(0, bruit((x + z) * 1.9, 0.5, 5) * 1.7 - 0.8) * Math.exp(-((H ? H(x, z) : haut) - y) / 1.5) * f0;
    out[0] = t[0] * tache * (1 - 0.32 * p) * (1 - 0.34 * c);
    out[1] = t[1] * tache * (1 - 0.22 * p) * (1 - 0.33 * c);
    out[2] = t[2] * tache * (1 - 0.33 * p) * (1 - 0.28 * c);
    return out;
  };
}
// Teinte propre d'une pierre de taille (0,93 à 1,04, un peu plus blonde ou plus grise).
function teintePierre(x, z, k) {
  const v = 0.93 + 0.11 * alea(x, z, k), b = 0.97 + 0.05 * alea(x, z, k + 1);
  return [v, v * 0.995, v * b];
}

// ============================================================================================ 1. MUR DE PIERRE
// murPierre({ ligne, yBas, yHaut, ep, pierre, chaperon, ouvertures, cote, deuxFaces, plinthe, chaines, patine })
//  ligne     : [[x, z], ...] l'axe du mur (repère du terrain 1)
//  cote      : le côté HAUT (la terre retenue), 'gauche' ou 'droite' en parcourant la ligne (convention de
//              tools/parc/gabarits.json : gauche = normale (dz, -dx)). La face vue est de l'autre côté.
//  yBas      : pied de la face (nombre), ou null : le sol devant la face, enterré de 15 cm (avec les données du monde,
//              c'est le bon choix : l'outil a déjà tenu le sol au pied du mur, au profil `yBas` de monde.json)
//  yHaut     : haut de la maçonnerie, sous le chaperon : nombre, profil [[s, y], ...] (le `profil` du mur dans
//              monde.json, tel quel) ou fonction (s) -> y, voir hauteurLe ; défaut : 1 m au-dessus du sol le plus haut
//  ep        : épaisseur (m) ; pierre : 'calcaire' (moellons, pierre de taille aux encadrements) ou 'meuliere'
//  chaperon  : hauteur du couronnement en pierre de taille (0 : aucun) ; il déborde de 5 cm de chaque côté
//  ouvertures: [{ type: 'fenetre' | 'porte' | 'soupirail' | 'oculus', s0, s1 | z0, z1 | x0, x1, bas, haut, fleche }]
//              (s : abscisse le long de la ligne ; z ou x : bornes projetées sur la ligne ; bas / haut : appui et
//              naissance de l'arc, en y absolu ; fleche : montée de l'arc segmentaire ; 'oculus' : œil-de-bœuf rond
//              de diamètre s1 - s0 posé sur `bas`, sans `haut` ni `fleche`)
//  plinthe   : soubassement de pierre de taille (calcaire : oui) ; chaines : chaînes d'angle aux bouts libres
// Matériaux : moellons (ou meulière) + pierre de taille, et peinture pour les menuiseries et les grilles.
// (lot C6) murPierrePas(o, budget) : le même, en tranches (voir escalierPas) — le mur des caves, 31 m, ses fenêtres, sa
// porte et ses soupiraux, prenait 13 à 34 ms d'une traite.
export function murPierre(o) { return dUnTrait(murPierrePas(o)); }
export function* murPierrePas(o, budget = () => false) {
  const lot = new Lot('mur');
  const ep = o.ep ?? 0.6, ch = o.chaperon ?? 0.15;
  const face = o.pierre === 'meuliere' ? 'meuliere' : 'moellons', tailleTu = TUILES.taille;
  const sensBas = o.cote === 'gauche' ? 1 : -1;          // la face vue : à droite (+1) si le haut est à gauche
  const ligne = o.ligne;
  const faces = o.deuxFaces ? [sensBas, -sensBas] : [sensBas];
  const segs = segments(ligne), Ltot = segs.reduce((s, q) => s + q.L, 0);
  // le haut de la maçonnerie à l'abscisse s (sans yHaut : un mètre au-dessus du plus haut point du sol de la ligne) ;
  // `ytMax` : le plus haut ; `hautXZ` : le même en un point (x, z) du mur, pour la patine (coulures sous le haut)
  const hautDe = hauteurLe(o.yHaut ?? Math.max(...ligne.map(([x, z]) => sol(x, z))) + 1.0);
  const constant = !(Array.isArray(o.yHaut) || typeof o.yHaut === 'function');
  let ytMax = -Infinity;
  for (let s = 0; s <= Ltot + 0.25; s += 0.5) ytMax = Math.max(ytMax, hautDe(Math.min(s, Ltot)));
  if (Array.isArray(o.yHaut)) for (const q of o.yHaut) ytMax = Math.max(ytMax, q[1]);
  const hautXZ = constant ? ytMax : (x, z) => hautDe(abscisse(segs, x, z));
  // les ouvertures, en abscisses le long de la ligne
  const ouv = (o.ouvertures || []).map((w) => {
    let s0 = w.s0, s1 = w.s1;
    if (s0 === undefined && w.z0 !== undefined) { const p0 = abscisse(segs, surLigne(segs, 0).x, w.z0), p1 = abscisse(segs, surLigne(segs, 0).x, w.z1); s0 = Math.min(p0, p1); s1 = Math.max(p0, p1); }
    if (s0 === undefined && w.x0 !== undefined) { const z = surLigne(segs, 0).z, p0 = abscisse(segs, w.x0, z), p1 = abscisse(segs, w.x1, z); s0 = Math.min(p0, p1); s1 = Math.max(p0, p1); }
    return { ...w, s0, s1 };
  });
  // le pied de la face : constant, ou le sol devant elle
  const pied = (x, z) => (o.yBas !== undefined && o.yBas !== null ? o.yBas : sol(x, z) - 0.15);
  for (const sens of faces) {
    const off = decaler(ligne, sens * ep / 2);            // la ligne de la face
    const fsegs = segments(off), piedFace = (s) => { const q = surLigne(fsegs, s); return pied(q.x + q.rx * sens * 0.3, q.z + q.rz * sens * 0.3); };
    const pat = patine((x, z) => pied(x, z) + 0.15 * (o.yBas == null ? 1 : 0), hautXZ, { force: o.patine ?? 1 });
    // ---- les ouvertures de cette face (seulement la face vue) et leurs trous dans l'appareil
    const trous = [];
    if (sens === sensBas) for (const w of ouv) {
      const defs = { fenetre: [1.0, 1.9, 0.14], porte: [0, 2.3, 0.18], soupirail: [0.15, 0.55, 0.12], oculus: [1.5, 0, 0] }[w.type] || [1, 1.8, 0.14];
      const yb0 = o.yBas ?? piedFace((w.s0 + w.s1) / 2) + 0.15;
      w.bas = w.bas ?? yb0 + defs[0];
      // (l'oculus est un cercle de diamètre s1 - s0 posé sur `bas` : son haut s'en déduit)
      w.haut = w.type === 'oculus' ? w.bas + (w.s1 - w.s0) : w.haut ?? w.bas + defs[1];
      w.fleche = w.type === 'oculus' ? 0 : w.fleche ?? defs[2] * (w.s1 - w.s0);
      w.e = w.type === 'soupirail' || w.type === 'oculus' ? 0.14 : 0.2;             // largeur de l'encadrement
      const sousBaie = w.type === 'fenetre' ? 0.1 : w.type === 'oculus' ? w.e : 0;     // appui, ou bas de la couronne
      trous.push({ s0: w.s0 - w.e, s1: w.s1 + w.e, y0: w.bas - sousBaie, y1: w.haut + w.fleche + w.e, w });
    }
    // ---- l'appareil (moellons) : une grille de colonnes de 0,5 m au plus et de rangées de 0,5 m, trouée
    const colS = new Set();
    for (let s = 0; s < Ltot; s += 0.5) colS.add(+s.toFixed(4));
    colS.add(+Ltot.toFixed(4)); for (const q of fsegs) colS.add(+q.s0.toFixed(4));
    for (const t of trous) { colS.add(+borne(t.s0, 0, Ltot).toFixed(4)); colS.add(+borne(t.s1, 0, Ltot).toFixed(4)); }
    const cols = [...colS].sort((a, b) => a - b);
    // (les abscisses de la ligne décalée diffèrent un peu aux coudes : on étire la face sur toute sa longueur)
    const Lf = fsegs.reduce((s, q) => s + q.L, 0), kf = Lf / Ltot;
    let yMin = Infinity; for (const s of cols) yMin = Math.min(yMin, piedFace(s * kf));
    const rowY = new Set();
    for (let y = Math.floor(yMin * 2) / 2; y < ytMax; y += 0.5) rowY.add(+y.toFixed(4));
    rowY.add(+ytMax.toFixed(4)); for (const t of trous) { rowY.add(+t.y0.toFixed(4)); rowY.add(+Math.min(ytMax, t.y1).toFixed(4)); }
    const rows = [...rowY].sort((a, b) => a - b);
    const p = lot.part(face), tu = TUILES[face];
    // Chaque colonne serre ses rangées entre son pied et son haut. Les sommets ne sont créés que s'ils servent : sous le
    // pied (sol en pente) ou au-dessus du haut (profil), les rangées se confondent et leurs quadrilatères sont plats.
    const grille = cols.map((s) => {
      const q = surLigne(fsegs, s * kf), yb = piedFace(s * kf), yh = hautDe(s);
      return { q, s, nx: q.rx * sens, nz: q.rz * sens, y: rows.map((Y) => Math.max(yb, Math.min(yh, Y))), i: rows.map(() => -1) };
    });
    const sommet = (c, r) => {
      if (c.i[r] < 0) { const y = c.y[r]; c.i[r] = lot.s(p, c.q.x, y, c.q.z, c.nx, 0, c.nz, c.s / tu, y / tu, pat(c.q.x, y, c.q.z)); }
      return c.i[r];
    };
    for (let i = 0; i < cols.length - 1; i++) {
      const A = grille[i], B = grille[i + 1], sm = (cols[i] + cols[i + 1]) / 2;
      for (let r = 0; r < rows.length - 1; r++) {
        if (A.y[r + 1] - A.y[r] < 1e-4 && B.y[r + 1] - B.y[r] < 1e-4) continue;       // hors de la face
        const ym = (rows[r] + rows[r + 1]) / 2;
        if (trous.some((t) => sm > t.s0 && sm < t.s1 && ym > t.y0 && ym < t.y1)) continue;
        lot.quad(p, sommet(A, r), sommet(B, r), sommet(B, r + 1), sommet(A, r + 1));
      }
      if (i % 24 === 23 && budget()) yield;
    }
    if (budget()) yield;
    // ---- les ouvertures (face vue seulement)
    for (const t of trous) { ouverture(lot, fsegs, kf, sens, t.w, pat, tailleTu); if (budget()) yield; }
    // ---- soubassement de pierre de taille (sauf devant les portes)
    if ((o.plinthe ?? o.pierre !== 'meuliere') && sens === sensBas) {
      let s = 0.02;
      while (s < Ltot - 0.05) {
        const L = Math.min(Ltot - 0.02 - s, 0.75 + 0.5 * alea(s, sens, 11));
        const sm = s + L / 2;
        if (!ouv.some((w) => w.type === 'porte' && sm > w.s0 - w.e - 0.3 && sm < w.s1 + w.e + 0.3)) {
          const q0 = surLigne(fsegs, s * kf), q1 = surLigne(fsegs, (s + L) * kf);
          // (42 cm, jamais plus haut que le mur moins 5 cm : un muret bas n'a pas de soubassement qui dépasse)
          const yb = Math.min(piedFace(s * kf), piedFace((s + L) * kf)), h = Math.min(0.42, Math.min(hautDe(s), hautDe(s + L)) - yb - 0.05);
          if (h < 0.12) { s += L + 0.006; continue; }
          const profil = [[-0.03, yb - 0.1], [0.028, yb - 0.1], [0.028, yb + h - 0.025], [0.005, yb + h], [-0.03, yb + h]];
          const pr = sens > 0 ? profil : profil.map(([a, b]) => [-a, b]).reverse();
          lot.prisme('taille', pr, [[q0.x, 0, q0.z], [q0.x + q0.dx * 0.012, 0, q0.z + q0.dz * 0.012], [q1.x - q1.dx * 0.012, 0, q1.z - q1.dz * 0.012], [q1.x, 0, q1.z]],
            { vertical: true, echelles: [0.97, 1, 1, 0.97], couleur: patine(pied, hautXZ, { teinte: teintePierre(s, sens, 12) }), uDecal: alea(s, 1, 13), vDecal: alea(s, 2, 13) });
        }
        s += L + 0.006;
      }
      if (budget()) yield;
    }
    // ---- dos de la face opposée (non vue) : au-dessus de la terre seulement
  }
  if (!o.deuxFaces) {
    // le dos : du sol du côté haut (enterré de 20 cm) au couronnement
    const off = decaler(ligne, -sensBas * ep / 2), fsegs = segments(off), p = lot.part(face), tu = TUILES[face];
    const Lf = fsegs.reduce((s, q) => s + q.L, 0);
    for (let s = 0, i = 0; s < Lf - 1e-6; i++) {
      const s1 = Math.min(Lf, s + 1), h0 = hautDe((s * Ltot) / Lf), h1 = hautDe((s1 * Ltot) / Lf);
      const q0 = surLigne(fsegs, s), q1 = surLigne(fsegs, s1), n = [q0.rx * -sensBas, q0.rz * -sensBas];
      const b0 = Math.min(h0 - 0.05, sol(q0.x + n[0] * 0.4, q0.z + n[1] * 0.4) - 0.2), b1 = Math.min(h1 - 0.05, sol(q1.x + n[0] * 0.4, q1.z + n[1] * 0.4) - 0.2);
      const c = [0.8, 0.8, 0.78];
      const a = lot.s(p, q0.x, b0, q0.z, n[0], 0, n[1], s / tu, b0 / tu, c), b = lot.s(p, q1.x, b1, q1.z, n[0], 0, n[1], s1 / tu, b1 / tu, c);
      const cc = lot.s(p, q1.x, h1, q1.z, n[0], 0, n[1], s1 / tu, h1 / tu, c), d = lot.s(p, q0.x, h0, q0.z, n[0], 0, n[1], s / tu, h0 / tu, c);
      lot.quad(p, a, b, cc, d);
      s = s1;
    }
  }
  // ---- le couronnement : blocs de pierre de taille d'un mètre environ, joints en V (chanfreins de bout)
  if (ch > 0) {
    const h1 = ep / 2 + 0.05, profil = [[-h1, 0], [h1, 0], [h1, ch * 0.55], [h1 - 0.025, ch], [-h1 + 0.025, ch], [-h1, ch * 0.55]];
    for (const q of segs) {
      const n = Math.max(1, Math.round(q.L / 1.0)), e0 = q === segs[0] ? -0.04 : 0, e1 = q === segs[segs.length - 1] ? 0.04 : 0;
      for (let k = 0; k < n; k++) {
        const t0 = (q.L * k) / n + (k === 0 ? e0 : 0.003), t1 = (q.L * (k + 1)) / n + (k === n - 1 ? e1 : -0.003);
        // (un bloc suit la pente du haut : ses faces restent d'aplomb, ses joints de bout aussi)
        const A = [q.ax + q.dx * t0, hautDe(q.s0 + t0), q.az + q.dz * t0], B = [q.ax + q.dx * t1, hautDe(q.s0 + t1), q.az + q.dz * t1];
        const c = 0.012 / (t1 - t0), hb = Math.max(A[1], B[1]);
        lot.prisme('taille', profil, [A, lerp3(A, B, c), lerp3(A, B, 1 - c), B],
          { vertical: true, echelles: [0.96, 1, 1, 0.96], couleur: patine(() => hb - 5, hb + ch, { teinte: teintePierre(A[0], A[2], 14), force: 0.6 }),
            uDecal: alea(A[0], A[2], 15), vDecal: alea(A[0], A[2], 16) });
      }
      if (budget()) yield;
    }
  } else {
    // sans couronnement : le dessus du mur, en moellons (tous les mètres quand le haut suit un profil)
    const pr = [[-ep / 2, -0.02], [ep / 2, -0.02], [ep / 2, 0], [-ep / 2, 0]];
    const dessus = constant ? ligne.map(([x, z]) => [x, ytMax, z]) : reechantillonner(ligne, 1).map((q) => [q.x, hautDe(q.s), q.z]);
    lot.prisme(face, pr, dessus, { vertical: true, couleur: [0.85, 0.85, 0.82] });
  }
  // ---- chaînes d'angle aux deux bouts : blocs alternés long / court, qui ceinturent le bout du mur
  if (o.chaines ?? true) {
    for (const [q, bout] of [[segs[0], 0], [segs[segs.length - 1], 1]]) {
      const ex = bout ? q.bx : q.ax, ez = bout ? q.bz : q.az, sd = bout ? -1 : 1;   // sd : vers l'intérieur du mur
      const yb = Math.min(pied(ex + q.rx * sensBas * (ep / 2 + 0.3), ez + q.rz * sensBas * (ep / 2 + 0.3)), pied(ex - q.rx * sensBas * (ep / 2 + 0.3), ez - q.rz * sensBas * (ep / 2 + 0.3)));
      const yt = hautDe(bout ? Ltot : 0);                // le haut du mur à ce bout
      let y = yb, k = 0;
      while (y < yt - 0.05) {
        const hb = Math.min(yt - y, 0.3 + 0.1 * alea(ex, ez, 20 + k));
        const long = k % 2 === 0 ? 0.52 : 0.32;
        const m4 = new THREE.Matrix4().makeBasis(new THREE.Vector3(q.dx, 0, q.dz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(q.rx, 0, q.rz));
        m4.setPosition(ex + q.dx * sd * (long / 2 - 0.015), y + hb / 2, ez + q.dz * sd * (long / 2 - 0.015));
        lot.boite('taille', long, hb - 0.008, ep + 0.03, m4, { chanfrein: 0.012, couleur: patine(pied, yt, { teinte: teintePierre(ex, y, 21) }), uvDecal: [alea(ex, y, 22), alea(ex, y, 23)] });
        y += hb; k++;
      }
    }
  }
  return lot.maillages('mur de pierre');
}
const lerp3 = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];

// Une ouverture dans la face d'un mur : encadrement de pierre de taille (piédroits harpés, voussoirs d'un arc
// segmentaire, clef en saillie, appui), tableaux, et le remplissage : fenêtre à petits carreaux, porte vitrée
// derrière sa grille, soupirail barreaudé ; l'oculus a sa propre fonction (voir plus bas).
function ouverture(lot, fsegs, kf, sens, w, pat, tailleTu) {
  const sm = (w.s0 + w.s1) / 2, larg = w.s1 - w.s0, f = Math.max(0.02, w.fleche), e = w.e;
  const q = surLigne(fsegs, sm * kf);
  // repère de la face : s le long de la face (depuis sm), y absolu, profondeur p vers l'extérieur (+) / le mur (-)
  const nx = q.rx * sens, nz = q.rz * sens, dx = q.dx, dz = q.dz;
  const P = (s, y, p) => [q.x + dx * (s - sm) + nx * p, y, q.z + dz * (s - sm) + nz * p];
  const N3 = (ns, ny, np) => { const x = dx * ns + nx * np, z = dz * ns + nz * np, l = Math.hypot(x, ny, z) || 1; return [x / l, ny / l, z / l]; };
  const Pr = (s, y, p) => P(s + sm, y, p);                  // (les blocs sont dessinés en s relatif à l'axe de la baie)
  const tv = [0.96, 0.95, 0.93], sail = 0.025, prof = w.type === 'soupirail' ? 0.18 : 0.24;
  // l'arc : cercle passant par (s0, haut), (s1, haut), montée f
  const R = (larg * larg / 4 + f * f) / (2 * f), cy = w.haut + f - R;
  const arcY = (s) => cy + Math.sqrt(Math.max(0, R * R - (s - sm) * (s - sm)));
  const th0 = Math.atan2(w.haut - cy, w.s0 - sm), th1 = Math.atan2(w.haut - cy, w.s1 - sm);
  const coul = (x, y, z) => { const c = pat(x, y, z); return [c[0] * tv[0], c[1] * tv[1], c[2] * tv[2]]; };
  // ---- un bloc de l'encadrement : polygone 2D (s, y) de la face, en saillie, chanfreiné
  const bloc = (poly, saillie, k) => {
    const t = teintePierre(poly[0][0] + sm, poly[0][1], 30 + k), c = 0.01;
    const col = (x, y, z) => { const a = pat(x, y, z); return [a[0] * t[0], a[1] * t[1], a[2] * t[2]]; };
    blocFace(lot, 'taille', poly, saillie, c, Pr, N3, col, tailleTu, [alea(sm, k, 31), alea(sm, k, 32)]);
  };
  if (w.type === 'oculus') { oculus(lot, w, sm, larg, e, sail, P, bloc, coul, nx, nz, dx, dz, tailleTu); return; }
  // piédroits : blocs de 0,3 à 0,4 m, alternativement larges et étroits (harpes)
  for (const [sA, sB, cote] of [[w.s0 - e, w.s0, -1], [w.s1, w.s1 + e, 1]]) {
    let y = w.bas, k = 0;
    while (y < w.haut - 0.04) {
      const hb = Math.min(w.haut - y, 0.3 + 0.1 * alea(sA, y, 33));
      const ext = k % 2 === 0 ? 0.08 : 0;
      const a = cote < 0 ? sA - ext : sA, b = cote < 0 ? sB : sB + ext;
      bloc([[a - sm, y + 0.004], [b - sm, y + 0.004], [b - sm, y + hb - 0.004], [a - sm, y + hb - 0.004]], sail, k + (cote > 0 ? 50 : 0));
      y += hb; k++;
    }
  }
  // tête : voussoirs rayonnants entre l'arc et le haut du trou (un nombre impair : la clef au milieu)
  const nv = Math.max(5, (Math.round(larg / 0.22) | 1));
  const yTop = w.haut + f + e;
  for (let i = 0; i < nv; i++) {
    const a0 = th0 + (th1 - th0) * i / nv, a1 = th0 + (th1 - th0) * (i + 1) / nv;
    const inter = (a) => {
      const c = Math.cos(a), s = Math.sin(a);
      // rayon depuis le centre de l'arc jusqu'au haut du trou (y = yTop) ou jusqu'à ses côtés
      let t = (yTop - cy) / Math.max(1e-4, s), x = c * t;
      if (x < w.s0 - e - sm) { t = (w.s0 - e - sm) / c; x = w.s0 - e - sm; return [x, cy + s * t]; }
      if (x > w.s1 + e - sm) { t = (w.s1 + e - sm) / c; x = w.s1 + e - sm; return [x, cy + s * t]; }
      return [x, yTop];
    };
    const in0 = [Math.cos(a0) * R, cy + Math.sin(a0) * R], in1 = [Math.cos(a1) * R, cy + Math.sin(a1) * R];
    let o0 = inter(a0), o1 = inter(a1);
    if (i === 0) o0 = [w.s0 - e - sm, w.haut];
    if (i === nv - 1) o1 = [w.s1 + e - sm, w.haut];
    const poly = [in0, in1, o1];
    // un coin du trou entre les deux rayons
    if (Math.abs(o1[1] - o0[1]) > 1e-3 && (o0[1] < yTop - 1e-3 || o1[1] < yTop - 1e-3)) {
      const coin = o0[0] < 0 ? [w.s0 - e - sm, yTop] : [w.s1 + e - sm, yTop];
      if ((o0[1] < yTop - 1e-3) !== (o1[1] < yTop - 1e-3)) poly.push(coin);
    }
    poly.push(o0);
    const clef = i === (nv - 1) / 2;
    // (les voussoirs sont un peu resserrés : le joint se lit ; la clef avance de 2 cm de plus et monte de 4 cm)
    const pr = retrecir(poly, 0.004);
    if (clef) { pr[2][1] += 0.04; pr[pr.length - 1][1] += 0.04; }
    bloc(pr, sail + (clef ? 0.02 : 0), 60 + i);
  }
  // appui (fenêtres) : pierre débordante de 6 cm, dessus en glacis
  if (w.type === 'fenetre') {
    const a = w.s0 - e - 0.03 - sm, b = w.s1 + e + 0.03 - sm, y0 = w.bas - 0.1;
    const m4 = new THREE.Matrix4().makeBasis(new THREE.Vector3(dx, 0, dz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx, 0, nz));
    const c0 = P((a + b) / 2 + sm, y0 + 0.05, sail + 0.06 - 0.18);
    m4.setPosition(c0[0], c0[1], c0[2]);
    lot.boite('taille', b - a, 0.1, 0.36, m4, { chanfrein: 0.015, couleur: coul, uvDecal: [alea(sm, 7, 34), 0.3] });
  }
  // ---- tableaux : la pierre retourne dans l'épaisseur du mur (plus sombre au fond)
  const ptsOut = [];
  const nArc = 10;
  ptsOut.push([w.s0, w.bas]);
  for (let i = 0; i <= nArc; i++) { const a = th0 + (th1 - th0) * i / nArc; ptsOut.push([sm + Math.cos(a) * R, cy + Math.sin(a) * R]); }
  ptsOut.push([w.s1, w.bas]);
  const pT = lot.part('taille');
  for (let i = 0; i < ptsOut.length - 1; i++) {
    const [s0, y0] = ptsOut[i], [s1, y1] = ptsOut[i + 1];
    // normale du tableau : vers l'intérieur de l'ouverture
    const ds = s1 - s0, dy = y1 - y0, l = Math.hypot(ds, dy) || 1;
    let ns = dy / l, ny = -ds / l;
    if ((sm - (s0 + s1) / 2) * ns + ((w.bas + w.haut) / 2 - (y0 + y1) / 2) * ny < 0) { ns = -ns; ny = -ny; }
    const n3 = [dx * ns, ny, dz * ns];
    const v = [];
    for (const [s, y, p, fonce] of [[s0, y0, sail, 1], [s1, y1, sail, 1], [s1, y1, -prof, 0.55], [s0, y0, -prof, 0.55]]) {
      const A = P(s, y, p), c = coul(A[0], A[1], A[2]);
      v.push(lot.s(pT, A[0], A[1], A[2], n3[0], n3[1], n3[2], (s + p) / tailleTu, y / tailleTu, [c[0] * fonce, c[1] * fonce, c[2] * fonce]));
    }
    lot.quad(pT, v[0], v[1], v[2], v[3]);
  }
  // le fond des joints de l'encadrement : un « U » autour de la baie, du bas de la baie au haut du trou de l'appareil
  const yHautTrou = w.haut + f + e;
  fondDeJoint(lot, P, nx, nz, [[w.s0 - e, w.bas], ...ptsOut, [w.s1 + e, w.bas], [w.s1 + e, yHautTrou], [w.s0 - e, yHautTrou]]);
  // le bas du tableau (porte : seuil ; fenêtre, soupirail : appui intérieur)
  lot.polygone('taille', [P(w.s0, w.bas, sail), P(w.s1, w.bas, sail), P(w.s1, w.bas, -prof), P(w.s0, w.bas, -prof)], [0, 1, 0], { couleur: [0.8, 0.79, 0.76] });
  // ---- le remplissage, au fond du tableau
  const fond = -prof;
  const contour = ptsOut.map(([s, y]) => P(s, y, fond));
  if (w.type === 'soupirail') {
    lot.polygone('peinture', contour, [nx, 0, nz], { couleur: TEINTES.noir, uv: (x, y, z, out) => { out[0] = 0.57; out[1] = 0.5; } });
    // cinq barreaux d'aplomb, scellés dans le tableau
    const nb = Math.max(3, Math.round(larg / 0.13));
    for (let i = 1; i < nb; i++) {
      const s = w.s0 + (larg * i) / nb, y1 = arcY(s);
      lot.barre(P(s, w.bas - 0.02, -prof * 0.45), P(s, y1 + 0.02, -prof * 0.45), 0.02, 0.02, { couleur: TEINTES.fer });
    }
    return;
  }
  // vitre (fenêtre) ou vitrage haut de la porte : la bande « verre » de la peinture, teinte de vitre
  const vitre = (pts) => lot.polygone('peinture', pts, [nx, 0, nz], { couleur: TEINTES.vitre, uv: (x, y, z, out) => { out[0] = 0.57; out[1] = y; } });
  const cadre = w.type === 'porte' ? TEINTES.vertFonte : TEINTES.creme;
  const b = 0.06;                                  // largeur du dormant
  // le dormant : un cadre qui suit le contour, en saillie de 3 cm sur la vitre
  const ctr = [[w.s0 + b / 2, w.bas]];
  for (let i = 0; i <= nArc; i++) { const a = th0 + (th1 - th0) * i / nArc; const rr = R - b / 2; ctr.push([sm + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  ctr.push([w.s1 - b / 2, w.bas]);
  lot.prisme('peinture', [[-b / 2, -0.03], [b / 2, -0.03], [b / 2, 0.03], [-b / 2, 0.03]], ctr.map(([s, y]) => P(s, y, fond + 0.03)),
    { haut: [nx, 0, nz], bande: true, couleur: cadre, ferme: true, bouts: false });
  if (w.type === 'fenetre') {
    vitre(contour);
    // petits bois : un meneau central, deux montants par vantail et des traverses tous les 30 cm
    const nc = 4, nr = Math.max(3, Math.round((w.haut - w.bas) / 0.3));
    for (let i = 1; i < nc; i++) {
      const s = w.s0 + (larg * i) / nc, ep2 = i === nc / 2 ? 0.05 : 0.025;
      lot.barre(P(s, w.bas, fond + 0.02), P(s, arcY(s) - 0.01, fond + 0.02), ep2, 0.03, { couleur: TEINTES.creme, haut: [nx, 0, nz] });
    }
    for (let r = 1; r < nr; r++) {
      const y = w.bas + ((w.haut - w.bas) * r) / nr;
      lot.barre(P(w.s0, y, fond + 0.02), P(w.s1, y, fond + 0.02), 0.025, 0.03, { couleur: TEINTES.creme, haut: [0, 1, 0] });
    }
  } else {
    // PORTE : soubassement plein (panneaux) jusqu'à 0,9 m, vitrage au-dessus, grille de fer devant (photo j3)
    const yp = w.bas + 0.9;
    lot.polygone('peinture', [P(w.s0, w.bas, fond + 0.01), P(w.s1, w.bas, fond + 0.01), P(w.s1, yp, fond + 0.01), P(w.s0, yp, fond + 0.01)], [nx, 0, nz],
      { couleur: TEINTES.vertFonte, uv: (x, y, z, out) => { out[0] = 0.25; out[1] = y; } });
    vitre([P(w.s0, yp, fond), ...ptsOut.slice(1, -1).map(([s, y]) => P(s, y, fond)), P(w.s1, yp, fond)]);
    lot.barre(P(w.s0, yp, fond + 0.02), P(w.s1, yp, fond + 0.02), 0.06, 0.04, { couleur: TEINTES.vertFonte, haut: [0, 1, 0] });
    lot.barre(P(sm, w.bas, fond + 0.02), P(sm, arcY(sm), fond + 0.02), 0.05, 0.04, { couleur: TEINTES.vertFonte, haut: [nx, 0, nz] });
    // la grille : barreaux tous les 11 cm, deux traverses, dans le tableau
    const nb = Math.max(4, Math.round(larg / 0.11));
    for (let i = 1; i < nb; i++) {
      const s = w.s0 + (larg * i) / nb;
      lot.barre(P(s, w.bas + 0.02, -prof * 0.35), P(s, arcY(s) - 0.02, -prof * 0.35), 0.018, 0.018, { couleur: TEINTES.fer });
    }
    for (const y of [w.bas + 0.12, w.bas + 1.1, w.haut - 0.05]) lot.barre(P(w.s0, y, -prof * 0.35 - 0.02), P(w.s1, y, -prof * 0.35 - 0.02), 0.04, 0.012, { couleur: TEINTES.fer, haut: [0, 1, 0] });
  }
}
// L'ŒIL-DE-BŒUF (type 'oculus' : les soupiraux ronds du mur des caves, photos j3 et 20260928_171721, ajouté à la
// relecture du lot A8) : un cercle de diamètre s1 - s0 posé sur `bas`, cerclé de voussoirs rayonnants qui remplissent
// le carré de l'encadrement (la clef en haut, un peu plus saillante), tableau cylindrique qui s'assombrit vers le
// fond, fond noir et deux fers en croix. `P(s, y, p)` : point du monde (s absolu le long de la face).
function oculus(lot, w, sm, larg, e, sail, P, bloc, coul, nx, nz, dx, dz, tailleTu) {
  const r = larg / 2, yc = w.bas + r, E = r + e, nv = r > 0.35 ? 12 : 8, prof = 0.2, nA = segs(28, 16);
  const a0 = Math.PI / 2 - Math.PI / nv;                    // un voussoir centré en haut : la clef
  const bord = (a) => { const c = Math.cos(a), s = Math.sin(a), t = E / Math.max(Math.abs(c), Math.abs(s)); return [c * t, yc + s * t]; };
  for (let i = 0; i < nv; i++) {
    const a = a0 + (i * 2 * Math.PI) / nv, b = a + (2 * Math.PI) / nv, poly = [];
    for (let j = 0; j <= 3; j++) { const t = a + ((b - a) * j) / 3; poly.push([Math.cos(t) * r, yc + Math.sin(t) * r]); }   // l'intrados
    poly.push(bord(b));
    // l'angle du carré que ce voussoir contient (les coins sont à 45° + k x 90° ; un voussoir couvre 45° au plus)
    for (let k = 0; k < 4; k++) {
      let c = Math.PI / 4 + (k * Math.PI) / 2;
      while (c < a) c += 2 * Math.PI;
      if (c < b) poly.push([Math.sign(Math.cos(c)) * E, yc + Math.sign(Math.sin(c)) * E]);
    }
    poly.push(bord(a));
    bloc(retrecir(poly, 0.004), sail + (i === 0 ? 0.02 : 0), 90 + i);
  }
  const cercle = [];
  for (let i = 0; i < nA; i++) { const t = (i / nA) * Math.PI * 2; cercle.push([sm + Math.cos(t) * r, yc + Math.sin(t) * r]); }
  fondDeJoint(lot, P, nx, nz, [[sm - E, yc - E], [sm + E, yc - E], [sm + E, yc + E], [sm - E, yc + E]], cercle);
  // le tableau : un cylindre du nu de l'encadrement au fond, normales vers l'axe
  const pT = lot.part('taille');
  let prec = null;
  for (let i = 0; i <= nA; i++) {
    const t = (i / nA) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), n3 = [-dx * c, -s, -dz * c], v = [];
    for (const [p, fonce] of [[sail, 1], [-prof, 0.55]]) {
      const A = P(sm + c * r, yc + s * r, p), k = coul(A[0], A[1], A[2]);
      v.push(lot.s(pT, A[0], A[1], A[2], n3[0], n3[1], n3[2], (t * r + p) / tailleTu, A[1] / tailleTu, [k[0] * fonce, k[1] * fonce, k[2] * fonce]));
    }
    if (prec) lot.quad(pT, prec[0], v[0], v[1], prec[1]);
    prec = v;
  }
  // le fond noir et les deux fers en croix, scellés dans le tableau
  lot.polygone('peinture', cercle.map(([s, y]) => P(s, y, -prof)), [nx, 0, nz], { couleur: TEINTES.noir, uv: (x, y, z, out) => { out[0] = 0.57; out[1] = 0.5; } });
  lot.barre(P(sm, yc - r - 0.02, -prof * 0.45), P(sm, yc + r + 0.02, -prof * 0.45), 0.02, 0.02, { couleur: TEINTES.fer, haut: [nx, 0, nz] });
  lot.barre(P(sm - r - 0.02, yc, -prof * 0.45), P(sm + r + 0.02, yc, -prof * 0.45), 0.02, 0.02, { couleur: TEINTES.fer, haut: [0, 1, 0] });
}
// LE FOND DES JOINTS d'un encadrement : un voile couleur de mortier, à 1,5 cm dans le mur, qui couvre le trou de
// l'appareil autour de la baie (`contour` : [[s, y], ...] ; `trou` : une baie fermée à l'intérieur, pour l'oculus).
// Les pierres de l'encadrement sont séparées par des joints de 8 mm et le parement n'a rien derrière lui : sans ce
// voile, on voyait le jour à travers, un fil blanc entre chaque voussoir (relecture du lot A8, oculus vu de face).
function fondDeJoint(lot, P, nx, nz, contour, trou = null) {
  const v2 = (q) => new THREE.Vector2(q[0], q[1]);
  let tris;
  try { tris = trou ? THREE.ShapeUtils.triangulateShape(contour.map(v2), [trou.map(v2)]) : trianguler(contour); } catch (e) { return; }
  const pts = (trou ? [...contour, ...trou] : contour).map(([s, y]) => P(s, y, -0.015));
  lot.polygone('taille', pts, [nx, 0, nz], { tris, couleur: [0.3, 0.29, 0.27] });
}
// rétrécit un polygone convexe de `c` (vers son centre)
function retrecir(poly, c) {
  let cx = 0, cy = 0; for (const [x, y] of poly) { cx += x; cy += y; } cx /= poly.length; cy /= poly.length;
  return poly.map(([x, y]) => { const dx = cx - x, dy = cy - y, l = Math.hypot(dx, dy) || 1; return [x + (dx / l) * c, y + (dy / l) * c]; });
}
// Un bloc dont la face avant est le polygone `poly` (s, y) : face avant en saillie de `saillie`, chanfrein `c` sur son
// pourtour, flancs jusqu'au nu du mur (et 2 cm dedans). `P(s, y, p)` : point du monde (mêmes s et y que `poly`, p vers
// l'extérieur) ; `N3(ns, ny, np)` : normale du monde depuis le repère de la face.
function blocFace(lot, cle, poly, saillie, c, P, N3, col, tuile, dec) {
  const p = lot.part(cle), n = poly.length;
  let aire = 0; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; aire += a[0] * b[1] - b[0] * a[1]; }
  const pl = aire >= 0 ? poly : poly.slice().reverse();        // sens trigonométrique
  // la face avant : le polygone décalé de c vers l'intérieur (formule d'onglet)
  const inset = pl.map((v, i) => {
    const a = pl[(i - 1 + n) % n], b = pl[(i + 1) % n];
    const e1 = norm2(v[0] - a[0], v[1] - a[1]), e2 = norm2(b[0] - v[0], b[1] - v[1]);
    const n1 = [-e1[1], e1[0]], n2 = [-e2[1], e2[0]], d = 1 + n1[0] * n2[0] + n1[1] * n2[1];
    return [v[0] + c * (n1[0] + n2[0]) / Math.max(0.3, d), v[1] + c * (n1[1] + n2[1]) / Math.max(0.3, d)];
  });
  const sommet = (s, y, pp, nn, us, vs) => {
    const A = P(s, y, pp);
    return lot.s(p, A[0], A[1], A[2], nn[0], nn[1], nn[2], us / tuile + dec[0], vs / tuile + dec[1], col(A[0], A[1], A[2]));
  };
  const nF = N3(0, 0, 1), base = p.n;
  for (const [s, y] of inset) sommet(s, y, saillie, nF, s, y);
  for (const t of trianguler(inset)) lot.tri(p, base + t[0], base + t[1], base + t[2]);
  for (let i = 0; i < n; i++) {
    const a = pl[i], b = pl[(i + 1) % n], ai = inset[i], bi = inset[(i + 1) % n];
    const e = norm2(b[0] - a[0], b[1] - a[1]), no = [e[1], -e[0]];              // normale sortante de l'arête (s, y)
    const nCh = N3(no[0], no[1], 1), nFl = N3(no[0], no[1], 0);
    // le chanfrein (à 45°), puis le flanc jusque dans le mur (la texture y continue en biais)
    lot.quad(p, sommet(ai[0], ai[1], saillie, nCh, ai[0], ai[1]), sommet(bi[0], bi[1], saillie, nCh, bi[0], bi[1]),
      sommet(b[0], b[1], saillie - c, nCh, b[0], b[1]), sommet(a[0], a[1], saillie - c, nCh, a[0], a[1]));
    lot.quad(p, sommet(a[0], a[1], saillie - c, nFl, a[0], a[1]), sommet(b[0], b[1], saillie - c, nFl, b[0], b[1]),
      sommet(b[0], b[1], -0.02, nFl, b[0] + no[0] * 0.03, b[1] + no[1] * 0.03), sommet(a[0], a[1], -0.02, nFl, a[0] + no[0] * 0.03, a[1] + no[1] * 0.03));
  }
}

// ============================================================================================ 2. ESCALIER
// escalier({ de, a, marches, largeur, limon, mainCourante, materiau, usure, massif })
//  de, a       : [x, z, y] les deux bouts de la volée (dans n'importe quel ordre : on bâtit du bas vers le haut),
//                comme les gabarits « escalier » de tools/parc/gabarits.json. Le sol du monde y est un plan incliné
//                de `de` à `a` : les marches sont posées pour que le NEZ de chacune tombe sur ce plan (le pied du
//                joueur ne s'enfonce jamais de plus d'une demi-contremarche).
//  marches     : nombre de contremarches ; largeur : largeur utile (m)
//  limon       : true | 'gauche' | 'droite' | 'deux' : murets d'échiffre de 20 cm qui bordent la volée
//  mainCourante: 'gauche' | 'droite' | 'deux' : rampes de fer (gauche / droite en allant de `de` vers `a`)
//  materiau    : 'taille' (défaut), 'beton', 'meuliere' ; usure : 0 à 1 (1 : marches creusées au milieu)
// Chaque marche est un bloc : contremarche, NEZ arrondi en saillie de 3 cm, giron creusé au milieu par l'usure
// (jusqu'à 7 mm), plus clair là où l'on marche (poli), plus sombre contre la contremarche suivante et sur les bords.
// (lot C6) EN TRANCHES : escalierPas(o, budget) est la même volée, en générateur, qui rend la main entre deux marches,
// deux assises de limon et deux poignées de barreaux quand `budget()` le demande — dans la construction d'une zone :
// `groupe.add(yield* kit.escalierPas(o, ctx.budget))`. D'une traite, une volée de 34 marches à limons et rampes prenait
// 11 à 17 ms (40 sur une machine chargée), plus du double de la tranche d'une image ; escalier(o) la construit d'un coup,
// comme avant.
export function escalier(o) { return dUnTrait(escalierPas(o)); }
export function* escalierPas(o, budget = () => false) {
  const lot = new Lot('escalier');
  let [x0, z0, y0] = o.de, [x1, z1, y1] = o.a;
  const n = Math.max(1, o.marches | 0), larg = o.largeur ?? 1.5, mat = nomMatiere(o.materiau || 'taille'), tu = TUILES[mat] || 2;
  const Lh = Math.hypot(x1 - x0, z1 - z0) || 1;
  // gauche et droite : dans le sens de → a (convention des gabarits), même si l'on bâtit dans l'autre sens
  const gx = (z1 - z0) / Lh, gz = -(x1 - x0) / Lh;
  if (y0 > y1) [x0, z0, y0, x1, z1, y1] = [x1, z1, y1, x0, z0, y0];
  const dx = (x1 - x0) / Lh, dz = (z1 - z0) / Lh, rx = -dz, rz = dx;
  const h = (y1 - y0) / n, g = Lh / n, usure = o.usure ?? 1;
  const P = (s, t, y) => [x0 + dx * s + rx * t, y, z0 + dz * s + rz * t];
  const coteDe = (c) => (c === 'deux' || c === true ? [-1, 1] : c === 'gauche' || c === 'droite' ? [((c === 'gauche' ? gx : -gx) * rx + (c === 'gauche' ? gz : -gz) * rz) > 0 ? 1 : -1] : []);
  const limons = coteDe(o.limon), rampes = coteDe(o.mainCourante), wl = 0.2;
  const M = segs(6, 4), no = 0.03;
  // les colonnes de la largeur, communes à toutes les marches : position t, usure w (0 aux bords, 1 au milieu),
  // assombrissement des bords
  const colT = [], colW = [], colBord = [];
  for (let j = 0; j <= M; j++) {
    const tn = (2 * j) / M - 1;
    colT.push(-larg / 2 + (larg * j) / M); colW.push(Math.pow(Math.max(0, 1 - tn * tn), 1.5) * usure);
    colBord.push(0.86 + 0.14 * (1 - Math.pow(Math.abs(tn), 6)));
  }
  const pStep = lot.part(mat);
  let trisFlanc = null;                             // (toutes les marches ont le même flanc : triangulé une fois)
  const tmpC = [0, 0, 0];
  for (let k = 1; k <= n; k++) {
    const sk = (k - 0.5) * g, yk = y0 + k * h, yb = k === 1 ? y0 - 0.12 : y0 + (k - 1) * h - 0.03;
    const sBack = k < n ? sk + g + 0.02 : sk + 0.5 * g + 0.25;
    const t0 = teintePierre(sk, yk, 70), dec = [alea(k, sk, 71) * 3, alea(k, sk, 72) * 3];
    // profil (s, y) de l'avant vers l'arrière : pied de contremarche, sous le nez, nez, giron ; `c` : assombrissement
    const prof = [[sk, yb, 0.75], [sk, yk - 0.045, 0.9], [sk - no, yk - 0.04, 1], [sk - no - 0.004, yk - 0.02, 1.05],
      [sk - no + 0.004, yk - 0.003, 1.08], [sk - no + 0.018, yk, 1.06], [sk + g * 0.45, yk, 1.02], [sBack - 0.04, yk, 0.82], [sBack, yk, 0.8]];
    // usure (0 sur les bords, 1 au milieu de la largeur) : nez reculé et arrondi, giron creusé
    const use = [[0, 0], [0, 0], [0.002, 0.002], [0.006, 0.008], [0.006, 0.009], [0.004, 0.007], [0, 0.005], [0, 0.001], [0, 0]];
    let v = 0;
    for (let i = 0; i < prof.length - 1; i++) {
      const [sa, ya, ca] = prof[i], [sb, yb2, cb] = prof[i + 1];
      const ds = sb - sa, dyy = yb2 - ya, l = Math.hypot(ds, dyy) || 1e-6;
      // normale sortante (le bloc est sous et derrière le profil)
      const ns = -dyy / l, ny = ds / l, N = [dx * ns, ny, dz * ns];
      const rangA = [], rangB = [];
      for (let j = 0; j <= M; j++) {
        const t = colT[j], w = colW[j], bord = colBord[j];
        for (let q = 0; q < 2; q++) {                  // (sans tableau intermédiaire : c'est la boucle chaude)
          const ii = i + q, rang = q ? rangB : rangA, sP = q ? sb : sa, yP = q ? yb2 : ya, cP = q ? cb : ca;
          const S = sP + use[ii][0] * w, Y = yP - use[ii][1] * w, X = x0 + dx * S + rx * t, Z = z0 + dz * S + rz * t;
          const poli = ii >= 3 && ii <= 6 ? 1 + 0.06 * w : 1;
          const c = cP * bord * poli * (bruit(X * 0.7, Z * 0.7, 73) * 0.08 + 0.96);
          tmpC[0] = t0[0] * c; tmpC[1] = t0[1] * c; tmpC[2] = t0[2] * c;
          rang.push(lot.s(pStep, X, Y, Z, N[0], N[1], N[2], t / tu + dec[0], (v + (q ? l : 0)) / tu + dec[1], tmpC));
        }
      }
      for (let j = 0; j < M; j++) lot.quad(pStep, rangA[j], rangA[j + 1], rangB[j + 1], rangB[j]);
      v += l;
    }
    // les flancs de la marche (côtés sans limon)
    for (const cote of [-1, 1]) {
      if (limons.includes(cote)) continue;
      const t = (cote * larg) / 2, pts = [...prof.map(([s, y]) => P(s, t, y)), P(sBack, t, yb)];
      if (!trisFlanc) trisFlanc = trianguler([...prof.map(([s2, y]) => [s2, y]), [sBack, yb]]);
      lot.polygone(mat, pts, [rx * cote, 0, rz * cote], { tris: trisFlanc, couleur: [t0[0] * 0.85, t0[1] * 0.85, t0[2] * 0.85], uv: (x, y, z, out) => { out[0] = ((x - x0) * dx + (z - z0) * dz) / tu + dec[0]; out[1] = y / tu; } });
    }
    if (k % 4 === 0 && budget()) yield;
  }
  // le MASSIF : sous les flancs sans limon, de la marche au sol (la volée ne flotte jamais)
  if (o.massif !== false) for (const cote of [-1, 1]) {
    if (limons.includes(cote)) continue;
    const t = (cote * larg) / 2, pts = [];
    for (let k = 1; k <= n; k++) {
      const sk = (k - 0.5) * g, yb = k === 1 ? y0 - 0.12 : y0 + (k - 1) * h - 0.03;
      pts.push([sk, yb], [Math.min(Lh, sk + g + 0.02), yb]);
    }
    const p = lot.part(mat), c = [0.72, 0.71, 0.68], N = [rx * cote, 0, rz * cote];
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [sa, ya] = pts[i], [sb, yb] = pts[i + 1];
      const A = P(sa, t, 0), B = P(sb, t, 0);
      const ga = sol(A[0], A[2]) - 0.1, gb = sol(B[0], B[2]) - 0.1;
      if (ya <= ga && yb <= gb) continue;
      const q = [[A[0], Math.min(ga, ya), A[2]], [B[0], Math.min(gb, yb), B[2]], [B[0], yb, B[2]], [A[0], ya, A[2]]]
        .map((Q) => lot.s(p, Q[0], Q[1], Q[2], N[0], 0, N[2], ((Q[0] - x0) * dx + (Q[2] - z0) * dz) / tu, Q[1] / tu, c));
      lot.quad(p, q[0], q[1], q[2], q[3]);
    }
    if (budget()) yield;
  }
  // les LIMONS : murets d'échiffre de 20 cm, leur dessus parallèle à la ligne des nez, 12 cm au-dessus
  const nez = (s) => borne(y0 + (s / g + 0.5) * h, y0, y1);
  for (const cote of limons) {
    const tc = cote * (larg / 2 + wl / 2), pts = [];
    for (let s = 0; s <= Lh + 1e-6; s += Math.min(0.5, Lh)) pts.push(s);
    if (pts[pts.length - 1] < Lh - 1e-3) pts.push(Lh);
    const chemin = pts.map((s) => { const A = P(s, tc, 0); return [A[0], 0, A[2]]; });
    const hauts = pts.map((s) => nez(s) + 0.12), bas = chemin.map((A) => sol(A[0], A[2]) - 0.12);
    const col = patine((x, z) => sol(x, z), y1 + 0.2, { teinte: teintePierre(tc, y0, 74) });
    // Les deux faces, APPAREILLÉES : assises de 34 cm, blocs de 0,9 à 1,3 m à joints croisés d'une assise à l'autre.
    // Les joints sont des lignes sombres de 2 cm portées par les couleurs de sommet (aucune géométrie, aucun appel de
    // dessin de plus : le limon reste dans le matériau des marches).
    const p = lot.part(mat), hA = 0.34, J = 0.011;
    const haut = (s) => nez(s) + 0.12 - 0.03;
    for (const side of [-1, 1]) {
      const t = tc + (side * wl) / 2, Nn = [rx * side, 0, rz * side];
      const basDe = (s) => Math.min(sol(x0 + dx * s + rx * t, z0 + dz * s + rz * t) - 0.12, haut(s) - 0.1);
      // la bande du limon, du plus bas de son pied au plus haut de son dessus (le sol peut creuser au milieu)
      let yMin = Infinity, yMax = -Infinity;
      for (const s of pts) { yMin = Math.min(yMin, basDe(s)); yMax = Math.max(yMax, haut(s)); }
      for (let yk = Math.floor((yMin - 0.1) / hA) * hA; yk < yMax; yk += hA) {
        // les joints verticaux de cette assise, décalés d'un demi-bloc d'une assise à la suivante (parité : le rang
        // de l'assise compté depuis y = 0, pour que l'appareil ne dépende pas de l'endroit où la volée commence)
        const k = Math.round(yk / hA), cols = new Set([0, Lh]);
        for (let q = 0; q <= Lh; q += 0.5) cols.add(+q.toFixed(4));
        const joints = [];
        for (let q = (k & 1) * 0.55 + 0.6; q < Lh - 0.2; q += 0.9 + 0.4 * alea(q, yk, 75)) { joints.push(q); cols.add(q - J); cols.add(q); cols.add(q + J); }
        const S = [...cols].filter((q) => q >= 0 && q <= Lh).sort((u, v) => u - v);
        const rangs = [yk, yk + J, yk + hA - J, yk + hA];
        // Chaque colonne serre les quatre rangs de l'assise entre le pied et le dessus du limon ; les sommets ne sont
        // créés que pour les quadrilatères qui ne sont pas plats. Une volée monte de plusieurs mètres alors que son
        // limon n'en a que quelques décimètres : créer toute la grille faisait neuf sommets inutiles sur dix (et leur
        // patine), relecture du lot A8.
        const grille = S.map((sv) => {
          const yb = basDe(sv), yt = haut(sv);
          return { sv, yb, yt, X: x0 + dx * sv + rx * t, Z: z0 + dz * sv + rz * t, joint: joints.some((q) => Math.abs(q - sv) < 1e-4),
            y: rangs.map((Y) => Math.max(yb, Math.min(yt, Y))), i: [-1, -1, -1, -1] };
        });
        const sommet = (cl, r) => {
          if (cl.i[r] < 0) {
            const y = cl.y[r], c = col(cl.X, y, cl.Z);
            const f = (cl.joint || r === 0 || r === 3) && y > cl.yb + 1e-3 && y < cl.yt - 1e-3 ? 0.62 : 1;
            tmpC[0] = c[0] * f; tmpC[1] = c[1] * f; tmpC[2] = c[2] * f;
            cl.i[r] = lot.s(p, cl.X, y, cl.Z, Nn[0], 0, Nn[2], cl.sv / tu + side * 0.37, y / tu, tmpC);
          }
          return cl.i[r];
        };
        for (let i = 0; i < S.length - 1; i++) for (let r = 0; r < 3; r++) {
          const A = grille[i], B = grille[i + 1];
          if (Math.abs(A.y[r + 1] - A.y[r]) < 1e-4 && Math.abs(B.y[r + 1] - B.y[r]) < 1e-4) continue;       // hors du limon
          lot.quad(p, sommet(A, r), sommet(B, r), sommet(B, r + 1), sommet(A, r + 1));
        }
        if (budget()) yield;
      }
    }
    // dessus (léger chanfrein) et bouts
    lot.prisme(mat, [[-wl / 2 - 0.02, -0.07], [wl / 2 + 0.02, -0.07], [wl / 2 + 0.02, -0.015], [wl / 2 + 0.005, 0], [-wl / 2 - 0.005, 0], [-wl / 2 - 0.02, -0.015]],
      pts.map((s, i) => { const A = P(s, tc, 0); return [A[0], hauts[i], A[2]]; }), { vertical: true, couleur: col, bouts: true });
    for (const i of [0, pts.length - 1]) {
      const sgn = i === 0 ? -1 : 1, yb = Math.min(bas[i], hauts[i] - 0.1);
      lot.polygone(mat, [P(pts[i], tc - wl / 2, yb), P(pts[i], tc + wl / 2, yb), P(pts[i], tc + wl / 2, hauts[i] - 0.03), P(pts[i], tc - wl / 2, hauts[i] - 0.03)],
        [dx * sgn, 0, dz * sgn], { couleur: col });
    }
    if (budget()) yield;
  }
  // les RAMPES de fer : main courante à 0,9 m au-dessus des nez, lisse basse, barreaux tous les 12 cm, poteaux aux
  // bouts, et une VOLUTE de départ au pied de la main courante
  for (const cote of rampes) {
    const surLimon = limons.includes(cote), tc = cote * (surLimon ? larg / 2 + wl / 2 : larg / 2 - 0.06);
    const sA = 0.5 * g - 0.05, sB = Lh - 0.5 * g + 0.05, yBase = (s) => nez(s) + (surLimon ? 0.12 : 0);
    const A = P(sA, tc, 0), B = P(sB, tc, 0);
    const hr = 0.9, main = [[A[0], yBase(sA) + hr, A[2]], [B[0], yBase(sB) + hr, B[2]]];
    const mcProfil = [[-0.024, -0.02], [0.024, -0.02], [0.026, -0.004], [0.016, 0.012], [-0.016, 0.012], [-0.026, -0.004]];
    // prolongée en haut, à l'horizontale, sur 0,3 m
    const Bh = P(sB + 0.3, tc, 0);
    lot.prisme('peinture', mcProfil, [...main, [Bh[0], main[1][1], Bh[2]]], { vertical: true, bande: true, couleur: TEINTES.fer, lisse: true });
    lot.barre([A[0], yBase(sA) + 0.1, A[2]], [B[0], yBase(sB) + 0.1, B[2]], 0.03, 0.012, { couleur: TEINTES.fer });
    // (lot C6) les barreaux de 16 mm tous les 12 cm : un détail fin, de près ; de loin, un sur trois, de 27 mm (autant de
    // fer — 27² ≈ 3 x 16² —, trois fois moins de triangles ; voir Lot.maillages). (Relecture : pas tout à fait la même part
    // de noir — 27 mm tous les 36 cm couvrent un peu plus de la moitié de 16 mm tous les 12 cm —, mais au-delà de la
    // distance `fin`, ces barreaux font moins d'un demi-pixel : les paires A/B de PV07 et PV14 sont au bruit près.)
    const nb = Math.max(1, Math.round((sB - sA) / 0.12));
    for (let k = 0; k <= nb; k++) {
      const s = sA + ((sB - sA) * k) / nb, Q = P(s, tc, 0), yb = yBase(s);
      lot.barre([Q[0], yb + (surLimon ? -0.01 : 0), Q[2]], [Q[0], yb + hr - 0.02, Q[2]], 0.016, 0.016, { couleur: TEINTES.fer, haut: [dx, 0, dz], cle: 'peinture#fin' });
      if (k % 3 === 1) lot.barre([Q[0], yb + (surLimon ? -0.01 : 0), Q[2]], [Q[0], yb + hr - 0.02, Q[2]], 0.027, 0.027, { couleur: TEINTES.fer, haut: [dx, 0, dz], cle: 'peinture#loin' });
      if (k % 24 === 23 && budget()) yield;
    }
    for (const s of [sA, sB]) {
      const Q = P(s, tc, 0), yb = yBase(s);
      lot.barre([Q[0], yb - 0.02, Q[2]], [Q[0], yb + hr + 0.04, Q[2]], 0.04, 0.04, { couleur: TEINTES.fer, haut: [dx, 0, dz] });
      pommeau(lot, Q[0], yb + hr + 0.04, Q[2], 0.035);
    }
    // la volute de départ : la main courante s'enroule vers le bas, dans le plan de la rampe
    const pente = Math.atan2(h, g), cur = spirale(0, 0, Math.PI + pente, 0.07, 0.018, 1.2, 1, segs(16, 8));
    const vol = cur.map(([u, w]) => { const Q = P(sA + u, tc, 0); return [Q[0], main[0][1] + w, Q[2]]; });
    lot.prisme('peinture#fin', [[-0.011, -0.013], [0.011, -0.013], [0.011, 0.013], [-0.011, 0.013]], [main[0], ...vol],
      { haut: [rx, 0, rz], bande: true, couleur: TEINTES.fer });
    if (budget()) yield;
  }
  return lot.maillages('escalier');
}
// (lot C6) Un générateur du kit mené d'un trait (la version synchrone d'une pièce faite en tranches) : rend sa valeur.
function dUnTrait(it) {
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}
// Un pommeau de fer (boule sur un collet) posé en (x, y, z). (Lot C6 : un détail fin, de près seulement, par défaut.)
function pommeau(lot, x, y, z, r, cle = 'peinture#fin') {
  const pr = [[r * 0.55, 0], [r * 0.7, r * 0.25], [r * 0.4, r * 0.45], [r * 0.85, r * 0.8], [r, r * 1.25], [r * 0.85, r * 1.7], [r * 0.45, r * 2.0], [0.001, r * 2.1]];
  lot.tour(cle, pr, segs(10, 6), new THREE.Matrix4().makeTranslation(x, y, z), { bande: true, couleur: TEINTES.fer });
}
// Une spirale plane : part de (x0, y0) dans la direction `cap0` (radians), son rayon de courbure décroît de r0 à r1
// en `tours` tours ; `sens` : +1 elle tourne dans le sens trigonométrique, -1 dans l'autre. Rend [[x, y], ...].
function spirale(x0, y0, cap0, r0, r1, tours, sens, n) {
  const out = [];
  let x = x0, y = y0, c = cap0;
  const tot = tours * Math.PI * 2;
  for (let i = 1; i <= n; i++) {
    const f = (i - 0.5) / n, r = r0 * Math.pow(r1 / r0, f), d = tot / n;
    c += sens * d * 0.5; x += Math.cos(c) * r * d; y += Math.sin(c) * r * d; c += sens * d * 0.5;
    out.push([x, y]);
  }
  return out;
}

// ============================================================================================ 3. RUBAN (allée)
// ruban({ trace, largeur, materiau, bordure, dy, pas, arrondi })
//  trace   : [[x, z], ...] l'axe de l'allée ; ses coudes sont arrondis (rayon 1,5 x la largeur, 4 m au plus)
//  materiau: asphalteRouge (défaut), asphalte, gravier, stabilise, terreBattue, beton, dalles, dallesSombres, gazon, ou
//            le nom d'une surface des gabarits (asphalte_rouge, gravier_blanc, beton_clair, terre_battue... : nomMatiere)
//  bordure : null, 'pierre', 'beton' (bordures de 14 cm, joints tous les 90 cm) ou 'acier' (lame de 8 mm)
//  dy      : hauteur au-dessus du sol (2 cm : pas de scintillement avec le sol du monde)
// Le ruban suit le sol point par point (un sommet tous les `pas` m en long, tous les 0,6 m en large), ses UV
// courent en tuiles le long de l'allée. Les bords sont un peu plus sombres (terre, feuilles), le milieu d'un enrobé un
// peu plus clair (usé), et des taches lentes de 3 à 4 m cassent la répétition de la photo.
// (relecture du lot C6) rubanPas(o, budget) : le même, en tranches (voir escalierPas), qui rend la main tous les seize
// rangs et entre ses deux bordures — 30 m de promenade bordée prenaient 7 à 10 ms d'une traite (la première tranche de
// chaque morceau de Z03).
export function ruban(o) { return dUnTrait(rubanPas(o)); }
export function* rubanPas(o, budget = () => false) {
  const lot = new Lot('allée');
  const larg = o.largeur ?? 3, mat = nomMatiere(o.materiau || 'asphalteRouge'), dy = o.dy ?? 0.02, pas = o.pas ?? 1, tu = TUILES[mat] || 1;
  const trace = o.arrondi === false ? o.trace : arrondir(o.trace, Math.min(larg * 1.5, 4));
  const pts = reechantillonner(trace, pas), nA = Math.max(3, Math.ceil(larg / 0.6) + 1);
  const p = lot.part(mat + '#sol'), nrm = { x: 0, y: 1, z: 0 }, c = [0, 0, 0];
  const enrobe = mat.startsWith('asphalte');
  let prev = null;
  for (let j = 0; j < pts.length; j++) {
    const A = pts[Math.max(0, j - 1)], B = pts[Math.min(pts.length - 1, j + 1)], Q = pts[j];
    let tx = B.x - A.x, tz = B.z - A.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    let m = 1;
    if (j > 0 && j < pts.length - 1) { const l1 = Math.hypot(Q.x - A.x, Q.z - A.z) || 1; m = 1 / Math.max(0.35, (-tz) * (-(Q.z - A.z) / l1) + tx * ((Q.x - A.x) / l1)); }
    const rang = [];
    for (let k = 0; k < nA; k++) {
      const t = -larg / 2 + (larg * k) / (nA - 1), x = Q.x - tz * t * m, z = Q.z + tx * t * m, y = sol(x, z) + dy;
      Monde.normale(x + Monde.dx, z, nrm);
      const e = Math.abs(t) / (larg / 2);
      const f = (1 - 0.16 * lisse(0.72, 1, e)) * (1 + 0.1 * (bruit(x / 3.5, z / 3.5, 41) - 0.5)) * (enrobe ? 1 + 0.035 * (1 - e * e) : 1);
      c[0] = f; c[1] = f; c[2] = f * (enrobe ? 1 : 0.99);
      rang.push(lot.s(p, x, y, z, nrm.x, nrm.y, nrm.z, (t + larg / 2) / tu, Q.s / tu, c));
    }
    if (prev) for (let k = 0; k < nA - 1; k++) lot.quad(p, prev[k], prev[k + 1], rang[k + 1], rang[k]);
    prev = rang;
    if (j % 16 === 15 && budget()) yield;
  }
  if (o.bordure) {
    const lb = o.bordure === 'acier' ? 0.008 : 0.14;
    for (const cote of [-1, 1]) {
      if (budget()) yield;
      const bord = decaler(trace, cote * (larg / 2 + lb / 2));
      bordure({ ligne: bord, largeur: lb, hauteur: o.bordure === 'acier' ? 0.012 : 0.035, materiau: o.bordure === 'acier' ? 'acier' : o.bordure === 'beton' ? 'beton' : 'taille' }, lot);
    }
  }
  return lot.maillages('allée');
}

// ============================================================================================ 4. BORDURE
// bordure({ ligne, largeur, hauteur, materiau, prof, ferme }, [lot])
//  Bordure de pierre (taille), de béton ou d'acier (materiau 'acier' : lame de corten de 8 mm, continue) le long d'une
//  ligne : blocs d'environ 0,9 m (plus courts dans les courbes), dessus à `hauteur` au-dessus du sol, arête chanfreinée,
//  joint en V entre deux blocs, enterrés de `prof`. `ferme` : la ligne fait le tour (margelle d'un bassin).
export function bordure(o, lotExt = null) {
  const lot = lotExt || new Lot('bordure');
  const larg = o.largeur ?? 0.14, h = o.hauteur ?? 0.05, prof = o.prof ?? 0.2, mat = nomMatiere(o.materiau || 'taille');
  if (mat === 'acier') {
    const pts = reechantillonner(o.ferme ? [...o.ligne, o.ligne[0]] : o.ligne, 0.5);
    lot.prisme('peinture', [[-larg / 2, -0.12], [larg / 2, -0.12], [larg / 2, 0], [-larg / 2, 0]], pts.map((q) => [q.x, sol(q.x, q.z) + h, q.z]),
      { vertical: true, bande: true, couleur: (x, y, z) => { const v = 0.85 + 0.3 * bruit(x * 2, z * 2, 43); return [TEINTES.corten[0] * v, TEINTES.corten[1] * v, TEINTES.corten[2] * v]; } });
    return lotExt ? lot : lot.maillages('bordure');
  }
  const pts = reechantillonner(o.ligne, 0.9, !!o.ferme);
  const c = 0.012, pr = [[-larg / 2, -h - prof], [larg / 2, -h - prof], [larg / 2, -c], [larg / 2 - c, 0], [-larg / 2 + c, 0], [-larg / 2, -c]];
  // (lot C6) le détail fin, de près : les blocs chanfreinés de 0,9 m et leurs joints en V ; de loin (au-delà de la
  // distance `fin`, js/monde_vue.js), un seul ruban de section carrée le long de la ligne, posé au même sol, aux mêmes
  // couleurs — 9 triangles par mètre au lieu de 40 (voir Lot.maillages)
  const prL = [[-larg / 2, -h - prof], [larg / 2, -h - prof], [larg / 2, 0], [-larg / 2, 0]], loin = [];
  for (let j = 0; j < pts.length - 1; j++) {
    const A = pts[j], B = pts[j + 1], L = Math.hypot(B.x - A.x, B.z - A.z);
    if (L < 0.05) continue;
    const ux = (B.x - A.x) / L, uz = (B.z - A.z) / L, g0 = 0.002, e = Math.min(0.012, L / 6);
    const a = [A.x + ux * g0, sol(A.x, A.z) + h, A.z + uz * g0], b = [B.x - ux * g0, sol(B.x, B.z) + h, B.z - uz * g0];
    const t = teintePierre(A.x, A.z, 44);
    const col = (x, y, z) => { const f = 0.94 + 0.1 * bruit(x * 1.3, z * 1.3, 45); const ht = lisse(-0.05, 0.05, y - sol(x, z)); const k = f * (0.7 + 0.3 * ht); return [t[0] * k, t[1] * k, t[2] * k]; };
    lot.prisme(mat + '#fin', pr, [a, lerp3(a, b, e / L), lerp3(a, b, 1 - e / L), b], { vertical: true, echelles: [0.9, 1, 1, 0.9], couleur: col, uDecal: alea(A.x, A.z, 46), vDecal: alea(A.x, A.z, 47) });
    if (!loin.length) loin.push([A.x, sol(A.x, A.z) + h, A.z]);
    loin.push([B.x, sol(B.x, B.z) + h, B.z]);
  }
  if (loin.length > 1) {
    const t = teintePierre(o.ligne[0][0], o.ligne[0][1], 44);
    lot.prisme(mat + '#loin', prL, loin, { vertical: true, couleur: (x, y, z) => { const f = 0.94 + 0.1 * bruit(x * 1.3, z * 1.3, 45); return [t[0] * f, t[1] * f, t[2] * f]; } });
  }
  return lotExt ? lot : lot.maillages('bordure');
}

// ============================================================================================ muret (commun)
// Un muret de pierre sous une balustrade ou une grille : corps en blocs d'un mètre environ (joints en V), couronnement
// débordant de 3 cm, chanfreiné. Rend la hauteur du dessus en chaque point de `pts` ({ x, z, s }). `o.y` : le pied,
// fonction de l'abscisse s (voir hauteurLe), ou null : le sol.
function muret(lot, pts, h, ep, o = {}) {
  const corps = nomMatiere(o.materiau || 'taille'), cc = 0.08, yBase = (q) => (o.y ? o.y(q.s) : sol(q.x, q.z));
  const dessus = pts.map((q) => yBase(q) + h);
  if (h <= 0) return dessus;
  const prC = [[-ep / 2, -h - 0.15], [ep / 2, -h - 0.15], [ep / 2, -cc], [-ep / 2, -cc]];
  const e2 = ep / 2 + 0.03, prK = [[-e2, -cc], [e2, -cc], [e2, -0.018], [e2 - 0.018, 0], [-e2 + 0.018, 0], [-e2, -0.018]];
  for (let j = 0; j < pts.length - 1; j++) {
    const A = pts[j], B = pts[j + 1], L = Math.hypot(B.x - A.x, B.z - A.z);
    if (L < 0.05) continue;
    const nb = Math.max(1, Math.round(L / 1.05));
    for (let k = 0; k < nb; k++) {
      const t0 = k / nb, t1 = (k + 1) / nb, a = [A.x + (B.x - A.x) * t0, dessus[j] + (dessus[j + 1] - dessus[j]) * t0, A.z + (B.z - A.z) * t0];
      const b = [A.x + (B.x - A.x) * t1, dessus[j] + (dessus[j + 1] - dessus[j]) * t1, A.z + (B.z - A.z) * t1];
      const Lb = (L * (t1 - t0)), e = Math.min(0.012, Lb / 6), te = teintePierre(a[0], a[2], 48);
      const pat = patine((x, z) => sol(x, z), a[1], { teinte: te, force: 0.8 });
      lot.prisme(corps, prC, [a, lerp3(a, b, e / Lb), lerp3(a, b, 1 - e / Lb), b], { vertical: true, echelles: [0.97, 1, 1, 0.97], couleur: pat, uDecal: alea(a[0], a[2], 49), vDecal: alea(a[0], a[2], 50) });
      // le couronnement, décalé d'un demi-bloc (les joints ne se superposent pas)
      const ka = lerp3(a, b, 0), kb = lerp3(a, b, 1);
      lot.prisme('taille', prK, [ka, lerp3(ka, kb, e / Lb), lerp3(ka, kb, 1 - e / Lb), kb], { vertical: true, echelles: [0.985, 1, 1, 0.985],
        couleur: patine(() => a[1] - 3, a[1], { teinte: teintePierre(a[0], a[2], 51), force: 0.5 }), uDecal: alea(a[0], a[2], 52), vDecal: alea(a[0], a[2], 53) });
    }
  }
  return dessus;
}
// Les morceaux droits d'une ligne qui suit le sol (tous les `pas` m au plus) : [{ A, B, yA, yB }].
function morceauxDroits(pts, dessus) {
  const out = [];
  for (let j = 0; j < pts.length - 1; j++) out.push({ A: pts[j], B: pts[j + 1], yA: dessus[j], yB: dessus[j + 1] });
  return out;
}
// Pose le motif `geo` (repère local : x le long, y en haut, z en travers, x de 0 à `larg0`) tous les `larg` m le long
// du morceau [A, B], y compris en pente (cisaillement : les barreaux restent d'aplomb, les lisses suivent la pente).
function poserMotifs(lot, geo, larg0, m, couleur, o = {}) {
  if (!geo) return 0;
  const L = Math.hypot(m.B.x - m.A.x, m.B.z - m.A.z);
  const n = Math.max(1, Math.round(L / larg0)), u = L / n, dx = (m.B.x - m.A.x) / L, dz = (m.B.z - m.A.z) / L, pente = (m.yB - m.yA) / L;
  const sx = u / larg0, m4 = new THREE.Matrix4();
  for (let i = o.sauterPremier ? 1 : 0; i < n + (o.dernier ? 1 : 0); i++) {
    const s = i * u, ox = m.A.x + dx * s, oz = m.A.z + dz * s, oy = m.yA + pente * s + (o.dy || 0);
    m4.set(dx * sx, 0, -dz, ox,
      pente * sx, 1, 0, oy,
      dz * sx, 0, dx, oz,
      0, 0, 0, 1);
    lot.geo(o.cle || 'peinture', geo, m4, { couleur });
  }
  return n;
}
// La géométrie d'une partie de Lot (sans maillage), pour s'en servir comme motif.
function geoDe(lot, cle = 'peinture') {
  const p = lot.parts.get(cle), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p.pos.fin(), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(p.nor.fin(), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(p.uv.fin(), 2));
  g.setIndex(new THREE.BufferAttribute(p.idx.fin(), 1));
  return g;
}

// ============================================================================================ 5. BALUSTRADE DE FER FORGÉ
// balustradeFerForge({ ligne, h, muret, ep, y, travee, motif, plaque })
//  ligne  : [[x, z], ...] ; h : hauteur du fer au-dessus du muret (1,0) ; muret : hauteur du muret de pierre (0,5 ;
//           0 = le fer posé directement, sur un mur par exemple, avec `y`) ; ep : épaisseur du muret (0,42)
//  y      : hauteur absolue du pied (au lieu du sol) : nombre, profil [[s, y], ...] ou fonction (s) -> y (hauteurLe ;
//           sur un mur dont le haut suit un profil : le même profil, plus le chaperon) ; travee : écart des poteaux (1,6 m)
//  motif  : 'volutes' (défaut : paires de C adossées en « cœur », photo j1) ou 'barreaux' (barreaux et frise simple)
//  plaque : abscisse (m) d'une plaque de bronze fixée au milieu de la balustrade (mur des caves)
// Tout est en VRAI relief : fer plat de 12 x 16 mm roulé en volutes, barreaux carrés de 16 mm, main courante moulurée,
// poteaux carrés à pommeau. Environ 1 550 triangles par mètre en 'volutes' (1 050 sur téléphone), 600 en 'barreaux' :
// une balustrade de 31 m en volutes fait 48 000 triangles, les quatre cinquièmes du budget d'un morceau (§ 3.3).
const _motifs = new Map();
function motifVolutes(H) {
  const cle = 'volutes' + H.toFixed(2) + QUALITE;
  let g = _motifs.get(cle);
  if (g) return g;
  const lot = new Lot('motif'), U = 0.34, y0 = 0.075, y1 = H - 0.035, hh = y1 - y0;
  const plat = [[-0.006, -0.008], [0.006, -0.008], [0.006, 0.008], [-0.006, 0.008]];
  // le barreau de gauche (celui de droite est le barreau de gauche du motif suivant)
  lot.prisme('peinture', [[-0.008, -0.008], [0.008, -0.008], [0.008, 0.008], [-0.008, 0.008]], [[0, y0 - 0.01, 0], [0, y1 + 0.01, 0]], { haut: [0, 0, 1], bande: true });
  // deux C adossés : l'échine est un arc de cercle, chaque bout s'enroule vers l'intérieur du C
  for (const miroir of [1, -1]) {
    const X = (x) => (miroir > 0 ? x : U - x);
    const p0 = [0.19 * U, y0 + 0.14 * hh], pm = [0.47 * U, y0 + 0.5 * hh], p2 = [0.19 * U, y0 + 0.86 * hh];
    const arc = arcTrois(p0, pm, p2, segs(7, 5));
    const fin = arc[arc.length - 1], avant = arc[arc.length - 2], cHaut = Math.atan2(fin[1] - avant[1], fin[0] - avant[0]);
    const deb = arc[0], apres = arc[1], cBas = Math.atan2(deb[1] - apres[1], deb[0] - apres[0]);
    const boucleH = spirale(fin[0], fin[1], cHaut, 0.034, 0.009, 1.15, 1, segs(9, 6));
    const boucleB = spirale(deb[0], deb[1], cBas, 0.034, 0.009, 1.15, -1, segs(9, 6));
    const courbe = [...boucleB.reverse(), ...arc, ...boucleH].map(([x, y]) => [X(x), y, 0]);
    lot.prisme('peinture', plat, courbe, { haut: [0, 0, 1], bande: true, lisse: false, onglet: false });
  }
  // le collier qui serre les deux C en leur milieu
  lot.boite('peinture', 0.05, 0.03, 0.022, new THREE.Matrix4().makeTranslation(U / 2, y0 + 0.5 * hh, 0), { bande: true, chanfrein: 0.003 });
  g = geoDe(lot);
  _motifs.set(cle, g);
  return g;
}
// (lot C6) LE MOTIF DE LOIN (au-delà de la distance `fin` du préréglage, js/monde_vue.js : moins d'un pixel par
// centimètre) : le barreau, et chaque C en trois segments seulement, sans ses enroulements ni le collier — 56 triangles
// au lieu de 460. Le fer de l'échine est élargi d'autant que les enroulements ôtés (1,55 fois : 0,55 m d'échine pour 0,86 m de fer roulé par C) :
// de loin, la balustrade garde la même part de noir, la même dentelle sombre au même endroit.
function motifVolutesLoin(H) {
  const cle = 'volutesLoin' + H.toFixed(2);
  let g = _motifs.get(cle);
  if (g) return g;
  const lot = new Lot('motif'), U = 0.34, y0 = 0.075, y1 = H - 0.035, hh = y1 - y0, e = 0.006 * 1.55;
  lot.prisme('peinture', [[-0.008, -0.008], [0.008, -0.008], [0.008, 0.008], [-0.008, 0.008]], [[0, y0 - 0.01, 0], [0, y1 + 0.01, 0]], { haut: [0, 0, 1], bande: true });
  for (const miroir of [1, -1]) {
    const X = (x) => (miroir > 0 ? x : U - x);
    const arc = arcTrois([0.19 * U, y0 + 0.14 * hh], [0.47 * U, y0 + 0.5 * hh], [0.19 * U, y0 + 0.86 * hh], 3);
    lot.prisme('peinture', [[-e, -0.008], [e, -0.008], [e, 0.008], [-e, 0.008]], arc.map(([x, y]) => [X(x), y, 0]), { haut: [0, 0, 1], bande: true, lisse: false, onglet: false });
  }
  g = geoDe(lot);
  _motifs.set(cle, g);
  return g;
}
// (lot C6) De loin, la frise d'anneaux de la balustrade à barreaux n'est plus qu'un barreau.
function motifBarreauxLoin(H) {
  const cle = 'barreauxLoin' + H.toFixed(2);
  let g = _motifs.get(cle);
  if (g) return g;
  const lot = new Lot('motif'), y0 = 0.075, y1 = H - 0.035;
  lot.prisme('peinture', [[-0.008, -0.008], [0.008, -0.008], [0.008, 0.008], [-0.008, 0.008]], [[0, y0 - 0.01, 0], [0, y1 + 0.01, 0]], { haut: [0, 0, 1], bande: true });
  g = geoDe(lot);
  _motifs.set(cle, g);
  return g;
}
function motifBarreaux(H) {
  const cle = 'barreaux' + H.toFixed(2);
  let g = _motifs.get(cle);
  if (g) return g;
  const lot = new Lot('motif'), U = 0.12, y0 = 0.075, y1 = H - 0.035;
  lot.prisme('peinture', [[-0.008, -0.008], [0.008, -0.008], [0.008, 0.008], [-0.008, 0.008]], [[0, y0 - 0.01, 0], [0, y1 + 0.01, 0]], { haut: [0, 0, 1], bande: true });
  // la frise haute : un anneau entre deux barreaux
  const tore = anneau(0.045, 0.006);
  lot.geo('peinture', tore, new THREE.Matrix4().makeTranslation(U / 2, y1 - 0.09, 0), { bande: true });
  g = geoDe(lot);
  _motifs.set(cle, g);
  return g;
}
// Un anneau de fer (frise des grilles) de rayon r, fer de section t : géométrie gardée par taille.
const _anneaux = new Map();
function anneau(r, t) {
  const cle = r.toFixed(4) + ',' + t;
  let g = _anneaux.get(cle);
  if (!g) { g = new THREE.TorusGeometry(r, t, 4, segs(12, 8)); _anneaux.set(cle, g); }
  return g;
}
// Arc de cercle passant par trois points 2D (n segments).
function arcTrois(a, m, b, n) {
  const ax = a[0], ay = a[1], bx = m[0], by = m[1], cx = b[0], cy = b[1];
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return [a, m, b];
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  const r = Math.hypot(ax - ux, ay - uy);
  let t0 = Math.atan2(ay - uy, ax - ux), tm = Math.atan2(by - uy, bx - ux), t1 = Math.atan2(cy - uy, cx - ux);
  // le sens qui passe par le milieu
  const norm = (t) => ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const ccw = norm(tm - t0) < norm(t1 - t0);
  const span = ccw ? norm(t1 - t0) : -norm(t0 - t1);
  const out = [];
  for (let i = 0; i <= n; i++) { const t = t0 + (span * i) / n; out.push([ux + Math.cos(t) * r, uy + Math.sin(t) * r]); }
  return out;
}
// (lot C6) balustradePas(o, budget) : la même, en tranches (voir escalierPas) — une balustrade de 31 m en volutes
// prenait 17 à 28 ms d'une traite.
export function balustradeFerForge(o) { return dUnTrait(balustradePas(o)); }
export function* balustradePas(o, budget = () => false) {
  const lot = new Lot('balustrade');
  const h = o.h ?? 1.0, mh = o.muret ?? 0.5, ep = o.ep ?? 0.42, travee = o.travee ?? 1.6, motif = o.motif || 'volutes';
  const pts = reechantillonner(o.ligne, 3.2), yDe = o.y == null ? null : hauteurLe(o.y);
  const dessus = muret(lot, pts, mh, ep, { y: yDe });
  if (budget()) yield;
  const geo = motif === 'barreaux' ? motifBarreaux(h) : motifVolutes(h), larg0 = motif === 'barreaux' ? 0.12 : 0.34;
  // (lot C6) le motif en détail fin, de près, et sa version de loin (voir Lot.maillages et motifVolutesLoin)
  const geoLoin = motif === 'barreaux' ? motifBarreauxLoin(h) : motifVolutesLoin(h);
  const mc = [[-0.028, -0.022], [0.028, -0.022], [0.03, -0.006], [0.02, 0.012], [-0.02, 0.012], [-0.03, -0.006]];
  const segsL = morceauxDroits(pts, dessus);
  let depuisPoteau = 0;
  for (let i = 0; i < segsL.length; i++) {
    const m = segsL[i];
    poserMotifs(lot, geo, larg0, m, TEINTES.fer, { cle: 'peinture#fin' });
    poserMotifs(lot, geoLoin, larg0, m, TEINTES.fer, { cle: 'peinture#loin' });
    const A = [m.A.x, m.yA, m.A.z], B = [m.B.x, m.yB, m.B.z];
    // main courante et lisse basse
    lot.prisme('peinture', mc, [[A[0], A[1] + h, A[2]], [B[0], B[1] + h, B[2]]], { vertical: true, bande: true, couleur: TEINTES.fer, lisse: true });
    lot.prisme('peinture', [[-0.012, 0.055], [0.012, 0.055], [0.012, 0.085], [-0.012, 0.085]], [A, B], { vertical: true, bande: true, couleur: TEINTES.fer });
    // poteaux : au début, aux coudes, et tous les `travee` m
    const L = Math.hypot(m.B.x - m.A.x, m.B.z - m.A.z);
    const poteau = (t) => {
      const x = m.A.x + (m.B.x - m.A.x) * t, z = m.A.z + (m.B.z - m.A.z) * t, y = m.yA + (m.yB - m.yA) * t;
      lot.barre([x, y, z], [x, y + h + 0.02, z], 0.036, 0.036, { couleur: TEINTES.fer, haut: [(m.B.x - m.A.x) / L, 0, (m.B.z - m.A.z) / L] });
      pommeau(lot, x, y + h + 0.02, z, 0.03);
    };
    if (i === 0) poteau(0);
    let s = travee - depuisPoteau;
    while (s < L - 0.3) { poteau(s / L); s += travee; }
    depuisPoteau = L - (s - travee);
    if (i === segsL.length - 1 || pts[i + 1].coin) { poteau(1); depuisPoteau = 0; }
    if (budget()) yield;
  }
  if (o.plaque !== undefined) {
    const segsLi = segments(o.ligne), q = surLigne(segsLi, o.plaque), y = (yDe ? yDe(o.plaque) : sol(q.x, q.z)) + mh + h * 0.55;
    for (const cote of [1, -1]) plaqueBronze(lot, q.x + q.rx * cote * 0.012, y, q.z + q.rz * cote * 0.012, Math.atan2(q.rx * cote, q.rz * cote));
  }
  return lot.maillages('balustrade');
}
// Une plaque de bronze de 40 x 44 cm (la case « bronze » de l'atlas de la peinture), face tournée vers `cap` (rad).
function plaqueBronze(lot, x, y, z, cap) {
  const m4 = new THREE.Matrix4().makeRotationY(cap).setPosition(x, y, z);
  const g = new THREE.BoxGeometry(0.4, 0.44, 0.012);
  const uv = g.attributes.uv;
  // face avant (+z : faces 4) : la case (0, 1) de l'atlas (x 656 à 816, y 296 à 472 px) ; le reste : bronze uni
  for (let k = 0; k < uv.count; k++) {
    const f = Math.floor(k / 4), u = uv.getX(k), v = uv.getY(k);
    if (f === 4) uv.setXY(k, (656 + u * 160) / 1024, 1 - (472 - v * 176) / 1024); else uv.setXY(k, 700 / 1024, 1 - 300 / 1024);
  }
  lot.geo('peinture', g, m4, { couleur: BLANC });
}

// ============================================================================================ 6. GRILLE À BARREAUX
// grilleBarreaux({ ligne, h, pointes, muret, ep, pas, anneaux, travee, y, materiauMuret })
//  h : hauteur du fer au-dessus du muret (2,0) ; pointes : barreaux terminés en pointe de lance ; muret : hauteur du
//  muret (0,4) ; pas : écart des barreaux (0,12) ; anneaux : frise d'anneaux entre les deux lisses hautes (grille 156) ;
//  travee : écart des poteaux (2,4 m) ; y : pied absolu (nombre, profil [[s, y], ...] ou fonction (s) -> y, voir
//  hauteurLe ; défaut : le sol) ; materiauMuret : 'taille' (défaut), 'moellons', 'meuliere'.
// (lot C6) `partie` : 'barreau' (le barreau seul, dessiné à toute distance), 'fin' (la pointe de lance et l'anneau : le
// détail fin, de près seulement, voir Lot.maillages ; null s'il n'y en a pas) ou rien (le motif entier, comme avant).
// Une pointe de 12 cm et un anneau de 9 cm font les trois quarts des triangles d'une grille, pour moins d'un pixel au-delà
// de la distance `fin` du préréglage (js/monde_vue.js).
function motifGrille(h, pas, pointes, anneaux, partie = null) {
  if (partie === 'fin' && !pointes && !anneaux) return null;
  const cle = `grille${h.toFixed(2)},${pas.toFixed(3)},${pointes},${anneaux},${QUALITE},${partie}`;
  let g = _motifs.get(cle);
  if (g) return g;
  const lot = new Lot('motif');
  if (partie !== 'fin') lot.prisme('peinture', [[-0.009, -0.009], [0.009, -0.009], [0.009, 0.009], [-0.009, 0.009]], [[0, 0.06, 0], [0, h - (pointes ? 0.06 : 0.02), 0]], { haut: [0, 0, 1], bande: true });
  if (partie === 'barreau') { g = geoDe(lot); _motifs.set(cle, g); return g; }
  if (pointes) {
    // la pointe de lance : collet, puis fer de lance losangé (4 pans, alignés sur le barreau carré)
    const pr = [[0.0125, 0], [0.0125, 0.018], [0.008, 0.024], [0.021, 0.055], [0.012, 0.09], [0.0005, 0.125]];
    lot.tour('peinture', pr, 4, new THREE.Matrix4().makeTranslation(0, h - 0.07, 0), { bande: true, a0: Math.PI / 4, facettes: true, vif: true });
  }
  if (anneaux) {
    const r = Math.min(pas / 2 - 0.012, 0.05);
    lot.geo('peinture', anneau(r, 0.0065), new THREE.Matrix4().makeTranslation(pas / 2, h - 0.33, 0), { bande: true });
  }
  g = geoDe(lot);
  _motifs.set(cle, g);
  return g;
}
// (lot C6) grillePas(o, budget) : la même, en tranches (voir escalierPas) — 13 à 16 ms pour 48 m d'une traite.
export function grilleBarreaux(o) { return dUnTrait(grillePas(o)); }
export function* grillePas(o, budget = () => false) {
  const lot = new Lot('grille');
  const h = o.h ?? 2.0, mh = o.muret ?? 0.4, ep = o.ep ?? 0.35, pas = o.pas ?? 0.12, travee = o.travee ?? 2.4;
  const pointes = o.pointes ?? true, anneaux = !!o.anneaux;
  const pts = reechantillonner(o.ligne, 3.0);
  const dessus = muret(lot, pts, mh, ep, { y: o.y == null ? null : hauteurLe(o.y), materiau: o.materiauMuret });
  if (budget()) yield;
  // (lot C6) le barreau à toute distance, sa pointe et son anneau de près seulement (voir motifGrille)
  const geo = motifGrille(h, pas, pointes, anneaux, 'barreau'), geoFin = motifGrille(h, pas, pointes, anneaux, 'fin'), segsL = morceauxDroits(pts, dessus);
  let depuis = 0;
  for (let i = 0; i < segsL.length; i++) {
    const m = segsL[i], A = [m.A.x, m.yA, m.A.z], B = [m.B.x, m.yB, m.B.z], L = Math.hypot(m.B.x - m.A.x, m.B.z - m.A.z);
    poserMotifs(lot, geo, pas, m, TEINTES.fer);
    poserMotifs(lot, geoFin, pas, m, TEINTES.fer, { cle: 'peinture#fin' });
    // lisses : basse, haute, et la seconde lisse haute qui tient la frise
    for (const [y0, y1] of [[0.05, 0.08], [h - 0.26, h - 0.23], ...(anneaux ? [[h - 0.43, h - 0.4]] : [])]) {
      lot.prisme('peinture', [[-0.01, y0], [0.01, y0], [0.01, y1], [-0.01, y1]], [A, B], { vertical: true, bande: true, couleur: TEINTES.fer });
    }
    const poteau = (t) => {
      const x = m.A.x + (m.B.x - m.A.x) * t, z = m.A.z + (m.B.z - m.A.z) * t, y = m.yA + (m.yB - m.yA) * t;
      lot.barre([x, y, z], [x, y + h - 0.02, z], 0.06, 0.06, { couleur: TEINTES.fer, haut: [(m.B.x - m.A.x) / L, 0, (m.B.z - m.A.z) / L] });
      // (lot C6 : le fleuron du poteau, un détail fin)
      lot.tour('peinture#fin', [[0.045, 0], [0.045, 0.02], [0.03, 0.03], [0.05, 0.08], [0.035, 0.13], [0.012, 0.16], [0.02, 0.19], [0.0005, 0.25]], segs(8, 6),
        new THREE.Matrix4().makeTranslation(x, y + h - 0.02, z), { bande: true, couleur: TEINTES.fer });
    };
    if (i === 0) poteau(0);
    let s = travee - depuis;
    while (s < L - 0.4) { poteau(s / L); s += travee; }
    depuis = L - (s - travee);
    if (i === segsL.length - 1 || pts[i + 1].coin) { poteau(1); depuis = 0; }
    if (budget()) yield;
  }
  return lot.maillages('grille');
}

// ============================================================================================ 7. PORTAIL
// portail({ x, z, cap, largeur, type, h, ouvert })
//  cap : direction dans laquelle on ENTRE dans le parc (degrés : 0 = z+, 90 = x+) ; la rue est derrière (côté -cap)
//  largeur : passage entre les piliers ; type : '156' (la grille du 156 bd Saint-Denis, photo 7 : piliers de pierre
//  claire à bossages, chapiteau et boule, plaque bleue « 156 », vantaux à barreaux de lance et frise d'anneaux,
//  portillons de part et d'autre, panneau « chiens interdits ») ou 'simple' (poteaux de fer, deux vantaux)
//  ouvert : 0 (fermé) à 1 (vantaux rabattus vers l'intérieur du parc)
export function portail(o) {
  const lot = new Lot('portail');
  const larg = o.largeur ?? 4, type = o.type || '156', h = o.h ?? (type === '156' ? 2.5 : 2.0), ouvert = o.ouvert ?? 0;
  const y0 = sol(o.x, o.z), G = new THREE.Matrix4().makeRotationY(((o.cap ?? 0) * Math.PI) / 180).setPosition(o.x, y0, o.z);
  const Lm = (m) => new THREE.Matrix4().multiplyMatrices(G, m);
  const dirX = new THREE.Vector3(1, 0, 0).transformDirection(G).toArray();
  // un vantail : barreaux de lance, lisses, frise d'anneaux, montants ; `m4` place son repère (charnière à
  // l'origine, le vantail s'étend vers +x local)
  const vantail = (lw, hh, m4, anneaux) => {
    const vl = new Lot('v'), pas = 0.12, nb = Math.max(2, Math.round(lw / pas));
    for (let i = 0; i <= nb; i++) {
      const x = (lw * i) / nb, montant = i === 0 || i === nb;
      vl.prisme('peinture', [[-0.009, -0.009], [0.009, -0.009], [0.009, 0.009], [-0.009, 0.009]].map(([a, b]) => (montant ? [a * 2.6, b * 2.2] : [a, b])),
        [[x, 0.04, 0], [x, hh - (montant ? 0.02 : 0.06), 0]], { haut: [0, 0, 1], bande: true });
      if (!montant) vl.tour('peinture', [[0.0125, 0], [0.0125, 0.018], [0.008, 0.024], [0.021, 0.055], [0.012, 0.09], [0.0005, 0.125]], 4,
        new THREE.Matrix4().makeTranslation(x, hh - 0.07, 0), { bande: true, a0: Math.PI / 4, facettes: true, vif: true });
      if (anneaux && i < nb) vl.geo('peinture', anneau(Math.min(0.048, lw / nb / 2 - 0.012), 0.0065),
        new THREE.Matrix4().makeTranslation(x + lw / nb / 2, hh - 0.36, 0), { bande: true });
    }
    for (const [ya, yb] of [[0.1, 0.14], [0.95, 0.98], [hh - 0.27, hh - 0.23], ...(anneaux ? [[hh - 0.46, hh - 0.42]] : [])]) {
      vl.prisme('peinture', [[-0.012, ya], [0.012, ya], [0.012, yb], [-0.012, yb]], [[0, 0, 0], [lw, 0, 0]], { vertical: true, bande: true });
    }
    // le vantail, posé dans le repère du portail (charnière, ouverture)
    lot.geo('peinture', geoDe(vl), m4, { couleur: TEINTES.fer });
  };
  const angle = ouvert * 1.45;
  if (type === '156') {
    const pil = (cx, cote, grand) => {
      const s = grand ? 0.68 : 0.5, H = grand ? 3.0 : 2.55;
      const col = patine(() => y0, y0 + H, { force: 0.9, teinte: teintePierre(cx, cote, 80) });
      const B = (w, hh, d, y, ch, k) => lot.boite('taille', w, hh, d, Lm(new THREE.Matrix4().makeTranslation(cx, y + hh / 2, 0)),
        { chanfrein: ch, couleur: col, uvDecal: [alea(cx, y, 81 + k), alea(cx, y, 82 + k)] });
      B(s + 0.12, 0.42, s + 0.12, -0.1, 0.02, 0);                                  // socle
      let y = 0.32, k = 0;
      while (y < H - 0.36) { const hb = Math.min(0.36, H - 0.36 - y); B(s, hb - 0.006, s, y, 0.022, ++k); y += hb; }   // bossages
      B(s + 0.1, 0.1, s + 0.1, H - 0.36, 0.015, 20); B(s + 0.18, 0.09, s + 0.18, H - 0.26, 0.02, 21);   // corniche
      // chapeau en pointe de diamant, puis la boule sur son collet
      lot.tour('taille', [[(s / 2 + 0.07) * Math.SQRT2, 0], [(s / 2 + 0.07) * Math.SQRT2, 0.05], [0.06, 0.26]], 4,
        Lm(new THREE.Matrix4().makeTranslation(cx, H - 0.17, 0)), { a0: Math.PI / 4, facettes: true, vif: true, couleur: col, tuile: TUILES.taille });
      if (grand) lot.tour('taille', [[0.07, 0], [0.09, 0.03], [0.06, 0.07], [0.12, 0.12], [0.17, 0.2], [0.15, 0.3], [0.09, 0.36], [0.001, 0.38]], segs(14, 8),
        Lm(new THREE.Matrix4().makeTranslation(cx, H + 0.07, 0)), { couleur: col, tuile: TUILES.taille });
      return { s, H };
    };
    const xg = larg / 2 + 0.34, xp = xg + 0.34 + 1.05 + 0.25;
    for (const c of [-1, 1]) { pil(c * xg, c, true); pil(c * xp, c + 3, false); }
    // la plaque bleue « 156 », côté rue, sur le pilier de droite (vu de la rue) ; le panneau sur celui de gauche
    const plaque = new THREE.BoxGeometry(0.34, 0.25, 0.014), uv = plaque.attributes.uv;
    for (let k = 0; k < uv.count; k++) {
      const f = Math.floor(k / 4), u = uv.getX(k), v = uv.getY(k);
      // face -z (5) : la case de la plaque (x 648 à 824, y 64 à 192 px) ; ailleurs, l'émail bleu
      if (f === 5) uv.setXY(k, (648 + u * 176) / 1024, 1 - (192 - v * 128) / 1024); else uv.setXY(k, 660 / 1024, 1 - 100 / 1024);
    }
    lot.geo('peinture', plaque, Lm(new THREE.Matrix4().makeTranslation(-xg, 2.25, -0.34 - 0.007)), { couleur: BLANC });
    disqueAtlas(lot, Lm(new THREE.Matrix4().makeRotationY(Math.PI).setPosition(xg, 1.75, -0.34 - 0.012)), 0.17, 928, 128, 84);
    // les deux grands vantaux, et les deux portillons
    const lw = larg / 2 - 0.03;
    vantail(lw, h, Lm(new THREE.Matrix4().makeTranslation(-larg / 2 + 0.01, 0, 0).multiply(new THREE.Matrix4().makeRotationY(-angle))), true);
    vantail(lw, h, Lm(new THREE.Matrix4().makeTranslation(larg / 2 - 0.01, 0, 0).multiply(new THREE.Matrix4().makeRotationY(Math.PI + angle))), true);
    for (const c of [-1, 1]) {
      const a = c * (xg + 0.34 + 0.02), lwp = 1.01;
      vantail(lwp, 2.05, Lm(new THREE.Matrix4().makeTranslation(a, 0, 0).multiply(new THREE.Matrix4().makeRotationY(c > 0 ? 0 : Math.PI))), false);
    }
    // la serrure et la gâche, au milieu
    lot.boite('peinture', 0.1, 0.22, 0.06, Lm(new THREE.Matrix4().makeTranslation(0.06, 1.05, 0)), { bande: true, couleur: TEINTES.fer, chanfrein: 0.005 });
    // le sabot du portail (butée au sol, au milieu)
    lot.boite('taille', 0.3, 0.06, 0.2, Lm(new THREE.Matrix4().makeTranslation(0, 0.0, 0)), { chanfrein: 0.02, couleur: [0.8, 0.79, 0.76] });
  } else {
    for (const c of [-1, 1]) {
      const m = Lm(new THREE.Matrix4().makeTranslation(c * (larg / 2 + 0.06), 0, 0)), P0 = new THREE.Vector3(0, -0.2, 0).applyMatrix4(m), P1 = new THREE.Vector3(0, h + 0.15, 0).applyMatrix4(m);
      lot.barre(P0.toArray(), P1.toArray(), 0.1, 0.1, { couleur: TEINTES.fer, haut: dirX });
      lot.tour('peinture', [[0.07, 0], [0.07, 0.03], [0.045, 0.05], [0.075, 0.12], [0.05, 0.19], [0.015, 0.23], [0.025, 0.26], [0.0005, 0.33]], segs(8, 6),
        new THREE.Matrix4().makeTranslation(P1.x, P1.y, P1.z), { bande: true, couleur: TEINTES.fer });
    }
    const lw = larg / 2 - 0.02;
    vantail(lw, h, Lm(new THREE.Matrix4().makeTranslation(-larg / 2, 0, 0).multiply(new THREE.Matrix4().makeRotationY(-angle))), false);
    vantail(lw, h, Lm(new THREE.Matrix4().makeTranslation(larg / 2, 0, 0).multiply(new THREE.Matrix4().makeRotationY(Math.PI + angle))), false);
  }
  return lot.maillages('portail ' + type);
}
// Un disque (panneau rond) dont la face avant (+z local) montre un rond de l'atlas de la peinture : centre (cx, cy) et
// rayon rp en pixels de l'image de 1024 px.
function disqueAtlas(lot, m4, r, cx, cy, rp) {
  const n = 20, p = lot.part('peinture'), base = p.n, nz = new THREE.Vector3(0, 0, 1).transformDirection(m4);
  const c = new THREE.Vector3(0, 0, 0).applyMatrix4(m4);
  lot.s(p, c.x, c.y, c.z, nz.x, nz.y, nz.z, cx / 1024, 1 - cy / 1024, BLANC);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, q = new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0).applyMatrix4(m4);
    lot.s(p, q.x, q.y, q.z, nz.x, nz.y, nz.z, (cx + Math.cos(a) * rp) / 1024, 1 - (cy - Math.sin(a) * rp) / 1024, BLANC);
  }
  for (let i = 0; i < n; i++) lot.tri(p, base, base + 1 + i, base + 2 + i);
  // le chant et le dos (fer), et la patte de fixation
  const dos = new THREE.CylinderGeometry(r, r, 0.01, n).rotateX(Math.PI / 2).translate(0, 0, -0.006);
  lot.geo('peinture', dos, m4, { bande: true, couleur: TEINTES.fer });
}

// ============================================================================================ instances partagées
// Les petites pièces (bancs, candélabres, corbeilles, buis, ifs) sont dessinées UNE fois par variante, dans leur repère
// (pied à l'origine, face vers +z), puis posées : chaque instance est un maillage qui PARTAGE la géométrie du modèle
// (vingt bancs = deux géométries en mémoire ; la fusion du morceau les coud ensuite en deux blocs).
const _modeles = new Map();
function instance(cle, fabriquer, x, z, cap = 0, dy = 0, nom = cle) {
  let modele = _modeles.get(cle);
  if (!modele) { const l = new Lot(cle); fabriquer(l); modele = l.maillages(cle, 0); _modeles.set(cle, modele); }
  const g = new THREE.Group(); g.name = nom;
  const y = sol(x, z) + dy;
  for (const m of modele.children) {
    const c = new THREE.Mesh(m.geometry, m.material);
    c.castShadow = m.castShadow; c.receiveShadow = m.receiveShadow;
    c.position.set(x + Monde.dx, y, z); c.rotation.y = (cap * Math.PI) / 180;
    c.name = m.name; c.userData.kitModele = cle;
    // (lot C6 : le niveau de détail de la ferronnerie, voir Lot.maillages)
    if (m.userData.lod) { c.userData.lod = m.userData.lod; c.visible = m.visible; }
    g.add(c);
  }
  return g;
}

// ============================================================================================ 8. LAMPADAIRE
// lampadaire({ x, z, style, cap })
//  style : 'crosse' (candélabre de fonte à crosse, lanterne pendue au bout du bras : photos j1, j3), 'lanterne'
//          (lanterne posée en tête de fût, sur quatre consoles à volutes : le belvédère, photo j5), 'borne' (la même,
//          sur un fût d'un mètre : pieds d'escalier), 'moderne' (mât d'acier, tête ronde : les allées)
//  cap : direction du bras de la crosse (degrés)
// Deux matériaux : peinture (fonte noire) et verre (dépoli, qui s'allume avec `allumer()`).
function lanterneGeo(lot, m4) {
  // lanterne parisienne à quatre pans, évasée vers le haut (0,24 m en bas, 0,4 m en haut, 0,46 m de verre), chapeau
  // en pavillon à quatre pans, cheminée, crochet ; culot pendant en bas
  const M = (x, y, z) => new THREE.Matrix4().multiplyMatrices(m4, new THREE.Matrix4().makeTranslation(x, y, z));
  const r2 = Math.SQRT2, F = { bande: true, couleur: TEINTES.fer };
  lot.tour('verre', [[0.115 * r2, 0.03], [0.19 * r2, 0.49]], 4, M(0, 0, 0), { a0: Math.PI / 4, facettes: true, vif: true });
  lot.tour('peinture', [[0.13 * r2, 0], [0.13 * r2, 0.03], [0.1 * r2, 0.035]], 4, M(0, 0, 0), { ...F, a0: Math.PI / 4, facettes: true, vif: true, fond: true });
  lot.tour('peinture', [[0.2 * r2, 0.485], [0.215 * r2, 0.5], [0.215 * r2, 0.53], [0.2 * r2, 0.535]], 4, M(0, 0, 0), { ...F, a0: Math.PI / 4, facettes: true, vif: true });
  lot.tour('peinture', [[0.26 * r2, 0.53], [0.26 * r2, 0.55], [0.06 * r2, 0.7]], 4, M(0, 0, 0), { ...F, a0: Math.PI / 4, facettes: true, vif: true, fond: true });
  lot.tour('peinture', [[0.05, 0.69], [0.06, 0.72], [0.035, 0.76], [0.045, 0.8], [0.001, 0.84]], segs(8, 6), M(0, 0, 0), F);
  lot.tour('peinture', [[0.07, 0.0], [0.05, -0.04], [0.025, -0.1], [0.035, -0.13], [0.001, -0.17]], segs(8, 6), M(0, 0, 0), F);
  // les quatre montants, le long des arêtes du verre
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2, c = Math.cos(a) * r2, s = Math.sin(a) * r2;
    const A = new THREE.Vector3(0.118 * c, 0.03, 0.118 * s).applyMatrix4(m4), B = new THREE.Vector3(0.195 * c, 0.49, 0.195 * s).applyMatrix4(m4);
    lot.barre(A.toArray(), B.toArray(), 0.016, 0.016, { couleur: TEINTES.fer });
  }
}
// Un fût de fonte cannelé (16 cannelures), effilé, avec son socle octogonal et ses bagues ; rend la hauteur du haut.
function futCannele(lot, H, r0 = 0.085, r1 = 0.058) {
  const F = { bande: true, couleur: TEINTES.fonte };
  lot.tour('peinture', [[0.2, 0], [0.2, 0.06], [0.17, 0.09], [0.17, 0.34], [0.14, 0.38], [0.125, 0.5], [0.1, 0.56], [0.1, 0.6]], 8, null, { ...F, facettes: true, vif: true, a0: Math.PI / 8, dessus: true });
  const etoile = [], nc = segs(16, 10);
  for (let i = 0; i < nc * 2; i++) { const a = (i / (nc * 2)) * Math.PI * 2, r = i % 2 ? 0.86 : 1; etoile.push([Math.cos(a) * r, Math.sin(a) * r]); }
  lot.prisme('peinture', etoile.map(([x, y]) => [x * r0, y * r0]), [[0, 0.58, 0], [0, (0.58 + H) / 2, 0], [0, H, 0]],
    { haut: [0, 0, 1], bande: true, lisse: true, couleur: TEINTES.fonte, echelles: [1, (1 + r1 / r0) / 2, r1 / r0] });
  for (const y of [0.62, H * 0.62, H]) lot.tour('peinture', [[0.095, -0.02], [0.105, -0.005], [0.105, 0.015], [0.085, 0.03]], segs(12, 8), new THREE.Matrix4().makeTranslation(0, y, 0), F);
  return H;
}
export function lampadaire(o) {
  const style = o.style || 'crosse';
  return instance('lampadaire:' + style, (lot) => {
    if (style === 'moderne') {
      lot.tour('peinture', [[0.075, 0], [0.075, 0.25], [0.068, 0.3], [0.046, 4.6], [0.04, 4.65]], segs(12, 8), null, { bande: true, couleur: TEINTES.acier, dessus: true });
      lot.prisme('peinture', [[-0.02, -0.02], [0.02, -0.02], [0.02, 0.02], [-0.02, 0.02]], [[0, 4.55, 0], [0, 4.62, 0.15], [0, 4.64, 0.42]], { bande: true, couleur: TEINTES.acier, lisse: true });
      lot.tour('peinture', [[0.29, 0], [0.3, 0.025], [0.24, 0.08], [0.1, 0.11], [0.001, 0.12]], segs(18, 10), new THREE.Matrix4().makeTranslation(0, 4.56, 0.55), { bande: true, couleur: TEINTES.acier });
      lot.tour('verre', [[0.001, -0.005], [0.27, 0]], segs(18, 10), new THREE.Matrix4().makeTranslation(0, 4.56, 0.55));
      return;
    }
    if (style === 'crosse') {
      const H = futCannele(lot, 3.25);
      lot.tour('peinture', [[0.065, 0], [0.1, 0.05], [0.1, 0.09], [0.05, 0.13], [0.03, 0.2], [0.04, 0.24], [0.001, 0.28]], segs(12, 8), new THREE.Matrix4().makeTranslation(0, H, 0), { bande: true, couleur: TEINTES.fonte });
      // la crosse : le bras monte, s'avance de 0,75 m et retombe en crochet ; une volute le soutient par-dessous
      const bras = [[0, H + 0.08], [0.02, H + 0.25], [0.12, H + 0.38], [0.32, H + 0.44], [0.55, H + 0.44], [0.7, H + 0.4], [0.78, H + 0.3], [0.78, H + 0.2]];
      const lisseB = arrondir(bras, 0.08, 4).map(([zz, y]) => [0, y, zz]);
      lot.prisme('peinture', [[-0.013, -0.02], [0.013, -0.02], [0.013, 0.02], [-0.013, 0.02]], lisseB, { haut: [1, 0, 0], bande: true, couleur: TEINTES.fonte, lisse: false });
      const vol = [[0.03, H - 0.25], [0.12, H - 0.08], [0.28, H + 0.12], [0.42, H + 0.3]];
      const volC = [...arrondir(vol, 0.1, 4), ...spirale(0.42, H + 0.3, 0.9, 0.05, 0.012, 1.1, 1, segs(10, 6))].map(([zz, y]) => [0, y, zz]);
      lot.prisme('peinture', [[-0.007, -0.011], [0.007, -0.011], [0.007, 0.011], [-0.007, 0.011]], volC, { haut: [1, 0, 0], bande: true, couleur: TEINTES.fonte });
      lanterneGeo(lot, new THREE.Matrix4().makeTranslation(0, H + 0.2 - 0.86, 0.78));
      return;
    }
    // 'lanterne' et 'borne' : la lanterne en tête de fût, sur quatre consoles à volutes
    const H = style === 'borne' ? 1.0 : 2.6;
    if (style === 'borne') {
      lot.tour('peinture', [[0.14, 0], [0.14, 0.05], [0.11, 0.08], [0.09, 0.2], [0.065, 0.3], [0.06, H], [0.08, H + 0.02]], segs(12, 8), null, { bande: true, couleur: TEINTES.fonte });
    } else futCannele(lot, H, 0.075, 0.052);
    lot.tour('peinture', [[0.07, 0], [0.1, 0.04], [0.11, 0.08], [0.09, 0.1]], segs(12, 8), new THREE.Matrix4().makeTranslation(0, H, 0), { bande: true, couleur: TEINTES.fonte, dessus: true });
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
      const pts = [[0.06, H - 0.14], [0.1, H - 0.06], [0.14, H + 0.04], ...spirale(0.14, H + 0.04, 1.2, 0.03, 0.01, 0.9, 1, segs(8, 5))];
      lot.prisme('peinture', [[-0.005, -0.008], [0.005, -0.008], [0.005, 0.008], [-0.005, 0.008]], pts.map(([r, y]) => [c * r, y, s * r]), { haut: [-s, 0, c], bande: true, couleur: TEINTES.fonte });
    }
    lanterneGeo(lot, new THREE.Matrix4().makeTranslation(0, H + 0.22, 0));
  }, o.x, o.z, o.cap ?? 0, 0, 'lampadaire ' + style);
}

// ============================================================================================ 9. BANC
// banc({ x, z, cap, style, long })
//  cap : direction du regard de la personne assise (degrés) ; long : longueur (1,9 m)
//  style : 'lattes_vertes' (le banc du plateau et des allées : flasques de fonte, quatre lattes d'assise, trois de
//          dossier, vert bouteille : photos 1000051341, 1000051600, 10) ou 'ville_paris' (le banc Davioud : flasques de
//          fonte ajourées, assise et dossier d'un seul galbe de neuf lattes)
// Deux matériaux : bois (lattes, peinture verte usée : plus pâle sur le dessus, plus sombre aux arêtes) et peinture
// (la fonte, les têtes de boulon).
function latte(lot, L, pts, larg, ep, teinte) {
  // une latte à arêtes adoucies (profil octogonal), posée le long de x, section orientée par `pts` = [[z, y, angle]]
  const a = 0.008, pr = [[-larg / 2 + a, -ep / 2], [larg / 2 - a, -ep / 2], [larg / 2, -ep / 2 + a], [larg / 2, ep / 2 - a],
    [larg / 2 - a, ep / 2], [-larg / 2 + a, ep / 2], [-larg / 2, ep / 2 - a], [-larg / 2, -ep / 2 + a]];
  for (const [z, y, ang] of pts) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const prof = pr.map(([u, v]) => [u * c - v * s, u * s + v * c]);
    const col = (x, yy, zz, nx, ny) => { const use = ny > 0.7 ? 1.18 : ny < -0.5 ? 0.8 : 0.95; const t = 0.92 + 0.14 * alea(z * 7, y * 7, 90); return [teinte[0] * use * t, teinte[1] * use * t, teinte[2] * use * t]; };
    // (le profil est dessiné dans le plan (z, y) : balayé le long de +x, S est +z)
    lot.prisme('bois', prof.map(([u, v]) => [u, v]), [[-L / 2, y, z], [L / 2, y, z]], { couleur: col, lisse: false, uDecal: alea(z, y, 91), vDecal: alea(z, y, 92) });
  }
}
export function banc(o) {
  const style = o.style || 'lattes_vertes', L = o.long ?? 1.9;
  return instance(`banc:${style}:${L}`, (lot) => {
    const vert = TEINTES.vertBanc, fonte = style === 'ville_paris' ? TEINTES.vertFonte : TEINTES.fonte;
    const xs = L > 2.2 ? [-L / 2 + 0.2, 0, L / 2 - 0.2] : [-L / 2 + 0.2, L / 2 - 0.2];
    if (style === 'ville_paris') {
      // les flasques Davioud : un seul profil de fonte ajouré, extrudé sur 4 cm
      const f = new THREE.Shape();
      f.moveTo(0.3, 0); f.quadraticCurveTo(0.33, 0.02, 0.3, 0.06); f.lineTo(0.25, 0.1); f.quadraticCurveTo(0.2, 0.25, 0.25, 0.4);
      f.lineTo(0.27, 0.43); f.lineTo(-0.16, 0.45); f.quadraticCurveTo(-0.3, 0.55, -0.36, 0.86); f.lineTo(-0.41, 0.86);
      f.quadraticCurveTo(-0.36, 0.55, -0.24, 0.38); f.lineTo(-0.3, 0.06); f.quadraticCurveTo(-0.33, 0.02, -0.3, 0); f.lineTo(-0.22, 0);
      f.lineTo(-0.16, 0.3); f.quadraticCurveTo(0.02, 0.18, 0.18, 0.3); f.lineTo(0.2, 0); f.closePath();
      const trou = new THREE.Path(); trou.absellipse(0.02, 0.36, 0.07, 0.035, 0, Math.PI * 2, true); f.holes.push(trou);
      const g = new THREE.ExtrudeGeometry(f, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: segs(8, 4) });
      g.rotateY(-Math.PI / 2);                                        // profil (z, y) -> épaisseur le long de -x
      for (const x of xs) lot.geo('peinture', g, new THREE.Matrix4().makeTranslation(x + 0.02, 0, 0), { couleur: fonte, bande: true });
      // l'assise et le dossier : un seul galbe
      const galbe = [[0.2, 0.455, 0], [0.12, 0.46, 0], [0.04, 0.462, 0], [-0.04, 0.462, 0], [-0.12, 0.47, 0.25], [-0.2, 0.52, 0.75],
        [-0.26, 0.6, 1.05], [-0.3, 0.69, 1.25], [-0.33, 0.78, 1.35], [-0.36, 0.87, 1.4]];
      latte(lot, L, galbe, 0.066, 0.028, vert);
    } else {
      for (const x of xs) {
        const F = (pts, w = 0.045, hh = 0.03) => lot.prisme('peinture', [[-hh / 2, -w / 2], [hh / 2, -w / 2], [hh / 2, w / 2], [-hh / 2, w / 2]],
          pts.map(([zz, y]) => [x, y, zz]), { haut: [1, 0, 0], bande: true, couleur: fonte });
        F([[0.22, 0], [0.2, 0.2], [0.17, 0.43]]);                            // pied avant, légèrement cintré
        F([[-0.2, 0], [-0.24, 0.3], [-0.27, 0.45], [-0.31, 0.62], [-0.34, 0.86]]);   // pied arrière et montant du dossier
        F([[0.25, 0.425], [-0.27, 0.43]], 0.04, 0.03);                       // support d'assise
        lot.boite('peinture', 0.06, 0.02, 0.1, new THREE.Matrix4().makeTranslation(x, 0.01, 0.22), { bande: true, couleur: fonte });
        lot.boite('peinture', 0.06, 0.02, 0.1, new THREE.Matrix4().makeTranslation(x, 0.01, -0.2), { bande: true, couleur: fonte });
      }
      latte(lot, L, [[0.19, 0.46, 0], [0.1, 0.462, 0], [0.01, 0.464, 0], [-0.08, 0.466, 0], [-0.17, 0.468, 0]], 0.075, 0.034, vert);
      latte(lot, L, [[-0.3, 0.6, 1.4], [-0.32, 0.71, 1.4], [-0.335, 0.82, 1.4]], 0.09, 0.028, vert);
      // les têtes de boulon, deux par latte et par flasque
      for (const x of xs) for (const [zz, y] of [[0.19, 0.478], [0.1, 0.48], [0.01, 0.482], [-0.08, 0.484], [-0.17, 0.486]]) {
        lot.tour('peinture', [[0.008, 0], [0.008, 0.003], [0.001, 0.006]], 6, new THREE.Matrix4().makeTranslation(x, y, zz), { bande: true, couleur: [0.05, 0.05, 0.05] });
      }
    }
  }, o.x, o.z, o.cap ?? 0, 0, 'banc ' + style);
}

// ============================================================================================ 10. CORBEILLE
// poubelle({ x, z, cap }) : la corbeille de parc de la ville (panier de lames d'acier vert, cerclé, sur son pied).
export function poubelle(o = {}) {
  return instance('corbeille', (lot) => {
    const c = TEINTES.vertCorbeille, R = 0.25, y0 = 0.14, y1 = 0.86, n = segs(22, 14);
    lot.tour('peinture', [[0.12, 0], [0.12, 0.02], [0.05, 0.05], [0.04, y0]], segs(12, 8), null, { bande: true, couleur: c });
    // le sac, sombre, qu'on voit entre les lames
    lot.tour('peinture', [[0.001, y0 + 0.02], [R - 0.02, y0 + 0.03], [R - 0.02, y1 - 0.05], [R - 0.035, y1 - 0.02]], n, null, { bande: true, couleur: [0.02, 0.025, 0.02] });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
      lot.prisme('peinture', [[-0.016, -0.003], [0.016, -0.003], [0.016, 0.003], [-0.016, 0.003]], [[x, y0 + 0.01, z], [x, y1 - 0.02, z]],
        { haut: [x / R, 0, z / R], bande: true, couleur: c });
    }
    // trois cercles (le haut roulé), le fond
    for (const [y, e] of [[y0 + 0.05, 0.02], [0.5, 0.02], [y1 - 0.02, 0.028]]) {
      lot.tour('peinture', [[R - 0.004, y - e], [R + 0.01, y - e * 0.6], [R + 0.012, y + e * 0.6], [R - 0.004, y + e]], n, null, { bande: true, couleur: c });
    }
    lot.tour('peinture', [[0.001, y0], [R, y0]], n, null, { bande: true, couleur: c });
  }, o.x ?? 0, o.z ?? 0, o.cap ?? 0, 0, 'corbeille');
}

// ============================================================================================ végétal taillé (commun)
// Les rameaux piqués à la surface d'un topiaire (matériau « frange ») : une carte détourée par point, dressée le long
// de la normale, qui dépasse de 60 % : la silhouette n'est plus une surface lisse. `points` : [[x, y, z, nx, ny, nz]].
// `nyMax` (facultatif, relecture R2) : pas de carte là où la normale monte au-delà (le DESSUS d'une haie taillée, voir
// haieTaillee).
function frange(lot, points, taille, teinte, graine, nyMax = 2) {
  const p = lot.part('frange'), c = [0, 0, 0];
  for (const [x, y, z, nx, ny, nz] of points) {
    if (ny > nyMax) continue;
    const k = alea(x * 3.1, z * 3.1 + y, graine), s = taille * (0.75 + 0.5 * alea(x, z + y, graine + 1));
    // une tangente tirée au hasard autour de la normale
    let tx = -nz, ty = 0, tz = nx; if (Math.abs(ny) > 0.9) { tx = 1; ty = 0; tz = 0; }
    const ang = alea(x, y * 2 + z, graine + 2) * Math.PI;
    const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const ux = tx * ca + bx * sa, uy = ty * ca + by * sa, uz = tz * ca + bz * sa;
    // la carte : largeur le long de u, hauteur le long de la normale (un peu penchée vers le haut)
    const hx = nx * 0.8, hy = ny * 0.8 + 0.35, hz = nz * 0.8, hl = Math.hypot(hx, hy, hz);
    const vx = hx / hl, vy = hy / hl, vz = hz / hl;
    const cell = Math.floor(k * 4), u0 = (cell % 2) * 0.5, v0 = cell < 2 ? 0.5 : 0;
    const t = 0.9 + 0.25 * alea(z, x, graine + 3);
    const nnx = nx + 0.001, nny = ny + 0.35, nnz = nz, nl = Math.hypot(nnx, nny, nnz);
    const base = p.n;
    for (const [du, dv, uu, vv, ao] of [[-0.5, -0.5, u0 + 0.02, v0 + 0.02, 0.7], [0.5, -0.5, u0 + 0.48, v0 + 0.02, 0.7], [0.5, 0.5, u0 + 0.48, v0 + 0.48, 1], [-0.5, 0.5, u0 + 0.02, v0 + 0.48, 1]]) {
      c[0] = teinte[0] * t * ao; c[1] = teinte[1] * t * ao; c[2] = teinte[2] * t * ao;
      lot.s(p, x + (ux * du + vx * dv) * s, y + (uy * du + vy * dv) * s, z + (uz * du + vz * dv) * s, nnx / nl, nny / nl, nnz / nl, uu, vv, c);
    }
    lot.quad(p, base, base + 1, base + 2, base + 3);
  }
}
// La couleur d'un feuillage taillé : teinte de l'essence, taches lentes, plus clair en haut (jeunes pousses), plus
// sombre au pied et dans les creux.
function couleurTopiaire(teinte, pied, graine) {
  const out = [0, 0, 0];
  return (x, y, z, nx, ny) => {
    const tache = 0.86 + 0.28 * bruit(x * 0.9, z * 0.9 + y * 0.9, graine), haut = 0.92 + 0.14 * Math.max(0, ny);
    const ao = 0.62 + 0.38 * lisse(0, 0.55, y - pied);
    const f = tache * haut * ao;
    out[0] = teinte[0] * f * (0.96 + 0.08 * bruit(x * 2.3, z * 2.3, graine + 1)); out[1] = teinte[1] * f; out[2] = teinte[2] * f;
    return out;
  };
}

// ============================================================================================ 11. HAIE TAILLÉE
// haieTaillee({ ligne, h, ep, arrondi, essence, frange })
//  ligne : [[x, z], ...] ; h : hauteur (1,2) ; ep : épaisseur (0,8) ; arrondi : rayon des arêtes du dessus (0,2)
//  essence : 'troene' (défaut), 'buis', 'if', 'charmille', 'haie' (la haie sombre du belvédère)
// Le volume suit le sol, flancs légèrement fruités (plus larges au pied), bosselé par un bruit (la cisaille ne fait
// pas un plan), UV en mètres le long de la haie ; plus un semis de rameaux sur toute la surface.
export function haieTaillee(o) {
  const lot = new Lot('haie');
  const h = o.h ?? 1.2, ep = o.ep ?? 0.8, r = Math.min(o.arrondi ?? 0.2, ep / 2 - 0.02, h / 2), teinte = TEINTES[o.essence || 'troene'] || TEINTES.troene;
  const pts = reechantillonner(o.ligne, 0.25), tu = TUILES.feuillage;
  // profil (S, U), sens trigonométrique, ouvert en bas
  const prof = [[ep / 2, -0.12], [ep / 2 - 0.01, h * 0.35], [ep / 2 - 0.03, h - r]];
  for (let i = 1; i <= 3; i++) { const a = (i / 4) * Math.PI / 2; prof.push([ep / 2 - 0.03 - r + Math.cos(a) * r, h - r + Math.sin(a) * r]); }
  prof.push([0, h + 0.015]);
  for (let i = prof.length - 2; i >= 0; i--) prof.push([-prof[i][0], prof[i][1]]);
  // normales lissées du profil, périmètre
  const nP = prof.length, nrmP = [], per = [0];
  for (let i = 0; i < nP; i++) {
    const a = prof[Math.max(0, i - 1)], b = prof[Math.min(nP - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    nrmP.push([dy / l, -dx / l]);
    if (i) per.push(per[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
  }
  const p = lot.part('feuillage'), col = couleurTopiaire(teinte, 0, 60), surface = [];
  let prev = null;
  for (let j = 0; j < pts.length; j++) {
    const A = pts[Math.max(0, j - 1)], B = pts[Math.min(pts.length - 1, j + 1)], Q = pts[j];
    let tx = B.x - A.x, tz = B.z - A.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    const Sx = -tz, Sz = tx;
    let m = 1;
    if (j > 0 && j < pts.length - 1) { const l1 = Math.hypot(Q.x - A.x, Q.z - A.z) || 1; m = 1 / Math.max(0.35, Sx * (-(Q.z - A.z) / l1) + Sz * ((Q.x - A.x) / l1)); }
    const y0 = sol(Q.x, Q.z), rang = [];
    for (let i = 0; i < nP; i++) {
      const [px, py] = prof[i], [nx2, ny2] = nrmP[i];
      let x = Q.x + Sx * px * m, y = y0 + py, z = Q.z + Sz * px * m;
      const nx = Sx * nx2, ny = ny2, nz = Sz * nx2;
      const b = (bruit3(x * 2.2, y * 2.2, z * 2.2, 70) - 0.5) * 0.08 + (bruit3(x * 6.5, y * 6.5, z * 6.5, 72) - 0.5) * 0.03;
      const k = py < 0.05 ? 0 : 1;
      x += nx * b * k; y += ny * b * k; z += nz * b * k;
      const c = col(x, y - y0, z, nx, ny, nz);
      rang.push(lot.s(p, x, y, z, nx, ny, nz, Q.s / tu, per[i] / tu, c));
      if (py > 0.08 && alea(x * 5, z * 5 + y, 61) < 0.85) {
        if (Math.abs(ny2) < 0.3) {
          // (relecture R2) SUR LE FLANC, le rameau est piqué à une hauteur tirée au hasard, de 10 cm au haut du flanc,
          // pas au sommet du profil : posées rang par rang (à 35 % de la hauteur, puis au début de l'arrondi), les
          // cartes s'alignaient tous les 25 cm en deux TRAÎNÉES de feuilles sombres le long de la haie, nettes de près,
          // à hauteur d'œil (la haie de 1,8 m de la limite nord-est de Z03). Le flanc à cette hauteur : le profil
          // (fruit de 1 à 3 cm) et la même bosse que la surface.
          const yf = 0.1 + (h - r - 0.1) * alea(x * 7.3, z * 7.3 + i, 63), sg = px < 0 ? -1 : 1;
          const pf = sg * (ep / 2 - 0.01 - 0.02 * Math.min(1, yf / Math.max(0.1, h - r)));
          let xf = Q.x + Sx * pf * m, yfa = y0 + yf, zf = Q.z + Sz * pf * m;
          const bf = (bruit3(xf * 2.2, yfa * 2.2, zf * 2.2, 70) - 0.5) * 0.08 + (bruit3(xf * 6.5, yfa * 6.5, zf * 6.5, 72) - 0.5) * 0.03;
          xf += nx * (bf + 0.02); yfa += ny * (bf + 0.02); zf += nz * (bf + 0.02);
          surface.push([xf, yfa, zf, nx, ny, nz]);
        } else surface.push([x + nx * 0.02, y + ny * 0.02, z + nz * 0.02, nx, ny, nz]);
      }
    }
    if (prev) for (let i = 0; i < nP - 1; i++) lot.quad(p, prev[i], prev[i + 1], rang[i + 1], rang[i]);
    prev = rang;
    if (j === 0 || j === pts.length - 1) {
      // les bouts : une face plane (bosselée à peine), tournée vers l'extérieur
      const sg = j === 0 ? -1 : 1, base = p.n, c = col(Q.x, h * 0.5, Q.z, tx * sg, 0, tz * sg);
      for (let i = 0; i < nP; i++) { const [px, py] = prof[i]; lot.s(p, Q.x + Sx * px, y0 + py, Q.z + Sz * px, tx * sg, 0, tz * sg, px / tu, py / tu, c); }
      const tris = triangulerProfil(prof);
      for (const t of tris) lot.tri(p, base + t[0], base + t[1], base + t[2]);
    }
  }
  // (relecture R2 : plus de rameaux sur l'ARRONDI ni sur le DESSUS de la haie, là où la normale monte de plus de 0,3.
  // Dressés, vus d'en bas ou de profil contre le ciel, ils faisaient une crête de petites feuilles sombres, à
  // contre-jour, sur tout le faîte ; couchés sur le dessus (un premier essai), on voyait leur revers par la tranche, en
  // petits disques sombres posés au-dessus de la crête. Une haie taillée a le dessus ras : ce sont ses flancs qui
  // moutonnent, et la silhouette du faîte est celle de la surface, bosselée par la cisaille.)
  if (o.frange !== false) frange(lot, surface, 0.2, [teinte[0] * 1.02, teinte[1] * 1.02, teinte[2] * 1.0], 62, 0.3);
  return lot.maillages('haie');
}

// ============================================================================================ 12. BUIS, IF
// Un topiaire de révolution (profil [[r, y], ...]) bosselé, avec sa frange : sert à la boule de buis et à l'if conique.
function topiaire(lot, profil, n, teinte, graine, bosse = 0.05) {
  const p = lot.part('feuillage'), tu = TUILES.feuillage, nP = profil.length, surface = [];
  const col = couleurTopiaire(teinte, 0, graine);
  const rang = [];
  let v = 0;
  for (let i = 0; i < nP; i++) {
    const [r, y] = profil[i], a = profil[Math.max(0, i - 1)], b = profil[Math.min(nP - 1, i + 1)];
    const dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1, nr = dy / l, ny = -dr / l;
    if (i) v += Math.hypot(r - profil[i - 1][0], y - profil[i - 1][1]);
    const ligne = [];
    for (let k = 0; k <= n; k++) {
      const t = (k / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      let x = r * c, yy = y, z = r * s;
      const nx = nr * c, nz = nr * s;
      const bb = (bruit3(x * 3 + graine, yy * 3, z * 3, graine) - 0.5) * bosse * 2 + (bruit3(x * 8, yy * 8, z * 8 + graine, graine + 3) - 0.5) * bosse * 0.6;
      const kk = r > 0.02 ? 1 : 0;
      x += nx * bb * kk; yy += ny * bb * kk; z += nz * bb * kk;
      ligne.push(lot.s(p, x, yy, z, nx, ny, nz, (t * Math.max(r, 0.1)) / tu, v / tu, col(x, yy, z, nx, ny, nz)));
      if (k < n && r > 0.05 && y > 0.06 && alea(x * 7 + graine, z * 7 + yy, graine + 5) < 0.8) surface.push([x + nx * 0.015, yy + ny * 0.015, z + nz * 0.015, nx, ny, nz]);
    }
    rang.push(ligne);
  }
  for (let i = 0; i < nP - 1; i++) for (let k = 0; k < n; k++) lot.quad(p, rang[i][k], rang[i][k + 1], rang[i + 1][k + 1], rang[i + 1][k]);
  frange(lot, surface, 0.15, [teinte[0] * 1.02, teinte[1] * 1.02, teinte[2] * 1.0], graine + 7);
}
// bouleBuis({ x, z, r, aplat, essence }) : boule taillée de rayon r (0,5), aplatie (0,88), posée sur le sol.
export function bouleBuis(o) {
  const r = o.r ?? 0.5, ap = o.aplat ?? 0.88, variante = Math.floor(alea(o.x, o.z, 63) * 3), ess = o.essence || 'buis';
  return instance(`buis:${r.toFixed(2)}:${ap}:${variante}:${ess}`, (lot) => {
    const pr = [], nL = segs(10, 6);
    for (let i = 0; i <= nL; i++) { const a = -Math.PI / 2 + (i / nL) * Math.PI; pr.push([Math.max(0.001, Math.cos(a) * r), r * ap + Math.sin(a) * r * ap - 0.03]); }
    pr[0][0] = r * 0.35;                                   // le pied, un peu rentré
    topiaire(lot, pr, segs(18, 10), TEINTES[ess] || TEINTES.buis, 64 + variante * 5, 0.035);
  }, o.x, o.z, alea(o.x, o.z, 65) * 360, 0, 'boule de buis');
}
// ifConique({ x, z, h, r, essence }) : if taillé en cône à pointe arrondie (terrasse du bassin, photo j4 : 2,6 m).
// Au-delà de CONIFERE_LIBRE (5 m), ce n'est plus un if taillé (le plus haut du parc fait 3,2 m) mais un conifère en
// port libre : voir coniferLibre.
const CONIFERE_LIBRE = 5;
export function ifConique(o) {
  const h = o.h ?? 2.6, r = o.r ?? h * 0.3, variante = Math.floor(alea(o.x, o.z, 66) * 3), ess = o.essence || 'if';
  if (h > CONIFERE_LIBRE) {
    return instance(`conifere:${h.toFixed(2)}:${r.toFixed(2)}:${variante}`, (lot) => coniferLibre(lot, h, r, 81 + variante * 7),
      o.x, o.z, alea(o.x, o.z, 68) * 360, 0, 'conifère');
  }
  return instance(`if:${h.toFixed(2)}:${r.toFixed(2)}:${variante}:${ess}`, (lot) => {
    const pr = [[r * 0.8, -0.03], [r, 0.12], [r * 0.98, h * 0.22], [r * 0.82, h * 0.45], [r * 0.58, h * 0.66], [r * 0.34, h * 0.83], [r * 0.14, h * 0.95], [r * 0.04, h * 0.995], [0.001, h]];
    topiaire(lot, pr, segs(18, 10), TEINTES[ess] || TEINTES.if, 67 + variante * 5, 0.05);
  }, o.x, o.z, alea(o.x, o.z, 68) * 360, 0, 'if conique');
}
// LE CONIFÈRE EN PORT LIBRE (relecture du lot B10 : le grand conifère du théâtre de verdure et son voisin, essence
// « if_conique » de arbres.bin ; R5-T01, R5-T07, photo 5 : « un grand conifère, thuya ou cyprès »). Le cône lisse de
// l'if taillé, agrandi à 11,5 m, se lisait comme une topiaire géante. Sur les photos : un fût visible sur le premier
// mètre, puis un cône large et irrégulier, plus ventru au tiers bas, fait de MASSES DE RAMEAUX qui se recouvrent, sombres
// au creux, plus claires au bout ; une pointe effilée. On le dessine ainsi :
//  - le fût brun (peinture), qui file dans la masse ;
//  - un noyau conique sombre (pour qu'on ne voie pas le ciel entre les masses) ;
//  - des masses : des boules bosselées et aplaties, posées en spirale sur l'enveloppe, plus grosses en bas, chacune
//    claire côté dehors et sombre côté tronc (l'ombre du houppier sur lui-même) ;
//  - une frange de rameaux sur leur face extérieure, qui découpe la silhouette.
// `r` : le rayon de arbres.bin (pris vers 70 % de la hauteur) ; le plus large du houppier fait au moins 0,24 x h (R5-T01 :
// le grand conifère est à peu près deux fois plus haut que large).
function coniferLibre(lot, h, r, graine) {
  const rMax = Math.max(r, h * 0.24), yb = Math.min(1.3, h * 0.12), T = TEINTES.conifere, tu = TUILES.feuillage;
  // l'enveloppe : rayon relatif selon la hauteur relative t (0 au bas du feuillage, 1 à la pointe)
  const ENV = [[0, 0.7], [0.08, 0.92], [0.22, 1.0], [0.4, 0.9], [0.58, 0.7], [0.76, 0.46], [0.9, 0.22], [1.0, 0.02]];
  const env = (t) => {
    for (let i = 1; i < ENV.length; i++) if (t <= ENV[i][0]) { const [t0, a] = ENV[i - 1], [t1, b] = ENV[i]; return rMax * (a + ((b - a) * (t - t0)) / (t1 - t0)); }
    return 0;
  };
  // le fût
  lot.tour('peinture', [[0.2, -0.1], [0.16, 0.7], [0.12, yb + 0.6], [0.05, h * 0.75]], segs(8, 5), null, { bande: true, couleur: lin('#3b2b21') });
  // le noyau sombre
  const noyau = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; noyau.push([Math.max(0.02, env(t) * 0.62), yb + 0.15 + (h * 0.94 - yb - 0.15) * t]); }
  lot.tour('feuillage', noyau, segs(10, 6), null, { couleur: [T[0] * 0.45, T[1] * 0.45, T[2] * 0.45] });
  // les masses
  // (des masses nombreuses et petites, qui se chevauchent : grosses et peu nombreuses, elles faisaient des boules, un
  // genévrier taillé en nuages plutôt qu'un thuya. Les deux conifères du théâtre, 11,5 et 7,5 m : 25 000 triangles sur
  // PC. Sur téléphone, 60 % des masses, à moins de faces, mais plus grosses d'autant (la même surface couverte : en
  // nombre réduit seul, on voyait le noyau lisse entre elles), et 60 % de la frange : 9 000 triangles)
  const n = Math.round(13 * h * QUALITE), grossir = 1 / Math.sqrt(QUALITE), surface = [], col = [0, 0, 0];
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n, t = Math.min(0.97, Math.pow(u, 1.3) * 0.98 + (alea(k, graine, 1) - 0.5) * 0.04);
    const R = env(t), th = k * 2.39996 + (alea(k, graine, 2) - 0.5) * 0.9, d = R * (0.55 + 0.33 * alea(k, graine, 3));
    const rb = (0.16 + 0.36 * (R / rMax) * (0.7 + 0.6 * alea(k, graine, 4))) * Math.sqrt(rMax / 2.3) * grossir;
    const cx = Math.cos(th) * d, cz = Math.sin(th) * d, cy = yb + (h - yb) * t - rb * 0.15;
    const g = new THREE.SphereGeometry(rb, segs(8, 6), segs(5, 4));
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      // bosselée (les rameaux), aplatie en plateau et un peu tombante (les branches pendent au bout)
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), b = 1 + 0.4 * (bruit3((x + cx) * 2.6, (y + cy) * 2.6, (z + cz) * 2.6, graine) - 0.5);
      P.setXYZ(i, x * b, y * b * 0.6 - (y > 0 ? 0 : 0.1 * rb), z * b);
    }
    g.computeVertexNormals();
    const clair = (0.84 + 0.26 * alea(k, graine, 5)) * (0.9 + 0.2 * t), ox = cx / (d || 1), oz = cz / (d || 1);
    const couleur = (x, y, z, nx, ny, nz) => {
      // dehors clair, creux sombres : selon que la face regarde loin du tronc ou vers lui
      const dehors = 0.5 + 0.5 * (nx * ox + nz * oz), f = clair * (0.5 + 0.5 * dehors + 0.12 * Math.max(0, ny));
      col[0] = T[0] * f; col[1] = T[1] * f; col[2] = T[2] * f; return col;
    };
    lot.geo('feuillage', g, new THREE.Matrix4().makeTranslation(cx, cy, cz), { couleur, uvBoite: true, tuile: tu });
    g.dispose();
    // la frange sur la face extérieure (posée sur la peau de la masse, pas dedans)
    const nf = Math.round((6 + 14 * (rb / grossir / 0.5)) * QUALITE);
    for (let j = 0; j < nf; j++) {
      const a = alea(j, k + graine, 6) * Math.PI * 2, e = (alea(k, j + graine, 7) - 0.3) * 1.1;
      const nx = Math.cos(e) * Math.cos(th + (a - Math.PI) * 0.5), ny = Math.sin(e), nz = Math.cos(e) * Math.sin(th + (a - Math.PI) * 0.5);
      surface.push([cx + nx * rb * 1.02, cy + ny * rb * 0.62, cz + nz * rb * 1.02, nx, ny, nz]);
    }
  }
  frange(lot, surface, 0.5, [T[0] * 1.05, T[1] * 1.08, T[2] * 1.0], graine + 9);
}

// ============================================================================================ 13. MASSIF DE FLEURS
// massifFleurs({ poly, palette, densite, bombe })
//  poly : [[x, z], ...] le contour ; palette : 'tulipes' (printemps, photos 1 et 8 : tulipes, narcisses, pensées),
//         'rouge' (automne, j4 : bégonias, sauges, géraniums), 'vivaces' (partie rénovée : asters, sedums, lavandes,
//         graminées) ; densite : 1 (touffes tous les 20 à 36 cm selon la palette) ; bombe : 12 cm de terre au milieu
// Deux maillages : la terre bombée du massif (drapée sur le sol, subdivisée) et les touffes, chacune faite de deux
// cartes croisées et d'une carte couchée (vue de dessus), tirées de l'atlas de la palette par TACHES (des coulées de la
// même fleur, comme on plante un massif), normales tournées vers le ciel (une touffe s'éclaire comme le sol).
// `poids` : part de chacune des douze touffes de profil de l'atlas (tools/parc/textures_kit.py, PALETTES) ; le massif
// « rouge » est surtout rouge (bégonias, sauges, géraniums), avec quelques touffes d'accompagnement.
const PALETTES = {
  tulipes: { pas: 0.2, taille: 0.44, poids: [1, 1, 1, 1, 1, 0.7, 0.8, 0.8, 0.6, 0.9, 0.8, 0.7] },
  rouge: { pas: 0.26, taille: 0.36, poids: [3, 3, 2, 2, 3, 1, 0.8, 0.5, 0.4, 0.4, 0.6, 0.4] },
  vivaces: { pas: 0.34, taille: 0.58, poids: [1, 1, 1, 1, 1, 1, 0.8, 0.8, 0.7, 0.8, 0.6, 0.8] },
};
const cumul = (w) => { const t = w.reduce((a, b) => a + b, 0); let c = 0; return w.map((x) => (c += x / t)); };
for (const P of Object.values(PALETTES)) P.cumul = cumul(P.poids);
export function massifFleurs(o) {
  const lot = new Lot('massif'), poly = o.poly, pal = PALETTES[o.palette] ? o.palette : 'rouge', P = PALETTES[pal];
  const bombe = o.bombe ?? 0.12, tu = TUILES.terre;
  const hauteur = (x, z) => sol(x, z) + 0.02 + bombe * lisse(0, 0.8, distanceBord(x, z, poly));
  // la terre : triangulation du contour, puis subdivision régulière (tous les côtés coupés en deux, niveau commun)
  let V = poly.map(([x, z]) => [x, z]);
  let T = [];
  try { T = THREE.ShapeUtils.triangulateShape(V.map(([x, z]) => new THREE.Vector2(x, z)), []); } catch (e) { T = []; }
  let maxE = 0; for (const t of T) for (let i = 0; i < 3; i++) { const a = V[t[i]], b = V[t[(i + 1) % 3]]; maxE = Math.max(maxE, Math.hypot(a[0] - b[0], a[1] - b[1])); }
  const niveaux = Math.min(5, Math.max(0, Math.ceil(Math.log2(maxE / 0.6))));
  for (let n = 0; n < niveaux; n++) {
    const milieux = new Map(), T2 = [];
    const mil = (a, b) => { const k = a < b ? a + ',' + b : b + ',' + a; let i = milieux.get(k); if (i === undefined) { i = V.length; V.push([(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2]); milieux.set(k, i); } return i; };
    for (const [a, b, c] of T) { const ab = mil(a, b), bc = mil(b, c), ca = mil(c, a); T2.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]); }
    T = T2;
  }
  const pT = lot.part('terre#sol'), nrm = { x: 0, y: 1, z: 0 }, base = pT.n;
  for (const [x, z] of V) {
    Monde.normale(x + Monde.dx, z, nrm);
    const f = 0.85 + 0.2 * bruit(x * 1.7, z * 1.7, 93);
    lot.s(pT, x, hauteur(x, z), z, nrm.x, nrm.y, nrm.z, x / tu, z / tu, [f, f * 0.97, f * 0.94]);
  }
  for (const [a, b, c] of T) lot.tri(pT, base + a, base + b, base + c);
  // les touffes : grille décalée au pas de la palette, jitter, marge de 6 cm au bord
  const pas = P.pas / Math.sqrt(o.densite ?? 1), pF = lot.part('fleurs_' + pal), col = [0, 0, 0];
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  let rangee = 0;
  for (let z = z0 + pas / 2; z < z1; z += pas * 0.87, rangee++) {
    for (let x = x0 + pas / 2 + (rangee % 2) * pas / 2; x < x1; x += pas) {
      const jx = x + (alea(x, z, 94) - 0.5) * pas * 0.7, jz = z + (alea(x, z, 95) - 0.5) * pas * 0.7;
      if (!dansPolygone(jx, jz, poly) || distanceBord(jx, jz, poly) < 0.06) continue;
      const y = hauteur(jx, jz) - 0.02;
      // la case de l'atlas : par taches (bruit lent), un quart au hasard
      const tache = alea(jx, jz, 96) < 0.25 ? alea(jx, jz, 97) : bruit(jx / 1.4, jz / 1.4, 98);
      let cell = P.cumul.findIndex((c) => tache <= c); if (cell < 0) cell = 11;
      const dessus = 12 + Math.floor(alea(jx, jz, 99) * 4);
      const s = P.taille * (0.8 + 0.4 * alea(jx, jz, 100)), rot = alea(jx, jz, 101) * Math.PI, t = 0.86 + 0.26 * alea(jx, jz, 102);
      const carte = (c, ax, az, h0, h1, couche) => {
        const u0 = (c % 4) / 4, v0 = 1 - (Math.floor(c / 4) + 1) / 4, b = pF.n;
        const coins = couche
          ? [[-0.5, -0.5, 0.004, 0.004], [0.5, -0.5, 0.246, 0.004], [0.5, 0.5, 0.246, 0.246], [-0.5, 0.5, 0.004, 0.246]]
          : [[-0.5, 0, 0.004, 0.004], [0.5, 0, 0.246, 0.004], [0.5, 1, 0.246, 0.246], [-0.5, 1, 0.004, 0.246]];
        for (const [du, dv, uu, vv] of coins) {
          const px = couche ? jx + (ax * du - az * dv) * s : jx + ax * du * s, pz = couche ? jz + (az * du + ax * dv) * s : jz + az * du * s;
          const py = couche ? y + h0 + (du * 0.08 - dv * 0.05) * s : y + h0 + dv * (h1 - h0);
          const ao = couche ? 1 : 0.5 + 0.5 * dv;
          col[0] = t * ao; col[1] = t * ao; col[2] = t * ao;
          // normales vers le ciel (un peu vers l'extérieur de la carte) : la touffe s'éclaire comme le sol
          lot.s(pF, px, py, pz, (couche ? 0 : -az * 0.25), 1, (couche ? 0 : ax * 0.25), u0 + uu, v0 + vv, col);
        }
        lot.quad(pF, b, b + 1, b + 2, b + 3);
      };
      const ca = Math.cos(rot), sa = Math.sin(rot);
      carte(cell, ca, sa, -0.03 * s, 0.97 * s, false);
      carte(cell, -sa, ca, -0.03 * s, 0.97 * s, false);
      carte(dessus, ca, sa, 0.62 * s, 0, true);
    }
  }
  const g = lot.maillages('massif ' + pal);
  for (const m of g.children) if (m.material.alphaTest > 0) { m.castShadow = false; m.userData.feuillage = true; }
  return g;
}

// ============================================================================================ 14. EAU D'UN BASSIN
// eauBassin({ poly, y, couleur }) : la surface de l'eau (polygone à la hauteur y ; par défaut 10 cm sous le sol le
// plus bas du contour), rides animées : deux cartes de normales qui défilent en sens contraires, l'une sur la surface,
// l'autre dans la couche vernie (clearcoat) qui porte le reflet du ciel. Marquée `dynamique` et `nofuse`.
const _eaux = new Map();
function eauMateriau(nom) {
  let m = _eaux.get(nom);
  if (m) return m;
  const couleur = nom.split(':')[1] || '#6f8e8a';
  m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(couleur), roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04,
    normalScale: new THREE.Vector2(0.35, 0.35), clearcoatNormalScale: new THREE.Vector2(0.22, 0.22), envMapIntensity: 1.1 });
  const n1 = neutre(128, 128, 255, false, nom);
  m.normalMap = n1; m.clearcoatNormalMap = n1;
  charger(KIT + 'eau_normale.webp', false).then((t) => {
    if (!t) return;
    const a = t.clone(), b = t.clone(); a.needsUpdate = true; b.needsUpdate = true;
    b.repeat.set(0.63, 0.63); b.rotation = 0.6;
    m.normalMap = a; m.clearcoatNormalMap = b; m.userData.rides = [a, b];
  });
  m.name = 'kit · ' + nom; m.userData.kit = nom;
  _eaux.set(nom, m);
  return m;
}
export function eauBassin(o) {
  const poly = o.poly, mat = eauMateriau('eau:' + (o.couleur || '#6f8e8a'));
  const y = o.y ?? Math.min(...poly.map(([x, z]) => sol(x, z))) - 0.1;
  const forme = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(forme).rotateX(-Math.PI / 2);
  const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 3, pos.getZ(i) / 3);
  const m = new THREE.Mesh(g, mat);
  m.position.set(Monde.dx, y, 0); m.receiveShadow = true; m.castShadow = false; m.name = 'eau du bassin';
  m.userData.dynamique = true; m.userData.nofuse = true;
  // les rides : une seule mise à jour par image, quel que soit le nombre de bassins
  m.onBeforeRender = () => {
    const r = mat.userData.rides; if (!r) return;
    const t = performance.now() / 1000;
    if (mat.userData.t === t) return;
    mat.userData.t = t;
    r[0].offset.set(t * 0.012, t * 0.007); r[1].offset.set(-t * 0.009, t * 0.011);
  };
  const grp = new THREE.Group(); grp.name = 'bassin'; grp.add(m);
  return grp;
}

// ============================================================================================ FUSION d'un groupe
// Coud, dans `groupe`, les maillages statiques de même matériau et mêmes réglages d'ombre (même règle que
// optimiserDecor de js/court.js, restreinte au groupe, et qui tient compte de sa transformation). Les maillages
// marqués nofuse / dynamique (l'eau), transparents, instanciés ou qui ont des enfants ne bougent pas.
// (lot C6) EN TRANCHES : fusionnerPas(groupe, budget), un générateur qui rend la main entre deux objets et deux familles
// quand `budget()` le demande — `yield* kit.fusionnerPas(g, ctx.budget)` à la fin de la construction d'un morceau. Les
// sommets de chaque objet sont écrits DIRECTEMENT dans les tableaux du bloc, transformés (positions ; normales par la
// matrice des normales, renormalisées), le reste recopié tel quel : la même géométrie que mergeGeometries sur des
// copies transformées, sans les copies. (D'une traite, la fusion d'un morceau de la promenade ou du coteau prenait 10 à
// 15 ms, la plus longue tranche du morceau.) Dans la clé, en plus : la taille et le type de chaque attribut (une famille
// aux attributs dépareillés, que mergeGeometries refusait, est fondue en sous-familles).
export function fusionner(groupe) { return dUnTrait(fusionnerPas(groupe)); }
export function* fusionnerPas(groupe, budget = () => false) {
  groupe.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(groupe.matrixWorld).invert(), familles = new Map();
  const protege = (o) => { for (let n = o; n && n !== groupe.parent; n = n.parent) if (n.userData && (n.userData.nofuse || n.userData.dynamique)) return true; return false; };
  groupe.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.children.length || protege(o)) return;
    const m = o.material, g = o.geometry;
    if (!m || Array.isArray(m) || m.transparent || !g || !g.index) return;
    // (lot C6 : le niveau de détail de la ferronnerie dans la clé — le détail fin, sa version lointaine et le reste ne se
    // mêlent pas ; voir Lot.maillages)
    const at = Object.keys(g.attributes).sort().map((k) => { const a = g.attributes[k]; return k + a.itemSize + (a.isInterleavedBufferAttribute ? 'i' : a.array.constructor.name) + (a.normalized ? 'n' : ''); });
    const cle = [m.uuid, o.castShadow, o.receiveShadow, at.join(','), o.userData.lod || ''].join('#');
    if (!familles.has(cle)) familles.set(cle, []);
    familles.get(cle).push(o);
  });
  if (budget()) yield;
  let blocs = 0;
  const mt = new THREE.Matrix4(), mn = new THREE.Matrix3();
  for (const lot of familles.values()) {
    if (lot.length < 2) continue;
    const g0 = lot[0].geometry, noms = Object.keys(g0.attributes);
    let nv = 0, ni = 0;
    for (const o of lot) { nv += o.geometry.attributes.position.count; ni += o.geometry.index.count; }
    const dst = {};
    for (const k of noms) {
      const a = g0.attributes[k], vec = k === 'normal' || k === 'tangent';
      const Tab = a.isInterleavedBufferAttribute || vec ? Float32Array : a.array.constructor;
      dst[k] = { a: new Tab(nv * a.itemSize), n: a.itemSize, norm: vec ? false : a.normalized };
    }
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let ov = 0, oi = 0;
    for (const o of lot) {
      const g = o.geometry, n = g.attributes.position.count, e = mt.multiplyMatrices(inv, o.matrixWorld).elements, q = mn.getNormalMatrix(mt).elements;
      for (const k of noms) {
        const s = g.attributes[k], d = dst[k], D = d.a, it = d.n, base = ov * it;
        if (k === 'position') {
          for (let i = 0; i < n; i++) {
            const x = s.getX(i), y = s.getY(i), z = s.getZ(i), j = base + i * 3;
            D[j] = e[0] * x + e[4] * y + e[8] * z + e[12]; D[j + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; D[j + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
          }
        } else if ((k === 'normal' || k === 'tangent') && it >= 3) {
          for (let i = 0; i < n; i++) {
            const x = s.getX(i), y = s.getY(i), z = s.getZ(i), j = base + i * it;
            const nx = q[0] * x + q[3] * y + q[6] * z, ny = q[1] * x + q[4] * y + q[7] * z, nz = q[2] * x + q[5] * y + q[8] * z, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            D[j] = nx / l; D[j + 1] = ny / l; D[j + 2] = nz / l;
            if (it === 4) D[j + 3] = s.getW(i);
          }
        } else if (!s.isInterleavedBufferAttribute && s.array.constructor === D.constructor) D.set(s.array.subarray(0, n * it), base);
        else for (let i = 0; i < n; i++) for (let c = 0; c < it; c++) D[base + i * it + c] = s.getComponent(i, c);
      }
      const I = g.index.array;
      for (let i = 0; i < g.index.count; i++) idx[oi + i] = I[i] + ov;
      oi += g.index.count; ov += n;
      if (budget()) yield;
    }
    const g = new THREE.BufferGeometry();
    for (const k of noms) g.setAttribute(k, new THREE.BufferAttribute(dst[k].a, dst[k].n, dst[k].norm));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    const b = new THREE.Mesh(g, lot[0].material);
    b.castShadow = lot[0].castShadow; b.receiveShadow = lot[0].receiveShadow; b.name = lot[0].name;
    if (lot[0].userData.feuillage) b.userData.feuillage = true;
    if (lot[0].userData.lod) { b.userData.lod = lot[0].userData.lod; b.visible = lot[0].visible; }
    groupe.add(b); blocs++;
    for (const o of lot) { o.parent.remove(o); if (!o.userData.kitModele) o.geometry.dispose(); }
    if (budget()) yield;
  }
  // (les groupes vidés restent : ils ne coûtent rien et gardent leur nom)
  return blocs;
}

// ============================================================================================ PAGE DE DÉMONSTRATION
// ?debug=1&kit=1 : toutes les pièces du kit alignées sur le plateau (repère du terrain 1 ; le plus parlant est le
// terrain « parc »), chacune dans son groupe `KIT:<pièce>`, fondue comme le serait un morceau de zone. Dans la console :
//   __kit.bilan()     appels de dessin, triangles et temps de construction de chaque pièce (console.table)
//   __kit.vue(n)      caméra libre sur la pièce n (0 : vue d'ensemble ; __kit.vues pour la liste) ; __kit.vue() rend la main
//   __kit.allumer(1)  les lanternes allumées (0 : éteintes)
//   await __perf('KIT:balustrade')   le budget d'un groupe, par l'outil commun (js/debug_monde.js)
export function demoKit(game) {
  const scene = game.scene;
  reglerRendu(game.renderer);
  const ancien = scene.getObjectByName('KIT : démonstration');
  if (ancien) scene.remove(ancien);
  const racine = new THREE.Group(); racine.name = 'KIT : démonstration';
  const mesures = [];
  // `plat` : une pièce couchée sur le sol (allées, massifs, bassin). Posée SUR l'enrobé du plateau, elle entrerait dans
  // son occlusion cuite et dans la carte fixe des ombres de contact (js/court.js, js/ombres_contact.js), qui la
  // prendraient pour un objet posé et noirciraient tout son rectangle. Dans le parc entier les allées sont sur le sol
  // du monde, hors du plateau : on ne les écarte de ces cuissons que sur cette page (drapeau `dynamique`, APRÈS la fusion).
  const piece = (nom, fabriquer, plat = false) => {
    const t0 = performance.now(), g = new THREE.Group();
    g.name = 'KIT:' + nom; g.userData.morceau = g.name;
    const r = fabriquer();
    for (const x of Array.isArray(r) ? r : [r]) g.add(x);
    const ms = performance.now() - t0;
    fusionner(g);
    if (plat) g.traverse((o) => { o.userData.dynamique = true; });
    racine.add(g);
    mesures.push({ nom, ms });
  };
  // -------- rangée du fond (z ≈ -8) : le mur des caves en petit, sa balustrade, un escalier à rampes
  piece('mur', () => murPierre({ ligne: [[-22.5, -8.4], [-10.5, -8.4]], cote: 'gauche', yBas: 0, yHaut: 3.0, ep: 0.7, chaperon: 0.18,
    ouvertures: [{ type: 'fenetre', s0: 1.3, s1: 2.35, bas: 0.95, haut: 2.35 }, { type: 'soupirail', s0: 3.6, s1: 4.3, bas: 0.12, haut: 0.52 },
      { type: 'oculus', s0: 3.65, s1: 4.25, bas: 1.4 }, { type: 'porte', s0: 5.45, s1: 6.55, bas: 0, haut: 2.15 },
      { type: 'oculus', s0: 7.2, s1: 7.8, bas: 1.4 }, { type: 'fenetre', s0: 8.6, s1: 9.65, bas: 0.95, haut: 2.35 },
      { type: 'soupirail', s0: 10.4, s1: 11.1, bas: 0.12, haut: 0.52 }] }));
  piece('balustrade', () => balustradeFerForge({ ligne: [[-22.3, -8.4], [-10.7, -8.4]], y: 3.18, muret: 0, h: 1.0, plaque: 5.8 }));
  piece('escalier', () => escalier({ de: [-9.6, -7.5, 0], a: [-4.4, -7.5, 3.0], marches: 16, largeur: 1.4, limon: true, mainCourante: 'deux' }));
  piece('balustrade_muret', () => balustradeFerForge({ ligne: [[-3.6, -8.6], [5.8, -8.6]], muret: 0.5, h: 1.0 }));
  // -------- deuxième rangée (z ≈ -3) : grille 156 et son portail, les candélabres, les bancs, la corbeille
  piece('grille', () => [grilleBarreaux({ ligne: [[-22.5, -3.2], [-16.9, -3.2]], muret: 0.4, h: 2.0, anneaux: true }),
    grilleBarreaux({ ligne: [[-9.1, -3.2], [-6.4, -3.2]], muret: 0.4, h: 2.0, anneaux: true })]);
  piece('portail', () => portail({ x: -13.0, z: -3.2, cap: 0, largeur: 3.2, type: '156' }));
  piece('portail_simple', () => portail({ x: -5.2, z: -1.2, cap: 90, largeur: 2.4, type: 'simple', ouvert: 0.35 }));
  piece('lampadaires', () => [lampadaire({ x: -3.2, z: -3.4, style: 'crosse', cap: 0 }), lampadaire({ x: -1.6, z: -3.4, style: 'lanterne' }),
    lampadaire({ x: -0.4, z: -3.4, style: 'borne' }), lampadaire({ x: 0.9, z: -3.4, style: 'moderne', cap: 0 })]);
  piece('bancs', () => [banc({ x: 2.6, z: -3.3, cap: 0, style: 'lattes_vertes' }), banc({ x: 5.0, z: -3.3, cap: 0, style: 'ville_paris' })]);
  piece('corbeille', () => poubelle({ x: 3.85, z: -3.6 }));
  // -------- rangée du milieu (z de 0,5 à 4) : les allées, une par matériau, et une allée courbe bordée
  const sols = ['asphalteRouge', 'asphalte', 'gravier', 'stabilise', 'terreBattue', 'beton', 'dalles', 'dallesSombres', 'gazon', 'betonLisse'];
  piece('allees', () => sols.map((m, i) => ruban({ trace: [[-22 + i * 2.35, 0.6], [-22 + i * 2.35, 3.9]], largeur: 1.9, materiau: m,
    bordure: i === 0 ? 'pierre' : i === 1 ? 'acier' : i === 5 ? 'beton' : null })), true);
  piece('allee_courbe', () => ruban({ trace: [[0.8, 0.4], [3.2, 1.2], [3.6, 3.2], [5.6, 4.2]], largeur: 1.6, materiau: 'asphalteRouge', bordure: 'pierre' }), true);
  // -------- les matières du kit en blocs d'échantillon (z ≈ 4,5), bois peint dans les couleurs du musée
  piece('matieres', () => {
    const lot = new Lot('échantillons');
    const liste = [['moellons'], ['taille'], ['meuliere'], ['brique'], ['briquePassee'], ['ardoise'], ['beton'], ['betonLisse'], ['bois', TEINTES.vertBanc], ['bois', TEINTES.rougeMusee],
      ['bois', TEINTES.bleuMusee], ['bois', TEINTES.jauneMusee], ['peinture', TEINTES.fer], ['feuillage', TEINTES.buis], ['feuillage', TEINTES.if]];
    liste.forEach(([m, c], i) => lot.boite(m, 0.6, 0.6, 0.6, new THREE.Matrix4().makeTranslation(-22.3 + i * 0.95, 0.3, 4.55),
      { chanfrein: 0.02, couleur: c || BLANC, bande: m === 'peinture' }));
    return lot.maillages('échantillons');
  });
  // -------- rangée de devant (z ≈ 5 à 8,5) : haie, buis, ifs, trois massifs, un bassin et sa margelle
  piece('haie', () => haieTaillee({ ligne: [[-22.5, 8.3], [-17.2, 8.3], [-17.2, 5.6]], h: 1.3, ep: 0.8, essence: 'troene' }));
  piece('buis', () => [bouleBuis({ x: -15.6, z: 6.4, r: 0.42 }), bouleBuis({ x: -14.2, z: 6.9, r: 0.6 }), bouleBuis({ x: -15.0, z: 8.0, r: 0.32 })]);
  piece('ifs', () => [ifConique({ x: -12.2, z: 7.1, h: 2.7 }), ifConique({ x: -10.4, z: 7.1, h: 2.0 })]);
  piece('massif_tulipes', () => massifFleurs({ poly: [[-8.8, 5.2], [-5.6, 5.2], [-5.2, 6.8], [-5.6, 8.4], [-8.8, 8.4], [-9.2, 6.8]], palette: 'tulipes' }), true);
  const ellipse = (cx, cz, rx, rz, n = 18) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cz + Math.sin((i / n) * Math.PI * 2) * rz]);
  piece('massif_rouge', () => massifFleurs({ poly: ellipse(-3.2, 6.8, 1.7, 1.5), palette: 'rouge' }), true);
  piece('massif_vivaces', () => massifFleurs({ poly: [[-0.8, 5.2], [2.0, 5.4], [2.2, 8.5], [-0.8, 8.4]], palette: 'vivaces' }), true);
  const bassin = [[3.0, 5.4], [5.9, 5.4], [5.9, 8.4], [3.0, 8.4]];
  piece('bassin', () => [eauBassin({ poly: bassin, y: 0.24 }), bordure({ ligne: bassin, ferme: true, largeur: 0.3, hauteur: 0.36, prof: 0.1 })], true);
  scene.add(racine);
  scene.updateMatrixWorld(true);

  // les vues : [caméra, cible]
  const vues = [
    ['ensemble', [10, 17, 1], [-9, 0, -0.5], 62],
    ['mur', [-13.5, 1.8, -4.5], [-17.5, 1.5, -8.4]],
    ['balustrade', [-17.2, 4.55, -6.9], [-15.2, 3.75, -8.4], 50],
    ['escalier', [-11.6, 1.5, -6.1], [-7.5, 1.2, -7.5]],
    ['portail (côté rue)', [-12.2, 1.75, -7.4], [-13.4, 1.8, -3.2], 60],
    ['candélabres', [-1.2, 2.6, 0.2], [-1.6, 2.2, -3.4], 58],
    ['bancs', [3.6, 1.3, -0.9], [3.8, 0.45, -3.4]],
    ['allées', [-12, 3.2, 7.6], [-12, 0, 2.2]],
    ['haie, buis, ifs', [-13.8, 1.7, 2.6], [-15.2, 0.9, 7.2], 60],
    ['massifs', [-4.2, 1.7, 3.0], [-4.2, 0.1, 7.0], 62],
    ['bassin', [2.2, 1.6, 2.0], [4.4, 0.2, 6.6], 62],
    ['balustrade (muret)', [1, 1.4, -6.4], [1, 0.9, -8.6]],
    ['volutes de près', [-19.6, 3.95, -7.4], [-19.6, 3.8, -8.4]],
    ['grille 156 de près', [-13.6, 2.2, -4.6], [-13.9, 2.15, -3.2], 50],
    ['lanterne de près', [-2.3, 3.0, -1.6], [-3.2, 2.8, -2.7]],
    ['matières', [-16.6, 1.5, 2.2], [-16.6, 0.35, 4.55], 60],
    ['oculus de près', [-18.2, 1.8, -6.7], [-18.55, 1.7, -8.4], 50],
  ];

  const dec = () => (!Monde.plat ? Monde.dx : ((scene.userData.reperes || {}).plateau === 2 ? 16.1 : 0));
  const cam = game.camera;
  let fovAvant = null;
  const vue = (n) => {
    if (n === undefined || n === null) { game.freeCam = false; if (fovAvant !== null) { cam.fov = fovAvant; cam.updateProjectionMatrix(); fovAvant = null; } return 'caméra du jeu'; }
    const v = typeof n === 'number' ? vues[n] : vues.find((x) => x[0] === n);
    if (!v) return 'vue inconnue (voir __kit.vues)';
    if (fovAvant === null) fovAvant = cam.fov;
    game.freeCam = true;
    const d = dec();
    cam.position.set(v[1][0] + d, v[1][1], v[1][2]); cam.up.set(0, 1, 0); cam.lookAt(v[2][0] + d, v[2][1], v[2][2]);
    cam.fov = v[3] || 55; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    return v[0];
  };
  const bilan = () => {
    const lignes = mesures.map(({ nom, ms }) => {
      const g = racine.getObjectByName('KIT:' + nom);
      let appels = 0, tri = 0;
      g.traverse((o) => { if (o.isMesh && o.visible) { appels++; tri += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
      return { pièce: nom, appels, triangles: Math.round(tri), 'construction (ms)': +ms.toFixed(1) };
    });
    console.table(lignes);
    return lignes;
  };
  window.__kit = { racine, vue, vues: vues.map((v, i) => `${i} : ${v[0]}`), bilan, allumer, precharger };
  console.info('[kit] démonstration posée sur le plateau : __kit.vue(0 à ' + (vues.length - 1) + '), __kit.bilan(), __kit.allumer(1)');
  return racine;
}
