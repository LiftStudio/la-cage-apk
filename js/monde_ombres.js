import * as THREE from 'three';
import { Monde } from './monde.js';
import { PARC_ENTIER, settings } from './settings.js';
import { dataTextureHauteurs } from './monde_sol.js';
import { TELEPHONE } from './appareil.js';

// =====================================================================
//  LES OMBRES ET LA LUMIÈRE SUR 300 M (lot A6 du chantier « parc complet »)
// =====================================================================
// Le soleil du parc est celui des photos validées : un soir, 5° au-dessus de l'horizon, derrière le pin (décision D12 de
// la conception). À 5°, une ombre est ONZE fois plus longue que ce qui la porte : un tilleul de 15 m ombre le sol
// jusqu'à 170 m derrière lui, et le parc entier, sous ses 400 arbres, est presque tout à l'ombre ; seuls le haut des
// couronnes et quelques trouées gardent l'or du couchant. Jusqu'ici, la carte d'ombre du soleil restait cadrée sur le
// plateau (un rectangle de 42 x 32 m, js/fx.js _cadrerOmbre) : dès qu'on en sortait, plus aucune ombre, tout le parc
// était au soleil, et le bord de la carte faisait une coupure rectiligne ; l'écran invisible du pin, lui, jetait son
// ombre sur 80 m à travers l'esplanade et la promenade.
//
// TROIS COUCHES, lues ensemble par chaque pixel éclairé (dans la boucle des lumières de three, comme js/nuages.js) :
//
//  1. LA CARTE QUI SUIT (celle du soleil de three) : recadrée à chaque image autour du joueur (ou de la caméra libre des
//     points de vue), dans un disque de R mètres (§ 3.6 : 40 m en extrême et ultra, 35 en haute, 25 en moyenne et en
//     basse, 20 et 16 sur téléphone), avec les porteurs à portée (§ 3.6 : 60 m en extrême ; ceux que l'ordonnanceur et
//     les arbres laissent porter, js/monde_charge.js et js/monde_vegetation.js). Sa caméra ne tourne jamais et ne se
//     déplace que par pas ENTIERS de texel : les ombres ne scintillent pas quand on marche.
//  2. LA CARTE LOINTAINE, cuite : une seule carte de profondeur, vue du soleil, pour TOUT le monde du parc (220 x 335 m),
//     photographiée au démarrage, puis quand les chargements du plateau sont finis, avec des SUBSTITUTS pour les 400
//     arbres de arbres.bin (une couronne en ellipsoïde et un tronc chacun : les vrais arbres lointains sont des
//     imposteurs, qui ne portent pas d'ombre) et le décor fixe déjà construit ; chaque morceau des zones construit
//     ensuite y est AJOUTÉ (sans rien effacer : un morceau libéré au loin y garde son ombre). Elle prend le relais
//     au-delà du disque, avec un fondu de 5 m ; et DANS le disque, elle ajoute l'ombre de ce qui est trop loin pour la
//     carte qui suit (un obstacle à plus de L mètres le long du rayon, L = portée des porteurs moins la distance à la
//     caméra) : sans elle, le sol autour du joueur serait plus clair que le parc au-delà, un anneau qui le suivrait.
//  3. LA ZONE D'OMBRE FORCÉE, à la place de l'écran invisible du pin (js/court_parc.js) : le même écran de 42 x 8,5 m, face
//     au soleil derrière le grillage du pin, mais calculé dans le shader et SEULEMENT dans une boîte autour du plateau
//     (bords doux de 2 m). Le plateau reste à l'ombre d'un bout à l'autre, comme sur toutes les photos, le haut des
//     platanes et du rideau garde son or ; et l'ombre de l'écran ne traverse plus le parc.
//
// ET LE SOL, CUIT PAR CELLULE (§ 3.7 ; la méthode de cuireOcclusionSol, js/court.js, qui cuit le plateau et le garde) :
// chaque cellule de 32 m de monde.json, la première fois qu'elle passe à portée de détail et que ses morceaux sont
// construits, reçoit dans un atlas (8 texels par mètre sur PC, 4 sur téléphone) R = l'occlusion du ciel (l'horizon
// cherché à 4 m dans 16 directions, et la canopée), B = la canopée seule, A = « cuite ». Le matériau du sol du parc
// (js/monde_sol.js) la lit comme une aoMap : la lumière du ciel baisse au pied des murs, des bordures et sous les
// couronnes. G est réservé (le soleil cuit : on le lit directement dans la carte lointaine, toujours à jour).
//
// DRAPEAU BAISSÉ, ou sur tout autre terrain : ce module ne touche à rien, pas même au texte des shaders (OMBRE_MONDE_ACTIF
// est lu une fois, au chargement, comme le fait js/parc/index.js).
//
// MESURÉ (Radeon intégrée, extrême, GPU compris) : la carte qui suit coûte à la passe d'ombre 120 à 145 appels (plateau,
// promenade ; 180 au plus, § 3.6), 74 en haute, 49 en moyenne ; la carte lointaine 40 ms à chaque photographie (deux ou
// trois, pendant le chargement), un morceau ajouté 2 ms ; une cellule de sol 6,5 ms, en trois images de 2 à 3 ms.
// PV01 et PV02 (captures du banc, drapeau levé) : écart moyen de 0,65 et 0,22 / 255 avec l'écran du pin d'avant (parc2 :
// 0,66 et 0,22). Drapeau baissé : parc et parc2 identiques au pixel, journaux de balade et de match identiques.
//
// Outils (?debug=1) : window.__ombresMonde — .stats, .voir('proche' | 'loin' | 'tout'), .force(k) (l'occlusion cuite du
// sol, 0 pour la couper), .cuireLoin(), .cuireCellules(), .cuireTout(camera).

const TERRAIN = settings.game.terrain || 'becon';
export const OMBRE_MONDE_ACTIF = PARC_ENTIER && (TERRAIN === 'parc' || TERRAIN === 'parc2');
const MOBILE = TELEPHONE;   // js/appareil.js : la même détection pour tout le jeu (et `?tel=1`)

// Le rayon de la carte qui suit (§ 3.6) : PC [extrême, ultra, haute, moyenne, basse], téléphone [haute, moyenne, basse]
const RAYON = { pc: { extreme: 40, ultra: 40, high: 35, medium: 25, low: 25 }, tel: { high: 20, medium: 16, low: 16 } };
const FONDU = 5;                 // m : fondu entre la carte qui suit et la carte lointaine (§ 3.7)
const HAUT_RECEPTEURS = 26;      // m au-dessus du sol : ce qui reçoit une ombre nette (le haut des platanes)
const ECART_SOL_MAX = 14;        // m : le plus grand dénivelé attendu dans le disque (le coteau)
const REF_PROFONDEUR = 119;      // m : la profondeur de la carte du soleil pour laquelle son biais a été réglé (js/court.js)
const LOIN_BIAIS = 0.15, LOIN_NORMALE = 0.12;   // m : biais et décalage selon la normale de la carte lointaine
const RECUIRE_LOIN_S = 8;        // s : au plus une nouvelle photographie de la carte lointaine tous les tant
// La cuisson du sol par cellule
const CUIT = { rayon: 4, pas: 12, anneau: 5, canopee: 0.65, pied: 0.35, intensite: 0.85, marge: 5, bordure: 4 };
const CUIT_PERIODE = 0.25;       // s entre deux cellules cuites

// =====================================================================
//  LES UNIFORMES PARTAGÉS
// =====================================================================
// Des Float32Array : UniformsUtils.cloneUniforms (three r170) les passe PAR RÉFÉRENCE à chaque matériau (c'est le
// procédé de js/nuages.js) — un seul réglage vaut pour toute la scène, sans rien recompiler.
export const OM = {
  suivie: new Float32Array(4),   // x = rayon R (0 : rien d'installé), y = fondu, z = portée des porteurs, w = vue de mise au point
  centre: new Float32Array(4),   // x, y = centre (x, z du monde affiché) de la carte qui suit
  loin: new Float32Array(4),     // x = carte lointaine prête, y = biais (profondeur normalisée), z, w = un texel (u, v)
  loinP: new Float32Array(4),    // x = profondeur de la carte lointaine (m), y = décalage selon la normale (m)
  mLoin: new Float32Array(16),
  zoneA: new Float32Array(4),    // xyz = centre de l'écran du pin, w = sa demi-largeur
  zoneB: new Float32Array(4),    // xyz = direction du soleil (monde, unitaire), w = haut de l'écran
  zoneC: new Float32Array(4),    // la boîte où l'écran joue : x0, z0, x1, z1
  zoneD: new Float32Array(4),    // x = zone active, y = bord doux (m), z = pénombre par mètre de distance, w = bas de l'écran
};
// LA TEXTURE PARTAGÉE. cloneUniforms CLONE une texture (et refuse celle d'une cible de rendu) : une carte commune à tous
// les matériaux ne peut donc pas passer par ShaderLib telle quelle. Celle-ci ne se clone pas (clone() la rend elle-même)
// et n'a pas d'image : elle emprunte l'identifiant WebGL de la carte lointaine une fois celle-ci photographiée
// (_partager). Sa version reste 0 : three la lie sans jamais rien y téléverser.
// Créée à la PREMIÈRE demande, jamais au chargement du module : le constructeur d'une texture tire son identifiant au
// hasard (Math.random), et ce module est chargé sur tous les terrains ; créée ici d'office, elle décalait le hasard de
// tout le décor construit ensuite, drapeau baissé (La Cage, Levallois, Jemmapes : captures du banc différentes).
class TexturePartagee extends THREE.Texture { clone() { return this; } }
let T_LOIN = null;
function texLoin() {
  if (!T_LOIN) { T_LOIN = new TexturePartagee(); T_LOIN.name = 'carte lointaine du soleil (partagée)'; }
  return T_LOIN;
}

export function uniformesOmbreMonde() {
  return { uOmSuivie: { value: OM.suivie }, uOmCentre: { value: OM.centre }, uOmLoin: { value: OM.loin }, uOmLoinP: { value: OM.loinP },
    mOmLoin: { value: OM.mLoin }, tOmLoin: { value: texLoin() },
    uOmZoneA: { value: OM.zoneA }, uOmZoneB: { value: OM.zoneB }, uOmZoneC: { value: OM.zoneC }, uOmZoneD: { value: OM.zoneD } };
}

// =====================================================================
//  LE GLSL
// =====================================================================
// Les déclarations et la zone forcée, communes au sommet (les feuilles : js/court_parc.js, feuilleAuSoleil) et au
// fragment. `omDepack` recopie unpackRGBAToDepth : le chunk <packing> ne peut pas être inclus deux fois, et le sommet
// des feuilles l'inclut déjà lui-même.
const GLSL_COMMUN = `
#define OMBRE_MONDE 1
uniform vec4 uOmSuivie, uOmCentre, uOmLoin, uOmLoinP, uOmZoneA, uOmZoneB, uOmZoneC, uOmZoneD;
uniform mat4 mOmLoin;
uniform sampler2D tOmLoin;
float omDepack( vec4 v ) { return dot( v, vec4( 255.0 / 256.0, 255.0 / 65536.0, 255.0 / 16777216.0, 1.0 / 16777216.0 ) ); }
// La zone d'ombre forcée (l'écran du pin) : la part du soleil qu'elle retire en w (1 = tout). On remonte le rayon du
// soleil jusqu'au plan de l'écran : s'il le traverse entre ses bords, le point est à l'ombre, avec une pénombre qui
// grandit avec la distance (celle des ombres douces de js/ombres_soleil.js). Hors de la boîte du plateau, rien.
float omForcee( vec3 w ) {
  if ( uOmZoneD.x < 0.5 ) return 0.0;
  vec2 hors = max( uOmZoneC.xy - w.xz, w.xz - uOmZoneC.zw );
  float boite = 1.0 - smoothstep( 0.0, uOmZoneD.y, max( hors.x, hors.y ) );
  if ( boite <= 0.0 ) return 0.0;
  vec3 S = uOmZoneB.xyz;
  vec2 Sh = normalize( S.xz );
  float t = dot( uOmZoneA.xz - w.xz, Sh ) / max( dot( S.xz, Sh ), 1e-3 );
  if ( t <= 0.0 ) return 0.0;
  vec3 q = w + t * S;
  float lat = abs( dot( q.xz - uOmZoneA.xz, vec2( Sh.y, - Sh.x ) ) );
  float pen = 0.02 + t * uOmZoneD.z;
  return boite * ( 1.0 - smoothstep( uOmZoneB.w - pen, uOmZoneB.w + pen, q.y ) ) * smoothstep( uOmZoneD.w - pen, uOmZoneD.w + pen, q.y )
    * ( 1.0 - smoothstep( uOmZoneA.w - pen, uOmZoneA.w + pen, lat ) );
}
// La part de la carte qui suit en w (1 : elle seule ; 0 : la carte lointaine seule) : le disque de R mètres, fondu sur
// ses derniers mètres, et le bord de la carte en espace lumière (au-dessus des plus hautes cimes, par exemple).
float omProche( vec3 w, vec3 c ) {
  if ( uOmSuivie.w > 1.5 ) return 0.0;
  vec2 b = min( c.xy, 1.0 - c.xy );
  return ( 1.0 - smoothstep( uOmSuivie.x - uOmSuivie.y, uOmSuivie.x, length( w.xz - uOmCentre.xy ) ) )
    * smoothstep( 0.0, 0.03, min( b.x, b.y ) ) * step( c.z, 1.0 );
}
// Jusqu'où, le long du rayon, la carte qui suit connaît ses porteurs : ils sont à portée de la CAMÉRA (js/monde_charge.js,
// js/monde_vegetation.js), et le point en est déjà à distance(w, caméra).
float omPortee( vec3 w ) { return max( 6.0, uOmSuivie.z - distance( w, cameraPosition ) ); }
`;
// Le fragment : la carte lointaine en 9 prises (4 sur téléphone), et la combinaison des trois couches.
const GLSL_FRAGMENT = (tel) => `
#ifdef USE_SHADOWMAP
${GLSL_COMMUN}
// x = toutes les ombres de la carte lointaine en w ; y = seulement celles dont l'obstacle est à plus de L mètres le long
// du rayon (celles que la carte qui suit ne peut pas connaître)
vec2 omLoin( vec3 w, vec3 nW, float L ) {
  if ( uOmLoin.x < 0.5 || uOmSuivie.w > 0.5 && uOmSuivie.w < 1.5 ) return vec2( 1.0 );
  vec4 h = mOmLoin * vec4( w + nW * uOmLoinP.y, 1.0 );
  vec3 p = h.xyz / h.w;
  if ( p.x <= 0.0 || p.y <= 0.0 || p.x >= 1.0 || p.y >= 1.0 || p.z >= 1.0 ) return vec2( 1.0 );
  float zr = p.z + uOmLoin.y;
  vec2 s = vec2( 0.0 );
${tel ? `  for ( int j = 0; j < 2; j ++ ) for ( int i = 0; i < 2; i ++ ) {
    float d = ( zr - omDepack( textureLod( tOmLoin, p.xy + ( vec2( float( i ), float( j ) ) - 0.5 ) * uOmLoin.zw, 0.0 ) ) ) * uOmLoinP.x;
    float o = step( 0.0, d );
    s += vec2( o, o * step( L, d ) );
  }
  return 1.0 - s * 0.25;` : `  for ( int j = -1; j <= 1; j ++ ) for ( int i = -1; i <= 1; i ++ ) {
    float k = ( i == 0 ? 2.0 : 1.0 ) * ( j == 0 ? 2.0 : 1.0 );
    float d = ( zr - omDepack( textureLod( tOmLoin, p.xy + vec2( float( i ), float( j ) ) * uOmLoin.zw, 0.0 ) ) ) * uOmLoinP.x;
    float o = step( 0.0, d );
    s += k * vec2( o, o * step( L, d ) );
  }
  return 1.0 - s / 16.0;`}
}
// La visibilité du soleil en un point (espace vue) : \`proche\` = celle de la carte qui suit (ombres douces de
// js/ombres_soleil.js), \`coord\` = ses coordonnées dans cette carte. Sans parc entier installé : \`proche\`, tel quel.
float ombreMonde( float proche, vec4 coord, vec3 pVue, vec3 nVue, float intensite ) {
  if ( uOmSuivie.x <= 0.0 ) return proche;
  vec3 w = ( pVue - viewMatrix[ 3 ].xyz ) * mat3( viewMatrix );
  vec3 nW = normalize( nVue * mat3( viewMatrix ) );
  float wP = omProche( w, coord.xyz / coord.w );
  vec2 lo = 1.0 - intensite * ( 1.0 - omLoin( w, nW, omPortee( w ) ) );
  return mix( lo.x, min( proche, lo.y ), wP ) * ( 1.0 - intensite * omForcee( w ) );
}
#endif
`;
// Le sommet (la lumière transmise des feuilles, js/court_parc.js) : une prise dans la carte lointaine suffit.
const GLSL_SOMMET = `
#ifdef USE_SHADOWMAP
${GLSL_COMMUN}
vec2 omLoinUn( vec3 w, float L ) {
  if ( uOmLoin.x < 0.5 || uOmSuivie.w > 0.5 && uOmSuivie.w < 1.5 ) return vec2( 1.0 );
  vec4 h = mOmLoin * vec4( w, 1.0 );
  vec3 p = h.xyz / h.w;
  if ( p.x <= 0.0 || p.y <= 0.0 || p.x >= 1.0 || p.y >= 1.0 || p.z >= 1.0 ) return vec2( 1.0 );
  float d = ( p.z + uOmLoin.y - omDepack( textureLod( tOmLoin, p.xy, 0.0 ) ) ) * uOmLoinP.x;
  float o = step( 0.0, d );
  return 1.0 - vec2( o, o * step( L, d ) );
}
// \`proche\` : la comparaison brute dans la carte qui suit ; \`c\` : les coordonnées du point dans cette carte. Sans parc
// entier installé : exactement la règle d'avant (rien hors de la carte, fondu de 3 % au bord).
float ombreMondeFeuille( vec3 w, float proche, vec3 c ) {
  if ( uOmSuivie.x <= 0.0 ) {
    vec2 b = min( c.xy, 1.0 - c.xy ); float bo = min( b.x, b.y );
    return ( bo <= 0.0 || c.z >= 1.0 ) ? 0.0 : proche * smoothstep( 0.0, 0.03, bo );
  }
  vec2 lo = omLoinUn( w + uOmZoneB.xyz * 0.5, omPortee( w ) );
  return mix( lo.x, min( proche, lo.y ), omProche( w, c ) ) * ( 1.0 - omForcee( w ) );
}
#endif
`;
// Pour un ShaderMaterial (js/ombres_contact.js) : le fragment, sans la garde USE_SHADOWMAP (il la gère lui-même).
export const GLSL_OMBRE_MONDE = GLSL_COMMUN + `
vec2 omLoinUn( vec3 w, float L ) {
  if ( uOmLoin.x < 0.5 ) return vec2( 1.0 );
  vec4 h = mOmLoin * vec4( w, 1.0 );
  vec3 p = h.xyz / h.w;
  if ( p.x <= 0.0 || p.y <= 0.0 || p.x >= 1.0 || p.y >= 1.0 || p.z >= 1.0 ) return vec2( 1.0 );
  float d = ( p.z + uOmLoin.y - omDepack( textureLod( tOmLoin, p.xy, 0.0 ) ) ) * uOmLoinP.x;
  float o = step( 0.0, d );
  return 1.0 - vec2( o, o * step( L, d ) );
}
`;

// L'INSTALLATION DANS LES CHUNKS DE THREE, avant toute compilation. Seulement drapeau levé, sur le parc. L'ordre des
// modules n'y change rien : js/game.js importe js/court.js (donc js/parc/index.js, puis ce module) AVANT js/fx.js et
// js/ombres_soleil.js ; on enveloppe alors l'appel getShadow de three, que js/ombres_soleil.js remplace ensuite, DANS
// l'enveloppe, par ses ombres douces (vérifié : « ombreMonde( ombreSoleil( … »). Chargé après lui, on enveloppe son appel.
const APPEL_PCSS = 'ombreSoleil( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ], dot( geometryNormal, directLight.direction ) )';
const APPEL_THREE = 'getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] )';
export let OMBRE_MONDE_CHUNKS = false;
if (OMBRE_MONDE_ACTIF) {
  const C = THREE.ShaderChunk;
  const appel = C.lights_fragment_begin.includes(APPEL_PCSS) ? APPEL_PCSS : C.lights_fragment_begin.includes(APPEL_THREE) ? APPEL_THREE : null;
  if (appel) {
    // (seul le soleil, directionalLights[ 0 ], porte une ombre au parc : la ligne n'est lue que pour lui)
    C.lights_fragment_begin = C.lights_fragment_begin.replace(appel,
      `ombreMonde( ${appel}, vDirectionalShadowCoord[ i ], geometryPosition, geometryNormal, directionalLightShadow.shadowIntensity )`);
    C.lights_pars_begin += GLSL_FRAGMENT(MOBILE);
    C.shadowmap_pars_vertex += GLSL_SOMMET;
    const u = uniformesOmbreMonde();
    for (const k of ['standard', 'physical', 'lambert', 'phong', 'toon']) Object.assign(THREE.ShaderLib[k].uniforms, u);
    OMBRE_MONDE_CHUNKS = true;
  } else console.warn('[ombres] lights_fragment_begin a changé : ombres du parc entier non installées');
}

// =====================================================================
//  LES SUBSTITUTS DES ARBRES
// =====================================================================
// Pour chaque arbre de arbres.bin : une couronne (ellipsoïde) et un tronc (cylindre), à la taille que js/monde_vegetation.js
// donne au vrai (hauteur du LiDAR, couronne élargie de 1,35, dans les bornes de l'essence). Invisibles : ils ne paraissent
// que le temps de photographier la carte lointaine (couronnes et troncs) et le sol d'une cellule (troncs dans les
// hauteurs, couronnes dans la canopée). `forme` : [centre de la couronne, demi-hauteur] en fractions de la hauteur, et
// les bornes du rayon de couronne (fractions de la hauteur).
const FORMES = {
  platane: [0.62, 0.36, 0.3, 0.55], tilleul: [0.62, 0.36, 0.28, 0.5], marronnier: [0.62, 0.36, 0.3, 0.55],
  hetre_pourpre: [0.62, 0.37, 0.3, 0.55], saule: [0.58, 0.4, 0.3, 0.55], cedre: [0.5, 0.46, 0.18, 0.4], pin: [0.66, 0.3, 0.25, 0.5],
  arbuste: [0.55, 0.42, 0.3, 0.6], cerisier: [0.58, 0.38, 0.3, 0.6], if_conique: [0.5, 0.5, 0.15, 0.35],
};
function substituts(donnees, dx) {
  const T = donnees.tableArbres || new Float32Array(0), E = donnees.essences || [], n = Math.floor(T.length / 6);
  const liste = [];
  for (let j = 0; j < n; j++) {
    const x = T[j * 6], z = T[j * 6 + 1], h = T[j * 6 + 2], r = T[j * 6 + 3], e = Math.round(T[j * 6 + 4]);
    if (!(h > 0.5)) continue;
    const nom = (E[e] && E[e].nom) || 'tilleul', F = FORMES[nom] || FORMES.tilleul;
    const X = x + dx, y0 = Monde.sol(X, z) - 0.08;
    const rc = Math.min(F[3] * h, Math.max(F[2] * h, r * 1.35));
    liste.push({ x: X, z, y0, h, rc, cy: y0 + F[0] * h, ry: F[1] * h, rt: Math.max(0.12, 0.022 * h) });
  }
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const couronnes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, Math.max(1, liste.length));
  const troncs = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6, 1), mat, Math.max(1, liste.length));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  liste.forEach((t, i) => {
    couronnes.setMatrixAt(i, m4.compose(new THREE.Vector3(t.x, t.cy, t.z), q, new THREE.Vector3(t.rc, t.ry, t.rc)));
    const ht = Math.max(0.5, t.cy - t.y0);
    troncs.setMatrixAt(i, m4.compose(new THREE.Vector3(t.x, t.y0 + ht / 2, t.z), q, new THREE.Vector3(t.rt, ht, t.rt)));
  });
  couronnes.count = troncs.count = liste.length;
  const g = new THREE.Group();
  g.name = 'substituts des arbres (ombres du parc entier)';
  for (const m of [couronnes, troncs]) {
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
    m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false;
    g.add(m);
  }
  Object.assign(g.userData, { nofuse: true, dynamique: true, substituts: true });
  g.visible = false;
  return { groupe: g, couronnes, troncs, n: liste.length };
}

// =====================================================================
//  LES OMBRES DU PARC ENTIER
// =====================================================================
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _b = new THREE.Box3(), _s = new THREE.Sphere();
const croise = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

export class OmbresMonde {
  // `donnees` : ce que rend chargerMonde (repère, cellules, arbres) ; `ordonnanceur`, `vegetation`, `sol` : ceux du parc
  // installé (js/parc/index.js) ; `reglages(scene)` : les réglages du préréglage (js/monde_charge.js).
  constructor({ scene, renderer, donnees, dx = 0, ordonnanceur = null, vegetation = null, sol = null, reglages = null, mobile = MOBILE }) {
    this.scene = scene; this.r = renderer; this.d = donnees; this.dx = dx; this.mobile = mobile;
    this.ord = ordonnanceur; this.veg = vegetation; this.sol = sol; this.reglages = reglages;
    this.stats = { rayon: 0, centre: [0, 0], loin: { photos: 0, ms: 0, taille: null }, cellules: { cuites: 0, ms: 0, derniere: null }, decor: 0 };
    this._t = 0; this._tCuit = 0; this._tLoin = -1e9; this._versionLoin = null; this._b0 = null; this._q = null;
    // les substituts des arbres (invisibles)
    this.subs = substituts(donnees, dx);
    scene.add(this.subs.groupe);
    // la carte lointaine : une lumière qui n'est PAS dans la scène (elle n'éclaire rien, three ne la connaît pas), dont on
    // demande la carte d'ombre à la main, avec la machinerie de three (matériaux de profondeur, découpes des feuilles)
    this.loin = new THREE.DirectionalLight(0xffffff, 0);
    this.loin.castShadow = true; this.loin.shadow.autoUpdate = false; this.loin.shadow.needsUpdate = false;
    this._cadrerLoin();
    // la zone d'ombre forcée (déclarée par js/court_parc.js à la place de l'écran du pin)
    this._zone();
    // la cuisson du sol par cellule, lue par le matériau du sol du parc
    this._preparerCuisson();
    this._brancherSol();
    // les programmes de la cuisson compilés dès maintenant, pendant le chargement (la boucle de l'horizon coûtait 45 ms
    // de compilation à la première cellule, en pleine partie)
    const X = this._cibles();
    if (X) for (const m of [X.calcul, X.flou]) { X.quad.material = m; renderer.compile(X.sceneQuad, X.camHaut); }
    // les porteurs du décor du plateau (js/fx.js _ombresDecor les confie ici au parc entier)
    this._decor = null; this._decorOn = true; this._tDecor = 0;
    scene.userData.ombreSuivie = this;
    OM.suivie[1] = FONDU;
    this.maj = (dt, camera, joueur) => this._maj(dt, camera, joueur);
    if (typeof window !== 'undefined') window.__ombresMonde = this;
  }

  // ------------------------------------------------------------------ chaque image (Monde.maj, avant le rendu)
  _maj(dt, camera, joueur) {
    const t0 = performance.now();
    try { this._majImage(dt, camera, joueur); } finally {
      // (mesures : le temps pris dans l'image, et le pire des 300 dernières — __ombresMonde.stats)
      const ms = performance.now() - t0, S = this.stats, f = this._fenMs || (this._fenMs = []);
      f.push(ms); if (f.length > 300) f.shift();
      S.msImage = +ms.toFixed(2); S.picRecent = +Math.max(...f).toFixed(2);
    }
  }
  _majImage(dt, camera, joueur) {
    this._t += dt;
    const env = this.scene.userData.env, sun = env && env.sun;
    if (!sun || !camera) return;
    this._camera = camera;                       // (ses couches : celles que la passe d'ombre de three teste)
    this._suivre(sun, camera, joueur);
    const S = this.scene.userData.sunDir;
    if (S) { OM.zoneB[0] = S.x; OM.zoneB[1] = S.y; OM.zoneB[2] = S.z; }
    OM.zoneD[2] = Math.tan(0.0075 * ((sun.userData && sun.userData.flou) || 1));      // (PostFX.RAYON_SOLEIL, js/fx.js)
    const ombres = this.r && this.r.shadowMap.enabled && sun.castShadow;
    if (ombres) {
      // la carte lointaine : photographiée au démarrage, puis de nouveau quand le décor du plateau a fini d'arriver (ses
      // arbres viennent de leurs fichiers : le même signal que l'ombre cuite du plateau, js/court.js) — 40 ms, pendant le
      // chargement. Les morceaux des zones construits ensuite y sont AJOUTÉS, un toutes les 0,2 s (voir _ajouterLoin),
      // sans rien effacer : un morceau libéré au loin y garde son ombre.
      const v = `${this.scene.userData.solCuit || 0}|${(this.scene.userData.lotsArbres || []).length}`;
      if (v !== this._versionLoin && (this._versionLoin === null || this._t - this._tLoin > RECUIRE_LOIN_S || !this.stats.loin.photos)) {
        this._versionLoin = v; this.cuireLoin();
      } else if (!this._chantierCuit && this.ord && this.loin.shadow.map && (this._tAjout = (this._tAjout || 0) - dt) <= 0) {
        // (pas dans une image où une cellule du sol cuit : les deux travaux ne s'additionnent pas)
        this._tAjout = 0.2;
        const neufs = [];
        for (const m of this.ord.morceaux) if (m.groupe && !this._vus.has(m.groupe) && neufs.length < 1) neufs.push(m.groupe);
        if (neufs.length) this._ajouterLoin(neufs);
      }
    }
    // le sol, une cellule à la fois (en trois images : les hauteurs d'en haut, d'en bas, puis la canopée et le calcul)
    if (this._chantierCuit) this._etapeCuisson();
    else if ((this._tCuit -= dt) <= 0) { this._tCuit = CUIT_PERIODE; this._cuireProchaine(camera); }
    // les porteurs du décor du plateau (préréglages bas : seulement autour de l'observateur)
    if ((this._tDecor -= dt) <= 0) { this._tDecor = 0.5; this._majDecor(); }
  }

  // ------------------------------------------------------------------ 1. la carte qui suit
  _rayon() {
    const q = this.scene.userData.qualite || 'high', T = this.mobile ? RAYON.tel : RAYON.pc;
    return T[q] || T.high;
  }

  // Le centre : le joueur quand la caméra le suit (balade, vélo), la caméra et ce qu'elle regarde quand elle est libre
  // (points de vue de js/debug_monde.js). Puis la caméra d'ombre, posée là par pas entiers de texel.
  _suivre(sun, camera, joueur) {
    const R = this._rayon(), Rg = this.reglages ? this.reglages(this.scene, this.mobile) : { ombre: 50 };
    camera.getWorldDirection(_v);
    const fl = Math.hypot(_v.x, _v.z) || 1, fx = _v.x / fl, fz = _v.z / fl;
    let cx, cz;
    const p = joueur && joueur.pos;
    if (p && Math.hypot(camera.position.x - p.x, camera.position.z - p.z) < 15) { cx = p.x; cz = p.z; }
    else { cx = camera.position.x + fx * R * 0.5; cz = camera.position.z + fz * R * 0.5; }
    this.stats.centre = [+(cx - this.dx).toFixed(1), +cz.toFixed(1)];
    // le sol dans le disque (tous les 2 m de déplacement : 25 lectures de Monde.sol)
    if (!this._g || Math.hypot(cx - this._g.x, cz - this._g.z) > 2) {
      let a = Infinity, b = -Infinity;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
        const y = Monde.sol(cx + i * R / 2, cz + j * R / 2); if (y < a) a = y; if (y > b) b = y;
      }
      this._g = { x: cx, z: cz, min: a, max: b };
    }
    const D = this.scene.userData.sunDir || _v2.copy(sun.position).normalize();
    const c = sun.shadow.camera, taille = sun.shadow.mapSize.x;
    // le cadre (constant pour un préréglage : la taille du texel ne change jamais en route)
    const hw = R + 2, hh = 0.5 * (ECART_SOL_MAX + HAUT_RECEPTEURS + 1) + 0.1 * hw;
    const dist = hw + Rg.ombre + 25, far = dist + hw + 25;
    const cle = `${hw}|${hh}|${far}|${taille}`;
    if (cle !== this._q) {
      this._q = cle;
      c.left = -hw; c.right = hw; c.top = hh; c.bottom = -hh; c.near = 1; c.far = far; c.up.set(0, 1, 0);
      c.updateProjectionMatrix();
      // le biais a été réglé pour 119 m de profondeur (3 cm) : on garde ces 3 cm
      if (this._b0 === null) this._b0 = sun.shadow.bias;
      sun.shadow.bias = this._b0 * REF_PROFONDEUR / (far - 1);
      this.stats.rayon = R; this.stats.carte = `${(2 * hw).toFixed(0)} x ${(2 * hh).toFixed(1)} m, ${taille} texels`;
    }
    // la base de la caméra d'ombre (celle que lookAt lui donnera : haut = y)
    const zc = _v2.copy(D).normalize();
    const xc = this._xc || (this._xc = new THREE.Vector3()), yc = this._yc || (this._yc = new THREE.Vector3());
    xc.set(0, 1, 0).cross(zc).normalize(); yc.copy(zc).cross(xc);
    // le point visé : au centre du disque, à mi-hauteur de ce qui reçoit une ombre ; arrondi au texel dans le plan de
    // la carte (la profondeur, elle, peut glisser : elle ne change rien aux texels)
    const T = _v.set(cx, (this._g.min + this._g.max + HAUT_RECEPTEURS) / 2, cz);
    const tx = 2 * hw / taille, ty = 2 * hh / taille;
    const a = T.dot(xc), b = T.dot(yc);
    T.addScaledVector(xc, Math.round(a / tx) * tx - a).addScaledVector(yc, Math.round(b / ty) * ty - b);
    sun.target.position.copy(T); sun.target.updateMatrixWorld();
    sun.position.copy(T).addScaledVector(zc, dist); sun.updateMatrixWorld();
    OM.suivie[0] = R; OM.suivie[2] = Rg.ombre;
    OM.centre[0] = cx; OM.centre[1] = cz;
  }

  // Appelé par js/fx.js à chaque changement de préréglage (la taille de la carte a pu changer) : on recadre à la
  // prochaine image.
  recadrer() { this._q = null; }

  // ------------------------------------------------------------------ 2. la carte lointaine
  // Cadrée une fois sur toute la grille du monde (+ 60 m de porteurs vers le soleil), 12 texels par mètre sur PC.
  _cadrerLoin() {
    const R = this.d.repere, dx = this.dx;
    const x0 = R.x0 + dx, x1 = R.x0 + R.pas * (R.nx - 1) + dx, z0 = R.z0, z1 = R.z0 + R.pas * (R.nz - 1);
    const D = new THREE.Vector3(0.405, 0.09, 0.904).normalize();         // (repris de scene.userData.sunDir au premier cliché)
    this._cadreLoin = { x0, x1, z0, z1, D };
    this._orienterLoin(D);
  }
  _orienterLoin(D) {
    const { x0, x1, z0, z1 } = this._cadreLoin, L = this.loin, c = L.shadow.camera;
    const C = new THREE.Vector3((x0 + x1) / 2, 15, (z0 + z1) / 2);
    L.target.position.copy(C); L.position.copy(C).addScaledVector(D, 600);
    L.updateMatrixWorld(); L.target.updateMatrixWorld();
    c.position.copy(L.position); c.up.set(0, 1, 0); c.lookAt(C); c.updateMatrixWorld(true);
    _b.makeEmpty();
    for (let i = 0; i < 8; i++) _b.expandByPoint(_v.set(i & 1 ? x1 : x0, i & 2 ? 45 : -10, i & 4 ? z1 : z0).applyMatrix4(c.matrixWorldInverse));
    c.left = _b.min.x; c.right = _b.max.x; c.bottom = _b.min.y; c.top = _b.max.y;
    c.near = Math.max(1, -_b.max.z - 60); c.far = -_b.min.z + 5;
    c.updateProjectionMatrix();
    const W = this.mobile ? 2048 : 4096, H = Math.min(W, Math.ceil(W * (_b.max.y - _b.min.y) / (_b.max.x - _b.min.x) / 64) * 64);
    if (L.shadow.mapSize.x !== W || L.shadow.mapSize.y !== H) {
      L.shadow.mapSize.set(W, H);
      if (L.shadow.map) { L.shadow.map.dispose(); L.shadow.map = null; }
    }
    this._dirLoin = D.clone();
    OM.loin[1] = -LOIN_BIAIS / (c.far - c.near); OM.loin[2] = 1 / W; OM.loin[3] = 1 / H;
    OM.loinP[0] = c.far - c.near; OM.loinP[1] = LOIN_NORMALE;
    this.stats.loin.taille = `${W} x ${H} (${(W / (_b.max.x - _b.min.x)).toFixed(1)} texels/m)`;
  }

  // La photographie : les substituts des arbres, le décor fixe (celui du plateau, les morceaux déjà construits, même hors
  // de portée d'ombre), sans ce qui bouge ni les vrais arbres du parc (leurs substituts les remplacent).
  cuireLoin() {
    const r = this.r, sm = r && r.shadowMap, sc = this.scene;
    if (!sm || !sm.enabled) return;
    const t0 = performance.now();
    const D = sc.userData.sunDir;
    if (D && (!this._dirLoin || this._dirLoin.distanceToSquared(D) > 1e-8)) this._orienterLoin(D.clone().normalize());
    const caches = [], porte = [];
    // (lot R1 : les morceaux construits mais hors de leur distance d'affichage y sont aussi, sans leur silhouette)
    const remettre = this.ord && this.ord.toutMontrer ? this.ord.toutMontrer() : null;
    const cacher = (o) => { if (o && o.visible) { o.visible = false; caches.push(o); } };
    for (const o of sc.children) if (o.userData.dynamique && o !== this.subs.groupe) cacher(o);
    if (this.veg && this.veg.groupe) cacher(this.veg.groupe);
    // les morceaux construits et les lots d'arbres du plateau hors de portée d'ombre : on leur rend la leur le temps du cliché
    const rendre = (o) => { if (o.isMesh && !o.castShadow && o.userData.ombreKit) { o.castShadow = true; porte.push(o); } };
    if (this.ord) for (const m of this.ord.morceaux) if (m.groupe) m.groupe.traverse(rendre);
    for (const L of sc.userData.lotsArbres || []) if (L.ombre && !L.mesh.castShadow) { L.mesh.castShadow = true; porte.push(L.mesh); }
    this.subs.groupe.visible = true;
    const auto = sm.autoUpdate, nu = sm.needsUpdate;
    sm.autoUpdate = true;
    this.loin.shadow.needsUpdate = true;
    this.loin.updateMatrixWorld(); this.loin.target.updateMatrixWorld();
    // (la passe d'ombre de three ne se joue qu'au milieu d'un rendu, quand il a son « état de rendu » : on la demande à la
    // fin du rendu d'une scène vide, dans une cible d'un pixel)
    if (!this._photo) {
      this._photo = { scene: new THREE.Scene(), cible: new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false }) };
      this._photo.scene.onAfterRender = () => { if (this._photoArgs) sm.render(...this._photoArgs); };
    }
    const cible0 = r.getRenderTarget();
    this._photoArgs = [[this.loin], sc, this._camera];
    try { r.setRenderTarget(this._photo.cible); r.render(this._photo.scene, this._camera); }
    finally {
      this._photoArgs = null;
      r.setRenderTarget(cible0);
      sm.autoUpdate = auto; sm.needsUpdate = nu;
      this.subs.groupe.visible = false;
      for (const o of caches) o.visible = true;
      for (const o of porte) o.castShadow = false;
      if (remettre) remettre();
    }
    this._partager();
    OM.mLoin.set(this.loin.shadow.matrix.elements);
    OM.loin[0] = 1;
    this._tLoin = this._t;
    this._vus = new WeakSet();
    if (this.ord) for (const m of this.ord.morceaux) if (m.groupe) this._vus.add(m.groupe);
    this.stats.loin.photos++; this.stats.loin.ms = +(performance.now() - t0).toFixed(1);
  }

  // Les morceaux construits depuis la photographie, AJOUTÉS à la carte lointaine : dessinés par-dessus, avec le test de
  // profondeur de la carte (son tampon de profondeur est gardé), sans l'effacer. Un morceau coûte ses quelques appels de
  // dessin (au plus 25 : règle 6 du contrat d'une zone), plus le parcours de la scène par three (2 ms en tout, mesurées) ; ses feuillages découpés y sont pleins, ce qui ne se voit pas à
  // cette distance. On les distingue par une couche à part, le temps du dessin.
  _ajouterLoin(groupes) {
    const r = this.r, sc = this.scene, L = this.loin, sm = r.shadowMap, COUCHE_LOIN = 6;
    for (const g of groupes) {
      this._vus.add(g);
      g.traverse((o) => { if (o.isMesh && (o.castShadow || o.userData.ombreKit)) o.layers.enable(COUCHE_LOIN); });
    }
    if (!this._matLoin) this._matLoin = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    const cam = L.shadow.camera, couches = cam.layers.mask;
    const fond = sc.background, surcharge = sc.overrideMaterial, brouillard = sc.fog, cible = r.getRenderTarget(), ac = r.autoClear;
    const auto = sm.autoUpdate, nu = sm.needsUpdate;
    // (lot R1 : un morceau construit en avance, hors de sa distance d'affichage, y entre quand même)
    const remettre = this.ord && this.ord.toutMontrer ? this.ord.toutMontrer() : null;
    cam.layers.set(COUCHE_LOIN);
    sc.background = null; sc.overrideMaterial = this._matLoin; sc.fog = null; sm.autoUpdate = false; sm.needsUpdate = false; r.autoClear = false;
    try { r.setRenderTarget(L.shadow.map); r.render(sc, cam); }
    finally {
      if (remettre) remettre();
      cam.layers.mask = couches;
      sc.background = fond; sc.overrideMaterial = surcharge; sc.fog = brouillard; sm.autoUpdate = auto; sm.needsUpdate = nu; r.autoClear = ac;
      r.setRenderTarget(cible);
      for (const g of groupes) g.traverse((o) => { if (o.isMesh) o.layers.disable(COUCHE_LOIN); });
    }
    this.stats.loin.ajouts = (this.stats.loin.ajouts || 0) + groupes.length;
  }

  // La texture partagée emprunte l'identifiant WebGL de la carte lointaine (voir TexturePartagee).
  _partager() {
    const m = this.loin.shadow.map;
    if (!m) return;
    const P = this.r.properties, src = P.get(m.texture), dst = P.get(texLoin());
    dst.__webglTexture = src.__webglTexture; dst.__webglInit = true;
  }

  // ------------------------------------------------------------------ 3. la zone d'ombre forcée
  _zone() {
    const z = this.scene.userData.zoneOmbreForcee;
    if (!z) { OM.zoneD[0] = 0; return; }
    OM.zoneA.set([z.centre[0], z.centre[1], z.centre[2], z.demiLargeur]);
    const S = z.soleil;
    OM.zoneB.set([S.x, S.y, S.z, z.haut]);
    OM.zoneC.set(z.boite);
    OM.zoneD.set([1, z.bord, 0.0098, z.bas]);
  }

  // ------------------------------------------------------------------ les porteurs du décor du plateau
  // js/fx.js (_ombresDecor) : sur les préréglages bas, le décor lointain ne porte plus d'ombre. Au parc entier, « lointain »
  // se mesure depuis l'observateur, pas depuis l'origine ; et seul le décor du plateau est concerné (les morceaux des
  // zones et leurs lots d'arbres sont réglés par l'ordonnanceur, les arbres du parc par js/monde_vegetation.js).
  decor(on) {
    this._decorOn = on;
    if (!this._decor) {
      this._decor = [];
      const sc = this.scene, geres = new Set((sc.userData.lotsArbres || []).map((L) => L.mesh));
      for (const o of sc.children) {
        if (o.userData.dynamique || o.userData.silhouette || /^(ZONE|SIL):/.test(o.name) || o === (this.veg && this.veg.groupe) || o === this.subs.groupe) continue;
        o.traverse((m) => {
          if (!m.isMesh || !m.castShadow || geres.has(m) || m.userData.ombreToujours) return;
          const bs = m.geometry && (m.geometry.boundingSphere || (m.geometry.computeBoundingSphere(), m.geometry.boundingSphere));
          if (bs) _v.copy(bs.center).applyMatrix4(m.matrixWorld); else m.getWorldPosition(_v);
          this._decor.push({ o: m, x: _v.x, z: _v.z });
        });
      }
      this.stats.decor = this._decor.length;
    }
    this._majDecor();
  }
  _majDecor() {
    if (!this._decor) return;
    const c = this.stats.centre, cx = c[0] + this.dx, cz = c[1];
    for (const e of this._decor) e.o.castShadow = this._decorOn || Math.hypot(e.x - cx, e.z - cz) < 24;
  }

  // ------------------------------------------------------------------ le sol, cuit par cellule
  _preparerCuisson() {
    const C = this.d.cellules || { x0: -24.7, z0: -16, taille: 32, i: [-5, 2], k: [-4, 6] };
    const tpm = this.mobile ? 4 : 8, S = C.taille * tpm;
    const nI = C.i[1] - C.i[0] + 1, nK = C.k[1] - C.k[0] + 1;
    this.cuit = {
      C, tpm, S, nI, nK,
      X0: C.x0 + C.taille * C.i[0] + this.dx, Z0: C.z0 + C.taille * C.k[0], W: nI * C.taille, L: nK * C.taille,
      cellules: [], atlas: null, cibles: null, pret: false,
    };
    for (let k = C.k[0]; k <= C.k[1]; k++) for (let i = C.i[0]; i <= C.i[1]; i++) {
      this.cuit.cellules.push({ i, k, boite: [C.x0 + C.taille * i, C.z0 + C.taille * k, C.x0 + C.taille * (i + 1), C.z0 + C.taille * (k + 1)], cuite: false });
    }
    // l'atlas : une case par cellule, rangées comme les cellules elles-mêmes (une seule image, alignée sur le monde : le
    // filtrage passe d'une cellule à sa voisine sans couture). Blanc et A = 0 : « pas encore cuite ».
    this.cuit.atlas = new THREE.WebGLRenderTarget(nI * S, nK * S, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: false, generateMipmaps: false });
    this.cuit.atlas.texture.name = 'sol du parc cuit (occlusion du ciel, canopée)';
  }

  _brancherSol() {
    const m = this.sol && this.sol.materiau, K = this.cuit;
    if (!m) return;
    const U = { tOmCuit: { value: K.atlas.texture }, uOmCuitCadre: { value: new THREE.Vector4(K.X0, K.Z0, 1 / K.W, 1 / K.L) },
      uOmCuitForce: { value: CUIT.intensite } };
    this._uCuit = U;
    const avant = m.onBeforeCompile, cle = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => {
      avant.call(m, sh, r);
      Object.assign(sh.uniforms, U);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D tOmCuit;\nuniform vec4 uOmCuitCadre;\nuniform float uOmCuitForce;')
        .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        {
          // LE SOL CUIT (js/monde_ombres.js) : l'occlusion du ciel de la cellule, comme l'aoMap de l'enrobé du plateau
          vec4 omCuit = texture2D( tOmCuit, ( vPosSol.xz - uOmCuitCadre.xy ) * uOmCuitCadre.zw );
          float omAO = 1.0 + ( omCuit.r - 1.0 ) * uOmCuitForce * omCuit.a;
          reflectedLight.indirectDiffuse *= omAO;
          #if defined( USE_ENVMAP ) && defined( STANDARD )
            reflectedLight.indirectSpecular *= computeSpecularOcclusion( saturate( dot( geometryNormal, geometryViewDir ) ), omAO, material.roughness );
          #endif
        }`);
    };
    m.customProgramCacheKey = () => cle.call(m) + '|sol-cuit-1';
    m.needsUpdate = true;
  }

  // La prochaine cellule à cuire : la plus proche de l'observateur, à portée de détail, dont les morceaux sont construits
  // (et une fois le décor du plateau chargé : ses arbres arrivent de leurs fichiers).
  _cuireProchaine(camera) {
    const K = this.cuit, r = this.r;
    if (!r || !this.sol) return;
    if (!(this.scene.userData.solCuit >= 1) && this._t < 12) return;
    const Rg = this.reglages ? this.reglages(this.scene, this.mobile) : { detail: 70 };
    const ox = camera.position.x - this.dx, oz = camera.position.z;
    let meilleure = null, dm = Infinity;
    for (const c of K.cellules) {
      if (c.cuite) continue;
      const b = c.boite, ex = ox < b[0] ? b[0] - ox : ox > b[2] ? ox - b[2] : 0, ez = oz < b[1] ? b[1] - oz : oz > b[3] ? oz - b[3] : 0;
      const d = Math.hypot(ex, ez);
      if (d > Rg.detail || d >= dm) continue;
      if (!this._pretePourCuire(c)) continue;
      meilleure = c; dm = d;
    }
    if (meilleure) { this._chantierCuit = { c: meilleure, etape: 1 }; this._etapeCuisson(); }
  }
  _pretePourCuire(c) {
    if (!this.ord) return true;
    const m = CUIT.marge, zone = [c.boite[0] - m, c.boite[1] - m, c.boite[2] + m, c.boite[3] + m];
    for (const x of this.ord.morceaux) if (!x.erreur && x.etat !== 'detail' && croise(x.boite, zone)) return false;
    return true;
  }

  // Les cibles de la cuisson, créées à la première cellule et gardées (une cellule cuit en 3 à 8 ms).
  _cibles() {
    const K = this.cuit;
    if (K.cibles) return K.cibles;
    const M = CUIT.marge, n = Math.round((K.C.taille + 2 * M) * K.tpm), nt = K.S + 2 * CUIT.bordure;
    const cible = (w, h, t) => new THREE.WebGLRenderTarget(w, h, { type: t, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, generateMipmaps: false });
    const hauteur = new THREE.ShaderMaterial({
      // (les BatchedMesh — le sol, les arbres — sont écartés de la cuisson ; le programme sait quand même les dessiner)
      vertexShader: `#include <common>
        #include <batching_pars_vertex>
        varying float vH;
        void main() {
          #include <batching_vertex>
          #include <begin_vertex>
          vec4 wp = vec4( transformed, 1.0 );
          #ifdef USE_BATCHING
            wp = batchingMatrix * wp;
          #endif
          #ifdef USE_INSTANCING
            wp = instanceMatrix * wp;
          #endif
          vH = ( modelMatrix * wp ).y;
          #include <project_vertex>
        }`,
      fragmentShader: 'varying float vH; void main() { gl_FragColor = vec4( vH, 0.0, 0.0, 1.0 ); }',
      side: THREE.DoubleSide,
    });
    const H = dataTextureHauteurs(), cH = H && H.userData.cadre;
    if (!cH) return null;
    const uSolH = new THREE.Vector4(cH.x0 - cH.pas / 2, cH.z0 - cH.pas / 2, 1 / (cH.pas * cH.nx), 1 / (cH.pas * cH.nz));
    const vs = 'void main() { gl_Position = vec4( position.xy, 0.0, 1.0 ); }';
    const calcul = new THREE.ShaderMaterial({
      uniforms: { tHaut: { value: null }, tBas: { value: null }, tCiel: { value: null }, tSol: { value: H }, uSolH: { value: uSolH },
        uRegion: { value: new THREE.Vector4() }, uCible: { value: new THREE.Vector4() }, uTailleCible: { value: new THREE.Vector2(nt, nt) },
        uR: { value: CUIT.rayon }, uPied: { value: CUIT.pied }, uCanopee: { value: CUIT.canopee } },
      vertexShader: vs,
      fragmentShader: `uniform sampler2D tHaut, tBas, tCiel, tSol; uniform vec4 uSolH, uRegion, uCible; uniform vec2 uTailleCible;
        uniform float uR, uPied, uCanopee;
        float sol( vec2 p ) { return texture2D( tSol, ( p - uSolH.xy ) * uSolH.zw ).r; }
        vec2 uvR( vec2 p ) { return ( p - uRegion.xy ) / uRegion.zw; }
        // la hauteur de l'obstacle en p : ce qui part du sol (vu d'en bas, son point le plus bas touche le sol), sinon le sol
        float h( vec2 p ) {
          vec2 t = uvR( p ); float g = sol( p );
          float bas = texture2D( tBas, t ).r, haut = texture2D( tHaut, vec2( t.x, 1.0 - t.y ) ).r;
          return bas - g < uPied ? max( haut, g ) : g;
        }
        float ciel( vec2 p ) { vec2 t = uvR( p ); return texture2D( tCiel, vec2( t.x, 1.0 - t.y ) ).r; }
        float bruit( vec2 c ) { return fract( 52.9829189 * fract( dot( c, vec2( 0.06711056, 0.00583715 ) ) ) ); }
        void main() {
          vec2 p = uCible.xy + gl_FragCoord.xy / uTailleCible * uCible.zw;
          float h0 = sol( p ) + 0.02, masque = 0.0, rot = bruit( gl_FragCoord.xy ) * 0.3926991, dec = bruit( gl_FragCoord.yx + 7.0 );
          float T = 2.0 * ciel( p );
          for ( int d = 0; d < 16; d ++ ) {
            float a = ( float( d ) + 0.5 ) * 0.3926991 + rot;
            vec2 dir = vec2( cos( a ), sin( a ) );
            T += ciel( p + dir * 1.3 ) + ciel( p + dir * 3.0 ) + ciel( p + dir * ${CUIT.anneau.toFixed(1)} );
            float pente = 0.0;
            for ( int s = 0; s < ${CUIT.pas}; s ++ ) {
              float t = uR * pow( ( float( s ) + dec ) / ${CUIT.pas}.0, 1.6 ) + 0.05;
              pente = max( pente, ( h( p + dir * t ) - h0 ) / t );
            }
            masque += pente * pente / ( 1.0 + pente * pente );          // sin² de l'élévation de l'horizon
          }
          T /= 50.0;                                                   // transmittance moyenne de la canopée (disque de 5 m)
          float vis = ( 1.0 - masque / 16.0 ) * mix( 1.0, 0.3 + 0.7 * T, uCanopee );
          gl_FragColor = vec4( vis, 1.0, T, 1.0 );
        }`,
      depthTest: false, depthWrite: false,
    });
    const flou = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uPas: { value: new THREE.Vector2(1 / nt, 1 / nt) }, uOrigine: { value: new THREE.Vector2() } },
      vertexShader: vs,
      fragmentShader: `uniform sampler2D tSrc; uniform vec2 uPas, uOrigine;
        void main() {
          vec2 uv = ( gl_FragCoord.xy - uOrigine + ${CUIT.bordure.toFixed(1)} ) * uPas;
          vec3 s = vec3( 0.0 ); float n = 0.0;
          for ( int y = -2; y <= 2; y ++ ) for ( int x = -2; x <= 2; x ++ ) {
            float w = 1.0 / ( 1.0 + float( x * x + y * y ) );
            s += texture2D( tSrc, uv + vec2( float( x ), float( y ) ) * uPas * 1.5 ).rgb * w; n += w;
          }
          gl_FragColor = vec4( s / n, 1.0 );
        }`,
      depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), calcul);
    quad.frustumCulled = false;
    const sceneQuad = new THREE.Scene(); sceneQuad.add(quad);
    const camHaut = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400), camBas = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    // (vue d'en haut : l'image a +x = x, +v = -z ; vue d'en bas : +x = x, +v = +z — voir cuireOcclusionSol)
    const voile = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthTest: false,
      depthWrite: false, fog: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor });
    K.cibles = {
      n, nt, haut: cible(n, n, THREE.HalfFloatType), bas: cible(n, n, THREE.HalfFloatType),
      ciel: cible(Math.max(16, n >> 2), Math.max(16, n >> 2), THREE.HalfFloatType),
      brute: new THREE.WebGLRenderTarget(nt, nt, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }),
      hauteur, calcul, flou, quad, sceneQuad, camHaut, camBas, voile, voiles: new Map(),
    };
    return K.cibles;
  }

  // Une cellule se cuit en TROIS images (2 à 3 ms chacune, mesurées sur la Radeon intégrée ; d'un coup, 6 à 7 ms) :
  //  1. et 2. les hauteurs, vues d'en haut puis d'en bas : le décor fixe et opaque (pas ce qui bouge, ni le transparent,
  //     ni le feuillage découpé, ni le ciel et le sol de 500 m) et les troncs des substituts ; vu d'en bas, sans ce qui
  //     est plat au ras du sol (allées, bordures) ;
  //  3. la canopée (le feuillage seul, vu du ciel, en voile : chaque couche laisse passer une part du ciel ; plus les
  //     couronnes des substituts, les arbres du parc étant des BatchedMesh que ce parcours ne voit pas), puis le calcul
  //     de l'horizon et le flou, dans la case de l'atlas.
  // Chaque étape remet la scène exactement comme elle l'a trouvée.
  cuireCellule(c) {
    this._chantierCuit = { c, etape: 1 };
    for (let k = 0; k < 3 && this._chantierCuit; k++) this._etapeCuisson();
  }

  _etapeCuisson() {
    const ch = this._chantierCuit, c = ch.c, r = this.r, sc = this.scene, K = this.cuit, X = this._cibles();
    if (!X) { c.cuite = true; this._chantierCuit = null; return; }
    const t0 = performance.now();
    const M = CUIT.marge, dx = this.dx;
    const x0 = c.boite[0] + dx - M, z0 = c.boite[1] - M, x1 = c.boite[2] + dx + M, z1 = c.boite[3] + M, cxr = (x0 + x1) / 2, czr = (z0 + z1) / 2;
    const W = x1 - x0, L = z1 - z0;
    const fond = sc.background, surcharge = sc.overrideMaterial, brouillard = sc.fog;
    const couleur = r.getClearColor(new THREE.Color()), alpha = r.getClearAlpha(), auto = r.shadowMap.autoUpdate, cible0 = r.getRenderTarget();
    sc.background = null; sc.fog = null; r.shadowMap.autoUpdate = false;
    const cache = new Map(), etat = new Map();
    // (lot R1 : tout morceau construit y entre, même hors de sa distance d'affichage ; remis comme avant à la fin)
    const remettre = this.ord && this.ord.toutMontrer ? this.ord.toutMontrer() : null;
    try {
      if (ch.etape === 1) {
        for (const cam of [X.camHaut, X.camBas]) { cam.left = -W / 2; cam.right = W / 2; cam.top = L / 2; cam.bottom = -L / 2; cam.updateProjectionMatrix(); }
        X.camHaut.position.set(cxr, 200, czr); X.camHaut.up.set(0, 0, -1); X.camHaut.lookAt(cxr, 0, czr); X.camHaut.updateMatrixWorld();
        X.camBas.position.set(cxr, -200, czr); X.camBas.up.set(0, 0, 1); X.camBas.lookAt(cxr, 0, czr); X.camBas.updateMatrixWorld();
      }
      if (ch.etape === 1 || ch.etape === 2) {
        const plats = [], zone = new THREE.Box3(new THREE.Vector3(x0, -50, z0), new THREE.Vector3(x1, 100, z1));
        sc.traverse((o) => {
          cache.set(o, o.visible);
          if (o === this.subs.groupe || o.parent === this.subs.groupe) return;
          if (o.isSprite || o.isPoints || o.isLine || o.userData.dynamique || o.userData.ciel) { o.visible = false; return; }
          if (!o.isMesh) return;
          const m = Array.isArray(o.material) ? o.material[0] : o.material;
          if (o.isSkinnedMesh || o.isBatchedMesh || !m || m.transparent || m.alphaTest > 0 || m.fog === false) { o.visible = false; return; }
          if (o.geometry.boundingSphere === null) o.geometry.computeBoundingSphere();
          _s.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
          if (_s.radius > 60) { o.visible = false; return; }
          if (!_s.intersectsBox(zone)) return;                     // (hors champ : la caméra l'écarte elle-même)
          if (ch.etape === 2 && !o.isInstancedMesh && _b.setFromObject(o).max.y - _b.min.y < 0.25) o.visible = false;
        });
        this.subs.groupe.visible = true; this.subs.couronnes.visible = false;
        sc.overrideMaterial = X.hauteur;
        // (fonds à 0 et 1, comme cuireOcclusionSol : là où rien n'est dessiné, h() rend le sol, quelle que soit sa
        // hauteur — « touche le sol » demande bas - sol < 0,35, donc un sol au-dessus de 0,65 m, où max(0, sol) est le sol)
        if (ch.etape === 1) { r.setRenderTarget(X.haut); r.setClearColor(0x000000, 1); r.clear(); r.render(sc, X.camHaut); }
        else { r.setRenderTarget(X.bas); r.setClearColor(0xffffff, 1); r.clear(); r.render(sc, X.camBas); }
        ch.ms = (ch.ms || 0) + performance.now() - t0; ch.etape++;
        return;
      }
      // 3. la canopée
      const voile = (m) => {
        if (!X.voiles.has(m)) X.voiles.set(m, new THREE.MeshBasicMaterial({ map: m.map, alphaTest: (m.alphaTest || 0.4) * 0.6,
          color: 0x000000, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthTest: false, depthWrite: false, fog: false,
          blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor }));
        return X.voiles.get(m);
      };
      sc.traverse((o) => {
        cache.set(o, o.visible);
        if (!o.isMesh || o.parent === this.subs.groupe) return;
        etat.set(o, o.material);
        const m = o.material;
        const f = o.visible && !o.userData.dynamique && !o.userData.ombreToujours && !o.isBatchedMesh && !o.isSkinnedMesh
          && !!(m && !Array.isArray(m) && m.map && m.alphaTest >= 0.3);
        if (f) o.material = voile(m); else o.visible = false;
      });
      // (les ancêtres dynamiques cachent leurs feuillages : on les laisse cachés)
      for (const o of sc.children) if (o.userData.dynamique || o.userData.ciel) o.visible = false;
      this.subs.groupe.visible = true; this.subs.troncs.visible = false; this.subs.couronnes.visible = true;
      const matC = this.subs.couronnes.material; this.subs.couronnes.material = X.voile;
      r.setRenderTarget(X.ciel); r.setClearColor(0xffffff, 1); r.clear(); r.render(sc, X.camHaut);
      this.subs.couronnes.material = matC; this.subs.troncs.visible = true;
      // le calcul (la cellule et une bordure de quelques texels, pour le flou), puis le flou, dans la case de l'atlas
      const tx = 1 / K.tpm, B = CUIT.bordure;
      const U = X.calcul.uniforms;
      U.tHaut.value = X.haut.texture; U.tBas.value = X.bas.texture; U.tCiel.value = X.ciel.texture;
      U.uRegion.value.set(x0, z0, W, L);
      U.uCible.value.set(c.boite[0] + dx - B * tx, c.boite[1] - B * tx, X.nt * tx, X.nt * tx);
      X.quad.material = X.calcul;
      r.setRenderTarget(X.brute); r.render(X.sceneQuad, X.camHaut);
      const A = K.atlas;
      if (!K.pret) { r.setRenderTarget(A); r.setClearColor(0xffffff, 0); r.clear(); K.pret = true; }
      const col = c.i - K.C.i[0], row = c.k - K.C.k[0];
      X.flou.uniforms.tSrc.value = X.brute.texture; X.flou.uniforms.uOrigine.value.set(col * K.S, row * K.S);
      A.viewport.set(col * K.S, row * K.S, K.S, K.S); A.scissor.set(col * K.S, row * K.S, K.S, K.S); A.scissorTest = true;
      X.quad.material = X.flou;
      const ac = r.autoClear; r.autoClear = false;
      r.setRenderTarget(A); r.render(X.sceneQuad, X.camHaut);
      r.autoClear = ac;
      A.viewport.set(0, 0, A.width, A.height); A.scissor.set(0, 0, A.width, A.height); A.scissorTest = false;
      c.cuite = true; this._chantierCuit = null;
      const ms = ch.ms + performance.now() - t0;
      this.stats.cellules.cuites++; this.stats.cellules.ms = +ms.toFixed(1); this.stats.cellules.derniere = `${c.i},${c.k}`;
    } catch (e) {
      // (une cellule qui ne cuit pas reste sans occlusion : on ne la retente pas à chaque image)
      console.warn(`[ombres] cellule ${c.i},${c.k} non cuite :`, e);
      c.cuite = true; this._chantierCuit = null;
    } finally {
      for (const [o, m] of etat) o.material = m;
      for (const [o, v] of cache) o.visible = v;
      if (remettre) remettre();
      this.subs.groupe.visible = false;
      sc.background = fond; sc.overrideMaterial = surcharge; sc.fog = brouillard; r.shadowMap.autoUpdate = auto;
      r.setRenderTarget(cible0); r.setClearColor(couleur, alpha);
    }
  }

  // ------------------------------------------------------------------ outils (console, ?debug=1)
  // 'proche' : la carte qui suit seule ; 'loin' : la carte lointaine seule ; 'tout' (ou rien) : les deux
  voir(mode = 'tout') { OM.suivie[3] = mode === 'proche' ? 1 : mode === 'loin' ? 2 : 0; return mode; }
  // la force de l'occlusion cuite du sol (0 : sans ; par défaut CUIT.intensite)
  force(k = CUIT.intensite) { if (this._uCuit) this._uCuit.uOmCuitForce.value = k; return k; }
  cuireCellules() { for (const c of this.cuit.cellules) c.cuite = false; this.cuit.pret = false; return 'les cellules seront recuites en jouant'; }
  // tout de suite, toutes les cellules prêtes à portée de détail (captures des bancs d'essai, dont l'horloge est figée)
  cuireTout(camera) {
    const Rg = this.reglages ? this.reglages(this.scene, this.mobile) : { detail: 70 };
    const ox = camera.position.x - this.dx, oz = camera.position.z;
    let n = 0;
    for (const c of this.cuit.cellules) {
      const b = c.boite, ex = ox < b[0] ? b[0] - ox : ox > b[2] ? ox - b[2] : 0, ez = oz < b[1] ? b[1] - oz : oz > b[3] ? oz - b[3] : 0;
      if (!c.cuite && Math.hypot(ex, ez) <= Rg.detail && this._pretePourCuire(c)) { this.cuireCellule(c); n++; }
    }
    return n;
  }
}
