// =====================================================================
//  LES OPTIONS DE RENDU DU LOT L12 (01/10/2026) — chacune mesurée, désactivable, et affichée dans Options.
//
//  Le lot L12 du plan graphique regroupe ce qui coûte trop cher pour être donné à tout le monde, ou qui demandait
//  une décision. Cinq options, cinq cases dans Options > Graphismes (settings.graphics) :
//    - `msaa` : MSAA x4 sur la cible de SCÈNE du composer (le SMAA reste). Machine COSTAUDE seulement (carte
//      dédiée : la RTX 3050 de Haythem, js/fx.js sonderMateriel) ; jamais sur la Radeon intégrée ni au téléphone ;
//    - `aoFeuillage` : l'occlusion ambiante (GTAO) sur le feuillage, RESTREINTE au massif d'arbustes du talus du pin
//      (une liste explicite, scene.userData.feuillageAO, tenue par js/court_parc.js — jamais toute la liste des
//      découpes de js/fx.js, qui noircissait les grillages). Machine costaude seulement, là où l'occlusion tourne ;
//    - `decor` : le décor détaillé — les vrais platanes à branches en tubes (js/platanes_detailles.js) pour les deux
//      arbres de l'enceinte de La Cage et les deux du terrain de Jemmapes, et l'horizon de Levallois fermé
//      (js/horizon_levallois.js). Pour tous, avec une version légère au téléphone ;
//    - `etalonnageBasse` : en basse, un composer minimal — la sortie (ACES et sRGB) AVEC l'étalonnage de la météo,
//      dans la même passe, puis le FXAA (ou le MSAA de la scène quand le contexte en avait). Sans elle, la basse
//      sortait sans étalonnage : ni courbe, ni virage, ni saturation de la météo du terrain ;
//    - `sonde` : partout où il n'y a pas de carte d'environnement (basse, moyenne d'un PC ordinaire, téléphone — élargi le
//      07/10/2026, il n'agissait qu'en basse et au téléphone), la lumière du ciel du terrain vient d'une SONDE (harmoniques
//      sphériques) tirée de sa carte, à la place de l'hémisphère plate (js/sonde_ciel.js).
//  Ce module tient leur état (lu dans les réglages au chargement, reposé par js/fx.js applyGraphics à chaque
//  changement dans les Options) et prévient ceux qui s'y sont abonnés (le décor, qui se montre ou se cache).
//  Il porte aussi les trois pièces de rendu de js/fx.js : la passe de scène multi-échantillonnée, les normales du
//  feuillage découpé pour l'occlusion, et la sortie étalonnée de la basse.
// =====================================================================
import * as THREE from 'three';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { settings } from './settings.js';

export const OPTIONS_RENDU = { msaa: true, aoFeuillage: true, decor: true, etalonnageBasse: true, sonde: true };
const CLES = Object.keys(OPTIONS_RENDU);
const abonnes = new Set();

// Repose les options d'après settings.graphics (une option absente d'une vieille sauvegarde vaut « oui ») et
// prévient les abonnés de ce qui a changé. Rend vrai si quelque chose a bougé.
export function poserOptions(g = {}) {
  const avant = { ...OPTIONS_RENDU };
  for (const k of CLES) OPTIONS_RENDU[k] = g[k] !== false;
  const change = CLES.some((k) => avant[k] !== OPTIONS_RENDU[k]);
  if (change) for (const f of abonnes) { try { f(OPTIONS_RENDU, avant); } catch (e) { console.error(e); } }
  return change;
}
// `f(options, avant)` à chaque changement ; rend de quoi se désabonner
export function surOptions(f) { abonnes.add(f); return () => abonnes.delete(f); }
// l'état au chargement : le décor se construit AVANT que js/fx.js n'applique les réglages
try { poserOptions(settings.graphics); } catch (e) { /* hors navigateur (outils) : tout reste à « oui » */ }

// ---------------------------------------------------------------------
//  1. LA PASSE DE SCÈNE MULTI-ÉCHANTILLONNÉE (MSAA x4)
// ---------------------------------------------------------------------
// Le composer rend la scène dans des cibles SANS multi-échantillonnage : le SMAA (une passe d'image) rattrape les
// arêtes franches, mais pas ce qui fait moins d'un pixel — les lattes des bancs à 8-20 m, les tubes des cages, les
// fils, les montants des grillages, qui grouillent en escalier (défaut 28 du plan). Ici la scène est rendue dans SA
// cible à 4 échantillons, que three résout à la fin du rendu, puis recopiée dans la cible du composer : tout le reste
// de la chaîne (occlusion, œil, bloom, sortie, SMAA, étalonnage) est inchangé.
// Pourquoi une cible à part plutôt que les deux cibles du composer en x4 : celles-là servent de ping-pong à TOUTES les
// passes ; chaque passe plein écran y paierait l'écriture de quatre échantillons et une résolution, et la mémoire
// doublerait. Une seule cible x4 : la mémoire de la scène x4 (couleur en demi-flottant et profondeur), plus une copie
// plein écran. `msaa` = nombre d'échantillons (0 : la passe d'origine, à l'identique).
const VS_QUAD = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
export class PasseSceneMSAA extends RenderPass {
  constructor(scene, camera) {
    super(scene, camera);
    this.msaa = 0; this.rt = null;
    this.copie = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } }, vertexShader: VS_QUAD,
      fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tDiffuse, vUv); }',
      depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    }));
  }
  render(renderer, writeBuffer, readBuffer, dt, mask) {
    if (!this.msaa || this.renderToScreen) return super.render(renderer, writeBuffer, readBuffer, dt, mask);
    const w = readBuffer.width, h = readBuffer.height;
    if (this.rt && this.rt.samples !== this.msaa) this.liberer();
    if (!this.rt) {
      this.rt = new THREE.WebGLRenderTarget(w, h, { type: readBuffer.texture.type, samples: this.msaa, depthBuffer: true,
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      this.rt.texture.name = 'scene MSAA';
    } else if (this.rt.width !== w || this.rt.height !== h) this.rt.setSize(w, h);
    super.render(renderer, writeBuffer, this.rt, dt, mask);        // la scène, résolue par three en fin de rendu
    this.copie.material.uniforms.tDiffuse.value = this.rt.texture;
    renderer.setRenderTarget(readBuffer); this.copie.render(renderer);
  }
  // la mémoire rendue tout de suite quand l'option s'éteint (une cible x4 en 1080p pèse ~45 Mo)
  liberer() { if (this.rt) { this.rt.dispose(); this.rt = null; } }
}

// ---------------------------------------------------------------------
//  2. LES NORMALES DU FEUILLAGE DÉCOUPÉ, pour l'occlusion (GTAO)
// ---------------------------------------------------------------------
// La passe de normales du GTAO dessine toute la scène avec UN matériau (MeshNormalMaterial), qui ignore la découpe
// des feuilles : un plan de feuillage y devenait une plaque pleine, d'où les damiers sombres. js/fx.js les cache donc
// tous (_decoupes) — et le feuillage n'a aucune occlusion : le massif du pin vu d'en haut est éclairé à plat,
// « camouflage de choux » (défaut 9). Ici, APRÈS la passe ordinaire, on redessine dans la même cible (normales et
// profondeur, sans l'effacer) les seuls objets de la LISTE EXPLICITE scene.userData.feuillageAO, chacun avec un
// matériau qui découpe comme le sien (sa carte, sa transformation d'UV, son seuil) — la recette essayée à chaud par
// l'audit (graphismes/audit_vegetation.md, « exp4 ») : masses +35 % sur le massif. Chaque objet est rendu SEUL, comme
// racine de son propre rendu (renderer.render(objet, caméra)) : rien ne touche à la visibilité du reste de la scène. Le
// vent du feuillage n'y est pas (quelques centimètres : invisible dans une occlusion de 60 cm de rayon, filtrée).
// (Relecture L12 : la première version rendait la SCÈNE avec la caméra sur un calque à part. Les lumières, restées sur
// le calque 0, n'étaient alors pas comptées : three voyait le nombre de lumières de la scène changer deux fois par
// image (0 dans ce rendu, toutes dans le suivant), et réévaluait le programme de CHAQUE matériau éclairé à chaque image
// — lights.state.version qui avance de 2 par image, mesuré. Un objet rendu comme racine a son propre état de rendu,
// sans lumière, et celui de la scène ne bouge plus.)
const _normales = new WeakMap();
function materiauNormales(src) {
  let m = _normales.get(src);
  if (!m) {
    m = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { map: { value: src.map }, uvT: { value: new THREE.Matrix3() }, seuil: { value: src.alphaTest || 0.5 } },
      vertexShader: `#include <common>
        #include <batching_pars_vertex>
        uniform mat3 uvT; varying vec2 vUv; varying vec3 vN;
        void main() {
          vUv = ( uvT * vec3( uv, 1.0 ) ).xy;
          #include <batching_vertex>
          #include <beginnormal_vertex>
          #include <defaultnormal_vertex>
          vN = normalize( transformedNormal );
          #include <begin_vertex>
          #include <project_vertex>
        }`,
      fragmentShader: `#include <packing>
        uniform sampler2D map; uniform float seuil; varying vec2 vUv; varying vec3 vN;
        void main() {
          if ( texture2D( map, vUv ).a < seuil ) discard;
          vec3 n = normalize( vN ) * ( gl_FrontFacing ? 1.0 : - 1.0 );    // le revers d'une carte regarde l'autre côté
          // (alpha 0,5 : la MARQUE du feuillage dans la cible des normales, où tout le reste écrit 1 — voir attenuerAO)
          gl_FragColor = vec4( packNormalToRGB( n ), 0.5 );
        }`,
    });
    _normales.set(src, m);
  }
  // la carte et sa transformation peuvent avoir changé (texture cuite arrivée après coup)
  const t = src.map;
  m.uniforms.map.value = t;
  if (t) { if (t.matrixAutoUpdate) t.updateMatrix(); m.uniforms.uvT.value.copy(t.matrix); }
  return m;
}
// L'OCCLUSION, MOINS FORTE SUR LE FEUILLAGE LUI-MÊME. À pleine force (0,85 comme partout), la masse tombait de 25 % et
// le pied du massif, au ras du sol et du grillage, au noir (p10 de 30 à 10 sur 255, vu du plateau vers le pin) : un
// massif dense est sombre en dessous, mais pas un trou noir. Les pixels du feuillage portent une marque dans la cible
// des normales (alpha 0,5, voir materiauNormales) ; le mélange final du GTAO (son blendMaterial) la lit et n'applique
// à ces pixels-là que `FEUILLE_AO` de son intensité. Ce que le feuillage fait aux AUTRES surfaces (la terre sous les
// arbustes, le pied du grillage) reste à pleine force. La retouche n'est compilée (define) que tant que l'option agit :
// sinon le mélange du GTAO est exactement celui de three.
const FEUILLE_AO = 0.5;
export function attenuerAO(gtao, actif) {
  const m = gtao.blendMaterial;
  if (!actif && !m.userData.feuilleAO) return;        // (jamais retouché sur une machine où l'option n'agit pas)
  if (!m.userData.feuilleAO) {
    m.userData.feuilleAO = true;
    m.uniforms.tNormalAO = { value: null }; m.uniforms.uFeuilleAO = { value: FEUILLE_AO };
    m.fragmentShader = m.fragmentShader
      .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\n#ifdef FEUILLE_AO\nuniform sampler2D tNormalAO; uniform float uFeuilleAO;\n#endif')
      .replace('gl_FragColor = vec4(mix(vec3(1.), texel.rgb, intensity), texel.a);',
        '#ifdef FEUILLE_AO\nfloat kAO = intensity * mix( uFeuilleAO, 1.0, step( 0.75, texture2D( tNormalAO, vUv ).a ) );\n#else\nfloat kAO = intensity;\n#endif\ngl_FragColor = vec4(mix(vec3(1.), texel.rgb, kAO), texel.a);');
    if (!m.fragmentShader.includes('kAO')) console.warn('[fx] GTAOBlendShader a changé : occlusion du feuillage à pleine force');
  }
  m.uniforms.tNormalAO.value = gtao.normalRenderTarget ? gtao.normalRenderTarget.texture : null;
  const avant = 'FEUILLE_AO' in m.defines;
  if (actif && !avant) { m.defines.FEUILLE_AO = ''; m.needsUpdate = true; }
  if (!actif && avant) { delete m.defines.FEUILLE_AO; m.needsUpdate = true; }
}
// LA CLARTÉ DU MASSIF, À OCCLUSION ÉGALE. Les feuillages du parc ont été calés sur les photos SANS occlusion (lot L7 :
// massif du pin à 0,55-0,63 fois l'enrobé vu de la caméra de match de parc2, mesuré 0,596). L'occlusion assombrit
// toute la masse — 0,452 mesuré le 01/10 à pleine force, 0,464 contre 0,547 à demi-force vu du plateau vers le pin —,
// alors que ce calage tenait déjà compte, en moyenne, de l'ombre que les rameaux se font entre eux : on la compterait
// deux fois. Chaque objet de la liste déclare donc `userData.compAO`, le
// facteur rendu à sa couleur tant que l'occlusion lui est appliquée (couleur d'origine gardée dans userData) : la
// masse garde sa clarté moyenne, l'occlusion ne fait plus que creuser les creux et détacher les boules.
export function compenserAO(scene, actif) {
  for (const o of scene.userData.feuillageAO || []) {
    const m = o.material, k = o.userData.compAO || 1;
    if (!m || !m.color) continue;
    if (!o.userData.couleurAO0) o.userData.couleurAO0 = m.color.clone();
    m.color.copy(o.userData.couleurAO0);
    if (actif) m.color.multiplyScalar(k);
  }
}
// visible pour de bon : lui ET tous ses parents jusqu'à la scène (le parc entier cache des groupes entiers au loin ;
// rendu comme racine, un objet dont le groupe est caché serait dessiné quand même)
function visibleDansScene(o, scene) {
  for (let n = o; n; n = n.parent) { if (!n.visible) return false; if (n === scene) return true; }
  return false;                                         // (détaché de la scène)
}
// Rend le nombre d'objets dessinés. `cible` : la cible des normales du GTAO, déjà remplie par la passe ordinaire.
// Chaque objet de la liste doit être un maillage SANS enfants (rendu comme racine, ses enfants seraient dessinés avec
// leurs propres matériaux dans la cible des normales) : les autres sont ignorés.
export function normalesFeuillage(renderer, scene, camera, cible) {
  const liste = scene.userData.feuillageAO;
  if (!liste || !liste.length) return 0;
  const auto = renderer.autoClear;
  renderer.autoClear = false;                           // (on dessine PAR-DESSUS les normales de la passe ordinaire)
  renderer.setRenderTarget(cible);
  let n = 0;
  for (const o of liste) {
    if (!o.isMesh || o.children.length || !o.material || Array.isArray(o.material) || !o.material.map) continue;
    if (!visibleDansScene(o, scene)) continue;
    const m = o.material;
    o.material = materiauNormales(m);
    try { renderer.render(o, camera); n++; } finally { o.material = m; }
  }
  renderer.autoClear = auto;
  return n;
}

// ---------------------------------------------------------------------
//  3. LA SORTIE ÉTALONNÉE DE LA BASSE
// ---------------------------------------------------------------------
// La basse ne passait pas par l'étalonnage (js/fx.js GradeShader) : rendu direct, ou composer minimal « scène →
// sortie → FXAA » sur les téléphones sans MSAA. Elle perdait donc tout ce que la météo et le terrain y règlent :
// lift, gamma, gain, courbe en S, virage des ombres et des lumières, saturation, vignette — six à huit réglages par
// temps (défaut Q3 du plan). Une passe d'étalonnage de plus aurait coûté un plein écran au téléphone : on le met DANS
// la sortie, juste après ACES et le passage en sRGB, là où GradeShader le fait (il travaille sur l'image déjà en sRGB).
// Seules les opérations PAR PIXEL y sont : ni réaffûtage (le FXAA de la basse le fait), ni clarté, ni rayons, ni grain
// (la basse n'en a pas). Les uniformes sont CEUX de GradeShader (mêmes objets) : js/fx.js render() les repose à chaque
// image, il n'y a rien à recopier.
// (06/10/2026 : et le ciel de Paris, uCiel — voir GradeShader de js/fx.js, mêmes seuils)
const ETAL_GLSL = `
  {
    vec3 c = clamp( gl_FragColor.rgb, 0.0, 1.0 );
    c = uGain * ( c + uLift * ( 1.0 - c ) );
    c = pow( max( c, vec3( 0.0 ) ), 1.0 / uGamma );
    float Yc = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
    float ciel = uCiel * smoothstep( 0.05, 0.16, c.b - max( c.r, c.g ) ) * smoothstep( 0.10, 0.22, Yc ) * ( 1.0 - smoothstep( 0.42, 0.62, Yc ) );
    c = mix( c, c * c * ( 3.0 - 2.0 * c ), uCourbe * ( 1.0 - ciel ) );
    float Yv = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
    float bleu = smoothstep( 0.02, 0.10, c.b - max( c.r, c.g ) );
    c *= mix( vec3( 1.0 ), uTonO, uSplit.x * ( 1.0 - smoothstep( 0.05, 0.5, Yv ) ) );
    c *= mix( vec3( 1.0 ), uTonL, uSplit.y * smoothstep( 0.45, 0.95, Yv ) * ( 1.0 - bleu ) );
    float l = dot( c, vec3( 0.299, 0.587, 0.114 ) );
    c = mix( vec3( l ), c, mix( uSat, 0.9, ciel ) );
    c = mix( c, vec3( 0.78, 0.86, 1.0 ), 0.28 * ciel );
    vec2 d = vUv - 0.5;
    c *= clamp( 1.0 - dot( d, d ) * uVignette * 2.2, 0.0, 1.0 );
    float bord = smoothstep( 0.35, 0.95, length( d ) * 1.6 );
    c = mix( c, c * vec3( 1.15, 0.7, 0.35 ) + vec3( 0.25, 0.08, 0.0 ), bord * uHeat * 0.8 );
    gl_FragColor.rgb = c + uFlash;
    // TRAMAGE avant les 8 bits (07/10/2026, uTrame : 1/255 quand la sortie écrit dans la cible 8 bits du FXAA, voir js/fx.js
    // _rt8 ; 0 ailleurs) : un bruit d'un demi-niveau de part et d'autre, que l'arrondi transforme en dégradé sans marches
    // — le grain que le FXAA ajoute ensuite ne tramerait plus qu'une image déjà arrondie.
    gl_FragColor.rgb += ( fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) ) - 0.5 ) * uTrame;
  }`;
const UNIF_ETAL = ['uVignette', 'uSat', 'uHeat', 'uFlash', 'uLift', 'uGamma', 'uGain', 'uCourbe', 'uSplit', 'uTonO', 'uTonL', 'uCiel'];
// (07/10/2026) `uGainHDR` : un gain sur le HDR, AVANT ACES (et l'œil, posé juste avant par js/fx.js poserOeil — deux produits,
// l'ordre n'y change rien). 1 partout ; la moyenne du téléphone, qui n'a pas de bloom, y retrouve l'énergie qu'il ajoutait
// (js/fx.js GAIN_LEGERE, posé par _fxaaBasse).
export function sortieEtalonnee(grade) {
  const p = new OutputPass();
  for (const k of UNIF_ETAL) p.uniforms[k] = grade.uniforms[k];       // (p.uniforms est l'objet du matériau)
  p.uniforms.uGainHDR = { value: 1 };
  p.uniforms.uTrame = { value: 0 };          // tramage avant une cible 8 bits (posé par js/fx.js, voir ETAL_GLSL)
  const fs = p.material.fragmentShader;
  const fin = /(#ifdef SRGB_TRANSFER\s*gl_FragColor = sRGBTransferOETF\( gl_FragColor \);\s*#endif)/;
  if (!fin.test(fs)) { console.warn('[fx] OutputShader a changé : la basse reste sans étalonnage'); p.etalonnee = false; return p; }
  p.material.fragmentShader = fs
    .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\nuniform float uVignette, uSat, uHeat, uFlash, uCourbe, uCiel, uGainHDR, uTrame;\nuniform vec3 uLift, uGamma, uGain, uTonO, uTonL;\nuniform vec2 uSplit;')
    .replace('gl_FragColor = texture2D( tDiffuse, vUv );', 'gl_FragColor = texture2D( tDiffuse, vUv );\n  gl_FragColor.rgb *= uGainHDR;')
    .replace(fin, '$1\n' + ETAL_GLSL);
  if (!p.material.fragmentShader.includes('*= uGainHDR')) console.warn('[fx] OutputShader a changé : gain de la sortie étalonnée non posé');
  p.etalonnee = true;
  p.enabled = false;
  return p;
}
