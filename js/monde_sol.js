import * as THREE from 'three';
import { Monde } from './monde.js';
import { TELEPHONE } from './appareil.js';

// =====================================================================
//  LE SOL À RELIEF DU PARC DE BÉCON EN ENTIER (lot A2 du chantier « parc complet »)
// =====================================================================
// Le parc fait 220 m sur 335 (la grille du monde, avec le quai, la berge et le trottoir du boulevard) et descend de
// +12 m (boulevard Saint-Denis) à -8 m (la Seine). Son sol n'est pas un plan : c'est un MAILLAGE tiré de la grille de
// hauteurs de 0,5 m (sol.bin, lue par js/monde.js), découpé en CELLULES de 32 m (conception, § 3.5).
//
// TROIS NIVEAUX DE DÉTAIL par cellule, selon sa distance à la caméra (bord le plus proche de la cellule) : un sommet
// tous les 0,5 m (les nœuds de la grille, 8 192 triangles) à moins de 48 m, tous les mètres jusqu'à 96 m (2 048), tous
// les deux mètres au-delà (512) ; sur téléphone, 32 et 64 m. 4 m d'hystérésis : une caméra qui hésite à 48 m ne fait
// pas clignoter la cellule.
// Les bords des cellules tombent sur la trame de 2 m des nœuds, commune aux trois niveaux : deux cellules voisines
// partagent toujours leurs sommets de bord au niveau le plus grossier, et une JUPE verticale de 1,5 m sous chaque bord
// bouche les fentes qui s'ouvrent entre un niveau fin et un niveau grossier.
//
// UN SEUL APPEL DE DESSIN pour tout le sol : un BatchedMesh de three (une géométrie et une instance par cellule, le
// tri et l'élagage par le cadre de la caméra se font cellule par cellule). Chaque cellule y a réservé la place de son
// niveau le plus fin ; changer de niveau, c'est réécrire sa place (setGeometryAt), au plus 2 ms par image sur PC
// (1 ms sur téléphone), la cellule la plus proche d'abord. Les sommets sont posés directement dans le repère du monde
// affiché (terrain 1, ou terrain 2 décalé de Monde.dx) : les matrices des instances restent l'identité.
//
// LES MURS. Le sol n'interpole jamais à travers une frontière DURE entre deux nappes (un mur de soutènement, le bord
// d'un bassin, le côté d'un escalier : plus de 0,35 m d'écart, tools/parc/LISEZMOI.md § 5). Au niveau fin, un carré de
// la grille à cheval sur une telle frontière est découpé comme Monde.sol le lit : chacun de ses quatre coins garde le
// quart qui l'entoure (la règle du « coin le plus proche »), à la hauteur de SA nappe, et une paroi verticale ferme la
// marche entre deux quarts de nappes différentes. Le pied du joueur, la balle et le maillage lisent donc la même
// marche, au même endroit. (Aux niveaux grossiers, vus de loin, le mur devient une pente raide.)
//
// LE PLATEAU n'est pas redessiné : ses plans d'aujourd'hui (enrobé, bords, terre du pin) restent tels quels, et le
// sol s'arrête EXACTEMENT sur son rectangle (repere.plateau) — la cellule du plateau reçoit des colonnes et des rangées
// supplémentaires sur ses bords, et ne quitte jamais le niveau fin. Rien ne dépasse de l'enrobé.
//
// AU-DELÀ DE LA GRILLE (le monde s'arrête à x -160 / +60 et z -135 / +200), une BORDURE prolonge le sol à plat sur
// 300 m, à la hauteur de chaque bord : le brouillard la noie, et l'on ne voit pas le vide sous l'horizon. Passé ses six
// premiers mètres, c'est de la terre nue uniforme (voir SOL_MELANGE). Le décor lointain (la Seine jusqu'à l'île, les
// immeubles du boulevard) vient avec les lots B1 et B11.
//
// LE MATÉRIAU (materiauSolParc) : la pelouse, le sous-bois et la terre nue du décor d'aujourd'hui (mêmes dessins, lus
// dans leurs images cuites), mélangés par la carte sols.webp de l'outil de données, et les massifs par-dessus ; le
// détail photo de js/surfaces_parc.js (brins, relief, rugosité), déjà projeté dans le repère du monde, s'y ajoute.
// Les allées ne sont PAS dans la carte (trop floue à 4,6 px/m) : la terre nue les marque en attendant les rubans des
// zones (lots B).

const TRAME = 2;                           // les bords des cellules tombent sur cette trame (m) : commune aux 3 niveaux
const PAS_LOD = [0.5, 1, 2];               // écart des sommets (m) aux niveaux 0, 1, 2
const DIST_LOD = [48, 96];                 // au-delà de 48 m le niveau 1, au-delà de 96 m le niveau 2
const DIST_LOD_TEL = [32, 64];             // (téléphone : un tiers plus près, le sol y pèse moins de 120 000 triangles)
const HYST = 4;                            // hystérésis (m)
const JUPE = 1.5;                          // profondeur des jupes de bord de cellule (m)
const BORDURE = 300;                       // le sol s'étend encore d'autant au-delà de la grille (m)
const VERS_DUR = 32, IDX_DUR = 48;         // au plus, par carré découpé : 4 quarts + 4 parois (sommets, indices)

const MOBILE = TELEPHONE;   // js/appareil.js : la même détection pour tout le jeu (et `?tel=1`)

// le sol en service (celui du dernier parc installé) : dataTextureHauteurs() le lit
let _actif = null;

// =====================================================================
//  LE SOL : cellules, niveaux de détail, bordure, un BatchedMesh
// =====================================================================
export class SolParc {
  // `donnees` : ce que rend chargerMonde (js/monde_donnees.js) ; `dx` : décalage du décor (parc2) ; `textures` : voir
  // materiauSolParc. Le monde (js/monde.js) doit être installé avec ces données : les sommets découpés le lisent.
  constructor(scene, donnees, { dx = 0, textures, mobile = MOBILE } = {}) {
    const t0 = performance.now();
    this.d = donnees; this.dx = dx; this.mobile = mobile;
    const R = this.R = donnees.repere;
    this.S = donnees.grilles.sol; this.N = donnees.grilles.nappes;
    this.doux = (donnees.seuils && donnees.seuils.seuilDoux) || 0.35;
    const P = Array.isArray(R.plateau) ? R.plateau : [-23.7, -9.1, 6.3, 9.1];
    this.p = { x0: P[0], z0: P[1], x1: P[2], z1: P[3] };
    // les bords de la grille, sur la trame de 2 m (x -160 à 60, z -135 à 199 : le dernier mètre en z est laissé à la
    // bordure, qui part de la même hauteur)
    this.gx0 = R.x0; this.gz0 = R.z0;
    this.gx1 = R.x0 + TRAME * Math.floor(R.pas * (R.nx - 1) / TRAME + 1e-9);
    this.gz1 = R.z0 + TRAME * Math.floor(R.pas * (R.nz - 1) / TRAME + 1e-9);
    this.budget = mobile ? 1 : 2;
    this.dist = mobile ? DIST_LOD_TEL : DIST_LOD;
    this._n = new THREE.Vector3(); this._chantier = null; this._statsAge = 0;

    this.cellules = this._decouper();
    this._compterDurs();
    this.materiau = materiauSolParc(textures, donnees.sols, R, dx, mobile);

    // la place de chaque cellule (son niveau fin), et celle de la bordure
    const bord = this._bordure();
    let nv = bord.attributes.position.count, ni = bord.index.count;
    for (const c of this.cellules) {
      const nX = Math.round((c.xb - c.xa) / PAS_LOD[0]) + 1 + (c.plateau ? 2 : 0);
      const nZ = Math.round((c.zb - c.za) / PAS_LOD[0]) + 1 + (c.plateau ? 2 : 0);
      c.capV = nX * nZ + 2 * (nX + nZ) + VERS_DUR * c.durs;
      c.capI = 6 * (nX - 1) * (nZ - 1) + 12 * (nX + nZ) + IDX_DUR * c.durs;
      nv += c.capV; ni += c.capI;
    }
    this.nv = nv; this.ni = ni;                    // (la place réservée, pour les mesures)
    const m = this.mesh = new THREE.BatchedMesh(this.cellules.length + 1, nv, ni, this.materiau);
    m.name = 'sol du parc';
    m.receiveShadow = true; m.castShadow = false;
    m.frustumCulled = false;                       // (il couvre tout le monde : l'élagage se fait cellule par cellule)
    m.userData.nofuse = true;                      // l'optimiseur du décor (js/court.js) n'y touche pas
    // au départ : le niveau de chaque cellule vu depuis le centre du terrain joué (la caméra du menu y tourne)
    const x0 = -dx, z0 = 0;
    for (const c of this.cellules) {
      c.dist = this._distance(c, x0, z0);
      const lod = this._niveauVoulu(c);
      const g = this._geometrie(c, lod);
      c.geo = m.addGeometry(g, c.capV, c.capI);
      c.inst = m.addInstance(c.geo);
      c.lod = lod;
    }
    this.geoBord = m.addGeometry(bord);
    m.addInstance(this.geoBord);
    scene.add(m);
    this.msInstallation = Math.round(performance.now() - t0);
    this._stats(0);
    _actif = this;
    // appelé par Monde.maj à chaque image (voir installerParcComplet, js/parc/index.js)
    this.maj = (dt, camera) => this._maj(camera);
  }

  // ------------------------------------------------------------------ les cellules
  // Les cellules de monde.json (32 m, origine calée pour que le plateau tienne dans une seule), bords ramenés sur la
  // trame de 2 m des nœuds et rognés à la grille.
  _decouper() {
    const C = this.d.cellules || { x0: -24.7, z0: -16, taille: 32, i: [-5, 2], k: [-4, 6] };
    const cale = (v, o) => o + TRAME * Math.round((v - o) / TRAME);
    const liste = [], p = this.p;
    for (let k = C.k[0]; k <= C.k[1]; k++) for (let i = C.i[0]; i <= C.i[1]; i++) {
      const xa = Math.max(this.gx0, cale(C.x0 + C.taille * i, this.gx0)), xb = Math.min(this.gx1, cale(C.x0 + C.taille * (i + 1), this.gx0));
      const za = Math.max(this.gz0, cale(C.z0 + C.taille * k, this.gz0)), zb = Math.min(this.gz1, cale(C.z0 + C.taille * (k + 1), this.gz0));
      if (xb - xa < TRAME || zb - za < TRAME) continue;
      const plateau = xa <= p.x0 && xb >= p.x1 && za <= p.z0 && zb >= p.z1;
      liste.push({ i, k, xa, xb, za, zb, plateau, lod: -1, voulu: 0, dist: 0, durs: 0, capV: 0, capI: 0, geo: -1, inst: -1 });
    }
    return liste;
  }

  // Le nombre de carrés de la grille à cheval sur une frontière dure, par cellule : la place à réserver.
  _compterDurs() {
    const R = this.R, nx = R.nx;
    for (const c of this.cellules) {
      const i0 = Math.round((c.xa - R.x0) / R.pas), i1 = Math.round((c.xb - R.x0) / R.pas);
      const k0 = Math.round((c.za - R.z0) / R.pas), k1 = Math.round((c.zb - R.z0) / R.pas);
      let n = 0;
      for (let k = k0; k < k1; k++) for (let i = i0; i < i1; i++) if (this._dur(k * nx + i)) n++;
      c.durs = n;
    }
  }

  // Le carré de la grille dont le coin (i, k) est à l'indice `a` est-il à cheval sur une frontière DURE : deux de ses
  // coins dans deux nappes différentes, à 0,35 m ou plus l'un de l'autre ?
  _dur(a) {
    const N = this.N, S = this.S, b = a + 1, c = a + this.R.nx, d = c + 1;
    const na = N[a], nb = N[b], nc = N[c], nd = N[d];
    if (na === nb && na === nc && na === nd) return false;
    const lim = this.doux * 100, ha = S[a], hb = S[b], hc = S[c], hd = S[d];
    return (na !== nb && Math.abs(ha - hb) >= lim) || (na !== nc && Math.abs(ha - hc) >= lim) || (na !== nd && Math.abs(ha - hd) >= lim)
      || (nb !== nc && Math.abs(hb - hc) >= lim) || (nb !== nd && Math.abs(hb - hd) >= lim) || (nc !== nd && Math.abs(hc - hd) >= lim);
  }

  // Distance horizontale de (x, z) — repère du terrain 1 — au bord le plus proche de la cellule.
  _distance(c, x, z) {
    const ex = x < c.xa ? c.xa - x : x > c.xb ? x - c.xb : 0, ez = z < c.za ? c.za - z : z > c.zb ? z - c.zb : 0;
    return Math.hypot(ex, ez);
  }

  _niveauVoulu(c) {
    if (c.plateau) return 0;                       // la cellule du plateau reste toujours fine (ses bords collent à l'enrobé)
    const d = c.dist;
    const D = this.dist;
    let v = d < D[0] ? 0 : d < D[1] ? 1 : 2;
    if (c.lod >= 0 && v !== c.lod && Math.abs(d - D[Math.min(v, c.lod)]) < HYST) v = c.lod;
    return v;
  }

  // ------------------------------------------------------------------ chaque image
  // Les changements de niveau, la cellule la plus proche d'abord, EN TRANCHES : le maillage d'une cellule se construit
  // par paquets de rangées (un générateur, voir _construire) tant que le budget de l'image n'est pas épuisé, puis il
  // remplace l'ancien d'un coup (setGeometryAt). Une cellule fine coûte 1,5 à 4 ms sur PC, trois à quatre fois plus
  // sur téléphone : construite d'un bloc, elle ferait un à-coup ; en tranches, jamais plus que le budget (et au moins
  // une tranche par image). Un chantier qui ne sert plus (la caméra est repartie) est abandonné.
  _maj(camera) {
    if (!camera) return;
    const t0 = performance.now(), x = camera.position.x - this.dx, z = camera.position.z;
    let attente = 0;
    for (const c of this.cellules) {
      c.dist = this._distance(c, x, z);
      c.voulu = this._niveauVoulu(c);
      if (c.voulu !== c.lod) attente++;
    }
    const ch = this._chantier;
    if (ch && ch.c.voulu !== ch.lod) this._chantier = null;
    let tranches = 0, poses = 0;
    while (attente > 0 && (tranches === 0 || performance.now() - t0 < this.budget)) {
      if (!this._chantier) {
        let c = null;
        for (const e of this.cellules) if (e.voulu !== e.lod && (!c || e.dist < c.dist)) c = e;
        if (!c) break;
        this._chantier = { c, lod: c.voulu, gen: this._construire(c, c.voulu) };
      }
      const r = this._chantier.gen.next();
      tranches++;
      if (r.done) {
        const { c, lod } = this._chantier;
        this.mesh.setGeometryAt(c.geo, r.value);
        c.lod = lod; this._chantier = null; attente--; poses++;
      }
    }
    if (tranches || this._statsAge++ > 30) this._stats(performance.now() - t0, attente);
  }

  // Ce que __perf (js/debug_monde.js) affiche : le temps de construction de l'image, les cellules par niveau.
  _stats(ms, attente = 0) {
    this._statsAge = 0;
    const lod = [0, 0, 0];
    for (const c of this.cellules) lod[c.lod]++;
    Monde.stats = { ...(Monde.stats || {}), msParImage: +ms.toFixed(2),
      sol: { cellules: this.cellules.length, niveau0: lod[0], niveau1: lod[1], niveau2: lod[2], enAttente: attente, msInstallation: this.msInstallation,
        // mémoire réservée : position (12 o) et normale (3 o) par sommet, index sur 4 o
        mo: +((this.nv * 15 + this.ni * 4) / 1048576).toFixed(1) } };
  }

  // ------------------------------------------------------------------ le maillage d'une cellule
  // La cellule `c` au niveau `lod` : une BufferGeometry (position Float32, normale Int8 normalisée, index), dans le
  // repère du monde affiché.
  construireCellule(c, lod) { return this._geometrie(c, lod); }

  // d'un bloc (à l'installation, et pour les outils)
  _geometrie(c, lod) {
    const gen = this._construire(c, lod);
    let r = gen.next();
    while (!r.done) r = gen.next();
    return r.value;
  }

  // en tranches : rend la main (yield) toutes les TRANCHE rangées ; la valeur finale est la géométrie
  * _construire(c, lod) {
    const TRANCHE = 12;
    const R = this.R, S = this.S, dx = this.dx, s = PAS_LOD[lod], p = this.p;
    // colonnes et rangées : la trame du niveau, plus, dans la cellule du plateau, ses quatre bords exacts
    const xs = [], zs = [];
    for (let x = c.xa; x <= c.xb + 1e-6; x += s) xs.push(Math.round(x * 1000) / 1000);
    for (let z = c.za; z <= c.zb + 1e-6; z += s) zs.push(Math.round(z * 1000) / 1000);
    if (c.plateau) { inserer(xs, p.x0); inserer(xs, p.x1); inserer(zs, p.z0); inserer(zs, p.z1); }
    const nX = xs.length, nZ = zs.length;
    const durs = lod === 0 ? c.durs : 0;
    const capV = nX * nZ + 2 * (nX + nZ) + VERS_DUR * durs, capI = 6 * (nX - 1) * (nZ - 1) + 12 * (nX + nZ) + IDX_DUR * durs;
    const G = { pos: new Float32Array(capV * 3), nor: new Int8Array(capV * 3), idx: new Uint32Array(capI), nv: 0, ni: 0,
      yMin: Infinity, yMax: -Infinity };
    // colonne / rangée sur un nœud de la grille ? (-1 sinon : les bords exacts du plateau)
    const ci = xs.map((x) => { const f = (x - R.x0) / R.pas; return Math.abs(f - Math.round(f)) < 1e-6 ? Math.round(f) : -1; });
    const ck = zs.map((z) => { const f = (z - R.z0) / R.pas; return Math.abs(f - Math.round(f)) < 1e-6 ? Math.round(f) : -1; });
    const pn = Math.max(1, Math.round(s / R.pas));   // écart des différences de la normale, en nœuds
    const n = this._n;
    // 1. les sommets de la grille
    for (let r = 0; r < nZ; r++) {
      for (let q = 0; q < nX; q++) {
        const x = xs[q], z = zs[r];
        let y;
        if (ci[q] >= 0 && ck[r] >= 0) { y = S[ck[r] * R.nx + ci[q]] / 100; this._normaleNoeud(ci[q], ck[r], pn, n); }
        else { y = Monde.sol(x + dx, z); Monde.normale(x + dx, z, n); }
        sommet(G, x + dx, y, z, n.x, n.y, n.z);
      }
      if (r % TRANCHE === TRANCHE - 1) yield;
    }
    // 2. les carrés
    const fin = lod === 0;
    for (let r = 0; r < nZ - 1; r++) for (let q = 0; q < nX - 1; q++) {
      if (q === 0 && r % TRANCHE === TRANCHE - 1) yield;
      if (c.plateau) {
        const xm = (xs[q] + xs[q + 1]) / 2, zm = (zs[r] + zs[r + 1]) / 2;
        if (xm > p.x0 && xm < p.x1 && zm > p.z0 && zm < p.z1) continue;          // sous l'enrobé : rien
      }
      const a = r * nX + q, b = a + 1, cc = a + nX, d = cc + 1;
      // un carré de la grille (niveau fin, quatre coins sur des nœuds) à cheval sur une frontière dure : découpé
      if (fin && ci[q] >= 0 && ci[q + 1] === ci[q] + 1 && ck[r] >= 0 && ck[r + 1] === ck[r] + 1) {
        const j = ck[r] * R.nx + ci[q];
        if (this._dur(j)) { this._carreDur(G, j, xs[q], xs[q + 1], zs[r], zs[r + 1]); continue; }
      }
      tri(G, a, cc, b); tri(G, b, cc, d);
    }
    // 3. les jupes des quatre bords (vers l'extérieur de la cellule)
    const bordX = (q) => { const l = []; for (let r = 0; r < nZ; r++) l.push(r * nX + q); return l; };
    const bordZ = (r) => { const l = []; for (let q = 0; q < nX; q++) l.push(r * nX + q); return l; };
    jupe(G, bordX(0), -1, 0); jupe(G, bordX(nX - 1), 1, 0); jupe(G, bordZ(0), 0, -1); jupe(G, bordZ(nZ - 1), 0, 1);
    return geometrieDe(G, c.xa + dx, c.xb + dx, c.za, c.zb);
  }

  // Normale au nœud (i, k) : différences centrées à `p` nœuds, DANS la nappe du nœud. Un voisin d'une autre nappe à
  // plus de 0,35 m (derrière un mur) est laissé de côté : la différence se fait d'un seul côté. Le haut et le pied d'un
  // mur restent donc éclairés comme le sol qu'ils sont, sans liseré sombre.
  _normaleNoeud(i, k, p, out) {
    const R = this.R, S = this.S, N = this.N, nx = R.nx, j = k * nx + i, n = N[j], h = S[j], lim = this.doux * 100;
    const il = Math.max(0, i - p), ir = Math.min(nx - 1, i + p), kl = Math.max(0, k - p), kr = Math.min(R.nz - 1, k + p);
    const jl = k * nx + il, jr = k * nx + ir, jb = kl * nx + i, jh = kr * nx + i;
    const okl = il < i && (N[jl] === n || Math.abs(S[jl] - h) < lim), okr = ir > i && (N[jr] === n || Math.abs(S[jr] - h) < lim);
    const okb = kl < k && (N[jb] === n || Math.abs(S[jb] - h) < lim), okh = kr > k && (N[jh] === n || Math.abs(S[jh] - h) < lim);
    const e = R.pas * 100;
    const gx = okl && okr ? (S[jr] - S[jl]) / ((ir - il) * e) : okr ? (S[jr] - h) / ((ir - i) * e) : okl ? (h - S[jl]) / ((i - il) * e) : 0;
    const gz = okb && okh ? (S[jh] - S[jb]) / ((kr - kl) * e) : okh ? (S[jh] - h) / ((kr - k) * e) : okb ? (h - S[jb]) / ((k - kl) * e) : 0;
    const l = Math.hypot(gx, 1, gz);
    out.x = -gx / l; out.y = 1 / l; out.z = -gz / l;
    return out;
  }

  // UN CARRÉ À CHEVAL SUR UN MUR (coin (i, k) à l'indice j, de x0 à x1 et de z0 à z1, repère du terrain 1). Chaque coin
  // garde le quart qui l'entoure, à la hauteur de SA nappe (Monde.solNappe, la règle même de Monde.sol) ; entre deux
  // quarts de nappes différentes, une paroi verticale, tournée vers le côté bas.
  _carreDur(G, j, x0, x1, z0, z1) {
    const R = this.R, N = this.N, dx = this.dx, n = this._n;
    const J = [j, j + 1, j + R.nx, j + R.nx + 1];
    const X = [x0, x1, x0, x1], Z = [z0, z0, z1, z1], xm = (x0 + x1) / 2, zm = (z0 + z1) / 2;
    // les hauteurs de chaque quart : [coin, milieu du bord en x, milieu du bord en z, centre]
    const H = [];
    for (let q = 0; q < 4; q++) {
      const nq = N[J[q]], ki = Math.round((Z[q] - R.z0) / R.pas), ii = Math.round((X[q] - R.x0) / R.pas);
      const h = [this.S[J[q]] / 100, Monde.solNappe(xm + dx, Z[q], nq), Monde.solNappe(X[q] + dx, zm, nq), Monde.solNappe(xm + dx, zm, nq)];
      H.push(h);
      this._normaleNoeud(ii, ki, 1, n);
      // le quart, de (xa, za) à (xb, zb), coins dans l'ordre (xa,za) (xb,za) (xa,zb) (xb,zb)
      const xa = Math.min(X[q], xm), xb = Math.max(X[q], xm), za = Math.min(Z[q], zm), zb = Math.max(Z[q], zm);
      const hy = (x, z) => (x === X[q] ? (z === Z[q] ? h[0] : h[2]) : (z === Z[q] ? h[1] : h[3]));
      const v0 = sommet(G, xa + dx, hy(xa, za), za, n.x, n.y, n.z), v1 = sommet(G, xb + dx, hy(xb, za), za, n.x, n.y, n.z);
      const v2 = sommet(G, xa + dx, hy(xa, zb), zb, n.x, n.y, n.z), v3 = sommet(G, xb + dx, hy(xb, zb), zb, n.x, n.y, n.z);
      tri(G, v0, v2, v1); tri(G, v1, v2, v3);
    }
    // les parois : entre a|b et c|d (le long de x = xm), entre a|c et b|d (le long de z = zm). Pour chaque paire, les
    // deux bouts de la ligne commune : [x, z, indice de la hauteur chez p, chez q]
    const paroi = (p, q, xA, zA, iA, xB, zB, iB) => {
      if (N[J[p]] === N[J[q]]) return;
      const pA = H[p][iA === 'x' ? 1 : iA === 'z' ? 2 : 3], pB = H[p][iB === 'x' ? 1 : iB === 'z' ? 2 : 3];
      const qA = H[q][iA === 'x' ? 1 : iA === 'z' ? 2 : 3], qB = H[q][iB === 'x' ? 1 : iB === 'z' ? 2 : 3];
      if (Math.abs(pA - qA) < 0.01 && Math.abs(pB - qB) < 0.01) return;
      // tournée vers le côté le plus bas
      const bas = pA + pB > qA + qB ? q : p, haut = bas === p ? q : p;
      let nx = X[bas] - X[haut], nz = Z[bas] - Z[haut];
      const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
      const tA = Math.max(pA, qA), bA = Math.min(pA, qA), tB = Math.max(pB, qB), bB = Math.min(pB, qB);
      const a = sommet(G, xA + dx, tA, zA, nx, 0, nz), b = sommet(G, xA + dx, bA, zA, nx, 0, nz);
      const c = sommet(G, xB + dx, tB, zB, nx, 0, nz), d = sommet(G, xB + dx, bB, zB, nx, 0, nz);
      // sens des triangles : (a, b, c) a pour normale (-uz, 0, ux), u = de A vers B
      const ux = xB - xA, uz = zB - zA;
      if (-uz * nx + ux * nz > 0) { tri(G, a, b, c); tri(G, c, b, d); } else { tri(G, a, c, b); tri(G, c, d, b); }
    };
    // (les « bouts » : 'x' = milieu du bord en x du coin, 'z' = milieu du bord en z, 'o' = le centre)
    paroi(0, 1, xm, z0, 'x', xm, zm, 'o');         // a | b : de (xm, z0) au centre
    paroi(2, 3, xm, zm, 'o', xm, z1, 'x');         // c | d : du centre à (xm, z1)
    paroi(0, 2, x0, zm, 'z', xm, zm, 'o');         // a | c : de (x0, zm) au centre
    paroi(1, 3, xm, zm, 'o', x1, zm, 'z');         // b | d : du centre à (x1, zm)
  }

  // ------------------------------------------------------------------ la bordure
  // Au-delà de la grille, le sol continue à plat, à la hauteur de son bord (tous les 2 m), sur BORDURE mètres : quatre
  // bandes et quatre coins. Normales vers le ciel.
  _bordure() {
    const R = this.R, S = this.S, dx = this.dx, X0 = this.gx0, X1 = this.gx1, Z0 = this.gz0, Z1 = this.gz1, D = BORDURE;
    const h = (x, z) => S[Math.round((z - R.z0) / R.pas) * R.nx + Math.round((x - R.x0) / R.pas)] / 100;
    const nzb = Math.round((Z1 - Z0) / TRAME) + 1, nxb = Math.round((X1 - X0) / TRAME) + 1;
    const cap = 4 * (nzb + nxb) + 16;
    const G = { pos: new Float32Array(cap * 3), nor: new Int8Array(cap * 3), idx: new Uint32Array(cap * 6), nv: 0, ni: 0, yMin: Infinity, yMax: -Infinity };
    const quad = (a, b, c, d) => {                 // a b c d : un quadrilatère, dans l'ordre (a, b) dedans, (c, d) dehors
      // sens : la normale de (a, c, b) doit monter
      const P = G.pos, ax = P[a * 3], az = P[a * 3 + 2], bx = P[b * 3], bz = P[b * 3 + 2], cx = P[c * 3], cz = P[c * 3 + 2];
      const ny = (cz - az) * (bx - ax) - (cx - ax) * (bz - az);
      if (ny > 0) { tri(G, a, c, b); tri(G, b, c, d); } else { tri(G, a, b, c); tri(G, b, d, c); }
    };
    const bande = (pts, ox, oz) => {               // pts : [x, z] le long du bord ; (ox, oz) : vers l'extérieur
      let pa = -1, pb = -1;
      for (const [x, z] of pts) {
        const y = h(x, z);
        const a = sommet(G, x + dx, y, z, 0, 1, 0), b = sommet(G, x + ox * D + dx, y, z + oz * D, 0, 1, 0);
        if (pa >= 0) quad(pa, a, pb, b);
        pa = a; pb = b;
      }
    };
    const le = (a0, a1, f) => { const l = []; for (let v = a0; v <= a1 + 1e-6; v += TRAME) l.push(f(v)); return l; };
    bande(le(Z0, Z1, (z) => [X0, z]), -1, 0);
    bande(le(Z0, Z1, (z) => [X1, z]), 1, 0);
    bande(le(X0, X1, (x) => [x, Z0]), 0, -1);
    bande(le(X0, X1, (x) => [x, Z1]), 0, 1);
    for (const [x, z, sx, sz] of [[X0, Z0, -1, -1], [X1, Z0, 1, -1], [X0, Z1, -1, 1], [X1, Z1, 1, 1]]) {
      const y = h(x, z);
      const a = sommet(G, x + dx, y, z, 0, 1, 0), b = sommet(G, x + sx * D + dx, y, z, 0, 1, 0);
      const c = sommet(G, x + dx, y, z + sz * D, 0, 1, 0), d = sommet(G, x + sx * D + dx, y, z + sz * D, 0, 1, 0);
      quad(a, b, c, d);
    }
    return geometrieDe(G, X0 - D + dx, X1 + D + dx, Z0 - D, Z1 + D);
  }

  // La DataTexture des hauteurs (voir dataTextureHauteurs plus bas).
  textureHauteurs() {
    if (this._texH) return this._texH;
    const R = this.R, S = this.S, p = this.p, n = R.nx * R.nz, d = new Uint16Array(n);
    for (let k = 0; k < R.nz; k++) for (let i = 0; i < R.nx; i++) {
      const x = R.x0 + i * R.pas, z = R.z0 + k * R.pas, j = k * R.nx + i;
      const plateau = x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1;
      d[j] = THREE.DataUtils.toHalfFloat(plateau ? 0 : S[j] / 100);
    }
    const t = new THREE.DataTexture(d, R.nx, R.nz, THREE.RedFormat, THREE.HalfFloatType);
    t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.flipY = false; t.needsUpdate = true;
    // u = (x - x0 - dx) / (pas·nx) + 0,5 / nx, et de même en z : le centre de chaque texel est un nœud
    t.userData.cadre = { x0: R.x0 + this.dx, z0: R.z0, pas: R.pas, nx: R.nx, nz: R.nz };
    this._texH = t;
    return t;
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.dispose();
    if (this._texH) this._texH.dispose();
    if (_actif === this) _actif = null;
  }
}

// =====================================================================
//  PETITS OUTILS DE MAILLAGE (sans allocation par sommet)
// =====================================================================
function sommet(G, x, y, z, nx, ny, nz) {
  const i = G.nv++, o = i * 3;
  G.pos[o] = x; G.pos[o + 1] = y; G.pos[o + 2] = z;
  G.nor[o] = Math.round(nx * 127); G.nor[o + 1] = Math.round(ny * 127); G.nor[o + 2] = Math.round(nz * 127);
  if (y < G.yMin) G.yMin = y;
  if (y > G.yMax) G.yMax = y;
  return i;
}
function tri(G, a, b, c) { G.idx[G.ni++] = a; G.idx[G.ni++] = b; G.idx[G.ni++] = c; }
// la jupe sous une rangée de sommets de bord : chacun est recopié JUPE mètres plus bas (même normale : dans une fente
// elle se lit comme le sol), la face tournée vers (ox, oz), l'extérieur de la cellule
function jupe(G, l, ox, oz) {
  if (l.length < 2) return;
  const P = G.pos, N = G.nor, bas = [];
  for (const v of l) {
    const o = v * 3;
    bas.push(sommet(G, P[o], P[o + 1] - JUPE, P[o + 2], N[o] / 127, N[o + 1] / 127, N[o + 2] / 127));
  }
  for (let i = 0; i + 1 < l.length; i++) {
    const a = l[i], b = l[i + 1], c = bas[i], d = bas[i + 1];
    // la normale de (a, c, b) vaut (-uz, 0, ux) à un facteur positif près (u : de a vers b ; de a vers c, on descend) :
    // on garde ce sens s'il regarde vers (ox, oz), sinon l'autre
    const ux = P[b * 3] - P[a * 3], uz = P[b * 3 + 2] - P[a * 3 + 2];
    if (-uz * ox + ux * oz > 0) { tri(G, a, c, b); tri(G, b, c, d); } else { tri(G, a, b, c); tri(G, b, d, c); }
  }
}
// insère v dans la liste triée l (sans doublon)
function inserer(l, v) {
  if (v <= l[0] || v >= l[l.length - 1]) return;
  let i = 0;
  while (l[i] < v) i++;
  if (Math.abs(l[i] - v) > 1e-6) l.splice(i, 0, v);
}
function geometrieDe(G, xa, xb, za, zb) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(G.pos.subarray(0, G.nv * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(G.nor.subarray(0, G.nv * 3), 3, true));
  g.setIndex(new THREE.BufferAttribute(G.idx.subarray(0, G.ni), 1));
  const y0 = isFinite(G.yMin) ? G.yMin : 0, y1 = isFinite(G.yMax) ? G.yMax : 0;
  g.boundingBox = new THREE.Box3(new THREE.Vector3(xa, y0, za), new THREE.Vector3(xb, y1, zb));
  g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
  return g;
}

// =====================================================================
//  LE MATÉRIAU DU SOL DU PARC
// =====================================================================
// Un MeshStandardMaterial ordinaire (lumière, ombres, brouillard, pluie, carte d'environnement : comme toute la scène)
// dont la couleur est remplacée par le mélange de quatre sols, projetés dans le repère du monde (des sommets sans UV) :
//   R de sols.webp : la pelouse du parc (tuile de 5 m, celle de la pelouse d'aujourd'hui) ;
//   G : le sous-bois (la terre du talus du pin : humus, aiguilles, feuilles mortes ; 2 m) ;
//   B : la terre nue (la terre du quai, gravillons et feuilles sèches ; 1 m sur 2) — sous les allées, en attendant leurs
//       rubans ;
//   A : les massifs, par-dessus : la haie taillée du jardin (1 m), piquée au tiers du massif orange et jaune de la
//       terrasse (l'automne ; 1,3 m).
// Sur PC, la pelouse et le sous-bois sont lus deux fois (la seconde tournée de 37° et décalée, un bruit lent passe de
// l'une à l'autre) : sur 100 m de pelouse, une tuile répétée dessinerait un damier. De grandes nuances (taches de
// 10 à 30 m) cassent l'aplat. Au-delà, rien : `polygonOffset` recule le sol d'un cheveu dans le tampon de profondeur,
// pour que les plans posés à fleur (l'enrobé, la terre du pin, le stabilisé drapé) passent toujours devant.
// `textures` : { herbe, sousBois, terre, massif, fleurs } (js/court_parc.js, texturesSolParc) ; `carte` : sols.webp décodée.
export function materiauSolParc(textures, carte, R, dx = 0, mobile = MOBILE) {
  const tCarte = carte && carte.isTexture ? carte : new THREE.Texture(carte);
  tCarte.flipY = false; tCarte.premultiplyAlpha = false; tCarte.colorSpace = THREE.NoColorSpace;
  tCarte.wrapS = tCarte.wrapT = THREE.ClampToEdgeWrapping;
  tCarte.minFilter = THREE.LinearMipmapLinearFilter; tCarte.magFilter = THREE.LinearFilter; tCarte.anisotropy = 4;
  tCarte.needsUpdate = true;
  const T = textures || {};
  for (const t of [T.herbe, T.sousBois, T.terre, T.massif, T.fleurs]) if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; }
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 4 });
  m.name = 'sol du parc';
  const blanc = new THREE.DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1); blanc.needsUpdate = true;
  const U = {
    tMelange: { value: tCarte },
    tHerbe: { value: T.herbe || blanc }, tSousBois: { value: T.sousBois || blanc }, tTerre: { value: T.terre || blanc }, tMassif: { value: T.massif || blanc },
    tFleurs: { value: T.fleurs || T.massif || blanc },
    // le cadre de la carte : x0 affiché (décalage du terrain 2 compris), z0, 1 / largeur, 1 / profondeur
    uCadre: { value: new THREE.Vector4(R.x0 + dx, R.z0, 1 / (R.pas * (R.nx - 1)), 1 / (R.pas * (R.nz - 1))) },
    // 1 / côté de la tuile (m) : pelouse, sous-bois, terre nue, massif
    uTuile: { value: new THREE.Vector4(1 / 5, 1 / 2, 1 / 1, 1 / 1) },
    uAntiRep: { value: mobile ? 0 : 1 },
  };
  m.__uniformesSol = U;                         // (hors de userData : Material.copy le passe au JSON)
  m.onBeforeCompile = (sh) => {
    for (const k in U) sh.uniforms[k] = U[k];
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPosSol;\nvarying float vSolNy;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        {
          vec4 psol = vec4( transformed, 1.0 );
          #ifdef USE_BATCHING
            psol = batchingMatrix * psol;
          #endif
          vPosSol = ( modelMatrix * psol ).xyz;
          vSolNy = objectNormal.y;       // (matrices des cellules : l'identité)
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + SOL_ENTETE)
      .replace('#include <map_fragment>', SOL_MELANGE);
  };
  m.customProgramCacheKey = () => 'sol-du-parc-3';
  // le détail photo des pelouses (js/surfaces_parc.js), un peu retenu : il s'applique aussi à la terre et au sous-bois
  m.userData.surfaceParc = { cle: 'herbe', grain: 0.5, relief: 0.8 };
  return m;
}

const SOL_ENTETE = `
varying vec3 vPosSol;
varying float vSolNy;
uniform sampler2D tMelange, tHerbe, tSousBois, tTerre, tMassif, tFleurs;
uniform vec4 uCadre, uTuile;
uniform float uAntiRep;
float solHash( vec2 p ) { p = fract( p * vec2( 0.1031, 0.1030 ) ); p += dot( p, p.yx + 33.33 ); return fract( ( p.x + p.y ) * p.x ); }
float solBruit( vec2 p ) {
  vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( solHash( i ), solHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( solHash( i + vec2( 0.0, 1.0 ) ), solHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}
// une tuile lue une fois, ou deux (tournée de 37° et décalée) avec un bruit lent de l'une à l'autre ; les gradients sont
// passés à la main (textureGrad) : ces lectures sont dans des branches, où les dérivées implicites ne valent rien
vec3 solTuile( sampler2D t, vec2 p, vec2 gx, vec2 gy, float deux ) {
  vec3 a = textureGrad( t, p, gx, gy ).rgb;
  if ( deux > 0.5 ) {
    mat2 R = mat2( 0.8, - 0.6, 0.6, 0.8 );
    vec3 b = textureGrad( t, R * p + vec2( 0.37, 0.61 ), R * gx, R * gy ).rgb;
    a = mix( a, b, smoothstep( 0.3, 0.7, solBruit( p * 0.93 + 3.1 ) ) );
  }
  return a;
}
`;

const SOL_MELANGE = `
{
  vec2 pm = vPosSol.xz;
  vec2 uvM = vec2( ( pm.x - uCadre.x ) * uCadre.z, ( pm.y - uCadre.y ) * uCadre.w );
  vec4 mel = texture2D( tMelange, uvM );
  // AU-DELÀ DE LA GRILLE (la bordure de 300 m) : la carte, bornée à son bord, y étirait la dernière rangée de pixels
  // en longues bandes jusqu'à l'horizon (une prairie sans fin derrière le boulevard, des rayures vues du coteau).
  // Passé ses six premiers mètres, la bordure est de la terre nue uniforme : la ville, le quai, en attendant le décor
  // lointain des lots B1 et B11.
  vec2 horsM = max( - uvM, uvM - 1.0 ) / uCadre.zw;          // mètres hors de la carte, sur chaque axe
  mel = mix( mel, vec4( 0.0, 0.0, 1.0, 0.0 ), smoothstep( 0.0, 6.0, max( horsM.x, horsM.y ) ) );
  vec2 gx = dFdx( pm ), gy = dFdy( pm );
  // LES TOUFFES (relecture R2). La carte (4,6 px/m) passe d'un sol à l'autre en dégradés de deux ou trois mètres : lu
  // tel quel, un dégradé est un VOILE, de l'herbe transparente posée sur la terre (la flaque verte floue devant le
  // musée, vers (-85 ; -95)), et le relief vu de haut sortait en camouflage. Ici chaque part est comparée à un bruit de
  // 20 à 50 cm : là où la carte dit « moitié herbe », c'est une touffe d'herbe ou un trou de terre, pas une herbe à
  // moitié effacée ; de même les feuilles tombées et la terre nue, en plaques plus larges. Au loin, le seuil
  // s'élargit avec la taille du pixel et l'on retrouve le dégradé (des touffes plus petites qu'un pixel scintilleraient).
  {
    float s3 = mel.r + mel.g + mel.b;
    if ( s3 > 0.004 ) {
      vec3 pc = mel.rgb / s3;
      float pix = max( length( gx ), length( gy ) ), bande = 0.16 + 3.0 * pix;
      float nh = solBruit( pm * 2.3 + 5.3 ) * 0.62 + solBruit( pm * 6.1 - 2.7 ) * 0.38;
      float h = smoothstep( nh - bande, nh + bande, pc.r );
      float nf = solBruit( pm * 0.9 - 8.1 ) * 0.6 + solBruit( pm * 2.9 + 1.9 ) * 0.4;
      float f = smoothstep( nf - bande * 1.4, nf + bande * 1.4, pc.g / max( pc.g + pc.b, 1e-4 ) );
      mel.rgb = s3 * vec3( h, ( 1.0 - h ) * f, ( 1.0 - h ) * ( 1.0 - f ) );
    }
  }
  vec3 sol = vec3( 0.0 );
  float somme = mel.r + mel.g + mel.b;
  if ( mel.r > 0.004 ) sol += mel.r * solTuile( tHerbe, pm * uTuile.x, gx * uTuile.x, gy * uTuile.x, uAntiRep );
  // (relecture R2 : les feuilles tombées et la terre nue du parc entier, plus claires et plus chaudes que les images du
  // plateau qu'elles reprennent — l'humus noir du talus du pin, la terre grise du quai. SYNTHESE, Z14 : « terre et
  // feuilles sous les arbres », #a8906f ; ramenées, comme la terre battue du bosquet (Z16), un cran sous la photo, la
  // lumière du jeu fait le reste. Facteurs linéaires : la litière #4e3b2f sort vers #775c45, la terre #6a615a vers
  // #8d7e6d ; sous un couvert, mêlées, de #483d37 à l'écran à environ #74634f.)
  if ( mel.g > 0.004 ) sol += mel.g * solTuile( tSousBois, pm * uTuile.y, gx * uTuile.y, gy * uTuile.y, uAntiRep ) * vec3( 2.4, 2.4, 2.2 );
  // (la terre du quai est une toile de 1 m sur 2 : ses graviers restent ronds)
  vec2 kt = vec2( uTuile.z, uTuile.z * 0.5 );
  if ( mel.b > 0.004 ) sol += mel.b * textureGrad( tTerre, pm * kt, gx * kt, gy * kt ).rgb * vec3( 1.85, 1.75, 1.5 );
  sol /= max( somme, 0.004 );
  if ( mel.a > 0.004 ) {
    vec3 haie = textureGrad( tMassif, pm * uTuile.w, gx * uTuile.w, gy * uTuile.w ).rgb;
    vec3 fleurs = textureGrad( tFleurs, pm * 0.77, gx * 0.77, gy * 0.77 ).rgb;
    sol = mix( sol, mix( haie, fleurs, 0.33 ), mel.a );
  }
  // de grandes nuances, par taches de 10 à 30 m : l'herbe plus ou moins drue, la terre plus ou moins sèche
  sol *= mix( 0.88, 1.08, solBruit( pm * 0.045 ) * 0.6 + solBruit( pm * 0.13 + 7.0 ) * 0.4 );
  // LES PAROIS (le pied des murs, le bord des bassins, les jupes : normale presque horizontale) : vue de dessus, la
  // carte s'y étirerait en traînées verticales ; c'est de la terre, lue de face (le long du mur, et en hauteur)
  vec2 pf = vec2( vPosSol.x + vPosSol.z, vPosSol.y ) * kt, gfx = dFdx( pf ), gfy = dFdy( pf );
  if ( vSolNy < 0.35 ) sol = mix( textureGrad( tTerre, pf, gfx, gfy ).rgb * vec3( 1.85, 1.75, 1.5 ), sol, smoothstep( 0.15, 0.35, vSolNy ) );
  diffuseColor.rgb *= sol;
}
`;

// =====================================================================
//  OUTILS POUR LES AUTRES MODULES
// =====================================================================
// La cellule (i, k) de monde.json au niveau `lod` (0, 1, 2), du sol en service : une BufferGeometry à part (vérifications,
// essais). null s'il n'y a pas de sol installé ou pas de telle cellule.
export function construireCelluleSol(i, k, lod = 0) {
  if (!_actif) return null;
  const c = _actif.cellules.find((x) => x.i === i && x.k === k);
  return c ? _actif.construireCellule(c, c.plateau ? 0 : lod) : null;
}

// LA DATATEXTURE DES HAUTEURS du sol en service (R16F, un texel par nœud de la grille, filtrage linéaire, le plateau à
// 0) : ce que liront la cuisson des ombres par cellule et les ombres de contact drapées (lot A6). `userData.cadre` dit
// où elle tombe. null tant que le parc entier n'est pas installé.
export function dataTextureHauteurs() {
  return _actif ? _actif.textureHauteurs() : null;
}

// UN PLAN DRAPÉ SUR LE SOL : le rectangle [xa, xb] x [za, zb] (repère du monde AFFICHÉ, décalage du terrain 2 compris)
// à `dy` au-dessus de Monde.sol, pour un plan du décor qui doit suivre le relief (le stabilisé des platanes). Ses sommets
// tombent sur les nœuds de la grille (plus les bords du rectangle) et ses triangles sont coupés dans le même sens que
// ceux du sol : au niveau fin, il reste partout à `dy` au-dessus de lui. Les UV sont celles d'un PlaneGeometry couché
// (rotation.x = -π/2) sur le même rectangle : u de xa à xb, v de 1 en za à 0 en zb — la texture tombe comme avant.
// Rend une géométrie dans le repère du monde (le maillage reste à l'origine, sans rotation).
export function geometrieDrapee(xa, za, xb, zb, dy = 0) {
  const R = Monde.repere, pas = R ? R.pas : 0.5, x0 = R ? R.x0 + Monde.dx : 0, z0 = R ? R.z0 : 0;
  const axe = (a, b, o) => {
    const l = [a];
    for (let v = o + pas * (Math.floor((a - o) / pas) + 1); v < b - 1e-6; v += pas) if (v > a + 1e-6) l.push(Math.round(v * 1000) / 1000);
    l.push(b);
    return l;
  };
  const xs = axe(xa, xb, x0), zs = axe(za, zb, z0), nX = xs.length, nZ = zs.length;
  const pos = new Float32Array(nX * nZ * 3), nor = new Float32Array(nX * nZ * 3), uv = new Float32Array(nX * nZ * 2), idx = [];
  const n = { x: 0, y: 1, z: 0 };
  for (let r = 0; r < nZ; r++) for (let q = 0; q < nX; q++) {
    const j = r * nX + q, x = xs[q], z = zs[r];
    pos[j * 3] = x; pos[j * 3 + 1] = Monde.sol(x, z) + dy; pos[j * 3 + 2] = z;
    Monde.normale(x, z, n); nor[j * 3] = n.x; nor[j * 3 + 1] = n.y; nor[j * 3 + 2] = n.z;
    uv[j * 2] = (x - xa) / (xb - xa); uv[j * 2 + 1] = (zb - z) / (zb - za);
    if (q < nX - 1 && r < nZ - 1) idx.push(j, j + nX, j + 1, j + 1, j + nX, j + nX + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(nX * nZ > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}
