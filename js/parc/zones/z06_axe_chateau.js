// =====================================================================
//  ZONE Z06 : L'AXE DU CHÂTEAU (lot B3 du chantier « parc entier »)
// =====================================================================
// La pièce la plus visible du parc de Bécon : ce qu'on voit du plateau par le grillage du pin, de toute la terrasse
// du bassin, et du fond de la perspective depuis la grille du 156. Du quai vers le boulevard (x-), en montant :
//
//   - le MUR DES CAVES, en calcaire blond appareillé, de -0,8 (la terrasse) à +5,7 (le terre-plein). Il n'est pas
//     plat (orthophoto, photos j3, j5, j6 et 20260928_171721) : deux BLOCS D'ANGLE en avant (z 19,3-25 et 45-51,7),
//     chacun percé d'une grande fenêtre à petits carreaux et à barreaux au-dessus d'une porte basse cintrée ; entre
//     eux, la FACE EN RETRAIT (x -40,7, z 25-45) contre laquelle montent les deux VOLÉES DE 28 MARCHES en « V » : elles
//     partent du pied de la porte (perron, +1,4) et arrivent aux blocs d'angle (+5,8). Sous chaque volée, un massif de
//     maçonnerie affleure les blocs (les « écoinçons ») : un œil-de-bœuf en haut, un soupirail cintré grillagé en bas.
//     Sur la face en retrait, au-dessus des volées : deux fenêtres, et la porte vitrée derrière sa grille au milieu.
//     Tout en haut, la balustrade de fer forgé à volutes et sa plaque de bronze (j5, j1) ; les volées ont la même
//     rampe (j1, j4). Les murs de retour prolongent les blocs vers le pin et vers la fontaine (soutènement des
//     chemins x = -41 et x = -43), leur balustrade aussi.
//   - au pied, le PERRON (+1,4) devant la porte ; les deux petites volées (14 et 19 marches) qui en descendent le long
//     du mur, devant les écoinçons, un vase au pied de chacune ; devant leur haut, les deux IFS TAILLÉS EN COIN (j5 :
//     leur dessus suit la pente des petites volées) et, entre eux, la porte basse du perron ; en travers au bout de la
//     bande de dalles du pied du mur, deux longues jardinières de pierre (171721).
//   - le TERRE-PLEIN de brique rose (+5,7) et ses quatre candélabres à crosse derrière la balustrade (j1, j3), puis le
//     TALUS FLEURI couronné d'une HAIE TAILLÉE sombre (j5 ; infranchissable : c'est un massif dans les données), et
//     aux deux bouts les VOLÉES DE 31 MARCHES qui montent au belvédère.
//   - le BELVÉDÈRE (+10,6), esplanade de sable blanc bordée côté Seine par une balustrade de fer forgé à volutes sur
//     un muret de pierre, ses vases de jardin, deux lanternes, la STATUE BLANCHE sur son socle, dans l'axe de la
//     perspective, et le MÂT avec le DRAPEAU TRICOLORE qui flotte (animé : il était posé jusqu'ici par js/court_parc.js,
//     `drapeau`, dans le jardin supposé ; drapeau D8 levé, c'est cette zone qui le porte). Deux bancs y regardent la
//     Seine.
//
// LES DONNÉES. Le sol, les nappes, les marches et les obstacles de la zone viennent de tools/parc/gabarits.json
// (gabarits de la zone Z06), qui fait foi : les lignes et les bouts de volées ci-dessous en sont RECOPIÉS (une zone
// n'a pas monde.json sous la main, et le module ne doit rien charger tant que le drapeau D8 est baissé) ; les hauteurs,
// elles, sont lues sur le sol (Monde.sol, via kit.sol) partout où elles ne sont pas fixées par un plan. Qui change un
// gabarit de la zone change la constante d'ici avec lui.
//
// LES MURS ont leur FACE SUR LA FRONTIÈRE RÉELLE des nappes (l'épaisseur part du côté haut), relue dans les données le
// long de la ligne du gabarit (voir frontiere) : c'est là que le sol dessine sa marche et que le pied du joueur
// s'arrête. Un mur centré sur la ligne avancerait de sa demi-épaisseur dans la terrasse (le joueur y entrerait jusqu'aux
// hanches) ; un mur sur la ligne même laissait voir, par endroits, la paroi de terre du sol devant lui (la grille est
// au pas de 0,5 m).
//
// LES VOLÉES : le sol d'un escalier est, dans les données, un plan incliné régulier (le maillage du sol le dessine,
// en terre). Le kit pose les marches NEZ sur ce plan : la moitié de chaque giron passait sous la terre. Ici chaque
// volée est avancée d'un demi-giron vers le bas (voir volee) : le plan ne touche plus que l'angle rentrant des
// marches, tout le giron est au-dessus.
//
// LES MORCEAUX (conception, § 3.3 et 3.5) : cinq, pour tenir chacun sous 25 appels de dessin et 60 000 triangles
// (les balustrades à volutes pèsent 1 500 triangles par mètre) : Z06a le mur des caves et ses volées, Z06b et Z06c ses
// fers (balustrades, rampes, candélabres) au nord et au sud de l'axe, Z06d le terre-plein, le talus et les volées de 31,
// Z06e le belvédère.
//
// RÈGLES DE ZONE : aucun Math.random (kit.alea, kit.bruit) ; toute hauteur par le sol du monde ; les matériaux du kit
// (un seul matériau propre : l'étamine du drapeau) ; aucun arbre planté ici (ils viennent de arbres.bin) ; rien
// n'est écrit hors du groupe du morceau ; le drapeau, animé, est marqué `dynamique` et `nofuse`.
import * as THREE from 'three';

// ============================================================================================ les données de la zone
// (repère du terrain 1 ; recopiées de tools/parc/gabarits.json, zone Z06)
// La face en retrait du mur des caves (gabarit mur_caves) : face à x = -40,7, de z 25 à 45, haut à +5,7.
const FACE = { x: -40.7, z0: 25.0, z1: 45.0, yHaut: 5.7, ep: 0.8, chaperon: 0.2 };
// Les murs de retour (mur_caves_nord, mur_caves_sud) : leurs derniers mètres sont le devant des blocs d'angle.
const RETOUR_N = [[-39.6, 10.6], [-39.5, 14.7], [-39.3, 18.6], [-39.2, 23.0], [-39.2, 25.0]];
const RETOUR_S = [[-39.2, 45.0], [-39.2, 48.0], [-39.2, 51.7], [-39.4, 54.1], [-39.1, 56.1], [-39.0, 58.0]];
const EP_RETOUR = 0.6, CHAPERON_RETOUR = 0.15;
// les blocs d'angle : le bout des murs de retour, de z 19,3 à 25 et de 45 à 51,7 (paliers d'angle, gabarits)
const ZBLOC_N = 19.3, ZBLOC_S = 51.7;
// LES MURS PERCÉS (face en retrait, blocs d'angle, écoinçons) avancent de 30 cm devant la paroi de terre que le sol
// dessine à la frontière des nappes (voir frontiere). Le kit creuse ses baies de 18 à 24 cm derrière le nu du mur : à
// 3 cm devant la paroi, c'était la terre du sol qu'on voyait au fond de chaque fenêtre, de la porte, des soupiraux et
// des œils-de-bœuf, pas la vitre, les petits bois ni les grilles (relecture du lot B3). Le joueur, lui, s'arrêtait à
// la paroi : ces murs ont donc leurs obstacles à leur nu (voir obstacles). Les nus (frontières relues dans les
// données : x -40,75 derrière la face en retrait, -39,25 derrière les blocs et les écoinçons, plus l'avance) :
const AVANCE_BAIES = 0.3;
const NU = { retrait: -40.45, bloc: -38.95 };
// l'épaisseur des écoinçons (leur dos affleure le bord extérieur des volées de 28)
const EP_E = 0.3;
// Le perron (perron_caves, mur_perron) : +1,4, x -40,7 à -36,6, z 33,4 à 36,6 ; son seul mur est son devant, à
// x -36,6, entre les hauts des deux petites volées.
const PERRON = { y: 1.4, ligne: [[-36.6, 33.4], [-36.6, 36.6]], z0: 33.4, z1: 36.6 };
// Les volées (gabarits volee28_*, volee31_*, volee14_perron, volee19_perron) : `de` en bas, `a` en haut.
const V28N = { de: [-39.95, 34.1, 1.4], a: [-39.95, 25.0, 5.8], marches: 28, largeur: 1.5 };
const V28S = { de: [-39.95, 35.9, 1.4], a: [-39.95, 45.0, 5.8], marches: 28, largeur: 1.5 };
const V31N = { de: [-42.5, 20.2, 5.8], a: [-52.0, 20.2, 10.45], marches: 31, largeur: 1.8 };
const V31S = { de: [-42.5, 50.6, 5.8], a: [-52.0, 50.6, 10.45], marches: 31, largeur: 1.8 };
// (les deux petites volées LONGENT le mur, devant les écoinçons, du perron à la terrasse : MNT, ortho, j3, j5 ; la way
// OSM, en biais vers la terrasse, les plaçait là où le MNT est plat — relecture du lot B3)
const V14 = { de: [-37.8, 33.4, 1.4], a: [-37.8, 29.6, -0.8], marches: 14, largeur: 2.3 };
const V19 = { de: [-37.8, 36.6, 1.4], a: [-37.8, 40.4, -0.8], marches: 19, largeur: 2.3 };
// Le terre-plein de brique (terre_plein_caves, +5,7) et les paliers d'angle (+5,8), en un seul contour : il s'arrête
// sous le couronnement des murs (face en retrait : dos à x -41,25 ; blocs d'angle : dos à x -39,55).
const TERRE_PLEIN = [[-46.95, 21.1], [-42.5, 21.1], [-42.5, 19.3], [-39.52, 19.3], [-39.52, 25.0], [-41.22, 25.0], [-41.22, 45.0],
  [-39.52, 45.0], [-39.52, 51.7], [-42.5, 51.7], [-42.5, 49.6], [-46.95, 49.6]];
// Le belvédère et sa balustrade (garde_belvedere) ; entre lui et le terre-plein, le talus (talus_belvedere, massif de
// +5,9 à x -47 à +10,4 à x -52 : voir MUR_TALUS, LIT et HAIE_TALUS plus bas).
const BELVEDERE = { x0: -62.0, x1: -52.0, z0: 20.0, z1: 51.0, y: 10.6 };
const GARDE_B = { x: -52.0, z0: 21.1, z1: 49.6, muret: 0.5, h: 1.0 };

// Le mobilier (photos j3, j5, j1, 171721 ; conception, Z06). Le drapeau : j3 le montre un peu au nord de l'axe de la
// porte (z ≈ 32,5, calcul de perspective sur la photo) ; la statue est dans l'axe de la perspective (z ≈ 36), devant
// lui (j5).
const MAT = { x: -54.3, z: 32.6, h: 8.2 };
const STATUE = { x: -53.3, z: 36.0 };
// quatre candélabres à crosse, le bras tendu vers la terrasse : deux sur les paliers d'angle, derrière la balustrade,
// près du haut des volées (j1 : la crosse et sa lanterne au bout de la balustrade) ; deux de part et d'autre de la
// porte, sur le lit surélevé (`y` : +7,8, voir LIT ; j3 : leurs fûts passent derrière la bande de pierre du mur du
// talus et ses buis)
const CANDELABRES = [{ x: -41.9, z: 24.3 }, { x: -48.4, z: 31.6, y: 7.8 }, { x: -48.4, z: 38.4, y: 7.8 }, { x: -41.9, z: 45.7 }]
  .map((c) => ({ ...c, style: 'crosse', cap: 90 }));
// deux lanternes au bord du belvédère, près des hauts des volées de 31
const LANTERNES = [{ x: -52.85, z: 23.9, style: 'lanterne' }, { x: -52.85, z: 46.8, style: 'lanterne' }];
// les vases de jardin (fonte, sur piédestal de pierre) : un au pied de chaque petite volée, au bout de son limon (j5,
// 171721), quatre sur le belvédère
const VASES_PERRON = [{ x: -36.56, z: 29.15 }, { x: -36.56, z: 40.85 }];
const VASES_BELV = [21.7, 28.9, 42.9, 49.0].map((z) => ({ x: -52.8, z }));
// les longues jardinières de pierre, en travers au bout de la bande dallée du pied du mur, au-delà des petites volées
// (171721 ; ortho : deux barres sombres à z ≈ 26,7 et 43,7, de x -38,7 à -36,2)
const JARDINIERES = [{ x0: -38.93, x1: -36.6, z: 27.0 }, { x0: -38.93, x1: -36.6, z: 43.0 }];
// les deux ifs taillés en coin (ifs_perron, ifs_perron_sud) : devant le haut des petites volées et les coins du perron,
// leur dessus suit la volée (j5) ; entre eux, le devant du perron et sa porte basse. zP : le bout contre la porte,
// zF : le bout vers le pied de la volée.
const IFS = [{ zP: 34.5, zF: 31.6, v: V14 }, { zP: 35.5, zF: 38.4, v: V19 }];
const IF_X = { x0: -36.45, x1: -34.9 };
// la haie taillée qui couronne le talus, et le massif fleuri qui le couvre en dessous
// (le dessus de la haie à +10,5, un peu sous le belvédère : de là-haut, l'œil à +12,3 passe par-dessus et voit la
// terrasse et la Seine, photos 6 et j4 ; d'en bas, sa face cache le pied de la balustrade du belvédère, photo j5)
const HAIE_TALUS = { x: -50.3, z0: 21.45, z1: 49.25, h: 1.6, ep: 1.5 };
const MASSIF_HAUT = [[-51.78, 21.4], [-51.12, 21.4], [-51.12, 49.3], [-51.78, 49.3]];
// LE MUR DU TALUS (relecture du lot B3) : au fond du terre-plein, un mur de calcaire de 2 m (+5,7 -> +7,9 avec son
// couronnement) retient un lit surélevé. Vu de la terrasse, c'est la bande de pierre claire qui double le haut du mur
// des caves derrière sa balustrade (j3 : son dessus 0,4 m au-dessus de la main courante, calcul de perspective ; j5 :
// idem, fleurs orangées dessus) ; le MNS monte de 5,9 à 8,2 entre x -45,5 et -47. Face à x -46,95 (le bord du
// terre-plein des données), entre les deux volées de 31 marches, dont les limons le bordent à la même hauteur.
const MUR_TALUS = { x: -46.95, z0: 21.15, z1: 49.55, yHaut: 7.75, chaperon: 0.15, ep: 0.5 };
// le lit surélevé derrière lui, à +7,8, jusqu'à x -49,1 où le talus des données (pente de 90 %) le rejoint : un rang
// de buis taillés devant (j3 : la ligne verte basse au-dessus de la bande de pierre), le massif rouge derrière
const LIT = { x0: -49.1, x1: -47.45, y: 7.8 };
// deux bancs au fond du belvédère, tournés vers la Seine (hors de la trace de l'allée haute, x -59,4 à -55,9)
const BANCS = [{ x: -60.8, z: 26.0, cap: 90 }, { x: -60.8, z: 45.0, cap: 90 }];

// ============================================================================================ petits outils
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Une ligne 2D décalée de `d` m à DROITE du sens de parcours (négatif : à gauche), coudes en onglet (la même règle que
// le kit : droite = (-dz, dx), gauche = (dz, -dx), convention de tools/parc/gabarits.json).
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
// Le haut d'un mur de soutènement le long de sa ligne (profil [[s, y], ...] tous les mètres) : le sol du côté HAUT, à
// 0,7 m de la face (là où l'outil de données l'a tenu). `droite` : le côté haut est à droite du sens de parcours.
function profilHaut(kit, ligne, droite = true) {
  const pts = kit.reechantillonner(ligne, 1.0), out = [];
  for (let i = 0; i < pts.length; i++) {
    const A = pts[Math.max(0, i - 1)], B = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(B.x - A.x, B.z - A.z) || 1;
    const sg = droite ? 1 : -1, rx = -(B.z - A.z) / l * sg, rz = (B.x - A.x) / l * sg;
    out.push([pts[i].s, kit.sol(pts[i].x + rx * 0.7, pts[i].z + rz * 0.7)]);
  }
  return out;
}
// Coupe une ligne 2D qui avance selon z (croissant ou décroissant) en z = zc : [la partie avant zc, la partie après].
function couperZ(ligne, zc) {
  const avant = [], apres = [];
  for (let i = 0; i < ligne.length; i++) {
    const p = ligne[i], q = ligne[i + 1];
    if (Math.abs(p[1] - zc) < 1e-9) { avant.push(p); apres.push(p); continue; }
    const dansAvant = (ligne[ligne.length - 1][1] >= ligne[0][1]) ? p[1] <= zc : p[1] >= zc;
    (dansAvant ? avant : apres).push(p);
    if (q && (p[1] - zc) * (q[1] - zc) < 0) {
      const t = (zc - p[1]) / (q[1] - p[1]), c = [p[0] + (q[0] - p[0]) * t, zc];
      avant.push(c); apres.push(c);
    }
  }
  return [avant, apres];
}
// Le plan d'une volée (le sol des données) à la hauteur de z, pour les volées le long de z.
function planVolee(v, z) {
  const [, za, ya] = v.de, [, zb, yb] = v.a;
  return ya + (yb - ya) * Math.min(1, Math.max(0, (z - za) / (zb - za)));
}

// UNE VOLÉE DU KIT, avancée d'un demi-giron vers le bas (voir l'en-tête) : le kit pose le nez de la marche k à
// (k - 0,5) girons du bas ; ici il tombe à (k - 1) girons, sur le plan du sol, et l'angle rentrant de la marche k à
// k girons, sur le plan lui aussi. Le giron entier est donc AU-DESSUS du sol des données (1 cm de marge) : le joueur
// y marche au plus d'une contremarche plus bas que le nez, jamais sous la terre du sol. Gauche et droite gardent la
// convention des gabarits (dans le sens de → a). `o.x` : l'axe d'une volée le long de z, s'il n'est pas celui du gabarit.
// (lot C6 : un générateur — `yield* volee(kit, v, o, ctx.budget)` —, la volée faite en tranches : kit.escalierPas)
function volee(kit, v, o = {}, budget = () => false) {
  const [, z0, y0] = v.de, [, z1, y1] = v.a, x0 = o.x ?? v.de[0], x1 = o.x ?? v.a[0];
  const L = Math.hypot(x1 - x0, z1 - z0), g = L / v.marches;
  const bas = y0 <= y1 ? 1 : -1, ux = ((x1 - x0) / L) * bas, uz = ((z1 - z0) / L) * bas;   // vers le haut
  const k = g / 2;
  return kit.escalierPas({
    de: [x0 - ux * k, z0 - uz * k, y0 + 0.01], a: [x1 - ux * k, z1 - uz * k, y1 + 0.01],
    marches: v.marches, largeur: o.largeur ?? v.largeur, limon: o.limon, mainCourante: o.mainCourante, massif: o.massif, materiau: 'taille', usure: 0.8,
  }, budget);
}

// DALLAGE DRAPÉ : les cellules d'une grille (pas `pas`, plus les sommets du contour) dont le centre est dans le polygone,
// dont les quatre coins sont dans la même nappe que le centre (ni mur, ni marche : une frontière de nappes coupe le
// dallage), hors escalier, et (option) marchables et dans [yMin, yMax]. Chaque sommet est posé sur le sol + `dy`
// (au-dessous des rubans du kit, à 2 cm : une allée d'une autre zone passe dessus sans scintiller). Normales et UV du
// sol ; couleur de sommet : taches lentes (usure, pluie), et `teinte`.
function dallage(kit, M, lot, cle, poly, o = {}) {
  const pas = o.pas ?? 0.5, dy = o.dy ?? 0.012, tu = o.tuile ?? kit.TUILES[cle.split('#')[0]] ?? 1, teinte = o.teinte || [1, 1, 1];
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const coupe = (a, b, bords) => {
    const s = new Set(); for (let v = a; v < b - 1e-6; v += pas) s.add(+v.toFixed(4));
    s.add(+b.toFixed(4)); for (const v of bords) if (v > a && v < b) s.add(+v.toFixed(4));
    return [...s].sort((p, q) => p - q);
  };
  const xs = coupe(x0, x1, poly.map((p) => p[0])), zs = coupe(z0, z1, poly.map((p) => p[1]));
  const dx = M.dx, p = lot.part(cle), idx = new Map(), n = { x: 0, y: 1, z: 0 };
  const sommet = (i, k) => {
    const cleS = k * xs.length + i;
    let v = idx.get(cleS);
    if (v === undefined) {
      const x = xs[i], z = zs[k];
      M.normale(x + dx, z, n);
      const f = (0.9 + 0.16 * kit.bruit(x * 0.35, z * 0.35, 211)) * (0.96 + 0.06 * kit.alea(Math.floor(x * 2), Math.floor(z * 2), 212));
      v = lot.s(p, x, kit.sol(x, z) + dy, z, n.x, n.y, n.z, x / tu, z / tu, [teinte[0] * f, teinte[1] * f, teinte[2] * f]);
      idx.set(cleS, v);
    }
    return v;
  };
  const ESC = 4, MARCHE = 1;
  for (let k = 0; k < zs.length - 1; k++) for (let i = 0; i < xs.length - 1; i++) {
    const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[k] + zs[k + 1]) / 2;
    if (!kit.dansPolygone(cx, cz, poly)) continue;
    const nc = M.nappe(cx + dx, cz);
    let ok = true;
    for (const [x, z] of [[xs[i], zs[k]], [xs[i + 1], zs[k]], [xs[i], zs[k + 1]], [xs[i + 1], zs[k + 1]], [cx, cz]]) {
      const f = M.drapeaux(x + dx, z);
      if (M.nappe(x + dx, z) !== nc || (f & ESC) || (o.marchable && !(f & MARCHE))) { ok = false; break; }
      if (o.yMin !== undefined) { const y = kit.sol(x, z); if (y < o.yMin || y > o.yMax) { ok = false; break; } }
    }
    if (!ok) continue;
    lot.quad(p, sommet(i, k), sommet(i + 1, k), sommet(i + 1, k + 1), sommet(i, k + 1));
  }
  return lot;
}

// Transforme les sommets de toutes les géométries d'un groupe du kit (repère du terrain 1 : le décalage de parc2 est
// sur la position des maillages) : `f(x, y, z)` rend le nouveau y. Les normales du feuillage sont recalculées ; celles
// des rameaux (« frange ») gardent leur inclinaison vers le ciel voulue par le kit (ils s'éclairent comme la surface).
function retoucherY(groupe, f) {
  groupe.traverse((m) => {
    if (!m.isMesh) return;
    const P = m.geometry.attributes.position;
    for (let i = 0; i < P.count; i++) P.setY(i, f(P.getX(i), P.getY(i), P.getZ(i)));
    P.needsUpdate = true;
    if (m.material.userData.kit !== 'frange') m.geometry.computeVertexNormals();
    m.geometry.computeBoundingSphere();
  });
  return groupe;
}

// ============================================================================================ 1. LE MUR DES CAVES
// LA FRONTIÈRE RÉELLE d'un mur. L'outil de données coupe les nappes le long de la ligne du gabarit, mais la grille est
// au pas de 0,5 m : la marche que le sol dessine (une paroi de terre, js/monde_sol.js) et où le pied du joueur s'arrête
// tombe au milieu de deux nœuds, jusqu'à 25 cm de la ligne. Un mur dessiné sur la ligne laissait donc voir la terre
// devant lui (ligne à x -39,4 : paroi à -39,25) ou avançait dans la terrasse (ligne à -39,6 : paroi à -39,75). On la
// relit dans les nappes : pour chaque rangée de nœuds que traverse un segment (presque parallèle à x ou à z), le
// changement de nappe le plus proche de la ligne, avec plus de 0,3 m de marche. Rend une ligne brisée à angles droits
// (des ressauts de 0,5 m là où la frontière saute d'une colonne de nœuds à l'autre), à `avance` m DEVANT la paroi
// (3 cm par défaut ; AVANCE_BAIES pour un mur percé, voir plus bas). `droite` : le côté haut est à droite du sens de
// parcours.
function frontiere(M, ligne, droite = true, avance = 0.03) {
  const R = M.repere, pas = R.pas, dx = M.dx;
  const runs = [];                                   // [{ surZ, c (coordonnée fixe), a, b (bornes le long) }]
  for (let s = 0; s < ligne.length - 1; s++) {
    const [ax, az] = ligne[s], [bx, bz] = ligne[s + 1];
    const surZ = Math.abs(bz - az) >= Math.abs(bx - ax);
    const [ta, tb, ua, ub, t0, u0] = surZ ? [az, bz, ax, bx, R.z0, R.x0] : [ax, bx, az, bz, R.x0, R.z0];
    const sens = Math.sign(tb - ta) || 1;
    // le côté bas (où la face regarde), en travers : +1 ou -1 sur l'axe u
    const bas = (surZ ? sens : -sens) * (droite ? 1 : -1);
    const pt = (u, t) => (surZ ? [u, t] : [t, u]);
    const tmin = Math.min(ta, tb), tmax = Math.max(ta, tb);
    const k0 = Math.ceil((tmin - t0) / pas - 1e-6), k1 = Math.floor((tmax - t0) / pas + 1e-6);
    const ks = []; for (let k = k0; k <= k1; k++) ks.push(k);
    if (sens < 0) ks.reverse();
    const siens = [];
    let prec = null;
    for (const k of ks) {
      const t = t0 + k * pas, ul = ua + (ub - ua) * ((t - ta) / ((tb - ta) || 1));
      let best = null;
      for (let i = Math.floor((ul - 0.8 - u0) / pas); i < Math.ceil((ul + 0.8 - u0) / pas); i++) {
        const u1 = u0 + i * pas, u2 = u1 + pas, [x1, z1] = pt(u1, t), [x2, z2] = pt(u2, t);
        const n1 = M.nappe(x1 + dx, z1), n2 = M.nappe(x2 + dx, z2);
        if (n1 === n2) continue;
        if (Math.abs(M.solNappe(x1 + dx, z1, n1) - M.solNappe(x2 + dx, z2, n2)) < 0.3) continue;
        const m = (u1 + u2) / 2;
        if (best === null || Math.abs(m - ul) < Math.abs(best - ul)) best = m;
      }
      // (pas de vraie marche sur cette rangée — le haut d'une volée qui arrive au niveau du perron — : on garde la
      // colonne de la rangée précédente plutôt que la ligne du gabarit, sans ressaut de 25 cm pour rien)
      const brut = best !== null ? best : prec ? prec.brut : ul, c = brut + bas * avance;
      const a = Math.max(tmin, Math.min(tmax, t - sens * pas / 2)), b = Math.max(tmin, Math.min(tmax, t + sens * pas / 2));
      if (prec && Math.abs(prec.c - c) < 1e-6) prec.b = b;
      else { prec = { surZ, c, brut, a, b }; siens.push(prec); }
    }
    // (bouts du segment : la première et la dernière rangée s'étendent jusqu'à ses extrémités ; un segment qui prolonge
    // le précédent sur la même colonne de nœuds ne fait qu'une course avec lui)
    if (!siens.length) continue;
    siens[0].a = ta; siens[siens.length - 1].b = tb;
    const der = runs[runs.length - 1];
    if (der && der.surZ === surZ && Math.abs(der.c - siens[0].c) < 1e-6) { der.b = siens[0].b; siens.shift(); }
    runs.push(...siens);
  }
  // la ligne brisée : chaque course d'une extrémité à l'autre ; entre deux courses parallèles, un ressaut ; entre deux
  // courses perpendiculaires, leur coin commun
  const P = (r, t) => (r.surZ ? [r.c, t] : [t, r.c]);
  const out = [];
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i], n = runs[i + 1];
    if (!out.length) out.push(P(r, r.a));
    if (!n) { out.push(P(r, r.b)); break; }
    if (n.surZ === r.surZ) { out.push(P(r, r.b)); out.push(P(n, r.b)); n.a = r.b; }
    else { out.push(r.surZ ? [r.c, n.c] : [n.c, r.c]); n.a = r.c; }
  }
  // (points confondus retirés)
  return out.filter((p, i) => i === 0 || Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]) > 1e-4);
}
// Un mur de calcaire dont la FACE est sur la frontière réelle des nappes le long de `ligne` (voir frontiere), `o.avance`
// m devant elle (3 cm par défaut, AVANCE_BAIES pour un mur percé) ; son épaisseur part du côté haut. Un pan droit par segment de la face (les ressauts de 0,5 m sont des pans perpendiculaires :
// le kit, qui décale la ligne de la demi-épaisseur, retournait un ressaut plus court que l'épaisseur du mur). Les pans se
// recouvrent aux angles, dans l'épaisseur. `yHaut` : nombre, 'sol' (le sol du côté haut, pan par pan) ou profil
// [[s, y], ...] le long de `ligne` ; les ouvertures sont données en z0/z1 (pans le long de z). Les chaînes d'angle ne
// sont posées que si le mur tient en un seul pan. Rend [le groupe du mur, la ligne de sa face].
// (lot C6 : un générateur — `yield* murFace(kit, M, ligne, o, ctx.budget)` —, chaque pan fait en tranches : kit.murPierrePas)
function* murFace(kit, M, ligne, o, budget = () => false) {
  const droite = o.cote !== 'gauche';
  const face = o.surLigne ? ligne : frontiere(M, ligne, droite, o.avance ?? 0.03);
  const g = new THREE.Group(); g.name = 'mur de calcaire';
  const pans = [];
  for (let i = 0, s0 = 0; i < face.length - 1; i++) {
    const A = face[i], B = face[i + 1], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (L > 0.05) pans.push({ A, B, s0 });
    s0 += L;
  }
  for (const { A, B, s0 } of pans) {
    const seg = [A, B], axe = decaler(seg, (droite ? 1 : -1) * o.ep / 2);
    const yHaut = o.yHaut === 'sol' ? profilHaut(kit, seg, droite) : Array.isArray(o.yHaut) ? o.yHaut.map(([sv, y]) => [sv - s0, y]) : o.yHaut;
    const surZ = Math.abs(B[1] - A[1]) >= Math.abs(B[0] - A[0]), za = Math.min(A[1], B[1]), zb = Math.max(A[1], B[1]);
    const ouvertures = surZ ? (o.ouvertures || []).filter((w) => (w.z0 + w.z1) / 2 >= za && (w.z0 + w.z1) / 2 <= zb) : [];
    g.add(yield* kit.murPierrePas({ ...o, yHaut, ouvertures, ligne: axe, cote: droite ? 'droite' : 'gauche', pierre: 'calcaire', chaines: pans.length === 1 && o.chaines !== false }, budget));
  }
  return [g, face];
}
// Les grands barreaux devant une fenêtre des blocs d'angle (171721 : « grande fenêtre à barreaux ») : cinq barreaux
// d'aplomb et deux traverses, scellés dans le tableau à 6 cm du nu. Face tournée vers x+.
function barreauxFenetre(kit, lot, x, z0, z1, y0, y1) {
  const n = 5, F = kit.TEINTES.fer;
  for (let i = 1; i <= n; i++) {
    const z = z0 + ((z1 - z0) * i) / (n + 1);
    lot.barre([x, y0 + 0.02, z], [x, y1, z], 0.024, 0.024, { couleur: F });
  }
  for (const y of [y0 + 0.45, y0 + (y1 - y0) * 0.62]) lot.barre([x + 0.012, y, z0 - 0.04], [x + 0.012, y, z1 + 0.04], 0.05, 0.012, { couleur: F, haut: [0, 1, 0] });
}

function* murDesCaves(ctx) {
  const { kit } = ctx, G = ctx.groupe;
  const ajouter = (o) => { if (o) G.add(o); };
  // ---- la face en retrait : la porte vitrée au milieu (sur le perron), une fenêtre au-dessus de chaque volée
  const fen = (zc) => {
    // l'appui 25 cm au-dessus de la plus haute marche sous la fenêtre (j3 : les fenêtres sont juste au-dessus des volées)
    const v = zc < 35 ? V28N : V28S, bas = Math.max(planVolee(v, zc - 0.45), planVolee(v, zc + 0.45)) + 0.157 + 0.22;
    return { type: 'fenetre', z0: zc - 0.45, z1: zc + 0.45, bas, haut: Math.min(5.05, bas + 1.45), fleche: 0.12 };
  };
  const fenN = fen(30.9), fenS = fen(39.1);
  const M = ctx.Monde;
  const [murF, ligneF] = yield* murFace(kit, M, [[FACE.x, FACE.z0], [FACE.x, FACE.z1]], {
    ep: FACE.ep, yHaut: FACE.yHaut, yBas: null, chaperon: FACE.chaperon, plinthe: false, chaines: false, avance: AVANCE_BAIES,
    ouvertures: [fenN, { type: 'porte', z0: 34.42, z1: 35.58, bas: PERRON.y, haut: 3.72, fleche: 0.26 }, fenS],
  }, ctx.budget);
  ajouter(murF);
  const xR = ligneF[0][0];                                  // le nu de la face en retrait
  if (ctx.budget()) yield;
  // ---- les murs de retour, et au bout de chacun le devant d'un bloc d'angle : grande fenêtre et porte basse cintrée
  // (j3, j6, 171721). Le bloc, percé, avance de AVANCE_BAIES ; le retour, plein, reste à 3 cm de la paroi : le ressaut
  // de 27 cm entre les deux (à z 19,3 et 51,7) est fermé par une chaîne de pierre de taille (voir plus bas).
  const bloc = (zc) => {
    const yb = kit.sol(-38.8, zc) + 0.02;
    return [{ type: 'fenetre', z0: zc - 0.58, z1: zc + 0.58, bas: 1.95, haut: 4.05, fleche: 0.22 },
      { type: 'porte', z0: zc - 0.48, z1: zc + 0.48, bas: yb, haut: yb + 1.05, fleche: 0.24 }];
  };
  // (la grande fenêtre est tout près du haut de la volée : 171721, j3)
  const ZBN = 23.4, ZBS = 46.6;
  const [retN, blocN] = couperZ(RETOUR_N, ZBLOC_N), [blocS, retS] = couperZ(RETOUR_S, ZBLOC_S);
  const blocs = [];
  for (const [ret, bl, zc] of [[retN, blocN, ZBN], [retS, blocS, ZBS]]) {
    ajouter((yield* murFace(kit, M, ret, { ep: EP_RETOUR, yHaut: 'sol', yBas: null, chaperon: CHAPERON_RETOUR }, ctx.budget))[0]);
    const [murB, ligneB] = yield* murFace(kit, M, bl, { ep: EP_RETOUR, yHaut: 'sol', yBas: null, chaperon: CHAPERON_RETOUR, chaines: false, avance: AVANCE_BAIES, ouvertures: bloc(zc) }, ctx.budget);
    ajouter(murB); blocs.push(ligneB);
    if (ctx.budget()) yield;
  }
  const xB = blocs[0][0][0];                                // le nu des blocs d'angle (et des écoinçons)
  const fers = new kit.Lot('barreaux des fenêtres');
  for (const zc of [ZBN, ZBS]) barreauxFenetre(kit, fers, xB - 0.06, zc - 0.58, zc + 0.58, 1.95, 4.15);
  // (les deux fenêtres de la face en retrait ont les mêmes barreaux, j3)
  for (const w of [fenN, fenS]) barreauxFenetre(kit, fers, xR - 0.05, w.z0, w.z1, w.bas, w.haut + 0.06);
  ajouter(fers.maillages('barreaux des fenêtres'));
  // les chaînes qui ferment le ressaut entre un bloc et son retour : une pile de pierres de taille alternées, du pied
  // du mur au haut du bloc, sur toute l'épaisseur du ressaut (plus 2 cm dans le retour), 1,5 cm en saillie sur le nu
  // du bloc (comme les chaînes d'angle du kit)
  const chaines = new kit.Lot('chaînes des blocs d\'angle');
  for (const [zb, sens] of [[ZBLOC_N, 1], [ZBLOC_S, -1]]) {
    const x1 = xB + 0.015, x0 = xB - AVANCE_BAIES - 0.02, yb = kit.sol(xB + 0.3, zb) - 0.15, yt = kit.sol(xB - 0.7, zb + sens * 0.4);
    for (let y = yb, k = 0; y < yt - 0.04; k++) {
      const hb = Math.min(yt - y, 0.3 + 0.1 * kit.alea(zb, y, 20 + k)), p = k % 2 === 0 ? 0.42 : 0.26;
      chaines.boite('taille', x1 - x0, hb - 0.008, p, new THREE.Matrix4().makeTranslation((x0 + x1) / 2, y + hb / 2, zb + sens * (p / 2 - 0.002)),
        { chanfrein: 0.012, couleur: [0.95, 0.93, 0.88], uvDecal: [kit.alea(zb, y, 22), kit.alea(y, zb, 23)] });
      y += hb;
    }
  }
  ajouter(chaines.maillages('chaînes des blocs d\'angle'));
  if (ctx.budget()) yield;
  // ---- les écoinçons sous les volées de 28 : affleurent les blocs d'angle, leur dessus suit la volée (2 cm au-dessus
  // du nez de chaque marche, couronnement de 10 cm : il borde la volée comme un limon). Œil-de-bœuf en haut, soupirail
  // cintré grillagé en bas (j3, 171721). Percés, ils avancent eux aussi de AVANCE_BAIES : leur dos (EP_E) affleure le
  // bord extérieur des volées.
  const h28 = (V28N.a[2] - V28N.de[2]) / V28N.marches;
  for (const v of [V28N, V28S]) {
    const zH = v.a[1], zB = v.de[1], za = Math.min(zH, zB), zb = Math.max(zH, zB);
    const haut = [];
    for (let z = za; z <= zb + 1e-6; z += 0.5) haut.push([z - za, planVolee(v, Math.min(z, zb)) + h28 + 0.02]);
    if (haut[haut.length - 1][0] < zb - za - 1e-3) haut.push([zb - za, planVolee(v, zb) + h28 + 0.02]);
    // (j3 : l'œil-de-bœuf vers z 27,2 et 42,7 ; le soupirail juste au-delà du pied de la petite volée, z 29,4 et 40,7)
    const nord = v === V28N, zOc = nord ? 27.4 : 42.6, zSo = nord ? 29.0 : 41.0, ySo = kit.sol(-38.8, zSo) + 0.1;
    ajouter((yield* murFace(kit, M, [[-39.2, za], [-39.2, zb]], {
      ep: EP_E, yHaut: haut, yBas: null, chaperon: 0.1, chaines: false, avance: AVANCE_BAIES,
      ouvertures: [{ type: 'oculus', z0: zOc - 0.28, z1: zOc + 0.28, bas: 2.72 },
        { type: 'soupirail', z0: zSo - 0.45, z1: zSo + 0.45, bas: ySo, haut: ySo + 0.52, fleche: 0.24 }],
    }, ctx.budget))[0]);
    if (ctx.budget()) yield;
  }
  // ---- le perron : son devant (le dessus est le dallage), percé d'une porte basse entre les deux ifs (j5, j3), donc
  // avancé comme les autres murs percés ; la rampe de fer au bord du palier (j3)
  const porteP = (() => { const yb = kit.sol(-36.2, 35.0) + 0.02; return { type: 'porte', z0: 34.55, z1: 35.45, bas: yb, haut: yb + 1.45, fleche: 0.2 }; })();
  const [murP, ligneP] = yield* murFace(kit, M, PERRON.ligne, { ep: 0.6, yHaut: PERRON.y, yBas: null, chaperon: 0, chaines: false, avance: AVANCE_BAIES, ouvertures: [porteP] }, ctx.budget);
  ajouter(murP);
  const xP = ligneP[0][0];                                  // le nu du devant du perron
  ajouter(yield* kit.balustradePas({ ligne: [[xP - 0.12, PERRON.z0 + 0.05], [xP - 0.12, PERRON.z1 - 0.05]], muret: 0, y: PERRON.y, h: 0.95, motif: 'barreaux', travee: 1.55 }, ctx.budget));
  if (ctx.budget()) yield;
  // (volées de 28 : ni limon ni massif, le mur d'un côté, l'écoinçon de l'autre ; elles remplissent l'entre-deux, à
  // 2 cm de la face en retrait (sans scintiller contre elle), 1,16 m de large ; les rampes sont des balustrades, Z06b)
  const xE = xB - EP_E;                                     // le dos des écoinçons
  for (const v of [V28N, V28S]) { ajouter(yield* volee(kit, v, { x: (xR + xE) / 2 - 0.01, largeur: xE - xR - 0.02, limon: false, massif: false }, ctx.budget)); if (ctx.budget()) yield; }
  // (petites volées : du nu des écoinçons, où leurs marches entrent de 5 cm, au nu du devant du perron, limon et rampe
  // du côté de la terrasse seulement — le côté du mur est l'écoinçon)
  const xV0 = xB - 0.05, xV1 = xP - 0.2;
  for (const [v, cote] of [[V14, 'droite'], [V19, 'gauche']]) {
    ajouter(yield* volee(kit, v, { x: (xV0 + xV1) / 2, largeur: xV1 - xV0, limon: cote, mainCourante: cote }, ctx.budget));
    if (ctx.budget()) yield;
  }
  // ---- les dallages : le perron (sans les pieds des volées), la bande au pied du mur (171721, j3)
  const sols = new kit.Lot('dallages du pied du mur');
  dallage(kit, M, sols, 'dalles#sol', [[xR, PERRON.z0], [xP, PERRON.z0], [xP, PERRON.z1], [xR, PERRON.z1]], { dy: 0.015 });
  dallage(kit, M, sols, 'dalles#sol', [[xB, 21.6], [-35.0, 21.6], [-35.0, 47.9], [xB, 47.9]], { marchable: true, yMin: -0.95, yMax: -0.6, teinte: [0.93, 0.92, 0.9] });
  ajouter(sols.maillages('dallages du pied du mur'));
  if (ctx.budget()) yield;
  // ---- les jardinières de pierre, fleuries de rouge ; les vases du pied des petites volées
  const pieces = new kit.Lot('jardinières et vases du perron');
  for (const j of JARDINIERES) jardiniere(kit, pieces, (j.x0 + j.x1) / 2, j.z, j.x1 - j.x0, 0.55, kit.sol((j.x0 + j.x1) / 2, j.z));
  for (const v of VASES_PERRON) vase(kit, pieces, v.x, v.z, kit.sol(v.x, v.z), 0.72);
  ajouter(pieces.maillages('jardinières et vases du perron'));
  if (ctx.budget()) yield;
  // ---- les ifs taillés en coin : une haie courte, le long de la petite volée, dont le dessus suit la ligne des nez à
  // 20 cm au-dessus (et reste à 20 cm au-dessus du palier devant le perron : on voit la rampe du palier et le haut de la
  // porte basse) : de la porte vers le pied de la volée (j5)
  for (const f of IFS) {
    const xc = (IF_X.x0 + IF_X.x1) / 2, H = 3.0;
    const h = kit.haieTaillee({ ligne: [[xc, f.zP], [xc, f.zF]], h: H, ep: IF_X.x1 - IF_X.x0, arrondi: 0.3, essence: 'if' });
    const y0 = kit.sol(xc, f.zP), haut = (z) => planVolee(f.v, z) + 0.2;
    ajouter(retoucherY(h, (x, y, z) => y0 + (y - y0) * ((haut(z) - y0) / H)));
  }
}

// Une jardinière de pierre de taille (Lx x Lz m, 0,56 de haut) centrée en (x, z), et ses fleurs rouges (cartes du kit).
function jardiniere(kit, lot, x, z, Lx, Lz, y0) {
  const H = 0.56, t = [0.97, 0.95, 0.9];
  lot.boite('taille', Lx, H, Lz, new THREE.Matrix4().makeTranslation(x, y0 + H / 2 - 0.05, z), { chanfrein: 0.02, couleur: t });
  lot.boite('taille', Lx + 0.07, 0.07, Lz + 0.07, new THREE.Matrix4().makeTranslation(x, y0 + H - 0.02, z), { chanfrein: 0.015, couleur: t });
  lot.boite('terre', Lx - 0.12, 0.02, Lz - 0.12, new THREE.Matrix4().makeTranslation(x, y0 + H - 0.03, z), { couleur: [0.7, 0.66, 0.62] });
  bouquet(kit, lot, x, y0 + H - 0.05, z, Lx / 2 - 0.08, Lz / 2 - 0.08, 0.3, 'rouge');
}
// Des fleurs en touffes (les cartes de l'atlas du massif `palette` du kit, deux croisées et une couchée par touffe),
// sur un rectangle de demi-côtés rx, rz centré en (x, z), à la hauteur y.
function bouquet(kit, lot, x, y, z, rx, rz, taille, palette = 'rouge') {
  const p = lot.part('fleurs_' + palette), col = [0, 0, 0];
  const pas = taille * 0.55;
  for (let a = -rz; a <= rz + 1e-6; a += pas) for (let b = -rx; b <= rx + 1e-6; b += pas) {
    const jx = x + b + (kit.alea(x + b, z + a, 221) - 0.5) * pas * 0.5, jz = z + a + (kit.alea(x + b, z + a, 222) - 0.5) * pas * 0.5;
    const c = Math.floor(kit.alea(jx, jz, 223) * 5), dessus = 12 + Math.floor(kit.alea(jx, jz, 224) * 4);
    const s = taille * (0.85 + 0.3 * kit.alea(jx, jz, 225)), rot = kit.alea(jx, jz, 226) * Math.PI, t = 0.88 + 0.22 * kit.alea(jx, jz, 227);
    const carte = (cell, ax, az, couche) => {
      const u0 = (cell % 4) / 4, v0 = 1 - (Math.floor(cell / 4) + 1) / 4, base = p.n;
      const coins = couche
        ? [[-0.5, -0.5, 0.004, 0.004], [0.5, -0.5, 0.246, 0.004], [0.5, 0.5, 0.246, 0.246], [-0.5, 0.5, 0.004, 0.246]]
        : [[-0.5, 0, 0.004, 0.004], [0.5, 0, 0.246, 0.004], [0.5, 1, 0.246, 0.246], [-0.5, 1, 0.004, 0.246]];
      for (const [du, dv, uu, vv] of coins) {
        const px = couche ? jx + (ax * du - az * dv) * s : jx + ax * du * s, pz = couche ? jz + (az * du + ax * dv) * s : jz + az * du * s;
        const py = couche ? y + 0.6 * s : y - 0.02 + dv * s;
        const ao = couche ? 1 : 0.55 + 0.45 * dv;
        col[0] = t * ao; col[1] = t * ao; col[2] = t * ao;
        lot.s(p, px, py, pz, couche ? 0 : -az * 0.25, 1, couche ? 0 : ax * 0.25, u0 + uu, v0 + vv, col);
      }
      lot.quad(p, base, base + 1, base + 2, base + 3);
    };
    const ca = Math.cos(rot), sa = Math.sin(rot);
    carte(c, ca, sa, false); carte(c, -sa, ca, false); carte(dessus, ca, sa, true);
  }
}
// Un vase de jardin (vase Médicis de fonte, peint en vert très sombre : 171721) sur son piédestal de pierre, garni de
// fleurs rouges. (x, z) : le centre ; y0 : le sol ; hp : hauteur du piédestal.
function vase(kit, lot, x, z, y0, hp = 0.7) {
  const pierre = [0.96, 0.94, 0.9], fonte = [0.035, 0.045, 0.04];
  const B = (w, h, y, ch = 0.015) => lot.boite('taille', w, h, w, new THREE.Matrix4().makeTranslation(x, y + h / 2, z), { chanfrein: ch, couleur: pierre, uvDecal: [kit.alea(x, y, 231), kit.alea(z, y, 232)] });
  B(0.56, 0.1, y0 - 0.04); B(0.46, hp - 0.2, y0 + 0.06, 0.012); B(0.54, 0.06, y0 + hp - 0.14); B(0.5, 0.08, y0 + hp - 0.08);
  const yv = y0 + hp;
  // la coupe : pied, gorge, panse godronnée (facettes), lèvre évasée
  const profil = [[0.11, 0], [0.12, 0.03], [0.07, 0.07], [0.06, 0.13], [0.1, 0.17], [0.15, 0.2], [0.2, 0.27], [0.23, 0.36], [0.225, 0.42],
    [0.24, 0.45], [0.29, 0.5], [0.32, 0.53], [0.31, 0.56], [0.27, 0.56]];
  lot.tour('peinture', profil, 16, new THREE.Matrix4().makeTranslation(x, yv, z), { bande: true, couleur: fonte, vif: true });
  lot.tour('terre', [[0.27, 0.535], [0.001, 0.545]], 12, new THREE.Matrix4().makeTranslation(x, yv, z), { couleur: [0.6, 0.55, 0.5] });
  bouquet(kit, lot, x, yv + 0.52, z, 0.2, 0.2, 0.3, 'rouge');
}

// ============================================================================================ 2. LES FERS DES CAVES
// LES FERS D'UN CÔTÉ DE L'AXE (`nord` : z < 35,5 ; sinon le sud) : deux morceaux, chacun sous les 60 000 triangles
// (le fer forgé à volutes en fait 1 500 par mètre). La balustrade de la face est coupée à z = 36, à un poteau : la
// plaque de bronze reste d'un seul tenant au-dessus de la porte (z = 35), dans la moitié nord.
function fersDesCaves(nord) {
  return function* fers(ctx) {
    const { kit } = ctx, G = ctx.groupe, M = ctx.Monde, ZC = 36.0;
    // la balustrade à volutes du haut de la face en retrait, posée sur le couronnement (la face : sur la frontière
    // réelle, avancée comme dans murDesCaves)
    const xF = frontiere(M, [[FACE.x, FACE.z0], [FACE.x, FACE.z1]], true, AVANCE_BAIES)[0][0] - 0.25, yF = FACE.yHaut + FACE.chaperon;
    G.add(yield* (nord ? kit.balustradePas({ ligne: [[xF, FACE.z0], [xF, ZC]], muret: 0, y: yF, h: 1.0, plaque: 35 - FACE.z0 }, ctx.budget)
      : kit.balustradePas({ ligne: [[xF, ZC], [xF, FACE.z1]], muret: 0, y: yF, h: 1.0 }, ctx.budget)));
    if (ctx.budget()) yield;
    // la rampe de la volée en V : la même balustrade à volutes (j1, j4), posée sur le couronnement de l'écoinçon
    const v = nord ? V28N : V28S, h28 = (v.a[2] - v.de[2]) / v.marches;
    const zH = v.a[1], zB = v.de[1], L = Math.abs(zB - zH);
    const xE = frontiere(M, [[-39.2, Math.min(zH, zB)], [-39.2, Math.max(zH, zB)]], true, AVANCE_BAIES)[0][0] - EP_E / 2;
    G.add(yield* kit.balustradePas({ ligne: [[xE, zH], [xE, zB]], muret: 0, y: [[0, planVolee(v, zH) + h28 + 0.12], [L, planVolee(v, zB) + h28 + 0.12]], h: 0.92, travee: 1.52 }, ctx.budget));
    if (ctx.budget()) yield;
    // la balustrade du mur de retour, sur l'axe de son couronnement : à volutes au-dessus du bloc d'angle (la même que
    // celle de la face, j3, j1), barreaux et frise le long du chemin x = -41 ou x = -43 (plus légère). Le haut suit le
    // sol du côté haut, plus le couronnement. (Le bloc avance de AVANCE_BAIES, le retour non : deux axes.)
    const [avant, apres] = couperZ(nord ? RETOUR_N : RETOUR_S, nord ? ZBLOC_N : ZBLOC_S);
    const axe = (l, av) => decaler(frontiere(M, l, true, av), EP_RETOUR / 2);
    const chemin = axe(nord ? avant : apres, 0.03), b0 = axe(nord ? apres : avant, AVANCE_BAIES);
    // (la balustrade du bloc fait le retour de 27 cm au-dessus de la chaîne, jusqu'au bout de celle du chemin)
    const bloc = nord ? [chemin[chemin.length - 1], ...b0] : [...b0, chemin[0]];
    for (const [ligne, motif] of [[bloc, 'volutes'], [chemin, 'barreaux']]) {
      if (ligne.length < 2) continue;
      const prof = profilHaut(kit, ligne).map(([sv, y]) => [sv, y + CHAPERON_RETOUR]);
      G.add(yield* kit.balustradePas({ ligne, muret: 0, y: prof, h: 1.0, motif, travee: motif === 'barreaux' ? 2.0 : 1.6 }, ctx.budget));
    }
    if (ctx.budget()) yield;
    // les candélabres à crosse des paliers d'angle, de ce côté (ceux du lit surélevé sont posés avec lui, Z06d)
    for (const c of CANDELABRES) if (c.y === undefined && (c.z < 35) === nord) G.add(kit.lampadaire(c));
  };
}

// ============================================================================================ 3. TERRE-PLEIN, TALUS, VOLÉES DE 31
function* terrePlein(ctx) {
  const { kit } = ctx, G = ctx.groupe;
  // la brique rose du terre-plein et des paliers d'angle (orthophoto ; j1 : on y marche), drapée sur le sol (+5,7 et +5,8) ;
  // la brique du kit est d'un rouge de mur : ramenée au rose passé des photos (j1 : environ #8a6258 à l'ombre)
  const sols = new kit.Lot('brique du terre-plein');
  dallage(kit, ctx.Monde, sols, 'brique#sol', TERRE_PLEIN, { pas: 1.0, teinte: [0.9, 2.4, 2.55] });
  G.add(sols.maillages('brique du terre-plein'));
  // le mur du talus (voir MUR_TALUS), sa face au bord du terre-plein, le haut côté talus (x-)
  const MT = MUR_TALUS, xa = MT.x - MT.ep / 2;
  G.add(yield* kit.murPierrePas({ ligne: [[xa, MT.z0], [xa, MT.z1]], cote: 'droite', yHaut: MT.yHaut, yBas: null, ep: MT.ep, pierre: 'calcaire', chaperon: MT.chaperon, chaines: false }, ctx.budget));
  if (ctx.budget()) yield;
  // les volées de 31 marches : limons et rampes des deux côtés (gabarits)
  for (const v of [V31N, V31S]) { G.add(yield* volee(kit, v, { limon: true, mainCourante: 'deux' }, ctx.budget)); if (ctx.budget()) yield; }
  // LE LIT SURÉLEVÉ derrière le mur (voir LIT) : sa terre à plat (le talus des données passe dessous en pente : on ne le
  // voit ni de la terrasse, ni du terre-plein, ni d'en haut), un rang de buis taillés contre le couronnement, le massif
  // rouge derrière, et les deux candélabres du milieu. Le buis et les candélabres sont posés sur le sol de leur axe par
  // le kit : on les relève au niveau du lit.
  const lit = new kit.Lot('lit surélevé du talus');
  lit.boite('terre', LIT.x1 - LIT.x0 + 0.05, 0.3, MT.z1 - MT.z0, new THREE.Matrix4().makeTranslation((LIT.x0 + LIT.x1) / 2, LIT.y - 0.15, (MT.z0 + MT.z1) / 2), { couleur: [0.62, 0.56, 0.5] });
  G.add(lit.maillages('lit surélevé du talus'));
  const xBuis = MT.x - MT.ep - 0.36, buis = kit.haieTaillee({ ligne: [[xBuis, MT.z0 + 0.25], [xBuis, MT.z1 - 0.25]], h: 0.5, ep: 0.55, arrondi: 0.15, essence: 'buis' });
  G.add(retoucherY(buis, (x, y, z) => y + LIT.y - kit.sol(xBuis, z)));
  for (const c of CANDELABRES) {
    if (c.y === undefined) continue;
    const l = kit.lampadaire(c), dy = c.y - kit.sol(c.x, c.z);
    l.traverse((m) => { if (m.isMesh) m.position.y += dy; });
    G.add(l);
  }
  if (ctx.budget()) yield;
  // (le massif : des touffes du kit sur le lit, par tronçons de 7 m pour rendre la main entre deux)
  const fleurs = new kit.Lot('massif du lit surélevé'), xf0 = xBuis - 0.35, n = 4;
  for (let i = 0; i < n; i++) {
    const za = MT.z0 + 0.2 + ((MT.z1 - MT.z0 - 0.4) * i) / n, zb = MT.z0 + 0.2 + ((MT.z1 - MT.z0 - 0.4) * (i + 1)) / n;
    bouquet(kit, fleurs, (xf0 + LIT.x0) / 2, LIT.y + 0.02, (za + zb) / 2, (xf0 - LIT.x0) / 2, (zb - za) / 2, ctx.mobile ? 0.42 : 0.34, 'rouge');
    if (ctx.budget()) yield;
  }
  G.add(fleurs.maillages('massif du lit surélevé'));
  // la bande fleurie entre la haie et le muret du belvédère (massif du kit, drapé sur le talus)
  {
    const poly = MASSIF_HAUT, x0 = poly[0][0], x1 = poly[1][0], z0 = poly[0][1], z1 = poly[2][1];
    for (let i = 0; i < n; i++) {
      const za = z0 + ((z1 - z0) * i) / n, zb = z0 + ((z1 - z0) * (i + 1)) / n;
      G.add(kit.massifFleurs({ poly: [[x0, za], [x1, za], [x1, zb], [x0, zb]], palette: 'rouge', densite: ctx.mobile ? 0.5 : 0.75, bombe: 0.03 }));
      if (ctx.budget()) yield;
    }
  }
  // la haie taillée sombre qui couronne le talus (j5) : sur une pente de 90 %, son pied suit le sol de part et d'autre
  // (le kit la pose sur le sol de son axe), son dessus reste horizontal, à 1,6 m au-dessus de l'axe
  const H = HAIE_TALUS, haie = kit.haieTaillee({ ligne: [[H.x, H.z0], [H.x, H.z1]], h: H.h, ep: H.ep, arrondi: 0.25, essence: 'haie' });
  G.add(retoucherY(haie, (x, y, z) => {
    const y0 = kit.sol(H.x, z), t = Math.min(1, Math.max(0, (y - y0 + 0.12) / (H.h + 0.12)));
    return y + (kit.sol(x, z) - y0) * (1 - lisse(0, 1, t));
  }));
}

// ============================================================================================ 4. LE BELVÉDÈRE
function* belvedere(ctx) {
  const { kit } = ctx, G = ctx.groupe, B = BELVEDERE;
  // le sable blanc de l'esplanade, jusqu'au muret de la balustrade
  const sols = new kit.Lot('sable du belvédère');
  dallage(kit, ctx.Monde, sols, 'gravier#sol', [[B.x0, B.z0], [B.x1 - 0.22, B.z0], [B.x1 - 0.22, B.z1], [B.x0, B.z1]], { pas: 1.0, teinte: [1.02, 1.01, 1.0] });
  G.add(sols.maillages('sable du belvédère'));
  if (ctx.budget()) yield;
  // la balustrade de fer forgé à volutes sur son muret de pierre (garde_belvedere) ; le pied au niveau du belvédère ;
  // en quatre tronçons de 7,1 m (16 ms d'un bloc sur PC), bout à bout sur un poteau commun. Son fer ne porte pas
  // d'ombre : le soleil du soir (à l'ouest) la jetterait sur la haie du talus, où on ne la voit pas, et les 44 000
  // triangles de ses volutes ne repassent pas dans la carte d'ombre (le muret, lui, garde la sienne)
  for (let i = 0, n = 4; i < n; i++) {
    const za = GARDE_B.z0 + ((GARDE_B.z1 - GARDE_B.z0) * i) / n, zb = GARDE_B.z0 + ((GARDE_B.z1 - GARDE_B.z0) * (i + 1)) / n;
    const b = yield* kit.balustradePas({ ligne: [[GARDE_B.x, za], [GARDE_B.x, zb]], muret: GARDE_B.muret, h: GARDE_B.h, y: B.y - 0.12, travee: 1.78 }, ctx.budget);
    b.traverse((m) => { if (m.isMesh && m.material.userData.kit === 'peinture') m.castShadow = false; });
    G.add(b);
    if (ctx.budget()) yield;
  }
  // les vases, les lanternes, les bancs
  const pieces = new kit.Lot('vases du belvédère');
  for (const v of VASES_BELV) vase(kit, pieces, v.x, v.z, kit.sol(v.x, v.z), 0.72);
  G.add(pieces.maillages('vases du belvédère'));
  for (const l of LANTERNES) G.add(kit.lampadaire(l));
  for (const b of BANCS) G.add(kit.banc({ ...b, style: 'ville_paris' }));
  if (ctx.budget()) yield;
  // la statue blanche sur son socle, tournée vers la Seine
  const st = new kit.Lot('statue');
  statue(kit, st, STATUE.x, STATUE.z, kit.sol(STATUE.x, STATUE.z));
  G.add(st.maillages('statue'));
  if (ctx.budget()) yield;
  // le mât blanc et son drapeau tricolore, qui flotte
  const mat = new kit.Lot('mât');
  mat_(kit, mat, MAT.x, MAT.z, kit.sol(MAT.x, MAT.z), MAT.h);
  G.add(mat.maillages('mât'));
  G.add(drapeauFlottant(ctx, MAT.x, MAT.z, kit.sol(MAT.x, MAT.z) + MAT.h - 0.12));
}

// LA STATUE (photos j5 et 4) : une figure drapée de marbre blanc, debout, en léger contrapposto, sur un socle de pierre
// (base, dé, corniche). La robe et le manteau sont des surfaces de révolution déformées (plis, section elliptique :
// la figure est plus large que profonde), la tête, le chignon et les épaules des sphères, les bras des tubes balayés ;
// le tout dans le matériau « peinture » du kit, en blanc de marbre. Elle regarde vers x+ (la terrasse, la Seine) : son
// côté droit est vers z+. Elle tient une couronne de la main gauche, contre la poitrine.
function statue(kit, lot, x, z, y0) {
  const pierre = [0.97, 0.95, 0.9], marbre = [0.93, 0.925, 0.9];
  const B = (w, h, y, d = w, ch = 0.02) => lot.boite('taille', w, h, d, new THREE.Matrix4().makeTranslation(x, y + h / 2, z), { chanfrein: ch, couleur: pierre, uvDecal: [kit.alea(x, y, 241), 0.3] });
  B(1.12, 0.22, y0 - 0.1); B(0.98, 0.1, y0 + 0.12); B(0.8, 1.05, y0 + 0.22, 0.8, 0.015);
  B(0.92, 0.08, y0 + 1.27); B(1.0, 0.1, y0 + 1.35); B(0.66, 0.1, y0 + 1.45);
  const yS = y0 + 1.55, R = new THREE.Matrix4().makeTranslation(x, yS, z), F = { bande: true, couleur: marbre };
  const T = (px, py, pz) => new THREE.Matrix4().makeTranslation(x + px, yS + py, z + pz);
  // la robe (des pieds aux épaules) et le manteau jeté sur le dos, qui retombe en biais
  lot.geo('peinture', drape([[0.26, 0], [0.26, 0.05], [0.245, 0.15], [0.225, 0.4], [0.205, 0.65], [0.195, 0.8], [0.175, 0.92], [0.152, 1.02],
    [0.158, 1.1], [0.178, 1.2], [0.19, 1.3], [0.192, 1.37], [0.155, 1.44], [0.075, 1.49], [0.05, 1.52]], 0, Math.PI * 2, null), R, F);
  lot.geo('peinture', drape([[0.29, 0], [0.27, 0.35], [0.24, 0.62], [0.22, 0.85], [0.2, 1.05], [0.215, 1.25], [0.215, 1.36], [0.17, 1.45]],
    Math.PI * 0.62, Math.PI * 1.55, (a) => 0.28 + (0.45 * (a - Math.PI * 0.62)) / (Math.PI * 0.93)), R, F);
  // le cou, la tête un peu tournée et penchée, le chignon
  lot.geo('peinture', new THREE.CylinderGeometry(0.043, 0.052, 0.12, 10), T(0.0, 1.53, 0.0), F);
  lot.geo('peinture', new THREE.SphereGeometry(0.1, 14, 10).scale(1.08, 1.2, 0.95), T(0.01, 1.66, 0.0).multiply(new THREE.Matrix4().makeRotationY(0.3)).multiply(new THREE.Matrix4().makeRotationZ(-0.1)), F);
  lot.geo('peinture', new THREE.SphereGeometry(0.062, 10, 8).scale(1, 0.9, 1.1), T(-0.075, 1.72, 0.0), F);
  // les cheveux (une demi-coque sur l'arrière et le dessus de la tête, qui encadre le visage : une calotte entière
  // faisait un casque à visière, vue de dos ; relecture B3), le nez, la ceinture haute sous la poitrine
  lot.geo('peinture', new THREE.SphereGeometry(0.108, 14, 10, -Math.PI / 2, Math.PI, 0, Math.PI * 0.78).scale(1.08, 1.2, 1.0), T(0.0, 1.668, 0.0).multiply(new THREE.Matrix4().makeRotationY(0.3)).multiply(new THREE.Matrix4().makeRotationZ(-0.1)), F);
  lot.geo('peinture', new THREE.SphereGeometry(0.022, 6, 5).scale(1.2, 1.4, 0.8), T(0.105, 1.645, 0.0), F);
  lot.geo('peinture', new THREE.TorusGeometry(0.162, 0.013, 5, 28).rotateX(Math.PI / 2).scale(0.7, 1, 1), T(0.0, 1.19, 0.0), F);
  // les bras, serrés contre le corps : le droit tombe et retient un pli de la robe, le gauche replié tient la couronne
  const bras = (pts, r0, r1) => {
    const prof = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; prof.push([Math.cos(a), Math.sin(a)]); }
    for (let i = 0; i < pts.length - 1; i++) {
      const ra = r0 + ((r1 - r0) * i) / (pts.length - 1), rb = r0 + ((r1 - r0) * (i + 1)) / (pts.length - 1), rm = (ra + rb) / 2;
      const A = [x + pts[i][0], yS + pts[i][1], z + pts[i][2]], C = [x + pts[i + 1][0], yS + pts[i + 1][1], z + pts[i + 1][2]];
      lot.prisme('peinture', prof.map(([a, b]) => [a * rm, b * rm]), [A, C], { bande: true, couleur: marbre, lisse: true, haut: [1, 0, 0] });
      lot.geo('peinture', new THREE.SphereGeometry(rb * 1.05, 8, 6), new THREE.Matrix4().makeTranslation(C[0], C[1], C[2]), F);
    }
  };
  for (const cz of [0.19, -0.19]) lot.geo('peinture', new THREE.SphereGeometry(0.058, 8, 6), T(0.0, 1.37, cz), F);
  // (manches amples : 6,5 cm à l'épaule, 3,6 au poignet)
  bras([[0.0, 1.37, 0.205], [0.015, 1.1, 0.22], [0.06, 0.86, 0.19]], 0.065, 0.036);
  bras([[0.0, 1.37, -0.205], [0.08, 1.13, -0.23], [0.19, 1.27, -0.1]], 0.065, 0.036);
  // le pan du manteau ramené en écharpe, de l'épaule gauche à la hanche droite (il casse le fût de la robe) : une bande
  // plate de 20 cm, POSÉE sur la robe (chaque point du chemin sur la surface de la robe, 1,5 cm devant) — un boudin de
  // 4 cm flottant devant elle se lisait comme un tube en travers du corps (relecture B3)
  const rRobe = (py) => { const p = [[0, 0.26], [0.4, 0.225], [0.65, 0.205], [0.8, 0.195], [0.92, 0.175], [1.02, 0.152], [1.1, 0.158], [1.2, 0.178], [1.3, 0.19], [1.37, 0.192], [1.44, 0.155]];
    for (let i = 1; i < p.length; i++) if (py <= p[i][0]) return p[i - 1][1] + ((p[i][1] - p[i - 1][1]) * (py - p[i - 1][0])) / (p[i][0] - p[i - 1][0]);
    return 0.155; };
  const surRobe = (py, pz) => [x + 0.7 * Math.sqrt(Math.max(0, rRobe(py) ** 2 - pz * pz)) + 0.015, yS + py, z + pz];
  lot.prisme('peinture', [[-0.1, -0.009], [0.1, -0.009], [0.1, 0.009], [-0.1, 0.009]],
    [[1.42, -0.15], [1.3, -0.1], [1.15, -0.03], [1.0, 0.04], [0.86, 0.1], [0.74, 0.15]].map(([py, pz]) => surRobe(py, pz)),
    { bande: true, couleur: marbre, lisse: true, haut: [1, 0, 0] });
  // la couronne de laurier : un anneau de 7 cm, et ses feuilles (petits ellipsoïdes couchés autour)
  const C = T(0.2, 1.3, -0.05);
  lot.geo('peinture', new THREE.TorusGeometry(0.07, 0.012, 5, 16).rotateY(Math.PI / 2), C, F);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    lot.geo('peinture', new THREE.SphereGeometry(0.022, 5, 4).scale(0.5, 1.6, 0.9), new THREE.Matrix4().multiplyMatrices(C,
      new THREE.Matrix4().makeTranslation(0, Math.sin(a) * 0.07, Math.cos(a) * 0.07).multiply(new THREE.Matrix4().makeRotationX(-a + 0.6))), F);
  }
}
// Une draperie de révolution autour de l'axe y (profil [[r, y], ...]) sur les angles [a0, a1] (0 = devant, x+) :
// section elliptique (profondeur 0,7 de la largeur), plis verticaux qui s'ouvrent vers le bas, une hanche déhanchée ;
// `bas(a)` : le bas du drapé à l'angle a, en fraction de la hauteur du profil (un ourlet en biais) ; null : le profil
// entier. Rend une géométrie indexée, normales calculées.
function drape(prof, a0, a1, bas) {
  const NS = Math.max(8, Math.round(((a1 - a0) / (Math.PI * 2)) * 40)), NR = 16, pos = [], uv = [], idx = [];
  const y0 = prof[0][1], y1 = prof[prof.length - 1][1];
  const rDe = (y) => {
    for (let i = 1; i < prof.length; i++) if (y <= prof[i][1]) { const [ra, ya] = prof[i - 1], [rb, yb] = prof[i]; return ra + ((rb - ra) * (y - ya)) / ((yb - ya) || 1); }
    return prof[prof.length - 1][0];
  };
  for (let j = 0; j <= NR; j++) {
    for (let i = 0; i <= NS; i++) {
      const a = a0 + ((a1 - a0) * i) / NS, yb = bas ? y0 + (y1 - y0) * bas(a) : y0, y = yb + ((y1 - yb) * j) / NR;
      const plis = 0.08 * Math.pow(Math.max(0, 1 - y / 1.1), 1.2), hanche = 0.03 * Math.sin(Math.min(1, y / 1.1) * Math.PI);
      const k = 1 + plis * (0.5 + 0.5 * Math.sin(9 * a + 1.3 * Math.sin(3 * a) + y * 2)) - plis * 0.4, r = rDe(y) * k;
      pos.push(r * Math.cos(a) * 0.7, y, r * Math.sin(a) + hanche);
      uv.push(i / NS, y);
    }
  }
  for (let j = 0; j < NR; j++) for (let i = 0; i < NS; i++) {
    const p = j * (NS + 1) + i, q = p + 1, s = p + NS + 1, t = s + 1;
    idx.push(p, s, q, q, s, t);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// LE MÂT : socle de pierre, fût blanc effilé de `h` m, bagues, pomme dorée ; la drisse le long du fût et son taquet.
function mat_(kit, lot, x, z, y0, h) {
  lot.boite('taille', 0.62, 0.3, 0.62, new THREE.Matrix4().makeTranslation(x, y0 + 0.1, z), { chanfrein: 0.02, couleur: [0.96, 0.94, 0.9] });
  const blanc = [0.84, 0.84, 0.82], M = (y) => new THREE.Matrix4().makeTranslation(x, y, z);
  lot.tour('peinture', [[0.11, 0], [0.11, 0.06], [0.085, 0.1], [0.075, 0.2], [0.07, h * 0.5], [0.05, h - 0.1], [0.045, h]], 12, M(y0 + 0.25), { bande: true, couleur: blanc });
  for (const f of [0.03, 0.5]) lot.tour('peinture', [[0.09, -0.02], [0.095, 0], [0.095, 0.03], [0.08, 0.05]], 12, M(y0 + 0.25 + h * f), { bande: true, couleur: blanc });
  lot.tour('peinture', [[0.03, 0], [0.06, 0.02], [0.08, 0.08], [0.07, 0.14], [0.035, 0.18], [0.001, 0.2]], 12, M(y0 + 0.25 + h), { bande: true, couleur: [0.62, 0.45, 0.14] });
  // la drisse (du haut du mât au taquet, à 1,3 m) et le taquet
  lot.barre([x + 0.075, y0 + 0.25 + h - 0.05, z], [x + 0.08, y0 + 1.35, z], 0.008, 0.008, { couleur: [0.75, 0.74, 0.7] });
  lot.boite('peinture', 0.03, 0.14, 0.03, new THREE.Matrix4().makeTranslation(x + 0.085, y0 + 1.3, z), { bande: true, couleur: [0.2, 0.2, 0.2] });
}

// LE DRAPEAU TRICOLORE qui flotte : une étamine de 1,5 x 1 m (bleu au mât), 15 x 10 sommets déplacés à chaque image
// par une onde qui court du mât vers le battant (amplitude croissante, deux harmoniques, affaissement du battant), le
// vent tournant lentement de ±15°. Sur le processeur (150 sommets, moins de 0,05 ms) : l'ombre du drapeau suit.
// Mis à jour seulement quand il est dessiné (onBeforeRender), une fois par image. `dynamique` et `nofuse` : ni fondu
// avec le décor, ni cuit dans les ombres fixes.
let _matDrapeau = null;
function materiauDrapeau() {
  if (_matDrapeau) return _matDrapeau;
  const c = document.createElement('canvas'); c.width = 192; c.height = 128;
  const g = c.getContext('2d');
  const bandes = ['#1d3f95', '#f4f3ee', '#d63b35'];
  for (let i = 0; i < 3; i++) { g.fillStyle = bandes[i]; g.fillRect(i * 64, 0, 64, 128); }
  // le grain de l'étamine et la gaine de la hampe (bord du mât)
  for (let y = 0; y < 128; y += 2) { g.fillStyle = 'rgba(0,0,0,0.035)'; g.fillRect(0, y, 192, 1); }
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, 0, 5, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  _matDrapeau = new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.82, metalness: 0 });
  _matDrapeau.name = 'Z06 · étamine du drapeau';
  return _matDrapeau;
}
function drapeauFlottant(ctx, x, z, yHaut) {
  const NU = 15, NV = 10, L = 1.5, H = 1.0;
  const g = new THREE.PlaneGeometry(L, H, NU - 1, NV - 1);
  // (le plan : x de -L/2 à L/2, y de -H/2 à H/2 : on le recale, bord du mât en x = 0, haut en y = 0)
  const P = g.attributes.position, base = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) { base[i * 2] = (P.getX(i) + L / 2) / L; base[i * 2 + 1] = (P.getY(i) + H / 2) / H; }
  const m = new THREE.Mesh(g, materiauDrapeau());
  m.name = 'drapeau tricolore'; m.castShadow = true; m.receiveShadow = false;
  m.position.set(x + 0.07 + ctx.Monde.dx, yHaut, z);
  m.userData.dynamique = true; m.userData.nofuse = true;
  // (la sphère englobante couvre toutes les directions du vent : elle n'est jamais recalculée)
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -0.5, 0), 1.75);
  let tPrec = -1;
  const poser = (t) => {
    // le vent vient du sud-ouest et tourne lentement : le drapeau flotte vers z- (nord-est), un peu vers x+
    const cap = -1.9 + 0.26 * Math.sin(t * 0.21) + 0.08 * Math.sin(t * 0.83);
    const cx = Math.cos(cap), cz = Math.sin(cap);
    const force = 0.75 + 0.25 * Math.sin(t * 0.37 + 1.1);            // rafales lentes
    for (let i = 0; i < P.count; i++) {
      const u = base[i * 2], v = base[i * 2 + 1];
      const onde = Math.sin(u * 6.8 - t * 5.2 + v * 0.6) * (0.03 + 0.16 * u) * force
        + Math.sin(u * 13.1 - t * 8.3 + 1.7) * 0.025 * u;
      const long = u * L * (1 - 0.05 * (1 - force)) , chute = (1 - force) * 0.35 * u * u + 0.04 * u;
      // le long de la direction du vent, l'onde en travers
      P.setXYZ(i, cx * long - cz * onde, (v - 1) * H - chute - 0.04 * Math.sin(u * 4 - t * 3) * u, cz * long + cx * onde);
    }
    P.needsUpdate = true;
    g.computeVertexNormals();
  };
  poser(0);
  m.onBeforeRender = () => {
    const t = performance.now() / 1000;
    if (t === tPrec) return;
    tPrec = t; poser(t);
  };
  // (l'ombre : la passe d'ombre ne passe pas par onBeforeRender ; la géométrie de l'image précédente lui suffit)
  const grp = new THREE.Group(); grp.name = 'drapeau'; grp.userData.dynamique = true; grp.userData.nofuse = true;
  grp.add(m);
  return grp;
}

// ============================================================================================ silhouettes (loin)
// Versions lointaines (conception, § 3.5 : moins de 2 000 triangles et 1 à 3 appels chacune), pour le lot A5 : le
// volume du mur et des volées, le terre-plein et la haie, le belvédère, la statue, le mât et un drapeau immobile.
function* silhouetteMur(ctx) {
  const { kit } = ctx, lot = new kit.Lot('silhouette du mur des caves');
  const B = (cle, x0, y0, z0, x1, y1, z1, c = [1, 1, 1]) => lot.boite(cle, x1 - x0, y1 - y0, z1 - z0, new THREE.Matrix4().makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), { couleur: c });
  B('moellons', NU.retrait - FACE.ep, -1, 25, NU.retrait, 5.9, 45);
  B('moellons', NU.bloc - EP_RETOUR, -1, ZBLOC_N, NU.bloc, 5.95, 25); B('moellons', NU.bloc - EP_RETOUR, -1, 45, NU.bloc, 5.95, ZBLOC_S);
  B('moellons', MUR_TALUS.x - MUR_TALUS.ep, 5.5, MUR_TALUS.z0, MUR_TALUS.x, MUR_TALUS.yHaut + MUR_TALUS.chaperon, MUR_TALUS.z1);
  // les volées : deux prismes de pierre qui montent vers les blocs d'angle
  for (const v of [V28N, V28S]) {
    const za = Math.min(v.a[1], v.de[1]), zb = Math.max(v.a[1], v.de[1]), pts = [];
    for (const zz of [za, zb]) pts.push([-39.95, planVolee(v, zz) + 0.1, zz]);
    lot.prisme('taille', [[-0.75, -3], [0.75, -3], [0.75, 0], [-0.75, 0]], pts, { vertical: true });
  }
  B('taille', NU.retrait, -1, PERRON.z0, PERRON.ligne[0][0] + AVANCE_BAIES / 2, PERRON.y + 0.02, PERRON.z1);
  ctx.groupe.add(lot.maillages('silhouette du mur des caves'));
}
function* silhouetteBelvedere(ctx) {
  const { kit } = ctx, lot = new kit.Lot('silhouette du belvédère');
  // (la haie en « peinture » vert sombre, pas en feuillage : un matériau de moins, trois appels en tout avec le drapeau)
  lot.boite('peinture', 1.5, 2.0, 28, new THREE.Matrix4().makeTranslation(HAIE_TALUS.x, 9.5, 35.35), { bande: true, couleur: kit.lin('#2e3b28') });
  lot.boite('peinture', 0.05, 1.0, 28.5, new THREE.Matrix4().makeTranslation(GARDE_B.x, BELVEDERE.y + 0.9, 35.35), { bande: true, couleur: kit.TEINTES.fer });
  lot.boite('taille', 0.42, 0.5, 28.5, new THREE.Matrix4().makeTranslation(GARDE_B.x, BELVEDERE.y + 0.1, 35.35), { couleur: [0.95, 0.93, 0.9] });
  lot.boite('peinture', 0.5, 3.4, 0.5, new THREE.Matrix4().makeTranslation(STATUE.x, BELVEDERE.y + 1.7, STATUE.z), { bande: true, couleur: [0.86, 0.855, 0.83] });
  lot.tour('peinture', [[0.08, 0], [0.05, MAT.h]], 6, new THREE.Matrix4().makeTranslation(MAT.x, BELVEDERE.y, MAT.z), { bande: true, couleur: [0.84, 0.84, 0.82] });
  ctx.groupe.add(lot.maillages('silhouette du belvédère'));
  // le drapeau, immobile au loin (le même matériau que le vrai)
  const d = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0).translate(0.75, -0.5, 0).rotateY(1.9), materiauDrapeau());
  d.position.set(MAT.x + 0.07 + ctx.Monde.dx, BELVEDERE.y + MAT.h - 0.12, MAT.z); d.name = 'drapeau (silhouette)';
  ctx.groupe.add(d);
}

// ============================================================================================ la zone
// Des segments de rampe découpés tous les `pas` m : la hauteur d'un obstacle se mesure depuis le sol au milieu de
// chaque morceau (js/monde_collisions.js), une rampe de volée doit donc la suivre par tronçons.
function rampe(o, x0, z0, x1, z1, opt, pas = 2) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / pas));
  for (let i = 0; i < n; i++) {
    const a = i / n, b = (i + 1) / n;
    o.segment(x0 + (x1 - x0) * a, z0 + (z1 - z0) * a, x0 + (x1 - x0) * b, z0 + (z1 - z0) * b, opt);
  }
}
// les deux rampes d'une volée (côtés gauche et droit, à `d` m de l'axe)
function rampesVolee(o, v, d, opt) {
  const [x0, z0] = v.de, [x1, z1] = v.a, L = Math.hypot(x1 - x0, z1 - z0), rx = -(z1 - z0) / L, rz = (x1 - x0) / L;
  for (const s of [-1, 1]) rampe(o, x0 + rx * d * s, z0 + rz * d * s, x1 + rx * d * s, z1 + rz * d * s, opt);
}

export default {
  id: 'Z06',
  nom: 'Axe du château',
  emprise: [[-62, 10], [-33, 10], [-33, 59], [-62, 59]],
  morceaux: [
    { id: 'Z06a', nom: 'mur des caves, perron et volées en V', boite: [-42.0, 10.0, -33.0, 59.0], construire: murDesCaves, silhouette: silhouetteMur },
    { id: 'Z06b', nom: 'fers des caves, côté nord (balustrades, rampe, candélabres)', boite: [-42.5, 10.0, -38.5, 36.5], construire: fersDesCaves(true) },
    { id: 'Z06c', nom: 'fers des caves, côté sud', boite: [-42.5, 35.5, -38.5, 59.0], construire: fersDesCaves(false) },
    { id: 'Z06d', nom: 'terre-plein, talus fleuri et volées de 31', boite: [-52.5, 18.0, -39.0, 53.0], construire: terrePlein },
    { id: 'Z06e', nom: 'belvédère, statue et drapeau', boite: [-62.5, 18.0, -51.5, 53.0], construire: belvedere, silhouette: silhouetteBelvedere },
  ],
  // PUR (sans three) : appelé à l'installation, pour tous les joueurs, que la zone soit construite ou non. Les murs et
  // les marches sont des frontières de nappes, la balustrade du belvédère et celle du haut du mur sont dans monde.json
  // (gabarits) ; restent le mobilier et les rampes, sur lesquels la balle rebondit.
  obstacles(o) {
    const dur = (h) => ({ h, type: 'dur' });
    o.cercle(STATUE.x, STATUE.z, 0.62, dur(3.5));
    o.cercle(MAT.x, MAT.z, 0.32, dur(MAT.h));
    for (const c of [...CANDELABRES, ...LANTERNES]) o.cercle(c.x, c.z, 0.2, dur(3.6));
    for (const v of [...VASES_PERRON, ...VASES_BELV]) o.cercle(v.x, v.z, 0.3, dur(1.3));
    for (const j of JARDINIERES) o.boite((j.x0 + j.x1) / 2, j.z, (j.x1 - j.x0) / 2 + 0.03, 0.3, 0, dur(0.6));
    // les murs percés, avancés de AVANCE_BAIES devant la frontière des nappes (voir NU) : la face en retrait (derrière
    // les volées en V et la porte), les blocs d'angle et les écoinçons ; le pied du joueur et la balle s'arrêtent à
    // leur nu, pas 30 cm dedans (h : du sol au milieu de la boîte, la terrasse ou le perron, au-dessus du couronnement)
    const xR = NU.retrait - AVANCE_BAIES / 2, xB = NU.bloc - AVANCE_BAIES / 2;
    o.boite(xR, (FACE.z0 + FACE.z1) / 2, AVANCE_BAIES / 2, (FACE.z1 - FACE.z0) / 2, 0, dur(7.5));
    o.boite(xB, (ZBLOC_N + V28N.de[1]) / 2, AVANCE_BAIES / 2, (V28N.de[1] - ZBLOC_N) / 2, 0, dur(7.5));
    o.boite(xB, (V28S.de[1] + ZBLOC_S) / 2, AVANCE_BAIES / 2, (ZBLOC_S - V28S.de[1]) / 2, 0, dur(7.5));
    // (et le devant du perron, percé de sa porte basse : frontière à x -36,75, nu à -36,45)
    o.boite(PERRON.ligne[0][0], (PERRON.z0 + PERRON.z1) / 2, AVANCE_BAIES / 2, (PERRON.z1 - PERRON.z0) / 2, 0, dur(2.6));
    // les rampes des volées en V (sur le couronnement des écoinçons, 0,3 m de large) : on ne marche pas sur le bord
    rampe(o, NU.bloc - EP_E / 2, V28N.a[1], NU.bloc - EP_E / 2, V28N.de[1], { e: EP_E, h: 1.1, type: 'dur' });
    rampe(o, NU.bloc - EP_E / 2, V28S.de[1], NU.bloc - EP_E / 2, V28S.a[1], { e: EP_E, h: 1.1, type: 'dur' });
    // les rampes des volées de 31 et des deux petites volées
    for (const v of [V31N, V31S]) rampesVolee(o, v, v.largeur / 2 + 0.1, { e: 0.2, h: 1.0, type: 'dur' });
    for (const v of [V14, V19]) rampesVolee(o, v, v.largeur / 2 + 0.1, { e: 0.2, h: 1.0, type: 'dur' });
    // les ifs en coin et la haie du talus (la balle s'y étouffe ; les pieds, eux, butent déjà sur le massif)
    for (const f of IFS) o.boite((IF_X.x0 + IF_X.x1) / 2, (f.zP + f.zF) / 2, (IF_X.x1 - IF_X.x0) / 2, Math.abs(f.zP - f.zF) / 2, 0, { h: 2.5, type: 'haie' });
    o.segment(HAIE_TALUS.x, HAIE_TALUS.z0, HAIE_TALUS.x, HAIE_TALUS.z1, { e: HAIE_TALUS.ep, h: HAIE_TALUS.h, type: 'haie' });
    // le mur du talus, au fond du terre-plein (on bute sur son nu, la balle y rebondit)
    const MT = MUR_TALUS;
    o.boite(MT.x - MT.ep / 2, (MT.z0 + MT.z1) / 2, MT.ep / 2, (MT.z1 - MT.z0) / 2, 0, dur(2.3));
    // les bancs du belvédère
    for (const b of BANCS) o.boite(b.x, b.z, 0.35, 0.98, 0, { h: 0.9, type: 'dur' });
  },
  bancs(b) {
    for (const x of BANCS) b.push({ x: x.x + 0.1, z: x.z, cap: x.cap, y: 0.45, source: 'Z06' });
  },
  lieux: [],
};
