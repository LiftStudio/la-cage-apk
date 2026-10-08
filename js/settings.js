// Réglages du jeu (graphismes, audio, commandes) : valeurs par défaut, sauvegarde dans localStorage, libellés des touches.
// Les touches sont stockées en e.code (position physique) : deux emplacements par action (principal + secondaire).
// La manette a les siens, à côté (`pad`) : des codes virtuels « Pad:A », « Pad:RT »… (voir « MANETTE » plus bas).
//
// `pad` : les deux emplacements MANETTE de l'action, disposition par défaut façon NBA 2K. `stick` : l'action est
// tenue par le stick gauche, analogique — elle n'a pas de bouton à affecter.
import { TELEPHONE } from './appareil.js';
export const ACTIONS = [
  { id: 'forward', label: 'Avancer',                    group: 'Déplacement', def: ['KeyW', 'ArrowUp'],    stick: '↑' },
  { id: 'back',    label: 'Reculer',                    group: 'Déplacement', def: ['KeyS', 'ArrowDown'],  stick: '↓' },
  { id: 'left',    label: 'Gauche',                     group: 'Déplacement', def: ['KeyA', 'ArrowLeft'],  stick: '←' },
  { id: 'right',   label: 'Droite',                     group: 'Déplacement', def: ['KeyD', 'ArrowRight'], stick: '→' },
  { id: 'sprint',  label: 'Sprint',                     group: 'Déplacement', def: ['ShiftLeft', 'ShiftRight'], pad: ['Pad:RT', null] },
  // MARCHER. Le jeu n'avait qu'une allure — on courait, toujours. Une touche de marche donne la seconde, et
  // avec elle la vraie animation de marche : c'est en balade, autour du terrain, qu'elle change tout.
  { id: 'walk',    label: 'Marcher',                    group: 'Déplacement', def: ['AltLeft', 'KeyZ'], pad: ['Pad:L3', null] },
  { id: 'shoot',   label: 'Tirer · voler · contrer',    group: 'Balle',       def: ['Space', null], pad: ['Pad:X', null] },
  { id: 'pass',    label: 'Passe (modes en équipe)',    group: 'Balle',       def: ['KeyV', 'KeyX'], pad: ['Pad:A', null] },
  { id: 'spin',    label: 'Spin move',                  group: 'Dribble',     def: ['KeyE', null], pad: ['Pad:B', null] },
  // Les trois gestes suivants forment le « pro stick » de la manette : un coup de stick droit, en match.
  { id: 'legs',    label: 'Entre les jambes',           group: 'Dribble',     def: ['KeyR', null], pad: ['Pad:RSUp', null] },
  { id: 'behind',  label: 'Dans le dos',                group: 'Dribble',     def: ['KeyF', null], pad: ['Pad:RSDown', null] },
  { id: 'dribble', label: 'Feinte : hésitation, in-and-out, crossover (selon la direction) · maintenue à l’arrêt : size-up', group: 'Dribble',  def: ['KeyH', null], pad: ['Pad:RSLeft', 'Pad:RSRight'] },
  { id: 'bump',    label: 'Coup d’épaule · appui dos au panier', group: 'Physique', def: ['KeyQ', 'ControlLeft'], pad: ['Pad:LT', null] },
  { id: 'switch',  label: 'Changer de joueur',          group: 'Équipe',      def: ['Tab', 'KeyB'], pad: ['Pad:RB', null] },
  { id: 'emote',   label: 'Roue des emotes (danses…)',  group: 'Emotes',      def: ['KeyT', 'KeyG'], pad: ['Pad:LB', null] },
  { id: 'camera',  label: 'Changer de caméra',          group: 'Système',     def: ['KeyC', null], pad: ['Pad:Back', 'Pad:Down'] },
  { id: 'interact', label: 'Parler au marchand (boutique)', group: 'Système', def: ['Enter', null], pad: ['Pad:Y', null] },
  { id: 'phone',   label: 'Téléphone (groupe LA CAGE)',    group: 'Système', def: ['KeyP', null], pad: ['Pad:Up', null] },
  { id: 'pause',   label: 'Pause / menu',               group: 'Système',     def: ['Escape', null], pad: ['Pad:Start', null] },
];

export const WEATHERS_OPT = [['auto', 'Auto'], ['soleil', 'Soleil'], ['nuages', 'Couvert'], ['pluie', 'Pluie']];
export const QUALITIES = [['auto', 'Auto'], ['low', 'Basse'], ['medium', 'Moyenne'], ['high', 'Haute'],
  ['ultra', 'Ultra'], ['extreme', 'Extrême']];
export const SHADOWS = [['off', 'Désactivées'], ['medium', 'Moyennes'], ['high', 'Hautes']];

// Les terrains jouables. Mêmes dimensions de jeu, décors entièrement différents : changer de terrain
// reconstruit la scène, donc la page se recharge (tout est sauvegardé, on ne perd rien).
export const TERRAINS = [
  { id: 'becon', nom: 'LA CAGE', lieu: '85 rue Armand Silvestre · Courbevoie',
    desc: 'Le terrain d’origine : bitume gris, lignes rouges, les platanes et la résidence par-dessus le grillage.',
    c1: '#e8622a', c2: '#2b2f3a' },
  { id: 'becon_scan', nom: 'LA CAGE · SCAN 3D', lieu: '85 rue Armand Silvestre · Courbevoie',
    desc: 'Terrain de test : La Cage à l’identique, avec le scan 3D complet du côté panier A (mur, grillage, sol et panier scannés sur place).',
    c1: '#3fa66b', c2: '#2b2f3a' },
  { id: 'levallois', nom: 'PLAYGROUND RUDY GOBERT', lieu: 'Quai Michelet · Levallois-Perret',
    desc: 'Le sol entièrement peint au bord de la Seine : la fresque du dunk, les gradins jaunes « write your own story », les mâts courbes et la péniche à quai.',
    c1: '#d42a24', c2: '#f0c41b' },
  { id: 'jemmapes', nom: '144 QUAI DE JEMMAPES', lieu: 'Canal Saint-Martin · Paris 10e',
    desc: 'La cage noire du canal : la grande fresque florale rouge sur bitume noir, les paniers à potence, le mur à graffitis et le lycée rose saumon qui bouche tout le fond.',
    c1: '#e0533f', c2: '#26262a' },
  { id: 'parc', nom: 'PARC DE BÉCON · TERRAIN 1', lieu: 'Bord de Seine · Courbevoie',
    desc: 'Le petit terrain côté quai, sans une ligne au sol : la potence côté pin, le grand panneau à liseré bleu côté platanes, le rideau d’arbres et la Seine en contrebas.',
    c1: '#5c8a4a', c2: '#7b797e' },
  { id: 'parc2', nom: 'PARC DE BÉCON · TERRAIN 2', lieu: 'Bord de Seine · Courbevoie',
    desc: 'Le terrain d’à côté, contre le mur de meulière et ses bancs verts : deux potences à petit panneau, le pin parasol d’un côté, la voûte des platanes de l’autre.',
    c1: '#4f7a3f', c2: '#8a8272' },
];

const DEFAULTS = {
  // `res` : hauteur de rendu VISEE, en pixels. 'auto' = le moteur decide d'apres la machine et la taille
  // de la fenetre (comportement d'origine). Sinon on rend exactement a cette hauteur-la et le navigateur
  // etire jusqu'a l'ecran : c'est ce qui permet de jouer en 4K sur une petite fenetre, ou en 720p sur un
  // ecran 4K pour gagner des images.
  // `sharp` : force du reaffutage applique quand on rend EN DESSOUS de la resolution de l'ecran.
  // `fpsMax` : images par seconde au plus (js/game.js, start) — 'auto' = 60 au téléphone, sans limite ailleurs ; '30', '60',
  // ou '0' (sans limite)
  graphics: { weather: 'auto', quality: 'auto', res: 'auto', sharp: 0.35, scale: 1.0, shadows: 'high', ao: true, bloom: true, aa: true, fov: 46, fps: false, tonemap: 'aces', fpsMax: 'auto', look: 'photo', lookDefaut: 2,
    // les options du lot L12 (js/options_rendu.js) : MSAA x4 et occlusion du feuillage (machines costaudes seulement),
    // décor détaillé (platanes de La Cage et de Jemmapes, horizon de Levallois), basse étalonnée, sonde de lumière du ciel
    msaa: true, aoFeuillage: true, decor: true, etalonnageBasse: true, sonde: true,
    // les OPTIONS DU PARC ENTIER (lot C5, js/parc/options.js) : le bassin de la terrasse ('plante' aujourd'hui, ou 'eau',
    // le miroir d'eau à trois jets d'avant 2016) et la saison ('automne', fin septembre, ou 'printemps')
    parcBassin: 'plante', parcSaison: 'automne' },
  // `ambiance` : les sons du parc de Bécon en entier (fontaines, oiseaux, manège, rue du quai : js/audio_parc.js)
  audio: { master: 0.5, sfx: 1.0, crowd: 1.0, ambiance: 1.0 },
  // `pad` : la manette (js/manette.js), ajoutée le 28/09/2026. Une sauvegarde plus ancienne n'a pas ce bloc :
  // deepMerge le complète alors avec ces valeurs, et load() répare ce qui serait abîmé — c'est toute la migration.
  // `deadzone` : zone morte RADIALE des deux sticks (0..1) · `sens` : vitesse de la caméra au stick droit ·
  // `invertY` : tangage inversé au stick droit · `vibrations` : retour de force sur les temps forts.
  // `tactile` : les commandes à l'écran du téléphone (js/touch.js, 06/10/2026) — `taille` et `opacite` des boutons,
  // joystick `flottant` (sous le pouce) ou `fixe`, `vibrations` à l'appui (Android), et `places` : les boutons déplacés
  // dans DISPOSITION TACTILE, { emplacement: { c: coin 'bl' | 'br' | 'tl' | 'tr', x, y } } en unités d'écran depuis ce
  // coin (vide = places par défaut ; recopié à part dans load(), deepMerge ne garde que les clés connues).
  controls: { sensitivity: 1.0, invertY: false, autoSwitch: true, bindings: defaultBindings(),
    pad: { bindings: defaultPadBindings(), deadzone: 0.15, sens: 1.0, invertY: false, vibrations: true },
    tactile: { taille: 1, opacite: 0.8, stick: 'flottant', vibrations: true, places: {} } },
  // `camDist` : multiplicateur du recul des cameras de match (demi-terrain, diffusion, derriere le joueur).
  // 1 = le reglage d'origine, en dessous on se rapproche, au-dessus on s'eloigne.
  // `parcEntier` : le parc de Bécon EN ENTIER autour du plateau (chantier « parc complet », voir PARC_ENTIER plus
  // bas). Faux tant que le chantier n'est pas fini : le parc garde le décor d'aujourd'hui.
  // `parcMode` (02/10) : 'auto' (le parc en entier sur ordinateur, le plateau seul au téléphone), 'entier' ou 'plateau'
  game: { camera: 'tv' , vue: 3, terrain: 'becon', camDist: 1.0, parcEntier: false, parcMode: 'auto' },
};
const KEY = 'hoops.settings.v1';

export function defaultBindings() {
  const b = {}; for (const a of ACTIONS) b[a.id] = [...a.def]; return b;
}
// Manette : deux emplacements par action aussi (la caméra en a deux par défaut : VUE et la croix vers le bas).
export function defaultPadBindings() {
  const b = {}; for (const a of ACTIONS) b[a.id] = a.pad ? [...a.pad] : [null, null]; return b;
}
const estCodePad = (c) => c === null || (typeof c === 'string' && c.startsWith('Pad:'));

function deepMerge(base, over) {
  if (Array.isArray(base)) return Array.isArray(over) ? over : base;
  if (base && typeof base === 'object') {
    const out = {};
    for (const k of Object.keys(base)) out[k] = over && k in over ? deepMerge(base[k], over[k]) : clone(base[k]);
    return out;
  }
  return over === undefined || over === null ? base : over;
}
function clone(v) { return JSON.parse(JSON.stringify(v)); }

class Settings {
  constructor() { this.data = clone(DEFAULTS); this._subs = new Set(); this.load(); }
  get graphics() { return this.data.graphics; }
  get audio() { return this.data.audio; }
  get controls() { return this.data.controls; }
  get game() { return this.data.game; }
  get bindings() { return this.data.controls.bindings; }

  load() {
    let brut = null;
    try { const raw = localStorage.getItem(KEY); if (raw) { brut = JSON.parse(raw); this.data = deepMerge(DEFAULTS, brut); } }
    catch (e) { console.warn('[settings] lecture impossible, valeurs par défaut', e); this.data = clone(DEFAULTS); brut = null; }
    // chaque action a toujours 2 emplacements
    for (const a of ACTIONS) { const b = this.bindings[a.id]; if (!Array.isArray(b) || b.length !== 2) this.bindings[a.id] = [...a.def]; }
    // MIGRATION DOUCE de la manette. Un bloc absent a déjà été rempli par deepMerge ; ici on répare ce qui serait
    // abîmé (emplacement manquant, code clavier égaré côté manette, réglage hors bornes) sans toucher au reste.
    // LE STYLE D'IMAGE « PHOTO » PAR DÉFAUT (06/10/2026, demande de Haythem : « ça rend mieux »). « Vif » l'était depuis
    // la v6.6, et la sauvegarde garde TOUTES les valeurs : chez presque tout le monde, `look: 'vif'` n'est donc pas un
    // choix mais l'ancien défaut. Une sauvegarde d'avant ce changement (sans `lookDefaut: 2`) repasse une fois en Photo ;
    // ensuite, Vif choisi dans les Options reste Vif (la marque est enregistrée avec lui).
    const G = this.graphics;
    if (!(brut && brut.graphics && brut.graphics.lookDefaut === 2) && G.look === 'vif') G.look = 'photo';
    G.lookDefaut = 2;
    const pad = this.controls.pad;
    if (!pad.bindings || typeof pad.bindings !== 'object') pad.bindings = defaultPadBindings();
    for (const a of ACTIONS) {
      const b = pad.bindings[a.id];
      if (!Array.isArray(b) || b.length !== 2 || !b.every(estCodePad)) pad.bindings[a.id] = a.pad ? [...a.pad] : [null, null];
    }
    const borne = (v, lo, hi, d) => (v !== null && v !== '' && Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : d);
    pad.deadzone = borne(pad.deadzone, 0.03, 0.5, 0.15);
    pad.sens = borne(pad.sens, 0.2, 3, 1);
    pad.invertY = !!pad.invertY; pad.vibrations = pad.vibrations !== false;
    // COMMANDES TACTILES : bornes, et les places des boutons déplacés (deepMerge les a perdues : leur valeur par défaut
    // est un objet vide). Une place abîmée est oubliée : le bouton revient à sa place par défaut.
    const T = this.controls.tactile;
    T.taille = borne(T.taille, 0.75, 1.35, 1); T.opacite = borne(T.opacite, 0.25, 1, 0.8);
    T.stick = T.stick === 'fixe' ? 'fixe' : 'flottant'; T.vibrations = T.vibrations !== false;
    const pl = brut && brut.controls && brut.controls.tactile && brut.controls.tactile.places;
    T.places = {};
    if (pl && typeof pl === 'object') {
      for (const id of Object.keys(pl)) {
        const p = pl[id];
        if (p && /^[bt][lr]$/.test(p.c) && Number.isFinite(p.x) && Number.isFinite(p.y)) T.places[id] = { c: p.c, x: p.x, y: p.y };
      }
    }
  }
  // « Réinitialiser » de la disposition tactile : tailles, opacité, joystick et places d'origine (le reste des commandes,
  // touches comprises, ne bouge pas)
  resetTactile() { this.data.controls.tactile = clone(DEFAULTS.controls.tactile); this.save(); }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* stockage indisponible (navigation privée...) */ } this._emit(); }
  reset(section = null) {
    if (section) this.data[section] = clone(DEFAULTS[section]); else this.data = clone(DEFAULTS);
    this.save();
  }
  resetBindings() { this.data.controls.bindings = defaultBindings(); this.save(); }
  // set('graphics.scale', 0.8)
  set(path, value) {
    const ks = path.split('.'); let o = this.data;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = value; this.save();
  }
  get(path) { return path.split('.').reduce((o, k) => (o ? o[k] : undefined), this.data); }
  // touche `code` sur l'action `id`, emplacement `slot` (0/1) ; retire ce code partout ailleurs (pas de doublon)
  bind(id, slot, code) {
    for (const a of ACTIONS) for (let s = 0; s < 2; s++) if (this.bindings[a.id][s] === code && !(a.id === id && s === slot)) this.bindings[a.id][s] = null;
    this.bindings[id][slot] = code; this.save();
  }
  unbind(id, slot) { this.bindings[id][slot] = null; this.save(); }
  // Même chose côté manette : un bouton ne sert qu'à une action, il est retiré de celle qui l'avait.
  get padBindings() { return this.data.controls.pad.bindings; }
  bindPad(id, slot, code) {
    const pb = this.padBindings;
    for (const a of ACTIONS) for (let s = 0; s < 2; s++) if (pb[a.id][s] === code && !(a.id === id && s === slot)) pb[a.id][s] = null;
    pb[id][slot] = code; this.save();
  }
  unbindPad(id, slot) { this.padBindings[id][slot] = null; this.save(); }
  onChange(fn) { this._subs.add(fn); return () => this._subs.delete(fn); }
  _emit() { for (const fn of this._subs) { try { fn(this); } catch (e) { console.error(e); } } }
}

export const settings = new Settings();

// LE PARC DE BÉCON EN ENTIER (décision D8 de la conception du chantier « parc complet ») : le relief, puis les
// allées, les terrasses et les zones du parc, tout autour du plateau, pour les terrains `parc` et `parc2` (les autres
// terrains ne sont jamais concernés). Chantier terminé le 02/10/2026 : il est LEVÉ PAR DÉFAUT SUR ORDINATEUR. Au
// téléphone (APK comprise), il reste baissé par défaut — ses budgets ne sont mesurés qu'en émulation : le parc garde
// alors le décor du plateau seul, comme avant. Réglage `game.parcMode` (Options > Graphismes > Parc de Bécon) :
// 'auto' (ce qui précède), 'entier' ou 'plateau'. L'adresse a le dernier mot : `?parc=entier` ou `?parc=plateau`.
// (L'ancien interrupteur `game.parcEntier` levé à la main le lève toujours.)
// Lu UNE fois, au chargement : changer ce réglage recharge la page (js/ui.js).
// (06/10/2026 : la détection du téléphone est celle de tout le jeu, js/appareil.js — `?tel=1` compris)
export { TELEPHONE };
// LE TERRAIN DE TEST « LA CAGE · SCAN 3D » N'EST PAS PROPOSÉ AU TÉLÉPHONE (recette du 02/10/2026) : c'est le plus
// lourd de tous (≈ 330 Mo de textures estimés, 1 M de triangles, 644 appels de dessin mesurés en émulation), de quoi
// faire perdre son contexte WebGL à un Android d'entrée de gamme. Un téléphone qui l'a déjà choisi le garde dans la
// liste : sans lui, l'écran TERRAIN ne montrerait plus le terrain actuel. (TERRAINS n'est lu que par cet écran.)
if (TELEPHONE && settings.game.terrain !== 'becon_scan') {
  const i = TERRAINS.findIndex((t) => t.id === 'becon_scan');
  if (i >= 0) TERRAINS.splice(i, 1);
}
export const PARC_ENTIER = (() => {
  let q = null;
  try { q = new URLSearchParams(location.search).get('parc'); } catch (e) { /* hors navigateur (outils) */ }
  if (q === 'entier') return true;
  if (q === 'plateau') return false;
  if (settings.game.parcEntier) return true;
  const mode = settings.game.parcMode || 'auto';
  return mode === 'entier' || (mode === 'auto' && !TELEPHONE);
})();

// ---------- libellés des touches ----------
// navigator.keyboard.getLayoutMap() (Chrome/Edge) donne la vraie légende de la touche (Z sur AZERTY pour KeyW) ;
// sinon on suppose un clavier AZERTY (clavier français le plus courant).
const AZERTY = { KeyA: 'Q', KeyQ: 'A', KeyW: 'Z', KeyZ: 'W', KeyM: ',', Semicolon: 'M' };
const NAMED = {
  Space: 'ESPACE', ShiftLeft: 'MAJ G', ShiftRight: 'MAJ D', ControlLeft: 'CTRL G', ControlRight: 'CTRL D', AltLeft: 'ALT', AltRight: 'ALT GR',
  Tab: 'TAB', Escape: 'ÉCHAP', Enter: 'ENTRÉE', NumpadEnter: 'ENTRÉE PAVÉ', Backspace: 'RETOUR', Delete: 'SUPPR', Insert: 'INSER',
  CapsLock: 'VERR MAJ', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Home: 'DÉBUT', End: 'FIN', PageUp: 'PAGE ↑', PageDown: 'PAGE ↓',
  Backquote: '²', Minus: ')', Equal: '=', BracketLeft: '^', BracketRight: '$', Backslash: '*', Quote: 'ù', Comma: ';', Period: ':', Slash: '!', IntlBackslash: '<',
  NumpadAdd: 'PAVÉ +', NumpadSubtract: 'PAVÉ -', NumpadMultiply: 'PAVÉ *', NumpadDivide: 'PAVÉ /', NumpadDecimal: 'PAVÉ .', ContextMenu: 'MENU',
};
let layoutMap = null;
if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
  navigator.keyboard.getLayoutMap().then((m) => { layoutMap = m; document.dispatchEvent(new Event('hoops-keylayout')); }).catch(() => {});
}
export function keyLabel(code) {
  if (!code) return '—';
  if (NAMED[code]) return NAMED[code];
  if (layoutMap && layoutMap.has(code)) { const k = layoutMap.get(code); if (k && k.trim()) return k.length === 1 ? k.toUpperCase() : k.toUpperCase(); }
  if (AZERTY[code]) return AZERTY[code];
  let m;
  if ((m = /^Key([A-Z])$/.exec(code))) return m[1];
  if ((m = /^Digit(\d)$/.exec(code))) return m[1];
  if ((m = /^Numpad(\d)$/.exec(code))) return 'PAVÉ ' + m[1];
  if ((m = /^F(\d+)$/.exec(code))) return 'F' + m[1];
  return code.toUpperCase();
}
// libellé court d'une action (première touche affectée), pour le HUD. Quand la DERNIÈRE entrée utilisée est
// la manette, c'est son bouton qu'on nomme : toutes les aides du jeu passent par ici, elles basculent donc
// d'elles-mêmes entre « ESPACE » et « X » (ou « CARRÉ » sur une manette PlayStation), et reviennent au clavier.
// Au DOIGT, c'est le bouton à l'écran (js/touch.js pose `entree.tactile`) : « VÉLO : monter sur le vélo », pas « E : ».
export function actionKey(id) {
  if (entree.manette) return padActionLabel(id);
  const t = entree.tactile && entree.tactile(id);
  if (t) return t;
  const b = settings.bindings[id]; return keyLabel(b[0] || b[1]);
}

// ---------- MANETTE : codes et libellés ----------
// Codes virtuels « Pad:NOM ». NOM suit la disposition « standard » de l'API Gamepad, c'est-à-dire la POSITION du
// bouton (comme e.code pour le clavier) : « A » est toujours le bouton du bas, même sur une manette PlayStation
// où il est dessiné comme une croix. L'index dans PAD_BOUTONS est le numéro du bouton dans gamepad.buttons.
export const PAD_BOUTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L3', 'R3', 'Up', 'Down', 'Left', 'Right', 'Home'];
// + les quatre « coups » du stick droit (pro stick, en match)
export const PAD_STICK = ['RSLeft', 'RSRight', 'RSUp', 'RSDown'];

// La dernière entrée utilisée (clavier / souris / doigt, ou manette) et la famille de la manette reconnue.
// Tenue ici plutôt que dans js/manette.js : actionKey en a besoin, et settings.js ne doit dépendre de personne.
// `tactile` : (action) -> nom du bouton à l'écran, ou null (js/touch.js, seulement sur écran tactile).
export const entree = { manette: false, type: 'generique', tactile: null };

// Ce qui est ÉCRIT sur les boutons, par famille. Nintendo inverse A/B et X/Y par rapport à Xbox (son bouton du
// bas s'appelle B) ; PlayStation dessine des symboles, qu'on dit en toutes lettres dans les textes du HUD.
const PAD_NOMS = {
  xbox:        { A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', Back: 'VUE', Start: 'MENU', Home: 'XBOX' },
  playstation: { A: 'CROIX', B: 'ROND', X: 'CARRÉ', Y: 'TRIANGLE', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', Back: 'CRÉER', Start: 'OPTIONS', Home: 'PS' },
  nintendo:    { A: 'B', B: 'A', X: 'Y', Y: 'X', LB: 'L', RB: 'R', LT: 'ZL', RT: 'ZR', Back: '−', Start: '+', Home: 'HOME' },
  generique:   { A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', Back: 'SELECT', Start: 'START', Home: 'HOME' },
};
const PAD_COMMUNS = { L3: 'L3', R3: 'R3', Up: 'CROIX ↑', Down: 'CROIX ↓', Left: 'CROIX ←', Right: 'CROIX →',
  RSLeft: 'STICK D ←', RSRight: 'STICK D →', RSUp: 'STICK D ↑', RSDown: 'STICK D ↓' };
// La croix directionnelle s'appelle « croix » partout… sauf chez PlayStation, qui a déjà un bouton CROIX.
const PAD_FLECHES_PS = { Up: 'FLÈCHE ↑', Down: 'FLÈCHE ↓', Left: 'FLÈCHE ←', Right: 'FLÈCHE →' };
// symboles dessinés (pastilles HTML) et couleur du vrai bouton
const PAD_SYMB = { playstation: { A: '✕', B: '○', X: '□', Y: '△' } };
const PAD_COUL = {
  xbox: { A: 'vert', B: 'rouge', X: 'bleu', Y: 'jaune' },
  generique: { A: 'vert', B: 'rouge', X: 'bleu', Y: 'jaune' },
  playstation: { A: 'bleu', B: 'rouge', X: 'rose', Y: 'vert' },
};

// libellé TEXTE d'un code manette (HUD, bandeaux d'aide : du texte brut, pas de HTML)
export function padLabel(code, type = entree.type) {
  if (!code) return '—';
  const n = code.slice(4);
  if (type === 'playstation' && PAD_FLECHES_PS[n]) return PAD_FLECHES_PS[n];
  return (PAD_NOMS[type] || PAD_NOMS.generique)[n] || PAD_COMMUNS[n] || n.toUpperCase();
}
// pastille HTML (options, aide) : la lettre ou le symbole, à la couleur du vrai bouton
export function padGlyph(code, type = entree.type) {
  if (!code) return '<span class="pad-g vide">—</span>';
  const n = code.slice(4), symb = (PAD_SYMB[type] || {})[n], coul = (PAD_COUL[type] || {})[n];
  const txt = padLabel(code, type);
  // les coups de stick droit ont aussi une forme courte (« D→ »), que css/style.css montre sur les écrans étroits
  const m = /^STICK D (.)$/.exec(txt);
  const corps = symb || (m ? `<span class="pg-long">${txt}</span><span class="pg-court">D${m[1]}</span>` : txt);
  return `<span class="pad-g${symb || txt.length === 1 ? ' rond' : ''}${coul ? ' c-' + coul : ''}" title="${txt}">${corps}</span>`;
}
// libellé manette d'une action : le stick gauche pour le déplacement, sinon le premier bouton affecté
export function padActionLabel(id, type = entree.type) {
  const a = ACTIONS.find((x) => x.id === id);
  if (a && a.stick) return `STICK G ${a.stick}`;
  const b = settings.padBindings[id] || [];
  return padLabel(b[0] || b[1], type);
}
// les DEUX boutons d'une action, fusionnés quand ils ne diffèrent que par la flèche (« STICK D ← → » pour la feinte)
export function padActionLabels(id, type = entree.type) {
  const b = (settings.padBindings[id] || []).filter(Boolean).map((c) => padLabel(c, type));
  if (b.length < 2) return padActionLabel(id, type);
  const m1 = /^(.*) (\S)$/.exec(b[0]), m2 = /^(.*) (\S)$/.exec(b[1]);
  return m1 && m2 && m1[1] === m2[1] ? `${m1[1]} ${m1[2]} ${m2[2]}` : b.join(' / ');
}
