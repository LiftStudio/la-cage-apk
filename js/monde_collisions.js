// =====================================================================
//  LES COLLISIONS DU MONDE (parc de Bécon en entier, lot A3)
// =====================================================================
// Ce qu'on ne traverse pas dans le parc, en 2,5D (conception, § 0 D10 et § 3.1). Deux familles :
//
//  - LES FRONTIÈRES DE NAPPES (murs de soutènement, bords de terrasse, limons d'escalier, bords de bassin) : elles
//    sont dans la grille de sol elle-même, gratuites, et c'est js/monde.js qui les lit (franchir, pour les pieds
//    et les roues) ; pour la balle, faceDeNappe() plus bas ;
//  - LES OBSTACLES POSÉS, ici : cercles (troncs, bornes, manège), segments épais (grilles, haies, balustrades,
//    parapets, portillons, filets), boîtes orientées (bâtiments). Chacun a une hauteur `h` au-dessus du sol à son
//    pied, éventuellement un bas `bas` (un filet tendu au-dessus d'un trou du treillis : on passe dessous), et un
//    public `qui` ('tous', 'velo' = les montures, 'balle').
//
// TOUT EST DÉCLARÉ À L'INSTALLATION (D10) : les obstacles de monde.json, ceux de toutes les zones (obstaclesDesZones,
// sans attendre qu'une zone soit construite), les troncs des arbres de arbres.bin (troncsDesArbres) et ceux du décor
// du plateau que js/court_parc.js déclare en se construisant (grillages et leurs portillons, troncs gardés). Un joueur
// distant ne traverse donc jamais une grille que le client local n'a pas encore dessinée.
//
// LA GRILLE : cases de 4 m, rangées une fois pour toutes façon « CSR » (un tableau de débuts, un tableau d'indices) :
// une requête de rayon 1,2 m visite une à quatre cases, au lieu de parcourir des centaines d'obstacles.
//
// Ce module est PUR (ni three, ni DOM) : js/monde.js en garde l'instance du monde (COLLISIONS), js/ball.js y lit la
// balle, js/parc/index.js y assemble les listes. Les essais Node (tools/monde/test_monde.mjs) le chargent tel quel.
// Toutes les coordonnées ci-dessous sont celles du TERRAIN 1 (le repère des données) ; js/monde.js retire Monde.dx
// avant d'appeler, et les fonctions qui reçoivent le monde `M` (balle, faceDeNappe) le font elles-mêmes.

// côté d'une case de la grille des obstacles (m)
export const CASE = 4;
// les montures (vélo et « autres »), que vise un obstacle `qui: 'velo'`
export const MONTURES = new Set(['velo', 'trottinette', 'skate']);
// Au-dessus de ce bas, un obstacle ne concerne plus ni les piétons ni les montures : on passe dessous (le filet
// tendu au-dessus du trou du grillage du pin, à 2,10 m).
const BAS_TETE = 1.8;
// La balle : ce qu'elle garde de sa vitesse contre chaque sorte d'obstacle, [normale, tangentielle]. Un treillis
// est souple (c'était déjà le rebond du grillage du plateau : 0,3 et 0,8), une haie l'étouffe, la pierre et le fer
// forgé la renvoient.
const REBOND = {
  grille: [0.3, 0.8], filet: [0.25, 0.8], portillon: [0.3, 0.8], haie: [0.12, 0.5], cloture: [0.3, 0.8],
  arbre: [0.45, 0.85], dur: [0.5, 0.9],
};
const rebondDe = (o) => REBOND[o.type] || REBOND[o.t === 'c' ? 'arbre' : 'dur'];
// (pour savoir de quel côté d'un obstacle mince est le sol qui le porte : on regarde à 30 cm de part et d'autre)
const COTE = 0.3;

// Un obstacle concerne-t-il cet agent ? `qui` absent ou 'tous' : tout le monde ; 'velo' : toutes les montures.
export function concerne(o, agent) {
  const q = o.qui;
  return !q || q === 'tous' || q === agent || (q === 'velo' && MONTURES.has(agent));
}

// =====================================================================
//  DÉCLARER DES OBSTACLES (zones, décor)
// =====================================================================
// Le constructeur `o` que reçoit zone.obstacles(o) (conception, § 3.3), en coordonnées du terrain 1 :
//   o.cercle(x, z, r, { h, qui, type, bas })
//   o.segment(x0, z0, x1, z1, { e, h, qui, type, bas, trous, camera })   trous : [[a, b], ...] mètres depuis (x0, z0)
//   o.boite(x, z, hx, hz, a, { h, qui, type })                           a en RADIANS, de x+ vers z+ (comme monde.json)
// `camera: false` : l'obstacle ne retient pas la caméra (un grillage qu'on voit au travers, voir Monde.rayonLibre).
// Chaque appel rend `o`, pour enchaîner.
export function constructeurObstacles(liste = [], source = null) {
  const commun = (opt) => ({
    h: opt.h, qui: opt.qui || 'tous', type: opt.type, source: opt.source || source,
    ...(opt.bas !== undefined ? { bas: opt.bas } : {}), ...(opt.camera === false ? { camera: false } : {}),
  });
  const o = {
    liste,
    cercle(x, z, r, opt = {}) { liste.push({ t: 'c', x, z, r, ...commun(opt) }); return o; },
    segment(x0, z0, x1, z1, opt = {}) {
      liste.push({ t: 's', x0, z0, x1, z1, e: opt.e ?? 0.1, ...commun(opt), ...(opt.trous ? { trous: opt.trous } : {}) });
      return o;
    },
    boite(x, z, hx, hz, a = 0, opt = {}) { liste.push({ t: 'b', x, z, hx, hz, a, ...commun(opt) }); return o; },
  };
  return o;
}

// Les obstacles de TOUTES les zones enregistrées (js/parc/index.js, ZONES), qu'elles soient construites ou non :
// chaque zone.obstacles(o) est pur (sans three). Une zone fautive est signalée et ignorée, elle ne fait pas tomber le
// parc entier.
export function obstaclesDesZones(zones, liste = []) {
  for (const z of zones || []) {
    if (!z || typeof z.obstacles !== 'function') continue;
    const n0 = liste.length;
    try { z.obstacles(constructeurObstacles(liste, z.id || null)); } catch (e) {
      liste.length = n0;
      console.warn(`[monde] obstacles de la zone ${z.id || '?'} ignorés :`, e);
    }
  }
  return liste;
}

// LES TRONCS des arbres du parc (arbres.bin : x, z, hauteur, rayon de couronne, essence, variante ; tools/parc/
// LISEZMOI.md § 3.4). Le rayon du fût suit la hauteur : 15 cm pour un arbre de 6 m, 26 cm à 14 m, 40 cm à 24 m (les
// platanes du plateau, mesurés sur les photos, font 30 à 38 cm au pied). La balle n'est arrêtée que sous la naissance
// des branches (2,6 m, comme les platanes de Jemmapes) : au-dessus, elle passe dans le feuillage. Les arbustes et les
// ifs taillés sont des masses pleines jusqu'en haut : le disque prend une part de leur couronne.
// `essences` : monde.json > essences (les noms), pour reconnaître arbustes et ifs quel que soit leur indice.
export function troncsDesArbres(table, essences = [], liste = []) {
  if (!table || table.length < 6) return liste;
  const nom = (e) => (essences[e] && essences[e].nom) || '';
  for (let i = 0; i + 5 < table.length; i += 6) {
    const x = table[i], z = table[i + 1], H = table[i + 2], Rc = table[i + 3], e = nom(table[i + 4]);
    if (!(H > 0) || !Number.isFinite(x + z)) continue;
    if (e === 'arbuste' || e === 'if_conique') {
      liste.push({ t: 'c', x, z, r: Math.max(0.3, Math.min(1.2, Rc * (e === 'if_conique' ? 0.7 : 0.35))), h: H, qui: 'tous', type: 'arbuste', source: 'arbres.bin' });
    } else {
      liste.push({ t: 'c', x, z, r: Math.max(0.12, Math.min(0.45, 0.06 + 0.014 * H)), h: 2.6, qui: 'tous', type: 'arbre', source: 'arbres.bin' });
    }
  }
  return liste;
}

// =====================================================================
//  LA GRILLE DES OBSTACLES ET LES DISQUES
// =====================================================================
export class Collisions {
  constructor() {
    // (forme fixe, déclarée ici : ces champs sont lus à chaque pas de chaque joueur)
    this.obs = []; this.g = null; this.debuts = null; this.indices = null;
    this.vu = new Uint32Array(0); this.marque = 0;
    this._liste = []; this._q = { nx: 0, nz: 0, pen: 0, t: 0 };
  }

  vider() { this.obs = []; this.g = null; this.debuts = null; this.indices = null; this.vu = new Uint32Array(0); this.marque = 0; }

  // Range les obstacles dans la grille de 4 m (grilleCSR de la conception), une fois pour toutes. Un segment à trous
  // est découpé en ses parties pleines. Un portillon reste dans la grille même ouvert : c'est son champ `ouvert`, lu
  // à chaque requête, qui le fait ignorer (on l'ouvre ou le ferme sans rien réindexer). `piedAu(x, z)` : le sol du
  // monde au milieu de l'obstacle (pour la hauteur que voit la caméra), ou rien sur un monde plat.
  indexer(liste, piedAu = null) {
    const obs = [];
    for (const o0 of liste || []) {
      if (!o0 || !o0.t) continue;
      if (o0.t === 's' && Array.isArray(o0.trous) && o0.trous.length) {
        const L = Math.hypot(o0.x1 - o0.x0, o0.z1 - o0.z0) || 1, ux = (o0.x1 - o0.x0) / L, uz = (o0.z1 - o0.z0) / L;
        const trous = o0.trous.map(([a, b]) => [Math.min(a, b), Math.max(a, b)]).sort((p, q) => p[0] - q[0]);
        let s = 0;
        for (const [a, b] of [...trous, [L, L]]) {
          if (a > s + 1e-3) obs.push({ ...o0, trous: undefined, x0: o0.x0 + ux * s, z0: o0.z0 + uz * s, x1: o0.x0 + ux * Math.min(a, L), z1: o0.z0 + uz * Math.min(a, L) });
          s = Math.max(s, b);
        }
        continue;
      }
      obs.push(o0.t === 'b' ? { ...o0, _c: Math.cos(o0.a || 0), _s: Math.sin(o0.a || 0) } : { ...o0 });   // a en radians
    }
    // emprise (boîte englobante) de chaque obstacle, et le sol à son pied
    const bornes = obs.map((o) => {
      if (o.t === 'c') return [o.x - o.r, o.z - o.r, o.x + o.r, o.z + o.r];
      if (o.t === 's') { const e = (o.e || 0) / 2; return [Math.min(o.x0, o.x1) - e, Math.min(o.z0, o.z1) - e, Math.max(o.x0, o.x1) + e, Math.max(o.z0, o.z1) + e]; }
      const r = Math.hypot(o.hx, o.hz); return [o.x - r, o.z - r, o.x + r, o.z + r];
    });
    for (const o of obs) {
      const cx = o.t === 's' ? (o.x0 + o.x1) / 2 : o.x, cz = o.t === 's' ? (o.z0 + o.z1) / 2 : o.z;
      o._pied = piedAu ? piedAu(cx, cz) : 0;
    }
    this.obs = obs; this.vu = new Uint32Array(obs.length); this.marque = 0;
    if (!obs.length) { this.g = null; this.debuts = null; this.indices = null; return; }
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const b of bornes) { x0 = Math.min(x0, b[0]); z0 = Math.min(z0, b[1]); x1 = Math.max(x1, b[2]); z1 = Math.max(z1, b[3]); }
    const g = { x0, z0, ni: Math.max(1, Math.ceil((x1 - x0) / CASE) + 1), nk: Math.max(1, Math.ceil((z1 - z0) / CASE) + 1) };
    const cases = (b, f) => {
      const i0 = Math.floor((b[0] - g.x0) / CASE), i1 = Math.floor((b[2] - g.x0) / CASE);
      const k0 = Math.floor((b[1] - g.z0) / CASE), k1 = Math.floor((b[3] - g.z0) / CASE);
      for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) f(k * g.ni + i);
    };
    const nb = new Int32Array(g.ni * g.nk + 1);
    bornes.forEach((b) => cases(b, (c) => { nb[c + 1]++; }));
    for (let c = 0; c < g.ni * g.nk; c++) nb[c + 1] += nb[c];
    const rempli = nb.slice(0, -1), indices = new Int32Array(nb[g.ni * g.nk]);
    bornes.forEach((b, o) => cases(b, (c) => { indices[rempli[c]++] = o; }));
    this.g = g; this.debuts = nb; this.indices = indices;
  }

  // Indices des obstacles dont l'emprise touche le disque (x, z, r). `out` est vidé puis rempli, et rendu.
  pres(x, z, r, out = []) {
    out.length = 0;
    if (!this.debuts) return out;
    const g = this.g;
    const i0 = Math.max(0, Math.floor((x - r - g.x0) / CASE)), i1 = Math.min(g.ni - 1, Math.floor((x + r - g.x0) / CASE));
    const k0 = Math.max(0, Math.floor((z - r - g.z0) / CASE)), k1 = Math.min(g.nk - 1, Math.floor((z + r - g.z0) / CASE));
    if (i0 > i1 || k0 > k1) return out;
    const vu = this.vu, marque = ++this.marque;
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
      const c = k * g.ni + i;
      for (let j = this.debuts[c], f = this.debuts[c + 1]; j < f; j++) {
        const o = this.indices[j];
        if (vu[o] === marque) continue;
        vu[o] = marque; out.push(o);
      }
    }
    return out;
  }

  // RÉSOUDRE UN DISQUE (resoudreDisque de la conception) : pousse p = { x, z } (rayon `rayon`) hors des obstacles qui
  // concernent `agent`, et retire de `vitesse` (si donnée) la composante qui rentre dedans : on GLISSE le long d'un
  // tronc ou d'une grille au lieu de s'y coller. Un obstacle plus bas que la marche de l'agent (`monter`) ne l'arrête
  // pas : on enjambe une bordure. Rend vrai si le disque a bougé.
  resoudre(p, rayon, agent, monter, vitesse = null) {
    if (!this.obs.length) return false;
    const liste = this.pres(p.x, p.z, rayon, this._liste);
    let px = p.x, pz = p.z, bouge = false;
    for (const idx of liste) {
      const o = this.obs[idx];
      // (la balle, elle, compare sa propre hauteur à celle de l'obstacle : voir balle())
      if (o.ouvert || !concerne(o, agent)) continue;
      if (agent !== 'balle' && ((o.h !== undefined && o.h <= monter) || o.bas > BAS_TETE)) continue;
      let nx, nz, pen;
      if (o.t === 'c') {
        const dx = px - o.x, dz = pz - o.z, d = Math.hypot(dx, dz), R = o.r + rayon;
        if (!(d < R)) continue;
        if (d > 1e-6) { nx = dx / d; nz = dz / d; } else { nx = 1; nz = 0; }
        pen = R - d;
      } else if (o.t === 's') {
        // point le plus proche sur le segment [(x0, z0), (x1, z1)], épaisseur e
        const ux = o.x1 - o.x0, uz = o.z1 - o.z0, L2 = ux * ux + uz * uz;
        const t = L2 > 0 ? Math.max(0, Math.min(1, ((px - o.x0) * ux + (pz - o.z0) * uz) / L2)) : 0;
        const cx = o.x0 + ux * t, cz = o.z0 + uz * t, dx = px - cx, dz = pz - cz, d = Math.hypot(dx, dz);
        const R = (o.e || 0) / 2 + rayon;
        if (!(d < R)) continue;
        if (d > 1e-6) { nx = dx / d; nz = dz / d; } else { const l = Math.sqrt(L2) || 1; nx = -uz / l; nz = ux / l; }
        pen = R - d;
      } else if (o.t === 'b') {
        // dans le repère de la boîte : axe local x (demi-taille hx) = (cos a, sin a), axe local z (hz) = (-sin a, cos a)
        const dx = px - o.x, dz = pz - o.z;
        const lx = dx * o._c + dz * o._s, lz = -dx * o._s + dz * o._c;
        const qx = Math.max(-o.hx, Math.min(o.hx, lx)), qz = Math.max(-o.hz, Math.min(o.hz, lz));
        let mx, mz;
        if (qx !== lx || qz !== lz) {
          const ex = lx - qx, ez = lz - qz, d = Math.hypot(ex, ez);
          if (!(d < rayon)) continue;
          mx = ex / d; mz = ez / d; pen = rayon - d;
        } else {
          // centre DANS la boîte : on sort par la face la plus proche (jamais Math.sign, qui vaut 0 sur l'axe)
          const px2 = o.hx - Math.abs(lx), pz2 = o.hz - Math.abs(lz);
          if (px2 < pz2) { mx = lx < 0 ? -1 : 1; mz = 0; pen = px2 + rayon; } else { mx = 0; mz = lz < 0 ? -1 : 1; pen = pz2 + rayon; }
        }
        nx = mx * o._c - mz * o._s; nz = mx * o._s + mz * o._c;      // retour au repère du monde
      } else continue;
      px += nx * pen; pz += nz * pen; bouge = true;
      if (vitesse) {
        const vn = vitesse.x * nx + vitesse.z * nz;
        if (vn < 0) { vitesse.x -= vn * nx; vitesse.z -= vn * nz; }
      }
    }
    if (bouge) { p.x = px; p.z = pz; }
    return bouge;
  }

  // Le disque (x, z, r) touche-t-il l'obstacle o (vue de dessus) ?
  dedans(o, x, z, r) {
    if (o.t === 'c') return Math.hypot(x - o.x, z - o.z) < o.r + r;
    if (o.t === 's') {
      const ux = o.x1 - o.x0, uz = o.z1 - o.z0, L2 = ux * ux + uz * uz;
      const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - o.x0) * ux + (z - o.z0) * uz) / L2)) : 0;
      return Math.hypot(x - o.x0 - ux * t, z - o.z0 - uz * t) < (o.e || 0) / 2 + r;
    }
    if (o.t === 'b') {
      const dx = x - o.x, dz = z - o.z, lx = dx * o._c + dz * o._s, lz = -dx * o._s + dz * o._c;
      const ex = Math.max(0, Math.abs(lx) - o.hx), ez = Math.max(0, Math.abs(lz) - o.hz);
      return Math.hypot(ex, ez) < r;
    }
    return false;
  }

  // =====================================================================
  //  LA BALLE CONTRE LES OBSTACLES POSÉS
  // =====================================================================
  // `p`, `v` : position et vitesse de la balle (monde AFFICHÉ, comme Ball.pos et Ball.vel) ; (x0, z0) : d'où part le
  // sous-pas ; `R` : son rayon ; `M` : le monde (js/monde.js : sol et décalage dx). Pour chaque obstacle qui concerne
  // la balle et qu'elle touche À SA HAUTEUR — entre le bas de l'obstacle et son sommet, comptés depuis le sol à son
  // pied —, on la ressort du côté d'où elle vient et on renvoie la composante normale de sa vitesse (REBOND). Les
  // obstacles minces (grilles, filets, balustrades) sont testés en TRAVERSÉE (traverseeSegment) : même lancée à 25 m/s,
  // la balle ne passe pas au travers d'un treillis de 6 cm entre deux sous-pas. Rend la vitesse d'impact la plus forte
  // (m/s, 0 sans contact) ; `this.dernier` garde l'obstacle touché (son type : un grillage sonne autrement qu'un mur).
  balle(M, p, v, x0, z0, R) {
    this.dernier = null;
    if (!this.obs.length) return 0;
    const dx = M.dx, qx = x0 - dx, qz = z0;
    let px = p.x - dx, pz = p.z, choc = 0;
    // (le sous-pas fait au plus quelques centimètres : on cherche autour de la position d'arrivée, rayon + marge)
    const liste = this.pres(px, pz, R + 0.6, this._liste);
    const q = this._q;
    for (const idx of liste) {
      const o = this.obs[idx];
      if (o.ouvert || !concerne(o, 'balle')) continue;
      let nx, nz, pied;
      if (o.t === 's') {
        if (!this.traverseeSegment(o, qx, qz, px, pz, R)) continue;
        nx = q.nx; nz = q.nz;
        // un obstacle mince posé sur un bord (balustrade du belvédère, grillage sur le chaperon d'un mur) est porté par
        // le sol le plus HAUT de ses deux côtés. (c : le point de l'obstacle en face de la balle — une fois poussée de
        // `pen`, elle en est à e/2 + R le long de la normale)
        const k = q.pen - R - (o.e || 0) / 2, cx = px + nx * k, cz = pz + nz * k;
        pied = Math.max(M.sol(cx + nx * COTE + dx, cz + nz * COTE), M.sol(cx - nx * COTE + dx, cz - nz * COTE));
      } else {
        if (!this._recouvre(o, px, pz, R)) continue;
        nx = q.nx; nz = q.nz; pied = o._pied;
      }
      // à sa hauteur ? (au-dessus du sommet, elle passe ; sous le bas d'un filet, elle passe dessous)
      const haut = pied + (o.h === undefined ? 2.6 : o.h), bas = pied + (o.bas || 0);
      if (p.y - R * 0.5 > haut || p.y + R * 0.5 < bas) continue;
      px += nx * q.pen; pz += nz * q.pen;
      const vn = v.x * nx + v.z * nz;
      if (vn < 0) {
        const [kn, kt] = rebondDe(o);
        const tx = v.x - vn * nx, tz = v.z - vn * nz;
        v.x = tx * kt - vn * kn * nx; v.z = tz * kt - vn * kn * nz;
        if (-vn > choc) { choc = -vn; this.dernier = o; }
      }
    }
    p.x = px + dx; p.z = pz;
    return choc;
  }

  // TRAVERSÉE D'UN SEGMENT ÉPAIS (traverseeSegment de la conception) par un disque de rayon r qui va de (qx, qz) à
  // (px, pz). Vrai s'il le touche à l'arrivée ou l'a franchi pendant le pas ; this._q reçoit alors la normale (nx, nz)
  // tournée vers le côté d'où il vient, et `pen`, de combien le pousser le long d'elle pour qu'il ne le touche plus.
  // (Sans le test de franchissement, une balle rapide qui passe d'un côté à l'autre entre deux sous-pas serait
  // repoussée du MAUVAIS côté : de l'autre côté de la grille.)
  traverseeSegment(o, qx, qz, px, pz, r) {
    const ux = o.x1 - o.x0, uz = o.z1 - o.z0, L2 = ux * ux + uz * uz;
    if (!(L2 > 1e-12)) return false;
    const L = Math.sqrt(L2), nlx = uz / L, nlz = -ux / L, E = (o.e || 0) / 2 + r, q = this._q;
    const sq = (qx - o.x0) * nlx + (qz - o.z0) * nlz, sp = (px - o.x0) * nlx + (pz - o.z0) * nlz;   // distances signées
    // 1. franchi : les deux bouts du pas de part et d'autre de la ligne, et le point de passage DANS le segment
    if ((sq > 0 && sp <= 0) || (sq < 0 && sp >= 0)) {
      const s = sq / (sq - sp), cx = qx + (px - qx) * s, cz = qz + (pz - qz) * s;
      const t = ((cx - o.x0) * ux + (cz - o.z0) * uz) / L2;
      if (t >= 0 && t <= 1) {
        const k = sq > 0 ? 1 : -1;
        q.nx = nlx * k; q.nz = nlz * k; q.pen = E - sp * k; q.t = t;
        return true;
      }
    }
    // 2. touché à l'arrivée (sans franchir) : par le point le plus proche
    const t = Math.max(0, Math.min(1, ((px - o.x0) * ux + (pz - o.z0) * uz) / L2));
    const cx = o.x0 + ux * t, cz = o.z0 + uz * t, dx = px - cx, dz = pz - cz, d = Math.hypot(dx, dz);
    if (!(d < E)) return false;
    if (t > 0 && t < 1) {
      // le long du segment : on garde le côté d'où l'on vient (sq), pas celui où l'on est arrivé
      const k = sq !== 0 ? (sq > 0 ? 1 : -1) : (sp >= 0 ? 1 : -1);
      q.nx = nlx * k; q.nz = nlz * k; q.pen = E - sp * k;
    } else if (d > 1e-6) { q.nx = dx / d; q.nz = dz / d; q.pen = E - d; }     // un bout : on en fait le tour
    else { q.nx = nlx; q.nz = nlz; q.pen = E; }
    q.t = t;
    return true;
  }

  // Un disque de rayon r en (x, z) recouvre-t-il le cercle ou la boîte o ? this._q : normale de sortie, profondeur.
  _recouvre(o, x, z, r) {
    const q = this._q;
    if (o.t === 'c') {
      const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), R = o.r + r;
      if (!(d < R)) return false;
      if (d > 1e-6) { q.nx = dx / d; q.nz = dz / d; } else { q.nx = 1; q.nz = 0; }
      q.pen = R - d; return true;
    }
    if (o.t === 'b') {
      const dx = x - o.x, dz = z - o.z, lx = dx * o._c + dz * o._s, lz = -dx * o._s + dz * o._c;
      const cx = Math.max(-o.hx, Math.min(o.hx, lx)), cz = Math.max(-o.hz, Math.min(o.hz, lz));
      let mx, mz;
      if (cx !== lx || cz !== lz) {
        const ex = lx - cx, ez = lz - cz, d = Math.hypot(ex, ez);
        if (!(d < r)) return false;
        mx = ex / d; mz = ez / d; q.pen = r - d;
      } else {
        const px2 = o.hx - Math.abs(lx), pz2 = o.hz - Math.abs(lz);
        if (px2 < pz2) { mx = lx < 0 ? -1 : 1; mz = 0; q.pen = px2 + r; } else { mx = 0; mz = lz < 0 ? -1 : 1; q.pen = pz2 + r; }
      }
      q.nx = mx * o._c - mz * o._s; q.nz = mx * o._s + mz * o._c;
      return true;
    }
    return false;
  }
}

// L'instance du monde : js/monde.js l'installe et la vide, js/ball.js y lit la balle.
export const COLLISIONS = new Collisions();

// =====================================================================
//  LA BALLE CONTRE UNE FACE DE NAPPE (mur de soutènement, bord de terrasse, contremarche)
// =====================================================================
// La balle de la nappe `nappe`, dont le bas est à `yBas`, arrive en (x1, z1) — monde AFFICHÉ — sur un sol PLUS HAUT
// qu'elle : c'est la face d'un mur. La normale HORIZONTALE de cette face, tournée vers la balle, comme Monde.franchir
// la calcule pour les pieds : les huit voisins du point (au pas de la grille) qui sont eux aussi « dans le mur » (une
// autre nappe, un sol au-dessus du bas de la balle) tirent la normale de leur côté, on prend l'opposé. Un mur en biais
// donne une normale en biais : la balle y ricoche au lieu de revenir sur ses pas. `out` reçoit { nx, nz }.
export function faceDeNappe(M, x0, z0, x1, z1, yBas, nappe, marche, out = { nx: 0, nz: 0 }) {
  const e = (M.repere && M.repere.pas) || 0.5;
  const mur = (x, z) => { const n = M.nappe(x, z); return n === 0 || (n !== nappe && M.solNappe(x, z, n) > yBas + marche); };
  let nx = 0, nz = 0;
  for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
    if (!ox && !oz) continue;
    if (mur(x1 + ox * e, z1 + oz * e)) { nx -= ox; nz -= oz; }
  }
  const mx = x0 - x1, mz = z0 - z1, lm = Math.hypot(mx, mz);
  let l = Math.hypot(nx, nz);
  // normale introuvable, ou tournée vers le mur : on repart d'où l'on vient
  if (l < 1e-6 || (lm > 1e-9 && nx * mx + nz * mz <= 1e-9 * l * lm)) { nx = mx; nz = mz; l = lm; }
  if (l < 1e-9) { nx = 1; nz = 0; l = 1; }
  out.nx = nx / l; out.nz = nz / l;
  return out;
}
