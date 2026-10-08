// PASSANTS : les gens qui marchent sur les trottoirs autour du terrain (jamais dedans). Mis à jour depuis
// scene.userData.animate.
//
// Longtemps ce furent des bonshommes en boîtes. Vus à travers le grillage, c'était ce qui trahissait le plus le
// jeu : le décor avait beau être photographique, un Lego traversait la rue. Ce sont maintenant de VRAIS
// personnages : les avatars Avaturn du jeu, allégés pour la rue par tools/passants_glb.py (un seul maillage,
// textures en atlas — voir ce fichier), sur le même squelette Mixamo que les joueurs, donc avec les mêmes clips :
// la marche mocap CMU (manifeste : « walk ») et l'Idle Mixamo quand ils s'arrêtent.
//
// Ce qui fait qu'on y croit, dans l'ordre où ça se voit :
//  1. les PIEDS NE GLISSENT PAS. La marche n'est pas « jouée », elle est ÉCHANTILLONNÉE à une phase qu'on fait
//     avancer de la distance réellement parcourue divisée par la FOULÉE — et la foulée est MESURÉE sur l'avatar
//     (pied d'appui qui recule sous le bassin), pas recopiée du manifeste : un grand fait de plus grands pas ;
//  2. ils ne tournent pas sur place comme des toupies : ils suivent une « carotte » posée un peu devant eux sur
//     le trottoir et leur cap tourne à vitesse bornée. Un demi-tour devient un petit arc, une traversée un
//     virage, et ils ralentissent dans les courbes ;
//  3. ils ne traversent RIEN : le mobilier des trottoirs (arceaux, vélo garé, potelets, troncs, touffes d'herbe du
//     quai, voiture garée sur le passage piéton) est relevé dans la scène et ils le contournent ; les murs aussi —
//     un trajet qui s'enfonce dans une façade s'arrête devant elle ; entre eux, ils tiennent leur droite, se
//     croisent, doublent les lents et ceux qui se sont arrêtés, et ne se traversent jamais (voir _contacts) ; au
//     bord de la chaussée, ils laissent passer la voiture qui arrive ;
//  4. ils vivent : ils traversent (au passage piéton, par les traverses du parc) puis continuent de l'autre côté,
//     marquent un temps au bout du trottoir, s'arrêtent parfois pour regarder le match (la tête suit la balle) ;
//     et on ne met personne là où on ne le verrait jamais (voir _accessibles) ;
//  5. ils sont tous différents : huit avatars, une couleur de haut et de bas tirée au sort pour chacun (le shader
//     repeint la teinte du tissu en gardant ses plis), une taille de 1,62 m à 1,93 m, les mains détendues.
//
// Coût : un appel de dessin par passant (plus un pour l'ombre), vingt-cinq mille triangles de près mais cinq mille
// au-delà de 12 m (deuxième maillage du même fichier), animation recalculée à cadence réduite quand ils sont loin
// et presque plus du tout quand personne ne les voit (sauf leur ombre), ombre portée seulement en qualité haute et
// au-dessus et à moins de 30 m de la caméra. Environ 0,2 ms de processeur par image pour les douze, déplacement,
// chemins et animation compris. Le relevé des obstacles, lui, se fait au chargement, par tranches de 4 ms. Sur
// téléphone : cinq passants au plus, version de loin dès 8 m, textures 512 et pas de carte de relief.
//
// Tant que les modèles ne sont pas arrivés — ou s'ils n'arrivent jamais — les bonshommes en boîtes restent là.
//
// AU PARC DE BÉCON EN ENTIER (drapeau « parc entier »), ce sont d'autres promeneurs, sur les allées du parc : la
// classe PassantsParc, en fin de fichier (lot C1). Mêmes personnages, dessinés autrement (instances, squelette cuit).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as clonerSquelette } from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { AvatarRig } from './avatar.js';
import { loadManifest, loadMixamoClip } from './anim.js';
import { Monde, DRAPEAU, SURFACE } from './monde.js';
import { TELEPHONE } from './appareil.js';

// même détection que MOBILE_DECOR (js/court.js) : un téléphone ou une tablette
const MOBILE = TELEPHONE;   // js/appareil.js : la même détection pour tout le jeu (et `?tel=1`)
const MAX_MOBILE = 5;
const SEUIL_LOD = MOBILE ? 8 : 12;          // m : au-delà, la version « de loin » (voir update)

const DOSSIER = 'assets/passants/';
const MANIFESTE = 'assets/anims/manifest.json';
// Ordre de tirage : les plus différents d'abord, pour que les cinq du téléphone ne se ressemblent pas (clovis et
// ethan portent la même tenue, nico et titouan aussi : ils sont chacun dans une moitié de la liste). Massyl n'y
// est pas : sa tenue d'origine est un costume de ronin, chapeau conique compris (voir tools/passants_glb.py).
const AVATARS = ['djafar', 'nico', 'clovis', 'haris', 'lamine', 'aiden', 'titouan', 'ethan'];

// Couleurs de vêtements qu'on croise vraiment dans une rue de banlieue parisienne : beaucoup de sombre, du gris,
// du beige, du denim, quelques couleurs franches. Tirées au hasard, elles REMPLACENT la teinte du tissu d'origine.
const HAUTS = [0x1d2a44, 0x161616, 0x2a2a2e, 0x6b6e73, 0xa9abad, 0xe9e7e2, 0xc8b594, 0x4f5a34, 0x5e1a22, 0x8a7d57,
  0x9a6b3f, 0x23402f, 0x3f5673, 0x9b2a2a, 0xc29a2e, 0x7c9cc0, 0xd9d4c7, 0x343c4c];
const BAS = [0x2e4466, 0x1f2b40, 0x151515, 0x2b2b2d, 0x55585c, 0xb9a684, 0x7a7050, 0x1c2436, 0x4a3526, 0x3b4a5e];

// ---- bonshommes en boîtes (le repli) ----
const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x5c3a1e, 0xffdbac];
const TOPS = [0x2b2f3a, 0xe8e8e8, 0x8c1c1c, 0x1f3f7a, 0x2f6b3a, 0xd9c9ad, 0x4a4a52, 0xb5651d, 0xe9c46a];
const PANTS = [0x23262d, 0x3b4252, 0x6d6f73, 0x1d3557, 0x4a3b2a, 0x2f3b2f];
const HAIR = [0x1a1210, 0x3a2418, 0x6b4a2a, 0x121212, 0x8a7a5a];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const lisser = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const angle = (a) => Math.atan2(Math.sin(a), Math.cos(a));          // ramené dans ]-π, π]
// l'abscisse s du trajet r tombe-t-elle dans sa partie praticable (à un mètre près : un raccord est posé à 1,6 m
// près), sur un trajet qu'on voit depuis le terrain ?
const praticable = (r, s) => r.utile && s >= r.sMin - 1 && s <= r.sMax + 1;

// Une boîte colorée par ses sommets : toutes les boîtes d'un membre se soudent en un seul maillage, et tous les
// bonshommes partagent le même matériau. Cinq appels de dessin par bonhomme au lieu de douze — c'est ce qu'on voit
// pendant le chargement, et pour toujours si les modèles 3D manquent.
let matBoites = null;
function boite(w, h, d, x, y, z, hex) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z);
  const c = new THREE.Color(hex), n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function piece(parent, geos, x, y, z) {
  const pivot = new THREE.Group(); pivot.position.set(x, y, z); parent.add(pivot);
  const m = new THREE.Mesh(mergeGeometries(geos), matBoites);
  for (const g of geos) g.dispose();
  m.castShadow = true; m.receiveShadow = true; pivot.add(m);
  return pivot;
}

// Un bonhomme en boîtes : buste et tête d'un bloc, deux bras et deux jambes articulés à l'épaule et à la hanche.
// Sa taille est celle du passant qu'il remplace, pour que le vrai personnage prenne exactement sa place.
function buildWalker(h) {
  if (!matBoites) matBoites = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const g = new THREE.Group();
  const skin = pick(SKIN), top = pick(TOPS), pants = pick(PANTS), shoe = pick([0x1a1a1a, 0xf2f2f2, 0x8a8a8a]);
  const body = new THREE.Group(); body.scale.setScalar(h / 1.75); g.add(body);
  piece(body, [
    boite(0.38, 0.56, 0.22, 0, 1.28, 0, top),                    // buste
    boite(0.11, 0.08, 0.11, 0, 1.60, 0, skin),                   // cou
    boite(0.20, 0.24, 0.21, 0, 1.75, 0, skin),                   // tête
    boite(0.215, 0.10, 0.225, 0, 1.84, -0.005, pick(HAIR)),      // cheveux
  ], 0, 0, 0);
  const arm = (side) => piece(body, [boite(0.11, 0.30, 0.12, 0, -0.15, 0, top), boite(0.095, 0.26, 0.105, 0, -0.42, 0, skin)], side * 0.235, 1.53, 0);
  const leg = (side) => piece(body, [boite(0.155, 0.50, 0.17, 0, -0.25, 0, pants), boite(0.135, 0.44, 0.15, 0, -0.71, 0, pants),
    boite(0.145, 0.09, 0.26, 0, -0.96, 0.04, shoe)], side * 0.105, 1.00, 0);
  g.userData = { armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1), body };
  return g;
}

function jeterBoites(g) {
  g.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });   // le matériau est commun à tous
}

// ---- le réseau de trottoirs ----
// Chaque trajet est un segment. Deux trajets se RACCORDENT quand le bout de l'un tombe sur l'autre (à 1,6 m près) :
// le passage piéton de Bécon finit sur les deux trottoirs, les traverses de Levallois sur le quai et sur l'allée.
// Un passant qui arrive à un raccord peut changer de trajet ; sinon il fait demi-tour au bout.
function reseau(routes) {
  const R = routes.map((r, i) => {
    const dx = r.bx - r.ax, dz = r.bz - r.az, len = Math.hypot(dx, dz) || 1;
    // sMin / sMax : la portion réellement praticable, resserrée par le relevé des obstacles quand un bout du
    // trajet s'enfonce dans un mur (voir _accessibles). En attendant le relevé : le segment entier.
    return { i, ax: r.ax, az: r.az, dx: dx / len, dz: dz / len, len, sMin: 0, sMax: len, utile: true, milieu: [], bouts: [[], []] };
  });
  for (const A of R) for (const B of R) {
    if (A === B) continue;
    for (let e = 0; e < 2; e++) {
      const ex = B.ax + B.dx * B.len * e, ez = B.az + B.dz * B.len * e;
      const s = (ex - A.ax) * A.dx + (ez - A.az) * A.dz;
      const d = Math.abs((ex - A.ax) * A.dz - (ez - A.az) * A.dx);
      if (d > 1.6 || s < -1 || s > A.len + 1) continue;
      const sc = Math.min(A.len, Math.max(0, s));
      // bout de B posé au milieu de A (le passage piéton sur le trottoir) : on peut bifurquer en passant, et
      // réciproquement, arrivé au bout de B, on repart sur A dans un sens ou dans l'autre
      if (sc > 1.5 && sc < A.len - 1.5) A.milieu.push({ s: sc, vers: B, bout: e });
      B.bouts[e].push({ vers: A, s: sc });
    }
  }
  return R;
}

// ---- ce qui encombre les trottoirs ----
// Les trajets sont de simples segments tracés par chaque terrain, et le trottoir, lui, est meublé : arceaux à vélos,
// vélo garé, potelets, lampadaires, troncs des platanes, barrière du portillon. Plutôt que de demander à chaque
// terrain la liste de ses obstacles, on la RELÈVE dans la scène : tout triangle qui passe entre 20 cm et 1,40 m
// du sol dans le couloir d'un trajet noircit une case de 20 cm. On en tire, pour chaque trajet, une carte des
// décalages latéraux LIBRES (tous les 25 cm le long du trajet, de -3 m à +3 m en travers) : c'est là-dedans que
// le passant pose sa carotte, et il contourne un arceau comme on le fait, en déviant un peu avant.
// Trois mètres de chaque côté (1,6 m avant) : une voiture garée en travers, un vélo couché sur le trottoir, un
// kiosque barrent parfois plus que la largeur du trottoir, et l'on descend alors sur la chaussée pour les
// contourner. Avec 1,6 m, le seul « passage » était souvent entre l'obstacle et le mur, c'est-à-dire à travers les
// deux. Le couloir relevé va un peu au-delà (rayon d'un corps compris).
const CASE = 0.2, PAS_S = 0.25, NLAT = 61, LAT0 = -3.0, PAS_LAT = 0.1, RAYON_CORPS = 0.25, COULOIR = 3.3;
// Hauteurs des COUPES horizontales (voir _releverObstaclesPas) : là où un mur, une façade, une carrosserie coupent
// la tranche du corps. Les matières découpées (alphaTest) ne sont coupées qu'à 35 cm : assez pour fermer un grillage
// (sans quoi l'intérieur de l'enceinte devenait un détour possible), pas assez pour faire des graminées du quai de
// Levallois, larges à hauteur de hanche, des massifs qui bouchaient le passage le long du parapet.
const COUPES = [0.35, 0.8, 1.25], COUPES_DECOUPE = [0.35];
// Un trajet dont la partie praticable ne passe jamais à moins de 30 m du centre du terrain est caché derrière les
// immeubles : on n'y envoie personne (au-delà, un passant fait moins de cent pixels et son ombre n'est plus dessinée).
const PORTEE_UTILE = 30;
// Le chemin tracé devant chaque passant (voir _decLibre) : 12 lignes de 25 cm (3 m), 2 colonnes de pas de côté par
// ligne au plus. Les tableaux de calcul sont partagés : un passant après l'autre, rien n'est alloué par image.
const H_PLAN = 12, M_PLAN = 2;
const _coutPlan = new Float32Array((H_PLAN + 1) * NLAT), _dePlan = new Int8Array((H_PLAN + 1) * NLAT);
const _cheminPlan = new Int16Array(H_PLAN + 1);
// Hauteur au-dessus de laquelle ce qui dépasse n'est plus un obstacle : les branches basses et les touffes de
// feuilles à hauteur de visage, on passe dessous ou on les frôle. Les compter bouchait tout le quai de Levallois
// sous le platane.
const HAUT_OBST = 1.4;
const cleCase = (ix, iz) => (ix + 32768) * 65536 + (iz + 32768);

// ---- la foulée, mesurée ----
// Longueur parcourue au sol pendant un cycle complet du clip de marche, SUR CET AVATAR : on joue le clip image par
// image et on regarde le pied d'appui (le plus bas) reculer sous le bassin ; sa vitesse de recul est la vitesse à
// laquelle le personnage avancerait sans patiner. Rend null si la mesure est absurde (on garde alors celle du
// manifeste, speedRef × durée).
const _pa = new THREE.Vector3(), _pb = new THREE.Vector3();
function mesurerFoulee(modele, clip) {
  const B = {};
  modele.traverse((o) => { if (o.isBone) B[o.name.replace(/^mixamorig:?/, '')] = o; });
  const pieds = [['LeftFoot', 'LeftToeBase'], ['RightFoot', 'RightToeBase']].map(([a, b]) => [B[a], B[b]]);
  if (pieds.some(([a, b]) => !a || !b)) return null;
  const mixer = new THREE.AnimationMixer(modele), act = mixer.clipAction(clip);
  act.play(); act.paused = true;
  const N = 90, dur = clip.duration, mes = [];
  const sol = (p) => { p[0].getWorldPosition(_pa); p[1].getWorldPosition(_pb); return { y: Math.min(_pa.y, _pb.y), z: (_pa.z + _pb.z) / 2 }; };
  let avant = null;
  for (let i = 0; i <= N; i++) {
    act.time = (i / N) * dur; mixer.update(0); modele.updateMatrixWorld(true);
    const g = sol(pieds[0]), d = sol(pieds[1]);
    const appui = g.y < d.y ? 0 : 1, p = appui ? d : g;
    if (avant && avant.appui === appui && Math.abs(g.y - d.y) > 0.015) mes.push(-(p.z - avant.z) / (dur / N));
    avant = { appui, z: p.z };
  }
  mixer.stopAllAction(); mixer.uncacheRoot(modele);
  const bons = mes.filter((v) => v > 0.2).sort((a, b) => a - b);
  if (bons.length < N / 4) return null;
  const v = bons[Math.floor(bons.length / 2)];                     // médiane : les transitions d'appui sont bruitées
  const f = v * dur;
  return f > 0.6 && f < 2.4 ? f : null;
}

// ---- le matériau, repeint par passant ----
// Le masque (tools/passants_glb.py) dit, texel par texel, ce qui est « haut » (canal rouge) et « bas » (canal
// bleu) ; le vert est la rugosité, lue normalement par three. On remplace la TEINTE en gardant la luminance du
// tissu d'origine rapportée à sa moyenne : les plis, les coutures et l'ombre des poches restent, seule la couleur
// change. Le petit ε évite qu'un tissu presque noir, repeint, ne devienne un bruit de compression amplifié.
function materiauPassant(base, teinteHaut, teinteBas, lum) {
  const m = base.clone();
  const u = {
    uHaut: { value: new THREE.Vector4(teinteHaut.r, teinteHaut.g, teinteHaut.b, teinteHaut.force) },
    uBas: { value: new THREE.Vector4(teinteBas.r, teinteBas.g, teinteBas.b, teinteBas.force) },
    uLumRef: { value: new THREE.Vector2(lum.haut, lum.bas) },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec4 uHaut, uBas; uniform vec2 uLumRef;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        #ifdef USE_ROUGHNESSMAP
          vec3 masqueP = texture2D( roughnessMap, vRoughnessMapUv ).rgb;
          float lumP = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) + 0.03;
          diffuseColor.rgb = mix( diffuseColor.rgb, uHaut.rgb * min( lumP / ( uLumRef.x + 0.03 ), 2.2 ), masqueP.r * uHaut.a );
          diffuseColor.rgb = mix( diffuseColor.rgb, uBas.rgb * min( lumP / ( uLumRef.y + 0.03 ), 2.2 ), masqueP.b * uBas.a );
        #endif`);
  };
  m.customProgramCacheKey = () => 'passant-teinte';
  return m;
}

const _cam = new THREE.Vector3(), _cible = new THREE.Vector3(), _v = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0);
const _Z = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qc = new THREE.Quaternion();

export class Pedestrians {
  // routes : [{ ax, az, bx, bz }] segments de trottoir parcourus dans les deux sens
  constructor(scene, routes, count = 10) {
    this.scene = scene;
    this.routes = reseau(routes);
    this.list = [];
    this.t = 0;
    this.cam = new THREE.Vector3(); this.camConnue = false;      // dernière position connue de la caméra du joueur
    // Tout est rangé dans UN groupe : js/court.js le protège de la fusion du décor (optimiserDecor), qui sinon
    // souderait les membres des bonshommes en boîtes dans un bloc immobile.
    // LE BUG DES CORPS FIGÉS (conception du parc complet, moteur.md § 2.9) : avant ce groupe, `nePasFusionner(
    // u.pedestrians.group)` visait une propriété qui n'existait pas, et la fusion soudait les membres des douze
    // passants de La Cage au décor : les corps restaient plantés à leur place de départ, seules les têtes glissaient.
    // Le groupe se protège maintenant LUI-MÊME (`nofuse`, dès sa création) : il ne dépend plus de l'ordre dans lequel
    // un terrain crée ses passants et appelle optimiserDecor, ni de la ligne de js/court.js.
    this.group = new THREE.Group(); this.group.name = 'passants';
    this.group.userData.nofuse = true;
    // Marqué « dynamique » AU PREMIER NIVEAU de la scène : c'est là que regardent la photo de la carte
    // d'environnement (js/court.js rendreFace) et les ombres de contact (js/ombres_contact.js). Marquer seulement
    // chaque racine, un niveau plus bas, les laissait figés dans le reflet du cercle et du ballon.
    this.group.userData.dynamique = true;
    scene.add(this.group);
    // OÙ EST LA CAMÉRA DU JOUEUR. On la lit au début de chaque rendu de la scène, sans rien demander au jeu. On
    // écarte les caméras qui ne sont pas la sienne : le miroir du sol mouillé ou de la Seine (sous le sol), les six
    // faces de la carte d'environnement (90° d'ouverture, image carrée), les vues orthographiques (ombres). Avant,
    // on l'apprenait quand un passant était dessiné : tant qu'aucun n'était dans le champ, la position restait
    // celle d'il y a longtemps, et avec elle le niveau de détail, l'ombre et la cadence d'animation.
    const avant = scene.onBeforeRender;
    scene.onBeforeRender = (renderer, sc, camera, cible) => {
      avant.call(scene, renderer, sc, camera, cible);
      if (!camera || !camera.isPerspectiveCamera || (camera.fov === 90 && camera.aspect === 1)) return;
      _cam.setFromMatrixPosition(camera.matrixWorld);
      if (_cam.y > 0.2) { this.cam.copy(_cam); this.camConnue = true; }
    };
    const n = MOBILE ? Math.min(count, MAX_MOBILE) : count;
    const depart = Math.floor(Math.random() * AVATARS.length);
    for (let i = 0; i < n; i++) {
      const racine = new THREE.Group();
      racine.userData.dynamique = true;          // il bouge : pas d'occlusion cuite ni d'ombre de contact figée à sa place
      const h = rnd(1.62, 1.93);
      const boites = buildWalker(h);
      racine.add(boites);
      this.group.add(racine);
      const r = this.routes[i % this.routes.length];
      const sens = Math.random() < 0.5 ? 1 : -1;
      const cote = rnd(0.3, 0.62);                // tient sa droite : deux passants qui se croisent sont à 60 cm au moins
      const p = {
        racine, boites, h, avatar: AVATARS[(depart + i) % AVATARS.length],
        r, s: rnd(0.1, 0.9) * r.len, sens, cote, dec: sens * cote, v: 0, vPerso: rnd(1.12, 1.48),
        cap: 0, x: 0, z: 0, arret: 0, doubler: 0, decDoubler: 0, bifurque: 0, attente: 0, impatient: 0, evite: 0, envieDeRegarder: rnd(8, 30),
        phase: Math.random(), phaseBoites: Math.random() * 6.28,
        // modèle 3D (quand il est là)
        modele: null, mixer: null, marche: null, repos: null, foulee: 1.25, os: null,
        vu: -1, dist: Infinity, dtAnim: 0, regard: 0, regardVise: 0,
        memo: { L: null, k: -1, sens: 0, jv: -1, ji: -1, pas: 1.4, lat: 0 },      // dernier chemin tracé (_decLibre)
      };
      p.x = r.ax + r.dx * p.s + (-r.dz) * p.dec; p.z = r.az + r.dz * p.s + r.dx * p.dec;
      p.cap = Math.atan2(r.dx * sens, r.dz * sens);
      p.v = p.vPerso;
      this.list.push(p);
    }
    this.place(0);
    // Les modèles arrivent après le reste : un court délai laisse passer d'abord les avatars des joueurs et le
    // décor, qui comptent plus que les figurants.
    setTimeout(() => { this._charger().catch((e) => console.warn('[passants] modèles 3D indisponibles, on garde les boîtes :', e)); }, 1200);
    // Relevé des obstacles : une première fois quand le décor construit à la main est en place, puis toutes les
    // cinq secondes pendant une minute pour attraper les modèles 3D qui arrivent après (arbres, lampadaires,
    // voitures garées). Seuls les maillages jamais vus sont lus à chaque passe : une passe sans nouveauté ne coûte
    // qu'un parcours de la scène.
    for (let t = 900; t <= 60000; t += 5000) {
      setTimeout(() => { this._releverObstacles().catch((e) => console.warn('[passants] relevé des obstacles :', e)); }, t);
    }
  }

  // ---------------------------------------------------------------- obstacles
  // Le relevé est DÉCOUPÉ : il rend la main au jeu toutes les 4 ms (quelques dizaines de milliers de triangles
  // à lire dans les couloirs, soit 100 à 150 ms d'un bloc — un accroc visible si la partie a déjà commencé).
  async _releverObstacles() {
    if (this._releve) return;
    this._releve = true;
    try { await this._releverObstaclesPas(); } finally { this._releve = false; }
  }

  async _releverObstaclesPas() {
    const t0 = performance.now();
    let tMain = t0, attente = 0;
    const souffler = async () => {
      if (performance.now() - tMain < 4) return;
      const a = performance.now();
      await new Promise((ok) => setTimeout(ok, 0));
      tMain = performance.now(); attente += tMain - a;
    };
    // Cases DILATÉES du rayon d'un corps : une case marquée veut dire « un passant centré ici toucherait
    // quelque chose ». La carte des décalages libres n'a plus qu'une case à lire par point.
    // Deux relevés : le DUR (murs, voitures, mobilier, grillages), qu'on ne traverse jamais, et le FEUILLAGE (herbes
    // hautes, buissons, feuilles basses : les matières découpées à seuil d'alpha élevé), qu'on évite quand on peut
    // mais qu'on frôle ou qu'on traverse s'il le faut. Les graminées du quai de Levallois ont des cartes de 1,6 m de
    // large qui débordent sur l'allée : comptées comme un mur, elles coupaient le quai en deux.
    const S = this.occupe || (this.occupe = new Set());
    const F = this.feuillage || (this.feuillage = new Set());
    const avant = S.size + F.size, rd = Math.ceil(RAYON_CORPS / CASE), r2 = (RAYON_CORPS / CASE) ** 2;
    let derniere = -1, cible = S;
    const noircir = (ix, iz) => {
      const c = cleCase(ix, iz);
      if (c === derniere) return;
      derniere = c;
      for (let a = -rd; a <= rd; a++) for (let b = -rd; b <= rd; b++) if (a * a + b * b <= r2) cible.add(cleCase(ix + a, iz + b));
    };
    const vus = this._vus || (this._vus = new WeakSet());
    const R = this.routes;
    // les voitures qui roulent traversent le passage piéton : surtout ne pas les figer en obstacle (ni le ballon,
    // s'il a roulé hors de l'enceinte au moment du relevé)
    const bouge = new Set(); for (const c of this.scene.userData.traffic || []) if (c.mesh) bouge.add(c.mesh);
    const balle = this.scene.userData.ball && this.scene.userData.ball.mesh;
    if (balle) bouge.add(balle);
    const dansCouloir = (x, z, marge) => {
      for (const r of R) {
        const ax = x - r.ax, az = z - r.az, sl = ax * r.dx + az * r.dz;
        if (sl < -1.2 - marge || sl > r.len + 1.2 + marge) continue;
        if (Math.abs(ax * r.dz - az * r.dx) < COULOIR + marge) return true;
      }
      return false;
    };
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), M = new THREE.Matrix4(), sph = new THREE.Sphere();
    const arete = (P, Q) => {
      const n = Math.min(400, Math.ceil(P.distanceTo(Q) / (CASE * 0.5)));
      for (let i = 0; i <= n; i++) {
        const k = i / n, y = P.y + (Q.y - P.y) * k;
        if (y < 0.2 || y > HAUT_OBST) continue;
        const x = P.x + (Q.x - P.x) * k, z = P.z + (Q.z - P.z) * k;
        if (dansCouloir(x, z, 0)) noircir(Math.floor(x / CASE), Math.floor(z / CASE));
      }
    };
    // LA COUPE d'un triangle à la hauteur h : le segment où il traverse le plan horizontal y = h. Les arêtes ne
    // suffisent pas pour un GRAND triangle : une façade de 14 m sur 18 est faite de deux triangles dont les
    // arêtes passent au sol, en haut et en biais — seul un bout de la diagonale tombait dans la tranche du corps,
    // et le reste du mur était « libre ». Les passants entraient de deux mètres dans l'immeuble qui ferme la rue
    // de Bécon, et dans celui du coin d'en face.
    const I = [new THREE.Vector3(), new THREE.Vector3()], ARETES = [[A, B], [B, C], [C, A]];
    const coupe = (h) => {
      let n = 0;
      for (const [P, Q] of ARETES) {
        if ((P.y - h) * (Q.y - h) >= 0 || n > 1) continue;
        I[n++].lerpVectors(P, Q, (h - P.y) / (Q.y - P.y));
      }
      if (n < 2) return;
      const m = Math.min(400, Math.ceil(I[0].distanceTo(I[1]) / (CASE * 0.5)));
      for (let i = 0; i <= m; i++) {
        const k = i / m, x = I[0].x + (I[1].x - I[0].x) * k, z = I[0].z + (I[1].z - I[0].z) * k;
        if (dansCouloir(x, z, 0)) noircir(Math.floor(x / CASE), Math.floor(z / CASE));
      }
    };
    // la liste d'abord (le parcours de la scène est court), le gros du travail ensuite, par tranches
    const liste = [];
    this.scene.updateMatrixWorld(true);
    this.scene.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || vus.has(o)) return;
      vus.add(o);
      for (let n = o; n; n = n.parent) if (n === this.group || bouge.has(n)) return;
      const g = o.geometry;
      if (g && g.attributes && g.attributes.position) liste.push(o);
    });
    let tris = 0;
    for (const o of liste) {
      if (!o.parent) continue;                       // retiré entre-temps (un repli remplacé par son modèle 3D)
      const g = o.geometry, pos = g.attributes.position;
      if (!g.boundingSphere) g.computeBoundingSphere();
      const idx = g.index, nt = Math.floor((idx ? idx.count : pos.count) / 3);
      const nInst = o.isInstancedMesh ? o.count : 1;
      // Le relevé et les coupes selon la matière. Feuillage : découpé à seuil d'alpha élevé (0,2 et plus : feuilles,
      // herbes, lierre ; les grillages sont à 0,004-0,12 et restent durs). Transparent sans découpe (vitres, voiles
      // de lumière, halos) : les seules arêtes, comme avant. Découpé : une coupe basse. Plein : toute la tranche.
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      const doux = !!mat && mat.alphaTest >= 0.15;
      const hauteurs = !mat ? null : mat.alphaTest > 0 ? COUPES_DECOUPE : mat.transparent ? null : COUPES;
      cible = doux ? F : S; derniere = -1;
      for (let k = 0; k < nInst; k++) {
        if (o.isInstancedMesh) { o.getMatrixAt(k, M); M.premultiply(o.matrixWorld); } else M.copy(o.matrixWorld);
        sph.copy(g.boundingSphere).applyMatrix4(M);
        if (sph.center.y - sph.radius > HAUT_OBST || sph.center.y + sph.radius < 0.2) continue;    // au-dessus des têtes, ou à plat au sol
        if (!dansCouloir(sph.center.x, sph.center.z, sph.radius)) continue;
        for (let t = 0; t < nt; t++) {
          if ((t & 511) === 511) await souffler();
          const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
          A.fromBufferAttribute(pos, i0).applyMatrix4(M); B.fromBufferAttribute(pos, i1).applyMatrix4(M); C.fromBufferAttribute(pos, i2).applyMatrix4(M);
          if (Math.max(A.y, B.y, C.y) < 0.2 || Math.min(A.y, B.y, C.y) > HAUT_OBST) continue;
          // triangle entièrement hors des couloirs (l'essentiel d'un bloc de décor fusionné) : suivant
          const x0 = Math.min(A.x, B.x, C.x), x1 = Math.max(A.x, B.x, C.x), z0 = Math.min(A.z, B.z, C.z), z1 = Math.max(A.z, B.z, C.z);
          const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
          if (!dansCouloir(cx, cz, Math.hypot(x1 - x0, z1 - z0) / 2)) continue;
          tris++;
          // petit triangle (le gros des modèles détaillés) : une case suffit
          if (x1 - x0 < CASE && z1 - z0 < CASE) { if (dansCouloir(cx, cz, 0)) noircir(Math.floor(cx / CASE), Math.floor(cz / CASE)); continue; }
          arete(A, B); arete(B, C); arete(C, A);
          if (hauteurs) for (const h of hauteurs) coupe(h);
        }
        await souffler();
      }
    }
    // cartes des décalages libres, trajet par trajet (seulement si le relevé a trouvé du nouveau) :
    // 0 = dur, 1 = feuillage, 2 = libre
    if (S.size + F.size === avant && R[0].libre) return;
    for (const r of R) {
      const n = Math.floor(r.len / PAS_S) + 1;
      const libre = new Uint8Array(n * NLAT);
      for (let k = 0; k < n; k++) {
        const sl = k * PAS_S;
        for (let j = 0; j < NLAT; j++) {
          const lat = LAT0 + j * PAS_LAT;
          const x = r.ax + r.dx * sl - r.dz * lat, z = r.az + r.dz * sl + r.dx * lat;
          const c = cleCase(Math.floor(x / CASE), Math.floor(z / CASE));
          libre[k * NLAT + j] = S.has(c) ? 0 : F.has(c) ? 1 : 2;
        }
      }
      r.libre = libre; r.nLibre = n;
      this._accessibles(r);
    }
    // un terrain dont aucun trajet ne passe près du centre : on ne trie pas, tous servent
    if (!R.some((r) => r.utile)) for (const r of R) r.utile = true;
    // Premier relevé : ceux qui sont nés dans un mur (au-delà d'une façade, dans une voiture garée) sont reposés
    // sur la partie praticable de leur trajet. Il a lieu dans la première seconde, pendant le menu.
    if (!this._recases) {
      this._recases = true;
      for (const p of this.list) this._recaser(p);
    }
    console.info('[passants] obstacles des trottoirs : %d cases occupées, %d de feuillage (%d triangles, %d ms de calcul en tranches de 4 ms) · praticable : %s',
      S.size, F.size, tris, Math.round(performance.now() - t0 - attente),
      R.map((r) => r.sMin.toFixed(1) + '-' + r.sMax.toFixed(1) + '/' + r.len.toFixed(1) + (r.utile ? '' : ' (caché)')).join(' '));
  }

  // CE QU'ON PEUT ATTEINDRE. Une case libre de la carte n'est pas forcément accessible : derrière une façade, le
  // relevé ne voit que le mur, et l'intérieur de l'immeuble est « libre ». On part de la ligne du trajet au plus
  // près de son MILIEU (le trottoir en face du terrain), et on se répand de case libre en case libre ; tout ce qui
  // n'est pas atteint est rayé de la carte — le passant n'ira pas y poser sa carotte.
  // Une seule ligne de départ, pas tout le milieu du trajet : à Bécon, les trottoirs passent SOUS deux immeubles
  // (de z = -29 à -18 et de 22 à 33), dont l'intérieur, fermé par leurs façades, aurait été semé lui aussi.
  // La portion praticable [sMin, sMax] : les lignes, de part et d'autre du départ, où l'on peut encore marcher
  // à moins de 1,6 m de la ligne du trajet (sur le trottoir, pas seulement en le quittant de trois mètres). C'est ce
  // qui arrête le trajet devant la façade, même quand la bordure du couloir (±3 m) file derrière elle, dans le hall
  // d'un immeuble par une porte ouverte : ces lignes-là sont rayées elles aussi.
  // `utile` : la partie praticable passe à moins de PORTEE_UTILE du centre du terrain (toujours à l'origine).
  // Au-delà, derrière les immeubles, personne ne les voit jamais : on n'y met personne (voir _recaser).
  _accessibles(r) {
    const L = r.libre, n = r.nLibre, vu = new Uint8Array(n * NLAT), file = new Int32Array(n * NLAT);
    let tete = 0, queue = 0, k0 = -1;
    const milieu = Math.floor((n - 1) / 2);
    for (let e = 0; e < n * 2 && !queue; e++) {
      const k = milieu + (e % 2 ? (e + 1) / 2 : -e / 2);
      if (k < 0 || k >= n) continue;
      for (let j = 0; j < NLAT; j++) {
        const c = k * NLAT + j;
        if (L[c] && Math.abs(LAT0 + j * PAS_LAT) <= 0.8) { vu[c] = 1; file[queue++] = c; k0 = k; }
      }
    }
    if (!queue) return;                           // tout est bouché autour de la ligne : on garde la carte brute
    const voisin = (v) => { if (L[v] && !vu[v]) { vu[v] = 1; file[queue++] = v; } };
    while (tete < queue) {
      const c = file[tete++], k = (c / NLAT) | 0, j = c - k * NLAT;
      if (j > 0) voisin(c - 1);
      if (j < NLAT - 1) voisin(c + 1);
      if (k > 0) voisin(c - NLAT);
      if (k < n - 1) voisin(c + NLAT);
    }
    // de la ligne de départ vers chaque bout, tant qu'une case atteinte reste à moins de 1,6 m de la ligne
    const j0 = Math.ceil((-1.6 - LAT0) / PAS_LAT - 1e-6), j1 = Math.floor((1.6 - LAT0) / PAS_LAT + 1e-6);
    const praticableLigne = (k) => { for (let j = j0; j <= j1; j++) if (vu[k * NLAT + j]) return true; return false; };
    let kMin = k0, kMax = k0;
    while (kMin > 0 && praticableLigne(kMin - 1)) kMin--;
    while (kMax < n - 1 && praticableLigne(kMax + 1)) kMax++;
    let d2 = Infinity;
    for (let k = 0; k < n; k++) for (let j = 0; j < NLAT; j++) {
      const c = k * NLAT + j;
      if (!vu[c] || k < kMin || k > kMax) { L[c] = 0; continue; }
      const s = k * PAS_S, lat = LAT0 + j * PAS_LAT;
      const x = r.ax + r.dx * s - r.dz * lat, z = r.az + r.dz * s + r.dx * lat;
      d2 = Math.min(d2, x * x + z * z);
    }
    r.sMin = kMin === 0 ? 0 : kMin * PAS_S;
    r.sMax = kMax === n - 1 ? r.len : kMax * PAS_S;
    r.utile = d2 < PORTEE_UTILE * PORTEE_UTILE;
  }

  // Un passant hors de la partie praticable de son trajet (né au-delà d'une façade, ou sur une case rayée) est
  // reposé au hasard sur cette partie, à sa place habituelle ou au plus près. Celui d'un trajet que personne ne voit
  // (voir _accessibles : à Bécon, le passage piéton, coincé entre deux immeubles) part sur un trajet utile, tiré au
  // sort à proportion de sa longueur praticable.
  _recaser(p) {
    let r = p.r;
    if (!r.libre) return;
    const utiles = this.routes.filter((q) => q.utile && q.libre && q.sMax - q.sMin > 2);
    let force = false;
    if (!r.utile && utiles.length) {
      let t = Math.random() * utiles.reduce((a, q) => a + q.sMax - q.sMin, 0);
      r = utiles.find((q) => (t -= q.sMax - q.sMin) <= 0) || utiles[0];
      p.r = r; p.sens = Math.random() < 0.5 ? 1 : -1; p.doubler = 0; p.arret = 0;
      force = true;
    }
    const L = r.libre;
    const col = (lat) => Math.max(0, Math.min(NLAT - 1, Math.round((lat - LAT0) / PAS_LAT)));
    const ligne = (s) => Math.max(0, Math.min(r.nLibre - 1, Math.round(s / PAS_S)));
    if (!force) {
      const lat = -(p.x - r.ax) * r.dz + (p.z - r.az) * r.dx;
      const dedans = p.s >= r.sMin - 0.3 && p.s <= r.sMax + 0.3;
      const k0 = ligne(p.s), j0 = col(lat);
      let bon = false;
      for (let j = Math.max(0, j0 - 3); j <= Math.min(NLAT - 1, j0 + 3) && !bon; j++) bon = L[k0 * NLAT + j] === 2;
      if (dedans && bon) return;
    }
    for (let essai = 0; essai < 40; essai++) {
      const s = r.sMin + Math.random() * (r.sMax - r.sMin), k = ligne(s);
      const j1 = col(p.sens * p.cote);
      // la colonne libre la plus proche de sa place habituelle, sur cette ligne
      for (let e = 0; e < NLAT * 2; e++) {
        const j = j1 + (e % 2 ? (e + 1) / 2 : -e / 2);
        if (j < 0 || j >= NLAT || L[k * NLAT + j] !== 2) continue;
        p.s = k * PAS_S; p.dec = LAT0 + j * PAS_LAT;
        p.x = r.ax + r.dx * p.s - r.dz * p.dec; p.z = r.az + r.dz * p.s + r.dx * p.dec;
        p.cap = Math.atan2(r.dx * p.sens, r.dz * p.sens);
        p.racine.position.set(p.x, 0, p.z); p.racine.rotation.y = p.cap;
        return;
      }
    }
  }

  // Le décalage latéral à viser, 1,4 m devant lui. Si sa place habituelle (sa droite) est libre sur les trois
  // mètres qui viennent et qu'il y est déjà, il y reste : c'est le cas presque tout le temps, et il ne coûte rien.
  // Sinon, on lui TRACE UN CHEMIN sur la carte des décalages libres, ligne par ligne (tous les 25 cm) sur ces trois
  // mètres : à chaque ligne il peut se décaler de 20 cm au plus (un pas de côté en marchant), ne pose jamais le pied
  // sur une case dure (le feuillage lui coûte cher, sans lui être interdit), et paie chaque mètre d'écart à sa place
  // habituelle et chaque pas de côté. Le chemin le moins
  // cher dit où poser la carotte. Avant, on cherchait un couloir droit libre sur toute la portion, le plus proche de
  // lui : entre le platane et la poubelle du trottoir de la résidence (l'un à droite, l'autre à gauche, deux mètres
  // plus loin), le seul couloir droit était de l'autre côté de la poubelle — et il la traversait pour l'atteindre.
  // Une case n'est praticable que si l'une de ses voisines l'est aussi : une fente d'une seule colonne (un passage de
  // 50 cm entre un kiosque et une haie), personne ne s'y glisse. Si tout est bouché dès la ligne suivante, il garde
  // sa visée : les moustaches (voir place) le détournent.
  _decLibre(r, s, sens, vise, ici = vise, memo = null) {
    const L = r.libre;
    this._pasCarotte = 1.4;                       // distance de la carotte devant lui (raccourcie dans un détour)
    if (!L) return vise;
    const n = r.nLibre;
    const col = (v) => Math.max(0, Math.min(NLAT - 1, Math.round((v - LAT0) / PAS_LAT)));
    const jv = col(vise), ji = col(ici);
    const kDep = Math.max(0, Math.min(n - 1, Math.round(s / PAS_S)));
    if (Math.abs(ji - jv) <= 3) {
      let ok = true;
      for (let i = 1; i <= H_PLAN && ok; i++) {
        const k = kDep + i * sens;
        if (k < 0 || k >= n) break;
        ok = L[k * NLAT + jv] === 2;
      }
      if (ok) return vise;
    }
    // Le chemin ne change pas tant qu'il reste sur la même ligne de la carte (25 cm, une douzaine d'images) à la
    // même colonne près : on reprend celui de l'image d'avant (`memo`, propre à chaque passant).
    if (memo && memo.L === L && memo.k === kDep && memo.sens === sens && memo.jv === jv && Math.abs(memo.ji - ji) <= 1) {
      this._pasCarotte = memo.pas;
      return memo.lat;
    }
    const C = _coutPlan, D = _dePlan;
    for (let j = 0; j < NLAT; j++) C[j] = Infinity;
    C[ji] = 0;
    let iMax = 0;
    for (let i = 1; i <= H_PLAN; i++) {
      const k = kDep + i * sens;
      if (k < 0 || k >= n) break;
      const o = i * NLAT, op = o - NLAT, base = k * NLAT;
      let atteint = false;
      for (let j = 0; j < NLAT; j++) {
        C[o + j] = Infinity;
        if (!L[base + j] || !((j > 0 && L[base + j - 1]) || (j < NLAT - 1 && L[base + j + 1]))) continue;
        let best = Infinity, bd = 0;
        for (let d = -M_PLAN; d <= M_PLAN; d++) {
          const jj = j + d;
          if (jj < 0 || jj >= NLAT) continue;
          const c = C[op + jj] + Math.abs(d) * PAS_LAT * 3;
          if (c < best) { best = c; bd = d; }
        }
        if (best === Infinity) continue;
        // + un peu pour la case qui borde un obstacle : on le contourne avec dix centimètres d'aisance, pas en le
        // rasant ; + beaucoup pour une case de feuillage : on n'entre dans les herbes hautes que faute de mieux
        const bord = (j > 0 && L[base + j - 1] < 2) || (j < NLAT - 1 && L[base + j + 1] < 2) ? 0.4 : 0;
        C[o + j] = best + Math.abs(LAT0 + j * PAS_LAT - vise) + bord + (L[base + j] === 1 ? 2 : 0);
        D[o + j] = bd;                            // la case d'avant est en j + bd
        atteint = true;
      }
      if (!atteint) break;
      iMax = i;
    }
    if (iMax === 0) return vise;
    // la meilleure arrivée sur la dernière ligne atteinte, puis on remonte le chemin jusqu'à lui
    let j = 0, cMin = Infinity;
    for (let jj = 0; jj < NLAT; jj++) if (C[iMax * NLAT + jj] < cMin) { cMin = C[iMax * NLAT + jj]; j = jj; }
    const chemin = _cheminPlan;
    for (let i = iMax; i >= 1; i--) { chemin[i] = j; j += D[i * NLAT + j]; }
    // La carotte : le point du chemin le plus loin (1,5 m au plus) qu'on rejoint EN LIGNE DROITE sans poser le pied
    // sur une case prise. Viser plus loin sur un chemin qui tourne, c'était couper le virage à travers le coin du
    // kiosque qu'on contournait.
    let iC = Math.min(iMax, 6);
    for (; iC > 1; iC--) {
      let droit = true;
      for (let m = 1; m < iC && droit; m++) {
        const jm = Math.round(ji + (chemin[iC] - ji) * m / iC), k = kDep + m * sens;
        droit = !!L[k * NLAT + jm];
      }
      if (droit) break;
    }
    this._pasCarotte = iC * PAS_S;
    const lat = LAT0 + chemin[iC] * PAS_LAT;
    if (memo) { memo.L = L; memo.k = kDep; memo.sens = sens; memo.jv = jv; memo.ji = ji; memo.pas = this._pasCarotte; memo.lat = lat; }
    return lat;
  }

  // Un passant qui s'apprête à descendre sur la chaussée attend que la voiture qui arrive soit passée.
  _voitureArrive(p) {
    const T = this.scene.userData.traffic;
    if (!T || !T.length) return false;
    const fx = p.x + Math.sin(p.cap) * 1.3, fz = p.z + Math.cos(p.cap) * 1.3;
    // la voie d'une voiture est une bande de ±1,3 m autour de son x (elles roulent le long de z). Déjà sur une
    // voie, on ne s'arrête JAMAIS : attendre au milieu de la chaussée la voiture de l'autre file, c'est se faire
    // rouler dessus par celle de la sienne. On finit de traverser la file, et on attend entre les deux.
    for (const c of T) if (c.mesh && Math.abs(p.x - c.mesh.position.x) < 1.3) return false;
    for (const c of T) {
      if (!c.mesh) continue;
      const cx = c.mesh.position.x, cz = c.mesh.position.z;
      if (Math.abs(fx - cx) >= 1.3) continue;
      const approche = (fz - cz) * (c.dir || 1);                  // > 0 : la voiture vient vers nous
      if (approche > -2.5 && approche < (c.speed || 7) * 3.2) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- chargement
  async _charger() {
    const man = await loadManifest(MANIFESTE);
    const dMarche = man && man.clips && man.clips.walk, dRepos = man && man.clips && man.clips.idle;
    if (!dMarche) throw new Error('clip de marche absent du manifeste');
    const base = MANIFESTE.slice(0, MANIFESTE.lastIndexOf('/') + 1);
    const url = (d) => base + d.file.split('/').map(encodeURIComponent).join('/');
    const chargeur = new GLTFLoader(), texLoader = new THREE.TextureLoader();
    const tex = (f, srgb) => texLoader.loadAsync(f).then((t) => {
      t.flipY = false;                            // convention glTF : les UV de l'atlas partent du haut de l'image
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = 4;
      return t;
    });
    const suf = MOBILE ? '_512' : '';
    const noms = [...new Set(this.list.map((p) => p.avatar))];
    // Un avatar après l'autre : chaque arrivée retargete deux clips sur son squelette, on étale ce travail
    // plutôt que de figer le jeu d'un bloc.
    for (const nom of noms) {
      let v = null;
      try {
        const [gltf, couleur, masque, relief] = await Promise.all([
          chargeur.loadAsync(DOSSIER + nom + '.glb'),
          tex(DOSSIER + nom + '_couleur' + suf + '.webp', true),
          tex(DOSSIER + nom + '_masque' + suf + '.jpg', false),
          MOBILE ? Promise.resolve(null) : tex(DOSSIER + nom + '_relief.jpg', false),
        ]);
        v = await this._variante(nom, gltf, couleur, masque, relief, dMarche, dRepos, url);
      } catch (e) {
        console.warn('[passants] avatar', nom, 'non chargé, ses passants restent en boîtes :', e);
      }
      if (v) for (const p of this.list) if (p.avatar === nom) this._habiller(p, v);
      await new Promise((ok) => setTimeout(ok, 30));
    }
  }

  async _variante(nom, gltf, couleur, masque, relief, dMarche, dRepos, url) {
    const modele = gltf.scene;
    // deux maillages sur le même squelette : « passant » (de près) et « passant_loin » (cinq mille triangles,
    // tools/passants_glb.py). Un fichier d'avant les niveaux de détail n'a que le premier : tout marche pareil.
    const peaux = [];
    modele.traverse((o) => { if (o.isSkinnedMesh) peaux.push(o); });
    if (!peaux.length) throw new Error('pas de maillage skinné');
    const ex = modele.userData || {};
    const rig = new AvatarRig(modele);            // T-pose de référence pour retargeter les clips (voir js/anim.js)
    if (!rig.ok) throw new Error('squelette non Mixamo');
    const hips = rig.bone('Hips'), leg = rig.bone('LeftLeg'), foot = rig.bone('LeftFoot');
    const ref = { hipsY: hips.position.y, legLen: leg.position.length() + foot.position.length() };
    const marche = await loadMixamoClip(url(dMarche), 'passant_marche', dMarche, ref, rig);
    if (!marche) throw new Error('marche non retargetée');
    const repos = dRepos ? await loadMixamoClip(url(dRepos), 'passant_repos', dRepos, ref, rig) : null;
    const mesure = mesurerFoulee(modele, marche.clip);
    const foulee = mesure || marche.def.foulee || 1.25;
    // MAINS DÉTENDUES. Aucun des deux clips n'anime les doigts : sans rien faire, ils restaient tendus et écartés
    // comme sur la T-pose, et c'est la première chose qui fait « mannequin » quand un passant frôle la caméra. On
    // les plie une fois pour toutes sur le modèle de référence ; les clones en héritent, et le mélangeur de clips
    // ne les touche jamais.
    for (const c of ['Left', 'Right']) rig.plierDoigts(c, [0.5, 0.62, 0.45], 1);
    // Sphère englobante posée à la main : sans elle, three la calcule à la première image en skinnant les vingt
    // mille sommets sur le processeur. La T-pose d'origine (bras en croix) contient largement la marche.
    for (const peau of peaux) {
      peau.geometry.computeBoundingBox();
      const bb = peau.geometry.boundingBox;
      peau.boundingSphere = new THREE.Sphere(bb.getCenter(new THREE.Vector3()), bb.getSize(new THREE.Vector3()).length() * 0.5 * 1.05);
      peau.boundingBox = bb.clone();
    }
    const mat = new THREE.MeshStandardMaterial({
      name: 'passant_' + nom, map: couleur, roughnessMap: masque, normalMap: relief || null,
      roughness: 1, metalness: 0, alphaTest: 0.45, side: THREE.DoubleSide,
    });
    // y inversé : convention glTF (vert vers le haut) sur une texture non retournée, sans tangentes — c'est ce
    // que fait GLTFLoader pour ses propres matériaux
    if (relief) mat.normalScale.set(0.9, -0.9);
    console.info('[passants] %s prêt · foulée %s m (manifeste %s)', nom, foulee.toFixed(2), (marche.def.foulee || 0).toFixed(2));
    return { nom, modele, mat, marche, repos, foulee, hauteur: ex.hauteur || 1.85, lum: { haut: ex.lumHaut ?? 0.2, bas: ex.lumBas ?? 0.2 } };
  }

  // Le vrai personnage prend la place du bonhomme en boîtes.
  _habiller(p, v) {
    const modele = clonerSquelette(v.modele);
    const k = p.h / v.hauteur;
    modele.scale.setScalar(k);
    const teinte = (liste, proba) => {
      const c = new THREE.Color(pick(liste));      // hexadécimal sRGB -> linéaire (gestion des couleurs de three)
      return { r: c.r, g: c.g, b: c.b, force: Math.random() < proba ? rnd(0.85, 1) : 0 };
    };
    const mat = materiauPassant(v.mat, teinte(HAUTS, 0.75), teinte(BAS, 0.6), v.lum);
    modele.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      o.material = mat;
      o.castShadow = this._ombres(); o.receiveShadow = true;
      o.frustumCulled = true;
      // Qui le voit : on le note au moment où three le dessine (la position de la caméra, elle, est relevée au
      // début de chaque rendu de la scène : voir le constructeur).
      o.onBeforeRender = () => { p.vu = this.t; };
      if (/loin/.test(o.name)) p.peauLoin = o; else p.peau = o;
    });
    // de près au départ ; update() bascule selon la distance à la caméra
    p.estLoin = false;
    if (p.peauLoin) p.peauLoin.visible = false;
    const mixer = new THREE.AnimationMixer(modele);
    const marche = mixer.clipAction(v.marche.clip);
    marche.play(); marche.paused = true;          // posée à la main à la phase de la foulée
    let repos = null;
    if (v.repos) {
      repos = mixer.clipAction(v.repos.clip);
      repos.play(); repos.time = Math.random() * v.repos.clip.duration;
      repos.setEffectiveWeight(0);
    }
    const os = {};
    modele.traverse((o) => { if (o.isBone) os[o.name.replace(/^mixamorig:?/, '')] = o; });
    Object.assign(p, { modele, mixer, marche, repos, os, foulee: v.foulee * k, dureeMarche: v.marche.clip.duration,
      phase0: v.marche.def.phase0 || 0, dtAnim: 1 });
    p.racine.remove(p.boites);
    jeterBoites(p.boites); p.boites = null;
    p.racine.add(modele);
    this._animer(p, 0);
  }

  // Ombre portée : seulement en qualité haute et au-dessus (js/fx.js publie son préréglage dans
  // scene.userData.meteoQualite : 0,5 basse, 0,8 moyenne, 1 haute, 1,6 ultra, 2,2 extrême).
  _ombres() {
    const q = this.scene.userData.meteoQualite;
    return q === undefined ? !MOBILE : q >= 1;
  }

  // ---------------------------------------------------------------- déplacement
  place(dt) {
    const L = this.list;
    for (const p of L) {
      const r = p.r;
      // --- arrêts : au bout du trottoir de temps en temps, ou au milieu pour regarder le match ---
      if (p.arret > 0) {
        p.arret -= dt;
        p.v = Math.max(0, p.v - 1.8 * dt);
        if (p.v < 0.25 && p.capArret !== undefined) {
          // on se tourne vers le terrain, doucement (on tourne sur place : pas plus vite qu'un pas)
          const d = angle(p.capArret - p.cap);
          p.cap += Math.sign(d) * Math.min(Math.abs(d), 1.1 * dt);
        }
        if (p.arret <= 0) p.capArret = undefined;
      } else {
        // --- où il va : un point sur le trottoir 1,4 m devant lui, décalé sur sa droite ---
        const vise = p.doubler > 0 ? p.decDoubler : p.sens * p.cote;
        p.dec += Math.max(-0.35 * dt, Math.min(0.35 * dt, vise - p.dec));
        // le bout, c'est celui de la partie PRATICABLE du trajet (devant la façade, pas dedans)
        const decL = this._decLibre(r, p.s, p.sens, p.dec, (p.z - r.az) * r.dx - (p.x - r.ax) * r.dz, p.memo);
        let sv = p.s + p.sens * this._pasCarotte;
        const fin = p.sens > 0 ? r.sMax : r.sMin;
        if ((p.sens > 0 && sv >= fin) || (p.sens < 0 && sv <= fin)) sv = fin;
        const tx = r.ax + r.dx * sv - r.dz * decL, tz = r.az + r.dz * sv + r.dx * decL;
        let capVise = Math.atan2(tx - p.x, tz - p.z);
        // LES AUTRES. On regarde qui est devant, à moins de 2,5 m et dans le couloir :
        //  - quelqu'un qui va dans le même sens, plus lentement ou arrêté : on se décale pour le doubler, et on
        //    règle son pas sur le sien le temps de passer ;
        //  - n'importe qui dans l'axe, y compris celui qui vient en face : on s'en détourne d'autant plus qu'il est
        //    près et pile devant. Chacun tenant sa droite, on se croise sans se frôler.
        // On ne freine JAMAIS pour celui qui vient en face : freiner des deux côtés se bloquait (chacun prenait
        // 90 % de la vitesse de l'autre, et les deux finissaient plantés nez à nez).
        const sc = Math.sin(p.cap), cc = Math.cos(p.cap);
        let evite = 0, vGene = Infinity;
        for (const q of L) {
          if (q === p) continue;
          const ax = q.x - p.x, az = q.z - p.z;
          if (ax * ax + az * az > 6.25) continue;
          const devant = ax * sc + az * cc, lat = az * sc - ax * cc;       // lat > 0 : il est sur ma droite
          // À sa hauteur, sur le même trajet, pendant qu'on le double : on garde l'écart jusqu'à l'avoir dépassé.
          // Avant, les 2,5 s de la manœuvre expiraient souvent épaule contre épaule, et on se rabattait DANS lui.
          if (p.doubler > 0 && q.r === r && devant > -0.7 && devant <= 0.3 && Math.abs(lat) < 0.9) p.doubler = Math.max(p.doubler, 0.6);
          if (devant <= 0 || Math.abs(lat) > 0.75) continue;
          evite += (lat > 0 ? 1 : -1) * (1 - Math.abs(lat) / 0.75) * (1 - devant / 2.5);
          // Quelqu'un d'arrêté se double comme un lent, QUEL QUE SOIT SON CAP : celui qui regarde le match est
          // tourné vers le terrain, et le test du cap le laissait de côté — on lui passait au travers.
          const arrete = q.arret > 0 || q.v < 0.3;
          if ((!arrete && Math.cos(q.cap - p.cap) < 0.3) || devant > 1.8 || Math.abs(lat) > 0.55) continue;
          if (q.r === r && p.doubler <= 0) {
            p.doubler = 2.5;
            // 70 cm à sa gauche, depuis sa place RÉELLE sur le trajet (sa place visée, q.dec, n'est pas celle
            // d'un passant arrêté de travers ou en train de contourner un arceau)
            const latQ = -(q.x - r.ax) * r.dz + (q.z - r.az) * r.dx;
            p.decDoubler = Math.max(-1.2, Math.min(1.2, latQ - p.sens * 0.7));
          }
          if (devant < 0.9 && Math.abs(lat) < 0.4) vGene = Math.min(vGene, Math.max(arrete ? 0 : q.v, 0.35) * 0.95);
        }
        // Dernier garde-fou contre le décor : deux « moustaches » devant lui (à 45 et 90 cm). Si l'une touche un
        // obstacle relevé, on tourne du côté qui est libre — ou, si les deux le sont, du côté de la carotte.
        // La carte des décalages libres évite déjà presque tout ; ceci rattrape les virages pris trop court.
        const O = this.occupe;
        if (O && O.size) {
          const occ = (x, z) => O.has(cleCase(Math.floor(x / CASE), Math.floor(z / CASE)));
          for (let dv = 0.45; dv < 1; dv += 0.45) {
            const fx = p.x + sc * dv, fz = p.z + cc * dv;
            if (!occ(fx, fz)) continue;
            const droite = occ(fx - cc * 0.4, fz + sc * 0.4), gauche = occ(fx + cc * 0.4, fz - sc * 0.4);
            if (droite && gauche) break;
            const versDroite = gauche || (!droite && (tz - p.z) * sc - (tx - p.x) * cc > 0);
            evite += (versDroite ? -1 : 1) * (dv < 0.5 ? 1.4 : 0.8);
            break;
          }
        }
        // L'écart est LISSÉ (un dixième de seconde) : sans ça, une moustache qui touche une image sur deux faisait
        // tanguer le passant de quelques degrés à chaque pas.
        p.evite += (Math.max(-1.4, Math.min(1.4, evite)) - p.evite) * Math.min(1, dt * 10);
        capVise += p.evite * 0.7;                                          // à gauche (cap qui augmente) s'il est à droite
        let d = angle(capVise - p.cap);
        // DEMI-TOUR (la visée presque dans le dos) : on tourne du côté LIBRE. Le plus court chemin pour se retourner
        // passe souvent par le mur — au bout du trottoir de Bécon, l'arc de celui qui longeait le grillage entrait
        // dans l'angle du grillage et de la façade. Coincé des deux côtés (le passage entre le kiosque et la haie),
        // on se retourne presque sur place.
        let serre = false;
        if (Math.abs(d) > 2.3 && O && O.size) {
          const occ = (x, z) => O.has(cleCase(Math.floor(x / CASE), Math.floor(z / CASE)));
          const gauche = occ(p.x + cc * 0.5, p.z - sc * 0.5) || occ(p.x + cc * 0.5 + sc * 0.3, p.z - sc * 0.5 + cc * 0.3);
          const droite = occ(p.x - cc * 0.5, p.z + sc * 0.5) || occ(p.x - cc * 0.5 + sc * 0.3, p.z + sc * 0.5 + cc * 0.3);
          if (gauche && !droite) d = -Math.abs(d);
          else if (droite && !gauche) d = Math.abs(d);
          serre = gauche || droite;
        }
        // Le cap rejoint la visée proportionnellement à l'écart (pas de va-et-vient autour d'elle), sans dépasser
        // 2,4 rad/s : un demi-tour prend 1,3 s et se fait en arc d'un demi-mètre.
        p.cap = angle(p.cap + Math.max(-2.4 * dt, Math.min(2.4 * dt, d * Math.min(1, 6 * dt))));
        // on ralentit dans les virages serrés, et le temps de doubler on force un peu l'allure
        let vCible = Math.min(vGene, serre ? 0.25 : Infinity, p.vPerso * (0.45 + 0.55 * Math.max(0, Math.cos(d))) * (p.doubler > 0 ? 1.08 : 1));
        // Au bord de la chaussée, on laisse passer la voiture qui arrive. Pas plus de six secondes : au-delà on
        // traverse quand même (une voiture arrêtée, ou le jeu en pause pendant que les voitures sont figées).
        if (p.impatient > 0) p.impatient -= dt;
        else if (this._voitureArrive(p)) {
          vCible = 0;
          p.attente += dt;
          if (p.attente > 6) { p.impatient = 4; p.attente = 0; }
        } else p.attente = 0;
        p.doubler = Math.max(0, p.doubler - dt);
        p.v += Math.max(-1.6 * dt, Math.min(0.9 * dt, vCible - p.v));
        p.x += Math.sin(p.cap) * p.v * dt; p.z += Math.cos(p.cap) * p.v * dt;
        const s0 = p.s;
        p.s = Math.min(r.len, Math.max(0, (p.x - r.ax) * r.dx + (p.z - r.az) * r.dz));
        // bifurcation en passant devant un raccord (le passage piéton) : une fois sur trois. Pas dans les
        // secondes qui suivent un changement de trajet : celui qui débouche du passage ne doit pas y retourner.
        p.bifurque -= dt;
        for (const j of r.milieu) {
          if (p.bifurque > 0 || (s0 - j.s) * (p.s - j.s) > 0 || s0 === p.s) continue;
          if (!praticable(j.vers, j.bout ? j.vers.len : 0)) continue;       // ce bout-là donne dans un mur
          if (Math.random() < 0.33) { this._changer(p, j.vers, j.bout ? j.vers.len : 0, j.bout ? -1 : 1); break; }
        }
        // bout (praticable) du trajet atteint — ou dépassé : il fait demi-tour vers la partie praticable
        if (p.r === r && (p.sens > 0 ? p.s > fin - 0.6 : p.s < fin + 0.6)) this._auBout(p);
        // envie de regarder le match (seulement près du terrain, et pas tous les dix mètres)
        p.envieDeRegarder -= dt;
        if (p.envieDeRegarder <= 0) {
          p.envieDeRegarder = rnd(18, 45);
          const dCentre = Math.hypot(p.x, p.z);
          if (dCentre < 26 && Math.random() < 0.5) this._sArreter(p, rnd(3.5, 9), true);
        }
      }
      p.racine.position.set(p.x, 0, p.z);
      p.racine.rotation.y = p.cap;
    }
    this._contacts();
  }

  // CONTACT. Tout ce qui précède évite qu'on se rentre dedans ; ceci garantit qu'on ne se traverse pas. Deux
  // corps à moins de 50 cm s'écartent l'un de l'autre, surtout celui qui marche (celui qui s'est arrêté pour
  // regarder le match ne se fait pas bousculer), et jamais vers un obstacle relevé. Sur trois minutes de rue, deux
  // passants se chevauchaient une image sur sept (doublement qui finissait dans l'épaule de l'autre, croisement dans
  // un passage étroit, attroupement au bout du trottoir) ; c'était ce qui se voyait le plus après les murs.
  _contacts() {
    const L = this.list, O = this.occupe;
    const occ = (x, z) => !!O && O.has(cleCase(Math.floor(x / CASE), Math.floor(z / CASE)));
    for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) {
      const p = L[a], q = L[b];
      const dx = q.x - p.x, dz = q.z - p.z, d2 = dx * dx + dz * dz;
      if (d2 >= 0.25) continue;
      const d = Math.sqrt(d2), trop = 0.5 - d;
      // pile au même endroit (rare) : on les sépare en travers de la marche de p
      const ux = d > 1e-4 ? dx / d : Math.cos(p.cap), uz = d > 1e-4 ? dz / d : -Math.sin(p.cap);
      let wp = (p.v + 0.05) / (p.v + q.v + 0.1), wq = 1 - wp;
      const pBloque = occ(p.x - ux * trop * wp, p.z - uz * trop * wp), qBloque = occ(q.x + ux * trop * wq, q.z + uz * trop * wq);
      if (pBloque && qBloque) continue;
      if (pBloque) { wp = 0; wq = 1; } else if (qBloque) { wp = 1; wq = 0; }
      p.x -= ux * trop * wp; p.z -= uz * trop * wp;
      q.x += ux * trop * wq; q.z += uz * trop * wq;
      for (const m of [p, q]) {
        m.s = Math.min(m.r.len, Math.max(0, (m.x - m.r.ax) * m.r.dx + (m.z - m.r.az) * m.r.dz));
        m.racine.position.set(m.x, 0, m.z);
      }
    }
  }

  _auBout(p) {
    const r = p.r, e = p.sens > 0 ? 1 : 0, fin = e ? r.sMax : r.sMin;
    // Les suites possibles : les raccords du bout du segment si ce bout est praticable, et, quand le trajet a été
    // raccourci devant un mur, un raccord posé juste avant (le passage piéton qui débouche devant la façade).
    // Seulement vers un trajet dont l'endroit d'arrivée est praticable lui aussi.
    const suites = [];
    if (praticable(r, e ? r.len : 0)) for (const j of r.bouts[e]) if (praticable(j.vers, j.s)) suites.push(j);
    for (const j of r.milieu) {
      const s = j.bout ? j.vers.len : 0;
      if (Math.abs(j.s - fin) < 1.6 && praticable(j.vers, s)) suites.push({ vers: j.vers, s });
    }
    if (suites.length && Math.random() < 0.75) {
      const j = pick(suites);
      const sens = j.s < j.vers.sMin + 2 ? 1 : j.s > j.vers.sMax - 2 ? -1 : (Math.random() < 0.5 ? 1 : -1);
      this._changer(p, j.vers, j.s, sens);
      return;
    }
    // demi-tour : la carotte passe derrière lui, il tourne en arc ; parfois il marque d'abord un temps d'arrêt —
    // pas devant un mur (bout raccourci par le relevé) : planté le nez contre une façade, on le croirait en panne
    const mur = e ? r.sMax < r.len - 0.5 : r.sMin > 0.5;
    p.sens = -p.sens;
    if (!mur && Math.random() < 0.35) this._sArreter(p, rnd(1.2, 4), false);
  }

  _changer(p, route, s, sens) {
    p.r = route; p.sens = sens;
    p.s = Math.min(route.len, Math.max(0, (p.x - route.ax) * route.dx + (p.z - route.az) * route.dz));
    // décalage actuel mesuré sur le nouveau trajet : il rejoint sa droite en douceur, sans saut de position
    p.dec = Math.max(-0.8, Math.min(0.8, -(p.x - route.ax) * route.dz + (p.z - route.az) * route.dx));
    p.doubler = 0; p.bifurque = 4;
  }

  _sArreter(p, duree, regarder) {
    p.arret = duree;
    p.capArret = undefined;
    if (regarder) {
      // se tourner vers le terrain, mais pas au point de lui tourner le dos : 100° au plus depuis sa marche
      const vers = Math.atan2(-p.x, -p.z), d = angle(vers - p.cap);
      p.capArret = p.cap + Math.sign(d) * Math.min(Math.abs(d), 1.75);
      p.regardVise = 1;
    }
  }

  // ---------------------------------------------------------------- animation
  _animer(p, dt) {
    if (!p.modele) {
      // bonhomme en boîtes : jambes et bras en opposition, léger roulis du buste
      const moving = p.v > 0.15;
      p.phaseBoites += dt * p.v * 6.0;
      const a = moving ? Math.sin(p.phaseBoites) * 0.62 * Math.min(1, p.v) : 0, b = -a;
      const u = p.boites.userData;
      u.legL.rotation.x = a; u.legR.rotation.x = b;
      u.armL.rotation.x = b * 0.7; u.armR.rotation.x = a * 0.7;
      u.body.position.y = moving ? Math.abs(Math.sin(p.phaseBoites)) * 0.025 : 0;
      u.body.rotation.z = moving ? Math.sin(p.phaseBoites) * 0.03 : 0;
      return;
    }
    // La phase avance de la distance parcourue : c'est ce qui colle les pieds au sol, même quand il ralentit
    // dans un virage ou repart après un arrêt.
    p.phase = (p.phase + (p.v * dt) / p.foulee) % 1;
    // Cadence de l'animation : chaque image de près, 30 puis 15 fois par seconde au loin, 4 fois quand
    // personne ne l'a dessiné à l'image précédente (hors champ, derrière la caméra). La position, elle, avance
    // à chaque image : seul le squelette prend un peu de retard là où ça ne se voit pas. Sauf son OMBRE : un
    // passant juste derrière la caméra, soleil dans le dos, projette la sienne en plein champ, et ses jambes y
    // battaient à 4 images par seconde. Tant qu'il porte une ombre, il reste à 15.
    p.dist = this.camConnue ? this.cam.distanceTo(p.racine.position) : Infinity;
    const vu = this.t - p.vu < 0.25;
    const pas = !vu ? (p.peau && p.peau.castShadow ? 1 / 15 : 0.25) : p.dist < 18 ? 0 : p.dist < 34 ? 1 / 30 : 1 / 15;
    p.dtAnim += dt;
    if (p.dtAnim < pas) return;
    const da = p.dtAnim; p.dtAnim = 0;
    const wm = lisser(0.06, 0.55, p.v);
    const dur = p.dureeMarche;
    p.marche.time = ((p.phase + p.phase0) % 1) * dur;
    p.marche.setEffectiveWeight(p.repos ? wm : 1);
    if (p.repos) p.repos.setEffectiveWeight(1 - wm);
    p.mixer.update(da);
    // Les bras de la mocap CMU pendent un peu écartés du corps (le sujet marchait les coudes ouverts, et le
    // retarget sur un avatar plus étroit l'accentue) : on les rapproche de 6° autour de l'axe avant du
    // personnage, ramené dans le repère de la clavicule.
    const o = p.os;
    if (o.Spine2 && o.LeftShoulder && o.RightShoulder && o.LeftArm && o.RightArm) {
      _qc.copy(o.Hips.quaternion).multiply(o.Spine.quaternion).multiply(o.Spine1.quaternion).multiply(o.Spine2.quaternion);
      for (let i = 0; i < 2; i++) {
        const c = i ? 'Right' : 'Left';
        _qa.copy(_qc).multiply(o[c + 'Shoulder'].quaternion);
        o[c + 'Arm'].quaternion.premultiply(_q.setFromAxisAngle(_v.copy(_Z).applyQuaternion(_qb.copy(_qa).invert()), (i ? 1 : -1) * 0.105));
      }
    }
    // LE REGARD. Qui s'est arrêté regarde la balle ; en marchant le long du terrain, on y jette un œil de temps
    // en temps. La tête et le cou tournent par-dessus le clip (40 % pour le cou, 60 % pour la tête), sans jamais
    // dépasser 70° : au-delà on tourne les épaules, et ça les clips ne le font pas.
    if (p.arret <= 0 && Math.random() < da * 0.08) p.regardVise = Math.hypot(p.x, p.z) < 28 && Math.random() < 0.6 ? 1 : 0;
    p.regard += Math.max(-da * 1.5, Math.min(da * 1.5, p.regardVise - p.regard));
    if (p.regard > 0.01 && o.Head && o.Neck && o.Spine2) {
      const balle = this.scene.userData.ball && this.scene.userData.ball.mesh;
      if (balle) _cible.copy(balle.position); else _cible.set(0, 1.5, 0);
      const vers = Math.atan2(_cible.x - p.x, _cible.z - p.z);
      const a = angle(vers - p.cap);
      // ce qui est dans son dos, il ne se tord pas le cou pour le voir
      const d = Math.max(-1.2, Math.min(1.2, a)) * p.regard * (1 - lisser(1.7, 2.3, Math.abs(a)));
      // Tourner autour de la VERTICALE du personnage, pas de l'axe de l'os : la nuque penche en avant, et tourner
      // autour d'elle inclinait la tête sur l'épaule. La verticale est ramenée dans le repère du parent de chaque
      // os en remontant la chaîne bassin -> buste, avec les rotations que le clip vient d'écrire.
      _qa.copy(o.Hips.quaternion).multiply(o.Spine.quaternion).multiply(o.Spine1.quaternion).multiply(o.Spine2.quaternion);
      o.Neck.quaternion.premultiply(_q.setFromAxisAngle(_v.copy(_Y).applyQuaternion(_qb.copy(_qa).invert()), d * 0.4));
      _qa.multiply(o.Neck.quaternion);
      o.Head.quaternion.premultiply(_q.setFromAxisAngle(_v.copy(_Y).applyQuaternion(_qb.copy(_qa).invert()), d * 0.6));
    }
  }

  update(dt) {
    if (!(dt > 0 && dt < 0.5)) return;
    this.t += dt;
    this.place(dt);
    const ombre = this._ombres();
    for (const p of this.list) {
      this._animer(p, dt);
      if (!p.peau) continue;
      // NIVEAU DE DÉTAIL. Au-delà de 12 m (8 sur téléphone) un passant fait moins de 150 pixels de haut : on
      // dessine sa version à cinq mille triangles. L'écart entre les deux seuils évite qu'il clignote d'une
      // version à l'autre en marchant pile à la frontière.
      if (p.peauLoin) {
        const loin = p.estLoin ? p.dist > SEUIL_LOD - 1.5 : p.dist > SEUIL_LOD;
        if (loin !== p.estLoin) { p.estLoin = loin; p.peau.visible = !loin; p.peauLoin.visible = loin; }
      }
      // L'ombre d'un passant à plus de 30 m de la caméra fait trois pixels : on ne la dessine plus.
      const o = ombre && p.dist < 30;
      if (p.peau.castShadow !== o) { p.peau.castShadow = o; if (p.peauLoin) p.peauLoin.castShadow = o; }
    }
  }
}

// =====================================================================================================================
//  LE PARC DE BÉCON EN ENTIER : LES PROMENEURS DES ALLÉES (lot C1 du chantier « parc complet »)
// =====================================================================================================================
// Au parc EN ENTIER (drapeau « parc entier » levé : c'est js/parc/index.js qui les installe), vingt-six promeneurs
// (douze sur téléphone) marchent sur le GRAPHE DES ALLÉES de monde.json (tools/parc/construire_monde.py, graphe_allees :
// les allées, les rampes et les escaliers du parc, un nœud tous les 8 m au plus), à la hauteur du sol du monde
// (Monde.sol) : ils descendent et remontent la rampe est, prennent les volées du château et les escaliers du coteau,
// font le tour de la terrasse du bassin, s'arrêtent un moment, s'assoient sur les bancs que les zones ont déclarés
// (zone.bancs, Monde.bancs), se croisent en tenant leur droite et ne se traversent jamais. Drapeau baissé, rien de tout
// cela n'existe : La Cage, Levallois et le parc d'aujourd'hui gardent la classe Pedestrians ci-dessus, telle quelle.
//
// LES MÊMES PERSONNAGES qu'à La Cage — les huit avatars allégés, leurs teintes de haut et de bas tirées au sort, leur
// foulée mesurée, la marche mocap et l'Idle — mais DESSINÉS AUTREMENT. À La Cage, chaque passant est un maillage skinné :
// un appel de dessin et un squelette animé par le processeur chacun. Trente personnes dispersées sur quatre hectares,
// ce serait trente appels (et trente de plus dans l'ombre) et trente squelettes : hors du budget (conception, § 3.6).
// Ici :
//  - UN InstancedMesh PAR AVATAR (huit sur PC, six sur téléphone) : tous les promeneurs d'un même avatar en un seul
//    appel de dessin, soit 6 à 8 appels pour tous (plus autant dans la passe d'ombre, quand elle est allumée) ;
//  - LE SQUELETTE EST CUIT : au chargement, on joue la marche, le repos et le geste de s'asseoir sur l'avatar, image par
//    image, et l'on range la matrice de chaque os dans une texture (une ligne par image, trois texels par os). Le vertex
//    shader lit, pour chaque promeneur, les deux images qui encadrent sa phase et les mélange : c'est le skinning de
//    three, mais lu dans cette texture au lieu d'un squelette vivant. Le processeur ne calcule plus que des positions ;
//  - LES TEINTES par promeneur passent par instanceColor (le haut) et un attribut d'instance (le bas), avec le masque de
//    tools/passants_glb.py, comme à La Cage : les plis restent, seule la couleur change ;
//  - LA VERSION « DE LOIN » de l'avatar (cinq mille triangles) pour tous : à la distance où l'on croise un promeneur dans
//    le parc, c'est celle que La Cage montre déjà au-delà de 12 m.
// Tout est rangé dans UN groupe, marqué `dynamique` et `nofuse` au premier niveau de la scène (règle 5 de la conception :
// ni la fusion du décor, ni l'ombre cuite, ni la photo de la carte d'environnement ne les figent — le bug de La Cage).
//
// OÙ ILS SONT. Pas répartis sur les 2,5 km d'allées (on n'en croiserait presque jamais) : ils vivent dans une BULLE
// autour du joueur, de la taille de la distance « détail » des morceaux (js/monde_charge.js, reglages). Celui qui en
// sort, hors de la vue, renaît ailleurs dans la bulle — jamais sous les yeux du joueur : hors du champ, ou assez loin
// pour être dans la brume ; celui qui arrive à un cul-de-sac (un portail fermé) « sort du parc » de la même façon, ou
// fait demi-tour si on le regarde. À un carrefour, il continue plutôt tout droit, et revient plutôt vers le joueur
// quand il approche du bord de la bulle. Le graphe de monde.json est complété à l'installation : ses culs-de-sac qui
// débouchent sur une place sont raccordés à travers elle (raccorderCulsDeSac) ; ses arêtes qu'un obstacle déclaré ferme
// (un portillon fermé, une grille, la tente de la place en éventail) sont retirées d'avance, en tâche de fond
// (areteFermee, _fermer), celles qui frôlent un obstacle reçoivent un couloir libre (decal), les bouts d'allée de
// moins de 3 m et les îlots qui en restent sont retirés aussi (elaguer), et celle qui aurait échappé au parcours est
// abandonnée dès qu'on y est resté coincé deux fois (_coince). Personne ne change de niveau d'un pas (MARCHE_MAX : ni
// sauter du haut d'un mur, ni grimper le flanc d'une volée), ni ne se rattache à une allée d'un autre niveau. On ne
// s'assoit que sur un banc construit (_siegePret : le morceau de zone qui le porte est en état « detail ») et qu'on
// rejoint de plain-pied.
//
// Tant que les modèles ne sont pas arrivés — ou s'ils n'arrivent jamais — les promeneurs marchent sans être dessinés.
const PROMENEURS = MOBILE ? 12 : 26;
const TYPES_PARC = MOBILE ? 6 : 8;
// Les images cuites de chaque avatar : un cycle de marche, le repos (le clip entier, en boucle), et le geste de s'asseoir,
// de debout (première image : celle du repos) à assis (dernière).
const IM_MARCHE = 40, IM_REPOS = 32, IM_ASSIS = 12;
const OMBRE_PARC = 30;                           // m : hors du champ, au-delà, son ombre n'entre plus dans l'image
const DUREE_S_ASSEOIR = 1.1, DUREE_SE_LEVER = 0.9;
// (sans js/monde_charge.js : les distances du préréglage « haute »)
const DISTANCES_DEFAUT = MOBILE ? { detail: 45, libere: 70 } : { detail: 70, libere: 110 };
// La pose assise : celle du joueur sur un banc (js/player.js : REST, puis « ASSIS SUR LE BANC » — cuisses à
// l'horizontale, genoux pliés et un peu écartés, buste penché, avant-bras posés sur les cuisses), posée sur le
// squelette par AvatarRig.apply, comme pour lui.
const POSE_DEBOUT = { tL: 0, tR: 0, tLz: 0, tRz: 0, kL: 0.08, kR: 0.08, aL: 0.15, aR: 0.15, aLz: 0.12, aRz: -0.12, aLy: 0, aRy: 0,
  eLy: 0, eRy: 0, eL: -0.25, eR: -0.25, hL: 0, hR: 0, torsoX: 0, torsoY: 0, bob: 0, headX: 0 };
const POSE_ASSISE = { ...POSE_DEBOUT, kL: 1.56, kR: 1.52, tL: -1.46, tR: -1.42, tLz: 0.15, tRz: -0.13, torsoX: 0.16, headX: -0.06,
  aL: -0.10, aR: -0.14, aLz: 0.09, aRz: -0.08, eL: -1.08, eR: -1.02, hL: -0.10, hR: -0.08 };

// LE SKINNING LU DANS LA TEXTURE CUITE. Une image = une ligne, trois texels par os : les trois lignes de la matrice
// (affine) qui mène un sommet de la pose de liaison à la pose de cette image, dans le repère de l'avatar. Par instance,
// `aAnimA` et `aAnimB` donnent deux poses, chacune entre deux images (ligne 0, ligne 1, fraction), et `aAnimA.w` la part
// de la pose B : la marche se fond dans le repos quand on ralentit, le repos dans le geste de s'asseoir quand on
// s'assoit. On mélange, os par os, les matrices des deux images voisines : à un quarantième de pas l'une de l'autre,
// c'est exact à l'œil (entre deux poses très différentes, on ne mélange jamais : le geste de s'asseoir est cuit en
// douze images justement pour ça). Le reste est le code de three (skinbase / skinnormal / skinning) récrit.
const GLSL_TETE = /* glsl */`
uniform highp sampler2D uAnim;
attribute vec4 skinIndex;
attribute vec4 skinWeight;
attribute vec4 aAnimA;
attribute vec4 aAnimB;
mat4 osImage( const in float os, const in vec3 A ) {
  int x = int( os + 0.5 ) * 3;
  ivec2 p0 = ivec2( x, int( A.x + 0.5 ) ), p1 = ivec2( x, int( A.y + 0.5 ) );
  vec4 l0 = mix( texelFetch( uAnim, p0, 0 ), texelFetch( uAnim, p1, 0 ), A.z );
  vec4 l1 = mix( texelFetch( uAnim, p0 + ivec2( 1, 0 ), 0 ), texelFetch( uAnim, p1 + ivec2( 1, 0 ), 0 ), A.z );
  vec4 l2 = mix( texelFetch( uAnim, p0 + ivec2( 2, 0 ), 0 ), texelFetch( uAnim, p1 + ivec2( 2, 0 ), 0 ), A.z );
  return mat4( l0.x, l1.x, l2.x, 0.0, l0.y, l1.y, l2.y, 0.0, l0.z, l1.z, l2.z, 0.0, l0.w, l1.w, l2.w, 1.0 );
}
mat4 osPose( const in float os ) {
  // (un seul return : avec des return anticipés, le compilateur HLSL d'ANGLE — Windows — signalait une variable
  // « peut-être non initialisée » à chaque compilation du programme)
  mat4 m = osImage( os, aAnimA.w >= 0.999 ? aAnimB.xyz : aAnimA.xyz );
  if ( aAnimA.w > 0.001 && aAnimA.w < 0.999 ) m = m * ( 1.0 - aAnimA.w ) + osImage( os, aAnimB.xyz ) * aAnimA.w;
  return m;
}`;
const GLSL_OS = /* glsl */`
  mat4 skinMatrix = osPose( skinIndex.x ) * skinWeight.x;
  if ( skinWeight.y > 0.0 ) skinMatrix += osPose( skinIndex.y ) * skinWeight.y;
  if ( skinWeight.z > 0.0 ) skinMatrix += osPose( skinIndex.z ) * skinWeight.z;
  if ( skinWeight.w > 0.0 ) skinMatrix += osPose( skinIndex.w ) * skinWeight.w;`;
const GLSL_POSITION = 'transformed = ( skinMatrix * vec4( transformed, 1.0 ) ).xyz;';

// Le matériau d'un avatar (celui de La Cage : atlas, masque en rugosité, relief sur PC, découpe) et celui de son ombre,
// tous deux skinnés depuis la texture cuite. La teinte : instanceColor pour le haut (vColor, que three multiplierait
// sinon à la couleur : color_fragment est retiré), l'attribut aBas pour le bas, leurs forces dans aAnimB.w et aBas.w.
function materiauxPromeneur(nom, couleur, masque, relief, uAnim, lum) {
  const mat = new THREE.MeshStandardMaterial({
    name: 'promeneur_' + nom, map: couleur, roughnessMap: masque, normalMap: relief || null,
    roughness: 1, metalness: 0, alphaTest: 0.45, side: THREE.DoubleSide,
  });
  if (relief) mat.normalScale.set(0.9, -0.9);
  const uLum = { value: new THREE.Vector2(lum.haut, lum.bas) };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uAnim = uAnim; sh.uniforms.uLumRef = uLum;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + GLSL_TETE + '\nattribute vec4 aBas;\nvarying vec4 vBas;\nvarying float vForceHaut;')
      .replace('#include <skinbase_vertex>', GLSL_OS + '\n  vBas = aBas; vForceHaut = aAnimB.w;')
      .replace('#include <skinnormal_vertex>', 'objectNormal = ( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;')
      .replace('#include <skinning_vertex>', GLSL_POSITION);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uLumRef;\nvarying vec4 vBas;\nvarying float vForceHaut;')
      .replace('#include <color_fragment>', '')
      .replace('#include <map_fragment>', `#include <map_fragment>
        #ifdef USE_ROUGHNESSMAP
          vec3 masqueP = texture2D( roughnessMap, vRoughnessMapUv ).rgb;
          float lumP = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) + 0.03;
          diffuseColor.rgb = mix( diffuseColor.rgb, vColor * min( lumP / ( uLumRef.x + 0.03 ), 2.2 ), masqueP.r * vForceHaut );
          diffuseColor.rgb = mix( diffuseColor.rgb, vBas.rgb * min( lumP / ( uLumRef.y + 0.03 ), 2.2 ), masqueP.b * vBas.a );
        #endif`);
  };
  mat.customProgramCacheKey = () => 'promeneur-parc';
  const ombre = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: couleur, alphaTest: 0.45, side: THREE.DoubleSide });
  ombre.onBeforeCompile = (sh) => {
    sh.uniforms.uAnim = uAnim;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + GLSL_TETE)
      .replace('#include <skinbase_vertex>', GLSL_OS)
      .replace('#include <skinning_vertex>', GLSL_POSITION);
  };
  ombre.customProgramCacheKey = () => 'promeneur-parc-ombre';
  return { mat, ombre };
}

// Les bras de la mocap CMU pendent un peu écartés du corps : on les rapproche de 6°, comme La Cage le fait à chaque image
// (Pedestrians._animer), ici une fois pour toutes, dans les images cuites.
function brasRapproches(o) {
  if (!(o.Hips && o.Spine && o.Spine1 && o.Spine2 && o.LeftShoulder && o.RightShoulder && o.LeftArm && o.RightArm)) return;
  _qc.copy(o.Hips.quaternion).multiply(o.Spine.quaternion).multiply(o.Spine1.quaternion).multiply(o.Spine2.quaternion);
  for (let i = 0; i < 2; i++) {
    const c = i ? 'Right' : 'Left';
    _qa.copy(_qc).multiply(o[c + 'Shoulder'].quaternion);
    o[c + 'Arm'].quaternion.premultiply(_q.setFromAxisAngle(_v.copy(_Z).applyQuaternion(_qb.copy(_qa).invert()), (i ? 1 : -1) * 0.105));
  }
}

// LA CUISSON DU SQUELETTE d'un avatar (voir plus haut) : la matrice de chaque os, image par image, pour la marche (un
// cycle, calé sur la phase de la foulée comme à La Cage), le repos (le clip entier) et le geste de s'asseoir (de la
// première image du repos à la pose assise, os par os, en douze images). La matrice d'un os est celle que three
// calcule pour un maillage skinné : maillage · liaison⁻¹ · os · os de liaison⁻¹ · liaison, l'avatar à l'origine.
// Rend la texture (flottante, lue texel par texel), la durée du repos et la hauteur du bassin une fois assis.
// En TRANCHES de 4 ms (souffler) : d'un bloc, c'était 10 à 12 ms par avatar sur PC, huit fois de suite au démarrage —
// un à-coup de plus que les 8 ms que la conception accorde (§ 3.6), et le triple sur téléphone.
const _mA = new THREE.Matrix4(), _mB = new THREE.Matrix4();
async function cuireSquelette(modele, peau, rig, marche, repos, phase0) {
  let tMain = performance.now(), tranche = 0;                // (tranche : la plus longue, pour bilan())
  const souffler = async () => {
    const d = performance.now() - tMain;
    if (d < 4) return;
    tranche = Math.max(tranche, d);
    await new Promise((ok) => setTimeout(ok, 0));
    tMain = performance.now();
  };
  const os = peau.skeleton.bones, inv = peau.skeleton.boneInverses, nOs = os.length, larg = nOs * 3;
  const haut = IM_MARCHE + IM_REPOS + IM_ASSIS, tab = new Float32Array(larg * haut * 4);
  const B = {};
  modele.traverse((o) => { if (o.isBone) B[o.name.replace(/^mixamorig:?/, '')] = o; });
  const ecrire = (ligne) => {
    modele.updateMatrixWorld(true);
    _mB.multiplyMatrices(peau.matrixWorld, peau.bindMatrixInverse);
    for (let i = 0; i < nOs; i++) {
      _mA.multiplyMatrices(os[i].matrixWorld, inv[i]).multiply(peau.bindMatrix).premultiply(_mB);
      const e = _mA.elements, o = (ligne * larg + i * 3) * 4;
      tab[o] = e[0]; tab[o + 1] = e[4]; tab[o + 2] = e[8]; tab[o + 3] = e[12];
      tab[o + 4] = e[1]; tab[o + 5] = e[5]; tab[o + 6] = e[9]; tab[o + 7] = e[13];
      tab[o + 8] = e[2]; tab[o + 9] = e[6]; tab[o + 10] = e[10]; tab[o + 11] = e[14];
    }
  };
  const photo = () => os.map((b) => [b.quaternion.clone(), b.position.clone()]);
  const mixer = new THREE.AnimationMixer(modele);
  // 1. un cycle de marche
  const am = mixer.clipAction(marche.clip);
  am.play(); am.paused = true;
  for (let j = 0; j < IM_MARCHE; j++) {
    am.time = ((j / IM_MARCHE + phase0) % 1) * marche.clip.duration; mixer.update(0);
    brasRapproches(B); ecrire(j);
    await souffler();
  }
  am.stop();                                     // (les os reprennent leur pose d'origine)
  // 2. le repos, en boucle ; sa première image est la pose « debout » d'où l'on s'assoit
  let dureeRepos = 4, debout = null;
  if (repos) {
    const ar = mixer.clipAction(repos.clip);
    ar.play(); ar.paused = true;
    dureeRepos = repos.clip.duration || 4;
    for (let j = 0; j < IM_REPOS; j++) {
      ar.time = (j / IM_REPOS) * dureeRepos; mixer.update(0);
      brasRapproches(B); ecrire(IM_MARCHE + j);
      if (!j) debout = photo();
      await souffler();
    }
    ar.stop();
  } else {
    debout = photo();
    for (let j = 0; j < IM_REPOS; j++) ecrire(IM_MARCHE + j);
  }
  mixer.stopAllAction(); mixer.uncacheRoot(modele);
  // 3. s'asseoir
  rig.apply(POSE_ASSISE);
  modele.updateMatrixWorld(true);
  const assis = photo();
  const hanches = B.Hips ? B.Hips.getWorldPosition(_pa).y : 0.95;
  for (let j = 0; j < IM_ASSIS; j++) {
    const e = lisser(0, 1, j / (IM_ASSIS - 1));
    for (let i = 0; i < nOs; i++) {
      os[i].quaternion.slerpQuaternions(debout[i][0], assis[i][0], e);
      os[i].position.lerpVectors(debout[i][1], assis[i][1], e);
    }
    ecrire(IM_MARCHE + IM_REPOS + j);
    await souffler();
  }
  const tex = new THREE.DataTexture(tab, larg, haut, THREE.RGBAFormat, THREE.FloatType);
  tex.needsUpdate = true;                        // (DataTexture : lue au plus proche, sans mipmaps — texelFetch de toute façon)
  return { tex, dureeRepos, hanches, tranche: Math.max(tranche, performance.now() - tMain) };
}

// LES RACCORDS DES CULS-DE-SAC. Le graphe de monde.json s'arrête là où s'arrête un tracé : en haut d'une volée qui
// débouche sur une place (le belvédère, le palier de l'escalier de 34 marches, l'esplanade, le perron Charras), au bout
// d'une allée qui finit sur une autre sans la toucher. Ce ne sont pas des impasses : on traverse la place. Sans raccord,
// trente-sept culs-de-sac renvoyaient les promeneurs d'où ils venaient — en haut des volées de 31 marches, au palier de
// l'escalier de 34 (le graphe y est coupé sur 4 m), au pied de l'escalier de 12 marches sur l'esplanade.
// Chaque cul-de-sac est relié au point du graphe le plus proche (un nœud, ou le milieu d'une arête), à RACCORD m au plus,
// qu'on rejoint en ligne droite À PIED SUR UN SOL DUR (aPiedEnLigne) et où le graphe ne mène pas déjà presque aussi vite
// (moins de 1,5 fois la ligne droite + 6 m). Fait une fois, à l'installation (20 à 30 ms sur PC, pendant l'écran de
// chargement) : 18 raccords, et il ne reste que 16 culs-de-sac — les portails et portillons, où le promeneur « sort du
// parc » (voir _progresser), et quelques bouts d'allée qui finissent sur une pelouse.
const RACCORD = 25, HERBE_MAX = 3;
const SOLS_MOUS = new Set([SURFACE.HERBE, SURFACE.SOUS_BOIS]), SOLS_INTERDITS = new Set([SURFACE.MASSIF, SURFACE.EAU, SURFACE.CHAUSSEE]);
// Le segment (ax, az) -> (bx, bz) se fait-il à pied, tout droit ? Tous les 25 cm : sol marchable, hors de l'eau et des
// massifs, DUR — on ne coupe pas à travers les pelouses : HERBE_MAX m d'herbe ou de sous-bois au plus, la bande de
// gazon qui sépare le pied d'une volée du cadre de la terrasse —, sans marche de plus de 12 cm (ni mur, ni volée prise
// de biais) et sans obstacle déclaré à hauteur de genou (grilles, garde-corps, bancs, troncs).
function aPiedEnLigne(ax, az, bx, bz) {
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25)), pas = Math.hypot(bx - ax, bz - az) / n;
  let yPrec = Monde.sol(ax, az), herbe = 0;
  // d'abord le sol (des lectures de grille : la plupart des candidats tombent ici, dès les premiers pas)…
  for (let k = 1; k <= n; k++) {
    const px = ax + ((bx - ax) * k) / n, pz = az + ((bz - az) * k) / n, f = Monde.drapeaux(px, pz), y = Monde.sol(px, pz);
    const s = Monde.surface(px, pz);
    if (SOLS_MOUS.has(s) && (herbe += pas) > HERBE_MAX) return false;
    if (!(f & DRAPEAU.MARCHABLE) || (f & DRAPEAU.EAU) || SOLS_INTERDITS.has(s) || Math.abs(y - yPrec) > 0.12) return false;
    yPrec = y;
  }
  // … puis les obstacles (un point : un segment d'un centimètre, que Monde.rayonLibre teste à son bout)
  for (let k = 1; k <= n; k++) {
    const px = ax + ((bx - ax) * k) / n, pz = az + ((bz - az) * k) / n, y = Monde.sol(px, pz);
    if (Monde.rayonLibre(px, y + 0.5, pz, px + 0.01, y + 0.5, pz, 0.22) < 1) return false;
  }
  return true;
}
// Distances par le graphe depuis le nœud i, jusqu'à `max` m (Dijkstra borné ; la liste ouverte est courte : les nœuds
// sont à 8 m au plus les uns des autres).
function distancesGraphe(voisins, i, max) {
  const d = new Map([[i, 0]]), ouverts = [i], fermes = new Set();
  while (ouverts.length) {
    let k = 0;
    for (let q = 1; q < ouverts.length; q++) if (d.get(ouverts[q]) < d.get(ouverts[k])) k = q;
    const u = ouverts[k]; ouverts.splice(k, 1); fermes.add(u);
    for (const [v, l] of voisins[u]) {
      const dv = d.get(u) + l;
      if (fermes.has(v) || dv > max || dv >= (d.get(v) ?? Infinity)) continue;
      if (!d.has(v)) ouverts.push(v);
      d.set(v, dv);
    }
  }
  return d;
}
// Le cul-de-sac se raccroche à un NŒUD, ou au point le plus proche d'une ARÊTE (qu'on coupe alors en deux, comme
// tools/parc/construire_monde.py le fait entre deux morceaux du graphe) : le pied d'une volée qui tombe au milieu du
// cadre d'une terrasse rejoint le cadre là où il arrive, pas au coin le plus proche. `xs`, `zs` (tableaux) et `aretes`
// ([a, b, type], une arête coupée devient null) sont complétés sur place ; rend le nombre de raccords.
function raccorderCulsDeSac(xs, zs, aretes) {
  const voisins = xs.map(() => []);                         // [nœud voisin, longueur, arête]
  const lier = (a, b, t) => {
    const l = Math.hypot(xs[b] - xs[a], zs[b] - zs[a]), e = aretes.length;
    aretes.push([a, b, t]); voisins[a].push([b, l, e]); voisins[b].push([a, l, e]);
  };
  const origine = aretes.splice(0);
  for (const [a, b, t] of origine) lier(a, b, t | 0);
  let n = 0;
  for (let i = 0; i < xs.length; i++) {
    if (voisins[i].length !== 1) continue;
    const parGraphe = distancesGraphe(voisins, i, 1.5 * RACCORD + 6), candidats = [];
    const loin = (dg, d) => dg === undefined || dg >= 1.5 * d + 6;   // le graphe n'y mène pas déjà presque aussi vite
    for (let j = 0; j < xs.length; j++) {
      const d = Math.hypot(xs[j] - xs[i], zs[j] - zs[i]);
      if (j !== i && d < RACCORD && d >= 0.5 && loin(parGraphe.get(j), d)) candidats.push({ d, j, x: xs[j], z: zs[j] });
    }
    for (let e = 0; e < aretes.length; e++) {
      const A = aretes[e];
      if (!A || A[0] === i || A[1] === i) continue;
      const [a, b] = A, vx = xs[b] - xs[a], vz = zs[b] - zs[a], L2 = vx * vx + vz * vz;
      if (L2 < 1) continue;
      const t = ((xs[i] - xs[a]) * vx + (zs[i] - zs[a]) * vz) / L2, L = Math.sqrt(L2);
      if (t * L < 0.3 || (1 - t) * L < 0.3) continue;       // (près d'un bout : c'est le nœud, déjà candidat)
      const px = xs[a] + vx * t, pz = zs[a] + vz * t, d = Math.hypot(px - xs[i], pz - zs[i]);
      const dA = parGraphe.get(a), dB = parGraphe.get(b);
      const dg = Math.min(dA === undefined ? Infinity : dA + t * L, dB === undefined ? Infinity : dB + (1 - t) * L);
      if (d < RACCORD && d >= 0.5 && loin(Number.isFinite(dg) ? dg : undefined, d)) candidats.push({ d, e, x: px, z: pz });
    }
    // du plus proche au plus lointain, et le premier qu'on rejoint à pied : la ligne droite, coûteuse à tester
    // (Monde.rayonLibre tous les 25 cm), ne l'est que pour quelques candidats
    candidats.sort((p, q) => p.d - q.d);
    const ok = candidats.find((c) => aPiedEnLigne(xs[i], zs[i], c.x, c.z));
    if (!ok) continue;
    let j = ok.j;
    if (j === undefined) {                                  // l'arête est coupée au point de raccord
      const [a, b, t] = aretes[ok.e];
      aretes[ok.e] = null;
      voisins[a] = voisins[a].filter((v) => v[2] !== ok.e); voisins[b] = voisins[b].filter((v) => v[2] !== ok.e);
      j = xs.length; xs.push(ok.x); zs.push(ok.z); voisins.push([]);
      lier(a, j, t); lier(j, b, t);
    }
    lier(i, j, 0); n++;
  }
  return n;
}

// LES CROISEMENTS SANS NŒUD. Par endroits, un nœud du graphe tombe SUR une arête voisine (à quelques centimètres de son
// axe) sans lui être relié : deux tracés qui se rejoignent sans se toucher (la croix de la perspective, x -91,5 ; le
// carrefour à l'ouest du city-stade, où l'allée 403-404 passe à 23 cm du nœud 441). Pour aller de l'un à l'autre, le
// promeneur devait filer jusqu'au bout de l'arête puis revenir sur ses pas par la parallèle — un aller et retour de
// 3 m que _coince prenait pour un blocage, jusqu'à barrer l'allée (et laisser un cul-de-sac à 1,5 m du carrefour).
// L'arête est coupée au droit du nœud (à SOUDURE m au plus de son axe, au même niveau, à 30 cm au moins de ses
// bouts), sans créer de doublon ; `aretes` est modifié sur place (une arête coupée devient null). Rend le nombre de
// soudures.
const SOUDURE = 0.5;
function souder(xs, zs, aretes) {
  const deg = new Uint16Array(xs.length), cle = (a, b) => Math.min(a, b) + ':' + Math.max(a, b);
  const existe = new Set();
  for (const A of aretes) if (A) { deg[A[0]]++; deg[A[1]]++; existe.add(cle(A[0], A[1])); }
  let n = 0;
  for (let i = 0; i < xs.length; i++) {
    if (!deg[i]) continue;
    for (let e = 0; e < aretes.length; e++) {
      const A = aretes[e];
      if (!A || A[0] === i || A[1] === i) continue;
      const [a, b, t] = A, vx = xs[b] - xs[a], vz = zs[b] - zs[a], L = Math.hypot(vx, vz);
      if (L < 1) continue;
      const s = ((xs[i] - xs[a]) * vx + (zs[i] - zs[a]) * vz) / L;
      if (s < 0.3 || s > L - 0.3) continue;
      const px = xs[a] + (vx * s) / L, pz = zs[a] + (vz * s) / L;
      if (Math.hypot(px - xs[i], pz - zs[i]) >= SOUDURE || !memeNiveau(px, pz, xs[i], zs[i])) continue;
      aretes[e] = null;
      for (const j of [a, b]) {
        if (existe.has(cle(i, j))) { deg[j]--; continue; }
        existe.add(cle(i, j)); aretes.push([j, i, t]); deg[i]++;
      }
      n++;
    }
  }
  return n;
}

// Le graphe des allées dans le repère du monde affiché (x + dx), avec ce dont les promeneurs ont besoin : longueurs,
// voisins de chaque nœud, longueurs cumulées (pour tirer un point au hasard, à proportion de la longueur). Les
// croisements sans nœud y sont soudés et les raccords des culs-de-sac (voir plus haut) s'y ajoutent comme des allées.
function grapheParc(g, dx) {
  const xs = g.noeuds.map((n) => n[0] + dx), zs = g.noeuds.map((n) => n[1]);
  let liste = g.aretes.map((a) => [...a]);
  const soudures = souder(xs, zs, liste);
  liste = liste.filter(Boolean);
  const raccords = raccorderCulsDeSac(xs, zs, liste), aretes = liste.filter(Boolean);
  const N = xs.length, E = aretes.length, x = Float32Array.from(xs), z = Float32Array.from(zs);
  const a = new Int32Array(E), b = new Int32Array(E), t = new Uint8Array(E), L = new Float32Array(E), cumul = new Float64Array(E);
  const adj = Array.from({ length: N }, () => []);
  let total = 0;
  for (let e = 0; e < E; e++) {
    const [ia, ib, ty] = aretes[e];
    a[e] = ia; b[e] = ib; t[e] = ty | 0;
    L[e] = Math.max(0.05, Math.hypot(x[ib] - x[ia], z[ib] - z[ia]));
    adj[ia].push(e); adj[ib].push(e);
    total += L[e]; cumul[e] = total;
  }
  const tirer = (r) => {                         // l'arête où tombe la longueur cumulée r (dichotomie)
    let lo = 0, hi = E - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cumul[m] < r) lo = m + 1; else hi = m; }
    return lo;
  };
  // barree[e] : combien de fois un promeneur est resté coincé sur l'arête e sans personne autour (voir _coince) ;
  // 2 d'office pour une arête fermée d'avance (voir areteFermee) ; decal[e] : le couloir d'une arête qui frôle un
  // obstacle (idem)
  return { N, E, x, z, a, b, t, L, adj, total, tirer, raccords, soudures, barree: new Uint8Array(E), decal: new Float32Array(E) };
}

// LES PASSAGES FERMÉS D'AVANCE. Le graphe de monde.json suit les tracés (OSM, la conception) ; les zones, elles, ont posé
// leurs obstacles sur le terrain, et une dizaine d'arêtes passent au travers : les portillons fermés des sorties (PQN au
// bout de la promenade, PQS, PSO, la grille 156…), la grille de l'aire des bateaux-balançoires (Z14), la tente blanche
// ronde de 9,6 m au pivot de la place en éventail (Z14, au carrefour de trois chemins), la balustrade du mur des caves.
// _coince finit par l'apprendre en jouant, mais au prix de deux promeneurs plantés trois secondes contre la toile ou la
// grille — souvent sous les yeux du joueur. Ici, chaque arête est parcourue UNE fois, en tâche de fond (_fermer), avec le
// disque d'un promeneur et ce qui l'arrête vraiment en marchant (Monde.resoudre, 24 cm, « pieton ») : tous les 25 cm de
// l'axe, et, là où l'axe est pris, sur quatre COULOIRS parallèles (à 50 cm et 1 m de part et d'autre), de 2 m avant à 2 m
// après. Aucun couloir libre — une grille en travers, même en biais, une tente de 10 m — : l'arête est fermée
// (barree = 2 : plus personne ne la prend ni n'y naît, comme une arête barrée en jouant ; son bout devient un cul-de-sac,
// où l'on fait demi-tour ou d'où l'on « sort du parc »). Un tronc, une borne, un lampadaire au milieu d'une allée large
// laissent un couloir libre : les moustaches les contournent. (L'état des portillons est celui du moment du parcours :
// aujourd'hui, aucun ne s'ouvre en jouant.)
// LE COULOIR D'UNE ARÊTE QUI FRÔLE UN OBSTACLE. Cinq arêtes ont leur axe pris par endroits sans être fermées : au haut
// des volées du château (Z06), l'arête qui monte vers l'allée haute rase le bout du parapet nord à 12 cm ; celle de
// l'allée du mur touche le garde-corps de la volée de 12 marches (Z02). Celui qui y tenait sa droite visait derrière le
// parapet, s'y collait, finissait « coincé » — et l'arête barrée pour tout le monde, l'allée haute coupée des volées.
// Le parcours retient donc, pour ces arêtes, le couloir libre partout où l'axe est pris (le premier de COULOIRS, le plus
// près de l'axe) : `decal[e]`, en mètres, + à droite en allant de a vers b. Sur une telle arête, on marche dans ce
// couloir au lieu de tenir sa droite (_carotte). (Aucun couloir commun à tous les endroits pris : 0, les moustaches
// s'en chargent.)
const PAS_FERME = 0.25, COULOIRS = [0.5, -0.5, 1, -1], LONG_COULOIR = 8;      // 8 pas de 25 cm : 2 m avant et après
const TRANCHE_FERME = 0.25;                                                  // ms par image consacrées au parcours
const _dq = { x: 0, z: 0 };
// (le disque de rayon r en (x, z) touche-t-il un obstacle qui arrête un piéton ? Monde.resoudre le pousserait)
function pris(x, z, r = 0.24) { _dq.x = x; _dq.z = z; return Monde.resoudre(_dq, r, 'pieton'); }
// LE NIVEAU. Monde.resoudre ne connaît que les obstacles déclarés ; un mur de soutènement, le limon d'une volée, le
// bord d'une terrasse ne sont, eux, qu'un saut de hauteur du sol (une frontière « dure » entre deux nappes). Le joueur
// les respecte par Monde.franchir ; les promeneurs, eux, n'en savaient rien : poussé par un autre, rattaché à l'allée
// la plus proche en se relevant d'un banc de l'esplanade (l'allée du mur, 1,9 m plus haut, derrière le mur), un
// promeneur passait d'une nappe à l'autre — debout sur le plateau au pied du mur, ou grimpant le flanc de la volée de
// 12 marches en sautant d'un mètre à chaque image. Un pas qui change le sol de plus de MARCHE_MAX est refusé (un pas
// de 7 cm dans les marches les plus raides en change 4).
// ET LE NIVEAU DE L'ALLÉE. Un promeneur vise son allée, pas ce qui la borde : sa droite (_carotte), son point de
// naissance, le couloir d'une arête qui frôle un obstacle ne sont pris que s'ils sont à moins de NIVEAU_ALLEE de la
// hauteur de l'axe. Sans cela, au théâtre de verdure, celui qui tenait sa droite au pied de l'escalier latéral montait
// de 25 en 25 cm sur le premier gradin, le longeait, et ne pouvait plus en redescendre (50 cm d'un coup) : coincé, et
// l'allée de la scène barrée. (Le pas lui-même n'est pas tenu à ce niveau : une allée tracée au bord d'un talus, celle
// du chemin x -41 contre la rampe est, aurait alors piégé qui s'en écartait de 30 cm.)
const MARCHE_MAX = 0.35, NIVEAU_ALLEE = 0.2;
function memeNiveau(x0, z0, x1, z1, max = MARCHE_MAX) { return Math.abs(Monde.sol(x1, z1) - Monde.sol(x0, z0)) <= max; }
// Le segment (ax, az) -> (bx, bz) est-il de plain-pied, tous les 25 cm (des marches, oui ; un mur, non) ?
function plainPied(ax, az, bx, bz) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25));
  let yPrec = Monde.sol(ax, az);
  for (let k = 1; k <= n; k++) {
    const y = Monde.sol(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n);
    if (Math.abs(y - yPrec) > 0.2) return false;
    yPrec = y;
  }
  return true;
}
// Vrai si l'arête e est fermée ; sinon, son couloir est noté dans G.decal[e] (0 : l'axe est libre).
function areteFermee(G, e) {
  const a = G.a[e], b = G.b[e], L = G.L[e], ux = (G.x[b] - G.x[a]) / L, uz = (G.z[b] - G.z[a]) / L;
  const n = Math.max(1, Math.round(L / PAS_FERME));
  // (libre d'obstacle, et au niveau de l'axe : un couloir pris au pied du mur, dans la nappe d'à côté, ne mène nulle part)
  const couloirLibre = (x, z, o) => {
    if (!memeNiveau(x, z, x - uz * o, z + ux * o, NIVEAU_ALLEE)) return false;
    for (let q = -LONG_COULOIR; q <= LONG_COULOIR; q++) if (pris(x - uz * o + ux * q * PAS_FERME, z + ux * o + uz * q * PAS_FERME)) return false;
    return true;
  };
  let communs = (1 << COULOIRS.length) - 1, axePris = false;     // (les couloirs libres partout où l'axe est pris)
  for (let k = 0; k <= n; k++) {
    const s = (L * k) / n, x = G.x[a] + ux * s, z = G.z[a] + uz * s;
    if (!pris(x, z)) continue;
    let ici = 0;
    COULOIRS.forEach((o, j) => { if (couloirLibre(x, z, o)) ici |= 1 << j; });
    if (!ici) return true;
    axePris = true; communs &= ici;
  }
  if (axePris && communs) G.decal[e] = COULOIRS[Math.log2(communs & -communs)];
  return false;
}

// LES MOIGNONS ET LES ÎLOTS, une fois les passages fermés (fin du parcours de _fermer). Un cul-de-sac est un bout du
// parc où l'on « sort » (un portail) ou d'où l'on revient ; mais un bout d'allée de moins de MOIGNON m qui pend d'un
// carrefour n'est ni l'un ni l'autre : celui de 60 cm au palier de l'escalier de 34 marches (Z02) renvoyait d'un coup
// en arrière, ou faisait disparaître, le promeneur qui le prenait en arrivant en haut de la volée de 12. Et une arête
// coincée entre deux passages fermés (la promenade, sous le portillon nord-est) n'est plus qu'un ÎLOT de 6 m où l'on
// ferait les cent pas. Les uns et les autres sont fermés (barree = 2) : rend leur nombre d'arêtes.
const MOIGNON = 3, ILOT = 40;
function elaguer(G) {
  const deg = new Uint16Array(G.N), ouverte = (e) => G.barree[e] < 2;
  for (let e = 0; e < G.E; e++) if (ouverte(e)) { deg[G.a[e]]++; deg[G.b[e]]++; }
  let n = 0;
  // 1. les moignons : du cul-de-sac au premier carrefour, moins de MOIGNON m
  for (let i = 0; i < G.N; i++) {
    if (deg[i] !== 1) continue;
    const chemin = [];
    let cur = i, long = 0, venu = -1;
    for (;;) {
      const e = G.adj[cur].find((f) => ouverte(f) && f !== venu);
      if (e === undefined) break;
      chemin.push(e); long += G.L[e]; venu = e; cur = G.a[e] === cur ? G.b[e] : G.a[e];
      if (deg[cur] !== 2 || long >= MOIGNON) break;
    }
    if (long < MOIGNON && deg[cur] >= 3) {
      for (const e of chemin) { G.barree[e] = 2; n++; }
      deg[i]--; deg[cur]--;
    }
  }
  // 2. les îlots : les morceaux du graphe (arêtes ouvertes) de moins de ILOT m en tout
  const vu = new Uint8Array(G.N);
  for (let i = 0; i < G.N; i++) {
    if (vu[i] || !deg[i]) continue;
    const pile = [i], aretes = new Set();
    let long = 0;
    vu[i] = 1;
    while (pile.length) {
      const u = pile.pop();
      for (const e of G.adj[u]) {
        if (!ouverte(e) || aretes.has(e)) continue;
        aretes.add(e); long += G.L[e];
        const v = G.a[e] === u ? G.b[e] : G.a[e];
        if (!vu[v]) { vu[v] = 1; pile.push(v); }
      }
    }
    if (long < ILOT) for (const e of aretes) { G.barree[e] = 2; n++; }
  }
  return n;
}

// Les places assises : deux par banc déclaré (à 45 cm de part et d'autre du milieu), avec, pour chacune, le point où l'on
// se tient debout avant de s'asseoir (36 cm devant le point déclaré) et celui du bassin une fois assis (12 cm derrière :
// au-dessus du milieu de l'assise, kit.banc). `cap` : le regard de la personne assise (degrés, x+ à 90°). Seuls les bancs
// qui déclarent la hauteur de leur assise (`y`) ont un modèle : le banc OSM de monde.json n'en a pas.
// `morceaux` : ceux de l'ordonnanceur (js/monde_charge.js) dont la boîte contient le banc (repère du terrain 1, comme
// Monde.bancs) : le banc n'est dessiné que quand ils sont construits (voir _siegePret).
function siegesDesBancs(bancs, dx, morceaux = null) {
  const S = [];
  for (const b of bancs || []) {
    if (!(b.y > 0.2 && b.y < 0.8)) continue;
    const a = ((b.cap || 0) * Math.PI) / 180, fx = Math.sin(a), fz = Math.cos(a), lx = Math.cos(a), lz = -Math.sin(a);
    const porteurs = (morceaux || []).filter((m) => b.x >= m.boite[0] && b.x <= m.boite[2] && b.z >= m.boite[1] && b.z <= m.boite[3]);
    for (const cote of [-0.45, 0.45]) {
      const cx = b.x + dx + lx * cote, cz = b.z + lz * cote;
      S.push({ cap: a, x: cx - fx * 0.12, z: cz - fz * 0.12, ax: cx + fx * 0.36, az: cz + fz * 0.36, y: b.y, sol: Monde.sol(cx, cz), occupe: null, morceaux: porteurs });
    }
  }
  return S;
}

const _c0 = { x: 0, z: 0 }, _car = { x: 0, z: 0, type: 0 }, _posR = { x: 0, z: 0 };
// (la poussée d'un contact, par image : entre promeneurs, et par le joueur, qui va plus vite — 8,4 m/s à vélo, 28 cm
// par image à 30 images/s)
const POUSSEE = 0.15, POUSSEE_JOUEUR = 0.3;
const _frustum = new THREE.Frustum(), _proj = new THREE.Matrix4(), _sph = new THREE.Sphere();
const _camP = new THREE.Vector3(), _pos3 = new THREE.Vector3(), _quat = new THREE.Quaternion(), _scl = new THREE.Vector3(), _m4 = new THREE.Matrix4();
const _poids = new Float32Array(16);
const borner = (v, a, b) => (v < a ? a : v > b ? b : v);

export class PassantsParc {
  // graphe : monde.json > graphe ({ noeuds: [[x, z, y]], aretes: [[i, j, type]] }, repère du terrain 1 ; type 0 allée,
  // 1 escalier, 2 rampe) ; dx : décalage du décor (parc2) ; reglages() : les distances du préréglage (js/monde_charge.js) ;
  // ordonnanceur : celui des morceaux des zones (js/monde_charge.js), qui dit quels bancs sont construits
  constructor(scene, graphe, { dx = 0, reglages = null, ordonnanceur = null } = {}) {
    this.scene = scene; this.dx = dx; this.reglages = reglages;
    const t0 = performance.now();
    this.G = grapheParc(graphe, dx);
    const msGraphe = performance.now() - t0;
    this.sieges = siegesDesBancs(Monde.bancs, dx, ordonnanceur && ordonnanceur.morceaux);
    this.list = []; this.types = []; this.t = 0; this._tBulle = 0; this._frustumPret = false;
    this.camera = null; this.joueur = null; this._c = { x: -8.7 + dx, z: 0 }; this._vie = 95;
    // (mesures, pour la vérification : js/debug_monde.js, __game.scene.userData.pedestrians.bilan())
    this.stats = { ms: 0, msPic: 0, appels: 0, dessines: 0, assis: 0, renaissances: 0, msCuisson: 0, msFoulee: 0,
      raccords: this.G.raccords, soudures: this.G.soudures, msGraphe, barrees: 0, fermees: 0, msFermer: 0, elaguees: 0, refuses: 0 };
    // (les passages fermés d'avance : la prochaine arête à parcourir, voir _fermer — à partir de la première image, quand
    // js/parc/index.js a ajouté aux obstacles des zones ceux du décor du plateau)
    this._aFermer = 0;
    // UN groupe au premier niveau de la scène, `dynamique` et `nofuse` : c'est là que regardent la fusion du décor, l'ombre
    // cuite, la photo de la carte d'environnement et les ombres de contact
    this.group = new THREE.Group(); this.group.name = 'passants du parc';
    Object.assign(this.group.userData, { dynamique: true, nofuse: true });
    scene.add(this.group);
    // Monde.maj (js/monde.js) donne à chaque image la caméra et le joueur : on les note pour l'image suivante (js/parc/index.js
    // range cette fonction dans Monde.taches)
    this.suivre = (dt, camera, joueur) => { if (camera) this.camera = camera; this.joueur = joueur || null; };
    for (const nom of AVATARS.slice(0, TYPES_PARC)) this.types.push({ nom, im: null, n: 0, cuit: null, hauteur: 1.85, foulee: 1.25 });
    for (let i = 0; i < PROMENEURS; i++) this.list.push(this._nouveau(i, i % this.types.length));
    this._peupler();
    // les modèles après le décor : un court délai laisse passer d'abord les morceaux du plateau et les arbres
    setTimeout(() => { this._charger().catch((e) => console.warn('[passants du parc] modèles 3D indisponibles :', e)); }, 800);
  }

  _nouveau(i, type) {
    const h = rnd(1.62, 1.93);
    const teinte = (liste, proba) => {
      const c = new THREE.Color(pick(liste));      // hexadécimal sRGB -> linéaire, comme à La Cage
      return { r: c.r, g: c.g, b: c.b, f: Math.random() < proba ? rnd(0.85, 1) : 0 };
    };
    return {
      i, type, h, k: h / 1.85, foulee: (1.25 * h) / 1.85, vPerso: rnd(1.0, 1.42), cote: rnd(0.3, 0.6), dec: 0.45,
      haut: teinte(HAUTS, 0.75), bas: teinte(BAS, 0.6),
      x: 0, z: 0, y: 0, yAff: 0, cap: 0, v: 0, ch: [], ar: [], s: 0, snap: true,
      etat: 'marche', arret: 0, pb: 0, t: 0, siege: null, kAssis: 0,
      phase: Math.random(), tRepos: rnd(0, 30),
      evite: 0, moust: 0, tMoust: Math.random() * 0.1, doubler: 0, miroir: 0,
      envieArret: rnd(15, 60), envieBanc: rnd(4, 30), suivi: { t: Math.random() * 3, x: 0, z: 0 },
      vu: false, dist: Infinity,
    };
  }

  // ---------------------------------------------------------------- où ils sont
  // Les distances du moment (le préréglage peut changer en jouant) : la bulle de vie, la distance de dessin (celle où
  // les morceaux de décor sont libérés : au-delà, un promeneur marcherait dans un parc vide), et le rayon, autour du
  // joueur, des bancs qu'on va chercher (celui des morceaux construits en détail, bancs compris).
  _distances() {
    const R = (this.reglages && this.reglages()) || DISTANCES_DEFAUT;
    return { vie: R.detail + 25, dessin: R.libere, bancs: R.detail - 10 };
  }

  // Le centre de la bulle : le joueur, sinon la caméra (menu), sinon le plateau.
  _centre(out) {
    const j = this.joueur, c = this.camera;
    if (j && j.pos) { out.x = j.pos.x; out.z = j.pos.z; } else if (c) { out.x = c.position.x; out.z = c.position.z; } else { out.x = -8.7 + this.dx; out.z = 0; }
    return out;
  }

  _visible(x, y, z) {
    if (!this._frustumPret) return false;
    _sph.center.set(x, y + 0.9, z); _sph.radius = 1.2;
    return _frustum.intersectsSphere(_sph);
  }

  // Au démarrage : tout le monde dans la bulle autour du plateau, un sur cinq déjà assis sur un banc — ou, si son banc
  // n'est pas encore construit (l'ordonnanceur finit les morceaux du démarrage dans les premières images), qui a envie
  // de s'asseoir dans les secondes qui viennent.
  _peupler() {
    const C = this._centre(_c0), D = this._distances();
    for (const p of this.list) {
      const assis = Math.random() < 0.2;
      if (assis && this._asseoirDirect(p, C, D.bancs)) continue;
      if (!this._naissance(p, C, true)) this._naissance(p, C, true, Infinity);
      if (assis) p.envieBanc = rnd(1, 5);
    }
  }

  // Pose p au hasard sur les allées (à proportion de leur longueur), dans la bulle autour de C. En jouant, jamais sous les
  // yeux du joueur : ni à moins de 22 m, ni dans le champ à moins de 70 m (au-delà, c'est la brume du parc).
  _naissance(p, C, initial = false, rayon = null) {
    const G = this.G, R = rayon ?? this._distances().vie;
    for (let essai = 0; essai < 60; essai++) {
      const e = G.tirer(Math.random() * G.total), L = G.L[e], s = Math.random() * L, a = G.a[e], b = G.b[e];
      if (G.barree[e] >= 2) continue;
      const x = G.x[a] + ((G.x[b] - G.x[a]) * s) / L, z = G.z[a] + ((G.z[b] - G.z[a]) * s) / L;
      const d = Math.hypot(x - C.x, z - C.z);
      if (d > R || (!initial && d < 22)) continue;
      if (!initial && d < 70 && this._visible(x, Monde.sol(x, z), z)) continue;
      this._liberer(p);
      const sens = Math.random() < 0.5;
      p.ch = sens ? [a, b] : [b, a]; p.ar = [e]; p.s = sens ? s : L - s;
      const ux = (G.x[p.ch[1]] - G.x[p.ch[0]]) / L, uz = (G.z[p.ch[1]] - G.z[p.ch[0]]) / L;
      p.dec = G.t[e] === 1 ? Math.min(p.cote, 0.25) : p.cote;
      // (sa droite tombe au pied d'un mur, sur un gradin, dans la nappe d'à côté : il naît sur l'axe — voir NIVEAU_ALLEE)
      if (!memeNiveau(x, z, x - uz * p.dec, z + ux * p.dec, NIVEAU_ALLEE)) p.dec = 0;
      p.x = x - uz * p.dec; p.z = z + ux * p.dec; p.cap = Math.atan2(ux, uz); p.v = p.vPerso * 0.9;
      p.etat = 'marche'; p.arret = 0; p.pb = 0; p.kAssis = 0; p.doubler = 0; p.evite = 0; p.moust = 0; p.snap = true;
      p.suivi.t = 0; p.suivi.x = p.x; p.suivi.z = p.z;
      this._prolonger(p);
      if (!initial) this.stats.renaissances++;
      return true;
    }
    return false;
  }

  // LE BANC EST-IL LÀ ? Celui d'une zone n'est dessiné que quand les morceaux qui le portent sont construits (état
  // « detail » de js/monde_charge.js) : avant, et une fois libérés derrière le joueur, on s'assiérait dans le vide (ce
  // qu'on a vu : deux promeneurs assis en l'air au bord de la promenade, le morceau Z03c encore en chantier). Sans
  // ordonnanceur, ou pour un banc hors de toute boîte de morceau : à moins de `rayon` du centre de la bulle (les morceaux
  // construits autour du joueur).
  _siegePret(s, C, rayon) {
    if (s.morceaux.length) return s.morceaux.every((m) => m.etat === 'detail');
    return Math.hypot(s.x - C.x, s.z - C.z) < rayon;
  }

  // Assis tout de suite (au démarrage) sur une place libre à moins de `rayon` de C, sur un banc construit.
  _asseoirDirect(p, C, rayon) {
    const libres = this.sieges.filter((s) => !s.occupe && Math.hypot(s.x - C.x, s.z - C.z) < rayon && this._siegePret(s, C, rayon));
    if (!libres.length) return false;
    const s = pick(libres);
    this._liberer(p);
    p.siege = s; s.occupe = p; p.etat = 'banc'; p.pb = 3; p.kAssis = 1; p.t = rnd(8, 60);
    p.x = s.x; p.z = s.z; p.cap = s.cap; p.v = 0; p.snap = true;
    this._raccrocher(p, s.ax, s.az);
    return true;
  }

  _liberer(p) { if (p.siege) { p.siege.occupe = null; p.siege = null; } }

  // Le rattache à l'allée la plus proche de (x, z), dans un sens tiré au sort (en se relevant d'un banc) — jamais à une
  // arête fermée ou barrée, et À SON NIVEAU : l'allée qu'on voit à 3 m mais derrière un mur, 1,9 m plus haut (l'allée
  // du mur, depuis les bancs de l'esplanade), compte pour bien plus loin qu'elle n'est (8 m par mètre de dénivelé au
  // delà de MARCHE_MAX) ; sinon il marchait droit dans le mur, s'y coinçait, et l'allée était barrée pour tous.
  _raccrocher(p, x, z) {
    const G = this.G, y = Monde.sol(x, z);
    let best = 0, bd = Infinity, bs = 0;
    for (let e = 0; e < G.E; e++) {
      if (G.barree[e] >= 2) continue;
      const a = G.a[e], b = G.b[e], L = G.L[e], ux = (G.x[b] - G.x[a]) / L, uz = (G.z[b] - G.z[a]) / L;
      const s = borner((x - G.x[a]) * ux + (z - G.z[a]) * uz, 0, L);
      const px = G.x[a] + ux * s, pz = G.z[a] + uz * s;
      let d = Math.hypot(px - x, pz - z);
      if (d >= bd) continue;
      d += 8 * Math.max(0, Math.abs(Monde.sol(px, pz) - y) - MARCHE_MAX);
      if (d < bd) { bd = d; best = e; bs = s; }
    }
    const sens = Math.random() < 0.5, L = G.L[best];
    p.ch = sens ? [G.a[best], G.b[best]] : [G.b[best], G.a[best]]; p.ar = [best]; p.s = sens ? bs : L - bs;
    this._prolonger(p);
  }

  // La bulle, deux fois par seconde : qui en est sorti sans qu'on le voie renaît dedans. Et le banc qui disparaît (son
  // morceau libéré, le joueur parti loin) : celui qui y allait renonce ; celui qui y est assis renaît ailleurs si on ne le
  // voit pas, se relève sinon.
  _bulle(C, D) {
    let assis = 0;
    for (const p of this.list) {
      if (p.etat === 'banc' && p.siege && !this._siegePret(p.siege, C, D.bancs)) {
        if (p.pb === 0) { this._liberer(p); p.etat = 'marche'; p.envieBanc = rnd(30, 90); }
        else if ((p.vu || !this._naissance(p, C)) && p.pb < 4) p.pb = 4;
      }
      if (p.etat === 'banc' && p.pb >= 2) assis++;
      if (Math.hypot(p.x - C.x, p.z - C.z) > D.vie + 12 && !p.vu) this._naissance(p, C);
    }
    this.stats.assis = assis;
  }

  // ---------------------------------------------------------------- le chemin
  // Le chemin devant lui : `ch` = les nœuds (le premier est derrière lui, le deuxième devant), `ar` = les arêtes entre eux.
  // On le prolonge de quatre arêtes, en choisissant à chaque carrefour ; un demi-tour prévu (cul-de-sac) arrête le tracé.
  _prolonger(p) {
    const G = this.G;
    while (p.ch.length < 5) {
      const m = p.ch.length;
      if (m >= 3 && p.ch[m - 1] === p.ch[m - 3]) return;
      const a = p.ch[m - 2], b = p.ch[m - 1], e = this._suivant(a, b);
      p.ch.push(G.a[e] === b ? G.b[e] : G.a[e]); p.ar.push(e);
    }
  }

  // Au nœud b, en venant de a : plutôt tout droit (poids (1 + cos)²), jamais en arrière sauf au bout d'un cul-de-sac, et,
  // au bord de la bulle, plutôt vers le joueur.
  _suivant(a, b) {
    const G = this.G, adj = G.adj[b];
    if (adj.length === 1) return adj[0];
    const C = this._c, lab = Math.hypot(G.x[b] - G.x[a], G.z[b] - G.z[a]) || 1;
    const ux = (G.x[b] - G.x[a]) / lab, uz = (G.z[b] - G.z[a]) / lab, dB = Math.hypot(G.x[b] - C.x, G.z[b] - C.z);
    let tot = 0, dernier = -1, retour = adj[0];
    for (let k = 0; k < adj.length && k < 16; k++) {
      const e = adj[k], c = G.a[e] === b ? G.b[e] : G.a[e];
      if (c === a) { _poids[k] = 0; retour = e; continue; }
      if (G.barree[e] >= 2) { _poids[k] = 0; continue; }       // (une arête barrée : voir _coince)
      const cos = ((G.x[c] - G.x[b]) * ux + (G.z[c] - G.z[b]) * uz) / G.L[e];
      let w = 0.12 + (1 + cos) * (1 + cos);
      const dC = Math.hypot(G.x[c] - C.x, G.z[c] - C.z);
      if (dC > this._vie * 0.8 && dC > dB) w *= 0.3;
      _poids[k] = w; tot += w; dernier = k;
    }
    if (dernier < 0) return retour;
    let r = Math.random() * tot;
    for (let k = 0; k <= dernier; k++) { r -= _poids[k]; if (_poids[k] > 0 && r <= 0) return adj[k]; }
    return adj[dernier];
  }

  // Où il en est sur son chemin : l'abscisse `s` sur la première arête, et le passage à la suivante — quand il arrive au
  // bout, ou quand il a déjà coupé le virage (il est « après » le nœud sur l'arête suivante). Au bout d'un cul-de-sac :
  // demi-tour à 1,3 m du bout, ou, s'il n'est pas sous les yeux du joueur, il sort du parc et renaît ailleurs.
  _progresser(p) {
    const G = this.G;
    for (let n = 0; n < 4; n++) {
      const n0 = p.ch[0], n1 = p.ch[1], e = p.ar[0], L = G.L[e];
      const ux = (G.x[n1] - G.x[n0]) / L, uz = (G.z[n1] - G.z[n0]) / L;
      const s = (p.x - G.x[n0]) * ux + (p.z - G.z[n0]) * uz;
      p.s = borner(s, 0, L);
      if (p.ch.length > 2 && p.ch[2] === n0) {
        if (s < L - 1.3) return;
        if (!p.vu && p.dist > 30 && this._naissance(p, this._c)) return;
        this._demiTour(p);
        if (Math.random() < 0.35) p.arret = rnd(1.5, 4);
        return;
      }
      let passe = s >= L - 0.6;
      if (!passe && p.ch.length > 2) {
        const n2 = p.ch[2], L2 = G.L[p.ar[1]];
        const s2 = ((p.x - G.x[n1]) * (G.x[n2] - G.x[n1]) + (p.z - G.z[n1]) * (G.z[n2] - G.z[n1])) / L2;
        passe = s2 > 0.1 && Math.hypot(p.x - G.x[n1], p.z - G.z[n1]) < 1.6;
      }
      if (!passe) return;
      p.ch.shift(); p.ar.shift(); this._prolonger(p);
    }
  }

  _demiTour(p) {
    const e = p.ar[0];
    p.ch = [p.ch[1], p.ch[0]]; p.ar = [e]; p.s = this.G.L[e] - p.s;
    this._prolonger(p);
  }

  // LA CAROTTE : le point du chemin `avance` m devant lui (au-delà du nœud qui vient s'il le faut, jamais au-delà d'un
  // demi-tour), décalé de `dec` sur sa droite — il tient sa droite, et sa gauche le temps de doubler. Si ce point tombe
  // dans un massif ou dans l'eau (une allée étroite bordée de fleurs), il vise le milieu de l'allée. S'il tombe DANS UN
  // OBSTACLE (un banc, une borne, un lampadaire au bord de l'allée), il vise le point symétrique, de l'autre côté de
  // l'axe, pendant au moins 0,6 s (`miroir` : sans ce délai, la visée sauterait d'un côté à l'autre à chaque image au
  // bord de l'obstacle). Sur une arête qui frôle un obstacle (decal, voir areteFermee : le bout du parapet au haut des
  // volées du château), ni droite ni miroir : on vise dans son couloir libre.
  _carotte(p, avance, out) {
    const G = this.G;
    let i = 0, n0 = p.ch[0], n1 = p.ch[1], L = G.L[p.ar[0]], reste = p.s + avance;
    while (reste > L && i + 2 < p.ch.length && p.ch[i + 2] !== n0) {
      reste -= L; i++; n0 = p.ch[i]; n1 = p.ch[i + 1]; L = G.L[p.ar[i]];
    }
    if (reste > L) reste = L;
    const ux = (G.x[n1] - G.x[n0]) / L, uz = (G.z[n1] - G.z[n0]) / L, e = p.ar[i], dc = G.decal[e];
    // (sur une arête qui frôle un obstacle, son couloir libre — compté dans le sens de la marche — au lieu de sa droite)
    const dec = dc ? (G.a[e] === n0 ? dc : -dc) : p.dec;
    out.x = G.x[n0] + ux * reste - uz * dec; out.z = G.z[n0] + uz * reste + ux * dec;
    out.type = G.t[e];
    const f = Monde.drapeaux(out.x, out.z);
    // (et s'il tombe hors du niveau de l'allée — au pied du mur, sur le flanc d'une volée, sur un gradin : voir
    // NIVEAU_ALLEE —, de même)
    if (!(f & DRAPEAU.MARCHABLE) || (f & DRAPEAU.EAU)
      || (dec && !memeNiveau(out.x + uz * dec, out.z - ux * dec, out.x, out.z, NIVEAU_ALLEE))) { out.x += uz * dec; out.z -= ux * dec; }
    else if (!dc && Math.abs(dec) > 0.05) {
      if (pris(out.x, out.z)) p.miroir = 0.6;
      if (p.miroir > 0) { out.x += 2 * uz * dec; out.z -= 2 * ux * dec; }
    }
    return out;
  }

  // ---------------------------------------------------------------- déplacement
  update(dt) {
    if (this._aFermer < this.G.E) this._fermer();
    const t0 = performance.now();
    this._c = this._centre(_c0);
    const D = this._distances();
    this._vie = D.vie;
    if (dt > 0 && dt < 0.5) {
      this.t += dt;
      if ((this._tBulle -= dt) <= 0) { this._tBulle = 0.5; this._bulle(this._c, D); }
      for (const p of this.list) this._avancer(p, dt);
      this._contacts();
      for (const p of this.list) this._poser(p, dt);
    }
    this._dessiner(D);
    const ms = performance.now() - t0;
    this.stats.ms = this.stats.ms ? this.stats.ms * 0.97 + ms * 0.03 : ms;
    this.stats.msPic = Math.max(this.stats.msPic * 0.995, ms);
  }

  _avancer(p, dt) {
    if (p.etat === 'banc' && p.pb >= 1) { this._surLeBanc(p, dt); return; }
    let tx, tz, vVoulue, type = 0;
    if (p.etat === 'banc') {
      // vers la place libre qu'il a choisie : droit sur le point où l'on se tient avant de s'asseoir, en ralentissant
      const s = p.siege, d = Math.hypot(s.ax - p.x, s.az - p.z);
      if (d < 0.22) { p.pb = 1; return; }
      tx = s.ax; tz = s.az; vVoulue = Math.min(p.vPerso, 0.3 + d * 0.8);
      if ((p.t -= dt) < 0) {                                  // chemin barré : il renonce
        this._liberer(p); p.etat = 'marche'; p.envieBanc = rnd(30, 90);
        p.suivi.t = 0; p.suivi.x = p.x; p.suivi.z = p.z;
      }
    } else {
      this._progresser(p);
      if (p.etat !== 'marche') return;
      const escalier = this.G.t[p.ar[0]] === 1;
      const vise = p.doubler > 0 ? -0.35 : escalier ? Math.min(p.cote, 0.25) : p.cote;
      p.dec += borner(vise - p.dec, -0.35 * dt, 0.35 * dt);
      p.miroir -= dt;
      this._carotte(p, 1.4, _car);
      tx = _car.x; tz = _car.z; type = _car.type;
      vVoulue = p.vPerso * (type === 1 ? 0.72 : 1);        // dans les marches, on ralentit
      // (à l'arrêt, la fenêtre du « coincé » repart à zéro : sinon celui qui repartait d'un arrêt de deux ou trois
      // secondes avait fait moins de 60 cm dans la fenêtre, et passait pour coincé — et son arête pour barrée)
      if (p.arret > 0) { p.arret -= dt; vVoulue = 0; p.suivi.t = 0; p.suivi.x = p.x; p.suivi.z = p.z; } else this._envies(p, dt);
      // COINCÉ (un obstacle que les moustaches ne savent pas contourner, un tracé qui frôle un mur) : moins de 60 cm en
      // trois secondes sans s'être arrêté. Hors de la vue, il renaît ailleurs ; sous les yeux du joueur, il fait demi-tour.
      // Coincé À UN AUTRE NIVEAU que son allée (au pied du mur qui l'en sépare) : ce n'est pas l'allée qui est fermée,
      // c'est lui qui est perdu ; sous les yeux du joueur, il se rattache à une allée de son niveau.
      if ((p.suivi.t += dt) > 3) {
        if (p.arret <= 0 && Math.hypot(p.x - p.suivi.x, p.z - p.suivi.z) < 0.6) {
          const perdu = this._horsNiveau(p);
          if (!perdu) this._coince(p);
          if (p.vu || !this._naissance(p, this._c)) { if (perdu) this._raccrocher(p, p.x, p.z); else this._demiTour(p); }
        }
        p.suivi.t = 0; p.suivi.x = p.x; p.suivi.z = p.z;
      }
    }
    this._piloter(p, dt, tx, tz, vVoulue, type);
  }

  // L'ARÊTE BARRÉE. Coincé sur l'arête qu'il suit sans personne autour (ni promeneur ni joueur à 1,5 m), c'est que le
  // tracé du graphe traverse un obstacle déclaré qu'on ne contourne pas : ainsi l'allée du mur, qui rejoint le palier
  // de l'escalier de 34 marches à travers le garde-corps de la volée de 12 (zone Z02). Au second coincement, plus
  // personne ne la prend (_suivant), ni n'y naît (_naissance) : le graphe apprend ses passages fermés en jouant.
  _coince(p) {
    const j = this.joueur, e = p.ar[0];
    for (const q of this.list) if (q !== p && Math.hypot(q.x - p.x, q.z - p.z) < 1.5) return;
    if (j && j.pos && Math.hypot(j.pos.x - p.x, j.pos.z - p.z) < 1.5) return;
    if (this.G.barree[e] < 255 && ++this.G.barree[e] === 2) this.stats.barrees++;
  }

  // Le sol sous lui est-il à plus d'une marche (MARCHE_MAX) de celui de son allée, au point le plus proche de l'axe ?
  _horsNiveau(p) {
    const ya = this._solAxe(p, p.x, p.z);
    return ya !== null && Math.abs(ya - Monde.sol(p.x, p.z)) > MARCHE_MAX;
  }

  // Les passages fermés d'avance et les couloirs (voir areteFermee), quelques arêtes par image : TRANCHE_FERME ms au plus
  // (une arête de 8 m, c'est 33 disques à 1 à 5 µs, plus les couloirs là où l'axe est pris) ; les 466 arêtes en 5 à 15 ms
  // en tout (PC), soit une seconde ou moins. Le temps passé ici est compté à part (stats.msFermer, en tout), hors du coût
  // par image des promeneurs (stats.ms).
  _fermer() {
    const G = this.G, t0 = performance.now();
    do {
      const e = this._aFermer++;
      if (G.barree[e] < 2 && areteFermee(G, e)) { G.barree[e] = 2; this.stats.fermees++; }
    } while (this._aFermer < G.E && performance.now() - t0 < TRANCHE_FERME);
    // le parcours fini : les moignons et les îlots qu'il laisse (voir elaguer) ; qui y marche sans être vu renaît ailleurs
    if (this._aFermer >= G.E) {
      this.stats.elaguees = elaguer(G);
      for (const p of this.list) if (p.etat === 'marche' && G.barree[p.ar[0]] >= 2 && !p.vu) this._naissance(p, this._c);
    }
    this.stats.msFermer += performance.now() - t0;
  }

  // Les envies de celui qui marche : s'arrêter un moment, ou s'asseoir sur un banc libre tout près.
  _envies(p, dt) {
    if ((p.envieBanc -= dt) <= 0) {
      p.envieBanc = rnd(3, 7);
      if (Math.random() < 0.6 && this._versBanc(p)) return;
    }
    if ((p.envieArret -= dt) <= 0) {
      p.envieArret = rnd(25, 80);
      if (Math.random() < 0.5) p.arret = rnd(2, 6);
    }
  }

  // Une place libre à moins de 9 m, devant lui plutôt que derrière, au même niveau, dans un morceau de décor construit (le
  // banc existe), et qu'on rejoint en ligne droite sans rien traverser (Monde.rayonLibre à hauteur de genou). Le rayon
  // s'arrête à 50 cm du point où l'on se tient : ce point est contre le banc, que les zones déclarent en obstacle (une
  // boîte de 30 à 35 cm de demi-profondeur) ; mené jusqu'au bout, le rayon touchait toujours le banc lui-même et personne
  // ne s'asseyait jamais en marchant (seuls ceux du démarrage, posés d'office, étaient assis).
  _versBanc(p) {
    const C = this._c, R = this._distances().bancs, sc = Math.sin(p.cap), cc = Math.cos(p.cap);
    let best = null, bd = 9;
    for (const s of this.sieges) {
      if (s.occupe) continue;
      const ax = s.ax - p.x, az = s.az - p.z, d = Math.hypot(ax, az);
      if (d >= bd || Math.abs(s.sol - p.y) > 1.2 || ax * sc + az * cc < -1) continue;
      if (Math.hypot(s.x - C.x, s.z - C.z) > R || !this._siegePret(s, C, R)) continue;
      if (d > 0.6) {
        const f = (d - 0.5) / d, fx = p.x + ax * f, fz = p.z + az * f;
        if (Monde.rayonLibre(p.x, p.y + 0.5, p.z, fx, Monde.sol(fx, fz) + 0.5, fz, 0.2) < 1) continue;
      }
      // (et de plain-pied : le rayon voit un mur qui monte, pas le bord d'une terrasse qui descend — voir MARCHE_MAX)
      if (!plainPied(p.x, p.z, s.ax, s.az)) continue;
      best = s; bd = d;
    }
    if (!best) return false;
    p.etat = 'banc'; p.pb = 0; p.siege = best; best.occupe = p; p.t = 12;
    return true;
  }

  // Sur le banc : se retourner dos à l'assise (1), s'asseoir (2), rester assis (3), se relever (4) et repartir vers
  // l'allée la plus proche. Le bassin recule de la place debout à la place assise pendant qu'il descend.
  _surLeBanc(p, dt) {
    const s = p.siege;
    if (p.pb === 1) {
      p.v = Math.max(0, p.v - 2.5 * dt);
      p.x += (s.ax - p.x) * Math.min(1, dt * 4); p.z += (s.az - p.z) * Math.min(1, dt * 4);
      const d = angle(s.cap - p.cap);
      p.cap = angle(p.cap + Math.sign(d) * Math.min(Math.abs(d), 2.2 * dt));
      if (Math.abs(d) < 0.05 && p.v < 0.15) { p.pb = 2; p.v = 0; }
      return;
    }
    if (p.pb === 2) { p.kAssis = Math.min(1, p.kAssis + dt / DUREE_S_ASSEOIR); if (p.kAssis >= 1) { p.pb = 3; p.t = rnd(12, 55); } }
    else if (p.pb === 3) { if ((p.t -= dt) <= 0) p.pb = 4; }
    else if (p.pb === 4) {
      p.kAssis = Math.max(0, p.kAssis - dt / DUREE_SE_LEVER);
      if (p.kAssis <= 0) {
        this._liberer(p);
        p.etat = 'marche'; p.pb = 0; p.envieBanc = rnd(60, 150); p.envieArret = rnd(20, 50);
        p.x = s.ax; p.z = s.az; p.cap = s.cap;
        this._raccrocher(p, s.ax, s.az);
        p.suivi.t = 0; p.suivi.x = p.x; p.suivi.z = p.z;
        return;
      }
    }
    const e = lisser(0, 1, p.kAssis);
    p.x = s.ax + (s.x - s.ax) * e; p.z = s.az + (s.z - s.az) * e; p.cap = s.cap; p.v = 0;
  }

  // LE PILOTAGE, celui de La Cage en plus court : le cap rejoint la visée à vitesse bornée (des arcs, pas des toupies),
  // on se détourne de qui est devant (d'autant plus qu'il est près et dans l'axe), on double les lents par la gauche, on
  // ne freine que derrière quelqu'un qui va dans le même sens ou qui est arrêté ; le joueur est évité de même (de plus
  // loin s'il est à vélo). LES MOUSTACHES : dix fois par seconde, un rayon à hauteur de genou jusqu'à 90 cm devant
  // (Monde.rayonLibre : troncs, bancs, grilles, lampadaires, le sol ; et le disque du promeneur à 45 et 90 cm, vu de
  // dessus) ; bouché, on tourne du côté libre. Et pour finir
  // Monde.resoudre, comme le joueur : on ne traverse aucun obstacle déclaré.
  _piloter(p, dt, tx, tz, vVoulue, type) {
    const sc = Math.sin(p.cap), cc = Math.cos(p.cap);
    let capVise = Math.atan2(tx - p.x, tz - p.z);
    let evite = 0, vGene = Infinity;
    for (const q of this.list) {
      if (q === p) continue;
      const ax = q.x - p.x, az = q.z - p.z;
      if (ax * ax + az * az > 6.25 || Math.abs(q.y - p.y) > 1.5) continue;
      const devant = ax * sc + az * cc, lat = az * sc - ax * cc;           // lat > 0 : il est sur ma droite
      if (devant <= 0 || Math.abs(lat) > 0.75) continue;
      evite += (lat > 0 ? 1 : -1) * (1 - Math.abs(lat) / 0.75) * (1 - devant / 2.5);
      const arrete = q.v < 0.3 || q.etat === 'banc';
      if (!arrete && Math.cos(q.cap - p.cap) < 0.3) continue;              // celui qui vient en face : on ne freine pas
      if (devant < 1.8 && Math.abs(lat) < 0.55 && p.doubler <= 0 && q.v < p.vPerso - 0.08 && !(q.etat === 'banc' && q.pb >= 1)) p.doubler = 2.5;
      if (devant < 0.9 && Math.abs(lat) < 0.4) vGene = Math.min(vGene, Math.max(arrete ? 0 : q.v, 0.35) * 0.95);
    }
    const j = this.joueur;
    if (j && j.pos && Math.abs(j.pos.y - p.y) < 1.5) {
      const ax = j.pos.x - p.x, az = j.pos.z - p.z, R = j.velo ? 5 : 2.5;
      if (ax * ax + az * az < R * R) {
        const devant = ax * sc + az * cc, lat = az * sc - ax * cc, larg = j.velo ? 1.2 : 0.8;
        if (devant > 0 && Math.abs(lat) < larg) evite += (lat > 0 ? 1 : -1) * (1 - Math.abs(lat) / larg) * (1 - devant / R) * 1.4;
      }
    }
    if ((p.tMoust -= dt) <= 0) {
      p.tMoust = 0.1;
      // (et, vu de dessus, ce qui l'arrête vraiment — Monde.resoudre ne regarde pas les hauteurs : le parapet posé plus
      // haut que son genou, au bord d'une volée qui descend, laissait passer le rayon « dessous », et le promeneur s'y
      // collait sans jamais tourner)
      const libre = (a) => {
        const sa = Math.sin(a), ca = Math.cos(a), fx = p.x + sa * 0.9, fz = p.z + ca * 0.9;
        return Monde.rayonLibre(p.x, p.y + 0.5, p.z, fx, Monde.sol(fx, fz) + 0.5, fz, 0.2) >= 1
          && !pris(p.x + sa * 0.45, p.z + ca * 0.45, 0.2) && !pris(fx, fz, 0.2);
      };
      p.moust = 0;
      if (p.v > 0.2 && !libre(p.cap)) {
        let g = libre(p.cap + 0.6), d = libre(p.cap - 0.6);
        // bouché devant ET de part et d'autre (un parapet en travers, la carotte derrière lui) : on regarde de côté, à
        // 50 cm, pour glisser le long du mur jusqu'à son bout ; sans ça, il poussait droit dedans jusqu'à être « coincé »
        if (!g && !d) {
          const cote = (a) => !pris(p.x + Math.sin(a) * 0.5, p.z + Math.cos(a) * 0.5, 0.2);
          g = cote(p.cap + 1.5); d = cote(p.cap - 1.5);
        }
        // les deux côtés libres : vers la visée ; droit devant, vers l'axe de l'allée (à gauche s'il tient sa droite)
        const vise = angle(capVise - p.cap);
        p.moust = g && !d ? 1 : d && !g ? -1 : g ? (Math.abs(vise) > 0.15 ? (vise >= 0 ? 1 : -1) : (p.dec >= 0 ? 1 : -1)) : 0;
      }
    }
    evite += p.moust * 1.1;
    // l'écart est lissé (un dixième de seconde) : sans ça, une moustache qui touche une image sur deux le fait tanguer
    p.evite += (borner(evite, -1.4, 1.4) - p.evite) * Math.min(1, dt * 10);
    capVise += p.evite * 0.7;                                              // à gauche (cap qui augmente) s'il est à droite
    const d = angle(capVise - p.cap);
    p.cap = angle(p.cap + borner(d * Math.min(1, 6 * dt), -2.4 * dt, 2.4 * dt));
    // l'allure : plus lente dans les virages, dans les montées (et un peu dans les descentes raides), derrière un lent
    let vC = vVoulue * (0.45 + 0.55 * Math.max(0, Math.cos(d))) * (p.doubler > 0 ? 1.08 : 1);
    if (type !== 1 && vC > 0) {
      const pe = Monde.pente(p.x, p.z, sc, cc);
      vC *= pe > 0 ? Math.max(0.6, 1 - 1.2 * pe) : 1 - Math.min(0.15, -0.4 * pe);
    }
    vC = Math.min(vC, vGene);
    p.doubler = Math.max(0, p.doubler - dt);
    p.v += borner(vC - p.v, -1.6 * dt, 0.9 * dt);
    const x0 = p.x, z0 = p.z;
    p.x += Math.sin(p.cap) * p.v * dt; p.z += Math.cos(p.cap) * p.v * dt;
    _posR.x = p.x; _posR.z = p.z;
    if (Monde.resoudre(_posR, 0.24, 'pieton')) { p.x = _posR.x; p.z = _posR.z; }
    this._auNiveau(p, x0, z0);
  }

  // LE GARDE-FOU DU NIVEAU (voir MARCHE_MAX) : le pas de (x0, z0) à sa position qui change trop le sol est refusé ; il
  // glisse le long du mur (on garde le seul déplacement en x, ou en z, qui reste au niveau), sinon il reste où il était.
  _auNiveau(p, x0, z0) {
    const y0 = Monde.sol(x0, z0);
    if (Math.abs(Monde.sol(p.x, p.z) - y0) <= MARCHE_MAX) return;
    this.stats.refuses++;
    if (Math.abs(Monde.sol(p.x, z0) - y0) <= MARCHE_MAX) p.z = z0;
    else if (Math.abs(Monde.sol(x0, p.z) - y0) <= MARCHE_MAX) p.x = x0;
    else { p.x = x0; p.z = z0; }
  }

  // La hauteur de l'axe de l'allée qu'il suit, au point le plus proche de (x, z) ; null s'il ne suit pas d'allée (il
  // va vers un banc, ou s'y assoit).
  _solAxe(p, x, z) {
    if (p.etat !== 'marche' || p.ch.length < 2) return null;
    const G = this.G, n0 = p.ch[0], n1 = p.ch[1], L = G.L[p.ar[0]];
    const ux = (G.x[n1] - G.x[n0]) / L, uz = (G.z[n1] - G.z[n0]) / L;
    const s = borner((x - G.x[n0]) * ux + (z - G.z[n0]) * uz, 0, L);
    return Monde.sol(G.x[n0] + ux * s, G.z[n0] + uz * s);
  }

  // CONTACT : deux corps à moins de 50 cm s'écartent l'un de l'autre, surtout celui qui marche (celui qui est assis ou
  // en train de s'asseoir ne se fait pas bousculer). Le joueur, lui, ne se fait pas pousser : c'est le promeneur qui
  // s'écarte (de 55 cm, 85 à vélo). Une poussée ne dépasse pas POUSSEE m par image (le reste à l'image suivante) et ne
  // change pas de niveau (_pousser) : d'un seul coup de 45 cm, un promeneur collé à une grille passait au travers
  // (Monde.resoudre le ressortait alors du mauvais côté), et d'un pas de côté il tombait du haut du mur.
  _contacts() {
    const L = this.list;
    for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) {
      const p = L[a], q = L[b], dx = q.x - p.x, dz = q.z - p.z, d2 = dx * dx + dz * dz;
      if (d2 >= 0.25 || Math.abs(p.y - q.y) > 1.2) continue;
      const fp = p.etat === 'banc' && p.pb >= 1, fq = q.etat === 'banc' && q.pb >= 1;
      if (fp && fq) continue;
      const d = Math.sqrt(d2), trop = 0.5 - d;
      const ux = d > 1e-4 ? dx / d : Math.cos(p.cap), uz = d > 1e-4 ? dz / d : -Math.sin(p.cap);
      let wp = (p.v + 0.05) / (p.v + q.v + 0.1), wq = 1 - wp;
      if (fp) { wp = 0; wq = 1; } else if (fq) { wp = 1; wq = 0; }
      if (wp) this._pousser(p, -ux, -uz, trop * wp, POUSSEE);
      if (wq) this._pousser(q, ux, uz, trop * wq, POUSSEE);
    }
    const j = this.joueur;
    if (!j || !j.pos) return;
    const r = j.velo ? 0.85 : 0.55;
    for (const p of L) {
      if (p.etat === 'banc' && p.pb >= 1) continue;
      const dx = p.x - j.pos.x, dz = p.z - j.pos.z, d2 = dx * dx + dz * dz;
      if (d2 >= r * r || Math.abs(p.y - j.pos.y) > 1.2) continue;
      const d = Math.sqrt(d2);
      if (d < 1e-4) { this._pousser(p, 1, 0, r, POUSSEE_JOUEUR); continue; }
      this._pousser(p, dx / d, dz / d, r - d, POUSSEE_JOUEUR);
    }
  }

  // Pousse p de `l` m (`max` au plus) selon (ux, uz), si ce pas reste à son niveau.
  _pousser(p, ux, uz, l, max) {
    const k = Math.min(l, max), x = p.x + ux * k, z = p.z + uz * k;
    if (!memeNiveau(p.x, p.z, x, z)) { this.stats.refuses++; return; }
    p.x = x; p.z = z;
  }

  // LA HAUTEUR ET LA PHASE. Debout : le sol du monde sous ses pieds, Monde.sol, lu comme pour le joueur — il ne change
  // jamais de nappe d'un coup, puisque le garde-fou du niveau (_auNiveau, _pousser) l'en empêche. (Lu dans la nappe du
  // milieu de l'allée, comme avant, le sol sautait d'un mètre à chaque image chez celui qui montait la volée de 12
  // marches en suivant déjà l'allée du mur : un coin de sa cellule de grille tombait tantôt dans l'une, tantôt dans
  // l'autre.) Assis : le bassin à 10 cm au-dessus de l'assise, avec le petit creux du poids du corps qui tombe (comme
  // le joueur). La phase de la marche avance de la distance parcourue divisée par la foulée : les pieds ne glissent pas.
  _poser(p, dt) {
    p.tRepos += dt;
    p.phase = (p.phase + (p.v * dt) / p.foulee) % 1;
    if (p.etat === 'banc' && p.pb >= 2) {
      const s = p.siege, C = this.types[p.type].cuit, e = lisser(0, 1, p.kAssis);
      p.y = s.sol + (s.y + 0.1 - (C ? C.hanches : 0.95) * p.k) * e - 0.05 * Math.sin(Math.PI * p.kAssis);
      p.yAff = p.y; p.snap = false;
      return;
    }
    p.y = Monde.sol(p.x, p.z);
    if (p.snap || Math.abs(p.y - p.yAff) > 1.2) { p.yAff = p.y; p.snap = false; } else p.yAff += (p.y - p.yAff) * Math.min(1, dt * 14);
  }

  // ---------------------------------------------------------------- dessin
  // Chaque image : qui est dans le champ (à la distance de dessin), ou assez près pour que son ombre y entre ; ceux-là,
  // et eux seuls, sont écrits dans les instances de leur avatar (position, cap, taille, teintes, images de l'animation).
  // Un avatar sans promeneur à dessiner n'est pas dessiné du tout (aucun appel).
  _dessiner(D) {
    const cam = this.camera, ombre = this._ombres();
    for (const T of this.types) T.n = 0;
    if (cam) {
      _proj.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      _frustum.setFromProjectionMatrix(_proj); this._frustumPret = true;
      _camP.setFromMatrixPosition(cam.matrixWorld);
      for (const p of this.list) {
        p.dist = Math.hypot(p.x - _camP.x, p.yAff + 0.9 - _camP.y, p.z - _camP.z);
        _sph.center.set(p.x, p.yAff + 0.9, p.z); _sph.radius = 1.1;
        p.vu = p.dist < D.dessin && _frustum.intersectsSphere(_sph);
        const T = this.types[p.type];
        if (!T.im || !(p.vu || (ombre && p.dist < OMBRE_PARC))) continue;
        this._ecrire(T, T.n++, p);
      }
    }
    let appels = 0, dessines = 0;
    for (const T of this.types) {
      const im = T.im;
      if (!im) continue;
      im.count = T.n; im.visible = T.n > 0;
      if (T.n) {
        appels++; dessines += T.n;
        im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
        for (const a of T.attrs) a.needsUpdate = true;
      }
      if (im.castShadow !== ombre) im.castShadow = ombre;
    }
    this.stats.appels = appels; this.stats.dessines = dessines;
  }

  _ecrire(T, n, p) {
    const im = T.im, C = T.cuit;
    _pos3.set(p.x, p.yAff, p.z); _quat.setFromAxisAngle(_Y, p.cap); _scl.setScalar(p.k);
    _m4.compose(_pos3, _quat, _scl).toArray(im.instanceMatrix.array, n * 16);
    const col = im.instanceColor.array;
    col[n * 3] = p.haut.r; col[n * 3 + 1] = p.haut.g; col[n * 3 + 2] = p.haut.b;
    // le repos : le clip joué en boucle, à son rythme
    const fr = ((p.tRepos / C.dureeRepos) % 1) * IM_REPOS, ir = Math.floor(fr) % IM_REPOS;
    const r0 = IM_MARCHE + ir, r1 = IM_MARCHE + ((ir + 1) % IM_REPOS), tr = fr - Math.floor(fr);
    let a0, a1, ta, b0, b1, tb, w;
    if (p.kAssis > 0) {
      // A : le repos ; B : le geste de s'asseoir, qui part de la pose debout (la première image du repos)
      a0 = r0; a1 = r1; ta = tr;
      const fs = p.kAssis * (IM_ASSIS - 1), is = Math.min(IM_ASSIS - 2, Math.floor(fs));
      b0 = IM_MARCHE + IM_REPOS + is; b1 = b0 + 1; tb = fs - is; w = Math.min(1, p.kAssis * 5);
    } else {
      // A : la marche, à la phase de la foulée ; B : le repos, qui prend le dessus quand il ralentit
      const fm = p.phase * IM_MARCHE, im0 = Math.floor(fm) % IM_MARCHE;
      a0 = im0; a1 = (im0 + 1) % IM_MARCHE; ta = fm - Math.floor(fm);
      b0 = r0; b1 = r1; tb = tr; w = 1 - lisser(0.06, 0.55, p.v);
    }
    const A = T.aA.array, B = T.aB.array, S = T.aBas.array, o = n * 4;
    A[o] = a0; A[o + 1] = a1; A[o + 2] = ta; A[o + 3] = w;
    B[o] = b0; B[o + 1] = b1; B[o + 2] = tb; B[o + 3] = p.haut.f;
    S[o] = p.bas.r; S[o + 1] = p.bas.g; S[o + 2] = p.bas.b; S[o + 3] = p.bas.f;
  }

  // Ombre portée : qualité haute et au-dessus, comme à La Cage (scene.userData.meteoQualite, publié par js/fx.js).
  _ombres() {
    const q = this.scene.userData.meteoQualite;
    return q === undefined ? !MOBILE : q >= 1;
  }

  // ---------------------------------------------------------------- chargement
  // Un avatar après l'autre, comme à La Cage (mêmes fichiers, mêmes clips, même foulée mesurée) ; chacun est dessiné dès
  // qu'il est prêt.
  async _charger() {
    const man = await loadManifest(MANIFESTE);
    const dMarche = man && man.clips && man.clips.walk, dRepos = man && man.clips && man.clips.idle;
    if (!dMarche) throw new Error('clip de marche absent du manifeste');
    const base = MANIFESTE.slice(0, MANIFESTE.lastIndexOf('/') + 1);
    const url = (d) => base + d.file.split('/').map(encodeURIComponent).join('/');
    const chargeur = new GLTFLoader(), texLoader = new THREE.TextureLoader();
    const tex = (f, srgb) => texLoader.loadAsync(f).then((t) => {
      t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4;
      return t;
    });
    const suf = MOBILE ? '_512' : '';
    for (let j = 0; j < this.types.length; j++) {
      const T = this.types[j], nom = T.nom;
      try {
        const [gltf, couleur, masque, relief] = await Promise.all([
          chargeur.loadAsync(DOSSIER + nom + '.glb'),
          tex(DOSSIER + nom + '_couleur' + suf + '.webp', true),
          tex(DOSSIER + nom + '_masque' + suf + '.jpg', false),
          MOBILE ? Promise.resolve(null) : tex(DOSSIER + nom + '_relief.jpg', false),
        ]);
        await this._preparer(j, gltf, couleur, masque, relief, dMarche, dRepos, url);
      } catch (e) {
        console.warn('[passants du parc] avatar', nom, 'non chargé :', e);
      }
      await new Promise((ok) => setTimeout(ok, 30));
    }
  }

  async _preparer(j, gltf, couleur, masque, relief, dMarche, dRepos, url) {
    const T = this.types[j], modele = gltf.scene;
    let loin = null, pres = null;
    modele.traverse((o) => { if (o.isSkinnedMesh) { if (/loin/.test(o.name)) loin = o; else pres = o; } });
    const peau = loin || pres;
    if (!peau) throw new Error('pas de maillage skinné');
    const ex = modele.userData || {};
    const rig = new AvatarRig(modele);
    if (!rig.ok) throw new Error('squelette non Mixamo');
    const hips = rig.bone('Hips'), leg = rig.bone('LeftLeg'), foot = rig.bone('LeftFoot');
    const ref = { hipsY: hips.position.y, legLen: leg.position.length() + foot.position.length() };
    const marche = await loadMixamoClip(url(dMarche), 'passant_marche', dMarche, ref, rig);
    if (!marche) throw new Error('marche non retargetée');
    const repos = dRepos ? await loadMixamoClip(url(dRepos), 'passant_repos', dRepos, ref, rig) : null;
    // (la mesure de la foulée, d'un bloc, puis la cuisson, en tranches : leurs durées sont notées pour la vérification,
    // bilan() — la foulée entière, la plus longue tranche de la cuisson)
    const t0 = performance.now();
    const foulee = mesurerFoulee(modele, marche.clip) || marche.def.foulee || 1.25;
    this.stats.msFoulee = Math.max(this.stats.msFoulee, performance.now() - t0);
    await new Promise((ok) => setTimeout(ok, 0));
    for (const c of ['Left', 'Right']) rig.plierDoigts(c, [0.5, 0.62, 0.45], 1);     // mains détendues (voir La Cage)
    const cuit = await cuireSquelette(modele, peau, rig, marche, repos, marche.def.phase0 || 0);
    this.stats.msCuisson = Math.max(this.stats.msCuisson, cuit.tranche);
    const { mat, ombre } = materiauxPromeneur(T.nom, couleur, masque, relief, { value: cuit.tex },
      { haut: ex.lumHaut ?? 0.2, bas: ex.lumBas ?? 0.2 });
    // les instances : autant que de promeneurs de cet avatar ; position, cap et taille dans instanceMatrix, haut dans
    // instanceColor, animation et bas dans trois attributs d'instance (réécrits à chaque image : DynamicDrawUsage)
    const geo = peau.geometry, cap = Math.max(1, this.list.filter((p) => p.type === j).length);
    const dyn = (a) => { a.setUsage(THREE.DynamicDrawUsage); return a; };
    const im = new THREE.InstancedMesh(geo, mat, cap);
    im.name = 'promeneurs ' + T.nom;
    dyn(im.instanceMatrix);
    im.instanceColor = dyn(new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3));
    const attr = (n) => { const a = dyn(new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4)); geo.setAttribute(n, a); return a; };
    T.aA = attr('aAnimA'); T.aB = attr('aAnimB'); T.aBas = attr('aBas'); T.attrs = [T.aA, T.aB, T.aBas];
    im.customDepthMaterial = ombre;
    im.frustumCulled = false;                    // (le tri se fait promeneur par promeneur, dans _dessiner)
    im.count = 0; im.visible = false;
    im.castShadow = this._ombres(); im.receiveShadow = true;
    Object.assign(im.userData, { dynamique: true, nofuse: true });
    // LES PASSES À MATÉRIAU IMPOSÉ (scene.overrideMaterial : normales de l'occlusion ambiante de js/fx.js, ombres de
    // contact de js/ombres_contact.js) dessineraient la pose de liaison — bras en croix — faute de notre skinning : on
    // n'y dessine aucun promeneur. (La passe d'ombre du soleil, elle, prend customDepthMaterial : ils y sont.)
    im.onBeforeRender = function (r, s, c, g, m) { if (m !== mat) { this._compte = this.count; this.count = 0; } };
    im.onAfterRender = function () { if (this._compte !== undefined) { this.count = this._compte; this._compte = undefined; } };
    this.group.add(im);
    if (pres && pres !== peau) pres.geometry.dispose();       // (la version de près ne sert pas ici)
    Object.assign(T, { im, cuit, hauteur: ex.hauteur || 1.85, foulee });
    for (const p of this.list) if (p.type === j) { p.k = p.h / T.hauteur; p.foulee = foulee * p.k; }
    console.info('[passants du parc] %s prêt · foulée %s m · %d promeneurs · %d os', T.nom, foulee.toFixed(2), cap, peau.skeleton.bones.length);
  }

  // ---------------------------------------------------------------- vérification
  // Pour la console (?debug=1) : __game.scene.userData.pedestrians.bilan() ; placer(i, x, z, versX, versZ) pose le
  // promeneur i sur l'allée la plus proche de (x, z) du repère du terrain 1, tourné vers (versX, versZ).
  bilan() {
    const n = { marche: 0, arret: 0, versBanc: 0, assis: 0 };
    for (const p of this.list) {
      if (p.etat === 'banc') n[p.pb >= 2 ? 'assis' : 'versBanc']++; else n[p.arret > 0 ? 'arret' : 'marche']++;
    }
    return { promeneurs: this.list.length, avatarsPrets: this.types.filter((T) => T.im).length, ...n, ...this.stats,
      ms: +this.stats.ms.toFixed(3), msPic: +this.stats.msPic.toFixed(3),
      msCuisson: +this.stats.msCuisson.toFixed(1), msFoulee: +this.stats.msFoulee.toFixed(1), msGraphe: +this.stats.msGraphe.toFixed(1),
      msFermer: +this.stats.msFermer.toFixed(1), parcourues: `${this._aFermer} / ${this.G.E}`,
      places: this.sieges.length, vie: this._vie };
  }

  placer(i, x, z, versX, versZ) {
    const p = this.list[i], G = this.G;
    if (!p) return null;
    this._liberer(p);
    x += this.dx; versX += this.dx;
    this._raccrocher(p, x, z);
    const n0 = p.ch[0], n1 = p.ch[1];
    if (Math.hypot(G.x[n1] - versX, G.z[n1] - versZ) > Math.hypot(G.x[n0] - versX, G.z[n0] - versZ)) this._demiTour(p);
    const a = p.ch[0], b = p.ch[1], L = G.L[p.ar[0]], ux = (G.x[b] - G.x[a]) / L, uz = (G.z[b] - G.z[a]) / L;
    const ax = G.x[a] + ux * p.s, az = G.z[a] + uz * p.s;
    if (!memeNiveau(ax, az, ax - uz * p.dec, az + ux * p.dec, NIVEAU_ALLEE)) p.dec = 0;       // (comme _naissance)
    p.x = ax - uz * p.dec; p.z = az + ux * p.dec; p.cap = Math.atan2(ux, uz);
    p.etat = 'marche'; p.arret = 0; p.pb = 0; p.kAssis = 0; p.snap = true; p.v = p.vPerso;
    p.suivi.t = 0; p.suivi.x = p.x; p.suivi.z = p.z;
    return { x: +(p.x - this.dx).toFixed(2), z: +p.z.toFixed(2), vers: [+(G.x[b] - this.dx).toFixed(1), +G.z[b].toFixed(1)] };
  }
}
