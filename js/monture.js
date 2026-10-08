// =====================================================================
//  LES MONTURES : ce qui fait rouler un engin, quel qu'il soit
// =====================================================================
// Le vélo (js/velo.js) en hérite ; la trottinette et le skate aussi (lot C4, par js/monture_cavalier.js). Ici, tout
// ce qui ne dépend PAS de l'engin : l'état (vitesse, cap, braquage, inclinaison, arrêt...), la conduite (propulsion,
// freinage, direction, inclinaison d'équilibre), ce qui l'arrête (limites, obstacles, relief), la pente et la
// gravité, le réseau. Ce qui dépend de l'engin — le modèle, sa pose à l'écran, le pédalier qui tourne, les ancres
// du cycliste — reste dans sa classe. Chaque engin donne ses constantes dans `P` (voir PARAMS_VELO, js/velo.js) :
// empattement, vitesses et forces de pédalage, points de contact, agent de js/monde.js ('velo', 'trottinette'...).
//
// DEUX MONDES, DEUX CODES. Sur un terrain plat (Monde.plat : La Cage, Levallois, Jemmapes, et le parc drapeau baissé),
// la conduite est EXACTEMENT celle d'avant ce fichier : mêmes opérations, dans le même ordre, sur les mêmes nombres —
// le vélo de La Cage fait la même trajectoire à l'octet près (banc de non-régression, tools/monde/LISEZMOI.md). Tout
// ce qui touche au relief est derrière `if (!Monde.plat)`.
//
// SUR LE RELIEF (parc de Bécon en entier, conception § 3.4 et lot A4) :
//  - la HAUTEUR et le TANGAGE : chaque roue se pose sur le sol sous elle, le cadre bascule de l'une à l'autre
//    (_hauteurEtTangage) ;
//  - la GRAVITÉ le long de la pente, v += -g·sin(θ)·dt, et une vitesse bornée à 10 m/s (_gravite). À l'arrêt, le
//    cycliste TIENT son vélo (frein, pied à terre) : il ne recule jamais tout seul dans une côte ;
//  - le PÉDALAGE EN CÔTE (_forceRelief) : on passe les petits braquets — la force au pédalier grandit avec la pente —,
//    dans la limite de la puissance d'un cycliste. Réglé pour que la rampe ouest du parc (8,6 % sur sa grande
//    longueur) se monte à 3,5 m/s assis et 4,8 m/s en danseuse (4,7 et 6,5 m/s sur le plat, comme à La Cage).
//    (La première formule, la force divisée par 1 + 6·pente, faisait l'inverse de ce que fait un cycliste : elle
//    retirait de la force dans la côte, et l'on montait la rampe à 2 m/s en pédalant) ;
//  - ce qui ARRÊTE (_penetrationMonde, _contact, _refus) : murs, marches de plus de 8 cm, escaliers, herbe trop raide,
//    eau (Monde.franchir, les bords d'allée adoucis) et obstacles posés du parc (Monde.resoudre) ; le vélo GLISSE le
//    long de la paroi selon sa normale (_glisserSelonNormale) au lieu de glisser selon les axes x et z, qui ne valaient
//    que pour les grillages droits de La Cage ; un ESCALIER pris de face l'arrête net (frôlé, on glisse le long de son
//    bord), et le jeu affiche « Descends du vélo » (`blocage`).
import * as THREE from 'three';
import { Monde, AGENTS, DRAPEAU } from './monde.js';

export const GRAVITE = 9.81;
// La vitesse la plus grande sur le relief, dans un sens comme dans l'autre : au-delà, on ne tient plus le guidon
// dans les virages de la rampe est. (Le vélo n'y arrive guère : en roue libre, la traînée l'arrête vers 7,9 m/s sur
// les 10,5 % de la rampe est. C'est un garde-fou pour les pentes plus raides à venir.)
export const VMAX_RELIEF = 10;
// LE BRAQUET DE CÔTE : sur une pente p (en montée), la force au pédalier est multipliée par 1 + BRAQUET·p. C'est ce
// que fait le dérailleur : un petit braquet transforme le même effort en plus de poussée, à plus basse vitesse.
const BRAQUET = 2.9;
// LA PUISSANCE du cycliste, par kilogramme (W/kg, soit des m²/s³) : dans une côte, la poussée ne dépasse jamais
// PUISSANCE / v. Assis, on en reste loin (4,1 W/kg à 3,5 m/s sur la rampe ouest) ; en danseuse, c'est elle qui fixe
// la vitesse de montée (4,8 m/s à 8,6 %). La limite entre en jeu progressivement sur les 2 premiers pour cent de
// pente (PENTE_PLEINE) : sur le plat, la conduite reste celle de La Cage.
const PUISSANCE = 6.35;
const PENTE_PLEINE = 0.02;
// En dessous de cette vitesse (m/s), le cycliste est à l'arrêt ou presque : dans une côte, la gravité l'arrête mais
// ne le fait pas reculer (il freine, il pose le pied) ; dans une descente, elle ne le relance pas tant qu'il ne
// pédale pas (il tient ses freins). Au-dessus, elle joue pleinement : c'est la roue libre.
const TENUE = 0.3;
// Ce qui arrête, du plus fort au plus faible : c'est le plus fort qui décide de la suite (arrêt net pour un escalier).
const RANG = { escalier: 5, mur: 4, eau: 3, pente: 2, obstacle: 1 };
// UN ESCALIER PRIS DE FACE ou frôlé : au-delà de cette part du pas qui entre dans l'escalier (0,5 : plus de 30° entre
// le pas et le bord des marches), c'est une arrivée sur l'escalier, arrêt net ; en deçà, la roue frôle le haut des
// marches en longeant l'allée (la rampe est passe ainsi au ras de l'escalier de 34 marches) et le vélo glisse le long
// du bord comme le long d'un mur, sans s'arrêter.
const ESCALIER_DE_FACE = 0.5;
// Au-delà de cette pente (10 %), un sol refusé au vélo est « trop raide » ; en deçà, c'est un sol qui n'est pas un
// chemin (sable et copeaux des aires de jeux, béton des gradins) : le message de Game.signalerBlocageVelo le dit.
const PENTE_RAIDE = 0.10;
// En glissant le long d'une paroi sur le relief, la part du pas (0,1 puis 0,4) dont la roue qui frotte s'en DÉCOLLE
// (voir _glisserSelonNormale) : 7 mm par image à 4 m/s, invisible, mais la roue ne reste pas collée pile sur le bord.
const DECOLLE = [0.1, 0.4];
// (relecture R2) Hors de l'allée, on ne fait que la rejoindre (voir _refus) : jusqu'à cette distance (m) d'un nœud
// cyclable. Au-delà, le vélo est perdu loin de tout chemin et reste libre d'en sortir.
const DIST_ALLEE = 3;

export class Monture {
  // `P` : les constantes de l'engin (voir plus haut). `penche` au repos : < 0 = appuyé sur son flanc droit (contre
  // le grillage), > 0 = sur sa béquille.
  constructor({ x = 0, z = 0, cap = 0, penche = 0.13, conduisible = true, appui = 'bequille' } = {}, P) {
    this.P = P;
    this.conduisible = conduisible;
    // ---- état ----
    this.pos = new THREE.Vector3(x, 0, z);
    this.cap = cap;
    this.v = 0;                    // vitesse (m/s), négative = on recule en poussant avec les pieds
    this.braq = 0;                 // angle de braquage (rad), > 0 = vers la gauche
    this.penche = appui === 'grillage' ? -Math.abs(penche) : penche;
    this.manivelle = 0.6;          // angle du pédalier
    this.roue = 0;                 // angle des roues
    this.bequille = appui === 'bequille' ? 1 : 0;
    this.hSelle = P.hSelle;
    this.effort = 0;               // on pédale (0..1)
    this.arret = 0;                // arrêté, pied à terre (0..1)
    this.danseuse = 0;             // debout sur les pédales, au sprint (0..1)
    this.pris = false;             // quelqu'un est dessus
    this.balancier = 0;            // roulis ajouté en danseuse (affichage)
    this.appui = appui;            // 'grillage' | 'bequille' | null (roule)
    this.pente = 0;                // pente sous les roues sur le relief (+ = ça monte), 0 sur un terrain plat
    // Ce qui vient d'arrêter l'engin sur le relief, à ce pas-ci (null sinon) : { type, aPied, raide } — `aPied` : un
    // piéton passerait là (marche, escalier, talus) ; `raide` : le sol refusé est en pente de plus de 10 % (sinon, ce
    // n'est simplement pas un chemin). Le jeu en tire « Descends du vélo » (Game.updateVelo).
    this.blocage = null;
    // interpolation d'affichage
    this.prec = { x, z, cap, penche: this.penche, manivelle: this.manivelle, roue: 0, braq: 0 };
    // (objets de travail du relief, déclarés ici pour que la forme de l'objet ne change pas en route ; `_ref` pointe
    // sur `_refPose` pendant un pas sur le relief, null sinon)
    this._ref = null;
    this._refPose = { x: 0, z: 0, cap: 0 };
    this._q = { x: 0, z: 0 };
    this._n = { x: 0, y: 1, z: 0 };
    this._ht = { y: 0, pente: 0, tangage: 0 };
    this._c = { nx: 0, nz: 0, l: 0, type: null, aPied: false, raide: false };
    this._coinDehors = 0;
    // (relecture R2 : hors de l'allée, voir _refus) le pas en cours est-il un pivot sur place ; le nœud cyclable le plus
    // proche du dernier point mesuré par _distanceAllee, et ses deux dernières réponses
    this._pivot = false;
    this._noeudAllee = { x: 0, z: 0 };
    this._memoAllee = [0, 1].map(() => ({ R: null, x: 0, z: 0, bit: 0, dx: 0, d: 0, nx: 0, nz: 0 }));
    this._memoI = 0;
  }

  // ======================================================================== CONDUITE
  // `e` = { x, y, sprint } : x > 0 = à droite, y > 0 = pédaler, y < 0 = freiner (puis reculer en poussant).
  //
  // Le braquage suit le modèle cinématique de la bicyclette — la roue arrière avance dans l'axe du cadre, la
  // roue avant dans l'axe de la fourche — donc le vélo tourne à la vitesse v·tan(braquage)/empattement. Le
  // braquage MAXIMAL diminue avec la vitesse : à l'arrêt on tourne le guidon d'un quart de tour, lancé à
  // trente à l'heure on ne le bouge presque plus. Sans cette réduction, le vélo pivote sur place à pleine
  // vitesse et ressemble à un jouet.
  //
  // L'inclinaison, elle, n'est pas décorative : c'est celle qui équilibre la force centrifuge, atan(v²/(g·R)).
  conduire(e, dt, bornes, obstacles = []) {
    const P = this.P, ax = e.x || 0, ay = e.y || 0, sprint = !!e.sprint;
    this.blocage = null;
    // On part peut-être DÉJÀ contre un obstacle : le vélo du terrain est garé contre le grillage. On refuse
    // donc seulement ce qui ENFONCE davantage, pas ce qui touche — sinon il ne pourrait jamais repartir.
    this._ref = null;              // (relief : le pas de départ ne se compare à rien, voir _penetrationMonde)
    const avant = this.pos.clone(), capAvant = this.cap, p0 = this._penetration(bornes, obstacles);
    if (!Monde.plat) { const r = this._refPose; r.x = avant.x; r.z = avant.z; r.cap = capAvant; this._ref = r; }
    this.bequille += (0 - this.bequille) * (1 - Math.exp(-dt * 7));     // béquille repliée d'un coup de talon
    // ---- propulsion et freinage ----
    const vmax = sprint ? P.vmaxDanseuse : P.vmax;
    if (ay > 0.05) {
      // sur le plat, la courbe force-vitesse d'aujourd'hui ; sur le relief, la même, plus les braquets de côte
      if (Monde.plat) this.v += ay * (sprint ? P.forceDanseuse : P.force) * Math.max(0, 1 - this.v / vmax) * dt;
      else this.v += this._forceRelief(ay, sprint, vmax) * dt;
      if (this.v < 0) this.v = Math.min(0, this.v + 3 * dt);      // on repart vers l'avant
    } else if (ay < -0.05) {
      // (lot C4 : `P.frein`, la décélération du frein de l'engin — le garde-boue de la trottinette, le pied qui traîne du
      // skate ; sans elle, les deux freins du vélo, 6,5 m/s², comme avant)
      if (this.v > 0.25) this.v = Math.max(0, this.v + ay * (P.frein || 6.5) * dt);       // frein
      else this.v = Math.max(-1.1 * -ay, this.v + ay * 1.6 * dt);             // on recule en poussant des pieds
    }
    // LA PENTE (js/monde.js) : la gravité freine à la montée et entraîne à la descente. Jamais sur un terrain plat.
    if (!Monde.plat) this._gravite(dt, ay);
    // roulement et air : ~0,3 m/s² à 20 km/h, en roue libre (lot C4 : un engin peut donner la sienne, _trainee — les
    // petites roues de la trottinette et du skate freinent selon le sol ; le vélo garde exactement celle-ci)
    const trainee = this._trainee ? this._trainee(dt) : (0.16 + 0.014 * this.v * this.v) * dt;
    if (Math.abs(this.v) <= trainee) this.v = 0; else this.v -= Math.sign(this.v) * trainee;
    // ---- direction ----
    const vAbs = Math.abs(this.v);
    const braqMax = 0.62 + (0.17 - 0.62) * Math.min(1, vAbs / 7);
    const cible = -ax * braqMax;
    this.braq += (cible - this.braq) * (1 - Math.exp(-dt * 9));
    let omega = this.v * Math.tan(this.braq) / P.empattement;
    // À L'ARRÊT on peut quand même tourner : le cycliste, pied à terre, fait pivoter son vélo à petits pas.
    // Sans ça, un vélo arrêté face au grillage était coincé pour de bon (on ne tourne pas sans rouler).
    if (vAbs < 0.4) omega += -ax * 0.9 * (1 - vAbs / 0.4);
    this.cap += omega * dt;
    // ---- inclinaison ----
    const effortCible = ay > 0.05 ? Math.min(1, ay * 1.2) : 0;
    this.effort += (effortCible - this.effort) * (1 - Math.exp(-dt * 8));
    // en danseuse : on se lève sur les pédales dès qu'on sprinte, et on se rassoit en roue libre
    const dCible = sprint && ay > 0.05 && this.v > 0.3 ? 1 : 0;
    this.danseuse += (dCible - this.danseuse) * (1 - Math.exp(-dt * 5));
    const arretCible = vAbs < 0.2 && ay <= 0.05 ? 1 : 0;
    this.arret += (arretCible - this.arret) * (1 - Math.exp(-dt * (arretCible ? 3.5 : 7)));
    let pencheCible = Math.atan(this.v * omega / 9.81);
    pencheCible = Math.max(-0.55, Math.min(0.55, pencheCible));
    pencheCible += 0.10 * this.arret;                              // à l'arrêt : pied gauche à terre, vélo penché
    this.penche += (pencheCible - this.penche) * (1 - Math.exp(-dt * 6));
    // ---- déplacement (roue arrière dans l'axe), et ce qui l'arrête ----
    // On essaie, dans l'ordre : le mouvement complet ; le même en gardant l'ancien cap (tourner faisait
    // pivoter une roue dans le grillage) ; puis on GLISSE le long de ce qui arrête — selon les axes sur un terrain
    // plat (les grillages et les gradins y sont alignés sur les axes), selon la normale de la paroi sur le relief —
    // : le vélo FROTTE et s'aligne au lieu de se planter. En dernier recours, choc franc : on rebondit à peine et on
    // s'arrête.
    const capNeuf = this.cap, d = this.v * dt;
    this._pivot = Math.abs(d) < 1e-6;           // (relecture R2 : voir _refus, hors de l'allée)
    const essai = (cap, sx, sz) => {
      this.cap = cap;
      this.pos.set(avant.x + Math.sin(cap) * d * sx, 0, avant.z + Math.cos(cap) * d * sz);
      return this._penetration(bornes, obstacles) <= p0 + 1e-5;
    };
    if (!essai(capNeuf, 1, 1) && !essai(capAvant, 1, 1)) {
      if (Monde.plat) this._glisserSelonAxes(essai, avant, capAvant, capNeuf, d, dt, bornes, obstacles, p0);
      else this._glisserSelonNormale(avant, capAvant, capNeuf, d, dt, bornes, obstacles, p0);
    }
    // ---- ce qui tourne sur l'engin (pédalier et roues du vélo) ----
    this._animer(dt);
  }

  // Ce que l'engin anime en roulant (le vélo : ses roues et son pédalier). Rien par défaut.
  _animer(dt) {}

  // Le glissement d'un terrain PLAT (celui d'avant ce fichier, tel quel) : pour chacun des deux caps, le glissement
  // le long de l'axe x ou z qui n'enfonce pas.
  _glisserSelonAxes(essai, avant, capAvant, capNeuf, d, dt, bornes, obstacles, p0) {
    let glisse = null;
    for (const cap of [capNeuf, capAvant]) {
      const ax2 = Math.abs(Math.sin(cap)), az2 = Math.abs(Math.cos(cap));
      for (const [sx, sz] of ax2 > az2 ? [[1, 0], [0, 1]] : [[0, 1], [1, 0]]) {
        if ((sx ? ax2 : az2) * Math.abs(d) > 1e-6 && essai(cap, sx, sz)) { glisse = [cap, sx, sz]; break; }
      }
      if (glisse) break;
    }
    if (glisse) {
      const [cap, sx, sz] = glisse;
      const frot = sx ? Math.abs(Math.cos(cap)) : Math.abs(Math.sin(cap));      // part de l'élan contre la paroi
      this.v *= 1 - Math.min(0.9, frot * 5 * dt);
      // le vélo s'aligne peu à peu sur la paroi, s'il le peut sans s'y enfoncer
      const capG = Math.atan2(sx * Math.sign(Math.sin(cap) * d), sz * Math.sign(Math.cos(cap) * d)) + (this.v < 0 ? Math.PI : 0);
      let dc = capG - cap; dc = Math.atan2(Math.sin(dc), Math.cos(dc));
      this.cap = cap + dc * (1 - Math.exp(-dt * 3));
      if (this._penetration(bornes, obstacles) > p0 + 1e-5) this.cap = cap;
    } else {
      this.pos.copy(avant); this.cap = capAvant;
      this.v *= -0.15;
    }
  }

  // De combien l'engin est-il DANS le décor : somme, sur ses points de contact (les deux roues et le milieu pour le
  // vélo), des profondeurs de pénétration dans les limites de la cour et dans les obstacles.
  _penetration(B, obstacles) {
    const fx = Math.sin(this.cap), fz = Math.cos(this.cap), marge = 0.18;
    let p = 0;
    for (const k of this.P.contacts) {
      const x = this.pos.x + fx * k, z = this.pos.z + fz * k;
      if (B) p += Math.max(0, B.xMin + marge - x) + Math.max(0, x - B.xMax + marge) + Math.max(0, B.zMin + marge - z) + Math.max(0, z - B.zMax + marge);
      for (const o of obstacles) {
        if (o.box) {
          const px = o.hx + 0.12 - Math.abs(x - o.x), pz = o.hz + 0.12 - Math.abs(z - o.z);
          if (px > 0 && pz > 0) p += Math.min(px, pz);
        } else if (o.r !== undefined) p += Math.max(0, o.r * 0.7 + 0.1 - Math.hypot(x - o.x, z - o.z));
      }
    }
    if (!Monde.plat) p += this._penetrationMonde();
    return p;
  }

  // ======================================================================== LE RELIEF (js/monde.js)
  // Rien de ce qui suit ne s'exécute sur un terrain plat (Monde.plat).

  // Hauteur du cadre et tangage en (x, z) au cap `cap` : chaque roue se pose sur le sol sous elle (lu dans la nappe
  // du milieu du vélo : au pied d'un mur, une roue ne lit pas le sol du haut de la terrasse), le cadre prend la
  // moyenne des deux hauteurs et bascule de l'une à l'autre. `pente` = dénivelé par mètre (+ = ça monte devant),
  // `tangage` = l'angle correspondant (+ = nez levé). `out` reçoit { y, pente, tangage }.
  _hauteurEtTangage(x, z, cap, out = this._ht) {
    const fx = Math.sin(cap), fz = Math.cos(cap), E = this.P.empattement, e = E / 2, n = Monde.nappe(x, z);
    const hAv = Monde.solNappe(x + fx * e, z + fz * e, n), hAr = Monde.solNappe(x - fx * e, z - fz * e, n);
    out.y = (hAv + hAr) / 2;
    out.pente = (hAv - hAr) / E;
    out.tangage = Math.atan(out.pente);
    return out;
  }

  // LA POUSSÉE DU PÉDALAGE sur le relief (m/s²) : la courbe force-vitesse du plat — on pousse fort au démarrage, plus
  // du tout à la vitesse de pointe —, et dans une côte les petits braquets (× 1 + BRAQUET·p) dans la limite de la
  // puissance du cycliste (PUISSANCE / v, en proportion de l'appui sur la commande). Sur le plat et en descente,
  // exactement la poussée de La Cage.
  _forceRelief(ay, sprint, vmax) {
    const P = this.P, p = this.pente;
    let f = ay * (sprint ? P.forceDanseuse : P.force) * Math.max(0, 1 - this.v / vmax);
    if (p > 0 && f > 0) {
      f *= 1 + BRAQUET * p;
      const plafond = ay * PUISSANCE / Math.max(this.v, 0.5), w = Math.min(1, p / PENTE_PLEINE);
      if (f > plafond) f += (plafond - f) * w;
    }
    return f;
  }

  // LA GRAVITÉ le long de la pente sous les roues, v += -g·sin(θ)·dt, et la vitesse bornée à 10 m/s.
  //  - lancé (v > TENUE) : elle joue pleinement, freine dans la côte, entraîne dans la descente (roue libre) ;
  //  - à l'arrêt ou presque : dans une côte, elle arrête le vélo sans jamais le faire reculer (le cycliste freine, pose
  //    le pied) ; dans une descente, elle ne le relance que s'il pédale (sinon il tient ses freins) ;
  //  - en marche arrière (on recule en poussant des pieds), elle ne joue pas tant qu'on pousse : les pieds tiennent le
  //    vélo. Relâché, un recul qui REMONTE la pente s'arrête (sans elle, il filait sur son élan : 2,5 m en 3 s à
  //    reculons vers le haut de la rampe est) ; un recul qui la descend reste retenu, le frottement l'éteint.
  _gravite(dt, ay) {
    const s = this._hauteurEtTangage(this.pos.x, this.pos.z, this.cap).pente;
    this.pente = s;
    const dv = GRAVITE * (s / Math.sqrt(1 + s * s)) * dt;
    if (this.v > TENUE) this.v -= dv;
    else if (this.v >= 0 && (dv > 0 || ay > 0.05)) this.v = Math.max(0, this.v - dv);
    else if (this.v < 0 && dv < 0 && ay > -0.05) this.v = Math.min(0, this.v - dv);
    this.v = Math.max(-VMAX_RELIEF, Math.min(VMAX_RELIEF, this.v));
  }

  // LE PAS D'UN POINT DE CONTACT, de (rx, rz) à (x, z) : Monde.franchir pour l'engin, à un détail près — les BORDS
  // D'ALLÉE ADOUCIS. Le drapeau « cyclable » est porté par les nœuds de la grille (tous les 50 cm) et Monde.franchir lit
  // celui du nœud le plus proche : le bord d'une allée est donc un escalier de carrés de 50 cm, et une roue qui en
  // frôle un coin s'y arrête net (arrêtée à 1 cm, libre à 5 cm : le vélo restait planté au bas de la rampe est, dans
  // le virage de la fourche). Pour cette règle-là seulement (le drapeau « cyclable » : refus de type « pente »), on
  // regarde le poids des nœuds cyclables autour du point, en bilinéaire : à partir de la moitié, le point est sur
  // l'allée. Le bord suit alors la ligne à mi-chemin des nœuds, coins arrondis — ni plus large, ni plus étroit en ligne
  // droite. On ne quitte pas l'allée ainsi dessinée (même d'un nœud déjà non cyclable, que Monde.franchir laisserait
  // sortir) ; on n'y est jamais prisonnier (déjà dehors, on peut bouger — depuis la relecture R2, pour la rejoindre
  // seulement, voir plus bas). La marche (hauteur) reste vérifiée ; un
  // escalier, l'eau, un mur, le bord du monde ne changent pas (l'escalier et l'eau, pris depuis l'allée, prennent
  // seulement la normale de son bord adouci).
  // (lot C4) L'agent de Monde.franchir peut dépendre du SOL d'arrivée (_agentSol) : la trottinette suit les seuils de
  // l'agent « trottinette » de js/monde.js (pente de 10 % au plus) sur le gravier grossier, ceux des allées ailleurs —
  // elle descend ainsi la rampe est (10,6 %). Sans _agentSol (le vélo), c'est P.agent, comme avant.
  _refus(rx, rz, x, z) {
    const P = this.P, agent = this._agentSol ? this._agentSol(x, z) : P.agent;
    const A = AGENTS[agent], bit = A.drapeau, y0 = Monde.sol(rx, rz);
    const b = Monde.franchir(rx, rz, y0, x, z, agent);
    // (un refus « pente » sur un nœud cyclable vient de la pente maximale de l'engin, pas du drapeau : tel quel ; un mur,
    // le bord du monde aussi)
    if (!bit || (b && (b.type === 'mur' || b.type === 'obstacle')) || (b && (Monde.drapeaux(x, z) & bit))) return b;
    if (b && b.type !== 'pente') {
      // un escalier, l'eau : refusés tels quels, au nœud le plus proche ; mais, depuis l'allée, avec la normale de son
      // bord adouci (voir plus bas) — au coin d'une volée qui s'ouvre sur le côté de la rampe est, celle de franchir
      // tournait le vélo qui longeait la rampe face aux marches, et il s'arrêtait net au lieu de glisser
      if (this._poidsDrapeau(rx, rz, bit) >= 0.5) this._normaleBord(x, z, rx, rz, bit, b);
      return b;
    }
    const wArrivee = this._poidsDrapeau(x, z, bit), f = this._coinDehors, wDepart = this._poidsDrapeau(rx, rz, bit);
    if (wArrivee >= 0.5 || wDepart < 0.5) {
      // (relecture R2) HORS DE L'ALLÉE, ON NE FAIT QUE LA REJOINDRE. Un point de contact déjà dehors n'y est pas
      // prisonnier ; mais tel quel, il y était LIBRE : un vélo sur l'herbe trop raide, le sable, les copeaux — garé là par
      // le réseau, ou poussé hors du chemin — y roulait où il voulait, et glissait le long des troncs et des grilles (la
      // poussée de Monde.resoudre donne la normale du glissement, sans regarder où elle mène) sur des dizaines de mètres
      // de sol marchable non cyclable (sur la pelouse du kiosque de Z16, vers (-86 ; 125) : 8 m en 3 s, parti arrêté, à
      // 2 m du chemin et parallèle à lui). Désormais, en roulant, un pas qui laisse
      // ce point dehors doit RAPPROCHER LE VÉLO de l'allée (_versAllee : son milieu, pas chacun de ses points de contact)
      // ; sinon il est refusé, avec une normale tournée vers l'allée la plus proche : le vélo glisse vers elle en longeant
      // (le décollement de _glisserSelonNormale l'en rapproche à chaque pas), ou s'arrête s'il lui tourne le dos
      // (« Descends du vélo ») ; à l'arrêt, il pivote librement pour lui faire face (this._pivot : un pivot sur place ne
      // promène pas le vélo).
      if (wArrivee < 0.5 && !this._pivot && !this._versAllee(bit)) {
        const N = this._noeudAllee, cx = this.pos.x, cz = this.pos.z, l = Math.hypot(N.x - cx, N.z - cz) || 1;
        return { nx: (N.x - cx) / l, nz: (N.z - cz) / l, type: b ? b.type : 'pente' };
      }
      if (!b) return null;
      // (franchir a refusé le drapeau avant de mesurer la marche : on la mesure)
      const dy = Monde.sol(x, z) - y0;
      return dy > A.monter || -dy > A.descendre ? { nx: b.nx, nz: b.nz, type: 'mur' } : null;
    }
    // on quitterait l'allée adoucie : refusé. La nature : celle que franchir a donnée s'il a refusé (le drapeau, 'pente'),
    // sinon celle du nœud d'à côté qui n'est pas sur l'allée (un escalier arrête net, l'eau, le talus). La normale :
    // TOUJOURS celle du bord adouci, tournée vers l'allée — celle de franchir, prise aux huit voisins du nœud le plus
    // proche, peut ne rien dire d'un bord aux coins arrondis ; elle retombe alors sur « d'où l'on vient », et une roue
    // qui frôlait le bord à 4° était arrêtée comme de face (rampe est, au ras du haut de l'escalier de 34 marches).
    const type = b ? b.type : f === 0 ? 'obstacle' : (f & DRAPEAU.EAU) ? 'eau' : (!A.escalier && (f & DRAPEAU.ESCALIER)) ? 'escalier' : 'pente';
    return this._normaleBord(x, z, rx, rz, bit, { nx: 0, nz: 0, type });
  }
  // La normale du BORD ADOUCI de l'allée en (x, z) — le gradient du poids du drapeau, tourné vers l'allée —, écrite dans
  // `out` ({ nx, nz }), rendu. (Sans gradient, loin de tout bord : d'où l'on vient.)
  _normaleBord(x, z, rx, rz, bit, out) {
    const e = 0.25;
    let nx = this._poidsDrapeau(x + e, z, bit) - this._poidsDrapeau(x - e, z, bit), nz = this._poidsDrapeau(x, z + e, bit) - this._poidsDrapeau(x, z - e, bit);
    let l = Math.hypot(nx, nz);
    if (l < 1e-6) { nx = rx - x; nz = rz - z; l = Math.hypot(nx, nz) || 1; }
    out.nx = nx / l; out.nz = nz / l;
    return out;
  }
  // Part (0 à 1) des quatre nœuds de la grille autour de (x, z) qui portent le drapeau `bit`, pondérée en bilinéaire.
  // (this._coinDehors : les drapeaux du plus proche des quatre qui ne le porte pas)
  _poidsDrapeau(x, z, bit) {
    const R = Monde.repere;
    if (!R) return 1;
    const fi = (x - Monde.dx - R.x0) / R.pas, fk = (z - R.z0) / R.pas, i = Math.floor(fi), k = Math.floor(fk);
    const u = fi - i, v = fk - k, x0 = R.x0 + Monde.dx + i * R.pas, z0 = R.z0 + k * R.pas, s = R.pas;
    let w = 0, wd = -1;
    const coin = (xx, zz, p) => {
      const f = Monde.drapeaux(xx, zz);
      if (f & bit) w += p; else if (p > wd) { wd = p; this._coinDehors = f; }
    };
    coin(x0, z0, (1 - u) * (1 - v)); coin(x0 + s, z0, u * (1 - v)); coin(x0, z0 + s, (1 - u) * v); coin(x0 + s, z0 + s, u * v);
    return w;
  }
  // (relecture R2) Le pas en cours, de la pose de départ (this._ref) à la pose essayée (this.pos), rapproche-t-il LE VÉLO
  // de l'allée ? On regarde son MILIEU : arrivé sur l'allée adoucie, oui ; sinon, sa distance au plus proche nœud
  // cyclable doit baisser — c'est la pente de la carte des distances, qui n'a pas de creux hors de l'allée : depuis
  // n'importe quel point, un pas vers le chemin le plus proche est accepté. (Une première version demandait à chaque
  // point de contact de se rapprocher de SON nœud le plus proche : entre deux allées, ou au bord d'un îlot cyclable, la
  // roue arrière visait l'un et la roue avant l'autre, et le vélo restait planté face au chemin — sur la pelouse du
  // kiosque de Z16, vers (-86 ; 125), trois caps sur quatre étaient refusés.) Un pas qui longe l'allée sans s'en
  // approcher ne compte pas : on ne se promène pas à côté du chemin. Aucun nœud cyclable à moins de DIST_ALLEE du
  // départ : le vélo est perdu loin de tout chemin, il reste libre (on n'est jamais prisonnier). this._noeudAllee : le
  // nœud le plus proche du milieu de la pose essayée.
  _versAllee(bit) {
    const R = this._ref;
    if (!R || this._poidsDrapeau(this.pos.x, this.pos.z, bit) >= 0.5) return true;
    const dD = this._distanceAllee(R.x, R.z, bit);
    return dD === Infinity || this._distanceAllee(this.pos.x, this.pos.z, bit) < dD - 1e-6;
  }
  // Distance de (x, z) au plus proche nœud de la grille qui porte le drapeau `bit`, jusqu'à DIST_ALLEE (Infinity au-delà) ;
  // ce nœud dans this._noeudAllee. (Les trois points de contact d'une pose posent la même question pour son milieu, et
  // la pose de départ revient à chaque essai : les deux dernières réponses sont gardées.)
  _distanceAllee(x, z, bit) {
    const R = Monde.repere, N = this._noeudAllee;
    if (!R) return 0;
    const memo = this._memoAllee;
    for (const m of memo) if (m.R === R && m.x === x && m.z === z && m.bit === bit && m.dx === Monde.dx) { N.x = m.nx; N.z = m.nz; return m.d; }
    const s = R.pas, n = Math.ceil(DIST_ALLEE / s), i0 = Math.round((x - Monde.dx - R.x0) / s), k0 = Math.round((z - R.z0) / s);
    let d2 = Infinity;
    for (let k = k0 - n; k <= k0 + n; k++) for (let i = i0 - n; i <= i0 + n; i++) {
      const xx = R.x0 + Monde.dx + i * s, zz = R.z0 + k * s, e = (xx - x) * (xx - x) + (zz - z) * (zz - z);
      if (e < d2 && (Monde.drapeaux(xx, zz) & bit)) { d2 = e; N.x = xx; N.z = zz; }
    }
    const d = d2 <= DIST_ALLEE * DIST_ALLEE ? Math.sqrt(d2) : Infinity;
    const m = memo[this._memoI = (this._memoI + 1) % 2];
    m.R = R; m.x = x; m.z = z; m.bit = bit; m.dx = Monde.dx; m.d = d; m.nx = N.x; m.nz = N.z;
    return d;
  }

  // Ce que le monde ajoute à la pénétration : pour chacun des points de contact, un pas refusé depuis sa position de
  // départ (mur, marche de plus de 8 cm, escalier, herbe trop raide, eau : _refus) compte comme un enfoncement franc ;
  // et les obstacles posés du parc, par la profondeur dont resoudre() repousserait le point.
  _penetrationMonde() {
    const P = this.P, fx = Math.sin(this.cap), fz = Math.cos(this.cap), R = this._ref, q = this._q;
    let p = 0;
    for (const k of P.contacts) {
      const x = this.pos.x + fx * k, z = this.pos.z + fz * k;
      if (R) {
        const rx = R.x + Math.sin(R.cap) * k, rz = R.z + Math.cos(R.cap) * k;
        if (this._refus(rx, rz, x, z)) p += 1;
      }
      q.x = x; q.z = z;
      if (Monde.resoudre(q, P.rayonContact, P.agent)) p += Math.hypot(q.x - x, q.z - z);
    }
    return p;
  }

  // CE QUI ARRÊTE l'engin dans sa pose actuelle (pos, cap), depuis sa pose de départ (_ref) : la somme des normales
  // (horizontales, tournées vers l'engin) de tout ce qui retient ses points de contact — limites de la cour et
  // obstacles d'aujourd'hui, pas refusés par Monde.franchir, obstacles posés du parc —, sa nature la plus forte
  // (RANG) et `aPied` : un piéton, lui, passerait (une marche, un escalier, un talus d'herbe). Rend this._c.
  _contact(B, obstacles) {
    const P = this.P, fx = Math.sin(this.cap), fz = Math.cos(this.cap), R = this._ref, q = this._q, c = this._c, marge = 0.18;
    c.nx = 0; c.nz = 0; c.l = 0; c.type = null; c.aPied = false; c.raide = false;
    let rang = 0;
    const ajouter = (nx, nz, type) => { c.nx += nx; c.nz += nz; if (RANG[type] > rang) { rang = RANG[type]; c.type = type; } };
    for (const k of P.contacts) {
      const x = this.pos.x + fx * k, z = this.pos.z + fz * k;
      if (B) {
        if (x < B.xMin + marge) ajouter(1, 0, 'obstacle');
        if (x > B.xMax - marge) ajouter(-1, 0, 'obstacle');
        if (z < B.zMin + marge) ajouter(0, 1, 'obstacle');
        if (z > B.zMax - marge) ajouter(0, -1, 'obstacle');
      }
      for (const o of obstacles) {
        if (o.box) {
          const px = o.hx + 0.12 - Math.abs(x - o.x), pz = o.hz + 0.12 - Math.abs(z - o.z);
          if (px > 0 && pz > 0) {
            if (px < pz) ajouter(x < o.x ? -1 : 1, 0, 'obstacle'); else ajouter(0, z < o.z ? -1 : 1, 'obstacle');
          }
        } else if (o.r !== undefined) {
          const dx = x - o.x, dz = z - o.z, l = Math.hypot(dx, dz);
          if (l < o.r * 0.7 + 0.1 && l > 1e-9) ajouter(dx / l, dz / l, 'obstacle');
        }
      }
      if (R) {
        const rx = R.x + Math.sin(R.cap) * k, rz = R.z + Math.cos(R.cap) * k;
        const b = this._refus(rx, rz, x, z);
        if (b) {
          ajouter(b.nx, b.nz, b.type);
          if (!Monde.franchir(rx, rz, Monde.sol(rx, rz), x, z, 'pieton')) c.aPied = true;
          if (b.type === 'pente' && !c.raide) {
            const nn = Monde.normale(x, z, this._n);
            c.raide = Math.hypot(nn.x, nn.z) > PENTE_RAIDE * nn.y;
          }
        }
      }
      q.x = x; q.z = z;
      if (Monde.resoudre(q, P.rayonContact, P.agent)) {
        const dx = q.x - x, dz = q.z - z, l = Math.hypot(dx, dz);
        if (l > 1e-9) ajouter(dx / l, dz / l, 'obstacle');
      }
    }
    c.l = Math.hypot(c.nx, c.nz);
    if (c.l > 1e-9) { c.nx /= c.l; c.nz /= c.l; }
    return c;
  }

  // LE GLISSEMENT SUR LE RELIEF (le mouvement complet et le même sans tourner viennent d'être refusés). On mesure ce
  // qui arrête à la pose refusée (_contact) :
  //  - un ESCALIER pris de face (plus de 30°, ESCALIER_DE_FACE) : arrêt net, sans rebond, et `blocage` (« Descends du
  //    vélo ») ;
  //  - sinon, on garde la part du pas qui LONGE la paroi (le pas moins sa composante le long de la normale), avec le
  //    nouveau cap puis l'ancien : le vélo frotte (il perd la part de son élan qui allait dans la paroi) et s'aligne
  //    peu à peu sur elle, comme le long des grillages de La Cage — mais sur un mur en biais, un bord d'allée courbe,
  //    un tronc, le haut d'un escalier frôlé ;
  //  - de face (moins de 15 % du pas le long de la paroi) ou quand même glisser ne passe pas : choc franc, le vélo
  //    rebondit à peine et s'arrête (arrêt net contre un escalier) ; si un piéton passerait là (une marche, un talus),
  //    `blocage` le dit.
  _glisserSelonNormale(avant, capAvant, capNeuf, d, dt, bornes, obstacles, p0) {
    this.cap = capNeuf;
    this.pos.set(avant.x + Math.sin(capNeuf) * d, 0, avant.z + Math.cos(capNeuf) * d);
    const c = this._contact(bornes, obstacles), type = c.type, aPied = c.aPied, raide = c.raide;
    const mx = this.pos.x - avant.x, mz = this.pos.z - avant.z, m = Math.hypot(mx, mz), mn = mx * c.nx + mz * c.nz;
    const escalierDeFace = type === 'escalier' && !(c.l > 1e-9 && -mn < ESCALIER_DE_FACE * m);
    if (!escalierDeFace && c.l > 1e-9 && m > 1e-9) {
      // la part du pas qui entre dans la paroi — nulle quand le pas s'en écarte : le bord adouci d'une allée en biais
      // ondule d'un nœud à l'autre, et le vélo déjà aligné sur le bord en touche une bosse ; il n'y avait alors rien à
      // retrancher, on ne glissait pas et c'était le choc franc (la plupart des arrêts le long des rampes)
      const mnE = Math.min(0, mn), tx = mx - mnE * c.nx, tz = mz - mnE * c.nz;
      if (Math.hypot(tx, tz) > 0.15 * m) {
        // (DÉCOLLER : à la part qui longe la paroi, on ajoute un soupçon du pas vers le dehors de la paroi — DECOLLE. La
        // roue qui frotte est pile sur le bord (au poids 0,5 de l'allée adoucie, au ras d'un mur), et la normale, prise en
        // différences finies, n'est jamais tout à fait celle du bord : le pas « tangent » la faisait passer de quelques
        // millimètres dehors, il était refusé, et le vélo s'arrêtait comme de face — 145 frôlements sur 234, à 4-15°
        // contre les bords des allées de la boucle, finissaient arrêtés net sur « Descends du vélo ».)
        for (const decolle of DECOLLE) for (const cap of [capNeuf, capAvant]) {
          this.cap = cap;
          this.pos.set(avant.x + tx + c.nx * decolle * m, 0, avant.z + tz + c.nz * decolle * m);
          if (this._penetration(bornes, obstacles) > p0 + 1e-5) continue;
          const frot = Math.min(1, -mnE / m);                      // part de l'élan contre la paroi
          this.v *= 1 - Math.min(0.9, frot * 5 * dt);
          // le vélo s'aligne peu à peu sur la paroi, s'il le peut sans s'y enfoncer
          const capG = Math.atan2(tx, tz) + (d < 0 ? Math.PI : 0);
          let dc = capG - cap; dc = Math.atan2(Math.sin(dc), Math.cos(dc));
          this.cap = cap + dc * (1 - Math.exp(-dt * 3));
          if (this._penetration(bornes, obstacles) > p0 + 1e-5) this.cap = cap;
          return;
        }
      }
    }
    this.pos.copy(avant); this.cap = capAvant;
    if (type === 'escalier') this.v = 0; else this.v *= -0.15;
    // (le message, seulement si l'engin avançait : à l'arrêt, tourner le guidon contre le bord ne le déclenche pas)
    if ((type === 'escalier' || aPied) && m > 1e-4) this.blocage = { type, aPied: true, raide };
  }

  // ======================================================================== MONTER, DESCENDRE, GARER
  // Monter : béquille repliée, engin droit. Descendre : béquille dépliée, il se pose dessus.
  // `arret` reste à 1 en montant et en descendant : le cycliste a le pied gauche par terre.
  prendre() { this.pris = true; this.appui = null; this.arret = 1; }
  garer() { this.pris = false; this.appui = 'bequille'; this.v = 0; this.effort = 0; this.danseuse = 0; }
  // Garé SANS animation (menu, match lancé en selle) : reposer() ne tournera plus pour déplier la béquille,
  // on pose donc directement l'engin dessus. Sinon il restait figé en roulant, penché dans le vide.
  garerSec() {
    this.garer();
    this.bequille = 1; this.penche = 0.13; this.braq = 0.18; this.arret = 0;
    this.memoriser();
  }

  // Pas de simulation quand personne ne le conduit : béquille et inclinaison vont vers leur position de repos.
  reposer(dt) {
    const k = 1 - Math.exp(-dt * 5);
    const bq = this.appui === 'bequille' ? 1 : 0;
    this.bequille += (bq - this.bequille) * k;
    if (this.appui === 'bequille') this.penche += (0.13 - this.penche) * k;
    this.braq += ((this.appui ? 0.18 : 0) - this.braq) * k * 0.6;       // garé : le guidon retombe de côté
  }

  // distance horizontale au point où l'on monte (le milieu de l'engin)
  distance(x, z) { return Math.hypot(x - this.pos.x, z - this.pos.z); }

  // ======================================================================== RÉSEAU
  etatReseau() {
    const r = (v) => Math.round(v * 100) / 100;
    return [r(this.braq), r(this.manivelle % (Math.PI * 2)), r(this.penche), r(this.v), r(this.hSelle), r(this.arret), r(this.effort), r(this.danseuse)];
  }
  // Chez les autres : position et cap viennent de l'avatar ; le reste du paquet. Le pédalier ne saute pas
  // d'un paquet à l'autre : on le fait tourner à la vitesse attendue et on corrige doucement la phase.
  // (La hauteur et le tangage ne voyagent pas : chacun les relit sur son propre sol, à l'affichage.)
  appliquerReseau(vl, pos, cap, dt) {
    if (!vl) return;
    const k = 1 - Math.exp(-dt * 10);
    this.pos.copy(pos); this.cap = cap;
    this.braq += (vl[0] - this.braq) * k;
    this.penche += (vl[2] - this.penche) * k;
    this.v = vl[3]; this.hSelle = vl[4];
    // arrêt et effort arrivent douze fois par seconde : bruts, la hanche et le pied posé sautaient à chaque paquet
    this.arret += ((vl[5] || 0) - this.arret) * k; this.effort += ((vl[6] || 0) - this.effort) * k;
    this.danseuse += ((vl[7] || 0) - this.danseuse) * k;
    this.bequille += (0 - this.bequille) * k;
    if (this.effort > 0.05) this.manivelle += Math.max(3.2, (this.v / this.P.roueR) / 2.2) * this.effort * dt;
    let d = vl[1] - this.manivelle; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.manivelle += d * (1 - Math.exp(-dt * 3));
    this.roue += (this.v / this.P.roueR) * dt;
  }

  // ======================================================================== AFFICHAGE
  // La pose du pas précédent, pour interpoler l'affichage entre deux pas de simulation (voir Game.interpoler).
  memoriser() {
    const p = this.prec;
    p.x = this.pos.x; p.z = this.pos.z; p.cap = this.cap; p.penche = this.penche;
    p.manivelle = this.manivelle; p.roue = this.roue; p.braq = this.braq; p.danseuse = this.danseuse;
  }
}
