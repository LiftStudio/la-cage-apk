import * as THREE from 'three';
import { settings } from './settings.js';
import { TELEPHONE } from './appareil.js';

// =====================================================================
//  LES TEXTURES CUITES DU PARC DE BÉCON (lot A0-bis du chantier « parc complet »)
// =====================================================================
// Le parc dessine au chargement une soixantaine de textures sur des toiles 2D (js/court_parc.js : l'enrobé, le
// stabilisé, les murs de moellons, les feuillages...). Des centaines de milliers de petits tracés : mesuré le 28/09
// (PC de développement très chargé, médianes), 5 s de dessin sur 10 s de construction du parc ; en téléphone simulé,
// 10 s sur 17. Et cela ne ferait qu'empirer avec le parc entier (300 m de décor).
//
// CUIRE, c'est dessiner ces textures UNE fois, hors du jeu (tools/cuire_textures.html), et les ranger en images
// .webp dans assets/parc/tex_cuites/. Au chargement, le jeu les lit au lieu de les redessiner. Rien d'autre ne
// change : même taille, mêmes réglages (répétition, filtrage, espace de couleur), même image.
//
// MÊME IMAGE, VRAIMENT. Ces dessins tirent leurs grains au hasard (Math.random) : jusqu'ici chaque chargement
// donnait une texture un peu différente. Une image cuite ne peut en garder qu'UN tirage (une « variante fixe »).
// Pour qu'elle soit exactement ce que le jeu dessinerait, chaque texture est désormais dessinée avec un hasard
// FIXÉ : pendant son dessin, Math.random est remplacé par un générateur à graine (mulberry32), graine tirée de sa
// clé (son nom et ses paramètres). Le dessin de secours — quand le fichier manque ou n'est plus à jour — sort donc
// l'image cuite, et deux chargements du jeu donnent les mêmes textures. Le reste du décor (positions des arbres,
// des feuilles...) garde son hasard habituel : le générateur n'est posé que le temps du dessin, et Math.random est
// rendu aussitôt après (la suite des tirages du décor n'est pas décalée par les textures).
// « Exactement », à deux nuances près, mesurées par l'outil de cuisson : le navigateur ne rastérise pas toujours au
// bit près deux fois le même tracé (quelques centaines d'octets de bord anticrénelé sur un million, selon que la
// toile est accélérée ou non), et les quelques grandes toiles OPAQUES faites de bruit (l'enrobé, les moellons, le
// stabilisé), qui ne se compressent pas, sont stockées avec une perte bornée (écart moyen < 1,5 / 255) ; tout le
// reste, feuillages compris, est sans perte.
// Une texture est cuite quand la cuisson vaut son fichier (voir tools/cuire_textures.py) : les toiles qui se dessinent
// en une ou deux millisecondes, et l'atlas des feuilles de platane sur PC (0,5 Mo pour 20 ms), restent dessinées.
//
// JAMAIS UNE IMAGE PÉRIMÉE. Chaque entrée du manifeste porte l'EMPREINTE du code qui l'a dessinée : le source de
// la fonction de texture, et de ce dont elle dépend (constantes, fonctions d'aide, profils passés en paramètre),
// commentaires et blancs retirés. Si quelqu'un retouche le dessin, l'empreinte ne correspond plus : le jeu
// redessine (et le signale une fois dans la console) jusqu'à la prochaine cuisson. Le nom du fichier porte aussi
// l'empreinte, si bien que le cache du service worker ne peut pas resservir une ancienne image. Les deux OUTILS
// communs à tous les dessins, canvasTex (js/court.js) et rnd (js/court_parc.js), ont leur empreinte à part dans le
// manifeste : voir « LES OUTILS COMMUNS » plus bas.
//
// DEUX JEUX D'IMAGES. Un téléphone ne dessine pas les mêmes textures qu'un PC : js/court.js (canvasTex) y divise
// par deux toute toile de plus de 256 px, et certains dessins s'allègent (LEGER dans court_parc.js : l'enrobé en
// 1024 et quatre fois moins de grains). La cuisson se fait donc deux fois : `pc/` (tailles pleines, jusqu'à
// 2048 px) et `tel/` (512 px au plus pour l'essentiel), chacune dans les conditions exactes de sa plateforme.
// La plateforme est celle de la détection du téléphone de tout le jeu (js/appareil.js, `?tel=` compris), la même qui
// décide de la taille des toiles et de l'allègement des dessins : il n'y a plus d'appareil « mixte ».
//
// LE CHARGEMENT. Le parc se construit d'un bloc, dès le démarrage (js/game.js, constructeur de Game) : les images
// doivent donc être là AVANT. Ce module attend leur chargement et leur décodage (await au premier niveau du
// module : tout ce qui l'importe attend avec lui, l'écran de chargement reste affiché), mais seulement quand le
// terrain choisi est l'un des deux du parc — les autres terrains ne chargent rien — et pas au-delà de ATTENTE_MAX sans
// nouvelle image : une texture qui n'est pas arrivée à temps est dessinée. Hors ligne, sans fichier, sans manifeste :
// tout est dessiné, comme avant.
//
// Diagnostic : window.__texCuites (plateforme, décodage, nombre d'images lues, utilisées, dessinées, périmées, temps).
// Essais, dans l'adresse : `?cuites=0` coupe les images cuites (tout est dessiné, avec le même hasard fixé : l'image
// doit être la même) ; `?cuites=hasard` dessine tout au hasard du moment, exactement comme avant ce lot.
//
// Pour recuire après avoir retouché un dessin : `python tools/cuire_textures.py`, puis la page qu'il indique.

const DOSSIER = 'assets/parc/tex_cuites/';
// Si plus RIEN n'arrive pendant ce temps (réseau coupé ou bloqué, la première fois), on n'attend plus : ce qui manque
// sera dessiné. C'est un délai d'INACTIVITÉ, pas une durée totale : un téléphone lent, ou une machine chargée, dont les
// images arrivent une à une, les attend toutes (les lire reste bien plus rapide que les dessiner).
const ATTENTE_MAX = 8000;

// Mode CUISSON : posé par tools/cuire_textures.html avant le chargement des modules. On ne lit alors aucune image,
// on dessine tout et on garde chaque toile dans le journal que la page de cuisson exporte.
const CUISSON = typeof globalThis !== 'undefined' && !!globalThis.__CUISSON_TEXTURES__;

// Même règle que LEGER / MOBILE_DECOR de js/court_parc.js (les dessins s'allègent) et que canvasTex (js/court.js : la
// toile est réduite de moitié) : TELEPHONE, js/appareil.js, la même détection pour tout le jeu, `?tel=` compris.
// (06/10/2026 : on croisait encore avec IS_TOUCH, qui garde les commandes tactiles sur tout écran tactile même sous
// `?tel=0` : un téléphone sous `?tel=0` n'avait plus de plateforme, et redessinait toutes les textures du parc sur le
// fil principal, environ 4 s.)
const LEGER = TELEPHONE;
const PLATEFORME = LEGER ? 'tel' : 'pc';
// `?cuites=0` : pas d'images cuites, tout est dessiné au hasard fixé ; `?cuites=hasard` : dessiné au hasard du moment,
// exactement comme avant ce lot (chaque chargement tire d'autres grains)
const OPTION = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('cuites') : null;
const COUPEES = OPTION === '0' || OPTION === 'hasard', HASARD = OPTION === 'hasard' && !CUISSON;
const TERRAIN = settings.game.terrain || 'becon';
const ACTIF = !CUISSON && !COUPEES && !!PLATEFORME && (TERRAIN === 'parc' || TERRAIN === 'parc2');

// clé -> { e : son entrée du manifeste, images : ses images décodées, sources : leurs THREE.Source (voir rejouer) }
const _cuites = new Map();
// les empreintes des outils communs relevées à la cuisson (`outils` du manifeste ; null : manifeste qui n'en a pas).
// (déclarées ICI, avant l'attente du préchargement : precharger() les remplit pendant que le module est suspendu)
let _outilsAttendus = null;

// DÉCODER UNE FOIS, HORS DU FIL PRINCIPAL. three envoie ses textures à la carte graphique sans prémultiplication
// (premultiplyAlpha = false) : pour une <img>, Chrome redécode alors le fichier EN ENTIER, sur le fil principal, à
// CHAQUE envoi — un decode() fait d'avance n'y sert à rien. Mesuré le 28/09 : 220 ms pour l'enrobé en 2048 px, 50 pour
// un mur, et cela revient à chaque nouvel envoi (le premier affichage, puis chaque changement d'anisotropie que fait la
// qualité automatique au démarrage). Une ImageBitmap, décodée une fois pendant le chargement (createImageBitmap :
// hors du fil principal, même dans un onglet caché), s'envoie en 23 ms. Ses réglages rendent les octets de la
// cuisson, tels quels : pas de prémultiplication, pas de conversion de couleur (les fichiers n'ont pas de profil) ; et
// l'image est RETOURNÉE d'avance (imageOrientation 'flipY'), parce que WebGL ignore le flipY d'une ImageBitmap :
// rejouer() met donc flipY à false. Même image, même sens, sur la carte graphique.
// Pas sur les Safari d'avant la 17 ni les Firefox d'avant la 98, qui ignorent ces réglages (même règle que le
// GLTFLoader de three) : l'<img> ci-dessous, comme avant.
const BITMAP = (() => {
  if (typeof createImageBitmap !== 'function' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const safari = /^((?!chrome|android).)*safari/i.test(ua), vSafari = +((ua.match(/Version\/(\d+)/) || [])[1] || -1);
  const firefox = ua.match(/Firefox\/(\d+)/);
  return !(safari && vSafari < 17) && !(firefox && +firefox[1] < 98);
})();

// l'état, pour la console et les mesures (`decodage` : ImageBitmap, ou <img> sur les navigateurs qui l'exigent)
const etat = { plateforme: PLATEFORME, actif: ACTIF, cuisson: CUISSON, decodage: BITMAP ? 'ImageBitmap' : 'img',
  lues: 0, utilisees: 0, dessinees: 0, msDessin: 0, perimees: [], msChargement: 0 };
if (typeof window !== 'undefined') window.__texCuites = etat;

// Une image cuite. `retourner` : la texture est envoyée retournée (flipY, le cas de toutes les toiles de canvasTex).
function chargerImage(url, retourner) {
  if (BITMAP && retourner) {
    return fetch(url)
      .then((rep) => { if (!rep.ok) throw new Error('image illisible : ' + url + ' (' + rep.status + ')'); return rep.blob(); })
      .then((b) => createImageBitmap(b, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }));
  }
  // L'<img>, chargée PUIS décodée (decode() : hors du fil principal). ATTENTION : dans un onglet caché (le jeu ouvert en
  // arrière-plan), Chrome ne tient la promesse de decode() qu'une fois l'onglet affiché — mesuré : jamais tenue en
  // 15 s. On attend donc l'événement `load`, qui arrive toujours, et le décodage seulement si l'onglet est visible,
  // jamais plus de 1,5 s ; sinon l'image sera décodée à son premier affichage.
  const img = new Image();
  img.decoding = 'async';
  const charge = new Promise((ok, ko) => {
    img.onload = () => ok();
    img.onerror = () => ko(new Error('image illisible : ' + url));
  });
  img.src = url;
  return charge
    .then(() => (typeof document !== 'undefined' && document.visibilityState === 'visible'
      ? Promise.race([img.decode().catch(() => {}), new Promise((ok) => setTimeout(ok, 1500))]) : null))
    .then(() => img);
}

let _progres = 0;                                     // instant du dernier signe de vie du chargement
async function precharger() {
  const t0 = performance.now();
  const rep = await fetch(DOSSIER + 'manifeste.json');
  if (!rep.ok) throw new Error('manifeste absent (' + rep.status + ')');
  const man = await rep.json();
  _outilsAttendus = (man && man.outils) || null;
  _progres = performance.now();
  const section = (man && man[PLATEFORME]) || {};
  await Promise.all(Object.entries(section).map(async ([cle, e]) => {
    try {
      const images = await Promise.all(e.textures.map((t) => chargerImage(DOSSIER + t.fichier, t.reglages.flipY !== false)));
      _cuites.set(cle, { e, images });
      etat.lues++;
    } catch (err) {
      console.warn('[parc] texture cuite illisible, elle sera dessinée : ' + cle, err);
    }
    _progres = performance.now();
  }));
  etat.msChargement = Math.round(performance.now() - t0);
}
// Le guetteur d'inactivité. Il ne conclut qu'entre deux tours rapprochés (2,5 s au plus : un onglet caché ne lui en
// accorde qu'un par seconde) : après un long blocage du fil principal (les autres modules qui s'évaluent, une machine
// surchargée), son tour arrive peut-être AVANT les images arrivées entre-temps, et il les aurait crues perdues.
let _guet = null;
function guetter() {
  return new Promise((ok) => {
    let dernierTour = performance.now();
    _guet = setInterval(() => {
      const t = performance.now();
      if (t - _progres > ATTENTE_MAX && t - dernierTour < 2500) ok();
      dernierTour = t;
    }, 250);
  });
}

if (ACTIF) {
  _progres = performance.now();
  const chargement = precharger();
  chargement.catch(() => {});                          // (un échec après l'abandon n'a plus d'importance)
  try {
    await Promise.race([chargement, guetter()]);
    if (etat.lues === 0 && !etat.msChargement) console.info('[parc] textures cuites trop lentes à venir : elles seront dessinées');
  } catch (err) {
    console.info('[parc] pas de textures cuites, elles seront dessinées :', err.message || err);
  }
  clearInterval(_guet);
}

// ---------------------------------------------------------------------
//  LE HASARD FIXÉ ET LES EMPREINTES
// ---------------------------------------------------------------------
// FNV-1a sur 32 bits : rapide, sans dépendance, largement assez pour distinguer deux versions d'un même dessin.
function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
// mulberry32 : un générateur à graine, sur [0, 1[ comme Math.random
function generateur(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Le source d'une fonction sans ses commentaires ni ses blancs : l'empreinte ne bouge pas quand on retouche un
// commentaire ou l'indentation, ni entre un dépôt en fins de ligne Windows et le même en fins de ligne Unix.
// (Lecture caractère par caractère : un « // » dans une chaîne, comme 'http://', n'est pas un commentaire.)
function sourceNu(txt) {
  let out = '', i = 0, q = null;
  while (i < txt.length) {
    const c = txt[i], d = txt[i + 1];
    if (q) {                                             // dans une chaîne
      out += c;
      if (c === '\\') { out += d || ''; i += 2; continue; }
      if (c === q) q = null;
      i++; continue;
    }
    if (c === '/' && d === '/') { while (i < txt.length && txt[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const f = txt.indexOf('*/', i + 2); i = f < 0 ? txt.length : f + 2; continue; }
    if (c === '"' || c === "'" || c === '`') q = c;
    if (!/\s/.test(c)) out += c;
    i++;
  }
  return out;
}
const _sources = new WeakMap();
function texteDe(v) {
  if (typeof v === 'function') {
    let s = _sources.get(v);
    if (s === undefined) { s = sourceNu(v.toString()); _sources.set(v, s); }
    return s;
  }
  try { return JSON.stringify(v); } catch (e) { return String(v); }
}
function empreinteDe(sources) {
  return fnv(sources.map(texteDe).join('\u0001')).toString(16).padStart(8, '0');
}
// La clé d'un dessin : le nom de la fonction et ses paramètres simples (nombres arrondis au 1/10000 : un calcul
// qui tombe à 1e-15 près ne doit pas changer de clé). Les fonctions (canvasTex, un profil), la boîte à outils K et
// les objets de three ne comptent pas dans la clé (les profils comptent dans l'empreinte).
function cleDe(nom, args) {
  const parts = [];
  for (const a of args) {
    if (typeof a === 'number') parts.push(String(+a.toFixed(4)));
    else if (typeof a === 'string' || typeof a === 'boolean') parts.push(String(a));
    else if (a === null || a === undefined) parts.push('');
    else if (typeof a === 'object' && !a.canvasTex && !a.isObject3D && !a.isTexture) {
      try { parts.push(JSON.stringify(a)); } catch (e) { /* objet circulaire : hors de la clé */ }
    }
  }
  return nom + '(' + parts.join(',') + ')';
}

// ---------------------------------------------------------------------
//  REJOUER UNE TEXTURE CUITE
// ---------------------------------------------------------------------
// Les réglages que canvasTex et les fonctions de texture posent sur une texture, relevés à la cuisson et reposés
// tels quels (tout le reste est la valeur par défaut de three, identique des deux côtés).
const REGLAGES = ['wrapS', 'wrapT', 'magFilter', 'minFilter', 'anisotropy', 'colorSpace', 'flipY', 'premultiplyAlpha',
  'generateMipmaps', 'rotation', 'name'];
const VECTEURS = ['repeat', 'offset', 'center'];
function lireReglages(t) {
  const p = {};
  for (const k of REGLAGES) p[k] = t[k];
  for (const k of VECTEURS) p[k] = [t[k].x, t[k].y];
  return p;
}
function rejouer(c) {
  const { e, images } = c;
  // UNE MÊME IMAGE, UN SEUL ENVOI À LA CARTE GRAPHIQUE. Une clé peut servir plusieurs fois dans la construction
  // (le gazon du jardin, les feuilles et l'écorce des arbres du fond : jusqu'à trois appels). Chaque appel reçoit sa
  // propre texture (répétition, décalage, userData à lui, qu'on peut retoucher sans toucher aux autres), mais elles
  // partagent la même SOURCE (THREE.Source, comme le fait texture.clone()) : three n'envoie l'image qu'une fois et ne
  // garde qu'une copie en mémoire vidéo tant que leurs réglages d'échantillonnage sont les mêmes (voir
  // WebGLTextures.initTexture, et son compte d'utilisateurs : libérer l'une ne libère pas les autres). Le dessin
  // faisait une toile par appel ; l'image, identique, n'a aucune raison d'être envoyée deux fois.
  if (!c.sources) c.sources = [];
  // une CanvasTexture sur l'image décodée, comme canvasTex en fait une sur sa toile
  const texs = e.textures.map((d, i) => {
    const t = new THREE.CanvasTexture(images[i]);
    if (c.sources[i]) t.source = c.sources[i]; else c.sources[i] = t.source;
    for (const k of REGLAGES) if (k in d.reglages) t[k] = d.reglages[k];
    for (const k of VECTEURS) if (d.reglages[k]) t[k].fromArray(d.reglages[k]);
    // l'ImageBitmap est déjà retournée (chargerImage) : WebGL ne la retournerait pas de toute façon. (Les rares lecteurs
    // de l'image côté processeur — grainSur dans js/court_parc.js — la redressent quand flipY est à false.)
    if (typeof ImageBitmap !== 'undefined' && images[i] instanceof ImageBitmap) t.flipY = false;
    return t;
  });
  // les userData : valeurs simples recopiées, et liens entre textures d'un même dessin (le relief de la meulière)
  e.textures.forEach((d, i) => {
    for (const [k, v] of Object.entries(d.donnees || {})) texs[i].userData[k] = JSON.parse(JSON.stringify(v));
    for (const [k, j] of Object.entries(d.liens || {})) texs[i].userData[k] = texs[j];
  });
  etat.utilisees++;
  return texs[e.retour];
}

// ---------------------------------------------------------------------
//  LE JOURNAL DE CUISSON (tools/cuire_textures.html)
// ---------------------------------------------------------------------
const _journal = [];
export function journalCuisson() { return _journal; }
const estToile = (im) => !!im && ((typeof HTMLCanvasElement !== 'undefined' && im instanceof HTMLCanvasElement)
  || (typeof OffscreenCanvas !== 'undefined' && im instanceof OffscreenCanvas));
function consigner(cle, empreinte, r, ms) {
  const texs = [];
  const indice = (t) => { let i = texs.indexOf(t); if (i < 0) { texs.push(t); i = texs.length - 1; } return i; };
  if (!r || !r.isTexture) { _journal.push({ cle, empreinte, ms, erreur: 'la fonction ne rend pas une texture' }); return; }
  const retour = indice(r);
  const decrits = [];
  for (let i = 0; i < texs.length; i++) {            // (texs grandit quand un userData mène à une autre texture)
    const t = texs[i], donnees = {}, liens = {};
    for (const [k, v] of Object.entries(t.userData || {})) {
      if (v && v.isTexture) liens[k] = indice(v); else donnees[k] = v;
    }
    decrits.push({ toile: t.image, l: t.image && t.image.width, h: t.image && t.image.height, reglages: lireReglages(t), donnees, liens });
  }
  const erreur = decrits.some((d) => !estToile(d.toile)) ? 'image qui n\'est pas une toile' : null;
  _journal.push({ cle, empreinte, ms, retour, textures: decrits, erreur });
}

// ---------------------------------------------------------------------
//  LES OUTILS COMMUNS À TOUS LES DESSINS
// ---------------------------------------------------------------------
// Deux fonctions servent à presque tous les dessins sans figurer dans l'empreinte de chacun : canvasTex (js/court.js :
// la toile, sa réduction de moitié sur téléphone, l'espace de couleur, la répétition, l'anisotropie) et rnd
// (js/court_parc.js : un tirage dans un intervalle). Les mettre dans chaque empreinte aurait rendu toutes les images
// périmées à la moindre retouche de court.js ; ne pas les suivre du tout laissait passer, sans un mot, une retouche
// qui change VRAIMENT les images (un autre seuil de réduction sur téléphone : des images cuites à la mauvaise
// taille). Le manifeste garde donc leur empreinte à part (`outils`, relevée à la cuisson). Si l'une ne correspond
// plus, AUCUNE image cuite n'est servie : tout est dessiné, comme avec ?cuites=0, c'est signalé une fois dans la
// console, et le nom de l'outil apparaît dans window.__texCuites.perimees — jusqu'à la prochaine cuisson.
// canvasTex arrive avec chaque dessin (en paramètre, seul ou dans la boîte à outils K) ; rnd est déclaré par
// court_parc.js (declarerOutils). Tant qu'un outil n'a pas été vu, il n'est pas vérifié : on dessine.
const _outils = new Map();                               // nom -> fonction
let _outilsOk = null;                                    // null : pas encore tranché ; puis true ou false
export function declarerOutils(o) {
  for (const [nom, f] of Object.entries(o)) if (typeof f === 'function') _outils.set(nom, f);
}
function voirOutils(args) {
  for (const a of args) {
    if (typeof a === 'function' && a.name === 'canvasTex') _outils.set('canvasTex', a);
    else if (a && typeof a === 'object' && typeof a.canvasTex === 'function') _outils.set('canvasTex', a.canvasTex);
  }
}
function outilsOk() {
  if (_outilsOk !== null) return _outilsOk;
  if (!_outilsAttendus) return true;                     // manifeste d'avant ce contrôle : les empreintes seules
  for (const [nom, attendue] of Object.entries(_outilsAttendus)) {
    const f = _outils.get(nom);
    if (!f) return false;                                // pas encore vu : cette texture-ci est dessinée
    if (empreinteDe([f]) !== attendue) {
      _outilsOk = false;
      etat.perimees.push(nom);
      console.warn('[parc] l\'outil de dessin « ' + nom + ' » a changé depuis la cuisson : aucune texture cuite n\'est'
        + ' utilisée, tout est dessiné ; relancer tools/cuire_textures.html');
      return false;
    }
  }
  return (_outilsOk = true);
}
// (pour la page de cuisson : l'empreinte de chaque outil vu, écrite dans le manifeste)
export function journalOutils() {
  const o = {};
  for (const [nom, f] of _outils) o[nom] = empreinteDe([f]);
  return o;
}

// ---------------------------------------------------------------------
//  L'ENTRÉE : UNE TEXTURE, CUITE SI POSSIBLE, SINON DESSINÉE AU HASARD FIXÉ
// ---------------------------------------------------------------------
// `faire()` dessine ; `sources` : ce dont le dessin dépend (pour l'empreinte).
function produire(cle, sources, faire) {
  const c = _cuites.get(cle);
  let empreinte = null;
  if (c && outilsOk()) {
    empreinte = empreinteDe(sources);
    if (c.e.empreinte === empreinte) {
      // (même quand on ne dessine pas, les textures naissent sous le générateur à graine : three tire l'identifiant de
      // chaque objet au hasard, et quatre tirages de trop par texture décaleraient toute la suite du décor)
      const hasard = Math.random;
      Math.random = generateur(fnv(cle));
      try { return rejouer(c); } finally { Math.random = hasard; }
    }
    if (!etat.perimees.includes(cle)) {
      etat.perimees.push(cle);
      console.warn('[parc] texture cuite périmée (le dessin a changé depuis la cuisson) : ' + cle
        + ' — elle est dessinée ; relancer tools/cuire_textures.html');
    }
  }
  const hasard = Math.random, t0 = performance.now();
  Math.random = generateur(fnv(cle));
  let r;
  try { r = faire(); } finally { Math.random = hasard; }
  const ms = performance.now() - t0;
  etat.dessinees++; etat.msDessin += ms;
  if (CUISSON) consigner(cle, empreinte || empreinteDe(sources), r, ms);
  return r;
}

// Pour une FONCTION DE TEXTURE, en première ligne :
//     const cuite = texCuite(maFonction, arguments, [DEPENDANCES]); if (cuite) return cuite;
// Au premier passage, texCuite rend la texture cuite, ou bien rappelle la fonction elle-même au hasard fixé et rend
// son résultat ; pendant ce second passage elle rend null, et la fonction dessine comme avant. `deps` : constantes et
// fonctions d'aide dont le dessin dépend (les fonctions passées en paramètre y sont ajoutées d'office) ;
// `cleArgs` : les paramètres qui font la clé, quand ce ne sont pas tous les paramètres simples.
const _enCours = new Set();
export function texCuite(fn, args, deps = [], cleArgs = null) {
  if (HASARD || _enCours.has(fn)) return null;
  const liste = Array.from(args);
  voirOutils(liste);
  const sources = [fn, ...deps, ...liste.filter((a) => typeof a === 'function' && a.name !== 'canvasTex')];
  return produire(cleDe(fn.name, cleArgs || liste), sources, () => {
    _enCours.add(fn);
    try { return fn.apply(null, liste); } finally { _enCours.delete(fn); }
  });
}

// Pour une toile dessinée au milieu d'une fonction de décor (le coin de la cage) : `nom` et `params` font la clé,
// `sources` l'empreinte (la fonction qui dessine, ses constantes, les profils dont elle dépend), `faire()` rend la
// texture.
export function texCuiteAppel(nom, params, sources, faire) {
  if (HASARD) return faire();
  return produire(cleDe(nom, params), sources, faire);
}
