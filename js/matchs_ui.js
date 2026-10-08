// LES MATCHS EN COURS, CÔTÉ ÉCRAN (06/10/2026). La liste vient de js/enligne.js (Matchs) ; ici, seulement ce qu'on en
// montre et les boutons qui s'en servent :
//  - en balade en ligne, sous le bouton du match, MATCHS EN COURS (n) ouvre la liste : chaque match (hôte, taille,
//    score, durée, joueurs, places libres) avec REJOINDRE (une place libre, sur notre terrain) et REGARDER, et en
//    tête PARTIE RAPIDE (le match ouvert le plus animé, sinon un 3 contre 3 ouvert contre l'ordinateur) ;
//  - la même liste dans l'écran du choix du match (blocMatchs), quand on est en ligne ;
//  - en spectateur, un bandeau SPECTATEUR avec REJOINDRE (si une place se libère) et QUITTER ;
//  - la latence, en petit (« 52 ms ») : l'aller-retour jusqu'au relais en balade, l'aller-retour commande -> image de
//    l'hôte pour un invité en match.
// Les éléments sont créés ici plutôt que dans index.html : une page restée en cache (service worker) les a quand même.
// Tout tient au doigt (gros boutons, lignes qui passent à la ligne) et sous 520 px de haut (css/style.css, .mx-*).

const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const duree = (s) => `${Math.floor((s || 0) / 60)}:${String((s || 0) % 60).padStart(2, '0')}`;

// Une ligne de la liste. `actions` : { rejoindre(mid), regarder(mid) } ; `libre` : on peut agir maintenant.
function ligne(a, actions, libre) {
  const d = document.createElement('div');
  d.className = 'mx-ligne' + (a.ici ? '' : ' ailleurs') + (a.mien ? ' mien' : '');
  const qui = a.humains.map((h) => esc(h.nom || 'Joueur')).join(', ');
  const places = a.libres ? `${a.libres} place${a.libres > 1 ? 's' : ''} libre${a.libres > 1 ? 's' : ''}` : 'complet';
  const noms = Array.isArray(a.noms) ? `${esc(a.noms[0])} – ${esc(a.noms[1])}` : '';
  d.innerHTML = `<div class="mx-info"><div class="mx-tete"><b>${esc(a.nomHote || 'Joueur')}</b><span class="mx-taille">${a.size}v${a.size}${a.half ? ' · demi' : ''}</span>`
    + `<span class="mx-score">${a.sc[0]}–${a.sc[1]}</span><small>${noms ? noms + ' · ' : ''}${a.target} pts · ${duree(a.t)}</small></div>`
    + `<div class="mx-qui">👤 ${qui}${a.spect ? ` · 👁 ${a.spect}` : ''} · <span class="${a.libres ? 'ok' : 'non'}">${places}</span>${a.ici ? '' : ' · autre terrain'}${a.mien ? ' · ton match' : ''}</div></div>`;
  const bt = document.createElement('div'); bt.className = 'mx-boutons';
  const b1 = document.createElement('button'); b1.className = 'btn-primary small'; b1.textContent = 'REJOINDRE';
  b1.disabled = !libre || a.mien || !a.ici || !a.libres;
  b1.onclick = () => actions.rejoindre(a.mid);
  const b2 = document.createElement('button'); b2.className = 'btn-secondary small'; b2.textContent = 'REGARDER';
  b2.disabled = !libre || a.mien || !a.ici;
  b2.onclick = () => actions.regarder(a.mid);
  bt.append(b1, b2); d.appendChild(bt);
  return d;
}

function remplir(el, game, actions) {
  const M = game.matchs, L = M ? M.liste() : [];
  el.innerHTML = '';
  if (!L.length) {
    const v = document.createElement('p'); v.className = 'mx-vide';
    v.textContent = 'Aucun match en cours pour l’instant. PARTIE RAPIDE en lance un que les autres pourront rejoindre.';
    el.appendChild(v);
  }
  for (const a of L) el.appendChild(ligne(a, actions, M.libre(a.mid)));
  return L.filter((a) => !a.mien).length;
}

// Le bloc de l'écran du choix du match (js/ui.js, buildMatchSetup) : inséré avant `avant`, visible en ligne seulement.
// `jeu()` rend le jeu : l'écran du match est construit avant lui (js/main.js).
export function creerBlocMatchs(parent, avant, jeu, actions) {
  let bloc = document.getElementById('ms-matchs');
  if (!bloc) {
    bloc = document.createElement('div'); bloc.id = 'ms-matchs'; bloc.className = 'opt-block ms-matchs';
    bloc.innerHTML = '<div class="mx-titre"><h3 id="ms-matchs-titre">MATCHS EN COURS</h3><button class="btn-primary small" id="ms-rapide">⚡ PARTIE RAPIDE</button></div><div class="mx-liste" id="ms-matchs-liste"></div>';
    parent.insertBefore(bloc, avant);
  }
  const liste = bloc.querySelector('#ms-matchs-liste');
  bloc.querySelector('#ms-rapide').onclick = () => actions.rapide();
  const rafraichir = () => {
    const game = jeu();
    bloc.hidden = !game || !game.online;
    if (bloc.hidden) return;
    const n = remplir(liste, game, actions);
    bloc.querySelector('#ms-matchs-titre').textContent = `MATCHS EN COURS (${n})`;
  };
  return { rafraichir };
}

// Le hub : bouton MATCHS EN COURS, panneau de la liste, bandeau du spectateur, latence. Rafraîchis trois fois par
// seconde et à chaque changement de la liste.
export function construireHub(game, actions) {
  const hud = document.getElementById('hud');
  if (!hud) return null;
  const btn = document.createElement('button');
  btn.id = 'btn-matchs'; btn.className = 'btn-secondary matchs-btn'; btn.hidden = true;
  hud.appendChild(btn);
  const ping = document.createElement('div'); ping.id = 'hud-ping'; ping.className = 'hud-ping'; ping.hidden = true;
  hud.appendChild(ping);
  const bandeau = document.createElement('div'); bandeau.id = 'spect-bar'; bandeau.className = 'spect-bar'; bandeau.hidden = true;
  bandeau.innerHTML = '<span class="sb-txt">SPECTATEUR</span><button class="btn-primary small" id="sb-rej">REJOINDRE</button><button class="btn-secondary small" id="sb-quit">QUITTER ✕</button>';
  hud.appendChild(bandeau);
  const panneau = document.createElement('div');
  panneau.id = 'matchs'; panneau.className = 'screen setup mx-ecran'; panneau.hidden = true;
  panneau.innerHTML = '<div class="setup-box mx-box"><header class="screen-head"><h2>MATCHS EN COURS</h2><span class="crumb" id="mx-n"></span></header>'
    + '<div class="mx-rapide"><button class="btn-primary" id="mx-rapide">⚡ PARTIE RAPIDE</button><p>Rejoint le match ouvert le plus animé de ce terrain ; s’il n’y en a pas, lance un 3 contre 3 contre l’ordinateur que les autres pourront rejoindre en prenant la place de ses joueurs.</p></div>'
    + '<div class="mx-liste" id="mx-liste"></div>'
    + '<footer class="screen-foot"><button class="btn-secondary" id="mx-fermer">Retour à la balade</button></footer></div>';
  document.body.appendChild(panneau);
  const listeEl = panneau.querySelector('#mx-liste');

  const ouvert = () => !panneau.hidden;
  const ouvrir = () => {
    panneau.hidden = false; game.input.blocked = true; game.setupOpen = true;
    if (document.pointerLockElement) document.exitPointerLock?.();
    panneau.scrollTop = 0; listeEl.scrollTop = 0;          // (au téléphone, c'est la liste qui défile : elle repart du haut)
    dessiner();
  };
  const fermer = () => {
    if (panneau.hidden) return;
    panneau.hidden = true; game.input.blocked = false; game.setupOpen = false;
  };
  // chaque action ferme d'abord le panneau : le match (ou la demande) part de la balade
  const act = {
    rejoindre: (mid) => { fermer(); actions.rejoindre(mid); },
    regarder: (mid) => { fermer(); actions.regarder(mid); },
    rapide: () => { fermer(); actions.rapide(); },
  };
  const dessiner = () => {
    if (!ouvert()) return;
    const n = remplir(listeEl, game, act);
    panneau.querySelector('#mx-n').textContent = n ? `${n} match${n > 1 ? 's' : ''}` : '';
  };
  btn.onclick = () => ouvrir();
  panneau.querySelector('#mx-fermer').onclick = fermer;
  panneau.querySelector('#mx-rapide').onclick = () => act.rapide();
  window.addEventListener('keydown', (e) => { if (ouvert() && e.code === 'Escape') { e.stopImmediatePropagation(); fermer(); } }, true);
  bandeau.querySelector('#sb-quit').onclick = () => { if (game.reseau && game.reseau.role === 'spect') game.enterLobby(); };
  bandeau.querySelector('#sb-rej').onclick = () => { const R = game.reseau; if (R && R.role === 'spect') actions.rejoindre(R.mid); };

  const maj = () => {
    const R = game.reseau, room = game.online, M = game.matchs;
    const enBalade = game.mode === 'lobby' && !!room && !game.paused;
    // le panneau ne survit pas à un départ en match (match rejoint, lancé par un autre...)
    if (ouvert() && game.mode !== 'lobby') fermer();
    const n = M ? M.liste().filter((a) => !a.mien).length : 0;
    btn.hidden = !enBalade || (game.setupOpen && !ouvert());
    const txt = `MATCHS EN COURS (${n})`;
    if (btn.textContent !== txt) btn.textContent = txt;
    btn.classList.toggle('vide', !n);
    // spectateur
    const spect = game.mode === 'match' && R && R.role === 'spect';
    bandeau.hidden = !spect;
    if (spect) {
      const a = M && M.reg.get(R.mid);
      const t = `SPECTATEUR · ${String((a && a.nomHote) || '').toUpperCase()}`;
      const s = bandeau.querySelector('.sb-txt'); if (s.textContent !== t) s.textContent = t;
      bandeau.querySelector('#sb-rej').hidden = !(a && a.places.length && a.ici !== false && M.memeTerrain(a));
    }
    // latence
    const tr = room && room.tr;
    const montre = !!(tr && tr.url && tr.open && (game.mode === 'lobby' || game.mode === 'match'));
    let ms = null;
    if (montre) ms = R && R.role === 'client' && R.lag !== null ? R.lag : room.latence;
    ping.hidden = !montre || ms === null;
    if (!ping.hidden) {
      const t = `${Math.round(ms)} ms`;
      if (ping.textContent !== t) ping.textContent = t;
      ping.className = 'hud-ping ' + (ms < 90 ? 'bon' : ms < 170 ? 'moyen' : 'mauvais');
      ping.title = R && R.role === 'client' ? 'aller-retour commande → image de l’hôte' : 'aller-retour jusqu’au terrain';
    }
  };
  setInterval(maj, 300);
  if (game.matchs) { const avant = game.matchs.surChange; game.matchs.surChange = () => { avant?.(); dessiner(); maj(); }; }
  maj();
  return { ouvrir, fermer, dessiner, get ouvert() { return ouvert(); } };
}
