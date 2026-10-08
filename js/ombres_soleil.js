import * as THREE from 'three';

// =====================================================================
//  OMBRES DOUCES DU SOLEIL (PCSS : « percentage-closer soft shadows »)
// =====================================================================
// Une ombre de soleil n'a pas un bord uniforme : le soleil est un disque (0,53°), si bien que la pénombre grandit
// avec la distance entre ce qui masque et ce qui reçoit. Le pied d'un joueur fait une ombre nette, la cime d'un
// platane à huit mètres une ombre floue de plusieurs centimètres, un immeuble de 25 m une ombre au bord doux sur
// vingt centimètres. Un filtrage de rayon fixe (PCF) donne partout le même bord : c'est ce qui fait « jeu vidéo ».
//
// On remplace QUE la branche PCFSoftShadowMap de three (préréglages high, ultra, extrême) ; basse et moyenne
// (PCFShadowMap) gardent le code de three à l'octet près. Dans cette branche, `shadowRadius` change de sens : c'est
// K = texels de pénombre par unité de profondeur normalisée, recalculé à chaque image par js/fx.js (render).
// Deux passes sur un disque de Vogel tourné au hasard d'un pixel à l'autre : la recherche des BLOQUEURS (leur
// profondeur moyenne donne la pénombre), puis le filtrage lui-même. Un biais de pente, et un fondu de 2 % au bord de
// la carte d'ombre (plus de coupure nette là où elle s'arrête).
// DOIT être importé avant toute compilation de matériau : c'est la première ligne de js/fx.js.
//
// LES OMBRES DOUCES ALLÉGÉES (07/10/2026). Mesuré sur la Radeon intégrée (660M), La Cage en 3 contre 3 : la moyenne
// atteinte par la baisse automatique garde ce PCF doux (le type ne change pas en cours de partie, js/fx.js setQuality) et
// le payait 2,7 ms de plus que le PCF de three, pas « autant » comme on le croyait — à 2048, 1 + 8 + 12 lectures sur
// chaque pixel à l'ombre, feuilles et haies comprises. Trois économies, là où elles ne se voient pas :
//  - les matériaux À DÉCOUPE (feuilles, haies, lierre, grillages : USE_ALPHATEST) : 1 + 4 bloqueurs + 6 lectures de
//    filtre — sur un feuillage la pénombre se perd dans la découpe elle-même ;
//  - AU-DELÀ DE 28 m de la caméra : un filtre fixe de 4 lectures, sans recherche de bloqueurs — à cette distance une
//    pénombre de quelques centimètres fait moins d'un pixel ;
//  - une carte de 2048 (moyenne) : 6 bloqueurs et 8 lectures de filtre ; 8 / 12 en 3072, 12 / 20 en 4096 comme avant.
// Le PCF de three (basse, moyenne du téléphone) n'est pas touché.
const PCSS = `
#if NUM_DIR_LIGHT_SHADOWS > 0
float ombreIGN( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
float ombreZ( sampler2D carte, vec2 uv ) { return unpackRGBAToDepth( textureLod( carte, uv, 0.0 ) ); }
float ombreDist = 0.0;      // distance à la caméra du point éclairé, posée en tête de lights_fragment_begin (voir plus bas)
// (07/10/2026) Les rayons du disque de Vogel, sqrt((i + 0,5) / n), PRÉCALCULÉS, et des boucles à nombre de tours CONSTANT
// (une par taille de carte) : la boucle d'avant, bornée à 12 ou 20 avec un « break » selon la carte, n'était pas déroulée
// par le compilateur de Direct3D — chaque lecture attendait la précédente. Déroulées, les lectures partent ensemble.
// Mêmes rayons, même rotation : la même image.
const float OV4[4] = float[4]( 0.35355, 0.61237, 0.79057, 0.93541 );
const float OV6[6] = float[6]( 0.28868, 0.5, 0.6455, 0.76376, 0.86603, 0.95743 );
const float OV8[8] = float[8]( 0.25, 0.43301, 0.55902, 0.66144, 0.75, 0.82916, 0.90139, 0.96825 );
const float OV12[12] = float[12]( 0.20412, 0.35355, 0.45644, 0.54006, 0.61237, 0.677, 0.73598, 0.79057, 0.84163, 0.88976, 0.93541, 0.97895 );
const float OV20[20] = float[20]( 0.15811, 0.27386, 0.35355, 0.41833, 0.47434, 0.5244, 0.57009, 0.61237, 0.65192, 0.6892, 0.72457, 0.75829, 0.79057, 0.82158, 0.85147, 0.88034, 0.9083, 0.93541, 0.96177, 0.98742 );
#define OMBRE_BLOQ( N, T ) for ( int i = 0; i < N; i ++ ) { float r = T[ i ] * rS; float zb = ombreZ( carte, coord.xy + d * ( r * texel ) ); if ( zb < coord.z - kP * r ) { somme += zb; n += 1.0; } d = OR * d; }
#define OMBRE_FILTRE( N, T ) for ( int i = 0; i < N; i ++ ) { float r = T[ i ] * rP; lu += step( coord.z - kP * r, ombreZ( carte, coord.xy + d * ( r * texel ) ) ); d = OR * d; } lu /= float( N );
float ombreSoleil( sampler2D carte, vec2 taille, float intensite, float biais, float K, vec4 coord, float nl ) {
#if defined( SHADOWMAP_TYPE_PCF_SOFT )
  coord.xyz /= coord.w; coord.z += biais;
  vec2 b2 = min( coord.xy, 1.0 - coord.xy ); float bordMin = min( b2.x, b2.y );
  if ( bordMin < 0.0 || coord.z > 1.0 ) return 1.0;
  float bord = smoothstep( 0.0, 0.02, bordMin );
  vec2 texel = 1.0 / taille;
  float nlc = clamp( nl, 0.08, 1.0 );
  float kP = min( 10.0, sqrt( 1.0 - nlc * nlc ) / nlc ) * 0.5 / taille.x;
  float a = 6.2831853 * ombreIGN( gl_FragCoord.xy );
  vec2 d0 = vec2( cos( a ), sin( a ) );
  if ( ombreDist > 28.0 ) {
    // loin : quatre lectures en croix tournée, à 1,25 texel, sans recherche de bloqueurs
    vec2 d1 = d0 * ( 1.25 * texel.x ), d2 = vec2( - d1.y, d1.x );
    float zr = coord.z - kP * 1.25;
    float l4 = step( zr, ombreZ( carte, coord.xy + d1 ) ) + step( zr, ombreZ( carte, coord.xy - d1 ) )
             + step( zr, ombreZ( carte, coord.xy + d2 ) ) + step( zr, ombreZ( carte, coord.xy - d2 ) );
    return mix( 1.0, l4 * 0.25, intensite * bord );
  }
  const mat2 OR = mat2( -0.7373688, 0.6754903, -0.6754903, -0.7373688 );
  // (07/10/2026) rayon de recherche borné à 0,18 de profondeur normalisée — ~21 m d'écart entre ce qui masque et ce qui
  // reçoit, le plus grand platane de La Cage en fait 15 : chercher plus loin ne trouvait rien de plus, mais dispersait
  // les lectures sur deux fois plus de texels (le cache de texture de la puce intégrée ne suivait plus)
  float rS = clamp( K * min( coord.z, 0.18 ), 2.0, 24.0 );
  float z0 = ombreZ( carte, coord.xy ), somme = 0.0, n = 0.0;
  if ( z0 < coord.z ) { somme = z0; n = 1.0; }
  vec2 d = d0;
  // bloqueurs : 4 sur une découpe (USE_ALPHATEST), sinon 6 / 8 / 12 selon la carte (2048 / 3072 / 4096)
#ifdef USE_ALPHATEST
  OMBRE_BLOQ( 4, OV4 )
#else
  if ( taille.x > 3500.0 ) { OMBRE_BLOQ( 12, OV12 ) } else if ( taille.x > 2100.0 ) { OMBRE_BLOQ( 8, OV8 ) } else { OMBRE_BLOQ( 6, OV6 ) }
#endif
  if ( n < 0.5 ) return 1.0;
  float rP = clamp( ( coord.z - somme / n ) * K, 1.0, 24.0 );
  float lu = 0.0; d = vec2( - d0.y, d0.x );
  // filtre : 6 sur une découpe, sinon 8 / 12 / 20
#ifdef USE_ALPHATEST
  OMBRE_FILTRE( 6, OV6 )
#else
  if ( taille.x > 3500.0 ) { OMBRE_FILTRE( 20, OV20 ) } else if ( taille.x > 2100.0 ) { OMBRE_FILTRE( 12, OV12 ) } else { OMBRE_FILTRE( 8, OV8 ) }
#endif
  return mix( 1.0, lu, intensite * bord );
#else
  return getShadow( carte, taille, intensite, biais, K, coord );   // (PCF : le code de three, à l'identique)
#endif
}
#endif`;
const AVANT = 'getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] )';
const APRES = 'ombreSoleil( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ], dot( geometryNormal, directLight.direction ) )';
const C = THREE.ShaderChunk;
// (07/10/2026) La distance du point à la caméra passe par une variable globale, posée juste après geometryPosition, et non
// par un argument de plus : l'appel garde sa forme exacte, que js/monde_ombres.js enveloppe quand il est chargé après
// nous (APPEL_PCSS). Les matériaux qui lisent la carte d'ombre sans lights_fragment_begin (ShadowMaterial) n'ont pas
// vViewPosition : on ne la lit donc que là.
const POS = 'vec3 geometryPosition = - vViewPosition;';
const POS_DIST = POS + '\n#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0\nombreDist = - geometryPosition.z;\n#endif';
if (C.lights_fragment_begin.includes(AVANT) && C.lights_fragment_begin.includes(POS)) {
  // (geometryNormal et directLight.direction y sont déjà définis, en espace vue)
  C.lights_fragment_begin = C.lights_fragment_begin.replace(AVANT, APRES).replace(POS, POS_DIST);
  C.shadowmap_pars_fragment += '\n#ifdef USE_SHADOWMAP\n' + PCSS + '\n#endif\n';
} else console.warn('[ombres] lights_fragment_begin a changé (mise à jour de three ?) : ombres douces non installées');
