// Météo : grand soleil, ciel couvert, ou pluie. Tout se fait par interpolation douce entre trois jeux de réglages
// (soleil, lumière du ciel, brouillard, teinte et opacité des nuages, rayons de soleil, brillance du bitume mouillé),
// plus une averse en particules autour de la caméra. En « auto » le temps change tout seul toutes les 1 à 2 minutes.
import * as THREE from 'three';
import { NUAGES, soleilNuagesEn } from './nuages.js';
import { ECLAIRAGE } from './eclairage_perso.js';
import { Monde } from './monde.js';

export const WEATHERS = {
  // L'ÉQUILIBRE CIEL / SOLEIL, MESURÉ (28/09, La Cage, bitume au centre, préréglage haute) : la lumière du ciel vient
  // désormais de la carte d'environnement PRISE SUR PLACE (js/court.js carteLocale) — l'ancienne était noire, le ciel
  // n'éclairait rien et l'ombre tombait à 16/255 pour 86 au soleil. Carte à 1,7 et hémisphère réduit à 0,12 : bitume
  // à 108 au soleil et 52 à l'ombre, un rapport de 4 à 1 en lumière réelle, celui d'une journée claire. En basse et
  // en moyenne, sans carte, `hemiSansEnv` rend à l'hémisphère la même lumière. Le parc garde ses réglages (sa carte
  // HDR, ses mesures sur photos). `nuCouv` 0,25 : environ un cinquième du sol à l'ombre d'un nuage à la fois.
  // Mesures (bitume au soleil / à l'ombre, haute puis moyenne) : soleil 110/55 et 110/57, couvert 75/55 et 71/51,
  // pluie 43/38 et 40/35 — le couvert est plat et clair, la pluie sombre, et les deux préréglages se ressemblent.
  // (05/10/2026 : la lumière « façon NBA 2K » de la v6.7 — soleil plus fort et doré, exposition relevée — a été retirée à
  // la demande de Haythem, qui la trouvait laide : retour à la lumière naturelle d'origine. La direction du soleil de La
  // Cage, côté platanes, et le temps couvert avec ombres restent : js/court.js buildArena, et `nuages` ci-dessous.)
  // (07/10/2026 : exposition 1,10 -> 1,24, « une photo par beau temps » : l'image de la v8 en style Photo restait sous-exposée
  // — bitume au soleil 108/255, blancs à 115 au 95e centile de la vue TV. Seule l'EXPOSITION bouge : ni la couleur du
  // soleil (aucune dorure : c'est la lumière « NBA 2K » que Haythem a refusée), ni le rapport soleil/ombre de 4 à 1, ni les
  // autres temps.)
  // (07/10/2026, juge, lot RENDU) LE SOLEIL ET L'OMBRE RÉÉQUILIBRÉS. Avec 1,24, le bitume au soleil de la vue du sol (V5)
  // avait pris 17 % (exposition, plus la brillance rasante de l'enrobé) et l'ombre rien : rapport ombre / soleil 0,50
  // contre 0,615 en v7 et v8 — un contraste dur —, et la vue TV en haute sortait 1,109 fois la v8 (plafond 1,10).
  // Soleil 2,9 -> 2,4, exposition 1,24 -> 1,16, et la carte d'environnement (la lumière du ciel, haute et au-dessus)
  // relevée de 12 % (`envCarte`, qui ne touche ni l'hémisphère ni la sonde de la moyenne et du téléphone). Mesuré en
  // haute, même chargement, même pose : vue TV -2,6 %, rapport ombre / soleil +8 % (0,634 -> 0,686 : bitume au soleil
  // -5 %, à l'ombre +3 %) ; la moyenne d'un PC (sonde du plateau, js/fx.js GAIN_LEGERE à 1) rend la haute à 1 % près.
  // Avec la brillance rasante corrigée côté matières (le reflet du ciel ne prend plus le soleil) : rapport 0,61, vue TV
  // -2 à -3 % sur l'ancien réglage. (Le rapport de la vue V5 varie de ±10 % d'un chargement à l'autre — le hasard des
  // feuillages qui tachettent la zone d'ombre : 0,57 à 0,69 pour le même code ; la v8 dans les mêmes conditions : 0,65.)
  // (07/10/2026, second juge, lot RENDU) LA CARTE RAMENÉE À 1 (1,12 -> 1). Le relèvement de 12 % avait été réglé quand la
  // brillance rasante de l'enrobé prenait encore le soleil ; corrigée (côté matières), elle ne renvoie plus que le ciel —
  // et ce ciel relevé faisait l'ombre laiteuse : rapport ombre / soleil de V5 à 0,72 chez le juge, vue TV +12 % sur la v8.
  // Mesuré en haute, style Photo, ombres de nuages coupées et Math.random à graine fixe (les taches de l'enrobé, tirées
  // au sort à chaque chargement, font varier le rapport de V5 de 0,60 à 0,75 pour le même code), deux graines, contre la
  // v8 aux mêmes graines : vue TV (V1) +1,4 et +0,9 % (avec 1,12 : +12 et +13 %), vue tv +1,1 et +1,7 %, rapport ombre /
  // soleil de V5 0,562 contre 0,558 et 0,648 contre 0,645, rapport par amas du bitume (V1, tv) +4 à +5 % (avec 1,12 : +7 à
  // +11 %). À 0,95, l'image passait 4 % SOUS la v8 (le rapport, lui, la rejoignait à 2 % près) : 1 garde le « beau
  // temps » de la v8 sans l'ombre laiteuse. (Régler la carte à chaud dans la console ne suffit pas pour mesurer : la carte
  // prise sur place, au chargement, voit le terrain éclairé par elle — la même valeur au chargement sort 3 % plus sombre.)
  // La moyenne et le téléphone (sonde, sans carte) ne bougent pas.
  // `expoTel` : l'exposition du TÉLÉPHONE (moyenne sans carte, éclairée par la sonde du plateau, gain 1,1 au téléphone).
  // Les 1,24 s'y empilaient sur la sonde et sur le gain de la chaîne légère (js/fx.js GAIN_LEGERE) : image laiteuse,
  // médiane 44 à 48 % au-dessus de la v7 (juge). Calée sur le résultat RÉUNI (rendu + matières, ?tel=1, 1110x540,
  // moyenne, médianes des vues du juge, deux chargements) : 1,05 -> épaule 44 à 46, pignon 87, sol 56 à 62 contre 48, 81
  // et 62 en v7 « Vif » (avant : 77, 121, 92). À 1,10 : 46 à 48, 90, 58 à 65 — le pignon, au nouvel enduit plus clair,
  // sortait 11 % au-dessus ; 1,05 les tient tous trois dans ±8 % de la v7.
  soleil:  { label: 'Grand soleil', sun: 2.4, sunCol: 0xfff0d8, hemi: 0.12, hemiSky: 0xbcd5f0, fog: 0xd8e3ee, fogNear: 110, fogFar: 380,
             cloud: 0.55, cloudCol: 0xffffff, cirrus: 0.30, rays: 1.0, rain: 0, wet: 0, expo: 1.16, expoTel: 1.05, envI: 1.7, envCarte: 1, hemiSansEnv: 2.0,
             nuOmbre: 0.5, nuCouv: 0.25, nuVent: 4.5, courbe: 0.10, splitO: 0.16, splitL: 0.10 },
  // (couvert : `wet` 0 — un ciel couvert n'est pas une chaussée mouillée. À 0,25, les creux de La Cage se remplissaient
  // de flaques sans une goutte tombée. Le sol ne reste humide que les minutes qui suivent une averse : voir update())
  // (05/10/2026, capture de Haythem à l'appui : par temps couvert, plus AUCUNE ombre — ni sous le joueur, ni sous le
  // panier ni les arbres —, une lumière qui vient de partout et des immeubles brûlés en blanc. Le couvert devient un ciel
  // voilé que le soleil perce : soleil 1,25 -> 2,4 et ombres plus franches — intensité 0,5 -> 0,72, flou 5 -> 3 —, moins de
  // lumière du ciel — hémisphère 0,5 -> 0,42, carte 3,0 -> 2,5 —, blancs retenus — gain 0,94 — et un peu de courbe et de
  // virage. Comparé en plein écran à la même vue que sa capture, préréglage ultra.)
  nuages:  { label: 'Ciel couvert', sun: 2.4, sunCol: 0xfff1de, hemi: 0.42, hemiSky: 0xc4cdd8, fog: 0xc3cad3, fogNear: 90,  fogFar: 380,
             cloud: 1.00, cloudCol: 0x9aa2ad, cirrus: 0.55, rays: 0.15, rain: 0, wet: 0, expo: 1.0, expoTel: 1.0, envCarte: 1, ombre: 0.72, flou: 3, envI: 2.5, hemiSansEnv: 1.9,
             nuOmbre: 0.55, nuCouv: 0.65, nuVent: 6, courbe: 0.12, lift: 0.012, gain: 0.94, splitO: 0.16, tonO: 0x6f8cb8, splitL: 0.08, tonL: 0xffe6c0 },
  pluie:   { label: 'Pluie',        sun: 0.55, sunCol: 0xd8dee6, hemi: 0.45, hemiSky: 0xa8b0ba, fog: 0xa9b0b9, fogNear: 38,  fogFar: 190,
             cloud: 1.00, cloudCol: 0x6f767f, cirrus: 0.75, rays: 0.0,  rain: 1, wet: 1, expo: 0.84, expoTel: 0.84, envCarte: 1, ombre: 0.25, flou: 9, envI: 2.4, hemiSansEnv: 3.0,
             nuOmbre: 0.3, nuCouv: 0.85, nuVent: 8, courbe: 0.03, lift: 0.02, gamma: 1.03, gain: 0.98,
             splitO: 0.14, tonO: 0x6d8aa0, splitL: 0.06, tonL: 0xdde8f2 },
};
const KEYS = Object.keys(WEATHERS);
const lerp = (a, b, t) => a + (b - a) * t;
// Les réglages qu'un terrain peut retoucher en plus (scene.userData.meteo). Sans retouche ils valent EXACTEMENT
// ce que le jeu a toujours fait : carte d'environnement à 0,55 (js/fx.js), remplissage à 62 % de la lumière du
// ciel, rien de plus quand la carte d'environnement est coupée, saturation 1,08 et vignette 0,32 (js/fx.js).
//  - `envI` : intensité de la carte d'environnement ; `fillK` : remplissage / lumière du ciel ;
//  - `hemiSansEnv` : lumière du ciel ajoutée quand il n'y a PAS de carte d'environnement (préréglages basse et
//    moyenne, les téléphones) : un terrain qui s'éclaire surtout par sa carte ne doit pas y être plus sombre ;
//  - `sat`, `vig` : l'étalonnage (js/fx.js GradeShader).
//  - `ombre` : opacité des ombres portées du soleil (LightShadow.intensity de three r170) : franche au soleil, pâle
//    sous un ciel couvert — la lumière y vient de partout, une ombre nette y serait fausse.
//  - `flou` : largeur de la pénombre des ombres douces (1 = le disque du soleil ; un ciel voilé l'étale).
//  - `nuOmbre`, `nuCouv`, `nuVent` : les ombres de nuages qui défilent (js/nuages.js) — force, couverture du ciel,
//    vitesse du vent en m/s.
//  - étalonnage (js/fx.js GradeShader) : `lift`, `gamma`, `gain`, `courbe` (S), virage partiel des ombres (`splitO`,
//    teinte `tonO`) et des lumières (`splitL`, `tonL`). Ces valeurs neutres ne changent rien à l'image d'avant.
//  - SANS CARTE D'ENVIRONNEMENT (lot L7, 30/09 ; le parc seul s'en sert) : `versFill`, la part de l'hémisphère qui
//    passe dans le remplissage directionnel, levé à `elevFill` degrés, à éclairement du sol égal — moins de lumière sur
//    les faces verticales et le feuillage, autant sur l'enrobé (voir apply) ; `froidSansEnv` bleuit d'autant la lumière
//    du ciel (hémisphère et remplissage) vers FROID, le bleu que la carte HDR donnait au sol. `transEnv`,
//    `transSansEnv` : la part du ciel que le feuillage du parc laisse passer (js/court_parc.js CIEL_TRANSMIS), avec et
//    sans la carte.
const NEUTRE = { envI: 0.55, fillK: 0.5, hemiSansEnv: 0, sat: 1.08, vig: 0.32, ombre: 1, flou: 1, nuOmbre: 0, nuCouv: 0.4, nuVent: 4.5,
  lift: 0, gamma: 1, gain: 1, courbe: 0, splitO: 0, splitL: 0, tonO: 0x6f8fb8, tonL: 0xffd9a8,
  versFill: 0, elevFill: 0, froidSansEnv: 0, transEnv: 1, transSansEnv: 1 };
const FROID = new THREE.Color(0xbcd5f0);
const TEINTES = ['tonO', 'tonL'];          // des couleurs : interpolées comme sunCol, pas comme des nombres
const CLES_NEUTRES = Object.keys(NEUTRE).filter((k) => !TEINTES.includes(k));
// les listes que apply() parcourt à chaque image, faites une fois (06/10/2026 : elles étaient refaites à chaque image)
const CLES_NOMBRES = ['sun', 'hemi', 'fogNear', 'fogFar', 'cloud', 'cirrus', 'rays', 'rain', 'wet', 'expo', 'expoTel', 'envCarte', ...CLES_NEUTRES];
const CLES_COULEURS = ['sunCol', 'hemiSky', 'fog', 'cloudCol', ...TEINTES];

// L'ALBÉDO DU SOL (linéaire) : ce que le terrain renvoie de la lumière qu'il reçoit. Déclaré par le terrain
// (scene.userData.albedoSol = [r, v, b], ou false pour garder le rebond réglé à la main), sinon lu dans sa texture.
// `undefined` tant que l'image de la texture n'est pas lisible (on réessaie alors toutes les secondes).
function albedoSol(scene) {
  const d = scene.userData.albedoSol;
  if (d === false) return null;
  if (Array.isArray(d)) return new THREE.Color().setRGB(d[0], d[1], d[2]);
  const m = scene.userData.env && scene.userData.env.court && scene.userData.env.court.material;
  const img = m && m.map && m.map.image;
  if (!img || !(img.width > 0)) return undefined;
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = 8;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 8, 8);
    const px = g.getImageData(0, 0, 8, 8).data; let r = 0, v = 0, b = 0;
    for (let i = 0; i < px.length; i += 4) { r += px[i]; v += px[i + 1]; b += px[i + 2]; }
    const n = (px.length / 4) * 255;
    const c = new THREE.Color().setRGB(r / n, v / n, b / n, THREE.SRGBColorSpace);   // converti en linéaire
    if (m.color) c.multiply(m.color);
    return c;
  } catch (e) { return undefined; }
}

export class Weather {
  constructor(scene, fx) {
    this.scene = scene; this.fx = fx;
    const e = scene.userData.env || {};
    this.sun = e.sun; this.hemi = e.hemi; this.fill = e.fill || null;
    this.clouds = e.clouds || []; this.wetMats = e.wetMats || [];
    // Les materiaux arrivent de plusieurs terrains et certains sont partages (M.road, M.sidewalk) : on
    // dedoublonne, sinon le meme materiau serait fonce deux fois et virerait au noir sous l'averse.
    this.wetMats = [...new Set(this.wetMats.filter(Boolean))];
    // Un terrain peut retoucher les ambiances (scene.userData.meteo) : le parc de Becon, photographie a 19 h 38
    // un soir de septembre, n'a jamais le « grand soleil » de midi — lumiere rasante et douce, ciel pale.
    this.presets = {};
    for (const k of KEYS) {
      const t = (scene.userData.meteo || {})[k] || {};
      this.presets[k] = { ...NEUTRE, ...WEATHERS[k], ...t };
      // (07/10/2026) un terrain qui pose SON exposition la garde aussi au téléphone, et sa lumière du ciel n'est pas
      // relevée (le parc : 1,0 et 1,1, calés sur ses photos) — `expoTel` et `envCarte` sont ceux de La Cage
      if (t.expo !== undefined && t.expoTel === undefined) this.presets[k].expoTel = t.expo;
      if (t.envI !== undefined && t.envCarte === undefined) this.presets[k].envCarte = 1;
    }
    this.cur = { ...this.presets.soleil };
    this.target = { ...this.presets.soleil };
    this.name = 'soleil'; this.mode = 'auto'; this.nextT = 75; this._nomCapture = 'soleil';
    this._c1 = new THREE.Color(); this._c2 = new THREE.Color();
    this.albedoSol = albedoSol(scene); this._albT = 0; this._rebond = new THREE.Color();
    for (const m of this.wetMats) m.userData.dryRough = m.roughness;
    this.buildRain(scene);
    this.apply(1);
  }

  // mode : 'auto' (le temps change tout seul) ou le nom d'un temps fixe
  setMode(mode) {
    this.mode = mode;
    if (mode !== 'auto' && this.presets[mode]) this.set(mode);
    else this.nextT = 8;
  }
  set(name) { if (!this.presets[name]) return; this.name = name; this.target = this.presets[name]; }

  // ---------- pluie : nappe de particules qui suit la caméra, remise en haut quand elle passe sous le sol ----------
  buildRain(scene) {
    // La densité suit la qualité graphique (scene.userData.meteoQualite, posé par js/fx.js) : 1 300 gouttes en
    // basse, 5 700 en extrême. On alloue pour le maximum et on n'en dessine qu'une partie, ce qui évite de
    // reconstruire la géométrie à chaque changement de préréglage.
    const N = 5800, R = 26, H = 18;
    const pos = new Float32Array(N * 3), spd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2 * R; pos[i * 3 + 1] = Math.random() * H; pos[i * 3 + 2] = (Math.random() - 0.5) * 2 * R;
      spd[i] = 14 + Math.random() * 9;
    }
    // LA PLUIE EN TRAITS (05/10/2026). C'étaient des points carrés portant une traînée : près de la caméra ils grossissaient
    // jusqu'à des bâtonnets blancs de plusieurs centimètres de large, ce qui faisait « jeu ancien ». Une goutte filmée
    // est un TRAIT fin, étiré dans le sens de sa chute par le temps de pose : ici un segment d'un pixel de large, de la
    // tête (claire) à la queue (éteinte), long de ce que la goutte parcourt en POSE secondes — 35 à 60 cm, penché par le
    // vent. Même nombre de gouttes, même mouvement ; deux sommets par goutte au lieu d'un.
    this.rainPos = pos;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    const col = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) { const k = 0.75 + Math.random() * 0.25; col.set([0.80 * k, 0.86 * k, 0.94 * k, 0, 0, 0], i * 6); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.rainMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
    this.rain = new THREE.LineSegments(geo, this.rainMat);
    this.rain.frustumCulled = false; this.rain.visible = false; this.rain.renderOrder = 6;
    scene.add(this.rain);
    this.rainSpd = spd; this.rainR = R; this.rainH = H; this.rainN = N;
    this.buildSplash(scene);
  }

  // Éclaboussures au sol : de petits anneaux qui s'ouvrent là où une goutte touche le bitume. C'est ce qui
  // fait la différence entre « il pleut » et « il pleut vraiment » ; réservé aux préréglages élevés.
  //
  // Refait le 19/09 : les anneaux se voyaient comme de gros beignets blancs à huit côtés posés sur le terrain.
  // Trois raisons, toutes corrigées ici.
  //   1. 10 segments : à 60 cm de diamètre on comptait les côtés. → 28 segments.
  //   2. Ils atteignaient 30 cm de rayon. Une goutte de pluie fait une couronne de 3 à 5 cm. → rayon divisé par 4.
  //   3. Surtout : ils DISPARAISSAIENT D'UN COUP, à leur taille maximale, parce que l'opacité est une propriété
  //      du matériau — donc commune aux 90 instances — et qu'on ne pouvait pas faire vieillir chacune de son
  //      côté. D'où l'effet de clignotement. On range donc l'âge de chaque anneau dans l'ÉCHELLE EN Y de sa
  //      matrice : l'anneau est plat, son échelle en Y ne sert à rien, et le nuancier la relit comme opacité.
  //      Chaque éclaboussure s'ouvre et s'efface maintenant pour son propre compte.
  buildSplash(scene) {
    const M = 160;
    const geo = new THREE.RingGeometry(0.035, 0.05, 28);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpac: { value: 0.5 }, uCol: { value: new THREE.Color(0xdcecfa) } },
      vertexShader: `
        varying float vA;
        void main() {
          vA = instanceMatrix[1][1];                 // échelle en Y = âge restant de CETTE éclaboussure
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4( position, 1.0 );
        }`,
      fragmentShader: `
        uniform float uOpac; uniform vec3 uCol; varying float vA;
        void main() { gl_FragColor = vec4( uCol, uOpac * vA ); }`,
      transparent: true, depthWrite: false,
    });
    this.splash = new THREE.InstancedMesh(geo, mat, M);
    this.splash.frustumCulled = false; this.splash.visible = false; this.splash.renderOrder = 5;
    this.splash.userData.dynamique = true;           // hors de la photo de la carte d'environnement
    this.splash.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.splash);
    this.splashes = Array.from({ length: M }, () => ({ t: 0, x: 0, z: 0 }));
    this._m4 = new THREE.Matrix4();
  }

  updateSplash(dt, camPos) {
    const q = this.scene.userData.meteoQualite || 1;
    const on = this.cur.rain > 0.15 && q >= 1.4;
    this.splash.visible = on;
    if (!on) return;
    const VIE = 0.42;
    for (const s of this.splashes) {
      s.t -= dt;
      if (s.t <= 0) {                                   // nouvelle éclaboussure autour de la caméra
        s.t = VIE * (0.75 + Math.random() * 0.25);      // vies décalées : sinon les 160 anneaux battent ensemble
        s.x = camPos.x + (Math.random() - 0.5) * 14;
        s.z = camPos.z + (Math.random() - 0.5) * 14;
      }
    }
    for (let i = 0; i < this.splashes.length; i++) {
      const s = this.splashes[i];
      const k = Math.min(1, Math.max(0, 1 - s.t / VIE));   // 0 = vient de tomber, 1 = fini
      const r = 0.35 + k * 2.2;                            // la couronne s'ouvre : 1,7 cm -> 12 cm de rayon
      const a = (1 - k) * (1 - k);                         // ... et s'efface en même temps, chacune pour soi
      this._m4.makeScale(r, a, r);                         // l'échelle en Y transporte l'opacité (cf. buildSplash)
      this._m4.setPosition(s.x, 0.015, s.z);
      this.splash.setMatrixAt(i, this._m4);
    }
    this.splash.material.uniforms.uOpac.value = 0.3 * this.cur.rain;   // (05/10 : 0,55 faisait des ronds blancs posés sur le sol)
    this.splash.instanceMatrix.needsUpdate = true;
  }

  updateRain(dt, camPos) {
    const on = this.cur.rain > 0.02;
    this.rain.visible = on;
    this.rainMat.opacity = this.cur.rain * 0.85;
    if (!on) { if (this.splash) this.splash.visible = false; return; }
    // nombre de gouttes réellement dessinées, selon la qualité graphique
    const q = this.scene.userData.meteoQualite || 1;
    const n = Math.max(600, Math.min(this.rainN, Math.round(2600 * q)));
    this.rain.geometry.setDrawRange(0, n * 2);
    const p = this.rain.geometry.attributes.position, L = p.array, a = this.rainPos, R = this.rainR, H = this.rainH;
    this.rain.position.set(camPos.x, Monde.sol(camPos.x, camPos.z), camPos.z);   // sur le relief, au sol sous la caméra
    const POSE = 0.026;                                               // temps de pose (s) : la longueur du trait
    for (let i = 0; i < n; i++) {
      const o = i * 3, v = this.rainSpd[i];
      a[o + 1] -= v * dt;
      a[o] += dt * 1.6; a[o + 2] += dt * 0.7;                       // vent
      if (a[o + 1] < -1) { a[o + 1] = H; a[o] = (Math.random() - 0.5) * 2 * R; a[o + 2] = (Math.random() - 0.5) * 2 * R; }
      else if (a[o] > R) a[o] -= 2 * R;
      else if (a[o + 2] > R) a[o + 2] -= 2 * R;
      // la tête, puis la queue, en arrière sur la trajectoire (chute + vent)
      const j = i * 6;
      L[j] = a[o]; L[j + 1] = a[o + 1]; L[j + 2] = a[o + 2];
      L[j + 3] = a[o] - 1.6 * POSE; L[j + 4] = a[o + 1] + v * POSE; L[j + 5] = a[o + 2] - 0.7 * POSE;
    }
    p.needsUpdate = true;
  }

  // ---------- application des réglages ----------
  apply(k) {
    const c = this.cur, t = this.target;
    for (const key of CLES_NOMBRES) c[key] = lerp(c[key], t[key], k);
    for (const key of CLES_COULEURS) {
      this._c1.set(c[key]); this._c2.set(t[key]); this._c1.lerp(this._c2, k); c[key] = this._c1.getHex();
    }
    if (this.sun) { this.sun.intensity = c.sun; this.sun.color.setHex(c.sunCol); this.sun.shadow.intensity = c.ombre; this.sun.userData.flou = c.flou; }
    // Sans carte d'environnement (préréglages basse et moyenne), le ciel perd la part de lumière qu'elle donnait :
    // `hemiSansEnv` la rend à l'hémisphère (0 partout, sauf sur un terrain qui s'éclaire surtout par elle).
    // (lot L12 : une SONDE de lumière tirée de la photo HDR — basse et téléphone au parc, js/sonde_ciel.js — remplace la
    // carte pour la lumière diffuse : on éclaire alors comme AVEC la carte, et elle reçoit l'intensité de la carte)
    const sonde = this.scene.userData.sondeCiel, parSonde = !!(sonde && sonde.active);
    if (sonde) sonde.intensite(c.envI);
    const sansEnv = !this.scene.environment && !parSonde, hemi = c.hemi + (sansEnv ? c.hemiSansEnv : 0);
    // LE CIEL DE LA CUVETTE, SANS CARTE (lot L7, 30/09). L'hémisphère éclaire une face verticale à moitié, et le dessous
    // d'une touffe presque autant que son dessus ; la carte HDR du parc, elle, n'a que des arbres sombres jusqu'à 32°
    // au-dessus de l'horizon : le ciel n'y arrive que d'en haut. En moyenne (Radeon intégrée, sans carte), le mur des
    // bancs sortait à 1,38 fois l'enrobé (1,18 en extrême), le rideau du quai à 0,69 (0,59) et le panneau trop blanc :
    // le haut de l'image laiteux. `versFill` fait passer cette part de l'hémisphère dans le remplissage, levé presque
    // au zénith (`elevFill`, du côté du couchant), à éclairement du SOL égal : un remplissage d'élévation e éclaire le
    // sol de sin e ; le remplissage d'origine (fillK, bas sur l'horizon) y est levé avec, et recompté de même. Sa
    // position d'origine est gardée pour quand la carte revient. (Deux effets voulus, qui font partie du calage : le
    // rebond du sol — le bas de l'hémisphère — baisse d'autant ; et l'ombre cuite au sol (aoMap), qui n'assombrit que
    // la lumière du ciel, ne touche pas le remplissage : sans carte, elle ne pèse plus que sur 55 % de la lumière de
    // l'enrobé, contre 85 % avant.)
    // (rien ne bouge sans remplissage à lever ni soleil pour l'orienter : l'hémisphère perdrait sa part sans qu'elle
    // soit rendue ailleurs, et l'enrobé s'assombrirait)
    const S = this.scene.userData.sunDir;
    const vf = sansEnv && this.fill && S && c.elevFill > 0 ? c.versFill : 0;
    let fillI = hemi * c.fillK;
    if (this.fill) {
      const f = this.fill, p0 = (f.userData.pos0 ||= f.position.clone());
      if (vf > 0) {
        const a = Math.atan2(S.z, S.x), r = p0.length(), e = c.elevFill * Math.PI / 180;
        f.position.set(Math.cos(a) * r * Math.cos(e), r * Math.sin(e), Math.sin(a) * r * Math.cos(e));
        const y0 = Math.max(0, (p0.y - f.target.position.y) / p0.distanceTo(f.target.position));   // sin e d'origine
        fillI = (vf * hemi + fillI * y0) / Math.max(0.2, Math.sin(e));
      } else if (!f.position.equals(p0)) f.position.copy(p0);
    }
    if (this.hemi) {
      this.hemi.intensity = hemi * (1 - vf); this.hemi.color.setHex(c.hemiSky);
      if (sansEnv && c.froidSansEnv > 0) this.hemi.color.lerp(FROID, c.froidSansEnv);
    }
    // Le remplissage EST la lumiere du ciel : il grossit quand le ciel se couvre — une voute grise
    // eclaire de partout — et prend sa teinte, du bleu clair du beau temps au gris-bleu de l'averse.
    if (this.fill) {
      this.fill.intensity = fillI; this.fill.color.setHex(c.hemiSky);
      if (sansEnv && c.froidSansEnv > 0) this.fill.color.lerp(FROID, c.froidSansEnv);
    }
    // LE REBOND DU SOL : le sol renvoie ce qu'il reçoit du soleil et du ciel, teinté de sa couleur (rouge sous le
    // bas des joueurs à Levallois, gris chaud sur le bitume), et le bitume mouillé en renvoie moins. Avant, la
    // couleur du bas de l'hémisphère était un gris figé, le même au soleil et sous l'averse.
    if (this.hemi && this.albedoSol) {
      const S = this.scene.userData.sunDir, env = !!this.scene.environment;
      this._c1.setHex(c.sunCol).multiplyScalar(c.sun * (c.ombre ?? 1) * Math.max(0, S ? S.y : 0.8) * 0.75);   // 0,75 : part du sol vraiment au soleil
      this._c2.setHex(c.hemiSky).multiplyScalar(hemi * 1.3 + (env ? Math.PI * 0.6 * c.envI * c.envCarte : 0));
      this._rebond.copy(this._c1).add(this._c2).multiply(this.albedoSol).multiplyScalar(1 - 0.28 * c.wet);
      const k = env && this.scene.userData.envLocale ? 0.35 : 1;          // la carte prise sur place contient déjà ce sol
      this.hemi.groundColor.copy(this._rebond).multiplyScalar(k / Math.max(0.05, hemi));
    }
    this.scene.environmentIntensity = c.envI * c.envCarte;     // (la sonde, elle, a reçu c.envI plus haut)
    // la découpe des personnages (js/eclairage_perso.js) : la voûte qui borde les silhouettes = la lumière du ciel
    // SANS carte d'environnement (identique en basse et en haute) ; le soleil ne découpe que s'il y a du soleil
    const ud = this.scene.userData;
    ECLAIRAGE.uRimCiel.value.setHex(c.hemiSky).multiplyScalar((c.hemi + c.hemiSansEnv) * (ud.rimCiel ?? 0.45));
    ECLAIRAGE.uRimSoleil.value = (ud.rimSoleil ?? 0.9) * Math.sqrt(Math.max(0, c.rays));
    // la brillance rasante de l'enrobé du parc (js/surfaces_parc.js RASANT) : éteinte sur sol mouillé, où le reflet de
    // l'eau prend le relais (ud.rasant n'existe que là où des surfaces du parc sont posées)
    if (ud.rasant) ud.rasant.value = 1 - c.wet;
    // la part du ciel que le feuillage du parc laisse passer (js/court_parc.js CIEL_TRANSMIS), avec ou sans la carte
    if (ud.cielTransmis) ud.cielTransmis.value = sansEnv ? c.transSansEnv : c.transEnv;
    if (this.scene.fog) { this.scene.fog.color.setHex(c.fog); this.scene.fog.near = c.fogNear; this.scene.fog.far = c.fogFar; }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i].mesh.material;
      m.opacity = i === 0 ? c.cloud : c.cirrus;
      m.color.setHex(c.cloudCol);
    }
    // Le ciel photographique : un seul reglage, la couverture, et la teinte qui assombrit le voile couvert
    // quand il pleut. Le fondu suit la meme rampe de six secondes que tout le reste.
    if (this.scene.userData.ciel) this.scene.userData.ciel.couvrir(c.cloud, c.cloudCol);
    for (const m of this.wetMats) {                                  // bitume mouillé : plus lisse et plus sombre
      m.roughness = lerp(m.userData.dryRough, 0.30, c.wet);
      m.metalness = c.wet * 0.18;
      if (!m.userData.dryCol) m.userData.dryCol = m.color.clone();
      m.color.copy(m.userData.dryCol).multiplyScalar(1 - c.wet * 0.28);
    }
    this.scene.userData.wet = c.wet;        // lu par js/fx.js : c'est ce qui allume le reflet au sol
    if (this.fx) {
      this.fx.rays = c.rays; this.fx.exposure = this.fx.dev && this.fx.dev.telephone ? c.expoTel : c.expo; this.fx.sat = c.sat; this.fx.vig = c.vig;
      this.fx.meteo = c;                            // l'étalonnage (js/fx.js render)
      this.fx.transition = Math.abs(c.sun - t.sun) > 0.03 || Math.abs(c.expo - t.expo) > 0.005;   // l'œil suit vite
    }
    NUAGES[2] = c.nuCouv; NUAGES[3] = c.nuOmbre * (this.scene.userData.nuagesQualite ?? 1);
  }

  update(dt, camPos) {
    if (!(dt > 0)) return;
    // la photo du sol arrive parfois après nous (détail photo chargé à part) : on relit sa couleur quand elle est là
    if (this.albedoSol === undefined && (this._albT += dt) > 1) { this._albT = 0; this.albedoSol = albedoSol(this.scene); }
    if (this.mode === 'auto') {
      this.nextT -= dt;
      if (this.nextT <= 0) {
        this.nextT = 75 + Math.random() * 60;
        const r = Math.random();
        // (05/10/2026 : soleil 70 %, couvert 20 %, pluie 10 % — contre 50/35/15 : la moitié du temps passée sous un ciel
        // gris, c'est ce qui faisait dire que le jeu était terne)
        this.set(r < 0.7 ? 'soleil' : r < 0.9 ? 'nuages' : 'pluie');
      }
    }
    // APRÈS LA PLUIE, LE SOL SÈCHE. Ni le ciel couvert ni le soleil ne mouillent le sol (`wet` 0) ; mais quand une
    // averse s'arrête, la chaussée reste humide quelques minutes : on repart d'une humidité de 0,45 qui retombe à
    // zéro en trois minutes sous un ciel couvert, une et demie au soleil. Le préréglage partagé n'est pas touché :
    // la cible devient une copie dont seule l'humidité bouge. Sec, on rephotographie le décor (carte locale).
    if (this._nomVu === undefined) this._nomVu = this.name;
    if (this.name !== this._nomVu) {
      const deLaPluie = this._nomVu === 'pluie' && this.name !== 'pluie';
      this._nomVu = this.name;
      this._sechage = deLaPluie ? { t: 0, T: this.name === 'soleil' ? 90 : 180, w0: 0.45 } : null;
      if (this._sechage) this.target = { ...this.presets[this.name] };
    }
    if (this._sechage) {
      const s = this._sechage;
      s.t += dt;
      const k = Math.max(0, 1 - s.t / s.T);
      this.target.wet = Math.max(this.presets[this.name].wet, s.w0 * k);
      if (k <= 0) {
        this._sechage = null; this.target = this.presets[this.name];
        if (this._nomCapture === this.name) this._nomCapture = null;   // déjà photographié mouillé : on refait
      }
    }
    this.apply(Math.min(1, dt / 6));                                 // transition douce sur ~6 s
    // le temps a fini de changer : on rephotographie le décor pour la carte d'environnement (le ciel, le sol mouillé)
    if (this._nomCapture !== this.name && Math.abs(this.cur.cloud - this.target.cloud) < 0.02 && Math.abs(this.cur.wet - this.target.wet) < 0.02) {
      this._nomCapture = this.name; this.scene.userData.envTerrain?.capturer?.();
    }
    // les nuages dérivent avec le même vent que la pluie (updateRain : +1,6 en x, +0,7 en z)
    const v = this.cur.nuVent;
    NUAGES[0] -= 0.917 * v * dt; NUAGES[1] -= 0.4 * v * dt;
    const sd = this.scene.userData.sunDir;
    if (camPos && sd && this.fx) {
      // l'œil passe sous un nuage : l'éblouissement et la brume chaude du contre-jour s'éteignent avec le soleil
      const s = soleilNuagesEn(camPos.x, camPos.y, camPos.z, sd);
      this.fx.rays *= s;                            // apply() vient de le reposer à c.rays : rien ne s'accumule
      this.fx.soleilVisible = s;                    // (le disque du soleil, js/fx.js)
      const ci = this.scene.userData.ciel;
      // (au parc, couvrir() repose l'opacité à chaque apply ; ailleurs on repart de 0,9)
      if (ci && ci.aureole) ci.aureole.material.opacity = (this.scene.userData.lumiere ? ci.aureole.material.opacity : 0.9) * (0.35 + 0.65 * s);
      if (ci && ci.noyau) ci.noyau.material.opacity *= s;   // couvrir() repose sa valeur à chaque apply
    }
    if (camPos) { this.updateRain(dt, camPos); if (this.splash) this.updateSplash(dt, camPos); }
  }
}
