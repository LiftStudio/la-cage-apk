// LES COUCHES DE VIE — ce qui se pose PAR-DESSUS n'importe quelle animation (clip de mocap ou pose
// procédurale) pour qu'un joueur ait l'air d'avoir un corps, et pas seulement un squelette qui rejoue.
//
// Haythem voulait des animations « plus agréables et immersives ». Les clips de course, de marche et de
// dribble étaient déjà bons ; ce qui manquait, c'était tout ce qu'un clip ne peut pas savoir, parce que ça
// dépend de ce qui se passe dans la partie :
//
//   - LE CORPS PENCHE. Dans un virage on se couche vers l'intérieur, à l'accélération on part le buste en
//     avant, au freinage on se relève et on s'assoit sur les talons. C'est la même physique que le vélo :
//     l'inclinaison qui équilibre l'accélération horizontale, atan(a / g), en plus doux.
//   - LA TÊTE REGARDE quelque chose : le ballon, le panier quand on l'a en main, le joueur qui s'approche,
//     le marchand. Un personnage qui fixe l'horizon quoi qu'il arrive a l'air d'une poupée.
//   - ON RESPIRE, et d'autant plus fort qu'on a couru. Vidé, on s'arrête les MAINS SUR LES GENOUX.
//   - QUAND ON PIVOTE SUR PLACE, on fait de petits pas au lieu de tourner sur une plaque comme un pion.
//   - LES PAS S'ENTENDENT, posés au moment exact où le pied touche le sol, et les semelles crissent sur un
//     changement de direction sec.
//
// Tout se calcule dans le repère du personnage (x = sa gauche, y = le haut, z = devant), sur la pose que
// le clip vient de donner : ce sont des AJOUTS, pas des remplacements. Le clip garde son style.
import * as THREE from 'three';

const _C = new THREE.Quaternion(), _Ci = new THREE.Quaternion();
const _h = new THREE.Vector3(), _d = new THREE.Vector3(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
const _cheville = { Left: new THREE.Vector3(), Right: new THREE.Vector3() };
const _orteil = { Left: new THREE.Vector3(), Right: new THREE.Vector3() };
const _pole = new THREE.Vector3(), _f = new THREE.Vector3(), _n = new THREE.Vector3(), _g = new THREE.Vector3();
const _av = new THREE.Vector3(), _ha = new THREE.Vector3(), _ga = new THREE.Vector3();
const G = 9.81;
// tous les os que les couches peuvent modifier (voir AvatarRig.couchesDebut : pas d'empilement)
const OS = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder',
  'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lisse = (k) => k * k * (3 - 2 * k);
const vers = (x, cible, tau, dt) => x + (cible - x) * (1 - Math.exp(-dt / tau));

export class Couches {
  // branché par le jeu : le module audio (pas, crissements, réceptions)
  static son = null;
  static OS = OS;

  constructor(p) {
    this.p = p;
    // inclinaison du corps entier, appliquée au groupe du joueur (voir Player.update / presenter)
    this.tangage = 0;        // > 0 = buste en avant
    this.roulis = 0;         // > 0 = couché vers SA DROITE (convention de rotation.z)
    this.vx = 0; this.vz = 0; this.ax = 0; this.az = 0; this.init = false;
    this.angPrec = null; this.omega = 0;
    // regard
    this.yaw = 0; this.pitch = 0;
    this.errance = null; this.erranceT = 0; this.immobileT = 0;
    // respiration et essoufflement
    this.resp = Math.random() * 6.28;
    this.fatigue = 0;        // 0..1, monte en courant, redescend en récupérant
    this.souffle = 0;        // mains sur les genoux (0..1)
    this.veutSouffler = false;
    // petits pas quand on pivote sur place
    this.pivot = 0; this.pasPhase = 0;
    // appuis au sol (sons)
    this.pieds = { Left: true, Right: true };
    this.enAir = false; this.derapeCd = 0; this.pasCd = { Left: 0, Right: 0 };
  }

  // ======================================================================== 1) LE CORPS PENCHE
  // Appelée à chaque pas de simulation, AVANT que le groupe du joueur soit placé : elle fixe tangage et
  // roulis. L'accélération se mesure sur la vitesse réelle du joueur (y compris celle reçue par le réseau
  // pour un joueur distant), lissée sur un dixième de seconde : sans lissage, la moindre saccade de
  // vitesse ferait trembler tout le corps.
  dynamique(dt) {
    if (!(dt > 0)) return;                                   // pas de temps écoulé : rien à mesurer (et pas de /0)
    const p = this.p, f = p.facing;
    const vx = p.vel.x, vz = p.vel.z;
    if (!this.init) { this.vx = vx; this.vz = vz; this.init = true; }
    // Chez un joueur distant la vitesse arrive par paquets, douze fois par seconde : on lisse deux fois plus.
    const s = 1 - Math.exp(-dt / (p.remote ? 0.22 : 0.11));
    this.ax += ((vx - this.vx) / dt - this.ax) * s;
    this.az += ((vz - this.vz) / dt - this.az) * s;
    this.vx = vx; this.vz = vz;
    const ang = Math.atan2(f.x, f.z);
    let da = this.angPrec === null ? 0 : ang - this.angPrec;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    // turnTo ne tourne jamais de plus de 0,12 rad par pas : au-delà c'est un cap IMPOSÉ (remise en jeu,
    // descente de vélo, setFacing), pas un pivot — sinon on en tirait un faux petit pas
    if (Math.abs(da) > 0.3) da = 0;
    this.angPrec = ang;
    this.omega += (da / dt - this.omega) * (1 - Math.exp(-dt / 0.08));
    this.dAng = da;

    const v = Math.hypot(vx, vz);
    // l'accélération dans le repère du joueur : devant = facing, gauche = (fz, -fx)
    const aAv = this.ax * f.x + this.az * f.z, aGa = this.ax * f.z - this.az * f.x;
    let tc = 0, rc = 0;
    const libre = !p.velo && !p.assis && !(p.chuteT > 0) && !p.emote && !p.clipSpin && !(p.spinT > 0)
      && p.state !== 'dunk' && p.state !== 'layup' && p.state !== 'celebrate' && p.state !== 'defeat';
    if (libre && v > 0.4) {
      const k = Math.min(1, (v - 0.4) / 1.2);
      // à l'accélération on part devant (jusqu'à 6°), au freinage on se redresse et on s'assoit (4°)
      tc = clamp(aAv * 0.02, -0.075, 0.105) * k;
      // dans un virage on se couche vers l'intérieur : la moitié de l'angle qui équilibrerait la force
      // centrifuge, plafonnée à 13°. Au-delà, un joueur ne court plus, il tombe.
      rc = -clamp(Math.atan(aGa / G) * 0.5, -0.23, 0.23) * k;
      if (p.airborne) { tc *= 0.4; rc *= 0.4; }
    }
    // POMPES : c'est ici que le corps bascule. Pivot aux pointes de pieds (le groupe du joueur a son origine
    // au sol entre les pieds). Bras tendus, les épaules sont à la longueur d'un bras au-dessus du sol : pour
    // un corps d'un mètre et demi, 68° d'inclinaison ; poitrine près du sol, 82°. Une pompe par 1,15 s.
    const pompe = this._pompe();
    if (pompe !== null) { tc = pompe; rc = 0; }
    // en sortant des pompes on se relève moins sec qu'on ne se penche en courant
    const tauT = pompe !== null ? 0.12 : this.tangage > 0.4 ? 0.2 : 0.09;
    this.tangage = vers(this.tangage, tc, tauT, dt);
    this.roulis = vers(this.roulis, rc, 0.09, dt);
    if (Math.abs(this.tangage) < 1e-4) this.tangage = 0;
    if (Math.abs(this.roulis) < 1e-4) this.roulis = 0;

    // ---- fatigue : elle se lit sur l'endurance, et monte aussi vite qu'on sprinte ----
    const fCible = Math.max(clamp((70 - p.stamina) / 55, 0, 1), p.souffleDistant ? 1 : 0);
    this.fatigue = vers(this.fatigue, fCible, fCible > this.fatigue ? 0.6 : 2.5, dt);
    this.immobileT = v < 0.25 ? this.immobileT + dt : 0;
    this.derapeCd = Math.max(0, this.derapeCd - dt);
    // Un changement d'appui SEC fait crisser les semelles : une grosse accélération EN TRAVERS de la course
    // ou CONTRE elle (coupe, freinage brutal), lancé. Pas un démarrage : l'accélération va alors dans le sens
    // de la course, et chaque départ crissait. Rien en l'air, rien à vélo, rien chez un joueur distant (sa
    // vitesse arrive par à-coups, on entendrait crisser chaque paquet).
    if (Couches.son && !p.remote && !p.airborne && !p.velo && (p.mesh.visible || p.vuePremiere) && this.derapeCd <= 0 && v > 1.8) {
      const ux = vx / v, uz = vz / v;
      const contre = -(this.ax * ux + this.az * uz), travers = Math.abs(this.ax * uz - this.az * ux);
      const a2 = Math.max(contre, travers);
      if (a2 > 14) {
        this.derapeCd = 0.45;
        Couches.son.crissement(p.pos, clamp((a2 - 14) / 20 + 0.45, 0.45, 1));
      }
    }
  }

  _pompe() {
    const e = this.p.emote;
    if (!e || e.proc !== 'pompes') { this.mainsPompe = null; return null; }
    const t = e.t, k = lisse(Math.min(1, t / 0.7));
    const c = t > 0.7 ? 0.5 - 0.5 * Math.cos((t - 0.7) * Math.PI * 2 / 1.15) : 0;
    return k * (1.19 + 0.24 * c);
  }

  // Les mains des pompes : sous les épaules, plantées. On relève leur place une fois en position (fin de la
  // descente) et on n'y touche plus : si elles suivaient les épaules, elles glisseraient sur le bitume à
  // chaque pompe, puisque les épaules avancent d'une dizaine de centimètres en descendant.
  _mainsPompe(A) {
    const e = this.p.emote, k = lisse(Math.min(1, e.t / 0.7));
    const hx = _av.x, hz = _av.z, hn = Math.hypot(hx, hz) || 1, fx = hx / hn, fz = hz / hn;   // devant, à plat
    if (!this.mainsPompe && e.t >= 0.7) this.mainsPompe = {};
    for (const c of ['Left', 'Right']) {
      if (!A.aMains(c)) continue;
      const sg = c === 'Left' ? 1 : -1;
      let m = this.mainsPompe && this.mainsPompe[c];
      if (!m) {
        A.bone(c + 'Arm').getWorldPosition(_g);
        _g.addScaledVector(_ga, sg * 0.07); _g.y = 0.035 + this.p.pos.y;   // au sol (js/monde.js : 0 sur un terrain plat)
        if (this.mainsPompe) m = this.mainsPompe[c] = _g.clone();
        else m = _g;
      }
      _f.set(fx, 0, fz).addScaledVector(_ga, sg * 0.25).normalize();            // doigts devant, un peu dehors
      _n.set(0, -1, 0);                                                          // paume au sol
      _pole.copy(m).addScaledVector(_ga, sg * 0.35).addScaledVector(_av, -0.35); _pole.y += 0.25;   // coudes vers l'arrière
      A.ikBras(c, m, _f, _n, _pole, k);
      A.plierDoigts(c, [0.12, 0.08, 0.05], k);
    }
  }

  // ======================================================================== 2) SUR LE SQUELETTE
  // Appelée après le clip ou la pose procédurale, le groupe du joueur déjà placé. Ordre : essoufflement
  // (il déplace les hanches et repose les jambes), pas de pivot, respiration, regard ; puis les appuis au
  // sol, sur la pose FINALE.
  os(dt) {
    const p = this.p, A = p.avatar;
    if (!A || !A.ok) return;
    if (!(dt > 0)) return;
    A.couchesDebut(OS);                                      // (l'appelant vient de mettre à jour le groupe du joueur)
    p.mesh.getWorldQuaternion(_C); _Ci.copy(_C).invert();
    A.repere(_C, _Ci);
    _av.set(0, 0, 1).applyQuaternion(_C); _ha.set(0, 1, 0).applyQuaternion(_C); _ga.set(1, 0, 0).applyQuaternion(_C);
    const idle = p.state === 'idle' && !p.airborne && !(p.chuteT > 0) && !p.emote && !p.velo && !p.assis;

    // ---------------------------------------------------------------- ESSOUFFLÉ : mains sur les genoux
    // On y entre vidé (endurance sous 30), arrêté depuis une demi-seconde, sans ballon ; on en sort dès qu'on
    // bouge, qu'on reprend la balle, ou que le souffle est revenu. Chez un joueur distant, c'est le paquet
    // qui le dit (souffleDistant).
    const peut = idle && !p.hasBall && !p.defending && !p.telActif?.() && p.speedNow < 0.2 && !p.locoActif;
    if (!peut) this.veutSouffler = false;
    else if (p.remote) this.veutSouffler = !!p.souffleDistant;
    else if (!this.veutSouffler && p.stamina < 30 && this.immobileT > 0.5) this.veutSouffler = true;
    else if (this.veutSouffler && p.stamina > 72) this.veutSouffler = false;
    this.souffle = clamp(this.souffle + (this.veutSouffler ? dt / 0.5 : -dt / 0.3), 0, 1);
    if (this.souffle > 0 && A.aJambe('Left') && A.aJambe('Right')) this._mainsSurGenoux(A, lisse(this.souffle), dt);

    // ---------------------------------------------------------------- PETITS PAS en pivotant sur place
    // Un pas tous les 1,3 rad de rotation (un demi-tour : deux pas et demi), le pied du côté où l'on tourne d'abord. Le pied se lève en arc
    // (cuisse devant, genou plié, semelle gardée à plat) et se repose.
    const pivotOk = idle && !p.locoActif && p.speedNow < 0.45 && this.souffle <= 0 && !p.clipSpin && p.crossT < 0;
    const kp = pivotOk ? clamp((Math.abs(this.omega) - 1.1) / 2.4, 0, 1) : 0;
    this.pivot = vers(this.pivot, kp, kp > this.pivot ? 0.04 : 0.1, dt);
    if (pivotOk) this.pasPhase += Math.abs(this.dAng || 0) / 1.3;
    if (this.pivot > 0.01 && A.aJambe('Left')) {
      const n = Math.floor(this.pasPhase), fr = this.pasPhase - n;
      const cote = (n + (this.omega > 0 ? 0 : 1)) % 2 === 0 ? 'Left' : 'Right';
      const lev = Math.sin(fr * Math.PI) * this.pivot;
      A.ajouter(cote + 'UpLeg', -0.42 * lev);
      A.ajouter(cote + 'Leg', 0.8 * lev);
      A.ajouter(cote + 'Foot', -0.38 * lev);
    }

    // ---------------------------------------------------------------- RESPIRATION
    // Au repos, une inspiration toutes les quatre secondes, à peine visible. Vidé, près d'une par seconde,
    // la poitrine et les épaules qui se soulèvent. On ne touche pas aux épaules si les mains tiennent
    // quelque chose (ballon, téléphone) : elles bougeraient avec.
    const fq = 0.24 + 0.72 * this.fatigue;
    this.resp += dt * fq * Math.PI * 2;
    // (mains sur les genoux : la respiration est déjà dans le dos plié, AVANT l'IK des bras)
    const calme = p.speedNow < 1.2 && !p.airborne && !p.emote && !p.velo && !(p.chuteT > 0) && this.souffle <= 0.01;
    if (calme) {
      const amp = 0.012 + 0.05 * this.fatigue + 0.03 * this.souffle;
      const ins = Math.sin(this.resp);
      A.ajouter('Spine1', -amp * 0.5 * ins);
      A.ajouter('Spine2', -amp * 0.6 * ins);
      if (!p.hasBall && !p.tel && this.souffle < 0.5) {
        const ep = (0.015 + 0.045 * this.fatigue) * Math.max(0, ins);
        A.ajouter('LeftShoulder', 0, 0, ep);
        A.ajouter('RightShoulder', 0, 0, -ep);
      }
    }

    if (p.emote && p.emote.proc === 'pompes') this._mainsPompe(A);

    // ---------------------------------------------------------------- DÉFENSE : garde basse, mains actives
    this._defense(A, dt);
    // ---------------------------------------------------------------- VOL DE BALLE : le bras va chercher le ballon
    if (p.swipeT > 0) this._vol(A); else this.volCote = 0;

    // ---------------------------------------------------------------- DRIBBLE EN COURSE (posture)
    const dc = p.dribble;
    if (dc && dc.actifBras) dc.posture(A, dt);

    // ---------------------------------------------------------------- REGARD
    this._regard(A, dt, idle || !!p.assis || (p.state === 'idle' && !p.emote && !(p.chuteT > 0) && !p.velo));

    // ---------------------------------------------------------------- DRIBBLE EN COURSE (bras, image affichée)
    if (dc && dc.actifBras && p.constructor.poseVisible && p.lodIK) dc.bras(A);
    else if (dc && p.catchT > 0 && p.constructor.poseVisible && p.lodIK) dc.saisie(A);   // réception à deux mains

    A.couchesFin(OS);
    // ---------------------------------------------------------------- APPUIS (sons de pas)
    this._appuis(A, dt);
  }

  // GARDE DÉFENSIVE (06/10/2026). Le clip de défense est un « gardien de but » de Mixamo : debout presque droit,
  // une main sur la hanche. Un défenseur de basket est ASSIS dans ses appuis — bassin 8 cm plus bas, pieds plus
  // larges, buste penché — et ses mains travaillent : une haute pour gêner le tir, une basse et large pour la
  // ligne de passe ou le dribble. La main basse est du côté du ballon (on le harcèle), la haute de l'autre ; elles
  // échangent leurs rôles en 0,3 s quand le ballon change de côté. Jambes : les pieds restent où le clip les pose
  // (écartés), le bassin descend, la cinématique inverse replie les genoux (comme la triple menace, js/dribble.js).
  // Les bras seulement en pas chassés (les jambes y sont le clip). Image affichée seulement, joueurs proches.
  _defense(A, dt) {
    const p = this.p, An = p.anim;
    const garde = p.defending && !p.hasBall && p.state === 'idle' && !p.airborne && !(p.chuteT > 0) && !p.emote && !p.velo && !p.assis && An;
    const surPlace = garde && !p.locoActif && An.currentName === 'def_stance';
    const glisse = garde && p.locoActif && (An.locoW.def_slide_l > 0.5 || An.locoW.def_slide_r > 0.5);
    const cJ = surPlace && this.pivot < 0.05 ? 1 : 0, cB = (surPlace || glisse) && !(p.kBras > 0.01) ? 1 : 0;
    this.kDefJ = vers(this.kDefJ || 0, cJ, 0.2, dt); this.kDefB = vers(this.kDefB || 0, cB, 0.2, dt);
    // côté du ballon (repère du joueur : x > 0 = sa gauche), lissé
    const c = p.cibleRegard;
    let sb = this.defCote || 0;
    if (c) { const lx = (c.x - p.pos.x) * p.facing.z - (c.z - p.pos.z) * p.facing.x; sb = vers(sb, lx > 0.05 ? 1 : lx < -0.05 ? -1 : sb, 0.3, dt); }
    this.defCote = sb;
    if (!p.constructor.poseVisible || !p.lodIK) return;
    const kj = lisse(this.kDefJ), kb = lisse(this.kDefB), s = p.h / 1.9;
    if (kj > 0.01 && A.aJambe('Left') && A.aJambe('Right')) {
      for (const cote of ['Left', 'Right']) {
        const sg = cote === 'Left' ? 1 : -1;
        A.bone(cote + 'Foot').getWorldPosition(_cheville[cote]); A.bone(cote + 'ToeBase').getWorldPosition(_orteil[cote]);
        _cheville[cote].addScaledVector(_ga, sg * 0.05 * s * kj); _orteil[cote].addScaledVector(_ga, sg * 0.06 * s * kj);
      }
      const hips = A.bone('Hips');
      hips.getWorldPosition(_w);
      _w.addScaledVector(_ha, -0.11 * s * kj).addScaledVector(_av, -0.05 * s * kj);   // assis dans ses appuis
      hips.parent.updateWorldMatrix(true, false);
      hips.position.copy(hips.parent.worldToLocal(_w));
      for (const cote of ['Left', 'Right']) {
        const sg = cote === 'Left' ? 1 : -1;
        A.bone(cote + 'UpLeg').getWorldPosition(_pole);
        _pole.addScaledVector(_av, 0.8).addScaledVector(_ga, sg * 0.25);
        A.ikJambe(cote, _cheville[cote], _orteil[cote], _pole, kj);
      }
      // le clip penche déjà le buste : avec les genoux pliés, on le REDRESSE un peu (dos droit, assis dans les appuis)
      A.ajouter('Spine1', -0.08 * kj); A.ajouter('Neck', -0.05 * kj); A.ajouter('Head', -0.05 * kj);
    }
    if (kb > 0.01 && A.aMains('Left') && A.aMains('Right')) {
      const t = performance.now() * 0.001;
      for (const cote of ['Left', 'Right']) {
        if (this.volCote && (this.volCote > 0) === (cote === 'Left')) continue;     // ce bras-là vole (voir _vol)
        const sg = cote === 'Left' ? 1 : -1, bas = clamp((1 + sg * sb) / 2, 0, 1), haut = 1 - bas;
        const vib = 0.025 * Math.sin(t * 3.1 + sg * 1.7);                          // les mains ne restent pas mortes
        A.bone(cote + 'Arm').getWorldPosition(_g);                                   // épaule
        // main haute : devant le front, un peu dehors ; main basse : à hauteur de hanche, large, devant
        _f.set(sg * (0.22 * haut + 0.46 * bas) * s, (0.24 * haut - 0.45 * bas) * s + vib, (0.40 * haut + 0.28 * bas) * s);
        _v.copy(_g).addScaledVector(_ga, _f.x).addScaledVector(_ha, _f.y).addScaledVector(_av, _f.z);
        // paume vers l'adversaire ; doigts vers le haut (main haute) ou dehors et devant (main basse)
        _n.copy(_av).addScaledVector(_ga, -sg * 0.25 * bas).normalize();
        _d.copy(_ha).multiplyScalar(haut).addScaledVector(_ga, sg * 0.6 * bas).addScaledVector(_av, 0.5 * bas).normalize();
        _pole.copy(_g).addScaledVector(_ga, sg * 0.45).addScaledVector(_ha, -0.45).addScaledVector(_av, -0.1);   // coude bas et dehors
        A.ikBras(cote, _v, _d, _n, _pole, kb);
        A.plierDoigts(cote, [0.1, 0.12, 0.08], kb);
      }
    }
  }

  // VOL DE BALLE (06/10/2026). Il n'y avait rien à voir : le clip « steal » était le clip Defender entier — cinq
  // secondes jouées en 0,4 — et la pose de balayage écrite pour le bonhomme ne s'affichait jamais sur un avatar.
  // Maintenant la main du côté du ballon PART DESSUS : elle va le chercher là où il est (p.cibleRegard, que le jeu
  // tient sur le ballon), le balaie de dehors vers dedans, et revient — sur 0,3 s, par-dessus la garde ou la course.
  // Le buste se penche et tourne vers le ballon.
  _vol(A) {
    const p = this.p, c = p.cibleRegard;
    if (!c || !A.aMains('Left') || !A.aMains('Right')) return;
    const u = clamp(1 - p.swipeT / 0.3, 0, 1), env = Math.sin(u * Math.PI);
    const lx = (c.x - p.pos.x) * p.facing.z - (c.z - p.pos.z) * p.facing.x;
    if (!this.volCote) this.volCote = lx >= 0 ? 1 : -1;                   // le bras se choisit au départ du geste
    const sg = this.volCote, cote = sg > 0 ? 'Left' : 'Right';
    A.ajouter('Spine', 0.12 * env); A.ajouter('Spine1', 0.10 * env, sg * 0.18 * env, -sg * 0.06 * env);
    A.ajouter('Spine2', 0.05 * env, sg * 0.10 * env);
    A.bone(cote + 'Arm').getWorldPosition(_g);
    // la cible : le ballon, balayé de dehors (début) vers dedans (fin), à portée du bras
    _v.copy(c).addScaledVector(_ga, sg * 0.18 * Math.cos(u * Math.PI));
    _v.y -= 0.04;
    _d.subVectors(_v, _g); const L = _d.length(), lmax = 0.62 * p.h / 1.9;
    if (L > lmax) _v.copy(_g).addScaledVector(_d, lmax / L);
    _n.copy(_ga).multiplyScalar(-sg).addScaledVector(_ha, -0.4).normalize();          // paume : vers dedans et le bas
    _f.copy(_av).addScaledVector(_ha, -0.35).addScaledVector(_ga, -sg * 0.2).normalize();   // doigts : devant, vers le bas
    _pole.copy(_g).addScaledVector(_ga, sg * 0.4).addScaledVector(_ha, -0.3).addScaledVector(_av, -0.15);
    A.ikBras(cote, _v, _f, _n, _pole, lisse(env));
    A.plierDoigts(cote, [0.08, 0.1, 0.08], env);
  }

  // Le regard. La cible vient du jeu (le ballon, le panier, un joueur...) ; sans cible, et au bout de
  // quelques secondes d'immobilité, les yeux se promènent. La tête prend la moitié de la rotation, le cou
  // un gros tiers, le haut du dos le reste — c'est ce qui fait qu'on « tourne la tête » au lieu de visser
  // une boule sur un pieu. Au-delà de 75° de côté, on arrête de suivre plutôt que de se tordre le cou.
  _regard(A, dt, actif) {
    const p = this.p;
    let yaw = 0, pitch = 0;
    if (p.telActif?.()) actif = false;                       // téléphone sorti : les yeux sont sur l'écran
    let cible = actif ? p.cibleRegard : null;
    if (actif && !cible && this.immobileT > 3.5 && !p.hasBall && !p.defending) {
      // les yeux se promènent : un point au hasard devant soi, changé toutes les deux à cinq secondes
      this.erranceT -= dt;
      if (!this.errance || this.erranceT <= 0) {
        const a = (Math.random() * 2 - 1) * 1.05, h = 1.2 + Math.random() * 1.4;
        this.errance = { a, h, d: 5 + Math.random() * 6 };
        this.erranceT = 2 + Math.random() * 3;
      }
      const e = this.errance;
      A.bone('Head').getWorldPosition(_h);
      _w.set(Math.sin(e.a) * e.d, 0, Math.cos(e.a) * e.d).applyQuaternion(_C);
      cible = _v.set(_h.x + _w.x, e.h, _h.z + _w.z);
    } else if (!actif || cible) this.errance = null;
    if (cible) {
      A.bone('Head').getWorldPosition(_h);
      _d.subVectors(cible, _h).applyQuaternion(_Ci);
      const y = Math.atan2(_d.x, _d.z), ay = Math.abs(y);
      const w = ay < 1.3 ? 1 : ay < 2.1 ? (2.1 - ay) / 0.8 : 0;
      yaw = clamp(y, -1.3, 1.3) * w;
      pitch = clamp(Math.atan2(_d.y, Math.hypot(_d.x, _d.z)), -0.6, 0.45) * w;
    }
    this.yaw = vers(this.yaw, yaw, 0.16, dt);
    this.pitch = vers(this.pitch, pitch, 0.16, dt);
    if (Math.abs(this.yaw) + Math.abs(this.pitch) < 1e-3) return;
    // balle en main, on ne tourne pas le haut du dos : les bras (et donc le ballon) suivraient ; mains sur
    // les genoux non plus, elles glisseraient
    const dos = p.hasBall || this.souffle > 0.01 ? 0 : 0.18;
    if (dos) A.ajouter('Spine2', 0, this.yaw * dos);
    A.ajouter('Neck', -this.pitch * 0.4, this.yaw * (0.37 + 0.18 - dos));
    A.ajouter('Head', -this.pitch * 0.6, this.yaw * 0.45);
  }

  // MAINS SUR LES GENOUX. On garde les pieds EXACTEMENT où le clip les avait mis, on descend et on recule
  // le bassin, on plie le dos, puis la cinématique inverse replie les jambes sur ces pieds et pose les
  // mains juste au-dessus des genoux, doigts vers l'intérieur. La tête se relève pour regarder devant.
  _mainsSurGenoux(A, k, dt) {
    const hips = A.bone('Hips');
    for (const c of ['Left', 'Right']) {
      A.bone(c + 'Foot').getWorldPosition(_cheville[c]);
      A.bone(c + 'ToeBase').getWorldPosition(_orteil[c]);
    }
    // bassin : 15 cm plus bas, 12 cm en arrière (on s'assoit un peu sur ses talons)
    hips.getWorldPosition(_w);
    _w.addScaledVector(_ha, -0.15 * k).addScaledVector(_av, -0.12 * k);
    hips.parent.updateWorldMatrix(true, false);
    hips.position.copy(hips.parent.worldToLocal(_w));
    // le dos se plie, la tête se relève
    const heave = Math.sin(this.resp) * 0.035;
    A.ajouter('Hips', 0.30 * k);                         // le bassin bascule : le dos part de là
    A.ajouter('Spine', 0.30 * k + heave * k);
    A.ajouter('Spine1', 0.24 * k);
    A.ajouter('Spine2', 0.14 * k);
    A.ajouter('Neck', -0.36 * k);
    A.ajouter('Head', -0.34 * k);
    for (const c of ['Left', 'Right']) {
      const sg = c === 'Left' ? 1 : -1;
      // jambes : pieds en place, genoux vers l'avant et un peu dehors
      A.bone(c + 'UpLeg').getWorldPosition(_pole);
      _pole.addScaledVector(_av, 0.8).addScaledVector(_ga, sg * 0.12);
      A.ikJambe(c, _cheville[c], _orteil[c], _pole, 1);
    }
    for (const c of ['Left', 'Right']) {
      if (!A.aMains(c)) continue;
      const sg = c === 'Left' ? 1 : -1;
      // le poignet juste au-dessus et un peu devant la rotule, légèrement dehors
      A.bone(c + 'Leg').getWorldPosition(_g);
      _g.addScaledVector(_ha, 0.075).addScaledVector(_av, 0.02).addScaledVector(_ga, sg * 0.035);
      _f.copy(_av).multiplyScalar(0.55).addScaledVector(_ha, -0.55).addScaledVector(_ga, -sg * 0.45).normalize();   // doigts : vers le bas et l'intérieur
      _n.copy(_ha).multiplyScalar(-1).addScaledVector(_av, -0.3).normalize();                                        // paume sur la cuisse
      _pole.copy(_g).addScaledVector(_ga, sg * 0.45).addScaledVector(_ha, 0.1).addScaledVector(_av, -0.1);           // coudes dehors
      A.ikBras(c, _g, _f, _n, _pole, k);
      A.plierDoigts(c, [0.45, 0.4, 0.3], k);
    }
  }

  // Un pied « touche » quand il redescend sous 7 cm après être monté au-dessus de 11 : l'hystérésis évite
  // le crépitement d'un pied qui traîne. Le son est proportionnel à l'allure, et une réception de saut
  // claque plus fort.
  _appuis(A, dt) {
    const p = this.p;
    if (!Couches.son || !(p.mesh.visible || p.vuePremiere)) { this.enAir = p.airborne; return; }
    if (this.enAir && !p.airborne) Couches.son.reception(p.pos, clamp(0.5 + Math.abs(p.jumpVelSol || 3) / 8, 0.5, 1));
    this.enAir = p.airborne;
    if (p.airborne || p.velo || p.assis) return;
    const v = Math.hypot(p.vel.x, p.vel.z);
    for (const c of ['Left', 'Right']) {
      this.pasCd[c] = Math.max(0, this.pasCd[c] - dt);
      const os = A.bone(c + 'ToeBase') || A.bone(c + 'Foot');
      if (!os) continue;
      os.getWorldPosition(_w);
      const y = _w.y - p.mesh.position.y;
      if (this.pieds[c] && y > 0.11) this.pieds[c] = false;
      else if (!this.pieds[c] && y < 0.07) {
        this.pieds[c] = true;
        if ((v > 0.6 || this.pivot > 0.3) && this.pasCd[c] <= 0) {
          this.pasCd[c] = 0.18;
          Couches.son.pas(p.pos, clamp(v / 6.5, 0.22, 1));
        }
      }
    }
  }
}
