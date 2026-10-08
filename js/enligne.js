// MATCH EN LIGNE — un vrai match à plusieurs, lancé depuis le cercle bleu du hub.
//
// LE PRINCIPE : UNE SEULE PARTIE, CELLE DE L'HÔTE. Celui qui lance le match depuis le cercle le simule, et
// il est le seul. Les invités n'envoient que leurs COMMANDES (manche + touches) ; l'hôte les rejoue sur leur
// joueur exactement comme celles de son clavier, puis renvoie vingt fois par seconde une IMAGE du match :
// positions, ballon, score, chrono, et l'état d'animation complet de chaque joueur (voir Player.etatAnim).
//
// Pourquoi pas deux simulations calées sur la même graine ? Parce qu'il suffit d'un pas de décalage — une
// commande arrivée une image plus tard — pour que les deux parties divergent pour de bon : l'un voit un
// panier, l'autre un contre. Avec un hôte, il n'y a qu'une vérité et personne ne peut la contester.
//
// Le relais (serveur/relais.js) n'a rien à apprendre : `start` part déjà à tout le salon, `input` et
// `state` aux autres seulement. Aucun redéploiement n'est nécessaire.
//
// LE MIROIR. Tout le jeu est écrit du point de vue de l'équipe 0 (« à toi », « ton panier », les couleurs
// du score, la caméra). Un invité placé dans l'équipe 1 de l'hôte voit donc la partie À L'ENVERS : chez lui
// son équipe est l'équipe 0 et attaque le panier d'en face. Les identifiants de joueurs, les équipes et le
// score sont retournés à la réception ; les positions, elles, sont dans le monde et ne bougent pas.
//
// FLUIDE CHEZ L'INVITÉ (06/10/2026). Avant, chaque joueur rattrapait la dernière image reçue, et son propre
// joueur ne bougeait qu'un aller-retour après la touche.
//  - L'HEURE DE L'HÔTE. Chaque image porte l'heure de l'hôte du pas simulé (`tm`, ms). L'invité estime l'horloge de
//    l'hôte (Horloge, js/net.js) et montre les autres joueurs ET le ballon tels qu'ils étaient 80 à 150 ms plus tôt,
//    interpolés entre deux images déjà reçues (Tampon). Les gestes, le score et les événements de l'image sont
//    rejoués au même instant que les positions : le panier compte quand le ballon passe le cercle à l'écran.
//  - SON JOUEUR EST PRÉDIT. Il court ici, tout de suite, avec la même mécanique que chez l'hôte (Player.move) et ses
//    propres commandes. L'hôte renvoie le numéro de la dernière commande reçue (`ak`) : l'invité en déduit
//    l'aller-retour commande -> image, et compare la position de l'hôte à celle qu'il avait lui-même il y a cet
//    aller-retour (`hist`). L'écart se résorbe en douceur (constante de 0,1 s, environ 15 % par image à 60 im/s),
//    d'un coup au-delà de 1,5 m. Les gestes (tir, passe, vol...) restent décidés par l'hôte.
//  - LA JAUGE DE TIR tourne chez l'invité dès l'appui ; au lâcher il envoie la valeur qu'il a vue (`w`), que l'hôte
//    prend si elle est à moins de TOL_JAUGE de la sienne (les deux ont démarré à un trajet réseau près : on juge le
//    joueur sur ce qu'il a vu, pas sur la gigue du wifi). Au-delà, c'est la valeur de l'hôte.
//
// REJOINDRE UN MATCH EN COURS (06/10/2026).
//  - L'hôte ANNONCE son match toutes les deux secondes (`mode` + `ann`) : terrain, score, joueurs, places tenues par
//    l'ordinateur, spectateurs. Chaque client en tient la liste (Matchs), oubliée 6 s après la dernière annonce, et
//    l'hôte dit `annFin` en partant.
//  - REJOINDRE : `mode` + `rej`. L'hôte vérifie (même terrain, place libre) et donne au nouveau venu un joueur tenu
//    par l'ordinateur, refait à son personnage et à sa tenue, puis renvoie la fiche complète du match (`start`,
//    avec enCours, mid et pour). Le nouveau venu s'installe et reprend le match où il en est, score compris ; ceux
//    qui y sont déjà mettent seulement à jour la liste des joueurs ; les autres l'ignorent. Refus : `rejNon`.
//  - REGARDER : `specReq` -> `spec`. Le spectateur suit les images comme un invité, n'envoie rien, caméra de
//    diffusion ; il peut rejoindre si une place se libère.
//  - Un départ du salon (`leave`) rend la place à l'ordinateur deux secondes plus tard s'il n'y a plus de nouvelles.
//    L'hôte qui passe en arrière-plan le dit (`hp`) : ses invités l'attendent au lieu de rester figés sans un mot.
//  Tout ce courrier voyage dans le type `mode`, que le relais déployé rediffuse sans le lire (aucun redéploiement) et
//  dont un ancien client ne lit que le champ `mode`, absent ici.
import * as THREE from 'three';
import { EMOTES } from './emotes.js';
import { ROSTER } from './roster.js';
import { hdist, horsArc } from './util.js';
import { COURT, BALL_R, METER_TIME } from './config.js';
import { badgeFx } from './badges.js';
import { Horloge, Tampon, heurePas } from './net.js';

// Les touches qui comptent en match. Tout le reste (pause, caméra, téléphone) reste local.
export const ACTIONS = ['shoot', 'pass', 'spin', 'dribble', 'legs', 'behind', 'bump', 'sprint', 'walk', 'switch'];
const CADENCE_IMAGES = 1 / 20;      // images du match envoyées par l'hôte
const CADENCE_COMMANDES = 1 / 20;   // commandes d'un invité quand seul le manche bouge (les appuis partent tout de suite)
const SILENCE_MAX = 6;              // secondes sans nouvelles avant de considérer l'autre comme parti
const SILENCE_CACHE = 30;           // ... quand l'hôte a prévenu que son onglet est passé en arrière-plan
const SILENCE_PERDU = 5;            // ... quand le relais a dit que l'hôte a quitté le salon (il peut y revenir)
const ATTENTE = 1.2;                // au-delà, on dit à l'invité que l'hôte ne répond plus
const ANNONCE = 2;                  // secondes entre deux annonces du match (hôte)
const OUBLI_MATCH = 6000;           // ms sans annonce avant d'oublier un match
const TOL_JAUGE = 0.2;              // écart de jauge (0..1) accepté entre le lâcher de l'invité et l'hôte
const SNAP_PREDIT = 1.5;            // m : au-delà, le joueur prédit est reposé d'un coup
const CORR_T = 0.1;                 // s : constante de temps de la correction du joueur prédit
const PAS = 1 / 120;                // le pas de simulation du jeu (Game.frame)

const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;
const _t = new THREE.Vector3(), _d = new THREE.Vector3(), _ax = new THREE.Vector3();
const _L = {}, _B = {};

// Les commandes d'un invité, vues par l'hôte. Même interface que js/input.js : le code du joueur contrôlé
// (Game.controlUser) ne fait aucune différence entre un clavier et un joueur à l'autre bout du réseau.
// `joueur()` : le joueur qu'il pilote en ce moment (pour la jauge de tir, voir released).
export class EntreeDistante {
  constructor(joueur = null) {
    this.bas = new Set(); this.appuis = new Set(); this.lachers = new Set();
    this.dir = new THREE.Vector3(); this.amp = 1; this.vu = 0;
    this.q = 0;                    // numéro de la dernière commande reçue (renvoyé dans l'image : `ak`)
    this.wLache = null;            // la jauge que l'invité a vue au lâcher du tir
    this.joueur = joueur;
  }
  recevoir(m) {
    const x = +m.x || 0, z = +m.z || 0, l = Math.hypot(x, z);
    this.dir.set(l > 1 ? x / l : x, 0, l > 1 ? z / l : z);        // jamais plus vite que le manche à fond
    this.amp = m.a === undefined ? 1 : Math.max(0, Math.min(1, +m.a || 0));
    this.bas = new Set((m.d || []).filter((k) => ACTIONS.includes(k)));
    for (const k of m.p || []) if (ACTIONS.includes(k)) this.appuis.add(k);
    for (const k of m.r || []) if (ACTIONS.includes(k)) this.lachers.add(k);
    if (Number.isFinite(m.q) && m.q > this.q) this.q = m.q;
    if ((m.r || []).includes('shoot') && Number.isFinite(+m.w)) this.wLache = Math.max(0, Math.min(1.2, +m.w));
    this.vu = 0;
  }
  down(id) { return this.bas.has(id); }
  pressed(id) { return this.appuis.delete(id); }
  // Un appui et un relâcher arrivés dans le même paquet (tapotement) : le relâcher attend que l'appui ait
  // été lu, sinon le tir s'armerait et ne partirait jamais.
  // LE LÂCHER DU TIR À L'HEURE DE L'INVITÉ (voir l'en-tête) : Game.handleBallInput lit ce relâcher juste avant
  // d'ajouter un pas à la jauge puis de juger le tir sur `windup` — on y pose donc la valeur vue par l'invité,
  // bornée à TOL_JAUGE de celle de l'hôte, moins le pas qui va s'ajouter.
  released(id) {
    if (this.appuis.has(id)) return false;
    const ok = this.lachers.delete(id);
    if (ok && id === 'shoot' && this.wLache !== null) {
      const u = this.joueur ? this.joueur() : null;
      if (u && u.state === 'windup') u.windup = Math.max(u.windup - TOL_JAUGE, Math.min(u.windup + TOL_JAUGE, this.wLache)) - PAS / METER_TIME;
      this.wLache = null;
    }
    return ok;
  }
  peek(id) { return this.appuis.has(id); }
  sprint() { return this.bas.has('sprint'); }
  amplitude() { return this.amp; }
}

export class MatchEnLigne {
  // Les options de Game.setup, vues depuis CE client (miroir compris). `moi` null : un spectateur, sans miroir.
  static options(m, moi) {
    const fiche = (id) => ROSTER.find((r) => r.id === id) || ROSTER[0];
    const me = (m.humains || []).find((h) => h.id === moi);
    const miroir = !!moi && m.hote !== moi && !!me && me.team === 1;
    let A = m.teamA.map(fiche), B = m.teamB.map(fiche);
    let names = Array.isArray(m.names) ? [...m.names] : undefined;
    if (miroir) { [A, B] = [B, A]; if (names) names.reverse(); }
    return { teamA: A, teamB: B, target: m.target, half: !!m.half, difficulty: m.difficulty || 'normal', names, seed: m.seed, miroir };
  }

  // LE MONDE DU MATCH (parc entier, lot A7) : l'hôte l'annonce dans `ter` (le monde de js/presence.js : 'parc' pour le
  // parc entier, sinon le nom du terrain). Vrai si l'invité, dont le monde est `ter`, n'est pas dans le même : il ne
  // suit pas ce match. LECTURE SEULE : un message sans `ter` (ancien client, drapeau baissé) ne dit rien, et l'on s'en
  // tient, comme avant, aux dimensions du terrain (`dims`, Game.recevoirMatch).
  static autreMonde(m, ter) {
    return !!(m && typeof m.ter === 'string' && ter && m.ter !== ter);
  }

  // `role` : 'hote', 'client' (invité qui joue) ou 'spect' (spectateur) ; par défaut, d'après l'hôte du match.
  constructor(game, room, m, role = null) {
    this.game = game; this.room = room; this.moi = room.ident.id;
    this.hote = m.hote; this.role = role || (m.hote === this.moi ? 'hote' : 'client');
    this.mid = m.mid || null;
    this.spec = { ...m };               // la fiche du match ; l'hôte la tient à jour pour ceux qui arrivent
    delete this.spec.enCours; delete this.spec.pour;
    this.humains = (m.humains || []).slice();
    const me = this.humains.find((h) => h.id === this.moi);
    this.miroir = this.role === 'client' && !!me && me.team === 1;
    this.pilotes = new Map();           // hôte : id de l'invité -> { id, nom, team, user, input }
    this.evts = []; this.tImg = 0; this.seq = 0;
    this.dernierN = 0; this.silence = 0;
    this.tCmd = 0; this.dernierCmd = '';
    this.fini = false;
    // hôte : spectateurs, annonce, début du match (pour la durée annoncée)
    this.spect = new Map(); this.tAnn = ANNONCE - 0.3; this.t0 = game.time || 0;
    // invité et spectateur : horloge de l'hôte, tampons des joueurs et du ballon, images en attente d'être jouées
    this.horl = new Horloge(); this.tampons = new Map(); this.tBalle = new Tampon(1000, 4); this.images = [];
    // invité : commandes envoyées (numéro -> heure), aller-retour mesuré, historique du joueur prédit
    this.cmd = { x: 0, z: 0, sprint: false, marche: false };
    this.qSeq = 0; this.envois = new Map(); this.akVu = 0; this.lagEch = []; this.lag = null;
    this.propre = null; this.hist = []; this.corr = new THREE.Vector3(); this.relache = null;
    this.authF = new THREE.Vector3(0, 0, 1);
    this.jauge = null; this.jaugeHote = false;
    this.hoteCache = false; this.muet = false; this.perdu = 0; this.tRedemande = -10;
    if (this.role === 'hote') {
      // L'ONGLET DE L'HÔTE PASSE EN ARRIÈRE-PLAN : le navigateur y suspend l'image, donc la simulation, et ses invités
      // voyaient le match se figer sans comprendre. On le leur dit tout de suite (la minuterie, elle, tourne encore).
      this._vis = () => { if (!this.fini && this.mid) this.room.envoyerDirect({ t: 'mode', hp: { mid: this.mid, cache: document.hidden ? 1 : 0 } }); };
      document.addEventListener('visibilitychange', this._vis);
    }
  }

  // équipe de l'hôte <-> équipe locale (la même opération dans les deux sens)
  eq(t) { return this.miroir ? 1 - t : t; }
  pid(p) { return this.eq(p.team) * 10 + p.slot; }
  joueur(pid) {
    if (typeof pid !== 'number' || pid < 0) return null;
    const T = this.game.teams[this.eq(Math.floor(pid / 10))];
    return (T && T.players[pid % 10]) || null;
  }

  // Après Game.startMatch : chacun retrouve son joueur.
  installer() {
    const g = this.game, cap = g.captain;          // (le poste habillé par applyShop avec MA tenue : voir plus bas)
    for (const h of this.humains) {
      const p = this.joueur(h.team * 10 + h.slot);
      if (!p) continue;
      p.humain = h.id;
      p.speedMul = 1;                   // la difficulté ralentit l'ordinateur, pas un joueur en chair et en os
      // SA TENUE, la même sur tous les écrans (04/10/2026) : sans ça, chacun voyait les autres dans la tenue de la
      // fiche, et sa propre tenue posée sur le poste 1 de l'équipe A — qui n'est pas forcément le sien (applyShop
      // habille le capitaine). Un ancien client n'envoie pas `tn` : tenue de la fiche.
      if (g.constructor.habiller) g.constructor.habiller(p, Array.isArray(h.tn) ? h.tn : [], p.baseDef || p.def);
      if (h.id === this.moi && this.role !== 'spect') { g.user = g.captain = p; if (g.teamSize > 1) g.hud.controlled(p.def.name); }
      else if (this.role === 'hote') this.ajouterPilote(h, p);
    }
    // (le poste 1 de l'équipe A, habillé par applyShop avec MA tenue, tenu ici par l'ordinateur : tenue de la fiche)
    if (cap && cap.humain === undefined && g.constructor.habiller) g.constructor.habiller(cap, [], cap.baseDef || cap.def);
    // Chez l'invité, TOUS les joueurs sont « distants » : leur position vient de l'hôte, et aucun geste ne
    // doit être retiré au sort une seconde fois (variante de tir, de dribble, fin d'emote).
    if (this.role !== 'hote') for (const p of g.players) { p.remote = true; p.netInit = false; }
  }
  ajouterPilote(h, p) {
    const pil = { id: h.id, nom: h.nom || 'Joueur', team: p.team, user: p, input: null };
    pil.input = new EntreeDistante(() => pil.user);
    this.pilotes.set(h.id, pil);
    return pil;
  }

  // On sort du match (fin, abandon, retour à la balade) : les joueurs redeviennent locaux.
  quitter() {
    const g = this.game;
    if (!this.fini) {
      this.fini = true;
      if (this.role === 'hote') { this.evt({ k: 'stop' }); this.envoyerImage(); }
      else if (this.role === 'client') this.room.envoyerDirect({ t: 'input', to: this.hote, quit: 1 });
    }
    if (this.role === 'hote' && this.mid) this.room.envoyerDirect({ t: 'mode', annFin: this.mid });
    if (this.role === 'spect' && this.mid) this.room.envoyerDirect({ t: 'mode', specFin: { mid: this.mid, id: this.moi } });
    if (this._vis) { document.removeEventListener('visibilitychange', this._vis); this._vis = null; }
    if (this.jauge) { this.jauge = null; g.hud.meter(false); }
    for (const p of g.players) { p.remote = false; p.humain = undefined; p.net = null; }
    if (this.role === 'spect') this.rendreBalade();
  }

  // LE SPECTATEUR RETROUVE SON JOUEUR. Game.setup a remplacé le joueur de balade par le premier joueur du match (on
  // n'en tient aucun) : on le refait, et la caméra reprend son réglage. `mode` repasse à 'lobby' AVANT que
  // Game.enterLobby ne le lise : regarder un match ne consomme pas le boost de nourriture du prochain.
  rendreBalade() {
    const g = this.game, def = this.defBalade;
    if (this.camAvant) g.camMode = this.camAvant;
    if (def && g.captain && g.captain.baseDef !== def && g._newPlayer) {
      const p = g._newPlayer(def, 0, 0); p.baseDef = def;
      g.players.push(p); g.captain = g.user = p;
    }
    if (g.mode === 'match') g.mode = 'lobby';
  }

  // ================================================================== HÔTE
  piloteDe(p) { for (const pil of this.pilotes.values()) if (pil.user === p) return pil; return null; }
  prisParAutre(p, pil) {
    const g = this.game;
    if (p === g.user && !g.autoUser) return true;
    for (const q of this.pilotes.values()) if (q !== pil && q.user === p) return true;
    return false;
  }
  // Même règle que pour le joueur local : en attaque on joue le porteur, sinon on change à la demande.
  choisirPilotes(dt) {
    const g = this.game, ball = g.ball;
    for (const pil of [...this.pilotes.values()]) {
      pil.input.vu += dt;
      if (pil.input.vu > SILENCE_MAX) { this.abandon(pil); continue; }
      const h = ball.holder;
      if (h && h.team === pil.team && h !== pil.user && !this.prisParAutre(h, pil)) { pil.user = h; continue; }
      if (pil.input.pressed('switch')) {
        const ref = h ? h.pos : ball.pos;
        const c = g.teams[pil.team].players.filter((p) => p !== pil.user && !this.prisParAutre(p, pil))
          .sort((a, b) => hdist(a.pos, ref) - hdist(b.pos, ref))[0];
        if (c) pil.user = c;
      }
    }
  }
  // Un invité parti (onglet fermé, liaison perdue, départ du salon) : l'ordinateur reprend son joueur, le match
  // continue, et sa place redevient libre pour quelqu'un d'autre.
  abandon(pil) {
    const g = this.game;
    this.pilotes.delete(pil.id);
    for (const p of g.players) if (p.humain === pil.id) { p.humain = undefined; if (p.team === 1 && g.diff) p.speedMul = g.diff.speed; }
    this.humains = this.humains.filter((h) => h.id !== pil.id);
    this.spec = { ...this.spec, humains: this.humains };
    g.hud.feedback(`${String(pil.nom).toUpperCase()} A QUITTÉ LE MATCH`, 'warn');
    this.annoncer();
  }
  recevoirInput(m) {
    if (this.role !== 'hote' || m.to !== this.moi) return;
    const pil = this.pilotes.get(m.from);
    if (!pil) return;
    if (m.quit) { this.abandon(pil); return; }
    pil.input.recevoir(m);
  }
  // Un événement que les invités doivent voir ou entendre (panier, perte de balle, fin). `urgent` : on
  // n'attend pas l'image suivante — après le buzzer, il n'y en a plus.
  evt(e, urgent = false) {
    this.evts.push(e);
    if (urgent) this.envoyerImage();
    if (e.k === 'fin' && this.role === 'hote' && this.mid) this.room.envoyerDirect({ t: 'mode', annFin: this.mid });
  }
  // LES CHOCS DU BALLON (06/10/2026) : cercle (`rim`), planche (`bd`), dunk planté (`dk`), relevés par js/ball.js et
  // js/game.js. L'invité ne simule plus le ballon libre (balleAffichee) : sans eux, chez lui, ni cercle qui vibre, ni son
  // du cercle ou de la planche, ni claquement de dunk. Ils partent avec l'image suivante et sont rejoués à son heure
  // d'affichage (evenement), avec le ballon du tampon. Un par sorte et par panier dans une image : la balle qui roule sur
  // l'arceau le touche à chaque sous-pas, on garde le plus fort. Un ancien invité ignore ces sortes d'événements.
  choc(k, s, f, v = 0, tireur = null) {
    if (this.fini) return;
    const e = this.evts.find((x) => x.k === k && x.s === s);
    if (e) { e.f = Math.max(e.f, r2(f)); if (k !== 'dk') e.v = Math.max(e.v, r2(v)); return; }
    this.evts.push(k === 'dk' ? { k, s, f: r2(f), i: tireur ? this.pid(tireur) : -1 } : { k, s, f: r2(f), v: r2(v) });
  }
  // Retour d'un geste (qualité du tir...) destiné au joueur qui l'a fait. `ns` : tir refusé (balle à ressortir
  // derrière l'arc, Game.refuserTir) — l'invité coupe la jauge qu'il aurait lancée chez lui.
  retour(p, txt, cls, mk = null, ns = 0) {
    const pil = this.piloteDe(p);
    if (pil) this.evt(ns ? { k: 'fb', h: pil.id, txt, c: cls, ns: 1 } : { k: 'fb', h: pil.id, txt, c: cls, mk });
  }
  apresPas(dt) {
    this.tImg += dt;
    if (this.tImg >= CADENCE_IMAGES) this.envoyerImage();
    this.tAnn += dt;
    if (this.tAnn >= ANNONCE) this.annoncer();
  }
  envoyerImage() {
    this.tImg = 0;
    this.room.envoyerDirect(this.image());
    this.evts = [];
  }
  image() {
    const g = this.game, b = g.ball;
    const pl = g.players.map((p) => {
      const o = { i: this.pid(p), p: [r2(p.pos.x), r2(p.pos.z)], f: [r2(p.facing.x), r2(p.facing.z)], v: [r2(p.vel.x), r2(p.vel.z)], st: p.state, sp: r2(p.speedNow), e: Math.round(p.stamina) };
      if (p.airborne || p.jumpY > 0) { o.j = r3(p.jumpY); o.jv = r2(p.jumpVel); }
      if (p.hasBall) o.b = 1;
      if (p.sprinting) o.s = 1;
      if (p.stun > 0) o.u = r2(p.stun);
      if (p.state === 'windup') o.w = r3(p.windup);
      o.an = p.etatAnim();
      return o;
    });
    const ctl = { [this.moi]: this.pid(g.user) }, ak = {};
    for (const pil of this.pilotes.values()) { ctl[pil.id] = this.pid(pil.user); if (pil.input.q) ak[pil.id] = pil.input.q; }
    const s = b.shot;
    // `tm` : l'heure de l'hôte (ms) à laquelle correspond ce pas simulé (heurePas). Pas le temps du match : quand l'image
    // de l'hôte se fige, le jeu plafonne le temps simulé, et un temps de match aurait reculé pour de bon sur l'heure
    // réelle — l'invité aurait attendu des images qui ne viendraient jamais à l'heure prévue.
    return {
      t: 'state', n: ++this.seq, tm: Math.round(heurePas(undefined, PAS, g)), ...(this.mid ? { mid: this.mid } : {}),
      st: g.state, stT: r2(g.stateT || 0),
      sc: [g.teams[0].score, g.teams[1].score], clock: r2(g.shotClock || 0), off: g.offense,
      ball: { p: [r3(b.pos.x), r3(b.pos.y), r3(b.pos.z)], v: [r2(b.vel.x), r2(b.vel.y), r2(b.vel.z)], s: b.state, h: b.holder ? this.pid(b.holder) : -1,
        sh: s && s.shooter ? [s.type, s.made ? 1 : 0, this.pid(s.shooter), s.points || 2] : null },
      mom: [r2(g.momentum.user), r2(g.momentum.cpu), g.fire.user ? 1 : 0, g.fire.cpu ? 1 : 0],
      // `so` : l'équipe qui doit ressortir la balle derrière l'arc (demi-terrain, Game.majSortie) ; absent sinon. Un
      // ancien invité l'ignore.
      ...(g.aSortir >= 0 ? { so: this.eq(g.aSortir) } : {}),
      pl, ctl, ak, ev: this.evts,
    };
  }

  // L'ANNONCE DU MATCH (voir l'en-tête) : ce que la liste des matchs en cours affiche, et ce qu'il faut pour savoir si
  // l'on peut entrer. Une place libre = un joueur tenu par l'ordinateur.
  annoncer() {
    this.tAnn = 0;
    if (this.role !== 'hote' || !this.mid || this.fini) return;
    const g = this.game, s = this.spec;
    const places = g.players.filter((p) => p.humain === undefined).map((p) => ({ team: p.team, slot: p.slot }));
    this.room.envoyerDirect({ t: 'mode', ann: {
      v: 1, mid: this.mid, hote: this.moi, nomHote: this.room.ident.display, ter: s.ter || null, dims: s.dims || null,
      size: g.teamSize, target: s.target, half: !!s.half, sc: [g.teams[0].score, g.teams[1].score],
      noms: [g.teams[0].name, g.teams[1].name], t: Math.max(0, Math.round((g.time || 0) - this.t0)),
      places, humains: this.humains.map((h) => ({ id: h.id, nom: h.nom, team: h.team, slot: h.slot })), spect: this.spect.size,
    } });
  }
  // La fiche complète du match, pour celui qui arrive (`pour`), score compris.
  envoyerFiche(pour) {
    const g = this.game;
    this.room.lancerMatch({ ...this.spec, humains: this.humains, enCours: true, mid: this.mid, pour, sc: [g.teams[0].score, g.teams[1].score] });
  }

  // UN JOUEUR DEMANDE À ENTRER (`rej`, voir l'en-tête). On lui donne un joueur de l'ordinateur — de préférence dans
  // l'équipe qu'il demande, sinon dans celle qui a le moins de vrais joueurs —, refait à son personnage.
  rejoindre(r, from) {
    const g = this.game;
    if (this.role !== 'hote' || !r || r.mid !== this.mid || r.id !== from) return;
    const non = (raison) => this.room.tr.send({ t: 'mode', rejNon: { mid: this.mid, id: r.id, raison } });
    if (this.fini || g.state === 'over' || g.reseau !== this) { non('LE MATCH EST FINI'); return; }
    const d = this.spec.dims;
    if ((Array.isArray(r.dims) && Array.isArray(d) && (Math.abs(r.dims[0] - d[0]) > 0.01 || Math.abs(r.dims[1] - d[1]) > 0.01 || (r.dims[2] || 0) !== (d[2] || 0)))
      || (typeof r.ter === 'string' && typeof this.spec.ter === 'string' && r.ter !== this.spec.ter)) { non('MATCH SUR UN AUTRE TERRAIN'); return; }
    // déjà dedans (il revient après une coupure, ou sa première demande s'est perdue) : on lui renvoie sa fiche
    const deja = this.humains.find((h) => h.id === r.id);
    if (deja) {
      const p = this.joueur(deja.team * 10 + deja.slot);
      if (!this.pilotes.has(r.id) && p) this.ajouterPilote(deja, p);
      this.envoyerFiche(r.id);
      return;
    }
    if (this.humains.length >= 10) { non('MATCH COMPLET'); return; }
    const p = this.placeLibre(r);
    if (!p) { non('PLUS DE PLACE LIBRE'); return; }
    const charId = ROSTER.some((x) => x.id === r.char) ? r.char : (p.baseDef || p.def).id;
    const tn = Array.isArray(r.tn) ? r.tn.slice(0, 3).map((v) => (typeof v === 'string' ? v : null)) : null;
    const h = { id: r.id, nom: String(r.nom || 'Joueur').slice(0, 16), team: p.team, slot: p.slot, ...(tn ? { tn } : {}) };
    p.humain = h.id; p.speedMul = 1;
    this.changerFiche(p, charId, tn);
    const pil = this.ajouterPilote(h, p);
    // Le joueur qu'on lui donne était peut-être celui que l'hôte (ou un autre invité) tenait à cet instant : chacun
    // reprend alors le sien.
    if (g.user === p) { const mien = g.players.find((q) => q.humain === this.moi); if (mien) g.setControlled(mien); }
    for (const q of this.pilotes.values()) if (q !== pil && q.user === p) q.user = g.players.find((x) => x.humain === q.id) || q.user;
    this.humains.push(h);
    const cle = p.team === 0 ? 'teamA' : 'teamB';
    this.spec = { ...this.spec, humains: this.humains, [cle]: this.spec[cle].map((c, i) => (i === p.slot ? charId : c)) };
    this.spect.delete(h.id);
    this.envoyerFiche(h.id);
    g.hud.feedback(`${h.nom.toUpperCase()} REJOINT LE MATCH`, 'info');
    this.annoncer();
  }
  placeLibre(r) {
    const g = this.game, libres = g.players.filter((p) => p.humain === undefined);
    if (!libres.length) return null;
    const nH = (t) => this.humains.filter((h) => h.team === t).length;
    const tenu = (p) => p === g.user || [...this.pilotes.values()].some((q) => q.user === p);
    const cout = (p) => (r.team === p.team ? -10 : 0) + (r.team === p.team && r.slot === p.slot ? -5 : 0) + nH(p.team) + (tenu(p) ? 0.5 : 0);
    return libres.sort((a, b) => cout(a) - cout(b))[0];
  }
  // Refait le joueur `p` au personnage `charId` et à la tenue `tn` (un joueur qui prend la place de l'ordinateur).
  // Les couleurs d'équipe restent celles du poste (bonhommes de secours) ; l'avatar 3D se recharge (Player.setAvatar).
  changerFiche(p, charId, tn) {
    const g = this.game, fiche = ROSTER.find((x) => x.id === charId);
    if (fiche && p.baseDef !== fiche) {
      p.def = { ...fiche, color1: p.def.color1, color2: p.def.color2 };
      p.baseDef = fiche; p.h = fiche.height;
      p.badgeFx = badgeFx(fiche.badges);
    }
    if (g.constructor.habiller) g.constructor.habiller(p, Array.isArray(tn) ? tn : [], p.baseDef || p.def);
  }
  // Un spectateur demande la fiche du match (`specReq`).
  demandeSpect(r, from) {
    const g = this.game;
    if (this.role !== 'hote' || !r || r.mid !== this.mid || r.id !== from || this.fini) return;
    this.spect.set(r.id, true);
    this.room.tr.send({ t: 'mode', spec: { mid: this.mid, pour: r.id, match: { ...this.spec, humains: this.humains, enCours: true, mid: this.mid, sc: [g.teams[0].score, g.teams[1].score] } } });
    this.annoncer();
  }
  finSpect(id) { if (this.spect.delete(id)) this.annoncer(); }

  // Quelqu'un a quitté le salon (`leave`, js/net.js) : un invité rend sa place deux secondes plus tard s'il ne donne plus
  // de nouvelles (choisirPilotes : son silence est avancé à SILENCE_MAX - 2). Le rendre tout de suite privait pour tout le
  // match un invité de la version d'avant — qui ne redemande pas sa place — dont le wifi avait sauté une seconde ; s'il
  // revient, ses commandes reprennent son joueur. (Un invité d'aujourd'hui parti plus longtemps la redemande tout seul :
  // sansJoueur.) L'hôte parti : on l'attend quelques secondes — un wifi qui saute le fait sortir et rentrer dans le salon,
  // et son match continue — puis retour à la balade (pasClient).
  depart(id) {
    const g = this.game;
    if (this.role === 'hote') {
      const pil = this.pilotes.get(id);
      if (pil) pil.input.vu = Math.max(pil.input.vu, SILENCE_MAX - 2);
      this.finSpect(id);
    } else if (id === this.hote && !this.fini) {
      this.hotePerdu = true; this.hoteCache = false;
      this.silence = Math.max(this.silence, ATTENTE); this.muet = true;
      g.hud.feedback('L’HÔTE A PERDU LA LIAISON…', 'warn');
    }
  }
  // L'onglet de l'hôte passe en arrière-plan, ou en revient (`hp`).
  hoteVisible(cache) {
    this.hoteCache = !!cache;
    if (cache && !this.fini) this.game.hud.feedback('L’HÔTE A MIS LE JEU EN ARRIÈRE-PLAN…', 'warn');
  }

  // La fiche du match a changé (quelqu'un est entré) : on met à jour qui tient quel joueur, sans rien relancer.
  majHumains(m) {
    const g = this.game, vus = new Set();
    for (const h of m.humains || []) {
      vus.add(h.id);
      const p = this.joueur(h.team * 10 + h.slot);
      if (!p || p.humain === h.id) continue;
      p.humain = h.id; p.speedMul = 1;
      if (this.role !== 'hote') {
        this.changerFiche(p, (h.team === 0 ? m.teamA : m.teamB)[h.slot], h.tn);
        if (h.id !== this.moi) g.hud.feedback(`${String(h.nom || 'Joueur').toUpperCase()} REJOINT LE MATCH`, 'info');
      }
    }
    if (this.role !== 'hote') {
      for (const p of g.players) if (p.humain !== undefined && !vus.has(p.humain)) p.humain = undefined;
      this.humains = (m.humains || []).slice();
    }
  }
  // L'annonce de notre propre match (invité, spectateur) : un joueur qui n'y est plus est reparti.
  majDepuisAnnonce(a) {
    if (this.role === 'hote' || !Array.isArray(a.humains)) return;
    const ids = new Set(a.humains.map((h) => h.id));
    const partis = this.humains.filter((h) => !ids.has(h.id) && h.id !== this.moi);
    if (!partis.length) return;
    for (const h of partis) this.game.hud.feedback(`${String(h.nom || 'Joueur').toUpperCase()} A QUITTÉ LE MATCH`, 'warn');
    this.humains = this.humains.filter((h) => ids.has(h.id) || h.id === this.moi);
    for (const p of this.game.players) if (p.humain !== undefined && !ids.has(p.humain) && p.humain !== this.moi) p.humain = undefined;
  }

  // ================================================================== INVITÉ ET SPECTATEUR
  // Une image de l'hôte : positions dans les tampons, son propre joueur tout de suite (prédiction), le reste en
  // attente de l'heure d'affichage (pasClient).
  recevoirEtat(m) {
    if (this.role === 'hote' || m.from !== this.hote || this.fini) return;
    if (this.mid && m.mid && m.mid !== this.mid) return;
    if (!(m.n > this.dernierN)) return;                 // image en retard sur la précédente : ignorée
    this.dernierN = m.n; this.silence = 0;
    const g = this.game;
    if (this.muet) { this.muet = false; this.hoteCache = false; this.hotePerdu = false; g.hud.feedback('L’HÔTE EST DE RETOUR', 'good'); }
    const tr = performance.now(), tm = Number.isFinite(m.tm) ? m.tm : tr;   // (un hôte d'avant : l'heure d'arrivée)
    this.horl.echantillon(tm, tr);
    for (const d of m.pl || []) {
      const p = this.joueur(d.i);
      if (!p) continue;
      let T = this.tampons.get(p);
      if (!T) { T = new Tampon(1000, 2.5); this.tampons.set(p, T); }
      T.ajouter({ t: tm, x: d.p[0], z: d.p[1], vx: d.v[0], vz: d.v[1], fx: d.f[0], fz: d.f[1] });
    }
    const B = m.ball;
    if (B) this.tBalle.ajouter({ t: tm, x: B.p[0], y: B.p[1], z: B.p[2], vx: B.v[0], vy: B.v[1], vz: B.v[2] });
    // la balle à ressortir (Game.majSortie) : tout de suite, c'est elle qui retient la jauge de tir (jaugeLocale)
    g.aSortir = Number.isInteger(m.so) ? this.eq(m.so) : -1;
    if (this.role === 'client') {
      // LE GEL DE L'HÔTE (compte à rebours, panier, perte de balle : Game.update n'y fait bouger personne) : jusqu'à quelle
      // heure de l'hôte, d'après l'image la plus récente — pas celle qu'on affiche, 80 à 150 ms plus tard (voir predire)
      this.gelFin = m.st === 'playing' ? -Infinity : m.st === 'over' ? Infinity : tm + Math.max(0, +m.stT || 0) * 1000;
      this.recevoirMien(m, tr);
      for (const e of m.ev || []) if (e.k === 'fb') this.evenement(e);     // le retour de SON tir : tout de suite
    }
    this.images.push({ tm, m });
    while (this.images.length > 40) this.appliquerImage(this.images.shift().m);
  }

  // SON JOUEUR (invité) : l'aller-retour des commandes, le joueur tenu, son état, et la correction de la prédiction.
  recevoirMien(m, tr) {
    const g = this.game;
    const ak = m.ak ? m.ak[this.moi] : undefined;
    if (Number.isFinite(ak) && ak > this.akVu) {
      const t0 = this.envois.get(ak);
      if (t0 !== undefined) this.lagEch.push({ v: tr - t0, t: tr });
      this.akVu = ak;
      for (const k of [...this.envois.keys()]) if (k <= ak) this.envois.delete(k);
    }
    while (this.lagEch.length && tr - this.lagEch[0].t > 4000) this.lagEch.shift();
    // le plus court aller-retour des quatre dernières secondes : celui d'une commande arrivée juste avant une image
    if (this.lagEch.length) { let v = Infinity; for (const e of this.lagEch) v = Math.min(v, e.v); this.lag = v; }
    const c = m.ctl ? m.ctl[this.moi] : undefined;
    // (06/10/2026) Plus compté parmi ses joueurs : on ne prédit plus rien — notre ancien joueur, tenu par l'ordinateur
    // chez l'hôte, est lu dans son tampon comme les autres, au lieu de courir sur place sans jamais être corrigé.
    if (c === undefined) { this.relacher(null); this.sansJoueur(); return; }
    this.perdu = 0;
    const mien = this.joueur(c), d = (m.pl || []).find((x) => x.i === c);
    if (!mien || !d) return;
    if (mien !== this.propre) {
      // un autre joueur de l'équipe (on prend le porteur en attaque) : la prédiction repart de la position de l'hôte.
      // (06/10/2026) EN DOUCEUR : l'écart entre la position affichée (lue 80 à 150 ms dans le passé) et celle de l'hôte
      // passe par la correction de la prédiction (CORR_T) au lieu d'un saut d'un mètre ; au-delà de SNAP_PREDIT, d'un
      // coup, comme avant. L'ancien joueur, lui, retourne à son tampon en douceur aussi (relacher).
      this.relacher(mien);
      this.propre = mien; this.hist = []; this.corr.set(0, 0, 0);
      const ex = d.p[0] - mien.pos.x, ez = d.p[1] - mien.pos.z;
      if (Math.hypot(ex, ez) > SNAP_PREDIT) { mien.pos.x = d.p[0]; mien.pos.z = d.p[1]; } else this.corr.set(ex, 0, ez);
      if (mien !== g.user) { g.user = mien; if (g.teamSize > 1) g.hud.controlled(mien.def.name); }
    }
    this.appliquerJoueur(mien, d, true);
    this.authF.set(d.f[0], 0, d.f[1]);
    this.reconcilier(mien, d.p[0], d.p[1], tr);
  }
  // Le joueur prédit cède la place à `suivant` (null : plus aucun). Il était affiché à l'heure de la prédiction ; il le
  // sera désormais à l'heure du tampon, un peu dans le passé : l'écart du premier pas est gardé puis résorbé (pasClient).
  relacher(suivant) {
    const p = this.propre;
    if (this.relache && this.relache.p === suivant) this.relache = null;
    if (!p || p === suivant) return;
    this.propre = null;
    this.relache = { p, dx: null, dz: 0 };
  }
  // L'hôte ne nous compte plus parmi ses joueurs (il nous a crus partis pendant une coupure) : on redemande notre
  // place, celle qu'on avait.
  sansJoueur() {
    if (++this.perdu < 10 || this.game.time - this.tRedemande < 3) return;
    this.tRedemande = this.game.time;
    const me = this.humains.find((h) => h.id === this.moi), g = this.game;
    this.room.tr.send({ t: 'mode', rej: { mid: this.mid, id: this.moi, nom: this.room.ident.display, char: g.captain && g.captain.baseDef ? g.captain.baseDef.id : null, tn: g.tenueIds ? g.tenueIds() : null, team: me ? me.team : undefined, slot: me ? me.slot : undefined } });
  }
  // Compare la position de l'hôte à celle qu'on avait il y a un aller-retour (voir l'en-tête).
  reconcilier(u, ax, az, tr) {
    const lag = this.lag !== null ? this.lag : 2 * (this.room.latence || 80) + 20;
    const H = this.hist;
    if (H.length < 2 || H[0].t > tr - lag) {
      if (Math.hypot(ax - u.pos.x, az - u.pos.z) > SNAP_PREDIT) { u.pos.x = ax; u.pos.z = az; this.hist = []; this.corr.set(0, 0, 0); }
      return;
    }
    const t = tr - lag;
    let i = H.length - 1;
    while (i > 0 && H[i - 1].t > t) i--;
    const a = H[Math.max(0, i - 1)], b = H[i], s = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 1;
    const ex = ax - (a.x + (b.x - a.x) * s), ez = az - (a.z + (b.z - a.z) * s);
    if (Math.hypot(ex, ez) > SNAP_PREDIT) {
      u.pos.x += ex; u.pos.z += ez;
      for (const e of H) { e.x += ex; e.z += ez; }
      this.corr.set(0, 0, 0);
    } else this.corr.set(ex, 0, ez);
  }
  // L'état d'un joueur dans une image (propre : son joueur prédit, dont la course est la nôtre)
  appliquerJoueur(p, d, propre) {
    p.state = d.st; p.hasBall = !!d.b; p.stamina = d.e; p.stun = d.u || 0;
    if (!propre) { p.speedNow = d.sp; p.sprinting = !!d.s; }
    if (!propre || !this.jauge) p.windup = d.w || 0;
    p.jumpY = d.j || 0; p.jumpVel = d.jv || 0; p.airborne = p.jumpY > 0.005 || p.jumpVel > 0.01;
    p.appliquerAnim(d.an, EMOTES, propre);
  }

  // Une image arrivée à l'heure d'affichage : gestes des autres joueurs, score, ballon, événements.
  appliquerImage(m) {
    const g = this.game;
    for (const d of m.pl || []) {
      const p = this.joueur(d.i);
      if (p && p !== this.propre) this.appliquerJoueur(p, d, false);
    }
    g.teams[this.eq(0)].score = m.sc[0]; g.teams[this.eq(1)].score = m.sc[1];
    g.hud.setScore(g.teams[0].score, g.teams[1].score);
    g.shotClock = m.clock; g.offense = this.eq(m.off);
    if (g.state !== 'over' && m.st !== 'over') { g.state = m.st; g.stateT = m.stT; }
    if (m.mom) {
      const [mu, mc, fu, fc] = m.mom;
      g.momentum.user = this.miroir ? mc : mu; g.momentum.cpu = this.miroir ? mu : mc;
      g.fire.user = !!(this.miroir ? fc : fu); g.fire.cpu = !!(this.miroir ? fu : fc);
      g.hud.momentum(g.momentum.user, g.momentum.cpu, g.fire.user, g.fire.cpu);
      g.fx.heat = g.fire.user ? 1 : 0;
    }
    this.balle(m.ball);
    // le spectateur suit le ballon : la caméra de diffusion vise entre lui et le joueur « tenu »
    if (this.role === 'spect' && g.ball.holder) g.user = g.ball.holder;
    for (const e of m.ev || []) if (e.k !== 'fb' || this.role !== 'client') this.evenement(e);
  }

  // Le ballon d'une image : qui le tient, et le tir en cours. Sa position libre vient du tampon (balleAffichee).
  balle(B) {
    if (!B) return;
    const g = this.game, ball = g.ball, h = B.h >= 0 ? this.joueur(B.h) : null;
    if (h) { if (ball.state !== 'held' || ball.holder !== h) ball.hold(h); }
    else { ball.holder = null; ball.state = B.s === 'held' ? 'loose' : B.s; }
    if (B.sh) {
      const cle = B.sh.join();
      if (!ball.shot || ball.shot.cle !== cle) {
        const tireur = this.joueur(B.sh[2]);
        ball.shot = tireur ? { cle, type: B.sh[0], made: !!B.sh[1], shooter: tireur, points: B.sh[3], t: 0, scored: false, passedRim: false, rimHit: false } : null;
      }
    } else if (!h) ball.shot = null;
    const owner = ball.holder || (ball.shot && ball.shot.shooter) || null;
    ball.setFire(!!owner && (owner.team === 0 ? g.fire.user : g.fire.cpu));
  }
  // Le ballon libre, à l'heure d'affichage : interpolé entre deux images (la parabole d'un tir est exacte entre deux
  // points avec leurs vitesses). Le rebond au sol se reconnaît au changement de sens de la vitesse : on le fait sonner.
  balleAffichee(tR, dt) {
    const g = this.game, ball = g.ball;
    if ((ball.state === 'held' && ball.holder) || !this.tBalle.n) { g.updateBall(dt); return; }
    this.tBalle.lire(tR, _B, 120);
    const vyAvant = this.vyBalle;
    ball.pos.set(_B.x, Math.max(BALL_R, _B.y), _B.z);
    ball.vel.set(_B.vx, _B.vy, _B.vz);
    if (vyAvant !== undefined && vyAvant < -1.2 && _B.vy > 0 && _B.y < 0.5) g.audio.bounce(Math.min(1, -vyAvant / 7), ball.pos);
    this.vyBalle = _B.vy;
    const sp = Math.hypot(_B.vx, _B.vz);
    if (sp > 0.05) { _ax.set(_B.vz / sp, 0, -_B.vx / sp); ball.mesh.rotateOnWorldAxis(_ax, (sp / BALL_R) * dt * 0.6); }
    ball.updateFx(dt);
  }

  evenement(e) {
    const g = this.game, spect = this.role === 'spect';
    if (e.k === 'sc') {
      const t = this.eq(e.t), mien = t === 0;
      const by = g.teamSize > 1 && e.nom ? ` ${String(e.nom).toUpperCase()}` : '';
      g.hud.feedback(`+${e.pts} ${e.ty === 'dunk' ? 'DUNK !' : e.sw ? 'SWISH !' : ''}${by}`, spect ? 'info' : mien ? 'good' : 'bad');
      g.audio.swish(g.teams[t].hoop);
      if (spect) { g.audio.cheer(); g.audio.swell(0.4, 1.4); }
      else if (mien) { g.audio.cheer(); g.audio.swell(0.6, 1.8); } else { g.audio.boo(); g.audio.swell(0.25, 1.2); }
      if (!this.jauge) g.hud.meter(false);
      // les pièces d'un panier vont à celui qui l'a marqué, comme hors ligne
      if (!spect && mien && this.joueur(e.i) === g.user) {
        const c = e.ty === 'dunk' ? 6 : e.pts === 3 ? 5 : 3, x = e.ty === 'dunk' ? 4 : e.pts === 3 ? 3 : 2;
        g.reward(e.ty === 'dunk' ? 'DUNK' : e.pts === 3 ? '3 POINTS' : 'PANIER', c, x);
      }
    } else if (e.k === 'to') {
      // raté sans rebond du 1 contre 1 (`ra`) : « balle à toi » ou « à l'adversaire » se dit de NOTRE côté ; le
      // spectateur lit le nom de celui qui la récupère
      const recup = g.teams[this.eq(e.t)];
      const txt = e.ra && g.constructor.texteRate ? g.constructor.texteRate(e.ra, spect ? null : this.eq(e.t) === 0, spect && recup ? recup.name : null) : e.msg;
      g.hud.feedback(txt, spect ? 'info' : this.eq(e.t) === 0 ? 'good' : 'bad'); g.audio.whistle();
      if (this.jauge) this.jauge = null;
      g.hud.meter(false);
    } else if (e.k === 'so') {
      // balle ressortie derrière l'arc (demi-terrain) par notre équipe
      if (!spect && this.eq(e.t) === 0) g.hud.feedback('BALLE SORTIE ✓', 'good');
    } else if (e.k === 'rim' || e.k === 'bd') {
      // un choc du ballon chez l'hôte (choc) : le cercle vibre, et on l'entend là où est le ballon affiché
      const s = e.s === 1 ? 1 : -1, v = Math.max(0, Math.min(1, +e.v || 0));
      g.scene.userData.rimHit?.(s, Math.max(0, Math.min(4, +e.f || 0)));
      if (v > 0) { if (e.k === 'rim') g.audio.rim(v, g.ball.pos); else g.audio.board(v, g.ball.pos); }
    } else if (e.k === 'dk') {
      // le dunk planté dans le cercle (Game : dunkSlam) — « le mien » se lit de NOTRE côté (miroir) : joueur()
      g.scene.userData.dunkSlam?.(e.s === 1 ? 1 : -1, Math.max(0, Math.min(8, +e.f || 0)), g.ball.pos, this.joueur(e.i));
    } else if (e.k === 'fb' && e.h === this.moi) {
      g.hud.feedback(e.txt, e.c || 'info');
      if (e.mk) { this.jauge = null; g.hud.meterMark(e.mk[0], e.mk[1], e.mk[2]); }
      if (e.ns) { this.jauge = null; g.hud.meter(false); g.audio.refus?.(); }     // tir refusé : balle à ressortir
    } else if (e.k === 'fin') {
      this.fini = true;
      if (spect) {
        // le spectateur n'a rien gagné ni perdu : le score final, puis retour à la balade
        const T = g.teams, gagne = T[this.eq(e.t)].name;
        g.state = 'over'; g.audio.buzzer();
        g.hud.feedback(`FIN DU MATCH · ${String(gagne).toUpperCase()} GAGNE ${T[0].score}-${T[1].score}`, 'info');
        setTimeout(() => { if (g.reseau === this) g.enterLobby(); }, 3200);
      } else g.finDeMatch(this.eq(e.t) === 0);
    } else if (e.k === 'stop') {
      this.fini = true;
      g.hud.feedback('L’HÔTE A ARRÊTÉ LE MATCH', 'warn');
      setTimeout(() => { if (g.reseau === this) g.enterLobby(); }, 1400);
    }
  }

  // L'heure locale des pas de simulation (ms) : voir heurePas, js/net.js.
  heure(dt) { return (this.tLoc = heurePas(this.tLoc, dt, this.game)); }

  // Un pas de simulation chez l'invité (et le spectateur) : on ne simule que SON joueur ; les autres et le ballon
  // sont lus dans les tampons, à l'heure d'affichage.
  pasClient(dt) {
    const g = this.game;
    this.silence += dt;
    const max = this.hotePerdu ? SILENCE_PERDU : this.hoteCache ? SILENCE_CACHE : SILENCE_MAX;
    if (!this.fini && this.silence > ATTENTE && !this.muet) { this.muet = true; g.hud.feedback('L’HÔTE NE RÉPOND PLUS…', 'warn'); }
    if (this.silence > max && !this.fini) {
      this.fini = true;
      g.hud.feedback('HÔTE INJOIGNABLE — RETOUR À LA BALADE', 'bad');
      setTimeout(() => { if (g.reseau === this) g.enterLobby(); }, 1500);
      return;
    }
    const tL = this.heure(dt);
    if (this.role === 'client') this.envoyerCommandes(dt);
    const tR = this.horl.pret ? this.horl.affichage(tL, 80, 150) : -Infinity;
    while (this.images.length && this.images[0].tm <= tR) this.appliquerImage(this.images.shift().m);
    for (const p of g.players) {
      if (p === this.propre && this.role === 'client') this.predire(p, dt, tL);
      else {
        const T = this.tampons.get(p);
        if (T && T.n) {
          T.lire(tR, _L);
          const Rl = this.relache && this.relache.p === p ? this.relache : null;
          if (Rl) {
            // l'ancien joueur prédit (relacher) : l'écart avec son tampon fond avec la même constante que la correction
            if (Rl.dx === null) { Rl.dx = p.pos.x - _L.x; Rl.dz = p.pos.z - _L.z; if (Math.hypot(Rl.dx, Rl.dz) > SNAP_PREDIT) Rl.dx = Rl.dz = 0; }
            const k = Math.exp(-dt / CORR_T); Rl.dx *= k; Rl.dz *= k;
            if (Math.abs(Rl.dx) + Math.abs(Rl.dz) < 0.005) this.relache = null;
            _L.x += Rl.dx; _L.z += Rl.dz;
          }
          p.pos.x = _L.x; p.pos.z = _L.z;
          p.vel.set(_L.vx, 0, _L.vz);
          p.faceWant.set(_L.fx, 0, _L.fz);
          if (p.faceWant.lengthSq() > 1e-6) { p.faceWant.normalize(); if (!p.clipSpin) p.turnTo(p.faceWant, dt); }
        }
      }
      p.defending = !!g.ball.holder && g.ball.holder.team !== p.team;
      p.update(dt);
    }
    this.balleAffichee(tR, dt);
    // compte à rebours, joué sur place à partir du temps restant envoyé par l'hôte
    if (g.state === 'countdown') {
      g.stateT -= dt;
      const n = Math.ceil(g.stateT - 0.4);
      if (n !== g.lastCount) { g.lastCount = n; g.hud.feedback(n > 0 ? String(n) : 'GO !', n > 0 ? 'warn' : 'good'); if (n <= 0) g.audio.buzzer(); }
    }
    // HUD
    const u = g.user;
    if (this.role === 'client' && !this.jauge) {
      // pas de jauge locale (l'appui n'a pas été vu comme un tir ici) : celle de l'hôte, en retard d'un aller-retour
      if (u.state === 'windup') { const z = g.meterZone(u); g.hud.meter(true, u.windup, z.center, z.half); this.jaugeHote = true; }
      else if (this.jaugeHote) { this.jaugeHote = false; g.hud.meter(false); }
    }
    g.hud.setClock(Math.max(0, Math.ceil(g.shotClock)));
    if (this.role === 'spect') {
      const att = g.teams[g.offense] ? g.teams[g.offense].name : '';
      g.hud.possession(`SPECTATEUR  ·  ● ${String(att).toUpperCase()} ATTAQUE`, false);
      return;
    }
    g.hud.stamina(u.stamina);
    const mine = g.offense === 0;
    const who = g.teamSize > 1 ? `  ·  ${u.def.name.toUpperCase()}` : '';
    const fleche = g.camMode === 'tv' ? (g.coteTV() * g.teams[0].hoop.z < 0 ? '  ·  ton panier ▶' : '  ·  ◀ ton panier') : '';
    g.hud.possession((mine ? '● ATTAQUE' : '○ DÉFENSE') + who + fleche, mine);
  }

  // LA PRÉDICTION (voir l'en-tête) : la même course que chez l'hôte (Game.controlUser -> Player.move), avec nos
  // commandes de ce pas ; puis un peu de la correction en attente ; puis l'historique, pour la prochaine image.
  // GELÉ COMME CHEZ L'HÔTE (06/10/2026). Pendant le compte à rebours, après un panier ou une perte de balle, Game.update ne
  // fait bouger personne (ni direction ni sprint) ; le joueur prédit, lui, courait encore : il prenait un mètre d'avance
  // puis revenait d'un coup, à chaque panier. Il reste gelé tant que la commande envoyée maintenant arriverait chez l'hôte
  // avant la fin du gel (gelFin) : l'heure de l'hôte selon l'horloge, plus un aller-retour.
  predire(u, dt, tL) {
    const g = this.game, c = this.cmd;
    const lag = this.lag !== null ? this.lag : 2 * (this.room.latence || 80) + 20;
    const gel = this.horl.pret && this.gelFin !== undefined && tL + this.horl.off + lag < this.gelFin;
    if (gel) _d.set(0, 0, 0); else _d.set(c.x, 0, c.z);
    if (u.state === 'layup' || u.state === 'dunk') {
      // l'élan vers le cercle de Player.lunge (chez l'hôte, vers un point qu'on n'a pas : on vise le cercle)
      if (u.hoop) {
        const dd = hdist(u.pos, u.hoop), stop = u.state === 'dunk' ? 0.55 : 1.0, sp = u.state === 'dunk' ? 4.5 : 2.6;
        if (dd > stop) { _t.set(u.hoop.x - u.pos.x, 0, u.hoop.z - u.pos.z).normalize(); u.pos.addScaledVector(_t, Math.min(sp * dt, dd - stop)); }
      }
      u.vel.set(0, 0, 0); u.speedNow = 0;
    } else {
      // en défense, face au porteur quand on est sur lui (comme Game.controlUser)
      const h = g.ball.holder;
      if (!gel && h && h.team !== u.team && !u.airborne && !(u.stun > 0) && !u.emote && u.state === 'idle' && hdist(u.pos, h.pos) < 5.5) u.faceTo(h.pos, true);
      else if (u.state !== 'idle' && this.authF.lengthSq() > 1e-6) u.faceWant.copy(this.authF).normalize();
      u.marche = c.marche;
      u.move(_d, c.sprint && !gel, dt);
    }
    const k = 1 - Math.exp(-dt / CORR_T), cx = this.corr.x * k, cz = this.corr.z * k;
    if (cx || cz) {
      u.pos.x += cx; u.pos.z += cz; this.corr.x -= cx; this.corr.z -= cz;
      for (const e of this.hist) { e.x += cx; e.z += cz; }
    }
    this.hist.push({ t: tL, x: u.pos.x, z: u.pos.z });
    while (this.hist.length > 2 && tL - this.hist[0].t > 1200) this.hist.shift();
  }

  // Les commandes de l'invité. Les APPUIS partent immédiatement : l'hôte les reçoit tous avec le même
  // retard, donc la durée entre l'appui et le relâcher du tir — c'est-à-dire le minutage de la jauge — est
  // exactement celle que le joueur a faite. Le manche seul part vingt fois par seconde au plus.
  // Chaque envoi est numéroté (`q`) : l'hôte renvoie le dernier reçu, d'où l'aller-retour de la prédiction.
  envoyerCommandes(dt) {
    const g = this.game, inp = g.input;
    const bloque = g.setupOpen || inp.blocked || g.paused;   // menu ouvert : on n'avance plus (le relâcher passe)
    const p = [], r = [];
    for (const id of ACTIONS) { if (inp.pressed(id) && !bloque) p.push(id); if (inp.released(id)) r.push(id); }
    const d = bloque ? [] : ACTIONS.filter((id) => inp.down(id));
    if (!bloque && inp.sprint() && !d.includes('sprint')) d.push('sprint');
    // direction dans le monde, relative à MA caméra (comme Game.controlUser)
    let x = 0, z = 0;
    const a = bloque ? { x: 0, y: 0 } : inp.axis();
    if (a.x || a.y) {
      const fw = _t.subVectors(g.lookCur, g.camera.position); fw.y = 0; fw.normalize();
      x = fw.x * a.y - fw.z * a.x; z = fw.z * a.y + fw.x * a.x;
      const l = Math.hypot(x, z); if (l > 1e-6) { x /= l; z /= l; }
    }
    const C = this.cmd;
    C.x = r2(x); C.z = r2(z); C.sprint = !bloque && inp.sprint(); C.marche = !bloque && g.alluMarche(inp);
    const w = this.jaugeLocale(dt, p, r);
    this.tCmd += dt;
    const cle = `${C.x},${C.z},${d.join()}`;
    if (p.length || r.length || (cle !== this.dernierCmd && this.tCmd >= CADENCE_COMMANDES) || this.tCmd > 0.25) {
      const q = ++this.qSeq;
      const msg = { t: 'input', to: this.hote, q, x: C.x, z: C.z, a: r2(bloque ? 0 : inp.amplitude()), d, p, r };
      if (w !== null) msg.w = r3(w);
      this.room.envoyerDirect(msg);
      this.envois.set(q, performance.now());
      if (this.envois.size > 80) this.envois.delete(this.envois.keys().next().value);
      this.tCmd = 0; this.dernierCmd = cle;
    }
  }

  // LA JAUGE DE TIR SUR PLACE (voir l'en-tête). Elle démarre à l'appui si l'on a le ballon assez loin du cercle (près
  // du cercle c'est un layup ou un dunk, sans jauge), monte au rythme de celle de l'hôte, et renvoie sa valeur au
  // lâcher (null sinon). Ensuite elle reste affichée jusqu'à la marque de l'hôte (`fb`), au plus 1,2 s.
  // Pas de jauge non plus tant que notre équipe doit ressortir la balle derrière l'arc (`so` de l'image, demi-terrain) :
  // l'hôte refusera le tir et le dira (retour `ns`).
  jaugeLocale(dt, appuis, lachers) {
    const g = this.game, u = g.user;
    const aSortir = g.doitSortir(u) && u.hoop && !horsArc(u.pos, u.hoop);
    if (appuis.includes('shoot') && !this.jauge && !aSortir && u.hasBall && u.state === 'idle' && !u.airborne && !(u.stun > 0) && u.hoop && hdist(u.pos, u.hoop) >= 2.0) {
      this.jauge = { w: 0, lache: false, t: 0 };
    }
    const J = this.jauge;
    if (!J) return null;
    J.t += dt;
    if (J.lache) {
      if (J.t > 1.2) { this.jauge = null; g.hud.meter(false); }
      return null;
    }
    J.w += dt / METER_TIME;
    const z = g.meterZone(u);
    g.hud.meter(true, J.w, z.center, z.half);
    if (lachers.includes('shoot')) {
      J.lache = true; J.t = 0;
      if (J.w < 0.26) { this.jauge = null; g.hud.meter(false); }      // feinte de tir : pas de marque à attendre
      return J.w;
    }
    if (J.w >= 1.08) { J.lache = true; J.t = 0; }                         // l'hôte lâche tout seul
    else if (!u.hasBall && J.t > 0.3) { this.jauge = null; g.hud.meter(false); }   // ballon perdu (vol, contre)
    return null;
  }
}

// ======================================================================== LES MATCHS EN COURS
// La liste des matchs annoncés (voir l'en-tête), et ce qu'un client du hub peut en faire : rejoindre, regarder,
// ou lancer une PARTIE RAPIDE. Une seule instance, branchée par js/main.js (game.matchs). `surChange` : rappelé
// quand la liste change (l'écran la redessine).
export class Matchs {
  constructor(game) {
    this.game = game;
    this.reg = new Map();              // mid -> annonce (+ vu : heure locale de la dernière)
    this.demande = null;               // { mid, type: 'rej' | 'spect', t } : la réponse qu'on attend
    this.surChange = null;
  }
  get room() { return this.game.online; }
  get moi() { return this.room ? this.room.ident.id : null; }
  changer() { this.surChange?.(); }
  vider() { this.reg.clear(); this.demande = null; this.changer(); }

  // Tout le courrier `mode` sans `mode` (js/net.js, Room.onMessage)
  courrier(m) {
    const g = this.game, R = g.reseau, moi = this.moi;
    if (!m || !moi) return;
    if (m.ann) {
      const a = m.ann;
      if (!a || typeof a.mid !== 'string' || a.hote !== m.from || !Array.isArray(a.places) || !Array.isArray(a.humains)) return;
      this.reg.set(a.mid, { ...a, vu: performance.now() });
      if (R && R.mid === a.mid) R.majDepuisAnnonce(a);
      this.changer();
    } else if (m.annFin) {
      if (this.reg.delete(m.annFin)) this.changer();
    } else if (m.rej) {
      if (R && R.role === 'hote') R.rejoindre(m.rej, m.from);
    } else if (m.rejNon) {
      const n = m.rejNon;
      if (n.id !== moi) return;
      if (this.demande && this.demande.mid === n.mid) this.demande = null;
      g.hud.feedback(`IMPOSSIBLE DE REJOINDRE · ${String(n.raison || 'REFUSÉ').toUpperCase()}`, 'warn');
    } else if (m.specReq) {
      if (R && R.role === 'hote') R.demandeSpect(m.specReq, m.from);
    } else if (m.spec) {
      const s = m.spec;
      if (s.pour !== moi || !this.demande || this.demande.type !== 'spect' || this.demande.mid !== s.mid) return;
      if (!s.match || s.match.hote !== m.from) return;
      this.demande = null;
      if (g.mode === 'lobby' && !g.reseau) this.entrer(s.match, 'spect');
    } else if (m.specFin) {
      if (R && R.role === 'hote' && m.specFin.id === m.from) R.finSpect(m.from);
    } else if (m.hp) {
      if (R && R.role !== 'hote' && R.mid === m.hp.mid && R.hote === m.from) R.hoteVisible(m.hp.cache);
    }
  }

  // Les matchs vivants (moins de OUBLI_MATCH depuis la dernière annonce), les plus peuplés d'abord. `ici` : sur notre
  // terrain (on peut y entrer) ; `libres` : places tenues par l'ordinateur ; `mien` : celui qu'on héberge.
  liste() {
    const now = performance.now(), out = [];
    for (const [mid, a] of this.reg) {
      if (now - a.vu > OUBLI_MATCH) { this.reg.delete(mid); continue; }
      out.push({ ...a, ici: this.memeTerrain(a), libres: a.places.length, mien: a.hote === this.moi });
    }
    return out.sort((a, b) => (b.humains.length - a.humains.length) || (b.libres - a.libres));
  }
  memeTerrain(a) {
    const g = this.game, rep = (g.scene.userData.reperes || {}).plateau || 0;
    if (Array.isArray(a.dims) && (Math.abs(a.dims[0] - COURT.L) > 0.01 || Math.abs(a.dims[1] - COURT.W) > 0.01 || (a.dims[2] || 0) !== rep)) return false;
    return !MatchEnLigne.autreMonde(a, g.presence.ter);
  }
  // Peut-on demander quelque chose maintenant ? En balade, ou spectateur de ce match-là.
  libre(mid) {
    const g = this.game, R = g.reseau;
    if (!this.room) return false;
    if (g.mode === 'lobby' && !R) return true;
    return !!(R && R.role === 'spect' && R.mid === mid);
  }

  rejoindre(mid) {
    const g = this.game, a = this.reg.get(mid), room = this.room;
    if (!room) return;
    if (!a) { g.hud.feedback('CE MATCH EST TERMINÉ', 'warn'); return; }
    if (!this.memeTerrain(a)) { g.hud.feedback('MATCH SUR UN AUTRE TERRAIN', 'warn'); return; }
    if (!a.places.length) { g.hud.feedback('MATCH COMPLET', 'warn'); return; }
    if (!this.libre(mid)) return;
    // l'équipe qui a le moins de vrais joueurs (et une place)
    const nH = (t) => a.humains.filter((h) => h.team === t).length;
    const equipes = [...new Set(a.places.map((p) => p.team))].sort((x, y) => nH(x) - nH(y));
    const team = equipes[0];
    const cap = g.captain && g.captain.baseDef;
    this.demande = { mid, type: 'rej', t: performance.now() };
    room.tr.send({ t: 'mode', rej: {
      mid, id: this.moi, nom: room.ident.display, char: cap ? cap.id : null, tn: g.tenueIds(), team,
      ter: g.presence.ter || null, dims: [COURT.L, COURT.W, (g.scene.userData.reperes || {}).plateau || 0],
    } });
    g.hud.feedback(`DEMANDE ENVOYÉE À ${String(a.nomHote || 'L’HÔTE').toUpperCase()}…`, 'info');
    this.attendre(mid, 'rej');
  }
  regarder(mid) {
    const g = this.game, a = this.reg.get(mid), room = this.room;
    if (!room || !a || !this.libre(mid) || g.reseau) return;
    if (!this.memeTerrain(a)) { g.hud.feedback('MATCH SUR UN AUTRE TERRAIN', 'warn'); return; }
    this.demande = { mid, type: 'spect', t: performance.now() };
    room.tr.send({ t: 'mode', specReq: { mid, id: this.moi } });
    g.hud.feedback('CONNEXION AU MATCH…', 'info');
    this.attendre(mid, 'spect');
  }
  attendre(mid, type) {
    const d = this.demande;
    setTimeout(() => {
      if (this.demande === d) { this.demande = null; this.game.hud.feedback('PAS DE RÉPONSE DE L’HÔTE', 'warn'); }
    }, 5000);
  }
  // PARTIE RAPIDE : le match ouvert le plus peuplé de notre terrain ; à défaut, un match contre l'ordinateur que
  // l'on héberge et qu'on annonce, pour que d'autres viennent prendre la place des joueurs de l'ordinateur.
  // `fabrique()` : les options du match à lancer (js/ui.js, optsRapides).
  rapide(fabrique) {
    const g = this.game;
    const L = this.liste().filter((a) => !a.mien && a.ici && a.libres > 0);
    if (L.length) { this.rejoindre(L[0].mid); return; }
    const opts = fabrique && fabrique();
    if (!opts) return;
    g.hud.feedback('PARTIE RAPIDE · MATCH OUVERT', 'info');
    g.lancerEnLigne({ ...opts, enLigne: [] });
  }

  // Une fiche de match en cours (`start` avec enCours) est arrivée (Game.recevoirMatch).
  recevoirEnCours(m) {
    const g = this.game, R = g.reseau, moi = this.moi;
    const dedans = (m.humains || []).some((h) => h.id === moi);
    if (R && R.mid && R.mid === m.mid) {
      // spectateur de ce match qui vient d'y entrer : il devient joueur ; sinon, mise à jour de la liste des joueurs
      if (R.role === 'spect' && m.pour === moi && dedans) this.entrer(m, 'client');
      else R.majHumains(m);
      return;
    }
    if (m.pour !== moi || !dedans || g.mode !== 'lobby' || R) return;
    this.entrer(m, 'client');
  }
  // S'installer dans un match en cours, comme joueur ou comme spectateur : le match se monte comme d'habitude, puis la
  // première image de l'hôte donne les positions, le score, le chrono — on ne repart pas de 0-0 ni du compte à rebours.
  entrer(m, role) {
    const g = this.game, room = this.room;
    if (!room || !m || !Array.isArray(m.teamA) || !Array.isArray(m.teamB) || !Array.isArray(m.humains)) return;
    if (!this.memeTerrain(m)) { g.hud.feedback('MATCH SUR UN AUTRE TERRAIN', 'warn'); return; }
    this.demande = null;
    g.cb.onMatchEnLigne?.();                       // ferme les panneaux ouverts (choix du match, boutique...)
    if (g.paused) g.togglePause();
    const avant = g.reseau && g.reseau.role === 'spect' ? g.reseau : null;
    if (g.mode === 'match') g.enterLobby();        // le spectateur qui devient joueur : on remonte le match pour lui
    const defBalade = avant ? avant.defBalade : g.captain && g.captain.baseDef;
    const moi = role === 'spect' ? null : this.moi;
    const R = new MatchEnLigne(g, room, m, role);
    R.defBalade = defBalade;
    g.startMatch(MatchEnLigne.options(m, moi));
    if (g.mode !== 'match') return;
    g.reseau = R;
    R.installer();
    // le match tourne déjà : ni compte à rebours ni 0-0 (l'image suivante donnera l'état exact)
    g.state = 'playing'; g.stateT = 0; g.lastCount = 0;
    const sc = Array.isArray(m.sc) ? m.sc : (this.reg.get(m.mid) || {}).sc;
    if (Array.isArray(sc)) { g.teams[R.eq(0)].score = sc[0] | 0; g.teams[R.eq(1)].score = sc[1] | 0; g.hud.setScore(g.teams[0].score, g.teams[1].score); }
    const h = m.humains.find((x) => x.id === m.hote);
    const nomHote = String((h && h.nom) || 'l’hôte').toUpperCase();
    if (role === 'spect') {
      R.camAvant = g.camMode; g.camMode = 'tv';
      g.hud.streak(`SPECTATEUR · MATCH DE ${nomHote}`);
    } else g.hud.streak(`EN LIGNE · TU REJOINS LE MATCH DE ${nomHote}`);
    this.changer();
  }
  // Un client a quitté le salon : ses matchs annoncés disparaissent de la liste.
  depart(id) {
    let n = 0;
    for (const [mid, a] of this.reg) if (a.hote === id) { this.reg.delete(mid); n++; }
    if (n) this.changer();
  }
}
