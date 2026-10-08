import * as THREE from 'three';
import { METER_TIME, PERFECT_CENTER, COURT } from './config.js';
import { ZERO, hdist, isThree, horsArc, clamp } from './util.js';

const _d = new THREE.Vector3(), _t = new THREE.Vector3(), _side = new THREE.Vector3();

// Spots d'écartement (repère du panier attaqué : x latéral, z = distance du panier vers le milieu du terrain)
const SPOTS = [
  { x: -5.4, z: 5.0 }, { x: 5.4, z: 5.0 },     // ailes
  { x: -6.2, z: 1.3 }, { x: 6.2, z: 1.3 },     // corners
  { x: 0, z: 7.6 },                            // tête de raquette
  { x: -2.4, z: 2.2 }, { x: 2.4, z: 2.2 },     // postes bas
  { x: -3.2, z: 6.8 }, { x: 3.2, z: 6.8 },     // 45°
];

// SORTIR LA BALLE (demi-terrain, Game.majSortie) : les points franchement DEHORS, derrière l'arc du panier attaqué —
// tête de raquette, 45°, ailes, corners. Angles depuis l'axe du panier, à 1,3 m au-delà de l'arc ; les corners collent
// à la ligne de touche (sur un terrain réglementaire, 90 cm seulement entre la ligne à 3 points et la touche). Bornés à
// la zone de jeu, et gardés seulement s'ils restent à 50 cm au moins derrière la ligne (petits terrains). Les vecteurs
// rendus sont réutilisés d'un appel à l'autre : on les copie si on les garde.
const ANGLES_DEHORS = [0, -0.45, 0.45, -0.95, 0.95];
const _dehors = [], _pool = Array.from({ length: 7 }, () => new THREE.Vector3());
function pointsDehors(hoop, B) {
  const R = COURT.THREE_R + 1.3, s = hoop.sgn, xc = Math.min(COURT.CORNER_X + 0.65, B.xMax - 0.2);
  _dehors.length = 0;
  let i = 0;
  const essai = (x, d) => {
    const v = _pool[i++];
    v.set(clamp(hoop.x + x, B.xMin + 0.2, B.xMax - 0.2), 0, clamp(hoop.z - s * d, B.zMin + 0.3, B.zMax - 0.3));
    if (horsArc(v, hoop, 0.5)) _dehors.push(v);
  };
  for (const a of ANGLES_DEHORS) essai(R * Math.sin(a), R * Math.cos(a));
  essai(-xc, 0.9); essai(xc, 0.9);
  return _dehors;
}

// IA d'un joueur : porteur (dribble, feintes, tir, passe), coéquipier sans balle (écartement, coupes, réception),
// défenseur (sur le porteur ou sur son vis-à-vis, interception), balle libre / rebond.
//
// ORIENTATION : toujours `faceTo(cible, true)`, c'est-à-dire un cap VISÉ vers lequel le joueur pivote à sa
// vitesse (Player.turnTo). Sans le second argument, faceTo recopie le cap d'un coup : l'IA l'appelait à
// chaque pas vers une cible qui change (le ballon, son vis-à-vis), pendant que la course tirait le cap vers
// la direction du déplacement — mesuré sur un 3 contre 3, chaque joueur pivotait de plus de 70° en moins
// d'un dixième de seconde une fois par seconde. C'était la première cause de matchs saccadés.
export class AIController {
  constructor(game, me, diff) {
    this.g = game; this.me = me; this.diff = diff;
    this.decideT = 0; this.jukeT = 0; this.juke = 1; this.holdT = 0;
    this.plan = 'drive'; this.range = 2; this.releaseAt = PERFECT_CENTER;
    this.spotShift = Math.floor(this.g.rnd() * SPOTS.length); this.spotT = 3 + this.g.rnd() * 3; this.cutT = 0;
    this.posteT = 0;                       // temps restant d'appui dos au panier (jeu de pivot)
  }

  // Choisit un "plan" selon les stats : tir à 3, mi-distance ou pénétration
  newPossession() {
    const d = this.me.def;
    const w = { three: Math.max(5, d.tp - 40) * 1.2, mid: Math.max(5, d.mid - 40), drive: Math.max(10, (d.in + d.dnk) / 2 - 30) };
    const tot = w.three + w.mid + w.drive;
    const r = this.g.rnd() * tot;
    this.plan = r < w.three ? 'three' : (r < w.three + w.mid ? 'mid' : 'drive');
    // a l'echelle de l'arc du terrain (7,24 m sur 28 m : inchange ; 5,8 au parc de Becon, ou un 3 points
    // « de 7,5 m » partait du milieu du terrain)
    const kA = COURT.L < 20 ? COURT.THREE_R / 7.24 : 1;
    this.range = this.plan === 'three' ? (7.5 + this.g.rnd() * 0.7) * kA : this.plan === 'mid' ? (3.6 + this.g.rnd() * 2) * kA : 1.6;
    this.decideT = 0.5; this.jukeT = 0.6; this.holdT = 0; this.cutT = 0;
    this.sortieT = 0; this.sortieDepuis = 0; this.sortieChoixT = 0;   // balle à ressortir (voir sortir)
    if (this.sortieCible) this.sortieCible.visee = false;
  }

  update(dt) {
    const g = this.g, me = this.me, b = g.ball, h = b.holder;
    if (h === me) { this.holdT += dt; this.offense(dt); return; }
    this.holdT = 0;
    if (b.pass) {
      if (b.pass.to === me) return this.receive(dt);
      if (b.pass.team === me.team) return this.offBall(dt, b.pass.from);
      return this.defense(dt, b.pass.to, true);
    }
    if (h) { if (h.team === me.team) this.offBall(dt, h); else this.defense(dt, h); return; }
    const shooter = (b.shot && b.shot.shooter) || (g.pendingShot && g.pendingShot.shooter);
    if (shooter && !b.touchedFloor && (b.state === 'flight' || g.pendingShot)) return this.rebound(dt, shooter);
    this.loose(dt);
  }

  // ARRIVÉE AVEC MARGE : arrivé à stopDist, on ne repart qu'au-delà de stopDist + marge (sauf si la cible
  // saute de plus d'un mètre). Sans ça un joueur posté oscillait autour de son point : arrêt, départ, arrêt,
  // et l'animation avec lui.
  moveTo(target, sprint, dt, stopDist = 0.15, marge = 0.30) {
    const A = this.arrive || (this.arrive = { on: false, x: 0, z: 0 });
    if (A.on && Math.hypot(target.x - A.x, target.z - A.z) > 1.0) A.on = false;
    _d.set(target.x - this.me.pos.x, 0, target.z - this.me.pos.z);
    const l = _d.length();
    if (l < (A.on ? stopDist + marge : stopDist)) {
      if (!A.on) { A.on = true; A.x = target.x; A.z = target.z; }
      this.me.move(ZERO, false, dt); return false;
    }
    A.on = false;
    _d.divideScalar(l);
    this.me.move(_d, sprint, dt);
    return true;
  }
  // sprint avec hystérésis (±0,5 m autour du seuil) : il ne clignote plus à la distance limite
  sprintH(cle, v, seuil) {
    const S = this.sprints || (this.sprints = {});
    S[cle] = S[cle] ? v > seuil - 0.5 : v > seuil + 0.5;
    return S[cle];
  }

  // ---------- porteur de balle ----------
  offense(dt) {
    const me = this.me, g = this.g, hoop = me.hoop, opp = g.nearestOpponent(me);
    if (me.state === 'windup') {
      me.move(ZERO, false, dt);
      me.windup += dt / METER_TIME;
      if (me.windup >= this.releaseAt) g.doShot(me, { timing: me.windup });
      return;
    }
    if (me.state !== 'idle' || me.airborne || me.stun > 0) { me.move(ZERO, false, dt); return; }
    // demi-terrain, balle gagnée en jeu : d'abord la ressortir derrière l'arc (ni tir, ni appui, ni pénétration)
    if (g.doitSortir(me)) { this.tirApresStep = false; this.posteT = 0; me.postCumul = 0; me.sizeUp = false; this.sortir(dt); return; }
    if (this.sortieCible) this.sortieCible.visee = false;

    const d = hdist(me.pos, hoop), dd = opp ? hdist(me.pos, opp.pos) : 99;
    _d.set(hoop.x - me.pos.x, 0, hoop.z - me.pos.z).normalize();
    if (opp) _t.set(opp.pos.x - me.pos.x, 0, opp.pos.z - me.pos.z).normalize(); else _t.set(0, 0, 0);
    const inFront = dd < 1.8 && _t.dot(_d) > 0.45;

    // APPUI DOS AU PANIER. Un interieur qui a son defenseur entre lui et le cercle ne force pas le passage
    // en dribble — il lui tourne le dos et gagne sa place metre par metre. C'est le contrepoint du jeu de
    // penetration, et c'est ce qui donne un sens aux gabarits : un petit meneur ne peut pas poster.
    // Se retourner est ce qui met le defenseur DERRIERE, seule position ou l'appui est possible.
    const interieur = (me.def.in || 60) >= 70 && me.h >= 1.86;
    if (this.posteT > 0) {
      this.posteT -= dt;
      if (opp && dd < 1.8 && d > 1.4) { this.posteBas(dt); return; }
      this.posteT = 0; me.postCumul = 0;
    } else if (interieur && d < 6.2 && d > 1.7 && me.postCd <= 0 && g.rnd() < dt * 2.0 && g.cibleAppui(me)) {
      // La condition d'entree est exactement celle du jeu (cibleAppui) et non une recopie approximative :
      // en mesurant sur un 2v2 de cinquante secondes, ma premiere version — defenseur a moins de 1,45 m et
      // cercle a moins de 5,2 m — n'etait vraie sur AUCUNE image. L'IA penetre et tire ; elle ne s'arrete
      // jamais pile dans cette fenetre-la.
      this.posteT = 1.8; me.postCd = 3.5;
    }

    // après un step-back : on tire dès la reprise de balle
    if (this.tirApresStep && !(me.stepT > 0)) { this.tirApresStep = false; if (me.hasBall && me.state === 'idle') { this.startWindup(); return; } }
    this.decideT -= dt; this.jukeT -= dt;
    if (this.sizeUpT > 0) this.sizeUpT -= dt;
    me.sizeUp = this.sizeUpT > 0;
    if (this.jukeT <= 0) {
      // Lancé, on feinte moins souvent et par un crossover EN RYTHME (la course continue, js/dribble.js) ;
      // les gestes de mocap (entre les jambes, dans le dos), qui arrêtent les jambes, restent pour le face à face.
      const lance = me.speedNow > 2.2;
      this.juke = -this.juke; this.jukeT = lance ? 1.2 + this.g.rnd() * 0.8 : 0.7 + this.g.rnd() * 0.8;
      // collé par le défenseur : parfois un SPIN (avant, il était tenté juste après un changement de main, dont
      // le délai le refusait toujours — l'IA ne faisait jamais de spin)
      if (inFront && dd < 1.3 && this.g.rnd() < 0.35) me.demanderSpin();
      // (à moins de 14 m du cercle ; plus loin, en remontant la balle, un geste de temps en temps pour le style)
      else if (d < 14 || this.g.rnd() < 0.35) {
        const devant = !!opp && dd < 4.5 && _t.dot(_d) > 0.3;       // un défenseur sur ma route, même à distance
        // STEP-BACK près de sa zone de tir, défenseur collé : on se crée l'espace, puis on tire
        const zoneTir = d > this.range - 1.5 && d < this.range + 0.8;
        const geste = !lance && devant && dd < 1.6 && zoneTir && this.g.rnd() < 0.45 ? 'step'
          : !lance && devant && dd < 1.0 && this.g.rnd() < 0.3 ? 'retr' : this.choisirGeste(lance, devant, dd);
        if (me.startMove(geste, g.ball.pos) && geste === 'step') this.tirApresStep = true;
      }
      // face à face à l'arrêt, défenseur à distance de bras : on le jauge (size-up) une à deux secondes
      if (!lance && inFront && dd > 1.2 && dd < 2.6 && this.g.rnd() < 0.3) this.sizeUpT = 1 + this.g.rnd() * 1.5;
    }
    if (this.decideT <= 0) {
      this.decideT = 0.22;
      const open = (!inFront && dd > 1.4) || dd > 2.2;
      if (d < 1.9 && !(inFront && dd < 0.9 && this.g.rnd() < 0.5)) { g.doShot(me, { instant: true }); return; }
      if (d < this.range + 0.5 && d > this.range - 1.0 && open && this.g.rnd() < 0.65) { this.startWindup(); return; }
      if (g.shotClock < 2.6 && d < 9) { this.startWindup(); return; }
      // passe (modes en équipe) : coéquipier démarqué, surtout sous pression ou après avoir gardé la balle longtemps
      if (g.teamSize > 1 && me.crossT < 0 && me.spinT <= 0 && g.shotClock > 2.6) {
        const t = g.bestPassTarget(me);
        if (t) {
          const pressure = inFront && dd < 1.4;
          let p = 0.12 + (pressure ? 0.45 : 0) + (this.holdT > 4 ? 0.3 : 0) + (t.score > 0.8 ? 0.2 : 0);
          if (t.score < 0.45) p *= 0.25;
          if (this.g.rnd() < p * this.diff.skill) { g.passBall(me, t.p); return; }
        }
      }
    }

    // pénétration avec feintes latérales
    _side.set(-_d.z, 0, _d.x);
    const goalDist = this.plan === 'drive' ? 0.7 : Math.max(0.7, this.range - 0.3);
    _t.copy(_d).multiplyScalar(d > goalDist ? 1 : 0).addScaledVector(_side, this.juke * (inFront ? 1.4 : 0.45));
    if (_t.lengthSq() > 0.01) _t.normalize();
    // Le grand crossover vaut pour l'ordinateur aussi : s'il part a l'oppose de son defenseur — donc de
    // TOI, quand c'est toi qui defends — il te prend les chevilles. Le geste ne doit pas etre a sens unique.
    if (_t.lengthSq() > 0.01) g.croiserDevant(me, _t);
    me.move(_t, this.sprintH('attaque', d, 5) && me.stamina > 25, dt);
    if (_t.lengthSq() < 0.01) me.faceTo(hoop, true);
  }

  // SORTIR LA BALLE (Game.doitSortir) : on vise le point dehors le plus proche qui ne soit ni sous le nez d'un défenseur
  // ni derrière lui (choisirSortie), on y va en dribble, et on cherche un coéquipier déjà dehors — une passe reçue
  // derrière la ligne vaut une sortie, et elle devient de plus en plus tentante à mesure que ça traîne. Jamais coincé :
  // la cible est revue toutes les 0,8 s, et abandonnée au bout de 3 s si on n'y arrive pas ; au-delà de 4 s, n'importe
  // quel coéquipier dehors fait l'affaire, même mal démarqué ; reste le chrono des tirs.
  sortir(dt) {
    const me = this.me, g = this.g, hoop = me.hoop;
    this.sortieT += dt; this.sortieChoixT -= dt;
    if (this.sortieChoixT <= 0 || !this.sortieCible || !this.sortieCible.visee) { this.choisirSortie(); this.sortieChoixT = 0.8; }
    this.decideT -= dt;
    if (g.teamSize > 1 && this.decideT <= 0 && me.crossT < 0 && me.spinT <= 0) {
      this.decideT = 0.25;
      let t = null, bs = this.sortieT > 4 ? 0.05 : 0.4;
      for (const m of g.teammates(me)) {
        if (m === me || !horsArc(m.pos, hoop, 0.6)) continue;
        const sc = g.passScore(me, m);
        if (sc > bs) { bs = sc; t = m; }
      }
      if (t && this.g.rnd() < Math.min(0.8, 0.12 + this.sortieT * 0.12) * this.diff.skill) { g.passBall(me, t); return; }
    }
    const c = this.sortieCible;
    _t.set(c.x - me.pos.x, 0, c.z - me.pos.z);
    const l = _t.length();
    if (l > 1e-3) _t.divideScalar(l);
    me.move(_t, this.sprintH('sortie', l, 3) && me.stamina > 20, dt);
  }
  choisirSortie() {
    const me = this.me, g = this.g, hoop = me.hoop, P = pointsDehors(hoop, g.bounds || me.bounds);
    const C = this.sortieCible || (this.sortieCible = new THREE.Vector3());
    const cur = C.visee ? C : null, bloque = cur && this.sortieT - this.sortieDepuis > 3;
    let best = null, bc = Infinity;
    for (const c of P) {
      let cost = hdist(me.pos, c);
      const vx = c.x - me.pos.x, vz = c.z - me.pos.z, L2 = vx * vx + vz * vz || 1;
      for (const o of g.opponents(me)) {
        const dc = hdist(o.pos, c);
        if (dc < 2.4) cost += (2.4 - dc) * 2.5;                         // un défenseur l'attend là-bas
        const u = ((o.pos.x - me.pos.x) * vx + (o.pos.z - me.pos.z) * vz) / L2;
        if (u > 0.1 && u < 0.9 && Math.hypot(me.pos.x + vx * u - o.pos.x, me.pos.z + vz * u - o.pos.z) < 1.0) cost += 2.0;   // ... ou sur le chemin
      }
      if (cur && hdist(c, cur) < 0.5) cost += bloque ? 8 : -1.0;        // on garde sa cible (pas de va-et-vient), sauf si l'on y reste bloqué
      if (cost < bc) { bc = cost; best = c; }
    }
    if (!best) {
      // (aucun point dehors dans la zone de jeu : on s'éloigne du cercle dans l'axe du joueur)
      _d.set(me.pos.x - hoop.x, 0, me.pos.z - hoop.z);
      if (_d.lengthSq() < 1e-4) _d.set(0, 0, -hoop.sgn);
      _d.normalize().multiplyScalar(COURT.THREE_R + 1.5);
      best = _d.add(hoop); best.y = 0;
    }
    if (!cur || hdist(best, cur) > 0.5) this.sortieDepuis = this.sortieT;
    C.copy(best); C.visee = true;
  }
  // Coéquipier sans balle pendant que la balle doit ressortir : on s'écarte DERRIÈRE l'arc, loin du porteur et de
  // l'endroit où il va, pour lui offrir une passe qui la sort. Personne ne coupe vers le cercle.
  offBallSortie(dt, holder) {
    const me = this.me, g = this.g, P = pointsDehors(me.hoop, g.bounds || me.bounds);
    const ai = holder ? g.ais.get(holder) : null, cp = ai && ai.sortieCible && ai.sortieCible.visee ? ai.sortieCible : null;
    const mates = g.teammates(me);
    let best = null, bd = Infinity;
    for (const c of P) {
      if ((holder && hdist(c, holder.pos) < 2.8) || (cp && hdist(c, cp) < 2.8)) continue;
      if (mates.some((m) => m !== me && m !== holder && m.aiSpot && hdist(m.aiSpot, c) < 1.5)) continue;
      const d = hdist(me.pos, c);
      if (d < bd) { bd = d; best = c; }
    }
    if (!best) best = P[0] || me.pos;
    me.aiSpot = me.aiSpot || new THREE.Vector3(); me.aiSpot.copy(best);
    const arrive = !this.moveTo(me.aiSpot, this.sprintH('spot', hdist(me.pos, me.aiSpot), 4), dt, 0.35);
    if (arrive) me.faceTo(g.ball.pos, true);
  }

  // Dos au cercle, on pousse. Le reste (rapport de force, terrain gagne, mise au sol au bout d'une seconde
  // et demie d'appui gagnant) est la meme mecanique que pour le joueur : js/game.js, adosser().
  posteBas(dt) {
    const me = this.me, g = this.g;
    const cible = g.cibleAppui(me);
    if (!cible) { me.postCumul = 0; this.posteT = 0; me.move(ZERO, false, dt); return; }
    // On ne pousse PAS sur une direction : l'appui avance tout seul, a la force des appuis, et adosser()
    // impose le cap dos au cercle.
    me.move(ZERO, false, dt);
    g.adosser(me, cible, dt);
  }

  // Le geste de dribble qui sert la situation (js/gestes.js) : lancé face à un défenseur, on le fait
  // bouger (crossover, hésitation, in-and-out) ; collé, on protège (dans le dos, entre les jambes).
  choisirGeste(lance, devant, dd) {
    const r = this.g.rnd(), facile = this.diff && this.diff.skill < 0.8;
    if (lance) {
      if (devant && dd > 1.2) return r < 0.30 ? 'cross' : r < 0.60 ? 'hesi' : r < 0.80 && !facile ? 'inout' : 'back';
      return r < 0.50 ? 'cross' : r < 0.75 ? 'back' : 'hesi';
    }
    if (devant && dd < 1.4) return r < 0.40 ? 'back' : r < 0.75 ? 'legs' : 'cross';
    return r < 0.35 ? 'cross' : r < 0.60 ? 'legs' : r < 0.75 && !facile ? 'inout' : r < 0.90 ? 'pound' : 'back';
  }

  startWindup() {
    const me = this.me;
    me.demanderArme(); me.faceTo(me.hoop, true);        // attend que la balle soit dans la main (au plus 0,18 s)
    const st = isThree(me.pos, me.hoop) ? me.def.tp : me.def.mid;
    const perfectChance = Math.min(0.92, (0.2 + (st / 100) * 0.5) * this.diff.skill);
    this.releaseAt = this.g.rnd() < perfectChance
      ? PERFECT_CENTER + (this.g.rnd() - 0.5) * 0.03
      : PERFECT_CENTER + (this.g.rnd() < 0.5 ? -1 : 1) * (0.06 + this.g.rnd() * 0.16);
  }

  // ---------- coéquipier sans balle : écartement autour du porteur, coupes vers le cercle ----------
  offBall(dt, holder) {
    const me = this.me, g = this.g, hoop = me.hoop, s = hoop.sgn;
    if (me.airborne || me.state !== 'idle' || me.stun > 0) { me.move(ZERO, false, dt); return; }
    this.spotT -= dt; this.cutT -= dt;
    // balle à ressortir (demi-terrain) : pas de coupe, on s'écarte dehors (offBallSortie)
    if (g.doitSortir(me)) { if (this.cutT > 0) this.cutT = 0; this.offBallSortie(dt, holder); return; }
    if (this.spotT <= 0) { this.spotT = 3.5 + this.g.rnd() * 3.5; this.spotShift = (this.spotShift + 1 + Math.floor(this.g.rnd() * 3)) % SPOTS.length; }
    // coupe vers le panier quand le porteur pénètre (ou de temps en temps)
    const hd = hdist(holder.pos, hoop);
    if (this.cutT <= -2 && (hd < 4.5 && this.g.rnd() < dt * 0.35 || this.g.rnd() < dt * 0.06)) this.cutT = 1.6;
    if (this.cutT > 0) {
      _t.set(hoop.x + (me.pos.x < 0 ? -0.9 : 0.9), 0, hoop.z - s * 1.6);
      this.moveTo(_t, true, dt, 0.4); me.faceTo(g.ball.pos, true); return;
    }
    // spot : le mien (numéro parmi les coéquipiers sans balle + décalage), en évitant ceux trop proches du porteur.
    // Tant que le porteur remonte le terrain, on reste à portée de passe : jamais plus de 7 m devant lui vers le panier.
    const mates = g.teams[me.team].players.filter((p) => p !== holder);
    const k = Math.max(0, mates.indexOf(me));
    const limitZ = holder.pos.z + s * 7;
    // spots a l'echelle du terrain : largeur bornee a la zone de jeu, profondeur a l'arc (identiques sur 28 x 15)
    const petit = COURT.L < 20, xm = (me.bounds ? me.bounds.xMax : 7.3) - 0.35;
    const kx = petit ? Math.min(1, xm / 6.2) : 1, kz = petit ? COURT.THREE_R / 7.24 : 1;
    const spotZ = (c) => { const z = hoop.z - s * c.z * kz, over = s * (z - limitZ); return over > 0 ? limitZ + s * over * 0.35 : z; };   // au-delà de la limite : 35 % de l'excédent (échelonnement)
    let spot = null;
    for (let i = 0; i < SPOTS.length; i++) {
      const c = SPOTS[(k + this.spotShift + i * 2) % SPOTS.length];
      _t.set(clamp(c.x * kx, -xm, xm), 0, spotZ(c));
      if (hdist(_t, holder.pos) > 2.4 && !mates.some((m) => m !== me && m.aiSpot && hdist(m.aiSpot, _t) < 1.5)) { spot = c; break; }
    }
    if (!spot) spot = SPOTS[(k + this.spotShift) % SPOTS.length];
    _t.set(clamp(spot.x * kx, -xm, xm), 0, spotZ(spot));
    me.aiSpot = me.aiSpot || new THREE.Vector3(); me.aiSpot.copy(_t);
    const arrived = !this.moveTo(_t, this.sprintH('spot', hdist(me.pos, _t), 5), dt, 0.35);
    if (arrived) me.faceTo(g.ball.pos, true);
  }

  // passe qui m'est destinée : aller au point de réception, face à la balle
  receive(dt) {
    const me = this.me, b = this.g.ball, P = b.pass;
    if (me.airborne || me.state !== 'idle') { me.move(ZERO, false, dt); return; }
    // point d'arrivée prévu de la balle (hauteur poitrine) ; s'il est trop loin on court vers la balle elle-même
    _t.set(P.target.x, 0, P.target.z);
    if (hdist(me.pos, _t) > 3) _t.set(b.pos.x, 0, b.pos.z);
    this.moveTo(_t, true, dt, 0.25);
    me.faceTo(b.pos, true);
  }

  // ---------- défense ----------
  // holder = porteur adverse (ou destinataire d'une passe adverse si passInFlight)
  defense(dt, holder, passInFlight = false) {
    const me = this.me, g = this.g, b = g.ball;
    me.defending = true;
    if (me.airborne || me.stun > 0) { me.move(ZERO, false, dt); return; }
    const man = g.markOf(me) || holder;
    // passe adverse en l'air : si elle passe près de moi, je vais la couper
    if (passInFlight) {
      const P = b.pass, dx = P.target.x - P.from.pos.x, dz = P.target.z - P.from.pos.z, L = Math.hypot(dx, dz) || 1;
      const px = me.pos.x - P.from.pos.x, pz = me.pos.z - P.from.pos.z, u = clamp((px * dx + pz * dz) / (L * L), 0, 1);
      const lx = P.from.pos.x + dx * u, lz = P.from.pos.z + dz * u;
      if (Math.hypot(me.pos.x - lx, me.pos.z - lz) < 1.6) { _t.set(b.pos.x, 0, b.pos.z); this.moveTo(_t, true, dt, 0.2); me.faceTo(b.pos, true); return; }
    }
    if (man === holder) { this.onBall(dt, holder); return; }
    // défense à distance : entre mon vis-à-vis et le panier, en se rapprochant un peu de la balle (aide),
    // mais un pas à côté de la ligne de passe (sinon chaque passe du porteur serait coupée)
    const hoop = holder.hoop, gap = clamp(hdist(man.pos, hoop) * 0.3, 0.6, 1.6);
    _t.set(hoop.x - man.pos.x, 0, hoop.z - man.pos.z).normalize().multiplyScalar(gap).add(man.pos);
    _t.lerp(_d.set(holder.pos.x, 0, holder.pos.z), 0.15); _t.y = 0;
    const lx = man.pos.x - holder.pos.x, lz = man.pos.z - holder.pos.z, L = Math.hypot(lx, lz) || 1;
    const px = _t.x - holder.pos.x, pz = _t.z - holder.pos.z, u = (px * lx + pz * lz) / (L * L);
    if (u > 0 && u < 1) {
      const side = (px * -lz + pz * lx) / L;                                  // distance signée à la ligne de passe
      if (Math.abs(side) < 1.0) {
        const want = side >= 0 ? 1.0 : -1.0;
        // on s'écarte du côté du panier (pour rester entre l'attaquant et le cercle)
        const hs = ((hoop.x - holder.pos.x) * -lz + (hoop.z - holder.pos.z) * lx) / L;
        const dir = Math.abs(side) < 0.15 ? (hs >= 0 ? 1 : -1) : Math.sign(want);
        _t.x += (-lz / L) * (dir * 1.0 - side); _t.z += (lx / L) * (dir * 1.0 - side);
      }
    }
    this.moveTo(_t, this.sprintH('def', hdist(me.pos, _t), 3), dt, 0.2, 0.12);
    me.faceTo(man.pos, true);
  }

  onBall(dt, h) {
    const me = this.me, g = this.g, hoop = h.hoop;
    const dh = hdist(h.pos, hoop), dd = hdist(me.pos, h.pos);
    // contest : saute quand le porteur arme son tir
    if (h.state === 'windup' && dd < 2.3 && h.windup > 0.42 && this.g.rnd() < dt * 10 * this.diff.aggro) { me.jump(3.0); return; }
    if ((h.state === 'shoot' || h.state === 'layup') && !h.released && dd < 1.6 && this.g.rnd() < dt * 8 * this.diff.aggro) { me.jump(2.8); return; }
    // COUP D'EPAULE EN DEFENSE. Un defenseur physique ne se contente pas de glisser devant : il rentre dans
    // le porteur pour le sortir de son axe. Rare — une fois toutes les trois secondes au plus, et seulement
    // au contact — mais c'est ce qui fait sentir l'adversaire au lieu de le voir.
    if (dd < 1.45 && me.bumpCd <= 0 && me.state === 'idle' && !me.airborne && !me.auSol && h.state === 'idle'
        && this.g.rnd() < dt * 0.38 * this.diff.aggro * ((me.def.in || 60) / 70)) { g.bumpContact(me); return; }
    // se place entre le porteur et son panier
    const gap = Math.min(1.1, Math.max(0.5, dh * 0.35));
    _t.set(hoop.x - h.pos.x, 0, hoop.z - h.pos.z).normalize().multiplyScalar(gap).add(h.pos); _t.y = 0;
    this.moveTo(_t, this.sprintH('surBalle', dd, 3), dt, 0.1, 0.12);
    me.faceTo(h.pos, true);
    if (dd < 1.15 && me.stealCd <= 0 && this.g.rnd() < dt * 0.5 * this.diff.aggro) g.attemptSteal(me, h);
  }

  // ---------- balle libre / rebond ----------
  loose(dt) {
    const me = this.me, g = this.g, b = g.ball;
    if (me.airborne || me.state !== 'idle') { me.move(ZERO, false, dt); return; }
    // 1 contre 1 : la balle d'un tir raté ne se dispute pas (Game.balleMorte) — on la regarde retomber
    if (g.balleMorte()) { me.move(ZERO, false, dt); me.faceTo(b.pos, true); return; }
    // seuls les 2 plus proches de chaque équipe foncent sur la balle, les autres se replacent en la regardant
    if (g.rankToBall(me) < 2) { _t.set(b.pos.x, 0, b.pos.z); this.moveTo(_t, true, dt, 0.2); return; }
    _t.set(b.pos.x, 0, b.pos.z).lerp(me.pos, 0.6);
    this.moveTo(_t, false, dt, 0.5); me.faceTo(b.pos, true);
  }

  rebound(dt, shooter) {
    const me = this.me, g = this.g, hoop = shooter.hoop, b = g.ball;
    if (me.airborne || me.state !== 'idle') { me.move(ZERO, false, dt); return; }
    if (g.balleMorte()) { me.move(ZERO, false, dt); me.faceTo(b.pos, true); return; }   // 1 contre 1 : pas de rebond
    // la balle redescend à portée : on saute pour la prendre en l'air au lieu d'attendre qu'elle touche le sol
    const d = Math.hypot(me.pos.x - b.pos.x, me.pos.z - b.pos.z);
    if (b.state === 'loose' && d < 1.5 && b.pos.y > 1.4 && b.pos.y < 3.4 && b.vel.y < 0) {
      me.boxOutT = 0.6;
      if (d < 0.95) { me.jump(2.6 + ((me.def.reb || 60) / 100) * 1.3); me.faceTo(b.pos, true); me.move(ZERO, false, dt); return; }
    }
    // les 2 plus proches du panier de chaque équipe vont se placer près du cercle (de part et d'autre), les autres restent
    if (g.rankToHoop(me, hoop) < 2) {
      const side = (me.slot % 2 === 0 ? 1 : -1) * (me.team === 0 ? 1 : -1);
      _t.set(hoop.x + side * 1.1, 0, hoop.z - hoop.sgn * 1.4);
      this.moveTo(_t, true, dt, 0.25); me.faceTo(g.ball.pos, true); return;
    }
    me.move(ZERO, false, dt); me.faceTo(g.ball.pos, true);
  }
}
