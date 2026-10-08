// =====================================================================
//  LES MONTURES « DEBOUT » : trottinette et skate (lot C4, « Et autre »)
// =====================================================================
// Le vélo (js/velo.js) se conduit assis et se pédale. La trottinette et le skate se conduisent DEBOUT et se POUSSENT
// DU PIED : c'est ce qui les distingue, et c'est tout ce que ce fichier ajoute à js/monture.js (la classe de base de
// tous les engins : direction, inclinaison, ce qui arrête, pente et gravité, réseau). Il donne :
//
//  - LA POUSSÉE DU PIED (MontureDebout.conduire). On ne pédale pas : on pose le pied par terre, on pousse vers
//    l'arrière, on le relève, on revient — un CYCLE. La force n'agit que pendant que le pied touche le sol (le
//    « contact »), en cloche (sin), et sa moyenne sur le cycle vaut celle qu'on demande : l'engin avance par à-coups,
//    comme un vrai. Le contact raccourcit avec la vitesse (le pied planté recule à la vitesse de l'engin : à 4 m/s,
//    une jambe ne suit pas plus de 0,2 s). Lancé à fond, on cesse de pousser et l'on glisse ; on repousse quand on a
//    perdu un peu de vitesse. Le pied revient alors sur le plateau.
//  - LE SOL (relief du parc entier seulement) : de petites roues freinent selon la surface (_trainee : le gravier
//    colle, l'herbe arrête) ; la trottinette suit les seuils de l'agent « trottinette » de js/monde.js — pente de
//    10 % au plus — sur le GRAVIER GROSSIER, ceux des allées partout ailleurs (_agentSol : elle descend la rampe est,
//    10,6 %, mais refuse une pente de gravier de plus de 10 %) ; le skate ne roule ni sur le gravier, ni sur l'herbe, ni
//    dans le sable (_refus : refusé comme « pas un chemin »).
//  - LE CAVALIER DEBOUT (placerCavalier) : le joueur est posé SUR l'engin — hanches au-dessus du plateau, pieds sur
//    le plateau ou par terre pour pousser, mains sur le guidon (trottinette) — par cinématique inverse, comme le
//    cycliste sur son vélo (Player._placerSurVelo). Chaque engin dit où vont les hanches, les pieds et les mains
//    (poseDebout) et quelle est sa pose de base (poseCavalier) ; ce fichier fait le reste.
//  - LE RÉSEAU : le paquet des autres joueurs garde la forme de celui du vélo (Player.etatAnim, `vl`, 8 valeurs puis
//    la descente et la position), avec le genre de l'engin à côté (`vt`) ; chacun rejoue la poussée chez lui, à la
//    phase reçue. Une RÉSERVE par genre, comme pour les vélos (Velo.emprunter) : on ne construit pas un engin dans le
//    gestionnaire d'un paquet.
//
// Sur un terrain plat (La Cage, Levallois, Jemmapes, le parc drapeau baissé), rien de ce qui touche au sol ne
// s'exécute : la surface est de l'enrobé partout, Monde.franchir ne refuse rien.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Monture } from './monture.js';
import { Monde, AGENTS, SURFACE } from './monde.js';

export const lisse = (k) => k * k * (3 - 2 * k);

// LES AGENTS « SUR SOL DUR » (ajoutés à ceux de js/monde.js, qui n'en change pas) : les mêmes marches que l'agent de
// l'engin, sans plafond de pente — c'est le drapeau « cyclable » qui la borne, comme pour le vélo (14 % sur les allées).
// Le skate n'a « aucune marche » : 12 mm, la plus petite chose qu'une roue de 54 mm avale sans s'arrêter (sans ce
// millimètre de tolérance, chaque pas de 3 cm dans une côte de 4 % était un mur).
AGENTS.trottinette_dur = { ...AGENTS.trottinette, penteMax: Infinity };
AGENTS.skate_dur = { ...AGENTS.skate, monter: 0.012, penteMax: Infinity };

// Les genres connus (chaque fichier d'engin s'y inscrit) : le réseau retrouve la classe d'après le nom (`vt`).
export const GENRES = {};

// La durée du pied en l'air entre deux poussées (s), au trot et en sprint ; le contact, lui, dépend de la vitesse
// (CONTACT / v, borné).
const VOL = 0.46, VOL_SPRINT = 0.36;
const CONTACT = { k: 0.62, min: 0.20, max: 0.42 };

// Repère commun des engins : +z devant, +y en haut, +x à GAUCHE (comme le vélo et le joueur), origine au sol, au milieu.
export class MontureDebout extends Monture {
  constructor(opts, P) {
    super(opts, P);
    // ---- la poussée du pied ----
    this.pousse = false;           // on enchaîne les poussées (on demande d'avancer et l'on n'est pas lancé à fond)
    this.pied = 0;                 // 0 = le pied de poussée sur le plateau, 1 = il travaille (au sol ou en l'air)
    this.tK = 0;                   // temps écoulé dans le cycle en cours (s)
    this.tc = 0.4; this.tv = VOL;  // durées du contact et du vol de ce cycle (figées au début du cycle)
    this.frein = 0;                // on freine (0..1) : le pied appuie sur le garde-boue, ou traîne par terre
    this.pas = false;              // un pied vient de toucher le sol (le jeu en fait un bruit de pas, puis le remet à faux)
    this.perso = false;            // l'engin du joueur (acheté au marchand) : il le range dans son sac en descendant
    this._repartir();
    this.prec.phase = 0; this.prec.pied = 0; this.prec.frein = 0;
  }

  get genreNom() { return this.P.nom; }
  // la phase du cycle (0..1) et la part du contact (0..1), pour l'animation et le réseau
  get phase() { return this.tK / (this.tc + this.tv); }
  get partContact() { return this.tc / (this.tc + this.tv); }

  // Un nouveau cycle commence EN FIN DE VOL : le pied, parti du plateau, descend se poser presque tout de suite.
  _repartir() { this._nouveauCycle(); this.tK = this.tc + this.tv * 0.62; }
  _nouveauCycle(sprint = false) {
    const v = Math.max(1, Math.abs(this.v));
    this.tc = Math.max(CONTACT.min, Math.min(CONTACT.max, CONTACT.k / v));
    this.tv = sprint ? VOL_SPRINT : VOL;
  }

  // ======================================================================== CONDUITE
  // `e` = { x, y, sprint } comme pour le vélo : y > 0 = pousser, y < 0 = freiner (puis reculer à petits pas).
  conduire(e, dt, bornes, obstacles = []) {
    const P = this.P, ay = e.y || 0, sprint = !!e.sprint;
    const vmax = sprint ? P.vmaxDanseuse : P.vmax;
    // (relecture C4) le sens de marche AVANT le pas : après un choc franc, Monture.conduire renvoie la vitesse en arrière
    // (v × -0,15) ; lu après coup, il faisait regarder le sol DERRIÈRE l'engin (voir _solDevant)
    const sens = Math.sign(this.v) || 1;
    // on pousse tant qu'on le demande et qu'on n'est pas lancé à fond (on repousse sous 88 % de la vitesse de pointe)
    if (ay > 0.05 && this.v < vmax * (this.pousse ? 0.97 : 0.88)) this.pousse = true;
    else if (ay <= 0.05 || this.v >= vmax * 0.97) this.pousse = false;
    this.frein += ((ay < -0.05 && this.v > 0.3 ? 1 : 0) - this.frein) * (1 - Math.exp(-dt * 10));
    // le pied : il part travailler en 0,15 s, il revient se poser sur le plateau à la fin de son geste
    const pc = this.pousse ? 1 : 0;
    this.pied += (pc - this.pied) * (1 - Math.exp(-dt * (pc ? 7 : 4)));
    let ayM = ay < -0.05 ? ay : 0;
    if (this.pied > 0.02 || this.pousse) {
      const avant = this.tK;
      this.tK += dt;
      const T = this.tc + this.tv;
      if (this.tK >= T) {
        // fin du cycle : on en commence un autre si l'on pousse encore ; sinon le pied reste sur le plateau
        if (this.pousse) { this._nouveauCycle(sprint); this.tK -= T; if (this.tK > this.tc) this.tK = 0; }
        else { this._repartir(); this.pied = 0; }
      }
      if (avant > this.tK || (avant < 1e-9 && this.tK > 0 && this.tK < this.tc)) this.pas = true;   // le pied touche le sol
      // LA FORCE, pendant le contact seulement, en cloche : sa moyenne sur le cycle vaut la commande
      if (this.pousse && this.tK < this.tc) {
        const s = this.tK / this.tc, Tc = this.tc + this.tv;
        ayM = ay * Math.sin(Math.PI * s) * (Tc / this.tc) * (Math.PI / 2);
      }
    } else if (!this.pousse) this._repartir();
    super.conduire({ x: e.x, y: ayM, sprint }, dt, bornes, obstacles);
    // ce qui a arrêté l'engin sur le relief : on note le sol devant lui (le gravier, l'herbe) pour le message du jeu
    if (this.blocage && !Monde.plat) {
      this.blocage.sol = this._solDevant(sens);
      this.blocage.engin = this.P.nom;
    }
  }

  // LE SOL QUI ARRÊTE, devant le point de contact de tête (dans le sens de marche `sens`), à 5, 25 et 50 cm : le premier
  // que l'engin refuse (le gravier du skate) ou dont il borne la pente (le gravier de la trottinette) ; sinon celui
  // à 5 cm. (Relecture C4 : on lisait un seul point, à 50 cm du MILIEU de l'engin et du mauvais côté après le choc ;
  // le skate arrêté au bord du gravier disait « pas un chemin pour le skate » au lieu de « ne roule pas sur le
  // gravier ».)
  _solDevant(sens) {
    const P = this.P, sx = Math.sin(this.cap) * sens, sz = Math.cos(this.cap) * sens;
    const tete = sens > 0 ? Math.max(...P.contacts) : -Math.min(...P.contacts);
    let premier = null;
    for (const d of [0.05, 0.25, 0.5]) {
      const s = Monde.surface(this.pos.x + sx * (tete + d), this.pos.z + sz * (tete + d));
      if ((P.interdits && P.interdits.has(s)) || (P.grossier && P.grossier.has(s))) return s;
      if (premier === null) premier = s;
    }
    return premier;
  }

  // LA POUSSÉE SUR LE RELIEF : pas de braquet (on ne pédale pas) ; dans une côte, on pousse plus fort et plus souvent
  // (jusqu'à × 2 à 15 %), sans quoi la rampe ouest ne se monterait pas.
  _forceRelief(ay, sprint, vmax) {
    const P = this.P, p = this.pente;
    let f = ay * (sprint ? P.forceDanseuse : P.force) * Math.max(0, 1 - this.v / vmax);
    if (p > 0 && f > 0) f *= 1 + Math.min(1, p / 0.15);
    return f;
  }

  // LA GRAVITÉ, puis la vitesse de descente bornée à celle que le cavalier tient (il traîne le pied, il freine) :
  // une trottinette à 10 m/s dans la rampe est, c'est la chute assurée.
  _gravite(dt, ay) {
    super._gravite(dt, ay);
    const m = this.P.vmaxRelief;
    if (this.v > m) this.v = m; else if (this.v < -m) this.v = -m;
  }

  // Le roulement selon le sol (relief seulement ; ailleurs, de l'enrobé) et l'air.
  _trainee(dt) {
    const P = this.P;
    const f = Monde.plat ? 1 : (P.sols[Monde.surface(this.pos.x, this.pos.z)] ?? 1);
    return (P.roulement * f + P.air * this.v * this.v) * dt;
  }

  // L'agent de Monde.franchir au point d'arrivée : celui de l'engin (pente de 10 % au plus) sur le sol grossier, celui
  // « sur sol dur » ailleurs (voir l'en-tête).
  _agentSol(x, z) {
    const P = this.P;
    if (Monde.plat || !P.grossier) return P.agentDur;
    return P.grossier.has(Monde.surface(x, z)) ? P.agent : P.agentDur;
  }

  // Les sols où l'engin ne roule pas du tout (le skate dans le gravier, l'herbe, le sable) : refusés comme « pas un
  // chemin », avec la normale du bord de ce sol (les voisins refusés tirent la normale de leur côté, comme
  // Monde.franchir) pour glisser le long. Jamais prisonnier : un point de départ déjà sur un tel sol peut en sortir.
  _refus(rx, rz, x, z) {
    const b = super._refus(rx, rz, x, z);
    const I = this.P.interdits;
    if (b || Monde.plat || !I || !I.has(Monde.surface(x, z)) || I.has(Monde.surface(rx, rz))) return b;
    const e = 0.5;
    let nx = 0, nz = 0;
    for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
      if ((ox || oz) && I.has(Monde.surface(x + ox * e, z + oz * e))) { nx -= ox; nz -= oz; }
    }
    let l = Math.hypot(nx, nz);
    if (l < 1e-6 || nx * (rx - x) + nz * (rz - z) <= 0) { nx = rx - x; nz = rz - z; l = Math.hypot(nx, nz) || 1; }
    return { nx: nx / l, nz: nz / l, type: 'pente' };
  }

  // ======================================================================== MONTER, DESCENDRE, GARER
  prendre() { super.prendre(); this.pousse = false; this.pied = 0; this.frein = 0; this._repartir(); }
  garer() { super.garer(); this.pousse = false; this.pied = 0; this.frein = 0; }
  // (la selle du vélo ; ici, le guidon est réglé à la taille du cavalier dans poseDebout)
  regler() {}

  // ======================================================================== RÉSEAU
  // La forme du paquet du vélo (8 valeurs) : braquage, PHASE du cycle, inclinaison, vitesse, PIED, arrêt, PART DU
  // CONTACT, FREIN.
  etatReseau() {
    const r = (v) => Math.round(v * 100) / 100;
    return [r(this.braq), r(this.phase), r(this.penche), r(this.v), r(this.pied), r(this.arret), r(this.partContact), r(this.frein)];
  }
  // Chez les autres : la poussée continue de tourner entre deux paquets (le vol a une durée connue, le contact s'en
  // déduit) et la phase se recale doucement sur celle reçue.
  appliquerReseau(vl, pos, cap, dt) {
    if (!vl) return;
    const k = 1 - Math.exp(-dt * 10);
    this.pos.copy(pos); this.cap = cap;
    this.braq += (vl[0] - this.braq) * k;
    this.penche += (vl[2] - this.penche) * k;
    this.v = vl[3];
    this.pied += ((vl[4] || 0) - this.pied) * k;
    this.arret += ((vl[5] || 0) - this.arret) * k;
    this.frein += ((vl[7] || 0) - this.frein) * k;
    const c = Math.max(0.15, Math.min(0.6, vl[6] || 0.4));
    this.tv = VOL; this.tc = VOL * c / (1 - c);
    const T = this.tc + this.tv;
    this.tK = (this.tK + dt) % T;
    let d = (vl[1] || 0) - this.phase; d -= Math.round(d);
    this.tK = ((this.tK + d * T * (1 - Math.exp(-dt * 3))) % T + T) % T;
    this.roue += (this.v / this.P.roueR) * dt;
  }

  memoriser() {
    super.memoriser();
    const p = this.prec;
    p.phase = this.phase; p.pied = this.pied; p.frein = this.frein;
  }

  // ======================================================================== LA RÉSERVE (cavaliers distants)
  // (chaque classe d'engin a SA réserve, `static _reserve = []`)
  static emprunter(scene) {
    const R = this._reserve, v = R.find((x) => x.scene === scene);
    if (v) R.splice(R.indexOf(v), 1);
    const b = v || new this(scene, { conduisible: false, appui: null });
    b.v = 0; b.braq = 0; b.penche = 0; b.bequille = 0; b.arret = 1; b.pied = 0; b.frein = 0; b.appui = null;
    b.racine.visible = true;
    return b;
  }
  static rendre(b) { b.racine.visible = false; b.pris = false; this._reserve.push(b); }
  static preparer(scene, n = 1) {
    while (this._reserve.filter((x) => x.scene === scene).length < n) {
      const b = new this(scene, { conduisible: false, appui: null });
      b.racine.visible = false; this._reserve.push(b);
    }
  }

  // ======================================================================== LE CAVALIER
  // Appelé par Player._placerSurVelo quand l'engin en a un (à la place du cycliste assis). Voir l'en-tête.
  placerCavalier(J, a) {
    const V = J.velo, A = J.avatar, D = this._D || (this._D = poseVide());
    if (!J._frais) J._poseDeBase();
    this.presenter(a);
    if (J.remote) this.racine.visible = J.mesh.visible;
    const e = lisse(V.k);
    this.poseDebout(J, D, a);
    // les hanches de l'avatar dans son propre repère (les os des cuisses ne dépendent que du bassin)
    if (A) {
      A._set('Hips', D.bassin * e, 0, D.bassinLacet * e);
      J.mesh.updateMatrixWorld(true);
      A.bone('LeftUpLeg').getWorldPosition(_H); A.bone('RightUpLeg').getWorldPosition(_H2);
      _H.add(_H2).multiplyScalar(0.5);
      J.mesh.worldToLocal(_H);
    } else _H.set(0, 0.95, 0);
    // (le groupe du joueur est mis à l'échelle de sa taille : un point local se multiplie par cette échelle)
    _P.copy(_H).multiply(J.mesh.scale).applyQuaternion(D.qCorps); _P.subVectors(D.hanche, _P);
    _Q.copy(J.mesh.quaternion); _S.copy(J.mesh.position);
    J.mesh.position.lerpVectors(_S, _P, e);
    J.mesh.quaternion.slerpQuaternions(_Q, D.qCorps, e);
    J.mesh.updateMatrixWorld(true);
    if (!A || !A.aJambe('Left')) return;
    for (const cote of ['Left', 'Right']) {
      const p = D.pieds[cote];
      A.ikJambe(cote, p.cheville, p.orteil, p.genou, e);
    }
    for (const cote of ['Left', 'Right']) {
      const m = D.mains[cote];
      if (!m.ok || !A.aMains(cote)) continue;
      A.ikBras(cote, m.poignet, m.doigts, m.paume, m.coude, e);
      A.plierDoigts(cote, [0.75, 1.1, 0.85], e);
    }
    // la tête regarde où l'on va (le skateur est de côté)
    if (D.teteLacet) {
      A._set('Neck', 0, 0, D.teteLacet * 0.45 * e);
      A._set('Head', J.cur.headX, 0, D.teteLacet * 0.55 * e);
    }
  }

  // Le texte d'aide à l'écran (clavier, manette, tactile) : fourni par chaque engin.
  aide() { return ''; }
}

// La pose visée du cavalier, en coordonnées MONDE (remplie par poseDebout) : orientation du corps, milieu des hanches,
// bascule et rotation du bassin, et pour chaque pied (cheville, orteil, genou) et chaque main (poignet, doigts, paume,
// coude ; `ok` faux = la main reste où la pose de base la met).
function poseVide() {
  const v = () => new THREE.Vector3();
  const pied = () => ({ cheville: v(), orteil: v(), genou: v() });
  const main = () => ({ ok: false, poignet: v(), doigts: v(), paume: v(), coude: v() });
  return { qCorps: new THREE.Quaternion(), hanche: v(), bassin: 0, bassinLacet: 0, teteLacet: 0,
    pieds: { Left: pied(), Right: pied() }, mains: { Left: main(), Right: main() } };
}
const _H = new THREE.Vector3(), _H2 = new THREE.Vector3(), _P = new THREE.Vector3(), _S = new THREE.Vector3();
const _Q = new THREE.Quaternion();

// ======================================================================== OUTILS COMMUNS DES MODÈLES
// Un pied posé : la cheville à 8 cm au-dessus du point d'appui `sol` (un peu en arrière de son milieu), les orteils
// vers `dir` (horizontal), le genou vers `genou`. `haut` : la verticale du plateau sous le pied.
export function poserPied(p, sol, dir, haut, versGenou) {
  p.cheville.copy(sol).addScaledVector(haut, 0.08).addScaledVector(dir, -0.035);
  p.orteil.copy(p.cheville).addScaledVector(dir, 0.15).addScaledVector(haut, -0.06);
  p.genou.copy(versGenou);
}

// On accumule les géométries par matériau puis on les FOND (même idée que js/velo.js) : un engin de cent pièces doit
// coûter quelques appels de dessin.
export class Lots {
  constructor() { this.m = new Map(); }
  add(mat, geo) { if (!this.m.has(mat)) this.m.set(mat, []); this.m.get(mat).push(geo); return geo; }
  poser(groupe, ombre = true) {
    for (const [mat, geos] of this.m) {
      const mesh = new THREE.Mesh(fondreGeos(geos), mat);
      mesh.castShadow = ombre; mesh.receiveShadow = true;
      groupe.add(mesh);
    }
    this.m.clear();
  }
  // (relecture C4) Les géométries fondues, rangées par NOM de matière (les clés de `m`, les matières de l'engin) : de
  // quoi les reposer sur un autre engin, à ses matières à lui (voir poserPiece).
  fondre(m) {
    const noms = new Map(Object.entries(m).map(([nom, mat]) => [mat, nom]));
    const out = [];
    for (const [mat, geos] of this.m) out.push([noms.get(mat), fondreGeos(geos)]);
    this.m.clear();
    return out;
  }
}
function fondreGeos(geos) {
  return geos.length === 1 ? (geos[0].index ? geos[0].toNonIndexed() : geos[0])
    : mergeGeometries(geos.map((x) => { const y = x.index ? x.toNonIndexed() : x; if (!y.attributes.uv) y.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(y.attributes.position.count * 2), 2)); return y; }), false);
}

// LES PIÈCES EN RÉSERVE (relecture du lot C4). La géométrie fondue d'une pièce — un plateau, une roue, une planche et
// ses trucks — est la même d'un engin à l'autre : seules les matières changent (la peinture de chacun). On ne la calcule
// donc qu'UNE fois ; chaque engin pose ensuite ses maillages sur ces géométries PARTAGÉES, à ses matières. Sans cela,
// une trottinette se construisait en 14 à 40 ms et un skate en 8 à 13 ms — dans le gestionnaire d'un paquet réseau
// (un cavalier distant qui arrive, Player.appliquerAnim) ou à la touche « sortir du sac », c'était une image figée ;
// désormais, la deuxième coûte moins d'une milliseconde. (Personne ne modifie ces géométries : la trottinette garée
// fondue en COPIE les attributs, voir Trottinette._cuire.)
// `cle` : le nom de la pièce ; `m` : les matières de l'engin, par nom ; `construire(L)` remplit les lots, la première
// fois seulement. Rend `groupe`, où les maillages sont posés.
const PIECES = new Map();
export function poserPiece(cle, m, groupe, construire, ombre = true) {
  let P = PIECES.get(cle);
  if (!P) {
    const L = new Lots();
    construire(L);
    PIECES.set(cle, P = L.fondre(m));
  }
  for (const [nom, geo] of P) {
    const mesh = new THREE.Mesh(geo, m[nom]);
    mesh.castShadow = ombre; mesh.receiveShadow = true;
    groupe.add(mesh);
  }
  return groupe;
}
const _Y = new THREE.Vector3(0, 1, 0), _qT = new THREE.Quaternion();
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// Tube droit de a à b (rayon r1 en a, r2 en b).
export function tube(a, b, r1, r2 = r1, seg = 10) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r2, r1, L, seg, 1, false);
  _qT.setFromUnitVectors(_Y, d.normalize());
  g.applyQuaternion(_qT);
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}
export function boule(p, r, seg = 10) { const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg - 3)); g.translate(p.x, p.y, p.z); return g; }
// Une roue pleine (bandage de polyuréthane) d'axe x : profil tourné, flancs arrondis. `r` rayon, `l` largeur.
export function bandage(r, l, seg = 24) {
  const pts = [], n = 6;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + Math.PI * (i / n);
    pts.push(new THREE.Vector2(r - l * 0.28 + Math.cos(a) * l * 0.28, Math.sin(a) * l * 0.5));
  }
  pts.unshift(new THREE.Vector2(r * 0.55, -l * 0.5)); pts.push(new THREE.Vector2(r * 0.55, l * 0.5));
  const g = new THREE.LatheGeometry(pts, seg);
  g.rotateZ(Math.PI / 2);            // l'axe de révolution (y) devient l'axe x
  return g;
}
// CE QUI A ARRÊTÉ L'ENGIN, en mots (Game.signalerBlocageVelo) : `bl` = Monture.blocage, complété par conduire (le sol
// devant, le nom de l'engin). Rend { titre, raison }.
const NOMS_SOL = { [SURFACE.GRAVIER]: 'le gravier', [SURFACE.HERBE]: 'l\'herbe', [SURFACE.SOUS_BOIS]: 'le sous-bois',
  [SURFACE.COPEAUX]: 'les copeaux', [SURFACE.SABLE]: 'le sable', [SURFACE.STABILISE]: 'le stabilisé', [SURFACE.TERRE_BATTUE]: 'la terre battue' };
export function raisonBlocage(bl) {
  const C = GENRES[bl.engin], P = C ? C.PARAMS : null, skate = bl.engin === 'skate';
  const titre = skate ? 'DESCENDS DU SKATE' : 'DESCENDS DE LA TROTTINETTE';
  const a = skate ? 'en skate' : 'à trottinette', pour = skate ? 'pour le skate' : 'pour la trottinette';
  const nomSol = NOMS_SOL[bl.sol];
  let raison;
  if (bl.type === 'escalier') raison = `un escalier ne se prend pas ${a}`;
  else if (bl.type === 'mur') raison = skate ? 'une marche arrête les petites roues du skate' : 'marche trop haute pour la trottinette';
  else if (bl.type === 'eau') raison = `pas d'eau ${a}`;
  else if (P && P.interdits && P.interdits.has(bl.sol)) raison = `${skate ? 'le skate' : 'la trottinette'} ne roule pas sur ${nomSol || 'ce sol'}`;
  else if (bl.raide && P && P.grossier && P.grossier.has(bl.sol)) raison = `${nomSol || 'le gravier'} : plus de 10 %, trop raide ${pour}`;
  else raison = bl.raide ? `trop raide ${pour}` : `pas un chemin ${pour}`;
  return { titre, raison };
}

// La couleur d'une donnée ('#rrggbb' ou nombre), avec un repli.
export function couleurDe(c, repli) {
  const n = typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c;
  return Number.isFinite(n) ? n : repli;
}
