import * as THREE from 'three';
import { TELEPHONE } from './appareil.js';

// =====================================================================
//  LES SURFACES DU PARC DE BÉCON : le détail photographique des sols et des murs
// =====================================================================
// Les textures dessinées de js/court_parc.js ont été réglées sur les photos du plateau : leurs COULEURS ne bougent
// pas. Par-dessus, chaque surface reçoit ce qu'un dessin ne sait pas faire, tiré d'une vraie photo (textures CC0 de
// assets/parc/tex, voir assets/parc/manifeste.json) : le relief (carte de normales), la rugosité qui varie d'un
// grain à l'autre, et le grain de la couleur. Ce grain est un MULTIPLICATEUR centré sur 1 : l'enrobé reste du gris
// de la photo 43, la pelouse du vert réglé, seul le détail s'ajoute.
//
// SEULEMENT LE DÉTAIL FIN. Une photo de matériau a aussi ses taches, ses nuages plus clairs ou plus sombres de 30 cm
// à 1 m : posées telles quelles, elles marbraient l'enrobé (le vrai, sur le panorama du 26/09, est uniforme et
// finement grenu) et revenaient à chaque tuile, un damier de taches tous les 4 m. On les retire au chargement, sur le
// GPU, en une passe : chaque texel de la photo est divisé par la photo floutée autour de lui (sur `flou` mètres) — il
// ne reste que les granulats, les brins, les pores. Les taches, c'est la texture dessinée qui les porte, à sa propre
// échelle. La même passe range la rugosité de la photo (divisée par sa moyenne locale) dans le canal alpha : deux
// textures par surface (détail + normales), deux lectures par pixel, et les photos d'origine sont libérées aussitôt.
//
// PROJECTION DANS LE MONDE, pas dans les UV. Les maillages du parc ont des UV de toutes sortes (une tuile pour
// 300 m de pelouse, des nappes en mètres, des murs en ruban) et l'optimiseur du décor (optimiserDecor, js/court.js)
// en coud plusieurs en un seul bloc : le détail se lit donc à la position MONDE du fragment — vue de dessus pour
// les sols et les pentes, de face pour les murs —, si bien qu'une tuile fait partout sa taille réelle, celle de la
// surface photographiée (dimensions Poly Haven ; mesurées sur l'image pour les deux textures ambientCG). De loin, les
// mipmaps fondent le détail dans sa moyenne, 1 : il ne reste que la couleur dessinée, exactement comme avant.
//
// COÛT (mesuré le 27/09). Aucun maillage, aucun appel de dessin en plus : le détail arrive dans le shader des
// matériaux existants, APRÈS la fusion du décor (optimiserDecor ne voit que des matériaux ordinaires). Deux lectures
// de texture par pixel, trois pour les surfaces à `antiRepet` : + 0,7 ms sur une image où le sol remplit l'écran
// (1959 x 905, Radeon intégrée). Mémoire vidéo : 1024 px pour l'enrobé et la meulière (on les voit à un mètre), 512
// pour le reste (au-delà des grillages) — 39 Mo, 2,3 Mo à télécharger. Téléphone : tout en 512, et pas les surfaces
// du jardin (qu'on ne voit que de loin, derrière le talus) — 14 Mo, 1 Mo à télécharger. Si les fichiers ne chargent
// pas, rien ne change : le décor garde son relief dessiné.
//
// Les matériaux concernés portent `userData.surfaceParc` (le nom d'une entrée ci-dessous), posé par js/court_parc.js.

const MOBILE = TELEPHONE;   // js/appareil.js : la même détection pour tout le jeu (et `?tel=1`)

const DOSSIER = 'assets/parc/tex/';

// tex : préfixe des fichiers ; tuile : côté réel de la photo (m) ; pc : résolution chargée sur PC ; flou : au-delà
// de cette taille (m), les variations de la photo sont retirées (0 : on garde tout, la photo est seulement divisée par
// sa moyenne) ; relief : force des normales ; grain : force du multiplicateur de couleur (0 = couleur dessinée
// intacte) ; chroma : 0 = le grain ne module que la luminance, 1 = il garde les nuances de la photo ; rugo : force de
// la variation de rugosité ; nBiais : moyenne des normales en x, y (certaines cartes penchent : on la retire) ;
// jardin : surface lointaine, absente sur téléphone ; sansBump : le relief dessiné (un bruit) cède la place au vrai —
// ailleurs il reste, sous la photo (les joints dessinés de la meulière) ; antiRepet : la texture DESSINÉE est une tuile
// répétée (4 m pour l'enrobé, 5 m pour le stabilisé, 2 m pour la terre du talus) dont les taches revenaient en damier
// vu d'en haut : elle est lue une seconde fois, tournée de 37° et décalée, et un bruit lent (une cellule d'une tuile)
// passe de l'une à l'autre — mêmes couleurs, plus de quadrillage. nuances : de lentes variations de clarté, lues dans
// le repère du monde (voir SP_FRAGMENT) ; 0 ou absent : aucune.
export const SURFACES_PARC = {
  // Poly Haven asphalt_04, 4,04 m. Enrobé fin et propre (photos 39 et 43, panorama du 26/09) : du grain, pas de taches.
  // Au ras du sol (photos 1000051600 à 602, 27/09), les gravillons blancs se détachent nettement sur le liant : grain
  // porté de 0,8 à 1,2, et flou ramené de 12 à 6 cm pour ne garder que le grain, pas les nuages de la photo.
  // NUANCES (30/09, lot L4) : vu debout (photos 340, 341, 343 et 601), l'enrobé n'est pas un aplat parfait : l'usure
  // l'éclaircit par endroits, des reprises l'assombrissent, sur un à trois mètres. Pas de taches de la photo (elles
  // revenaient en damier, voir plus haut) : un bruit lent tiré de la position, ±4 % au plus.
  // Et le grain de la photo porté à 1,15 : les gravillons blancs dessinés (bitumeParc, js/court_parc.js), qui faisaient
  // le granito, ont presque disparu ; c'est ce grain-ci qui fait maintenant l'enrobé — à 1,0, l'écart-type à
  // mi-distance tombait à 6,0 en extrême, pour 6,8 sur la photo 601.
  // RASANT (30/09, lot L7) : la brillance du lointain, voir SP_RASANT.
  // (07/10) LE PLATEAU N'EST PLUS ICI : trop fin, asphalt_04 y faisait un béton lisse (« pas ouf », Haythem). Son enrobé a
  // son matériau à lui, js/parc/sol_plateau.js (photo à gravillons de La Cage, usure, gomme, taches). Cette entrée
  // sert encore aux allées d'enrobé rouge du parc (asphalteRougeTex, la rampe du coteau).
  asphalte: { tex: 'asphalte', tuile: 4.04, pc: 1024, flou: 0.06, relief: 1.0, grain: 1.15, chroma: 0.0, rugo: 0.5,
    nBiais: [0.0, 0.0], sansBump: true, antiRepet: true, nuances: 1, rasant: 0.1 },
  // ambientCG Grass004 : brins de 3-4 mm sur 4 px à 1024, soit une tuile d'environ 1,2 m.
  herbe: { tex: 'herbe', tuile: 1.2, pc: 512, flou: 0.15, relief: 1.0, grain: 0.7, chroma: 0.5, rugo: 0.4,
    nBiais: [-0.007, 0.003] },
  // ambientCG Gravel037 : cailloux de 10-15 mm sur 15-20 px à 1024, une tuile d'environ 0,7 m. Le stabilisé des
  // platanes est un sable compacté : relief doux.
  gravier: { tex: 'gravier', tuile: 0.7, pc: 512, flou: 0.1, relief: 0.8, grain: 0.6, chroma: 0.3, rugo: 0.4,
    nBiais: [0.005, 0.003], antiRepet: true },
  // Poly Haven forrest_ground_03, 2 m : la terre nue du talus du pin, la bande de terre du quai.
  solForet: { tex: 'sol_foret', tuile: 2.0, pc: 512, flou: 0.25, relief: 1.0, grain: 0.6, chroma: 0.3, rugo: 0.3,
    nBiais: [0.094, 0.101], antiRepet: true },
  // Poly Haven yellow_stone_wall, 2 m : sur le mur de moellons, le GRAIN de la pierre et la rugosité — sa couleur et
  // ses joints sont dessinés (meuliereTexture). Relief retenu : ses propres assises de 18 cm ne tombent pas sur les
  // moellons dessinés, à 0,55 on voyait deux appareils superposés.
  meuliere: { tex: 'mur_pierre_jaune', tuile: 2.0, pc: 1024, flou: 0.08, relief: 0.28, grain: 0.15, chroma: 0.0, rugo: 0.4,
    nBiais: [0.001, 0.007] },
  // Poly Haven terrain_red_01, 2 m : les allées rouges du jardin. Photo très contrastée (des graviers) : grain retenu.
  terreRouge: { tex: 'terre_rouge', tuile: 2.0, pc: 512, flou: 0.15, relief: 0.5, grain: 0.3, chroma: 0.2, rugo: 0.3, jardin: true,
    nBiais: [-0.171, -0.165] },
  // Poly Haven concrete_pavement_02, 1,8 m (dalles de 30 cm) : les dalles grises du jardin, chacune sa teinte.
  dalles: { tex: 'dalles_beton', tuile: 1.8, pc: 512, flou: 0, relief: 0.9, grain: 0.8, chroma: 0.0, rugo: 0.3, jardin: true,
    nBiais: [-0.001, 0.0] },
  // Poly Haven sandstone_blocks_04, 3 m : le mur de la grande terrasse.
  gres: { tex: 'blocs_gres', tuile: 3.0, pc: 512, flou: 0.5, relief: 0.8, grain: 0.7, chroma: 0.0, rugo: 0.3, jardin: true,
    nBiais: [0.149, 0.149] },
};

// ---------- LA PASSE DE PRÉPARATION (une fois par surface, au chargement) ----------
// rgb : la photo divisée par sa version floutée (moyenne locale sur `flou` m ; `flou` = 0 : moyenne de toute l'image,
// lue au dernier niveau de mipmap), a : la rugosité divisée de même. Rangés à 0,5 x (le multiplicateur va de 0 à 2).
const PREP_VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }';
const PREP_FS = `
uniform sampler2D tC;
uniform sampler2D tR;
uniform float uLod;
uniform vec2 uPas;
varying vec2 vUv;
vec4 flou( sampler2D t ) {
  vec4 s = vec4( 0.0 ); float n = 0.0;
  for ( int j = - 2; j <= 2; j ++ ) for ( int i = - 2; i <= 2; i ++ ) {
    float w = exp( - 0.35 * float( i * i + j * j ) );
    s += textureLod( t, vUv + vec2( float( i ), float( j ) ) * uPas, uLod ) * w; n += w;
  }
  return s / n;
}
void main() {
  vec3 c = textureLod( tC, vUv, 0.0 ).rgb, cf = flou( tC ).rgb;
  float r = textureLod( tR, vUv, 0.0 ).r, rf = flou( tR ).r;
  gl_FragColor = vec4( clamp( c / max( cf, vec3( 0.002 ) ), 0.0, 2.0 ) * 0.5, clamp( r / max( rf, 0.02 ), 0.0, 2.0 ) * 0.5 );
}`;

function preparer(renderer, coul, rugo, D, aniso) {
  const w = coul.image.width, h = coul.image.height;
  const rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, generateMipmaps: true, anisotropy: aniso,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  // pas des prises du flou (en texels) : cinq prises couvrent `flou`, lues au niveau de mipmap de leur écart
  const pas = D.flou > 0 ? D.flou / D.tuile * w / 4 : 0;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tC: { value: coul }, tR: { value: rugo }, uLod: { value: pas > 0 ? Math.max(0, Math.log2(pas)) : 20 },
                uPas: { value: new THREE.Vector2(pas / w, pas / h) } },
    vertexShader: PREP_VS, fragmentShader: PREP_FS, depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat), sc = new THREE.Scene();
  quad.frustumCulled = false; sc.add(quad);
  const avant = renderer.getRenderTarget();
  renderer.setRenderTarget(rt); renderer.render(sc, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)); renderer.setRenderTarget(avant);
  mat.dispose(); quad.geometry.dispose(); coul.dispose(); rugo.dispose();
  return rt;
}

// ---------- LE SHADER DES SURFACES ----------
// Le même source pour toutes (tout passe par les uniformes) : la clé des programmes est constante.
const SP_ENTETE = `
varying vec3 vPosSurf;
uniform sampler2D uSpDet;     // rgb : grain de la couleur, a : rugosité (x 0,5)
uniform sampler2D uSpNorm;
uniform vec4 uSpA;            // 1 / tuile, relief, grain, chroma
uniform vec4 uSpB;            // rugosité, biais des normales en x et y, anti-répétition de la texture dessinée (0 ou 1)
uniform float uSpLF;          // nuances lentes de la clarté (0 : aucune ; 1 : l'enrobé, ±4 %)
uniform float uSpRas;         // brillance rasante (0 : aucune ; voir SP_RASANT)
uniform float uSpRasK;        // ... et sa part laissée par la météo (1 au sec, 0 sous la pluie : RASANT)
float spHash( vec2 p ) { p = fract( p * vec2( 0.1031, 0.1030 ) ); p += dot( p, p.yx + 33.33 ); return fract( ( p.x + p.y ) * p.x ); }
float spBruit( vec2 p ) {
  vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( spHash( i ), spHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( spHash( i + vec2( 0.0, 1.0 ) ), spHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}
`;

// la texture dessinée, lue deux fois quand sa tuile se voyait (voir `antiRepet`)
const SP_MAP = `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  if ( uSpB.w > 0.0 ) {
    vec2 spUv2 = mat2( 0.8, - 0.6, 0.6, 0.8 ) * vMapUv + vec2( 0.37, 0.61 );
    sampledDiffuseColor = mix( sampledDiffuseColor, texture2D( map, spUv2 ), smoothstep( 0.3, 0.7, spBruit( vMapUv * 0.93 + 3.1 ) ) );
  }
  diffuseColor *= sampledDiffuseColor;
#endif
`;

const SP_FRAGMENT = `
{
  // le repère de la surface, dans le monde : vue de dessus pour un sol ou une pente, de face pour un mur
  vec3 spG = inverseTransformDirection( nonPerturbedNormal, viewMatrix );
  vec3 spN = inverseTransformDirection( normal, viewMatrix );          // avec le relief déjà dessiné, s'il y en a
  vec3 spT, spB; vec2 spP;
  if ( abs( spG.y ) > 0.7 ) {
    float s = sign( spG.y );
    spT = normalize( vec3( 1.0, 0.0, 0.0 ) - spG * spG.x );
    spB = cross( spG, spT );
    spP = vec2( vPosSurf.x, - vPosSurf.z * s );
  } else {
    spT = normalize( cross( vec3( 0.0, 1.0, 0.0 ), spG ) );
    spB = cross( spG, spT );
    spP = vec2( dot( vPosSurf, spT ), vPosSurf.y );
  }
  spP *= uSpA.x;
  vec4 spK = texture2D( uSpDet, spP );
  vec3 spM = texture2D( uSpNorm, spP ).xyz;
  // LA COULEUR : multipliée par le grain (1 en moyenne), en luminance seule ou avec les nuances de la photo
  vec3 spC = spK.rgb * 2.0;
  float spL = dot( spC, vec3( 0.2126, 0.7152, 0.0722 ) );
  diffuseColor.rgb *= max( mix( vec3( 1.0 ), mix( vec3( spL ), spC, uSpA.w ), uSpA.z ), vec3( 0.0 ) );
  // LES NUANCES LENTES (l'enrobé) : deux octaves de bruit lues dans le monde, en mètres, sans rapport avec la tuile —
  // des plages de 3 m environ, et de 1 m dans un repère tourné de 37° (comme SP_MAP) pour que leurs cellules ne
  // s'alignent pas sur les axes. De 0,955 à 1,04 : ±9 % se voyait en marbrure (contre-examen du 30/09).
  if ( uSpLF > 0.0 ) {
    vec2 spQ = vPosSurf.xz;
    float spLf = 0.6 * spBruit( spQ * 0.35 ) + 0.4 * spBruit( mat2( 0.8, - 0.6, 0.6, 0.8 ) * spQ * 1.1 + 5.0 );
    diffuseColor.rgb *= mix( 1.0, mix( 0.955, 1.04, spLf ), uSpLF );
  }
  // LA RUGOSITÉ : un grain plus lisse, un creux plus mat
  roughnessFactor = clamp( roughnessFactor * mix( 1.0, spK.a * 2.0, uSpB.x ), 0.04, 1.0 );
  // LE RELIEF : les pentes de la photo, redressées de leur biais, posées sur la normale (et le relief dessiné)
  vec3 spD = vec3( ( spM.xy * 2.0 - 1.0 - uSpB.yz ) * uSpA.y, spM.z * 2.0 - 1.0 );
  vec3 spW = normalize( spT * spD.x + spB * spD.y + spN * max( spD.z, 0.05 ) );
  normal = normalize( ( viewMatrix * vec4( spW, 0.0 ) ).xyz );
}
`;

// LA BRILLANCE RASANTE DE L'ENROBÉ (30/09, lot L7). Sur les photos 340, 341 et 343, prises debout, l'enrobé du fond
// est de 16 à 23 % plus clair que celui qu'on a sous les pieds : vu en rasant, un revêtement même mat renvoie le ciel
// (Fresnel). Le jeu n'en rendait que 5 à 7 % : la rugosité de 0,9 éteint presque tout le reflet de la carte
// d'environnement, et en basse et en moyenne il n'y a pas de carte du tout. On l'ajoute ici, APRÈS l'éclairage et
// AVANT l'occlusion (le pied du mur et du rideau en reçoivent moins, comme du reste du ciel) :
//  - la lumière reflétée est celle du CIEL reçue en ce point — l'éclairage diffus, indirect ET direct (le remplissage,
//    qui porte une part du ciel sans carte : js/weather.js versFill ; le soleil là où il passe), divisé par l'albédo —, si
//    bien qu'elle suit toute seule le préréglage (carte HDR ou hémisphère), le couvert et la pluie, sans calage à part
//    (et elle s'éteindrait d'elle-même avec le ciel : le parc n'a pas de nuit) ;
//  - la loi est celle de Schlick, (1 - n.v)^5 : rien vu d'en haut (la caméra de match, 0 à 2 %), l'essentiel au-delà
//    de 10 m en balade ; `rasant` règle la force (0,1 : +9 % au fond du plateau en balade, loin / près de 1,05 à 1,14,
//    en extrême comme en moyenne ; 1,16 à 1,23 sur les photos) ;
//  - teinte gris un rien mauve (0,9 ; 0,87 ; 0,93), celle de l'enrobé des photos au loin, jamais bleue ;
//  - la météo l'éteint quand le sol est mouillé (RASANT, 1 - wet : js/weather.js) : c'est alors le reflet de l'eau
//    (Reflector, js/fx.js) qui prend le relais.
const SP_RASANT = `
if ( uSpRas > 0.0 ) {
  float spNV = clamp( dot( nonPerturbedNormal, normalize( vViewPosition ) ), 0.0, 1.0 );
  float spF = pow( 1.0 - spNV, 5.0 );
  vec3 spCiel = ( reflectedLight.indirectDiffuse + reflectedLight.directDiffuse ) / max( material.diffuseColor, vec3( 0.02 ) );
  reflectedLight.indirectDiffuse += spCiel * vec3( 0.9, 0.87, 0.93 ) * ( uSpRas * uSpRasK * spF );
}
`;
// (un seul uniforme pour toutes les surfaces, posé par la météo à chaque changement de temps)
export const RASANT = { value: 1 };

function injecter(mat, D, det, norm) {
  const u = {
    uSpDet: { value: det }, uSpNorm: { value: norm },
    uSpA: { value: new THREE.Vector4(1 / D.tuile, D.relief, D.grain, D.chroma) },
    uSpB: { value: new THREE.Vector4(D.rugo, D.nBiais[0], D.nBiais[1], D.antiRepet ? 1 : 0) },
    uSpLF: { value: D.nuances || 0 },
    uSpRas: { value: D.rasant || 0 }, uSpRasK: RASANT,
  };
  // réglages propres à un matériau : `userData.surfaceParc = { cle, relief, grain, rugo }`
  const o = mat.userData.surfaceParc;
  if (typeof o === 'object') {
    if (o.relief !== undefined) u.uSpA.value.y = o.relief;
    if (o.grain !== undefined) u.uSpA.value.z = o.grain;
    if (o.rugo !== undefined) u.uSpB.value.x = o.rugo;
  }
  mat.__surfaceParc = u;                                    // (hors de userData : Material.copy le passe au JSON)
  if (D.sansBump) mat.bumpMap = null;
  const avant = mat.onBeforeCompile, cleAvant = mat.customProgramCacheKey;
  const natif = avant === THREE.Material.prototype.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (!natif) avant.call(mat, sh, r);
    for (const k in u) sh.uniforms[k] = u[k];
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPosSurf;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        {
          vec4 spPos = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            spPos = instanceMatrix * spPos;
          #endif
          vPosSurf = ( modelMatrix * spPos ).xyz;
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + SP_ENTETE)
      .replace('#include <map_fragment>', SP_MAP)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + SP_FRAGMENT)
      .replace('#include <aomap_fragment>', SP_RASANT + '#include <aomap_fragment>');
  };
  // Clé CONSTANTE : le source injecté ne change jamais. Si le matériau avait déjà son propre shader, sa clé vient devant.
  mat.customProgramCacheKey = () => (natif ? '' : cleAvant.call(mat) + '|') + 'surface-parc-1';
  mat.needsUpdate = true;
}

// Charge les photos des surfaces présentes dans la scène, les prépare et les pose sur leurs matériaux. À appeler une
// fois le décor construit et optimisé (optimiserDecor) : les matériaux ont alors leur forme définitive.
export function poserSurfacesParc(scene, renderer) {
  if (!renderer) return;
  scene.userData.rasant = RASANT;                           // (la météo y pose la part laissée par le sol mouillé)
  const parCle = new Map();
  scene.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      const s = m && m.userData.surfaceParc;
      if (!s || m.__surfaceParc) continue;
      const cle = typeof s === 'object' ? s.cle : s, D = SURFACES_PARC[cle];
      if (!D || (MOBILE && D.jardin)) continue;
      if (!parCle.has(cle)) parCle.set(cle, new Set());
      parCle.get(cle).add(m);
    }
  });
  const aniso = Math.min(MOBILE ? 4 : 8, renderer.capabilities.getMaxAnisotropy());
  const charger = (url, srgb) => new Promise((ok, ko) => new THREE.TextureLoader().load(url, (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    ok(t);
  }, undefined, ko));
  for (const [cle, mats] of parCle) {
    const D = SURFACES_PARC[cle], base = DOSSIER + D.tex + '_', suf = (MOBILE || D.pc !== 1024) ? '_512.jpg' : '.jpg';
    Promise.all([charger(base + 'couleur' + suf, true), charger(base + 'rugosite' + suf, false), charger(base + 'normale' + suf, false)])
      .then(([coul, rugo, norm]) => {
        const det = preparer(renderer, coul, rugo, D, aniso).texture;
        for (const m of mats) injecter(m, D, det, norm);
      })
      .catch((e) => console.warn('[parc] photo de surface non chargée (' + cle + '), on garde le décor dessiné', e));
  }
}
