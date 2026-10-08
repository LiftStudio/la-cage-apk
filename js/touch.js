// =====================================================================
//  COMMANDES TACTILES (téléphone, tablette) — refaites le 06/10/2026 pour jouer au pouce comme dans les jeux de basket
//  sur téléphone (NBA 2K Mobile, 3on3 Freestyle).
//
//  - À GAUCHE, un joystick FLOTTANT : il apparaît là où le pouce gauche se pose (moitié gauche de l'écran, sous la rangée
//    du haut). Zone morte, réponse analogique (effleurer = marcher, js/game.js alluMarche), et un seuil de sprint net :
//    poussé au bord, l'anneau s'allume (petite vibration). Le socle SUIT le pouce qui sort du cercle : on repart dans
//    l'autre sens sans lever le doigt. Joystick FIXE au choix (Options > Commandes).
//  - À DROITE, les actions en ARC autour du pouce droit : le gros bouton de TIR dans le coin (CONTRE ou VOL en défense,
//    SAUT sans le ballon, SONNETTE / OLLIE sur un engin), juste à côté la PASSE balle en main — en balade, la même place
//    sert à PARLER, VÉLO, S'ASSEOIR, DESCENDRE... —, puis les gestes, plus petits, sur deux anneaux : SPIN et ÉPAULE
//    contre le tir (l'épaule sert aussi en défense), JAMBES, DOS et FEINTE au-delà.
//  - Les boutons RARES, petits, sur les bords du haut, loin des pouces : pause, caméra, emotes, téléphone en haut à
//    gauche ; JOUEUR (changer de joueur, en équipe et sans le ballon — le changement automatique le fait déjà le plus
//    souvent) en haut à droite.
//
//  Chaque bouton n'apparaît que lorsqu'il sert (balade ou match, attaque ou défense, ballon ou pas, vélo, atelier), à une
//  place FIXE : rien ne saute quand le contexte change. Chaque doigt est suivi par son identifiant (Pointer Events) :
//  joystick et boutons en même temps, un doigt qui glisse hors d'un bouton le relâche, et le tir se tient puis se lâche
//  (jauge, feinte si on lâche tout de suite) exactement comme la touche du clavier. Les boutons passent par leurs propres
//  codes, « Tactile:shoot »... (js/input.js) : ils marchent même quand l'action n'a plus de touche au clavier.
//  Taille, opacité, joystick, vibrations et places des boutons (DISPOSITION TACTILE) : Options > Commandes.
// =====================================================================
import { TELEPHONE } from './appareil.js';
import { settings, entree } from './settings.js';

// un écran tactile dont le pointeur principal est grossier (la détection d'origine)
const ECRAN_TACTILE = (typeof window !== 'undefined') && (('ontouchstart' in window) || navigator.maxTouchPoints > 0)
  && window.matchMedia('(pointer: coarse)').matches;
// Les commandes tactiles suivent la détection du téléphone de TOUT le jeu (js/appareil.js) : `?tel=1` les montre aussi sur
// un PC (elles s'y cliquent à la souris) ; et tout vrai écran tactile les garde, même sous `?tel=0` — sans elles, on ne
// pourrait plus jouer du tout.
export const IS_TOUCH = TELEPHONE || ECRAN_TACTILE;
// un VRAI appareil tactile, pas un PC sous ?tel=1 : seul lui passe en plein écran au premier appui (js/main.js)
export const VRAI_TACTILE = ECRAN_TACTILE || (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || ''));

// LES EMPLACEMENTS. Chacun a sa place fixe ; son action et son libellé suivent le contexte (_contexte). `t` : taille —
// xl le tir, l la passe, s les gestes (et JOUEUR : son mot ne tiendrait pas, lisible, dans un rond u), u les petits
// boutons du haut.
const EMPL = [
  { id: 'tir', t: 'xl' }, { id: 'b', t: 'l' },
  { id: 'spin', t: 's' }, { id: 'epaule', t: 's' }, { id: 'jambes', t: 's' }, { id: 'dos', t: 's' }, { id: 'feinte', t: 's' },
  { id: 'pause', t: 'u' }, { id: 'cam', t: 'u' }, { id: 'emote', t: 'u' }, { id: 'tel', t: 'u' }, { id: 'joueur', t: 's' },
];
// la grappe de droite : sa largeur écarte la jauge de tir (--tc-droite) et borne la zone du joystick
const GRAPPE = ['tir', 'b', 'spin', 'epaule', 'jambes', 'dos', 'feinte'];
// la rangée du haut à gauche, dans cet ordre (le téléphone, absent en match, au bout : la rangée y reste courte)
const RANGEE = ['pause', 'cam', 'emote', 'tel'];
// libellés de l'éditeur de disposition : chaque bouton à son rôle principal
const NOMS = { tir: 'TIR', b: 'PASSE', spin: 'SPIN', epaule: 'ÉPAULE', jambes: 'JAMBES', dos: 'DOS', feinte: 'FEINTE',
  pause: 'II', cam: 'CAM', emote: '🕺', tel: '📱', joueur: 'JOUEUR' };
// le bouton d'action dit ce qu'il va faire (lot C4 : la trottinette, le skate posés là ou sortis du sac)
const ENGIN = { trottinette: 'TROTT.', skate: 'SKATE' };
// le nom d'une action dans les aides quand son bouton n'est pas à l'écran à ce moment-là (nomBouton)
const NOM_ACTION = { shoot: 'TIR', pass: 'PASSE', switch: 'JOUEUR', spin: 'SPIN', legs: 'JAMBES', behind: 'DOS', dribble: 'FEINTE',
  bump: 'ÉPAULE', pause: 'PAUSE', camera: 'CAM', emote: '🕺', phone: '📱' };
const DZ = 0.14;                              // zone morte du joystick, en part de sa course
const SPRINT_ON = 0.96, SPRINT_OFF = 0.85;    // seuil du sprint, avec hystérésis : il ne clignote pas au bord
const SUIT = 1.25;                            // au-delà de 1,25 course, le socle flottant suit le pouce
const FRONT_MAX = 0.35;                       // appui ou relâcher que le jeu n'a pas lu en 0,35 s : oublié (pas d'action fantôme)
const borne = (v, a, b) => Math.max(a, Math.min(b, v));
const EMOJI = /\p{Extended_Pictographic}/u;

export class TouchControls {
  constructor(game) {
    this.game = game; this.input = game.input;
    const root = document.getElementById('touch'); this.root = root;
    root.innerHTML = '<div class="tc-stick repos"><div class="tc-seuil"></div><div class="tc-knob"></div></div>';
    document.body.classList.add('touch');
    this.stick = root.querySelector('.tc-stick'); this.knob = root.querySelector('.tc-knob');
    this.el = {};
    for (const s of EMPL) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tc-btn tc-' + s.t; b.dataset.slot = s.id; b.hidden = true;
      b.innerHTML = '<span class="tc-lbl"></span>';
      root.appendChild(b); this.el[s.id] = b;
    }
    // la pastille des messages non lus, sur le coin du bouton du téléphone. Celle du HUD (#phone-badge, recopiée ici à
    // chaque image) passerait SOUS le bouton : le HUD est en dessous du calque tactile.
    this.pastille = document.createElement('div');
    this.pastille.className = 'tc-pastille'; this.pastille.hidden = true;
    root.appendChild(this.pastille);
    this.badgeHud = document.getElementById('phone-badge');
    this.pos = {};                    // emplacement -> { x, y, r } à l'écran (centre et rayon, px CSS)
    this.repos = { x: 0, y: 0, r: 50 };   // socle du joystick au repos
    this.sa = { t: 0, r: 0, b: 0, l: 0 }; this.u = 1; this.Rb = 60; this.course = 47; this.zone = { x: 0, y: 0 };
    this.doigts = new Map();          // pointerId -> { role: 'stick' | 'bouton' | 'regard' | 'deplace' | 'mort', ... }
    this.stickId = null; this.regardId = null; this.stickActif = false;
    this.centre = { x: 0, y: 0 }; this.axe = { x: 0, y: 0 }; this.amp = 0; this.sprint = false;
    this.fronts = new Map(); this.lachers = new Map();   // code -> âge (s) des fronts poussés par les boutons
    this.edition = false; this.barre = null; this.cle = ''; this._bloque = false;

    // ----- les doigts -----
    // Sur les boutons (et la barre de l'éditeur) : écouté sur le calque ; ailleurs : sur le terrain (joystick, caméra).
    // Déplacements et levers sont écoutés sur la fenêtre : un doigt reste suivi même quand le bouton qu'il tenait disparaît.
    const canvas = game.renderer.domElement;
    root.addEventListener('pointerdown', (e) => this._bas(e, true));
    canvas.addEventListener('pointerdown', (e) => this._bas(e, false));
    window.addEventListener('pointermove', (e) => this._bouge(e), { passive: true });
    window.addEventListener('pointerup', (e) => this._finDoigt(e.pointerId));
    window.addEventListener('pointercancel', (e) => this._finDoigt(e.pointerId));
    // iOS : ni loupe, ni menu, ni zoom au double appui sur les commandes ; nulle part de menu à l'appui long
    root.addEventListener('touchstart', (e) => { if (e.target.closest && e.target.closest('.tc-btn, .tc-stick')) e.preventDefault(); }, { passive: false });
    for (const c of [root, canvas]) c.addEventListener('contextmenu', (e) => e.preventDefault());
    // iOS ignore user-scalable=no (index.html) : deux doigts qui s'écartent — le pouce sur le joystick, l'autre qui vise un
    // bouton — zoomaient la page en plein jeu. `gesturestart` n'existe que dans Safari : ailleurs, rien ne change.
    document.addEventListener('gesturestart', (e) => { if (!this.root.hidden) e.preventDefault(); }, { passive: false });
    // Filets : plus aucun doigt sur l'écran, fenêtre quittée, appli en arrière-plan -> tout est relâché. Un « pointerup »
    // perdu ne laisse ni un bouton enfoncé ni le joueur courir tout seul.
    const plusDeDoigt = (e) => { if (!e.touches || e.touches.length === 0) this._toutLacher(); };
    window.addEventListener('touchend', plusDeDoigt, { passive: true });
    window.addEventListener('touchcancel', plusDeDoigt, { passive: true });
    window.addEventListener('blur', () => this._toutLacher());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this._toutLacher(); });

    // ----- les aides du jeu nomment le bouton à l'écran (actionKey, js/settings.js) -----
    // ... tant que la dernière entrée est le doigt : une tablette avec clavier retrouve « ESPACE » dès qu'on tape une touche
    this.auDoigt = true;
    window.addEventListener('keydown', () => { this.auDoigt = false; }, { passive: true });
    entree.tactile = (id) => (this.auDoigt ? this.nomBouton(id) : null);

    // ----- disposition : à chaque taille d'écran, et à chaque réglage (taille, opacité, places) -----
    window.addEventListener('resize', () => this.disposer());
    window.addEventListener('orientationchange', () => setTimeout(() => this.disposer(), 300));
    settings.onChange(() => this.disposer());
    // ----- chaque image : le contexte (boutons utiles, libellés), les fronts jamais lus -----
    const frame = game.frame.bind(game);
    game.frame = (dt) => { frame(dt); this.tick(dt); };
    this.disposer();
    this.refresh();
  }

  // =================================================================== disposition
  disposer() {
    const W = window.innerWidth, H = window.innerHeight;
    // les marges système (encoche, barre de gestes) : le calque les porte en padding (css/style.css, --sa-*)
    const cs = getComputedStyle(this.root);
    const sa = this.sa = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0,
      b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
    const T = settings.controls.tactile;
    // L'UNITÉ : 1 sur un téléphone de 390 px de haut (844 × 390), un peu moins sur 360, jusqu'à 1,4 sur tablette ; la
    // largeur compte aussi (portrait). Planchers : jamais un bouton d'action sous 48 px, ni un petit bouton sous 40.
    const u = this.u = borne(Math.min(H / 390, W / 700), 0.8, 1.4) * T.taille;
    const R = { xl: Math.max(34, 44 * u), l: Math.max(26, 32 * u), s: Math.max(24, 26 * u), u: Math.max(20, 21 * u) };
    const g = 10 * u, m = 12;
    const Rb = this.Rb = Math.max(48, 60 * u);
    this.course = Rb * 0.78;
    // PLACES PAR DÉFAUT, en px depuis leur coin (centre du bouton). Autour du tir, en angle (0° = à sa gauche, 90° =
    // au-dessus) : la passe contre lui, puis deux anneaux de gestes ; les écarts tiennent à toutes les tailles.
    const rT = R.xl, rS = R.s, cT = m + rT, d1 = rT + g + rS, d2 = d1 + 2 * rS + g;
    const pol = (deg, d) => ({ c: 'br', x: cT + Math.cos(deg * Math.PI / 180) * d, y: cT + Math.sin(deg * Math.PI / 180) * d });
    const DEF = {
      tir: { c: 'br', x: cT, y: cT }, b: pol(-4, rT + g + R.l),
      spin: pol(46, d1), epaule: pol(92, d1), jambes: pol(18, d2), dos: pol(46, d2), feinte: pol(76, d2),
      stick: { c: 'bl', x: m + 10 + Rb, y: m + 4 + Rb },
    };
    // EN PORTRAIT (« JOUER QUAND MÊME »), le tableau des scores, le momentum et la possession prennent tout le haut de
    // l'écran : la rangée passe dessous (mesuré à 390 × 844 : la ligne de possession finit à 114 px)
    const portrait = H > W * 1.05;
    RANGEE.forEach((id, i) => { DEF[id] = { c: 'tl', x: m + R.u + i * (2 * R.u + g), y: m + R.u + (portrait ? 110 : 0) }; });
    // JOUEUR, seul en haut à droite (en match, ce coin est libre : le bouton JOUER de la balade n'y est plus)
    DEF.joueur = { c: 'tr', x: m + R.s, y: m + R.s + (portrait ? 110 : 0) };
    // une place enregistrée (DISPOSITION TACTILE) est en unités : elle suit la taille des boutons
    const place = (id) => { const p = T.places[id]; return p ? { c: p.c, x: p.x * u, y: p.y * u } : DEF[id]; };
    // depuis son coin, à l'intérieur de la zone sûre, tout entier à l'écran
    const ecran = (p, r) => ({
      x: borne(p.c[1] === 'r' ? W - sa.r - p.x : sa.l + p.x, sa.l + r + 2, W - sa.r - r - 2),
      y: borne(p.c[0] === 'b' ? H - sa.b - p.y : sa.t + p.y, sa.t + r + 2, H - sa.b - r - 2), r });
    for (const s of EMPL) {
      const r = R[s.t], p = this.pos[s.id] = ecran(place(s.id), r), el = this.el[s.id], d = Math.round(2 * r);
      el.style.width = el.style.height = d + 'px';
      el.style.left = Math.round(p.x - r) + 'px'; el.style.top = Math.round(p.y - r) + 'px';
      this._police(el);
    }
    this.repos = ecran(place('stick'), Rb);
    const D = Math.round(2 * Rb), rk = Math.round(Rb * 0.42);
    this.stick.style.width = this.stick.style.height = D + 'px';
    this.knob.style.width = this.knob.style.height = 2 * rk + 'px';
    this.knob.style.margin = `${-rk}px 0 0 ${-rk}px`;
    if (this.stickId === null) { this.centre = { x: this.repos.x, y: this.repos.y }; this._placerSocle(); }
    // LA ZONE DU JOYSTICK FLOTTANT : la moitié gauche, sous la rangée du haut, jamais sous la grappe de droite. Seuls les
    // boutons restés dans la moitié DROITE la bornent : un geste posé à gauche (DISPOSITION TACTILE) prend ses appuis
    // lui-même (_bas : les boutons d'abord) — compté ici, il réduisait la zone à la bande à sa gauche, voire à rien, et
    // envoyait la jauge de tir hors de l'écran.
    let gauche = W;
    for (const id of GRAPPE) { const p = this.pos[id]; if (p.x > W / 2) gauche = Math.min(gauche, p.x - p.r); }
    let haut = sa.t + m;
    for (const id of RANGEE) { const p = this.pos[id]; if (p.y < H * 0.4 && p.x < W * 0.5) haut = Math.max(haut, p.y + p.r); }
    this.zone = { x: Math.min(W * 0.5, gauche - 12), y: haut + 6 };
    // LE HUD S'ÉCARTE (css/style.css, body.touch) : la jauge de tir passe à gauche de la grappe, les pièces sous la rangée
    // du haut. L'endurance (140 px) reste en bas au milieu, entre le joystick et les boutons ; quand une commande du bas
    // lui prend la place (portrait, boutons déplacés), elle va au milieu du plus grand espace libre entre elles, rétrécie
    // s'il le faut (jamais sous 90 px), sinon juste au-dessus. On compte TOUS les emplacements, visibles ou non : la barre
    // ne saute pas quand la passe apparaît.
    const bs = document.body.style;
    // (la jauge, 22 px de large, reste tout entière à l'écran quoi qu'il arrive)
    bs.setProperty('--tc-droite', Math.round(Math.max(0, Math.min(W - gauche, W - sa.l - 60))) + 'px');
    bs.setProperty('--tc-haut', Math.round(haut + 8) + 'px');
    const basses = [...EMPL.map((s) => this.pos[s.id]), this.repos].filter((p) => p.y + p.r > H - sa.b - 34)
      .sort((a, b) => (a.x - a.r) - (b.x - b.r));
    let ex = W / 2, ew = 140, eb = 6 + sa.b;
    if (basses.some((p) => p.x + p.r + 8 > ex - 70 && p.x - p.r - 8 < ex + 70)) {
      let trou = [0, 0], x0 = sa.l + 4;
      for (const [l, r] of [...basses.map((p) => [p.x - p.r - 8, p.x + p.r + 8]), [W - sa.r - 4, W]]) {
        if (l - x0 > trou[1] - trou[0]) trou = [x0, l];
        x0 = Math.max(x0, r);
      }
      if (trou[1] - trou[0] >= 90) { ex = (trou[0] + trou[1]) / 2; ew = Math.min(140, trou[1] - trou[0]); }
      else eb = Math.round(H - Math.min(...basses.map((p) => p.y - p.r)) + 4);
    }
    bs.setProperty('--tc-endu', eb + 'px');
    bs.setProperty('--tc-endu-x', Math.round(ex) + 'px');
    bs.setProperty('--tc-endu-l', Math.round(ew) + 'px');
    // la pastille des messages : sur le coin haut droit du bouton du téléphone
    const t = this.pos.tel;
    this.pastille.style.left = Math.round(Math.min(t.x + t.r * 0.45, W - sa.r - 24)) + 'px';
    this.pastille.style.top = Math.round(Math.max(sa.t, t.y - t.r - 4)) + 'px';
    this.root.style.setProperty('--tc-op', String(T.opacite));
    this.root.style.setProperty('--tc-op-repos', (T.opacite * 0.5).toFixed(2));   // socle au repos : à moitié (pas de calc() dans opacity)
    if (this.edition) { this._chevauchements(); this._placerBarre(); }
  }
  _placerSocle() {
    this.stick.style.left = Math.round(this.centre.x - this.Rb) + 'px';
    this.stick.style.top = Math.round(this.centre.y - this.Rb) + 'px';
  }
  // le libellé et sa taille de lettre (un mot long tient dans son rond : DESCENDRE, SONNETTE, S'ASSEOIR)
  _libelle(el, txt) {
    const s = el.firstChild;
    if (s.textContent === txt) return;
    s.textContent = txt; this._police(el);
  }
  _police(el) {
    const d = parseFloat(el.style.width) || 50, txt = el.firstChild.textContent || '';
    const f = EMOJI.test(txt) ? d * 0.46 : Math.min(d * 0.36, (d * 0.8) / ([...txt].length * 0.47 + 0.25));
    el.style.fontSize = f.toFixed(1) + 'px';
  }

  // =================================================================== contexte
  // Ce qui est utile MAINTENANT : { v: { emplacement: [action, libellé] }, stick }. Un emplacement absent est caché.
  _contexte() {
    const g = this.game, u = g.user, ball = g.ball, v = {};
    v.pause = ['pause', 'II'];
    if (!u || !ball) return { v, stick: false };
    const roue = !!(g.wheel && g.wheel.isOpen);    // roue des emotes ouverte : on choisit son emote, les actions attendent
    if (g.mode === 'match') {
      v.cam = ['camera', 'CAM'];
      if (g.reseau && g.reseau.role === 'spect') return { v, stick: false };     // spectateur : on regarde
      const ps = g.pendingShot, h = ball.holder;
      const avec = h === u && !ps;
      const tireur = ps && ps.shooter && ps.shooter.team !== u.team ? ps.shooter : null;
      const def = !avec && (tireur || (h && h.team !== u.team));
      if (!avec) v.emote = ['emote', '🕺'];
      if (roue) return { v, stick: true };
      // le gros bouton dit ce que la touche de tir va faire (js/game.js controlUser) : près du porteur qui n'arme pas, on
      // lui vole la balle ; sinon on saute contrer
      let tir = 'SAUT';
      if (avec) tir = 'TIR';
      else if (def) {
        const t = tireur || h;
        tir = !tireur && t.state !== 'windup' && Math.hypot(u.pos.x - t.pos.x, u.pos.z - t.pos.z) < 1.4 ? 'VOL' : 'CONTRE';
      }
      v.tir = ['shoot', tir];
      // à côté du tir : la passe balle en main. Le changement de joueur, en haut à droite : il ne marche que sans le
      // ballon (en attaque on tient toujours le porteur, js/game.js pickControlled) et le changement automatique
      // (Options > Commandes) s'en charge le plus souvent
      if (g.teamSize > 1) { if (avec) v.b = ['pass', 'PASSE']; else v.joueur = ['switch', 'JOUEUR']; }
      if (avec) { v.spin = ['spin', 'SPIN']; v.feinte = ['dribble', 'FEINTE']; v.jambes = ['legs', 'JAMBES']; v.dos = ['behind', 'DOS']; }
      v.epaule = ['bump', 'ÉPAULE'];             // des deux côtés : coup d'épaule, et maintenu balle en main, l'appui dos au panier
      return { v, stick: true };
    }
    // ----- balade -----
    v.cam = ['camera', 'VUE'];
    const atelier = !!(g.training && g.training.active);
    if (u.velo) {                                // vélo, trottinette, skate
      const b = u.velo.v;
      if (!roue) { v.tir = ['shoot', b && b.ollie ? 'OLLIE' : 'SONNETTE']; v.b = ['interact', 'DESCENDRE']; }
      return { v, stick: true };
    }
    if (!atelier) { v.emote = ['emote', '🕺']; v.tel = ['phone', '📱']; }
    if (roue) return { v, stick: true };
    if (u.assis) {                               // sur un gradin : la touche d'action monte d'un rang, puis relève
      const suivant = g.bancs && g.bancs[u.assis.rang + 1];
      v.tir = ['shoot', 'DEBOUT']; v.b = ['interact', suivant ? 'MONTER' : 'DEBOUT'];
      return { v, stick: true };
    }
    const avec = ball.holder === u;
    v.tir = ['shoot', avec ? 'TIR' : 'SAUT'];
    if (avec) { v.spin = ['spin', 'SPIN']; v.feinte = ['dribble', 'FEINTE']; v.jambes = ['legs', 'JAMBES']; v.dos = ['behind', 'DOS']; }
    // la touche d'action, dans l'ordre où le jeu la donne (js/game.js updateLobby) : vélo, gradin, marchand, engin du sac
    const inter = g._presVelo ? (ENGIN[g._presGenre] || 'VÉLO') : g._presBanc ? 'S’ASSEOIR' : g.nearMerchant ? 'PARLER'
      : g._enginDispo && g.enginPerso ? (ENGIN[g.enginPerso.genre] || 'MONTER') : null;
    if (inter) v.b = ['interact', inter];
    return { v, stick: true };
  }

  // affiche les contrôles en balade et en match (pas dans les menus) ; appelé à chaque changement de mode (js/main.js)
  refresh() { if (!this.edition) this._maj(true); }

  // Le nom du bouton qui fait l'action `id` : son libellé du moment (VÉLO, PARLER, S'ASSEOIR...), sinon celui de sa place
  // habituelle ; null pour ce qui n'a pas de bouton (déplacement, marche, sprint : le joystick).
  nomBouton(id) {
    for (const s of EMPL) { const el = this.el[s.id]; if (!el.hidden && el.dataset.action === id) return el.firstChild.textContent; }
    return NOM_ACTION[id] || null;
  }

  // chaque image
  tick(dt) {
    this._vieillir(this.fronts, this.input.pressedSet, dt);
    // (06/10/2026) Les RELÂCHERS ne vieillissent pas pendant la pause (hors ligne, la partie ne tourne plus : personne ne
    // les lit). Le tir tenu dont on levait le doigt pendant la pause perdait son relâcher au bout de 0,35 s, et la jauge
    // reprenait à la reprise jusqu'à partir toute seule, en haut. Un nouvel appui du même bouton efface de toute façon un
    // relâcher jamais lu (_appuyer) : il n'en sort pas d'action fantôme.
    const g = this.game;
    if (!g.paused || g.reseau) this._vieillir(this.lachers, this.input.releasedSet, dt);
    // la manette reprend la main pendant l'éditeur : elle masque le calque (css : body.pad-actif #touch) et ne pilote pas
    // l'éditeur — on en sort (ce qui est posé est déjà enregistré) et les options reviennent, qu'elle sait parcourir
    if (this.edition) { if (entree.manette) this._quitterEdition(); return; }
    // un panneau s'ouvre (téléphone, boutique) : le joystick ne pousse plus le joueur ; il reprend à la fermeture
    if (this.input.blocked !== this._bloque) { this._bloque = this.input.blocked; this._appliquerAxe(); }
    this._maj(false);
  }
  _vieillir(fronts, set, dt) {
    for (const [c, t] of fronts) {
      if (!set.has(c)) fronts.delete(c);                                  // lu par le jeu
      else if (t + dt > FRONT_MAX) { set.delete(c); fronts.delete(c); }   // jamais lu : oublié
      else fronts.set(c, t + dt);
    }
  }
  _maj(force) {
    const g = this.game, on = g.mode === 'lobby' || g.mode === 'match';
    if (this.root.hidden !== !on) { this.root.hidden = !on; if (!on) this._toutLacher(); }
    if (!on) { this.cle = ''; return; }
    const ctx = this._contexte();
    // les messages non lus (js/phone.js tient la pastille du HUD) : sur le bouton du téléphone, quand il est là
    const bh = this.badgeHud, nonLus = ctx.v.tel && bh && !bh.hidden ? bh.textContent : '';
    // une clé courte : on ne touche au DOM que lorsque quelque chose change
    let cle = (ctx.stick ? 'S' : '-') + nonLus;
    for (const s of EMPL) { const x = ctx.v[s.id]; cle += x ? '|' + x[0] + ':' + x[1] : '|'; }
    if (cle === this.cle && !force) return;
    this.cle = cle;
    this.pastille.hidden = !nonLus; this.pastille.textContent = nonLus;
    this.stickActif = ctx.stick; this.stick.hidden = !ctx.stick;
    if (!ctx.stick && this.stickId !== null) this._finDoigt(this.stickId);
    for (const s of EMPL) {
      const el = this.el[s.id], x = ctx.v[s.id];
      if (!x) { el.hidden = true; continue; }
      el.hidden = false; el.dataset.action = x[0]; this._libelle(el, x[1]);
    }
  }

  // =================================================================== doigts
  _bas(e, surCalque) {
    if (this.root.hidden) return;
    const souris = e.pointerType === 'mouse';
    if (souris && e.button !== 0) return;
    if (!souris || surCalque) this.auDoigt = true;
    if (this.edition) { if (surCalque) this._saisir(e); return; }
    const x = e.clientX, y = e.clientY;
    // un bouton : celui qu'on touche, ou le plus proche à quelques pixels près (un pouce ne vise pas au pixel)
    const cible = surCalque && e.target.closest ? e.target.closest('.tc-btn') : null;
    const slot = cible && !cible.hidden ? cible.dataset.slot : souris ? null : this._boutonProche(x, y);
    if (slot) { e.preventDefault(); this._appuyer(e.pointerId, slot); return; }
    if (souris || surCalque) return;            // la souris garde la caméra du PC
    // le joystick
    if (this.stickActif && this.stickId === null && this._dansZoneStick(x, y)) { e.preventDefault(); this._stickPose(e.pointerId, x, y); return; }
    // la caméra de balade : glisser ailleurs (moitié droite)
    if (this.game.mode === 'lobby' && this.regardId === null) { this.regardId = e.pointerId; this.doigts.set(e.pointerId, { role: 'regard', x, y }); }
  }
  _boutonProche(x, y) {
    let best = null, bd = 8;
    for (const s of EMPL) {
      if (this.el[s.id].hidden) continue;
      const p = this.pos[s.id], d = Math.hypot(x - p.x, y - p.y) - p.r;
      if (d < bd) { bd = d; best = s.id; }
    }
    return best;
  }
  _dansZoneStick(x, y) {
    // sur le socle, où qu'il soit : FIXE, ou FLOTTANT déplacé hors de la moitié gauche — un joystick visible répond toujours
    if (Math.hypot(x - this.repos.x, y - this.repos.y) < this.Rb * 1.6) return true;
    return settings.controls.tactile.stick !== 'fixe' && x < this.zone.x && y > this.zone.y;
  }
  _bouge(e) {
    const d = this.doigts.get(e.pointerId);
    if (!d) return;
    const x = e.clientX, y = e.clientY;
    if (d.role === 'stick') this._stickBouge(x, y);
    else if (d.role === 'bouton') {
      // un doigt qui glisse HORS du bouton le relâche (le tir part, comme en lâchant la touche) ; il ne rappuie pas en revenant
      const p = this.pos[d.slot];
      if (Math.hypot(x - p.x, y - p.y) > p.r + d.marge) this._lacherBouton(d);
    } else if (d.role === 'regard') this._regard(d, x, y);
    else if (d.role === 'deplace') this._deplacer(d, x, y);
  }
  _finDoigt(id) {
    const d = this.doigts.get(id);
    if (!d) return;
    this.doigts.delete(id);
    if (d.role === 'stick') this._stickLeve();
    else if (d.role === 'bouton') this._lacherBouton(d);
    else if (d.role === 'regard') this.regardId = null;
    else if (d.role === 'deplace') this._poser(d);
  }
  _toutLacher() { for (const id of [...this.doigts.keys()]) this._finDoigt(id); }

  // ----- boutons -----
  _appuyer(pid, slot) {
    const el = this.el[slot], action = el.dataset.action;
    const mort = () => this.doigts.set(pid, { role: 'mort' });
    if (!action) return mort();
    for (const d of this.doigts.values()) if (d.role === 'bouton' && d.slot === slot) return mort();   // déjà tenu par un autre doigt
    // un panneau ouvert (téléphone...) : seuls la pause et le téléphone répondent, comme le clavier (js/input.js, blocked)
    if (this.input.blocked && action !== 'phone' && action !== 'pause') return mort();
    const p = this.pos[slot];
    // marge avant de lâcher en glissant : large sur le tir (le pouce roule pendant qu'on tient la jauge)
    this.doigts.set(pid, { role: 'bouton', slot, action, marge: slot === 'tir' ? p.r * 0.8 : Math.max(14, p.r * 0.5) });
    el.classList.add('on');
    const c = 'Tactile:' + action, inp = this.input;
    inp.releasedSet.delete(c); this.lachers.delete(c);    // un vieux relâcher jamais lu ne coupe pas ce nouvel appui
    inp.presser(c); this.fronts.set(c, 0);
    this._vibrer(9);
  }
  _lacherBouton(d) {
    this.el[d.slot].classList.remove('on');
    const c = 'Tactile:' + d.action;
    if (this.input.downSet.has(c)) { this.input.relacher(c); this.lachers.set(c, 0); }
    d.role = 'mort';
  }

  // ----- joystick -----
  _stickPose(pid, x, y) {
    this.doigts.set(pid, { role: 'stick' }); this.stickId = pid;
    // flottant : le socle se pose SOUS le pouce (aucun départ involontaire) ; fixe : il reste à sa place
    this.centre = settings.controls.tactile.stick === 'fixe' ? { x: this.repos.x, y: this.repos.y } : { x, y };
    this.stick.classList.remove('repos'); this.stick.classList.add('actif');
    this._placerSocle();
    this._stickBouge(x, y);
  }
  _stickBouge(x, y) {
    const Rt = this.course;
    let dx = x - this.centre.x, dy = y - this.centre.y, l = Math.hypot(dx, dy);
    if (settings.controls.tactile.stick !== 'fixe' && l > Rt * SUIT) {
      const k = (l - Rt * SUIT) / l;
      this.centre.x += dx * k; this.centre.y += dy * k; dx -= dx * k; dy -= dy * k; l = Rt * SUIT;
      this._placerSocle();
    }
    const m = Math.min(1, l / Rt), kx = l > 0 ? dx / l : 0, ky = l > 0 ? dy / l : 0;
    this.knob.style.transform = `translate(${(kx * m * Rt).toFixed(1)}px, ${(ky * m * Rt).toFixed(1)}px)`;
    // réponse analogique après la zone morte : 0 au bord de la zone morte, 1 au bord du cercle
    const a = m <= DZ ? 0 : (m - DZ) / (1 - DZ);
    this.axe.x = kx * a; this.axe.y = -ky * a; this.amp = a;
    const avant = this.sprint;
    this.sprint = avant ? m > SPRINT_OFF : m >= SPRINT_ON;
    if (this.sprint !== avant) { this.stick.classList.toggle('sprint', this.sprint); if (this.sprint) this._vibrer(6); }
    this._appliquerAxe();
  }
  _stickLeve() {
    this.stickId = null; this.axe.x = 0; this.axe.y = 0; this.amp = 0; this.sprint = false;
    this.knob.style.transform = 'translate(0px, 0px)';
    this.stick.classList.remove('actif', 'sprint'); this.stick.classList.add('repos');
    this.centre = { x: this.repos.x, y: this.repos.y }; this._placerSocle();
    this._appliquerAxe();
  }
  _appliquerAxe() {
    const inp = this.input, on = this.amp > 0 && !inp.blocked;
    inp.touchAxis = on ? { x: this.axe.x, y: this.axe.y } : null;
    inp.touchSprint = on && this.sprint;
  }

  // ----- caméra de balade -----
  _regard(d, x, y) {
    const g = this.game, dx = x - d.x, dy = y - d.y;
    d.x = x; d.y = y;
    if (g.mode !== 'lobby' || g.paused || g.setupOpen || this.input.blocked) return;
    const s = g.settings ? g.settings.controls.sensitivity : 1;
    g.camYaw -= dx * 0.006 * s;
    if (Math.abs(dx) > 1) g.camManuT = performance.now();
    g.camPitch = borne(g.camPitch + dy * 0.004 * s * (g.settings && g.settings.controls.invertY ? -1 : 1), -0.1, 0.9);
  }

  // Un petit retour sous le doigt (Android ; Safari sur iPhone n'a pas navigator.vibrate). Pas avant le premier vrai appui :
  // Chrome refuse alors, et le signale en console.
  _vibrer(ms) {
    if (!settings.controls.tactile.vibrations || typeof navigator.vibrate !== 'function') return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try { navigator.vibrate(ms); } catch (e) { /* refusé */ }
  }

  // =================================================================== DISPOSITION TACTILE (éditeur)
  // Chaque bouton et le joystick se déplacent au doigt (ou à la souris) ; la taille et l'opacité se règlent en direct. Tout
  // est enregistré dans les réglages (controls.tactile) ; une place l'est depuis le coin le plus proche, en unités : elle
  // suit la taille des boutons et tient sur un autre écran. `fin` : rappelé en sortant (js/main.js rouvre les options).
  // Pas tant que la manette est l'entrée du moment : elle masque les commandes tactiles, l'éditeur serait invisible et le
  // jeu resterait bloqué derrière (Options > Commandes le dit sous le bouton ; un appui sur l'écran rend la main au doigt).
  peutEditer() { return !this.edition && !entree.manette; }
  editer(fin = null) {
    if (!this.peutEditer()) return;
    this._toutLacher();
    this.edition = true; this._fin = fin; this._bloquait = this.input.blocked; this.input.blocked = true;
    this.root.hidden = false; this.root.classList.add('edition');
    if (!this.barre) this._construireBarre();
    this.barre.hidden = false; this._majBarre();
    this.stick.hidden = false; this.pastille.hidden = true;
    for (const s of EMPL) { const el = this.el[s.id]; el.hidden = false; el.classList.remove('on'); this._libelle(el, NOMS[s.id]); }
    this.cle = '';
    this.disposer();
  }
  // La barre de l'éditeur, centrée en largeur : à la PREMIÈRE hauteur (du haut vers le bas) où elle ne cache aucune
  // commande — un bouton posé dessous ne se reprendrait plus —, sinon là où elle en cache le moins. Elle s'efface pendant
  // qu'on fait glisser (css : .glisse).
  _placerBarre() {
    const b = this.barre, H = window.innerHeight, sa = this.sa, items = [...EMPL.map((s) => this.pos[s.id]), this.repos];
    const r = b.getBoundingClientRect(), h = r.height;
    const genes = (y) => items.filter((p) => p.x + p.r > r.left && p.x - p.r < r.right && p.y + p.r > y && p.y - p.r < y + h).length;
    let best = Math.max(sa.t + 8, (H - h) / 2), min = Infinity;
    for (let y = sa.t + 8; y <= H - sa.b - h - 8; y += 6) {
      const n = genes(y);
      if (n < min) { min = n; best = y; }
      if (!n) break;
    }
    b.style.top = Math.round(best) + 'px';
  }
  _quitterEdition() {
    this._toutLacher();
    this.edition = false; this.root.classList.remove('edition', 'glisse'); this.barre.hidden = true;
    for (const s of EMPL) this.el[s.id].classList.remove('chevauche');
    this.stick.classList.remove('chevauche');
    this.input.blocked = this._bloquait;
    this._maj(true);
    const f = this._fin; this._fin = null;
    if (f) f();
  }
  _construireBarre() {
    const b = document.createElement('div');
    b.className = 'tc-barre'; b.hidden = true;
    // compacte (trois lignes) : elle doit trouver sa place entre les commandes sur un écran de 360 px de haut
    b.innerHTML = '<div class="tc-barre-haut"><b>DISPOSITION TACTILE</b>'
      + '<button type="button" class="btn-secondary" data-a="raz">Réinitialiser</button>'
      + '<button type="button" class="btn-primary" data-a="ok">Terminé</button></div>'
      + '<label>Taille <input type="range" data-k="taille" min="0.75" max="1.35" step="0.05"></label>'
      + '<label>Opacité <input type="range" data-k="opacite" min="0.25" max="1" step="0.05"></label>'
      + '<small>Fais glisser les boutons et le joystick. En rouge : deux commandes se chevauchent.</small>';
    b.querySelectorAll('input').forEach((r) => {
      // en direct pendant qu'on glisse, enregistré au lâcher
      r.oninput = () => { settings.controls.tactile[r.dataset.k] = +r.value; this.disposer(); };
      r.onchange = () => settings.set('controls.tactile.' + r.dataset.k, +r.value);
    });
    b.querySelector('[data-a="raz"]').onclick = () => { settings.resetTactile(); this._majBarre(); };
    b.querySelector('[data-a="ok"]').onclick = () => this._quitterEdition();
    this.root.appendChild(b); this.barre = b;
  }
  _majBarre() { const T = settings.controls.tactile; this.barre.querySelectorAll('input').forEach((r) => { r.value = T[r.dataset.k]; }); }
  _saisir(e) {
    const cible = e.target.closest ? e.target.closest('.tc-btn, .tc-stick') : null;
    if (!cible) return;
    e.preventDefault();
    const slot = cible === this.stick ? 'stick' : cible.dataset.slot, p = slot === 'stick' ? this.repos : this.pos[slot];
    this.doigts.set(e.pointerId, { role: 'deplace', slot, el: cible, dx: e.clientX - p.x, dy: e.clientY - p.y, x: p.x, y: p.y, r: p.r });
    cible.classList.add('on'); this.root.classList.add('glisse');
  }
  _deplacer(d, x, y) {
    const W = window.innerWidth, H = window.innerHeight, sa = this.sa;
    d.x = borne(x - d.dx, sa.l + d.r + 2, W - sa.r - d.r - 2); d.y = borne(y - d.dy, sa.t + d.r + 2, H - sa.b - d.r - 2);
    d.el.style.left = Math.round(d.x - d.r) + 'px'; d.el.style.top = Math.round(d.y - d.r) + 'px';
    const p = { x: d.x, y: d.y, r: d.r };
    if (d.slot === 'stick') { this.repos = p; this.centre = { x: d.x, y: d.y }; } else this.pos[d.slot] = p;
    this._chevauchements();
  }
  _poser(d) {
    d.el.classList.remove('on');
    if (![...this.doigts.values()].some((x) => x.role === 'deplace')) this.root.classList.remove('glisse');
    const W = window.innerWidth, H = window.innerHeight, sa = this.sa, u = this.u;
    const c = (d.y < H / 2 ? 't' : 'b') + (d.x < W / 2 ? 'l' : 'r');
    const px = c[1] === 'r' ? W - sa.r - d.x : d.x - sa.l, py = c[0] === 'b' ? H - sa.b - d.y : d.y - sa.t;
    settings.controls.tactile.places[d.slot] = { c, x: Math.round((px / u) * 10) / 10, y: Math.round((py / u) * 10) / 10 };
    settings.save();                          // -> disposer() (settings.onChange)
  }
  _chevauchements() {
    const items = EMPL.map((s) => [this.el[s.id], this.pos[s.id]]);
    items.push([this.stick, this.repos]);
    const mauvais = new Set();
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i][1], b = items[j][1];
        if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + 2) { mauvais.add(items[i][0]); mauvais.add(items[j][0]); }
      }
    }
    for (const [el] of items) el.classList.toggle('chevauche', mauvais.has(el));
  }
}

// ---------------------------------------------------------------------------
// Plein écran sur mobile. Dans un navigateur, la barre d'état et la barre de navigation restent affichées
// par-dessus le jeu tant qu'on n'a pas demandé le plein écran, et le navigateur ne l'accorde QUE pendant un
// geste de l'utilisateur. On le demande donc au premier appui, puis on le redemande si on en sort (retour
// d'une notification, rotation), toujours depuis un geste.
//
// Dans l'APK Android c'est l'activité qui s'en charge (mode immersif collant, voir .github/workflows/android.yml) :
// cette fonction ne fait alors rien de plus, elle échoue silencieusement.
export function pleinEcran() {
  const el = document.documentElement;
  const demande = () => {
    if (document.fullscreenElement) return;
    const f = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!f) return;
    try {
      const p = f.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(verrouillerPaysage).catch(() => {});
      else verrouillerPaysage();
    } catch (e) { /* refusé : on réessaiera au prochain geste */ }
  };
  const verrouillerPaysage = () => {
    // le paysage n'est verrouillable qu'en plein écran, et seulement sur certains navigateurs
    try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch (e) { /* ignore */ }
  };
  // au premier geste, puis à chaque geste tant qu'on n'y est pas
  for (const ev of ['pointerdown', 'touchend', 'keydown']) {
    window.addEventListener(ev, demande, { passive: true });
  }
  return { demande };
}
