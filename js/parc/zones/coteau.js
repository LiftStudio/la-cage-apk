// =====================================================================
//  LE COTEAU (lot B5) : ce que les zones Z10 (coteau nord) et Z11 (coteau sud) ont en commun
// =====================================================================
// Les deux coteaux boisés du parc, entre le niveau bas (plateau, terrasse du bassin, jardin de la fontaine) et la
// terrasse haute, se dessinent avec les mêmes pièces : des ALLÉES drapées sur le vrai relief (les rampes, l'allée du
// mur, les chemins), leurs BORDURES de béton, des LAMPADAIRES, le SOUS-BOIS (lierre et feuilles au sol, arbustes
// denses le long des allées). Ce module les fabrique ; js/parc/zones/z10_coteau_nord.js et z11_coteau_sud.js les
// posent, chacune dans ses morceaux (conception, § 3.3).
//
// LES RÈGLES DE ZONE (conception, § 3.3), et comment ce module les tient :
//  1. Pas de Math.random. Les pièces reprises de js/court_parc.js (touffes de feuillage, arbustes, épicéa, bancs)
//     tirent leur hasard par Math.random : on les appelle SOUS `avecHasard(graine, f)`, qui remplace Math.random par un
//     générateur à graine le temps de l'appel (comme js/tex_cuites.js pour les textures), et le rend aussitôt après.
//     Deux joueurs voient donc le même talus, feuille pour feuille. Jamais à cheval sur un `yield` : entre deux
//     tranches, le jeu retrouve son Math.random.
//  2. Toute hauteur vient de Monde.sol (par `sol(x, z)` ci-dessous, repère du terrain 1, décalage de parc2 compris).
//  3. Les matériaux viennent du kit (asphalte gris, béton des bordures et des marches, bois des rondins, peinture des
//     candélabres et des rampes, fleurs de l'îlot) ; en propre (au plus six par zone), partagés entre Z10 et Z11 (voir
//     « MATÉRIAUX ») : l'asphalte rouge et le feuillage, plus, à Z10 seulement, le bois et la fonte des bancs noirs
//     (bancDansLot) et les aiguilles de l'épicéa (epiceaBleu) — cinq ; Z11 n'en a que deux.
//  4. Aucun arbre planté ici : ils viennent de arbres.bin (lot A5). Les arbustes, eux, sont du décor de zone.
//  5. Tout va dans le groupe du morceau (`ctx.groupe`).
//
// LE REPÈRE est celui du TERRAIN 1 (x+ vers la Seine, z+ vers le pin) : les maillages reçoivent Monde.dx (parc2), les
// requêtes au monde aussi.
//
// PUR OU NON. Les obstacles d'une zone sont déclarés AVANT que le monde soit installé (js/parc/index.js : sans THREE
// et sans relief). Tout ce qui fait obstacle (arbustes, bancs, lampadaires, palissade) est donc placé par des fonctions
// PURES, qui ne lisent que les tracés et le hasard de position (`alea`) : la zone appelle les mêmes au dessin et aux
// obstacles, et les deux listes sont identiques.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Monde, DRAPEAU, SURFACE } from '../../monde.js';
import {
  asphalteRougeTex, materiauFeuilles, feuillesFondTex, carteFond, paletteFond, teinteFond, arbusteFond,
  bancDansLot,
} from '../../court_parc.js';

// ============================================================================================ hasard (pur)
// Le hasard déterministe du parc : même formule que js/court_parc.js et js/parc/kit.js (alea), recopiée ici pour que
// les fonctions pures (obstacles) n'aient pas à charger le kit. Rend [0, 1[.
export function alea(x, z, k = 0) {
  const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
  return s - Math.floor(s);
}
// Le même, lissé (bruit de valeur sur une grille de pas 1) : [0, 1].
export function bruit(x, z, k = 0) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = alea(i, j, k), b = alea(i + 1, j, k), c = alea(i, j + 1, k), d = alea(i + 1, j + 1, k);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const entre = (a, b, u) => a + (b - a) * u;

// Une graine tirée d'un nom (FNV-1a) : chaque morceau, chaque tranche a la sienne.
export function graine(nom) {
  let h = 0x811c9dc5;
  for (let i = 0; i < nom.length; i++) { h ^= nom.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
// `f()` exécutée avec un Math.random À GRAINE (mulberry32, sur [0, 1[ comme lui), rendu aussitôt après, même en cas
// d'erreur. Pour les pièces de js/court_parc.js, qui tirent leurs touffes au hasard.
export function avecHasard(g, f) {
  const avant = Math.random;
  let a = (typeof g === 'string' ? graine(g) : g) >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return f(); } finally { Math.random = avant; }
}

// ============================================================================================ lignes (pur)
export function longueur(L) { let s = 0; for (let i = 1; i < L.length; i++) s += Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]); return s; }
// Des points tous les `pas` m au plus le long d'une ligne, sommets gardés : [{ x, z, s }] (même règle que le kit).
export function reech(L, pas) {
  const out = [];
  let s = 0;
  for (let i = 0; i < L.length - 1; i++) {
    const [ax, az] = L[i], [bx, bz] = L[i + 1], l = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(l / pas - 1e-6));
    for (let k = 0; k < n; k++) out.push({ x: ax + (bx - ax) * k / n, z: az + (bz - az) * k / n, s: s + l * k / n });
    s += l;
  }
  const [lx, lz] = L[L.length - 1];
  out.push({ x: lx, z: lz, s });
  return out;
}
// Les SECTIONS d'une allée : un point tous les `pas` m, sa direction (tx, tz) et sa normale à DROITE (rx, rz) =
// (-tz, tx), allongée de l'onglet aux coudes (1 / cos du demi-angle). Les bords de l'allée sont alors exactement les
// parallèles à ±largeur/2 de sa trace, à angles vifs : l'emprise que l'outil de données (tools/parc) a donnée au sol,
// au mètre près (une allée arrondie à ses coudes en sortait, et le sol perçait dans l'angle).
export function sections(trace, pas = 1) {
  const P = reech(trace, pas), n = P.length;
  return P.map((q, j) => {
    const A = P[Math.max(0, j - 1)], B = P[Math.min(n - 1, j + 1)];
    let ax = q.x - A.x, az = q.z - A.z, bx = B.x - q.x, bz = B.z - q.z;
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    if (la > 1e-6) { ax /= la; az /= la; }
    if (lb > 1e-6) { bx /= lb; bz /= lb; }
    if (la <= 1e-6) { ax = bx; az = bz; }
    if (lb <= 1e-6) { bx = ax; bz = az; }
    let tx = ax + bx, tz = az + bz;
    const lt = Math.hypot(tx, tz) || 1; tx /= lt; tz /= lt;
    const m = 1 / Math.max(0.35, tx * ax + tz * az);
    return { x: q.x, z: q.z, s: q.s, tx, tz, rx: -tz * m, rz: tx * m };
  });
}
// Un BORD d'allée : la parallèle à `d` m de la trace, du côté `cote` (+1 : à droite du sens de la trace, -1 : à gauche),
// un point tous les `pas` m : [{ x, z, s }].
export function bord(trace, d, cote, pas = 0.5) {
  return sections(trace, pas).map((q) => ({ x: q.x + q.rx * d * cote, z: q.z + q.rz * d * cote, s: q.s }));
}
// Distance d'un point à une ligne, et l'abscisse de sa projection : { d, s, cote } (cote +1 : à droite du sens).
export function projeter(L, x, z) {
  let best = Infinity, sb = 0, cb = 1, s0 = 0;
  for (let i = 0; i + 1 < L.length; i++) {
    const [ax, az] = L[i], [bx, bz] = L[i + 1], ux = bx - ax, uz = bz - az, l = Math.hypot(ux, uz);
    if (l < 1e-9) continue;
    const t = Math.min(l, Math.max(0, ((x - ax) * ux + (z - az) * uz) / l)), px = ax + ux * t / l, pz = az + uz * t / l;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; sb = s0 + t; cb = (-(uz) * (x - ax) + ux * (z - az)) >= 0 ? 1 : -1; }
    s0 += l;
  }
  return { d: best, s: sb, cote: cb };
}
// Le point d'une ligne à l'abscisse s, et sa direction.
export function surLigne(L, s) {
  let s0 = 0;
  for (let i = 0; i + 1 < L.length; i++) {
    const [ax, az] = L[i], [bx, bz] = L[i + 1], l = Math.hypot(bx - ax, bz - az);
    if (s <= s0 + l || i === L.length - 2) {
      const t = Math.min(1, Math.max(0, (s - s0) / (l || 1)));
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, tx: (bx - ax) / (l || 1), tz: (bz - az) / (l || 1) };
    }
    s0 += l;
  }
  const [x, z] = L[L.length - 1];
  return { x, z, tx: 0, tz: 1 };
}
// Un point est-il sur une allée de la liste (à `marge` m près de son bord) ? `allees` : [{ trace, demi }].
export function surAllee(allees, x, z, marge = 0) {
  for (const a of allees) if (projeter(a.trace, x, z).d < a.demi + marge) return true;
  return false;
}
// Dans une boîte [x0, z0, x1, z1] ?
export const dansBoite = (b, x, z) => x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3];

// LES RAMPES D'UNE VOLÉE, EN OBSTACLES (pur ; relecture du lot). kit.escalier pose la main courante sur les limons, à
// largeur / 2 + 0,1 m de l'axe ; les données du monde, elles, ne ferment les côtés d'une volée que là où le sol tombe de
// plus de 0,35 m en travers (tools/parc, gabarit escalier) : une volée qui descend DANS le sens de la pente, comme
// celle de 34 marches, se quittait donc par le côté, à travers ses rampes. Des segments tous les 2 m au plus : la
// hauteur d'un obstacle se lit sur le sol au milieu de chaque segment (js/monde_collisions.js), une rampe qui descend
// de trois mètres doit la suivre par tronçons (comme les volées de la zone Z06). `v` : { de, a, largeur }.
export function rampesEnObstacles(o, v, opt = { e: 0.2, h: 1.0, type: 'dur' }, pas = 2) {
  const [x0, z0] = v.de, [x1, z1] = v.a, L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L;
  const d = v.largeur / 2 + 0.1, n = Math.max(1, Math.round((L - 0.4) / pas));
  for (const c of [-1, 1]) {
    const ox = -uz * d * c, oz = ux * d * c;
    for (let i = 0; i < n; i++) {
      const a = 0.2 + ((L - 0.4) * i) / n, b = 0.2 + ((L - 0.4) * (i + 1)) / n;
      o.segment(x0 + ux * a + ox, z0 + uz * a + oz, x0 + ux * b + ox, z0 + uz * b + oz, opt);
    }
  }
}

// ============================================================================================ sol, couleurs
// Le sol sous (x, z) du terrain 1 (Monde.sol attend le monde affiché : on lui rend son décalage).
export function sol(x, z) { return Monde.sol(x + Monde.dx, z); }
// LE SOL TEL QU'IL EST DESSINÉ. Monde.sol interpole les quatre nœuds de la grille (bilinéaire) ; le maillage du sol
// (js/monde_sol.js) les coupe, lui, en deux triangles par la diagonale, sur une trame de 0,5 m au pied du joueur, de
// 1 m plus loin, calée sur les cellules (x -24,7 ; z -16). Là où la pente change vite (le bord d'une rampe tenue au-dessus
// ou au-dessous du terrain, son accotement), le triangle passe AU-DESSUS de la surface bilinéaire de quelques
// centimètres, et le sol perçait une allée posée à 2 ou 3 cm (des dents de terre le long du bord : relecture de la fourche).
// On pose donc chaque sommet d'allée au plus haut des trois surfaces.
const CEL_X = -24.7, CEL_Z = -16;
function solTriangle(x, z, s) {
  const fx = (x - CEL_X) / s, fz = (z - CEL_Z) / s, q = Math.floor(fx), r = Math.floor(fz), u = fx - q, v = fz - r;
  const xa = CEL_X + q * s, za = CEL_Z + r * s;
  const hb = sol(xa + s, za), hc = sol(xa, za + s);
  if (u + v <= 1) { const ha = sol(xa, za); return ha + u * (hb - ha) + v * (hc - ha); }
  const hd = sol(xa + s, za + s);
  return hd + (1 - u) * (hc - hd) + (1 - v) * (hb - hd);
}
export function solVu(x, z) { return Math.max(sol(x, z), solTriangle(x, z, 0.5), solTriangle(x, z, 1)); }
// Une couleur sRGB (#rrggbb) en valeurs linéaires (attribut `color` des sommets).
export function lin(hex) { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; }

// ============================================================================================ découpe (Sutherland-Hodgman)
// Un polygone convexe [[x, z, ...attributs]] coupé par la boîte [x0, z0, x1, z1] : les attributs sont interpolés.
function couperDemiPlan(P, axe, val, garderPlus) {
  const out = [], n = P.length;
  const dedans = (p) => (garderPlus ? p[axe] >= val : p[axe] <= val);
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n], ia = dedans(a), ib = dedans(b);
    if (ia) out.push(a);
    if (ia !== ib) {
      const t = (val - a[axe]) / (b[axe] - a[axe]);
      out.push(a.map((v, k) => v + (b[k] - v) * t));
    }
  }
  return out;
}
// Le même polygone coupé par une DROITE quelconque `d` = [ax, az, nx, nz] : on garde le côté où (p - a)·n ≥ 0 (relecture
// du lot B4 : le bout de l'allée du mur, coupé le long du retour du mur de meulière, en biais au-dessus de l'escalier
// de 12 marches).
export function couperDroite(P, d) {
  const [ax, az, nx, nz] = d, out = [], n = P.length, f = (p) => (p[0] - ax) * nx + (p[1] - az) * nz;
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push(a.map((v, k) => v + (b[k] - v) * t)); }
  }
  return out;
}
export function decouper(P, B) {
  let Q = P;
  if (B[0] > -1e8) Q = couperDemiPlan(Q, 0, B[0], true);
  if (Q.length && B[2] < 1e8) Q = couperDemiPlan(Q, 0, B[2], false);
  if (Q.length && B[1] > -1e8) Q = couperDemiPlan(Q, 1, B[1], true);
  if (Q.length && B[3] < 1e8) Q = couperDemiPlan(Q, 1, B[3], false);
  return Q;
}

// ============================================================================================ ALLÉES DRAPÉES
// Un accumulateur de triangles drapés sur le sol (position, normale du sol, uv, couleur), rendu en UNE géométrie.
export class Nappe {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.i = []; this.nv = 0; this._N = { x: 0, y: 1, z: 0 }; }
  // un sommet en (x, z) du terrain 1, `dy` au-dessus du sol (mais pas plus bas que `plancher` + dy) ; `c` : [r, g, b]
  // linéaire
  sommet(x, z, dy, u, v, c, plancher = -1e9) {
    const N = this._N;
    Monde.normale(x + Monde.dx, z, N);
    this.p.push(x + Monde.dx, Math.max(solVu(x, z), plancher) + dy, z); this.n.push(N.x, N.y, N.z); this.uv.push(u, v); this.c.push(c[0], c[1], c[2]);
    return this.nv++;
  }
  // un triangle, tourné vers le ciel quel que soit le sens de ses sommets
  tri(a, b, c) {
    const P = this.p, ax = P[a * 3], az = P[a * 3 + 2];
    const cr = (P[b * 3 + 2] - az) * (P[c * 3] - ax) - (P[b * 3] - ax) * (P[c * 3 + 2] - az);
    if (Math.abs(cr) < 1e-12) return;
    if (cr > 0) this.i.push(a, b, c); else this.i.push(a, c, b);
  }
  geometrie() {
    if (!this.i.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.nv > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeBoundingSphere();
    return g;
  }
}
// La couleur d'un enrobé (multiplicateur de la texture) : les bords un peu plus sombres (terre, feuilles), le milieu
// un peu plus clair (usé), des taches lentes de 3 à 4 m qui cassent la répétition (comme le ruban du kit).
// `e` : position en travers, -1 à 1.
export function teinteEnrobe(x, z, e, k = 41) {
  const f = (1 - 0.16 * lisse(0.72, 1, Math.abs(e))) * (1 + 0.1 * (bruit(x / 3.5, z / 3.5, k) - 0.5)) * (1 + 0.035 * (1 - e * e));
  return [f, f, f * 0.99];
}
// UNE ALLÉE drapée sur le sol : `trace`, `largeur`, `boite` (l'emprise où on la dessine : elle y est coupée net, à
// angle droit du bord, là où la zone voisine prend le relais), `dy` (au-dessus du sol : 2 à 3 cm, pas de scintillement
// avec le sol du monde), `pas` (m entre deux sections), `tuile` (côté réel de la texture, m), `couper` (facultatif :
// des droites [ax, az, nx, nz], voir couperDroite, qui la coupent en biais en plus de la boîte). UV : u en travers, v le
// long de la trace (la texture court avec l'allée). `nappe` : l'accumulateur où l'ajouter (sinon un neuf). Rend la nappe.
export function allee(o, nappe = new Nappe()) {
  const S = sections(o.trace, o.pas ?? 0.5), h = o.largeur / 2, dy = o.dy ?? 0.025, tu = o.tuile ?? 4;
  const nA = o.colonnes ?? Math.max(3, Math.ceil(o.largeur / 0.6) + 1), B = o.boite || [-1e9, -1e9, 1e9, 1e9];
  const teinte = o.teinte || teinteEnrobe;
  // (chaque section porte la hauteur du sol sur son AXE : les allées et les rampes des données sont à dévers nul, le sol
  // du monde y est plat en travers ; au bord, là où la rampe domine le terrain (remblai), le sol dessiné plonge vers
  // l'accotement et le bord du ruban le suivait, sous la surface plate que le maillage du sol garde un peu plus loin :
  // le ruban reste donc à la hauteur de son axe, au moins)
  const pt = (q, e) => [q.x + q.rx * e * h, q.z + q.rz * e * h, (e + 1) * h, q.s, e, q.y];
  for (const q of S) q.y = sol(q.x, q.z);
  for (let j = 0; j + 1 < S.length; j++) {
    for (let k = 0; k + 1 < nA; k++) {
      const e0 = -1 + (2 * k) / (nA - 1), e1 = -1 + (2 * (k + 1)) / (nA - 1);
      let P = decouper([pt(S[j], e0), pt(S[j], e1), pt(S[j + 1], e1), pt(S[j + 1], e0)], B);
      if (o.couper) for (const d of o.couper) if (P.length >= 3) P = couperDroite(P, d);
      if (P.length < 3) continue;
      const base = nappe.nv;
      for (const [x, z, u, v, e, yA] of P) nappe.sommet(x, z, dy, u / tu, v / tu, teinte(x, z, e), o.plat === false ? -1e9 : yA);
      for (let i = 1; i + 1 < P.length; i++) nappe.tri(base, base + i, base + i + 1);
    }
  }
  return nappe;
}
// UNE PLAQUE drapée d'après un contour [[x, z], ...] : une trame de `pas` m découpée par le contour, chaque sommet
// posé sur le sol. `uv(x, z)` -> [u, v, e] (e : pour la teinte). `plancher(x, z)` (facultatif) : une hauteur sous
// laquelle le sommet ne descend pas (le bord d'une allée voisine, tenu à la hauteur de son axe : voir allee).
export function plaque(poly, o, nappe = new Nappe()) {
  // UNE TRAME, pas une triangulation : les cases de `pas` m calées sur celles du sol (js/monde_sol.js : x -24,7 ; z -16,
  // au pas de 0,5 m), chacune découpée par le contour (Sutherland-Hodgman, la case est convexe : le contour peut ne pas
  // l'être). Une triangulation du contour subdivisée d'un bloc faisait des milliers de triangles effilés sur les grands
  // côtés, et laissait percer le sol entre eux.
  const pas = o.pas ?? 0.5, teinte = o.teinte || teinteEnrobe, tu = o.tuile ?? 4, dy = o.dy ?? 0.025;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const cx = CEL_X + Math.floor((x0 - CEL_X) / pas) * pas, cz = CEL_Z + Math.floor((z0 - CEL_Z) / pas) * pas;
  const P = poly.map(([x, z]) => [x, z]), V2 = new THREE.Vector2();
  for (let za = cz; za < z1; za += pas) {
    for (let xa = cx; xa < x1; xa += pas) {
      const Q = decouper(P, [xa, za, xa + pas, za + pas]);
      if (Q.length < 3) continue;
      let T;
      if (Q.length === 3) T = [[0, 1, 2]];
      else {
        try { T = THREE.ShapeUtils.triangulateShape(Q.map(([x, z]) => V2.clone().set(x, z)), []); } catch (e) { T = []; }
      }
      if (!T.length) continue;
      const base = nappe.nv;
      for (const [x, z] of Q) { const [u, v, e] = o.uv(x, z); nappe.sommet(x, z, dy, u / tu, v / tu, teinte(x, z, e), o.plancher ? o.plancher(x, z) : -1e9); }
      for (const [a, b, c] of T) nappe.tri(base + a, base + b, base + c);
    }
  }
  return nappe;
}
// Un maillage d'allée (reçoit l'ombre, n'en porte pas).
export function maillageSol(geo, mat, nom) {
  if (!geo) return null;
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true; m.castShadow = false; m.name = nom;
  return m;
}

// ============================================================================================ BORDURES
// Les bordures de béton le long d'un bord d'allée (12 cm, 6 cm au-dessus du sol, blocs de 90 cm : kit.bordure),
// INTERROMPUES là où une autre allée, un escalier ou un palier s'y raccorde : on regarde, 60 cm au-delà du bord, si
// le monde y met une allée (drapeau 128) ou un escalier (drapeau 4) — le raccord se lit dans les données, pas dans une
// liste à tenir à la main. `garder(x, z)` : une condition de plus (la boîte de la zone, la palissade de l'îlot...).
// GÉNÉRATEUR : un tronçon de 12 m au plus par pièce, et la main rendue entre deux quand `o.budget()` le demande. Rend la
// liste des tronçons posés ([[x, z], ...]).
export function* bordures(kit, groupe, trace, largeur, cote, garder = () => true, o = {}) {
  const ecart = largeur / 2 + 0.07, sonde = largeur / 2 + 0.6;
  const E = bord(trace, ecart, cote, 0.45), P = bord(trace, sonde, cote, 0.45);
  const troncons = [], budget = o.budget || (() => false);
  let cur = [];
  const couper = () => { if (cur.length > 2) troncons.push(cur); cur = []; };
  for (let i = 0; i < E.length; i++) {
    const e = E[i], p = P[i];
    const f = Monde.drapeaux(p.x + Monde.dx, p.z);
    const raccord = (f & (DRAPEAU.ALLEE | DRAPEAU.ESCALIER)) !== 0 || (Monde.surface(p.x + Monde.dx, p.z) === SURFACE.DALLES);
    if (!raccord && garder(e.x, e.z)) {
      cur.push([e.x, e.z]);
      // (un tronçon de 12 m au plus : une pièce courte, construite entre deux images ; il repart de son dernier point)
      if (cur.length > 27) { const der = cur[cur.length - 1]; couper(); cur.push(der); }
    } else couper();
  }
  couper();
  // (le béton du kit est clair, presque blanc au soleil : les bordures des photos 171706 et 171709 sont d'un gris moyen,
  // plus sombre que l'asphalte au soleil — le gris 0x9b9993 de abordsMur. On l'assombrit par ses couleurs de sommet.)
  const gris = o.gris ?? 0.55;
  for (const t of troncons) {
    const g = kit.bordure({ ligne: t, largeur: 0.12, hauteur: o.hauteur ?? 0.06, materiau: 'beton' });
    g.traverse((m) => {
      const c = m.isMesh && m.geometry.attributes.color;
      if (c) { for (let i = 0; i < c.array.length; i++) c.array[i] *= gris; c.needsUpdate = true; }
    });
    groupe.add(g);
    if (budget()) yield;
  }
  return troncons;
}

// ============================================================================================ MATÉRIAUX
// Les matériaux propres au coteau (règle 3 : partagés par Z10 et Z11 ; tout le reste vient du kit).
//  - l'ASPHALTE ROUGE des photos du 28/09 : la texture de l'allée du mur drapeau baissé (asphalteRougeTex, js/court_parc.js),
//    rouge brique éteint, grain serré ; une tuile de 4 m ; couleurs de sommet (bords assombris) ;
//  - le FEUILLAGE des arbustes et du couvre-sol : les feuilles neutres du fond (feuillesFondTex), teintées par sommet
//    (paletteFond), dans le matériau de feuillage du parc (lumière transmise, mipmaps de l'alpha) ; les réglages de
//    fondMur (js/court_parc.js), avec lesquels ses palettes ont été calées sur les photos 601 et 171709 ;
//  - (les FLEURS de l'îlot viennent de l'atlas des vivaces du kit, fleurs_vivaces : relecture du lot, voir z10) ;
//  - les bancs noirs de l'allée du mur ont les deux leurs (bois et fonte), créés par bancDansLot.
const _mats = new Map();
export function materiauCoteau(nom, K) {
  let m = _mats.get(nom);
  if (m) return m;
  if (nom === 'rouge') {
    const map = asphalteRougeTex(K.canvasTex);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    m = new THREE.MeshStandardMaterial({ map, roughness: 0.92, vertexColors: true });
    // le détail photographique de l'enrobé (relief, grain, rugosité : js/surfaces_parc.js), comme l'allée du plateau
    m.userData.surfaceParc = 'asphalte';
  } else if (nom === 'feuillage') {
    // (relecture R2 : la copie des réglages de matFeu de fondMur datait d'avant le lot L8 — sat 0,65 et le filtre bleu
    // [0,88 ; 1 ; 1,15], clair 1,2. Le filtre agit APRÈS la désaturation et bleuissait le gris : vus de l'allée du mur et
    // de la rampe, les arbustes du coteau sortaient gris-bleu, en lichen, juste derrière les massifs du mur que le lot L8
    // a rendus vert franc. Alignés sur L8 : le même filtre presque neutre [0,94 ; 1 ; 1,02] et la même clarté 1,15 ; la
    // saturation à 0,45, celle que demandait la relecture R2, un cran sous celle du mur (0,5 depuis la relecture de L8).
    // Mesuré de l'allée du mur vers le coteau, en (-26,4 ; -30) : les arbustes passent d'une teinte moyenne de 108° à
    // 92°, et B − R de −4 à −9 — du vert-bleu au vert.)
    m = materiauFeuilles(feuillesFondTex(K.canvasTex), { trans: 0.2, rugosite: 0.85, teinte: { sat: 0.45, teinte: [0.94, 1.0, 1.02], clair: 1.15 } });
  } else throw new Error('[coteau] matériau inconnu : ' + nom);
  m.name = 'coteau · ' + nom;
  _mats.set(nom, m);
  return m;
}

// ============================================================================================ FEUILLAGES
// Les palettes des massifs (fondMur et abordsMur, js/court_parc.js : calées sur les photos 601 et 171709) et celles du
// couvre-sol (lierre vert sombre, feuilles tombées brun-roux, herbes folles).
const PALETTES = {
  sombre: [[0x2a3d2b, 3], [0x243625, 2], [0x324a31, 2], [0x1f2e20, 1], [0x3a5236, 1]],
  moyen: [[0x3a5633, 3], [0x445e37, 2], [0x334e30, 2], [0x4e663b, 1]],
  // (relecture : le cognassier du Japon de 171709, au premier plan à gauche, est semé de coings jaune d'or et de
  // feuilles qui jaunissent — une touffe sur neuf à peu près, sinon il se lisait comme un laurier de plus)
  cognassier: [[0x4f5c2e, 3], [0x58642f, 2], [0x45522a, 2], [0x66662c, 1], [0x8f7f2a, 1]],
  eleagnus: [[0x4a5647, 3], [0x535f50, 2], [0x404b3f, 2]],
  laurier: [[0x2e3f2c, 3], [0x33462f, 2], [0x3b5034, 2], [0x28382a, 1]],
  lierre: [[0x2f4a2a, 3], [0x3a5531, 3], [0x263d24, 2], [0x46603a, 1]],
  feuilles: [[0x6b5232, 3], [0x7a5e38, 2], [0x5a4630, 2], [0x8a6a3a, 1], [0x4d5a2e, 1]],
  herbe: [[0x55703a, 3], [0x4a6534, 2], [0x62783f, 2]],
};
// Une palette pour les pièces de js/court_parc.js (arbusteFond : un tirage à chaque touffe, par Math.random — sous
// avecHasard), et la même en « sac » pour nos touffes à nous, tirées par la position (`teinte(nom, u)`, u dans [0, 1[).
const _pals = new Map(), _sacs = new Map();
export function palette(nom) {
  let p = _pals.get(nom);
  if (!p) { p = paletteFond(PALETTES[nom] || PALETTES.sombre); _pals.set(nom, p); }
  return p;
}
export function teinte(nom, u) {
  let sac = _sacs.get(nom);
  if (!sac) {
    sac = [];
    for (const [hex, n] of PALETTES[nom] || PALETTES.sombre) { const t = teinteFond(hex); for (let i = 0; i < n; i++) sac.push(t); }
    _sacs.set(nom, sac);
  }
  return sac[Math.min(sac.length - 1, Math.floor(u * sac.length))];
}

// LES TOUFFES, VITE. Les pièces de feuillage de js/court_parc.js (carteFond, et par elle arbusteFond, paquetFond...)
// posent chaque carte en CLONANT un plan de three (acc.plan.clone().applyMatrix4(o.matrix)), et coudreTeinte coud
// ensuite des milliers de petites géométries : sur un morceau du coteau (trois mille cartes), 80 à 100 ms d'un seul
// tenant, quand la conception en accorde 4 par image (§ 3.6). `Touffes` se fait passer pour leur accumulateur
// (accFeuillage : `o`, `plan`, `touffes`, `infos`, `teintes`) : son « plan » ne se clone pas, il écrit les quatre coins
// de la carte, transformés, dans un tableau qui grandit. Les pièces de court_parc.js sont donc appelées TELLES QUELLES
// (même semis, mêmes cartes) ; seule la couture (`geometrie`) est refaite ici, à l'identique de coudre() : normale
// « volume » (le centre du volume, remonté de 45 % de son rayon), plus sombre au cœur et dessous, +12 % face au
// soleil, 7 % de touffes jaunies et 10 % de bleutées — tirées par la position de la carte, pas par Math.random.
const COINS = [[-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5]];      // (l'ordre des sommets de PlaneGeometry(1, 1))
export class Touffes {
  constructor() {
    this.o = new THREE.Object3D(); this.o.rotation.order = 'YXZ';      // (comme accFeuillage)
    this.touffes = []; this.infos = []; this.teintes = [];
    this.p = new Float32Array(12 * 1024); this.n = 0;
    const moi = this, carte = { applyMatrix4(m) { return moi._ajouter(m.elements); } };
    this.plan = { clone: () => carte };
  }
  _ajouter(e) {
    if ((this.n + 1) * 12 > this.p.length) { const b = new Float32Array(this.p.length * 2); b.set(this.p); this.p = b; }
    let o = this.n * 12;
    for (const [lx, ly] of COINS) {
      this.p[o++] = e[0] * lx + e[4] * ly + e[12]; this.p[o++] = e[1] * lx + e[5] * ly + e[13]; this.p[o++] = e[2] * lx + e[6] * ly + e[14];
    }
    return this.n++;
  }
  // la géométrie cousue (position, normale, uv, couleur, index) ; null s'il n'y a rien
  geometrie() {
    const N = this.n;
    if (!N) return null;
    const P = this.p.slice(0, N * 12), No = new Float32Array(N * 12), U = new Float32Array(N * 8), C = new Float32Array(N * 12);
    const I = N * 4 > 65535 ? new Uint32Array(N * 6) : new Uint16Array(N * 6);
    const SX = 0.52, SY = 0.85, SZ = 0.28;                            // le soleil de coudre()
    for (let k = 0; k < N; k++) {
      const f = this.infos[k], t0 = this.teintes[k] || [1, 1, 1], o = k * 12;
      let cx = 0, cy = 0, cz = 0;
      for (let q = 0; q < 4; q++) { cx += P[o + q * 3]; cy += P[o + q * 3 + 1]; cz += P[o + q * 3 + 2]; }
      cx /= 4; cy /= 4; cz /= 4;
      const tir = alea(cx * 3.1, cz * 3.1 + cy, 17);
      const jr = tir < 0.07 ? 1.08 : tir < 0.17 ? 0.94 : 1, jg = tir < 0.07 ? 1.02 : 1, jb = tir < 0.07 ? 0.8 : tir < 0.17 ? 1.04 : 0.96;
      const soleil = ((cx - f.c[0]) * SX + (cy - f.c[1]) * SY + (cz - f.c[2]) * SZ) > 0.4 * f.r ? 1.12 : 1;
      for (let q = 0; q < 4; q++) {
        const j = o + q * 3, dx = P[j] - f.c[0], dy = P[j + 1] - f.c[1], dz = P[j + 2] - f.c[2];
        const ny = dy + f.r * 0.45, l = Math.hypot(dx, ny, dz) || 1;
        No[j] = dx / l; No[j + 1] = ny / l; No[j + 2] = dz / l;
        const prof = Math.min(1, Math.hypot(dx, dy, dz) / f.r), haut = Math.min(1, Math.max(0, (dy / f.r) * 0.5 + 0.5));
        const v = f.t * soleil * (0.62 + 0.38 * prof) * (0.85 + 0.15 * haut);
        C[j] = v * jr * t0[0]; C[j + 1] = v * jg * t0[1]; C[j + 2] = v * jb * t0[2];
      }
      U.set(UV_CARTE, k * 8);
      const b = k * 4;
      I[k * 6] = b; I[k * 6 + 1] = b + 2; I[k * 6 + 2] = b + 1; I[k * 6 + 3] = b + 2; I[k * 6 + 4] = b + 3; I[k * 6 + 5] = b + 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(No, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    g.setIndex(new THREE.BufferAttribute(I, 1));
    g.computeBoundingSphere();
    return g;
  }
}
const UV_CARTE = [0, 1, 1, 1, 0, 0, 1, 0];
// Un maillage de feuillage (les touffes de `acc`), avec son ombre découpée. Protégé de la fusion : la fusion d'un
// morceau (kit.fusionner) ne recopie pas le matériau d'ombre (customDepthMaterial), et deux feuillages fondus
// porteraient des ombres carrées. Un seul par morceau et par usage : c'est déjà un seul appel de dessin.
export function maillageFeuillage(acc, K, nom, ombre = true) {
  const g = acc.geometrie();
  if (!g) return null;
  const mat = materiauCoteau('feuillage', K), m = new THREE.Mesh(g, mat);
  m.castShadow = ombre; m.receiveShadow = false; m.customDepthMaterial = mat.userData.ombre;
  m.userData.nofuse = true; m.userData.feuillage = true; m.name = nom;
  return m;
}
// Un ARBUSTE (arbusteFond, js/court_parc.js, tel quel) : un paquet de touffes en croix dans un ellipsoïde de `h` m de
// haut et `R` de rayon, posé sur le sol, feuillage jusqu'au ras du sol (talus denses : 171709). `a` : { x, z, h, R, pal }.
// Son hasard (Math.random, dans paquetFond) est fixé par sa position : le même arbuste chez tous les joueurs.
export function arbuste(acc, a) {
  const y0 = sol(a.x, a.z) - 0.08;
  avecHasard(graine('arbuste ' + a.x.toFixed(2) + ' ' + a.z.toFixed(2)),
    () => arbusteFond(acc, a.x + Monde.dx, y0, a.z, a.h, a.R, palette(a.pal), 1e9, -1e9, y0 + 0.03));
}
// Une touffe de COUVRE-SOL : `n` cartes de `taille` m presque couchées autour de (x, z), un peu redressées vers
// l'extérieur (le lierre qui moutonne, les feuilles qui se chevauchent), teintées par la palette `pal`.
export function touffeSol(acc, x, z, n, taille, pal, g, rayon = taille * 1.1) {
  for (let i = 0; i < n; i++) {
    const a = alea(x, z, g + i) * 6.283, r = Math.sqrt(alea(z, x, g + i + 7)) * rayon;
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, s = taille * (0.7 + 0.6 * alea(px, pz, g + 3));
    const y = sol(px, pz) + 0.03 + 0.07 * alea(pz, px, g + 4);
    const vol = { c: [px + Monde.dx, y - 0.25, pz], r: 0.6, t: 0.85 + 0.25 * alea(px, pz, g + 5) };
    carteFond(acc, px + Monde.dx, y, pz, -Math.PI / 2 + 0.15 + 0.45 * alea(px, pz, g + 6), a, 0, s, s * 0.9, vol, teinte(pal, alea(pz, px, g + 8)));
  }
}
// Une touffe d'HERBES FOLLES (le pied du mur, 171706 : plantain, pâturin, dans le joint de l'allée) : trois petites
// cartes presque couchées qui s'écartent du pied, plus une debout.
export function herbes(acc, x, z, h, g) {
  const y = sol(x, z), ry = alea(x, z, g) * Math.PI;
  const vol = { c: [x + Monde.dx, y - 0.1, z], r: 0.35, t: 0.9 + 0.2 * alea(z, x, g) };
  for (let i = 0; i < 3; i++) {
    const a = ry + i * 2.094, px = x + Math.cos(a) * h * 0.35, pz = z + Math.sin(a) * h * 0.35;
    carteFond(acc, px + Monde.dx, y + 0.02 + h * 0.15, pz, -Math.PI / 2 + 0.6, Math.PI / 2 - a, 0, h * 0.9, h * 0.8, vol, teinte('herbe', alea(px, pz, g + 1)));
  }
  carteFond(acc, x + Monde.dx, y + h * 0.4, z, 0.15, ry, 0, h * 0.7, h * 0.8, vol, teinte('herbe', alea(z, x, g + 2)));
}

// ============================================================================================ SOUS-BOIS (couvre-sol)
// Le couvre-sol d'une boîte : le sol du monde y est déjà peint (herbe, sous-bois de feuilles, terre : sols.webp) ; on
// y pose le RELIEF de ce qui pousse au ras du sol : des nappes de LIERRE en taches (sous les arbres, sur les talus trop
// raides pour être tondus), des feuilles tombées, pas sur les allées (à `marge` m de leur bord : `allees`). Une touffe
// tous les `pas` m au plus, là où un bruit lent le veut (des plaques, pas un semis régulier). GÉNÉRATEUR : il rend la
// main entre deux rangées quand `o.budget()` le demande (la construction en tranches du lot A5).
export function* couvreSol(acc, boite, allees, o = {}) {
  const pas = o.pas ?? 1.1, marge = o.marge ?? 0.45, g = o.graine ?? 11, budget = o.budget || (() => false);
  let n = 0;
  for (let z = boite[1] + pas / 2; z < boite[3]; z += pas) {
    for (let x = boite[0] + pas / 2; x < boite[2]; x += pas) {
      const jx = x + (alea(x, z, g) - 0.5) * pas * 0.8, jz = z + (alea(z, x, g + 1) - 0.5) * pas * 0.8;
      if (o.garder && !o.garder(jx, jz)) continue;
      const S = Monde.surface(jx + Monde.dx, jz), f = Monde.drapeaux(jx + Monde.dx, jz);
      if (f & (DRAPEAU.ALLEE | DRAPEAU.ESCALIER | DRAPEAU.EAU)) continue;
      if (S !== SURFACE.SOUS_BOIS && S !== SURFACE.HERBE && S !== SURFACE.MASSIF) continue;
      // sous les arbres, du lierre en plaques (des coussins de petites feuilles serrées, pas des feuilles isolées) et des
      // feuilles tombées ; sur l'herbe, rien, sauf sur les talus trop raides pour être tondus (plus de 70 %) — semé
      // sur les pelouses, il y faisait des galettes vertes
      const tache = bruit(jx / 4.5, jz / 4.5, g + 2);
      let p = 0.2 + 0.8 * lisse(0.3, 0.7, tache);
      if (S !== SURFACE.SOUS_BOIS) {
        if (S !== SURFACE.HERBE) continue;
        const pente = Math.hypot(sol(jx + 0.5, jz) - sol(jx - 0.5, jz), sol(jx, jz + 0.5) - sol(jx, jz - 0.5));
        p = lisse(0.7, 1.1, pente) * lisse(0.35, 0.7, tache);
      }
      if (alea(jx, jz, g + 3) > p) continue;
      if (surAllee(allees, jx, jz, marge)) continue;
      const feuilles = S === SURFACE.SOUS_BOIS && alea(jz, jx, g + 4) < 0.25;
      if (feuilles) touffeSol(acc, jx, jz, 4, 0.3, 'feuilles', g + 6 + n * 3, 0.45);
      else touffeSol(acc, jx, jz, 7 + Math.floor(alea(jx, jz, g + 5) * 5), 0.27, 'lierre', g + 6 + n * 3, 0.55);
      n++;
    }
    if (budget()) yield;
  }
  return n;
}

// ============================================================================================ BANCS NOIRS
// Les bancs noirs à lattes de l'allée du mur (171706, 171709 : lattes gris-noir, flasques de fonte noire), cousus en
// deux maillages (bois, fonte) par bancDansLot (js/court_parc.js), comme drapeau baissé. `liste` : [{ x, z, rot }]
// (terrain 1 ; rot : rotation autour de la verticale, l'avant du banc est +z tourné de rot).
export function bancsNoirs(K, groupe, liste) {
  const parMat = new Map();
  for (const b of liste) bancDansLot(K, parMat, b.x + Monde.dx, sol(b.x, b.z), b.z, b.rot, 0x2b2f31, 1.9, { fonte: 0x161718 });
  for (const { mat, geos } of parMat.values()) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = true; m.receiveShadow = true; m.name = 'bancs noirs';
    for (const g of geos) g.dispose();
    groupe.add(m);
  }
}

// ============================================================================================ FUSION
// LA FUSION D'UN MORCEAU, puis sa protection. js/parc/index.js fond chaque morceau à la fin de sa construction
// (kit.fusionner) ; mais, en attendant le lot A5, le décor entier est encore refondu d'un bloc après coup (optimiserDecor
// de js/court.js, sur toute la scène), et les maillages de TOUS les morceaux d'une zone y étaient recousus ensemble, en
// blocs de plus de 40 m de rayon que la caméra ne sait plus écarter (conception § 3.5 : aucune sphère de plus de 35 m).
// Le morceau se fond donc lui-même, puis se marque `nofuse` : la fusion de la scène le laisse tel quel, et le second
// kit.fusionner (celui de js/parc/index.js) n'a plus rien à faire.
// (lot C6 : en tranches — `yield* fondreEtProteger(ctx)` —, voir kit.fusionnerPas)
export function* fondreEtProteger(ctx) {
  yield* ctx.kit.fusionnerPas(ctx.groupe, ctx.budget || (() => false));
  ctx.groupe.userData.nofuse = true;
}

// ============================================================================================ LAMPADAIRES
// Un candélabre de fonte à crosse (kit.lampadaire) au bord d'une allée, le bras tourné vers elle : `p` = { x, z, vers:
// [x, z] }.
export function candelabre(kit, groupe, p, style = 'crosse') {
  const cap = (Math.atan2(p.vers[0] - p.x, p.vers[1] - p.z) * 180) / Math.PI;
  groupe.add(kit.lampadaire({ x: p.x, z: p.z, style, cap }));
}
