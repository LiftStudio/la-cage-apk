// LE DRIBBLE EN COURSE — façon NBA 2K.
//
// Haythem voulait « de vraies animations de dribble, comme dans 2K ». L'ancien dribble en course posait le bras
// avec des angles fixes et faisait COURIR le ballon après la main : la main était en retard (le lissage de la
// pose lui retirait 35 à 45 % de son amplitude), et la balle, lancée sur une parabole à l'envers, touchait le sol
// à vitesse nulle — elle flottait. Ce module renverse les rôles :
//
//   1. LE BALLON MÈNE. Sa trajectoire est de la vraie balistique : poussée vers le bas, gravité, rebond qui rend
//      78 % de la vitesse (restitution d'un ballon sur l'enrobé), frottement du sol à l'impact. La MAIN est posée
//      dessus par cinématique inverse pendant le contact : elle le cueille en haut, amortit, le raccompagne vers
//      le bas et le relâche d'un coup de poignet. Entre deux contacts elle suit une trajectoire qui arrive
//      EXACTEMENT sur le ballon au moment de la reprise. Et sur l'image affichée, le ballon est recalculé depuis
//      la paume réelle : main et ballon sont ensemble par construction, pas par chance.
//   2. LE RYTHME SUIT LES PIEDS. Chaque rebond tombe sur un appui du pied opposé à la main de dribble (celui que
//      les entraîneurs apprennent), mesuré sur chaque clip de course au chargement. Deux décisions par rebond
//      suffisent : à la reprise, la vitesse de poussée qui fait tomber l'impact pile sur le prochain appui ; à
//      l'impact, la manière de cueillir le rebond (en montée, au sommet ou en descente) qui tombe sur l'appui
//      suivant. Tout le reste est de la physique exacte.
//   3. LE CORPS JOUE. Buste un peu fléchi et tourné, épaule qui plonge avec la poussée, bras libre en garde, et
//      bras-barrière quand un défenseur colle.
//
// Le module ne prend le ballon QUE pendant la locomotion (marche, course, sprint), plus une demi-seconde pour
// s'arrêter. Tout le reste — dribble sur place, gestes de mocap, tirs, passes — garde l'ancien chemin, intact.
// Rien de nouveau ne passe par le réseau : chaque client calcule ce dribble localement pour tous les joueurs.
//
// REPÈRE G : origine au sol sous le joueur, lacet du joueur, SANS inclinaison ni échelle ; +x = sa GAUCHE,
// +z = devant, y = hauteur absolue (le sol est à y = rayon du ballon pour le centre du ballon).
import * as THREE from 'three';
import { BALL_R, G, DRIBBLE as K } from './config.js';
import { GESTES } from './gestes.js';

const R = BALL_R;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lisse = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const frac = (x) => x - Math.floor(x);
const wrap05 = (x) => x - Math.floor(x + 0.5);          // vers [-0,5 ; 0,5)
const COTE = { R: 'Right', L: 'Left' };
const PASSES_UN = [false, true], PASSES_DEUX = [true];   // pied prévu seul, puis l'un ou l'autre
const COTES = ['Left', 'Right'];
const DOIGTS_BALLE = [0.22, 0.28, 0.18], DOIGTS_GARDE = [0.30, 0.25, 0.15], DOIGTS_REPOS = [0, 0, 0];
// courbe d'un geste sur ses quatre instants [lancement, lâcher, impact, reprise], segment i, avancement f
const courbe = (a, i, f) => (a ? a[i] + (a[i + 1] - a[i]) * f : 0);
// une cubique d'Hermite (position en s ∈ [0, 1] sur une durée T)
const herm = (s, T, p0, v0, p1, v1) => {
  const s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * T * v0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * T * v1;
};
// sa dérivée (vitesse, par seconde)
const dherm = (s, T, p0, v0, p1, v1) => {
  const s2 = s * s;
  return ((6 * s2 - 6 * s) * p0 + (3 * s2 - 4 * s + 1) * T * v0 + (-6 * s2 + 6 * s) * p1 + (3 * s2 - 2 * s) * T * v1) / T;
};

// zones de travail (aucune allocation pendant le jeu)
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
const _e = new THREE.Vector3(), _f = new THREE.Vector3(), _n = new THREE.Vector3(), _w = new THREE.Vector3();
const _p = new THREE.Vector3(), _q = new THREE.Vector3(), _u = new THREE.Vector3(), _v = new THREE.Vector3();
const _W = new THREE.Vector3(), _fW = new THREE.Vector3(), _nW = new THREE.Vector3(), _pole = new THREE.Vector3();
const _og1 = new THREE.Vector3(), _og2 = new THREE.Vector3();
const _M1 = new THREE.Vector3();
const _pied = { Left: new THREE.Vector3(), Right: new THREE.Vector3() }, _orteil = { Left: new THREE.Vector3(), Right: new THREE.Vector3() };

// ============================================================================ l'ancien chemin, redressé
// Vol d'un ballon lâché à H1 au-dessus du sol, repris à H2 au-dessus du sol, en TF secondes : on cherche la part
// du temps passée à descendre pour que le rebond rende exactement E de la vitesse d'impact. Avant, les vols
// étaient deux paraboles tête en bas (y = R + H·w²) : la balle arrivait au sol à vitesse NULLE et en repartait
// à vitesse nulle. C'est ce qui la faisait flotter.
export function volSur(TF, H1, H2, out) {
  H1 = Math.max(0.01, H1); H2 = Math.max(0.01, H2); TF = Math.max(0.12, TF);
  const e = (s) => { const t1 = s * TF, t2 = TF - t1; return (H2 / t2 + 0.5 * G * t2) / (H1 / t1 + 0.5 * G * t1); };
  let lo = 0.25, hi = 0.70, s;
  if (e(lo) >= K.E) s = lo; else if (e(hi) <= K.E) s = hi;
  else { for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (e(m) < K.E) lo = m; else hi = m; } s = (lo + hi) / 2; }
  const t1 = s * TF, t2 = TF - t1;
  let v0 = H1 / t1 - 0.5 * G * t1, gEff = G;
  if (v0 < 0.3) { v0 = 0.3; gEff = 2 * (H1 - 0.3 * t1) / (t1 * t1); }
  out.t1 = t1; out.TF = TF; out.H1 = H1; out.v0 = v0; out.gEff = gEff; out.vb = H2 / t2 + 0.5 * G * t2;
  return out;
}
export function volY(o, tau) {
  if (tau < o.t1) return R + o.H1 - o.v0 * tau - 0.5 * o.gEff * tau * tau;
  const t = tau - o.t1; return R + o.vb * t - 0.5 * G * t * t;
}

// ============================================================================ la poussée (décision A)
// État vertical de la balle à la reprise (hauteur y0, vitesse w0 > 0 vers le haut). Si elle monte, la main
// l'amortit (décélération A1) jusqu'à l'arrêt en y1 ; puis elle peut la garder un instant (tw), puis la pousse
// vers le bas d'une accélération constante jusqu'à la vitesse de lâcher v, en yRe ; puis chute libre jusqu'au
// sol. F(v) = temps total jusqu'à l'impact, strictement décroissant en v : on le résout par dichotomie.
function prepA(P, y0, w0, g, amortir = false) {
  P.y0 = y0; P.w0 = w0; P.amorti = false;
  if (w0 > 0) {
    P.A1 = clamp(w0 * w0 / (2 * Math.max(0.01, g.yTop - y0)), K.A_ABS, K.A_ABS_MAX);
    P.t1 = w0 / P.A1; P.y1 = y0 + w0 * w0 / (2 * P.A1); P.u0 = 0;
  } else if (amortir && w0 * w0 / (2 * Math.max(0.01, y0 - ((g.yAmorti || g.yR) + 0.05))) <= K.A_ABS_MAX) {
    // balle cueillie en DESCENTE mais qu'on a le temps de garder : la main l'amortit vers le bas, la tient
    // un instant, puis la repousse. Seulement si la main peut l'arrêter avant le bas de sa portée : freinée
    // au plus fort, une balle rapide descendait 20 cm plus bas que la main ne peut aller (la « colle »
    // la faisait alors sauter dans la paume) — on la laisse filer au sol, c'est un dribble.
    P.A1 = clamp(w0 * w0 / (2 * Math.max(0.01, y0 - ((g.yAmorti || g.yR) + 0.05))), K.A_ABS, K.A_ABS_MAX);
    P.t1 = -w0 / P.A1; P.y1 = y0 - w0 * w0 / (2 * P.A1); P.u0 = 0; P.amorti = true;
  } else { P.A1 = 0; P.t1 = 0; P.y1 = y0; P.u0 = -w0; }
  P.yRe = Math.min(g.yR, P.y1 - 0.04);
  const d = P.y1 - P.yRe;
  P.vLo = Math.max(K.VR_MIN, Math.sqrt(P.u0 * P.u0 + 2 * G * d) + 0.1,
    // le rebond doit remonter au moins à portée de main (6 cm au-dessus du plus bas de la reprise), pas
    // seulement au-dessus du point de lâcher : sinon, après une reprise basse, la balle ne revenait plus
    // (et, pour un geste, jusqu'à sa fenêtre de reprise : yReprise — l'hésitation doit monter haut)
    Math.sqrt(Math.max(0, 2 * G * (Math.max(P.yRe, g.yR, g.yReprise || 0) + 0.06 - R) / (K.E * K.E) - 2 * G * (P.yRe - R))));
  P.vHi = Math.max(P.vLo, Math.min(K.VR_MAX, Math.sqrt(Math.max(0, 2 * G * (g.yApexMax - R) / (K.E * K.E) - 2 * G * (P.yRe - R)))));
  return P;
}
function tempsA(P, v) {
  const t3 = 2 * (P.y1 - P.yRe) / (P.u0 + v);
  const vi = Math.sqrt(Math.max(0, v * v + 2 * G * (P.yRe - R)));
  return P.t1 + t3 + (vi - v) / G;
}
// v tel que tempsA(P, v) = T, borné à [vLo, vHi]
function inverseA(P, T) {
  if (T >= tempsA(P, P.vLo)) return P.vLo;
  if (T <= tempsA(P, P.vHi)) return P.vHi;
  let lo = P.vLo, hi = P.vHi;
  for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (tempsA(P, m) > T) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
const _P2 = {};
// fenêtre de temps atteignable jusqu'à l'impact : [poussée la plus forte, poussée la plus douce + garde]
function fenetreA(P, g, twMax = K.TW_MAX, twMin = 0) {
  const lo = tempsA(P, P.vHi);
  if (P.w0 >= 0 || !g) return [lo + twMin, tempsA(P, P.vLo) + twMax];     // (la garde minimale d'un geste compte)
  prepA(_P2, P.y0, P.w0, g, true);
  return [lo, Math.max(tempsA(P, P.vLo), tempsA(_P2, _P2.vLo) + (_P2.amorti ? twMax : 0))];
}
// Résout la poussée : l'impact doit tomber dans Tav secondes. Parmi les couples (vitesse, garde) qui y
// parviennent, on prend la vitesse la plus proche de vDes : c'est elle qui donnera au rebond la hauteur
// qu'il faut pour la foulée SUIVANTE (sans ce regard en avant, le rythme ne se stabilisait jamais).
// (twMin, twMax : bornes de la garde — un geste peut exiger que la main tienne la balle un instant)
function resoudreA(P, Tav, g, vDes = 0, twMin = 0, twMax = K.TW_MAX) {
  if (P.w0 < 0 && g && Tav > tempsA(P, P.vLo)) prepA(P, P.y0, P.w0, g, true);
  const garde = P.w0 >= 0 || P.amorti;
  const vA = inverseA(P, Tav - (garde ? twMin : 0)), vB = garde ? inverseA(P, Tav - twMax) : vA;
  let v = vDes > 0 ? clamp(vDes, Math.min(vA, vB), Math.max(vA, vB)) : vA;
  let tw = garde ? clamp(Tav - tempsA(P, v), twMin, twMax) : 0;
  const t3 = 2 * (P.y1 - P.yRe) / (P.u0 + v);
  if (garde && P.t1 + tw + t3 < K.HOLD_MIN) tw += K.HOLD_MIN - (P.t1 + tw + t3);
  P.vR = v; P.tw = tw; P.t3 = t3;
  P.vi = Math.sqrt(Math.max(0, v * v + 2 * G * (P.yRe - R))); P.taud = Math.max(0, (P.vi - v) / G);
  P.a3 = (v * v - P.u0 * P.u0) / (2 * Math.max(1e-3, P.y1 - P.yRe));
  P.lockErr = Tav - (P.t1 + tw + t3 + P.taud);
  return P;
}

// ============================================================================ le module
export class Dribble {
  constructor(p) {
    this.p = p;
    this.ok = false; this.panne = 0;
    this.cal = { Left: { len: 0, af: 0, an: 0, ac: 0 }, Right: { len: 0, af: 0, an: 0, ac: 0 } };
    this.possede = false; this.attente = null; this.arretT = 0; this.mode = 'normal';
    this.seg = 'main'; this.main = 'R'; this.sgn = -1;
    // horloges : lam = foulées (non repliées), theta = temps du rebond en cours (s)
    this.lam = 0; this.lastLoco = 0; this.cad = 1 / 0.65; this.cadPlan = 1 / 0.65; this.ecart = 0; this.dLam = 0;
    this.deuxPieds = false; this.vM = 0; this.aL = 0.05; this.aR = 0.55;
    this.theta = 0; this.th1 = 0; this.th2 = 0; this.thRel = 0; this.thImp = 0; this.thCat = 0; this.lamNext = 0; this.lamImp = 0;
    // contact et vol
    this.A = {}; this.B = {};                      // décision A en cours, essais de la décision B
    this._choix = { l: 0, e: 0, y: 0, w: 0, tau: 0, nom: '' };
    this.hx = { x0: 0, z0: 0, vx0: 0, vz0: 0, x1: 0, z1: 0, vx1: 0, vz1: 0, T: 0.1, tv: 0, xv: 0, zv: 0 };
    this.vi = 0; this.vb = 0;
    // vol, dans le repère du joueur : point du lâcher et point du rebond au sol
    this.rel = { x: 0, z: 0 }; this.imp = { x: 0, z: 0 };
    this.catchY = 0.95; this.catchW = 0; this.catchMain = 'R';
    this.allure = 'course'; this.geo = this._geo(); this.geoC = this._geo();
    // mains : poids d'IK, cible et vitesse de la main libre de la balle (repère G)
    this.kD = { Left: 0, Right: 0 }; this.kCible = { Left: 0, Right: 0 }; this.kVit = { Left: 1 / K.K_OUT, Right: 1 / K.K_OUT };
    this.wP = { Left: new THREE.Vector3(), Right: new THREE.Vector3() };
    this.wV = { Left: new THREE.Vector3(), Right: new THREE.Vector3() };
    this.wV0 = new THREE.Vector3();
    this.tW = { Left: new THREE.Vector3(), Right: new THREE.Vector3() };     // cible du poignet (G)
    this.tF = { Left: new THREE.Vector3(0, 0, 1), Right: new THREE.Vector3(0, 0, 1) };
    this.tN = { Left: new THREE.Vector3(0, -1, 0), Right: new THREE.Vector3(0, -1, 0) };
    this.libre = { Left: false, Right: false };     // la main suit sa propre trajectoire (vol)
    this.adopT = 1; this.memMain = { W: new THREE.Vector3(), f: new THREE.Vector3(), n: new THREE.Vector3(), cote: 'Right', ok: false };
    this.adopW = new THREE.Vector3(); this.adopF = new THREE.Vector3(); this.adopN = new THREE.Vector3();
    this.kBar = 0; this.qD = 0; this.q = 0; this.beta = -0.1;
    this.kSP = 0; this.nSurPlace = 0;              // posture de dribble à l'arrêt (0..1), rebonds depuis l'arrêt
    this.og = new THREE.Vector3(); this.ogC = new THREE.Vector3();   // colle : décalage balle prévue -> paume (G)
    // remontée du rebond : point de reprise visé et vitesse horizontale de sortie du rebond (G)
    this.poche = { x: 0, z: 0 }; this.vo = { x: 0, z: 0 };
    // côté de la balle et flexion LISSÉS (le buste et les pieds ne sautent plus au changement de main)
    this.sgnL = -1; this.Fl = 0.07; this.tSurPlace = K.T_SUR_PLACE;
    // bras libre : poids de garde par bras (lissés) et dernière cible de garde (G), pour le relais des mains
    this.kG = { Left: 0, Right: 0 }; this.gardeW = { Left: new THREE.Vector3(), Right: new THREE.Vector3() };
    this.gardeOk = { Left: false, Right: false };
    // geste en rythme : `croise` dit qu'un geste est demandé / en cours et quelle main reprend la balle
    // (vers = de pour un geste sans changement de main) ; `geste` porte sa définition et son étape ; `E` les
    // points résolus de l'étape en cours (repère G)
    this.croise = { attente: false, moveVu: -1, de: 'R', vers: 'L', actif: false, type: 'cross', suivant: null };
    this.geste = { def: null, etapes: null, et: null, etape: 0, suite: false, sgn0: -1, t: 0, env: 0, apresT: 0, apresK: 1 };
    this.E = { actif: false, relX: 0, relZ: 0, relY: 0.8, viaT: 0, viaX: 0, viaZ: 0, impX: 0, impZ: 0, pocheX: 0, pocheZ: 0, pocheOk: false,
      catchMin: 0.8, catchMax: 0.95, twMin: 0, twMax: 0.08, vDes: 0, pied: 'libre' };
    this.bl = new THREE.Vector3(); this.bw = new THREE.Vector3(); this.bwPrec = new THREE.Vector3();
    this.der = new THREE.Vector3(); this.prec = new THREE.Vector3(); this.derOk = 0;
    this.impact = 0; this.pret = null; this.contact = false;
    this.stats = { impacts: [], glue: [], sorties: {}, faible: 0, lockErr: [] };
  }

  get controle() { return this.possede || this.attente !== null; }
  get actifBras() { return this.controle || this.kD.Left > 0.001 || this.kD.Right > 0.001 || this.kBar > 0.001; }

  reinit() { this.ok = false; if (this.possede) this.rendre('avatar'); this.kD.Left = this.kD.Right = 0; this.kBar = 0; }

  _geo() { return { lat: 0.28, zC: 0.32, zR: 0.40, u: 0.35, stroke: 0.15, flex: 0.07, yR: 0.85, yTop: 1.0, yCat: 0.97, yApexMax: 1.35, s: 1, Sx: 0, Sy: 1.4, Sz: 0, dLat: 0 }; }

  // ---------------------------------------------------------------- repère G du joueur (pose du PAS)
  // (hauteur : comptée depuis le SOL sous le joueur, p.pos.y, js/monde.js — 0 sur un terrain plat, où ces
  // conversions sont exactement celles d'avant ; sur le relief du parc entier, le rebond se fait sur SON sol)
  versMonde(l, out) {
    const p = this.p, c = Math.cos(p.ang), s = Math.sin(p.ang);
    return out.set(p.pos.x + c * l.x + s * l.z, l.y + p.pos.y, p.pos.z - s * l.x + c * l.z);
  }
  versLocal(w, out) {
    const p = this.p, c = Math.cos(p.ang), s = Math.sin(p.ang), dx = w.x - p.pos.x, dz = w.z - p.pos.z;
    return out.set(c * dx - s * dz, w.y - p.pos.y, s * dx + c * dz);
  }
  dirMonde(l, out) { const a = this.p.ang, c = Math.cos(a), s = Math.sin(a); return out.set(c * l.x + s * l.z, l.y, -s * l.x + c * l.z); }
  dirLocal(w, out) { const a = this.p.ang, c = Math.cos(a), s = Math.sin(a); return out.set(c * w.x - s * w.z, w.y, s * w.x + c * w.z); }

  // ---------------------------------------------------------------- calibration de la main (au chargement)
  // Où est le centre de la paume par rapport au poignet, dans le repère de la main (doigts f, normale de paume
  // n, et leur produit) : c'est ce qui permet de poser la PAUME sur le ballon et pas le poignet.
  calibrer(A) {
    this.ok = false;
    if (!A || !A.ok) return;
    let bon = true;
    for (const cote of ['Left', 'Right']) {
      const c = this.cal[cote];
      if (!A.aMains(cote)) { bon = false; continue; }
      const B = A.bones;
      c.len = B[cote + 'Arm'].getWorldPosition(_a).distanceTo(B[cote + 'ForeArm'].getWorldPosition(_b))
        + B[cote + 'ForeArm'].getWorldPosition(_a).distanceTo(B[cote + 'Hand'].getWorldPosition(_b));
      A.repereMain(cote, _W, _f, _n);
      B[cote + 'HandMiddle1'].getWorldPosition(_M1);
      _p.copy(_W).addScaledVector(_c.subVectors(_M1, _W), 0.55).addScaledVector(_n, 0.012);
      _d.subVectors(_p, _W); _e.crossVectors(_f, _n);
      c.af = _d.dot(_f); c.an = _d.dot(_n); c.ac = _d.dot(_e);
      if (!(c.len > 0.35 && c.len < 0.85 && c.af > 0.03 && c.af < 0.14)) bon = false;
    }
    const anim = this.p.anim;
    const loco = anim && Object.values(anim.defs).some((d) => d.loco);
    this.ok = bon && !!loco;
    if (!this.ok) console.info('[dribble] calibration refusée pour', this.p.def && this.p.def.name, this.cal);
  }

  // ---------------------------------------------------------------- appuis des pieds sur chaque clip de course
  // Chaque clip de locomotion est joué seul, échantillonné à 48 phases, et l'on repère l'instant où chaque pied
  // se pose (hauteur qui repasse sous le quart de son amplitude en descendant). Phase 0 = cuisse gauche en avant
  // dans TOUS les clips (voir anim.js), donc les appuis sont comparables d'un clip à l'autre.
  static mesurerAppuis(p) {
    const A = p.anim, rig = p.avatar;
    if (!A || !rig) return;
    const B = rig.bones, m = p.mesh;
    if (!B.LeftFoot || !B.RightFoot) return;
    const rot = { x: m.rotation.x, y: m.rotation.y, z: m.rotation.z };
    m.rotation.set(0, p.ang || 0, 0);
    const N = 48, hL = new Float32Array(N), hR = new Float32Array(N);
    const haut = (nom, nomT) => {
      const y1 = B[nom].getWorldPosition(_a).y, y2 = B[nomT] ? B[nomT].getWorldPosition(_b).y : y1;
      return Math.min(y1, y2) - m.position.y;
    };
    const plante = (h) => {
      let mn = Infinity, mx = -Infinity, iMax = 0;
      for (let i = 0; i < N; i++) { if (h[i] < mn) mn = h[i]; if (h[i] > mx) { mx = h[i]; iMax = i; } }
      if (mx - mn < 0.04) return null;
      const thr = mn + 0.25 * (mx - mn);
      for (let k = 1; k <= N; k++) {
        const i = (iMax + k) % N, j = (i - 1 + N) % N;
        if (h[i] <= thr && h[j] > thr) return i / N;
      }
      return null;
    };
    // LA VITESSE AU SOL DU CLIP (06/10/2026). Un clip « sur place » avance quand même : pendant l'appui, le pied
    // posé recule sous le corps exactement à la vitesse où le corps avancerait. On la relève sur l'avatar (vitesse
    // horizontale médiane du pied le plus bas, quand il est à moins de 2 cm du sol) et on la compare à `speedRef`,
    // la vitesse déclarée à la main dans le manifeste : c'est elle qui cale la cadence de la foulée sur le sol.
    // Mesure validée sur les marches CMU (2,24 / 1,34 / 1,39 m/s pour 2,15 / 1,31 / 1,37 déclarés) et la course
    // (5,07 pour 5,2) ; elle trouvait en revanche 3,3 au petit trot (4,5 déclarés), 5,3 au sprint (6,5), 2,2 à 2,6
    // aux pas chassés (3,5) et 1,5 au recul (2,6) : à leur vitesse nominale ces clips patinaient d'un mètre par
    // seconde. Écart de plus de 12 % = valeur fausse pour CET avatar : on prend la mesure.
    const xL = new Float32Array(N), zL = new Float32Array(N), xR = new Float32Array(N), zR = new Float32Array(N);
    const pied = (nom, i, X, Z) => { (B[nom + 'ToeBase'] || B[nom + 'Foot']).getWorldPosition(_a); X[i] = _a.x - m.position.x; Z[i] = _a.z - m.position.z; };
    for (const [nom, d] of Object.entries(A.defs)) {
      if (!d.loco) continue;
      const a = A.actions[nom]; if (!a) continue;
      const dur = a.getClip().duration || 1;
      A.mixer.stopAllAction(); a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); a.paused = true;
      for (let i = 0; i < N; i++) {
        a.time = ((((i / N) + (d.phase0 || 0)) % 1 + 1) % 1) * dur;
        A.mixer.update(0); m.updateMatrixWorld(true);
        hL[i] = haut('LeftFoot', 'LeftToeBase'); hR[i] = haut('RightFoot', 'RightToeBase');
        pied('Left', i, xL, zL); pied('Right', i, xR, zR);
      }
      const pl = plante(hL), pr = plante(hR);
      const ok = pl !== null && pr !== null && Math.abs(Math.abs(wrap05(pr - pl)) - 0.5) <= 0.12;
      d.appuiL = ok ? pl : 0.05; d.appuiR = ok ? pr : 0.55; d.appuiOk = ok;
      const vs = [], dtp = dur / N;
      for (const [h, X, Z] of [[hL, xL, zL], [hR, xR, zR]]) {
        let mn = Infinity; for (let i = 0; i < N; i++) mn = Math.min(mn, h[i]);
        for (let i = 0; i < N; i++) {
          const j = (i + 1) % N;
          if (h[i] < mn + 0.02 && h[j] < mn + 0.02) vs.push(Math.hypot(X[j] - X[i], Z[j] - Z[i]) / dtp);
        }
      }
      vs.sort((x, y) => x - y);
      const vSol = vs.length >= 4 ? vs[vs.length >> 1] : 0;
      d.vSol = vSol;
      let corr = '';
      if (vSol > 0.5 && d.speedRef && Math.abs(vSol / d.speedRef - 1) > 0.12) {
        corr = ` → corrigée (déclarée ${d.speedRef})`;
        d.speedRef = vSol; d.foulee = Math.max(0.2, vSol * dur);
      }
      console.info(`[dribble] appuis ${nom} : gauche ${d.appuiL.toFixed(3)} droite ${d.appuiR.toFixed(3)}${ok ? '' : ' (valeurs par défaut)'} · vitesse au sol ${vSol.toFixed(2)} m/s${corr}`);
    }
    m.rotation.set(rot.x, rot.y, rot.z);
  }

  // appuis du mélange de locomotion courant (moyenne circulaire pondérée par les poids des clips)
  _appuis() {
    const A = this.p.anim; if (!A) return;
    let cL = 0, sL = 0, cR = 0, sR = 0;
    for (const n of Object.keys(A.locoW)) {
      const d = A.defs[n], w = A.locoW[n] || 0; if (!d || d.appuiL === undefined) continue;
      cL += w * Math.cos(d.appuiL * 2 * Math.PI); sL += w * Math.sin(d.appuiL * 2 * Math.PI);
      cR += w * Math.cos(d.appuiR * 2 * Math.PI); sR += w * Math.sin(d.appuiR * 2 * Math.PI);
    }
    if (cL * cL + sL * sL > 1e-6) this.aL = frac(Math.atan2(sL, cL) / (2 * Math.PI));
    if (cR * cR + sR * sR > 1e-6) this.aR = frac(Math.atan2(sR, cR) / (2 * Math.PI));
  }
  // Prochain appui autorisé à partir de lamMin (en foulées). Pied opposé à la main du ballon, ou les deux.
  _candidat(lamMin, deux, main) {
    let best = Infinity;
    const essai = (a) => { const b = a + this.ecart, c = b + Math.ceil(lamMin - b); if (c < best) best = c; };
    if (deux || main === 'R') essai(this.aL);
    if (deux || main === 'L') essai(this.aR);
    return best;
  }

  // ---------------------------------------------------------------- géométrie (à chaque décision)
  // Hauteurs tirées de l'ALLONGE MESURÉE du bras : un lâcher trop bas serait hors de portée sur ces avatars.
  _allure() {
    const p = this.p, M = K.MODES, v = this.vM;
    // À L'ARRÊT : dribble de triple menace, ou protégé si un défenseur colle
    if (!p.locoActif && v < 0.8) { this.allure = 'surPlace'; return p.pression ? M.protege : M.surPlace; }
    let a = this.allure;
    if (a === 'surPlace') a = v > 2.7 ? 'course' : 'marche';
    if (a === 'sprint') { if (!(p.sprintVu > 0) && v < 5.4) a = v > 2.7 ? 'course' : 'marche'; }
    else if (p.sprintVu > 0 || v > 5.9) a = 'sprint';
    else if (a === 'marche' && v > 2.7) a = 'course';
    else if (a === 'course' && v < 2.3) a = 'marche';
    this.allure = a;
    return a === 'sprint' ? M.sprint : null;
  }
  _geoCote(main, out) {
    const p = this.p, A = p.avatar, M = K.MODES, s = p.h / 1.90;
    const cote = COTE[main], sgn = main === 'L' ? 1 : -1;
    const spr = this._allure();
    let lat, zC, zR, u, stroke, flex;
    if (spr) ({ lat, zC, zR, u, stroke, flex } = spr);
    else {
      const k = lisse((this.vM - 2.2) / 0.8), a = M.marche, b = M.course;
      lat = a.lat + (b.lat - a.lat) * k; zC = a.zC + (b.zC - a.zC) * k; zR = a.zR + (b.zR - a.zR) * k;
      u = a.u + (b.u - a.u) * k; stroke = a.stroke + (b.stroke - a.stroke) * k; flex = a.flex + (b.flex - a.flex) * k;
    }
    if (p.pression && this.allure !== 'surPlace') { lat *= 1.12; zC -= 0.10; zR -= 0.10; u *= 0.5; flex += 0.08; }
    if (p.sensLoco && p.sensLoco !== 'av') { u = 0; zC -= 0.05; zR -= 0.05; }
    lat *= s; zC *= s; zR *= s; stroke *= s;
    const dLat = clamp(-0.015 * (p.couches ? p.couches.omega : 0), -0.05, 0.05) * s;
    out.lat = lat; out.zC = zC; out.zR = zR; out.u = u; out.stroke = stroke; out.flex = flex; out.s = s; out.dLat = dLat;
    // épaule du côté du ballon, dans G
    A.bones[cote + 'Arm'].getWorldPosition(_a); this.versLocal(_a, _b);
    // à l'arrêt, la posture (hanches basses, buste penché) descendra l'épaule après coup : on en tient compte
    if (this.allure === 'surPlace') { _b.y -= (K.BAISSE + 0.03) * s; _b.z += 0.10 * s; }
    out.Sx = _b.x; out.Sy = _b.y; out.Sz = _b.z;
    const rho = K.REACH * (this.cal[cote].len || 0.55), hW = R + 0.035 * s;
    const xR = sgn * lat + dLat, dx = xR - _b.x, dz = (zR - 0.03 * s) - _b.z;
    let yR = _b.y - Math.sqrt(Math.max(0.0025, rho * rho - dx * dx - dz * dz)) - hW + 0.02;
    let yTop = Math.min(yR + stroke, _b.y - 0.25 * s - hW);
    if (yTop - yR < 0.06) yR = yTop - 0.06;
    // bornes : l'épaule est lue en direct, et dans une pose tassée elle peut être très basse — une balle
    // lâchée sous son propre rayon donnait une racine carrée de nombre négatif, puis un ballon en NaN
    yR = clamp(yR, R + 0.35, 1.3); yTop = clamp(yTop, yR + 0.06, 1.6);
    // Le rebond ne monte pas plus haut qu'un peu au-dessus de la main : un dribble de course reste à la
    // taille. À 0,35 m au-dessus, la balle remontait à la poitrine et le joueur semblait la bloquer contre lui.
    out.yR = yR; out.yTop = yTop; out.yCat = yTop - 0.03; out.yApexMax = yTop + 0.15 * s;
    return out;
  }

  // ---------------------------------------------------------------- décision A : la poussée
  // `r` = temps déjà écoulé depuis l'instant de la reprise (le pas de simulation ne tombe jamais pile dessus).
  _decisionA(y0, w0, x0, z0, vx0, vz0, cible, r = 0) {
    const Eg = this.E, geste = this.croise.actif && Eg.actif;
    const P = prepA(this.A, y0, w0, this.geo);
    let Tav;
    if (cible === 'plant') {
      // premier appui dont le délai tombe dans la fenêtre atteignable ; si le pied prévu n'en offre aucun,
      // l'autre pied, le temps de se recaler
      const [lo, hi] = fenetreA(P, this.geo, geste ? Eg.twMax : K.TW_MAX, geste ? Eg.twMin : 0);
      let choix = null, choixL = 0, dist = Infinity;
      // pied : un geste peut exiger le rythme normal (entre les jambes : le pied de la nouvelle main devant)
      const libre = this.deuxPieds || (this.croise.actif && (!geste || Eg.pied === 'libre'));
      for (const deux of (libre ? PASSES_DEUX : PASSES_UN)) {
        let lamMin = this.lam + (P.t1 + 0.02) * this.cad;
        for (let k = 0; k < 4; k++) {
          const l = this._candidat(lamMin, deux, this.main), T = (l - this.lam) / this.cad + r;
          const e = T < lo ? lo - T : T > hi ? T - hi : 0;
          if (e < dist) { dist = e; choix = T; choixL = l; }
          if (e === 0) break;
          lamMin = l + 1e-6;
        }
        if (dist === 0) break;
      }
      Tav = choix; this.lamNext = choixL;
    } else Tav = (this.lamNext - this.lam) / this.cad + r;
    // la hauteur de rebond que demandera la foulée suivante : la balle doit revenir à la main en
    // T - 0,22 s (contact et chute ensuite) ; sur la verticale, vb = (X² + c) / 2X avec X = g·tau et
    // c = 2g·(hauteur de reprise - R), la même formule qu'on la cueille en montée ou en descente
    const Tn = (this.deuxPieds ? 0.5 : 1) / Math.max(0.3, this.cad), X = G * Math.max(0.2, Tn - 0.22);
    const cc = 2 * G * (this.geo.yCat - R), vbDes = (X * X + cc) / (2 * X), viDes = vbDes / K.E;
    const vDes = Math.sqrt(Math.max(0, viDes * viDes - 2 * G * (P.yRe - R)));
    resoudreA(P, Tav, this.geo, geste && Eg.vDes > 0 ? Eg.vDes : vDes, geste ? Eg.twMin : 0, geste ? Eg.twMax : K.TW_MAX);
    this.stats.lockErr.push(P.lockErr); if (this.stats.lockErr.length > 128) this.stats.lockErr.shift();
    this.theta = r; this.cadPlan = this.cad;
    this.th1 = P.t1; this.th2 = P.t1 + P.tw; this.thRel = this.th2 + P.t3; this.thImp = this.thRel + P.taud;
    this.vR = P.vR;
    // horizontal : Hermite de la reprise au lâcher
    const g = this.geo, sgn = this.sgn, H = this.hx;
    H.x0 = x0; H.z0 = z0; H.vx0 = clamp(vx0, -3, 3); H.vz0 = clamp(vz0, -3, 3); H.tv = 0;
    if (geste) {
      // GESTE : les points ont été résolus au lancement (_resoudreEtape) ; la main passe par le point de
      // passage s'il y en a un (dans le dos : autour du bassin ; in-and-out : devant le nombril)
      H.x1 = Eg.relX; H.z1 = Eg.relZ; this.imp.x = Eg.impX; this.imp.z = Eg.impZ;
      H.vx1 = (this.imp.x - H.x1) / Math.max(0.05, P.taud); H.vz1 = (this.imp.z - H.z1) / Math.max(0.05, P.taud);
      if (Eg.viaT > 0) { H.tv = Eg.viaT; H.xv = Eg.viaX; H.zv = Eg.viaZ; }
    } else if (this.croise.actif) {
      // crossover en rythme : lâcher devant le corps, rebond de l'autre côté
      H.x1 = sgn * 0.18 * g.s; H.z1 = g.zC; H.vz1 = 0;
      const xF = -sgn * 0.03 * g.s, zF = g.zC + 0.04 * g.s;
      H.vx1 = (xF - H.x1) / Math.max(0.05, P.taud); H.vz1 = (zF - H.z1) / Math.max(0.05, P.taud);
    } else {
      // Le rebond tombe un peu devant et dehors de la poche, d'autant plus loin qu'on va vite : c'est la
      // balle « poussée devant » du dribble de vitesse.
      H.x1 = sgn * g.lat + g.dLat; H.z1 = g.zR;
      const spr = this.allure === 'sprint';
      const dz = clamp(0.05 + 0.03 * this.vM, 0.05, spr ? 0.30 : 0.28) * g.s + g.u * 0.05;
      // ... dans le SENS DU DÉPLACEMENT : en reculant ou en pas chassés, la balle n'est plus poussée devant
      this.dirLocal(this.p.vel, _v); const vn = Math.hypot(_v.x, _v.z);
      const ux = vn > 0.3 ? _v.x / vn : 0, uz = vn > 0.3 ? _v.z / vn : 1;
      this.imp.x = H.x1 + sgn * 0.04 * g.s + clamp(ux * dz, -0.15 * g.s, 0.15 * g.s);
      this.imp.z = g.zR + Math.max(uz * dz, -0.10 * g.s);
      H.vx1 = (this.imp.x - H.x1) / Math.max(0.05, P.taud); H.vz1 = (this.imp.z - H.z1) / Math.max(0.05, P.taud);
    }
    if (this.croise.actif && !geste) { this.imp.x = -sgn * 0.03 * g.s; this.imp.z = g.zC + 0.04 * g.s; }
    H.T = Math.max(0.02, this.thRel);
    this.seg = 'main';
  }
  // vitesse horizontale de la balle sur le tracé de la main (G), à l'instant t du contact
  _hermiteV(t, out) {
    const H = this.hx, T = H.T;
    if (H.tv > 0) {
      const tv = H.tv * T, vxv = (H.x1 - H.x0) / T, vzv = (H.z1 - H.z0) / T;
      if (t <= tv) { const u = clamp(t / tv, 0, 1); out.x = dherm(u, tv, H.x0, H.vx0, H.xv, vxv); out.z = dherm(u, tv, H.z0, H.vz0, H.zv, vzv); }
      else { const T2 = Math.max(1e-3, T - tv), u = clamp((t - tv) / T2, 0, 1); out.x = dherm(u, T2, H.xv, vxv, H.x1, H.vx1); out.z = dherm(u, T2, H.zv, vzv, H.z1, H.vz1); }
      return out;
    }
    const u = clamp(t / T, 0, 1);
    out.x = dherm(u, T, H.x0, H.vx0, H.x1, H.vx1); out.z = dherm(u, T, H.z0, H.vz0, H.z1, H.vz1);
    return out;
  }
  _hermite(t, out) {
    const H = this.hx, T = H.T;
    if (H.tv > 0) {
      // deux cubiques raccordées au point de passage (tangente au passage : la corde du geste)
      const tv = H.tv * T, vxv = (H.x1 - H.x0) / T, vzv = (H.z1 - H.z0) / T;
      if (t <= tv) { const u = clamp(t / tv, 0, 1); out.x = herm(u, tv, H.x0, H.vx0, H.xv, vxv); out.z = herm(u, tv, H.z0, H.vz0, H.zv, vzv); }
      else { const u = clamp((t - tv) / Math.max(1e-3, T - tv), 0, 1), T2 = T - tv; out.x = herm(u, T2, H.xv, vxv, H.x1, H.vx1); out.z = herm(u, T2, H.zv, vzv, H.z1, H.vz1); }
      return out;
    }
    const s = clamp(t / T, 0, 1), s2 = s * s, s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    out.x = h00 * H.x0 + h10 * T * H.vx0 + h01 * H.x1 + h11 * T * H.vx1;
    out.z = h00 * H.z0 + h10 * T * H.vz0 + h01 * H.z1 + h11 * T * H.vz1;
    return out;
  }

  // ---------------------------------------------------------------- décision B : cueillir le rebond
  // Au rebond, la vitesse de sortie est fixée (restitution). Ce qu'on choisit encore, c'est la HAUTEUR où la
  // main cueille la balle, en montée ou en descente : c'est elle qui règle le temps jusqu'à la reprise, donc
  // le temps qu'il restera pour pousser vers l'appui suivant. On essaie les hauteurs de la plus naturelle (en
  // haut, sous l'épaule) à la plus basse, montée d'abord, et le premier appui qui tombe dans la fenêtre de la
  // poussée l'emporte. Rien ne tombe juste : l'autre pied ; toujours rien : le plus proche, et l'on se recale
  // au rebond suivant.
  _decisionB() {
    const vb = this.vb, yA = R + vb * vb / (2 * G), main = this.catchMain;
    const g = this._geoCote(main, this.geoC);
    const Eg = this.E, geste = this.croise.actif && Eg.actif;
    const yHaut = geste ? Eg.catchMax : g.yCat - (this.croise.actif ? 0.06 * g.s : 0), yBas = geste ? Eg.catchMin : g.yR + 0.04;
    const Pt = this.B, C = this._choix, sauve = this.geo;
    // DÉCISION PRESSÉE : un geste attend — on cueille la balle en MONTÉE, au plus tôt, sans se soucier des
    // appuis (le geste replanifiera la poussée). Une reprise en descente sous pression laissait à la main un
    // contact de 15 ms pour enrouler la balle autour du bassin : elle se téléportait.
    if (this.croise.attente && !this.croise.actif) {
      const yC = Math.min(yA - 0.03, Math.max(yBas, R + (vb * vb - K.W_UP_MAX * K.W_UP_MAX) / (2 * G) + 0.01));
      const d2 = vb * vb - 2 * G * (yC - R);
      if (d2 > 0.0025 && yA > yC + 0.005 && yC >= g.yR - 0.08) {
        const wc = Math.sqrt(d2);
        this.lamNext = this._candidat(this.lam + 0.15 * this.cad, true, main); this.catchY = yC; this.catchW = wc;
        this.thCat = this.thImp + (vb - wc) / G; this.cadPlan = this.cad; this.catchNom = 'pressee';
        return;
      }
    }
    this.geo = g; C.l = 0; C.e = Infinity;
    const essayer = (l, Brem, montee, yC) => {
      const d2 = vb * vb - 2 * G * (yC - R);
      if (d2 <= 0.0025 || yA <= yC + 0.005) return false;
      let w = Math.sqrt(d2), tau;
      if (montee) {
        if (w > K.W_UP_MAX || yC + w * w / (2 * K.A_ABS_MAX) > g.yTop + 0.02) return false;
        tau = (vb - w) / G;
      } else { tau = (vb + w) / G; w = -w; }
      if (this.thImp + tau < this.theta + 0.02) return false;       // déjà passé (balle prise en montée)
      prepA(Pt, yC, w, g);
      const [lo, hi] = fenetreA(Pt, g), Tav = Brem - tau;
      const e = Tav < lo ? lo - Tav : Tav > hi ? Tav - hi : 0;
      if (e < C.e) { C.e = e; C.l = l; C.y = yC; C.w = w; C.tau = tau; C.nom = montee ? 'montee' : 'descente'; }
      return e === 0;
    };
    let trouve = false;
    for (const deux of (this.croise.actif || this.deuxPieds ? PASSES_DEUX : PASSES_UN)) {
      let lamMin = this.lam + 0.15 * this.cad;
      for (let k = 0; k < 4 && !trouve; k++) {
        const l = this._candidat(lamMin, deux, main), Brem = (l - this.lam) / this.cad;
        for (let i = 0; i <= 6 && !trouve; i++) {
          const yC = yHaut - (yHaut - yBas) * i / 6;
          trouve = essayer(l, Brem, true, yC) || essayer(l, Brem, false, yC);
        }
        lamMin = l + 1e-6;
      }
      if (trouve) break;
    }
    this.geo = sauve;
    if (C.e === Infinity) {
      // rebond trop faible pour atteindre la main : on la cueille au sommet, et on se recale ensuite
      this.stats.faible++;
      // (pas avant maintenant ; hauteur et vitesse lues sur la trajectoire, pour que la main la trouve où elle est)
      C.l = this._candidat(this.lam + 0.15 * this.cad, true, main);
      C.tau = Math.max(0.05, (vb - 0.31) / G, this.theta - this.thImp + 0.03);
      C.y = Math.max(R + 0.1, R + vb * C.tau - 0.5 * G * C.tau * C.tau); C.w = vb - G * C.tau; C.nom = 'sommet';
    }
    this.lamNext = C.l; this.catchY = C.y; this.catchW = C.w;
    this.thCat = this.thImp + C.tau; this.cadPlan = this.cad;
    this.catchNom = C.nom;
  }

  // ---------------------------------------------------------------- repère de contact de la main (G)
  // Pour une balle de centre B : la paume se pose sur le dessus-arrière-extérieur, doigts vers l'avant, et
  // passe derrière la balle à mesure qu'elle la pousse devant. beta = inclinaison des doigts (coup de poignet).
  _cadre(main, Bx, By, Bz, q, beta, oW, oF, oN) {
    const sgn = main === 'L' ? 1 : -1, cal = this.cal[COTE[main]];
    const gam = 0.10 + 0.30 * q * clamp(this.geo.u / 0.9, 0, 1);
    _c.set(0.12 * sgn, Math.cos(gam), -Math.sin(gam)).normalize();                // centre -> paume
    _f.set(0.20 * sgn, 0, 1); _f.addScaledVector(_c, -_f.dot(_c)).normalize();
    oF.copy(_f).multiplyScalar(Math.cos(beta)).addScaledVector(_c, -Math.sin(beta)).normalize();
    oN.copy(_c).multiplyScalar(-1).addScaledVector(oF, _c.dot(oF)).normalize();   // normale de paume, vers la balle
    _p.set(Bx, By, Bz).addScaledVector(oN, -(R + K.EPS));                         // centre de la paume
    _e.crossVectors(oF, oN);
    oW.copy(_p).addScaledVector(oF, -cal.af).addScaledVector(oN, -cal.an).addScaledVector(_e, -cal.ac);
  }

  // ---------------------------------------------------------------- qui a le ballon (début du pas)
  eligible() {
    const p = this.p;
    return this.ok && this.panne <= 0 && p.hasBall && p.state === 'idle' && !p.airborne && !(p.spinT > 0)
      && !(p.crossT >= 0 && p.moveClip) && !(p.catchT > 0) && !(p.passT > 0) && !(p.pickupT > 0) && !(p.fakeT > 0)
      && !(p.bumpT > 0) && !(p.postT > 0) && !(p.rebondT > 0) && !(p.chuteT > 0) && !(p.dribbleMoveT > 0)
      && !p.emote && !(p.telActif && p.telActif()) && !p.velo && !p.assis && !!p.avatar;
  }
  pre(dt) {
    const p = this.p;
    if (this.panne > 0) this.panne -= dt;
    this.impact = 0;
    const el = this.eligible() && p.constructor.DRIBBLE_V2 !== false;
    if (this.possede && !el) { this.rendre(p.hasBall ? 'etat' : 'perdu'); return; }
    // Sans le ballon, on oublie où il était et la paume qui le tenait : la prise suivante (interception,
    // balle ramassée...) serait partie de la DERNIÈRE possession, parfois à plusieurs mètres — téléportation.
    if (!p.hasBall) { this.derOk = 0; this.memMain.ok = false; }
    // On prend la balle dès que le joueur la tient (à l'arrêt comme en mouvement) — et, en course, AVANT le
    // premier pas : l'ancien dribble la téléportait sous une main posée à la volée.
    const surPlace = p.constructor.DRIBBLE_SUR_PLACE !== false;
    // deux pas tenus par l'ancien chemin d'abord (16 ms) : position, vitesse et paume sont alors celles d'ici
    if (!this.possede && el && this.derOk >= 2 && (surPlace || p.locoActif || p.speedNow > 0.3)) this._adopter(dt);
    if (!this.possede) return;
    // geste en rythme demandé (startMove sans clip de mocap) : n'importe quel geste de js/gestes.js
    // (joueur distant : sur le moveId seul — les gestes lancés par le module n'arment pas crossT)
    const C = this.croise;
    if (!p.moveClip && p.moveId !== C.moveVu && (p.crossT >= 0 || (p.remote && GESTES[p.moveType]))) {
      C.moveVu = p.moveId;
      const type = GESTES[p.moveType] ? p.moveType : 'cross';
      // un geste demandé pendant un autre attend la fin de celui-ci (sinon il réécrivait la main de reprise :
      // faux crossover qui revenait dans la même main, puis crossover de réconciliation)
      if (C.actif || C.attente || this.geste.def) C.suivant = type;
      else { C.attente = true; C.type = type; }
    } else if (!C.attente && !C.actif && !this.geste.def && !C.suivant && p.dribbleHand && p.dribbleHand !== this.main && this.seg === 'main' && this.thRel - this.theta > 0.05) {
      C.attente = true; C.type = 'cross'; C.de = this.main; C.vers = p.dribbleHand;      // main à réconcilier (paquet perdu)
    }
  }

  // Prendre le ballon au vol ou dans la main, SANS téléportation.
  _adopter(dt) {
    const p = this.p;
    // la main de dribble déclarée par le joueur fait foi (le reste du jeu — crossovers, passes, vols — la lit)
    this.main = p.dribbleHand === 'L' ? 'L' : 'R';
    this.sgn = this.main === 'L' ? 1 : -1;
    this.cad = p.locoCad || this.cad; this.lastLoco = p.locoPhase; this.vM = p.speedNow;
    this.ecart = frac(this.lam - p.locoPhase); this._appuis();
    if (!p.locoActif && p.speedNow < 0.3 && p.constructor.DRIBBLE_SUR_PLACE !== false) {
      // prise à l'arrêt : rythme régulier, un « appui » à chaque cycle
      this.mode = 'surPlace'; this.cad = 1 / (p.pression ? K.T_PROTEGE : K.T_SUR_PLACE); this.aL = 0; this.aR = 0; this.ecart = 0;
    }
    this.geo = this._geoCote(this.main, this.geo);
    // position et vitesse du ballon (monde), puis dans G
    _v.copy(this.der).sub(this.prec).divideScalar(Math.max(1e-3, dt)); if (this.derOk < 2) _v.set(0, 0, 0);
    this.bw.copy(this.derOk >= 2 ? this.der : this.p.pos);
    // Balle loin du joueur (remise en jeu après un panier, ballon donné au centre) : l'ancien chemin la
    // ramène par lissage, et la prendre en route la faisait traverser le terrain à 30 m/s. C'est une
    // remise en main : on la pose dans la main, qui avance avec le joueur.
    const loin = Math.hypot(this.bw.x - p.pos.x, this.bw.z - p.pos.z) > 0.9;
    if (loin) _v.set(p.vel.x, 0, p.vel.z);
    if (this.derOk < 2 || loin) { this.p.handWorld(this.main, this.bw); this.bw.y = Math.max(R + p.pos.y, this.bw.y - R - 0.02); }   // (monde : au-dessus du sol du joueur)
    // Vitesse PLAUSIBLE seulement : l'ancien chemin déplace parfois la balle d'un coup (13 cm en un pas au
    // départ en course) et la dérivée en faisait une balle lancée vers le sol à 10 m/s. On borne la vitesse
    // relative au corps : 2,5 m/s à l'horizontale, de -5 à +3,5 m/s à la verticale.
    _u.copy(_v).sub(p.vel); _u.y = 0;
    if (_u.length() > 2.5) { _u.setLength(2.5); _v.x = p.vel.x + _u.x; _v.z = p.vel.z + _u.z; }
    _v.y = clamp(_v.y, -5, 3.5);
    // `der` est la balle du pas PRÉCÉDENT, et le joueur a déjà avancé de ce pas-ci : on la prolonge d'un pas
    // (sinon elle restait en arrière de vitesse × 1/120 — 5 cm en course — à chaque prise de balle)
    if (this.derOk >= 2) { this.bw.addScaledVector(_v, dt); this.bw.y = Math.max(R + p.pos.y, this.bw.y); }
    this.versLocal(this.bw, this.bl);
    _u.copy(_v).sub(p.vel); this.dirLocal(_u, _u);
    // la main (repère de paume retenu au pas précédent) : où serait le ballon qu'elle tient ?
    const M = this.memMain;
    let contact = false;
    if (M.ok && M.cote === COTE[this.main]) {
      const cal = this.cal[M.cote];
      _e.crossVectors(M.f, M.n);
      _p.copy(M.W).addScaledVector(M.f, cal.af).addScaledVector(M.n, cal.an).addScaledVector(_e, cal.ac).addScaledVector(M.n, R + K.EPS);
      contact = _p.distanceTo(this.bl) < 0.15;
    }
    // l'ancien chemin tenait la balle COLLÉE sous la paume (phase de poussée) : c'est une prise en main
    const D = this.p.drib;
    if (this.p._tenue || (D && (D.sched === 'push' || (D.phase === 'push' && !D.sched)))) contact = true;
    this.possede = true; this.mode = 'normal'; this.arretT = 0; this.attente = null;
    this.croise.attente = false; this.croise.actif = false; this.croise.moveVu = p.moveId; this.croise.suivant = null;
    this.geste.def = null; this.geste.et = null; this.geste.suite = false; this.E.actif = false;
    const cote = COTE[this.main];
    this.kD[cote] = 1; this.kD[COTE[this.main === 'R' ? 'L' : 'R']] = 0;
    this.adopT = 0;
    // posture de triple menace : elle ne vaut que pour une prise à l'arrêt (sinon celle d'une possession
    // passée, figée à la sortie, revenait d'un coup sur un joueur qui court : hanches qui plongent)
    if (this.mode !== 'surPlace') this.kSP = 0;
    this.og.set(0, 0, 0); this.ogC.set(0, 0, 0);
    if (M.ok) { this.adopW.copy(M.W); this.adopF.copy(M.f); this.adopN.copy(M.n); }
    else { this.adopW.set(this.sgn * 0.3, 0.9, 0.2); this.adopF.set(0, -0.3, 1).normalize(); this.adopN.set(0, -1, 0); }
    if (contact) {
      // vitesse verticale réelle (déjà bornée plus haut) : la couper à 3 m/s cassait la descente d'une balle
      // poussée ; l'élan latéral, lui, est borné à 1,5 m/s — au-delà la trajectoire de la main sortait de la
      // portée du bras
      this._decisionA(this.bl.y, _u.y, this.bl.x, this.bl.z, clamp(_u.x, -1.5, 1.5), clamp(_u.z, -1.5, 1.5), 'plant');
      this.libre[cote] = false;
    } else {
      // en vol : chute ballistique jusqu'au sol, puis décision B au rebond
      this.theta = 0; this.thRel = 0; this.cadPlan = this.cad;
      this.rel.x = this.bl.x; this.rel.z = this.bl.z;
      // pas de suivi de geste : la main n'a rien lâché (l'élan du dernier lâcher la projetait vers le haut)
      this.wV0.set(0, 0, 0);
      const vy = _v.y, h = Math.max(0, this.bw.y - p.pos.y - R);
      if (vy > 0.3) {
        // La balle REMONTE (l'ancien chemin était dans son rebond) : c'est un rebond déjà commencé. On place
        // l'impact dans le passé, sous elle, et la décision B choisit la reprise sur cette montée. La laisser
        // monter, retomber et rebondir encore lui ôtait 40 % de son énergie : une reprise hors de portée.
        const vb0 = Math.sqrt(vy * vy + 2 * G * h), t0 = (vb0 - vy) / G;
        this.imp.x = this.bl.x; this.imp.z = this.bl.z;
        this.thImp = -t0; this.vR = vb0 / K.E + G * t0;        // _vol en retrouvera vi = vb0 / E, donc vb = vb0
      } else {
        this.imp.x = this.sgn * (this.geo.lat + 0.04 * this.geo.s); this.imp.z = this.geo.zR + 0.08 * this.geo.s;
        this.vR = -vy;
        this.thImp = h < 0.005 && vy <= 0 ? 0 : (vy + Math.sqrt(vy * vy + 2 * G * h)) / G;
      }
      this.A.yRe = this.bw.y - p.pos.y; this.catchMain = this.main;          // (hauteur dans G)
      // la poche de reprise : sans elle, la remontée visait une géométrie jamais calculée (écart latéral
      // indéfini) et le ballon comme la main partaient en NaN à la première prise en plein vol
      this._geoCote(this.catchMain, this.geoC); this._pocheNormale();
      this.seg = 'vol'; this.vi = 0; this.vb = 0; this.lamImp = this.lam + this.thImp * this.cad;
      this.libre[cote] = true;
      this.wP[cote].copy(M.ok ? M.W : this.adopW); this.wV[cote].set(0, 0, 0);
      this.thCat = this.thImp + 0.25;
    }
    this.stats.adoptions = (this.stats.adoptions || 0) + 1;
  }

  // Rendre le ballon à l'ancien chemin (il repart d'où il est).
  rendre(raison) {
    const p = this.p;
    if (this.possede || this.attente) {
      this.stats.sorties[raison] = (this.stats.sorties[raison] || 0) + 1;
      const D = p.drib;
      if (D) { D.phase = 'push'; D.prevHy = null; D.sched = null; D.relKey = null; D.trackFor = null; D.hold = 0; }
    }
    this.possede = false; this.attente = null; this.mode = 'normal'; this.arretT = 0;
    this.croise.attente = false; this.croise.actif = false; this.croise.suivant = null;
    this.geste.def = null; this.geste.et = null; this.geste.suite = false; this.E.actif = false;
    this.og.set(0, 0, 0); this.ogC.set(0, 0, 0);
    const lent = raison === 'arret';
    for (const c of ['Left', 'Right']) { this.kCible[c] = 0; this.kVit[c] = 1 / (lent ? K.K_OUT_STOP : K.K_OUT); }
  }

  // ---------------------------------------------------------------- le pas (après l'animation des jambes)
  pas(dt) {
    const p = this.p;
    if (!(dt > 0)) return;
    // horloge de foulée : elle suit la phase de locomotion, jamais de saut
    let d;
    const surPlace = !p.locoActif && p.constructor.DRIBBLE_SUR_PLACE !== false;
    if (p.locoActif) { d = wrap05(p.locoPhase - this.lastLoco); if (d < 0 || d > 0.25) d = this.cad * dt; if (p.locoCad > 0) this.cad = p.locoCad; }
    else {
      // À L'ARRÊT il n'y a plus de pieds pour donner le tempo : un rythme régulier, plus rapide sous pression
      if (surPlace) this.cad += (1 / (p.pression ? K.T_PROTEGE : this.tSurPlace) - this.cad) * (1 - Math.exp(-dt / 0.25));
      d = this.cad * dt;
      if (surPlace) { this.aL = 0; this.aR = 0; this.ecart = 0; }
    }
    this.lastLoco = p.locoPhase; this.lam += d; this.dLam = d;
    this.vM += (p.speedNow - this.vM) * (1 - Math.exp(-dt / 0.15));
    // poids des mains (même hors possession : on les fait redescendre)
    for (let i = 0; i < 2; i++) {
      const c = COTES[i], cible = this.kCible[c], k = this.kD[c];
      if (k !== cible) this.kD[c] = cible > k ? Math.min(cible, k + dt * this.kVit[c]) : Math.max(cible, k - dt * this.kVit[c]);
    }
    const barreG = !!(this.geste.def && this.geste.et && this.geste.et.barre && this.croise.actif);   // recul, step-back
    this.kBar += ((this.possede && (this.p.pression || barreG) ? 0.9 : 0) - this.kBar) * (1 - Math.exp(-dt / (this.p.pression || barreG ? K.BAR_IN : K.BAR_OUT)));
    // BRAS LIBRE EN GARDE, bras par bras : celui qui ne tient pas (ni ne va reprendre) la balle, à l'arrêt ou
    // sous pression. Les poids sont lissés : au crossover la garde passe d'un bras à l'autre en 0,1 s, au lieu
    // d'être coupée net puis remise (deux claquements par changement de main).
    const kgBase = this.possede ? Math.max(0.65 * lisse(this.kSP), this.kBar) : 0;
    const tenant = COTE[this.seg === 'vol' ? this.catchMain : this.main];
    for (let i = 0; i < 2; i++) {
      const c = COTES[i], cible = c !== tenant ? kgBase : 0;
      this.kG[c] += (cible - this.kG[c]) * (1 - Math.exp(-dt / (cible > this.kG[c] ? 0.10 : 0.15)));
    }
    this.adopT += dt;
    // geste : enveloppe du corps (monte en 0,06 s, redescend en 0,15 s), élan d'après, garde-fou
    const Gs = this.geste, actifG = !!(Gs.def && this.croise.actif);
    Gs.env += ((actifG ? 1 : 0) - Gs.env) * (1 - Math.exp(-dt / (actifG ? 0.06 : 0.15)));
    if (Gs.apresT > 0) Gs.apresT -= dt;
    if (Gs.def) { Gs.t += dt; if (Gs.t > 2.0) { this._finGeste(); (this.stats.abandons = (this.stats.abandons || 0) + 1); } }
    if (!this.possede) return;
    // arrêt : on garde le ballon (dribble sur place) — ou, si ce dribble est coupé, jusqu'à la reprise
    // suivante (au plus une demi-seconde) avant de rendre la main à l'ancien dribble
    if (!p.locoActif) { if (surPlace) this.mode = 'surPlace'; else { this.mode = 'arret'; this.arretT += dt; } }
    else if (this.mode !== 'normal') { this.mode = 'normal'; this.arretT = 0; }
    this.kSP += ((this.mode === 'surPlace' && p.speedNow < 0.5 ? 1 : 0) - this.kSP) * (1 - Math.exp(-dt / 0.18));
    if (p.locoActif) {
      const T = 1 / Math.max(0.3, this.cad);
      // foulée lente (au-delà de 0,72 s) : un rebond par PAS, comme un footing balle en main ; sinon un par foulée
      if (!this.deuxPieds && (T >= 0.72 || this.vM < 1.5)) this.deuxPieds = true;
      else if (this.deuxPieds && T <= 0.66 && this.vM >= 1.7) this.deuxPieds = false;
    }
    // temps du rebond : il avance avec la foulée, dans des bornes (la gravité ne se déforme jamais beaucoup)
    const dth = clamp(d / Math.max(0.3, this.cadPlan), K.RATE_MIN * dt, K.RATE_MAX * dt);
    this.theta += dth;
    this.bwPrec.copy(this.bw);
    const cote = COTE[this.main], autre = COTE[this.main === 'R' ? 'L' : 'R'];
    // la main du ballon est pilotée ; l'autre rend la main au clip — sauf pendant un crossover, où les deux
    // poids sont conduits par le geste (voir _contact, lâcher)
    if (!this.croise.actif) { this.kCible[cote] = 1; this.kVit[cote] = 1 / K.K_ADOPT; this.kCible[autre] = 0; this.kVit[autre] = 1 / 0.15; }
    if (this.seg === 'main') this._contact(dt, dth);
    else this._vol(dt, dth);
    // COLLE LISSÉE. Sur l'image affichée, bras() mesure où la paume a vraiment pu aller (le bras n'atteint
    // pas toujours la balle prévue : reprise basse, épaule qui bouge avec le clip). La balle rejoint la paume
    // à vitesse bornée, et hors contact le décalage se résorbe de même : elle ne saute plus dans la main à la
    // reprise, ni hors de la main au lâcher (jusqu'à 20 cm d'un coup auparavant).
    if (this.possede) {
      if (!this.contact) this.ogC.set(0, 0, 0);
      _og1.subVectors(this.ogC, this.og);
      const l = _og1.length(), m = (this.contact ? 1.5 : 2.5) * dt;
      if (l > m) _og1.multiplyScalar(m / l);
      this.og.add(_og1);
      if (this.og.lengthSq() > 1e-8) { this.dirMonde(this.og, _og2); this.bw.add(_og2); this.bw.y = Math.max(R + this.p.pos.y, this.bw.y); }
    }
    // fin d'arrêt
    if (this.mode === 'arret' && (this.arretT >= K.ARRET_MAX || (this.seg === 'main' && this.theta < 0.03))) this.rendre('arret');
    // SURVEILLANCE : le ballon, mais aussi la trajectoire des mains (intégrée d'un pas à l'autre : une valeur
    // invalide y resterait pour toujours, et l'IK des bras avec elle)
    let sain = Number.isFinite(this.bw.x + this.bw.y + this.bw.z);
    if (!Number.isFinite(this.og.x + this.og.y + this.og.z + this.ogC.x + this.ogC.y + this.ogC.z)) { sain = false; this.og.set(0, 0, 0); this.ogC.set(0, 0, 0); }
    for (let i = 0; i < 2; i++) {
      const c = COTES[i], P = this.wP[c], V = this.wV[c], T = this.tW[c], F = this.tF[c], N = this.tN[c];
      if (!Number.isFinite(P.x + P.y + P.z + V.x + V.y + V.z + T.x + T.y + T.z + F.x + F.y + F.z + N.x + N.y + N.z)) {
        sain = false; P.set(0, 1, 0.2); V.set(0, 0, 0); T.set(0, 1, 0.2); F.set(0, 0, 1); N.set(0, -1, 0);
      }
    }
    if (!sain) { this.panne = 5; console.warn('[dribble] valeur invalide, retour à l\'ancien dribble', this.seg, this.theta, this.thCat); this.rendre('nan'); this.bw.copy(p.pos).setY(1 + p.pos.y); }
  }

  _contact(dt, dth) {
    const A = this.A;
    // crossover demandé pendant le contact : on replanifie la poussée d'ici (le nouveau plan remet l'horloge
    // à zéro — on la relit après)
    // (seulement tant que la main tient la balle en haut — amorti ou garde — et au-dessus du point de lâcher
    // du geste : lancé pendant la poussée, la balle déjà en dessous, le plan dégénérait en un contact de 15 ms)
    if (this.croise.attente && this.thRel - this.theta >= 0.03 && this.theta <= this.th2 + 0.01 && this.bl.y >= this._hauteurLacher() - 0.02) this._lancerCroise();
    const th = this.theta;
    if (th < this.thRel) {
      let y;
      if (th <= this.th1) y = A.y0 + A.w0 * th + 0.5 * (A.w0 >= 0 ? -A.A1 : A.A1) * th * th;   // amorti (vers le haut ou le bas)
      else if (th <= this.th2) y = A.y1;
      else { const t = th - this.th2; y = A.y1 - A.u0 * t - 0.5 * A.a3 * t * t; }
      this._hermite(th, this.bl); this.bl.y = Math.max(R, y);
      this.versMonde(this.bl, this.bw);
      this.q = th <= this.th2 ? 0 : lisse((th - this.th2) / Math.max(1e-3, this.thRel - this.th2));
      this.contact = true;
      // inclinaison des doigts : -0,10 à la reprise, +0,10 à la fin de la garde, puis coup de poignet
      this.beta = th <= this.th2 ? -0.10 + 0.20 * lisse(th / Math.max(1e-3, this.th2)) : 0.10 + 0.35 * this.q;
      this.qD = this.q;
      const cote = COTE[this.main];
      this.libre[cote] = false;
      this._cadre(this.main, this.bl.x, this.bl.y, this.bl.z, this.q, this.beta, this.tW[cote], this.tF[cote], this.tN[cote]);
      if (this.adopT < K.K_ADOPT) {
        const k = lisse(this.adopT / K.K_ADOPT);
        this.tW[cote].lerpVectors(this.adopW, this.tW[cote], k);
        this.tF[cote].lerpVectors(this.adopF, this.tF[cote], k).normalize();
        this.tN[cote].lerpVectors(this.adopN, this.tN[cote], k).normalize();
      }
      return;
    }
    // ---- le lâcher ----
    const cote = COTE[this.main], H = this.hx, p = this.p;
    // Le point EXACT du lâcher : la fin de la trajectoire de la main (repère du joueur).
    this.rel.x = H.x1; this.rel.z = H.z1;
    this.seg = 'vol'; this.contact = false; this.q = 1;
    this.lamImp = this.lam + (this.thImp - this.theta) * this.cad;
    this.catchMain = this.croise.actif ? this.croise.vers : this.main;
    this._geoCote(this.catchMain, this.geoC);          // la poche de la main qui va reprendre
    if (this.croise.actif && this.E.actif && this.E.pocheOk) { this.poche.x = this.E.pocheX; this.poche.z = this.E.pocheZ; }
    else this._pocheNormale();
    // la main de dribble s'en va sur sa propre trajectoire : suivi du geste, puis retour vers la reprise
    this.libre[cote] = true;
    this.wP[cote].copy(this.tW[cote]); this.wV0.set(H.vx1, -this.vR, H.vz1); this.wV[cote].copy(this.wV0);
    this.betaVol = 0.45;
    if (this.croise.actif && this.croise.vers !== this.main) {
      // la main de départ rend la main au clip, l'autre vient se placer pour la reprise
      this.kCible[cote] = 0; this.kVit[cote] = 1 / 0.15;
      const cv = COTE[this.croise.vers];
      // elle part de là où on la VOIT : sa garde (IK) si elle y était, sinon la main du clip
      if (this.gardeOk[cv] && this.kG[cv] > 0.3) this.wP[cv].copy(this.gardeW[cv]);
      else { this.p.avatar && this.p.avatar.bones[cv + 'Hand'] ? this.p.avatar.bones[cv + 'Hand'].getWorldPosition(_a) : this.p.handWorld(this.croise.vers, _a); this.versLocal(_a, this.wP[cv]); }
      this.wV[cv].set(0, 0, 0); this.libre[cv] = true;
      this.kCible[cv] = 1; this.kVit[cv] = 1 / Math.max(0.08, this.thImp - this.theta + 0.05);
    }
    this._vol(dt, 0);
  }

  _vol(dt, dth) {
    const th = this.theta;
    if (th < this.thImp) {
      // Chute : la verticale est de la vraie balistique ; l'horizontale suit le JOUEUR, du lâcher au point de
      // rebond prévu (comme dans 2K : la balle tourne avec lui dans un virage, et une accélération brutale ne
      // la laisse pas un mètre derrière).
      const t = th - this.thRel, k = clamp(t / Math.max(1e-3, this.thImp - this.thRel), 0, 1);
      this.bl.set(this.rel.x + (this.imp.x - this.rel.x) * k, Math.max(R, this.A.yRe - this.vR * t - 0.5 * G * t * t), this.rel.z + (this.imp.z - this.rel.z) * k);
      this.versMonde(this.bl, this.bw);
    } else {
      if (this.vb === 0 || this._impactFait !== this.thImp) {
        // ---- l'impact : décision B ----
        this._impactFait = this.thImp;
        this.vi = this.vR + G * (this.thImp - this.thRel); this.vb = K.E * this.vi;
        this.lamImp = this.lam;
        this._decisionB();
        // REBOND EN V. La balle garde au sol 85 % de sa vitesse horizontale (MONDE : le frottement freine la
        // balle, pas le joueur), puis rejoint la poche de reprise. Avant, la remontée repartait à vitesse
        // horizontale nulle : sur un crossover la balle passait de 2 m/s en travers à l'arrêt, un U au sol.
        {
          if (!(this.croise.actif && this.E.actif && this.E.pocheOk)) this._pocheNormale();
          const tf = Math.max(0.03, this.thImp - this.thRel);
          this.dirLocal(this.p.vel, _v);
          const vx = K.KH * (this.imp.x - this.rel.x) / tf - (1 - K.KH) * _v.x;
          const vz = K.KH * (this.imp.z - this.rel.z) / tf - (1 - K.KH) * _v.z;
          const dx = this.poche.x - this.imp.x, dz = this.poche.z - this.imp.z, D = Math.hypot(dx, dz) || 1e-3;
          const Tc = Math.max(0.05, this.thCat - this.thImp), ex = dx / D, ez = dz / D;
          // bornée : jamais de boucle (elle ne part pas à l'opposé de la poche, ni trop en travers)
          const vl = clamp(vx * ex + vz * ez, -0.3, 2.2 * D / Tc), vt = clamp(-vx * ez + vz * ex, -0.8, 0.8);
          this.vo.x = vl * ex - vt * ez; this.vo.z = vl * ez + vt * ex;
        }
        this.impact = clamp(this.vi / 7, 0.35, 1);
        // écart à l'appui visé (en secondes) : phase de foulée actuelle comparée aux appuis mesurés
        const eL = wrap05(this.p.locoPhase - this.aL) / this.cad, eR = wrap05(this.p.locoPhase - this.aR) / this.cad;
        const st = this.stats.impacts; st.push({ t: performance.now(), lam: this.lam, vi: this.vi, eL, eR, main: this.main, loco: !!this.p.locoActif, v: this.vM, rattrape: this.catchNom });
        if (st.length > 64) st.shift();
      }
      const t = th - this.thImp, Tc = Math.max(1e-3, this.thCat - this.thImp);
      const y = Math.max(R, R + this.vb * t - 0.5 * G * t * t);
      // remontée : du point de rebond (avec sa vitesse de sortie) à la poche de la main qui reprend, où elle
      // arrive sans vitesse relative — la main la cueille
      const u = clamp(t / Tc, 0, 1), u2 = u * u, u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2;
      this.bl.set(h00 * this.imp.x + h10 * Tc * this.vo.x + h01 * this.poche.x, y, h00 * this.imp.z + h10 * Tc * this.vo.z + h01 * this.poche.z);
      this.versMonde(this.bl, this.bw);
      if (th >= this.thCat) { this._reprise(); return; }
    }
    this.contact = false;
    this._mainsEnVol(dth);
  }

  // Trajectoire de la main libre : suivi du geste, puis retour qui arrive PILE sur le ballon à la reprise.
  _mainsEnVol(dth) {
    const th = this.theta;
    for (const cote of ['Left', 'Right']) {
      if (!this.libre[cote] || this.kCible[cote] === 0 && this.kD[cote] < 0.001) continue;
      const main = cote === 'Left' ? 'L' : 'R';
      const g = this.geoC, catchMain = this.catchMain;
      const sgnC = main === 'L' ? 1 : -1;
      // point de reprise (connu après l'impact ; avant, la poche prévue)
      const yC = this.vb > 0 && th >= this.thImp ? this.catchY : (this.croise.actif && this.E.actif ? 0.5 * (this.E.catchMin + this.E.catchMax) : this.geo.yCat);
      const tCat = this.vb > 0 && th >= this.thImp ? this.thCat : this.thImp + 0.22;
      const cibleMain = main === catchMain;
      if (cibleMain) this._cadre(main, this.poche.x, yC, this.poche.z, 0, -0.10, _W, _f, _n);
      else { _W.set(sgnC * 0.22 * g.s, this.geo.Sy - 0.55, 0.12); _f.set(0, -0.4, 1).normalize(); _n.set(-sgnC * 0.3, -0.2, 0.2).normalize(); }
      const P = this.wP[cote], V = this.wV[cote];
      const tr = th - this.thRel;
      if (tr < K.FT && main === this.main) {
        P.addScaledVector(V, dth); V.addScaledVector(this.wV0, -dth / K.FT);
        this.betaVol = 0.45 + 0.40 * clamp(tr / K.FT, 0, 1);
      } else {
        const Tr = tCat - th;
        if (Tr > dth && dth > 0) {
          const s = dth / Tr, s2 = s * s, s3 = s2 * s;
          const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
          const d00 = 6 * s2 - 6 * s, d10 = 3 * s2 - 4 * s + 1, d01 = 6 * s - 6 * s2, d11 = 3 * s2 - 2 * s;
          const vcy = cibleMain ? this.catchW : 0;
          const nx = h00 * P.x + h10 * Tr * V.x + h01 * _W.x, ny = h00 * P.y + h10 * Tr * V.y + h01 * _W.y + h11 * Tr * vcy, nz = h00 * P.z + h10 * Tr * V.z + h01 * _W.z;
          V.set((d00 * P.x + d10 * Tr * V.x + d01 * _W.x) / Tr, (d00 * P.y + d10 * Tr * V.y + d01 * _W.y + d11 * Tr * vcy) / Tr, (d00 * P.z + d10 * Tr * V.z + d01 * _W.z) / Tr);
          P.set(nx, ny, nz);
        } else if (dth > 0) { P.copy(_W); V.set(0, 0, 0); }
        const u = clamp((th - this.thRel - K.FT) / Math.max(0.05, (tCat - this.thRel - K.FT) * 0.6), 0, 1);
        this.betaVol = 0.85 + (-0.10 - 0.85) * lisse(u);
      }
      // orientation : celle du geste en cours
      const Tw = this.tW[cote], Tf = this.tF[cote], Tn = this.tN[cote];
      Tw.copy(P);
      this._cadre(main, 0, 0, 0, 0, this.betaVol, _a, Tf, Tn);
      // derniers centièmes : rendez-vous exact avec le ballon
      if (cibleMain && this.vb > 0 && th >= this.thImp) {
        const kR = lisse((th - this.thCat + K.RDV) / K.RDV);
        if (kR > 0) { this._cadre(main, this.bl.x, this.bl.y, this.bl.z, 0, -0.10, _a, _f, _n); Tw.lerp(_a, kR); Tf.lerp(_f, kR).normalize(); Tn.lerp(_n, kR).normalize(); }
      }
    }
  }

  _reprise() {
    const C = this.croise, Gs0 = this.geste;
    const nouvelle = this.catchMain;
    const ancienne = this.main;
    this.main = nouvelle; this.sgn = nouvelle === 'L' ? 1 : -1;
    if (C.actif) {
      C.actif = false; this.libre[COTE[ancienne]] = false;
      // geste en plusieurs rebonds (hésitation puis relance) : l'étape suivante part d'ici, même main
      const Gs = this.geste;
      if (Gs.def && Gs.etapes && Gs.etape + 1 < Gs.etapes.length) { Gs.etape++; Gs.suite = true; C.attente = true; C.de = C.vers = nouvelle; }
      else this._finGeste();
    }
    // geste mis en file pendant le précédent : c'est son tour
    if (C.suivant && !C.attente && !Gs0.def) { C.attente = true; C.type = C.suivant; C.suivant = null; }
    const r = Math.max(0, this.theta - this.thCat);
    this.geo = this._geoCote(this.main, this.geo);
    if (this.p.locoActif) { this.ecart = frac(this.lam - this.p.locoPhase); this._appuis(); }
    else if (this.mode === 'surPlace') {
      this.ecart = 0; this.aL = 0; this.aR = 0;
      this.tSurPlace = K.T_SUR_PLACE * (0.95 + 0.10 * Math.random());   // ±5 % : une main, pas un métronome
      // Immobile longtemps, on change de main de temps en temps (crossover sur place) : un joueur qui dribble
      // cinq secondes de la même main sans bouger a l'air d'un automate. Jamais chez un joueur distant : ses
      // changements de main arrivent par le réseau.
      this.nSurPlace++;
      const p = this.p;
      // SIZE-UP : touche de feinte maintenue à l'arrêt (ou IA) — un geste de la combinaison par rebond
      if (!p.remote && p.sizeUp && !C.attente && !this.geste.def && p.prochainSizeUp) {
        const type = p.prochainSizeUp();
        if (type) { this._gesteAuto(type); this.nSurPlace = 0; }
      }
      if (!p.remote && !C.attente && !this.geste.def && this.nSurPlace >= (this._prochainCroise || (this._prochainCroise = 6 + Math.floor(Math.random() * 4)))) {
        this.nSurPlace = 0; this._prochainCroise = 7 + Math.floor(Math.random() * 5);
        // Le geste se lance ICI, sans passer par startMove : celui-ci arme le délai des gestes et l'état
        // « crossover » pendant lesquels une passe, un spin ou un geste demandés au même moment étaient
        // ignorés. Un peu de variété : crossover surtout, parfois un pound ou un entre-les-jambes.
        const r = Math.random();
        this._gesteAuto(r < 0.6 ? 'cross' : r < 0.85 ? 'pound' : 'legs');
      }
    }
    if (this.mode !== 'surPlace') this.nSurPlace = 0;
    // le contact part de là où EST la balle (la poche a pu bouger d'un centimètre depuis l'impact)
    this._decisionA(this.catchY, this.catchW, this.bl.x, this.bl.z, 0, 0, 'suivant', r);
    this.libre[COTE[this.main]] = false;
    this.vb = 0;
    this.stats.reprises = (this.stats.reprises || 0) + 1;
    if (C.attente) this._lancerCroise();
    this._contact(0, 0);
  }

  // GESTE EN RYTHME (crossover, entre les jambes, dans le dos, in-and-out, hésitation, pound...) : on
  // replanifie le rebond en cours à partir de là où est la balle, avec les points de l'étape (js/gestes.js).
  // Les jambes restent dans la course.
  _lancerCroise() {
    const C = this.croise, Gs = this.geste;
    C.attente = false; C.actif = true;
    const def = GESTES[C.type] || GESTES.cross;
    // mains résolues ICI, depuis la main qui tient la balle au lancement
    C.de = this.main; C.vers = def.change ? (this.main === 'R' ? 'L' : 'R') : this.main;
    if (!Gs.suite || Gs.def !== def) {
      Gs.def = def; Gs.etape = 0; Gs.sgn0 = this.sgn; Gs.t = 0;
      Gs.etapes = (this.mode === 'surPlace' && def.surPlace) || def.etapes;
    }
    Gs.suite = false;
    const et = Gs.et = Gs.etapes[Math.min(Gs.etape, Gs.etapes.length - 1)];
    const A = this.A, th = this.theta;
    // état courant de la balle dans la main
    let y, w;
    if (th <= this.th1) { const ac = A.w0 >= 0 ? -A.A1 : A.A1; y = A.y0 + A.w0 * th + 0.5 * ac * th * th; w = A.w0 + ac * th; }
    else if (th <= this.th2) { y = A.y1; w = 0; }
    else { const t = th - this.th2; y = A.y1 - A.u0 * t - 0.5 * A.a3 * t * t; w = -(A.u0 + A.a3 * t); }
    this._hermite(th, _a); this._hermiteV(th, _b);
    // (à garder : _resoudreEtape réutilise les zones de travail) — le nouveau tracé repart avec la vitesse
    // qu'avait la balle : sinon, lancé en plein contact, il repartait de l'arrêt (un à-coup)
    const x0 = _a.x, z0 = _a.z, vx0 = this.seg === 'main' ? _b.x : 0, vz0 = this.seg === 'main' ? _b.z : 0;
    this._resoudreEtape(et, C.vers);
    const g = this.geo, sauveYR = g.yR, sauveAp = g.yApexMax;
    g.yR = this.E.relY; g.yApexMax = sauveAp + (et.apex || 0) * g.s;
    g.yAmorti = sauveYR;                              // l'amorti se mesure à la portée normale de la main
    g.yReprise = this.E.catchMin - 0.03;              // le rebond doit remonter jusqu'à la reprise du geste
    this._decisionA(Math.max(R + 0.2, y), w, x0, z0, vx0, vz0, 'plant');
    g.yR = sauveYR; g.yApexMax = sauveAp; g.yAmorti = 0; g.yReprise = 0;
    this.stats.croises = (this.stats.croises || 0) + 1;
    const sg = this.stats.gestes || (this.stats.gestes = {}); sg[C.type] = (sg[C.type] || 0) + 1;
  }

  // Les points d'une étape, dans G (voir la notation de js/gestes.js). `vers` = main qui reprendra.
  _resoudreEtape(et, vers) {
    const E = this.E, g = this.geo, s = g.s, sg0 = this.geste.sgn0;
    const zr = (gg, ref, z) => (ref === 'C' ? gg.zC + z * s : ref === 'R' ? gg.zR + z * s : z * s);
    const xr = (gg, sgp, o) => (o.dx !== undefined ? sgp * (gg.lat + o.dx * s) + gg.dLat : sg0 * (o.x || 0) * s);
    E.actif = true;
    const L = et.lacher;
    E.relX = xr(g, sg0, L); E.relZ = zr(g, L.zRef, L.z || 0);
    E.relY = clamp(L.yA !== undefined ? L.yA * s : g.yR + (L.dy || 0) * s, R + 0.35, 1.3);
    if (et.via) { E.viaT = et.via.t; E.viaX = xr(g, sg0, et.via); E.viaZ = zr(g, et.via.zRef, et.via.z || 0); } else E.viaT = 0;
    const Rb = et.rebond;
    E.impX = xr(g, sg0, Rb); E.impZ = zr(g, Rb.zRef, Rb.z || 0) + (Rb.avance ? Math.min(0.45, 0.10 + 0.05 * this.vM) * s : 0);
    const gc = this._geoCote(vers, this.geoC), sv = vers === 'L' ? 1 : -1, Rp = et.reprise;
    E.pocheX = xr(gc, sv, Rp); E.pocheZ = zr(gc, Rp.zRef, Rp.z || 0); E.pocheOk = true;
    if (Rp.yMin !== undefined) { E.catchMin = Rp.yMin * s; E.catchMax = Rp.yMax * s; }
    else if (Rp.sommet) { E.catchMin = gc.yTop + Rp.sommet[0] * s; E.catchMax = gc.yTop + Rp.sommet[1] * s; }
    else { E.catchMin = gc.yR + (Rp.bas || 0) * s; E.catchMax = gc.yCat + (Rp.haut || 0) * s; }
    if (E.catchMax < E.catchMin + 0.02) E.catchMax = E.catchMin + 0.02;
    E.twMin = et.garde ? et.garde[0] : 0; E.twMax = et.garde ? et.garde[1] : K.TW_MAX;
    E.pied = et.pied || 'libre';
    E.vDes = 0;
    if (et.vDes === 'apex') {
      // poussée qui fait monter le rebond au sommet voulu
      const yAp = g.yApexMax + (et.apex || 0) * s, vb = Math.sqrt(2 * G * Math.max(0.05, yAp - R)), vi = vb / K.E;
      E.vDes = Math.sqrt(Math.max(0, vi * vi - 2 * G * (E.relY - R)));
    } else if (et.vDes > 0) E.vDes = et.vDes;
  }
  // hauteur de lâcher du geste demandé (première étape), pour savoir s'il peut partir en plein contact
  _hauteurLacher() {
    const def = GESTES[this.croise.type] || GESTES.cross, g = this.geo;
    const et = ((this.mode === 'surPlace' && def.surPlace) || def.etapes)[0], L = et.lacher;
    return L.yA !== undefined ? L.yA * g.s : g.yR + (L.dy || 0) * g.s;
  }
  _pocheNormale() {
    const gC = this.geoC, sC = this.catchMain === 'L' ? 1 : -1;
    this.poche.x = sC * gC.lat + gC.dLat; this.poche.z = gC.zC;
  }
  _finGeste() {
    const Gs = this.geste, def = Gs.def;
    if (def && def.apres) { Gs.apresT = def.apres.t; Gs.apresK = def.apres.k; }
    Gs.def = null; Gs.suite = false; this.E.actif = false;       // (et : gardé, le buste revient en douceur)
  }
  // Geste lancé par le module lui-même (variété sur place, size-up) : sans startMove, qui armerait le délai
  // des gestes et l'état « crossover » (passe, spin, geste demandés au même moment ignorés).
  _gesteAuto(type) {
    const p = this.p, C = this.croise, def = GESTES[type];
    if (!def) return;
    if (def.change) p.dribbleHand = this.main === 'R' ? 'L' : 'R';
    p.moveType = type; p.moveId = (p.moveId || 0) + 1;      // (part par le réseau avec le moveId)
    C.moveVu = p.moveId; C.attente = true; C.type = type;
  }
  // phase de l'étape : 0 → 1 lâcher → 2 impact → 3 reprise
  get phaseGeste() {
    const th = this.theta;
    if (this.seg === 'main') return clamp(th / Math.max(1e-3, this.thRel), 0, 1);
    if (th < this.thImp) return 1 + clamp((th - this.thRel) / Math.max(1e-3, this.thImp - this.thRel), 0, 1);
    const tc = this.vb > 0 ? this.thCat : this.thImp + 0.25;
    return 2 + clamp((th - this.thImp) / Math.max(1e-3, tc - this.thImp), 0, 1);
  }
  // EXPOSITION AU VOL pendant un geste (facteur sur la chance de vol) : la balle qui traverse devant le
  // défenseur est exposée, celle qui passe dans le dos ou entre les jambes est protégée ; de l'autre côté du
  // corps, vue du voleur, moitié moins. (Avant, aucun vol n'était possible pendant un geste : avec des gestes
  // enchaînés à toute vitesse, la balle aurait été presque toujours intouchable.)
  exposition(voleur) {
    const Gs = this.geste;
    if (!(Gs.def && this.croise.actif)) return 1;
    const type = this.croise.type, w = this.phaseGeste;
    let e = 0.9;
    if (type === 'back' || type === 'legs' || type === 'retr') e = 0.4;
    else if (type === 'cross' || type === 'ankle') e = w >= 1 && w < 2.5 ? 1.2 : 1.0;
    else if (type === 'hesi' && Gs.etape === 0 && w >= 2.5) e = 1.3;
    this.versLocal(voleur.pos, _q);
    if (Math.abs(this.bl.x) > 0.1 && Math.sign(_q.x) !== Math.sign(this.bl.x)) e *= 0.5;
    return e;
  }
  // facteur de vitesse du joueur pendant un geste (et l'élan qui suit : hésitation, grand crossover)
  vitesseGeste() {
    const Gs = this.geste;
    if (Gs.def && Gs.et && this.croise.actif) {
      const v = Gs.et.vit; if (!v) return 1;
      return v[this.phaseGeste < (Gs.et.bascule === 'lacher' ? 1 : 2) ? 0 : 1];
    }
    return Gs.apresT > 0 ? Gs.apresK : 1;
  }

  // ---------------------------------------------------------------- la posture (chaque pas, dans les couches)
  posture(A, dt) {
    const p = this.p, k = Math.max(this.kD.Left, this.kD.Right);
    if (k < 0.001 && this.kBar < 0.001) return;
    // côté de la balle et flexion LISSÉS : au changement de main, le buste pivote en 0,1 s au lieu de
    // basculer d'un coup (jusqu'à 18° sous pression), et la flexion ne saute plus à chaque décision
    if (dt > 0) {
      this.sgnL += (this.sgn - this.sgnL) * (1 - Math.exp(-dt / 0.10));
      this.Fl += ((this.geo.flex || 0.07) + 0.08 * (p.pression ? 1 : 0) - this.Fl) * (1 - Math.exp(-dt / 0.15));
    }
    const sgn = this.sgnL, F = this.Fl;
    const rz = -sgn * 0.04 * k, ry = sgn * (0.05 + 0.12 * this.kBar) * k;
    // à l'arrêt, le buste se penche davantage (triple menace) ; la tête compense pour garder les yeux sur le jeu
    // — y compris le LACET : sans cela, chaque rotation du buste emportait le regard avec elle
    const sp = this.kSP * k;
    // GESTE : le buste suit les courbes du geste (vendre un côté, faire passer les épaules, se redresser
    // pour une hésitation...), la tête compense pour garder les yeux sur le jeu
    let gry = 0, grz = 0, grx = 0, plonge = 1;
    const Gs = this.geste;
    if (Gs.env > 0.001 && Gs.et && Gs.et.corps) {
      const c = Gs.et.corps, w = Gs.def && this.croise.actif ? this.phaseGeste : 3, i = Math.min(2, Math.floor(w)), f = lisse(w - i), e = Gs.env * k;
      gry = Gs.sgn0 * courbe(c.ry, i, f) * e; grz = -Gs.sgn0 * courbe(c.rz, i, f) * e; grx = courbe(c.rx, i, f) * e;
      plonge = 1 + ((Gs.et.plonge || 1) - 1) * Gs.env;
    }
    A.ajouter('Spine', 0.35 * F * k + 0.14 * sp);
    A.ajouter('Spine1', 0.35 * F * k + 0.10 * sp + 0.5 * grx, (ry + gry) / 2, rz + grz);
    A.ajouter('Spine2', 0.30 * F * k + 0.06 * sp + 0.5 * grx, (ry + gry) / 2);
    A.ajouter('Neck', -0.25 * F * k - 0.14 * sp - 0.3 * grx, -0.3 * (ry + gry));
    A.ajouter('Head', -0.35 * F * k - 0.16 * sp - 0.3 * grx, -0.3 * (ry + gry));
    if (!this.contact) this.qD *= Math.exp(-dt / 0.08);
    if (this.main === 'R') A.ajouter('RightShoulder', 0, 0, 0.06 * plonge * this.qD * k);
    else A.ajouter('LeftShoulder', 0, 0, -0.06 * plonge * this.qD * k);
    // bras libre en garde (le balancier du clip reste dessous) — à l'arrêt et sous pression seulement : en
    // course, ajoutée au balancier du clip, la flexion du coude ramenait la main libre à la bouche à chaque
    // foulée vers l'avant
    for (let i = 0; i < 2; i++) {
      const c = COTES[i], kg = this.kG[c];
      if (kg < 0.001) continue;
      A.ajouter(c + 'Arm', -0.12 * kg, 0, c === 'Left' ? 0.10 * kg : -0.10 * kg);
      A.ajouter(c + 'ForeArm', -0.15 * kg);
    }
  }

  // ---------------------------------------------------------------- les bras (image affichée seulement)
  bras(A) {
    const p = this.p;
    if (this.kSP > 0.01 && A.aJambe && A.aJambe('Left') && A.aJambe('Right')) this._posture(A);
    // BRAS LIBRE D'ABORD : à l'arrêt, en garde devant le corps, main ouverte à hauteur de taille ; sous
    // pression, bras-barrière — l'avant-bras en travers devant la poitrine, face au défenseur. Chaque bras a
    // son poids (kG) : pendant un crossover, l'un quitte la garde pendant que l'autre la prend.
    const barre = clamp(this.kBar / 0.9, 0, 1), s = this.geo.s;
    for (let i = 0; i < 2; i++) {
      const off = COTES[i], kb = lisse(this.kG[off]);
      this.gardeOk[off] = false;
      if (kb < 0.01 || !A.aMains(off)) continue;
      const sg = off === 'Left' ? 1 : -1;      // côté du bras libre (+1 gauche)
      A.bones[off + 'Arm'].getWorldPosition(_a); this.versLocal(_a, _b);
      // (la main DEVANT le corps, avant-bras relevé, doigts vers l'avant et le haut : placée à la taille et
      // sur le côté, elle ressemblait à une main posée sur la hanche)
      _c.set(sg * (0.17 - 0.03 * barre) * s, _b.y - (0.36 - 0.08 * barre) * s, (0.34 + 0.02 * barre) * s);
      this.gardeW[off].copy(_c); this.gardeOk[off] = true; this.versMonde(_c, _W);
      _f.set(-sg * (0.20 + 0.50 * barre), 0.55 - 0.15 * barre, 0.80 - 0.25 * barre).normalize(); this.dirMonde(_f, _fW);
      _n.set(-sg * 0.55, -0.20 * (1 - barre), 0.80).normalize(); this.dirMonde(_n, _nW);
      _c.set(_b.x + sg * 0.50 * s, _b.y - 0.40 * s, _b.z - 0.05 * s); this.versMonde(_c, _pole);
      A.ikBras(off, _W, _fW, _nW, _pole, kb);
      A.plierDoigts(off, DOIGTS_GARDE, kb);
      (this._doigts || (this._doigts = {}))[off] = true;
    }
    for (let i = 0; i < 2; i++) {
      const cote = COTES[i], k = lisse(this.kD[cote]);
      if (k < 0.001) { if (this._doigts && this._doigts[cote] && this.kG[cote] < 0.01) { A.plierDoigts(cote, DOIGTS_REPOS, 0); this._doigts[cote] = false; } continue; }
      if (!A.aMains(cote)) continue;
      const main = cote === 'Left' ? 'L' : 'R', sgn = main === 'L' ? 1 : -1;
      this.versMonde(this.tW[cote], _W); this.dirMonde(this.tF[cote], _fW).normalize(); this.dirMonde(this.tN[cote], _nW).normalize();
      A.bones[cote + 'Arm'].getWorldPosition(_a); this.versLocal(_a, _b);
      _c.set(_b.x + sgn * 0.45 * this.geo.s, _b.y - 0.30 * this.geo.s, _b.z - 0.50 * this.geo.s); this.versMonde(_c, _pole);
      A.bones[cote + 'ForeArm'].getWorldPosition(_d);
      _d.lerp(_pole, Math.min(1, k));
      A.ikBras(cote, _W, _fW, _nW, _d, k);
      A.plierDoigts(cote, DOIGTS_BALLE, k);
      (this._doigts || (this._doigts = {}))[cote] = true;
    }
    // COLLE : sur l'image affichée, on mesure où la balle serait sous la paume réelle ; pas() l'y amène
    // en douceur (décalage og)
    const cote = COTE[this.main];
    if (this.possede && this.contact && this.kD[cote] >= 0.98 && this.adopT >= K.K_ADOPT && A.aMains(cote)) {
      const cal = this.cal[cote];
      A.repereMain(cote, _W, _f, _n);
      _e.crossVectors(_f, _n);
      _p.copy(_W).addScaledVector(_f, cal.af).addScaledVector(_n, cal.an).addScaledVector(_e, cal.ac).addScaledVector(_n, R + K.EPS);
      const ecart = _p.distanceTo(this.bw);
      if (ecart > 0.004) {
        this.stats.glue.push(ecart); if (this.stats.glue.length > 256) this.stats.glue.shift();
        if (ecart < 0.25) { this.versLocal(_p, _q); this.ogC.subVectors(_q, this.bl); }
        else { this._glueMauvais = (this._glueMauvais || 0) + 1; if (this._glueMauvais > 30) { this.panne = 5; console.warn('[dribble] la main ne suit plus le ballon, retour à l\'ancien dribble'); this.rendre('glue'); } }
      } else this._glueMauvais = 0;
    }
  }

  // RÉCEPTION À DEUX MAINS (image affichée) : les bras vont chercher la balle là où elle arrive, la saisissent
  // par les flancs et la ramènent à la poitrine avec elle (game.js : pendant la réception la balle suit un
  // chemin amorti jusqu'au buste). Avant, c'était la balle qui volait jusqu'aux mains du clip.
  saisie(A) {
    const p = this.p;
    if (!(p.catchT > 0) || !p.hasBall || this.controle || this.derOk < 1 || !A.aMains('Left') || !A.aMains('Right')) return;
    const k = clamp((0.38 - p.catchT) / 0.05, 0, 1) * clamp(p.catchT / 0.07, 0, 1);
    if (k < 0.001) return;
    this.versLocal(this.der, _q);                                   // la balle, dans G
    const s = p.h / 1.90;
    for (const cote of ['Left', 'Right']) {
      const sgn = cote === 'Left' ? 1 : -1, cal = this.cal[cote];
      // paume sur le flanc, un peu en arrière : normale vers l'intérieur et l'avant, doigts vers le haut
      _n.set(-sgn * 0.8, -0.05, 0.6).normalize();
      _f.set(sgn * 0.1, 0.85, 0.35); _f.addScaledVector(_n, -_f.dot(_n)).normalize();
      _e.crossVectors(_f, _n);
      _p.copy(_q).addScaledVector(_n, -(R + K.EPS));               // centre de la paume
      _W.copy(_p).addScaledVector(_f, -cal.af).addScaledVector(_n, -cal.an).addScaledVector(_e, -cal.ac);
      this.versMonde(_W, _a); this.dirMonde(_f, _fW); this.dirMonde(_n, _nW);
      A.bones[cote + 'Arm'].getWorldPosition(_b); this.versLocal(_b, _c);
      _c.x += sgn * 0.40 * s; _c.y -= 0.35 * s; _c.z -= 0.30 * s; this.versMonde(_c, _pole);   // coudes dehors et bas
      A.bones[cote + 'ForeArm'].getWorldPosition(_d); _d.lerp(_pole, k);
      A.ikBras(cote, _a, _fW, _nW, _d, k);
      A.plierDoigts(cote, [0.18, 0.22, 0.15], k);
      (this._doigts || (this._doigts = {}))[cote] = true;
    }
  }

  // POSTURE DE DRIBBLE À L'ARRÊT (triple menace). Les pieds restent là où le clip d'attente les pose, un peu
  // décalés : le pied opposé au ballon avance (il protège), celui du côté du ballon recule, les deux s'écartent.
  // Les hanches descendent et reculent, la cinématique inverse replie les jambes sur ces pieds. Elles
  // plongent un peu à chaque poussée : le dribble part des jambes.
  _posture(A) {
    const k = lisse(this.kSP) * Math.max(this.kD.Left, this.kD.Right), s = this.geo.s || 1, sgn = this.sgnL;
    if (k < 0.01) return;
    const hips = A.bones.Hips;
    // Le côté de la balle est LISSÉ (sgnL) : au changement de main, les pieds échangent leur place en un petit
    // pas (levé de 4 cm au milieu du trajet) au lieu de se téléporter de 15 cm d'une image à l'autre.
    const lev = 0.04 * s * k * (1 - sgn * sgn);
    for (let i = 0; i < 2; i++) {
      const c = COTES[i], cote = c === 'Left' ? 1 : -1, b = clamp((cote * sgn + 1) / 2, 0, 1);   // 1 = côté balle
      A.bones[c + 'Foot'].getWorldPosition(_pied[c]); A.bones[c + 'ToeBase'].getWorldPosition(_orteil[c]);
      // (entre les jambes : CISEAU — le pied de la nouvelle main s'avance, l'autre recule, place à la balle)
      const sc = this.geste.et && this.geste.et.ciseau ? this.geste.env : 0;
      this.dirMonde(_a.set(cote * (0.07 + 0.03 * sc) * s * k, lev, (0.10 - 0.15 * b + sc * (0.18 - 0.33 * b)) * s * k), _b);   // appuis larges
      _pied[c].add(_b); _orteil[c].add(_b);
    }
    // le bassin BASCULE vers l'avant (flexion de hanche) : c'est lui qui donne le buste penché de la triple
    // menace, pas seulement le dos ; les jambes sont reprises juste après par l'IK
    A.ajouter('Hips', 0.24 * k);
    // bassin : plus bas, un peu en arrière, et une petite plongée à la poussée
    hips.getWorldPosition(_w);
    this.dirMonde(_a.set(0, 0, -0.04 * s * k), _b);
    _w.add(_b); _w.y -= (K.BAISSE + 0.02 * this.qD) * s * k;     // qD est continu (q repassait de 1 à 0 : un tic)
    hips.parent.updateWorldMatrix(true, false);
    hips.position.copy(hips.parent.worldToLocal(_w));
    for (let i = 0; i < 2; i++) {
      const c = COTES[i], cote = c === 'Left' ? 1 : -1;
      A.bones[c + 'UpLeg'].getWorldPosition(_pole);
      this.dirMonde(_a.set(cote * 0.12, 0, 0.8), _b); _pole.add(_b);
      A.ikJambe(c, _pied[c], _orteil[c], _pole, k);
    }
  }

  // Hors possession : on retient le repère de la paume (G) pour une adoption sans à-coup.
  memoriserMain(A) {
    const M = this.memMain, cote = COTE[this.p.dribbleHand === 'L' ? 'L' : 'R'];
    if (!A || !A.aMains(cote)) { M.ok = false; return; }
    A.repereMain(cote, _W, _f, _n);
    this.versLocal(_W, M.W); this.dirLocal(_f, M.f); this.dirLocal(_n, M.n); M.cote = cote; M.ok = true;
  }
  noterBalle(pos) { this.prec.copy(this.der); this.der.copy(pos); this.derOk = Math.min(2, this.derOk + 1); }
  vitesse(out, dt = 1 / 120) { return out.subVectors(this.der, this.prec).divideScalar(dt); }
  prenable() {
    const th = this.theta;
    return this.seg === 'main' || (th >= this.thRel && th < this.thImp && th - this.thRel <= 0.04) || (th >= this.thImp && this.bl.y >= this.geo.yR - 0.05);
  }
  // Le clip de dribble sur place qui prend le relais démarre là où sa main est en haut au moment de la reprise.
  tempsClip(def, speed) {
    const S = def && def.sched; if (!S || !S.ext) return 0;
    const delta = this.seg === 'vol' ? Math.max(0, this.thCat - this.theta) : 0, cible = delta * (speed || 1);
    let best = null;
    for (const e of S.ext) if (e.type === 'max' && (e.hand === this.main || S.hand === 'RL' || !e.hand) && e.t >= cible && (best === null || e.t < best)) best = e.t;
    return best === null ? 0 : best - cible;
  }

  // ---------------------------------------------------------------- banc d'essai du planificateur (console)
  static testPlanificateur({ h = 1.90, Sy = 1.42, len = 0.57, T = [0.49, 0.55, 0.656, 0.70, 0.80, 0.90, 1.04], v = 4.8, pas = 1 / 120 } = {}) {
    const lignes = [];
    for (const periode of T) {
      const faux = { h, ang: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), speedNow: v, sprintVu: 0, couches: { omega: 0 }, sensLoco: 'av', pression: 0,
        locoActif: false, handWorld: (m, o) => o.set(0, 1, 0),
        avatar: { bones: { RightArm: { getWorldPosition: (o) => o.set(-0.2, Sy, 0) }, LeftArm: { getWorldPosition: (o) => o.set(0.2, Sy, 0) } } } };
      const d = new Dribble(faux);
      d.cal.Right.len = len; d.cal.Left.len = len; d.cad = 1 / periode; d.vM = v; d.main = 'R'; d.sgn = -1;
      d.aL = 0.05; d.aR = 0.55; d.ecart = 0; d.possede = true; d.deuxPieds = periode >= 0.72;
      d.geo = d._geoCote('R', d.geo);
      d._decisionA(d.geo.yCat, 1.5, d.sgn * d.geo.lat, d.geo.zC, 0, 0, 'plant');
      const erreurs = [], manieres = new Set(); let nImp = 0, contactMax = 0, contactMin = 9, apexMax = 0, oppose = 0;
      for (let i = 0; i < 30 / pas && nImp < 24; i++) {
        d.lam += d.cad * pas; d.theta += pas; const avant = d.stats.impacts.length;
        if (d.seg === 'main') d._contact(pas, pas); else d._vol(pas, pas);
        apexMax = Math.max(apexMax, d.bw.y);
        if (d.stats.impacts.length > avant) {
          const lamI = d.lam - (d.theta - d.thImp) * d.cad;      // instant exact de l'impact
          const eG = Math.abs(lamI - (Math.round(lamI - 0.05) + 0.05)), eD = Math.abs(lamI - (Math.round(lamI - 0.55) + 0.55));
          if (nImp >= 2) { erreurs.push(Math.min(eG, eD) / d.cad * 1000); if (eG <= eD) oppose++; }
          manieres.add(d.catchNom); nImp++;
          const c = d.thRel; contactMax = Math.max(contactMax, c); contactMin = Math.min(contactMin, c);
        }
      }
      const tri = erreurs.slice().sort((a, b) => a - b);
      lignes.push({ periode, parPas: d.deuxPieds, impacts: nImp, medianeMs: +(tri[tri.length >> 1] || 0).toFixed(1), maxMs: +(tri[tri.length - 1] || 0).toFixed(1),
        piedOppose: Math.round(100 * oppose / Math.max(1, erreurs.length)) + '%',
        manieres: [...manieres].join('/'), contact: contactMin.toFixed(2) + '-' + contactMax.toFixed(2), apex: +apexMax.toFixed(2), faibles: d.stats.faible });
    }
    console.table(lignes);
    return lignes;
  }
}
