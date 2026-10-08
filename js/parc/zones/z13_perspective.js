// =====================================================================
//  ZONE Z13 : LA PERSPECTIVE, LES PARTERRES ET L'ENTRÉE DU 156 (lot B6 du parc entier)
// =====================================================================
// Conception, § 1.3 (Z13) et lot B6 ; références : tools/parc/references_gmaps/SYNTHESE.md (fiche Z13, qui prime sur la
// conception) et R2.md (photos Street View de 2016 à 2025 au n° 156, sphère S1 de 2018, avis d'avril 2026), photos 1,
// 7 et 8 de Haythem (tools/parc_becon_references.md), orthophoto du jeu. Point de vue de contrôle : PV09.
//
// L'AXE DE COMPOSITION DU PARC HAUT, perpendiculaire à la Seine : de la grille du 156 (boulevard Saint-Denis, +12,2) au
// belvédère (zone Z06, +10,6), 70 m de gravier beige et deux longs parterres. Du boulevard vers la Seine (x+) :
//
//   - L'ENTRÉE DU 156 (photos 7, Z13-12, Z13-20, Z13-21) : un ensemble symétrique de 8,3 m, de z- à z+
//       pilier | portillon 1,2 m | poteau | vantail 2,25 m | vantail 2,25 m | poteau | portillon 1,2 m | pilier.
//     Les PILIERS sont de calcaire clair (#cfc7b0), 0,55 x 0,55 x 1,8 m en six assises, sous un chapeau de dalle
//     débordant : ils sont PLUS BAS que la grille. Les VANTAUX ne leur sont pas pendus : ils tiennent à deux POTEAUX
//     D'ACIER carrés de 12 cm, noirs, à pointe de lance. Barreaux tous les 11 cm à fers de lance, et DEUX FRISES
//     D'ANNEAUX jointifs entre deux plats : l'une sous la lisse haute, l'autre à un mètre (Z13-21). Les PORTILLONS sont
//     bas (1,4 m), à barreaux simples. La PLAQUE ÉMAILLÉE BLEUE « 156 » n'est que sur le pilier DROIT (côté z+, vu de la
//     rue), face à la rue, à 1,45 m ; le disque « chiens interdits » est sur le vantail droit, à 1,8 m, et un petit
//     panneau vert de règlement sur le gauche. L'ensemble est FERMÉ (conception, § 1.1 : on ne sort pas du parc en v1) :
//     ses obstacles sont ceux de monde.json (grille du boulevard et portillon P156).
//   - LE PARVIS, dehors (décor léger, hors de l'enceinte) : l'abribus « Franklin » au bord de la chaussée, les
//     arceaux à vélos en deux rangs côté z+, la colonne verte du défibrillateur et l'armoire vert sombre contre le muret
//     à gauche, le totem orange, le panneau blanc de la Ville, celui du partenariat et la vitrine sur la grille à droite
//     (Z13-13, Z13-14). L'asphalte du parvis, le trottoir et le rideau de tilleuls sont ceux de la zone Z18.
//   - LE SEUIL DE GRAVIER (6 à 9 m, en entonnoir sur l'orthophoto), les deux CERISIERS 'Kanzan' qui encadrent la grille
//     (arbres.bin : gabarits.json les ajoute ; bronze à l'automne, roses au printemps selon SAISON). De la rue, à travers
//     la grille, les boules des angles des deux parterres s'alignent en une file (Z13-16 : « trois ou quatre grosses
//     boules alignées »).
//   - LES DEUX PARTERRES (x -121,3…-93,8 et -89,6…-62,3 ; z 31,6…39,7 : orthophoto) séparés par l'allée transversale :
//     d'un bord à l'autre, un LISERÉ de gazon de 0,8 m, une PLATE-BANDE fleurie continue de 1,7 m tout autour, un TAPIS
//     de gazon au milieu ; une BOULE DE BUIS à chaque angle, des rosiers tiges tous les 4 m dans la plate-bande. PAS de
//     bordure de buis continue (SYNTHESE, écart à la conception). Les massifs suivent la SAISON des feuillages
//     (js/monde_vegetation.js, conception § 6) : fin septembre (défaut), des vivaces (asters, sedums, cosmos) et de
//     hautes touffes de graminées (sphère S1 de septembre 2018) ; au printemps, les tulipes des photos 1 et 8.
//   - LES ALLÉES de gravier beige (#c8bca6) qui font le tour, bordées côté extérieur d'une HAIE BASSE taillée vert-jaune
//     (0,9 m) avec des BANCS verts devant et des LANTERNES sur mât noir (Z13-04, Z13-05) ; deux PANNEAUX d'information au
//     bout est (Z13-01), où l'allée rejoint le sable du belvédère (zone Z06, à partir de x = -62).
//
// L'AXE : l'axe de la grille (z = 36,4) et le drapeau du belvédère (Z06, en (-54,3 ; 32,6)) : vu du trottoir, depuis
// z ≈ 37, le drapeau tombe exactement au milieu du portail (Z13-17). Rien de ce qui est posé ici ne coupe cette ligne
// de visée : les boules restent sous elle, les couronnes des cerisiers de part et d'autre.
//
// RÈGLES DE ZONE : aucun Math.random (kit.alea, kit.bruit) ; toute hauteur par le sol du monde (kit.sol, et T.sol,
// qui suit les triangles du maillage du sol, pour ce qui est drapé) ; les matériaux du kit (aucun matériau propre) ;
// aucun arbre planté ici (les cerisiers sont dans gabarits.json) ; rien n'est écrit hors du groupe du morceau.
import * as THREE from 'three';
import { outilsB2 } from './z04_butte_pin.js';
import { saisonParc } from '../options.js';

// ============================================================================================ les données
// (repère du terrain 1 ; relevées sur l'orthophoto du jeu, 0,25 m par pixel, et sur monde.json)
// L'ENTRÉE DU 156 : le plan de la grille (face à la rue : x-), l'axe, et les largeurs de ses pièces, de l'axe vers les
// bords. `z0` et `z1` : les faces extérieures des deux piliers ; la zone Z18 y arrête la grille du boulevard.
const EX = -131.05, EZ = 36.4;
const VANTAIL = 2.25, POTEAU = 0.12, PORTILLON = 1.2, PILIER = 0.55;
const Z_POTEAU = VANTAIL + 0.015 + POTEAU / 2;                        // 2,325 de l'axe
const Z_PORT0 = Z_POTEAU + POTEAU / 2 + 0.01, Z_PORT1 = Z_PORT0 + PORTILLON;   // 2,395 à 3,595
const Z_PILIER = Z_PORT1 + 0.01 + PILIER / 2;                         // 3,88 : centre des piliers
export const ENTREE_156 = { x: EX, z: EZ, z0: EZ - Z_PILIER - PILIER / 2, z1: EZ + Z_PILIER + PILIER / 2, pilier: PILIER };
// LA GRILLE DU BOULEVARD de part et d'autre de l'entrée (monde.json > clôtures > grille_boulevard, ses deux morceaux
// qui encadrent le trou du portillon P156) : la zone Z18 la dessine, celle-ci pose ses panneaux dessus.
export const GRILLE_BD_SUD = [[-141.12, -98.2], [-133.6, 26.36], [-132.2, 28.8], [-131.3, 31.74], [-131.14, 34.4]];
export const GRILLE_BD_NORD = [[-130.91, 38.4], [-130.81, 40.18], [-130.87, 42.15], [-131.41, 44.0], [-132.33, 45.62], [-126.07, 150.0]];
// x d'une ligne qui avance en z, à l'ordonnée z (prolongée aux bouts)
export function xSurLigne(ligne, z) {
  if (z <= ligne[0][1]) return ligne[0][0];
  for (let i = 1; i < ligne.length; i++) if (z <= ligne[i][1]) { const [x0, z0] = ligne[i - 1], [x1, z1] = ligne[i]; return x0 + ((x1 - x0) * (z - z0)) / (z1 - z0); }
  return ligne[ligne.length - 1][0];
}

// LES PARTERRES (orthophoto : boules d'angle, plate-bande, tapis de gazon) ; le second s'arrête 30 cm avant le sable du
// belvédère (zone Z06, x ≥ -62).
const PARTERRES = [{ x0: -121.3, x1: -93.8 }, { x0: -89.6, x1: -62.3 }].map((p) => ({ ...p, z0: 31.6, z1: 39.7 }));
const LISERE = 0.8, PLATE_BANDE = 1.7;
// LES ALLÉES DE GRAVIER (orthophoto : la bande claire de z 27,6 à 31,6 au sud, de 39,7 à 43,4 au nord ; le seuil, en
// entonnoir, de la grille au premier parterre ; l'allée transversale entre les deux parterres)
const Z_SUD = 27.6, Z_NORD = 43.4, X_EST = -62.0;
const X_COUPE = -91.7;                                                 // milieu de la transversale : limite des morceaux b et c
const COU = [[EX, 32.8], [-129.6, 31.0], [-129.6, 41.8], [EX, 40.0]];  // de la grille au seuil (sous les portillons aussi)
const SEUIL = [[-129.6, 31.0], [-121.3, Z_SUD], [-121.3, Z_NORD], [-129.6, 41.8]];
// LES HAIES BASSES du côté extérieur des allées (ouvertes au droit de la transversale : chemins du bosquet et du parc
// nord-est, chemin_bosquet_91 et chemin_ne_7 de monde.json), leurs bancs et leurs lanternes (x)
const HAIE = { h: 0.9, ep: 0.75, zSud: Z_SUD - 0.45, zNord: Z_NORD + 0.45, troncons: [[-121.0, -93.8], [-89.6, -62.5]] };
const BANCS_X = [-114.5, -102.5, -80.5, -68.5];
const LANTERNES_X = [-120.5, -108.5, -96.5, -86.5, -74.5, -63.2];
// deux bancs sur le seuil, sous les cerisiers, tournés vers l'axe (Z13-18 : « un banc, le gravier »)
const BANCS_SEUIL = [{ x: -126.2, z: 31.2, cap: 20 }, { x: -126.2, z: 41.6, cap: 160 }];
// les deux panneaux d'information du bout est, sur deux poteaux gris (Z13-01), tournés vers la grille
const PANNEAUX_EST = [{ x: -66.6, z: 28.1 }, { x: -66.6, z: 42.9 }];
// le parvis (dehors) : l'abribus au bord de la chaussée, la colonne du défibrillateur et l'armoire contre le muret à
// gauche de l'entrée, les arceaux à vélos à droite, les panneaux de la grille à droite (Z13-10 à Z13-14, Z13-25)
const ABRIBUS = { x: -142.0, z0: 21.1, z1: 25.3, prof: 1.4 };
const DAE = { x: -132.25, z: 30.4 }, ARMOIRE = { x: -132.75, z: 29.3 };
const ARCEAUX = [];
for (const z of [42.4, 45.2]) for (const x of [-134.6, -135.6, -136.6, -137.6]) ARCEAUX.push({ x, z });

// Le printemps (tulipes) ou la fin septembre (vivaces et graminées) : la saison des feuillages du parc, une OPTION du parc
// depuis le lot C5 (js/parc/options.js), lue à la construction de chaque morceau (qui est refait quand elle change :
// `options` de leur définition, plus bas).
const printemps = () => saisonParc() === 'printemps';

// ============================================================================================ petits outils
const TEINTE_GRAVIER = [0.9, 0.86, 0.77];
// le gravier des allées se fond dans le sable du belvédère sur ses huit derniers mètres (Z06 : gravier, [1,02 ; 1,01 ; 1])
function couleurGravier(T) {
  const base = T.taches(TEINTE_GRAVIER, 1301, 0.12), c = [0, 0, 0];
  return (x, z) => {
    const b = base(x, z), k = T.lisse(-70, -62, x);
    c[0] = b[0] + (1.02 - TEINTE_GRAVIER[0]) * k; c[1] = b[1] + (1.01 - TEINTE_GRAVIER[1]) * k; c[2] = b[2] + (1.0 - TEINTE_GRAVIER[2]) * k;
    return c;
  };
}
// Une plaque rectangulaire [x0, x1] x [z0, z1], découpée en carreaux d'environ `pas` m.
function rect(T, lot, cle, x0, x1, z0, z1, o = {}) {
  const pas = o.pas ?? 1.0;
  T.plaque(lot, cle, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], Math.max(1, Math.round((x1 - x0) / pas)), Math.max(1, Math.round((z1 - z0) / pas)), o);
}
// Recolore en place les sommets d'un groupe rendu par le kit (géométrie PROPRE à la pièce : jamais une instance
// partagée — boule, banc, lanterne — dont la géométrie sert à tout le parc). `filtre(nomDuMateriau)` choisit les maillages.
function teinter(groupe, f, filtre = () => true) {
  groupe.traverse((m) => {
    if (!m.isMesh || m.userData.kitModele || !filtre(m.material.userData.kit)) return;
    const c = m.geometry.attributes.color;
    if (!c) return;
    for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * f[0], c.getY(i) * f[1], c.getZ(i) * f[2]);
    c.needsUpdate = true;
  });
  return groupe;
}
const M4 = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
// le fer de lance des grilles du parc (même profil que le kit : collet, fer losangé à quatre pans)
const LANCE = [[0.0125, 0], [0.0125, 0.018], [0.008, 0.024], [0.021, 0.055], [0.012, 0.09], [0.0005, 0.125]];
// un anneau de frise (Ø 11 cm, fer de 13 mm), dressé dans le plan de la grille (plan y-z) : géométrie partagée
let _anneau = null;
const anneauGeo = () => _anneau || (_anneau = new THREE.TorusGeometry(0.05, 0.0065, 4, 12).rotateY(Math.PI / 2));

// ============================================================================================ la grille du 156
// Tout en vrai relief, dans le Lot `lot` (peinture : le fer, la plaque, le disque, le panneau ; taille : les piliers).
// Le plan de la grille est x = EX ; on la construit le long de z, la rue du côté x-. Générateur : il rend la main entre
// deux pièces quand `budget()` le demande (un vantail et ses deux frises : 3 à 4 ms sur PC).
function* grille156(kit, lot, budget) {
  const { alea, bruit } = kit, fer = kit.TEINTES.fer, y0 = kit.sol(EX, EZ);
  // --- un barreau de section carrée, vertical, de ya à yb (au-dessus de y0), en z
  const barreau = (z, ya, yb, w) => lot.barre([EX, y0 + ya, z], [EX, y0 + yb, z], w, w, { couleur: fer, haut: [1, 0, 0] });
  // --- un plat horizontal le long de la grille, de za à zb, de ya à yb, épais de `ep`
  const plat = (za, zb, ya, yb, ep = 0.012) => lot.prisme('peinture', [[-ep / 2, ya], [ep / 2, ya], [ep / 2, yb], [-ep / 2, yb]],
    [[EX, y0, za], [EX, y0, zb]], { vertical: true, bande: true, couleur: fer });
  const lance = (z, y, k = 1) => lot.tour('peinture', LANCE.map(([r, h]) => [r * k, h * k]), 4, M4(EX, y0 + y, z),
    { bande: true, a0: Math.PI / 4, facettes: true, vif: true, couleur: fer });
  // UNE FRISE D'ANNEAUX entre deux plats (anneaux jointifs, un par intervalle de barreaux)
  const frise = (zs, y) => {
    for (let i = 0; i < zs.length - 1; i++) {
      const zm = (zs[i] + zs[i + 1]) / 2, r = Math.min(0.05, (zs[i + 1] - zs[i]) / 2 - 0.006);
      lot.geo('peinture', anneauGeo(), new THREE.Matrix4().makeScale(1, r / 0.05, r / 0.05).setPosition(EX, y0 + y, zm), { bande: true, couleur: fer });
    }
    plat(zs[0], zs[zs.length - 1], y - 0.068, y - 0.056);
    plat(zs[0], zs[zs.length - 1], y + 0.056, y + 0.068);
  };

  // --- LES DEUX VANTAUX (de za à zb chacun) : montants de 45 mm, barreaux de 20 mm tous les 11 cm à fers de lance,
  // lisse basse, frise d'anneaux à un mètre, frise haute sous la lisse haute
  const vantail = (za, zb) => {
    const n = Math.max(2, Math.round((zb - za) / 0.11)), zs = [];
    for (let i = 0; i <= n; i++) zs.push(za + ((zb - za) * i) / n);
    barreau(za, 0.04, 2.33, 0.045); barreau(zb, 0.04, 2.33, 0.045);
    for (let i = 1; i < n; i++) { barreau(zs[i], 0.05, 2.31, 0.02); lance(zs[i], 2.3); }
    plat(za, zb, 0.12, 0.17, 0.016);                              // la lisse basse
    frise(zs, 1.0);                                                // la frise basse (Z13-21 : « à mi-hauteur, ≈ 1 m »)
    frise(zs, 2.1);                                                // la frise haute, sous la lisse haute
    plat(za, zb, 2.2, 2.25, 0.016);                               // la lisse haute
  };
  vantail(EZ - VANTAIL, EZ - 0.005);
  if (budget()) yield;
  vantail(EZ + 0.005, EZ + VANTAIL);
  if (budget()) yield;
  // la serrure et sa gâche, au milieu ; le sabot du portail (butée au sol)
  lot.boite('peinture', 0.07, 0.24, 0.12, M4(EX, y0 + 1.08, EZ), { bande: true, couleur: fer, chanfrein: 0.006 });
  lot.boite('taille', 0.22, 0.05, 0.3, M4(EX, y0 + 0.0, EZ), { chanfrein: 0.02, couleur: [0.72, 0.71, 0.68] });

  // --- LES DEUX POTEAUX D'ACIER (12 cm, 2,32 m) et leur fer de lance, deux fois plus gros ; les gonds
  for (const s of [-1, 1]) {
    const z = EZ + s * Z_POTEAU;
    barreau(z, -0.15, 2.32, POTEAU);
    lot.boite('peinture', 0.15, 0.02, 0.15, M4(EX, y0 + 2.33, z), { bande: true, couleur: fer, chanfrein: 0.004 });
    lance(z, 2.34, 1.35);
    for (const y of [0.3, 1.9]) lot.boite('peinture', 0.05, 0.06, 0.05, M4(EX, y0 + y, z - s * 0.08), { bande: true, couleur: fer });
  }

  if (budget()) yield;
  // --- LES DEUX PORTILLONS (1,2 x 1,4 m) : cadre, barreaux simples à dessus plat, lisse basse, la haute doublée
  for (const s of [-1, 1]) {
    const za = EZ + s * Z_PORT0, zb = EZ + s * Z_PORT1, a = Math.min(za, zb), b = Math.max(za, zb);
    const n = Math.max(2, Math.round((b - a) / 0.11));
    barreau(a, 0.04, 1.4, 0.04); barreau(b, 0.04, 1.4, 0.04);
    for (let i = 1; i < n; i++) barreau(a + ((b - a) * i) / n, 0.05, 1.36, 0.02);
    plat(a, b, 0.12, 0.165, 0.016);
    plat(a, b, 1.22, 1.25, 0.012);
    plat(a, b, 1.35, 1.4, 0.02);
    // le loquet, côté poteau
    lot.boite('peinture', 0.05, 0.12, 0.05, M4(EX, y0 + 1.0, EZ + s * (Z_PORT0 + 0.06)), { bande: true, couleur: fer });
  }

  if (budget()) yield;
  // --- LES DEUX PILIERS : six assises de calcaire clair (25 à 32 cm), chacune sa teinte, joints lus par le chanfrein,
  // pied verdi (mousse), coulures sous le chapeau ; le chapeau en dalle débordante de 4 cm, un peu de travers
  const TEINTE = [0.9, 0.84, 0.72];
  for (const s of [-1, 1]) {
    const z = EZ + s * Z_PILIER, ys = kit.sol(EX, z), hauts = [0.29, 0.31, 0.28, 0.32, 0.3, 0.3];
    let y = -0.12;
    hauts.forEach((h, k) => {
      const hh = k === 0 ? h + 0.12 : h, v = 0.92 + 0.12 * alea(z, k, 1310), bl = 0.97 + 0.05 * alea(z, k, 1311);
      const col = (px, py, pz) => {
        const hp = py - ys, mousse = 1 - T_lisse(0, 0.55, hp), coul = Math.max(0, bruit(pz * 7 + px * 3, 0.5, 1312) * 1.6 - 0.75) * T_lisse(1.1, 1.75, hp);
        const f = v * (1 + 0.08 * (bruit(px * 4 + pz * 4, py * 4, 1313) - 0.5));
        return [TEINTE[0] * f * (1 - 0.34 * mousse) * (1 - 0.3 * coul), TEINTE[1] * f * (1 - 0.22 * mousse) * (1 - 0.3 * coul), TEINTE[2] * f * bl * (1 - 0.36 * mousse) * (1 - 0.26 * coul)];
      };
      const ins = 0.004 * alea(z, k, 1314);
      lot.boite('taille', PILIER - ins, hh - 0.008, PILIER - ins, M4(EX + (alea(z, k, 1315) - 0.5) * 0.006, ys + y + hh / 2, z),
        { chanfrein: 0.014, couleur: col, uvDecal: [alea(z, k, 1316) * 3, alea(k, z, 1317) * 3] });
      y += hh;
    });
    const chapeau = new THREE.Matrix4().makeRotationY((alea(z, 3, 1318) - 0.5) * 0.04).setPosition(EX, ys + y + 0.05, z);
    lot.boite('taille', PILIER + 0.08, 0.1, PILIER + 0.08, chapeau, { chanfrein: 0.02, couleur: [TEINTE[0] * 0.9, TEINTE[1] * 0.88, TEINTE[2] * 0.84] });
  }

  if (budget()) yield;
  // --- LA PLAQUE ÉMAILLÉE « 156 » (22 x 14 cm, bleu à chiffres et filet blancs), face à la rue, sur le pilier DROIT
  // (côté z+), à 1,45 m ; la case de l'atlas de la peinture, sans son liseré vert (x 660 à 812, y 76 à 180 px)
  {
    const z = EZ + Z_PILIER, ys = kit.sol(EX, z), x = EX - PILIER / 2 - 0.007;
    lot.geo('peinture', panneau(0.22, 0.14, [660, 76, 812, 180]), new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(x - 0.001, ys + 1.45, z), { couleur: [1, 1, 1] });
    lot.boite('peinture', 0.008, 0.144, 0.224, M4(x + 0.004, ys + 1.45, z), { bande: true, couleur: kit.lin('#1f3f8f') });
  }
  // --- LE DISQUE « CHIENS INTERDITS » (Ø 40 cm) sur le vantail droit, à 1,8 m, et le petit panneau vert de règlement
  // (25 x 30 cm) sur le gauche, à 1,5 m (cases de l'atlas : le disque en (928 ; 128), r 84 px ; le panneau vert)
  const zD = EZ + VANTAIL * 0.52;
  lot.geo('peinture', disque(0.2, 928, 128, 84), new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(EX - 0.03, y0 + 1.8, zD), { couleur: [1, 1, 1] });
  lot.boite('peinture', 0.01, 0.4, 0.4, M4(EX - 0.022, y0 + 1.8, zD), { bande: true, couleur: fer, chanfrein: 0.003 });
  const zP = EZ - VANTAIL * 0.45;
  lot.geo('peinture', panneau(0.25, 0.3, [846, 274, 1010, 494]), new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(EX - 0.028, y0 + 1.5, zP), { couleur: [1, 1, 1] });
  lot.boite('peinture', 0.01, 0.3, 0.25, M4(EX - 0.02, y0 + 1.5, zP), { bande: true, couleur: [0.1, 0.16, 0.12] });
}
const T_lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Un panneau plat (largeur w le long de x local, hauteur h), face +z, qui montre le rectangle [u0, v0, u1, v1] (pixels
// de l'atlas de la peinture, 1024 px ; y vers le bas). Tourné de -90° autour de y, il regarde la rue (x-).
function panneau(w, h, [u0, v0, u1, v1]) {
  const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (u0 + uv.getX(i) * (u1 - u0)) / 1024, 1 - (v1 - uv.getY(i) * (v1 - v0)) / 1024);
  return g;
}
// Un disque de rayon r (face +z) qui montre le rond de l'atlas de centre (cx, cy) et de rayon rp (pixels).
function disque(r, cx, cy, rp) {
  const g = new THREE.CircleGeometry(r, 24), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + (uv.getX(i) - 0.5) * 2 * rp) / 1024, 1 - (cy - (uv.getY(i) - 0.5) * 2 * rp) / 1024);
  return g;
}

// ============================================================================================ le parvis (dehors)
// Décor léger, peu de triangles : on le voit en arrivant par le boulevard et, de loin, à travers la grille. Générateur,
// comme la grille.
function* parvis(kit, lot, budget) {
  const lin = kit.lin;
  const boite = (w, h, d, x, y, z, couleur, o = {}) => lot.boite('peinture', w, h, d, M4(x, y, z), { bande: true, couleur, chanfrein: o.ch ?? 0.01 });
  // L'ABRIBUS (Z13-25 : vitré, cadre gris foncé #3b3f42, panneau publicitaire au bout) : quatre montants, un toit plat
  // débordant, un fond vitré côté trottoir, deux joues, un banc ; ouvert sur la chaussée (x-)
  {
    const A = ABRIBUS, y = kit.sol(A.x, (A.z0 + A.z1) / 2), gris = lin('#3b3f42'), xa = A.x - A.prof / 2, xb = A.x + A.prof / 2;
    for (const z of [A.z0, A.z1]) for (const x of [xa + 0.05, xb - 0.05]) boite(0.07, 2.35, 0.07, x, y + 1.175, z, gris);
    boite(A.prof + 0.35, 0.09, A.z1 - A.z0 + 0.3, A.x - 0.15, y + 2.4, (A.z0 + A.z1) / 2, gris, { ch: 0.02 });
    // le vitrage : un gris-bleu sombre (les vitres d'un abribus, de jour, montrent surtout le reflet du trottoir)
    boite(0.02, 1.9, A.z1 - A.z0 - 0.1, xb - 0.05, y + 1.2, (A.z0 + A.z1) / 2, lin('#8e999c'));
    boite(A.prof - 0.12, 1.9, 0.02, A.x, y + 1.2, A.z0, lin('#8e999c'));
    // le panneau publicitaire éclairé (double face) au bout z+, et le banc
    boite(A.prof - 0.1, 1.75, 0.14, A.x, y + 1.25, A.z1, lin('#d9d4c2'));
    boite(0.12, 1.85, 0.16, xa + 0.06, y + 1.25, A.z1, gris);
    boite(0.35, 0.05, 1.9, xb - 0.3, y + 0.5, (A.z0 + A.z1) / 2 - 0.4, lin('#6b6f70'));
  }
  if (budget()) yield;
  // LA COLONNE DU DÉFIBRILLATEUR (1,4 x 0,3 m, vert #2e9a4a, croix blanche) et l'ARMOIRE vert sombre (0,6 x 1,2 x 0,5)
  {
    const y = kit.sol(DAE.x, DAE.z);
    boite(0.3, 1.4, 0.3, DAE.x, y + 0.7, DAE.z, lin('#2e9a4a'), { ch: 0.03 });
    boite(0.012, 0.16, 0.05, DAE.x - 0.155, y + 1.12, DAE.z, [0.9, 0.9, 0.88]); boite(0.012, 0.05, 0.16, DAE.x - 0.155, y + 1.12, DAE.z, [0.9, 0.9, 0.88]);
    const ya = kit.sol(ARMOIRE.x, ARMOIRE.z);
    boite(0.5, 1.2, 0.6, ARMOIRE.x, ya + 0.6, ARMOIRE.z, lin('#2f4a44'), { ch: 0.02 });
    boite(0.012, 0.18, 0.18, ARMOIRE.x - 0.256, ya + 0.95, ARMOIRE.z, [0.85, 0.86, 0.84]);
  }
  // LES ARCEAUX À VÉLOS (U renversés en tube noir de 6 cm, 0,75 x 0,7 m, une traverse au milieu), dans le plan y-z
  const tube = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; tube.push([Math.cos(a) * 0.03, Math.sin(a) * 0.03]); }
  for (const a of ARCEAUX) {
    const y = kit.sol(a.x, a.z), ch = [[a.x, y - 0.05, a.z - 0.35], [a.x, y + 0.6, a.z - 0.35]];
    for (let k = 1; k < 8; k++) { const t = Math.PI * (1 - k / 8); ch.push([a.x, y + 0.6 + Math.sin(t) * 0.15, a.z + Math.cos(t) * 0.35]); }
    ch.push([a.x, y + 0.6, a.z + 0.35], [a.x, y - 0.05, a.z + 0.35]);
    lot.prisme('peinture', tube, kit.arrondir(ch.map(([x, yy, z]) => [z, yy]), 0.1, 3).map(([z, yy]) => [a.x, yy, z]),
      { haut: [1, 0, 0], bande: true, lisse: true, couleur: [0.035, 0.035, 0.035] });
    lot.barre([a.x, y + 0.38, a.z - 0.33], [a.x, y + 0.38, a.z + 0.33], 0.025, 0.025, { couleur: [0.035, 0.035, 0.035] });
  }
  if (budget()) yield;
  // SUR LA GRILLE À DROITE (Z13-14, z 41 à 48) : le totem orange sur son socle, le grand panneau blanc de la Ville sur deux
  // pieds, le panneau du partenariat fixé aux barreaux, la vitrine d'affichage gris vert sur poteau
  const xg = (z) => xSurLigne(GRILLE_BD_NORD, z) - 0.35;          // devant la grille, côté rue
  {
    let z = 41.2, x = xg(z), y = kit.sol(x, z);
    boite(0.25, 1.8, 0.6, x, y + 0.9, z, lin('#e08a2a'), { ch: 0.02 });
    boite(0.012, 1.1, 0.45, x - 0.131, y + 1.15, z, lin('#f2efe6'));
    z = 43.0; x = xg(z); y = kit.sol(x, z);
    for (const dz of [-0.42, 0.42]) boite(0.06, 1.15, 0.06, x, y + 0.575, z + dz, lin('#7c8082'));
    boite(0.05, 2.0, 0.95, x, y + 2.05, z, lin('#eeece6'), { ch: 0.015 });
    z = 45.0; x = xg(z) + 0.28; y = kit.sol(x, z);
    boite(0.02, 0.9, 1.4, x, y + 1.35, z, lin('#f3f1ea'));
    boite(0.01, 0.12, 1.3, x - 0.012, y + 1.62, z, lin('#2a4f9a'));
    boite(0.01, 0.06, 1.3, x - 0.012, y + 1.05, z, lin('#c0392b'));
    z = 47.2; x = xg(z); y = kit.sol(x, z);
    boite(0.08, 1.1, 0.08, x, y + 0.55, z, lin('#5e6b62'));
    boite(0.1, 0.8, 1.0, x, y + 1.5, z, lin('#5e6b62'), { ch: 0.02 });
    boite(0.012, 0.66, 0.86, x - 0.055, y + 1.5, z, lin('#e9e6dc'));
  }
  // la corbeille de rue (sac transparent sur son cerceau), près du pilier gauche (Z13-22)
  {
    const x = EX - 0.6, z = ENTREE_156.z0 - 0.5, y = kit.sol(x, z);
    lot.barre([x, y, z], [x, y + 1.05, z], 0.04, 0.04, { couleur: [0.25, 0.26, 0.26] });
    lot.tour('peinture', [[0.001, 0.45], [0.2, 0.5], [0.21, 0.95], [0.19, 0.96]], 10, M4(x - 0.22, y, z), { bande: true, couleur: [0.46, 0.5, 0.46] });
  }
}

// ============================================================================================ les morceaux
// Z13a : l'entrée du 156, le parvis, le seuil et ses bancs (les cerisiers sont dans arbres.bin).
function* entree(ctx) {
  const { kit, Monde, groupe } = ctx, T = outilsB2(kit, Monde);
  // le gravier : du pas de la grille au premier parterre
  const sol = new kit.Lot('Z13 seuil'), gravier = couleurGravier(T);
  T.plaque(sol, 'gravier#sol', COU, 2, 9, { dy: 0.03, couleur: gravier });
  T.plaque(sol, 'gravier#sol', SEUIL, 9, 16, { dy: 0.03, couleur: gravier });
  groupe.add(sol.maillages('Z13 seuil'));
  if (ctx.budget()) yield;
  // la grille du 156
  const g = new kit.Lot('grille du 156');
  yield* grille156(kit, g, ctx.budget);
  groupe.add(g.maillages('grille du 156'));
  if (ctx.budget()) yield;
  // le parvis, dehors
  const p = new kit.Lot('parvis du 156');
  yield* parvis(kit, p, ctx.budget);
  groupe.add(p.maillages('parvis du 156'));
  if (ctx.budget()) yield;
  // les deux bancs du seuil
  for (const b of BANCS_SEUIL) groupe.add(kit.banc({ ...b, style: 'lattes_vertes' }));
  yield;
}

// Un parterre : liseré de gazon, plate-bande fleurie (saison), tapis de gazon, boules aux angles, rosiers tiges.
function* parterre(ctx, T, P, lot) {
  const { kit, groupe } = ctx, { alea } = kit, PRINTEMPS = printemps();
  const L = LISERE, B = PLATE_BANDE, { x0, x1, z0, z1 } = P;
  const gazon = T.taches([0.93, 0.98, 0.88], 1321, 0.14), gazonBord = T.taches([0.84, 0.9, 0.8], 1322, 0.14);
  // le liseré (un peu plus sombre : piétiné, à l'ombre des boules) et le tapis du milieu
  rect(T, lot, 'gazon#sol', x0, x1, z0, z0 + L, { dy: 0.025, couleur: gazonBord });
  rect(T, lot, 'gazon#sol', x0, x1, z1 - L, z1, { dy: 0.025, couleur: gazonBord });
  rect(T, lot, 'gazon#sol', x0, x0 + L, z0 + L, z1 - L, { dy: 0.025, couleur: gazonBord });
  rect(T, lot, 'gazon#sol', x1 - L, x1, z0 + L, z1 - L, { dy: 0.025, couleur: gazonBord });
  rect(T, lot, 'gazon#sol', x0 + L + B, x1 - L - B, z0 + L + B, z1 - L - B, { dy: 0.025, couleur: gazon });
  if (ctx.budget()) yield;
  // la plate-bande, en quatre bandes découpées en carreaux (T.massifDecoupe) : printemps, les tulipes ; fin septembre,
  // les vivaces (asters, sedums, cosmos), plus serrées aux angles, sous les boules
  const pal = PRINTEMPS ? 'tulipes' : 'vivaces', dens = PRINTEMPS ? 1.3 : 1.25, o = { pas: 1.6, densite: dens, bombe: 0.05, budget: ctx.budget };
  const xa = x0 + L, xb = x1 - L, za = z0 + L, zb = z1 - L;
  yield* T.massifDecoupe(groupe, xa, xb, za, za + B, () => pal, o);
  yield* T.massifDecoupe(groupe, xa, xb, zb - B, zb, () => pal, o);
  yield* T.massifDecoupe(groupe, xa, xa + B, za + B, zb - B, () => pal, o);
  yield* T.massifDecoupe(groupe, xb - B, xb, za + B, zb - B, () => pal, o);
  // fin septembre : les hautes touffes de graminées (épis paille, 1,2 à 1,5 m) semées dans la plate-bande, plus
  // serrées aux quatre coins (sphère S1 : une touffe de chaque côté de la boule d'angle)
  if (!PRINTEMPS) {
    const touffes = [];
    const semer = (ax, az, bx, bz, pas) => {
      const l = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(l / pas));
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        if (alea(x, z, 1323) < 0.18) continue;
        touffes.push([x + (alea(x, z, 1324) - 0.5) * 0.5, z + (alea(x, z, 1325) - 0.5) * 0.5, 1.0 + 0.35 * alea(x, z, 1326)]);
      }
    };
    const m = B / 2;
    semer(xa + 2.2, za + m, xb - 2.2, za + m, 2.1);
    semer(xa + 2.2, zb - m, xb - 2.2, zb - m, 2.1);
    semer(xa + m, za + 2.2, xa + m, zb - 2.2, 1.6);
    semer(xb - m, za + 2.2, xb - m, zb - 2.2, 1.6);
    for (const [cx, cz, sx, sz] of [[xa, za, 1, 1], [xb, za, -1, 1], [xa, zb, 1, -1], [xb, zb, -1, -1]]) {
      touffes.push([cx + sx * 1.9, cz + sz * m, 1.3], [cx + sx * m, cz + sz * 1.9, 1.25]);
    }
    for (let i = 0; i < touffes.length; i += 40) { T.graminees(lot, touffes.slice(i, i + 40), { eventails: 6 }); if (ctx.budget()) yield; }
  }
  // les boules de buis des angles (orthophoto : 1,6 à 2 m de diamètre, centrées à un mètre des coins). Vues de la rue
  // à travers la grille, celles des deux parterres s'alignent : c'est la « file de trois ou quatre boules » de Z13-16
  // (l'orthophoto n'en montre pas d'autre ; une première version en ajoutait deux au milieu du côté de la grille, qui
  // fermaient la perspective d'un mur de buis en PV09)
  const boules = [[x0 + 0.95, z0 + 0.95], [x1 - 0.95, z0 + 0.95], [x0 + 0.95, z1 - 0.95], [x1 - 0.95, z1 - 0.95]];
  for (const [x, z] of boules) {
    const r = alea(x, z, 1327) < 0.5 ? 0.76 : 0.82;           // (deux tailles : un modèle du kit par taille)
    groupe.add(kit.bouleBuis({ x, z, r, aplat: 0.88, essence: 'if' }));
  }
  if (ctx.budget()) yield;
  // les rosiers tiges (Z13-02 : de fines tiges de 1,2 à 1,6 m tous les 4 m dans la plate-bande) : une tige brune, une
  // petite tête ronde de feuillage à facettes (60 triangles : la boule de buis du kit, frange comprise, en coûte 650 ;
  // douze par parterre, c'était le cinquième du morceau pour un détail) ; au printemps, à peine feuillée
  const rTete = PRINTEMPS ? 0.16 : 0.22, tete = [];
  for (let k = 0; k <= 5; k++) { const a = -Math.PI / 2 + (k / 5) * Math.PI; tete.push([Math.max(0.001, Math.cos(a) * rTete), rTete * (1 + Math.sin(a) * 0.85)]); }
  const vertRosier = [0.62, 0.72, 0.5];
  for (const zc of [za + B / 2, zb - B / 2]) {
    const n = Math.max(1, Math.round((xb - xa - 6) / 4));
    for (let i = 0; i <= n; i++) {
      const x = xa + 3 + ((xb - xa - 6) * i) / n, y = T.sol(x, zc), h = 1.15 + 0.2 * alea(x, zc, 1328);
      lot.barre([x, y - 0.05, zc], [x, y + h, zc], 0.022, 0.022, { couleur: [0.11, 0.085, 0.06], haut: [1, 0, 0] });
      const t = 0.85 + 0.3 * alea(x, zc, 1330);
      lot.tour('feuillage', tete, 7, new THREE.Matrix4().makeRotationY(alea(zc, x, 1331) * 6.28).setPosition(x, y + h - 0.1, zc),
        { couleur: [vertRosier[0] * t, vertRosier[1] * t, vertRosier[2] * t] });
    }
  }
  if (ctx.budget()) yield;
}

// Z13b et Z13c : un parterre, les allées de gravier qui l'entourent, les haies, les bancs et les lanternes, entre xa et xb.
function morceauParterre(k) {
  return function* (ctx) {
    const { kit, Monde, groupe } = ctx, T = outilsB2(kit, Monde), P = PARTERRES[k];
    const xa = k === 0 ? -121.3 : X_COUPE, xb = k === 0 ? X_COUPE : X_EST;
    // 1. le gravier : allées sud et nord, et la moitié de la transversale
    // (relecture du lot : au bout est, le gravier passe 40 cm SOUS le bord du sable du belvédère (zone Z06, posé 1,8 cm
    // plus bas) ; bord à bord, on voyait entre les deux, sur toute la largeur, un trait sombre : le sol du monde)
    const sol = new kit.Lot('Z13 allées'), gravier = couleurGravier(T), xg = k === 0 ? xb : X_EST + 0.4;
    rect(T, sol, 'gravier#sol', xa, xg, Z_SUD, P.z0, { dy: 0.03, couleur: gravier });
    rect(T, sol, 'gravier#sol', xa, xg, P.z1, Z_NORD, { dy: 0.03, couleur: gravier });
    if (k === 0) rect(T, sol, 'gravier#sol', P.x1, xb, P.z0, P.z1, { dy: 0.03, couleur: gravier });
    else {
      rect(T, sol, 'gravier#sol', xa, P.x0, P.z0, P.z1, { dy: 0.03, couleur: gravier });
      rect(T, sol, 'gravier#sol', P.x1, xg, P.z0, P.z1, { dy: 0.03, couleur: gravier, pas: 0.35 });
    }
    groupe.add(sol.maillages('Z13 allées'));
    if (ctx.budget()) yield;
    // 2. le parterre
    const lot = new kit.Lot('Z13 parterre');
    yield* parterre(ctx, T, P, lot);
    groupe.add(T.maillages(lot, 'Z13 parterre'));
    if (ctx.budget()) yield;
    // 3. les haies basses taillées vert-jaune (S1 : #9aa53a ; la charmille du kit, poussée vers le jaune)
    const [ta, tb] = HAIE.troncons[k];
    // (par tronçons de 7 m bout à bout : une haie de 27 m d'un seul tenant prenait 8 ms d'une traite)
    for (const z of [HAIE.zSud, HAIE.zNord]) {
      const n = Math.max(1, Math.round((tb - ta) / 7));
      for (let i = 0; i < n; i++) {
        const a = ta + ((tb - ta) * i) / n, b = ta + ((tb - ta) * (i + 1)) / n;
        const h = kit.haieTaillee({ ligne: [[a, z], [b, z]], h: HAIE.h, ep: HAIE.ep, arrondi: 0.18, essence: 'charmille' });
        groupe.add(teinter(h, [1.12, 1.06, 0.72], (n) => n === 'feuillage' || n === 'frange'));
        if (ctx.budget()) yield;
      }
    }
    // derrière chaque haie, sa plate-bande de terre paillée : elle couvre le bord des allées des données (gabarits
    // grande_allee_sud et _nord, plus larges que la bande de gravier de l'orthophoto), que le sol du monde dessinait en
    // gravier gris de l'autre côté de la haie
    const pail = new kit.Lot('Z13 paillage'), brun = T.taches([1.05, 1.0, 0.95], 1329, 0.18);
    rect(T, pail, 'terre#sol', ta, tb, 25.9, HAIE.zSud - HAIE.ep / 2 + 0.05, { dy: 0.025, couleur: brun });
    rect(T, pail, 'terre#sol', ta, tb, HAIE.zNord + HAIE.ep / 2 - 0.05, 44.9, { dy: 0.025, couleur: brun });
    groupe.add(pail.maillages('Z13 paillage'));
    // 4. les bancs devant les haies, tournés vers le parterre ; les lanternes sur mât noir au bord des allées
    for (const x of BANCS_X) {
      if (x < xa || x >= xb) continue;
      groupe.add(kit.banc({ x, z: HAIE.zSud + 0.83, cap: 0, style: 'lattes_vertes' }));
      groupe.add(kit.banc({ x, z: HAIE.zNord - 0.83, cap: 180, style: 'lattes_vertes' }));
    }
    for (const x of LANTERNES_X) {
      if (x < xa || x >= xb) continue;
      groupe.add(kit.lampadaire({ x, z: Z_SUD + 0.35, style: 'lanterne' }));
      groupe.add(kit.lampadaire({ x, z: Z_NORD - 0.35, style: 'lanterne' }));
    }
    // 5. au bout est, les deux panneaux d'information sur leurs poteaux gris, face à la grille (x-)
    if (k === 1) {
      const p = new kit.Lot('panneaux du bout est');
      for (const a of PANNEAUX_EST) {
        const y = kit.sol(a.x, a.z);
        for (const dz of [-0.55, 0.55]) p.barre([a.x, y - 0.1, a.z + dz], [a.x, y + 1.95, a.z + dz], 0.06, 0.06, { couleur: [0.42, 0.43, 0.43], haut: [1, 0, 0] });
        p.boite('peinture', 0.05, 0.9, 1.25, M4(a.x + 0.02, y + 1.45, a.z), { bande: true, couleur: [0.1, 0.16, 0.12], chanfrein: 0.01 });
        p.geo('peinture', panneau(0.95, 0.8, [846, 274, 1010, 494]), new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(a.x - 0.007, y + 1.45, a.z), { couleur: [1, 1, 1] });
      }
      groupe.add(p.maillages('panneaux du bout est'));
    }
    yield;
  };
}

// LA SILHOUETTE d'un parterre et de ses allées (conception, § 3.5 : ≤ 2 000 triangles, 1 à 3 appels) : le gravier, le
// gazon, la plate-bande en terre fleurie, les haies en boîtes.
function silhouetteParterre(k) {
  return function* (ctx) {
    const { kit, Monde, groupe } = ctx, T = outilsB2(kit, Monde), P = PARTERRES[k], PRINTEMPS = printemps();
    const xa = k === 0 ? -121.3 : X_COUPE, xb = k === 0 ? X_COUPE : X_EST, lot = new kit.Lot('silhouette Z13');
    const gr = () => [TEINTE_GRAVIER[0], TEINTE_GRAVIER[1], TEINTE_GRAVIER[2]];
    rect(T, lot, 'gravier#sol', xa, xb, Z_SUD, P.z0, { dy: 0.04, couleur: gr, pas: 6 });
    rect(T, lot, 'gravier#sol', xa, xb, P.z1, Z_NORD, { dy: 0.04, couleur: gr, pas: 6 });
    rect(T, lot, 'gravier#sol', k === 0 ? P.x1 : xa, k === 0 ? xb : P.x0, P.z0, P.z1, { dy: 0.04, couleur: gr, pas: 6 });
    rect(T, lot, 'gazon#sol', P.x0, P.x1, P.z0, P.z1, { dy: 0.04, pas: 6, couleur: () => (PRINTEMPS ? [1.1, 0.9, 0.8] : [1.0, 0.95, 0.9]) });
    const [ta, tb] = HAIE.troncons[k];
    for (const z of [HAIE.zSud, HAIE.zNord]) {
      const y = kit.sol((ta + tb) / 2, z);
      lot.prisme('feuillage', [[-HAIE.ep / 2, -0.1], [HAIE.ep / 2, -0.1], [HAIE.ep / 2, HAIE.h], [-HAIE.ep / 2, HAIE.h]],
        [[ta, kit.sol(ta, z), z], [(ta + tb) / 2, y, z], [tb, kit.sol(tb, z), z]], { vertical: true, couleur: [1.0, 1.0, 0.7] });
    }
    groupe.add(lot.maillages('silhouette Z13'));
  };
}

export default {
  id: 'Z13', nom: 'Perspective, parterres, entrée 156',
  emprise: [[-143, 18], [-57, 18], [-57, 50], [-143, 50]],
  // trois morceaux de 24 à 30 m : l'entrée (grille, parvis, seuil), puis chacun des deux parterres et ses allées
  morceaux: [
    { id: 'Z13a', nom: 'entrée du 156, parvis et seuil', boite: [-143.0, 18.0, -121.3, 50.0], construire: entree },
    { id: 'Z13b', nom: 'premier parterre et ses allées', boite: [-121.3, 25.5, X_COUPE, 46.0], construire: morceauParterre(0), silhouette: silhouetteParterre(0), options: ['saison'] },
    { id: 'Z13c', nom: 'second parterre et ses allées', boite: [X_COUPE, 24.0, X_EST, 47.0], construire: morceauParterre(1), silhouette: silhouetteParterre(1), options: ['saison'] },
  ],
  // PUR (sans three) : appelé à l'installation pour toutes les zones. La grille du boulevard et le portillon fermé du
  // 156 sont dans monde.json (clôtures, portillons) ; ici, ce qui est posé dans l'enceinte.
  obstacles(o) {
    // les parterres : on n'entre pas dans les plates-bandes (le bord de la plate-bande, 50 cm, où la balle s'étouffe),
    // les boules de leurs angles
    for (const P of PARTERRES) {
      const xa = P.x0 + LISERE, xb = P.x1 - LISERE, za = P.z0 + LISERE, zb = P.z1 - LISERE;
      for (const [ax, az, bx, bz] of [[xa, za, xb, za], [xb, za, xb, zb], [xb, zb, xa, zb], [xa, zb, xa, za]]) o.segment(ax, az, bx, bz, { e: 0.12, h: 0.5, type: 'haie' });
      const b = [[P.x0 + 0.95, P.z0 + 0.95], [P.x1 - 0.95, P.z0 + 0.95], [P.x0 + 0.95, P.z1 - 0.95], [P.x1 - 0.95, P.z1 - 0.95]];
      for (const [x, z] of b) o.cercle(x, z, 0.75, { h: 1.4, type: 'haie' });
    }
    // les haies basses des allées
    for (const [ta, tb] of HAIE.troncons) for (const z of [HAIE.zSud, HAIE.zNord]) o.segment(ta, z, tb, z, { e: HAIE.ep, h: HAIE.h, type: 'haie' });
    // les bancs, les lanternes, les panneaux du bout est
    for (const x of BANCS_X) {
      o.boite(x, HAIE.zSud + 0.83 - 0.04, 0.95, 0.32, 0, { h: 0.9, type: 'banc' });
      o.boite(x, HAIE.zNord - 0.83 + 0.04, 0.95, 0.32, 0, { h: 0.9, type: 'banc' });
    }
    for (const b of BANCS_SEUIL) o.boite(b.x, b.z, 0.95, 0.32, (-b.cap * Math.PI) / 180, { h: 0.9, type: 'banc' });
    for (const x of LANTERNES_X) for (const z of [Z_SUD + 0.35, Z_NORD - 0.35]) o.cercle(x, z, 0.14, { h: 3.4, type: 'poteau', camera: false });
    for (const a of PANNEAUX_EST) o.segment(a.x, a.z - 0.62, a.x, a.z + 0.62, { e: 0.08, h: 1.95, type: 'dur' });
    // les deux piliers de la grille (déjà sur la ligne de la grille des données : ils arrêtent aussi la balle)
    for (const s of [-1, 1]) o.boite(EX, EZ + s * Z_PILIER, PILIER / 2, PILIER / 2, 0, { h: 1.9, type: 'dur' });
  },
  bancs(b) {
    for (const x of BANCS_X) {
      b.push({ x, z: HAIE.zSud + 0.83 + 0.02, cap: 0, y: 0.46, source: 'Z13 banc vert' });
      b.push({ x, z: HAIE.zNord - 0.83 - 0.02, cap: 180, y: 0.46, source: 'Z13 banc vert' });
    }
    for (const s of BANCS_SEUIL) b.push({ x: s.x, z: s.z, cap: s.cap, y: 0.46, source: 'Z13 banc du seuil' });
  },
  lieux: [],
};
