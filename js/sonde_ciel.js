// =====================================================================
//  LA SONDE DE LUMIÈRE DU CIEL (lot L12, 01/10/2026) — pour la basse et le téléphone
//
//  En haute et au-dessus, le parc est éclairé par une vraie carte HDR (js/court.js carteHDR) : le ciel pâle d'en haut,
//  la lueur du couchant d'un côté, et les arbres de la cuvette, sombres, jusqu'à 30° au-dessus de l'horizon. En basse
//  et au téléphone, pas de carte (elle coûte deux lectures de plus par pixel à tous les matériaux) : une HÉMISPHÈRE
//  PLATE la remplace, un dégradé du haut vers le bas, la même lumière de tous les côtés à hauteur égale. Le lot L7 l'a
//  calée au mieux (js/weather.js : `hemiSansEnv`, `versFill`, `froidSansEnv`), mais une hémisphère ne sait pas que la
//  lumière vient d'en haut ET du couchant, et pas des arbres : murs et feuillages y restent éclairés « de partout ».
//
//  La sonde, c'est la MÊME photo résumée en neuf coefficients (harmoniques sphériques d'ordre 2) : la lumière diffuse
//  qu'elle donne est, à quelques pour cent près, celle de la carte, et elle ne coûte RIEN de plus par pixel qu'une
//  hémisphère (neuf multiplications-additions, aucune texture). Elle n'a pas de reflets (pas de spéculaire) : c'est la
//  seule chose que la basse garde en moins.
//    - la photo est chargée à part (1,4 Mo, en cache après la première fois), réduite à 256 px de large et PRÉPARÉE
//      comme la carte (balance des blancs, arbres du parc : js/court.js preparerHDR), puis intégrée sur la sphère, dans
//      le repère du jeu (la rotation de la carte, scene.environmentRotation, est appliquée) ;
//    - quand elle est prête, js/weather.js la traite comme la carte : l'hémisphère retombe à son niveau « avec carte »
//      (sans `hemiSansEnv` ni remplissage levé), et la sonde prend l'intensité de la carte (`envI` de la météo, x
//      `GAIN_SONDE`, qui rend la part de lumière que la carte donnait en reflets aux surfaces mates) ;
//    - elle n'éclaire que là où elle sert (js/fx.js setQuality : basse, ou téléphone, sans carte) : ailleurs, intensité 0.
//  (07/10/2026, lot B) LA SONDE EST DANS LA SCÈNE DÈS SA CRÉATION, ET N'EN SORT PLUS : l'allumer ou l'éteindre ne touche
//  qu'à son intensité. Avant, elle était ajoutée à l'allumage — et la présence d'une sonde fait partie de la clé de TOUS
//  les programmes de three (USE_LIGHT_PROBES) : passer en basse recompilait tout le décor du parc, et une sonde allumée par
//  une baisse automatique de qualité aurait fait de même en pleine partie. Neuf multiplications de plus par pixel, à zéro.
//  LES TERRAINS À CARTE PRISE SUR PLACE (La Cage, Levallois, Jemmapes : js/court.js carteLocale) ont aussi la leur : la
//  carte sait résumer en neuf coefficients un petit cube de 32 px photographié au milieu du plateau (env.sonde()), et le
//  refait à chaque nouvelle prise (arrivée du décor, fin d'un changement de temps : `env.versionSonde` change, la sonde
//  recopie `env.sh` à la prochaine pose de son intensité). Le gain y est propre au terrain (scene.userData.gainSonde).
// =====================================================================
import * as THREE from 'three';

// Ce que la carte donnait EN PLUS de sa lumière diffuse aux surfaces mates (le reflet du ciel, Fresnel compris, sur un
// enrobé de rugosité 0,9), rendu à la sonde. Calé le 01/10 sur l'enrobé du parc, caméra de match, même pose : haute
// 126,6 (B − R +4) ; basse + sonde à 1,06 : 121,6 (B − R +4, la teinte de la haute). À 1,16 (vérifié sur une autre
// pose) : haute 127,1, basse 128,6 ; B − R +4 et +3 ; rideau du quai / enrobé 0,50 et 0,54 ; massif du coin 0,49 et
// 0,50 (fourchettes des photos : rideau 0,50-0,58). Basse avec l'hémisphère plate : 129,1, B − R +2 (enrobé neutre).
const GAIN_SONDE = 1.16;

// Les neuf coefficients de la photo équirectangulaire `img` ({ data : demi-flottants RGBA, width, height } ; ligne 0 =
// zénith, comme preparerHDR la laisse), dans le repère du jeu : l'azimut du jeu = l'azimut de la photo − `rot`.
export function harmoniquesHDR(img, rot = 0) {
  const { data, width: W, height: H } = img, de = THREE.DataUtils.fromHalfFloat;
  const sh = new THREE.SphericalHarmonics3(), base = new Array(9).fill(0), d = new THREE.Vector3();
  const c = sh.coefficients;
  let poids = 0;
  for (let y = 0; y < H; y++) {
    const h = (0.5 - (y + 0.5) / H) * Math.PI, ch = Math.cos(h), sh0 = Math.sin(h);
    const dO = (2 * Math.PI / W) * (Math.PI / H) * ch;                    // angle solide du pixel
    for (let x = 0; x < W; x++) {
      const phi = ((x + 0.5) / W - 0.5) * 2 * Math.PI - rot;
      d.set(ch * Math.cos(phi), sh0, ch * Math.sin(phi));
      THREE.SphericalHarmonics3.getBasisAt(d, base);
      const o = (y * W + x) * 4, r = de(data[o]), g = de(data[o + 1]), b = de(data[o + 2]);
      for (let j = 0; j < 9; j++) { const w = base[j] * dO; c[j].x += r * w; c[j].y += g * w; c[j].z += b * w; }
      poids += dO;
    }
  }
  const k = 4 * Math.PI / poids;                                          // (la somme exacte vaut 4π)
  for (const v of c) v.multiplyScalar(k);
  return sh;
}

// L'éclairement que la sonde donne à une surface de normale `n` (même formule que le shader de three, lights_pars_begin
// shGetIrradianceAt) : pour les mesures et la console (__game.scene.userData.sondeCiel.eclairement(0, 1, 0)).
export function eclairementSH(sh, n) {
  const c = sh.coefficients, x = n.x, y = n.y, z = n.z, r = new THREE.Vector3();
  r.addScaledVector(c[0], 0.886227);
  r.addScaledVector(c[1], 2 * 0.511664 * y); r.addScaledVector(c[2], 2 * 0.511664 * z); r.addScaledVector(c[3], 2 * 0.511664 * x);
  r.addScaledVector(c[4], 2 * 0.429043 * x * y); r.addScaledVector(c[5], 2 * 0.429043 * y * z);
  r.addScaledVector(c[6], 0.743125 * z * z - 0.247708); r.addScaledVector(c[7], 2 * 0.429043 * x * z);
  r.addScaledVector(c[8], 0.429043 * (x * x - y * y));
  return r;
}

// La sonde d'un terrain : `env` est sa carte (carteHDR, qui sait charger la photo pour elle, ou carteLocale, qui
// photographie le plateau : env.sonde()). `activer(oui)` l'allume ou l'éteint (js/fx.js setQuality) ; `active` : voulue
// ET prête (js/weather.js éclaire alors comme avec la carte) ; `intensite(v)` : posée chaque fois que la météo s'applique.
export function sondeCiel(scene, env) {
  const probe = new THREE.LightProbe();
  probe.name = 'sonde du ciel'; probe.intensity = 0;
  scene.add(probe);                       // pour toujours (voir l'en-tête) : à zéro tant qu'elle n'est ni voulue ni prête
  const s = {
    probe, voulue: false, pret: false, promesse: null, version: -1,
    get active() { return s.voulue && s.pret; },
    activer(oui) {
      oui = !!oui && !!(env && env.sonde);
      if (oui === s.voulue) return;
      s.voulue = oui;
      if (!oui) probe.intensity = 0;
      if (oui && !s.promesse) {
        const t0 = performance.now();
        s.promesse = env.sonde().then((sh) => {
          probe.sh.copy(sh); s.version = env.versionSonde ?? 0; s.pret = true;
          const e = eclairementSH(sh, new THREE.Vector3(0, 1, 0));
          console.info('[ciel] sonde de lumière prête (' + (env.versionSonde !== undefined ? 'cube pris sur place' : 'harmoniques de la photo HDR') + ') :',
            Math.round(performance.now() - t0), 'ms · éclairement du sol', e.toArray().map((v) => v.toFixed(2)).join(' / '));
        }).catch((e) => console.warn('[ciel] sonde de lumière indisponible, l\'hémisphère reste :', e && e.message));
      }
    },
    // (une carte prise sur place a refait sa sonde : on recopie ses coefficients, sans rien recompiler)
    intensite(envI) {
      if (s.active && env && env.sh && env.versionSonde !== undefined && env.versionSonde !== s.version) { probe.sh.copy(env.sh); s.version = env.versionSonde; }
      probe.intensity = s.active ? envI * (scene.userData.gainSonde ?? GAIN_SONDE) : 0;
    },
    eclairement(x, y, z) { return eclairementSH(probe.sh, new THREE.Vector3(x, y, z).normalize()).multiplyScalar(probe.intensity); },
  };
  return s;
}
