// =====================================================================
//  CE QUE LA CAMÉRA DESSINE AU PARC ENTIER (lot R1 du chantier « parc complet » : ombres et performances)
// =====================================================================
// Au parc entier, en extrême, la passe principale dépassait de loin les budgets du § 3.6 de la conception (300 appels de
// dessin, 1,3 M de triangles) : 340 à 370 appels en PV05, PV09, PV18 et PV21, jusqu'à 1,6 M de triangles en PV18. La
// passe d'ombre aussi : 182 appels pour 180 en PV01, 130 pour 90 au plateau en « moyenne ». Où ils allaient : un morceau
// de zone, une fois fondu, garde UN maillage par matériau du kit (js/parc/kit.js) — cinq à quatorze appels —, et trente à
// quarante morceaux sont construits autour du joueur (90 m en extrême) ; une silhouette en coûte deux ou trois ; le décor
// du plateau, cent appels, était dessiné en entier à 150 m, et derrière la crête du coteau, qui le cache.
//
// Ce module, branché sur Monde.taches par js/parc/index.js (drapeau levé, au parc seulement), y répond en quatre temps, SANS
// RIEN CHANGER À L'IMAGE :
//
//  1. LES LOTS DE DESSIN. Les maillages des morceaux et des silhouettes qui portent un matériau ordinaire (ceux du kit :
//     MeshStandardMaterial à couleurs de sommets, sans shader maison ni transparence) sont RECOPIÉS dans un BatchedMesh par
//     matériau, pour tout le parc (la technique des arbres de js/monde_vegetation.js) : chaque maillage y est une instance,
//     que three écarte du cadre une à une, et tout le reste se dessine en UN appel (WEBGL_multi_draw). Dans la passe
//     principale, dans celle des normales de l'occlusion ambiante (même caméra) et dans la passe d'ombre qu'elles
//     déclenchent, ce sont les lots qui dessinent : les maillages d'origine sont cachés le temps du rendu, et rendus
//     visibles à la fin (scene.onAfterRender). Partout ailleurs — l'ombre cuite du sol par cellule, la carte lointaine
//     du soleil, la carte fixe des ombres de contact, la carte d'environnement, le reflet — rien ne change : les lots y
//     sont cachés et les maillages d'origine y sont, comme avant. L'ombre suit l'origine instance par instance (un
//     morceau ne porte ombre qu'à portée du joueur : js/monde_charge.js, _ombre). Coût : la géométrie de ces maillages
//     est en double — seulement celle des petits (voir GROS et PLAFOND plus bas).
//  2. L'OCCULTATION PAR LE RELIEF. Le parc a deux niveaux et un coteau : de la grille 156 (PV09), le plateau, l'esplanade,
//     la terrasse du bassin et la promenade sont cachés par le rebord du belvédère ; du plateau, la terrasse haute l'est par
//     la crête. three n'en sait rien et les dessinait. Ici, un HORIZON est calculé autour de la caméra (256 directions,
//     70 distances, sur une grille des MINIMA du sol à 2 m : le relief n'y est jamais plus haut que le vrai) ; un morceau,
//     une silhouette ou un objet du décor du plateau dont tout le dessus de la boîte passe sous cet horizon n'est pas
//     dessiné dans la passe principale (il garde son ombre). Prudent partout : l'œil est relevé de 75 cm, le relief abaissé
//     de 30 cm plus 1 % de la distance, chaque direction prend la plus basse de ses deux voisines, ce qui est à moins de
//     25 m est toujours dessiné, et l'horizon est refait dès que la caméra a bougé de 30 cm (voir BOUGE).
//  3. LE DÉCOR DU PLATEAU AU LOIN. Ce que js/court_parc.js pose sur le plateau n'a ni morceau ni silhouette : à 150 m, les
//     paniers (32 000 triangles chacun), la chaise, les poubelles, la cage, les arbustes du coin étaient dessinés comme de
//     près. Au-delà de 110 m de la caméra, les objets de moins de 6 m de rayon ne le sont plus (ils y font quelques
//     pixels dans le brouillard), ni, plus près, ceux dont le rayon fait moins de 0,3 % de la distance ; les grands
//     blocs (enrobé, murs, grillages, platanes) restent. (Vérifié du quai, du coteau et de la promenade : le plateau y
//     est derrière les arbres, l'image ne change pas.)
//  4. L'OMBRE DU DÉCOR DU PLATEAU EN UN APPEL. Fondu matériau par matériau (js/court.js, optimiserDecor), le décor du
//     plateau garde une quarantaine de maillages qui portent ombre : quarante appels dans la passe d'ombre, sur les 90 que
//     le § 3.6 accorde à la « moyenne » (mesuré au plateau : 92 à 127 selon ce qui était construit autour). Or la passe
//     d'ombre ne dessine que de la PROFONDEUR : le matériau de three y est le même pour tous (MeshDepthMaterial), seul
//     compte le côté des faces. Leurs positions sont donc recopiées, une fois le décor arrivé, dans un BatchedMesh par
//     côté (un ou deux appels en tout) qui ne paraît QUE dans la passe d'ombre de la caméra du jeu : le temps de cette
//     passe, chaque maillage d'origine qui porte ombre lui laisse la place (castShadow coupé, puis remis), instance par
//     instance — un maillage caché, ou dont js/monde_ombres.js a coupé l'ombre (préréglages bas, décor lointain), ne porte
//     rien. Restent hors de ce lot ce que la profondeur dessine autrement : découpe (alphaTest), matériau d'ombre propre,
//     déplacement, transparence, instances, squelettes, et ce qui bouge. Coût : les positions en double (2 à 3 Mo).
//
// LE LOT C6 (passe de performance) y ajoute quatre temps, toujours sans rien changer à l'image (captures avant / après
// dans le bruit d'un rendu à l'autre, sauf le 7, à moins d'un pixel) :
//  5. L'OMBRE DES MORCEAUX EN QUELQUES APPELS, comme celle du décor du plateau (4) : les petits maillages des morceaux, et
//     sur téléphone les gros des morceaux à portée d'ombre, dans des lots de positions seules.
//  6. LA PASSE DE NORMALES DE L'OCCLUSION LIMITÉE AUX ABORDS (au-delà du début du brouillard plus 20 m).
//  7. LA FERRONNERIE À DEUX NIVEAUX : détail fin de près, version simple au-delà de la distance `fin` du préréglage.
//  8. LES LOTS D'UN MÊME MATÉRIAU REGROUPÉS, quand rien ne se construit.
// Et le décor du plateau au loin (3) se juge aussi maillage par maillage (les pièces fines et lourdes, les petits
// maillages dans un grand objet).
//
// Mesures et essais (?debug=1) : window.__vue — .stats ; .lots(false) / .occultation(false) / .loin(false) /
// .ombreDecor(false) coupent une part (true la remet) pour comparer ; .horizon() redessine l'horizon tout de suite ;
// (lot C6) .ombreZones(false), .normales(false), .fin(false) de même.
import * as THREE from 'three';
import { Monde } from './monde.js';
import { reglages } from './monde_charge.js';

const COUCHE_CONTACT = 7;              // (js/ombres_contact.js : la couche des mobiles ; les lots n'y vont jamais)
// L'horizon
const NA = 256;                          // directions
const PAS_GRILLE = 2;                    // m : la grille des minima du sol
const OEIL_HAUT = 0.75;                  // m : l'œil relevé (prudence : la caméra bouge entre deux horizons)
const RELIEF_BAS = 0.3, RELIEF_PENTE = 0.01;   // m, m/m : le relief abaissé (le sol lointain est dessiné au pas de 2 m)
const PRES = 25;                         // m : en deçà, tout est dessiné
const MARGE_OBJET = 2.5;                 // m : le relief juste devant un objet (son propre pied) ne le cache pas
// m : l'horizon est refait quand la caméra a bougé d'autant. (Relecture du lot R1 : 1,5 m au départ. Rejoué sur la boucle
// vélo, caméra à 4 m derrière le cycliste, un horizon vieux de 1,5 m cachait encore 541 fois un objet que l'horizon du
// moment montrait — des silhouettes de Z19, le décor du plateau, Z04a, qui « poussaient » derrière la crête de la terrasse
// haute en arrivant au belvédère : à 4 ou 5 m d'un rebord de 10 m, 1,5 m d'avance déplace l'horizon de bien plus que les
// 75 cm de l'œil relevé. À 0,3 m, l'écart reste sous cette marge ; un horizon coûte 0,3 ms, refait une image sur trois à
// vélo lancé.)
const BOUGE = 0.3;
const PAS_DESSUS = 10;                   // m : l'écart des points testés sur le dessus d'une boîte
// Le décor du plateau au loin
const LOIN_PLATEAU = 110, PETIT = 6;     // m
// Et plus près, ce qui fait moins de 0,3 % de sa distance en rayon (une dizaine de pixels en extrême) : un objet de
// 30 cm et de 26 000 triangles posé sur le plateau en coûtait autant à 100 m qu'à 2 m
const ANGLE_MIN = 0.003;
// (lot C6) Les pièces fines et lourdes du décor du plateau (voir _releverDecor) : plus de 1 500 triangles dans moins de
// 60 cm de rayon, cachées quand leur rayon fait moins de 0,65 % de leur distance
const FIN_TRIANGLES = 1500, FIN_RAYON = 0.6, ANGLE_FIN = 0.0065;
// (relecture du lot C6) ... et FINES pour de bon : leur surface fait moins de FIN_PLEIN fois celle de leur sphère (le
// cercle, 0,17 : un fer de 2 cm roulé sur 46 cm). Le ballon (25 000 triangles, 0,34) et la platine rouge qui tient le
// cercle au panneau (5 856 triangles, 0,44) sont PLEINS : cachés à 25-32 m, où ils font encore six à huit pixels, ils
// disparaissaient à vue. La platine suit la règle des petits maillages (ANGLE_MIN, celle des petits objets du décor),
// le ballon celle des objets entiers, comme avant le lot.
const FIN_PLEIN = 0.25;
// Les lots : un lot neuf réserve deux fois la place de son premier maillage (SOMMETS_MIN au moins), le suivant du même
// matériau deux fois celle du précédent, mais jamais plus de PLAFOND sommets (256 instances chacun). (La première version
// doublait sans plafond et réservait quatre fois le premier maillage : pour 61 Mo de géométrie dans les morceaux, les
// lots en réservaient 145 à 220, presque tout vide — au-delà des 250 Mo de géométrie résidente du § 3.6. Plafonnés,
// un matériau très employé prend quelques lots de plus, un appel chacun, et le vide d'un lot entamé ne dépasse pas
// PLAFOND sommets ; un lot vidé par les libérations est rendu à la carte graphique, voir retirer.)
// (Relecture du lot R1 : les lots étaient remplis à 38 % après un tour du parc à vélo — 94 Mo, et 231 Mo de géométrie
// résidente pour 250 au plus en extrême —, parce que la place des maillages retirés n'était reprise qu'une fois la fin de
// tous les tampons prise : elle l'est maintenant en premier, et un lot troué est tassé, voir _placer. Et sur téléphone, en
// « haute », la géométrie résidente passait de 59-75 Mo à 93-121 Mo pour 90 au plus (§ 3.6) : le premier lot d'un
// matériau y réserve 2 048 sommets au lieu de 8 192 (il en sert parfois 800), avec un plafond de 32 768.)
const INSTANCES_MIN = 256;
const SOMMETS_MIN_PC = 1 << 13, SOMMETS_MIN_TEL = 1 << 11, PLAFOND_PC = 1 << 17, PLAFOND_TEL = 1 << 15;
// un lot dont les trous (place des maillages retirés) font plus du quart est tassé quand un maillage n'y tient pas
const TROUS_TASSER = 0.25;
// Et les GROS maillages (plus de 16 384 sommets au lot R1) n'y vont pas : un appel chacun, rien à gagner à les regrouper
// et faisaient l'essentiel de la géométrie en double (mesuré au PV08 en extrême : 30 maillages sur 330, 60 % des sommets).
// Restent dans les lots les centaines de petits maillages qui faisaient les appels.
// (Relecture du lot R1 : 8 192 sur PC, 2 048 sur téléphone. Après un tour à vélo, en extrême, les maillages de 8 192 à
// 16 384 sommets étaient 35 sur 377 dans les lots mais 47 % de leurs sommets ; sur téléphone, en « haute » au PV05, ceux
// de plus de 2 048 sommets 29 sur 155 mais 78 % des sommets. Les appels, eux, viennent des centaines de maillages de
// moins de 512 sommets. Sur téléphone, à 2 048 : 65 à 90 Mo aux PV01, PV05, PV08, PV18 et PV21, pour un ou deux appels
// de plus qu'à 16 384.)
const GROS_PC = 1 << 13, GROS_TEL = 1 << 11;
// (lot C6) Les lots d'ombre des morceaux (5) : positions seules, 65 535 sommets par lot (index sur 16 bits : 0,75 Mo de
// positions et autant d'index), et 1 024 maillages chacun. N'y vont, à la construction, que les maillages de la taille de
// ceux des lots de dessin (GROS) : ce sont eux qui font les appels ; les gros faisaient à eux seuls les neuf dixièmes des
// sommets (mesuré sur téléphone, au plateau : 650 000 sommets, 16 Mo, avec eux) — sur téléphone, ils y viennent pour les
// seuls morceaux à portée d'ombre (voir _grosPorteurs).
const PLAFOND_OMBRE_PC = 65535, PLAFOND_OMBRE_TEL = 65535, INSTANCES_OMBRE = 1024;
// (lot C6) Le regroupement des lots d'un matériau (8) : au plus tant de sommets recopiés d'un coup (une à deux
// millisecondes ; à 65 535, mesuré sur un tour à vélo, une image en prenait trente)
const REGROUPER_MAX_PC = 20000, REGROUPER_MAX_TEL = 12000;
// (lot C6) La passe de normales de l'occlusion ambiante (6) : rien au-delà du début du brouillard plus 20 m
const NORMALES_MARGE = 20;
// (lot C6) Le détail fin de la ferronnerie (7) : hystérésis autour de la distance du préréglage (`fin`, js/monde_charge.js)
const HYST_FIN = 2;

const ONBC_NATIF = THREE.Material.prototype.onBeforeCompile;
const ONBR_NATIF = THREE.Object3D.prototype.onBeforeRender;
const CLE_NATIVE = THREE.Material.prototype.customProgramCacheKey;
const _b = new THREE.Box3(), _m = new THREE.Matrix4();

// =====================================================================
//  UN MAILLAGE DÉCOUPÉ EN TRANCHES, DANS UN BatchedMesh (pour les très grands blocs : l'île de Z19)
// =====================================================================
// Un bloc de plusieurs centaines de mètres (la rive de l'île de la Jatte, 920 m) n'est jamais écarté du cadre par three :
// sa sphère englobante voit tout. Découpé en tranches de `pas` mètres le long de `axe` (chaque triangle va dans la
// tranche de son centre), il devient un BatchedMesh dont chaque tranche est une instance : three écarte les tranches hors
// du cadre et dessine les autres en un appel. Même matériau, mêmes réglages d'ombre, même nom, mêmes drapeaux. Rend
// `mesh` tel quel si le découpage n'en vaut pas la peine ou ne se peut pas (matériau sans variante BatchedMesh).
export function enTranches(mesh, pas = 70, axe = 'z') {
  const it = enTranchesPas(mesh, pas, axe);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}
// La même chose EN TRANCHES DE TEMPS (relecture du lot R1) : un générateur qui rend la main quand `budget()` le demande,
// et dont la valeur finale est le BatchedMesh (ou `mesh`) — `const b = yield* enTranchesPas(o, 70, 'z', ctx.budget)`
// dans la construction d'une zone. D'un bloc, le feuillage de l'île (70 000 triangles, 209 000 sommets) coûtait 55 à
// 100 ms, et la construction de Z19s une tranche de 120 à 180 ms à chaque passage (un à-coup au départ du plateau et au
// retour de la terrasse haute, sur le tour à vélo). Les sommets sont renumérotés dans un tableau typé (une Map par
// tranche coûtait la moitié du temps), et la main est rendue entre deux tranches et tous les 16 384 triangles.
export function* enTranchesPas(mesh, pas = 70, axe = 'z', budget = () => false) {
  const g = mesh.geometry, m = mesh.material;
  if (!g || !g.index || !g.attributes.position || Array.isArray(m) || m.isShaderMaterial || g.groups.length) return mesh;
  const P = g.attributes.position, I = g.index.array, c = axe === 'x' ? 0 : axe === 'y' ? 1 : 2;
  const nt = I.length / 3, cle = new Int32Array(nt), compte = new Map();
  // 1. la tranche de chaque triangle (celle de son centre)
  for (let t = 0; t < nt; t++) {
    const v = (P.getComponent(I[3 * t], c) + P.getComponent(I[3 * t + 1], c) + P.getComponent(I[3 * t + 2], c)) / 3;
    const k = Math.floor(v / pas);
    cle[t] = k; compte.set(k, (compte.get(k) || 0) + 1);
    if ((t & 16383) === 16383 && budget()) yield;
  }
  if (compte.size < 2) return mesh;
  // 2. chaque tranche : ses triangles, ses sommets seulement (renumérotés), ses attributs
  const noms = Object.keys(g.attributes), geos = [], nouveau = new Int32Array(P.count).fill(-1), anciens = new Uint32Array(P.count);
  let nv = 0, ni = 0;
  for (const [k, n] of compte) {
    const idx = new Uint32Array(n * 3);
    let nb = 0, q = 0;
    for (let t = 0; t < nt; t++) {
      if (cle[t] !== k) continue;
      for (let s = 0; s < 3; s++) {
        const o = I[3 * t + s];
        let j = nouveau[o];
        if (j < 0) { j = nouveau[o] = nb; anciens[nb++] = o; }
        idx[q++] = j;
      }
    }
    const sg = new THREE.BufferGeometry();
    for (const nom of noms) {
      const a = g.attributes[nom], s = a.itemSize, src = a.array, A = new src.constructor(nb * s);
      for (let j = 0; j < nb; j++) { const o = anciens[j] * s, d = j * s; for (let e = 0; e < s; e++) A[d + e] = src[o + e]; }
      sg.setAttribute(nom, new THREE.BufferAttribute(A, s, a.normalized));
    }
    for (let j = 0; j < nb; j++) nouveau[anciens[j]] = -1;
    sg.setIndex(new THREE.BufferAttribute(idx, 1));
    sg.computeBoundingBox(); sg.computeBoundingSphere();
    geos.push(sg); nv += nb; ni += idx.length;
    if (budget()) yield;
  }
  const bm = new THREE.BatchedMesh(geos.length, nv, ni, m);
  mesh.updateMatrix();
  for (const sg of geos) {
    bm.setMatrixAt(bm.addInstance(bm.addGeometry(sg)), mesh.matrix); sg.dispose();
    if (budget()) yield;
  }
  bm.name = mesh.name; bm.castShadow = mesh.castShadow; bm.receiveShadow = mesh.receiveShadow;
  Object.assign(bm.userData, mesh.userData);
  bm.perObjectFrustumCulled = true; bm.sortObjects = true;
  bm.computeBoundingBox(); bm.computeBoundingSphere();
  return bm;
}

// =====================================================================
//  LA VUE DU PARC ENTIER
// =====================================================================
export class VueMonde {
  // `ordonnanceur` : celui de js/monde_charge.js (ses morceaux, leurs boîtes) ; `renderer` : celui du jeu (sans lui, rien
  // n'est branché : les maillages d'origine dessinent tout, comme avant).
  constructor({ scene, renderer = null, ordonnanceur = null, dx = 0 }) {
    this.scene = scene; this.r = renderer; this.ord = ordonnanceur; this.dx = dx;
    this.camera = null;
    this.actifs = { lots: !!renderer, occultation: true, loin: true, ombreDecor: !!renderer, ombreZones: !!renderer, normales: true, fin: true };
    // (lot C6) LA FERRONNERIE À DEUX NIVEAUX (7) : les maillages de détail fin et de version lointaine qui ne sont pas dans
    // les lots (les gros : une balustrade entière, une grille de 48 m), et ceux qu'une passe vient de montrer
    this._lodGros = new Map(); this._montres = [];
    this.stats = { lots: 0, instances: 0, sommets: 0, mo: 0, caches: 0, loin: 0, msHorizon: 0, msJugement: 0, horizons: 0,
      ombreDecor: { maillages: 0, lots: 0, mo: 0, ms: 0 }, ombreZones: { maillages: 0, lots: 0, mo: 0 }, normalesLoin: 0 };
    // (lot C6) L'OMBRE DES MORCEAUX (5) : par côté des faces dans la carte, une liste de BatchedMesh de positions seules ;
    // par maillage d'origine, son entrée ; et ce qui leur a cédé sa place le temps d'une passe d'ombre
    this._ombreZ = { cotes: new Map(), entrees: new Map(), cedes: [], lotsCedes: [] };
    // LES LOTS : par clé (matériau + attributs), une liste de BatchedMesh ; par maillage d'origine, son entrée
    this.lots = new Map();
    this.entrees = new Map();
    this.groupe = new THREE.Group();
    this.groupe.name = 'LOTS DE DESSIN du parc';
    // (« dynamique » au premier niveau : ni l'ombre cuite du sol, ni la carte lointaine, ni les ombres de contact, ni la
    // carte d'environnement ne le voient ; « nofuse » : l'optimiseur du décor n'y touche pas)
    Object.assign(this.groupe.userData, { dynamique: true, nofuse: true });
    scene.add(this.groupe);
    // L'HORIZON (la grille des minima est faite ici, pendant le chargement : 10 à 20 ms, une fois)
    this._grille = this._preparerGrille();
    this._D = []; for (let d = 2; d < 340; d += d < 20 ? 1 : 0.06 * d) this._D.push(d);
    this._K = this._D.length;
    this._H = new Float32Array(NA * this._K);
    this._tabJ = new Int16Array(1000);
    for (let q = 0; q < 1000; q++) { const dist = q / 2 - MARGE_OBJET; let j = -1; while (j + 1 < this._K && this._D[j + 1] <= dist) j++; this._tabJ[q] = j; }
    this._oeil = null; this._tJuge = 0;
    this._caches = new Set();            // ce que la passe principale ne dessine pas (racines)
    this._decor = null; this._decorN = -1; this._tDecor = 0;
    this._boites = new WeakMap();
    // LE RENDU : les listes de ce qui est caché le temps d'une passe principale
    this._enPasse = false; this._cachesPasse = []; this._originaux = [];
    // L'OMBRE DU DÉCOR DU PLATEAU (4) : ses lots d'ombre, faits quand le décor a fini d'arriver (le signal de l'ombre cuite
    // du sol, scene.userData.solCuit), et les maillages qui leur cèdent la place le temps d'une passe d'ombre
    this._ombreD = null; this._ombreCuit = -1; this._cedes = [];
    // (l'horizon calculé une fois ici, pendant le chargement, pour que la première image de la balade ne paie pas la
    // compilation de la boucle : une cinquantaine de millisecondes, puis moins d'une)
    if (this._grille) this._horizon({ x: -8.7 + dx, y: 1.7, z: 0 });
    this._oeil = null;
    this.maj = (dt, camera) => this._maj(dt, camera);
    if (renderer) this._brancher();
    if (typeof window !== 'undefined') window.__vue = this._outils();
  }

  // ------------------------------------------------------------------ 1. les lots de dessin
  // Le maillage `o` peut-il aller dans un lot ? (Les règles de la fusion d'un morceau, js/monde_charge.js : pas ce qui
  // bouge — `dynamique`, un onBeforeRender à soi —, pas de shader maison, pas de transparence, ni de matériau d'ombre
  // propre ; et une géométrie indexée, sans morphes ni groupes.) `nofuse` seul est, dans les zones, la protection d'avant
  // le lot A5 contre la refonte de toute la scène (js/parc/zones/z03_promenade.js, z19, coteau.js : des blocs déjà
  // fondus, immobiles) : il n'écarte rien. Et si un objet ainsi marqué bougeait (la règle 5 de la conception le permet,
  // pour un objet animé par ctx.animer), son instance suit sa matrice : dans un morceau qui a des objets animés, chaque
  // instance est comparée à son maillage d'origine à chaque passe (voir _debutPasse).
  _eligible(o, racine) {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isBatchedMesh) return false;
    if (o.customDepthMaterial || o.customDistanceMaterial || o.onBeforeRender !== ONBR_NATIF) return false;
    for (let n = o; n && n !== racine; n = n.parent) if (n.userData && n.userData.dynamique) return false;
    const m = o.material, g = o.geometry;
    if (!m || Array.isArray(m) || m.transparent || m.isShaderMaterial || m.onBeforeCompile !== ONBC_NATIF || m.customProgramCacheKey !== CLE_NATIVE) return false;
    if (!g || !g.index || !g.attributes.position || g.groups.length || g.attributes.position.count > (this.ord && this.ord.mobile ? GROS_TEL : GROS_PC)) return false;
    if (g.morphAttributes && Object.keys(g.morphAttributes).length) return false;
    for (const a of Object.values(g.attributes)) if (a.isInterleavedBufferAttribute) return false;
    return true;
  }

  // Les maillages d'un groupe (un morceau construit et fondu, ou une silhouette) recopiés dans les lots : un générateur,
  // qui rend la main quand `budget()` le demande (l'ordonnanceur l'avance en tranches, comme la fusion). `animes` : le
  // morceau a des objets animés (ctx.animer) : ses instances suivront la matrice de leur maillage d'origine.
  * ajouter(racine, budget = () => false, animes = false) {
    racine.updateMatrixWorld(true);
    if (this.actifs.lots) {
      const liste = [];
      racine.traverse((o) => { if (this._eligible(o, racine)) liste.push(o); });
      for (const o of liste) {
        if (this.entrees.has(o)) continue;
        const e = this._placer(o, racine);
        if (e) { if (animes) e.m = o.matrixWorld.clone(); this.entrees.set(o, e); }
        if (budget()) yield;
      }
    }
    // (lot C6) la ferronnerie à deux niveaux hors des lots (7)
    racine.traverse((o) => {
      if (!o.isMesh || !o.userData.lod || this.entrees.has(o) || this._lodGros.has(o)) return;
      const g = o.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      this._lodGros.set(o, { o, racine, lod: o.userData.lod, loin: false,
        c: g.boundingSphere.center.clone().applyMatrix4(o.matrixWorld), r: g.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() });
    });
    // (lot C6) puis ses porteurs d'ombre dans les lots d'ombre des morceaux (5), en tranches aussi
    if (this.r) yield* this._ajouterOmbreZ(racine, budget);
  }

  // (receiveShadow aussi : three le passe au programme par objet, un lot ne peut en avoir qu'un ; castShadow, lui, suit
  // chaque instance, voir onBeforeShadow)
  _cle(o) {
    const g = o.geometry;
    return o.material.uuid + '|' + (o.receiveShadow ? 'r|' : '|') + Object.keys(g.attributes).sort().map((k) => k + g.attributes[k].itemSize + (g.attributes[k].normalized ? 'n' : '')).join(',');
  }

  // Une place dans un lot : la fin du tampon d'un lot qui a la place, sinon la place d'un maillage retiré assez grande,
  // sinon un lot neuf, deux fois plus grand que le dernier (un lot n'est jamais agrandi : three le recopierait en entier).
  // (relecture du lot R1) Dans l'ordre : la place libérée la plus juste dans un lot de la clé (three ne réutilise pas
  // lui-même celles de deleteGeometry, voir retirer) ; la fin du tampon d'un lot ; un lot dont les trous, une fois tassés
  // (_tasser), font la place ; sinon un lot neuf. (Avant, la fin des tampons passait avant les trous : les lots se
  // remplissaient de trous à mesure que le joueur avançait, et il en fallait de nouveaux.)
  _placer(o, racine) {
    const g = o.geometry, nv = g.attributes.position.count, ni = g.index.count, cle = this._cle(o);
    let L = this.lots.get(cle);
    if (!L) this.lots.set(cle, L = { liste: [], materiau: o.material });
    let bm = null, gid = -1;
    const plein = (b) => b._instanceInfo.length >= b.maxInstanceCount && !b._availableInstanceIds.length;
    // 1. la place libérée la plus juste
    let meilleur = null, kM = -1, perte = Infinity;
    for (const b of L.liste) {
      if (plein(b)) continue;
      const libres = b._availableGeometryIds;
      for (let k = 0; k < libres.length; k++) {
        const info = b._geometryInfo[libres[k]];
        if (info.reservedVertexCount >= nv && info.reservedIndexCount >= ni && info.reservedVertexCount - nv < perte) {
          meilleur = b; kM = k; perte = info.reservedVertexCount - nv;
        }
      }
    }
    if (meilleur) {
      const libres = meilleur._availableGeometryIds;
      gid = libres[kM]; libres.splice(kM, 1); meilleur._geometryInfo[gid].active = true;
      meilleur.setGeometryAt(gid, g); bm = meilleur;
    }
    // 2. la fin du tampon d'un lot
    if (!bm) for (const b of L.liste) if (!plein(b) && b.unusedVertexCount >= nv && b.unusedIndexCount >= ni) { bm = b; gid = b.addGeometry(g); break; }
    // 3. un lot assez troué pour qu'une fois tassé, le maillage tienne à la fin de son tampon
    if (!bm) for (const b of L.liste) {
      if (plein(b)) continue;
      const [tv, ti] = trous(b);
      if (tv < TROUS_TASSER * b._maxVertexCount || b.unusedVertexCount + tv < nv || b.unusedIndexCount + ti < ni) continue;
      this._tasser(b);
      if (b.unusedVertexCount >= nv && b.unusedIndexCount >= ni) { bm = b; gid = b.addGeometry(g); break; }
    }
    if (!bm) {
      // (les index : trois par sommet, ou le rapport de ce maillage s'il est plus grand, six au plus — un index coûte
      // 4 octets, un sommet une quarantaine : mieux vaut en réserver trop que de laisser des sommets inemployés)
      const der = L.liste[L.liste.length - 1], k = Math.min(6, Math.max(3, ni / Math.max(1, nv)));
      const tel = this.ord && this.ord.mobile, PLAFOND = tel ? PLAFOND_TEL : PLAFOND_PC, SOMMETS_MIN = tel ? SOMMETS_MIN_TEL : SOMMETS_MIN_PC;
      const capV = Math.max(nv, Math.min(PLAFOND, Math.max(SOMMETS_MIN, 2 * nv, der ? 2 * der._maxVertexCount : 0)));
      const capI = Math.max(ni, Math.ceil(capV * k));
      bm = this._nouveauLot(L, o.material, o.receiveShadow, capV, capI, INSTANCES_MIN);
      gid = bm.addGeometry(g);
      this._compiler(bm);
    }
    const inst = bm.addInstance(gid);
    bm.setMatrixAt(inst, o.matrixWorld);
    bm.setVisibleAt(inst, false);
    const e = { o, bm, gid, inst, racine, vu: false, vuOmbre: false, nv, ni, m: null, lod: o.userData.lod || null, loin: false };
    // (lot C6) sa sphère dans le monde, pour la passe de normales limitée aux abords (6) et la ferronnerie (7)
    if (!g.boundingSphere) g.computeBoundingSphere();
    e.c = g.boundingSphere.center.clone().applyMatrix4(o.matrixWorld); e.r = g.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis();
    bm.userData.entrees.push(e);
    this._compter();
    return e;
  }

  // Un lot neuf de la liste `L` (un BatchedMesh du matériau `materiau`, vide, caché hors des passes de la caméra du jeu).
  // (lot C6 : tiré de _placer, pour servir aussi au regroupement, 8)
  _nouveauLot(L, materiau, recoit, capV, capI, instances) {
    const bm = new THREE.BatchedMesh(instances, capV, capI, materiau);
    bm.name = 'lot : ' + (materiau.name || materiau.type);
    bm.perObjectFrustumCulled = true; bm.sortObjects = true; bm.frustumCulled = false;
    bm.castShadow = true; bm.receiveShadow = recoit; bm.visible = false;
    bm.userData.nofuse = true;
    bm.layers.disable(COUCHE_CONTACT);
    // L'OMBRE, instance par instance : le temps de la passe d'ombre, chaque instance prend l'état de son maillage
    // d'origine (visible jusqu'à la scène, castShadow), puis retrouve celui de la passe principale
    // (lot C6 : une instance dont l'ombre passe par le lot d'ombre des morceaux, `cede`, n'en porte pas ici)
    const avant = THREE.BatchedMesh.prototype.onBeforeShadow;
    bm.onBeforeShadow = (...a) => {
      const E = bm.userData.entrees;
      for (const e of E) bm.setVisibleAt(e.inst, e.vuOmbre && e.o.castShadow && !e.cede);
      try { avant.apply(bm, a); } finally { for (const e of E) bm.setVisibleAt(e.inst, e.vu); }
    };
    bm.userData.entrees = [];
    L.liste.push(bm);
    this.groupe.add(bm);
    // les feuillages découpés (frange, fleurs) : js/fx.js les retire de la passe de normales de l'occlusion ambiante
    const reg = this.scene.userData.registreDecoupes;
    if (reg && materiau.map && materiau.alphaTest > 0) { reg.set.add(bm); reg.version++; }
    return bm;
  }

  // (lot C6) 8. LES LOTS REGROUPÉS. Un lot neuf réserve deux fois la place du précédent (voir _placer) : un matériau qui
  // se remplit au fil des morceaux finit en quatre ou cinq lots, de 2 048 à 32 768 sommets sur téléphone, chacun un appel
  // dès qu'une de ses instances est dans le cadre — trente-trois lots pour vingt matériaux au plateau, sur téléphone, où
  // la passe principale n'a droit qu'à 140 appels. Quand rien ne se construit, une fois par seconde, les lots d'un même
  // matériau sont donc recousus en UN, à la taille de ce qu'ils contiennent (plus un quart) : mêmes instances, mêmes
  // matrices, même état ; les anciens sont rendus à la carte graphique. Un matériau à la fois, et seulement s'il tient en
  // REGROUPER_MAX sommets (le temps de la recopie).
  _regrouper() {
    const tel = this.ord && this.ord.mobile, max = tel ? REGROUPER_MAX_TEL : REGROUPER_MAX_PC;
    for (const L of this.lots.values()) {
      if (L.liste.length < 2 || L.liste.some((b) => !b.userData.pret)) continue;
      let nv = 0, ni = 0, n = 0;
      for (const b of L.liste) for (const e of b.userData.entrees) { nv += e.nv; ni += e.ni; n++; }
      if (!n || nv > max) continue;
      const anciens = L.liste.slice(), recoit = anciens[0].receiveShadow;
      L.liste.length = 0;
      const bm = this._nouveauLot(L, L.materiau, recoit, Math.ceil(nv * 1.25) + 64, Math.ceil(ni * 1.25) + 192, Math.max(INSTANCES_MIN, Math.ceil(n * 1.25)));
      for (const b of anciens) for (const e of b.userData.entrees) {
        const gid = bm.addGeometry(e.o.geometry), inst = bm.addInstance(gid);
        bm.setMatrixAt(inst, e.m || e.o.matrixWorld); bm.setVisibleAt(inst, false);
        e.bm = bm; e.gid = gid; e.inst = inst;
        bm.userData.entrees.push(e);
      }
      const reg = this.scene.userData.registreDecoupes;
      for (const b of anciens) { if (reg && reg.set.delete(b)) reg.version++; this.groupe.remove(b); b.dispose(); }
      this._compiler(bm);
      this.stats.regroupements = (this.stats.regroupements || 0) + 1;
      this._compter();
      return;
    }
  }

  // Le tassement d'un lot troué (BatchedMesh.optimize de three : les maillages vivants recopiés au début du tampon, les
  // trous rendus à sa fin). Les places libérées que three garde en réserve désignent alors des adresses où vivent d'autres
  // maillages : on les rend inutilisables comme place (leur numéro reste bon pour un maillage ajouté à la fin).
  _tasser(b) {
    b.optimize();
    // (optimize de three r170 note les plages déplacées, addUpdateRange, sans demander leur envoi : sans needsUpdate, la
    // carte graphique gardait l'ancien tampon et les instances dessinaient les sommets d'un autre maillage — des
    // morceaux de murs et de massifs en l'air, vus au PV01 après un tassement forcé)
    const G = b.geometry;
    for (const a of Object.values(G.attributes)) a.needsUpdate = true;
    if (G.index) G.index.needsUpdate = true;
    for (const id of b._availableGeometryIds) { const info = b._geometryInfo[id]; info.reservedVertexCount = -1; info.reservedIndexCount = -1; }
    this.stats.tassements = (this.stats.tassements || 0) + 1;
  }

  // Les programmes d'un lot neuf (la variante « BatchedMesh » du matériau), compilés en parallèle par le pilote : le lot
  // ne dessine qu'une fois prêt ; d'ici là, ses maillages d'origine dessinent, comme avant.
  _compiler(bm) {
    const r = this.r;
    bm.userData.pret = false;
    if (!r || !r.compileAsync) { bm.userData.pret = true; return; }
    const cam = this.camera || new THREE.PerspectiveCamera();
    const cible = this._cibleCompil || (this._cibleCompil = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
    const avant = r.getRenderTarget(), vis = bm.visible;
    bm.visible = true;
    let p;
    try { r.setRenderTarget(cible); p = r.compileAsync(bm, cam, this.scene); } catch (e) { p = Promise.resolve(); } finally { r.setRenderTarget(avant); bm.visible = vis; }
    p.catch(() => {}).then(() => { bm.userData.pret = true; });
  }

  // Les maillages d'un groupe sortis des lots (un morceau libéré ou abandonné : à appeler AVANT de rendre ses géométries).
  retirer(racine) {
    // (lot C6 : et ses lots d'ombre, 5 ; et sa ferronnerie à deux niveaux, 7)
    if (this._ombreZ.entrees.size) { racine.traverse((o) => this._retirerOmbreZ(o)); this._compterOmbreZ(); }
    if (this._lodGros.size) racine.traverse((o) => { this._lodGros.delete(o); });
    if (!this.entrees.size) return;
    racine.traverse((o) => {
      const e = this.entrees.get(o);
      if (!e) return;
      this.entrees.delete(o);
      const bm = e.bm, E = bm.userData.entrees, i = E.indexOf(e);
      if (i >= 0) E.splice(i, 1);
      bm.deleteGeometry(e.gid);
      // un lot vide est rendu à la carte graphique
      if (!E.length) {
        const L = this.lots.get(this._cle(o));
        if (L) { const k = L.liste.indexOf(bm); if (k >= 0) L.liste.splice(k, 1); }
        const reg = this.scene.userData.registreDecoupes;
        if (reg && reg.set.delete(bm)) reg.version++;
        this.groupe.remove(bm); bm.dispose();
      }
    });
    this._compter();
  }

  _compter() {
    let n = 0, i = 0, v = 0, o = 0, u = 0, c = 0;
    for (const L of this.lots.values()) for (const b of L.liste) {
      n++; i += b.userData.entrees.length; v += b._nextVertexStart; c += b._maxVertexCount;
      for (const e of b.userData.entrees) u += e.nv;
      for (const a of Object.values(b.geometry.attributes)) o += a.array.byteLength;
      if (b.geometry.index) o += b.geometry.index.array.byteLength;
    }
    // (remplissage : la part des sommets réservés qui sert à un maillage vivant ; relecture du lot R1)
    Object.assign(this.stats, { lots: n, instances: i, sommets: v, mo: +(o / 1048576).toFixed(1), remplissage: c ? +(u / c).toFixed(2) : 1 });
  }

  // ------------------------------------------------------------------ le rendu
  // scene.onBeforeRender (chaîné : js/pedestrians.js s'y branche aussi), scene.onAfterRender et la passe d'ombre de three.
  _brancher() {
    const sc = this.scene, sm = this.r.shadowMap;
    const avantA = sc.onBeforeRender, avantB = sc.onAfterRender;
    sc.onBeforeRender = (renderer, scene, camera, cible) => {
      avantA.call(sc, renderer, scene, camera, cible);
      if (camera === this.camera) this._debutPasse();
    };
    sc.onAfterRender = (renderer, scene, camera) => {
      avantB.call(sc, renderer, scene, camera);
      if (this._enPasse) this._finPasse();
    };
    // (la passe d'ombre se joue AU MILIEU du rendu, après le tri de ce qui sera dessiné : ce que l'occultation a caché à
    // la caméra y retrouve sa place, pour porter son ombre ; et le décor du plateau y passe par ses lots d'ombre, 4)
    const ombre = sm.render;
    sm.render = (...a) => {
      if (!this._enPasse) return ombre.apply(sm, a);
      this._rendreCaches();
      const cede = this._ombreDecorAvant(), cedeZ = this._ombreZAvant();
      try { return ombre.apply(sm, a); } finally { if (cede) this._ombreDecorApres(); if (cedeZ) this._ombreZApres(); }
    };
  }

  // Le début d'une passe de la caméra du jeu (image, normales de l'occlusion) : on cache ce que l'occultation et le
  // lointain écartent, puis les maillages d'origine des lots, dont les instances prennent leur état.
  _debutPasse() {
    if (this._enPasse) this._finPasse();
    this._enPasse = true;
    const sc = this.scene, C = this._cachesPasse, O = this._originaux;
    // 1. l'état de chaque instance tant que rien n'est caché : visible jusqu'à la scène (pour l'ombre)
    const lots = this.actifs.lots;
    if (lots) for (const e of this.entrees.values()) {
      e.vuOmbre = e.bm.userData.pret && chaineVisible(e.o, sc);
      // (un morceau animé : l'instance suit la matrice de son maillage, que three vient de remettre à jour)
      if (e.m && e.vuOmbre && !e.m.equals(e.o.matrixWorld)) { e.m.copy(e.o.matrixWorld); e.bm.setMatrixAt(e.inst, e.m); }
    }
    // 2. l'occultation et le lointain
    for (const o of this._caches) if (o.visible && o.parent) { o.visible = false; C.push(o); }
    // (lot C6) 2 bis. la passe de normales, limitée aux abords (6)
    const DN = sc.overrideMaterial && this.actifs.normales ? this._normalesLoin(C) : Infinity, P = this.camera.position;
    // (lot C6) 2 ter. la ferronnerie à deux niveaux hors des lots (7)
    const DF = this.actifs.fin && this.ord ? (reglages(sc, this.ord.mobile).fin || Infinity) : Infinity;
    if (this._lodGros.size) this._ferronnerie(DF, C);
    // 3. les instances dans la passe principale, et les maillages d'origine cachés
    if (lots) {
      for (const e of this.entrees.values()) {
        // (lot C6) une instance de ferronnerie à deux niveaux : le détail fin de près, sa version simple — cachée d'office,
        // d'où le test de son parent — au-delà (7)
        const vu = e.lod === 'loin' ? e.bm.userData.pret && racineVisible(e.racine, sc) && chaineVisible(e.o.parent, sc) && estLoin(e, P, DF)
          : e.vuOmbre && racineVisible(e.racine, sc) && (e.lod !== 'pres' || !estLoin(e, P, DF));
        e.vu = vu && (DN === Infinity || e.c.distanceTo(P) - e.r <= DN);
        e.bm.setVisibleAt(e.inst, e.vu);
        if (e.vuOmbre) { e.o.visible = false; O.push(e.o); }
      }
      for (const L of this.lots.values()) for (const b of L.liste) {
        let vu = false;
        if (b.userData.pret) for (const e of b.userData.entrees) if (e.vu || (e.vuOmbre && e.o.castShadow)) { vu = true; break; }
        b.visible = vu;
      }
    }
  }
  // (lot C6) 6. LA PASSE DE NORMALES LIMITÉE AUX ABORDS. L'occlusion ambiante (GTAO, js/fx.js, en « haute » et au-dessus)
  // redessine la scène une seconde fois, en normales et en profondeur, pour une ombre de contact de 60 cm de rayon : à
  // 80 m, elle tient en deux ou trois pixels, dans le brouillard. Cette seconde passe coûtait autant d'appels que la
  // passe principale (140 à 220 en extrême, 0,6 à 1,7 M de triangles). Au-delà du début du brouillard plus NORMALES_MARGE,
  // les morceaux, les silhouettes, les instances des lots et le décor du plateau n'y sont plus dessinés : leurs pixels y
  // prennent la profondeur de ce qui est derrière eux (le sol lointain, le ciel), où l'occlusion est presque nulle — ce
  // que reçoit alors l'objet lointain, à la place d'une occlusion qui ne s'y voyait déjà pas. Le sol, les arbres et les
  // personnages restent dessinés partout. Rend la distance retenue ; `C` : la liste de ce qui est caché le temps de la passe.
  _normalesLoin(C) {
    const sc = this.scene, P = this.camera.position, f = sc.fog, DN = (f ? f.near : 60) + NORMALES_MARGE;
    let n = 0;
    const cacher = (o) => { if (o.visible && o.parent) { o.visible = false; C.push(o); n++; } };
    if (this.ord) for (const m of this.ord.morceaux) {
      if (m.groupe && m.cout && m.groupe.visible && m.cout.boite.distanceToPoint(P) > DN) cacher(m.groupe);
      if (m.sil && m.coutSil && m.sil.visible && m.coutSil.boite.distanceToPoint(P) > DN) cacher(m.sil);
    }
    if (this._decor) for (const e of this._decor) if (e.b.distanceToPoint(P) > DN) cacher(e.o);
    this.stats.normalesLoin = n;
    return DN;
  }
  // (lot C6) 7. LA FERRONNERIE À DEUX NIVEAUX. Les pièces de fer du kit (js/parc/kit.js : balustrades, grilles, rampes
  // d'escalier) sont faites en deux maillages : le DÉTAIL FIN (volutes, pointes de lance, anneaux, pommeaux, barreaux de
  // 16 mm tous les 12 cm), qui faisait la moitié des triangles de la passe principale au plateau et au belvédère — 50 000
  // pour une balustrade de 31 m —, et sa VERSION DE LOIN (volutes en trois traits, un barreau sur trois, plus épais :
  // la même part de noir), cachée d'office. Dans les passes de la caméra du jeu, au-delà de la distance `fin` du
  // préréglage (40 m en extrême, 34 en haute, 28 en moyenne, 26 et 22 sur téléphone : là où cinq centimètres font moins
  // d'un pixel), le détail fin est caché et la version de loin montrée. L'ombre ne change pas : le détail fin reprend sa place
  // avant la passe d'ombre (_rendreCaches), la version de loin n'en porte pas. Partout ailleurs (carte d'environnement,
  // ombres cuites, ombres de contact), le détail fin, comme avant. Ici, les maillages hors des lots ; les instances des
  // lots, à l'étape 3 de _debutPasse.
  _ferronnerie(DF, C) {
    const sc = this.scene, P = this.camera.position, M = this._montres;
    for (const x of this._lodGros.values()) {
      const o = x.o;
      if (!o.parent || !racineVisible(x.racine, sc)) continue;
      const loin = estLoin(x, P, DF);
      if (x.lod === 'pres') { if (loin && o.visible) { o.visible = false; C.push(o); } }
      else if (loin && !o.visible && chaineVisible(o.parent, sc)) { o.visible = true; M.push(o); }
    }
  }
  _rendreCaches() {
    const C = this._cachesPasse;
    for (const o of C) o.visible = true;
    C.length = 0;
  }
  _finPasse() {
    this._rendreCaches();
    const O = this._originaux;
    for (const o of O) o.visible = true;
    O.length = 0;
    // (lot C6 : la version de loin de la ferronnerie, recachée, 7)
    for (const o of this._montres) o.visible = false;
    this._montres.length = 0;
    for (const L of this.lots.values()) for (const b of L.liste) b.visible = false;
    this._enPasse = false;
  }

  // ------------------------------------------------------------------ 4. l'ombre du décor du plateau
  // Un maillage du décor peut-il passer par un lot d'ombre ? Ce que three dessine dans la carte d'ombre pour lui doit
  // être la seule profondeur de ses triangles (voir getDepthMaterial de three) : ni découpe, ni déplacement, ni plans de
  // coupe, ni matériau d'ombre propre ; pas d'instances, de squelette ni de morphes ; rien qui se déforme (dynamique, un
  // onBeforeRender à soi, les filets, des sommets réécrits en cours de partie) ; un seul matériau, visible. Ce qui est
  // seulement marqué `nofuse` (les paniers : le cercle tremble après un dunk) y va : son instance suit sa matrice, et un
  // maillage dont les sommets ont changé depuis (version de ses positions) reprend sa propre ombre.
  // `porteurs` : le décor dont js/monde_ombres.js coupe et rend l'ombre selon la distance (préréglages bas) — il y va même
  // si son ombre est coupée en ce moment.
  // (relecture du lot C6) `multi` : un maillage à PLUSIEURS matériaux y va aussi (le décor du plateau seulement), si tous
  // sont ordinaires et du même côté dans la carte, et que ses groupes en désignent chacun un : three le dessinait groupe
  // par groupe, un appel chacun — les quatre panneaux des paniers, trois appels chacun, en faisaient douze dans la passe
  // d'ombre au plateau (le téléphone, en « moyenne », était à 45 pour 40). Ses triangles y sont recopiés groupe par
  // groupe (voir indexOmbre) : la même profondeur.
  _eligibleOmbre(o, racine, porteurs = null, multi = false) {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isBatchedMesh) return false;
    if (!o.castShadow && !(porteurs && porteurs.has(o))) return false;
    if (o.customDepthMaterial || o.customDistanceMaterial || o.onBeforeRender !== ONBR_NATIF || o.userData.sansNormales) return false;
    for (let n = o; n && n !== racine.parent; n = n.parent) if (n.userData && n.userData.dynamique) return false;
    const m = o.material, g = o.geometry;
    if (Array.isArray(m)) {
      if (!multi || !m.length || !g || !g.groups.length || g.groups.some((G) => !m[G.materialIndex])) return false;
      const c = coteOmbre(m[0]);
      if (m.some((x) => !materiauOrdinaire(x) || coteOmbre(x) !== c)) return false;
    } else if (!materiauOrdinaire(m)) return false;
    const p = g && g.attributes.position;
    if (!p || p.usage === THREE.DynamicDrawUsage || (g.morphAttributes && Object.keys(g.morphAttributes).length)) return false;
    if (g.drawRange.start !== 0 || g.drawRange.count !== Infinity) return false;
    return true;
  }

  // Les lots d'ombre du décor : un BatchedMesh par côté des faces dans la carte (celui que three donnerait à leur matériau
  // de profondeur), positions et index seulement. Un générateur, avancé par _maj deux millisecondes par image (une
  // cinquantaine en tout pour 3,6 Mo, mesurées d'une traite) ; les lots d'avant servent jusqu'à ce que les neufs soient
  // prêts.
  * _faireOmbreDecor(budget = () => false) {
    const t0 = performance.now();
    let ms = 0;
    if (!this._decor) this._releverDecor();
    const om = this.scene.userData.ombresMonde, porteurs = new Set(om && om._decor ? om._decor.map((e) => e.o) : []);
    const par = new Map();
    for (const { o: r } of this._decor) {
      r.updateMatrixWorld(true);
      r.traverse((o) => {
        if (!this._eligibleOmbre(o, r, porteurs, true)) return;
        const cote = coteOmbre(Array.isArray(o.material) ? o.material[0] : o.material);   // (relecture C6 : plusieurs matériaux)
        if (!par.has(cote)) par.set(cote, []);
        par.get(cote).push(o);
      });
    }
    const sig = this._signatureOmbre();
    ms += performance.now() - t0;
    yield;
    const lots = [];
    let n = 0, octets = 0;
    for (const [cote, liste] of par) {
      // les positions (en flottants, sans entrelacement) et les index (créés s'il n'y en a pas), maillage par maillage
      const geos = [];
      for (const o of liste) {
        const t = performance.now();
        const g = o.geometry, p = g.attributes.position, nv = p.count, P = new Float32Array(nv * 3);
        for (let i = 0; i < nv; i++) { P[i * 3] = p.getX(i); P[i * 3 + 1] = p.getY(i); P[i * 3 + 2] = p.getZ(i); }
        const sg = new THREE.BufferGeometry();
        sg.setAttribute('position', new THREE.BufferAttribute(P, 3));
        sg.setIndex(new THREE.BufferAttribute(indexOmbre(o), 1));   // (relecture C6 : groupe par groupe, voir indexOmbre)
        geos.push({ sg, v: g.attributes.position.version, g });
        ms += performance.now() - t;
        if (budget()) yield;
      }
      const t = performance.now();
      let nv = 0, ni = 0;
      for (const { sg } of geos) { nv += sg.attributes.position.count; ni += sg.index.count; }
      const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      mat.shadowSide = cote;
      const bm = new THREE.BatchedMesh(liste.length, nv, ni, mat);
      bm.name = 'ombre du décor du plateau'; bm.castShadow = true; bm.receiveShadow = false; bm.visible = false;
      bm.frustumCulled = false; bm.perObjectFrustumCulled = true; bm.sortObjects = false;
      bm.userData.nofuse = true;
      bm.layers.disable(COUCHE_CONTACT);
      // (la version des positions est celle de la recopie : un maillage réécrit pendant la construction reprend son ombre)
      const entrees = liste.map((o, i) => {
        const inst = bm.addInstance(bm.addGeometry(geos[i].sg));
        bm.setMatrixAt(inst, o.matrixWorld);
        geos[i].sg.dispose();
        return { o, inst, m: o.matrixWorld.clone(), g: geos[i].g, v: geos[i].v };
      });
      bm.userData.entrees = entrees;
      lots.push(bm);
      n += liste.length; octets += nv * 12 + ni * (nv > 65535 ? 4 : 2);
      ms += performance.now() - t;
      if (budget()) yield;
    }
    // les neufs à la place des anciens
    this._jeterOmbreDecor();
    for (const bm of lots) this.groupe.add(bm);
    this._ombreD = lots;
    this._sigOmbre = sig;
    this.stats.ombreDecor = { maillages: n, lots: lots.length, mo: +(octets / 1048576).toFixed(1), ms: +ms.toFixed(1), faits: (this.stats.ombreDecor.faits || 0) + 1 };
  }
  // Le compte des maillages du décor (premier niveau de la scène, hors zones, silhouettes et ce qui bouge) et de leurs
  // sommets : il change quand un modèle arrive. Quelques centaines d'objets parcourus, toutes les cinq secondes.
  _signatureOmbre() {
    let n = 0, s = 0;
    for (const r of this.scene.children) {
      if (r === this.groupe || r.userData.dynamique || r.userData.ciel || (r.name && (r.name.startsWith('ZONE:') || r.name.startsWith('SIL:')))) continue;
      if (r === (this.scene.userData.solParc && this.scene.userData.solParc.mesh)) continue;
      if (r === (this.scene.userData.vegetation && this.scene.userData.vegetation.groupe)) continue;
      r.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position) { n++; s += o.geometry.attributes.position.count; } });
    }
    return n + ':' + s;
  }
  _jeterOmbreDecor() {
    if (!this._ombreD) return;
    for (const bm of this._ombreD) { this.groupe.remove(bm); bm.material.dispose(); bm.dispose(); }
    this._ombreD = null;
  }

  // Le temps d'une passe d'ombre de la caméra du jeu : chaque maillage du décor qui porterait ombre la cède à son
  // instance (castShadow coupé), les autres instances sont éteintes ; rend vrai s'il y a quelque chose à remettre.
  _ombreDecorAvant() {
    if (!this._ombreD || !this.actifs.ombreDecor) return false;
    const sc = this.scene, C = this._cedes;
    for (const bm of this._ombreD) {
      let un = false;
      for (const e of bm.userData.entrees) {
        // (une géométrie changée ou réécrite depuis la recopie : l'original garde son ombre)
        const o = e.o, g = o.geometry, porte = o.castShadow && materiauVisible(o.material) && g === e.g
          && g.attributes.position.version === e.v && chaineVisible(o, sc);
        bm.setVisibleAt(e.inst, porte);
        if (!porte) continue;
        // (un objet du décor déplacé depuis : son instance le suit)
        if (!e.m.equals(o.matrixWorld)) { e.m.copy(o.matrixWorld); bm.setMatrixAt(e.inst, e.m); }
        o.castShadow = false; C.push(o); un = true;
      }
      bm.visible = un;
    }
    return true;
  }
  _ombreDecorApres() {
    const C = this._cedes;
    for (const o of C) o.castShadow = true;
    C.length = 0;
    for (const bm of this._ombreD) bm.visible = false;
  }

  // ------------------------------------------------------------------ 5. l'ombre des morceaux en quelques appels (lot C6)
  // La même idée que le 4, pour les morceaux des zones. Leurs maillages vont, pour la passe principale, dans un lot par
  // MATÉRIAU (1) : chacun de ces lots coûtait un appel à la passe d'ombre dès qu'une de ses instances portait ombre à
  // portée — trente à quarante-cinq appels au plateau sur téléphone, en « haute » (§ 3.6 : 60 au plus), pour des
  // triangles qui ne sont, dans la carte, que de la profondeur. Leurs positions sont donc recopiées, à la construction
  // du morceau (en tranches, après les lots), dans une liste de BatchedMesh PAR CÔTÉ des faces (positions et index
  // seulement : un appel par lot d'ombre, trois ou quatre en tout), et, le temps de la passe d'ombre de la caméra du
  // jeu, chaque maillage qui porterait ombre — instance d'un lot de dessin, ou maillage hors des lots de la même taille —
  // cède sa place à son instance (même règle que le 4 : ce qu'il portait, il le porte encore, au texel près ; un
  // maillage caché, hors de portée d'ombre ou réécrit depuis la recopie garde son propre chemin). Restent hors de ces
  // lots ce que la profondeur dessine autrement (découpe, transparence, matériau d'ombre propre, instances :
  // _eligibleOmbre) et les gros maillages (plus de GROS sommets : un appel chacun, comme avant). Coût : les positions
  // en double (12 octets par sommet, plus les index), rendues à la libération du morceau.
  // `grands` : les gros maillages seulement (voir _grosPorteurs), au lieu des petits.
  * _ajouterOmbreZ(racine, budget = () => false, grands = false) {
    if (!this.actifs.ombreZones) return;
    const Z = this._ombreZ, liste = [], gros = this.ord && this.ord.mobile ? GROS_TEL : GROS_PC;
    // (castShadow d'ORIGINE : un morceau rebâti peut avoir été réglé par l'ordonnanceur, qui note l'original dans
    // userData.ombreKit ; voir js/monde_charge.js, _ombre)
    racine.traverse((o) => {
      if (!o.isMesh || Z.entrees.has(o) || !o.geometry || !o.geometry.attributes.position || (o.geometry.attributes.position.count > gros) !== grands) return;
      const porte = o.userData.ombreKit !== undefined ? o.userData.ombreKit : o.castShadow;
      if (!porte) return;
      const cs = o.castShadow; o.castShadow = true;
      const ok = this._eligibleOmbre(o, racine);
      o.castShadow = cs;
      if (ok) liste.push(o);
    });
    const COTE = { [THREE.FrontSide]: THREE.BackSide, [THREE.BackSide]: THREE.FrontSide, [THREE.DoubleSide]: THREE.DoubleSide };
    for (const o of liste) {
      const mt = o.material, cote = mt.shadowSide !== null && mt.shadowSide !== undefined ? mt.shadowSide : COTE[mt.side];
      const e = this._placerOmbreZ(o, cote);
      if (e) { e.gros = grands; Z.entrees.set(o, e); }
      if (budget()) yield;
    }
    this._compterOmbreZ();
  }

  // LES GROS PORTEURS, SUR TÉLÉPHONE. Les maillages de plus de GROS sommets (un mur, une grille de 48 m, une volée)
  // restaient hors des lots d'ombre : un appel chacun, une quinzaine à portée d'ombre sur téléphone, où la passe d'ombre
  // n'a droit qu'à 60 appels en « haute » (40 en moyenne). Les y mettre tous, à la construction, coûtait 16 Mo de positions
  // pour le parc construit autour du joueur ; ils n'y vont donc que pour les morceaux À PORTÉE D'OMBRE (là où ils en
  // portent une : js/monde_charge.js, _ombre), un morceau à la fois, en tranches d'une milliseconde, et en ressortent
  // quand le morceau s'éloigne (15 m d'hystérésis) — quelques mégaoctets à la fois. Sur PC, la passe d'ombre tient ses
  // budgets sans eux.
  _grosPorteurs() {
    const Z = this._ombreZ, R = reglages(this.scene, true);
    const sortir = (racine) => { racine.traverse((o) => { const e = Z.entrees.get(o); if (e && e.gros) this._retirerOmbreZ(o); }); this._compterOmbreZ(); };
    const ch = Z.chantierGros;
    if (ch) {
      // (un morceau libéré en cours de route : ce qui en était déjà recopié ressort)
      if (ch.m.groupe !== ch.racine) { sortir(ch.racine); Z.chantierGros = null; return; }
      this._finGros = performance.now() + 1;
      if (ch.it.next().done) { ch.m.grosOmbre = true; Z.chantierGros = null; }
      return;
    }
    for (const m of this.ord.morceaux) {
      if (m.grosOmbre && (!m.groupe || m.dist > R.ombre + 15)) { if (m.groupe) sortir(m.groupe); m.grosOmbre = false; }
    }
    for (const m of this.ord.morceaux) {
      if (m.grosOmbre || !m.groupe || m.etat !== 'detail' || !(m.dist < R.ombre)) continue;
      Z.chantierGros = { m, racine: m.groupe, it: this._ajouterOmbreZ(m.groupe, () => performance.now() > this._finGros, true) };
      break;
    }
  }

  // Une place pour les positions de `o` dans un lot d'ombre du côté `cote` (même ordre que _placer : la place libérée la
  // plus juste, la fin d'un tampon, un lot tassé, un lot neuf).
  _placerOmbreZ(o, cote) {
    const g = o.geometry, p = g.attributes.position, nv = p.count, I = g.index ? g.index.array : null, ni = I ? g.index.count : nv;
    if (!nv || !ni) return null;
    // les positions (flottants, sans entrelacement) et les index (créés s'il n'y en a pas)
    const P = new Float32Array(nv * 3);
    if (!p.isInterleavedBufferAttribute && !p.normalized && p.array instanceof Float32Array && p.itemSize === 3) P.set(p.array.subarray(0, nv * 3));
    else for (let i = 0; i < nv; i++) { P[i * 3] = p.getX(i); P[i * 3 + 1] = p.getY(i); P[i * 3 + 2] = p.getZ(i); }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(P, 3));
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    if (I) idx.set(I.subarray(0, ni)); else for (let i = 0; i < ni; i++) idx[i] = i;
    sg.setIndex(new THREE.BufferAttribute(idx, 1));
    const Z = this._ombreZ;
    let L = Z.cotes.get(cote);
    if (!L) Z.cotes.set(cote, L = []);
    const plein = (b) => b._instanceInfo.length >= b.maxInstanceCount && !b._availableInstanceIds.length;
    let bm = null, gid = -1;
    // 1. la place libérée la plus juste
    let meilleur = null, kM = -1, perte = Infinity;
    for (const b of L) {
      if (plein(b)) continue;
      const libres = b._availableGeometryIds;
      for (let k = 0; k < libres.length; k++) {
        const info = b._geometryInfo[libres[k]];
        if (info.reservedVertexCount >= nv && info.reservedIndexCount >= ni && info.reservedVertexCount - nv < perte) { meilleur = b; kM = k; perte = info.reservedVertexCount - nv; }
      }
    }
    if (meilleur) {
      const libres = meilleur._availableGeometryIds;
      gid = libres[kM]; libres.splice(kM, 1); meilleur._geometryInfo[gid].active = true;
      meilleur.setGeometryAt(gid, sg); bm = meilleur;
    }
    // 2. la fin du tampon d'un lot ; 3. un lot assez troué, tassé
    if (!bm) for (const b of L) if (!plein(b) && b.unusedVertexCount >= nv && b.unusedIndexCount >= ni) { bm = b; gid = b.addGeometry(sg); break; }
    if (!bm) for (const b of L) {
      if (plein(b)) continue;
      const [tv, ti] = trous(b);
      if (tv < TROUS_TASSER * b._maxVertexCount || b.unusedVertexCount + tv < nv || b.unusedIndexCount + ti < ni) continue;
      this._tasser(b);
      if (b.unusedVertexCount >= nv && b.unusedIndexCount >= ni) { bm = b; gid = b.addGeometry(sg); break; }
    }
    // 4. un lot neuf (au moins PLAFOND_OMBRE sommets : peu de lots, donc peu d'appels ; le vide d'un lot entamé ne coûte que
    // ses positions)
    if (!bm) {
      const tel = this.ord && this.ord.mobile, cap = tel ? PLAFOND_OMBRE_TEL : PLAFOND_OMBRE_PC;
      const capV = Math.max(nv, cap), capI = Math.max(ni, Math.ceil(capV * Math.min(6, Math.max(3, ni / nv))));
      const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      mat.shadowSide = cote;
      bm = new THREE.BatchedMesh(INSTANCES_OMBRE, capV, capI, mat);
      bm.name = 'ombre des morceaux'; bm.castShadow = true; bm.receiveShadow = false; bm.visible = false;
      bm.frustumCulled = false; bm.perObjectFrustumCulled = true; bm.sortObjects = false;
      bm.userData.nofuse = true; bm.userData.entrees = [];
      bm.layers.disable(COUCHE_CONTACT);
      L.push(bm);
      this.groupe.add(bm);
      gid = bm.addGeometry(sg);
    }
    sg.dispose();
    const inst = bm.addInstance(gid);
    bm.setMatrixAt(inst, o.matrixWorld);
    bm.setVisibleAt(inst, false);
    const e = { o, bm, gid, inst, m: o.matrixWorld.clone(), g, v: p.version, nv, ni };
    bm.userData.entrees.push(e);
    return e;
  }

  // Sortir de ses lots d'ombre les maillages d'un groupe (avec retirer, avant de rendre ses géométries).
  _retirerOmbreZ(o) {
    const Z = this._ombreZ, e = Z.entrees.get(o);
    if (!e) return;
    Z.entrees.delete(o);
    const bm = e.bm, E = bm.userData.entrees, i = E.indexOf(e);
    if (i >= 0) E.splice(i, 1);
    bm.deleteGeometry(e.gid);
    if (!E.length) {
      for (const L of Z.cotes.values()) { const k = L.indexOf(bm); if (k >= 0) L.splice(k, 1); }
      this.groupe.remove(bm); bm.material.dispose(); bm.dispose();
    }
  }
  _compterOmbreZ() {
    let n = 0, o = 0;
    for (const L of this._ombreZ.cotes.values()) for (const b of L) {
      n++;
      for (const a of Object.values(b.geometry.attributes)) o += a.array.byteLength;
      if (b.geometry.index) o += b.geometry.index.array.byteLength;
    }
    this.stats.ombreZones = { maillages: this._ombreZ.entrees.size, lots: n, mo: +(o / 1048576).toFixed(1) };
  }

  // Le temps d'une passe d'ombre de la caméra du jeu : chaque maillage qui porterait ombre cède sa place à son instance
  // (une instance d'un lot de dessin : `cede`, voir onBeforeShadow de _placer ; un gros maillage : castShadow coupé).
  _ombreZAvant() {
    const Z = this._ombreZ;
    if (!Z.entrees.size || !this.actifs.ombreZones) return false;
    const sc = this.scene, C = Z.cedes, LC = Z.lotsCedes;
    for (const L of Z.cotes.values()) for (const bm of L) {
      let un = false;
      for (const e of bm.userData.entrees) {
        const o = e.o, g = o.geometry, lotE = this.entrees.get(o);
        // (ce qu'il porterait : une instance de lot, d'après l'état pris au début de la passe ; un gros maillage, d'après
        // sa visibilité jusqu'à la scène — l'occultation vient de rendre ce qu'elle cachait. Une géométrie changée ou
        // réécrite depuis la recopie garde son propre chemin.)
        const porte = o.castShadow && o.material.visible && g === e.g && g.attributes.position.version === e.v
          && (lotE ? lotE.vuOmbre : chaineVisible(o, sc));
        bm.setVisibleAt(e.inst, porte);
        if (!porte) continue;
        if (!e.m.equals(o.matrixWorld)) { e.m.copy(o.matrixWorld); bm.setMatrixAt(e.inst, e.m); }
        if (lotE) { lotE.cede = true; LC.push(lotE); } else { o.castShadow = false; C.push(o); }
        un = true;
      }
      bm.visible = un;
    }
    return true;
  }
  _ombreZApres() {
    const Z = this._ombreZ;
    for (const o of Z.cedes) o.castShadow = true;
    for (const e of Z.lotsCedes) e.cede = false;
    Z.cedes.length = 0; Z.lotsCedes.length = 0;
    for (const L of Z.cotes.values()) for (const bm of L) bm.visible = false;
  }

  // ------------------------------------------------------------------ chaque image (Monde.taches)
  _maj(dt, camera) {
    if (!camera) return;
    // (filet : une passe interrompue par une exception — onAfterRender jamais appelé — ne laisse rien de caché)
    if (this._enPasse) this._finPasse();
    this.camera = camera;
    // (le décor du plateau a fini d'arriver : ses lots d'ombre, une fois — refaits si un chargement tardif le complète)
    const cuit = this.scene.userData.solCuit || 0;
    // (les boîtes du décor aussi sont reprises : un modèle arrivé après la première mesure agrandit la sienne). Puis, toutes
    // les cinq secondes, le compte de ce qui pourrait y aller : un modèle arrivé plus tard (les paniers) les fait refaire.
    // (au plus huit fois en tout : un décor qui changerait sans cesse garderait ses ombres d'origine plutôt que de coûter
    // une construction toutes les cinq secondes)
    const refaire = () => {
      this._decor = null; this._boites = new WeakMap(); this._refaits = (this._refaits || 0) + 1;
      this._chantierOmbre = this._faireOmbreDecor(() => performance.now() > this._finOmbre);
    };
    if (this.r && cuit && cuit !== this._ombreCuit) { this._ombreCuit = cuit; refaire(); }
    else if (this._ombreD && !this._chantierOmbre && (this._refaits || 0) < 8 && (this._tSig = (this._tSig || 5) - dt) <= 0) {
      this._tSig = 5;
      if (this._signatureOmbre() !== this._sigOmbre) refaire();
    }
    if (this._chantierOmbre) {
      this._finOmbre = performance.now() + 2;
      if (this._chantierOmbre.next().done) this._chantierOmbre = null;
    }
    // (lot C6) les gros porteurs d'ombre des morceaux à portée, sur téléphone (5)
    if (this.r && this.ord && this.ord.mobile && this.actifs.ombreZones) this._grosPorteurs();
    // (lot C6) les lots d'un même matériau regroupés (8), une fois par seconde, quand rien ne se construit
    if (this.actifs.lots && (this._tRegroupe = (this._tRegroupe ?? 1) - dt) <= 0) {
      this._tRegroupe = 1;
      if (!this.ord || !this.ord.morceaux.some((m) => m.etat === 'construction' && m.chantier)) this._regrouper();
    }
    const t0 = performance.now();
    this._tJuge -= dt;
    const p = camera.position, o = this._oeil;
    const bouge = !o || Math.hypot(p.x - o.x, p.y - o.y, p.z - o.z) > BOUGE;
    if (bouge || this._tJuge <= 0) {
      this._tJuge = 0.5;
      if (bouge && this.actifs.occultation) this._horizon(p);
      this._juger(camera);
    }
    this.stats.msJugement = +(performance.now() - t0).toFixed(2);
  }

  // ------------------------------------------------------------------ 2. l'occultation par le relief
  // La grille des minima du sol, au pas de 2 m (une fois) : chaque case garde le plus bas des nœuds qu'elle touche, et le
  // rectangle du plateau vaut 0 (Monde.sol l'y rend). Le relief qu'elle dessine n'est donc jamais plus haut que le vrai.
  _preparerGrille() {
    const M = Monde, R = M.repere;
    if (!R || !M._sol) return null;
    const f = Math.round(PAS_GRILLE / R.pas), NX = Math.ceil((R.nx - 1) / f), NZ = Math.ceil((R.nz - 1) / f);
    const G = new Float32Array(NX * NZ).fill(Infinity), S = M._sol;
    const P = R.plateau || [-23.7, -9.1, 6.3, 9.1];
    for (let k = 0; k < R.nz; k++) {
      const z = R.z0 + k * R.pas, c0 = Math.max(0, Math.ceil(k / f) - 1), c1 = Math.min(NZ - 1, Math.floor(k / f));
      for (let i = 0; i < R.nx; i++) {
        const x = R.x0 + i * R.pas;
        const h = x >= P[0] && x <= P[2] && z >= P[1] && z <= P[3] ? 0 : S[k * R.nx + i] / 100;
        const i0 = Math.max(0, Math.ceil(i / f) - 1), i1 = Math.min(NX - 1, Math.floor(i / f));
        for (let c = c0; c <= c1; c++) for (let q = i0; q <= i1; q++) { const j = c * NX + q; if (h < G[j]) G[j] = h; }
      }
    }
    return { G, NX, NZ, pas: f * R.pas, x0: R.x0 + this.dx, z0: R.z0 };
  }

  // L'horizon autour de l'œil : pour chaque direction et chaque distance, la plus grande pente (tangente de l'élévation)
  // du relief vu de l'œil jusque-là.
  _horizon(p) {
    const t0 = performance.now();
    if (!this._grille) this._grille = this._preparerGrille();
    const Gr = this._grille;
    this._oeil = { x: p.x, y: p.y, z: p.z };
    if (!Gr) return;
    const { G, NX, NZ, pas, x0, z0 } = Gr, D = this._D, K = this._K, H = this._H;
    const ex = p.x, ey = p.y + OEIL_HAUT, ez = p.z;
    for (let a = 0; a < NA; a++) {
      const ang = (a + 0.5) / NA * 2 * Math.PI - Math.PI, cx = Math.cos(ang), cz = Math.sin(ang);
      let m = -1e9;
      for (let k = 0; k < K; k++) {
        const d = D[k], i = Math.floor((ex + cx * d - x0) / pas), c = Math.floor((ez + cz * d - z0) / pas);
        if (i >= 0 && i < NX && c >= 0 && c < NZ) {
          const t = (G[c * NX + i] - RELIEF_BAS - RELIEF_PENTE * d - ey) / d;
          if (t > m) m = t;
        }
        H[a * K + k] = m;
      }
    }
    this.stats.horizons++;
    this.stats.msHorizon = +(performance.now() - t0).toFixed(2);
  }

  // Le point (x, y, z) passe-t-il au-dessus de l'horizon ?
  _voit(x, y, z) {
    const o = this._oeil, dx = x - o.x, dz = z - o.z, dist = Math.hypot(dx, dz);
    if (dist < PRES) return true;
    const j = this._tabJ[Math.min(999, Math.floor(dist * 2))];
    if (j < 0) return true;
    const a = Math.floor((Math.atan2(dz, dx) + Math.PI) / (2 * Math.PI) * NA) % NA, K = this._K, H = this._H;
    const h = Math.min(H[((a + NA - 1) % NA) * K + j], H[a * K + j], H[((a + 1) % NA) * K + j]);
    return (y - o.y - OEIL_HAUT) / dist >= h;
  }
  // Une boîte est vue si un point au moins de son dessus l'est (une grille de points tous les 10 m au plus)
  _boiteVue(b) {
    const w = b.max.x - b.min.x, l = b.max.z - b.min.z, ni = Math.max(1, Math.ceil(w / PAS_DESSUS)), nk = Math.max(1, Math.ceil(l / PAS_DESSUS));
    for (let k = 0; k <= nk; k++) for (let i = 0; i <= ni; i++) if (this._voit(b.min.x + w * i / ni, b.max.y, b.min.z + l * k / nk)) return true;
    return false;
  }

  // Le décor du plateau : les objets du premier niveau de la scène qui ne sont ni des zones, ni des silhouettes, ni ce qui
  // bouge, ni le ciel, ni la végétation, ni le sol — leur boîte prise une fois (ils ne bougent pas). Relevé quand le
  // nombre d'objets de la scène change, et toutes les cinq secondes (les modèles chargés en différé).
  _releverDecor() {
    const sc = this.scene, sol = sc.userData.solParc && sc.userData.solParc.mesh, veg = sc.userData.vegetation && sc.userData.vegetation.groupe;
    const l = [];
    for (const o of sc.children) {
      if (o === this.groupe || o === sol || o === veg || o.userData.dynamique || o.userData.ciel || o.isLight || o.isCamera) continue;
      if (o.name && (o.name.startsWith('ZONE:') || o.name.startsWith('SIL:'))) continue;
      let b = this._boites.get(o);
      if (!b) {
        b = new THREE.Box3().setFromObject(o);
        if (b.isEmpty() || b.getSize(new THREE.Vector3()).length() > 400) b = null;
        this._boites.set(o, b || false);
      }
      if (b) { const r = b.getBoundingSphere(new THREE.Sphere()).radius; l.push({ o, b, r, petit: r < PETIT }); }
    }
    this._decor = l; this._decorN = sc.children.length;
    // (lot C6) LES PIÈCES FINES ET LOURDES du décor du plateau, à l'intérieur de ces objets : un maillage de moins de
    // FIN_RAYON de rayon et de plus de FIN_TRIANGLES triangles (le cercle d'un panier, 26 000 triangles pour 32 cm ; son
    // filet). Jugées une à une (voir _juger), elles ne sont plus dessinées quand leur rayon fait moins de ANGLE_FIN de leur
    // distance : 50 m pour un cercle, où son fer de 2 cm fait le dixième d'un pixel.
    // (leur centre est repris à chaque jugement : une pièce qui bouge est jugée là où elle est)
    // (relecture : fines pour de bon, voir FIN_PLEIN — le ballon et la platine du cercle n'en sont pas)
    // (et, avec eux, chaque PETIT maillage à l'intérieur d'un objet plus grand — la règle des 0,3 % de la distance, jusque-là
    // jugée sur l'objet entier, l'est aussi maillage par maillage : `angle` ANGLE_MIN pour eux, ANGLE_FIN pour les fins)
    const fins = [], s = new THREE.Sphere();
    for (const e of l) e.o.traverse((m) => {
      if (m === e.o || !m.isMesh || m.isInstancedMesh || !m.geometry || !m.geometry.attributes.position) return;
      const G = m.geometry, n = (G.index ? G.index.count : G.attributes.position.count) / 3;
      if (!G.boundingSphere) G.computeBoundingSphere();
      s.copy(G.boundingSphere).applyMatrix4(m.matrixWorld);
      if (n >= FIN_TRIANGLES && s.radius < FIN_RAYON && finesse(G) < FIN_PLEIN) fins.push({ o: m, s: G.boundingSphere, r: s.radius, c: new THREE.Vector3(), angle: ANGLE_FIN });
      else if (s.radius < PETIT && s.radius < e.r * 0.5) fins.push({ o: m, s: G.boundingSphere, r: s.radius, c: new THREE.Vector3(), angle: ANGLE_MIN });
    });
    this._decorFins = fins;
  }

  // Ce que la passe principale ne dessinera pas jusqu'au prochain jugement.
  _juger(camera) {
    const C = this._caches;
    C.clear();
    const sc = this.scene, p = camera.position;
    this._tDecor -= 0.5;
    if (!this._decor || this._decorN !== sc.children.length || this._tDecor <= 0) { this._tDecor = 5; this._releverDecor(); }
    let nOcc = 0, nLoin = 0;
    const occ = this.actifs.occultation && this._oeil && this._grille;
    // les morceaux construits et les silhouettes affichées (leurs boîtes : js/monde_charge.js, coutGroupe)
    if (occ && this.ord) for (const m of this.ord.morceaux) {
      if (m.groupe && m.cout && m.groupe.visible && !this._boiteVue(m.cout.boite)) { C.add(m.groupe); nOcc++; }
      if (m.sil && m.coutSil && m.sil.visible && !this._boiteVue(m.coutSil.boite)) { C.add(m.sil); nOcc++; }
    }
    // le décor du plateau : caché par le relief, ou petit et loin
    for (const e of this._decor) {
      if (!e.o.visible) continue;
      if (this.actifs.loin && e.petit) {
        const d = e.b.distanceToPoint(p);
        if (d > LOIN_PLATEAU || (d > PRES && e.r < ANGLE_MIN * d)) { C.add(e.o); nLoin++; continue; }
      }
      if (occ && !this._boiteVue(e.b)) { C.add(e.o); nOcc++; }
    }
    // (lot C6) les pièces fines et lourdes du décor du plateau, au loin (voir _releverDecor)
    if (this.actifs.loin && this._decorFins) for (const f of this._decorFins) {
      if (!f.o.visible) continue;
      f.c.copy(f.s.center).applyMatrix4(f.o.matrixWorld);
      const d = f.c.distanceTo(p) - f.r;
      if (d > PRES && f.r < f.angle * d) { C.add(f.o); nLoin++; }
    }
    this.stats.caches = nOcc; this.stats.loin = nLoin;
  }

  // ------------------------------------------------------------------ outils (?debug=1)
  _outils() {
    const v = this;
    return {
      get stats() { v._compter(); return { ...v.stats, actifs: { ...v.actifs } }; },
      lots(on = true) { v.actifs.lots = !!on && !!v.r; if (!on) v._finPasse(); return v.actifs.lots; },
      occultation(on = true) { v.actifs.occultation = !!on; v._oeil = null; return on; },
      loin(on = true) { v.actifs.loin = !!on; v._tJuge = 0; return on; },
      ombreDecor(on = true) { v.actifs.ombreDecor = !!on && !!v.r; return v.actifs.ombreDecor; },
      // (lot C6) l'ombre des morceaux par leurs lots d'ombre (5), la passe de normales limitée aux abords (6)
      ombreZones(on = true) { v.actifs.ombreZones = !!on && !!v.r; return v.actifs.ombreZones; },
      normales(on = true) { v.actifs.normales = !!on; return on; },
      fin(on = true) { v.actifs.fin = !!on; return on; },
      horizon() { v._oeil = null; return 'horizon refait à la prochaine image'; },
      vue: v,
    };
  }
}

// Visible jusqu'à la scène (et dans la scène) ?
function chaineVisible(o, sc) {
  for (let n = o; n; n = n.parent) { if (n === sc) return true; if (!n.visible) return false; }
  return false;
}
// La racine d'un morceau (son groupe, au premier niveau de la scène) est-elle visible ?
function racineVisible(r, sc) { return r.visible && r.parent === sc; }
// (lot C6) Une pièce de ferronnerie (instance d'un lot ou maillage : sa sphère `c`, `r`) est-elle au-delà de la distance
// du détail fin `DF` ? Avec HYST_FIN d'hystérésis, retenue dans `x.loin`.
function estLoin(x, P, DF) {
  if (DF === Infinity) return (x.loin = false);
  const d = x.c.distanceTo(P) - x.r;
  return (x.loin = x.loin ? d > DF - HYST_FIN : d > DF + HYST_FIN);
}
// (relecture du lot C6) Les matériaux dans la passe d'ombre. Le côté des faces que three dessine dans la carte pour un
// matériau (getDepthMaterial : shadowSide, sinon l'envers de `side`) ; un matériau ORDINAIRE (sa profondeur n'est que
// celle de ses triangles : ni découpe, ni déplacement, ni plans de coupe) ; VISIBLE (tous, s'ils sont plusieurs).
const COTE_OMBRE = { [THREE.FrontSide]: THREE.BackSide, [THREE.BackSide]: THREE.FrontSide, [THREE.DoubleSide]: THREE.DoubleSide };
function coteOmbre(m) { return m.shadowSide !== null && m.shadowSide !== undefined ? m.shadowSide : COTE_OMBRE[m.side]; }
function materiauOrdinaire(m) {
  if (!m || !m.visible || m.transparent || m.alphaTest > 0 || m.alphaHash || m.wireframe) return false;
  return !((m.displacementMap && m.displacementScale !== 0) || (m.clippingPlanes && m.clippingPlanes.length));
}
function materiauVisible(m) { return Array.isArray(m) ? m.every((x) => x && x.visible) : m.visible; }
// Les index d'un porteur d'ombre pour son lot d'ombre (créés s'il n'y en a pas) : tous ; ou, pour un maillage à
// plusieurs matériaux, ceux de ses groupes seulement, à la suite (three ne dessine que ses groupes).
function indexOmbre(o) {
  const g = o.geometry, nv = g.attributes.position.count, I = g.index ? g.index.array : null;
  const plages = Array.isArray(o.material) ? g.groups.map((G) => [G.start, Math.min(G.start + G.count, I ? g.index.count : nv)])
    : [[0, I ? g.index.count : nv]];
  let ni = 0;
  for (const [a, b] of plages) ni += Math.max(0, b - a);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let k = 0;
  for (const [a, b] of plages) for (let i = a; i < b; i++) idx[k++] = I ? I[i] : i;
  return idx;
}
// (relecture du lot C6) La FINESSE d'une géométrie : sa surface rapportée à celle de sa sphère englobante (4πr²), dans
// son propre repère (une échelle uniforme ne la change pas). Un fil, un cercle de fer, un filet : bien moins de 0,25 ;
// une boule, une pièce massive : 0,3 et plus. Prise une fois par géométrie (le relevé du décor revient toutes les 5 s).
const _finesses = new WeakMap(), _fa = new THREE.Vector3(), _fb = new THREE.Vector3(), _fc = new THREE.Vector3();
function finesse(G) {
  let f = _finesses.get(G);
  if (f !== undefined) return f;
  const p = G.attributes.position, I = G.index, n = I ? I.count : p.count;
  let s = 0;
  for (let i = 0; i + 2 < n; i += 3) {
    _fa.fromBufferAttribute(p, I ? I.getX(i) : i); _fb.fromBufferAttribute(p, I ? I.getX(i + 1) : i + 1); _fc.fromBufferAttribute(p, I ? I.getX(i + 2) : i + 2);
    s += _fb.sub(_fa).cross(_fc.sub(_fa)).length() / 2;
  }
  if (!G.boundingSphere) G.computeBoundingSphere();
  const r = G.boundingSphere.radius;
  f = r > 0 ? s / (4 * Math.PI * r * r) : 1;
  _finesses.set(G, f);
  return f;
}
// Les trous d'un lot (sommets, index) : ce qui est réservé avant la fin de son tampon sans être à un maillage vivant
function trous(b) {
  let v = 0, i = 0;
  for (const info of b._geometryInfo) if (info.active) { v += info.reservedVertexCount; i += info.reservedIndexCount; }
  return [b._nextVertexStart - v, b._nextIndexStart - i];
}
