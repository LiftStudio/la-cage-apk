// =====================================================================
//  ZONE Z05 : LA TERRASSE DU BASSIN, LE JARDIN BAS (lot B2 du chantier « parc complet »)
// =====================================================================
// Une terrasse plane de 45 x 28 m à -0,8 (gabarit « terrasse_bassin »), au pied du mur des caves (zone Z06), entre la
// butte du pin (Z04) et le seuil de la rampe ouest (Z07). Au milieu, le BASSIN rectangulaire de 25,5 x 10 m, planté
// aujourd'hui (en eau à trois jets avant 2016 : l'option est au lot C5).
//
// CE QUE LES PHOTOS ET L'ORTHO MONTRENT (j1 et j4, vues du haut des caves ; j3, du quai ; 171718 et 171721, du bout du
// mur, fin septembre ; ortho IGN agrandie), du bassin vers le dehors :
//  - le BASSIN : une margelle de béton clair, 40 cm ; dedans, un tapis de gazon à 12 cm sous elle et, au milieu, un
//    long lit de terre planté de GRAMINÉES (pennisetum) en rangs serrés — au printemps des touffes rases (j4), fin
//    septembre de grosses fontaines paille et vert passé qui font un seul long massif (171721) ;
//  - une BANDE DE DALLES gris anthracite de 2 m tout autour (petits carreaux) ;
//  - le CADRE DE CIRCULATION : 4 m d'asphalte rouge brique en panneaux (deux rangs de 2 m, joints tous les 3 m
//    environ), bordés de lignes de pavés de granit clair ; aux deux bouts côté quai, il tourne vers la promenade ;
//  - au nord et au sud, une BANDE EXTÉRIEURE de panneaux d'asphalte gris, rouge seulement devant les escaliers (j1,
//    j4, ortho), au pied des TALUS de gazon ; chaque talus a son large ESCALIER de 13 marches (celui du nord est à Z04)
//    et ses MOSAÏCULTURES (j1, j4, 171721) ;
//  - côté quai, le MASSIF FLEURI de 4 x 16 m dans sa pelouse (j1, j3, j4 : rouge et jaune à l'automne) ; les IFS
//    TAILLÉS en cône sont dans les pelouses des deux bouts (ortho, j1, j4, j6 : en (5,8 ; 17,9) — zone Z04 — et en
//    (5,4 ; 52,3), dessiné ici).
//
// LES LIMITES : à l'ouest, le cadre s'arrête à son bord (x ≈ -34,9) ; au-delà, le perron, ses deux petites volées et
// ses ifs, le pied du mur des caves sont à la zone Z06 (lot B3). À l'est, le cadre s'arrête au bord de la promenade
// (zone Z03, lot B1), qui le recouvre. Au sud, le talus et son escalier (gabarit « escalier13_seuil », zone Z05)
// montent jusqu'au seuil de la rampe ouest (z ≈ 55), à la zone Z07.
//
// Les données (monde.json) disent où sont le cadre (allées cadre_bassin_*), le bassin, l'escalier ; la terrasse est
// plane (-0,8) : ce qui touche le bassin est posé à hauteur fixe (le sol du monde y creuse de 15 cm, le bassin est un
// « creux » : la margelle et la bande de dalles en couvrent le bord, le gazon du lit est drapé sur son fond). Tout le
// reste suit Monde.sol.
//
// LES OPTIONS DU PARC (lot C5, js/parc/options.js), que le morceau déclare (`options`) pour être refait quand elles
// changent :
//  - le BASSIN EN EAU (option 'bassin' = 'eau') : l'état d'avant 2016, le MIROIR D'EAU À TROIS JETS des photos j1 (vu du
//    belvédère) et j5 (vu du bout du mur côté pin, au printemps). Même margelle, mêmes dalles, même cadre rouge (j1) ;
//    à la place du gazon et des graminées, une eau vert-de-gris presque à ras de la margelle (j1 : on n'en voit pas le
//    fond), et trois GERBES alignées sur le grand axe, à huit mètres et demi l'une de l'autre : chacune une couronne de
//    jets fins qui montent à près de 5 m — le haut du mur des caves sur j5 — et retombent en un voile d'écume ;
//  - la SAISON (option 'saison') : au printemps, le massif côté quai est en tulipes (j3, j4), à l'automne en bégonias
//    et sauges.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { donneesDuMonde, parId, outilsB2 } from './z04_butte_pin.js';
import { bassinEnEau, saisonParc } from '../options.js';

// La terrasse (gabarit « terrasse_bassin »). Le fond du bassin est lu dans les données (bassins > profondeur : 15 cm,
// relecture du lot B2) ; le gazon s'y pose 3 cm plus haut, à 12 cm sous la margelle.
const Y_T = -0.8, PROF_REPLI = 0.15;
// Les valeurs de monde.json (empreinte 7df1b2b4ca28ee7b), si les données manquent.
const REPLI = {
  nord: [[-32.77, 28.76], [-32.78, 26.43], [-18.12, 26.32], [1.0, 26.26], [1.0, 23.76], [9.88, 23.58]],
  sud: [[-32.92, 41.16], [-32.86, 44.52], [-18.41, 44.73], [0.85, 44.68], [0.78, 47.77], [9.1, 47.76]],
  ouest: [[-32.92, 41.16], [-32.77, 28.76]],
  est: [[0.85, 44.68], [1.0, 26.26]],
  largeur: 4.0,
  bassin: [[-2.97, 40.62], [-28.54, 40.42], [-28.41, 30.28], [-2.83, 30.31]],
  escalier: { de: [-18.6, 55.2, 1.0], a: [-18.6, 48.8, -0.8], largeur: 4.2, marches: 13 },
  escalierNord: { de: [-18.6, 15.95, 1.3], a: [-18.6, 21.6, -0.8], largeur: 4.2 },
  promenade: { trace: [[10.0, 14.7], [9.9, 23.6], [9.1, 47.8], [9.0, 56.8]], largeur: 3.0 },
};
const IF_SUD = { x: 5.4, z: 52.3, h: 3.2, r: 1.15 };          // (le jumeau de IF_NORD, js/parc/zones/z04_butte_pin.js)
// le massif fleuri côté quai : l'emprise du « massif » des données (surface 11, non marchable)
const MASSIF = { x0: 3.05, x1: 6.95, z0: 26.1, z1: 42.4 };
// les pieds des talus (la bande extérieure s'y arrête)
const PIED_NORD = 21.8, PIED_SUD = 49.0;

// Une ligne jusqu'à x = xMax (le dernier segment qui le franchit, en avançant vers x+, est coupé là).
function jusquA(ligne, xMax) {
  const out = [ligne[0]];
  for (let i = 1; i < ligne.length; i++) {
    const [ax, az] = ligne[i - 1], [bx, bz] = ligne[i];
    if (bx > xMax && ax <= xMax && bx > ax) { out.push([xMax, az + ((bz - az) * (xMax - ax)) / (bx - ax)]); break; }
    out.push([bx, bz]);
  }
  return out;
}
// Une ligne rognée de d0 m au début et d1 m à la fin (le long de la ligne).
function rogner(ligne, d0, d1) {
  const L = []; let s = 0;
  for (let i = 1; i < ligne.length; i++) { s += Math.hypot(ligne[i][0] - ligne[i - 1][0], ligne[i][1] - ligne[i - 1][1]); L.push(s); }
  const a = d0, b = s - d1, out = [];
  const en = (t) => {
    let s0 = 0;
    for (let i = 1; i < ligne.length; i++) {
      const l = L[i - 1] - s0;
      if (t <= L[i - 1] || i === ligne.length - 1) { const u = l > 0 ? (t - s0) / l : 0; return [ligne[i - 1][0] + (ligne[i][0] - ligne[i - 1][0]) * u, ligne[i - 1][1] + (ligne[i][1] - ligne[i - 1][1]) * u]; }
      s0 = L[i - 1];
    }
    return ligne[ligne.length - 1];
  };
  out.push(en(a));
  for (let i = 1; i < ligne.length - 1; i++) if (L[i - 1] > a && L[i - 1] < b) out.push(ligne[i]);
  out.push(en(b));
  return out;
}
// x de la promenade (trace qui descend le long de z) à la hauteur z, moins sa demi-largeur : son bord côté parc.
function bordPromenade(prom, z) {
  const t = prom.trace;
  for (let i = 1; i < t.length; i++) {
    const [ax, az] = t[i - 1], [bx, bz] = t[i];
    if (z >= Math.min(az, bz) && z <= Math.max(az, bz) && bz !== az) return ax + ((bx - ax) * (z - az)) / (bz - az) - (prom.largeur || 3) / 2;
  }
  return 8.5;
}
// z d'une ligne presque droite le long de x, à l'abscisse x (interpolation entre ses deux points les plus proches en x).
function zSur(ligne, x) {
  let best = null;
  for (let i = 1; i < ligne.length; i++) {
    const [ax, az] = ligne[i - 1], [bx, bz] = ligne[i];
    if (Math.abs(bx - ax) < 1) continue;                     // (les tronçons qui vont selon z ne comptent pas)
    if (x >= Math.min(ax, bx) - 1e-6 && x <= Math.max(ax, bx) + 1e-6) return az + ((bz - az) * (x - ax)) / (bx - ax);
    const d = Math.min(Math.abs(x - ax), Math.abs(x - bx));
    if (!best || d < best.d) best = { d, z: Math.abs(x - ax) < Math.abs(x - bx) ? az : bz };
  }
  return best ? best.z : ligne[0][1];
}

// ============================================================================================ LE MIROIR D'EAU (lot C5)
// L'eau : 3 cm sous la terrasse, 9,5 cm sous la margelle (j1 : un plan d'eau presque à ras, vert-de-gris, sans fond
// visible) ; kit.eauBassin (rides animées, reflet du ciel, `dynamique` et `nofuse`). Le contour des données : la
// margelle en couvre le bord (27 cm à l'intérieur).
// (relecture du lot C5, mesuré : l'eau de j1, vue du belvédère, est d'un vert olive, (115, 121, 95) en moyenne — le fond
// tapissé d'algues sous une eau claire ; avec #647f70, le jeu donnait au même endroit (134, 154, 146), un bleu-vert de
// piscine. La couleur est tirée vers l'olive ; de biais, comme sur j5, le reflet du ciel domine toujours)
const Y_EAU = Y_T - 0.03, COULEUR_EAU = '#56634a';
// LE REFLET DU CIEL, DE BIAIS (relecture du lot C5, deuxième passe). La carte d'environnement du parc est préparée pour le
// plateau (js/court.js, preparerHDR) : sous 32°, un feuillage sombre. Une eau vue de biais n'y reflète donc que ce
// feuillage — mesuré, la couleur de l'eau ôtée, son reflet vu comme sur j5 valait (84, 85, 80) : à PV07 et sur la vue
// de j5, le bassin se lisait comme un gazon sombre, là où la photo montre une eau pâle, ridée par la retombée des jets,
// qui renvoie le ciel. On ajoute donc, de biais seulement (Fresnel, puissance 5), la couleur de l'horizon du moment —
// celle du brouillard, que la météo règle — à 60 % au plus : rasante, l'eau devient pâle ; vue du belvédère (j1),
// presque rien ne change. Le matériau de l'eau est celui du kit pour CETTE couleur (COULEUR_EAU : la clé du kit, que
// seul ce bassin emploie) ; on le retouche une fois.
const REFLET_CIEL = 0.6;
function refletDeBiais(eau) {
  eau.traverse((o) => {
    const m = o.isMesh && o.material;
    if (!m || m.userData.refletZ05) return;
    m.userData.refletZ05 = true;
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG
          float bZ05 = pow( 1.0 - saturate( dot( normalize( normal ), normalize( vViewPosition ) ) ), 5.0 );
          gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, ${REFLET_CIEL.toFixed(2)} * bZ05 );
        #endif
        #include <fog_fragment>`);
    };
    m.customProgramCacheKey = () => 'z05-eau-reflet';
    m.needsUpdate = true;
  });
  return eau;
}
// LES TROIS GERBES (j1, j5) : sur le grand axe du bassin, à 8,5 m l'une de l'autre autour du milieu ; hautes de 4,8 m
// (sur j5, elles montent jusqu'au haut du mur des caves). Une gerbe de bassin n'est pas un jet unique : c'est une
// COURONNE DE JETS FINS — l'eau claire se voit peu à la buse, blanchit en montant, et se rompt en gouttes au sommet —,
// sur un bouillon d'écume.
// (relecture du lot C5, deuxième passe : des PANNEAUX tournés vers la caméra, une toile dessinée. Les deux versions
// d'avant étaient des voiles de révolution — colonne, aiguilles, panache, embruns — : de près et de côté, des tubes de
// verre à bord net, un rebord elliptique en haut, des aiguilles en tiges de verre ; douze appels de dessin. Une gerbe
// est de révolution autour de la verticale : vue de n'importe quel côté, elle a la même silhouette. Chacune est donc un
// panneau vertical qui pivote autour de son axe pour faire face à la caméra (le programme l'écarte, voir
// materiauxJets) et porte une TOILE dessinée une fois (toileJets) : vingt-sept filets sur quatre couronnes de buses,
// vus de côté, leurs gouttes, la brume du sommet, le bouillon du pied — l'aspect des photos, et non plus celui d'un
// verre. Les trois panneaux sont un seul maillage, et les trois écumes un autre : deux appels de dessin au lieu de douze.)
const GERBES = { ecart: 8.5, h: 4.8, demi: 1.3, haut: 5.5 };     // `demi`, `haut` : le panneau (m), jets et gouttes compris
// Les couronnes de buses : [rayon (m), nombre de jets]. Vus de côté, les filets s'ouvrent en montant (×1,35 au sommet) :
// la gerbe fait 1,1 m au pied et 1,5 m en haut, moins d'un tiers de sa hauteur (j5 ; sur j1, plus serrée encore)
const COURONNES = [[0, 1], [0.18, 6], [0.36, 9], [0.55, 11]];
let _matsJets = null;
// La toile d'une gerbe, vue de côté (blanc sur transparent : seul son canal alpha compte, voir materiauxJets) ; 256 x 512
// sur PC, 128 x 256 sur téléphone, et toujours la même (les tirages au hasard sont ceux du kit).
function toileJets(kit, mobile) {
  const W = mobile ? 128 : 256, H = mobile ? 256 : 512, s = W / 256;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const a = (i, j, k) => kit.alea(i, j, 590 + k);
  const pxM = W / (2 * GERBES.demi), pyM = H / GERBES.haut;          // pixels par mètre
  const X = (m) => W / 2 + m * pxM, Y = (m) => H - m * pyM;
  const blanc = (al) => `rgba(255,255,255,${Math.max(0, al).toFixed(3)})`;
  // 1. le cœur : un voile laiteux, plus large en haut, qui s'efface au sommet (c'est lui qui fait le corps blanc de la
  // gerbe, vue de loin : j1)
  for (let y = 0; y < H; y++) {
    const t = (H - y) / pyM / GERBES.h;
    if (t > 1.12) continue;
    const larg = (0.5 + 0.4 * t) * pxM, al = 0.36 * Math.min(1, t * 3 + 0.3) * (t > 0.9 ? Math.max(0, 1 - (t - 0.9) / 0.22) : 1);
    const g = c.createLinearGradient(W / 2 - larg, 0, W / 2 + larg, 0);
    g.addColorStop(0, blanc(0)); g.addColorStop(0.5, blanc(al)); g.addColorStop(1, blanc(0));
    c.fillStyle = g; c.fillRect(W / 2 - larg, y, 2 * larg, 1);
  }
  // 2. les filets, rangée de pixels par rangée (pas de recouvrement : la transparence est égale le long du filet). Le
  // jet du milieu monte le plus haut ; ceux de devant sont un peu plus francs que ceux de derrière.
  let n = 0;
  for (const [r, nb] of COURONNES) for (let i = 0; i < nb; i++, n++) {
    const ang = (i / nb) * Math.PI * 2 + 0.5 * a(n, 1, 0), xb = r * Math.cos(ang), devant = Math.sin(ang);
    const hj = GERBES.h * (r === 0 ? 1.02 : 0.84 + 0.16 * a(n, 2, 0) - 0.08 * r), xt = xb * 1.35 + (a(n, 3, 0) - 0.5) * 0.12;
    const fort = 0.75 + 0.125 * devant + 0.2 * a(n, 4, 0);
    const ep = (1.6 + 1.3 * a(n, 5, 0)) * s;                       // l'épaisseur du filet (pixels)
    const y0 = Y(0), y1 = Y(hj);
    for (let y = Math.floor(y1); y <= y0; y++) {
      const t = (y0 - y) / (y0 - y1);                              // 0 à la buse, 1 au sommet
      const x = X(xb + (xt - xb) * Math.pow(t, 1.6));
      let al = Math.min(1, (0.42 + 0.55 * Math.min(1, t / 0.55)) * fort);
      const e = ep * (1 + 1.6 * Math.max(0, t - 0.75) / 0.25);    // (il s'élargit en se rompant)
      if (t > 0.82) al *= Math.max(0, 1 - (t - 0.82) / 0.2) * (0.6 + 0.4 * a(n, y, 6));
      c.fillStyle = blanc(al * 0.3); c.fillRect(x - e * 2.2, y, e * 4.4, 1);       // le halo
      c.fillStyle = blanc(al); c.fillRect(x - e / 2, y, e, 1);                     // le filet
    }
    // 3. ses gouttes : un bouquet au sommet, dont une part retombe en dehors
    for (let k = 0; k < 12; k++) {
      const u = a(n, k, 7), v = a(n, k, 8), w = a(n, k, 9);
      const hm = hj * (0.86 + 0.2 * u) - (w > 0.6 ? (w - 0.6) * 2.4 : 0);
      const xm = xt + Math.sign(xt || (v - 0.5)) * (0.03 + 0.25 * u * u + (w > 0.6 ? (w - 0.6) * 0.5 : 0)) + (v - 0.5) * 0.12;
      const rr = (1.4 + 2.2 * v) * s * 1.8, al = (0.14 + 0.3 * (1 - u)) * fort;
      const g = c.createRadialGradient(X(xm), Y(hm), 0, X(xm), Y(hm), rr);
      g.addColorStop(0, blanc(al)); g.addColorStop(1, blanc(0));
      c.fillStyle = g; c.fillRect(X(xm) - rr, Y(hm) - rr, 2 * rr, 2 * rr);
    }
  }
  // 4. la brume du sommet et le bouillon du pied : [hauteur, demi-largeur, demi-hauteur (m), opacité]
  for (const [hm, rx, ry, al] of [[GERBES.h * 0.93, 0.85, 0.5, 0.22], [GERBES.h * 1.02, 0.6, 0.32, 0.16], [0.05, 0.75, 0.12, 0.5], [0.12, 0.55, 0.2, 0.3]]) {
    const g = c.createRadialGradient(X(0), Y(hm), 0, X(0), Y(hm), rx * pxM);
    g.addColorStop(0, blanc(al)); g.addColorStop(1, blanc(0));
    c.save(); c.translate(X(0), Y(hm)); c.scale(1, (ry * pyM) / (rx * pxM)); c.translate(-X(0), -Y(hm));
    c.fillStyle = g; c.fillRect(X(-rx), Y(hm) - rx * pxM, 2 * rx * pxM, 2 * rx * pxM);
    c.restore();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
function materiauxJets(kit, mobile) {
  if (!_matsJets) {
    // (beaucoup d'émissif : l'eau pulvérisée diffuse la lumière dans tous les sens, elle reste blanche du côté de l'ombre,
    // comme sur j5 où les gerbes se détachent en blanc sur le feuillage sombre ; peu de reflet du ciel, qui la bleuissait)
    const uT = { value: 0 };
    const jet = new THREE.MeshStandardMaterial({ color: 0xe2e8ea, emissive: 0x7a8286, roughness: 0.6, metalness: 0, map: toileJets(kit, mobile),
      transparent: true, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.35 });
    jet.name = 'Z05 · gerbes du miroir d\'eau';
    jet.forceSinglePass = true;            // (un seul dessin pour les deux faces : le panneau fait toujours face)
    // LE PANNEAU, dans le programme : chaque sommet est au pied de sa gerbe (position) ; `aCoin` dit où il va sur le
    // panneau (x : -1 ou 1, y : 0 ou 1) et la phase de sa gerbe. Le pied est porté dans le repère de la caméra, puis
    // écarté le long de la verticale du monde et de l'horizontale qui fait face à la caméra : le panneau pivote autour de
    // son axe, il ne se couche pas quand on le regarde d'en haut (j1). Les gerbes palpitent (hauteur et largeur, deux
    // rythmes, chacune décalée). La normale fait face à la caméra, un peu levée vers le ciel.
    // Dans la toile, seul l'alpha est lu (les bords d'un trait blanc sur transparent sont noirs une fois la toile envoyée :
    // filtrés, ils griseraient les filets) ; il scintille, colonne par colonne, de bandes qui montent le long des filets.
    jet.onBeforeCompile = (sh) => {
      sh.uniforms.uT = uT;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 aCoin;\nuniform float uT;\nvarying float vPhase;')
        .replace('#include <project_vertex>', `
          vec4 cV = modelViewMatrix * vec4( transformed, 1.0 );
          vec3 hautV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
          vec3 versCam = normalize( -cV.xyz );
          vec3 droiteV = cross( hautV, versCam );
          droiteV = length( droiteV ) > 1e-4 ? normalize( droiteV ) : vec3( 1.0, 0.0, 0.0 );
          float ph = aCoin.z;
          float p = 1.0 + 0.025 * sin( uT * 5.3 + ph ) + 0.015 * sin( uT * 11.7 + 2.0 * ph );
          float l = 1.0 + 0.04 * sin( uT * 4.1 + ph );
          vec4 mvPosition = cV + vec4( droiteV * aCoin.x * ${GERBES.demi.toFixed(3)} * l + hautV * aCoin.y * ${GERBES.haut.toFixed(3)} * p, 0.0 );
          gl_Position = projectionMatrix * mvPosition;
          vPhase = ph;`)
        .replace('#include <fog_vertex>', '#include <fog_vertex>\n  vNormal = normalize( versCam + 0.5 * hautV );');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uT;\nvarying float vPhase;')
        .replace('#include <map_fragment>', `
          float aJet = texture2D( map, vMapUv ).a;
          float colJ = fract( sin( floor( vMapUv.x * 72.0 ) * 12.9898 + vPhase ) * 43758.5453 );
          aJet *= 0.85 + 0.15 * sin( vMapUv.y * 80.0 - uT * ( 10.0 + 4.0 * colJ ) + colJ * 6.2832 );
          diffuseColor.a *= aJet;`);
    };
    jet.customProgramCacheKey = () => 'z05-gerbe-panneau';
    const ecume = new THREE.MeshBasicMaterial({ color: 0xeef3f3, vertexColors: true, transparent: true, depthWrite: false });
    ecume.name = 'Z05 · écume des gerbes';
    // (une carte, ici blanche d'un texel : un matériau transparent À CARTE est inscrit au registre des découpes par
    // l'ordonnanceur — js/monde_charge.js, _inscrire —, que la passe de normales de l'occlusion ambiante saute
    // (js/fx.js, _decoupes). Sans carte, l'écume y serait pleine, et l'occlusion poserait un halo sombre sur l'eau. La
    // toile des gerbes joue ce rôle pour elles)
    const blanc = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    blanc.needsUpdate = true;
    ecume.map = blanc;
    _matsJets = { jet, ecume, uT };
  }
  return _matsJets;
}
// L'écume : un disque dont la blancheur s'efface du centre au bord
function disqueEcume(r, n) {
  const g = new THREE.RingGeometry(0.001, r, n, 4).rotateX(-Math.PI / 2), P = g.attributes.position, col = new Float32Array(P.count * 4);
  for (let k = 0; k < P.count; k++) {
    const d = Math.hypot(P.getX(k), P.getZ(k)) / r;
    col[k * 4] = col[k * 4 + 1] = col[k * 4 + 2] = 1; col[k * 4 + 3] = 0.55 * Math.pow(Math.max(0, 1 - d), 1.4);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  return g;
}
function miroirDEau(ctx, bassin) {
  const { kit, groupe, Monde } = ctx;
  groupe.add(refletDeBiais(kit.eauBassin({ poly: bassin, y: Y_EAU, couleur: COULEUR_EAU })));
  // l'axe du bassin : du milieu du petit côté ouest au milieu du petit côté est
  const [bSE, bSO, bNO, bNE] = bassin;
  const o = [(bSO[0] + bNO[0]) / 2, (bSO[1] + bNO[1]) / 2], e = [(bSE[0] + bNE[0]) / 2, (bSE[1] + bNE[1]) / 2];
  const cx = (o[0] + e[0]) / 2, cz = (o[1] + e[1]) / 2, L = Math.hypot(e[0] - o[0], e[1] - o[1]), ux = (e[0] - o[0]) / L, uz = (e[1] - o[1]) / L;
  const { jet, ecume, uT } = materiauxJets(kit, ctx.mobile);
  // les trois panneaux (quatre sommets chacun, tous au pied de leur gerbe : le programme les écarte) ; la gerbe du
  // milieu a sa toile retournée
  const pos = [], coin = [], uv = [], nor = [], idx = [], ecumes = [], boite = new THREE.Box3(), v = new THREE.Vector3();
  for (let k = -1; k <= 1; k++) {
    const x = cx + ux * GERBES.ecart * k + Monde.dx, z = cz + uz * GERBES.ecart * k, b = pos.length / 3, sens = k === 0 ? -1 : 1;
    for (const [sx, sy] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) {
      pos.push(x, Y_EAU - 0.02, z); coin.push(sx, sy, k * 1.7); uv.push((sx * sens + 1) / 2, sy); nor.push(0, 1, 0);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    boite.expandByPoint(v.set(x - GERBES.demi * 1.05, Y_EAU - 0.05, z - GERBES.demi * 1.05));
    boite.expandByPoint(v.set(x + GERBES.demi * 1.05, Y_EAU + GERBES.haut * 1.05, z + GERBES.demi * 1.05));
    ecumes.push(disqueEcume(1.5, ctx.mobile ? 16 : 28).translate(x, Y_EAU + 0.012, z));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aCoin', new THREE.Float32BufferAttribute(coin, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  // (les sommets sont tous au pied des gerbes : la boîte et la sphère, celles des panneaux dressés, sont données — sans
  // elles, three élaguerait les gerbes dès que leur pied sort du cadre, et l'ordonnanceur compterait une boîte plate)
  g.boundingBox = boite; g.boundingSphere = boite.getBoundingSphere(new THREE.Sphere());
  const panneaux = new THREE.Mesh(g, jet), mousse = new THREE.Mesh(mergeGeometries(ecumes, false), ecume);
  for (const x of ecumes) x.dispose();
  panneaux.name = 'gerbes du miroir d\'eau'; mousse.name = 'écume des gerbes';
  [mousse, panneaux].forEach((m, i) => {
    m.renderOrder = i; m.castShadow = false; m.receiveShadow = false;
    m.userData.dynamique = true; m.userData.nofuse = true;
    groupe.add(m);
  });
  // (rien ne porte d'ombre : le soleil du soir est à 5°, l'ombre d'une gerbe serait une bande pleine en travers de la
  // terrasse ; l'animation n'est que le temps du programme)
  ctx.animer((dt, t) => { uT.value = t; });
}

function* construire(ctx) {
  const { kit, Monde, groupe } = ctx, T = outilsB2(kit, Monde), D = donneesDuMonde(ctx), { alea, bruit } = kit;
  const lot = new kit.Lot('Z05');
  const al = (id) => parId(D && D.allees, id);
  const nord = (al('cadre_bassin_nord') || {}).trace || REPLI.nord, sud = (al('cadre_bassin_sud') || {}).trace || REPLI.sud;
  const ouest = (al('cadre_bassin_ouest') || {}).trace || REPLI.ouest, est = (al('cadre_bassin_est') || {}).trace || REPLI.est;
  const L = (al('cadre_bassin_nord') || {}).largeur || REPLI.largeur, h = L / 2;
  const gBassin = parId(D && D.bassins, 'bassin_terrasse') || {}, bassin = gBassin.poly || REPLI.bassin;
  // le lit du bassin : le fond des données, 3 cm plus haut (relecture du lot B2 : il était à -0,92 en dur sur un fond
  // de données à -1,3 ; une balle qui roulait dans le bassin s'y posait 14 cm SOUS le gazon, invisible, jusqu'à ce que
  // le jeu la rende, trois secondes plus tard. Le gabarit a désormais 15 cm de creux, ce que montrent j3 et j4)
  const Y_LIT = Y_T - (gBassin.profondeur ?? PROF_REPLI) + 0.03;
  const esc = parId(D && D.escaliers, 'escalier13_seuil') || REPLI.escalier, escN = parId(D && D.escaliers, 'escalier13_pin') || REPLI.escalierNord;
  const prom = parId(D && D.allees, 'promenade_basse') || REPLI.promenade;
  // les deux bras qui rejoignent la promenade s'arrêtent à son bord
  const nordC = jusquA(nord, bordPromenade(prom, nord[nord.length - 1][1]) + 0.05);
  const sudC = jusquA(sud, bordPromenade(prom, sud[sud.length - 1][1]) + 0.05);
  // (le côté quai est rogné de la largeur du cadre à ses deux bouts : les coins sont aux bras nord et sud)
  const estC = rogner(est, h, h);

  // ---- 1. LE CADRE : asphalte rouge brique, en panneaux ----
  const rouge = T.taches([0.9, 0.9, 0.93], 141, 0.13);
  // (un côté par tranche : drapés sur le sol, les quatre d'un bloc prenaient 6 à 12 ms, relecture du lot B2)
  for (const tr of [nordC, sudC, ouest, estC]) {
    T.bande(lot, 'asphalteRouge#sol', tr, L, { dy: 0.025, couleur: rouge });
    if (ctx.budget()) yield;
  }
  yield;

  // ---- 2. LES BANDES EXTÉRIEURES, au pied des talus : panneaux d'asphalte gris, rouges devant l'escalier ----
  // (du bord ouest du cadre au bras qui part vers la promenade ; le bord côté cadre suit la trace, 5 mm sous le rouge)
  const gris = T.taches([1.0, 0.99, 0.98], 143, 0.1);
  const xOuest = Math.min(ouest[0][0], ouest[1][0]) - h, xNE = nord[3] ? nord[3][0] - h : -1.0, xSE = sud[3] ? sud[3][0] - h : -1.15;
  const bandeExt = (xa, xb, zPied, zCadre, cle, coul) => {
    const za = zCadre(xa), zb = zCadre(xb);
    T.plaque(lot, cle, [[xa, zPied], [xb, zPied], [xb, zb], [xa, za]], Math.max(1, Math.round((xb - xa) / 1.2)), 3, { dy: 0.02, couleur: coul });
  };
  const zNordExt = (x) => zSur(nord, x) - h + 0.03, zSudExt = (x) => zSur(sud, x) + h - 0.03;
  for (const [pied, zc, xFin, e] of [[PIED_NORD, zNordExt, xNE, escN], [PIED_SUD, zSudExt, xSE, esc]]) {
    const xa = e.de[0] - (e.largeur || 4.2) / 2, xb = e.de[0] + (e.largeur || 4.2) / 2;
    // (le pied de l'escalier, côté terrasse, est à zPied près : la bande rouge part de là)
    const zp = Math.abs((e.de[2] < e.a[2] ? e.de : e.a)[1] - pied) < 1.2 ? (e.de[2] < e.a[2] ? e.de : e.a)[1] : pied;
    bandeExt(xOuest, xa, pied, zc, 'asphalte#sol', gris);
    bandeExt(xb, xFin, pied, zc, 'asphalte#sol', gris);
    bandeExt(xa, xb, zp, zc, 'asphalteRouge#sol', rouge);
  }
  yield;

  // ---- 3. LA BANDE DE DALLES ANTHRACITE autour du bassin (du bord intérieur du cadre à la margelle) ----
  // les coins intérieurs du cadre (repère : la trace du bras nord, celle du bras sud, celles des deux côtés) ; les
  // coins du bassin dans l'ordre des données : SE, SO, NO, NE
  const xO = (ouest[0][0] + ouest[1][0]) / 2 + h, xE = (est[0][0] + est[1][0]) / 2 - h;
  const zN = (x) => zSur(nord, x) + h, zS = (x) => zSur(sud, x) - h;
  const [bSE, bSO, bNO, bNE] = bassin;
  const cNO = [xO, zN(xO)], cNE = [xE, zN(xE)], cSE = [xE, zS(xE)], cSO = [xO, zS(xO)];
  const sombre = T.taches([0.6, 0.6, 0.62], 145, 0.14);
  const yDalles = Y_T + 0.02;
  T.plaque(lot, 'dallesSombres#sol', [cNO, cNE, bNE, bNO], 30, 2, { y: yDalles, couleur: sombre });
  T.plaque(lot, 'dallesSombres#sol', [cNE, cSE, bSE, bNE], 12, 2, { y: yDalles, couleur: sombre });
  T.plaque(lot, 'dallesSombres#sol', [cSE, cSO, bSO, bSE], 30, 2, { y: yDalles, couleur: sombre });
  T.plaque(lot, 'dallesSombres#sol', [cSO, cNO, bNO, bSO], 12, 2, { y: yDalles, couleur: sombre });
  yield;

  // ---- 4. LA MARGELLE : béton clair de 40 cm, 6 cm au-dessus des dalles, arêtes adoucies ----
  // (27 cm à l'intérieur du contour des données, 13 cm dehors : elle couvre la marche du sol du monde, qui tombe
  // quelque part à moins de 25 cm du contour, selon les nœuds de la grille)
  {
    let cx0 = 0, cz0 = 0; for (const [x, z] of bassin) { cx0 += x / 4; cz0 += z / 4; }
    const mil = [(bSE[0] + bSO[0]) / 2, (bSE[1] + bSO[1]) / 2];
    const chemin = [mil, bSO, bNO, bNE, bSE, mil].map(([x, z]) => [x, Y_T, z]);
    // la droite du sens de parcours (S du profil) : vers l'intérieur ou vers le dehors ?
    const dx0 = bSO[0] - mil[0], dz0 = bSO[1] - mil[1], l0 = Math.hypot(dx0, dz0) || 1;
    const sx = -dz0 / l0, sz = dx0 / l0, dedans = (sx * (cx0 - mil[0]) + sz * (cz0 - mil[1])) > 0 ? 1 : -1;
    const a = 0.27 * dedans, b = -0.13 * dedans, lo = Math.min(a, b), hi = Math.max(a, b), c = 0.015, top = 0.065, bas = -0.2;
    const prof = [[lo, bas], [hi, bas], [hi, top - c], [hi - c, top], [lo + c, top], [lo, top - c]];
    lot.prisme('beton', prof, chemin, { vertical: true, bouts: false,
      couleur: (x, y, z) => { const f = 1.02 + 0.08 * (bruit(x * 0.8, z * 0.8, 147) - 0.5) - 0.05 * (1 - T.lisse(Y_T - 0.1, Y_T + 0.06, y)); return [f * 1.03, f * 1.0, f * 0.93]; } });
  }
  yield;

  // ---- 5 BIS. LE MIROIR D'EAU (option du parc, lot C5) : l'eau et les trois jets, à la place du gazon et des
  // graminées (5 et 6, sautés)
  const eau = bassinEnEau();
  if (eau) {
    miroirDEau(ctx, bassin);
    yield;
  }
  // ---- 5. LE LIT DU BASSIN : un tapis de gazon, et au milieu le lit de terre des graminées ----
  // (le gazon est DRAPÉ sur le fond des données, 3 cm au-dessus : au milieu, Y_LIT ; au bord, là où le maillage du sol
  // remonte vers la terrasse entre deux nœuds de la grille, il remonte avec lui sous la margelle, sans que le sol le
  // perce)
  if (!eau) T.plaque(lot, 'gazon#sol', [bNO, bNE, bSE, bSO], 26, 10, { dy: 0.03, couleur: T.taches([0.95, 0.97, 0.9], 149, 0.16) });
  // le lit : un long rectangle aux bouts arrondis, bord un peu irrégulier, décalé vers le sud (j4 : une bande de gazon
  // de 3 m côté pin, où l'on s'allonge, de 1,5 m côté sud ; il s'arrête à 3,5 m de la margelle côté caves, 1,5 m côté
  // quai). La première version, centrée à 2 m de la margelle partout, faisait un îlot au milieu du gazon ; sur les
  // photos (j3, j4, 171721), les graminées occupent presque toute la longueur du bassin.
  // (Relecture du lot B2 : j4 est un printemps d'avant ; sur 171721, le 28/09, la bande de graminées court d'un bout
  // à l'autre du bassin, à un mètre et demi de la margelle côté caves comme côté quai, et la pelouse côté pin n'a
  // plus que 2,5 m : lit élargi et allongé.)
  const lx0 = Math.max(bNO[0], bSO[0]) + 1.6, lx1 = Math.min(bNE[0], bSE[0]) - 1.3, lz0 = Math.max(bNO[1], bNE[1]) + 2.6, lz1 = Math.min(bSO[1], bSE[1]) - 1.3;
  const lcx = (lx0 + lx1) / 2, lcz = (lz0 + lz1) / 2, lrx = (lx1 - lx0) / 2, lrz = (lz1 - lz0) / 2;
  const bordLit = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), k = 1 + 0.05 * (bruit(c * 3 + 7, s * 3 + 7, 151) - 0.5);
    bordLit.push([lcx + lrx * Math.sign(c) * Math.pow(Math.abs(c), 0.22) * k, lcz + lrz * Math.sign(s) * Math.pow(Math.abs(s), 0.5) * k]);
  }
  if (!eau) lot.polygone('terre#sol', bordLit.map(([x, z]) => [x, Y_LIT + 0.006, z]), [0, 1, 0], { couleur: (x, y, z) => { const f = 0.62 + 0.2 * bruit(x, z, 153); return [f, f * 0.95, f * 0.9]; } });
  yield;
  // ---- 6. LES GRAMINÉES, en quinconce serré sur tout le lit : fin septembre, un seul long massif (171721) ----
  // (des fontaines de plus d'un mètre, qui se touchent : sur 171721, on ne voit plus la terre entre elles ; relecture
  // du lot B2 : au pas de 0,72 m et à cinq éventails, elles restaient des touffes d'épis séparées — un champ de blé —
  // là où la photo montre des coussins pleins et arrondis : pas de 0,64 m, sept éventails par touffe)
  const touffes = [];
  const pasG = 0.64;
  if (!eau) for (let z = lcz - lrz + 0.35, r = 0; z <= lcz + lrz - 0.3; z += pasG * 0.87, r++) {
    for (let x = lcx - lrx + 0.3 + (r % 2) * pasG / 2; x <= lcx + lrx - 0.3; x += pasG) {
      const jx = x + (alea(x, z, 155) - 0.5) * 0.3, jz = z + (alea(x, z, 156) - 0.5) * 0.3;
      if (!kit.dansPolygone(jx, jz, bordLit)) continue;
      // (plus hautes au milieu du lit, plus basses sur ses bords)
      const cc = 1 - Math.pow(Math.min(1, Math.hypot((jx - lcx) / lrx, (jz - lcz) / lrz)), 3);
      touffes.push([jx, jz, (1.08 + 0.3 * cc) * (0.9 + 0.2 * alea(jx, jz, 157))]);
    }
  }
  // (par paquets de 60 touffes : les 250 d'un bloc faisaient une tranche de 4 à 9 ms, relecture du lot B2)
  for (let i = 0; i < touffes.length; i += 60) {
    T.graminees(lot, touffes.slice(i, i + 60), { y: Y_LIT, eventails: 7 });
    if (ctx.budget()) yield;
  }
  yield;

  // ---- 7. LES PAVÉS : lignes de granit clair qui bordent chaque bande, et joints des panneaux du cadre ----
  const granit = [0.8, 0.79, 0.76];
  // le bord intérieur du cadre (contre les dalles) et sa ligne médiane (les deux rangs de panneaux)
  T.paves(lot, [cNO, cNE, cSE, cSO, cNO], { y: Y_T + 0.035, teinte: granit });
  if (ctx.budget()) yield;
  T.paves(lot, [nord[1], nord[3], sud[3], sud[1], nord[1]], { y: Y_T + 0.035, large: 0.1, teinte: granit });
  if (ctx.budget()) yield;
  // les bords extérieurs du cadre et de ses deux bras (contre les bandes grises, les pelouses et les massifs)
  for (const [tr, cote] of [[nordC, -1], [nordC, 1], [sudC, 1], [sudC, -1], [ouest, -1], [est, 1]]) {
    // (le bord intérieur des côtés est et ouest est déjà dans la ligne du bord intérieur : on ne prend que les
    // bords qui ne touchent pas les dalles)
    if ((tr === nordC && cote === 1) || (tr === sudC && cote === -1)) {
      // bord intérieur des bras : seulement la partie des bras, hors du tour des dalles
      T.paves(lot, T.decaler(tr.slice(3), cote * h), { dy: 0.03, teinte: granit });
      continue;
    }
    T.paves(lot, T.decaler(tr, cote * h), { dy: 0.03, teinte: granit });
    if (ctx.budget()) yield;
  }
  // les joints des panneaux : en travers du cadre, tous les 3 m environ, loin des coins
  const joints = (tr) => {
    for (let i = 1; i < tr.length; i++) {
      const [ax, az] = tr[i - 1], [bx, bz] = tr[i], l = Math.hypot(bx - ax, bz - az);
      if (l < 5) continue;
      const ux = (bx - ax) / l, uz = (bz - az) / l, rx = -uz, rz = ux, n = Math.max(1, Math.round((l - 4.4) / 3.1));
      for (let k = 0; k <= n; k++) {
        const s = 2.2 + ((l - 4.4) * k) / n, px = ax + ux * s, pz = az + uz * s;
        T.paves(lot, [[px - rx * h, pz - rz * h], [px + rx * h, pz + rz * h]], { dy: 0.032, long: 0.22, large: 0.07, joint: 0.01, teinte: [0.62, 0.6, 0.58], variation: 0.12 });
      }
    }
  };
  if (ctx.budget()) yield;
  for (const tr of [nordC, sudC, ouest, estC]) joints(tr);
  if (ctx.budget()) yield;
  // les bandes grises : leur bord au pied du talus, et un joint tous les 6 m
  for (const [pied, zc] of [[PIED_NORD, zNordExt], [PIED_SUD, zSudExt]]) {
    const xFin = pied === PIED_NORD ? xNE : xSE;
    T.paves(lot, [[xOuest, pied], [xFin, pied]], { dy: 0.03, teinte: granit });
    const n = Math.round((xFin - xOuest) / 6);
    for (let k = 1; k < n; k++) { const x = xOuest + ((xFin - xOuest) * k) / n; T.paves(lot, [[x, pied], [x, zc(x)]], { dy: 0.032, large: 0.1, teinte: granit }); }
  }
  yield;

  // ---- 8. LE MASSIF FLEURI côté quai (fin septembre : bégonias, sauges, géraniums ; j3, j4 au printemps) ----
  // (en huit carreaux de 2 m, coins du massif arrondis : voir T.massifDecoupe ; au printemps, option du parc, lot C5 :
  // les tulipes du kit, comme les parterres de la perspective)
  const palMassif = saisonParc() === 'printemps' ? 'tulipes' : 'rouge';
  yield* T.massifDecoupe(groupe, MASSIF.x0, MASSIF.x1, MASSIF.z0, MASSIF.z1, () => palMassif, { nx: 1, nz: 8, arrondi: 0.9, densite: 1.1, bombe: 0.05, budget: ctx.budget });
  yield;
  // ---- 9. LE TALUS SUD : l'escalier de 13 marches et ses deux mosaïcultures (171721, j3) ----
  const xe = esc.de[0], le = esc.largeur || 4.2;
  // (limons de blocs de calcaire brut, comme la volée du nord : T.limonsRocaille, js/parc/zones/z04_butte_pin.js)
  groupe.add(kit.escalier({ de: esc.de, a: esc.a, marches: esc.marches || 13, largeur: le, limon: false, materiau: 'beton', usure: 0.6 }));
  if (ctx.budget()) yield;
  T.limonsRocaille(lot, esc, le);
  yield;
  // (relecture du lot B2, photo 171721 du 28/09 : deux coussins ovales de 3 à 3,6 m, à 3,5 m de chaque côté de la
  // volée ; la première version en faisait deux tapis rectangulaires de 5 et 6,4 m, à 2 m de ses limons)
  yield* T.mosaique(groupe, xe + le / 2 + 3.5 + 1.8, 51.5, 1.8, 1.25, { budget: ctx.budget });
  yield;
  yield* T.mosaique(groupe, xe - le / 2 - 3.4 - 1.5, 51.6, 1.5, 1.15, { budget: ctx.budget });
  yield;
  // ---- 10. L'IF TAILLÉ en cône du bout sud ----
  groupe.add(kit.ifConique({ x: IF_SUD.x, z: IF_SUD.z, h: IF_SUD.h, r: IF_SUD.r }));
  groupe.add(T.maillages(lot, 'terrasse du bassin'));
}

export default {
  id: 'Z05', nom: 'Terrasse du bassin',
  emprise: [[-37, 22], [10, 22], [10, 50], [-37, 50]],
  // (un seul morceau : la terrasse et ses deux talus, 45 x 34 m ; le talus sud, et son escalier, montent jusqu'au
  // seuil de la rampe ouest)
  morceaux: [{ id: 'Z05a', boite: [-35.5, 21.5, 10, 56], construire, options: ['bassin', 'saison'] }],
  // (pur, sans three : lu pour toutes les zones à l'installation ; le bassin et le massif fleuri sont déjà non
  // marchables dans les données)
  obstacles(o) {
    o.cercle(IF_SUD.x, IF_SUD.z, 0.95, { h: IF_SUD.h, type: 'arbuste', source: 'if taillé du bout sud (Z05)' });
  },
  bancs() {},
  lieux: [],
};
