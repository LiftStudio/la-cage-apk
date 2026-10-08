// =====================================================================
//  ZONE Z17 — L'ALLÉE HAUTE, SUR LA CRÊTE DU COTEAU (lot B8)
// =====================================================================
// L'allée qui longe le rebord de la terrasse haute (x ≈ -57, de z -71 à +145, y ≈ +10,5 ; conception § 1.3), entre le
// bosquet ouest (Z16) et le parc haut nord-est (Z14) du côté du boulevard, et le coteau boisé (Z10, Z11) du côté de la
// Seine. Elle traverse le belvédère (Z06) en son milieu et finit au-dessus du théâtre, là où partent la rampe ouest
// (Z11), l'allée sud (Z16) et l'accès à la placette (Z12).
//
// CE QUE LES PHOTOS MONTRENT (tools/parc/references_gmaps/SYNTHESE.md, fiche Z17, et R4.md § Z17 : la sphère D4 au
// départ sud, mai 2021 ; la sphère S4 au nord, sept. 2018 ; A7-2 vue du bosquet), et ce qu'on en fait :
//  - AU SUD du belvédère (z 51 à 145) : ASPHALTE GRIS (#8e8b87) de 3,5 m à bordures de béton, pente de moins de 1 %,
//    qui part SANS MARCHE du sable du belvédère. Côté boulevard, le MAIL DE TILLEULS (les arbres de arbres.bin, à x -59 :
//    aucun n'est planté ici, règle 4), et sous eux, tournés vers l'allée, des BANCS VERTS de square et des LAMPADAIRES
//    fins vert-noir à lanterne, tous les 18 à 20 m ; une corbeille au départ. Côté Seine, le MASSIF CONTINU d'arbustes
//    persistants (laurier, photinia aux pousses rouges, éléagnus, fusain) qui coiffe la crête et fait écran au-dessus du
//    coteau (D4 : « aucun garde-corps le long de l'allée, le massif fait écran »).
//  - Là où le massif s'interrompt au-dessus d'un front raide, un GARDE-CORPS de barreaux ronds noirs d'1,1 m, deux
//    lisses (main courante plate), poteaux tous les 2 m, sur une bordure de béton gris (S4, A7-2) : à la rupture 37
//    (z 60 à 70, gabarit garde_crete_37, derrière une bande de pelouse) et le long de l'esplanade nord (z -21 à +17,5).
//  - AU NORD du belvédère : l'ESPLANADE DE STABILISÉ beige clair qui prolonge le sable du belvédère jusqu'à z ≈ -3
//    (S4, vers z+), puis l'asphalte gris qui file vers z- entre la terrasse du kiosque de Z14 et la crête (S4, vers z-),
//    jusqu'à l'allée nord-est (Z14, en (-56,9 ; -70,9)).
//
// L'AXE. SYNTHESE met l'allée sur x ≈ -54,5 au sud (satellite Google, ± 2 m) ; on garde celui des données (OSM et
// gabarit allee_haute, x ≈ -57) : le MNT LiDAR n'est plat que de x -58,5 à -55 le long de toute l'allée, et la crête
// commence à tomber dès x -54 (chute de 1,5 m en 2 m). Une allée centrée sur -54,5 serait à moitié sur le coteau.
//
// LES VOISINES. Le sable du belvédère (z 20 à 51) est à Z06 : rien n'est posé ici entre ses deux bouts. La rampe est
// (Z10) arrive en (-57 ; -63) et s'arrête au bord de l'allée ; la rampe ouest (Z11) part du bout sud, coupée à x -54,6 :
// le coin entre les deux (le haut de la rampe, sous le bout de l'allée) est dessiné ici (CARREFOUR_SUD). L'allée sud
// (Z16) repart de ce bout vers le portail E2.
//
// CE MODULE PORTE AUSSI LES PIÈCES COMMUNES DU LOT B8 (exportées pour Z16 et Z12) : la nappe drapée sur le sol
// (`drape`), le garde-corps à barreaux (`gardeCorps`), le lampadaire fin à lanterne (`lanterneMat`), le banc de bois
// (`bancBois`), les arbustes à palette propre (`arbustePal`), le hasard de position et la lecture des données du monde.
//
// RÈGLES DE ZONE (conception § 3.3) : aucun Math.random (kit.alea ; les pièces de js/court_parc.js qui tirent au
// hasard sont appelées sous `avecHasard`, graine tirée de la position) ; toute hauteur par le sol du monde ; matériaux
// du kit (et le feuillage du coteau, partagé) ; aucun arbre planté ; tout dans le groupe du morceau.
import * as THREE from 'three';
import { Monde } from '../../monde.js';
import { paletteFond, arbusteFond, carteFond, teinteFond } from '../../court_parc.js';
import {
  avecHasard, graine, solVu, sections, projeter, surAllee, dansBoite, Nappe, allee, maillageSol, bordures, Touffes,
  maillageFeuillage, arbuste, teinte as teinteCoteau,
} from './coteau.js';

// ============================================================================================ pièces communes du lot B8
// Le hasard déterministe du parc (même formule que le kit et js/court_parc.js), pour les fonctions PURES (obstacles).
export function alea(x, z, k = 0) {
  const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
  return s - Math.floor(s);
}
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Les données du monde (monde.json) : l'ordonnanceur ne les passe pas dans ctx ; le sol du parc les garde.
export function donnees(ctx) {
  if (ctx && ctx.donnees) return ctx.donnees;
  const s = ctx && ctx.scene && ctx.scene.userData && ctx.scene.userData.solParc;
  return (s && s.d) || null;
}
export const parId = (liste, id) => (liste || []).find((e) => e && e.id === id) || null;
// Un point dans un polygone [[x, z], ...] (croisements), pur.
export function dansPoly(x, z, poly) {
  let d = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) d = !d;
  }
  return d;
}
// Une couleur sRGB en valeurs linéaires (couleurs de sommets), multipliée par `f`.
export function lin(hex, f = 1) { const c = new THREE.Color(hex); return [c.r * f, c.g * f, c.b * f]; }
// La teinte qu'il faut donner à un matériau du kit dont la couleur moyenne est `de` pour qu'il paraisse `vers` (sRGB) :
// le multiplicateur des couleurs de sommets.
export function versTeinte(de, vers) { const a = lin(de), b = lin(vers); return [b[0] / a[0], b[1] / a[1], b[2] / a[2]]; }

// LA NAPPE DRAPÉE : les cellules d'une trame de `pas` m, CALÉE SUR CELLE DU SOL (js/monde_sol.js : x -24,7 ; z -16), dans
// la boîte `b` = [x0, z0, x1, z1], dont le centre passe `garder(x, z)`, posées sur le sol vu (solVu : le plus haut de la
// lecture bilinéaire et des triangles du maillage, pour que le sol ne perce jamais) + `dy`. Une cellule dont les coins
// s'écartent de plus de `sautMax` m (un mur, une marche) n'est pas posée. Normales du sol, UV en mètres / tuile,
// couleur de sommet `teinte(x, z)` (un multiplicateur de la texture). Dans le Lot `lot`, sous la clé `cle`.
export function drape(kit, lot, cle, b, garder, o = {}) {
  const pas = o.pas ?? 1, dy = o.dy ?? 0.02, tu = o.tuile ?? kit.TUILES[cle.split('#')[0]] ?? 1, sautMax = o.sautMax ?? 0.6;
  const teinte = o.teinte || (() => [1, 1, 1]);
  const X0 = -24.7 + Math.floor((b[0] + 24.7) / pas) * pas, Z0 = -16 + Math.floor((b[1] + 16) / pas) * pas;
  const nx = Math.ceil((b[2] - X0) / pas), nz = Math.ceil((b[3] - Z0) / pas);
  const p = lot.part(cle), idx = new Int32Array((nx + 1) * (nz + 1)).fill(-1), N = { x: 0, y: 1, z: 0 };
  const ys = new Float32Array((nx + 1) * (nz + 1)).fill(NaN);
  const hauteur = (i, k) => { const j = k * (nx + 1) + i; if (Number.isNaN(ys[j])) ys[j] = solVu(X0 + i * pas, Z0 + k * pas); return ys[j]; };
  const sommet = (i, k) => {
    const j = k * (nx + 1) + i;
    if (idx[j] >= 0) return idx[j];
    const x = X0 + i * pas, z = Z0 + k * pas;
    Monde.normale(x + Monde.dx, z, N);
    const c = teinte(x, z);
    idx[j] = lot.s(p, x, hauteur(i, k) + dy, z, N.x, N.y, N.z, x / tu, z / tu, c);
    return idx[j];
  };
  let n = 0;
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    const cx = X0 + (i + 0.5) * pas, cz = Z0 + (k + 0.5) * pas;
    if (cx < b[0] || cx > b[2] || cz < b[1] || cz > b[3] || !garder(cx, cz)) continue;
    const h = [hauteur(i, k), hauteur(i + 1, k), hauteur(i + 1, k + 1), hauteur(i, k + 1)];
    if (Math.max(...h) - Math.min(...h) > sautMax) continue;
    const a = sommet(i, k), bb = sommet(i + 1, k), c = sommet(i + 1, k + 1), d = sommet(i, k + 1);
    // (la diagonale du maillage du sol : du coin x+ z- au coin x- z+)
    lot.tri(p, a, bb, d); lot.tri(p, bb, c, d);
    n++;
  }
  return n;
}

// LES REVÊTEMENTS À PLAT (allées, stabilisé, terre battue, pelouses, dalles : posés à 1 à 3 cm du sol) ne masquent
// rien : ils sont marqués `dynamique` et `nofuse`, comme les calques de js/debug_monde.js et les arbres, pour que ni
// l'ombre cuite au sol ni les OMBRES DE CONTACT ne les photographient. Sans cela, la carte fixe des ombres de contact
// (js/ombres_contact.js : une caméra posée au sol au centre de sa fenêtre, qui voit tout ce qui dépasse de 2 cm) les
// prenait pour des obstacles partout où le sol monte au-dessus du centre de la fenêtre, et tendait un voile noir de
// plusieurs mètres sur l'allée autour du joueur (relevé à l'écran sur la crête : un rectangle d'encre sur l'asphalte ;
// le drapé de la fenêtre sur le relief est prévu au lot A6). Ils ne sont pas fondus : chacun est déjà un seul maillage
// par morceau et par matière.
export function aPlat(o) {
  if (!o) return o;
  o.userData.nofuse = true;
  o.traverse((m) => { if (m.isMesh) { m.userData.dynamique = true; m.userData.nofuse = true; m.castShadow = false; } });
  return o;
}

// Les peintures du lot (sRGB), relevées sur les photos (R4.md, SYNTHESE § C)
export const COULEURS = {
  ferNoir: '#1c1c1c', vertNoir: '#1f2a24', acierSombre: '#2a2a2a', beton: '#9a9892',
};

// LE GARDE-CORPS À BARREAUX (crête : S4 et A7-2 ; placette du théâtre : T5) : une bordure de béton gris de `bordure` m
// (0 : aucune), des barreaux ronds verticaux tous les `pas` m, une lisse basse, une main courante plate de 50 x 10 mm,
// des poteaux carrés tous les `travee` m ; le tout suit le sol le long de `ligne` ([[x, z], ...]). `h` : hauteur de la
// main courante au-dessus de la bordure. Dans le Lot `lot` (peinture + béton).
export function gardeCorps(kit, lot, ligne, o = {}) {
  const h = o.h ?? 1.1, pas = o.pas ?? 0.115, travee = o.travee ?? 2.0, hb = o.bordure ?? 0.15;
  const coul = lin(o.couleur || COULEURS.ferNoir), rB = o.rayon ?? 0.009;
  if (hb > 0) kit.bordure({ ligne, largeur: 0.2, hauteur: hb, prof: 0.15, materiau: 'beton' }, lot);
  const pts = kit.reechantillonner(ligne, pas);
  const y0 = (x, z) => kit.sol(x, z) + hb;
  const rond = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; rond.push([Math.cos(a) * rB, Math.sin(a) * rB]); }
  // les barreaux (un tous les `pas` m, sans les bouts : les poteaux y sont)
  for (let i = 1; i < pts.length - 1; i++) {
    const q = pts[i], y = y0(q.x, q.z);
    lot.prisme('peinture', rond, [[q.x, y + 0.04, q.z], [q.x, y + h - 0.01, q.z]], { haut: [1, 0, 0], bande: true, couleur: coul, lisse: true });
  }
  // les lisses : la basse (tube de 20 mm) et la main courante plate, tronçon par tronçon (elles suivent la bordure)
  const pl = kit.reechantillonner(ligne, 1.0);
  const lisseBas = [], haut = [];
  for (const q of pl) { const y = y0(q.x, q.z); lisseBas.push([q.x, y + 0.1, q.z]); haut.push([q.x, y + h, q.z]); }
  lot.prisme('peinture', [[-0.01, -0.01], [0.01, -0.01], [0.01, 0.01], [-0.01, 0.01]], lisseBas, { vertical: true, bande: true, couleur: coul });
  lot.prisme('peinture', [[-0.025, -0.005], [0.025, -0.005], [0.025, 0.007], [-0.025, 0.007]], haut, { vertical: true, bande: true, couleur: coul });
  // les poteaux carrés de 40 mm, tous les `travee` m, et aux deux bouts
  const L = kit.longueur(ligne), nT = Math.max(1, Math.round(L / travee));
  const pp = kit.reechantillonner(ligne, L / nT);
  for (const q of pp) {
    const y = y0(q.x, q.z);
    lot.barre([q.x, y - 0.02, q.z], [q.x, y + h + 0.02, q.z], 0.04, 0.04, { couleur: coul, haut: [1, 0, 0] });
  }
}

// LE LAMPADAIRE FIN À LANTERNE (Z13, Z16, Z17 : SYNTHESE § C ; D4, A7-2) : un mât rond vert-noir de 3,7 m sur un
// petit socle, une lanterne vitrée à quatre pans sous un chapeau noir en pavillon. Le verre est celui du kit (il
// s'allume la nuit : kit.allumer). Dans le Lot `lot`, en (x, z) sur le sol. `o.couleur` : la peinture du mât.
export function lanterneMat(kit, lot, x, z, o = {}) {
  const y = kit.sol(x, z), H = o.h ?? 3.7, c = lin(o.couleur || COULEURS.vertNoir), F = { bande: true, couleur: c };
  const T = (dy) => new THREE.Matrix4().makeTranslation(x, y + dy, z);
  lot.tour('peinture', [[0.11, -0.05], [0.11, 0.18], [0.085, 0.24], [0.06, 0.3]], 8, T(0), { ...F, facettes: true, vif: true, dessus: true });
  lot.tour('peinture', [[0.055, 0.28], [0.042, H]], 8, T(0), F);
  lot.tour('peinture', [[0.05, 0], [0.07, 0.06], [0.08, 0.1]], 8, T(H), { ...F, dessus: true });
  // la lanterne : un tronc de pyramide de verre, ses quatre montants, le chapeau et sa pointe
  const r2 = Math.SQRT2, yL = H + 0.1;
  lot.tour('verre', [[0.1 * r2, 0], [0.16 * r2, 0.42]], 4, T(yL), { a0: Math.PI / 4, facettes: true, vif: true });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2, cx = Math.cos(a) * r2, sz = Math.sin(a) * r2;
    lot.barre([x + 0.102 * cx, y + yL, z + 0.102 * sz], [x + 0.162 * cx, y + yL + 0.42, z + 0.162 * sz], 0.014, 0.014, { couleur: c });
  }
  lot.tour('peinture', [[0.2 * r2, 0], [0.2 * r2, 0.03], [0.03, 0.2]], 4, T(yL + 0.42), { ...F, a0: Math.PI / 4, facettes: true, vif: true, fond: true });
  lot.tour('peinture', [[0.018, 0], [0.03, 0.05], [0.001, 0.12]], 6, T(yL + 0.61), F);
}

// UN BANC DE BOIS (devant l'orangerie, CH0 : lattes brun foncé #4a3a2e sur pieds noirs ; ou tout autre teinte) : cinq
// lattes d'assise, trois de dossier, deux flasques de fonte. `cap` : direction du regard de la personne assise (degrés,
// 0 = z+, 90 = x+). Dans le Lot `lot`.
export function bancBois(kit, lot, x, z, cap, o = {}) {
  const y = kit.sol(x, z), L = o.long ?? 1.8, bois = lin(o.lattes || '#4a3a2e', 2.2), fonte = lin(o.fonte || '#161718');
  const a = (cap * Math.PI) / 180, fx = Math.sin(a), fz = Math.cos(a), lx = fz, lz = -fx;   // avant (regard), long du banc
  const P = (u, v, h) => [x + lx * u + fx * v, y + h, z + lz * u + fz * v];
  const latte = (v, h, larg, ep, incl = 0) => {
    const A = P(-L / 2, v, h), B = P(L / 2, v, h), c = Math.cos(incl), s = Math.sin(incl);
    lot.prisme('bois', [[-larg / 2 * c + ep / 2 * s, -larg / 2 * s - ep / 2 * c], [larg / 2 * c + ep / 2 * s, larg / 2 * s - ep / 2 * c],
      [larg / 2 * c - ep / 2 * s, larg / 2 * s + ep / 2 * c], [-larg / 2 * c - ep / 2 * s, -larg / 2 * s + ep / 2 * c]], [A, B],
    { haut: [0, 1, 0], couleur: bois, uDecal: alea(x, z + v, 71), vDecal: alea(z, x + h, 72) });
  };
  for (let i = 0; i < 5; i++) latte(0.2 - i * 0.09, 0.45, 0.075, 0.03);
  for (let i = 0; i < 3; i++) latte(-0.3 - i * 0.02, 0.6 + i * 0.11, 0.09, 0.028, 1.35);
  for (const u of [-L / 2 + 0.22, L / 2 - 0.22]) {
    const pied = (pts) => { for (let i = 0; i + 1 < pts.length; i++) lot.barre(P(u, pts[i][0], pts[i][1]), P(u, pts[i + 1][0], pts[i + 1][1]), 0.035, 0.045, { couleur: fonte, haut: [lx, 0, lz] }); };
    pied([[0.22, 0], [0.18, 0.43]]); pied([[-0.2, 0], [-0.26, 0.43], [-0.34, 0.86]]); pied([[0.25, 0.425], [-0.27, 0.43]]);
  }
}

// LES ARBUSTES À PALETTE PROPRE : arbusteFond (js/court_parc.js, tel quel, dans l'accumulateur `acc` de coteau.js), sous
// un hasard à graine tirée de la position. `pal` : une palette [[couleur, poids], ...] (voir PALETTES_B8).
export const PALETTES_B8 = {
  photinia: [[0x33442a, 5], [0x3b4c2e, 4], [0x2a3a26, 3], [0x5e3326, 1], [0x6e3a28, 1]],
  // (panaché : un vert franc bordé de crème, K8 ; plus clair, sous le soleil rasant, il virait au givre)
  // (relecture : il y virait encore — des choux-fleurs blanc bleuté dans les jardinières du kiosque et le lit de la
  // placette. Le ciel du parc éclaire fort par-dessus, et la matière du feuillage du coteau désature et bleuit ; sur K8,
  // l'éléagnus panaché est un vert sauge, pas du givre : des verts plus sombres et plus jaunes, qui ressortent sauge,
  // et une touffe crème sur onze ; voir aussi le volume d'éclairage de petitArbuste)
  panache: [[0x3c5022, 3], [0x475c27, 3], [0x53672d, 2], [0x344620, 2], [0x6e6e40, 1]],
  rougeatre: [[0x5a2a24, 3], [0x6e3326, 2], [0x4a3a26, 2], [0x3e4a2c, 1]],
  laurierCerise: [[0x22361f, 3], [0x2a4125, 2], [0x1d2d1b, 2], [0x33492b, 1]],   // (la palette par défaut)
};
const _palettes = new Map();
export function arbustePal(acc, a) {
  let pal = _palettes.get(a.pal);
  if (!pal) { pal = paletteFond(PALETTES_B8[a.pal] || PALETTES_B8.laurierCerise); _palettes.set(a.pal, pal); }
  // (`a.y0` : un pied au-dessus du sol, pour un arbuste planté dans une jardinière)
  const y0 = a.y0 ?? solVu(a.x, a.z) - 0.08;
  avecHasard(graine('B8 ' + a.x.toFixed(2) + ' ' + a.z.toFixed(2)),
    () => arbusteFond(acc, a.x + Monde.dx, y0, a.z, a.h, a.R, pal, 1e9, -1e9, y0 + 0.03));
}
// Un arbuste, quelle que soit sa palette (celles du coteau : sombre, moyen, laurier, eleagnus... ; celles du lot : PALETTES_B8)
export function unArbuste(acc, a) { if (PALETTES_B8[a.pal]) arbustePal(acc, a); else arbuste(acc, a); }
// UN PETIT ARBUSTE (moins d'un mètre : les arbustes panachés des jardinières du kiosque, les massifs bas de l'aire de la
// photo 9, les touffes du lit de la placette). arbusteFond pose des cartes de 0,9 à 1,4 m : sur une touffe de 60 cm, elles
// en faisaient une boule pâle et floue. Ici, des cartes de 26 à 40 cm, serrées (une pour 3,5 dm³), deux par point (une presque couchée, une debout),
// semées dans l'ellipsoïde (x, z, h, R) et teintées par la palette (celles du lot, sinon celles du coteau), tirées par la
// position : même semis chez tous les joueurs. `a.y0` : le pied, s'il n'est pas le sol (une jardinière).
// (relecture : le centre du volume d'éclairage était à 40 % de la hauteur. La couture (Touffes, coteau.js) remonte les
// normales de 45 % du rayon : toutes regardaient alors le ciel, qui éclaire fort au parc, et la touffe sortait d'un
// blanc uni, sans dessous. À 62 %, le bas de la touffe regarde le sol et s'assombrit : elle a un volume.)
export function petitArbuste(acc, a) {
  const y0 = a.y0 ?? solVu(a.x, a.z) - 0.04, R = a.R, h = a.h, dx = Monde.dx;
  const vol = [a.x + dx, y0 + h * 0.62, a.z], rv = Math.max(R, h * 0.5), n = Math.max(10, Math.round((R * R * h) / 0.0035));
  const P = PALETTES_B8[a.pal], total = P ? P.reduce((t, [, w]) => t + w, 0) : 0;
  const couleur = (u) => {
    if (!P) return teinteCoteau(a.pal, u);
    let c = u * total;
    for (const [hex, w] of P) { if ((c -= w) < 0) return teinteFond(hex); }
    return teinteFond(P[P.length - 1][0]);
  };
  for (let i = 0; i < n; i++) {
    const u = alea(a.x + i, a.z, 841) * 6.283, v = Math.acos(2 * alea(a.z, a.x + i, 842) - 1), rr = Math.pow(alea(i, a.x + a.z, 843), 0.45);
    const x = a.x + Math.cos(u) * Math.sin(v) * R * rr, z = a.z + Math.sin(u) * Math.sin(v) * R * rr;
    const y = Math.max(y0 + 0.06, y0 + h * 0.5 + Math.cos(v) * h * 0.5 * rr), s = 0.26 + 0.14 * alea(x, z, 844), ry = alea(z, x, 845) * Math.PI;
    const info = { c: vol, r: rv, t: 0.88 + 0.24 * alea(x, y, 846) }, t = couleur(alea(x + y, z, 847));
    carteFond(acc, x + dx, y, z, -Math.PI / 2 + 0.7 * (alea(y, x, 848) - 0.5), ry, 0, s, s, info, t);
    carteFond(acc, x + dx, y, z, 0.3 * (alea(x, z + y, 849) - 0.5), ry + Math.PI / 2, 0, s, s * 0.8, info, t);
  }
}

// ============================================================================================ les données de l'allée
// Le tracé (gabarit allee_haute, OSM 45748361 + 121309579 + début de 121309572), du sud vers le nord ; 3,5 m.
export const ALLEE_HAUTE = [[-56.4, 144.9], [-57.1, 50.9], [-57.4, 42.6], [-57.6, 30.7], [-57.7, 19.9], [-57.7, 12.5], [-57.3, -5.2],
  [-56.6, -63.1], [-56.9, -70.9]];
export const LARG = 3.5;
// Les bouts du sable du belvédère (Z06 : z 20 à 51), de l'esplanade de stabilisé (z -3 à 20), et de l'allée entière
const Z_BELV = [20.0, 51.0], Z_STAB = [-3.0, 20.0], Z_FIN = [-70.9, 144.9];
// Les garde-corps de crête : l'esplanade nord (au bord du plat, qui finit à x -54 : MNT) et la rupture 37 (gabarit
// garde_crete_37, que monde.json déclare déjà en obstacle)
// (il va jusqu'au limon de la volée de 31 nord de Z06, z 19,1 : arrêté à 17,5, il laissait un passage vers le coteau)
const GC_NORD = [[-54.7, -21.0], [-54.7, -8.0], [-54.65, 5.0], [-54.6, 17.5], [-54.6, 18.9]];
const GC_37 = [[-53.1, 60.0], [-53.1, 63.6], [-53.2, 65.3], [-53.1, 66.9], [-53.2, 70.0]];
// La bande de pelouse entre l'allée et le garde-corps de la rupture 37 (ortho : « bande de pelouse côté x+ vers
// (-52 ; 70) »)
const PELOUSE_37 = [59.0, 70.8];
// Le mail (arbres de arbres.bin, relevés pour tenir bancs et lampadaires entre les troncs : x -58,5 à -59)
const MAIL = [-65.5, -51.5, -45.5, -40, -33.5, -28, -22, -16.5, -9.5, 58, 72, 78.5, 85.5, 92, 105, 113.5, 119.5, 132.5];
// Les lampadaires (côté boulevard, 1,55 m du bord, entre deux tilleuls) et les bancs (idem, tournés vers l'allée)
const LAMPES = [-68.0, -48.5, -30.8, -12.5, 6.5, 55.0, 75.5, 96.0, 116.5, 135.5].map((z) => ({ z }));
const BANCS = [-37.0, -19.0, 64.5, 88.8, 101.0, 126.0].map((z) => ({ z }));
// Le coin entre le bout de l'allée et le départ de la rampe ouest (Z11 la dessine à partir de x -54,6)
const RAMPE_OUEST_DEBUT = [[-56.35, 144.9], [-49.41, 131.73]];

// Le x de l'axe à la hauteur z (le tracé avance selon z, d'un seul tenant).
export function xAxe(z) {
  const T = ALLEE_HAUTE;
  for (let i = 1; i < T.length; i++) {
    const [ax, az] = T[i - 1], [bx, bz] = T[i];
    if ((z - az) * (z - bz) <= 0 && az !== bz) return ax + ((bx - ax) * (z - az)) / (bz - az);
  }
  return z > T[0][1] ? T[0][0] : T[T.length - 1][0];
}
// Le côté boulevard (x-) : bancs et lampadaires à 1,55 m du bord ; le banc, lui, s'écarte d'un tronc trop proche.
const xLampe = (z) => xAxe(z) - LARG / 2 - 1.55;
const xBanc = (z) => xAxe(z) - LARG / 2 - 1.7;
const capBanc = 90;

// LE MASSIF DE LA CRÊTE (pur) : un arbuste tous les 1,6 à 2,3 m, au bord du plat (x -54 à -53,3 selon l'endroit), là
// où il n'y a ni garde-corps ni pelouse, ni départ de rampe ou d'escalier. Palettes : laurier, photinia (pousses
// rouges), éléagnus (gris-vert), fusain (vert moyen). `x` suit la crête relevée dans le MNT.
function xCrete(z) { return z < 25 ? -54.1 : z < 112 ? -53.5 : z < 131 ? -53.0 : -54.0; }
function massif() {
  const L = [];
  // (au nord de la pelouse de la rupture 37, le massif va jusqu'au premier poteau du garde-corps : un trou de 2 m
  // laissait descendre dans le coteau entre les deux)
  const trous = [[-66, -58], [-23, 19.5], [Z_BELV[0] - 1, Z_BELV[1] + 0.5], [PELOUSE_37[0] + 0.6, PELOUSE_37[1] + 0.5], [131, 146]];
  for (let z = -56, k = 0; z < 131; k++) {
    z += 1.6 + 0.7 * alea(z, k, 801);
    if (trous.some(([a, b]) => z > a && z < b)) continue;
    const pal = ['laurier', 'photinia', 'eleagnus', 'moyen', 'laurier', 'photinia'][Math.floor(alea(k, z, 802) * 6)];
    L.push({ x: xCrete(z) + 0.5 * (alea(z, k, 803) - 0.5), z, h: 1.5 + 0.9 * alea(k, z, 804), R: 0.85 + 0.35 * alea(z, k, 805), pal });
  }
  // (relecture : un laurier au bout sud de la pelouse de la rupture 37, contre le dernier poteau du garde-corps : le
  // massif ne reprenait qu'à z 72,5 et laissait voir — et franchir — une brèche vers le coteau)
  L.push({ x: -53.45, z: PELOUSE_37[1] + 0.35, h: 1.7, R: 0.95, pal: 'laurier' });
  L.sort((a, b) => a.z - b.z);
  return L;
}
let MASSIF = null;
const preparer = () => { if (!MASSIF) MASSIF = massif(); };

// ============================================================================================ le dessin
// Les boîtes des morceaux (plus larges que celles de monde.json, qui ne couvrent que l'asphalte : bancs, lampadaires,
// massif et garde-corps débordent de 3 à 4 m de part et d'autre)
const BOITES = {
  Z17a: [-62.5, -71.0, -51.0, -27.8], Z17b: [-62.5, -27.8, -51.0, 15.4], Z17c: [-62.5, 15.4, -51.0, 58.6],
  Z17d: [-62.5, 58.6, -51.0, 101.8], Z17e: [-62.5, 101.8, -51.0, 146.5],
};

// La teinte de l'asphalte gris des photos (#8e8b87, un peu rosé au soleil) : celle de coteau.js (bords sombres, milieu
// usé, taches lentes), et une ombre de feuilles tombées sous le mail, côté x-.
// (0,88 : sous le mail, l'asphalte des photos D4 et S4 est d'un gris moyen ; la matière du kit, calée sur l'enrobé au
// soleil, paraissait blanchâtre sous le soleil rasant)
export function teinteAsphalte(x, z, e) {
  const b = 0.5 + 0.5 * Math.sin(x * 0.7 + z * 0.23) * Math.sin(z * 0.41 - x * 0.3);
  const f = 0.88 * (1 - 0.14 * lisse(0.7, 1, Math.abs(e))) * (1 + 0.08 * (b - 0.5)) * (1 + 0.03 * (1 - e * e)) * (e < -0.6 ? 0.95 : 1);
  return [f * 1.01, f, f * 0.98];
}
// Le stabilisé beige clair de l'esplanade nord (#d6c7a8 : un peu plus chaud que le sable du belvédère, #cfc6b8)
// (relecture : visé tel quel, il sortait presque blanc, une dalle de béton neuf sous le ciel du parc — un sol à plat en
// reçoit tout l'éclairage. Même calage que l'esplanade de stabilisé de Z14 (lot B7), dont elle est la suite sur S4 : la
// couleur de la photo multipliée par environ 0,5)
const T_STAB = versTeinte('#cbc2af', '#a2957c');
function teinteStab(x, z, e) {
  const f = (0.95 + 0.1 * alea(Math.floor(x * 1.3), Math.floor(z * 1.3), 811)) * (1 - 0.08 * lisse(0.75, 1, Math.abs(e)));
  return [T_STAB[0] * f, T_STAB[1] * f, T_STAB[2] * f];
}

function* allees(ctx, B) {
  const { kit, groupe } = ctx;
  // l'asphalte : au nord, de l'allée nord-est à l'esplanade ; au sud, du belvédère au bout
  const gris = new Nappe();
  const nord = [Math.max(B[0], -62), Math.max(B[1], Z_FIN[0]), B[2], Math.min(B[3], Z_STAB[0])];
  const sud = [B[0], Math.max(B[1], Z_BELV[1]), B[2], Math.min(B[3], Z_FIN[1])];
  if (nord[3] > nord[1]) allee({ trace: ALLEE_HAUTE, largeur: LARG, boite: nord, tuile: 4.04, dy: 0.03, teinte: teinteAsphalte }, gris);
  if (sud[3] > sud[1]) allee({ trace: ALLEE_HAUTE, largeur: LARG, boite: sud, tuile: 4.04, dy: 0.03, teinte: teinteAsphalte }, gris);
  // le coin du départ de la rampe ouest (entre le bout de l'allée et x -54,6, où Z11 la reprend) : 2 cm plus bas,
  // l'allée passe par-dessus
  if (B[3] > 140) allee({ trace: RAMPE_OUEST_DEBUT, largeur: LARG, boite: [-58.5, 138, -54.6, 146.5], tuile: 4.04, dy: 0.022, teinte: teinteAsphalte }, gris);
  const m = maillageSol(gris.geometrie(), kit.materiau('asphalte'), 'allée haute · asphalte');
  if (m) groupe.add(aPlat(m));
  yield;
  // l'esplanade de stabilisé, au nord du belvédère : l'allée, élargie côté crête jusqu'au bord du plat
  const zs = [Math.max(B[1], Z_STAB[0]), Math.min(B[3], Z_STAB[1])];
  if (zs[1] > zs[0]) {
    const lot = new kit.Lot('esplanade nord');
    drape(kit, lot, 'gravier#sol', [xAxe(zs[0]) - LARG / 2 - 0.3, zs[0], -54.55, zs[1]], (x, z) => x > xAxe(z) - LARG / 2 && x < -54.55,
      { pas: 0.5, dy: 0.028, teinte: (x, z) => teinteStab(x, z, (x - xAxe(z)) / (LARG / 2)) });
    groupe.add(aPlat(lot.maillages('allée haute · esplanade de stabilisé')));
  }
  // les bordures de béton, des deux côtés de l'asphalte (interrompues aux raccords : allées, escaliers, dalles)
  const surAsphalte = (x, z) => dansBoite(B, x, z) && ((z > Z_FIN[0] + 0.3 && z < Z_STAB[0]) || (z > Z_BELV[1] + 0.8 && z < Z_FIN[1] - 0.5));
  for (const cote of [1, -1]) {
    // (côté crête, pas de bordure devant la pelouse de la rupture 37 : le gazon y vient au ras de l'asphalte)
    const garder = cote === 1 ? (x, z) => surAsphalte(x, z) && !(z > PELOUSE_37[0] && z < PELOUSE_37[1]) : surAsphalte;
    yield* bordures(kit, groupe, ALLEE_HAUTE, LARG, cote, garder, { budget: ctx.budget });
  }
}

function* crete(ctx, B) {
  const { kit, K, groupe } = ctx;
  // la bande de pelouse de la rupture 37, de l'allée au garde-corps
  if (B[1] < PELOUSE_37[1] && B[3] > PELOUSE_37[0]) {
    const lot = new kit.Lot('pelouse 37');
    drape(kit, lot, 'gazon#sol', [-56, PELOUSE_37[0], -52.9, PELOUSE_37[1]], (x, z) => x > xAxe(z) + LARG / 2 - 0.05 && x < -53.0,
      { pas: 0.5, dy: 0.02, teinte: (x, z) => { const f = 0.9 + 0.2 * alea(Math.floor(x * 2), Math.floor(z * 2), 821); return [f, f, f * 0.95]; } });
    groupe.add(aPlat(lot.maillages('allée haute · pelouse de la crête')));
  }
  // les garde-corps
  const fer = new kit.Lot('garde-corps de crête');
  for (const ligne of [GC_NORD, GC_37]) {
    const morceau = couperZ(ligne, B[1], B[3]);
    if (morceau.length >= 2 && Math.abs(morceau[morceau.length - 1][1] - morceau[0][1]) > 0.5) gardeCorps(kit, fer, morceau, { h: 1.1 });
  }
  if (fer.parts.size) groupe.add(fer.maillages('allée haute · garde-corps'));
  yield;
  // le massif continu de la crête (il porte ombre)
  preparer();
  const feu = new Touffes();
  let k = 0;
  for (const a of MASSIF) {
    if (!dansBoite(B, a.x, a.z)) continue;
    unArbuste(feu, a);
    if (++k % 6 === 0 && ctx.budget()) yield;
  }
  const m = maillageFeuillage(feu, K, 'allée haute · massif de la crête', true);
  if (m) groupe.add(m);
}
// Une ligne qui avance selon z croissant, coupée à [z0, z1] (les deux bouts interpolés).
export function couperZ(ligne, z0, z1) {
  const out = [];
  for (let i = 0; i < ligne.length; i++) {
    const p = ligne[i], q = ligne[i + 1];
    if (p[1] >= z0 && p[1] <= z1) out.push(p);
    if (q) for (const zc of [z0, z1]) {
      if ((p[1] - zc) * (q[1] - zc) < 0) { const t = (zc - p[1]) / (q[1] - p[1]); out.push([p[0] + (q[0] - p[0]) * t, zc]); }
    }
  }
  return out.sort((a, b) => a[1] - b[1]);
}

function* mobilier(ctx, B) {
  const { kit, groupe } = ctx;
  const lot = new kit.Lot('mobilier de l\'allée haute');
  for (const l of LAMPES) { const x = xLampe(l.z); if (dansBoite(B, x, l.z)) lanterneMat(kit, lot, x, l.z); }
  groupe.add(lot.maillages('allée haute · lampadaires'));
  for (const b of BANCS) { const x = xBanc(b.z); if (dansBoite(B, x, b.z)) groupe.add(kit.banc({ x, z: b.z, cap: capBanc, style: 'ville_paris', long: 1.8 })); }
  // la corbeille du départ sud (D4, cap 270 : « un banc vert parisien et une corbeille ») et une au nord
  for (const [x, z] of [[xAxe(53.2) - LARG / 2 - 1.0, 53.2], [xAxe(-60) - LARG / 2 - 1.0, -60]]) if (dansBoite(B, x, z)) groupe.add(kit.poubelle({ x, z, cap: 90 }));
  yield;
}

function* construireMorceau(ctx, id) {
  const B = BOITES[id];
  yield* allees(ctx, B);
  yield* crete(ctx, B);
  yield* mobilier(ctx, B);
}

// ============================================================================================ la zone
export default {
  id: 'Z17', nom: 'Allée haute (crête)',
  emprise: [[-59, -71], [-55, -71], [-55, 145], [-59, 145]],
  morceaux: Object.keys(BOITES).map((id) => ({ id, boite: BOITES[id], construire: (ctx) => construireMorceau(ctx, id) })),
  // PUR : lampadaires, bancs, corbeilles, le garde-corps nord (celui de la rupture 37 est déjà dans monde.json) et le
  // massif de la crête (on ne passe pas au travers ; le vélo non plus)
  obstacles(o) {
    preparer();
    for (const l of LAMPES) o.cercle(xLampe(l.z), l.z, 0.12, { h: 4.2, type: 'dur' });
    for (const b of BANCS) o.boite(xBanc(b.z), b.z, 0.32, 0.93, 0, { h: 0.9, type: 'dur' });
    for (const [x, z] of [[xAxe(53.2) - LARG / 2 - 1.0, 53.2], [xAxe(-60) - LARG / 2 - 1.0, -60]]) o.cercle(x, z, 0.28, { h: 0.9, type: 'dur' });
    for (let i = 0; i + 1 < GC_NORD.length; i++) o.segment(GC_NORD[i][0], GC_NORD[i][1], GC_NORD[i + 1][0], GC_NORD[i + 1][1], { e: 0.1, h: 1.1, type: 'grille' });
    for (const a of MASSIF) o.cercle(a.x, a.z, a.R * 0.6, { h: a.h, type: 'haie' });
    // (le massif est CONTINU : entre deux arbustes voisins, moins de 3,2 m, un segment de haie ferme le passage. Les
    // cercles seuls laissaient des trous de 0,7 m où le promeneur, et même le vélo, se glissaient vers le coteau ; les
    // vraies ouvertures — têtes de rampe, esplanade nord, belvédère, pelouse de la rupture 37 — restent des trous)
    for (let i = 0; i + 1 < MASSIF.length; i++) {
      const a = MASSIF[i], b = MASSIF[i + 1];
      if (b.z - a.z < 3.2) o.segment(a.x, a.z, b.x, b.z, { e: 0.5, h: Math.min(a.h, b.h), type: 'haie' });
    }
    // (relecture : au sud de la pelouse de la rupture 37, entre le dernier poteau du garde-corps (z 70) et le premier
    // arbuste du massif (z 72,5), il restait un passage de 1,9 m : on y descendait à pied dans le coteau (relevé en
    // marchant vers x+ tous les 50 cm le long de l'allée). Les deux bouts du garde-corps sont raccordés au massif.)
    const avant = MASSIF.filter((a) => a.z < GC_37[0][1]).pop(), apres = MASSIF.find((a) => a.z > GC_37[GC_37.length - 1][1]);
    const [g0, g1] = [GC_37[0], GC_37[GC_37.length - 1]];
    if (avant) o.segment(avant.x, avant.z, g0[0], g0[1], { e: 0.5, h: avant.h, type: 'haie' });
    if (apres) o.segment(g1[0], g1[1], apres.x, apres.z, { e: 0.5, h: apres.h, type: 'haie' });
  },
  bancs(b) {
    const a = (capBanc * Math.PI) / 180;
    for (const x of BANCS) b.push({ x: xBanc(x.z) + Math.sin(a) * 0.1, z: x.z + Math.cos(a) * 0.1, cap: capBanc, y: 0.45, source: 'Z17' });
  },
  lieux: [],
};

// (pour les essais : le tracé et le massif, sans three)
export const _Z17 = { xAxe, massif: () => (preparer(), MASSIF), LAMPES, BANCS, GC_NORD, GC_37 };
// (graine et sections restent importées pour les zones sœurs, qui les reprennent d'ici)
export { avecHasard, graine, solVu, sections, projeter, surAllee, dansBoite, Nappe, allee, maillageSol, bordures, Touffes, maillageFeuillage };
