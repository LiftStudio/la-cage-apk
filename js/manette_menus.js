// MENUS À LA MANETTE. Tous les écrans du jeu sont du HTML (js/ui.js, js/phone.js) pensés pour la souris et le doigt.
// Plutôt que de leur apprendre la manette un par un, on les pilote tous de la même façon, de l'extérieur :
//   - on cherche l'écran du DESSUS (le plus haut z-index visible) : c'est la « racine » ;
//   - un FOCUS visible (classe .pad-focus) se pose sur un de ses éléments cliquables ;
//   - la croix ou le stick gauche le déplacent vers le voisin le plus proche dans la direction demandée
//     (navigation SPATIALE, d'après les rectangles à l'écran : aucune liste d'écran à tenir à jour) ;
//   - A (ou START) clique, B revient en arrière comme ÉCHAP, LB / RB (et les gâchettes) changent d'onglet,
//     le stick droit fait défiler.
// Quand un écran se redessine (innerHTML), l'élément focalisé disparaît : on retrouve le même (même identifiant,
// même touche, même onglet…), sinon celui qui occupe la même place.
import { PAD_BOUTONS, entree } from './settings.js';

const I = Object.fromEntries(PAD_BOUTONS.map((n, i) => [n, i]));
const CLIQUABLES = 'button, input:not([type=hidden]), select, textarea, summary, a[href], [data-toggle]';
// du dessus vers le dessous (z-index de css/style.css : révélation des vœux 60, téléphone 45, options 40,
// pause / fin 30, boutique et choix du match 25, menu principal 20)
// (`matchs` : la liste des matchs en cours du hub en ligne, js/matchs_ui.js, même étage que le choix du match)
const RACINES = ['vx-reveal', 'phone', 'options', 'overlay', 'shop', 'matchsetup', 'matchs', 'menu'];
// B = le bouton « retour / fermer » de chaque écran (le premier VISIBLE de la liste)
const RETOUR = { 'vx-reveal': '#vx-ok', phone: '#phone-close', options: '#opt-close', shop: '#shop-close',
  matchsetup: '#ms-cancel, #ms-back', matchs: '#mx-fermer', menu: '.back' };
// où poser le focus en arrivant sur un écran (le premier qui existe) : ce qui est déjà choisi, sinon l'action
// principale. « .back » passe avant « .btn-primary » : sur une page de texte (aide, crédits) le bouton principal est
// tout en bas, s'y poser ferait défiler la page jusqu'à la fin avant qu'on l'ait lue.
const DEFAUTS = ['.pick.selected', '.terrain-card.selected', '.nav-btn.primary', '.mode-card.selected',
  '#opt-panels button, #opt-panels [data-toggle], #opt-panels input', '#shop-grid button', '.phone-q',
  '.plan-lieu.sel .plan-nom', '.plan-nom', '#vx-ok',
  '#vx-10', '#on-enter', '#ms-start', '.back', '.btn-primary'];
// répétition quand on tient une direction : premier pas tout de suite, puis après 0,4 s, puis toutes les 0,1 s
const REPET_1 = 0.4, REPET_N = 0.1;

// Visible pour de vrai. checkVisibility (Chrome, WebView récente) sait aussi qu'un bouton rangé dans un <details>
// FERMÉ ne se voit pas — getClientRects, lui, lui trouve encore une place.
const estVisible = (el) => {
  if (!el || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') return false;
  if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true })) return false;
  const d = el.closest('details');
  return !d || d.open || (el.tagName === 'SUMMARY' && el.parentElement === d);
};
const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

// Identité stable d'un élément, pour le retrouver après un innerHTML (null = pas d'identité : on ira au plus proche)
function signature(el) {
  const d = el.dataset || {};
  if (el.id) return '#' + el.id;
  if (d.bind) return `bind:${d.bind}:${d.slot}`;
  if (d.padbind) return `pad:${d.padbind}:${d.slot}`;
  if (d.toggle) return 'toggle:' + d.toggle;
  if (d.range) return 'range:' + d.range;
  if (d.tab) return 'tab:' + d.tab;
  if (d.v !== undefined && el.parentElement && el.parentElement.dataset.seg) return `seg:${el.parentElement.dataset.seg}:${d.v}`;
  if (d.go) return 'go:' + d.go;
  return null;
}

// Le conteneur qui fait défiler un élément (le panneau des options, la liste des joueurs…), ou la racine.
function conteneur(el, racine, cache) {
  const trouve = [];
  let res = racine;
  for (let e = el.parentElement; e && e !== racine; e = e.parentElement) {
    if (cache.has(e)) { res = cache.get(e); break; }
    trouve.push(e);
    const oy = getComputedStyle(e).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && e.scrollHeight > e.clientHeight + 2) { res = e; break; }
  }
  for (const e of trouve) if (e !== res) cache.set(e, res);
  return res;
}

// Le voisin dans une direction. On cherche d'abord DANS le conteneur qui défile autour du focus, même hors de
// sa partie visible : c'est ce qui fait descendre ligne par ligne dans le panneau des options au lieu de sauter
// sur le bouton OK du bas, qui est géométriquement plus près que la ligne cachée sous le pli. Ce n'est qu'au bout
// du conteneur qu'on en sort.
// Un AUTRE conteneur qui défile compte, lui, comme UN seul bloc, choisi d'après son cadre : on y entre ensuite
// par le bord qu'on franchit (entrer). Avant, seuls ses éléments visibles comptaient : panneau des options
// descendu jusqu'à sa note de fin, où le seul réglage visible est un interrupteur tout à droite, la barre
// d'onglets passait directement au pied de page (et le pied aux onglets) — tout le panneau était sauté.
function voisin(cur, dir, liste, racine) {
  const cache = new Map(), cc = conteneur(cur, racine, cache);
  const dedans = [], dehors = [], blocs = new Map();
  for (const el of liste) {
    if (el === cur) continue;
    const c = conteneur(el, racine, cache);
    if (c === cc) dedans.push(el);
    else if (c === racine || c.contains(cc)) dehors.push(el);
    else { if (!blocs.has(c)) blocs.set(c, []); blocs.get(c).push(el); }
  }
  // (au niveau de l'écran lui-même, il n'y a pas de « dedans » à épuiser d'abord : tout se départage sur la carte)
  const n = cc === racine ? null : plusProche(cur, dir, dedans);
  if (n) return n;
  const cible = plusProche(cur, dir, [...(cc === racine ? dedans : []), ...dehors, ...blocs.keys()]);
  return cible && blocs.has(cible) ? entrer(cible, dir, blocs.get(cible), cur) : cible;
}
// On entre dans le conteneur `c` (qui défile) en allant vers `dir` : la ligne la plus proche du bord franchi —
// en haut de sa partie visible si l'on descend, en bas si l'on monte, la ligne à hauteur du focus si l'on va sur
// le côté —, et dans cette ligne l'élément le plus proche du focus. Rien de cliquable dans la partie visible (une
// longue note) : le plus proche de ce bord, et poser le focus le fera défiler.
function entrer(c, dir, items, cur) {
  const cr = c.getBoundingClientRect(), a = centre(cur.getBoundingClientRect());
  const vus = items.filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > cr.top + 4 && r.top < cr.bottom - 4; });
  const pool = vus.length ? vus : items;
  const bord = (el) => {
    const r = el.getBoundingClientRect();
    return dir === 'down' ? Math.abs(r.top - cr.top) : dir === 'up' ? Math.abs(cr.bottom - r.bottom) : Math.abs(centre(r).y - a.y);
  };
  const m = Math.min(...pool.map(bord));
  let best = null, bs = Infinity;
  for (const el of pool) {
    if (bord(el) > m + 12) continue;
    const r = el.getBoundingClientRect();
    const s = dir === 'right' ? r.left : dir === 'left' ? -r.right : Math.abs(centre(r).x - a.x);
    if (s < bs) { bs = s; best = el; }
  }
  return best;
}
// Parmi les éléments qui sont VRAIMENT de ce côté (leur centre au-delà de notre bord), le meilleur voisin :
//   - en vertical, d'abord la LIGNE la plus proche, puis dans cette ligne l'élément le plus proche en x. Les
//     écrans sont presque tous des listes de lignes (options, boutique, menus) : « bas » veut dire la ligne
//     suivante, même si son bouton est décalé, pas le bouton aligné cinq lignes plus bas ;
//   - en horizontal, le plus proche le long de la direction, la dérive verticale comptant triple, et seulement
//     dans un cône de 45° : au bout d'une ligne, « droite » ne remonte pas chercher un bouton trois lignes plus haut.
function plusProche(cur, dir, liste) {
  const a = cur.getBoundingClientRect(), ca = centre(a);
  const horiz = dir === 'left' || dir === 'right', s = dir === 'right' || dir === 'down' ? 1 : -1;
  const cands = [];
  for (const el of liste) {
    if (el === cur || el.contains(cur) || cur.contains(el)) continue;
    const r = el.getBoundingClientRect(), c = centre(r);
    if (!r.width && !r.height) continue;
    const passe = horiz ? (s > 0 ? c.x > a.right - 2 : c.x < a.left + 2) : (s > 0 ? c.y > a.bottom - 2 : c.y < a.top + 2);
    if (!passe) continue;                                                     // pas de ce côté-là
    // écart entre les bords dans la direction, et décalage sur l'autre axe (0 si les deux se chevauchent)
    const prim = horiz ? Math.max(0, s > 0 ? r.left - a.right : a.left - r.right) : Math.max(0, s > 0 ? r.top - a.bottom : a.top - r.bottom);
    const sec = horiz ? Math.max(0, r.top - a.bottom, a.top - r.bottom) : Math.max(0, r.left - a.right, a.left - r.right);
    const perp = Math.abs(horiz ? c.y - ca.y : c.x - ca.x), main = Math.abs(horiz ? c.x - ca.x : c.y - ca.y);
    if (horiz && sec > 0 && perp > main) continue;                            // hors du cône
    cands.push({ el, prim, sec, perp, main });
  }
  if (!cands.length) return null;
  let pool = cands;
  if (!horiz) {
    // en vertical le cône est large (et seulement préféré) : il écarte l'autre colonne d'un écran à deux
    // colonnes (en ligne : réglages à gauche, salon à droite) sans empêcher de descendre vers un bouton décalé
    const cone = cands.filter((k) => k.sec === 0 || k.perp <= k.main * 3 + 40);
    if (cone.length) pool = cone;
    const m = Math.min(...pool.map((k) => k.prim));
    // La ligne ALIGNÉE (qui chevauche le focus en x : la même colonne) l'emporte sur une ligne à peine plus
    // proche mais décalée. En ligne, « bas » depuis « Réglages avancés » allait au champ du salon, dans l'autre
    // colonne, parce qu'il est un peu plus haut que « REJOINDRE LE TERRAIN », juste en dessous.
    const alignes = pool.filter((k) => k.sec === 0);
    const ma = alignes.length ? Math.min(...alignes.map((k) => k.prim)) : Infinity;
    pool = ma > m + 12 && ma <= m + 160 ? alignes.filter((k) => k.prim <= ma + 12) : pool.filter((k) => k.prim <= m + 12);
  }
  let best = null, bs = Infinity;
  for (const k of pool) {
    const score = (horiz ? k.prim : 0) + k.sec * 3 + k.perp * 0.25;
    if (score < bs) { bs = score; best = k.el; }
  }
  return best;
}

// le conteneur qui défile autour d'un élément (liste de la boutique, panneau des options, écran du menu…)
function defilable(el, racine) {
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    const oy = getComputedStyle(e).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && e.scrollHeight > e.clientHeight + 2) return e;
    if (e === racine) break;
  }
  return null;
}

export class NavMenus {
  constructor(manette) {
    this.m = manette;
    this.cur = null;            // élément focalisé
    this.cle = null;            // écran courant (racine + sous-écran)
    this.racineCur = null;
    // dernier élément focalisé par écran { racine, el } : on y revient en revenant sur l'écran (options fermées →
    // retour sur le bouton Options de la pause). Oublié quand l'écran se FERME : rouvert plus tard, il repart de
    // son élément par défaut (« Reprendre », le mode déjà choisi…).
    this.memo = new Map();
    this.sig = null; this.pos = null;
    this.rep = { dir: null, t: 0, stick: false };
    this.rangeT = null;
  }

  // Les écrans ouverts, du dessus vers le dessous. racine() = le premier, ou null quand on est sur le terrain.
  ouvertes() {
    const l = [];
    for (const id of RACINES) {
      const el = document.getElementById(id);
      if (!el || el.hidden) continue;
      if (id === 'phone' && !el.classList.contains('on')) continue;     // il glisse encore vers sa poche
      if (el.getClientRects().length) l.push(el);
    }
    return l;
  }
  racine() { return this.ouvertes()[0] || null; }
  // on retourne sur le terrain : le cadre s'efface et les écrans fermés sont oubliés
  quitter() { this.poser(null); this.cle = null; this.racineCur = null; this.oublierFermes(); }
  oublierFermes() {
    const ouv = this.ouvertes();
    for (const [k, v] of this.memo) if (!ouv.includes(v.racine)) this.memo.delete(k);
  }
  // Un même écran HTML peut en contenir plusieurs (le menu principal : accueil, choix du joueur, vœux…).
  cleDe(racine) {
    const ms = racine.id === 'matchsetup' ? (document.getElementById('ms-teams')?.hidden ? 'mode' : 'equipes') : '';
    return racine.id + ':' + (racine.dataset.screen || '') + ms;
  }
  liste(racine) {
    return [...racine.querySelectorAll(CLIQUABLES)].filter((el) => !el.disabled && estVisible(el));
  }
  defaut(racine, liste) {
    const mem = (this.memo.get(this.cle) || {}).el;
    if (mem && liste.includes(mem)) return mem;
    for (const s of DEFAUTS) { const el = liste.find((e) => e.matches(s)); if (el) return el; }
    return liste[0] || null;
  }

  poser(el, defiler = true) {
    if (this.cur === el) return;
    if (this.cur) this.cur.classList.remove('pad-focus');
    this.cur = el;
    if (!el) return;
    el.classList.add('pad-focus');
    this.memo.set(this.cle, { racine: this.racineCur, el });
    this.sig = signature(el); this.pos = centre(el.getBoundingClientRect());
    if (defiler) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  // Le focus est-il toujours valable ? Écran changé : on repart du souvenir ou du défaut. Écran redessiné : on
  // retrouve le même élément, ou celui qui a pris sa place.
  verifier(racine) {
    const cle = this.cleDe(racine);
    if (cle !== this.cle) { this.cle = cle; this.racineCur = racine; this.poser(null); this.oublierFermes(); }
    const el = this.cur;
    if (el) {
      if (!el.isConnected || el.disabled) this.poser(this.retrouver(racine), false);
      else if (!racine.contains(el) || !estVisible(el)) this.poser(null);
      else this.pos = centre(el.getBoundingClientRect());
    }
    if (!this.cur && entree.manette) this.poser(this.defaut(racine, this.liste(racine)));
  }
  retrouver(racine) {
    const liste = this.liste(racine);
    if (this.sig) { const el = liste.find((e) => signature(e) === this.sig); if (el) return el; }
    if (!this.pos) return null;
    let best = null, bd = Infinity;
    for (const e of liste) { const c = centre(e.getBoundingClientRect()), dd = Math.hypot(c.x - this.pos.x, c.y - this.pos.y); if (dd < bd) { bd = dd; best = e; } }
    return best;
  }

  // ------------------------------------------------------------------------------------------------------------
  // Une image de manette sur un écran de menu. `bas` : boutons enfoncés (hors boutons muets) ; `fronts` : index des
  // boutons qui viennent d'être enfoncés ; `g` / `d` : sticks après zone morte.
  // `reveil` : première image à la manette après la souris ou le clavier. Le focus réapparaît là où il était (ou
  // sur l'élément par défaut) et l'appui s'arrête là : on ne clique pas un bouton qu'on n'a pas encore vu.
  traiter(racine, bas, fronts, g, d, dt, reveil = false) {
    this.verifier(racine);
    // direction : la croix d'abord, sinon le stick gauche (avec hystérésis pour ne pas hésiter à 45°)
    let dir = bas[I.Up] ? 'up' : bas[I.Down] ? 'down' : bas[I.Left] ? 'left' : bas[I.Right] ? 'right' : null;
    let stick = false;
    if (!dir && (g.brut > 0.5 || (this.rep.stick && this.rep.dir && g.brut > 0.3))) {
      stick = true;
      dir = Math.abs(g.x) > Math.abs(g.y) ? (g.x < 0 ? 'left' : 'right') : (g.y < 0 ? 'up' : 'down');
    }
    if (reveil) {
      if (this.cur) this.cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      this.rep = { dir, t: 0, stick };
      return;
    }
    if (dir !== this.rep.dir) { this.rep = { dir, t: 0, stick }; if (dir) this.deplacer(racine, dir); }
    else if (dir) { this.rep.t += dt; while (this.rep.t >= REPET_1) { this.deplacer(racine, dir); this.rep.t -= REPET_N; } }

    for (const i of fronts) {
      if (i === I.A || (i === I.Start && racine.id !== 'overlay')) this.activer(racine);
      else if (i === I.B) this.retour(racine);
      else if (i === I.LB || i === I.LT) this.onglet(racine, -1);
      else if (i === I.RB || i === I.RT) this.onglet(racine, 1);
      // X, Y, L3, R3 : libres sur les menus, l'écran peut s'en servir (le plan du téléphone : zoom et recentrage)
      else if (i === I.X || i === I.Y || i === I.L3 || i === I.R3) racine.dispatchEvent(new CustomEvent('pad-bouton', { detail: { nom: PAD_BOUTONS[i] } }));
    }
    // Le stick droit peut être pris par l'écran : la carte de l'appli Plan du téléphone (js/plan_parc.js) s'y déplace,
    // en annulant l'événement « pad-stick ». Sinon, il fait défiler, comme avant.
    if (Math.abs(d.x) > 0.05 || Math.abs(d.y) > 0.05) {
      const ev = new CustomEvent('pad-stick', { cancelable: true, detail: { x: d.x, y: d.y, dt } });
      racine.dispatchEvent(ev);
      if (ev.defaultPrevented) return;
    }
    // stick droit : défilement du conteneur (longs textes des crédits, aide, liste de la boutique)
    if (Math.abs(d.y) > 0.05) {
      const sc = defilable(this.cur || racine, racine) || (racine.scrollHeight > racine.clientHeight + 2 ? racine : null);
      if (sc) sc.scrollTop += d.y * 1400 * dt;
    }
  }

  deplacer(racine, dir) {
    const liste = this.liste(racine);
    if (!this.cur || !liste.includes(this.cur)) { this.poser(this.defaut(racine, liste)); return; }
    // on quitte une case de touche qui attendait le CLAVIER (options) : elle arrête d'attendre
    this.annulerEcoute(racine);
    // sur un curseur (volume, sensibilité…), gauche / droite changent la valeur au lieu de quitter la ligne
    if (this.cur.type === 'range' && (dir === 'left' || dir === 'right')) { this.ajuster(this.cur, dir === 'right' ? 1 : -1); return; }
    const n = voisin(this.cur, dir, liste, racine);
    // Une page de TEXTE (aide, crédits) : le prochain bouton est tout en bas, bien au-delà de l'écran. Y sauter
    // d'un coup ferait défiler toute la page sans qu'on l'ait lue ; on la fait donc défiler d'un bon morceau, et
    // l'on ne se pose sur le bouton que lorsqu'il arrive à portée.
    if (n && (dir === 'up' || dir === 'down') && this.defilerVers(n, dir, racine)) return;
    if (n) {
      // on quitte un champ de saisie à la manette : il perd la main (sinon le clavier virtuel resterait ouvert)
      const act = document.activeElement;
      if (act && act !== n && (act.tagName === 'INPUT' || act.tagName === 'TEXTAREA')) act.blur();
      this.poser(n);
    } else if (dir === 'up' || dir === 'down') {
      // plus rien dans cette direction : on fait défiler (une page de texte sans bouton au milieu)
      const sc = defilable(this.cur, racine);
      if (sc) sc.scrollTop += dir === 'down' ? 160 : -160;
    }
  }

  // `n` est-il loin au-delà du bord de son conteneur (plus de 40 % de sa hauteur visible) ? Alors on fait défiler
  // d'un morceau (60 %) au lieu d'y sauter. Faux quand il n'y a plus rien à faire défiler : on y va.
  defilerVers(n, dir, racine) {
    const sc = defilable(n, racine);
    if (!sc) return false;
    const cr = sc.getBoundingClientRect();
    const haut = Math.max(cr.top, 0), bas = Math.min(cr.bottom, window.innerHeight), h = bas - haut;
    if (h < 80) return false;
    const r = n.getBoundingClientRect(), hors = dir === 'down' ? r.bottom - bas : haut - r.top;
    if (hors <= h * 0.4) return false;
    const avant = sc.scrollTop;
    sc.scrollTop += (dir === 'down' ? 1 : -1) * Math.min(hors, h * 0.6);
    return sc.scrollTop !== avant;
  }

  // Une case de touche des options attend une touche du CLAVIER (on l'a ouverte avec A) : B ou un déplacement
  // l'annulent, comme ÉCHAP — avant, B fermait tout le panneau des options. L'écran concerné le signale en
  // annulant l'événement (js/ui.js, buildOptions) ; vrai si une attente a été annulée.
  annulerEcoute(racine) {
    const ev = new CustomEvent('pad-annuler', { cancelable: true });
    racine.dispatchEvent(ev);
    return ev.defaultPrevented;
  }

  activer(racine) {
    const el = this.cur;
    if (!el || !el.isConnected) { this.poser(this.defaut(racine, this.liste(racine))); return; }
    // champ de texte : on y entre (clavier physique, ou clavier virtuel sur téléphone)
    if ((el.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button', 'submit'].includes(el.type)) || el.tagName === 'TEXTAREA') { el.focus(); return; }
    if (el.type === 'range') return;
    el.click();
  }

  // B : fermer / revenir. Un champ de saisie ouvert se referme d'abord. Sur l'écran de pause (et les écrans
  // d'atelier), c'est le bouton PAUSE du jeu qu'on « tape » : même effet qu'ÉCHAP, quelle que soit sa touche.
  retour(racine) {
    if (this.annulerEcoute(racine)) return;
    const act = document.activeElement;
    if (act && racine.contains(act) && (act.tagName === 'INPUT' || act.tagName === 'TEXTAREA')) { act.blur(); return; }
    if (racine.id === 'overlay') { this.m.taperAction('pause'); return; }
    const sel = RETOUR[racine.id];
    const el = sel && [...racine.querySelectorAll(sel)].find(estVisible);
    if (el) el.click();
  }

  // LB / RB : onglet précédent / suivant (options, boutique)
  onglet(racine, sens) {
    const nav = [...racine.querySelectorAll('.tabs')].find(estVisible);
    if (!nav) return;
    const bs = [...nav.querySelectorAll('button')].filter((b) => !b.disabled);
    if (!bs.length) return;
    let i = bs.findIndex((b) => b.classList.contains('on'));
    if (i < 0) i = 0;
    const b = bs[(i + sens + bs.length) % bs.length];
    const surOnglets = this.cur && nav.contains(this.cur);
    b.click();
    // Le focus suit : sur la barre d'onglets s'il y était, sinon au premier réglage du nouvel onglet.
    if (surOnglets) this.poser(b);
    else { this.poser(null); this.memo.delete(this.cle); this.verifier(racine); }
  }

  ajuster(el, sens) {
    const st = parseFloat(el.step) || 0.01, min = parseFloat(el.min), max = parseFloat(el.max);
    let v = Math.round((parseFloat(el.value) + st * sens) / st) * st;
    v = +Math.max(Number.isFinite(min) ? min : -Infinity, Math.min(Number.isFinite(max) ? max : Infinity, v)).toFixed(4);
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    // la sauvegarde (et tout ce qu'elle recalcule) attend qu'on ait fini de tenir la direction
    clearTimeout(this.rangeT);
    this.rangeT = setTimeout(() => el.dispatchEvent(new Event('change', { bubbles: true })), 280);
  }
}
