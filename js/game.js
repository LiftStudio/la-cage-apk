import * as THREE from 'three';
import { DRIBBLE, COURT, BALL_R, G, BOUNDS, HALF_BOUNDS, HALF_CHECK_Z, YARD, RING, SHOT_CLOCK, METER_TIME, PERFECT_CENTER, RANGE, DIFFICULTY, ENCEINTE } from './config.js';
import { HOOP_VEC, ZERO, hdist, isThree, horsArc, clamp, damp, lerp } from './util.js';
import { buildArena } from './court.js';
import { Player } from './player.js';
import { Ball } from './ball.js';
import { Input } from './input.js';
import { AIController } from './ai.js';
import { HUD, showOverlay, hideOverlay, EmoteWheel } from './ui.js';
import { PostFX } from './fx.js';
import { actionKey, PARC_ENTIER } from './settings.js';
import { manetteActive, aideBalade, aideVelo } from './manette.js';   // aides à l'écran quand on joue à la manette
import { IS_TOUCH } from './touch.js';
import { TELEPHONE } from './appareil.js';
import { EMOTES, roueEmotes } from './emotes.js';
import { Wallet, SKINS, COINS, XP, UP_STATS } from './shop.js';
import { Weather } from './weather.js';
import { MERCHANT, MERCHANT_DEF, buildMerchantMarker, probeMerchantModel } from './merchant.js';
import { badgeFx, BADGE_MAX } from './badges.js';

// Pas de simulation fixe : 120 Hz. Le rendu reste libre, seule la logique de jeu est cadencée.
const FIXED_DT = 1 / 120;
import { Training, DRILLS, TRAIN_POS, TRAIN_R } from './training.js';
import { Rng } from './net.js';
import { Presence, Demo } from './presence.js';
import { MatchEnLigne } from './enligne.js';
import { JETONS, RARETE_PERSO } from './gacha.js';
import { ROSTER as ROSTER_ALL } from './roster.js';
import { Couches } from './couches.js';
import { Velo, veloDepuisDonnees } from './velo.js';
// (lot C4) les engins « debout » : trottinettes du parc, skate et trottinette pliante du joueur
import { Trottinette, trottinettesDepuisDonnees } from './monture_trottinette.js';
import { Skate } from './monture_skate.js';
import { raisonBlocage, couleurDe } from './monture_cavalier.js';
import { volSur, volY } from './dribble.js';
import { OmbresContact } from './ombres_contact.js';
import { avecProfondeur, sceneOmbre } from './ombre_cache.js';
import { Monde, DRAPEAU } from './monde.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _dir = new THREE.Vector3(), _vCam = new THREE.Vector3();
const _vm = new THREE.Vector3();
const RING_POS = new THREE.Vector3(RING.x, 0, RING.z);
const PRECHAUFFE = [1.5, 4, 8, 14, 22];   // moments (s, hors match) où l'on précompile le décor (Game.prechaufferScene)
const TEAM_KEY = ['user', 'cpu'];
// (Game.majAideSortie) Au doigt, une ligne courte : elle tient au-dessus du manche sans passer sous les boutons (css/style.css)
const AIDE_SORTIE = IS_TOUCH ? '↩ BALLE À SORTIR : derrière les 3 pts'
  : '↩ BALLE À SORTIR : repasse derrière la ligne à 3 pts avant d’attaquer le cercle';
// Game.regards, à chaque pas : la cible du regard de `p` (gardée sur lui), sa tête, le panier qu'il vise
const regardDe = (p) => p._cr || (p._cr = new THREE.Vector3());
const teteDe = (q, out) => out.set(q.pos.x, q.h * 0.93 + (q.jumpY || 0) + q.pos.y, q.pos.z);   // (+ le sol : 0 à plat)
const panierDe = (p) => p.hoop || (hdist(p.pos, HOOP_VEC[0]) < hdist(p.pos, HOOP_VEC[1]) ? HOOP_VEC[0] : HOOP_VEC[1]);

// Une seule instance pour toute la session : le terrain 3D sert de fond au menu (mode 'menu'), d'écran de sélection du
// joueur (mode 'select' : le joueur choisi est posé au centre, caméra qui tourne), puis de balade libre ('lobby') et de
// match ('match', 2 équipes de 1 à 5 joueurs ; l'équipe 0 est celle du joueur, il en contrôle un à la fois).
export class Game {
  constructor(audio, cb, settings) {
    this.audio = audio; this.cb = cb; this.settings = settings;
    this.opts = { difficulty: 'normal', target: 11 }; this.diff = DIFFICULTY.normal;

    // ---- rendu ----
    this.container = document.getElementById('game');
    // MSAA (antialias:true) ne sert à rien quand le rendu passe par le composer : la passe finale est un simple
    // quad plein écran, et les cibles du composer ne sont pas multi-échantillonnées. Il ne lisse que le rendu DIRECT,
    // c'est-à-dire la basse. Ailleurs il coûtait quand même un tampon d'écran x4 à résoudre à chaque image (et à
    // réallouer à chaque changement de résolution). Le contexte ne se recrée pas en cours de partie : on lit donc le
    // préréglage ENREGISTRÉ. Passé en basse sans MSAA, le jeu lisse au FXAA (js/fx.js, _fxaaBasse). Sur un téléphone à
    // forte densité de pixels, jamais : ~30 % de bande passante mémoire pour un gain invisible.
    const _dense = (window.devicePixelRatio || 1) >= 2 && TELEPHONE;     // (la détection de tout le jeu : js/appareil.js)
    const _basse = !!(settings && settings.graphics && settings.graphics.quality === 'low');
    this.renderer = new THREE.WebGLRenderer({ antialias: _basse && !_dense, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 700);
    this.camera.position.set(0, 2.5, 7);
    this.lookCur = new THREE.Vector3(0, 1.4, 3);
    this.camTarget = new THREE.Vector3();
    this.camMode = settings ? settings.game.camera : 'tv'; // caméra de match : tv (côté) | back (derrière le joueur)
    // Balade : trois vues, comme demandé. 3 = épaule large (par défaut), 2 = épaule serrée, 1 = à la première
    // personne. On tourne avec la touche caméra.
    this.vue = (settings && settings.game.vue) || 3;
    buildArena(this.scene, this.renderer, (settings && settings.game.terrain) || 'becon');
    // Chaque terrain dit ou l'on peut marcher et ou se tient le marchand : sur Levallois le gradin occupe
    // toute la bande cote -X, on ne peut pas s'y promener et Pierrick ne peut pas s'y tenir.
    const rep = this.scene.userData.reperes || {};
    this.yard = rep.yard || YARD;
    // Un terrain peut n'avoir AUCUN marchand : celui de Levallois n'est pas Pierrick et son personnage n'existe
    // pas encore. On ne le remplace pas par Pierrick deguise, on n'affiche rien.
    this.sansMarchand = !!rep.sansMarchand;
    Player.obstacles = rep.obstacles || [];      // troncs plantes dans l'enceinte (Jemmapes)
    // Les bancs ou l'on peut s'asseoir. Un terrain qui n'en declare pas n'en a pas, et tout le bloc de
    // commande plus bas se desactive tout seul.
    this.bancs = rep.bancs || null;
    // Les vélos du décor (court.js). Un seul se conduit sur Bécon : celui qui est appuyé contre le grillage.
    this.velos = this.scene.userData.velos || [];
    // LES VÉLOS DU PARC ENTIER (lot A4 ; monde.json > velos, conception § 2.7) : six vélos garés sur leur béquille, posés
    // d'après les données du monde installé. En ligne, le réseau les suit TOUS, vélo par vélo, par leur identifiant
    // (lot A7 : `velosEnLigne`, voir garerVelo). (Sur un terrain plat, rien : Monde.velos est vide.)
    if (!Monde.plat && Monde.velos.length) {
      const vp = veloDepuisDonnees(this.scene, Monde.velos, { dx: Monde.dx });
      this.velos = this.scene.userData.velos = [...this.velos, ...vp];
      if (window.__parcEntier) window.__parcEntier.velos = { n: vp.length, ms: Object.fromEntries(Object.entries(vp.ms).map(([k, v]) => [k, Math.round(v)])) };
    }
    // LES TROTTINETTES DU PARC ENTIER (lot C4 ; monde.json > trottinettes, T1 et T2) : sur leur béquille, conduisibles
    // comme les vélos, suivies en ligne de la même façon (par leur identifiant). (Sur un terrain plat, aucune.)
    if (!Monde.plat && (this.scene.userData.trottinettesMonde || []).length) {
      const tp = trottinettesDepuisDonnees(this.scene, this.scene.userData.trottinettesMonde, { dx: Monde.dx });
      this.velos = this.scene.userData.velos = [...this.velos, ...tp];
    }
    // (lot C4) l'engin du joueur, sorti de son sac (skate, trottinette pliante) : un par genre, construit à la demande
    this.enginsPerso = {}; this.enginPerso = null; this._enginDispo = false; this._presGenre = 'velo';
    this.veloTerrain = this.velos.find((b) => b.conduisible) || null;
    this.veloOrigine = this.veloTerrain ? { x: this.veloTerrain.pos.x, z: this.veloTerrain.pos.z, cap: this.veloTerrain.cap, penche: this.veloTerrain.penche, appui: this.veloTerrain.appui } : null;
    this.veloSeq = 0; this.veloPar = ''; this.veloNonce = 0; this.veloCd = 0; this.veloDescente = false; this._presVelo = false;
    // PLUSIEURS VÉLOS EN LIGNE (parc entier, lot A7, conception § 3.8) : identifiant -> dernier garage connu
    // [id, x, z, cap, n, par, nonce] (x dans le repère du terrain 1), la règle « le plus récent gagne » vélo par vélo.
    // null sur un terrain plat : un seul vélo, celui du terrain, synchronisé comme avant (veloSeq, veloPar, veloNonce).
    this.velosEnLigne = !Monde.plat && this.velos.some((b) => b.id) ? new Map() : null;
    this._blocageT = 0; this._blocageTxt = null;     // « Descends du vélo » (relief du parc entier, signalerBlocageVelo)
    this.marchandPos = rep.marchand || { x: MERCHANT.x, z: MERCHANT.z, fx: MERCHANT.facing.x, fz: MERCHANT.facing.z };
    this.fx = new PostFX(this.renderer, this.scene, this.camera);
    this.ombres = new OmbresContact(this.renderer, this.scene);   // taches douces sous les joueurs, le ballon, les bancs
    // Si la machine décroche durablement, la qualité descend d'un cran toute seule. On le DIT au joueur : une
    // image qui devient moins belle sans explication, c'est un bug à ses yeux.
    this.fx.onDowngrade = (q) => {
      const noms = { extreme: 'EXTRÊME', ultra: 'ULTRA', high: 'HAUTE', medium: 'MOYENNE', low: 'BASSE' };
      this.hud.feedback(`GRAPHISMES : ${noms[q] || q}`, 'warn');
      this.hud.hint('Le jeu ramait, la qualité a été baissée. Options > Graphismes pour la remonter.');
      if (this.settings) this.settings.set('graphics.quality', q);
    };   // occlusion ambiante, bloom, étalonnage, SMAA
    this.ring = this._buildRing();
    this.marker = this._buildMarker();

    // ---- joueurs / équipes (créés par showPreview / setup) ----
    this.players = []; this.ais = new Map(); this.marks = new Map(); this.markT = 0; this.switchT = 0;
    this.teams = [
      { id: 0, key: 'user', name: 'BÉCON', players: [], hoop: HOOP_VEC[0], score: 0 },
      { id: 1, key: 'cpu', name: 'VISITEURS', players: [], hoop: HOOP_VEC[1], score: 0 },
    ];
    this.teamSize = 1; this.user = null; this.captain = null; this.preview = null;
    this.half = false;                    // demi-terrain : les deux équipes attaquent le panier A
    this.autoUser = false;                // true = le joueur local est joué par l'ordinateur
    // Tirages des RÈGLES (tir réussi, contre, vol, direction du raté). En partie en ligne, ils doivent donner
    // le même résultat sur toutes les machines : on passe donc par un générateur à graine, pas par Math.random.
    this.rng = new Rng((Math.random() * 0xffffffff) >>> 0);   // graine de départ hors ligne
    this.ball = new Ball(this.scene, audio);
    this.scene.userData.ball = this.ball;          // le filet réagit au passage de la balle (js/hoopfx.js)
    this.input = new Input(settings ? settings.bindings : undefined);
    this.hud = new HUD();
    this.wheel = new EmoteWheel(EMOTES, (i) => this.doEmote(i)); this.wheelHold = 0;   // liste filtrée par applyShop (emotes possédées)

    // ---- marchand (PNJ de la balade) et boutique : porte-monnaie, boosts de nourriture, skins ----
    // Claquement de dunk : appelé par la balle (js/ball.js) à l'instant exact où elle franchit le cercle.
    // L'HÔTE D'UN MATCH EN LIGNE fait voir ces chocs à ses invités (js/enligne.js, choc) : chez eux le ballon libre est lu
    // dans les images, plus simulé — sans cela ni cercle qui vibre, ni son du cercle ou de la planche, ni claquement de dunk.
    const hote = () => this.reseau && this.reseau.role === 'hote' ? this.reseau : null;
    this.ball.choc = (k, sgn, f, v) => hote()?.choc(k, sgn, f, v);
    this.scene.userData.dunkSlam = (sgn, strength, pos, shooter) => {
      hote()?.choc('dk', sgn, strength, 0, shooter);
      this.scene.userData.rimHit?.(sgn, strength);                    // le cercle plie franchement (js/hoopfx.js)
      const mine = shooter && shooter.team === 0;
      this.audio.dunkHit(pos); this.addShake(mine ? 0.18 : 0.10, 0.45); this.audio.swell(mine ? 0.8 : 0.4, 1.8);
      if (mine) this.cb.onChat?.('dunk');
      if (mine) this.fx.flash = 0.35;
      if (mine) this.slowMo(0.32, 0.34);                              // bref ralenti sur TON dunk : on voit le cercle plier et le filet claquer
    };

    this.weather = new Weather(this.scene, this.fx);       // soleil / ciel couvert / pluie, et rayons de soleil

    this.wallet = new Wallet();
    this.wallet.onChange(() => {
      this.hud.coins(this.wallet.coins, this.wallet.boostText());
      this.wheel.setList(roueEmotes(this.wallet));      // la roue = les emotes EQUIPEES, pas toutes celles possedees
    });
    this.training = new Training(this.scene, this);   // ateliers d'entraînement de la balade libre
    // Présence en ligne : les autres connectés se promènent sur le MÊME terrain que toi (hub façon NBA 2K).
    this.presence = new Presence(this.scene, ROSTER_ALL, this.yard);
    this.presence.modeleBalle = this.ball.mesh;
    this.presence.dribbler = (h, b, dt) => this.balleEnMain(h, b, dt);
    this.presence.onVelo = (vg, id) => this.recevoirVeloGare(vg, id);
    this.presence.habiller = (p, ids) => Game.habiller(p, ids);     // la tenue des joueurs distants (voir tenueIds)
    if (this.fx && this.fx.ombreCache) this.fx.ombreCache.velos = () => this.velos;   // vélos garés = décor (js/ombre_cache.js)
    // Les programmes et les textures d'un avatar qui arrive, préparés en parallèle avant qu'il ne paraisse
    // (js/player.js, _loadAvatar). Compilés pour la cible où la scène est dessinée : celle du post-traitement
    // (flottante), ou l'écran quand il est coupé — sinon three recompilerait la bonne variante au premier dessin.
    Player.preparerRendu = (o) => {
      const r = this.renderer;
      if (!r || !r.compileAsync) return null;
      o.traverse((m) => {
        if (!m.isMesh || !m.material) return;
        // (le filtrage du préréglage AVANT l'envoi : js/fx.js _anisoRetard n'aura pas à renvoyer la texture)
        const an = (this.fx && this.fx._aniso) || 1;
        for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) {
          const t = m.material[k];
          if (!t) continue;
          if (t.anisotropy < an) t.anisotropy = an;
          r.initTexture(t);
        }
      });
      const pret = this._compilerTout(o, true);
      // SES PROGRAMMES DU CRAN DU DESSOUS AUSSI, TOUT DE SUITE (07/10/2026). On les laissait à precompilerRepli, « au plus
      // 3 s après son arrivée » — mais celui-ci ne travaille jamais pendant la MESURE du mode auto, et c'est justement
      // pendant cette mesure qu'arrivent les avatars du match : à la première baisse de haute à moyenne, leurs programmes
      // (cheveux, corps, tenue d'avaturn) se compilaient d'un bloc, 0,9 à 1,9 s d'image figée (juge, 3 contre 3, Radeon
      // intégrée). Ils sont donc compilés ici dans l'état du repli (js/fx.js avecRepli), en parallèle, puis dessinés une
      // fois hors écran (imageABlanc : le pilote finit de préparer un programme à son premier dessin), comme le décor
      // pendant le menu. Seulement en qualité automatique (un préréglage choisi à la main ne baisse jamais seul) ; rien au
      // téléphone ni en moyenne, dont le cran du dessous a les mêmes programmes (_etatRepli rend null).
      const fx = this.fx;
      const R = fx && fx.auto && fx.compilerTout && fx._etatRepli?.();
      const repli = R ? fx.avecRepli(o, (x) => this._compilerTout(x, true)) : null;
      if (repli) {
        Promise.all([pret, repli]).then(() => {
          const objets = [];
          o.traverse((m) => { if (m.isMesh && m.material) objets.push(m); });
          fx.imageABlanc(objets, R);
        }).catch(() => {});
      }
      return pret;
    };
    this.fx.compilerTout = (o) => this._compilerTout(o);
    // LE MONDE EN LIGNE (parc entier, lot A7 ; js/presence.js) : drapeau levé, chaque paquet dit où l'on est — 'parc'
    // pour le parc entier (parc et parc2 : un seul monde), sinon le nom du terrain — et l'on ne voit que ceux du même
    // monde, aux mêmes données. Drapeau baissé : null, les paquets et ce qu'on voit sont ceux d'avant.
    // (La Cage « scan 3D » est La Cage à l'identique, mêmes cotes : le même monde que La Cage, comme avant le lot.)
    // AU PARC, MÊME EN PLATEAU SEUL (recette du 02/10, défaut A6) : l'ordinateur y est au parc entier par défaut, le
    // téléphone et l'APK au plateau seul. Sans monde dans ses paquets, le plateau seul était invisible pour l'ordinateur
    // (un paquet sans `ter` y passe pour un ancien client d'un terrain inconnu), qui se faisait pourtant embarquer dans
    // ses matchs. Le plateau seul est donc lui aussi du monde 'parc' (js/presence.js le marque `plat` : pas de données
    // du monde à comparer), avec son terrain. Idem au parc entier faute de données (Monde resté plat). Ailleurs, rien ne
    // change : le monde n'y est dit que si le parc entier est le réglage.
    const terrain = settings && settings.game.terrain, auParc = !Monde.plat || terrain === 'parc' || terrain === 'parc2';
    if (PARC_ENTIER || auParc) this.presence.ter = auParc ? 'parc' : ({ becon_scan: 'becon' }[terrain] || terrain || 'becon');
    // (et, au parc, lequel des deux terrains est le nôtre : le repère de nos positions, et le cercle bleu ne lance pas
    // de match avec l'autre ; reperes.plateau de js/court_parc.js, entier ou non)
    if (auParc) this.presence.plateau = rep.plateau || (terrain === 'parc2' ? 2 : 1);
    this.presence.onAutreVersion = (nom) => this.signalerAutreVersion(nom);
    Couches.son = this.audio;                       // pas, crissements de semelles, réceptions (js/couches.js)
    if (this.veloTerrain) Velo.preparer(this.scene, 1);   // un vélo d'avance pour le premier cycliste en ligne
    this.online = null;                              // salon branché, null = balade hors ligne
    if (this.sansMarchand) {
      this.merchant = null; this.merchantMark = null;
    } else {
      const MP = this.marchandPos;
      // Le nom du marchand est celui du TERRAIN (`reperes.marchand.nom`) : Pierrick tient La Cage, pas les autres.
      this.nomMarchand = MP.nom || MERCHANT_DEF.name;
      this.merchant = new Player({ ...MERCHANT_DEF, name: this.nomMarchand }, this.scene, false);
      this.merchant.team = -1; this.merchant.bounds = this.yard;
      this.merchant.pos.set(MP.x, 0, MP.z); this.merchant.setFacing(MP.fx, MP.fz);
      // `sansModele` : le terrain n'a pas encore d'avatar pour son marchand, on garde le bonhomme en
      // primitives. Il sait tout faire sauf jouer des clips, ce dont on n'a pas besoin ici. `modele` : son
      // personnage à lui ({ url, hauteur }) ; sans rien, c'est Pierrick (assets/marchand.glb).
      if (!MP.sansModele) {
        if (MP.modele) probeMerchantModel(this.merchant, MP.modele.url, MP.modele.hauteur);
        else probeMerchantModel(this.merchant);
      }
      // ASSIS SUR LE BANC. On termine l'animation tout de suite : personne n'est la pour le voir s'asseoir,
      // et un marchand qui se plie en deux au chargement de la scene ferait bizarre.
      if (MP.assis) { this.merchant.sasseoir(MP.assis); this.merchant.assis.k = 1; }
      // Le repere flotte plus bas quand il est assis : a 2,45 m il aurait plane a un metre au-dessus de sa
      // tete, detache de lui.
      this.tagMarchandY = MP.assis ? 1.72 : 2.45;
      this.merchantMark = buildMerchantMarker(this.scene, MP); this.merchantMark.userData.tag.visible = false;
    }
    this.nearMerchant = false;
    this.applyShop();

    // ---- état ----
    this.mode = 'menu'; // menu | select | lobby | match
    this.state = 'playing'; // playing | countdown | scored | turnover | over
    this.stateT = 0; this.pendingOffense = 0; this.pendingFromZ = null; this.lastCount = -1;
    this.offense = 0; this.shotClock = SHOT_CLOCK;
    this.aSortir = -1;                 // demi-terrain : équipe qui doit ressortir la balle derrière l'arc (voir majSortie)
    this.pendingShot = null;
    this.dribbleT = 0; this.paused = false; this.time = 0;
    this.practice = 0; this.triggerT = 0; this.ringArmed = true; this.setupOpen = false;
    this.camYaw = 0; this.camPitch = 0.22; this.dragging = false;
    this.clock = new THREE.Clock(); this._raf = null;
    this.fpsT = 0; this.fpsN = 0; this.menuT = 0; this.selectT = 0;
    // ---- sensations : momentum ("en feu"), séries, ralenti, secousses de caméra ----
    this.momentum = { user: 0, cpu: 0 }; this.streak = { user: 0, cpu: 0 }; this.fire = { user: false, cpu: false };
    this.timeScale = 1; this.slowT = 0;
    this.shake = { t: 0, dur: 1, amp: 0 };
    this.camPos = this.camera.position.clone();

    // ---- souris (caméra GTA en balade) ----
    const canvas = this.renderer.domElement;
    // Sur téléphone, la barre d'adresse qui se rétracte déclenche une rafale de « resize ». Chaque appel
    // réalloue la dizaine de cibles de rendu du composer : c'est un à-coup garanti, voire un plantage mémoire.
    // On applique donc la caméra tout de suite (gratuit) et on ne redimensionne les tampons qu'une fois calmé.
    this._resizeT = null;
    this._onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix();
      clearTimeout(this._resizeT);
      this._resizeT = setTimeout(() => this.fx.resize(window.innerWidth, window.innerHeight), 160);
    };
    this._onClick = () => { if (this.mode === 'lobby' && !this.paused && !this.setupOpen && document.pointerLockElement !== canvas) { try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* capture souris refusée (iframe, aperçu) */ } } };
    this._onDown = () => { this.dragging = true; };
    this._onUp = () => { this.dragging = false; };
    this._onMove = (e) => {
      if (this.mode !== 'lobby' || this.paused || this.setupOpen) return;
      if (document.pointerLockElement === canvas || this.dragging) {
        const c = this.settings ? this.settings.controls : { sensitivity: 1, invertY: false };
        this.camYaw -= e.movementX * 0.0025 * c.sensitivity;
        if (Math.abs(e.movementX) > 1) this.camManuT = performance.now();
        this.camPitch = clamp(this.camPitch + e.movementY * 0.002 * c.sensitivity * (c.invertY ? -1 : 1), -0.1, 0.9);
      }
    };
    window.addEventListener('resize', this._onResize);
    canvas.addEventListener('click', this._onClick);
    canvas.addEventListener('mousedown', this._onDown);
    window.addEventListener('mouseup', this._onUp);
    window.addEventListener('mousemove', this._onMove);
    // L'ORIENTATION (iPhone, iPad, navigateur de téléphone) : `portrait` sur un écran tactile plus haut que large, relu à
    // chaque rotation. On lit les dimensions plutôt que la requête CSS d'orientation : c'est ce que le jeu affiche
    // vraiment. « JOUER QUAND MÊME » pose `portrait-ok` : le jeu se joue alors en portrait, comme avant le panneau.
    const majOrientation = () => document.body.classList.toggle('portrait',
      IS_TOUCH && window.innerHeight > window.innerWidth * 1.05);
    for (const ev of ['resize', 'orientationchange']) window.addEventListener(ev, () => { majOrientation(); setTimeout(majOrientation, 300); });
    majOrientation();
    const okPortrait = document.getElementById('tourner-ok');
    if (okPortrait) okPortrait.onclick = (e) => { e.stopPropagation(); document.body.classList.add('portrait-ok'); window.dispatchEvent(new Event('resize')); };
    this._btnPlay = document.getElementById('btn-play');
    this._btnPlay.onclick = () => this.cb.onSetup?.();

    // Le rendu peut refuser ou abandonner un préréglage : on le DIT, au lieu de laisser croire que le menu ment.
    const QNOM = { low: 'BASSE', medium: 'MOYENNE', high: 'HAUTE', ultra: 'ULTRA', extreme: 'EXTRÊME' };
    document.addEventListener('hoops-qualite-bridee', (e) => {
      this.hud.feedback(`${QNOM[e.detail.demande] || e.detail.demande} impossible ici → ${QNOM[e.detail.applique] || e.detail.applique}`, 'bad');
    });
    document.addEventListener('hoops-qualite-baissee', (e) => {
      this.hud.feedback(`Trop lent : qualité → ${QNOM[e.detail.quality] || e.detail.quality}`, 'info');
    });
    // (06/10/2026 : et quand la marge revient — téléphone refroidi, scène plus légère —, elle remonte d'un cran : js/fx.js)
    document.addEventListener('hoops-qualite-remontee', (e) => {
      this.hud.feedback(`Ça respire : qualité → ${QNOM[e.detail.quality] || e.detail.quality}`, 'info');
    });
    document.addEventListener('hoops-qualite-lourde', (e) => {
      this.hud.feedback(`${QNOM[e.detail.quality] || e.detail.quality} : ${Math.round(1000 / e.detail.ms)} im/s ici — baisse d'un cran si ça gêne`, 'info');
    });
    // L'IMAGE PERDUE (06/10/2026). iOS Safari, et les téléphones à court de mémoire, retirent son contexte WebGL à la page :
    // l'écran se fige ou devient noir. Le bandeau du HUD ne se voyait pas (le menu le cache, et plus rien ne se redessine) :
    // un panneau le dit, avec RECHARGER (la progression — pièces, vœux, réglages — est enregistrée au fil de l'eau). Si le
    // navigateur rend le contexte (js/fx.js repart alors en moyenne), on peut aussi continuer.
    document.addEventListener('hoops-gpu-perdu', () => {
      this.hud.feedback('Carte graphique saturée — recharge la page', 'bad');
      showOverlay('IMAGE PERDUE', 'La carte graphique a manqué de mémoire. Recharge le jeu : ta progression est enregistrée.', [
        { label: 'Recharger', cls: 'btn-primary', onClick: () => location.reload() },
      ]);
    });
    document.addEventListener('hoops-gpu-retabli', () => {
      if (this.ombres) this.ombres.cuisson = NaN;          // (la carte fixe des ombres de contact est à refaire : voir OmbresContact.update)
      showOverlay('IMAGE RÉTABLIE', 'Le jeu repart en qualité moyenne. Si des textures manquent, recharge-le.', [
        { label: 'Continuer', cls: 'btn-primary', onClick: () => { hideOverlay(); if (this.paused) this.togglePause(); } },
        { label: 'Recharger', cls: 'btn-secondary', onClick: () => location.reload() },
      ]);
    });

    this.applySettings();
    this.enterMenu();
  }

  // réglages du menu Options (appelé au démarrage et à chaque changement)
  applySettings() {
    const s = this.settings; if (!s) return;
    // LE RENDU SEULEMENT S'IL A CHANGÉ (06/10/2026). Tout réglage passe par ici — la touche caméra (game.camera, game.vue),
    // un volume, une touche — et repassait le préréglage de départ : mesuré en 5 contre 5 après une baisse automatique,
    // 1,4 à 1,7 s d'image figée à chaque appui sur la touche caméra, la qualité remontée d'un cran et la mesure automatique
    // relancée (puis la baisse, et ses recompilations, recommençait). On compare aux réglages déjà appliqués ; ce qui ne
    // touche pas au rendu (météo, compteur, champ de vision, images par seconde au plus) n'y entre pas.
    const { weather, fps, fov, fpsMax, ...rendu } = s.graphics;
    const cle = JSON.stringify(rendu);
    if (cle !== this._cleRendu) { this._cleRendu = cle; this.fx.applyGraphics(s.graphics); }
    // (et la météo : repasser 'auto' relançait un changement de temps 8 s plus tard)
    if (this.weather && (weather || 'auto') !== this._modeMeteo) { this._modeMeteo = weather || 'auto'; this.weather.setMode(this._modeMeteo); }
    this.input.setBindings(s.bindings);
    this.hud.fps(s.graphics.fps);
    this.matchFov = s.graphics.fov || 46;
    // Distance de camera choisie dans les options : bornee ici, pour qu'un fichier de reglages abime ne
    // puisse pas coller la camera dans le dos du joueur ni l'envoyer a l'autre bout du quartier.
    this.camDist = Math.max(0.6, Math.min(1.6, (s.game && s.game.camDist) || 1));
    if (this.mode === 'match') { this.camera.fov = this.matchFov; this.camera.updateProjectionMatrix(); }
    if (this.mode === 'lobby' || this.mode === 'match') this.hud.setLobby(this.mode === 'lobby', this.teamSize);
  }

  _buildRing() {
    const g = new THREE.Group(); g.position.set(RING.x, 0.015, RING.z);
    const ring = new THREE.Mesh(new THREE.RingGeometry(RING.r - 0.3, RING.r, 48),
      new THREE.MeshBasicMaterial({ color: 0x3d9bff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; g.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(RING.r - 0.3, 48),
      new THREE.MeshBasicMaterial({ color: 0x3d9bff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; g.add(disc);
    // LE FAISCEAU EST EN FRONTSIDE, ET C'EST TOUT L'INTERET. En DoubleSide, des que le joueur entrait dans
    // le cercle la camera se retrouvait DANS le cylindre : on voyait alors sa paroi opposee en plein ecran,
    // et tout le terrain passait derriere un voile bleu — le noir de la fresque virait au bleu, le rouge au
    // rose. En FrontSide, les faces vues de l'interieur pointent a l'oppose et disparaissent : le faisceau
    // ne se voit plus que du dehors, ce qui est exactement son role.
    //
    // UN HALO, PLUS UNE VITRINE (30/09). L'ancien faisceau montait a 3,5 m en aplat bleu, non eclaire, avec
    // une arete nette en haut : en entrant en balade, le joueur apparait en z = 3,5 face au cercle, et ce
    // cylindre se posait PILE entre la camera et le panneau — un tube de verre devant le panier, la
    // premiere chose qu'on voyait en jouant. Il reste (c'est le point de rendez-vous du match en ligne,
    // on le repere de loin), mais :
    //   - il ne monte plus qu'a 1,6 m : la ligne de visee de la camera de balade (2,4 m) vers le panneau
    //     (3 a 4 m) passe au-dessus, le panneau n'est plus voile du tout ;
    //   - il s'efface vers le haut, (1 - v)², au lieu de s'arreter sur une arete ;
    //   - il est ADDITIF et plus fort sur les bords (terme de Fresnel, 1 - |N·V|) : une lueur qui dessine
    //     le cylindre par sa silhouette, pas un voile qui teinte ce qu'il y a derriere. Au centre, face a la
    //     camera, il ne reste que 35 % de l'intensite.
    // `uOpacite` reprend l'animation d'avant (updateLobby) : 0,08 ± 0,05 hors du cercle, 0,3 dedans.
    // (couleur du faisceau convertie en lineaire par THREE.Color, comme les autres materiaux : le rendu passe
    // par la cible lineaire du composer, l'OutputPass fait le reste)
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(RING.r - 0.15, RING.r - 0.15, 1.6, 40, 1, true),
      new THREE.ShaderMaterial({
        uniforms: { uCouleur: { value: new THREE.Color(0x6fb8ff) }, uOpacite: { value: 0.08 } },
        vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
          void main() {
            vUv = uv;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `uniform vec3 uCouleur; uniform float uOpacite; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
          void main() {
            float bas = 1.0 - vUv.y;                                   // 1 au sol, 0 en haut
            float bord = 1.0 - abs(dot(normalize(vN), normalize(vV)));
            gl_FragColor = vec4(uCouleur, bas * bas * (0.35 + 0.65 * bord * bord) * uOpacite);
          }`,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
        fog: false, toneMapped: false,
      }));
    beam.position.y = 0.8; g.add(beam);
    // Hors de la passe de normales de l'occlusion (drapeau lu par js/fx.js) : un voile additif n'occulte rien,
    // et sa paroi y ecrivait une profondeur — une bande sombre autour du cercle en haute et au-dessus.
    beam.userData.sansNormales = ring.userData.sansNormales = disc.userData.sansNormales = true;
    g.userData = { ring, disc, beam }; g.visible = false;
    this.scene.add(g);
    return g;
  }

  // anneau sous le joueur contrôlé (modes en équipe) + petit repère au-dessus
  _buildMarker() {
    const g = new THREE.Group(); g.visible = false;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 40),
      new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 4), new THREE.MeshBasicMaterial({ color: 0xff7a1a, depthWrite: false }));
    arrow.rotation.x = Math.PI; g.add(arrow); g.userData = { ring, arrow };
    this.scene.add(g);
    // LES ANNEAUX D'EQUIPE (30/09). En 2 contre 2 et au-dela, rien ne distinguait les deux camps : chacun
    // garde les vetements de son avatar, et en 3v3 par defaut Haythem et Haris, adversaires, portent le meme
    // t-shirt noir. On ne savait pas a qui passer. Un anneau fin au sol sous chaque joueur, aux couleurs
    // du HUD : ORANGE pour l'equipe A (la sienne), BLEU pour l'equipe B. Plus fin, plus pale et immobile que
    // l'anneau du joueur controle, qui reste le seul a battre : on lit les equipes sans que le sol clignote.
    // Le joueur controle n'a pas le sien, son grand anneau le remplace. Transparents, ils restent hors de
    // la couche des ombres de contact (js/ombres_contact.js) ; dix petits maillages, cout nul.
    const geoEq = new THREE.RingGeometry(0.34, 0.40, 40).rotateX(-Math.PI / 2);
    const matEq = [0xff7a1a, 0x4aa3ff].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35, depthWrite: false }));
    this.anneauxEquipe = Array.from({ length: 10 }, () => {
      const m = new THREE.Mesh(geoEq, matEq[0]); m.visible = false; m.renderOrder = 1;
      this.scene.add(m); return m;
    });
    this._matsEquipe = matEq;
    return g;
  }

  // Pose les anneaux d'equipe sous les joueurs (appele par updateMarker, a chaque image). `montrer` suit la
  // meme regle que l'anneau du joueur controle : en match, en equipe, tant que la partie n'est pas finie.
  majAnneauxEquipe(montrer) {
    const A = this.anneauxEquipe; if (!A) return;
    let n = 0;
    if (montrer) {
      for (const p of this.players) {
        if (n >= A.length) break;
        // (ni sous un joueur dont l'avatar se charge encore : il est invisible, js/player.js, et l'anneau
        // tournerait seul sur l'enrobé)
        if (p === this.user || !p.mesh.visible || (!p.avatarModel && !p.body.visible)) continue;
        const m = A[n++];
        m.material = this._matsEquipe[p.team === 0 ? 0 : 1];
        m.position.set(p.posAff.x, (p.solAff || 0) + 0.018, p.posAff.z);
        m.visible = true;
      }
    }
    for (; n < A.length; n++) A[n].visible = false;
  }

  // Compile en parallèle (KHR_parallel_shader_compile) les programmes de `o` tels qu'ils serviront : pour la cible où
  // la scène est dessinée — celle du post-traitement (flottante), ou l'écran quand il est coupé. Compilés pour une
  // autre cible, three recompilerait la bonne variante d'un bloc au premier dessin (voir js/monde_vegetation.js).
  // (`scene`, `ecran`, `camera` : ceux d'une passe annexe pour ses propres programmes — voir _compilerTout)
  _compilerAsync(o, scene = this.scene, ecran = this.fx && this.fx.enabled === false, camera = this.camera) {
    const r = this.renderer;
    if (!r || !r.compileAsync) return null;
    const cible = ecran ? null
      : (this._cibleCompil || (this._cibleCompil = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })));
    const avant = r.getRenderTarget();
    try { r.setRenderTarget(cible); return r.compileAsync(o, camera, scene).catch(() => {}); }
    catch (e) { return null; } finally { r.setRenderTarget(avant); }
  }
  // Le rendu de `o` ET ses programmes des passes annexes, tels que three les y dessine : la carte d'ombre
  // (js/ombre_cache.js avecProfondeur : sans scène — ni brouillard ni environnement —, dans une cible) et, pour ce qui
  // bouge (`mobile` : un avatar), la carte des ombres de contact (js/ombres_contact.js avecContact, avec sa caméra).
  // Mesuré à la première image d'un 5 contre 5 : 11 programmes compilés d'un bloc, 2 s d'image figée. Prêt quand tout
  // l'est.
  _compilerTout(o, mobile = false) {
    const so = this._sceneOmbre || (this._sceneOmbre = sceneOmbre(this.scene));
    // (la scène entière se compile par sa doublure `so` : passée elle-même, three comptait ses lumières deux fois)
    const p = [this._compilerAsync(o), avecProfondeur(o, (x) => this._compilerAsync(x === this.scene ? so : x, so, false))];
    if (mobile) p.push(this.ombres.avecContact(o, (x, cam) => this._compilerAsync(x, this.scene, false, cam)));
    const prets = p.filter(Boolean);
    return prets.length > 1 ? Promise.all(prets) : prets[0] || null;
  }
  // LE DÉCOR PRÉCHAUFFÉ (04/10/2026). Chaque objet du décor (arbres, poubelles, voitures, passants, poteaux...) a ses
  // programmes, compilés la première fois que la caméra le voit : en passant du menu au choix du joueur, l'image se
  // figeait 0,6 à 0,9 s sur PC (vingt-sept programmes d'un coup), plusieurs secondes sur un téléphone. On les fait
  // compiler en parallèle pendant le menu, à quelques reprises puisque les modèles arrivent au fil de l'eau
  // (PRECHAUFFE, en secondes hors match). Ce qui est déjà compilé ne coûte que le parcours de la scène.
  // (06/10/2026 : et les variantes du préréglage de repli, que la première baisse automatique compilait d'un bloc — js/fx.js
  // avecRepli)
  prechaufferScene() { this._compilerTout(this.scene); this.fx.precompilerRepli(); }

  // IMAGES PAR SECONDE AU PLUS (04/10/2026, réglage graphics.fpsMax). Un téléphone à écran 90 ou 120 Hz calculait 90 ou 120
  // images par seconde : deux fois le travail utile, le téléphone chauffait, se bridait au bout de quelques minutes, et
  // le jeu se mettait à saccader. AUTO = 60 au téléphone, sans limite ailleurs. 0 = sans limite.
  fpsMax() {
    const v = String((this.settings && this.settings.graphics && this.settings.graphics.fpsMax) || 'auto');
    if (v === 'auto') return this.fx && this.fx.dev && this.fx.dev.telephone ? 60 : 0;
    return Math.max(0, Number(v) || 0);
  }

  start() {
    if (this._raf) return;
    this.clock.start();
    let prochain = 0;
    const loop = (t = performance.now()) => {
      this._raf = requestAnimationFrame(loop);
      // la limite : une ÉCHÉANCE qui avance d'une période à chaque image rendue ; une image en avance (2 ms de marge) est
      // sautée. Simulé sur des écrans de 60 à 165 Hz : 60,0 et 30,0 im/s tout juste (un écran à 90 Hz limité à 60 rend
      // deux images sur trois — pas une sur deux). Après un décrochage, l'échéance repart de l'image en cours.
      const cap = this.fpsMax();
      this.fx.periodeCap = cap > 0 ? 1000 / cap : 0;     // (la période tenue, pour la remontée de la qualité : js/fx.js _remonter)
      if (cap > 0) {
        const periode = 1000 / cap;
        if (t < prochain - 2) return;
        prochain = Math.max(prochain + periode, t - periode / 2);
      }
      const dt = Math.min(this.clock.getDelta(), 0.05); this.frame(dt);
    };
    loop();
  }

  dispose() {
    cancelAnimationFrame(this._raf); this._raf = null;
    clearTimeout(this._resizeT);
    const canvas = this.renderer.domElement;
    window.removeEventListener('resize', this._onResize);
    canvas.removeEventListener('click', this._onClick);
    canvas.removeEventListener('mousedown', this._onDown);
    window.removeEventListener('mouseup', this._onUp);
    window.removeEventListener('mousemove', this._onMove);
    this._btnPlay.onclick = null; this._btnPlay.hidden = true;
    if (document.pointerLockElement === canvas) document.exitPointerLock?.();
    this.input.dispose(); this.hud.hide(); hideOverlay(); this.wheel.dispose();
    this.audio.setCrowd(0);
    this.fx.composer.dispose?.(); this.renderer.dispose(); canvas.remove();
  }

  // ---------- joueurs : création / retrait ----------
  _removePlayer(p) { p.disposed = true; this.scene.remove(p.mesh); this.ais.delete(p); }
  clearPlayers(keep = null) {
    for (const p of this.players) if (p !== keep) this._removePlayer(p);
    this.players = keep ? [keep] : [];
    this.teams[0].players = keep ? [keep] : []; this.teams[1].players = [];
    this.marks.clear(); this.preview = null;
    if (!keep) { this.user = null; this.captain = null; }
  }
  _newPlayer(def, teamId, idx) {
    const p = new Player(def, this.scene, teamId === 0 && idx === 0);
    p.badgeFx = badgeFx(def.badges);        // capacités signature ; celles du joueur s'ajoutent dans applyShop
    p.team = teamId; p.slot = idx; p.hoop = this.teams[teamId].hoop; p.bounds = this.bounds || BOUNDS;
    this.ais.set(p, new AIController(this, p, teamId === 1 ? this.diff : DIFFICULTY.normal));
    return p;
  }
  // compose les deux équipes d'un match ; le capitaine déjà sur le terrain (balade) est réutilisé (pas de rechargement)
  setup(opts) {
    this.lacherVeloLocal();
    this.opts = { difficulty: 'normal', target: 11, ...opts };
    this.diff = DIFFICULTY[this.opts.difficulty] || DIFFICULTY.normal;
    const teamA = opts.teamA, teamB = opts.teamB;
    // graine transmise par le salon en ligne : tous les clients simulent alors la même partie
    if (opts.seed !== undefined) this.rng.seed(opts.seed >>> 0);
    this.teamSize = Math.max(1, Math.min(5, teamA.length, teamB.length));
    // demi-terrain : les deux équipes attaquent le panier A et restent dans sa moitié
    this.half = !!this.opts.half;
    this.teams[0].hoop = HOOP_VEC[0];
    this.teams[1].hoop = this.half ? HOOP_VEC[0] : HOOP_VEC[1];
    // match en ligne vu depuis l'équipe 1 de l'hôte : chez cet invité, son équipe (l'équipe 0 locale)
    // attaque le panier d'en face (voir js/enligne.js, « le miroir »)
    if (opts.miroir && !this.half) { this.teams[0].hoop = HOOP_VEC[1]; this.teams[1].hoop = HOOP_VEC[0]; }
    this.bounds = this.half ? HALF_BOUNDS : BOUNDS;
    const keep = this.captain && this.captain.baseDef === teamA[0] ? this.captain : null;
    this.clearPlayers(keep);
    this.teams[0].name = (opts.names && opts.names[0]) || (this.teamSize === 1 ? teamA[0].name : 'BÉCON');
    this.teams[1].name = (opts.names && opts.names[1]) || (this.teamSize === 1 ? teamB[0].name : 'VISITEURS');
    this.teams[0].players = []; this.teams[1].players = []; this.players = []; this.ais.clear();
    const used = new Map();
    // MÊME FICHE DÉJÀ SUR LE TERRAIN : « (bis) », et elle GARDE SON AVATAR 3D. Recette finale (A5) : on lui retirait son
    // modèle (« un seul GLB par fiche »), si bien qu'en ligne, où tout le monde commence avec Haythem, chacun voyait
    // l'autre en bonhomme de primitives. Ce n'est plus vrai : _loadAvatar (js/player.js) clone le squelette ET les
    // matériaux de chaque avatar, et le hub (js/presence.js) montre déjà deux Haythem côte à côte. Un doublon ne coûte
    // pas plus qu'un autre avatar (un 5 contre 5 mélangé en compte déjà dix). Pour qu'on les distingue, le doublon
    // enfile un survêtement de la boutique (`fit` de la fiche : peint par le shader de js/fit.js, aucun fichier en plus,
    // posé tout seul à la fin du chargement), pris parmi ceux que TU ne portes pas. Les couleurs inversées ne servent
    // plus qu'au bonhomme de secours (fiche sans avatar, ou avatar qui ne charge pas).
    const porte = this.wallet && this.wallet.equipped('outfit');
    const kits = ['fit_quai', 'fit_becon', 'fit_grillage', 'fit_bitume'].filter((id) => id !== porte);
    const makePlayer = (def, teamId, idx) => {
      let d = def; const n = used.get(def.id) || 0; used.set(def.id, n + 1);
      if (n > 0) {
        const kit = SKINS.find((s) => s.id === kits[(n - 1) % kits.length]);
        d = { ...def, color1: def.color2, color2: def.color1, name: def.name + (n === 1 ? ' (bis)' : ` (${n + 1})`), fit: (kit && kit.fit) || def.fit };
      }
      // modes en équipe : maillots aux couleurs du capitaine (bonshommes procéduraux ; les avatars 3D gardent leurs vêtements)
      if (this.teamSize > 1) { const cap = teamId === 0 ? teamA[0] : teamB[0]; d = { ...d, color1: cap.color1, color2: cap.color2 }; }
      let p;
      if (keep && teamId === 0 && idx === 0) { p = keep; p.team = 0; p.slot = 0; p.hoop = this.teams[0].hoop; p.bounds = this.bounds; p.speedMul = 1; this.ais.set(p, new AIController(this, p, DIFFICULTY.normal)); }
      else p = this._newPlayer(d, teamId, idx);
      if (teamId === 1) p.speedMul = this.diff.speed;
      p.baseDef = def;
      this.teams[teamId].players.push(p); this.players.push(p);
      return p;
    };
    for (let i = 0; i < this.teamSize; i++) makePlayer(teamA[i], 0, i);
    for (let i = 0; i < this.teamSize; i++) makePlayer(teamB[i], 1, i);
    this.user = this.captain = this.teams[0].players[0];
    this.hud.setNames(this.teams[0].name, this.teams[1].name);
  }

  // ---------- équipes : utilitaires ----------
  teamOf(p) { return this.teams[p.team]; }
  teammates(p) { return this.teams[p.team].players; }
  opponents(p) { return this.teams[1 - p.team].players; }
  nearestOpponent(p) {
    let best = null, bd = Infinity;
    for (const o of this.opponents(p)) { const d = hdist(o.pos, p.pos); if (d < bd) { bd = d; best = o; } }
    return best;
  }
  // rang de `p` parmi ses coéquipiers par distance à la balle (0 = le plus proche)
  rankToBall(p) { const d = hdist(p.pos, this.ball.pos); let r = 0; for (const m of this.teammates(p)) if (m !== p && hdist(m.pos, this.ball.pos) < d) r++; return r; }
  rankToHoop(p, hoop) { const d = hdist(p.pos, hoop); let r = 0; for (const m of this.teammates(p)) if (m !== p && hdist(m.pos, hoop) < d) r++; return r; }
  markOf(defender) { return this.marks.get(defender) || null; }
  // marquage homme à homme : le défenseur le plus proche du porteur le prend, les autres gardent l'attaquant le plus proche restant
  updateMarks() {
    this.marks.clear();
    const off = this.teams[this.offense], def = this.teams[1 - this.offense], holder = this.ball.holder;
    const freeA = [...off.players], freeD = [...def.players];
    if (holder && holder.team === this.offense) {
      let best = null, bd = Infinity;
      for (const d of freeD) { const dd = hdist(d.pos, holder.pos); if (dd < bd) { bd = dd; best = d; } }
      if (best) { this.marks.set(best, holder); freeD.splice(freeD.indexOf(best), 1); freeA.splice(freeA.indexOf(holder), 1); }
    }
    for (const d of freeD) {
      let best = null, bd = Infinity;
      for (const a of freeA) { const dd = hdist(d.pos, a.pos); if (dd < bd) { bd = dd; best = a; } }
      if (best) { this.marks.set(d, best); freeA.splice(freeA.indexOf(best), 1); }
    }
  }

  // ---------- modes ----------
  // fond du menu : terrain vide, caméra cinématique
  enterMenu() {
    this.lacherVeloLocal();
    this.quitterEnLigne();
    this.mode = 'menu'; this.state = 'playing'; this.paused = false; this.setupOpen = false; hideOverlay(); this.wheel.close();
    this.training.stop(); this.training.ring.visible = false;
    this.presence.setVisible(false);
    if (document.pointerLockElement) document.exitPointerLock?.();
    this.clearPlayers();
    this.pendingShot = null; this.ring.visible = false; this.marker.visible = false; this.marqueMarchand(false); this.nearMerchant = false;
    this.annulerPasseArmee();
    this.ball.hold(null); this.ball.mesh.visible = false; this.ball.setFire(false);
    this.hud.hide(); this.input.blocked = false;
    this.resetMomentum(); this.audio.setCrowd(0);
    this.camera.fov = 50; this.camera.updateProjectionMatrix();
    this.menuT = Math.random() * 100;
  }

  // écran de sélection : le joueur choisi seul au centre du terrain, balle en main, caméra qui tourne autour
  showPreview(def) {
    if (this.mode !== 'select') { this.mode = 'select'; this.selectT = 0; this.camera.fov = 42; this.camera.updateProjectionMatrix(); hideOverlay(); this.hud.hide(); }
    if (this.preview && this.preview.baseDef === def) return;
    this.lacherVeloLocal();
    this.clearPlayers();
    const p = this._newPlayer(def, 0, 0); p.baseDef = def;
    p.pos.set(0, 0, 0); p.facing.set(0, 0, 1); p.bounds = this.yard;
    this.players = [p]; this.teams[0].players = [p]; this.preview = p; this.user = p; this.captain = p;
    this.ball.hold(p); this.ball.mesh.visible = true; this.ring.visible = false;
  }

  // balade libre avec le joueur de l'aperçu (ou le capitaine actuel)
  enterLobby() {
    if (!this.captain) return;
    this.lacherVeloLocal();
    for (const b of this.velos) b.racine.visible = true;
    this.quitterEnLigne();
    this.training.ring.visible = true;
    this.presence.setVisible(true);
    // Les boosts de nourriture ne sautaient qu'à la fin d'un match gagné ou perdu au score : manger un kebab
    // puis quitter le match le gardait indéfiniment. Quitter un match consomme maintenant le boost.
    if (this.mode === 'match') { this.wallet.clearBoosts(); this.applyShop(); }
    this.mode = 'lobby'; this.state = 'playing'; this.paused = false; this.setupOpen = false; hideOverlay(); this.wheel.close();
    this.fx.reAdapter();          // l'œil repart de la vue de balade, pas de celle du menu (js/fx.js)
    this.pendingShot = null; this.triggerT = 0; this.ringArmed = true; this.ring.visible = true; this.marker.visible = false;
    this.annulerPasseArmee();
    this.user = this.captain; this.preview = null;
    for (const p of this.players) if (p !== this.user) { p.mesh.visible = false; p.pos.set(0, 0, 60 + p.slot * 2); p.state = 'idle'; p.airborne = false; p.jumpY = 0; }
    const u = this.user;
    u.mesh.visible = true; u.stopEmote();
    for (const p of this.players) p.souffleDistant = false;   // reçu de l'hôte pendant un match en ligne
    u.bounds = this.yard; u.pos.set(0, Monde.sol(0, 3.5), 3.5); u.setFacing(0, -1); u.hoop = HOOP_VEC[0];
    u.state = 'idle'; u.airborne = false; u.jumpY = 0; u.jumpVel = 0; u.windup = 0; u.stun = 0; u.spinT = 0; u.crossT = -1; u.released = false; u.defending = false;
    this.ball.hold(u); this.ball.mesh.visible = true;
    this.camYaw = 0; this.camPitch = 0.22;
    this.camera.fov = 58; this.camera.updateProjectionMatrix();
    this.camPos.set(u.pos.x, 2.4 + u.pos.y, u.pos.z + 4.3); this.camera.position.copy(this.camPos); this.lookCur.set(u.pos.x, 1.4 + u.pos.y, u.pos.z);
    this.resetMomentum();
    this.hud.show(); this.hud.setLobby(true, 1); this.hud.meter(false);
    this.hud.feedback('BALADE LIBRE', 'info'); this.hud.hint(this.lobbyHint());
    this.hud.possession(this.practice ? `Paniers en balade : ${this.practice}` : '', false);
    this.marqueMarchand(true); this.nearMerchant = false;
    this.applyShop();
    this.input.pressed('interact');   // (relecture C4) ENTRÉE tapée en match ne sort pas le skate du sac au retour en balade
    this.input.blocked = false;
  }

  veloHint() {
    // (lot C4) sur une trottinette ou un skate, l'aide de l'engin
    const E = this.user && this.user.velo && this.user.velo.v;
    if (E && E.aide) return manetteActive() ? E.aideManette(actionKey) : E.aide(false, IS_TOUCH, actionKey);
    if (manetteActive()) return aideVelo();
    if (IS_TOUCH) return 'à vélo · joystick : haut = pédaler, bas = freiner, côtés = tourner, au bord = en danseuse · SONNETTE · DESCENDRE';
    return `à vélo · ${actionKey('forward')} = pédaler · ${actionKey('back')} = freiner / reculer · ${actionKey('left')} ${actionKey('right')} = tourner · ${actionKey('sprint')} = en danseuse · ${actionKey('shoot')} = sonnette · ${actionKey('interact')} = descendre`;
  }

  lobbyHint() {
    if (this.user && this.user.velo && !this.user.velo.sortir) return this.veloHint();
    // Le rappel de la boutique ne s'affiche que là où il y a quelqu'un pour la tenir.
    // Au doigt, la moitie du bandeau expliquait des touches de clavier qu'on n'a pas : « souris = camera,
    // ALT = marcher, ESPACE = tirer ». Sur telephone on nomme donc les commandes qui sont VRAIMENT a l'ecran.
    // (le nom est celui du marchand de CE terrain : pas « Pierrick » ailleurs qu'à La Cage)
    let boutique = this.sansMarchand ? `${actionKey('pause')} = pause · boutique` : `${actionKey('interact')} près de ${this.nomMarchand} = boutique`;
    // (lot C4) l'engin du sac : la même touche le sort quand rien d'autre n'est à portée
    if (this._enginDispo && this.enginPerso) boutique = `${actionKey('interact')} = sortir ${this.enginPerso.genre === 'skate' ? 'ton skate' : 'ta trottinette'} · ${boutique}`;
    const base = manetteActive() ? aideBalade(boutique) : IS_TOUCH
      // (le joystick flottant apparaît sous le pouce gauche : js/touch.js)
      ? (this.sansMarchand ? 'pouce à gauche = joystick (effleure : marcher, au bord : sprint) · glisse à droite = caméra · boutique dans le menu pause'
        : `pouce à gauche = joystick (effleure : marcher, au bord : sprint) · glisse à droite = caméra · près de ${this.nomMarchand}, PARLER ouvre la boutique`)
      : `souris = caméra · ${actionKey('camera')} = vue (3e / épaule / 1re personne) · ${actionKey('walk')} = marcher · ${actionKey('shoot')} = tirer · ${actionKey('emote')} = emotes · ${boutique}`;
    if (this.online) {
      // « tu es seul pour l'instant » etait rassurant et faux : c'etait souvent l'affichage d'une panne. Le
      // bandeau lit maintenant l'etat REEL du transport. (LocalTransport a toujours open=true : c'est `url`
      // qui distingue un vrai serveur d'un salon local.)
      const tr = this.online.tr;
      if (!tr || !tr.url) return `HORS LIGNE · aucun terrain partagé, personne ne peut te rejoindre · ${base}`;
      if (!tr.open) return `LIAISON COUPÉE avec ${tr.url} · tes amis ne te voient pas · le jeu réessaie tout seul · ${base}`;
      const n = this.presence.count;
      return `EN LIGNE · ${n ? `${n} autre${n > 1 ? 's' : ''} joueur${n > 1 ? 's' : ''} sur le terrain` : 'tu es seul pour l\'instant'} · ${n ? 'bouton JOUER AVEC… en haut (ou le cercle bleu) : tout le monde est invité' : 'entre dans le cercle bleu pour lancer un match'} · ${base}`;
    }
    return `Balade libre · entre dans le cercle bleu pour choisir un match · ${base}`;
  }

  // Repère flottant du marchand. Passe par ici plutôt que par `merchantMark.userData.tag` en direct : sur un
  // terrain sans marchand il n'y a ni PNJ ni repère, et les quatre accès directs plantaient au changement de
  // mode.
  marqueMarchand(v) { if (this.merchantMark) this.merchantMark.userData.tag.visible = v; }

  // PNJ marchand : reste à son étal (animation d'attente), repère flottant en balade
  updateMerchant(dt) {
    const m = this.merchant; if (!m || this.paused) return;
    m.hasBall = false; m.defending = false;
    m.move(ZERO, false, dt); m.update(dt);
    const tag = this.merchantMark.userData.tag;
    if (tag.visible) tag.position.y = this.tagMarchandY + 0.06 * Math.sin(performance.now() * 0.0025);
  }

  // boutique : boosts de nourriture sur la fiche du capitaine (stats +, sprint moins usant), skins (ballon, tenue), pièces
  // LA TENUE QUI VOYAGE (04/10/2026). Les objets de la boutique portés par le joueur — tenue, chaussures, coiffure —
  // tiennent en trois identifiants. Ils partent dans les paquets du hub (Presence.emit, `tn`) et dans l'annonce d'un
  // match en ligne (`humains[].tn`) : avant, les autres voyaient toujours la tenue d'origine de la fiche, et même un
  // autre modèle 3D quand la tenue en change. Un identifiant inconnu (objet d'une version plus récente) ne casse
  // rien : il retombe sur la tenue de la fiche.
  tenueIds() {
    const w = this.wallet;
    return [w.equipped('outfit') || null, w.equipped('shoes') || null, w.equipped('chef') || null];
  }
  // Habille le joueur `p` (le sien ou un joueur distant) avec les objets `ids` (voir tenueIds), sur la fiche `base`.
  static habiller(p, ids, base = p.baseDef || p.def) {
    const [oid, sid, cid] = Array.isArray(ids) ? ids : [];
    const o = SKINS.find((s) => s.id === oid) || null;
    const sh = SKINS.find((s) => s.id === sid) || null;
    const want = o && o.model ? o.model : (base.model || null);
    if ((p.avatarUrl || null) !== want) p.setAvatar(want, o && o.model ? o.modelHeight : base.modelHeight);
    // tenue + chaussures : les chaussures écrasent celles de la tenue si les deux sont équipées
    // UN SEUL appel, toutes les pieces fusionnees : applyOutfit remet a l'origine toute partie ABSENTE
    // de l'objet, donc deux appels successifs effaceraient le premier.
    const cf = SKINS.find((s) => s.id === cid) || null;
    p.applyOutfit({ look: o && o.look,
                    hair: (cf && cf.hair) || (o && o.hair),     // la couleur de cheveux du rayon prime
                    shoes: (sh && sh.shoes) || (o && o.shoes),
                    fit: (o && o.fit) || base.fit || null,   // a defaut, la tenue de la fiche
                    coif: (cf && cf.coif) || null });
  }

  applyShop() {
    const w = this.wallet, u = this.captain;
    this.ball.setSkin(SKINS.find((s) => s.id === w.equipped('ball')) || null);
    if (u) {
      // fiche = base + progression (permanente) + nourriture (jusqu'à la fin du prochain match)
      const b = w.bonus(), up = w.upBonus(), base = u.baseDef, d = { ...base };
      for (const [k] of UP_STATS) { const add = (up[k] || 0) + (b[k] || 0); if (add) d[k] = Math.min(99, base[k] + add); }
      u.def = (Object.keys(b).length || Object.keys(up).length) ? d : base;
      u.staminaMul = b.sta ? Math.max(0.5, 1 - b.sta / 100) : 1;
      Game.habiller(u, this.tenueIds(), base);
      // (lot C4) LA GLISSE : les rollers chaussés (en balade seulement, js/rollers.js) et l'engin qu'on sort du sac
      const ro = SKINS.find((s) => s.id === w.equipped('rollers'));
      u.rollers = ro && ro.couleur ? { couleur: couleurDe(ro.couleur, 0x1c1d21) } : null;
    }
    const en = SKINS.find((s) => s.id === w.equipped('engin'));
    this.enginPerso = en && en.genre ? en : null;
    this.wheel.setList(roueEmotes(w));                     // la roue ne montre que les emotes mises sur la roue
    this.hud.coins(w.coins, w.boostText());
    // capacités : signature de la fiche + celles débloquées par le joueur avec ses points d'entraînement
    for (const p of this.players) {
      const perso = p === this.captain || p === this.user;
      // capacités du personnage = sa signature + celles gagnées en DOUBLON dans les vœux ; pour le joueur
      // contrôlé s'y ajoutent celles achetées avec ses points d'entraînement.
      const sig = (p.baseDef && p.baseDef.badges) || p.def.badges;
      const avecDoublons = Game.mergeBadges(sig, this.wallet.plusPerso((p.baseDef || p.def).id));
      p.badgeFx = badgeFx(perso ? Game.mergeBadges(avecDoublons, this.wallet.badges()) : avecDoublons);
    }
  }


  // ---------- emotes (roue) ----------
  // T ouvre la roue ; maintenir + souris puis relâcher, ou touches 1-8, ou clic. Retourne true si la touche pause a été « mangée ».
  updateEmoteInput(dt) {
    const inp = this.input, w = this.wheel;
    if (this.paused || this.state === 'over' || this.setupOpen || (this.mode !== 'lobby' && this.mode !== 'match')) { if (w.isOpen) w.close(); return false; }
    if (inp.pressed('emote')) {
      if (w.isOpen) w.close();
      else if (this.canEmote()) { w.open(); this.wheelHold = 0; }
      else this.hud.hint(this.ball.holder === this.user && this.mode === 'match' ? 'Pas d\'emote balle en main pendant un match' : 'Emote impossible pour l\'instant');
    }
    if (!w.isOpen) return false;
    this.wheelHold += dt;
    // `hovered` est pilote par mousemove et mouseenter : au doigt il vaut TOUJOURS null. Tester la duree
    // d'abord et le survol ensuite fermait donc la roue a vide des qu'on maintenait le bouton plus de 0,3 s
    // — c'est-a-dire a chaque fois qu'on prend le temps de choisir. En mettant le survol DANS la condition,
    // un appui long laisse simplement la roue ouverte, et on tape le secteur voulu.
    if (inp.released('emote') && this.wheelHold > 0.3 && w.hovered !== null) { this.doEmote(w.hovered); w.close(); return false; }
    // La borne etait EMOTES.length, donc la boucle testait « Digit10 », « Digit11 »... qui n'existent pas
    // comme codes clavier : au-dela de la neuvieme emote elle tournait dans le vide. Avec la roue plafonnee
    // a huit emplacements, la borne devient exacte et les touches 1 a 8 marchent toutes.
    const nk = Math.min(9, (w.emotes || []).length);
    for (let i = 1; i <= nk; i++)
      if (inp.keyPressed('Digit' + i) || inp.keyPressed('Numpad' + i)) { this.doEmote(i - 1); w.close(); return false; }
    if (inp.pressed('pause')) { w.close(); return true; }
    return false;
  }
  canEmote() {
    const u = this.user; if (!u) return false;
    if (u.state !== 'idle' || u.airborne || u.stun > 0 || u.emote || u.velo) return false;
    if (this.mode === 'match' && (this.state !== 'playing' || this.ball.holder === u)) return false;
    return true;
  }
  doEmote(i) {
    // l'index vient de la roue, qui ne contient que les emotes possédées (pas la liste complète)
    const e = (this.wheel.emotes || EMOTES)[i], u = this.user;
    if (!e || !this.canEmote()) return;
    if (this.ball.holder === u) {
      // balade : on pose la balle devant soi
      const b = this.ball, f = u.facing;
      b.state = 'loose'; b.holder = null; b.shot = null; b.pass = null; b.lastTouch = u;
      b.vel.set(f.x * 0.8, 0.6, f.z * 0.8); b.touchedFloor = false;
    }
    if (u.startEmote(e)) { this.hud.streak(`${e.icon} ${e.label.toUpperCase()}`); if (this.mode === 'lobby') this.hud.hint(`${e.label} · bouge pour arrêter`); }
  }

  // ---------- match ----------
  startMatch(opts = null) {
    if (this.mode === 'match') return;
    this.lacherVeloLocal();
    if (opts) this.setup(opts);
    // un vélo laissé SUR le terrain disparaît le temps du match : les joueurs le traverseraient
    for (const b of this.velos) b.racine.visible = !this.veloSurTerrain(b);
    if (!this.teams[1].players.length) return;
    this.mode = 'match'; this.paused = false; this.setupOpen = false; hideOverlay(); this.wheel.close();
    this.fx.reAdapter();          // idem pour la caméra de match
    this.training.stop(); this.training.ring.visible = false;   // ni cercle orange ni anneaux verts en match
    this.presence.setVisible(false);                            // les joueurs du hub n'entrent pas sur le terrain du match
    if (document.pointerLockElement) document.exitPointerLock?.();
    this.ring.visible = false; this.triggerT = 0; this.marqueMarchand(false); this.nearMerchant = false;
    this.applyShop();
    for (const p of this.players) { p.mesh.visible = true; p.bounds = BOUNDS; p.hoop = this.teams[p.team].hoop; p.stopEmote(); }
    this.teams[0].score = 0; this.teams[1].score = 0; this.hud.setScore(0, 0);
    this.ball.mesh.visible = true;
    this.camera.fov = this.matchFov || 46; this.camera.updateProjectionMatrix();
    this.resetMomentum();
    this.hud.show(); this.hud.setNames(this.teams[0].name, this.teams[1].name); this.hud.setLobby(false, this.teamSize); this.hud.hint('');
    this.resetPossession(0);
    this.state = 'countdown'; this.stateT = 3.4; this.lastCount = -1;
    this.pendingOffense = 0; this.pendingFromZ = null;
    this.audio.whistle();
    const label = this.teamSize === 1 ? '1 CONTRE 1' : `${this.teamSize} CONTRE ${this.teamSize}`;
    this.hud.streak(`${label} · ${this.opts.target} POINTS`);
    this.input.blocked = false;
  }

  frame(dt) {
    this.fx.debutImage?.();                          // (le temps du processeur pour cette image : js/fx.js _cout)
    // (iPhone : « tourne ton téléphone » en jeu tenu en portrait, voir #tourner dans index.html)
    const enJeu = this.mode === 'lobby' || this.mode === 'match';
    if (enJeu !== this._enJeu) { this._enJeu = enJeu; document.body.classList.toggle('en-jeu', enJeu); }
    this.input.scruter(this, dt);                    // manette : boutons -> codes « Pad:… », sticks, menus (js/manette.js)
    this.audio.setListener(this.camera.position);
    const inGame = this.mode === 'lobby' || this.mode === 'match';
    // le relief du monde (js/monde.js) ne joue qu'en balade : en match, les pas des joueurs restent ceux du plateau
    Player.enBalade = this.mode === 'lobby';
    const wheelAte = this.updateEmoteInput(dt);
    if (inGame && !this.setupOpen && !wheelAte && this.input.pressed('pause') && this.state !== 'over') this.togglePause();
    if ((this.mode === 'lobby' || this.mode === 'match') && this.input.pressed('phone') && !this.setupOpen) this.cb.onPhone?.();
    if (this.mode === 'match' && this.input.pressed('camera')) { this.camMode = this.camMode === 'tv' ? 'back' : 'tv'; if (this.settings) this.settings.set('game.camera', this.camMode); }
    else if (this.mode === 'lobby' && this.input.pressed('camera')) {
      this.vue = this.vue === 3 ? 2 : this.vue === 2 ? 1 : 3;
      if (this.settings) this.settings.set('game.vue', this.vue);
      this.hud.feedback(this.vue === 1 ? 'VUE 1re PERSONNE' : this.vue === 2 ? 'VUE ÉPAULE' : 'VUE 3e PERSONNE', 'info');
    }
    // ralenti : le jeu s'écoule au ralenti, le chrono du ralenti en temps réel (la caméra reste fluide)
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.timeScale = 1; }
    const gdt = dt * this.timeScale;
    if (this.mode === 'menu') this.menuT += dt;
    else if (this.mode === 'select') this.updateSelect(dt);
    // En ligne, la pause n'arrête que SON écran : le match continue pour les autres.
    else if ((!this.paused || this.reseau) && this.state !== 'over') {
      // Pas de simulation FIXE. Avant, la simulation avançait du temps réel de l'image : la fenêtre du lâcher
      // parfait (66 à 152 ms) se jouait en une seule image à 30 im/s et en quatre à 144, donc un joueur en 144
      // avait un avantage mécanique. Et deux machines ne pouvaient pas simuler la même partie.
      this.acc = Math.min(0.25, (this.acc || 0) + gdt);
      let n = 0;
      // On s'arrête dès qu'un pas termine le match : sans ce test, le pas suivant décrémentait un stateT déjà négatif
      // et remettait l'état à 'playing'. Le match repartait après le buzzer, et les pièces se gagnaient à l'infini.
      // Combien de pas cette image va-t-elle exécuter ? Les bras de dribble (cinématique inverse) ne sont
      // calculés qu'au DERNIER : les pas intermédiaires ne sont jamais affichés.
      // (06/10/2026) AU TÉLÉPHONE, CINQ PAS AU PLUS, et non six. Chaque pas fait tourner les squelettes de tous les joueurs ;
      // sur un téléphone lent, une image lente demandait plus de pas, qui rendaient l'image suivante plus lente encore
      // (la spirale). Sous 24 im/s (cinq pas = 41,7 ms), le jeu ralentit un peu au lieu de s'enfoncer ; au-dessus, rien
      // ne change. Le pas reste de 1/120 s : la partie est la même sur toutes les machines.
      const maxPas = TELEPHONE ? 5 : 6;
      let nPas = 0;
      for (let r = this.acc; r >= FIXED_DT && nPas < maxPas; r -= FIXED_DT) nPas++;
      while (this.acc >= FIXED_DT && n < maxPas && (!this.paused || this.reseau) && this.state !== 'over') {
        Player.poseVisible = n === nPas - 1;
        this.time += FIXED_DT; this.update(FIXED_DT); this.acc -= FIXED_DT; n++;
      }
      Player.poseVisible = true;
      // gros décrochage : on ne rattrape pas indéfiniment, mais on garde jusqu'à DEUX pas de retard, rattrapés par les
      // images suivantes (sans jamais dépasser maxPas chacune). Au téléphone, les images collent au rafraîchissement de
      // l'écran : à 60 Hz elles durent 33,3 ou 50 ms, et une image de 50 ms demande six pas — tout jeter à chaque fois
      // (même en ne jetant qu'au-delà d'un pas entier : 0,05 - 5/120 en est un tout juste) ralentissait la partie entre 24 et 30 im/s,
      // donc un match en ligne hébergé par un téléphone (0,88 à 25 im/s, 0,93 à 27). Deux pas couvrent deux images de
      // 50 ms d'affilée ; au-delà, c'est bien sous 24 im/s, et le jeu ralentit comme voulu. (Avec du retard, l'affichage
      // montre le dernier pas : interpoler() borne la fraction à 1.)
      if (n >= maxPas) this.acc = Math.min(this.acc, 2 * FIXED_DT);
    }
    // AVANT la caméra : elle doit suivre la position AFFICHÉE, pas celle du dernier pas simulé. Les faire
    // diverger, c'est précisément ce qui créait le tremblement — un décor qui glisse et un joueur qui saute.
    this.interpoler();
    this.updateCamera(this.paused ? 0 : dt);
    this.updateMerchant(dt);
    this.updateMarker();
    this.weather.update(dt, this.camera.position);
    this.cb.onTick?.(dt);
    this.scene.userData.animate?.(this.time + this.menuT);
    // Le monde (js/monde.js) : chargement par morceaux, niveaux de détail, ombres qui suivent le joueur — avant
    // les ombres de contact et le rendu. Sur un terrain plat, retour immédiat.
    Monde.maj(dt, this.camera, this.user);
    this.audio.majMonde?.(dt, this);                 // l'oreille suit la caméra ; ambiance du parc entier, roulement du vélo (js/audio_parc.js)
    this.ombres.update(dt, this.fx.quality, this.fx.shadows, this.user);
    if (this.mode !== 'match' && (this._chaudN || 0) < PRECHAUFFE.length) {
      this._chaudT = (this._chaudT || 0) + dt;
      if (this._chaudT >= PRECHAUFFE[this._chaudN || 0]) { this._chaudN = (this._chaudN || 0) + 1; this.prechaufferScene(); }
    }
    this.majAideSortie(dt);                         // demi-terrain : rappel et arc au sol tant qu'il faut sortir la balle
    // (un moment calme pour remonter la qualité — elle coûte une image : pas pendant une action de match, js/fx.js _remonter)
    this.fx.calme = this.mode !== 'match' || this.state !== 'playing' || this.paused;
    this.fx.render(dt);
    this.input.endFrame();
    // compteur d'images (option)
    this.fpsT += dt; this.fpsN++;
    if (this.fpsT >= 0.5) { this.hud.setFps(this.fpsN / this.fpsT); this.fpsT = 0; this.fpsN = 0; }
  }

  // ---------- sensations ----------
  slowMo(scale = 0.3, dur = 0.4) { this.timeScale = scale; this.slowT = dur; }
  addShake(amp, dur = 0.4) { const s = this.shake; s.amp = Math.max(amp, s.amp * (s.t / s.dur)); s.t = dur; s.dur = dur; }
  _applyShake(dt) {
    const s = this.shake; if (s.t <= 0) return;
    s.t -= dt; const k = Math.max(0, s.t / s.dur), a = s.amp * k * k, t = performance.now() * 0.001;
    this.camera.position.x += Math.sin(t * 61.3) * a; this.camera.position.y += Math.sin(t * 47.7 + 1.3) * a; this.camera.position.z += Math.cos(t * 53.1) * a * 0.5;
    this.camera.rotation.z += Math.sin(t * 40.1) * a * 0.12;
  }
  resetMomentum() {
    this.momentum = { user: 0, cpu: 0 }; this.streak = { user: 0, cpu: 0 }; this.fire = { user: false, cpu: false };
    this.timeScale = 1; this.slowT = 0; this._checkFire();
  }
  // + momentum pour "who" (panier, contre, interception), l'autre en perd un peu
  addMomentum(who, amt) {
    const m = this.momentum, other = who === 'user' ? 'cpu' : 'user';
    m[who] = clamp(m[who] + amt, 0, 1); if (amt > 0) m[other] = Math.max(0, m[other] - amt * 0.6);
    this._checkFire();
  }
  updateMomentum(dt) {
    const m = this.momentum; let changed = false;
    for (const who of ['user', 'cpu']) if (m[who] > 0) { m[who] = Math.max(0, m[who] - (this.fire[who] ? 0.035 : 0.02) * dt); changed = true; }
    if (changed) this._checkFire();
  }
  _checkFire() {
    for (const who of ['user', 'cpu']) {
      const was = this.fire[who], now = this.momentum[who] >= 0.99 || (was && this.momentum[who] > 0.6);
      if (now && !was) {
        this.fire[who] = true; this.audio.fire(); this.audio.swell(0.7, 2.2); this.fx.flash = 0.7;
        this.hud.streak(who === 'user' ? (this.teamSize > 1 ? '🔥 TON ÉQUIPE EST EN FEU !' : '🔥 TU ES EN FEU !') : '🔥 ADVERSAIRE EN FEU');
        if (who === 'user') this.addShake(0.05, 0.35);
      } else if (!now && was) { this.fire[who] = false; if (who === 'user') this.hud.streak('feu éteint'); }
    }
    for (const p of this.players) p.boost = this.fire[TEAM_KEY[p.team]] ? 1.1 : 1;
    this.fx.heat = this.fire.user ? 1 : 0;
    this.hud.momentum(this.momentum.user, this.momentum.cpu, this.fire.user, this.fire.cpu);
    this.audio.setCrowd(this.mode === 'match' ? Math.max(this.momentum.user, this.momentum.cpu * 0.6) : 0);
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) { hideOverlay(); return; }
    const options = { label: 'Options', cls: 'btn-secondary', onClick: () => this.cb.onOptions?.() };
    if (this.mode === 'lobby') showOverlay('BALADE', 'Tu te promènes sur le terrain', [
      { label: 'Reprendre', cls: 'btn-primary', onClick: () => this.togglePause() },
      { label: 'Choisir un match', cls: 'btn-secondary', onClick: () => { this.togglePause(); this.cb.onSetup?.(); } },
      // Sans marchand sur le terrain, la boutique n'aurait plus aucune porte d'entrée : les pièces et les
      // points d'entraînement gagnés ici seraient bloqués. On la met donc dans la pause, le temps que le
      // personnage de Levallois existe. Ce bouton disparaît tout seul le jour où il sera là.
      ...(this.sansMarchand ? [{ label: 'Boutique', cls: 'btn-secondary', onClick: () => { this.togglePause(); this.cb.onShop?.(); } }] : []),
      options,
      { label: 'Changer de joueur', cls: 'btn-secondary', onClick: () => this.cb.onChangePlayer?.() },
      { label: 'Menu principal', cls: 'btn-secondary', onClick: () => this.cb.onMenu() },
    ]);
    else showOverlay('PAUSE', `${this.teams[0].name} ${this.teams[0].score} - ${this.teams[1].score} ${this.teams[1].name}`, [
      { label: 'Reprendre', cls: 'btn-primary', onClick: () => this.togglePause() },
      { label: 'Retour balade', cls: 'btn-secondary', onClick: () => this.enterLobby() },
      options,
      { label: 'Menu principal', cls: 'btn-secondary', onClick: () => this.cb.onMenu() },
    ]);
  }

  // ---------- écran de sélection ----------
  updateSelect(dt) {
    const p = this.preview; if (!p) return;
    this.selectT += dt;
    p.hasBall = this.ball.holder === p; p.defending = false;
    p.cibleRegard = this.camera.position;           // il pose pour la photo : il regarde l'objectif
    p.move(ZERO, false, dt); p.update(dt);
    this.updatePendingShot(); this.updateBall(dt);
  }

  // ---------- boucle de jeu ----------
  // Le porteur qui repart de l'autre cote repasse la balle dans l'autre main. Un seul endroit pour tout le
  // monde — clavier, ordinateur, match ou balade. `startMove` refuse tout seul si un geste est deja en cours
  // ou si le delai n'est pas ecoule : pas besoin d'un verrou de plus ici.
  croiserSiViraison() {
    const p = this.ball.holder;
    if (p && p.viraison && p.state === 'idle' && p.spinT <= 0 && !p.airborne && p.stun <= 0 && !p.auSol) {
      p.switchHand(this.ball.pos);
    }
  }

  // Avant CHAQUE pas de simulation : la pose affichee devient la pose d'hier. C'est ce qui permet de glisser
  // entre les deux au moment d'afficher (voir interpoler).
  memoriserPoses() {
    for (const p of this.players) p.memoriser();
    if (this.merchant) this.merchant.memoriser();
    if (this.presence) for (const o of this.presence.others.values()) o.player.memoriser();
    for (const b of this.velos) if (!b.pris) b.memoriser();
    this.ball.memoriser();
  }

  // Une fois par image, apres la boucle a pas fixe. `acc` est ce qui reste dans l'accumulateur : c'est
  // exactement la fraction de pas deja ecoulee a l'ecran mais pas encore simulee.
  interpoler() {
    // `acc` n'existe qu'une fois passé par la boucle à pas fixe (balade, match) : avant, sur l'écran de
    // sélection, il valait undefined, la fraction NaN, et l'aperçu du joueur partait à une position NaN —
    // invisible. La sélection n'avance pas à pas fixe : on y montre la pose courante.
    const a = this.mode === 'select' ? 1 : Math.max(0, Math.min(1, (this.acc || 0) / FIXED_DT));
    for (const p of this.players) p.presenter(a);
    if (this.merchant) this.merchant.presenter(a);
    if (this.presence) for (const o of this.presence.others.values()) o.player.presenter(a);
    // (la caméra : les vélos garés du parc entier s'allègent de loin, voir Velo.presenter ; les autres l'ignorent)
    for (const b of this.velos) if (!b.pris) b.presenter(a, this.camera.position);
    this.ball.presenter(a);
    // Niveau de détail du dribble : les bras sont posés sur le ballon par IK pour le joueur contrôlé et les
    // porteurs visibles à moins de 25 m (4 au plus sur téléphone) ; au-delà le ballon reste exact, le bras
    // garde le clip — à cette distance personne ne voit la différence, et l'IK coûte cher sur mobile.
    // (06/10/2026 : une méthode plutôt qu'une fermeture refaite à chaque image ; le plafond de quatre suit la détection du
    // téléphone de tout le jeu, js/appareil.js, et non plus l'écran tactile — une tablette Windows au doigt n'est pas un
    // téléphone)
    this._nIK = 0;
    for (const q of this.players) this._lodIK(q);
    if (this.presence) for (const o of this.presence.others.values()) this._lodIK(o.player);
  }
  _lodIK(q) {
    const cam = this.camera.position;
    q.distCam = Math.hypot(q.posAff.x - cam.x, q.posAff.z - cam.z);
    q.lodIK = q === this.user || (q.mesh.visible && q.distCam < DRIBBLE.LOD_DIST && (!TELEPHONE || this._nIK < DRIBBLE.LOD_TOUCH));
    if (q.lodIK && q.hasBall) this._nIK++;
  }

  update(dt) {
    this.memoriserPoses();
    this.regards();
    if (this.mode === 'lobby') { this.updateLobby(dt); return; }
    // invité (ou spectateur) d'un match en ligne : la partie se joue chez l'hôte, on ne fait que la suivre
    if (this.reseau && this.reseau.role !== 'hote') { this.reseau.pasClient(dt); return; }
    const R = this.reseau;

    const holder = this.ball.holder;
    for (const p of this.players) { p.hasBall = holder === p; p.defending = !!holder && holder.team !== p.team; }

    if (this.state === 'playing') {
      this.switchCd = Math.max(0, (this.switchCd || 0) - dt);
    this.markT -= dt; if (this.markT <= 0) { this.markT = 0.4; this.updateMarks(); }
      // Les corps se repoussent AVANT les commandes : move() consomme la poussée dans la même image.
      this.updateContacts();
      this.pickControlled(dt);
      if (R) R.choisirPilotes(dt);
      // Qui pilote quoi. C'est la couture prevue pour le reseau : aujourd'hui « clavier » pour le joueur local et
      // « ordinateur » pour les autres ; demain un joueur distant remplacera simplement sa source de commandes.
      // `autoUser` fait jouer le joueur local par l'ordinateur (equilibrage, demonstration, joueur deconnecte).
      // En ligne, les invités sont cette source-là : leurs commandes arrivent par le réseau (js/enligne.js).
      for (const p of this.players) {
        const pil = R ? R.piloteDe(p) : null;
        p.piloteHumain = !!pil || (p === this.user && !this.autoUser);   // rotation plus vive (Player.turnTo)
        if (pil) this.controlUser(dt, pil);
        else if (p === this.user && !this.autoUser) this.controlUser(dt);
        else this.ais.get(p)?.update(dt);
      }
      // CROSSOVER AUTOMATIQUE. Un seul endroit pour tout le monde : le porteur qui repart de l'autre côté
      // repasse la balle dans l'autre main, qu'il soit tenu au clavier ou par l'ordinateur. C'est le geste
      // qui manquait le plus, parce que c'est celui qu'on fait sans y penser dès qu'on change d'appui.
      // `startMove` refuse tout seul si un geste est déjà en cours ou si le délai n'est pas écoulé : pas
      // besoin d'un verrou de plus ici.
      this.croiserSiViraison();
    } else if (this.state === 'countdown') {
      for (const p of this.players) p.move(ZERO, false, dt);
      this.stateT -= dt;
      const n = Math.ceil(this.stateT - 0.4);
      if (n !== this.lastCount) { this.lastCount = n; this.hud.feedback(n > 0 ? String(n) : 'GO !', n > 0 ? 'warn' : 'good'); if (n <= 0) this.audio.buzzer(); }
      if (this.stateT <= 0) { this.state = 'playing'; this.shotClock = SHOT_CLOCK; }
    } else {
      for (const p of this.players) p.move(ZERO, false, dt);
      this.stateT -= dt;
      if (this.stateT <= 0) { this.resetPossession(this.pendingOffense, this.pendingFromZ); this.state = 'playing'; }
    }
    for (const p of this.players) p.update(dt);
    this.updatePendingShot();
    this.updateBall(dt);
    if (this.state === 'playing') this.rules(dt);
    this.updateMomentum(dt);
    const owner = this.ball.holder || (this.ball.shot && this.ball.shot.shooter) || null;
    this.ball.setFire(!!owner && this.fire[TEAM_KEY[owner.team]]);

    this.hud.setClock(Math.max(0, Math.ceil(this.shotClock)));
    this.hud.stamina(this.user.stamina);
    const mine = this.offense === 0;
    // la fleche suit le cote de la camera de diffusion (reperes.camTV) et le panier reellement attaque
    const arrow = this.camMode === 'tv' ? (this.coteTV() * this.teams[0].hoop.z < 0 ? '  ·  ton panier ▶' : '  ·  ◀ ton panier') : '';
    const who = this.teamSize > 1 ? `  ·  ${this.user.def.name.toUpperCase()}` : '';
    this.hud.possession((mine ? '● ATTAQUE' : '○ DÉFENSE') + who + arrow, mine);
    if (R && this.reseau === R) R.apresPas(dt);          // hôte : image du match pour les invités
  }

  // ---------- où chacun regarde (js/couches.js) ----------
  // En match, le porteur regarde le panier qu'il attaque dès qu'il en approche ; tous les autres suivent le
  // ballon, où qu'il soit — c'est ce qui fait qu'une défense a l'air de défendre. En balade : le ballon s'il
  // traîne, sinon le joueur le plus proche, sinon le marchand ; et le marchand regarde celui qui vient le
  // voir. Les joueurs connectés se regardent entre eux quand ils se croisent.
  regards() {
    const ball = this.ball, bp = ball.pos;
    if (this.merchant && this.mode !== 'lobby') this.merchant.cibleRegard = null;
    const R = regardDe, tete = teteDe, panier = panierDe;      // (fonctions du module : rien d'alloué à chaque pas)
    if (this.mode === 'match') {
      for (const p of this.players) {
        // PRESSION : l'adversaire le plus proche à moins de 1,6 m, devant (±110°), depuis un dixième de seconde ;
        // on ne la relâche qu'à plus de 2,1 m ou hors du cône depuis 0,4 s. Le porteur protège alors sa balle.
        if (ball.holder === p) {
          const o = this.nearestOpponent(p);
          let dedans = false;
          if (o) { const dx = o.pos.x - p.pos.x, dz = o.pos.z - p.pos.z, d = Math.hypot(dx, dz); dedans = d < (p.pression ? 2.1 : 1.6) && (dx * p.facing.x + dz * p.facing.z) > -0.34 * d; }
          p._presT = dedans ? Math.max(0, (p._presT || 0)) + 1 / 120 : Math.min(0, (p._presT || 0)) - 1 / 120;
          if (!p.pression && p._presT > 0.10) p.pression = 1; else if (p.pression && p._presT < -0.40) p.pression = 0;
        } else { p.pression = 0; p._presT = 0; }
        // LA BALLE QU'IL VIENT DE VOLER (06/10/2026) : le bras du vol (js/couches.js, _vol) finit son geste sur la cible du
        // regard ; devenu porteur, celle-ci passait au cercle ou à l'adversaire, et le bras partait vers eux. Le temps du
        // geste, les yeux — et la main — restent sur le ballon.
        if (ball.holder === p && p.swipeT > 0) p.cibleRegard = R(p).set(bp.x, bp.y, bp.z);
        else if (ball.holder === p) {
          // en duel, les yeux sur le défenseur (sa poitrine) ; sinon sur le cercle quand on s'en approche —
          // et pendant une hésitation, sur le cercle : on vend le tir
          const hesi = p.dribble && p.dribble.geste.def && p.dribble.geste.et && p.dribble.geste.et.regardPanier;
          const o = p.pression && !hesi ? this.nearestOpponent(p) : null;
          if (o) p.cibleRegard = R(p).set(o.pos.x, 0.66 * o.h, o.pos.z);
          else if (hesi) { const h = panier(p); p.cibleRegard = R(p).set(h.x, COURT.HOOP_Y, h.z); }
          else { const h = panier(p); p.cibleRegard = hdist(p.pos, h) < 11 ? R(p).set(h.x, COURT.HOOP_Y, h.z) : null; }
        }
        else p.cibleRegard = ball.mesh.visible ? R(p).set(bp.x, bp.y, bp.z) : null;
      }
      return;
    }
    // Hors match, personne ne presse : sortir d'un match en plein duel laissait le dribble protégé (et le bras
    // barrière) jusqu'au match suivant.
    for (const q of [this.user, this.captain]) if (q) { q.pression = 0; q._presT = 0; }
    if (this.mode !== 'lobby') return;
    const u = this.user;
    const autres = [];
    if (this.presence && this.presence.actif) for (const o of this.presence.others.values()) autres.push(o.player);
    const proche = (p, liste, max) => {
      let best = null, bd = max;
      for (const q of liste) { if (!q || q === p || !(q.mesh.visible || q.vuePremiere)) continue; const d = hdist(p.pos, q.pos); if (d < bd) { bd = d; best = q; } }
      return best;
    };
    if (u) {
      if (ball.holder === u) { const h = panier(u); u.cibleRegard = hdist(u.pos, h) < 9 ? R(u).set(h.x, COURT.HOOP_Y, h.z) : null; }
      else if (ball.state !== 'held' && ball.mesh.visible && hdist(u.pos, bp) < 12) u.cibleRegard = R(u).set(bp.x, bp.y, bp.z);
      else {
        const q = proche(u, autres, 6) || (this.merchant && hdist(u.pos, this.merchant.pos) < 4.5 ? this.merchant : null);
        u.cibleRegard = q ? tete(q, R(u)) : null;
      }
    }
    for (const q of autres) { const c = proche(q, [u, ...autres], 6); q.cibleRegard = c ? tete(c, R(q)) : null; }
    if (this.merchant && u) { const m = this.merchant; m.cibleRegard = hdist(m.pos, u.pos) < 6 ? tete(u, R(m)) : null; }
  }

  // ---------- joueur contrôlé (modes en équipe) ----------
  setControlled(p) {
    if (p === this.user || p.team !== 0) return;
    if (this.reseau && this.reseau.piloteDe(p)) return;         // tenu par un joueur en ligne
    this.user = p; this.switchT = 0;
    if (this.teamSize > 1) this.hud.controlled(p.def.name);
  }
  // en attaque on contrôle toujours le porteur ; en défense / balle libre le plus proche de la balle (auto, avec hystérésis)
  pickControlled(dt) {
    const ball = this.ball, T0 = this.teams[0];
    if (this.teamSize === 1) return;
    const inp = this.input;
    if (ball.holder && ball.holder.team === 0) { this.setControlled(ball.holder); return; }
    if (this.pendingShot && this.pendingShot.shooter.team === 0) return;          // le tireur garde la main jusqu'au lâcher
    if (ball.pass && ball.pass.team === 0) return;                                 // passe en cours : on bascule à la réception
    if (inp.pressed('switch')) { this.cycleControl(); return; }
    if (this.settings && !this.settings.controls.autoSwitch) return;
    if (this.user.emote) return;                                                   // il danse : on ne lui retire pas la main
    const ref = ball.holder ? ball.holder.pos : ball.pos;
    let best = null, bd = Infinity;
    for (const p of T0.players) { const d = hdist(p.pos, ref); if (d < bd) { bd = d; best = p; } }
    const cur = hdist(this.user.pos, ref);
    if (best !== this.user && bd < cur - 1.2 && this.user.state === 'idle' && !this.user.airborne) { this.switchT += dt; if (this.switchT > 0.35) this.setControlled(best); }
    else this.switchT = 0;
  }
  // changement manuel : le coéquipier le plus proche de la balle (hors joueur actuel), puis les suivants
  cycleControl() {
    if (this.switchCd > 0) return;
    this.switchCd = 0.25;                  // un appui = un changement, même si l'image exécute plusieurs pas
    const ref = this.ball.holder ? this.ball.holder.pos : this.ball.pos;
    const cands = this.teams[0].players.filter((p) => p !== this.user).sort((a, b) => hdist(a.pos, ref) - hdist(b.pos, ref));
    if (cands.length) this.setControlled(cands[0]);
  }
  updateMarker() {
    const m = this.marker;
    m.visible = this.mode === 'match' && this.teamSize > 1 && this.state !== 'over';
    this.majAnneauxEquipe(m.visible);                  // anneaux d'equipe sous les autres joueurs (_buildMarker)
    if (!m.visible) return;
    const u = this.user;
    m.position.set(u.pos.x, 0, u.pos.z);
    m.userData.arrow.position.y = u.h * 1.02 + u.jumpY + 0.15 + Math.sin(performance.now() * 0.004) * 0.05;
    m.userData.ring.position.y = 0.02;
  }

  // ---------- s'asseoir sur les bancs ----------
  // Le rang le plus proche gagne, et on s'assoit A LA HAUTEUR DE Z OU L'ON SE TROUVE : le gradin fait
  // vingt-cinq metres de long, il serait absurde d'avoir une seule place assise au milieu.
  //
  // Une fois assis, la touche d'action monte d'un rang — et depuis le dernier, elle releve. Le moindre
  // deplacement releve aussi, comme partout ailleurs : personne ne cherche « la touche pour se lever ».
  pointBanc(b, z) {
    // `sz` : un banc pose en travers (il regarde z) declare ou l'on se releve ; sinon on se releve a sa hauteur
    return { x: b.x, z: Math.max(b.z0, Math.min(b.z1, z)), y: b.y, sx: b.sx, sz: b.sz !== undefined ? b.sz : Math.max(b.z0, Math.min(b.z1, z)),
             fx: b.fx, fz: b.fz, rang: b.rang };
  }

  updateBancs(u, a) {
    const bancs = this.bancs;
    if (!bancs || !bancs.length || this.setupOpen) return;
    if (u.assis) {
      const bouge = Math.hypot(a.x, a.y) > 0.45;
      if (this.input.pressed('interact')) {
        const suivant = bancs[u.assis.rang + 1];
        if (suivant) u.changerRang(this.pointBanc(suivant, u.pos.z));
        else u.seLever();
      } else if (bouge || this.input.pressed('shoot')) u.seLever();
      if (u.assisPose) {
        const haut = u.assis.rang + 1 < bancs.length;
        this.hud.hint(`${actionKey('interact')} : ${haut ? 'monter d\u2019un rang' : 'se lever'} \u00b7 ou bouge pour te lever`);
      }
      return;
    }
    // debout : on cherche le rang dont l'assise est la plus proche
    let best = null, bd = 1e9;
    for (const b of bancs) {
      const z = Math.max(b.z0, Math.min(b.z1, u.pos.z));
      const d = Math.hypot(u.pos.x - b.x, u.pos.z - z);
      if (d < bd) { bd = d; best = b; }
    }
    // 1,45 m : de quoi attraper le premier rang depuis le degagement sans que l'indication clignote des
    // qu'on longe les bancs. Le marchand reste prioritaire, sinon les deux indications se battent.
    const pres = !!best && bd <= 1.45 && !this.nearMerchant;
    // On ne REPOSE l'indication de balade qu'au moment ou l'on QUITTE les bancs. Sans ce drapeau, soit on
    // l'ecrasait a chaque image et plus aucune autre indication ne tenait, soit on laissait « s'asseoir »
    // affiche pour le reste de la partie apres s'en etre eloigne. Meme mecanique que pour le marchand.
    if (pres !== this._presBanc) {
      this._presBanc = pres;
      if (!pres) this.hud.hint(this.lobbyHint());
    }
    if (!pres) return;
    this.hud.hint(`${actionKey('interact')} : s\u2019asseoir sur ${best.nom || 'le gradin'}`);
    if (this.input.pressed('interact')) u.sasseoir(this.pointBanc(best, u.pos.z));
  }

  // ---------- le vélo ----------
  // Il se prend comme un banc : on s'en approche, la touche d'action le fait enfourcher. En selle les
  // commandes changent de sens — avant = pédaler, arrière = freiner (puis reculer en poussant des pieds),
  // gauche / droite = tourner le guidon, sprint = en danseuse, tir = sonnette. La touche d'action freine
  // jusqu'à l'arrêt puis fait descendre ; le vélo reste là où on l'a laissé, sur sa béquille.
  // Renvoie vrai quand le joueur est sur le vélo : la marche, le saut et le ballon sont alors coupés.
  updateVelo(u, a, dt) {
    const velos = this.velos;
    this.veloCd = Math.max(0, this.veloCd - dt);
    if (!velos.length && !u.velo) return false;          // (lot C4 : l'engin du sac se conduit aussi sans vélo au terrain)
    // Le vélo du terrain est UNIQUE : quand un autre joueur roule dessus, on le voit sur SON vélo (voir
    // Player.appliquerAnim) et celui du terrain disparaît jusqu'à ce qu'il le gare.
    // (Parc entier, lot A7 : chacun des six vélos disparaît quand un autre joueur roule sur CELUI-LÀ, voir velosPrisAilleurs.)
    const pris = this.velosEnLigne ? this.velosPrisAilleurs() : null;
    const autre = !pris && this.veloDistantEnSelle();
    for (const b of velos) {
      if (b.pris) continue;
      b.reposer(dt);
      if (pris) { if (b.id) b.racine.visible = !pris.has(b.id); }
      else if (b === this.veloTerrain) b.racine.visible = !autre;
    }
    if (u.velo) {
      const V = u.velo, b = V.v;
      // Il descend : plus aucune commande, et on MANGE les appuis. Non lus, ils restaient en attente et
      // l'appui fait pendant la descente remontait sur le vélo (ou ouvrait la boutique) une fois à pied.
      if (V.sortir) { this.input.pressed('interact'); this.input.pressed('shoot'); return true; }
      if (!V.bras && u.avatar) u._mesurerCycliste();              // l'avatar a fini de charger après la montée
      if (this.input.pressed('interact') && this.veloCd <= 0) { this.veloDescente = true; this.veloCd = 0.4; }
      // (lot C4 : en skate, la touche de tir fait un ollie ; la trottinette a sa sonnette, comme le vélo)
      if (this.input.pressed('shoot')) { if (b.ollie) b.ollie(); else this.audio.sonnette(b.pos); }
      // Pour descendre on s'arrête d'abord : on freine en avançant, et en reculant on « freine » dans l'autre
      // sens — sinon, lancé en marche arrière, le frein nous faisait reculer de plus belle et on ne s'arrêtait jamais.
      const frein = b.v > 0.05 ? -1 : b.v < -0.05 ? 1 : 0;
      const cmd = V.k < 1 || this.setupOpen ? { x: 0, y: 0 } : this.veloDescente ? { x: 0, y: frein } : { x: a.x, y: a.y, sprint: this.input.sprint() };
      b.conduire(cmd, dt, this.yard, this.obstaclesVelo());
      // (lot C4) le pied qui pousse touche le sol, la planche retombe d'un ollie : leurs bruits
      // (à la hauteur de la monture, `racine` : `pos` reste au niveau 0, et dans le haut du parc entier le son, compté à
      // dix mètres sous la caméra, sortait presque muet)
      if (b.pas) { b.pas = false; this.audio.pas(b.racine ? b.racine.position : b.pos, 0.4); }
      if (b.claque) { b.claque = false; this.audio.board(0.55, b.racine ? b.racine.position : b.pos); }
      // UN ESCALIER, UNE MARCHE TROP HAUTE, UN TALUS TROP RAIDE (relief du parc entier, js/monture.js) : le vélo s'est
      // arrêté là où l'on passerait à pied. On le dit, une fois, tant qu'on reste contre ; puis l'aide du vélo revient.
      // (Sur un terrain plat, `blocage` reste toujours null.)
      if (b.blocage) this.signalerBlocageVelo(b.blocage);
      else if (this._blocageT > 0 && (this._blocageT -= dt) <= 0) { this._blocageTxt = null; this.hud.hint(this.veloHint()); }
      if (V.k >= 1) {
        const fx = Math.sin(b.cap), fz = Math.cos(b.cap);
        u.pos.set(b.pos.x, Monde.sol(b.pos.x, b.pos.z), b.pos.z); u.setFacing(fx, fz);
        u.vel.set(fx * b.v, 0, fz * b.v);
      }
      u.speedNow = 0; u.sprinting = false; u.marche = false;
      u.stamina = Math.min(100, u.stamina + (b.effort > 0.3 ? 4 : 10) * dt);
      if (this.veloDescente && Math.abs(b.v) < 0.35) {
        this.veloDescente = false; this._blocageT = 0; this._blocageTxt = null;
        u.descendreVelo(); this.garerVelo(b);
        this.hud.hint(this.lobbyHint()); this.cb.onNear?.(this.nearMerchant);
      }
      return true;
    }
    // à pied : le vélo libre le plus proche
    let best = null, bd = 1e9;
    for (const b of velos) {
      if (!b.conduisible || b.pris || !b.racine.visible) continue;
      const d = b.distance(u.pos.x, u.pos.z);
      if (d < bd) { bd = d; best = b; }
    }
    const peut = u.state === 'idle' && !u.airborne && !u.assis && !u.emote && u.stun <= 0 && !(u.chuteT > 0)
      && !this.setupOpen && !this.training.active && !this.pendingShot;
    // Près du marchand ET d'un vélo, c'est le plus proche des deux qui répond à la touche : sinon un vélo garé
    // à moins d'un mètre de Pierrick ne se reprenait plus jamais.
    const dm = this.merchant && !this.sansMarchand ? hdist(u.pos, this.merchant.pos) : 1e9;
    const pres = !!best && bd <= 1.5 && bd < dm && peut;
    if (best) this._presGenre = best.genre || 'velo';            // (lot C4 : le libellé du bouton tactile)
    if (pres !== this._presVelo) {
      this._presVelo = pres;
      this.cb.onNear?.(this.nearMerchant);                       // le bouton tactile change de libellé
      if (!pres) this.hud.hint(this.lobbyHint());
    }
    if (!pres) return false;
    this.hud.hint(`${actionKey('interact')} : monter sur ${best.P.article || 'le vélo'}`);
    if (!this.input.pressed('interact') || this.veloCd > 0) return false;
    // le ballon reste par terre, devant soi
    if (this.ball.holder === u) {
      const B = this.ball, f = u.facing;
      B.state = 'loose'; B.holder = null; B.shot = null; B.pass = null; B.lastTouch = u;
      B.vel.set(f.x * 0.8, 0.6, f.z * 0.8); B.touchedFloor = false;
    }
    if (!u.monterVelo(best)) return false;
    this.veloCd = 0.4; this.veloDescente = false; this._presVelo = false;
    this._blocageT = 0; this._blocageTxt = null;     // (un arrêt de la sortie d'avant ne fait pas taire le prochain)
    this.hud.hint(this.veloHint());
    this.cb.onNear?.(this.nearMerchant);
    return true;
  }

  // « DESCENDS DU VÉLO » : le message annonce l'arrêt une fois (pas à chaque pas tant qu'on pousse contre la marche),
  // l'aide en bas d'écran dit pourquoi et comment descendre, pendant 2,5 s après le dernier choc.
  signalerBlocageVelo(bl) {
    // (lot C4 : arrêté sur une trottinette ou un skate, le message et la raison sont ceux de l'engin — js/monture_cavalier.js)
    const R = bl.engin ? raisonBlocage(bl) : null;
    if (!(this._blocageT > 0)) this.hud.feedback(R ? R.titre : 'DESCENDS DU VÉLO', 'warn');
    this._blocageT = 2.5;
    // ('pente' : le drapeau « cyclable » refusé — un talus trop raide, ou un sol plat qui n'est pas un chemin : le sable
    // et les copeaux des aires de jeux, le béton des gradins)
    const raison = R ? R.raison : bl.type === 'escalier' ? 'un escalier ne se prend pas à vélo'
      : bl.type === 'pente' ? (bl.raide ? 'trop raide pour le vélo' : 'pas un chemin pour le vélo') : 'marche trop haute pour le vélo';
    const txt = `${raison} · ${IS_TOUCH ? 'bouton DESCENDRE' : `${actionKey('interact')} = descendre`}, puis à pied`;
    if (txt !== this._blocageTxt) { this._blocageTxt = txt; this.hud.hint(txt); }
  }

  // ---------- l'engin du sac (lot C4) ----------
  // Le skate ou la trottinette pliante achetés chez le marchand (js/shop.js) : quand rien d'autre n'est à portée (ni
  // vélo, ni banc, ni marchand), la touche d'action le POSE devant soi et l'on monte dessus ; en descendant, on le
  // reprend (Player.lacherVelo le range). En balade seulement : updateLobby est le seul à l'appeler.
  updateEnginPerso(u) {
    const E = this.enginPerso;
    const peut = !!E && !u.velo && u.state === 'idle' && !u.airborne && !u.assis && !u.emote && u.stun <= 0 && !(u.chuteT > 0)
      && !this.setupOpen && !this.training.active && !this.pendingShot && !this.nearMerchant && !this._presVelo && !this._presBanc;
    if (peut !== this._enginDispo) {
      this._enginDispo = peut;
      this.cb.onNear?.(this.nearMerchant);                      // le bouton tactile apparaît (SKATE, TROTT.)
      if (this.triggerT <= 0 && !this.training.active) this.hud.hint(this.lobbyHint());
    }
    // (relecture C4) un appui fait quand l'engin ne peut pas sortir (en l'air, en plein tir, pendant une emote...) ne
    // reste pas en attente : il le sortait du sac bien plus tard, à l'atterrissage ou à la fin du geste. (Le marchand,
    // le vélo et le banc, qui passent avant dans updateLobby, ont déjà pris le leur.)
    if (!peut) { if (E) this.input.pressed('interact'); return false; }
    if (this.veloCd > 0 || !this.input.pressed('interact')) return false;
    // le construire une fois (puis le garder dans le sac), à la peinture choisie
    const couleur = couleurDe(E.couleur, 0xc1272d), dessin = E.dessin || 0;
    let b = this.enginsPerso[E.genre];
    if (!b) {
      b = E.genre === 'skate' ? new Skate(this.scene, { couleur, dessin }) : new Trottinette(this.scene, { couleur, appui: null });
      b.perso = true; b.racine.visible = false;
      this.enginsPerso[E.genre] = b;
    } else if (b.peindre) b.peindre(couleur, dessin);
    // posé juste devant ses pieds, dans l'axe ; sur le relief, il faut un sol où il roule
    const f = u.facing, x = u.pos.x + f.x * 0.25, z = u.pos.z + f.z * 0.25;
    if (!Monde.plat && b.P.interdits && b.P.interdits.has(Monde.surface(x, z))) {
      this.hud.feedback(E.genre === 'skate' ? 'PAS ICI, LE SKATE NE ROULE PAS' : 'PAS ICI', 'warn');
      return false;
    }
    b.pos.set(x, 0, z); b.cap = Math.atan2(f.x, f.z); b.v = 0;
    b.garerSec(); b.appui = null; b.bequille = 0; b.penche = 0;
    b.racine.visible = true; b.memoriser(); b.presenter(1);
    // le ballon reste par terre, devant soi (comme pour le vélo)
    if (this.ball.holder === u) {
      const B = this.ball;
      B.state = 'loose'; B.holder = null; B.shot = null; B.pass = null; B.lastTouch = u;
      B.vel.set(f.x * 0.8, 0.6, f.z * 0.8); B.touchedFloor = false;
    }
    if (!u.monterVelo(b)) { b.racine.visible = false; return false; }
    this.veloCd = 0.4; this.veloDescente = false; this._enginDispo = false;
    this._blocageT = 0; this._blocageTxt = null;
    this.hud.hint(this.veloHint());
    this.cb.onNear?.(this.nearMerchant);
    return true;
  }

  // Le décor dont le vélo doit s'écarter : celui des piétons, plus le marchand debout.
  obstaclesVelo() {
    const o = this._obsVelo || (this._obsVelo = []);
    o.length = 0;
    for (const x of Player.obstacles) o.push(x);
    const m = this.merchant;
    if (m && !m.assis && m.mesh && m.mesh.visible) o.push({ x: m.pos.x, z: m.pos.z, r: 0.75 });
    return o;
  }

  veloDistantEnSelle() {
    if (!this.presence || !this.presence.actif) return false;
    // (lot C4 : un autre joueur sur sa trottinette ou son skate ne roule pas sur le vélo du terrain)
    for (const o of this.presence.others.values()) if (o.player.velo && !o.player.velo.v.genre) return true;
    return false;
  }
  // PARC ENTIER (lot A7) : les identifiants des vélos sur lesquels roulent les autres (paquet `vi`, js/presence.js ; `viVu`
  // le temps qu'ils finissent d'en descendre chez nous). Au passage, le vélo de la réserve sur lequel on voit rouler
  // chacun d'eux prend la PEINTURE du vélo qu'il a pris : sans ça, tout le monde roulait sur le bleu de V1.
  velosPrisAilleurs() {
    const s = this._prisAilleurs || (this._prisAilleurs = new Set());
    s.clear();
    if (!this.presence || !this.presence.actif) return s;
    for (const o of this.presence.others.values()) {
      const p = o.player, id = o.vi || (p.velo ? o.viVu : null);
      if (!id) continue;
      s.add(id);
      const v = p.velo && p.velo.v, b = v && this.velos.find((x) => x.id === id);
      if (b && v !== b && v.m && v.m.peinture !== b.m.peinture) {
        const avant = v.m.peinture;
        v.racine.traverse((x) => { if (x.isMesh && x.material === avant) x.material = b.m.peinture; });
        v.m = { ...v.m, peinture: b.m.peinture };
      }
    }
    // UN VÉLO D'AVANCE, TOUJOURS : un nouveau cycliste distant vient de prendre celui de la réserve (Player.appliquerAnim,
    // Velo.emprunter). Sans en remettre un, le suivant construisait le sien dans le gestionnaire du paquet — un vélo
    // complet, 70 à 290 ms d'image figée, alors qu'au parc entier la réserve COPIE le premier vélo du parc (quelques ms,
    // Velo.preparer), et ici, à l'image d'après, hors du paquet.
    if (s.size > (this._nPrisAilleurs || 0)) Velo.preparer(this.scene, 1);
    this._nPrisAilleurs = s.size;
    return s;
  }

  // Garer, et dire aux autres OÙ. Chacun annonce le dernier endroit où il l'a garé, avec un numéro d'ordre :
  // la version la plus récente l'emporte, et à égalité le plus grand identifiant. Un joueur qui arrive
  // retrouve ainsi le vélo là où on l'a laissé.
  garerVelo(b) {
    b.garer();
    // Hors ligne on ne publie rien : un numéro consommé tout seul l'aurait emporté plus tard sur la vraie
    // position que les autres connaissent, et le terrain aurait eu deux vélos différents pour toujours.
    if (this.velosEnLigne) { if (b.id && this.presence.room) this.publierGarage(b); return; }   // (parc entier, lot A7)
    if (b !== this.veloTerrain || !this.presence.room) return;
    this.veloSeq += 1;
    this.veloPar = String(this.presence.room.ident.id);
    this.veloNonce = Math.floor(Math.random() * 1e6);
    const r = (x) => Math.round(x * 100) / 100;
    this.presence.veloGare = [r(b.pos.x), r(b.pos.z), r(b.cap), this.veloSeq, this.veloPar, this.veloNonce];
  }
  // Le paquet porte l'AUTEUR du stationnement et un tirage au sort : ce ne sont pas ceux de l'expéditeur,
  // puisque chacun re-diffuse le dernier état qu'il connaît — c'est ce qui permet à un joueur qui arrive de
  // retrouver le vélo même si celui qui l'a garé est parti.
  recevoirVeloGare(vg, id) {
    if (this.velosEnLigne) { this.recevoirGarages(vg, id); return; }        // (parc entier, lot A7 : la liste)
    const b = this.veloTerrain;
    if (!b || !Array.isArray(vg) || vg.length < 4) return;
    const [x, z, cap, n] = vg, Y = this.yard;
    const par = String(vg[4] ?? id), no = Number.isFinite(vg[5]) ? vg[5] : 0;
    if (![x, z, cap, n].every(Number.isFinite) || x < Y.xMin - 0.5 || x > Y.xMax + 0.5 || z < Y.zMin - 0.5 || z > Y.zMax + 0.5) return;
    const plusRecent = n > this.veloSeq || (n === this.veloSeq && (par > this.veloPar || (par === this.veloPar && no > this.veloNonce)));
    if (!plusRecent) return;
    this.veloSeq = n; this.veloPar = par; this.veloNonce = no;
    this.presence.veloGare = [x, z, cap, n, par, no];          // on le re-diffuse à notre tour
    if (b.pris) return;              // on roule dessus : notre version, plus récente, partira à la descente
    // on est en train d'en descendre : le déplacer traînerait le joueur avec lui
    if (this.user && this.user.velo && this.user.velo.v === b) return;
    b.pos.set(x, 0, z); b.cap = cap;
    b.appui = 'bequille'; b.bequille = 1; b.penche = 0.13; b.braq = 0.18; b.v = 0;
    b.memoriser();
    // reçu pendant un match : même règle qu'au coup d'envoi, pas de vélo au milieu du terrain
    if (this.mode === 'match') b.racine.visible = !this.veloSurTerrain(b);
  }
  veloSurTerrain(b) { return Math.abs(b.pos.x) < COURT.W / 2 + 0.8 && Math.abs(b.pos.z) < COURT.L / 2 + 0.8; }

  // ---------- les six vélos du parc entier en ligne (lot A7, conception § 3.8) ----------
  // Même règle que pour le vélo du terrain, mais VÉLO PAR VÉLO : chaque garage porte l'identifiant du vélo, sa position
  // (repère du terrain 1 : parc et parc2 voient le même vélo au même endroit du parc), son cap, un numéro d'ordre, son
  // auteur et un tirage au sort. Le plus récent l'emporte ; chacun re-diffuse tous les garages qu'il connaît (`vg` en
  // liste), si bien qu'un joueur qui arrive retrouve chaque vélo là où on l'a laissé, même si son auteur est parti.
  // Seuls les vélos déplacés au moins une fois voyagent : au départ, la liste est vide et le paquet n'a pas de `vg`.
  publierGarage(b) {
    const E = this.velosEnLigne, e = E.get(b.id), r = (x) => Math.round(x * 100) / 100;
    E.set(b.id, [b.id, r(b.pos.x - Monde.dx), r(b.pos.z), r(b.cap), (e ? e[4] : 0) + 1, String(this.presence.room.ident.id), Math.floor(Math.random() * 1e6)]);
    this.presence.veloGare = [...E.values()];
  }
  recevoirGarages(vg, id) {
    if (!Array.isArray(vg) || !Array.isArray(vg[0])) return;          // (l'ancien format, un seul vélo : pas d'ici)
    const E = this.velosEnLigne, Y = this.yard, dx = Monde.dx;
    let change = false;
    for (const g of vg) {
      if (!Array.isArray(g) || g.length < 5) continue;
      const [vid, x, z, cap, n] = g, b = typeof vid === 'string' ? this.velos.find((v) => v.id === vid) : null;
      if (!b || ![x, z, cap, n].every(Number.isFinite)) continue;
      if (x + dx < Y.xMin - 0.5 || x + dx > Y.xMax + 0.5 || z < Y.zMin - 0.5 || z > Y.zMax + 0.5) continue;
      const par = String(g[5] ?? id), no = Number.isFinite(g[6]) ? g[6] : 0, e = E.get(vid);
      const plusRecent = !e || n > e[4] || (n === e[4] && (par > e[5] || (par === e[5] && no > e[6])));
      if (!plusRecent) continue;
      E.set(vid, [vid, x, z, cap, n, par, no]); change = true;
      if (b.pris) continue;                 // on roule dessus : notre version, plus récente, partira à la descente
      if (this.user && this.user.velo && this.user.velo.v === b) continue;    // on en descend : il traînerait le joueur
      b.pos.set(x + dx, 0, z); b.cap = cap;
      b.garerSec();                         // sur sa béquille, guidon retombé : la pose garée (et le vélo fondu)
      if (this.mode === 'match') b.racine.visible = !this.veloSurTerrain(b);
    }
    if (change) this.presence.veloGare = [...E.values()];               // on les re-diffuse à notre tour
  }
  // Nouveau salon : on oublie les garages de l'ancien, et chaque vélo libre revient à sa place des données.
  remettreVelosEnLigne() {
    this.velosEnLigne.clear(); this.presence.veloGare = null;
    for (const d of [...Monde.velos, ...(this.scene.userData.trottinettesMonde || [])]) {      // (et les trottinettes, lot C4)
      const b = this.velos.find((v) => v.id === d.id);
      if (!b || b.pris) continue;
      b.pos.set(d.x + Monde.dx, 0, d.z); b.cap = (Number(d.cap) || 0) * Math.PI / 180;
      b.garerSec();
    }
  }

  // Sans animation (menu, match, retour en balade) : on se retrouve à côté, le vélo reste garé là.
  lacherVeloLocal() {
    for (const p of new Set([this.user, this.captain])) {
      if (!p || !p.velo) continue;
      const b = p.velo.v;
      if (!p.velo.sortir) { p.descendreVelo(); this.garerVelo(b); }
      p.lacherVelo();
      b.garerSec();
    }
    this.veloDescente = false; this._presVelo = false; this._blocageT = 0; this._blocageTxt = null;
    this._enginDispo = false;                         // (lot C4)
  }

  // ---------- balade libre ----------  // ---------- balade libre ----------
  updateLobby(dt) {
    const u = this.user, ball = this.ball;
    if (u) u.piloteHumain = true;
    u.hasBall = ball.holder === u; u.defending = false;
    // on vise le panier le plus proche
    if (u.state === 'idle') u.hoop = hdist(u.pos, HOOP_VEC[0]) < hdist(u.pos, HOOP_VEC[1]) ? HOOP_VEC[0] : HOOP_VEC[1];
    // déplacement relatif à la caméra GTA
    const a = this.setupOpen ? { x: 0, y: 0 } : this.input.axis();
    _dir.set(0, 0, 0);
    if (a.x || a.y) {
      _v.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
      _v2.set(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
      _dir.addScaledVector(_v, a.y).addScaledVector(_v2, a.x).normalize();
    }
    if (u.emote && (a.x || a.y || this.input.pressed('shoot'))) u.stopEmote();
    const enSelle = this.updateVelo(u, a, dt);
    if (!enSelle && !this._presVelo) this.updateBancs(u, a);
    // ALLURE. En balade on se promene : c'est ici que la marche sert le plus. Deux facons d'y passer —
    // la touche dediee, ou, au doigt, un manche pousse a moins de 58 % (comme sur une manette).
    u.marche = this.alluMarche();
    if (!enSelle) {
      u.move(_dir, this.input.sprint(), dt);
      this.croiserSiViraison();
      if (ball.holder === u && !this.pendingShot) this.handleBallInput(u, dt, _dir);
      else if (this.input.pressed('shoot') && !u.airborne && u.state === 'idle' && !u.emote && !u.assis) u.jump(2.6);
    }
    // marchand : on ne le traverse pas ; à portée -> il se tourne vers toi, indication et touche pour ouvrir la boutique
    if (this.merchant) {
      const m = this.merchant, dm = hdist(u.pos, m.pos);
      // On ne repousse pas le joueur d'un marchand ASSIS : il est sur le gradin, donc deja derriere la
      // boite d'obstacle du gradin. Le repousser en plus donnait un mur invisible au milieu du degagement.
      // à vélo c'est le vélo qui le contourne (il est dans ses obstacles) : repousser le joueur le décollerait de la selle
      if (dm < 0.85 && !m.assis && !u.velo) { const k = (0.85 - dm) / Math.max(dm, 0.05); u.pos.x += (u.pos.x - m.pos.x) * k; u.pos.z += (u.pos.z - m.pos.z) * k; }
      const near = dm < MERCHANT.reach && !this.setupOpen && !u.velo && !this._presVelo;
      if (near !== this.nearMerchant) { this.nearMerchant = near; this.cb.onNear?.(near); if (!near) this.hud.hint(this.lobbyHint()); }
      if (near) {
        // Assis, il ne pivote pas : il regarde le terrain, comme tout le monde sur un gradin. Le faire
        // tourner sur son banc l'aurait fait glisser de cote a chaque pas du joueur.
        if (!m.assis) m.faceTo(u.pos, true);
        this.hud.hint(`${actionKey('interact')} : parler au marchand · manger = boost pour ton prochain match · ballons et tenues`);
        if (this.input.pressed('interact')) this.cb.onShop?.();
      // cap de repos : celui que le terrain lui a donne (Becon et Levallois ne le tournent pas du meme cote)
      } else if (!m.assis) { _v.set(this.marchandPos.fx, 0, this.marchandPos.fz); m.faceWant.lerp(_v, 1 - Math.exp(-3 * dt)).normalize(); m.turnTo(m.faceWant, dt); }
    }
    if (!enSelle) this.updateEnginPerso(u);              // (lot C4) le skate ou la trottinette du sac
    u.update(dt);
    // hub en ligne : on annonce sa position et on fait vivre les avatars des autres
    this.presence.emit(u, dt, this.captain && this.captain.baseDef ? this.captain.baseDef.id : null, ball, this.tenueIds());
    if (this.demo) this.demo.update(dt);            // joueurs fictifs : voir le hub marcher sans serveur
    // (relecture C4) UNE TROTTINETTE ET UN SKATE D'AVANCE dès qu'on est en ligne : le premier cavalier distant prend ceux
    // de la réserve (Player.appliquerAnim) au lieu de les construire dans le gestionnaire de son paquet
    if (!this._glisseEnReserve && this.presence.actif) { this._glisseEnReserve = true; Trottinette.preparer(this.scene, 1); Skate.preparer(this.scene, 1); }
    this.presence.update(dt, this.camera.position);
    // l'indication annonce combien de joueurs sont sur le terrain : on la rafraîchit quand ça change
    if (this.presence.count !== this._nPres) {
      this._nPres = this.presence.count;
      if (this.triggerT <= 0 && !this.nearMerchant && !this.training.active) this.hud.hint(this.lobbyHint());
      // (04/10/2026) en ligne, le bouton du haut lance le match avec TOUS les joueurs du terrain : plus besoin de se
      // retrouver ensemble dans le cercle bleu
      const n = this.online ? this.joueursDispo().length : 0;
      if (this._btnPlay) this._btnPlay.textContent = n ? `JOUER AVEC ${n === 1 ? 'L’AUTRE JOUEUR' : `LES ${n} AUTRES`} ▶` : 'CHOISIR UN MATCH';
    }
    this.updatePendingShot();
    this.updateBall(dt);

    // panier marqué à l'entraînement
    if (ball.shot && !ball.shot.scored && ball.prevY > COURT.HOOP_Y && ball.pos.y <= COURT.HOOP_Y) {
      for (const hoop of HOOP_VEC) if (hdist(ball.pos, hoop) < COURT.RIM_R - 0.03) {
        ball.shot.scored = true; ball.shot.passedRim = true;
        ball.vel.x *= 0.25; ball.vel.z *= 0.25; ball.vel.y *= 0.45;
        const r = this.training.onBasket(ball.shot);
        if (r) {
          // atelier en cours : c'est lui qui note et qui paie
          this.hud.feedback(r.txt, r.coins ? 'good' : 'warn');
          this.reward(this.training.drill.name.toUpperCase(), r.coins, r.xp);
        } else {
          this.practice++; this.reward('PANIER', COINS.basket, XP.basket);
          this.hud.feedback(ball.shot.type === 'dunk' ? 'DUNK !' : ball.shot.rimHit ? 'DEDANS !' : 'SWISH !', 'good');
          this.hud.possession(`Paniers en balade : ${this.practice}`, false);
        }
        this.audio.swish(ball.shot ? ball.shot.shooter.hoop : null);
      }
    }
    // ramasser / récupérer la balle
    // (sur le relief, pas non plus une balle un mètre plus BAS que les pieds : au pied du mur des caves, sous le
    // joueur resté en haut. Sur un terrain plat la balle ne descend jamais sous BALL_R : la condition y est toujours vraie)
    if (ball.state === 'loose' && u.state === 'idle' && !u.emote && !u.velo && u.stun <= 0 && hdist(u.pos, ball.pos) < 0.9 && ball.pos.y - u.pos.y < 1.6 + u.jumpY && ball.pos.y - u.pos.y > -1) { if (ball.pos.y - u.pos.y < 0.7) u.pickupT = 0.55; ball.hold(u); }
    // Hors de la zone de balade du terrain (0,3 m de marge : 9,5 et 15,9 a La Cage, comme avant). Ecrit en
    // dur, le seuil rendait toute balle posee sur le terrain 2 du parc de Becon (x < -9,5) aussitot aux mains.
    // (seulement sur les terrains a grillage « solide » : les autres gardent 9,5 et 15,9)
    // (sur le relief, la règle est celle du grand monde : voir _balleRendueMonde)
    if (Monde.plat) { const Y = this.yard, m = 0.3, G = !!(this.scene.userData.reperes || {}).grillage;
      const dehors = G ? (ball.pos.x < Y.xMin - m || ball.pos.x > Y.xMax + m || ball.pos.z < Y.zMin - m || ball.pos.z > Y.zMax + m)
        : (Math.abs(ball.pos.x) > 9.5 || Math.abs(ball.pos.z) > 15.9);
      if (!u.velo && ball.state !== 'held' && (dehors || ball.pos.y < -1)) { ball.hold(u); this.hud.feedback('BALLE RÉCUPÉRÉE', 'info'); } }
    else this._balleRendueMonde(u, ball, dt);

    // ---- entraînement : le cercle orange ouvre le choix de l'atelier, puis l'atelier tourne au chrono ----
    if (this.training.active && !this.setupOpen && !this.paused) {
      const fin = this.training.update(dt, u);
      const T = this.training;
      this.hud.possession(`${T.drill ? T.drill.icon + ' ' + T.drill.name : ''} · ${Math.max(0, T.t).toFixed(0)} s · ${T.score} pts`, false);
      if (fin) this.endDrill(fin);
    } else {
      const dt2 = hdist(u.pos, TRAIN_POS);
      if (dt2 >= TRAIN_R) this.trainArmed = true;
      else if (this.trainArmed && !this.setupOpen && !u.velo) {
        this.trainArmed = false; this.hud.hint('');
        this.openDrillMenu();
        return;
      }
    }

    // cercle bleu : rester dedans 1 s ouvre le choix du match (il faut en ressortir pour le relancer)
    const d = hdist(u.pos, RING_POS);
    const inRing = d < RING.r;
    if (!inRing) this.ringArmed = true;
    if (inRing && this.ringArmed && !this.setupOpen && !this.training.active && !u.velo) {
      this.triggerT += dt;
      // En ligne, ceux qui sont dans le cercle avec toi partent au match : on les annonce pendant l'attente.
      const avec = this.online ? this.presence.inRing(RING_POS, RING.r + 0.6) : [];
      const qui = avec.length ? ` · avec ${avec.map((a) => a.nom).join(', ')}` : (this.online ? ' · seul dans le cercle' : '');
      this.hud.hint(`Choix du match dans ${Math.max(0, RING.hold - this.triggerT).toFixed(1)} s…${qui}`);
      if (this.triggerT >= RING.hold) {
        this.triggerT = 0; this.ringArmed = false; this.hud.hint('');
        this.cb.onSetup?.(avec);
        return;
      }
    } else if (this.triggerT > 0) { this.triggerT = 0; this.hud.hint(this.lobbyHint()); }
    const pulse = 0.65 + 0.3 * Math.sin(this.time * 4);
    const ud = this.ring.userData;
    ud.ring.material.opacity = inRing ? 1 : pulse;
    // (le faisceau est un ShaderMaterial additif : son opacite est l'uniforme uOpacite, voir _buildRing)
    ud.beam.material.uniforms.uOpacite.value = inRing ? 0.3 : 0.08 + 0.05 * Math.sin(this.time * 4);
    this.ring.scale.setScalar(inRing ? 1 + this.triggerT * 0.25 : 1);
    this.hud.stamina(u.stamina);
  }

  // BALLE RENDUE, DANS UN GRAND MONDE (js/monde.js ; jamais appelée sur un terrain plat). On peut dribbler dans tout
  // le parc : la balle n'est plus rendue parce qu'elle sort d'un rectangle, mais quand elle est vraiment perdue —
  // à plus de 30 m du joueur, dans l'eau (Seine, bassin), à plus d'un mètre sous le sol, ou immobile depuis 3 s là
  // où l'on ne marche pas (massif, talus).
  // (DANS l'eau, pas au-dessus : une balle lancée par-dessus la fontaine du jardin était rendue en plein vol, à deux
  // mètres de haut. Hors du parc — drapeau « balle perdue » sans eau —, elle l'est dès qu'elle passe la grille.)
  _balleRendueMonde(u, ball, dt) {
    if (u.velo || ball.state === 'held') { this._balleArretT = 0; return; }
    const f = Monde.drapeaux(ball.pos.x, ball.pos.z), ySol = Monde.sol(ball.pos.x, ball.pos.z);
    const coincee = ball.vel.lengthSq() < 0.01 && !(f & DRAPEAU.MARCHABLE);
    this._balleArretT = coincee ? (this._balleArretT || 0) + dt : 0;
    const perdue = (f & DRAPEAU.EAU) ? ball.pos.y < ySol + 0.5 : (f & DRAPEAU.BALLE_PERDUE);
    if (hdist(u.pos, ball.pos) > 30 || perdue || ball.pos.y < ySol - 1 || this._balleArretT > 3) {
      this._balleArretT = 0;
      ball.hold(u); this.hud.feedback('BALLE RÉCUPÉRÉE', 'info');
    }
  }

  // Remise en jeu : l'attaque étalée dans sa moitié offensive (porteur au centre), chaque défenseur devant son vis-à-vis
  resetPossession(offIdx, fromZ = null) {
    this.offense = offIdx;
    const off = this.teams[offIdx], def = this.teams[1 - offIdx];
    const s = off.hoop.sgn; // l'attaque va vers z = s * 12,4
    const N = this.teamSize;
    // porteur : le capitaine (équipe du joueur) ou le meilleur dribbleur (ordinateur)
    let handler = offIdx === 0 ? this.captain : off.players.reduce((a, b) => (b.def.hdl > a.def.hdl ? b : a), off.players[0]);
    // demi-terrain : on « sort la balle » au-dessus de l'arc au lieu de repartir de sa propre ligne de fond
    // coup d'envoi : a 4,4 m devant son propre cercle (8 m du centre sur 28 m) — une cote fixe mettait le
    // porteur SOUS son panneau sur un terrain de 18 m
    // (petits terrains seulement, L < 20 : ailleurs rien ne bouge)
    const petit = COURT.L < 20;
    const z0 = this.half ? HALF_CHECK_Z : (fromZ === null ? -s * (petit ? Math.abs(COURT.HOOP_Z) - 4.4 : 8) : fromZ);
    const kW = petit ? COURT.W / 15 : 1, lateral = [0, -3.6 * kW, 3.6 * kW, -6.2 * kW, 6.2 * kW];
    const others = off.players.filter((p) => p !== handler);
    const B = this.bounds || BOUNDS;
    // remise depuis la ligne de fond : a cote de l'axe quand le poteau du panier est dans le terrain
    const remiseX = (fromZ !== null && !this.half) ? ((this.scene.userData.reperes || {}).remiseX || 0) : 0;
    handler.pos.set(remiseX, 0, z0);
    others.forEach((p, i) => { p.pos.set(lateral[i + 1], 0, clamp(z0 + s * (2.5 + (i > 1 ? 1.5 : 0)), B.zMin + 0.5, B.zMax - 0.5)); });
    off.players.forEach((p) => { p.pos.x = clamp(p.pos.x, B.xMin + 0.5, B.xMax - 0.5); p.pos.z = clamp(p.pos.z, B.zMin + 0.5, B.zMax - 0.5); });
    // défenseurs : vis-à-vis par ordre (le premier défend le porteur)
    const attackers = [handler, ...others];
    def.players.forEach((p, i) => {
      const a = attackers[i % N];
      // le défenseur se place entre son vis-à-vis et le panier attaqué
      const dz = this.half ? (i === 0 ? 2.2 : 1.4) : (i === 0 ? 6 : 1.8);
      p.pos.set(a.pos.x * 0.9, 0, clamp(a.pos.z + s * dz, B.zMin + 0.4, B.zMax - 0.4));
    });
    for (const p of this.players) { p.jumpY = 0; p.jumpVel = 0; p.airborne = false; p.state = 'idle'; p.windup = 0; p.stun = 0; p.spinT = 0; p.crossT = -1; p.released = false; p.stopEmote(); }
    for (const p of off.players) p.faceTo(off.hoop, false, true);                 // (replacés : face au jeu d'un coup)
    def.players.forEach((p, i) => p.faceTo(attackers[i % N].pos, false, true));
    this.ball.hold(handler); this.pendingShot = null; this.passeEnAttente = null;
    this.shotClock = SHOT_CLOCK;
    // remise en jeu au check : la balle part déjà de derrière l'arc, rien à ressortir (voir majSortie). Et la feinte
    // repaie dans la nouvelle possession — au 1 contre 1 sans rebond, la balle ne change plus de mains que par ici.
    this.aSortir = -1; this.fakePaid = false;
    this.hud.hint(''); this.hud.meter(false);
    for (const ai of this.ais.values()) ai.newPossession();
    if (offIdx === 0) this.setControlled(handler);
    this.updateMarks(); this.markT = 0.4;
  }

  // ---------- contrôle joueur ----------
  // actions balle en main (partagées balade / match) : tir, jauge, spin, crossover, passe
  handleBallInput(u, dt, dir, inp = this.input) {
    const ball = this.ball;
    const sp = inp.pressed('shoot'), sr = inp.released('shoot');
    if (u.state === 'windup') {
      u.windup += dt / METER_TIME;
      const { center, half } = this.meterZone(u);
      if (u === this.user) this.hud.meter(true, u.windup, center, half);
      // tir demandé pendant un step-back et touche déjà relâchée : lâcher au bon moment
      if (u.tirAuto && u.windup >= center) { u.tirAuto = false; this.doShot(u, { timing: u.windup }); return; }
      // Relâcher dans le tout début de l'armé n'est plus un tir raté : c'est une FEINTE. C'est la brique qui
      // manquait pour qu'il y ait un duel avec le défenseur plutôt qu'un simple minutage.
      if (sr && u.windup < 0.26) this.pumpFake(u);
      else if (sr || u.windup >= 1.08) this.doShot(u, { timing: u.windup });
    } else if (u.state === 'idle') {
      // BALLE À SORTIR (demi-terrain, voir majSortie) : ni tir, ni layup, ni dunk tant que l'équipe n'est pas
      // ressortie derrière l'arc. L'appui ne lance rien : il rappelle la règle.
      if (sp && this.doitSortir(u)) this.refuserTir(u);
      // STEP-BACK : un tir demandé pendant le saut arrière part à la fin du geste
      else if (sp && u.stepT > 0) u.tirTampon = true;
      else if (sp && !u.airborne && u.stun <= 0) {
        if (hdist(u.pos, u.hoop) < 2.0) this.doShot(u, { instant: true });
        else u.demanderArme();
      }
      if (u.tirTampon && !(u.stepT > 0)) {
        u.tirTampon = false;
        if (this.doitSortir(u)) this.refuserTir(u);
        else { u.demanderArme(); if (!inp.down('shoot')) u.tirAuto = true; }
      }
      // relâché avant que la balle soit revenue dans la main : c'est une feinte, comme un relâcher précoce
      if (sr && u.tirAttenteT > 0) { u.tirAttenteT = 0; this.pumpFake(u); }
      if (inp.pressed('spin')) u.demanderSpin();
      // FEINTE / DRIBBLE (H, bouton FEINTE) : geste selon la situation ; maintenue à l'arrêt, size-up
      if (inp.pressed('dribble')) this.gesteDribble(u, dir);
      else if (inp.down('dribble') && u.dribbleMoveT > 0) u.dribbleMoveT = Math.max(u.dribbleMoveT, 0.35);
      u.hTenu = inp.down('dribble') ? (u.hTenu || 0) + dt : 0;
      u.sizeUp = u.hTenu > 0.35 && u.speedNow < 0.8;
      if (inp.pressed('legs') && u.startMove('legs', ball.pos)) { u.gesteManuelT = 0.8; this.tryAnkle(u); }
      if (inp.pressed('behind') && u.startMove('back', ball.pos)) { u.gesteManuelT = 0.8; this.tryAnkle(u); }
      if (inp.pressed('pass') && this.mode === 'match' && this.teamSize > 1 && !u.airborne && u.stun <= 0 && u.crossT < 0 && u.spinT <= 0) {
        const t = this.passTargetForInput(u, dir);
        if (t) this.passBall(u, t);
      }
      // D'ABORD le grand crossover : s'il part à l'opposé de son défenseur, c'est lui qu'on veut voir, pas
      // le changement de main de routine. startMove refuse tout seul si un geste est déjà en cours.
      this.croiserDevant(u, dir);
      // crossover automatique quand on change de côté par rapport au panier — pas juste après un geste
      // demandé (il défaisait l'in-and-out dès la fin du geste)
      if (dir.lengthSq() > 0.01 && u.spinT <= 0 && !(u.gesteManuelT > 0)) {
        _v.set(u.hoop.x - u.pos.x, 0, u.hoop.z - u.pos.z).normalize();
        const lat = dir.x * -_v.z + dir.z * _v.x;
        if (lat > 0.5 && u.dribbleHand === 'L') u.switchHand(ball.pos);
        else if (lat < -0.5 && u.dribbleHand === 'R') u.switchHand(ball.pos);
      }
      // ... sauf en appui dos au panier : c'est tout l'inverse qu'on veut, et ce recadrage-là annulait le
      // retournement du pivot à chaque image.
      if (dir.lengthSq() < 0.01 && this.mode === 'match' && u.postT <= 0) {
        if (u.pression && u.dribble && u.dribble.controle) {
          // PROTÉGÉ DE PROFIL : sous pression, on présente l'épaule — le cap vise le cercle, tourné de 0,55 rad
          // du côté de la balle : le corps se met entre elle et le défenseur
          _v.set(u.hoop.x - u.pos.x, 0, u.hoop.z - u.pos.z).normalize();
          const sb = u.dribbleHand === 'L' ? 1 : -1, c = Math.cos(0.55), sn = Math.sin(0.55) * sb;
          _v2.set(u.pos.x + (_v.x * c + _v.z * sn) * 3, 0, u.pos.z + (_v.z * c - _v.x * sn) * 3);
          u.faceTo(_v2, true);
        } else u.faceTo(u.hoop, true);
      }
    }
  }

  // TOUCHE DE FEINTE, contextuelle. Lancé : manche vers le côté de la balle = in-and-out, vers l'autre côté
  // = crossover, tout droit = hésitation (ou pound au trot). Manche vers l'arrière : step-back si un
  // défenseur colle, sinon recul protégé. À l'arrêt : pound (maintenue : size-up).
  gesteDribble(u, dir) {
    if (!u.dribble || !u.dribble.controle) { u.startDribbleMove(1.4); return; }
    const f = u.facing, cote = u.dribbleHand === 'L' ? 1 : -1;
    const lat = (dir.x * f.z - dir.z * f.x) * cote;          // > 0 : vers le côté de la balle
    const av = dir.x * f.x + dir.z * f.z;
    let type = 'pound';
    if (dir.lengthSq() > 0.25 && av < -0.5) {
      // vers l'arrière : STEP-BACK si un défenseur colle devant, sinon recul protégé
      const o = this.nearestOpponent(u);
      const colle = o && hdist(u.pos, o.pos) < 1.6 && ((o.pos.x - u.pos.x) * f.x + (o.pos.z - u.pos.z) * f.z) > 0;
      type = colle ? 'step' : 'retr';
    } else if (u.speedNow > 1.5 && dir.lengthSq() > 0.25) type = lat > 0.4 ? 'inout' : lat < -0.4 ? 'cross' : u.speedNow > 2.5 ? 'hesi' : 'pound';
    if (u.startMove(type, this.ball.pos)) u.gesteManuelT = 0.8;
  }

  // Vrai quand le joueur demande l'allure de marche : touche dediee, ou manche tactile a peine pousse.
  // Le sprint gagne toujours — on ne veut pas d'un sprint bride par un doigt mal place.
  alluMarche(inp = this.input) {
    if (inp.sprint()) return false;
    if (inp.down('walk')) return true;
    const amp = inp.amplitude();
    return amp > 0.02 && amp < 0.58;
  }

  // `pil` : un joueur EN LIGNE (js/enligne.js). Ses commandes ont la même forme que celles du clavier ; seule
  // la direction arrive déjà tournée dans le monde, puisque c'est SA caméra qui la définit.
  controlUser(dt, pil = null) {
    const u = pil ? pil.user : this.user, ball = this.ball, inp = pil ? pil.input : this.input;
    let bouge = false;
    _dir.set(0, 0, 0);
    if (pil) { _dir.copy(inp.dir); bouge = _dir.lengthSq() > 1e-4; }
    else {
      // déplacement relatif à la caméra
      const a = inp.axis();
      if (a.x || a.y) {
        _v.subVectors(this.lookCur, this.camera.position); _v.y = 0; _v.normalize();     // avant
        _v2.set(-_v.z, 0, _v.x);                                                          // droite
        _dir.addScaledVector(_v, a.y).addScaledVector(_v2, a.x).normalize();
        bouge = true;
      }
    }
    if (u.emote && (bouge || inp.pressed('shoot') || inp.pressed('pass'))) u.stopEmote();
    // Allure de marche : plafonne la vitesse à la foulée du clip de marche. Le sprint reste prioritaire.
    u.marche = this.alluMarche(inp);
    u.move(_dir, inp.sprint(), dt);
    // Le coup d'épaule est lu AVANT les branches balle/défense : il sert des deux côtés du terrain.
    // UNE touche, DEUX gestes selon la situation, comme sur les jeux de basket : un appui bref écarte
    // l'adversaire qu'on a devant soi ; la même touche MAINTENUE, balle en main et défenseur dans le dos,
    // c'est l'appui du pivot — on le repousse vers le cercle jusqu'à ce qu'il lâche ou qu'il tombe.
    const dansLeDos = this.cibleAppui(u);
    if (inp.down('bump') && !u.emote && ball.holder === u && dansLeDos) this.adosser(u, dansLeDos, dt);
    else { u.postCumul = 0; if (inp.pressed('bump') && !u.emote) this.bumpContact(u); }

    const h = ball.holder, ps = this.pendingShot;
    const oppShooter = ps && ps.shooter.team !== u.team ? ps.shooter : null;
    if (h === u && !ps && !(this.passeEnAttente && this.passeEnAttente.passer === u)) {   // (passe armée : plus d'ordre jusqu'au lâcher)
      // ATTENTION À L'ORDRE. `pressed()` CONSOMME le front : un appui n'est lu qu'une fois, sinon le pas de temps
      // fixe le rejouait jusqu'à six fois de suite. Du coup, lire `pressed('shoot')` ici pour le défenseur
      // MANGEAIT l'appui avant que handleBallInput ne le voie : en match, balle en main, la touche de tir ne
      // faisait plus rien du tout. En balade ça marchait, parce que là on appelle handleBallInput en premier.
      // On ne lit donc l'appui que dans la branche qui s'en sert vraiment.
      this.handleBallInput(u, dt, _dir, inp);
    } else if ((h && h.team !== u.team) || oppShooter) {
      const target = oppShooter || h;
      // Défense : on reste FACE au porteur, comme dans un vrai un-contre-un. Sans ça, le cap du joueur restait
      // celui qu'il avait en attaque, un pas de côté était compté comme un pas en arrière (`backward` ≈ 1,
      // `lateral` ≈ 0) et l'avatar partait en course au lieu de faire des pas chassés : c'est pour ça qu'on
      // n'avait « aucune animation de défense ».
      // ... mais seulement quand on est VRAIMENT sur lui. Au-delà de 5,5 m on est en train de revenir en
      // défense : là on court normalement, face à sa course, comme dans tous les jeux de basket.
      if (!u.airborne && u.stun <= 0 && !u.emote && u.state === 'idle' && hdist(u.pos, target.pos) < 5.5) u.faceTo(target.pos, true);
      const sp = inp.pressed('shoot') && !u.emote;
      if (sp && u.stun <= 0 && !u.airborne) {
        const dd = hdist(u.pos, target.pos);
        if (ps && !ps.shooter.released && dd < 1.5) {
          u.jump(3.0);
          const bb = (u.badgeFx && u.badgeFx.block) || 0;
          if (this.rnd() < clamp(0.10 + (u.def.def / 100) * 0.25 + (u.h - target.h) * 0.5 + bb, 0.05, 0.45)) ps.blocked = true;
        } else if (target.state === 'windup' && dd < 2.3) u.jump(3.0);
        else if (dd < 1.4) this.attemptSteal(u, target);
        else u.jump(2.2);
      }
    } else if (inp.pressed('shoot') && !u.emote && !u.airborne && u.state === 'idle' && h !== u) u.jump(2.4);
    // (h === u ici : la passe armée, voir plus haut. L'appui de tir est lu — sinon il attendrait la fin de la passe et
    // ferait sauter après coup — mais le passeur ne saute plus avec la balle en main.)
    // passe en l'air vers moi : je vais la chercher tout seul si je ne bouge pas
    if (ball.pass && ball.pass.to === u && _dir.lengthSq() < 0.01 && u.state === 'idle') this.ais.get(u).receive(dt);
  }

  // Demi-largeur de la zone verte. UNE seule définition : elle était recopiée à trois endroits, et la zone
  // affichée pouvait diverger de la zone réellement notée.
  static meterHalf(st, shooter) {
    let h = 0.035 + (st / 100) * 0.045;
    if (shooter) h *= 0.82 + 0.18 * Math.min(1, shooter.stamina / 55);   // bras lourds : la fenêtre se resserre
    if (shooter && shooter.badgeFx) h *= 1 + (shooter.badgeFx.meter || 0);
    return h;
  }

  meterZone(p) {
    const st = isThree(p.pos, p.hoop) ? p.def.tp : p.def.mid;
    return { center: PERFECT_CENTER, half: Game.meterHalf(st, p) };
  }

  // ---------- passes ----------
  // score d'un coéquipier comme cible de passe : démarqué, ligne de passe libre, bien placé (0..1)
  passScore(passer, t) {
    if (t === passer || t.team !== passer.team || t.state !== 'idle' || t.airborne || t.stun > 0) return -1;
    const d = hdist(passer.pos, t.pos);
    if (d < 1.2 || d > 13) return -1;
    let open = Infinity, lane = 1;
    const dx = t.pos.x - passer.pos.x, dz = t.pos.z - passer.pos.z;
    for (const o of this.opponents(passer)) {
      open = Math.min(open, hdist(o.pos, t.pos));
      // distance de l'adversaire à la ligne de passe
      const u = clamp(((o.pos.x - passer.pos.x) * dx + (o.pos.z - passer.pos.z) * dz) / (d * d), 0, 1);
      const lx = passer.pos.x + dx * u, lz = passer.pos.z + dz * u;
      const dl = Math.hypot(o.pos.x - lx, o.pos.z - lz);
      if (u > 0.08 && u < 0.92 && dl < 0.8) lane = Math.min(lane, dl / 0.8);
    }
    const hoop = passer.hoop, progress = clamp((hdist(passer.pos, hoop) - hdist(t.pos, hoop)) / 6, -1, 1);
    let s = 0.5 * clamp(open / 3, 0, 1) + 0.4 * lane + 0.1 * (0.5 + progress * 0.5);
    if (d > 9) s *= 0.7;
    return s;
  }
  bestPassTarget(passer) {
    let best = null, bs = 0;
    for (const t of this.teammates(passer)) { const s = this.passScore(passer, t); if (s > bs) { bs = s; best = t; } }
    return best ? { p: best, score: bs } : null;
  }
  // passe du joueur : coéquipier dans la direction poussée (ZQSD), sinon le mieux démarqué
  passTargetForInput(u, dir) {
    let best = null, bs = -Infinity;
    for (const t of this.teammates(u)) {
      if (t === u || t.state !== 'idle' && t.state !== 'celebrate') continue;
      let s = this.passScore(u, t); if (s < 0) s = 0.05;
      if (dir.lengthSq() > 0.01) { _v.set(t.pos.x - u.pos.x, 0, t.pos.z - u.pos.z).normalize(); s += 1.5 * Math.max(0, _v.dot(dir)); }
      if (s > bs) { bs = s; best = t; }
    }
    return best;
  }
  passBall(passer, receiver) {
    const ball = this.ball;
    if (ball.holder !== passer || this.pendingShot || this.passeEnAttente) return;
    // LE LÂCHER ATTEND LE GESTE (06/10/2026). La balle partait à l'image même de l'ordre, pendant que le bras du
    // passeur commençait tout juste à armer : elle quittait une main encore le long du corps. Elle part maintenant
    // à l'instant où le clip de passe lance (`release` du manifeste, environ 0,15 à 0,2 s), et vise le receveur là
    // où il sera à CE moment-là.
    _v.set(receiver.pos.x - passer.pos.x, 0, receiver.pos.z - passer.pos.z);
    passer.faceTo(_v.add(passer.pos), true); passer.visePasse.copy(passer.faceWant); passer.state = 'idle'; passer.windup = 0; passer.crossT = -1; passer.armerPasse(0.42);
    const delai = passer.delaiPasse();
    if (delai > 0) { this.passeEnAttente = { passer, receiver, t: this.time + delai }; return; }
    this.lancerPasse(passer, receiver);
  }
  // Quitter le match (balade, menu) annule la passe armée : sinon elle partait en balade, du capitaine vers un
  // coéquipier caché hors du terrain.
  annulerPasseArmee() {
    if (this.passeEnAttente) this.passeEnAttente.passer.passeArmee = null;
    this.passeEnAttente = null;
  }
  // Le lâcher, au bout du geste (voir updatePendingShot). Annulé si la balle a changé de mains entre-temps (vol).
  passerSiPret() {
    const pp = this.passeEnAttente;
    if (!pp || this.time < pp.t) return;
    this.passeEnAttente = null; pp.passer.passeArmee = null;
    if (this.ball.holder === pp.passer && pp.passer.state === 'idle' && !pp.passer.auSol && !this.pendingShot) this.lancerPasse(pp.passer, pp.receiver);
  }
  lancerPasse(passer, receiver) {
    const ball = this.ball;
    // point de réception : position prévue du receveur (il continue sa course), hauteur poitrine
    const d = hdist(passer.pos, receiver.pos), T = clamp(d / 10, 0.22, 1.15);
    const lead = receiver.speedNow * T * 0.8;
    const target = new THREE.Vector3(receiver.pos.x + receiver.facing.x * lead, 1.25, receiver.pos.z + receiver.facing.z * lead);
    target.x = clamp(target.x, BOUNDS.xMin, BOUNDS.xMax); target.z = clamp(target.z, BOUNDS.zMin, BOUNDS.zMax);
    // La passe part d'où est RÉELLEMENT la balle : la remonter d'office à 1,10 m la téléportait quand on
    // passait au milieu d'un dribble (et une passe partie basse, c'est une passe à terre — ça existe).
    const from = ball.pos.clone(); from.y = Math.max(from.y, BALL_R + 0.02);
    passer.faceTo(target, true); passer.visePasse.copy(passer.faceWant);
    if (!(passer.passT > 0)) { passer.state = 'idle'; passer.windup = 0; passer.crossT = -1; passer.armerPasse(0.42); }
    ball.throwPass(from, target, T, passer, receiver);
    this.audio.pass(from);
    this.hud.meter(false);
    if (passer.team === 0 && this.teamSize > 1) this.hud.feedback(`PASSE → ${receiver.def.name.toUpperCase()}`, 'info');
  }
  // réception / interception d'une passe en vol (appelé par rules)
  updatePass() {
    const ball = this.ball, P = ball.pass;
    if (!P || ball.state !== 'flight') return;
    for (const p of this.players) {
      if (p === P.from || p.stun > 0 || p.state !== 'idle') continue;
      if (p.team !== P.team && (P.t < 0.2 || hdist(ball.pos, P.from.pos) < 1.8)) continue;    // le défenseur collé au passeur ne coupe pas la balle au départ
      const reach = p === P.to ? 1.2 : p.team === P.team ? 0.7 : 0.5;
      if (hdist(p.pos, ball.pos) > reach || ball.pos.y > 2.3 + p.jumpY + (p.h - 1.85) || ball.pos.y < 0.15) continue;
      if (p.team === P.team) {
        ball.hold(p); this.audio.catchBall(ball.pos);
        p.recevoir(0.38);                                  // geste de réception à deux mains (mocap CMU 141_10)
        if (P.from !== p) { p.assistFrom = 2.6; P.from.assistTo = p; }   // un panier dans la foulée = passe décisive
        if (p.team !== this.offense) this.changePossession(p.team, p.team === 0 ? 'À TOI' : 'BALLE ADVERSE');
        return;
      }
      // adversaire sur la trajectoire : une seule tentative par défenseur -> interception (selon sa défense), déviation, ou la balle passe
      P.tried = P.tried || new Set();
      if (P.tried.has(p)) continue;
      P.tried.add(p);
      let c = 0.06 + (p.def.def / 100) * 0.22; if (p.team === 1 && !p.humain) c *= this.diff.aggro;
      c -= (P.from.badgeFx && P.from.badgeFx.pass) || 0;                           // « Meneur de jeu »
      c = clamp(c, 0.04, 0.5);
      const roll = this.rnd();
      if (roll >= c + 0.1) continue;                                           // la balle lui passe à côté
      if (roll < c) {
        ball.hold(p); p.stun = 0;
        this.changePossession(p.team, p.team === 0 ? 'INTERCEPTION !' : 'PASSE INTERCEPTÉE !');
        this.reward('INTERCEPTION', 4, 3, p.team === 0);
        this.audio.block(); this.addShake(0.05, 0.3);
        if (p.team === 0) { this.audio.cheer(); this.audio.swell(0.45, 1.4); this.addMomentum('user', 0.25); }
        else { this.audio.boo(); this.addMomentum('cpu', 0.2); }
      } else {
        _v.set(ball.vel.x, 0, ball.vel.z).normalize();
        ball.deflect(ball.pos, _v, p); this.audio.bounce(0.4, ball.pos);
        this.hud.feedback('PASSE DÉVIÉE', 'warn');
      }
      return;
    }
  }

  // ---------- tir ----------
  timingFactor(t, stat, shooter) {
    if (t === null || t === undefined) return { f: 0.7, label: '' };
    const c = PERFECT_CENTER, hw = Game.meterHalf(stat, shooter), e = Math.abs(t - c);
    if (t > 1.0) return { f: 0.15, label: 'TROP TARD' };
    // un lâcher parfait ne se contente plus de ne pas pénaliser : il donne un vrai bonus, comme le green release de 2K
    if (e <= hw * 0.45) return { f: 1.14, label: 'PARFAIT !', green: true };
    if (e <= hw) return { f: 1.0, label: 'BON LÂCHER' };
    if (e < 0.17) return { f: 0.8 - ((e - hw) / (0.17 - hw)) * 0.4, label: t < c ? 'UN PEU TÔT' : 'UN PEU TARD' };
    return { f: 0.25, label: t < c ? 'TROP TÔT' : 'TROP TARD' };
  }

  // Perte d'adresse avec la distance. Plein pot dans la zone de confort, puis chute continue : un tir du parking
  // reste possible mais coûte cher. Une capacité de portée repousse un peu la limite.
  rangeFactor(d, three, shooter) {
    const ref = three ? RANGE.threeRef : RANGE.midRef, k = three ? RANGE.threeK : RANGE.midK;
    const bonus = shooter && shooter.badgeFx ? shooter.badgeFx.range || 0 : 0;
    return Math.max(RANGE.floor, 1 - Math.max(0, d - ref - bonus) * k);
  }

  // Contacts entre joueurs : deux corps ne se traversent plus. C'est ce qui rend possibles la protection de balle,
  // la pénétration en force et le box-out au rebond. La poussée est consommée par move() dans la même image.
  updateContacts() {
    const P = this.players, R = 0.34;    // demi-largeur d'épaules : à 0,42 le marquage serré devenait une bagarre permanente
    for (let i = 0; i < P.length; i++) {
      const a = P[i];
      if (!a.mesh.visible) continue;
      for (let j = i + 1; j < P.length; j++) {
        const b = P[j];
        if (!b.mesh.visible) continue;
        if (Math.abs(a.jumpY - b.jumpY) > 0.9) continue;         // l'un passe au-dessus de l'autre
        let dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > R * R * 4 || d2 < 1e-6) continue;
        const d = Math.sqrt(d2), pen = R * 2 - d;
        if (pen <= 0) continue;
        dx /= d; dz /= d;
        // le plus grand, celui qui a la balle et celui qui sprinte cèdent moins de terrain
        const ma = a.h * (a.hasBall ? 1.35 : 1) * (a.sprinting ? 1.2 : 1);
        const mb = b.h * (b.hasBall ? 1.35 : 1) * (b.sprinting ? 1.2 : 1);
        const f = pen * 55;                                    // m/s² : la séparation monte en puissance avec l'enfoncement
        a.push.x -= dx * f * (mb / (ma + mb)); a.push.z -= dz * f * (mb / (ma + mb));
        b.push.x += dx * f * (ma / (ma + mb)); b.push.z += dz * f * (ma / (ma + mb));
        if (pen > 0.3 && (a.hasBall || b.hasBall)) { a.contactT = 0.2; b.contactT = 0.2; }
      }
    }
  }

  // ---------- coup d'épaule ----------
  // Le contact existait déjà, mais seulement SUBI : deux corps qui se repoussent quand ils s'enfoncent l'un dans
  // l'autre. Il manquait le contact VOULU — celui qui sert à écarter un défenseur pour prendre son tir, ou à
  // sortir un attaquant de sa position sous le cercle. C'est une touche à part, utilisable balle en main ou non.
  //
  // Le rapport de force décide de tout : gabarit, jeu intérieur, défense et fraîcheur. Un petit meneur qui charge
  // un pivot frais se fait rebondir dessus ; l'inverse écarte franchement. Personne n'est invulnérable et
  // personne n'envoie l'autre à l'autre bout du terrain.
  static forceContact(p) {
    return (p.h - 1.55) * 1.7
      + ((p.def.in || 60) / 100) * 0.9          // jeu intérieur : c'est la stat du corps à corps
      + ((p.def.def || 60) / 100) * 0.7
      + Math.min(1, p.stamina / 60) * 0.5
      + ((p.badgeFx && p.badgeFx.contact) || 0) * 1.2;
  }

  // Le défenseur qui BARRE LE CHEMIN DU CERCLE, à portée de corps : voilà la cible d'un appui.
  // Premier réflexe : chercher celui qu'on a « dans le dos », par rapport au cap du joueur. C'était faux, et
  // la mesure l'a montré tout de suite — en match, un porteur immobile se remet FACE AU PANIER à chaque
  // image (handleBallInput). Son dos est donc toujours tourné au cercle, jamais au défenseur, et la cible
  // n'existait littéralement jamais. Le bon repère n'est pas le joueur, c'est le PANIER : le défenseur du
  // poste bas est celui qui se trouve entre le porteur et l'anneau. Se retourner vient APRÈS, c'est la
  // conséquence du geste (voir adosser), pas sa condition.
  cibleAppui(p) {
    if (!p.hoop || p.stun > 0 || p.airborne || p.auSol || p.emote || p.state !== 'idle') return null;
    _v2.set(p.hoop.x - p.pos.x, 0, p.hoop.z - p.pos.z);
    if (_v2.lengthSq() < 1e-4) return null;
    _v2.normalize();
    // 1,9 m et pas 1,7 : le defenseur recule pendant qu'on pousse, et a 1,7 le contact se rompait pile au
    // moment ou l'appui commencait a payer — la lutte repartait de zero indefiniment.
    let cible = null, bd = 1.9;
    for (const o of this.opponents(p)) {
      if (!o.mesh.visible || o.auSol || Math.abs(o.jumpY - p.jumpY) > 0.9) continue;
      const d = hdist(p.pos, o.pos);
      if (d > bd) continue;
      _v.set(o.pos.x - p.pos.x, 0, o.pos.z - p.pos.z).normalize();
      if (_v.dot(_v2) < 0.35) continue;                       // il doit barrer la route du cercle
      bd = d; cible = o;
    }
    return cible;
  }

  // APPUI DOS AU PANIER. Le geste du pivot : on tourne le dos à son défenseur, on rentre dedans et on gagne
  // du terrain vers le cercle, centimètre par centimètre. Ce n'est pas un coup — c'est une lutte qui dure, et
  // qui coûte du souffle aux deux. Le rapport de force décide de la vitesse à laquelle on avance ; au bout de
  // plus d'une seconde d'appui gagnant, le défenseur finit par céder et tomber.
  adosser(p, cible, dt) {
    p.postCumul += dt;
    p.postT = Math.max(p.postT, 0.25);                        // maintient l'animation de poussée
    // Arrivé sous le cercle, on ne pousse plus : on garde sa place et on se retourne pour marquer. C'est la
    // récompense du geste, et sans cette borne le pivot traversait la raquette et sortait de l'autre côté.
    const dh = hdist(p.pos, p.hoop);
    // (balle à sortir : pas de « lâche et tire » — le tir serait refusé, et le rappel de la règle doit rester affiché)
    if (p === this.user && !this.doitSortir(p)) this.hud.hint(dh < 1.7 ? 'tu es sous le cercle — lâche et tire !' : 'appui dos au panier — maintiens pour gagner ta place, lâche pour tirer');
    if (dh < 1.5) return;
    _v.set(cible.pos.x - p.pos.x, 0, cible.pos.z - p.pos.z).normalize();
    // DOS AU PANIER. C'est le geste lui-même : on tourne le dos au cercle et on rentre dans le défenseur.
    // Le cap est imposé ici, image par image, parce que le reste du jeu remet sans cesse le porteur face
    // à l'anneau — et un pivot qui poste de face, ce n'est plus un appui, c'est une charge.
    p.faceWant.set(-_v.x, 0, -_v.z); p.turnTo(p.faceWant, dt);
    // bras-barre du côté où se trouve le défenseur (il n'est jamais pile dans l'axe)
    p.postSens = (_v.x * -p.facing.z + _v.z * p.facing.x) >= 0 ? 1 : -1;
    const rapport = clamp(Game.forceContact(p) / Math.max(0.4, Game.forceContact(cible)), 0.5, 1.9);
    // on avance à reculons, lui recule : la différence est ce qu'on gagne réellement
    const gain = clamp((rapport - 0.85) * 1.5, -0.3, 1.6);
    // LES DEUX AVANCENT, presque a la meme vitesse. C'est le point que j'avais rate : le defenseur reculait
    // a 1,6 m/s et le porteur n'avancait qu'a 0,7 — l'ecart se creusait de presque un metre par seconde, le
    // contact etait rompu au bout d'une demi-seconde et la lutte s'arretait toujours avant d'avoir donne
    // quoi que ce soit. Un poste bas, c'est deux corps colles qui derivent ensemble vers le cercle ; le
    // porteur ne GAGNE que les quelques centimetres par seconde d'ecart entre les deux.
    // Le porteur avance A LA MAIN et non par la vitesse : move() a deja tourne cette image, et il ecrase la
    // vitesse a zero des qu'on ne pousse pas sur une direction — l'elan aurait ete efface aussitot.
    p.pos.x += _v.x * gain * 1.35 * dt; p.pos.z += _v.z * gain * 1.35 * dt;
    // Le defenseur, lui, recoit bien une vitesse : il est sonne (stun), donc son elan retombe en 0,45 s au
    // lieu d'une image, et il recule vraiment.
    cible.vel.set(_v.x * Math.max(0, gain) * 1.5, 0, _v.z * Math.max(0, gain) * 1.5);
    cible.stun = Math.max(cible.stun, 0.12);
    cible.contactT = 0.3;
    p.contactT = 0.3;                                          // balle protégée : pas de vol pendant l'appui
    p.stamina = Math.max(0, p.stamina - 9 * dt);
    cible.stamina = Math.max(0, cible.stamina - 7 * dt);
    // Il cède. C'est le seul moyen de mettre quelqu'un au sol sans coup d'épaule, et il faut le mériter :
    // plus d'une seconde d'appui, et un vrai avantage de gabarit ou de jeu intérieur.
    if (p.postCumul > 1.15 && rapport > 1.18 && this.rnd() < 0.9 * dt * (rapport - 1.0) * 12) {
      this.mettreAuSol(cible, _v.x, _v.z, rapport - 0.35);
      p.postCumul = 0;
      if (p.team === 0) { this.hud.feedback('IL EST AU TAPIS !', 'good'); this.reward('APPUI', 3, 2); }
      else this.hud.feedback('IL T’A POSTÉ', 'bad');
      this.addShake(0.14, 0.26);
    }
  }

  // Mettre un joueur au sol, et lui faire lâcher la balle si c'est lui qui l'avait. Un seul endroit : la
  // chute est jouée par le joueur (js/player.js), la balle est l'affaire du jeu.
  mettreAuSol(cible, nx, nz, force) {
    if (!cible.tomber(nx, nz, force)) return false;
    this.audio.block?.(); this.audio.catchBall?.(cible.pos);
    if (this.ball.holder === cible) {
      this.ball.hold(null); this.ball.state = 'loose';    // (hold(null) la laissait « tenue » par personne : plus personne ne pouvait la ramasser)
      this.ball.vel.set(nx * 3.4, 1.9, nz * 3.4);
      this.ball.touchedFloor = false;
    }
    return true;
  }

  bumpContact(p) {
    if (p.bumpCd > 0 || p.stun > 0 || p.airborne || p.emote || p.state !== 'idle') return;
    p.bumpCd = 1.05; p.bumpT = 0.42; p.gesteId++;
    p.stamina = Math.max(0, p.stamina - 7);
    // cible : l'adversaire le plus proche DEVANT soi (on ne bouscule pas dans le dos)
    let cible = null, bd = 1.85;
    for (const o of this.opponents(p)) {
      if (!o.mesh.visible || Math.abs(o.jumpY - p.jumpY) > 0.9) continue;
      const d = hdist(p.pos, o.pos);
      if (d > bd) continue;
      _v.set(o.pos.x - p.pos.x, 0, o.pos.z - p.pos.z).normalize();
      if (_v.dot(p.facing) < 0.1) continue;
      bd = d; cible = o;
    }
    if (!cible) {
      p.bumpSide = 1;
      if (p === this.user) this.audio.pass?.(p.pos);        // geste dans le vide : juste le souffle
      return;
    }
    _v.set(cible.pos.x - p.pos.x, 0, cible.pos.z - p.pos.z).normalize();
    // épaule engagée : celle du côté où se trouve la cible, sinon le geste part du mauvais bras
    p.bumpSide = (_v.x * -p.facing.z + _v.z * p.facing.x) >= 0 ? 1 : -1;
    p.faceTo(cible.pos, true);

    const rapport = clamp(Game.forceContact(p) / Math.max(0.4, Game.forceContact(cible)), 0.5, 1.9);
    const v = 3.3 * rapport;      // m/s imposés à l'adversaire, amortis en ~0,45 s : il recule d'environ 80 cm
    cible.vel.set(_v.x * v, 0, _v.z * v);
    cible.stun = Math.max(cible.stun, 0.16 + 0.14 * rapport);
    cible.contactT = 0.35; cible.boxOutT = 0;
    if (cible.state === 'windup') { cible.state = 'idle'; cible.windup = 0; }   // tir coupé net
    // recul du pousseur : on ne charge pas gratuitement
    p.vel.set(-_v.x * 0.9 * (2 - rapport), 0, -_v.z * 0.9 * (2 - rapport));

    // ÉCRASANT. Au-delà d'un rapport de force d'un et demi, l'adversaire ne recule plus : il tombe. C'est
    // rare et c'est fait pour — il faut un vrai pivot lancé sur un petit meneur fatigué — mais c'est ce qui
    // donne enfin un poids au gabarit, et ce que Haythem demandait : « une animation quand le joueur se fait
    // poster et tombe ».
    // Le seuil est a 1,32 et non a 1,5 : le rapport de force est borne a 1,9 et, dans les faits, un pivot de
    // 2,01 m lance sur un meneur de 1,73 m ne depasse pas 1,37. A 1,5 la mise au sol n'arrivait litteralement
    // jamais — c'est en mesurant les deux forces reelles du terrain que je l'ai vu.
    if (rapport > 1.32 && !cible.auSol && this.rnd() < clamp((rapport - 1.25) * 1.5, 0, 0.6)) {
      this.mettreAuSol(cible, _v.x, _v.z, rapport - 0.4);
      if (p === this.user) { this.hud.feedback('IL LE MET AU SOL !', 'good'); this.reward('CONTACT', 4, 2); }
      else if (cible === this.user) this.hud.feedback('TU ES AU SOL', 'bad');
      this.addShake(0.17, 0.3);
      this.audio.catchBall?.(p.pos); this.audio.block?.();
      return;
    }

    // balle bousculée : un contact franc sur un porteur peut la lui faire lâcher
    if (this.ball.holder === cible && this.mode === 'match') {
      const perte = clamp(0.06 + (rapport - 1) * 0.22 - ((cible.def.hdl || 60) / 100) * 0.12, 0.02, 0.34);
      if (this.rnd() < perte) {
        this.ball.hold(null); this.ball.state = 'loose';
        this.ball.vel.set(_v.x * 3.2, 1.6, _v.z * 3.2);
        this.ball.touchedFloor = false;
        if (p.team === 0) { this.hud.feedback('BALLE ARRACHÉE AU CONTACT !', 'good'); this.reward('CONTACT', 3, 2); }
        else this.hud.feedback('BALLE PERDUE AU CONTACT', 'bad');
      }
    }
    this.audio.catchBall?.(p.pos); this.audio.block?.();
    if (p === this.user || cible === this.user) this.addShake(0.10 + 0.05 * rapport, 0.22);
    if (p === this.user) this.hud.feedback(rapport > 1.25 ? 'IL DÉGAGE !' : rapport < 0.85 ? 'IL NE BOUGE PAS' : 'CONTACT', rapport < 0.85 ? 'info' : 'good');
  }

  // « Casse-chevilles » : un changement de main devant un défenseur collé peut le déséquilibrer. Sans cette
  // capacité rien ne se passe, le jeu reste exactement celui d'avant.
  // LE VRAI CROSSOVER : PARTIR A L'OPPOSE DU DEFENSEUR.
  //
  // Ce n'est pas un dribble de plus, c'est LE geste du un-contre-un : on attaque d'un cote, on repart de
  // l'autre, et l'adversaire ne peut plus suivre.
  //
  // J'avais d'abord ecrit la condition au pied de la lettre : SA vitesse laterale et LA MIENNE de signes
  // opposes — il part a gauche, je pars a droite. Mesure sur une demi-heure de match : ca n'est JAMAIS
  // arrive. Une seconde de reflexion explique pourquoi — un defenseur, par definition, se deplace AVEC son
  // vis-a-vis ; il ne part a l'oppose que lorsqu'il est deja battu. Exiger le resultat comme condition
  // d'entree, c'etait exiger que le geste ait deja reussi pour l'autoriser.
  //
  // Ce qui declenche un crossover, c'est MON changement de cote devant lui. Et ce qui decide s'il le SUBIT,
  // c'est a quel point il s'etait engage du cote que je viens de quitter : plus il avait de vitesse dans
  // l'ancien sens, plus il lui faut de temps pour replanter et se retourner. Son agilite le protege, comme
  // pour le vol de balle.
  croiserDevant(p, dir) {
    if (!p.hasBall || p.state !== 'idle' || p.airborne || p.stun > 0 || p.crossT >= 0 || p.handCd > 0 || p.spinT > 0) return false;
    if (p.ankleCd > 0 || dir.lengthSq() < 0.25 || p.speedNow < 1.6) return false;
    let def = null, bd = 2.6;
    for (const o of this.opponents(p)) {
      if (!o.mesh.visible || o.auSol || o.stun > 0 || o.airborne) continue;
      const d = hdist(p.pos, o.pos);
      if (d > bd) continue;
      _v.set(o.pos.x - p.pos.x, 0, o.pos.z - p.pos.z).normalize();
      if (_v.dot(p.facing) < -0.15) continue;                  // il est devant moi, ou au moins a ma hauteur
      bd = d; def = o;
    }
    if (!def) return false;
    // l'axe perpendiculaire a la ligne qui nous separe : c'est sur celui-la qu'on mesure qui part ou
    _v.set(def.pos.x - p.pos.x, 0, def.pos.z - p.pos.z).normalize();
    const px = -_v.z, pz = _v.x;
    const moi = dir.x * px + dir.z * pz;
    const avant = p.capPrec.x * px + p.capPrec.z * pz;         // le cap que je tenais juste avant (lisse)
    if (!(moi * avant < -0.05) || Math.abs(moi) < 0.42) return false;
    if (!p.startMove('ankle', this.ball.pos)) return false;
    p.ankleCd = 1.6;
    // A quel point il s'etait engage du cote que je viens de quitter. C'est ca, se faire prendre.
    const engage = Math.min(2.4, Math.max(0, (def.vel.x * px + def.vel.z * pz) * Math.sign(avant)));
    const bf = p.badgeFx || {};
    const force = clamp(0.16 + engage * 0.20 + ((p.def.hdl || 60) - (def.def.spd || 60)) / 160 + (bf.ankle || 0) * 1.4, 0.05, 0.85);
    def.stun = Math.max(def.stun, 0.22 + force * 0.55);
    def.vel.multiplyScalar(0.22);
    def.contactT = 0; def.boxOutT = 0;
    if (def.state === 'windup') { def.state = 'idle'; def.windup = 0; }
    this.audio.catchBall?.(p.pos);
    const casse = force > 0.52;
    if (p.team === 0) {
      this.hud.feedback(casse ? 'CHEVILLES CASSÉES !' : 'CROSSOVER !', 'good');
      this.reward(casse ? 'CASSE-CHEVILLES' : 'CROSSOVER', casse ? 4 : 2, casse ? 3 : 1);
      if (casse) { this.addShake(0.10, 0.2); this.slowMo?.(0.55, 0.28); }
    } else if (def === this.user) this.hud.feedback(casse ? 'IL TE PREND LES CHEVILLES' : 'IL TE PASSE DEVANT', 'bad');
    return true;
  }

  tryAnkle(porteur) {
    const bf = porteur.badgeFx;
    if (!bf || !bf.ankle || this.mode !== 'match') return;
    for (const d of this.opponents(porteur)) {
      if (d.stun > 0 || d.airborne) continue;
      const dd = hdist(d.pos, porteur.pos);
      if (dd > 1.7) continue;
      // un défenseur agile résiste mieux ; plus il est collé, plus il se fait prendre
      const c = bf.ankle * (dd < 1.1 ? 1.3 : 0.8) * (1 - (d.def.spd / 100) * 0.45);
      if (this.rnd() < clamp(c, 0, 0.6)) {
        d.stun = 0.55; d.vel.multiplyScalar(0.2);
        if (porteur.team === 0) { this.hud.feedback('CHEVILLES CASSÉES !', 'good'); this.reward('CASSE-CHEVILLES', 4, 3); }
      }
    }
  }

  // Feinte de tir. Le porteur remonte la balle puis la redescend ; les défenseurs proches peuvent mordre et sauter
  // dans le vide, ce qui ouvre la voie. Un défenseur qui a mordu retombe et reste inutile le temps de son saut.
  pumpFake(shooter) {
    if (shooter.fakeCd > 0) return;                    // sans délai, la feinte se répétait en boucle pour farmer
    shooter.state = 'idle'; shooter.windup = 0; shooter.fakeT = 0.45; shooter.fakeCd = 1.4;
    if (shooter === this.user) this.hud.feedback('FEINTE', 'info');
    if (this.mode !== 'match') return;
    let mordus = 0;
    for (const d of this.opponents(shooter)) {
      if (d.airborne || d.stun > 0 || d.state !== 'idle') continue;
      const dd = hdist(d.pos, shooter.pos);
      if (dd > 2.4) continue;
      // un bon défenseur mord moins ; le badge de feinte du tireur le fait mordre plus
      let c = 0.62 - (d.def.def / 100) * 0.42 + (shooter.badgeFx ? shooter.badgeFx.fake || 0 : 0);
      c *= dd < 1.4 ? 1 : 0.6;
      if (this.rnd() < clamp(c, 0.05, 0.85)) {
        d.jump(3.0); d.faceTo(shooter.pos, true);
        mordus++;
      }
    }
    // une seule récompense par feinte, et seulement une fois par possession
    if (mordus && shooter.team === 0 && !this.fakePaid) { this.fakePaid = true; this.reward('FEINTE RÉUSSIE', 3, 2); }
  }

  // Décide du résultat du tir et lance l'animation ; la balle part un peu plus tard (updatePendingShot)
  doShot(shooter, { timing = null, instant = false } = {}) {
    // BALLE NON SORTIE (demi-terrain, voir majSortie). Les entrées du tir sont fermées tant que l'équipe doit ressortir
    // la balle (handleBallInput, js/ai.js) ; un tir qui partirait quand même par un autre chemin ne compte pas : perte
    // de balle.
    if (this.doitSortir(shooter) && this.state === 'playing') {
      shooter.state = 'idle'; shooter.windup = 0;
      this.turnover('BALLE NON SORTIE', 1 - shooter.team);
      return;
    }
    const defender = this.mode === 'match' ? this.nearestOpponent(shooter) : null, hoop = shooter.hoop;
    const d = hdist(shooter.pos, hoop), three = isThree(shooter.pos, hoop);
    let type, base, tf = { f: 1, label: '' };
    if (d < 2.0) {
      // « Posterizer » abaisse les deux seuils de dunk : on dunke plus tôt et même à l'arrêt
      const bs = shooter.badgeFx || {}, seuil = bs.dunkSeuil || 0;
      const canDunk = shooter.def.dnk >= 60 - seuil && d < 1.8 && (shooter.sprinting || shooter.def.dnk >= 85 - seuil);
      type = canDunk ? 'dunk' : 'layup';
      base = canDunk ? 0.88 + (shooter.def.dnk / 100) * 0.1 : 0.45 + (shooter.def.in / 100) * 0.5;
      base *= 1 + (canDunk ? bs.dunk || 0 : bs.finish || 0);
    } else {
      type = three ? 'three' : 'mid';
      const st = three ? shooter.def.tp : shooter.def.mid;
      base = 0.30 + (st / 100) * 0.62;
      base *= this.rangeFactor(d, three, shooter);   // la distance compte enfin
      tf = this.timingFactor(timing, st, shooter);
      if (shooter === this.user) this.hud.meterMark(Math.min(timing, 1.05), PERFECT_CENTER, Game.meterHalf(st, shooter));
      else if (this.reseau) this.reseau.retour(shooter, tf.label, tf.f >= 1 ? 'good' : tf.f > 0.5 ? 'info' : 'warn', [Math.min(timing, 1.05), PERFECT_CENTER, Game.meterHalf(st, shooter)]);
    }
    // contest (en balade l'ordinateur est absent : jamais contesté)
    const dd = defender ? hdist(defender.pos, shooter.pos) : 99;
    let cf = 1, contested = false;
    if (dd < 1.0) { cf = 0.5; contested = true; } else if (dd < 1.8) { cf = 0.72; contested = true; }
    if (defender && defender.airborne && dd < 1.7) { cf *= 0.75; contested = true; }
    const bfs = shooter.badgeFx || {};
    if (contested) {
      if (defender && defender.badgeFx) cf *= 1 - (defender.badgeFx.contest || 0);   // « Harceleur »
      cf *= 1 + (bfs.contested || 0);                                                // « Sang-froid »
      cf = clamp(cf, 0.2, 1);
    } else if (three) base *= 1 + (bfs.openThree || 0);                              // « Sniper » : démarqué seulement
    // contre (si le défenseur est déjà en l'air)
    let blocked = false;
    if (defender && defender.airborne && dd < (type === 'dunk' ? 1.0 : type === 'layup' ? 1.5 : 1.3)) {
      let bc = 0.10 + (defender.def.def / 100) * 0.32 + (defender.h - shooter.h) * 0.6;
      if (type === 'dunk') bc *= 0.4; else if (type !== 'layup') bc *= 0.45;
      if (defender.team === 1 && !defender.humain) bc *= this.diff.aggro;
      bc = clamp(bc, 0, 0.35);
      // « Muraille » s'applique APRÈS le plafond, en grignotant la marge qui reste : sous le clamp, un badge Or
      // était purement et simplement avalé dès que le défenseur était déjà au maximum.
      const mb = (defender.badgeFx && defender.badgeFx.block) || 0;
      if (mb) bc += (0.55 - bc) * Math.min(1, mb / 0.105);
      blocked = this.rnd() < bc;
    }
    const onFire = this.mode === 'match' && this.fire[TEAM_KEY[shooter.team]];
    if (onFire) base = Math.min(0.97, base * 1.15 + 0.05);     // "en feu" : plus adroit
    // jambes vides = tir court : jusqu'à -12 % d'adresse quand l'endurance est à zéro (ni sur un dunk ni sur un layup)
    const gas = type === 'dunk' || type === 'layup' ? 1 : 0.88 + 0.12 * Math.min(1, shooter.stamina / 55);
    // « Clutch » : bonus quand il reste 3 points ou moins à marquer pour gagner
    if (bfs.clutch && this.mode === 'match' && this.opts.target - this.teams[shooter.team].score <= 3) base *= 1 + bfs.clutch;
    let p = clamp(base * tf.f * cf * gas, 0.02, 0.97);
    // même logique pour l'adresse : un bonus de finition ne doit pas disparaître parce qu'on est déjà à 0,97
    const bp = (bfs.finish || 0) + (bfs.dunk || 0);
    if (bp && p > 0.9) p += (0.995 - p) * Math.min(1, bp / 0.18);
    const made = !blocked && this.rnd() < p;
    const green = !!tf.green;

    shooter.faceTo(hoop);
    shooter.windup = 0; shooter.stateT = 0; shooter.released = false;
    let delay;
    _v.set(hoop.x - shooter.pos.x, 0, hoop.z - shooter.pos.z).normalize();
    if (type === 'dunk') {
      // saut calibré pour que la main dépasse le cercle (allonge ≈ 1,27 × taille), élan jusqu'à 55 cm devant le cercle, lâcher à l'apogée
      shooter.state = 'dunk';
      const need = Math.max(0.55, COURT.HOOP_Y + 0.25 - shooter.h * 1.22), v = Math.sqrt(2 * G * need);
      shooter.jump(v);
      shooter.dunkStyle = shooter.def.dnk >= 80 && this.rnd() < 0.5 ? 'two' : 'one';
      shooter.dunkFrom.copy(shooter.pos); shooter.dunkTo = hoop.clone().addScaledVector(_v, -0.55); shooter.dunkTo.y = 0;
      shooter.dunkT = 0; shooter.dunkRise = v / G; delay = v / G;
      shooter.pickDunkClip();                                            // clip DeepMotion (corps entier) si disponible
    } else if (type === 'layup') {
      // 3,3 m/s de detente, c'etait 0,55 m d'elevation et 0,34 s de montee : un petit saut sur place, trop
      // court pour qu'on ait le temps de LIRE le geste. Un layup monte a hauteur de planche et dure le double.
      // La duree de montee se deduit de la vitesse au lieu d'etre recopiee a cote (v / g), sinon les deux se
      // desynchronisent des qu'on touche a l'une des deux.
      const vl = 4.0;
      shooter.state = 'layup'; shooter.jump(vl); delay = 0.3;
      shooter.dunkFrom.copy(shooter.pos); shooter.dunkTo = hoop.clone().addScaledVector(_v, -0.85); shooter.dunkTo.y = 0;
      shooter.dunkT = 0; shooter.dunkRise = vl / G;
      shooter.pickLayupClip(); if (shooter.layupClip) delay = shooter.dunkRise;   // clip DeepMotion calé sur l'apogée physique
    } else {
      // tir en suspension : lâcher juste après le sommet du saut (le clip s'y cale, voir Player._driveAnim)
      const vt = 2.9;
      shooter.state = 'shoot'; shooter.jump(vt); delay = 0.17; shooter.tirLacher = vt / G + 0.04; shooter.tirVitesse = 0;
    }
    const clipDelay = shooter.animDelay(type);   // synchronisé sur le clip Mixamo s'il existe (sauf dunk : apogée physique)
    if (clipDelay !== null && type !== 'dunk' && !(type === 'layup' && shooter.layupClip)) delay = clipDelay;
    if (shooter === this.user) this.hud.meter(false);

    const points = three ? 3 : 2;
    const target = made ? hoop.clone() : this.missTarget(shooter.pos, hoop);
    const T = type === 'dunk' ? 0.10 : type === 'layup' ? 0.6 : 0.75 + d * 0.055;   // dunk : chute écrasée, la balle claque
    this.pendingShot = { shooter, defender, made, blocked, points, type, contested, target, T, green, assist: shooter.assistFrom > 0, releaseAt: this.time + delay };
    shooter.assistFrom = 0;
    if (shooter === this.user) {
      const label = type === 'dunk' ? 'DUNK !' : type === 'layup' ? 'LAYUP' : tf.label;
      this.hud.feedback(label, tf.f >= 1 || type === 'dunk' ? 'good' : tf.f > 0.5 ? 'info' : 'warn');
      if (tf.f >= 1) this.fx.flash = 0.25;
    }
    // lâcher parfait : le ballon s'enflamme le temps du vol et le son monte, comme un green release
    if (green) { this.ball.greenT = 1.2; if (shooter === this.user) { this.fx.flash = 0.42; this.audio.fire?.(0.6); this.addShake(0.03, 0.2); } }
  }

  // Lâcher de balle une fois le bras tendu
  updatePendingShot() {
    if (this.passeEnAttente) this.passerSiPret();       // (la passe armée part au bout du geste, voir passBall)
    const ps = this.pendingShot;
    if (!ps || this.time < ps.releaseAt) return;
    this.pendingShot = null;
    ps.shooter.released = true;
    const from = this.ball.pos.clone();
    if (ps.blocked && ps.defender) { this.blockShot(ps.defender, ps.shooter, from); return; }
    if (ps.type === 'dunk') {
      // DUNK SUR LA TÊTE. Le défenseur qui a contesté un dunk réussi et qui rend du gabarit finit par terre :
      // c'est l'image la plus attendue du basket de rue, et elle manquait complètement.
      const d = ps.defender;
      if (ps.made && d && d !== ps.shooter && !d.auSol && hdist(d.pos, ps.shooter.pos) < 1.7) {
        const ecart = (ps.shooter.h - d.h) * 1.4 + (ps.shooter.def.dnk - 60) / 90;
        if (this.rnd() < clamp(0.25 + ecart * 0.5, 0.1, 0.8)) {
          _v.set(d.pos.x - ps.shooter.pos.x, 0, d.pos.z - ps.shooter.pos.z);
          if (_v.lengthSq() < 1e-4) _v.set(0, 0, 1); else _v.normalize();
          this.mettreAuSol(d, _v.x, _v.z, 1.5);
          this.addShake(0.2, 0.35);
          if (ps.shooter.team === 0) { this.hud.feedback('SUR LA TÊTE !', 'good'); this.reward('POSTER', 5, 3); }
          else this.hud.feedback('IL T’A DUNKÉ DESSUS', 'bad');
        }
      }
      // la balle part d'au-dessus du cercle, un peu du côté du joueur, et est écrasée vers le bas : c'est la descente
      // rapide qui fait le claquement. Les effets (cercle, son, secousse) partent à l'impact, pas ici (voir dunkSlam).
      const hoop = ps.shooter.hoop;
      _v.set(ps.shooter.pos.x - hoop.x, 0, ps.shooter.pos.z - hoop.z);
      if (_v.lengthSq() > 1e-4) _v.normalize(); else _v.set(0, 0, 1);
      from.copy(hoop).addScaledVector(_v, 0.13); from.y += 0.58;
    }
    this.ball.launch(from, ps.target, ps.T, { shooter: ps.shooter, made: ps.made, points: ps.points, type: ps.type, contested: ps.contested, green: ps.green, assist: ps.assist, T: ps.T });
  }

  missTarget(from, hoop) {
    const t = hoop.clone();
    _v.set(from.x - hoop.x, 0, from.z - hoop.z).normalize();
    const r = this.rnd();
    if (r < 0.35) t.addScaledVector(_v, 0.22 + this.rnd() * 0.2);            // court (avant du cercle)
    else if (r < 0.7) t.addScaledVector(_v, -(0.25 + this.rnd() * 0.22));    // long (arrière / panneau)
    else t.add(new THREE.Vector3(-_v.z, 0, _v.x).multiplyScalar((this.rnd() < 0.5 ? -1 : 1) * (0.24 + this.rnd() * 0.14)));
    return t;
  }

  blockShot(blocker, shooter, from) {
    _v.set(shooter.pos.x - blocker.pos.x, 0, shooter.pos.z - blocker.pos.z).normalize();
    this.ball.deflect(from, _v, blocker);
    this.audio.block(); this.audio.ooh();
    const mine = blocker.team === 0;
    this.hud.feedback(mine ? 'CONTRE !' : 'CONTRÉ...', mine ? 'good' : 'bad');
    this.reward('CONTRE', 5, 3, mine);
    this.slowMo(0.22, mine ? 0.55 : 0.35); this.addShake(mine ? 0.09 : 0.05, 0.4);
    blocker.tauntT = 1.7;                                             // le contreur chambre en retombant (clip Taunt)
    if (mine) { this.audio.cheer(); this.audio.swell(0.6, 1.6); this.addMomentum('user', 0.3); }
    else this.addMomentum('cpu', 0.2);
    // 1 contre 1 : pas de rebond sur un contre non plus — la balle est tout de suite à l'équipe du contreur (rules)
    if (this.sansRebond() && this.state === 'playing') this.turnover('', blocker.team, 2);
  }

  attemptSteal(thief, victim) {
    if (thief.stealCd > 0 || thief.stun > 0 || this.ball.holder !== victim || this.pendingShot) return;
    thief.stealCd = 1.0; thief.swipeT = 0.3;
    let c = 0.12 + (thief.def.def / 100) * 0.33 - (victim.def.hdl / 100) * 0.28;
    c += (thief.badgeFx && thief.badgeFx.steal) || 0;                             // « Pickpocket »
    c -= (victim.badgeFx && victim.badgeFx.hands) || 0;                           // « Mains sûres »
    if (victim.state === 'windup') c *= 0.5;
    // balle protégée pendant un spin ; pendant un geste en rythme, exposée selon le geste et sa phase ; pendant
    // un geste de mocap (repli), protégée comme avant
    if (victim.spinT > 0) c = 0;
    else if (victim.crossT >= 0 && victim.moveRythme && victim.dribble && victim.dribble.controle) c *= victim.dribble.exposition(thief);
    else if (victim.crossT >= 0) c = 0;
    if (thief.team === 1 && !thief.humain) c *= this.diff.aggro;
    c = clamp(c, 0, 0.45);
    if (this.rnd() < c) {
      this.ball.hold(thief);
      victim.state = 'idle'; victim.windup = 0; victim.stun = 0.45;
      this.changePossession(thief.team, thief.team === 0 ? 'INTERCEPTION !' : 'BALLE VOLÉE !');
      this.reward('BALLE VOLÉE', 4, 3, thief.team === 0);
      this.audio.block(); this.addShake(0.05, 0.3);
      if (thief.team === 0) { this.audio.cheer(); this.audio.swell(0.45, 1.4); this.addMomentum('user', 0.25); }
      else this.addMomentum('cpu', 0.2);
    } else {
      thief.stun = 0.5;
      if (thief === this.user) this.hud.feedback(victim.spinT > 0 ? 'ESQUIVÉ !' : 'RATÉ...', 'warn');
    }
  }

  changePossession(newOff, msg) {
    this.fakePaid = false;                  // la feinte ne paie qu'une fois par possession
    this.offense = newOff; this.shotClock = SHOT_CLOCK;
    // DEMI-TERRAIN : balle gagnée en jeu (rebond défensif, vol, interception, balle perdue, contre récupéré) — il
    // faudra la ressortir derrière l'arc avant d'attaquer (majSortie). Récupérée déjà dehors : c'est fait.
    if (this.half && this.mode === 'match') {
      const h = this.ball.holder;
      this.aSortir = h && h.team === newOff && horsArc(h.pos, h.hoop) ? -1 : newOff;
    }
    this.hud.meter(false);
    this.hud.feedback(msg, newOff === 0 ? 'good' : 'bad');
    for (const ai of this.ais.values()) ai.newPossession();
    this.updateMarks(); this.markT = 0.4;
  }

  // ---------- SORTIR LA BALLE (demi-terrain) ----------
  // La règle des playgrounds : au demi-terrain, l'équipe qui récupère la balle EN JEU (rebond défensif, vol,
  // interception, balle perdue ramassée, contre récupéré) doit d'abord la ressortir derrière la ligne à 3 points avant
  // d'attaquer le cercle. Une remise en jeu au check (après un panier, une perte de balle) part déjà de dehors ; un
  // rebond offensif ne change rien. « Sortie » : un joueur de l'équipe tient la balle franchement au-delà de l'arc
  // (horsArc, 25 cm) — une passe reçue dehors compte. Avant, pas de tir (refuserTir ; l'ordinateur ressort la balle :
  // js/ai.js, sortir) ; un tir qui partirait quand même est une violation (doShot).
  // `aSortir` : l'équipe qui doit encore le faire, -1 sinon. En ligne, l'hôte seul l'établit ; l'invité le lit dans
  // l'image (`so`, js/enligne.js) pour son aide à l'écran et sa jauge de tir.
  doitSortir(p) { return this.aSortir >= 0 && !!p && p.team === this.aSortir && this.mode === 'match'; }
  majSortie() {
    const t = this.aSortir;
    if (t !== this.offense) { this.aSortir = -1; return; }          // (la balle a changé de camp sans changePossession)
    const h = this.ball.holder;
    if (!h || h.team !== t || !horsArc(h.pos, h.hoop)) return;
    this.aSortir = -1;
    if (t === 0) this.hud.feedback('BALLE SORTIE ✓', 'good');
    if (this.reseau) this.reseau.evt({ k: 'so', t });              // l'invité de cette équipe le voit aussi
  }
  // Tir demandé avant la sortie : rien ne part, on rappelle la règle (au joueur en ligne : par son retour de geste,
  // qui coupe aussi la jauge qu'il aurait lancée chez lui).
  refuserTir(u) {
    const txt = 'SORS LA BALLE DERRIÈRE LA LIGNE À 3 PTS !';
    if (this.reseau && this.reseau.piloteDe(u)) { this.reseau.retour(u, txt, 'warn', null, 1); return; }
    if (u !== this.user) return;
    this.hud.feedback(txt, 'warn'); this.hud.meter(false); this.audio.refus?.();
  }
  // L'aide à l'écran tant que TON équipe doit ressortir la balle : un rappel permanent, et la ligne à 3 points
  // soulignée au sol. Appelée à chaque image (Game.frame), hôte, invité et hors ligne. PERMANENT POUR DE VRAI : un
  // autre rappel écrit pendant ce temps (emote refusée, qualité baissée...) le remplaçait jusqu'à la sortie — on le
  // laisse lire 2 s, puis celui-ci revient. À la fin, on n'efface que s'il est encore affiché (pas le rappel d'un autre).
  majAideSortie(dt) {
    const R = this.reseau, hud = this.hud;
    const on = this.mode === 'match' && this.state === 'playing' && this.aSortir === 0 && !(R && R.role === 'spect');
    if (on !== !!this._aideSortie) {
      this._aideSortie = on; this._aideSortieT = 0;
      if (on) hud.hint(AIDE_SORTIE, 'sortie');
      else if (hud.hintTxt === AIDE_SORTIE) hud.hint('');
    } else if (on && hud.hintTxt !== AIDE_SORTIE && (this._aideSortieT += dt) >= 2) {
      this._aideSortieT = 0; hud.hint(AIDE_SORTIE, 'sortie');
    }
    if (!on && !this._arcSortie) return;
    const arc = this.arcSortie();
    arc.visible = on;
    if (on) arc.material.opacity = 0.5 + 0.25 * Math.sin(performance.now() * 0.007);
  }
  // La ligne à 3 points du panier A (le seul du demi-terrain) en ruban lumineux posé au sol. Construite à la première
  // demande : COURT a déjà les cotes du terrain (appliquerTerrain, avant la construction de la partie). Même tracé que
  // le marquage (js/court.js) : droites des corners depuis la ligne de fond, puis l'arc.
  arcSortie() {
    if (this._arcSortie) return this._arcSortie;
    const hoop = HOOP_VEC[0], s = hoop.sgn, R = COURT.THREE_R, CX = COURT.CORNER_X;
    const zj = hoop.z - s * Math.sqrt(Math.max(0.01, R * R - CX * CX)), zb = s * (COURT.L / 2);
    const pts = [[-CX, zb], [-CX, zj]];
    const a = Math.asin(Math.min(1, CX / R)), N = 48;
    for (let i = 1; i < N; i++) { const t = -a + (2 * a * i) / N; pts.push([R * Math.sin(t), hoop.z - s * R * Math.cos(t)]); }
    pts.push([CX, zj], [CX, zb]);
    const w = 0.11, pos = [], idx = [];
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)];
      let tx = p1[0] - p0[0], tz = p1[1] - p0[1];
      const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      pos.push(pts[i][0] - tz * w, 0, pts[i][1] + tx * w, pts[i][0] + tz * w, 0, pts[i][1] - tx * w);
      if (i) { const k = 2 * i; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffc23d, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    m.name = 'arc-sortie'; m.position.y = 0.02; m.renderOrder = 3; m.visible = false; m.frustumCulled = false;
    this.scene.add(m);
    return (this._arcSortie = m);
  }

  // ---------- 1 CONTRE 1 : PAS DE REBOND ----------
  // Au 1 contre 1, un tir raté (ou contré) ne se dispute pas : la balle va à l'adversaire (rules, blockShot).
  sansRebond() { return this.teamSize === 1 && this.mode === 'match'; }
  // La balle d'un tir pas encore jugé : personne ne la ramasse, l'ordinateur ne lui court pas après (js/ai.js).
  balleMorte() { return this.sansRebond() && !this.ball.holder && !!this.ball.shot && !this.ball.shot.scored; }
  // Le raté s'est vu et ne peut plus rentrer : la balle a touché le sol, ou elle redescend sous le cercle (plus rien ne
  // la remonte, sinon le sol). Un tir qui reste posé sur l'arceau n'est pas attendu indéfiniment.
  rateVisible(ball) {
    const s = ball.shot;
    if (ball.touchedFloor) return true;
    if (ball.vel.y < 0 && ball.pos.y < COURT.HOOP_Y - 0.25) return true;
    return s.t > (s.T || 1.2) + 2.0;
  }

  // ---------- balle ----------
  updateBall(dt) {
    const ball = this.ball;
    // FILET DE SÉCURITÉ : un ballon à une position invalide (NaN) figeait le match pour de bon — un tir
    // lancé de nulle part ne retombe jamais. On le remet en jeu au centre, et on le dit dans la console.
    if (!Number.isFinite(ball.pos.x + ball.pos.y + ball.pos.z) || !Number.isFinite(ball.vel.x + ball.vel.y + ball.vel.z)) {
      console.warn('[ballon] position invalide, remis en jeu', ball.state, ball.holder && ball.holder.def && ball.holder.def.name);
      const h = ball.state === 'held' ? ball.holder : null;
      if (h && Number.isFinite(h.pos.x + h.pos.z)) ball.pos.set(h.pos.x, 1.0, h.pos.z); else ball.pos.set(0, 1.2, 0);
      ball.vel.set(0, 0, 0); ball.posPrec.copy(ball.pos);
      if (ball.state !== 'held') { ball.state = 'loose'; ball.shot = null; ball.pass = null; }
      if (this.pendingShot && this.pendingShot.shooter === ball.holder) this.pendingShot = null;
      // le tir annulé, le tireur ne doit pas attendre un lâcher qui ne viendra plus
      if (h && (h.state === 'windup' || h.state === 'shoot' || h.state === 'layup' || h.state === 'dunk')) { h.state = 'idle'; h.windup = 0; }
    }
    // vitesse réelle du ballon au dernier pas : quand des mains le prennent (réception, rebond, armé), il part
    // de là au lieu de repartir de l'arrêt — c'est ce qui évite la cassure à l'entrée du geste
    if (ball._pEstOk && ball._pEst.distanceToSquared(ball.pos) < 1) ball.vEst.subVectors(ball.pos, ball._pEst).divideScalar(dt);
    else ball.vEst.set(0, 0, 0);
    ball._pEst.copy(ball.pos); ball._pEstOk = true;
    if (ball.state === 'held') {
      const h = ball.holder;
      if (!h) return;
      this.balleEnMain(h, ball, dt);
    } else { ball.enBalade = this.mode === 'lobby'; ball.update(dt); }   // (le relief ne vaut qu'en balade)
    ball.updateFx(dt);
  }

  // La balle dans la main de `h`. Séparé de updateBall parce que les joueurs EN LIGNE du hub ont chacun leur
  // propre ballon (une simple copie du maillage) : ils dribblent avec exactement la même mécanique.
  // SPIN. La balle restait collée à la main pendant tout le tour, sans jamais toucher le sol : un « porté ».
  // Comme dans la réalité (et dans 2K) : la main de dribble TIRE la balle pendant le premier demi-tour, la
  // plaque au sol d'une poussée franche, le rebond remonte pendant que le corps finit de tourner, et c'est
  // l'AUTRE main qui la cueille à la sortie — le joueur repart avec elle.
  _spinBalle(h, ball, dt) {
    const S = h.spinB || (h.spinB = { id: -1, phase: 0, t: 0, x: 0, y: 0, z: 0, vx: 0, vz: 0, v0: 0, vb: 0, tF: 0, tC: 0, ix: 0, iz: 0, de: 'R', vers: 'L' });
    const dur = Math.max(0.3, h.spinDur || 0.72), u = 1 - h.spinT / dur;
    const y0 = h.pos.y;                              // le sol sous le joueur (0 sur un terrain plat)
    const U_LACHER = 0.38, U_SOL = 0.55, U_REPRISE = 0.84;
    if (S.id !== h.spinId || h.spinT > (S.dernierT || 0) + 0.05) { S.id = h.spinId; S.phase = 0; S.de = h.dribbleHand === 'L' ? 'L' : 'R'; S.vers = S.de === 'R' ? 'L' : 'R'; }
    S.dernierT = h.spinT;
    if (S.phase === 0) {
      // tirée : la paume sur le dessus-côté de la balle, qui suit la main
      h.handWorld(S.de, _v); _v.y -= BALL_R * 0.8;
      this._versMains(h, ball, _v, dt, 26);
      if (u >= U_LACHER) {
        // lâcher : poussée vers le sol, calée pour que l'impact tombe à U_SOL ; elle avance avec le joueur
        S.phase = 1; S.t = 0; S.tF = Math.max(0.07, (U_SOL - u) * dur);
        S.x = ball.pos.x; S.y = ball.pos.y; S.z = ball.pos.z; S.vx = h.vel.x; S.vz = h.vel.z;
        S.v0 = Math.max(1.0, (S.y - (y0 + BALL_R) - 0.5 * G * S.tF * S.tF) / S.tF);
      }
    } else if (S.phase === 1) {
      S.t += dt; const t = Math.min(S.t, S.tF);
      ball.pos.set(S.x + S.vx * t, Math.max(y0 + BALL_R, S.y - S.v0 * t - 0.5 * G * t * t), S.z + S.vz * t);
      if (S.t >= S.tF) {
        // rebond : il remonte juste à la hauteur de l'autre main au moment de la reprise
        S.phase = 2; S.t = 0; S.ix = ball.pos.x; S.iz = ball.pos.z; ball.pos.y = y0 + BALL_R;
        S.tC = Math.max(0.10, (U_REPRISE - U_SOL) * dur);
        h.handWorld(S.vers, _v2);
        const hC = clamp(_v2.y - y0 - BALL_R - 0.02, 0.45, 1.1);
        S.vb = (hC - BALL_R + 0.5 * G * S.tC * S.tC) / S.tC;
        this.audio.bounce(0.85, ball.pos);
      }
    } else if (S.phase === 2) {
      // remontée : verticale balistique ; à l'horizontale, elle part avec le joueur et rejoint l'autre main
      S.t += dt; const t = Math.min(S.t, S.tC), k = t / S.tC, kk = k * k * (3 - 2 * k);
      h.handWorld(S.vers, _v2);
      const bx = S.ix + S.vx * t, bz = S.iz + S.vz * t;
      ball.pos.set(bx + (_v2.x - bx) * kk, Math.max(y0 + BALL_R, y0 + BALL_R + S.vb * t - 0.5 * G * t * t), bz + (_v2.z - bz) * kk);
      // (la main de dribble ne change qu'à la fin du tour : changée ici, le clip du spin repartait en miroir)
      if (S.t >= S.tC) { S.phase = 3; h.spinMainApres = S.vers; }
    }
    if (S.phase === 3) {
      // dans l'autre main jusqu'à la fin du tour ; le dribble reprend de là
      h.handWorld(S.vers, _v); _v.y -= BALL_R * 0.8;
      this._versMains(h, ball, _v, dt, 26);
    }
    const D = h.drib; D.phase = 'push'; D.prevHy = null; D.sched = null; D.hold = 0;
  }
  // Le ballon tourne dans le sens où il avance (roulement), plus vite quand il va vite : il tournait à
  // vitesse fixe autour du même axe, quoi qu'il fasse.
  _rouler(ball, dt) {
    const v = ball.vEst;
    if (!v) return;                                  // balle d'un joueur distant (presence) : pas de vitesse mesurée
    const vh = Math.hypot(v.x, v.z);
    if (vh < 0.05) return;
    _vm.set(v.z / vh, 0, -v.x / vh);
    ball.mesh.rotateOnWorldAxis(_vm, Math.min(25, 0.6 * vh / BALL_R) * dt);
  }
  // la balle est-elle tenue à deux mains (voir _balleEnMainAncien) ?
  _deuxMains(h) {
    return !(h.telActif && h.telActif())
      && ((h.state !== 'idle' && h.state !== 'celebrate') || ((h.catchT > 0 || h.rebondT > 0 || h.fakeT > 0) && h.crossT < 0)
        || (h.passeArmee && h.passT > 0));               // passe armée : la balle suit la main qui lance
  }
  // Amène la balle dans les mains : elle part avec sa vitesse réelle (ball.vEst), un ressort amorti critique qui
  // suit la vitesse des mains la rattrape (aucun retard quand les bras bougent vite), puis elle y reste collée.
  // Un simple lissage exponentiel la faisait bondir au premier pas (25 m/s pour une prise à 1,2 m) et traîner
  // derrière des mains rapides (15 cm pendant un dunk).
  _versMains(h, ball, cible, dt, w) {
    const D = h.drib;
    if (!D.rv) { D.rv = new THREE.Vector3(); D.tPrec = new THREE.Vector3(); D.mainsT = -1; }
    if (this.time - D.mainsT > 1.5 * dt) {            // entrée dans le geste (pas de pas manqué depuis)
      if (ball.vEst) D.rv.copy(ball.vEst); else D.rv.copy(h.vel);
      D.tPrec.copy(cible); D.colle = false;
    }
    D.mainsT = this.time;
    _dir.subVectors(cible, D.tPrec).divideScalar(Math.max(dt, 1e-4));   // vitesse des mains
    if (_dir.lengthSq() > 400) _dir.set(0, 0, 0);                       // mains téléportées : pas une vitesse
    D.tPrec.copy(cible);
    if (D.colle) { ball.pos.copy(cible); D.rv.copy(_dir); return; }
    _v2.subVectors(cible, ball.pos);
    _vm.subVectors(D.rv, _dir);
    D.rv.addScaledVector(_v2, w * w * dt).addScaledVector(_vm, -2 * w * dt);
    ball.pos.addScaledVector(D.rv, dt);
    if (_v2.length() < 0.015 && _vm.length() < 0.6) D.colle = true;
  }
  balleEnMain(h, ball, dt) {
    const dc = h.dribble;
    // DRIBBLE EN COURSE (js/dribble.js) : le ballon est celui que le module a calculé, main posée dessus.
    if (dc && dc.controle && !Number.isFinite(dc.bw.x + dc.bw.y + dc.bw.z)) { dc.panne = 5; dc.rendre('nan'); }
    if (dc && dc.controle) {
      ball.pos.copy(dc.bw);
      if (dc.impact > 0) { this.audio.bounce(dc.impact, ball.pos); dc.impact = 0; }
      this._rouler(ball, dt);
      if (ball.syncMesh) ball.syncMesh();
      if (ball.attacher) ball.attacher(h, dc.contact ? 1 : 0);
      dc.noterBalle(ball.pos);
      return;
    }
    this._balleEnMainAncien(h, ball, dt);
    if (ball.attacher) ball.attacher(h, 0);
    if (dc) dc.noterBalle(ball.pos);
  }
  _balleEnMainAncien(h, ball, dt) {
    {
      if (h.telActif && h.telActif()) {
        // téléphone sorti : le ballon est calé sous le bras gauche, contre la hanche
        h.mesh.localToWorld(_v.set(0.21, 0.93, 0.06));
        ball.pos.lerp(_v, damp(14, dt));
      } else if (this._deuxMains(h)) {
        // BALLE À DEUX MAINS : armé, tir, lay-up, dunk, mais aussi RÉCEPTION d'une passe et REBOND. Pendant ces
        // deux gestes, l'ancien dribble continuait de faire rebondir la balle alors que les bras la serraient
        // au buste : elle sautait entre la poitrine et le sol. Le dribble repart d'ici ensuite.
        // réception : la balle va à la poitrine, et ce sont les bras qui vont la chercher (Dribble.saisie)
        const recoit = h.state === 'idle' && h.catchT > 0;
        if (recoit) h.moveWorld(_v2.set(0, 0.64 * h.h, 0.30 * h.h / 1.9), _v); else h.ballHoldPos(_v);
        this._versMains(h, ball, _v, dt, recoit ? 14 : h.state === 'windup' ? 16 : 22);
        if (h.state === 'idle') { const D = h.drib; D.phase = 'push'; D.prevHy = null; D.sched = null; D.hold = 0; }
      } else if (h.spinT > 0) {
        // spin : clip DeepMotion -> la balle est tirée, plaquée au sol, reprise par l'autre main (_spinBalle) ;
        // sans avatar (rig procédural) : point fixe sur la hanche
        if (h.clipSpin && h.avatar) this._spinBalle(h, ball, dt);
        else { h.hipWorld(_v); ball.pos.lerp(_v, damp(25, dt)); }
      } else {
        h.handWorld(h.ballHand ? h.ballHand() : h.dribbleHand, _v);
        if (h.crossT >= 0) {
          // changement de main : départ -> point de passage (sol devant / entre les jambes / dans le dos) -> nouvelle main,
          // points recalculés chaque image dans le repère du joueur (il continue d'avancer pendant le geste)
          const k = h.crossT, via = h.moveWorld(h.moveViaLocal, h.moveVia), from = h.moveWorld(h.crossFromLocal, h.crossFrom);
          if (k < 0.5) { const u = k * 2; ball.pos.lerpVectors(from, via, u); ball.pos.y = lerp(from.y, via.y, u * u); }
          else { const u = (k - 0.5) * 2; ball.pos.lerpVectors(via, _v, u); ball.pos.y = lerp(via.y, _v.y - BALL_R, Math.sqrt(u)); }
          // Le « dans le dos » etait exclu du bruit de rebond, et pour cause : la balle ne touchait pas le sol.
          // Maintenant qu'elle claque derriere les talons, elle s'entend comme les autres.
          if (h.prevCrossT < 0.5 && k >= 0.5) this.audio.bounce(h.moveType === 'back' ? 0.6 : 0.5, ball.pos);
          h.prevCrossT = k; h.drib.phase = 'push'; h.drib.prevHy = null;
        } else {
          // L'ancien dribble compte ses hauteurs depuis y = 0 (sol à BALL_R, main basse sous 0,45 m…). Sur le relief
          // (js/monde.js), on le fait calculer dans le repère du sol sous le joueur, puis on remet la balle au monde.
          // Sur un terrain plat, h.pos.y vaut 0 : rien de tout cela ne s'exécute.
          const y0 = h.pos.y;
          if (y0) { _v.y -= y0; ball.pos.y -= y0; }
          this.dribbleBall(h, ball, _v, dt);
          if (y0) ball.pos.y += y0;
        }
        this._rouler(ball, dt);
      }
      ball.syncMesh();
    }
  }

  // Dribble synchronisé sur la main : la balle suit la main quand celle-ci descend (poussée), puis file au sol
  // et remonte pendant que la main remonte. Marche avec n'importe quel clip (Mixamo, LeBron...) ou avec les bras procéduraux.
  dribbleBall(h, ball, hand, dt) {
    const D = h.drib, hy = hand.y, floor = BALL_R;
    // bras procéduraux (course balle en main) : balle calée sur la phase du bras
    if (h.armsOverride) { this.dribbleProc(h, ball, hand, dt); return; }
    // clip de dribble avec calendrier (main du clip = main de la balle) : synchro exacte sur l'animation
    const A = h.anim, act = A && A.current, def = act && A.defs[A.currentName];
    if (def && def.ballTrack) { const th = h.trackHand(def); if (th) h.dribbleHand = th; this.dribbleTrack(h, ball, hand, act, def.ballTrack, dt); return; }
    if (def && def.sched && (def.hand === h.dribbleHand || def.hand === 'RL')) {
      if (def.hand === 'RL') { const sh = h.schedHand(def); if (sh) h.dribbleHand = sh; }   // dribble alterné : la main de dribble suit le clip
      this.dribbleSched(h, ball, hand, act, def.sched, dt); return;
    }
    D.sched = null;
    if (D.prevHy === null) { D.prevHy = hy; D.prevPh = h.dribblePhase; D.phase = 'push'; D.hold = 0; }
    // vitesse verticale de la main : mesurée sur l'os (clips mocap) ou déduite du rythme procédural
    // (bras procéduraux : le balancement des hanches du clip de course parasiterait la mesure)
    const vy = h.armsOverride ? (h.dribblePhase - D.prevPh) / Math.max(dt, 1e-3) * 0.6 : (hy - D.prevHy) / Math.max(dt, 1e-3);
    D.prevHy = hy; D.prevPh = h.dribblePhase;
    if (D.phase === 'push') {
      // la main descend avec la balle
      _v2.set(hand.x, Math.max(floor, hy - BALL_R - 0.02), hand.z);
      ball.pos.lerp(_v2, damp(32, dt));
      D.hold += dt;
      if ((vy > 0.2 && D.hold > 0.05) || hy < 0.45) { D.phase = 'fly'; D.t = 0; D.y0 = ball.pos.y; D.x0 = ball.pos.x; D.z0 = ball.pos.z; D.bounced = false; D.hold = 0; D.volOk = false; }
    } else {
      // la main remonte : la balle file au sol et revient dans la main au moment où celle-ci redescend
      D.t += dt;
      const u = Math.min(1, D.t / D.dur), s = 1 - 2 * u, ahead = (h.speedNow > 0.1 ? 0.25 : 0.04) * Math.sin(u * Math.PI);
      ball.pos.x = hand.x + h.facing.x * ahead; ball.pos.z = hand.z + h.facing.z * ahead;
      if (!D.volOk || !D.vol) { D.vol = volSur(D.dur || 0.4, D.y0 - floor, Math.max(0.05, hy - 2 * BALL_R - 0.02), D.vol || {}); D.volOk = true; }
      ball.pos.y = u < 1 ? Math.max(floor, volY(D.vol, D.t)) : Math.max(floor, hy - BALL_R - 0.02);
      if (!D.bounced && u >= 0.5) { D.bounced = true; this.audio.bounce(h.speedNow > 0.1 ? 0.75 : 0.6, ball.pos); }
      if ((vy < -0.2 && D.t > 0.1) || D.t > 1.0) { D.dur = clamp(D.t, 0.25, 0.7); D.phase = 'push'; D.hold = 0; }
    }
  }

  // Balle pilotée par la trajectoire du ballon enregistrée dans le clip (tools/rigid_to_cmu.py, clé « ball ») : quand une main le
  // tient, la balle est calée sous sa paume (les longueurs de bras de l'avatar diffèrent du modèle source) ; en vol, elle suit
  // le centre enregistré (repère du joueur : x gauche, y hauteur, z devant), rebond sonore au point bas.
  // Découpe la piste du ballon extraite du clip. Pour chaque image on retient le prochain contact au sol (le minimum
  // local de la hauteur, seule donnée vraiment fiable de la piste) et la première image où la main reprend la balle
  // ensuite. Les repères restent « déroulés » (ils peuvent dépasser la fin de la boucle) pour se comparer au temps courant.
  static trackSegments(T, R) {
    const n = T.hold.length, y = new Float32Array(n);
    for (let i = 0; i < n; i++) y[i] = R + Math.max(0, T.pos[i * 3 + 1] - (T.yMin ?? 0)) * (T.k || 1);
    const at = (j) => y[((j % n) + n) % n], held = (j) => !!T.hold[((j % n) + n) % n];
    const floor = [];
    for (let i = 0; i < n; i++) if (!held(i) && at(i) <= at(i - 1) && at(i) <= at(i + 1)) floor.push(i);
    if (!floor.length) floor.push(0);
    const next = new Float32Array(n), grab = new Float32Array(n), grabY = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let b = floor.find((f) => f >= i); if (b === undefined) b = floor[0] + n;   // prochain contact au sol
      let g = b + 1; while (!held(g) && g - b < n) g++;                           // reprise en main après le rebond
      next[i] = b; grab[i] = g; grabY[i] = at(g);
    }
    return { y, next, grab, grabY };
  }

  // Ballon piloté par la piste extraite du clip (crossover à deux mains). La piste est échantillonnée à 30 im/s et son
  // masque « balle en main » est grossier : par endroits il garde la balle dans la paume jusqu'à une image du sol, ce qui
  // donnait une chute de 60 cm en une image. On ne lui garde donc que le déplacement horizontal et les contacts au sol,
  // et on reconstruit la hauteur avec deux vraies paraboles de gravité. La balle quitte la main dès qu'il ne reste plus
  // que le temps nécessaire pour descendre avec une poussée réaliste : jamais de téléportation vers le bitume.
  dribbleTrack(h, ball, hand, act, T, dt) {
    const D = h.drib, R = BALL_R, n = T.hold.length, dur = act.getClip().duration;
    let x = act.time / dur * n; if (!(x >= 0)) x = 0;
    const i0 = Math.floor(x) % n, i1 = (i0 + 1) % n, a = x - Math.floor(x);
    if (!T.seg) T.seg = Game.trackSegments(T, R);
    const S = T.seg;
    const fps = (T.fps || 30) * (act.getEffectiveTimeScale ? Math.abs(act.getEffectiveTimeScale()) || 1 : 1);
    if (D.palmFor !== T) { D.palmFor = T; D.palmY = new Float32Array(n); }
    const palmY = Math.max(R, hand.y - R - 0.02);
    const xu = D.sched === 'fly' && x < D.relX - 0.5 ? x + n : x;         // le clip vient de reboucler pendant le vol
    // ---------- fin de vol : la main a rattrapé la balle ----------
    // Un vol commencé par un AUTRE mode de dribble (bras procéduraux, calendrier) ou une autre piste n'a pas
    // les repères de celle-ci : on le reprend à zéro au lieu de lire des champs qui n'existent pas.
    if (D.sched === 'fly' && D.trackFor !== T) D.sched = 'push';
    if (D.sched === 'fly' && xu >= D.tC) D.sched = 'push';
    if (D.sched !== 'fly') {
      D.palmY[i0] = palmY;                                                // on apprend la hauteur réelle de la paume
      const tB = S.next[i0], left = (tB - x) / fps;                       // temps restant avant le contact au sol
      const V0 = 3.2;                                                     // poussée maximale de la main (m/s)
      const need = (Math.sqrt(V0 * V0 + 2 * G * Math.max(0, palmY - R)) - V0) / G;
      if (T.hold[i0] && left > need) {                                    // encore le temps : la balle reste dans la paume
        _v2.set(hand.x, palmY, hand.z);
        ball.pos.lerp(_v2, damp(D.sched === 'push' ? 40 : 24, dt)); D.sched = 'push'; D.bounced = false; D.relKey = null;
        return;
      }
      D.tB = tB; D.tC = S.grab[i0]; D.relX = x; D.relY = Math.max(R, ball.pos.y);
      D.yC = Math.max(R, D.palmY[((D.tC % n) + n) % n] || S.grabY[i0]);
      D.flyT = 0; D.off = D.off || new THREE.Vector3(); D.trackFor = T;
      D.off.set(0, 0, 0); D.offPending = true;
    } else D.flyT += dt;
    // ---------- horizontal : la piste, l'écart laissé par la paume au lâcher se résorbe en 0,12 s ----------
    const p = T.pos, lx = p[i0 * 3] * (1 - a) + p[i1 * 3] * a, lz = p[i0 * 3 + 2] * (1 - a) + p[i1 * 3 + 2] * a;
    h.moveWorld(_v2.set(lx, 0, lz), _v2);
    if (D.offPending) { D.off.set(ball.pos.x - _v2.x, 0, ball.pos.z - _v2.z); D.offPending = false; }
    const kxz = Math.max(0, 1 - D.flyT / 0.12);
    // ---------- vertical : chute poussée jusqu'au sol, puis rebond jusqu'à la paume qui reprend ----------
    const xf = x < D.relX - 0.5 ? x + n : x;
    let ly;
    if (xf <= D.tB) {
      const tau = Math.max(0.02, (D.tB - D.relX) / fps), t = (xf - D.relX) / fps;
      const v0 = ((D.relY - R) - 0.5 * G * tau * tau) / tau;              // poussée déduite du temps qu'il reste
      ly = D.relY - v0 * t - 0.5 * G * t * t;
    } else {
      const tau = Math.max(0.02, (D.tC - D.tB) / fps), t = (xf - D.tB) / fps;
      const vb = ((D.yC - R) + 0.5 * G * tau * tau) / tau;                // vitesse de sortie du rebond
      ly = R + vb * t - 0.5 * G * t * t;
    }
    ball.pos.set(_v2.x + D.off.x * kxz, Math.max(R, ly), _v2.z + D.off.z * kxz);
    if (!D.bounced && ly < R + 0.035) { D.bounced = true; this.audio.bounce(h.speedNow > 0.1 ? 0.75 : 0.6, ball.pos); }
    D.sched = 'fly';
  }

  // Balle pilotée par le calendrier du clip (voir Player._dribbleScheds) : entre un maximum et le minimum suivant de la main
  // la balle est sous la paume ; du minimum (lâcher) au maximum suivant (reprise) elle descend au sol et remonte, les deux
  // demi-trajets partagés au prorata des racines des hauteurs (chute physique), x/z figés dans le repère du joueur.
  dribbleSched(h, ball, hand, act, S, dt) {
    const D = h.drib, ext = S.ext, R = BALL_R, t = act.time, rev = act.loop === THREE.LoopPingPong && act._loopCount > 0 && (act._loopCount & 1) === 1;   // ping-pong : un cycle sur deux à l'envers (_loopCount = -1 avant la 1re boucle)
    let k = 0; while (k < ext.length && ext[k].t <= t) k++;
    let prev = rev ? ext[k] : ext[k - 1], next = rev ? ext[k - 1] : ext[k];
    if (S.cyclic && ext.length > 1) {   // boucle simple : on prolonge le calendrier d'un cycle de chaque côté
      const dur = act.getClip().duration;
      if (!prev) prev = { ...ext[ext.length - 1], t: ext[ext.length - 1].t - dur };
      if (!next) next = { ...ext[0], t: ext[0].t + dur };
    }
    D.aheadPush = h.speedNow > 0.1 ? Math.min(0.3, h.speedNow * 0.05) : 0;   // en course : balle poussée devant la main
    if (!prev || !next || prev.type === 'max') {
      // main qui descend (ou hors calendrier) : balle collée sous la paume (devant en course)
      _v2.set(hand.x + h.facing.x * D.aheadPush, Math.max(R, hand.y - R - 0.02), hand.z + h.facing.z * D.aheadPush);
      ball.pos.lerp(_v2, damp(D.sched ? 40 : 18, dt));
      D.sched = 'push'; D.relKey = null;
      return;
    }
    const key = prev.i + (rev ? 'r' : 'f');
    if (D.relKey !== key) {
      // lâcher : on mémorise le point de départ dans le repère du joueur (x = gauche, z = devant)
      const f = h.facing, dx = ball.pos.x - h.pos.x, dz = ball.pos.z - h.pos.z;
      D.relLocal = D.relLocal || new THREE.Vector3();
      D.relLocal.set(dx * f.z - dz * f.x, 0, dx * f.x + dz * f.z);
      D.yr = Math.max(R + 0.02, ball.pos.y); D.yc = Math.max(R + 0.08, next.h - R - 0.02); D.bounced = false; D.relKey = key;
      D.TF = Math.abs(next.t - prev.t) / Math.max(0.2, Math.abs(act.getEffectiveTimeScale ? act.getEffectiveTimeScale() : 1) || 1); D.volOk = false;
      D.cross = !!(prev.hand && next.hand && prev.hand !== next.hand);   // changement de main (clip à deux mains)
    }
    const T = Math.max(0.12, Math.abs(next.t - prev.t)), u = Math.min(1, Math.abs(t - prev.t) / T);
    this._flyBall(h, ball, hand, u);
    D.sched = 'fly';
  }

  // vol de la balle entre le lâcher (u = 0, hauteur D.yr) et la reprise (u = 1, hauteur D.yc) : deux demi-chutes au prorata
  // des racines des hauteurs, x/z figés dans le repère du joueur (poussée devant en course), retour vers la main en remontant
  _flyBall(h, ball, hand, u) {
    const D = h.drib, R = BALL_R;
    // Deux VRAIES paraboles : poussée vers le bas, gravité, rebond qui rend 78 % de la vitesse (volSur). Les
    // anciennes étaient tête en bas (y = R + H·w²) : la balle arrivait au sol à vitesse nulle et flottait.
    if (!D.volOk || !D.vol) { D.vol = volSur(D.TF || 0.35, D.yr - R, D.yc - R, D.vol || {}); D.volOk = true; }
    const fr = D.vol.t1 / D.vol.TF;
    const y = Math.max(R, volY(D.vol, u * D.vol.TF));
    if (u >= fr && !D.bounced) { D.bounced = true; this.audio.bounce(h.speedNow > 0.1 ? 0.75 : 0.6, ball.pos); }
    const ahead = h.speedNow > 0.1 ? 0.25 * Math.sin(u * Math.PI) : 0;
    h.moveWorld(_v2.set(D.relLocal.x, 0, D.relLocal.z + ahead), _v2);
    const ap = D.aheadPush || 0, hx = hand.x + h.facing.x * ap, hz = hand.z + h.facing.z * ap;   // point de reprise : main (+ avance en course)
    if (D.cross) { _v2.x += (hx - _v2.x) * u; _v2.z += (hz - _v2.z) * u; }   // vers l'autre main : trajet rectiligne, rebond à mi-chemin
    else if (u > fr) { const w = (u - fr) / (1 - fr), k = w * w * (3 - 2 * w); _v2.x += (hx - _v2.x) * k; _v2.z += (hz - _v2.z) * k; }
    ball.pos.set(_v2.x, y, _v2.z);
  }

  // Bras procéduraux (course balle en main) : la phase du bras (Player.dribbleT, un cycle par foulée double du clip de course)
  // est connue -> main au plus bas à dribbleT = π/2 (lâcher), au plus haut à 3π/2 (reprise). Balle collée sous la paume quand
  // la main descend, en vol (sol puis retour dans la main) quand elle remonte : synchro exacte quelle que soit la vitesse.
  dribbleProc(h, ball, hand, dt) {
    const D = h.drib, R = BALL_R, TAU = Math.PI * 2;
    const ang = (((h.dribbleT - Math.PI / 2) % TAU) + TAU) % TAU;     // 0 = lâcher, π = reprise
    if (ang >= Math.PI) {
      _v2.set(hand.x, Math.max(R, hand.y - R - 0.02), hand.z);
      ball.pos.lerp(_v2, damp(D.sched === 'push' ? 40 : 18, dt));
      D.sched = 'push'; D.relKey = null; D.topY = Math.max(D.topY || 0, hand.y);
      return;
    }
    if (D.relKey !== 'proc') {
      const f = h.facing, dx = ball.pos.x - h.pos.x, dz = ball.pos.z - h.pos.z;
      D.relLocal = D.relLocal || new THREE.Vector3(); D.relLocal.set(dx * f.z - dz * f.x, 0, dx * f.x + dz * f.z);
      D.yr = Math.max(R + 0.02, ball.pos.y); D.yc = Math.max(R + 0.08, (D.topY || hand.y + 0.25) - R - 0.02); D.bounced = false; D.relKey = 'proc'; D.topY = 0;
      D.TF = h.locoActif && h.locoCad > 0 ? 1 / (4 * h.locoCad) : Math.PI / (h.speedNow > 0.1 ? 9.5 : 6.5); D.volOk = false;
    }
    this._flyBall(h, ball, hand, ang / Math.PI);
    D.sched = 'fly';
  }

  // ---------- règles du match ----------
  rules(dt) {
    const ball = this.ball, off = this.offense, def = 1 - off;

    // chrono (gelé pendant qu'un tir est en l'air)
    const shotLive = (ball.shot && !ball.touchedFloor) || this.pendingShot;
    if (!shotLive) {
      this.shotClock -= dt;
      if (this.shotClock <= 0) { this.turnover(`${SHOT_CLOCK} SECONDES !`, def); return; }
    }
    // panier ?
    if (ball.shot && !ball.shot.scored && ball.prevY > COURT.HOOP_Y && ball.pos.y <= COURT.HOOP_Y) {
      // On interpole la position AU MOMENT du passage du plan du cercle. Le test se faisait sur la position de fin
      // d'image : à 30 im/s un 3 points avance de 21 cm dans l'image et des paniers réussis passaient à côté.
      const u = (ball.prevY - COURT.HOOP_Y) / Math.max(1e-5, ball.prevY - ball.pos.y);
      _v.set(ball.prevPos.x + (ball.pos.x - ball.prevPos.x) * u, 0, ball.prevPos.z + (ball.pos.z - ball.prevPos.z) * u);
      for (const hoop of HOOP_VEC) if (hdist(_v, hoop) < COURT.RIM_R - 0.03) { this.onScore(ball.shot, hoop); return; }
    }
    // sortie de terrain (seuils choisis pour que toute balle "dedans" reste ramassable)
    // Sur les petits terrains (le parc de Becon, cloture a 10 cm de la ligne de fond) les seuils suivent le
    // terrain : la balle qui touche la cloture est dehors. Ailleurs, 7,7 et 14,2 comme avant.
    const petit = COURT.L < 20;
    const xOut = petit ? COURT.W / 2 + 0.2 : 7.7, zOut = petit ? Math.min(COURT.L / 2 + 0.2, ENCEINTE.Z + 0.1 - BALL_R - 0.02) : 14.2;
    const dehors = ball.state !== 'held' && (Math.abs(ball.pos.x) > xOut || Math.abs(ball.pos.z) > zOut);
    // 1 CONTRE 1 : PAS DE REBOND. Un tir raté ne se dispute pas : on le laisse se voir (la balle tape le cercle ou la
    // planche et repasse sous l'arceau, ou touche le sol), puis la balle va à l'adversaire — au check en demi-terrain,
    // depuis sa moitié en terrain entier (resetPossession). Personne ne la ramasse entre-temps (contestBall). Un contre
    // la rend tout de suite (blockShot). Le raté qui file hors du terrain par-dessus la planche est un raté aussi.
    if (this.sansRebond() && ball.shot && !ball.shot.scored && !ball.holder && (dehors || this.rateVisible(ball))) {
      this.turnover('', 1 - ball.shot.shooter.team, 1);
      return;
    }
    // passe en vol : réception / interception
    if (ball.pass) { this.updatePass(); if (ball.state === 'held') return; }
    // ramasser la balle
    if (ball.state === 'loose') this.contestBall();
    // demi-terrain : la balle gagnée en jeu est-elle ressortie derrière l'arc ?
    if (this.aSortir >= 0) this.majSortie();
    if (dehors && ball.state !== 'held') {
      const lt = ball.lastTouch;
      this.turnover('SORTIE DE TERRAIN', lt ? 1 - lt.team : def);
    }
  }

  // Somme des niveaux de deux jeux de capacités (signature du perso + celles achetées), plafonnée au niveau max.
  static mergeBadges(a, b) {
    const out = { ...(a || {}) };
    for (const [k, v] of Object.entries(b || {})) out[k] = Math.min(BADGE_MAX, (out[k] || 0) + v);
    return out;
  }

  // Choix de l'atelier : un panneau listant les cinq exercices, avec le record personnel de chacun.
  openDrillMenu() {
    this.paused = true;
    const boutons = DRILLS.map((d) => ({
      label: `${d.icon} ${d.name}${this.training.record(d.id) ? ` · record ${this.training.record(d.id)}` : ''}`,
      cls: 'btn-secondary',
      onClick: () => { hideOverlay(); this.paused = false; this.startDrill(d.id); },
    }));
    boutons.push({ label: 'Retour à la balade', cls: 'btn-primary', onClick: () => { hideOverlay(); this.paused = false; } });
    const ou = this.sansMarchand ? 'à la boutique (menu pause)' : `chez ${this.nomMarchand}`;
    showOverlay('ENTRAÎNEMENT', `Chaque atelier rapporte des pièces et des points d'entraînement. Les points paient tes caractéristiques et tes capacités ${ou}.`, boutons);
  }

  startDrill(id) {
    if (!this.training.start(id)) return;
    const d = this.training.drill;
    this.ball.hold(this.user);
    this.hud.feedback(`${d.icon} ${d.name.toUpperCase()}`, 'good');
    this.hud.hint(`${d.desc} · ${d.bonus} · ${d.dur} s`);
  }

  endDrill(fin) {
    const { drill, score, hits, record, bonus } = fin;
    this.paused = true;                    // sinon on continue à jouer derrière l'écran de fin
    this.reward('FIN D\'ATELIER', bonus, Math.round(bonus * 0.6));
    if (record) { this.wallet.addJetons(JETONS.record); this.hud.gain('RECORD · JETON DE VŒU', 0, 0); }
    this.hud.feedback(record ? `NOUVEAU RECORD : ${score}` : `TERMINÉ · ${score} pts`, record ? 'good' : 'info');
    this.hud.possession('', false);
    this.hud.hint(this.lobbyHint());
    this.cb.onChat?.(record ? 'win' : 'shop');
    showOverlay(record ? 'NOUVEAU RECORD !' : 'ATELIER TERMINÉ',
      `${drill.icon} ${drill.name} · ${score} points (${hits} réussites)${bonus ? ` · bonus +${bonus} 🪙` : ''}`,
      [{ label: 'Recommencer', cls: 'btn-primary', onClick: () => { hideOverlay(); this.paused = false; this.startDrill(drill.id); } },
       { label: 'Choisir un autre atelier', cls: 'btn-secondary', onClick: () => { hideOverlay(); this.paused = false; this.openDrillMenu(); } },
       { label: 'Retour à la balade', cls: 'btn-secondary', onClick: () => { hideOverlay(); this.paused = false; } }]);
  }

  // Tirage des règles. Seul ce point doit être utilisé par la logique de jeu : c'est ce qui rend une partie
  // reproductible à partir d'une graine, donc rejouable à l'identique sur deux machines.
  rnd() { return this.rng.next(); }

  // Branche (ou débranche) le salon en ligne sur la balade. Une fois branché, le terrain est partagé : les autres
  // joueurs connectés apparaissent et se déplacent avec toi, et le cercle bleu lance un match avec ceux qui sont
  // dedans. Hors ligne, rien de tout cela n'existe et la balade reste exactement ce qu'elle était.
  // Joueurs fictifs qui se promènent, pour voir le hub sans serveur. Ils empruntent exactement le même chemin
  // que de vrais joueurs distants, donc ça vérifie aussi le pipeline de présence.
  setDemo(n) {
    this.demo = n > 0 ? new Demo(this.presence, ROSTER_ALL, n) : null;
    this.presence.setDemoOn(!!this.demo);
    this.hud.hint(this.lobbyHint());
    return !!this.demo;
  }

  // ---------- match en ligne (js/enligne.js) ----------
  // Lancé depuis l'écran de match quand des joueurs en ligne étaient dans le cercle. On n'entre pas en match
  // ici : on l'annonce, et c'est l'écho du relais qui fait partir tout le monde, lanceur compris.
  lancerEnLigne(opts) {
    const room = this.online;
    if (!room) { this.startMatch(opts); return; }
    const humains = [{ id: room.ident.id, nom: room.ident.display, team: 0, slot: 0, tn: this.tenueIds() }, ...(opts.enLigne || [])];
    room.lancerMatch({
      // `mid` : le numéro du match, qui permet de l'annoncer et de le rejoindre en cours (js/enligne.js)
      v: 1, hote: room.ident.id, humains, mid: Math.random().toString(36).slice(2, 10),
      teamA: opts.teamA.map((d) => d.id), teamB: opts.teamB.map((d) => d.id),
      target: opts.target, half: !!opts.half, difficulty: opts.difficulty, names: opts.names,
      seed: (Math.random() * 0xffffffff) >>> 0,
      dims: [COURT.L, COURT.W, (this.scene.userData.reperes || {}).plateau || 0],
      // le monde de l'hôte (parc entier, lot A7 ; lu par MatchEnLigne.autreMonde) : drapeau baissé, rien n'est ajouté
      ...(this.presence.ter ? { ter: this.presence.ter } : {}),
    });
    this.hud.feedback('MATCH EN LIGNE…', 'info');
  }
  recevoirMatch(m, from) {
    const room = this.online;
    if (!room || !m || !Array.isArray(m.teamA) || !Array.isArray(m.teamB) || !Array.isArray(m.humains)) return;
    if (m.hote !== from) return;                                  // on ne lance pas un match au nom d'un autre
    // un match EN COURS (quelqu'un y entre, ou c'est nous) : rejoindre sans rien relancer (js/enligne.js, Matchs)
    if (m.enCours) { if (this.matchs) this.matchs.recevoirEnCours(m); return; }
    const moi = room.ident.id;
    if (!m.humains.some((h) => h.id === moi)) {
      if (this.mode === 'lobby') { const h = m.humains.find((x) => x.id === m.hote); this.hud.feedback(`${String((h && h.nom) || 'Quelqu’un').toUpperCase()} LANCE UN MATCH`, 'info'); }
      return;
    }
    if (this.mode !== 'lobby') return;                            // déjà en match, ou pas sur le terrain
    // Un match lance sur un terrain d'une autre taille (le parc de Becon fait 18,2 m) ne se joue pas ici : les
    // positions voyagent en coordonnees absolues, les cercles ne seraient pas au meme endroit.
    // (le 3e champ distingue les deux terrains du parc de Becon, qui ont les memes cotes mais pas les memes paniers)
    if (Array.isArray(m.dims) && (Math.abs(m.dims[0] - COURT.L) > 0.01 || Math.abs(m.dims[1] - COURT.W) > 0.01
        || (m.dims[2] || 0) !== ((this.scene.userData.reperes || {}).plateau || 0))) {
      this.hud.feedback('MATCH SUR UN AUTRE TERRAIN', 'warn'); return;
    }
    // (parc entier, lot A7) un hôte d'un autre monde — même taille de terrain, mais La Cage n'est pas le parc
    if (MatchEnLigne.autreMonde(m, this.presence.ter)) { this.hud.feedback('MATCH SUR UN AUTRE TERRAIN', 'warn'); return; }
    this.cb.onMatchEnLigne?.();                                   // ferme les panneaux ouverts (choix du match, boutique...)
    if (this.paused) { this.paused = false; hideOverlay(); }
    const R = new MatchEnLigne(this, room, m);
    this.startMatch(MatchEnLigne.options(m, moi));
    if (this.mode !== 'match') return;
    this.reseau = R;
    R.installer();
    const autres = m.humains.filter((h) => h.id !== moi).map((h) => h.nom || 'Joueur');
    this.hud.streak(`EN LIGNE · AVEC ${autres.join(', ').toUpperCase()}`);
  }
  // Les joueurs en ligne qu'on peut emmener en match (écran du match, js/ui.js) : ceux du cercle d'abord.
  joueursDispo() { return this.online ? this.presence.disponibles(RING_POS, RING.r + 0.6) : []; }
  recevoirInput(m) { if (this.reseau) this.reseau.recevoirInput(m); }
  recevoirEtat(m) { if (this.reseau) this.reseau.recevoirEtat(m); }
  quitterEnLigne() {
    if (!this.reseau) return;
    this.reseau.quitter();
    this.reseau = null;
  }

  setOnline(room) {
    if (!room) this.quitterEnLigne();
    // Le vélo du terrain : chaque salon a son histoire. On oublie les numéros de l'ancien, et le vélo garé
    // hors ligne revient contre le grillage — c'est là que tous ceux qui arrivent le voient.
    this.veloSeq = 0; this.veloPar = ''; this.veloNonce = 0; this.presence.veloGare = null;
    const b = this.veloTerrain, o = this.veloOrigine;
    if (this.velosEnLigne) this.remettreVelosEnLigne();          // (parc entier, lot A7 : les six vélos)
    else if (b && o && !b.pris) { b.pos.set(o.x, 0, o.z); b.cap = o.cap; b.penche = o.penche; b.appui = o.appui; b.bequille = o.appui === 'bequille' ? 1 : 0; b.braq = 0; b.memoriser(); }
    this.online = room || null;
    if (room && !room.mesurer) { room.mesurer = true; room.sonder(); }   // la latence, affichée sur le terrain (js/net.js)
    this.presence.attach(room || null);
    if (!room) { this.presence.clear(); if (this.matchs) this.matchs.vider(); }
    this.hud.hint(this.lobbyHint());
  }

  // UN JOUEUR DU PARC AUX DONNÉES DU MONDE DIFFÉRENTES (lot A7, js/presence.js) : ni le même sol ni les mêmes murs, on
  // ne se voit pas. On le dit une fois, en balade (ailleurs le HUD est caché : on le dira au paquet suivant qu'on y
  // recevra — d'où le false, « pas dit »).
  signalerAutreVersion(nom) {
    if (this.mode !== 'lobby') return false;
    this.hud.feedback('METTRE À JOUR LE JEU', 'warn');
    this.hud.streak(`${String(nom).toUpperCase()} A UNE AUTRE VERSION DU PARC : VOUS NE VOUS VOYEZ PAS`);
    console.info(`[en ligne] ${nom} a d'autres données du parc (empreinte différente de ${Monde.hash}) : mettre à jour le jeu pour se voir`);
    return true;
  }

  // Guichet unique des récompenses. Tout ce qui rapporte passe par ici : match, entraînement, balade.
  // `mine` évite de créditer le joueur pour une action de l'adversaire.
  reward(why, coins, xp, mine = true) {
    if (!mine || (!coins && !xp)) return;
    if (coins) this.wallet.add(coins);
    if (xp) this.wallet.addXp(xp);
    this.hud.gain(why, coins, xp);
    this.hud.coins(this.wallet.coins, this.wallet.boostText());
  }

  // Dispute de balle au sol / au rebond. Avant, c'était le premier joueur du tableau à moins de 0,9 m qui prenait
  // la balle : à distance égale l'équipe du joueur gagnait toujours. Maintenant chaque prétendant reçoit un poids
  // (stat de rebond, taille, distance, hauteur de saut, box-out) et le meilleur emporte le ballon.
  contestBall() {
    if (this.balleMorte()) return;                       // 1 contre 1 : le tir raté ne se ramasse pas (rules)
    const ball = this.ball, rebond = !!(ball.shot && !ball.shot.scored) && ball.pos.y > 1.1;
    let best = null, bw = 0;
    for (const p of this.players) {
      if (p.stun > 0 || p.emote || !p.mesh.visible) continue;
      if (p.state !== 'idle' && p.state !== 'jump') continue;
      const d = hdist(p.pos, ball.pos);
      const atteinte = 1.6 + p.jumpY + (p.h - 1.85) + (p.badgeFx ? p.badgeFx.reach || 0 : 0);
      if (d > 1.05 || ball.pos.y > atteinte) continue;
      // poids : proximité d'abord, puis rebond/taille quand c'est en l'air
      let w = (1.15 - d) * 2.2 + p.jumpY * 1.4;
      if (rebond) w += ((p.def.reb || 60) / 100) * 1.6 + (p.h - 1.75) * 1.2 + (p.badgeFx ? p.badgeFx.reb || 0 : 0);
      if (p.boxOutT > 0) w += 0.5;                       // il a pris la position avant que la balle ne tombe
      if (ball.lastTouch === p) w *= 0.8;                // celui qui vient de tirer n'a pas la priorité
      if (w > bw) { bw = w; best = p; }
    }
    if (best) this.pickup(best, rebond);
  }

  pickup(p, rebond = false) {
    if (this.ball.pos.y < 0.7) p.pickupT = 0.55;     // balle au sol : geste de ramassage (clip Picking Up)
    // Rebond pris en hauteur : geste dédié (bras en l'air, balle serrée au buste, retombée encaissée) plutôt que
    // la réception à deux mains, qui est un geste de passe reçue à hauteur de poitrine.
    if (rebond) {
      if (this.ball.pos.y > 1.5 || p.airborne) p.rebondT = 0.6; else p.recevoir(0.4);
      this.audio.catchBall?.(p.pos);
      if (p === this.user) this.addShake(0.05, 0.16);
    }
    this.ball.hold(p);
    if (p.team !== this.offense) this.changePossession(p.team, p.team === 0 ? 'REBOND ! À TOI' : 'REBOND ADVERSE');
    else { this.shotClock = Math.max(this.shotClock, 7); if (rebond && p.team === 0) this.hud.feedback('REBOND OFFENSIF', 'good'); }
    if (rebond) this.reward('REBOND', 2, 1, p.team === 0);
  }

  onScore(shot, hoop) {
    shot.scored = true; shot.passedRim = true;
    this.ball.vel.x *= 0.25; this.ball.vel.z *= 0.25; this.ball.vel.y *= 0.45;
    const team = shot.shooter.team, who = TEAM_KEY[team];
    this.teams[team].score += shot.points;
    if (this.reseau) this.reseau.evt({ k: 'sc', t: team, pts: shot.points, ty: shot.type, sw: shot.rimHit ? 0 : 1, nom: shot.shooter.def.name, i: this.reseau.pid(shot.shooter) });
    this.hud.setScore(this.teams[0].score, this.teams[1].score);
    const by = this.teamSize > 1 ? ` ${shot.shooter.def.name.toUpperCase()}` : '';
    this.hud.feedback(`+${shot.points} ${shot.type === 'dunk' ? 'DUNK !' : shot.rimHit ? '' : 'SWISH !'}${by}`, who === 'user' ? 'good' : 'bad');
    this.audio.swish(shot.shooter.hoop);
    // série + momentum : 2 paniers de suite = "en feu" (vitesse et adresse boostées, balle enflammée)
    const other = who === 'user' ? 'cpu' : 'user';
    this.streak[who]++; this.streak[other] = 0;
    if (this.streak[who] >= 2) this.hud.streak(`${this.streak[who]} PANIERS DE SUITE${who === 'cpu' ? ' (ADVERSAIRE)' : ''}`);
    if (who === 'user') { this.audio.cheer(); this.audio.swell(0.5 + Math.min(3, this.streak.user) * 0.15, 1.8); if (shot.points === 3) this.addShake(0.04, 0.3); }
    else { this.audio.boo(); this.audio.swell(0.25, 1.2); }
    this.addMomentum(who, 0.5);
    // récompense immédiate : c'est ce qui donne le rythme « chaque action compte » d'un 2K
    if (who === 'user') {
      const gros = shot.type === 'dunk' ? 'DUNK' : shot.points === 3 ? '3 POINTS' : 'PANIER';
      const c = shot.type === 'dunk' ? 6 : shot.points === 3 ? 5 : 3;
      const x = shot.type === 'dunk' ? 4 : shot.points === 3 ? 3 : 2;
      this.reward(gros + (shot.green ? ' PARFAIT' : ''), c + (shot.green ? 2 : 0), x + (shot.green ? 2 : 0));
      if (shot.assist) this.reward('PASSE DÉCISIVE', 3, 2);
    }
    this.hud.meter(false); this.hud.hint('');
    shot.shooter.startCelebrate();
    if (this.teams[team].score >= this.opts.target) {
      for (const p of this.opponents(shot.shooter)) p.state = 'defeat';
      // les invités reçoivent la fin tout de suite : après le buzzer il n'y a plus d'image du match
      if (this.reseau) { this.reseau.evt({ k: 'fin', t: team }, true); this.reseau.fini = true; }
      this.finDeMatch(who === 'user');
      return;
    }
    this.state = 'scored'; this.stateT = 2.0; this.aSortir = -1;
    this.pendingOffense = 1 - team;                       // remise en jeu par l'équipe qui a encaissé
    // depuis sa ligne de fond : deduite de la longueur du terrain, qui depend du lieu
    this.pendingFromZ = this.half ? HALF_CHECK_Z : hoop.sgn * (COURT.L / 2 - 0.5);
  }

  // Fin de match, pour le joueur local : récompenses et écran de résultat. Partagée avec l'invité d'un match
  // en ligne, qui n'a pas vu le panier décisif se jouer chez lui (js/enligne.js).
  finDeMatch(win) {
    this.state = 'over';
    this.audio.buzzer();
    const gain = (win ? COINS.matchWon : COINS.matchPlayed) + this.teams[0].score * COINS.perPoint;   // pièces pour la boutique
    this.wallet.add(gain); this.wallet.addXp((win ? XP.matchWon : XP.matchPlayed) + this.teams[0].score * XP.perPoint); this.wallet.clearBoosts();
    // jetons de vœu : c'est la boucle qui alimente les tirages sans passer par la boutique
    const jet = JETONS.matchJoue + (win ? JETONS.matchGagne : 0);
    this.wallet.addJetons(jet); this.hud.gain('JETONS DE VŒU', 0, 0); this.hud.feedback(`+${jet} 🎟️`, 'good');
    this.cb.onChat?.(win ? 'win' : 'lose');           // le groupe réagit dans le téléphone
    const score = `${this.teams[0].name} ${this.teams[0].score} - ${this.teams[1].score} ${this.teams[1].name} · +${gain} 🪙`;
    // En ligne on ne « rejoue » pas tout seul : on retourne au cercle, où les autres attendent.
    const enLigne = !!this.reseau;
    setTimeout(() => showOverlay(win ? 'VICTOIRE !' : 'DÉFAITE', score, [
      ...(enLigne ? [] : [{ label: 'Rejouer', cls: 'btn-primary', onClick: () => { this.state = 'playing'; this.mode = 'lobby'; this.startMatch(); } }]),
      { label: 'Retour balade', cls: enLigne ? 'btn-primary' : 'btn-secondary', onClick: () => this.enterLobby() },
      ...(enLigne ? [] : [{ label: 'Autre match', cls: 'btn-secondary', onClick: () => { this.enterLobby(); this.cb.onSetup?.(); } }]),
      { label: 'Menu principal', cls: 'btn-secondary', onClick: () => this.cb.onMenu() },
    ]), 900);
  }

  // `ra` : raté sans rebond du 1 contre 1 (1 = tir manqué, 2 = contre). Son texte dépend de qui le lit : chacun le
  // compose de son côté (texteRate) ; l'événement des invités porte le code, et un texte neutre pour les autres.
  turnover(msg, newOffense, ra = 0) {
    if (ra) msg = Game.texteRate(ra, newOffense === 0);
    if (this.reseau) this.reseau.evt(ra ? { k: 'to', msg: Game.texteRate(ra, null), t: newOffense, ra } : { k: 'to', msg, t: newOffense });
    this.state = 'turnover'; this.stateT = 1.4;
    this.pendingOffense = newOffense; this.pendingFromZ = null; this.pendingShot = null; this.aSortir = -1;
    this.hud.feedback(msg, newOffense === 0 ? 'good' : 'bad');
    this.hud.meter(false); this.hud.hint('');
    this.audio.whistle();
    // (sur un raté, le tireur finit son saut : il retombe tout seul en position normale, Player.update)
    if (!ra) for (const p of this.players) { p.state = 'idle'; p.windup = 0; }
  }
  // `pourMoi` : la balle revient à l'équipe locale 0 (true), à l'autre (false), ou à personne en particulier (null :
  // spectateur, qui lit `nom`, l'équipe qui récupère la balle ; sans nom, le texte neutre d'un ancien invité).
  static texteRate(ra, pourMoi, nom = null) {
    if (pourMoi === null) return (ra === 2 ? 'CONTRE' : 'RATÉ') + (nom ? ` · BALLE À ${String(nom).toUpperCase()}` : ' · PAS DE REBOND');
    if (ra === 2) return pourMoi ? 'CONTRE ! BALLE À TOI' : 'CONTRÉ · BALLE À L’ADVERSAIRE';
    return pourMoi ? 'RATÉ · BALLE À TOI' : 'RATÉ · BALLE À L’ADVERSAIRE';
  }

  // ---------- caméras ----------
  // Le cote de la camera de diffusion : +1 (x+, le defaut) ou -1, si le terrain le demande (reperes.camTV).
  coteTV() { return ((this.scene.userData.reperes || {}).camTV || 1) < 0 ? -1 : 1; }

  // LES ARBRES DANS LA CAMERA DE DIFFUSION (scene.userData.arbresTV : les emplacements rendus par modelTree,
  // js/court_jemmapes.js). En match, vue TV, ils ne gardent que leur OMBRE : chaque maillage passe sur une copie
  // de son materiau qui n'ecrit ni couleur ni profondeur — la carte d'ombre, elle, les dessine toujours (three
  // en tire son materiau de profondeur, decoupe des feuilles comprise). La passe de normales de l'occlusion
  // ambiante les ignore aussi (scene.userData.feuillages, js/fx.js), sinon leur silhouette assombrirait le sol.
  // On regarde l'arbre du moment a chaque image : le modele 3D remplace l'arbre dessine quand il arrive.
  arbresTV(enTV) {
    const spots = this.scene.userData.arbresTV;
    if (!spots) return;
    for (const s of spots) {
      const o = s.arbre || s.fallback;
      if (!o || !!o.userData.ombreSeule === enTV) continue;
      o.userData.ombreSeule = enTV;
      const f = this.scene.userData.feuillages || (this.scene.userData.feuillages = []);
      o.traverse((m) => {
        if (!m.isMesh) return;
        const u = m.userData;
        if (!u.matVu) {
          u.matVu = m.material;
          const ombre = (x) => { const c = x.clone(); c.colorWrite = false; c.depthWrite = false; return c; };
          u.matOmbre = Array.isArray(m.material) ? m.material.map(ombre) : ombre(m.material);
        }
        m.material = enTV ? u.matOmbre : u.matVu;
        const i = f.indexOf(m);
        if (enTV && i < 0) f.push(m); else if (!enTV && i >= 0) f.splice(i, 1);
      });
    }
  }

  // CAMÉRA DE BALADE SUR LE RELIEF (js/monde.js ; jamais appelée sur un terrain plat). `ox, oz` : le recul horizontal
  // voulu, `h` : la hauteur voulue au-dessus du sol du joueur. La caméra ne descend jamais à moins de 0,5 m du sol à
  // sa verticale, et quand un talus, un mur ou un tronc s'interpose entre la tête et elle (Monde.rayonLibre), elle
  // se rapproche : VITE quand l'obstacle arrive (k = 25), LENTEMENT quand il s'en va (k = 4), pour ne pas pomper.
  _cibleCamRelief(p, u, ox, oz, h, dt) {
    const tx = u.x + ox, tz = u.z + oz, ty = Math.max(Monde.sol(tx, tz) + 0.5, p.solAff + h);
    const tete = p.solAff + p.h * 0.93;
    const libre = Monde.rayonLibre(u.x, tete, u.z, tx, ty, tz, 0.2);
    const L = Math.max(0.3, Math.hypot(ox, ty - tete, oz));
    const f = Math.max(0, libre - 0.2 / L), c = this._camLibre ?? 1;
    this._camLibre = c + (f - c) * (dt > 0 ? damp(f < c ? 25 : 4, dt) : 0);
    const k = Math.min(this._camLibre, f < 1 ? f : 1);
    this.camTarget.set(u.x + ox * k, tete + (ty - tete) * k, u.z + oz * k);
  }

  updateCamera(dt) {
    if (this.freeCam) return;   // debug : caméra pilotée à la main (__game.freeCam = true)
    const net = this.scene.userData.topNet, sideNet = this.scene.userData.sideNetTV;
    const enTV = this.mode === 'match' && this.camMode === 'tv';
    if (sideNet) sideNet.visible = !enTV;
    // Jemmapes : les poteaux et les lisses de ce côté partent avec la maille, sinon la lisse du pied barre le bas de
    // l'image d'un gros tube noir. Comme les arbres (arbresTV, plus bas) ils gardent leur OMBRE sur le terrain : un
    // matériau qui n'écrit ni couleur ni profondeur, et hors de la passe de normales de l'occlusion (feuillages).
    const metalTV = this.scene.userData.metalTV;
    if (metalTV && !!metalTV.userData.ombreSeule !== enTV) {
      const u = metalTV.userData;
      if (!u.matVu) { u.matVu = metalTV.material; u.matOmbre = metalTV.material.clone(); u.matOmbre.colorWrite = false; u.matOmbre.depthWrite = false; }
      u.ombreSeule = enTV; metalTV.material = enTV ? u.matOmbre : u.matVu;
      const f = this.scene.userData.feuillages || (this.scene.userData.feuillages = []), i = f.indexOf(metalTV);
      if (enTV && i < 0) f.push(metalTV); else if (!enTV && i >= 0) f.splice(i, 1);
    }
    this.arbresTV(enTV);
    if (this.mode === 'menu') {
      // fond du menu : lente ronde à l'intérieur de la cage, à hauteur d'homme, qui balaie les deux paniers
      const a = this.menuT * 0.045, r = 6.8 + Math.sin(this.menuT * 0.11) * 0.8;
      // bornee a l'enceinte : identique a La Cage, mais elle ne sort plus par les grillages d'un petit terrain
      const petit = COURT.L < 20;
      // (sur un petit terrain elle reste aussi devant les panneaux et les poteaux, qui touchent le grillage)
      const rx = petit ? Math.min(r, Math.min(ENCEINTE.X, ENCEINTE.XP) - 1.0) : r;
      const rz = petit ? Math.min(r * 1.35, ENCEINTE.Z - 1.0, Math.abs(COURT.HOOP_Z) - 0.8) : r * 1.35;
      this.camera.position.set(Math.sin(a) * rx, 2.6 + Math.sin(this.menuT * 0.17) * 0.5, Math.cos(a) * rz);
      this.camera.lookAt(Math.sin(a + 1.2) * 2.5, 1.6, -Math.cos(a) * 6);
      if (net) net.visible = true;
      return;
    }
    if (this.mode === 'select') {
      // écran de sélection : la caméra tourne autour du joueur, qui apparaît à droite de l'écran (fiches à gauche)
      const p = this.preview ? this.preview.pos : ZERO, a = 0.35 + this.selectT * 0.22, R = 3.9;
      this.camera.position.set(p.x + Math.sin(a) * R, 1.5, p.z + Math.cos(a) * R);
      _v.set(p.x - this.camera.position.x, 0, p.z - this.camera.position.z).normalize();
      _v2.set(-_v.z, 0, _v.x);                                   // droite de la caméra (avant × haut)
      this.camera.lookAt(p.x - _v2.x * 0.95, 1.05, p.z - _v2.z * 0.95);   // on vise à gauche du joueur -> il apparaît à droite
      if (net) net.visible = true;
      return;
    }
    if (this.mode === 'lobby') {
      // Trois vues en balade. La souris tourne toujours la caméra (camYaw / camPitch) ; seule la distance, la
      // hauteur et le décalage latéral changent. À la première personne on se place dans la tête et on masque
      // l'avatar, sinon on voit l'intérieur du crâne.
      const p = this.user, u = p.posAff, cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
      // Les hauteurs de la caméra sont comptées au-dessus du SOL sous le joueur (p.solAff, js/monde.js) : 0 sur un
      // terrain plat, où chaque somme ci-dessous est exactement celle d'avant.
      const yeux = p.h * 0.93 + p.jumpY + p.solAff;
      // (camera.far = brouillard + 20 m en balade au parc entier, § 3.4 : c'est js/monde_charge.js qui le pose, à chaque
      // image, APRÈS la météo (qui repose le brouillard) — avec le ciel qui suit la caméra, ramené sous ce plafond, et la
      // jupe de brume sous l'horizon. Hors balade et sur les autres terrains : 700 m, comme toujours.)
      // À VÉLO, la caméra revient d'elle-même derrière le guidon dès qu'on roule — sauf si l'on vient de la
      // tourner à la main (souris ou doigt) : on la laisse alors regarder où l'on veut une seconde et demie.
      const enSelle = !!(p.velo && !p.velo.sortir);
      if (enSelle && dt > 0) {
        const b = p.velo.v;
        const manu = this.dragging || performance.now() - (this.camManuT || 0) < 1500;
        if (!manu && b.v > 0.6) {
          let dy = b.cap + Math.PI - this.camYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          this.camYaw += dy * (1 - Math.exp(-dt * 2.4 * Math.min(1, b.v / 3)));
        }
      }
      // CHAMP DE VISION : il s'ouvre un peu quand on file (sprint, vélo lancé). C'est ce qui donne la
      // sensation de vitesse ; sept degrés au plus, sinon les bords de l'image se déforment.
      if (dt > 0) {
        const vit = enSelle ? Math.abs(p.velo.v.v) : p.speedNow;
        const fov = 58 + 7 * clamp((vit - 4.2) / 3.8, 0, 1);
        if (Math.abs(fov - this.camera.fov) > 0.01) { this.camera.fov += (fov - this.camera.fov) * damp(3, dt); this.camera.updateProjectionMatrix(); }
      }
      if (this.vue === 1) {
        // À la première personne, l'œil est dans la TÊTE de l'avatar : on sent la foulée, l'appui, le corps
        // qui penche dans les virages. Moitié seulement du balancement vertical, sinon le moindre sprint donne
        // le mal de mer ; le bonhomme sans avatar garde l'œil fixe.
        const tete = p.avatar && p.avatar.bone('Head');
        if (tete) {
          tete.getWorldPosition(_vCam);
          const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
          const y = enSelle ? _vCam.y + 0.09 : (_vCam.y + 0.09) * 0.5 + yeux * 0.5;
          this.camPos.set(_vCam.x + fx * 0.09, y, _vCam.z + fz * 0.09);
        } else this.camPos.set(u.x, yeux, u.z);
        // on regarde dans l'axe de la caméra : devant = -sin(yaw), -cos(yaw)
        _v.set(this.camPos.x - Math.sin(this.camYaw) * 3, this.camPos.y - sp * 3.2, this.camPos.z - Math.cos(this.camYaw) * 3);
        this.lookCur.lerp(_v, damp(22, dt));
        this.camera.position.copy(this.camPos);
        this.camera.lookAt(this.lookCur);
        this._applyShake(dt);
        if (p.mesh) p.mesh.visible = false;               // on ne se voit pas de l'intérieur
        p.vuePremiere = true;                             // ... mais on est bien là (pas, regards des autres)
        if (net) net.visible = true;
        return;
      }
      if (p.mesh) p.mesh.visible = true;
      p.vuePremiere = false;
      // 2 = épaule serrée, 3 = épaule large. Toutes deux dans l'axe du joueur : Haythem ne voulait plus du
      // décalage à droite façon MyCareer de la vue épaule (le joueur n'était pas au centre de l'écran).
      const d = this.vue === 2 ? (enSelle ? 2.6 : 1.95) : (enSelle ? 4.7 : 4.3);
      const haut = this.vue === 2 ? 1.62 : 1.5;
      const dx = Math.sin(this.camYaw), dz = Math.cos(this.camYaw);
      if (Monde.plat) this.camTarget.set(u.x + dx * d * cp, Math.max(0.5, haut + d * sp), u.z + dz * d * cp);
      else this._cibleCamRelief(p, u, dx * d * cp, dz * d * cp, haut + d * sp, dt);
      // Sur un terrain qui le demande (reperes.borneCam : le parc de Becon, cloture sur la ligne de fond), la
      // camera ne passe pas derriere le grillage : elle remonte d'autant qu'on la retient. Sur le relief, seulement
      // quand le joueur est DANS l'enceinte (drapeau « plateau ») : dehors, c'est la collision qui travaille.
      if ((this.scene.userData.reperes || {}).borneCam && (Monde.plat || (Monde.drapeaux(u.x, u.z) & DRAPEAU.PLATEAU))) {
        const m = 0.35, x0 = -ENCEINTE.X + m, x1 = ENCEINTE.XP - m, z1 = ENCEINTE.Z + 0.1 - m;
        const cx = clamp(this.camTarget.x, x0, x1), cz = clamp(this.camTarget.z, -z1, z1);
        const retenu = Math.hypot(this.camTarget.x - cx, this.camTarget.z - cz);
        this.camTarget.set(cx, this.camTarget.y + retenu * 0.6, cz);
      }
      this.camPos.lerp(this.camTarget, damp(this.vue === 2 ? 16 : 12, dt));
      _v.set(u.x, (this.vue === 2 ? 1.5 : 1.4) + this.user.jumpY * 0.5 + p.solAff, u.z);
      this.lookCur.lerp(_v, damp(this.vue === 2 ? 18 : 14, dt));
      this.camera.position.copy(this.camPos); this.camera.lookAt(this.lookCur); this._applyShake(dt);
      if (net) net.visible = true;
      return;
    }
    const u = this.user.posAff, b = this.ball.posAff;
    const fx = u.x * 0.5 + b.x * 0.5, fz = u.z * 0.5 + b.z * 0.5;
    // ---- DEMI-TERRAIN : caméra de playground, façon 3on3 Freestyle ou 2K Playgrounds ----
    // On se place derrière le côté ouvert, assez bas, et on regarde le panier. Tout le demi-terrain tient à
    // l'écran et on voit les joueurs de dos, pas du dessus : c'est ce qui donne la lisibilité de ces jeux-là.
    if (this.half) {
      const hoop = HOOP_VEC[0];
      // Elle était trop loin et trop haute : 11,2 m derrière l'action à 6,3 m de haut, on regardait le
      // demi-terrain du balcon. Un demi-terrain fait 14,6 m de large ; à 8,6 m de recul, avec le champ de
      // vision du match, il tient encore tout entier à l'écran — et les joueurs redeviennent des joueurs.
      // Encore un pas en avant, a la demande de Haythem : 7,3 m de recul au lieu de 8,6 et 4,1 m de haut au
      // lieu de 4,6. Les joueurs gagnent un bon cinquieme de taille a l'ecran. En contrepartie la largeur du
      // demi-terrain ne tient plus tout a fait d'un bord a l'autre, alors le SUIVI LATERAL se resserre en
      // meme temps (0,52 au lieu de 0,45, et jusqu'a 3,4 m de decalage) : la camera accompagne mieux le
      // ballon, et ce qui sort du cadre est toujours le cote ou il ne se passe rien.
      // `k` = la distance choisie dans les options. Le SUIVI LATERAL va en sens inverse : plus on est pres,
      // plus la camera doit accompagner le ballon, sinon l'action sort par le cote.
      const k = this.camDist;
      const suivi = clamp(fx * (0.52 / k), -3.4 / k, 3.4 / k);
      // petits terrains : jamais derriere le panneau du fond ni le grillage, on remonte d'autant qu'on retient
      const bc = COURT.L < 20;
      const prof = bc ? clamp(fz, Math.max(-12, COURT.HOOP_Z + 0.4), HALF_BOUNDS.zMax) : clamp(fz, -12, 1.6);
      const zBrut = prof + 7.3 * k, zCam = bc ? Math.min(zBrut, Math.abs(COURT.BOARD_Z) - 0.4, ENCEINTE.Z - 0.6) : zBrut;
      this.camTarget.set(suivi, 2.0 + 2.1 * k + (zBrut - zCam) * 0.4, zCam);
      _v.set(suivi * 0.5 + hoop.x * 0.5, 1.8, prof * 0.4 + hoop.z * 0.6);
      // le champ de vision est retouché par la caméra de diffusion : on le remet, sinon on garde le sien
      this.camera.fov = this.matchFov;
      this.camera.updateProjectionMatrix();
      this.camPos.lerp(this.camTarget, damp(5.5, dt));
      this.lookCur.lerp(_v, damp(6.5, dt));
      this.camera.position.copy(this.camPos); this.camera.lookAt(this.lookCur); this._applyShake(dt);
      if (net) net.visible = true;
      return;
    }
    if (this.camMode === 'tv') {
      // ---- TERRAIN ENTIER : caméra de diffusion façon NBA 2K ----
      // Plus basse et plus proche que l'ancienne vue de dessus, elle suit le ballon le long du terrain, glisse
      // un peu vers l'action et se resserre quand le jeu arrive près d'un panier.
      // resserrement cale sur le cercle du terrain (5,5 et 6 m sur 28 m, comme avant)
      const kz = COURT.L < 20 ? Math.abs(COURT.HOOP_Z) / 12.425 : 1;
      const pres = Math.min(1, Math.max(0, (Math.abs(fz) - 5.5 * kz) / (6 * kz)));   // 0 au milieu, 1 sous le cercle
      // x = 9,2 : à l'intérieur de l'enceinte (grillage à 9,6), donc devant la rangée de platanes du trottoir
      // Le recul de la camera de diffusion est lateral : c'est le x qu'on rapproche, et la hauteur suit.
      // `c` : le cote ou se tient la camera. Au parc de Becon (terrain 1), le grillage du quai passe a 80 cm de
      // la ligne de touche : la camera se met de l'autre cote, entre les deux terrains.
      const c = this.coteTV();
      this.camTarget.set(c * (9.2 - pres * 0.9) * this.camDist, (2.6 + 4.8 * this.camDist) - pres * 0.9, fz * 0.82);
      _v.set(fx * 0.42 - c * 0.6, 1.5, fz * 0.96);
      this.camera.fov = this.matchFov - pres * 3.5;                          // léger resserrement près du panier
      this.camera.updateProjectionMatrix();
      if (net) net.visible = false;
    } else {
      const hoop = this.teams[this.offense].hoop;
      _v2.set(u.x - hoop.x, 0, u.z - hoop.z).normalize();
      // reste dans le terrain (jamais derrière un panneau) ; si trop près du joueur, on monte
      const d6 = 6.5 * this.camDist;
      // bornes deduites de l'enceinte et du panneau : 8,5 et 11,8 a La Cage comme avant
      const petit = COURT.L < 20;
      const xLo = petit ? Math.max(-8.5, 1.1 - ENCEINTE.X) : -8.5, xHi = petit ? Math.min(8.5, ENCEINTE.XP - 1.1) : 8.5;
      const zLim = petit ? Math.min(Math.abs(COURT.BOARD_Z) - 1.0, ENCEINTE.Z - 1.1) : 11.8;
      const cx = clamp(u.x + _v2.x * d6, xLo, xHi), cz = clamp(u.z + _v2.z * d6, -zLim, zLim);
      // CAMERA RETENUE (30/09). Sur un petit terrain, le panneau et le grillage du fond bloquent la camera a
      // 3,8 m derriere le joueur a la remise en jeu. Elle gardait pourtant sa hauteur de 4 m et visait aux
      // deux cinquiemes du chemin vers le panier : le joueur sortait par le bas de l'ecran, on ne voyait que
      // sa tete et son buste (pieds a 113 % de la hauteur de l'image). Et sous 3,2 m, elle sautait d'un coup
      // a 6 m de haut. Maintenant, plus elle est retenue (`ret`, 0 a sa distance, 1 collee au joueur) :
      //   - plus elle descend (jusqu'a 2,8 m) et moins elle vise le panier (0,4 -> 0,15 du chemin) ;
      //   - sous 3,2 m elle MONTE progressivement vers 6 m (plein a 1,2 m) au lieu de sauter ;
      //   - et la visee est corrigee pour garder les pieds au-dessus de 90 % de l'image — puis le panier
      //     dans le cadre, si les deux tiennent ensemble.
      const dCam = Math.hypot(cx - u.x, cz - u.z);
      const ret = clamp((d6 - dCam) / Math.max(0.5, d6 - 1.2), 0, 1);
      const hBase = 1.6 + 2.4 * this.camDist, rb = Math.min(1, ret * 2), monte = clamp((3.2 - dCam) / 2.0, 0, 1);
      const hCam = lerp(lerp(hBase, Math.min(hBase, 2.8), rb * rb * (3 - 2 * rb)), 6.0, monte * monte * (3 - 2 * monte));
      this.camTarget.set(cx, hCam, cz);
      _v.lerpVectors(u, hoop, lerp(0.4, 0.15, ret)); _v.y = lerp(1.3, 1.0, ret);
      // Angles SOUS l'horizontale, vus de la camera : pieds du joueur, visee, cercle. `aM` : l'ecart au centre
      // qui place un point a 80 % de la demi-hauteur d'image, soit a 90 % de la hauteur totale.
      const aM = Math.atan(0.8 * Math.tan(this.camera.fov * Math.PI / 360));
      const dl = Math.max(0.5, Math.hypot(_v.x - cx, _v.z - cz));
      const aPieds = Math.atan2(hCam, Math.max(0.3, dCam)), aPanier = Math.atan2(hCam - COURT.HOOP_Y, Math.max(0.5, Math.hypot(hoop.x - cx, hoop.z - cz)));
      let aVise = Math.atan2(hCam - _v.y, dl);
      if (aVise < aPieds - aM) aVise = aPieds - aM;                                  // les pieds d'abord
      if (aVise > aPanier + aM && aPanier + aM >= aPieds - aM) aVise = aPanier + aM;   // puis le cercle, s'il tient
      _v.y = hCam - dl * Math.tan(aVise);
      if (net) net.visible = true;
    }
    this.camPos.lerp(this.camTarget, damp(4, dt));
    this.lookCur.lerp(_v, damp(5, dt));
    this.camera.position.copy(this.camPos); this.camera.lookAt(this.lookCur); this._applyShake(dt);
  }
}
