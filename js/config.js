// Toutes les dimensions sont en mètres (terrain NBA/FIBA : 28 x 15 m)
export const COURT = {
  L: 28, W: 15,
  HOOP_Y: 3.05,        // hauteur du cercle
  HOOP_Z: -12.425,     // centre du cercle (1,575 m de la ligne de fond)
  BOARD_Z: -12.8,      // panneau (1,2 m de la ligne de fond)
  RIM_R: 0.225,        // rayon du cercle
  RIM_TUBE: 0.02,
  THREE_R: 7.24,       // arc à 3 points
  CORNER_X: 6.6,       // ligne droite des corners
  CORNER_Z: -9.45,     // z où l'arc rejoint la ligne droite
};

// Les deux paniers : sgn = -1 (côté z négatif) et +1
export const HOOPS = [
  { sgn: -1, x: 0, y: 3.05, z: -12.425 },
  { sgn: 1, x: 0, y: 3.05, z: 12.425 },
];

export const BALL_R = 0.12;
export const G = 9.81;

// Zone de déplacement des joueurs pendant un match (terrain entier)
export const BOUNDS = { xMin: -7.3, xMax: 7.3, zMin: -13.8, zMax: 13.8 };
// demi-terrain : on ne joue que la moitié du panier A, les deux équipes attaquent le même panier
export const HALF_BOUNDS = { xMin: -7.3, xMax: 7.3, zMin: -13.8, zMax: 1.6 };
// remise en jeu au-dessus de l'arc (« check ball »). `let` : appliquerTerrain la recale sur l'arc du terrain
// (liaison vivante des modules ES : les importateurs voient la nouvelle valeur).
export let HALF_CHECK_Z = -3.2;
// Zone de balade libre (toute l'enceinte grillagée)
export const YARD = { xMin: -9.2, xMax: 9.2, zMin: -14.6, zMax: 14.6 };
// Cercle bleu qui lance le match
export const RING = { x: 0, z: 0, r: 1.2, hold: 1.0 };

export const SHOT_CLOCK = 14;
export const METER_TIME = 0.95;      // secondes pour remplir la jauge
export const PERFECT_CENTER = 0.72;  // position de la zone verte dans la jauge (0..1)
// Zone de confort du tir (m) : au-delà, l'adresse baisse continûment. Avant, un tir à 7 m et une bombe à 13 m
// avaient exactement la même chance, ce qui enlevait toute notion de bonne position.
// L'arc est a 7,24 m dans l'axe et 6,6 m au corner : une reference plus lointaine rendait le tir MEILLEUR en reculant.
export const RANGE = { midRef: 3.2, midK: 0.030, threeRef: 6.9, threeK: 0.052, floor: 0.42 };

export const DIFFICULTY = {
  facile:    { speed: 0.82, skill: 0.70, aggro: 0.5, label: 'Facile' },
  normal:    { speed: 0.95, skill: 1.00, aggro: 1.0, label: 'Normal' },
  difficile: { speed: 1.06, skill: 1.25, aggro: 1.6, label: 'Difficile' },
};


// =====================================================================
//  LES COTES DEPENDENT DU TERRAIN
// =====================================================================
// La Cage et le playground Rudy Gobert sont a la taille reglementaire. Le 144 quai de Jemmapes, lui, est un
// playground de ville coince entre un lycee et le canal : il est nettement plus court et plus etroit, et ca se
// voit tout de suite sur les photos. Reproduire son decor sur un terrain reglementaire, c'est rater ce qui le
// caracterise le plus — l'exiguite.
//
// Tout le jeu lit COURT, HOOPS, BOUNDS… par REFERENCE : il suffit donc de muter ces objets UNE FOIS au
// demarrage, avant la construction de la partie, et tout suit — l'IA, les cameras, la portee des tirs, le
// trace au sol. C'est la raison pour laquelle rien n'est recopie dans des variables locales au chargement des
// modules, a une exception pres : HOOP_VEC (js/util.js), qu'on remet a jour ici.
//
// `enc` = demi-dimensions de l'enceinte grillagee ; `yard` en decoule dans chaque decor.
export const TERRAINS_DIMS = {
  // La Cage : le fond de l'enceinte passe de 16 a 15 m (06/10/2026). Le scan de Haythem (assets/cage_scan.glb) met le
  // grillage et le mur du fond a 1,8 - 2,2 m derriere le dos du panneau A, et le releve OpenStreetMap de l'enceinte fait
  // 29,8 m de long : a 16 m il y avait 3,2 m de bitume entre le panneau et le grillage, on voyait un long degagement
  // la ou, sur place, le poteau du panier est presque contre le grillage. La LARGEUR ne bouge pas (l'enceinte reelle
  // n'a que 14,6 m, plus etroite que le terrain reglementaire : la camera de diffusion se tient a x = 9,2 dans l'enceinte).
  becon:     { L: 28, W: 15, threeR: 7.24, cornerX: 6.6, enc: { X: 9.6, Z: 15.0 } },
  // L'enceinte est nettement plus large que le terrain : sur les photos il y a un vrai DEGAGEMENT entre le
  // gradin et la ligne de touche — deux bons metres de bitume nu avant que la fresque ne commence. A 9,6 m
  // la face avant du gradin arrivait a 22 cm de la ligne : les bancs touchaient le terrain et la ligne de
  // touche disparaissait dessous. Les cotes de JEU ne bougent pas, c'est le pourtour qui s'ouvre.
  // ... mais SEULEMENT de ce cote-la. En elargissant les deux cotes a la fois, la bande cote Seine passait de
  // 2,1 a 4,9 m et devenait un grand tapis de bitume vide qui n'existe pas : sur les photos, de ce cote, on a
  // deux metres et demi entre la ligne de touche et la bordure basse du quai, pas davantage.
  // `X` = demi-largeur cote gradin, `XP` = demi-largeur cote Seine. Quand XP est absent l'enceinte est
  // symetrique, ce qui est le cas des deux autres terrains — ils ne voient donc aucune difference.
  levallois: { L: 28, W: 15, threeR: 7.24, cornerX: 6.6, enc: { X: 12.4, XP: 10.0, Z: 16.0 } },
  // Releve sur la vue aerienne : le terrain tient tout juste entre les deux clotures, et il est VRAIMENT
  // petit — 21 x 11,5 m la ou un terrain reglementaire en fait 28 x 15. Arc a 5,80 m, comme beaucoup de
  // playgrounds parisiens refaits ces dernieres annees, ou l'on joue surtout a mi-terrain.
  // Rallonge a 23,5 m : a 21 m il faisait trop carre. La LARGEUR ne bouge pas — c'est un couloir coince
  // entre le lycee et le canal, il est long et etroit. L'enceinte garde ses 1,40 m derriere chaque ligne
  // de fond, donc elle suit.
  jemmapes:  { L: 23.5, W: 11.5, threeR: 5.8, cornerX: 4.9, enc: { X: 7.2, Z: 13.15 } },
  // Le plateau du PARC DE BECON (bord de Seine, Courbevoie) : 30 m du mur au quai sur 18,2 m entre les
  // grillages du pin et des platanes, et DEUX petits terrains EN TRAVERS, cote a cote (orthophoto IGN et
  // photos). Chaque terrain va d'un grillage a l'autre : les cercles sont a 15,05 m l'un de l'autre et les
  // poteaux des paniers touchent presque le grillage. 11 m de large chacun : l'enrobe s'arrete a 5,5 m de
  // l'axe du terrain 1 cote quai.
  // 'parc' joue sur le terrain 1 (cote quai), 'parc2' sur le terrain 2 (cote mur) : meme plateau, meme
  // decor, c'est l'enceinte qui change de cote (voir PLATEAU dans js/court_parc.js).
  parc:      { L: 18.2, W: 11, threeR: 5.8, cornerX: 4.6, enc: { X: 23.7, XP: 6.2, Z: 9.1 } },
  parc2:     { L: 18.2, W: 11, threeR: 5.8, cornerX: 4.6, enc: { X: 7.6, XP: 22.3, Z: 9.1 } },
};
// Terrain de test : La Cage à l'identique, seul le décor du côté panier A change (scan 3D).
TERRAINS_DIMS.becon_scan = TERRAINS_DIMS.becon;

// Demi-largeur de l'enceinte du terrain courant. Les decors s'y calent.
// `X` / `XP` : demi-largeurs cote -X et cote +X. `W` = largeur totale, `CX` = decalage du CENTRE de
// l'enceinte par rapport a l'axe du terrain — nul tant que l'enceinte est symetrique.
export const ENCEINTE = { X: 9.6, XP: 9.6, W: 19.2, CX: 0, Z: 15.0, H1: 2.0, H2: 6.8 };

export function appliquerTerrain(id, hoopVec) {
  const d = TERRAINS_DIMS[id] || TERRAINS_DIMS.becon;
  COURT.L = d.L; COURT.W = d.W;
  COURT.THREE_R = d.threeR; COURT.CORNER_X = d.cornerX;
  // Le cercle est a 1,575 m de la ligne de fond et le panneau a 1,20 m : ces deux ecarts ne changent pas,
  // c'est la longueur du terrain qui bouge.
  COURT.HOOP_Z = -(d.L / 2 - 1.575);
  COURT.BOARD_Z = -(d.L / 2 - 1.2);
  // Le corner : le point ou l'arc rejoint la ligne droite. Si on le posait a la main il ne tomberait pas sur
  // l'arc et le trace au sol aurait une cassure.
  COURT.CORNER_Z = COURT.HOOP_Z + Math.sqrt(Math.max(0.01, d.threeR * d.threeR - d.cornerX * d.cornerX));

  for (const h of HOOPS) { h.z = h.sgn * Math.abs(COURT.HOOP_Z); }
  if (hoopVec) for (let i = 0; i < hoopVec.length; i++) hoopVec[i].set(HOOPS[i].x, HOOPS[i].y, HOOPS[i].z);

  // Zones de deplacement : 20 cm a l'interieur des lignes, comme avant.
  BOUNDS.xMin = -(d.W / 2 - 0.2); BOUNDS.xMax = d.W / 2 - 0.2;
  BOUNDS.zMin = -(d.L / 2 - 0.2); BOUNDS.zMax = d.L / 2 - 0.2;
  HALF_BOUNDS.xMin = BOUNDS.xMin; HALF_BOUNDS.xMax = BOUNDS.xMax;
  HALF_BOUNDS.zMin = BOUNDS.zMin;
  // Le demi-terrain deborde de 1,60 m au-dela de la ligne mediane sur un terrain reglementaire : on garde la
  // meme proportion. Le calculer depuis CORNER_Z, comme je l'avais fait, donnait -4,55 sur Becon au lieu de
  // 1,60 et retrecissait son demi-terrain de six metres.
  HALF_BOUNDS.zMax = 1.6 * (d.L / 28);
  // Le check-ball se fait deux metres au-dela du sommet de l'arc — sur 28 m c'est -3,2 comme avant. Sur un
  // petit terrain (le parc de Becon : 18,2 m) une cote fixe tombait DANS l'arc, sur un spot a deux points.
  // (seulement sur les petits terrains, L < 20 : ailleurs -3,2 reste au-dela de l'arc et rien ne change)
  { const v = COURT.HOOP_Z + d.threeR + 2.0; HALF_CHECK_Z = d.L < 20 ? Math.min(v, HALF_BOUNDS.zMax - 0.6) : -3.2; }
  // Quand le grillage de fond touche presque la ligne (parc de Becon), on ne laisse pas le centre du joueur
  // venir a 30 cm de la cloture : ses bras et la balle la traverseraient. Sans effet ailleurs.
  { const zf = d.enc.Z + 0.1 - 0.35; if (zf < BOUNDS.zMax) { BOUNDS.zMax = zf; BOUNDS.zMin = -zf; HALF_BOUNDS.zMin = -zf; } }

  // Portee du tir : la reference « longue » suit l'arc, sinon reculer d'un metre sur un petit terrain
  // reviendrait a tirer de trop loin pour rien.
  RANGE.threeRef = d.threeR - 0.34;

  ENCEINTE.X = d.enc.X; ENCEINTE.XP = d.enc.XP || d.enc.X; ENCEINTE.Z = d.enc.Z;
  ENCEINTE.W = ENCEINTE.X + ENCEINTE.XP;
  ENCEINTE.CX = (ENCEINTE.XP - ENCEINTE.X) / 2;
  YARD.xMin = -(ENCEINTE.X - 0.4); YARD.xMax = ENCEINTE.XP - 0.4;
  YARD.zMin = -(d.enc.Z - 0.4); YARD.zMax = d.enc.Z - 0.4;
  RING.z = 0;
  return d;
}

// DRIBBLE EN COURSE (js/dribble.js). Physique du rebond et de la main, fenêtres de synchronisation sur les
// appuis. E = coefficient de restitution du ballon sur l'enrobé (essai de chute FIBA : 0,76 à 0,80), KH =
// part de la vitesse horizontale gardée au rebond (frottement du sol), A_ABS = décélération de la main qui
// amortit la balle en la cueillant, TW_MAX = temps maximal où la main peut garder la balle immobile en haut.
export const DRIBBLE = {
  E: 0.78, KH: 0.85, A_ABS: 18, A_ABS_MAX: 45, W_UP_MAX: 2.5, TW_MAX: 0.08, HOLD_MIN: 0.05,
  VR_MIN: 1.5, VR_MAX: 7.0, FT: 0.045, RDV: 0.06, RATE_MIN: 0.8, RATE_MAX: 1.25, EPS: 0.010, REACH: 0.93,
  WAIT_PASS: 0.15, WAIT_SHOT: 0.18, K_OUT: 0.08, K_OUT_STOP: 0.20, K_ADOPT: 0.12, BAR_IN: 0.15, BAR_OUT: 0.30,
  LOD_DIST: 25, LOD_TOUCH: 4, ARRET_MAX: 0.5,
  // à l'arrêt : un rebond toutes les 0,56 s (0,44 sous pression), hanches 12 cm plus bas
  T_SUR_PLACE: 0.56, T_PROTEGE: 0.44, BAISSE: 0.12,
  // allures : écart latéral de la poche, avance de la reprise et du lâcher, vitesse de poussée vers l'avant
  // (m/s, relative au corps), course de la main, flexion du buste
  MODES: {
    // (poche rapprochée du corps : plus loin devant, la main de ces avatars ne descend plus assez et le
    // contact durait 15 ms — une claque au lieu d'une main qui accompagne la balle)
    marche: { lat: 0.26, zC: 0.16, zR: 0.22, u: 0.15, stroke: 0.22, flex: 0.04 },
    course: { lat: 0.27, zC: 0.20, zR: 0.27, u: 0.35, stroke: 0.24, flex: 0.07 },
    sprint: { lat: 0.26, zC: 0.26, zR: 0.36, u: 0.90, stroke: 0.22, flex: 0.10 },
    // à l'arrêt : balle sur le côté, à peine devant ; sous pression, plus basse, plus serrée, plus rapide
    surPlace: { lat: 0.30, zC: 0.12, zR: 0.16, u: 0, stroke: 0.26, flex: 0.18 },
    protege: { lat: 0.33, zC: 0.05, zR: 0.09, u: 0, stroke: 0.20, flex: 0.22 },
  },
};
