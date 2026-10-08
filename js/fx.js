import './ombres_soleil.js';      // ombres douces du soleil (PCSS) : avant toute compilation de matériau
import './nuages.js';             // ombres de nuages qui défilent : idem
import './monde_ombres.js';       // ombres du parc entier (carte qui suit, carte lointaine, zone forcée) : idem (l'ordre avec les deux autres est indifférent, voir son en-tête)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { ECLAIRAGE } from './eclairage_perso.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';   // la basse sans MSAA (téléphones) : voir _fxaaBasse
// les options coûteuses du lot L12 (MSAA de la scène, occlusion du massif du pin, sortie étalonnée de la basse) : voir
// js/options_rendu.js
import { OPTIONS_RENDU, poserOptions, PasseSceneMSAA, normalesFeuillage, compenserAO, attenuerAO, sortieEtalonnee } from './options_rendu.js';
import { OmbreCache } from './ombre_cache.js';
import { TELEPHONE } from './appareil.js';
import { ENCEINTE } from './config.js';   // (lecture seule : le cadrage de l'ombre au téléphone, _cadrerOmbre)

// =====================================================================
//  Pipeline de rendu : occlusion ambiante (GTAO), bloom léger, étalonnage
//  (vignette, saturation, "chaleur" quand le joueur est en feu), SMAA.
//  Cinq niveaux, choisis automatiquement d'après le matériel ET les FPS mesurés
//  (auto) ou forcés : __game.fx.setQuality('low'|'medium'|'high'|'ultra'|'extreme').
//
//  ULTRA et EXTRÊME sont là pour les bonnes machines :
//    - RÉFLEXIONS PLANAIRES SUR LE BITUME (Reflector) : quand le sol est mouillé, le terrain renvoie vraiment
//      les joueurs, le panier, le grillage et les arbres. C'est ce qui se rapproche le plus du lancer de rayons
//      dans un navigateur ; le vrai ray tracing matériel n'existe pas en WebGL, autant le dire franchement.
//      Le reflet est rendu dans sa PROPRE texture (512 en ultra, 1024 en extrême) : sa finesse n'a aucun effet
//      sur la netteté de l'image, et il ne coûte rien du tout par temps sec puisqu'il est alors masqué.
//    - CARTE D'ENVIRONNEMENT générée depuis le ciel (PMREM) : la peau, les vêtements, le ballon et le cercle
//      reçoivent un vrai reflet spéculaire au lieu d'un éclairage plat.
//    - OMBRES DOUCES avec filtrage PCF doux et carte d'ombre resserrée sur l'enceinte.
//    - SURÉCHANTILLONNAGE : on rend au-dessus de la résolution de l'écran puis on réduit.
//    - occlusion ambiante à 32 échantillons au lieu de 12, et météo détaillée (js/weather.js).
//
//  ------------------------------------------------------------------
//  CE QUI A ÉTÉ CORRIGÉ (19/09) — « le mode extrême est bugué »
//  ------------------------------------------------------------------
//  1. MÉMOIRE VIDÉO. L'ancien calcul faisait min(dpr, 2.0) * 1.35 = 2,7 en extrême : sur un écran 1080p à
//     dpr 2 on rendait donc en 5590 x 2916 (16 Mpx). Le composer garde une dizaine de cibles de rendu en
//     demi-flottant (2 tampons + GTAO + 5 niveaux de bloom + SMAA + sortie) : plus d'1,5 Go de VRAM, d'où la
//     perte de contexte WebGL — écran noir ou gel. Maintenant la résolution interne est bornée par un BUDGET
//     EN PIXELS (`px`) : on ne dépasse jamais ce nombre de pixels quelle que soit la taille de la fenêtre.
//  2. OMBRES 8192. Une carte d'ombre 8192² = 268 Mo à elle seule, et beaucoup de puces (tous les téléphones,
//     les iGPU) plafonnent à 4096 : la demande échouait silencieusement et les ombres disparaissaient. On
//     borne maintenant par `renderer.capabilities.maxTextureSize`, et le 8192 n'est accordé qu'aux machines
//     qui l'encaissent. Sur les autres on RESSERRE la caméra d'ombre à la place : même finesse, 4x moins cher.
//  3. IMAGE PIXELISÉE EN ULTRA ET EN EXTRÊME (le défaut signalé le 19/09). C'était SSRPass. Cette passe ne
//     se contente pas de calculer des reflets : elle REFAIT elle-même le rendu de toute la scène dans sa propre
//     cible (SSRPass.js, render() ligne 350) et c'est CETTE image-là qui ressort de la passe. La faire tourner
//     en demi-résolution — le réglage évident pour qu'elle soit abordable — ne réduisait donc pas le coût des
//     reflets : ça rendait LE JEU ENTIER en 960x540 avant de l'étirer en plein écran. D'où le paradoxe : plus on
//     montait en qualité, plus l'image était grossière. La mettre en pleine résolution aurait corrigé l'image
//     mais son coût explose (le shader marche jusqu'à sqrt(w²+h²) pas par pixel, soit ~2900 en 1440p).
//     SSRPass est donc SORTI du pipeline, remplacé par un miroir planaire au sol (Reflector) : un rendu de la
//     scène dans une texture de 512 ou 1024 pixels, plaquée sur le terrain, totalement découplée de la
//     résolution de l'image — et masquée (donc gratuite) tant que le bitume est sec.
//  4. PASSES DÉSYNCHRONISÉES. `resize()` appelait composer.setSize(w,h) — qui dimensionne les passes en pixels
//     RÉELS — puis re-forçait gtao/bloom/smaa en pixels CSS. L'occlusion ambiante et le SMAA travaillaient donc
//     sur des tampons deux fois trop petits que celui de la couleur : halos autour des joueurs, bords en
//     escalier malgré l'anticrénelage. C'était ça, le « bugué » visible à l'écran.
//  5. RÉSOLUTION DYNAMIQUE. La résolution interne suit maintenant les FPS en continu (entre 55 % et 100 %) :
//     au lieu de tomber à 25 im/s dans les moments chargés (pluie + dunk + ralenti), le jeu baisse d'un cran
//     de résolution le temps que ça passe. C'est ce qui rend le tout « fluide ».
//  6. TÉLÉPHONES. La détection automatique partait de `high` avec 240 IMAGES de mesure : sur un téléphone à
//     8 im/s ça faisait 30 secondes de diaporama avant la première décision — souvent un plantage avant.
//     Le préréglage de départ vient maintenant d'une sonde matérielle, et la mesure est en SECONDES.
//  7. GARDE-FOU. Une perte de contexte WebGL est mémorisée : au démarrage suivant on ne relance pas le
//     préréglage qui a fait planter la machine.
// =====================================================================

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVignette: { value: 0.32 }, uSat: { value: 1.08 }, uHeat: { value: 0 }, uFlash: { value: 0 },
              uSun: { value: new THREE.Vector2(0.5, 0.9) }, uRays: { value: 0 },
              uSharp: { value: 0 }, uTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
              // étalonnage (les valeurs neutres redonnent l'image d'avant) ; voir js/weather.js
              uLift: { value: new THREE.Vector3(0, 0, 0) }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) },
              uCourbe: { value: 0 }, uSplit: { value: new THREE.Vector2(0, 0) },
              uTonO: { value: new THREE.Vector3(1, 1, 1) }, uTonL: { value: new THREE.Vector3(1, 1, 1) },
              uClarte: { value: 0 }, uGrain: { value: 0 }, uImage: { value: 0 }, uCiel: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uVignette, uSat, uHeat, uFlash, uRays, uSharp; uniform vec2 uSun, uTexel; varying vec2 vUv;
    uniform vec3 uLift, uGamma, uGain, uTonO, uTonL; uniform vec2 uSplit; uniform float uCourbe, uClarte, uGrain, uImage, uCiel;
    const vec3 W709 = vec3(0.2126, 0.7152, 0.0722);
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      // REAFFUTAGE. Quand on rend en dessous de la resolution de l'ecran, c'est le navigateur qui etire
      // l'image, et son etirement est bilineaire : tout devient mou. Un noyau en croix rend le piquant
      // perdu. Le resultat est BORNE par le minimum et le maximum des quatre voisins — sans cette borne,
      // un affutage un peu fort creuse un lisere noir autour de chaque ligne blanche du terrain.
      if (uSharp > 0.002) {
        vec3 n = texture2D(tDiffuse, vUv + vec2(0.0, -uTexel.y)).rgb;
        vec3 s = texture2D(tDiffuse, vUv + vec2(0.0,  uTexel.y)).rgb;
        vec3 e = texture2D(tDiffuse, vUv + vec2( uTexel.x, 0.0)).rgb;
        vec3 o = texture2D(tDiffuse, vUv + vec2(-uTexel.x, 0.0)).rgb;
        vec3 moy = (n + s + e + o) * 0.25;
        vec3 mn = min(min(n, s), min(e, o)), mx = max(max(n, s), max(e, o));
        c.rgb = clamp(c.rgb + (c.rgb - moy) * uSharp * 2.0, min(mn, c.rgb), max(mx, c.rgb));
      }
      // CLARTÉ : contraste LOCAL. On compare le pixel à la moyenne de son voisinage à 3 pixels et on creuse l'écart :
      // gravillons du bitume, écorce, plis des maillots. L'écart est BORNÉ à 0,05 : sans borne, chaque silhouette sur
      // le ciel prenait un liseré sombre.
      if (uClarte > 0.0) {
        vec2 t = uTexel * 3.0;
        vec3 f = texture2D(tDiffuse, vUv + t).rgb + texture2D(tDiffuse, vUv - t).rgb
               + texture2D(tDiffuse, vUv + vec2(t.x, -t.y)).rgb + texture2D(tDiffuse, vUv + vec2(-t.x, t.y)).rgb;
        c.rgb += clamp(dot(c.rgb - f * 0.25, W709), -0.05, 0.05) * uClarte * 2.0;
      }
      // rayons de soleil : on étire les pixels les plus clairs depuis la position du soleil à l'écran. Ce qui masque
      // le soleil (immeuble, feuillage) est sombre, donc ne contribue pas : les rayons se découpent tout seuls.
      // Vingt echantillons et non quatorze : la gerbe se lit en filaments distincts au lieu d'un eventail
      // raye. Le seuil, lui, reste haut (0,70) et le gain modeste — j'ai essaye 0,64 et 0,105, et quand le
      // ciel remplit le cadre la moyenne de vingt echantillons de ciel blanc est du ciel blanc : ce n'etaient
      // plus des rais, c'etait un voile uniforme sur toute l'image. Un rai n'existe que par CONTRASTE avec ce
      // qui l'entoure ; noyer le fond le supprime au lieu de le montrer.
      // La gerbe est teintee chaude : la lumiere qui traverse l'air perd son bleu en chemin.
      if (uRays > 0.004) {
        vec2 pas = (vUv - uSun) / 20.0 * 0.66;
        vec2 uv = vUv; float dec = 1.0; vec3 acc = vec3(0.0);
        for (int i = 0; i < 20; i++) {
          uv -= pas;
          vec3 s = texture2D(tDiffuse, clamp(uv, 0.0, 1.0)).rgb;
          acc += max(vec3(0.0), s - 0.70) * dec;
          dec *= 0.945;
        }
        c.rgb += acc * uRays * vec3(0.082, 0.076, 0.063);
      }
      // LIFT / GAMMA / GAIN, dans l'espace de l'écran : on est APRÈS OutputPass, c'est là que les étalonneurs les
      // appliquent. Le lift relève les noirs (voile laiteux de la pluie), le gain règle les blancs.
      c.rgb = clamp(c.rgb, 0.0, 1.0);
      c.rgb = uGain * (c.rgb + uLift * (1.0 - c.rgb));
      c.rgb = pow(max(c.rgb, vec3(0.0)), 1.0 / uGamma);
      // LE CIEL DE PARIS (06/10/2026, uCiel : le style Vif). La photo du ciel (Poly Haven, un ciel d'Afrique du Sud) sort
      // d'ACES déjà bleu profond — 50/79/149 mesurés au-dessus de La Cage —, et la courbe en S puis la saturation du
      // style Vif le poussaient au bleu marine (31/64/154). Un ciel de Paris est plus pâle : un bleu franc de luminance
      // moyenne (ni l'ombre, ni le blanc d'un mur ou d'un nuage) échappe à la courbe et au surcroît de saturation, et
      // prend un peu de voile clair. Le reste de l'image est inchangé.
      float Yc = dot(c.rgb, W709);
      float ciel = uCiel * smoothstep(0.05, 0.16, c.b - max(c.r, c.g)) * smoothstep(0.10, 0.22, Yc) * (1.0 - smoothstep(0.42, 0.62, Yc));
      // COURBE EN S centrée sur 0,5 : noirs plus denses, blancs plus francs, gris moyen immobile (l'enrobé du parc
      // mesure 126/255 : les mesures de js/court_parc.js restent justes).
      c.rgb = mix(c.rgb, c.rgb * c.rgb * (3.0 - 2.0 * c.rgb), uCourbe * (1.0 - ciel));
      // VIRAGE PARTIEL : les ombres prennent la couleur du ciel qui les éclaire, les lumières celle du soleil.
      // Teintes normalisées à une luminance de 1 : on change la couleur, jamais la lumière.
      // LES BLEUS SONT PROTÉGÉS du virage des lumières : un ciel clair dépasse le seuil de luminance comme une façade
      // au soleil, et le virage doré le passait au crème (-6 % de bleu au parc). Dès que le bleu domine franchement
      // (B plus haut que R et V de 0,02 à 0,10), le poids du virage retombe à zéro : le ciel garde sa couleur, les
      // murs, les feuillages et la peau au soleil gardent leur or.
      float Yv = dot(c.rgb, W709);
      float bleu = smoothstep(0.02, 0.10, c.b - max(c.r, c.g));
      c.rgb *= mix(vec3(1.0), uTonO, uSplit.x * (1.0 - smoothstep(0.05, 0.5, Yv)));
      c.rgb *= mix(vec3(1.0), uTonL, uSplit.y * smoothstep(0.45, 0.95, Yv) * (1.0 - bleu));
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l), c.rgb, mix(uSat, 0.9, ciel));
      c.rgb = mix(c.rgb, vec3(0.78, 0.86, 1.0), 0.28 * ciel);      // le voile clair du ciel d'Île-de-France
      vec2 d = vUv - 0.5; float v = 1.0 - dot(d, d) * uVignette * 2.2;
      c.rgb *= clamp(v, 0.0, 1.0);
      // halo orangé sur les bords quand on est "en feu"
      float edge = smoothstep(0.35, 0.95, length(d) * 1.6);
      c.rgb = mix(c.rgb, c.rgb * vec3(1.15, 0.7, 0.35) + vec3(0.25, 0.08, 0.0), edge * uHeat * 0.8);
      c.rgb += uFlash;
      // GRAIN : pellicule, et surtout TRAMAGE. La sortie est en 8 bits : sans lui, les dégradés du ciel et de la brume
      // font des marches. Bruit d'entrelacement (Jimenez), changé à chaque image, plus fort dans les tons moyens, ±3/255.
      // Cette passe vient APRÈS le SMAA (voir l'ordre des passes dans le constructeur) : on avait cru ce grain « sous le
      // seuil de détection des bords » du SMAA, c'était faux. Le SMAA le lisait comme des bords et semait, le long de
      // chaque ligne fine (poteaux, lisses, branches, lignes peintes), des pointillés qui changeaient à chaque image.
      if (uGrain > 0.0) {
        float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy + 5.588238 * uImage, vec2(0.06711056, 0.00583715))));
        float Yg = clamp(dot(c.rgb, W709), 0.0, 1.0);
        c.rgb += (n - 0.5) * uGrain * (0.25 + 3.0 * Yg * (1.0 - Yg));
      }
      gl_FragColor = c;
    }`,
};

const VS_QUAD = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// L'ŒIL. Quand on passe du soleil à l'ombre d'un arbre, ou qu'on regarde vers le couchant, l'œil (et une caméra)
// s'adapte : l'image s'assombrit face à la lumière, s'éclaircit dans l'ombre, puis revient. On mesure la lumière de
// l'image HDR, AVANT le tone mapping : 16 x 9 cases de 16 prises, en log2 (une moyenne simple serait tirée par le
// seul disque du soleil), pondérées au centre comme la mesure d'un appareil photo. Deux mémoires dans une cible
// 1 x 1 : r = l'œil, g = la référence lente. L'œil suit en 0,35 s vers le clair et 1,4 s vers le sombre, la
// référence en 25 s. On n'expose que l'ÉCART des deux (dans OutputPass, voir le constructeur) : en moyenne l'image
// reste celle qu'on a réglée sur les photos, seul le regard la fait bouger.
//
// L'ŒIL ÉTAIT FIGÉ (30/09). Les deux mémoires vivaient dans une cible en DEMI-FLOTTANT. Vers -3 IL, deux valeurs
// voisines y sont séparées de 0,002 ; or à 60 im/s la référence n'avance que de 0,0007 fois l'écart par image (tau
// 25 s), et à 165 im/s de 0,00024 fois. L'arrondi mangeait chaque pas : la référence restait collée à la valeur de la
// toute PREMIÈRE image (le menu à moitié chargé), et l'image gardait toute la partie un écart tiré au sort au
// lancement, de +0,07 à +0,43 IL mesurés (bitume 97 → 116 au parc). Deux remèdes, qui se cumulent :
//  - la cible passe en FLOTTANT 32 bits quand la puce sait y dessiner (EXT_color_buffer_float : presque partout) ;
//  - et chaque mémoire est rangée en DEUX morceaux, une partie haute arrondie au 1/256 (exacte en demi-flottant tant
//    que la valeur reste sous 8 en valeur absolue, et la mesure est bornée à [-8 ; 6]) et le reste dans b et a. Même
//    sur une puce qui n'a que le demi-flottant, le pas le plus fin n'est plus perdu. Lecture : rg + ba.
// Et l'œil repart de zéro à l'entrée en balade et en match (PostFX.reAdapter), avec 2,5 s de suivi rapide de la
// référence, le temps que la caméra arrive à sa place.
class PasseOeil extends Pass {
  constructor(sortie, flottant = false) {
    super();
    this.needsSwap = false; this.sortie = sortie; this.i = 0; this.init = true; this.tauRef = 25;
    this.rapide = 0;                 // secondes de suivi rapide de la référence qui restent (reAdapter)
    this.split = true;               // mémoires en deux morceaux (haut + bas) : lu aussi par les outils de mesure
    const opt = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
    this.rtMesure = new THREE.WebGLRenderTarget(16, 9, opt);
    const optOeil = { ...opt, type: flottant ? THREE.FloatType : THREE.HalfFloatType };
    this.rtOeil = [new THREE.WebGLRenderTarget(1, 1, optOeil), new THREE.WebGLRenderTarget(1, 1, optOeil)];
    this.qMesure = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } }, vertexShader: VS_QUAD, depthTest: false, depthWrite: false,
      fragmentShader: `
        uniform sampler2D tDiffuse; varying vec2 vUv;
        void main(){
          vec2 cel = vec2(1.0 / 16.0, 1.0 / 9.0), o = vUv - cel * 0.5;
          float s = 0.0;
          for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) {
            vec3 c = texture2D(tDiffuse, o + cel * (vec2(float(i), float(j)) + 0.5) * 0.25).rgb;
            s += log2(clamp(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.004, 64.0));
          }
          vec2 d = (vUv - 0.5) * vec2(1.0, 1.4);
          float w = mix(1.0, 0.3, smoothstep(0.12, 0.62, length(d)));   // le bord compte trois fois moins
          gl_FragColor = vec4(s * 0.0625 * w, w, 0.0, 1.0);
        }` }));
    this.qOeil = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tMesure: { value: null }, tPrec: { value: null }, uDt: { value: 0.016 }, uInit: { value: 1 }, uTauRef: { value: 25 } },
      vertexShader: VS_QUAD, depthTest: false, depthWrite: false,
      fragmentShader: `
        uniform sampler2D tMesure, tPrec; uniform float uDt, uInit, uTauRef; varying vec2 vUv;
        void main(){
          float sl = 0.0, sw = 0.0;
          for (int j = 0; j < 9; j++) for (int i = 0; i < 16; i++) {
            vec2 m = texture2D(tMesure, (vec2(float(i), float(j)) + 0.5) / vec2(16.0, 9.0)).rg;
            sl += m.x; sw += m.y;
          }
          float cible = sl / max(sw, 0.001);
          vec4 m = texture2D(tPrec, vec2(0.5));
          vec2 p = uInit > 0.5 ? vec2(cible) : m.rg + m.ba;      // mémoire = partie haute + reste
          float tau = cible > p.x ? 0.35 : 1.4;        // l'œil s'habitue plus vite à la lumière qu'à l'ombre
          vec2 n = vec2(p.x + (cible - p.x) * (1.0 - exp(-uDt / tau)),
                        p.y + (cible - p.y) * (1.0 - exp(-uDt / uTauRef)));
          vec2 h = floor(n * 256.0 + 0.5) / 256.0;     // partie haute : un multiple de 1/256, exact même en demi-flottant
          gl_FragColor = vec4(h, n - h);
        }` }));
  }
  setSize() {}                     // tailles fixes : la mesure ne dépend pas de la résolution
  render(renderer, writeBuffer, readBuffer, dt) {
    this.qMesure.material.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.rtMesure); this.qMesure.render(renderer);
    const u = this.qOeil.material.uniforms, prec = this.rtOeil[this.i];
    this.i ^= 1;
    u.tMesure.value = this.rtMesure.texture; u.tPrec.value = prec.texture;
    u.uDt.value = Math.min(0.1, dt > 0 ? dt : 0.016); u.uInit.value = this.init ? 1 : 0; u.uTauRef.value = this.tauRef;
    this.init = false;
    this.rapide = Math.max(0, this.rapide - u.uDt.value);
    renderer.setRenderTarget(this.rtOeil[this.i]); this.qOeil.render(renderer);
    this.sortie.uniforms.tOeil.value = this.rtOeil[this.i].texture;
  }
}

// une teinte 0xrrggbb (sRGB) -> multiplicateur de luminance 1 : le virage de l'étalonnage ne doit jamais éclaircir
function tonNormalise(v, hex) {
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  const y = Math.max(0.05, 0.2126 * r + 0.7152 * g + 0.0722 * b);
  return v.set(r / y, g / y, b / y);
}

// L'exposition de l'œil (PasseOeil) dans une passe de sortie (OutputPass) : sur le HDR, avant ACES/AgX. `partage` : une
// autre sortie déjà équipée, dont on prend les MÊMES uniformes (la sortie étalonnée du chemin léger, voir _fxaaBasse :
// l'œil écrit dans l'une, les deux le lisent). Rend faux si le shader de three a changé.
function poserOeil(S, partage = null) {
  S.uniforms.tOeil = partage ? partage.uniforms.tOeil : { value: null };
  S.uniforms.uOeil = partage ? partage.uniforms.uOeil : { value: new THREE.Vector3(0, -0.8, 0.6) };     // force, IL mini, IL maxi
  S.material.fragmentShader = S.material.fragmentShader
    .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse; uniform sampler2D tOeil; uniform vec3 uOeil;')
    .replace('gl_FragColor = texture2D( tDiffuse, vUv );', `gl_FragColor = texture2D( tDiffuse, vUv );
        if ( uOeil.x > 0.0 ) {
          vec4 o4 = texture2D( tOeil, vec2( 0.5 ) );
          vec2 o = o4.rg + o4.ba;
          gl_FragColor.rgb *= exp2( clamp( ( o.y - o.x ) * uOeil.x, uOeil.y, uOeil.z ) );
        }`);
  return S.material.fragmentShader.includes('uOeil.x');
}

// Sonde matérielle, faite UNE fois. Sans elle on ne peut pas choisir un préréglage de départ honnête : c'est la
// différence entre « le jeu démarre en 3 secondes sur un téléphone » et « le téléphone chauffe puis plante ».
export function sonderMateriel(renderer) {
  let gpu = '';
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) gpu = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
  } catch (e) { /* extension refusée (Firefox durci) : on se rabat sur les autres indices */ }
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const maxTex = renderer.capabilities.maxTextureSize || 2048;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || (coarse ? 4 : 8);
  const dpr = window.devicePixelRatio || 1;
  // ?tel=1 dans l'adresse : le PC se fait passer pour un téléphone (plancher de résolution, budget de pixels, basse
  // en FXAA...), pour tester la branche mobile sans téléphone. L'émulation « mobile » de l'outil du navigateur ne suffit
  // pas : la sonde lit le vrai processeur (12 fils) et la vraie taille de texture (16384), et restait donc sur « PC ».
  // (06/10/2026 : la détection est celle de tout le jeu, js/appareil.js — avant, celle-ci, faite d'après la puce et le
  // pointeur, ne s'accordait pas toujours avec celles du décor ; `?tel=0` force l'inverse)
  const telephone = TELEPHONE;
  // PUCE INTÉGRÉE : pas de VRAM à elle, elle pioche dans la mémoire système et partage la bande passante avec le
  // processeur. « AMD Radeon(TM) Graphics » tout court, c'est le circuit intégré des Ryzen — pas une RX. C'est
  // exactement le genre de machine qui tombait en panne de contexte en extrême avec une ombre de 268 Mo.
  const integre = /Intel|UHD|HD Graphics|Iris|AMD Radeon\(TM\) Graphics|Radeon\(TM\) Vega \d+ Graphics|Radeon\(TM\) R\d Graphics|Microsoft Basic|SwiftShader|llvmpipe/i.test(gpu);
  // machine confortable : carte dédiée, assez de mémoire et de coeurs pour encaisser une ombre 8192
  // LOT L12 (01/10) : Haythem joue désormais sur sa RTX 3050 (« ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 Laptop GPU
  // (0x…) Direct3D11 …) »). Une carte dédiée NOMMÉE (NVIDIA, GeForce, RTX, GTX, Quadro, Radeon RX ou Pro) est reconnue
  // costaude sans attendre le nombre de cœurs ni la mémoire annoncée : navigator.deviceMemory n'existe pas partout
  // (Firefox, Safari) et il est plafonné ou arrondi ailleurs ; on garde la seule exigence qui compte pour elle, la
  // taille de texture. Les autres puces gardent l'ancienne règle. La Radeon intégrée (« AMD Radeon(TM)
  // Graphics ») reste intégrée : jamais costaude.
  // `?costaud=1` (ou 0) dans l'adresse force le profil, pour essayer les options des machines costaudes (MSAA de la
  // scène, occlusion du feuillage) sur une autre puce — comme `?tel=1` pour le téléphone.
  // (relecture L12 : les petites cartes d'entrée de gamme — GeForce MX des portables, GeForce GT de bureau — sont bien
  // dédiées, mais plus faibles qu'une puce intégrée récente : elles gardent l'ancienne règle, cœurs et mémoire)
  const dediee = !integre && /NVIDIA|GeForce|RTX|GTX|Quadro|Radeon RX|Radeon Pro/i.test(gpu) && !/GeForce (MX ?\d|GT \d)/i.test(gpu);
  let costaud = !telephone && !integre && maxTex >= 8192 && (dediee || (cores >= 8 && mem >= 8));
  try { const f = new URLSearchParams(location.search).get('costaud'); if (f === '1' || f === '0') costaud = f === '1' && !telephone; } catch (e) { /* pas d'adresse (tests) */ }
  return { gpu, coarse, maxTex, cores, mem, dpr, telephone, integre, dediee, costaud };
}

// FXAA DE LA BASSE, avec le réaffûtage du GradeShader. La basse se rend en direct, sans étalonnage : là où le contexte
// n'a pas de MSAA (téléphones à écran dense, voir js/game.js), elle n'avait AUCUN anticrénelage — le cercle jaune du
// terrain en pointillés, le grillage en escalier. Le FXAA de three (une passe, neuf lectures) lisse les arêtes ; les
// pixels qu'il laisse (pas d'arête : bitume, feuillage, peau) reçoivent le réaffûtage borné par leurs quatre voisins,
// qui rattrape le flou de l'étirement du navigateur. Borné comme dans le GradeShader : jamais de liseré noir.
// Les lectures se font au niveau 0 (textureLod) : la cible n'a pas de mipmaps, et `texture()` dans la boucle de
// recherche d'arête faisait râler le compilateur D3D de Windows (X3595, dérivées indéfinies dans une boucle).
// (06/10/2026) Le GRAIN de l'étalonnage aussi, en dernier, pour la moyenne du téléphone qui passe par ici (voir _fxaaBasse) :
// le même tramage que GradeShader, après le lissage — sans lui le ciel ferait des marches en 8 bits. 0 en basse.
// LA MOYENNE DU TÉLÉPHONE RETROUVE SON PIQUÉ (07/10/2026, régression n° 1 de la v8). Depuis qu'elle passe par ici, elle
// avait perdu 30 % de détail contre la v7 (bitume, feuillage, briques : une image « savonnée »). Trois causes, trois remèdes :
//  - les SEUILS du FXAA de three sont ceux de sa qualité la plus haute (contraste 0,0312, relatif 0,063, sous-pixel 1) : il
//    prenait chaque grain du bitume et chaque feuille pour une arête et les moyennait avec leurs voisins. On prend les
//    seuils par défaut de NVIDIA (0,0833 / 0,166) et un mélange sous-pixel de 0,5 : les vraies arêtes (lignes peintes,
//    fils du grillage, silhouettes) restent lissées, la matière ne l'est plus ;
//  - le RÉAFFÛTAGE borné touche maintenant TOUS les pixels, à pleine force là où le FXAA n'a rien changé, à moitié là où il
//    a mélangé (sinon on rendrait l'escalier qu'il vient d'effacer). Il relit les quatre voisins que le FXAA a déjà lus ;
//  - la CLARTÉ du GradeShader (même formule, même uniforme que lui : le préréglage et le style Photo/Vif la règlent), sur
//    les pixels que le FXAA laisse — sur une arête, elle ne ferait que creuser un liseré.
// Ordre : FXAA → réaffûtage → clarté → grain. LECTURES DE TEXTURE, au pire : 9 (voisinage, dont les quatre couleurs du
// réaffûtage) + 8 (recherche du bout de l'arête : 4 pas de chaque côté au lieu de 6, le dernier plus long) + 1 (le pixel
// lissé) = 18 sur une arête ; 5 (le pixel et ses quatre voisins : les diagonales ne sont lues que sur une arête) + 4
// (clarté) = 9 ailleurs. `uFxaa` à 0 (« Anticrénelage » décoché) : le lissage saute,
// le réaffûtage, la clarté et le grain restent (5 + 4 lectures). `uClarteOn` : la clarté n'est donnée qu'à la moyenne légère
// (téléphone et PC ordinaire, voir _legere ; la basse garde son coût d'avant).
const FXAA_BASSE = {
  name: 'FXAABasse',
  uniforms: { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(1 / 1024, 1 / 512) }, uSharp: { value: 0 },
              uGrain: { value: 0 }, uImage: { value: 0 }, uClarte: { value: 0 }, uClarteOn: { value: 0 }, uFxaa: { value: 1 } },
  vertexShader: FXAAShader.vertexShader,
  fragmentShader: FXAAShader.fragmentShader
    .replace('return texture( tex2D, uv );', 'return textureLod( tex2D, uv, 0.0 );')
    .replace('#define EDGE_STEP_COUNT 6', '#define EDGE_STEP_COUNT 4')
    .replace('#define EDGE_STEPS 1.0, 1.5, 2.0, 2.0, 2.0, 4.0', '#define EDGE_STEPS 1.0, 1.5, 2.0, 4.0')
    .replace('float _ContrastThreshold = 0.0312;', 'float _ContrastThreshold = 0.0833;')
    .replace('float _RelativeThreshold = 0.063;', 'float _RelativeThreshold = 0.166;')
    .replace('float _SubpixelBlending = 1.0;', 'float _SubpixelBlending = 0.5;')
    .replace('uniform vec2 resolution;', `uniform vec2 resolution; uniform float uSharp, uGrain, uImage, uClarte, uClarteOn, uFxaa;
    // les couleurs du pixel et de ses quatre voisins, lues une fois par le voisinage du FXAA et reprises par le réaffûtage
    vec4 _cM; vec3 _cN, _cE, _cS, _cO; bool _lisse = false;
    const vec3 _LUMA = vec3( 0.3, 0.59, 0.11 );`)
    .replace(/l\.m = SampleLuminance\( tex2D, uv \);\s*l\.n = SampleLuminance\( tex2D, texSize, uv,\s*0\.0,\s*1\.0 \);\s*l\.e = SampleLuminance\( tex2D, texSize, uv,\s*1\.0,\s*0\.0 \);\s*l\.s = SampleLuminance\( tex2D, texSize, uv,\s*0\.0, -1\.0 \);\s*l\.w = SampleLuminance\( tex2D, texSize, uv, -1\.0,\s*0\.0 \);/,
      `_cM = Sample( tex2D, uv ); l.m = dot( _cM.rgb, _LUMA );
      _cN = Sample( tex2D, uv + vec2( 0.0, texSize.y ) ).rgb; l.n = dot( _cN, _LUMA );
      _cE = Sample( tex2D, uv + vec2( texSize.x, 0.0 ) ).rgb; l.e = dot( _cE, _LUMA );
      _cS = Sample( tex2D, uv - vec2( 0.0, texSize.y ) ).rgb; l.s = dot( _cS, _LUMA );
      _cO = Sample( tex2D, uv - vec2( texSize.x, 0.0 ) ).rgb; l.w = dot( _cO, _LUMA );`)
    // (07/10/2026) les quatre DIAGONALES ne servent qu'aux pixels lissés (mélange sous-pixel, sens de l'arête) : le test de
    // contraste n'en lit aucune. Lues après lui, elles ne coûtent plus rien aux pixels qu'il laisse passer — presque tous :
    // 4 lectures de moins sur 13. Image identique ; rien de mesurable sur la 660M (son compilateur les déplaçait déjà, même
    // temps en alternance), c'est pour les puces de téléphone, qui ne le font pas toutes.
    .replace(/l\.ne = SampleLuminance\( tex2D, texSize, uv,\s*1\.0,\s*1\.0 \);\s*l\.nw = SampleLuminance\( tex2D, texSize, uv, -1\.0,\s*1\.0 \);\s*l\.se = SampleLuminance\( tex2D, texSize, uv,\s*1\.0, -1\.0 \);\s*l\.sw = SampleLuminance\( tex2D, texSize, uv, -1\.0, -1\.0 \);/,
      'l.ne = 0.0; l.nw = 0.0; l.se = 0.0; l.sw = 0.0;   // (lues plus tard, seulement si le pixel est lissé)')
    .replace(/if \( ShouldSkipPixel\( luminance \) \) \{\s*return Sample\( tex2D, uv \);/, `if ( ShouldSkipPixel( luminance ) ) {
        return _cM;`)
    .replace('float pixelBlend = DeterminePixelBlendFactor( luminance );', `_lisse = true;
      luminance.ne = SampleLuminance( tex2D, texSize, uv,  1.0,  1.0 ); luminance.nw = SampleLuminance( tex2D, texSize, uv, -1.0,  1.0 );
      luminance.se = SampleLuminance( tex2D, texSize, uv,  1.0, -1.0 ); luminance.sw = SampleLuminance( tex2D, texSize, uv, -1.0, -1.0 );
      float pixelBlend = DeterminePixelBlendFactor( luminance );`)
    .replace('gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );', `vec2 tx = resolution.xy;
      vec4 c;
      if ( uFxaa > 0.5 ) c = ApplyFXAA( tDiffuse, tx, vUv );
      else {
        _cM = Sample( tDiffuse, vUv ); c = _cM;
        _cN = Sample( tDiffuse, vUv + vec2( 0.0, tx.y ) ).rgb; _cE = Sample( tDiffuse, vUv + vec2( tx.x, 0.0 ) ).rgb;
        _cS = Sample( tDiffuse, vUv - vec2( 0.0, tx.y ) ).rgb; _cO = Sample( tDiffuse, vUv - vec2( tx.x, 0.0 ) ).rgb;
      }
      if ( uSharp > 0.002 ) {
        // ce que le FXAA a déplacé : 0 = pixel intact (pleine force), 1 = pixel mélangé (moitié)
        vec3 dfx = abs( c.rgb - _cM.rgb );
        float k = uSharp * 2.0 * mix( 1.0, 0.5, smoothstep( 0.004, 0.03, max( max( dfx.r, dfx.g ), dfx.b ) ) );
        vec3 mn = min( min( _cN, _cS ), min( _cE, _cO ) ), mx = max( max( _cN, _cS ), max( _cE, _cO ) );
        c.rgb = clamp( c.rgb + ( c.rgb - ( _cN + _cS + _cE + _cO ) * 0.25 ) * k, min( mn, c.rgb ), max( mx, c.rgb ) );
      }
      if ( uClarte * uClarteOn > 0.0 && !_lisse ) {
        vec2 t = tx * 3.0;
        vec3 f = Sample( tDiffuse, vUv + t ).rgb + Sample( tDiffuse, vUv - t ).rgb
               + Sample( tDiffuse, vUv + vec2( t.x, -t.y ) ).rgb + Sample( tDiffuse, vUv + vec2( -t.x, t.y ) ).rgb;
        c.rgb += clamp( dot( c.rgb - f * 0.25, vec3( 0.2126, 0.7152, 0.0722 ) ), -0.05, 0.05 ) * uClarte * uClarteOn * 2.0;
      }
      gl_FragColor = c;
      if ( uGrain > 0.0 ) {
        float n = fract( 52.9829189 * fract( dot( gl_FragCoord.xy + 5.588238 * uImage, vec2( 0.06711056, 0.00583715 ) ) ) );
        float Yg = clamp( dot( gl_FragColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ), 0.0, 1.0 );
        gl_FragColor.rgb += ( n - 0.5 ) * uGrain * ( 0.25 + 3.0 * Yg * ( 1.0 - Yg ) );
      }`),
};
// (chaque retouche vérifiée : si le FXAA de three a changé, on le dit au lieu de lisser autrement sans prévenir)
for (const [k, txt] of [['seuils', 'float _ContrastThreshold = 0.0833;'], ['seuil relatif', 'float _RelativeThreshold = 0.166;'], ['sous-pixel', 'float _SubpixelBlending = 0.5;'],
  ['pas', '#define EDGE_STEP_COUNT 4'], ['voisins', '_cM = Sample( tex2D, uv ); l.m'], ['saut', 'return _cM;'], ['mélange', '_lisse = true;'], ['réaffûtage', 'float k = uSharp'], ['diagonales', 'l.ne = 0.0;']]) {
  if (!FXAA_BASSE.fragmentShader.includes(txt)) console.warn('[fx] FXAAShader a changé : retouche « ' + k + ' » du FXAA de la basse non posée');
}

// Moyenne d'intervalles TRIÉS, sans les 10 % les plus lents : un à-coup (chargement, ramasse-miettes) ne doit pas
// décider du verdict de la sonde de gain de la résolution dynamique.
function moyenneRognee(s) {
  const n = Math.max(1, Math.floor(s.length * 0.9));
  let t = 0;
  for (let i = 0; i < n; i++) t += s[i];
  return t / n;
}

// Les intervalles de la DERNIÈRE seconde d'une fenêtre (rangée dans l'ordre des images), triés. C'est la référence
// « à 100 % » de la sonde de gain : la fenêtre de 2 s qui la déclenche (médiane au-dessus du seuil) peut encore
// contenir, pour près de moitié, des images d'AVANT la charge — une balade légère, puis un match lourd. Leur moyenne
// abaissait la référence, et 80 % paraissait ne rien gagner (gain négatif mesuré) : la résolution était figée à tort,
// et pour 30 jours.
function derniereSeconde(f) {
  const r = [];
  for (let i = f.length - 1, s = 0; i >= 0 && s < 1000; i--) { r.push(f[i]); s += f[i]; }
  return r.sort((a, b) => a - b);
}

// La médiane des `n` dernières valeurs d'une fenêtre (sans la trier sur place).
function medianeFin(a, n) {
  const s = a.slice(-Math.max(1, n)).sort((x, y) => x - y);
  return s[s.length >> 1];
}

const CLE_PLANTAGE = 'hoops.fx.contextePerdu';
// verdicts de la sonde de gain de la résolution dynamique. (07/10/2026) « 2 » : la sonde juge désormais au temps de la
// carte graphique (voir _majDynamique) ; les anciens verdicts, rendus sur des intervalles d'écran, sont oubliés — sur la
// Radeon 660M ils figeaient la moyenne à 100 % (« 80 % ne fait gagner que 9 % ») alors qu'elle y gagne 22 à 27 %.
const CLE_FIGEES = 'hoops.fx.resolutionFigee2';
// LE BUDGET D'UNE IMAGE (07/10/2026) : 45 im/s, ce qu'une puce intégrée doit tenir au PLANCHER de la résolution dynamique
// avant qu'on lui retire un préréglage ; `F_PIX` : la part du coût d'une image qui suit le nombre de pixels, tant que la
// sonde de gain ne l'a pas mesurée (0,75 mesuré sur la Radeon 660M en haute comme en moyenne).
const BUDGET_IMAGE = 1000 / 45;
const F_PIX = 0.6;
const CARTES_ANISO = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];   // setAniso, _anisoRetard
// Les defines qu'un terrain retire sous « haute » (js/court.js immeubleQualite : IMM_DETAIL, retiré quand
// scene.userData.meteoQualite < 1) : la précompilation du préréglage de repli les retire aussi (avecRepli).
const DEFINES_HAUTE = ['IMM_DETAIL'];
const COUCHE_BLANC = 30;   // la couche de l'image à blanc (imageABlanc) ; 6 et 7 servent déjà (js/monde_ombres.js, js/ombres_contact.js)
const AUCUN = [];          // (liste vide partagée : rien à allouer)


// Shader du reflet au sol. Celui d'origine renvoie le reflet en opaque ; ici on veut un VERNIS : le bitume
// reste visible dessous, et le reflet n'apparaît que là où il y a de l'eau. `uOpac` vient de la météo
// (0 par temps sec, 1 sous la pluie) et le bruit dessine des flaques plutôt qu'une patinoire uniforme.
const RefletShader = {
  name: 'RefletSol',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uOpac: { value: 0 } },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vW;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4( position, 1.0 );
      vW = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform float uOpac;
    varying vec4 vUv;
    varying vec3 vW;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      vec4 base = texture2DProj( tDiffuse, vUv );
      // FRESNEL. C'est LUI qui fait la différence entre « bitume mouillé » et « patinoire ». Une flaque vue de
      // haut est presque transparente (on voit le bitume à travers), vue de biais elle devient un miroir. Sans
      // ce terme le terrain renvoyait tout, partout, avec la même force : les lignes rouges disparaissaient
      // sous le reflet. Ici, le sol juste devant les pieds reste du bitume, et c'est le fond du terrain qui
      // renvoie les arbres et les immeubles — exactement ce qu'on voit sur une photo de rue sous la pluie.
      vec3 V = normalize( cameraPosition - vW );
      float f = pow( 1.0 - clamp( V.y, 0.0, 1.0 ), 3.0 );
      float fresnel = 0.14 + 0.86 * f;
      // creux et bosses du bitume : deux ondes croisées suffisent à faire des flaques qui ne se répètent pas
      float n = sin( vW.x * 0.63 ) * sin( vW.z * 0.47 )
              + 0.6 * sin( vW.x * 1.9 + 1.7 ) * sin( vW.z * 1.31 - 0.9 );
      float flaque = smoothstep( -0.35, 0.75, n );
      // le reflet est toujours un peu plus sombre que ce qu'il reflète (l'eau absorbe)
      gl_FragColor = vec4( base.rgb * color * 0.88, uOpac * fresnel * ( 0.22 + 0.78 * flaque ) );
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

// Une carte d'ombre de soleil ne dépend que de la lumière et des objets, jamais de la caméra : les rendus annexes
// d'une même image (normales de l'occlusion, reflet du sol) réutilisent celle de la passe principale.
function sansRecalculOmbres(renderer, rendu) {
  const auto = renderer.shadowMap.autoUpdate;
  renderer.shadowMap.autoUpdate = false;
  try { return rendu(); } finally { renderer.shadowMap.autoUpdate = auto; }
}

export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.scene = scene; this.camera = camera;
    this.quality = 'high'; this.enabled = true;
    this.dev = sonderMateriel(renderer);
    // l'ombre du décor gardée en cache, les mobiles seuls redessinés (js/ombre_cache.js ; ?ombrecache=0 pour comparer)
    this.ombreCache = new OmbreCache(renderer, scene, camera);
    try { this.ombreCacheOff = new URLSearchParams(location.search).get('ombrecache') === '0'; } catch (e) { this.ombreCacheOff = false; }
    const w = window.innerWidth, h = window.innerHeight;
    this.composer = new EffectComposer(renderer);
    // (une RenderPass qui sait rendre la scène en MSAA x4 sur une machine costaude : js/options_rendu.js, _majMSAA)
    this.renderPass = new PasseSceneMSAA(scene, camera);
    this.gtao = new GTAOPass(scene, camera, w, h);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.blendIntensity = 0.85;
    this.gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.0, scale: 1.2, samples: 12, distanceFallOff: 1.0, screenSpaceRadius: false });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 12 });
    // L'OCCLUSION EN DEMI-RÉSOLUTION (07/10/2026). Mesurée sur la Radeon 660M en haute (1792x1008) : 12,3 ms pour la seule
    // passe d'occlusion — la scène redessinée en normales, puis le GTAO et son débruitage, chacun sur 1,8 million de pixels.
    // Une occlusion ambiante est une ombre DOUCE, à basse fréquence par nature : calculée sur un pixel sur quatre et
    // étirée en bilinéaire au mélange, elle ne se distingue pas — sauf d'un liseré d'un pixel au bord des silhouettes,
    // vérifié à 2x sur la vue du joueur. composer.setSize redimensionne toutes les passes à chaque changement de résolution :
    // c'est donc ICI, à la source, que la taille est divisée par deux. Pleine résolution seulement en ultra et extrême d'une
    // machine costaude (`_aoPleine`, setQuality), qui ont le temps.
    this._aoPleine = false;
    const tailleAO = this.gtao.setSize.bind(this.gtao);
    this.gtao.setSize = (w, h) => { const k = this._aoPleine ? 1 : 0.5; tailleAO(Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))); };
    // ET MÉLANGÉE SUR PLACE : la sortie de three recopiait toute l'image dans l'autre tampon, puis y multipliait l'occlusion
    // (deux plein écran). On la multiplie directement sur l'image de la scène (même mélange, DstColor x AO), sans échange
    // de tampons : un plein écran de moins (~0,5 ms à 1,8 Mpx sur la 660M).
    this.gtao.output = GTAOPass.OUTPUT.Off;
    this.gtao.needsSwap = false;
    const rendreAO = this.gtao.render.bind(this.gtao);
    this.gtao.render = (renderer, writeBuffer, readBuffer, dt, mask) => {
      rendreAO(renderer, writeBuffer, readBuffer, dt, mask);          // normales, occlusion, débruitage (sortie coupée)
      const m = this.gtao.blendMaterial;
      m.uniforms.intensity.value = this.gtao.blendIntensity;
      m.uniforms.tDiffuse.value = this.gtao.pdRenderTarget.texture;
      this.gtao.renderPass(renderer, m, readBuffer);
    };
    this.bloom =new UnrealBloomPass(new THREE.Vector2(w, h), 0.16, 0.5, 0.92);
    this.grade = new ShaderPass(GradeShader);
    this.smaa = new SMAAPass(w, h);
    this.output = new OutputPass();
    // L'exposition de l'œil se fait DANS OutputPass, sur le HDR et avant ACES/AgX, jamais dans GradeShader (déjà en sRGB).
    const S = this.output;
    if (!poserOeil(S)) console.warn('[fx] OutputShader a changé : adaptation de l\'œil inactive');
    this.oeil = new PasseOeil(S, renderer.extensions.has('EXT_color_buffer_float'));
    this._t0 = performance.now();
    // BLOOM À SEUIL PROGRESSIF : la coupure nette (smoothWidth 0,01) faisait scintiller les grains clairs et les reflets
    // qui franchissent 0,92 ; de 0,92 à 1,37, le halo monte doucement. Les deux niveaux les plus larges tirent sur le
    // chaud : la lumière diffusée dans une optique perd du bleu.
    this.bloom.highPassUniforms.smoothWidth.value = 0.45;
    this.bloom.bloomTintColors[3].set(1.0, 0.95, 0.87); this.bloom.bloomTintColors[4].set(1.0, 0.9, 0.78);
    // La passe de normales de l'occlusion redessine toute la scène, et three.js refait alors la carte d'ombre
    // au passage — identique à celle que la passe principale vient de calculer, et inutile ici (MeshNormalMaterial
    // ne lit pas les ombres). Elle coûtait à elle seule ~250 appels de dessin par image.
    const normales = this.gtao.renderOverride.bind(this.gtao);
    // Le feuillage déclaré par un terrain (scene.userData.feuillages : des plans à découpe alpha) est masqué
    // pendant la passe de normales : MeshNormalMaterial ignore la découpe et le dessinait en carrés pleins,
    // l'occlusion en faisait des damiers sombres. Sans effet sur les terrains qui n'en déclarent pas.
    // On rend à chacun sa visibilité d'avant (l'ancien code remettait `visible = true` de force, y compris sur un
    // objet que le jeu avait caché). La liste : voir _decoupes. Les objets marqués `userData.sansNormales` (les
    // filets des paniers : des cordes de 3 mm) sont cachés de la même façon : l'occlusion calculée sur eux les
    // rendait gris « chaîne », et leur profondeur posait une auréole sombre sur la planche.
    // try/finally : si le rendu des normales lève une erreur, rien ne doit rester caché pour de bon.
    // (06/10/2026) Sans rien allouer à chaque image (un tableau des visibilités gardé), et SANS REMETTRE À JOUR LES
    // MATRICES de toute la scène : la passe principale vient de le faire dans la même image, rien n'a bougé depuis
    // (2 500 objets à La Cage, 0,65 ms mesurées par parcours sur PC — bien plus sur une puce de téléphone).
    const vis = [];
    this.gtao.renderOverride = (renderer, mat, cible, couleur, alpha) => sansRecalculOmbres(renderer, () => {
      const f = mat === this.gtao.normalMaterial ? this._decoupes() : AUCUN;
      vis.length = f.length;
      for (let i = 0; i < f.length; i++) { vis[i] = f[i].visible; f[i].visible = false; }
      const majAuto = this.scene.matrixWorldAutoUpdate;
      this.scene.matrixWorldAutoUpdate = false;
      try { normales(renderer, mat, cible, couleur, alpha); }
      finally { this.scene.matrixWorldAutoUpdate = majAuto; for (let i = 0; i < f.length; i++) f[i].visible = vis[i]; }
      // LOT L12 : le massif d'arbustes du pin, et lui seul (liste explicite), redessiné DÉCOUPÉ dans la même cible :
      // il reçoit enfin de l'occlusion (machine costaude, option « Occlusion du feuillage » : _aoFeuillage)
      if (this._aoFeuillage && mat === this.gtao.normalMaterial) normalesFeuillage(renderer, this.scene, this.camera, cible);
    });
    // (06/10/2026) Pour cacher les points et les lignes de sa passe de normales, GTAOPass parcourait DEUX fois toute la
    // scène à chaque image, une Map remplie puis relue pour 2 500 objets : on ne touche plus qu'à eux, relevés toutes les
    // 2 s (la pluie, quelques fils), comme les découpes de _decoupes.
    const visPL = [];
    this.gtao.overrideVisibility = () => {
      const L = this._pointsLignes();
      visPL.length = L.length;
      for (let i = 0; i < L.length; i++) { visPL[i] = L[i].visible; L[i].visible = false; }
    };
    this.gtao.restoreVisibility = () => { const L = this._pl || AUCUN; for (let i = 0; i < L.length && i < visPL.length; i++) L[i].visible = visPL[i]; };
    // ORDRE DES PASSES. Le SMAA passe AVANT l'étalonnage : il doit lire l'image telle que la scène l'a rendue, pas
    // après le grain et la clarté. Dans l'ordre inverse, il prenait le grain (qui change à chaque image) pour des bords
    // et fabriquait des pointillés grouillants le long des lignes fines, des bords en peigne sur les silhouettes
    // (V_autres/jem_pointilles_correctif.jpg). Le réaffûtage, la clarté et le grain s'appliquent donc sur une image déjà
    // lissée : c'est le bon ordre, et il ne coûte rien de plus.
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.gtao);
    this.composer.addPass(this.oeil);        // mesure APRÈS l'occlusion, avant le bloom
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.output);
    // (la sortie de la BASSE, étalonnage compris, à la place de la précédente quand l'option le veut : _fxaaBasse ; elle
    // porte aussi l'œil, pour la moyenne du téléphone qui passe par elle)
    this.sortieBasse = sortieEtalonnee(this.grade);
    poserOeil(this.sortieBasse, S);
    // LA SORTIE EN 8 BITS (07/10/2026). Sur le chemin léger (moyenne du téléphone et du PC ordinaire, basse étalonnée
    // lissée), la sortie étalonnée écrit une image DÉJÀ en sRGB, entre 0 et 1, que seul le FXAA relit — l'écran la recevra
    // en 8 bits de toute façon. Le demi-flottant du composer (8 octets par pixel) doublait son écriture et les lectures du
    // FXAA : une cible à 8 bits par canal (`_rt8`, créée par _fxaaBasse là où elle sert, à la taille du composer) fait
    // gagner ~9 % du post-traitement, mesuré en alternance image par image (téléphone 1110 x 540 sur la 660M, œil + sortie +
    // FXAA : 0,62 -> 0,57 ms et 0,69 -> 0,63 selon la vue). Le FXAA ne la lit que si la sortie vient d'y écrire dans la
    // même image (`_plein8`, voir _creerFxaa). Écarts avec le demi-flottant : ±1 niveau sur 96 % des pixels, sans biais
    // (tramage avant l'arrondi : js/options_rendu.js uTrame).
    this._rt8 = null; this._sortie8 = false; this._plein8 = false; this._t8 = [1, 1];
    const S8 = this.sortieBasse, rendreS8 = S8.render.bind(S8);
    S8.setSize = (w, h) => { this._t8 = [w, h]; if (this._rt8) this._rt8.setSize(w, h); };
    S8.render = (renderer, writeBuffer, readBuffer, dt, mask) => {
      const huit = this._sortie8 && !!this._rt8 && !S8.renderToScreen;
      if (S8.uniforms.uTrame) S8.uniforms.uTrame.value = huit ? 1 / 255 : 0;   // tramée avant l'arrondi (js/options_rendu.js)
      rendreS8(renderer, huit ? this._rt8 : writeBuffer, readBuffer, dt, mask);
      this._plein8 = huit;
    };
    this.composer.addPass(this.sortieBasse);
    this.composer.addPass(this.smaa);
    this.composer.addPass(this.grade);
    // mesure de performance pour le choix automatique de la qualité
    this.auto = true; this._ech = []; this._decided = false; this._last = performance.now(); this._t = 0;
    this.flash = 0; this.heat = 0;
    this.rays = 0; this.exposure = 1; this._sunNdc = new THREE.Vector3();
    // saturation et vignette de l'étalonnage, reposées à chaque image par la météo (js/weather.js : un terrain
    // peut les retoucher, le parc de Bécon un soir pâle) ; ces valeurs de départ sont celles de toujours
    this.sat = 1.08; this.vig = 0.32;
    this._avant = new THREE.Vector3();          // direction du regard, pour la perspective aerienne
    this._teinte = new THREE.Color();
    // options utilisateur (menu Options > Graphismes)
    this.scale = 1; this.aoOn = true; this.bloomOn = true; this.aaOn = true; this.shadows = 'high';
    // résolution dynamique : facteur appliqué par-dessus le préréglage, ajusté en continu d'après les FPS
    this.dyn = 1; this._dynT = 0; this._fen = []; this._curRatio = 0; this._souffrance = 0;
    // le coût des images (voir _cout) : temps de la carte graphique et du processeur, par fenêtre de décision
    this._gpuFen = []; this._cpuFen = []; this._genCout = 0;
    // précompilation du préréglage de repli (avecRepli) : `compilerTout(objet)` est posé par js/game.js
    this.compilerTout = null; this._tRepli = 2;
    this._surveillerContexte();
    console.info('[fx] matériel :', this.dev.gpu || 'inconnu', '· coeurs', this.dev.cores, '· mém', this.dev.mem, 'Go',
      '· texture max', this.dev.maxTex, '· dpr', this.dev.dpr.toFixed(2), this.dev.telephone ? '· TÉLÉPHONE' : this.dev.costaud ? '· machine costaude' : '');
    // (07/10/2026) la même information que le bandeau des Options (js/ui.js) : le navigateur calcule sur la puce intégrée
    if (this.dev.integre && !this.dev.telephone && typeof navigator !== 'undefined' && /Windows/.test(navigator.userAgent || '')) {
      console.info('[fx] puce graphique INTÉGRÉE en service. Si le PC a une carte dédiée : Paramètres Windows › Système › Écran › Graphiques › le navigateur › Options › Hautes performances, puis relancer le navigateur (carte NVIDIA : Processeur graphique préféré › NVIDIA).');
    }
  }

  // Une perte de contexte WebGL, c'est l'écran noir définitif : le pilote a rendu les armes (mémoire épuisée
  // le plus souvent). On la retient dans localStorage pour ne PAS relancer le même préréglage au redémarrage.
  _surveillerContexte() {
    const cv = this.renderer.domElement;
    cv.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      try { localStorage.setItem(CLE_PLANTAGE, this.quality); } catch (err) { /* stockage indisponible */ }
      console.error('[fx] contexte WebGL perdu en qualité', this.quality, '— au prochain démarrage on repartira plus bas.');
      document.dispatchEvent(new CustomEvent('hoops-gpu-perdu', { detail: { quality: this.quality } }));
    }, false);
    cv.addEventListener('webglcontextrestored', () => {
      console.warn('[fx] contexte WebGL rétabli — on redescend en « moyenne ».');
      // (06/10/2026) three renvoie textures, maillages et programmes de lui-même, mais le CONTENU des cibles est perdu : le
      // cache de l'ombre du décor, la carte d'environnement prise sur place, celle du dégradé, sont à refaire
      this.ombreCache.pret = false; this.envMap = null; this._aniso = null;
      this.scene.userData.envTerrain?.capturer?.(this.renderer);
      this.setQuality('medium');
      document.dispatchEvent(new CustomEvent('hoops-gpu-retabli'));
    }, false);
  }

  // Le préréglage demandé a-t-il déjà fait tomber le contexte sur CETTE machine ?
  _dejaPlante(q) {
    let v = null;
    try { v = localStorage.getItem(CLE_PLANTAGE); } catch (e) { return false; }
    if (!v) return false;
    const ordre = ['low', 'medium', 'high', 'ultra', 'extreme'];
    return ordre.indexOf(q) >= ordre.indexOf(v);
  }
  oublierPlantage() { try { localStorage.removeItem(CLE_PLANTAGE); } catch (e) { /* rien à faire */ } }

  // applique les réglages du menu (settings.graphics) ; 'auto' = sonde matérielle puis mesure des FPS
  applyGraphics(g) {
    poserOptions(g);                    // lot L12 : MSAA, occlusion du feuillage, décor, basse étalonnée, sonde (setQuality les applique)
    this.scale = g.scale ?? 1; this.aoOn = g.ao !== false; this.bloomOn = g.bloom !== false; this.aaOn = g.aa !== false; this.shadows = g.shadows || 'high';
    this.renderer.toneMapping = g.tonemap === 'agx' ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;   // lu par OutputPass
    this.agx = g.tonemap === 'agx';
    this.vif = (g.look || 'photo') === 'vif';   // l'image VIVE (voir render) ; 'photo' (par défaut) = l'étalonnage calé sur les photos
    this.res = g.res || 'auto'; this.sharp = g.sharp === undefined ? 0.35 : g.sharp;
    this._curRatio = 0;                 // la resolution a peut-etre change : on force le recalcul
    if (g.quality === 'auto' || !g.quality) {
      this.setQuality(this.presetDepart());
      this.auto = true; this._decided = false; this._descendu = false; this._ech = []; this._t = 0; this._last = performance.now(); this._razCout();
    } else {
      this.setQuality(g.quality);
      this.auto = false;
    }
  }

  // Préréglage de DÉPART en mode auto : on ne commence plus en « high » pour tout le monde. Un téléphone qui
  // démarre en high passe ses premières secondes à 8 im/s (c'est-à-dire au bord du plantage) avant même d'avoir
  // pu mesurer quoi que ce soit.
  presetDepart() {
    const d = this.dev;
    if (d.telephone) return d.cores >= 6 && d.mem >= 4 ? 'medium' : 'low';
    if (d.cores <= 4 || d.mem <= 4) return 'medium';
    return d.costaud ? 'ultra' : 'high';       // carte dédiée : on part du haut, la mesure redescend si besoin
  }

  // Plafond RÉEL de la machine. Sert à deux choses : empêcher « extrême » de tuer un téléphone, et griser les
  // boutons correspondants dans le menu Options.
  plafond() {
    const d = this.dev;
    if (d.maxTex < 4096) return 'medium';      // puce très ancienne : le reste ne s'affichera pas correctement
    if (d.telephone) return 'high';            // un téléphone peut TENTER high ; ultra/extrême = 3 rendus de scène en plus, non
    return 'extreme';                          // sur PC, EXTRÊME reste accessible : c'est le budget en pixels et la
                                               // résolution dynamique qui l'empêchent de faire tomber la machine,
                                               // pas une interdiction.
  }
  static RefletShader = RefletShader;
  // Les deux couleurs de l'air : celle qu'il prend a contre-jour, celle qu'il prend dos au soleil.
  static AIR_CHAUD = new THREE.Color(0xffe8c4);
  static AIR_FROID = new THREE.Color(0xa6c2e6);

  static ORDRE = ['low', 'medium', 'high', 'ultra', 'extreme'];
  // rayon angulaire du soleil pour les ombres douces : 1,6 fois le vrai (0,27°), la brume élargit le disque
  static RAYON_SOLEIL = 0.0075;
  disponible(q) { return PostFX.ORDRE.indexOf(q) <= PostFX.ORDRE.indexOf(this.plafond()); }

  // Les réglages de chaque préréglage, au même endroit pour qu'on les compare d'un coup d'œil.
  //  `prMax` = densité de pixels maximale ; `px` = BUDGET en pixels du tampon interne (le vrai garde-fou :
  //  au-delà, la VRAM explose et le contexte WebGL tombe) ; `ombre` = carte d'ombre souhaitée, bornée ensuite
  //  par la puce ; `span` = demi-largeur de la caméra d'ombre — la resserrer rend les ombres plus fines SANS
  //  agrandir la texture ; `refl` = largeur de la texture du reflet au sol, 0 = pas de reflet.
  //
  //  La carte d'ombre d'extrême repasse de 8192 à 4096. Une carte 8192² pèse 268 Mo et quatre fois plus de
  //  remplissage, pour une finesse qu'on obtient bien mieux en RESSERRANT la caméra d'ombre : 4096 sur 18 m
  //  donne 114 texels par mètre, contre 79 en ultra et 93 pour l'ancien 8192 sur 22 m. Extrême est donc à la
  //  fois PLUS fin qu'avant et quatre fois moins cher.
  //
  //  Basse : `prMaxTel` = densité maximale SUR TÉLÉPHONE (1,3 : à dpr 2,6, 1,0 étirait l'image x2,6) ; `fxaa` = lissage
  //  FXAA quand le contexte n'a pas de MSAA (voir _fxaaBasse).
  //  `ventOmbre` (07/10/2026) = cadence de l'ombre des feuillages au vent, en images (js/ombre_cache.js) : 0 figée, 1 à
  //  chaque image (machine costaude seulement, sinon 3), 3 une image sur trois. Toujours 0 au téléphone.
  //  `ao: 'demi'` = occlusion sur PC seulement (jamais au téléphone) ; `aoD` = échantillons du débruitage.
  //  `penombre` (07/10/2026) = la pénombre des ombres douces (rayon de recherche des bloqueurs ET largeur du filtre), en
  //  part de celle du vrai disque du soleil. En moyenne (carte de 2048, 34 texels par mètre, 6 bloqueurs et 8 lectures),
  //  la pénombre physique des platanes (8 à 15 m sous les feuilles : ~2,5 texels) fondait les trouées du feuillage en
  //  taches molles, là où la moyenne de la v7 (PCF de three, rayon 1,5) dessinait des feuilles nettes (juge) : 0,55 la
  //  ramène à ~1,4 texel sous les arbres ; l'ombre d'un immeuble garde un bord doux. 1 ailleurs.
  // l'image vive (voir render) : ce qu'elle ajoute à la saturation, à la courbe et au micro-contraste
  // (05/10 : comparés côte à côte à +0,16, +0,30 et +0,45 ; +0,16 ne se voyait pas, +0,45 tirait sur le criard)
  // (05/10, v6.9 : 0,28 / 0,34 / 0,28 -> 0,14 / 0,18 / 0,16 — « une lumière naturelle » : relevé, sans forcer)
  // (06/10/2026 : `ciel`, la force du ciel de Paris — voir GradeShader)
  static VIF = { sat: 0.14, courbe: 0.18, clarte: 0.16, ciel: 1 };
  // LE STYLE PHOTO, RÉALISTE (07/10/2026, régression n° 2 de la v8). Photo est devenu le style par défaut, et il rendait
  // l'étalonnage d'origine, calé sur des photos prises sous un ciel GRIS : juste, mais terne et plat à l'écran — « les
  // graphismes sont moins bien ». Une photo d'appareil par grand soleil a un peu plus de couleur, une courbe un peu plus
  // franche et du micro-contraste (gravillons, écorce, plis) : c'est ce qu'il reçoit ici, nettement moins que Vif — Vif
  // reste le cran au-dessus. Pas de ciel de Paris (`ciel` 0) : le ciel est corrigé à sa source, le dôme (lot B) ; le
  // corriger aussi ici le corrigerait deux fois. Coût nul : les mêmes uniformes de la même passe.
  // Réglé avec l'exposition du grand soleil (js/weather.js, 1,10 -> 1,24), vue TV de La Cage en haute contre la v8 : détail
  // x1,13, saturation x1,07, luminance moyenne x1,08, 95e centile +10 niveaux, rapport bitume au soleil / à l'ombre
  // inchangé (-0,7 %) ; en moyenne, détail x1,25. (Une clarté de 0,10, d'abord essayée, donnait x1,17 : un début de dureté, on reste sous x1,16.)
  // (07/10/2026, plus tard : le grand soleil est passé à 2,4 et l'exposition à 1,16, la carte d'environnement relevée de
  // 12 % puis ramenée à 1, 1,05 au téléphone — js/weather.js, retours des juges : contraste soleil / ombre et moyenne du
  // téléphone ; le style Photo n'a pas bougé.)
  static PHOTO = { sat: 0.10, courbe: 0.06, clarte: 0.06, ciel: 0 };
  // Le gain du HDR de la moyenne légère (sortie étalonnée, avant ACES) : l'énergie que le bloom ajoutait à l'image en v7,
  // et qu'elle a perdue avec lui en v8 (bitume de la vue TV 0,265 → 0,244 de luminance moyenne au téléphone). Sur PC, la
  // moyenne légère rend avec lui la luminance de la haute à 0,5 % près (vue TV : 0,274 contre 0,276).
  // (07/10/2026, juge : la moyenne du téléphone 44 à 48 % plus claire que la v7) PLUS DE GAIN NULLE PART. Ce 1,06 avait été
  // calé sans la sonde de lumière de La Cage (lot B, js/sonde_ciel.js), qui éclaire désormais la moyenne sans carte
  // d'environnement — téléphone ET PC ordinaire — à la hauteur de la haute : avec elle, la moyenne du PC sortait 4 à 5 %
  // plus claire que la haute (vue TV 76,1 contre 72,5), et le téléphone empilait ce gain sur l'exposition et la sonde.
  // Gardé par appareil (`tel`, `pc`) pour le recaler si la lumière de la moyenne change encore.
  static GAIN_LEGERE = { tel: 1.0, pc: 1.0 };
  static PRESETS = {
    low:     { prMax: 1.0,  px: 1.15e6, ao: false, aoS: 8,  bloom: false, refl: 0,    env: false, douces: false, ombre: 1024, span: 26, meteo: 0.5, aniso: 2,  decor: false, smaa: false, cadOmbre: 2, oeil: 0, grain: 0, clarte: 0, prMaxTel: 1.3, fxaa: true, ventOmbre: 0 },
    medium:  { prMax: 1.5,  px: 2.20e6, ao: false, aoS: 12, bloom: true,  refl: 0,    env: false, douces: false, ombre: 2048, span: 30, meteo: 0.8, aniso: 4,  decor: false, smaa: true, oeil: 0.35, grain: 0.012, clarte: 0.08, ventOmbre: 3, penombre: 0.55 },
    high:    { prMax: 2.0,  px: 3.40e6, ao: true,  aoS: 12, bloom: true,  refl: 0,    env: true,  douces: true,  ombre: 3072, span: 30, meteo: 1.0, aniso: 8,  decor: true,  smaa: true, oeil: 0.5, grain: 0.025, clarte: 0.2, ventOmbre: 3 },
    ultra:   { prMax: 2.0,  px: 5.00e6, ao: true,  aoS: 20, bloom: true,  refl: 512,  env: true,  douces: true,  ombre: 4096, span: 26, meteo: 1.6, aniso: 16, decor: true,  smaa: true, oeil: 0.5, grain: 0.03, clarte: 0.25, ventOmbre: 1 },
    extreme: { prMax: 2.6,  px: 7.20e6, ao: true,  aoS: 32, bloom: true,  refl: 1024, env: true,  douces: true,  ombre: 4096, span: 18, meteo: 2.2, aniso: 16, decor: true,  smaa: true, oeil: 0.5, grain: 0.03, clarte: 0.25, ventOmbre: 1 },
  };

  setQuality(q, silencieux = false) {
    // garde-fous : plafond matériel, et préréglage qui a déjà fait tomber le contexte sur cette machine
    let dem = q;
    if (!PostFX.PRESETS[q]) q = 'high';
    if (!this.disponible(q)) q = this.plafond();
    if (this._dejaPlante(q)) {
      const i = Math.max(0, PostFX.ORDRE.indexOf(q) - 1);
      q = PostFX.ORDRE[i];
      this.oublierPlantage();
      console.warn('[fx] ce préréglage avait fait tomber le contexte WebGL ici : on descend à', q);
    }
    if (dem !== q && !silencieux) {
      document.dispatchEvent(new CustomEvent('hoops-qualite-bridee', { detail: { demande: dem, applique: q, plafond: this.plafond() } }));
    }
    this.quality = q; this.auto = false;
    const P = PostFX.PRESETS[q];
    const r = this.renderer;

    // (07/10/2026) l'occlusion en DEMI-RÉSOLUTION partout, sauf ultra et extrême d'une machine costaude (voir le
    // constructeur, gtao.setSize) ; `ao: 'demi'` (moyenne) : sur PC seulement, jamais au téléphone
    this._aoPleine = !!this.dev.costaud && (q === 'ultra' || q === 'extreme');
    this.gtao.enabled = !!P.ao && this.aoOn && !(P.ao === 'demi' && this.dev.telephone);
    ECLAIRAGE.uAOForce.value = this.gtao.enabled ? 0.5 : 0.85;      // GTAO creuse déjà : l'occlusion du corps ne double pas
    ECLAIRAGE.uPeauWrap.value.set(0.28, 0.11, 0.06).multiplyScalar(q === 'low' ? 0.5 : 1);
    this.oeil.enabled = P.oeil > 0; this.output.uniforms.uOeil.value.x = P.oeil || 0; this.reAdapter();
    // (la moyenne du téléphone prend le chemin léger, sans bloom ni SMAA : voir _fxaaBasse)
    this.bloom.enabled = P.bloom && this.bloomOn && !this._legere(q);
    this.smaa.enabled = this.aaOn && P.smaa !== false && !this._legere(q);
    this.enabled = q !== 'low';
    if (this.gtao.enabled) {
      this.gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.0, scale: 1.2, samples: P.aoS, distanceFallOff: 1.0, screenSpaceRadius: false });
      this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: P.aoD || Math.min(16, P.aoS) });
    }
    this.setReflet(P.refl || 0);
    this.renderPass.enabled = true;     // plus personne ne refait le rendu de scène à notre place
    this.setEnv(P.env || this.envMoyenne(q));
    this.scene.userData.meteoQualite = P.meteo;      // js/weather.js s'en sert pour la densité de pluie
    this.scene.userData.qualite = q;                 // le parc entier (js/monde_charge.js) : distances, budgets, brouillard
    this.scene.userData.nuagesQualite = q === 'low' ? 0 : 1;   // ombres de nuages (js/nuages.js), coupées en basse

    // ---- ombres ----
    // On BORNE par la taille de texture de la puce : demander 8192 à un téléphone qui plafonne à 4096 ne
    // renvoyait aucune erreur visible, juste des ombres qui disparaissent. Et quand on ne peut pas agrandir la
    // texture, on RESSERRE la caméra d'ombre : la finesse dépend des texels par mètre, pas de la texture seule.
    const shadowsOn = this.shadows !== 'off';
    let size = P.ombre;
    if (this.shadows === 'medium') size = Math.min(2048, size);
    const plafondTex = this.dev.telephone ? Math.min(2048, this.dev.maxTex) : (this.dev.costaud ? this.dev.maxTex : Math.min(4096, this.dev.maxTex));
    size = Math.max(512, Math.min(size, plafondTex));                  // jamais arrondi VERS LE HAUT : 3072 doit rester 3072
    // LE TYPE D'OMBRE NE CHANGE PAS EN COURS DE PARTIE (06/10/2026). Le type fait partie de la clé de TOUS les programmes de
    // three — décor, joueurs, et ceux qu'on ne voit pas : profondeur de la carte d'ombre, carte des ombres de contact,
    // normales de l'occlusion. Le changer recompilait tout d'un bloc : 13,4 s d'image figée mesurées à la première baisse
    // automatique de haute à moyenne (Radeon intégrée, 5 contre 5). Un changement AUTOMATIQUE (`silencieux` : mesure, baisse,
    // remontée) garde donc le type en service ; le choix fait dans les Options (au menu ou en pause) pose celui du
    // préréglage, comme avant.
    // (07/10/2026) CE N'ÉTAIT PAS GRATUIT. On écrivait que les ombres douces coûtaient « autant que le PCF de three » :
    // mesuré sur la Radeon 660M (La Cage, 3 contre 3, vue TV, 1677x943), la moyenne atteinte par la baisse automatique — qui
    // garde le PCF doux de la haute — coûtait 24,2 ms à la carte graphique contre 21,5 en PCF, +2,7 ms. Les ombres douces sont
    // donc ALLÉGÉES (js/ombres_soleil.js : découpes, lointain, carte de 2048), et la moyenne d'un PC les prend désormais
    // toujours (`douces`) : la baisse automatique n'a plus rien à garder d'autre que ce que la moyenne choisit elle-même, et
    // les pénombres tachetées des platanes restent douces. La basse et le téléphone restent en PCF. Une REMONTÉE automatique
    // de basse à moyenne garde le PCF de la basse (rien à recompiler en pleine partie) : elle le dit dans la console.
    const douces = !!P.douces || (q === 'medium' && !this.dev.telephone);
    const voulu = douces ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    const type = silencieux && r.shadowMap.enabled ? r.shadowMap.type : voulu;
    if (type !== voulu && shadowsOn) console.info('[fx] ombres : le type en service est gardé (', type === THREE.PCFSoftShadowMap ? 'douces' : 'PCF', ') — changement automatique, rien à recompiler');
    const majMat = r.shadowMap.enabled !== shadowsOn || r.shadowMap.type !== type;
    r.shadowMap.enabled = shadowsOn; r.shadowMap.type = type;
    if (majMat) this.scene.traverse((o) => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) m.needsUpdate = true; } });
    this.scene.traverse((o) => {
      // `sansOmbre` : une lumiere peut avoir de BONNES raisons de ne jamais projeter. Le remplissage du
      // decor (js/court.js) en est une : il vient du cote oppose au soleil, et lui donner une ombre revient
      // a en donner deux au joueur. On ne rallume donc que celles qui n'ont pas dit non.
      if (o.isDirectionalLight && o.shadow && !o.userData.sansOmbre) {
        o.castShadow = shadowsOn;
        if (o.shadow.mapSize.x !== size) {
          o.shadow.mapSize.setScalar(size);
          if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }   // obligatoire : sinon la taille ne bouge pas
        }
        // PCF (basse, moyenne du téléphone) : un rayon fixe. PCF doux (moyenne d'un PC, haute et au-dessus) : les ombres
        // douces de js/ombres_soleil.js, dont le rayon est recalculé à chaque image (render).
        this._rayonPCF = q === 'medium' ? 1.5 : 1;
        if (type !== THREE.PCFSoftShadowMap) o.shadow.radius = this._rayonPCF;
        if (o.shadow.camera && o.shadow.camera.isOrthographicCamera) this._cadrerOmbre(o, P, q, type === THREE.PCFSoftShadowMap);
      }
    });
    this._spanRef = P.span;
    // Sur les deux préréglages bas, le décor lointain (immeubles, arbres de la rue) arrête de projeter des
    // ombres : c'est une passe de scène en moins à dessiner dans la carte d'ombre, pour un décor qu'on ne
    // regarde pas pendant un un-contre-un.
    this._ombresDecor(P.decor);
    // Cadence de la carte d'ombre. Le soleil ne bouge pas de la partie : redessiner les ~600 objets qui
    // projettent une ombre à CHAQUE image est le plus gros poste de rendu du mode basse. Une image sur deux
    // suffit (l'ombre du joueur a un retard d'une image, invisible en jeu) et on économise ~40 % des appels
    // de dessin. C'est ce qui fait passer un téléphone moyen de 20 à 30 im/s.
    this._cadOmbre = P.cadOmbre || 1; this._nOmbre = 0;
    r.shadowMap.autoUpdate = this._cadOmbre === 1;
    if (this._cadOmbre > 1) r.shadowMap.needsUpdate = true;
    // (07/10/2026) l'ombre des feuillages au vent, à sa cadence (js/ombre_cache.js) : figée au téléphone et en basse, une
    // image sur trois sur PC — à chaque image seulement sur une machine costaude en ultra et extrême
    let cadVent = this.dev.telephone ? 0 : (P.ventOmbre ?? 1);
    if (cadVent === 1 && !this.dev.costaud) cadVent = 3;
    this.ombreCache.cadVent = cadVent;

    this.setAniso(P.aniso);
    this._curRatio = 0;                 // force le recalcul de la résolution interne
    this.dyn = 1; this._fen = []; this._souffrance = 0; this._plaint = false; this._razCout();
    this.resize(window.innerWidth, window.innerHeight);
    // LOT L12 : l'occlusion du massif du pin (machine costaude, là où le GTAO tourne) ; la sonde de lumière du ciel
    // (basse et téléphone, sans carte d'environnement : js/sonde_ciel.js, posée par le terrain qui a une carte HDR)
    // (relecture L12 : et seulement là où un terrain a déclaré sa liste — ailleurs, le mélange retouché du GTAO aurait
    // lu la cible des normales pour rien à chaque pixel)
    this._aoFeuillage = !!(OPTIONS_RENDU.aoFeuillage && this.dev.costaud && this.gtao.enabled && (this.scene.userData.feuillageAO || []).length);
    compenserAO(this.scene, this._aoFeuillage);       // (le massif garde sa clarté moyenne calée sur les photos)
    attenuerAO(this.gtao, this._aoFeuillage);         // (et l'occlusion n'y pèse que moitié)
    // (07/10/2026) la sonde PARTOUT où il n'y a pas de carte d'environnement — basse, moyenne sans carte (le PC ordinaire),
    // téléphone —, et plus seulement en basse et au téléphone : la moyenne d'un PC à puce intégrée éclairait le dessous des
    // choses avec l'hémisphère plate. La sonde de chaque terrain reste dans la scène, éteinte quand elle ne sert pas (lot B,
    // js/sonde_ciel.js) : l'allumer ne change pas le nombre de lumières, rien à recompiler.
    this.scene.userData.sondeCiel?.activer?.(OPTIONS_RENDU.sonde && !this.scene.environment, this.renderer);
    this._tRepli = 2;                   // le cran du dessous de ce préréglage, précompilé dans 2 s (precompilerRepli)
    if (!silencieux) {
      console.info('[fx] qualité :', q, '· échelle', this.scale, '· pixels', (this._pxRendus() / 1e6).toFixed(2), 'Mpx',
        '· ombres', size, type === THREE.PCFSoftShadowMap ? 'douces' : 'nettes', '(portée', P.span, 'm)',
        '· AO', this.gtao.enabled, P.aoS, '· reflet', P.refl || 'non', '· env', P.env, '· météo', P.meteo,
        '· MSAA', this.renderPass.msaa || 'non', '· AO feuillage', this._aoFeuillage, '· basse étalonnée', !!this.sortieBasse.enabled);
    }
  }

  // ---------- résolution interne ----------
  // `prMax` plafonne la densité, `px` plafonne le NOMBRE de pixels. Le second compte vraiment : sans lui, la
  // même qualité coûte trois fois plus cher en 4K qu'en 1080p et c'est toujours en plein écran que ça lâche.
  _ratioCible() {
    const P = PostFX.PRESETS[this.quality] || PostFX.PRESETS.high;
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    // RESOLUTION CHOISIE A LA MAIN. On ne raisonne plus en densite de pixels mais en HAUTEUR de rendu :
    // le joueur demande 2160 lignes, on lui en donne 2160, quelle que soit la taille de sa fenetre. Le
    // navigateur se charge d'etirer jusqu'a l'ecran, et le reaffutage du shader d'etalonnage rattrape le
    // flou quand on rend en dessous.
    // La resolution dynamique continue de travailler EN DESSOUS de ce plafond : elle ne peut plus tomber
    // a 80 % de l'ecran (ce qui remontait le 720p a 864 lignes) mais a 80 % du choix.
    // Deux garde-fous : jamais plus de quatre fois la fenetre, et jamais un tampon plus large que ce que
    // la puce sait allouer — au-dela, three rend un ecran noir sans rien dire.
    if (this.res && this.res !== 'auto') {
      const lignes = Number(this.res) || h;
      let base = Math.min(4, Math.max(0.25, lignes / h));
      const maxTex = (this.dev && this.dev.maxTex) || 4096;
      base = Math.min(base, maxTex / Math.max(w, h));
      return base * this.dyn;
    }
    const prMax = (this.dev.telephone && P.prMaxTel) || P.prMax;      // basse sur téléphone : 1,3 (voir PRESETS)
    let r = Math.min(this.dev.dpr * (this.quality === 'extreme' ? 1.3 : this.quality === 'ultra' ? 1.15 : 1), prMax) * this.scale;
    // le budget suit la machine : une puce intégrée partage sa mémoire avec le processeur, elle n'a pas les
    // 7 Mpx d'une carte dédiée — mais elle garde le droit de choisir « extrême », juste en plus raisonnable.
    const fac = this.dev.telephone ? 0.5 : this.dev.costaud ? 1 : 0.72;
    const budget = Math.sqrt(P.px * fac / (w * h));   // densité maximale qui tient dans le budget en pixels
    // Le budget peut ramener à la taille réelle de la fenêtre, JAMAIS en dessous : sur un écran 4K le budget
    // valait 0,93, on rendait donc en 3570x2008 pour un écran 3840x2160 et on étirait — l'image était floue
    // ALORS QU'ON AVAIT DEMANDÉ LA QUALITÉ MAXIMALE. Un tampon plus petit que la fenêtre n'est jamais un bon
    // compromis : c'est le premier défaut qu'on voit.
    r = Math.min(r, Math.max(1, budget));
    return Math.max(this._dynMin(), r * this.dyn);
  }

  // Plancher de la résolution dynamique. Sur PC on ne descend pas sous 80 % : en dessous, l'étirement se voit
  // franchement et « ça rame un peu » devient « c'est moche ». Si ça ne suffit pas, c'est le préréglage qui
  // doit baisser, pas la netteté. Sur téléphone : 75 %, et plus 55 %. À 55 %, un téléphone à dpr 2,6 rendait la
  // moyenne en 669x309 et la basse en 447x206, étirées x3,2 et x4,8 par le navigateur : une bouillie, et pour toute la
  // partie (la résolution ne remontait jamais à 60 Hz). Au plancher, c'est le préréglage qui descend (« souffrance »).
  _dynMin() { return this.dev.telephone ? 0.75 : 0.8; }
  _pxRendus() { const r = this._curRatio || this._ratioCible(); return window.innerWidth * window.innerHeight * r * r; }

  // Applique la densité de pixels PARTOUT d'un seul coup. Point important : c'est composer.setPixelRatio() qui
  // redimensionne toutes les passes en pixels réels — il ne faut surtout pas les re-dimensionner derrière en
  // pixels CSS, sinon l'occlusion ambiante et le SMAA travaillent sur des tampons deux fois trop petits
  // (halos autour des joueurs, bords en escalier). C'était le défaut visuel du mode extrême.
  _appliquerRatio(force = false) {
    const r = this._ratioCible();
    if (!force && Math.abs(r - this._curRatio) < 0.02) return;
    this._curRatio = r;
    // NETTETE. On ne reaffute que si l'on rend SOUS la resolution native de l'ecran : reaffuter une
    // image deja a sa taille ne fait que rajouter du crenelage. La force croit avec l'agrandissement.
    // ÉTIREMENT FORT (téléphones : dpr 2,6 à 3 rendus à 1 ou 1,3) : au-delà de x2, le flou bilinéaire du navigateur se
    // voit franchement, et la loi ci-dessus plafonnait vers 0,15 (le « manque » est rapporté à un dpr borné à 2). La
    // force monte alors jusqu'à 0,6 à x3 — pour le réglage par défaut (0,35) ; celui du joueur est mis à l'échelle, et
    // 0 reste 0. La borne min/max des voisins du shader empêche le liseré noir, même à 0,6. Plafond 0,8, le haut du
    // curseur des Options : sans lui, le curseur au maximum donnait 1,4 à x3, une image « postérisée » où chaque grain
    // est poussé jusqu'au plus clair ou au plus sombre de ses voisins.
    const dpr = (this.dev && this.dev.dpr) || 1;
    const nat = Math.min(dpr, 2);
    const manque = Math.max(0, (nat - r) / Math.max(0.35, nat));
    const etire = Math.min(1, Math.max(0, dpr / Math.max(0.05, r) - 2));
    const affute = Math.max(this.sharp * Math.min(1, manque), Math.min(0.8, (this.sharp / 0.35) * 0.6 * etire));
    if (this.grade) {
      this.grade.uniforms.uSharp.value = affute;
      this.grade.uniforms.uTexel.value.set(1 / Math.max(1, window.innerWidth * r), 1 / Math.max(1, window.innerHeight * r));
    }
    if (force) this._fxaaBasse();
    if (this.fxaa) {
      // (07/10/2026) la moyenne du téléphone : au moins 0,15 (pour le réglage par défaut, 0,35 ; mis à l'échelle du curseur, 0
      // reste 0). À dpr 2 rendue à 1,5, la loi du dessus ne donnait que 0,09 : c'est le GradeShader qui affûtait en v7, et
      // le FXAA, lui, adoucissait — d'où l'image molle de la v8. (0,25 puis 0,20 essayés : 1,22 puis 1,21 fois le détail de
      // la v7 en Vif sur le mur du panier A, au-delà du plafond de 1,20 — le grillage commençait à grésiller ; 0,15 : 1,17.)
      this.fxaa.uniforms.uSharp.value = this._legere() ? Math.max(affute, Math.min(0.8, 0.15 * this.sharp / 0.35)) : affute;
      this.fxaa.uniforms.resolution.value.set(1 / Math.max(1, window.innerWidth * r), 1 / Math.max(1, window.innerHeight * r));
    }
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(r);
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(r);     // redimensionne renderTarget1/2 ET toutes les passes
    this.composer.setSize(w, h);
    // Le reflet au sol garde SA taille à lui : c'est tout l'intérêt de l'avoir sorti du plein écran. On se
    // contente de lui donner le bon rapport largeur/hauteur, sinon le reflet est étiré de travers.
    this._majTailleReflet();
    this._majMSAA();
  }

  // LOT L12 : MSAA x4 DE LA SCÈNE (js/options_rendu.js PasseSceneMSAA). Deux cas, et seulement ceux-là :
  //  - une machine COSTAUDE (carte dédiée : la RTX de Haythem), option « MSAA x4 » cochée, hors basse. JAMAIS la Radeon
  //    intégrée ni un téléphone (mesuré par le plan : trop cher pour eux). Pas au-delà de 5 Mpx rendus : là, le
  //    suréchantillonnage (extrême en résolution AUTO sur un grand écran) lisse déjà tout, et une cible x4 de cette
  //    taille pèserait plus de 230 Mo ;
  //  - la BASSE étalonnée d'un PC dont le contexte a son MSAA (js/game.js ne le demande qu'en basse enregistrée) : la
  //    scène passe désormais par le composer, qui le perdrait ; elle le retrouve ici (« FXAA ou samples », plan L12).
  // Il faut aussi que la puce sache multi-échantillonner une cible en demi-flottant (EXT_color_buffer_float).
  _majMSAA() {
    if (!this.renderPass || !this.renderPass.isPass) return;
    const r = this.renderer, ok = r.capabilities.isWebGL2 !== false && (r.capabilities.maxSamples || 0) >= 4
      && r.extensions.has('EXT_color_buffer_float');
    // (relecture L12 : le seuil de 5 Mpx se juge sur la résolution du RÉGLAGE, sans la résolution dynamique — sinon, sur
    // un grand écran, chaque pas de celle-ci autour du seuil allumait ou éteignait le MSAA, réallouait une cible de
    // 200 Mo et changeait le coût de l'image, que la résolution dynamique corrigeait aussitôt : un va-et-vient)
    const pxReglage = this._pxRendus() / Math.max(0.25, this.dyn * this.dyn);
    const costaud = !!(OPTIONS_RENDU.msaa && this.dev.costaud && !this.dev.telephone && this.quality !== 'low' && pxReglage <= 5e6);
    const basse = !!((this.quality === 'low' || this._legere()) && this.sortieBasse && this.sortieBasse.enabled && this._ctxMSAA && this.aaOn);
    const n = ok && (costaud || basse) ? 4 : 0;
    if (n !== this.renderPass.msaa) { this.renderPass.msaa = n; if (!n) this.renderPass.liberer(); this._tAniso = 0; }   // (l'alpha en couverture suit : _anisoRetard)
  }

  // BASSE SANS MSAA. La basse se rend en direct (setQuality : `enabled = false`), et son seul anticrénelage était le MSAA
  // du contexte — que js/game.js coupe sur les écrans denses des téléphones, et ne demande plus qu'en basse ENREGISTRÉE
  // (un PC passé en basse en cours de partie n'en a donc pas non plus). Dans ces deux cas, on passe par un composer
  // minimal : scène → sortie (ACES et sRGB, exactement ce que fait le rendu direct) → FXAA réaffûté (FXAA_BASSE). Les
  // autres passes sont déjà coupées en basse (occlusion, œil, bloom, SMAA) ; l'étalonnage aussi, pour garder l'image de
  // la basse telle quelle. Coût : deux passes plein écran, à la résolution de la basse. Appelé à chaque setQuality
  // (par resize → _appliquerRatio(true)), APRÈS que setQuality a posé `enabled`.
  // LA MOYENNE DU TÉLÉPHONE PREND LE MÊME CHEMIN (06/10/2026). Elle passait par la chaîne entière : bloom (11 cibles, à
  // 0,16 et seuil 0,92 il ne se voit presque pas sur un petit écran), sortie, SMAA (trois passes), puis l'étalonnage — 1
  // + 4 (réaffûtage) + 4 (clarté, que le style Vif allume) + 20 (rayons) lectures de texture par pixel. Une quinzaine de
  // passes plein écran pour un téléphone limité par la bande passante. Elle garde ici l'œil (deux toutes petites passes)
  // et passe par la SORTIE ÉTALONNÉE (ACES, sRGB, puis lift/gamma/gain, courbe, virage, saturation, vignette, chaleur et
  // éclair, les uniformes mêmes de GradeShader) puis par le FXAA réaffûté, qui pose aussi le grain de la moyenne : deux
  // passes plein écran. Ce qu'elle perd : le bloom, les rayons du soleil face caméra et la clarté (micro-contraste).
  // Le téléphone en HAUTE (choisie à la main) garde la chaîne entière.
  _telMoyenne(q = this.quality) { return q === 'medium' && !!this.dev.telephone; }
  // LA MOYENNE D'UN PC ORDINAIRE AUSSI (07/10/2026). Sur la Radeon 660M (puce intégrée, écran à 165 Hz), la moyenne atteinte
  // par la baisse automatique coûtait 21 à 24 ms à la carte graphique : 4 périodes d'écran, 41 im/s — sous les 45 im/s de la
  // règle du mode auto, qui la faisait descendre en BASSE (rendu direct, ombres 1024 : « les graphismes sont moins bien »).
  // Mesurés passe par passe : SMAA 2,5 ms, étalonnage 1,5, sortie 0,55. La chaîne légère (sortie étalonnée puis FXAA
  // réaffûté, clarté et grain : les mêmes réglages, deux passes) en coûte 1,6 : -2,5 ms à l'image, mesurés en alternance.
  // Le bloom (1,1 ms) part aussi, comme au téléphone, et son énergie revenait par le gain du HDR (GAIN_LEGERE) : -0,8 à -1 ms de
  // plus, et la moyenne passe sous 3 périodes d'écran (18,2 ms à 165 Hz) — celle que la règle du mode auto garde. Elle perd
  // le halo des grandes plages claires, les rayons du soleil face caméra (un éblouissement rare en match) et le SMAA,
  // remplacé par le FXAA aux seuils de NVIDIA. Une machine costaude (carte
  // dédiée) qui choisit la moyenne garde la chaîne entière : elle a le temps.
  _legere(q = this.quality) { return q === 'medium' && (!!this.dev.telephone || !this.dev.costaud); }

  // LA CHAÎNE LÉGÈRE COMPILÉE D'AVANCE (07/10/2026). Un PC ordinaire part en HAUTE, et la baisse automatique vers la moyenne
  // y allume deux passes jamais dessinées : leurs programmes (la sortie étalonnée, le FXAA) seraient compilés d'un bloc, en
  // pleine partie. On les dessine donc une fois pendant le menu — la sortie dans une cible du composer, le FXAA à l'écran,
  // comme en jeu (la cible fait partie de la clé du programme) — juste avant l'image du composer, qui repasse par-dessus.
  _prechaufferLegere() {
    if (this._legerePrete || !this._legere('medium') || this.dev.telephone || PostFX.ORDRE.indexOf(this.quality) < 2 || !this.enabled) return;
    const r = this.renderer, c = this.composer, avant = r.getRenderTarget();
    if (!this.fxaa) { this._creerFxaa(); this.fxaa.enabled = false; }
    const ecranS = this.sortieBasse.renderToScreen, ecranF = this.fxaa.renderToScreen;
    try {
      this.sortieBasse.renderToScreen = false; this.sortieBasse.render(r, c.writeBuffer, c.readBuffer);
      this.fxaa.renderToScreen = true; this.fxaa.render(r, null, c.writeBuffer);
      this._legerePrete = true;
    } catch (e) { console.warn('[fx] précompilation de la chaîne légère :', e); }
    finally { this.sortieBasse.renderToScreen = ecranS; this.fxaa.renderToScreen = ecranF; r.setRenderTarget(avant); }
  }

  // La passe FXAA de la basse et de la moyenne légère, ajoutée en dernier au composer (EffectComposer l'envoie à l'écran
  // quand elle est active). Elle lit la cible 8 bits de la sortie étalonnée quand celle-ci vient d'y écrire (`_plein8`,
  // voir le constructeur), sinon le tampon du composer comme toute passe.
  _creerFxaa() {
    const F = this.fxaa = new ShaderPass(FXAA_BASSE);
    F.uniforms.uClarte = this.grade.uniforms.uClarte;   // LE MÊME uniforme : préréglage et style Photo/Vif, sans recopie
    const rendreF = F.render.bind(F);
    F.render = (renderer, writeBuffer, readBuffer, dt, mask) => {
      const lu = this._plein8 && this._rt8 ? this._rt8 : readBuffer;
      this._plein8 = false;
      rendreF(renderer, writeBuffer, lu, dt, mask);
    };
    this.composer.addPass(F);
    return F;
  }

  _fxaaBasse() {
    const P = PostFX.PRESETS[this.quality] || {};
    let msaa = false;
    try { msaa = !!this.renderer.getContext().getContextAttributes().antialias; } catch (e) { /* contexte perdu */ }
    this._ctxMSAA = msaa;
    const leg = this._legere();
    const lisser = (!!P.fxaa || leg) && !msaa && this.aaOn;  // « Anticrénelage » décoché dans les Options : pas de lissage
    // (07/10/2026) la moyenne légère (téléphone, PC ordinaire : _legere) GARDE la passe même sans lissage (case décochée, ou contexte qui a son MSAA) : c'est
    // elle qui porte le réaffûtage, la clarté et le grain — le FXAA y saute (uFxaa à 0), le reste est là. La basse, elle,
    // repasse en rendu direct comme avant.
    const on = lisser || leg;
    if (on && !this.fxaa) this._creerFxaa();
    if (this.fxaa) {
      this.fxaa.enabled = on;
      this.fxaa.uniforms.uFxaa.value = lisser ? 1 : 0;
      this.fxaa.uniforms.uClarteOn.value = leg ? 1 : 0;
    }
    // l'énergie du bloom, que la moyenne légère n'a pas : un gain avant ACES, dans la sortie étalonnée (voir GAIN_LEGERE)
    if (this.sortieBasse.uniforms.uGainHDR) this.sortieBasse.uniforms.uGainHDR.value = leg ? PostFX.GAIN_LEGERE[this.dev.telephone ? 'tel' : 'pc'] : 1;
    // LOT L12, LA BASSE ÉTALONNÉE (option « Basse étalonnée », js/options_rendu.js sortieEtalonnee) : la basse passe
    // TOUJOURS par le composer minimal, et sa sortie (ACES, sRGB) porte l'étalonnage de la météo dans la même passe :
    // scène → sortie étalonnée → FXAA. Sur un PC dont le contexte a son MSAA (basse enregistrée), pas de FXAA : la scène
    // est rendue en MSAA x4 dans le composer (_majMSAA), le lissage d'avant. Option décochée : la basse d'avant.
    // (la moyenne du téléphone, elle, est toujours étalonnée : l'option ne parle que de la basse)
    const etal = this.sortieBasse.etalonnee && (leg || (this.quality === 'low' && OPTIONS_RENDU.etalonnageBasse));
    this.sortieBasse.enabled = etal; this.output.enabled = !etal;
    // la sortie étalonnée suivie du FXAA : leur image intermédiaire en 8 bits (voir le constructeur) ; ailleurs, la cible
    // est libérée (haute et au-delà n'en ont pas l'usage)
    this._sortie8 = on && etal;
    if (this._sortie8 && !this._rt8) this._rt8 = new THREE.WebGLRenderTarget(this._t8[0], this._t8[1], { depthBuffer: false });
    else if (!this._sortie8 && this._rt8) { this._rt8.dispose(); this._rt8 = null; }
    if (on || etal) { this.enabled = true; this.grade.enabled = false; }
    else if (this._fxaaOn) this.grade.enabled = true;     // on sort de la basse lissée : l'étalonnage revient
    this._fxaaOn = on || etal;
  }

  // ---------- reflet au sol ----------
  // Un miroir planaire posé sur le terrain : la scène est re-rendue depuis la caméra symétrique par rapport au
  // sol, dans une texture de `res` pixels de large, et cette texture est plaquée sur le bitume. C'est ce qui
  // donne les joueurs et le panier qui se reflètent dans le bitume mouillé.
  //
  // Deux différences décisives avec le SSR qu'il remplace :
  //   - sa résolution n'a RIEN à voir avec celle de l'image : 512 pixels de reflet sur un écran 1440p restent
  //     un écran 1440p parfaitement net, là où le SSR imposait sa résolution à tout le jeu ;
  //   - il est masqué quand le sol est sec, et un objet masqué ne déclenche pas son rendu : par beau temps,
  //     ultra et extrême ne paient donc strictement rien pour lui.
  setReflet(res) {
    this._reflRes = res;
    if (!res) { if (this.reflet) this.reflet.visible = false; return; }
    if (this.reflet && this._reflFait === res) return;        // déjà construit à cette taille : on le regarde, c'est tout
    const court = this.scene.userData.env && this.scene.userData.env.court;
    if (!court) { this._reflRes = 0; return; }                // décor pas encore construit
    if (this.reflet) { this.scene.remove(this.reflet); this.reflet.dispose(); this.reflet.geometry.dispose(); this.reflet = null; }
    this._reflFait = res;
    const p = court.geometry.parameters;
    const h = Math.max(1, Math.round(res * window.innerHeight / Math.max(1, window.innerWidth)));
    this.reflet = new Reflector(new THREE.PlaneGeometry(p.width, p.height), {
      textureWidth: res, textureHeight: h, color: 0xffffff, clipBias: 0.004, multisample: 0,
      shader: PostFX.RefletShader,
    });
    this.reflet.rotation.x = -Math.PI / 2;
    this.reflet.position.set(court.position.x, 0.006, court.position.z);   // juste au-dessus du bitume, sous le vrai sol (il peut etre decale)
    this.reflet.renderOrder = 2;              // après le sol, sinon il n'y a rien à recouvrir
    this.reflet.material.transparent = true;
    this.reflet.material.depthWrite = false;  // il ne masque rien : c'est un vernis sur le bitume
    this.reflet.visible = false;              // allumé par la météo, dans render()
    const refleter = this.reflet.onBeforeRender;  // idem : le reflet redessine la scène, la carte d'ombre est déjà à jour
    // (et ses matrices aussi : il est dessiné PENDANT le rendu principal, qui vient de les remettre à jour)
    this.reflet.onBeforeRender = (renderer, scene, camera, ...rest) => sansRecalculOmbres(renderer, () => {
      const majAuto = scene.matrixWorldAutoUpdate;
      scene.matrixWorldAutoUpdate = false;
      try { refleter.call(this.reflet, renderer, scene, camera, ...rest); } finally { scene.matrixWorldAutoUpdate = majAuto; }
    });
    this.scene.add(this.reflet);
  }

  _majTailleReflet() {
    if (!this.reflet || !this._reflRes) return;
    const w = this._reflRes;
    const h = Math.max(1, Math.round(w * window.innerHeight / Math.max(1, window.innerWidth)));
    const t = this.reflet.getRenderTarget();
    if (t.width !== w || t.height !== h) t.setSize(w, h);
  }

  // PERSPECTIVE AERIENNE. C'est le signe le plus sur qu'une image est prise dehors, et celui qui manquait
  // le plus : la couche d'air entre l'oeil et les choses lointaines n'est pas grise, elle est ECLAIREE par le
  // soleil, donc sa couleur depend de la direction du regard. Face au soleil elle blanchit et chauffe — c'est
  // le voile lumineux qu'on voit a contre-jour, qui mange les contrastes du fond ; dos au soleil elle vire au
  // bleu du ciel, plus dense et plus froide. Un brouillard d'une seule couleur, le meme dans toutes les
  // directions, est exactement ce qui donne aux jeux leur air de maquette.
  //
  // C'est la meteo qui repose la couleur de base a chaque image (js/weather.js), et nous qui la teintons
  // par-dessus : rien ne s'accumule d'une image a l'autre. Le tout est module par `rays`, qui vaut 1 par
  // grand soleil et 0 sous la pluie — quand il n'y a pas de soleil, il n'y a pas de direction a donner.
  perspectiveAerienne(sd) {
    const f = this.scene.fog;
    if (!sd || !f || this.rays < 0.004) return;
    this.camera.getWorldDirection(this._avant);
    // Le CAP, pas la direction complete : le soleil est haut, la camera regarde a plat, et un produit
    // scalaire en trois dimensions plafonnait a 0,57 meme en visant le soleil pile en face. Or ce qui decide
    // du contre-jour, c'est de quel cote du ciel on regarde, pas de combien on leve la tete.
    const hl = Math.hypot(sd.x, sd.z) || 1, al = Math.hypot(this._avant.x, this._avant.z) || 1;
    const k = (this._avant.x * sd.x + this._avant.z * sd.z) / (hl * al);
    const chaud = Math.max(0, k) * Math.max(0, k), froid = Math.max(0, -k);
    f.color.lerp(PostFX.AIR_CHAUD, 0.58 * chaud * this.rays);
    f.color.lerp(PostFX.AIR_FROID, 0.34 * froid * this.rays);
    // La brume d'horizon suit exactement la meme loi : sans ca, le lointain et le bas du ciel se separaient
    // des qu'on tournait la tete, et la jointure se voyait comme un trait.
    const br = this.scene.userData.brume;
    if (br && br.material) {
      this._teinte.setRGB(1, 1, 1).lerp(PostFX.AIR_CHAUD, 0.5 * chaud * this.rays).lerp(PostFX.AIR_FROID, 0.3 * froid * this.rays);
      br.material.color.copy(this._teinte);
    }
  }

  // L'œil repart de zéro : les deux mémoires reprennent la lumière de l'image suivante, et la référence suit vite
  // pendant 2,5 s (le temps que la caméra arrive à sa place : la caméra de match glisse depuis la balade). Appelé à
  // chaque changement de préréglage, à l'entrée en balade et en match (js/game.js), et quand la carte
  // d'environnement change (render : la photo HDR du parc arrive après le premier rendu, et elle rééclaire tout).
  reAdapter() { this.oeil.init = true; this.oeil.rapide = 2.5; }

  // CARTE D'ENVIRONNEMENT EN MOYENNE. Au parc, cette carte n'est pas un simple reflet : c'est la lumière du ciel qui
  // éclaire tout le plateau, entièrement à l'ombre du pin. Sans elle, l'hémisphère de secours (`hemiSansEnv`) éclaire
  // toutes les faces pareil : haut de l'image laiteux, rideau du quai de 0,94 fois l'enrobé au lieu de 0,73.
  // Mais elle a un prix par image, mesuré le 30/09 sur la Radeon intégrée (requêtes de temps GPU, parc, 1080 lignes) :
  // 19,1 → 23,5 ms en balade, 20,8 → 24,3 ms en match, soit +3,5 à +4,4 ms (+20 %) pour la moyenne, parce que TOUS
  // les matériaux standard font alors deux lectures de plus par pixel (lumière diffuse et reflet), feuillages empilés
  // compris ; une carte quatre fois plus petite coûte autant. C'est plus de dix fois le budget d'un lot (+0,3 ms), et
  // justement sur les machines qui choisissent la moyenne pour tenir la cadence. Elle n'est donc accordée qu'aux
  // machines COSTAUDES (carte dédiée), qui choisissent la moyenne à la main : là, 4 ms ne comptent pas et l'image
  // redevient celle réglée sur les photos (rideau/enrobé 0,70 en moyenne, 0,74 en extrême). Jamais sur téléphone
  // (pas « costaud » par construction). Le choix se fait au démarrage et dans le menu Options, jamais en pleine
  // partie : la première activation recompile tous les matériaux (732 ms mesurés, bien plus sur une puce chargée).
  envMoyenne(q) { return q === 'medium' && !!this.dev.costaud && !this.dev.telephone; }

  // LE PRÉRÉGLAGE DE REPLI PRÉCOMPILÉ (06/10/2026). La première baisse automatique de haute à moyenne recompilait d'un
  // coup les programmes de tout le décor et des joueurs — les ombres passaient du PCF doux au PCF (plus maintenant : voir
  // setQuality), la carte d'environnement s'éteint, les façades perdent IMM_DETAIL : 58 programmes, 13,4 s d'image
  // figée mesurées en 5 contre 5 sur la Radeon intégrée (le compilateur D3D d'ANGLE, sur le fil principal). On fait
  // donc compiler D'AVANCE, en parallèle (KHR_parallel_shader_compile), les variantes du premier cran du dessous qui
  // change la clé des programmes : pendant le menu (Game.prechaufferScene), à l'arrivée de chaque avatar
  // (Player.preparerRendu) et pour ce qui arrive ensuite (precompilerRepli). `avecRepli` pose cet état le temps de
  // l'appel `compiler(racine)`, puis rend tout ; les matériaux reprennent leur programme à l'image suivante
  // (needsUpdate), sans rien compiler. Le jour de la baisse, three trouve les variantes déjà prêtes.
  // (Basse et moyenne d'un téléphone ont le même état : rien à faire. La sonde de lumière du parc, en basse sur PC,
  // n'est pas couverte : elle change le nombre de lumières, et la basse n'arrive qu'après la moyenne.)
  // (le type d'ombre ne change pas lors d'une baisse automatique, voir setQuality : seuls la carte d'environnement et les
  // defines de la haute changent la clé)
  _etatRepli() {
    const r = this.renderer, i = PostFX.ORDRE.indexOf(this.quality);
    const env0 = !!this.scene.environment, detail0 = (this.scene.userData.meteoQualite ?? 1) >= 1;
    for (let j = i - 1; j >= 0; j--) {
      const q = PostFX.ORDRE[j], P = PostFX.PRESETS[q];
      const R = { q, type: r.shadowMap.type, env: !!(P.env || this.envMoyenne(q)), sansDetail: detail0 && P.meteo < 1 };
      if (R.env !== env0 || R.sansDetail) return R;
    }
    return null;
  }
  avecRepli(racine, compiler = this.compilerTout) {
    const R = racine && compiler && this._etatRepli();
    if (!R) return null;
    const r = this.renderer, sc = this.scene, type0 = r.shadowMap.type, env0 = sc.environment, retires = [];
    const mats = (o) => (o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []);
    r.shadowMap.type = R.type;
    if (!R.env) sc.environment = null;
    if (R.sansDetail) racine.traverse((o) => { for (const m of mats(o)) for (const d of DEFINES_HAUTE) if (m && m.defines && d in m.defines) { retires.push([m, d, m.defines[d]]); delete m.defines[d]; } });
    try { return compiler(racine); }
    finally {
      r.shadowMap.type = type0; sc.environment = env0;
      for (const [m, d, v] of retires) m.defines[d] = v;      // (remis en DERNIER, comme immeubleQualite : même clé)
      const vus = this._vusRepli(R);
      racine.traverse((o) => {
        if (!o.material) return;
        vus.set(o, o.material);
        for (const m of mats(o)) if (m) { m.needsUpdate = true; vus.set(m, m.version); }
      });
      this._replis = (this._replis || 0) + 1;              // (compte, pour la console)
    }
  }
  // Ce qui a déjà ses variantes de repli, pour l'état de repli `R` (oublié quand il change) : objet -> matériau vu,
  // matériau -> sa version (une carte d'occlusion arrivée après coup, un shader posé plus tard changent la clé).
  _vusRepli(R) {
    const sig = PostFX._sigRepli(R);
    if (sig !== this._sigRepli) { this._sigRepli = sig; this._repliVus = new WeakMap(); }
    return this._repliVus;
  }
  static _sigRepli(R) { return R ? `${R.q}|${R.type}|${R.env}|${R.sansDetail}` : ''; }
  // Toutes les 3 s (render) et à la préchauffe du menu : les objets ARRIVÉS ou CHANGÉS depuis (passants, vélos garés
  // fondus, ombre cuite du sol, tenue changée) reçoivent leurs variantes de repli — seulement eux, réunis dans un LOT que
  // compile() parcourt sans les déplacer. Mesuré : sans cela, le sol et sa carte d'occlusion cuite (arrivée après le
  // menu), les passants, restaient à compiler le jour de la baisse. Rien du tout là où le repli n'en a pas (téléphone).
  // QUAND. Seulement en qualité automatique (un préréglage choisi à la main ne baisse jamais tout seul) ; jamais pendant la
  // mesure du mode auto (le travail du pilote fausserait le verdict) ; et en jeu, seulement si la machine est À LA PEINE
  // (intervalle moyen au-dessus de 18 ms, `_msLisse` : un écran à 60 Hz tenu donne 16,7) — une machine à l'aise ne
  // baissera pas : inutile de lui faire payer l'image à blanc des avatars au début d'un match. Au menu, toujours : c'est
  // là que le décor arrive.
  precompilerRepli() {
    if (!this.auto || !this.compilerTout) return;
    this._prechaufferLegere();          // (une fois : les passes de la moyenne légère, voir _legere)
    if (this._enJeu() && (!this._decided || !(this._msLisse > 18))) return;
    const R = this._etatRepli();
    if (!R) return;
    const vus = this._vusRepli(R), neufs = [];
    // (UN MATÉRIAU TRANSPARENT À DEUX FACES change de version à CHAQUE dessin : three le dessine face arrière puis face
    // avant, en posant needsUpdate à chaque fois — +2 par image. Les vitres des voitures de La Cage et le verre du
    // lampadaire revenaient donc dans un lot toutes les 3 s, avec compilation et image à blanc, pour rien : leurs
    // variantes ne changent pas. Pour eux, seul un NOUVEAU matériau compte.)
    const deuxPasses = (m) => m.transparent && m.side === THREE.DoubleSide && !m.forceSinglePass;
    const versionChangee = (m) => !deuxPasses(m) && vus.get(m) !== m.version;
    const change = (o) => {
      if (vus.get(o) !== o.material) return true;
      if (!Array.isArray(o.material)) return versionChangee(o.material);
      for (const m of o.material) if (m && versionChangee(m)) return true;
      return false;
    };
    this.scene.traverse((o) => { if (o.material && change(o)) neufs.push(o); });
    if (!neufs.length) return;
    const lot = new THREE.Object3D();
    lot.traverse = (f) => { f(lot); for (const o of neufs) f(o); };     // (sans descendre : chacun est déjà dans la liste)
    const pret = this.avecRepli(lot);
    if (pret) pret.then(() => this.imageABlanc(neufs, R));
  }

  // L'IMAGE À BLANC (06/10/2026). Compiler ne suffit pas : le pilote finit de préparer un programme à son PREMIER DESSIN
  // (ANGLE sur Direct3D : le code de la carte graphique n'est produit qu'à ce moment-là). Mesuré, Radeon intégrée, 5
  // contre 5 : plus un seul programme à compiler à la baisse de haute à moyenne, et pourtant 2,3 s d'image figée la
  // première fois ; après une image à blanc, 56 ms — une image ordinaire. On dessine donc `objets` UNE fois dans l'état
  // de repli, dans une cible d'un pixel, sans élagage par la caméra ni carte d'ombre, aussitôt leurs variantes compilées
  // (precompilerRepli : le décor au fil de son arrivée pendant le menu, puis ce qui arrive ensuite ; un avatar avant
  // qu'il ne paraisse). Seuls eux sont vus : ils passent, avec les lumières (même clé de programme), sur une couche à
  // part, la seule que la caméra regarde le temps de ce rendu. (`R0` : l'état pour lequel ils ont été compilés ; s'il a
  // changé entre-temps — un autre préréglage —, on ne dessine rien : ce serait compiler d'un bloc, ce qu'on évite.)
  imageABlanc(objets, R0) {
    const R = this._etatRepli();
    if (!R || !objets || !objets.length || PostFX._sigRepli(R) !== PostFX._sigRepli(R0)) return;
    const r = this.renderer, sc = this.scene, cam = this.camera, sm = r.shadowMap;
    const env0 = sc.environment, mq0 = sc.userData.meteoQualite, auto = sm.autoUpdate, nu = sm.needsUpdate, masque = cam.layers.mask;
    const avant = r.getRenderTarget(), couches = [], elagues = [], caches = [];
    const mats = (o) => (o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []);
    const prendre = (o) => { couches.push([o, o.layers.mask]); o.layers.enable(COUCHE_BLANC); };
    // LES DEFINES DE LA HAUTE (IMM_DETAIL des façades) : immeubleQualite les retire pendant ce rendu et ne les remettait
    // qu'à l'image suivante — la version du matériau changeait encore après qu'on l'a notée, et precompilerRepli
    // reprenait les façades toutes les 3 s, sans fin (compilation et image à blanc comprises). On les rend ici, avant de
    // noter les versions, dans le même ordre (en dernier, comme immeubleQualite) : l'image suivante n'a rien à changer.
    const hautes = [];
    for (const o of objets) for (const m of mats(o)) if (m && m.defines) for (const d of DEFINES_HAUTE) if (d in m.defines) hautes.push([m, d, m.defines[d]]);
    try {
      if (!R.env) sc.environment = null;
      sc.userData.meteoQualite = PostFX.PRESETS[R.q].meteo;         // (js/court.js immeubleQualite retire IMM_DETAIL de lui-même)
      for (const o of objets) {
        if (o.isReflector) continue;                  // (son dessin refait toute la scène : son matériau n'a pas de variante)
        for (const m of mats(o)) if (m) m.needsUpdate = true;
        if (o.frustumCulled) { o.frustumCulled = false; elagues.push(o); }
        prendre(o);
        // (un avatar encore caché le temps de ses programmes, un joueur hors du terrain : montrés pour ce rendu seulement —
        // la caméra ne voit que la couche à part)
        for (let p = o; p && p !== sc; p = p.parent) if (!p.visible) { p.visible = true; caches.push(p); }
      }
      sc.traverse((o) => { if (o.isLight) prendre(o); });
      cam.layers.set(COUCHE_BLANC);
      sm.autoUpdate = false; sm.needsUpdate = false;
      r.setRenderTarget(this._cibleBlanc || (this._cibleBlanc = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })));
      r.render(sc, cam);
    } catch (e) { console.warn('[fx] image à blanc du repli :', e); }
    finally {
      r.setRenderTarget(avant);
      sc.environment = env0; sc.userData.meteoQualite = mq0; sm.autoUpdate = auto; sm.needsUpdate = nu; cam.layers.mask = masque;
      for (const [o, m] of couches) o.layers.mask = m;
      for (const o of elagues) o.frustumCulled = true;
      for (const p of caches) p.visible = false;
      for (const [m, d, v] of hautes) if (!(d in m.defines)) m.defines[d] = v;
      const vus = this._vusRepli(R);
      for (const o of objets) for (const m of mats(o)) if (m) { m.needsUpdate = true; vus.set(m, m.version); }
    }
  }

  // Carte d'environnement générée depuis le ciel : donne un vrai reflet spéculaire à la peau, aux vêtements,
  // au ballon et au cercle, au lieu d'un éclairage plat.
  setEnv(on) {
    // Un terrain peut fournir SA carte (scene.userData.envTerrain, js/court.js carteHDR) : un vrai ciel HDR,
    // chargé à la demande la première fois que l'environnement s'allume — jamais en basse, en moyenne seulement sur
    // une machine costaude (envMoyenne). En attendant la photo, une carte uniforme de même taille (mêmes shaders :
    // rien à recompiler à l'arrivée).
    const terrain = this.scene.userData.envTerrain;
    if (terrain) {
      this._envOn = on;
      this.scene.environment = on ? terrain.charger(this.renderer, (carte) => { if (this._envOn) this.scene.environment = carte; }) : null;
      return;
    }
    if (!on) { if (this.scene.environment) { this.scene.environment = null; } return; }
    if (this.envMap) { this.scene.environment = this.envMap; return; }
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    // un petit ciel dégradé suffit : c'est la variation haut/bas qui fait le relief des reflets
    const c = document.createElement('canvas'); c.width = 16; c.height = 64;
    const g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 64);
    grd.addColorStop(0, '#9dc4ef'); grd.addColorStop(0.5, '#e7eef6'); grd.addColorStop(0.52, '#6f6a61'); grd.addColorStop(1, '#33312d');
    g.fillStyle = grd; g.fillRect(0, 0, 16, 64);
    const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
    this.envMap = pmrem.fromEquirectangular(tex).texture;
    tex.dispose(); pmrem.dispose();
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 0.55;
  }

  // Filtrage anisotrope : les textures vues en biais (le sol, les lignes, les façades) arrêtent de baver.
  setAniso(n) {
    const max = this.renderer.capabilities.getMaxAnisotropy?.() || 1;
    const v = Math.min(n, max);
    if (this._aniso === v) return;
    this._aniso = v;
    this.scene.traverse((o) => {
      if (!o.material) return;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        for (const k of CARTES_ANISO) { const t = m && m[k]; if (t && t.isTexture && !t.isRenderTargetTexture) this._poserAniso(t, v); }
      }
    });
  }
  // SANS RIEN RENVOYER (06/10/2026). Changer `anisotropy` puis `needsUpdate` renvoyait la texture ENTIÈRE à la carte
  // graphique (image et mipmaps), et setAniso le faisait pour toutes à la fois : mesuré en 5 contre 5 sur la Radeon
  // intégrée, 1,3 s d'image figée à chaque changement de préréglage — baisse automatique comprise, et chaque appui sur la
  // touche caméra qui repassait le préréglage. Le filtrage anisotrope n'est qu'un PARAMÈTRE de la texture déjà envoyée :
  // on le pose directement (texParameterf, aux mêmes conditions que three à l'envoi, WebGLTextures setTextureParameters),
  // sans version nouvelle — three garde sa texture. Pas encore envoyée : three posera `anisotropy` au premier envoi.
  _poserAniso(t, v) {
    if (t.anisotropy === v) return;
    t.anisotropy = v;
    const r = this.renderer, p = r.properties.get(t);
    if (!p.__webglTexture) return;
    if (t.magFilter === THREE.NearestFilter || (t.minFilter !== THREE.LinearMipmapLinearFilter && t.minFilter !== THREE.NearestMipmapLinearFilter)) return;
    const ext = r.extensions.get('EXT_texture_filter_anisotropic');
    if (!ext || (t.type === THREE.FloatType && !r.extensions.has('OES_texture_float_linear'))) return;
    const gl = r.getContext();
    const cible = t.isCubeTexture ? gl.TEXTURE_CUBE_MAP : (t.isDataArrayTexture || t.isCompressedArrayTexture) ? gl.TEXTURE_2D_ARRAY
      : t.isData3DTexture ? gl.TEXTURE_3D : gl.TEXTURE_2D;
    r.state.bindTexture(cible, p.__webglTexture);         // (par l'état de three : il sait ce qui est lié)
    gl.texParameterf(cible, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(v, r.capabilities.getMaxAnisotropy()));
    p.__currentAnisotropy = v;
  }
  // LES TEXTURES ARRIVÉES APRÈS (04/10/2026). setAniso ne passait qu'une fois, au choix du préréglage : tout ce qui se
  // charge ensuite — joueurs, voitures, modèles 3D du décor, passants — gardait le filtrage par défaut (1, flou dès qu'on
  // le voit en biais). Relevé en extrême à Bécon : 93 textures sur 166. Toutes les 2 s, ce qui est visible et sous le
  // filtrage du préréglage y est monté ; on ne baisse jamais une texture réglée plus haut par son terrain (le sol).
  // (06/10 : posé sur place, _poserAniso — plus de file d'une texture renvoyée par image)
  // L'ALPHA EN COUVERTURE (06/10/2026), relevé au même passage. Avec le MSAA de la scène (machine costaude,
  // PasseSceneMSAA), les arêtes des maillages sont lissées, mais pas le bord des DÉCOUPES (feuilles des arbres, cheveux,
  // passants) : un pixel y est gardé ou jeté (alphaTest), et le feuillage grésille en marches. alphaToCoverage change
  // l'alpha de la découpe en part des échantillons couverts : les bords des feuilles ont quatre niveaux, comme les arêtes.
  // Seulement quand ce MSAA tourne (sans échantillons, il n'aurait aucun effet) ; le changer recompile ces matériaux (17 à
  // La Cage) : à l'arrivée d'un objet, ou quand le MSAA s'allume ou s'éteint (option, préréglage) — jamais à chaque image.
  _anisoRetard(dt) {
    if (!this._aniso || (this._tAniso = (this._tAniso || 0) - dt) > 0) return;
    this._tAniso = 2;
    const v = this._aniso, a2c = !!(this.renderPass && this.renderPass.msaa);
    let n = 0;
    this.scene.traverseVisible((o) => {
      if (!o.material) return;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        if (m && m.alphaTest > 0 && !m.transparent && m.alphaToCoverage !== a2c) { m.alphaToCoverage = a2c; m.needsUpdate = true; }
        for (const k of CARTES_ANISO) {
          const t = m && m[k];
          if (!t || !t.isTexture || t.isRenderTargetTexture || t.anisotropy >= v) continue;
          n++; this._poserAniso(t, v);
        }
      }
    });
    if (n) this._anisoRelevees = (this._anisoRelevees || 0) + n;
  }

  // Rapport « au soleil / à l'ombre » sur un sol horizontal, en luminance (console : __game.fx.contraste()).
  // Cibles : 3,4 à 4 par grand soleil, 1,4 à 1,6 couvert, 1,2 à 1,3 sous la pluie ; même valeur en moyenne qu'en haute.
  contraste() {
    const e = this.scene.userData.env, S = this.scene.userData.sunDir, Y = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const soleil = e.sun.intensity * Math.max(0, S.y) * Y(e.sun.color.r, e.sun.color.g, e.sun.color.b);
    const fy = Math.max(0, e.fill.position.clone().normalize().y);
    let ombre = e.hemi.intensity * Y(e.hemi.color.r, e.hemi.color.g, e.hemi.color.b) + e.fill.intensity * fy * Y(e.fill.color.r, e.fill.color.g, e.fill.color.b);
    if (this.scene.environment) ombre += Math.PI * 0.69 * this.scene.environmentIntensity;
    return { soleil: +soleil.toFixed(3), ombre: +ombre.toFixed(3), rapport: +((soleil + ombre) / ombre).toFixed(2) };
  }

  // CADRAGE DE LA CARTE D'OMBRE sur ce qui doit recevoir une ombre nette (scene.userData.zoneOmbre, en coordonnées
  // monde, déclarée par le terrain ; sinon un carré de ±span autour de l'origine). Avant, la caméra d'ombre était un
  // carré fixe autour de l'origine : à La Cage la moitié de ses texels tombait hors de l'enceinte, au parc le plateau
  // (30 m sur 18) n'en couvrait qu'un coin. On essaie trois « haut » pour la caméra d'ombre et on garde la boîte la
  // plus petite : les texels vont là où on joue. DirectionalLightShadow refait lookAt avec c.up à chaque image : le
  // choix tient. near/far inchangés, le rayon des ombres douces reste juste.
  _cadrerOmbre(o, P, q, douces = !!P.douces) {
    // PARC ENTIER (lot A6, js/monde_ombres.js) : la carte SUIT le joueur, recadrée à chaque image par pas de texel ; le
    // changement de préréglage (taille de la carte, rayon du § 3.6) lui est seulement signalé
    const suivie = this.scene.userData.ombreSuivie;
    if (suivie) { suivie.recadrer(); return; }
    const c = o.shadow.camera, v = this._vO || (this._vO = new THREE.Vector3()), b = this._bO || (this._bO = new THREE.Box3());
    const Z = this.scene.userData.zoneOmbre || { min: [-P.span, 0, -P.span], max: [P.span, 8, P.span] };
    const m = douces ? (q === 'extreme' ? -4 : 0) : 6;          // PCF sans fondu au bord : on couvre plus large
    let x0 = Z.min[0] - m, x1 = Z.max[0] + m, z0 = Z.min[2] - m, z1 = Z.max[2] + m, y1 = Z.max[1];
    // AU TÉLÉPHONE, L'ENCEINTE SEULE (07/10/2026). Sa carte est plafonnée à 2048 : cadrée sur toute la zone du terrain (la
    // rue comprise, plus la marge du PCF), elle tombait à 2,7 cm par texel — des ombres de joueurs en escalier, des
    // pénombres de platanes en pavés. On la resserre sur l'enceinte grillagée à 3 m près (js/config.js ENCEINTE, celle du
    // terrain chargé) : la rue n'a plus d'ombres portées au téléphone, l'aire de jeu les a deux fois plus fines. Le PC, lui,
    // garde la rue. En hauteur, jusqu'au haut du grillage (H2) : au-dessus, le haut des houppiers est au soleil de toute
    // façon. Mesuré à La Cage : 25,0 x 39,8 m au lieu de 50,6 x 69,6 (1,9 cm par texel au lieu de 3,4).
    if (this.dev.telephone) {
      const E = ENCEINTE;
      x0 = Math.max(x0, -(E.X + 3)); x1 = Math.min(x1, (E.XP ?? E.X) + 3); z0 = Math.max(z0, -(E.Z + 3)); z1 = Math.min(z1, E.Z + 3);
      y1 = Math.max(Z.min[1] + 1, Math.min(y1, E.H2 || y1));
    }
    o.updateMatrixWorld(); o.target.updateMatrixWorld();
    const cible = new THREE.Vector3().setFromMatrixPosition(o.target.matrixWorld);
    const dir = cible.clone().sub(new THREE.Vector3().setFromMatrixPosition(o.matrixWorld)).normalize();
    let best = null;
    for (const up of [[0, 1, 0], [0, 0, 1], [1, 0, 0]]) {
      if (Math.abs(v.fromArray(up).dot(dir)) > 0.95) continue;    // lookAt dégénéré
      c.up.fromArray(up); c.position.setFromMatrixPosition(o.matrixWorld); c.lookAt(cible); c.updateMatrixWorld(true);
      b.makeEmpty();
      for (let i = 0; i < 8; i++) {
        b.expandByPoint(v.set(i & 1 ? x1 : x0, i & 2 ? y1 : Z.min[1], i & 4 ? z1 : z0)
          .applyMatrix4(c.matrixWorldInverse));
      }
      const aire = (b.max.x - b.min.x) * (b.max.y - b.min.y);
      if (aire > 0 && (!best || aire < best.aire)) best = { aire, up, l: b.min.x, r: b.max.x, bo: b.min.y, t: b.max.y };
    }
    if (!best) return;
    c.up.fromArray(best.up); c.left = best.l; c.right = best.r; c.bottom = best.bo; c.top = best.t; c.updateProjectionMatrix();
    console.info('[fx] ombre : haut', best.up.join(','), '·', (best.r - best.l).toFixed(1), 'x', (best.t - best.bo).toFixed(1), 'm');
  }

  // Tout plan à découpe (feuilles, lierres, grillages, calques) : MeshNormalMaterial ignore la découpe et en faisait
  // des plaques pleines pour l'occlusion (damiers, ciel assombri entre les feuilles). La liste déclarée par un terrain
  // (parc) plus un relevé automatique toutes les 2 s, parce que les arbres GLB arrivent après le chargement.
  // PARC ENTIER (lot A5) : pas de relevé toutes les 2 s — la scène y compte des milliers d'objets, le parcours faisait un
  // à-coup à chaque fois, et la liste était fausse dès qu'un morceau de décor arrivait ou partait entre deux relevés. Un
  // seul parcours, au premier appel, puis le REGISTRE que tient js/monde_charge.js (scene.userData.registreDecoupes :
  // les feuillages des morceaux et des arbres du parc, ajoutés et retirés avec eux), plus les feuillages déclarés.
  // Les deux relevés prennent aussi tout objet marqué `userData.sansNormales` (filets des paniers, js/hoopfx.js ; celui
  // du décor du parc, js/court_parc.js) : sans découpe, mais trop fins pour l'occlusion (voir le constructeur). Au parc,
  // les paniers sont posés avec le décor, avant la première image : le relevé unique du parc entier les voit. Ailleurs
  // (La Cage : le panier arrive avec son modèle), le relevé toutes les 2 s les prend dès qu'ils sont là.
  // LES SPRITES AUSSI, tous (recette finale, B1) : halo et traînée de la balle (js/ball.js, la traînée verte du lâcher
  // parfait et celle du joueur EN FEU), plaques de pseudo, plaque du marchand, halos des lampes. Dessiné avec
  // MeshNormalMaterial, un sprite perd son shader de panneau toujours tourné vers la caméra : il devient un quad plat
  // et PLEIN (la transparence de sa texture ne compte plus) dans le plan XY de son repère — celui du monde pour la
  // balle —, vu de biais ou par la tranche selon la caméra, qui écrit sa profondeur et une normale fausse. L'occlusion
  // traçait alors une lame noire par sprite le long de la traînée, un losange sombre autour de la balle. Un sprite n'a
  // de toute façon aucun volume qui puisse ombrer quoi que ce soit. (Au parc entier, les plaques de pseudo arrivées
  // après le relevé unique passent par le registre : js/presence.js, horsNormales.)
  _decoupes() {
    const reg = this.scene.userData.registreDecoupes;
    if (reg) {
      const f = this.scene.userData.feuillages || [];
      if (!this._decBase) {
        this._decBase = new Set();
        this.scene.traverse((o) => {
          if (o.isSprite) { this._decBase.add(o); return; }   // (recette finale, B1 : voir au-dessus de _decoupes)
          if (!o.isMesh || o.isSkinnedMesh) return;
          const m = Array.isArray(o.material) ? o.material[0] : o.material;
          if (o.userData.sansNormales || (m && m.map && (m.alphaTest > 0 || m.transparent))) this._decBase.add(o);
        });
      }
      if (this._decV !== reg.version || this._decN !== f.length) {
        this._decV = reg.version; this._decN = f.length;
        this._dec = [...new Set([...this._decBase, ...f, ...reg.set])].filter((o) => o.parent);
      }
      return this._dec;
    }
    const t = performance.now();
    if (!this._dec || t - this._decT > 2000) {
      this._decT = t;
      const s = new Set(this.scene.userData.feuillages || []);
      this.scene.traverse((o) => {
        if (o.isSprite) { s.add(o); return; }
        if (!o.isMesh || o.isSkinnedMesh) return;
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        if (o.userData.sansNormales || (m && m.map && (m.alphaTest > 0 || m.transparent))) s.add(o);
      });
      this._dec = [...s];
    }
    return this._dec;
  }

  // Les points et les lignes de la scène, que la passe de normales de l'occlusion cache (voir le constructeur).
  _pointsLignes() {
    const t = performance.now();
    if (!this._pl || t - this._plT > 2000) {
      this._plT = t;
      const L = this._pl || (this._pl = []);
      L.length = 0;
      this.scene.traverse((o) => { if (o.isPoints || o.isLine) L.push(o); });
    }
    return this._pl;
  }

  // Décor lointain (immeubles de la rue, arbres au-delà de l'enceinte) : on relève une fois qui est loin du
  // centre, pour pouvoir couper leur projection d'ombre sur les préréglages bas sans toucher au terrain.
  _ombresDecor(on) {
    // PARC ENTIER (lot A6) : « lointain » se mesure depuis le joueur, qui peut être à 150 m du plateau, et seul le décor du
    // plateau est concerné (les morceaux des zones et les arbres du parc ont leur propre portée d'ombre) : js/monde_ombres.js
    const suivie = this.scene.userData.ombreSuivie;
    if (suivie) { suivie.decor(on); return; }
    if (!this._decor) {
      this.scene.updateMatrixWorld(true);
      this._decor = [];
      const p = new THREE.Vector3();
      this.scene.traverse((o) => {
        if (!o.isMesh || !o.castShadow || o.userData.ombreToujours) return;   // (l'écran du pin du parc : il fait l'ombre du plateau)
        const bs = o.geometry && (o.geometry.boundingSphere || (o.geometry.computeBoundingSphere(), o.geometry.boundingSphere));
        if (bs) p.copy(bs.center).applyMatrix4(o.matrixWorld); else o.getWorldPosition(p);
        if (Math.hypot(p.x, p.z) > 24) this._decor.push(o);     // l'enceinte grillagée va jusqu'à ~15,6 m
      });
      console.info('[fx] décor lointain repéré :', this._decor.length, 'objets (ombres coupées en basse/moyenne)');
    }
    for (const o of this._decor) o.castShadow = on;
  }

  resize(w, h) { this._appliquerRatio(true); }

  // ---------- résolution dynamique ----------
  // Baisser la résolution interne quand ça rame, la remonter quand ça respire.
  //
  // L'ANCIENNE RÈGLE (seuils fixes 22 / 17,5 / 12,5 ms, décision toutes les 0,7 s, pas de 0,04 à 0,12) était prise
  // entre les marches de la vsync — requestAnimationFrame ne rend la main qu'à un top d'écran, les intervalles valent
  // donc 1, 2, 3... périodes :
  //   - à 165 Hz (l'écran de Haythem : 6,1 / 12,1 / 18,2 / 24,2 ms) elle descendait sur 18,2 et remontait sur 12,1 :
  //     23 changements en 40 s, et chacun réalloue TOUTES les cibles de rendu (gels de 25 à 474 ms mesurés) ; en
  //     balade elle restait collée à 80 %, image molle. Même en résolution choisie à la main ;
  //   - à 60 Hz (et à 120 Hz dès qu'une image dépasse 8,3 ms), « moins de 12,5 ms » est impossible : une fois
  //     descendue, elle ne remontait JAMAIS (80 % sur PC, 55 % sur téléphone, pour toute la partie) ;
  //   - sur la Radeon intégrée, baisser la résolution ne rapporte rien (21-23 ms à 100 % comme à 137 %) : elle payait
  //     les gels sans rien gagner.
  // LES RÈGLES D'AUJOURD'HUI, raisonnées en vsync (simulées à 60, 90, 120 et 165 Hz : graphismes/L9/sim_dyn3.py) :
  //   - T = période de l'écran : le 5e centile des intervalles des 2 dernières secondes, jamais plus que la plus courte
  //     déjà vue (_noterPeriode) — un jeu qui ne passe jamais sous 18,2 ms à 165 Hz ne fait pas de l'écran un 55 Hz ;
  //   - DESCENDRE seulement si la médiane dépasse 22,5 ms (sous 45 im/s ; 22,5 et pas 22 : 45 im/s tenus pile à 90 Hz
  //     font 22,2 ms, ce n'est pas une chute) ;
  //   - MONTER quand la médiane tient la cadence de l'écran, ≤ 1,05 × max(T, 16,7 ms) : 16,7 ms à 60 Hz monte, c'est
  //     la fin du cliquet à 60 et 120 Hz. Entre les deux, on ne bouge pas — sauf UN essai par préréglage quand le jeu
  //     est régulier sur une marche plus lente (médiane ≤ 1,05 × le 5e centile de la fenêtre : 45 im/s tenus à 90 Hz,
  //     55 à 165 Hz) : la résolution entière y tient peut-être la même marche. Si l'essai refait descendre, on n'essaie
  //     plus : seule la cadence de l'écran fera remonter ;
  //   - pas de 0,1, au plus un changement toutes les 3 s, et les 3 images qui suivent un pas ne comptent pas (elles
  //     paient la réallocation). Une remontée qui refait passer au-dessus du seuil dans les 20 s redescend et bloque
  //     toute remontée 10 s, puis 30, puis 90 : la machine est à la limite, inutile de le revérifier sans cesse ;
  //   - SONDE DE GAIN, sur PC : la première descente va droit à 80 %. Si l'image n'y gagne pas 10 % de temps (moyenne
  //     des intervalles, les 10 % les plus lents écartés : 2 s à 80 % contre la DERNIÈRE seconde à 100 %, voir
  //     derniereSeconde), on revient à 100 % et on n'y touche plus pour ce préréglage,
  //     ni aux parties suivantes (_lireFigees) : la machine n'est pas limitée par le nombre de pixels, c'est au
  //     PRÉRÉGLAGE de descendre (« souffrance »). Mesuré sur la Radeon 660M : 80 % ne fait gagner que 9 %.
  //     Sur téléphone, toujours limité par le remplissage, pas de sonde.
  // Une résolution choisie à la main n'est donc jamais rabotée tant que le jeu tient 45 im/s.
  //
  // LE COÛT DE L'IMAGE PLUTÔT QUE LA MARCHE DE VSYNC (07/10/2026, lot RENDU). Les règles du dessus restaient prises au piège
  // de la vsync : sur la Radeon 660M (écran à 165 Hz), la moyenne coûte 18,5 à 18,9 ms à la carte graphique en 3 contre 3
  // — 0,3 ms au-dessus de 3 périodes (18,2 ms) —, ses intervalles tombaient donc sur 4 périodes (24,2 ms), la médiane
  // passait au-dessus de 22,5 ms, et le mode auto descendait de moyenne en BASSE entre 15 et 23 s de match (juge, en direct).
  // Une image qui coûte 18,7 ms n'est pas « sous 45 im/s » : seule la marche de l'écran l'était. Quand la carte graphique
  // donne ses requêtes de temps (EXT_disjoint_timer_query_webgl2 : Chrome, Edge, la plupart des Android), on juge donc
  // le COÛT de l'image (`_cout` : médianes, sur la même fenêtre de 2 s, du temps de la carte graphique et du temps passé
  // par le processeur entre le début de Game.frame et la fin du rendu) :
  //   - la résolution dynamique vise la marche de vsync la plus lente qui tienne encore 45 im/s (`_cible` : 3 périodes à
  //     165 Hz, 18,2 ms ; 1 à 60 Hz ; 3 à 144 Hz...), avec 5 % de marge pour le compositeur du navigateur. Elle DESCEND
  //     quand la carte graphique dépasse la cible de 3 %, et REMONTE d'un cran quand le coût prévu au cran du dessus
  //     (`_coutA` : la part du coût qui suit le nombre de pixels, `_fPix`, mesurée par la sonde de gain) tient sous la
  //     cible à 3 % près. Le processeur n'y entre pas : la résolution ne change rien à son travail ;
  //   - la SONDE DE GAIN juge au temps de la carte graphique (la médiane de la dernière seconde à 100 % contre 2 s à
  //     80 %) : mesuré sur la 660M, 80 % font gagner 22 à 27 % (la part des pixels vaut 0,75), et non 9 % — chiffre
  //     des intervalles d'écran, où un gain de 4 ms disparaît dans la même marche de vsync ;
  //   - le PRÉRÉGLAGE ne descend que si l'image coûte encore plus que le budget (45 im/s, `BUDGET_IMAGE`) AU PLANCHER de la
  //     résolution (ou figée par la sonde), processeur compris, pendant plus de 4 s de suite : la résolution dynamique
  //     absorbe d'abord les petits dépassements. Et de moyenne en BASSE sur PC, seulement sous 30 im/s (`_seuilBaisse`) :
  //     la basse se voit (rendu direct, ombres de 1024), elle n'est là que pour une machine qui n'avance plus.
  // Sans requêtes de temps (Safari, Firefox), on garde les intervalles ; mais le préréglage n'y descend plus qu'au-delà
  // d'une marche de vsync au-dessus du budget (26 ms : 24,2 ms à 165 Hz, qu'une résolution plus basse peut encore
  // ramener à 18,2, ne suffit plus), et de moyenne en basse sur PC sous 30 im/s (34 ms).
  _majDynamique(ms) {
    // setQuality et le constructeur posent une NOUVELLE fenêtre `_fen` : le préréglage vient de changer et toutes les
    // cibles d'être réallouées. On repart de zéro : 3 images ignorées, 3 s avant la première décision.
    if (this._dynFen !== this._fen) {
      this._dynFen = this._fen; this._dynSomme = 0; this._dynT = 0; this._dynEval = 0; this._dynIgnore = 3;
      this._dynMontee = -1e9; this._dynBloque = 0; this._dynEchecs = 0; this._sonde = 0;
      this._razCout();
    }
    const sec = ms / 1000;
    this._dynH = (this._dynH || 0) + sec;          // horloge des vraies images (un onglet en pause n'avance pas)
    this._dynT += sec; this._dynBloque = Math.max(0, this._dynBloque - sec);
    if (this._dynIgnore > 0) { this._dynIgnore--; return; }
    const f = this._fen;
    f.push(ms); this._dynSomme += ms;
    while (f.length > 1 && this._dynSomme - f[0] >= 2000) this._dynSomme -= f.shift();   // fenêtre de 2 s
    this._dynEval += sec;
    if (this._dynEval < 0.5 || this._dynSomme < 1900 || f.length < 12) return;          // un regard par demi-seconde
    this._dynEval = 0;
    const s = f.slice().sort((a, b) => a - b), med = s[s.length >> 1], p = s[Math.floor(s.length * 0.05)];
    const T = Math.min(this._tEcran || Infinity, p);
    const C = this._cout(f.length);                                                    // null : pas de requêtes de temps
    const tenu = med <= 1.05 * Math.max(T, 16.7), regulier = med <= 1.05 * p;
    const plancher = this._dynMin(), avant = this.dyn, cle = this._cleDyn();
    const figees = this._dynFigees || (this._dynFigees = this._lireFigees()), sondees = this._dynSondees || (this._dynSondees = new Set());
    const sansEssai = this._dynSansEssai || (this._dynSansEssai = new Set());
    let lent, monter;
    if (C) {
      const cible = this._cible();
      lent = C.gpu > cible * 1.03;
      monter = !lent && this._coutA(C.gpu, this.dyn, Math.min(1, this.dyn + 0.1)) <= cible * 0.97;
    } else {
      lent = med > 22.5;
      monter = (tenu || (regulier && !sansEssai.has(cle))) && !lent;
    }
    if (this._dynT >= 3) {
      if (this._sonde) {
        // conclusion de la sonde : 2 s à 80 % contre la dernière seconde à 100 % avant la descente (temps de la carte
        // graphique quand on l'a, sinon intervalles) ; elle donne aussi la part du coût qui suit les pixels
        const gain = this._sondeCout && C ? 1 - C.gpu / this._sonde : 1 - moyenneRognee(s) / this._sonde;
        const px = 1 - this.dyn * this.dyn;                                          // la part de pixels retirée
        if (this._sondeCout && C && px > 0.05) this._fPix = Math.min(0.95, Math.max(0.2, gain / px));
        this._sonde = 0;
        if (gain < 0.1) {
          figees.add(cle); this._ecrireFigees(cle); this.dyn = 1;
          console.info('[fx] résolution dynamique : 80 % ne fait gagner que', Math.round(gain * 100), '% → figée à 100 % en', cle);
        } else console.info('[fx] résolution dynamique : 80 % fait gagner', Math.round(gain * 100), '%', this._fPix ? '(part des pixels ' + this._fPix.toFixed(2) + ')' : '');
      }
      if (this.dyn === avant) {
        if (lent && !figees.has(cle) && this.dyn > plancher + 1e-3) {
          if (this._dynH - this._dynMontee < 20) {
            this._dynBloque = Math.min(90, 10 * 3 ** this._dynEchecs); this._dynEchecs++;   // 10, 30, puis 90 s au plus
            if (this._dynEssai) sansEssai.add(cle);
          }
          if (!this.dev.telephone && this.dyn >= 0.999 && !sondees.has(cle)) {
            sondees.add(cle);
            const d1 = derniereSeconde(f), C1 = C && this._cout(d1.length);
            this._sondeCout = !!C1; this._sonde = C1 ? C1.gpu : moyenneRognee(d1);
            this.dyn = Math.max(plancher, 0.8);
          } else this.dyn = Math.max(plancher, +(this.dyn - 0.1).toFixed(2));
        } else if (monter && this.dyn < 1 && this._dynBloque <= 0) {
          this._dynEssai = !C && !tenu;
          this.dyn = Math.min(1, +(this.dyn + 0.1).toFixed(2));
        }
      }
    }
    if (this.dyn !== avant) {
      if (this.dyn > avant) this._dynMontee = this._dynH;
      this._dynT = 0; this._dynIgnore = 3; f.length = 0; this._dynSomme = 0; this._razCout();
      console.info('[fx] résolution dynamique :', Math.round(avant * 100), '→', Math.round(this.dyn * 100), '% (médiane', med.toFixed(1), 'ms',
        C ? '· carte graphique ' + C.gpu.toFixed(1) + ' ms, cible ' + this._cible().toFixed(1) : '', '· écran', (1000 / T).toFixed(0), 'Hz)');
      this._appliquerRatio();
      return;
    }
    // Filet de sécurité : si même au plancher de résolution ça reste trop lent, c'est le PRÉRÉGLAGE qui est
    // trop haut (ombres, SSR, occlusion ambiante ne dépendent pas de la résolution interne). On descend d'un cran.
    // « Au plancher » compte aussi la résolution figée par la sonde : là, la baisser ne servirait à rien.
    const auPlancher = this.dyn <= plancher + 0.01 || figees.has(cle);
    const seuil = this._seuilBaisse();
    const charge = C ? auPlancher && Math.max(C.gpu, C.cpu) > seuil
      : auPlancher && med > (seuil > BUDGET_IMAGE + 1 ? 34 : 26);
    if (charge) {
      this._souffrance += 0.5;
      if (this._souffrance > 4) {
        const i = PostFX.ORDRE.indexOf(this.quality);
        this._souffrance = 0;
        // On ne rétrograde QUE le mode auto. Si Haythem a cliqué « Extrême » en connaissance de cause, on ne le
        // lui reprend pas dans le dos : on le prévient et on le laisse voir ce que ça donne.
        if (!this.auto) {
          if (!this._plaint) { this._plaint = true; document.dispatchEvent(new CustomEvent('hoops-qualite-lourde', { detail: { quality: this.quality, ms: +med.toFixed(1) } })); }
        } else if (i > 0) {
          console.warn('[fx] toujours', C ? Math.max(C.gpu, C.cpu).toFixed(1) + ' ms par image (carte graphique ' + C.gpu.toFixed(1) + ', processeur ' + C.cpu.toFixed(1) + ')' : med.toFixed(1) + ' ms',
            'au plancher de résolution → préréglage', PostFX.ORDRE[i - 1]);
          this._echecRemontee();              // (une remontée récente qui n'a pas tenu : la suivante attendra plus longtemps)
          const auto = this.auto; this.setQuality(PostFX.ORDRE[i - 1], true); this.auto = auto;
          document.dispatchEvent(new CustomEvent('hoops-qualite-baissee', { detail: { quality: this.quality } }));
        }
      }
    } else this._souffrance = Math.max(0, this._souffrance - 0.25);
  }

  // Le coût des images de la fenêtre de décision (les `n` dernières) : médianes du temps de la carte graphique (requêtes
  // de temps) et du temps du processeur (debutImage → fin du rendu). null sans requêtes de temps, ou sans assez de
  // réponses (elles reviennent quelques images plus tard, jamais attendues).
  _cout(n) {
    const g = this._gpuFen, c = this._cpuFen;
    if (!(n > 0) || !g || g.length < Math.max(10, 0.5 * n)) return null;
    return { gpu: medianeFin(g, n), cpu: c.length >= 10 ? medianeFin(c, n) : 0 };
  }
  // Nouvelle fenêtre de coût : les réponses des images d'avant (autre préréglage, autre résolution) sont jetées.
  _razCout() { this._genCout = (this._genCout || 0) + 1; if (this._gpuFen) { this._gpuFen.length = 0; this._cpuFen.length = 0; } }
  // Le coût prévu, à la résolution r1, d'une image qui coûte `c` à la carte graphique à la résolution r0.
  _coutA(c, r0, r1) { const f = this._fPix ?? F_PIX; return c * (1 - f + f * (r1 * r1) / Math.max(0.01, r0 * r0)); }
  // La cible de la résolution dynamique : la marche de vsync la plus lente qui tienne encore 45 im/s, avec 5 % de marge
  // (période de l'écran, ou celle de la limite d'images par seconde quand elle est plus longue).
  _cible() {
    const Tv = Math.max(this._tEcran || 1000 / 60, this.periodeCap || 0);
    return Math.max(1, Math.floor(BUDGET_IMAGE / Tv + 0.02)) * Tv * 0.95;
  }
  // Le coût au-delà duquel le préréglage descend : le budget (45 im/s) ; de moyenne en basse sur PC, 30 im/s.
  _seuilBaisse(q = this.quality) { return !this.dev.telephone && q === 'medium' ? 1000 / 30 : BUDGET_IMAGE; }
  // Début d'une image (js/game.js, en tête de frame) : le temps du processeur se compte de là à la fin du rendu.
  debutImage() { this._tDebut = performance.now(); }

  // LA REMONTÉE (06/10/2026). Le mode auto ne faisait que DESCENDRE : sur un écran à 60 Hz, un jeu qui tient la cadence
  // donne 16,7 ms par image quel que soit le travail fait, et rien ne disait qu'il y avait de la marge. Un téléphone qui a
  // chauffé (ou un portable sur batterie) restait donc en basse pour toute la session, même refroidi. On mesure ce que
  // l'image COÛTE à la carte graphique (requêtes de temps EXT_disjoint_timer_query_webgl2, `_gpuLisse` : rendu et
  // post-traitement, carte d'ombre comprise) et, faute de cette extension (Safari), on se contente de la cadence de l'écran
  // tenue. Le préréglage remonte d'UN cran quand :
  //   - la qualité est automatique, la mesure de départ terminée, et l'on est sous le préréglage de DÉPART de la machine
  //     (presetDepart : un téléphone ne monte jamais seul en haute — ses programmes y sont déjà compilés, rien à figer) ;
  //   - l'image tient la cadence (intervalle ≤ 1,05 période) ET coûte moins de 55 % de la période à la carte graphique,
  //     sans interruption pendant 12 s (30 s sans requête de temps) ;
  //   - le moment est CALME (`calme`, posé par js/game.js : hors d'une action de match) — le changement coûte une image ;
  //   - et l'essai précédent n'a pas échoué récemment : une baisse dans les 30 s qui suivent une remontée bloque les
  //     suivantes 1 min, puis 3, 9, 27 (_echecRemontee). Une qualité qui clignote est pire qu'une qualité un peu basse.
  _remonter(ms) {
    const ordre = PostFX.ORDRE, i = ordre.indexOf(this.quality);
    const haut = Math.min(ordre.indexOf(this.presetDepart()), ordre.indexOf(this.plafond()));
    if (!this.auto || !this._decided || i < 0 || i >= haut || this._dejaPlante(ordre[i + 1])) { this._aise = 0; return; }
    const T = Math.max(this._tEcran || 16.7, this.periodeCap || 0);
    const tenu = (this._msLisse || ms) <= 1.05 * T;
    const gpu = this._gpuLisse;
    this._aise = tenu && (gpu === undefined || gpu < 0.55 * T) ? (this._aise || 0) + ms / 1000 : 0;
    if (this._aise < (gpu === undefined ? 30 : 12) || !this.calme || this._dynH < (this._remonteeLibre || 0)) return;
    this._aise = 0;
    this._remonteeA = this._dynH;
    console.info('[fx] marge mesurée (', gpu === undefined ? 'cadence tenue' : gpu.toFixed(1) + ' ms à la carte graphique', ', période', T.toFixed(1), 'ms ) → préréglage', ordre[i + 1]);
    const auto = this.auto; this.setQuality(ordre[i + 1], true); this.auto = auto;
    document.dispatchEvent(new CustomEvent('hoops-qualite-remontee', { detail: { quality: this.quality } }));
  }
  _echecRemontee() {
    if (this._remonteeA === undefined || this._dynH - this._remonteeA > 30) return;
    this._echecs = (this._echecs || 0) + 1;
    this._remonteeLibre = this._dynH + 60 * 3 ** Math.min(3, this._echecs - 1);
    console.info('[fx] la remontée n\'a pas tenu : prochaine tentative dans', Math.round(this._remonteeLibre - this._dynH), 's');
  }
  // Le temps que la carte graphique passe sur l'image (voir _remonter) : une requête par image, relue quelques images
  // plus tard sans jamais attendre ; une mesure faussée (GPU_DISJOINT) est jetée.
  // CONTEXTE PERDU (06/10/2026) : createQuery y rend null et beginQuery(null) LÈVE une exception — l'image s'arrêtait
  // avant ombreCache.apres(), et les ombres du décor restaient coupées une fois le contexte rendu. Pas de mesure tant
  // qu'il est perdu ; les requêtes et l'extension de l'ancien contexte sont oubliées (reprises sur le nouveau).
  _chronoDebut() {
    const gl = this.renderer.getContext();
    if (gl.isContextLost()) return null;
    const ext = this._extTemps !== undefined ? this._extTemps : (this._extTemps = gl.getExtension('EXT_disjoint_timer_query_webgl2'));
    if (!ext || !this.auto) return null;
    const q = gl.createQuery();
    if (!q) return null;
    gl.beginQuery(ext.TIME_ELAPSED_EXT, q); return q;
  }
  _chronoFin(q) {
    const gl = this.renderer.getContext(), ext = this._extTemps, file = this._requetes || (this._requetes = []);
    if (gl.isContextLost()) { file.length = 0; this._extTemps = undefined; return; }
    if (!ext) { for (const r of file) gl.deleteQuery(r.q); file.length = 0; return; }    // (plus d'extension : on jette)
    // (chaque requête garde la fenêtre de coût de son image, `_genCout` : une réponse arrivée après un changement de
    // préréglage ou de résolution ne compte pas pour la nouvelle fenêtre — voir _cout)
    if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); file.push({ q, g: this._genCout, bonne: this._imageBonne }); }
    // (07/10/2026) jusqu'à 16 requêtes en attente, et non 6 : en direct, sur la 660M chargée, la carte graphique rend ses
    // réponses plus de 6 images après, et les fenêtres de coût se vidaient — le mode auto retombait sur les intervalles
    while (file.length && (file.length > 16 || gl.getQueryParameter(file[0].q, gl.QUERY_RESULT_AVAILABLE))) {
      const r = file.shift();
      const ok = gl.getQueryParameter(r.q, gl.QUERY_RESULT_AVAILABLE) && !gl.getParameter(ext.GPU_DISJOINT_EXT);
      if (ok) {
        const v = gl.getQueryParameter(r.q, gl.QUERY_RESULT) / 1e6;
        this._gpuLisse = this._gpuLisse === undefined ? v : this._gpuLisse + (v - this._gpuLisse) * 0.05;
        if (r.g === this._genCout && r.bonne) { this._gpuFen.push(v); if (this._gpuFen.length > 400) this._gpuFen.shift(); }
      }
      gl.deleteQuery(r.q);
    }
  }

  // Le verdict de la sonde vaut pour une puce, un préréglage ET une résolution choisie (le coût change avec les trois).
  _cleDyn() { return (this.dev.gpu || '?') + '|' + this.quality + '|' + (this.res || 'auto'); }

  // Le verdict « figée » est GARDÉ d'une partie à l'autre (30 jours) : la sonde coûte deux changements de résolution,
  // donc deux réallocations de toutes les cibles, et la réponse ne change pas tant que la puce reste la même (la clé
  // la nomme : passer d'Edge sur la Radeon à Edge sur la RTX refait la sonde).
  _lireFigees() {
    const s = new Set();
    try {
      const m = JSON.parse(localStorage.getItem(CLE_FIGEES) || '{}'), t = Date.now();
      for (const [k, v] of Object.entries(m)) if (t - v < 30 * 864e5) s.add(k);
    } catch (e) { /* stockage indisponible : on resondera */ }
    return s;
  }
  // On n'horodate QUE le nouveau verdict : les anciens gardent leur date, sinon chaque verdict ajouté repoussait les
  // 30 jours de tous les autres et un pilote mis à jour n'aurait jamais été resondé. Les verdicts périmés sont purgés.
  _ecrireFigees(cle) {
    try {
      const m = JSON.parse(localStorage.getItem(CLE_FIGEES) || '{}'), t = Date.now();
      for (const k of Object.keys(m)) if (!(t - m[k] < 30 * 864e5)) delete m[k];
      m[cle] = t;
      localStorage.setItem(CLE_FIGEES, JSON.stringify(m));
    } catch (e) { /* stockage indisponible : le verdict vaut pour cette partie seulement */ }
  }

  // PÉRIODE DE L'ÉCRAN, estimée sur toutes les vraies images depuis le lancement (menu compris, où la scène coûte
  // souvent moins), par paquets de 60 intervalles, en gardant le plus petit jamais vu :
  //   - le 5e centile du paquet (un jeu qui tient la cadence la montre directement) ;
  //   - l'ÉCART entre deux marches de vsync : un jeu lourd à 165 Hz alterne 18,2 et 24,2 ms, l'écart (6,1 ms) est la
  //     période, alors qu'aucune image ne descend sous 18,2. Marches = paquets d'intervalles distants de plus de 3 ms,
  //     d'au moins 3 images chacun (un à-coup isolé ne fait pas une marche).
  // Sans cela, un jeu régulier à 55 im/s sur un écran à 165 Hz passait pour « tenir la cadence » et remontait sa
  // résolution pour rien (puis redescendait : le pompage qu'on veut supprimer).
  _noterPeriode(ms) {
    const b = this._perBuf || (this._perBuf = []);
    b.push(ms);
    if (b.length < 60) return;
    b.sort((a, c) => a - c);
    let t = b[3], n = 1, som = b[0], prec = null;
    for (let i = 1; i <= b.length; i++) {
      if (i < b.length && b[i] - b[i - 1] <= 3) { n++; som += b[i]; continue; }
      if (n >= 3) { const c = som / n; if (prec !== null && c - prec > 3) t = Math.min(t, c - prec); prec = c; }
      if (i < b.length) { n = 1; som = b[i]; }
    }
    this._tEcran = Math.min(this._tEcran || Infinity, t);
    b.length = 0;
  }

  // « En jeu » : l'écran de chargement est parti ET le HUD de la balade ou du match est affiché (js/game.js le montre
  // dans enterLobby et startMatch, le cache dans le menu et la sélection). C'est là que le mode auto mesure.
  _enJeu() {
    if (typeof document === 'undefined') return true;
    if (document.getElementById('boot')) return false;
    const hud = document.getElementById('hud');
    return !hud || !hud.hidden;
  }

  // dt réel (s) ; les FPS ne sont mesurés que sur de vraies images (onglet visible, pas de gel)
  render(dt) {
    this.scene.userData.envTerrain?.avancer?.(this.renderer);   // capture de la carte d'environnement, une face par image
    // soleil à l'écran : uSun sert aux rayons ; uRays tombe à 0 quand le soleil est derrière la caméra
    const sd = this.scene.userData.sunDir;
    if (sd && this.rays > 0.004) {
      this._sunNdc.copy(sd).multiplyScalar(300).add(this.camera.position).project(this.camera);
      const behind = this._sunNdc.z > 1;
      // J'ai essaye de BORNER le point d'origine pour que la gerbe parte du haut meme quand le soleil est
      // hors cadre — il l'est presque toujours, a 55° au-dessus de l'horizon. C'etait une fausse bonne idee :
      // les echantillons pris au-dela du bord sont rabattus SUR le bord par le clamp, si bien que chaque
      // pixel recevait la moyenne du haut de l'ecran. Le ciel se deversait sur le terrain.
      // Les rayons d'ecran restent donc ce qu'ils doivent etre : un eblouissement quand on leve les yeux vers
      // le soleil — un eblouissement, pas un decor qu'on plaque devant l'image.
      this.grade.uniforms.uSun.value.set(this._sunNdc.x * 0.5 + 0.5, this._sunNdc.y * 0.5 + 0.5);
      const off = Math.max(Math.abs(this._sunNdc.x), Math.abs(this._sunNdc.y));
      this.grade.uniforms.uRays.value = behind ? 0 : this.rays * Math.max(0, 1 - Math.max(0, off - 0.6) / 1.4);
    } else this.grade.uniforms.uRays.value = 0;
    this.perspectiveAerienne(sd);
    this.renderer.toneMappingExposure = this.exposure;
    // pendant un changement de météo (et au chargement), la référence de l'œil suit vite : il ne doit pas annuler
    // l'assombrissement VOULU de la pluie en ré-éclaircissant tout. Idem juste après un reAdapter (oeil.rapide).
    // Une carte d'environnement qui change d'identité (la photo HDR qui remplace la carte d'attente, un préréglage qui
    // l'allume) rééclaire toute la scène d'un coup : l'œil repart de zéro plutôt que de le prendre pour un regard.
    if (this.scene.environment !== this._envVue) {
      if (this._envVue !== undefined) this.reAdapter();
      this._envVue = this.scene.environment;
    }
    this.oeil.tauRef = (this.transition || this.oeil.rapide > 0 || performance.now() - this._t0 < 4000) ? 1.5 : 25;

    // Le reflet suit le sol mouillé. Masqué = pas de rendu du tout (Reflector ne travaille que dans
    // onBeforeRender), donc par beau temps il ne coûte rien.
    if (this.reflet) {
      const wet = this.scene.userData.wet || 0;
      this.reflet.visible = this._reflRes > 0 && wet > 0.02;
      if (this.reflet.visible) this.reflet.material.uniforms.uOpac.value = Math.min(0.85, wet * 0.85);
    }

    const now = performance.now(), ms = now - this._last; this._last = now;
    const bonne = document.visibilityState === 'visible' && ms > 2 && ms < 200;
    this._imageBonne = bonne;                         // (le coût de cette image ne compte que si elle est vraie : _chronoFin)
    if (ms > 2 && ms < 200) this._msLisse = this._msLisse ? this._msLisse + (ms - this._msLisse) * 0.05 : ms;   // (precompilerRepli)
    if (bonne) {
      this._noterPeriode(ms);
      // Pendant la mesure du mode auto, la résolution reste à 100 % : sinon un préréglage trop lourd se
      // « tiendrait » en rendant l'image plus floue, et on le garderait à tort.
      const mesure = this.auto && !this._decided;
      if (!mesure) { this._majDynamique(ms); this._remonter(ms); }
      // choix automatique du préréglage : en SECONDES, pas en nombre d'images. Sur un téléphone à 8 im/s,
      // l'ancienne fenêtre de 240 images durait une demi-minute — le plus souvent le plantage arrivait avant.
      // On cherche le plus haut préréglage que la machine tient : on descend d'un cran et on remesure ; avec une grosse
      // marge (plus de 90 im/s) on tente le cran au-dessus, jusqu'à extrême — mais jamais de nouveau vers le haut
      // après être descendu.
      // LA MESURE SE FAIT EN JEU. Elle partait dès la construction de PostFX, c'est-à-dire dans le MENU, pendant le
      // chargement du terrain : quelques hoquets de chargement décidaient du préréglage de toute la partie. Elle attend
      // maintenant la première entrée en balade ou en match (_enJeu), puis 2,5 s de chauffe (compilation des shaders
      // de la scène vue de près, arrivée des modèles), et mesure 2 s.
      // ELLE RAISONNE EN VSYNC. L'ancien seuil fixe (19 ms) tombait entre deux marches : à 144 Hz, 20,8 ms (48 im/s)
      // suffisait à descendre, à 90 Hz 22,2 ms (45 im/s tenus). On ne descend plus que si la médiane dépasse 22,5 ms
      // (sous 45 im/s) ET vaut au moins deux périodes p (5e centile, ou la plus courte période vue : _noterPeriode) —
      // une image sur deux ratée, pas un simple cran de vsync. Un jeu qui tient 24 ms bien réguliers garde donc son
      // préréglage ici ; s'il n'en sort pas, la « souffrance » de la résolution dynamique le fera descendre plus tard.
      // La baisse est ANNONCÉE (bandeau « Trop lent : qualité → ... », js/game.js), et jamais par onDowngrade, qui
      // écrirait le préréglage dans les réglages et couperait l'auto pour toujours.
      // (07/10/2026) ET ELLE JUGE LE COÛT quand la carte graphique le donne (voir _majDynamique) : le préréglage descend si
      // l'image, ramenée par la pensée au PLANCHER de la résolution dynamique (`_coutA`, part des pixels supposée de 0,6),
      // coûte encore plus que le budget (45 im/s ; de moyenne en basse sur PC, 30 im/s), processeur compris. La 660M :
      // haute 32 ms (26 au plancher) → moyenne ; moyenne 16 à 19 ms → gardée, la résolution dynamique fera le reste.
      // Sans requêtes de temps, les intervalles, mais au-delà d'une marche de vsync au-dessus du budget (26 ms ; 34 ms de
      // moyenne en basse sur PC) : 24,2 ms à 165 Hz ne suffit plus.
      if (mesure && this._enJeu()) {
        this._t += ms / 1000;
        if (this._t > 2.5) this._ech.push(ms);
        if (this._t > 4.5 && this._ech.length > 30) {
          const s = this._ech.slice().sort((a, b) => a - b), med = s[s.length >> 1];
          const T = Math.min(this._tEcran || Infinity, s[Math.floor(s.length * 0.05)]);
          const ordre = PostFX.ORDRE, i = ordre.indexOf(this.quality);
          const C = this._cout(this._ech.length), seuil = this._seuilBaisse();
          const cout = C ? Math.max(C.gpu, C.cpu) : med;
          const lourd = C ? Math.max(this._coutA(C.gpu, 1, this._dynMin()), C.cpu) > seuil
            : med > (seuil > BUDGET_IMAGE + 1 ? 34 : 26) && med >= 1.9 * T;
          let j = lourd ? i - 1 : (cout < 11 && !this._descendu) ? i + 1 : i;  // un cran à la fois : l'écart de coût
                                                                               // entre deux crans varie trop (ultra = 2,3 x high sur une puce intégrée)
          j = Math.max(0, Math.min(j, ordre.indexOf(this.plafond())));
          while (j > i && this._dejaPlante(ordre[j])) j--;
          if (j < i) this._descendu = true;
          console.info('[fx] qualité auto :', ordre[j], '(', med.toFixed(1), 'ms par image en', this.quality,
            C ? '· carte graphique ' + C.gpu.toFixed(1) + ' ms, processeur ' + C.cpu.toFixed(1) + ' ms' : '', '· écran', (1000 / T).toFixed(0), 'Hz )');
          if (j !== i) {
            this.setQuality(ordre[j], true); this._ech = []; this._t = 0;   // on remesure au nouveau cran
            if (j < i) document.dispatchEvent(new CustomEvent('hoops-qualite-baissee', { detail: { quality: ordre[j] } }));
          } else this._decided = true;
          this.auto = true;
        }
      }
    }
    // carte d'ombre une image sur deux en mode basse (cf. setQuality)
    if (this._cadOmbre > 1) { this._nOmbre = (this._nOmbre + 1) % this._cadOmbre; if (this._nOmbre === 0) this.renderer.shadowMap.needsUpdate = true; }
    // étalonnage dynamique
    this.flash = Math.max(0, this.flash - dt * 3.5);
    this.grade.uniforms.uFlash.value = this.flash * 0.35;
    // étalonnage : la météo (js/weather.js) le repose dans this.meteo. AgX de three r170 n'a pas de look punchy : plus
    // plat et plus terne qu'ACES, sur lequel les terrains ont été mesurés — on lui rend un peu de courbe et de couleur.
    const u = this.grade.uniforms, m = this.meteo, PQ = PostFX.PRESETS[this.quality] || PostFX.PRESETS.high;
    u.uSat.value = this.sat + (this.agx ? 0.06 : 0); u.uVignette.value = this.vig;
    if (m) {
      u.uLift.value.setScalar(m.lift); u.uGamma.value.setScalar(m.gamma); u.uGain.value.setScalar(m.gain);
      u.uCourbe.value = m.courbe + (this.agx ? 0.12 : 0);
      u.uSplit.value.set(m.splitO, m.splitL);
      tonNormalise(u.uTonO.value, m.tonO); tonNormalise(u.uTonL.value, m.tonL);
    }
    // clarté du préréglage × celle du terrain (scene.userData.clarte, 1 par défaut) : un terrain dont le sol est déjà
    // très moucheté peut la baisser sans toucher aux autres
    u.uGrain.value = PQ.grain || 0; u.uClarte.value = (PQ.clarte || 0) * (this.scene.userData.clarte ?? 1);
    // L'IMAGE VIVE (05/10/2026, réglage graphics.look ; plus par défaut depuis le 06/10 : Haythem préfère « Photo »). L'étalonnage d'origine est calé sur les photos du
    // terrain, prises sous un ciel gris : juste, mais terne à l'écran — c'est ce que les joueurs ont reproché (« pas
    // l'impression que les graphismes s'améliorent »). Même chaîne, poussée comme un jeu : plus de couleur, une courbe
    // plus franche (noirs plus denses, hautes lumières plus vives) et un peu de micro-contraste — les textures du sol,
    // des murs et des tenues ressortent. Coût : nul (les mêmes uniformes de la même passe). 'photo' rend l'ancien.
    // (07/10/2026) et le style PHOTO reçoit son réglage à lui (PostFX.PHOTO) : réaliste, d'un appareil photo par beau temps
    if (this.vif) { const V = PostFX.VIF; u.uSat.value += V.sat; u.uCourbe.value += V.courbe; u.uClarte.value += V.clarte; }
    else { const P = PostFX.PHOTO; u.uSat.value += P.sat; u.uCourbe.value += P.courbe; u.uClarte.value += P.clarte; }
    u.uCiel.value = this.vif ? 1 : 0;          // le ciel de Paris (GradeShader) : en Photo, le ciel se corrige à sa source (le dôme)
    u.uImage.value = (u.uImage.value + 1) % 64;
    if (this.fxaa) { const F = this.fxaa.uniforms; F.uImage.value = u.uImage.value; F.uGrain.value = this._legere() ? (PQ.grain || 0) : 0; }
    this.grade.uniforms.uHeat.value += (this.heat - this.grade.uniforms.uHeat.value) * Math.min(1, dt * 3);
    // Rayon des ombres. PCF doux (ombres douces) : K = texels de pénombre par unité de profondeur, tiré du rayon
    // apparent du soleil, élargi par la météo (`flou` : un ciel voilé étale le disque) ; PCF : rayon fixe.
    const soleil = this.scene.userData.env && this.scene.userData.env.sun;
    if (soleil && soleil.castShadow) {
      const flou = soleil.userData.flou || 1;
      if (this.renderer.shadowMap.type === THREE.PCFSoftShadowMap) {
        const c = soleil.shadow.camera, texParM = soleil.shadow.mapSize.x / Math.sqrt((c.right - c.left) * (c.top - c.bottom));
        soleil.shadow.radius = (c.far - c.near) * Math.tan(PostFX.RAYON_SOLEIL * flou) * texParM * (PQ.penombre ?? 1);
      } else soleil.shadow.radius = Math.min(2, (this._rayonPCF || 1) * Math.sqrt(flou));
    }
    // La carte d'ombre ne redessine que ce qui bouge — joueurs, ballon, feuillages au vent (js/ombre_cache.js) : mesuré en
    // 5 contre 5, 611 -> 343 appels de dessin par image au téléphone, 650 -> 452 en haute et ultra, carte identique.
    this._anisoRetard(dt);
    if ((this._tRepli -= dt) <= 0) { this._tRepli = 3; this.precompilerRepli(); }     // (les nouveaux venus, voir avecRepli)
    this.ombreCache.avant(!this.ombreCacheOff, dt);
    let chrono = null;                                // (le coût de l'image à la carte graphique : voir _remonter)
    try {
      chrono = this._chronoDebut();                   // (dans le try : quoi qu'il arrive, ombreCache.apres() rend les ombres du décor)
      if (this.enabled) this.composer.render(dt); else this.renderer.render(this.scene, this.camera);
    } finally { this.ombreCache.apres(); this._chronoFin(chrono); }
    // le temps du processeur pour cette image : de Game.frame (debutImage) à la fin du rendu (voir _cout)
    if (bonne && this.auto && this._tDebut !== undefined) {
      this._cpuFen.push(performance.now() - this._tDebut);
      if (this._cpuFen.length > 400) this._cpuFen.shift();
    }
    this._tDebut = undefined;
  }
}
