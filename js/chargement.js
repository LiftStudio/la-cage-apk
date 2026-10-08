// =====================================================================
//  L'ÉCRAN DE CHARGEMENT : UN VRAI TÉLÉCHARGEMENT (06/10/2026)
// =====================================================================
// Avant, un écran fixe (« Chargement du terrain… ») restait affiché pendant que tout arrivait dans le désordre : rien ne
// disait si ça avançait, ni combien il restait. Au premier lancement sur un téléphone, c'était une minute devant un
// texte immobile ; puis le menu paraissait, et se figeait encore plusieurs secondes le temps de compiler les effets.
// Comme dans les gros jeux, on télécharge maintenant D'ABORD, avec une vraie barre, puis on prépare le menu, et on ne
// lève le rideau qu'une fois le menu prêt à tourner sans à-coup :
//
//   1. FICHIERS (ce script, classique et non module : il démarre avant les modules du jeu). La liste vient de
//      assets/chargement.json (fabriqué par tools/liste_chargement.py) : pour le terrain choisi et l'appareil (PC ou
//      téléphone), les modèles, textures, clips d'animation et le joueur choisi dont le menu a besoin, avec leur taille.
//      Ils sont téléchargés six à la fois, en LISANT le flux pour compter les octets — les vrais chargeurs du jeu les
//      retrouvent ensuite dans le cache du service worker, enregistré dès le premier lancement (voir prendreSW), ou à
//      défaut dans le cache HTTP : rien n'est téléchargé deux fois. Les modules du jeu (js/, vendor/), eux, sont
//      chargés par le navigateur en même temps : on les COMPTE au passage (PerformanceObserver), sans les redemander.
//      Deuxième lancement : le service worker a déjà tout → « Vérification des fichiers… », une fraction de seconde.
//      Dans l'APK (Capacitor), les fichiers sont dans l'application : rien à télécharger.
//   2. TERRAIN, JOUEURS ET ANIMATIONS, EFFETS (shaders), PREMIÈRE IMAGE : js/main.js et js/demarrage.js disent où ils
//      en sont (window.__chargement.etape / avance).
//   3. « TOUCHE L'ÉCRAN POUR COMMENCER » : ce geste allume le son et passe en plein écran au téléphone (les deux
//      exigent un geste), puis le rideau se lève sur le menu.
//
// Un fichier qui ne vient pas est redemandé (quatre essais, de plus en plus espacés) ; au bout, l'écran le dit avec
// RÉESSAYER et CONTINUER (le jeu tente alors lui-même) — hors ligne avec le jeu déjà en cache, on continue sans
// attendre. Une liste absente, périmée ou qui ne vient pas (15 s au plus) n'empêche jamais de jouer : un fichier
// introuvable (404) est sauté, et ce qui manque à la liste se charge à l'étape suivante.
// Le garde-fou de 90 s (index.html) ne se déclenche pas tant que le téléchargement avance ou réessaie.
//
// `?chargement=trace` : sans téléchargement, relève les fichiers réellement demandés jusqu'au menu prêt
// (window.__chargement.traceFigee) — c'est la matière de tools/liste_chargement.py.
(function () {
  'use strict';
  var boot = document.getElementById('boot');
  if (!boot || window.__chargement || window.__incompatible) return;   // (sans WebGL 2 : le message d'index.html reste seul)

  var $ = function (id) { return document.getElementById(id); };
  var E = {
    etape: $('boot-etape'), pct: $('boot-pct'), barre: $('boot-barre'), rempli: $('boot-rempli'), details: $('boot-details'),
    astuce: $('boot-astuce'), astuceTexte: $('boot-astuce-texte'), go: $('boot-go'),
    erreurTitre: $('boot-erreur-titre'), erreurTexte: $('boot-erreur-texte'), reessayer: $('boot-reessayer'), continuer: $('boot-continuer'),
    version: $('boot-version'),
  };
  var maintenant = function () { return window.performance && performance.now ? performance.now() : Date.now(); };
  var attendre = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
  var lire = function (cle) { try { return JSON.parse(localStorage.getItem(cle) || 'null'); } catch (e) { return null; } };
  var params = null;
  try { params = new URLSearchParams(location.search); } catch (e) { /* très vieux navigateur */ }
  var arg = function (k) { return params ? params.get(k) : null; };
  var TRACE = arg('chargement') === 'trace';
  var MOUVEMENT_REDUIT = false;
  try { MOUVEMENT_REDUIT = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }

  // ---------------------------------------------------------------------
  //  L'APPAREIL ET LE TERRAIN : les mêmes règles que le jeu (js/appareil.js, js/settings.js PARC_ENTIER, js/touch.js)
  // ---------------------------------------------------------------------
  var TELEPHONE = (function () {
    var t = arg('tel');
    if (t === '1') return true;
    if (t === '0') return false;
    try {
      return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
        || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches);
    } catch (e) { return false; }
  })();
  // un VRAI écran tactile (js/touch.js VRAI_TACTILE) : un PC sous ?tel=1 se clique, il ne se touche pas
  var TACTILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  try { TACTILE = TACTILE || ((('ontouchstart' in window) || navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches); } catch (e) { /* ignore */ }
  var jeu = (lire('hoops.settings.v1') || {}).game || {};
  var terrain = jeu.terrain || 'becon';
  var parcEntier = (function () {
    var p = arg('parc');
    if (p === 'entier') return true;
    if (p === 'plateau') return false;
    if (jeu.parcEntier) return true;
    var mode = jeu.parcMode || 'auto';
    return mode === 'entier' || (mode === 'auto' && !TELEPHONE);
  })();
  var PROFIL = terrain + (parcEntier && /^parc/.test(terrain) ? '+entier' : '') + '/' + (TELEPHONE ? 'tel' : 'pc');
  // dans l'APK (Capacitor) ou en fichier local, tout est déjà sur l'appareil
  var NATIF = location.protocol === 'file:' || location.protocol === 'capacitor:'
    || !!(window.Capacitor && (typeof window.Capacitor.isNativePlatform !== 'function' || window.Capacitor.isNativePlatform()));

  // ---------------------------------------------------------------------
  //  LA BARRE : chaque étape a une plage à la mesure de sa DURÉE, pour que la barre avance d'un pas régulier. Les durées
  //  sont celles du lancement précédent sur cet appareil et ce terrain (localStorage, écrites par pret()), sinon des
  //  valeurs moyennes. Le téléchargement est estimé d'après son volume et le débit du dernier téléchargement ; il prend
  //  l'essentiel de la barre au premier lancement, la vérification presque rien aux suivants.
  // ---------------------------------------------------------------------
  var CLE_DUREES = 'lacage.chargement.v1';
  var ETAPES = ['fichiers', 'terrain', 'joueurs', 'shaders', 'image'];
  var DUREES = { fichiers: 2000, terrain: 2500, joueurs: 5000, shaders: 8000, image: 2000 };      // ms
  var memoire = lire(CLE_DUREES) || {};
  (function () {
    var d = (memoire.profils || {})[PROFIL] || {};
    for (var k in DUREES) if (d[k] > 0 && d[k] < 120000) DUREES[k] = d[k];
  })();
  var PLAGE = {};
  // `fichiers` : la durée attendue des fichiers (ms) ; leur part de la barre reste dans [part0, part1] (%)
  function plages(fichiers, part0, part1) {
    var prep = 0, k;
    for (k = 1; k < ETAPES.length; k++) prep += DUREES[ETAPES[k]];
    var pf = Math.max(part0, Math.min(part1, 100 * fichiers / (fichiers + prep))), t = pf;
    PLAGE = { fichiers: [0, pf] };
    for (k = 1; k < ETAPES.length; k++) {
      var d = (100 - pf) * DUREES[ETAPES[k]] / prep;
      PLAGE[ETAPES[k]] = [t, k === ETAPES.length - 1 ? 100 : t + d]; t += d;
    }
  }
  plages(DUREES.fichiers, 3, 25);
  var LIBELLES = {
    verification: 'Vérification des fichiers…', telechargement: 'Téléchargement des ressources', terrain: 'Préparation du terrain',
    joueurs: 'Joueurs et animations', shaders: 'Compilation des effets (shaders)', image: 'Compilation des effets (shaders)', pret: 'Prêt',
  };
  var mode = 'verification', etape = 'fichiers', valeur = 0, plancher = 0, dernierSigne = Date.now(), enErreur = false, fini = false;

  function libelle(t) { if (E.etape && E.etape.textContent !== t) E.etape.textContent = t; }
  function poser(v) {
    v = Math.max(0, Math.min(100, v));
    if (v <= valeur + 0.05 && v !== 100) return;
    valeur = v; dernierSigne = Date.now();
    if (E.rempli && valeur >= plancher) { E.rempli.style.transition = ''; E.rempli.style.transform = 'scaleX(' + (valeur / 100).toFixed(4) + ')'; }
    if (E.pct) E.pct.textContent = Math.floor(valeur) + ' %';
    if (E.barre) E.barre.setAttribute('aria-valuenow', String(Math.floor(valeur)));
  }
  function avance(f) {
    var p = PLAGE[etape];
    if (!p) return;
    f = Math.max(0, Math.min(1, f || 0));
    poser(p[0] + (p[1] - p[0]) * f);
  }
  // Avant une étape qui tient le fil principal d'un bloc (le terrain, la première image), la barre file d'elle-même vers
  // `f` de l'étape en `ms` : une transition CSS de transform, que le compositeur anime sans le fil principal.
  function glisser(f, ms) {
    var p = PLAGE[etape];
    if (!p || !E.rempli || MOUVEMENT_REDUIT) return;
    var v = p[0] + (p[1] - p[0]) * f;
    if (v <= Math.max(valeur, plancher)) return;
    plancher = v;
    E.rempli.style.transition = 'transform ' + Math.round(ms) + 'ms cubic-bezier(.25,.6,.45,1)';
    E.rempli.style.transform = 'scaleX(' + (v / 100).toFixed(4) + ')';
  }
  // les durées de chaque étape, pour la console (et window.__chargement.mesures)
  var jalons = [];
  function jalon(nom) { jalons.push([nom, maintenant()]); }
  function passerA(cle, f) {
    if (cle !== etape) jalon(cle);
    etape = cle; dernierSigne = Date.now();
    if (cle !== 'fichiers') { libelle(LIBELLES[cle]); details(''); }
    avance(f || 0);
    if (cle === 'terrain' || cle === 'image') glisser(0.92, DUREES[cle]);
  }
  function details(t) { if (E.details && E.details.textContent !== t) E.details.textContent = t; }

  // ---------------------------------------------------------------------
  //  LE TÉLÉCHARGEMENT
  // ---------------------------------------------------------------------
  var PARALLELES = 6, ESSAIS = 4, DELAIS = [600, 1800, 4000], BLOCAGE_MS = 20000, LISTE_MS = 15000;
  var D = { total: 0, recu: 0, js: {}, jsTotal: 0, jsRecu: 0, echecs: [], echantillons: [], t0: 0, enCours: false, cache: null, ecritures: [] };
  var modulesCharges = false, lourdsFinis = false, resoudreFichiers = null;
  var promesseFichiers = new Promise(function (ok) { resoudreFichiers = ok; });
  var Mo = function (o) { return (o / 1048576).toFixed(o >= 104857600 ? 0 : 1).replace('.', ',') + ' Mo'; };

  // les modules comptés au passage, sans être redemandés
  var chemin = function (url) {
    try { var u = new URL(url, location.href); return u.origin === location.origin ? decodeURI(u.pathname + u.search).replace(base(), '') : null; } catch (e) { return null; }
  };
  var _base = null;
  function base() {
    if (_base === null) { var p = location.pathname; _base = p.slice(0, p.lastIndexOf('/') + 1); }
    return _base;
  }
  var vus = [];          // (mode trace) tout ce qui a été demandé, dans l'ordre
  var dejaVus = {};      // chemins déjà arrivés (les modules finis avant que la liste ne soit lue)
  function observer() {
    try { if (performance.setResourceTimingBufferSize) performance.setResourceTimingBufferSize(5000); } catch (e) { /* ignore */ }
    if (typeof PerformanceObserver !== 'function') return;
    try {
      new PerformanceObserver(function (liste) {
        var es = liste.getEntries();
        for (var i = 0; i < es.length; i++) {
          var c = chemin(es[i].name);
          if (!c) continue;
          if (TRACE) vus.push({ c: c, t: es[i].startTime });
          dejaVus[c] = true;
          var j = D.js[c];
          if (j && !j.vu) { j.vu = true; D.jsRecu += j.taille; majTelechargement(); }
        }
      }).observe({ type: 'resource', buffered: true });
    } catch (e) { /* ancien navigateur : la barre suit les seuls fichiers lourds */ }
  }

  function majTelechargement() {
    if (etape !== 'fichiers' || fini) return;
    var tot = D.total + D.jsTotal;
    avance(tot > 0 ? (D.recu + D.jsRecu) / tot : 1);
    dernierSigne = Date.now();
  }
  // le débit, sur les trois dernières secondes, et le temps restant ; affichés quand on télécharge vraiment
  function majDetails() {
    if (etape !== 'fichiers' || fini || enErreur) return;
    var t = maintenant(), n = D.recu + D.jsRecu, tot = D.total + D.jsTotal;
    var ech = D.echantillons;
    ech.push([t, n]);
    while (ech.length > 2 && t - ech[0][0] > 3000) ech.shift();
    var lent = t - D.t0 > 700;
    if (mode === 'telechargement' && lent) {
      libelle(LIBELLES.telechargement);
      var dt = (t - ech[0][0]) / 1000, debit = dt > 0.4 ? (n - ech[0][1]) / dt : 0;
      // (lissé ; un échantillon vide — fil principal pris, lectures en attente — garde le débit affiché juste avant)
      if (debit > 1024) { D.debit = D.debit ? 0.75 * D.debit + 0.25 * debit : debit; D.debitT = t; debit = D.debit; }
      else if (D.debit && t - D.debitT < 2500) debit = D.debit;
      var txt = Mo(Math.min(n, tot)) + ' / ' + Mo(tot);
      if (debit > 1024 && t - D.t0 > 1200) {
        txt += ' · ' + Mo(debit) + '/s';
        var reste = (tot - n) / debit;
        if (reste > 3) txt += ' · ' + (reste < 90 ? '~' + Math.ceil(reste) + ' s' : '~' + Math.ceil(reste / 60) + ' min');
      }
      details(txt);
    } else libelle(LIBELLES.verification);
  }

  function crediter(f, n) {
    if (n <= f.credit) return;
    D.recu += n - f.credit; f.credit = n;
    if (f.credit > f.taille) { D.total += f.credit - f.taille; f.taille = f.credit; }
    majTelechargement();
  }

  async function unEssai(f) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, veille = 0, lecteur = null, coupe = false;
    // (la lecture est annulée elle aussi : un navigateur dont l'abandon n'interromprait pas une lecture en attente ne
    // laisse pas l'essai — et le garde-fou de 90 s, qui le voit réessayer — attendre pour toujours)
    var reveil = function () {
      clearTimeout(veille);
      veille = setTimeout(function () {
        coupe = true;
        if (ctl) ctl.abort();
        if (lecteur) try { lecteur.cancel().catch(function () { /* ignore */ }); } catch (e) { /* ignore */ }
      }, BLOCAGE_MS);
    };
    try {
      reveil();
      var r = await fetch(f.url, ctl ? { signal: ctl.signal } : undefined);
      if (r.status === 404 || r.status === 410) {
        // la liste est en retard sur le jeu : on saute, le vrai chargeur dira ce qui manque
        console.warn('[chargement] absent du serveur, sauté :', f.url);
        crediter(f, f.taille);
        return 'absent';
      }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      // taille annoncée par le serveur : elle corrige la liste si le fichier a changé depuis
      var cl = Number(r.headers.get('content-length')) || 0;
      if (cl > 0 && !r.headers.get('content-encoding') && cl !== f.taille && f.credit === 0) { D.total += cl - f.taille; f.taille = cl; }
      // une copie pour le cache du service worker, écrite pendant qu'on lit (voir cacheCourant) — sauf si le nôtre tient
      // déjà la page (prendreSW) : la demande est passée par lui, il l'a rangée lui-même
      if (D.cache && r.status === 200 && !(swNeuf && navigator.serviceWorker.controller)) {
        try { D.ecritures.push(D.cache.put(f.url, r.clone()).catch(function () { /* quota : le service worker le gardera lui-même */ })); } catch (e) { /* ignore */ }
      }
      var lu = 0;
      if (r.body && r.body.getReader) {
        lecteur = r.body.getReader();
        for (;;) {
          var x = await lecteur.read();
          if (x.done) break;
          lu += x.value.byteLength; crediter(f, lu); reveil();
        }
        // (annulée par la veille : un fichier incomplet n'est pas un fichier reçu)
        if (coupe) { var ab = new Error('coupé'); ab.name = 'AbortError'; throw ab; }
      } else lu = (await r.arrayBuffer()).byteLength;
      crediter(f, Math.max(lu, f.taille));      // fini : il compte pour sa taille entière
      return 'ok';
    } catch (e) {
      f.erreur = (e && e.name === 'AbortError') ? 'plus de nouvelles du serveur' : String((e && e.message) || e);
      return 'erreur';
    } finally { clearTimeout(veille); }
  }
  // hors ligne, le jeu déjà gardé par le service worker (une visite précédente) : rien ne viendra, inutile d'insister,
  // il partira avec ce que son cache a (et demandera lui-même le reste, qui lui manquera comme à nous)
  function horsLigneAvecCache() {
    return navigator.onLine === false && !!(navigator.serviceWorker && navigator.serviceWorker.controller);
  }
  async function telecharger(f) {
    for (var essai = 0; essai < ESSAIS; essai++) {
      if (essai) {
        if (horsLigneAvecCache()) break;
        dernierSigne = Date.now(); await attendre(DELAIS[essai - 1] || 4000);
      }
      // chaque essai est un signe de vie pour le garde-fou de 90 s (index.html) : un fichier qui ne répond pas prend
      // jusqu'à 4 × 20 s, sans un octet, avant que RÉESSAYER ne paraisse — ce n'est pas un jeu bloqué
      dernierSigne = Date.now();
      if ((await unEssai(f)) !== 'erreur') return;
    }
    D.echecs.push(f);
  }
  async function lancer(liste) {
    D.enCours = true; enErreur = false;
    if (!D.tl0) D.tl0 = maintenant();
    boot.classList.remove('boot-en-erreur');
    var file = liste.slice();
    // (le jeu ne peut pas démarrer — message d'index.html, « boot-fatal » — : inutile de continuer à télécharger)
    var ouvrier = async function () { while (file.length && !boot.classList.contains('boot-fatal')) await telecharger(file.shift()); };
    var o = [];
    for (var i = 0; i < Math.min(PARALLELES, file.length); i++) o.push(ouvrier());
    await Promise.all(o);
    D.enCours = false;
    dernierSigne = Date.now();
    if (!D.tl1) D.tl1 = maintenant();
    if (D.echecs.length && horsLigneAvecCache()) {
      console.warn('[chargement] hors ligne : on part avec le cache, sans', D.echecs.map(function (f) { return f.url; }).join(', '));
      D.echecs = []; lourdsFinis = true; verifierFin();
    } else if (D.echecs.length) montrerErreur();
    else { lourdsFinis = true; verifierFin(); }
  }
  function montrerErreur() {
    enErreur = true;
    var n = D.echecs.length, horsLigne = navigator.onLine === false;
    console.warn('[chargement] échec :', D.echecs.map(function (f) { return f.url + ' (' + f.erreur + ')'; }).join(', '));
    if (E.erreurTitre) E.erreurTitre.textContent = horsLigne ? 'PAS DE CONNEXION' : 'TÉLÉCHARGEMENT INTERROMPU';
    if (E.erreurTexte) {
      E.erreurTexte.textContent = (n > 1 ? n + ' fichiers n’ont' : 'Un fichier n’a') + ' pas pu être téléchargé' + (n > 1 ? 's' : '')
        + (horsLigne ? ' : l’appareil n’est plus connecté à internet.' : '.') + ' Vérifie ta connexion puis réessaie.';
    }
    boot.classList.add('boot-en-erreur');
    if (E.reessayer) setTimeout(function () { try { E.reessayer.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 50);
  }
  function reessayer() {
    if (!enErreur) return;
    var l = D.echecs; D.echecs = [];
    for (var i = 0; i < l.length; i++) l[i].erreur = null;
    lancer(l);
  }
  if (E.reessayer) E.reessayer.addEventListener('click', reessayer);
  if (E.continuer) E.continuer.addEventListener('click', function () {
    if (!enErreur) return;
    // on part sans eux : le jeu les demandera lui-même (et le dira s'ils manquent)
    enErreur = false; boot.classList.remove('boot-en-erreur');
    lourdsFinis = true; verifierFin();
  });
  window.addEventListener('online', function () { if (enErreur) reessayer(); });

  function verifierFin() {
    if (!lourdsFinis || !modulesCharges || fini) return;
    fini = true;
    avance(1);
    details('');
    jalon('fichiers prêts');
    // les vrais chargeurs ne partent qu'avec le service worker aux commandes et les copies écrites dans son cache (voir
    // prendreSW) ; trois secondes au plus — d'habitude, c'est fait depuis longtemps
    Promise.race([Promise.all([promesseSW].concat(D.ecritures)), attendre(3000)]).then(resoudreFichiers, resoudreFichiers);
  }

  // LE SERVICE WORKER AUX COMMANDES DÈS LE PREMIER LANCEMENT. js/main.js ne l'enregistre qu'une fois le terrain construit :
  // les copies rangées dans son cache (unEssai) ne servaient qu'au lancement suivant, et celui-ci comptait sur le seul
  // cache HTTP pour que les vrais chargeurs retrouvent les fichiers. Une navigation privée n'a qu'un petit cache HTTP, en
  // mémoire : relevé dans un tel contexte, 23 Mo sur 60 (cars.glb, enduit.jpg, ball.glb...) repartaient par le réseau
  // après la barre. On l'enregistre donc dès le début (sw.js : skipWaiting puis clients.claim — il prend la page en main
  // en une fraction de seconde) ; il sert ensuite les fichiers lourds depuis son cache.
  // (Rien à faire s'il tient déjà la page, dans l'APK, ou en relevé : là, on mesure le jeu tel quel.)
  var swNeuf = false, promesseSW = Promise.resolve();
  function prendreSW() {
    var sw = navigator.serviceWorker;
    if (!sw || sw.controller || NATIF || TRACE || !/^https?:$/.test(location.protocol)) return;
    swNeuf = true;
    promesseSW = new Promise(function (ok) {
      sw.addEventListener('controllerchange', function () { ok(); });
      sw.register('./sw.js').then(function (reg) {
        var w = reg.installing || reg.waiting;
        // déjà actif sans tenir la page (rechargement forcé, Ctrl+F5) : il ne la prendra pas
        if (!w) return ok();
        w.addEventListener('statechange', function () { if (w.state === 'redundant') ok(); });
      }, function () { ok(); });
    }).catch(function () { /* ignore */ });
  }

  // LE CACHE DU SERVICE WORKER, celui de la version en cours (sw.js : VERSION = 'lacage-vX.Y', le nom de son cache).
  // Au tout premier lancement, le service worker ne prend la page qu'une fois installé (prendreSW) : ce qu'on télécharge
  // avant ne passe pas par lui, et le lancement suivant l'aurait revérifié par le réseau. On y range donc nous-mêmes une
  // copie de ces fichiers (même cache, même adresse : il les servira « cache d'abord » comme les siens).
  // Après une nouvelle version, ce cache est neuf : les fichiers repassent par le téléchargement — une mise à jour, que
  // le cache HTTP rend courte quand rien n'a changé.
  var promesseCache = null;
  function cacheCourant() {
    if (!promesseCache) {
      promesseCache = (!window.caches || !('serviceWorker' in navigator) || NATIF || !/^https?:$/.test(location.protocol))
        ? Promise.resolve(null)
        : Promise.race([promesseVersion, attendre(3000).then(function () { return null; })]).then(function (v) {
          return v ? caches.open('lacage-v' + v) : null;
        }).catch(function () { return null; });
    }
    return promesseCache;
  }
  // ce qui est déjà dans ce cache n'est pas à retélécharger (deuxième lancement, hors ligne) — à condition que le service
  // worker soit aux commandes : sans lui, les chargeurs du jeu ne liraient pas ce cache
  async function dejaEnCache(liste) {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return liste;
    var c = await cacheCourant();
    if (!c) return liste;
    var tri = Promise.all(liste.map(function (f) {
      return c.match(f.url).then(function (r) { return r ? null : f; }, function () { return f; });
    })).then(function (l) { return l.filter(Boolean); });
    // (jamais plus de trois secondes : au pire, on revérifie tout par le réseau)
    return Promise.race([tri, attendre(3000).then(function () { return liste; })]);
  }
  // l'écran de chargement lui-même, pour le lancement suivant hors ligne (déjà dans le cache HTTP : rien ne repart)
  function garderEcran(c) {
    ['assets/chargement/logo_cage.webp', 'assets/chargement/logo_ballon.webp', 'assets/chargement.json'].forEach(function (u) {
      c.match(u).then(function (r) { return r || c.add(u); }).catch(function () { /* ignore */ });
    });
  }

  async function demarrer() {
    D.t0 = maintenant();
    jalon('fichiers');
    observer();
    var minuterie = setInterval(function () { if (fini) clearInterval(minuterie); else majDetails(); }, 250);
    libelle(LIBELLES.verification);
    // (les modules s'évaluent pendant ce temps et tiennent le fil principal : la barre file d'elle-même)
    glisser(0.85, DUREES.fichiers);
    if (TRACE || NATIF) { lourdsFinis = true; verifierFin(); return; }
    prendreSW();
    var man = null;
    // (15 s au plus : une liste qui ne vient pas ne retient pas le jeu — ses modules, eux, sont peut-être déjà là)
    var ctlListe = typeof AbortController === 'function' ? new AbortController() : null;
    var veilleListe = setTimeout(function () { if (ctlListe) ctlListe.abort(); }, LISTE_MS);
    try {
      man = await Promise.race([
        fetch('assets/chargement.json', ctlListe ? { cache: 'no-cache', signal: ctlListe.signal } : { cache: 'no-cache' })
          .then(function (r) { return r.ok ? r.json() : null; }),
        attendre(LISTE_MS + 500).then(function () { return null; }),
      ]);
    } catch (e) { /* hors ligne sans cache, ou liste absente : on passe directement au jeu */ }
    clearTimeout(veilleListe);
    if (!man && ctlListe && ctlListe.signal.aborted) console.warn('[chargement] la liste ne vient pas : le jeu charge seul');
    if (!man || !man.fichiers) { lourdsFinis = true; verifierFin(); return; }
    var F = man.fichiers, pris = {}, lourds = [];
    var prendre = function (i) {
      var e = F[i];
      if (!e || pris[e[0]]) return;
      pris[e[0]] = true;
      lourds.push({ url: e[0], taille: e[1] || 0, credit: 0, erreur: null });
    };
    (man.profils && man.profils[PROFIL] || []).forEach(prendre);
    // le joueur choisi au menu (index dans le roster, js/ui.js) : sa fiche s'ouvre en un geste
    try {
      var A = man.avatars || {}, idx = (lire('hoops.menu.v2') || {}).player || 0, id = (A.ordre || [])[idx];
      var i = id && (A[TELEPHONE ? 'tel' : 'pc'] || {})[id];
      if (i !== undefined && i !== null) prendre(i);
    } catch (e) { /* ignore */ }
    (man.js || []).forEach(function (i) {
      var e = F[i];
      if (!e || D.js[e[0]]) return;
      var vu = !!dejaVus[e[0]];
      D.js[e[0]] = { taille: e[1] || 0, vu: vu };
      D.jsTotal += e[1] || 0;
      if (vu) D.jsRecu += e[1] || 0;
    });
    var aFaire = await dejaEnCache(lourds);
    mode = aFaire.length ? 'telechargement' : 'verification';
    // (les modules : en vérification, ils ne comptent pas — c'est le service worker qui les sert)
    if (mode === 'verification') { D.js = {}; D.jsTotal = 0; D.jsRecu = 0; }
    if (modulesCharges) D.jsRecu = D.jsTotal;
    for (var k = 0; k < aFaire.length; k++) D.total += aFaire[k].taille;
    if (mode === 'telechargement') {
      // sa part de la barre : sa durée estimée au débit du dernier téléchargement (3 Mo/s sans mesure), face à la
      // préparation du menu
      var debit = memoire.debit > 65536 ? memoire.debit : 3 * 1048576;
      plages(Math.max(DUREES.fichiers, 1000 * (D.total + D.jsTotal - D.jsRecu) / debit), 30, 85);
    }
    majTelechargement();
    if (!aFaire.length) { lourdsFinis = true; verifierFin(); return; }
    D.cache = await cacheCourant();
    if (D.cache) garderEcran(D.cache);
    await lancer(aFaire);
  }

  // ---------------------------------------------------------------------
  //  LES ASTUCES (une toutes les sept secondes, fondu)
  // ---------------------------------------------------------------------
  var ASTUCES = [
    'Au tir, garde le bouton enfoncé et relâche au sommet du saut, quand la jauge passe dans le vert.',
    'Relâche le tir tout de suite après l’avoir armé : c’est une feinte. Le défenseur peut mordre et sauter pour rien.',
    'En demi-terrain, après un changement de possession, ressors la balle derrière la ligne à 3 points avant d’attaquer.',
    'En 1 contre 1, pas de rebond : un tir raté ou contré, et la balle est à l’adversaire.',
    'En balade, entre dans le cercle bleu au centre du terrain pour lancer un match, du 1 contre 1 au 5 contre 5.',
    'Pierrick, le marchand de La Cage, vend à manger : un boost pour ton prochain match. Il a aussi des ballons et des tenues.',
    'Deux paniers de suite et tu es en feu : plus rapide, plus adroit, et la balle s’enflamme.',
    'Un contre ou une interception font monter ton momentum.',
    'Terrain entier : 14 secondes par possession. Après un panier, l’équipe qui l’encaisse remet en jeu depuis sa ligne de fond.',
    'Les vœux débloquent de nouveaux joueurs. Chaque match rapporte un jeton, et deux de plus si tu gagnes.',
    'Joue en ligne : choisis ton pseudo et retrouve tes amis sur le même terrain, puis entrez ensemble dans le cercle bleu.',
    'Une manette se branche à tout moment. Les touches se changent dans Options → Commandes.',
    'Le téléphone du jeu ouvre le groupe « LA CAGE » : les potes réagissent à tes matchs et à tes dunks.',
  ];
  function astuces() {
    if (!E.astuceTexte) return;
    var ordre = ASTUCES.slice();
    for (var i = ordre.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = ordre[i]; ordre[i] = ordre[j]; ordre[j] = t; }
    var n = 0;
    E.astuceTexte.textContent = ordre[0];
    var minuterie = setInterval(function () {
      if (!boot.isConnected) { clearInterval(minuterie); return; }
      n = (n + 1) % ordre.length;
      E.astuceTexte.textContent = ordre[n];
      if (MOUVEMENT_REDUIT || !E.astuce) return;
      // le fondu est une animation CSS relancée, pas une minuterie : un fil principal occupé (la construction du terrain)
      // ne laisse jamais l'astuce à moitié effacée
      E.astuce.classList.remove('boot-change'); void E.astuce.offsetWidth; E.astuce.classList.add('boot-change');
    }, 7000);
  }

  // LA VERSION : le seul numéro tenu à jour à chaque livraison est celui du service worker (comme le pied du menu) ; hors
  // ligne, le nom du cache qu'il a installé. Elle nomme aussi ce cache (cacheCourant).
  var promesseVersion = fetch('./sw.js', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (t) {
    var m = /VERSION\s*=\s*['"]lacage-v([\d.]+)['"]/.exec(t);
    if (m) return m[1];
    throw new Error('sans version');
  }).catch(function () {
    return window.caches ? caches.keys().then(function (ks) {
      for (var i = 0; i < ks.length; i++) { var m = /^lacage-v([\d.]+)$/.exec(ks[i]); if (m) return m[1]; }
      return null;
    }) : null;
  }).catch(function () { return null; });
  function version() {
    promesseVersion.then(function (v) { if (v && E.version) E.version.textContent = 'v' + v; });
  }

  // ---------------------------------------------------------------------
  //  LE RIDEAU
  // ---------------------------------------------------------------------
  // une image peinte (double requestAnimationFrame), et jamais plus de 150 ms d'attente : onglet caché, pas d'image
  function souffle() {
    return new Promise(function (ok) {
      var f = false, fin = function () { if (!f) { f = true; ok(); } };
      try { requestAnimationFrame(function () { requestAnimationFrame(fin); }); } catch (e) { /* ignore */ }
      setTimeout(fin, 150);
    });
  }
  function pret(demarrer) {
    passerA('image', 1); poser(100); libelle(LIBELLES.pret); details('');
    jalon('prêt');
    var m = { mode: mode, profil: PROFIL, octets: D.recu + D.jsRecu, total: Math.round(maintenant()) }, txt = [];
    for (var i = 1; i < jalons.length; i++) {
      var d = Math.round(jalons[i][1] - jalons[i - 1][1]);
      m[jalons[i - 1][0]] = d; txt.push(jalons[i - 1][0] + ' ' + (d / 1000).toFixed(1) + ' s');
    }
    window.__chargement.mesures = m;
    // les durées, pour les plages du lancement suivant (la vérification seulement : un téléchargement ne dit rien du
    // suivant) ; le débit, pour estimer le prochain téléchargement (une mise à jour)
    if (!TRACE) {
      var dp = {}, prec = (memoire.profils || {})[PROFIL] || {};
      for (var k = 1; k < ETAPES.length; k++) if (m[ETAPES[k]] > 0) dp[ETAPES[k]] = m[ETAPES[k]];
      dp.fichiers = mode === 'verification' && m.fichiers > 0 ? m.fichiers : prec.fichiers;
      memoire.profils = memoire.profils || {};
      memoire.profils[PROFIL] = dp;
      if (mode === 'telechargement' && D.tl1 > D.tl0 && D.recu > 4 * 1048576) memoire.debit = Math.round(D.recu * 1000 / (D.tl1 - D.tl0));
      try { localStorage.setItem(CLE_DUREES, JSON.stringify(memoire)); } catch (e) { /* stockage indisponible */ }
    }
    console.info('[chargement] ' + PROFIL + ' (' + mode + (m.octets ? ', ' + Mo(m.octets) : '') + ') : ' + txt.join(' · ')
      + ' — menu prêt à ' + (m.total / 1000).toFixed(1) + ' s');
    if (E.go) E.go.textContent = TACTILE ? 'TOUCHE L’ÉCRAN POUR COMMENCER' : 'APPUIE POUR COMMENCER';
    boot.classList.add('boot-pret');
    boot.setAttribute('aria-busy', 'false');
    return new Promise(function (termine) {
      var parti = false, manette = 0;
      var go = function (e) {
        if (parti) return;
        if (e && e.type === 'keydown') {
          if (e.repeat || /^(Shift|Control|Alt|Meta|OS|Tab|CapsLock|Dead|Unidentified)$/.test(e.key || '')) return;
          // la touche qui lève le rideau ne part pas au jeu
          e.preventDefault(); e.stopImmediatePropagation();
        }
        parti = true;
        clearInterval(manette);
        boot.removeEventListener('click', go); window.removeEventListener('keydown', go, true);
        try { if (demarrer) demarrer(); } catch (err) { console.error('[chargement]', err); }
        boot.classList.add('boot-sortie');
        setTimeout(function () { boot.remove(); termine(); }, MOUVEMENT_REDUIT ? 0 : 520);
      };
      boot.addEventListener('click', go);
      window.addEventListener('keydown', go, true);
      // une manette : n'importe quel bouton (pas de geste « utilisateur » au sens du navigateur : le son s'allumera au
      // premier vrai geste, comme avant)
      if (navigator.getGamepads) {
        manette = setInterval(function () {
          var pads = [];
          try { pads = navigator.getGamepads() || []; } catch (e) { /* ignore */ }
          for (var i = 0; i < pads.length; i++) {
            var p = pads[i];
            if (!p) continue;
            for (var b = 0; b < p.buttons.length; b++) if (p.buttons[b] && p.buttons[b].pressed) return go(null);
          }
        }, 120);
      }
      if (TRACE) go(null);              // relevé automatique : personne ne touche l'écran
    });
  }

  // ---------------------------------------------------------------------
  //  CE QUE LE JEU VOIT
  // ---------------------------------------------------------------------
  window.__chargement = {
    profil: PROFIL, telephone: TELEPHONE, trace: TRACE, traceFigee: null,
    // js/main.js : les modules sont là (il s'exécute) ; rend la promesse des fichiers lourds
    fichiers: function () {
      modulesCharges = true;
      D.jsRecu = D.jsTotal;
      majTelechargement(); verifierFin();
      return promesseFichiers;
    },
    etape: passerA,                   // ('terrain' | 'joueurs' | 'shaders' | 'image', fraction)
    avance: avance,                   // (fraction de l'étape en cours)
    souffle: souffle,
    pret: pret,                       // (rappel appelé DANS le geste) -> promesse, rideau levé
    actif: function () { return dernierSigne; },
    enErreur: function () { return enErreur; },
    // (mode trace) ce qui a été demandé jusqu'ici, dans l'ordre des demandes
    figerTrace: function () {
      if (!TRACE) return;
      var l = vus.slice().sort(function (a, b) { return a.t - b.t; }), r = [], deja = {};
      for (var i = 0; i < l.length; i++) if (!deja[l[i].c]) { deja[l[i].c] = true; r.push(l[i].c); }
      this.traceFigee = { profil: PROFIL, fichiers: r };
      console.info('[chargement] relevé du profil ' + PROFIL + ' : ' + r.length + ' fichiers');
    },
  };
  boot.setAttribute('aria-busy', 'true');
  version();
  astuces();
  demarrer().catch(function (e) {
    console.warn('[chargement] téléchargement abandonné :', e);
    lourdsFinis = true; verifierFin();
  });
})();
