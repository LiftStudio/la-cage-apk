// =====================================================================
//  LE GRAND PLATANE DE LA HAIE, À LA CAGE (photo de Haythem du 17/09/2026, 19 h 13 :
//  tools/photos_reference/platane_double_2026-09-17/20260917_191338.jpg ; la vue du jeu d'avant : jeu_avant.webp)
//
//  Avant (lot L12, js/platanes_detailles.js) : deux fûts qui s'écartaient en V dès 1 m (le jour passait entre eux),
//  couverts de grosses taches de léopard, plantés dans un rond de terre ; la couronne basse et claire. La photo, prise
//  depuis le terrain à une dizaine de mètres (vers -3,8 ; -4,8, côté du rond central, en regardant le long de la haie),
//  montre autre chose. Mesures prises à l'échelle des panneaux du grillage (2 m) : 80 px par mètre au pied de l'arbre.
//   - UN FÛT MASSIF : deux tiges SOUDÉES, 0,78 m de large à 1 m (la tige côté terrain, à gauche sur la photo, est la
//     plus mince : un petit tiers de la largeur), évasé au pied en trompette, surtout du côté d'une grosse racine (1,2
//     fois la largeur à 1 m au ras du bitume) ;
//   - entre les deux, une FENTE NOIRE : un pli vers 1 m, un trait de 1,4 à 1,8 m, puis une vraie crevasse aux bords nets
//     (les deux tiges rondes et éclairées de part et d'autre du vide), large de 19 cm vers 3 m, qui se resserre, se
//     rouvre vers 4 m et finit en fêlure dans les bourrelets de la fourche ;
//   - la FOURCHE vers 5 m, noueuse, d'où partent CINQ grosses charpentières qui montent raides (5 à 30° de la
//     verticale) et s'écartent en éventail ;
//   - une COURONNE HAUTE (les premières feuilles vers 5,5-6 m), LARGE (7 à 8 m de rayon : elle couvre le bord du
//     terrain) et DENSE ; l'arbre dépasse 18 m ;
//   - l'ÉCORCE : un gris-beige chaud (teinte 36°, pas l'olive), de grandes taches crème aux bords doux là où les
//     plaques sont tombées, des zones gris-olive plus sombres, des plaques gris-brun aux bords en puzzle ; plus grise et
//     plus sombre au pied et le long de la fente ;
//   - le BITUME VA JUSQU'AU TRONC (pas de rond de terre), une touffe d'herbe au pied, côté poubelle.
//
//  Ce qui est fait ici :
//   - le FÛT est un maillage sur mesure : à chaque hauteur, sa section est un contour qui fait le tour des deux tiges
//     (deux disques plus ou moins chevauchants) et plonge entre elles dans la fente devant (deux parois, un fond) et dans
//     un sillon derrière, avec l'évasement et les racines du pied, qui plongent sous le bitume ; il penche un peu vers le
//     terrain et ondule. Le fond de la fente est noirci dans les couleurs de sommets (une occlusion cuite) : il reste
//     noir sans occlusion ambiante (téléphone, basse) ;
//   - les CINQ CHARPENTIÈRES naissent cachées dans le haut des deux tiges et en sortent en biais à travers le dôme bas
//     de la fourche et ses bourrelets (écorce en phase avec celle du fût), puis se ramifient (branches, rameaux) ; tout
//     le bois est cousu en UN maillage ;
//   - l'ÉCORCE est dessinée ici (ecorceHaie : toile de 1 024 px, 512 au téléphone, une tuile pour 1,1 m) : couleur,
//     relief (carte de normales tirée du même dessin) et rugosité ;
//   - les FEUILLES sont les cartes du rameau de platane photographié, avec le MÊME matériau que les autres platanes
//     (vent en espace monde, translucidité, désaturation, mipmaps refaites) et la même ombre découpée et ventée ;
//   - au pied, la touffe d'herbe (piedPlataneHaie) ; le bas du fût est plus gris (couleurs de sommets), et les ombres
//     de contact du sol (js/ombres_contact.js) font le reste ;
//   - la collision (balle et joueurs, js/court.js reperes.obstacles) suit le nouveau fût : PLATANE_HAIE.
//  Téléphone : moins de côtés, des cartes moins nombreuses mais plus grandes, pas de tubes pour les rameaux (leurs
//  feuilles restent à leur place), écorce en 512. Option « Décor détaillé » décochée : le clone de tree2 revient à sa
//  place, comme pour les platanes détaillés.
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OPTIONS_RENDU, surOptions } from './options_rendu.js';
import { TELEPHONE } from './appareil.js';
import { carte, devier, hasard } from './platanes_detailles.js';

const LEGER = TELEPHONE;   // js/appareil.js : la même détection pour tout le jeu (et `?tel=1`)

// La place et les mesures de l'arbre (lues aussi par js/court.js : la collision, le pied)
export const PLATANE_HAIE = {
  x: -8.95, z: 4.25,       // le pied, à 65 cm du grillage de la haie (comme avant)
  h: 19,                   // le haut de la couronne
  envergure: 7.5,          // demi-envergure de la couronne
  // la collision : un disque de 38 cm (le fût fait 0,75 x 0,5 m à hauteur d'homme), centré sur le fût à 1 m (cx, cz,
  // posés plus bas : il penche vers le terrain), jusqu'à la fourche : au-dessus, la balle passe dans les branches
  rayon: 0.38, plafond: 5.0,
  // L'AXE DES DEUX TIGES (de la tige côté grillage vers celle côté terrain), dans le plan du sol, à 27° de +x : sur la
  // photo (le photographe regarde en biais le long de la haie, vers +z), les deux tiges sont côte à côte, la fente un
  // peu à gauche du milieu. Elle regarde vers (0,87 ; -0,5) à mi-hauteur : on la voit aussi depuis la ligne de touche.
  axe: Math.atan2(0.458, 0.885),
};
// la penche du fût (par mètre de hauteur) : vers le terrain, un rien vers le photographe
const PENCHE = [0.032, -0.008];

// ---------------------------------------------------------------------
//  LE FÛT : deux tiges soudées, la fente entre elles, les contreforts du pied
// ---------------------------------------------------------------------
// Profil, de bas en haut : [y, rayon de la tige côté terrain, rayon de la tige côté grillage, écart de leurs centres].
// Largeur totale = somme des trois (plus les bombements) : 0,77 m à 1 m, 0,75 vers 1,8 m, 0,8 vers 3 m (la photo : le
// fût s'élargit en fuseau autour de la fente), 0,93 à la fourche. La tige côté terrain est la plus mince : sur la photo, vers 3 m, elle fait 30 % de la
// largeur, la fente un quart, l'autre tige le reste. Entre 2 et 4 m, les deux disques se touchent à peine.
const PROFIL = [
  [-0.15, 0.25, 0.32, 0.20],
  [0.0, 0.25, 0.32, 0.20],
  [0.5, 0.232, 0.302, 0.23],
  [1.0, 0.215, 0.29, 0.26],
  [1.8, 0.17, 0.26, 0.29],
  [2.6, 0.165, 0.255, 0.35],
  [3.4, 0.17, 0.26, 0.375],
  [4.2, 0.185, 0.275, 0.39],
  [4.8, 0.2, 0.285, 0.41],
  [5.4, 0.21, 0.295, 0.43],
];
// LA FENTE, relevée sur la photo (80 px par mètre au pied) : [y, ouverture devant (m), profondeur sous la jonction des
// deux tiges (m)]. Un pli à peine marqué vers 1 m, un trait noir de 1,4 à 1,8 m, puis une vraie crevasse aux bords nets
// (les deux tiges arrondies, éclairées, de part et d'autre d'un vide noir) : la plus ouverte vers 3 m (19 cm), resserrée
// vers 3,6 m, rouverte vers 4,1 m ; au-dessus de 4,5 m, une simple fêlure dans les bourrelets de la fourche (c'est là
// que naissent les charpentières, cachées dans le fût : grande ouverte, la fente les laissait voir) ; elle serpente un
// peu. (Avant : un sillon en cloche de 0,5 rad assombri en dégradé, qui
// sortait comme une traînée floue de 10 à 15 cm sur la tige côté terrain.)
const FENTE = [[0.6, 0.004, 0], [1.0, 0.012, 0.02], [1.4, 0.02, 0.04], [1.8, 0.045, 0.08], [2.1, 0.09, 0.1], [2.5, 0.14, 0.12],
  [2.9, 0.19, 0.13], [3.3, 0.15, 0.13], [3.6, 0.08, 0.11], [3.9, 0.1, 0.12], [4.15, 0.13, 0.11], [4.45, 0.03, 0.03],
  [4.8, 0.012, 0.012], [5.05, 0.005, 0]];
// les deux tiges ne sont pas droites (photo) : celle du côté terrain se bombe vers l'extérieur vers 2 m, celle du côté
// grillage ondule en S. Décalage de leur centre, en mètres, vers l'extérieur.
const bombeL = (y) => 0.02 * Math.sin(Math.PI * Math.min(1, Math.max(0, (y - 0.8) / 2.8)));
const bombeR = (y) => 0.012 * Math.sin(2 * Math.PI * Math.min(1, Math.max(0, (y - 1.0) / 3.6)));
// LA FOURCHE vers 5 m (photo : les charpentières se séparent entre 4,9 et 5,5 m) : le haut du fût se referme en un
// dôme bas, presque conique (bombé en sphère, il faisait un ballon lisse entre les charpentières), d'où elles sortent
const Y_FOURCHE = 5.4, Y_DOME = 5.0;
// la hauteur où partent les charpentières (au cœur de leur tige ; elles naissent 25 cm plus bas, cachées dans le fût)
const Y_DEPART = 4.75;
// les anneaux du fût (serrés au pied, pour les contreforts, et dans le dôme)
const ANNEAUX = [-0.08, 0, 0.02, 0.05, 0.09, 0.14, 0.2, 0.28, 0.38, 0.5, 0.65, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.25,
  2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 4.75, Y_DOME, 5.12, 5.24, 5.33, Y_FOURCHE];
// les points du contour : sur le tour de la tige côté terrain, de celle côté grillage, dans la fente devant et dans le
// sillon derrière (le premier point est recopié au bout : la couture des UV, au dos de la tige côté grillage)
const N_L = LEGER ? 12 : 24, N_R = LEGER ? 16 : 34, N_F = 5, N_B = LEGER ? 3 : 5;
// les contreforts des racines : [angle autour du fût (rad, depuis l'axe des tiges), force]. Photo : UNE racine franche
// au pied, vers le terrain et le coin du fond (à gauche du pied sur la photo), deux à peine marquées (côté poubelle,
// et derrière, vers la haie). Étroites (0,18 rad).
const RACINES = [[-0.2, 1.0], [2.35, 0.55], [4.25, 0.4]];
const LARGE_RACINE = LEGER ? 0.26 : 0.18;      // (au téléphone, moins de côtés : plus large, sinon elle tombe entre deux)
const COTE_EVASE = -0.15;                       // le côté où le pied s'évase le plus (celui de la grosse racine)
// LES BOURRELETS DE LA FOURCHE (photo : la jonction est noueuse, un gros nœud en haut à droite de la tige côté
// grillage) : [angle, y, saillie, largeur en angle, hauteur]
const BOSSES = [[2.3, 5.0, 0.14, 0.4, 0.28], [0.5, 4.55, 0.05, 0.35, 0.22], [-1.9, 4.85, 0.1, 0.45, 0.3], [3.6, 4.45, 0.07, 0.4, 0.3]];
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ecartAngle = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
// interpolation dans une table [y, a, b, ...] (au-delà des bouts : la première ou la dernière ligne)
function table(T, y) {
  let i = 0;
  while (i < T.length - 2 && y > T[i + 1][0]) i++;
  const a = T[i], b = T[i + 1], f = Math.min(1, Math.max(0, (y - a[0]) / (b[0] - a[0])));
  return a.slice(1).map((v, k) => v + (b[k + 1] - v) * f);
}
// l'ombre cuite de la fourche (le creux entre les charpentières, sous la couronne) : la même sur le fût et sur le
// départ des charpentières, à la même hauteur — sinon une bague plus sombre marquait la couture
const teinteFourche = (y) => 1 - 0.14 * lisse(4.4, 5.3, y) * (1 - lisse(6.2, 7.5, y));

// le centre du fût à la hauteur y : la penche, et une ondulation lente (la photo : la tige côté terrain se bombe vers 2 m)
function centreFut(y, out) {
  const Y = Math.max(0, y);
  out.set(PLATANE_HAIE.x + PENCHE[0] * Y + 0.03 * Math.sin(0.9 * Y), y, PLATANE_HAIE.z + PENCHE[1] * Y + 0.025 * Math.sin(0.7 * Y + 1));
  return out;
}
// le centre du disque de collision (js/court.js) : celui du fût à 1 m de haut
{ const c = centreFut(1, new THREE.Vector3()); PLATANE_HAIE.cx = c.x; PLATANE_HAIE.cz = c.z; }

// LA SECTION à la hauteur y : un contour fermé de N_L + N_R + N_F + N_B points (u, w), dans le repère des tiges (u : de
// la tige côté grillage vers celle côté terrain, w : vers l'avant de la fente), centré au milieu de la largeur. Il suit
// le tour de chaque tige (un disque), et entre elles plonge dans la fente devant (deux parois, un fond) et dans le
// sillon derrière : la crevasse a des bords nets, et les deux tiges restent rondes et éclairées jusqu'à ses lèvres.
// Pour chaque point : `phi`, son angle depuis le centre (le long de la fente : interpolé d'une lèvre à l'autre ; il
// donne la coordonnée u de l'écorce et place racines et bosses), `noir` (0 sur l'écorce, 1 au fond de la crevasse) et
// `levre` (la proximité d'une lèvre : l'écorce y est plus grise et plus terne).
function section(y) {
  const [rL, rR, d0] = table(PROFIL, y), [W, P] = table(FENTE, y);
  let dL = (d0 + rR - rL) / 2 + bombeL(y), dR = (d0 - rR + rL) / 2 + bombeR(y);
  // toujours un peu chevauchantes : l'âme du fût, derrière la fente
  const dMax = 0.97 * (rL + rR);
  if (dL + dR > dMax) { const k = dMax / (dL + dR); dL *= k; dR *= k; }
  const d = dL + dR;
  // la jonction des deux disques (leur corde commune) : u = uJ, w = ±hx
  const a = (d * d + rL * rL - rR * rR) / (2 * d), hx = Math.sqrt(Math.max(1e-6, rL * rL - a * a));
  const uJ = dL - a + Math.min(1, W / 0.05) * 0.012 * Math.sin(2.1 * y + 0.5);     // (la fente serpente)
  // fente devant : ouverture W, fond à hx - P ; sillon derrière : étroit et peu profond ; une âme de 4 cm entre les deux
  const Wb = 0.01 + 0.3 * W, Pb = 0.02 + 0.15 * P, wB = -hx + Pb, wF = Math.max(hx - P, wB + 0.04);
  // les quatre lèvres, sur leur disque (θ : angle autour du centre de son disque)
  const levreL = (du, av) => { const u = uJ + du, w = av * Math.sqrt(Math.max(0, rL * rL - (u - dL) ** 2)); return [u, w, Math.atan2(w, u - dL)]; };
  const levreR = (du, av) => { const u = uJ + du, w = av * Math.sqrt(Math.max(0, rR * rR - (u + dR) ** 2)); return [u, w, Math.atan2(w, u + dR)]; };
  const LF = levreL(W / 2, 1), RF = levreR(-W / 2, 1), LB = levreL(Wb / 2, -1), RB = levreR(-Wb / 2, -1);
  const pts = [], noirs = [], levres = [];
  const pt = (u, w, noir = 0, levre = 0) => { pts.push([u, w]); noirs.push(noir); levres.push(levre); };
  // la proximité d'une lèvre, sur le tour d'un disque (12 cm), pondérée par la profondeur de la fente
  const fort = Math.min(1, P / 0.09);
  const pres = (ecart, r, k) => k * Math.exp(-((ecart * r / 0.12) ** 2));
  // un arc d'un disque (centre cu, rayon r) de θ0 à θ1, n points (le dernier exclu si `sansFin`)
  const arc = (cu, r, t0, t1, n, sansFin, lev) => {
    const m = sansFin ? n : n - 1;
    for (let i = 0; i < n; i++) { const t = t0 + (t1 - t0) * i / m; pt(cu + r * Math.cos(t), r * Math.sin(t), 0, lev(t)); }
  };
  // le creux entre deux lèvres A et B (fond en wf, ouverture W) : parois et fond, n points, de A vers B. Profils :
  // [part de l'ouverture vers A (+) ou B (-), part de la profondeur]
  const creux = (A, B, wf, ouv, n, noir) => {
    const prof = n === 5 ? [[0.9, 0.35], [0.45, 0.92], [0, 1], [-0.45, 0.92], [-0.9, 0.35]] : [[0.7, 0.5], [0, 1], [-0.7, 0.5]];
    const sens = Math.sign(A[0] - B[0]) || 1;
    for (const [lat, dep] of prof) {
      const w0 = lat > 0 ? A[1] : lat < 0 ? B[1] : (A[1] + B[1]) / 2;
      pt(uJ + sens * lat * ouv / 2, w0 + (wf - w0) * dep, noir, fort);
    }
  };
  // 1. le dos de la tige côté grillage, de -u (la couture) vers sa lèvre arrière
  const nR1 = Math.round(N_R / 2), nR2 = N_R - nR1;
  arc(-dR, rR, -Math.PI, RB[2], nR1, false, (t) => pres(t - RB[2], rR, 0.5 * fort));
  // 2. le sillon de derrière
  creux(RB, LB, wB, Wb, N_B, 0.6 * fort);
  // 3. le tour de la tige côté terrain, de sa lèvre arrière à sa lèvre avant (par +u)
  arc(dL, rL, LB[2], LF[2], N_L, false, (t) => Math.max(pres(t - LB[2], rL, 0.5 * fort), pres(LF[2] - t, rL, fort)));
  // 4. la fente devant
  creux(LF, RF, wF, W, N_F, Math.min(1, P / 0.06));
  // 5. l'avant de la tige côté grillage, de sa lèvre avant à -u (la couture, exclue : c'est le premier point)
  arc(-dR, rR, RF[2], Math.PI, nR2, true, (t) => pres(t - RF[2], rR, fort));
  // les angles depuis le centre : ceux du contour sur les disques, interpolés le long des creux (à la longueur)
  const n = pts.length, phi = new Float32Array(n);
  for (let i = 0; i < n; i++) phi[i] = Math.atan2(pts[i][1], pts[i][0]);
  phi[0] = -Math.PI;
  const debutF = nR1 + N_B + N_L, debutB = nR1;     // premiers points des creux (fente devant, sillon derrière)
  for (const [i0, m] of [[debutB, N_B], [debutF, N_F]]) {
    const A = i0 - 1, B = i0 + m, lg = [0];
    for (let i = i0; i <= B; i++) lg.push(lg[lg.length - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tot = lg[lg.length - 1] || 1;
    for (let k = 0; k < m; k++) phi[i0 + k] = phi[A] + (phi[B] - phi[A]) * lg[k + 1] / tot;
  }
  // au pied, l'échancrure des deux disques se comble (le collet est d'un seul tenant)
  const comble = y < 1.4 ? (1 - lisse(0.3, 1.4, y)) * 0.85 : 0, rMoy = (rL + rR + d) / 2;
  // l'évasement du collet, et les contreforts : MODESTES (photo : 1,2 fois la largeur à 1 m au ras du bitume, une racine
  // d'un côté ; la jupe d'avant allait jusqu'à 1,9 fois). Le collet s'évase sur ses 40 derniers centimètres, en
  // trompette, deux fois plus du côté du terrain et du coin (à gauche du pied sur la photo) ; les racines y font des
  // arêtes. Sous le bitume, ils continuent de s'élargir : le pied y
  // plonge, sans lèvre au ras du sol.
  const Y = Math.max(0, y), collet = Math.exp(-Y / 0.38), arete = Math.exp(-Y / 0.4), plonge = Math.exp(-Y / 0.18);
  const dome = y > Y_DOME ? 1 - 0.5 * ((y - Y_DOME) / (Y_FOURCHE - Y_DOME)) ** 1.5 : 1;
  for (let i = 0; i < n; i++) {
    const f = phi[i], p = pts[i];
    let r = Math.hypot(p[0], p[1]) || 1e-4, k = 1;
    if (comble) k = (r + (Math.max(r, rMoy * 0.92) - r) * comble) / r;
    let rac = 0;
    for (const [ang, force] of RACINES) rac = Math.max(rac, force * Math.exp(-((ecartAngle(f, ang) / LARGE_RACINE) ** 2)));
    k *= 1 + collet * (0.1 + 0.12 * Math.exp(-((ecartAngle(f, COTE_EVASE) / 0.8) ** 2))) + rac * (0.12 * arete + 0.05 * plonge);
    // les bosses et les bourrelets d'un vieux fût
    k *= 1 + 0.022 * Math.sin(3 * f + 1.7 * y) + 0.016 * Math.sin(5 * f - 2.3 * y + 1) + 0.01 * Math.sin(9 * f + 4 * y);
    // les bourrelets noueux de la fourche, où sortent les charpentières
    if (y > 4.0) for (const [ang, yb, s, la, ha] of BOSSES) k *= 1 + s * Math.exp(-((ecartAngle(f, ang) / la) ** 2) - ((y - yb) / ha) ** 2);
    k *= dome;
    p[0] *= k; p[1] *= k;
  }
  return { pts, phi, noirs, levres };
}

// La tuile d'écorce couvre TUILE m de tour et de haut (les plaques de la photo font 3 à 10 cm)
const TUILE = 1.1;

function fut() {
  const N = N_L + N_R + N_F + N_B, M = ANNEAUX.length, nT = 2;   // deux tuiles sur le tour (2,1 m de tour à 1 m)
  const pos = new Float32Array(M * (N + 1) * 3), uv = new Float32Array(M * (N + 1) * 2), col = new Float32Array(M * (N + 1) * 3);
  const c0 = new THREE.Vector3();
  let k = 0, ku = 0;
  const vrille = 0.15;                                       // la fente tourne un peu en montant (photo)
  for (let i = 0; i < M; i++) {
    const y = ANNEAUX[i], S = section(y);
    centreFut(y, c0);
    const ax = PLATANE_HAIE.axe + vrille * Math.max(0, y) / Y_FOURCHE;
    const ux = Math.cos(ax), uz = Math.sin(ax), wx = uz, wz = -ux;   // u : vers la tige côté terrain, w : l'avant de la fente
    // LE PIED, plus gris et plus terne sur ses 40 cm (les éclaboussures, la vieille écorce ; photo), sans liseré : un
    // simple fondu (le bout des racines noirci faisait un ourlet sombre au ras du bitume), un rien plus sombre au contact
    const sale = 1 - lisse(-0.04, 0.42, y), contact = 0.9 + 0.1 * lisse(-0.03, 0.1, y), haut = teinteFourche(y) * contact;
    for (let j = 0; j <= N; j++) {
      const jj = j % N, [lu, lw0] = S.pts[jj], lw = lw0 * 1.15;    // un peu plus épais d'avant en arrière
      pos[k] = c0.x + ux * lu + wx * lw; pos[k + 1] = y; pos[k + 2] = c0.z + uz * lu + wz * lw;
      // la crevasse cuite dans les couleurs (noire au fond : elle le reste sans occlusion ambiante, téléphone et basse),
      // les lèvres et le pied plus gris
      const noir = 1 - 0.9 * S.noirs[jj], g = Math.min(1, S.levres[jj] * 0.8 + sale);
      col[k] = noir * haut * (1 - 0.16 * g); col[k + 1] = noir * haut * (1 - 0.13 * g); col[k + 2] = noir * haut * (1 - 0.05 * g);
      k += 3;
      uv[ku++] = (j === N ? Math.PI : S.phi[jj]) / (2 * Math.PI) * nT + nT / 2; uv[ku++] = y / TUILE;
    }
  }
  const idx = [];
  for (let i = 0; i < M - 1; i++) for (let j = 0; j < N; j++) {
    const a = i * (N + 1) + j, b = a + 1, c = a + N + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  // le dessus de la fourche (caché par les charpentières, sauf vu d'en haut : la caméra de diffusion)
  const base = M * (N + 1), top = new THREE.Vector3();
  centreFut(Y_FOURCHE, top);
  const g = new THREE.BufferGeometry();
  const P = new Float32Array(pos.length + 3), U = new Float32Array(uv.length + 2), C = new Float32Array(col.length + 3);
  P.set(pos); U.set(uv); C.set(col);
  P[pos.length] = top.x; P[pos.length + 1] = Y_FOURCHE + 0.1; P[pos.length + 2] = top.z;
  U[uv.length] = 0.5; U[uv.length + 1] = (Y_FOURCHE + 0.3) / TUILE;
  C[col.length] = 0.6; C[col.length + 1] = 0.6; C[col.length + 2] = 0.6;
  const l0 = (M - 1) * (N + 1);
  for (let j = 0; j < N; j++) idx.push(l0 + j, l0 + j + 1, base);
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // la couture (colonnes 0 et N, mêmes positions) : une seule normale, sinon un trait vertical sur tout le fût
  const n = g.attributes.normal;
  for (let i = 0; i < M; i++) {
    const a = i * (N + 1), b = a + N;
    const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
  }
  return g;
}

// Le haut de chaque tige (le départ de ses charpentières), à `y`, dans le monde
function centreTige(y, cote, out) {
  const [rL, rR, d] = table(PROFIL, y), dL = (d + rR - rL) / 2, dR = (d - rR + rL) / 2;
  centreFut(y, out);
  const ax = PLATANE_HAIE.axe + 0.15 * y / Y_FOURCHE, o = cote > 0 ? dL : -dR;
  out.x += Math.cos(ax) * o; out.z += Math.sin(ax) * o;
  return [out, cote > 0 ? rL : rR];
}

// ---------------------------------------------------------------------
//  LE BOIS : tubes (charpentières, branches, rameaux), avec UV en mètres et couleurs de sommets
// ---------------------------------------------------------------------
const _q = new THREE.Quaternion(), _T = new THREE.Vector3(), _T2 = new THREE.Vector3(), _N = new THREE.Vector3(), _B = new THREE.Vector3(), _d = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0), AXE_X = new THREE.Vector3(1, 0, 0);
// le repère du premier anneau d'un tube qui part selon T (N : son côté u = 0, B : son quart de tour)
const repereTube = (T, N, B) => { N.crossVectors(T, Math.abs(T.y) < 0.9 ? UP : AXE_X).normalize(); B.crossVectors(T, N); };
// `sombre` : l'ombre cuite au départ du tube (la fourche), sur ses `sombreL` premiers mètres ; `v0` : où commence
// l'écorce en hauteur (les charpentières la continuent depuis le fût : pas de bague à la fourche) ; `u0` : le décalage de
// l'écorce sur le tour (les charpentières la reprennent en phase avec le fût) ; `teinte(y)` : l'ombre cuite selon la
// hauteur, à la place de `sombre` (la même que celle du fût)
function tube(chemin, rayons, cotes, sombre = 0, sombreL = 0.6, v0 = 0, u0 = 0, teinte = null) {
  const n = chemin.length, V = n * (cotes + 1);
  const pos = new Float32Array(V * 3), nor = new Float32Array(V * 3), uv = new Float32Array(V * 2), col = new Float32Array(V * 3);
  _T.subVectors(chemin[1], chemin[0]).normalize();
  repereTube(_T, _N, _B);
  const nu = Math.max(1, Math.round(2 * Math.PI * rayons[0] / TUILE));
  let L = 0, k = 0, ku = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      L += chemin[i].distanceTo(chemin[i - 1]);
      _T2.subVectors(chemin[Math.min(n - 1, i + 1)], chemin[i - 1]).normalize();
      _q.setFromUnitVectors(_T, _T2); _N.applyQuaternion(_q); _B.applyQuaternion(_q); _T.copy(_T2);
    }
    const r = rayons[i], p = chemin[i], c = teinte ? teinte(p.y) : 1 - sombre * (1 - lisse(0, sombreL, L));
    for (let j = 0; j <= cotes; j++) {
      const a = j / cotes * Math.PI * 2;
      _d.copy(_N).multiplyScalar(Math.cos(a)).addScaledVector(_B, Math.sin(a));
      pos[k] = p.x + _d.x * r; pos[k + 1] = p.y + _d.y * r; pos[k + 2] = p.z + _d.z * r;
      nor[k] = _d.x; nor[k + 1] = _d.y; nor[k + 2] = _d.z;
      col[k] = c; col[k + 1] = c; col[k + 2] = c; k += 3;
      uv[ku++] = u0 + j / cotes * nu; uv[ku++] = (v0 + L) / TUILE;
    }
  }
  const idx = [];
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < cotes; j++) {
    const a = i * (cotes + 1) + j, b = a + 1, c = a + cotes + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

// Le détail par niveau (charpentières, branches, rameaux) : côtés et tronçons. Au téléphone, les rameaux n'ont pas de
// tube (2 à 3 cm de diamètre à 6 m de haut : un trait d'un pixel), seulement leurs feuilles.
const COTES = LEGER ? [9, 6, 0] : [14, 9, 5];
const TRONCONS = LEGER ? [8, 5, 3] : [10, 6, 4];

// LES CINQ CHARPENTIÈRES, vues comme sur la photo (de gauche à droite) : [tige (+1 côté terrain, -1 côté grillage),
// angle à la verticale dans le plan de la photo (+ vers la droite de la photo), angle en profondeur (+ vers le
// photographe), longueur, rayon au départ] — relevés sur la photo : 25°, 6° à gauche, 6°, 16° et 26° à droite. Elles
// restent presque droites et ne s'ouvrent qu'un peu en montant. (La deuxième penche un peu vers le terrain, pas vers la
// haie : partie en arrière, elle laissait à nu le dôme de sa tige, un ballon lisse devant elle.)
const CHARPENTIERES = [
  [1, -0.43, 0.3, 9.8, 0.17],
  [1, -0.11, 0.1, 11.0, 0.155],
  [-1, 0.1, 0.5, 11.8, 0.165],
  [-1, 0.28, -0.18, 10.8, 0.155],
  [-1, 0.45, 0.35, 10.5, 0.185],
];
// le repère de la photo, vu du pied : à droite (vers le grillage et -z), vers le photographe
const DROITE_PHOTO = new THREE.Vector3(-0.885, 0, -0.458), VERS_PHOTO = new THREE.Vector3(0.458, 0, -0.885);

function arbre(bois, cartes) {
  const R = hasard(PLATANE_HAIE.x + 0.37, PLATANE_HAIE.z - 0.21);
  const { envergure: env, h } = PLATANE_HAIE;
  // le centre de la couronne : décalé vers le terrain (l'arbre cherche le jour, le grillage et la haie sont derrière)
  const cx = PLATANE_HAIE.x + 2.0, cz = PLATANE_HAIE.z - 0.3;
  const yFeuilles = 5.8;                       // pas une carte accrochée sous 5,8 m (photo : la couronne est haute)
  const haut = centreFut(Y_FOURCHE, new THREE.Vector3()), axeX = haut.x, axeZ = haut.z;
  const tailleCarte = (LEGER ? 2.5 : 1.95);
  const parRameau = LEGER ? 10 : 19;

  const feuilles = (chemin, dBout, n, de = 0.4) => {
    const m = chemin.length - 1;
    for (let c = 0; c < n; c++) {
      const f = c < 2 ? 1 : R(de, 1), i = Math.min(m - 1, Math.floor(f * m)), a = f * m - i;
      const p = chemin[i].clone().lerp(chemin[i + 1], Math.min(1, a));
      p.x += R(-0.45, 0.45); p.y += R(-0.3, 0.4); p.z += R(-0.45, 0.45);
      if (p.y < yFeuilles) continue;
      // LE CŒUR DE LA COURONNE EST OUVERT jusque vers 9,5 m : sur la photo, on voit les charpentières, claires sur le
      // ciel, de la fourche aux premières branches — le feuillage est autour et au-dessus (à 2,4 m de l'axe)
      if (p.y < 9.5 && Math.hypot(p.x - axeX, p.z - axeZ) < 2.4 * (1 - (p.y - yFeuilles) / 8)) continue;
      const dehors = new THREE.Vector3(p.x - cx, 0, p.z - cz);
      if (dehors.lengthSq() < 0.01) dehors.set(R(-1, 1), 0, R(-1, 1));
      dehors.normalize();
      // pendante, en biais (voir js/platanes_detailles.js) : vue d'en dessous, jamais par la tranche
      const g = new THREE.Vector3(0, -0.5, 0).addScaledVector(dBout, 0.35).addScaledVector(dehors, 0.55);
      g.x += R(-0.3, 0.3); g.y += R(-0.2, 0.15); g.z += R(-0.3, 0.3); g.normalize();
      carte(cartes, p, g, dehors, tailleCarte * R(0.85, 1.15), R);
    }
  };
  // L'ENVELOPPE de la couronne, où les branches sont ramenées : un DÔME (photo : un large houppier haut, au dessous
  // presque plat). Son rayon à la hauteur y : 72 % de l'envergure à 5,5 m, toute l'envergure vers 10,5 m, puis il se
  // referme jusqu'au sommet.
  const yMil = 10.5;
  const rayonDome = (y) => (y <= yMil ? env * (0.72 + 0.28 * lisse(5.5, yMil, y)) : env * Math.sqrt(Math.max(0, 1 - ((y - yMil) / (h - yMil)) ** 2)));
  const rappel = (p, d) => {
    const dx = p.x - cx, dz = p.z - cz, dh = Math.hypot(dx, dz) || 1, e = dh / Math.max(0.5, rayonDome(p.y));
    if (e > 0.75) { const k = Math.min(0.6, (e - 0.75) * 1.2); d.x -= dx / dh * k; d.z -= dz / dh * k; d.y += p.y > yMil ? -0.1 : 0.1; }
    if (p.y > h - 1) d.y -= 0.35;
  };

  // une branche (niv 1) ou un rameau (niv 2) : chemin sinueux qui se redresse un peu, puis ses enfants
  const branche = (p0, d0, L, r0, niv) => {
    const n = TRONCONS[niv], chemin = [p0.clone()], rayons = [r0];
    const d = d0.clone(), p = p0.clone(), rFin = r0 * (niv >= 2 ? 0.35 : 0.55);
    for (let i = 1; i <= n; i++) {
      d.x += R(-0.2, 0.2); d.z += R(-0.2, 0.2); d.y += R(-0.12, 0.12) + (niv === 1 ? 0.05 : 0.08);
      rappel(p, d);
      d.normalize();
      p.addScaledVector(d, L / n);
      chemin.push(p.clone()); rayons.push(r0 + (rFin - r0) * (i / n));
    }
    if (COTES[niv]) bois.push(tube(chemin, rayons, COTES[niv]));
    const dBout = d.clone();
    if (niv >= 2) { feuilles(chemin, dBout, parRameau); return; }
    // les rameaux : deux au bout, deux ou trois en chemin
    const lat = R() < 0.5 ? 2 : 3, rEnf = rFin * 0.85;
    const az0 = R(0, Math.PI * 2);
    for (let k = 0; k < 2; k++) branche(chemin[n], devier(dBout, R(0.3, 0.6), az0 + k * Math.PI + R(-0.4, 0.4)), L * R(0.5, 0.65), rEnf, niv + 1);
    for (let k = 0; k < lat; k++) {
      const i = Math.max(1, Math.min(n - 1, Math.round(n * R(0.3, 0.8))));
      const dd = devier(chemin[i + 1].clone().sub(chemin[i]).normalize(), R(0.55, 0.95), R(0, Math.PI * 2));
      branche(chemin[i], dd, L * R(0.45, 0.6), Math.min(rayons[i] * 0.7, rEnf), niv + 1);
    }
    // (un peu de feuillage sur la branche elle-même : le cœur de la couronne n'est pas vide — la photo est dense)
    feuilles(chemin, dBout, Math.round(parRameau * 0.5), 0.5);
  };

  // LES CHARPENTIÈRES : droites et raides (les platanes de la ville sont conduits haut), elles s'ouvrent en montant
  const centre = new THREE.Vector3(), tT = new THREE.Vector3(), tN = new THREE.Vector3(), tB = new THREE.Vector3();
  for (const [cote, alpha, beta, L, r0] of CHARPENTIERES) {
    const [pt, rT] = centreTige(Y_DEPART, cote, new THREE.Vector3());
    const dir = new THREE.Vector3().addScaledVector(DROITE_PHOTO, Math.sin(alpha)).addScaledVector(VERS_PHOTO, Math.sin(beta) * Math.cos(alpha))
      .addScaledVector(UP, Math.cos(alpha) * Math.cos(beta)).normalize();
    // (un peu vers le terrain : le côté du jour)
    dir.x += 0.2; dir.normalize();
    // DÉPART au cœur de sa tige, 25 cm sous Y_DEPART, presque aussi grosse qu'elle mais un rien en dedans (cachée dans
    // le fût, sans se battre avec sa surface) : elle en sort en biais, à travers le dôme bas de la fourche et ses
    // bourrelets, sur une couture oblique et noueuse ; puis l'empattement se resserre sur le premier mètre. (Partie de
    // 4,1 m, elle sortait du fût par un anneau net vers 4,2 m : une bague, l'écorce cassée à l'horizontale.)
    const p = pt.clone().addScaledVector(dir, 0.5), d = dir.clone();
    const n = TRONCONS[0], chemin = [pt.clone().addScaledVector(dir, -0.25)], rayons = [rT * 0.86];
    const ouvre = new THREE.Vector3(dir.x, 0, dir.z), kOuv = 0.008 + 0.035 * Math.hypot(dir.x, dir.z);
    if (ouvre.lengthSq() < 1e-4) ouvre.set(1, 0, 0);
    ouvre.normalize();
    chemin.push(p.clone()); rayons.push(Math.max(r0 * 1.25, rT * 0.78));
    for (let i = 1; i <= n; i++) {
      // elles s'ouvrent : un peu plus penchées à chaque tronçon, avec un rien de sinuosité
      d.addScaledVector(ouvre, kOuv); d.x += R(-0.05, 0.05); d.z += R(-0.05, 0.05); d.normalize();
      p.addScaledVector(d, L / n);
      chemin.push(p.clone()); rayons.push(r0 * (1.05 - 0.65 * i / n));
    }
    // L'ÉCORCE EN PHASE avec celle du fût, du côté où la charpentière penche (là où elle en sort, le plus en vue) : la
    // colonne du tube tournée de ce côté reprend la coordonnée u du fût dans la même direction (même hauteur : `v0`)
    repereTube(tT.subVectors(chemin[1], chemin[0]).normalize(), tN, tB);
    const pen = new THREE.Vector3(dir.x, 0, dir.z).normalize(), ax = PLATANE_HAIE.axe + 0.15 * Y_DEPART / Y_FOURCHE;
    const phiFut = Math.atan2(pen.x * Math.sin(ax) - pen.z * Math.cos(ax), pen.x * Math.cos(ax) + pen.z * Math.sin(ax));
    const aTube = (Math.atan2(pen.dot(tB), pen.dot(tN)) + 2 * Math.PI) % (2 * Math.PI), nu = Math.max(1, Math.round(2 * Math.PI * rayons[0] / TUILE));
    const u0 = (phiFut / (2 * Math.PI) + 0.5) * 2 - aTube / (2 * Math.PI) * nu;
    bois.push(tube(chemin, rayons, COTES[0], 0, 0.8, chemin[0].y, u0, teinteFourche));
    // les BRANCHES : quatre en chemin (de 22 à 75 % de la longueur), deux au bout ; vers le dehors de la couronne. La
    // plus basse part presque à l'horizontale et retombe un peu (photo : quelques feuilles vers 6 m, au bord)
    for (let k = 0; k < 6; k++) {
      const bout = k >= 4, f = bout ? 1 : 0.22 + k * 0.175 + R(-0.04, 0.04);
      const i = Math.min(n + 1, Math.max(2, Math.round(f * (n + 1))));
      const q = chemin[i], dLoc = chemin[Math.min(n + 1, i + 1)].clone().sub(chemin[i - 1]).normalize();
      centre.set(cx, q.y, cz);
      const dehors = q.clone().sub(centre); dehors.y = 0;
      if (dehors.lengthSq() < 0.04) dehors.set(R(-1, 1), 0, R(-1, 1));
      dehors.normalize();
      // l'azimut de la branche : vers le dehors, tiré autour (les deux du bout se partagent le tour)
      const ouv = k === 0 ? 0.92 : 0.75;
      const dd = bout ? devier(dLoc, R(0.35, 0.6), (k === 4 ? 0 : Math.PI) + R(-0.6, 0.6))
        : dLoc.clone().multiplyScalar(Math.cos(ouv)).addScaledVector(dehors.applyAxisAngle(UP, R(-0.9, 0.9)), Math.sin(ouv)).normalize();
      if (k === 0) { dd.y -= 0.1; dd.normalize(); }
      const Lb = bout ? R(2.4, 3.4) : R(2.8, 4.2);
      branche(q, dd, Lb, rayons[i] * (bout ? 0.62 : 0.55), 1);
    }
  }
}

// ---------------------------------------------------------------------
//  L'ÉCORCE DESSINÉE : couleur, relief, rugosité
// ---------------------------------------------------------------------
// Sur la photo (fin de journée, ciel couvert) le fût éclairé est un GRIS-BEIGE CHAUD (129, 116, 96 en moyenne, teinte
// 36° : du brun-gris tirant sur l'ocre, pas l'olive), un peu plus clair et nettement plus chaud que le bitume (97, 95,
// 87). Son dessin : un fond gris-beige moyen, de GRANDES taches CRÈME aux bords doux (8 à 25 cm, là où les plaques sont
// tombées : l'écorce neuve), le contraste principal ; des zones plus sombres, gris-olive ternes, grandes et floues ; des
// plaques encore accrochées, gris-brun, aux bords en puzzle ; peu de petits points sombres. Plus gris et plus sombre au
// pied et le long de la fente (les couleurs de sommets du fût).
// (Avant : un fond jaune pâle semé de 290 petits points sombres aux bords nets : un camouflage olive, teinte 52° à
// l'écran, le dessin à l'envers de la photo.)
// Dessin : le fond, les grandes zones sombres (floues), l'écorce neuve (floue), puis les plaques moyennes et petites
// (polygones aux bords en puzzle, posés en couches, recopiés aux bords : la tuile se raccorde), chacune avec un liseré
// d'ombre d'un côté (l'écaille qui se soulève), des éclats clairs, enfin le grain (lenticelles). Les teintes sont un
// peu plus rouges et plus bleues que celles qu'on vise à l'écran : la lumière du soir et le reflet vert de la haie les
// tirent vers le jaune-vert (mesuré : 159, 148, 122 dessinés -> 119, 114, 86 à l'écran).
// Le même dessin, en niveaux de gris, donne le RELIEF (les vieilles plaques en saillie, l'écorce neuve en creux), d'où
// la carte de normales (pentes de Sobel : adoucies sans filtre de flou), et la RUGOSITÉ (vieilles plaques plus mates).
// Hasard fixe : la même écorce à chaque partie. Une fois, au chargement de l'arbre.
const TEINTES = {
  fond: [160, 140, 128],
  // les grandes zones sombres, floues : un gris-olive terne
  zones: [[124, 114, 104], [118, 110, 101], [130, 118, 108]],
  // les plaques encore accrochées : gris-brun, un seul olive clair (le dernier)
  plaques: [[136, 120, 111, 3], [122, 111, 103, 2], [148, 132, 120, 3], [138, 130, 110, 1]],
  // l'écorce neuve : crème (pas trop claire : sur la photo, elle tranche peu)
  neuve: [[194, 178, 162], [200, 186, 172], [186, 170, 154]],
};
let _ecorce = null;
export function ecorceHaie() {
  if (_ecorce) return _ecorce;
  const t0 = performance.now();
  const S = LEGER ? 512 : 1024, PX = S / TUILE;            // pixels par mètre
  const R = hasard(12.34, 56.78);
  const toile = (w = S) => { const c = document.createElement('canvas'); c.width = c.height = w; return c; };
  const cC = toile(), gC = cC.getContext('2d'), cH = toile(), gH = cH.getContext('2d', { willReadFrequently: true });
  gC.fillStyle = `rgb(${TEINTES.fond})`; gC.fillRect(0, 0, S, S);
  gH.fillStyle = 'rgb(128,128,128)'; gH.fillRect(0, 0, S, S);
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const tirer = (liste) => { let t = 0; for (const c of liste) t += c[3]; let a = R(0, t); for (const c of liste) { a -= c[3]; if (a <= 0) return c; } return liste[0]; };
  // un polygone aux bords en puzzle (quatre harmoniques, et un tremblé par point qui fait les dents de l'écaille cassée),
  // rayon r en pixels, étiré (ex, ey)
  const forme = (r, ex, ey) => {
    const n = 26, pts = [], h = [R(0, 6.3), R(0, 6.3), R(0, 6.3), R(0, 6.3)], a = [R(0.15, 0.32), R(0.1, 0.22), R(0.06, 0.16), R(0.04, 0.11)];
    let m = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n * Math.PI * 2;
      const k = 1 + a[0] * Math.sin(2 * t + h[0]) + a[1] * Math.sin(3 * t + h[1]) + a[2] * Math.sin(5 * t + h[2]) + a[3] * Math.sin(9 * t + h[3]) + R(-0.2, 0.2);
      pts.push([Math.cos(t) * r * k * ex, Math.sin(t) * r * k * ey]);
      m = Math.max(m, r * k * Math.max(ex, ey));
    }
    pts.m = m;
    return pts;
  };
  // `style(X, Y)` : le remplissage de chaque copie (un dégradé doit suivre sa copie) ; `marge` : le flou d'une tache
  // floue (sa copie compte jusque-là au-delà du bord) ; `loin` : la tache floue est tracée loin hors de la toile (à
  // gauche), seule son ombre floue y tombe
  const tracer = (g, pts, x, y, style = null, marge = 0, loin = 0) => {
    const n = pts.length, m = pts.m + 2 + marge;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const X = x + ox, Y = y + oy, dX = X - loin;
      if (X + m < 0 || X - m > S || Y + m < 0 || Y - m > S) continue;
      if (style) g.fillStyle = style(X, Y);
      g.beginPath();
      // un point sur deux arrondi (on passe par les milieux, le point sert de poignée), l'autre en angle vif : des bords
      // ondulés mais dentelés, comme une écaille cassée — tout arrondis, les plaques faisaient des galets de camouflage
      g.moveTo(dX + (pts[0][0] + pts[n - 1][0]) / 2, Y + (pts[0][1] + pts[n - 1][1]) / 2);
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n];
        if (i & 1) g.lineTo(dX + p[0], Y + p[1]);
        else g.quadraticCurveTo(dX + p[0], Y + p[1], dX + (p[0] + q[0]) / 2, Y + (p[1] + q[1]) / 2);
      }
      g.closePath(); g.fill();
    }
  };
  const plaque = (rMin, rMax, couleur, alpha, haut, lisere) => {
    const x = R(0, S), y = R(0, S), r = R(rMin, rMax) * PX;
    const pts = forme(r, R(0.8, 1.15), R(1.0, 1.5));          // un peu étirées en hauteur
    if (lisere) {
      // le liseré : la même forme, décalée d'un ou deux pixels vers le bas et le côté, plus sombre
      const dx = Math.max(1, S / 700), dy = Math.max(1, S / 520);
      gC.fillStyle = rgb([76, 64, 54], lisere); tracer(gC, pts, x + dx, y + dy);
      gH.fillStyle = 'rgba(80,80,80,0.5)'; tracer(gH, pts, x + dx, y + dy);
    }
    // la plaque : un cœur un peu plus clair (bombé, l'écaille au jour), le bord à sa teinte
    const coeur = rgb(couleur.map((v) => Math.min(255, v * 1.07)), alpha), bord = rgb(couleur, alpha);
    tracer(gC, pts, x, y, (X, Y) => {
      const gr = gC.createRadialGradient(X - r * 0.2, Y - r * 0.25, 0, X, Y, r * 1.3);
      gr.addColorStop(0, coeur); gr.addColorStop(1, bord);
      return gr;
    });
    gH.fillStyle = `rgba(${haut},${haut},${haut},${Math.min(1, alpha + 0.15)})`; tracer(gH, pts, x, y);
  };
  // une tache aux BORDS FONDUS (`flou` en mètres) : l'ombre floue de la forme (shadowBlur marche partout ; ctx.filter,
  // pas sur les Safari d'avant la 18)
  const floue = (rMin, rMax, couleur, alpha, haut, flou) => {
    const x = R(0, S), y = R(0, S), r = R(rMin, rMax) * PX, f = flou * PX, loin = 4 * S;
    const pts = forme(r, R(0.75, 1.2), R(0.95, 1.6));
    for (const [g, c] of [[gC, rgb(couleur, alpha)], [gH, `rgba(${haut},${haut},${haut},${alpha})`]]) {
      g.save(); g.shadowColor = c; g.shadowBlur = f; g.shadowOffsetX = loin; g.fillStyle = '#000';
      tracer(g, pts, x, y, null, f * 1.5, loin);
      g.restore();
    }
  };
  // 1. les grandes zones sombres, floues (trois par tuile)
  for (let i = 0; i < 3; i++) floue(0.12, 0.24, TEINTES.zones[i], 0.55, 132, 0.06);
  // 2. l'écorce neuve, crème, aux bords doux : LE contraste de la photo (7 à 22 cm, en creux ; un bon quart de la tuile)
  for (let i = 0; i < 16; i++) floue(0.035, 0.11, TEINTES.neuve[Math.floor(R(0, 3))], R(0.65, 0.85), 112, 0.006);
  // 3. les plaques moyennes, 4. les petites (la vieille écorce encore accrochée ; une centaine de petites, 290 avant)
  for (let i = 0; i < 30; i++) plaque(0.022, 0.05, tirer(TEINTES.plaques), 0.5, 168, 0.12);
  for (let i = 0; i < 100; i++) plaque(0.007, 0.02, tirer(TEINTES.plaques), 0.45, 158, 0.08);
  // 5. des éclats d'écorce neuve, petits et nets (en creux)
  for (let i = 0; i < 50; i++) plaque(0.01, 0.03, TEINTES.neuve[Math.floor(R(0, 3))], 0.6, 112, 0);
  // 6. le grain : des mouchetures (le fond n'est jamais d'un seul aplat), puis lenticelles (courts traits horizontaux)
  for (let i = 0; i < 2600; i++) {
    const x = R(0, S), y = R(0, S), r = R(0.6, 2.6) * S / 1024, c = R() < 0.55 ? [124, 110, 96] : [198, 184, 160];
    gC.fillStyle = rgb(c, R(0.08, 0.2)); gC.beginPath(); gC.ellipse(x, y, r, r * 1.3, 0, 0, Math.PI * 2); gC.fill();
  }
  const ep = Math.max(1, S / 1024);
  for (let i = 0; i < 2200; i++) {
    const x = R(0, S), y = R(0, S), w = R(1.5, 5) * S / 1024, sombre = R() < 0.7;
    gC.fillStyle = sombre ? 'rgba(84,72,62,0.18)' : 'rgba(204,190,164,0.18)'; gC.fillRect(x, y, w, ep);
    gH.fillStyle = sombre ? 'rgba(96,96,96,0.35)' : 'rgba(156,156,156,0.3)'; gH.fillRect(x, y, w, ep);
  }
  // LE RELIEF : pentes de Sobel de la hauteur (raccordées aux bords) -> normales (vert vers le haut, comme three l'attend).
  // (Sur un tableau d'octets, sans fonction ni Math.hypot dans la boucle : 1 M de pixels en ~25 ms au lieu de 130.)
  const Hd = gH.getImageData(0, 0, S, S).data, H = new Uint8Array(S * S);
  for (let i = 0, j = 0; i < H.length; i++, j += 4) H[i] = Hd[j];
  const cN = toile(), gN = cN.getContext('2d'), imN = gN.createImageData(S, S), dN = imN.data;
  const force = 0.55 * S / 1024 / 255;
  for (let y = 0; y < S; y++) {
    const ym = ((y - 1 + S) % S) * S, yp = ((y + 1) % S) * S, y0 = y * S;
    for (let x = 0; x < S; x++) {
      const xm = x === 0 ? S - 1 : x - 1, xp = x === S - 1 ? 0 : x + 1;
      const dx = ((H[ym + xp] + 2 * H[y0 + xp] + H[yp + xp]) - (H[ym + xm] + 2 * H[y0 + xm] + H[yp + xm])) * force;
      const dy = ((H[yp + xm] + 2 * H[yp + x] + H[yp + xp]) - (H[ym + xm] + 2 * H[ym + x] + H[ym + xp])) * force;
      const l = 127 / Math.sqrt(dx * dx + dy * dy + 1), i = (y0 + x) * 4;
      // (la texture est lue v vers le haut : y de la toile vers le bas, d'où le signe de la pente verticale)
      dN[i] = 128 - dx * l; dN[i + 1] = 128 + dy * l; dN[i + 2] = 128 + l; dN[i + 3] = 255;
    }
  }
  gN.putImageData(imN, 0, 0);
  // LA RUGOSITÉ (canal vert, demi-résolution) : 0,78 sur l'écorce neuve, 0,9 sur les vieilles plaques
  const SR = S / 2, cR = toile(SR), gR = cR.getContext('2d', { willReadFrequently: true });
  gR.drawImage(cH, 0, 0, SR, SR);
  const imR = gR.getImageData(0, 0, SR, SR), dR = imR.data;
  for (let i = 0; i < dR.length; i += 4) { const v = Math.round(255 * Math.min(0.95, Math.max(0.74, 0.8 + (dR[i] - 128) / 255 * 0.3))); dR[i] = dR[i + 1] = dR[i + 2] = v; }
  gR.putImageData(imR, 0, 0);
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = srgb ? 8 : 4;
    return t;
  };
  _ecorce = { map: tex(cC, true), normalMap: tex(cN, false), roughnessMap: tex(cR, false), ms: Math.round(performance.now() - t0) };
  return _ecorce;
}

// ---------------------------------------------------------------------
//  L'ARBRE POSÉ
// ---------------------------------------------------------------------
// `t` : l'emplacement de js/court.js (modelTree : son clone de tree2 est caché tant que le décor détaillé est coché).
// `m` : { feuilles, ombreFeuilles } — le matériau des couronnes de tree2 et son ombre ventée (js/court.js loadTreeModel).
export function plataneHaie(scene, t, m) {
  if (!m.feuilles) return null;
  const t0 = performance.now();
  const E = ecorceHaie();
  const ecorce = new THREE.MeshStandardMaterial({
    name: 'ecorce platane haie', map: E.map, normalMap: E.normalMap, roughnessMap: E.roughnessMap,
    vertexColors: true, roughness: 1, metalness: 0,
  });
  ecorce.normalScale.set(0.9, 0.9);
  const bois = [fut()], cartes = { pos: [], nor: [], uv: [], idx: [], n: 0 };
  arbre(bois, cartes);
  const groupe = new THREE.Group();
  groupe.name = 'platane de la haie'; groupe.userData.nofuse = true;
  const charpente = new THREE.Mesh(mergeGeometries(bois, false), ecorce);
  for (const g of bois) g.dispose();
  charpente.castShadow = true; charpente.receiveShadow = true; charpente.name = 'bois platane haie';
  groupe.add(charpente);
  const gf = new THREE.BufferGeometry();
  gf.setAttribute('position', new THREE.Float32BufferAttribute(cartes.pos, 3));
  gf.setAttribute('normal', new THREE.Float32BufferAttribute(cartes.nor, 3));
  gf.setAttribute('uv', new THREE.Float32BufferAttribute(cartes.uv, 2));
  gf.setIndex(cartes.idx); gf.computeBoundingSphere();
  const couronne = new THREE.Mesh(gf, m.feuilles);
  couronne.castShadow = true; couronne.receiveShadow = true; couronne.userData.feuillage = true; couronne.name = 'couronne platane haie';
  if (m.ombreFeuilles) couronne.customDepthMaterial = m.ombreFeuilles;
  groupe.add(couronne);
  scene.add(groupe);
  const appliquer = (o) => { groupe.visible = o.decor; if (t.arbre) t.arbre.visible = !o.decor; };
  surOptions(appliquer);
  groupe.userData.appliquer = () => appliquer(OPTIONS_RENDU);
  const tb = charpente.geometry.index.count / 3;
  console.info('[décor] platane de la haie :', Math.round(tb), 'triangles de bois,', cartes.n, 'cartes de feuilles (',
    Math.round(tb + cartes.n * 2), 'triangles en tout ), écorce', E.ms, 'ms, en tout', Math.round(performance.now() - t0), 'ms', LEGER ? '· téléphone' : '');
  return { groupe, ecorce };
}

// ---------------------------------------------------------------------
//  LE PIED : la touffe d'herbe (plus de rond de terre)
// ---------------------------------------------------------------------
// Photo : l'enrobé monte jusqu'aux contreforts ; au pied, côté poubelle, une touffe d'herbe folle (30 cm, feuilles
// larges et quelques brins). Un maillage (trois cartes croisées). (Une tache de crasse sur le bitume entre les racines a
// été essayée : sous les ombres de contact du sol, elle ne se voyait pas — un appel de dessin pour rien.)
export function piedPlataneHaie(scene) {
  const { x, z, axe } = PLATANE_HAIE;
  const ux = Math.cos(axe), uz = Math.sin(axe), wx = uz, wz = -ux;
  const groupe = new THREE.Group();
  groupe.name = 'pied du platane de la haie'; groupe.userData.nofuse = true;
  // ---- la touffe : trois cartes croisées d'une herbe dessinée
  const S = LEGER ? 64 : 128, R = hasard(x - 1.3, z + 2.9);
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const k = S / 128;
  const feuille = (a, L, l, coul) => {
    g.save(); g.translate(64 * k, 126 * k); g.rotate(a); g.fillStyle = coul;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(l * k, -L * 0.45 * k, 0, -L * k); g.quadraticCurveTo(-l * k, -L * 0.45 * k, 0, 0); g.fill();
    g.strokeStyle = 'rgba(40,60,25,0.5)'; g.lineWidth = Math.max(1, k); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -L * 0.9 * k); g.stroke();
    g.restore();
  };
  for (let i = 0; i < 14; i++) {
    const v = R(0, 1), coul = `rgb(${Math.round(55 + 45 * v)},${Math.round(88 + 45 * v)},${Math.round(38 + 22 * v)})`;
    if (R() < 0.35) feuille(R(-0.5, 0.5), R(80, 118), R(2, 4), coul);       // brins
    else feuille(R(-1.1, 1.1), R(45, 95), R(10, 20), coul);                 // feuilles larges
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mh = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85, metalness: 0 });
  mh.name = 'touffe platane haie';
  const quads = [];
  for (let i = 0; i < 3; i++) {
    const q = new THREE.PlaneGeometry(0.42, 0.34);
    q.translate(0, 0.16, 0); q.rotateY(i * Math.PI / 3 + 0.3);
    quads.push(q);
  }
  const touffe = new THREE.Mesh(mergeGeometries(quads, false), mh);
  for (const q of quads) q.dispose();
  // contre le contrefort côté grillage, un peu en avant (photo : à droite du pied, côté poubelle)
  touffe.position.set(x - ux * 0.5 + wx * 0.22, 0, z - uz * 0.5 + wz * 0.22);
  touffe.name = 'touffe platane haie';
  groupe.add(touffe);
  scene.add(groupe);
  return groupe;
}
