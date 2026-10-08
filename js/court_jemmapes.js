import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { COURT } from './config.js';
import { TELEPHONE } from './appareil.js';

// =====================================================================
//  TERRAIN N°3 — LE 144 QUAI DE JEMMAPES, PARIS 10e
//  Le playground du canal Saint-Martin, derrière le lycée. Reconstitué d'après les photos envoyées.
//
//  Ce qui définit ce terrain :
//    - LA FRESQUE FLORALE. Un sol NOIR sur lequel courent de grandes formes ROUGE CORAIL : pétales, cœurs,
//      gouttes et losanges arrondis, posés à plat et souvent joints les uns aux autres. Rien d'autre : pas
//      d'aplats géométriques, pas de bandes. C'est le motif qui fait reconnaître ce terrain entre mille.
//    - LES PANIERS DE COMPÉTITION : panneau transparent à gros cadre NOIR, porté par une grande POTENCE
//      NOIRE en A qui part loin derrière, et un ARCEAU ORANGE.
//    - LE GRILLAGE NOIR, haut, qui enferme complètement le terrain.
//    - L'IMMEUBLE ROSE SAUMON du lycée, immense, juste derrière le grillage, avec ses fenêtres à petits
//      carreaux. C'est lui qu'on a dans le dos sur toutes les photos.
//    - LE MUR À GRAFFITIS du fond et la banderole « QUAI DE JEMMAPES » sous le panneau.
//
//  Les dimensions de jeu ne changent pas : on change de décor, pas de règles.
//
//  LES SURFACES PHOTOGRAPHIQUES (assets/tex/jemmapes, textures CC0 de Poly Haven et ambientCG : voir
//  tools/credits_jemmapes.md). Deux familles :
//    - les surfaces dont la COULEUR vient de la photo (pierre des quais, pavés, granit, béton banché) : carte de
//      couleur, de normales et « arm » (occlusion dans le rouge, rugosité dans le vert, comme glTF) ;
//    - les surfaces dont la couleur est DESSINÉE ou réglée d'après les photos du lieu (la fresque, l'enduit du
//      lycée et du pignon, l'asphalte des trottoirs) : la photo n'apporte que son détail, rangé dans une carte
//      « mix » (rouge : grain de la couleur centré sur 128, vert : rugosité, bleu : relief fin centré sur 128)
//      que prépare tools/textures_jemmapes.py. Les couleurs validées ne bougent donc pas : la photo ajoute le grain,
//      les pores et la brillance qui varie d'un gravillon à l'autre.
//  Téléphone : versions `_1k` (moitié de la version PC), et le décor lointain (quai d'en face) allégé.
// =====================================================================

const rnd = (a, b) => a + Math.random() * (b - a);

const C = {
  bitume: '#26262a',
  // Un rouge de PEINTURE ROUTIERE delavee par quatre ans de soleil et de semelles, pas un rouge de pot neuf.
  // A pleine saturation les formes ressortaient comme du plastique pose sur le bitume ; sur les photos elles
  // sont chaulees, poudreuses, et le gravillon du sol transparait dedans.
  rouge: '#cd6052',        // le rouge corail de la fresque, releve sur les photos
  rougeF: '#b04c41',       // sa variante plus sombre, pour les formes du dessous
  blanc: '#f1efe8',
  noir: '#141416',
};

// Même test que MOBILE_DECOR (js/court.js) : téléphone ou tablette.
const TEL = TELEPHONE;   // js/appareil.js : la même détection pour tout le jeu (et `?tel=1`)

// =====================================================================
//  OUTILS : PHOTOS DE SURFACE, BOÎTES EN MÈTRES, FUSION
// =====================================================================
const DOSSIER = 'assets/tex/jemmapes/';
const _photos = new Map();
// Une photo de surface, avec SA répétition. Toutes les copies d'un même fichier partagent la même image (une seule
// fois en mémoire vidéo). En attendant le fichier, chaque carte vaut une couleur NEUTRE d'un pixel (`neutre` : gris
// moyen pour un grain, bleu 128/128/255 pour des normales plates) : le décor n'apparaît jamais noir ni retourné le
// temps du chargement, et les shaders sont compilés une fois pour toutes avec leurs cartes.
// LE PIÈGE DU PIXEL D'ATTENTE. Si le décor est dessiné AVANT que la photo arrive (réseau lent, téléphone, jeu en
// ligne), three a déjà réservé pour la carte une texture immuable d'UN pixel (texStorage2D) ; lui envoyer ensuite
// l'image de 2 048 px échoue (« Offset overflows texture dimensions ») et la surface reste neutre pour toujours.
// À l'arrivée de la photo, on rend donc chaque copie à three (dispose : sa texture GPU est libérée) et on lui
// donne une source neuve : au dessin suivant, three réserve la bonne taille. Rien à faire si le pixel d'attente
// n'a jamais été envoyé : dispose ne coûte alors rien.
function photo(nom, srgb, rx, ry, neutre) {
  const url = DOSSIER + nom + (TEL ? '_1k' : '') + '.jpg';
  let e = _photos.get(url);
  if (!e) {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const g = c.getContext('2d'); g.fillStyle = neutre; g.fillRect(0, 0, 1, 1);
    e = { source: new THREE.Source(c), copies: [] };
    _photos.set(url, e);
    new THREE.ImageLoader().load(url, (img) => {
      e.source = new THREE.Source(img);
      for (const t of e.copies) { t.dispose(); t.source = e.source; t.needsUpdate = true; }
    }, undefined, () => console.warn('[jemmapes] photo de surface non chargée :', url, '— on garde la teinte neutre'));
  }
  const t = new THREE.Texture();
  t.source = e.source;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = TEL ? 4 : 8;
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  e.copies.push(t);
  return t;
}

// UV EN MÈTRES, pris dans le monde : sur chaque face, u suit l'horizontale vue de face et v la verticale. Deux
// boîtes voisines se raccordent donc sans couture (la pierre, l'enduit continuent d'un morceau à l'autre), et on
// peut les coudre en un seul maillage sans que l'échelle de la texture change de l'une à l'autre.
function uvMonde(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    if (ay >= ax && ay >= az) uv.setXY(i, x, ny > 0 ? -z : z);
    else if (ax >= az) uv.setXY(i, nx > 0 ? -z : z, y);
    else uv.setXY(i, nz > 0 ? x : -x, y);
  }
  uv.needsUpdate = true;
  return geo;
}
// boîte posée dans le monde (centre x, y, z), UV en mètres
function boite(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return uvMonde(g);
}
// retire la face +x d'une boîte (BoxGeometry range ses faces +x, -x, +y, -y, +z, -z, six indices chacune) : pour un
// volume dont la face avant est entièrement recouverte par d'autres, qu'il ne faut pas dessiner pour rien
function sansFaceAvant(geo) {
  geo.setIndex(Array.from(geo.index.array).slice(6));
  geo.clearGroups();
  return geo;
}
// sol horizontal de x0 à x1, de z0 à z1, à la hauteur y (UV en mètres)
function dalleSol(x0, x1, z0, z1, y) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  return uvMonde(g);
}
// coud une liste de géométries en UN maillage (un seul appel de dessin)
function maillage(parent, geos, mat, ombre = true) {
  const g = mergeGeometries(geos, false);
  for (const x of geos) x.dispose();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = ombre; m.receiveShadow = true;
  parent.add(m);
  return m;
}
// teinte (linéaire) qui ramène la moyenne d'une photo (sRGB 0-255) sur une couleur relevée (sRGB hex)
function teinteVers(cible, moyenne) {
  const c = new THREE.Color(cible), m = new THREE.Color().setRGB(moyenne[0] / 255, moyenne[1] / 255, moyenne[2] / 255, THREE.SRGBColorSpace);
  return new THREE.Color(c.r / m.r, c.g / m.g, c.b / m.b);
}
// moyennes des photos de couleur, mesurées par tools/textures_jemmapes.py
const MOY = { beton: [140.3, 133.0, 111.0], pierre: [118.0, 105.5, 87.2], paves: [120.7, 111.4, 91.8], granit: [98.9, 89.5, 81.0] };

// Matériau d'une surface dont la photo donne la couleur : UV en mètres, `tuile` = côté réel de la photo (m).
function matPhoto(nom, tuile, o = {}) {
  const r = 1 / tuile;
  const arm = photo(nom + '_arm', false, r, r, '#ffc000');
  const m = new THREE.MeshStandardMaterial({
    map: photo(nom + '_couleur', true, r, r, '#7a7064'),
    normalMap: photo(nom + '_normal', false, r, r, '#8080ff'),
    roughnessMap: arm, aoMap: arm, aoMapIntensity: o.ao ?? 0.8,
    color: o.teinte || 0xffffff, roughness: o.rugo ?? 1, metalness: 0,
    normalScale: new THREE.Vector2(o.relief ?? 1, o.relief ?? 1),
  });
  return m;
}

// ---------- bruit, commun à tous les shaders du terrain ----------
// LE BRUIT EST UNE TEXTURE, pas un calcul. Un bruit de valeur à quatre octaves calculé dans le shader, c'est une
// cinquantaine d'opérations de hachage par appel — et surtout un shader que le compilateur D3D d'une puce intégrée
// met des secondes à digérer au premier affichage. Une petite image de 256 px, tuilable, calculée une fois au
// chargement, donne la même chose en une lecture, filtrée par ses mipmaps (plus de scintillement au loin) :
//   r : bruit fractal (quatre octaves), g : bruit de valeur simple, b et a : les pentes d'un troisième bruit
//   (pour les rides de l'eau). Une unité de `p` = une cellule ; l'image couvre 32 x 32 cellules.
const U_BRUIT = { value: null };
function texBruit() {
  if (U_BRUIT.value) return U_BRUIT.value;
  const N = 256, data = new Uint8Array(N * N * 4);
  let graine = 12345;
  const grille = (n) => { const g = new Float32Array(n * n); for (let i = 0; i < g.length; i++) { graine = (graine * 16807) % 2147483647; g[i] = graine / 2147483647; } return g; };
  const lisse = (f) => f * f * (3 - 2 * f), dLisse = (f) => 6 * f * (1 - f);
  // bruit de valeur périodique (n cellules sur l'image) et ses dérivées, en unités de cellule
  const valeur = (g, n, x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const X0 = ((xi % n) + n) % n, Y0 = ((yi % n) + n) % n, X1 = (X0 + 1) % n, Y1 = (Y0 + 1) % n;
    const a = g[Y0 * n + X0], b = g[Y0 * n + X1], c = g[Y1 * n + X0], d = g[Y1 * n + X1];
    const sx = lisse(fx), sy = lisse(fy), k = a - b - c + d;
    return [a + (b - a) * sx + (c - a) * sy + k * sx * sy, dLisse(fx) * (b - a + k * sy), dLisse(fy) * (c - a + k * sx)];
  };
  const oct = [32, 64, 128, 256].map((n) => [n, grille(n)]);
  const simple = grille(32), pente = grille(32);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let f = 0, a = 0.5;
      for (const [n, g] of oct) { f += a * valeur(g, n, x / N * n, y / N * n)[0]; a *= 0.5; }
      const o = (y * N + x) * 4, [, dx, dy] = valeur(pente, 32, x / N * 32, y / N * 32);
      data[o] = Math.round(255 * Math.min(1, Math.max(0, f / 0.9375)));
      data[o + 1] = Math.round(255 * valeur(simple, 32, x / N * 32, y / N * 32)[0]);
      data[o + 2] = Math.round(255 * Math.min(1, Math.max(0, 0.5 + dx / 3.2)));
      data[o + 3] = Math.round(255 * Math.min(1, Math.max(0, 0.5 + dy / 3.2)));
    }
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  U_BRUIT.value = t;
  return t;
}
const GLSL_BRUIT = `
uniform sampler2D uJemBruit;
float jHash( vec2 p ) { p = fract( p * vec2( 0.1031, 0.1030 ) ); p += dot( p, p.yx + 33.33 ); return fract( ( p.x + p.y ) * p.x ); }
float jBruit( vec2 p ) { return texture2D( uJemBruit, p * 0.03125 ).g; }
float jFbm( vec2 p ) { return texture2D( uJemBruit, p * 0.03125 ).r; }
vec2 jGradBruit( vec2 p ) { return ( texture2D( uJemBruit, p * 0.03125 ).ba - 0.5 ) * 3.2; }
`;
// position MONDE du fragment (les maillages cousus n'ont plus de repère propre)
const VS_POS = { tete: '#include <common>\nvarying vec3 vJemPos;',
  corps: '#include <project_vertex>\nvJemPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;' };

// LE DÉTAIL D'UNE CARTE « MIX » posé sur une couleur réglée : la carte est dans `roughnessMap` (three en lit la
// rugosité dans le vert, tout seul), on lit en plus son rouge — le grain de la couleur, 1 en moyenne — et on ajoute
// des taches de grande échelle (plaques plus claires ou plus sombres, sur `echT` mètres) prises dans le monde, qui
// cassent la répétition de la tuile vue de loin. Options :
//   grain : force du grain ; taches : force des taches ; axes : 'xz' (sol), 'zy' (façade face à x), 'xy' (face à z) ;
//   auto : part de la couleur rendue en émissif — un mur plein nord garde sa teinte à l'ombre ;
//   salete : { tex, o: [origine u, longueur u, hauteur] } — la carte des coulures d'une façade, lue en (z, y).
function injecterMix(mat, o = {}) {
  const AXES = { xz: [[1, 0, 0], [0, 0, 1]], zy: [[0, 0, 1], [0, 1, 0]], xy: [[1, 0, 0], [0, 1, 0]] }[o.axes || 'xz'];
  const u = {
    uJemMix: { value: new THREE.Vector4(o.grain ?? 0.8, o.taches ?? 0.12, 1 / (o.echT ?? 3.0), o.auto ?? 0) },
    uJemAxeU: { value: new THREE.Vector3(...AXES[0]) }, uJemAxeV: { value: new THREE.Vector3(...AXES[1]) },
    uJemSal: { value: o.salete ? o.salete.tex : SANS_SALETE },
    uJemSalO: { value: new THREE.Vector3(...(o.salete ? o.salete.o : [0, 1, 1])) },
  };
  mat.__jem = u;
  // UN SEUL PROGRAMME pour toutes les surfaces « mix » (axes et coulures passent par les uniformes) : chaque
  // programme de plus, c'est une compilation de shader de plus au chargement — longue sur une puce intégrée.
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uJemBruit: U_BRUIT });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', VS_POS.tete).replace('#include <project_vertex>', VS_POS.corps);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vJemPos;\nuniform vec4 uJemMix;\nuniform vec3 uJemAxeU, uJemAxeV;\nuniform sampler2D uJemSal;\nuniform vec3 uJemSalO;\n' + GLSL_BRUIT)
      .replace('#include <map_fragment>', `#include <map_fragment>
        #ifdef USE_ROUGHNESSMAP
          diffuseColor.rgb *= mix( 1.0, texture2D( roughnessMap, vRoughnessMapUv ).r * 2.0, uJemMix.x );
        #endif
        diffuseColor.rgb *= 1.0 + ( jFbm( vec2( dot( vJemPos, uJemAxeU ), dot( vJemPos, uJemAxeV ) ) * uJemMix.z ) - 0.5 ) * 2.0 * uJemMix.y;
        {
          vec4 jS = texture2D( uJemSal, vec2( ( vJemPos.z - uJemSalO.x ) / uJemSalO.y, vJemPos.y / uJemSalO.z ) );
          diffuseColor.rgb *= mix( vec3( 1.0 ), jS.rgb, jS.a );
        }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uJemMix.w;');
  };
  mat.customProgramCacheKey = () => 'jem-mix-2';
  mat.needsUpdate = true;
  return mat;
}
// la carte de coulures des surfaces qui n'en ont pas : un pixel transparent
const SANS_SALETE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 0]), 1, 1);
SANS_SALETE.needsUpdate = true;
// un matériau « mix » complet : couleur réglée + photo `nom` (mix et normales) en UV mètres
function matMix(nom, tuile, teinte, o = {}) {
  const r = 1 / tuile;
  const m = new THREE.MeshStandardMaterial({
    color: teinte, roughness: o.rugo ?? 1, metalness: 0,
    roughnessMap: photo(nom + '_mix', false, r, r, '#80c080'),
    normalMap: photo(nom + '_normal', false, r, r, '#8080ff'),
    normalScale: new THREE.Vector2(o.relief ?? 1, o.relief ?? 1),
  });
  return injecterMix(m, o);
}

// =====================================================================
//  LE PLAN DU QUAI (côté x+) : trottoir, chaussée, promenade plantée, canal, quai de Valmy en face
// =====================================================================
// Du grillage au canal on traverse : le trottoir de la haie, la chaussée à sens unique du quai de Jemmapes (bordures
// de granit, caniveaux pavés), puis la promenade plantée de platanes qui longe l'eau, fermée par la margelle de
// granit. L'eau est 1,90 m plus bas, entre deux murs de pierre de taille. En face, le quai de Valmy et sa rangée
// d'immeubles haussmanniens.
function planQuai(ENC) {
  // Le pignon aveugle du fond est la tranche du premier immeuble de la rangée côté terrain : sa façade sur rue est à
  // `xi`. Le trottoir fait 1,80 m devant elle, puis vient la chaussée.
  const xi = ENC.X + 5.0;             // nu des façades côté terrain (et bord du pignon)
  const xr1 = xi + 1.8;               // bordure trottoir / chaussée
  const xr2 = xr1 + 6.0;              // chaussée : une file et le stationnement
  const xq = xr2 + 3.6;               // bord du quai (margelle)
  const large = 26;                   // largeur du canal
  const xf = xq + large;              // bord du quai d'en face
  // Les platanes des deux promenades, tous les 10 m, sur la longueur qu'on voit du terrain (au-delà, le brouillard
  // et la rangée d'immeubles suffisent). Chaque arbre coûte ses appels de dessin (tronc, feuillage, et leur ombre) :
  // cinq devant, six en face. Téléphone : deux devant, aucun en face — le canal s'y voit à peine.
  const pasArbres = 10;
  const arbresProches = TEL ? [-12, 8] : [-22, -12, -2, 8, 18];
  const arbresLoin = TEL ? [] : Array.from({ length: 6 }, (_, i) => -25 + i * pasArbres);
  return { xi, xr1, xr2, xq, xf, large, eau: -1.9, xv1: xf + 4.4, xv2: xf + 10.4, xb: xf + 13.2, arbresProches, arbresLoin, pasArbres };
}

export function buildJemmapes(scene, K) {
  const { modelTree, treeSoil, buildShrub, ENC } = K;
  const Q = planQuai(ENC);
  texBruit();

  // ---------------------------------------------------------------
  //  1. LE SOL
  // ---------------------------------------------------------------
  const court = solFresque(scene, K);
  solsAutour(scene, K, Q);

  // ---------------------------------------------------------------
  //  2. L'ENCEINTE : grillage NOIR, haut, et son muret de pied
  // ---------------------------------------------------------------
  grillageNoir(scene, K);

  // ---------------------------------------------------------------
  //  3. LES PANIERS : potence noire en A, panneau transparent, arceau orange
  // ---------------------------------------------------------------
  panierJemmapes(scene, K, -1);
  panierJemmapes(scene, K, 1);
  K.installerPaniers(scene, Math.abs(COURT.BOARD_Z) - Math.abs(COURT.HOOP_Z), 0xf07022);

  // ---------------------------------------------------------------
  //  4. LE LYCEE ROSE SAUMON, LE MUR A GRAFFITIS, LE CANAL
  // ---------------------------------------------------------------
  lyceeRose(scene, K);
  murGraffitis(scene, K);
  const eau = canalSaintMartin(scene, K, Q);

  // ---------------------------------------------------------------
  //  5. PLATANES ET MOBILIER
  // ---------------------------------------------------------------
  // De gros platanes plantes tout contre le grillage : sur les photos leurs troncs coupent la vue du lycee et
  // leur ombre tombe en plein sur la fresque.
  const XA = ENC.X + 2.0, ZA = ENC.Z * 0.78;
  // Ceux du cote x+ sont DANS la camera de diffusion (x = 9,2 m, hauteur 7,4 m, js/game.js) : leur houppier
  // descend a 4,6 m et l'un des troncs est a 30 cm de son axe. En match, vue TV, ils ne gardent que leur ombre
  // (js/game.js arbresTV) : le soleil vient de ce cote, leur ombre sur la fresque reste.
  const arbresTV = [];
  for (const [x, z, h] of [[-XA, -ZA, 15], [-XA, 0.1, 16], [-XA, ZA, 14.5],
                           [XA + 0.3, -ZA - 1, 15.5], [XA + 0.3, 0.5, 16.5], [XA + 0.3, ZA - 0.5, 15]]) {
    treeSoil(scene, x, z, 1.15);
    // (lot L12 : les trois du côté du lycée sont de VRAIS platanes, comme les deux du terrain : ce sont eux qui font le
    // haut de l'image de la caméra de diffusion, où les branches en bandes de tree2 traversaient tout le cadre)
    // (relecture L12 : ceux-là sans le décalage au hasard — la forme d'un platane détaillé est tirée de sa place, il
    // faut donc une place fixe pour retrouver le même arbre à chaque partie)
    const det = x < 0, jx = rnd(-0.3, 0.3), jz = rnd(-0.6, 0.6);
    const spot = modelTree(scene, x + (det ? 0 : jx), z + (det ? 0 : jz), h, rnd(6.5, 8.0), { fat: rnd(0.95, 1.1), detaille: det });
    if (x > 0 && spot) arbresTV.push(spot);
  }
  scene.userData.arbresTV = arbresTV;
  // LES DEUX PLATANES DU TERRAIN. Ce sont eux qu'on voit d'abord sur les photos : ils ne sont pas derriere le
  // grillage, ils poussent DEDANS, le long de la touche cote lycee. Le bitume est ouvert autour du pied et la
  // fresque rouge vient mourir contre la terre. Ils sont plus gros que ceux du pourtour — c'est le repere du
  // lieu, on joue avec.
  //
  // Le tronc est cale a 6,30 m de l'axe : son flanc arrive au ras de la ligne de touche (5,75 m) sans mordre
  // dessus, mais la fosse et le feuillage debordent franchement sur le terrain, comme sur la photo.
  // Les deux sont dans la MEME moitie, cote -Z : le second n'est pas en face du premier mais juste derriere
  // lui, dans l'angle, a deux metres de la ligne de fond. C'est ce que montre la photo prise du fond — les
  // deux troncs se chevauchent a gauche du panneau au lieu d'encadrer le terrain.
  const ARBRES = [{ x: -6.3, z: -3.4, h: 17.5, r: 0.72 }, { x: -6.35, z: -8.4, h: 16.5, r: 0.72 }];
  for (const a of ARBRES) {
    treeSoil(scene, a.x, a.z, 1.0);
    // (lot L12 : de VRAIS platanes à branches en tubes, js/platanes_detailles.js — tree2 garde le décor au loin)
    modelTree(scene, a.x, a.z, a.h, rnd(8.5, 9.5), { fat: 1.28, tilt: 0.045, tiltDir: 1, detaille: true });
  }

  // LES PLATANES DU CANAL, en alignement sur les deux promenades — ceux qui encadrent l'eau sur toutes les cartes
  // postales du canal Saint-Martin. Trois arbres du décor d'avant étaient plantés DANS le volume du lycée (x = -17
  // à -21, sous son toit) : invisibles, ils coûtaient quand même leurs appels de dessin. Ils sont retirés, et les
  // deux du quai, qui tombaient dans l'eau une fois le canal ouvert, rejoignent l'alignement de la promenade.
  // Les emplacements sont réguliers (pas de hasard) : le reflet de l'eau dessine la rangée d'en face au même endroit.
  // À leur pied, la GRILLE D'ARBRE en fonte des trottoirs parisiens (grillesArbres) : un seul maillage pour toutes.
  const pieds = [], spotsQuai = [];
  for (const z of Q.arbresProches) { pieds.push([Q.xq - 2.0, z]); spotsQuai.push(modelTree(scene, Q.xq - 2.0, z, rnd(13, 15.5), rnd(5.5, 6.5))); }
  for (const z of Q.arbresLoin) { pieds.push([Q.xf + 2.2, z]); spotsQuai.push(modelTree(scene, Q.xf + 2.2, z, rnd(13, 15), rnd(5.5, 6.5))); }
  grillesArbres(scene, K, pieds);
  const ombresQuai = ombresSelonVue(scene, spotsQuai.filter(Boolean));
  for (let z = -ENC.Z + 2; z <= ENC.Z - 2; z += 5.2) buildShrub(scene, ENC.X + 1.3, z, 4.6, 1.15, 1.0);

  bancsEtSacs(scene, K);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) matDroit(scene, K, sx * (ENC.X + 1.0), sz * (ENC.Z + 1.0));

  // L'eau bouge et les reflets suivent la lumière du moment : on se greffe sur l'animation du décor (js/court.js).
  const anim = scene.userData.animate;
  scene.userData.animate = (t) => {
    if (anim) anim(t);
    if (eau) eau.maj(t, scene.userData.env);
    ombresQuai.maj();
  };

  // ---------------------------------------------------------------
  //  6. REPERES DU TERRAIN
  // ---------------------------------------------------------------
  // Pas de marchand ici non plus : on ne sait pas encore qui tient la boutique sur ce terrain-la, et plutot
  // que de recycler Pierrick sous un autre nom on ne pose rien. La boutique reste joignable par le menu pause
  // (voir js/game.js).
  // Pas de `yard` ici : js/config.js l'a deja calcule depuis l'enceinte de ce terrain, et il est plus petit
  // que celui des deux autres.
  // Les troncs sont des OBSTACLES : on ne traverse pas un platane. Le rayon englobe le tronc et la carrure du
  // joueur, et il s'arrete juste en dehors de la zone de jeu (BOUNDS.xMin = -5,55) pour qu'un match ne soit
  // jamais perturbe par un arbre qui est, lui, hors des lignes.
  scene.userData.reperes = { sansMarchand: true, obstacles: ARBRES.map((a) => ({ x: a.x, z: a.z, r: a.r })) };
  // L'air du canal. js/weather.js remet au demarrage le brouillard de son « grand soleil » (0xd8e3ee, 110/380) : la
  // brume d'horizon, posee a la couleur du canal par js/court.js, ne rejoignait plus le lointain. Comme au parc de
  // Becon, le beau temps d'ici garde son brouillard ; ciel couvert et pluie ont deja le leur.
  scene.userData.meteo = { soleil: { fog: 0xc6ccd4, fogNear: 90, fogFar: 320 } };
  // LA LUMIÈRE DU CIEL SANS LE ROSE. La carte d'environnement est photographiée ici même (js/court.js carteLocale) :
  // son cube voit le lycée saumon, la fresque corail et la voûte, presque pas de ciel, et tout ce qu'elle éclairait
  // virait au rose (les troncs, les murs clairs). On ne garde que 45 % de sa couleur, le reste ramené au gris du ciel
  // (js/court.js desaturerCarte) : le reflet chaud du lycée reste lisible sur la face qui le regarde, le reste
  // redevient celui d'un plein air. Mesuré (même pose, mêmes arbres, extrême) : R/B des troncs 1,69 et 1,60 avec la
  // carte entière, 1,37 et 1,34 sans carte, 1,45 et 1,38 à 0,5 ; mur de béton 1,48 -> 1,27. Pas en baissant son
  // intensité : cela assombrit sans ôter la teinte (plus rose encore), et la météo la réécrit.
  scene.userData.envSatur = 0.45;
  return { court };
}

// =====================================================================
//  LA FRESQUE FLORALE
// =====================================================================
// LE SOL EST UNE PEINTURE SUR UN ENROBÉ, et c'est comme ça qu'on le rend. Trois couches, de bas en haut :
//   1. l'enrobé lui-même (photo asphalt_pit_lane : des gravillons de 2 à 10 mm pris dans le liant) ;
//   2. la sous-couche NOIRE qui fait le fond de la fresque ;
//   3. les formes ROUGE CORAIL et le marquage BLANC.
// Une peinture de sol ne s'use pas en s'éclaircissant : elle PART, et elle part d'abord sur les gravillons qui
// dépassent — là où la semelle frotte. De près on voit donc des milliers de petits cailloux gris percer le rouge et
// le noir, et le rouge rester dans les creux. C'est ce que fait le shader : le relief fin de la photo (canal bleu de
// la carte mix, les grains clairs comptant comme des bosses) décide où chaque couche a tenu, et l'usure grandit
// dans la raquette, sous les cercles et au rond central, là où l'on court. Les bords des formes suivent eux aussi
// le gravillon et un bruit fin : un pinceau sur de l'enrobé ne fait pas un bord vectoriel.
// Le DESSIN (quelles formes, où, quelle teinte) reste celui validé : il est tracé au canvas comme avant, mais en
// masque — rouge = forme corail, vert = sa variante sombre, bleu = marquage — et c'est le shader qui peint.
function solFresque(scene, K) {
  const { ENC } = K;
  const W = ENC.X * 2, L = ENC.Z * 2, T = 2.0;           // T : côté réel de la photo d'enrobé (m)
  const mat = new THREE.MeshStandardMaterial({
    map: masqueFresque(K.canvasTex, ENC), color: 0xffffff, roughness: 1, metalness: 0,
    roughnessMap: photo('enrobe_mix', false, W / T, L / T, '#80d480'),
    normalMap: photo('enrobe_normal', false, W / T, L / T, '#8080ff'),
    normalScale: new THREE.Vector2(0.9, 0.9),
  });
  peindreFresque(mat, W, L);
  const court = new THREE.Mesh(new THREE.PlaneGeometry(W, L), mat);
  court.rotation.x = -Math.PI / 2; court.receiveShadow = true; scene.add(court);
  // LA LUMIÈRE QUE LE SOL RENVOIE (« rebond du sol », js/weather.js). Sans consigne, js/weather.js prend la couleur
  // moyenne de `map`… qui est ici le MASQUE de la fresque (rouge, jaune et bleu purs) : joueurs, troncs et murs
  // recevaient par en dessous un rebond rouge vif. On lui donne la vraie couleur moyenne du sol peint.
  scene.userData.albedoSol = albedoFresque(mat.map.image);
  return court;
}

// La couleur moyenne (linéaire) du sol peint : la part de chaque couche, lue sur le masque (64 x 64 prises), fois la
// couleur que le shader lui donne en moyenne (le voile de poussière compris). Échec de lecture : pas de rebond teinté.
function albedoFresque(img) {
  try {
    const N = 64, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, N, N);
    const d = g.getImageData(0, 0, N, N).data;
    let r = 0, v = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; v += d[i + 1]; b += d[i + 2]; }
    const n = N * N * 255; r /= n; v /= n; b /= n;       // parts du corail (les deux), du corail sombre, du marquage
    const poussiere = new THREE.Color('#928e84');
    const couche = (h) => new THREE.Color(h).multiplyScalar(0.89).add(poussiere.clone().multiplyScalar(0.11));
    // Le corail ne compte que pour 60 % de SA COULEUR dans le rebond (sa clarté, elle, est gardée) : entier, il
    // teintait de rose le dessous des troncs, des murs et des joueurs, par-dessus la carte déjà rosée. Le rebond
    // reste chaud (le corail et le noir chaud y sont toujours), il n'est plus saumon.
    const corail = (h) => { const x = couche(h), l = 0.2126 * x.r + 0.7152 * x.g + 0.0722 * x.b; return x.lerp(new THREE.Color(l, l, l), 0.4); };
    // la sous-couche noire telle que le shader la rend en moyenne : gravillon mis à nu et voile compris
    const c = new THREE.Color(0.042, 0.041, 0.038).multiplyScalar(Math.max(0, 1 - r - b))
      .add(corail(C.rouge).multiplyScalar(Math.max(0, r - v))).add(corail(C.rougeF).multiplyScalar(v))
      .add(couche(C.blanc).multiplyScalar(b));
    return [c.r, c.g, c.b];
  } catch (e) { return false; }
}

// Les couleurs sont celles relevées sur les photos (C) ; la pierre est la teinte des gravillons mis à nu.
function peindreFresque(mat, W, L) {
  const lin = (h) => new THREE.Color(h);
  const u = {
    uJemTaille: { value: new THREE.Vector2(W, L) },
    uJemCercle: { value: Math.abs(COURT.HOOP_Z) },
    uJemRouge: { value: lin(C.rouge) }, uJemRougeF: { value: lin(C.rougeF) },
    // (la sous-couche noire recalée sous la lumière de js/ombres_soleil.js et à exposition égale : elle sortait 15
    // niveaux plus claire et plus chaude que le noir validé ; le corail, lui, tombait juste)
    uJemNoir: { value: lin('#222225') }, uJemPierre: { value: lin('#6c6862') },
    uJemBlanc: { value: lin(C.blanc) }, uJemPoussiere: { value: lin('#928e84') },
  };
  mat.__jem = u;
  if (TEL) mat.defines = { ...mat.defines, JEM_LEGER: '' };      // (en gardant STANDARD, que three y a mis)
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uJemBruit: U_BRUIT });
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec2 uJemTaille; uniform float uJemCercle;
        uniform vec3 uJemRouge, uJemRougeF, uJemNoir, uJemPierre, uJemBlanc, uJemPoussiere;
        ${GLSL_BRUIT}`)
      .replace('#include <map_fragment>', `
        vec4 jM = texture2D( map, vMapUv );                        // le dessin : r = corail, g = corail sombre, b = marquage
        vec4 jD = texture2D( roughnessMap, vRoughnessMapUv );      // la photo : r = grain, g = rugosité, b = relief fin
        vec2 jP = vec2( ( vMapUv.x - 0.5 ) * uJemTaille.x, ( 0.5 - vMapUv.y ) * uJemTaille.y );   // (x, z) en mètres
        float jGrain = jD.r * 2.0;
        float jRel = jD.b - 0.5;
        // où l'on court : sous les cercles, dans la raquette, au rond central
        float jDc = length( vec2( jP.x, abs( jP.y ) - uJemCercle ) );
        float jTrafic = exp( - jDc * jDc / 9.0 ) + 0.4 * exp( - dot( jP, jP ) / 7.0 ) + 0.25 * exp( - jDc * jDc / 40.0 );
        float jLarge = jFbm( jP * 0.45 + 3.7 );
        // (sous le cercle, l'usure ne compte que 70 % du trafic : à plein, le corail de la raquette y était criblé)
        float jUsure = clamp( 0.1 + 0.5 * ( jTrafic - 0.3 * exp( - jDc * jDc / 9.0 ) ) + 0.7 * ( jLarge - 0.5 ), 0.0, 1.0 );
        // les bosses : relief de la photo, et les grains clairs (les cailloux) comptent comme des sommets
        float jPic = jRel * 1.2 + ( jGrain - 1.0 ) * 0.45;
        // bord des formes : le masque est une pente douce (flou du canvas) que l'on coupe au bruit et au gravillon
        float jBr = ( jBruit( jP * 23.0 ) - 0.5 ) * 0.3 + ( jBruit( jP * 67.0 + 11.0 ) - 0.5 ) * 0.16 + jRel * 0.35;
        float jAr = fwidth( jM.r ) * 0.8 + 0.015, jAb = fwidth( jM.b ) * 0.8 + 0.015;
        float jRouge = smoothstep( 0.5 - jAr, 0.5 + jAr, jM.r + jBr );
        float jBlanc = smoothstep( 0.5 - jAb, 0.5 + jAb, jM.b + jBr * 0.7 );
        // ce qui a tenu : le corail part le premier, le marquage (repeint) tient mieux, la sous-couche noire encore mieux
        float jSr = 0.36 - 0.5 * jUsure;
        float jGardeN = 1.0 - smoothstep( jSr + 0.2, jSr + 0.34, jPic );
        // LE POIVRE. Là où le corail part, c'est la PIERRE qu'on doit voir (des cailloux gris qui percent le rouge),
        // pas la sous-couche noire : elle fait le fond de la fresque, pas le dessous des formes. Avec le noir gardé
        // partout, chaque gravillon à nu faisait un point noir net sur le corail, que l'anticrénelage ne rattrapait
        // pas de loin. La fenêtre du départ s'élargit (±0,12, plus un pixel d'écran du relief) : un bord doux.
        float jFw = fwidth( jPic );
        float jPart = smoothstep( jSr - 0.12 - jFw, jSr + 0.12 + jFw, jPic );
        jGardeN *= 1.0 - 0.85 * jRouge * jPart;
        jRouge *= 1.0 - jPart;
        jBlanc *= 1.0 - smoothstep( jSr + 0.02, jSr + 0.14, jPic );
        vec3 jC = uJemPierre * mix( 1.0, jGrain, 0.55 );
        // la sous-couche noire s'amincit là où l'on court, et par plaques : elle grisaille sans partir
        vec4 jN15 = texture2D( uJemBruit, ( jP * 1.5 + 9.0 ) * 0.03125 );     // une lecture pour deux bruits (amincissement, gomme)
        float jMince = smoothstep( 0.3, 0.95, jUsure + ( jN15.r - 0.5 ) * 0.9 );
        vec3 jNoirC = mix( uJemNoir * mix( 1.0, jGrain, 0.42 ), uJemPierre * 0.72 * mix( 1.0, jGrain, 0.5 ), 0.22 * jMince );
        jC = mix( jC, jNoirC, jGardeN );
        jC = mix( jC, mix( uJemRouge, uJemRougeF, smoothstep( 0.3, 0.7, jM.g ) ) * mix( 1.0, jGrain, 0.22 ), jRouge );
        jC = mix( jC, uJemBlanc * mix( 1.0, jGrain, 0.1 ), jBlanc );
        // plaques : poussière sèche plus claire, humidité et gomme plus sombres
        jC *= 0.87 + 0.26 * jLarge;
        float jGomme = exp( - jDc * jDc / 6.0 ) * smoothstep( 0.35, 0.75, jN15.g );
        jC *= 1.0 - 0.28 * jGomme;
        #ifndef JEM_LEGER
          // traces de semelles : des virgules sombres, étirées, là où l'on freine et pivote
          vec2 jQ = mat2( 0.8, - 0.6, 0.6, 0.8 ) * jP;
          float jTrace = smoothstep( 0.8, 0.9, jBruit( jQ * vec2( 2.2, 9.0 ) ) ) * smoothstep( 0.15, 0.6, jTrafic );
          jC = mix( jC, vec3( 0.02 ), jTrace * 0.5 );
          // quelques taches rondes (chewing-gums, boissons renversées), petites et rares
          jC *= 1.0 - 0.18 * smoothstep( 0.975, 0.99, jBruit( jP * 5.3 + 7.0 ) );
        #endif
        // le fond des pores reçoit moins de lumière
        jC *= 1.0 - 0.3 * clamp( - jRel * 2.4, 0.0, 1.0 );
        // le voile de poussière du quai, qui rapproche toutes les valeurs. Sur le noir il ne s'accroche qu'à moitié :
        // mélangée en lumière linéaire, une poussière claire double la valeur d'un noir (0,02 -> 0,05) et le sol
        // virait au gris chaud ; sur les peintures claires elle ne fait que les patiner.
        jC = mix( jC, uJemPoussiere, ( 0.08 + 0.06 * jLarge ) * mix( 0.4, 1.0, max( jRouge, jBlanc ) ) );
        diffuseColor.rgb *= jC;
        // brillance : l'enrobé nu est mat, la peinture satinée, le marquage un peu plus lisse
        float jRugo = mix( 0.92, 0.76, jGardeN );
        jRugo = mix( jRugo, 0.62, jRouge ); jRugo = mix( jRugo, 0.54, jBlanc );
        // la peinture bouche les pores : le relief se lit moins sous elle
        float jRelief = mix( 1.0, 0.55, max( max( jRouge, jBlanc ), jGardeN * 0.4 ) );
      `)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * jRugo * mix( 1.0, jD.g / 0.83, 0.5 );')
      .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * jRelief;'));
  };
  mat.customProgramCacheKey = () => 'jem-fresque-1';
  mat.needsUpdate = true;
}

// LE DESSIN DE LA FRESQUE, en masque. Un fond noir et de grandes formes rouges pleines. Tout le caractere du terrain
// tient dans la COMPOSITION : les formes sont grosses (1,5 a 4,5 m), souvent jointes, et elles debordent volontiers
// sur les lignes de jeu. Les positions sont ecrites en dur et non tirees au sort : c'est un dessin d'artiste, pas un
// semis. 80 px/m : le marquage (7,5 cm) fait six pixels, assez pour un bord net une fois coupé par le shader.
function masqueFresque(canvasTex, ENC) {
  const S = 80, W = ENC.X * 2, L = ENC.Z * 2;
  const tex = canvasTex(Math.round(W * S), Math.round(L * S), (g0, w, h) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    // DEUX reperes, et il ne faut pas les confondre.
    //  - X / Z : les vrais metres. C'est eux qui servent au marquage du terrain, qui doit etre juste.
    //  - Xf / Zf : le repere de la FRESQUE. La composition a ete dessinee pour une enceinte de 19,2 x 32 m ;
    //    sur une enceinte plus petite on la RESSERRE au lieu de la rogner, sinon la moitie des formes sortirait
    //    du cadre. C'est ce que fait un peintre qui adapte son motif a un mur plus etroit.
    const X = (x) => (x + W / 2) * S, Z = (z) => (z + L / 2) * S;
    const kx = W / 19.2, kz = L / 32, kf = (kx + kz) / 2;   // kf : l'echelle des formes elles-memes
    const Xf = (x) => (x * kx + W / 2) * S, Zf = (z) => (z * kz + L / 2) * S;
    const ROUGE = 'rgb(255,0,0)', ROUGEF = 'rgb(255,255,0)';
    const col = (c) => (c === C.rougeF ? ROUGEF : ROUGE);
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);

    // ---- LES FORMES ----
    // petale : un ovale pointu, pivote. C'est la brique de base de tout le dessin.
    const petale = (x, z, l, larg, ang, c) => {
      g.save(); g.translate(Xf(x), Zf(z)); g.rotate(ang); g.scale(kf, kf); g.fillStyle = col(c);
      g.beginPath();
      g.moveTo(0, -l * S / 2);
      g.bezierCurveTo(larg * S * 0.62, -l * S * 0.22, larg * S * 0.62, l * S * 0.22, 0, l * S / 2);
      g.bezierCurveTo(-larg * S * 0.62, l * S * 0.22, -larg * S * 0.62, -l * S * 0.22, 0, -l * S / 2);
      g.closePath(); g.fill(); g.restore();
    };
    // coeur : deux lobes et une pointe. Present plusieurs fois sur les photos.
    const coeur = (x, z, r, ang, c) => {
      g.save(); g.translate(Xf(x), Zf(z)); g.rotate(ang); g.scale(r * S * kf, r * S * kf); g.fillStyle = col(c);
      g.beginPath();
      g.moveTo(0, 0.95);
      g.bezierCurveTo(-1.35, -0.05, -0.72, -1.05, 0, -0.42);
      g.bezierCurveTo(0.72, -1.05, 1.35, -0.05, 0, 0.95);
      g.closePath(); g.fill(); g.restore();
    };
    // losange aux cotes bombes : la forme « diamant » du milieu de terrain
    const diamant = (x, z, rx, rz, ang, c) => {
      g.save(); g.translate(Xf(x), Zf(z)); g.rotate(ang); g.scale(kf, kf); g.fillStyle = col(c);
      g.beginPath();
      g.moveTo(0, -rz * S);
      g.quadraticCurveTo(rx * S * 0.42, -rz * S * 0.42, rx * S, 0);
      g.quadraticCurveTo(rx * S * 0.42, rz * S * 0.42, 0, rz * S);
      g.quadraticCurveTo(-rx * S * 0.42, rz * S * 0.42, -rx * S, 0);
      g.quadraticCurveTo(-rx * S * 0.42, -rz * S * 0.42, 0, -rz * S);
      g.closePath(); g.fill(); g.restore();
    };
    // goutte : un disque et une pointe. Les grosses taches rondes des photos.
    const goutte = (x, z, r, ang, c) => {
      g.save(); g.translate(Xf(x), Zf(z)); g.rotate(ang); g.scale(kf, kf); g.fillStyle = col(c);
      g.beginPath();
      g.arc(0, 0, r * S, 0.55, Math.PI * 2 - 0.55);
      g.quadraticCurveTo(r * S * 1.15, -r * S * 1.15, r * S * 2.0, -r * S * 1.75);
      g.quadraticCurveTo(r * S * 1.15, -r * S * 0.25, r * S * Math.cos(0.55), r * S * Math.sin(0.55));
      g.closePath(); g.fill(); g.restore();
    };
    // fleur : des petales autour d'un centre. Le motif qui trone au milieu du terrain.
    const fleur = (x, z, r, n, ang, c) => {
      for (let i = 0; i < n; i++) petale(x, z, r * 2, r * 0.95, ang + (i / n) * Math.PI * 2, c);
    };

    // ---- COMPOSITION ----
    // Moitie -Z : la grande fleur de la raquette et sa couronne de petales.
    fleur(-0.4, -10.0, 1.9, 5, 0.3, C.rouge);
    petale(-4.2, -12.6, 4.6, 2.5, 0.75, C.rouge);
    petale(3.9, -13.2, 4.2, 2.3, -0.55, C.rouge);
    coeur(-6.4, -8.2, 1.7, 0.35, C.rouge);
    coeur(6.0, -9.6, 1.5, -0.6, C.rouge);
    goutte(-7.4, -4.0, 1.5, 1.1, C.rouge);
    goutte(7.0, -5.2, 1.35, -2.1, C.rouge);
    diamant(-2.3, -5.4, 1.5, 2.6, 0.22, C.rougeF);
    petale(2.6, -4.6, 3.6, 2.0, -0.3, C.rouge);
    coeur(-8.2, -14.0, 1.3, 0.9, C.rougeF);
    petale(8.0, -15.0, 3.2, 1.8, 0.4, C.rouge);

    // Milieu : une grande forme qui traverse le rond central.
    fleur(0.2, 0.4, 2.4, 6, 0.15, C.rouge);
    diamant(-5.6, 1.6, 1.7, 2.9, -0.35, C.rouge);
    diamant(5.4, -0.8, 1.6, 2.7, 0.4, C.rougeF);
    goutte(-8.4, 4.6, 1.4, 2.4, C.rouge);
    goutte(8.2, 3.2, 1.5, -0.7, C.rouge);

    // Moitie +Z : plus aeree, quelques grosses formes.
    petale(-3.4, 7.4, 4.4, 2.4, -0.7, C.rouge);
    coeur(3.2, 8.2, 1.8, 0.25, C.rouge);
    fleur(0.0, 11.4, 1.7, 5, -0.25, C.rouge);
    petale(-6.8, 12.0, 4.0, 2.2, 0.5, C.rougeF);
    goutte(6.6, 11.0, 1.4, 1.7, C.rouge);
    coeur(-1.8, 14.6, 1.6, -0.4, C.rouge);
    petale(7.2, 14.8, 3.4, 1.9, -0.35, C.rouge);
    coeur(8.4, 6.6, 1.25, 1.2, C.rougeF);
    petale(-8.6, -0.6, 3.0, 1.7, 0.1, C.rougeF);
    // De quoi COUVRIR le sol : sur les photos les formes se touchent presque partout, il ne reste que des
    // intervalles de noir. Une composition trop aeree donne un semis, pas une fresque.
    petale(5.2, -8.4, 3.8, 2.1, 0.85, C.rouge);
    coeur(-4.6, -2.0, 1.45, -0.8, C.rouge);
    goutte(2.2, -1.6, 1.25, 0.3, C.rougeF);
    petale(-7.2, -6.0, 3.2, 1.8, -0.45, C.rouge);
    diamant(7.6, -2.6, 1.3, 2.2, -0.2, C.rouge);
    coeur(1.4, 4.4, 1.5, 0.7, C.rougeF);
    petale(-2.2, 2.6, 3.4, 1.9, 1.15, C.rouge);
    goutte(-6.0, 5.0, 1.2, -1.4, C.rougeF);
    diamant(4.2, 5.6, 1.4, 2.3, 0.5, C.rouge);
    coeur(-8.0, 9.0, 1.35, -0.2, C.rouge);
    petale(5.6, 9.6, 3.6, 2.0, -0.9, C.rougeF);
    goutte(2.0, 13.2, 1.3, 2.0, C.rouge);
    diamant(-5.2, 15.0, 1.3, 2.1, -0.4, C.rouge);
    coeur(4.0, -15.2, 1.4, 1.5, C.rougeF);
    goutte(-3.0, -15.4, 1.2, -0.5, C.rouge);
    petale(0.6, -7.0, 3.0, 1.7, 0.25, C.rougeF);

    // ---- marquage du terrain : ajouté dans le bleu, sans toucher aux formes dessous ----
    g.globalCompositeOperation = 'lighter';
    lignesJemmapes(g, X, Z, S, 'rgb(0,0,255)');
    g.globalCompositeOperation = 'source-over';

    // Un léger flou : le bord devient une pente de quelques centimètres, que le shader découpe au bruit et au
    // gravillon. (Sans `filter` — vieux Safari — le bord reste net, rien ne casse.)
    g0.fillStyle = '#000'; g0.fillRect(0, 0, w, h);
    if ('filter' in g0) g0.filter = 'blur(1.4px)';
    g0.drawImage(cv, 0, 0);
    if ('filter' in g0) g0.filter = 'none';
    cv.width = cv.height = 1;                            // libère le dessin intermédiaire
  }, null, false, 16);
  tex.colorSpace = THREE.NoColorSpace;                   // un masque se lit tel quel
  return tex;
}

// Marquage blanc, fin et net : sur ce terrain-la il passe PAR-DESSUS la fresque, y compris sur les formes
// rouges, sans liseré. C'est ce contraste qui donne au sol son air de dessin.
function lignesJemmapes(g, X, Z, S, couleur = '#f4f2ea') {
  g.strokeStyle = couleur; g.lineWidth = 0.075 * S; g.lineCap = 'butt';
  g.strokeRect(X(-COURT.W / 2), Z(-COURT.L / 2), COURT.W * S, COURT.L * S);
  // Ecrite en dur a 7,5 m — la demi-largeur d'un terrain REGLEMENTAIRE — la mediane depassait de 1,75 m de
  // chaque cote sur ce terrain-ci, qui n'en fait que 11,5 de large.
  g.beginPath(); g.moveTo(X(-COURT.W / 2), Z(0)); g.lineTo(X(COURT.W / 2), Z(0)); g.stroke();
  g.beginPath(); g.arc(X(0), Z(0), 1.8 * S, 0, Math.PI * 2); g.stroke();
  for (const sgn of [-1, 1]) {
    // La ligne de fond et le fond de la raquette se DEDUISENT de la longueur du terrain : ecrites en dur a 14
    // et 8,2 m, elles tombaient a cote des que le terrain n'etait plus reglementaire.
    const hoopZ = sgn * Math.abs(COURT.HOOP_Z), baseZ = sgn * (COURT.L / 2), keyEndZ = sgn * (COURT.L / 2 - 5.8);
    const cornerZ = sgn * Math.abs(COURT.CORNER_Z);
    g.strokeRect(X(-2.45), Math.min(Z(baseZ), Z(keyEndZ)), 4.9 * S, 5.8 * S);
    g.beginPath(); g.arc(X(0), Z(keyEndZ), 1.8 * S, sgn === -1 ? 0 : Math.PI, sgn === -1 ? Math.PI : 0, false); g.stroke();
    g.setLineDash([0.28 * S, 0.22 * S]);
    g.beginPath(); g.arc(X(0), Z(keyEndZ), 1.8 * S, sgn === -1 ? Math.PI : 0, sgn === -1 ? 0 : Math.PI, false); g.stroke();
    g.setLineDash([]);
    g.beginPath(); g.arc(X(0), Z(hoopZ), 1.25 * S, sgn === -1 ? 0 : Math.PI, sgn === -1 ? Math.PI : 0, false); g.stroke();
    const dz = (cornerZ - hoopZ) * S;
    const a0 = Math.atan2(dz, -COURT.CORNER_X * S), a1 = Math.atan2(dz, COURT.CORNER_X * S);
    g.beginPath();
    g.moveTo(X(-COURT.CORNER_X), Z(baseZ));
    g.lineTo(X(-COURT.CORNER_X), Z(cornerZ));
    g.arc(X(0), Z(hoopZ), COURT.THREE_R * S, a0, a1, sgn === -1);
    g.lineTo(X(COURT.CORNER_X), Z(baseZ));
    g.stroke();
  }
}
// =====================================================================
//  LES SOLS AUTOUR : trottoirs, chaussées, caniveaux, bordures
// =====================================================================
// Ils portaient une dalle de béton dessinée, la même de la cour du lycée jusqu'au canal. Un quai parisien, c'est
// autre chose : de l'ASPHALTE COULÉ gris anthracite sur les trottoirs (grain de sable, rustines plus sombres), une
// chaussée d'enrobé plus claire et plus usée, et entre les deux une BORDURE DE GRANIT de 14 cm doublée d'un
// CANIVEAU PAVÉ. Le long de l'eau, une bande de pavés de granit précède la margelle. Chaque surface a sa photo.
// Le trottoir de la cour (tout ce qui n'est ni chaussée ni canal) descend comme avant 4 cm sous le terrain.
function solsAutour(scene, K, Q) {
  const Z0 = -200, Z1 = 200, X0 = -200, X1 = 200, YT = -0.04, YR = -0.17;
  const trottoir = matMix('trottoir', 2.1, '#6b6a67', { grain: 1.0, taches: 0.24, echT: 2.6, relief: 0.9 });
  // LA COUR EST PERCÉE SOUS LE TERRAIN. D'un seul tenant, elle passait 4 cm sous toute la fresque : la carte de
  // profondeur ne l'écartait pas (les deux plans arrivent l'un derrière l'autre dans le même lot de dessin) et chaque
  // pixel du terrain payait DEUX fois un sol photo — 2 ms par image dans la vue de match sur la Radeon 660M, plus sa
  // part dans la passe de normales de l'occlusion ambiante. Elle s'arrête maintenant à 30 cm sous le bord de la
  // fresque (assez pour qu'aucune fente ne s'ouvre au ras du bord, vu de biais). Les UV sont pris dans le monde : les
  // quatre morceaux se raccordent sans couture.
  const { ENC } = K, hx = ENC.X - 0.3, hz = ENC.Z - 0.3;
  maillage(scene, [
    dalleSol(X0, -hx, Z0, Z1, YT), dalleSol(hx, Q.xr1, Z0, Z1, YT),   // la cour, le trottoir de la haie…
    dalleSol(-hx, hx, Z0, -hz, YT), dalleSol(-hx, hx, hz, Z1, YT),    // …autour du terrain
    dalleSol(Q.xr2, Q.xq - 1.55, Z0, Z1, YT),              // la promenade plantée
    dalleSol(Q.xf + 1.55, Q.xv1, Z0, Z1, YT),              // la promenade d'en face
    dalleSol(Q.xv2, X1, Z0, Z1, YT),                       // le trottoir des immeubles d'en face
  ], trottoir, false);
  // la chaussée : la photo de l'enrobé du terrain, sans peinture, plus claire et tachée d'huile
  const route = matMix('enrobe', 2.0, '#65625c', { grain: 1.0, taches: 0.2, echT: 5.0, relief: 1.0 });
  maillage(scene, [dalleSol(Q.xr1 + 0.35, Q.xr2 - 0.35, Z0, Z1, YR), dalleSol(Q.xv1 + 0.35, Q.xv2 - 0.35, Z0, Z1, YR)], route, false);
  // pavés de granit : caniveaux au pied des bordures, bande le long de l'eau
  const paves = matPhoto('paves', 2.0, { teinte: teinteVers('#6f6d68', MOY.paves), ao: 1.0 });
  maillage(scene, [
    dalleSol(Q.xr1, Q.xr1 + 0.35, Z0, Z1, YR + 0.005), dalleSol(Q.xr2 - 0.35, Q.xr2, Z0, Z1, YR + 0.005),
    dalleSol(Q.xv1, Q.xv1 + 0.35, Z0, Z1, YR + 0.005), dalleSol(Q.xv2 - 0.35, Q.xv2, Z0, Z1, YR + 0.005),
    dalleSol(Q.xq - 1.55, Q.xq - 0.45, Z0, Z1, YT), dalleSol(Q.xf + 0.45, Q.xf + 1.55, Z0, Z1, YT),
  ], paves, false);
  // bordures de granit : 18 cm de large, 1 cm au-dessus du trottoir, 14 cm au-dessus de la chaussée
  const granit = matPhoto('granit', 1.8, { teinte: teinteVers('#8d8983', MOY.granit) });
  const B = 0.18, yb = (-0.3 + (YT + 0.01)) / 2, hb = (YT + 0.01) + 0.3;
  maillage(scene, [
    boite(B, hb, Z1 - Z0, Q.xr1 - B / 2, yb, 0), boite(B, hb, Z1 - Z0, Q.xr2 + B / 2, yb, 0),
    boite(B, hb, Z1 - Z0, Q.xv1 - B / 2, yb, 0), boite(B, hb, Z1 - Z0, Q.xv2 + B / 2, yb, 0),
  ], granit, false);
  // tout cela se mouille sous la pluie (js/weather.js, via wetMats)
  scene.userData.solsJemmapes = [trottoir, route, paves, granit];
}

// LES PLATANES DU CANAL NE PROJETTENT LEUR OMBRE QUE QUAND ON LA VOIT. Leurs feuillages découpés redessinés à chaque
// image dans la carte d'ombre coûtaient ~0,7 ms en qualité haute sur la Radeon 660M… pour une ombre qui tombe sur la
// chaussée du quai, dans le dos de la caméra de match. À chaque rendu, un témoin (un triangle plat : il ne trame
// rien) regarde si la boîte « arbre + son ombre au sol » de chaque platane entre dans le champ de la caméra ; à
// l'image suivante, seuls ceux-là projettent. Une image de retard au plus, au bord de l'écran : invisible.
// Le témoin est « dynamique » : la photo de la carte d'environnement (js/court.js) ne le déclenche pas.
function ombresSelonVue(scene, spots) {
  if (!spots.length) return { maj() {} };
  const fr = new THREE.Frustum(), m4 = new THREE.Matrix4(), S = new THREE.Vector3();
  let boites = null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
  const mat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false });
  mat.onBeforeCompile = () => {};             // matériau « maison » : la déduplication de js/court.js n'y touche pas
  const temoin = new THREE.Mesh(geo, mat);
  temoin.frustumCulled = false; temoin.castShadow = false; temoin.receiveShadow = false;
  Object.assign(temoin.userData, { dynamique: true, nofuse: true });
  temoin.onBeforeRender = (r, sc, cam) => {
    if (!cam.isPerspectiveCamera) return;
    if (!boites) {
      // Deux boîtes par arbre : l'arbre lui-même (houppier de ~3,2 m de rayon), et la tache de son ombre AU SOL,
      // poussée à l'opposé du soleil jusqu'à l'ombre de la cime. Une seule boîte englobant les deux montait jusqu'à
      // la caméra de match (au-dessus du trottoir) : elle la contenait, donc « se voyait » toujours.
      const sun = scene.userData.env && scene.userData.env.sun;
      if (sun) S.copy(sun.position).sub(sun.target.position).normalize(); else S.set(22, 36, 12).normalize();
      const kx = S.x / Math.max(S.y, 0.2), kz = S.z / Math.max(S.y, 0.2), R = 3.2;
      boites = spots.map((s) => [
        new THREE.Box3(new THREE.Vector3(s.x - R, 0, s.z - R), new THREE.Vector3(s.x + R, s.h + 1, s.z + R)),
        new THREE.Box3(new THREE.Vector3(Math.min(s.x, s.x - kx * s.h) - R, -0.3, Math.min(s.z, s.z - kz * s.h) - R),
                       new THREE.Vector3(Math.max(s.x, s.x - kx * s.h) + R, 0.4, Math.max(s.z, s.z - kz * s.h) + R)),
      ]);
    }
    fr.setFromProjectionMatrix(m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    spots.forEach((s, i) => { if (fr.intersectsBox(boites[i][0]) || fr.intersectsBox(boites[i][1])) s.jemVu = true; });
  };
  scene.add(temoin);
  return {
    // appelé à chaque image (animation du décor), avant le rendu : ce qu'a vu le rendu précédent
    maj() {
      for (const s of spots) {
        const o = s.arbre || s.fallback;       // l'arbre 3D remplace l'arbre dessiné quand il arrive
        const voir = !!s.jemVu; s.jemVu = false;
        if (!o || (o === s.jemObj && voir === s.jemOmbre)) continue;
        s.jemObj = o; s.jemOmbre = voir;
        o.traverse((m) => { if (m.isMesh) m.castShadow = voir; });
      }
    },
  };
}

// LES GRILLES D'ARBRE du canal : le disque de fonte ajourée (anneaux concentriques, rayons, trou du tronc), posé sur la
// terre, que Paris met au pied de ses platanes d'alignement. Toutes cousues en un maillage, un seul matériau : la
// fosse de terre générique (treeSoil) coûtait deux appels de dessin par arbre, et son détail photo empêchait la fusion.
function grillesArbres(scene, K, pieds) {
  if (!pieds.length) return;
  const tex = K.canvasTex(256, 256, (g, w, h) => {
    const c = w / 2;
    g.fillStyle = '#4e4032'; g.fillRect(0, 0, w, h);                    // la terre tassée
    for (let i = 0; i < 3000; i++) {
      const v = Math.floor(rnd(50, 120));
      g.fillStyle = `rgba(${v},${Math.floor(v * 0.82)},${Math.floor(v * 0.62)},${rnd(0.3, 0.8)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), rnd(1, 3));
    }
    g.strokeStyle = '#2a2826'; g.lineCap = 'round';
    for (const [r, e] of [[0.98, 10], [0.74, 7], [0.5, 7], [0.3, 9]]) {  // anneaux de fonte
      g.lineWidth = e; g.beginPath(); g.arc(c, c, r * c, 0, Math.PI * 2); g.stroke();
    }
    g.lineWidth = 6;
    for (let k = 0; k < 24; k++) {                                          // barreaux rayonnants
      const a = (k / 24) * Math.PI * 2, r0 = (k % 2 ? 0.5 : 0.3) * c;
      g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * 0.98 * c, c + Math.sin(a) * 0.98 * c); g.stroke();
    }
    for (let i = 0; i < 40; i++) {                                          // la rouille et l'usure du métal
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '110,62,34' : '150,150,145'},${rnd(0.1, 0.3)})`;
      g.beginPath(); g.arc(rnd(0, w), rnd(0, h), rnd(3, 12), 0, Math.PI * 2); g.fill();
    }
  }, null, false, 8);
  const geos = pieds.map(([x, z]) => new THREE.CircleGeometry(0.9, 28).rotateX(-Math.PI / 2).translate(x, -0.035, z));
  maillage(scene, geos, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.2 }), false);
}

// =====================================================================
//  GRILLAGE NOIR
// =====================================================================
// Haut, serré, entièrement noir, et posé sur un petit muret de béton : c'est une cage urbaine, pas une
// clôture de parc. Il n'y a aucun dégagement entre le terrain et lui.
//
// UN VRAI GRILLAGE SIMPLE TORSION. La maille dessinée d'avant faisait 25 cm pour des fils plats de 3 cm : de près
// on voyait un treillis de jardin en lattes. Le vrai est une maille de 6 cm en fil de 5,5 mm plastifié noir,
// tressé : chaque fil passe DEVANT puis DERRIÈRE ses voisins, et les croisements font un petit nœud. Le fil est
// ROND — la carte de normales, calculée depuis son profil, lui donne son reflet brillant sur le dessus.
// LE PIÈGE D'UN FIL FIN, c'est la distance : à 15 m il fait moins d'un pixel, les mipmaps l'effacent et le test
// alpha le troue. Le shader mesure donc, à chaque pixel, combien de pixels fait le fil : tant qu'il en fait plus
// d'un, bord net (découpe à mi-hauteur du profil, anti-crénelée par fwidth) ; en deçà, il prend la COUVERTURE
// MOYENNE de la maille (un quart). De loin la cage devient ce qu'elle est sur les photos : un voile sombre qui laisse
// voir ce qu'il y a derrière — et elle ne disparaît jamais.
// CETTE COUVERTURE EST UNE TRANSPARENCE, pas un tramage. Le premier jet la rendait par un tramage ordonné d'un pixel
// (un pixel sur quatre gardé, les autres jetés) : l'étalonnage de js/fx.js (clarté, puis SMAA) transformait ce damier
// en grésillement rouge et jaune dès que le grillage était vu de biais (vue le long de la clôture du quai), et de face
// il se lisait comme une moustiquaire. Un fil plus fin qu'un pixel couvre une FRACTION du pixel : c'est exactement
// un mélange par alpha. Le grillage passe donc avec les objets transparents (dessiné après tout l'opaque, du plus
// loin au plus près), sans écrire la profondeur ; seuls les pixels vides sont jetés.
function grillageNoir(scene, K) {
  const { ENC } = K;
  const H = 5.4, MURET = 0.45;
  const maille = matGrillage();
  const poteau = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.4, metalness: 0.55 });
  // Le muret : du béton banché, à la même teinte moyenne qu'avant (0x8e8b84), photo concrete_wall_008.
  const beton = matPhoto('beton', 2.7, { teinte: teinteVers('#8e8b84', MOY.beton), ao: 0.9 });

  const cotes = [
    { w: ENC.Z * 2 + 0.8, x: -ENC.X - 0.4, z: 0, rot: Math.PI / 2 },
    { w: ENC.Z * 2 + 0.8, x: ENC.X + 0.4, z: 0, rot: Math.PI / 2, tv: true },
    { w: ENC.X * 2 + 0.8, x: 0, z: -ENC.Z - 0.4, rot: 0 },
    { w: ENC.X * 2 + 0.8, x: 0, z: ENC.Z + 0.4, rot: 0 },
  ];
  // LE MÉTAL DU CÔTÉ DE LA CAMÉRA TV à part. La caméra de match est postée derrière ce grillage : js/game.js y masque
  // déjà la maille (sideNetTV), mais poteaux, lisses et diagonales des quatre côtés étaient cousus d'un seul tenant,
  // et la lisse du pied barrait le bas de l'image d'un gros tube noir brillant. Ceux de ce côté ont donc leur
  // maillage (metalTV) : en caméra TV il ne garde que son ombre (js/game.js updateCamera) ; les poteaux d'angle
  // restent, portés par les deux côtés voisins.
  const murets = [], metalTous = [], metalTV = [];
  const f = scene.userData.feuillages || (scene.userData.feuillages = []);
  for (const c of cotes) {
    const metal = c.tv ? metalTV : metalTous;
    murets.push(boite(c.rot ? 0.28 : c.w, MURET, c.rot ? c.w : 0.28, c.x, MURET / 2, c.z));
    // la maille : UV en mètres, un seul matériau pour les quatre côtés
    const g = new THREE.PlaneGeometry(c.w, H - MURET);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * c.w, uv.getY(i) * (H - MURET));
    const m = new THREE.Mesh(g, maille);
    m.position.set(c.x, MURET + (H - MURET) / 2, c.z); m.rotation.y = c.rot; scene.add(m);
    // la passe de normales de l'occlusion ambiante (js/fx.js) ignore la découpe : sans ça elle dessinerait le
    // grillage en panneau plein et assombrirait tout ce qu'il y a derrière
    f.push(m);
    if (c.tv) scene.userData.sideNetTV = m;
    const n = Math.round(c.w / 2.6);
    const pos = (t) => (c.rot ? [c.x, c.z + t] : [c.x + t, c.z]);
    for (let i = 0; i <= n; i++) {
      const [px, pz] = pos(-c.w / 2 + (c.w / n) * i);
      metal.push(new THREE.CylinderGeometry(0.05, 0.055, H + 0.2, 12).translate(px, (H + 0.2) / 2, pz));
      metal.push(new THREE.CylinderGeometry(0.058, 0.058, 0.03, 12).translate(px, H + 0.215, pz));   // chapeau du poteau
    }
    // lisses : en haut, au pied et au tiers haut
    for (const y of [H, MURET + 0.05, H * 0.6]) metal.push(tube(0.03, c.rot ? [c.x, y, c.z - c.w / 2] : [c.x - c.w / 2, y, c.z],
      c.rot ? [c.x, y, c.z + c.w / 2] : [c.x + c.w / 2, y, c.z], 8));
    // CONTREVENTEMENTS D'ANGLE : deux diagonales dans la premiere travee de chaque bout. Sur la photo elles
    // sautent aux yeux et c'est elles qui font lire la cloture comme une vraie structure et non comme un
    // rideau tendu. Une cloture de cette hauteur ne tient pas debout sans.
    const pas = c.w / n;
    for (const bout of [-1, 1]) {
      const t0 = bout * (c.w / 2), t1 = t0 - bout * pas;
      const [xa, za] = pos(t0), [xb, zb] = pos(t1);
      metal.push(tube(0.028, [xa, MURET + 0.1, za], [xb, H - 0.1, zb], 8));
    }
  }
  maillage(scene, murets, beton);
  maillage(scene, metalTous, poteau);
  // (`nofuse` : la fusion du décor, js/court.js optimiserDecor, l'aurait recousu au reste — même matériau — et
  // js/game.js n'aurait plus rien à masquer)
  const mTV = maillage(scene, metalTV, poteau);
  mTV.userData.nofuse = true;
  scene.userData.metalTV = mTV;
}

// un tube de rayon r entre deux points (géométrie posée dans le monde, à coudre)
function tube(r, a, b, seg = 8) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = new THREE.Vector3().subVectors(B, A);
  const g = new THREE.CylinderGeometry(r, r, d.length(), seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate(A.x + d.x / 2, A.y + d.y / 2, A.z + d.z / 2);
  return g;
}

// La maille, dessinée une fois : quatre mailles de 6 cm par tuile (24 cm). Le profil du fil est rangé dans l'alpha
// comme une DISTANCE (1 au cœur du fil, 0,5 sur son bord, 0 à un rayon au-delà) : c'est ce qui permet au shader
// de retrouver un bord net à toute échelle. Normales et couverture moyenne sont calculées depuis ce profil.
function texturesGrillage() {
  const N = TEL ? 256 : 512, T = 0.24, P = N / 4;
  const r = (0.0055 / 2) / T * N;                          // rayon du fil (plastique compris), en pixels
  const haut = new Float32Array(N * N), alpha = new Uint8ClampedArray(N * N);
  let couvert = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // les deux familles de fils, à 45° ; le croisement le plus proche
      const a = (x - y) / P, b = (x + y) / P;
      const dA = Math.abs(a - Math.round(a)) * P / Math.SQRT2, dB = Math.abs(b - Math.round(b)) * P / Math.SQRT2;
      const ia = Math.round(a), ib = Math.round(b);
      const cx = (ia + ib) * P / 2, cy = (ib - ia) * P / 2;
      const w = Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / ((2.4 * r) ** 2));
      const re = r * (1 + 0.3 * w);                          // le nœud du croisement, un peu plus épais
      const dessus = ((ia + ib) & 1) === 0;                  // tressé : un croisement sur deux, l'autre fil dessus
      const hA = dA < re ? Math.sqrt(1 - (dA / re) ** 2) + (dessus ? 0.35 : -0.25) * w : -1;
      const hB = dB < re ? Math.sqrt(1 - (dB / re) ** 2) + (dessus ? -0.25 : 0.35) * w : -1;
      const h = Math.max(hA, hB);
      haut[y * N + x] = Math.max(0, h);
      const d = Math.min(dA - re, dB - re);                  // distance signée au bord du fil le plus proche
      alpha[y * N + x] = Math.round(255 * Math.min(1, Math.max(0, 0.5 - d / (2 * r))));
      if (d < 0) couvert++;
    }
  }
  const cc = document.createElement('canvas'); cc.width = cc.height = N;
  const cn = document.createElement('canvas'); cn.width = cn.height = N;
  const gc = cc.getContext('2d'), gn = cn.getContext('2d');
  const ic = gc.createImageData(N, N), inn = gn.createImageData(N, N);
  const H = (x, y) => haut[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x, o = i * 4;
      // pente du profil (en rayons par pixel) ; v monte quand y descend dans le canvas
      const dx = (H(x + 1, y) - H(x - 1, y)) * r * 0.5, dy = (H(x, y + 1) - H(x, y - 1)) * r * 0.5;
      const k = 1 / Math.hypot(dx / r, dy / r, 1);
      inn.data[o] = Math.round((-dx / r * k * 0.5 + 0.5) * 255);
      inn.data[o + 1] = Math.round((dy / r * k * 0.5 + 0.5) * 255);
      inn.data[o + 2] = Math.round((k * 0.5 + 0.5) * 255);
      inn.data[o + 3] = 255;
      // couleur : le flanc du fil un peu plus sombre (le plastique fait l'ombre de sa propre courbure)
      const v = Math.round(255 * (0.72 + 0.28 * haut[i]));
      ic.data[o] = ic.data[o + 1] = ic.data[o + 2] = v; ic.data[o + 3] = alpha[i];
    }
  }
  gc.putImageData(ic, 0, 0); gn.putImageData(inn, 0, 0);
  const couleur = new THREE.CanvasTexture(cc), normale = new THREE.CanvasTexture(cn);
  couleur.colorSpace = THREE.SRGBColorSpace; normale.colorSpace = THREE.NoColorSpace;
  for (const t of [couleur, normale]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / T, 1 / T); t.anisotropy = 8; }
  return { couleur, normale, N, r, couverture: couvert / (N * N) };
}

// LE VOILE DE LOIN. Deux choses que la couverture moyenne seule ne rendait pas, et qui effaçaient la cage derrière
// les paniers et devant le lycée sous la lumière du jeu :
//   - un grillage vu de biais se BOUCHE : les fils ronds gardent leur épaisseur quand leurs intervalles se
//     resserrent (couverture / cosinus de l'angle de vue) — le long d'une clôture on ne voit plus à travers ;
//   - un fil rond renvoie la lumière dans toutes les directions. Réduit à moins d'un pixel, sa normale moyennée
//     devenait celle d'un plan lisse et le voile entier reflétait le ciel comme une vitre : de loin la cage était
//     GRIS CLAIR sur l'enduit, donc invisible. Sa rugosité monte donc à mesure que le fil s'amincit à l'écran
//     (l'idée de Toksvig : la pente perdue dans la moyenne devient de la rugosité), et son relief s'efface.
// Le plastique qui gaine le fil n'est pas un métal : métallicité nulle.
function matGrillage() {
  const G = texturesGrillage();
  // transparent, sans écriture de profondeur, en une seule passe : un plan n'a qu'une face tournée vers la caméra,
  // inutile que three le dessine deux fois (dos puis face) comme il le fait pour un matériau double face transparent
  const m = new THREE.MeshStandardMaterial({ map: G.couleur, normalMap: G.normale, color: 0x1a1b1e, roughness: 0.42, metalness: 0,
    side: THREE.DoubleSide, normalScale: new THREE.Vector2(1, 1), transparent: true, depthWrite: false, forceSinglePass: true });
  // La couverture du voile : celle de la maille dessinée (un quart), majorée de 30 % pour ce que le profil plat ne
  // compte pas — les torsades de chaque croisement, épaisses, et le flou de l'objectif qui étale un fil sombre. Un
  // grillage noir vu à quinze mètres est un voile nettement sombre, pas une gaze : sans cette part, la cage du fond et
  // celle du lycée s'effaçaient dans la vue de match.
  const u = { uJemCouv: { value: G.couverture * 1.3 }, uJemFil: { value: new THREE.Vector2(G.N, 2 * G.r) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uJemBruit: U_BRUIT });
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uJemCouv;\nuniform vec2 uJemFil;')
      .replace('#include <alphatest_fragment>', `
        float jNet01 = 1.0;                    // 1 : fil net (plus d'un pixel et demi à l'écran), 0 : voile moyen
        {
          float jA = diffuseColor.a;
          float jNet = clamp( ( jA - 0.5 ) / max( fwidth( jA ), 1e-4 ) + 0.5, 0.0, 1.0 );
          // largeur du fil à l'écran, en pixels
          vec2 jT = vMapUv * uJemFil.x;
          float jPx = uJemFil.y / max( max( length( dFdx( jT ) ), length( dFdy( jT ) ) ), 1e-4 );
          jNet01 = smoothstep( 0.7, 1.8, jPx );
          // vu de biais, le grillage se bouche ; de face il garde la couverture mesurée sur la maille
          float jCos = abs( dot( normalize( vNormal ), normalize( vViewPosition ) ) );
          float jCouv = mix( min( 0.85, uJemCouv / max( jCos, 0.3 ) ), jNet, jNet01 );
          // LE VOILE GARDE SES LOSANGES. Uniforme, il faisait « serre en verre » dès que le fil passait sous le pixel,
          // alors que la maille de 6 cm, elle, se lit encore sur plusieurs pixels : on module la couverture de ±15 %
          // selon le losange (plus sombre sur les fils, plus clair au cœur de la maille — en moyenne rien ne change).
          // Seulement tant qu'une maille fait plus de trois pixels : plus serrée, la modulation ferait du moiré.
          {
            vec2 jS = vMapUv * 4.0;                                   // en mailles (quatre par tuile de 24 cm)
            float jDa = jS.x - jS.y, jDb = jS.x + jS.y;
            float jLos = 0.5 * ( cos( 6.2832 * jDa ) + cos( 6.2832 * jDb ) );
            float jPente = max( fwidth( jDa ), fwidth( jDb ) );
            jCouv = min( 0.9, jCouv * ( 1.0 + 0.15 * jLos * ( 1.0 - smoothstep( 0.2, 0.33, jPente ) ) * ( 1.0 - jNet01 ) ) );
          }
          // la part du pixel que le fil couvre : c'est l'alpha du mélange (de près, le bord anti-crénelé du fil ; de
          // loin, la couverture moyenne). Un pixel vide est jeté.
          if ( jCouv < 0.01 ) discard;
          diffuseColor.a = jCouv;
        }`)
      // le fil qui s'amincit à l'écran : sa pente moyennée devient de la rugosité, son relief s'efface
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix( 0.9, roughnessFactor, jNet01 );')
      .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * jNet01;'));
  };
  m.customProgramCacheKey = () => 'jem-grillage-3';
  return m;
}

// =====================================================================
//  LE PANIER
// =====================================================================
// Panneau transparent à cadre BLANC, porté par un MÂT NOIR DROIT planté juste derrière la ligne de fond, d'où
// partent DEUX BRAS OBLIQUES en V vers l'arrière du panneau, plus une flèche horizontale au sommet. C'est un
// panier de compétition sur mât, pas une potence en A : la photo de face est sans ambiguïté, il n'y a qu'un
// seul montant vertical et il est court. La version en A partait quatre mètres en arrière, traversait le fond
// et donnait au panier une carrure de but de handball.
function panierJemmapes(scene, K, sgn) {
  const { box } = K;
  const g = new THREE.Group();
  const bz = sgn * Math.abs(COURT.BOARD_Z);
  const noir = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.42, metalness: 0.45 });
  const verre = new THREE.MeshPhysicalMaterial({
    color: 0xdce6ea, roughness: 0.07, metalness: 0, transparent: true, opacity: 0.24,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const blanc = new THREE.MeshStandardMaterial({ color: 0xf3f3ef, roughness: 0.4 });
  // Cadre BLANC. Sur la vue Street View prise a contre-jour il paraissait noir, mais les deux photos prises
  // de face montrent sans ambiguite un cadre clair : c'est la structure derriere qui est noire.
  const cadre = new THREE.MeshStandardMaterial({ color: 0xeceae2, roughness: 0.42 });
  const LB = 1.80, HB = 1.05, yB = 3.425, CAD = 0.085;
  // Pied du mat : juste derriere la ligne de fond et DEVANT le mur du fond. Ecrit en dur a 15,1 m il se
  // retrouvait au-dela du mur des que le terrain retrecissait, et la jambe arriere le traversait.
  // Le mât est à 1,35 m derrière le panneau — donc tout juste hors de la ligne de fond, exactement comme sur
  // la photo où son pied se voit sur le bitume, contre la bande rouge.
  const zMat = sgn * (Math.abs(COURT.BOARD_Z) + 1.35);
  scene.userData.panneau = { demiL: LB / 2, bas: yB - HB / 2 + 0.03, haut: yB + HB / 2 - 0.03 };

  // ---- panneau ----
  const vitre = new THREE.Mesh(new THREE.PlaneGeometry(LB - CAD, HB - CAD), verre);
  vitre.position.set(0, yB, bz); vitre.renderOrder = -1; g.add(vitre);
  box(LB, CAD, 0.08, cadre, 0, yB + HB / 2, bz, g);
  box(LB, CAD * 1.6, 0.08, cadre, 0, yB - HB / 2, bz, g);
  for (const sx of [-1, 1]) box(CAD, HB, 0.08, cadre, sx * (LB - CAD) / 2, yB, bz, g);
  // carre de visee blanc
  const CL = 0.59, CH = 0.45, cy = COURT.HOOP_Y + CH / 2 - 0.01;
  for (const y of [cy - CH / 2, cy + CH / 2]) box(CL, 0.035, 0.014, blanc, 0, y, bz - sgn * 0.016, g, false);
  for (const x of [-CL / 2, CL / 2]) box(0.035, CH, 0.014, blanc, x, cy, bz - sgn * 0.016, g, false);
  box(0.24, 0.19, 0.05, noir, 0, COURT.HOOP_Y, bz - sgn * 0.04, g, false);      // platine du cercle

  // ---- la potence ----
  const barre = (a, b, r) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), noir);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    m.castShadow = true; g.add(m); return m;
  };
  const HM = 3.62;                                   // le mat s'arrete sous le panneau, il ne le depasse pas
  const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.125, HM, 14), noir);
  mat.position.set(0, HM / 2, zMat); mat.castShadow = true; g.add(mat);
  box(0.46, 0.1, 0.46, noir, 0, 0.05, zMat, g);      // semelle boulonnee au sol
  // LE V. Deux bras partent d'un meme point du mat et s'ecartent vers l'arriere du panneau : c'est la seule
  // chose qu'on voit sous le cercle sur la photo, et elle est large.
  for (const sx of [-1, 1]) {
    barre(new THREE.Vector3(sx * 0.66, yB - 0.08, bz + sgn * 0.07),
          new THREE.Vector3(0, HM - 0.62, zMat), 0.055);
  }
  // fleche horizontale du sommet du mat au dos du panneau
  barre(new THREE.Vector3(0, HM - 0.06, zMat), new THREE.Vector3(0, yB + HB / 2 - 0.16, bz + sgn * 0.07), 0.062);

  scene.add(g);

  // ---- la banderole « QUAI DE JEMMAPES », tendue sous le panneau ----
  if (sgn === 1) {
    // Accrochee sur le MUR du fond, pas suspendue dans le vide sous le panneau : c'est la qu'elle est sur la
    // photo, tendue entre deux points du grillage, juste au-dessus des sacs.
    const b = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.46),
      new THREE.MeshStandardMaterial({ map: banderole(K.canvasTex), roughness: 0.9, side: THREE.DoubleSide }));
    b.position.set(0, 1.92, K.ENC.Z - 0.02); b.rotation.y = Math.PI; scene.add(b);
  }
  return g;
}

// banderole blanche a lettres noires, un peu froissee
function banderole(canvasTex) {
  const PX = 200, w = Math.round(3.4 * PX), h = Math.round(0.52 * PX);
  return canvasTex(w, h, (g) => {
    g.fillStyle = '#eceae1'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {                      // plis et salissures
      g.fillStyle = `rgba(90,86,76,${rnd(0.03, 0.12)})`;
      g.fillRect(rnd(0, w), 0, rnd(2, 10), h);
    }
    g.fillStyle = '#1a1a1c';
    g.font = `bold ${Math.round(0.26 * PX)}px Impact, "Arial Black", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('QUAI DE JEMMAPES', w / 2, h * 0.52);
  }, null, false, 16);
}
// =====================================================================
//  LE LYCEE ROSE SAUMON
// =====================================================================
// Un mur immense de sept etages, juste derriere le grillage, avec des fenetres a petits carreaux. Sur toutes
// les photos c'est lui le fond : il faut qu'il BOUCHE la vue, sinon le terrain flotte dans le vide.
//
// EN RELIEF, plus en peinture. La façade dessinée sur une boîte était plate comme une affiche : à hauteur d'homme,
// contre le grillage, on voyait bien que les fenêtres n'avaient aucune profondeur. Elle est maintenant construite :
//   - un ENDUIT rose saumon (photo painted_plaster_wall pour le grain, la teinte relevée d'avant pour la couleur),
//     avec ses coulures sous chaque appui, sa bande grise sous la corniche et ses éclaboussures au pied ;
//   - des BAIES de 22 cm de profondeur : les trumeaux et les allèges sont de vrais volumes, le soleil de l'après-
//     midi (qui vient du canal) dessine l'ombre de chaque tableau sur la vitre ;
//   - des MENUISERIES blanches en relief, à petits carreaux (trois sur trois), des appuis de béton qui débordent ;
//   - des bandeaux d'étage en saillie, une corniche, des descentes d'eau ;
//   - derrière chaque vitre, une SALLE DE CLASSE : le shader lance le regard dans une pièce de 5,50 m (mur du fond,
//     murs latéraux, sol, plafond à néons, rangées de tables, tableau vert une fois sur deux, stores à moitié baissés)
//     — la parallaxe est juste quel que soit l'angle, sans un seul triangle de plus. Le verre, lui, renvoie le ciel
//     par la carte d'environnement (préréglages haute et au-delà), avec le Fresnel du rendu physique.
// Tout est cousu en six maillages (murs, bandeaux, appuis, menuiseries, vitres, descentes) : six appels de dessin
// pour les deux corps de bâtiment.
function lyceeRose(scene, K) {
  const { ENC } = K;
  const xf = -ENC.X - 3.0;                        // la façade, à 2,60 m derrière le grillage (x = -10,2 m)
  const lot = { mur: [], bandeaux: [], appuis: [], cadres: [], vitres: [], tuyaux: [] };
  const corps = [
    { xf, z0: -34, z1: 30, h: 22.5, prof: 18, cols: 26, etages: 7 },
    { xf: xf - 4, z0: 27, z1: 61, h: 19, prof: 16, cols: 14, etages: 6 },
  ];
  const sal = [];
  for (const o of corps) sal.push(facadeLycee(o, lot));

  // L'enduit : un matériau par corps (chacun sa carte de coulures), les bandeaux et la corniche plus clairs.
  corps.forEach((o, i) => {
    const enduit = matMix('enduit', 2.0, '#cb7b63', { grain: 1.0, taches: 0.16, echT: 5.0, axes: 'zy', relief: 1.3,
      salete: { tex: sal[i], o: [o.z0, o.z1 - o.z0, o.h] } });
    maillage(scene, lot.mur[i], enduit);
  });
  const clair = matMix('enduit', 2.0, '#d9c2b0', { grain: 0.8, taches: 0.08, echT: 5.0, axes: 'zy', relief: 1.0 });
  maillage(scene, lot.bandeaux, clair);
  const appui = matPhoto('beton', 2.7, { teinte: teinteVers('#b9b3a8', MOY.beton) });
  maillage(scene, lot.appuis, appui, false);
  const menuiserie = new THREE.MeshStandardMaterial({ color: 0xe8e6df, roughness: 0.48, metalness: 0 });
  maillage(scene, lot.cadres, menuiserie, false);
  const zinc = new THREE.MeshStandardMaterial({ color: 0x8b9095, roughness: 0.45, metalness: 0.6 });
  maillage(scene, lot.tuyaux, zinc, false);
  // les vitres : un maillage, chaque fenêtre porte sa salle dans ses attributs
  const gv = mergeGeometries(lot.vitres, false);
  for (const g of lot.vitres) g.dispose();
  const vitres = new THREE.Mesh(gv, matVitres());
  vitres.receiveShadow = true; scene.add(vitres);
  scene.userData.vitresLycee = vitres.material;

  // le soubassement plus clair, au pied du batiment. Même teinte moyenne que l'ancien aplat 0xb9b0a4, en béton banché
  // (photo) : c'est le fond de la caméra de diffusion.
  const XL = -ENC.X - 12;
  const soub = matPhoto('beton', 2.7, { teinte: teinteVers('#b9b0a4', MOY.beton), ao: 0.9 });
  maillage(scene, [boite(19, 2.6, 66, XL, 1.3, -2), boite(19.2, 0.12, 66.2, XL, 2.66, -2)], soub);
}

// Une façade de lycée : `xf` le nu de la façade (face à x+), de z0 à z1, h de haut, `cols` travées, `etages` niveaux
// (le rez-de-chaussée est derrière le soubassement). Remplit `lot` de géométries et rend la carte des coulures.
function facadeLycee(o, lot) {
  const { xf, z0, z1, h, prof, cols, etages } = o;
  const len = z1 - z0, baie = len / cols, hE = h / etages, zm = (z0 + z1) / 2;
  const RE = 0.22, LF = 1.45, HF = 1.8, ALL = 0.9, BASE = 2.6;
  const mur = [];
  // Le volume, en retrait de l'épaisseur des tableaux, et SANS SA FACE AVANT. Celle-ci passait derrière toute la
  // façade : trumeaux, allèges, vitres et menuiseries la recouvrent entièrement, mais elle venait en tête du maillage
  // cousu, donc dessinée la première — la carte de profondeur ne pouvait rien écarter, et chaque pixel de la façade
  // payait deux fois le shader de l'enduit (plusieurs millisecondes par image, vue levée vers le lycée, Radeon 660M).
  // Le rez-de-chaussée, qu'elle couvrait seule, reçoit sa bande pleine (cachée par le soubassement devant le premier
  // corps, visible au pied du second).
  mur.push(sansFaceAvant(boite(prof - RE, h, len, xf - RE - (prof - RE) / 2, h / 2, zm)));
  mur.push(boite(RE, BASE, len, xf - RE / 2, BASE / 2, zm));
  const fenetres = [];
  for (let k = 1; k < etages; k++) {
    const yb = k * hE + ALL;
    const yBas = k === 1 ? BASE : (k - 1) * hE + ALL + HF;
    mur.push(boite(RE, yb - yBas, len, xf - RE / 2, (yb + yBas) / 2, zm));          // allège sous la rangée
    for (let i = 0; i <= cols; i++) {                                               // trumeaux
      const za = i === 0 ? z0 : z0 + (i - 0.5) * baie + LF / 2;
      const zb = i === cols ? z1 : z0 + (i + 0.5) * baie - LF / 2;
      mur.push(boite(RE, HF, zb - za, xf - RE / 2, yb + HF / 2, (za + zb) / 2));
    }
    for (let i = 0; i < cols; i++) fenetres.push({ zc: z0 + (i + 0.5) * baie, yb, yf: k * hE });
    // bandeau d'étage, au niveau du plancher, en saillie de 5 cm
    lot.bandeaux.push(boite(0.05, 0.18, len, xf + 0.025, k * hE, zm));
  }
  const yHaut = (etages - 1) * hE + ALL + HF;
  mur.push(boite(RE, h - yHaut, len, xf - RE / 2, (h + yHaut) / 2, zm));
  // corniche et acrotère
  lot.bandeaux.push(boite(0.42, 0.4, len + 0.4, xf + 0.1, h - 0.2, zm), boite(0.3, 0.9, len, xf - 0.15, h + 0.45, zm));
  lot.mur.push(mur);

  const xv = xf - RE + 0.06;                                   // le plan des vitres
  for (const f of fenetres) {
    const { zc, yb } = f;
    // L'appui dépasse d'un centimètre le dessus de l'allège : à la même hauteur, les deux faces se battaient (rayures
    // orange et grises qui scintillent sur chaque appui, vues d'une caméra plus haute que la fenêtre).
    lot.appuis.push(boite(RE + 0.08, 0.07, LF + 0.16, xf - RE / 2 + 0.04, yb - 0.025, zc));
    // menuiserie : dormant, deux montants et deux traverses — trois carreaux sur trois
    const c = lot.cadres, xc = xv + 0.015;
    c.push(boite(0.08, HF, 0.07, xc, yb + HF / 2, zc - LF / 2 + 0.035), boite(0.08, HF, 0.07, xc, yb + HF / 2, zc + LF / 2 - 0.035));
    c.push(boite(0.08, 0.07, LF, xc, yb + HF - 0.035, zc), boite(0.08, 0.1, LF, xc, yb + 0.05, zc));
    for (const s of [-1, 1]) {
      c.push(boite(0.05, HF - 0.16, 0.036, xc, yb + HF / 2 + 0.01, zc + s * LF / 6));
      c.push(boite(0.05, 0.036, LF - 0.12, xc, yb + HF / 2 + s * HF / 6 + 0.02, zc));
    }
    // la vitre, et sa salle : (centre de la travée, plancher, plan de la vitre, hauteur d'étage) + une graine
    const g = new THREE.PlaneGeometry(LF - 0.06, HF - 0.1);
    g.rotateY(Math.PI / 2); g.translate(xv, yb + HF / 2 + 0.01, zc);
    const n = g.attributes.position.count, graine = Math.random();
    g.setAttribute('aFen', new THREE.BufferAttribute(new Float32Array(Array.from({ length: n }, () => [zc, f.yf, xv, hE]).flat()), 4));
    g.setAttribute('aGraine', new THREE.BufferAttribute(new Float32Array(n).fill(graine), 1));
    lot.vitres.push(g);
  }
  // descentes d'eau pluviale, toutes les huit travées, le long d'un trumeau
  for (let i = 4; i < cols; i += 8) lot.tuyaux.push(new THREE.CylinderGeometry(0.055, 0.055, h - BASE, 10).translate(xf + 0.09, BASE + (h - BASE) / 2, z0 + i * baie));
  return salissuresFacade(o, fenetres, { LF, BASE, hE });
}

// Les coulures d'une façade : une carte (z, y) qui ASSOMBRIT l'enduit (rgb = teinte multipliée, a = force).
// L'eau de pluie ruisselle sur chaque appui et descend par ses deux bouts : deux traînées grises sous chaque fenêtre,
// plus longues aux étages hauts ; la corniche goutte sur tout le haut du mur ; le pied est éclaboussé.
function salissuresFacade(o, fenetres, d) {
  const PX = TEL ? 5 : 10, len = o.z1 - o.z0;
  const w = Math.round(len * PX), h = Math.round(o.h * PX);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const X = (z) => (z - o.z0) * PX, Y = (y) => (o.h - y) * PX;
  g.clearRect(0, 0, w, h);
  const coulure = (x, y0, long, larg, a) => {
    const gr = g.createLinearGradient(0, y0, 0, y0 + long);
    gr.addColorStop(0, `rgba(96,86,80,${a})`); gr.addColorStop(1, 'rgba(96,86,80,0)');
    g.fillStyle = gr; g.fillRect(x - larg / 2, y0, larg, long);
  };
  for (const f of fenetres) {
    const haut = f.yb / o.h;
    for (const s of [-1, 1]) {
      coulure(X(f.zc + s * (d.LF / 2 + 0.02)), Y(f.yb), rnd(0.8, 2.4) * PX * (0.6 + haut), rnd(0.08, 0.16) * PX, rnd(0.25, 0.5));
    }
    if (Math.random() < 0.5) coulure(X(f.zc + rnd(-0.4, 0.4)), Y(f.yb), rnd(0.4, 1.2) * PX, rnd(0.3, 0.8) * PX, rnd(0.08, 0.18));
  }
  // sous la corniche : un bandeau gris, et des traînées qui en descendent
  const gc = g.createLinearGradient(0, 0, 0, 2.2 * PX);
  gc.addColorStop(0, 'rgba(80,74,70,0.55)'); gc.addColorStop(1, 'rgba(80,74,70,0)');
  g.fillStyle = gc; g.fillRect(0, 0, w, 2.2 * PX);
  for (let i = 0; i < len * 1.2; i++) coulure(rnd(0, w), rnd(0.3, 1.2) * PX, rnd(1, 4) * PX, rnd(0.05, 0.25) * PX, rnd(0.1, 0.3));
  // le pied, au-dessus du soubassement : éclaboussures et poussière
  const gp = g.createLinearGradient(0, Y(d.BASE + 1.2), 0, Y(d.BASE));
  gp.addColorStop(0, 'rgba(110,100,90,0)'); gp.addColorStop(1, 'rgba(110,100,90,0.35)');
  g.fillStyle = gp; g.fillRect(0, Y(d.BASE + 1.2), w, 1.2 * PX);
  // quelques plaques d'enduit repris, un peu plus mates et plus grises
  for (let i = 0; i < len / 6; i++) {
    g.fillStyle = `rgba(150,140,135,${rnd(0.12, 0.25)})`;
    g.fillRect(rnd(0, w), rnd(0.1, 0.9) * h, rnd(1.5, 4) * PX, rnd(1, 3) * PX);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
  return t;
}

// LA VITRE ET SA SALLE (« interior mapping »). Le regard traverse le verre et on calcule, dans une boîte de 5,50 m de
// profondeur, d'une travée de large et d'un étage de haut, la première paroi qu'il touche : c'est elle qu'on voit.
// Chaque fenêtre tire au sort sa salle (graine) : couleur des murs, tableau, porte, néons allumés ou non, store.
// La lumière intérieure baisse vers le fond, comme dans une vraie salle éclairée par ses fenêtres ; `uJemJour` la
// règle sur le temps qu'il fait (js : maj du canal).
function matVitres() {
  const u = { uJemTravee: { value: 2.45 }, uJemJour: { value: 1.0 } };
  const m = new THREE.MeshStandardMaterial({ color: 0x040506, roughness: 0.04, metalness: 0 });
  m.__jem = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uJemBruit: U_BRUIT });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aFen;\nattribute float aGraine;\nvarying vec4 vJemFen;\nvarying float vJemGraine;\nvarying vec3 vJemPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvJemFen = aFen; vJemGraine = aGraine;\nvJemPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vJemFen;\nvarying float vJemGraine;\nvarying vec3 vJemPos;\nuniform float uJemTravee;\nuniform float uJemJour;\n' + GLSL_BRUIT)
      .replace('#include <normal_fragment_maps>', `
      {
        // aucun carreau n'est tout à fait dans le plan de la façade : chacun renvoie le ciel sous un angle un peu différent
        vec2 jCase = floor( vec2( ( vJemPos.z - vJemFen.x ) / 0.483 + 1.5, ( vJemPos.y - vJemFen.y - 0.9 ) / 0.6 ) ) + vJemGraine * 37.0;
        vec3 jNw = normalize( vec3( 1.0, ( jHash( jCase ) - 0.5 ) * 0.05, ( jHash( jCase + 7.1 ) - 0.5 ) * 0.05 ) );
        normal = normalize( ( viewMatrix * vec4( jNw, 0.0 ) ).xyz );
      }`)
      .replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
      {
        // CE QUE RENVOIE LA VITRE : le ciel au-dessus, et en dessous la lisière sombre et découpée des platanes plantés
        // devant le lycée (et de la ville d'en face). Sans elle, chaque fenêtre vue d'en bas était un miroir gris uni.
        vec3 jR = reflect( normalize( vJemPos - cameraPosition ), inverseTransformDirection( normal, viewMatrix ) );
        float jEl = asin( clamp( jR.y, - 1.0, 1.0 ) );
        float jAz = atan( jR.z, max( jR.x, 1e-3 ) );
        float jLis = 0.3 + 0.32 * jFbm( vec2( jAz * 3.0 + vJemPos.z * 0.07, vJemPos.y * 0.04 + 2.0 ) ) - vJemPos.y * 0.013;
        float jArb = 1.0 - smoothstep( jLis - 0.04, jLis + 0.04, jEl );
        vec3 jCiel = radiance;
        #ifndef USE_ENVMAP
          jCiel = mix( vec3( 0.55, 0.6, 0.66 ), vec3( 0.24, 0.38, 0.6 ), clamp( jR.y, 0.0, 1.0 ) ) * uJemJour * 0.5;
        #endif
        radiance = mix( jCiel, vec3( 0.03, 0.04, 0.028 ) * uJemJour * ( 0.6 + 0.8 * jBruit( vec2( jAz, jEl ) * 40.0 ) ), jArb );
      }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec3 jO = vJemPos, jDir = normalize( vJemPos - cameraPosition );
        float jG = vJemGraine, jZc = vJemFen.x, jYf = vJemFen.y, jXv = vJemFen.z, jHe = vJemFen.w;
        float jXb = jXv - 5.5, jDemi = uJemTravee * 0.5 - 0.06, jYp = jYf + jHe - 0.32;
        float jTx = ( jXb - jO.x ) / min( jDir.x, - 1e-3 );
        float jSz = jDir.z >= 0.0 ? 1.0 : - 1.0, jSy = jDir.y >= 0.0 ? 1.0 : - 1.0;
        float jTz = ( jZc + jSz * jDemi - jO.z ) / ( jSz * max( abs( jDir.z ), 1e-4 ) );
        float jTy = ( ( jSy > 0.0 ? jYp : jYf ) - jO.y ) / ( jSy * max( abs( jDir.y ), 1e-4 ) );
        float jT = min( jTx, min( jTz, jTy ) );
        vec3 jH = jO + jDir * jT;
        vec3 jMur = mix( vec3( 0.66, 0.61, 0.52 ), vec3( 0.56, 0.62, 0.64 ), step( 0.62, fract( jG * 3.7 ) ) );
        vec3 jCol;
        if ( jT == jTx ) {
          jCol = jMur;
          if ( fract( jG * 7.31 ) > 0.45 && abs( jH.z - jZc ) < 0.82 && jH.y > jYf + 0.95 && jH.y < jYf + 2.05 ) jCol = vec3( 0.05, 0.1, 0.07 );
          else if ( fract( jG * 5.13 ) > 0.7 && abs( jH.z - jZc - 0.55 ) < 0.45 && jH.y < jYf + 2.1 ) jCol = vec3( 0.36, 0.25, 0.15 );
        } else if ( jT == jTz ) {
          jCol = jMur * 0.82;
          float jAff = step( 0.7, jHash( floor( vec2( jH.x * 1.6, jH.y * 2.3 ) ) + jG * 17.0 ) ) * step( jYf + 1.0, jH.y ) * step( jH.y, jYf + 2.2 );
          jCol = mix( jCol, vec3( 0.62, 0.38, 0.26 ) * ( 0.5 + jHash( floor( jH.xy * 3.0 ) + jG ) ), jAff );
        } else if ( jSy > 0.0 ) {
          jCol = vec3( 0.72 );
          float jNeon = step( abs( fract( ( jXv - jH.x ) / 1.8 ) - 0.5 ), 0.045 ) * step( abs( jH.z - jZc ), 0.65 );
          jCol += jNeon * step( 0.4, fract( jG * 11.7 ) ) * vec3( 5.0, 5.1, 5.4 );
        } else {
          jCol = vec3( 0.34, 0.31, 0.27 ) * ( 0.85 + 0.15 * jHash( floor( jH.xz * 2.0 ) ) );
        }
        // les rangées de tables, à 75 cm du sol
        if ( jSy < 0.0 ) {
          float jTt = ( jYf + 0.75 - jO.y ) / min( jDir.y, - 1e-4 );
          vec3 jHt = jO + jDir * jTt;
          if ( jTt < jT && jHt.x < jXv - 0.9 && jHt.x > jXb + 0.8 && fract( ( jXv - jHt.x ) / 1.4 ) < 0.45 && abs( jHt.z - jZc ) < jDemi - 0.25 ) {
            jCol = vec3( 0.58, 0.47, 0.34 ); jT = jTt; jH = jHt;
          }
        }
        float jFond = clamp( ( jXv - jH.x ) / 5.5, 0.0, 1.0 );
        vec3 jInt = jCol * uJemJour * ( 0.075 - 0.045 * jFond );
        // le store : une fenêtre sur trois l'a plus ou moins baissé ; ses lamelles sont éclairées par le dehors
        float jSt = step( fract( jG * 13.1 ), 0.26 ) * ( 0.2 + 0.7 * fract( jG * 29.7 ) );
        if ( jO.y > jYf + 0.95 + 1.7 * ( 1.0 - jSt ) ) jInt = vec3( 0.7, 0.66, 0.58 ) * uJemJour * 0.2 * ( 0.82 + 0.18 * step( 0.5, fract( jO.y * 20.0 ) ) );
        totalEmissiveRadiance += jInt;
      }`);
  };
  m.customProgramCacheKey = () => 'jem-vitres-1';
  return m;
}

// =====================================================================
//  LE MUR A GRAFFITIS
// =====================================================================
// Un mur de beton couvert de tags, au bout du terrain. Sur les photos il est entierement recouvert, avec des
// lettrages qui se chevauchent : c'est ce qui donne au lieu son air de terrain de quartier.
function murGraffitis(scene, K) {
  const { ENC } = K;
  const L = ENC.X * 2 + 0.9, H = 2.35, z = ENC.Z + 0.15;

  // Les DEUX bouts du terrain ferment le terrain, et ils ne se ressemblent pas du tout.
  //  - cote +Z, celui de la banderole : un muret couvert de tags, A L'INTERIEUR de l'enceinte, au ras du
  //    terrain, le grillage continuant au-dessus. C'est le mur ou tout le monde pose ses affaires ;
  //  - cote -Z : ce n'est PAS un muret. C'est le PIGNON AVEUGLE de l'immeuble voisin, une falaise d'enduit
  //    creme qui monte a une dizaine de metres et qui bouche tout le fond — on ne voit ni ciel ni immeuble
  //    derriere le panier. Seul son bas, sur 2,90 m, est peint en gris-bleu. Je l'avais fait en muret de
  //    2,35 m : par-dessus on voyait le ciel et un immeuble de brique, alors que sur la photo il n'y a que
  //    ce grand mur clair, la cime du platane et le grillage devant.
  // Le muret : du béton banché (photo concrete_wall_008, ses trous de banche et ses reprises), gris comme avant.
  const beton = matPhoto('beton', 2.7, { teinte: teinteVers('#6f7378', MOY.beton) });
  const vol = new THREE.Mesh(boite(L, H, 0.3, 0, H / 2, z), beton);
  vol.castShadow = true; vol.receiveShadow = true; scene.add(vol);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(L, H), matTags(L, H));
  face.position.set(0, H / 2, z - 0.16); face.rotation.y = Math.PI; face.receiveShadow = true; scene.add(face);
  pignonAveugle(scene, K);
}

// LA FACE TAGUÉE : le béton de la photo, et PAR-DESSUS la peinture des tags. La bombe ne rentre pas dans les pores
// ni dans les trous de banche : là où l'occlusion de la photo est sombre, le béton nu reste visible à travers la
// peinture. La peinture est un peu plus lisse que le béton (elle brille à peine) et en adoucit le relief. Le mur est
// plein nord : comme avant, une part de sa couleur est rendue en émissif pour qu'il garde sa teinte à l'ombre.
function matTags(L, H) {
  const T = 2.7, rx = L / T, ry = H / T;
  const arm = photo('beton_arm', false, rx, ry, '#ffc000');
  const m = new THREE.MeshStandardMaterial({
    map: photo('beton_couleur', true, rx, ry, '#8a857a'), normalMap: photo('beton_normal', false, rx, ry, '#8080ff'),
    roughnessMap: arm, aoMap: arm, aoMapIntensity: 0.7, color: teinteVers('#918e86', MOY.beton), roughness: 1, metalness: 0,
  });
  const u = { uJemTags: { value: texturesTags(L, H) }, uJemRep: { value: new THREE.Vector2(rx, ry) }, uJemAuto: { value: 0.14 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uJemBruit: U_BRUIT });
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uJemTags;\nuniform vec2 uJemRep;\nuniform float uJemAuto;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec4 jTag = texture2D( uJemTags, vMapUv / uJemRep );
        float jPore = texture2D( roughnessMap, vRoughnessMapUv ).r;
        float jCouv = jTag.a * smoothstep( 0.3, 0.72, jPore + 0.22 );
        diffuseColor.rgb = mix( diffuseColor.rgb, jTag.rgb, jCouv );`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix( roughnessFactor, 0.6, jCouv );')
      .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * ( 1.0 - 0.45 * jCouv );'))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uJemAuto;');
  };
  m.customProgramCacheKey = () => 'jem-tags-1';
  return m;
}

// LE DESSIN DES TAGS.
// Ce que montre la video : un beton GRIS CLAIR couvert de tags presque tous NOIRS — des lettrages anguleux,
// traces a la bombe d'un seul geste, qui se chevauchent et se repassent dessus. Il y a bien deux ou trois
// pieces plus grosses, mais en ocre fatigue et en blanc casse, jamais un nuancier complet.
// Les lettrages sont maintenant de VRAIS tags : les seize signatures de GraffitiSet001 (ambientCG, CC0), une
// planche de tags réels photographiés et détourés, recolorés ici à la palette du mur. Chacune est posée plusieurs
// fois, à sa taille (35 à 70 cm), inclinée, parfois repassée par une autre ; la bombe laisse un léger halo autour
// du trait et quelques COULURES sous les traits épais. Tant que la planche n'est pas chargée, le mur est nu ; si
// elle manque, on retombe sur les lettrages dessinés d'avant.
function texturesTags(L, H) {
  const PX = TEL ? 90 : 200, w = Math.round(L * PX), h = Math.round(H * PX);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const img = new Image();
  img.onload = () => { dessinerTags(cv.getContext('2d'), w, h, PX, img); tex.needsUpdate = true; };
  img.onerror = () => { console.warn('[jemmapes] planche de tags absente : lettrages dessinés'); lettragesDessines(cv.getContext('2d'), w, h, PX); tex.needsUpdate = true; };
  img.src = DOSSIER + 'tags_formes' + (TEL ? '_1k' : '') + '.png';
  return tex;
}

function dessinerTags(g, w, h, PX, img) {
  const NOIRS = ['#16171b', '#1e1f24', '#131720', '#282a31', '#1b222e'];
  const RARES = ['#8f7530', '#8d3a2a', '#b3ac9c', '#33506f'];   // ocre, brique, creme sale, bleu ardoise
  const cel = img.width / 4;                                    // la planche : 4 x 4 signatures
  const tmp = document.createElement('canvas'), tg = tmp.getContext('2d');
  tmp.width = cel; tmp.height = Math.round(cel * 0.82);
  const tampon = (i, x, y, larg, couleur, alpha, rot, epais = 0, halo = true, miroir = false) => {
    tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, tmp.width, tmp.height);
    tg.drawImage(img, (i % 4) * cel, Math.floor(i / 4) * cel + cel * 0.1, cel, tmp.height, 0, 0, tmp.width, tmp.height);
    tg.globalCompositeOperation = 'source-in'; tg.fillStyle = couleur; tg.fillRect(0, 0, tmp.width, tmp.height);
    const hh = larg * tmp.height / tmp.width;
    g.save(); g.translate(x, y); g.rotate(rot); if (miroir) g.scale(-1, 1);
    if (halo && 'filter' in g) {                             // le halo de la bombe
      g.filter = 'blur(' + Math.max(1, larg / 90).toFixed(1) + 'px)'; g.globalAlpha = alpha * 0.4;
      g.drawImage(tmp, -larg / 2, -hh / 2, larg, hh); g.filter = 'none';
    }
    g.globalAlpha = alpha;
    // un trait plus épais : le tampon reposé autour de lui-même
    const pas = epais ? [[0, 0], [epais, 0], [-epais, 0], [0, epais], [0, -epais], [epais, epais], [-epais, -epais], [epais, -epais], [-epais, epais]] : [[0, 0]];
    for (const [dx, dy] of pas) g.drawImage(tmp, -larg / 2 + dx, -hh / 2 + dy, larg, hh);
    g.restore(); g.globalAlpha = 1;
    return hh;
  };
  const coulures = (x, y, larg, couleur, n) => {
    g.strokeStyle = couleur; g.fillStyle = couleur; g.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const cx = x + rnd(-0.4, 0.4) * larg, l = rnd(0.04, 0.22) * PX, e = rnd(0.8, 2.2) * PX / 150;
      g.globalAlpha = rnd(0.5, 0.9); g.lineWidth = e;
      g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + rnd(-1, 1), y + l); g.stroke();
      g.beginPath(); g.arc(cx, y + l, e * 0.9, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  };
  g.clearRect(0, 0, w, h);
  // reprises de peinture grise par-dessus d'anciens tags (la mairie efface, les tags reviennent)
  for (let i = 0; i < 12; i++) {
    const v = Math.floor(rnd(112, 136)), x = Math.random() * w, y = rnd(0, 0.75) * h, L = rnd(0.6, 2.4) * PX, H = rnd(0.4, 1.2) * PX;
    for (let k = 0; k < 5; k++) {                              // cinq passes de rouleau, pas un rectangle net
      g.fillStyle = `rgba(${v},${v - 2},${v - 7},${rnd(0.12, 0.22)})`;
      g.fillRect(x + rnd(-0.06, 0.06) * PX, y + (k / 5) * H + rnd(-0.03, 0.03) * PX, L + rnd(-0.1, 0.1) * PX, H / 5 + 0.05 * PX);
    }
  }
  // des fantômes : d'anciens tags mal effacés, gris délavé
  for (let n = 0; n < 40; n++) tampon(Math.floor(Math.random() * 16), rnd(0, 1) * w, rnd(0.2, 0.9) * h, rnd(0.4, 0.9) * PX, '#3a3b40', rnd(0.15, 0.3), rnd(-0.1, 0.1), 0, false);
  // Le gros des tags : noirs, a hauteur d'homme, serres ; deux tiers dans la moitié basse du mur
  for (let n = 0; n < 210; n++) {
    const larg = rnd(0.38, 0.95) * PX, bas = Math.random() < 0.66;
    const x = rnd(-0.02, 1.02) * w, y = (bas ? rnd(0.55, 0.9) : rnd(0.25, 0.55)) * h;
    const hh = tampon(Math.floor(Math.random() * 16), x, y, larg, NOIRS[n % NOIRS.length], rnd(0.72, 0.97), rnd(-0.12, 0.08), Math.random() < 0.3 ? 1 : 0, true, Math.random() < 0.15);
    if (Math.random() < 0.3) coulures(x, y + hh * 0.3, larg * 0.6, NOIRS[n % NOIRS.length], Math.floor(rnd(1, 4)));
  }
  // et le haut du mur, qu'on atteint en montant sur le muret ou sur un sac : plus petits, plus clairsemés
  for (let n = 0; n < 30; n++) {
    tampon(Math.floor(Math.random() * 16), rnd(0, 1) * w, rnd(0.1, 0.3) * h, rnd(0.24, 0.48) * PX, NOIRS[n % NOIRS.length], rnd(0.6, 0.9), rnd(-0.1, 0.1), 0, true, Math.random() < 0.15);
  }
  // Trois pieces plus grosses, cernees de noir et remplies d'une couleur fatiguee. Elles montent a 1 m, pas
  // davantage : au-dela elles touchent le haut du mur et avalent tous les petits tags.
  const PIECES = [3, 4, 6, 9];                                  // les signatures en lettres rondes (« throw-ups »)
  for (let n = 0; n < 3; n++) {
    const larg = rnd(1.3, 1.7) * PX, x = rnd(0.08, 0.9) * w, y = rnd(0.5, 0.62) * h, i = PIECES[Math.floor(Math.random() * PIECES.length)], rot = rnd(-0.05, 0.05);
    tampon(i, x, y, larg, '#111216', 0.95, rot, Math.max(2, larg / 70), true);
    tampon(i, x, y, larg, RARES[n % RARES.length], 0.9, rot, 0, false);
    coulures(x, y + larg * 0.25, larg * 0.7, RARES[n % RARES.length], 3);
  }
  // Quelques signatures au marqueur, fines et claires, par-dessus tout le reste.
  for (let n = 0; n < 10; n++) tampon([1, 5, 11, 14][n % 4], rnd(0, 1) * w, rnd(0.35, 0.85) * h, rnd(0.22, 0.36) * PX, '#ddd8cb', rnd(0.45, 0.75), rnd(-0.1, 0.1), 0, false);
  // le pied encrassé : les semelles, les ballons, la terre des sacs
  const gp = g.createLinearGradient(0, h - 0.45 * PX, 0, h);
  gp.addColorStop(0, 'rgba(38,40,44,0)'); gp.addColorStop(1, 'rgba(38,40,44,0.45)');
  g.fillStyle = gp; g.fillRect(0, h - 0.45 * PX, w, 0.45 * PX);
  // traces de ballon : des disques de poussière, là où l'on tire contre le mur
  for (let i = 0; i < 14; i++) {
    const x = rnd(0.1, 0.9) * w, y = rnd(0.3, 0.8) * h, r = 0.11 * PX;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(70,64,56,0.3)'); gr.addColorStop(1, 'rgba(70,64,56,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}

// Repli si la planche de tags manque : les lettrages anguleux dessinés d'avant, sur fond transparent.
// UN LETTRAGE. Trois choses le definissent et c'est tout : une LIGNE DE BASE commune, des lettres de
// hauteurs INEGALES posees dessus, et un trait d'epaisseur constante.
function lettragesDessines(g, w, h, PX) {
  const NOIRS = ['#191a1e', '#232428', '#15181f', '#2a2c33', '#1d2531'];
  const lettrage = (x0, yBase, hMax, col, ep, alpha) => {
    g.save(); g.translate(x0, yBase); g.rotate(rnd(-0.06, 0.06));
    g.globalAlpha = alpha; g.lineCap = 'square'; g.lineJoin = 'miter'; g.miterLimit = 2.5;
    g.strokeStyle = col; g.lineWidth = ep;
    g.beginPath(); g.moveTo(0, 0);
    let x = 0;
    for (let k = 0, n = Math.floor(rnd(4, 9)); k < n; k++) {
      const lw = rnd(0.45, 0.95) * hMax, ht = rnd(0.55, 1.0) * hMax;
      g.lineTo(x + lw * 0.3, -ht); g.lineTo(x + lw * 0.3, 0); g.lineTo(x + lw, -ht * 0.15);
      x += lw + rnd(0.05, 0.2) * hMax;
    }
    g.stroke(); g.globalAlpha = 1; g.restore();
  };
  for (let n = 0; n < 60; n++) {
    const hM = rnd(0.34, 0.66) * PX;
    lettrage(rnd(-0.03, 0.94) * w, (Math.random() < 0.7 ? rnd(0.52, 0.93) : rnd(0.22, 0.5)) * h, hM, NOIRS[n % NOIRS.length], hM * rnd(0.16, 0.24), rnd(0.55, 0.95));
  }
}

// LE PIGNON AVEUGLE DU FOND -Z.
// Il est DERRIERE le grillage — sur la photo on lit la maille en losanges par-dessus l'enduit — et il deborde
// largement de chaque cote, sinon on verrait le ciel aux angles.
function pignonAveugle(scene, K) {
  const { ENC, canvasTex } = K;
  const L = ENC.X * 2 + 10, H = 13.5, z = -(ENC.Z + 0.85);
  // LE SOLEIL VIENT DE +X/+Z : ce pignon lui tourne le dos et reste a l'ombre toute la journee. En eclairage
  // seul il virait au brun sale alors que la photo montre un enduit creme lumineux. On le RELEVE avec sa propre
  // couleur en emissif (auto : 0,3) : la lumiere ambiante ne suffit pas, mais le mur garde ainsi sa couleur au
  // lieu d'etre blanchi uniformement.
  // L'ENDUIT : la couleur dessinée (crème, bas gris-bleu, le tag rond, les coulures) et, par-dessus, le grain, les
  // pores et la rugosité de la photo painted_plaster_wall — le relief se voit au soleil rasant du soir.
  const mat = new THREE.MeshStandardMaterial({
    map: murPignon(canvasTex, L, H), roughness: 1, metalness: 0,
    roughnessMap: photo('enduit_mix', false, L / 2, H / 2, '#80e080'),
    normalMap: photo('enduit_normal', false, L / 2, H / 2, '#8080ff'), normalScale: new THREE.Vector2(1.2, 1.2),
  });
  injecterMix(mat, { grain: 1.0, taches: 0.0, auto: 0.3, axes: 'xy' });
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(L, H), mat);
  mur.position.set(0, H / 2, z); mur.receiveShadow = true; scene.add(mur);
  // Une epaisseur derriere : sans elle, vu de trois quarts le pignon devient une feuille de papier. Et sur la
  // tête du mur, le chaperon de zinc qui le protège de la pluie.
  const dos = new THREE.MeshStandardMaterial({ color: 0xbdb3a2, roughness: 0.95 });
  maillage(scene, [boite(L, H, 7, 0, H / 2, z - 3.55)], dos);
  const zinc = new THREE.MeshStandardMaterial({ color: 0x8d9296, roughness: 0.5, metalness: 0.6 });
  // ANCRES DE CHAÎNAGE : les croix de fer forgé qui tiennent les planchers de l'immeuble, typiques des pignons
  // parisiens, et les deux solins de l'ancien voisin démoli.
  const fer = [boite(L + 0.1, 0.08, 0.34, 0, H + 0.04, z - 0.1)];
  for (const [x, y] of [[-7.5, 6.3], [-2.5, 6.3], [2.5, 6.3], [7.5, 6.3], [-5, 9.6], [5, 9.6]]) {
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.62, 0.05, 0.04); g.rotateZ(s * Math.PI / 4); g.translate(x, y, z + 0.03);
      fer.push(uvMonde(g));
    }
  }
  maillage(scene, fer, zinc, false);

  // FEUILLES MORTES au pied du mur. Sur la photo elles font une trainee continue le long du fond, poussees la
  // par le vent et jamais balayees ; c'est ce qui donne au terrain son air de square de quartier.
  const f = new THREE.Mesh(new THREE.PlaneGeometry(ENC.X * 2, 1.5),
    new THREE.MeshStandardMaterial({ map: feuillesMortes(canvasTex), transparent: true, roughness: 0.9, depthWrite: false }));
  f.rotation.x = -Math.PI / 2; f.position.set(0, 0.02, -ENC.Z + 0.7); f.renderOrder = 2; f.receiveShadow = true; scene.add(f);
}

// Enduit creme use, avec le bas peint en gris-bleu et un seul tag rond, efface, sur la partie grise. Le grain fin
// vient maintenant de la photo : le dessin ne garde que ce qui est plus grand que lui (taches, coulures, reprises).
function murPignon(canvasTex, L, H) {
  const PX = 42, w = Math.round(L * PX), h = Math.round(H * PX);
  const yGris = h * (1 - 2.9 / H);                      // la limite de la peinture grise, a 2,90 m du sol
  return canvasTex(w, h, (g) => {
    g.fillStyle = '#ddd1bd'; g.fillRect(0, 0, w, h);    // enduit creme
    for (let i = 0; i < 16000; i++) {                   // un reste de grain, à l'échelle du centimètre
      const v = Math.floor(rnd(190, 230));
      g.fillStyle = `rgba(${v},${v - 8},${v - 26},${rnd(0.04, 0.14)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(3, 9), rnd(3, 9));
    }
    for (let i = 0; i < 40; i++) {
      const r = rnd(70, 420), gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, Math.random() < 0.55 ? 'rgba(150,136,112,0.13)' : 'rgba(245,238,226,0.16)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); g.translate(Math.random() * w, rnd(0, yGris)); g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); g.restore();
    }
    // coulures verticales sous les rares saillies, et le long des ancres
    g.strokeStyle = 'rgba(126,114,94,0.16)'; g.lineWidth = PX * 0.12;
    for (let i = 0; i < 34; i++) {
      const x = Math.random() * w, y0 = rnd(0, yGris * 0.6);
      g.beginPath(); g.moveTo(x, y0); g.lineTo(x + rnd(-8, 8), y0 + rnd(h * 0.12, h * 0.4)); g.stroke();
    }
    g.strokeStyle = 'rgba(110,80,60,0.18)'; g.lineWidth = PX * 0.08;   // rouille sous les ancres
    for (const [x, y] of [[-7.5, 6.3], [-2.5, 6.3], [2.5, 6.3], [7.5, 6.3], [-5, 9.6], [5, 9.6]]) {
      const cx = (x + L / 2) * PX, cy = (H - y) * PX;
      g.beginPath(); g.moveTo(cx, cy + 0.2 * PX); g.lineTo(cx + rnd(-3, 3), cy + rnd(0.8, 1.8) * PX); g.stroke();
    }
    // la trace de l'immeuble voisin démoli : un toit en pente et des planchers, en enduit plus gris
    g.fillStyle = 'rgba(170,160,145,0.22)';
    g.beginPath(); g.moveTo(w * 0.08, h); g.lineTo(w * 0.08, h * 0.38); g.lineTo(w * 0.3, h * 0.22); g.lineTo(w * 0.52, h * 0.38); g.lineTo(w * 0.52, h); g.fill();

    // ---- le bas peint en gris-bleu ----
    g.fillStyle = '#8b9096'; g.fillRect(0, yGris, w, h - yGris);   // gris legerement bleute, pas ardoise
    for (let i = 0; i < 9000; i++) {
      const v = Math.floor(rnd(104, 158));
      g.fillStyle = `rgba(${v},${v + 6},${v + 13},${rnd(0.05, 0.2)})`;
      g.fillRect(Math.random() * w, yGris + Math.random() * (h - yGris), rnd(3, 8), rnd(3, 9));
    }
    for (let i = 0; i < 22; i++) {                      // reprises de peinture, un peu plus claires
      g.fillStyle = `rgba(150,160,168,${rnd(0.06, 0.2)})`;
      g.fillRect(Math.random() * w, yGris + Math.random() * (h - yGris), rnd(60, 340), rnd(40, 150));
    }
    g.fillStyle = 'rgba(52,58,64,0.35)'; g.fillRect(0, yGris - PX * 0.06, w, PX * 0.12);   // arete de la peinture
    g.fillStyle = 'rgba(40,44,48,0.30)'; g.fillRect(0, h - PX * 0.5, w, PX * 0.5);          // pied encrasse

    // UN SEUL TAG, et rond. J'avais seme des zigzags sur tout le mur : sur la photo il n'y a qu'une signature
    // ronde, sombre et deja delavee, posee bas sur la partie grise.
    const cx = w * 0.42, cy = yGris + (h - yGris) * 0.55, R = PX * 1.05;
    g.save(); g.translate(cx, cy); g.rotate(-0.06);
    g.strokeStyle = 'rgba(38,40,46,0.55)'; g.lineWidth = PX * 0.16; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(0, 0, R * 0.62, 0.4, Math.PI * 1.7); g.stroke();
    g.lineWidth = PX * 0.11;
    g.beginPath(); g.moveTo(-R * 0.45, R * 0.2); g.lineTo(-R * 0.1, -R * 0.3); g.lineTo(R * 0.2, R * 0.25);
    g.lineTo(R * 0.5, -R * 0.2); g.stroke();
    g.restore();
  }, null, false, 16);
}

// Feuilles mortes de platane : une feuille palmée, trois grands lobes et deux petits, ARRONDIS et séparés par des
// sinus peu profonds (des pointes régulières faisaient des étoiles) ; ocre, brunes, certaines recroquevillées (plus
// sombres, plus petites), avec leurs nervures. Plus denses contre le mur (haut de la texture) que vers le terrain.
// Une tuile = 3,6 m.
function feuillesMortes(canvasTex) {
  return canvasTex(1024, 432, (g, w, h) => {
    const COUL = ['#8a6a3c', '#9a7842', '#6f552f', '#a08a4a', '#5c4526', '#8c6936', '#7a5a32'];
    const feuille = (x, y, r, a, col, sombre) => {
      g.save(); g.translate(x, y); g.rotate(a); g.scale(1, rnd(0.78, 1.0)); g.fillStyle = col;
      g.beginPath();
      for (let k = 0; k <= 48; k++) {
        const t = (k / 48) * Math.PI * 2, u = t - Math.PI * 1.5;       // u = 0 : la pointe du lobe central (vers le haut)
        const lobe = 0.5 + 0.5 * Math.pow(Math.abs(Math.cos(u * 2.5)), 0.65);
        const bas = 0.72 + 0.28 * Math.cos(u);                          // les lobes du bas plus courts, l'échancrure du pétiole
        const rr = r * lobe * bas * (Math.abs(Math.cos(u / 2)) < 0.12 ? 0.55 : 1);
        g.lineTo(Math.cos(t) * rr, Math.sin(t) * rr);
      }
      g.closePath(); g.fill();
      if (sombre) { g.fillStyle = 'rgba(30,20,10,0.35)'; g.fillRect(0, -r, r, 2 * r); }   // la moitié enroulée, dans l'ombre
      g.strokeStyle = sombre ? 'rgba(40,28,14,0.5)' : 'rgba(60,42,20,0.35)'; g.lineWidth = Math.max(1, r * 0.06);
      g.beginPath(); for (const t of [-Math.PI / 2, -0.35, -2.8, 0.6, 2.55]) { g.moveTo(0, r * 0.25); g.lineTo(Math.cos(t) * r * 0.85, Math.sin(t) * r * 0.8); } g.stroke();
      g.beginPath(); g.moveTo(0, r * 0.25); g.lineTo(r * 0.1, r * 0.8); g.stroke();   // le pétiole
      g.restore();
    };
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      if (Math.random() < (y / h) * 0.8) continue;
      const sombre = Math.random() < 0.25;
      g.globalAlpha = rnd(0.75, 1);
      feuille(x, y, rnd(9, 20) * (sombre ? 0.7 : 1), Math.random() * Math.PI * 2, sombre ? '#4a3620' : COUL[i % COUL.length], sombre);
    }
    g.globalAlpha = 1;
  }, [4, 1], true, 8);
}
// =====================================================================
//  LE CANAL SAINT-MARTIN
// =====================================================================
// Le canal était une bande verte posée 1,1 m SOUS le trottoir… que le trottoir, un plan de 400 m, recouvrait : on
// ne le voyait pas du tout. Il est maintenant creusé pour de bon :
//   - deux MURS DE QUAI en pierre de taille calcaire (photo medieval_blocks_03), qui plongent dans l'eau 1,90 m sous
//     la promenade ; au ras de l'eau la pierre est mouillée, plus sombre, verdie par les algues ; des coulures
//     noires descendent de la margelle. Échelles de quai et anneaux d'amarrage en fer ;
//   - la MARGELLE de granit sur laquelle tout Paris s'assoit les jambes dans le vide (pas de garde-corps ici) ;
//   - L'EAU : vert glauque, ridée par le vent (quatre octaves de bruit qui dérivent, l'amplitude tombe avec la
//     distance pour ne pas scintiller) et surtout VIVANTE PAR SES REFLETS. Un canal de 26 m se voit presque toujours
//     de biais : on n'y voit pas le ciel, on y voit l'autre rive. Le shader lance donc le rayon réfléchi contre la
//     rive d'en face — le mur de quai (la même photo de pierre), puis la rangée de platanes (aux vrais emplacements
//     des arbres plantés), puis les façades du quai de Valmy (la même image que les façades elles-mêmes) — et ne
//     prend le ciel (la carte d'environnement) qu'au-dessus des toits. Les rides déforment ce reflet exactement
//     comme elles déforment l'autre : c'est le même calcul. Coût : quelques lectures de texture, aucun rendu de plus.
//   - en face, le QUAI DE VALMY : promenade, chaussée, et une rangée continue d'immeubles haussmanniens.
function canalSaintMartin(scene, K, Q) {
  const LONG = 400, { xq, xf, eau } = Q;
  const bas = eau - 1.6, haut = -0.3, hm = haut - bas;
  // 1. les murs de quai
  const pierre = matPierreQuai(eau);
  maillage(scene, [boite(1.2, hm, LONG, xq - 0.6, (haut + bas) / 2, 0), boite(1.2, hm, LONG, xf + 0.6, (haut + bas) / 2, 0)], pierre, false);
  // 2. les margelles de granit, 45 cm, qui débordent de 4 cm au-dessus de l'eau
  const granit = matPhoto('granit', 1.8, { teinte: teinteVers('#9a958c', MOY.granit) });
  maillage(scene, [boite(0.5, 0.3, LONG, xq - 0.21, -0.17, 0), boite(0.5, 0.3, LONG, xf + 0.21, -0.17, 0)], granit, false);
  // 3. échelles de quai et anneaux d'amarrage, en fer peint noir, rouillé
  const fer = [];
  for (const [x, s] of [[xq, 1], [xf, -1]]) {
    for (const z of s > 0 ? [-9, 17] : [-15, 11]) {
      for (const dz of [-0.22, 0.22]) fer.push(tube(0.022, [x + s * 0.13, eau - 0.5, z + dz], [x + s * 0.13, haut + 0.05, z + dz], 6));
      for (let y = eau - 0.35; y < haut; y += 0.3) fer.push(tube(0.016, [x + s * 0.13, y, z - 0.22], [x + s * 0.13, y, z + 0.22], 6));
      for (const dz of [-0.22, 0.22]) fer.push(tube(0.02, [x + s * 0.13, haut + 0.05, z + dz], [x - s * 0.1, 0.35, z + dz], 6));
    }
    for (let z = -60; z <= 60; z += 12) {
      const a = new THREE.TorusGeometry(0.09, 0.016, 6, 16); a.rotateY(Math.PI / 2); a.translate(x + s * 0.02, -0.75, z + 3); fer.push(a);
    }
  }
  maillage(scene, fer, new THREE.MeshStandardMaterial({ color: 0x2c2622, roughness: 0.62, metalness: 0.5 }), false);

  // 4. le quai de Valmy : la rangée d'immeubles (et l'image qui servira à son reflet)
  const valmy = quaiDeValmy(scene, Q);

  // 5. l'eau
  const mEau = matEau(Q, valmy);
  const ge = new THREE.PlaneGeometry(xf - xq, LONG); ge.rotateX(-Math.PI / 2); ge.translate((xq + xf) / 2, eau, 0);
  const plan = new THREE.Mesh(ge, mEau);
  plan.receiveShadow = true; scene.add(plan);

  const u = mEau.__jem, vit = scene.userData.vitresLycee && scene.userData.vitresLycee.__jem;
  return {
    // la lumière des rives suit le temps qu'il fait : soleil et ciel du moment (js/weather.js règle ces lumières)
    maj(t, env) {
      u.uJemT.value = t;
      if (env && env.sun && env.hemi) {
        const lum = (0.4 * env.sun.intensity + 1.2 * env.hemi.intensity) / (0.4 * 2.7 + 1.2 * 0.5);
        u.uJemBerge.value.w = lum;
        if (vit) vit.uJemJour.value = lum;
      }
    },
  };
}

// La pierre des quais : la photo, plus claire et plus grise que son calcaire jaune d'origine, avec la ligne d'eau.
function matPierreQuai(eau) {
  const m = matPhoto('pierre', 2.0, { teinte: teinteVers('#9c968a', MOY.pierre), relief: 1.2, ao: 1.0 });
  const u = { uJemEau: { value: eau } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uJemBruit: U_BRUIT });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', VS_POS.tete).replace('#include <project_vertex>', VS_POS.corps);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vJemPos;\nuniform float uJemEau;\n' + GLSL_BRUIT)
      .replace('#include <map_fragment>', `#include <map_fragment>
        // au ras de l'eau : la pierre mouillée par le clapot, plus sombre, verdie ; une ligne irrégulière
        float jH = vJemPos.y - uJemEau;
        float jMouille = 1.0 - smoothstep( 0.05, 0.5 + 0.3 * jBruit( vJemPos.zy * vec2( 0.8, 2.0 ) ), jH );
        diffuseColor.rgb *= mix( vec3( 1.0 ), vec3( 0.42, 0.5, 0.36 ), jMouille );
        // coulures noires sous la margelle, là où l'eau de pluie ruisselle depuis cent ans
        float jCoul = smoothstep( 0.55, 0.85, jBruit( vec2( vJemPos.z * 1.9, vJemPos.y * 0.12 ) ) ) * smoothstep( uJemEau + 0.2, - 0.3, vJemPos.y );
        diffuseColor.rgb *= 1.0 - 0.4 * jCoul;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix( roughnessFactor, 0.35, jMouille );');
  };
  m.customProgramCacheKey = () => 'jem-pierre-quai-1';
  return m;
}

// LE QUAI DE VALMY, en face : promenade plantée, chaussée (posées par solsAutour), et la rangée d'immeubles.
// Des immeubles de rapport haussmanniens, mitoyens, de 15 à 20 m à la corniche, pierre de taille crème, balcons
// filants au deuxième et au cinquième, combles mansardés en zinc avec leurs lucarnes et leurs souches de cheminée,
// commerces à auvent au rez-de-chaussée. Une seule image (panoramaValmy) porte toute la rangée : les façades la
// lisent, et le reflet de l'eau la lit aussi — la rive et son reflet sont la même chose.
function quaiDeValmy(scene, Q) {
  const Z0 = -80, LONGP = 160, HP = 26;
  // TROIS FAMILLES D'IMMEUBLES, comme sur le quai : la pierre de taille haussmannienne (la moitié), l'immeuble
  // faubourien enduit, plus bas, à persiennes et petit comble, et l'immeuble de brique 1900 aux encadrements clairs.
  // Avec un seul style, la rangée se lisait comme un unique immeuble sans fin, vue du quai comme à travers le grillage.
  const bats = [];
  let avant = -1;
  for (let z = Z0; z < Z0 + LONGP - 0.01;) {
    const reste = Z0 + LONGP - z, larg = reste < 26 ? reste : rnd(13, 22);   // le dernier va jusqu'au bout : la rangée boucle sans trou
    let style = Math.random() < 0.5 ? 0 : Math.random() < 0.65 ? 1 : 2;
    if (style === avant && style !== 0) style = 0;            // deux « exceptions » voisines se liraient comme une seule
    avant = style;
    const hc = style === 1 ? rnd(13.8, 16.5) : style === 2 ? rnd(16, 19.5) : rnd(15.5, 19.5);
    const hm = style === 1 ? rnd(1.6, 2.4) : style === 2 ? rnd(2.4, 3.2) : rnd(3.2, 4.2);
    bats.push({ za: z, zb: z + larg, hc, hm, teinte: rnd(-1, 1), style });
    z += larg;
  }
  const pano = panoramaValmy(bats, Z0, LONGP, HP);
  const lot = { faces: [], volumes: [], toits: [] };
  // en face : toute la rive, façades tournées vers le canal
  rangeeImmeubles(bats, Z0, LONGP, HP, Q.xb, 1, [[-240, 240]], lot);
  // Côté terrain, la même rangée (même image, lue à l'envers), mais seulement DERRIÈRE LE PIGNON, qui en est la tranche :
  // vu du quai ou le long de la chaussée, la rue continue au lieu de finir en désert de trottoir. Du terrain on ne la
  // voit pas : les trois premiers immeubles, bas (moins de 13,5 m, sans comble), prolongent le pignon ; les suivants,
  // plus hauts, commencent à 56 m derrière lui et restent cachés sous sa crête depuis le terrain, même des caméras
  // hautes (vérifié à 6 m et à 7 m de haut) — la photo du fond ne montre que le mur.
  // Côté +Z (derrière le mur à tags) on ne bâtit rien : le ciel y reste celui des photos.
  const bas = [{ za: -70, zb: -54, hc: 12.4, hm: 0.05, teinte: -0.4 }, { za: -54, zb: -37.5, hc: 13.1, hm: 0.05, teinte: 0.5 },
               { za: -37.5, zb: -21.2, hc: 12.8, hm: 0.05, teinte: 0 }];
  rangeeImmeubles(bas, Z0, LONGP, HP, Q.xi, -1, [[-70, -21.2]], lot);
  rangeeImmeubles(bats, Z0, LONGP, HP, Q.xi, -1, [[-240, -70]], lot);
  // Ces façades regardent le terrain, dos au soleil : à l'ombre toute l'après-midi. Dans la réalité le quai et
  // l'eau leur renvoient beaucoup de lumière ; on la rend comme au pignon, par une part émissive de leur image.
  const mf = new THREE.MeshStandardMaterial({ map: pano.tex, roughness: 0.85, metalness: 0,
    emissive: 0xffffff, emissiveMap: pano.tex, emissiveIntensity: 0.2 });
  maillage(scene, lot.faces, mf, false);
  // (les murs mitoyens et les pignons de la rangée : l'enduit crème, relevé comme les façades pour qu'aucun ne vire au noir)
  maillage(scene, lot.volumes, new THREE.MeshStandardMaterial({ color: 0xcfc4b0, roughness: 0.92, emissive: 0xcfc4b0, emissiveIntensity: 0.12 }));
  maillage(scene, lot.toits, new THREE.MeshStandardMaterial({ color: 0x7c858e, roughness: 0.55, metalness: 0.45 }));
  return { tex: pano.tex, z0: Z0, long: LONGP, haut: HP };
}

// Une rangée d'immeubles mitoyens posée le long d'un quai. `xb` : le nu des façades ; `s` : +1 si la rangée
// s'étend vers x+ (façades tournées vers x-), -1 sinon ; `plages` : les tronçons de quai [z0, z1] à bâtir (les
// immeubles sont coupés à leurs bords). L'image de la rangée couvre LONGP mètres et se répète au-delà.
function rangeeImmeubles(bats, Z0, LONGP, HP, xb, s, plages, lot) {
  const u0 = (z) => ((z - Z0) % LONGP + LONGP) % LONGP / LONGP;
  for (const [pa, pb] of plages) {
    for (let k = Math.floor((pa - Z0) / LONGP) - 1; k <= Math.ceil((pb - Z0) / LONGP); k++) {
      for (const b0 of bats) {
        const za = Math.max(b0.za + k * LONGP, pa), zb = Math.min(b0.zb + k * LONGP, pb);
        if (zb - za < 0.5) continue;
        const b = { ...b0, za, zb };
        const uA = u0(b0.za) + (za - (b0.za + k * LONGP)) / LONGP, u = (z) => uA + (z - za) / LONGP;
        // la façade, à plat, avec sa tranche de l'image
        const f = new THREE.PlaneGeometry(zb - za, b.hc + 0.04);
        f.rotateY(-s * Math.PI / 2); f.translate(xb, (b.hc - 0.04) / 2, (za + zb) / 2);
        posUV(f, (p) => [u(p.z), (p.y + 0.04) / HP]);
        lot.faces.push(f);
        // le brisis du comble, incliné, avec sa tranche d'image (zinc, lucarnes)
        const r = new THREE.BufferGeometry();
        const P = [[xb, b.hc, za], [xb, b.hc, zb], [xb + s * 1.3, b.hc + b.hm, zb], [xb + s * 1.3, b.hc + b.hm, za]];
        r.setAttribute('position', new THREE.Float32BufferAttribute(P.flat(), 3));
        r.setAttribute('uv', new THREE.Float32BufferAttribute(P.map((q) => [u(q[2]), q[1] / HP]).flat(), 2));
        r.setIndex(s > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]); r.computeVertexNormals();
        lot.faces.push(r);
        // le volume (en retrait de 5 cm : sa face ne se bat pas avec la façade), et le terrasson du toit
        lot.volumes.push(boite(11.9, b.hc, zb - za, xb + s * 6.0, b.hc / 2, (za + zb) / 2));
        lot.toits.push(boite(10.7, b.hm, zb - za - 0.02, xb + s * (1.3 + 5.35), b.hc + b.hm / 2, (za + zb) / 2));
      }
    }
  }
}

// pose les UV d'une géométrie à partir de la position de chaque sommet
function posUV(geo, f) {
  const p = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); uv.setXY(i, ...f(v)); }
  uv.needsUpdate = true;
}

// L'image de la rangée d'immeubles : z de Z0 à Z0 + LONGP (u), hauteur HP (v) ; au-dessus des toits, transparent.
function panoramaValmy(bats, Z0, LONGP, HP) {
  const PX = TEL ? 10 : 20, w = Math.round(LONGP * PX), h = Math.round(HP * PX);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const X = (z) => (z - Z0) * PX, Y = (y) => (HP - y) * PX;
  g.clearRect(0, 0, w, h);
  const AUVENTS = ['#6d1f24', '#1f4a36', '#1c2d4f', '#7a5a23', '#3a3a3e'];
  for (const b of bats) {
    const x0 = X(b.za), x1 = X(b.zb), W = x1 - x0;
    const st = b.style || 0;                   // 0 pierre de taille, 1 faubourien enduit, 2 brique (voir quaiDeValmy)
    if (st === 0) {
      // pierre de taille : crème, chaque immeuble sa nuance
      const v = 214 + b.teinte * 10;
      g.fillStyle = `rgb(${v},${v - 11},${v - 32})`; g.fillRect(x0, Y(b.hc), W, b.hc * PX);
      g.fillStyle = 'rgba(90,80,64,0.10)';
      for (let y = 0.5; y < b.hc; y += 0.5) g.fillRect(x0, Y(y), W, 1);              // assises de pierre
    } else if (st === 1) {
      // enduit au plâtre, gris clair ou ocre pâle, patiné par plaques (pas d'assises : c'est un enduit)
      const v = 200 + b.teinte * 12, ocre = b.teinte > 0.2 ? 1 : 0;
      g.fillStyle = `rgb(${v},${v - 5 - 6 * ocre},${v - 16 - 14 * ocre})`; g.fillRect(x0, Y(b.hc), W, b.hc * PX);
      for (let i = 0; i < 10; i++) {
        g.fillStyle = `rgba(${Math.random() < 0.5 ? '120,112,100' : '235,230,220'},${rnd(0.05, 0.12)})`;
        g.fillRect(x0 + rnd(0, W), Y(rnd(0, b.hc)), rnd(1, 4) * PX, rnd(1, 5) * PX);
      }
    } else {
      // brique rouge-brun, chaînages de pierre aux angles.
      // Pas de lits tracés : un trait d'un pixel tous les 7,5 cm tombait tous les 1,5 px de la toile (0,75
      // au téléphone), battait avec la trame et rayait la façade de fines lignes régulières — un bardage peint, pas un
      // mur de brique. À 40 m, une brique fait deux pixels d'écran : ce qui se lit, c'est la brique MOUCHETÉE, chaque
      // brique un peu plus claire ou plus sombre que sa voisine, et un rouge plus brun, moins vif.
      const v = 146 + b.teinte * 12;
      g.fillStyle = `rgb(${v},${Math.round(v * 0.6)},${Math.round(v * 0.47)})`; g.fillRect(x0, Y(b.hc), W, b.hc * PX);
      // (quatre tons, chacun un seul chemin rempli d'un coup : 2,5 fois plus vite qu'un fillRect par brique, mesuré)
      const BL = 0.22 * PX, BH = 0.075 * PX;                                          // une brique
      const TONS = ['rgba(70,32,22,0.13)', 'rgba(70,32,22,0.24)', 'rgba(215,160,130,0.09)', 'rgba(215,160,130,0.18)'];
      const lots = TONS.map(() => new Path2D());
      for (let r = 0, y = 0; y < b.hc; r++, y += 0.075) {
        for (let x = x0 - (r & 1) * BL / 2; x < x1; x += BL) {
          if (Math.random() > 0.4) continue;
          lots[(Math.random() * 4) | 0].rect(Math.max(x0, x), Y(y + 0.075), Math.min(x + BL, x1) - Math.max(x0, x), BH);
        }
      }
      TONS.forEach((t, i) => { g.fillStyle = t; g.fill(lots[i]); });
      g.fillStyle = '#ddd3c1';
      for (let y = 4.2; y < b.hc; y += 0.6) { g.fillRect(x0, Y(y + 0.3), 0.45 * PX, 0.28 * PX); g.fillRect(x1 - 0.45 * PX, Y(y + 0.3), 0.45 * PX, 0.28 * PX); }
    }
    g.fillStyle = 'rgba(60,52,44,0.5)'; g.fillRect(x1 - 1, Y(b.hc), 2, b.hc * PX);   // mitoyenneté
    // rez-de-chaussée : commerces, auvents, porte cochère
    const nCol = Math.max(3, Math.round((b.zb - b.za) / 2.9)), pas = W / nCol;
    for (let i = 0; i < nCol; i++) {
      const cx = x0 + (i + 0.5) * pas;
      if (i === Math.floor(nCol / 2)) {
        g.fillStyle = '#26312d'; g.fillRect(cx - 0.8 * PX, Y(3.4), 1.6 * PX, 3.4 * PX);
        g.beginPath(); g.arc(cx, Y(3.4), 0.8 * PX, Math.PI, 0); g.fill();
      } else {
        g.fillStyle = '#34363a'; g.fillRect(cx - 1.1 * PX, Y(3.2), 2.2 * PX, 3.2 * PX);
        const gr = g.createLinearGradient(0, Y(3.2), 0, Y(0));
        gr.addColorStop(0, 'rgba(175,186,194,0.45)'); gr.addColorStop(0.5, 'rgba(120,110,95,0.25)'); gr.addColorStop(1, 'rgba(80,72,62,0.2)');
        g.fillStyle = gr; g.fillRect(cx - 1.0 * PX, Y(3.0), 2.0 * PX, 2.9 * PX);
        if (Math.random() < 0.7) { g.fillStyle = AUVENTS[Math.floor(Math.random() * AUVENTS.length)]; g.fillRect(cx - 1.25 * PX, Y(3.6), 2.5 * PX, 0.5 * PX); }
      }
    }
    g.fillStyle = 'rgba(70,62,52,0.35)'; g.fillRect(x0, Y(4.0), W, 0.25 * PX);        // bandeau du premier
    // étages. Pierre de taille : fenêtres hautes à garde-corps, balcons filants au 2e et au 5e. Faubourien : étages
    // plus bas, fenêtres plus petites à persiennes, un garde-corps par fenêtre. Brique : encadrements de pierre
    // claire, un seul balcon filant, au 2e.
    const hE = st === 1 ? 2.8 : st === 2 ? 2.9 : 3.05, nEt = Math.floor((b.hc - 4.4) / hE);
    const filant = (e) => (st === 0 ? e === 1 || e === 4 : st === 2 ? e === 1 : false);
    const PERSIENNES = ['#6f7a6a', '#8a8f86', '#d9d3c4', '#5d6f7c'], pers = PERSIENNES[Math.floor(Math.random() * PERSIENNES.length)];
    for (let e = 0; e < nEt; e++) {
      const y0 = 4.3 + e * hE;
      if (filant(e)) {
        g.fillStyle = 'rgba(80,72,60,0.55)'; g.fillRect(x0, Y(y0 + 0.02), W, 0.2 * PX);
        g.fillStyle = 'rgba(25,25,28,0.8)'; g.fillRect(x0, Y(y0 + 1.1), W, 0.07 * PX);
        g.fillStyle = 'rgba(25,25,28,0.55)'; for (let x = x0; x < x1; x += 0.13 * PX) g.fillRect(x, Y(y0 + 1.1), 1.2, 0.95 * PX);
      }
      for (let i = 0; i < nCol; i++) {
        const cx = x0 + (i + 0.5) * pas;
        const fw = (st === 1 ? 0.95 : st === 2 ? 1.1 : 1.15) * PX, fh = (st === 1 ? 1.75 : st === 2 ? 2.0 : 2.2) * PX, fy = Y(y0 + 0.25) - fh;
        const cadre = st === 2 ? 0.2 : 0.1;                                  // la brique a de larges encadrements
        g.fillStyle = st === 2 ? '#ddd3c1' : '#ece6da'; g.fillRect(cx - fw / 2 - cadre * PX, fy - cadre * PX, fw + 2 * cadre * PX, fh + cadre * PX);
        if (st === 1) {                                                      // les persiennes, ouvertes contre le mur
          g.fillStyle = pers; g.fillRect(cx - fw / 2 - 0.1 * PX - fw / 2, fy, fw / 2, fh); g.fillRect(cx + fw / 2 + 0.1 * PX, fy, fw / 2, fh);
          g.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = fy; y < fy + fh; y += 0.08 * PX) { g.fillRect(cx - fw - 0.1 * PX, y, fw / 2, 1); g.fillRect(cx + fw / 2 + 0.1 * PX, y, fw / 2, 1); }
        }
        const gr = g.createLinearGradient(0, fy, 0, fy + fh);
        gr.addColorStop(0, '#8d9aa6'); gr.addColorStop(0.35, '#3e4852'); gr.addColorStop(1, '#1d232a');
        g.fillStyle = gr; g.fillRect(cx - fw / 2, fy, fw, fh);
        if (Math.random() < 0.3) { g.fillStyle = 'rgba(236,230,215,0.8)'; g.fillRect(cx - fw / 2, fy, fw * rnd(0.3, 0.5), fh); }
        g.fillStyle = '#ece6da'; g.fillRect(cx - 1, fy, 2, fh);
        if (!filant(e)) { g.fillStyle = 'rgba(25,25,28,0.75)'; g.fillRect(cx - fw / 2, Y(y0 + 1.25), fw, 0.06 * PX); for (let x = cx - fw / 2; x < cx + fw / 2; x += 0.12 * PX) g.fillRect(x, Y(y0 + 1.25), 1.2, 0.9 * PX); }
      }
    }
    // corniche (la brique : un bandeau de pierre ; le faubourien : un simple débord d'enduit)
    g.fillStyle = st === 1 ? '#d6d0c2' : '#e8e0cf'; g.fillRect(x0, Y(b.hc), W, (st === 1 ? 0.22 : 0.35) * PX);
    g.fillStyle = 'rgba(40,36,30,0.45)'; g.fillRect(x0, Y(b.hc) + (st === 1 ? 0.22 : 0.35) * PX, W, 0.12 * PX);
    // comble mansardé : brisis de zinc, lucarnes, souches de cheminée. Le faubourien a un petit toit de tuiles
    // mécaniques percé de tabatières ; les lucarnes se règlent sur la hauteur du comble (elles n'en sortent pas).
    g.fillStyle = st === 1 ? '#86604e' : '#76808a'; g.fillRect(x0, Y(b.hc + b.hm), W, b.hm * PX);
    g.fillStyle = st === 1 ? 'rgba(40,20,12,0.18)' : 'rgba(255,255,255,0.06)';
    if (st === 1) for (let y = 0.2; y < b.hm; y += 0.2) g.fillRect(x0, Y(b.hc + y), W, 1);        // rangs de tuiles
    else for (let x = x0; x < x1; x += 0.45 * PX) g.fillRect(x, Y(b.hc + b.hm), 1, b.hm * PX);      // joints du zinc
    for (let i = 0; i < nCol; i += 1) {
      if (i % 2 && nCol > 3) continue;
      const cx = x0 + (i + 0.5) * pas;
      if (st === 1) { g.fillStyle = '#39424a'; g.fillRect(cx - 0.3 * PX, Y(b.hc + b.hm * 0.55), 0.6 * PX, 0.5 * PX); continue; }
      const hl = Math.min(1.7, b.hm - 0.5);
      g.fillStyle = '#e6dfd0'; g.fillRect(cx - 0.55 * PX, Y(b.hc + 0.4 + hl), 1.1 * PX, hl * PX);
      g.fillStyle = '#2a3038'; g.fillRect(cx - 0.4 * PX, Y(b.hc + 0.2 + hl), 0.8 * PX, (hl - 0.3) * PX);
    }
    for (const t of [0.12, 0.88]) {
      g.fillStyle = '#b87a5e'; g.fillRect(x0 + t * W - 0.5 * PX, Y(b.hc + b.hm) - 0.1 * PX, 1.0 * PX, 1.3 * PX);
      g.fillStyle = '#8f5b44'; g.fillRect(x0 + t * W - 0.5 * PX, Y(b.hc + b.hm) - 0.1 * PX, 1.0 * PX, 0.12 * PX);
    }
    // un peu de crasse de ville : pied plus sombre, dessous des balcons
    const gp = g.createLinearGradient(0, Y(5), 0, Y(0));
    gp.addColorStop(0, 'rgba(40,36,30,0)'); gp.addColorStop(1, 'rgba(40,36,30,0.25)');
    g.fillStyle = gp; g.fillRect(x0, Y(5), W, 5 * PX);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { tex };
}

// L'EAU DU CANAL. Voir canalSaintMartin pour le principe des reflets.
function matEau(Q, valmy) {
  const u = {
    uJemT: { value: 0 },
    uJemBerge: { value: new THREE.Vector4(Q.xq, Q.xf, Q.eau, 1) },
    uJemArbres: { value: new THREE.Vector4(Q.xf + 2.2, Q.arbresLoin.length ? Q.arbresLoin[0] : 0, Q.pasArbres, Q.arbresLoin.length) },
    uJemFacade: { value: new THREE.Vector4(Q.xb, valmy.z0, valmy.long, valmy.haut) },
    uJemPano: { value: valmy.tex },
    uJemPierre: { value: photo('pierre_couleur', true, 1, 1, '#9c968a') },
    uJemCielH: { value: new THREE.Color('#c3cfd9') }, uJemCielZ: { value: new THREE.Color('#6f9bc8') },
    uJemFeuille: { value: new THREE.Color('#34422a') }, uJemEcorce: { value: new THREE.Color('#9a927f') },
  };
  // vert glauque : l'eau du canal est chargée, opaque, jamais bleue — mais grise plus que verte (#36463a se lisait
  // vert bouteille vif depuis le quai : l'eau du canal Saint-Martin est un vert-gris éteint)
  const m = new THREE.MeshStandardMaterial({ color: 0x3d4a3c, roughness: 0.05, metalness: 0 });
  m.__jem = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uJemBruit: U_BRUIT });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', VS_POS.tete).replace('#include <project_vertex>', VS_POS.corps);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vJemPos;
        uniform float uJemT; uniform vec4 uJemBerge, uJemArbres, uJemFacade;
        uniform sampler2D uJemPano, uJemPierre;
        uniform vec3 uJemCielH, uJemCielZ, uJemFeuille, uJemEcorce;
        ${GLSL_BRUIT}
        // LA PENTE DE LA SURFACE. Six trains de rides, chacun sa direction (autour du vent, qui suit le canal), sa
        // longueur d'onde (de 3 m à 30 cm) et la vitesse de phase d'une onde de surface (c = racine de gL / 2pi) ; un
        // bruit par-dessus casse leur régularité, et des risées lentes (des zones où le vent souffle plus) modulent le
        // tout. Des sinus plutôt qu'un bruit en grille : les rides d'un canal sont des ondes, pas des cellules.
        vec2 jPente( vec2 p, float t ) {
          const vec3 O[ 6 ] = vec3[ 6 ]( vec3( 0.3, 3.1, 0.0 ), vec3( - 0.5, 1.7, 1.3 ), vec3( 1.1, 1.13, 2.1 ),
                                          vec3( - 0.9, 0.71, 0.7 ), vec3( 0.2, 0.47, 4.2 ), vec3( 2.0, 0.29, 3.3 ) );
          vec2 g = vec2( 0.0 );
          for ( int i = 0; i < 6; i ++ ) {
            vec2 d = vec2( sin( O[ i ].x ), cos( O[ i ].x ) );
            float k = 6.2832 / O[ i ].y, c = sqrt( 9.81 / k );
            g += d * ( 0.02 * cos( k * ( dot( d, p ) - c * t ) + O[ i ].z ) );
          }
          g += jGradBruit( p * 1.9 + vec2( 0.21, - 0.13 ) * t ) * 1.9 * 0.008;
          return g * ( 0.55 + 0.9 * jBruit( p * vec2( 0.06, 0.03 ) + vec2( 0.0, t * 0.04 ) ) );
        }
        // CE QUE VOIT LE RAYON RÉFLÉCHI, sans branchement : on calcule ses trois rencontres possibles (le mur de quai,
        // la rangée de platanes, les façades), on lit les deux images une fois chacune, et on garde la plus proche.
        // Un shader sans « if » autour de ses lectures de texture se compile vite (D3D sur puce intégrée) et coûte
        // pareil pour tous les pixels.
        vec3 jReflet( vec3 P, vec3 R, vec3 ciel, float flou ) {
          float lum = uJemBerge.w;
          float loin = step( 0.0, R.x );
          float rx = loin > 0.5 ? max( R.x, 1e-3 ) : min( R.x, - 1e-3 );
          // le mur de quai : celui d'en face, ou le nôtre si le rayon revient vers nous
          vec3 Hm = P + R * ( ( mix( uJemBerge.x, uJemBerge.y, loin ) - P.x ) / rx );
          vec3 cm = texture2D( uJemPierre, vec2( Hm.z, Hm.y ) * 0.5, flou ).rgb;
          float mouille = 1.0 - smoothstep( uJemBerge.z + 0.05, uJemBerge.z + 0.6, Hm.y );
          cm *= mix( vec3( 1.0 ), vec3( 0.42, 0.5, 0.36 ), mouille ) * lum * mix( 0.6, 0.38, loin );
          cm = mix( cm, vec3( 0.3, 0.29, 0.27 ) * lum * mix( 0.6, 0.4, loin ), step( - 0.32, Hm.y ) );   // la margelle
          // les façades d'en face (l'image de la rangée) ; vers notre rive : arbres et ville, sombres
          vec3 Hf = P + R * ( ( uJemFacade.x - P.x ) / rx );
          vec2 uv = vec2( fract( ( Hf.z - uJemFacade.y ) / uJemFacade.z ), Hf.y / uJemFacade.w );   // la rangée se répète
          vec4 f = texture2D( uJemPano, uv, flou );
          float pano = step( uv.y, 1.0 ) * f.a;
          vec3 c = mix( mix( uJemFeuille * lum * 0.6, ciel, smoothstep( 8.0, 20.0, Hm.y ) ), mix( ciel, f.rgb * lum * 0.42, pano ), loin );
          // la rangée de platanes d'en face, devant les façades
          vec3 Ha = P + R * ( ( uJemArbres.x - P.x ) / rx );
          float k = clamp( floor( ( Ha.z - uJemArbres.y ) / uJemArbres.z + 0.5 ), 0.0, max( uJemArbres.w - 1.0, 0.0 ) );
          float dz = Ha.z - ( uJemArbres.y + k * uJemArbres.z );
          float fe = length( vec2( dz / 3.6, ( Ha.y - 9.5 ) / 4.8 ) ) + ( jBruit( Ha.zy * 1.2 ) - 0.5 ) * 0.5;
          float il = loin * step( 0.5, uJemArbres.w );
          float arbre = il * ( 1.0 - step( 0.95, fe ) );
          float tronc = il * step( abs( dz ), 0.28 ) * step( Ha.y, 5.8 ) * ( 1.0 - arbre );
          c = mix( c, uJemFeuille * ( 0.5 + 0.7 * jBruit( Ha.zy * 3.1 + 5.0 ) ) * lum, arbre );
          c = mix( c, uJemEcorce * lum * 0.55, tronc );
          // le mur et sa margelle passent devant tout
          return mix( c, cm, step( Hm.y, - 0.02 ) );
        }`)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness + 0.12 * smoothstep( 15.0, 90.0, length( vJemPos - cameraPosition ) );`)
      .replace('#include <normal_fragment_maps>', `
        {
          float jDist = length( vJemPos - cameraPosition );
          vec2 jG = jPente( vJemPos.xz, uJemT ) / ( 1.0 + jDist * 0.025 );
          normal = normalize( ( viewMatrix * vec4( normalize( vec3( - jG.x, 1.0, - jG.y ) ), 0.0 ) ).xyz );
        }`)
      .replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
        {
          vec3 jN = inverseTransformDirection( normal, viewMatrix );
          vec3 jR = reflect( normalize( vJemPos - cameraPosition ), jN );
          jR.y = max( jR.y, 0.01 );
          vec3 jCiel = radiance;
          #ifndef USE_ENVMAP
            jCiel = mix( uJemCielH, uJemCielZ, sqrt( jR.y ) ) * uJemBerge.w;
          #endif
          radiance = jReflet( vJemPos, jR, jCiel, 0.5 + length( vJemPos - cameraPosition ) * 0.02 );
        }`);
  };
  m.customProgramCacheKey = () => 'jem-eau-1';
  return m;
}

// =====================================================================
//  BANCS, SACS ET MATS
// =====================================================================
// Sur toutes les photos il y a du monde assis au bord du terrain, avec les sacs posés par terre. Sans ces
// petites choses-là, un playground a l'air désaffecté.
function bancsEtSacs(scene, K) {
  const { ENC, box, M } = K;
  // Des LATTES de bois grisé par les hivers, pas deux planches pleines : trois pour l'assise, deux pour le dossier,
  // avec leur jour entre elles, le fil du bois dans leur longueur et la teinte d'origine qui ne subsiste que par
  // plaques. Même teinte moyenne qu'avant (0x6b5138).
  const texBois = K.canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#6f5a44'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {                        // le fil du bois
      const y = Math.random() * h, v = Math.random() < 0.5;
      g.strokeStyle = v ? `rgba(60,44,30,${rnd(0.2, 0.5)})` : `rgba(160,140,112,${rnd(0.1, 0.3)})`; g.lineWidth = rnd(0.8, 2.5);
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * rnd(0.5, 2.5));
      g.stroke();
    }
    for (let i = 0; i < 3; i++) {                         // nœuds
      const x = rnd(40, w - 40), y = rnd(20, h - 20);
      g.fillStyle = 'rgba(55,38,24,0.6)'; g.beginPath(); g.ellipse(x, y, rnd(5, 9), rnd(3, 5), 0, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 18; i++) {                        // le grisé du bois dehors, par plaques
      g.fillStyle = `rgba(150,146,138,${rnd(0.08, 0.22)})`;
      g.fillRect(rnd(0, w), rnd(0, h), rnd(40, 200), rnd(10, 60));
    }
  }, null, false, 8);
  const bois = new THREE.MeshStandardMaterial({ map: texBois, color: 0xf2eee8, roughness: 0.82 });
  const texAssise = texBois.clone(); texAssise.center.set(0.5, 0.5); texAssise.rotation = Math.PI / 2; texAssise.needsUpdate = true;
  const assise = new THREE.MeshStandardMaterial({ map: texAssise, color: 0xf2eee8, roughness: 0.82 });
  for (const z of [-ENC.Z * 0.46, -0.6, ENC.Z * 0.36]) {
    const b = new THREE.Group();
    for (const dz of [-0.75, 0.75]) box(0.44, 0.44, 0.09, M.pole, 0, 0.22, dz, b);
    for (const x of [-0.17, 0, 0.17]) box(0.15, 0.04, 1.85, assise, x, 0.48, 0, b);
    for (const y of [0.62, 0.78]) box(0.035, 0.12, 1.85, bois, -0.21, y, 0, b);
    box(0.06, 0.4, 0.06, M.pole, -0.21, 0.66, -0.75, b); box(0.06, 0.4, 0.06, M.pole, -0.21, 0.66, 0.75, b);
    b.position.set(-ENC.X - 1.15, 0, z); b.rotation.y = Math.PI / 2; scene.add(b);
  }
  // sacs de sport poses au pied du grillage
  // Sacs poses contre LE MUR DU FOND, celui des tags : c'est la que tout le monde depose ses affaires sur les
  // photos. Ils etaient trop gros, trop satures et alignes au cordeau — neuf cubes de couleur vive espaces
  // regulierement, on ne voyait plus qu'eux. Des volumes plus petits, plus sombres et groupes par deux ou
  // trois passent pour ce qu'ils sont : des affaires posees en vrac.
  // DES SACS, PAS DES BRIQUES. Des pavés à arêtes vives se lisaient comme des parpaings posés au pied du mur. Un sac
  // de sport est un volume mou aux bords arrondis (le tissu tendu sur ce qu'il y a dedans), barré de sangles un peu
  // plus claires et coiffé de ses deux anses. Tout est cousu en un seul maillage, la couleur portée par les sommets : un
  // appel de dessin pour les douze au lieu de douze.
  const SACS = [0x1a1f26, 0x35211d, 0x1e2b22, 0x24242a, 0x3a3226, 0x2b2230];
  const geosSacs = [], col = new THREE.Color();
  const teinter = (geo, hex, k) => {                     // la couleur (linéaire) de chaque sommet
    col.setHex(hex).multiplyScalar(k);
    const n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (let j = 0; j < n; j++) { a[j * 3] = col.r; a[j * 3 + 1] = col.g; a[j * 3 + 2] = col.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return geo;
  };
  let zx = -ENC.X * 0.78;
  for (let i = 0; i < 12; i++) {
    const l = rnd(0.34, 0.5), hh = rnd(0.16, 0.24), d = rnd(0.22, 0.3), r = Math.min(hh, d) * 0.4;
    const teinte = SACS[i % SACS.length], sangle = Math.random() < 0.5 ? 0x62615d : 0x474a4f;   // à peine plus clair
    const m4 = new THREE.Matrix4().makeRotationY(rnd(-0.5, 0.5)).setPosition(zx, hh / 2 - 0.004, ENC.Z - rnd(0.42, 0.62));
    const morceau = (g) => { g.applyMatrix4(m4); geosSacs.push(g); };
    morceau(teinter(new RoundedBoxGeometry(l, hh, d, 2, r), teinte, 1));
    // la sangle, une tranche du même galbe à peine plus grosse, et les deux anses en demi-anneau sur le dessus
    for (const s of [-1, 1]) morceau(teinter(new RoundedBoxGeometry(0.028, hh * 1.03, d * 1.03, 2, r * 1.03).translate(s * l * 0.27, 0, 0), sangle, 1));
    for (const s of [-1, 1]) {
      // (sans index, comme RoundedBoxGeometry : mergeGeometries refuse de mélanger les deux)
      const anse = new THREE.TorusGeometry(0.055, 0.007, 5, 10, Math.PI).toNonIndexed().translate(0, hh / 2 - 0.01, s * 0.03);
      morceau(teinter(anse, teinte, 0.8));
    }
    zx += l + (Math.random() < 0.45 ? rnd(0.05, 0.2) : rnd(0.9, 1.9));   // groupes serres, puis un trou
    if (zx > ENC.X * 0.8) break;
  }
  maillage(scene, geosSacs, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }));
  // deux ballons qui trainent
  for (const [x, z] of [[-5.4, 8.2], [6.1, -5.8]]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10),
      new THREE.MeshStandardMaterial({ color: 0xc2551f, roughness: 0.85 }));
    b.position.set(x, 0.12, z); b.castShadow = true; scene.add(b);
  }
}

// Mât d'éclairage : un simple fût blanc à tête plate. Rien à voir avec les lames de Levallois — ici ce sont
// des projecteurs de stade ordinaires, montés haut sur des poteaux droits.
function matDroit(scene, K, x, z) {
  const { box } = K;
  const g0 = new THREE.Group();
  const blanc = new THREE.MeshStandardMaterial({ color: 0xdcdedd, roughness: 0.4, metalness: 0.45 });
  const H = 8.6;
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.13, H, 12), blanc);
  f.position.y = H / 2; f.castShadow = true; g0.add(f);
  box(0.46, 0.14, 0.46, blanc, 0, 0.07, 0, g0);
  const tete = new THREE.Group(); tete.position.y = H - 0.1;
  box(1.5, 0.12, 0.3, blanc, 0, 0, 0, tete);
  for (const dx of [-0.48, 0, 0.48]) {
    const b = new THREE.Group(); b.position.set(dx, -0.2, 0); b.rotation.x = 0.5;
    box(0.4, 0.16, 0.24, new THREE.MeshStandardMaterial({ color: 0x2c3034, roughness: 0.5 }), 0, 0, 0, b);
    box(0.33, 0.02, 0.19, new THREE.MeshStandardMaterial({
      color: 0xfff6dd, emissive: 0xfff0cc, emissiveIntensity: 0.3, roughness: 0.3 }), 0, -0.09, 0, b, false);
    tete.add(b);
  }
  g0.add(tete);
  g0.position.set(x, 0, z);
  g0.rotation.y = Math.atan2(x, z);                     // la tete regarde le centre du terrain
  scene.add(g0);
}
