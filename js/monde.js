// =====================================================================
//  LE MONDE : hauteur du sol, passages, obstacles (parc de Bécon en entier)
// =====================================================================
// UN SEUL module répond aux questions que le relief pose au moteur : quelle est la hauteur du sol ici, peut-on
// passer d'ici à là, qu'y a-t-il près d'ici, que faut-il charger. Tout le reste du jeu (joueur, vélo, balle,
// caméra, réseau, pluie, ombres de contact) lui pose la question au lieu de supposer y = 0.
//
// PLAT PAR DÉFAUT. Sur La Cage, Levallois, Jemmapes — et sur le parc tant que le drapeau « parc entier » est
// baissé — le monde est plat : `sol()` rend 0, tout est marchable, `franchir()` ne bloque rien, et chaque
// endroit du moteur qui le consulte garde son code d'avant derrière `if (Monde.plat)`. C'est le lot A1 : le
// module est branché partout, et RIEN ne change à l'écran ni dans la simulation (même trajectoire de balle, à
// l'octet près). Le relief arrive avec `installer()` (lot A2), à partir des fichiers de assets/parc/monde/,
// produits hors du jeu par tools/parc/ : le jeu ne fait aucune géographie.
//
// LE REPÈRE est celui du TERRAIN 1 du parc (js/court_parc.js) : x+ vers le quai et la Seine, z+ vers le pin,
// y vers le haut, y = 0 au sol du plateau. Pour le terrain 2 (`parc2`), tout le décor glisse de `dx` = +16,1 m :
// les requêtes reçoivent des coordonnées du MONDE AFFICHÉ et retirent `dx` elles-mêmes (x - dx).
//
// L'INTERFACE CI-DESSOUS EST FIGÉE (conception, § 3.2) : les lots suivants la complètent, ils ne la changent pas.
//
//   Monde.plat, Monde.dx
//   Monde.installer(d, { dx })      d = données de js/monde_donnees.js (voir « Les données » plus bas)
//   Monde.remettreAPlat()           appelé par buildArena pour tout terrain, avant de le construire
//   Monde.sol(x, z)                 m ; 0 si plat ou sur le plateau
//   Monde.solNappe(x, z, nappe)     sans quitter la nappe (balle, pieds)
//   Monde.nappe(x, z), Monde.drapeaux(x, z), Monde.surface(x, z)
//   Monde.normale(x, z, out)        normale du sol (différences centrées dans la nappe)
//   Monde.pente(x, z, dirX, dirZ)   pente signée le long d'une direction (+ = ça monte)
//   Monde.franchir(x0, z0, y0, x1, z1, agent, saut)   null si le pas est libre, sinon { nx, nz, type }
//   Monde.obstaclesPres(x, z, r, out)                 indices des obstacles proches (grille de 4 m)
//   Monde.resoudre(pos, rayon, agent, vitesse)        pousse un disque hors des obstacles
//   Monde.rayonLibre(ax, ay, az, bx, by, bz, r)       fraction libre d'un segment (caméra)
//   Monde.lieux, Monde.velos, Monde.bancs
//   Monde.maj(dt, camera, joueur)   une fois par image (chargement, niveaux de détail, ombres)
//
// LES DONNÉES (`installer(d)`) : le contenu de assets/parc/monde/monde.json (format exact : tools/parc/LISEZMOI.md),
// auquel js/monde_donnees.js (lot A2) ajoute les grilles binaires lues à côté. Tout est dans le repère du terrain 1.
//   d.repere   = { x0, z0, pas, nx, nz, plateau: [x0, z0, x1, z1], ... }   nœud (i, k) en x = x0 + pas·i,
//                z = z0 + pas·k ; ligne par ligne (k puis i) : indice = k·nx + i
//   d.grilles  = { sol, nappes, drapeaux, surfaces }   une valeur par nœud (nx·nz), petit-boutiste :
//                sol       Int16Array, hauteur en CENTIMÈTRES (sol.bin)
//                nappes    Uint8Array, numéro de nappe, 1 = le plateau, 0 = hors du monde (nappes.bin)
//                drapeaux  Uint8Array, voir DRAPEAU (drapeaux.bin)
//                surfaces  Uint8Array, voir SURFACE (surfaces.bin)
//   d.obstacles = [ { t: 'c', x, z, r, h, qui },                 cercle (manège ; troncs et bornes : lot A3)
//                   { t: 's', x0, z0, x1, z1, e, h, qui, type }, segment épais (grille, haie, garde-corps,
//                                                                balustrade, parapet, portillon). Un portillon
//                                                                (`type: 'portillon'`) est ignoré tant que son
//                                                                champ `ouvert` est vrai. Facultatif, pour les
//                                                                zones : `trous` [[a, b], ...], parties OUVERTES
//                                                                en mètres le long du segment depuis (x0, z0)
//                   { t: 'b', x, z, hx, hz, a, h, qui } ]         boîte orientée (bâtiment) : centre, demi-tailles,
//                                                                `a` en RADIANS, de l'axe x+ vers l'axe z+ : coins =
//                                                                centre ± hx·(cos a, sin a) ± hz·(-sin a, cos a)
//                 `h` : hauteur au-dessus du sol au pied de l'obstacle ; `qui` : 'tous' (défaut), 'velo'
//                 (montures seulement) ou 'balle' (la balle seulement).
//
//                 Facultatifs (lot A3) : `bas` (un obstacle qui commence en hauteur, comme le filet tendu au-dessus du
//                 trou du grillage du pin : on passe dessous), `camera: false` (un grillage qu'on voit au travers : il
//                 ne retient pas la caméra, rayonLibre l'ignore)
//   d.lieux, d.velos, d.bancs : listes de monde.json, recopiées telles quelles ; d.hash : empreinte des données
//
// LES OBSTACLES POSÉS vivent dans js/monde_collisions.js (lot A3) : la grille de 4 m, la résolution d'un disque, la
// traversée d'un segment, la balle ; ce module-ci en garde l'instance (COLLISIONS), la remplit à installer() et la vide
// à remettreAPlat(). installer() reçoit donc TOUT : monde.json, plus ce que js/parc/index.js y ajoute (les obstacles
// des zones, les troncs de arbres.bin, le décor du plateau que buildParc déclare).
//
// COÛTS VISÉS (§ 3.2) : sol() en moins de 30 ns (4 Int16 lus), franchir() en moins de 2 µs quand le pas est
// libre, resoudre() en moins de 5 µs (1 à 4 cases de grille). Mesurés par tools/monde/test_monde.mjs.
import { COLLISIONS } from './monde_collisions.js';

// Les drapeaux d'un nœud (drapeaux.bin)
export const DRAPEAU = {
  MARCHABLE: 1, CYCLABLE: 2, ESCALIER: 4, EAU: 8, BALLE_PERDUE: 16, PLATEAU: 32, REBORD: 64, ALLEE: 128,
};
// Les surfaces (surfaces.bin) : le son des pas, le roulement du vélo et de la balle
export const SURFACE = {
  ENROBE: 0, ASPHALTE_ROUGE: 1, STABILISE: 2, TERRE_BATTUE: 3, GRAVIER: 4, DALLES: 5, HERBE: 6, SOUS_BOIS: 7,
  COPEAUX: 8, SABLE: 9, BETON_CLAIR: 10, MASSIF: 11, EAU: 12, CHAUSSEE: 13, TROTTOIR: 14,
};
// Le plateau de basket, dans le repère du terrain 1 : son sol vaut 0 EXACTEMENT, quoi que dise la grille (§ 0, D3).
// Bornes COMPRISES, comme la référence (sol_ref de tools/parc/construire_monde.py). monde.json les redonne
// (repere.plateau) : installer() prend les siennes.
export const PLATEAU = { xMin: -23.7, xMax: 6.3, zMin: -9.1, zMax: 9.1 };
// Seuil des frontières DOUCES entre nappes (monde.json > seuils.seuilDoux) : un coin d'une autre nappe plus proche
// que ça en hauteur reste interpolé (le sol est continu) ; au-delà, c'est un mur, une marche, un bord de bassin.
const SEUIL_DOUX = 0.35;

// Ce que chaque agent franchit (conception, § 2.5). `monter` / `descendre` : la plus haute marche prise sans
// s'arrêter ; au-delà c'est un mur. `drapeau` : le drapeau exigé sous les pieds (marchable, cyclable).
// `penteMax` : seulement pour ceux que le drapeau ne suffit pas à décrire (la trottinette refuse 10 %, le vélo
// en accepte 14 % sur les allées : c'est l'outil qui l'a déjà écrit dans le drapeau « cyclable »).
export const AGENTS = {
  pieton:      { monter: 0.35, descendre: 1.2,  escalier: true,  drapeau: DRAPEAU.MARCHABLE, penteMax: Infinity },
  velo:        { monter: 0.08, descendre: 0.15, escalier: false, drapeau: DRAPEAU.CYCLABLE,  penteMax: Infinity },
  trottinette: { monter: 0.03, descendre: 0.10, escalier: false, drapeau: DRAPEAU.CYCLABLE,  penteMax: 0.10 },
  skate:       { monter: 0.0,  descendre: 0.10, escalier: false, drapeau: DRAPEAU.CYCLABLE,  penteMax: 0.10 },
  balle:       { monter: Infinity, descendre: Infinity, escalier: true, drapeau: 0, penteMax: Infinity },
};

const PAS_RAYON = 0.25;         // pas de marche de rayonLibre (m)

export const Monde = {
  plat: true,
  dx: 0,
  lieux: [], velos: [], bancs: [],
  // Empreinte des données (monde.json > hash) : deux joueurs d'empreintes différentes n'ont pas le même sol.
  hash: null,
  repere: null,
  // Ce que Monde.maj fait tourner à chaque image hors du mode plat : les lots A5 (chargement par morceaux) et
  // A6 (ombres qui suivent) y ajoutent leur fonction (dt, camera, joueur). Vidé par remettreAPlat.
  taches: [],
  // Mesures publiées par l'ordonnanceur (lot A5) pour js/debug_monde.js (__perf) : { morceaux, msParImage, ... }
  stats: null,

  // État interne, déclaré ICI et pas ajouté en route : un objet dont la forme ne change jamais reste rapide à lire
  // pour le moteur JavaScript (sol() est appelé des centaines de fois par pas de simulation).
  _x0: 0, _z0: 0, _pas: 0.5, _nx: 0, _nz: 0,
  _px0: PLATEAU.xMin, _px1: PLATEAU.xMax, _pz0: PLATEAU.zMin, _pz1: PLATEAU.zMax, _doux: SEUIL_DOUX,
  _sol: null, _nap: null, _dra: null, _sur: null,
  // les obstacles posés (js/monde_collisions.js) ; `_p` : le disque de resoudre() dans le repère du terrain 1
  _col: COLLISIONS, _p: { x: 0, z: 0 }, _listeR: [],

  // ------------------------------------------------------------------ installation
  installer(d, { dx = 0 } = {}) {
    const R = d && d.repere, G = d && d.grilles;
    if (!R || !G) throw new Error('[monde] données incomplètes : il faut d.repere et d.grilles');
    const n = R.nx * R.nz;
    for (const cle of ['sol', 'nappes', 'drapeaux', 'surfaces']) {
      if (!G[cle] || G[cle].length !== n) throw new Error(`[monde] grille « ${cle} » : ${G[cle] ? G[cle].length : 0} valeurs au lieu de ${n} (${R.nx} x ${R.nz})`);
    }
    this.repere = R;
    this._x0 = R.x0; this._z0 = R.z0; this._pas = R.pas; this._nx = R.nx; this._nz = R.nz;
    const P = Array.isArray(R.plateau) && R.plateau.length === 4 ? R.plateau : [PLATEAU.xMin, PLATEAU.zMin, PLATEAU.xMax, PLATEAU.zMax];
    this._px0 = P[0]; this._pz0 = P[1]; this._px1 = P[2]; this._pz1 = P[3];
    this._doux = (d.seuils && d.seuils.seuilDoux) || SEUIL_DOUX;
    this._sol = G.sol; this._nap = G.nappes; this._dra = G.drapeaux; this._sur = G.surfaces;
    this.dx = dx;
    this.hash = d.hash || null;
    const recopier = (dst, src) => { dst.length = 0; if (Array.isArray(src)) for (const v of src) dst.push(v); };
    recopier(this.lieux, d.lieux); recopier(this.velos, d.velos); recopier(this.bancs, d.bancs);
    this.plat = false;              // AVANT les obstacles : leur pied se mesure sur la grille
    // TOUS les obstacles du monde, dès l'installation (§ 0, D10) : un joueur distant ne traverse jamais une grille que le
    // client local n'a pas encore chargée. (Appeler installer() une seconde fois avec une liste plus longue, c'est
    // ajouter des obstacles : js/parc/index.js le fait une fois le décor du plateau construit.)
    this._col.indexer(d.obstacles || [], (x, z) => this.sol(x + this.dx, z));
  },

  // Le terrain suivant est plat jusqu'à preuve du contraire : appelé au début de buildArena, quel que soit le terrain.
  remettreAPlat() {
    this.plat = true; this.dx = 0; this.hash = null; this.repere = null; this.stats = null;
    this._px0 = PLATEAU.xMin; this._px1 = PLATEAU.xMax; this._pz0 = PLATEAU.zMin; this._pz1 = PLATEAU.zMax; this._doux = SEUIL_DOUX;
    this._sol = this._nap = this._dra = this._sur = null;
    this._col.vider();
    this.lieux.length = 0; this.velos.length = 0; this.bancs.length = 0; this.taches.length = 0;
  },

  // ------------------------------------------------------------------ le sol
  // Hauteur du sol (m) en (x, z) du monde affiché. C'est, à l'opération près, la RÉFÉRENCE de l'outil de données
  // (sol_ref dans tools/parc/construire_monde.py, tools/parc/LISEZMOI.md § 5) : les contrôles de l'outil (la
  // grille 156 à +12,2, la promenade à -0,8, le quai à -3,0…) valent donc aussi dans le jeu.
  sol(x, z) {
    if (this.plat) return 0;
    x -= this.dx;
    if (x >= this._px0 && x <= this._px1 && z >= this._pz0 && z <= this._pz1) return 0;   // 1. le plateau, raccourci
    return this._hauteur(x, z, -1);
  },

  // Même chose, mais sans quitter la nappe `nappe` : au pied d'un mur, la balle et les pieds lisent le sol de LEUR
  // côté, pas une moyenne entre le haut et le bas. Sans nappe connue (0, undefined), c'est sol().
  solNappe(x, z, nappe) {
    if (this.plat) return 0;
    x -= this.dx;
    if (x >= this._px0 && x <= this._px1 && z >= this._pz0 && z <= this._pz1) return 0;
    return this._hauteur(x, z, nappe > 0 ? nappe : -1);
  },

  nappe(x, z) {
    if (this.plat) return 1;
    const i = this._noeud(x - this.dx, z);
    return i < 0 ? 0 : this._nap[i];
  },
  drapeaux(x, z) {
    if (this.plat) return DRAPEAU.MARCHABLE | DRAPEAU.CYCLABLE;
    const i = this._noeud(x - this.dx, z);
    return i < 0 ? 0 : this._dra[i];
  },
  surface(x, z) {
    if (this.plat) return SURFACE.ENROBE;
    const i = this._noeud(x - this.dx, z);
    return i < 0 ? SURFACE.ENROBE : this._sur[i];
  },

  // Normale du sol (vecteur unitaire, y vers le haut), par différences centrées DANS la nappe du point : au pied
  // d'un mur on n'obtient pas une paroi à 80°, mais la pente du sol de ce côté-ci.
  normale(x, z, out = { x: 0, y: 1, z: 0 }) {
    if (this.plat) { out.x = 0; out.y = 1; out.z = 0; return out; }
    const n = this.nappe(x, z), e = this._pas;
    const gx = (this.solNappe(x + e, z, n) - this.solNappe(x - e, z, n)) / (2 * e);
    const gz = (this.solNappe(x, z + e, n) - this.solNappe(x, z - e, n)) / (2 * e);
    const l = Math.hypot(gx, 1, gz);
    out.x = -gx / l; out.y = 1 / l; out.z = -gz / l;
    return out;
  },

  // Pente le long de (dirX, dirZ) : dénivelé par mètre parcouru, positif en montée (0,1 = 10 %).
  pente(x, z, dirX, dirZ) {
    if (this.plat) return 0;
    const l = Math.hypot(dirX, dirZ);
    if (l < 1e-9) return 0;
    const ux = dirX / l, uz = dirZ / l, e = this._pas, n = this.nappe(x, z);
    return (this.solNappe(x + ux * e, z + uz * e, n) - this.solNappe(x - ux * e, z - uz * e, n)) / (2 * e);
  },

  // ------------------------------------------------------------------ passer ou pas
  // Le pas de (x0, z0) à (x1, z1) d'un agent dont les pieds sont à y0 (le sol de départ) ; `saut` = hauteur des
  // pieds au-dessus de ce sol (jumpY) : en l'air, on monte sur un muret de 60 cm. Renvoie null si le pas est libre,
  // sinon { nx, nz, type } : la normale HORIZONTALE de ce qui arrête (tournée vers l'agent, pour glisser le long) et
  // la nature du blocage : 'mur' (marche trop haute ou chute trop grande), 'pente' (drapeau refusé : massif, talus,
  // herbe trop raide pour le vélo), 'escalier' (monture), 'eau', 'obstacle' (hors du monde).
  // On n'est jamais PRISONNIER d'un endroit interdit : un agent qui s'y trouve déjà (téléporté dans un massif, vélo
  // posé sur une marche) n'est pas arrêté par ce qui l'y retient, il peut en sortir ; il ne pourra plus y rentrer.
  // Les obstacles posés (troncs, grilles, bancs) ne sont PAS testés ici : c'est resoudre().
  franchir(x0, z0, y0, x1, z1, agent = 'pieton', saut = 0) {
    if (this.plat) return null;
    const A = AGENTS[agent] || AGENTS.pieton;
    const ax = x1 - this.dx;
    const type = this._bloque(ax, z1, y0, A, saut, x0 - this.dx, z0);
    if (!type) return null;
    // La normale : les huit voisins du point visé (au pas de la grille) qui bloquent aussi « tirent » la normale de
    // leur côté ; on prend l'opposé. Un mur en biais donne une normale en biais, le joueur glisse le long.
    const e = this._pas;
    let nx = 0, nz = 0;
    for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oz) continue;
      if (this._bloque(ax + ox * e, z1 + oz * e, y0, A, saut, x0 - this.dx, z0)) { nx -= ox; nz -= oz; }
    }
    const mx = x0 - x1, mz = z0 - z1, lm = Math.hypot(mx, mz);
    let l = Math.hypot(nx, nz);
    // normale introuvable (point isolé), tournée vers l'obstacle ou perpendiculaire au pas (elle ne dit alors rien de
    // ce qui arrête : l'agent courrait sur place en « glissant » dans le vide) : on repart d'où l'on vient
    if (l < 1e-6 || (lm > 1e-9 && nx * mx + nz * mz <= 1e-9 * l * lm)) { nx = mx; nz = mz; l = lm; }
    if (l < 1e-9) { nx = 1; nz = 0; l = 1; }
    return { nx: nx / l, nz: nz / l, type };
  },

  // ------------------------------------------------------------------ les obstacles
  // Indices (dans la liste des obstacles installés) de ceux dont l'emprise touche le disque (x, z, r). `out` est
  // vidé puis rempli ; la même liste est rendue.
  obstaclesPres(x, z, r, out = []) {
    if (this.plat) { out.length = 0; return out; }
    return this._col.pres(x - this.dx, z, r, out);
  },

  // Pousse le disque (pos.x, pos.z, rayon) hors des obstacles qui concernent `agent`, et retire de `vitesse` (si
  // donnée) la composante qui rentre dedans : on GLISSE le long d'un tronc ou d'une grille au lieu de s'y coller.
  // Un obstacle plus bas que la marche de l'agent ne l'arrête pas (on enjambe une bordure). Renvoie vrai si le
  // disque a été déplacé.
  resoudre(pos, rayon, agent = 'pieton', vitesse = null) {
    if (this.plat || !this._col.obs.length) return false;
    const A = AGENTS[agent] || AGENTS.pieton, p = this._p;
    p.x = pos.x - this.dx; p.z = pos.z;
    if (!this._col.resoudre(p, rayon, agent, A.monter, vitesse)) return false;
    pos.x = p.x + this.dx; pos.z = p.z;
    return true;
  },

  // Fraction LIBRE du segment A -> B (0 = bouché tout de suite, 1 = libre jusqu'au bout) pour un rayon r : la
  // caméra de balade se rapproche d'autant. Ce qui bouche : le sol (on garde au moins max(r, 0,25) m au-dessus) et
  // les obstacles plus hauts que le rayon à cet endroit (murs, troncs, kiosque) — pas ceux qu'on voit au travers
  // (`camera: false` : les grillages du plateau, dont borneCam tient déjà la caméra) ni ceux qu'on survole ou sous
  // lesquels on passe (au-dessus du sommet, sous le bas). On avance par pas de 0,25 m.
  rayonLibre(ax, ay, az, bx, by, bz, r = 0.2) {
    if (this.plat) return 1;
    const L = Math.hypot(bx - ax, by - ay, bz - az);
    if (L < 1e-6) return 1;
    const n = Math.ceil(L / PAS_RAYON), marge = Math.max(r, 0.25);
    const liste = this._listeR, C = this._col;
    for (let s = 1; s <= n; s++) {
      const t = s / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
      if (y < this.sol(x, z) + marge) return (s - 1) / n;
      if (!C.obs.length) continue;
      C.pres(x - this.dx, z, r, liste);
      for (const idx of liste) {
        const o = C.obs[idx];
        if (o.ouvert || o.qui === 'balle' || o.camera === false || y > o._pied + (o.h === undefined ? 2.6 : o.h)
          || y < o._pied + (o.bas || 0)) continue;
        if (C.dedans(o, x - this.dx, z, r)) return (s - 1) / n;
      }
    }
    return 1;
  },

  // ------------------------------------------------------------------ chaque image
  maj(dt, camera, joueur) {
    if (this.plat) return;
    for (const f of this.taches) f(dt, camera, joueur);
  },

  // ================================================================== interne
  // Indice du nœud le plus proche de (x, z) — repère du terrain 1 — ou -1 hors de la grille. (Même division et
  // même règle que la référence : à mi-chemin, c'est le nœud du côté +, Math.round arrondissant 0,5 vers le haut.)
  _noeud(x, z) {
    if (!this._sol) return -1;
    const i = Math.round((x - this._x0) / this._pas), k = Math.round((z - this._z0) / this._pas);
    if (i < 0 || k < 0 || i >= this._nx || k >= this._nz) return -1;
    return k * this._nx + i;
  },

  // Hauteur en (x, z) — repère du terrain 1, hors du plateau — dans la nappe `nappe` (-1 : celle du coin le plus
  // proche). Transcription EXACTE de sol_ref (tools/parc/construire_monde.py), dans le même ordre d'opérations,
  // pour que le jeu et les contrôles de l'outil lisent le même nombre :
  //   2. la cellule (i, k) et les poids (u, v), bornés à la grille (hors de la grille : le bord le plus proche) ;
  //   3. la nappe : celle demandée, sinon celle du coin le plus proche ;
  //   4. ref = moyenne des coins de cette nappe ; un coin d'une AUTRE nappe garde sa hauteur s'il est à moins de
  //      0,35 m de ref (frontière douce : le sol est continu), sinon il prend ref (frontière dure : au pied d'un mur
  //      de 4 m, on lit le sol de son côté au lieu d'une rampe de 50 cm) ; aucun coin dans la nappe demandée (la
  //      balle a franchi un mur) : on recommence avec la nappe du coin le plus proche ;
  //   5. l'interpolation bilinéaire des quatre hauteurs ainsi corrigées.
  _hauteur(x, z, nappe) {
    const pas = this._pas, nx = this._nx, nz = this._nz;
    let fi = (x - this._x0) / pas, fk = (z - this._z0) / pas;
    fi = fi < 0 ? 0 : fi > nx - 1 ? nx - 1 : fi;
    fk = fk < 0 ? 0 : fk > nz - 1 ? nz - 1 : fk;
    let i = Math.floor(fi), k = Math.floor(fk);
    if (i > nx - 2) i = nx - 2;
    if (k > nz - 2) k = nz - 2;
    const u = fi - i, v = fk - k, a = k * nx + i, c = a + nx, S = this._sol, N = this._nap;
    const n = nappe >= 0 ? nappe : N[(v >= 0.5 ? c : a) + (u >= 0.5 ? 1 : 0)];
    let h0 = S[a] / 100, h1 = S[a + 1] / 100, h2 = S[c] / 100, h3 = S[c + 1] / 100;
    const d0 = N[a] === n, d1 = N[a + 1] === n, d2 = N[c] === n, d3 = N[c + 1] === n;
    // (cas courant : les quatre coins dans la même nappe, rien à corriger)
    if (!(d0 && d1 && d2 && d3)) {
      let s = 0, m = 0;
      if (d0) { s += h0; m++; }
      if (d1) { s += h1; m++; }
      if (d2) { s += h2; m++; }
      if (d3) { s += h3; m++; }
      if (m === 0) return this._hauteur(x, z, -1);
      const ref = s / m, doux = this._doux;
      if (!d0 && !(Math.abs(h0 - ref) < doux)) h0 = ref;
      if (!d1 && !(Math.abs(h1 - ref) < doux)) h1 = ref;
      if (!d2 && !(Math.abs(h2 - ref) < doux)) h2 = ref;
      if (!d3 && !(Math.abs(h3 - ref) < doux)) h3 = ref;
    }
    return (h0 * (1 - u) + h1 * u) * (1 - v) + (h2 * (1 - u) + h3 * u) * v;
  },

  // Le point (x, z) — repère du terrain 1 — est-il refusé à l'agent A qui part de (xa, za) avec les pieds à y0 ?
  // Renvoie le type de blocage ou null.
  _bloque(x, z, y0, A, saut, xa, za) {
    const i = this._noeud(x, z);
    if (i < 0) return 'obstacle';
    const n = this._nap[i];
    if (n === 0) return 'obstacle';
    const f = this._dra[i];
    if (A.drapeau) {
      const refus = (f & DRAPEAU.EAU) ? 'eau' : (!A.escalier && (f & DRAPEAU.ESCALIER)) ? 'escalier' : !(f & A.drapeau) ? 'pente' : null;
      if (refus) {
        // le point de départ est-il déjà refusé pour la même raison ? alors on laisse sortir (voir franchir)
        const ia = this._noeud(xa, za), fa = ia < 0 ? 0 : this._dra[ia];
        const dejaDedans = refus === 'eau' ? (fa & DRAPEAU.EAU) : refus === 'escalier' ? (fa & DRAPEAU.ESCALIER) : !(fa & A.drapeau);
        if (!dejaDedans) return refus;
      }
    }
    // la hauteur d'arrivée, lue comme sol() la lit : 0 sur tout le rectangle du plateau. (Entre le dernier nœud du
    // plateau et le bord du rectangle, la grille interpole vers le nœud du dehors, jusqu'à -7 cm avec les données
    // d'A0 : franchir() comparait donc une hauteur où l'agent ne se pose jamais, puisque sol() y rend 0.)
    const plateau = x >= this._px0 && x <= this._px1 && z >= this._pz0 && z <= this._pz1;
    const dy = (plateau ? 0 : this._hauteur(x, z, n)) - y0;
    if (dy > A.monter + saut || -dy > A.descendre) return 'mur';
    if (A.penteMax < Infinity) {
      const d = Math.hypot(x - xa, z - za);
      if (d > 1e-3 && Math.abs(dy) / d > A.penteMax && this._nap[this._noeud(xa, za)] === n) return 'pente';
    }
    return null;
  },
};
