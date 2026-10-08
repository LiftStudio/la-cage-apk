import * as THREE from 'three';

// =====================================================================
//  OMBRES DE NUAGES QUI DÉFILENT
// =====================================================================
// Par beau temps, de grandes plaques d'ombre glissent sur tout le décor : le terrain, les joueurs, les façades,
// les arbres passent ensemble dans l'ombre d'un cumulus, puis ressortent au soleil. C'est la chose qui fait le plus
// « dehors » dans une image, et le jeu ne l'avait pas. On module la lumière DIRECTE du soleil (et elle seule : une
// zone déjà à l'ombre ne fonce pas), directement dans la boucle des lumières de three : aucun appel de dessin, aucune
// texture, aucun nouveau programme après le chargement.
// Le motif est un bruit à deux échelles (64 m et 23 m, bord flou d'une quinzaine de mètres), suivi le long du rayon
// du soleil jusqu'au sol : un mur, un joueur et le sol qu'ils dominent reçoivent le même nuage, au même endroit.
//
// NUAGES : x, y = dérive du champ (m) ; z = couverture 0..1 ; w = force (0 = éteint). Float32Array et non Vector4 :
// cloneUniforms (three r170) clone un Vector4 pour chaque matériau, mais passe un tableau typé par RÉFÉRENCE. Un seul
// réglage vaut donc pour tous les matériaux. Le départ reste POSITIF (vers 2e5) : uint() côté GPU et Math.imul côté
// processeur donnent alors le même motif pendant des heures, même quand le vent le fait reculer (à 2e5, un flottant
// 32 bits a un pas de 1,6 cm : largement assez fin pour des formes de 23 à 64 m).
// DOIT être importé avant toute compilation de matériau (deuxième ligne de js/fx.js).
export const NUAGES = new Float32Array([2e5 + Math.random() * 3000, 2e5 + Math.random() * 3000, 0, 0]);
if (typeof window !== 'undefined') window.__nuages = NUAGES;          // réglage à la main dans la console

const DECL = `
#if NUM_DIR_LIGHTS > 0
uniform vec4 uNuages;
float nuHash( ivec2 c ) {
  uint n = ( uint( c.x ) * 374761393u ) ^ ( uint( c.y ) * 668265263u );
  n = ( n ^ ( n >> 13u ) ) * 1274126177u;
  return float( n ^ ( n >> 16u ) ) * ( 1.0 / 4294967295.0 );
}
float nuBruit( vec2 p ) {
  vec2 i = floor( p ), f = fract( p );
  f = f * f * f * ( f * ( f * 6.0 - 15.0 ) + 10.0 );
  ivec2 c = ivec2( i );
  return mix( mix( nuHash( c ), nuHash( c + ivec2( 1, 0 ) ), f.x ),
              mix( nuHash( c + ivec2( 0, 1 ) ), nuHash( c + ivec2( 1, 1 ) ), f.x ), f.y );
}
// part du soleil qui passe entre les nuages (1 = ciel dégagé) ; posVue, dirVue : espace vue
float soleilNuages( vec3 posVue, vec3 dirVue ) {
  if ( uNuages.w <= 0.0 ) return 1.0;
  vec3 wp = ( posVue - viewMatrix[ 3 ].xyz ) * mat3( viewMatrix );   // retour au monde (rotation : transposée)
  vec3 L = dirVue * mat3( viewMatrix );                               // vers le soleil, en monde
  vec2 p = wp.xz - wp.y * L.xz / max( L.y, 0.12 ) + uNuages.xy;     // suivi le long du rayon jusqu'au sol
  float n = 0.62 * nuBruit( p * ( 1.0 / 64.0 ) ) + 0.38 * nuBruit( p * ( 1.0 / 23.0 ) + 17.0 );
  return 1.0 - uNuages.w * smoothstep( 0.87 - uNuages.z, 1.13 - uNuages.z, n );
}
#endif
`;
const C = THREE.ShaderChunk, A = 'getDirectionalLightInfo( directionalLight, directLight );';
if (C.lights_fragment_begin.includes(A)) {
  C.lights_pars_begin += DECL;
  // le soleil est toujours directionalLights[0] : three range en tête les lumières qui portent une ombre
  C.lights_fragment_begin = C.lights_fragment_begin.replace(A, `${A}
#if ( UNROLLED_LOOP_INDEX == 0 )
directLight.color *= soleilNuages( geometryPosition, directLight.direction );
#endif`);
  for (const k of ['standard', 'physical', 'lambert', 'phong', 'toon']) THREE.ShaderLib[k].uniforms.uNuages = { value: NUAGES };
} else console.warn('[nuages] chunk three inattendu : ombres de nuages coupées');

// LE MÊME BRUIT CÔTÉ PROCESSEUR : Math.imul reproduit la multiplication uint 32 bits du GLSL, bit pour bit. Sert à
// savoir si l'œil est sous un nuage (l'éblouissement et la brume chaude du contre-jour s'éteignent alors aussi).
const hache = (x, y) => {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
function bruit(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy;
  fx = fx * fx * fx * (fx * (fx * 6 - 15) + 10); fy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hache(ix, iy), h = a + (hache(ix + 1, iy) - a) * fx, c = hache(ix, iy + 1), l = c + (hache(ix + 1, iy + 1) - c) * fx;
  return h + (l - h) * fy;
}
export function soleilNuagesEn(x, y, z, L) {
  if (NUAGES[3] <= 0) return 1;
  const ly = Math.max(L.y, 0.12), px = x - y * L.x / ly + NUAGES[0], pz = z - y * L.z / ly + NUAGES[1];
  const n = 0.62 * bruit(px / 64, pz / 64) + 0.38 * bruit(px / 23 + 17, pz / 23 + 17);
  const t = Math.min(1, Math.max(0, (n - 0.87 + NUAGES[2]) / 0.26));
  return 1 - NUAGES[3] * t * t * (3 - 2 * t);
}
