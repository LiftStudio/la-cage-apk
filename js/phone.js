// Téléphone (comme dans GTA) : on le sort d'une touche, il glisse dans le coin de l'écran et donne accès au groupe de
// messages « LA CAGE ». Le joueur écrit, les autres du roster répondent. Les événements du jeu (victoire, défaite, dunk,
// achat, panier en balade) déclenchent des messages : le groupe réagit à ce qu'on vient de faire.
// Tout est local (localStorage) : quand les serveurs en ligne existeront, il suffira de brancher push() sur le réseau.
//
// DEUX APPLIS (lot C2 du parc entier) : au dock du bas, le groupe « LA CAGE » et le PLAN du parc (js/plan_parc.js :
// la carte du parc de Bécon en entier, ses lieux, les amis, et « Y aller »). Hors du parc entier, l'appli Plan dit
// seulement que le plan n'existe qu'au parc. Le dock est une barre d'onglets : LB / RB passent de l'une à l'autre à
// la manette (js/manette_menus.js). Un message qui arrive pendant qu'on regarde le plan allume une pastille sur
// l'onglet des messages.
import { PlanParc } from './plan_parc.js';

const KEY = 'hoops.phone.v1';
const MAX = 80;

const REPLIES = {
  hello: ['yo', 'wesh', 'salut les gars', 'présent', 'je suis là'],
  hype: ['ça joue ?', 'on se fait un 3v3 ?', 'je descends dans 5 min', 'qui est à la cage ?'],
  win: ['GG 🔥', 'tranquille', 'trop fort', 'la cage est à toi', 'bien joué frérot', 'imparable aujourd\'hui'],
  lose: ['dur', 'la prochaine', 'on remet ça ?', 'c\'était serré', 'tu l\'auras la prochaine'],
  dunk: ['OOOOH 😱', 'il a planté le cercle', 'le panier a tremblé', 'clip ça', 'mais c\'est quoi ce dunk'],
  shop: ['stylé le nouveau ballon', 'tu t\'es équipé ?', 'le marchand fait des affaires', 'joli'],
  rain: ['il pleut, ça glisse', 'je prends un k-way', 'terrain mouillé, attention'],
  idle: ['quelqu\'un à la cage ?', 'je passe ce soir', 'j\'ai le ballon', 'faut qu\'on rejoue', 'toujours pas remis du dernier match'],
};
const QUICK = ['Yo 👋', 'Qui joue ?', 'Je suis à la cage', 'GG', 'On se fait un 1v1 ?', '🔥'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const $ = (id) => document.getElementById(id);
// La hauteur de l'encoche et de la barre d'état (env(safe-area-inset-top), par la variable --sa-t de css/style.css ;
// 0 sur un écran sans encoche), mesurée sur un élément témoin : une variable CSS ne se lit pas en pixels.
const zoneHaute = () => {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;top:0;left:0;width:0;height:var(--sa-t, 0px);visibility:hidden;pointer-events:none';
  document.body.appendChild(d); const h = d.offsetHeight; d.remove(); return h;
};

export class Phone {
  // roster : les fiches des joueurs, ils forment le groupe ; cb.onOpen / cb.onClose bloquent les commandes du jeu
  constructor(roster, cb = {}) {
    this.cb = cb;
    // tous les copains qui ont un avatar 3D, sauf Haythem (c'est toi) : Koji (02/10), ajouté en fin de liste, en fait partie
    this.members = roster.filter((r) => r.id !== 'haythem' && r.model);
    this.el = $('phone'); this.listEl = $('phone-msgs'); this.badgeEl = $('phone-badge');
    this.open = false; this.unread = 0; this.clock = 0; this.queue = [];
    this.msgs = [];
    try { const raw = localStorage.getItem(KEY); if (raw) this.msgs = JSON.parse(raw).slice(-MAX); } catch (e) { /* stockage indisponible */ }
    if (!this.msgs.length) {
      this.msgs = [
        { who: this.members[0] ? this.members[0].name : 'Ethan', txt: 'groupe créé 🏀', t: 0 },
        { who: this.members[1] ? this.members[1].name : 'Clovis', txt: 'on se retrouve à la cage après les cours', t: 0 },
      ];
    }
    $('phone-close').onclick = () => this.hide();
    const input = $('phone-input');
    $('phone-send').onclick = () => this.sendFromInput();
    // chaque touche frappée fait taper le joueur sur son téléphone, dans le jeu
    input.addEventListener('input', () => this.cb.onType?.());
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.code === 'Enter') { e.preventDefault(); this.sendFromInput(); }
      if (e.code === 'Escape') { e.preventDefault(); this.hide(); }
    });
    const quick = $('phone-quick');
    for (const q of QUICK) {
      const b = document.createElement('button'); b.className = 'phone-q'; b.textContent = q;
      b.onclick = () => { this.cb.onType?.(); this.send(q); };
      quick.appendChild(b);
    }
    // les applis : le groupe (ci-dessus) et le plan du parc ; `cb.jeu()` rend la partie (position, amis, téléportation)
    this.app = 'messages'; this.nonLusApp = 0;
    const tete = this.el.querySelector('.phone-head');
    this.entete = { titre: tete.querySelector('.phone-title b'), sous: $('phone-sub'), av: tete.querySelector('.phone-av') };
    this.entete.messages = { titre: this.entete.titre.textContent, sous: this.entete.sous.textContent, av: this.entete.av.innerHTML };
    this.plan = $('phone-plan') ? new PlanParc($('phone-plan'), { jeu: () => (this.cb.jeu ? this.cb.jeu() : null), ranger: () => this.hide(), ouvert: () => this.open, couleur }) : null;
    for (const b of this.el.querySelectorAll('#phone-dock button')) b.onclick = () => this.choisirApp(b.dataset.tab);
    this.render();
  }

  // Passer d'une appli à l'autre : le dock, l'en-tête (nom de l'appli), et ce qui s'affiche (css : #phone.app-plan).
  choisirApp(app) {
    if (app !== 'plan' || !this.plan) app = 'messages';
    this.app = app;
    const plan = app === 'plan';
    this.el.classList.toggle('app-plan', plan);
    $('phone-plan').hidden = !plan;
    for (const b of this.el.querySelectorAll('#phone-dock button')) b.classList.toggle('on', b.dataset.tab === app);
    const E = this.entete;
    if (plan) {
      E.titre.textContent = 'Plan du parc'; E.sous.textContent = this.plan.sousTitre();
      E.av.innerHTML = '<svg viewBox="0 0 20 20" width="19" height="19"><path d="M10 1.5a6 6 0 0 0-6 6c0 4.5 6 11 6 11s6-6.5 6-11a6 6 0 0 0-6-6zm0 8.4a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8z" fill="currentColor"/></svg>';
      if (this.open) this.plan.montrer();
    } else {
      E.titre.textContent = E.messages.titre; E.sous.textContent = E.messages.sous; E.av.innerHTML = E.messages.av;
      if (this.plan) this.plan.cacher();
      this.nonLusApp = 0; this.pastilleDock();
      if (this.open) this.render();
    }
  }
  pastilleDock() { const d = $('phone-dot'); if (d) d.hidden = !this.nonLusApp; }

  save() { try { localStorage.setItem(KEY, JSON.stringify(this.msgs.slice(-MAX))); } catch (e) { /* ignore */ } }

  push(who, txt, mine = false) {
    // horodatage réel : tous les messages avaient l'estampille 0, impossible d'ordonner un fil venu du réseau
    this.msgs.push({ who, txt, mine, t: Date.now() });
    if (this.msgs.length > MAX) this.msgs = this.msgs.slice(-MAX);
    this.save();
    if (!this.open) { this.unread++; this.badge(); } else this.render();
    if (this.open && this.app !== 'messages') { this.nonLusApp++; this.pastilleDock(); }   // (on regarde le plan)
  }

  // un membre du groupe répond après un court délai
  bot(kind, delay = 1.2) {
    const m = this.members.length ? pick(this.members) : { name: 'Ethan' };
    const txt = pick(REPLIES[kind] || REPLIES.idle);
    this.queue.push({ who: m.name, txt, at: this.clock + delay });
  }

  sendFromInput() {
    const i = $('phone-input'), v = i.value.trim();
    if (!v) return;
    i.value = '';
    this.send(v);
  }
  send(txt) {
    // En ligne, ce qu'on écrit part au salon au lieu de déclencher des réponses de PNJ : le groupe LA CAGE
    // devient le chat des joueurs réellement connectés.
    if (this.cb.online?.()) { this.push('Toi', txt, true); this.cb.onSay?.(txt); return; }
    this.push('Toi', txt, true);
    // une à deux réponses
    this.bot(/gg|bravo|bien/i.test(txt) ? 'win' : /1v1|3v3|joue|cage/i.test(txt) ? 'hype' : 'hello', 0.9 + Math.random());
    if (Math.random() < 0.5) this.bot('idle', 2.2 + Math.random() * 2);
  }

  // événements du jeu -> le groupe réagit
  event(kind) {
    if (kind === 'win') { this.bot('win', 1.0); if (Math.random() < 0.6) this.bot('win', 2.6); }
    else if (kind === 'lose') this.bot('lose', 1.4);
    else if (kind === 'dunk') this.bot('dunk', 0.8);
    else if (kind === 'shop') this.bot('shop', 1.6);
    else if (kind === 'rain') this.bot('rain', 1.2);
  }

  badge() {
    this.badgeEl.textContent = this.unread > 9 ? '9+' : String(this.unread);
    this.badgeEl.hidden = this.unread === 0;
  }

  // Comme une vraie messagerie : une date, l'heure dans chaque bulle, le nom en couleur (une couleur par
  // personne), et les messages qui se suivent du même auteur regroupés (seul le dernier a sa « queue »).
  render() {
    const l = this.listEl;
    let html = '<div class="ph-day">Aujourd’hui</div>', prev = null;
    this.msgs.forEach((m, i) => {
      const next = this.msgs[i + 1];
      const suite = next && next.who === m.who && !!next.mine === !!m.mine;     // un autre suit : pas de queue
      const heure = m.t ? new Date(m.t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
      const t = `<span class="ph-t">${heure}${m.mine ? ' ✓✓' : ''}</span>`;
      if (m.mine) html += `<div class="pm me${suite ? ' suite' : ''}"><div class="pb">${esc(m.txt)}${t}</div></div>`;
      else {
        const nom = !prev || prev.who !== m.who || prev.mine ? `<div class="pw" style="color:${couleur(m.who)}">${esc(m.who)}</div>` : '';
        html += `<div class="pm${suite ? ' suite' : ''}">${nom}<div class="pb">${esc(m.txt)}${t}</div></div>`;
      }
      prev = m;
    });
    l.innerHTML = html;
    l.scrollTop = l.scrollHeight;
  }
  // l'heure de la barre d'état
  horloge() {
    const el = $('phone-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  // Un vrai téléphone fait 300 × 612 ici. Sur un écran bas (paysage, téléphone Android), on le réduit
  // d'un bloc — mais jamais sous 72 %, où le texte deviendrait illisible : au-delà, il raccourcit un peu.
  // SOUS 560 PX DE HAUT (un téléphone en paysage : 390 px sur un iPhone, 360 sur un petit Android), même 72 % était
  // trop petit — bulles en 10 px, libellés du dock en 7,6 px, un champ que l'iPhone agrandit au toucher. Le
  // téléphone garde alors sa taille réelle et c'est lui qui raccourcit à la hauteur de l'écran ; la classe `compact`
  // amincit son cadre et sa barre d'état (css/style.css, « LE TÉLÉPHONE DU JEU SUR UN ÉCRAN BAS »).
  // La hauteur part de la vraie marge du bas (css : au-dessus de la barre d'accueil de l'iPhone) et laisse celle de
  // l'encoche en haut : avec les 16 px d'avant, la barre d'accueil (21 px en paysage) poussait le haut du téléphone
  // hors de l'écran.
  taille() {
    const body = this.el.querySelector('.phone-body');
    if (!body) return;
    const compact = window.innerHeight < 560;
    this.el.classList.toggle('compact', compact);
    const bas = parseFloat(getComputedStyle(this.el).bottom) || 0, haut = Math.max(compact ? 8 : 10, zoneHaute());
    const H = window.innerHeight - bas - haut, W = window.innerWidth * 0.92;
    const s = compact ? Math.min(1, W / 300) : Math.max(0.6, Math.min(1, W / 300, Math.max(0.72, H / 612)));
    body.style.zoom = s.toFixed(3);
    body.style.height = Math.round(Math.min(612, H / s)) + 'px';
  }
  show() {
    // (rouvert sur le plan, les messages arrivés téléphone rangé restent à lire : la pastille du dock le dit)
    if (this.app !== 'messages' && this.unread) { this.nonLusApp += this.unread; this.pastilleDock(); }
    this.open = true; this.unread = 0; this.badge();
    this.taille();
    if (!this._tailleOn) { this._tailleOn = true; window.addEventListener('resize', () => { if (this.open) this.taille(); }); }
    this.el.hidden = false;
    requestAnimationFrame(() => this.el.classList.add('on'));
    this.horloge(); clearInterval(this._hT); this._hT = setInterval(() => this.horloge(), 10000);
    this.render();
    if (this.app === 'plan') this.plan.montrer();          // (rouvert sur le plan : la carte reprend où elle était)
    this.cb.onOpen?.();
  }
  hide() {
    if (!this.open) return;
    this.open = false; this.el.classList.remove('on'); clearInterval(this._hT);
    if (this.plan) this.plan.cacher();
    setTimeout(() => { if (!this.open) this.el.hidden = true; }, 340);
    $('phone-input').blur();
    this.cb.onClose?.();
  }
  toggle() { this.open ? this.hide() : this.show(); }

  update(dt) {
    if (!(dt > 0)) return;
    this.clock += dt;
    if (!this.queue.length) return;
    const due = this.queue.filter((q) => q.at <= this.clock);
    if (!due.length) return;
    this.queue = this.queue.filter((q) => q.at > this.clock);
    for (const q of due) this.push(q.who, q.txt, false);
  }
}

// une couleur stable par nom, comme les groupes WhatsApp
const COULEURS = ['#ff9f43', '#4cd4a0', '#ff6b8b', '#6fb7ff', '#c89bff', '#ffd166', '#5fd9e8', '#ff8a5c'];
function couleur(nom) { let h = 0; for (const c of String(nom)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COULEURS[h % COULEURS.length]; }

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
