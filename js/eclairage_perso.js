import * as THREE from 'three';
import { TELEPHONE } from './appareil.js';

// =====================================================================
//  L'ÉCLAIRAGE DES JOUEURS ET DU BALLON
// =====================================================================
// Trois choses qui détachent un personnage de son décor et le font exister dans la lumière du lieu :
//  1. LA DÉCOUPE : un liseré de lumière sur les bords de la silhouette. Doré à contre-jour, là où le soleil
//     touche vraiment (il s'éteint dans l'ombre d'un arbre ou sous un nuage : on lit la visibilité du soleil dans
//     la boucle des lumières), froid et discret partout ailleurs (la voûte du ciel, rasante).
//  2. L'OCCLUSION DU CORPS : des sphères posées sur le squelette (crâne, poitrine, bassin, cuisses, bras,
//     tibias, ballon tenu) retiennent la lumière du ciel sous le menton, aux aisselles, à l'entrejambe. Sans elle,
//     l'intérieur des cuisses était aussi éclairé que le devant du maillot.
//  3. LA PEAU : la lumière entre dans la peau et ressort au-delà du terminateur, le rouge le plus loin (« wrap »
//     par canal, normalisé : éclairée de face, la peau reçoit exactement ce qu'elle recevait), et l'ombre de la
//     peau est un peu chaude.
// Tout passe par onBeforeCompile, CHAÎNÉ avec celui des tenues (js/fit.js). Le bloc des lumières est construit À
// LA COMPILATION, pour reprendre la version que les ombres douces et les nuages ont déjà modifiée.

// Réglages communs à tous les personnages et au ballon, reposés par js/weather.js et js/fx.js
export const ECLAIRAGE = {
  uRimSoleil: { value: 0.9 },
  uRimCiel:   { value: new THREE.Color(0, 0, 0) },
  uAOForce:   { value: 0.85 },
  uPeauWrap:  { value: new THREE.Vector3(0.28, 0.11, 0.06) },
  uPeauOmbre: { value: new THREE.Vector3(1.06, 0.98, 0.95) },
};
// (la détection du téléphone vient de js/appareil.js, la même pour tout le jeu)
export const NB_SPH = TELEPHONE ? 9 : 14;

// Le bloc des lumières, avec deux prises. WebGLLights place en tête les lumières qui projettent une ombre :
// directionalLights[0] = le soleil, [1] = le remplissage (js/court.js).
//  - lumière 0 : sa VISIBILITÉ (ce que l'ombre et le nuage lui laissent), pour la découpe ;
//  - lumière 1 : le remplissage, sans ombre, est retenu par l'occlusion du corps.
function blocLumieres() {
  let ch = THREE.ShaderChunk.lights_fragment_begin;
  const k = ch.indexOf('vDirectionalShadowCoord[ i ]'), e = k < 0 ? -1 : ch.indexOf('#endif', k);
  if (e < 0) { console.warn('[eclairage] lights_fragment_begin a changé : découpe sans masque'); return 'float cageVisSoleil = 1.0;\n' + ch; }
  ch = ch.slice(0, e + 6) + `
  #if ( UNROLLED_LOOP_INDEX == 0 )
  cageVisSoleil = dot( directLight.color, vec3( 1.0 ) ) / max( dot( directionalLight.color, vec3( 1.0 ) ), 1e-4 );
  #endif` + ch.slice(e + 6);
  ch = ch.replace('getDirectionalLightInfo( directionalLight, directLight );', `getDirectionalLightInfo( directionalLight, directLight );
  #if ( UNROLLED_LOOP_INDEX == 1 )
  directLight.color *= cageAO;
  #endif`);
  return 'float cageVisSoleil = 1.0;\n' + ch;
}

// le diffus « peau » (le texte remplacé est unique dans ce chunk de three r170)
const PHYS = THREE.ShaderChunk.lights_physical_pars_fragment
  .replace('vec3 irradiance = dotNL * directLight.color;', `vec3 irradiance = dotNL * directLight.color;
  #ifdef CAGE_PEAU
    vec3 irrPeau = saturate( ( dot( geometryNormal, directLight.direction ) + uPeauWrap ) / ( 1.0 + uPeauWrap ) ) * directLight.color;
  #endif`)
  .replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );', `#ifdef CAGE_PEAU
    reflectedLight.directDiffuse += irrPeau * BRDF_Lambert( material.diffuseColor );
  #else
    reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
  #endif`);
if (!PHYS.includes('irrPeau')) console.warn('[eclairage] lights_physical_pars_fragment a changé : peau sans diffusion');

const TETE = `
varying vec3 vCageMonde;
uniform float uRimSoleil;
uniform vec3 uRimCiel;
#ifndef CAGE_TEINTE
#define CAGE_TEINTE 0.4
#endif
#ifdef CAGE_PEAU
uniform vec3 uPeauWrap;
uniform vec3 uPeauOmbre;
#endif
#ifdef CAGE_AO
uniform vec4 uCageSph[ CAGE_NB ];
uniform float uAOForce;
// occlusion d'une sphère vue du point (p, n) : r²/l² × cos, avec un horizon adouci ; nulle quand la sphère passe sous
// le plan tangent, donc nulle pour un point posé SUR elle (pas d'auto-occlusion)
float cageOcclusion( vec3 p, vec3 n ) {
  float vis = 1.0;
  for ( int i = 0; i < CAGE_NB; i ++ ) {
    vec4 s = uCageSph[ i ];
    vec3 d = s.xyz - p;
    float l2 = max( dot( d, d ), 1e-6 ), l = sqrt( l2 ), r2 = s.w * s.w;
    float c = clamp( ( dot( n, d ) + s.w ) / ( l + s.w ), 0.0, 1.0 );
    vis *= 1.0 - c * r2 / max( l2, r2 );
  }
  return mix( 1.0, vis, uAOForce );
}
#endif`;
const AO = `
float cageAO = 1.0;
#ifdef CAGE_AO
  cageAO = cageOcclusion( vCageMonde, inverseTransformDirection( nonPerturbedNormal, viewMatrix ) );
#endif`;
// LA DÉCOUPE, sur la normale GÉOMÉTRIQUE (la carte de normales ferait scintiller les pores).
const FIN = `
#ifdef CAGE_AO
  reflectedLight.indirectDiffuse *= cageAO;
  reflectedLight.indirectSpecular *= computeSpecularOcclusion( saturate( dot( geometryNormal, geometryViewDir ) ), cageAO, material.roughness );
#endif
#ifdef CAGE_PEAU
  reflectedLight.indirectDiffuse *= uPeauOmbre;
#endif
{
  float nv = saturate( dot( nonPerturbedNormal, geometryViewDir ) );
  float bord = pow( 1.0 - nv, 3.0 );
  vec3 teinte = mix( vec3( 1.0 ), diffuseColor.rgb / max( max3( diffuseColor.rgb ), 0.05 ), CAGE_TEINTE );
  vec3 rim = vec3( 0.0 );
  #if NUM_DIR_LIGHTS > 0
    vec3 Ls = directionalLights[ 0 ].direction;
    float dos = saturate( dot( - geometryViewDir, Ls ) );
    float face = saturate( dot( nonPerturbedNormal, Ls ) + 0.4 );
    rim += directionalLights[ 0 ].color * ( uRimSoleil * cageVisSoleil * dos * dos * face );
  #endif
  #if NUM_HEMI_LIGHTS > 0
    float haut = 0.5 + 0.5 * dot( nonPerturbedNormal, hemisphereLights[ 0 ].direction );
    // La découpe du CIEL suit l'albédo : la teinte ci-dessus est normalisée (blanche pour un tissu noir), et un
    // t-shirt ou un jean noir se retrouvait cerné d'un liseré gris clair, un « autocollant » (41 au bord pour 12 au
    // milieu du dos). Un tissu sombre n'en garde que la moitié, qui suffit à le détacher du fond ; dès 0,33
    // d'albédo (maillot blanc ou coloré), rien ne change. La PEAU garde toute la sienne, même foncée : sur la photo
    // 20260926_185558, les bras et les jambes du joueur noir prennent un reflet de ciel au bord, que le débardeur
    // noir n'a pas. Celle du soleil, dorée à contre-jour, reste entière : elle se voit sur les vêtements noirs des
    // photos.
    #ifdef CAGE_PEAU
    float albedoRim = 1.0;
    #else
    float albedoRim = mix( 1.0, min( 1.0, max3( diffuseColor.rgb ) * 3.0 ), 0.5 );
    #endif
    rim += uRimCiel * ( haut * cageAO * albedoRim );
  #endif
  reflectedLight.directSpecular += rim * teinte * ( bord * RECIPROCAL_PI );
}`;

export function eclairerMateriau(mat, { teinte = 0.4, ao = false, peau = false } = {}, U = {}) {
  if (!mat || !mat.isMeshStandardMaterial || mat.__cagePerso) return;
  mat.__cagePerso = true;
  // APRÈS le clone : MeshStandardMaterial.copy remet defines à { STANDARD }
  mat.defines = { ...(mat.defines || {}), CAGE_TEINTE: teinte.toFixed(2) };
  if (ao) { mat.defines.CAGE_AO = ''; mat.defines.CAGE_NB = NB_SPH; }
  if (peau) mat.defines.CAGE_PEAU = '';
  const avant = mat.onBeforeCompile, cleAvant = mat.customProgramCacheKey.call(mat);   // la tenue (js/fit.js) passe d'abord
  mat.onBeforeCompile = (sh, r) => {
    avant.call(mat, sh, r);
    Object.assign(sh.uniforms, ECLAIRAGE, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCageMonde;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvCageMonde = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>' + TETE)
      .replace('#include <lights_physical_pars_fragment>', PHYS)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + AO)
      .replace('#include <lights_fragment_begin>', blocLumieres())
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>' + FIN);
  };
  // même GLSL pour tous : les variantes passent par defines, qui font partie de la clé
  mat.customProgramCacheKey = () => cleAvant + '|cage-perso-1';
  mat.needsUpdate = true;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
export class EclairagePerso {
  constructor() {
    // w = 0 : case vide (SURTOUT pas new Vector4() : w = 1, une sphère d'un mètre à l'origine)
    this.U = { uCageSph: { value: Array.from({ length: NB_SPH }, () => new THREE.Vector4(0, -99, 0, 0)) } };
  }
  equiper(model) {
    if (!model) return;
    model.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!m || m.__cagePerso) continue;
        const n = m.name || '', peau = /body|peau/i.test(n);
        if (peau) m.roughness = 0.88;
        eclairerMateriau(m, { ao: true, peau, teinte: peau ? 0.25 : /hair/i.test(n) ? 0.5 : 0.6 }, this.U);
      }
    });
  }
  // appelé à la fin de presenter() (js/player.js) : les os viennent d'être mis à jour
  maj(p) {
    const B = p.avatar && p.avatar.bones, s = this.U.uCageSph.value;
    if (!B || !B.Head) return;
    const k = p.h / 1.8; let i = 0;   // rayons donnés pour 1,80 m, toujours DANS le corps
    const pose = (x, y, z, r) => { if (i < s.length) s[i++].set(x, y, z, r); };
    const vide = () => pose(0, -99, 0, 0);
    const os = (n, r) => { const b = B[n]; if (!b) return vide(); _a.setFromMatrixPosition(b.matrixWorld); pose(_a.x, _a.y, _a.z, r * k); };
    const mil = (n1, n2, r) => {
      const b1 = B[n1], b2 = B[n2]; if (!b1 || !b2) return vide();
      _a.setFromMatrixPosition(b1.matrixWorld); _b.setFromMatrixPosition(b2.matrixWorld);
      pose((_a.x + _b.x) / 2, (_a.y + _b.y) / 2, (_a.z + _b.z) / 2, r * k);
    };
    // os Head Mixamo : +Y remonte le crâne, +Z regarde devant
    const H = B.Head.matrixWorld, hx = H.elements[12], hy = H.elements[13], hz = H.elements[14];
    _y.setFromMatrixColumn(H, 1).normalize(); _z.setFromMatrixColumn(H, 2).normalize();
    // L'ORDRE est la priorité : sur téléphone, le shader ne lit que les neuf premières
    pose(hx + _y.x * 0.09 * k, hy + _y.y * 0.09 * k, hz + _y.z * 0.09 * k, 0.085 * k);   // crâne
    mil('Spine2', 'Neck', 0.12);                                                  // poitrine
    os('Hips', 0.11);                                                             // bassin
    mil('LeftUpLeg', 'LeftLeg', 0.07); mil('RightUpLeg', 'RightLeg', 0.07);       // cuisses : l'entrejambe
    mil('LeftArm', 'LeftForeArm', 0.045); mil('RightArm', 'RightForeArm', 0.045); // bras : les aisselles
    mil('LeftLeg', 'LeftFoot', 0.05); mil('RightLeg', 'RightFoot', 0.05);         // tibias
    pose(hx + (_z.x * 0.06 + _y.x * 0.01) * k, hy + (_z.y * 0.06 + _y.y * 0.01) * k, hz + (_z.z * 0.06 + _y.z * 0.01) * k, 0.05 * k);   // mâchoire
    os('Spine', 0.105);                                                           // ventre
    mil('LeftForeArm', 'LeftHand', 0.038); mil('RightForeArm', 'RightHand', 0.038);
    const bal = p.scene && p.scene.userData.ball;                                 // le ballon tenu contre la hanche
    if (bal && bal.mesh.position.distanceToSquared(p.mesh.position) < 2.25) { const q = bal.mesh.position; pose(q.x, q.y, q.z, 0.12); } else vide();
    while (i < s.length) vide();
  }
}
