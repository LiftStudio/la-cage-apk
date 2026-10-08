// MANETTE — API Gamepad du navigateur, disposition « standard ». Marche dans Chrome / Edge sur PC (USB ou
// Bluetooth) et dans la WebView Android de l'APK (manette Bluetooth appairée au téléphone).
//
// Principe : la manette ne réinvente AUCUNE commande. Chaque bouton devient un code virtuel « Pad:A », « Pad:RT »…
// qu'on pousse dans les mêmes ensembles que les touches du clavier (js/input.js : downSet / pressedSet /
// releasedSet). Toutes les actions du jeu — et leurs fronts consommés, et leurs réaffectations — marchent donc
// telles quelles. Trois choses seulement passent à côté, parce qu'elles sont analogiques :
//   - le stick gauche : direction exacte et poussée (marcher en effleurant, courir en poussant) → axis(), amplitude() ;
//   - le stick droit en BALADE : la caméra (lacet / tangage), comme la souris ;
//   - le stick droit en MATCH : le « pro stick » — un COUP de stick devient un bouton virtuel (Pad:RSLeft…).
//
// La scrutation se fait une fois par image, au début de Game.frame. On y décide aussi du CONTEXTE :
//   « jeu »   : la manette pilote le joueur ;
//   « roue »  : la roue des emotes est ouverte — le stick droit choisit, A valide, B ferme ;
//   « menu »  : un écran HTML est par-dessus (menu, options, boutique, pause…) — js/manette_menus.js déplace un
//               focus visible, A clique, B revient ;
//   « bloque » : le jeu est bloqué sans écran à piloter — on ne transmet rien.
// Un bouton tenu au moment où l'on change de contexte est ignoré jusqu'à ce qu'on le lâche : le A qui valide
// « Reprendre » ne doit pas faire une passe en retombant dans le match.
import { settings, entree, PAD_BOUTONS, PAD_STICK, actionKey } from './settings.js';
import { NavMenus } from './manette_menus.js';

// ---- aides à l'écran quand la dernière entrée est la manette (Game.lobbyHint / Game.veloHint les demandent) ----
export const manetteActive = () => entree.manette;
export function aideBalade(boutique) {
  return `stick droit = caméra · ${actionKey('camera')} = vue (3e / épaule / 1re personne) · stick à moitié ou ${actionKey('walk')} = marcher · ${actionKey('shoot')} = tirer · ${actionKey('emote')} = emotes · ${boutique}`;
}
export function aideVelo() {
  return `à vélo · stick gauche : haut = pédaler, bas = freiner, côtés = tourner · ${actionKey('sprint')} = en danseuse · ${actionKey('shoot')} = sonnette · ${actionKey('interact')} = descendre`;
}

// ---- réglages fins (pas dans les options : ce sont des constantes de jouabilité) ----
const GACHETTE_ON = 0.35, GACHETTE_OFF = 0.22;   // LT / RT analogiques : hystérésis, sinon le sprint clignote à mi-course
const COUP_ON = 0.62, COUP_OFF = 0.35;            // coup de stick droit : il faut le pousser franchement, puis le relâcher
const EXPO_MARCHE = 1.25;                         // courbe du stick gauche : un peu plus de place pour la marche
const EXPO_CAMERA = 1.8;                          // courbe du stick droit : précis près du centre, rapide à fond
const CAM_LACET = 2.9, CAM_TANGAGE = 1.6;         // vitesse de la caméra stick à fond (rad/s, sensibilité 1)
const ACTIVITE = 0.3;                             // poussée de stick qui compte comme « on joue à la manette »
const I_LT = 6, I_RT = 7, I_HOME = 16;
// ce que la roue des emotes garde pour elle quand elle est ouverte (le reste va au jeu : LB la referme, START…)
const ROUE_GARDE = new Set(['Pad:A', 'Pad:B', 'Pad:Up', 'Pad:Down', 'Pad:Left', 'Pad:Right']);

// Famille de la manette, d'après gamepad.id. Chrome écrit par exemple
// « DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6) », Firefox « 054c-0ce6-… »,
// Android le seul nom du produit. 054c = Sony, 057e = Nintendo, 045e = Microsoft.
export function typeManette(id = '') {
  const s = String(id).toLowerCase();
  if (/054c|dualsense|dualshock|playstation|ps[345] /.test(s)) return 'playstation';
  if (/057e|nintendo|switch|joy-con|pro controller/.test(s)) return 'nintendo';
  if (/045e|xbox|xinput|microsoft/.test(s)) return 'xbox';
  return 'generique';
}
export const NOM_TYPE = { xbox: 'Xbox', playstation: 'PlayStation', nintendo: 'Nintendo', generique: 'générique' };
// nom lisible pour la notification : la famille, et le modèle quand on le reconnaît. Une manette que le navigateur
// ne sait pas ranger dans la disposition « standard » le dit : ses boutons sont peut-être ailleurs, on les
// réaffecte dans Options → Commandes.
function nomLisible(id, type, standard = true) {
  const s = String(id).toLowerCase();
  const modele = /dualsense/.test(s) ? ' (DualSense)' : /dualshock|054c-05c4|054c-09cc/.test(s) ? ' (DualShock 4)'
    : /pro controller/.test(s) ? ' (Pro)' : /joy-con/.test(s) ? ' (Joy-Con)' : '';
  const nom = type === 'generique' ? 'manette générique' : NOM_TYPE[type] + modele;
  return standard ? nom : nom + ' (disposition non standard)';
}
// Les sticks. En disposition « standard », les axes 0-1 sont le stick gauche et 2-3 le droit, au repos à 0. Une
// manette NON standard (vieille manette USB en DirectInput, pilote Linux…) range ses axes comme elle veut : le
// 2 y est souvent une GÂCHETTE, au repos à -1, et la croix un « chapeau » qui vaut 1,29 au repos. Les lire comme
// un stick droit faisait tourner la caméra toute seule en balade et tenait un coup de pro stick en match. Sur ces
// manettes on ne garde donc que les axes 0-1 (le stick gauche y est presque toujours) ; le reste se joue aux
// boutons, réaffectables. Une valeur hors de [-1, 1] n'est jamais un stick : ignorée.
const AXE_MAX = 1.05;
const axe = (v) => (Number.isFinite(v) && Math.abs(v) <= AXE_MAX ? Math.max(-1, Math.min(1, v)) : 0);
function sticks(gp) {
  const a = gp.axes || [], std = gp.mapping === 'standard';
  return [axe(a[0]), axe(a[1]), std ? axe(a[2]) : 0, std ? axe(a[3]) : 0];
}

// ZONE MORTE RADIALE. Un stick au repos n'est jamais à zéro (usure, ressort) : sous le seuil, on l'ignore. Radiale,
// c'est-à-dire sur la longueur du vecteur et pas axe par axe — sinon les diagonales « collent » aux axes. Au-delà
// on remet à l'échelle 0..1, pour ne pas perdre le début de la course.
export function zoneMorte(x, y, dz) {
  const brut = Math.hypot(x, y);
  if (brut <= dz || brut < 1e-6) return { x: 0, y: 0, m: 0, brut };
  const m = Math.min(1, (brut - dz) / (1 - dz));
  return { x: (x / brut) * m, y: (y / brut) * m, m, brut };
}
// COURBE DE RÉPONSE : la poussée utile élevée à une puissance. Au-dessus de 1, le début de course est plus fin.
export const courbe = (m, expo) => Math.pow(Math.max(0, Math.min(1, m)), expo);
const borne = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// VIBRATIONS : [motif du texte du HUD, classe exigée (null = toutes), fort, faible, durée ms]. On les accroche aux
// retours déjà affichés au joueur (HUD.feedback) : ce sont exactement les temps forts, vus de SON côté. Le premier
// motif qui correspond l'emporte. Courtes et discrètes : jamais plus de 0,6 en fort ni de 200 ms.
const RETOURS = [
  [/DUNK|SUR LA TÊTE/, 'good', 0.6, 0.8, 190],                                     // dunk réussi
  [/CONTRE|CONTRÉ/, null, 0.45, 0.6, 150],                                          // contre donné ou reçu
  [/DUNKÉ DESSUS|AU SOL|TAPIS|POSTÉ|DÉGAGE|CONTACT|BOUGE PAS/, null, 0.5, 0.25, 120], // contact, coup d'épaule
  [/VOLÉE|INTERCEPTÉE|PERDUE|SORTIE|SECONDES/, 'bad', 0.3, 0.3, 170],               // ballon perdu
  [/^\+\d+(?!.*🎟)|SWISH|DEDANS/, 'good', 0.2, 0.45, 110],                           // panier marqué
];

// ---- réaffectation (écran des commandes) : le prochain appui de bouton est pour elle ----
let capture = null;
let instance = null;
export function capturerBouton(fn, delai = 8) { capture = { fn, t: delai }; }
export function annulerCapture() { capture = null; }
// La manette qui pilote, ou null (écran des options : état et famille)
export function infoManette() {
  const m = instance;
  return m && m.index !== null ? { type: m.type, nom: nomLisible(m.id, m.type, m.standard), id: m.id, standard: m.standard } : null;
}

export class Manette {
  constructor(input) {
    instance = this;
    this.input = input; this.game = null;
    this.index = null; this.id = ''; this.type = 'generique'; this.standard = true;
    this.prec = PAD_BOUTONS.map(() => false);   // boutons à l'image précédente : c'est ce qui donne les fronts
    this.gach = [false, false];                 // LT, RT enfoncées (avec hystérésis)
    this.coup = null;                           // coup de stick droit en cours : 'RSLeft' | 'RSRight' | 'RSUp' | 'RSDown'
    this.axe = null;                            // stick gauche traité { x, y, amp } — null au repos
    this.injectes = new Set();                  // codes « Pad:… » actuellement enfoncés côté Input
    this.muets = new Set();                     // codes ignorés jusqu'à leur relâchement (changement de contexte)
    this.stickMuet = false;                     // stick gauche tenu au changement de contexte : ignoré jusqu'au repos
    this.aRelacher = [];                        // appuis « tapés » (B sur la pause) : relâchés à l'image suivante
    this.annoncees = new Set();                 // manettes déjà annoncées (une seule notification par branchement)
    this.ctx = null;
    this.nav = new NavMenus(this);

    // branchement / débranchement. Chrome n'annonce une manette qu'au premier appui : l'événement vaut activité.
    this._on = (e) => {
      const gp = e && e.gamepad;
      if (gp && !this.annoncees.has(gp.index)) { this.annoncees.add(gp.index); this.notifier(`Manette connectée : ${nomLisible(gp.id, typeManette(gp.id), gp.mapping === 'standard')}`); }
      if (gp && this.index === null) this.adopter(gp);
    };
    this._off = (e) => {
      const gp = e && e.gamepad;
      if (gp) this.annoncees.delete(gp.index);
      if (gp && gp.index === this.index) this.perdue();
    };
    // Retour au clavier / à la souris / au doigt : les aides reprennent les touches, le focus manette s'efface.
    this._clavier = (e) => { if (e.isTrusted !== false) this.passerAuClavier(); };
    this._souris = (e) => { if (Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) > 6) this.passerAuClavier(); };
    this._doigt = () => this.passerAuClavier();
    this._retour = (e) => this.vibrerPour(e.detail || {});
    window.addEventListener('gamepadconnected', this._on);
    window.addEventListener('gamepaddisconnected', this._off);
    window.addEventListener('keydown', this._clavier, true);
    window.addEventListener('mousedown', this._clavier, true);
    window.addEventListener('mousemove', this._souris, { passive: true });
    window.addEventListener('touchstart', this._doigt, { passive: true, capture: true });
    document.addEventListener('hoops-feedback', this._retour);
  }

  dispose() {
    window.removeEventListener('gamepadconnected', this._on);
    window.removeEventListener('gamepaddisconnected', this._off);
    window.removeEventListener('keydown', this._clavier, true);
    window.removeEventListener('mousedown', this._clavier, true);
    window.removeEventListener('mousemove', this._souris);
    window.removeEventListener('touchstart', this._doigt, true);
    document.removeEventListener('hoops-feedback', this._retour);
    this.toutRelacher();
    if (instance === this) instance = null;
  }

  // ---------------------------------------------------------------------------------------------------------
  // SCRUTATION — une fois par image, au début de Game.frame
  scruter(game, dt) {
    this.game = game;
    for (const c of this.aRelacher) this.input.relacher(c);
    this.aRelacher.length = 0;
    const etaitManette = entree.manette;
    const gp = this.lire();
    if (!gp) {
      this.axe = null;
      if (this.injectes.size) this.toutRelacher();
      if (capture) { const fn = capture.fn; capture = null; fn(null); }     // débranchée pendant une réaffectation
      return;
    }

    const ax = sticks(gp), dz = settings.controls.pad.deadzone;
    const g = zoneMorte(ax[0], ax[1], dz), d = zoneMorte(ax[2], ax[3], dz);
    const bas = this.boutons(gp);
    // coup de stick droit : la direction est figée au moment du coup, et tenue tant que le stick reste poussé
    // (maintenir le stick sur le côté = feinte maintenue = size-up, comme la touche H tenue)
    const coupAvant = this.coup;
    if (this.coup) { if (d.brut < COUP_OFF) this.coup = null; }
    else if (d.brut > COUP_ON) {
      const x = ax[2], y = ax[3];
      this.coup = Math.abs(x) > Math.abs(y) ? (x < 0 ? 'RSLeft' : 'RSRight') : (y < 0 ? 'RSUp' : 'RSDown');
    }
    const coupFront = this.coup && this.coup !== coupAvant ? this.coup : null;
    const fronts = [];
    for (let i = 0; i < bas.length; i++) if (bas[i] && !this.prec[i]) fronts.push(i);
    if (this.stickMuet && g.brut < ACTIVITE) this.stickMuet = false;
    // activité : la manette redevient l'entrée courante (aides à l'écran, focus des menus, tactile masqué)
    if (fronts.length || coupFront || g.m > ACTIVITE || d.m > ACTIVITE) this.passerALaManette();

    // réaffectation en cours dans les options : le prochain appui est pour elle, et pour rien d'autre
    if (capture) {
      capture.t -= dt;
      let code = fronts.length ? 'Pad:' + PAD_BOUTONS[fronts[0]] : coupFront ? 'Pad:' + coupFront : null;
      if (fronts[0] === I_HOME) code = null;                 // le bouton central appartient au système
      if (code || capture.t <= 0) { const fn = capture.fn; capture = null; fn(code); }
      this.prec = bas; this.axe = null;
      if (this.injectes.size) this.toutRelacher();
      return;
    }

    // contexte
    const racine = this.nav.racine();
    const roue = !!(game && game.wheel && game.wheel.isOpen);
    const ctx = racine ? 'menu' : roue ? 'roue' : this.input.blocked ? 'bloque' : 'jeu';
    const etats = this.etatCodes(bas, ctx);
    if (ctx !== this.ctx) this.changerContexte(ctx, etats, g, racine);
    const permis = this.permis(ctx, racine);

    if (ctx === 'jeu' || ctx === 'roue') {
      // stick gauche : déplacement analogique. La poussée passe par la courbe ; la direction reste exacte.
      if (g.m > 0 && !this.stickMuet) {
        const amp = courbe(g.m, EXPO_MARCHE), k = amp / g.m;
        this.axe = { x: g.x * k, y: -g.y * k, amp };          // l'axe Y de la manette pointe vers le BAS
      } else this.axe = null;
      if (ctx === 'jeu' && game && game.mode === 'lobby' && !game.paused && !game.setupOpen && d.m > 0) this.camera(game, d, dt);
      if (ctx === 'roue') this.roue(game, d, fronts);
    } else this.axe = null;

    this.injecter(etats, permis);
    if (ctx === 'menu') {
      const basNav = bas.map((v, i) => v && !this.muets.has('Pad:' + PAD_BOUTONS[i]));
      // `reveil` : on revient de la souris / du clavier — ce premier appui fait seulement réapparaître le focus
      this.nav.traiter(racine, basNav, fronts, this.stickMuet ? { x: 0, y: 0, m: 0, brut: 0 } : g, d, dt, !etaitManette);
    }
    this.prec = bas;
  }

  // ---- lecture ----
  pads() { try { return Array.from((navigator.getGamepads && navigator.getGamepads()) || []); } catch (e) { return []; } }
  // La manette qui pilote : celle qu'on a adoptée, sinon la PREMIÈRE qui montre de l'activité (un bouton, un stick).
  lire() {
    const pads = this.pads();
    let gp = this.index !== null ? pads.find((p) => p && p.index === this.index) : null;
    if (this.index !== null && !(gp && gp.connected !== false)) { this.perdue(); gp = null; }
    if (!gp) {
      for (const p of pads) {
        if (!p || p.connected === false || !this.active(p)) continue;
        if (!this.annoncees.has(p.index)) { this.annoncees.add(p.index); this.notifier(`Manette connectée : ${nomLisible(p.id, typeManette(p.id), p.mapping === 'standard')}`); }
        this.adopter(p); gp = p; break;
      }
    }
    return gp;
  }
  // Un bouton enfoncé ou un STICK poussé. Seulement les sticks (voir sticks()) : une gâchette au repos à -1 ou
  // un chapeau à 1,29 rendaient une manette non standard « active » sans qu'on la touche — elle prenait alors la
  // main avant celle qu'on tenait vraiment.
  active(p) {
    for (const b of p.buttons || []) if (b && (typeof b === 'object' ? b.pressed || b.value > 0.5 : b > 0.5)) return true;
    for (const a of sticks(p)) if (Math.abs(a) > 0.5) return true;
    return false;
  }
  // État des boutons, gâchettes comprises (analogiques : seuil avec hystérésis).
  boutons(gp) {
    const b = gp.buttons || [];
    return PAD_BOUTONS.map((_, i) => {
      const x = b[i];
      if (x === undefined || x === null) return false;
      const v = typeof x === 'object' ? +x.value || 0 : +x, p = typeof x === 'object' ? !!x.pressed : v > 0.5;
      if (i === I_LT || i === I_RT) {
        const k = i === I_LT ? 0 : 1;
        this.gach[k] = this.gach[k] ? v > GACHETTE_OFF || (p && v === 0) : v > GACHETTE_ON || (p && v === 0);
        return this.gach[k];
      }
      return p || v > 0.5;
    });
  }
  adopter(gp) {
    this.index = gp.index; this.id = gp.id || ''; this.type = typeManette(this.id); this.standard = gp.mapping === 'standard';
    entree.type = this.type;
    this.gach = [false, false]; this.coup = null;
    // Les boutons déjà enfoncés au branchement ne comptent pas : l'appui qui « réveille » la manette ne doit pas
    // cliquer le menu à l'aveugle. Il suffit de le relâcher.
    this.prec = this.boutons(gp);
    this.passerALaManette(true);
    document.dispatchEvent(new CustomEvent('hoops-manette', { detail: { connectee: true, type: this.type } }));
  }
  // La manette qui pilotait a disparu (pile, Bluetooth, câble). En pleine partie on met en PAUSE : sinon le joueur
  // reste planté, et un bouton enfoncé au moment de la coupure (sprint, tir) le resterait pour toujours.
  perdue() {
    const g = this.game, pilotait = entree.manette;
    this.toutRelacher(); this.muets.clear(); this.axe = null; this.coup = null; this.ctx = null;
    this.index = null;
    if (pilotait) this.passerAuClavier();
    document.dispatchEvent(new CustomEvent('hoops-manette', { detail: { connectee: false } }));
    if (g && pilotait && (g.mode === 'lobby' || g.mode === 'match') && !g.paused && g.state !== 'over' && !g.setupOpen && !this.input.blocked) g.togglePause();
    // APRÈS la pause : l'écran de pause est alors ouvert, et la notification passe par-dessus (voir notifier)
    this.notifier('Manette déconnectée');
  }

  // ---- codes virtuels ----
  // Chaque code « Pad:… » et s'il est enfoncé. Les coups de stick droit ne valent qu'en MATCH : en balade ce
  // stick tourne la caméra.
  etatCodes(bas, ctx) {
    const m = new Map();
    PAD_BOUTONS.forEach((n, i) => m.set('Pad:' + n, bas[i]));
    const pro = ctx === 'jeu' && this.game && this.game.mode === 'match';
    for (const n of PAD_STICK) m.set('Pad:' + n, pro && this.coup === n);
    return m;
  }
  // Ce qui a le droit de passer au jeu dans chaque contexte.
  permis(ctx, racine) {
    const inp = this.input;
    const pour = (id, code) => (inp.bind[id] || []).includes(code);
    if (ctx === 'jeu') return () => true;
    if (ctx === 'roue') return (c) => !ROUE_GARDE.has(c) && !c.startsWith('Pad:RS');
    // sur l'écran de PAUSE, le bouton pause la referme (comme ÉCHAP au clavier)
    if (ctx === 'menu') return (c) => racine && racine.id === 'overlay' && !inp.blocked && pour('pause', c);
    return () => false;
  }
  changerContexte(ctx, etats, g, racine) {
    const permis = this.permis(ctx, racine);
    // les codes qui ne passent plus sont relâchés proprement (le jeu voit le relâcher, comme au clavier)
    for (const c of [...this.injectes]) if (!permis(c)) { this.injectes.delete(c); this.input.relacher(c); }
    // ceux qu'on tient encore et qui ne traversent pas : ignorés jusqu'à ce qu'on les lâche
    for (const [c, down] of etats) if (down && !this.injectes.has(c)) this.muets.add(c);
    // Le stick gauche tenu en ARRIVANT sur un menu ne doit pas y promener le focus (on courait, on a mis pause).
    // Dans l'autre sens on le laisse : reprendre la partie en tenant le stick, c'est repartir aussitôt.
    this.stickMuet = ctx === 'menu' && g.brut >= ACTIVITE;
    // hors des menus, le cadre de focus s'efface (l'écran est caché, mais on ne laisse pas traîner la classe) ;
    // le souvenir de l'élément reste, on y reviendra en rouvrant le même écran
    if (ctx !== 'menu') this.nav.quitter();
    this.ctx = ctx;
  }
  injecter(etats, permis) {
    const inp = this.input;
    for (const [c, down] of etats) {
      if (this.muets.has(c)) { if (!down) this.muets.delete(c); continue; }
      if (down && permis(c)) {
        if (!this.injectes.has(c)) { this.injectes.add(c); inp.presser(c); }
        else if (!inp.downSet.has(c)) inp.downSet.add(c);      // effacé par une perte de focus de la fenêtre
      } else if (this.injectes.has(c)) { this.injectes.delete(c); inp.relacher(c); }
    }
  }
  toutRelacher() { for (const c of this.injectes) this.input.relacher(c); this.injectes.clear(); }
  // Un appui bref sur une action (B sur l'écran de pause = le bouton pause) : pressé maintenant, relâché à l'image
  // suivante. On passe par le code de manette de l'action s'il y en a un, sinon par sa touche.
  taperAction(id) {
    const cs = (this.input.bind[id] || []).filter(Boolean);
    const c = cs.find((x) => x.startsWith('Pad:')) || cs[0];
    if (!c) return;
    this.input.presser(c); this.aRelacher.push(c);
  }

  // ---- stick droit ----
  // En balade : la caméra, exactement comme la souris (lacet, tangage borné, sensibilité et inversion propres au stick).
  camera(game, d, dt) {
    const c = settings.controls.pad, k = c.sens || 1, amp = courbe(d.m, EXPO_CAMERA) / d.m;
    const vx = d.x * amp, vy = d.y * amp;
    game.camYaw -= vx * CAM_LACET * k * dt;
    game.camPitch = borne(game.camPitch + vy * CAM_TANGAGE * k * dt * (c.invertY ? -1 : 1), -0.1, 0.9);
    if (Math.abs(vx) > 0.05) game.camManuT = performance.now();     // même effet qu'un geste de souris (vélo)
  }
  // Roue des emotes ouverte : le stick droit pointe le secteur (même calcul d'angle que la souris), la croix passe
  // au voisin, A lance l'emote, B referme. Relâcher LB sur un secteur le lance aussi (logique de Game).
  roue(game, d, fronts) {
    const w = game.wheel, n = (w.emotes || []).length;
    if (!n) return;
    if (d.brut > 0.5) {
      const pas = (Math.PI * 2) / n, i = ((Math.round((Math.atan2(d.y, d.x) + Math.PI / 2) / pas) % n) + n) % n;
      if (i !== w.hovered) w.setHover(i);
    }
    for (const f of fronts) {
      const nom = PAD_BOUTONS[f], h = w.hovered;
      if (nom === 'Right' || nom === 'Down') w.setHover(h === null ? 0 : (h + 1) % n);
      else if (nom === 'Left' || nom === 'Up') w.setHover(h === null ? n - 1 : (h - 1 + n) % n);
      else if (nom === 'A' && w.hovered !== null && w.segs[w.hovered]) w.segs[w.hovered].click();
      else if (nom === 'B') w.close();
    }
  }

  // ---- entrée courante : clavier / souris / doigt, ou manette ----
  passerALaManette(force = false) {
    if (entree.manette && !force) return;
    const change = !entree.manette || entree.type !== this.type;
    entree.manette = true; entree.type = this.type;
    // body.pad-actif : commandes tactiles masquées (téléphone + manette Bluetooth) ; body.pad-nav : focus visible
    document.body.classList.add('pad-actif', 'pad-nav');
    if (change) document.dispatchEvent(new Event('hoops-entree'));
  }
  passerAuClavier() {
    if (!entree.manette) return;
    entree.manette = false;
    document.body.classList.remove('pad-actif', 'pad-nav');
    document.dispatchEvent(new Event('hoops-entree'));
  }

  // ---- vibrations ----
  vibrer(fort, faible, ms) {
    if (!settings.controls.pad.vibrations || this.index === null || !entree.manette) return;
    const gp = this.pads().find((p) => p && p.index === this.index), va = gp && gp.vibrationActuator;
    if (!va || typeof va.playEffect !== 'function') return;
    try {
      const p = va.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: fort, weakMagnitude: faible });
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* manette sans moteurs : tant pis */ }
  }
  vibrerPour({ text, cls }) {
    const t = String(text || '').toUpperCase();
    for (const [re, c, fort, faible, ms] of RETOURS) {
      if (!re.test(t) || (c && c !== cls)) continue;
      this.vibrer(fort, faible, ms);
      return;
    }
  }

  // ---- notification ----
  // Sur le terrain, dans le HUD existant (le grand texte du centre) ; dès qu'un écran est par-dessus (menus, où le
  // HUD est caché, mais aussi la PAUSE, qui le recouvre et le floute), un bandeau discret en haut de l'écran.
  notifier(txt) {
    const g = this.game;
    if (g && g.hud && g.hud.el && !g.hud.el.hidden && !this.nav.racine()) { g.hud.feedback(txt.toUpperCase(), 'info'); return; }
    let el = document.getElementById('pad-toast');
    if (!el) { el = document.createElement('div'); el.id = 'pad-toast'; el.className = 'pad-toast'; document.body.appendChild(el); }
    el.textContent = txt;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(this._toastT); this._toastT = setTimeout(() => el.classList.remove('on'), 2600);
  }
}
