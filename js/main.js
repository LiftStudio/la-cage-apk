import { ROSTER } from './roster.js';
import { Game } from './game.js';
import { AudioFX } from './audio.js';
import { buildMenu, buildMatchSetup, buildOptions, buildShop, buildOnline, buildVoeux } from './ui.js';
import { Phone } from './phone.js';
import { settings } from './settings.js';
import { appliquerTerrain } from './config.js';
import { HOOP_VEC } from './util.js';
import { IS_TOUCH, VRAI_TACTILE, TouchControls, pleinEcran } from './touch.js';
import { Matchs } from './enligne.js';
import { creerBlocMatchs, construireHub } from './matchs_ui.js';
import { prechargerModele } from './player.js';
import { preparerMenu } from './demarrage.js';

// L'ÉCRAN DE CHARGEMENT (js/chargement.js) : les modules sont là ; on attend les fichiers lourds qu'il télécharge (les
// chargeurs du jeu les trouveront dans le cache), puis on construit le terrain sous sa barre. Le libellé est peint
// avant la construction, qui tient le fil principal plusieurs secondes d'un bloc.
const ch = window.__chargement || null;
if (ch) {
  await ch.fichiers();
  ch.etape('terrain');
  await ch.souffle();
}

// Les cotes du terrain dependent du lieu (Jemmapes est nettement plus petit) : on les applique AVANT de
// construire quoi que ce soit, sinon la moitie du jeu travaillerait encore sur les anciennes valeurs.
appliquerTerrain(settings.game.terrain || 'becon', HOOP_VEC);

const audio = new AudioFX();
audio.setVolumes(settings.audio);
// écran tactile : la classe d'abord, avant le jeu — la roue des emotes, construite avec lui, s'y règle déjà
if (IS_TOUCH) document.body.classList.add('touch');

// une seule partie pour toute la session : le terrain 3D est déjà là derrière le menu
let game = null;

// panneau d'options (menu principal et pause) : les réglages s'appliquent en direct
const options = buildOptions(settings, {
  onOpen: () => { if (game) game.input.blocked = true; },
  onClose: () => { if (game) game.input.blocked = false; },
  // Commandes > DÉPLACER LES BOUTONS : la fiche s'efface le temps de placer les boutons sur l'écran, puis revient
  // (pas à la manette : elle masque les commandes tactiles, js/touch.js peutEditer — la fiche reste ouverte)
  onDisposition: () => { const t = window.__touch; if (!t || !t.peutEditer()) return; options.close(); t.editer(() => options.open('controls')); },
});
// choix du match : ouvert par le cercle bleu de la balade (ou le bouton en haut à droite / la pause)
const setup = buildMatchSetup(ROSTER, settings, {
  captain: () => (game && game.captain ? game.captain.baseDef : null),
  // en ligne : TOUS les joueurs de notre terrain sont proposés, pas seulement ceux du cercle (Presence.disponibles)
  dispo: () => (game && game.online ? game.joueursDispo() : []),
  onOpen: () => { if (game) { game.input.blocked = true; game.setupOpen = true; if (document.pointerLockElement) document.exitPointerLock?.(); } },
  onClose: () => { if (game) { game.input.blocked = false; game.setupOpen = false; } },
  // avec des joueurs en ligne dans le cercle, c'est un vrai match à plusieurs (js/enligne.js)
  onStart: (opts) => { audio.init(); if (opts.enLigne && game.online) game.lancerEnLigne(opts); else game.startMatch(opts); },
  // en ligne : les matchs en cours, à rejoindre ou regarder, et PARTIE RAPIDE (js/matchs_ui.js)
  blocMatchs: (parent, avant) => creerBlocMatchs(parent, avant, () => game, {
    rejoindre: (mid) => { setup.close(); game.matchs.rejoindre(mid); },
    regarder: (mid) => { setup.close(); game.matchs.regarder(mid); },
    rapide: () => { setup.close(); audio.init(); game.matchs.rapide(() => setup.optsRapides(3)); },
  }),
});
// Le mode en ligne n'est pas un écran de salon : c'est LE TERRAIN. On donne son pseudo, on entre, et on se
// promène avec les autres connectés. Le match se lance en entrant ensemble dans le cercle bleu.
const online = buildOnline(ROSTER, {
  onPos: (m) => { if (game) game.presence.onPos(m); },      // présence des autres joueurs sur le terrain
  // match en ligne : lancement depuis le cercle, commandes des invités, images de l'hôte
  onMatch: (m, from) => { if (game) { audio.init(); game.recevoirMatch(m, from); } },
  onInput: (m) => { if (game) game.recevoirInput(m); },
  onState: (m) => { if (game) game.recevoirEtat(m); },
  // matchs en cours : annonces, demandes pour rejoindre ou regarder (js/enligne.js, Matchs)
  onMode: (m) => { if (game && game.matchs) game.matchs.courrier(m); },
  // quelqu'un quitte le salon : son avatar quitte le hub tout de suite, sa place de match revient à l'ordinateur
  onLeave: (id) => {
    if (!game) return;
    game.presence.retirerJoueur(id);
    if (game.reseau) game.reseau.depart(id);
    if (game.matchs) game.matchs.depart(id);
  },
  // Une reconnexion cree une NOUVELLE Room sur un NOUVEAU transport, et ferme l'ancien. Sans ce rappel, le
  // jeu continuait d'emettre sa position sur le transport ferme : il voyait tout le monde, personne ne le
  // voyait. L'asymetrie est trompeuse — on se croit en ligne.
  onRoom: (room) => { if (game && game.online) game.setOnline(room); },
  // L'etat du reseau doit se lire SUR LE TERRAIN : le panneau qui l'affichait est cache des qu'on y entre.
  onNet: () => { if (game && game.online && game.mode === 'lobby') game.hud.hint(game.lobbyHint()); },
  onSalon: (m) => { if (phone && game && game.online) phone.push(m.name, m.txt, false); },
  onEnter: (room, demo) => {
    audio.init();
    if (!game.captain) game.showPreview(ROSTER[0]);          // pas encore de perso choisi : celui par défaut
    game.enterLobby();
    game.setOnline(room);
    game.setDemo(demo ? 3 : 0);
    menu.hide();
  },
});
// Vœux : les personnages se débloquent en tirant. En ligne, on ne peut jouer que ceux qu'on possède.
let voeux = null;
const menu = buildMenu(ROSTER, settings, {
  onVoeux: () => voeux && voeux.render(),
  locked: (def) => !!(game && game.online && game.wallet && !game.wallet.aPerso(def.id)),
  onPreview: (def) => { if (game) game.showPreview(def); },
  onHome: () => { if (game && game.mode !== 'menu') game.enterMenu(); },
  onEnter: (def) => { audio.init(); if (game.mode !== 'select' || !game.captain || game.captain.baseDef !== def) game.showPreview(def); game.enterLobby(); menu.hide(); },
  onOptions: () => options.open(),
});

let shop = null;
game = new Game(audio, {
  onMenu: () => { game.setOnline(null); online.quit(); game.enterMenu(); menu.show('home'); },
  onChangePlayer: () => { game.enterMenu(); menu.show('select'); },
  onOptions: () => options.open(),
  onSetup: (avec) => { if (game.mode === 'lobby' && !game.paused) setup.open(avec); },
  // touche « parler » près du marchand, ou entrée de pause sur un terrain qui n'a pas de marchand
  onShop: () => { if (game.mode === 'lobby' && shop) shop.open(); },
  onPhone: () => { if (!game.paused && phone) phone.toggle(); },                        // touche téléphone
  onSay: (txt) => online.say(txt),                    // en ligne, le téléphone parle au salon
  onChat: (kind) => phone && phone.event(kind),                                         // le groupe réagit aux matchs et aux dunks
  onTick: (dt) => phone && phone.update(dt),                                            // messages du groupe qui arrivent en différé
  onNear: () => { window.__touch?.refresh(); },                                          // bouton tactile PARLER
  // un match en ligne part : on ferme ce qui était ouvert par-dessus le terrain
  onMatchEnLigne: () => { if (setup.isOpen) setup.close(); if (shop && shop.isOpen) shop.close(); if (phone && phone.open) phone.hide(); },
}, settings);
// LES MATCHS EN COURS (js/enligne.js) : la liste annoncée par les hôtes, et le bouton du hub qui l'ouvre (js/matchs_ui.js)
game.matchs = new Matchs(game);
game.presence.jeu = game;          // l'heure exacte de chaque pas de simulation, pour lire les tampons (js/net.js, heurePas)
game.matchs.surChange = () => setup.rafraichirMatchs();
construireHub(game, {
  rejoindre: (mid) => game.matchs.rejoindre(mid),
  regarder: (mid) => game.matchs.regarder(mid),
  rapide: () => { audio.init(); game.matchs.rapide(() => setup.optsRapides(3)); },
});
// boutique du marchand (balade) : nourriture = boosts pour le prochain match, ballons, tenues
// téléphone : groupe de messages « LA CAGE » (comme GTA), ouvert en balade ou en match
// Ouvrir le téléphone, c'est aussi le SORTIR dans le jeu : le joueur le regarde, et tape dessus quand on écrit.
const telJoueur = () => (game && (game.mode === 'lobby' || game.mode === 'match') ? game.user : null);
const phone = new Phone(ROSTER, {
  onOpen: () => { game.input.blocked = true; if (document.pointerLockElement) document.exitPointerLock?.(); telJoueur()?.sortirTel(); },
  onClose: () => { game.input.blocked = false; telJoueur()?.rangerTel(); },
  onType: () => telJoueur()?.taperTel(0.7),
  online: () => !!(game && game.online),                 // connecté au salon : le téléphone parle aux vrais joueurs
  onSay: (txt) => online.say(txt),
  jeu: () => game,                                       // l'appli Plan (js/plan_parc.js) : le joueur, ses amis, « Y aller »
});
window.__phone = phone;

shop = buildShop(game.wallet, {
  baseDef: () => (game.captain ? game.captain.baseDef : null),
  onOpen: () => { game.input.blocked = true; game.setupOpen = true; if (document.pointerLockElement) document.exitPointerLock?.(); },
  onClose: () => { game.input.blocked = false; game.setupOpen = false; game.hud.hint(game.lobbyHint()); },
  onChange: () => { game.applyShop(); phone.event('shop'); },
});
settings.onChange(() => { audio.setVolumes(settings.audio); game.applySettings(); menu.refresh(); });
// (avec l'écran de chargement, la boucle ne démarre qu'une fois les effets compilés : voir js/demarrage.js)
if (!ch) game.start();
menu.show('home');
// écran tactile : joystick + boutons, rafraîchis à chaque changement de mode
// plein écran au premier appui : sans ça, la barre d'état et la barre de navigation restent par-dessus le jeu (pas sur
// un PC sous ?tel=1, qui montre les commandes tactiles sans être un téléphone)
const plein = IS_TOUCH && VRAI_TACTILE ? pleinEcran() : null;

if (IS_TOUCH) {
  const touch = new TouchControls(game);
  const modes = ['enterMenu', 'showPreview', 'enterLobby', 'startMatch'];
  for (const m of modes) { const f = game[m].bind(game); game[m] = (...a) => { const r = f(...a); touch.refresh(); return r; }; }
  window.__touch = touch;
}
// PWA : hors ligne après la première visite (pas en file:// ni dans l'appli Android, inutile)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const enregistrer = () => navigator.serviceWorker.register('./sw.js').catch((e) => console.info('[pwa] pas de service worker :', e.message));
  // (au parc, des modules attendent leurs images cuites et les données du monde au premier niveau : la page a souvent
  // fini de charger quand on arrive ici, et l'événement « load », déjà passé, n'enregistrait plus jamais rien)
  if (document.readyState === 'complete') enregistrer(); else window.addEventListener('load', enregistrer);
}
// LA VERSION AU PIED DE L'ACCUEIL (recette du 02/10/2026). Le « v1.7 » écrit en dur dans index.html n'avait plus bougé
// depuis des mois. Le seul numéro tenu à jour à chaque livraison, et donc à chaque APK, est celui du service worker
// (sw.js : VERSION = 'lacage-vX.Y') : on le lit dans le fichier, ou, hors ligne, dans le nom du cache qu'il a installé.
// Sans réponse (file://, rien en cache), le pied garde « LA CAGE » sans numéro plutôt qu'un numéro faux.
(async () => {
  const el = document.getElementById('menu-version');
  if (!el) return;
  let v = null;
  // (on vise la déclaration elle-même, pas la première mention de « lacage-v » : un commentaire de sw.js qui citerait
  // une ancienne version ne doit pas la faire afficher)
  try { v = /VERSION\s*=\s*['"]lacage-v([\d.]+)['"]/.exec(await (await fetch('./sw.js', { cache: 'no-cache' })).text())?.[1] || null; } catch (e) { /* hors ligne */ }
  if (!v) try { v = (await caches.keys()).map((k) => /^lacage-v([\d.]+)$/.exec(k)?.[1]).find(Boolean) || null; } catch (e) { /* pas de cache */ }
  if (v) el.textContent = `LA CAGE v${v}`;
})();
// MANETTE (js/manette.js). Quand on passe du clavier à la manette ou l'inverse, les aides à l'écran changent de
// langue : bandeau des commandes, indication de balade, page d'aide. Les indications ponctuelles (marchand,
// gradins, vélo, cercle bleu) se réécrivent déjà à chaque image : on ne les écrase pas.
document.addEventListener('hoops-entree', () => {
  if (game.mode === 'lobby' || game.mode === 'match') {
    game.hud.setLobby(game.mode === 'lobby', game.teamSize);
    if (game.mode === 'lobby' && !game.nearMerchant && !(game.triggerT > 0) && !game.training.active && !game._presBanc && !game._presVelo) game.hud.hint(game.lobbyHint());
  }
  menu.refresh();
});
// branchée / débranchée : l'onglet Commandes des options montre l'état et les bons boutons
document.addEventListener('hoops-manette', () => options.rafraichir());

voeux = buildVoeux(ROSTER, game.wallet, { onChange: () => game.applyShop() });
window.__game = game; window.__settings = settings; window.__online = online; window.__voeux = voeux; // accès console
// Outils de vérification du monde (__tp, __pv, __perf, __ortho, __drapeaux, __sol : js/debug_monde.js), chargés
// SEULEMENT avec ?debug=1 dans l'adresse : le jeu livré ne les télécharge même pas.
if (new URLSearchParams(location.search).get('debug') === '1') {
  import('./debug_monde.js').then((m) => m.installerDebug(game)).catch((e) => console.warn('[debug] outils du monde indisponibles :', e));
}

// LE RIDEAU (js/chargement.js, js/demarrage.js) : joueurs et animations (le marchand, ses clips, le joueur choisi au
// menu), effets compilés en parallèle, première image — puis « TOUCHE L'ÉCRAN POUR COMMENCER ». Ce geste allume le son
// et passe en plein écran au téléphone (les deux exigent un geste). Une étape qui échoue n'arrête rien : on lève le
// rideau quand même.
const _boot = document.getElementById('boot');
if (ch && _boot) {
  const choisi = menu.player;
  preparerMenu(game, ch, { avatar: prechargerModele(choisi && choisi.model) })
    .catch((e) => console.warn('[chargement] préparation du menu :', e))
    .then(() => {
      if (!game._raf) game.start();
      return ch.pret(() => { audio.init(); plein?.demande(); });
    });
} else {
  if (!game._raf) game.start();
  // Sans écran de chargement (js/chargement.js absent) : on le retire APRES la premiere image peinte, pas avant
  // (sinon un eclair blanc entre sa disparition et le premier rendu). Le delai de secours n'est pas une precaution
  // de style : sans lui, un chargement qui echoue laisserait le joueur devant un ecran fixe.
  const partir = () => _boot?.remove();
  requestAnimationFrame(() => requestAnimationFrame(partir));
  setTimeout(partir, 20000);
}
