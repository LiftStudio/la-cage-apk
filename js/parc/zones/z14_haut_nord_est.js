// =====================================================================
//  ZONE Z14 : LE PARC HAUT NORD-EST (lot B7 du chantier « parc entier »)
// =====================================================================
// La terrasse haute, entre la perspective du 156 (Z13, au sud) et la limite nord-est (le passage du Pourquoi-Pas), du
// boulevard (Z18) au rebord du coteau (Z10, Z17). Un vaste sol de STABILISÉ beige clair, très plat (+10,7 à +11,4),
// semé d'îlots de grands arbres (marronniers, tilleuls : ceux de arbres.bin, aucun n'est planté ici), et ce qu'on y
// trouve (tools/parc/references_gmaps/R3.md et SYNTHESE.md § Z14, qui priment sur la conception ; photo 2 de
// tools/parc_becon_references.md ; sphères Google P1, S2, S4 de 2018, satellite antérieur à 2024) :
//
//   - la FONTAINE DES ANTIQUITÉS en (-110 ; -18), face à x+ (PV10, photo 2) : un socle de dalles grises de 5 x 5 m à
//     une marche, le dallage en étoile gris et blanc, le BASSIN OCTOGONAL bas (1,9 m), la STÈLE de pierre claire à
//     pilastre cannelé et fronton qui porte la bouche d'eau, deux PILIERS de brique rouge à bandes de pierre, chapiteaux
//     sculptés, médaillon ovale blanc sur celui de gauche, deux BORNES cylindriques à l'avant ; à droite, un bloc de
//     pierre (autre fragment) ; derrière, la tonnelle de fer noir et le grand bac en bois ; à côté, la rangée de bacs
//     brun orangé et le petit jardin clos d'un treillis ;
//   - la COLONNE ANTIQUE sur son piédestal (-107 ; -31) ;
//   - le MANÈGE (-112,7 ; -38,3), carrousel d'enfants de 10,8 m : plate-forme, montants de bois brun-rouge, frise
//     peinte pastel à cartouches, liseré rouge, toit pointu à fuseaux rouges et verts ; il TOURNE lentement (groupe
//     marqué `dynamique` et `nofuse`, animé par ctx.animer) ; la guérite de la caisse ; l'OCTOGONE gris accolé
//     (-115,4 ; -49,8) ;
//   - les BALANÇOIRES BATEAUX (-117 ; -27) : portiques en A, poutre, six nacelles, plate-forme de planches, grille
//     basse à anneaux ;
//   - la PLACE EN ÉVENTAIL (à la place de la « pelouse triangulaire » de la conception) : un quart de disque de 25 m
//     d'asphalte en sept rayons rose-rouge et gris, joints blancs, ouvert vers z- depuis la TENTE BLANCHE ronde
//     (-86,3 ; 8,9), en décor ;
//   - l'ancien café : le KIOSQUE VERT FONCÉ à toit blanc (-64,9 ; -14,7, l'obstacle « bâtiment » des données) et sa
//     TERRASSE RONDE close d'une haie basse (-72,5 ; -17,7) ;
//   - l'ÉDICULE WC rond et clair (-74,7 ; 20,2), le point d'eau, le ping-pong, la table de pique-nique ;
//   - le SECTEUR DES JEUX de 2024, autour de la boucle ovale de stabilisé : trois aires (tour à toboggan, trampolines
//     et tourniquet, portique de balançoires) sur sols souples, massifs de graminées rousses bordés d'arceaux noirs ;
//   - l'AIRE AU BATEAU du bord du coteau (-52 ; -83), disque de sable et bateau de bois ;
//   - les allées (allée nord-est en asphalte gris, allée du musée gris-brun, chemins de terre et de stabilisé), la
//     CLÔTURE de panneaux rigides verts de la limite nord-est et le portillon du musée ;
//   - le mobilier « du haut » (SYNTHESE.md § C) : bancs verts de square, mâts blancs à lanterne sur la place et
//     l'esplanade, globes blancs sur mât sombre le long des allées, mâts brun-rouille dans le secteur de 2024.
//
// LES LIMITES. Au sud, les chemins s'arrêtent sous la grande allée des parterres (Z13, z ≈ 27) ; à l'ouest, la grille
// du boulevard, le portail nord-est et les bâtiments de la PMI sont à Z18 ; à l'est, l'allée haute est à Z17 (l'allée
// nord-est part de son bord) ; le musée est à Z15 (js/parc/zones/z15_musee.js, qui reprend les outils d'ici).
//
// LES DONNÉES (tools/parc/gabarits.json, zone Z14, relues par l'outil de données) : le SOCLE de la fontaine (plan à
// +11,40) et son BASSIN (eau : la balle y tombe et revient), le dallage, l'esplanade de stabilisé et la place en
// enrobé (surfaces : le pas, le roulement de la balle) ; l'obstacle du manège (OSM) et celui du kiosque (bâtiment) ;
// les tracés des allées (monde.json, recopiés ci-dessous). Toute hauteur vient du sol du monde.
//
// RÈGLES DE ZONE : aucun Math.random (kit.alea, kit.bruit) ; matériaux du kit, plus un seul propre (la frise peinte du
// manège, une toile dessinée au premier appel) ; aucun arbre planté ; rien hors du groupe du morceau ; le manège et
// l'eau sont `dynamique` et `nofuse`.
import * as THREE from 'three';
import { solVu, decouper } from './coteau.js';

// ============================================================================================ les données
// (repère du terrain 1)
// La fontaine : centre du socle, sa hauteur (celle du gabarit socle_antiquites), sa face vers x+ (cap 90).
export const FONTAINE = { x: -110.0, z: -18.0, ySocle: 11.40, cote: 5.0, cap: 90 };
const COLONNE = { x: -107.0, z: -31.0 };
const MANEGE = { x: -112.7, z: -38.3, r: 5.4, anneau: 6.45 };
const GUERITE = { x: -120.0, z: -38.0 };
const OCTOGONE = { x: -115.4, z: -49.8, r: 3.0 };
// les balançoires bateaux : la poutre le long de x
const BATEAUX = { x: -117.0, z: -27.2, lx: 11.4, lz: 4.4 };
// la place en éventail : pivot, rayon, sept rayons sur un quart de tour centré sur z-
export const PLACE = { x: -86.3, z: 8.9, r: 25.0, rayons: 7, demiAngle: Math.PI / 4 };
const TENTE = { x: -86.3, z: 8.9, r: 4.8 };
// le kiosque : l'obstacle « bâtiment » des données (osm 362238999), une boîte de 5,1 m (x) sur 7,7 m (z)
export const KIOSQUE = { x: -64.9, z: -14.67, lx: 5.1, lz: 7.72, h: 2.75 };
const TERRASSE = { x: -72.5, z: -17.7, r: 5.0 };
const WC = { x: -74.7, z: 20.2, r: 1.75 };
const PINGPONG = { x: -107.6, z: 8.8 };
const POINT_EAU = { x: -94.5, z: 16.3 };
const PIQUE_NIQUE = { x: -92.9, z: -34.2 };
const AIRE_BATEAU = { x: -52.0, z: -83.0, r: 6.3 };
// les trois aires de 2024, dans la boucle
const AIRE_TOUR = { x: -79.0, z: -38.5, r: 5.0 };
const AIRE_TRAMPO = { x: -80.5, z: -56.0, r: 4.6 };
const AIRE_PORTIQUE = { x: -72.2, z: -44.5, lx: 5.2, lz: 4.2 };

// L'esplanade de stabilisé (le même contour que la surface « stabilise » des gabarits)
export const ESPLANADE = [[-124.5, -4.0], [-112.0, -1.5], [-103.0, -2.5], [-96.0, -6.0], [-86.0, -7.0], [-76.0, -5.0], [-66.0, -4.0], [-60.5, -8.0],
  [-60.5, -22.0], [-66.0, -28.0], [-78.0, -26.0], [-86.0, -28.0], [-93.0, -36.0], [-97.0, -50.0], [-103.0, -58.0], [-114.0, -59.5], [-122.0, -54.0],
  [-125.5, -40.0], [-125.5, -20.0]];

// Les allées (monde.json > allees, tracés de l'outil de données ; largeur ; matériau ; teinte relevée sur les photos, un
// cran plus sombre à l'écran : voir teinteEsplanade)
export const ALLEES = {
  allee_ne: { trace: [[-56.9, -70.9], [-62.9, -77.5], [-71.5, -82.4], [-77.1, -83.4], [-93.3, -83.5], [-108.9, -84.1], [-115.8, -85.9], [-123.5, -91.9], [-131.5, -98.9], [-140.4, -99.7]], largeur: 3.0, mat: 'asphalte', teinte: '#7a7772' },
  boucle_jeux: { trace: [[-76.4, -26.4], [-79.2, -27.7], [-81.5, -29.9], [-93.0, -56.7], [-92.6, -61.8], [-90.2, -65.7], [-86.3, -69.3], [-82.9, -71.2], [-79.1, -71.5], [-74.5, -70.7], [-70.3, -67.7], [-67.6, -65.0], [-66.2, -61.4], [-67.3, -33.2], [-68.1, -30.6], [-69.4, -29.3], [-72.3, -27.5], [-76.4, -26.4]], largeur: 3.0, mat: 'gravier', teinte: '#a39475', ferme: true },
  chemin_ne_1: { trace: [[-123.6, 27.5], [-122.7, 24.5], [-120.1, 19.8], [-114.7, 4.3], [-119.4, -2.0], [-119.8, -10.4], [-123.5, -35.5]], largeur: 2.5, mat: 'terreBattue', teinte: '#9c826c' },
  chemin_ne_2: { trace: [[-123.5, -35.5], [-119.2, -56.0], [-119.3, -76.5], [-115.8, -85.9]], largeur: 2.5, mat: 'terreBattue', teinte: '#9c826c' },
  chemin_ne_3: { trace: [[-131.5, -98.9], [-105.7, -100.2], [-77.9, -100.4], [-77.1, -83.4]], largeur: 3.0, mat: 'asphalte', teinte: '#6e675f' },
  chemin_ne_4: { trace: [[-106.5, -115.0], [-106.5, -113.6], [-105.7, -100.2]], largeur: 2.0, mat: 'gravier', teinte: '#9d8f72' },
  chemin_ne_5: { trace: [[-114.7, 4.3], [-108.0, 1.6], [-102.9, -4.0], [-101.9, -9.4], [-101.8, -14.7]], largeur: 2.0, mat: 'gravier', teinte: '#9d8f72' },
  chemin_ne_6: { trace: [[-60.3, -2.4], [-62.9, -1.9], [-65.6, 3.3], [-73.1, 2.4], [-79.2, 4.9], [-85.1, 8.3], [-90.1, 13.6]], largeur: 2.5, mat: 'gravier', teinte: '#9d8f72' },
  chemin_ne_7: { trace: [[-81.5, -29.9], [-85.0, -28.8], [-87.3, -24.9], [-90.1, 13.6], [-91.2, 27.5]], largeur: 2.5, mat: 'gravier', teinte: '#9d8f72' },
  chemin_ne_8: { trace: [[-59.4, -5.2], [-62.9, -1.9], [-70.2, -7.9], [-77.7, -14.3], [-87.3, -24.9]], largeur: 2.5, mat: 'gravier', teinte: '#9d8f72' },
};

// La limite nord-est (clôture de panneaux rigides verts de 2 m, SYNTHESE.md § Z14 ; la ligne de la grille des données,
// grille_boulevard, entre le coin de la PMI à Z18 et le musée) et le portillon du musée (portillon PMU des données)
const CLOTURE_NE = [[[-128.0, -114.3], [-107.5, -115.55]], [[-105.5, -115.65], [-76.2, -116.74]]];
const PORTILLON_MUSEE = { x: -106.5, z: -115.6, largeur: 2.0 };

// Les MORCEAUX : une partition de l'emprise (chaque case d'une surface, chaque bout d'allée, chaque objet va au morceau
// dont le rectangle contient son centre), et la boîte de chargement de chacun (ce qu'il dessine, bord compris).
const MORCEAUX = {
  Z14a: { nom: 'fontaine des Antiquités, colonne, balançoires bateaux', part: [-141, -34, -97, -4], boite: [-141, -36, -97, -1] },
  Z14b: { nom: 'manège, guérite, octogone', part: [-141, -75, -97, -34], boite: [-141, -75, -97, -30] },
  Z14c: { nom: 'place en éventail, tente, édicule, ping-pong', part: [-97, -6, -57, 27], boite: [-110, -17, -57, 27] },
  Z14d: { nom: 'bout de l’esplanade, ancien kiosque et sa terrasse', part: [-97, -26, -57, -6], boite: [-97, -29, -57, -3] },
  Z14e: { nom: 'jeux de 2024 et boucle', part: [-97, -75, -57, -26], boite: [-97, -75, -57, -24] },
  Z14f: { nom: 'chemins du nord-ouest', part: [-141, -4, -97, 27], boite: [-141, -4, -97, 27] },
  Z14g: { nom: 'allée nord-est, clôture, portillon du musée (ouest)', part: [-141, -117, -99, -75], boite: [-141, -117, -99, -75] },
  Z14h: { nom: 'allée nord-est (est), allée du musée, aire au bateau', part: [-99, -117, -44, -75], boite: [-99, -117, -45, -72] },
};

// ============================================================================================ petits outils
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const dans = (b, x, z) => x >= b[0] && x < b[2] && z >= b[1] && z < b[3];
// un polygone 2D [[x, z], ...] est-il convexe (tous les virages du même côté) ?
function convexe(P) {
  let s = 0;
  for (let i = 0, n = P.length; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n], c = P[(i + 2) % n];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(z) < 1e-10) continue;
    if (!s) s = Math.sign(z); else if (Math.sign(z) !== s) return false;
  }
  return true;
}
const CEL_X = -24.7, CEL_Z = -16;              // la trame du sol (js/monde_sol.js) : les cases des surfaces s'y calent
// La couleur moyenne de chaque matière du kit (la « cible » de js/parc/kit.js, MATIERES) : un multiplicateur de sommet
// qui l'amène à la teinte relevée sur les photos, c'est lin(teinte) / lin(cible).
const CIBLES = {
  taille: '#e0dacc', moellons: '#dad0bc', brique: '#9a4a3a', ardoise: '#656a6d', bois: '#cfcfcc', beton: '#ded9ce',
  terreBattue: '#c8ad98', gravier: '#cbc2af', stabilise: '#c8ad98', dalles: '#cac4b8', dallesSombres: '#7d7874',
  asphalte: '#8e8a85', asphalteRouge: '#a97c74', gazon: '#6f8a45', terre: '#4a3a2b', feuillage: '#ffffff',
};

// Les outils du lot B7 (zones Z14 et Z15) : ils ne dépendent que du kit et du monde, passés en paramètres.
export function outilsB7(kit, Monde) {
  const O = {};
  const lin = kit.lin;
  // la teinte `hex` sur la matière `mat` (multiplicateur de sommet), éventuellement assombrie de `f`
  O.c = (mat, hex, f = 1) => {
    const a = lin(hex), b = lin(CIBLES[mat.split('#')[0]] || '#ffffff');
    return [(a[0] / b[0]) * f, (a[1] / b[1]) * f, (a[2] / b[2]) * f];
  };
  // une peinture (la couleur du sommet est celle de l'objet)
  O.p = (hex, f = 1) => { const a = lin(hex); return [a[0] * f, a[1] * f, a[2] * f]; };
  O.sol = (x, z) => solVu(x, z);
  O.normale = (x, z, out) => Monde.normale(x + Monde.dx, z, out);
  O.bruit = kit.bruit; O.alea = kit.alea;
  O.T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
  // Un repère posé en (x, y, z), tourné de `cap` degrés (0 : sa face +z regarde z+ ; 90 : elle regarde x+, comme le
  // kit). Rend la fonction (lx, ly, lz, [m]) -> matrice du point local, suivie de m (rotation propre d'une pièce).
  O.repere = (x, y, z, cap = 0) => {
    const B = new THREE.Matrix4().makeRotationY((cap * Math.PI) / 180).setPosition(x, y, z);
    const f = (lx, ly, lz, m = null) => { const r = new THREE.Matrix4().multiplyMatrices(B, O.T(lx, ly, lz)); return m ? r.multiply(m) : r; };
    f.B = B;
    // un point local en coordonnées du monde (terrain 1)
    f.pt = (lx, ly, lz) => { const v = new THREE.Vector3(lx, ly, lz).applyMatrix4(B); return [v.x, v.y, v.z]; };
    return f;
  };
  // LES NAPPES POSÉES AU SOL (relecture du lot B7) : les maillages sans ombre portée d'un Lot (ses parts « #sol » :
  // esplanade, allées, place, dallage, anneau du manège, sable, pavés ; et le verre des lanternes) sortent de la carte
  // FIXE des ombres de contact (js/ombres_contact.js). Drapées 2 à 4 cm au-dessus du sol du monde, elles y entraient
  // comme des objets posés, et le plan des ombres de contact — plat, recentré sur le joueur par pas de 4 m — les
  // noircissait par plaques autour de lui, partout où le sol est à la hauteur de ce plan au centimètre près (vu sur la
  // place et sur l'allée du musée). Le drapeau `dynamique` est celui que ce plan écarte ; il écarte aussi ces nappes de
  // la fusion du morceau (un appel de plus au plus par matière) et de l'occlusion cuite, où elles n'ont rien à faire.
  // (le feuillage découpé, sans ombre portée lui aussi, n'y entre déjà pas : on le laisse tel quel)
  O.horsContact = (g) => {
    g.traverse((m) => { if (m.isMesh && !m.castShadow && !(m.material && m.material.alphaTest > 0)) m.userData.dynamique = true; });
    return g;
  };
  // Des taches lentes (3 à 4 m) et un grain (1 m) sur une teinte de base : les surfaces de sol ne se répètent pas.
  O.taches = (base, graine, ampl = 0.1) => {
    const out = [0, 0, 0];
    return (x, z) => {
      const f = (1 + ampl * (kit.bruit(x / 3.5, z / 3.5, graine) - 0.5)) * (1 + 0.5 * ampl * (kit.bruit(x / 0.9, z / 0.9, graine + 1) - 0.5));
      out[0] = base[0] * f; out[1] = base[1] * f; out[2] = base[2] * f;
      return out;
    };
  };

  // ---------------------------------------------------------------- surfaces drapées
  // UNE SURFACE drapée sur le sol, d'après un contour [[x, z], ...] (convexe ou non) : une trame de `pas` m calée sur
  // celle du sol, chaque case découpée par le contour (Sutherland-Hodgman : la case est convexe), triangulée ; chaque
  // sommet au plus haut des trois lectures du sol (solVu : le maillage du sol ne perce pas) plus `dy`.
  //  o.boite : [x0, z0, x1, z1] — seules les cases dont le CENTRE y est (un morceau dessine sa part) ;
  //  o.sauter(x, z) : une case dont les quatre coins y sont est sautée (une autre surface la couvre) ;
  //  o.couleur(x, z) ; o.tuile (côté réel de la texture, m) ; o.pas (1 m) ; o.dy (2 cm).
  //  o.budget : le budget() du contexte — la surface est alors un GÉNÉRATEUR (O.drapeG) qui rend la main entre deux
  //  rangées de cases ; O.drape la construit d'une traite.
  const V2 = new THREE.Vector2();
  O.drape = (lot, cle, poly, o = {}) => { const it = O.drapeG(lot, cle, poly, { ...o, budget: null }); let r; do r = it.next(); while (!r.done); return r.value; };
  O.drapeG = function* (lot, cle, poly, o = {}) {
    const p = lot.part(cle), pas = o.pas ?? 1, dy = o.dy ?? 0.02, tu = o.tuile ?? (kit.TUILES[cle.split('#')[0]] || 1);
    const B = o.boite || [-1e9, -1e9, 1e9, 1e9], nrm = { x: 0, y: 1, z: 0 }, blanc = [1, 1, 1];
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    x0 = Math.max(x0, B[0] - pas); x1 = Math.min(x1, B[2] + pas); z0 = Math.max(z0, B[1] - pas); z1 = Math.min(z1, B[3] + pas);
    const cx = CEL_X + Math.floor((x0 - CEL_X) / pas) * pas, cz = CEL_Z + Math.floor((z0 - CEL_Z) / pas) * pas;
    let n = 0;
    for (let za = cz; za < z1; za += pas) {
      for (let xa = cx; xa < x1; xa += pas) {
        if (!dans(B, xa + pas / 2, za + pas / 2)) continue;
        if (o.sauter && o.sauter(xa, za) && o.sauter(xa + pas, za) && o.sauter(xa, za + pas) && o.sauter(xa + pas, za + pas)) continue;
        const Q = decouper(poly, [xa, za, xa + pas, za + pas]);
        if (Q.length < 3) continue;
        // (une case entière, ou rognée par un bord convexe : un éventail ; sinon la triangulation de three)
        let T;
        if (convexe(Q)) { T = []; for (let i = 1; i < Q.length - 1; i++) T.push([0, i, i + 1]); }
        else { try { T = THREE.ShapeUtils.triangulateShape(Q.map(([x, z]) => V2.clone().set(x, z)), []); } catch (e) { T = []; } }
        if (!T.length) continue;
        const base = p.n;
        for (const [x, z] of Q) {
          Monde.normale(x + Monde.dx, z, nrm);
          lot.s(p, x, O.sol(x, z) + dy, z, nrm.x, nrm.y, nrm.z, x / tu, z / tu, o.couleur ? o.couleur(x, z) : blanc);
        }
        for (const [a, b, c] of T) lot.tri(p, base + a, base + b, base + c);
        n++;
      }
      if (o.budget && o.budget()) yield;
    }
    return n;
  };
  // UNE ALLÉE drapée : `trace` (coudes arrondis), `larg` ; sections tous les `o.pas` m (0,8), colonnes de 0,7 m au plus ;
  // seuls les carreaux dont le centre est dans o.boite et hors de o.sauter sont posés ; UV : u en travers, v le long.
  // o.couleur(x, z, e) (e : -1 à 1 en travers) ; o.dy (3 cm).
  O.chemin = (lot, cle, trace, larg, o = {}) => {
    const tr = o.arrondi === false ? trace : kit.arrondir(trace, Math.min(larg * 1.5, 4));
    const pts = kit.reechantillonner(tr, o.pas ?? 0.8), N = pts.length;
    if (N < 2) return;
    const nA = Math.max(3, Math.ceil(larg / 0.7) + 1), p = lot.part(cle), tu = o.tuile ?? (kit.TUILES[cle.split('#')[0]] || 1);
    const B = o.boite || [-1e9, -1e9, 1e9, 1e9], dy = o.dy ?? 0.03, nrm = { x: 0, y: 1, z: 0 }, blanc = [1, 1, 1];
    const rangs = [];
    for (let j = 0; j < N; j++) {
      const A = pts[Math.max(0, j - 1)], C = pts[Math.min(N - 1, j + 1)], Q = pts[j];
      let tx = C.x - A.x, tz = C.z - A.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      let m = 1;
      if (j > 0 && j < N - 1) { const l1 = Math.hypot(Q.x - A.x, Q.z - A.z) || 1; m = 1 / Math.max(0.35, (-tz) * (-(Q.z - A.z) / l1) + tx * ((Q.x - A.x) / l1)); }
      const r = [];
      for (let k = 0; k < nA; k++) {
        const t = -larg / 2 + (larg * k) / (nA - 1), x = Q.x - tz * t * m, z = Q.z + tx * t * m;
        r.push({ x, z, u: (t + larg / 2) / tu, v: Q.s / tu, e: t / (larg / 2), i: -1 });
      }
      rangs.push(r);
    }
    const sommet = (q) => {
      if (q.i < 0) { Monde.normale(q.x + Monde.dx, q.z, nrm); q.i = lot.s(p, q.x, O.sol(q.x, q.z) + dy, q.z, nrm.x, nrm.y, nrm.z, q.u, q.v, o.couleur ? o.couleur(q.x, q.z, q.e) : blanc); }
      return q.i;
    };
    for (let j = 0; j < N - 1; j++) {
      for (let k = 0; k < nA - 1; k++) {
        const a = rangs[j][k], b = rangs[j][k + 1], c = rangs[j + 1][k + 1], d = rangs[j + 1][k];
        const mx = (a.x + b.x + c.x + d.x) / 4, mz = (a.z + b.z + c.z + d.z) / 4;
        if (!dans(B, mx, mz) || (o.sauter && o.sauter(mx, mz))) continue;
        lot.quad(p, sommet(a), sommet(b), sommet(c), sommet(d));
      }
    }
  };
  // UN DISQUE (ou un anneau, `r0` > 0) drapé : aire de sable, sol souple, dalle ronde ; o.dy, o.couleur, o.segments.
  O.disque = (lot, cle, cx, cz, r1, r0 = 0, o = {}) => {
    const p = lot.part(cle), tu = o.tuile ?? (kit.TUILES[cle.split('#')[0]] || 1), dy = o.dy ?? 0.03, nrm = { x: 0, y: 1, z: 0 }, blanc = [1, 1, 1];
    const nS = o.segments ?? Math.max(16, Math.round(r1 * 5)), nR = Math.max(1, Math.round((r1 - r0) / 0.8));
    const id = [];
    for (let i = 0; i <= nR; i++) {
      const r = r0 + ((r1 - r0) * i) / nR, ligne = [];
      for (let k = 0; k < nS; k++) {
        const a = (k / nS) * Math.PI * 2, x = cx + Math.cos(a) * Math.max(r, 0.001), z = cz + Math.sin(a) * Math.max(r, 0.001);
        Monde.normale(x + Monde.dx, z, nrm);
        const y = o.y !== undefined ? o.y : O.sol(x, z) + dy;
        ligne.push(lot.s(p, x, y, z, nrm.x, nrm.y, nrm.z, x / tu, z / tu, o.couleur ? o.couleur(x, z, r) : blanc));
      }
      id.push(ligne);
    }
    for (let i = 0; i < nR; i++) for (let k = 0; k < nS; k++) {
      const k2 = (k + 1) % nS;
      lot.quad(p, id[i][k], id[i][k2], id[i + 1][k2], id[i + 1][k]);
    }
  };

  // ---------------------------------------------------------------- mobilier « du haut » (SYNTHESE.md § C)
  // LES LAMPADAIRES de Z14 : 'mat' (mât blanc fin de 5 m à lanterne : la place, l'esplanade), 'globe' (globe blanc sur
  // mât sombre de 3,5 m : les allées), 'rouille' (mât brun-rouille de 6 m, tête noire : le secteur de 2024). Tous dans le
  // Lot du morceau (peinture et verre : deux appels pour tous).
  O.lampe = (lot, x, z, style = 'globe', cap = 0) => {
    const y = kit.sol(x, z), M = (yy) => O.T(x, y + yy, z);
    if (style === 'mat') {
      const blanc = O.p('#e9e8e3');
      lot.tour('peinture', [[0.075, -0.1], [0.075, 0.3], [0.058, 0.38], [0.045, 4.5], [0.04, 4.62]], 10, M(0), { bande: true, couleur: blanc });
      lot.tour('peinture', [[0.04, 0], [0.13, 0.04], [0.13, 0.07], [0.09, 0.08]], 10, M(4.62), { bande: true, couleur: blanc, fond: true });
      lot.tour('verre', [[0.1, 0.08], [0.16, 0.2], [0.16, 0.44], [0.12, 0.5]], 10, M(4.62));
      lot.tour('peinture', [[0.19, 0.5], [0.19, 0.53], [0.05, 0.66], [0.02, 0.74], [0.001, 0.76]], 10, M(4.62), { bande: true, couleur: blanc, fond: true });
    } else if (style === 'rouille') {
      const rouille = O.p('#7a4a32');
      lot.tour('peinture', [[0.1, -0.1], [0.095, 0.4], [0.07, 5.6], [0.06, 6.0]], 10, M(0), { bande: true, couleur: rouille });
      const R = O.repere(x, y + 6.0, z, cap);
      lot.boite('peinture', 0.12, 0.12, 0.7, R(0, 0, 0.3), { bande: true, couleur: rouille });
      lot.boite('peinture', 0.3, 0.1, 0.55, R(0, -0.05, 0.75), { bande: true, couleur: O.p('#1b1c1c') });
      lot.boite('verre', 0.24, 0.02, 0.46, R(0, -0.11, 0.75));
    } else {
      const sombre = O.p('#2b2e2d');
      lot.tour('peinture', [[0.07, -0.1], [0.07, 0.25], [0.052, 0.32], [0.042, 3.25], [0.05, 3.3], [0.05, 3.36]], 10, M(0), { bande: true, couleur: sombre });
      lot.geo('verre', new THREE.SphereGeometry(0.2, 12, 8), M(3.55));
    }
  };
  // Un buisson dans un bac (feuillage bosselé, sa frange à peine : une sphère écrasée du matériau des haies du kit).
  O.buisson = (lot, x, y, z, r, teinte = kit.TEINTES.troene, graine = 0) => {
    const g = new THREE.IcosahedronGeometry(r, 1), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const vx = P.getX(i), vy = P.getY(i), vz = P.getZ(i), f = 0.85 + 0.3 * kit.alea(vx * 7 + graine, vz * 7 + vy * 3, 201 + graine);
      P.setXYZ(i, vx * f, vy * f * 0.8, vz * f);
    }
    g.computeVertexNormals();
    const t = 0.85 + 0.25 * kit.alea(x, z, 203 + graine);
    lot.geo('feuillage', g, O.T(x, y + r * 0.55, z), { couleur: [teinte[0] * t, teinte[1] * t, teinte[2] * t] });
  };
  // LES PANNEAUX RIGIDES de treillis soudé vert sombre (limite nord-est, SYNTHESE.md § C : #2e4a3a, 2 m) : poteaux tous
  // les 2,5 m, fils verticaux tous les 20 cm, fils horizontaux doublés aux deux plis en V.
  O.panneaux = (lot, ligne, h = 2.0) => {
    const vert = O.p('#2e4a3a'), pts = kit.reechantillonner(ligne, 2.5);
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i], y = kit.sol(q.x, q.z);
      lot.boite('peinture', 0.06, h + 0.15, 0.06, O.T(q.x, y + (h + 0.15) / 2 - 0.1, q.z), { bande: true, couleur: vert });
      if (i === pts.length - 1) break;
      const r = pts[i + 1], y2 = kit.sol(r.x, r.z), L = Math.hypot(r.x - q.x, r.z - q.z), n = Math.max(2, Math.round(L / 0.2));
      for (let k = 1; k < n; k++) {
        const t = k / n, x = q.x + (r.x - q.x) * t, z = q.z + (r.z - q.z) * t, yb = y + (y2 - y) * t + 0.05;
        lot.barre([x, yb, z], [x, yb + h - 0.1, z], 0.006, 0.006, { couleur: vert, bouts: false });
      }
      for (const hh of [0.06, 0.62, 0.68, 1.36, 1.42, h - 0.06]) lot.barre([q.x, y + hh, q.z], [r.x, y2 + hh, r.z], 0.008, 0.008, { couleur: vert, bouts: false });
    }
  };
  return O;
}

// ============================================================================================ la frise du manège
// LA TOILE DE LA FRISE (le seul matériau propre de la zone) : quatre scènes pastel de manège (ciel vert d'eau, collines,
// silhouettes roses et mauves, nuages : photos P1 de 2018, R3.md Z14-04 et Z14-05) et un cartouche blanc à bord vert
// portant un blason, dessinés une fois dans une toile de 1024 x 256 (sans Math.random : les nuages et les touffes sont
// tirés de kit.alea). Cases : scènes (x 0 à 1024, y 0 à 160, quatre de 256 px), cartouche (x 0 à 128, y 160 à 256).
let _matFrise = null;
function materiauFrise(kit) {
  if (_matFrise) return _matFrise;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d'), A = (i, k) => kit.alea(i * 1.37, k * 2.11, 311);
  for (let s = 0; s < 4; s++) {
    const x0 = s * 256;
    const ciel = g.createLinearGradient(0, 0, 0, 160);
    ciel.addColorStop(0, ['#8fc9c2', '#a7d6d8', '#9cc7e0', '#b3dccd'][s]); ciel.addColorStop(1, '#e3f1ea');
    g.fillStyle = ciel; g.fillRect(x0, 0, 256, 160);
    // nuages
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let k = 0; k < 4; k++) { const cx = x0 + 20 + A(s, k) * 216, cy = 18 + A(s, k + 9) * 40; for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(cx + j * 11, cy + (j % 2) * 4, 10 + 4 * A(s + j, k), 0, Math.PI * 2); g.fill(); } }
    // collines et prairie
    g.fillStyle = ['#7fbf8a', '#8cc79a', '#74b384', '#96cf9c'][s];
    g.beginPath(); g.moveTo(x0, 160);
    for (let k = 0; k <= 16; k++) g.lineTo(x0 + k * 16, 100 + 18 * Math.sin(k * 0.7 + s) + 8 * A(s, k + 20));
    g.lineTo(x0 + 256, 160); g.closePath(); g.fill();
    g.fillStyle = '#5f9f6c'; g.fillRect(x0, 138, 256, 22);
    // personnages et animaux de conte : silhouettes rondes roses, mauves, jaunes, blanches
    const tons = ['#e7a3bd', '#a58ad0', '#f1d36b', '#f4f1ea', '#e98f6f', '#7fa7dc'];
    for (let k = 0; k < 5; k++) {
      const cx = x0 + 24 + k * 48 + 10 * A(s, k + 30), h = 34 + 30 * A(s, k + 40), t = tons[Math.floor(A(s, k + 50) * tons.length)];
      g.fillStyle = t; g.beginPath(); g.ellipse(cx, 150 - h / 2, 11 + 5 * A(s, k), h / 2, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f3dcc8'; g.beginPath(); g.arc(cx, 150 - h - 8, 8, 0, Math.PI * 2); g.fill();
      g.fillStyle = tons[(Math.floor(A(s, k + 60) * tons.length) + 2) % tons.length]; g.fillRect(cx - 9, 150 - h - 20, 18, 7);
    }
    // cadre doré et filet rouge
    g.strokeStyle = '#c9a24a'; g.lineWidth = 6; g.strokeRect(x0 + 3, 3, 250, 154);
    g.strokeStyle = '#a83a30'; g.lineWidth = 2; g.strokeRect(x0 + 8, 8, 240, 144);
  }
  // le cartouche : blanc, bord vert, blason (écu rouge et bleu à croix d'or), rinceaux verts
  g.fillStyle = '#f2efe6'; g.fillRect(0, 160, 128, 96);
  g.strokeStyle = '#3e8a5a'; g.lineWidth = 8; g.strokeRect(4, 164, 120, 88);
  g.fillStyle = '#3e8a5a'; for (const [x, y] of [[18, 178], [110, 178], [18, 242], [110, 242]]) { g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#b8323a'; g.beginPath(); g.moveTo(44, 184); g.lineTo(84, 184); g.lineTo(84, 214); g.quadraticCurveTo(64, 240, 44, 214); g.closePath(); g.fill();
  g.fillStyle = '#2f5ea8'; g.fillRect(64, 184, 20, 30);
  g.fillStyle = '#e2b640'; g.fillRect(61, 184, 6, 44); g.fillRect(44, 196, 40, 6);
  // le reste : blanc cassé (une case neutre pour les chants)
  g.fillStyle = '#ece8de'; g.fillRect(128, 160, 896, 96);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  _matFrise = new THREE.MeshStandardMaterial({ map: t, roughness: 0.62, metalness: 0, side: THREE.DoubleSide });
  _matFrise.name = 'Z14 · frise du manège';
  return _matFrise;
}

// ============================================================================================ 1. LA FONTAINE DES ANTIQUITÉS
// Photo 2 ; R3.md Z14-08 et Z14-09 (sphère P1, 2018) : de face (x+), de gauche à droite (z+ vers z-) : le pilier au
// médaillon, la stèle au-dessus du bassin, le second pilier. Repère local : origine au centre du socle, à sa surface
// (+11,40, le plan du gabarit socle_antiquites) ; +z local = la face (x+ du monde), +x local = la droite de qui la
// regarde (z- du monde).
function* fontaine(kit, O, lot, groupe, b) {
  // (le repère est posé 2 cm au-dessus du plan des données : le dessus du socle cache le sol du monde, qui est au même
  // niveau et le perçait par endroits, par les joints du dallage)
  const F = FONTAINE, L = O.repere(F.x, F.ySocle + 0.02, F.z, F.cap);
  // (relecture : des pierres plus grises et plus froides que le calcaire blond du kit, mesurées sur la sphère P1 de
  // 2018 à côté de la stèle — la margelle, le socle et les bornes y sont gris, la stèle d'un blanc cassé)
  const pierre = O.c('taille', '#c4c0b6'), pierreClaire = O.c('taille', '#dad7cf'), grise = O.c('taille', '#9b978d');
  // ---- le socle : une marche de dalles grises, 5 x 5 m (le plan des données tient 4,2 m : le socle couvre la marche du
  // sol entre deux nœuds de la grille) ; son pied descend sous le plus bas du sol alentour
  let yMin = Infinity;
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; yMin = Math.min(yMin, kit.sol(F.x + Math.cos(a) * 3.0, F.z + Math.sin(a) * 3.0)); }
  const hS = F.ySocle + 0.02 - yMin + 0.12;
  lot.boite('taille', F.cote, hS, F.cote, L(0, -hS / 2, 0), { chanfrein: 0.035, couleur: grise });
  // ---- le dallage en étoile, gris et blanc (photo 2) : seize secteurs du bassin au bord du socle (8 cm de pierre
  // laissés au bord) ; entre eux, un joint où se montre la pierre grise du socle (les secteurs sont rétrécis d'un
  // angle de 4 millièmes : 5 mm au pied, 1,5 cm au bord)
  const h = F.cote / 2 - 0.08, r0 = 1.06, yD = 0.006;
  for (let k = 0; k < 16; k++) {
    const a0 = (k / 16) * Math.PI * 2 + 0.004, a1 = ((k + 1) / 16) * Math.PI * 2 - 0.004;
    const bord = (a) => { const c = Math.cos(a), s = Math.sin(a), t = h / Math.max(Math.abs(c), Math.abs(s)); return [c * t, s * t]; };
    const [ea, fa] = bord(a0), [eb, fb] = bord(a1);
    // (les rayons partent du pourtour du bassin, décalé de 0,5 m vers l'avant, et vont au bord du socle)
    const pts = [L.pt(Math.cos(a0) * r0, yD, 0.5 + Math.sin(a0) * r0), L.pt(ea, yD, fa), L.pt(eb, yD, fb), L.pt(Math.cos(a1) * r0, yD, 0.5 + Math.sin(a1) * r0)];
    const blanc = k % 2 === 0, v = 0.94 + 0.1 * kit.alea(k, 3, 207);
    // (le blanc un cran sous le blanc pur : en plein soleil il sortait plus clair que tout le reste de la vue)
    lot.polygone('taille#sol', pts, [0, 1, 0], { couleur: blanc ? O.c('taille', '#dcd8cf', v) : O.c('taille', '#8d8982', v) });
  }
  if (b()) yield;
  // ---- le bassin octogonal (1,9 m entre faces), margelle de 0,5 m à tablette débordante, fond de pierre
  const ap = 0.95, R = ap / Math.cos(Math.PI / 8), Ri = (ap - 0.15) / Math.cos(Math.PI / 8), Rt = (ap + 0.035) / Math.cos(Math.PI / 8);
  lot.tour('taille', [[R, -0.02], [R, 0.43], [Rt, 0.44], [Rt, 0.5], [Ri, 0.5], [Ri, 0.12], [0.001, 0.12]], 8, L(0, 0, 0.5), { a0: Math.PI / 8, facettes: true, vif: true, couleur: pierre });
  // l'eau, à 12 cm sous la tablette (kit.eauBassin : animée, `dynamique` et `nofuse`)
  const eau = [];
  for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + (k / 8) * Math.PI * 2; const p = L.pt(Math.cos(a) * Ri * 1.01, 0, 0.5 + Math.sin(a) * Ri * 1.01); eau.push([p[0], p[2]]); }
  groupe.add(kit.eauBassin({ poly: eau, y: F.ySocle + 0.38, couleur: '#56706a' }));
  if (b()) yield;
  // ---- la stèle (pierre claire #c8c2b4, R3.md) : plinthe, fût, pilastre cannelé, chapiteau, corniche, fronton
  const zs = -1.02, S = (w, hh, d, y, z = zs, c = pierreClaire, ch = 0.012) => lot.boite('taille', w, hh, d, L(0, y + hh / 2, z), { chanfrein: ch, couleur: c, uvDecal: [kit.alea(y, z, 211), 0.4] });
  S(0.98, 0.1, 0.58, 0); S(0.92, 0.52, 0.52, 0.1);
  S(0.64, 1.96, 0.4, 0.62); S(0.72, 0.06, 0.46, 0.62);
  const zf = zs + 0.21;                                   // la face avant de la stèle
  // le pilastre cannelé : base, fût à cinq cannelures, chapiteau
  lot.boite('taille', 0.44, 0.07, 0.06, L(0, 0.8, zf + 0.03), { chanfrein: 0.01, couleur: pierreClaire });
  lot.boite('taille', 0.3, 1.6, 0.04, L(0, 1.63, zf + 0.02), { chanfrein: 0.006, couleur: pierreClaire });
  for (let i = -2; i <= 2; i++) lot.boite('taille', 0.026, 1.5, 0.012, L(i * 0.055, 1.63, zf + 0.043), { couleur: O.c('taille', '#a39d8f') });
  lot.boite('taille', 0.4, 0.1, 0.07, L(0, 2.48, zf + 0.03), { chanfrein: 0.012, couleur: pierreClaire });
  S(0.76, 0.08, 0.52, 2.58); S(0.84, 0.08, 0.6, 2.66, zs, pierreClaire, 0.018);
  // le fronton : un prisme triangulaire (0,96 m de base, 0,34 m de flèche) et son tympan en retrait
  const fr = [L.pt(0, 2.74, zs - 0.29), L.pt(0, 2.74, zs + 0.29)];
  lot.prisme('taille', [[-0.42, 0], [0.42, 0], [0, 0.32]], fr.map((q) => q), { couleur: pierreClaire, haut: [0, 1, 0] });
  lot.prisme('taille', [[-0.32, 0.03], [0.32, 0.03], [0, 0.23]], [L.pt(0, 2.74, zs + 0.29), L.pt(0, 2.74, zs + 0.31)], { couleur: O.c('taille', '#bdb6a6') });
  // la bouche d'eau : un mascaron de bronze et son bec, au-dessus de l'arrière du bassin
  const bronze = O.p('#5b4a2e');
  lot.geo('peinture', new THREE.SphereGeometry(0.1, 12, 8).scale(1, 1.15, 0.45), L(0, 0.72, zf + 0.02), { bande: true, couleur: bronze });
  lot.geo('peinture', new THREE.CylinderGeometry(0.022, 0.03, 0.26, 8).rotateX(Math.PI / 2), L(0, 0.7, zf + 0.15), { bande: true, couleur: bronze });
  if (b()) yield;
  // ---- les deux piliers de brique à bandes de pierre (0,6 x 0,6 m, 4 m), entraxe 3,5 m
  // (relecture : la brique du kit est d'un rouge vif, joints compris ; tenue telle quelle (#92473a), elle sortait
  // lie-de-vin, deux fois plus sombre et bien plus saturée que sur la sphère P1, où les piliers, joints clairs et
  // brique passée mêlés, sont d'un brun orangé à peine plus foncé que la stèle. Le multiplicateur la ramène là.)
  const brique = O.c('brique', '#b98a70'), bande = O.c('taille', '#cbc1aa');
  for (const px of [-1.75, 1.75]) {
    const zp = -1.2, B = (cle, w, hh, y, c, ch = 0.01) => lot.boite(cle, w, hh, w, L(px, y + hh / 2, zp), { chanfrein: ch, couleur: c, uvDecal: [kit.alea(px, y, 213), kit.alea(y, px, 214)] });
    B('taille', 0.8, 0.12, 0, pierre, 0.02); B('taille', 0.74, 0.34, 0.12, pierre, 0.015); B('taille', 0.68, 0.06, 0.46, pierre);
    // six assises de brique et cinq bandes de pierre (une bande tous les cinq ou six rangs, R3.md)
    let y = 0.52; const hb = 0.4175;
    for (let i = 0; i < 6; i++) {
      B('brique', 0.6, hb, y, brique.map((v) => v * (0.94 + 0.12 * kit.alea(px, i, 215))), 0.004); y += hb;
      if (i < 5) { B('taille', 0.62, 0.075, y, bande, 0.01); y += 0.075; }
    }
    // le chapiteau sculpté : astragale, corbeille à volutes d'angle et rosace, tailloir, bloc de couronnement
    B('taille', 0.66, 0.06, y, pierre); y += 0.06;
    B('taille', 0.66, 0.34, y, pierreClaire, 0.02);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      lot.geo('taille', new THREE.CylinderGeometry(0.055, 0.055, 0.12, 10).rotateX(Math.PI / 2), L(px + sx * 0.33, y + 0.25, zp + sz * 0.3), { couleur: pierreClaire });
    }
    lot.geo('taille', new THREE.CylinderGeometry(0.1, 0.1, 0.035, 14).rotateX(Math.PI / 2), L(px, y + 0.17, zp + 0.345), { couleur: pierre });
    y += 0.34;
    B('taille', 0.86, 0.1, y, pierre, 0.02); y += 0.1;
    B('taille', 0.74, 0.14, y, pierreClaire, 0.02); y += 0.14;
    B('taille', 0.8, 0.05, y, pierre, 0.015);
  }
  if (b()) yield;
  // le médaillon ovale blanc du pilier de gauche (vu de face : z+ du monde, x local -1,75), à mi-hauteur, dans son cadre
  lot.geo('peinture', new THREE.CylinderGeometry(0.28, 0.28, 0.03, 24).rotateX(Math.PI / 2).scale(1, 1.36, 1), L(-1.75, 2.05, -0.885), { bande: true, couleur: O.p('#7e7a72') });
  lot.geo('peinture', new THREE.CylinderGeometry(0.25, 0.25, 0.04, 24).rotateX(Math.PI / 2).scale(1, 1.38, 1), L(-1.75, 2.05, -0.875), { bande: true, couleur: O.p('#fbfaf6') });
  // ---- les deux bornes cylindriques de pierre grise aux angles avant : des tronçons de colonne à base moulurée
  // (relecture : 1,15 m et Ø 0,4 m, mesurés sur la sphère P1 au zoom contre la largeur du pilier ; 0,9 m les rendait
  // deux fois plus trapues que sur la photo)
  for (const bx of [-2.1, 2.1]) {
    lot.tour('taille', [[0.235, -0.02], [0.235, 0.1], [0.21, 0.14], [0.2, 0.2], [0.195, 1.05], [0.18, 1.11], [0.12, 1.14], [0.001, 1.15]], 14, L(bx, 0, 2.1), { couleur: O.c('taille', '#a7a196'), vif: false });
  }
  // ---- le bloc de pierre claire (un autre fragment de façade) : sur la sphère P1, il est posé à même la terre, à
  // droite du second pilier et un peu en retrait, près des bacs (et non derrière la stèle)
  {
    const Bk = O.repere(F.x - 1.4, kit.sol(F.x - 1.4, F.z - 3.0), F.z - 3.0, F.cap + 8);
    lot.boite('taille', 0.66, 0.9, 0.58, Bk(0, 0.4, 0), { chanfrein: 0.04, couleur: O.c('taille', '#d4ccbb') });
    lot.boite('taille', 0.76, 0.08, 0.66, Bk(0, 0.89, 0), { chanfrein: 0.02, couleur: O.c('taille', '#cbc3b1') });
  }
}

// Les abords de la fontaine : la tonnelle de fer noir et le grand bac en bois (derrière, photo 2), la rangée de bacs
// brun-rouge plantés et le petit jardin clos d'un treillis bas (R3.md Z14-08), les bancs.
function* abordsFontaine(kit, O, lot, groupe, b) {
  const fer = kit.TEINTES.fer;
  // ---- la tonnelle : quatre poteaux, quatre arceaux et deux arceaux croisés (un dôme de fer rond), 3 m de côté
  {
    const cx = -115.2, cz = -21.6, a = 1.45, y0 = kit.sol(cx, cz), H = 2.3;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      lot.barre([cx + sx * a, y0 - 0.1, cz + sz * a], [cx + sx * a, y0 + H, cz + sz * a], 0.045, 0.045, { couleur: fer });
      lot.tour('peinture', [[0.045, 0], [0.045, 0.03], [0.02, 0.06], [0.001, 0.1]], 8, O.T(cx + sx * a, y0 + H, cz + sz * a), { bande: true, couleur: fer });
    }
    const arc = (A, B, fl) => {
      const pts = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([A[0] + (B[0] - A[0]) * t, y0 + H + fl * Math.sin(Math.PI * t), A[1] + (B[1] - A[1]) * t]); }
      lot.prisme('peinture', [[-0.015, -0.015], [0.015, -0.015], [0.015, 0.015], [-0.015, 0.015]], pts, { bande: true, couleur: fer });
    };
    const C = [[cx - a, cz - a], [cx + a, cz - a], [cx + a, cz + a], [cx - a, cz + a]];
    for (let i = 0; i < 4; i++) arc(C[i], C[(i + 1) % 4], 0.45);
    arc(C[0], C[2], 0.95); arc(C[1], C[3], 0.95);
    for (let i = 0; i < 4; i++) { const A = C[i], B = C[(i + 1) % 4]; lot.barre([A[0], y0 + 0.9, A[1]], [B[0], y0 + 0.9, B[1]], 0.02, 0.02, { couleur: fer }); }
  }
  if (b()) yield;
  // ---- le grand bac en bois (2,6 x 1,3 m, 0,7 m), planté d'arbustes
  {
    const cx = -115.4, cz = -14.4, y0 = kit.sol(cx, cz), bois = O.c('bois', '#6b4a32');
    lot.boite('bois', 2.6, 0.8, 1.3, O.T(cx, y0 + 0.3, cz), { chanfrein: 0.02, couleur: bois });
    lot.boite('bois', 2.7, 0.06, 1.4, O.T(cx, y0 + 0.73, cz), { chanfrein: 0.01, couleur: O.c('bois', '#5e412c') });
    lot.boite('terre#sol', 2.4, 0.02, 1.1, O.T(cx, y0 + 0.66, cz), { couleur: [0.8, 0.8, 0.8] });
    for (let i = 0; i < 4; i++) O.buisson(lot, cx - 0.9 + i * 0.6, y0 + 0.62, cz + 0.12 * (i % 2 ? 1 : -1), 0.42 + 0.1 * kit.alea(i, cz, 221), kit.TEINTES.troene, i);
  }
  if (b()) yield;
  // ---- la rangée de bacs brun-rouge (1,5 x 0,5 x 0,5 m), plantés d'arbustes taillés, le long de l'esplanade
  for (let i = 0; i < 4; i++) {
    const cx = -105.8, cz = -21.9 - i * 1.85, y0 = kit.sol(cx, cz);
    // (brun orangé comme sur la sphère P1 — de l'acier Corten plus que du bois peint —, et non brun-rouge sombre)
    lot.boite('bois', 0.52, 0.6, 1.5, O.T(cx, y0 + 0.2, cz), { chanfrein: 0.015, couleur: O.c('bois', '#9a5234') });
    lot.boite('terre#sol', 0.42, 0.02, 1.4, O.T(cx, y0 + 0.47, cz), { couleur: [0.8, 0.8, 0.8] });
    O.buisson(lot, cx, y0 + 0.42, cz - 0.35, 0.3, kit.TEINTES.buis, i * 2);
    O.buisson(lot, cx, y0 + 0.42, cz + 0.35, 0.28, kit.TEINTES.troene, i * 2 + 1);
  }
  if (b()) yield;
  // ---- le petit jardin clos : treillis de bois bas (0,8 m) à losanges, un massif de vivaces dedans
  {
    const x0 = -104.4, x1 = -101.2, z0 = -29.4, z1 = -25.0, bois = O.c('bois', '#8a6c4c');
    const cote = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = cote[i], [bx, bz] = cote[i + 1], Lc = Math.hypot(bx - ax, bz - az), n = Math.round(Lc / 0.3);
      const ya = kit.sol(ax, az), yb = kit.sol(bx, bz);
      for (const hh of [0.08, 0.8]) lot.prisme('bois', [[-0.02, -0.02], [0.02, -0.02], [0.02, 0.02], [-0.02, 0.02]], [[ax, ya + hh, az], [bx, yb + hh, bz]], { couleur: bois });
      lot.boite('bois', 0.07, 0.95, 0.07, O.T(ax, ya + 0.4, az), { couleur: bois });
      for (let k = 0; k < n; k++) {
        // deux lattes croisées par pas de 30 cm : le losange du treillis
        const t0 = k / n, t1 = (k + 1) / n, p = (t) => [ax + (bx - ax) * t, ya + (yb - ya) * t, az + (bz - az) * t];
        const A = p(t0), B = p(t1);
        lot.prisme('bois', [[-0.008, -0.012], [0.008, -0.012], [0.008, 0.012], [-0.008, 0.012]], [[A[0], A[1] + 0.1, A[2]], [B[0], B[1] + 0.78, B[2]]], { couleur: bois, bouts: false });
        lot.prisme('bois', [[-0.008, -0.012], [0.008, -0.012], [0.008, 0.012], [-0.008, 0.012]], [[A[0], A[1] + 0.78, A[2]], [B[0], B[1] + 0.1, B[2]]], { couleur: bois, bouts: false });
      }
    }
    groupe.add(kit.massifFleurs({ poly: [[x0 + 0.25, z0 + 0.25], [x1 - 0.25, z0 + 0.25], [x1 - 0.25, z1 - 0.25], [x0 + 0.25, z1 - 0.25]], palette: 'vivaces', densite: 1.0, bombe: 0.08 }));
  }
}

// ============================================================================================ 2. LA COLONNE ANTIQUE
// R3.md Z14-06 et Z14-16 : fût lisse de pierre grise (#9b958a) d'environ 3 m, chapiteau simple à tailloir carré, sur un
// piédestal cubique de pierre claire d'environ 0,9 m.
// (relecture, d'après la même sphère P1 au cap 60° : un fût ÉLANCÉ, d'environ 0,4 m de diamètre pour 3,3 m, et un
// piédestal de la même pierre grise, à peine plus clair — le fût de 0,52 m et le piédestal crème en faisaient une
// colonne trapue sur un socle neuf)
function colonne(kit, O, lot) {
  const { x, z } = COLONNE, y0 = kit.sol(x, z), claire = O.c('taille', '#b3ada2'), grise = O.c('taille', '#9b958a');
  const B = (w, h, y, c, ch = 0.015) => lot.boite('taille', w, h, w, O.T(x, y0 + y + h / 2, z), { chanfrein: ch, couleur: c, uvDecal: [kit.alea(x, y, 231), 0.2] });
  B(1.0, 0.16, -0.08, claire, 0.02); B(0.84, 0.84, 0.08, claire); B(0.92, 0.1, 0.92, claire, 0.02);
  const yb = y0 + 1.02;
  lot.tour('taille', [[0.29, 0], [0.29, 0.05], [0.265, 0.08], [0.27, 0.12], [0.23, 0.16], [0.215, 0.19]], 16, O.T(x, yb, z), { couleur: grise });
  lot.tour('taille', [[0.205, 0], [0.203, 1.0], [0.195, 2.0], [0.183, 2.9], [0.175, 3.2]], 16, O.T(x, yb + 0.19, z), { couleur: grise });
  const yc = yb + 3.39;
  lot.tour('taille', [[0.18, 0], [0.195, 0.03], [0.185, 0.05], [0.25, 0.13]], 16, O.T(x, yc, z), { couleur: grise });
  lot.boite('taille', 0.54, 0.1, 0.54, O.T(x, yc + 0.18, z), { chanfrein: 0.012, couleur: grise });
}

// ============================================================================================ 3. LES BALANÇOIRES BATEAUX
// R3.md Z14-15 (juil. 2022) et Z14-17 (juil. 2026) : sept portiques en A d'acier bronze-gris foncé (#4a4a44) hauts de
// 4,5 m, reliés en tête par une poutre à volutes ; six nacelles-bateaux (bâche brun-rouge) ; une plate-forme de planches
// un peu surélevée ; une grille noire basse à bandeau d'anneaux tout autour ; un panneau de bois orange.
function* balancoires(kit, O, lot, groupe, b) {
  const Bt = BATEAUX, y0 = kit.sol(Bt.x, Bt.z), acier = O.p('#4a4a44'), L = O.repere(Bt.x, y0, Bt.z, 90);
  // (repère : +z local le long de la poutre = x+ du monde ; +x local = z- du monde)
  const lx = Bt.lz, lz = Bt.lx;
  lot.boite('bois', lx, 0.22, lz, L(0, 0.06, 0), { chanfrein: 0.01, couleur: O.c('bois', '#8a6a4a') });
  // les lames de la plate-forme : des joints sombres tous les 14 cm
  for (let k = -Math.floor(lx / 0.28); k <= Math.floor(lx / 0.28); k++) lot.boite('bois', 0.012, 0.004, lz - 0.04, L(k * 0.14, 0.172, 0), { couleur: O.c('bois', '#3e2f22') });
  const H = 4.45, n = 7, pas = (lz - 0.8) / (n - 1);
  for (let i = 0; i < n; i++) {
    const zz = -lz / 2 + 0.4 + i * pas;
    for (const s of [-1, 1]) lot.barre(L.pt(s * 1.7, 0.17, zz), L.pt(0, H, zz), 0.07, 0.07, { couleur: acier });
    lot.barre(L.pt(-1.05, 1.6, zz), L.pt(1.05, 1.6, zz), 0.045, 0.045, { couleur: acier });
    // la volute de tête (fer plat roulé de part et d'autre du sommet)
    for (const s of [-1, 1]) {
      const pts = [];
      for (let k = 0; k <= 10; k++) { const t = (k / 10) * Math.PI * 1.6, r = 0.2 * (1 - k / 14); pts.push(L.pt(s * (0.12 + r * Math.sin(t)), H - 0.15 + r * Math.cos(t), zz)); }
      lot.prisme('peinture', [[-0.01, -0.006], [0.01, -0.006], [0.01, 0.006], [-0.01, 0.006]], pts, { bande: true, couleur: acier });
    }
  }
  lot.boite('peinture', 0.12, 0.16, lz - 0.6, L(0, H + 0.02, 0), { bande: true, couleur: acier });
  if (b()) yield;
  // les six nacelles, au repos : coque en banane (bâche brun-rouge), quatre tiges vers la poutre
  const coque = [[-0.36, 0.5], [-0.34, 0.12], [-0.22, 0], [0.22, 0], [0.34, 0.12], [0.36, 0.5], [0.31, 0.5], [0.29, 0.14], [0.19, 0.05], [-0.19, 0.05], [-0.29, 0.14], [-0.31, 0.5]];
  const bache = O.p('#6a3a30');
  for (let i = 0; i < n - 1; i++) {
    const zz = -lz / 2 + 0.4 + (i + 0.5) * pas;
    const chemin = [[-1.1, 1.5], [-0.85, 1.05], [-0.45, 0.86], [0, 0.82], [0.45, 0.86], [0.85, 1.05], [1.1, 1.5]].map(([u, y]) => L.pt(u, y, zz));
    lot.prisme('peinture', coque.map(([a, b]) => [a * 0.95, b]), chemin, { bande: true, couleur: bache, echelles: [0.55, 0.85, 1, 1, 1, 0.85, 0.55] });
    for (const s of [-1, 1]) for (const t of [-0.26, 0.26]) lot.barre(L.pt(s * 0.62, 1.2, zz + t), L.pt(0, H - 0.05, zz + t), 0.02, 0.02, { couleur: acier });
    lot.boite('bois', 0.06, 0.05, 0.62, L(0, 1.18, zz), { couleur: O.c('bois', '#6a4a32') });
  }
  if (b()) yield;
  // la grille noire basse à bandeau d'anneaux (0,95 m), ouverte d'un passage côté esplanade (x+ du monde)
  const x0 = Bt.x - Bt.lx / 2 - 0.3, x1 = Bt.x + Bt.lx / 2 + 0.3, z0 = Bt.z - Bt.lz / 2 - 0.3, z1 = Bt.z + Bt.lz / 2 + 0.3;
  groupe.add(yield* kit.grillePas({ ligne: [[x1, z0 + 1.4], [x1, z0], [x0, z0], [x0, z1], [x1, z1], [x1, z1 - 1.4]], h: 0.95, muret: 0, pointes: false, anneaux: true, travee: 2.0 }, b));   // (lot C6 : en tranches)
  // le panneau de bois orange (règlement), sur deux poteaux, à l'entrée
  const pX = x1 + 0.6, pZ = Bt.z - 1.2, py = kit.sol(pX, pZ);
  for (const s of [-0.35, 0.35]) lot.boite('bois', 0.07, 1.5, 0.07, O.T(pX, py + 0.75, pZ + s), { couleur: O.c('bois', '#5a4632') });
  lot.boite('bois', 0.04, 0.6, 0.9, O.T(pX, py + 1.25, pZ), { chanfrein: 0.01, couleur: O.c('bois', '#d9772b') });
}

// ============================================================================================ 4. LE MANÈGE
// R3.md Z14-04, Z14-05, Z14-18 (2018 à sept. 2026 : toujours là) : un carrousel d'enfants de 10,8 m. Plate-forme ronde
// de planches surélevée de 0,25 m dans un anneau de béton gris ; douze montants brun-rouge de 2,4 m ; au-dessus, une
// frise peinte d'un mètre (panneaux cintrés pastel, cartouches blancs à bord vert aux angles) sous un lambrequin rouge
// (relecture : un liseré rouge) ; sous-face de planches brun sombre garnie d'ampoules ; toit à seize fuseaux rouges et
// verts, faîte à 6,6 m (R3.md : 6 à 7 m), épi doré ; au centre, le fût peint ; voitures, camion de pompiers, avion jaune,
// cheval blanc.
// Tout ce qui tourne est dans UN groupe, posé au centre, marqué `dynamique` et `nofuse`, tourné par ctx.animer (un tour
// en 24 s) ; l'anneau de béton et la guérite restent dans le Lot du morceau.
function* manege(kit, O, lot, ctx) {
  const b = ctx.budget;
  const M = MANEGE, y0 = kit.sol(M.x, M.z) + 0.02, N = 12;
  // ---- ce qui ne tourne pas : l'anneau de béton gris (1 m), la guérite orange et jaune de la caisse
  O.disque(lot, 'beton#sol', M.x, M.z, M.anneau, M.r - 0.3, { dy: 0.04, couleur: O.taches(O.c('beton', '#8e8a84'), 241, 0.12), segments: 48 });
  {
    const G = O.repere(GUERITE.x, kit.sol(GUERITE.x, GUERITE.z), GUERITE.z, 90);
    lot.boite('bois', 1.3, 1.95, 1.1, G(0, 0.95, 0), { chanfrein: 0.01, couleur: O.c('bois', '#d9812e') });
    lot.boite('peinture', 1.55, 0.12, 1.35, G(0, 2.0, 0), { bande: true, couleur: O.p('#e8c23a') });
    lot.boite('peinture', 1.3, 0.28, 0.02, G(0, 1.8, 0.56), { bande: true, couleur: O.p('#e8c23a') });
    lot.boite('peinture', 0.8, 0.5, 0.02, G(0, 1.3, 0.56), { bande: true, couleur: kit.TEINTES.vitre });
    lot.boite('peinture', 0.9, 0.05, 0.12, G(0, 1.03, 0.6), { bande: true, couleur: O.p('#e8c23a') });
  }
  if (b()) yield;
  // ---- ce qui tourne (repère local : centre, au niveau du sol)
  const rot = new kit.Lot('manège');
  const rouge = O.p('#8e2b22'), or = O.p('#c9a24a');
  // la plate-forme de planches et sa jupe peinte rouge et or
  rot.tour('bois', [[M.r, 0.02], [M.r, 0.25], [0.001, 0.25]], 48, null, { couleur: O.c('bois', '#8c6a48') });
  rot.tour('peinture', [[M.r + 0.015, 0.0], [M.r + 0.015, 0.2], [M.r + 0.03, 0.24], [M.r + 0.03, 0.27], [M.r - 0.05, 0.27]], 48, null, { bande: true, couleur: rouge });
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    rot.boite('peinture', 0.34, 0.05, 0.02, O.T(Math.cos(a) * (M.r + 0.035), 0.12, Math.sin(a) * (M.r + 0.035)).multiply(new THREE.Matrix4().makeRotationY(-a + Math.PI / 2)), { bande: true, couleur: or });
  }
  // les douze poteaux : des montants de bois CARRÉS, brun-rouge sombre, sans bague (relecture : sphère P1 de 2018 au
  // zoom, et photos de 2022 et 2026 ; les fûts ronds à bagues d'or en faisaient un manège de chevaux de bois)
  const rP = M.r - 0.2;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2, x = Math.cos(a) * rP, z = Math.sin(a) * rP;
    rot.boite('bois', 0.13, 2.47, 0.13, O.T(x, 0.25 + 2.47 / 2, z).multiply(new THREE.Matrix4().makeRotationY(-a)), { chanfrein: 0.012, couleur: O.c('bois', '#6a2a22') });
  }
  if (b()) yield;
  // la couronne : une ceinture de planches brun sombre sous la frise, et la sous-face du toit (planches, ampoules)
  rot.tour('bois', [[M.r - 0.1, 2.68], [M.r, 2.7], [M.r, 2.78], [M.r - 0.3, 2.8]], 24, null, { couleur: O.c('bois', '#4a3426') });
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    rot.geo('verre', new THREE.SphereGeometry(0.035, 6, 4), O.T(Math.cos(a) * (M.r - 0.35), 2.72, Math.sin(a) * (M.r - 0.35)));
  }
  // le lambrequin : un liseré de petits festons rouges qui borde le bas de la frise (12 côtés x 8 festons ; relecture :
  // sur les photos, un bord rouge découpé de quelques centimètres, pas de grands festons rouges et blancs de chapiteau)
  {
    const p = rot.part('peinture'), rL = M.r + 0.06;
    for (let k = 0; k < N; k++) {
      const a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2;
      const A = [Math.cos(a0) * rL, Math.sin(a0) * rL], B = [Math.cos(a1) * rL, Math.sin(a1) * rL];
      const nx = (A[0] + B[0]) / 2, nz = (A[1] + B[1]) / 2, nl = Math.hypot(nx, nz);
      for (let f = 0; f < 8; f++) {
        const c = O.p('#a8302c'), t0 = f / 8, t1 = (f + 1) / 8, base = p.n;
        const P = (t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
        const pts = [];
        pts.push([...P(t0), 2.74]); pts.push([...P(t1), 2.74]);
        for (let j = 1; j < 6; j++) { const t = t1 - ((t1 - t0) * j) / 6, dyf = 0.07 * Math.sin((Math.PI * j) / 6); pts.push([...P(t), 2.74 - 0.03 - dyf]); }
        for (const [x, z, y] of pts) rot.s(p, x, y, z, nx / nl, 0, nz / nl, 0.25, 0.5, c);
        for (let j = 1; j < pts.length - 1; j++) rot.tri(p, base, base + j, base + j + 1);
      }
    }
  }
  if (b()) yield;
  // le toit à seize fuseaux, ROUGES et VERTS en alternance (R3.md : rouge #c63a3f, vert #3e9a6e ; relecture, sphère
  // P1 et photos de 2022 : pas de fuseau blanc, le blanc du satellite est le reflet de la toile). Deux pentes : une
  // jupe presque plate, du dessus de la frise (+3,4) à 3 m du mât, que la frise cache à hauteur d'homme, puis le cône
  // pointu (environ 45°) jusqu'à l'épi (+6,6) — c'est ce petit cône qu'on voit dépasser de la frise sur les photos ;
  // d'un seul cône large, le toit écrasait la frise. La toile est un peu creusée entre les points du profil.
  {
    const p = rot.part('peinture'), prof = [[M.r + 0.05, 3.4], [4.2, 3.62], [3.0, 3.86], [2.0, 4.85], [1.0, 5.8], [0.12, 6.6]];
    const tons = [O.p('#c63a3f'), O.p('#3e9a6e')];
    const nF = 16;
    for (let k = 0; k < nF; k++) {
      const c = tons[k % 2];
      for (let j = 0; j < prof.length - 1; j++) {
        const [ra, ya] = prof[j], [rb, yb] = prof[j + 1];
        const base = p.n;
        for (const [r, y, s] of [[ra, ya, 0], [ra, ya, 1], [rb, yb, 1], [rb, yb, 0]]) {
          const a = ((k + s) / nF) * Math.PI * 2, am = ((k + 0.5) / nF) * Math.PI * 2;
          const dr = rb - ra, dy = yb - ya, l = Math.hypot(dr, dy) || 1, nr = dy / l, ny = -dr / l;
          rot.s(p, Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(am) * nr, ny, Math.sin(am) * nr, 0.25, 0.5, c);
        }
        rot.quad(p, base, base + 1, base + 2, base + 3);
      }
    }
    // la sous-face (pour qui regarde d'en dessous, depuis la plate-forme : planches sombres)
    rot.tour('bois', [[0.8, 3.62], [M.r, 3.36]], 16, null, { couleur: O.c('bois', '#3e2c22') });
    // l'épi doré et sa boule
    rot.tour('peinture', [[0.14, 6.55], [0.06, 6.67], [0.1, 6.8], [0.07, 6.9], [0.02, 7.15], [0.001, 7.3]], 10, null, { bande: true, couleur: or });
  }
  if (b()) yield;
  // le fût central : un tambour peint (vert d'eau, filets d'or) du plancher à la sous-face
  rot.tour('peinture', [[0.75, 0.25], [0.75, 0.4], [0.68, 0.45], [0.68, 3.1], [0.78, 3.2], [0.78, 3.6]], 12, null, { bande: true, couleur: O.p('#8fc2b9'), facettes: true, vif: true });
  for (const yy of [0.5, 1.8, 3.05]) rot.tour('peinture', [[0.69, -0.04], [0.71, 0], [0.69, 0.04]], 12, O.T(0, yy, 0), { bande: true, couleur: or, facettes: true });
  // les véhicules et le cheval, à 3,7 m du centre : de petites boîtes peintes
  const veh = [
    ['voiture', '#c8302b'], ['cheval', '#f2efe8'], ['avion', '#e8c23a'], ['pompiers', '#b3261e'],
    ['voiture', '#f0f0ea'], ['moto', '#2f6fb0'], ['cheval', '#f2efe8'], ['voiture', '#3e9a6e'],
  ];
  veh.forEach(([type, hex], i) => {
    const a = (i / veh.length) * Math.PI * 2 + 0.2, rr = 3.7, V = O.repere(Math.cos(a) * rr, 0.25, Math.sin(a) * rr, (-a * 180) / Math.PI);
    const c = O.p(hex), noir = O.p('#1c1c1c');
    if (type === 'cheval') {
      // le cheval de bois blanc à selle rose (R3.md Z14-18) : corps, encolure penchée, tête allongée, oreilles,
      // crinière et queue dorées, jambes (celles de devant repliées au galop), la barre de cuivre qui le porte
      rot.geo('peinture', new THREE.SphereGeometry(0.3, 12, 8).scale(0.6, 0.72, 1.4), V(0, 0.98, 0), { bande: true, couleur: c });
      rot.geo('peinture', new THREE.CylinderGeometry(0.085, 0.13, 0.52, 8).rotateX(0.62), V(0, 1.28, 0.36), { bande: true, couleur: c });
      rot.geo('peinture', new THREE.BoxGeometry(0.12, 0.15, 0.36).rotateX(0.45), V(0, 1.5, 0.6), { bande: true, couleur: c });
      for (const s of [-0.04, 0.04]) rot.boite('peinture', 0.025, 0.09, 0.03, V(s, 1.66, 0.5), { bande: true, couleur: c });
      rot.geo('peinture', new THREE.BoxGeometry(0.03, 0.12, 0.44).rotateX(0.62), V(0, 1.4, 0.3), { bande: true, couleur: or });
      rot.geo('peinture', new THREE.CylinderGeometry(0.02, 0.05, 0.45, 6).rotateX(-0.5), V(0, 0.9, -0.52), { bande: true, couleur: or });
      rot.boite('peinture', 0.34, 0.05, 0.32, V(0, 1.2, -0.05), { bande: true, couleur: O.p('#e7a3bd') });
      for (const [sx, sz] of [[-0.09, -0.26], [0.09, -0.26]]) rot.barre(V.pt(sx, 0.4, sz - 0.05), V.pt(sx, 0.88, sz), 0.05, 0.05, { couleur: c });
      for (const sx of [-0.09, 0.09]) { rot.barre(V.pt(sx, 0.88, 0.26), V.pt(sx, 0.62, 0.42), 0.05, 0.05, { couleur: c }); rot.barre(V.pt(sx, 0.62, 0.42), V.pt(sx, 0.5, 0.3), 0.045, 0.045, { couleur: c }); }
      rot.tour('peinture', [[0.022, 0], [0.022, 3.2]], 8, V(0, 0.2, 0), { bande: true, couleur: or });
    } else if (type === 'avion') {
      rot.geo('peinture', new THREE.CylinderGeometry(0.2, 0.14, 1.3, 10).rotateX(Math.PI / 2), V(0, 0.55, 0), { bande: true, couleur: c });
      rot.boite('peinture', 1.5, 0.05, 0.36, V(0, 0.6, 0.1), { bande: true, couleur: c });
      rot.boite('peinture', 0.05, 0.36, 0.25, V(0, 0.8, -0.55), { bande: true, couleur: O.p('#c8302b') });
      rot.boite('peinture', 0.05, 0.42, 0.06, V(0, 0.55, 0.68), { bande: true, couleur: noir });
    } else {
      const lg = type === 'pompiers' ? 1.4 : type === 'moto' ? 0.9 : 1.1, lr = type === 'moto' ? 0.3 : 0.62;
      rot.boite('peinture', lr, 0.32, lg, V(0, 0.42, 0), { bande: true, couleur: c, chanfrein: 0.04 });
      rot.boite('peinture', lr * 0.85, 0.28, lg * 0.45, V(0, 0.72, -lg * 0.12), { bande: true, couleur: type === 'pompiers' ? c : O.p('#f1efe8'), chanfrein: 0.03 });
      if (type === 'pompiers') rot.boite('peinture', 0.1, 0.06, lg * 0.9, V(0.2, 0.92, 0), { bande: true, couleur: O.p('#c9c9c4') });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) rot.geo('peinture', new THREE.CylinderGeometry(0.1, 0.1, 0.06, 10).rotateZ(Math.PI / 2), V(sx * (lr / 2 + 0.02), 0.34, sz * lg * 0.32), { bande: true, couleur: noir });
    }
  });
  if (b()) yield;
  const g = rot.maillages('manège qui tourne', 0);
  // LA FRISE PEINTE (matériau propre : la toile de materiauFrise) : douze panneaux plans entre les poteaux, bord haut
  // cintré, et douze cartouches aux angles, un peu plus hauts ; les deux faces (la frise se voit aussi de l'intérieur)
  {
    const pos = [], nor = [], uv = [], idx = [];
    const rF = M.r + 0.06, yb = 2.72, yh = 3.62;
    const pt = (a) => [Math.cos(a) * rF, Math.sin(a) * rF];
    for (let k = 0; k < N; k++) {
      const a0 = (k / N) * Math.PI * 2 + 0.06, a1 = ((k + 1) / N) * Math.PI * 2 - 0.06;
      const A = pt(a0), B = pt(a1), am = (a0 + a1) / 2, nx = Math.cos(am), nz = Math.sin(am), s = k % 4;
      const nC = 8, base = pos.length / 3;
      for (let j = 0; j <= nC; j++) {
        const t = j / nC, x = A[0] + (B[0] - A[0]) * t, z = A[1] + (B[1] - A[1]) * t, haut = yh + 0.14 * Math.sin(Math.PI * t) - 0.05;
        pos.push(x, yb, z, x, haut, z); nor.push(nx, 0, nz, nx, 0, nz);
        uv.push((s * 256 + 4 + 248 * t) / 1024, 1 - 156 / 256, (s * 256 + 4 + 248 * t) / 1024, 1 - 4 / 256);
      }
      for (let j = 0; j < nC; j++) { const a = base + j * 2; idx.push(a, a + 2, a + 3, a, a + 3, a + 1); }
      // le cartouche de l'angle suivant : un écu plus haut que la frise (0,6 x 1,15 m)
      const ac = ((k + 1) / N) * Math.PI * 2, C = [Math.cos(ac) * (rF + 0.04), Math.sin(ac) * (rF + 0.04)], tx = -Math.sin(ac), tz = Math.cos(ac);
      const b2 = pos.length / 3, w = 0.34, y0c = yb - 0.08, y1c = yh + 0.28;
      for (const [u, v, du, dv] of [[-w, y0c, 0, 1], [w, y0c, 1, 1], [w, y1c, 1, 0], [-w, y1c, 0, 0]]) {
        pos.push(C[0] + tx * u, v, C[1] + tz * u); nor.push(Math.cos(ac), 0, Math.sin(ac));
        uv.push((4 + du * 120) / 1024, 1 - (164 + dv * 88) / 256);
      }
      idx.push(b2, b2 + 1, b2 + 2, b2, b2 + 2, b2 + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const frise = new THREE.Mesh(geo, materiauFrise(kit));
    frise.name = 'manège · frise peinte'; frise.castShadow = true; frise.receiveShadow = true;
    g.add(frise);
  }
  g.name = 'manège (tourne)';
  g.position.set(M.x + ctx.Monde.dx, y0, M.z);
  g.userData.dynamique = true; g.userData.nofuse = true;
  g.traverse((o) => { o.userData.dynamique = true; o.userData.nofuse = true; });
  // un tour en 24 s, dans le sens des aiguilles d'une montre vu d'en haut (comme les manèges de France)
  ctx.animer((dt, t) => { g.rotation.y = -(t * Math.PI * 2) / 24; });
  ctx.groupe.add(g);
}

// L'OCTOGONE GRIS d'environ 6 m accolé au manège (R3.md Z14-03, au satellite : une dalle ou un kiosque bas) : un abri
// ouvert, huit poteaux sur une dalle de béton, toit en pavillon de zinc gris.
function octogone(kit, O, lot) {
  const { x, z, r } = OCTOGONE, y0 = kit.sol(x, z), gris = O.p('#5b5f60');
  lot.tour('beton', [[r + 0.15, -0.25], [r + 0.15, 0.1], [r + 0.1, 0.13], [0.001, 0.13]], 8, O.T(x, y0, z), { a0: Math.PI / 8, facettes: true, vif: true, couleur: O.c('beton', '#b3afa6') });
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + (k / 8) * Math.PI * 2, px = x + Math.cos(a) * (r - 0.1), pz = z + Math.sin(a) * (r - 0.1);
    lot.boite('peinture', 0.1, 2.35, 0.1, O.T(px, y0 + 0.13 + 1.17, pz), { bande: true, couleur: gris });
  }
  lot.tour('peinture', [[r + 0.35, 2.4], [r + 0.35, 2.55], [0.3, 3.45], [0.001, 3.55]], 8, O.T(x, y0, z), { a0: Math.PI / 8, facettes: true, vif: true, bande: true, couleur: O.p('#8f9496') });
  lot.tour('peinture', [[0.2, 3.3], [r + 0.1, 2.38]], 8, O.T(x, y0, z), { a0: Math.PI / 8, facettes: true, bande: true, couleur: O.p('#4b4f50') });
}

// ============================================================================================ 5. LA PLACE EN ÉVENTAIL, LA TENTE
// SYNTHESE.md Z14 et R3.md Z14-02, Z14-13 : un quart de disque d'asphalte de 25 m, sept rayons alternés rose-rouge
// (#c98a8a) et gris (#a9a59a), joints soulignés de blanc, pivot à la tente blanche. Rend la fonction « dans la place ».
export function dansPlace(x, z) {
  const P = PLACE, dx = x - P.x, dz = z - P.z, r = Math.hypot(dx, dz);
  if (r > P.r) return false;
  const a = Math.atan2(dx, -dz);                         // 0 : vers z- ; positif vers x+
  return Math.abs(a) <= P.demiAngle;
}
function* place(kit, O, lot, b) {
  const P = PLACE, p = lot.part('asphalte#sol'), nrm = { x: 0, y: 1, z: 0 };
  const rose = O.c('asphalte', '#c98a8a'), gris = O.c('asphalte', '#a9a59a'), blanc = O.c('asphalte', '#ecebe6');
  const dir = (a) => [Math.sin(a), -Math.cos(a)];
  const tr = O.taches([1, 1, 1], 251, 0.12), nR = Math.ceil(P.r / 1.0);
  const sommet = (x, z, dy, c) => { O.normale(x, z, nrm); const t = tr(x, z); return lot.s(p, x, O.sol(x, z) + dy, z, nrm.x, nrm.y, nrm.z, x / 4.04, z / 4.04, [c[0] * t[0], c[1] * t[1], c[2] * t[2]]); };
  for (let k = 0; k < P.rayons; k++) {
    if (b()) yield;
    const a0 = -P.demiAngle + (2 * P.demiAngle * k) / P.rayons, a1 = -P.demiAngle + (2 * P.demiAngle * (k + 1)) / P.rayons;
    const c = k % 2 === 0 ? rose : gris, nA = Math.max(2, Math.ceil(((a1 - a0) * P.r) / 1.2));
    const id = [];
    for (let i = 0; i <= nR; i++) {
      const r = 0.4 + ((P.r - 0.4) * i) / nR, ligne = [];
      for (let j = 0; j <= nA; j++) { const [dx, dz] = dir(a0 + ((a1 - a0) * j) / nA); ligne.push(sommet(P.x + dx * r, P.z + dz * r, 0.035, c)); }
      id.push(ligne);
    }
    for (let i = 0; i < nR; i++) for (let j = 0; j < nA; j++) lot.quad(p, id[i][j], id[i][j + 1], id[i + 1][j + 1], id[i + 1][j]);
  }
  if (b()) yield;
  // les joints blancs : sur chaque limite de rayon et le long de l'arc (10 cm)
  const bande = (pts, larg) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az) || 1, rx = -(bz - az) / l * larg / 2, rz = (bx - ax) / l * larg / 2;
      lot.quad(p, sommet(ax - rx, az - rz, 0.042, blanc), sommet(bx - rx, bz - rz, 0.042, blanc), sommet(bx + rx, bz + rz, 0.042, blanc), sommet(ax + rx, az + rz, 0.042, blanc));
    }
  };
  for (let k = 0; k <= P.rayons; k++) {
    const [dx, dz] = dir(-P.demiAngle + (2 * P.demiAngle * k) / P.rayons), pts = [];
    for (let i = 0; i <= nR; i++) { const r = 4.9 + ((P.r - 0.05 - 4.9) * i) / nR; pts.push([P.x + dx * r, P.z + dz * r]); }
    bande(pts, 0.1);
  }
  const arc = [];
  for (let j = 0; j <= 40; j++) { const [dx, dz] = dir(-P.demiAngle + (2 * P.demiAngle * j) / 40); arc.push([P.x + dx * (P.r - 0.05), P.z + dz * (P.r - 0.05)]); }
  bande(arc, 0.1);
}

// LA TENTE BLANCHE ronde de 9,6 m au pivot de la place (satellite, drone de Haythem ; en décor) : une paroi de toile à
// vingt-quatre pans, un lambrequin festonné, un toit conique un peu creusé, l'épi du mât.
function tente(kit, O, lot) {
  const T = TENTE, y0 = kit.sol(T.x, T.z) - 0.05, toile = O.p('#efede6'), ombre = O.p('#d9d6cc');
  lot.tour('peinture', [[T.r, 0], [T.r, 2.3]], 24, O.T(T.x, y0, T.z), { bande: true, couleur: toile, facettes: true, vif: true });
  // les coutures des lés et les piquets (les arêtes de la paroi)
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2, x = T.x + Math.cos(a) * (T.r + 0.01), z = T.z + Math.sin(a) * (T.r + 0.01);
    lot.boite('peinture', 0.05, 2.3, 0.05, O.T(x, y0 + 1.15, z), { bande: true, couleur: ombre });
  }
  // la porte, fermée : un pan un peu plus sombre côté place (vers z-)
  lot.boite('peinture', 1.6, 2.1, 0.03, O.T(T.x, y0 + 1.05, T.z - T.r - 0.02), { bande: true, couleur: O.p('#d6d2c6') });
  // le lambrequin festonné et le toit
  const p = lot.part('peinture');
  for (let k = 0; k < 48; k++) {
    const a0 = (k / 48) * Math.PI * 2, a1 = ((k + 1) / 48) * Math.PI * 2, rr = T.r + 0.18, base = p.n;
    const pts = [[a0, 2.45], [a1, 2.45]];
    for (let j = 1; j < 6; j++) pts.push([a1 - ((a1 - a0) * j) / 6, 2.45 - 0.22 - 0.12 * Math.sin((Math.PI * j) / 6)]);
    const am = (a0 + a1) / 2;
    for (const [a, y] of pts) lot.s(p, T.x + Math.cos(a) * rr, y0 + y, T.z + Math.sin(a) * rr, Math.cos(am), 0, Math.sin(am), 0.25, 0.5, toile);
    for (let j = 1; j < pts.length - 1; j++) lot.tri(p, base, base + j, base + j + 1);
  }
  lot.tour('peinture', [[T.r + 0.2, 2.42], [T.r + 0.18, 2.5], [3.2, 3.55], [1.4, 4.55], [0.35, 5.05], [0.12, 5.12]], 24, O.T(T.x, y0, T.z), { bande: true, couleur: toile, facettes: true });
  lot.tour('peinture', [[0.05, 5.0], [0.05, 5.7], [0.1, 5.75], [0.001, 5.9]], 8, O.T(T.x, y0, T.z), { bande: true, couleur: O.p('#b9b6ac') });
}

// ============================================================================================ 6. L'ANCIEN KIOSQUE, SA TERRASSE
// SYNTHESE.md Z14 et R3.md Z14-14 (sphère S2, 2018 ; S4) : une boîte vert foncé (#1f4a3c) d'environ 3 m, à toit blanc,
// enseigne blanche en longueur au-dessus du guichet ; devant (x-), la TERRASSE RONDE close d'une haie taillée de 0,8 m,
// poteaux de bois à guirlandes d'ampoules, parasols blancs repliés, tables. Fermé aujourd'hui : volets clos.
function* kiosque(kit, O, lot, groupe, b) {
  const K = KIOSQUE;
  let yMin = Infinity;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) yMin = Math.min(yMin, kit.sol(K.x + sx * K.lx / 2, K.z + sz * K.lz / 2));
  const y0 = yMin - 0.05, vert = O.c('bois', '#1f4a3c'), vertClair = O.c('bois', '#2a5a4a'), blanc = O.p('#ebe9e2');
  // le socle de béton, les murs de planches verticales, le toit blanc débordant
  lot.boite('beton', K.lx + 0.1, 0.25, K.lz + 0.1, O.T(K.x, y0 + 0.05, K.z), { chanfrein: 0.02, couleur: O.c('beton', '#a9a59c') });
  lot.boite('bois', K.lx, K.h - 0.25, K.lz, O.T(K.x, y0 + 0.2 + (K.h - 0.25) / 2, K.z), { couleur: vert });
  // les couvre-joints des planches, tous les 32 cm, sur chaque face (ox, oz : la normale sortante de la face)
  const couvre = (x0, z0, x1, z1, ox, oz) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 0.32);
    for (let k = 1; k < n; k++) { const t = k / n; lot.boite('bois', 0.035, K.h - 0.35, 0.035, O.T(x0 + (x1 - x0) * t + ox * 0.012, y0 + 0.25 + (K.h - 0.35) / 2, z0 + (z1 - z0) * t + oz * 0.012), { couleur: vertClair }); }
  };
  const X0 = K.x - K.lx / 2, X1 = K.x + K.lx / 2, Z0 = K.z - K.lz / 2, Z1 = K.z + K.lz / 2;
  couvre(X0, Z1, X0, Z0, -1, 0); couvre(X1, Z0, X1, Z1, 1, 0); couvre(X0, Z0, X1, Z0, 0, -1); couvre(X1, Z1, X0, Z1, 0, 1);
  lot.boite('peinture', K.lx + 0.7, 0.16, K.lz + 0.7, O.T(K.x, y0 + K.h + 0.08, K.z), { bande: true, couleur: blanc, chanfrein: 0.02 });
  lot.boite('peinture', K.lx + 0.74, 0.24, K.lz + 0.74, O.T(K.x, y0 + K.h - 0.04, K.z), { bande: true, couleur: O.p('#dcdad2') });
  // côté terrasse (x-) : le guichet fermé de volets, l'enseigne blanche au-dessus ; une porte au bout z+
  lot.boite('bois', 0.05, 1.15, 3.4, O.T(X0 - 0.03, y0 + 1.55, K.z), { couleur: vertClair });
  for (let k = -5; k <= 5; k++) lot.boite('bois', 0.06, 1.1, 0.02, O.T(X0 - 0.05, y0 + 1.55, K.z + k * 0.3), { couleur: vert });
  lot.boite('peinture', 0.2, 0.08, 3.6, O.T(X0 - 0.12, y0 + 0.98, K.z), { bande: true, couleur: O.p('#2b3a33') });
  lot.boite('peinture', 0.04, 0.34, 4.6, O.T(X0 - 0.06, y0 + 2.4, K.z), { bande: true, couleur: blanc });
  lot.boite('peinture', 0.9, 2.05, 0.05, O.T(K.x + 1.2, y0 + 1.25, Z1 + 0.03), { bande: true, couleur: O.p('#183a2f') });
  if (b()) yield;
  // ---- la terrasse ronde : la haie taillée (ouverte côté place, et là où elle touche le kiosque), les poteaux de bois,
  // les guirlandes d'ampoules tendues vers le toit du kiosque, les tables et les parasols repliés
  const T = TERRASSE, arcs = [[0.62, 2.95], [3.33, 5.66]];
  for (const [a0, a1] of arcs) {
    const ligne = [];
    for (let k = 0; k <= 16; k++) { const a = a0 + ((a1 - a0) * k) / 16; ligne.push([T.x + Math.cos(a) * T.r, T.z + Math.sin(a) * T.r]); }
    groupe.add(kit.haieTaillee({ ligne, h: 0.82, ep: 0.6, essence: 'troene', arrondi: 0.15 }));
  }
  if (b()) yield;
  const bois = O.c('bois', '#6b5238'), poteaux = [];
  for (const a of [0.9, 2.2, 3.9, 5.3]) {
    const x = T.x + Math.cos(a) * (T.r - 0.6), z = T.z + Math.sin(a) * (T.r - 0.6), y = kit.sol(x, z);
    lot.boite('bois', 0.12, 3.1, 0.12, O.T(x, y + 1.5, z), { couleur: bois });
    poteaux.push([x, y + 3.0, z]);
  }
  // les guirlandes : des fils qui pendent (chaînette) d'un poteau à l'autre et vers l'avant-toit, une ampoule tous les 50 cm
  const accroches = [...poteaux, [X0 - 0.3, y0 + K.h - 0.1, K.z - 2.5], [X0 - 0.3, y0 + K.h - 0.1, K.z + 2.5]];
  const liens = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [3, 5], [1, 5], [2, 4]];
  for (const [i, j] of liens) {
    const A = accroches[i], B = accroches[j], L = Math.hypot(B[0] - A[0], B[2] - A[2]), n = Math.max(4, Math.round(L / 0.5));
    let prev = null;
    for (let k = 0; k <= n; k++) {
      const t = k / n, P = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t - 0.45 * Math.sin(Math.PI * t) * Math.min(1, L / 6), A[2] + (B[2] - A[2]) * t];
      if (prev) lot.barre(prev, P, 0.006, 0.006, { couleur: O.p('#222222'), bouts: false });
      if (k > 0 && k < n) lot.geo('verre', new THREE.SphereGeometry(0.035, 6, 4), O.T(P[0], P[1] - 0.05, P[2]));
      prev = P;
    }
  }
  if (b()) yield;
  const metal = O.p('#3c4046');
  const tables = [[-2.2, -1.2], [-1.8, 1.8], [0.9, -2.3], [1.0, 1.6]];
  tables.forEach(([dx, dz], i) => {
    const x = T.x + dx, z = T.z + dz, y = kit.sol(x, z);
    lot.tour('peinture', [[0.25, 0], [0.25, 0.03], [0.04, 0.05], [0.035, 0.7], [0.36, 0.71], [0.36, 0.74], [0.001, 0.745]], 12, O.T(x, y, z), { bande: true, couleur: metal });
    for (const s of [-1, 1]) {
      const R = O.repere(x + s * 0.62, y, z + 0.2 * s, 90 + s * 90);
      lot.boite('peinture', 0.42, 0.04, 0.42, R(0, 0.45, 0), { bande: true, couleur: O.p('#3f6b4a') });
      lot.boite('peinture', 0.42, 0.42, 0.04, R(0, 0.68, -0.2), { bande: true, couleur: O.p('#3f6b4a') });
      for (const [sx, sz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) lot.barre(R.pt(sx, 0, sz), R.pt(sx, 0.44, sz), 0.02, 0.02, { couleur: metal });
    }
    if (i % 2 === 0) {
      // un parasol blanc replié : son mât et sa toile roulée
      lot.tour('peinture', [[0.022, 0.74], [0.022, 2.5]], 8, O.T(x, y, z), { bande: true, couleur: O.p('#d8d6ce') });
      lot.tour('peinture', [[0.02, 1.25], [0.13, 1.75], [0.11, 2.3], [0.03, 2.5]], 10, O.T(x, y, z), { bande: true, couleur: O.p('#eeece6') });
    }
  });
}

// ============================================================================================ 7. PETITS ÉDIFICES ET MOBILIER
// L'ÉDICULE WC (SYNTHESE.md, satellite : petit volume rond et clair de 3 à 4 m, dans l'îlot boisé) : murs de béton
// clair, soubassement plus sombre, deux portes, toit rond de zinc débordant.
function edicule(kit, O, lot) {
  const { x, z, r } = WC, y0 = kit.sol(x, z) - 0.05;
  lot.tour('beton', [[r + 0.03, -0.2], [r + 0.03, 0.35], [r, 0.38]], 24, O.T(x, y0, z), { couleur: O.c('beton', '#a8a399') });
  lot.tour('beton', [[r, 0.38], [r, 2.45]], 24, O.T(x, y0, z), { couleur: O.c('beton', '#e6e0d2') });
  lot.tour('peinture', [[r + 0.28, 2.42], [r + 0.28, 2.56], [0.3, 2.86], [0.001, 2.9]], 24, O.T(x, y0, z), { bande: true, couleur: O.p('#7d8386'), fond: true });
  // (les portes regardent la grande allée des parterres, au sud : z+)
  const R = O.repere(x, y0, z, 10);
  for (const s of [-0.62, 0.62]) {
    lot.boite('peinture', 0.8, 2.0, 0.08, R(s, 1.05, r - 0.02), { bande: true, couleur: O.p('#4a4f55') });
    lot.boite('peinture', 0.22, 0.22, 0.02, R(s, 2.2, r + 0.03), { bande: true, couleur: O.p('#e9e7e0') });
  }
}
// LA TABLE DE PING-PONG (-107,6 ; 8,8) : béton, plateau vert-gris à lignes blanches, filet de tôle.
function pingpong(kit, O, lot) {
  const { x, z } = PINGPONG, y0 = kit.sol(x, z), R = O.repere(x, y0, z, 0), beton = O.c('beton', '#9d9a92');
  for (const s of [-0.85, 0.85]) lot.boite('beton', 0.16, 0.7, 1.1, R(s, 0.33, 0), { chanfrein: 0.02, couleur: beton });
  lot.boite('beton', 2.74, 0.08, 1.525, R(0, 0.72, 0), { chanfrein: 0.012, couleur: O.c('beton', '#566a5c') });
  const blanc = O.p('#efefea');
  for (const [w, d, px, pz] of [[2.74, 0.02, 0, 0.752], [2.74, 0.02, 0, -0.752], [0.02, 1.525, 1.36, 0], [0.02, 1.525, -1.36, 0], [2.74, 0.006, 0, 0]]) lot.boite('peinture', w, 0.004, d, R(px, 0.762, pz), { bande: true, couleur: blanc });
  lot.boite('peinture', 0.02, 0.16, 1.62, R(0, 0.84, 0), { bande: true, couleur: O.p('#3a3d3f') });
}
// LE POINT D'EAU (-94,5 ; 16,3) : une borne-fontaine de fonte vert sombre, sa vasque et son bouton.
function pointEau(kit, O, lot) {
  const { x, z } = POINT_EAU, y0 = kit.sol(x, z), vert = O.p('#2f4a3a');
  lot.tour('beton', [[0.5, -0.1], [0.5, 0.04], [0.001, 0.05]], 16, O.T(x, y0, z), { couleur: O.c('beton', '#9f9b93') });
  lot.tour('peinture', [[0.16, 0.05], [0.16, 0.14], [0.11, 0.2], [0.09, 0.85], [0.12, 0.92], [0.08, 1.0], [0.1, 1.05], [0.001, 1.12]], 12, O.T(x, y0, z), { bande: true, couleur: vert });
  lot.tour('peinture', [[0.08, 0], [0.22, 0.06], [0.24, 0.1], [0.2, 0.1], [0.001, 0.06]], 14, O.T(x + 0.18, y0 + 0.62, z), { bande: true, couleur: vert });
  lot.boite('peinture', 0.1, 0.05, 0.05, O.T(x + 0.1, y0 + 0.95, z), { bande: true, couleur: O.p('#b8a25a') });
}
// LA TABLE DE PIQUE-NIQUE (-92,9 ; -34,2) : bois, bancs attenants.
function piqueNique(kit, O, lot) {
  const { x, z } = PIQUE_NIQUE, y0 = kit.sol(x, z), R = O.repere(x, y0, z, 30), bois = O.c('bois', '#7a5a3e');
  lot.boite('bois', 1.9, 0.06, 0.78, R(0, 0.75, 0), { chanfrein: 0.01, couleur: bois });
  for (const s of [-1, 1]) {
    lot.boite('bois', 1.9, 0.05, 0.28, R(0, 0.45, s * 0.66), { chanfrein: 0.01, couleur: bois });
    for (const px of [-0.7, 0.7]) lot.barre(R.pt(px, 0, s * 0.72), R.pt(px, 0.74, -s * 0.2), 0.08, 0.05, { couleur: O.p('#5e4631') });
  }
}
// LES LAMPADAIRES de chaque morceau (style, x, z : voir O.lampe ; SYNTHESE.md § C, Z14).
const LAMPES = {
  Z14a: [['mat', -99.8, -11.0], ['mat', -116.5, -8.0], ['globe', -124.6, -31.8]],
  Z14b: [['mat', -103.5, -41.5], ['globe', -121.0, -58.5], ['globe', -99.5, -55.5]],
  Z14c: [['mat', -99.0, -3.5], ['mat', -73.0, -3.0], ['globe', -89.0, 18.0], ['globe', -67.0, 6.2]],
  Z14d: [['mat', -65.3, -8.0], ['globe', -81.0, -24.5]],
  Z14e: [['rouille', -86.8, -50.0], ['rouille', -76.0, -67.2], ['rouille', -68.8, -48.0], ['globe', -91.8, -40.5]],
  Z14f: [['globe', -117.8, 5.0], ['globe', -117.8, 21.0]],
  Z14g: [['globe', -121.5, -87.5], ['globe', -106.0, -86.0], ['globe', -118.0, -101.8]],
  Z14h: [['globe', -91.0, -85.5], ['globe', -75.0, -86.2], ['globe', -95.0, -102.4], ['globe', -62.0, -79.8]],
};
// LES CORBEILLES (kit), une par morceau habité.
const CORBEILLES = { Z14a: [-103.3, -17.8], Z14b: [-104.6, -35.8], Z14d: [-77.8, -15.9] };
// LES BANCS VERTS de square (kit : lattes vertes sur fonte ; photo P1 de 2018), et leurs places assises.
function bancs(kit, groupe, liste) { for (const b of liste) groupe.add(kit.banc({ x: b.x, z: b.z, cap: b.cap, style: b.style || 'lattes_vertes' })); }
const BANCS = {
  Z14a: [{ x: -104.0, z: -13.8, cap: 245 }, { x: -103.6, z: -21.9, cap: 290 }, { x: -109.6, z: -30.9, cap: 0 }],
  Z14b: [{ x: -104.8, z: -38.0, cap: 270 }, { x: -106.0, z: -45.2, cap: 300 }, { x: -118.6, z: -45.0, cap: 45 }],
  Z14c: [{ x: -99.8, z: 0.8, cap: 120 }, { x: -72.4, z: -0.3, cap: 251 }, { x: -93.0, z: 10.0, cap: 150 }],
  Z14d: [{ x: -96.0, z: -18.5, cap: 60 }, { x: -79.0, z: -22.8, cap: 0 }],
  Z14e: [{ x: -84.6, z: -30.6, cap: 150 }, { x: -71.0, z: -36.0, cap: 270 }, { x: -89.0, z: -62.5, cap: 60 }, { x: -73.5, z: -66.2, cap: 330 }],
  Z14g: [{ x: -110.0, z: -86.6, cap: 0 }],
  // (relecture : le troisième, en (-48,4 ; -80), tombait DANS le bac à sable de l'aire au bateau ; il est au bord, face au bateau)
  Z14h: [{ x: -90.0, z: -86.0, cap: 0 }, { x: -70.0, z: -85.2, cap: 20 }, { x: -52.5, z: -75.0, cap: 180 }],
};

// ============================================================================================ 8. LES JEUX DE 2024
// Non vus terminés (R3.md Z14-17, Z14-21, Z14-22) : on s'en tient à la conception — tour à toboggan, trampolines,
// tourniquet, portique de balançoires — en boîtes simples mais propres, sur des sols souples verts ou brun-rouge ;
// massifs de graminées rousses bordés d'arceaux noirs bas, mâts brun-rouille de 6 m.
function* jeux2024(kit, O, lot, groupe, b) {
  const sombre = O.p('#1c1c1c');
  // ---- l'aire de la tour : sol souple vert, tour de bois à toit à deux pans (panneaux jaunes), toboggan vert, échelle
  {
    const A = AIRE_TOUR;
    O.disque(lot, 'beton#sol', A.x, A.z, A.r, 0, { dy: 0.04, couleur: O.taches(O.c('beton', '#3f6b4a'), 261, 0.08) });
    const y0 = kit.sol(A.x, A.z), R = O.repere(A.x - 0.6, y0, A.z + 0.4, 20), bois = O.c('bois', '#7a5a3e');
    for (const [sx, sz] of [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]]) lot.boite('bois', 0.12, 3.4, 0.12, R(sx, 1.65, sz), { couleur: bois });
    lot.boite('bois', 1.75, 0.08, 1.75, R(0, 1.45, 0), { couleur: O.c('bois', '#8a6a4a') });
    for (const s of [-1, 1]) {
      lot.boite('bois', 1.6, 0.55, 0.04, R(0, 1.8, s * 0.82), { couleur: O.c('bois', '#e2b640') });
      lot.prisme('bois', [[-0.05, 0], [0.05, 0], [0.05, 0.03], [-0.05, 0.03]], [R.pt(s * 0.95, 3.0, -1.0), R.pt(0, 3.75, -1.0)].map((q) => q), { couleur: O.c('bois', '#c7362f') });
    }
    // le toit à deux pans (panneaux rouges)
    for (const s of [-1, 1]) {
      const a = R.pt(s * 1.05, 3.05, -1.05), b = R.pt(0, 3.8, -1.05), c = R.pt(0, 3.8, 1.05), d = R.pt(s * 1.05, 3.05, 1.05);
      const n = new THREE.Vector3(s * 0.58, 0.82, 0).transformDirection(R.B).toArray();
      lot.polygone('bois', [a, b, c, d], n, { couleur: O.c('bois', '#c7362f') });
    }
    // le toboggan : une glissière verte en U qui descend vers l'avant (+z local), et ses rebords
    const pts = [];
    for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(R.pt(0, 1.45 - 1.25 * t + 0.25 * t * t * (1 - t), 0.9 + 2.6 * t)); }
    lot.prisme('peinture', [[-0.32, 0.25], [-0.3, 0.02], [-0.22, 0], [0.22, 0], [0.3, 0.02], [0.32, 0.25], [0.28, 0.25], [0.26, 0.05], [-0.26, 0.05], [-0.28, 0.25]], pts, { bande: true, couleur: O.p('#3e9a4e') });
    // l'échelle (arrière) et le filet d'escalade (côté)
    for (const s of [-0.3, 0.3]) lot.barre(R.pt(s, 0, -1.6), R.pt(s, 1.45, -0.85), 0.05, 0.05, { couleur: sombre });
    for (let k = 1; k < 6; k++) { const t = k / 6; lot.barre(R.pt(-0.3, 1.45 * t, -1.6 + 0.75 * t), R.pt(0.3, 1.45 * t, -1.6 + 0.75 * t), 0.03, 0.03, { couleur: O.p('#e2b640') }); }
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      lot.barre(R.pt(-0.85, 1.45 - 1.45 * t, -0.8 + 0.1 * t), R.pt(-1.6, 0.05, -0.8 + 1.6 * t), 0.015, 0.015, { couleur: O.p('#2a2a2a') });
    }
  }
  if (b()) yield;
  // ---- l'aire des trampolines : sol souple brun-rouge, trois trampolines au ras du sol (toiles noires, liseré de couleur),
  // le tourniquet
  {
    const A = AIRE_TRAMPO;
    O.disque(lot, 'beton#sol', A.x, A.z, A.r, 0, { dy: 0.04, couleur: O.taches(O.c('beton', '#8a4a3a'), 263, 0.08) });
    const tons = ['#e2b640', '#3e8ac0', '#c7362f'];
    [[-1.8, -1.1], [0.4, -2.0], [1.6, 0.4]].forEach(([dx, dz], i) => {
      const x = A.x + dx, z = A.z + dz;
      O.disque(lot, 'beton#sol', x, z, 0.95, 0.8, { dy: 0.055, couleur: () => O.c('beton', tons[i]), segments: 24 });
      O.disque(lot, 'beton#sol', x, z, 0.8, 0, { dy: 0.05, couleur: () => O.c('beton', '#232426'), segments: 24 });
    });
    // le tourniquet : un disque de tôle et ses poignées
    const x = A.x - 1.0, z = A.z + 2.0, y = kit.sol(x, z);
    lot.tour('peinture', [[1.0, 0.12], [1.0, 0.2], [0.001, 0.21]], 24, O.T(x, y, z), { bande: true, couleur: O.p('#3e8ac0') });
    lot.tour('peinture', [[0.08, 0], [0.08, 0.95], [0.001, 1.0]], 10, O.T(x, y, z), { bande: true, couleur: O.p('#c7362f') });
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; lot.barre([x, y + 0.9, z], [x + Math.cos(a) * 0.85, y + 0.55, z + Math.sin(a) * 0.85], 0.035, 0.035, { couleur: O.p('#e2b640') }); lot.barre([x + Math.cos(a) * 0.85, y + 0.2, z + Math.sin(a) * 0.85], [x + Math.cos(a) * 0.85, y + 0.58, z + Math.sin(a) * 0.85], 0.035, 0.035, { couleur: O.p('#e2b640') }); }
  }
  if (b()) yield;
  // ---- le portique de balançoires : poutre de bois sur deux A, deux sièges, sol de copeaux
  {
    const A = AIRE_PORTIQUE, y0 = kit.sol(A.x, A.z), R = O.repere(A.x, y0, A.z, 0), bois = O.c('bois', '#8a6a4a');
    O.drape(lot, 'terre#sol', [[A.x - A.lx / 2, A.z - A.lz / 2], [A.x + A.lx / 2, A.z - A.lz / 2], [A.x + A.lx / 2, A.z + A.lz / 2], [A.x - A.lx / 2, A.z + A.lz / 2]], { pas: 0.6, dy: 0.04, couleur: () => [1.9, 1.35, 0.95] });
    for (const sx of [-1.8, 1.8]) for (const s of [-1, 1]) lot.barre(R.pt(sx, -0.1, s * 1.0), R.pt(sx, 2.45, 0), 0.12, 0.12, { couleur: bois });
    lot.barre(R.pt(-2.0, 2.45, 0), R.pt(2.0, 2.45, 0), 0.14, 0.14, { couleur: bois });
    for (const sx of [-0.7, 0.7]) {
      for (const s of [-0.22, 0.22]) lot.barre(R.pt(sx + s, 2.4, 0), R.pt(sx + s, 0.5, 0), 0.012, 0.012, { couleur: O.p('#9a9a96') });
      lot.boite('peinture', 0.5, 0.04, 0.2, R(sx, 0.48, 0), { bande: true, couleur: sombre });
    }
  }
  if (b()) yield;
  // ---- les massifs de graminées rousses bordés d'arceaux noirs bas (R3.md Z14-17, Z14-22), le long de la boucle
  const massifs = [[-86.2, -46.0, 2.2, 1.2], [-72.0, -56.5, 1.8, 1.3], [-84.5, -66.0, 1.6, 1.1]];
  for (const [cx, cz, rx, rz] of massifs) {
    if (b()) yield;
    const poly = [];
    for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; poly.push([cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]); }
    groupe.add(kit.massifFleurs({ poly, palette: 'vivaces', densite: 0.9, bombe: 0.08 }));
    // les arceaux : demi-cercles de fer noir de 0,4 m, jointifs
    for (let k = 0; k < 20; k++) {
      const a0 = (k / 20) * Math.PI * 2, a1 = ((k + 1) / 20) * Math.PI * 2;
      const A = [cx + Math.cos(a0) * (rx + 0.1), cz + Math.sin(a0) * (rz + 0.1)], B = [cx + Math.cos(a1) * (rx + 0.1), cz + Math.sin(a1) * (rz + 0.1)];
      const ya = kit.sol(A[0], A[1]), pts = [];
      for (let j = 0; j <= 6; j++) { const t = j / 6; pts.push([A[0] + (B[0] - A[0]) * t, ya - 0.05 + 0.42 * Math.sin(Math.PI * t), A[1] + (B[1] - A[1]) * t]); }
      lot.prisme('peinture', [[-0.006, -0.006], [0.006, -0.006], [0.006, 0.006], [-0.006, 0.006]], pts, { bande: true, couleur: sombre });
    }
  }
}

// ============================================================================================ 9. L'AIRE AU BATEAU
// R3.md Z14-20 (satellite) : un disque de sable de 12 à 13 m au bord du coteau, un bateau de bois (coque de 6 à 7 m,
// mât), une bordure basse. L'emprise est à Z10 (x > -57) ; la conception la range dans Z14, avec les jeux.
function aireBateau(kit, O, lot) {
  const A = AIRE_BATEAU;
  // (le sable remplit un bac bordé de rondins, au ras du sol. Relecture : 22 cm au-dessus du sol, il enterrait les
  // pieds du joueur, qui marche sur le sol du monde ; le couvre-sol de Z10 n'y pousse pas — la surface des données y
  // est « copeaux », qu'il saute — et les quelques feuilles tombées du bord du coteau qui dépassent sont à leur place)
  O.disque(lot, 'gravier#sol', A.x, A.z, A.r, 0, { dy: 0.04, couleur: O.taches(O.c('gravier', '#a08c62'), 271, 0.12), segments: 40 });
  // la bordure de rondins
  const pts = [];
  for (let k = 0; k <= 48; k++) { const a = (k / 48) * Math.PI * 2; pts.push([A.x + Math.cos(a) * (A.r + 0.1), 0, A.z + Math.sin(a) * (A.r + 0.1)]); }
  for (const q of pts) q[1] = kit.sol(q[0], q[2]) + 0.26;
  lot.prisme('bois', [[-0.11, -0.45], [0.11, -0.45], [0.11, 0.02], [0.06, 0.08], [-0.06, 0.08], [-0.11, 0.02]], pts, { couleur: O.c('bois', '#6b5238') });
  // le bateau : coque en U à bouts pincés le long de z, pont, cabine, mât et vergue, échelle
  const y0 = kit.sol(A.x, A.z) + 0.02, R = O.repere(A.x, y0, A.z, 25), bois = O.c('bois', '#8a6242');
  const chemin = [[-3.3, 1.35], [-2.8, 0.75], [-1.6, 0.35], [0, 0.25], [1.6, 0.35], [2.8, 0.75], [3.3, 1.35]].map(([u, y]) => R.pt(0, y, u));
  lot.prisme('bois', [[-1.1, 1.0], [-1.05, 0.35], [-0.7, 0], [0.7, 0], [1.05, 0.35], [1.1, 1.0], [1.0, 1.0], [0.95, 0.4], [0.62, 0.1], [-0.62, 0.1], [-0.95, 0.4], [-1.0, 1.0]], chemin,
    { couleur: bois, echelles: [0.2, 0.6, 0.92, 1, 0.92, 0.6, 0.2] });
  lot.boite('bois', 1.9, 0.08, 4.4, R(0, 0.95, 0), { couleur: O.c('bois', '#a07a52') });
  lot.boite('bois', 1.3, 1.1, 1.4, R(0, 1.55, -0.9), { couleur: O.c('bois', '#7a5536') });
  lot.boite('bois', 1.5, 0.08, 1.6, R(0, 2.14, -0.9), { couleur: O.c('bois', '#5e412c') });
  lot.tour('bois', [[0.08, 0.95], [0.07, 4.6], [0.04, 4.8]], 8, R(0, 0, 0.6), { couleur: O.c('bois', '#8a6242') });
  lot.barre(R.pt(-1.2, 3.6, 0.6), R.pt(1.2, 3.6, 0.6), 0.06, 0.06, { couleur: O.p('#6b4a32') });
  // l'échelle d'abordage, contre le flanc (relecture : ses barreaux flottaient seuls devant la proue, sans montants)
  for (const u of [0.55, 1.05]) lot.barre(R.pt(1.95, -0.05, u), R.pt(1.12, 1.12, u), 0.05, 0.05, { couleur: O.p('#6b4a32') });
  for (let k = 1; k < 5; k++) { const t = k / 5; lot.barre(R.pt(1.95 - 0.83 * t, -0.05 + 1.17 * t, 0.55), R.pt(1.95 - 0.83 * t, -0.05 + 1.17 * t, 1.05), 0.035, 0.035, { couleur: O.p('#6b4a32') }); }
}

// ============================================================================================ les morceaux
// La teinte de l'esplanade : stabilisé beige clair (#d2c4a6, R3.md), taches lentes et grain ; plus brun et plus sombre
// sous les arbres (terre et feuilles #a8906f), là où les arbres de arbres.bin ouvrent leur couronne.
// (un GÉNÉRATEUR : la grille des feuilles se calcule par paquets de rangées, la main rendue entre deux ; il rend la
// fonction de teinte)
function* teinteEsplanade(O, D, part, budget) {
  // (la teinte de la photo, #cdbf9f à #d6c7a8, rendue telle quelle sous la lumière du parc, sortait presque blanche : le
  // sol horizontal reçoit tout le ciel, environ 1,7 fois sa couleur ; mesuré à l'écran, un multiplicateur de 0,45
  // rend le beige de la sphère P1)
  const base = O.c('gravier', '#9c8866'), feuilles = O.c('gravier', '#5e4630'), tab = (D && D.tableArbres) || [], arbres = [];
  // (seulement les arbres qui touchent le rectangle du morceau)
  for (let i = 0; i + 5 < tab.length; i += 6) if (tab[i] > part[0] - 8 && tab[i] < part[2] + 8 && tab[i + 1] > part[1] - 8 && tab[i + 1] < part[3] + 8) arbres.push([tab[i], tab[i + 1], tab[i + 3]]);
  // la part de feuilles, sur une grille de 1 m du rectangle du morceau (calculée une fois : relue en bilinéaire à chaque
  // sommet, au lieu de parcourir tous les arbres pour chacun)
  const gx0 = part[0] - 2, gz0 = part[1] - 2, gnx = Math.ceil(part[2] - part[0]) + 5, gnz = Math.ceil(part[3] - part[1]) + 5;
  const W = new Float32Array(gnx * gnz);
  for (let k = 0; k < gnz; k++) for (let i = 0; i < gnx; i++) {
    if (i === 0 && k % 6 === 5 && budget()) yield;
    const x = gx0 + i, z = gz0 + k;
    let w = 0;
    for (const [ax, az, r] of arbres) { const d = Math.hypot(x - ax, z - az); if (d < r * 1.2) w = Math.max(w, 1 - lisse(r * 0.3, r * 1.2, d)); }
    // (et des traînées de feuilles tombées, par plaques)
    W[k * gnx + i] = Math.min(1, w + 1.0 * Math.max(0, O.bruit(x / 6, z / 6, 283) - 0.45));
  }
  const feuillesEn = (x, z) => {
    const fx = Math.min(gnx - 1.001, Math.max(0, x - gx0)), fz = Math.min(gnz - 1.001, Math.max(0, z - gz0)), i = Math.floor(fx), k = Math.floor(fz), u = fx - i, v = fz - k;
    const a = W[k * gnx + i], b = W[k * gnx + i + 1], c = W[(k + 1) * gnx + i], d = W[(k + 1) * gnx + i + 1];
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  };
  const tr = O.taches([1, 1, 1], 281, 0.3), out = [0, 0, 0];
  return (x, z) => {
    const w = feuillesEn(x, z), t = tr(x, z);
    for (let k = 0; k < 3; k++) out[k] = (base[k] * (1 - w) + feuilles[k] * w) * t[k];
    return out;
  };
}
// Ce qui couvre déjà le sol à la place de l'esplanade (les cases entièrement dessous sont sautées)
function sousAutreChose(x, z) {
  const F = FONTAINE, M = MANEGE, K = KIOSQUE, Bt = BATEAUX, Oc = OCTOGONE;
  if (Math.abs(x - F.x) < F.cote / 2 && Math.abs(z - F.z) < F.cote / 2) return true;
  if (Math.hypot(x - M.x, z - M.z) < M.anneau) return true;
  if (Math.hypot(x - Oc.x, z - Oc.z) < Oc.r) return true;
  if (Math.abs(x - K.x) < K.lx / 2 && Math.abs(z - K.z) < K.lz / 2) return true;
  if (Math.abs(x - Bt.x) < Bt.lx / 2 && Math.abs(z - Bt.z) < Bt.lz / 2) return true;
  return dansPlace(x, z);
}
// Les allées d'un morceau (la part de chacune qui tombe dans le rectangle du morceau), hors de l'esplanade là où elles
// la traversent (elles s'y confondent), hors de la place.
function* allees(kit, O, lot, part, budget) {
  for (const a of Object.values(ALLEES)) {
    if (budget()) yield;
    const coul = O.taches(O.c(a.mat, a.teinte), 291, 0.1), c3 = [0, 0, 0];
    const couleur = (x, z, e) => { const c = coul(x, z), f = 1 - 0.14 * lisse(0.75, 1, Math.abs(e)); c3[0] = c[0] * f; c3[1] = c[1] * f; c3[2] = c[2] * f; return c3; };
    const trace = a.ferme ? [...a.trace] : a.trace;
    const surEsplanade = a.mat === 'gravier';
    O.chemin(lot, a.mat + '#sol', trace, a.largeur, {
      boite: part, couleur, dy: a.mat === 'asphalte' ? 0.035 : 0.03,
      // (l'allée nord-est part du bord de l'allée haute, Z17 : x < -59,2)
      sauter: (x, z) => dansPlace(x, z) || (surEsplanade && kit.dansPolygone(x, z, ESPLANADE)) || (a === ALLEES.allee_ne && x > -59.2),
    });
  }
}
function* esplanade(O, lot, part, D, budget) {
  const couleur = yield* teinteEsplanade(O, D, part, budget);
  yield* O.drapeG(lot, 'gravier#sol', ESPLANADE, { boite: part, sauter: sousAutreChose, couleur, dy: 0.022, budget });
}
function donnees(ctx) { const s = ctx && ctx.scene && ctx.scene.userData && ctx.scene.userData.solParc; return (s && s.d) || null; }

function* morceau(ctx, id) {
  const { kit, groupe } = ctx, O = outilsB7(kit, ctx.Monde), part = MORCEAUX[id].part, D = donnees(ctx);
  const b = ctx.budget, sol = new kit.Lot(id + ' · sol');
  yield* esplanade(O, sol, part, D, b);
  yield* allees(kit, O, sol, part, b);
  if (b()) yield;
  // (le sol en maillages tout de suite : deux Lots, deux mises en maillage plus courtes)
  groupe.add(O.horsContact(sol.maillages('ZONE ' + id + ' · sol')));
  const lot = new kit.Lot(id);
  if (b()) yield;
  const posLampes = LAMPES[id] || [];
  for (const [style, x, z] of posLampes) O.lampe(lot, x, z, style, 90);
  bancs(kit, groupe, BANCS[id] || []);
  if (CORBEILLES[id]) groupe.add(kit.poubelle({ x: CORBEILLES[id][0], z: CORBEILLES[id][1] }));
  if (b()) yield;
  if (id === 'Z14a') {
    yield* fontaine(kit, O, lot, groupe, b); if (b()) yield;
    yield* abordsFontaine(kit, O, lot, groupe, b); if (b()) yield;
    colonne(kit, O, lot); if (b()) yield;
    yield* balancoires(kit, O, lot, groupe, b);
  } else if (id === 'Z14b') {
    yield* manege(kit, O, lot, ctx); if (b()) yield;
    octogone(kit, O, lot);
  } else if (id === 'Z14c') {
    yield* place(kit, O, lot, b); if (b()) yield;
    tente(kit, O, lot); if (b()) yield;
    edicule(kit, O, lot);
    pingpong(kit, O, lot);
    pointEau(kit, O, lot);
  } else if (id === 'Z14d') {
    yield* kiosque(kit, O, lot, groupe, b);
  } else if (id === 'Z14e') {
    yield* jeux2024(kit, O, lot, groupe, b); if (b()) yield;
    piqueNique(kit, O, lot);
  } else if (id === 'Z14g') {
    O.panneaux(lot, CLOTURE_NE[0]);
    O.panneaux(lot, [CLOTURE_NE[1][0], [-99.0, -115.9]]);
    groupe.add(kit.portail({ x: PORTILLON_MUSEE.x, z: PORTILLON_MUSEE.z, cap: 0, largeur: PORTILLON_MUSEE.largeur, type: 'simple' }));
  } else if (id === 'Z14h') {
    O.panneaux(lot, [[-99.0, -115.9], CLOTURE_NE[1][1]]);
    aireBateau(kit, O, lot);
  }
  if (ctx.budget()) yield;
  const g = lot.maillages('ZONE ' + id);
  for (const m of g.children) if (m.material && m.material.alphaTest > 0) { m.castShadow = false; m.userData.feuillage = true; }
  groupe.add(O.horsContact(g));
}

// ============================================================================================ silhouettes (loin)
// (conception, § 3.5 : au plus 2 000 triangles, 1 à 3 appels) : le manège (cône rayé en gros, tambour), la tente.
function* silhouetteManege(ctx) {
  const { kit } = ctx, O = outilsB7(kit, ctx.Monde), lot = new kit.Lot('silhouette du manège'), M = MANEGE, y0 = kit.sol(M.x, M.z);
  lot.tour('peinture', [[M.r, 0], [M.r, 2.7], [M.r + 0.06, 2.72], [M.r + 0.06, 3.6]], 12, O.T(M.x, y0, M.z), { bande: true, couleur: O.p('#b58f7a') });
  lot.tour('peinture', [[M.r + 0.05, 3.4], [3.0, 3.86], [0.001, 6.6]], 12, O.T(M.x, y0, M.z), { bande: true, couleur: O.p('#8a5a4c') });
  ctx.groupe.add(lot.maillages('silhouette du manège'));
}
function* silhouettePlace(ctx) {
  const { kit } = ctx, O = outilsB7(kit, ctx.Monde), lot = new kit.Lot('silhouette de la tente'), T = TENTE, y0 = kit.sol(T.x, T.z);
  lot.tour('peinture', [[T.r, 0], [T.r, 2.4], [0.001, 5.1]], 12, O.T(T.x, y0, T.z), { bande: true, couleur: O.p('#e9e7df') });
  ctx.groupe.add(lot.maillages('silhouette de la tente'));
}

// ============================================================================================ la zone
export default {
  id: 'Z14',
  nom: 'Parc haut nord-est',
  emprise: [[-141, -116], [-57, -116], [-57, 26], [-141, 26]],
  morceaux: Object.entries(MORCEAUX).map(([id, m]) => ({ id, nom: m.nom, boite: m.boite, construire: (ctx) => morceau(ctx, id),
    ...(id === 'Z14b' ? { silhouette: silhouetteManege } : id === 'Z14c' ? { silhouette: silhouettePlace } : {}) })),
  // PUR (sans three) : appelé à l'installation pour tous les joueurs. Le socle et le bassin de la fontaine sont dans les
  // données (plan à +11,40, eau) ; l'obstacle du kiosque (bâtiment) et celui du manège (OSM) aussi ; le reste ici.
  obstacles(o) {
    const dur = (h) => ({ h, type: 'dur' });
    const F = FONTAINE;
    // la fontaine : margelle du bassin (la balle y rebondit ; le pied s'arrête déjà à l'eau), piliers, stèle, bornes, bloc
    o.cercle(F.x + 0.5, F.z, 1.0, dur(0.55));
    for (const s of [-1, 1]) o.boite(F.x - 1.2, F.z - s * 1.75, 0.42, 0.42, 0, dur(4.0));
    o.boite(F.x - 1.02, F.z, 0.3, 0.5, 0, dur(3.1));
    for (const s of [-1, 1]) o.cercle(F.x + 2.1, F.z - s * 2.1, 0.23, dur(1.15));
    o.boite(F.x - 1.4, F.z - 3.0, 0.34, 0.39, 0, dur(1.0));
    // les abords : tonnelle (ses poteaux), grand bac, bacs, jardin clos
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) o.cercle(-115.2 + sx * 1.45, -21.6 + sz * 1.45, 0.08, dur(2.3));
    o.boite(-115.4, -14.4, 1.35, 0.7, 0, dur(0.75));
    o.boite(-105.8, -24.7, 0.28, 3.6, 0, dur(0.6));
    o.boite(-102.8, -27.2, 1.62, 2.22, 0, { h: 0.85, type: 'haie' });
    // la colonne
    o.boite(COLONNE.x, COLONNE.z, 0.5, 0.5, 0, dur(4.7));
    // les balançoires bateaux : la grille basse tout autour, sauf le passage
    const Bt = BATEAUX, bx0 = Bt.x - Bt.lx / 2 - 0.3, bx1 = Bt.x + Bt.lx / 2 + 0.3, bz0 = Bt.z - Bt.lz / 2 - 0.3, bz1 = Bt.z + Bt.lz / 2 + 0.3, g = { e: 0.06, h: 0.95, type: 'grille' };
    o.segment(bx1, bz0 + 1.4, bx1, bz0, g).segment(bx1, bz0, bx0, bz0, g).segment(bx0, bz0, bx0, bz1, g).segment(bx0, bz1, bx1, bz1, g).segment(bx1, bz1, bx1, bz1 - 1.4, g);
    // (dedans : les six nacelles et les pieds des sept portiques en A)
    const pasB = (Bt.lx - 0.8) / 6;
    for (let i = 0; i < 7; i++) {
      const x = Bt.x - Bt.lx / 2 + 0.4 + i * pasB;
      for (const s of [-1, 1]) o.cercle(x, Bt.z + s * 1.7, 0.06, dur(4.4));
      if (i < 6) o.boite(x + pasB / 2, Bt.z, 0.38, 1.1, 0, dur(1.5));
    }
    // le manège (en plus du cercle OSM des données, un peu décalé : le nôtre suit le dessin) et la guérite
    o.cercle(MANEGE.x, MANEGE.z, MANEGE.r + 0.35, dur(3.6));
    o.boite(GUERITE.x, GUERITE.z, 0.6, 0.7, 0, dur(2.1));
    // l'octogone : ses huit poteaux
    for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + (k / 8) * Math.PI * 2; o.cercle(OCTOGONE.x + Math.cos(a) * (OCTOGONE.r - 0.1), OCTOGONE.z + Math.sin(a) * (OCTOGONE.r - 0.1), 0.08, dur(2.4)); }
    // la tente, l'édicule, le ping-pong, le point d'eau, le pique-nique
    o.cercle(TENTE.x, TENTE.z, TENTE.r + 0.1, dur(2.4));
    o.cercle(WC.x, WC.z, WC.r + 0.05, dur(2.6));
    o.boite(PINGPONG.x, PINGPONG.z, 1.37, 0.76, 0, dur(0.8));
    o.cercle(POINT_EAU.x, POINT_EAU.z, 0.2, dur(1.1));
    o.boite(PIQUE_NIQUE.x, PIQUE_NIQUE.z, 0.95, 0.8, (30 * Math.PI) / 180, dur(0.8));
    // la terrasse du kiosque : sa haie (deux arcs), ses poteaux
    const T = TERRASSE;
    for (const [a0, a1] of [[0.62, 2.95], [3.33, 5.66]]) {
      for (let k = 0; k < 8; k++) {
        const u = a0 + ((a1 - a0) * k) / 8, v = a0 + ((a1 - a0) * (k + 1)) / 8;
        o.segment(T.x + Math.cos(u) * T.r, T.z + Math.sin(u) * T.r, T.x + Math.cos(v) * T.r, T.z + Math.sin(v) * T.r, { e: 0.6, h: 0.82, type: 'haie' });
      }
    }
    for (const a of [0.9, 2.2, 3.9, 5.3]) o.cercle(T.x + Math.cos(a) * (T.r - 0.6), T.z + Math.sin(a) * (T.r - 0.6), 0.1, dur(3.1));
    // les jeux de 2024 : la tour et son toboggan, le portique
    o.cercle(AIRE_TOUR.x - 0.6, AIRE_TOUR.z + 0.4, 1.2, dur(3.8));
    for (const sx of [-1.8, 1.8]) o.segment(AIRE_PORTIQUE.x + sx, AIRE_PORTIQUE.z - 1.0, AIRE_PORTIQUE.x + sx, AIRE_PORTIQUE.z + 1.0, { e: 0.14, h: 2.5, type: 'dur' });
    // le mobilier : fûts des lampadaires, bancs (1,9 m x 0,7 m, tournés selon leur cap), corbeilles
    for (const liste of Object.values(LAMPES)) for (const [, x, z] of liste) o.cercle(x, z, 0.12, dur(4.5));
    for (const liste of Object.values(BANCS)) for (const b of liste) o.boite(b.x, b.z, 0.98, 0.35, (-b.cap * Math.PI) / 180, { h: 0.9, type: 'dur' });
    for (const [x, z] of Object.values(CORBEILLES)) o.cercle(x, z, 0.28, dur(0.9));
    // le bateau de l'aire du coteau
    o.boite(AIRE_BATEAU.x, AIRE_BATEAU.z, 1.1, 3.1, -(25 * Math.PI) / 180, dur(1.4));
  },
  bancs(b) {
    for (const liste of Object.values(BANCS)) {
      for (const x of liste) {
        const a = (x.cap * Math.PI) / 180;
        b.push({ x: x.x + Math.sin(a) * 0.1, z: x.z + Math.cos(a) * 0.1, cap: x.cap, y: 0.45, source: 'Z14' });
      }
    }
  },
  lieux: [],
};
