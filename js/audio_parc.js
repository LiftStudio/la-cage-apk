// =====================================================================
//  LES SONS DU PARC ENTIER (lot C3) : les pas selon le sol, le vélo qui roule, l'eau, le manège, le quai, les oiseaux
// =====================================================================
// js/audio.js reste le module du son ; celui-ci est son atelier du parc, créé par lui au premier besoin (AudioFX.parc).
// Trois familles de sons, trois façons de les faire :
//
//  - LES PAS SUR UN SOL QUI N'EST PAS DE L'ENROBÉ (gravier, stabilisé, terre battue, pelouse, dalles, le bois — sous-bois
//    et copeaux —, sable). Le pas sur l'enrobé est synthétisé (AudioFX.pas) et ne change pas, ni au plateau ni sur les
//    autres terrains, qui n'ont pas d'autre sol. Les autres viennent de vrais pas enregistrés (Fission9, CC0 : gravier,
//    herbe, pierre ; un seul fichier, assets/sons/pas_parc.ogg, 51 Ko), et chaque sol est une RECETTE : quels pas, joués
//    à quelle vitesse (plus lent = plus grave, plus gros), filtrés comment, et combien du coup sourd synthétisé de la
//    semelle par-dessous — celui de l'enrobé, qui fait le lien entre tous les sols. Ainsi le stabilisé est un gravier
//    tassé, assourdi ; la terre battue presque un enrobé mou, avec un peu de grain ; le sable, un gravier ralenti et
//    étouffé ; le sous-bois, l'herbe et des brindilles qui craquent (le gravier joué vite et sans ses graves). La
//    réception d'un saut y joue deux pas (les deux pieds) ; l'appui sec qui fait crisser la gomme sur l'enrobé y racle
//    le gravier, ou froisse l'herbe.
//
//  - LE VÉLO QUI ROULE (et toute monture : js/monture.js). Synthétisé, parce que tout y dépend de la vitesse : cinq
//    boucles de deux secondes au plus, fabriquées en fond dès qu'un vélo est sur le terrain, jouées ensemble
//    et dosées à chaque image selon le sol sous les roues — le chuintement lisse du pneu sur l'enrobé, le crépitement
//    du gravier (des grains de bruit tirés au hasard, plus serrés quand on va plus vite), le froissement de l'herbe et
//    de la terre, les joints des dalles (un double choc, roue avant puis roue arrière, au rythme de la vitesse), et le
//    CLIQUET de la roue libre quand on ne pédale plus. Leur vitesse de lecture suit celle du vélo. Partout, y compris sur
//    les terrains plats, où le sol est l'enrobé : c'est le seul son de ce lot qu'on entend hors du parc entier.
//
//  - L'AMBIANCE, au parc entier seulement : la fontaine du jardin (Z07, son jet d'écume), la bouche d'eau de la fontaine
//    des Antiquités (Z14), les trois jets du bassin de la terrasse (Z05, une OPTION du lot C5 : voir SONS_PARC), l'orgue
//    du manège (Z14 ; une petite valse, calculée une fois, par morceaux), la circulation du quai (une source en
//    LIGNE le long de la chaussée) et les oiseaux (deux sources qui accompagnent l'auditeur, plus présentes sous les
//    arbres, qui se taisent sous la pluie). Chaque source est placée dans le monde (PannerNode : la direction) ; sa
//    distance et le RELIEF entre elle et l'auditeur, c'est nous qui les calculons : l'affaiblissement (1/d), l'air
//    qui mange les aigus avec la distance, et le MASQUE — le sol du monde (Monde.sol) passe-t-il au-dessus
//    de la droite qui va de la source à l'oreille ? Alors le son contourne le relief : plus bas et sans ses aigus. Du
//    parc haut, la rue du quai n'est plus qu'une rumeur sourde derrière la crête du coteau.
//
// LES VOLUMES. Les pas et le vélo passent par le réglage « Effets » ; l'ambiance par son propre réglage (« Ambiance du
// parc », Options > Audio) ; tout passe par le volume général. L'ambiance est réglée BIEN en dessous du ballon. Mesuré
// dans le jeu le 01/10 (avant le volume général ; un rebond de dribble culmine à -17 dB sur 50 ms, un pas de course
// sur l'enrobé à -33) : au plateau en balade, tout le fond (rue à 28 m, oiseaux) fait -40 dB ; sur la promenade basse,
// à 18 m de la rue, -38 ; près de la fontaine du jardin à 7 m, -38 ; à la fontaine des Antiquités avec l'orgue du
// manège à 20 m, -40 ; au parc haut, la rue est masquée à 99 % par le coteau. En MATCH, l'ambiance tombe à 12 % (on
// entend encore vivre le parc, de très loin : -58 dB), dans les menus elle se tait, en pause elle baisse.
//
// LE COÛT (mesuré le 01/10, navigateur partagé par neuf onglets : les durées sont indicatives). Fil principal :
// 0,03 à 0,07 ms par image (msParImage de __sons()) — l'oreille, une dizaine de gains du vélo à chaque image,
// l'ambiance tous les quarts de seconde (une quarantaine de lectures de Monde.sol pour les masques) ; un pas enregistré,
// 0,1 ms (trois ou quatre nœuds créés). Travaux de fond, une seule fois par partie, 4 s après l'entrée et 1 ms au
// plus par image : l'orgue (60 à 90 ms en tout) et les boucles du vélo (20 à 30 ms). Fil audio : une source loin de
// plus de sa portée est ARRÊTÉE (pas seulement muette) ; il en joue au plus six à la fois (deux pour la rue, deux pour
// les oiseaux, une fontaine, le manège) ; le roulement n'existe que pendant qu'on roule. Mémoire : 7 Mo de sons
// décodés (voir DECODAGE), 1,6 Mo pour l'orgue et le roulement. Téléchargement : 535 Ko en tout, au premier passage au
// parc entier, et rien ailleurs.
import { Monde, SURFACE } from './monde.js';

// Les options de son que d'autres lots peuvent lever. `jetsBassin` : les trois jets du bassin de la terrasse (Z05, état
// d'avant 2016, option du lot C5). Le lot qui les construit écrit `SONS_PARC.jetsBassin = true` (import depuis
// js/audio.js) ; le son de leur eau part alors tout seul quand on s'en approche.
export const SONS_PARC = { jetsBassin: false };

const DOSSIER = 'assets/sons/';
// La fréquence de décodage de chaque fichier (Hz) : les pas gardent tous leurs aigus (on les entend de près), l'eau
// presque tous ; les oiseaux, lointains, et la rue, filtrée par la distance, n'ont rien au-dessus de 8 kHz à perdre.
const DECODAGE = { pas_parc: 44100, fontaine_jet: 24000, fontaine_filet: 24000, oiseaux: 16000, circulation: 16000 };
const DEBUG = (() => { try { return new URLSearchParams(location.search).has('debug'); } catch (e) { return false; } })();
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ------------------------------------------------------------------ les sols
// La famille de son de chaque surface de js/monde.js (surfaces.bin). 'enrobe' : le pas synthétisé d'AudioFX, inchangé.
export const FAMILLE_SOL = [];
FAMILLE_SOL[SURFACE.ENROBE] = 'enrobe';
FAMILLE_SOL[SURFACE.ASPHALTE_ROUGE] = 'enrobe';
FAMILLE_SOL[SURFACE.CHAUSSEE] = 'enrobe';
FAMILLE_SOL[SURFACE.TROTTOIR] = 'enrobe';
FAMILLE_SOL[SURFACE.BETON_CLAIR] = 'enrobe';
FAMILLE_SOL[SURFACE.DALLES] = 'dalles';
FAMILLE_SOL[SURFACE.GRAVIER] = 'gravier';
FAMILLE_SOL[SURFACE.STABILISE] = 'stabilise';
FAMILLE_SOL[SURFACE.TERRE_BATTUE] = 'terre';
FAMILLE_SOL[SURFACE.HERBE] = 'herbe';
FAMILLE_SOL[SURFACE.MASSIF] = 'herbe';
FAMILLE_SOL[SURFACE.SOUS_BOIS] = 'sousbois';
FAMILLE_SOL[SURFACE.COPEAUX] = 'copeaux';
FAMILLE_SOL[SURFACE.SABLE] = 'sable';
FAMILLE_SOL[SURFACE.EAU] = 'herbe';           // (on n'entre pas dans l'eau : le bord du bassin est un massif ou une margelle)

// LES RECETTES DES PAS. `couches` : des pas de la banque (gravier, herbe, pierre), chacun joué à une vitesse tirée dans
// `vitesse` (1 = l'enregistrement ; 0,7 = plus grave et plus long), au gain `gain`, et filtré : `bas` (Hz, passe-bas :
// le sol étouffe), `haut` (Hz, passe-haut : on ne garde que le craquement). `sourd` : la part du coup sourd synthétisé
// de la semelle (celui de l'enrobé). Les gains sont égalisés AU CALCUL : chaque pas rendu dans un OfflineAudioContext,
// son énergie au-dessus de 400 Hz (là où l'oreille juge la force d'un pas ; le coup sourd, commun à tous, est dessous)
// comparée à celle du pas d'enrobé. Visé : gravier +6 dB (ça crisse), stabilisé +3, dalles +2, copeaux +1, terre et
// sous-bois 0, herbe -1, sable -2.
const RECETTES = {
  gravier:   { couches: [{ banque: 'gravier', gain: 0.8, vitesse: [0.94, 1.08] }], sourd: 0.45 },
  stabilise: { couches: [{ banque: 'gravier', gain: 0.5, vitesse: [1.04, 1.16], bas: 2600 }], sourd: 0.8 },
  terre:     { couches: [{ banque: 'gravier', gain: 0.35, vitesse: [0.82, 0.9], bas: 1300 }], sourd: 1.0 },
  herbe:     { couches: [{ banque: 'herbe', gain: 0.67, vitesse: [0.95, 1.1] }], sourd: 0.3 },
  sousbois:  { couches: [{ banque: 'herbe', gain: 0.7, vitesse: [0.85, 0.95] },
                         { banque: 'gravier', gain: 0.35, vitesse: [1.45, 1.65], haut: 2400 }], sourd: 0.45 },
  copeaux:   { couches: [{ banque: 'gravier', gain: 0.5, vitesse: [0.7, 0.78], bas: 3200 },
                         { banque: 'herbe', gain: 0.23, vitesse: [0.9, 1.0] }], sourd: 0.4 },
  sable:     { couches: [{ banque: 'gravier', gain: 0.32, vitesse: [0.62, 0.7], bas: 1100 }], sourd: 0.6 },
  dalles:    { couches: [{ banque: 'pierre', gain: 0.8, vitesse: [0.96, 1.06], bas: 3400 }], sourd: 0.85 },
};
// Gain commun des pas enregistrés (leur pic est à -1 dB dans le fichier ; le pas synthétisé de l'enrobé culmine vers
// 0,1 en courant, et presque tout son poids est sous 400 Hz).
const GAIN_PAS = 0.1;

// ------------------------------------------------------------------ l'ambiance
// Le quai (js/parc/zones/z19_quai_seine.js) : l'axe de la chaussée est oblique dans le repère du jeu, x = 29,65 m à
// z = -135, puis -3,82 m sur 335 m ; la rue file de z -185 à 250. La chaussée est à y -3,0 ; le bruit des voitures
// part de 60 cm au-dessus.
const RUE = { x0: 29.65, z0: -135, p: -3.82 / 335, zMin: -185, zMax: 250, y: -2.4 };
// Les sources ponctuelles (repère du terrain 1 ; dy au-dessus du sol). `ref` : distance (m) jusqu'à laquelle le gain
// reste plein, puis il tombe en ref/d ; `portee` : au-delà, la source est arrêtée. Positions relevées dans les zones :
// Z07 (FONTAINE de z07_jardin_fontaine.js, le jet au centre du bassin), Z14 (FONTAINE de z14_haut_nord_est.js : la
// bouche d'eau de la stèle tombe dans le bassin, un mètre côté x- du centre du socle ; MANEGE : son centre), Z05 (le
// bassin de la terrasse, centré vers (-16 ; 35), ses trois jets sur le grand axe).
const SOURCES = [
  { id: 'Z07 fontaine', son: 'fontaine_jet', x: -17.8, z: 104.0, dy: 1.0, gain: 0.40, ref: 4, portee: 60 },
  { id: 'Z14 fontaine', son: 'fontaine_filet', x: -110.4, z: -18.0, dy: 0.7, gain: 0.80, ref: 3, portee: 45 },
  { id: 'Z14 manège', son: 'orgue', x: -112.7, z: -38.3, dy: 2.2, gain: 0.04, ref: 9, portee: 95 },
  { id: 'Z05 jets', son: 'fontaine_jet', x: -16.0, z: 35.0, dy: 1.4, gain: 0.42, ref: 7, portee: 65, vitesse: 0.9,
    si: () => SONS_PARC.jetsBassin },
];
const GAIN_RUE = 0.3, REF_RUE = 15;
const GAIN_OISEAUX = 0.16;
// Niveau de l'ambiance selon le moment : en balade 1 ; en match, un souffle ; en pause, baissée ; dans les menus, rien.
const NIVEAU = { balade: 1, match: 0.12, pause: 0.35, autre: 0 };
const PERIODE = 0.25;            // (s) mise à jour de l'ambiance (distances, masques, départs et arrêts)

// ================================================================== l'atelier
export class SonsParc {
  constructor(fx) {
    this.fx = fx;
    const ctx = this.ctx = fx.ctx;
    // deux bus sous le volume général : les effets (pas, vélo) et l'ambiance
    this.effets = ctx.createGain(); this.effets.gain.value = fx.vol.sfx; this.effets.connect(fx.master);
    this.ambiance = ctx.createGain(); this.ambiance.gain.value = 0; this.ambiance.connect(fx.master);
    this.niveau = 0;                     // niveau visé de l'ambiance (NIVEAU), avant le réglage
    this.tampons = {};                   // nom -> AudioBuffer
    this.banque = null;                  // pas_parc.json : { gravier: [[début, durée], ...], ... }
    this.chargement = null;              // la promesse du chargement (une seule fois par partie)
    this.fabrique = null;                // l'orgue du manège en cours de calcul (générateur, voir orgueManege)
    this.fabRoul = null; this.tamponsRoul = null;   // les boucles du roulement : en cours de calcul, puis prêtes
    this.sources = [];                   // sources ponctuelles en cours : { def, src, gain, filtre, panneau }
    this.rue = null; this.oiseaux = null;
    this.roul = null;                    // le roulement de la monture (créé au premier tour de roue)
    this.t = 0; this.tAmb = PERIODE;
    this.derniere = null;                // dernière famille de pas (journal en ?debug=1)
    // coût du fil principal : moyenne glissante par image (hors travaux de fond), et les travaux de fond (total, pire image)
    this.mesure = { n: 0, ms: 0, travaux: 0, maxTravaux: 0 };
    this.etat = { masqueRue: 0, dRue: 0, oiseaux: 0, sources: {} };
    // (relecture C3) PAGE CACHÉE — onglet changé, appli Android passée en arrière-plan : le jeu n'a plus d'images
    // (requestAnimationFrame s'arrête), donc plus de maj() ; mais le contexte audio, lui, continue de jouer, et les
    // BOUCLES restaient figées à leur dernier niveau : le pneu sur le gravier tournait sans fin, la fontaine, la rue et
    // les oiseaux aussi. On coupe les deux bus du parc tant que la page est cachée ; ils reviennent avec elle.
    this.cachee = false;
    try { document.addEventListener('visibilitychange', () => this._cacher(document.hidden)); } catch (e) { /* hors navigateur */ }
  }

  // Les volumes du menu (AudioFX.setVolumes)
  volumes(v) {
    const t = this.ctx.currentTime;
    this.effets.gain.setTargetAtTime(this.cachee ? 0 : v.sfx, t, 0.05);
    this._appliquerNiveau(0.05);
  }
  _appliquerNiveau(tau) {
    this.ambiance.gain.setTargetAtTime(this.cachee ? 0 : this.niveau * this.fx.vol.ambiance, this.ctx.currentTime, tau);
  }
  _cacher(oui) {
    this.cachee = !!oui;
    this.effets.gain.setTargetAtTime(this.cachee ? 0 : this.fx.vol.sfx, this.ctx.currentTime, 0.05);
    this._appliquerNiveau(0.05);
  }

  // ---------------------------------------------------------------- chargement
  // Tout le parc d'un coup (535 Ko) : les pas et les quatre boucles ; et l'orgue du manège, calculé par morceaux.
  charger() {
    if (this.chargement) return this.chargement;
    const t0 = performance.now();
    // DÉCODÉS À LEUR JUSTE FRÉQUENCE. decodeAudioData rééchantillonne à la fréquence du contexte qui décode : par le
    // contexte du jeu (48 kHz), ces 92 s de son prenaient 17,7 Mo de mémoire. Décodés par un petit contexte hors temps
    // réel à la fréquence qui leur suffit (DECODAGE), 7 Mo ; le contexte du jeu les rééchantillonne à la lecture.
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, decodeurs = {};
    const decodeur = (sr) => { if (!OAC) return this.ctx; try { return decodeurs[sr] || (decodeurs[sr] = new OAC(1, 1, sr)); } catch (e) { return this.ctx; } };
    const lire = (nom) => fetch(DOSSIER + nom + '.ogg').then((r) => { if (!r.ok) throw new Error(nom + ' : ' + r.status); return r.arrayBuffer(); })
      .then((ab) => { const n = ab.byteLength; return decodeur(DECODAGE[nom]).decodeAudioData(ab).then((b) => { this.tampons[nom] = b; return n; }); });
    const fichiers = ['pas_parc', 'fontaine_jet', 'fontaine_filet', 'oiseaux', 'circulation'];
    // l'orgue se calcule pendant ce temps, une mesure à la fois (voir maj)
    this.fabrique = orgueManege(this.ctx);
    this.chargement = Promise.all([
      fetch(DOSSIER + 'pas_parc.json').then((r) => r.json()).then((j) => { this.banque = j; }),
      ...fichiers.map(lire),
    ]).then((tailles) => {
      const ko = tailles.reduce((s, n) => s + (n || 0), 0) / 1024;
      console.info(`[audio] sons du parc chargés : ${fichiers.length} fichiers (${ko.toFixed(0)} Ko) en ${(performance.now() - t0).toFixed(0)} ms`);
    }).catch((e) => { console.warn('[audio] sons du parc indisponibles (les pas restent synthétisés, pas d\'ambiance) :', e); });
    return this.chargement;
  }

  // ---------------------------------------------------------------- les pas
  // Un pas sur un sol de la famille `fam` (pas 'enrobe'), d'intensité a (déjà atténuée par la distance) et d'allure f.
  // `genre` : 'pas', 'reception' (deux pieds, plus lourd) ou 'glisse' (l'appui sec : sur le gravier, ça racle).
  // Rend faux si la banque n'est pas encore là : AudioFX joue alors son pas synthétisé.
  // Le journal des sols (?debug=1) : une ligne à chaque changement de famille, enrobé compris (AudioFX nous le dit).
  noter(fam) {
    if (fam === this.derniere) return;
    if (DEBUG) console.info(`[audio] pas : ${this.derniere || 'départ'} → ${fam}`);
    this.derniere = fam;
  }
  pas(fam, a, f, genre = 'pas') {
    const R = RECETTES[fam], B = this.banque, buf = this.tampons.pas_parc;
    if (!R || !B || !buf) { if (!this.chargement && !Monde.plat) this.charger(); return false; }
    const t = this.ctx.currentTime;
    const fois = genre === 'reception' ? 2 : 1;
    for (let k = 0; k < fois; k++) {
      const w = k * 0.028;                         // réception : le second pied 28 ms après le premier
      for (const c of R.couches) {
        const liste = B[c.banque]; if (!liste) continue;
        const [debut, duree] = liste[(Math.random() * liste.length) | 0];
        let vit = c.vitesse[0] + Math.random() * (c.vitesse[1] - c.vitesse[0]);
        let g = c.gain * GAIN_PAS * a * (genre === 'reception' ? 1.25 : 1);
        if (genre === 'glisse') { vit *= 0.68; g *= 1.6; }     // (aussi fort qu'un pas : le gravier chassé)
        if (g < 0.002) continue;
        const src = this.ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = vit;
        let n = src;
        // en courant, le pied frappe plus fort : le sol étouffé s'ouvre un peu
        if (c.bas) { const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = c.bas * (0.75 + 0.5 * f); fl.Q.value = 0.5; n.connect(fl); n = fl; }
        if (c.haut) { const fl = this.ctx.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = c.haut; fl.Q.value = 0.5; n.connect(fl); n = fl; }
        const gn = this.ctx.createGain(); gn.gain.value = g; n.connect(gn); gn.connect(this.effets);
        // la glissade : on ne garde que le début du pas, étiré, et il s'éteint en 0,18 s
        const d = genre === 'glisse' ? Math.min(duree, 0.2) : duree;
        if (genre === 'glisse') { gn.gain.setValueAtTime(g, t + w); gn.gain.linearRampToValueAtTime(0, t + w + d / vit); }
        src.start(t + w, debut, d);
      }
    }
    return R.sourd;
  }

  // ---------------------------------------------------------------- chaque image
  maj(dt, game) {
    const t0 = performance.now();
    this.t += dt;
    const ctx = this.ctx, cam = game.camera;
    this._oreille(cam);
    // le niveau de l'ambiance
    const parcEntier = !Monde.plat;
    const niv = !parcEntier ? 0 : game.mode === 'lobby' ? (game.paused ? NIVEAU.pause : NIVEAU.balade)
      : game.mode === 'match' ? NIVEAU.match : NIVEAU.autre;
    if (niv !== this.niveau) { this.niveau = niv; this._appliquerNiveau(niv > 0 ? 0.8 : 0.4); }
    if (niv > 0 && !this.chargement) this.charger();
    // les boucles du vélo se fabriquent dès qu'un vélo est sur le terrain (bien avant qu'on monte dessus). Les travaux de
    // fond attendent 4 s après l'entrée : le jeu charge alors avatars et animations, le ramasse-miettes passe, et un pas
    // de 2 ms y en durait 38.
    if (!this.tamponsRoul && !this.fabRoul && ((game.velos && game.velos.length) || (game.user && game.user.velo))) this.fabRoul = fabriquerRoulement(ctx);
    const tt = performance.now();
    if (this.t > 4) this._travaux(1.0);
    const travaux = performance.now() - tt;
    if (travaux > 0.05) { this.mesure.travaux += travaux; this.mesure.maxTravaux = Math.max(this.mesure.maxTravaux, travaux); }
    // le roulement de la monture : à chaque image (la vitesse change vite)
    this._roulement(dt, game);
    // l'ambiance : quatre fois par seconde
    this.tAmb += dt;
    if (this.tAmb >= PERIODE) {
      this.tAmb = 0;
      const actif = niv > 0 && this.tampons.oiseaux;
      this._ponctuelles(cam.position, actif);
      this._rue(cam.position, actif);
      this._oiseaux(cam.position, actif, game);
    }
    const ms = performance.now() - t0 - travaux, M = this.mesure;
    M.ms = M.n < 60 ? (M.ms * M.n + ms) / (M.n + 1) : M.ms * 0.98 + ms * 0.02; M.n++;
  }

  // LES TRAVAUX DE FOND : l'orgue du manège et les boucles du vélo, deux générateurs qu'on fait avancer `budget` ms au
  // plus par image (un pas de générateur dure de 0,05 à 1 ms sur un PC qui n'est pas chargé)
  _travaux(budget) {
    const ta = performance.now();
    while (performance.now() - ta < budget) {
      const g = this.fabRoul || this.fabrique;
      if (!g) break;
      const r = g.next();
      if (!r.done) continue;
      if (g === this.fabRoul) { this.tamponsRoul = r.value; this.fabRoul = null; }
      else {
        this.tampons.orgue = r.value; this.fabrique = null;
        console.info(`[audio] orgue du manège prêt : ${r.value.duration.toFixed(1)} s de valse`);
      }
    }
  }

  // l'auditeur : la caméra (position, regard, haut)
  _oreille(cam) {
    const L = this.ctx.listener, p = cam.position, q = cam.quaternion;
    // regard = (0, 0, -1) tourné par q ; haut = (0, 1, 0) tourné par q
    const fx = -(2 * (q.x * q.z + q.w * q.y)), fy = -(2 * (q.y * q.z - q.w * q.x)), fz = -(1 - 2 * (q.x * q.x + q.y * q.y));
    const ux = 2 * (q.x * q.y - q.w * q.z), uy = 1 - 2 * (q.x * q.x + q.z * q.z), uz = 2 * (q.y * q.z + q.w * q.x);
    if (L.positionX) {
      L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z;
      L.forwardX.value = fx; L.forwardY.value = fy; L.forwardZ.value = fz;
      L.upX.value = ux; L.upY.value = uy; L.upZ.value = uz;
    } else if (L.setPosition) { L.setPosition(p.x, p.y, p.z); L.setOrientation(fx, fy, fz, ux, uy, uz); }
  }

  // Une voix de boucle placée dans le monde : source en boucle -> passe-bas (air, relief) -> gain -> panoramique -> bus
  _voix(nom, vitesse = 1, depart = 0) {
    const ctx = this.ctx, src = ctx.createBufferSource();
    src.buffer = this.tampons[nom]; src.loop = true; src.playbackRate.value = vitesse;
    const filtre = ctx.createBiquadFilter(); filtre.type = 'lowpass'; filtre.frequency.value = 8000; filtre.Q.value = 0.5;
    const gain = ctx.createGain(); gain.gain.value = 0;
    const panneau = ctx.createPanner();
    panneau.panningModel = 'equalpower'; panneau.distanceModel = 'inverse'; panneau.refDistance = 1; panneau.rolloffFactor = 0;
    src.connect(filtre); filtre.connect(gain); gain.connect(panneau); panneau.connect(this.ambiance);
    src.start(ctx.currentTime, depart % src.buffer.duration);
    return { src, filtre, gain, panneau };
  }
  _placer(v, x, y, z) {
    const P = v.panneau;
    if (P.positionX) { P.positionX.value = x; P.positionY.value = y; P.positionZ.value = z; } else P.setPosition(x, y, z);
  }
  _regler(v, gain, coupure, tau = 0.3) {
    const t = this.ctx.currentTime;
    v.gain.gain.setTargetAtTime(gain, t, tau);
    v.filtre.frequency.setTargetAtTime(clamp(coupure, 200, 16000), t, tau);
  }
  _arreter(v) {
    const t = this.ctx.currentTime;
    v.gain.gain.cancelScheduledValues(t); v.gain.gain.setTargetAtTime(0, t, 0.15);
    try { v.src.stop(t + 0.8); } catch (e) { /* déjà arrêtée */ }
    v.src.onended = () => { v.panneau.disconnect(); };
  }

  // LE MASQUE DU RELIEF entre l'oreille (a) et la source (b) : 0 = rien entre les deux, 1 = un coteau entier. On
  // suit la droite de a à b (14 points, sans les bouts) : de combien le sol passe-t-il au-dessus ?
  _masque(ax, ay, az, bx, by, bz) {
    let exces = -1e9;
    for (let i = 1; i <= 14; i++) {
      const k = i / 15, x = ax + (bx - ax) * k, z = az + (bz - az) * k, y = ay + (by - ay) * k;
      const e = Monde.sol(x, z) - y;
      if (e > exces) exces = e;
    }
    return clamp((exces + 0.4) / 3, 0, 1);
  }

  // ---------------------------------------------------------------- les sources ponctuelles
  _ponctuelles(o, actif) {
    for (const def of SOURCES) {
      let s = this.sources.find((v) => v.def === def);
      const x = def.x + Monde.dx, z = def.z;
      const d = Math.hypot(x - o.x, z - o.z);
      const voulu = actif && this.tampons[def.son] && (!def.si || def.si()) && d < def.portee;
      if (!voulu) {
        if (s && (!actif || d > def.portee + 10 || (def.si && !def.si()))) { this._arreter(s.v); this.sources.splice(this.sources.indexOf(s), 1); }
        else if (s) this._regler(s.v, 0, 2000);      // (entre la portée et 10 m au-delà : muette, prête à revenir)
        delete this.etat.sources[def.id];
        continue;
      }
      if (!s) {
        s = { def, v: this._voix(def.son, def.vitesse || 1, Math.random() * 30), y: Monde.sol(x, z) + def.dy };
        this.sources.push(s);
      }
      s.y = Monde.sol(x, z) + def.dy;
      this._placer(s.v, x, s.y, z);
      const d3 = Math.hypot(d, s.y - o.y);
      const m = this._masque(o.x, o.y, o.z, x, s.y, z);
      // 1/d au-delà de ref, l'air (les aigus s'éteignent avec la distance), le relief ; et les derniers 15 % de la
      // portée en fondu, pour ne pas couper net une source qu'on entend encore
      const fin = clamp((def.portee - d) / (def.portee * 0.15), 0, 1);
      const g = def.gain * Math.min(1, def.ref / Math.max(d3, 0.5)) * (1 - 0.65 * m) * fin;
      this._regler(s.v, g, 15000 / (1 + d3 / 22) * (1 - 0.85 * m));
      this.etat.sources[def.id] = { d: +d3.toFixed(1), masque: +m.toFixed(2), gain: +g.toFixed(4) };
    }
  }

  // ---------------------------------------------------------------- la rue du quai
  // Une source en LIGNE : deux voix aux deux côtés du point de la chaussée le plus proche (±28 m), ce qui donne à la
  // rue sa largeur ; l'affaiblissement en 1/d (une ligne seule perdrait moins, 1/√d, mais le sol du parc, les haies et
  // les deux rideaux d'arbres du quai absorbent le reste) ; le masque, vers le point le plus proche.
  _rue(o, actif) {
    // (et rien tant que la boucle de la circulation n'est pas chargée : l'ambiance peut démarrer avec les seuls oiseaux)
    if (!actif || !this.tampons.circulation) { if (this.rue) { this._arreter(this.rue[0]); this._arreter(this.rue[1]); this.rue = null; } return; }
    if (!this.rue) this.rue = [this._voix('circulation', 1, Math.random() * 30), this._voix('circulation', 0.97, Math.random() * 30)];
    const R = RUE, z0 = clamp(o.z, R.zMin, R.zMax), dx = Monde.dx;
    const xr = (z) => R.x0 + R.p * (z - R.z0) + dx;
    const d = Math.hypot(xr(z0) - o.x, R.y - o.y, z0 - o.z);      // (z0 - o.z : nul le long de la rue, pas au-delà de ses bouts)
    const m = this._masque(o.x, o.y, o.z, xr(z0), R.y, z0);
    const g = GAIN_RUE * Math.min(1, REF_RUE / Math.max(d, 1)) * (1 - 0.7 * m) * 0.5;
    const coupure = 9000 / (1 + d / 45) * (1 - 0.85 * m);
    for (let k = 0; k < 2; k++) {
      const z = clamp(z0 + (k ? 28 : -28), R.zMin, R.zMax);
      this._placer(this.rue[k], xr(z), R.y, z);
      this._regler(this.rue[k], g, coupure, 0.5);
    }
    this.etat.masqueRue = +m.toFixed(2); this.etat.dRue = +d.toFixed(1); this.etat.gainRue = +(2 * g).toFixed(4);
  }

  // ---------------------------------------------------------------- les oiseaux
  // Deux voix de la même boucle, décalées de 15 s, posées à 18 m de l'oreille au nord-ouest et au sud-est (dans le
  // monde : tourner la tête les fait tourner), un peu plus haut (les arbres). Plus présentes quand il y a de la
  // végétation autour (pelouse, sous-bois, massifs, sur huit points à 14 m), moins près de la rue, et presque rien sous
  // la pluie. Lointaines : sans leurs plus hauts aigus.
  _oiseaux(o, actif, game) {
    if (!actif || !this.tampons.oiseaux) { if (this.oiseaux) { this._arreter(this.oiseaux[0]); this._arreter(this.oiseaux[1]); this.oiseaux = null; } return; }
    if (!this.oiseaux) this.oiseaux = [this._voix('oiseaux', 1, 0), this._voix('oiseaux', 1.02, 15)];
    let vert = 0;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, s = Monde.surface(o.x + 14 * Math.cos(a), o.z + 14 * Math.sin(a));
      vert += s === SURFACE.SOUS_BOIS ? 1.2 : (s === SURFACE.HERBE || s === SURFACE.MASSIF) ? 0.8 : 0.25;
    }
    vert = clamp(vert / 8, 0.25, 1.1);
    const pluie = game.weather && game.weather.cur ? game.weather.cur.rain || 0 : 0;
    const prochesRue = clamp(1 - (this.etat.dRue || 60) / 30, 0, 0.5);       // les oiseaux s'éloignent de la rue
    const g = GAIN_OISEAUX * vert * (1 - 0.85 * pluie) * (1 - prochesRue) * 0.5;
    for (let k = 0; k < 2; k++) {
      const s = k ? 1 : -1;
      this._placer(this.oiseaux[k], o.x + 13 * s, o.y + 6, o.z - 13 * s);
      this._regler(this.oiseaux[k], g, 6500, 1.0);
    }
    this.etat.oiseaux = +(2 * g).toFixed(4);
  }

  // ---------------------------------------------------------------- le roulement de la monture
  // Les boucles sont fabriquées une fois (fabriquerRoulement, en fond) ; le graphe, lui, n'existe que pendant qu'on roule : deux
  // secondes après l'arrêt, ses sources sont arrêtées et débranchées (rien ne tourne pour rien dans le fil audio).
  _roulement(dt, game) {
    const u = game.user, V = u && u.velo, b = V && !V.sortir ? V.v : null;
    // (relecture C3) EN PAUSE, le monde est figé mais les images continuent : la vitesse du vélo, gelée, faisait
    // rouler le pneu sans fin sous le menu de pause. On s'y tait comme à l'arrêt.
    const roule = b && !game.paused && (game.mode === 'lobby' || game.mode === 'match') && Math.abs(b.v) > 0.05;
    if (!roule) {
      const R = this.roul;
      if (R && R.actif) { R.actif = false; R.arret = 0; R.sortie.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12); }
      if (R && !R.actif && (R.arret += dt) > 2) { debrancherRoulement(R); this.roul = null; }
      return;
    }
    if (!this.tamponsRoul) {
      // (on est monté avant la fin de la fabrication. La finir d'un coup, c'était 30 ms au PC — plus de 100 sur un
      // téléphone — au moment de partir : on la presse plutôt, 3 ms par image, et le vélo, qui démarre à peine, roule
      // sans bruit le temps qu'elle finisse : un tiers de seconde au PC. Relecture C3.)
      if (!this.fabRoul) this.fabRoul = fabriquerRoulement(this.ctx);
      const ta = performance.now(); let r;
      do { r = this.fabRoul.next(); } while (!r.done && performance.now() - ta < 3);
      if (!r.done) return;
      this.tamponsRoul = r.value; this.fabRoul = null;
    }
    if (!this.roul) this.roul = brancherRoulement(this, this.tamponsRoul);
    const R = this.roul, t = this.ctx.currentTime;
    if (!R.actif) { R.actif = true; R.sortie.gain.setTargetAtTime(1, t, 0.05); }
    const v = Math.abs(b.v);
    const fam = FAMILLE_SOL[Monde.surface(b.pos.x, b.pos.z)] || 'enrobe';
    const M = MELANGE_ROUES[fam] || MELANGE_ROUES.enrobe;
    // un engin à petites roues dures (trottinette, skate : lot C4) n'a ni roue libre ni pneu : ça chante plus aigu
    const petitesRoues = b.P && b.P.agent && b.P.agent !== 'velo';
    // (à 5 m/s, mesuré hors temps réel avant le volume général : -33 dB sur l'enrobé, -31 sur le gravier, -37 sur
    // l'herbe ; un rebond de dribble culmine à -17 dB : le vélo ne couvre jamais le ballon)
    const s = clamp(v / 6, 0, 1.4), s12 = Math.pow(s, 1.2);
    const k = petitesRoues ? 1.5 : 1;
    const ct = (p, val, tau = 0.06) => p.setTargetAtTime(val, t, tau);
    ct(R.lisse.gain.gain, 0.12 * s12 * M.lisse * (petitesRoues ? 1.4 : 1));
    ct(R.lisse.src.playbackRate, clamp((0.55 + 0.11 * v) * k, 0.4, 2.4));
    ct(R.graviers.gain.gain, 0.15 * Math.pow(s, 0.9) * M.graviers);
    ct(R.graviers.src.playbackRate, clamp(0.55 + 0.12 * v, 0.45, 1.6));
    ct(R.mou.gain.gain, 0.09 * s12 * M.mou);
    ct(R.mou.src.playbackRate, clamp(0.7 + 0.08 * v, 0.6, 1.5));
    // les joints des dalles : 8 chocs par seconde dans la boucle, un joint tous les 60 cm
    ct(R.joints.gain.gain, 0.16 * Math.min(1, s * 2) * M.joints);
    ct(R.joints.src.playbackRate, clamp(v / 0.6 / 8, 0.15, 2.2));
    // la roue libre : on ne pédale plus et ça roule (50 clics par seconde dans la boucle ; 30 cliquets par tour de roue
    // de 34 cm de rayon)
    const libre = !petitesRoues && (b.effort || 0) < 0.05 && v > 0.8;
    ct(R.cliquet.gain.gain, libre ? 0.05 * clamp(v / 3, 0.4, 1) : 0, libre ? 0.05 : 0.02);
    ct(R.cliquet.src.playbackRate, clamp((v / (2 * Math.PI * 0.34)) * 30 / 50, 0.35, 1.8));
    // le pneu sur le sol : un filtre qui s'ouvre avec la vitesse, et la position du vélo
    ct(R.filtre.frequency, 500 + 520 * v, 0.1);
    // (la position d'une monture est au sol du plateau, y = 0 : sa hauteur dans le monde, c'est le sol sous ses roues —
    // au parc haut, 12 m plus haut ; sinon le son venait de sous les pieds de la caméra)
    const P = R.panneau, p = b.pos, py = Monde.sol(p.x, p.z) + 0.3;
    if (P.positionX) { P.positionX.value = p.x; P.positionY.value = py; P.positionZ.value = p.z; } else P.setPosition(p.x, py, p.z);
    R.fam = fam; R.v = v;
  }

  // ---------------------------------------------------------------- bilan (?debug=1 : __sons())
  bilan() {
    return {
      niveauAmbiance: this.niveau, charge: !!this.tampons.oiseaux, sourcesActives: this.sources.length + (this.rue ? 2 : 0) + (this.oiseaux ? 2 : 0),
      dernierPas: this.derniere, roulement: this.roul ? { actif: this.roul.actif, sol: this.roul.fam, v: +(this.roul.v || 0).toFixed(2) } : null,
      ...this.etat, msParImage: +this.mesure.ms.toFixed(3),
      travauxDeFond: { msTotal: +this.mesure.travaux.toFixed(1), msPireImage: +this.mesure.maxTravaux.toFixed(2), orgue: !!this.tampons.orgue, roulement: !!this.tamponsRoul },
    };
  }
}

// Le mélange des cinq boucles de roulement selon le sol sous les roues.
const MELANGE_ROUES = {
  enrobe:    { lisse: 1.0, graviers: 0.0, mou: 0.0, joints: 0.0 },
  dalles:    { lisse: 0.8, graviers: 0.0, mou: 0.0, joints: 1.0 },
  gravier:   { lisse: 0.35, graviers: 1.0, mou: 0.15, joints: 0.0 },
  stabilise: { lisse: 0.6, graviers: 0.45, mou: 0.3, joints: 0.0 },
  terre:     { lisse: 0.35, graviers: 0.2, mou: 0.8, joints: 0.0 },
  herbe:     { lisse: 0.12, graviers: 0.0, mou: 1.0, joints: 0.0 },
  sousbois:  { lisse: 0.1, graviers: 0.35, mou: 0.8, joints: 0.0 },
  copeaux:   { lisse: 0.1, graviers: 0.6, mou: 0.6, joints: 0.0 },
  sable:     { lisse: 0.05, graviers: 0.2, mou: 1.0, joints: 0.0 },
};

// ================================================================== fabrication des sons synthétisés
// Un générateur pseudo-aléatoire à graine (les boucles sont les mêmes d'une partie à l'autre)
function hasard(graine) { let s = graine >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
// (relecture C3) LES GRANDES BOUCLES, PAR TRANCHES. L'atelier ne reprend la main qu'ENTRE deux pas d'un générateur
// (SonsParc._travaux) ; or une passe entière sur un tampon de 2,1 s (33 600 échantillons) durait jusqu'à 6 ms d'un bloc
// la première fois — le code ne tourne pas encore compilé, 150 ns l'échantillon — et le budget d'1 ms par image
// sautait (pire image mesurée : 12 ms). Chaque passe est donc elle-même un générateur, qui rend la main toutes les
// TRANCHE échantillons. Les échantillons sont tirés et calculés dans le même ordre qu'avant : les boucles sont, au bit
// près, celles qu'a mesurées l'implémentation du lot.
const TRANCHE = 4096;
function* parTranches(n, f) { for (let i0 = 0; i0 < n; i0 += TRANCHE) { f(i0, Math.min(n, i0 + TRANCHE)); yield; } }
// du bruit blanc, tiré au générateur r
function* blanc(r, n) { const d = new Float32Array(n); yield* parTranches(n, (a, b) => { for (let i = a; i < b; i++) d[i] = r() * 2 - 1; }); return d; }
// passe-bas du premier ordre, en place
function* passeBas(d, sr, fc) {
  const a = 1 - Math.exp(-2 * Math.PI * fc / sr); let y = 0;
  yield* parTranches(d.length, (i0, i1) => { for (let i = i0; i < i1; i++) { y += a * (d[i] - y); d[i] = y; } });
}
function* normaliser(d, rms) {
  let s = 0;
  yield* parTranches(d.length, (i0, i1) => { for (let i = i0; i < i1; i++) s += d[i] * d[i]; });
  const k = rms / Math.sqrt(s / d.length + 1e-12);
  yield* parTranches(d.length, (i0, i1) => { for (let i = i0; i < i1; i++) d[i] *= k; });
}
// Une boucle sans couture : on fabrique 0,1 s de trop et on fond cette fin dans le début
function* boucler(d, sr) {
  const c = Math.floor(0.1 * sr), n = d.length - c, out = new Float32Array(n);
  yield* parTranches(n, (i0, i1) => { for (let i = i0; i < i1; i++) out[i] = d[i]; });
  for (let i = 0; i < c; i++) { const w = i / c; out[i] = d[i] * Math.sin(w * Math.PI / 2) + d[n + i] * Math.cos(w * Math.PI / 2); }
  return out;
}
function tampon(ctx, d, sr) { const b = ctx.createBuffer(1, d.length, sr); b.copyToChannel ? b.copyToChannel(d, 0) : b.getChannelData(0).set(d); return b; }

// Les cinq boucles du roulement, à 16 kHz (rien au-dessus de 8 kHz ne manque à un pneu). Un GÉNÉRATEUR, comme l'orgue :
// l'atelier le fait avancer 1 ms par image dès qu'un vélo est sur le terrain, bien avant qu'on monte dessus (le tout
// d'un bloc prenait 30 ms : un à-coup au moment de partir). Il rend la main toutes les TRANCHE échantillons.
export function* fabriquerRoulement(ctx) {
  const sr = 16000, r = hasard(1730);
  const N = Math.floor(2.1 * sr);
  // le PNEU SUR L'ENROBÉ : un souffle grave (bruit filtré à 650 Hz) qui bouge un peu (le grain de la route), et un
  // soupçon de sifflement plus aigu
  const lisse = yield* blanc(r, N);
  const aigu = yield* blanc(r, N);
  yield* passeBas(lisse, sr, 650);
  yield* passeBas(lisse, sr, 900);
  yield* passeBas(aigu, sr, 3500);
  let mod = 0;
  yield* parTranches(N, (i0, i1) => { for (let i = i0; i < i1; i++) { if (i % 64 === 0) mod += (r() - 0.5) * 0.25 - mod * 0.02; lisse[i] = lisse[i] * (1 + 0.35 * mod) + aigu[i] * 0.06; } });
  yield* normaliser(lisse, 0.25);
  // le GRAVIER : des grains (un caillou chassé, écrasé) tirés au hasard, 380 par seconde, de 1 à 4 ms, d'amplitude très
  // inégale (quelques gros pour beaucoup de petits), sur un fond de grondement
  const graviers = yield* blanc(r, N);
  yield* passeBas(graviers, sr, 300);
  yield* parTranches(N, (i0, i1) => { for (let i = i0; i < i1; i++) graviers[i] *= 0.6; });
  const nG = Math.floor(380 * 2.1);
  for (let g = 0; g < nG; g++) {
    const a0 = Math.floor(r() * N), len = Math.floor(sr * (0.001 + r() * 0.003)), amp = 0.15 / Math.pow(0.05 + r(), 0.9);
    const k = Math.exp(-3 / len);
    let y = 0, e = amp * 0.25;
    for (let i = 0; i < len && a0 + i < N; i++) { y = (r() * 2 - 1) * e - 0.6 * y; graviers[a0 + i] += y; e *= k; }
    if (g % 100 === 99) yield;
  }
  yield* normaliser(graviers, 0.25);
  // L'HERBE ET LA TERRE : un froissement (bruit de 1,5 à 4 kHz, modulé lentement, comme des brins qu'on couche) et un
  // fond sourd
  const mou = yield* blanc(r, N);
  const sourd = yield* blanc(r, N);
  const bas = Float32Array.from(mou); yield* passeBas(bas, sr, 1500);
  yield* passeBas(mou, sr, 4000);
  yield* passeBas(sourd, sr, 220);
  let m2 = 0;
  yield* parTranches(N, (i0, i1) => { for (let i = i0; i < i1; i++) { if (i % 128 === 0) m2 = 0.6 * m2 + 0.4 * r(); mou[i] = (mou[i] - bas[i]) * (0.4 + m2) + sourd[i] * 1.2; } });
  yield* normaliser(mou, 0.25);
  // LES JOINTS DES DALLES : 8 doubles chocs par seconde (la roue avant, puis l'arrière 70 ms après, plus doux) : un
  // « toc » grave (140 Hz, amorti en 8 ms) et un claquement de bruit (2 ms)
  const NJ = Math.floor(1.1 * sr), joints = new Float32Array(NJ), n30 = Math.floor(0.03 * sr);
  const wj = (2 * Math.PI * 140) / sr, kj = Math.exp(-1 / (0.008 * sr)), kb = Math.exp(-1 / (0.002 * sr));
  for (let j = 0; j < 9; j++) {
    for (const [dt, a] of [[0, 1], [0.07, 0.7]]) {
      const a0 = Math.floor((j / 8 + dt + (r() - 0.5) * 0.01) * sr);
      let e1 = a * 0.8, e2 = a * 0.5;
      for (let i = 0; i < n30 && a0 + i < NJ; i++) { joints[a0 + i] += Math.sin(wj * i) * e1 + (r() * 2 - 1) * e2; e1 *= kj; e2 *= kb; }
    }
    yield;
  }
  yield* normaliser(joints, 0.18);
  // LE CLIQUET DE LA ROUE LIBRE : 50 clics par seconde, chacun un petit coup sur une résonance métallique (3,2 et 5,1 kHz)
  const NC = Math.floor(1.1 * sr), cliquet = new Float32Array(NC), n4 = Math.floor(0.004 * sr), kc = Math.exp(-1 / (0.0009 * sr));
  for (let j = 0; j < 56; j++) {
    const a0 = Math.floor((j / 50 + (r() - 0.5) * 0.002) * sr);
    let e = 0.7 + 0.3 * r();
    for (let i = 0; i < n4 && a0 + i < NC; i++) {
      const tt = i / sr;
      cliquet[a0 + i] += (Math.sin(2 * Math.PI * 3200 * tt) + 0.5 * Math.sin(2 * Math.PI * 5100 * tt)) * e; e *= kc;
    }
    if (j % 14 === 13) yield;
  }
  yield* normaliser(cliquet, 0.15);
  const T = { lisse, graviers, mou, joints, cliquet };
  for (const k in T) { T[k] = tampon(ctx, yield* boucler(T[k], sr), sr); yield; }
  return T;
}
// Le graphe : cinq sources en boucle -> leurs gains -> (filtre du pneu, sauf le gravier et le cliquet) -> panoramique
// (à la position du vélo) -> sortie -> bus des effets
function brancherRoulement(atelier, T) {
  const ctx = atelier.ctx;
  const sortie = ctx.createGain(); sortie.gain.value = 0; sortie.connect(atelier.effets);
  const panneau = ctx.createPanner();
  panneau.panningModel = 'equalpower'; panneau.distanceModel = 'inverse'; panneau.refDistance = 1; panneau.rolloffFactor = 0;
  panneau.connect(sortie);
  const filtre = ctx.createBiquadFilter(); filtre.type = 'lowpass'; filtre.frequency.value = 1500; filtre.Q.value = 0.6; filtre.connect(panneau);
  const voix = (buf, versFiltre) => {
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const gain = ctx.createGain(); gain.gain.value = 0; src.connect(gain); gain.connect(versFiltre ? filtre : panneau);
    src.start(ctx.currentTime, Math.random() * buf.duration); return { src, gain };
  };
  return {
    actif: false, arret: 0, sortie, panneau, filtre, fam: null, v: 0,
    lisse: voix(T.lisse, true), graviers: voix(T.graviers, false), mou: voix(T.mou, true),
    joints: voix(T.joints, true), cliquet: voix(T.cliquet, false),
  };
}
function debrancherRoulement(R) {
  for (const k of ['lisse', 'graviers', 'mou', 'joints', 'cliquet']) { try { R[k].src.stop(); } catch (e) { /* déjà arrêtée */ } R[k].gain.disconnect(); }
  R.sortie.disconnect();
}

// L'ORGUE DU MANÈGE : une petite valse de seize mesures (originale), à la manière des orgues de foire — une mélodie de
// tuyaux (riche en harmoniques, vibrato), doublée d'anches à l'octave, un glockenspiel au premier temps de chaque
// mesure, la basse « oum » et les accords « pa-pa », la grosse caisse et la caisse claire de l'orgue. Une boucle de
// 17,3 s, mono, à 16 kHz : on ne l'entend que de loin, et l'air en mange les aigus (au-delà de 8 kHz, rien à perdre).
// CALCULÉE EN JAVASCRIPT, PAR PETITS MORCEAUX : c'est un générateur, qui rend la main tous les 1024 échantillons d'une
// note et toutes les TRANCHE (4096) échantillons des passes finales ; l'atelier le fait avancer 1 ms par image
// (SonsParc.maj), et il rend l'AudioBuffer à la fin, au bout de quelques secondes de balade. (Une première version la
// jouait dans un OfflineAudioContext : quatre cents nœuds à créer, 40 ms d'un bloc sur le fil principal.)
// Les timbres sont des TABLES D'ONDE d'une période (2048 points, huit harmoniques au plus : rien ne replie sous les
// 8 kHz de Nyquist pour la plus haute note, 932 Hz), lues avec interpolation ; le vibrato est un petit oscillateur
// par rotation (pas de sinus à chaque échantillon).
export function* orgueManege(ctx, sr = 16000) {
  const temps = 0.36, mesures = 16, duree = temps * 3 * mesures, N = Math.ceil(duree * sr);
  const x = new Float32Array(N), r = hasard(4242);
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const TL = 2048;
  // (un seul calcul de sinus par point : les harmoniques se lisent dans la table du sinus, à l'indice h·i modulo TL)
  const BASE = new Float32Array(TL);
  for (let i = 0; i < TL; i++) BASE[i] = Math.sin((2 * Math.PI * i) / TL);
  yield;
  // (relecture C3 : la table rend la main tous les 512 points — la première, celle du tuyau, durait 5 ms d'un bloc)
  const table = function* (harm) {
    const t = new Float32Array(TL + 1);
    for (let i = 0; i <= TL; i++) { let v = 0; for (const [h, a] of harm) v += a * BASE[(h * i) % TL]; t[i] = v; if ((i & 511) === 511) yield; }
    return t;
  };
  // le tuyau : une dent de scie adoucie (1/h, et les aigus atténués) ; l'anche : les harmoniques impaires (le carré)
  const TUYAU = yield* table([1, 2, 3, 4, 5, 6, 7, 8].map((h) => [h, (1 / h) * Math.exp(-h / 7)]));
  const ANCHE = yield* table([1, 3, 5, 7].map((h) => [h, 1 / h]));
  const SINUS = yield* table([[1, 1]]);
  // ajoute une note : table, fréquence, début et durée (s), volume, attaque et relâche (s), vibrato. (Elle-même un
  // générateur : elle rend la main tous les 1024 échantillons — 2048 d'abord, mais les premières notes, lues à froid,
  // y passaient jusqu'à 5 ms.)
  const note = function* (tab, f, t0, d, vol, att = 0.012, rel = 0.05, vib = false) {
    const a = Math.floor(t0 * sr), n = Math.min(Math.floor(d * sr), N - a), ka = att * sr, kr = rel * sr, inc = f / sr;
    const w = (2 * Math.PI * 5.6) / sr, cw = Math.cos(w), sw = Math.sin(w), prof = vib ? 0.005 : 0;
    let ph = r(), vc = Math.cos(2 * Math.PI * 5.6 * t0), vs = Math.sin(2 * Math.PI * 5.6 * t0);
    for (let i = 0; i < n; i++) {
      let env = i < ka ? i / ka : 1; const e2 = (n - i) / kr; if (e2 < env) env = e2;
      ph += inc * (1 + prof * vs); if (ph >= 1) ph -= 1;
      const nc = vc * cw - vs * sw; vs = vs * cw + vc * sw; vc = nc;
      const p = ph * TL, k = p | 0;
      x[a + i] += vol * env * (tab[k] + (tab[k + 1] - tab[k]) * (p - k));
      if ((i & 1023) === 1023) yield;
    }
  };
  // une cloche (glockenspiel) : deux partiels qui s'éteignent vite
  // (le second partiel, inharmonique, seulement sous Nyquist : sinon il se replierait en une fausse note)
  const cloche = function* (f, t0, vol) { yield* note(SINUS, f, t0, 0.5, vol, 0.002, 0.45); if (f * 2.76 < 0.45 * sr) yield* note(SINUS, f * 2.76, t0, 0.25, vol * 0.25, 0.002, 0.24); };
  // la batterie : grosse caisse (sinus de 95 à 45 Hz), caisse claire et cymbale (bruit qui s'éteint, filtré)
  // (décroissances par multiplication, sinus lu dans la table : pas de Math.exp ni de Math.sin par échantillon)
  const grosseCaisse = (t0) => {
    const a = Math.floor(t0 * sr), n = Math.floor(0.2 * sr), k = Math.exp(-1 / (0.05 * sr)); let ph = 0, e = 1;
    for (let i = 0; i < n && a + i < N; i++) { ph += (45 + 50 * e) / sr; if (ph >= 1) ph -= 1; x[a + i] += 0.55 * e * BASE[(ph * TL) | 0]; e *= k; }
  };
  const bruit = (t0, d, vol, aigu) => {
    const a = Math.floor(t0 * sr), n = Math.floor(d * sr), k = Math.exp(-4 / n); let y = 0, py = 0, e = vol;
    for (let i = 0; i < n && a + i < N; i++) {
      const w = r() * 2 - 1;
      // caisse claire : bruit un peu étouffé ; cymbale : seulement le haut (différence de deux échantillons)
      y = aigu ? w - py : 0.5 * y + 0.5 * w; py = w;
      x[a + i] += e * y; e *= k;
    }
  };
  // la mélodie (fa majeur) : [note MIDI, temps] par mesure ; A (1-8) puis B (9-16)
  const MELODIE = [
    [[65, 1], [69, 1], [72, 1]], [[77, 2], [76, 1]], [[74, 2], [72, 1]], [[69, 3]],
    [[67, 1], [70, 1], [74, 1]], [[79, 2], [77, 1]], [[76, 2], [74, 1]], [[72, 3]],
    [[72, 1], [76, 1], [79, 1]], [[82, 2], [81, 1]], [[79, 2], [76, 1]], [[72, 3]],
    [[65, 1], [69, 1], [72, 1]], [[77, 2], [74, 1]], [[72, 2], [64, 1]], [[65, 3]],
  ];
  // l'harmonie : [basse, accord] par mesure (fa, si bémol, sol mineur, do septième, do)
  const F = [41, [57, 60, 65]], Bb = [46, [58, 62, 65]], Gm = [43, [58, 62, 67]], C7 = [48, [58, 64, 67]], C = [48, [60, 64, 67]];
  const HARMONIE = [F, F, Bb, F, Gm, C7, C7, F, C, C7, C, F, F, Bb, C7, F];
  for (let b = 0; b < mesures; b++) {
    const t0 = b * 3 * temps;
    let tt = t0;
    for (let i = 0; i < MELODIE[b].length; i++) {
      const [m, n] = MELODIE[b][i];
      yield* note(TUYAU, hz(m), tt, n * temps - 0.03, 0.30, 0.012, 0.05, true);
      yield* note(ANCHE, hz(m + 12), tt, n * temps - 0.03, 0.05, 0.012, 0.05, true);
      if (i === 0) yield* cloche(hz(m + 24), tt, 0.10);
      tt += n * temps;
    }
    // oum (la basse ; la quinte, une mesure sur deux quand l'accord dure), pa-pa (l'accord, piqué)
    const [basse, acc] = HARMONIE[b], meme = b > 0 && HARMONIE[b - 1] === HARMONIE[b];
    const bm = meme ? (basse + 7 > 50 ? basse - 5 : basse + 7) : basse;
    yield* note(TUYAU, hz(bm), t0, temps * 0.9, 0.45, 0.01, 0.08);
    for (const k of [1, 2]) for (const m of acc) yield* note(ANCHE, hz(m), t0 + k * temps, temps * 0.45, 0.05, 0.008, 0.04);
    // la batterie : grosse caisse au premier temps, caisse claire aux deux autres, cymbale toutes les quatre mesures
    grosseCaisse(t0);
    bruit(t0 + temps, 0.07, 0.10, false); bruit(t0 + 2 * temps, 0.07, 0.08, false);
    yield;
    if (b % 4 === 0) { bruit(t0, 0.7, 0.05, true); yield; }
  }
  // la sortie : un passe-bas (4,2 kHz, deux pôles) et une saturation douce (le timbre nasillard des anches), en deux fois
  const a = 1 - Math.exp(-2 * Math.PI * 4200 / sr);
  let y1 = 0, y2 = 0;
  for (let i = 0; i < N; i++) { y1 += a * (x[i] - y1); y2 += a * (y1 - y2); x[i] = y2; if (i % TRANCHE === 0) yield; }
  let p = 0;
  for (let i = 0; i < N; i++) { const v = Math.tanh(1.4 * x[i]); x[i] = v; const q = v < 0 ? -v : v; if (q > p) p = q; if (i % TRANCHE === 0) yield; }
  if (p > 0) for (let i = 0; i < N; i++) { x[i] *= 0.9 / p; if (i % TRANCHE === 0) yield; }
  return tampon(ctx, x, sr);
}
