import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { recolorTexture } from './util.js';
import { poserMasque, reperes, equiperShader, appliquerFit, couperTenue, poserJambes } from './fit.js';
import { poserCoiffure } from './headwear.js';
import { EclairagePerso } from './eclairage_perso.js';
import { BOUNDS, G, BALL_R, DRIBBLE } from './config.js';
import { lerp, damp, hdist, clamp } from './util.js';
import { AvatarRig } from './avatar.js';
import { Velo, CHEVILLE } from './velo.js';
// (lot C4) la trottinette et le skate (montures debout) ; les rollers
import { GENRES } from './monture_cavalier.js';
import './monture_trottinette.js';
import './monture_skate.js';
import { ROLLERS, solRoulant, chausser, oter, poseRollers } from './rollers.js';
import { GESTES, COMBOS } from './gestes.js';
// gestes qui ont un clip de mocap de repli (quand le module de dribble n'a pas la balle)
const MOCAP_GESTES = { cross: true, legs: true, back: true, ankle: true };
import { Couches } from './couches.js';
import { Monde } from './monde.js';
import { Dribble } from './dribble.js';
const OS_COUCHES = Couches.OS;
import { loadManifest, loadMixamoClip, AnimPlayer } from './anim.js';
import { TELEPHONE } from './appareil.js';

const ANIM_MANIFEST = 'assets/anims/manifest.json';
// chaîne de repli si un clip manque
const _v3 = new THREE.Vector3();          // vecteur de travail (vitesse cible)
// Sur le relief (js/monde.js) : le disque qu'occupe un piéton contre les obstacles du parc, et ce que la pente fait
// à sa vitesse — en montée v·max(0,55 ; 1 - 1,2·p), en descente v·(1 + 0,15·|p|) (conception, § 2.5).
const RAYON_PIETON = 0.3;
const facteurPente = (p) => (p > 0 ? Math.max(0.55, 1 - 1.2 * p) : 1 + 0.15 * Math.min(1, -p));
const FALLBACK = { idle_ball: ['idle'], idle_ball_l: ['idle_ball', 'idle'], dribble: ['run', 'idle_ball', 'idle'], run: ['dribble', 'idle'], sprint: ['run', 'dribble', 'idle'],
  def_stance: ['idle'], def_slide_l: ['def_stance', 'idle'], def_slide_r: ['def_stance', 'idle'],
  jumpshot: [], layup: ['jumpshot'], dunk: ['layup', 'jumpshot'], block: ['idle'], steal: ['idle'], victory: ['idle_ball', 'idle'], spin: [], idle: [],
  layup_m: ['layup', 'jumpshot'], dunk_m: ['dunk', 'layup', 'jumpshot'], block_m: ['block', 'idle'],
  // Les nouveaux venus. `walk` n'a volontairement PAS de repli vers `run` : sans clip de marche il vaut mieux
  // la pose procedurale, sinon marcher donnerait un sprint sur place, ce qui est pire que pas d'animation.
  walk: [], walk_back: [], walk_side: [], walk_side_m: ['walk_side'],
  pass: [], pass_m: ['pass'], pass_2: ['pass'], pass_2_m: ['pass_2', 'pass'], catch: [],
  // Le grand crossover se rabat sur le petit : sur un avatar sans la mocap, on garde au moins le geste.
  ankle: ['cross'], ankle_m: ['cross_m', 'cross'], ankle_2: ['ankle', 'cross'], ankle_2_m: ['ankle_m', 'cross_m', 'cross'],
  post: [], post_m: ['post'], knock: [], getup: [] };

// ECHELLES DE LOCOMOTION. Chaque echelle est une liste de clips du plus lent au plus rapide ; le jeu choisit
// les DEUX qui encadrent sa vitesse et les melange. Les clips absents sont sautes : sur un avatar sans la
// mocap CMU, l'echelle avant se reduit a course/sprint et tout continue de fonctionner.
const LOCO_AV = ['walk', 'run_alt', 'run', 'sprint'];      // vers l'avant
const LOCO_AR = ['walk_back', 'def_back'];                 // a reculons
const LOCO_DEF_D = ['def_slide_r'], LOCO_DEF_G = ['def_slide_l'];   // pas chassés défensifs
const LOCO_LAT_D = ['walk_side', 'def_slide_r'];           // pas chasses vers la droite
const LOCO_LAT_G = ['walk_side_m', 'def_slide_l'];         // ... vers la gauche
// Clips d'ATTENTE dont on recale la semelle au sol, avatar par avatar (voir Player._mesurerSol)
const SOL_REPOS = ['idle', 'def_stance'];

const loader = new GLTFLoader();
const modelCache = {};
// AVATARS DE TÉLÉPHONE (04/10/2026, tools/avatars_tel.py). Sur téléphone, assets/tel/<nom>.glb : le même avatar
// avec ses textures en 512 (le visage reste en 1024) — trois fois moins de mémoire graphique par joueur, ce qui
// décide si un 5 contre 5 tient dans un téléphone moyen. Fichier absent : on retombe sur l'original.
// (même test que MOBILE de js/monde_charge.js, qui importe ce module : on ne peut pas l'importer ici ; ?tel=1 aussi)
const AVATAR_TEL = TELEPHONE;   // js/appareil.js : la même détection pour tout le jeu (et `?tel=1`)
// (le marchand n'en a pas : ses textures sont déjà en 512, tools/avatars_tel.py ne l'écrit pas — pas de requête perdue)
const SANS_TEL = new Set(['assets/marchand.glb']);
export const urlAvatar = (url) => (AVATAR_TEL && !SANS_TEL.has(url) && /^assets\/[a-z0-9_]+\.glb$/.test(url) ? url.replace('assets/', 'assets/tel/') : url);
function loadModel(url) {
  if (!modelCache[url]) {
    const tel = urlAvatar(url);
    modelCache[url] = (tel === url ? loader.loadAsync(url) : loader.loadAsync(tel).catch(() => loader.loadAsync(url))).then(avecMipmaps);
  }
  return modelCache[url];
}
// LA PEAU SANS MIPMAPS (05/10/2026). Les exports Avaturn règlent les textures du CORPS (peau, visage, mains : leurs deux
// premiers échantillonneurs) en filtrage linéaire SANS mipmaps : dès qu'un joueur est à quelques mètres, chaque pixel de
// son visage lit un texel au hasard dans l'atlas de 1024, et la peau scintille et grésille au moindre mouvement — tout le
// reste de l'avatar, lui, a ses mipmaps. On les leur rend, une fois par fichier (le GLB est en cache). Vérifié en vue de
// match, image agrandie : peau plus lisse, aucune couture sombre de l'atlas.
function avecMipmaps(gltf) {
  const vues = new Set();
  gltf.scene.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) {
        const t = m[k];
        if (!t || vues.has(t)) continue;
        vues.add(t);
        if (t.minFilter === THREE.LinearFilter || t.minFilter === THREE.NearestFilter) { t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; }
      }
    }
  });
  return gltf;
}
// PRECHARGEMENT D'UN AVATAR (30/09). Appele par le panneau du match (js/ui.js) des que les equipes sont
// connues : le fichier est deja en memoire quand le match part, et l'adversaire apparait avec son avatar
// des la premiere image du compte a rebours — au lieu d'un bonhomme en blocs le temps du telechargement.
// Meme cache que les joueurs (loadModel) : rien n'est lu deux fois. Une erreur est avalee ici ; elle
// ressortira, avec son message, au vrai chargement. (Rend la promesse : l'écran de chargement attend le joueur choisi
// au menu, js/demarrage.js.)
export function prechargerModele(url) {
  return url ? loadModel(url).catch(() => {}) : null;
}

// DES MAINS DE LA COULEUR DU VISAGE (fiche `mainsVisage`, 30/09). Chez Lamine, livré en costume, l'atlas du corps
// peint les mains d'un gris beige (73, 67, 62 en moyenne) sous un visage brun foncé (57, 44, 40) : à l'écran,
// on croyait voir des gants gris clair. On mesure les deux teintes sur l'atlas, aux sommets du corps (os de la
// main contre os de la tête et du cou, poids > 0,9), et on pose sur la géométrie une COULEUR DE SOMMET qui
// multiplie la texture des seules mains par le rapport des deux — au prorata du poids de la main, donc sans
// couture au poignet. Le relief de la texture (paume plus claire, jointures) est gardé. La géométrie est
// partagée entre les exemplaires du même GLB : on ne calcule qu'une fois ; chaque matériau (cloné par joueur)
// allume simplement ses couleurs de sommet. Coût : un canvas de 256 x 256 au chargement.
function accorderMains(model) {
  model.traverse((o) => {
    if (!o.isSkinnedMesh || !/body/i.test((o.material && o.material.name) || '')) return;
    const geo = o.geometry, mat = o.material;
    if (!geo.userData.mainsTeintees) {
      geo.userData.mainsTeintees = true;
      const tex = mat.userData.srcMap || mat.map, img = tex && tex.image;
      const uv = geo.attributes.uv, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
      if (!img || !img.width || !uv || !si || !sw || !o.skeleton) return;
      const N = 256;
      let d;
      try {
        const c = document.createElement('canvas'); c.width = c.height = N;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, N, N);
        d = g.getImageData(0, 0, N, N).data;
      } catch (e) { return; }                       // atlas illisible : on garde les mains telles quelles
      const classe = o.skeleton.bones.map((b) => (/Hand/.test(b.name) ? 1 : /Head|Neck/.test(b.name) ? 2 : 0));
      const lin = (v) => Math.pow(v / 255, 2.2);
      const moy = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], wMain = new Float32Array(uv.count);
      for (let i = 0; i < uv.count; i++) {
        const w = [0, 0, 0];
        for (let k = 0; k < 4; k++) w[classe[si.getComponent(i, k) | 0] | 0] += sw.getComponent(i, k);
        wMain[i] = Math.min(1, w[1]);
        const cl = w[1] > 0.9 ? 1 : w[2] > 0.9 ? 2 : 0;
        if (!cl) continue;
        const x = Math.min(N - 1, Math.max(0, Math.floor(uv.getX(i) * N)));
        const y = Math.min(N - 1, Math.max(0, Math.floor((tex.flipY ? 1 - uv.getY(i) : uv.getY(i)) * N)));
        const j = (y * N + x) * 4, L = (d[j] + d[j + 1] + d[j + 2]) / 3;
        if (L < 12 || L > 235) continue;            // cils, sourcils, blanc des yeux
        const m = moy[cl]; m[0] += lin(d[j]); m[1] += lin(d[j + 1]); m[2] += lin(d[j + 2]); m[3]++;
      }
      if (moy[1][3] < 20 || moy[2][3] < 20) return;
      const r = [0, 1, 2].map((k) => Math.min(1.5, Math.max(0.2, (moy[2][k] / moy[2][3]) / Math.max(1e-4, moy[1][k] / moy[1][3]))));
      const col = new Float32Array(uv.count * 3);
      for (let i = 0; i < uv.count; i++) for (let k = 0; k < 3; k++) col[i * 3 + k] = 1 + (r[k] - 1) * wMain[i];
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    if (geo.getAttribute('color')) { mat.vertexColors = true; mat.needsUpdate = true; }
  });
}

function numberTexture(num, bg, fg) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
  g.fillStyle = fg; g.font = 'bold 150px Impact, "Arial Black", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(num), 128, 138);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion();
const _mSol = new THREE.Matrix4(), _mSol2 = new THREE.Matrix4();   // mesure des semelles (Player._semelleBasse)
// téléphone en main (voir Player._tenirTel)
const _tC = new THREE.Vector3(), _tX = new THREE.Vector3(), _tY = new THREE.Vector3(), _tZ = new THREE.Vector3();
const _tH = new THREE.Vector3(), _tF = new THREE.Vector3(), _tL = new THREE.Vector3(), _tU = new THREE.Vector3(0, 1, 0);
const _tW = new THREE.Vector3(), _tf = new THREE.Vector3(), _tn = new THREE.Vector3(), _tP = new THREE.Vector3(), _tQ = new THREE.Vector3();
const _tM = new THREE.Matrix4();
// a velo
const _vA = { hanche: new THREE.Vector3(), poigneeG: new THREE.Vector3(), poigneeD: new THREE.Vector3(),
  pedaleG: new THREE.Vector3(), pedaleD: new THREE.Vector3(), qCadre: new THREE.Quaternion(), qGuidon: new THREE.Quaternion(), qSol: new THREE.Quaternion() };
const _vH = new THREE.Vector3(), _vH2 = new THREE.Vector3(), _vT = new THREE.Vector3(), _vP = new THREE.Vector3();
const _vQ = new THREE.Quaternion(), _vQ2 = new THREE.Quaternion(), _vS = new THREE.Vector3();
const _vAv = new THREE.Vector3(), _vHa = new THREE.Vector3(), _vGa = new THREE.Vector3();
const _vGAv = new THREE.Vector3(), _vGHa = new THREE.Vector3();
const _vC = new THREE.Vector3(), _vO = new THREE.Vector3(), _vPo = new THREE.Vector3(), _vF = new THREE.Vector3(), _vN = new THREE.Vector3();
const _Y1 = new THREE.Vector3(0, 1, 0);
const lisse = (k) => k * k * (3 - 2 * k);
const GATHER_SPEED = 2.4;   // vitesse de la montée du tir (clip) avant le point d'armé
// Écart (s) au-delà duquel une minuterie de geste reçue du réseau remplace celle qui s'écoule ici (appliquerAnim)
const TOL_ANIM = 0.12;

// Pose "neutre" : toutes les articulations (rotations en radians)
// t = cuisse (x : avant/arrière, z : écart), k = genou, a = épaule, e = coude, h = poignet
const REST = { tL: 0, tR: 0, tLz: 0, tRz: 0, kL: 0.08, kR: 0.08, aL: 0.15, aR: 0.15, aLz: 0.12, aRz: -0.12, aLy: 0, aRy: 0, eLy: 0, eRy: 0, eL: -0.25, eR: -0.25, hL: 0, hR: 0, torsoX: 0, torsoY: 0, bob: 0, headX: 0 };
// Pose miroir (gauche <-> droite) : layup ou dunk de la main gauche. aLz / aRz ont des signes opposés pour un même
// écart (positif = bras gauche dehors, négatif = bras droit dehors), de même que les torsions ; tLz / tRz non (la
// cuisse droite est déjà retournée dans AvatarRig.apply).
function miroirPose(P) {
  let t;
  t = P.aL; P.aL = P.aR; P.aR = t; t = P.aLz; P.aLz = -P.aRz; P.aRz = -t; t = P.aLy; P.aLy = -P.aRy; P.aRy = -t;
  t = P.eL; P.eL = P.eR; P.eR = t; t = P.eLy; P.eLy = -P.eRy; P.eRy = -t; t = P.hL; P.hL = P.hR; P.hR = t;
  t = P.tL; P.tL = P.tR; P.tR = t; t = P.tLz; P.tLz = P.tRz; P.tRz = t; t = P.kL; P.kL = P.kR; P.kR = t;
  P.torsoY = -(P.torsoY || 0);
}

// Le joueur regarde vers +z local ; sa gauche est +x, sa droite -x.
// Rotation x négative = membre vers l'avant/le haut ; z positif = vers +x.
// Le téléphone du chat : coque noire, écran allumé qui montre une conversation (bulles). Géométries et
// matériaux partagés par tous les joueurs ; l'écran ne subit pas l'étalonnage, il ÉCLAIRE.
let _telGeo = null;
function modeleTel() {
  if (!_telGeo) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#0d1117'; g.fillRect(0, 0, 128, 256);
    g.fillStyle = '#1f2937'; g.fillRect(0, 0, 128, 30);
    g.fillStyle = '#e5e7eb'; g.font = 'bold 15px sans-serif'; g.fillText('LA CAGE', 10, 21);
    const bulle = (x, y, w, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, 22, 9); g.fill(); };
    bulle(8, 42, 78, '#374151'); bulle(8, 72, 96, '#374151'); bulle(44, 104, 76, '#22c55e');
    bulle(8, 136, 64, '#374151'); bulle(36, 168, 84, '#22c55e'); bulle(8, 200, 88, '#374151');
    g.fillStyle = '#1f2937'; g.fillRect(0, 232, 128, 24);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    // même écran avec le CLAVIER ouvert : c'est ce qu'on voit quand il tape
    const c2 = document.createElement('canvas'); c2.width = 128; c2.height = 256;
    const g2 = c2.getContext('2d');
    g2.drawImage(c, 0, 0);
    g2.fillStyle = '#1b1f27'; g2.fillRect(0, 150, 128, 106);
    g2.fillStyle = '#0d1117'; g2.fillRect(6, 136, 116, 12);
    g2.fillStyle = '#4b5563';
    const rangs = [10, 9, 7];
    rangs.forEach((n, r) => { const w = 11, x0 = (128 - n * (w + 1.5)) / 2; for (let i = 0; i < n; i++) { g2.beginPath(); g2.roundRect(x0 + i * (w + 1.5), 158 + r * 20, w, 16, 2.5); g2.fill(); } });
    g2.beginPath(); g2.roundRect(30, 220, 68, 16, 3); g2.fill();
    const tex2 = new THREE.CanvasTexture(c2); tex2.colorSpace = THREE.SRGBColorSpace;
    _telGeo = {
      coque: new THREE.BoxGeometry(0.074, 0.152, 0.009),
      ecran: new THREE.PlaneGeometry(0.066, 0.140),
      matCoque: new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.35, metalness: 0.5 }),
      matEcran: new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: 0xbfc8d6 }),
      matClavier: new THREE.MeshBasicMaterial({ map: tex2, toneMapped: false, color: 0xbfc8d6 }),
    };
  }
  const G = _telGeo, grp = new THREE.Group();
  grp.add(new THREE.Mesh(G.coque, G.matCoque));
  const e = new THREE.Mesh(G.ecran, G.matEcran); e.position.z = 0.0048; grp.add(e);
  grp.userData.ecran = e; grp.userData.mats = [G.matEcran, G.matClavier];
  grp.userData.dynamique = true;
  return grp;
}

export class Player {
  constructor(def, scene, isUser) {
    this.def = def; this.isUser = isUser; this.h = def.height;
    this.team = 0; this.slot = 0; this.passT = 0; this.boost = 1;   // équipe (0 = joueur), poste, geste de passe
    this.visePasse = new THREE.Vector3(0, 0, 1);                     // direction du receveur au lâcher
    this.emote = null;                // emote en cours { id, clip, proc, loop, t } (danse, chambrage...)
    this.dribbleMoveT = 0;            // mouvement de dribble sur place (touche H) : temps restant
    this.tirAttenteT = 0;             // tir demandé pendant que la balle est au sol : on attend qu'elle remonte
    this.spinAttenteT = 0; this.spinDur = 0.72; this.spinId = 0;
    // recul protégé / step-back : temps restant, cap figé (on recule face au jeu), tir mis en mémoire
    this.retraitT = 0; this.stepT = 0; this.stepDur = 0.3; this.capFige = new THREE.Vector3(0, 0, 1); this.tirTampon = false; this.tirAuto = false;
    this.vel = new THREE.Vector3();   // vitesse réelle au sol : sert à l'inertie (démarrage, freinage, appuis)
    this.faceWant = new THREE.Vector3(0, 0, 1);   // cap visé ; le joueur pivote progressivement vers lui
    this.landT = 0;                   // temps depuis l'atterrissage : flexion des jambes
    this.push = new THREE.Vector3();  // poussée reçue des autres joueurs dans l'image (contacts)
    this.contactT = 0;                // temps restant de contact corps à corps : protection de balle
    this.boxOutT = 0;                 // position prise au rebond : bonus de dispute
    this.catchT = 0;                  // réception de balle : geste des deux mains
    this.rebondT = 0;                 // rebond capté en l'air : bras au-dessus puis balle serrée au buste
    this.bumpT = 0; this.bumpCd = 0; this.bumpSide = 1;   // coup d'épaule : geste, délai, et épaule engagée
    this.marche = false;              // allure de marche demandée (touche dédiée) : la vitesse est plafonnée
    this.locoPhase = 0;               // phase de foulée partagée (0..1) : 0 = cuisse gauche la plus en avant
    this.locoEtat = null;             // { cle, nom } : le clip de locomotion en cours pour l'echelle courante
    this.sensLoco = 'av'; this.sensT = 0;   // sens de déplacement retenu (av | ar | lat) et son temps de confirmation
    this.sprintVu = 0;                // temps de rémanence du sprint : lisse le clignotement du drapeau
    this.locoActif = false;           // vrai quand l'avatar est piloté par le mélange de locomotion
    this.locoFoulee = 0;              // longueur de foulée du mélange en cours (m par cycle)
    // MIS AU SOL. Trois temps qui s'enchaînent sans couture : la chute (clip `knock`), le temps passé par
    // terre, puis le relevé (`getup`) — qui est le même clip joué à l'endroit, donc le raccord est exact.
    this.chuteT = 0; this.chuteTot = 0; this.chutePh = 'chute';
    this.postT = 0; this.postCd = 0; this.postSens = 1;   // appui dos au défenseur : durée, délai, côté du bras-barre
    this.passClip = null;             // variante de passe tirée au sort (poussée / par-dessus l'épaule, droitier ou gaucher)
    this.postCumul = 0;               // temps d'appui cumulé sur le défenseur : c'est lui qui finit par le faire tomber
    // Numéro du geste ponctuel en cours. La clé d'animation est bâtie sur l'ÉTAT, et passe, réception et
    // poussée se font tous dans l'état « idle » : sans ce compteur, deux passes de suite portaient la même
    // clé, le clip n'était pas relancé, et la deuxième ne se voyait pas du tout.
    this.gesteId = 0;
    // (06/10/2026) poids des bras et du buste procéduraux face au clip (fondus, voir _poserReprises), poids de
    // l'écrêtage des hanches en l'air (_ajusterHanches), numéro du saut (un contre = un clip relancé), virage vif
    // en cours (faceTo), main qui finit un layup ou un dunk (_mainFinale)
    this.kBras = 0; this.kTronc = 0; this.kAir = 0; this.sautId = 0; this.virageVif = 0; this.mainFinale = 'R';
    this.assistFrom = 0;              // temps restant pendant lequel un panier compte comme passe décisive
    this.fakeT = 0;                   // feinte de tir : on arme puis on redescend sans lâcher
    this.fakeCd = 0;                  // délai avant de pouvoir feinter à nouveau
    this.baseDef = def; this.disposed = false;   // fiche d'origine (roster) et drapeau de retrait
    this.pos = new THREE.Vector3();
    // INTERPOLATION DE RENDU. La simulation avance par crans de 1/120 s ; l'ecran, lui, rafraichit quand il
    // veut, et jamais en phase. On garde donc la pose du cran PRECEDENT pour pouvoir glisser entre les deux
    // au moment d'afficher. Voir Game.interpoler.
    this.posPrec = new THREE.Vector3();   // position au pas de simulation precedent
    this.posAff = new THREE.Vector3();    // position REELLEMENT affichee (celle que suit la camera)
    this.angPrec = 0; this.ang = 0;       // cap affiche, precedent et courant
    this.yPrec = 0; this.yAff = 0;        // hauteur affichee, precedente et courante
    // LE SOL SOUS LES PIEDS (js/monde.js). `pos.y` est la hauteur du sol ; `jumpY` et `yAff` restent comptés
    // au-dessus de lui. Sur un terrain plat (tous aujourd'hui), pos.y vaut 0 et chaque somme ci-dessous est
    // exactement celle d'avant. `solAff` : le sol interpolé à l'affichage (la caméra s'y cale) ; `yLisse` : le
    // décalage d'affichage qui rattrape en 0,08 s une marche montée, pour que le corps ne saute pas.
    this.solAff = 0; this.yLisse = 0;
    this.facing = new THREE.Vector3(0, 0, -1);
    this.hoop = null;                 // panier attaqué (Vector3 avec .sgn), fixé par Game
    this.stamina = 100;
    this.jumpY = 0; this.jumpVel = 0; this.airborne = false;
    this.state = 'idle';              // idle | windup | shoot | layup | dunk | celebrate
    this.stateT = 0; this.released = false;
    this.windup = 0;                  // progression de la jauge de tir 0..1
    this.stun = 0; this.stealCd = 0; this.swipeT = 0;
    this.speedNow = 0; this.sprinting = false; this.speedMul = 1; this.lateral = 0;
    this.walkPhase = 0; this.animT = 0;
    this.defending = false; this.hasBall = false;
    // dribble
    this.dribbleHand = 'R'; this.dribblePhase = 0; this.crossT = -1; this.crossFrom = new THREE.Vector3(); this.handCd = 0;
    this.dribbleT = 0;                                     // rythme du bras de dribble (procédural ou calé sur le clip de course)
    this.drib = { phase: 'push', t: 0, y0: 0.7, dur: 0.36, prevHy: null, hold: 0, bounced: false, x0: 0, z0: 0 };   // suivi balle <-> main
    this.moveType = null; this.moveVia = new THREE.Vector3(); this.moveDur = 0.26; this.prevCrossT = -1;           // cross | legs | back
    this.capPrec = new THREE.Vector3();   // cap de course lissé : sert à repérer les changements de direction
    this.viraison = false;                // vrai l'instant où le joueur repart de l'autre côté (→ crossover)
    this.crossFromLocal = new THREE.Vector3(); this.moveViaLocal = new THREE.Vector3();
    this.dunkFrom = new THREE.Vector3(); this.dunkTo = null; this.dunkT = 0; this.dunkRise = 0.45; this.dunkStyle = 'one';
    this.avatarScale = 1;
    this.pickupT = 0; this.tauntT = 0; this.backward = 0; this.celebVariant = 'victory';   // ramassage, chambrage, recul en défense, célébration tirée au sort
    this.spinT = 0; this.spinDir = 1;
    this.ankleCd = 0;                 // délai entre deux grands crossovers : le geste doit rester un événement
    this.cur = { ...REST };
    this.assis = null;                // assis sur un banc : { de, a, bob, sx, sz, k, sortir, rang }
    this.velo = null;                 // a velo : { v: Velo, k, sortir, deb, fin, buste, bras, jambe, vl }
    // (lot C4) LES ROLLERS (js/rollers.js) : { couleur } quand le joueur en a chaussé, null sinon ; `hRol` = de combien
    // les roues le soulèvent (0 sans rollers, ou en match) ; la foulée du patineur (_patine, patPhase)
    this.rollers = null; this.hRol = 0; this._rolCle = ''; this._patine = false; this.patPhase = 0; this._rolPousse = false;
    this.couches = new Couches(this); // inclinaison, regard, respiration, pas (js/couches.js)
    this.dribble = new Dribble(this); // dribble en course façon 2K (js/dribble.js)
    this.locoCad = 0;                 // cadence de foulée du mélange de locomotion (cycles/s)
    this.angAff = 0; this._presente = false;   // lacet affiché (presenter), pour poser le ballon tenu à l'écran
    this.lodIK = true; this.distCam = 0;       // IK des bras de dribble : seulement pour les joueurs assez proches
    this.pression = 0;                         // un défenseur colle le porteur (Game.regards)
    this.moveRythme = false;                   // crossover en pleine course, sans clip de mocap
    this.cibleRegard = null;          // ce que le joueur regarde (posé par le jeu), ou null
    this.avatar = null;
    this.anim = null; this.animKey = null; this.lateralDir = 0; // clips Mixamo (si présents)
    this.bounds = BOUNDS;             // zone de déplacement (terrain en match, enceinte en balade)
    this.tel = null;                  // téléphone sorti (chat) : { k, t, tape, sortir } — voir sortirTel
    this.scene = scene;
    this._build(scene);
    this.avatarUrl = def.model || null; this.staminaMul = 1;   // avatar en cours (tenue de la boutique possible), usure du sprint
    this.solDecal = 0; this.solRepos = null; this.solPosture = 0;   // pieds au sol : décalage vertical de l'avatar (voir _mesurerSol)
    // Tant que l'avatar n'est pas la, on ne montre RIEN plutot que le bonhomme en primitives : un torse en
    // boite violette et une tete-boule au milieu d'un decor photographique, meme une demi-seconde, c'est ce
    // qu'on retient du debut du match. Il ne reapparait que si l'avatar ne peut pas etre charge.
    if (def.model) { this.body.visible = false; this._loadAvatar(def.model, def.modelHeight || 1.84); }
  }

  // ---------- bonhomme en primitives (utilisé tant qu'aucun avatar 3D n'est chargé) ----------
  _build(scene) {
    const d = this.def;
    const root = new THREE.Group(); root.scale.setScalar(this.h / 2); root.rotation.order = 'YXZ';
    const body = new THREE.Group(); root.add(body);
    const jersey = new THREE.MeshStandardMaterial({ color: d.color1, roughness: 0.65 });
    const shorts = new THREE.MeshStandardMaterial({ color: d.color2, roughness: 0.65 });
    const skin = new THREE.MeshStandardMaterial({ color: d.skin, roughness: 0.7 });
    const shoe = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 });
    const numMat = new THREE.MeshStandardMaterial({ map: numberTexture(d.number, d.color1, d.color2), roughness: 0.65 });
    const add = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };

    const torso = new THREE.Group(); torso.position.y = 0.95; body.add(torso);
    add(new THREE.BoxGeometry(0.44, 0.32, 0.3), shorts, 0, -0.09, 0, torso);
    add(new THREE.BoxGeometry(0.46, 0.6, 0.28), [jersey, jersey, jersey, jersey, numMat, numMat], 0, 0.35, 0, torso);
    add(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), skin, 0, 0.68, 0, torso);
    const head = new THREE.Group(); head.position.set(0, 0.72, 0); torso.add(head);
    add(new THREE.SphereGeometry(0.13, 16, 12), skin, 0, 0.12, 0, head);
    add(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), hair, 0, 0.13, 0, head);

    const leg = (x) => {
      const thigh = new THREE.Group(); thigh.position.set(x, 0.95, 0); body.add(thigh);
      add(new THREE.CylinderGeometry(0.085, 0.075, 0.48, 10), skin, 0, -0.24, 0, thigh);
      const knee = new THREE.Group(); knee.position.set(0, -0.48, 0); thigh.add(knee);
      add(new THREE.CylinderGeometry(0.07, 0.06, 0.42, 10), skin, 0, -0.21, 0, knee);
      add(new THREE.BoxGeometry(0.16, 0.09, 0.3), shoe, 0, -0.445, 0.05, knee);
      return { thigh, knee };
    };
    const arm = (x) => {
      const sh = new THREE.Group(); sh.position.set(x, 0.58, 0); torso.add(sh);
      add(new THREE.CylinderGeometry(0.065, 0.055, 0.32, 10), jersey, 0, -0.16, 0, sh);
      const el = new THREE.Group(); el.position.set(0, -0.32, 0); sh.add(el);
      add(new THREE.CylinderGeometry(0.05, 0.045, 0.3, 10), skin, 0, -0.15, 0, el);
      const hand = new THREE.Group(); hand.position.set(0, -0.32, 0); el.add(hand);
      add(new THREE.SphereGeometry(0.06, 10, 8), skin, 0, 0, 0, hand);
      return { sh, el, hand };
    };
    // gauche du personnage = +x
    const L = leg(0.12), R = leg(-0.12), AL = arm(0.3), AR = arm(-0.3);
    this.rig = { torso, head, thighL: L.thigh, kneeL: L.knee, thighR: R.thigh, kneeR: R.knee,
      armL: AL.sh, elbowL: AL.el, handL: AL.hand, armR: AR.sh, elbowR: AR.el, handR: AR.hand };
    scene.add(root); this.mesh = root; this.body = body;
    root.userData.dynamique = true;             // bouge : exclu de l'ombrage du sol précalculé (court.js)
  }

  // ---------- avatar 3D (GLB Avaturn / Mixamo) ----------
  _loadAvatar(url, modelHeight) {
    loadModel(url).then((gltf) => {
      if (this.disposed || this.avatarUrl !== url) return;   // joueur retiré de la scène entre-temps (aperçu du menu) ou autre avatar demandé
      const model = skeletonClone(gltf.scene);
      // SkeletonUtils.clone ne clone QUE le squelette : les matériaux restent partagés avec le fichier en cache.
      // On les clone par avatar, sinon repeindre la tenue d'un joueur repeindrait tous ceux qui sortent du même GLB
      // (et, pire, le modèle en cache, donc aussi tous les joueurs créés ensuite).
      const vus = new Map();
      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
          const m = o.material;
          if (m && !Array.isArray(m)) {
            if (!vus.has(m)) { const c = m.clone(); c.userData = { srcMap: m.map || null, srcColor: m.color ? m.color.clone() : null }; vus.set(m, c); }
            o.material = vus.get(m);
          }
        }
      });
      if (this.def.mainsVisage) accorderMains(model);   // mains grises sous un visage foncé (voir accorderMains)
      const rig = new AvatarRig(model);
      if (!rig.ok) { console.warn('Avatar sans squelette Mixamo, on garde le bonhomme :', url); this.body.visible = true; return; }
      // Preparation des VRAIES tenues (js/fit.js). Le masque de membre se pose sur la GEOMETRIE, partagee
      // entre les joueurs issus du meme GLB : il ne depend que du squelette, on ne le calcule qu'une fois.
      // Le shader, lui, se pose sur le MATERIAU, qui vient d'etre clone juste au-dessus : ses uniformes
      // sont donc propres a ce joueur, et habiller l'un n'habille pas les huit autres.
      this.fitRep = null;
      model.traverse((o) => {
        if (!o.isSkinnedMesh || !/look/i.test((o.material && o.material.name) || '')) return;
        // RACCOURCIR LA TENUE. Certains avatars sont livres en costume — chapeau, manches longues,
        // pantalon — et tout cela fait partie du MEME maillage : on ne peut ni le cacher ni l'enlever
        // d'un materiau. On coupe donc la geometrie (js/fit.js, couperTenue), ce qui laisse voir le
        // maillage du CORPS qui se trouve dessous.
        //   `coupeHaut`   jette le couvre-chef au-dessus d'une hauteur (creux de l'histogramme, roster.js)
        //   `coupeManche` raccourcit les manches (maillot de football)
        //   `coupeJambe`  transforme le pantalon en short
        //   `coupeBas`    arrete le vetement du haut a la taille (veste longue -> maillot)
        // Le masque de membre doit etre pose AVANT la coupe : c'est lui qui distingue un bras d'un flanc
        // et une jambe d'un pan de maillot, et le calculer apres reviendrait a le calculer sur un maillage
        // deja ampute. La geometrie est PARTAGEE entre tous les exemplaires du meme GLB : on ne coupe
        // qu'une fois, et couperTenue s'en souvient.
        poserMasque(o);
        if (this.def.coupeHaut || this.def.coupeManche || this.def.coupeJambe || this.def.coupeBas) {
          couperTenue(o, { haut: this.def.coupeHaut || 0, manche: this.def.coupeManche || 0,
                           jambe: this.def.coupeJambe || 0, bas: this.def.coupeBas || 0 });
        }
        if (!this.fitRep) this.fitRep = reperes(o);
        equiperShader(o.material);
      });
      if (!this.fitRep) console.warn('[fit] reperes de squelette introuvables, tenues a plat :', url);
      model.scale.setScalar(2 / modelHeight);     // le groupe est en "unités 2 m" (scale h/2)
      this.avatarScale = this.h / modelHeight;     // unités du modèle -> mètres
      model.visible = false;                       // montré une fois ses programmes prêts (voir plus bas)
      this.mesh.add(model);
      this.body.visible = false;
      // Le short ne tient que si l'avatar a des jambes : Avaturn ne livre que la tete, le cou et les
      // bras sous le vetement. On les remet avant la premiere image, sinon on voit les chaussures
      // flotter le temps d'un battement.
      if (this.def.coupeJambe) {
        let matCorps = null;
        model.traverse((o) => { if (!matCorps && o.isSkinnedMesh && /body/i.test(o.material?.name || '')) matCorps = o.material; });
        poserJambes(rig, this.def.skin, matCorps);
      }
      // l'éclairage du personnage (découpe, occlusion du corps, peau) : APRÈS le shader des tenues, qu'il chaîne
      this.eclairage = new EclairagePerso(); this.eclairage.equiper(model);
      this.avatar = rig; this.avatarModel = model;
      // Tenue deja equipee avant la fin du chargement ; a defaut, la tenue PAR DEFAUT de la fiche. Elle
      // sert aux avatars dont le vetement d'origine est un costume : on les rhabille sobrement, et le
      // costume part a la boutique.
      if (this.outfit) this.applyOutfit(this.outfit);
      else if (this.def.fit) this.applyOutfit({ fit: this.def.fit });
      // LES CLIPS AVANT DE SE MONTRER (06/10/2026). L'avatar apparaissait dès ses matériaux compilés, alors que ses
      // quatre-vingts clips arrivaient après : pendant ce temps on voyait la pose procédurale (bras raides, buste
      // droit), puis le corps sautait dans la première animation. On attend donc aussi les clips — au plus 6 s, au
      // cas où un téléphone lent les chargerait encore : mieux vaut alors la pose procédurale que rien.
      const clips = this.def.anims !== false ? this._loadAnims(model, rig).catch(() => {}) : null;
      // PAS DE GEL À L'APPARITION (04/10/2026). Les matériaux d'un avatar (tenue repeinte, éclairage du perso) sont des
      // programmes à part : compilés au premier dessin, ils figeaient l'image — 0,9 s mesuré sur PC à l'écran du
      // choix du joueur, bien plus sur téléphone, et à chaque nouvel avatar d'un match. On les fait compiler en
      // parallèle par le pilote (Player.preparerRendu, posé par js/game.js) et l'avatar paraît une fois prêt —
      // quelques images plus tard, au lieu d'une image figée.
      const montrer = () => { if (this.avatarModel === model) model.visible = true; };
      const prep = Player.preparerRendu;
      let pr = null;
      if (prep) { model.visible = true; try { pr = prep(model); } finally { model.visible = false; } }
      const attendre = clips ? Promise.race([clips, new Promise((r) => setTimeout(r, 6000))]) : null;
      Promise.all([Promise.resolve(pr).catch(() => {}), attendre]).then(montrer, montrer);
    }).catch((e) => {
      console.warn('Avatar non chargé :', url, e);
      if (!this.disposed && this.avatarUrl === url && !this.avatarModel) this.body.visible = true;   // secours : le bonhomme
    });
  }

  // Skin de tenue. Les avatars Avaturn ont des matériaux séparés : avaturn_look_0 (vêtements), avaturn_shoes_0
  // (chaussures), avaturn_hair_0 (cheveux). On recolore leur texture en gardant les plis et les ombres, ce qui donne
  // de vrais skins sans le moindre fichier 3D supplémentaire. `null` remet la tenue d'origine.
  applyOutfit(skin) {
    this.outfit = skin || null;
    if (!this.avatarModel) return;
    const part = (n) => (/look/i.test(n) ? 'look' : /shoes/i.test(n) ? 'shoes' : /hair/i.test(n) ? 'hair' : null);
    this.avatarModel.traverse((o) => {
      if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
      const m = o.material, p = part(m.name || '');
      if (!p) return;
      // Une tenue a `fit` peint par le SHADER : on lui remet donc l'atlas d'origine (la branche « pas de
      // consigne » qui existe deja), et aucun canvas de 1024x1024 n'est fabrique.
      const kit = (p === 'look' && skin && skin.fit) ? skin.fit : null;
      const r = kit ? null : (skin && skin[p]);
      const src = m.userData.srcMap, base = m.userData.srcColor;
      if (!r) {                                            // pas de consigne pour cette partie : on remet l'origine
        m.map = src || null;
        if (base && m.color) m.color.copy(base);
        if (m.emissive) { m.emissive.setHex(0x000000); m.emissiveIntensity = 0; }
      } else {
        const rec = src ? recolorTexture(src, r.tint, r.lift || 0) : null;
        m.map = rec || src || null;
        if (m.color) { if (base) m.color.copy(base); if (!rec) m.color.set(r.tint); if (r.mul) m.color.multiplyScalar(r.mul); }
        if (m.emissive) { m.emissive.set(r.glow || 0x000000); m.emissiveIntensity = r.glow ? 0.35 : 0; }
        if (r.metal !== undefined && m.metalness !== undefined) m.metalness = r.metal;
        if (r.rough !== undefined && m.roughness !== undefined) m.roughness = r.rough;
      }
      if (kit && m.color) m.color.setRGB(1, 1, 1);   // sinon la couleur du materiau multiplierait une 2e fois
      if (p === 'look') appliquerFit(m, kit, this.fitRep);
      m.needsUpdate = true;
    });
    // Le couvre-chef fait partie de la MEME consigne : il est rejoue tout seul apres un changement
    // d'avatar, puisque _loadAvatar rappelle applyOutfit(this.outfit) a la fin du chargement.
    poserCoiffure(this.avatarModel, this.avatar, (skin && skin.coif) || null);
    if (this.eclairage) this.eclairage.equiper(this.avatarModel);   // la casquette, les jambes posées (sans effet sur le reste)
  }

  // ---------- s'asseoir sur un banc ----------
  // `banc` = { x, z, y, sx, sz, fx, fz, rang } : le point d'assise, sa hauteur, le point de SORTIE devant
  // le banc, le cap a prendre une fois pose, et le numero de rang (pour pouvoir monter d'un cran).
  //
  // La hauteur est le seul point delicat. `bob` translate tout le maillage, dont l'origine est aux pieds :
  // en posant les cuisses a l'horizontale et les tibias a la verticale, la hanche ne bouge pas dans le
  // repere du modele, elle reste a ~0,53 x taille. Pour l'amener a huit centimetres au-dessus de l'assise
  // il faut donc descendre le maillage d'autant, et les pieds retombent alors pile sur la marche du
  // dessous. Le meme calcul vaut donc pour les trois rangs.
  sasseoir(banc) {
    if (this.assis) return;
    this.assis = {
      de: { x: this.pos.x, z: this.pos.z },
      a: { x: banc.x, z: banc.z },
      bob: banc.y + 0.08 - 0.53 * this.h,
      sx: banc.sx, sz: banc.sz === undefined ? banc.z : banc.sz,
      rang: banc.rang || 0, k: 0, sortir: false,
    };
    this.vel.set(0, 0, 0);
    this.stopEmote();
    this.setFacing(banc.fx, banc.fz);
    if (this.anim) this.anim.stop(0.12);
  }

  // Changement de rang sans repasser par la station debout : on relance la meme courbe a mi-chemin, ce qui
  // donne le petit elan des fesses qu'on fait pour monter d'une marche.
  changerRang(banc) {
    const S = this.assis;
    if (!S) return;
    S.de = { x: this.pos.x, z: this.pos.z };
    S.a = { x: banc.x, z: banc.z };
    S.bob = banc.y + 0.08 - 0.53 * this.h;
    S.sx = banc.sx; S.sz = banc.sz === undefined ? banc.z : banc.sz;
    S.rang = banc.rang || 0; S.k = 0.5; S.sortir = false;
  }

  // Se lever : on rejoue la courbe a l'envers, en visant le point de SORTIE devant le banc. Se contenter
  // de lacher l'etat releverait le joueur DANS le gradin, et la repoussee d'obstacle l'expedierait de cote
  // a l'image suivante sans qu'on comprenne pourquoi.
  seLever() {
    const S = this.assis;
    if (!S || S.sortir) return;
    S.de = { x: S.sx === undefined ? this.pos.x + this.facing.x * 0.6 : S.sx, z: S.sz };
    S.a = { x: this.pos.x, z: this.pos.z };
    S.sortir = true;
  }

  get assisPose() { return !!this.assis && !this.assis.sortir; }

  // ---------- à vélo ----------
  // Monter : on part de l'endroit où l'on est, et en un peu plus d'une demi-seconde on passe la jambe et on
  // se pose sur la selle. La selle est d'abord RÉGLÉE à sa jambe : c'est ce qui permet à la cinématique
  // inverse de poser les pieds sur les pédales avec le genou juste un peu fléchi en bas de course.
  monterVelo(v) {
    if (this.velo || this.assis) return false;
    this.stopEmote(); this.tel = null;
    if (this.anim) this.anim.stop(0.12);
    this.vel.set(0, 0, 0); this.speedNow = 0;
    this.velo = { v, k: 0, sortir: false, deb: { x: this.pos.x, z: this.pos.z }, fin: null, buste: 0.45, bras: 0, jambe: 0, vl: null };
    v.prendre();
    this._mesurerCycliste();
    return true;
  }
  _mesurerCycliste() {
    const V = this.velo;
    if (!V || !this.avatar) return;
    const L = this.avatar.longueurs();
    if (L.jambe > 0.3) { V.jambe = L.jambe; V.bras = L.bras; if (!this.remote) V.v.regler(Velo.hauteurSellePour(L.jambe)); }
  }
  // Descendre : par la GAUCHE, comme tout le monde, au niveau de la selle. Le vélo reste sur place.
  descendreVelo() {
    const V = this.velo;
    if (!V || V.sortir) return;
    const b = V.v, c = b.cap, gx = Math.cos(c), gz = -Math.sin(c), fx = Math.sin(c), fz = Math.cos(c);
    V.sortir = true;
    // à droite si la gauche est dehors (vélo garé le long du grillage dans l'autre sens)
    const B = this.bounds, dedans = (x, z) => !B || (x > B.xMin + 0.05 && x < B.xMax - 0.05 && z > B.zMin + 0.05 && z < B.zMax - 0.05);
    let sg = 1;
    if (!dedans(b.pos.x + gx * 0.62, b.pos.z + gz * 0.62) && dedans(b.pos.x - gx * 0.62, b.pos.z - gz * 0.62)) sg = -1;
    let x = b.pos.x + sg * gx * 0.62 - fx * 0.12, z = b.pos.z + sg * gz * 0.62 - fz * 0.12;
    if (B) { x = Math.max(B.xMin, Math.min(B.xMax, x)); z = Math.max(B.zMin, Math.min(B.zMax, z)); }
    if (!Monde.plat) [x, z] = this._piedATerre(b, sg, x, z);
    V.fin = { x, z, cap: c };
  }
  // PIED À TERRE SUR LE RELIEF (js/monde.js ; jamais appelé sur un terrain plat) : là où l'on pose le pied en descendant
  // doit être un sol où l'on marche, sans mur, marche de plus de 35 cm, massif ou eau entre le vélo et lui — le vélo
  // arrêté le long du mur des caves ou au bord de l'eau du bassin ne dépose pas son cycliste de l'autre côté. Dans
  // l'ordre : le côté prévu, l'autre côté, derrière la selle ; sinon sur place. Puis on y va à petits pas depuis le
  // vélo, chacun repoussé hors des obstacles posés (troncs, bancs, grilles) : on reste du côté du vélo — d'un seul coup,
  // un point posé derrière le grillage du plateau en aurait été repoussé du mauvais côté.
  // (Relecture du lot A4 : un côté où l'on marche mais qu'un obstacle posé barre — le grillage du plateau à 30 cm du vélo —
  // n'est pris que si l'on y arrive : les petits pas repoussés ne doivent pas finir à plus de 25 cm du point visé. Sinon
  // on passe au suivant ; le cycliste descendait sinon contre le grillage, à moitié sous son vélo, alors que l'autre côté
  // était libre. Aucun côté n'y arrive : celui qui s'en approche le plus.)
  _piedATerre(b, sg, x, z) {
    const c = b.cap, gx = Math.cos(c), gz = -Math.sin(c), fx = Math.sin(c), fz = Math.cos(c);
    const x0 = b.pos.x, z0 = b.pos.z, y0 = Monde.sol(x0, z0);
    const essais = [[x, z], [x0 - sg * gx * 0.62 - fx * 0.12, z0 - sg * gz * 0.62 - fz * 0.12], [x0 - fx * 0.85, z0 - fz * 0.85]];
    const q = { x: x0, z: z0 }, N = 8;
    let best = null, bd = Infinity;
    for (const e of essais) {
      if (Monde.franchir(x0, z0, y0, e[0], e[1], 'pieton')) continue;
      q.x = x0; q.z = z0;
      for (let i = 1; i <= N; i++) { q.x += (e[0] - x0) / N; q.z += (e[1] - z0) / N; Monde.resoudre(q, RAYON_PIETON, 'pieton'); }
      const ecart = Math.hypot(q.x - e[0], q.z - e[1]);
      if (ecart < bd) { bd = ecart; best = [q.x, q.z]; }
      if (ecart < 0.25) break;
    }
    if (best) return best;
    // (aucun côté où l'on marche : sur place, repoussé hors des obstacles posés)
    q.x = x0; q.z = z0; Monde.resoudre(q, RAYON_PIETON, 'pieton');
    return [q.x, q.z];
  }
  // Sans animation : changement de mode de jeu, menu. Le vélo reste là où il est.
  lacherVelo() {
    const V = this.velo;
    if (!V) return;
    if (this.remote) { V.v.racine.visible = false; }
    else if (V.fin) this.pos.set(V.fin.x, Monde.sol(V.fin.x, V.fin.z), V.fin.z);
    // (lot C4) l'engin du joueur (skate, trottinette pliante) : il le ramasse, il disparaît dans le sac
    if (V.v.perso) { V.v.racine.visible = false; V.v.pris = false; }
    this.velo = null;
    this.mesh.rotation.set(0, this.ang, 0);
    if (this.avatar) this.avatar._set('Hips', 0, 0);   // apply() ne touche pas à la rotation du bassin
  }
  // (chaque genre d'engin a sa réserve : celle de la classe de l'engin, lot C4)
  retirerVelo() { if (this.veloDistant) { const C = this.veloDistant.constructor; (C.rendre ? C : Velo).rendre(this.veloDistant); this.veloDistant = null; } }

  // Le bonhomme en primitives (avatar pas encore chargé) n'a pas de squelette pour la cinématique inverse :
  // ses membres n'ont qu'une articulation en avant-arrière. On résout donc le triangle cuisse-tibia (et
  // bras-avant-bras) à la main, dans son plan de côté, pour que les semelles restent sur les pédales et les
  // mains sur le guidon.
  _bonhommeSurVelo(e) {
    const r = this.rig;
    const tri = (dy, dz, L1, L2) => {
      const D = Math.min(L1 + L2 - 1e-3, Math.max(0.05, Math.hypot(dy, dz)));
      const th = Math.atan2(dz, -dy);                           // direction du segment, depuis la verticale basse
      const al = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))));
      const be = Math.PI - Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2))));
      return [th, al, be];
    };
    const mix = (o, v) => o + (v - o) * e;
    for (const G of [true, false]) {
      // jambes : semelle (0,49 sous le genou, 5 cm en arrière du centre de la chaussure) sur la pédale
      _vC.copy(G ? _vA.pedaleG : _vA.pedaleD); this.mesh.worldToLocal(_vC);
      const [th, al, be] = tri(_vC.y - 0.95, _vC.z - 0.05, 0.48, 0.49);
      const cuisse = G ? r.thighL : r.thighR, genou = G ? r.kneeL : r.kneeR;
      cuisse.rotation.x = mix(cuisse.rotation.x, -(th + al));
      genou.rotation.x = mix(genou.rotation.x, be);
      // bras : la main sur la poignée, coude vers le bas ; l'épaule suit l'inclinaison du buste
      const t = r.torso.rotation.x;
      _vC.copy(G ? _vA.poigneeG : _vA.poigneeD); this.mesh.worldToLocal(_vC);
      const sy = 0.95 + 0.58 * Math.cos(t), sz = 0.58 * Math.sin(t);
      const [ta, aa, ba] = tri(_vC.y + 0.03 - sy, _vC.z - sz, 0.32, 0.32);
      const bras = G ? r.armL : r.armR, coude = G ? r.elbowL : r.elbowR;
      bras.rotation.x = mix(bras.rotation.x, -(ta - aa) - t);
      coude.rotation.x = mix(coude.rotation.x, -ba);
    }
    this.mesh.updateMatrixWorld(true);
  }

  // LE CYCLISTE SUR SON VÉLO. Appelé à l'affichage, après que le vélo a pris sa pose de l'image.
  //  1) on place le corps : ses hanches exactement sur le point d'appui de la selle, penché avec le vélo ;
  //  2) les pieds sur les pédales, les mains sur les poignées, par cinématique inverse ;
  //  3) on corrige l'inclinaison du buste pour que les bras arrivent au guidon sans être tendus comme des
  //     piquets : la hauteur de guidon et la longueur des bras changent d'un joueur à l'autre.
  // À l'arrêt, le cycliste glisse de la selle vers l'avant et pose le pied GAUCHE par terre ; le vélo penche
  // de ce côté. Sans ça, un cycliste immobile tient en équilibre par magie.
  _placerSurVelo(a) {
    const V = this.velo, b = V.v;
    // (lot C4) la trottinette et le skate se conduisent DEBOUT : l'engin pose son cavalier (js/monture_cavalier.js)
    if (b.placerCavalier) { b.placerCavalier(this, a); return; }
    // Image sans pas de simulation (écran à 144 Hz, pause) : les membres sont encore dans la pose de l'IK de
    // l'image précédente. Les re-mélanger vers la cible à partir de là doublait le mélange pendant la montée
    // et la descente — les jambes sautaient de 50 % à 75 % puis revenaient. On repart de la pose de base.
    if (!this._frais) this._poseDeBase();
    b.presenter(a);
    if (this.remote) b.racine.visible = this.mesh.visible;
    b.ancres(_vA);
    const e = lisse(V.k), ar = b.arret, A = this.avatar;
    _vAv.set(0, 0, 1).applyQuaternion(_vA.qCadre); _vHa.set(0, 1, 0).applyQuaternion(_vA.qCadre); _vGa.set(1, 0, 0).applyQuaternion(_vA.qCadre);
    // la hanche visée : sur la selle, glissée vers l'avant et plus bas quand on est arrêté, ou au-dessus et
    // en avant de la selle en danseuse (on ne la relève pas plus : la jambe du bas doit encore toucher la pédale)
    const da = lisse(Math.min(1, b.danseuse || 0));
    _vT.copy(_vA.hanche).addScaledVector(_vAv, 0.12 * ar + 0.12 * da).addScaledVector(_vHa, -0.10 * ar + 0.06 * da);
    // où sont les hanches de l'avatar dans son propre repère (les os des cuisses ne dépendent que du bassin)
    if (A) {
      A._set('Hips', V.buste * 0.45 * e, 0);            // bassin basculé : les jambes sont reprises par l'IK
      this.mesh.updateMatrixWorld(true);
      A.bone('LeftUpLeg').getWorldPosition(_vH); A.bone('RightUpLeg').getWorldPosition(_vH2);
      _vH.add(_vH2).multiplyScalar(0.5);
      this.mesh.worldToLocal(_vH);
    } else _vH.set(0, 0.95, 0);                              // le bassin du bonhomme en primitives
    // pose assise = cadre du vélo ; pose debout = celle que presenter() vient de donner. En danseuse le
    // corps reste presque droit pendant que le vélo se balance dessous.
    _vQ.copy(_vA.qCadre);
    if (da > 0.01) _vQ.slerp(_vA.qSol, 0.75 * da);
    // (le groupe du joueur est mis à l'échelle de sa taille : un point local se multiplie par cette échelle)
    _vP.copy(_vH).multiply(this.mesh.scale).applyQuaternion(_vQ); _vP.subVectors(_vT, _vP);
    _vQ2.copy(this.mesh.quaternion); _vS.copy(this.mesh.position);
    this.mesh.position.lerpVectors(_vS, _vP, e);
    this.mesh.quaternion.slerpQuaternions(_vQ2, _vQ, e);
    this.mesh.updateMatrixWorld(true);
    if (!A) { this._bonhommeSurVelo(e); return; }
    if (!A.aJambe('Left')) return;
    // ---- jambes ----
    for (const cote of ['Left', 'Right']) {
      const G = cote === 'Left', sg = G ? 1 : -1;
      const ped = G ? _vA.pedaleG : _vA.pedaleD;
      _vC.copy(ped).addScaledVector(_vHa, CHEVILLE.haut).addScaledVector(_vAv, -CHEVILLE.arriere);
      if (G && ar > 0.01) {
        // pied à terre : à côté du vélo, un peu devant le pédalier, cheville à sa hauteur au-dessus du sol
        _vO.copy(b.racine.position).addScaledVector(_vGa, 0.31).addScaledVector(_vAv, -0.02);
        _vO.y = Monde.sol(_vO.x, _vO.z) + 0.085;          // (le sol à cet endroit : 0 sur un terrain plat)
        _vC.lerp(_vO, lisse(ar));
      }
      _vO.copy(_vC).addScaledVector(_vAv, 0.16).addScaledVector(G && ar > 0.5 ? _Y1 : _vHa, -0.05);
      A.bone(cote + 'UpLeg').getWorldPosition(_vPo);
      _vPo.addScaledVector(_vAv, 0.7).addScaledVector(_vHa, 0.25).addScaledVector(_vGa, sg * 0.10);
      A.ikJambe(cote, _vC, _vO, _vPo, e);
    }
    // ---- bras ----
    _vGAv.set(0, 0, 1).applyQuaternion(_vA.qGuidon); _vGHa.set(0, 1, 0).applyQuaternion(_vA.qGuidon);
    let dist = 0;
    for (const cote of ['Left', 'Right']) {
      const G = cote === 'Left', sg = G ? 1 : -1;
      if (!A.aMains(cote)) continue;
      const poi = G ? _vA.poigneeG : _vA.poigneeD;
      // le poignet est derrière et au-dessus du centre de la poignée : la main l'enveloppe par-dessus
      _vC.copy(poi).addScaledVector(_vGHa, 0.03).addScaledVector(_vGAv, -0.048);
      _vF.copy(_vGAv).multiplyScalar(0.9).addScaledVector(_vGa, sg * 0.22).addScaledVector(_vGHa, -0.18).normalize();   // doigts
      _vN.copy(_vGHa).multiplyScalar(-1).addScaledVector(_vGa, -sg * 0.25).normalize();                             // paume vers le bas
      _vPo.copy(_vC).addScaledVector(_vGa, sg * 0.40).addScaledVector(_vHa, -0.25).addScaledVector(_vAv, -0.30);   // coude dehors
      A.bone(cote + 'Arm').getWorldPosition(_vO);
      dist = Math.max(dist, _vO.distanceTo(_vC));
      A.ikBras(cote, _vC, _vF, _vN, _vPo, e);
      A.plierDoigts(cote, [0.75, 1.1, 0.85], e);
    }
    // ---- buste : on se penche juste assez pour que les coudes restent un peu fléchis ----
    if (V.bras > 0.2 && e > 0.5) {
      const r = dist / (V.bras * 0.93);
      V.buste = Math.max(0.1, Math.min(1.2, V.buste + (r - 1) * 0.35));
    }
  }

  // change d'avatar (tenue de la boutique) : retire le modèle actuel. Le bonhomme en primitives ne revient que
  // s'il n'y a plus d'avatar du tout (ou si le chargement échoue) : pendant le chargement, on ne montre rien.
  setAvatar(url, modelHeight) {
    if (this.dribble) this.dribble.reinit();
    if (this.avatarModel) { this.mesh.remove(this.avatarModel); this.avatarModel = null; }
    this.avatar = null; this.anim = null; this.animKey = null; this.body.visible = !url; this.avatarUrl = url || null;
    this.solDecal = 0; this.solRepos = null; this.solPosture = 0; this._semellesVite = null;
    if (url) this._loadAvatar(url, modelHeight || this.def.modelHeight || 1.84);
  }

  // clips Mixamo : chargés d'après assets/anims/manifest.json ; les états sans clip gardent la pose procédurale
  async _loadAnims(model, rig) {
    const man = await loadManifest(ANIM_MANIFEST);
    // (l'avatar a pu changer pendant l'attente — tenue de la boutique, joueur retiré : ces clips ne sont plus les siens)
    if (!man || !man.clips || this.disposed || this.avatarModel !== model) return;
    const hips = rig.bone('Hips'), leg = rig.bone('LeftLeg'), foot = rig.bone('LeftFoot');
    const ref = { hipsY: hips ? hips.position.y : 0.95, legLen: leg && foot ? leg.position.length() + foot.position.length() : 0 };
    const base = ANIM_MANIFEST.slice(0, ANIM_MANIFEST.lastIndexOf('/') + 1);
    const player = new AnimPlayer(model);
    const entries = Object.entries(man.clips).filter(([, d]) => d && typeof d === 'object' && d.file);
    const results = await Promise.all(entries.map(([name, d]) => loadMixamoClip(base + d.file.split('/').map(encodeURIComponent).join('/'), name, d, ref, rig)));
    if (this.disposed || this.avatarModel !== model || this.avatar !== rig) return;
    let n = 0;
    results.forEach((r, i) => { if (r) { player.add(entries[i][0], r.clip, r.def); n++; } });
    if (n === 0) return;
    console.log(`Animations Mixamo chargées pour ${this.def.name} : ${n}/${entries.length}`, Object.keys(player.actions).join(', '));
    if (this.avatar) this.avatar.couchesAnnuler(OS_COUCHES);   // voir AvatarRig.couchesAnnuler
    this.anim = player;
    this._mesurerSol();
    this._dribbleScheds();
    this.dribble.calibrer(this.avatar);
    // les mesures ci-dessus ont relancé des clips sans fondu : ce n'est pas un raccord à adoucir à l'écran
    player.coupe = false; this._clipAvant = undefined;
  }

  // PIEDS AU SOL (30/09). Les clips d'attente Mixamo (Idle, Goalkeeper Idle) posent les semelles 4,2 à 4,7 cm
  // AU-DESSUS du sol, sur tous les avatars : la hauteur des hanches du clip est mise à l'échelle par la longueur
  // de jambe (js/anim.js), qui ne compte ni la cheville ni la semelle des baskets. Mesuré sur les sommets des
  // chaussures : idle +4,3 et def_stance +4,2 chez Haythem, +4,2 et +4,1 chez Lamine. À ras du sol, on voyait la
  // chaussure au-dessus de son ombre ; la tache noire de l'ombre de contact le cachait jusqu'ici.
  //
  // On mesure donc UNE FOIS, au chargement, pour CET avatar et pour chaque clip de repos, la hauteur de la
  // semelle la plus basse (médiane sur le clip), et on descend l'avatar d'autant quand ce clip joue. C'est un
  // décalage CONSTANT par clip, pondéré par le poids du clip dans le mélange : il suit les fondus, et rien ne
  // bouge d'une image à l'autre. SURTOUT PAS de pose des pieds recalculée à chaque image en mouvement (IK qui
  // abaisse le corps sur le pied le plus bas) : en course, pendant la phase de vol, les deux pieds sont en
  // l'air et le corps redescendrait de 8 cm à chaque foulée — le rebond écrasé, la main décalée du ballon. Les
  // clips de course (et les gestes) ne sont donc pas touchés. Les clips de dribble sur place non plus : leurs
  // calendriers de main (_dribbleScheds) sont mesurés sans décalage.
  //
  // (les sommets de SEMELLE : le bas des chaussures dans la pose de liaison, 4 cm au plus au-dessus du point
  // le plus bas ; au plus 300 par maillage de chaussures — les deux pieds sont souvent dans le même — pour la
  // mesure du chargement, 60 pour le suivi de la triple menace. Skinning CPU de three : quelques millisecondes
  // au chargement, 0,03 ms par image pour le suivi, sur le seul porteur du ballon à l'arrêt)
  _mesurerSol() {
    const A = this.anim, M = this.avatarModel;
    this.solRepos = null; this._semelles = null; this._semellesVite = null; this.solPosture = 0;
    if (!A || !M) return;
    const pts = [];
    M.traverse((o) => {
      if (!o.isSkinnedMesh || !/shoe/i.test((o.material && o.material.name) || '')) return;
      const p = o.geometry.attributes.position; if (!p) return;
      let yMin = Infinity;
      for (let i = 0; i < p.count; i++) yMin = Math.min(yMin, p.getY(i));
      const idx = [];
      for (let i = 0; i < p.count; i++) if (p.getY(i) < yMin + 0.04) idx.push(i);
      pts.push({ o, idx });
    });
    if (!pts.length) return;
    const garder = (n) => pts.map(({ o, idx }) => { const pas = Math.max(1, Math.ceil(idx.length / n)); return { o, idx: idx.filter((_, k) => k % pas === 0) }; });
    this._semelles = garder(300); this._semellesVite = garder(60);
    const saved = { name: A.currentName, time: A.current ? A.current.time : 0 };
    const y0 = M.position.y; M.position.y = 0;             // la mesure se fait sans décalage
    const S = {};
    for (const nom of SOL_REPOS) {
      const a = A.actions[nom]; if (!a) continue;
      const clip = a.getClip(), n = 8, h = [];
      A.mixer.stopAllAction(); a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play();
      for (let s = 0; s < n; s++) {
        A.mixer.setTime(Math.min(clip.duration - 1e-4, (s + 0.5) / n * clip.duration));
        this.mesh.updateMatrixWorld(true);
        h.push(this._semelleBasse(this._semelles));
      }
      h.sort((x, y) => x - y);
      const med = h[n >> 1];
      // on ne corrige que ce qui se voit, et jamais plus de 8 cm vers le bas ni 3 cm vers le haut (garde-fou)
      if (Number.isFinite(med) && Math.abs(med) > 0.004) S[nom] = clamp(-med, -0.08, 0.03);
    }
    A.mixer.stopAllAction(); A.current = null; A.currentName = null; this.animKey = null;
    if (saved.name && A.actions[saved.name]) { A.play(saved.name, { fade: 0 }); A.current.time = saved.time; }
    M.position.y = y0;
    this.mesh.updateMatrixWorld(true);
    this.solRepos = Object.keys(S).length ? S : null;
  }

  // Hauteur (m) de la semelle la plus basse au-dessus de l'origine du joueur (le sol quand un clip pilote),
  // d'après la pose COURANTE du squelette (matrices monde à jour).
  _semelleBasse(liste) {
    let bas = Infinity;
    _mSol.copy(this.mesh.matrixWorld).invert();
    for (const { o, idx } of liste) {
      _mSol2.multiplyMatrices(_mSol, o.matrixWorld);     // repère de la chaussure -> repère du joueur
      for (const i of idx) bas = Math.min(bas, o.getVertexPosition(i, _w).applyMatrix4(_mSol2).y);
    }
    return bas * this.mesh.scale.y;
  }

  // Applique le décalage à l'image courante. Posé sur le MODÈLE, dans le groupe du joueur, AVANT le ballon et
  // les couches : la position affichée (posAff), la caméra et le repère du ballon ne changent pas, et tout ce
  // qui lit le squelette ensuite (mains, dribble, appuis, cinématique inverse des jambes) voit déjà l'avatar à
  // sa place.
  //   - clips de repos : somme de leurs décalages, pondérés par leur poids dans le mélange ;
  //   - TRIPLE MENACE (posture de dribble à l'arrêt, js/dribble.js : _posture) : le module repose les pieds
  //     par cinématique inverse, écartés, le pied du ballon en retrait, et les hanches plongent à chaque
  //     poussée : la hauteur des semelles n'y est pas celle du clip d'attente, et elle bouge. Là, et LÀ
  //     SEULEMENT (le joueur est à l'arrêt, ses pieds sont tenus par l'IK), on suit la semelle la plus basse :
  //     `solPosture` (_suivreSolPosture) descend le joueur jusqu'à ce qu'elle touche, jamais plus bas que le
  //     sol, jamais au-dessus de la hauteur du clip. (Le pied « sur la pointe », 4 cm sous le sol pendant que
  //     l'autre flottait à +3,7 cm, n'était pas voulu : c'était la visée des orteils perdue dans
  //     AvatarRig._viser dès que k < 1 — corrigé à la relecture, js/avatar.js. Les deux semelles sont
  //     maintenant à plat, à +0,5 et 0 cm une fois la posture prise.)
  _poserSol(dt, clipDriven) {
    const M = this.avatarModel; if (!M) return;
    let cible = 0;
    const A = this.anim, S = this.solRepos;
    if (clipDriven && A && S) {
      for (const n in S) {
        const a = A.actions[n];
        if (a && a.enabled && a.isRunning()) cible += S[n] * clamp(a.getEffectiveWeight(), 0, 1);
      }
      const kP = this._poidsPosture();
      if (kP > 0) cible = cible * (1 - kP) + this.solPosture * kP;
    }
    // (un léger lissage : un arrêt net de tous les clips — assis, vélo — ne fait pas sauter le corps de 4 cm)
    this.solDecal += (cible - this.solDecal) * (1 - Math.exp(-dt / 0.08));
    M.position.y = this.solDecal / (this.mesh.scale.y || 1);
  }
  // Poids de la posture de triple menace, calculé comme dans Dribble._posture, puis rendu PLEIN dès le premier
  // quart de la posture : les pieds sont repris par l'IK dès qu'elle s'engage, et un mélange au prorata
  // laissait la semelle la plus basse s'enfoncer pendant l'entrée en posture.
  _poidsPosture() {
    const D = this.dribble;
    if (!D || !(D.kSP > 0.01) || !D.kD || !this._semellesVite) return 0;
    return Math.min(1, 4 * lisse(clamp(D.kSP, 0, 1)) * Math.max(D.kD.Left || 0, D.kD.Right || 0));
  }
  // Suivi de la semelle en triple menace : une mesure par image affichée (60 sommets de semelle), APRÈS la
  // posture — les couches la posent en fin de pas. Le joueur ne descend jamais plus bas que le décalage de son
  // clip d'attente (plus un centimètre), ni ne monte au-dessus de sa hauteur. Hors posture, on repart du
  // décalage du clip d'attente : c'est de là que le joueur entre en triple menace. ASYMÉTRIQUE : une pointe
  // qui s'enfonce remonte le joueur tout de suite (le lissage de _poserSol suffit), un pied qui flotte le
  // redescend en 0,2 s (temps réel écoulé depuis la mesure précédente, pas le pas de simulation).
  _suivreSolPosture(dt) {
    this._dtSol = (this._dtSol || 0) + dt;
    if (!Player.poseVisible) return;
    const dtm = Math.min(0.1, this._dtSol); this._dtSol = 0;
    const S = this.solRepos, repos = Math.min(0, (S && S.idle) || 0);
    if (!this.avatarModel || !(this._poidsPosture() > 0.05)) { this.solPosture = repos; return; }
    const bas = this._semelleBasse(this._semellesVite);
    if (!Number.isFinite(bas)) return;
    const voulu = clamp(this.solDecal - bas, repos - 0.01, 0);
    if (voulu > this.solPosture) this.solPosture = voulu;
    else this.solPosture += (voulu - this.solPosture) * (1 - Math.exp(-dtm / 0.2));
  }

  // CONTRE UNE LIMITE DU TERRAIN, LA VITESSE QUI POUSSE DEHORS EST ANNULÉE (30/09). Les bornes ramenaient la
  // position sans toucher à `vel` : un joueur plaqué contre la ligne gardait sa vitesse de sprint, `speedNow`
  // aussi, et l'animation courait à 8 m/s pendant que le corps glissait à 0,7 m/s le long de la ligne — l'orteil
  // patinait de 40 à 80 cm par appui, un tapis roulant. Seule la composante qui sort est retirée : le joueur
  // longe la ligne à sa vraie vitesse, et le mélange de locomotion avec lui.
  _contreBornes(B) {
    const v = this.vel;
    if ((this.pos.x >= B.xMax && v.x > 0) || (this.pos.x <= B.xMin && v.x < 0)) v.x = 0;
    if ((this.pos.z >= B.zMax && v.z > 0) || (this.pos.z <= B.zMin && v.z < 0)) v.z = 0;
  }

  // Calendrier de dribble des clips « balle en main » (def.hand) : hauteur de la main de dribble échantillonnée à 60 Hz sur
  // le clip joué sur CET avatar -> minima (lâcher de la balle) et maxima (reprise). Le jeu fait ensuite partir la balle
  // exactement au bas du geste et la fait revenir dans la main au sommet : synchro exacte quel que soit le rythme du clip.
  _dribbleScheds() {
    const A = this.anim; if (!A || !this.avatar) return;
    const saved = { name: A.currentName, time: A.current ? A.current.time : 0 };
    for (const [name, d] of Object.entries(A.defs)) {
      if (!d.hand || d.loop === false) continue;
      const a = A.actions[name], clip = a.getClip();
      const n = Math.max(4, Math.round(clip.duration * 60) + 1), dur = clip.duration;
      A.mixer.stopAllAction(); a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play();
      // hauteur d'une main échantillonnée à 60 Hz, lissée, puis extrema alternés (amplitude ≥ 5 cm), étiquetés par main
      const extremaOf = (hand) => {
        const bone = this.avatar.bone(hand === 'L' ? 'LeftHandMiddle1' : 'RightHandMiddle1') || this.avatar.bone(hand === 'L' ? 'LeftHand' : 'RightHand');
        if (!bone) return null;
        const hs = new Float32Array(n);
        for (let i = 0; i < n; i++) { A.mixer.setTime(Math.min(clip.duration - 1e-4, i / 60)); this.mesh.updateMatrixWorld(true); bone.getWorldPosition(_w); hs[i] = _w.y - this.mesh.position.y; }
        const sm = new Float32Array(n); for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = -2; k <= 2; k++) { const j = i + k; if (j >= 0 && j < n) { s += hs[j]; c++; } } sm[i] = s / c; }
        const cands = [];
        for (let i = 1; i < n - 1; i++) {
          if (sm[i] < sm[i - 1] && sm[i] <= sm[i + 1]) cands.push({ i, t: i / 60, h: sm[i], type: 'min', hand });
          else if (sm[i] > sm[i - 1] && sm[i] >= sm[i + 1]) cands.push({ i, t: i / 60, h: sm[i], type: 'max', hand });
        }
        const ext = [];
        for (const c of cands) {
          const last = ext[ext.length - 1];
          if (!last) { ext.push(c); continue; }
          if (last.type === c.type) { if ((c.type === 'min' && c.h < last.h) || (c.type === 'max' && c.h > last.h)) ext[ext.length - 1] = c; continue; }
          if (Math.abs(c.h - last.h) < 0.05) continue;
          ext.push(c);
        }
        return { ext, sm };
      };
      const cyclic = d.loop === true;
      if (d.hand === 'RL') {
        // dribble alterné à deux mains : lâcher = minimum d'une main, reprise = premier maximum suivant (n'importe quelle main),
        // lâcher suivant = minimum de la main qui a repris, etc. -> la balle change de main quand le clip le fait.
        // Clip en boucle : on parcourt deux cycles à la suite pour ne pas perdre les événements qui chevauchent la fin du clip.
        const R = extremaOf('R'), Lh = extremaOf('L'); if (!R || !Lh) continue;
        const base = [...R.ext, ...Lh.ext].sort((p, q) => p.t - q.t);
        const all = cyclic ? [...base, ...base.map((e) => ({ ...e, t: e.t + dur }))] : base;
        const seq = []; let cur = all.find((e) => e.type === 'min'); const t0 = cur ? cur.t : 0;
        while (cur && seq.length < 60 && (!cyclic || cur.t < t0 + dur - 1e-6)) {
          seq.push(cyclic ? { ...cur, t: cur.t >= dur ? cur.t - dur : cur.t } : cur);
          const c = cur;
          if (c.type === 'min') {
            const same = all.find((e) => e.type === 'max' && e.hand === c.hand && e.t > c.t), other = all.find((e) => e.type === 'max' && e.hand !== c.hand && e.t > c.t);
            cur = other && (!same || other.t <= same.t + 0.12) ? other : same;   // alternance : l'autre main reprend si elle remonte en même temps
          } else cur = all.find((e) => e.type === 'min' && e.hand === c.hand && e.t > c.t);
        }
        seq.sort((p, q) => p.t - q.t);
        if (seq.length >= 2) d.sched = { ext: seq, hand: 'RL', cyclic };
        continue;
      }
      const one = extremaOf(d.hand); if (!one) continue;
      const ext = one.ext, sm = one.sm;
      // bornes du clip = points de rebroussement (ping-pong) : extremum du type opposé au premier / dernier trouvé ;
      // clip en boucle simple (course) : pas de borne, le calendrier est cyclique (voir Game.dribbleSched)
      if (ext.length && !cyclic) {
        ext.unshift({ i: 0, t: 0, h: sm[0], type: ext[0].type === 'min' ? 'max' : 'min' });
        ext.push({ i: n - 1, t: clip.duration, h: sm[n - 1], type: ext[ext.length - 1].type === 'min' ? 'max' : 'min' });
      }
      d.sched = { ext, hand: d.hand, cyclic };
    }
    Dribble.mesurerAppuis(this);                  // instants d'appui de chaque pied, sur chaque clip de course
    A.mixer.stopAllAction(); A.current = null; A.currentName = null; this.animKey = null;
    if (saved.name && A.actions[saved.name]) { A.play(saved.name, { fade: 0 }); A.current.time = saved.time; }
  }

  // délai entre le déclenchement du tir et le lâcher de balle, d'après le clip (null = valeur par défaut du jeu)
  animDelay(type) {
    if (!this.anim) return null;
    // LAYUP : le lâcher suit le saut PHYSIQUE, pas le clip. On prenait le `release` automatique de Running Jump à
    // vitesse 1 (0,33 s) alors que le clip est maintenant calé sur la montée réelle (voir _driveAnim) et que le
    // saut culmine à 0,41 s : la balle partait avant que le bras soit en haut. Lâcher à 90 % de la montée, bras tendu.
    if (type === 'layup') return this.dunkRise * 0.9;
    const name = type === 'dunk' ? 'dunk' : type === 'layup' ? 'layup' : (this.shotVariant || 'jumpshot');
    const real = this._resolve(name);
    if (real !== name) return null;
    const d = this.anim.defs[name];
    if (!d || d.release === undefined) return null;
    if (!name.startsWith('jumpshot')) return d.release;
    // tir : le clip va de là où il en est jusqu'à son lâcher en une seule cadence, calée pour que le lâcher
    // tombe juste après le sommet du VRAI saut (tirLacher) — armé écourté compris : la fin de l'armé se joue
    // alors en l'air, plus vite, au lieu de repousser le lâcher jusqu'à la retombée
    const A = this.anim, t = A.currentName === name ? A.time : 0, set = d.set || 0;
    if (this.tirLacher > 0) {
      const reste = Math.max(0.01, d.release - t);
      this.tirVitesse = clamp(reste / this.tirLacher, 1, 3.5);
      return Math.max(0.05, reste / this.tirVitesse);
    }
    return Math.max(0.05, Math.max(0, set - t) / GATHER_SPEED + (d.release - set));
  }

  _resolve(name) {
    if (this.anim.has(name)) return name;
    for (const f of FALLBACK[name] || []) if (this.anim.has(f)) return f;
    return null;
  }

  // LE SENS DE DEPLACEMENT, AVEC MEMOIRE — et c'est indispensable.
  //
  // `backward` et `lateral` se mesurent par rapport au CAP du joueur. Or au démarrage le cap n'a pas encore
  // rattrapé la course : pendant deux dixièmes de seconde on file en avant EN REGARDANT DE CÔTÉ, donc
  // `lateral` vaut presque 1 et le jeu réclamait l'échelle des pas chassés, puis celle de la marche arrière,
  // puis celle de la course — trois familles en moins d'un tiers de seconde. Et comme les poids sont
  // persistants, les trois restaient à l'écran en même temps : marche arrière + pas chassé + trot superposés.
  // Mesuré à chaque démarrage : `walk_back + walk_side_m + def_slide_l` puis `walk_back + def_slide_l +
  // run_alt`. Quatre démarches différentes moyennées, les membres partant dans toutes les directions.
  // C'est exactement ce que Haythem décrivait : « le personnage se multiplie en plusieurs fois rapidement ».
  //
  // On demande donc au nouveau sens de se CONFIRMER pendant un septième de seconde avant d'y basculer. Les
  // transitoires du démarrage et des changements d'appui ne durent pas si longtemps ; un vrai recul ou un
  // vrai pas chassé, si.
  _sensLoco(dt) {
    // on n'entre dans le recul ou le pas de côté que franchement, et on n'en sort qu'une fois nettement revenu
    const ar = this.sensLoco === 'ar' ? this.backward > 0.45 : this.backward > 0.62;
    const lat = this.sensLoco === 'lat' ? this.lateral > 0.55 : this.lateral > 0.72;
    const cand = ar ? 'ar' : lat ? 'lat' : 'av';
    if (cand === this.sensLoco) { this.sensT = 0; return this.sensLoco; }
    this.sensT += dt;
    if (this.sensT >= 0.14) { this.sensLoco = cand; this.sensT = 0; }
    return this.sensLoco;
  }

  // UN SEUL CLIP A LA FOIS. Le joueur dit lequel ; le fondu vers lui est l'affaire du lecteur (js/anim.js),
  // qui tient un poids persistant par clip.
  //
  // Ma première version mélangeait en permanence les deux clips qui encadrent la vitesse, au prorata. C'était
  // une erreur, et elle se voyait : à 5,8 m/s on jouait course et sprint à peu près moitié-moitié, et la
  // moyenne de deux prises de mouvement DIFFERENTES n'est pas une prise de mouvement. Les jambes tenaient à
  // peu près — elles sont calées sur la même phase de foulée — mais les BRAS, dont le balancier ne culmine
  // pas au même instant du cycle dans les deux prises, s'annulaient : ils pendaient le long du corps pendant
  // que le joueur filait à huit à l'heure. Mesuré : la vitesse angulaire médiane de la cuisse tombait de
  // 537 à 464 degrés par seconde, soit un septième d'amplitude perdu, et l'allure devenait molle.
  //
  // Le choix du clip :
  //   - le SPRINT est un état du jeu, pas une vitesse : quand le joueur sprinte on prend le clip le plus
  //     rapide, point. Sans ça, l'allure de croisière de Haythem (5,81 m/s) tombait pile sur la frontière
  //     course/sprint et le jeu hésitait entre les deux ;
  //   - sinon, la frontière entre deux clips est leur moyenne GEOMETRIQUE et non arithmétique : c'est elle
  //     qui répartit équitablement l'étirement du temps de part et d'autre (à mi-chemin, les deux clips sont
  //     déformés du même facteur) ;
  //   - avec une marge d'hystérésis, sans quoi une vitesse qui flotte autour d'un seuil ferait clignoter
  //     l'animation entre deux allures.
  _choisirLoco(echelle, hautDeGamme) {
    const A = this.anim;
    const dispo = [];
    for (const n of echelle) { const r = this._resolve(n); const d = r && A.defs[r]; if (d && d.foulee && !dispo.includes(r)) dispo.push(r); }
    if (!dispo.length) return null;
    dispo.sort((a, b) => A.defs[a].speedRef - A.defs[b].speedRef);
    const cle = echelle[0];
    let L = this.locoEtat;
    if (!L || L.cle !== cle || dispo.indexOf(L.nom) < 0) L = this.locoEtat = { cle, nom: dispo[0] };
    const v = this.speedNow, iCourant = dispo.indexOf(L.nom);
    // ... mais pas à n'importe quelle vitesse (06/10/2026) : au départ d'un sprint le joueur est encore à 1 ou
    // 2 m/s, et le clip de sprint, joué au plancher de sa cadence, faisait courir les jambes deux fois plus vite
    // que le sol — patinage à chaque démarrage. Le sprint ne prend la main qu'au-delà de 70 % de sa vitesse de
    // référence (et la garde jusqu'à 60 %) ; en dessous, l'échelle des vitesses, comme pour tout le monde.
    if (hautDeGamme && dispo.length > 1) {
      const top = dispo[dispo.length - 1], vTop = A.defs[top].speedRef || 1;
      if (v > vTop * (L.nom === top ? 0.6 : 0.7)) { L.nom = top; return top; }
    }
    let cible = dispo[0];
    for (let i = 1; i < dispo.length; i++) {
      const va = A.defs[dispo[i - 1]].speedRef, vb = A.defs[dispo[i]].speedRef;
      const seuil = Math.sqrt(va * vb), marge = (vb - va) * 0.06;
      // déjà sur le clip rapide : on ne redescend qu'en passant nettement SOUS le seuil, et inversement
      if (v > seuil + (iCourant >= i ? -marge : marge)) cible = dispo[i];
    }
    L.nom = cible;
    return cible;
  }

  // Fondu entre deux clips selon le couple (06/10/2026). Un seul temps pour tout (0,08 s pour un geste, 0,22 s
  // pour une boucle) donnait des sorties de chambrage ou de relevé qui claquaient, et des entrées de tir molles.
  _fondu(de, vers, once) {
    if (!de || de === vers) return once ? 0.08 : 0.22;
    if (vers === 'knock') return 0.06;
    if (de === 'knock' && vers === 'getup') return 0.04;          // même relevé, image pour image
    if (vers.startsWith('jumpshot')) return 0.1;
    if (de === 'getup' || de === 'taunt' || de === 'defeat' || de === 'victory' || de.startsWith('celebrate') || de.startsWith('dance')) return 0.3;
    if (de === 'block' || de === 'block_m') return 0.16;          // retombée d'un saut
    if ((de === 'idle' && vers === 'def_stance') || (de === 'def_stance' && vers === 'idle')) return 0.3;
    if (vers.startsWith('pass') || vers === 'catch') return 0.1;
    return once ? 0.1 : 0.22;
  }

  // Vers la pose procédurale : on coupe le mélangeur ; le raccord à l'écran est le fondu de pose (update).
  _versProcedural() {
    const A = this.anim;
    if (A.current || A.loco.length) A.couper();
    A.haut = null;
    this.animKey = null; this.armsOverride = false; this.clipSpin = false; this.locoActif = false;
    this.kBras = 0; this.kTronc = 0;
  }

  // Clip de saut sans ballon (contre, contestation, rebond) : le bras qui frappe du côté de ce qu'on vise.
  // (« Defender » frappe de la main GAUCHE : le clip tel quel pour une cible à sa gauche, le miroir sinon)
  // LE CÔTÉ SE CHOISIT UNE FOIS PAR SAUT (06/10/2026) : relu à chaque image, il basculait dès que la cible passait de
  // l'autre côté (le ballon qui file sur le côté), et le clip, dont le nom fait partie de la clé, repartait du début en
  // plein vol. Gardé pour ce saut (sautId) ; oublié au sol (_driveAnim) — un joueur distant ne change pas de sautId.
  _clipSaut() {
    const A = this.anim;
    if (!A.has('block_m')) return 'block';
    if (this._coteSaut && this._coteSautId === this.sautId) return this._coteSaut;
    const c = this.cibleRegard;
    // x local > 0 : la cible est à SA gauche
    const lx = c ? (c.x - this.pos.x) * this.facing.z - (c.z - this.pos.z) * this.facing.x : 0;
    this._coteSautId = this.sautId;
    return (this._coteSaut = lx > 0.12 ? 'block' : 'block_m');
  }

  // Geste ponctuel calé sur sa minuterie : le clip finit quand le jeu dit que le geste est fini. Avant, une
  // durée fixe (`fit`) côté clip et une autre côté jeu : le chambrage (1,7 s de jeu pour 1,4 s de clip) restait
  // figé sur sa dernière image, la poussée et le vol étaient coupés avant la fin.
  _minuterie(nom) {
    return nom.startsWith('pass') ? this.passT : nom === 'catch' ? this.catchT : nom === 'taunt' ? this.tauntT
      : nom === 'pickup' ? this.pickupT : (nom === 'post' || nom === 'post_m') && this.bumpT > 0 && !(this.postT > 0) ? this.bumpT : 0;
  }

  // choisit et pilote le clip selon l'état ; retourne false si aucun clip ne convient (→ pose procédurale)
  _driveAnim(dt) {
    // EN MOUVEMENT, avec hystérésis. Un seuil unique à 0,1 faisait basculer l'animation d'arrêt à course
    // plusieurs fois par freinage. Mais s'arrêter seulement sous 0,08 m/s laissait tourner le mélange de
    // locomotion à sa cadence plancher (0,8 cycle/s) entre 0,1 et 0,5 m/s : à chaque arrêt, les pieds
    // trépignaient sur place pendant qu'on glissait de quelques centimètres (30/09). Sous 0,4 m/s on repasse
    // donc au clip d'attente, et on ne repart qu'au-dessus de 0,55.
    this._bougeAnim = this._bougeAnim ? this.speedNow > 0.4 : this.speedNow > 0.55;
    const A = this.anim, st = this.state, moving = this._bougeAnim;
    // Assis : pose ENTIEREMENT procedurale. Un clip ecraserait la translation des hanches, et c'est
    // justement elle (cur.bob) qui pose le joueur a la hauteur de l'assise.
    if (this.assis || this.velo || this._patine) {      // (lot C4 : en rollers, la foulée procédurale)
      this._versProcedural(); return false;
    }
    // AU SOL. Le joueur vient d'être mis par terre : chute, temps d'arrêt, relevé. Rien d'autre ne peut
    // l'interrompre — c'est la seule situation du jeu où l'on perd la main sur son personnage, et c'est
    // volontaire : c'est ce qui donne son poids au contact.
    if (this.chuteT > 0) {
      const nom = this.chutePh === 'lever' ? 'getup' : 'knock';
      const r = this._resolve(nom);
      if (!r) { this._versProcedural(); return false; }
      const dc = A.defs[r];
      // `fit` donne la durée voulue du geste ; les deux clips sont deux fenêtres du même relevé, l'une à
      // l'envers, donc la dernière image de la chute EST la première du relevé : aucun fondu n'est nécessaire.
      const vit = dc.fit && dc.duration ? dc.duration / dc.fit : 1;
      // LA CLÉ SUIT LE CLIP, PAS LA PHASE (06/10/2026). Elle valait 'chute:chute' puis 'chute:sol' : au passage au
      // temps d'arrêt la clé changeait, `knock` repartait de zéro, et le joueur TOMBAIT DEUX FOIS. La chute et le
      // temps au sol sont le même clip (figé sur sa dernière image, le corps à plat) ; seul le relevé en change.
      const cle = 'chute:' + r;
      if (cle !== this.animKey) { A.play(r, { restart: true, speed: vit, fade: this._fondu(A.currentName, r, true) }); this.animKey = cle; }
      this.armsOverride = false; this.clipSpin = false; this.locoActif = false;
      A.stopHaut();
      A.update(dt);
      this._poserReprises(dt, st, false);
      return true;
    }
    let want = null, speed = 1, once = false, loco = null;
    if (!this.airborne) this._coteSaut = null;                    // retombé : le prochain saut choisit son côté (_clipSaut)
    // GESTES DU HAUT DU CORPS EN COURANT (06/10/2026). Une passe, une réception ou un chambrage lancés en pleine
    // course jouaient le clip ENTIER : jambes figées au milieu d'une foulée, et le joueur continuait d'avancer à
    // 5 m/s — il patinait sur le bitume. En mouvement, ces gestes passent en couche « haut du corps » par-dessus
    // la locomotion (AnimPlayer.jouerHaut) ; à l'arrêt, le clip entier, comme avant.
    let haut = null;
    if (moving && st === 'idle' && !this.airborne && !this.emote) {
      if (this.tauntT > 0 && !this.hasBall && A.has('taunt')) haut = 'taunt';
      else if (this.catchT > 0 && A.has('catch')) haut = 'catch';
      else if (this.passT > 0 && A.has(this.passClip || 'pass')) haut = this.passClip || 'pass';
    }
    if (st === 'windup' || st === 'shoot') {
      if (st === 'windup' && this.prevAnimSt !== 'windup' && !this.remote) { const vs = ['jumpshot', 'jumpshot_2', 'jumpshot_3'].filter((v) => A.has(v)); this.shotVariant = vs.length ? vs[Math.floor(Math.random() * vs.length)] : 'jumpshot'; }
      want = this.shotVariant || 'jumpshot'; once = true;
    }
    // layup / dunk : la version miroir quand on finit de la main gauche (voir _mainFinale)
    else if (st === 'layup') { want = this.layupClip || (this.mainFinale === 'L' && A.has('layup_m') ? 'layup_m' : 'layup'); once = true; }
    else if (st === 'dunk') { want = this.dunkClip || (this.mainFinale === 'L' && A.has('dunk_m') ? 'dunk_m' : 'dunk'); once = true; }
    else if (st === 'celebrate') { want = this.celebVariant; once = true; }
    else if (st === 'defeat') { want = 'defeat'; once = true; }
    else if (this.emote) {
      // emote « maison » (procOnly) : aucun clip, c'est la chorégraphie de _pose qui pilote l'avatar
      want = this.emote.procOnly ? null : (A.has(this.emote.clip) ? this.emote.clip : (A.has('celebrate_3') ? 'celebrate_3' : 'victory'));
      once = !this.emote.loop;
      if (!want) { this._versProcedural(); return false; }
    }
    // (le VOL DE BALLE n'a plus de clip : c'était le clip de défense entier, cinq secondes jouées en 0,4 — on n'y
    // voyait rien. C'est maintenant le bras qui va chercher le ballon, par-dessus la garde ou la course : Couches._vol)
    // REBOND. AU SOL, le clip du saut est une retombée de contre : le joueur avait l'air de se remettre en garde
    // au lieu d'encaisser sa retombée. On passe donc en pose entièrement procédurale pendant la demi-seconde qui
    // suit la prise (flexion des jambes et balle serrée au buste) — avec un fondu de pose, plus d'une image à l'autre.
    else if (this.rebondT > 0 && !this.airborne) { this._versProcedural(); return false; }
    // EN L'AIR SANS BALLON (contre, contestation, rebond, feinte mordue) : le début de « Defender », un vrai saut de
    // contre, bras qui frappe — calé sur le saut physique (voir plus bas) ; au rebond, les bras sont procéduraux.
    else if (this.airborne) { want = this._clipSaut(); once = true; }
    else if (!haut && this.tauntT > 0 && !this.hasBall) { want = 'taunt'; once = true; }
    else if (this.pickupT > 0) { want = 'pickup'; once = true; }
    else if (!haut && this.catchT > 0 && A.has('catch')) { want = 'catch'; once = true; }        // réception à deux mains
    // Passe : deux gestes tirés au sort, la poussée à une main (141_10) et l'envoi par-dessus l'épaule
    // (143_20), en version droitier ou gaucher selon la main qui tient la balle.
    else if (!haut && this.passT > 0 && A.has('pass')) { want = this.passClip || 'pass'; once = true; }
    // APPUI DOS AU DÉFENSEUR. Le buste rentre dans l'adversaire, les deux bras poussent : c'est le geste du
    // pivot qui gagne sa place sous le cercle. Même clip que le coup d'épaule, joué plus longtemps.
    // (06/10/2026) BALLE EN MAIN, le clip de poussée levait les deux bras — et le ballon, collé à la main de dribble,
    // montait avec : on dribblait les bras en l'air. Le pivot qui recule dans son défenseur est maintenant dans une
    // garde basse et large (jambes du clip de défense), le dribble bas et le bras-barre procéduraux (armsOverride).
    else if (this.postT > 0 && this.hasBall && A.has('def_stance')) want = 'def_stance';
    else if (this.postT > 0 && A.has('post')) { want = this.postSens < 0 && A.has('post_m') ? 'post_m' : 'post'; once = true; }
    // ... mais seulement À L'ARRÊT : en mouvement, le coup d'épaule reste un geste du HAUT du corps posé par-dessus
    // la foulée (armsOverride). Prendre tout le corps aurait figé les jambes en plein appui pendant quatre
    // dixièmes de seconde, et le joueur aurait glissé sur le bitume, immobile (le seuil était à 2,4 m/s : on
    // patinait encore à 2 m/s).
    else if (this.bumpT > 0 && !moving && A.has('post')) { want = this.bumpSide < 0 && A.has('post_m') ? 'post_m' : 'post'; once = true; }
    else if (this.fakeT > 0) { want = this.shotVariant || 'jumpshot'; once = true; }    // feinte : on arme puis on redescend
    else if (this.crossT >= 0 && this.moveClip && A.has(this.moveClip)) { want = this.moveClip; once = true; }
    else if (this.spinT > 0 && this.hasBall) { want = this.dribbleHand === 'L' && A.has('spin_m') ? 'spin_m' : 'spin'; once = true; }
    else if (this.defending && !this.hasBall) {
      // Au-delà de 2,6 m/s un défenseur COURT : il glissait en posture défensive à pleine vitesse, ce qui faisait
      // patiner quatre joueurs sur six en 3v3. Les pas chassés sont réservés aux déplacements courts et latéraux.
      // Le recul passe AVANT le test de vitesse : un défenseur qui recule le fait vite, et jouer 'run' dans ce
      // cas-là donnait un joueur qui courait en avant tout en se déplaçant en arrière. Au-delà de 4,4 m/s ce
      // n'est plus un recul défensif mais un repli en course, et là 'run' est le bon clip.
      // SEUILS DÉCALÉS ET TEMPS MINIMUM. Chaque seuil a une entrée et une sortie (on reste dans l'allure
      // où l'on est tant qu'on n'est pas nettement sorti de sa zone), et une allure choisie tient au moins
      // 0,28 s. Sans ça un défenseur alternait garde, pas chassés, recul et course trois fois par seconde.
      const DC = this.defChoix || (this.defChoix = { nom: 'def_stance', t: 1 });
      const ici = (n) => DC.nom === n;
      const recule = this.backward > (ici('def_back') ? 0.4 : 0.55) && this.speedNow <= (ici('def_back') ? 4.8 : 4.4);
      const court = this.speedNow > (ici('run') || ici('sprint') ? 2.2 : 2.6) && this.lateral < (ici('run') || ici('sprint') ? 0.82 : 0.72);
      const glisse = this.lateral > (ici('def_slide_r') || ici('def_slide_l') ? 0.3 : 0.45);
      let cand;
      if (moving && recule && A.has('def_back')) cand = 'def_back';
      else if (moving && court) cand = this.sprintVu > 0 ? 'sprint' : 'run';
      else cand = moving && glisse ? (this.lateralDir >= 0 ? 'def_slide_r' : 'def_slide_l') : 'def_stance';
      DC.t += dt;
      // course <-> sprint et changement de côté des pas chassés : même famille, on n'attend pas
      const meme = (cand === 'run' && ici('sprint')) || (cand === 'sprint' && ici('run'));
      if (cand !== DC.nom && (DC.t >= 0.28 || meme)) { DC.nom = cand; DC.t = 0; }
      // En course, le défenseur passe par le MÉLANGE DE LOCOMOTION comme l'attaquant (phase de foulée
      // commune) : course et sprint étaient deux clips séparés fondus l'un dans l'autre sans alignement de
      // foulée, et chaque bascule faisait sauter les jambes. Recul rapide = échelle arrière.
      if (DC.nom === 'run' || DC.nom === 'sprint') {
        const sens = this._sensLoco(dt);
        loco = sens === 'ar' ? this._choisirLoco(LOCO_AR, false) : this._choisirLoco(LOCO_AV, DC.nom === 'sprint');
        if (!loco) want = DC.nom;
      } else if (DC.nom === 'def_slide_r' || DC.nom === 'def_slide_l' || DC.nom === 'def_back') {
        // pas chassés et recul aussi : sur la phase de foulée commune, ils GLISSENT de l'un à l'autre (et vers
        // la course) au lieu de repartir de zéro à chaque changement — les pieds ne sautent plus
        loco = DC.nom === 'def_back' ? this._choisirLoco(LOCO_AR, false) : this._choisirLoco(DC.nom === 'def_slide_r' ? LOCO_DEF_D : LOCO_DEF_G, false);
        if (!loco) want = DC.nom;
      } else want = DC.nom;
    }
    else if (moving) {
      // balle en main : clip de course avec dribble (DeepMotion, main droite ou miroir) sinon jambes du clip + bras procéduraux
      const rb = this.hasBall && this.crossT < 0 ? (this.dribbleHand === 'L' && A.has('run_ball_l') ? 'run_ball_l' : A.has('run_ball') ? 'run_ball' : null) : null;
      if (rb) want = rb;
      else {
        // Quelle échelle ? Celle du sens de déplacement RÉEL par rapport au cap. Un joueur qui recule ou qui
        // se déplace en crabe n'a rien à faire dans l'échelle « avant » : c'est ce mélange-là qui donnait des
        // joueurs courant vers l'avant tout en glissant de côté.
        // Le sens est CONFIRME (voir _sensLoco) et le drapeau de sprint LISSE (voir move) : bruts, l'un
        // change de famille de démarche trois fois par démarrage et l'autre clignote vingt fois par seconde.
        const sens = this._sensLoco(dt);
        loco = sens === 'ar' ? this._choisirLoco(LOCO_AR, false)
          : sens === 'lat' ? this._choisirLoco(this.lateralDir >= 0 ? LOCO_LAT_D : LOCO_LAT_G, false)
            : this._choisirLoco(LOCO_AV, this.sprintVu > 0);
        if (!loco) want = this.sprinting ? 'sprint' : 'run';
      }
    }
    // téléphone en main : on ne dribble plus, on attend debout (la balle est calée contre la hanche)
    // DRIBBLE SUR PLACE façon 2K (js/dribble.js) : le clip d'attente pour les jambes ; la posture de triple
    // menace, le bras qui dribble et le bras qui protège viennent du module. Les anciens clips de dribble sur
    // place (Mixamo accroupi, pieds tordus ; captures) ne servent plus qu'en secours.
    else if (this.hasBall && !this.telActif() && this.dribble.controle) want = 'idle';
    else if (this.hasBall && !this.telActif()) {
      // dribble sur place : variante tirée au sort à chaque prise de balle (Mixamo, LeBron, Kid...)
      // variantes : CMU (idle_ball_4) + DeepMotion (idle_ball_5/6/7) ; le « Dribble » Mixamo (accroupi, pieds tordus) et les
      // clips Sketchfab (LeBron/Kid : rig différent) ne sont plus tirés au sort, idle_ball reste le clip de secours
      // À chaque nouvelle prise de balle on tire une variante de dribble : 10 clips étaient chargés, retargetés et
      // échantillonnés à chaque partie sans jamais pouvoir être joués, parce que la variante était figée sur idle_ball.
      if (!this.hadBall && !this.remote) this.dribbleVariant = this.pickDribbleVariant();   // à distance : celle de l'émetteur
      // touche dribble : mouvement fourni par Haythem (dribling_basketball.glb converti), tant que la touche est tenue
      const v = this.dribbleMoveT > 0 && A.has('idle_ball_8') ? 'idle_ball_8' : (this.dribbleVariant || 'idle_ball');
      const dv = A.defs[v];
      want = dv && dv.hand === 'RL' ? v : (this.dribbleHand === 'L' ? (A.has(v + '_l') ? v + '_l' : A.has('idle_ball_l') ? 'idle_ball_l' : v) : v);   // clip à deux mains : pas de miroir
    } else want = 'idle';
    this.hadBall = this.hasBall; this.prevAnimSt = st;

    // ---- l'horloge du geste ponctuel : la même, qu'il soit joué en entier (à l'arrêt) ou en couche (en courant) ----
    const gesteNom = haut || (want && once && this._minuterie(want) > 0 ? want : null);
    const GC = this._gc || (this._gc = { cle: null, t: 0, vit: 1 });
    let gesteNeuf = false;
    if (gesteNom) {
      const cle = gesteNom + ':' + this.gesteId;
      const dg = A.defs[gesteNom];
      if (cle !== GC.cle) {
        gesteNeuf = true;
        GC.cle = cle; GC.t = 0;
        const m = this._minuterie(gesteNom);
        GC.vit = dg && dg.duration && m > 0.05 ? clamp(dg.duration / m, 0.5, 3.5) : dg && dg.fit && dg.duration ? dg.duration / dg.fit : 1;
      } else GC.t += dt * GC.vit;
    } else GC.cle = null;
    if (haut) A.jouerHaut(haut, GC.cle, GC.vit, GC.t);
    else if (A.haut) A.stopHaut();

    // ---- le mélange de locomotion court-circuite le choix d'un clip unique ----
    if (loco) {
      // LA PHASE AVANCE AVEC LE SOL, pas avec le temps. Un cycle de foulée couvre `loco.foulee` mètres ; on
      // parcourt `speedNow * dt` mètres ; donc on avance de `speedNow * dt / foulee` cycle. C'est tout, et
      // c'est exactement ce qui fait que le pied ne patine jamais.
      // Un PLANCHER et un PLAFOND autour de la cadence naturelle du clip. Le plancher évite le ralenti
      // absurde des vitesses résiduelles — à 0,3 m/s le clip tournerait sept fois trop lentement et le
      // joueur aurait l'air figé en plein pas. Le plafond évite l'inverse : entre la marche (2,11 m/s) et le
      // petit trot (4,5 m/s) il n'existe aucun clip, et sans borne une marche jouée à une fois et demie sa
      // cadence tourne au dessin animé. Au-delà on préfère un léger patinage, qui est ce que faisait
      // l'ancien système avec son timeScale borné à [0,6 ; 1,6].
      // (plancher abaissé de 0,55 à 0,4 le 06/10/2026 : à la vitesse de départ, 0,55 m/s, la marche tournait encore
      // deux fois plus vite que le sol et les pieds glissaient vers l'arrière à chaque démarrage)
      // Deux temps : on fait d'abord glisser les poids d'une image, ce qui donne la foulee du melange, puis
      // on avance la phase de cette foulee-la et on pose les couches. La cadence doit etre connue AVANT
      // d'avancer la phase, d'ou la separation.
      const m = A.majPoidsLoco(loco, dt);
      const nat = m.vRef / m.foulee;
      const cad = clamp(this.speedNow / m.foulee, nat * 0.4, nat * 1.5);
      this.locoPhase = (this.locoPhase + cad * dt) % 1;
      this.locoActif = true; this.locoFoulee = m.foulee; this.clipSpin = false; this.locoCad = cad;
      // bras procéduraux par-dessus : dribble en mouvement (sauf si le dribble en course a le ballon : ses bras
      // sont posés sur le ballon par IK), coup d'épaule, rebond — la réception et la passe ont leur couche de clip
      // (pas pendant une couche du haut du corps : la passe rend le ballon au vieux chemin, et le bras de dribble
      // procédural recouvrait alors le geste qu'on venait de lancer)
      this.armsOverride = !haut && ((st === 'idle' && this.hasBall && !this.airborne && this.spinT <= 0 && !this.dribble.controle)
        || this.catchT > 0 || this.passT > 0 || this.rebondT > 0 || this.bumpT > 0 || this.postT > 0);
      A.appliquerLoco(this.locoPhase, dt);
      this.animKey = 'loco';
      this._poserReprises(dt, st, false);
      return true;
    }
    this.locoActif = false;
    const name = this._resolve(want);
    if (!name) { this._versProcedural(); return false; }
    const d = A.defs[name];
    // bras procéduraux par-dessus le clip : dribble en mouvement, et clips génériques de saut utilisés pour tirer
    // les gestes sans clip dédié (réception, passe) pilotent les bras par-dessus l'animation en cours
    // Les bras procéduraux ne doivent recouvrir un clip que s'il ne fait PAS déjà le geste. Depuis qu'il
    // existe un vrai clip de passe, de réception et de poussée, les imposer par-dessus revenait à jouer la
    // mocap des jambes et la vieille pose des bras : on ne voyait plus du tout la nouvelle animation.
    const faitLeGeste = name === 'catch' || name.startsWith('pass') || name.startsWith('post');
    this.armsOverride = (!haut && st === 'idle' && this.hasBall && (moving || this.crossT >= 0) && !this.airborne && this.spinT <= 0 && name !== this.moveClip && !d.hand && !this.dribble.controle)
      || d.arms === 'procedural'
      || (!faitLeGeste && !haut && (this.catchT > 0 || this.passT > 0 || this.rebondT > 0 || this.bumpT > 0 || this.postT > 0));
    this.clipSpin = name === 'spin' || name === 'spin_m';                  // le clip fait la rotation, pas le jeu
    if (d.speedRef && moving) speed = clamp(this.speedNow / d.speedRef, 0.6, 1.6);
    if (d.fit && d.duration) speed = d.duration / d.fit;                   // clip calé sur la durée du geste (spin 0,5 s)
    if (name === 'spin' && !d.duration) speed = 2.4;
    if (d.rate) speed *= d.rate;                                          // clip joué plus lentement (cadence du ballon)
    if (gesteNom === want) speed = GC.vit;                                 // geste calé sur sa minuterie
    // SAUTS CALÉS SUR LE SAUT PHYSIQUE. Layup, dunk, contre : la montée du clip (de l'impulsion `set` à son
    // apogée) est jouée pendant la montée RÉELLE du joueur, pour que les deux sommets tombent ensemble. Seuls les
    // dunks DeepMotion l'étaient ; le layup générique (Running Jump) jouait à vitesse 1 et lâchait la balle à
    // 0,33 s quand le saut culminait à 0,41 s, le contre culminait au hasard.
    const dmApex = d.apex !== undefined ? d.apex : d.release;
    const saute = (st === 'dunk' || st === 'layup') && d.set !== undefined && dmApex !== undefined;
    // ON NE COMMENCE PLUS A L'ARMEE. Le clip demarrait pile a `set`, c'est-a-dire ballon deja ramene, corps
    // deja gaine : il restait 0,35 s de mocap a montrer, et on entrait dedans en pleine course d'elan. Vu de
    // l'exterieur, le joueur se tele-portait au milieu du geste, puis lachait la balle — d'ou un layup qui ne
    // ressemblait a rien. `prep` recule le depart dans le clip pour rendre la montee du genou et la prise
    // d'appui, qui sont justement ce qui fait lire un layup.
    const dmDebut = saute ? Math.max(0, d.set - (d.prep || 0)) : 0;
    // Et le plancher etait pose au mauvais endroit : Math.max(0.6, dmApex - d.set) allongeait artificiellement
    // la portion de clip au lieu de borner la cadence. Pour le layup, 0,35 s devenait 0,6 s, le clip partait
    // donc 1,76x trop vite et le ballon quittait la main AVANT la pose de lacher. On borne la cadence, elle.
    if (saute) speed = clamp((dmApex - dmDebut) / Math.max(0.2, this.dunkRise), 0.6, 2.8);
    const sautLibre = this.airborne && st === 'idle' && once && d.apex !== undefined;
    // clé d'état : un clip "once" est relancé à chaque nouvelle entrée dans l'état (sauf armé -> tir)
    const ponctuel = name === 'catch' || name.startsWith('pass') || name.startsWith('post');
    const key = once ? `${name}:${st === 'shoot' ? 'windup' : st}${sautLibre ? ':' + (this.sautId || 0) : ''}${this.crossT >= 0 ? ':' + this.moveId : ''}${ponctuel ? ':' + this.gesteId : ''}` : name;
    if (key !== this.animKey) {
      // contre / rebond : l'apogée du clip sur celle du saut, d'après la vitesse verticale au départ du clip
      if (sautLibre) speed = this.jumpVel > 0.3 ? clamp(d.apex / (this.jumpVel / G), 0.6, 1.8) : 1;
      A.play(name, { restart: once, speed, fade: this._fondu(A.currentName, name, once) }); this.animKey = key; if (saute) A.current.time = dmDebut;
      this._vitClip = speed;
      // le geste repris en cours de route (on vient de s'arrêter au milieu d'une passe) : au même instant du clip
      if (gesteNom === want && !gesteNeuf && A.current) A.current.time = Math.min(GC.t, d.duration || GC.t);
      // en s'arrêtant, le dribble sur place démarre main en HAUT au moment où le dribble de course reprend la balle
      if (d.sched && this.hasBall && this.dribble.mode === 'arret' && A.current) A.current.time = this.dribble.tempsClip(d, speed);
    }
    else A.setSpeed(sautLibre ? this._vitClip : speed);
    // armé du tir : on avance jusqu'au point d'armé (accroupi) puis on fige tant que la jauge se remplit
    if (name.startsWith('jumpshot') && d.set !== undefined) {
      if (st === 'windup') A.setSpeed(A.time >= d.set ? 0 : GATHER_SPEED);
      // De l'armé au lâcher, le clip est calé sur le saut PHYSIQUE (c'est lui qui soulève l'avatar) : joué
      // à vitesse normale, le lâcher du clip tombait 0,2 à 0,6 s après le sommet — balle lâchée en
      // redescendant, voire une fois retombé. Ensuite (accompagnement, réception), vitesse normale.
      else if (d.release !== undefined && A.time < d.release && this.tirVitesse > 0) A.setSpeed(this.tirVitesse);
      else if (A.time < d.set) A.setSpeed(GATHER_SPEED);
      else A.setSpeed(1);
    }
    // APPUI TENU (adosser) : le clip de poussée durait 0,46 s puis restait figé sur sa dernière image tant que
    // la touche était tenue — un pivot en statue qui dérivait vers le cercle. On va et vient sur la fin du geste
    // (on pousse, on relâche un peu, on repousse), au rythme d'une poussée par seconde environ.
    if (this.postT > 0 && (name === 'post' || name === 'post_m') && A.current) {
      const a = A.current, dur = d.duration || a.getClip().duration;
      if (this._postCle !== key) { this._postCle = key; this._postRetour = false; this._postVa = false; }
      if (!this._postRetour && a.time >= dur - 0.02) { this._postRetour = true; this._postVa = true; }
      else if (this._postRetour && a.time <= dur * 0.6) this._postRetour = false;
      a.paused = false; a.timeScale = this._postRetour ? -0.45 * speed : this._postVa ? 0.45 * speed : speed;
    }
    A.update(dt);
    if (gesteNom === want && A.current) GC.t = A.current.time;           // l'horloge du geste suit le clip entier
    this._poserReprises(dt, st, st === 'dunk' || st === 'layup' || this.crossT >= 0);
    return true;
  }

  // TOUT CE QUI SE POSE PAR-DESSUS LE MÉLANGEUR, dans l'ordre : hauteur des hanches (saut), couche du haut du
  // corps, bras procéduraux. surDebut d'abord : c'est la pose du mélangeur qu'on retient (voir AvatarRig).
  _poserReprises(dt, st, tronc) {
    const A = this.anim, R = this.avatar;
    R.surDebut();
    this._ajusterHanches(dt, st);
    A.appliquerHaut(dt);
    // BRAS PROCÉDURAUX EN FONDU (06/10/2026). `armsOverride` était un interrupteur : le bras passait de la pose du
    // clip à celle du jeu d'une image à l'autre (une passe, une réception, un rebond pris en courant), et
    // revenait de même. Un poids glisse maintenant de 0 à 1 en 0,12 s, os par os, de la pose du clip vers la pose
    // procédurale — et le buste de même quand le geste le prend (dunk, layup, crossover).
    const tel = this.telActif();
    const veutBras = tel || this.armsOverride, veutTronc = tel || (this.armsOverride && tronc);
    const pas = dt / 0.12;
    this.kBras = clamp((this.kBras || 0) + (veutBras ? pas : -pas), 0, 1);
    this.kTronc = clamp((this.kTronc || 0) + (veutTronc ? pas : -pas), 0, 1);
    if (this.kBras > 0.001 || this.kTronc > 0.001) R.applyArms(this.cur, lisse(this.kTronc), lisse(this.kBras));   // (téléphone : bras et tête)
  }

  // HAUTEUR DES HANCHES EN L'AIR (06/10/2026). Le saut soulève l'avatar par l'os des hanches. Avant, sa hauteur
  // était ÉCRASÉE par « repos + saut » : à l'impulsion, les hanches passaient d'un coup de la flexion du clip
  // (accroupi, 15 cm plus bas) à la station debout, et à la fin de la réception elles retombaient d'un coup sur
  // celles du clip. Maintenant on GARDE la hauteur du clip tant qu'elle est sous la station debout — la flexion
  // de l'impulsion, l'extension, l'amorti — et on n'écrête que ce qu'elle a au-dessus (le saut du clip lui-même,
  // que la physique remplace), avec un poids qui entre en 0,05 s et sort en 0,12 s après la réception.
  _ajusterHanches(dt, st) {
    const e = this.avatar.entries.Hips; if (!e) return;
    const air = st === 'dunk' || st === 'layup' || this.airborne || this.landT > 0;
    this.kAir = clamp((this.kAir || 0) + (air ? dt / 0.05 : -dt / 0.12), 0, 1);
    if (!(this.kAir > 0) && !air) return;
    const flechi = this.landT > 0 ? -0.10 * (this.landT / 0.22) : 0;     // amorti à la réception
    const y = e.bone.position.y, plaf = e.restPos.y;
    e.bone.position.y = (y > plaf ? y - (y - plaf) * this.kAir : y) + (this.jumpY + flechi) / this.avatarScale;
  }

  // main qui tient la balle : les clips "Dribble" / "Dribble Left" imposent la main
  ballHand() {
    const d = this.anim && this.animKey ? this.anim.defs[this.animKey] : null;
    if (d && d.ballTrack) return this.trackHand(d) || this.dribbleHand;       // ballon animé dans le clip : main qui le tient (ou qui va le reprendre)
    if (d && d.hand === 'RL') return this.schedHand(d) || this.dribbleHand;   // dribble alterné : main donnée par le calendrier du clip
    if (d && d.hand) return d.hand;
    if (this.anim && this.animKey === 'idle_ball') return 'R';
    if (this.anim && this.animKey === 'idle_ball_l') return 'L';
    return this.dribbleHand;
  }

  // piste du ballon (clip converti avec son ballon) : main qui le tient à l'instant du clip, sinon la prochaine main qui le reprend
  trackHand(d) {
    const A = this.anim, T = d && d.ballTrack; if (!A || !A.current || !T || !T.hold.length) return null;
    const n = T.hold.length, dur = A.current.getClip().duration, x = Math.floor(A.current.time / dur * n);
    for (let s = 0; s < n; s++) { const h = T.hold[(x + s) % n]; if (h) return h; }
    return null;
  }

  // clip à deux mains (hand 'RL') : main qui tient la balle (segment max -> min de cette main) ou qui va la reprendre (min -> max)
  schedHand(d) {
    const A = this.anim, S = d && d.sched; if (!A || !A.current || !S || !S.ext.length) return null;
    const t = A.current.time, ext = S.ext;
    let k = 0; while (k < ext.length && ext[k].t <= t) k++;
    let prev = ext[k - 1], next = ext[k];
    if (S.cyclic) { if (!prev) prev = ext[ext.length - 1]; if (!next) next = ext[0]; }
    if (prev && prev.type === 'max') return prev.hand;   // balle sous la paume de cette main
    if (next && next.type === 'max') return next.hand;   // en vol vers cette main
    return (prev || next).hand;
  }

  // ---------- gestes ponctuels ----------
  // Geste du passeur. Deux mocaps au choix — la poussée à une main (CMU 141_10) et l'envoi par-dessus
  // l'épaule (143_20) — plus leur miroir : on tire au sort pour ne pas voir dix fois le même bras, et on
  // prend la version gauchère quand c'est la main gauche qui tient la balle.
  // (06/10/2026) La main se lit dans la fiche du clip (`hand`), plus dans son nom : `pass_2` (143_20) est un envoi
  // de la main GAUCHE, et le suffixe `_m` le donnait aux droitiers — la balle partait de la main droite pendant
  // que le bras gauche faisait le geste.
  armerPasse(duree = 0.42) {
    this.passT = duree; this.gesteId++;
    const A = this.anim;
    if (!A) { this.passClip = null; return; }
    const main = this.dribbleHand === 'L' ? 'L' : 'R';
    const tous = ['pass', 'pass_m', 'pass_2', 'pass_2_m'].filter((n) => A.has(n));
    const bons = tous.filter((n) => (A.defs[n].hand || (n.endsWith('_m') ? 'L' : 'R')) === main);
    const cands = bons.length ? bons : tous;
    this.passClip = cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
  }
  // Délai entre l'ordre de passe et le lâcher : l'instant où la main lance, dans le clip tiré (`release`, en
  // secondes du clip), ramené à la durée du geste. 0 sans clip (bonhomme en primitives) : départ immédiat.
  delaiPasse() {
    const A = this.anim, d = A && this.passClip ? A.defs[this.passClip] : null;
    this.passeArmee = null;
    if (!d || d.release === undefined || !d.duration || !(this.passT > 0)) return 0;
    this.passeArmee = d.hand || 'R';
    return clamp(d.release / (d.duration / this.passT), 0.06, 0.22);
  }
  // Réception à deux mains.
  recevoir(duree = 0.38) { this.catchT = duree; this.gesteId++; }

  // ---------- téléphone (chat) ----------
  // Ouvrir le chat, c'est SORTIR SON TÉLÉPHONE : le joueur le tire de sa poche, baisse la tête et le
  // regarde. Écrire, c'est TAPER dessus, les deux pouces qui s'agitent. `k` monte de 0 à 1 en une demi-
  // seconde (le geste de le sortir) et redescend pour le ranger ; `tape` est le temps de frappe restant,
  // relancé à chaque touche.
  sortirTel() { if (this.velo) return; if (!this.tel) this.tel = { k: 0, t: 0, tape: 0, sortir: false }; this.tel.sortir = false; }
  rangerTel() { if (this.tel) this.tel.sortir = true; }
  taperTel(duree = 0.7) { this.sortirTel(); if (this.tel) this.tel.tape = Math.max(this.tel.tape, duree); }
  // Le téléphone ne se montre qu'au repos : un tir, un saut, une chute ou une emote passent devant.
  telActif() { return !!this.tel && this.state === 'idle' && !this.airborne && !(this.chuteT > 0) && !this.emote && !this.velo; }

  // La pose : le bras droit ramène le téléphone devant la poitrine, la tête se penche dessus. Sans ballon,
  // la main gauche vient tenir l'appareil avec la droite ; ballon en main, elle le cale contre la hanche.
  _poseTel(P) {
    const T = this.tel;
    if (!T || !this.telActif()) return;
    const k = T.k * T.k * (3 - 2 * T.k), f = T.t;
    const mx = (cle, v) => { P[cle] = P[cle] + (v - P[cle]) * k; };
    const tape = T.tape > 0 ? 1 : 0;
    // frappe : les deux mains tressautent en alternance, vite ; lecture : on fait défiler du pouce, lentement
    const fr = tape ? Math.sin(f * 21) : 0, lent = Math.sin(f * 1.4);
    // aRy / aLy : rotation du bras sur son axe, vers l'intérieur. C'est elle qui ramène les avant-bras l'un
    // vers l'autre devant la poitrine ; sans elle les mains restaient écartées de la largeur des épaules.
    mx('aR', this.hasBall ? -0.36 : -0.48); mx('aRz', 0.20); mx('aRy', this.hasBall ? 0.35 : 0.52); mx('eR', -1.52 + 0.06 * fr); mx('hR', -0.30 + 0.14 * fr + 0.04 * lent);
    if (this.hasBall) { mx('aL', 0.10); mx('aLz', 0.34); mx('eL', -0.62); mx('hL', -0.05); }
    else if (!this.avatar) { mx('aL', -0.46); mx('aLz', -0.22); mx('aLy', -0.52); mx('eL', -1.48 - 0.06 * fr); mx('hL', -0.30 - 0.14 * fr); }
    mx('headX', 0.80 + 0.04 * lent + 0.04 * tape); mx('torsoX', 0.14); mx('torsoY', 0.04 * lent);
  }

  // LE TÉLÉPHONE TENU POUR DE VRAI. Première version : le téléphone était posé près de la main et
  // tourné vers la tête, et la main faisait ce qu'elle voulait autour — il flottait. Maintenant c'est
  // l'inverse : on décide d'abord où est le téléphone (devant la poitrine, écran tourné vers les yeux), puis
  // on AMÈNE la main dessus par cinématique inverse (épaule, coude, poignet), paume contre le dos de
  // l'appareil, doigts repliés autour du bord, pouce sur l'écran. Pour taper, la main gauche vient saisir
  // l'autre bord et les deux pouces tapotent le clavier.
  // Pendant la sortie et le rangement, le téléphone suit la main réelle : il sort de la poche avec elle.
  _placerTel() {
    const T = this.tel, actif = !!T && this.telActif() && this.mesh.visible;
    if (!this.telMesh) { if (!actif) return; this.telMesh = modeleTel(); this.scene.add(this.telMesh); }
    const m = this.telMesh;
    if (!actif || T.k < 0.08) { m.visible = false; return; }
    m.visible = true;
    const A = this.avatar;
    if (!A || !A.aMains('Right')) { this._placerTelSimple(T, m); return; }
    const k = T.k * T.k * (3 - 2 * T.k), deux = T.deux || 0, e2 = deux * deux * (3 - 2 * deux);
    // ---- 1) où le veut-on : repère du corps, tête, yeux ----
    this.mesh.getWorldDirection(_tF);                       // devant
    _tL.crossVectors(_tU, _tF).normalize();                 // sa gauche
    A.bone('Head').getWorldPosition(_tH);
    const hs = this.h / 1.8;                                // les distances suivent la taille du joueur
    _tC.copy(_tH).addScaledVector(_tF, 0.27 * hs).addScaledVector(_tU, -0.31 * hs).addScaledVector(_tL, -0.045 * (1 - e2) * hs);
    _tP.copy(_tH).addScaledVector(_tU, 0.07 * hs).addScaledVector(_tF, 0.09 * hs);          // les yeux
    _tZ.subVectors(_tP, _tC).normalize();                   // l'écran regarde les yeux
    _tY.copy(_tF).addScaledVector(_tZ, -_tF.dot(_tZ)).normalize();   // le haut du téléphone s'éloigne
    _tX.crossVectors(_tY, _tZ);                              // sa droite, vue de l'écran
    // ---- 2) la main droite dessus : paume contre le dos de l'appareil ----
    // Deux prises, et on glisse de l'une à l'autre : À UNE MAIN, le poignet est sur le bord droit et les
    // doigts passent en travers du dos pour s'enrouler sur le bord gauche ; À DEUX MAINS (pour taper),
    // chaque main tient son côté, doigts à plat dans le dos, vers le haut — ils ne se croisent plus.
    // `ox, oy, oz` = le poignet dans le repère du téléphone ; `th` = angle des doigts (0 = vers la gauche).
    const ox = 0.070 + (0.034 - 0.070) * e2, oy = -0.028 + (-0.085 + 0.028) * e2, oz = -0.0175;
    const th = 0.245 + (1.32 - 0.245) * e2;
    _tW.copy(_tC).addScaledVector(_tX, ox).addScaledVector(_tY, oy).addScaledVector(_tZ, oz);
    _tf.copy(_tX).multiplyScalar(-Math.cos(th)).addScaledVector(_tY, Math.sin(th)).normalize();
    _tQ.copy(_tC).addScaledVector(_tU, -0.45).addScaledVector(_tL, -0.30).addScaledVector(_tF, -0.12);   // coude en bas, dehors
    A.ikBras('Right', _tW, _tf, _tZ, _tQ, k);
    const plie = [0.30 - 0.28 * e2, 1.25 - 1.20 * e2, 0.55 - 0.50 * e2];   // à deux mains : doigts à plat dans le dos
    A.plierDoigts('Right', plie, k);
    // ---- 3) le téléphone suit la main RÉELLE : collé à la paume, même pendant la sortie de poche ----
    // (on refait le chemin à l'envers : de la main, on retrouve le repère du téléphone)
    A.repereMain('Right', _tW, _tf, _tn);
    _tZ.copy(_tn);
    _tX.copy(_tf).applyAxisAngle(_tZ, -(Math.PI - th)).addScaledVector(_tZ, 0);
    _tX.addScaledVector(_tZ, -_tX.dot(_tZ)).normalize();
    _tY.crossVectors(_tZ, _tX);
    _tC.copy(_tW).addScaledVector(_tX, -ox).addScaledVector(_tY, -oy).addScaledVector(_tZ, -oz);
    _tM.makeBasis(_tX, _tY, _tZ); m.quaternion.setFromRotationMatrix(_tM); m.position.copy(_tC);
    m.scale.setScalar(1);
    // ---- 4) pouces : ils visent l'écran ; en frappe, ils sautent d'une touche à l'autre ----
    const tape = T.tape > 0, f = T.t;
    const ecran = m.userData.ecran; ecran.material = m.userData.mats[tape ? 1 : 0];
    const saut = (ph) => Math.floor(f * 7 + ph) * 12.9898;   // une touche différente tous les septièmes de seconde
    const rx = (ph) => (Math.sin(saut(ph)) * 43758.5453) % 1;
    if (tape) _v.copy(_tC).addScaledVector(_tX, 0.004 + 0.022 * Math.abs(rx(0))).addScaledVector(_tY, -0.030 - 0.020 * Math.abs(rx(0.5)));
    else _v.copy(_tC).addScaledVector(_tX, 0.012).addScaledVector(_tY, -0.012 + 0.018 * Math.sin(f * 1.4));   // il fait défiler
    _v.addScaledVector(_tZ, 0.010 + (tape ? 0.006 * Math.max(0, Math.sin(f * 44)) : 0));
    A.viserPoint('RightHandThumb1', 'RightHandThumb2', _v, k * 0.9);
    A.viserPoint('RightHandThumb2', 'RightHandThumb3', _v, k * 0.9);
    // ---- 5) main gauche : elle tient le ballon, ou elle vient tenir l'autre bord pour taper ----
    if (this.hasBall) this._tenirBalleHanche(A, k);
    else if (e2 > 0.01 && A.aMains('Left')) {
      _tW.copy(_tC).addScaledVector(_tX, -0.034).addScaledVector(_tY, -0.085).addScaledVector(_tZ, -0.0175);
      _tf.copy(_tX).multiplyScalar(Math.cos(1.32)).addScaledVector(_tY, Math.sin(1.32)).normalize();
      _tQ.copy(_tC).addScaledVector(_tU, -0.45).addScaledVector(_tL, 0.30).addScaledVector(_tF, -0.12);
      A.ikBras('Left', _tW, _tf, _tZ, _tQ, e2 * k);
      A.plierDoigts('Left', [0.02, 0.05, 0.05], e2 * k);
      _v.copy(_tC).addScaledVector(_tX, -0.004 - 0.022 * Math.abs(rx(0.25))).addScaledVector(_tY, -0.030 - 0.020 * Math.abs(rx(0.75)));
      _v.addScaledVector(_tZ, 0.010 + 0.006 * Math.max(0, Math.sin(f * 44 + Math.PI)));
      A.viserPoint('LeftHandThumb1', 'LeftHandThumb2', _v, e2 * k * 0.9);
      A.viserPoint('LeftHandThumb2', 'LeftHandThumb3', _v, e2 * k * 0.9);
    }
  }
  // Ballon sous le bras pendant qu'on regarde son téléphone : la main gauche le tient VRAIMENT, paume
  // contre le cuir, doigts écartés vers le bas (même point que Game.balleEnMain).
  _tenirBalleHanche(A, k) {
    if (!A.aMains('Left')) return;
    this.mesh.localToWorld(_tP.set(0.21, 0.93, 0.06));                          // centre du ballon
    this.mesh.getWorldDirection(_tF); _tL.crossVectors(_tU, _tF).normalize();
    _tW.copy(_tP).addScaledVector(_tL, 0.135).addScaledVector(_tU, 0.075).addScaledVector(_tF, -0.02);
    _tf.copy(_tU).multiplyScalar(-1).addScaledVector(_tF, 0.35).addScaledVector(_tL, -0.25).normalize();
    _tn.copy(_tL).negate();                                                      // paume tournée vers le ballon
    _tQ.copy(_tW).addScaledVector(_tL, 0.35).addScaledVector(_tF, -0.25).addScaledVector(_tU, 0.2);
    A.ikBras('Left', _tW, _tf, _tn, _tQ, k);
    A.plierDoigts('Left', [0.35, 0.45, 0.30], k);
  }

  // Bonhomme en primitives (pas d'os de doigts) : le téléphone est simplement dans la main, tourné vers la tête.
  _placerTelSimple(T, m) {
    this.handWorld('R', _v);
    _w.set(this.posAff.x, this.h * 0.93 + this.jumpY + this.solAff, this.posAff.z);
    m.position.copy(_v); m.lookAt(_w); m.rotateX(-0.25);
    m.scale.setScalar(Math.min(1, T.k * 1.5));
  }

  // ---------- état d'animation transmissible (jeu en ligne) ----------
  // POURQUOI LES JOUEURS EN LIGNE N'ETAIENT PAS SYNCHRONISES. On ne transmettait que la position, le cap,
  // l'état et la vitesse. Or `_driveAnim` choisit son clip sur une vingtaine d'autres champs : minuteries
  // des gestes (passe, réception, crossover, spin, feinte, coup d'épaule...), main du dribble, variante
  // tirée au sort, emote, chute, banc. Chez les autres, tous ces champs restaient à zéro : un crossover
  // devenait une course, une danse un joueur planté, et chaque tir tirait sa PROPRE variante au hasard.
  // On transmet donc exactement ce que lit `_driveAnim`, en ne gardant que ce qui n'est pas à sa valeur de
  // repos (un joueur qui marche envoie trois champs, pas quarante). Les minuteries sont envoyées telles
  // quelles et continuent de s'écouler chez le récepteur entre deux paquets.
  etatAnim() {
    const e = {}, r2 = (v) => Math.round(v * 100) / 100;
    const t = (k, v) => { if (v > 0.005) e[k] = r2(v); };
    if (this.shotVariant) e.sv = this.shotVariant;
    if (this.layupClip) e.lc = this.layupClip;
    if (this.dunkClip) e.dc = this.dunkClip;
    if (this.state === 'celebrate') e.cv = this.celebVariant;
    if (this.emote) e.em = this.emote.id;
    t('sw', this.swipeT); t('rb', this.rebondT); t('ta', this.tauntT); t('pu', this.pickupT); t('ca', this.catchT);
    t('pa', this.passT); t('po', this.postT); t('bu', this.bumpT); t('fk', this.fakeT); t('sn', this.spinT);
    t('dm', this.dribbleMoveT); t('lt', this.landT);
    if (this.passT > 0 && this.passClip) e.pc = this.passClip;
    // la passe ARMÉE (delaiPasse) : la main qui lance, tant que la balle n'est pas partie — chez les autres, sans elle, la
    // balle restait dans la main du dribble pendant le geste puis sautait au point du lâcher (Game._deuxMains)
    if (this.passT > 0 && this.passeArmee) e.pr = this.passeArmee;
    if (this.postSens < 0) e.ps = -1;
    if (this.bumpSide < 0) e.bs = -1;
    if (this.crossT >= 0) { e.cr = r2(this.crossT); e.md = r2(this.moveDur || 0.26); if (this.moveClip) e.mc = this.moveClip; e.mt = this.moveType; }
    if (this.moveId) { e.mi = this.moveId; if (this.moveType) e.mt = this.moveType; }
    if (this.spinT > 0) e.si = this.spinId;              // chaque spin repart de zéro chez les autres
    if (this.gesteId) e.gi = this.gesteId;
    if (this.dribbleHand === 'L') e.dh = 'L';
    if (this.hasBall && this.dribbleVariant) e.dv = this.dribbleVariant;
    if (this.defending) e.de = 1;
    t('bk', this.backward); t('la', this.lateral);
    if (this.lateralDir < 0) e.ld = -1;
    t('sp2', this.sprintVu);
    if (this.chuteT > 0) { e.ch = r2(this.chuteT); e.ct = r2(this.chuteTot); e.cp = this.chutePh; }
    if (this.state === 'dunk' || this.state === 'layup') { e.dr = r2(this.dunkRise); if (this.dunkStyle !== 'one') e.ds = this.dunkStyle; if (this.mainFinale === 'L') e.mf = 'L'; }
    if (this.assis) e.as = [r2(this.assis.bob), this.assis.sortir ? 1 : 0, this.assis.rang || 0];
    if (this.tel && !this.tel.sortir) e.tl = this.tel.tape > 0 ? 1 : 0;
    if (this.couches.veutSouffler) e.sf = 1;             // essoufflé, mains sur les genoux
    // à vélo : braquage, pédalier, inclinaison, vitesse, selle, arrêt, effort, danseuse, descente
    // puis la position et le cap du VÉLO lui-même : pendant qu'on monte ou qu'on descend, le cycliste n'est
    // pas sur la selle, et un vélo recopié sur ses pieds glissait d'un mètre sous les yeux des autres
    if (this.velo) {
      const b = this.velo.v, r2 = (x) => Math.round(x * 100) / 100;
      e.vl = [...b.etatReseau(), this.velo.sortir ? 1 : 0, r2(b.pos.x), r2(b.pos.z), r2(b.cap)];
      // (lot C4) un autre engin que le vélo : son genre et sa peinture (les anciens clients l'ignorent et voient un vélo)
      if (b.genre && b.genre !== 'velo') { e.vt = b.genre; e.vc = [b.couleur, b.dessin || 0]; }
    }
    if (this.rollers && this.hRol > 0) e.ro = this.rollers.couleur;      // (lot C4) chaussé de rollers
    return e;
  }

  // Le récepteur adopte l'état tel quel. Ce qui n'est pas dans le paquet revient à sa valeur de repos.
  //
  // SAUF LES MINUTERIES DES GESTES (06/10/2026). Elles étaient recopiées à chaque paquet : un paquet un peu en retard
  // sur le précédent les faisait REPARTIR en arrière de 30 ou 40 ms, un paquet en avance les faisait sauter — et le
  // clip suivait, par à-coups, vingt fois par seconde. Elles s'écoulent déjà toutes seules chez le récepteur
  // (Player.update) : on ne les reprend que quand le geste COMMENCE (rien en cours ici, ou un nouveau numéro de geste),
  // ou quand l'écart dépasse TOL_ANIM (un geste relancé, un paquet perdu). Un geste fini chez l'émetteur finit ici
  // aussi, au plus TOL_ANIM plus tard.
  // `propre` : le joueur de l'invité lui-même, dont la course est prédite sur place (js/enligne.js) — son allure
  // (recul, pas chassés, sprint) est celle qu'il court ICI, pas celle d'il y a un aller-retour.
  appliquerAnim(e, emotes = null, propre = false) {
    if (!e) return;
    this._paquets = (this._paquets || 0) + 1;
    this.shotVariant = e.sv || this.shotVariant;
    this.layupClip = e.lc || null; this.dunkClip = e.dc || null;
    if (e.cv) this.celebVariant = e.cv;
    // emote : on la relance seulement quand elle CHANGE, sinon son horloge repartirait a chaque paquet
    const em = e.em || null;
    if ((this.emote && this.emote.id) !== em) {
      const def = em && emotes ? emotes.find((x) => x.id === em) : null;
      this.emote = def ? { ...def, t: 0 } : null; this.animKey = null;
    }
    const tol = TOL_ANIM, mt = (ici, recu) => (recu > 0 ? (ici <= 0 || Math.abs(recu - ici) > tol ? recu : ici) : (ici > tol ? 0 : ici));
    this.swipeT = mt(this.swipeT, e.sw || 0); this.rebondT = mt(this.rebondT, e.rb || 0); this.tauntT = mt(this.tauntT, e.ta || 0);
    this.pickupT = mt(this.pickupT, e.pu || 0); this.catchT = mt(this.catchT, e.ca || 0); this.passT = mt(this.passT, e.pa || 0);
    this.postT = mt(this.postT, e.po || 0); this.bumpT = mt(this.bumpT, e.bu || 0); this.fakeT = mt(this.fakeT, e.fk || 0);
    this.dribbleMoveT = mt(this.dribbleMoveT, e.dm || 0); this.landT = mt(this.landT, e.lt || 0);
    // le spin : relancé à chaque NOUVEAU spin (son numéro), sinon il garde son horloge
    this.spinT = e.si && e.si !== this.spinId && (e.sn || 0) > 0 ? e.sn : mt(this.spinT, e.sn || 0);
    if (e.pc) this.passClip = e.pc;
    this.passeArmee = e.pr === 'L' || e.pr === 'R' ? e.pr : null;     // (pas une minuterie : l'état tel quel)
    this.postSens = e.ps || 1; this.bumpSide = e.bs || 1;
    if (e.cr !== undefined) {
      // le geste de dribble en cours : repris s'il est nouveau (numéro de geste) ou trop décalé, sinon il continue
      const nouveau = (e.mi || 0) !== this.moveId || this.crossT < 0 || Math.abs(e.cr - this.crossT) * (e.md || 0.26) > tol;
      if (nouveau) this.crossT = e.cr;
      this.moveDur = e.md || 0.26; this.moveClip = e.mc || null; this.moveType = e.mt || 'cross';
    } else if (this.crossT >= 0 && (1 - this.crossT) * (this.moveDur || 0.26) > tol) { this.crossT = -1; this.moveClip = null; }
    if (e.cr === undefined && e.mt) this.moveType = e.mt;
    if (e.si) this.spinId = e.si;
    this.moveId = e.mi || 0; this.gesteId = e.gi || 0;
    this.dribbleHand = e.dh || 'R';
    if (e.dv) this.dribbleVariant = e.dv;
    this.defending = !!e.de;
    if (!propre) {
      this.backward = e.bk || 0; this.lateral = e.la || 0; this.lateralDir = e.ld || 1;
      this.sprintVu = e.sp2 || 0;
    }
    if (e.ch) {
      const nouvelle = !(this.chuteT > 0) || Math.abs(e.ch - this.chuteT) > tol;
      if (nouvelle) { this.chuteT = e.ch; this.chuteTot = e.ct || e.ch; this.chutePh = e.cp || 'chute'; }
    } else if (this.chuteT > tol) this.chuteT = 0;
    if (e.dr) this.dunkRise = e.dr;
    this.dunkStyle = e.ds || 'one'; this.mainFinale = e.mf || 'R';
    // Banc : l'assise se joue sur place (la courbe de 0,5 s tourne chez le récepteur), seule la position
    // vient du réseau.
    if (e.as) {
      if (!this.assis) { this.assis = { de: { x: this.pos.x, z: this.pos.z }, a: { x: this.pos.x, z: this.pos.z }, bob: e.as[0], k: 0, sortir: false, rang: e.as[2] || 0 }; if (this.anim) this.anim.stop(0.12); }
      this.assis.bob = e.as[0]; this.assis.rang = e.as[2] || 0; this.assis.sortir = !!e.as[1];
    } else if (this.assis) this.assis.sortir = true;
    this.souffleDistant = !!e.sf;
    // Vélo : chez les autres, chaque cycliste a SON vélo (le vélo du terrain est masqué tant qu'il roule,
    // voir Game.updateVelos). Il apparaît à la première trace de `vl` et repart quand le paquet n'en a plus.
    // (lot C4) les rollers des autres : chaussés tant que le paquet le dit (en balade, voir update)
    this.rollers = e.ro !== undefined ? { couleur: e.ro } : null;
    if (e.vl) {
      if (!this.velo) {
        // un vélo de la réserve (le construire ici figeait l'image de tout le monde, voir Velo.emprunter) — ou une
        // trottinette, un skate (lot C4 : `vt`), de la réserve de son genre, à sa peinture (`vc`)
        const C = GENRES[e.vt] || Velo;
        if (this.veloDistant && !(this.veloDistant instanceof C)) this.retirerVelo();
        if (!this.veloDistant) this.veloDistant = C.emprunter(this.scene);
        if (e.vc && this.veloDistant.peindre) this.veloDistant.peindre(e.vc[0], e.vc[1]);
        this.veloDistant.racine.visible = this.mesh.visible;
        if (e.vl[9] !== undefined) { this.veloDistant.pos.set(e.vl[9], 0, e.vl[10]); this.veloDistant.cap = e.vl[11]; }
        else { this.veloDistant.pos.copy(this.pos); this.veloDistant.cap = Math.atan2(this.facing.x, this.facing.z); }
        this.veloDistant.memoriser(); this.veloDistant.prendre();
        // déjà en selle quand on le découvre (premier paquet reçu, ou vélo qui roule) : pas de montée à jouer
        const dejaEnSelle = this._paquets <= 1 || Math.abs(e.vl[3] || 0) > 0.3;
        this.velo = { v: this.veloDistant, k: dejaEnSelle ? 1 : 0, sortir: false, deb: { x: this.pos.x, z: this.pos.z }, fin: null, buste: 0.45, bras: 0, jambe: 0, vl: null };
        if (this.anim) this.anim.stop(0.12);
        this.stopEmote();
      }
      this.velo.vl = e.vl; this.velo.sortir = !!e.vl[8];
      if (!this.velo.bras) this._mesurerCycliste();
    } else if (this.velo) this.velo.sortir = true;
    // Téléphone : la frappe dure tant que l'émetteur dit qu'il tape (il enverra un paquet quand il s'arrête).
    if (e.tl !== undefined) { this.sortirTel(); if (this.tel) this.tel.tape = e.tl ? 30 : 0; } else this.rangerTel();
  }

  // ---------- interpolation de rendu ----------
  // Appele AVANT chaque pas de simulation : la pose affichee d'aujourd'hui devient celle d'hier.
  memoriser() {
    this.posPrec.copy(this.pos); this.angPrec = this.ang; this.yPrec = this.yAff;
    if (this.velo) this.velo.v.memoriser();
  }

  // Appele UNE FOIS par image, apres la boucle de simulation, avec la fraction de pas qui reste a courir.
  //
  // C'est LE defaut de fluidite que Haythem voyait. La simulation tourne a pas fixe — 1/120 s, choisi pour
  // que deux machines jouent exactement la meme partie — mais l'ecran rafraichit a son propre rythme, et les
  // deux ne tombent jamais en phase. Selon l'image, l'accumulateur libere zero, un, deux ou trois pas : le
  // joueur avancait donc de 0, 4,8, 9,7 ou 14,5 centimetres d'une image a l'autre, a vitesse pourtant
  // constante. La camera, elle, est lissee sur le temps REEL : elle glissait regulierement pendant que le
  // joueur sautait de cran en cran. Vu de trois metres, cela fait une douzaine de pixels de tremblement a
  // chaque image, et l'oeil lit ca comme un dedoublement — « je vois le joueur un peu en plusieurs fois ».
  //
  // La reponse standard, et la seule qui garde le pas fixe : on n'affiche pas l'etat de la simulation, on
  // affiche un point ENTRE le cran precedent et le cran courant, au prorata de ce qui reste dans
  // l'accumulateur. Le mouvement redevient continu sans qu'on touche a la physique.
  presenter(a) {
    // Un ecart d'un metre en un cran de 8 millisecondes n'est pas un deplacement, c'est une teleportation
    // (remise en jeu, entree sur le terrain, changement de possession). On ne l'interpole pas.
    if (this.posPrec.distanceToSquared(this.pos) > 1.0) { this.posPrec.copy(this.pos); this.angPrec = this.ang; this.yPrec = this.yAff; }
    // la hauteur affichée = le sol interpolé + la hauteur au-dessus du sol interpolée (+ la marche en rattrapage) ;
    // sur un terrain plat le sol et yLisse valent 0 et la somme est, à l'octet près, l'ancienne `yPrec + ...`
    this.solAff = this.posPrec.y + (this.pos.y - this.posPrec.y) * a;
    this.posAff.set(
      this.posPrec.x + (this.pos.x - this.posPrec.x) * a,
      this.solAff + this.yPrec + (this.yAff - this.yPrec) * a + this.yLisse + this.hRol,    // (+ les roues des rollers, lot C4)
      this.posPrec.z + (this.pos.z - this.posPrec.z) * a);
    let d = this.ang - this.angPrec;
    while (d > Math.PI) d -= Math.PI * 2;              // toujours par le plus court chemin : sans ca, un
    while (d < -Math.PI) d += Math.PI * 2;             // passage par ±pi ferait faire un tour complet
    this.mesh.position.copy(this.posAff);
    // `set` et pas `.y =` : à vélo, le quaternion garde le roulis de l'image d'avant, et ne toucher qu'au
    // lacet le laissait en place une fois descendu — le joueur restait penché.
    this.angAff = this.angPrec + d * a; this._presente = true;
    this.mesh.rotation.set(this.couches.tangage, this.angAff, this.couches.roulis);
    this.mesh.updateMatrixWorld(true);
    if (this.velo) this._placerSurVelo(a);
    if (this.tel || this.telMesh) this._placerTel();
    if (this.eclairage) this.eclairage.maj(this);   // les sphères d'occlusion suivent les os
    this._frais = false;
  }

  // ---------- contact : mise au sol ----------
  // Le joueur est mis par terre. `nx, nz` : la direction dans laquelle il part (celle de la poussée) ;
  // `force` autour de 1 : plus c'est fort, plus il reste longtemps au sol.
  // On ne bloque pas le déplacement ici : `stun` s'en charge déjà (vitesse imposée à zéro, élan qui retombe
  // en 0,45 s), et c'est justement ce qu'on veut voir — il glisse sur un mètre avant de s'immobiliser.
  tomber(nx, nz, force = 1) {
    if (this.dribble) this.dribble.rendre('chute');
    if (this.chuteT > 0 || this.assis) return false;
    const f = clamp(force, 0.6, 1.8);
    this.chuteTot = this.chuteT = 0.80 + (0.45 + 0.30 * f) + 1.25;   // chute + temps au sol + relevé
    this.chutePh = 'chute';
    this.state = 'idle'; this.windup = 0; this.stateT = 0; this.released = false;
    this.emote = null; this.spinT = 0; this.crossT = -1; this.moveClip = null;
    this.postT = 0; this.postCumul = 0; this.bumpT = 0; this.passT = 0; this.catchT = 0; this.rebondT = 0; this.dribbleMoveT = 0;
    this.airborne = false; this.jumpY = 0; this.jumpVel = 0; this.landT = 0;
    this.stun = Math.max(this.stun, this.chuteT);
    this.stamina = Math.max(0, this.stamina - 12 * f);
    this.vel.set(nx * 2.4 * f, 0, nz * 2.4 * f);
    this.animKey = null;
    if (this.anim) this.anim.couperLoco();
    return true;
  }
  get auSol() { return this.chuteT > 0; }

  // ---------- le relief (js/monde.js), jamais appelé sur un terrain plat ni en match ----------
  // Le pas vient d'être fait de (x0, z0) à this.pos, sur le sol de départ this.pos.y :
  //  1) un mur de soutènement, un massif, l'eau ou une marche trop haute l'arrêtent : on garde seulement la partie
  //     du pas qui LONGE la paroi (Monde.franchir donne sa normale), et la vitesse perd sa composante entrante ;
  //  2) les obstacles posés du parc (troncs, grilles, bancs) repoussent le joueur comme ceux d'aujourd'hui ;
  //  3) les pieds se posent sur le nouveau sol. En l'air, on garde l'altitude (jumpY reste compté au-dessus du
  //     sol) ; au bord d'un muret de plus de 5 cm, on tombe (la gravité et la réception existantes font le reste) ;
  //     sur une marche montante, le corps rattrape la hauteur en 0,08 s au lieu de sauter d'un coup (yLisse).
  _surLeRelief(x0, z0) {
    const y0 = this.pos.y, saut = this.airborne ? Math.max(0, this.jumpY) : 0;
    const bloc = Monde.franchir(x0, z0, y0, this.pos.x, this.pos.z, 'pieton', saut);
    if (bloc) {
      const dx = this.pos.x - x0, dz = this.pos.z - z0, dn = Math.min(0, dx * bloc.nx + dz * bloc.nz);
      this.pos.x = x0 + dx - dn * bloc.nx; this.pos.z = z0 + dz - dn * bloc.nz;
      const vn = this.vel.x * bloc.nx + this.vel.z * bloc.nz;
      if (vn < 0) { this.vel.x -= vn * bloc.nx; this.vel.z -= vn * bloc.nz; }
      if (Monde.franchir(x0, z0, y0, this.pos.x, this.pos.z, 'pieton', saut)) {
        // même en longeant, ça ne passe pas (coin rentrant) : on reste sur place, et la vitesse perd aussi ce qui
        // allait dans le sens du pas — sinon le joueur courrait sur place, jambes en mouvement et vitesse affichée
        this.pos.x = x0; this.pos.z = z0;
        const l = Math.hypot(dx, dz);
        if (l > 1e-9) { const ux = dx / l, uz = dz / l, va = this.vel.x * ux + this.vel.z * uz; if (va > 0) { this.vel.x -= va * ux; this.vel.z -= va * uz; } }
      }
    }
    // (relecture R2) LA POUSSÉE DES OBSTACLES ne pose jamais le joueur là où son pas n'aurait pas pu aller. Le long d'un
    // bord de nappe, un tronc ou une grille qui le repousse peut le pousser PAR-DESSUS le bord : au quai, vers (14,3 ;
    // -54,3), les fûts du rideau extérieur sont sur la crête du talus, et en les longeant le joueur passait sur le talus
    // (trop raide : non marchable) ; de là, Monde.franchir le laissait aller (on ne reste pas prisonnier d'un sol où l'on
    // ne marche pas), et il glissait d'1,25 m jusqu'au pied de la grille, sans pouvoir remonter. La poussée refusée par
    // franchir n'en garde que la part qui longe le bord ; si cela ne passe pas non plus, elle est annulée (la vitesse,
    // elle, a perdu ce qui entrait dans l'obstacle : on ne s'y enfonce pas en insistant).
    const ax = this.pos.x, az = this.pos.z;
    if (Monde.resoudre(this.pos, RAYON_PIETON, 'pieton', this.vel)) {
      const ya = Monde.sol(ax, az), b = Monde.franchir(ax, az, ya, this.pos.x, this.pos.z, 'pieton', saut);
      if (b) {
        const px = this.pos.x - ax, pz = this.pos.z - az, pn = Math.min(0, px * b.nx + pz * b.nz);
        this.pos.x = ax + px - pn * b.nx; this.pos.z = az + pz - pn * b.nz;
        if (Monde.franchir(ax, az, ya, this.pos.x, this.pos.z, 'pieton', saut)) { this.pos.x = ax; this.pos.z = az; }
      }
    }
    const y = Monde.sol(this.pos.x, this.pos.z), d = y0 - y;
    if (this.airborne) this.jumpY += d;
    else if (d > 0.05) { this.airborne = true; this.jumpY = d; this.jumpVel = Math.min(0, this.jumpVel); }
    else if (d < -0.05) this.yLisse = Math.max(-0.35, this.yLisse + d);
    this.pos.y = y;
  }

  // ---------- déplacement ----------
  // dir : direction monde (xz) normalisée ou nulle
  move(dir, sprint, dt) {
    // ASSIS. On ne se deplace plus, et c'est le seul endroit du jeu ou l'on souffle vraiment : l'endurance
    // remonte deux fois plus vite qu'a l'arret debout. Sortir ICI, avant le clamp de zone et la repoussee
    // des obstacles, est indispensable — le gradin EST un obstacle plein, et un joueur pose dessus serait
    // ejecte devant a l'image suivante.
    if (this.assis) {
      this.vel.set(0, 0, 0); this.speedNow = 0; this.lateral = 0; this.backward = 0; this.sprinting = false;
      this.stamina = Math.min(100, this.stamina + 26 * dt);
      return;
    }
    const moving = dir.lengthSq() > 0.001;
    // VITESSE. Haythem trouvait les joueurs un peu trop rapides (24/09) : un joueur à 95 de vitesse courait à
    // 5,9 m/s et sprintait à 8,1 m/s, plus vite qu'un arrière NBA lancé. Maintenant 5,4 m/s et 7,1 m/s en
    // sprint (-8 % et -12 %) ; un joueur moyen (70) court à 4,8 m/s et sprinte à 6,3 m/s.
    let sp = (3.1 + (this.def.spd / 100) * 2.4) * this.speedMul * (this.boost || 1);   // boost = momentum "en feu"
    this.sprinting = false;
    const bf = this.badgeFx || {};
    if (moving && this.hasBall) sp *= 1 + (bf.speed || 0);                      // « Fusée » : plus vif balle en main
    if (sprint && moving && this.stamina > 3) { sp *= 1.32; this.stamina = Math.max(0, this.stamina - 22 * dt * this.staminaMul * (1 - (bf.stamina || 0))); this.sprinting = true; }
    else this.stamina = Math.min(100, this.stamina + 13 * dt);
    // MARCHER. Le jeu n'avait qu'une seule allure : on se déplaçait toujours à la vitesse de course, et c'est
    // pour ça qu'aucune animation de marche n'aurait servi à rien — elle n'aurait jamais été atteinte. Le
    // plafond est celui de la foulée du clip (2,11 m/s mesurés sur la mocap) : à cette vitesse-là exactement,
    // l'animation tourne à sa cadence naturelle et le pied ne glisse pas d'un millimètre.
    if (this.marche && !this.sprinting) { sp = Math.min(sp, 2.15); this.stamina = Math.min(100, this.stamina + 5 * dt); }
    // DRAPEAU DE SPRINT LISSE. Le drapeau brut clignote : le sprint vide l'endurance a 22 par seconde et la
    // regagne a 13, si bien qu'arrive au fond de la jauge il bascule vingt a trente fois par seconde, touche
    // tenue. L'animation changeait alors d'allure a chaque image. On garde donc le souvenir du sprint un
    // quart de seconde : il s'allume tout de suite, il s'eteint doucement.
    if (this.sprinting) this.sprintVu = 0.25; else this.sprintVu = Math.max(0, this.sprintVu - dt);
    sp *= this.gasMul();                                     // jambes lourdes quand l'endurance tombe
    // LES ROLLERS (lot C4, js/rollers.js ; seulement chaussés, donc en balade) : plus vite sur un sol dur, avec de
    // l'élan à prendre et une glissade à l'arrêt (voir `k` plus bas) ; en canard sur un sol meuble
    const roule = this.hRol > 0 && (Monde.plat || solRoulant(Monde.surface(this.pos.x, this.pos.z)));
    if (this.hRol > 0) { sp *= roule ? (this.sprinting ? ROLLERS.vitesseSprint : ROLLERS.vitesse) : ROLLERS.vitesseMeuble; this._rolPousse = moving; }
    // LA PENTE (js/monde.js) : on ralentit en montée (jusqu'à 55 % de sa vitesse), on allonge un peu la foulée en
    // descente. Sur un terrain plat, ou en match, rien : la ligne ne s'exécute même pas.
    const relief = !Monde.plat && Player.enBalade;
    if (relief && moving) sp *= facteurPente(Monde.pente(this.pos.x, this.pos.z, dir.x, dir.z));
    if (this.stun > 0 || this.state !== 'idle') sp = 0;      // layup/dunk : déplacement géré par lunge()
    if (this.airborne) sp *= 0.35;
    // Le GRAND crossover ne freine presque pas : c'est le geste avec lequel on PART, pas celui qu'on subit.
    // A 0,3 de vitesse comme les autres dribbles, on cassait les chevilles du defenseur pour s'arreter net
    // juste devant lui — exactement l'inverse de ce qu'on veut voir.
    // pendant un geste en rythme, sa propre vitesse (hésitation : on freine puis on repart plus vite) ; un
    // geste de mocap garde le pas du clip
    const dcg = this.dribble;
    if (dcg && dcg.controle && (dcg.geste.def || dcg.geste.apresT > 0)) sp *= dcg.vitesseGeste();
    else if (this.crossT >= 0) sp *= this.moveClip ? 0.3 : this.moveRythme ? 1 : 0.7;
    // SPIN : le clip tourne SUR PLACE (pivot sur un pied) pendant que le joueur gardait toute sa vitesse — 3,6 m
    // parcourus pieds plantés à 5 m/s. Pendant le tour on n'avance plus qu'au tiers : avec l'élan qui retombe,
    // un mètre et demi environ lancé à 6 m/s (mesuré : 4,4 m avant, 2,4 m à 45 %) — ce qu'un vrai spin gagne.
    if (this.spinT > 0 && this.clipSpin) sp *= 0.32;
    // Inertie : on ne téléporte plus la position, on pilote une vitesse. Un joueur met ~0,18 s à lancer sa course
    // et ~0,12 s à s'arrêter : c'est ce qui enlève la sensation de patinage et permet les appuis secs.
    const cible = _v3.set(dir.x * sp, 0, dir.z * sp);
    // RECUL PROTÉGÉ et STEP-BACK : on recule le long du cap figé ; en recul, le manche ne donne plus que le côté
    const recule = (this.stepT > 0 || this.retraitT > 0) && this.state === 'idle' && this.stun <= 0 && !this.airborne;
    let vite = false;
    if (recule) {
      const f = this.capFige;
      if (this.stepT > 0) { const vr = this.stepDur - this.stepT < 0.22 ? 3.4 : 0; cible.set(-f.x * vr, 0, -f.z * vr); vite = true; }
      else {
        const l = clamp(dir.x * f.z - dir.z * f.x, -0.8, 0.8);           // + = vers sa gauche
        cible.set(-f.x * 2.4 + f.z * l * 2.0, 0, -f.z * 2.4 - f.x * l * 2.0);
      }
    }
    // Un joueur BOUSCULÉ garde son élan : sa vitesse retombe en ~0,45 s au lieu de 0,085 s. Sans ça, un coup
    // d'épaule ne déplaçait personne — la vitesse imposée était effacée en deux images et l'adversaire restait
    // planté au même endroit, ce qui enlevait tout intérêt au contact.
    const k = this.stun > 0 ? 1 - Math.exp(-dt / 0.45) : vite ? 1 - Math.exp(-dt / 0.05)
      : ((moving || recule) && sp > 0 ? 1 - Math.exp(-dt / (roule ? 0.13 * ROLLERS.elan : 0.13)) : 1 - Math.exp(-dt / (roule ? 0.085 * ROLLERS.glisse : 0.085)));
    this.vel.lerp(cible, Math.min(1, k));
    if (this.push.lengthSq() > 1e-6) {                       // contacts : accélération, pas téléportation
      const resist = 1 - ((this.badgeFx && this.badgeFx.contact) || 0);         // « Costaud » : on ne sort plus de son axe
      this.push.multiplyScalar(Math.max(0.2, resist));
      const pm = Math.min(6, Math.hypot(this.push.x, this.push.z));
      this.vel.x += this.push.x * dt; this.vel.z += this.push.z * dt;
      const v = Math.hypot(this.vel.x, this.vel.z), vmax = sp + pm;
      if (v > vmax && v > 0) { this.vel.x *= vmax / v; this.vel.z *= vmax / v; }
      this.push.set(0, 0, 0);
    }
    if (this.vel.lengthSq() < 1e-4) this.vel.set(0, 0, 0);
    const B = this.bounds, x0 = this.pos.x, z0 = this.pos.z;   // (x0, z0 : d'où part le pas, pour le relief)
    this.pos.x = Math.max(B.xMin, Math.min(B.xMax, this.pos.x + this.vel.x * dt));
    this.pos.z = Math.max(B.zMin, Math.min(B.zMax, this.pos.z + this.vel.z * dt));
    this._contreBornes(B);
    // Obstacles du decor. DEUX formes, et deux seulement :
    //   { x, z, r }                 CYLINDRE — un platane, une poubelle, un mat de panier
    //   { box: true, x, z, hx, hz } BOITE alignee sur les axes — un gradin, un container
    // `pad` (facultatif) est la marge de carrure ajoutee au gabarit REEL du solide. Sans `pad` on est dans
    // la convention d'origine, ou `r` englobe deja les epaules : les platanes de Jemmapes ne bougent pas.
    // Une entree d'une autre forme est IGNOREE — sans ce garde-fou elle ecrirait NaN dans this.pos, et
    // comme toute comparaison avec NaN est fausse, le `continue` ne se declencherait meme pas : le joueur
    // disparaitrait purement et simplement de la scene.
    //
    // Dans les deux cas on repousse hors du volume puis on retire la seule composante de vitesse qui rentre
    // dedans : le joueur GLISSE le long de l'obstacle au lieu de s'y coller. Sans ca l'IA, qui pousse en
    // permanence vers sa cible, resterait plaquee contre.
    for (const o of Player.obstacles) {
      let nx = 0, nz = 0;
      if (o.box) {
        const hx = o.hx + (o.pad || 0), hz = o.hz + (o.pad || 0);
        const dx = this.pos.x - o.x, dz = this.pos.z - o.z;
        if (Math.abs(dx) >= hx || Math.abs(dz) >= hz) continue;
        // Quatre sorties possibles. On prend la MOINS PROFONDE, mais UNIQUEMENT parmi celles qui retombent
        // DANS la zone de marche. Ce filtre repare deux defauts d'un coup : une boite plus large que la
        // zone ejecterait par l'arriere et le re-bornage ramenerait aussitot le joueur dans le decor ; et
        // sur une boite LONGUE — un gradin fait vingt-cinq metres — le repli sur l'autre axe le
        // teleporterait a l'autre bout.
        // Jamais Math.sign pour la normale : Math.sign(0) vaut 0, et un joueur pile sur l'axe median
        // recevrait une normale nulle et resterait plante dedans.
        let best = Infinity, sx = this.pos.x, sz = this.pos.z;
        const ex1 = o.x + hx, ex0 = o.x - hx, ez1 = o.z + hz, ez0 = o.z - hz;
        if (hx - dx < best && ex1 >= B.xMin && ex1 <= B.xMax) { best = hx - dx; sx = ex1; sz = this.pos.z; nx = 1; nz = 0; }
        if (hx + dx < best && ex0 >= B.xMin && ex0 <= B.xMax) { best = hx + dx; sx = ex0; sz = this.pos.z; nx = -1; nz = 0; }
        if (hz - dz < best && ez1 >= B.zMin && ez1 <= B.zMax) { best = hz - dz; sx = this.pos.x; sz = ez1; nx = 0; nz = 1; }
        if (hz + dz < best && ez0 >= B.zMin && ez0 <= B.zMax) { best = hz + dz; sx = this.pos.x; sz = ez0; nx = 0; nz = -1; }
        if (best === Infinity) continue;                 // aucune sortie valable : on ne bouge pas, plutot que n'importe ou
        this.pos.x = sx; this.pos.z = sz;
      } else if (o.r !== undefined) {
        const r = o.r + (o.pad || 0);
        const dx = this.pos.x - o.x, dz = this.pos.z - o.z;
        const d = Math.hypot(dx, dz);
        if (!(d < r)) continue;                          // ecrit ainsi pour qu'un NaN eventuel sorte aussi
        nx = d > 1e-4 ? dx / d : 1; nz = d > 1e-4 ? dz / d : 0;
        this.pos.x = o.x + nx * r; this.pos.z = o.z + nz * r;
      } else continue;
      const vn = this.vel.x * nx + this.vel.z * nz;
      if (vn < 0) { this.vel.x -= vn * nx; this.vel.z -= vn * nz; }
    }
    // Le clamp ci-dessus a lieu AVANT la repoussee et rien ne re-bornait derriere : une boite posee au ras
    // d'une limite pouvait sortir le joueur de la zone, et plus rien ne l'y ramenait.
    this.pos.x = Math.max(B.xMin, Math.min(B.xMax, this.pos.x));
    this.pos.z = Math.max(B.zMin, Math.min(B.zMax, this.pos.z));
    this._contreBornes(B);
    // LE RELIEF (js/monde.js) : murs, massifs, eau, obstacles du parc, puis la hauteur du sol. Sur un terrain
    // plat (Monde.plat), ou en match (Player.enBalade faux), rien de tout cela ne s'exécute : le pas reste
    // exactement celui d'avant.
    if (relief) this._surLeRelief(x0, z0);
    this.speedNow = Math.hypot(this.vel.x, this.vel.z);
    if (this.speedNow > 0.1) {
      const nx = this.vel.x / this.speedNow, nz = this.vel.z / this.speedNow;
      const lat = nx * -this.facing.z + nz * this.facing.x;
      this.lateral = Math.abs(lat); this.lateralDir = Math.sign(lat);
      this.backward = -(nx * this.facing.x + nz * this.facing.z);
      // On ne réoriente que dans l'état libre : sinon la vitesse résiduelle faisait pivoter le tireur hors du
      // panier pendant tout l'armé (la vitesse met ~0,3 s à retomber sous le seuil).
      // ... et jamais quand on est au sol : la vitesse pointe alors vers l'extérieur du contact, le joueur
      // se serait retourné pour tomber dos au type qui vient de le pousser.
      // (en recul, et 0,4 s après : sinon l'élan qui reste retournait le joueur face à l'arrière)
      if (this.state === 'idle' && !this.airborne && this.spinT <= 0 && this.chuteT <= 0 && !(this.defending && !this.hasBall) && !recule && !(this.reculFinT > 0)) {
        // Pendant le geste de passe, le buste reste tourné vers le receveur s'il est à moins de 40° de la
        // course : au-delà, se retourner après le lâcher serait une pirouette (et les jambes changeraient d'allure).
        const V = this.visePasse;
        if (this.passT > 0 && nx * V.x + nz * V.z > 0.77) this.faceWant.copy(V);
        else this.faceWant.set(nx, 0, nz);
      }
    } else { this.lateral = 0; this.backward = 0; this.sensLoco = 'av'; this.sensT = 0; }

    // REPARTIR DE L'AUTRE CÔTÉ. C'est le geste de base du dribble : on attaque d'un côté, on change d'appui,
    // on repasse la balle dans l'autre main. Jusqu'ici le jeu ne le déclenchait que sur la position par
    // rapport au PANIER — on ne croisait donc pas en remontant le terrain, ni sur un changement d'appui sec
    // face à son défenseur, c'est-à-dire précisément là où un crossover sert.
    //
    // Ce qu'on compare, c'est la direction DEMANDÉE et le cap qu'on tenait juste avant, dans le repère du
    // MONDE. Ma première version mesurait la composante latérale dans le repère du JOUEUR : elle ne se
    // déclenchait jamais, et pour une raison évidente une fois vue — le joueur pivote vers là où il court, en
    // moins de deux dixièmes de seconde. Son « côté » suit donc sa course au lieu de la trahir, et la
    // composante latérale reste collée à zéro quoi qu'on fasse.
    // `capPrec` est un cap LISSÉ sur un dixième de seconde : comparer à la seule image précédente ferait
    // passer la moindre saccade de manette pour un changement d'appui.
    this.viraison = false;
    if (this.speedNow > 1.4 && moving) {
      if (this.capPrec.lengthSq() > 0.25 && dir.dot(this.capPrec) < -0.15) this.viraison = true;
      this.capPrec.lerp(dir, 1 - Math.exp(-dt / 0.11));
      if (this.capPrec.lengthSq() > 1e-6) this.capPrec.normalize();
    } else if (!moving) this.capPrec.set(0, 0, 0);

    this.turnTo(this.faceWant, dt);
  }

  // Pivot progressif vers le cap visé : un demi-tour prend ~0,22 s à l'arrêt au lieu d'être instantané.
  // LANCÉ, on tourne moins vite : à pleine course il faut planter le pied avant de repartir, et un joueur qui
  // pivotait de 180° en deux dixièmes de seconde à 7 m/s avait l'air d'une girouette. 14 rad/s jusqu'à 3 m/s,
  // 9 rad/s au-delà de 6 m/s.
  // ROTATION AVEC ÉLAN. La vitesse de rotation a maintenant une inertie : elle monte et redescend avec une
  // accélération bornée au lieu de passer de 0 à 14 rad/s d'un pas à l'autre. Un joueur qui se retourne
  // accélère sa rotation puis la freine, comme un corps — il ne pivote plus comme une aiguille. Le joueur tenu
  // à la manette garde une accélération forte (réactivité) ; l'IA tourne plus posément ; un joueur distant
  // suit ses paquets sans retard.
  turnTo(want, dt) {
    if (want.lengthSq() < 1e-6 || !(dt > 0)) return;
    const a = Math.atan2(this.facing.x, this.facing.z), b = Math.atan2(want.x, want.z);
    let e = b - a;
    while (e > Math.PI) e -= Math.PI * 2;
    while (e < -Math.PI) e += Math.PI * 2;
    this._aTourne = true;
    if (Math.abs(e) < 0.003 && Math.abs(this.omegaCap || 0) < 0.8) { this.facing.copy(want); this.omegaCap = 0; return; }
    const vit = Math.hypot(this.vel.x, this.vel.z);
    // virage vif (tir, dunk, layup : faceTo sans douceur) : un demi-tour en un dixième de seconde, en l'air aussi
    const vif = this.virageVif > 0;
    const wMax = vif ? 30 : this.remote ? 16 : this.airborne ? 6 : 13 - 4.5 * Math.min(1, Math.max(0, (vit - 3) / 3));
    const aMax = vif ? 2500 : this.remote ? 400 : this.piloteHumain ? 220 : 110;
    const wDes = Math.sign(e) * Math.min(wMax, Math.sqrt(1.8 * aMax * Math.abs(e)), Math.abs(e) / dt);
    const om = this.omegaCap || 0;
    this.omegaCap = om + Math.max(-aMax * dt, Math.min(aMax * dt, wDes - om));
    let pas = this.omegaCap * dt;
    if (pas * e > 0 && Math.abs(pas) > Math.abs(e)) { pas = e; this.omegaCap = e / dt; }
    const na = a + pas;
    this.facing.set(Math.sin(na), 0, Math.cos(na));
  }

  // 1 quand l'endurance est pleine, 0,78 quand elle est à zéro : vitesse, détente et adresse en pâtissent
  gasMul() { return 0.78 + 0.22 * Math.min(1, this.stamina / 55); }

  // Oriente d'un coup : cap courant ET cap visé. Les affectations directes de `facing` étaient annulées par
  // `turnTo` à l'image suivante, puisque `faceWant` n'avait pas bougé.
  setFacing(x, z) {
    const n = Math.hypot(x, z);
    if (n < 1e-6) return;
    this.facing.set(x / n, 0, z / n); this.faceWant.copy(this.facing); this.omegaCap = 0;
  }

  // doux : cap visé, le joueur y pivote à son rythme. Sinon (tir, dunk, layup) : VITE — un demi-tour en 0,1 s
  // (virageVif, voir turnTo). Le cap était copié d'un coup : jusqu'à 180° en une image, le corps se téléportait
  // face au cercle. `net` : d'un coup quand même (remise en jeu, joueurs replacés : ils viennent d'être téléportés).
  faceTo(target, doux = false, net = false) {
    const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
    if (dx * dx + dz * dz <= 1e-4) return;
    this.faceWant.set(dx, 0, dz).normalize();
    if (net) { this.facing.copy(this.faceWant); this.omegaCap = 0; }
    else if (!doux) this.virageVif = 0.16;
  }

  // Renvoie la vitesse RÉELLEMENT appliquée : le tir en dépend (hauteur d'apogée et instant du lâcher), et elle
  // n'est pas celle demandée à cause de la fatigue et du badge « Ressort ».
  jump(v = 2.8) {
    if (this.airborne) return 0;
    this.airborne = true; this.sautId++;
    this.jumpVel = v * this.gasMul() * (1 + ((this.badgeFx && this.badgeFx.jump) || 0));
    return this.jumpVel;
  }

  // Variante de dribble sur place tirée au sort à chaque prise de balle. Les clips CMU et DeepMotion étaient
  // chargés et retargetés pour rien : c'est la plus grosse variété gagnée sans le moindre asset nouveau.
  pickDribbleVariant() {
    const A = this.anim;
    if (!A) return 'idle_ball';
    const vs = ['idle_ball', 'idle_ball_4', 'idle_ball_5', 'idle_ball_6', 'idle_ball_7'].filter((v) => A.has(v));
    return vs.length ? vs[Math.floor(Math.random() * vs.length)] : 'idle_ball';
  }

  // Clip de layup DeepMotion ; null = clip générique + bras procéduraux.
  //
  // LA MAIN SUIT LE CÔTÉ. Un layup se finit de la main extérieure : on attaque par la droite du cercle, on
  // pose de la droite ; par la gauche, de la gauche. C'est ce qui manquait le plus — le joueur croisait le
  // bras devant son corps pour déposer de la droite alors qu'il arrivait par l'autre côté, et ça se voyait
  // tout de suite. Le clip miroir existait sur le disque depuis le début, il n'était simplement pas déclaré.
  //
  // Quel côté ? Face au panier lointain (z positif) le joueur regarde vers +z, donc sa droite est du côté des
  // x négatifs ; face au panier proche, c'est l'inverse. D'où le signe. On ne bascule à gauche que si l'on est
  // franchement décalé : dans l'axe, la main forte reste la bonne.
  // LA MAIN QUI FINIT (06/10/2026). Le layup se posait toujours de la main droite, le dunk aussi, et le ballon
  // suivait la droite — même en arrivant par la gauche du cercle, ballon dans la main gauche : le joueur croisait
  // le bras devant lui. Règle du basket : on finit de la main EXTÉRIEURE (côté droit du cercle → main droite,
  // côté gauche → main gauche) ; dans l'axe, avec la main qui tient la balle. Face au panier lointain (z positif)
  // le joueur regarde vers +z, sa droite est du côté des x négatifs ; face au panier proche, l'inverse.
  _mainFinale() {
    let gauche = this.dribbleHand === 'L';
    if (this.hoop) {
      const versSaDroite = this.hoop.z >= 0 ? -1 : 1, lat = (this.pos.x - this.hoop.x) * versSaDroite;
      if (lat < -0.35) gauche = true; else if (lat > 0.35) gauche = false;
    }
    this.mainFinale = gauche ? 'L' : 'R';
    return this.mainFinale;
  }

  pickLayupClip() {
    this.layupClip = null;
    this._mainFinale();
    if (!this.anim) return;
    // On ne prend plus un clip parce qu'il S'APPELLE layup, mais parce qu'il est DECLARE comme en etant un.
    // La nuance a coute cher : dm/layup.glb portait le nom et le jeu le jouait, alors que la mesure sur le
    // squelette montre que la main n'y passe jamais au-dessus de la tete. On jouait une marche a la place d'un
    // layup. Aucun clip n'est declare layup:true aujourd'hui — c'est donc la pose procedurale qui prend la
    // main, et tant mieux : elle, elle monte le genou et tend le bras.
    const vrais = Object.keys(this.anim.defs).filter((n) => this.anim.defs[n].layup && this.anim.has(n));
    if (!vrais.length) return;
    // La main qui finit suit le cote d'ou l'on attaque (voir _mainFinale).
    const cote = vrais.filter((n) => (this.anim.defs[n].hand || 'R') === this.mainFinale);
    const pool = cote.length ? cote : vrais;
    this.layupClip = pool[Math.floor(Math.random() * pool.length)];
  }
  // clip de dunk DeepMotion (corps entier) selon le style ; null = clip générique + bras procéduraux.
  // Main gauche (voir _mainFinale) : les versions miroir `_m`, qui dormaient sur le disque depuis le début.
  // (la liste citait dunk_dm_3 et dunk_two_2, qui n'ont jamais existé)
  pickDunkClip() {
    this.dunkClip = null;
    this._mainFinale();
    if (!this.anim) return;
    const suf = this.mainFinale === 'L' ? '_m' : '';
    const tirer = (noms) => {
      const vs = noms.map((v) => (suf && this.anim.has(v + suf) ? v + suf : v)).filter((v) => this.anim.has(v));
      return vs.length ? vs[Math.floor(Math.random() * vs.length)] : null;
    };
    if (this.dunkStyle === 'two') this.dunkClip = tirer(['dunk_two']);
    if (!this.dunkClip) { const one = tirer(['dunk_dm', 'dunk_dm_2']); if (one) { this.dunkStyle = 'one'; this.dunkClip = one; } }
  }

  // célébration après un panier : Victory / Clapping / Cheering au hasard (selon les clips chargés), parfois une danse
  startCelebrate() {
    this.state = 'celebrate'; this.emote = null;
    const has = (v) => this.anim && this.anim.has(v);
    const vs = ['victory', 'celebrate_2', 'celebrate_3'].filter(has);
    const dances = ['dance_hiphop', 'dance_gangnam', 'dance_break', 'dance_chicken', 'dance_ymca'].filter(has);
    const pool = dances.length && Math.random() < 0.35 ? dances : vs;
    this.celebVariant = pool.length ? pool[Math.floor(Math.random() * pool.length)] : 'victory';
  }

  // emote (roue T) : seulement à l'arrêt, au sol ; annulée par tout mouvement / action (voir update et Game)
  startEmote(def) {
    if (this.state !== 'idle' || this.airborne || this.stun > 0) return false;
    this.emote = { ...def, t: 0 }; this.animKey = null;
    return true;
  }
  stopEmote() { if (this.emote) { this.emote = null; this.animKey = null; } }
  // mouvement de dribble sur place (touche) : dure au moins `dur` s, prolongé tant que la touche est tenue
  // ARMER UN TIR. Si la balle est au sol ou en l'air (dribble), on attend qu'elle revienne dans la main — au
  // plus 0,18 s : sinon elle était « aspirée » depuis le bitume jusqu'aux mains au début de l'armé.
  demanderArme() {
    const dc = this.dribble;
    if (dc && dc.controle && !dc.prenable()) { this.tirAttenteT = DRIBBLE.WAIT_SHOT; return; }
    this.state = 'windup'; this.windup = 0; if (this.hoop) this.faceTo(this.hoop);
  }
  // SIZE-UP : un geste par rebond, tiré d'une combinaison (js/gestes.js, COMBOS), tant que sizeUp est vrai
  prochainSizeUp() {
    const S = this._su || (this._su = { combo: null, i: 0 });
    if (!S.combo || S.i >= S.combo.length) { S.combo = COMBOS[Math.floor(Math.random() * COMBOS.length)]; S.i = 0; }
    return S.combo[S.i++];
  }
  startDribbleMove(dur = 1.4) { if (this.state !== 'idle' || this.airborne || !this.hasBall) return false; this.dribbleMoveT = Math.max(this.dribbleMoveT, dur); return true; }

  // spin move : tour complet en 0,5 s, balle protégée
  spin() {
    if (this.spinT > 0 || this.airborne || this.state !== 'idle' || this.stun > 0) return false;
    // pas pendant un geste de dribble (la main de la balle y est en train de changer)
    if (this.crossT >= 0 || (this.dribble && (this.dribble.croise.attente || this.dribble.croise.actif))) return false;
    if (this.handCd > 0) return false;                 // le spin n'avait aucun cooldown : on pouvait l'enchaîner sans
    this.handCd = 0.8;                                 // fin, et il rendait la balle involable pendant tout ce temps
    const sd = this.anim && this.anim.defs[this.dribbleHand === 'L' && this.anim.has('spin_m') ? 'spin_m' : 'spin'];
    this.spinT = (sd && sd.fit) || 0.5; this.spinDir = this.dribbleHand === 'R' ? 1 : -1;
    this.spinDur = this.spinT; this.spinId = (this.spinId || 0) + 1;     // pour la trajectoire de la balle (Game._spinBalle)
    return true;
  }
  // Spin demandé pendant que la balle est au sol ou en l'air : on attend qu'elle revienne dans la main (au plus
  // 0,2 s), sinon elle était aspirée depuis le sol jusqu'à la main au début du tour.
  demanderSpin() {
    if (this.spinT > 0 || this.spinAttenteT > 0) return false;
    const dc = this.dribble;
    if (dc && dc.controle && (!dc.prenable() || this.crossT >= 0 || dc.croise.attente || dc.croise.actif)) { this.spinAttenteT = 0.45; return true; }
    return this.spin();
  }

  // changement de main (ballPos = position actuelle de la balle) : 'cross' devant au sol, 'legs' entre les jambes, 'back' dans le dos
  startMove(type, ballPos) {
    if (this.crossT >= 0 || this.handCd > 0 || this.spinT > 0 || this.airborne || this.state !== 'idle' || this.stun > 0) return false;
    // GESTES EN RYTHME (js/gestes.js, joués par js/dribble.js) dès que le module a la balle, à toutes les
    // vitesses — les jambes continuent. Substitutions : trop vite pour passer entre les jambes, on passe
    // dans le dos ; trop lent pour une hésitation, c'est un pound.
    let defG = GESTES[type];
    if (defG && defG.vMax && this.speedNow > defG.vMax && GESTES[defG.sinon]) { type = defG.sinon; defG = GESTES[type]; }
    if (defG && defG.vMin && this.speedNow < defG.vMin && GESTES[defG.sinon]) { type = defG.sinon; defG = GESTES[type]; }
    const rythme = Player.GESTES_V2 !== false && !!defG && !!(this.dribble && this.dribble.controle);
    if (!rythme && !MOCAP_GESTES[type]) return false;         // in-and-out, hésitation, pound : en rythme seulement
    const f = this.facing;
    this.moveType = type;
    // positions de départ / de passage dans le repère du joueur (x = sa gauche, z = devant)
    _v.subVectors(ballPos, this.pos); this.crossFromLocal.set(_v.x * f.z - _v.z * f.x, _v.y, _v.x * f.x + _v.z * f.z);
    if (type === 'legs') { this.moveViaLocal.set(0, BALL_R, -0.1); this.moveDur = 0.32; }
    // DANS LE DOS : la balle REBONDIT. Le point de passage etait a 0,95 m — la hauteur de la taille — et la
    // balle passait donc derriere le dos sans jamais toucher le sol : on la voyait glisser d'une main a
    // l'autre, ce qui ne ressemble a rien. Elle claque maintenant au sol derriere les talons, decalee du cote
    // de la main qui va la recevoir, pour qu'elle remonte droit dedans au lieu d'arriver de biais.
    else if (type === 'back') { this.moveViaLocal.set(0.18 * (this.dribbleHand === 'R' ? 1 : -1), BALL_R, -0.28); this.moveDur = 0.38; }
    else { this.moveViaLocal.set(0.05 * (this.dribbleHand === 'R' ? -1 : 1), BALL_R, 0.45); this.moveDur = 0.26; }
    this.moveWorld(this.crossFromLocal, this.crossFrom); this.moveWorld(this.moveViaLocal, this.moveVia);
    // clip mocap du geste s'il existe (variantes tirées au sort ; version miroir quand la balle est à gauche)
    const suf = this.dribbleHand === 'L' ? '_m' : '';
    const cands = [type + suf, type + '_2' + suf, type + '_3' + suf].filter((c) => this.anim && this.anim.has(c));
    this.moveClip = cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
    // Avant, le geste prenait la durée BRUTE du clip : un « dans le dos » immobilisait presque une seconde à
    // 30 % de vitesse. Maintenant c'est le clip qui est calé sur la durée du geste (champ fit du manifest).
    if (this.moveClip) { const d = this.anim.defs[this.moveClip]; if (d.fit) this.moveDur = d.fit; }
    // En rythme, pas de clip de mocap (il figeait les jambes et divisait la vitesse par trois) : la balle suit
    // le geste au rythme des appuis (js/dribble.js).
    if (rythme) { this.moveClip = null; this.moveDur = defG.duree; }
    this.moveRythme = rythme;
    this.moveId = (this.moveId || 0) + 1;
    if (!rythme || defG.change) this.dribbleHand = this.dribbleHand === 'R' ? 'L' : 'R';
    // recul, step-back : le joueur recule, cap figé face au jeu, jambes directement sur la course arrière
    if (rythme && (defG.recul || defG.pas)) {
      this.capFige.copy(this.facing); this.faceWant.copy(this.facing); this.sensLoco = 'ar'; this.sensT = 0;
      if (defG.pas) { this.stepT = this.stepDur = defG.pas; this.stamina = Math.max(0, this.stamina - 4); }
      else this.retraitT = defG.recul;
    }
    this.crossT = 0; this.prevCrossT = 0;
    this.handCd = rythme ? defG.cd : type === 'cross' ? 0.45 : 0.9;   // pas de geste enchaîné juste après
    this.drib.phase = 'push'; this.drib.prevHy = null;
    return true;
  }
  switchHand(ballPos) { return this.startMove('cross', ballPos); }
  // repère du joueur -> monde (x = gauche, z = devant)
  moveWorld(local, out) {
    const f = this.facing;
    return out.set(this.pos.x + f.z * local.x + f.x * local.z, local.y, this.pos.z - f.x * local.x + f.z * local.z);
  }

  // pendant un layup / dunk : élan vers le point calculé au déclenchement (dunkTo), sinon on continue vers le cercle
  lunge(dt) {
    if (!this.hoop || this.released) return;
    if (this.dunkTo) {
      this.dunkT += dt;
      const u = clamp(this.dunkT / this.dunkRise, 0, 1), e = 1 - (1 - u) * (1 - u);
      this.pos.lerpVectors(this.dunkFrom, this.dunkTo, e);
      this.faceTo(this.hoop);
      return;
    }
    const d = hdist(this.pos, this.hoop);
    const stop = this.state === 'dunk' ? 0.55 : 1.0, sp = this.state === 'dunk' ? 4.5 : 2.6;
    if (d > stop) {
      _v.set(this.hoop.x - this.pos.x, 0, this.hoop.z - this.pos.z).normalize();
      this.pos.addScaledVector(_v, Math.min(sp * dt, d - stop));
      this.faceWant.copy(_v); this.virageVif = Math.max(this.virageVif, 0.05);   // face au cercle, vite mais sans à-coup
    }
  }

  // ---------- positions monde utiles ----------
  handWorld(hand, out) {
    if (this.avatar) {
      const b = this.avatar.bone(hand === 'L' ? 'LeftHandMiddle1' : 'RightHandMiddle1') || this.avatar.bone(hand === 'L' ? 'LeftHand' : 'RightHand');
      return b.getWorldPosition(out);
    }
    return (hand === 'L' ? this.rig.handL : this.rig.handR).getWorldPosition(out);
  }
  hipWorld(out) { return this.mesh.localToWorld(out.set(0.22 * (this.dribbleHand === 'R' ? -1 : 1), 0.95, 0.12)); }
  // où est la balle quand on arme / tire
  ballHoldPos(out) {
    if (this.state === 'dunk') {
      if (this.dunkStyle === 'two') { this.handWorld('R', out); this.handWorld('L', _w); out.lerp(_w, 0.5); out.y += 0.1; return out; }
      this.handWorld(this.mainFinale === 'L' ? 'L' : 'R', out); out.y += 0.13; out.addScaledVector(this.facing, 0.05); return out;
    }
    // La balle partait toujours de la main droite, meme quand le clip deposait de la gauche : on voyait le
    // ballon se decrocher a cote de la main. Elle suit maintenant la main du clip — à défaut, la main qui finit.
    if (this.state === 'layup') {
      const dl = this.layupClip && this.anim ? this.anim.defs[this.layupClip] : null;
      this.handWorld(dl && dl.hand ? dl.hand : this.mainFinale === 'L' ? 'L' : 'R', out); out.y += 0.1; return out;
    }
    // PASSE ARMÉE (le lâcher attend le geste, voir Game.passBall) : le ballon suit la main qui lance
    if (this.passT > 0 && this.passeArmee) {
      this.handWorld(this.passeArmee, out); this.handWorld(this.passeArmee === 'L' ? 'R' : 'L', _w);
      out.lerp(_w, 0.12); out.addScaledVector(this.facing, 0.06); return out;
    }
    this.handWorld('R', out); this.handWorld('L', _w); out.lerp(_w, 0.5); out.y += 0.05; out.addScaledVector(this.facing, 0.07); return out;
  }

  // ---------- poses ----------
  _pose() {
    const P = { ...REST };
    const t = this.animT, p = this.walkPhase, s = Math.sin(p), c = Math.cos(p);
    const moving = this.speedNow > 0.1, A = this.sprinting ? 1.0 : 0.72;
    const st = this.state;

    // ================= À VÉLO =================
    // La pose de base : assis, penché, la tête qui compense pour regarder la route. Les jambes et les bras
    // sont ensuite posés sur les pédales et le guidon par cinématique inverse (_placerSurVelo) : ici on ne
    // leur donne qu'une position de départ plausible, pour que la montée en selle ne passe pas par un
    // garde-à-vous.
    if (this.velo) {
      const k = lisse(this.velo.k);
      // (lot C4) debout sur la trottinette ou le skate : la pose de base que donne l'engin
      if (this.velo.v.poseCavalier) { this.velo.v.poseCavalier(P, k, REST); return P; }
      const mx = (rest, v) => rest + (v - rest) * k;
      // l'inclinaison se partage entre le dos (ici) et le bassin qui bascule en avant (_placerSurVelo) :
      // c'est ce que fait un cycliste, et c'est ce qui lui fait gagner l'allonge
      const bu = this.velo.buste;
      P.torsoX = mx(REST.torsoX, bu * 0.7);
      P.headX = mx(REST.headX, -bu * 0.95 + 0.08);
      P.tL = mx(REST.tL, -1.2); P.tR = mx(REST.tR, -1.2); P.kL = mx(REST.kL, 1.1); P.kR = mx(REST.kR, 1.1);
      P.aL = mx(REST.aL, -0.9); P.aR = mx(REST.aR, -0.9); P.eL = mx(REST.eL, -0.35); P.eR = mx(REST.eR, -0.35);
      P.aLz = mx(REST.aLz, 0.25); P.aRz = mx(REST.aRz, -0.25);
      P.bob = 0;
      return P;
    }
    // (lot C4) EN ROLLERS, sans ballon : la foulée du patineur (js/rollers.js) ; voir _patine dans update()
    if (this._patine) return poseRollers(P, REST, this.patPhase, this._rolPousse, this.speedNow);

    // ================= ASSIS SUR LE BANC =================
    // Elle passe AVANT tout le reste et sort tout de suite : la cascade d'etats en dessous rejouerait un
    // idle par-dessus.
    //
    // Toute l'animation tient dans `assis.k`, qui monte de 0 a 1 en une demi-seconde et redescend pour se
    // relever : le joueur ne se teleporte pas sur le banc, il s'y pose. Aucun clip n'est necessaire — la
    // seule chose que le squelette ne sait pas faire seul, c'est DESCENDRE, et c'est `bob` qui s'en charge.
    if (this.assis) {
      const k = this.assis.k, e = k * k * (3 - 2 * k);
      // Chaque articulation part de sa valeur DEBOUT et va vers sa valeur ASSISE : c'est ce melange qui
      // fait l'animation. Interpoler depuis zero au lieu de REST donnait, au premier dixieme de seconde,
      // un garde-a-vous les bras colles au corps avant que le joueur ne s'asseye.
      const mx = (rest, assis) => rest + (assis - rest) * k;
      P.kL = mx(REST.kL, 1.56); P.kR = mx(REST.kR, 1.52);          // genoux plies, legerement dissymetriques
      P.tL = mx(REST.tL, -1.46); P.tR = mx(REST.tR, -1.42);        // cuisses a l'horizontale
      P.tLz = mx(REST.tLz, 0.15); P.tRz = mx(REST.tRz, -0.13);     // genoux ecartes
      P.torsoX = mx(REST.torsoX, 0.16);                            // buste penche en avant, coudes sur les cuisses
      P.headX = mx(REST.headX, -0.06 + 0.035 * Math.sin(t * 1.1)); // il regarde autour de lui
      // BRAS. Le haut du bras reste PRESQUE VERTICAL le long du corps et c'est le COUDE qui fait tout le
      // travail : c'est ainsi qu'on pose ses avant-bras sur ses cuisses. En ouvrant l'epaule (aLz) on
      // obtient au contraire un haussement d'epaules, bras ecartes dans le vide.
      P.aL = mx(REST.aL, -0.10); P.aR = mx(REST.aR, -0.14);
      P.aLz = mx(REST.aLz, 0.09); P.aRz = mx(REST.aRz, -0.08);
      P.eL = mx(REST.eL, -1.08); P.eR = mx(REST.eR, -1.02);
      P.hL = mx(REST.hL, -0.10); P.hR = mx(REST.hR, -0.08);
      // On flechit d'abord, on descend ensuite : sans ce retard le joueur glisse vers le bas comme tire
      // par une ficelle, jambes encore tendues. Le petit creux au milieu est le poids du corps qui tombe.
      P.bob = this.assis.bob * e - 0.05 * Math.sin(Math.PI * k);
      this._poseTel(P);                                        // on peut aussi chatter assis sur le banc
      return P;
    }

    // ================= AU SOL, SANS CLIP =================
    // Le bonhomme en primitives n'a pas d'avatar, et un avatar peut très bien tourner sans la mocap CMU :
    // il faut donc que la mise au sol se lise aussi sans clip. Même découpage en trois temps que l'animation.
    if (this.chuteT > 0) {
      const e = this.chuteTot - this.chuteT;
      const k = e < 0.80 ? e / 0.80 : e < this.chuteTot - 1.25 ? 1 : Math.max(0, 1 - (e - (this.chuteTot - 1.25)) / 1.25);
      const q = k * k * (3 - 2 * k);
      P.bob = -0.78 * q;                                       // le bassin descend jusqu'au sol
      P.torsoX = -0.95 * q; P.headX = 0.40 * q;                // buste renversé, menton rentré
      P.tL = -1.15 * q; P.tR = -1.02 * q; P.kL = 0.85 * q; P.kR = 0.98 * q;
      P.tLz = 0.22 * q; P.tRz = -0.18 * q;                     // jambes ramenées devant, légèrement ouvertes
      P.aL = 0.85 * q; P.aR = 0.80 * q;                        // bras en arrière : les mains cherchent le sol
      P.aLz = 0.55 * q; P.aRz = -0.55 * q;
      P.eL = REST.eL - 0.30 * q; P.eR = REST.eR - 0.25 * q;
      return P;
    }

    if (st === 'idle' && !this.airborne) {
      if (this.defending && !this.hasBall) {
        // position défensive : genoux fléchis, bras écartés, pas chassés
        P.tL = -0.55; P.tR = -0.55; P.kL = 0.9; P.kR = 0.9; P.torsoX = 0.28; P.bob = -0.16;
        P.aL = -0.5; P.aR = -0.5; P.aLz = 1.0; P.aRz = -1.0; P.eL = -0.5; P.eR = -0.5;
        if (moving) {
          if (this.lateral > 0.6) { P.tLz = 0.35 * s; P.tRz = 0.35 * s; P.bob += Math.abs(s) * 0.04; }
          else { P.tL += -0.4 * s; P.tR += 0.4 * s; P.kL += 0.3 * Math.max(0, c); P.kR += 0.3 * Math.max(0, -c); }
        }
      } else if (moving) {
        // course : cuisses en opposition, genou fléchi pendant le passage avant, bras opposés
        P.tL = -s * A * 0.9; P.tR = s * A * 0.9;
        P.kL = 0.2 + 1.0 * Math.max(0, c) * A; P.kR = 0.2 + 1.0 * Math.max(0, -c) * A;
        P.bob = -Math.abs(c) * 0.03; P.torsoX = this.sprinting ? 0.25 : 0.12;
        if (!this.hasBall) { P.aL = s * 0.8 * A; P.aR = -s * 0.8 * A; P.eL = -1.3; P.eR = -1.3; }
      } else {
        P.bob = Math.sin(t * 1.8) * 0.008; P.kL = 0.12; P.kR = 0.12;
        if (this.hasBall) { P.tL = -0.2; P.tR = -0.2; P.kL = 0.35; P.kR = 0.35; P.torsoX = 0.12; P.bob = -0.05; }
      }
      if (this.hasBall) {
        // dribble : le bras pompe avec la balle, l'autre bras protège
        // ph = 0 : main en haut, coude plié (reprise de la balle) ; ph = 1 : bras tendu vers le bas/avant, poignet cassé (poussée)
        const ph = this.dribblePhase, ax = -0.35 - 0.2 * ph, ex = -1.25 + 1.1 * ph;
        if (this.dribbleHand === 'R') { P.aR = ax; P.eR = ex; P.aRz = -0.25; P.hR = -0.2 + 0.9 * ph; P.aL = -0.7; P.aLz = 0.55; P.eL = -1.4; }
        else { P.aL = ax; P.eL = ex; P.aLz = 0.25; P.hL = -0.2 + 0.9 * ph; P.aR = -0.7; P.aRz = -0.55; P.eR = -1.4; }
        if (this.crossT >= 0) {
          const k = this.crossT, q = Math.sin(k * Math.PI), newL = this.dribbleHand === 'L';
          P.bob -= 0.07 * q; P.torsoX += 0.18 * q;
          if (this.moveType === 'legs') {
            // entre les jambes : grand pas en avant de la jambe côté nouvelle main, buste penché, l'ancienne main pousse la balle
            // vers l'arrière sous la jambe, la nouvelle main va la chercher derrière-bas
            const s1 = Math.min(1, k * 1.6), s2 = Math.max(0, (k - 0.4) / 0.6);
            if (newL) { P.tL = -1.05 * s1; P.kL = 0.35 + 0.35 * s1; P.tR = 0.35 * s1; P.kR = 0.5 * s1; P.tLz = 0.15 * s1; }
            else { P.tR = -1.05 * s1; P.kR = 0.35 + 0.35 * s1; P.tL = 0.35 * s1; P.kL = 0.5 * s1; P.tRz = 0.15 * s1; }
            P.torsoX += 0.35 * q; P.bob -= 0.12 * q; P.headX = -0.2 * q;
            if (newL) {
              P.aR = 0.35 - 0.9 * (1 - s2) * (1 - s2); P.eR = -0.35 - 0.3 * (1 - s1); P.aRz = -0.1 - 0.2 * s1; P.hR = 0.4 * s1;
              P.aL = 0.55 * (1 - s2) - 0.4 * s2; P.eL = -0.55; P.aLz = 0.35 - 0.15 * s2; P.hL = 0.5 * (1 - s2);
            } else {
              P.aL = 0.35 - 0.9 * (1 - s2) * (1 - s2); P.eL = -0.35 - 0.3 * (1 - s1); P.aLz = 0.1 + 0.2 * s1; P.hL = 0.4 * s1;
              P.aR = 0.55 * (1 - s2) - 0.4 * s2; P.eR = -0.55; P.aRz = -0.35 + 0.15 * s2; P.hR = 0.5 * (1 - s2);
            }
          } else if (this.moveType === 'back') {
            // dans le dos : le buste tourne vers l'ancienne main, le bras enroule derrière les hanches, l'autre main récupère sur le côté
            const s1 = Math.min(1, k * 1.5), s2 = Math.max(0, (k - 0.45) / 0.55), dir = newL ? 1 : -1;
            P.torsoY = -dir * 0.55 * q; P.torsoX += 0.12 * q; P.bob -= 0.05 * q;
            if (newL) {
              P.aR = 0.25 + 0.85 * s1 * (1 - s2); P.aRz = -0.9 * s1 * (1 - 0.6 * s2); P.eR = -0.9 + 0.5 * s2; P.hR = 0.3 * s1;
              P.aL = -0.15 - 0.35 * s2; P.eL = -0.75; P.aLz = 0.75 * (1 - 0.6 * s2); P.hL = -0.2 * s2;
            } else {
              P.aL = 0.25 + 0.85 * s1 * (1 - s2); P.aLz = 0.9 * s1 * (1 - 0.6 * s2); P.eL = -0.9 + 0.5 * s2; P.hL = 0.3 * s1;
              P.aR = -0.15 - 0.35 * s2; P.eR = -0.75; P.aRz = -0.75 * (1 - 0.6 * s2); P.hR = -0.2 * s2;
            }
            if (newL) { P.tR = -0.35 * q; P.kR = 0.55 * q; P.kL = 0.35 * q; } else { P.tL = -0.35 * q; P.kL = 0.55 * q; P.kR = 0.35 * q; }
          } else { P.kL += 0.3 * q; P.kR += 0.3 * q; }
        }
        if (this.spinT > 0) { P.aL = -0.9; P.aR = -0.9; P.eL = -1.6; P.eR = -1.6; P.aLz = 0.3; P.aRz = -0.3; P.torsoX = 0.2; }
      }
    }

    // Réception : les deux bras partent vers la balle puis la ramènent au buste. C'était le geste le plus fréquent
    // du jeu et il n'existait pas : chaque possession commençait par une balle qui se téléportait dans la main.
    if (this.catchT > 0) {
      const k = 1 - Math.max(0, this.catchT) / 0.38, ouvre = Math.sin(Math.min(1, k * 1.5) * Math.PI);
      P.aL = -0.6 - 0.55 * ouvre; P.aR = -0.6 - 0.55 * ouvre;
      P.eL = -0.45 - 0.75 * (1 - ouvre); P.eR = -0.45 - 0.75 * (1 - ouvre);
      P.aLz = 0.32 * ouvre; P.aRz = -0.32 * ouvre; P.torsoX = 0.1 * ouvre; P.headX = -0.1 * ouvre;
    }
    // REBOND. Trois temps, comme dans la réalité : les deux bras montent chercher la balle le plus haut
    // possible, ils la SERRENT d'un coup contre la poitrine (c'est le geste qui dit « elle est à moi »), et le
    // buste se referme dessus pendant que les jambes encaissent la retombée.
    if (this.rebondT > 0) {
      const k = 1 - Math.max(0, this.rebondT) / 0.6;                 // 0 = balle touchée, 1 = geste fini
      const haut = 1 - Math.min(1, k / 0.22);                        // bras encore tendus au-dessus
      const serre = Math.min(1, Math.max(0, (k - 0.16) / 0.42));     // rapatriement au buste
      const fin = Math.min(1, Math.max(0, (k - 0.7) / 0.3));         // retour à la normale
      const m = 1 - fin;
      // -2,95 = bras VRAIMENT tendu au-dessus de la tête. Repère utile sur ce squelette : -2,25 met déjà la main
      // au front (c'est la valeur de l'armé du tir), il faut donc aller bien plus loin pour aller chercher un
      // ballon en hauteur — à -2,25 le joueur avait l'air de se protéger le visage, pas de prendre un rebond.
      // Repères mesurés sur ce squelette (main droite, épaule à 1,45 m) : aR = -2,2 met la main à 1,44 m,
      // -2,6 à 1,60 m, -3,05 à 1,80 m. L'armé du tir est à -2,25, c'est-à-dire la main au front : pour ALLER
      // CHERCHER un ballon il faut descendre bien plus bas dans les négatifs, sinon le joueur a l'air de se
      // protéger le visage. Et l'écart latéral reste petit en haut, sinon les bras partent en croix.
      P.aL = (-3.05 * haut - 0.85 * (1 - haut) - 0.15 * serre) * m;
      P.aR = (-3.05 * haut - 0.85 * (1 - haut) - 0.15 * serre) * m;
      P.eL = (-0.12 - 1.5 * serre) * m; P.eR = (-0.12 - 1.5 * serre) * m;
      P.aLz = (0.14 * haut + 0.42 * serre) * m; P.aRz = (-0.14 * haut - 0.42 * serre) * m;
      P.hL = -0.35 * serre * m; P.hR = -0.35 * serre * m;
      P.torsoX = (-0.16 * haut + 0.30 * serre) * m;                  // dos cambré en l'air, refermé à la réception
      P.headX = (0.34 * haut - 0.12 * serre) * m;                    // on regarde la balle
      P.torsoY = 0.22 * serre * m * (this.dribbleHand === 'R' ? -1 : 1);   // on protège du côté opposé
      if (this.airborne) {                                           // en l'air : jambes groupées, corps gainé
        P.kL = 0.55 * m; P.kR = 0.35 * m; P.tL = -0.22 * m; P.tR = -0.05 * m;
      } else {                                                       // au sol : on encaisse la retombée
        const enc = Math.sin(Math.min(1, Math.max(0, (k - 0.15) / 0.6)) * Math.PI);
        P.kL = 0.12 + 0.95 * enc; P.kR = 0.12 + 0.95 * enc;
        P.tL = -0.42 * enc; P.tR = -0.42 * enc; P.bob = -0.19 * enc;
      }
    }
    // COUP D'ÉPAULE. L'épaule côté cible part en avant, l'avant-bras vient barrer, le buste pivote et le poids
    // passe sur la jambe avant. On garde le clip des jambes en dessous : c'est un geste du haut du corps.
    if (this.bumpT > 0) {
      const k = 1 - Math.max(0, this.bumpT) / 0.42;
      const pousse = Math.sin(Math.min(1, k * 1.25) * Math.PI);      // monte vite, redescend
      const d = this.bumpSide >= 0 ? 1 : -1;                         // +1 = épaule droite
      P.torsoY = -d * 0.62 * pousse; P.torsoX = 0.26 * pousse; P.bob = -0.08 * pousse;
      if (d > 0) {
        P.aR = -1.05 - 0.35 * pousse; P.eR = -1.5 + 1.15 * pousse; P.aRz = -0.55 * pousse; P.hR = 0.45 * pousse;
        P.aL = -0.35 - 0.3 * pousse; P.eL = -1.35; P.aLz = 0.45 * pousse;
      } else {
        P.aL = -1.05 - 0.35 * pousse; P.eL = -1.5 + 1.15 * pousse; P.aLz = 0.55 * pousse; P.hL = 0.45 * pousse;
        P.aR = -0.35 - 0.3 * pousse; P.eR = -1.35; P.aRz = -0.45 * pousse;
      }
      P.headX = -0.1 * pousse;
    }
    // Passe : armé court au buste puis extension des deux bras. La pose existait mais n'était jamais atteinte.
    if (this.passT > 0) {
      const k = 1 - Math.max(0, this.passT) / 0.35;
      const arme = k < 0.35 ? k / 0.35 : 1, ext = k < 0.35 ? 0 : (k - 0.35) / 0.65;
      P.aL = -0.5 - 0.35 * arme - 0.55 * ext; P.aR = -0.5 - 0.35 * arme - 0.55 * ext;
      P.eL = -1.35 + 1.15 * ext; P.eR = -1.35 + 1.15 * ext;
      P.aLz = 0.2 - 0.12 * ext; P.aRz = -0.2 + 0.12 * ext;
      P.torsoX = 0.12 * arme - 0.14 * ext; P.hL = 0.5 * ext; P.hR = 0.5 * ext;
    }
    if (st === 'windup') {
      // armé du tir : flexion des jambes, balle montée au front
      const w = Math.min(1, this.windup / 0.72);
      P.tL = -0.45 * w; P.tR = -0.45 * w; P.kL = 0.75 * w; P.kR = 0.75 * w; P.bob = -0.14 * w; P.torsoX = 0.05;
      P.aR = lerp(-1.2, -2.25, w); P.eR = lerp(-1.6, -1.7, w); P.aRz = -0.15;
      P.aL = lerp(-1.1, -1.95, w); P.eL = -1.5; P.aLz = 0.35; P.headX = -0.15;
    }
    // Feinte de tir : on rejoue l'armé à l'envers, le joueur remonte la balle puis la redescend.
    if (this.fakeT > 0 && st === 'idle') {
      const w = Math.sin(Math.min(1, 1 - this.fakeT / 0.45) * Math.PI);
      P.tL = -0.4 * w; P.tR = -0.4 * w; P.kL = 0.65 * w; P.kR = 0.65 * w; P.bob = -0.12 * w;
      P.aR = -1.2 - 1.0 * w; P.eR = -1.6; P.aRz = -0.15;
      P.aL = -1.1 - 0.8 * w; P.eL = -1.5; P.aLz = 0.35; P.headX = -0.12 * w;
    }
    if (st === 'shoot') {
      const r = this.released;
      P.tL = -0.15; P.tR = -0.15; P.kL = 0.2; P.kR = 0.2;
      P.aR = r ? -2.95 : -2.4; P.eR = r ? -0.15 : -1.2; P.hR = r ? 0.9 : -0.6;
      P.aL = r ? -2.4 : -2.0; P.eL = r ? -0.4 : -1.3; P.aLz = 0.3; P.aRz = -0.1; P.headX = -0.3;
      if (!this.airborne) { P.kL = 0.6; P.kR = 0.6; P.tL = -0.35; P.tR = -0.35; P.bob = -0.1; }
    }
    if (st === 'layup') {
      // (le genou qui monte est celui du côté de la main qui pose : impulsion sur l'autre pied — c'était l'inverse)
      P.aR = -2.9; P.eR = -0.2; P.hR = this.released ? 0.8 : -0.4;
      P.aL = -1.0; P.eL = -1.2; P.aLz = 0.4;
      P.tR = -1.2; P.kR = 1.3; P.tL = 0.1; P.kL = 0.1; P.torsoX = 0.1;
      if (this.mainFinale === 'L') miroirPose(P);
    }
    if (st === 'dunk') {
      // dunk : bras tendu au-dessus de la tête avec la balle jusqu'au cercle, puis le poignet claque vers le bas
      const r = this.released;
      if (this.dunkStyle === 'two') {
        P.aR = r ? -1.75 : -3.05; P.aL = r ? -1.75 : -3.05; P.eR = r ? -0.75 : -0.08; P.eL = r ? -0.75 : -0.08;
        P.aRz = -0.2; P.aLz = 0.2; P.hR = r ? 0.7 : -0.55; P.hL = r ? 0.7 : -0.55;
      } else {
        P.aR = r ? -1.95 : -3.08; P.eR = r ? -0.55 : -0.05; P.aRz = -0.08; P.hR = r ? 0.75 : -0.6;
        P.aL = -1.35; P.eL = -1.1; P.aLz = 0.5;
      }
      P.tL = -0.65; P.tR = -0.3; P.kL = 1.25; P.kR = 0.75; P.torsoX = r ? 0.2 : -0.12; P.headX = -0.3;
      if (this.mainFinale === 'L' && this.dunkStyle !== 'two') miroirPose(P);
    }
    if (st === 'idle' && this.airborne) {
      // SAUT DE CONTRE (06/10/2026) : les deux bras montent, celui du côté du tir plus haut et un peu vers lui — il
      // va chercher le ballon au lieu de lever les bras en croix. Avec un avatar, c'est le clip de contre qui
      // donne le corps et les jambes ; ces bras-là ne servent qu'au bonhomme en primitives et au rebond.
      P.aL = -2.9; P.aR = -2.9; P.eL = -0.1; P.eR = -0.1; P.aLz = 0.15; P.aRz = -0.15; P.tL = -0.3; P.tR = -0.3; P.kL = 0.5; P.kR = 0.5;
      P.torsoX = -0.08; P.headX = -0.25;
    }
    if (st === 'celebrate') {
      const k = Math.sin(t * 10);
      P.aL = -2.6 + k * 0.2; P.aR = -2.6 - k * 0.2; P.eL = -0.5; P.eR = -0.5; P.aLz = 0.5; P.aRz = -0.5;
      P.bob = Math.abs(Math.sin(t * 8)) * 0.06;
    }
    if (this.emote) {
      // emote sans clip (bonhomme procédural) : petites chorégraphies maison
      const e = this.emote, tt = e.t, s = e.proc;
      if (s === 'dance') {
        const k = Math.sin(tt * 8), k2 = Math.sin(tt * 4);
        P.aL = -1.6 + 0.9 * k; P.aR = -1.6 - 0.9 * k; P.eL = -1.2; P.eR = -1.2; P.aLz = 0.6; P.aRz = -0.6;
        P.torsoY = 0.35 * k2; P.torsoX = 0.1; P.bob = Math.abs(Math.sin(tt * 8)) * 0.07;
        P.kL = 0.35 + 0.25 * Math.abs(k); P.kR = 0.35 + 0.25 * Math.abs(k); P.tL = -0.2; P.tR = -0.2;
      } else if (s === 'flap') {
        const k = Math.abs(Math.sin(tt * 9));
        P.aL = -0.3; P.aR = -0.3; P.aLz = 1.2 - 0.9 * k; P.aRz = -1.2 + 0.9 * k; P.eL = -2.4; P.eR = -2.4;
        P.bob = k * 0.05; P.kL = 0.5; P.kR = 0.5; P.tL = -0.25; P.tR = -0.25;
      } else if (s === 'arms') {
        const ph = Math.floor(tt * 1.5) % 4;
        P.aL = -3.0; P.aR = -3.0; P.aLz = [0.6, 0.15, 0.4, 0.15][ph]; P.aRz = [-0.6, -0.15, -0.4, -0.15][ph];
        P.eL = [-0.2, -0.3, -1.4, -0.9][ph]; P.eR = [-0.2, -0.3, -1.4, -0.9][ph]; P.bob = Math.abs(Math.sin(tt * 6)) * 0.04;
      } else if (s === 'clap') {
        const k = Math.abs(Math.sin(tt * 10));
        P.aL = -1.4; P.aR = -1.4; P.eL = -1.5; P.eR = -1.5; P.aLz = 0.5 - 0.45 * k; P.aRz = -0.5 + 0.45 * k;
      } else if (s === 'taunt') {
        const k = Math.sin(tt * 6);
        P.aL = -1.2; P.eL = -1.3; P.aLz = 0.4 + 0.3 * k; P.torsoX = -0.15; P.torsoY = 0.2 * k;
      } else if (s === 'muscles') {
        // double biceps : bras à l'horizontale, avant-bras repliés, buste gonflé, léger balancement
        const k = Math.sin(tt * 3.4);
        P.aL = -1.55; P.aR = -1.55; P.aLz = 1.15; P.aRz = -1.15; P.eL = -2.5 - 0.15 * k; P.eR = -2.5 - 0.15 * k;
        P.torsoX = -0.12; P.torsoY = 0.18 * k; P.headX = -0.12; P.kL = 0.3; P.kR = 0.3; P.tL = -0.18; P.tR = -0.18;
        P.bob = -0.03 + 0.012 * Math.sin(tt * 6.8);
      } else if (s === 'robot') {
        // saccadé : tout se déplace par crans, rien n'est continu
        const st4 = Math.floor(tt * 4) % 4, q = [0, 1, 0, -1][st4];
        P.aL = -1.5; P.aR = -1.5; P.aLz = 0.15; P.aRz = -0.15;
        P.eL = -1.5 - 0.9 * Math.max(0, q); P.eR = -1.5 + 0.9 * Math.min(0, q);
        P.torsoY = 0.28 * q; P.headX = 0.12 * q;
        P.kL = 0.25 + 0.2 * Math.max(0, q); P.kR = 0.25 + 0.2 * Math.max(0, -q); P.bob = -0.02;
      } else if (s === 'facepalm') {
        // la main monte vers le front puis la tête tombe
        const k = Math.min(1, tt * 2.2), d = Math.min(1, Math.max(0, (tt - 0.5) * 1.6));
        P.aR = -2.55 * k; P.eR = -1.9 * k; P.aRz = -0.45 * k; P.hR = -0.4 * k;
        P.headX = 0.45 * d; P.torsoX = 0.22 * d; P.aL = -0.25; P.eL = -0.5; P.kL = 0.2; P.kR = 0.2;
      } else if (s === 'sleep') {
        // debout, bras ballants, tête qui dodeline, genoux qui plient doucement
        const k = Math.sin(tt * 1.5), k2 = Math.sin(tt * 0.8);
        P.headX = 0.34 + 0.12 * k; P.torsoX = 0.16 + 0.05 * k2;
        P.aL = -0.12; P.aR = -0.12; P.eL = -0.35; P.eR = -0.35; P.aLz = 0.12; P.aRz = -0.12;
        P.kL = 0.22 + 0.06 * k2; P.kR = 0.22 + 0.06 * k2; P.bob = -0.02 + 0.02 * k2;
      } else if (s === 'moonwalk') {
        // glissé arrière : une jambe tendue traîne pendant que l'autre se plie, buste penché, bras qui contre-balancent
        const k = Math.sin(tt * 5), a = Math.sin(tt * 5 + Math.PI);
        P.tL = -0.5 * k; P.tR = -0.5 * a;
        P.kL = 0.15 + 0.7 * Math.max(0, k); P.kR = 0.15 + 0.7 * Math.max(0, a);
        P.torsoX = 0.2; P.headX = -0.1;
        P.aL = 0.5 * a; P.aR = 0.5 * k; P.eL = -1.1; P.eR = -1.1; P.aLz = 0.3; P.aRz = -0.3;
        P.bob = -0.02 + Math.abs(k) * 0.02;

      // ================= RÉPARATIONS =================
      // Signes relevés dans les branches existantes : aL/aR négatif = bras vers l'avant puis le haut
      // (-1,55 = horizontal, -2,9 = tendu au-dessus de la tête) ; aLz POSITIF écarte le bras gauche vers
      // l'extérieur, donc aLz négatif + aRz positif croise les bras devant le buste ; eL/eR négatif replie
      // l'avant-bras ; torsoX positif penche en avant ; headX positif baisse le menton ; bob est en mètres
      // MONDE ajoutés à la hauteur du mesh — la posture défensive descend de 0,16 pour 0,90 de genou, et
      // au-delà de ce rapport le personnage traverse le sol.
      } else if (s === 'pompes') {
        // LE GAINAGE. Le corps reste droit comme une planche : c'est le groupe entier qui bascule autour des
        // pointes de pieds (Couches.dynamique), et les mains sont plantées au sol par cinématique inverse
        // (Couches.os). Ici : jambes tendues serrées, pieds en extension (on est sur les orteils), tête qui
        // se relève pour regarder devant, bras déjà vers l'avant pour que l'IK parte d'une pose voisine.
        // Le groupe monte de 10 cm : la cheville est à cette hauteur quand on est sur la pointe des pieds.
        const k = Math.min(1, tt / 0.7);
        P.tL = 0; P.tR = 0; P.tLz = 0.02; P.tRz = 0.02; P.kL = 0.03; P.kR = 0.03;
        P.torsoX = 0; P.headX = -0.55 * k;
        P.aL = -1.45 * k; P.aR = -1.45 * k; P.aLz = 0.25 * k; P.aRz = -0.25 * k; P.eL = -0.1; P.eR = -0.1;
        P.bob = 0.10 * k;

      } else if (s === 'squat') {
        // Des flexions : c'était le repli quand les pompes étaient impossibles. Elles existent maintenant
        // (s === 'pompes'), les flexions restent une emote à part entière.
        const c = 0.5 - 0.5 * Math.cos(tt * 3.6);
        P.kL = 0.15 + 1.20 * c; P.kR = 0.15 + 1.20 * c;
        P.tL = -0.10 - 0.75 * c; P.tR = -0.10 - 0.75 * c; P.tLz = 0.18; P.tRz = 0.18;
        P.torsoX = 0.08 + 0.34 * c; P.headX = -0.12 * c;
        P.aL = -0.10 - 1.45 * c; P.aR = -0.10 - 1.45 * c; P.eL = -0.25; P.eR = -0.25; P.aLz = 0.20; P.aRz = -0.20;
        P.bob = -0.24 * c;

      } else if (s === 'salut') {
        // Une RAMPE et non un sinus : le lissage de la pose noierait un geste aussi court.
        const up = Math.min(1, tt / 0.18), down = Math.min(1, Math.max(0, (tt - 1.5) / 0.35)), k = up * (1 - down);
        P.aR = -0.15 - 1.35 * k; P.aRz = -0.15 - 0.85 * k; P.eR = -0.30 - 2.05 * k; P.hR = -0.35 * k;
        P.aL = 0.05; P.aLz = 0.08; P.eL = -0.10;
        P.tLz = 0.06; P.tRz = 0.06; P.kL = 0.04; P.kR = 0.04; P.torsoX = -0.05; P.headX = -0.04; P.bob = 0.012 * k;

      } else if (s === 'telephone') {
        const m = Math.min(1, tt / 0.30), k = Math.sin(tt * 4.2);
        P.aR = -0.20 - 1.15 * m; P.aRz = -0.10 - 0.55 * m; P.eR = -0.30 - 2.00 * m; P.hR = -0.25 * m;
        P.aL = 0.25; P.aLz = 0.75; P.eL = -1.95;
        P.torsoY = 0.16 * k * m; P.headX = 0.06 + 0.05 * k; P.torsoX = -0.05; P.kL = 0.16; P.kR = 0.16;

      } else if (s === 'couronne') {
        const m = Math.min(1, tt / 0.55), d = Math.min(1, Math.max(0, (tt - 0.7) / 0.45));
        P.aL = -2.05 - 0.55 * m; P.aR = -2.05 - 0.55 * m;
        P.aLz = 0.55 - 0.30 * d; P.aRz = -0.55 + 0.30 * d;
        P.eL = -0.35 - 1.25 * d; P.eR = -0.35 - 1.25 * d; P.hL = -0.30 * d; P.hR = -0.30 * d;
        P.headX = -0.05 - 0.14 * d; P.torsoX = -0.06 * d; P.kL = 0.14; P.kR = 0.14; P.bob = 0.015 * d;

      // ================= NOUVELLES, aucun fichier =================
      } else if (s === 'croise') {
        const k = Math.sin(tt * 1.6);
        P.aL = -1.40; P.aR = -1.32; P.aLz = -0.62; P.aRz = 0.50;
        P.eL = -2.45; P.eR = -2.60; P.hL = -0.20; P.hR = -0.20;
        P.torsoX = -0.06; P.torsoY = 0.07 * k; P.headX = -0.10;
        P.tLz = 0.12; P.kL = 0.10; P.kR = 0.26; P.bob = -0.02;

      } else if (s === 'pointer') {
        const m = Math.min(1, tt / 0.22), k = Math.sin(tt * 5.5);
        P.aR = -0.20 - 1.42 * m; P.aRz = -0.18 + 0.06 * k; P.eR = -0.12; P.hR = -0.12;
        P.aL = 0.10; P.aLz = 0.35; P.eL = -0.80;
        P.torsoX = -0.04 + 0.05 * Math.max(0, k); P.headX = 0.05 + 0.07 * k; P.kL = 0.14; P.kR = 0.14;

      } else if (s === 'chrono') {
        const m = Math.min(1, tt / 0.25), tap = Math.max(0, Math.sin(tt * 7.5));
        P.aL = -0.55 * m; P.aLz = -0.50 * m; P.eL = -2.15 * m; P.hL = -0.50 * m;
        P.aR = -0.50 * m; P.aRz = 0.42 * m; P.eR = (-1.75 - 0.35 * tap) * m; P.hR = -0.30 * m;
        P.torsoX = 0.07 * m; P.headX = 0.22 * m; P.kL = 0.12; P.kR = 0.12;

      } else if (s === 'epaule') {
        // aRz positif croise le bras droit devant le buste : il balaie l'épaule GAUCHE.
        const m = Math.min(1, tt / 0.25), sw = Math.sin(tt * 3.6);
        P.aR = (-1.25 - 0.35 * sw) * m; P.aRz = (0.82 - 0.42 * sw) * m; P.eR = (-1.95 + 0.25 * sw) * m; P.hR = -0.25 * m;
        P.aL = -0.18; P.aLz = 0.30; P.eL = -0.55;
        P.torsoY = -0.12 * m; P.headX = -0.13 * m; P.torsoX = -0.05; P.kL = 0.12; P.kR = 0.12;

      } else if (s === 'troppetit') {
        const m = Math.min(1, tt / 0.25), k = Math.sin(tt * 6);
        P.aR = (-0.42 + 0.06 * k) * m; P.aRz = -0.95 * m; P.eR = -1.52 * m; P.hR = (-1.10 + 0.15 * k) * m;
        P.aL = 0.15; P.aLz = 0.60; P.eL = -1.85;
        P.torsoY = -0.14 * m; P.headX = -0.14 * m; P.torsoX = -0.04; P.kL = 0.12; P.kR = 0.12;

      } else if (s === 'nonnon') {
        // Le doigt est impossible : le rig referme tous les doigts ensemble. C'est donc l'avant-bras levé
        // qui balaie — ça se lit très bien, mais je ne prétends pas faire le doigt.
        const m = Math.min(1, tt / 0.20), k = Math.sin(tt * 6.5);
        P.aR = -1.05 * m; P.aRz = (-0.32 + 0.45 * k) * m; P.eR = -1.50 * m; P.hR = -0.15 * m;
        P.aL = 0.12; P.aLz = 0.45; P.eL = -1.70;
        P.torsoY = 0.10 * k * m; P.headX = -0.08; P.kL = 0.12; P.kR = 0.12;

      } else if (s === 'shimmy') {
        const k = Math.sin(tt * 11), k2 = Math.sin(tt * 2.2);
        P.torsoY = 0.30 * k; P.torsoX = -0.06;
        P.aL = -0.85 + 0.25 * k; P.aR = -0.85 - 0.25 * k; P.aLz = 0.75; P.aRz = -0.75; P.eL = -1.50; P.eR = -1.50;
        P.headX = -0.06 + 0.04 * k2;
        P.kL = 0.30 + 0.08 * k2; P.kR = 0.30 - 0.08 * k2; P.tL = -0.12; P.tR = -0.12; P.bob = -0.05;

      } else if (s === 'mainor') {
        // Tir à trois points sans ballon, et on GARDE le poignet cassé en l'air : le suivi classique.
        const arm = Math.min(1, tt / 0.35), rel = Math.min(1, Math.max(0, (tt - 0.45) / 0.22));
        P.aR = -0.90 * arm - 1.95 * rel; P.eR = -2.30 * arm + 2.15 * rel; P.hR = -0.35 * arm + 0.95 * rel; P.aRz = -0.20;
        P.aL = -1.25 * arm + 0.35 * rel; P.eL = -1.70 * arm + 0.60 * rel; P.aLz = 0.35;
        P.kL = 0.50 - 0.35 * rel; P.kR = 0.50 - 0.35 * rel; P.tL = -0.35 + 0.25 * rel; P.tR = -0.35 + 0.25 * rel;
        P.torsoX = 0.14 - 0.16 * rel; P.headX = -0.18 * rel; P.bob = -0.09 + 0.09 * rel;

      } else if (s === 'lacets') {
        // Le corps DESCEND vraiment : impossible avec un clip, la hauteur du mesh est forcée à zéro dès
        // qu'un clip pilote. bob est borné à -0,20 pour ne pas traverser le sol.
        const k = Math.min(1, tt * 2.4), w = Math.sin(tt * 7.0) * 0.12 * k;
        P.bob = -0.20 * k; P.torsoX = 0.72 * k; P.headX = 0.38 * k;
        P.tL = -1.45 * k; P.kL = 1.85 * k; P.tR = -0.30 * k; P.kR = 1.45 * k;
        P.aL = -0.95 * k + w; P.aR = -0.95 * k - w; P.eL = -1.55 * k; P.eR = -1.55 * k;

      } else if (s === 'etirement') {
        const ph = Math.floor(tt / 1.6) % 2, k = Math.min(1, (tt % 1.6) / 0.35);
        if (ph === 0) { P.aL = -1.50; P.aLz = -0.95 * k; P.eL = -0.15; P.aR = -1.35; P.aRz = 0.55 * k; P.eR = -0.30 - 1.55 * k; P.torsoY = -0.12 * k; }
        else          { P.aR = -1.50; P.aRz = 0.95 * k; P.eR = -0.15; P.aL = -1.35; P.aLz = -0.55 * k; P.eL = -0.30 - 1.55 * k; P.torsoY = 0.12 * k; }
        P.headX = -0.05; P.kL = 0.14; P.kR = 0.14; P.bob = -0.01;

      } else {
        const k = Math.sin(tt * 10);
        P.aL = -2.6 + k * 0.2; P.aR = -2.6 - k * 0.2; P.eL = -0.5; P.eR = -0.5; P.aLz = 0.5; P.aRz = -0.5; P.bob = Math.abs(Math.sin(tt * 8)) * 0.06;
      }
    }
    if (this.swipeT > 0) {
      // tentative de vol : le bras droit balaie vers l'avant
      const q = Math.sin((this.swipeT / 0.3) * Math.PI);
      P.aR = -0.6 - 1.3 * q; P.eR = -0.4; P.aRz = 0.4 - 0.6 * q; P.torsoX += 0.2 * q;
    }
    if (this.stun > 0) { P.torsoX -= 0.25; P.aL = 0.6; P.aR = 0.6; P.aLz = 0.6; P.aRz = -0.6; }
    this._poseTel(P);
    return P;
  }

  update(dt) {
    // Les couches du pas précédent (regard, respiration...) sont retirées AVANT tout le reste : le mélangeur
    // de clips ne doit jamais les voir (voir AvatarRig.couchesAnnuler).
    if (this.avatar) { this.avatar.couchesAnnuler(OS_COUCHES); this.avatar.surAnnuler(); }   // (puis nos reprises, voir AvatarRig.surDebut)
    if (this.airborne) {
      this.jumpVel -= G * dt; this.jumpY += this.jumpVel * dt;
      // l'amorti de genoux etait du code mort : landT n'etait jamais pose
      if (this.jumpY <= 0) { if (this.airborne) { this.landT = Math.min(0.28, 0.07 + Math.abs(this.jumpVel) * 0.04); this.jumpVelSol = this.jumpVel; } this.jumpY = 0; this.jumpVel = 0; this.airborne = false; }
    }
    // la marche montée sur le relief se rattrape en 0,08 s (toujours 0 sur un terrain plat)
    if (this.yLisse) { this.yLisse *= Math.exp(-dt / 0.08); if (this.yLisse > -1e-3) this.yLisse = 0; }
    this.stun = Math.max(0, this.stun - dt);
    this.stealCd = Math.max(0, this.stealCd - dt);
    this.swipeT = Math.max(0, this.swipeT - dt); this.passT = Math.max(0, this.passT - dt);
    this.rebondT = Math.max(0, this.rebondT - dt);
    this.bumpT = Math.max(0, this.bumpT - dt); this.bumpCd = Math.max(0, this.bumpCd - dt);
    this.postT = Math.max(0, this.postT - dt); this.postCd = Math.max(0, this.postCd - dt);
    // Les trois temps de la mise au sol. La bascule de phase est lue par _driveAnim, qui change de clip.
    if (this.chuteT > 0) {
      this.chuteT = Math.max(0, this.chuteT - dt);
      const e = this.chuteTot - this.chuteT;
      this.chutePh = e < 0.80 ? 'chute' : e < this.chuteTot - 1.25 ? 'sol' : 'lever';
    }
    if (this.contactT > 0) this.contactT -= dt;
    if (this.boxOutT > 0) this.boxOutT -= dt;
    if (this.catchT > 0) this.catchT -= dt;
    if (this.reculFinT > 0) this.reculFinT -= dt;
    if (this.stepT > 0 || this.retraitT > 0) {
      this.stepT = Math.max(0, this.stepT - dt); this.retraitT = Math.max(0, this.retraitT - dt);
      if (!this.hasBall || this.state !== 'idle' || this.stun > 0) { this.stepT = 0; this.retraitT = 0; }
      else { this.faceWant.copy(this.capFige); if (this.stepT <= 0 && this.retraitT <= 0) this.reculFinT = 0.4; }
    }
    if (this.spinAttenteT > 0) {
      this.spinAttenteT -= dt;
      const dcs = this.dribble, libre = !(this.crossT >= 0 || dcs.croise.attente || dcs.croise.actif);
      if (!this.hasBall || this.state !== 'idle' || this.airborne) this.spinAttenteT = 0;
      else if (libre && (this.spinAttenteT <= 0 || dcs.prenable())) { this.spinAttenteT = 0; this.spin(); }
      else if (this.spinAttenteT <= 0) this.spinAttenteT = 0;
    }
    if (this.tirAttenteT > 0) {
      this.tirAttenteT -= dt;
      if (!this.hasBall || this.state !== 'idle' || this.airborne) this.tirAttenteT = 0;
      else if (this.tirAttenteT <= 0 || this.dribble.prenable()) { this.tirAttenteT = 0; this.state = 'windup'; this.windup = 0; if (this.hoop) this.faceTo(this.hoop); }
    }
    if (this.assistFrom > 0) this.assistFrom -= dt;
    if (this.fakeT > 0) this.fakeT -= dt;
    if (this.fakeCd > 0) this.fakeCd -= dt;
    if (this.landT > 0) this.landT -= dt;
    if (this.dribbleMoveT > 0) { this.dribbleMoveT -= dt; if (!this.hasBall || this.speedNow > 0.1 || this.state !== 'idle') this.dribbleMoveT = 0; }
    if (this.emote) {
      const e = this.emote; e.t += dt;
      const clipDone = !e.loop && this.anim && this.anim.has(e.clip) && this.animKey && this.animKey.startsWith(e.clip) && this.anim.finished;
      const procDone = !e.loop && !(this.anim && this.anim.has(e.clip)) && e.t > 3;
      // À distance, c'est l'émetteur qui dit quand l'emote s'arrête : l'arrêter ici la ferait repartir au paquet suivant.
      if (!this.remote && (this.state !== 'idle' || this.airborne || this.stun > 0 || (this.speedNow > 0.1 && e.t > 0.3) || e.t > 14 || clipDone || procDone)) this.stopEmote();
    }
    this.handCd = Math.max(0, this.handCd - dt);
    if (this.gesteManuelT > 0) this.gesteManuelT -= dt;
    this.ankleCd = Math.max(0, this.ankleCd - dt);
    // (le chambrage ne s'écoule qu'au sol : il part à la retombée du contre, et son clip dure exactement sa minuterie)
    this.pickupT = Math.max(0, this.pickupT - dt); if (!this.airborne) this.tauntT = Math.max(0, this.tauntT - dt);
    // virage vif (faceTo) : si personne n'a fait tourner le joueur à ce pas (move() n'est pas appelé pour lui), on le fait ici
    if (this.virageVif > 0) { this.virageVif -= dt; if (!this._aTourne && !this.remote) this.turnTo(this.faceWant, dt); }
    this._aTourne = false;
    if (this.tel) {
      const T = this.tel;
      T.t += dt; T.tape = Math.max(0, T.tape - dt);
      // pour écrire on prend le téléphone À DEUX MAINS (sauf ballon sous le bras) ; on relâche la gauche
      // une demi-seconde après la dernière touche
      T.deux = Math.max(0, Math.min(1, (T.deux || 0) + ((T.tape > 0 && !this.hasBall) ? dt / 0.22 : -dt / 0.5)));
      T.k = Math.max(0, Math.min(1, T.k + (T.sortir ? -dt / 0.35 : dt / 0.45)));
      if (T.sortir && T.k <= 0) this.tel = null;
    }
    if (this.spinT > 0) { this.spinT -= dt; if (this.spinT <= 0 && this.spinMainApres) { this.dribbleHand = this.spinMainApres; this.spinMainApres = null; } }
    if (this.crossT >= 0) { this.crossT += dt / (this.moveDur || 0.26); if (this.crossT >= 1) { this.crossT = -1; this.moveClip = null; this.moveRythme = false; } }
    this.dribble.pre(dt);                                  // le dribble en course prend ou rend le ballon
    if (this.state === 'shoot' || this.state === 'layup' || this.state === 'dunk') {
      this.stateT += dt;
      if (this.state !== 'shoot' && !this.remote) this.lunge(dt);   // à distance, la position vient du réseau
      if (!this.airborne && this.released && this.stateT > 0.45) { this.state = 'idle'; this.dunkTo = null; }
    } else this.dunkTo = null;
    // rythme du dribble : calé sur le clip de course (une frappe par foulée) sinon oscillateur libre
    if (this.hasBall && this.state === 'idle' && !this.dribble.controle) {
      const A = this.anim, d = A && this.animKey ? A.defs[this.animKey] : null;
      // En mélange de locomotion il n'y a plus de « clip courant » : c'est la phase de foulée qui donne le
      // rythme, et comme un cycle vaut deux appuis, on frappe la balle deux fois par cycle.
      if (this.locoActif) this.dribbleT = this.locoPhase * Math.PI * 4 + 1.2;
      else if (A && A.current && this.armsOverride && d && d.speedRef) this.dribbleT = (A.time / A.current.getClip().duration) * Math.PI * 2 + 1.2;
      else this.dribbleT += dt * (this.speedNow > 0.1 ? 9.5 : 6.5);
      this.dribblePhase = 0.5 + 0.5 * Math.sin(this.dribbleT);
    }

    // ---- animation ----
    this.animT += dt;
    this.walkPhase += dt * (this.speedNow > 0.1 ? 3.0 + this.speedNow * 1.6 : 0);
    if (this.rollers || this._rolCle) this._majRollers(dt);                  // (lot C4, js/rollers.js)
    // ASSIS : le coefficient monte en une demi-seconde, redescend en quatre dixiemes pour se relever,
    // et la position suit la meme courbe — le joueur recule sur le banc puis revient devant.
    if (this.assis) {
      const S = this.assis;
      S.k = Math.max(0, Math.min(1, S.k + (S.sortir ? -dt / 0.40 : dt / 0.50)));
      const e = S.k * S.k * (3 - S.k * 2);
      if (!this.remote) {                                // à distance, la position vient du réseau
        this.pos.x = S.de.x + (S.a.x - S.de.x) * e;
        this.pos.z = S.de.z + (S.a.z - S.de.z) * e;
      }
      if (S.sortir && S.k <= 0) this.assis = null;
    }
    if (this.velo) {
      const V = this.velo;
      V.k = Math.max(0, Math.min(1, V.k + (V.sortir ? -dt / 0.45 : dt / 0.55)));
      if (this.remote) {
        // Chez les autres : en selle, le vélo suit l'avatar (lissé) ; en montant ou en descendant, il reste
        // là où l'émetteur dit qu'il est. Le reste (pédalier, braquage, inclinaison...) vient du paquet.
        if (V.vl) {
          if ((V.k >= 1 && !V.sortir) || V.vl[9] === undefined) V.v.appliquerReseau(V.vl, this.pos, Math.atan2(this.facing.x, this.facing.z), dt);
          else V.v.appliquerReseau(V.vl, _v.set(V.vl[9], 0, V.vl[10]), V.vl[11], dt);
        }
        if (V.sortir && V.k <= 0) this.lacherVelo();
      } else if (V.sortir) {
        // on s'écarte du vélo vers le point de sortie
        const e = lisse(V.k);
        this.pos.x = V.fin.x + (V.v.pos.x - V.fin.x) * e;
        this.pos.z = V.fin.z + (V.v.pos.z - V.fin.z) * e;
        if (!Monde.plat) this.pos.y = Monde.sol(this.pos.x, this.pos.z);   // (sur le relief : les pieds suivent le sol)
        if (V.k <= 0) { this.setFacing(Math.sin(V.fin.cap), Math.cos(V.fin.cap)); this.lacherVelo(); }
      } else if (V.k < 1) {
        // on rejoint la selle
        const e = lisse(V.k);
        this.pos.x = V.deb.x + (V.v.pos.x - V.deb.x) * e;
        this.pos.z = V.deb.z + (V.v.pos.z - V.deb.z) * e;
        if (!Monde.plat) this.pos.y = Monde.sol(this.pos.x, this.pos.z);
        _v.set(Math.sin(V.v.cap), 0, Math.cos(V.v.cap)); this.turnTo(_v, dt);
      }
    }
    const P = this._pose(), k = damp(this.state === 'windup' ? 10 : 16, dt), cur = this.cur;
    for (const key in P) cur[key] = lerp(cur[key], P[key], k);
    let clipDriven = false;
    if (this.avatar && this.anim) clipDriven = this._driveAnim(dt);
    if (!clipDriven) this._poseDeBase();

    // (le tour se divisait par 0,5 s alors que le spin dure spinDur — 0,72 s : le joueur faisait un tour et demi)
    const spinAngle = (this.spinT > 0 && !this.clipSpin) ? (1 - this.spinT / (this.spinDur || 0.5)) * Math.PI * 2 * this.spinDir : 0;
    // avec un clip, le saut et le "bob" sont déjà dans la translation des hanches
    this.yAff = clipDriven ? 0 : this.jumpY + cur.bob;
    // FONDU DE POSE (06/10/2026) : d'un clip à la pose procédurale ou l'inverse, ou d'un clip parti sans fondu (rien
    // ne jouait), on glisse en 0,16 s depuis la dernière pose affichée au lieu de sauter d'une image à l'autre —
    // retombée d'un rebond, emote maison, s'asseoir, se faire bousculer en pleine foulée. La hauteur du saut change
    // de porteur (groupe du joueur en pose procédurale, os des hanches sous un clip) : `dy` la garde continue.
    if (this.avatar) {
      const A = this.anim;
      if (this._clipAvant !== undefined && (clipDriven !== this._clipAvant || (A && A.coupe))) {
        this.avatar.fonduDepuis(0.16, (this._yAffAvant - this.yAff) / (this.avatarScale || 1));
      }
      if (A) A.coupe = false;
      this.avatar.fonduAppliquer(dt);
      this._clipAvant = clipDriven; this._yAffAvant = this.yAff;
    }
    this.ang = Math.atan2(this.facing.x, this.facing.z) + spinAngle;
    // le corps penche (virages, accélérations) : tangage et roulis du groupe entier, voir js/couches.js
    this.couches.dynamique(dt);
    // On pose quand meme la pose EXACTE : tout ce qui lit le squelette pendant la simulation — la main qui
    // tient la balle, les contacts — doit voir l'etat du pas, pas une interpolation. L'affichage sera repris
    // une seule fois par image, a la toute fin, par presenter().
    // (hauteur = sol + hauteur au-dessus du sol : sur un terrain plat, 0 + yAff + 0, soit yAff à l'octet près)
    this._poserSol(dt, clipDriven);                        // semelles au sol sur les clips d'attente
    this.solAff = this.pos.y;
    this.posAff.set(this.pos.x, this.pos.y + this.yAff + this.yLisse + this.hRol, this.pos.z);
    this.mesh.position.copy(this.posAff);
    this.mesh.rotation.set(this.couches.tangage, this.ang, this.couches.roulis);
    this.mesh.updateMatrixWorld(true);
    this.dribble.pas(dt);                                  // ballon et cibles des mains (repère au sol du joueur)
    // regard, respiration, essoufflement, petits pas, appuis — et bras du dribble : par-dessus la pose du pas
    if (this.avatar) { this.avatar.surFin(); this.couches.os(dt); this.mesh.updateMatrixWorld(true); }
    this._suivreSolPosture(dt);                            // triple menace : semelle la plus basse (voir _poserSol)
    if (this.hasBall && !this.dribble.controle && this.avatar) this.dribble.memoriserMain(this.avatar);
    this._frais = true;                                    // un pas vient de reposer la pose de base (voir _placerSurVelo)
  }

  // Repère au sol du joueur tel qu'il est AFFICHÉ (position et lacet interpolés) : le ballon tenu y est posé à
  // l'écran, pour qu'il reste dans la main quel que soit le nombre de pas de simulation par image.
  versMondeAff(l, out) {
    const c = Math.cos(this.angAff), s = Math.sin(this.angAff), P = this.posAff;
    return out.set(P.x + c * l.x + s * l.z, l.y + (P.y - this.yAff), P.z - s * l.x + c * l.z);
  }
  // (le repère local a son origine AU SOL sous le joueur : on retire la hauteur du sol, 0 sur un terrain plat)
  versLocal(w, out) {
    const c = Math.cos(this.ang), s = Math.sin(this.ang), dx = w.x - this.pos.x, dz = w.z - this.pos.z;
    return out.set(c * dx - s * dz, w.y - this.pos.y, s * dx + c * dz);
  }

  // LES ROLLERS (lot C4, js/rollers.js), à chaque pas : chaussés sur l'avatar chargé, EN BALADE SEULEMENT et pas sur un
  // engin (ils restent aux pieds, cachés : on ne les reconstruit qu'en changeant de couleur ou d'avatar) ; le joueur est
  // soulevé de la hauteur des roues ; la foulée du patineur remplace les clips quand on patine sans ballon.
  _majRollers(dt) {
    const R = this.rollers, cle = R && this.avatar && this.avatarModel ? `${R.couleur}|${this.avatarModel.uuid}` : '';
    if (cle !== this._rolCle) {
      this._rolCle = cle;
      this._rolH = cle ? chausser(this, R.couleur) : 0;
      if (!cle) oter(this);
    }
    const vus = !!cle && this._rolH > 0 && Player.enBalade && !this.velo && !this.assisPose;
    if (this._rollersMesh) for (const g of this._rollersMesh) g.visible = vus;
    this.hRol = vus ? this._rolH : 0;
    // la foulée : en roulant sans ballon, libre de ses gestes (hystérésis : on patine au-delà de 0,8 m/s, plus sous 0,45)
    const libre = vus && !this.hasBall && this.state === 'idle' && !this.airborne && !this.emote && !(this.chuteT > 0)
      && !this.tel && this.stun <= 0;
    this._patine = libre && this.speedNow > (this._patine ? 0.45 : 0.8);
    if (this.remote) this._rolPousse = this.speedNow > 1;
    if (this._patine) this.patPhase = (this.patPhase + dt * (0.45 + 0.06 * this.speedNow) * (this._rolPousse ? 1 : 0.35)) % 1;
  }

  // La pose procédurale du pas (avatar ou bonhomme en primitives), sans clip.
  _poseDeBase() {
    const cur = this.cur;
    if (this.avatar) { this.avatar.apply(cur); return; }
    const r = this.rig;
    r.thighL.rotation.set(cur.tL, 0, cur.tLz); r.thighR.rotation.set(cur.tR, 0, -cur.tRz);
    r.kneeL.rotation.x = cur.kL; r.kneeR.rotation.x = cur.kR;
    r.armL.rotation.set(cur.aL, cur.aLy || 0, cur.aLz); r.armR.rotation.set(cur.aR, cur.aRy || 0, cur.aRz);
    r.elbowL.rotation.x = cur.eL; r.elbowR.rotation.x = cur.eR;
    r.handL.rotation.x = cur.hL; r.handR.rotation.x = cur.hR;
    r.torso.rotation.x = cur.torsoX; r.head.rotation.x = cur.headX;
  }
}

// Cylindres infranchissables poses dans le decor du terrain courant (js/game.js les recopie depuis la scene).
// C'est une propriete de CLASSE et non d'instance : tous les joueurs partagent le meme decor, et ca evite de
// la propager a chaque endroit ou l'on remet `bounds` a jour.
Player.obstacles = [];
// Interrupteur du dribble en course façon 2K (js/dribble.js) : false = l'ancien dribble partout.
Player.DRIBBLE_V2 = true;
// Le même module dribble aussi à l'arrêt (triple menace) ; false = les anciens clips de dribble sur place.
Player.DRIBBLE_SUR_PLACE = true;
// Vrai sur le DERNIER pas de simulation avant une image : l'IK des bras de dribble n'est calculée que là.
Player.poseVisible = true;
// Vrai EN BALADE seulement (Game.frame le tient à jour d'après son mode). Le relief de js/monde.js ne joue qu'en
// balade (conception, § 0, D3) : en match, même quand le parc entier est installé, chaque pas des joueurs reste
// celui d'avant à l'octet près — pas de ralentissement par la pente au bord du plateau, pas d'obstacle du parc.
Player.enBalade = false;
