// =====================================================================
//  LE CHARGEMENT DU PARC ENTIER : morceaux, cellules, niveaux de détail (lot A5 du chantier « parc complet »)
// =====================================================================
// Construit d'un bloc, le parc de Bécon entier demanderait près d'une minute de gel et quatre mille maillages
// (conception, § 3.5 et moteur.md § 4.9). Ce module le construit EN JOUANT, autour du joueur, et le défait derrière lui.
//
// LES MORCEAUX. Chaque zone (js/parc/zones/zNN_*.js, contrat du § 3.3) découpe son décor en morceaux de 48 m au plus,
// chacun avec sa boîte (repère du terrain 1) et deux générateurs : `construire(ctx)`, le décor complet, et, s'il y en a
// une, `silhouette(ctx)`, sa version lointaine (au plus 2 000 triangles). Un morceau passe par quatre états, selon la
// distance de l'observateur (la caméra) au bord de sa boîte :
//   absent      rien n'est construit (ou seulement sa silhouette, si la zone en a une : elle est faite au démarrage) ;
//   detail      son décor complet est construit, fondu et affiché ; la silhouette est cachée ;
//   libere      il était construit, l'observateur est parti au-delà de la distance de libération : ses géométries sont
//               rendues à la carte graphique (dispose), la silhouette revient. Les matériaux et les textures restent
//               (ceux du kit sont partagés par tout le parc, ceux d'une zone aussi : règle 3 du contrat).
// Entre les deux distances (détail et libération, § 3.6 : 70 et 110 m en « haute » sur PC), rien ne bouge : c'est
// l'hystérésis, qui empêche un morceau au bord de clignoter. Un chantier en cours obéit à la même règle : au-delà de
// la distance de détail, il est mis en PAUSE (son générateur attend) ; il n'est abandonné, son travail jeté, qu'au-delà
// de la distance de libération, là où un morceau fini serait libéré. (Relecture du lot : abandonné 10 m après la
// distance de détail, un chantier lancé grâce à l'avance était jeté au premier virage — l'avance pivote avec le cap —
// puis refait de zéro quelques secondes plus tard : trois abandons et autant d'à-coups de trop sur un tour à vélo.)
// (Lot C6 : un chantier en pause est FINI avec le temps qui reste quand rien n'attend à portée de détail : il ne reste
// plus « en construction » indéfiniment.)
//
// EN TRANCHES. Un morceau se construit par tranches : l'ordonnanceur fait avancer son générateur (chaque `yield` de la
// zone rend la main) tant qu'il reste du temps dans le budget de l'image — 4 ms sur PC, 2 ms sur téléphone (§ 3.6),
// DONT le temps que le sol (js/monde_sol.js) vient de prendre pour ses propres changements de niveau. `ctx.budget()` dit
// à la zone qu'il faut rendre la main. Le morceau n'est ajouté à la scène qu'une fois construit ET fondu (sa fusion se
// fait aussi en tranches, objet par objet) : on ne voit jamais un décor à moitié posé.
//
// L'ORDRE. D'abord le plus proche, avec une AVANCE DANS LE SENS DU DÉPLACEMENT : on mesure aussi la distance au point où
// l'observateur sera dans trois secondes (sa vitesse, lissée ; 40 m au plus), et on garde la plus petite des deux. À vélo
// lancé (8 m/s), ce qui est devant est donc commandé 24 m plus tôt que ce qui est derrière.
//
// AU DÉMARRAGE (demarrer, appelé par js/parc/index.js une fois le décor du plateau posé, pendant l'écran de chargement) :
// toutes les silhouettes, puis, construits d'un coup, les morceaux qui touchent la cellule du plateau et ses huit
// voisines (x -56,7 à 39,3, z -48 à 48 : Z02, le nord de Z03, Z04, Z05 et le bas de Z10, § 3.5), les plus proches
// d'abord et 350 ms au plus — borne tenue AU MILIEU d'un morceau aussi : passé le délai, `budget()` devient vrai, la
// zone rend la main à sa prochaine pièce et le morceau s'achève en tranches dans les premières images. Le reste vient
// en jouant.
//
// CE QUE REÇOIT UNE ZONE (ctx, contrat du § 3.3) : scene, K (le kit de js/court.js), kit (js/parc/kit.js), Monde, groupe
// (le Group du morceau : tout ce que la zone construit y va, et seulement là), lod (le préréglage graphique : 'low' à
// 'extreme'), mobile, alea (le hasard déterministe du parc), budget() (vrai quand il faut rendre la main) et etat
// ('detail' ou 'silhouette'). En plus : `animer(f)`, pour un objet animé (manège, eau, drapeau) : f(dt, t) est appelée à
// chaque image tant que le morceau est construit, et oubliée quand il est libéré.
//
// LA FUSION, PAR MORCEAU ET PAR CELLULE (§ 3.5) : les maillages d'un morceau qui partagent un matériau sont fondus en un
// seul, comme le fait js/court.js pour le décor du plateau. Mais un bloc fondu dont la sphère englobante dépasse 35 m
// n'est plus écarté du cadre par three (ni de l'image, ni de la passe d'ombre) : une famille trop étendue est donc fondue
// cellule de 32 m par cellule. Ne sont jamais fondus : ce qui porte `nofuse` ou `dynamique` (règle 5), les instances, les
// matériaux transparents et les shaders maison (vent, eau : ils lisent la position dans le repère de l'objet).
//
// LES CELLULES (monde.json > cellules : 32 m, origine x -24,7, z -16, le plateau dans une seule) : leur distance à
// l'observateur dit ce qui porte ombre. Les lots d'arbres du décor du plateau (js/court_parc.js, poserLot) portent leur
// ombre selon la distance du joueur, plus selon celle de l'origine ; les morceaux construits aussi (§ 3.6, porteurs
// d'ombre : 50 m en « haute »).
//
// LE LOINTAIN. En balade au parc entier : le brouillard suit la colonne du préréglage (§ 3.6 : 60-260 m en « haute »),
// la caméra ne dessine rien au-delà de sa fin plus 20 m (camera.far), et le ciel (dôme, brume d'horizon, auréole et
// disque du soleil, à 420-505 m de l'origine) SUIT la caméra, ramené à l'échelle sous ce nouveau plafond : il reste à
// l'infini pour l'œil, à la même place sur le ciel. En match, au menu, et sur tous les autres terrains : rien ne change.
//
// Mesures : Monde.stats.morceaux et Monde.stats.charge (js/debug_monde.js, __perf) ; window.__ordonnanceur.
import * as THREE from 'three';
import { Monde } from './monde.js';
import { Player } from './player.js';
import { TELEPHONE } from './appareil.js';

export const MOBILE = TELEPHONE;   // js/appareil.js : la même détection pour tout le jeu (et `?tel=1`)

// =====================================================================
//  LES RÉGLAGES PAR PRÉRÉGLAGE (conception, § 3.6)
// =====================================================================
// detail / libere : distances d'un morceau (m) ; brume : début et fin du brouillard (m) ; lod : fin des arbres complets
// (LOD0) et des arbres légers (LOD1), au-delà les imposteurs ; ombre : rayon des porteurs d'ombre autour du joueur ;
// triVeg : triangles de végétation dans l'image ; tri : triangles de TOUTE la passe principale (le plafond de végétation
// cède ce que le reste du cadre prend déjà, js/monde_vegetation.js) ; budget : ms de construction par image.
// (lot C6) fin : distance au-delà de laquelle la ferronnerie perd son détail fin (volutes, pointes de lance, anneaux,
// pommeaux : là où cinq centimètres font moins d'un pixel, 1,2 mrad en extrême, 1,5 en haute — js/parc/kit.js,
// Lot.maillages ; js/monde_vue.js, 7)
const PC_HAUT = { detail: 90, libere: 130, brume: [60, 300], lod: [30, 70], ombre: 60, triVeg: 0.7e6, tri: 1.3e6, budget: 4, fin: 40 };
const PC_MOYEN = { detail: 55, libere: 85, brume: [50, 200], lod: [15, 45], ombre: 35, triVeg: 0.3e6, tri: 0.6e6, budget: 3, fin: 28 };
const TEL_MOYEN = { detail: 35, libere: 55, brume: [35, 130], lod: [0, 20], ombre: 20, triVeg: 0.12e6, tri: 0.3e6, budget: 2, fin: 22 };
export const PRESETS = {
  pc: {
    extreme: PC_HAUT, ultra: PC_HAUT,
    high: { detail: 70, libere: 110, brume: [60, 260], lod: [25, 60], ombre: 50, triVeg: 0.5e6, tri: 0.9e6, budget: 4, fin: 34 },
    medium: PC_MOYEN, low: PC_MOYEN,
  },
  // (sur téléphone, le plafond est « haute » : ultra et extrême n'y existent pas, on les lit comme « haute »)
  tel: {
    // (lot C6 : les imposteurs à 20 m sur téléphone, comme en « moyenne » — conception, § 4, lot C6 ; 30 m avant)
    high: { detail: 45, libere: 70, brume: [40, 160], lod: [0, 20], ombre: 25, triVeg: 0.18e6, tri: 0.4e6, budget: 2, fin: 26 },
    medium: TEL_MOYEN, low: TEL_MOYEN,
  },
};
// Le préréglage en service : celui que js/fx.js vient d'appliquer (scene.userData.qualite), « haute » avant le premier.
export function reglages(scene, mobile = MOBILE) {
  const q = (scene && scene.userData.qualite) || 'high';
  const T = mobile ? PRESETS.tel : PRESETS.pc;
  return T[q] || T.high;
}

const CHANTIERS = 3;             // chantiers ACTIFS (à portée de détail) en même temps, au plus ; ceux en pause ne comptent pas
// L'AFFICHAGE (lot R1). Un morceau construit reste construit jusqu'à la distance de libération (130 m en extrême) : c'est
// l'hystérésis de la construction, qui évite de le refaire au moindre demi-tour. Mais il n'est AFFICHÉ que jusqu'à la
// distance de détail plus VUE_HYST (10 m d'hystérésis, celle du § 3.5 de la conception) ; au-delà, sa silhouette revient
// s'il en a une. (Avant, tout ce qui était construit était dessiné : en PV18, les morceaux de l'axe du château, de la
// terrasse et du coteau nord, de 92 à 130 m, coûtaient 76 appels et 340 000 triangles, selon le chemin parcouru avant.)
const VUE_HYST = 10;
const AVANCE_S = 3, AVANCE_MAX = 40;   // l'avance dans le sens du déplacement (s, m)
const RAYON_BLOC = 35;           // aucun bloc fondu de plus de 35 m de rayon (§ 3.5)
const CELLULE = { x0: -24.7, z0: -16, taille: 32 };   // la grille de monde.json (repère du terrain 1)
// Au démarrage, la cellule du plateau et ses huit voisines (repère du terrain 1)
const DEMARRAGE = [CELLULE.x0 - CELLULE.taille, CELLULE.z0 - CELLULE.taille, CELLULE.x0 + 2 * CELLULE.taille, CELLULE.z0 + 2 * CELLULE.taille];
const DEMARRAGE_MS = 350;        // au plus, pour les morceaux construits d'un coup au démarrage (le double sur téléphone)
const FAR_BASE = 700;            // camera.far de js/game.js (tout le reste du jeu)

// Distance horizontale de (x, z) au bord d'une boîte [x0, z0, x1, z1] (0 dedans).
function distBoite(b, x, z) {
  const ex = x < b[0] ? b[0] - x : x > b[2] ? x - b[2] : 0, ez = z < b[1] ? b[1] - z : z > b[3] ? z - b[3] : 0;
  return Math.hypot(ex, ez);
}
const croise = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

// =====================================================================
//  L'ORDONNANCEUR
// =====================================================================
export class Ordonnanceur {
  // `zones` : la liste ZONES de js/parc/index.js ; `donnees` : ce que rend chargerMonde (cellules) ; `dx` : décalage du
  // décor (parc2) ; `kit` : js/parc/kit.js ; `K` : le kit de js/court.js.
  constructor({ scene, K, kit, zones = [], donnees = {}, dx = 0, mobile = MOBILE, lod = 'auto' }) {
    this.scene = scene; this.K = K; this.kit = kit; this.dx = dx; this.mobile = mobile; this.lodReglage = lod;
    this.morceaux = [];
    // la vue du parc (lot R1, js/monde_vue.js : lots de dessin, occultation) ; posée par js/parc/index.js
    this.vue = null;
    // le registre des plans découpés (feuillages, grillages) que js/fx.js masque pendant la passe de normales de
    // l'occlusion ambiante : tenu ici au lieu d'un parcours de la scène toutes les deux secondes
    this.registre = scene.userData.registreDecoupes || (scene.userData.registreDecoupes = { set: new Set(), version: 0 });
    // les cellules de monde.json (repère du terrain 1)
    const C = donnees.cellules || { x0: CELLULE.x0, z0: CELLULE.z0, taille: CELLULE.taille, i: [-5, 2], k: [-4, 6] };
    this.cellules = [];
    for (let k = C.k[0]; k <= C.k[1]; k++) for (let i = C.i[0]; i <= C.i[1]; i++) {
      this.cellules.push({ i, k, boite: [C.x0 + C.taille * i, C.z0 + C.taille * k, C.x0 + C.taille * (i + 1), C.z0 + C.taille * (k + 1)], dist: 0, etat: 'loin' });
    }
    for (const z of zones) this.ajouterZone(z, false);
    // l'observateur (repère du terrain 1) et sa vitesse lissée
    this.obs = { x: -8.7, z: 0, vx: 0, vz: 0, pret: false };
    this._fin = 0; this._t0Image = 0; this._t = 0; this._sautees = 0;
    this._majLots = 0; this._ciel = null;
    this.stats = { msImage: 0, pic: 0, picFenetre: [], construits: 0, liberes: 0, abandons: 0, erreurs: 0, msDemarrage: 0 };
    // les deux fonctions branchées sur Monde.taches (js/parc/index.js) : le début de l'image (AVANT le sol), puis le reste
    this.debutImage = () => { this._t0Image = performance.now(); };
    this.maj = (dt, camera, joueur) => this._maj(dt, camera, joueur);
    if (typeof window !== 'undefined') window.__ordonnanceur = this;
  }

  // Une zone de plus (à l'installation ; ou en cours de partie, pour les essais : ses obstacles ne sont alors pas
  // dans le monde, et ses silhouettes sont faites tout de suite).
  ajouterZone(z, silhouettes = true) {
    for (const def of z.morceaux || []) {
      if (!def || !Array.isArray(def.boite)) { console.warn(`[parc] morceau sans boîte dans la zone ${z.id} : ignoré`); continue; }
      const m = { id: def.id, zone: z, def, boite: def.boite, etat: 'absent', groupe: null, sil: null, chantier: null,
        dist: 0, prio: Infinity, ms: 0, msAvant: 0, erreur: false, anim: [], ombre: true, tranches: 0 };
      this.morceaux.push(m);
      if (silhouettes) this._silhouette(m);
    }
  }

  // ------------------------------------------------------------------ le démarrage
  // (du plus proche du plateau au plus lointain, et pas plus de DEMARRAGE_MS en tout : la conception accorde au parc
  // entier une demi-seconde de plus qu'aujourd'hui avant la première image ; ce qui n'est pas fait à temps se fait dans
  // les premières images, en tranches, comme le reste)
  demarrer() {
    const t0 = performance.now();
    for (const m of this.morceaux) this._silhouette(m);
    const cx = (DEMARRAGE[0] + DEMARRAGE[2]) / 2, cz = (DEMARRAGE[1] + DEMARRAGE[3]) / 2;
    const liste = this.morceaux.filter((m) => croise(m.boite, DEMARRAGE) && !m.erreur)
      .sort((a, b) => distBoite(a.boite, cx, cz) - distBoite(b.boite, cx, cz));
    // l'échéance vaut pour TOUT le démarrage, silhouettes comprises : le contexte des morceaux est celui du jeu (budget()
    // lit this._fin), si bien qu'une zone rend la main dès l'échéance passée, même au milieu d'un morceau. (Relecture :
    // avec les vraies zones, un seul morceau du coteau, construit d'une traite, portait le démarrage à 560 ms.) Un
    // morceau inachevé reste en chantier : les premières images le finissent, en tranches.
    this._fin = t0 + (this.mobile ? 2 : 1) * DEMARRAGE_MS;
    for (const m of liste) {
      if (performance.now() >= this._fin) break;
      this._lancer(m, false);
      while (m.etat === 'construction' && performance.now() < this._fin) this._tranche(m);
    }
    this.stats.msDemarrage = Math.round(performance.now() - t0);
    this._publier();
  }

  // ------------------------------------------------------------------ chaque image
  _maj(dt, camera, joueur) {
    if (!camera) return;
    const t0 = performance.now(), R = reglages(this.scene, this.mobile);
    this._t += dt;
    this._observer(dt, camera);
    const o = this.obs, ax = o.x + o.ax, az = o.z + o.az;
    // 1. les états voulus
    for (const m of this.morceaux) {
      if (m.erreur) continue;
      m.dist = distBoite(m.boite, o.x, o.z);
      m.prio = Math.min(m.dist, distBoite(m.boite, ax, az));
      // (au-delà de la distance de libération, un morceau fini est libéré, un chantier abandonné : même règle)
      const loin = m.dist > R.libere && m.prio > R.libere;
      if (m.etat === 'detail') {
        if (loin) this._liberer(m);
        else { this._ombre(m, m.dist < R.ombre); this._afficher(m, R); }
      } else if (m.etat === 'construction') {
        if (loin) this._abandonner(m);
      }
      if (m.ancien && loin) {                              // (lot C5, voir refaire)
        this._jeterAncien(m);
        if (m.sil && m.etat !== 'detail') m.sil.visible = true;   // (relecture : sa silhouette reprend sa place)
      }
    }
    // 2. la construction, en tranches : à chaque tranche, le morceau le plus proche (avance comprise) parmi ceux qu'on
    // attend et ceux déjà commencés. Un chantier doublé par un morceau plus proche n'est pas abandonné, il est mis en
    // pause (son générateur attend) : quand l'observateur hésite entre deux morceaux, rien n'est construit deux fois.
    // Au plus CHANTIERS chantiers ACTIFS (à portée de détail) à la fois ; au-delà, on finit d'abord ceux-là. Un chantier
    // en pause au-delà de la distance de détail ne compte pas : trois chantiers laissés derrière soi ne bloquent rien.
    const deja = this._t0Image ? t0 - this._t0Image : 0;            // le temps déjà pris par le sol dans cette image
    const budget = R.budget - deja;
    this._fin = t0 + Math.max(0, budget);
    let tranches = 0;
    if (budget > 0.5 || this._sautees > 8) {
      this._sautees = 0;
      while (tranches === 0 || performance.now() < this._fin) {
        let enCours = 0, m = null;
        for (const x of this.morceaux) if (x.etat === 'construction' && x.prio < R.detail) enCours++;
        for (const x of this.morceaux) {
          if (x.erreur || x.etat === 'detail' || x.prio >= R.detail) continue;
          if (x.etat !== 'construction' && enCours >= CHANTIERS) continue;
          if (!m || x.prio < m.prio) m = x;
        }
        // (lot C6) Rien à faire à portée de détail : on FINIT les chantiers en pause, du plus proche au plus lointain, avec
        // le temps qui reste. Un chantier lancé au démarrage (la cellule du plateau et ses voisines : Z05a, Z06c… sont à 50 m
        // du joueur sur téléphone, au-delà des 45 m du détail) ou par l'avance, puis laissé derrière, restait sinon « en
        // construction » tant que l'observateur se tenait entre la distance de détail et celle de libération : sa moitié de
        // décor gardée en mémoire, sans jamais servir. Fini, il est affiché selon la règle commune (_afficher).
        if (!m) for (const x of this.morceaux) if (x.etat === 'construction' && !x.erreur && (!m || x.prio < m.prio)) m = x;
        if (!m) break;
        if (m.etat !== 'construction') this._lancer(m, false);
        this._tranche(m);
        tranches++;
      }
    } else this._sautees++;
    // 3. les objets animés des morceaux construits
    for (const m of this.morceaux) if (m.etat === 'detail' && m.anim.length) {
      for (const f of m.anim) { try { f(dt, this._t); } catch (e) { console.warn(`[parc] animation du morceau ${m.id} :`, e); m.anim.length = 0; break; } }
    }
    // 4. les cellules, et l'ombre des lots d'arbres du décor du plateau (deux fois par seconde)
    if ((this._majLots -= dt) <= 0) { this._majLots = 0.5; this._cellules(R); }
    // 5. le lointain : brouillard, camera.far, ciel qui suit
    this._lointain(camera, R);
    // mesures
    const ms = performance.now() - t0;
    this.stats.msImage = ms;
    const S = this.stats, f = S.picFenetre;
    f.push(ms); if (f.length > 300) f.shift();
    S.pic = Math.max(S.pic, ms);
    if (tranches || (this._statsAge = (this._statsAge || 0) + 1) > 30) { this._statsAge = 0; this._publier(); }
  }

  // L'observateur : la caméra (en balade, elle suit le joueur à 4 m ; en caméra libre, __pv, c'est elle qui compte),
  // dans le repère du terrain 1 ; sa vitesse lissée donne l'avance.
  _observer(dt, camera) {
    const o = this.obs, x = camera.position.x - this.dx, z = camera.position.z;
    if (!o.pret || dt <= 0) { o.x = x; o.z = z; o.vx = 0; o.vz = 0; o.pret = true; }
    else {
      const k = 1 - Math.exp(-dt * 2), vx = (x - o.x) / dt, vz = (z - o.z) / dt;
      // (un saut de plus de 30 m — téléportation, point de vue — n'est pas une vitesse)
      if (Math.hypot(x - o.x, z - o.z) > 30) { o.vx = 0; o.vz = 0; }
      else { o.vx += (vx - o.vx) * k; o.vz += (vz - o.vz) * k; }
      o.x = x; o.z = z;
    }
    let ax = o.vx * AVANCE_S, az = o.vz * AVANCE_S;
    const l = Math.hypot(ax, az);
    if (l > AVANCE_MAX) { ax *= AVANCE_MAX / l; az *= AVANCE_MAX / l; }
    o.ax = ax; o.az = az;
  }

  // ------------------------------------------------------------------ un morceau
  _ctx(m, groupe, etat, sync) {
    return {
      scene: this.scene, K: this.K, kit: this.kit, Monde, groupe, lod: this.scene.userData.qualite || this.lodReglage,
      mobile: this.mobile, alea: this.kit ? this.kit.alea : alea, etat,
      budget: sync ? () => false : () => performance.now() > this._fin,
      animer: (f) => { if (typeof f === 'function') m.anim.push(f); },
    };
  }

  _lancer(m, sync) {
    const groupe = new THREE.Group();
    groupe.name = 'ZONE:' + m.id; groupe.userData.zone = m.zone.id; groupe.userData.morceau = m.id;
    m.anim.length = 0;
    const ctx = this._ctx(m, groupe, 'detail', sync);
    m.chantier = { groupe, ctx, it: null, phase: 'debut', fusion: null, t: 0 };
    m.etat = 'construction'; m.tranches = 0; m.msAvant = m.ms;
  }

  // Une tranche : un pas du générateur de la zone, ou un pas de la fusion.
  _tranche(m) {
    const c = m.chantier, t0 = performance.now();
    try {
      if (c.phase === 'debut') {
        const it = m.def.construire ? m.def.construire(c.ctx) : null;
        c.it = it && typeof it.next === 'function' ? it : null;
        c.phase = 'construire';
      } else if (c.phase === 'construire') {
        const r = c.it ? c.it.next() : { done: true };
        if (r.done) { c.phase = 'fondre'; c.fusion = fusionnerMorceau(c.groupe, c.ctx.budget); }
      } else if (c.phase === 'fondre') {
        if (c.fusion.next().done) {
          // (lot R1) puis recopié dans les lots de dessin, en tranches aussi (js/monde_vue.js)
          if (this.vue) { c.phase = 'lots'; c.lots = this.vue.ajouter(c.groupe, c.ctx.budget, m.anim.length > 0); }
          else this._finir(m);
        }
      } else if (c.phase === 'lots') {
        if (c.lots.next().done) this._finir(m);
      }
    } catch (e) {
      console.warn(`[parc] morceau ${m.id} (zone ${m.zone.id}) non construit :`, e);
      this.stats.erreurs++;
      if (this.vue) this.vue.retirer(c.groupe);
      jeter(c.groupe);
      // (relecture du lot C5 : un morceau refait pour une option — voir refaire — qui échoue garde son ancien décor, qui
      // redevient le sien ; sans cela, l'ancien restait affiché pour toujours, la silhouette par-dessus)
      if (m.ancien) {
        m.groupe = m.ancien; m.ancien = null; m.chantier = null; m.etat = 'detail';
        if (m.sil) m.sil.visible = !m.groupe.visible;
      } else {
        // (on ne le retentera pas : une zone en erreur ne doit pas coûter une tranche à chaque image)
        m.chantier = null; m.erreur = true; m.etat = 'absent';
        if (m.sil) m.sil.visible = true;
      }
    }
    const ms = performance.now() - t0;
    m.ms += ms; m.tranches++;
    // la plus longue tranche (une pièce du kit trop grosse, une famille trop lourde à fondre : à couper dans la zone)
    if (ms > (this.stats.trancheMax || 0)) { this.stats.trancheMax = ms; this.stats.trancheMaxOu = `${m.id} (${c.phase})`; }
  }

  _finir(m) {
    const g = m.chantier.groupe;
    if (m.ancien) this._jeterAncien(m);         // (lot C5 : le décor d'avant une option changée, voir refaire)
    g.userData.nofuse = true;                   // fondu par morceau : l'optimiseur de js/court.js n'y retouche pas
    this.scene.add(g);
    this._inscrire(g, true);
    m.cout = coutGroupe(g);                     // ses triangles et sa boîte (voir trianglesDansLeCadre)
    m.groupe = g; m.chantier = null; m.etat = 'detail'; m.ombre = true; m.vu = true;
    if (m.sil) m.sil.visible = false;
    this._afficher(m, reglages(this.scene, this.mobile));
    this.stats.construits++;
    // window.__zones : le temps de construction de chaque morceau (ms, toutes tranches comprises), comme avant le lot A5
    if (typeof window !== 'undefined') (window.__zones || (window.__zones = {}))[m.id] = Math.round(m.ms - (m.msAvant || 0));
    this._ombre(m, m.dist < reglages(this.scene, this.mobile).ombre);
  }

  _abandonner(m) {
    if (!m.chantier) return;
    if (this.vue) this.vue.retirer(m.chantier.groupe);
    jeter(m.chantier.groupe);
    m.chantier = null; m.anim.length = 0;
    m.etat = m.groupe ? 'detail' : (m.ms > 0 ? 'libere' : 'absent');
    this.stats.abandons++;
  }

  _liberer(m) {
    const g = m.groupe;
    if (!g) return;
    this.scene.remove(g);
    this._inscrire(g, false);
    if (this.vue) this.vue.retirer(g);
    jeter(g);
    m.groupe = null; m.anim.length = 0; m.etat = 'libere'; m.vu = undefined;
    if (m.sil) m.sil.visible = true;
    this.stats.liberes++;
  }

  // REFAIRE des morceaux (lot C5 : une option du parc a changé, js/parc/options.js). `quoi` : une liste d'identifiants de
  // morceaux ou de zones, ou une fonction (m) => vrai. Un chantier en cours est jeté ; un morceau construit est remis à
  // construire, et son ANCIEN décor reste affiché tant que le nouveau n'est pas prêt (il est jeté dans _finir, ou dès
  // que le morceau s'éloigne au-delà de la distance de libération) : pas de trou dans le décor le temps de la
  // reconstruction. Ce qui n'est pas construit n'a rien à refaire : il le sera, plus tard, avec la nouvelle option.
  refaire(quoi) {
    const vise = typeof quoi === 'function' ? quoi : (m) => quoi.includes(m.id) || quoi.includes(m.zone.id);
    let n = 0;
    for (const m of this.morceaux) {
      if (m.erreur || !vise(m)) continue;
      if (m.chantier) this._abandonner(m);
      if (m.groupe) {
        if (m.ancien) this._jeterAncien(m);
        m.ancien = m.groupe; m.groupe = null; m.etat = 'libere'; m.anim.length = 0;
        n++;
      }
      // (relecture du lot C5 : la silhouette aussi, tout de suite — elle est légère, et elle dépend de l'option : le
      // gazon des parterres de Z13 au printemps. Elle garde son affichage : cachée si le décor, l'ancien, est montré)
      if (m.sil) {
        const vu = m.sil.visible;
        this.scene.remove(m.sil); this._inscrire(m.sil, false);
        if (this.vue) this.vue.retirer(m.sil);
        jeter(m.sil);
        m.sil = null;
        this._silhouette(m);
        if (m.sil) m.sil.visible = vu;
      }
    }
    return n;
  }
  _jeterAncien(m) {
    const a = m.ancien;
    if (!a) return;
    m.ancien = null;
    this.scene.remove(a);
    this._inscrire(a, false);
    if (this.vue) this.vue.retirer(a);
    jeter(a);
  }

  // L'affichage d'un morceau construit (voir VUE_HYST) : son décor jusqu'à la distance de détail, sa silhouette au-delà.
  // Sauf un morceau de VUE LOINTAINE, de plus de deux fois 48 m de côté (la Seine et l'île, Z19s, 116 x 335 m) : sa
  // silhouette n'est faite que pour bien plus loin (du belvédère, PV08, à 104 m de sa boîte, elle mettait une bande de
  // feuillage devant les immeubles de l'île), et son détail est déjà découpé en tranches que three écarte du cadre : il
  // reste affiché tant qu'il est construit, comme avant.
  _afficher(m, R) {
    const b = m.boite, lointain = b[2] - b[0] > 96 || b[3] - b[1] > 96;
    const vu = lointain || (m.vu ? m.dist <= R.detail + VUE_HYST : m.dist < R.detail + VUE_HYST / 2);
    if (vu === m.vu) return;
    m.vu = vu;
    m.groupe.visible = vu;
    if (m.sil) m.sil.visible = !vu;
  }

  // Tous les morceaux construits affichés, et leurs silhouettes cachées, le temps d'une photographie (la carte lointaine
  // du soleil, le sol cuit par cellule : js/monde_ombres.js) — ce qui est construit doit y porter son ombre, même hors
  // de la distance d'affichage. Rend la fonction qui remet tout comme avant.
  toutMontrer() {
    const l = [];
    for (const m of this.morceaux) if (m.groupe && !m.groupe.visible) { m.groupe.visible = true; if (m.sil) m.sil.visible = false; l.push(m); }
    return () => { for (const m of l) if (m.groupe && m.vu === false) { m.groupe.visible = false; if (m.sil) m.sil.visible = true; } };
  }

  // La silhouette d'un morceau (si la zone en donne une), construite d'un coup, fondue, toujours là.
  _silhouette(m) {
    if (m.sil || !m.def.silhouette || m.erreur) return;
    const g = new THREE.Group();
    g.name = 'SIL:' + m.id; g.userData.zone = m.zone.id; g.userData.morceau = m.id; g.userData.silhouette = true;
    try {
      const it = m.def.silhouette(this._ctx(m, g, 'silhouette', true));
      if (it && typeof it.next === 'function') for (let r = it.next(); !r.done; r = it.next());
      const f = fusionnerMorceau(g);
      for (let r = f.next(); !r.done; r = f.next());
      // (lot R1) les silhouettes aussi dans les lots de dessin : deux ou trois appels chacune, une trentaine en vue
      if (this.vue) for (let it = this.vue.ajouter(g), r = it.next(); !r.done; r = it.next());
      g.userData.nofuse = true;
      g.visible = m.etat !== 'detail';
      this.scene.add(g);
      this._inscrire(g, true);
      m.sil = g; m.coutSil = coutGroupe(g);
    } catch (e) {
      console.warn(`[parc] silhouette du morceau ${m.id} (zone ${m.zone.id}) non construite :`, e);
      if (this.vue) this.vue.retirer(g);
      jeter(g);
    }
  }

  // Le registre des plans découpés (js/fx.js) : ce qui a une carte et de la découpe ou de la transparence.
  _inscrire(g, oui) {
    const R = this.registre;
    g.traverse((o) => {
      if (!o.isMesh) return;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!mat || !mat.map || !(mat.alphaTest > 0 || mat.transparent)) return;
      if (oui) R.set.add(o); else R.set.delete(o);
    });
    R.version++;
  }

  // L'ombre d'un morceau construit : il ne porte ombre qu'à portée du joueur (§ 3.6, porteurs d'ombre). Chaque maillage
  // garde son réglage d'origine (userData.ombreKit) pour le retrouver.
  _ombre(m, oui) {
    if (!m.groupe || m.ombre === oui) return;
    m.ombre = oui;
    m.groupe.traverse((o) => {
      if (!o.isMesh) return;
      if (o.userData.ombreKit === undefined) o.userData.ombreKit = o.castShadow;
      o.castShadow = oui && o.userData.ombreKit;
    });
  }

  // ------------------------------------------------------------------ les cellules
  _cellules(R) {
    const o = this.obs;
    for (const c of this.cellules) {
      c.dist = distBoite(c.boite, o.x, o.z);
      c.etat = c.dist < R.ombre ? 'ombre' : c.dist < R.detail ? 'detail' : c.dist < R.brume[1] + 20 ? 'silhouette' : 'loin';
    }
    // les lots d'arbres du décor du plateau (js/court_parc.js, poserLot) : ombre à portée du joueur seulement
    for (const L of this.scene.userData.lotsArbres || []) {
      L.mesh.castShadow = L.ombre && Math.hypot(L.x - this.dx - o.x, L.z - o.z) - L.r < R.ombre;
    }
  }

  // L'état d'une cellule (i, k) de monde.json : 'ombre', 'detail', 'silhouette' ou 'loin'.
  etatCellule(i, k) {
    const c = this.cellules.find((x) => x.i === i && x.k === k);
    return c ? c.etat : 'loin';
  }

  // Les triangles des morceaux affichés (construits, ou leur silhouette) dont la boîte est dans le cadre `fr` de la
  // caméra et en deçà de camera.far : ce que les zones coûtent à la passe principale, pour le plafond de végétation
  // (js/monde_vegetation.js). Une vingtaine de tests de boîte : rien à côté d'une image.
  trianglesDansLeCadre(fr, camera) {
    let n = 0;
    const dans = (c) => c && fr.intersectsBox(c.boite) && c.boite.distanceToPoint(camera.position) < camera.far;
    // (lot R1 : seulement ce qui est affiché — un morceau au-delà de sa distance d'affichage montre sa silhouette — et
    // pas ce que le relief cache, js/monde_vue.js)
    const cache = this.vue ? this.vue._caches : null;
    const fin = reglages(this.scene, this.mobile).fin || Infinity;
    for (const m of this.morceaux) {
      const o = m.etat === 'detail' && m.groupe && m.groupe.visible ? m.groupe : m.sil && m.sil.visible ? m.sil : null;
      if (!o || (cache && cache.has(o))) continue;
      const c = o === m.groupe ? m.cout : m.coutSil;
      // (lot C6 : la ferronnerie d'un morceau loin n'est dessinée qu'en sa version simple, et de près qu'en détail fin)
      if (dans(c)) n += c.tri - ((c.pres || c.loin) ? (c.boite.distanceToPoint(camera.position) > fin ? c.pres : c.loin) : 0);
    }
    return n;
  }

  // ------------------------------------------------------------------ le lointain
  // En balade seulement (Player.enBalade, posé par js/game.js au début de l'image) : le brouillard du préréglage, borné
  // par celui de la météo (la pluie le rapproche encore), camera.far, et le ciel qui suit la caméra. js/weather.js repose
  // le brouillard à chaque image, avant nous : rien ne s'accumule.
  _lointain(camera, R) {
    const fog = this.scene.fog, balade = !!Player.enBalade && !!fog;
    let far = FAR_BASE;
    if (balade) {
      fog.near = Math.min(fog.near, R.brume[0]); fog.far = Math.min(fog.far, R.brume[1]);
      far = fog.far + 20;
    }
    if (Math.abs(camera.far - far) > 0.5) { camera.far = far; camera.updateProjectionMatrix(); }
    this._suivreCiel(camera, far < FAR_BASE - 1 ? (far - 15) / 505 : 0);
    this._jupe(camera, far < FAR_BASE - 1 ? fog.far + 2 : 0);
  }

  // LA JUPE DE BRUME. camera.far coupe le sol à 280 m ; vu de haut (le belvédère, le haut du coteau, et plus encore le
  // drone du PV21), la coupure tombe SOUS l'horizon, sous l'anneau de brume : on y voyait le bas du dôme du ciel (la
  // lueur dorée du couchant, sous la ligne d'horizon) et, entre les deux, un liseré noir. Une calotte posée juste
  // au-delà de la fin du brouillard, de 2,5° sous l'horizon jusqu'à la verticale, la bouche : elle est entièrement dans
  // le brouillard (sa couleur est donc exactement celle d'un sol lointain), dessinée la première (centrée sur la
  // caméra), et elle écrit la profondeur : le dôme, plus loin, ne passe plus dessous. Ce qui est plus près qu'elle se
  // dessine par-dessus, comme avant. `r` : son rayon (0 : rangée).
  _jupe(camera, r) {
    if (!this._jupeM) {
      if (!r) return;
      const g = new THREE.SphereGeometry(1, 48, 6, 0, Math.PI * 2, Math.PI / 2 + 0.044, Math.PI / 2 - 0.044);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide, fog: true }));
      m.name = 'jupe de brume'; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false;
      Object.assign(m.userData, { dynamique: true, nofuse: true, ciel: true });
      this.scene.add(m);
      this._jupeM = m;
    }
    const m = this._jupeM;
    m.visible = r > 0;
    if (r > 0) { m.position.copy(camera.position); m.scale.setScalar(r); }
  }

  // Le ciel à l'échelle `k` autour de la caméra (0 : à sa place d'origine, autour de l'origine du monde). Les objets du
  // ciel ne s'éclairent pas et ignorent le brouillard : les rapprocher en les réduisant d'autant ne change rien à ce qu'on
  // voit, sauf qu'ils passent sous camera.far.
  _suivreCiel(camera, k) {
    const u = this.scene.userData, c = u.ciel;
    if (!c) return;
    // (userData.ciel : ni bloc fondu ni décor, js/debug_monde.js ne les compte pas parmi les sphères de plus de 35 m)
    if (!this._ciel) {
      this._ciel = [c.soleil, c.couvert, c.aureole, c.noyau].filter(Boolean).map((o) => { o.userData.ciel = true; return { o, p: o.position.clone(), s: o.scale.clone() }; });
    }
    // la brume d'horizon est reposée à chaque changement de météo (poserBrume) : on la reprend à chaque fois
    const b = u.brume;
    if (b && (!this._brume || this._brume.o !== b)) { b.userData.ciel = true; this._brume = { o: b, p: b.position.clone(), s: b.scale.clone() }; }
    const liste = this._brume ? [...this._ciel, this._brume] : this._ciel;
    // (les positions d'origine sont prises caméra au plateau, œil à 1,7 m : c'est d'elle qu'on les mesure)
    for (const e of liste) {
      if (k > 0) {
        // la brume est un anneau centré sur l'origine, à y = 72 : on garde sa hauteur au-dessus de l'œil, réduite
        const dy = e === this._brume ? (e.p.y - 1.7) * k : e.p.y * k;
        e.o.position.set(camera.position.x + e.p.x * k, camera.position.y + dy, camera.position.z + e.p.z * k);
        e.o.scale.copy(e.s).multiplyScalar(k);
      } else { e.o.position.copy(e.p); e.o.scale.copy(e.s); }
    }
  }

  // ------------------------------------------------------------------ mesures
  _publier() {
    const n = { absent: 0, construction: 0, detail: 0, libere: 0 };
    let file = 0, sil = 0;
    const R = reglages(this.scene, this.mobile);
    for (const m of this.morceaux) {
      n[m.etat] = (n[m.etat] || 0) + 1;
      if (m.sil) sil++;
      if (!m.erreur && m.etat !== 'detail' && m.etat !== 'construction' && m.prio < R.detail) file++;
    }
    const f = this.stats.picFenetre;
    Monde.stats = { ...(Monde.stats || {}),
      morceaux: { total: this.morceaux.length, detail: n.detail, enConstruction: n.construction, liberes: n.libere,
        absents: n.absent, silhouettes: sil, enAttente: file, erreurs: this.stats.erreurs },
      charge: { msImage: +this.stats.msImage.toFixed(2), picRecent: +(f.length ? Math.max(...f) : 0).toFixed(2),
        pic: +this.stats.pic.toFixed(2), construits: this.stats.construits, liberes: this.stats.liberes,
        abandons: this.stats.abandons, msDemarrage: this.stats.msDemarrage,
        trancheMax: +(this.stats.trancheMax || 0).toFixed(2), trancheMaxOu: this.stats.trancheMaxOu || '—',
        cellulesOmbre: this.cellules.filter((c) => c.etat === 'ombre').length,
        cellulesDetail: this.cellules.filter((c) => c.etat === 'ombre' || c.etat === 'detail').length } };
  }

  // Le détail de chaque morceau (console : __ordonnanceur.bilan())
  bilan() {
    const t = {};
    for (const m of this.morceaux) t[m.id] = { zone: m.zone.id, etat: m.etat + (m.erreur ? ' (erreur)' : ''), distance: Math.round(m.dist), ms: Math.round(m.ms), tranches: m.tranches, silhouette: !!m.sil };
    console.table(t);
    return t;
  }
}

// Le hasard déterministe du parc (même formule que js/court_parc.js et js/parc/kit.js), si le kit manque.
function alea(x, z, k = 0) {
  const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

// Les triangles d'un groupe (instances comprises) et sa boîte dans le monde, pris une fois, le groupe construit et
// fondu (un morceau ne bouge plus ensuite).
export function coutGroupe(g) {
  // (lot C6 : à part, les triangles du détail fin de la ferronnerie et ceux de sa version de loin — un seul des deux est
  // dessiné, selon la distance : voir trianglesDansLeCadre)
  let tri = 0, pres = 0, loin = 0;
  g.updateMatrixWorld(true);
  g.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const G = o.geometry, n = ((G.index ? G.index.count : G.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1);
    tri += n;
    if (o.userData.lod === 'pres') pres += n; else if (o.userData.lod === 'loin') loin += n;
  });
  return { tri, pres, loin, boite: new THREE.Box3().setFromObject(g) };
}

// Rend à la carte graphique les géométries d'un groupe (pas celles que le kit partage entre ses exemplaires :
// userData.kitModele), et le détache de la scène. (InstancedMesh.dispose() de three ne rend que les tampons des
// instances, pas la géométrie : celle d'une zone restait sur la carte à chaque libération. BatchedMesh.dispose(), lui,
// rend la sienne.)
function jeter(g) {
  if (!g) return;
  if (g.parent) g.parent.remove(g);
  g.traverse((o) => {
    if (o.isBatchedMesh) { o.dispose(); return; }
    if (o.isInstancedMesh) o.dispose();
    if (o.geometry && !o.userData.kitModele) o.geometry.dispose();
  });
}

// =====================================================================
//  LA FUSION D'UN MORCEAU (en tranches : un générateur)
// =====================================================================
// Même règle que fusionnerDecor (js/court.js) : même matériau, mêmes réglages d'ombre, mêmes attributs. Une famille dont
// la sphère englobante dépasserait RAYON_BLOC est fondue cellule par cellule (celle du centre de chaque objet).
// Les sommets de chaque objet sont écrits DIRECTEMENT dans les tableaux du bloc (position et normale transformées, le
// reste recopié), objet après objet, et `budget()` vrai rend la main entre deux objets. (La première version clonait
// chaque géométrie, la transformait, puis fondait la famille d'un coup, mergeGeometries : jusqu'à 30 ms d'une traite
// pour une famille de quelques dizaines de bancs et de candélabres, mesurés sur un tour à vélo.)
// Sont aussi laissés tels quels les maillages qui portent ce qu'un bloc fondu perdrait : un matériau d'ombre propre
// (customDepthMaterial : l'ombre découpée d'un feuillage, ventée ; fondu, il portait des ombres carrées) ou un
// onBeforeRender à eux (une animation posée sur l'objet). Une zone n'a donc pas à les marquer `nofuse` elle-même.
const ONBC_NATIF = THREE.Material.prototype.onBeforeCompile, ONBR_NATIF = THREE.Object3D.prototype.onBeforeRender;
const _v = new THREE.Vector3(), _b = new THREE.Box3(), _s = new THREE.Sphere(), _mt = new THREE.Matrix4(), _mn = new THREE.Matrix3();
export function* fusionnerMorceau(groupe, budget = () => false) {
  groupe.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(groupe.matrixWorld).invert(), familles = new Map();
  const protege = (o) => { for (let n = o; n && n !== groupe.parent; n = n.parent) if (n.userData && (n.userData.nofuse || n.userData.dynamique)) return true; return false; };
  groupe.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isBatchedMesh || o.children.length || protege(o)) return;
    if (o.customDepthMaterial || o.customDistanceMaterial || o.onBeforeRender !== ONBR_NATIF) return;
    const m = o.material, g = o.geometry;
    if (!m || Array.isArray(m) || m.transparent || m.onBeforeCompile !== ONBC_NATIF || !g || !g.attributes.position) return;
    if (g.morphAttributes && Object.keys(g.morphAttributes).length) return;
    // (mêmes attributs : mêmes noms, mêmes tailles, mêmes types — sinon on coudrait des tampons décalés)
    const at = Object.keys(g.attributes).sort().map((k) => { const a = g.attributes[k]; return k + a.itemSize + (a.isInterleavedBufferAttribute ? 'i' : a.array.constructor.name) + (a.normalized ? 'n' : ''); });
    // (lot C6 : et le niveau de détail de la ferronnerie, userData.lod — js/parc/kit.js, Lot.maillages)
    const cle = [m.uuid, o.castShadow, o.receiveShadow, at.join(','), !!g.index, o.userData.lod || ''].join('#');
    if (!familles.has(cle)) familles.set(cle, []);
    familles.get(cle).push(o);
  });
  yield;
  for (const lot of familles.values()) {
    if (lot.length < 2) continue;
    // l'étendue de la famille : trop grande, on la découpe par cellule
    _b.makeEmpty();
    const centres = lot.map((o) => {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      _s.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      _b.expandByPoint(_v.copy(_s.center).addScalar(_s.radius)); _b.expandByPoint(_v.copy(_s.center).addScalar(-_s.radius));
      return [_s.center.x, _s.center.z];
    });
    let parties = [lot];
    if (_b.getBoundingSphere(_s).radius > RAYON_BLOC) {
      const m = new Map();
      lot.forEach((o, i) => {
        const cle = Math.floor((centres[i][0] - Monde.dx - CELLULE.x0) / CELLULE.taille) + ':' + Math.floor((centres[i][1] - CELLULE.z0) / CELLULE.taille);
        if (!m.has(cle)) m.set(cle, []);
        m.get(cle).push(o);
      });
      parties = [...m.values()];
    }
    for (const p of parties) {
      if (p.length < 2) continue;
      // les tableaux du bloc, à la taille de la somme des objets
      const g0 = p[0].geometry, noms = Object.keys(g0.attributes), indexe = !!g0.index;
      let nv = 0, ni = 0;
      for (const o of p) { nv += o.geometry.attributes.position.count; ni += indexe ? o.geometry.index.count : 0; }
      const dst = {};
      for (const k of noms) {
        // (les normales et tangentes, transformées, sont toujours écrites en flottants)
        const a = g0.attributes[k], vec = k === 'normal' || k === 'tangent';
        const Tab = a.isInterleavedBufferAttribute || vec ? Float32Array : a.array.constructor;
        dst[k] = { a: new Tab(nv * a.itemSize), n: a.itemSize, norm: vec ? false : a.normalized };
      }
      const idx = indexe ? (nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni)) : null;
      // (la boîte englobante est tenue en écrivant les positions : pas de second parcours du bloc à la fin)
      const boite = new THREE.Box3();
      let ov = 0, oi = 0;
      for (const o of p) {
        ecrireObjet(o, _mt.multiplyMatrices(inv, o.matrixWorld), noms, dst, ov, boite);
        const g = o.geometry, n = g.attributes.position.count;
        if (indexe) { const I = g.index.array; for (let i = 0; i < g.index.count; i++) idx[oi + i] = I[i] + ov; oi += g.index.count; }
        ov += n;
        if (budget()) yield;
      }
      const g = new THREE.BufferGeometry();
      for (const k of noms) g.setAttribute(k, new THREE.BufferAttribute(dst[k].a, dst[k].n, dst[k].norm));
      if (idx) g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.boundingBox = boite; g.boundingSphere = boite.getBoundingSphere(new THREE.Sphere());
      const b = new THREE.Mesh(g, p[0].material);
      b.castShadow = p[0].castShadow; b.receiveShadow = p[0].receiveShadow; b.name = p[0].name;
      if (p[0].userData.feuillage) b.userData.feuillage = true;
      if (p[0].userData.lod) { b.userData.lod = p[0].userData.lod; b.visible = p[0].visible; }
      b.matrixAutoUpdate = false;
      groupe.add(b);
      for (const o of p) { o.parent.remove(o); if (!o.userData.kitModele) o.geometry.dispose(); }
      if (budget()) yield;
    }
  }
}

// Les sommets d'un objet, transformés par `m` (position ; normale et tangente par la matrice des normales, renormalisées),
// écrits dans les tableaux `dst` du bloc à partir du sommet `ov` ; les autres attributs (UV, couleurs) recopiés tels quels.
function ecrireObjet(o, m, noms, dst, ov, boite) {
  const g = o.geometry, n = g.attributes.position.count, e = m.elements, q = _mn.getNormalMatrix(m).elements;
  for (const k of noms) {
    const s = g.attributes[k], d = dst[k], D = d.a, it = d.n, base = ov * it;
    // (le cas courant, un Float32Array ordinaire, est lu directement : les accesseurs getX de three coûtent trois fois plus)
    const brut = !s.isInterleavedBufferAttribute && !s.normalized && s.array instanceof Float32Array, A = s.array, si = s.itemSize;
    if (k === 'position' && it === 3) {
      const b0 = boite.min, b1 = boite.max;
      for (let i = 0; i < n; i++) {
        const x = brut ? A[i * si] : s.getX(i), y = brut ? A[i * si + 1] : s.getY(i), z = brut ? A[i * si + 2] : s.getZ(i), j = base + i * 3;
        const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14];
        D[j] = X; D[j + 1] = Y; D[j + 2] = Z;
        if (X < b0.x) b0.x = X; if (X > b1.x) b1.x = X; if (Y < b0.y) b0.y = Y; if (Y > b1.y) b1.y = Y; if (Z < b0.z) b0.z = Z; if (Z > b1.z) b1.z = Z;
      }
    } else if ((k === 'normal' || k === 'tangent') && it >= 3) {
      for (let i = 0; i < n; i++) {
        const x = brut ? A[i * si] : s.getX(i), y = brut ? A[i * si + 1] : s.getY(i), z = brut ? A[i * si + 2] : s.getZ(i), j = base + i * it;
        let nx = q[0] * x + q[3] * y + q[6] * z, ny = q[1] * x + q[4] * y + q[7] * z, nz = q[2] * x + q[5] * y + q[8] * z;
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        D[j] = nx / l; D[j + 1] = ny / l; D[j + 2] = nz / l;
        if (it === 4) D[j + 3] = s.getW(i);
      }
    } else if (!s.isInterleavedBufferAttribute && s.array.constructor === D.constructor) {
      D.set(s.array.subarray(0, n * it), base);
    } else {
      for (let i = 0; i < n; i++) for (let c = 0; c < it; c++) D[base + i * it + c] = s.getComponent(i, c);
    }
  }
}
