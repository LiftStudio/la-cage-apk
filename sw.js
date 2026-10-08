// Service worker : le jeu fonctionne hors ligne une fois visité (PWA). Modules et pages : réseau d'abord (pour les mises à jour),
// gros fichiers (modèles, animations, polices, vendor) : cache d'abord.
// A BUMPER DES QUE index.html, style.css, le manifeste OU UN FICHIER LOURD changent : les pages sont
// pourtant servies « reseau d'abord », mais index.html est AUSSI pre-cache dans CORE a l'installation, et
// j'ai vu de mes yeux une ancienne page revenir apres un rechargement — un ecran entier du menu manquait.
// Changer la version purge les anciens caches a l'activation, c'est la seule garantie.
//
// LES FICHIERS LOURDS AUSSI, et c'est le piege qui m'a coute plusieurs allers-retours : textures, modeles
// et animations sont servis CACHE D'ABORD. Une texture refaite mais servie sous la meme version restait
// donc l'ancienne sur l'appareil de Haythem — il regardait un terrain d'il y a trois livraisons en me
// disant que je n'avais rien corrige. Depuis, ils sont revalides EN TACHE DE FOND (voir plus bas), mais
// ca ne rattrape la chose qu'au lancement suivant : la version reste la seule facon de corriger tout de
// suite.
//
// LES DONNÉES DU PARC ENTIER (assets/parc/monde/ : sol.bin, nappes.bin, drapeaux.bin, surfaces.bin, arbres.bin, sols.webp)
// sont des fichiers lourds comme les autres : en cache dès la première visite du parc entier, donc jouables hors ligne.
// js/monde_donnees.js les demande avec l'empreinte des données dans l'adresse (?v=<hash de monde.json>) : de nouvelles
// données sont une nouvelle adresse, jamais servies depuis l'ancien cache ; monde.json, lui, est servi réseau d'abord.
// (v5.2 a été prise en même temps par le lot « manette » : le parc entier passe à v5.3, pour qu'une version ne serve
// jamais à deux livraisons différentes)
const VERSION = 'lacage-v8.2';
// (les icônes du manifeste, « any » et « maskable », et le logo du menu : tools/icones.py)
const CORE = ['./', './index.html', './css/style.css', './manifest.webmanifest', './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png', './assets/icons/icon-maskable-512.png', './assets/icons/logo.webp'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const heavy = /\.(glb|gltf|fbx|png|jpg|jpeg|webp|woff2?|ttf|hdr|bin)$/i.test(url.pathname) || url.pathname.includes('/vendor/') || url.hostname.includes('gstatic') || url.hostname.includes('jsdelivr');
  if (heavy) {
    // CACHE D'ABORD, PUIS REVALIDATION EN TACHE DE FOND. On sert le cache tout de suite — c'est ce qui
    // rend le jeu jouable hors ligne et evite de retelecharger vingt megaoctets de modeles a chaque
    // lancement — mais on va quand meme rechercher le fichier derriere, et on remplace l'entree du cache
    // s'il a change. L'image affichee reste l'ancienne pour cette session ; la suivante est a jour.
    // Sans ca, un fichier lourd corrige ne revenait JAMAIS sans changement de version.
    // (Sauf une copie de moins de dix minutes — d'après son en-tête Date, celui du serveur : elle vient d'arriver, rangée
    // par l'écran de chargement (js/chargement.js) ou revalidée juste avant. La redemander, c'était tout retélécharger
    // en tâche de fond au premier lancement dans une navigation privée, dont le petit cache HTTP en mémoire ne garde
    // pas les gros fichiers : 37 Mo sur 60, relevés. Dix minutes, c'est aussi la fraîcheur que GitHub Pages donne à
    // ses fichiers : ailleurs, ces revalidations ne partaient de toute façon pas sur le réseau.)
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const hit = await c.match(req);
      if (hit && Math.abs(Date.now() - Date.parse(hit.headers.get('date') || '')) < 600000) return hit;
      const frais = fetch(req).then((res) => { if (res && res.ok) c.put(req, res.clone()); return res; })
                              .catch(() => null);
      if (hit) { e.waitUntil(frais); return hit; }
      return (await frais) || Response.error();
    }));
  } else if (url.origin === location.origin) {
    // (la copie se fait TOUT DE SUITE : faite une fois le cache ouvert, la page avait déjà commencé à lire la réponse,
    // clone() échouait en silence et rien — modules, pages, monde.json — n'était jamais gardé pour le hors-ligne)
    e.respondWith(fetch(req).then((res) => {
      if (res && res.ok) { const copie = res.clone(); caches.open(VERSION).then((c) => c.put(req, copie)); }
      return res;
    }).catch(() => caches.match(req)));
  }
});
