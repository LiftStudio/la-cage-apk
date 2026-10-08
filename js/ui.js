import { ACTIONS, QUALITIES, SHADOWS, WEATHERS_OPT, TERRAINS, keyLabel, actionKey, entree, padLabel, padGlyph, padActionLabels, PARC_ENTIER } from './settings.js';
import { capturerBouton, annulerCapture, infoManette } from './manette.js';
import { FOODS, SKINS, bonusText, UP_STATS, UP_MAX, upCost, GLISSE } from './shop.js';
import { EMOTES, EMOTE_SLOTS, EMOTE_CATS } from './emotes.js';
import { BADGES, BADGE_CATS, BADGE_MAX, TIERS, TIER_COLOR, badgeCost, badgeList } from './badges.js';
import { Identity, Room, LocalTransport, SocketTransport, trouverServeur, retenirServeur, surReseauLocal, dansLApplication, normaliserAdresse, chercherSurLeWifi } from './net.js';
import { portrait, portraitCache, prechauffer } from './portraits.js';
import { RARETES, ORDRE, RARETE_PERSO, rarete, etoiles, collection, voeu, voeuX10, tauxReels, COUT_1, COUT_10, PRIX_JETON,
  GARANTIE_EPIQUE, GARANTIE_LEGENDAIRE } from './gacha.js';
import { silhouette } from './fit.js';   // vignette de tenue dans la boutique
import { prechargerModele } from './player.js';   // avatars des équipes chargés dès le panneau du match
import { IS_TOUCH } from './touch.js';            // Options > Commandes : le bloc COMMANDES TACTILES

const MODES = [
  { size: 1, name: 'DUEL',       desc: 'Le classique du playground : un contre un, terrain entier.' },
  { size: 2, name: 'DUO',        desc: 'Un coéquipier : passes, coupes vers le cercle, jeu à deux.' },
  { size: 3, name: 'TRIO',       desc: 'Le vrai streetball : trois contre trois, écartement et démarquage.', tag: 'POPULAIRE' },
  { size: 4, name: 'ESCOUADE',   desc: 'Quatre contre quatre : le terrain se resserre, la défense s\'organise.' },
  { size: 5, name: 'FULL COURT', desc: 'Cinq contre cinq comme en NBA, avec changement de joueur.', tag: 'NOUVEAU' },
];
const MENU_KEY = 'hoops.menu.v2';
const MATCH_KEY = 'hoops.match.v1';
const $ = (id) => document.getElementById(id);
const load = (key, def) => { try { const raw = localStorage.getItem(key); return raw ? { ...def, ...JSON.parse(raw) } : def; } catch (e) { return def; } };
const store = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* ignore */ } };

// Le joueur choisi et les compositions d'équipe sont enregistrés sous forme d'INDEX dans le roster. Haris et Aiden ont
// été insérés au milieu du tableau (avec les autres avatars 3D) le 18/09/2026 : une sauvegarde d'avant désignerait donc
// d'autres joueurs. On retrouve les bons par leur identifiant, une seule fois, puis on estampille la sauvegarde.
const ROSTER_V1 = ['haythem', 'ethan', 'clovis', 'lamine', 'djafar', 'boateng', 'haddad', 'novak', 'dasilva'];
const inRange = (i, roster) => Number.isInteger(i) && i >= 0 && i < roster.length;
const fixIdx = (i, roster, old) => {
  if (old) { const j = roster.findIndex((p) => p.id === ROSTER_V1[i]); if (j >= 0) return j; }
  return inRange(i, roster) ? i : 0;
};
// SEULEMENT LES FICHES QUI ONT UN AVATAR 3D (30/09). Quatre fiches n'en ont pas (Boateng, Haddad, Novak, Da Silva :
// roster.js) et jouaient en « bonhomme » de primitives — torse en boîte, membres en cylindres, tête-boule —, à côté
// des avatars Avaturn, dans un décor photographique. Le remplissage par défaut ne les prenait jamais, mais le bouton
// Mélanger, le choix à la main et le choix du joueur de balade, si. On ne les propose donc plus nulle part ; leurs
// fiches restent dans roster.js (index sauvegardés, fiches en ligne) pour le jour où elles auront un corps.
const aUnAvatar = (p) => !!(p && p.model);
const fixSaved = (state, roster, keys) => {
  const old = state.rv !== 2, premier = Math.max(0, roster.findIndex(aUnAvatar));
  for (const k of keys) {
    const v = state[k];
    // Une sauvegarde qui désigne un bonhomme : le joueur de balade redevient le premier avatar ; dans une
    // composition d'équipe, la place devient invalide (-1), et le panneau du match refait les équipes à
    // l'ouverture (open : okTeam refuse l'index, fillTeams remplit).
    if (Array.isArray(v)) state[k] = v.map((i) => { const j = fixIdx(i, roster, old); return aUnAvatar(roster[j]) ? j : -1; });
    else { const j = fixIdx(v, roster, old); state[k] = aUnAvatar(roster[j]) ? j : premier; }
  }
  state.rv = 2;
  return state;
};
// Précharge les avatars d'une composition (js/player.js) : l'adversaire choisi est déjà en mémoire quand le
// match part, et il apparaît avec son corps dès le compte à rebours.
const prechargerEquipes = (roster, ...equipes) => {
  for (const eq of equipes) for (const i of eq || []) if (inRange(i, roster)) prechargerModele(roster[i].model);
};

// Capacites signature d'une fiche, en pastilles colorees (bronze / argent / or).
const badgeRow = (p) => {
  const l = badgeList(p.badges);
  if (!l.length) return '';
  return `<div class="badge-row">${l.map(({ badge, tier }) =>
    `<span class="badge-chip" style="--bc:${TIER_COLOR[tier]}" title="${badge.desc}">${badge.icon} ${badge.name} <b>${TIERS[tier]}</b></span>`).join('')}</div>`;
};
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stat = (label, v) => `<div class="stat">${label}<b>${v}</b><div class="bar"><i style="width:${v}%"></i></div></div>`;
function cardHtml(p) {
  return `<div class="card-head"><span class="num">#${p.number}</span><span class="pos">${p.pos}</span></div>
    <div class="card-name">${p.name}</div>
    <div class="card-meta">${p.height.toFixed(2)} m · ${p.style}${p.model ? ' · <b style="color:var(--good)">AVATAR 3D</b>' : ''}</div>
    <div class="stats">${stat('VIT', p.spd)}${stat('3PT', p.tp)}${stat('MID', p.mid)}${stat('INT', p.in)}${stat('DUNK', p.dnk)}${stat('DEF', p.def)}</div>`;
}
function renderRoster(el, roster, selectedIdx, onPick, usedSet = null, lockedIdx = null) {
  el.innerHTML = '';
  roster.forEach((p, i) => {
    if (!aUnAvatar(p)) return;                   // pas de bonhomme en primitives (voir aUnAvatar) ; l'index reste celui du roster
    const card = document.createElement('button');
    card.className = 'card' + (selectedIdx === i ? ' selected' : '') + (usedSet && usedSet.has(i) && selectedIdx !== i ? ' used' : '') + (lockedIdx === i ? ' locked' : '');
    card.style.setProperty('--c1', p.color1); card.style.setProperty('--c2', p.color2);
    card.innerHTML = cardHtml(p);
    card.onclick = () => onPick(i);
    el.appendChild(card);
  });
}

// ---------- Menu principal : accueil → choix du joueur (aperçu 3D sur le terrain) → balade libre ----------
export function buildMenu(roster, settings, cb) {
  const menu = $('menu');
  const state = fixSaved(load(MENU_KEY, { player: 0 }), roster, ['player']);
  let current = 'home';

  const go = (name) => {
    for (const s of menu.querySelectorAll('.menu-screen')) s.hidden = s.dataset.screen !== name;
    menu.dataset.screen = name; current = name;
    if (name === 'select') { renderSelect(); cb.onPreview?.(roster[state.player]); }
    if (name === 'voeux') cb.onVoeux?.();
    if (name === 'home') cb.onHome?.();
    if (name === 'help') renderHelp();
    if (name === 'terrain') renderTerrains();
    menu.scrollTop = 0;
    // Au téléphone (et sur tablette), ce sont les listes de l'écran qui défilent, entre l'en-tête et le bouton du bas
    // (css/style.css, « LES MENUS AU TÉLÉPHONE ») : elles repartent du haut, comme la page sur ordinateur. Le choix du
    // joueur, lui, ramène à l'écran le joueur déjà choisi s'il était plus bas dans la liste.
    const ecran = menu.querySelector(`.menu-screen[data-screen="${name}"]`);
    if (ecran) for (const el of ecran.querySelectorAll('.select-list, .help-grid, .terrain-list, .vx-left, .vx-collec, .online-left')) el.scrollTop = 0;
    if (name === 'select') {
      const list = $('select-list'), sel = list && list.querySelector('.pick.selected');
      if (sel) { const d = sel.getBoundingClientRect().bottom - list.getBoundingClientRect().bottom; if (d > 0) list.scrollTop += d + 6; }
    }
  };
  menu.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => { if (b.dataset.go === 'options') cb.onOptions?.(); else go(b.dataset.go); }; });
  window.addEventListener('keydown', (e) => {
    if (menu.hidden || e.code !== 'Escape') return;
    if (!$('options').hidden) return;
    if (current !== 'home') go('home');
  });

  // ----- choix du terrain -----
  // Un changement de terrain veut dire reconstruire toute la scène 3D : les décors n'ont ni les mêmes
  // matériaux, ni les mêmes modèles chargés, ni le même ciel. Plutôt que de démonter la scène à chaud —
  // mille geometries et une dizaine de modèles glTF à libérer, avec le risque d'en oublier — on enregistre
  // le choix et on recharge la page. Tout est dans localStorage, donc rien n'est perdu.
  function renderTerrains() {
    const list = $('terrain-list');
    if (!list) return;
    const actuel = settings.game.terrain || 'becon';
    list.innerHTML = '';
    for (const t of TERRAINS) {
      const b = document.createElement('button');
      b.className = 'terrain-card' + (t.id === actuel ? ' selected' : '');
      b.style.setProperty('--c1', t.c1); b.style.setProperty('--c2', t.c2);
      b.innerHTML = `<div class="tc-vis"></div>
        <div class="tc-txt">
          <div class="tc-nom">${t.nom}</div>
          <div class="tc-lieu">${t.lieu}</div>
          <p class="tc-desc">${t.desc}</p>
        </div>
        <div class="tc-etat">${t.id === actuel ? 'TERRAIN ACTUEL' : 'JOUER ICI'}</div>`;
      b.onclick = () => {
        if (t.id === actuel) return;
        settings.set('game.terrain', t.id);
        b.querySelector('.tc-etat').textContent = 'CHARGEMENT…';
        // le réglage passe par settings.set, donc il est déjà écrit dans localStorage
        setTimeout(() => location.reload(), 120);
      };
      list.appendChild(b);
    }
  }

  // ----- choix du joueur -----
  let portraitsPrets = false;
  function renderSelect() {
    // même mécanique que dans les vœux : on rend les portraits une fois, puis on redessine
    if (!portraitsPrets) { portraitsPrets = true; prechauffer(roster, () => renderSelect()); }
    const list = $('select-list'); list.innerHTML = '';
    roster.forEach((p, i) => {
      if (!aUnAvatar(p)) return;                 // joueur de balade : seulement les avatars 3D (voir aUnAvatar)
      const b = document.createElement('button');
      b.className = 'pick' + (state.player === i ? ' selected' : '');
      b.style.setProperty('--c1', p.color1); b.style.setProperty('--c2', p.color2);
      const rr = rarete(RARETE_PERSO[p.id] || 'normal'), ferme = !!cb.locked?.(p);
      b.style.setProperty('--rar', rr.couleur);
      if (ferme) b.classList.add('pick-lock');
      const im = portraitCache(p.id);
      b.innerHTML = `<span class="pick-face">${im ? `<img src="${im}" alt="">` : `#${p.number}`}</span><span class="who"><b>${ferme ? '🔒 ' : ''}${p.name}</b>`
        + `<small>${p.pos} · ${p.height.toFixed(2)} m</small></span>`
        + `<span class="rar-st${rr.arc ? ' arc' : ''}">${etoiles(RARETE_PERSO[p.id] || 'normal')}</span>`;
      b.onclick = () => { state.player = i; store(MENU_KEY, state); renderSelect(); cb.onPreview?.(p); };
      list.appendChild(b);
    });
    const p = roster[state.player];
    const ferme = !!cb.locked?.(p);
    const verrou = ferme ? '<div class="si-lock">🔒 VERROUILLÉ EN LIGNE · débloque-le dans les VŒUX</div>' : '';
    const be = $('btn-enter');
    if (be) { be.textContent = ferme ? 'DÉBLOQUER DANS LES VŒUX' : 'ENTRER SUR LE TERRAIN'; be.classList.toggle('btn-secondary', ferme); }
    $('select-info').innerHTML = verrou + `<div class="si-name">${p.name}</div><div class="si-meta">#${p.number} · ${p.pos} · ${p.height.toFixed(2)} m</div><div class="si-style">${p.style}</div>
      <div class="stats big">${stat('VITESSE', p.spd)}${stat('DRIBBLE', p.hdl)}${stat('3 POINTS', p.tp)}${stat('MI-DISTANCE', p.mid)}${stat('INTÉRIEUR', p.in)}${stat('DUNK', p.dnk)}${stat('DÉFENSE', p.def)}${stat('REBOND', p.reb || 60)}</div>
      ${badgeRow(p)}
      ${p.model ? '<div class="si-avatar">AVATAR 3D · animations mocap</div>' : '<div class="si-avatar muted">Bonhomme animé (pas d\'avatar 3D)</div>'}`;
  }
  $('btn-enter').onclick = () => {
    const p = roster[state.player];
    // en ligne, on ne peut entrer qu'avec un personnage qu'on possède : c'est tout l'intérêt des vœux
    if (cb.locked?.(p)) { go('voeux'); cb.onVoeux?.(); return; }
    store(MENU_KEY, state); cb.onEnter?.(p);
  };

  // ----- aide -----
  function renderHelp() {
    const rows = [
      ['forward', 'Avancer'], ['back', 'Reculer'], ['left', 'Gauche'], ['right', 'Droite'], ['sprint', 'Sprint'],
      ['walk', 'Marcher : maintiens pour te déplacer au pas, avec une vraie foulée de marche. Au doigt (téléphone), il suffit de pousser le manche à moitié.'],
      ['shoot', 'Maintenir puis relâcher dans la zone verte = tir · près du panier = layup / dunk · en défense : vol (près du porteur) ou saut pour contrer'],
      ['pass', 'Passe au coéquipier dans la direction poussée (sinon le mieux démarqué)'],
      ['bump', 'Appui bref = COUP D’ÉPAULE : écarte l’adversaire qui est devant toi. Ça dépend du gabarit et du jeu intérieur des deux joueurs, ça coupe un tir en cours, ça peut faire lâcher la balle — et sur un gros écart de gabarit, ça le met par terre. Touche MAINTENUE, balle en main, avec un défenseur entre toi et le cercle = APPUI DOS AU PANIER : tu lui tournes le dos et tu gagnes ta place mètre par mètre ; au bout d’une seconde d’appui gagnant il tombe. Lâche pour te retourner et tirer. Coûte de l’endurance des deux côtés.'],
      ['spin', 'Spin move'], ['legs', 'Dribble entre les jambes'], ['behind', 'Dribble dans le dos (balle protégée)'], ['dribble', 'Dribble sur place (mouvement de dribble, maintenir pour continuer)'],
      ['switch', 'Changer de joueur (défense / balle libre)'], ['emote', 'Roue des emotes : maintenir + souris puis relâcher, ou touches 1 à 8, ou clic (danses, chambrage, applaudissements…)'], ['camera', 'Caméra TV / derrière le joueur'], ['pause', 'Pause'],
    ];
    // À la manette, l'aide montre ses boutons (pastilles aux couleurs de la vraie manette) et quelques textes
    // changent de geste : on ne « maintient pas + souris » avec un stick.
    const pad = entree.manette;
    const PAD_TXT = {
      walk: 'Marcher : pousse le stick gauche à moitié (à fond, tu cours), ou clique-le pour garder le pas.',
      emote: 'Roue des emotes : maintiens, vise un secteur avec le stick droit et relâche — ou choisis à la croix et valide.',
      camera: 'Caméra TV / derrière le joueur en match · vue 3e personne / épaule / 1re personne en balade',
    };
    const cle = (id) => {
      if (pad) {
        const a = ACTIONS.find((x) => x.id === id);
        if (a && a.stick) return `<span class="pad-g">STICK G ${a.stick}</span>`;
        return settings.padBindings[id].filter(Boolean).map((c) => padGlyph(c)).join('') || '<kbd>—</kbd>';
      }
      return settings.bindings[id].filter(Boolean).map((c) => `<kbd>${keyLabel(c)}</kbd>`).join('') || '<kbd>—</kbd>';
    };
    const P = (n) => padLabel('Pad:' + n);
    $('help-keys').innerHTML = rows.map(([id, txt]) => `<div class="k">${cle(id)}</div><div>${(pad && PAD_TXT[id]) || txt}</div>`).join('')
      + (pad
        ? `<div class="k"><span class="pad-g">STICK D</span></div><div>En balade : la caméra. En match, le « pro stick » : un coup vers la gauche ou la droite = feinte (crossover, hésitation), vers le bas = dans le dos, vers le haut = entre les jambes.</div>`
          + `<div class="k"><span class="pad-g">MENUS</span></div><div>Croix ou stick gauche pour te déplacer · ${P('A')} pour valider · ${P('B')} pour revenir · ${P('LB')} / ${P('RB')} pour changer d'onglet · stick droit pour faire défiler.</div>`
        : '<div class="k"><kbd>SOURIS</kbd></div><div>Caméra en balade libre (clique sur l\'écran pour la capturer) · le crossover se fait tout seul quand tu changes de côté</div>');
  }

  go('home');
  return {
    show(screen = 'home') { menu.hidden = false; go(screen); },
    hide() { menu.hidden = true; },
    refresh() { if (!menu.hidden && current === 'help') renderHelp(); },
    get player() { return roster[state.player]; },
  };
}

// ---------- Choix du match (ouvert depuis le cercle bleu de la balade) : mode, difficulté, score, équipes ----------
export function buildMatchSetup(roster, settings, cb) {
  const box = $('matchsetup');
  const state = fixSaved(load(MATCH_KEY, { size: 1, difficulty: 'normal', target: 11, half: false, names: ['BÉCON', 'VISITEURS'], teamA: [0], teamB: [1] }), roster, ['teamA', 'teamB']);
  // LE POSTE QU'ON CHOISIT EN PREMIER (`active`) : le coéquipier n° 2 en équipe, l'ADVERSAIRE en 1 contre 1 (le
  // poste 1 de l'équipe A est le capitaine, verrouillé). Recette finale (A4) : il partait de « équipe A, poste 2 » et
  // seul fillTeams le recalculait ; or open() garde la composition enregistrée quand elle est valide (dès le premier
  // match), donc sans fillTeams. En 1 contre 1, l'écran annonçait alors un « POSTE 2 » qui n'existe pas, et le
  // personnage cliqué partait dans TON équipe (teamA de longueur 2) au lieu de remplacer l'adversaire : le match se
  // jouait contre l'ancien adversaire, le choix était perdu.
  const posteDepart = () => (state.size > 1 ? { team: 'A', i: 1 } : { team: 'B', i: 0 });
  let step = 'mode', captainIdx = 0, active = posteDepart(), enLigne = [];
  // LES JOUEURS EN LIGNE PROPOSÉS (04/10/2026) : tous ceux qui sont sur notre terrain (cb.dispo, Presence.disponibles),
  // pas seulement ceux qui étaient dans le cercle au bon moment. `invites` = ceux qu'on emmène (tous, au départ) ;
  // un toucher sur leur nom les retire ou les remet.
  let dispo = [], invites = new Set();
  // MATCH EN LIGNE (relecture de la recette, B23) : les postes tenus par des JOUEURS (leur pseudo, par poste), qu'un clic
  // ne doit pas remplacer — sinon le joueur ne retrouvait plus sa place et le match partait hors ligne contre l'IA
  let humains = { A: new Map(), B: new Map() };
  // le premier poste qu'on peut choisir : un poste tenu par l'ordinateur ; aucun (null) si tous sont tenus par des joueurs
  const premierLibre = () => {
    for (const [team, list] of [['A', state.teamA], ['B', state.teamB]]) {
      for (let i = team === 'A' ? 1 : 0; i < list.length; i++) if (!humains[team].has(i)) return { team, i };
    }
    return null;
  };

  // (au téléphone et sur tablette, ce sont le corps de l'étape, les équipes et les fiches qui défilent, et non la fiche
  // entière : ils repartent du haut eux aussi)
  const showStep = (s) => {
    step = s; $('ms-mode').hidden = s !== 'mode'; $('ms-teams').hidden = s !== 'teams'; if (s === 'teams') renderTeams(); box.scrollTop = 0;
    for (const el of box.querySelectorAll('.ms-corps, .teams-layout, .teams-cols, .pick-col')) el.scrollTop = 0;
  };

  // modes
  const modesEl = $('modes'); modesEl.innerHTML = '';
  for (const m of MODES) {
    const b = document.createElement('button');
    b.className = 'mode-card'; b.dataset.big = `${m.size}v${m.size}`; b.dataset.size = m.size;
    b.innerHTML = `${m.tag ? `<span class="mode-tag">${m.tag}</span>` : ''}<div class="mode-size">${m.size}<span style="font-size:.55em;color:var(--muted)">v</span>${m.size}</div><div class="mode-name">${m.name}</div><div class="mode-desc">${m.desc}</div>`;
    // (04/10/2026) en ligne, les joueurs invités gardent leur place quand on change la taille du match : fillTeams les
    // effaçait des équipes, et ils restaient en balade pendant que le match partait sans eux
    b.onclick = () => { state.size = m.size; fillTeams(); if (enLigne.length) composerEnLigne(false); store(MATCH_KEY, state); syncMode(); };
    modesEl.appendChild(b);
  }
  for (const [id, key, parse] of [['difficulty', 'difficulty', (v) => v], ['target', 'target', (v) => parseInt(v, 10)], ['court', 'half', (v) => v === '1']]) {
    const seg = $(id);
    seg.querySelectorAll('button').forEach((b) => {
      b.onclick = () => { seg.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); state[key] = parse(b.dataset.v); store(MATCH_KEY, state); };
    });
  }
  $('name-a').oninput = (e) => { state.names[0] = e.target.value.toUpperCase().trim() || 'BÉCON'; store(MATCH_KEY, state); };
  $('name-b').oninput = (e) => { state.names[1] = e.target.value.toUpperCase().trim() || 'VISITEURS'; store(MATCH_KEY, state); };
  function syncMode() {
    modesEl.querySelectorAll('.mode-card').forEach((c) => c.classList.toggle('selected', parseInt(c.dataset.size, 10) === state.size));
    for (const [id, key] of [['difficulty', 'difficulty'], ['target', 'target']]) $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(b.dataset.v) === String(state[key])));
    $('court').querySelectorAll('button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === !!state.half));
    $('name-a').value = state.names[0]; $('name-b').value = state.names[1];
  }

  // équipes : ton joueur (balade) est toujours le capitaine (poste 1) ; le reste est rempli automatiquement
  // (le mélange aussi ne tire que parmi les avatars 3D : neuf fiches en plus du capitaine, juste de quoi faire un
  // 5 contre 5 sans doublon)
  function fillTeams(shuffle = false) {
    const n = state.size, order = roster.map((_, i) => i).filter((i) => i !== captainIdx && aUnAvatar(roster[i]));
    if (shuffle) for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const pick = (k) => order[k % order.length];
    state.teamA = [captainIdx, ...Array.from({ length: n - 1 }, (_, i) => pick(i))];
    state.teamB = Array.from({ length: n }, (_, i) => pick(n - 1 + i));
    active = posteDepart();
    prechargerEquipes(roster, state.teamA, state.teamB);
  }
  function renderTeams() {
    const n = state.size;
    // (A4, par sécurité) jamais de poste hors de son équipe : on revient au premier poste à choisir
    if (active && active.i >= (active.team === 'A' ? state.teamA : state.teamB).length) active = enLigne.length ? premierLibre() : posteDepart();
    prechargerEquipes(roster, state.teamA, state.teamB);   // composition gardée ou modifiée à la main
    $('teams-title').textContent = n === 1 ? 'ADVERSAIRE · 1v1' : `ÉQUIPES ${n}v${n}`;
    $('team-a-title').textContent = `${state.names[0]} (TOI)`;
    $('team-b-title').textContent = `${state.names[1]} (${humains.B.size ? (humains.B.size === state.teamB.length ? 'EN LIGNE' : 'EN LIGNE + ORDINATEUR') : 'ORDINATEUR'})`;
    for (const [key, id, list] of [['A', 'slots-a', state.teamA], ['B', 'slots-b', state.teamB]]) {
      const el = $(id); el.innerHTML = '';
      list.forEach((idx, i) => {
        const p = roster[idx], b = document.createElement('button'), pseudo = humains[key].get(i);
        const locked = (key === 'A' && i === 0) || pseudo !== undefined;
        b.className = 'slot' + (active && active.team === key && active.i === i ? ' active' : '') + (locked ? ' locked' : '');
        b.style.setProperty('--c1', p.color1); b.style.setProperty('--c2', p.color2);
        const dup = list.filter((x, j) => x === idx && j < i).length + (key === 'B' ? state.teamA.filter((x) => x === idx).length : 0);
        // (recette finale, A5) un doublon garde son avatar 3D (js/game.js setup, makePlayer) : le badge aussi
        b.innerHTML = `<span class="num">#${p.number}</span><span><div class="who">${p.name}${dup ? ' (bis)' : ''}</div><div class="role">${p.pos} · ${p.style}</div></span>
          ${key === 'A' && i === 0 ? '<span class="badge cap">TOI · CAPITAINE</span>' : pseudo !== undefined ? `<span class="badge cap">${String(pseudo || 'JOUEUR').toUpperCase().replace(/[<>&"]/g, '')}</span>` : p.model ? '<span class="badge">AVATAR 3D</span>' : ''}`;
        b.onclick = () => { if (locked) return; active = { team: key, i }; renderTeams(); };
        el.appendChild(b);
      });
    }
    // (B23) en ligne, quand tous les postes sont tenus par des joueurs, il n'y a rien à choisir
    $('roster-pick').hidden = !active;
    if (!active) { $('pick-title').textContent = 'TOUS LES POSTES SONT TENUS PAR DES JOUEURS EN LIGNE'; return; }
    const list = active.team === 'A' ? state.teamA : state.teamB;
    $('pick-title').textContent = `POSTE ${active.i + 1} · ${active.team === 'A' ? state.names[0] : state.names[1]}`;
    const used = new Set([...state.teamA, ...state.teamB]);
    renderRoster($('roster-pick'), roster, list[active.i], (i) => {
      list[active.i] = i; store(MATCH_KEY, state);
      // on passe au poste suivant (draft), puis à l'autre équipe — en sautant les postes tenus par des joueurs
      const ordre = [...state.teamA.map((_, k) => ({ team: 'A', i: k })), ...state.teamB.map((_, k) => ({ team: 'B', i: k }))]
        .filter((q) => !(q.team === 'A' && q.i === 0) && !humains[q.team].has(q.i));
      const ici = ordre.findIndex((q) => q.team === active.team && q.i === active.i);
      if (ici >= 0 && ici + 1 < ordre.length) active = ordre[ici + 1];
      renderTeams();
    }, used);
  }
  $('ms-next').onclick = () => showStep('teams');
  $('ms-back').onclick = () => showStep('mode');
  $('ms-shuffle').onclick = () => {
    // (B23) en ligne, le mélange ne touche pas aux postes des joueurs : on les remet après le tirage
    const garde = [...humains.A.keys()].map((i) => ['A', i, state.teamA[i]]).concat([...humains.B.keys()].map((i) => ['B', i, state.teamB[i]]));
    fillTeams(true);
    for (const [t, i, v] of garde) (t === 'A' ? state.teamA : state.teamB)[i] = v;
    if (garde.length) active = premierLibre();
    store(MATCH_KEY, state); renderTeams();
  };
  $('ms-cancel').onclick = () => close();
  $('ms-cancel2').onclick = () => close();
  const lancer = () => {
    store(MATCH_KEY, state);
    const opts = { teamA: state.teamA.map((i) => roster[i]), teamB: state.teamB.map((i) => roster[i]), difficulty: state.difficulty, target: state.target, half: !!state.half, names: [...state.names], size: state.size };
    // MATCH EN LIGNE : chaque joueur du cercle retrouve la place où son personnage a été mis (en face par
    // défaut, mais on peut l'avoir déplacé dans son équipe). Celui qu'on a retiré des deux équipes ne joue
    // pas. La place 0 de l'équipe A est celle du lanceur.
    if (enLigne.length) {
      const pris = new Set(['0:0']), places = [];
      for (const a of enLigne) {
        const idx = roster.findIndex((r) => r.id === (a.def && a.def.id));
        let place = null;
        for (const [team, arr] of [[1, state.teamB], [0, state.teamA]]) {
          arr.forEach((v, slot) => { if (!place && v === idx && !pris.has(team + ':' + slot)) place = { team, slot }; });
        }
        if (place) { pris.add(place.team + ':' + place.slot); places.push({ id: a.id, nom: a.nom, ...place, ...(a.tn ? { tn: a.tn } : {}) }); }
      }
      if (places.length) opts.enLigne = places;
    }
    close(); cb.onStart?.(opts);
  };
  $('ms-start').onclick = lancer;
  // JOUER TOUT DE SUITE (04/10/2026) : depuis l'écran du mode, sans passer par les équipes — elles sont déjà remplies
  // (joueurs en ligne placés, ordinateur pour le reste). Créé ici s'il manque à une index.html restée en cache.
  let go = $('ms-go');
  if (!go) {
    go = document.createElement('button'); go.id = 'ms-go'; go.className = 'btn-primary';
    $('ms-next').parentNode.insertBefore(go, $('ms-next'));
    $('ms-next').className = 'btn-secondary';
  }
  go.textContent = 'JOUER TOUT DE SUITE ▶';
  go.onclick = lancer;

  // Le bloc JOUEURS EN LIGNE de l'écran du mode (créé ici, comme le bouton ci-dessus)
  let blocEnLigne = $('ms-online');
  if (!blocEnLigne) {
    blocEnLigne = document.createElement('div'); blocEnLigne.id = 'ms-online'; blocEnLigne.className = 'opt-block ms-online';
    blocEnLigne.innerHTML = '<h3>JOUEURS EN LIGNE · ILS JOUENT AVEC TOI (touche un nom pour le retirer)</h3><div class="seg" id="ms-online-list"></div>';
    $('modes').parentNode.insertBefore(blocEnLigne, $('modes'));
  }
  function renderEnLigne() {
    blocEnLigne.hidden = !dispo.length;
    const L = $('ms-online-list'); L.innerHTML = '';
    for (const a of dispo) {
      const b = document.createElement('button');
      const nom = String(a.nom || 'Joueur').replace(/[<>&"]/g, '');
      b.className = invites.has(a.id) ? 'on' : '';
      b.textContent = `${invites.has(a.id) ? '✓ ' : '+ '}${nom}${a.def ? ' · ' + a.def.name : ''}${a.cercle ? ' · dans le cercle' : ''}`;
      b.onclick = () => { if (invites.has(a.id)) invites.delete(a.id); else invites.add(a.id); composerEnLigne(); syncMode(); renderEnLigne(); titre(); };
      L.appendChild(b);
    }
  }
  function titre() {
    const t = $('ms-title');
    if (t) t.textContent = enLigne.length ? `MATCH EN LIGNE · AVEC ${enLigne.map((a) => String(a.nom).toUpperCase()).join(', ')}` : 'CHOISIR UN MATCH';
  }
  // MATCHS EN COURS (06/10/2026) : en ligne, ceux qu'on peut rejoindre ou regarder, et PARTIE RAPIDE, au-dessus des
  // joueurs en ligne (js/matchs_ui.js ; caché hors ligne)
  const blocMatchs = cb.blocMatchs ? cb.blocMatchs(blocEnLigne.parentNode, blocEnLigne) : null;
  window.addEventListener('keydown', (e) => { if (!box.hidden && e.code === 'Escape') { e.stopImmediatePropagation(); if (step === 'teams') showStep('mode'); else close(); } }, true);

  // `avec` = les joueurs EN LIGNE présents dans le cercle bleu au moment du déclenchement. Ils remplissent
  // l'équipe adverse dans l'ordre d'arrivée, et la taille du match s'aligne sur leur nombre.
  function open(avec) {
    // Les joueurs proposés : ceux du terrain (cb.dispo) — le cercle n'est plus obligatoire — et, par sécurité, ceux du
    // cercle que la liste n'aurait pas. Tous invités d'office : c'est le plus simple pour jouer à plusieurs.
    dispo = (cb.dispo?.() || []).slice();
    for (const a of Array.isArray(avec) ? avec : []) if (!dispo.some((d) => d.id === a.id)) dispo.unshift({ ...a, cercle: true });
    invites = new Set(dispo.map((a) => a.id));
    const capDef = cb.captain?.(); captainIdx = capDef ? Math.max(0, roster.indexOf(capDef)) : 0;
    composerEnLigne();
    syncMode(); showStep('mode'); renderEnLigne(); box.hidden = false; cb.onOpen?.();
    titre();
    if (blocMatchs) blocMatchs.rafraichir();
  }
  // PARTIE RAPIDE (06/10/2026, js/enligne.js) : un 3 contre 3 contre l'ordinateur, équipes remplies d'office avec des
  // avatars 3D (toi capitaine), difficulté et score du dernier match choisi. La composition enregistrée n'est pas touchée.
  function optsRapides(n = 3) {
    const capDef = cb.captain?.(), cap = capDef ? Math.max(0, roster.indexOf(capDef)) : 0;
    const order = roster.map((_, i) => i).filter((i) => i !== cap && aUnAvatar(roster[i]));
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const pick = (k) => roster[order.length ? order[k % order.length] : cap];
    const teamA = [roster[cap], ...Array.from({ length: n - 1 }, (_, i) => pick(i))];
    const teamB = Array.from({ length: n }, (_, i) => pick(n - 1 + i));
    return { teamA, teamB, difficulty: state.difficulty, target: state.target, half: false, names: [...state.names], size: n };
  }
  // Compose le match avec les joueurs invités : taille, places, ordinateur pour le reste.
  // `auto` : la taille suit le nombre de joueurs (false quand on vient de la choisir à la main).
  function composerEnLigne(auto = true) {
    enLigne = dispo.filter((a) => invites.has(a.id));
    // La taille du match suit le nombre de joueurs présents dans le cercle (toi compris), répartis en deux
    // camps : à deux c'est un 1 contre 1, à trois ou quatre un 2 contre 2, etc. Avant, deux joueurs donnaient
    // un 2 contre 2 où chacun avait un coéquipier ordinateur.
    if (auto && enLigne.length) state.size = Math.max(1, Math.min(5, Math.ceil((enLigne.length + 1) / 2)));
    // une compo n'est gardée que si elle a la bonne taille, le bon capitaine, et QUE des index encore valides
    const okTeam = (t) => Array.isArray(t) && t.length === state.size && t.every((i) => inRange(i, roster));
    if (!okTeam(state.teamA) || state.teamA[0] !== captainIdx || !okTeam(state.teamB)) fillTeams();
    active = posteDepart();   // (A4) composition gardée ou non : on repart du premier poste à choisir pour CETTE taille
    // Les joueurs du cercle passent en face APRÈS le remplissage automatique, sinon celui-ci les écrase.
    // On peut toujours les déplacer à la main dans l'écran des équipes.
    // Un sur deux en face, un sur deux avec toi : les camps restent équilibrés en vrais joueurs.
    if (enLigne.length) {
      const idx = enLigne.map((a) => roster.findIndex((r) => r.id === (a.def && a.def.id))).filter((i) => i >= 0);
      const enFace = idx.filter((_, i) => i % 2 === 0).slice(0, state.size);
      const avecToi = idx.filter((_, i) => i % 2 === 1).slice(0, state.size - 1);
      const humainA = new Set([0, ...avecToi.map((_, i) => i + 1)]), humainB = new Set(enFace.map((_, i) => i));
      state.teamA[0] = captainIdx;
      // (B23) qui tient quel poste : le pseudo, dans l'ordre d'arrivée (un sur deux en face, un sur deux avec toi)
      const noms = enLigne.filter((a) => roster.some((r) => r.id === (a.def && a.def.id))).map((a) => a.nom);
      humains = { A: new Map(avecToi.map((_, i) => [i + 1, noms[2 * i + 1]])), B: new Map(enFace.map((_, i) => [i, noms[2 * i]])) };
      avecToi.forEach((v, i) => { state.teamA[i + 1] = v; });
      enFace.forEach((v, i) => { state.teamB[i] = v; });
      // les places restantes (ordinateur) prennent des personnages que personne n'a déjà
      const pris = new Set([captainIdx, ...idx]);
      for (const [team, humains] of [[state.teamA, humainA], [state.teamB, humainB]]) {
        for (let i = 0; i < team.length; i++) {
          if (humains.has(i)) continue;
          if (!pris.has(team[i])) { pris.add(team[i]); continue; }
          let c = 0; while (pris.has(c) && c < roster.length) c++;
          team[i] = c % roster.length; pris.add(c);
        }
      }
      store(MATCH_KEY, state);
      active = premierLibre();
    } else humains = { A: new Map(), B: new Map() };
  }
  function close() { box.hidden = true; cb.onClose?.(); }
  return { open, close, optsRapides, rafraichirMatchs: () => { if (blocMatchs && !box.hidden) blocMatchs.rafraichir(); }, get isOpen() { return !box.hidden; } };
}

// ---------- Boutique du marchand : nourriture (boosts pour le prochain match), ballons, tenues ----------
export function buildShop(wallet, cb) {
  const box = $('shop'), grid = $('shop-grid'), msg = $('shop-msg'), tabs = $('shop-tabs');
  let tab = 'food';
  // (lot C4) le rayon GLISSE (skates, trottinettes, rollers) : son onglet est ajouté ici s'il manque à la page (une
  // index.html restée en cache le montre quand même)
  if (!tabs.querySelector('[data-tab="glisse"]')) {
    const g = document.createElement('button'); g.dataset.tab = 'glisse'; g.textContent = 'GLISSE';
    const avant = tabs.querySelector('[data-tab="emotes"]');
    tabs.insertBefore(g, avant || null);
  }
  // Au téléphone et sur tablette, c'est la grille des articles qui défile (et non plus la fiche) : un nouvel onglet
  // repart de son premier article, au lieu de garder le défilement du précédent. (Un achat, lui, garde la place.)
  tabs.querySelectorAll('button').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; render(); grid.scrollTop = 0; }; });
  const say = (t, cls = '') => { msg.textContent = t; msg.className = 'shop-msg ' + cls; };
  const card = (html, cls = '') => { const c = document.createElement('div'); c.className = 'shop-card ' + cls; c.innerHTML = html; grid.appendChild(c); return c; };
  const btn = (c, label, cls, disabled, onClick) => { const b = document.createElement('button'); b.className = cls + ' small'; b.textContent = label; b.disabled = disabled; b.onclick = onClick; c.appendChild(b); };
  // Au téléphone, la barre des neuf onglets défile en largeur (css/style.css) : l'onglet choisi est ramené au milieu
  // du bandeau, sinon un RB de la manette en choisissait un qu'on ne voyait pas. Sur ordinateur, tout tient : rien
  // ne bouge. (Boutique fermée, les mesures sont nulles : open() rappelle la fonction une fois la fiche affichée.)
  function centrerOnglet() {
    const ong = tabs.querySelector('button.on');
    if (!ong || tabs.scrollWidth <= tabs.clientWidth + 1) return;
    const r = ong.getBoundingClientRect(), rb = tabs.getBoundingClientRect();
    tabs.scrollLeft += (r.left + r.width / 2) - (rb.left + rb.width / 2);
  }
  function render() {
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    centrerOnglet();
    $('shop-coins').textContent = `🪙 ${wallet.coins}`;
    $('shop-boost').textContent = wallet.boostText() ? `Boost en cours (jusqu'à la fin de ton prochain match) : ${wallet.boostText()}` : 'Aucun boost en cours';
    $('shop-boost').classList.toggle('vide', !wallet.boostText());       // (au téléphone en paysage, la ligne se masque)
    grid.innerHTML = ''; grid.className = 'shop-grid';
    $('shop-xp').textContent = tab === 'player' ? `⚡ ${wallet.xp} points d'entraînement · ${wallet.upTotal()} améliorations` : '';
    if (tab === 'food') {
      for (const f of FOODS) {
        const c = card(`<div class="shop-emoji">${f.emoji}</div><div class="shop-name">${f.name}</div><div class="shop-desc">${f.desc}</div><div class="shop-bonus">${bonusText(f.bonus)}</div><div class="shop-price">🪙 ${f.price}</div>`);
        btn(c, 'MANGER', 'btn-primary', wallet.coins < f.price, () => {
          const r = wallet.eat(f);
          say(r.ok ? `${f.emoji} Miam ! ${bonusText(f.bonus)} pour ton prochain match.` : r.reason, r.ok ? 'good' : 'bad');
          render(); cb.onChange?.();
        });
      }
      return;
    }
    if (tab === 'emotes') {
      // Le bouton etait DESACTIVE des qu'on possedait l'emote : il ne pouvait donc rien faire. Avec trente
      // emotes et huit emplacements, il faut au contraire pouvoir BASCULER chacune sur la roue ou l'en
      // retirer — sinon posseder une emote de plus que huit serait une punition.
      const roue = wallet.emoteSlots();
      $('shop-xp').textContent = `🎡 ${roue.length}/${EMOTE_SLOTS} emotes sur ta roue · touches 1 à ${EMOTE_SLOTS}`;
      for (const cat of EMOTE_CATS) {
        const list = EMOTES.filter((e) => (e.cat || 'Style') === cat);
        if (!list.length) continue;
        const t = document.createElement('div'); t.className = 'shop-sep'; t.textContent = cat; grid.appendChild(t);
        for (const e of list) {
          const owned = !e.price || wallet.owns('emote_' + e.id), on = roue.includes(e.id);
          const c = card(`<div class="shop-emoji">${e.icon}</div><div class="shop-name">${e.label}</div>`
            + `<div class="shop-desc">${e.desc || 'Disponible dès le départ.'}</div>`
            + `<div class="shop-price">${owned ? (on ? 'SUR LA ROUE' : 'DÉBLOQUÉE') : `🪙 ${e.price}`}</div>`, on ? 'equipped' : '');
          if (!owned) btn(c, 'ACHETER', 'btn-primary', wallet.coins < e.price, () => {
            const r = wallet.buyEmote(e);
            say(r.ok ? `${e.icon} ${e.label} débloquée ! Mets-la sur ta roue.` : r.reason, r.ok ? 'good' : 'bad');
            render(); cb.onChange?.();
          });
          else btn(c, on ? 'RETIRER' : 'METTRE SUR LA ROUE', on ? 'btn-secondary' : 'btn-primary', false, () => {
            const r = wallet.toggleEmote(e);
            say(r.ok ? (r.on ? `${e.icon} ${e.label} est sur ta roue.` : `${e.label} retirée de la roue.`) : r.reason, r.ok ? 'good' : 'bad');
            render(); cb.onChange?.();
          });
        }
      }
      return;
    }
    if (tab === 'badges') {
      // Capacités façon NBA 2K : trois niveaux, payés en points d'entraînement. Le niveau de la fiche (signature du
      // personnage) est affiché à part, car il s'ajoute à ce que le joueur débloque, plafonné au niveau maximum.
      const sig = (cb.baseDef?.() || {}).badges || {};
      grid.className = 'shop-grid shop-grid-wide';
      for (const cat of BADGE_CATS) {
        const t = document.createElement('div'); t.className = 'shop-sep'; t.textContent = cat; grid.appendChild(t);
        for (const b of BADGES.filter((x) => x.cat === cat)) {
          const n = wallet.badge(b.id), s0 = sig[b.id] || 0, tot = Math.min(BADGE_MAX, n + s0);
          const cost = badgeCost(n), max = n >= BADGE_MAX;
          const pastilles = [1, 2, 3].map((i) => `<i class="pip${i <= tot ? ' on' : ''}" style="--pc:${TIER_COLOR[Math.min(3, i)]}"></i>`).join('');
          const c = card(`<div class="shop-emoji">${b.icon}</div><div class="shop-name">${b.name}</div>
            <div class="pips">${pastilles}<span class="tier">${tot ? TIERS[tot] : 'Non débloquée'}</span></div>
            <div class="shop-desc">${b.desc}</div>
            ${s0 ? `<div class="shop-bonus">Signature du perso : ${TIERS[Math.min(3, s0)]}</div>` : ''}
            <div class="shop-price">${max ? 'MAXIMUM' : `${cost} pts d'entraînement`}</div>`, tot ? 'equipped' : '');
          btn(c, max ? 'MAX' : n ? 'AMÉLIORER' : 'DÉBLOQUER', 'btn-primary', max || wallet.xp < cost, () => {
            const r = wallet.upgradeBadge(b.id, cost, BADGE_MAX);
            say(r.ok ? `${b.icon} ${b.name} — ${TIERS[Math.min(3, wallet.badge(b.id) + s0)]} !` : r.reason, r.ok ? 'good' : 'bad');
            render(); cb.onChange?.();
          });
        }
      }
      return;
    }
    if (tab === 'player') {
      // progression façon mode carrière : les points d'entraînement se gagnent en jouant et se dépensent en +1
      const base = cb.baseDef?.();
      grid.className = 'shop-grid shop-grid-wide';
      for (const [k, label] of UP_STATS) {
        const up = wallet.up(k), cost = upCost(up), max = up >= UP_MAX, val = base ? Math.min(99, base[k] + up) : null;
        const c = card(`<div class="shop-name">${label}</div>
          <div class="up-val">${val !== null ? val : '—'}${up ? ` <b>+${up}</b>` : ''}</div>
          <div class="up-bar"><i style="width:${val !== null ? val : 0}%"></i></div>
          <div class="shop-desc">${max ? 'Maximum atteint (+' + UP_MAX + ')' : `Prochain +1 : <b>${cost}</b> points`}</div>`, max ? 'equipped' : '');
        btn(c, max ? 'MAX' : '+1', 'btn-primary', max || wallet.xp < cost, () => {
          const r = wallet.upgrade(k);
          say(r.ok ? `${label} +1 (−${r.cost} points d'entraînement)` : r.reason, r.ok ? 'good' : 'bad');
          render(); cb.onChange?.();
        });
      }
      return;
    }
    // Un onglet inconnu retombe SILENCIEUSEMENT sur les tenues : pas d'erreur, juste le mauvais rayon.
    const typ = tab === 'balls' ? 'ball' : tab === 'shoes' ? 'shoes' : tab === 'chef' ? 'chef' : 'outfit';
    // (lot C4) GLISSE : deux types l'un sous l'autre, chacun sous son titre (js/shop.js, GLISSE)
    const rayon = tab === 'glisse' ? GLISSE : [[typ, null]];
    if (tab === 'glisse') $('shop-xp').textContent = 'En balade seulement : en match, on joue en baskets.';
    for (const [t, titre] of rayon) {
      if (titre) { const sep = document.createElement('div'); sep.className = 'shop-sep'; sep.textContent = titre; grid.appendChild(sep); }
      skinsDu(t);
    }
  }
  function skinsDu(typ) {
    for (const s of SKINS.filter((s) => s.type === typ)) {
      const owned = s.price === 0 || wallet.owns(s.id), eq = wallet.equipped(s.type) === s.id;
      // Une vraie tenue a une COUPE : une pastille de couleur unique ne dit rien de ce qu'on achete.
      // On dessine donc la silhouette du survetement avec ses vraies couleurs et ses vraies bandes.
      // (lot C4 : la glisse montre son engin — 🛹 🛴 🛼 — au lieu d'une pastille)
      const vign = s.fit ? silhouette(s.fit) : s.emoji ? `<div class="shop-emoji">${s.emoji}</div>`
        : `<div class="shop-swatch" style="--sw:${s.swatch}"></div>`;
      const c = card(`${vign}<div class="shop-name">${s.name}</div><div class="shop-desc">${s.desc}</div><div class="shop-price">${owned ? 'POSSÉDÉ' : `🪙 ${s.price}`}</div>`, eq ? 'equipped' : '');
      btn(c, eq ? 'ÉQUIPÉ ✓' : owned ? 'ÉQUIPER' : 'ACHETER', owned ? 'btn-secondary' : 'btn-primary', eq || (!owned && wallet.coins < s.price), () => {
        const r = owned ? { ok: wallet.equip(s) } : wallet.buySkin(s);
        say(r.ok ? `${s.name} : équipé !` : r.reason || 'Impossible', r.ok ? 'good' : 'bad');
        render(); cb.onChange?.();
      });
    }
  }
  $('shop-close').onclick = () => close();
  window.addEventListener('keydown', (e) => { if (!box.hidden && (e.code === 'Escape' || e.code === 'Enter')) { e.stopImmediatePropagation(); close(); } }, true);
  function open(startTab) { tab = startTab || 'food'; say("Salut, c'est Pierrick. Mange un truc, change de style, débloque une capacité ou va t'entraîner."); render(); box.hidden = false; box.scrollTop = 0; grid.scrollTop = 0; tabs.scrollLeft = 0; centrerOnglet(); cb.onOpen?.(); }
  function close() { if (box.hidden) return; box.hidden = true; cb.onClose?.(); }
  return { open, close, get isOpen() { return !box.hidden; } };
}

// ---------- Options (graphismes / audio / commandes) ----------
export function buildOptions(settings, cb = {}) {
  const box = $('options'), panels = $('opt-panels'), tabs = $('opt-tabs');
  let tab = 'graphics', listening = null;

  const row = (label, sub, ctl) => `<div class="opt-row"><div class="lbl">${label}${sub ? `<small>${sub}</small>` : ''}</div><div class="ctl">${ctl}</div></div>`;
  // `dispo` (facultatif) grise les choix que la machine ne peut PAS tenir : proposer « Extrême » sur un téléphone
  // qui plafonne à 4096 en texture, c'est promettre un écran noir.
  // Les hauteurs de rendu proposees. On s'arrete a 2160 : au-dela, le tampon depasse ce que la plupart
  // des puces savent allouer, et three rend alors un ecran noir sans le moindre message.
  const RESOLUTIONS = [['auto', 'Auto'], ['720', '720p'], ['1080', '1080p'], ['1440', '1440p'], ['2160', '4K']];
  const seg = (path, opts, cur, dispo = null) => `<div class="seg" data-seg="${path}">${opts.map(([v, l]) => {
    const ko = dispo && !dispo(v);
    return `<button data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}${ko ? ' ko' : ''}"${ko ? ' disabled title="Ta machine ne peut pas tenir ce préréglage"' : ''}>${l}</button>`;
  }).join('')}</div>`;
  const range = (path, min, max, step, cur, fmt) => `<input type="range" data-range="${path}" min="${min}" max="${max}" step="${step}" value="${cur}" data-fmt="${fmt}"><span class="val" data-val="${path}">${format(fmt, cur)}</span>`;
  const toggle = (path, cur) => `<div class="toggle ${cur ? 'on' : ''}" data-toggle="${path}" role="switch" aria-checked="${!!cur}"></div>`;
  const format = (fmt, v) => fmt === 'pct' ? `${Math.round(v * 100)} %` : fmt === 'deg' ? `${v}°` : fmt === 'x' ? `${(+v).toFixed(2)}×` : String(v);

  // Bloc MANETTE de l'onglet Commandes : état, réglages des sticks et des vibrations, puis la disposition par
  // défaut (façon NBA 2K) dessinée avec les boutons de la manette branchée.
  function renderManette(pad) {
    const info = infoManette();
    let h = '<div class="opt-group">MANETTE</div>';
    h += row('Manette', info
      ? `${info.nom} · la première manette qui s'active pilote ton joueur. Débranchée en pleine partie : le jeu se met en pause.`
        + (info.standard ? '' : ' Le navigateur ne connaît pas sa disposition : seul son stick gauche est lu, et ses boutons peuvent être ailleurs — réaffecte-les dans la colonne MANETTE.')
      : 'Aucune manette détectée : branche-la (USB ou Bluetooth), puis appuie sur un de ses boutons.',
    `<span class="pad-etat${info ? ' on' : ''}">${info ? 'CONNECTÉE' : 'ABSENTE'}</span>`);
    h += row('Zone morte des sticks', 'En dessous de ce seuil, un stick ne compte pas. Monte-la si ton joueur avance tout seul (stick usé), baisse-la pour plus de réactivité.',
      range('controls.pad.deadzone', 0.05, 0.4, 0.01, pad.deadzone, 'pct'));
    h += row('Sensibilité caméra au stick', 'Stick droit, en balade libre', range('controls.pad.sens', 0.3, 2.5, 0.05, pad.sens, 'x'));
    h += row('Inverser l\'axe vertical (stick droit)', '', toggle('controls.pad.invertY', pad.invertY));
    h += row('Vibrations', 'Panier marqué, dunk, contre, contact, ballon perdu : de courtes secousses discrètes', toggle('controls.pad.vibrations', pad.vibrations));
    // la disposition PAR DÉFAUT, quelle que soit la réaffectation en cours : c'est la référence
    const d = (id) => { const a = ACTIONS.find((x) => x.id === id); return (a.pad || []).filter(Boolean).map((c2) => padGlyph(c2)).join(''); };
    const g2 = (n) => padGlyph('Pad:' + n);
    const lignes = [
      ['<span class="pad-g">STICK G</span>', 'Se déplacer : effleure pour marcher, pousse pour courir'],
      [d('sprint'), 'Sprint'],
      [d('shoot'), 'Tirer (maintiens, relâche dans la zone verte) · voler · contrer'],
      [d('pass'), 'Passe'],
      [d('spin'), 'Spin move'],
      [d('interact'), 'Parler / interagir : marchand, vélo, trottinette, gradins · sortir son skate ou sa trottinette du sac'],
      ['<span class="pad-g">STICK D</span>', 'En match, le pro stick : ← → feinte (crossover, hésitation) · ↓ dans le dos · ↑ entre les jambes. En balade : la caméra'],
      [d('bump'), 'Coup d’épaule · maintenu balle en main : appui dos au panier'],
      [d('switch'), 'Changer de joueur'],
      [d('emote'), 'Roue des emotes (vise au stick droit, relâche ou valide)'],
      [d('camera'), 'Caméra en match · vue en balade'],
      [d('phone'), 'Téléphone'],
      [d('pause'), 'Pause'],
      [d('walk'), 'Marcher (garder le pas)'],
      [`${g2('Up')}${g2('Down')}${g2('A')}${g2('B')}${g2('LB')}${g2('RB')}`, 'Dans les menus : croix ou stick gauche pour te déplacer, valider, revenir, changer d\'onglet ; stick droit pour défiler'],
    ];
    h += '<div class="opt-note">Disposition par défaut, façon NBA 2K :</div><div class="pad-doc">'
      + lignes.map(([k, t]) => `<div class="k">${k}</div><div>${t}</div>`).join('') + '</div>';
    return h;
  }

  function render() {
    const g = settings.graphics, a = settings.audio, c = settings.controls;
    let html = '';
    if (tab === 'graphics') {
      html += row('Météo', 'Auto = le temps change tout seul (soleil, ciel couvert, pluie)', seg('graphics.weather', WEATHERS_OPT, g.weather || 'auto'));
      const fx = window.__game && window.__game.fx;
      // (l'ancien texte disait « Auto ne les choisit jamais tout seul » : faux, la mesure peut monter jusqu'à EXTRÊME,
      // et une machine costaude part directement en ULTRA — js/fx.js presetDepart et render). La mesure change d'UN
      // cran à la fois et remesure à chaque cran ; un PC à 4 cœurs ou 4 Go part en MOYENNE (presetDepart).
      html += row('Qualité', 'Auto = sonde le matériel (départ en ULTRA sur une machine costaude, en HAUTE sur un PC ordinaire, en MOYENNE sur un PC modeste, en MOYENNE ou BASSE sur téléphone), puis mesure les FPS pendant 3 s et descend ou monte d\'un cran à la fois, jusqu\'à EXTRÊME si la machine le tient. ULTRA et EXTRÊME ajoutent le reflet du sol mouillé, les ombres douces resserrées et le suréchantillonnage : il faut une carte graphique dédiée. Les préréglages grisés dépassent ce que ta machine peut tenir.',
        seg('graphics.quality', QUALITIES, g.quality, (v) => v === 'auto' || !fx || fx.disponible(v)));
      // LE PRÉRÉGLAGE VRAIMENT APPLIQUÉ et la puce qui calcule l'image. « Auto » ne dit pas ce qu'on voit : sur le PC de
      // Haythem, l'auto posait la MOYENNE en silence, et le navigateur tournait sur la puce intégrée alors qu'une RTX
      // attendait à côté. Le nom brut d'ANGLE est raccourci : « ANGLE (AMD, AMD Radeon(TM) Graphics (0x…) Direct3D11…) »
      // devient « AMD Radeon(TM) Graphics ».
      if (fx) {
        const QN = { low: 'BASSE', medium: 'MOYENNE', high: 'HAUTE', ultra: 'ULTRA', extreme: 'EXTRÊME' };
        const brut = fx.dev.gpu || '';
        const m = /ANGLE \([^,]*,\s*([^,]+?)(?:\s*\(0x[0-9a-f]+\))?(?:\s+(?:Direct3D|vs_|OpenGL|Vulkan).*)?,/i.exec(brut);
        const puce = (m ? m[1] : brut).trim() || 'puce inconnue';
        const origine = g.quality === 'auto' || !g.quality ? (fx.auto && !fx._decided ? 'Auto, mesure en cours' : 'choisi par Auto')
          : fx.quality !== g.quality ? 'bridé par la machine' : 'choisi à la main';
        // LE BANDEAU DE LA CARTE DÉDIÉE (07/10/2026). Le PC de Haythem a une RTX, et le navigateur calculait l'image sur la
        // Radeon intégrée : le jeu y tombait en MOYENNE. Le conseil était caché au bout d'une ligne ; sur Windows, avec une
        // puce intégrée, on l'affiche en tête, bien visible. Information seulement : le jeu ne change rien de lui-même (il
        // demande déjà la puce la plus rapide, powerPreference 'high-performance' de js/game.js — Windows a le dernier mot).
        const bandeauDedie = fx.dev.integre && /Windows/.test(navigator.userAgent) && !fx.dev.telephone;
        if (bandeauDedie) {
          html += `<div class="opt-note" style="border:1px solid var(--accent2, #e8622a); border-radius:8px; margin:8px 8px 4px; padding:10px 12px; color:inherit; line-height:1.45">`
            + `<b>Le jeu tourne sur la puce graphique intégrée</b> (${esc(puce)}). Si ton PC a aussi une carte graphique dédiée, donne-la au navigateur : `
            + `<b>Paramètres Windows › Système › Écran › Graphiques</b> › ton navigateur › Options › <b>Hautes performances</b>, puis ferme complètement le navigateur et relance-le (le jeu installé suit son navigateur). `
            + `Carte NVIDIA : <b>Panneau de configuration NVIDIA › Gérer les paramètres 3D › Processeur graphique préféré › Processeur NVIDIA hautes performances</b>. `
            + `Le jeu reconnaîtra la carte ici, et choisira une qualité plus haute tout seul.</div>`;
        }
        const conseil = fx.dev.integre && !bandeauDedie ? ' Ta puce graphique est <b>intégrée</b> au processeur. Si ton PC a aussi une carte NVIDIA ou AMD dédiée, donne-la au navigateur (Windows : Paramètres > Système > Écran > Graphiques > ton navigateur > Performances élevées), ferme-le complètement puis relance-le : le jeu la reconnaîtra ici.' : '';
        html += row('Préréglage appliqué', 'Ce que le jeu utilise vraiment en ce moment, et la puce graphique qui calcule l\'image.' + conseil,
          `<div class="qtable"><div><b>${QN[fx.quality] || esc(fx.quality)}</b><span>${origine} · ${esc(puce)}${fx.dev.telephone ? ' · téléphone' : fx.dev.costaud ? ' · machine costaude' : fx.dev.integre ? ' · intégrée' : ''}</span></div></div>`);
      }
      // La lumière du ciel (carte d'environnement) arrive en HAUTE, ou dès la MOYENNE sur une machine costaude
      // (js/fx.js envMoyenne) : on ne l'annonce qu'à la ligne où elle apparaît vraiment pour CETTE machine.
      const envM = !!(fx && fx.envMoyenne('medium')), CIEL = 'lumière du ciel HDR (au parc : tout l\'éclairage à l\'ombre)';
      html += row('Détail du rendu', 'Ce que chaque préréglage change', `<div class="qtable">`
        + `<div><b>Basse</b><span>rendu direct sans post-traitement · ombres 1024 · décor lointain sans ombre — c'est le mode téléphone</span></div>`
        + `<div><b>Moyenne</b><span>${fx && fx._legere && fx._legere('medium') ? '+ étalonnage complet et anticrénelage FXAA réaffûté (la chaîne légère de ta machine : deux passes au lieu de six, sans bloom ni SMAA)' : '+ bloom · anticrénelage (SMAA)'} · ombres ${fx && fx.dev && fx.dev.telephone ? '' : 'douces '}2048${envM ? ` · ${CIEL}, accordée ici parce que ta machine est costaude` : ' — au parc, sans la lumière du ciel HDR, le haut de l\'image devient laiteux'}</span></div>`
        + `<div><b>Haute</b><span>+ ${envM ? '' : CIEL + ' · '}occlusion ambiante · ombres 3072</span></div>`
        + `<div><b>Ultra</b><span>+ reflet du sol mouillé · ombres douces 4096 resserrées · filtrage 16× · pluie dense et éclaboussures</span></div>`
        + `<div><b>Extrême</b><span>+ occlusion 32 échantillons · suréchantillonnage 1,3× · ombres resserrées à 18 m · reflet du sol en 1024</span></div>`
        + `</div>`);
      html += row('Résolution dynamique', `Toujours active : la résolution interne baisse dans les moments chargés puis remonte, sans jamais descendre sous ${fx ? Math.round(fx._dynMin() * 100) : 80} % ici. C'est ce qui évite les chutes à 25 im/s sans que l'image devienne grossière.`,
        `<div class="qtable"><div><b>${fx ? Math.round(fx.dyn * 100) + ' %' : '—'}</b><span>${fx ? (fx._pxRendus() / 1e6).toFixed(2) + ' Mpx rendus · ' + (fx.dev.telephone ? 'profil téléphone' : fx.dev.costaud ? 'profil machine costaude' : 'profil standard') : ''}</span></div></div>`);
      html += row('Résolution de rendu', `Hauteur à laquelle le jeu est calculé, avant que l'écran ne l'étire. AUTO suit ta machine et ta fenêtre. Au-dessus de ton écran, c'est du suréchantillonnage : l'image est calculée plus grande puis réduite, ce qui enlève presque tout le crénelage. En dessous, tu gagnes des images et le réaffûtage rattrape le flou.`
        + (fx ? ` Ici : <b>${Math.round(window.innerWidth * fx._curRatio)}×${Math.round(window.innerHeight * fx._curRatio)}</b> pour une fenêtre de ${window.innerWidth}×${window.innerHeight}.` : ''),
        seg('graphics.res', RESOLUTIONS, g.res || 'auto'));
      html += row('Réaffûtage', `Rend son piquant à l'image quand on calcule en dessous de la résolution de l'écran. Sans effet si tu rends à la taille de l'écran ou au-dessus — réaffûter une image déjà nette ne fait qu'ajouter du crénelage.`, range('graphics.sharp', 0, 0.8, 0.05, g.sharp === undefined ? 0.35 : g.sharp, 'pct'));
      html += row('Échelle de rendu', 'Plafond de résolution interne quand la résolution est sur AUTO (baisser = plus fluide). La résolution dynamique travaille en dessous.', range('graphics.scale', 0.5, 1, 0.05, g.scale, 'pct'));
      html += row('Images par seconde max', 'AUTO : 60 au téléphone (un écran 90 ou 120 Hz calculait deux fois plus d\'images que nécessaire : le téléphone chauffait, se bridait, et le jeu saccadait), sans limite sur ordinateur. 30 : pour un téléphone qui peine ou pour économiser la batterie — une cadence régulière à 30 est plus agréable qu\'une cadence qui oscille entre 35 et 50.',
        seg('graphics.fpsMax', [['auto', 'Auto'], ['30', '30'], ['60', '60'], ['0', 'Sans limite']], String(g.fpsMax || 'auto')));
      html += row('Ombres', 'Taille de la carte d\'ombre du soleil', seg('graphics.shadows', SHADOWS, g.shadows));
      html += row('Occlusion ambiante (GTAO)', 'Ombrage des recoins, coûteux', toggle('graphics.ao', g.ao));
      html += row("Style d'image", "PHOTO (par défaut) : réaliste, le rendu d'un appareil photo par une journée ensoleillée — couleurs justes, lumière franche, matières nettes (bitume, écorce, tenues). VIF : couleurs plus riches, contraste plus franc, textures qui ressortent davantage, façon jeu vidéo. Sans coût, l'un comme l'autre.", seg('graphics.look', [['photo', 'Photo'], ['vif', 'Vif']], g.look || 'photo'));
      html += row('Rendu des couleurs', 'CINÉMA : contrasté et saturé, le rendu d’origine. NATUREL (AgX) : hautes lumières plus douces, couleurs plus proches de ce que voit l’œil.', seg('graphics.tonemap', [['aces', 'Cinéma'], ['agx', 'Naturel']], g.tonemap || 'aces'));
      html += row('Bloom', 'Halo lumineux sur les zones claires', toggle('graphics.bloom', g.bloom));
      html += row('Anticrénelage (SMAA)', 'Lisse les bords', toggle('graphics.aa', g.aa));
      // LOT L12 : les options coûteuses (js/options_rendu.js), chacune mesurée et désactivable. Chaque ligne dit ce qu'elle
      // coûte, et si elle agit SUR CETTE MACHINE (sinon pourquoi) : les deux premières sont réservées aux cartes dédiées.
      if (fx) {
        // (relecture L12 : une case décochée le dit d'abord — sinon la ligne donnait une autre raison, fausse)
        const ici = (actif, pourquoi, coche = true) => (actif ? ' <b>Active ici.</b>' : ` <b>Sans effet ici</b> : ${coche ? pourquoi : 'case décochée'}.`);
        const fort = fx.dev.costaud && !fx.dev.telephone, sansCarte = 'réservé aux cartes graphiques dédiées (pas aux puces intégrées ni aux téléphones)';
        const ud = (window.__game && window.__game.scene && window.__game.scene.userData) || {};
        html += '<div class="opt-group">OPTIONS COÛTEUSES</div>';
        // (coûts mesurés le 01/10 au parc en EXTRÊME, 2,1 Mpx, sur une Radeon intégrée chargée par d'autres onglets — images
        // A et B entrelacées : MSAA +6 à +7 %, occlusion du massif +6 % ; sur une carte dédiée, sous la milliseconde)
        html += row('MSAA x4', 'Quatre échantillons par pixel sur l\'image de la scène, en plus du SMAA : les lattes des bancs, les tubes et les fils au loin ne crénellent plus. Mémoire de l\'image de la scène x4 ; environ 7 % du temps d\'image d\'une puce intégrée, moins d\'une milliseconde sur une carte dédiée.'
          + ici(fx.renderPass.msaa > 0, !fort ? sansCarte : fx.quality === 'low' ? 'pas en basse' : 'image déjà suréchantillonnée au-delà de 5 Mpx', g.msaa !== false),
          toggle('graphics.msaa', g.msaa !== false));
        html += row('Occlusion du feuillage', 'Les arbustes du talus du pin, au parc, reçoivent l\'occlusion ambiante : leurs creux s\'assombrissent, le massif ne fait plus « boules plates ». Un appel de dessin de plus (ce seul massif, 4 400 triangles) ; environ 6 % du temps d\'image d\'une puce intégrée.'
          + ici(!!fx._aoFeuillage && !!ud.feuillageAO, !fort ? sansCarte : !fx.gtao.enabled ? 'il faut l\'occlusion ambiante (HAUTE et au-dessus)' : 'seulement au parc de Bécon', g.aoFeuillage !== false),
          toggle('graphics.aoFeuillage', g.aoFeuillage !== false));
        // (mesuré le 01/10 en extrême : Jemmapes, cinq platanes, 20 appels de dessin de MOINS — deux maillages au lieu de
        // dix clones — et 120 000 triangles de plus toutes passes comprises, +3 % du temps d'image ; Levallois, 9 appels et
        // 4 300 triangles de plus, +5 % quand on regarde l'horizon)
        const decorIci = ['becon', 'jemmapes', 'levallois'].includes(settings.data.game && settings.data.game.terrain);
        html += row('Décor détaillé', 'De vrais platanes, aux branches rondes et à l\'écorce en plaques, pour les deux arbres de l\'enceinte de La Cage et ceux du terrain de Jemmapes ; des immeubles et un rideau d\'arbres qui ferment l\'horizon de Levallois. Quelques pour cent du temps d\'image ; version allégée sur téléphone.'
          + ici(decorIci && g.decor !== false, !decorIci ? 'seulement à La Cage, à Jemmapes et à Levallois' : 'désactivé'),
          toggle('graphics.decor', g.decor !== false));
        html += row('Basse étalonnée', 'En BASSE, l\'image reçoit l\'étalonnage de la météo et du terrain (contraste, teintes du soir, saturation, vignette), dans la passe de sortie, puis le lissage FXAA.'
          + ici(!!(fx.sortieBasse && fx.sortieBasse.enabled), fx.quality !== 'low' ? 'seulement en BASSE (les autres préréglages l\'ont déjà)' : 'désactivée', g.etalonnageBasse !== false),
          toggle('graphics.etalonnageBasse', g.etalonnageBasse !== false));
        html += row('Sonde de lumière du ciel', 'Sans carte d\'environnement (BASSE, MOYENNE sans carte d\'environnement, et le téléphone), la lumière du ciel de La Cage, de Levallois, de Jemmapes et du parc vient de sa photo du ciel résumée en neuf coefficients, au lieu d\'un dégradé plat : le dessous des feuillages et les murs reçoivent la lumière d\'où elle vient. Rien de plus par pixel.'
          + ici(!!(ud.sondeCiel && ud.sondeCiel.active), !ud.sondeCiel ? 'seulement à La Cage, à Levallois, à Jemmapes et au parc de Bécon' : 'seulement sans carte d\'environnement (BASSE, MOYENNE, téléphone)', g.sonde !== false),
          toggle('graphics.sonde', g.sonde !== false));
      }
      html += row('Champ de vision (match)', 'Caméra TV et caméra arrière', range('graphics.fov', 36, 70, 1, g.fov, 'deg'));
      html += row('Distance de caméra (match)', 'Recul des trois caméras de match : demi-terrain, diffusion et derrière le joueur. Plus bas = plus près de l’action, les joueurs sont plus grands ; plus haut = on voit venir davantage. Le suivi latéral se resserre tout seul quand on se rapproche, pour que le ballon reste dans le cadre.',
        range('game.camDist', 0.7, 1.4, 0.05, (settings.data.game && settings.data.game.camDist) || 1, 'pct'));
      html += row('Compteur d\'images', 'Affiche les FPS en haut à gauche', toggle('graphics.fps', g.fps));
      // LES OPTIONS DU PARC DE BÉCON EN ENTIER (lot C5, js/parc/options.js) : elles changent le décor en jouant (les
      // morceaux concernés sont refaits en quelques images), et n'ont d'effet qu'au parc entier — on le dit quand il
      // n'est pas levé, pour qu'on ne cherche pas en vain un miroir d'eau à La Cage.
      const horsParc = PARC_ENTIER ? '' : ' <b>Visible au parc de Bécon en entier</b> (réglage « Parc en entier » ci-dessus).';
      html += '<div class="opt-group">PARC DE BÉCON</div>';
      // le parc en entier ou le plateau seul (js/settings.js, PARC_ENTIER) : lu au chargement, d'où le rechargement
      html += row('Parc en entier', 'EN ENTIER : tout le parc de Bécon autour du plateau, à parcourir à pied, à vélo, à trottinette ou en skate (quai, terrasses, château, fontaines, manège, théâtre…). PLATEAU SEUL : le terrain et ses abords, plus léger. AUTO : en entier sur ordinateur, plateau seul au téléphone. La page se recharge.'
        + (PARC_ENTIER ? ' <b>Aujourd’hui : en entier.</b>' : ' <b>Aujourd’hui : plateau seul.</b>'),
        seg('game.parcMode', [['auto', 'Auto'], ['entier', 'En entier'], ['plateau', 'Plateau seul']], (settings.data.game && settings.data.game.parcMode) || 'auto'));
      html += row('Bassin de la terrasse', 'Le grand bassin au pied du mur des caves. PLANTÉ : gazon et graminées, comme aujourd\'hui. MIROIR D\'EAU : le bassin d\'avant 2016, en eau, avec ses trois grandes gerbes.' + horsParc,
        seg('graphics.parcBassin', [['plante', 'Planté'], ['eau', 'Miroir d\'eau']], g.parcBassin || 'plante'));
      html += row('Saison', 'AUTOMNE : la fin septembre, les feuillages qui jaunissent, les marronniers roussis. PRINTEMPS : les cerisiers du Japon en fleurs roses, les marronniers en fleurs blanches, les parterres de la perspective et le massif de la terrasse en tulipes.' + horsParc,
        seg('graphics.parcSaison', [['automne', 'Automne'], ['printemps', 'Printemps']], g.parcSaison || 'automne'));
    } else if (tab === 'audio') {
      html += row('Volume général', '', range('audio.master', 0, 1, 0.05, a.master, 'pct'));
      html += row('Effets', 'Ballon, cercle, panneau, sifflet', range('audio.sfx', 0, 1, 0.05, a.sfx, 'pct'));
      html += row('Public', 'Ambiance de foule qui suit le momentum', range('audio.crowd', 0, 1, 0.05, a.crowd, 'pct'));
      html += row('Ambiance du parc', 'Parc de Bécon en entier : fontaines, oiseaux, manège, rue du quai', range('audio.ambiance', 0, 1, 0.05, a.ambiance ?? 1, 'pct'));
    } else {
      // COMMANDES TACTILES (js/touch.js) : en tête de l'onglet, au téléphone et à la tablette — c'est là qu'on y joue
      if (IS_TOUCH && c.tactile) {
        const T = c.tactile;
        html += '<div class="opt-group">COMMANDES TACTILES</div>';
        html += row('Taille des boutons', 'Les boutons et le joystick. Les boutons d’action ne descendent jamais sous 48 px.', range('controls.tactile.taille', 0.75, 1.35, 0.05, T.taille, 'pct'));
        html += row('Opacité', 'Plus bas, on voit mieux le terrain derrière les boutons. Un bouton appuyé s’allume toujours en plein.', range('controls.tactile.opacite', 0.25, 1, 0.05, T.opacite, 'pct'));
        html += row('Joystick', 'FLOTTANT : il apparaît sous ton pouce, n’importe où dans la moitié gauche de l’écran. FIXE : toujours au même endroit. Effleure pour marcher, pousse jusqu’au bord pour sprinter (l’anneau s’allume).',
          seg('controls.tactile.stick', [['flottant', 'Flottant'], ['fixe', 'Fixe']], T.stick));
        html += row('Vibrations', 'Un petit retour sous le doigt à chaque appui et au passage en sprint (Android ; Safari sur iPhone ne le permet pas).', toggle('controls.tactile.vibrations', T.vibrations));
        // (à la manette, les commandes tactiles sont masquées : le bouton ne fait rien et la ligne dit pourquoi — css :
        // body.pad-actif .tc-opt-manette ; js/touch.js peutEditer)
        html += row('Disposition', 'Déplace chaque bouton et le joystick au doigt, et règle taille et opacité en voyant le résultat.'
          + '<span class="tc-opt-manette">Manette active : elle masque les commandes tactiles. Touche l’écran pour les déplacer.</span>',
          '<button class="btn-secondary" data-tactile="editer">DÉPLACER LES BOUTONS</button><button class="btn-secondary" data-tactile="raz">RÉINITIALISER</button>');
      }
      html += row('Sensibilité souris', 'Caméra en balade libre', range('controls.sensitivity', 0.1, 3, 0.05, c.sensitivity, 'x'));
      html += row('Inverser l\'axe vertical', '', toggle('controls.invertY', c.invertY));
      html += row('Changement automatique de joueur', 'En défense / balle libre, contrôle le coéquipier le plus proche de la balle', toggle('controls.autoSwitch', c.autoSwitch));
      html += '<div class="opt-group">TOUCHES</div><div class="bind-head"><span>Action</span><span>Principale</span><span>Secondaire</span><span>Manette</span></div>';
      let group = null;
      for (const act of ACTIONS) {
        if (act.group !== group) { group = act.group; html += `<div class="opt-note">${group}</div>`; }
        const b = settings.bindings[act.id], pb = settings.padBindings[act.id];
        // colonne MANETTE : deux emplacements, comme au clavier ; le déplacement appartient au stick gauche
        const padCell = act.stick
          ? `<div class="pad-cell fixe" title="Le stick gauche déplace le joueur : effleure-le pour marcher, pousse-le pour courir">STICK G ${act.stick}</div>`
          : `<div class="pad-cell">${[0, 1].map((s) => `<button class="key-btn pad-btn ${pb[s] ? '' : 'empty'}" data-padbind="${act.id}" data-slot="${s}" title="${pb[s] ? padLabel(pb[s]) : 'libre'}">${pb[s] ? padGlyph(pb[s]) : '—'}</button>`).join('')}</div>`;
        html += `<div class="bind-row"><div class="lbl">${act.label}</div>${[0, 1].map((s) => `<button class="key-btn ${b[s] ? '' : 'empty'}" data-bind="${act.id}" data-slot="${s}">${keyLabel(b[s])}</button>`).join('')}${padCell}</div>`;
      }
      html += '<div class="opt-note">Clique sur une touche puis appuie sur la nouvelle · ÉCHAP annule · RETOUR ARRIÈRE efface l\'emplacement. Une touche déjà utilisée ailleurs est libérée automatiquement. Colonne MANETTE : choisis un emplacement, puis appuie sur le bouton de la manette (un coup de stick droit compte aussi) — ÉCHAP annule, RETOUR ARRIÈRE vide l\'emplacement.</div>';
      html += renderManette(c.pad);
    }
    panels.innerHTML = html;
    panels.querySelectorAll('[data-seg]').forEach((sg) => sg.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        settings.set(sg.dataset.seg, b.dataset.v); render();
        // (le parc en entier se décide au chargement de la page : on recharge, le réglage est déjà sauvegardé)
        if (sg.dataset.seg === 'game.parcMode') setTimeout(() => location.reload(), 150);
      };
    }));
    panels.querySelectorAll('[data-range]').forEach((r) => {
      const val = panels.querySelector(`[data-val="${r.dataset.range}"]`);
      r.oninput = () => { val.textContent = format(r.dataset.fmt, +r.value); };
      r.onchange = () => { settings.set(r.dataset.range, +r.value); };
    });
    panels.querySelectorAll('[data-toggle]').forEach((t) => { t.onclick = () => { settings.set(t.dataset.toggle, !settings.get(t.dataset.toggle)); render(); }; });
    panels.querySelectorAll('[data-bind]').forEach((b) => { b.onclick = () => listen(b); });
    panels.querySelectorAll('[data-padbind]').forEach((b) => { b.onclick = () => listenPad(b); });
    panels.querySelectorAll('[data-tactile]').forEach((b) => {
      b.onclick = () => { if (b.dataset.tactile === 'raz') { settings.resetTactile(); render(); } else cb.onDisposition?.(); };
    });
  }
  // arrête l'écoute en cours (touche ou bouton de manette) et remet son libellé
  function arreter() {
    if (!listening) return;
    const el = listening.el;
    window.removeEventListener('keydown', listening.h, true);
    if (listening.pad) annulerCapture();
    listening = null;
    el.classList.remove('listening');
    if (el.dataset.bind) el.textContent = keyLabel(settings.bindings[el.dataset.bind][+el.dataset.slot]);
    else { const c = settings.padBindings[el.dataset.padbind][+el.dataset.slot]; el.innerHTML = c ? padGlyph(c) : '—'; }
  }
  // Emplacement MANETTE : le prochain bouton pressé (ou coup de stick droit) y est affecté. Au clavier, ÉCHAP
  // annule et RETOUR ARRIÈRE vide l'emplacement. Sans manette branchée, on le dit au lieu d'attendre pour rien.
  function listenPad(btn) {
    arreter();
    const id = btn.dataset.padbind, slot = +btn.dataset.slot;
    if (!infoManette()) { btn.textContent = 'BRANCHE-LA'; setTimeout(() => { if (!listening && !box.hidden) render(); }, 1100); return; }
    btn.classList.add('listening'); btn.textContent = 'APPUIE…';
    const h = (e) => {
      if (e.code !== 'Escape' && e.code !== 'Backspace' && e.code !== 'Delete') return;
      e.preventDefault(); e.stopImmediatePropagation();
      window.removeEventListener('keydown', h, true); annulerCapture(); listening = null;
      if (e.code !== 'Escape') settings.unbindPad(id, slot);
      render();
    };
    listening = { el: btn, h, pad: true };
    window.addEventListener('keydown', h, true);
    capturerBouton((code) => {
      window.removeEventListener('keydown', h, true); listening = null;
      if (code) settings.bindPad(id, slot, code);
      render();
    });
  }
  function listen(btn) {
    arreter();
    btn.classList.add('listening'); btn.textContent = 'APPUIE…';
    const h = (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      window.removeEventListener('keydown', h, true); listening = null;
      const id = btn.dataset.bind, slot = +btn.dataset.slot;
      if (e.code === 'Escape' && id !== 'pause') { render(); return; }
      if (e.code === 'Backspace' || e.code === 'Delete') settings.unbind(id, slot); else settings.bind(id, slot, e.code);
      render();
    };
    listening = { el: btn, h };
    window.addEventListener('keydown', h, true);
  }
  tabs.querySelectorAll('button').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); render(); }; });
  const close = () => { arreter(); box.hidden = true; cb.onClose?.(); };
  $('opt-close').onclick = close; $('opt-ok').onclick = close;
  $('opt-reset').onclick = () => { settings.reset(tab); render(); };
  window.addEventListener('keydown', (e) => { if (!box.hidden && e.code === 'Escape' && !listening) { e.stopImmediatePropagation(); close(); } }, true);
  // À la manette (js/manette_menus.js), B ou un déplacement pendant qu'une case attend une touche du CLAVIER :
  // on annule l'attente, comme ÉCHAP, au lieu de fermer tout le panneau.
  box.addEventListener('pad-annuler', (e) => { if (listening && !listening.pad) { arreter(); e.preventDefault(); } });
  document.addEventListener('hoops-keylayout', () => { if (!box.hidden) render(); });
  return {
    open(startTab = null) { if (startTab) { tab = startTab; tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.tab === tab)); } box.hidden = false; render(); cb.onOpen?.(); },
    close, get isOpen() { return !box.hidden; },
    // une manette vient d'être branchée ou débranchée : l'onglet Commandes affiche son état et ses boutons
    rafraichir() { if (!box.hidden && !listening) render(); },
  };
}

// ---------- HUD ----------
export class HUD {
  constructor() {
    this.el = $('hud');
    this.userName = $('hud-user-name'); this.cpuName = $('hud-cpu-name');
    this.userScore = $('hud-user-score'); this.cpuScore = $('hud-cpu-score');
    this.clock = $('hud-clock'); this.poss = $('hud-poss');
    this.fb = $('hud-feedback'); this.hintEl = $('hud-hint'); this.gainsEl = $('hud-gains');
    this.meterEl = $('meter'); this.meterZone = $('meter-zone'); this.meterFill = $('meter-fill'); this.meterMarkEl = $('meter-mark');
    this.stam = $('stamina-fill');
    this.moUser = $('mo-user'); this.moCpu = $('mo-cpu'); this.moLabel = $('mo-label'); this.moEl = $('momentum');
    this.fireVig = $('fire-vignette'); this.streakEl = $('hud-streak');
    this.ctrlEl = $('hud-ctrl'); this.fpsEl = $('hud-fps'); this.keysEl = $('hud-keys');
    this.coinsEl = $('hud-coins'); this.boostEl = $('hud-boost');
    this._fbTimer = null; this._markTimer = null;
  }
  show() { this.el.hidden = false; }
  hide() { this.el.hidden = true; }
  setNames(u, c) { this.userName.textContent = u; this.cpuName.textContent = c; }
  setScore(u, c) { this.userScore.textContent = u; this.cpuScore.textContent = c; }
  // (06/10/2026) Les trois suivants sont appelés à CHAQUE PAS de la simulation (120 fois par seconde, js/game.js update) :
  // le DOM n'est touché que si la valeur affichée change — sinon chaque écriture refaisait la mise en page de la page.
  setClock(v) { if (v === this._vClock) return; this._vClock = v; this.clock.textContent = v; this.clock.classList.toggle('low', v <= 3); }
  possession(text, mine) {
    if (this.poss.textContent !== text) this.poss.textContent = text;
    if (!!mine !== this._possOn) { this._possOn = !!mine; this.poss.classList.toggle('on', this._possOn); }
  }
  // `cls` : une variante de placement (« sortie » : le rappel de balle à ressortir, js/game.js majAideSortie). Tout
  // autre rappel la retire. `hintTxt` : le texte affiché, que majAideSortie relit pour savoir si un autre l'a remplacé.
  hint(text, cls = '') {
    this.hintTxt = text;
    this.hintEl.textContent = text;
    const c = cls ? 'hint ' + cls : 'hint';
    if (this.hintEl.className !== c) this.hintEl.className = c;
  }
  feedback(text, cls = 'info') {
    this.fb.textContent = text; this.fb.className = 'feedback ' + cls;
    void this.fb.offsetWidth; // relance l'animation
    this.fb.classList.add('pop');
    // Les temps forts vus du joueur passent tous par ici : la manette y accroche ses vibrations (js/manette.js).
    document.dispatchEvent(new CustomEvent('hoops-feedback', { detail: { text, cls } }));
  }
  // Gain immédiat : une ligne « +5 🪙 +3 XP » qui monte à droite. C'est la boucle de récompense qui manquait :
  // avant, on pouvait jouer quatre minutes sans voir le moindre compteur bouger.
  gain(why, coins, xp) {
    if (!this.gainsEl) return;
    const el = document.createElement('div'); el.className = 'gain';
    el.innerHTML = `<span class="why">${why}</span>${coins ? `+${coins} 🪙` : ''}${xp ? `<span class="xp">+${xp} XP</span>` : ''}`;
    this.gainsEl.appendChild(el);
    while (this.gainsEl.children.length > 5) this.gainsEl.removeChild(this.gainsEl.firstChild);
    setTimeout(() => el.remove(), 1600);
  }
  // nom du joueur contrôlé (modes en équipe), affiché brièvement sous la possession
  controlled(name) { this.ctrlEl.textContent = `▶ ${name.toUpperCase()}`; this.ctrlEl.className = 'ctrl-tag'; void this.ctrlEl.offsetWidth; this.ctrlEl.classList.add('pop'); }
  fps(show) { this.fpsEl.hidden = !show; }
  // pièces du porte-monnaie (boutique du marchand) et boost de nourriture en cours
  coins(n, boost = '') {
    const txt = `🪙 ${n}`;
    if (this.coinsEl.textContent !== txt) { this.coinsEl.textContent = txt; this.coinsEl.classList.remove('pop'); void this.coinsEl.offsetWidth; this.coinsEl.classList.add('pop'); }
    this.boostEl.textContent = boost ? `BOOST · ${boost}` : '';
  }
  setFps(v) { if (!this.fpsEl.hidden) this.fpsEl.textContent = `${Math.round(v)} FPS`; }
  meter(show, value = 0, center = 0.72, half = 0.05) {
    this.meterEl.hidden = !show;
    if (!show) return;
    this.meterZone.style.bottom = `${(center - half) * 100}%`;
    this.meterZone.style.height = `${half * 2 * 100}%`;
    this.meterFill.style.height = `${Math.min(100, value * 100)}%`;
  }
  // affiche la position de relâchement pendant 0,8 s
  meterMark(value, center, half) {
    this.meterEl.hidden = false;
    this.meterZone.style.bottom = `${(center - half) * 100}%`;
    this.meterZone.style.height = `${half * 2 * 100}%`;
    this.meterFill.style.height = `${Math.min(100, value * 100)}%`;
    this.meterMarkEl.hidden = false; this.meterMarkEl.style.bottom = `${Math.min(100, value * 100)}%`;
    clearTimeout(this._markTimer);
    this._markTimer = setTimeout(() => { this.meterEl.hidden = true; this.meterMarkEl.hidden = true; }, 800);
  }
  // (au demi-pour-cent : la jauge fait quelques centaines de pixels, on ne voit pas mieux)
  stamina(v) {
    const w = Math.round(Math.max(0, Math.min(100, v)) * 2) / 2;
    if (w !== this._vStam) { this._vStam = w; this.stam.style.width = `${w}%`; }
  }
  // jauges de momentum (0..1) ; "en feu" = jauge pleine (appelé à chaque pas aussi, js/game.js _checkFire)
  momentum(u, c, fireU, fireC) {
    const pu = Math.round(u * 100), pc = Math.round(c * 100), fu = !!fireU, fc = !!fireC;
    if (pu === this._moU && pc === this._moC && fu === this._moFU && fc === this._moFC) return;
    this._moU = pu; this._moC = pc; this._moFU = fu; this._moFC = fc;
    this.moUser.style.width = `${pu}%`; this.moCpu.style.width = `${pc}%`;
    this.moUser.classList.toggle('full', fu); this.moCpu.classList.toggle('full', fc);
    const txt = fu ? '🔥 EN FEU' : fc ? 'ADVERSAIRE EN FEU' : 'MOMENTUM';
    if (this.moLabel.textContent !== txt) this.moLabel.textContent = txt;
    this.moLabel.classList.toggle('fire', fu || fc);
    this.fireVig.classList.toggle('on', fu);
  }
  // petit texte de série sous le feedback (ex. "2 PANIERS DE SUITE")
  streak(text) {
    this.streakEl.textContent = text; this.streakEl.className = 'streak';
    void this.streakEl.offsetWidth; this.streakEl.classList.add('pop');
  }
  // mode balade : pas de tableau de score, bouton "choisir un match" ; rappel des touches d'après les réglages
  setLobby(on, teamSize = 1) {
    this.el.querySelector('.scoreboard').hidden = on;
    this.moEl.hidden = on; this.fireVig.classList.remove('on'); this._moFU = undefined;   // (momentum() réécrira tout)
    $('btn-play').hidden = !on;
    const k = (id) => actionKey(id);
    // À la manette (dernière entrée utilisée), le rappel nomme ses boutons : actionKey les donne déjà ; seuls
    // les sticks, qui n'ont pas de « touche », sont écrits en toutes lettres.
    if (entree.manette) {
      this.keysEl.textContent = on
        ? `STICK G marcher / courir · STICK D caméra · ${k('sprint')} sprint · ${k('shoot')} tir · ${k('spin')} spin · ${k('emote')} emotes · ${k('interact')} marchand · ${k('camera')} vue · ${k('pause')} pause`
        : `STICK G · ${k('sprint')} sprint · ${k('shoot')} tir / vol / contre${teamSize > 1 ? ` · ${k('pass')} passe · ${k('switch')} joueur` : ''} · ${k('spin')} spin · ${padActionLabels('dribble')} feinte · ${k('legs')} jambes · ${k('behind')} dos · ${k('bump')} épaule · ${k('emote')} emotes · ${k('camera')} caméra · ${k('pause')} pause`;
      return;
    }
    const move = `${k('forward')}${k('left')}${k('back')}${k('right')}`;
    this.keysEl.textContent = on
      ? `${move} marcher · souris caméra · ${k('sprint')} sprint · ${k('shoot')} tir · ${k('spin')} spin · ${k('legs')} jambes · ${k('behind')} dos · ${k('dribble')} dribble · ${k('emote')} emotes · ${k('interact')} marchand · ${k('pause')} pause`
      : `${move} · ${k('sprint')} sprint · ${k('shoot')} tir / vol / contre${teamSize > 1 ? ` · ${k('pass')} passe · ${k('switch')} joueur` : ''} · ${k('spin')} spin · ${k('legs')} jambes · ${k('behind')} dos · ${k('emote')} emotes · ${k('camera')} caméra · ${k('pause')} pause`;
  }
}

// ---------- Roue des emotes ----------
export class EmoteWheel {
  constructor(emotes, onPick) {
    this.el = $('emote-wheel'); this.onPick = onPick; this.hovered = null; this.isOpen = false;
    this.setList(emotes);
    // sélection à la souris : direction depuis le centre de la roue
    this._move = (ev) => {
      if (!this.isOpen) return;
      const r = this.el.getBoundingClientRect(), dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < 45) { this.setHover(null); return; }
      const n = this.emotes.length, step = (Math.PI * 2) / n, i = ((Math.round((Math.atan2(dy, dx) + Math.PI / 2) / step) % n) + n) % n;
      this.setHover(i);
    };
    window.addEventListener('mousemove', this._move);
  }

  // (re)construit la roue : le nombre de cases suit les emotes possédées
  setList(emotes) {
    if (this.emotes && this.emotes.length === emotes.length && this.emotes.every((e, i) => e.id === emotes[i].id)) return;
    this.emotes = emotes;
    this.el.innerHTML = '<div class="wheel-center" id="wheel-center">EMOTES</div>';
    this.center = $('wheel-center');
    // Le rayon suit le NOMBRE de secteurs : a deux paliers en dur, neuf emotes se chevauchaient.
    const n = emotes.length, tactile = document.body.classList.contains('touch');
    const seg = tactile ? 88 : 106;
    const R = Math.max(tactile ? 120 : 150, Math.round(((seg + 16) * n) / (2 * Math.PI)));
    this.segs = emotes.map((e, i) => {
      const onPick = this.onPick;
      const b = document.createElement('button'); b.className = 'wheel-seg';
      b.innerHTML = `<span class="num">${i + 1}</span><span class="ico">${e.icon}</span><span class="lbl">${e.label}</span>`;
      const ang = -Math.PI / 2 + (i * Math.PI * 2) / n;
      b.style.left = `calc(50% + ${Math.round(Math.cos(ang) * R)}px)`; b.style.top = `calc(50% + ${Math.round(Math.sin(ang) * R)}px)`;
      b.onmouseenter = () => this.setHover(i);
      b.onclick = (ev) => { ev.stopPropagation(); onPick(i); this.close(); };
      this.el.appendChild(b); return b;
    });
    this.setHover(null);
  }
  open() { this.isOpen = true; this.el.hidden = false; this.setHover(null); }
  close() { this.isOpen = false; this.el.hidden = true; }
  setHover(i) {
    this.hovered = i;
    this.segs.forEach((s, k) => s.classList.toggle('on', k === i));
    this.center.textContent = i === null ? 'EMOTES' : this.emotes[i].label.toUpperCase();
  }
  dispose() { window.removeEventListener('mousemove', this._move); this.close(); }
}

// ---------- Overlay (pause / fin) ----------
// buttons : [{ label, cls: 'btn-primary' | 'btn-secondary', onClick }]
export function showOverlay(title, text, buttons) {
  const o = $('overlay');
  $('overlay-title').textContent = title;
  $('overlay-text').textContent = text;
  const row = $('overlay-buttons'); row.innerHTML = '';
  for (const b of buttons) { const el = document.createElement('button'); el.className = b.cls || 'btn-secondary'; el.textContent = b.label; el.onclick = b.onClick; row.appendChild(el); }
  o.hidden = false;
}
export function hideOverlay() { $('overlay').hidden = true; }

// ---------- Salon en ligne : la PORTE ----------
// Il n'y a plus d'écran de salon avec des cases à cocher. On donne son pseudo, éventuellement l'adresse du serveur,
// et on entre sur le terrain. Tout le reste se passe sur la cour : on s'y croise, on s'y parle, et on lance un match
// en entrant ensemble dans le cercle bleu — comme le hub de NBA 2K.
export function buildOnline(roster, cb = {}) {
  const ident = new Identity();
  let tr = null, room = null;
  let cherche = true;            // la recherche du terrain est en cours : ni « pret » ni « casse »

  const $$ = (id) => $(id);
  const nameEl = $$('on-name'), codeEl = $$('on-code'), srvEl = $$('on-server'), msgEl = $$('on-msg');
  nameEl.value = ident.name;

  // Le conseil depend de l'endroit d'ou l'on joue : chez soi il manque le serveur, en ligne il manque le
  // terrain public. Donner le mauvais des deux, c'est envoyer quelqu'un chercher un fichier qu'il n'a pas.
  const aide = () => (dansLApplication()
    ? 'Le terrain public n’est pas encore en ligne. En attendant, tu peux rejoindre le terrain d’un PC du même wifi : recopie l’adresse qu’affiche Lancer.bat, ou appuie sur CHERCHER SUR LE WIFI.'
    : surReseauLocal()
    // Le deuxieme conseil compte autant que le premier : si une ANCIENNE fenetre noire tient encore le port,
    // relancer Lancer.bat ne peut rien y faire, et le joueur tourne en rond en suivant un conseil correct.
    ? 'Ferme TOUTES les fenêtres noires du jeu, puis relance-le avec Lancer.bat : il ouvre le terrain en même temps que le jeu et affiche l’adresse à donner à tes amis. (Tant qu’une ancienne fenêtre tient le port 8123, la nouvelle ne peut pas ouvrir le terrain.)'
    : 'Le terrain public n’est pas encore en ligne — voir serveur/LISEZMOI.md.');

  const sys = (txt) => { const d = document.createElement('div'); d.className = 'cm sys'; d.textContent = txt; $$('on-chat').appendChild(d); $$('on-chat').scrollTop = 1e6; };
  const line = (m) => { const d = document.createElement('div'); d.className = 'cm'; d.innerHTML = `<b>${esc(m.name)}</b>${esc(m.txt)}`; $$('on-chat').appendChild(d); $$('on-chat').scrollTop = 1e6; };

  function connect(url) {
    if (tr) { try { room && room.leave(); } catch (e) { /* ignore */ } tr.close(); }
    $$('on-chat').innerHTML = '';
    tr = url ? new SocketTransport(url, ident) : new LocalTransport(ident);
    retenirServeur(url);                         // la prochaine fois, il n'aura rien a retaper
    room = new Room(tr, ident, {
      onChange: render,
      onChat: (m) => { line(m); if (m.id !== ident.id) cb.onSalon?.(m); },
      onPos: (m) => cb.onPos?.(m),                 // présence : relayée au jeu (js/presence.js)
      // match en ligne : lancement, commandes des invités, images de l'hôte (js/game.js, « match en ligne »)
      onMatch: (m, from) => cb.onMatch?.(m, from),
      onInput: (m) => cb.onInput?.(m),
      onState: (m) => cb.onState?.(m),
      // matchs en cours (annonces, demandes pour rejoindre ou regarder) et départs du salon (js/enligne.js)
      onMode: (m) => cb.onMode?.(m),
      onLeave: (id) => cb.onLeave?.(id),
      // « Serveur : coupe. » ne dit rien a personne. On dit ce qui se passe ET ce qu'il faut faire.
      onNet: (st) => {
        $$('on-state').textContent = st === 'coupé'
          ? `Pas de réponse de ${url}. ${aide()} (le jeu réessaie tout seul)`
          : st === 'remplace'
            ? 'Ce profil vient d’être repris ailleurs (même identifiant de joueur : un autre onglet, ou le même jeu sur une autre machine). Clique CONNECTER pour reprendre la main.'
            : `Serveur : ${st}.`;
        statut();
        cb.onNet?.(st);          // le jeu aussi doit le savoir : le joueur n'est pas forcement devant ce panneau
      },
    });
    // Cette petite ligne accompagne le CHAMP d'adresse : elle dit ce que devient ce qu'on y tape. Le conseil
    // general, lui, est deja dans le bandeau d'etat juste au-dessus — le repeter ici noyait les deux.
    $$('on-state').textContent = url ? `Connexion à ${url}…` : '';
    // Plus de code de salon a afficher : il n'y en a qu'un, et annoncer un code que personne ne peut utiliser
    // ne fait que donner l'impression qu'on s'est trompe de terrain.
    sys(url ? `Terrain public · ${url}` : 'Hors ligne : tu es seul sur le terrain.');
    montrerAdresses(url);
    cb.onRoom?.(room);
    render();
  }

  // L'adresse a donner a ses amis. On la demande au SERVEUR (lui seul connait ses interfaces reseau) et on
  // ne l'affiche que s'il en a une : un terrain public en ligne n'a rien a partager de ce cote-la.
  async function montrerAdresses(url) {
    const el = $$('on-share');
    el.hidden = true; el.innerHTML = '';
    // Seul un terrain du RESEAU LOCAL a des adresses a partager. Interroger un terrain en ligne pour ca,
    // c'est depenser une requete facturee a chaque connexion pour un champ qu'il ne renverra jamais.
    if (!url || !/^ws:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url)) return;
    let j = null;
    try {
      const u = new URL(String(url).replace(/^ws/, 'http'));
      j = await fetch(new URL('/etat', u.origin), { cache: 'no-store' }).then((r) => r.json());
    } catch (e) { return; }
    const adr = (j && j.adresses) || [];
    if (!adr.length) return;
    // La PREMIERE est celle du vrai wifi (serveur/node.mjs les trie) ; les suivantes sont des cartes moins
    // probables — partage de connexion, second adaptateur. Les presenter a egalite, c'est faire essayer la
    // mauvaise une fois sur deux.
    el.innerHTML = `<b>Adresse à donner à tes amis</b>`
      + `<span class="adr">${esc(adr[0])}</span>`
      + (adr.length > 1 ? `<small class="sinon">si elle ne marche pas : ${adr.slice(1).map((a) => `<span class="adr petite">${esc(a)}</span>`).join(' ')}</small>` : '')
      + `<small>Sur le même wifi que toi, ils ouvrent cette adresse dans leur navigateur, puis JOUER EN LIGNE.`
      + ` Sur un téléphone, tape-la en entier avec le <em>http://</em> devant : sans lui, le téléphone fait une`
      + ` recherche au lieu d’ouvrir la page. Et vérifie qu’il est bien sur le wifi, pas en 4G.</small>`;
    el.hidden = false;
  }

  // L'ETAT DU TERRAIN, EN UNE PHRASE. Il repond a la seule question qu'on se pose avant de cliquer :
  // est-ce que ca marche, et est-ce qu'il y a du monde. Les quatre etats sont volontairement distincts —
  // « on cherche » n'est pas « tu seras seul », et « tu seras seul » n'est pas « c'est casse ».
  function statut() {
    const el = $$('on-statut'), txt = $$('on-statut-txt'), b = $$('on-enter');
    if (!el) return;
    const url = tr && tr.url;
    let cls, phrase, bouton;
    if (cherche) {
      cls = 'cherche'; phrase = 'Recherche du terrain public…'; bouton = 'REJOINDRE LE TERRAIN ▶';
    } else if (!url) {
      cls = 'seul';
      phrase = 'Aucun terrain trouvé — tu joueras seul. ' + aide();
      bouton = 'ENTRER QUAND MÊME ▶';
    } else if (!tr.open) {
      cls = 'casse';
      phrase = `Le terrain ne répond pas. Le jeu réessaie tout seul. ${aide()}`;
      bouton = 'ENTRER QUAND MÊME ▶';
    } else {
      cls = 'pret';
      const n = room ? room.players.length : 0;
      phrase = n > 1
        ? `Terrain public <b>prêt</b> · ${n} joueurs en ligne`
        : 'Terrain public <b>prêt</b> · tu seras le premier';
      bouton = 'REJOINDRE LE TERRAIN ▶';
    }
    el.className = 'on-statut ' + cls;
    txt.innerHTML = phrase;
    if (b) b.textContent = bouton;
    // Le bloc d'adresse n'apparait que quand il sert a quelque chose : pas de terrain, ou un terrain muet.
    const man = $$('on-manuel');
    if (man) man.hidden = (cls === 'pret' || cls === 'cherche');
  }

  function render() {
    if (!room) return;
    statut();
    $$('on-code-show').textContent = room.code;
    // Le compte est TOUJOURS affiche, meme a un : sur un terrain public, savoir qu'on est seul fait partie
    // de l'information. Et le maximum est rappele, pour qu'un refus de connexion ne surprenne personne.
    $$('on-count').textContent = ` · ${room.players.length} / 10 joueurs`;
    const list = $$('on-players'); list.innerHTML = '';
    for (const p of room.players) {
      const d = document.createElement('div');
      d.className = 'on-p';
      d.style.setProperty('--tc', p.id === ident.id ? '#ff7a1a' : '#4d9fff');
      d.innerHTML = `<span class="nm">${esc(p.name)}${p.id === ident.id ? ' (toi)' : ''}</span>${p.host ? '<span class="tag host">hôte</span>' : ''}`;
      list.appendChild(d);
    }
  }

  // on n'annonce le pseudo qu'à la fin de la saisie : sinon chaque frappe renvoyait un message de connexion
  let nameT = null;
  nameEl.oninput = () => { ident.setName(nameEl.value); clearTimeout(nameT); nameT = setTimeout(() => room && room.join(), 350); };
  // On se (re)connecte des que l'adresse saisie n'est plus celle du transport en cours. Sans ce test, taper
  // l'adresse de son serveur puis cliquer REJOINDRE ne faisait rien du tout : un salon local avait deja ete
  // ouvert au chargement de l'ecran, `room` existait donc, et l'adresse n'etait jamais lue. On croyait etre
  // en ligne, on etait tout seul — et rien ne le disait.
  const rebrancher = () => {
    const url = srvEl.value.trim();
    // `!room.off` = Room desabonnee du transport par un leave() definitif : elle n'entend plus rien. Tester
    // seulement l'adresse ne suffisait pas — apres un passage par le menu principal, l'adresse etait la meme,
    // donc on ne reconnectait pas, et le joueur repartait sur le terrain avec un salon mort.
    if (!room || !room.off || (tr && (tr.url || '') !== url)) connect(url);
    return url;
  };

  // On cherche le serveur tout seul, et on s'y branche. C'est la difference entre « le jeu a un mode en
  // ligne » et « le jeu est en ligne » : dans le premier cas il faut savoir quoi taper, dans le second on
  // clique JOUER EN LIGNE et on y est.
  trouverServeur().then((url) => {
    cherche = false;
    if (!url || srvEl.value.trim()) { statut(); return; }   // deja rempli a la main : on n'ecrase pas
    srvEl.value = url;
    connect(url);
  }).catch(() => { cherche = false; statut(); });
  $$('on-new').onclick = () => connect(srvEl.value.trim());
  $$('on-join').onclick = () => {
    const c = codeEl.value.trim().toUpperCase();
    rebrancher();
    if (c && room) { room.code = c; room.join(); sys(`Tu rejoins le salon ${c}.`); render(); }
  };
  $$('on-connect').onclick = () => {
    const url = normaliserAdresse(srvEl.value);
    if (!url) { $$('on-state').textContent = 'Adresse vide. Recopie celle qu’affiche Lancer.bat, du genre http://192.168.1.12:8123'; return; }
    srvEl.value = url;
    cherche = false;
    connect(url);
  };

  // CHERCHER SUR LE WIFI. Le telephone ne connait pas sa propre adresse locale, alors on interroge les plages
  // ou vivent presque tous les reseaux domestiques. C'est long et bruyant : c'est donc un bouton, jamais un
  // reflexe au demarrage.
  $$('on-wifi').onclick = async () => {
    const b = $$('on-wifi');
    if (b.disabled) return;
    b.disabled = true;
    const fini = (t) => { b.disabled = false; b.textContent = 'CHERCHER SUR LE WIFI'; $$('on-state').textContent = t; };
    try {
      const url = await chercherSurLeWifi((faits, total) => {
        b.textContent = `RECHERCHE… ${Math.round((faits / total) * 100)} %`;
      });
      if (url) { srvEl.value = url; cherche = false; connect(url); fini(`Terrain trouvé : ${url}`); }
      else fini('Aucun terrain trouvé sur ce wifi. Vérifie que le PC a bien lancé le jeu avec Lancer.bat, et que le téléphone est sur le même wifi (pas en 4G).');
    } catch (e) { fini('La recherche a échoué.'); }
  };
  $$('on-enter').onclick = () => { rebrancher(); cb.onEnter?.(room); };
  // démonstration : trois joueurs fictifs qui se promènent, pour voir le terrain partagé sans serveur
  $$('on-demo').onclick = () => { rebrancher(); cb.onEnter?.(room, true); };
  $$('on-say').onclick = () => { if (room && msgEl.value.trim()) { room.say(msgEl.value); msgEl.value = ''; } };
  msgEl.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.code === 'Enter') { e.preventDefault(); $$('on-say').click(); } });
  for (const el of [nameEl, codeEl, srvEl]) el.addEventListener('keydown', (e) => e.stopPropagation());

  // Un onglet ferme sans prevenir laisse un joueur fantome dans le salon — d'ou ce `leave`. Mais `pagehide`
  // se declenche AUSSI quand un telephone passe en arriere-plan (mise en cache de la page). Regarder l'heure
  // suffisait donc a sortir du terrain pour de bon. `e.persisted` distingue les deux : page mise de cote (on
  // reviendra) ou page detruite (on ne reviendra pas).
  window.addEventListener('pagehide', (e) => {
    try { room && room.leave(!e.persisted); } catch (e2) { /* ignore */ }
  });
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && room) { try { room.reprendre(); render(); } catch (e2) { /* ignore */ } }
  });
  connect('');
  return {
    get room() { return room; },
    get ident() { return ident; },
    render,
    say: (t) => room && room.say(t),
    // `room = null` n'est pas un detail : sans lui, revenir au menu puis re-cliquer ENTRER SUR LE TERRAIN
    // rendait le joueur invisible pour toujours. leave() l'avait sorti du salon cote serveur ET desabonne
    // cote client, mais `room` existait encore, donc rebrancher() ne reconnectait pas. Tout affichait
    // « Serveur : ouvert » pendant que plus personne ne le voyait et qu'il ne voyait plus personne.
    quit: () => {
      try { room && room.leave(); } catch (e) { /* ignore */ }
      room = null;
      $$('on-players').innerHTML = '';
      $$('on-count').textContent = '';
      $$('on-state').textContent = 'Tu as quitté le terrain. Clique ENTRER SUR LE TERRAIN pour y revenir.';
    },
  };
}

// ---------- Vœux : on débloque les personnages en tirant ----------
// Quatre raretés (bleu 3★, violet 4★, doré 5★, arc-en-ciel 6★), deux garanties, et un doublon qui n'est jamais
// perdu : il monte une capacité signature du personnage et rapporte des pièces. Voir js/gacha.js.
export function buildVoeux(roster, wallet, cb = {}) {
  // Seulement les fiches qui ont un avatar 3D (voir aUnAvatar, 30/09) : les bonshommes ne sont plus proposés
  // nulle part, un vœu qui tomberait sur l'un d'eux donnerait un personnage qu'on ne peut pas jouer.
  roster = roster.filter(aUnAvatar);
  const box = $('menu');

  const carte = (v) => {
    const r = rarete(v.rarete);
    const arc = r.arc ? ' arcbox' : '';
    const nom = r.arc ? `<span class="arc">${esc(v.perso.name)}</span>` : esc(v.perso.name);
    const st = r.arc ? `<span class="arc">${etoiles(v.rarete)}</span>` : etoiles(v.rarete);
    const bas = v.doublon
      ? `<div class="dup">Doublon · +${v.pieces} 🪙${v.capacite ? `<br>capacité <b>${badgeNom(v.capacite)}</b> +1` : ''}</div>`
      : '<div class="neuf">NOUVEAU</div>';
    const img = portraitCache(v.perso.id);
    return `<div class="vx-card${arc}" style="--rc:${r.couleur};animation-delay:${Math.random() * 0.25}s">
      <div class="vx-face">${img ? `<img src="${img}" alt="">` : ''}</div>
      <div class="rar">${r.nom.toUpperCase()}</div><div class="nm">${nom}</div><div class="st">${st}</div>${bas}</div>`;
  };

  const badgeNom = (id) => { const b = BADGES.find((x) => x.id === id); return b ? b.name : id; };

  function render() {
    $('vx-jetons').textContent = `🎟️ ${wallet.jetons} jeton${wallet.jetons > 1 ? 's' : ''}`;
    $('vx-pieces').textContent = `🪙 ${wallet.coins}`;
    // taux RÉELS : une rareté sans personnage reverse son taux à celle du dessous, et le dit clairement
    const tx = tauxReels(roster);
    $('vx-rates').innerHTML = ORDRE.slice().reverse().map((id) => {
      const r = RARETES[id], vide = !roster.some((p) => (RARETE_PERSO[p.id] || 'normal') === id);
      const txt = vide ? "aucun perso pour l'instant" : `${(tx[id] * 100).toFixed(1)} %`;
      return `<span class="vx-rate${vide ? ' vide' : ''}" style="--rc:${r.couleur}">${r.nom} ${etoiles(id)} · ${txt}</span>`;
    }).join('');
    // La garantie « épique » n'a de sens que s'il existe des personnages épiques ; sinon on n'annonce que l'autre.
    const se = wallet.data.sansEpique || 0, sl = wallet.data.sansLegendaire || 0;
    const aEpique = roster.some((p) => RARETE_PERSO[p.id] === 'epique');
    const gLeg = `Légendaire garanti dans <b>${Math.max(1, GARANTIE_LEGENDAIRE - sl)}</b> vœu(x)`;
    $('vx-pity').innerHTML = aEpique
      ? `Épique garanti dans <b>${Math.max(1, GARANTIE_EPIQUE - se)}</b> vœu(x) · ${gLeg}`
      : gLeg;
    // le vœu à dix garantit la plus BASSE rareté au-dessus de normal, pas la plus haute
    const meilleur = ORDRE.find((id) => id !== 'normal' && roster.some((p) => RARETE_PERSO[p.id] === id));
    const sm = $('vx-10').querySelector('small');
    if (sm) sm.textContent = meilleur ? `9 jetons · 1 ${RARETES[meilleur].nom.toLowerCase()} garanti` : '9 jetons';
    $('vx-1').disabled = wallet.jetons < COUT_1;
    $('vx-10').disabled = wallet.jetons < COUT_10;
    $('vx-buy').disabled = wallet.coins < PRIX_JETON;
    $('vx-buy').textContent = `ACHETER UN JETON (${PRIX_JETON} 🪙)`;

    const groupes = collection(roster, wallet.persos);   // les raretés sans personnage ne sont pas affichées
    const total = roster.length, eus = roster.filter((p) => wallet.aPerso(p.id)).length;
    $('vx-count').textContent = `${eus} / ${total}`;
    $('vx-collec').innerHTML = groupes.map((g) => `
      <div>
        <div class="vx-grp-nom${g.rarete.arc ? ' arc' : ''}" style="--rc:${g.rarete.couleur}">${g.rarete.nom} ${etoiles(g.rarete.id)}</div>
        <div class="vx-grid">${g.persos.map((p) => `
          <div class="vx-p${p.possede ? '' : ' locked'}${g.rarete.arc && p.possede ? ' arcbox' : ''}" style="--rc:${g.rarete.couleur}">
            <div class="vx-face sm">${portraitCache(p.def.id) ? `<img src="${portraitCache(p.def.id)}" alt="">` : ''}</div>
            <div class="nm">${p.possede ? esc(p.def.name) : '???'}</div>
            <div class="st">${etoiles(g.rarete.id)}</div>
          </div>`).join('')}</div>
      </div>`).join('');
  }

  function tirer(n) {
    const cout = n === 10 ? COUT_10 : COUT_1;
    if (wallet.jetons < cout) return;
    const etat = wallet.etatVoeux();
    const res = n === 10 ? voeuX10(roster, etat) : [voeu(roster, etat)];
    const pieces = res.reduce((s, v) => s + v.pieces, 0);
    wallet.rangerVoeux(etat, cout, pieces);
    $('vx-cards').innerHTML = res.map(carte).join('');
    $('vx-reveal').hidden = false;
    render();
    cb.onChange?.();
  }

  // les portraits se rendent en tâche de fond ; l'écran se redessine au fur et à mesure qu'ils arrivent
  let prets = false;
  const preparer = () => { if (prets) return; prets = true; prechauffer(roster, () => render()); };

  $('vx-1').onclick = () => tirer(1);
  $('vx-10').onclick = () => tirer(10);
  $('vx-ok').onclick = () => { $('vx-reveal').hidden = true; };
  $('vx-buy').onclick = () => { wallet.acheterJeton(PRIX_JETON); render(); cb.onChange?.(); };
  window.addEventListener('keydown', (e) => {
    if ($('vx-reveal').hidden) return;
    if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') { e.stopImmediatePropagation(); e.preventDefault(); $('vx-reveal').hidden = true; }
  }, true);

  return { render: () => { preparer(); render(); } };
}
