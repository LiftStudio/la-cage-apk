// Couche réseau de LA CAGE. Le serveur n'existe pas encore : ce fichier prépare tout ce qui doit exister côté
// client pour qu'il suffise de le brancher.
//
// Trois briques indépendantes :
//   1. Identity  : qui tu es (identifiant stable + pseudo), gardé dans localStorage.
//   2. Transport : comment les messages circulent. `LocalTransport` fait tourner un salon entièrement en local
//                  (on peut donc tester tout le flux hors ligne) ; `SocketTransport` parle à un vrai serveur
//                  WebSocket. Les deux exposent exactement la même interface : send / onMessage / close.
//   3. Room      : le salon. Liste des joueurs, hôte, prêt/pas prêt, chat, choix du mode, lancement du match.
//
// Plus les outils indispensables à une partie partagée :
//   - Rng      : générateur à graine. Les tirages de règles (tir réussi, contre, vol) doivent donner le même
//                résultat sur toutes les machines, donc ils ne peuvent plus passer par Math.random().
//   - Horloge  : l'heure d'un autre client, estimée à partir de ses paquets horodatés (voir plus bas).
//   - Tampon   : les dernières positions reçues d'un joueur, rejouées avec un léger retard et interpolées.
//
// Protocole (un message = { t: type, ... }) :
//   hello / welcome / join / leave / ready / mode / start / input / state / chat / pos / ping / pong
// `pos` est la présence : la position de chacun sur le terrain, diffusée 12 fois par seconde (voir js/presence.js).
// `mode` sert aussi de courrier pour les matchs en cours (annonces, demandes pour rejoindre ou regarder : voir
// js/enligne.js) : le relais le rediffuse à tous sans le lire, et un ancien client n'en garde que le champ `mode`.
const KEY_ID = 'hoops.identity.v1';
const KEY_SRV = 'lacage.serveur.v1';
const PROTO = 1;

// ---------------------------------------------------------------- ou est le serveur ?
// Taper une adresse wss:// est exactement le genre de chose qu'on rate une fois sur deux, et un jeu qui
// demande ca a l'ecran d'accueil a deja perdu la moitie de ses joueurs. On essaie donc, dans l'ordre :
//
//   1. l'adresse que le joueur a deja utilisee (elle est retenue) ;
//   2. SERVEUR_PUBLIC, l'adresse du terrain public de LA CAGE, ecrite ici une fois pour toutes ;
//   3. la page elle-meme : si le jeu est servi par serveur/node.mjs (le cas quand on joue a plusieurs sur le
//      meme wifi), le salon est sur le MEME port, et on le decouvre en interrogeant /etat.
//
// Quand SERVEUR_PUBLIC est vide, le jeu marche exactement comme avant : on joue seul, et le champ SERVEUR de
// l'ecran EN LIGNE reste la pour ceux qui ont leur propre serveur.
export const SERVEUR_PUBLIC = 'wss://la-cage-salon.lacage-salon.workers.dev/ws';

// L'ANNUAIRE : l'adresse du terrain, publiee a part, pour que l'APK n'ait pas a etre reinstallee le jour ou
// elle change. C'est un vrai probleme et pas une coquetterie : l'APK EMBARQUE le jeu, donc une adresse ecrite
// dans le code ne peut bouger qu'avec une nouvelle installation, sur chaque telephone. Ici, un seul fichier
// change dans le depot public et tous les telephones suivent au lancement suivant.
// Le fichier appartient a LiftStudio, comme l'APK ; il ne contient qu'une adresse.
export const ANNUAIRE = 'https://raw.githubusercontent.com/LiftStudio/la-cage-apk/main/serveur.json';

async function adresseDeLAnnuaire(ms = 2500) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    const r = await fetch(ANNUAIRE, { signal: ctl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!r.ok) return '';
    const j = await r.json();
    const u = j && typeof j.ws === 'string' ? j.ws.trim() : '';
    return /^wss?:\/\//.test(u) ? u : '';
  } catch (e) { return ''; }
}

// Sommes-nous dans l'APK ? Capacitor sert la page depuis https://localhost SANS port : `surReseauLocal()`
// repondait donc « oui », et le jeu conseillait a un joueur sur telephone de relancer Lancer.bat — un fichier
// qui n'existe pas chez lui. On reconnait la coquille a l'objet que Capacitor injecte, et a defaut a la forme
// de l'adresse.
export function dansLApplication() {
  try {
    if (globalThis.Capacitor) return true;
    const l = globalThis.location;
    // Sans port : une page servie par la coquille Android, pas par un serveur de jeu (qui, lui, a un port).
    return !!l && (l.protocol === 'https:' || l.protocol === 'http:') && l.hostname === 'localhost' && !l.port;
  } catch (e) { return false; }
}

// CE QU'ON ACCEPTE QUAND QUELQU'UN TAPE UNE ADRESSE. Le lanceur affiche « http://192.168.1.12:8123 » : c'est
// ca qu'on recopie, pas une adresse de socket. Exiger « ws://192.168.1.12:8123/ws » etait une facon de faire
// echouer tout le monde — et c'est ainsi que « haythem10 » s'est retrouve dans le champ.
// On accepte donc : 192.168.1.12 · 192.168.1.12:8123 · http://192.168.1.12:8123 · ws://…/ws · wss://…
export function normaliserAdresse(saisie) {
  let t = String(saisie || '').trim();
  if (!t) return '';
  t = t.replace(/\s+/g, '');
  let proto = '';
  const m = /^(wss?|https?):\/\//i.exec(t);
  if (m) { proto = m[1].toLowerCase(); t = t.slice(m[0].length); }
  const barre = t.indexOf('/');
  let hote = barre >= 0 ? t.slice(0, barre) : t;
  let chemin = barre >= 0 ? t.slice(barre) : '';
  if (!hote) return '';
  // Un hote sans port, c'est presque toujours le serveur du jeu : on met le sien.
  if (!/:\d+$/.test(hote) && !hote.includes(']')) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hote) || hote === 'localhost') hote += ':8123';
  }
  if (!chemin || chemin === '/') chemin = '/ws';
  // ws:// ou wss:// ? Un protocole ecrit tranche. Sinon : une adresse chiffree (192.168.x.x, localhost) est
  // forcement un terrain du reseau local, donc en clair ; un NOM DE DOMAINE est sur Internet, donc chiffre.
  // Sans cette regle, coller l'adresse du terrain public donnait ws:// et la connexion echouait sans un mot.
  const local = /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(hote) || /^localhost(:\d+)?$/.test(hote);
  const chiffre = proto === 'wss' || proto === 'https' || (!proto && !local);
  return (chiffre ? 'wss://' : 'ws://') + hote + chemin;
}

// CHERCHER LE TERRAIN SUR LE WIFI. Le telephone ne connait pas sa propre adresse locale — aucun navigateur ne
// la donne — alors on interroge les plages ou vivent quasiment tous les reseaux domestiques. C'est volontai-
// rement un BOUTON et pas un reflexe au demarrage : mille interrogations, meme courtes, n'ont rien a faire
// dans le chemin normal. On s'arrete a la premiere reponse.
const PLAGES = ['192.168.1', '192.168.0', '192.168.43', '192.168.137', '10.0.0', '192.168.2'];

export async function chercherSurLeWifi(surAvancement, port = 8123) {
  const cibles = [];
  // On commence par les adresses les plus probables : les box distribuent surtout au debut de la plage.
  // `.1` d'abord : c'est l'adresse des passerelles et celle que Windows donne a son partage de connexion.
  // La mettre en dernier, c'est balayer quinze cents adresses avant de trouver la plus probable.
  const ordre = [1];
  for (let i = 2; i <= 60; i++) ordre.push(i);
  for (let i = 100; i <= 199; i++) ordre.push(i);
  for (let i = 61; i <= 99; i++) ordre.push(i);
  for (let i = 200; i <= 254; i++) ordre.push(i);
  for (const h of ordre) for (const base of PLAGES) cibles.push(`${base}.${h}`);

  let trouve = '', faits = 0;
  const PAR_LOT = 40;
  for (let i = 0; i < cibles.length && !trouve; i += PAR_LOT) {
    const lot = cibles.slice(i, i + PAR_LOT);
    const reponses = await Promise.all(lot.map(async (ip) => {
      const url = `ws://${ip}:${port}/ws`;
      const ok = await repond(url, 400);
      return ok ? url : '';
    }));
    faits += lot.length;
    trouve = reponses.find(Boolean) || '';
    surAvancement?.(faits, cibles.length, trouve);
  }
  return trouve;
}

export function serveurRetenu() { try { return localStorage.getItem(KEY_SRV) || ''; } catch (e) { return ''; } }
export function retenirServeur(url) { try { localStorage.setItem(KEY_SRV, String(url || '')); } catch (e) { /* ignore */ } }
export function oublierServeur() { try { localStorage.removeItem(KEY_SRV); } catch (e) { /* ignore */ } }

// L'adresse WebSocket qui correspond a la page courante. Sur https, il FAUT wss:// : un navigateur refuse une
// socket en clair depuis une page chiffree, et l'erreur ne dit rien d'utile.
export function serveurDeLaPage() {
  try {
    const l = globalThis.location;
    if (!l || (l.protocol !== 'http:' && l.protocol !== 'https:')) return '';
    return (l.protocol === 'https:' ? 'wss://' : 'ws://') + l.host + '/ws';
  } catch (e) { return ''; }
}

// Tout serveur de LA CAGE repond sur /etat, quelle que soit son enveloppe (node, Cloudflare). C'est donc la
// question a poser pour savoir si une adresse est vivante — et on la pose en HTTP plutot qu'en ouvrant une
// socket, parce qu'une socket qui echoue met plusieurs secondes et ne dit pas pourquoi.
export async function repond(urlWs, ms = 1200) {
  try {
    const u = new URL(String(urlWs || '').replace(/^ws/, 'http'));
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    const r = await fetch(new URL('/etat', u.origin), { signal: ctl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!r.ok) return false;
    const j = await r.json();
    return !!j && typeof j.salons === 'number';
  } catch (e) { return false; }
}

// Renvoie l'adresse a utiliser, ou '' si le joueur sera seul.
// ON NE GARDE PLUS UNE ADRESSE SUR PAROLE. La version precedente renvoyait l'adresse retenue sans verifier
// qu'il y avait encore quelque chose au bout : il a suffi d'un essai avec le serveur allume, puis d'un
// lancement SANS lui, pour que l'ecran affiche « Serveur : coupe » a vie, avec un champ pre-rempli qui avait
// l'air juste. C'est le pire genre de panne : tout semble correct, et rien ne marche. Chaque candidate est
// donc interrogee, et celle qui ne repond plus est oubliee.
export async function trouverServeur() {
  const retenu = serveurRetenu();
  const candidats = [];
  const ajouter = (u) => { if (u && !candidats.includes(u)) candidats.push(u); };
  ajouter(retenu);                 // la sienne d'abord : c'est un choix explicite du joueur
  ajouter(SERVEUR_PUBLIC);         // puis le terrain public de LA CAGE, s'il est ecrit dans le code
  ajouter(serveurDeLaPage());      // puis la page elle-meme (serveur/node.mjs sert le jeu ET le salon)

  for (const url of candidats) if (await repond(url)) return url;

  // Rien n'a repondu : on demande a l'annuaire. En dernier, parce que c'est le seul candidat qui sort sur
  // Internet — inutile de le deranger quand le terrain est deja la, sous la main.
  const annuaire = await adresseDeLAnnuaire();
  if (annuaire && !candidats.includes(annuaire) && await repond(annuaire)) { retenirServeur(annuaire); return annuaire; }

  if (retenu) oublierServeur();
  // Rien ne repond. S'il existe un terrain public, on le vise quand meme : SocketTransport reessaie tout seul,
  // donc le joueur sera connecte des qu'il reviendra, sans avoir a rouvrir l'ecran.
  return SERVEUR_PUBLIC || '';
}

// Est-ce qu'on joue depuis sa propre machine / son propre reseau ? Sert a dire quoi faire quand il n'y a
// aucun terrain : chez soi c'est « relance le jeu avec Lancer.bat », en ligne c'est tout autre chose.
export function surReseauLocal() {
  try {
    if (dansLApplication()) return false;      // l'APK n'est pas « chez soi » : Lancer.bat n'y existe pas
    const h = globalThis.location ? globalThis.location.hostname : '';
    return h === 'localhost' || h === '127.0.0.1' || h === '::1'
      || /^192\.168\./.test(h) || /^10\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
  } catch (e) { return false; }
}

// ---------------------------------------------------------------- identité
export class Identity {
  constructor() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY_ID) || 'null'); } catch (e) { /* stockage indisponible */ }
    this.id = (d && d.id) || Identity.newId();
    this.name = (d && d.name) || '';
    if (!d || !d.id) this.save();
  }
  static newId() {
    const c = globalThis.crypto;
    if (c && c.randomUUID) return c.randomUUID();
    return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  setName(n) { this.name = String(n || '').trim().slice(0, 16); this.save(); return this.name; }
  get display() { return this.name || 'Joueur'; }
  save() { try { localStorage.setItem(KEY_ID, JSON.stringify({ id: this.id, name: this.name })); } catch (e) { /* ignore */ } }
}

// ---------------------------------------------------------------- générateur à graine
// xorshift32 : court, rapide, et surtout reproductible. Deux clients partis de la même graine tirent la même
// suite de nombres, donc voient le même match. À utiliser pour TOUT tirage qui décide d'une règle.
export class Rng {
  constructor(seed = 1) { this.seed(seed); }
  seed(s) { this.s = (s >>> 0) || 1; return this; }
  next() {
    let x = this.s;
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    this.s = x;
    return x / 4294967296;
  }
  range(a, b) { return a + this.next() * (b - a); }
  int(n) { return Math.floor(this.next() * n); }
  pick(arr) { return arr[this.int(arr.length)]; }
}

// ---------------------------------------------------------------- l'heure des autres
// Chaque paquet temps réel porte l'heure de son ÉMETTEUR (performance.now() chez lui, ou le temps du match chez
// l'hôte), en millisecondes. Les deux horloges n'ont rien à voir l'une avec l'autre, et le trajet varie d'un paquet
// à l'autre (wifi, relais) : on ne peut donc pas lire « il y a combien de temps » directement.
//
// LE PAQUET LE PLUS RAPIDE DIT LA VÉRITÉ. Pour chaque paquet, (heure de l'émetteur - heure de réception) vaut le
// décalage des horloges MOINS le trajet. Le plus grand de ces écarts sur les trois dernières secondes est celui du
// paquet arrivé le plus vite : c'est notre meilleure estimation du décalage (le filtre « trajet minimal »). On le
// lisse pour que l'image ne saute pas quand un paquet plus rapide que les autres arrive, et l'on repart de zéro
// sur un écart d'une demi-seconde (onglet de l'hôte revenu de l'arrière-plan, horloge remise à zéro).
// La GIGUE est l'écart moyen des autres paquets à ce meilleur trajet : c'est la marge à garder pour que le
// prochain paquet soit (presque) toujours arrivé quand on en a besoin.
export class Horloge {
  constructor(fenetre = 3000) {
    this.fenetre = fenetre;
    this.ech = [];                 // [{ d, t }] : écart émetteur - réception, heure locale de réception
    this.off = null;               // heure de l'émetteur = heure locale + off
    this.gigue = 15;               // ms
    this.dernier = null;           // heure (émetteur) du dernier paquet
    this.intervalle = 50;          // ms entre deux paquets, moyenne glissante
  }
  echantillon(tEmetteur, tLocal = performance.now()) {
    const d = tEmetteur - tLocal;
    let E = this.ech;
    E.push({ d, t: tLocal });
    while (E.length && tLocal - E[0].t > this.fenetre) E.shift();
    // L'ÉMETTEUR A RECULÉ POUR DE BON (son horloge a pris du retard sur la nôtre : une image figée, un réveil) : six
    // paquets de suite nettement plus lents que le meilleur de la fenêtre. On repart d'eux au lieu d'attendre trois
    // secondes que la fenêtre les oublie — pendant lesquelles on aurait voulu montrer des images pas encore arrivées.
    this.bas = this.off !== null && d < this.off - (3 * this.gigue + 40) ? (this.bas || 0) + 1 : 0;
    if (this.bas >= 6) { E = this.ech = E.slice(-6); this.off = -Infinity; this.bas = 0; }
    let max = -Infinity;
    for (const e of E) if (e.d > max) max = e.d;
    if (this.off === -Infinity) this.off = max;
    if (this.off === null || Math.abs(max - this.off) > 500) { this.off = max; this.ech = [{ d, t: tLocal }]; this.retard = null; }
    else this.off += (max - this.off) * 0.05;
    this.gigue += (Math.min(250, Math.max(0, max - d)) - this.gigue) * 0.1;
    // l'intervalle entre deux paquets : seulement entre paquets rapprochés (un joueur à l'arrêt se tait deux secondes)
    if (this.dernier !== null) { const i = tEmetteur - this.dernier; if (i > 0 && i < 400) this.intervalle += (i - this.intervalle) * 0.1; }
    this.dernier = tEmetteur;
  }
  get pret() { return this.off !== null; }
  // L'heure de l'émetteur qu'il faut AFFICHER à l'heure locale `tLocal` : la dernière connue, moins un intervalle
  // et la marge de gigue. 80 à 150 ms pour l'hôte d'un match (20 images/s), un peu plus pour le hub (12/s).
  // Le retard suit la gigue LENTEMENT (une seconde environ, à 120 appels par seconde) : recalculé à chaque paquet, il
  // faisait avancer l'heure affichée par petits bonds, et les joueurs accéléraient et freinaient au rythme du réseau.
  affichage(tLocal, min = 80, max = 150) {
    const cible = Math.max(min, Math.min(max, this.intervalle + 2.5 * this.gigue + 10));
    this.retard = this.retard === null || this.retard === undefined ? cible : this.retard + (cible - this.retard) * 0.008;
    return tLocal + this.off - this.retard;
  }
}

// L'HEURE RÉELLE DU PAS DE SIMULATION EN COURS (ms), pour lire un tampon. performance.now() est le même pour tous les pas
// d'une image : lu tel quel, la position lue ne bougeait qu'une fois par image, et l'interpolation d'affichage
// (Player.presenter) n'avait plus rien entre quoi glisser. Le jeu (`jeu`, Game.frame) sait exactement à quelle heure
// correspond chaque pas : le début de l'image (son horloge), moins ce qui reste dans l'accumulateur après ce pas. Les
// pas d'une image sont ainsi espacés de 8,3 ms tout juste, et les images se raccordent sans à-coup.
// Sans le jeu : on avance de `dt` par pas en rattrapant doucement l'heure réelle (recalé au-delà d'une seconde).
export function heurePas(t, dt, jeu = null) {
  const c = jeu && jeu.clock;
  if (c && Number.isFinite(c.oldTime) && c.oldTime > 0 && Number.isFinite(jeu.acc)) return c.oldTime - Math.max(0, jeu.acc - dt) * 1000;
  const now = performance.now();
  if (t === undefined || !(Math.abs(t - now) <= 1000)) return now;
  t += dt * 1000;
  return t + (now - t) * 0.02;
}

// ---------------------------------------------------------------- tampon d'interpolation
// Les ~1 s de positions reçues d'un joueur (ou du ballon), dans l'ordre de l'émetteur. On ne montre JAMAIS la
// dernière position reçue (elle arrive par à-coups, au rythme du réseau) : on montre celle de l'instant `t`,
// un peu dans le passé, entre deux paquets qu'on a déjà tous les deux.
//   - entre deux paquets : courbe d'Hermite, qui passe par les deux positions AVEC les deux vitesses envoyées —
//     une course reste une course, un virage reste rond, sans le freinage à chaque paquet d'une simple moyenne ;
//   - le cap : par le plus court chemin (sinon un passage par ±π fait faire un tour complet) ;
//   - plus rien d'arrivé : on prolonge avec la dernière vitesse, 150 ms au plus, puis on attend sur place ;
//   - un écart de plus de `saut` mètres entre deux paquets est une téléportation (remise en jeu, entrée sur le
//     terrain) : on reste sur l'ancienne position jusqu'à l'heure de la nouvelle, puis on y est. Pas de glissade.
// Un échantillon : { t, x, z, vx, vz, fx, fz } (y, vy facultatifs : le ballon).
export class Tampon {
  // `silence` : au-delà de cet écart entre deux paquets (ms), l'émetteur s'était tu parce qu'il ne bougeait plus
  // (le hub) ; Infinity pour un flux régulier (les images d'un match), où un trou n'est qu'un retard du réseau.
  constructor(duree = 1000, saut = 2.5, silence = Infinity) { this.s = []; this.duree = duree; this.saut = saut; this.silence = silence; }
  get n() { return this.s.length; }
  get dernier() { return this.s[this.s.length - 1] || null; }
  vider() { this.s.length = 0; }
  ajouter(e) {
    const S = this.s, d = S[S.length - 1];
    if (d && e.t <= d.t) return false;              // paquet en retard ou en double : on a déjà mieux
    // Un joueur arrêté se tait (le hub n'envoie qu'un signe de vie toutes les deux secondes). Sans précaution, le
    // paquet suivant s'interpolerait sur toute la durée du silence : il aurait l'air de partir bien avant d'avoir
    // bougé, puis de bondir. On pose donc un point d'arrêt juste avant lui, là où il était.
    if (d && e.t - d.t > this.silence) S.push({ ...d, t: e.t - 100, vx: 0, vz: 0 });
    S.push(e);
    while (S.length > 2 && e.t - S[0].t > this.duree) S.shift();
    return true;
  }
  // Remplit `o` avec l'état à l'instant `t` ; `o.e` est l'échantillon le plus proche (ses champs discrets).
  lire(t, o, maxExtra = 150) {
    const S = this.s, n = S.length;
    if (!n) return false;
    if (t <= S[0].t || n === 1) return copier(S[0], o, 0);
    let i = n - 1;
    if (t >= S[i].t) return copier(S[i], o, Math.min(t - S[i].t, maxExtra) / 1000);
    while (i > 0 && S[i - 1].t > t) i--;
    const a = S[i - 1], b = S[i];
    if (Math.hypot(b.x - a.x, b.z - a.z) > this.saut) return copier(a, o, 0);
    const T = (b.t - a.t) / 1000, s = (t - a.t) / (b.t - a.t);
    o.x = hermite(a.x, a.vx, b.x, b.vx, T, s); o.z = hermite(a.z, a.vz, b.z, b.vz, T, s);
    o.vx = hermiteD(a.x, a.vx, b.x, b.vx, T, s); o.vz = hermiteD(a.z, a.vz, b.z, b.vz, T, s);
    if (a.y !== undefined) { o.y = hermite(a.y, a.vy, b.y, b.vy, T, s); o.vy = hermiteD(a.y, a.vy, b.y, b.vy, T, s); }
    if (a.fx !== undefined) {
      const ca = Math.atan2(a.fx, a.fz); let dc = Math.atan2(b.fx, b.fz) - ca;
      while (dc > Math.PI) dc -= Math.PI * 2;
      while (dc < -Math.PI) dc += Math.PI * 2;
      o.fx = Math.sin(ca + dc * s); o.fz = Math.cos(ca + dc * s);
    }
    o.e = s < 0.5 ? a : b;
    return true;
  }
}
// (prolongé de `dt` secondes avec sa vitesse ; le ballon retombe, sans passer sous le sol)
function copier(e, o, dt) {
  o.x = e.x + e.vx * dt; o.z = e.z + e.vz * dt; o.vx = e.vx; o.vz = e.vz; o.fx = e.fx; o.fz = e.fz;
  if (e.y !== undefined) { o.vy = e.vy - 9.81 * dt; o.y = Math.max(0.12, e.y + e.vy * dt - 4.905 * dt * dt); }
  o.e = e;
  return true;
}
// Hermite cubique : position en s ∈ [0, 1] entre p0 et p1, vitesses v0 et v1 (m/s), sur T secondes
function hermite(p0, v0, p1, v1, T, s) {
  const s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * T * v0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * T * v1;
}
function hermiteD(p0, v0, p1, v1, T, s) {
  const s2 = s * s;
  return ((6 * s2 - 6 * s) * p0 + (3 * s2 - 4 * s + 1) * T * v0 + (-6 * s2 + 6 * s) * p1 + (3 * s2 - 2 * s) * T * v1) / T;
}

// ---------------------------------------------------------------- transports
class BaseTransport {
  constructor() { this.handlers = []; this.open = false; }
  onMessage(fn) { this.handlers.push(fn); return () => { this.handlers = this.handlers.filter((h) => h !== fn); }; }
  emit(msg) { for (const h of this.handlers) h(msg); }
  send() { throw new Error('à implémenter'); }
  close() { this.open = false; this.handlers = []; }
}

// Salon 100 % local : le « serveur » est une fonction dans la même page. Tout le flux (rejoindre, se déclarer prêt,
// chatter, lancer) marche sans réseau, ce qui permet de développer et de tester l'interface avant d'avoir un serveur.
export class LocalTransport extends BaseTransport {
  constructor(ident) { super(); this.ident = ident; this.open = true; this.delay = 0; }
  send(msg) {
    // on se renvoie le message à soi-même, comme le ferait un serveur qui diffuse à tout le salon
    const relay = () => this.emit({ ...msg, from: msg.from || this.ident.id, echo: true });
    if (this.delay > 0) setTimeout(relay, this.delay); else relay();
  }
}

// Vrai transport réseau. `url` sera l'adresse du serveur de Haythem, par exemple wss://lacage.example/ws.
// Le serveur n'a qu'à rediffuser à tout le salon les messages qu'il reçoit, et tenir la liste des joueurs.
export class SocketTransport extends BaseTransport {
  constructor(url, ident) {
    super();
    this.url = url; this.ident = ident; this.queue = [];
    this.ws = null; this.retry = 0; this.closed = false;
    this.connect();
  }
  connect() {
    if (this.closed) return;
    let ws;
    try { ws = new WebSocket(this.url); } catch (e) { this.scheduleRetry(); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.open = true; this.retry = 0;
      this.send({ t: 'hello', proto: PROTO, id: this.ident.id, name: this.ident.display });
      for (const m of this.queue.splice(0)) this.send(m);
      this.emit({ t: 'net', state: 'ouvert' });
    };
    ws.onmessage = (ev) => {
      let m = null;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m && typeof m === 'object') this.emit(m);
    };
    ws.onclose = () => { this.open = false; this.emit({ t: 'net', state: 'coupé' }); this.scheduleRetry(); };
    ws.onerror = () => { /* onclose suit toujours */ };
  }
  scheduleRetry() {
    if (this.closed) return;
    const d = Math.min(15000, 800 * Math.pow(2, this.retry++));   // reconnexion avec attente croissante
    setTimeout(() => this.connect(), d);
  }
  send(msg) {
    const m = { ...msg, from: msg.from || this.ident.id };
    if (!this.open || !this.ws || this.ws.readyState !== 1) { this.queue.push(m); if (this.queue.length > 60) this.queue.shift(); return; }
    try { this.ws.send(JSON.stringify(m)); } catch (e) { this.queue.push(m); }
  }
  close() { this.closed = true; try { this.ws && this.ws.close(); } catch (e) { /* ignore */ } super.close(); }
}

// ---------------------------------------------------------------- salon
export class Room {
  // cb.onChange(room) à chaque modification, cb.onChat(msg), cb.onStart(opts)
  constructor(transport, ident, cb = {}) {
    this.tr = transport; this.ident = ident; this.cb = cb;
    this.code = Room.newCode();
    this.players = [];            // [{ id, name, ready, host, team, slot, char }]
    this.mode = { size: 3, target: 21, half: false, difficulty: 'normal' };
    this.chat = [];
    this.started = false;
    this.coupe = false;          // on a perdu la liaison et on ne l'a pas encore reprise
    this.monPerso = null;        // le personnage choisi, a re-annoncer apres une coupure
    // LA LATENCE (06/10/2026). Toutes les deux secondes un `ping` numéroté part au relais, qui renvoie `pong` à
    // l'expéditeur seul en recopiant `at`. L'heure d'envoi reste ici (une ancienne enveloppe du relais qui ne
    // recopierait pas `at` répond quand même : on prend alors le plus ancien ping sans réponse). `rtt` est la
    // moyenne glissante affichée (aller-retour jusqu'au relais), `rttMin` le meilleur des dix derniers.
    this.ping = { seq: 0, envois: new Map(), ech: [], rtt: null, rttMin: null };
    this._sonde = setInterval(() => this.sonder(), 2000);
    this.mesurer = false;
    this.off = transport.onMessage((m) => this.onMessage(m));
    this.join();
  }
  // LocalTransport (hors ligne) n'a pas de relais à interroger ; et l'on ne mesure que sur le terrain (`mesurer`,
  // posé par Game.setOnline) : un joueur resté sur le menu n'a pas à coûter un message de plus à l'hébergeur.
  sonder() {
    if (!this.off) { clearInterval(this._sonde); return; }
    if (!this.mesurer || !this.tr.url || !this.tr.open) return;
    const P = this.ping, seq = ++P.seq;
    for (const [k, t] of P.envois) if (performance.now() - t > 10000) P.envois.delete(k);
    P.envois.set(seq, performance.now());
    this.tr.send({ t: 'ping', at: seq });
  }
  recevoirPong(m) {
    const P = this.ping;
    let cle = P.envois.has(m.at) ? m.at : null;
    if (cle === null) for (const k of P.envois.keys()) { cle = k; break; }
    if (cle === null) return;
    const rtt = performance.now() - P.envois.get(cle);
    P.envois.delete(cle);
    P.ech.push(rtt); if (P.ech.length > 10) P.ech.shift();
    P.rttMin = Math.min(...P.ech);
    P.rtt = P.rtt === null ? rtt : P.rtt + (rtt - P.rtt) * 0.3;
    this.cb.onPing?.(P.rtt);
  }
  // l'aller-retour jusqu'au relais, en ms (null tant qu'on ne sait pas)
  get latence() { return this.ping.rtt === null ? null : Math.round(this.ping.rtt); }
  static newCode() {
    const L = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 5; i++) s += L[Math.floor(Math.random() * L.length)];
    return s;
  }
  get me() { return this.players.find((p) => p.id === this.ident.id) || null; }
  get host() { return this.players.find((p) => p.host) || null; }
  get isHost() { return !!(this.me && this.me.host); }
  get allReady() { return this.players.length > 1 && this.players.every((p) => p.ready || p.host); }

  join(charId = null) {
    if (charId !== null) this.monPerso = charId;
    this.tr.send({ t: 'join', id: this.ident.id, name: this.ident.display, char: this.monPerso, code: this.code });
  }
  // `definitif` : se desabonner du transport, donc ne plus jamais rien recevoir. C'est ce qu'on veut quand
  // l'onglet se ferme pour de bon — et exactement ce qu'on ne veut PAS quand le joueur fait un aller-retour
  // par le menu, ou quand un telephone passe une seconde en arriere-plan. Sans ce parametre, les deux cas
  // etaient traites comme une fermeture : le joueur revenait sur un salon sourd, avec « Serveur : ouvert »
  // affiche par-dessus.
  leave(definitif = true) { this.tr.send({ t: 'leave', id: this.ident.id }); if (definitif) { this.off && this.off(); this.off = null; } }

  // Se re-annoncer apres une absence : on repart de la liste du serveur, qui renvoie tous les presents dans
  // l'ordre d'arrivee (donc le bon hote) et fait disparaitre les fantomes d'avant.
  reprendre() { this.players = []; this.coupe = false; this.join(); }
  setReady(v) { this.tr.send({ t: 'ready', id: this.ident.id, ready: !!v }); }
  setChar(charId) { this.monPerso = charId; this.tr.send({ t: 'char', id: this.ident.id, char: charId }); }
  setMode(mode) { if (this.isHost) this.tr.send({ t: 'mode', mode: { ...this.mode, ...mode } }); }
  say(txt) {
    const t = String(txt || '').trim().slice(0, 140);
    if (t) this.tr.send({ t: 'chat', id: this.ident.id, name: this.ident.display, txt: t });
  }
  start() { if (this.isHost) this.tr.send({ t: 'start', seed: (Math.random() * 0xffffffff) >>> 0, mode: this.mode }); }
  // match du cercle bleu : { hote, joueurs, teamA, teamB, ... } (voir Game.lancerEnLigne)
  lancerMatch(match) { this.tr.send({ t: 'start', match }); }
  // temps réel du match : jamais mis en file d'attente pendant une coupure (une image vieille de dix secondes
  // ne sert à rien), et jamais renvoyé à l'expéditeur par le relais
  envoyerDirect(msg) { if (this.tr.open) this.tr.send(msg); }

  // Ajoute / met à jour un joueur du salon. Le premier arrivé est l'hôte.
  upsert(p) {
    let e = this.players.find((x) => x.id === p.id);
    if (!e) {
      e = { id: p.id, name: p.name || 'Joueur', ready: false, host: this.players.length === 0, team: 0, slot: 0, char: null };
      this.players.push(e);
    }
    if (p.name) e.name = p.name;
    if (p.char !== undefined && p.char !== null) e.char = p.char;
    if (p.ready !== undefined) e.ready = !!p.ready;
    this.reseat();
    return e;
  }
  // répartition des places : alternance des deux équipes dans l'ordre d'arrivée
  reseat() {
    this.players.forEach((p, i) => { p.team = i % 2; p.slot = Math.floor(i / 2); });
  }

  onMessage(m) {
    if (!m || typeof m !== 'object') return;
    // La présence arrive 12 fois par seconde et par joueur : elle sort tout de suite, sans toucher à l'état du
    // salon ni redessiner l'interface.
    if (m.t === 'pos') { this.cb.onPos?.(m); return; }
    // Match en ligne : les commandes des invités (vers l'hôte) et les images du match (de l'hôte vers les
    // invités). Même régime que la présence : elles passent sans redessiner l'interface du salon.
    if (m.t === 'input') { this.cb.onInput?.(m); return; }
    if (m.t === 'state') { this.cb.onState?.(m); return; }
    if (m.t === 'pong') { this.recevoirPong(m); return; }
    if (m.t === 'ping') return;                       // l'écho du transport local : rien à mesurer
    // Le courrier des matchs en cours (annonce, demande pour rejoindre ou regarder...) voyage dans `mode` sans
    // champ `mode` : il ne touche pas aux réglages du salon et ne redessine pas l'interface (js/enligne.js).
    if (m.t === 'mode' && !m.mode) { this.cb.onMode?.(m); return; }
    // Un match lancé depuis le cercle bleu. Ce n'est pas le « start » du salon (réservé à son hôte) : n'importe
    // qui peut en lancer un avec ceux qui sont dans le cercle, et seuls les joueurs nommés dedans le suivent.
    if (m.t === 'start' && m.match) { this.cb.onMatch?.(m.match, m.from); return; }
    switch (m.t) {
      case 'join': this.upsert(m); break;
      case 'leave': {
        const etaitHote = (this.players.find((p) => p.id === m.id) || {}).host;
        this.players = this.players.filter((p) => p.id !== m.id);
        if (etaitHote && this.players.length) this.players[0].host = true;   // l'hôte part : le suivant reprend
        this.reseat();
        // le jeu aussi : son avatar quitte le hub tout de suite, l'hôte d'un match rend sa place à l'ordinateur
        if (m.id && m.id !== this.ident.id) this.cb.onLeave?.(m.id);
        break;
      }
      case 'ready': { const p = this.players.find((x) => x.id === m.id); if (p) p.ready = !!m.ready; break; }
      case 'char': { const p = this.players.find((x) => x.id === m.id); if (p) p.char = m.char; break; }
      case 'mode': {
        // Un message venu du réseau n'est pas digne de confiance : une taille d'équipe absurde figerait
        // l'interface ou ferait planter la mise en place du match.
        const v = m.mode || {}, ok = {};
        if ([1, 2, 3, 4, 5].includes(+v.size)) ok.size = +v.size;
        if (+v.target >= 1 && +v.target <= 99) ok.target = Math.round(+v.target);
        if (typeof v.half === 'boolean') ok.half = v.half;
        if (['facile', 'normal', 'difficile'].includes(v.difficulty)) ok.difficulty = v.difficulty;
        this.mode = { ...this.mode, ...ok };
        break;
      }
      case 'chat': {
        const msg = { id: m.id, name: m.name || 'Joueur', txt: m.txt, at: this.chat.length };
        this.chat.push(msg);
        if (this.chat.length > 80) this.chat.shift();
        this.cb.onChat?.(msg);
        break;
      }
      case 'start':
        this.started = true;
        this.cb.onStart?.({ seed: m.seed >>> 0, mode: { ...this.mode, ...(m.mode || {}) }, players: this.players.map((p) => ({ ...p })) });
        break;
      case 'net':
        // UNE SOCKET QUI REVIENT EST UNE SOCKET VIDE. Quand la liaison tombe — wifi qui saute, ordinateur qui
        // se met en veille, serveur redeploye — le serveur nous a retires du salon en voyant la socket mourir.
        // SocketTransport se reconnecte tout seul et renvoie `hello`, mais `hello` n'est qu'une presentation :
        // il ne fait entrer personne. Sans ce rappel on se retrouvait CONNECTE ET INVISIBLE, l'ecran affichant
        // « Serveur : ouvert » pendant que plus personne ne nous voyait et qu'on ne voyait plus personne.
        // Mesure : dans une trace serveur, deux clients reconnectes avaient envoye `hello` et jamais `join`.
        // On vide la liste avant de se re-annoncer : le serveur renvoie tous les presents dans l'ordre
        // d'arrivee, ce qui redonne le bon hote et fait disparaitre les fantomes d'avant la coupure.
        if (m.state === 'ouvert' && this.coupe) { this.coupe = false; this.players = []; this.join(); }
        else if (m.state !== 'ouvert') this.coupe = true;
        this.cb.onNet?.(m.state);
        break;
      default: break;
    }
    this.cb.onChange?.(this);
  }
}
