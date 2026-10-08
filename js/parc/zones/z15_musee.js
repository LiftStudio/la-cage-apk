// =====================================================================
//  ZONE Z15 : LE MUSÉE ROYBET-FOULD (lot B7 du chantier « parc entier »)
// =====================================================================
// Au bout nord-est du parc haut, contre la limite du passage du Pourquoi-Pas : deux bâtiments accolés
// (tools/parc/references_gmaps/R3.md § Z15 et SYNTHESE.md § Z15, qui priment sur la conception) :
//
//   - le PAVILLON DE SUÈDE ET DE NORVÈGE (Exposition de 1878), x -71 à -60,4, z -106 à -89, sa FAÇADE PEINTE vers x+
//     (le coteau, la terrasse de 2025) : murs de planches brun-noir (#2e2a28 à #3b3a38 ; clins au rez-de-chaussée,
//     planches verticales à couvre-joints à l'étage et sur la tour), cadres de baies et bandeaux OCRE-OR (#c9a24a),
//     piédroits, montants d'angle et consoles SAUMON (#d9694a), colonnettes sombres entre des BAIES CINTRÉES étroites
//     (arcature continue de dix baies à l'étage de l'aile longue) ; au bout z+, l'AILE-TOUR de 6 m à trois niveaux
//     (2 / 3 / 5 baies) et pignon très pointu dont le TYMPAN est couvert d'ÉCAILLES EN LOSANGE saumon et ocre ; à l'autre
//     bout, l'AILE EN ENCORBELLEMENT à son propre pignon, sa LOGGIA de sept balustres saumon ; entre les deux, le PORCHE
//     de quatre marches à poteaux octogonaux et toit raide de bardeaux, épi doré ; toits d'ardoise (#4a4d52) à longs
//     débords, RIVES SAUMON FESTONNÉES ; en bas, une JUPE DE BARDEAUX À ÉCAILLES saumon (#e0806a) sur un socle de pierre
//     pâle (#d6cbb5) ;
//   - le BÂTIMENT PRINCIPAL enduit, x -75,6 à -60,5, z -117 à -106, sa façade vers x- sur un PARVIS brique-rouge : R+1
//     et comble mansardé d'ardoise (trois lucarnes de pierre, trois souches), enduit crème (#e3d6b5) à refends au
//     rez-de-chaussée, cinq travées, persiennes beiges, balconnets de fer forgé, porte de fer et verre sous une console,
//     trois marches et deux lanternes ; le parvis est fermé de piliers crème, d'une grille noire et d'un portail ;
//   - le JARDIN du musée, entre le pavillon et le parc (x -75,6 à -71), clos d'un mur de moellons de 1,8 m (R3.md
//     Z14-19 : vu du parc, le mur, et derrière lui le pignon de la tour et le haut du bâtiment enduit) ;
//   - la TERRASSE de 2025 devant la façade peinte : pavés de granit gris mêlés posés en arcs, marche de pierre au pied
//     de la façade, garde-corps d'acier noir au bord du coteau, chaises de jardin rose et vert anis.
//
// Non vus (R3.md Z15.4) et donc tenus simples : la façade x- du pavillon (reprise de la façade peinte, sans porche),
// l'arrière du bâtiment enduit (sur la limite), l'escalier de 2025 et sa cascade (au-delà du garde-corps, dans le
// coteau de Z10).
//
// LES DONNÉES : l'obstacle « bâtiment » de monde.json (osm 82241201 : x -75,6 à -60,5, z -117 à -89, 10,5 m) couvre les
// deux bâtiments et le jardin clos ; la zone déclare le reste (porche, parvis, garde-corps). Les hauteurs viennent du
// sol du monde : le terrain descend de +11,1 (côté parc) à +10,2 (côté terrasse), le socle rattrape la pente.
//
// RÈGLES DE ZONE : aucun Math.random ; les matériaux du kit, plus un seul propre (la toile des écailles, dessinée au
// premier appel) ; aucun arbre planté ; rien hors du groupe du morceau.
import * as THREE from 'three';
import { outilsB7 } from './z14_haut_nord_est.js';

// ============================================================================================ les données
// (repère du terrain 1)
const PAV = { x0: -71.0, x1: -60.4, z0: -106.0, z1: -89.2 };
// les trois corps du pavillon, le long de z : l'aile en encorbellement, l'aile longue, l'aile-tour
const ENC = { z0: -106.0, z1: -102.7 }, LONGUE = { z0: -102.7, z1: -95.3 }, TOUR = { z0: -95.3, z1: -89.2, saillie: 0.12 };
// les hauteurs du pavillon : dessus du socle de pierre, haut de la jupe d'écailles (le plancher), le bandeau de l'étage,
// l'égout ; la tour monte d'un niveau de plus
const Y = { socle: 10.72, jupe: 11.58, etage: 14.25, egout: 16.95, tourEgout: 18.7, tourFaite: 23.3, faite: 21.35, encFaite: 19.0 };
const PORCHE = { z0: -102.55, z1: -100.95, prof: 1.7, y: 10.98, marches: 4 };
// le bâtiment enduit
const ENDUIT = { x0: -75.6, x1: -60.5, z0: -117.0, z1: -106.0, sol: 10.0, plancher: 11.55, etage: 15.4, egout: 19.1, brisis: 22.3, faite: 23.9 };
const PARVIS = { x0: -80.6, x1: -75.6, z0: -116.6, z1: -101.6 };
const JARDIN = { x0: -75.45, x1: -71.0, z0: -106.0, z1: -89.35 };
const TERRASSE = { x0: -60.4, x1: -56.7, z0: -106.2, z1: -89.2 };

// ============================================================================================ les toiles des écailles
// (les deux seuls matériaux propres de la zone) : deux toiles de 256 px, qui se répètent (côté d'une tuile : TUILE_ECAILLES ;
// relecture : 0,6 m par tuile faisait des écailles de 7 cm, cinq fois trop petites — sur les photos de la tour, la jupe
// n'a que deux rangs et demi d'écailles d'environ 0,4 m, et le tympan une quinzaine de losanges dans sa largeur) :
//  - 'losange' : les ÉCAILLES EN LOSANGE du tympan de la tour, saumon et ocre en quinconce (R3.md Z15-03 : #e0915a /
//    #d8b04a), un filet sombre, un reflet sur la moitié haute de chaque losange ;
//  - 'ronde' : les BARDEAUX À ÉCAILLES rondes de la jupe, saumon (#e0806a), rangées décalées d'une demi-écaille, le bord
//    bas de chaque écaille ombré (elle recouvre la rangée d'en dessous).
const _matEcailles = {};
// le côté réel d'une tuile (m) : huit écailles ou huit losanges de front par tuile
const TUILE_ECAILLES = { ronde: 3.2, losange: 3.4 };
function materiauEcailles(kit, sorte) {
  if (_matEcailles[sorte]) return _matEcailles[sorte];
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  if (sorte === 'losange') {
    g.fillStyle = '#6a3a28'; g.fillRect(0, 0, 256, 256);
    for (let j = -1; j <= 8; j++) for (let i = -1; i <= 8; i++) {
      const cx = i * 32 + (j % 2 ? 16 : 0), cy = j * 32, t = kit.alea(i, j, 401), ocre = (i + j) % 2 === 0;
      g.fillStyle = ocre ? `rgb(${216 - 10 * t | 0},${176 - 8 * t | 0},74)` : `rgb(${224 - 12 * t | 0},${145 - 10 * t | 0},90)`;
      g.beginPath(); g.moveTo(cx, cy - 16); g.lineTo(cx + 15, cy); g.lineTo(cx, cy + 16); g.lineTo(cx - 15, cy); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,240,210,0.25)'; g.beginPath(); g.moveTo(cx, cy - 13); g.lineTo(cx + 11, cy); g.lineTo(cx, cy - 2); g.closePath(); g.fill();
    }
  } else {
    g.fillStyle = '#8a3f2c'; g.fillRect(0, 0, 256, 256);
    for (let j = 0; j <= 9; j++) for (let i = -1; i <= 8; i++) {
      const cx = i * 32 + (j % 2 ? 16 : 0) + 16, cy = j * 28 - 8, t = kit.alea(i, j, 403);
      g.fillStyle = `rgb(${224 - 14 * t | 0},${128 - 10 * t | 0},${106 - 8 * t | 0})`;
      g.beginPath(); g.moveTo(cx - 15, cy - 8); g.lineTo(cx - 15, cy + 8); g.arc(cx, cy + 8, 15, Math.PI, 0, true); g.lineTo(cx + 15, cy - 8); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(80,30,20,0.55)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy + 8, 15, Math.PI, 0, true); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.78, metalness: 0 });
  m.name = 'Z15 · écailles ' + (sorte === 'losange' ? 'en losange' : 'saumon');
  _matEcailles[sorte] = m;
  return m;
}
// Un accumulateur de triangles pour une toile d'écailles (le Lot du kit ne connaît que ses matériaux) : polygones plans
// convexes, UV en tuiles (TUILE_ECAILLES).
class Ecailles {
  constructor(sorte) { this.sorte = sorte; this.p = []; this.n = []; this.uv = []; this.i = []; }
  // pts : sommets 3D (un polygone plan convexe), `n` : sa normale, uv : [[u, v], ...] en tuiles
  poly(pts, n, uv) {
    const b = this.p.length / 3, l = Math.hypot(n[0], n[1], n[2]) || 1;
    for (let k = 0; k < pts.length; k++) { const q = pts[k]; this.p.push(q[0], q[1], q[2]); this.n.push(n[0] / l, n[1] / l, n[2] / l); this.uv.push(uv[k][0], uv[k][1]); }
    // (triangles tournés vers la normale, quel que soit le sens des sommets)
    for (let k = 1; k < pts.length - 1; k++) {
      const A = pts[0], B = pts[k], C = pts[k + 1];
      const cx = (B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]), cy = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]), cz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
      if (cx * n[0] + cy * n[1] + cz * n[2] >= 0) this.i.push(b, b + k, b + k + 1); else this.i.push(b, b + k + 1, b + k);
    }
  }
  maillage(kit, nom, dec) {
    if (!this.i.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.i);
    const m = new THREE.Mesh(g, materiauEcailles(kit, this.sorte));
    m.position.x = dec; m.name = nom; m.castShadow = true; m.receiveShadow = true;
    return m;
  }
}

// ============================================================================================ petits outils
// UNE FACE DE MUR : de (x0, z0) à (x1, z1), normale sortante (nx, nz). pt(s, y, d) : le point à l'abscisse s le long de
// la face, à la hauteur y, à d m devant elle ; M(s, y, d) : une matrice dont le +x local court le long de la face, le +y
// monte, le +z sort de la face (pour les boîtes du kit : w le long, h en haut, d en épaisseur).
function face(x0, z0, x1, z1, nx, nz) {
  const L = Math.hypot(x1 - x0, z1 - z0), tx = (x1 - x0) / L, tz = (z1 - z0) / L;
  const F = { x0, z0, x1, z1, L, tx, tz, nx, nz };
  F.pt = (s, y, d = 0) => [x0 + tx * s + nx * d, y, z0 + tz * s + nz * d];
  F.M = (s, y, d = 0) => new THREE.Matrix4().makeBasis(new THREE.Vector3(tx, 0, tz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx, 0, nz)).setPosition(x0 + tx * s + nx * d, y, z0 + tz * s + nz * d);
  return F;
}

// ============================================================================================ les teintes
function teintes(O) {
  return {
    planches: O.c('bois', '#34302d'), planchesClair: O.c('bois', '#3f3c39'), planchesBleu: O.c('bois', '#2c2f38'),
    ocre: O.p('#c9a24a'), ocreFonce: O.p('#a8823a'), saumon: O.p('#d9694a'), saumonClair: O.p('#e27955'),
    sombre: O.p('#2a2624'), vitre: O.p('#7f8b93'), or: O.p('#c9a038'),
    socle: O.c('taille', '#d6cbb5'), ardoise: O.c('ardoise', '#4a4d52'), bardeaux: O.c('ardoise', '#3a302b'),
    // (l'enduit sur la pierre du kit, lisse : le béton du kit est un gravillon lavé, qui en faisait un mur de béton gris)
    enduit: O.c('taille', '#e3d6b5'), enduitOmbre: O.c('taille', '#cfc2a2'), pierreCreme: O.c('taille', '#d9ccb0'),
    persienne: O.p('#d9c9a3'), menuiserie: O.p('#ecebe5'), fer: O.p('#1c1c1c'), zinc: O.p('#9aa0a3'),
  };
}

// ============================================================================================ 1. LE PAVILLON
// UNE BAIE CINTRÉE (étroite, R3.md : 0,55 x 1,6 m) sur la face F, centrée en s, appui à y : vitre sombre à petits bois,
// archivolte ocre en relief, piédroits saumon, appui ocre sur deux consoles saumon.
function baie(lot, C, F, s, y, w = 0.55, h = 1.6) {
  const r = w / 2, yA = y + h - r, n = [F.nx, 0, F.nz];
  // la vitre (un demi-disque sur un rectangle), 3 cm devant la planche
  const pts = [F.pt(s - r, y, 0.03), F.pt(s + r, y, 0.03)];
  for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI; pts.push(F.pt(s + r * Math.cos(a), yA + r * Math.sin(a), 0.03)); }
  lot.polygone('peinture', pts, n, { couleur: C.vitre, uv: (x, yy, z, o) => { o[0] = 0.55; o[1] = 0.5; } });
  // les petits bois (croisillon)
  lot.boite('peinture', 0.025, h - 0.1, 0.02, F.M(s, y + (h - 0.1) / 2, 0.045), { bande: true, couleur: C.ocreFonce });
  lot.boite('peinture', w, 0.025, 0.02, F.M(s, y + h * 0.55, 0.045), { bande: true, couleur: C.ocreFonce });
  // l'archivolte ocre (un arc de planche) et les piédroits saumon
  const arc = [];
  for (let k = 0; k <= 10; k++) { const a = (k / 10) * Math.PI; arc.push(F.pt(s + (r + 0.05) * Math.cos(a), yA + (r + 0.05) * Math.sin(a), 0.05)); }
  lot.prisme('peinture', [[-0.05, -0.03], [0.05, -0.03], [0.05, 0.03], [-0.05, 0.03]], arc, { bande: true, couleur: C.ocre, haut: [F.nx, 0, F.nz] });
  for (const sg of [-1, 1]) lot.boite('peinture', 0.08, h - r, 0.05, F.M(s + sg * (r + 0.05), y + (h - r) / 2, 0.04), { bande: true, couleur: C.saumon });
  lot.boite('peinture', w + 0.26, 0.06, 0.1, F.M(s, y - 0.03, 0.06), { bande: true, couleur: C.ocre });
  for (const sg of [-1, 1]) lot.boite('peinture', 0.07, 0.14, 0.09, F.M(s + sg * (r + 0.02), y - 0.13, 0.05), { bande: true, couleur: C.saumon });
}
// UN GROUPE DE BAIES séparées de colonnettes sombres tournées (chapiteau cubique), dans un cadre de planches ocre
function groupeBaies(lot, C, F, s0, n, y, w = 0.55, h = 1.6, pas = 0.78) {
  const L = (n - 1) * pas, sa = s0 - L / 2;
  for (let i = 0; i < n; i++) baie(lot, C, F, sa + i * pas, y, w, h);
  for (let i = 0; i <= n; i++) {
    const s = sa - pas / 2 + i * pas, [x, , z] = F.pt(s, 0, 0.07);
    lot.tour('peinture', [[0.05, 0], [0.05, 0.06], [0.035, 0.1], [0.035, h - 0.2], [0.05, h - 0.15]], 8, new THREE.Matrix4().makeTranslation(x, y, z), { bande: true, couleur: C.sombre });
    lot.boite('peinture', 0.12, 0.1, 0.12, F.M(s, y + h - 0.1, 0.07), { bande: true, couleur: C.sombre });
  }
  // le cadre : linteau ocre (large, rinceaux figurés par un double filet saumon), montants et appui
  lot.boite('peinture', L + pas + 0.4, 0.34, 0.06, F.M(s0, y + h + 0.22, 0.05), { bande: true, couleur: C.ocre });
  lot.boite('peinture', L + pas + 0.4, 0.2, 0.06, F.M(s0, y - 0.2, 0.05), { bande: true, couleur: C.ocre });
  lot.boite('peinture', L + pas + 0.1, 0.03, 0.07, F.M(s0, y + h + 0.1, 0.07), { bande: true, couleur: C.saumon });
  lot.boite('peinture', L + pas + 0.1, 0.03, 0.07, F.M(s0, y + h + 0.22, 0.07), { bande: true, couleur: C.saumon });
  for (const sg of [-1, 1]) lot.boite('peinture', 0.2, h + 0.7, 0.06, F.M(s0 + sg * (L / 2 + pas / 2 + 0.1), y + h / 2 + 0.05, 0.05), { bande: true, couleur: C.ocre });
}
// LES PLANCHES d'un étage de la face F, de y0 à y1 : clins horizontaux (`clins`) ou planches verticales à couvre-joints.
function planches(lot, C, F, y0, y1, clins, teinte = C.planches) {
  lot.boite('bois', F.L, y1 - y0, 0.06, F.M(F.L / 2, (y0 + y1) / 2, -0.03), { couleur: teinte });
  if (clins) {
    for (let y = y0 + 0.19; y < y1 - 0.05; y += 0.19) lot.boite('bois', F.L + 0.02, 0.035, 0.03, F.M(F.L / 2, y, 0.012), { couleur: [teinte[0] * 0.7, teinte[1] * 0.7, teinte[2] * 0.7] });
  } else {
    for (let s = 0.15; s < F.L - 0.05; s += 0.15) lot.boite('bois', 0.035, y1 - y0 - 0.02, 0.025, F.M(s, (y0 + y1) / 2, 0.012), { couleur: [teinte[0] * 1.25, teinte[1] * 1.25, teinte[2] * 1.25] });
  }
}
// UN BANDEAU OCRE d'étage le long de la face (planche large moulurée, filet saumon dessous)
function bandeau(lot, C, F, y, h = 0.26, d = 0.08) {
  lot.boite('peinture', F.L + 0.08, h, d, F.M(F.L / 2, y, d / 2), { bande: true, couleur: C.ocre });
  lot.boite('peinture', F.L + 0.08, 0.04, d + 0.03, F.M(F.L / 2, y - h / 2 - 0.02, (d + 0.03) / 2), { bande: true, couleur: C.saumon });
}
// LA JUPE D'ÉCAILLES et le socle de pierre sous la face F (le socle descend sous le sol le plus bas devant elle)
function jupe(lot, E, C, F, kit) {
  let yMin = Infinity;
  for (let s = 0; s <= F.L; s += 1) { const [x, , z] = F.pt(s, 0, 0.6); yMin = Math.min(yMin, kit.sol(x, z)); }
  const yb = Math.min(yMin - 0.15, Y.socle - 0.2);
  lot.boite('taille', F.L + 0.12, Y.socle - yb, 0.14, F.M(F.L / 2, (Y.socle + yb) / 2, 0.07), { chanfrein: 0.02, couleur: C.socle });
  lot.boite('taille', F.L + 0.16, 0.06, 0.2, F.M(F.L / 2, Y.socle + 0.03, 0.1), { chanfrein: 0.015, couleur: C.socle });
  // la jupe, un peu évasée (5 cm de fruit), en écailles rondes (v monte : la toile est dessinée du haut vers le bas)
  const a = F.pt(-0.04, Y.socle + 0.06, 0.13), b = F.pt(F.L + 0.04, Y.socle + 0.06, 0.13), c = F.pt(F.L + 0.04, Y.jupe, 0.08), d = F.pt(-0.04, Y.jupe, 0.08);
  const T = TUILE_ECAILLES.ronde, H = (Y.jupe - Y.socle - 0.06) / T, U = (F.L + 0.08) / T;
  E.poly([a, b, c, d], [F.nx, 0.05, F.nz], [[0, 0], [U, 0], [U, H], [0, H]]);
  lot.boite('peinture', F.L + 0.1, 0.06, 0.1, F.M(F.L / 2, Y.jupe + 0.02, 0.09), { bande: true, couleur: C.saumon });
}
// UN TOIT À DEUX PANS d'ardoise, faîte le long de l'axe (a -> b), égout à yE, faîtage à yF, demi-largeur `demi`, débord
// `deb` en bas et aux bouts (`bouts` : [débord au début, à la fin]). Rend les quatre coins de chaque pan (pour les rives).
function toit(lot, C, a, b, demi, yE, yF, deb = 0.7, bouts = [0.6, 0.6], teinte = null) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L, nx = -tz, nz = tx;
  const pente = (yF - yE) / demi, yb = yE - deb * pente, pans = [];
  for (const sg of [-1, 1]) {
    const bas = (s) => [a[0] + tx * s + nx * sg * (demi + deb), yb, a[1] + tz * s + nz * sg * (demi + deb)];
    const haut = (s) => [a[0] + tx * s, yF, a[1] + tz * s];
    const P = [bas(-bouts[0]), bas(L + bouts[1]), haut(L + bouts[1]), haut(-bouts[0])];
    const e1 = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], e2 = [P[3][0] - P[0][0], P[3][1] - P[0][1], P[3][2] - P[0][2]];
    let N = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const l = Math.hypot(...N); N = N.map((v) => v / l); if (N[1] < 0) N = N.map((v) => -v);
    // (l'ardoise en plaque épaisse : le dessus, et le chant du débord)
    lot.polygone('ardoise', P, N, { couleur: teinte || C.ardoise, uv: (x, y, z, o) => { const s = (x - a[0]) * tx + (z - a[1]) * tz, d = Math.hypot(x - (a[0] + tx * s), z - (a[1] + tz * s)); o[0] = s / 3; o[1] = d / 3; } });
    const Pd = P.map((q) => [q[0], q[1] - 0.12, q[2]]);
    lot.polygone('ardoise', [Pd[0], Pd[3], Pd[2], Pd[1]], N.map((v, i) => (i === 1 ? -v : -v)), { couleur: [0.45, 0.45, 0.45], uv: (x, y, z, o) => { o[0] = x / 3; o[1] = z / 3; } });
    lot.polygone('ardoise', [P[0], P[1], Pd[1], Pd[0]], [nx * sg, 0, nz * sg], { couleur: [0.5, 0.5, 0.5], uv: (x, y, z, o) => { o[0] = x / 3; o[1] = y / 3; } });
    pans.push(P);
  }
  // le faîtage (un rouleau de zinc)
  lot.barre([a[0] - tx * bouts[0], yF + 0.03, a[1] - tz * bouts[0]], [b[0] + tx * bouts[1], yF + 0.03, b[1] + tz * bouts[1]], 0.12, 0.08, { couleur: C.zinc });
  return { pans, pente, yb };
}
// UNE RIVE SAUMON FESTONNÉE le long d'un rampant (de A en bas à B au faîte), 4 cm devant le pignon : une planche de
// 0,3 m dont le bord bas est découpé en festons, et un filet ocre
function rive(lot, C, A, B, n) {
  const p = lot.part('peinture'), L = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), nf = Math.max(3, Math.round(L / 0.28));
  const P = (t, dy) => [A[0] + (B[0] - A[0]) * t + n[0] * 0.05, A[1] + (B[1] - A[1]) * t + dy, A[2] + (B[2] - A[2]) * t + n[2] * 0.05];
  for (let k = 0; k < nf; k++) {
    const t0 = k / nf, t1 = (k + 1) / nf, base = p.n, pts = [P(t0, 0.02), P(t1, 0.02)];
    for (let j = 1; j < 6; j++) { const t = t1 - ((t1 - t0) * j) / 6; pts.push(P(t, -0.2 - 0.1 * Math.sin((Math.PI * j) / 6))); }
    for (const q of pts) lot.s(p, q[0], q[1], q[2], n[0], 0, n[2], 0.25, 0.5, C.saumonClair);
    for (let j = 1; j < pts.length - 1; j++) lot.tri(p, base, base + j, base + j + 1);
  }
  lot.barre(P(0, 0.04), P(1, 0.04), 0.06, 0.06, { couleur: C.ocre });
}
// UN PIGNON : le triangle de planches (ou d'écailles, `ecailles`) au-dessus de l'égout, sur la face F (du bord s = 0 au
// bord s = F.L), et ses rives festonnées
function pignon(lot, E, C, F, yE, yF, ecailles = false) {
  const m = F.L / 2, A = F.pt(0, yE, 0.005), B = F.pt(F.L, yE, 0.005), S = F.pt(m, yF, 0.005);
  if (ecailles) {
    const T = TUILE_ECAILLES.losange;
    E.poly([A, B, S], [F.nx, 0, F.nz], [[0, 0], [F.L / T, 0], [m / T, (yF - yE) / T]]);
  } else {
    lot.polygone('bois', [A, B, S], [F.nx, 0, F.nz], { couleur: C.planches, uv: (x, y, z, o) => { o[0] = (x + z) / 0.6; o[1] = y / 0.6; } });
    for (let s = 0.15; s < F.L - 0.05; s += 0.15) {
      const h = (yF - yE) * (1 - Math.abs(s - m) / m);
      if (h > 0.1) lot.boite('bois', 0.035, h, 0.025, F.M(s, yE + h / 2, 0.018), { couleur: C.planchesClair });
    }
  }
  const n = [F.nx, 0, F.nz];
  rive(lot, C, F.pt(-0.55, yE - 0.5, 0.1), F.pt(m, yF + 0.12, 0.1), n);
  rive(lot, C, F.pt(F.L + 0.55, yE - 0.5, 0.1), F.pt(m, yF + 0.12, 0.1), n);
  // l'épi du pignon
  const [x, , z] = F.pt(m, 0, 0.12);
  lot.tour('peinture', [[0.06, 0], [0.09, 0.1], [0.05, 0.25], [0.07, 0.35], [0.001, 0.75]], 8, new THREE.Matrix4().makeTranslation(x, yF + 0.05, z), { bande: true, couleur: C.or });
}

function* pavillon(ctx) {
  const { kit, groupe } = ctx, O = outilsB7(kit, ctx.Monde), C = teintes(O), lot = new kit.Lot('pavillon');
  const E = new Ecailles('ronde'), EL = new Ecailles('losange');
  const { x0, x1 } = PAV;
  // les faces : façade peinte (x+), façade du jardin (x-), le pignon de la tour (z+)
  const faces = {
    estL: face(x1, LONGUE.z1, x1, LONGUE.z0, 1, 0), ouestL: face(x0, LONGUE.z0, x0, LONGUE.z1, -1, 0),
    estE: face(x1, ENC.z1, x1, ENC.z0, 1, 0), ouestE: face(x0, ENC.z0, x0, ENC.z1, -1, 0),
    estT: face(x1 + TOUR.saillie, TOUR.z1, x1 + TOUR.saillie, TOUR.z0, 1, 0), ouestT: face(x0, TOUR.z0, x0, TOUR.z1, -1, 0),
    sudT: face(x0, TOUR.z1, x1 + TOUR.saillie, TOUR.z1, 0, 1),
  };
  // (le flanc nord de la tour, au-dessus du toit de l'aile longue : des planches verticales jusqu'à son égout)
  planches(lot, C, face(x1 + TOUR.saillie, TOUR.z0, x0, TOUR.z0, 0, -1), Y.egout - 0.3, Y.tourEgout, false);
  // ---- le corps : socle, jupe, planches (clins au rez-de-chaussée, verticales à l'étage), bandeaux
  for (const [k, F] of Object.entries(faces)) {
    if (ctx.budget()) yield;
    jupe(lot, E, C, F, kit);
    const tour = k.endsWith('T');
    planches(lot, C, F, Y.jupe, Y.etage, true, k.startsWith('ouest') ? C.planchesBleu : C.planches);
    planches(lot, C, F, Y.etage, tour ? Y.tourEgout : Y.egout, false, k.startsWith('ouest') ? C.planchesBleu : C.planches);
    bandeau(lot, C, F, Y.etage, 0.36, 0.09);
    if (tour) bandeau(lot, C, F, 16.75, 0.2, 0.08);
    // les montants d'angle saumon
    for (const s of [0.06, F.L - 0.06]) lot.boite('peinture', 0.14, (tour ? Y.tourEgout : Y.egout) - Y.jupe, 0.1, F.M(s, (Y.jupe + (tour ? Y.tourEgout : Y.egout)) / 2, 0.05), { bande: true, couleur: C.saumon });
  }
  if (ctx.budget()) yield;
  // ---- les baies (R3.md Z15-02, Z15-07, Z15-16) : l'aile longue, dix baies à l'étage en arcature continue, deux groupes
  // (3 et 4) au rez-de-chaussée ; la tour, 2 / 3 / 5 ; l'aile en encorbellement, une baie en bas
  for (const F of [faces.estL, faces.ouestL]) {
    if (ctx.budget()) yield;
    groupeBaies(lot, C, F, F.L / 2, 10, Y.etage + 0.55, 0.5, 1.55, 0.7);
    if (ctx.budget()) yield;
    groupeBaies(lot, C, F, 1.7, 3, Y.jupe + 0.55, 0.55, 1.65, 0.78);
    groupeBaies(lot, C, F, F.L - 2.2, 4, Y.jupe + 0.55, 0.55, 1.65, 0.78);
  }
  for (const F of [faces.estT, faces.ouestT]) {
    if (ctx.budget()) yield;
    groupeBaies(lot, C, F, F.L / 2, 2, Y.jupe + 0.55, 0.6, 1.8, 0.95);
    groupeBaies(lot, C, F, F.L / 2, 3, Y.etage + 0.5, 0.55, 1.6, 0.85);
    groupeBaies(lot, C, F, F.L / 2, 5, 16.95, 0.42, 1.2, 0.62);
  }
  if (ctx.budget()) yield;
  groupeBaies(lot, C, faces.sudT, faces.sudT.L / 2, 3, Y.jupe + 0.55, 0.55, 1.65, 0.8);
  groupeBaies(lot, C, faces.sudT, faces.sudT.L / 2, 3, Y.etage + 0.5, 0.55, 1.6, 0.8);
  groupeBaies(lot, C, faces.ouestE, faces.ouestE.L / 2, 2, Y.etage + 0.55, 0.5, 1.5, 0.75);
  groupeBaies(lot, C, faces.estE, faces.estE.L / 2, 2, Y.jupe + 0.55, 0.55, 1.6, 0.8);
  if (ctx.budget()) yield;
  // ---- l'aile en encorbellement : l'étage avance de 0,45 m sur des consoles saumon et une contrefiche sombre ; la loggia
  // de sept balustres saumon sous de petites arcatures (R3.md Z15-13, Z15-16)
  {
    const F = faces.estE, av = 0.45;
    lot.boite('bois', F.L, Y.egout - Y.etage - 0.3, av, F.M(F.L / 2, (Y.etage + 0.3 + Y.egout) / 2, av / 2), { couleur: C.planches });
    lot.boite('peinture', F.L + 0.1, 0.28, av + 0.12, F.M(F.L / 2, Y.etage + 0.16, av / 2 + 0.03), { bande: true, couleur: C.ocre });
    for (let s = 0.3; s < F.L; s += 0.6) lot.boite('peinture', 0.14, 0.4, av, F.M(s, Y.etage - 0.2, av / 2 - 0.02), { bande: true, couleur: C.saumon });
    lot.barre(F.pt(0.25, Y.etage - 1.4, 0.05), F.pt(0.25, Y.etage, av), 0.12, 0.12, { couleur: C.sombre, haut: [F.tx, 0, F.tz] });
    // la loggia : un vide sombre, sept balustres tournés, une lisse, des arcatures ocre
    const yl = Y.etage + 0.4, hl = 1.7;
    lot.boite('peinture', F.L - 0.5, hl, 0.02, F.M(F.L / 2, yl + hl / 2, av + 0.01), { bande: true, couleur: O.p('#1b1816') });
    for (let i = 0; i < 7; i++) {
      const s = 0.45 + (i * (F.L - 0.9)) / 6, [x, , z] = F.pt(s, 0, av + 0.08);
      lot.tour('peinture', [[0.05, 0], [0.07, 0.08], [0.04, 0.2], [0.075, 0.45], [0.045, 0.62], [0.06, 0.7]], 8, new THREE.Matrix4().makeTranslation(x, yl, z), { bande: true, couleur: C.saumon });
      if (i < 6) {
        const sa = s, sb = 0.45 + ((i + 1) * (F.L - 0.9)) / 6, arc = [];
        for (let k = 0; k <= 6; k++) { const t = k / 6; arc.push(F.pt(sa + (sb - sa) * t, yl + hl - 0.25 + 0.18 * Math.sin(Math.PI * t), av + 0.07)); }
        lot.prisme('peinture', [[-0.04, -0.025], [0.04, -0.025], [0.04, 0.025], [-0.04, 0.025]], arc, { bande: true, couleur: C.ocre, haut: [F.nx, 0, F.nz] });
      }
    }
    lot.boite('peinture', F.L - 0.4, 0.08, 0.14, F.M(F.L / 2, yl + 0.74, av + 0.07), { bande: true, couleur: C.saumon });
    lot.boite('peinture', F.L - 0.3, 0.12, 0.1, F.M(F.L / 2, yl + hl - 0.02, av + 0.06), { bande: true, couleur: C.ocre });
  }
  if (ctx.budget()) yield;
  // ---- le porche (R3.md Z15-10) : quatre marches gris foncé, deux poteaux octogonaux sombres sur socles de pierre,
  // toit raide de bardeaux sombres, tympan saumon et panneau ocre en losange, épi doré ; la porte à deux vantaux
  {
    const P = PORCHE, xa = x1, xb = x1 + P.prof, zm = (P.z0 + P.z1) / 2, yT = kit.sol(xb + 0.5, zm);
    // (quatre marches empilées : la marche k, du bas, va du porche à (4 - k) girons de lui, son dessus à (k + 1)
    // hauteurs du sol de la terrasse)
    const nM = P.marches, hM = (P.y - yT) / nM, gM = 0.3, yPied = yT - 0.3;
    for (let k = 0; k < nM; k++) {
      const lg = (nM - k) * gM, yH = yT + (k + 1) * hM;
      lot.boite('taille', lg, yH - yPied, P.z1 - P.z0 + 0.3, O.T(xb + lg / 2, (yH + yPied) / 2, zm), { chanfrein: 0.01, couleur: O.c('taille', '#6f6c68') });
    }
    lot.boite('taille', P.prof, P.y - (yT - 0.3), P.z1 - P.z0 + 0.3, O.T((xa + xb) / 2, (P.y + yT - 0.3) / 2, zm), { chanfrein: 0.015, couleur: O.c('taille', '#77736e') });
    const yP = P.y + 2.55;
    for (const z of [P.z0 - 0.05, P.z1 + 0.05]) {
      lot.boite('taille', 0.3, 0.35, 0.3, O.T(xb - 0.18, P.y + 0.17, z), { chanfrein: 0.02, couleur: C.socle });
      lot.tour('peinture', [[0.09, 0], [0.09, 1.9], [0.12, 1.98], [0.12, 2.2]], 8, O.T(xb - 0.18, P.y + 0.35, z), { bande: true, couleur: C.sombre, facettes: true, vif: true, a0: Math.PI / 8 });
    }
    // le toit du porche (bardeaux sombres), faîte le long de x, pignon vers x+ (tympan saumon, panneau ocre)
    const r = toit(lot, C, [xa - 0.2, zm], [xb, zm], (P.z1 - P.z0) / 2 + 0.25, yP, yP + 1.5, 0.2, [0, 0.25], C.bardeaux);
    const Fp = face(xb, P.z1 + 0.25, xb, P.z0 - 0.25, 1, 0);
    lot.polygone('peinture', [Fp.pt(0, yP, 0.02), Fp.pt(Fp.L, yP, 0.02), Fp.pt(Fp.L / 2, yP + 1.45, 0.02)], [1, 0, 0], { couleur: C.saumon });
    const m = Fp.L / 2;
    lot.polygone('peinture', [Fp.pt(m, yP + 0.2, 0.04), Fp.pt(m + 0.35, yP + 0.6, 0.04), Fp.pt(m, yP + 1.0, 0.04), Fp.pt(m - 0.35, yP + 0.6, 0.04)], [1, 0, 0], { couleur: C.ocre });
    rive(lot, C, Fp.pt(-0.1, yP - 0.1, 0.05), Fp.pt(m, yP + 1.55, 0.05), [1, 0, 0]);
    rive(lot, C, Fp.pt(Fp.L + 0.1, yP - 0.1, 0.05), Fp.pt(m, yP + 1.55, 0.05), [1, 0, 0]);
    lot.boite('peinture', 0.18, 0.2, Fp.L, O.T(xb, yP - 0.08, zm), { bande: true, couleur: C.ocre });
    const [ex, , ez] = Fp.pt(m, 0, 0.1);
    lot.tour('peinture', [[0.07, 0], [0.1, 0.12], [0.05, 0.3], [0.08, 0.42], [0.001, 0.85]], 8, O.T(ex, yP + 1.5, ez), { bande: true, couleur: C.or });
    // la porte à deux vantaux brun sombre à petites vitres hautes, la lanterne, la plaque émaillée
    const Fd = face(x1, P.z1 - 0.1, x1, P.z0 + 0.1, 1, 0);
    lot.boite('peinture', 1.25, 2.3, 0.06, Fd.M(Fd.L / 2, P.y + 1.15, 0.03), { bande: true, couleur: O.p('#3a2a20') });
    for (const sg of [-1, 1]) lot.boite('peinture', 0.42, 0.55, 0.02, Fd.M(Fd.L / 2 + sg * 0.3, P.y + 1.75, 0.07), { bande: true, couleur: C.vitre });
    lot.boite('peinture', 0.03, 2.3, 0.02, Fd.M(Fd.L / 2, P.y + 1.15, 0.07), { bande: true, couleur: C.ocre });
    lot.boite('peinture', 0.2, 0.28, 0.02, Fd.M(Fd.L + 0.35, P.y + 1.5, 0.02), { bande: true, couleur: O.p('#f2f0ea') });
    lot.geo('verre', new THREE.BoxGeometry(0.18, 0.28, 0.18), O.T(xa + 0.9, yP - 0.35, zm));
  }
  if (ctx.budget()) yield;
  // ---- les pignons : la tour (écailles en losange, vers x+ et vers x-), l'aile en encorbellement (vers x+)
  const Tz = TOUR, xe = x1 + Tz.saillie;
  pignon(lot, EL, C, face(xe, Tz.z1, xe, Tz.z0, 1, 0), Y.tourEgout, Y.tourFaite, true);
  pignon(lot, EL, C, face(x0, Tz.z0, x0, Tz.z1, -1, 0), Y.tourEgout, Y.tourFaite, true);
  pignon(lot, EL, C, face(x1 + 0.45, ENC.z1, x1 + 0.45, ENC.z0, 1, 0), Y.egout, Y.encFaite, false);
  // (sous le tympan de la tour, le bandeau ocre sculpté de l'égout)
  bandeau(lot, C, face(xe, Tz.z1, xe, Tz.z0, 1, 0), Y.tourEgout - 0.12, 0.24, 0.1);
  bandeau(lot, C, face(x0, Tz.z0, x0, Tz.z1, -1, 0), Y.tourEgout - 0.12, 0.24, 0.1);
  if (ctx.budget()) yield;
  // ---- les toits d'ardoise à longs débords : l'aile longue (faîte le long de z, contre la tour et le bâtiment enduit),
  // la tour (faîte le long de x), l'aile en encorbellement (faîte le long de x) ; la sous-face sombre des débords
  const xm = (x0 + x1) / 2, demi = (x1 - x0) / 2;
  if (ctx.budget()) yield;
  const tL = toit(lot, C, [xm, ENC.z0], [xm, TOUR.z0], demi, Y.egout, Y.faite, 0.75, [0, 0.2]);
  toit(lot, C, [x0, (Tz.z0 + Tz.z1) / 2], [xe, (Tz.z0 + Tz.z1) / 2], (Tz.z1 - Tz.z0) / 2, Y.tourEgout, Y.tourFaite, 0.6, [0.6, 0.6]);
  toit(lot, C, [xm, (ENC.z0 + ENC.z1) / 2], [x1 + 0.45, (ENC.z0 + ENC.z1) / 2], (ENC.z1 - ENC.z0) / 2, Y.egout, Y.encFaite, 0.45, [0, 0.6]);
  // les rives saumon le long des égouts de l'aile longue, trois châssis de toit et une souche
  for (const F of [face(x1 + 0.75, LONGUE.z1, x1 + 0.75, LONGUE.z0, 1, 0), face(x0 - 0.75, LONGUE.z0, x0 - 0.75, LONGUE.z1, -1, 0)]) {
    lot.boite('peinture', F.L + 0.3, 0.26, 0.05, F.M(F.L / 2, tL.yb - 0.1, 0.02), { bande: true, couleur: C.saumonClair });
    lot.boite('peinture', F.L + 0.3, 0.05, 0.08, F.M(F.L / 2, tL.yb + 0.04, 0.03), { bande: true, couleur: C.ocre });
  }
  // (les châssis sur le pan est, à 2 m du nu du mur : le pan y est à l'égout plus 2 m de pente ; il descend vers x+)
  for (let i = 0; i < 3; i++) {
    const z = LONGUE.z0 + 1.5 + i * 2.2, q = 2.0, y = Y.egout + q * tL.pente;
    const m4 = new THREE.Matrix4().makeRotationZ(-Math.atan(tL.pente)).setPosition(x1 - q, y + 0.06, z);
    lot.boite('peinture', 0.9, 0.1, 0.7, m4, { bande: true, couleur: O.p('#262a2e') });
  }
  lot.boite('brique', 0.6, 1.4, 0.8, O.T(xm - 1.2, Y.faite - 0.2, -99.0), { chanfrein: 0.02, couleur: O.c('brique', '#8a4a3a') });
  lot.boite('taille', 0.72, 0.1, 0.92, O.T(xm - 1.2, Y.faite + 0.55, -99.0), { chanfrein: 0.02, couleur: C.socle });
  if (ctx.budget()) yield;
  if (ctx.budget()) yield;
  groupe.add(lot.maillages('pavillon de Suède et de Norvège'));
  for (const [acc, nom] of [[E, 'pavillon · jupe d’écailles'], [EL, 'pavillon · tympans en losange']]) {
    const me = acc.maillage(kit, nom, ctx.Monde.dx);
    if (me) groupe.add(me);
  }
}

// ============================================================================================ 2. LE BÂTIMENT ENDUIT, LE PARVIS
// Z15-05, Z15-15, Z15-18 : l'hôtel enduit crème, sa façade de cinq travées vers x- ; porte au centre (travée 3) sous une
// console et un cartouche, trois marches à rampes noires, deux lanternes ; persiennes beiges ouvertes, balconnets de
// fer forgé à l'étage ; comble mansardé d'ardoise, trois lucarnes de pierre, trois souches claires.
function* enduit(ctx) {
  const { kit, groupe } = ctx, O = outilsB7(kit, ctx.Monde), C = teintes(O), lot = new kit.Lot('bâtiment enduit');
  const B = ENDUIT;
  // le corps : un bloc d'enduit crème, soubassement plus sombre, refends au rez-de-chaussée, bandeau, corniche
  lot.boite('taille', B.x1 - B.x0, B.egout - B.sol, B.z1 - B.z0, O.T((B.x0 + B.x1) / 2, (B.egout + B.sol) / 2, (B.z0 + B.z1) / 2), { couleur: C.enduit });
  const faces = [face(B.x0, B.z1, B.x0, B.z0, -1, 0), face(B.x0, B.z0, B.x1, B.z0, 0, -1), face(B.x1, B.z0, B.x1, B.z1, 1, 0), face(B.x1, B.z1, B.x0, B.z1, 0, 1)];
  for (const F of faces) {
    lot.boite('taille', F.L + 0.1, B.plancher - B.sol, 0.08, F.M(F.L / 2, (B.plancher + B.sol) / 2, 0.04), { couleur: O.c('taille', '#c9bfa6') });
    for (let y = B.plancher + 0.42; y < B.etage - 0.2; y += 0.42) lot.boite('taille', F.L + 0.02, 0.035, 0.02, F.M(F.L / 2, y, 0.005), { couleur: C.enduitOmbre });
    lot.boite('taille', F.L + 0.14, 0.24, 0.1, F.M(F.L / 2, B.etage, 0.05), { couleur: C.enduit });
    lot.boite('taille', F.L + 0.3, 0.3, 0.2, F.M(F.L / 2, B.egout - 0.1, 0.1), { chanfrein: 0.03, couleur: C.pierreCreme });
  }
  if (ctx.budget()) yield;
  // la façade principale (x-) : cinq travées ; les autres faces, des fenêtres à persiennes aussi (moins de détail)
  const fenetre = (F, s, y, w, h, balcon) => {
    lot.boite('peinture', w, h, 0.04, F.M(s, y + h / 2, 0.01), { bande: true, couleur: C.vitre });
    lot.boite('peinture', w + 0.02, 0.05, 0.05, F.M(s, y + h * 0.62, 0.03), { bande: true, couleur: C.menuiserie });
    lot.boite('peinture', 0.05, h, 0.05, F.M(s, y + h / 2, 0.03), { bande: true, couleur: C.menuiserie });
    lot.boite('taille', w + 0.3, 0.1, 0.12, F.M(s, y - 0.05, 0.06), { couleur: C.enduitOmbre });
    lot.boite('taille', w + 0.24, 0.18, 0.08, F.M(s, y + h + 0.09, 0.04), { couleur: C.enduit });
    for (const sg of [-1, 1]) {
      lot.boite('peinture', w / 2 + 0.02, h, 0.04, F.M(s + sg * (w * 0.75 + 0.06), y + h / 2, 0.05), { bande: true, couleur: C.persienne });
      // (les lames : un filet d'ombre tous les 30 cm, sinon le volet n'est qu'un panneau uni)
      for (let yl = y + 0.15; yl < y + h - 0.1; yl += 0.3) lot.boite('peinture', w / 2 - 0.04, 0.025, 0.012, F.M(s + sg * (w * 0.75 + 0.06), yl, 0.072), { bande: true, couleur: C.persienne.map((v) => v * 0.55) });
    }
    if (balcon) {
      lot.boite('peinture', w + 0.2, 0.04, 0.3, F.M(s, y + 0.05, 0.15), { bande: true, couleur: C.fer });
      for (let k = 0; k <= 8; k++) lot.barre(F.pt(s - w / 2 - 0.1 + ((w + 0.2) * k) / 8, y + 0.05, 0.3), F.pt(s - w / 2 - 0.1 + ((w + 0.2) * k) / 8, y + 0.9, 0.3), 0.015, 0.015, { couleur: C.fer });
      lot.barre(F.pt(s - w / 2 - 0.1, y + 0.9, 0.3), F.pt(s + w / 2 + 0.1, y + 0.9, 0.3), 0.03, 0.03, { couleur: C.fer });
      lot.barre(F.pt(s - w / 2 - 0.1, y + 0.45, 0.3), F.pt(s + w / 2 + 0.1, y + 0.45, 0.3), 0.02, 0.02, { couleur: C.fer });
    }
  };
  const Fp = faces[0], nT = 5, pasT = Fp.L / nT;
  for (let i = 0; i < nT; i++) {
    const s = pasT * (i + 0.5);
    if (i !== 2) fenetre(Fp, s, B.plancher + 0.6, 1.1, 2.1, false);
    fenetre(Fp, s, B.etage + 0.45, 1.1, 2.2, true);
  }
  for (const F of faces.slice(1)) {
    if (ctx.budget()) yield;
    const n = Math.max(2, Math.round(F.L / 2.4));
    for (let i = 0; i < n; i++) {
      const s = (F.L / n) * (i + 0.5);
      // (la face z+, contre le pavillon, n'a de fenêtres que sur sa partie libre, côté jardin)
      if (F === faces[3] && s < F.L - 4.4) continue;
      fenetre(F, s, B.plancher + 0.6, 1.0, 2.0, false); fenetre(F, s, B.etage + 0.45, 1.0, 2.1, false);
    }
  }
  if (ctx.budget()) yield;
  // la porte d'entrée : fer forgé noir et verre, console et cartouche au-dessus, trois marches et rampes, deux lanternes,
  // le nom du musée en lettres de relief (une bande claire)
  {
    const F = Fp, s = F.L / 2, yS = kit.sol(B.x0 - 1.2, (B.z0 + B.z1) / 2), nM = 3, hM = (B.plancher - yS) / nM;
    lot.boite('peinture', 1.4, 2.7, 0.05, F.M(s, B.plancher + 1.35, 0.02), { bande: true, couleur: C.vitre });
    for (let k = 0; k <= 6; k++) lot.boite('peinture', 0.03, 2.6, 0.03, F.M(s - 0.6 + k * 0.2, B.plancher + 1.3, 0.05), { bande: true, couleur: C.fer });
    lot.boite('peinture', 1.4, 0.05, 0.04, F.M(s, B.plancher + 1.9, 0.05), { bande: true, couleur: C.fer });
    lot.boite('taille', 1.9, 0.16, 0.14, F.M(s, B.plancher + 2.95, 0.08), { chanfrein: 0.02, couleur: C.pierreCreme });
    lot.boite('taille', 0.5, 0.45, 0.22, F.M(s, B.plancher + 3.3, 0.11), { chanfrein: 0.04, couleur: C.pierreCreme });
    lot.boite('peinture', 3.6, 0.22, 0.02, F.M(s, B.plancher + 3.75, 0.02), { bande: true, couleur: O.p('#cdbf9d') });
    for (let k = 0; k < nM; k++) {
      const d = 0.35 * (nM - k), y0 = yS - 0.2;
      lot.boite('taille', 2.4 - k * 0.2, yS + (k + 1) * hM - y0, d, F.M(s, (y0 + yS + (k + 1) * hM) / 2, d / 2), { chanfrein: 0.01, couleur: O.c('taille', '#bdb6a6') });
    }
    for (const sg of [-1, 1]) {
      lot.barre(F.pt(s + sg * 1.1, yS + 0.9, 1.05), F.pt(s + sg * 1.1, B.plancher + 0.9, 0.05), 0.04, 0.04, { couleur: C.fer });
      lot.barre(F.pt(s + sg * 1.1, yS, 1.05), F.pt(s + sg * 1.1, yS + 0.9, 1.05), 0.035, 0.035, { couleur: C.fer });
      const [x, , z] = F.pt(s + sg * 1.25, 0, 0.25);
      lot.boite('peinture', 0.05, 0.05, 0.25, F.M(s + sg * 1.25, B.plancher + 2.6, 0.12), { bande: true, couleur: C.fer });
      lot.geo('verre', new THREE.BoxGeometry(0.2, 0.34, 0.2), O.T(x, B.plancher + 2.35, z));
      lot.tour('peinture', [[0.14, 0], [0.02, 0.14]], 4, O.T(x, B.plancher + 2.52, z), { bande: true, couleur: C.fer, a0: Math.PI / 4 });
    }
  }
  if (ctx.budget()) yield;
  // le comble mansardé : brisis d'ardoise très raide (de l'égout à +22,3), terrasson de zinc peu pente jusqu'au faîte ;
  // trois lucarnes de pierre sur la façade, trois souches claires
  {
    const r1 = 0.95, r2 = 3.3, cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2, hx = (B.x1 - B.x0) / 2 + 0.15, hz = (B.z1 - B.z0) / 2 + 0.15;
    const bas = [[cx - hx, cz - hz], [cx + hx, cz - hz], [cx + hx, cz + hz], [cx - hx, cz + hz]];
    const haut = [[cx - hx + r1, cz - hz + r1], [cx + hx - r1, cz - hz + r1], [cx + hx - r1, cz + hz - r1], [cx - hx + r1, cz + hz - r1]];
    const sommet = [[cx - hx + r2, cz - hz + r2 * 0.75], [cx + hx - r2, cz - hz + r2 * 0.75], [cx + hx - r2, cz + hz - r2 * 0.75], [cx - hx + r2, cz + hz - r2 * 0.75]];
    const plan = (P, cle, c) => {
      const e1 = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], e2 = [P[P.length - 1][0] - P[0][0], P[P.length - 1][1] - P[0][1], P[P.length - 1][2] - P[0][2]];
      let N = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; const l = Math.hypot(...N); N = N.map((v) => v / l); if (N[1] < 0) N = N.map((v) => -v);
      lot.polygone(cle, P, N, { couleur: c, uv: (x, y, z, o) => { o[0] = (x + z) / 3; o[1] = y / 3; } });
    };
    for (let k = 0; k < 4; k++) {
      const a = bas[k], b = bas[(k + 1) % 4], c = haut[(k + 1) % 4], d = haut[k];
      plan([[a[0], B.egout, a[1]], [b[0], B.egout, b[1]], [c[0], B.brisis, c[1]], [d[0], B.brisis, d[1]]], 'ardoise', O.c('ardoise', '#5a6068'));
      const e = sommet[(k + 1) % 4], f = sommet[k];
      plan([[d[0], B.brisis, d[1]], [c[0], B.brisis, c[1]], [e[0], B.faite, e[1]], [f[0], B.faite, f[1]]], 'peinture', C.zinc);
    }
    plan(sommet.map(([x, z]) => [x, B.faite, z]), 'peinture', C.zinc);
    // les lucarnes (façade x-) : jouées de pierre, fenêtre, fronton cintré
    const F = face(B.x0 - 0.15 + 0.45, B.z1 - 0.3, B.x0 - 0.15 + 0.45, B.z0 + 0.3, -1, 0);
    for (let i = 0; i < 3; i++) {
      const s = F.L / 2 + (i - 1) * 3.4, y = B.egout + 0.35;
      lot.boite('taille', 1.35, 1.9, 1.0, F.M(s, y + 0.95, -0.4), { chanfrein: 0.03, couleur: C.pierreCreme });
      lot.boite('peinture', 0.8, 1.3, 0.04, F.M(s, y + 0.85, 0.11), { bande: true, couleur: C.vitre });
      lot.boite('peinture', 0.04, 1.3, 0.05, F.M(s, y + 0.85, 0.13), { bande: true, couleur: C.menuiserie });
      // (le fronton cintré : un demi-cylindre couché, l'axe le long de la normale de la face, l'arrondi en haut)
      lot.geo('taille', new THREE.CylinderGeometry(0.72, 0.72, 1.0, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), F.M(s, y + 1.9, -0.4), { couleur: C.pierreCreme });
    }
    for (const [dx, dz] of [[-3.5, -3.2], [2.8, 3.4], [4.8, -2.6]]) {
      lot.boite('taille', 0.7, 1.6, 1.1, O.T(cx + dx, B.faite + 0.3, cz + dz), { chanfrein: 0.02, couleur: C.pierreCreme });
      lot.boite('taille', 0.82, 0.1, 1.22, O.T(cx + dx, B.faite + 1.12, cz + dz), { chanfrein: 0.02, couleur: C.pierreCreme });
    }
  }
  if (ctx.budget()) yield;
  // ---- le parvis brique-rouge, fermé de piliers crème, d'une grille noire (côté parc), d'un portail (au bout de l'allée
  // du musée), d'une haie de 1,2 m
  {
    const P = PARVIS;
    O.drape(lot, 'brique#sol', [[P.x0, P.z0], [P.x1, P.z0], [P.x1, P.z1], [P.x0, P.z1]], { pas: 0.5, dy: 0.035, tuile: 1.0, couleur: O.taches(O.c('brique', '#94584a'), 411, 0.1) });
    if (ctx.budget()) yield;
    const ligne = [[P.x0, P.z0], [P.x0, P.z1]];
    groupe.add(yield* kit.grillePas({ ligne, h: 1.5, muret: 0.45, pointes: true, travee: 2.5, materiauMuret: 'taille' }, ctx.budget));   // (lot C6 : en tranches)
    if (ctx.budget()) yield;
    groupe.add(kit.haieTaillee({ ligne: [[P.x0 - 0.75, P.z0 + 0.2], [P.x0 - 0.75, P.z1 - 0.3]], h: 1.2, ep: 0.8, essence: 'troene' }));
    const pilier = (x, z) => {
      const y = kit.sol(x, z);
      lot.boite('taille', 0.55, 2.0, 0.55, O.T(x, y + 0.9, z), { chanfrein: 0.02, couleur: C.pierreCreme });
      lot.boite('taille', 0.68, 0.12, 0.68, O.T(x, y + 1.96, z), { chanfrein: 0.02, couleur: C.pierreCreme });
      lot.tour('taille', [[0.2, 0], [0.22, 0.05], [0.12, 0.25], [0.001, 0.32]], 8, O.T(x, y + 2.02, z), { couleur: C.pierreCreme });
    };
    if (ctx.budget()) yield;
    pilier(P.x0, P.z0); pilier(P.x0, P.z1); pilier(P.x0 + 0.45, P.z1 + 0.05); pilier(P.x1 - 0.4, P.z1 + 0.05);
    groupe.add(kit.portail({ x: (P.x0 + P.x1) / 2 + 0.02, z: P.z1 + 0.05, cap: 180, largeur: P.x1 - P.x0 - 1.3, type: 'simple', h: 1.8 }));
    // le panneau d'exposition noir, sur le parvis
    const y = kit.sol(P.x0 + 1.2, P.z1 - 2);
    lot.boite('peinture', 0.9, 1.3, 0.05, O.T(P.x0 + 1.2, y + 1.15, P.z1 - 2.0), { bande: true, couleur: O.p('#1d1d1d') });
    for (const s of [-0.35, 0.35]) lot.boite('peinture', 0.04, 0.6, 0.04, O.T(P.x0 + 1.2 + s, y + 0.3, P.z1 - 2.0), { bande: true, couleur: O.p('#1d1d1d') });
  }
  if (ctx.budget()) yield;
  if (ctx.budget()) yield;
  // (le parvis de brique drapé au sol : hors de la carte fixe des ombres de contact, voir O.horsContact)
  groupe.add(O.horsContact(lot.maillages('bâtiment enduit du musée')));
}

// ============================================================================================ 3. LE JARDIN, LA TERRASSE
function* abords(ctx) {
  const { kit, groupe } = ctx, O = outilsB7(kit, ctx.Monde), C = teintes(O), lot = new kit.Lot('abords du musée');
  // ---- le jardin clos : un mur de moellons de 1,8 m (côté parc et côté sud-ouest), la pelouse, des arbustes
  {
    // (ses deux pans, l'un après l'autre : un mur de pierre du kit à deux faces est une pièce lourde)
    const J = JARDIN;
    for (const ligne of [[[J.x0, J.z0], [J.x0, J.z1]], [[J.x0, J.z1], [J.x1, J.z1]]]) {
      const pts = kit.reechantillonner(ligne, 1.0), profil = pts.map((q) => [q.s, Math.max(kit.sol(q.x - 0.4, q.z), kit.sol(q.x, q.z + 0.4)) + 1.8]);
      const mur = yield* kit.murPierrePas({ ligne, cote: 'droite', deuxFaces: true, yBas: null, yHaut: profil, ep: 0.42, pierre: 'calcaire', chaperon: 0.12, plinthe: false }, ctx.budget);   // (lot C6 : en tranches)
      // (relecture : les moellons du kit sont d'un calcaire blond presque blanc ; ce mur-ci est beige-gris, #a39a8a
      // d'après R3.md Z14-19, et sombre sous les arbres — on ramène la couleur de ses sommets à cette pierre-là)
      mur.traverse((m) => {
        if (!m.isMesh || !m.material || m.material.name !== 'kit · moellons' || !m.geometry.attributes.color) return;
        const k = O.c('moellons', '#a39a8a'), C = m.geometry.attributes.color;
        for (let i = 0; i < C.count; i++) C.setXYZ(i, C.getX(i) * k[0], C.getY(i) * k[1], C.getZ(i) * k[2]);
        C.needsUpdate = true;
      });
      groupe.add(mur);
      if (ctx.budget()) yield;
    }
    O.drape(lot, 'gazon#sol', [[J.x0 + 0.25, J.z0], [J.x1, J.z0], [J.x1, J.z1 - 0.25], [J.x0 + 0.25, J.z1 - 0.25]], { pas: 1.0, dy: 0.03, couleur: O.taches([0.9, 0.95, 0.85], 421, 0.15) });
    for (let i = 0; i < 6; i++) {
      const x = J.x0 + 1.0 + (i % 2) * 2.2, z = J.z0 + 2.2 + i * 2.6;
      O.buisson(lot, x, kit.sol(x, z), z, 0.6 + 0.25 * kit.alea(x, z, 431), i % 3 ? kit.TEINTES.troene : kit.TEINTES.buis, i);
    }
  }
  if (ctx.budget()) yield;
  // ---- la terrasse de 2025 : pavés de granit gris mêlés posés en arcs (R3.md Z15-17), sur un lit sombre qui fait les
  // joints ; la marche de pierre au pied de la façade ; le garde-corps d'acier noir au bord du coteau
  {
    const T = TERRASSE, sombre = [0.35, 0.33, 0.3];
    O.drape(lot, 'terre#sol', [[T.x0, T.z0], [T.x1, T.z0], [T.x1, T.z1], [T.x0, T.z1]], { pas: 1.0, dy: 0.025, couleur: () => sombre });
    const p = lot.part('taille#sol'), nrm = { x: 0, y: 1, z: 0 }, lp = 0.13, ecart = 0.015;
    const W = T.x1 - T.x0, fl = 0.35;                       // la flèche des arcs, sur la largeur de la terrasse
    for (let zr = T.z0 + 0.08, rangee = 0; zr < T.z1 - 0.08; zr += lp + ecart, rangee++) {
      if (rangee % 6 === 5 && ctx.budget()) yield;
      const n = Math.max(3, Math.round(W / (lp + ecart)));
      for (let k = 0; k < n; k++) {
        const u0 = k / n, u1 = (k + 1) / n - ecart / W, zc = (u) => zr + fl * (1 - (2 * u - 1) ** 2);
        const pts = [[T.x0 + W * u0, zc(u0)], [T.x0 + W * u1, zc(u1)], [T.x0 + W * u1, zc(u1) + lp], [T.x0 + W * u0, zc(u0) + lp]];
        if (pts.some(([, z]) => z > T.z1 - 0.05)) continue;
        // (granit gris mêlé, #8f8a80 à #9c9790, quelques pavés beiges et rouille ; un cran plus sombre que la photo,
        // comme l'esplanade : le soleil du parc les rendait presque blancs)
        const t = kit.alea(zr * 7.1, k, 441), v = 0.85 + 0.3 * kit.alea(k, zr * 3.3, 442), ton = t < 0.6 ? [0.36, 0.355, 0.34] : t < 0.85 ? [0.42, 0.39, 0.35] : [0.4, 0.32, 0.27];
        const base = p.n;
        for (const [x, z] of pts) { ctx.Monde.normale(x + ctx.Monde.dx, z, nrm); lot.s(p, x, O.sol(x, z) + 0.045, z, nrm.x, nrm.y, nrm.z, x / 2, z / 2, [ton[0] * v, ton[1] * v, ton[2] * v]); }
        lot.quad(p, base, base + 1, base + 2, base + 3);
      }
    }
    if (ctx.budget()) yield;
    // la marche de pierre au pied de la façade (de la tour au porche)
    const yM = kit.sol(T.x0 + 0.3, -95);
    lot.boite('taille', 0.4, 0.3, TOUR.z1 - PORCHE.z1 - 0.2, O.T(T.x0 + 0.2, yM + 0.05, (TOUR.z1 + PORCHE.z1) / 2), { chanfrein: 0.02, couleur: O.c('taille', '#b3ada2') });
    // le garde-corps d'acier noir : poteaux, main courante, deux lisses ; ouvert vers le départ de l'escalier (au sud)
    const ligne = [[T.x1, T.z1 - 0.2], [T.x1, T.z0 + 2.6]], fer = C.fer;
    const pts = kit.reechantillonner(ligne, 1.5);
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i], y = kit.sol(q.x, q.z);
      lot.boite('peinture', 0.05, 1.05, 0.05, O.T(q.x, y + 0.52, q.z), { bande: true, couleur: fer });
      if (i < pts.length - 1) { const r = pts[i + 1], y2 = kit.sol(r.x, r.z); for (const hh of [0.15, 0.55, 1.03]) lot.barre([q.x, y + hh, q.z], [r.x, y2 + hh, r.z], hh > 1 ? 0.05 : 0.02, hh > 1 ? 0.03 : 0.02, { couleur: fer }); }
    }
    // la trémie de l'escalier qui descend vers le coteau, au sud de la terrasse : sa rambarde sur trois côtés
    const t0 = [T.x1 - 1.8, T.z0 + 0.2], t1 = [T.x1, T.z0 + 2.4], yT = kit.sol(t0[0], t1[1]);
    for (const [a, b] of [[[t0[0], t1[1]], [t1[0], t1[1]]], [[t0[0], t0[1]], [t0[0], t1[1]]]]) {
      lot.barre([a[0], yT + 1.03, a[1]], [b[0], yT + 1.03, b[1]], 0.05, 0.03, { couleur: fer });
      lot.barre([a[0], yT + 0.5, a[1]], [b[0], yT + 0.5, b[1]], 0.02, 0.02, { couleur: fer });
      for (const q of [a, b]) lot.boite('peinture', 0.05, 1.05, 0.05, O.T(q[0], yT + 0.52, q[1]), { bande: true, couleur: fer });
    }
    // les chaises de jardin (rose, vert anis) et une petite table ronde
    const chaises = [[-59.3, -97.0, 30, '#e59bb0'], [-58.6, -97.9, 250, '#a7c63a'], [-58.2, -96.6, 160, '#e59bb0'], [-59.1, -92.8, 90, '#a7c63a']];
    for (const [x, z, cap, hex] of chaises) {
      const R = O.repere(x, kit.sol(x, z), z, cap), c = O.p(hex);
      lot.boite('peinture', 0.42, 0.03, 0.4, R(0, 0.45, 0), { bande: true, couleur: c });
      lot.boite('peinture', 0.42, 0.4, 0.03, R(0, 0.68, -0.19), { bande: true, couleur: c });
      for (const [sx, sz] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) lot.barre(R.pt(sx, 0, sz), R.pt(sx, 0.45, sz), 0.018, 0.018, { couleur: c });
    }
    const y = kit.sol(-58.7, -97.4);
    lot.tour('peinture', [[0.2, 0], [0.2, 0.03], [0.03, 0.05], [0.03, 0.72], [0.3, 0.73], [0.3, 0.75], [0.001, 0.755]], 12, O.T(-58.7, y, -97.4), { bande: true, couleur: O.p('#a7c63a') });
    // les pyracanthas le long de la façade (baies rouge orangé : quelques points de peinture)
    for (const z of [-104.5, -91.0]) {
      const x = T.x0 + 0.9, yb = kit.sol(x, z);
      O.buisson(lot, x, yb, z, 0.55, kit.TEINTES.troene, Math.round(z));
      for (let k = 0; k < 14; k++) lot.geo('peinture', new THREE.SphereGeometry(0.04, 5, 4), O.T(x + (kit.alea(k, z, 451) - 0.5) * 0.9, yb + 0.3 + kit.alea(z, k, 452) * 0.55, z + (kit.alea(k + 3, z, 453) - 0.5) * 0.9), { bande: true, couleur: O.p('#d0452a') });
    }
  }
  if (ctx.budget()) yield;
  if (ctx.budget()) yield;
  // (la pelouse, le lit et les pavés de la terrasse, drapés au sol : hors de la carte fixe des ombres de contact)
  groupe.add(O.horsContact(lot.maillages('abords du musée')));
}

// ============================================================================================ silhouette (loin)
// Les volumes des deux bâtiments, dans la peinture (un seul appel) : le pavillon sombre et ses toits, le bloc crème et
// son comble ; moins de 400 triangles.
function* silhouette(ctx) {
  const { kit } = ctx, O = outilsB7(kit, ctx.Monde), lot = new kit.Lot('silhouette du musée');
  const B = (x0, y0, z0, x1, y1, z1, c) => lot.boite('peinture', x1 - x0, y1 - y0, z1 - z0, O.T((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), { bande: true, couleur: O.p(c) });
  B(PAV.x0, 10.0, PAV.z0, PAV.x1, Y.egout, TOUR.z0, '#3b3632');
  B(PAV.x0, 10.0, TOUR.z0, PAV.x1 + TOUR.saillie, Y.tourEgout, TOUR.z1, '#3b3632');
  const xm = (PAV.x0 + PAV.x1) / 2;
  lot.prisme('peinture', [[-6.0, 0], [6.0, 0], [0, Y.faite - Y.egout + 0.6]], [[xm, Y.egout - 0.6, PAV.z0], [xm, Y.egout - 0.6, TOUR.z0]], { bande: true, couleur: O.p('#4a4d52') });
  lot.prisme('peinture', [[-3.6, 0], [3.6, 0], [0, Y.tourFaite - Y.tourEgout + 0.5]], [[PAV.x0 - 0.6, Y.tourEgout - 0.5, (TOUR.z0 + TOUR.z1) / 2], [PAV.x1 + 0.7, Y.tourEgout - 0.5, (TOUR.z0 + TOUR.z1) / 2]], { bande: true, couleur: O.p('#4a4d52') });
  B(ENDUIT.x0, ENDUIT.sol, ENDUIT.z0, ENDUIT.x1, ENDUIT.egout, ENDUIT.z1, '#ddd0b0');
  B(ENDUIT.x0 + 0.8, ENDUIT.egout, ENDUIT.z0 + 0.8, ENDUIT.x1 - 0.8, ENDUIT.brisis, ENDUIT.z1 - 0.8, '#5a6068');
  ctx.groupe.add(lot.maillages('silhouette du musée'));
}

// ============================================================================================ la zone
export default {
  id: 'Z15',
  nom: 'Musée Roybet-Fould',
  emprise: [[-76, -117], [-60, -117], [-60, -89], [-76, -89]],
  morceaux: [
    { id: 'Z15a', nom: 'pavillon de Suède et de Norvège', boite: [-72.0, -106.5, -58.5, -88.5], construire: pavillon, silhouette },
    { id: 'Z15b', nom: 'bâtiment enduit et parvis', boite: [-81.5, -117.5, -60.0, -101.0], construire: enduit },
    { id: 'Z15c', nom: 'jardin clos et terrasse de 2025', boite: [-76.0, -106.5, -56.0, -88.8], construire: abords },
  ],
  // PUR (sans three). Les deux bâtiments et le jardin clos sont dans l'obstacle « bâtiment » de monde.json ; restent le
  // porche et ses marches, les marches de l'entrée, le parvis (grille, haie, piliers), le garde-corps de la terrasse.
  obstacles(o) {
    const dur = (h) => ({ h, type: 'dur' });
    const P = PORCHE;
    o.boite(PAV.x1 + (P.prof + P.marches * 0.3) / 2, (P.z0 + P.z1) / 2, (P.prof + P.marches * 0.3) / 2, (P.z1 - P.z0) / 2 + 0.2, 0, dur(3.5));
    o.boite(ENDUIT.x0 - 0.55, (ENDUIT.z0 + ENDUIT.z1) / 2, 0.55, 1.2, 0, dur(0.5));
    const Pv = PARVIS;
    o.segment(Pv.x0, Pv.z0, Pv.x0, Pv.z1, { e: 0.35, h: 1.95, type: 'grille' });
    o.segment(Pv.x0 - 0.75, Pv.z0 + 0.2, Pv.x0 - 0.75, Pv.z1 - 0.3, { e: 0.8, h: 1.2, type: 'haie' });
    o.segment(Pv.x0, Pv.z1 + 0.05, Pv.x1, Pv.z1 + 0.05, { e: 0.1, h: 1.8, type: 'portillon' });
    const T = TERRASSE;
    o.segment(T.x1, T.z1 - 0.2, T.x1, T.z0 + 2.4, { e: 0.08, h: 1.05, type: 'grille' });
    o.segment(T.x1 - 1.8, T.z0 + 2.4, T.x1, T.z0 + 2.4, { e: 0.08, h: 1.05, type: 'grille' });
    o.segment(T.x1 - 1.8, T.z0 + 0.2, T.x1 - 1.8, T.z0 + 2.4, { e: 0.08, h: 1.05, type: 'grille' });
    o.cercle(-58.7, -97.4, 0.3, dur(0.75));
  },
  bancs() {},
  lieux: [],
};
