// =====================================================================
//  LES ARBRES DU PARC ENTIER (lot A5 du chantier « parc complet »)
// =====================================================================
// Tous les arbres de arbres.bin (assets/parc/monde/, 450 dans la grille du monde, tirés de la canopée du LiDAR de l'IGN :
// position, hauteur, rayon de couronne, essence, variante ; format : tools/parc/LISEZMOI.md § 3.4). Les zones n'en
// plantent aucun (règle 4 du contrat) : ils viennent tous d'ici, et c'est eux qui font la MASSE du parc — sans eux, le
// parc entier est une prairie nue autour du plateau.
//
// LES MODÈLES : les vrais arbres du parc, les mêmes fichiers que ceux du plateau (assets/parc/*.glb, chargés par
// chargerModele de js/court_parc.js : mêmes matériaux, même vent, même lumière transmise, mêmes teintes) — platane,
// tilleul, cèdre, saule, arbuste ; et, depuis le lot C5, trois essences MODELÉES pour le parc (tools/parc/arbres_c5.py :
// charpente par colonisation de l'espace, feuilles photographiées CC0 recomposées en rameaux) — le HÊTRE POURPRE, le
// MARRONNIER (feuilles palmées, roussies par la mineuse ; au printemps, feuilles neuves et chandelles de fleurs blanches,
// une seconde carte de feuillage : voir _carteSaison) et le CERISIER du Japon 'Kanzan' (en vase ; ses fleurs roses
// sont une pièce à part, montrée au printemps seulement : voir SAISON). Avant, c'étaient un tilleul teint en brun, un
// platane assombri et un tilleul bronze. Le pin prend le cèdre ; une essence sans modèle prend celui que monde.json lui
// donne en repli, avec une COULEUR PAR EXEMPLAIRE. L'if conique est l'if taillé du kit (js/parc/kit.js).
// Chaque arbre prend la taille que le LiDAR a mesurée : sa hauteur, et sa couronne (la largeur est étirée, dans des bornes propres à chaque essence, pour tomber sur le rayon relevé). La fin septembre
// (conception, § 6) : les feuillus jaunissent un peu, chacun à son rythme (alea).
//
// TROIS NIVEAUX DE DÉTAIL (§ 3.5, distances du § 3.6 : en « haute » sur PC, moins de 25 m, puis jusqu'à 60 m, puis
// au-delà) : LOD0 le modèle PC, LOD1 le modèle `_mobile` (deux à trois fois moins de triangles), LOD2 un IMPOSTEUR. La
// distance est pondérée par la taille de l'arbre (un arbuste de 6 m passe plus tôt en léger qu'un platane de 20 m), et un
// PLAFOND DE TRIANGLES (§ 3.6, végétation : 0,5 M en « haute ») rétrograde les plus lointains quand le cadre en
// contient trop. Ce plafond CÈDE à ce que le reste du cadre coûte déjà (le sol, le décor du plateau, les morceaux des
// zones) : le total de la passe principale (0,9 M en « haute ») passe avant, jusqu'à la moitié du plafond. (Relecture du
// lot : avec les vraies zones, PV09 montait à 1,0 M, dont 0,49 M d'arbres ; des arbres légers passés en imposteurs à
// 40-60 m, on ne voit presque pas la différence.) Sur téléphone : les modèles `_mobile` seulement, puis les imposteurs.
//
// UN BatchedMesh PAR PIÈCE DE MODÈLE (écorce, feuilles… : les maillages du fichier), pour TOUT le parc, qui contient
// les deux géométries (PC et légère) : chaque arbre y est une instance, qui change de géométrie en changeant de niveau.
// La conception proposait un InstancedMesh par essence, par pièce et par cellule, pour que three écarte du cadre ce qui
// n'y est pas ; le BatchedMesh de three r170 fait mieux : il écarte ARBRE PAR ARBRE, dans chaque passe (image, ombre du
// soleil, normales de l'occlusion), et dessine tout le reste en UN appel (WEBGL_multi_draw). Un tilleul coûte donc deux
// appels de dessin pour tout le parc, au lieu de deux par cellule. (Sans l'extension, three dessine arbre par arbre :
// on retombe sur le coût d'un lot par cellule.)
//
// LES IMPOSTEURS (LOD2). Chaque modèle est photographié au démarrage, une fois, sous 8 angles (tous les 45°), avec le
// renderer du jeu, dans deux atlas de 4 x 2 vues (1024 x 512, 512 x 256 sur téléphone) : la COULEUR (l'albédo, teinte
// comprise, sans lumière) et la NORMALE (repère du modèle ; pour les feuilles, penchée vers le dehors de la couronne,
// qui s'éclaire alors comme un volume au lieu d'un nuage de cartes ; alpha = part de feuillage). Un imposteur est un
// panneau qui se tourne vers la caméra autour de la verticale ; il lit les deux vues les plus proches de l'angle d'où on
// le regarde et les fond, puis il est éclairé comme le reste de la scène (soleil, ciel, carte d'environnement,
// brouillard), avec la lumière transmise des feuilles. Un InstancedMesh par modèle, rempli à chaque image des seuls
// imposteurs dans le cadre (tri fait ici) : cinq appels pour tous les arbres lointains.
//
// L'OMBRE : les arbres complets et légers portent leur ombre (découpée, qui bouge au vent), mais seulement à portée du
// joueur (§ 3.6, porteurs d'ombre : 50 m en « haute ») — le temps de la passe d'ombre, les autres sont cachés. Les
// imposteurs n'en portent pas.
//
// Ce que ce module laisse au reste du jeu : un groupe `VÉGÉTATION du parc` (nofuse : l'optimiseur du décor n'y touche
// pas), des maillages marqués `dynamique` (ni l'ombre cuite du sol ni les ombres de contact ne les photographient : un
// BatchedMesh dessiné sans ses matrices y mettrait tous les arbres au centre du plateau), inscrits au registre des
// découpes (js/fx.js : l'occlusion ambiante ne les voit pas en carrés pleins), et les troncs, déjà obstacles
// (js/monde_collisions.js, troncsDesArbres). Mesures : Monde.stats.vegetation (__perf).
import * as THREE from 'three';
import { Monde } from './monde.js';
import { chargerModele, VENT } from './court_parc.js';
import { reglages, MOBILE } from './monde_charge.js';
import { saisonParc } from './parc/options.js';
import { mipmapsFeuillage } from './mipmaps_feuillages.js';

// La saison des feuillages (conception, § 6 : fin septembre par défaut, printemps en option) : c'est désormais une
// OPTION du parc (lot C5, js/parc/options.js, réglable en jouant : Vegetation.appliquerSaison). SAISON garde la valeur
// du chargement, pour qui la lit une fois.
export const SAISON = saisonParc();

// Les modèles et leurs réglages de feuillage. Ceux de ESSENCES (js/court_parc.js) pour les quatre que le plateau pose
// déjà ; le platane, que le plateau ne pose pas, a les siens : son feuillage d'origine est d'automne avancé (doré,
// orangé), ramené à un vert qui jaunit (la voûte des platanes du plateau, photos 40 et 602, et 171709 : un vert-jaune).
const MODELES = {
  // (relevé : feuilles du fichier à #968c3c en moyenne, platanes du plateau et de 171709 vers #6e7d3c : rouge à 0,52,
  // vert à 0,79, bleu gardé ; filtre ramené à une luminance de 1, la clarté faisant le reste. Comparé en PV13 à la voûte
  // du plateau, juste devant : un peu plus vert encore, sans virer au gris-bleu)
  platane: { E: { h: 639.442, trans: 0.28, clair: 0.85, sat: 1, vire: [0.57, 1.0, 1.36] } },
  // (`pied` : voir apprivoiserPied, plus bas ; `haut` et `rayon` en fractions de la hauteur du fichier. Relevés sur
  // l'écorce des deux fichiers : le fût du tilleul fait 0,022 à 0,040 H de rayon selon le côté (il n'est pas rond) de
  // 0,02 à 0,15 H ; ses racines s'en détachent en arêtes jusqu'à 0,08 H et plongent jusqu'à -0,16 H à 0,10 H de l'axe.
  // Celles du cèdre, des griffes à fleur de sol jusqu'à 0,25 H, font sa silhouette de vieux cèdre : on n'y touche qu'en
  // dessous du sol, dans un fût rond de 0,15 H)
  tilleul: { pied: { haut: 0.1, evase: 0.3 } },
  cedre: { pied: { haut: -0.02, evase: 0.3, rayon: 0.15 } },
  saule: {}, arbuste: {},
  // LOT C5 : les trois essences modelées (tools/parc/arbres_c5.py ; en mètres, pied à l'origine, fût évasé sans racines
  // qui sortent : pas de `pied`). `h` : la hauteur du fichier PC ; `trans`, `clair`, `sat`, `vire` : comme ESSENCES de
  // js/court_parc.js, calés en jeu sur les photos (voir RENDU)
  // (le hêtre, mesuré en jeu contre la photo 171709 : la première version sortait lie-de-vin, R/V 1,42 et B/V 0,88, à
  // 0,47 fois la luminance des feuillus verts voisins ; la photo : 1,02 / 0,95 à 0,73. Désaturé de moitié, éclairci)
  hetre: { E: { h: 16.9, trans: 0.22, clair: 1.5, sat: 0.55, vire: [0.97, 1.0, 1.05] } },
  // (`printemps` : la jumelle de printemps de sa carte de feuillage, assets/parc/<nom>(_mobile).webp — relecture du lot
  // C5, voir _carteSaison)
  marronnier: { E: { h: 18.98, trans: 0.26, clair: 1.0 }, printemps: 'marronnier_printemps' },
  cerisier: { E: { h: 8.61, trans: 0.3, clair: 1.0 } },
};
// Le rendu de chaque essence de monde.json : le modèle, la couleur de l'exemplaire (multiplie l'albédo), la part de
// jaunissement d'automne (la plupart restent verts, quelques-uns tournent : fin septembre), et les bornes de
// l'étirement de la couronne (largeur / hauteur du modèle). Un feuillu n'est presque jamais aminci (0,95) : le LiDAR
// découpe souvent un grand houppier en plusieurs « arbres » serrés, et un tilleul amaigri à 0,8 ressemble à un peuplier.
const JAUNE = [1.16, 1.03, 0.62];
const RENDU = {
  platane: { modele: 'platane', couleur: [1, 1, 1], jaunit: 0.3, etale: [0.95, 1.65] },
  tilleul: { modele: 'tilleul', couleur: [1, 1, 1], jaunit: 0.32, etale: [0.95, 1.6] },
  cedre: { modele: 'cedre', couleur: [1, 1, 1], jaunit: 0, etale: [0.45, 1.1] },
  saule: { modele: 'saule', couleur: [1, 1, 1], jaunit: 0.2, etale: [0.9, 1.35] },
  arbuste: { modele: 'arbuste', couleur: [1, 1, 1], jaunit: 0.12, etale: [0.85, 1.5] },
  // le hêtre pourpre (photos 171709 et 600 : un brun pourpre sombre, presque noir à l'ombre)
  // (une couleur par exemplaire MULTIPLIE l'albédo : d'un vert, elle ne tire pas un pourpre franc, mais le brun sombre
  // lie-de-vin de la photo, oui — le rouge rouille de la première version, 0,95 / 0,46 / 0,58, était trop clair)
  // (relecture du lot, mesures sur les photos : le hêtre de 171709 est à R/V 1,02 et B/V 0,95 pour une luminance des deux
  // tiers de celle des tilleuls voisins, celui de 600, à contre-jour, à 0,87 et 1,12. Le 0,8 / 0,38 / 0,62 d'avant sortait
  // au soleil à R/V 1,35 et B/V 0,75 : un roux d'automne, pas un hêtre pourpre. Rouge ôté, bleu rendu : 1,12 / 0,79 au
  // soleil (PV07), 0,94 / 1,12 à contre-jour (PV01) — un brun pourpre sombre, qui se lit encore pourpre)
  // (LOT C5 : son propre modèle, `hetre`, aux feuilles déjà pourpres ; la couleur de l'exemplaire n'est plus qu'un
  // réglage fin. L'ancien rendu, en repli : un tilleul [0,5 ; 0,33 ; 0,62])
  hetre_pourpre: { modele: 'hetre', couleur: [1, 1, 1], jaunit: 0, etale: [0.85, 1.35], repli: { modele: 'tilleul', couleur: [0.5, 0.33, 0.62], etale: [0.95, 1.65] } },
  // le marronnier : son modèle (feuilles palmées sombres, un tiers des folioles roussies par la mineuse), qui roussit
  // encore un peu par exemplaire (repli : un platane plus sombre et plus bleu)
  marronnier: { modele: 'marronnier', couleur: [1, 1, 1], jaunit: 0.25, etale: [0.85, 1.35], repli: { modele: 'platane', couleur: [0.78, 0.9, 0.82], etale: [0.95, 1.65] } },
  // le cerisier du Japon 'Kanzan' (les quatre de la perspective, zone Z13, et ceux du jardin de la fontaine) : son
  // modèle en vase, fût dégagé de 1,6 m (R2, Z13-01, Z13-16). La couleur dépend de la SAISON (`saisons`) : fin septembre,
  // le vert qui tourne au bronze ; au printemps, les jeunes feuilles bronze rouge, sous les fleurs (une pièce du modèle,
  // montrée au printemps seulement). (Repli : un tilleul, comme avant le lot C5.)
  // (fin septembre : [1,12 ; 0,9 ; 0,7] laissait un vert franc, celui de la photo des feuilles ; un bronze plus marqué,
  // qui roussit davantage d'un exemplaire à l'autre)
  cerisier: { modele: 'cerisier', couleur: [1.24, 0.88, 0.62], jaunit: 0.35, etale: [0.85, 1.4],
    // (au printemps, les jeunes feuilles du 'Kanzan' sont cuivrées, rouge bronze : sombres sous les fleurs, qui dominent —
    // un vert olive en faisait un arbre vert moucheté de rose)
    saisons: { printemps: { couleur: [0.95, 0.62, 0.55], jaunit: 0 } },
    // (relecture : le repli reprend tout le rendu d'avant le lot, rose au printemps et jaunissement compris)
    repli: { modele: 'tilleul', couleur: [1.18, 0.84, 0.66], jaunit: 0.15, etale: [1.0, 1.7], saisons: { printemps: { couleur: [1.9, 1.2, 1.45] } } } },
  pin: { modele: 'cedre', couleur: [0.92, 1.02, 0.95], jaunit: 0, etale: [0.6, 1.2] },
  if_conique: { kit: 'ifConique' },
};
// L'adresse ?arbres=repli remet le rendu d'avant le lot C5 (outil de comparaison, voir _lire)
const REPLI_FORCE = (() => { try { return new URLSearchParams(location.search).get('arbres') === 'repli'; } catch (e) { return false; } })();
// Le rendu d'une essence À UNE SAISON : au printemps, rien ne jaunit (les feuillus sont d'un vert neuf), et une essence
// peut avoir sa couleur propre (`saisons`).
function renduSaison(R, saison) {
  const S = (R.saisons && R.saisons[saison]) || {};
  return { couleur: S.couleur || R.couleur, jaunit: S.jaunit ?? (saison === 'printemps' ? 0 : R.jaunit) };
}
// Le rayon de couronne de arbres.bin est une demi-largeur MÉDIANE à 70 % de la hauteur, plafonnée aux deux tiers de la
// distance au voisin (tools/parc/LISEZMOI.md § 3.4) : il sous-estime la couronne dans les massifs, là où les houppiers
// se touchent (la vue du drone, photo 3 : une canopée continue sur le coteau). On l'élargit d'autant.
const ELARGIR = 1.35;
// La lumière transmise par le feuillage de chaque modèle (celle de ESSENCES, js/court_parc.js), pour ses imposteurs
const TRANS = { platane: 0.28, tilleul: 0.3, cedre: 0.2, saule: 0.35, arbuste: 0.3, hetre: 0.22, marronnier: 0.26, cerisier: 0.3 };
const PIECE_MIN = 64;           // une pièce de modèle de moins de 64 triangles n'est pas posée (les feuilles sèches de l'arbuste)
const HYST = 3;                  // hystérésis des niveaux de détail (m)
const ENFOUI = 0.08;             // le pied est enfoncé d'autant (les racines du fichier sont sous y = 0)
const VUES = 8;                  // vues de l'imposteur (tous les 45°)

// Les fichiers des modèles, demandés dès le chargement de js/parc/index.js (en même temps que les données du monde) :
// chargerModele garde une promesse par fichier, Vegetation reprend la même.
export function prechargerArbres(mobile = MOBILE) {
  for (const n of Object.keys(MODELES)) {
    if (!mobile) chargerModele(n, false, MODELES[n].E).catch(() => {});
    chargerModele(n, true, MODELES[n].E).catch(() => {});
  }
}

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _Y = new THREE.Vector3(0, 1, 0), _c = new THREE.Color(), _fr = new THREE.Frustum(), _sph = new THREE.Sphere();
const _pv = new THREE.Matrix4(), _bx = new THREE.Box3(), _sph2 = new THREE.Sphere();
// le pas du maillage du sol à chacun de ses trois niveaux (js/monde_sol.js : 0,5, 1 et 2 m), pour compter ses triangles
const PAS_SOL = [0.5, 1, 2];

export class Vegetation {
  // `donnees` : ce que rend chargerMonde (tableArbres, essences) ; `dx` : décalage du décor (parc2) ; `renderer` : celui
  // du jeu (pour photographier les imposteurs ; sans lui, les arbres lointains restent en modèle léger) ; `kit` :
  // js/parc/kit.js (l'if conique).
  constructor(scene, donnees, { dx = 0, mobile = MOBILE, renderer = null, kit = null } = {}) {
    const t0 = performance.now();
    this.scene = scene; this.dx = dx; this.mobile = mobile; this.renderer = renderer; this.kit = kit;
    this.groupe = new THREE.Group();
    this.groupe.name = 'VÉGÉTATION du parc';
    this.groupe.userData.nofuse = true;
    scene.add(this.groupe);
    this.registre = scene.userData.registreDecoupes || (scene.userData.registreDecoupes = { set: new Set(), version: 0 });
    this.arbres = [];
    this.modeles = new Map();
    this.actif = false;
    this.stats = { arbres: 0, lod0: 0, lod1: 0, lod2: 0, caches: 0, triangles: 0, msInstallation: 0, msImposteursImage: 0, attente: 'modèles' };
    // la saison (option du parc, lot C5 : js/parc/options.js) ; appliquerSaison la change en jouant
    this.saison = saisonParc();
    this._lire(donnees);
    // les modèles : PC et légers (légers seulement sur téléphone), déjà en route depuis js/parc/index.js ; puis la
    // préparation, en tâche de fond, image par image (voir _preparer)
    // (LOT C5 : tous attendus ensemble, pour qu'une essence dont le modèle manque — fichier absent, réseau coupé —
    // reprenne celui de son REPLI, le rendu d'avant le lot, au lieu de disparaître : voir _replier)
    const noms = [...this.modeles.keys()];
    this._attentes = [];
    const charger = (n) => Promise.all([mobile ? null : chargerModele(n, false, MODELES[n].E), chargerModele(n, true, MODELES[n].E)]);
    this.pret = Promise.allSettled(noms.map(charger))
      .then(async (res) => {
        const prets = new Map();
        res.forEach((r, i) => { if (r.status === 'fulfilled') prets.set(noms[i], r.value); else this._replier(noms[i], r.reason); });
        for (const n of this.modeles.keys()) {
          if (prets.has(n)) continue;
          try { prets.set(n, await charger(n)); } catch (e) { this._replier(n, e); }
        }
        for (const [n, [pc, leger]] of prets) if (this.modeles.has(n)) this._construireModele(this.modeles.get(n), pc, leger);
      })
      // (relecture du lot C5 : au printemps dès le chargement, les cartes de saison sont posées avant la préparation,
      // qui envoie les textures et photographie les imposteurs)
      .then(() => (this.saison !== 'automne' ? Promise.all([...this.modeles.values()].map((M) => this._carteSaison(M))) : null))
      .then(() => this._preparer())
      .catch((e) => { console.warn('[parc] arbres du parc : préparation interrompue', e); this.actif = true; });
    this.stats.msInstallation = Math.round(performance.now() - t0);
    this.maj = (dt, camera) => this._maj(dt, camera);
  }

  // LA PRÉPARATION, SANS À-COUP. Tout ce qui coûte la première fois qu'on dessine un arbre — l'envoi de ses textures à la
  // carte graphique, la compilation de ses programmes (la variante « BatchedMesh » des matériaux du parc), la photo de ses
  // imposteurs — est fait ici, un morceau par image, avant qu'il ne paraisse. Les programmes sont compilés en parallèle
  // par le pilote (compileAsync, KHR_parallel_shader_compile) : l'image n'attend pas. Les arbres paraissent une fois leurs
  // programmes prêts, les imposteurs un modèle après l'autre (en attendant, les arbres lointains restent en modèle léger).
  // (Mesuré sur la machine de Haythem, ANGLE sur Direct3D 11 : le pilote garde une part de la compilation pour le PREMIER
  // dessin de chaque programme — jusqu'à une demi-seconde la toute première fois, surtout pour l'atelier des imposteurs.
  // Tout cela tombe dans les premières secondes, pendant le menu, pas en balade.)
  async _preparer() {
    const r = this.renderer, cam = new THREE.PerspectiveCamera();
    const tex = new Set();
    for (const M of this.modeles.values()) for (const p of M.pieces) {
      const m = p.bm.material;
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'emissiveMap']) if (m[k]) tex.add(m[k]);
    }
    this.stats.attente = 'textures';
    if (r) for (const t of tex) { r.initTexture(t); await this._image(); }
    this.stats.attente = 'programmes';
    if (r) await this._compiler(this.groupe, cam);
    this.actif = true;
    if (!r) { this.stats.attente = 'prêt'; return; }
    this.stats.attente = 'imposteurs';
    for (const M of this.modeles.values()) if (M.pret) await this._cuireImposteur(M, cam);
    this.stats.attente = 'prêt';
  }
  // la prochaine image (voir _maj)
  _image() { return new Promise((ok) => this._attentes.push(ok)); }
  // Compiler en parallèle les programmes d'un objet TELS QU'ILS SERVIRONT : three choisit la variante d'un programme
  // selon la cible du rendu (à l'écran : courbe de tons et sortie sRGB ; dans une cible, comme celle du post-traitement
  // de js/fx.js où la scène est dessinée : ni l'une ni l'autre). Compilé pour l'écran, le programme était recompilé,
  // d'un bloc, à la première image. `cible` : celle du rendu à venir (par défaut, une cible flottante comme celle du
  // post-traitement).
  _compiler(o, cam, cible = null, scene = this.scene) {
    const r = this.renderer;
    if (!r || !r.compileAsync) return Promise.resolve();
    if (!cible) cible = this._cibleCompil || (this._cibleCompil = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
    const avant = r.getRenderTarget();
    r.setRenderTarget(cible);
    let p;
    try { p = r.compileAsync(o, cam, scene); } finally { r.setRenderTarget(avant); }
    return p.catch(() => {});
  }

  // ------------------------------------------------------------------ les arbres de arbres.bin
  _lire(d) {
    const T = d.tableArbres || new Float32Array(0), E = d.essences || [], n = Math.floor(T.length / 6);
    const ifs = [];
    for (let j = 0; j < n; j++) {
      const x = T[j * 6], z = T[j * 6 + 1], h = T[j * 6 + 2], r = T[j * 6 + 3], e = Math.round(T[j * 6 + 4]), v = T[j * 6 + 5];
      if (!(h > 0.5)) continue;
      const ess = E[e] || {}, nom = ess.nom || 'tilleul';
      let R = RENDU[nom];
      // (?arbres=repli : le rendu d'avant le lot C5, pour comparer images et mesures dans la même version du jeu)
      if (R && R.repli && REPLI_FORCE) R = { ...R, saisons: null, ...R.repli, repli: null };
      if (!R) {                                          // une essence nouvelle : son modèle, ou son repli, ou le tilleul
        const mod = ess.modele || ess.repli;
        R = { modele: MODELES[mod] ? mod : 'tilleul', couleur: [1, 1, 1], jaunit: 0.3, etale: [0.8, 1.4] };
      }
      if (R.kit) { ifs.push({ x, z, h, r }); continue; }
      const X = x + this.dx, y = Monde.sol(X, z) - ENFOUI;
      // la couleur de l'exemplaire : celle de l'essence, plus ou moins claire, plus ou moins jaunie (à la saison : voir
      // _couleur ; `k` et `aj`, tirés une fois, la refont à l'identique quand la saison change)
      const t = { x: X, z, y, h, r, nom, R, rot: ((v | 0) * 0.25 + alea(x, z, 3) * 0.25) * Math.PI * 2, col: null,
        k: 0.9 + 0.18 * alea(x, z, 11), aj: Math.pow(alea(x, z, 12), 2.2),
        taille: Math.min(1.3, Math.max(0.75, Math.sqrt(12 / h))), lod: -2, lodV: -1, id: -1, d: 0, dans: false, ombre: false };
      t.col = this._couleur(t);
      if (!this.modeles.has(R.modele)) this.modeles.set(R.modele, { nom: R.modele, arbres: [], pieces: [], pret: false });
      this.modeles.get(R.modele).arbres.push(this.arbres.length);
      this.arbres.push(t);
    }
    this.stats.arbres = this.arbres.length + ifs.length;
    // les ifs taillés (le kit du parc : js/parc/kit.js, ifConique), posés tels quels
    if (this.kit && ifs.length) {
      for (const f of ifs) {
        const g = this.kit.ifConique({ x: f.x, z: f.z, h: f.h, r: f.r });
        g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        this.groupe.add(g);
      }
    }
  }

  // La couleur d'un exemplaire (multiplie l'albédo de ses feuilles) à la saison du moment.
  _couleur(t) {
    const S = renduSaison(t.R, this.saison), jn = S.jaunit * t.aj;
    return [0, 1, 2].map((i) => S.couleur[i] * t.k * (1 + (JAUNE[i] - 1) * jn));
  }

  // LE REPLI (lot C5) : le modèle `n` n'a pas pu être chargé. Ses arbres prennent le rendu d'avant le lot (`repli` de
  // RENDU : un tilleul teint, un platane assombri), ceux qui n'en ont pas ne sont pas posés.
  _replier(n, e) {
    const M = this.modeles.get(n);
    if (!M) return;
    this.modeles.delete(n);
    let repris = 0;
    for (const j of M.arbres) {
      const t = this.arbres[j], R = t.R;
      if (!R.repli || !MODELES[R.repli.modele]) { t.sans = true; continue; }
      t.R = { ...R, saisons: null, ...R.repli, repli: null };
      t.col = this._couleur(t);
      if (!this.modeles.has(t.R.modele)) this.modeles.set(t.R.modele, { nom: t.R.modele, arbres: [], pieces: [], pret: false });
      this.modeles.get(t.R.modele).arbres.push(j);
      repris++;
    }
    console.warn(`[parc] arbres « ${n} » : modèle indisponible, ${repris} repris par leur repli, ${M.arbres.length - repris} non posés`, e);
  }

  // LA SAISON EN JOUANT (lot C5, option du parc : js/parc/options.js). Les couleurs des exemplaires (feuilles des arbres
  // proches, imposteurs des lointains, qui les lisent à chaque image), les pièces de saison (les fleurs des cerisiers, au
  // printemps seulement : _maj) et la photo des imposteurs des modèles qui en ont (refaite, l'ancienne sert en attendant).
  appliquerSaison(saison) {
    if (saison === this.saison) return;
    this.saison = saison;
    for (const t of this.arbres) t.col = this._couleur(t);
    for (const M of this.modeles.values()) {
      if (!M.pret) continue;
      for (const p of M.pieces) {
        if (!p.feuille || p.saison) continue;
        for (const j of M.arbres) { const t = this.arbres[j]; if (t.id >= 0) p.bm.setColorAt(t.id, _c.setRGB(t.col[0], t.col[1], t.col[2])); }
      }
      this._trianglesModele(M);
      if (M.pieces.some((p) => p.saison) && M.imp) this._rephotographier(M);
      // (la carte de saison — le marronnier, relecture du lot C5 —, puis la photo de ses imposteurs)
      if (MODELES[M.nom] && MODELES[M.nom].printemps) this._carteSaison(M).then((ok) => { if (ok && M.imp) this._rephotographier(M); });
    }
  }
  // LA CARTE DE SAISON d'un modèle (relecture du lot C5). Au printemps, le marronnier n'a pas que sa couleur à changer :
  // la carte de son fichier montre des folioles roussies par la mineuse (dès juillet), et il porte alors ses chandelles
  // de fleurs blanches. Sa carte de feuillage a donc une JUMELLE, assets/parc/marronnier_printemps(_mobile).webp
  // (tools/parc/arbres_c5.py : les mêmes feuilles aux mêmes places, neuves, et une chandelle au bout de chaque rameau ;
  // la carte de normales reste celle du fichier). Téléchargée la première fois qu'on passe au printemps, ses mipmaps
  // refaites comme celles du fichier (js/mipmaps_feuillages.js), elle prend la place de l'autre dans le matériau des
  // feuilles et dans celui de leur ombre — même taille : rien à recompiler. Les deux restent en mémoire, pour revenir
  // sans attendre. Rend vrai si la carte affichée a changé.
  _carteSaison(M) {
    const nom = MODELES[M.nom] && MODELES[M.nom].printemps;
    const pieces = M.pret ? M.pieces.filter((p) => p.feuille && !p.saison) : [];
    if (!nom || !pieces.length) return Promise.resolve(false);
    const mat = pieces[0].bm.material;
    if (!M.cartes) M.cartes = { automne: Promise.resolve(mat.map), ref: mat.map };
    const C = M.cartes, saison = this.saison === 'printemps' ? 'printemps' : 'automne';
    if (!C[saison]) {
      C[saison] = new Promise((ok, ko) => new THREE.TextureLoader().load(`assets/parc/${nom}${M.leger ? '_mobile' : ''}.webp`, ok, undefined, ko))
        .then((tex) => {
          // (les réglages de la carte du fichier : glTF, v vers le bas, sans retournement)
          const ref = C.ref;
          tex.flipY = false; tex.colorSpace = ref.colorSpace; tex.wrapS = ref.wrapS; tex.wrapT = ref.wrapT;
          tex.magFilter = ref.magFilter; tex.minFilter = ref.minFilter; tex.anisotropy = ref.anisotropy;
          return mipmapsFeuillage(tex, mat.alphaTest).then(() => { if (this.renderer) this.renderer.initTexture(tex); return tex; });
        });
    }
    return C[saison].then((tex) => {
      if ((this.saison === 'printemps' ? 'printemps' : 'automne') !== saison) return false;      // (la saison a rechangé)
      let change = false;
      for (const p of pieces) {
        if (p.bm.material.map !== tex) { p.bm.material.map = tex; change = true; }
        const o = p.bm.customDepthMaterial;
        if (o && o.map !== tex) { o.map = tex; change = true; }
      }
      return change;
    }).catch((e) => {
      console.warn(`[parc] carte de printemps de « ${M.nom} » indisponible : son feuillage d'automne reste`, e);
      C[saison] = null;
      return false;
    });
  }
  // Refaire la photo des imposteurs d'un modèle ; l'ancienne sert jusqu'à ce que la nouvelle soit prête, puis elle est
  // rendue à la carte graphique.
  _rephotographier(M) {
    if (!this.renderer || !M.imp || M.rephoto) return;
    const ancien = M.imp;
    M.rephoto = true;
    this._cuireImposteur(M, new THREE.PerspectiveCamera()).then(() => {
      M.rephoto = false;
      if (M.imp === ancien) return;
      this.groupe.remove(ancien.mesh); this.registre.set.delete(ancien.mesh); this.registre.version++;
      ancien.mesh.geometry.dispose(); ancien.mesh.material.dispose(); ancien.rtC.dispose(); ancien.rtN.dispose();
      if (M.saisonImp !== this.saison || M.carteImp !== carteFeuilles(M)) this._rephotographier(M);
    });
  }
  // Les triangles d'un arbre du modèle, complet et léger, pièces de la saison seulement (le plafond du cadre les compte)
  _trianglesModele(M) {
    const vues = M.pieces.filter((p) => !p.saison || p.saison === this.saison);
    M.tri0 = vues.reduce((s, x) => s + x.tri0, 0); M.tri1 = vues.reduce((s, x) => s + x.tri1, 0);
  }

  // ------------------------------------------------------------------ un modèle : ses BatchedMesh et son imposteur
  // `pc`, `leger` : les pièces des deux fichiers ({ geo, mat, feuille }, js/court_parc.js piecesModele).
  _construireModele(M, pc, leger) {
    const base = pc || leger;
    // la forme du modèle, dans l'unité du fichier : hauteur, rayon de la couronne vers 70 % de la hauteur (le rayon du
    // LiDAR est pris là : tools/parc/LISEZMOI.md § 3.4), rayon extrême (le cadre de l'imposteur)
    let H = 0, Rmax = 0;
    for (const p of base) {
      const P = p.geo.attributes.position;
      for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > H) H = y; if (y > 0) Rmax = Math.max(Rmax, Math.hypot(P.getX(i), P.getZ(i))); }
    }
    const rayons = [];
    for (const p of base) {
      if (!p.feuille) continue;
      const P = p.geo.attributes.position;
      for (let i = 0; i < P.count; i += 3) { const y = P.getY(i); if (y > 0.5 * H && y < 0.9 * H) rayons.push(Math.hypot(P.getX(i), P.getZ(i))); }
    }
    rayons.sort((a, b) => a - b);
    const Rc = rayons.length ? rayons[Math.floor(rayons.length * 0.9)] : Rmax * 0.8;
    M.H = H; M.Rmax = Rmax; M.Rc = Rc;
    // les pièces : on apparie les deux fichiers par le nom du matériau (les deux versions ont les mêmes)
    const parNom = new Map((leger || []).map((p) => [p.mat.name, p]));
    const nArbres = M.arbres.length;
    for (const p of base) {
      const l = pc ? parNom.get(p.mat.name) : p;
      const g0 = pc ? p.geo : null, g1 = l ? l.geo : null;
      const tri0 = g0 ? triangles(g0) : 0, tri1 = g1 ? triangles(g1) : 0;
      if (Math.max(tri0, tri1) < PIECE_MIN) continue;
      const geos = accorder([g0, g1].filter(Boolean));
      // (le pied des troncs : les racines rentrées sous le fût, voir apprivoiserPied)
      if (!p.feuille && MODELES[M.nom] && MODELES[M.nom].pied) for (const g of geos) apprivoiserPied(g, H, MODELES[M.nom].pied);
      const [a0, a1] = g0 ? [geos[0], g1 ? geos[1] : null] : [null, geos[0]];
      const nv = (a0 ? a0.attributes.position.count : 0) + (a1 ? a1.attributes.position.count : 0);
      const ni = (a0 ? a0.index.count : 0) + (a1 ? a1.index.count : 0);
      const bm = new THREE.BatchedMesh(nArbres, nv, ni, p.mat);
      bm.name = `arbres : ${M.nom} (${p.mat.name})`;
      const id0 = a0 ? bm.addGeometry(a0) : -1, id1 = a1 ? bm.addGeometry(a1) : -1;
      bm.castShadow = true; bm.receiveShadow = !p.feuille;
      if (p.feuille && p.mat.userData.ombre) bm.customDepthMaterial = p.mat.userData.ombre;
      bm.userData.dynamique = true; bm.userData.nofuse = true; bm.userData.arbre = M.nom;
      bm.perObjectFrustumCulled = true; bm.sortObjects = true;
      // (`saison` : une pièce qui ne se montre qu'à une saison — les fleurs des cerisiers, au printemps : lot C5)
      const piece = { bm, id0, id1, tri0: a0 ? tri0 : tri1, tri1: a1 ? tri1 : tri0, feuille: p.feuille, cache: [], legers: [],
        saison: pieceDeSaison(p) };
      // L'OMBRE, seulement à portée du joueur : le temps de la passe d'ombre, les arbres hors de portée sont cachés ; et
      // ceux qui la portent la portent avec leur modèle LÉGER (la silhouette d'une ombre ne distingue pas les deux, et
      // la passe d'ombre coûte alors deux à trois fois moins de triangles). Tout est remis en place juste après.
      const avant = THREE.BatchedMesh.prototype.onBeforeShadow;
      bm.onBeforeShadow = (...a) => {
        const c = piece.cache, l = piece.legers; c.length = 0; l.length = 0;
        for (const j of M.arbres) {
          const t = this.arbres[j];
          if (t.lod < 0 || t.lod > 1) continue;
          if (!t.ombre) { bm.setVisibleAt(t.id, false); c.push(t.id); } else if (t.lod === 0 && id1 >= 0 && id0 >= 0) { bm.setGeometryIdAt(t.id, id1); l.push(t.id); }
        }
        avant.apply(bm, a);
        for (const id of c) bm.setVisibleAt(id, true);
        for (const id of l) bm.setGeometryIdAt(id, id0);
      };
      M.pieces.push(piece);
    }
    // les instances : même ordre dans chaque pièce (l'identifiant de l'arbre y est le même)
    for (const j of M.arbres) {
      const t = this.arbres[j];
      const sv = t.h / H, f = Math.min(t.R.etale[1], Math.max(t.R.etale[0], t.r * ELARGIR / (Rc * sv)));
      t.sv = sv; t.sh = sv * f;
      matrice(t, _m4);
      for (const pc2 of M.pieces) {
        const id = pc2.bm.addInstance(pc2.id1 >= 0 ? pc2.id1 : pc2.id0);
        t.id = id;
        pc2.bm.setMatrixAt(id, _m4);
        // (les feuilles prennent la couleur de l'exemplaire ; l'écorce et les fleurs, un gris clair au hasard)
        _c.setRGB(...(pc2.feuille && !pc2.saison ? t.col : [0.92 + 0.1 * alea(t.x, t.z, 13), 0.92 + 0.1 * alea(t.x, t.z, 13), 0.92 + 0.1 * alea(t.x, t.z, 13)]));
        pc2.bm.setColorAt(id, _c);
        pc2.bm.setVisibleAt(id, false);
      }
      t.lod = -1;
    }
    for (const pc2 of M.pieces) {
      pc2.bm.computeBoundingSphere();
      pc2.bm.visible = false;
      this.groupe.add(pc2.bm);
      if (pc2.feuille) this.registre.set.add(pc2.bm);
    }
    this.registre.version++;
    // les triangles d'un arbre de ce modèle, complet et léger (le plafond du cadre se compte avec)
    this._trianglesModele(M);
    M.base = base;
    M.leger = !pc;                                // (les pièces du fichier léger : téléphone, voir _carteSaison)
    M.pret = true;
  }

  // ------------------------------------------------------------------ chaque image
  _maj(dt, camera) {
    // la préparation reprend à chaque image (voir _preparer)
    if (this._attentes.length) { const a = this._attentes; this._attentes = []; for (const ok of a) ok(); }
    if (!this.actif || !camera) return;
    const R = reglages(this.scene, this.mobile);
    camera.updateMatrixWorld();
    _pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _fr.setFromProjectionMatrix(_pv);
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    const L0 = R.lod[0], L1 = R.lod[1], loin = camera.far + 10;
    const fog = this.scene.fog, horsBrume = fog ? fog.far + 25 : Infinity;
    // (joueur ou caméra : l'ombre se mesure depuis la caméra, qui suit le joueur à 4 m)
    let tri = 0;
    const proches = this._proches || (this._proches = []);
    proches.length = 0;
    for (const t of this.arbres) {
      const M = this.modeles.get(t.R.modele);
      if (!M || !M.pret) continue;
      const hc = t.y + t.h * 0.55;
      t.d = Math.hypot(t.x - cx, hc - cy, t.z - cz);
      _sph.center.set(t.x, hc, t.z); _sph.radius = Math.max(t.h * 0.6, t.r * 1.3);
      t.dans = _fr.intersectsSphere(_sph);
      const de = t.d * t.taille;
      // le niveau voulu (hystérésis : on garde l'ancien s'il est à moins de HYST de la limite)
      let v = t.d > Math.min(loin, horsBrume) ? -1 : de < L0 ? 0 : de < L1 ? 1 : 2;
      if (this.mobile && v === 0) v = 1;
      if (!M.imp && v === 2) v = 1;                        // pas encore d'imposteur : le modèle léger
      if (t.lodV >= 0 && v >= 0 && v !== t.lodV) {
        const lim = Math.min(v, t.lodV) === 0 ? L0 : L1;
        if (Math.abs(de - lim) < HYST) v = t.lodV;
      }
      t.lodV = v;
      t.ombre = t.d < R.ombre + 5;
      if (t.dans && (v === 0 || v === 1)) { tri += v === 0 ? M.tri0 : M.tri1; proches.push(t); }
    }
    // LE PLAFOND DE TRIANGLES (dans le cadre) : les plus lointains d'abord, complet -> léger -> imposteur. Le plafond
    // du préréglage, moins ce que le reste du cadre dépasse de sa part (relevé toutes les six images : voir _resteDuCadre)
    if ((this._resteAge = (this._resteAge || 0) - 1) <= 0) { this._resteAge = 6; this._reste = this._resteDuCadre(_fr, camera); }
    const plafond = R.tri ? Math.max(R.triVeg * 0.5, Math.min(R.triVeg, R.tri - this._reste)) : R.triVeg;
    if (tri > plafond) {
      proches.sort((a, b) => b.d - a.d);
      for (const t of proches) { if (tri <= plafond) break; if (t.lodV === 0) { const M = this.modeles.get(t.R.modele); tri -= M.tri0 - M.tri1; t.lodV = 1; } }
      for (const t of proches) { if (tri <= plafond) break; const M = this.modeles.get(t.R.modele); if (t.lodV === 1 && M.imp) { tri -= M.tri1; t.lodV = 2; } }
    }
    // appliquer
    const n = [0, 0, 0], vus = new Set();
    let caches = 0;
    for (const t of this.arbres) {
      const M = this.modeles.get(t.R.modele);
      if (!M || !M.pret) continue;
      if (t.lodV !== t.lod) {
        const plein = t.lodV === 0 || t.lodV === 1;
        for (const p of M.pieces) {
          if (plein) {
            const id = t.lodV === 0 ? (p.id0 >= 0 ? p.id0 : p.id1) : (p.id1 >= 0 ? p.id1 : p.id0);
            p.bm.setGeometryIdAt(t.id, id);
          }
          p.bm.setVisibleAt(t.id, plein);
        }
        t.lod = t.lodV;
      }
      if (t.lod >= 0) n[t.lod]++; else caches++;
      if (t.lod === 0 || t.lod === 1) vus.add(M);
    }
    for (const M of this.modeles.values()) for (const p of M.pieces) p.bm.visible = vus.has(M) && (!p.saison || p.saison === this.saison);
    this._majImposteurs(camera);
    this.stats.lod0 = n[0]; this.stats.lod1 = n[1]; this.stats.lod2 = n[2]; this.stats.caches = caches;
    this.stats.triangles = tri;
    if ((this._statsAge = (this._statsAge || 0) + 1) > 5) {
      this._statsAge = 0;
      Monde.stats = { ...(Monde.stats || {}), vegetation: { arbres: this.stats.arbres, complets: n[0], legers: n[1], imposteurs: n[2],
        caches, trianglesDansLeCadre: Math.round(tri), plafond: Math.round(plafond), resteDuCadre: Math.round(this._reste),
        msPhotoImposteur: +(this.stats.msImposteursImage || 0).toFixed(1), etat: this.stats.attente } };
    }
  }

  // CE QUE LE RESTE DU CADRE COÛTE (triangles de la passe principale, hors végétation), pour le plafond ci-dessus : les
  // morceaux des zones (l'ordonnanceur, js/monde_charge.js, tient leurs triangles et leurs boîtes), le sol (ses cellules
  // dans le cadre, au niveau de détail qu'elles ont) et le décor du plateau (relevé toutes les cinq secondes, pour les
  // modèles chargés en différé ; le relevé saute les zones, la végétation, le sol et le ciel : il reste court). Une
  // estimation par boîtes et sphères englobantes, dans le cadre de la caméra et en deçà de camera.far.
  _resteDuCadre(fr, camera) {
    const u = this.scene.userData, far = camera.far, P = camera.position;
    let n = u.ordonnanceur && u.ordonnanceur.trianglesDansLeCadre ? u.ordonnanceur.trianglesDansLeCadre(fr, camera) : 0;
    const sol = u.solParc;
    if (sol && sol.cellules) {
      for (const c of sol.cellules) {
        if (!(c.lod >= 0)) continue;
        _bx.min.set(c.xa + this.dx, -10, c.za); _bx.max.set(c.xb + this.dx, 14, c.zb);
        if (!fr.intersectsBox(_bx) || _bx.distanceToPoint(P) > far) continue;
        const pas = PAS_SOL[c.lod] || 2;
        n += 2 * ((c.xb - c.xa) / pas) * ((c.zb - c.za) / pas);
      }
    }
    const t = performance.now();
    if (!this._decor || t - this._decorT > 5000) { this._decorT = t; this._decor = this._releverDecor(); }
    for (const e of this._decor) {
      const o = e.o;
      // (visible jusqu'à la scène : un groupe caché — les niveaux de détail des vélos, un objet rangé — ne dessine rien)
      let vu = true;
      for (let p = o; p && p !== this.scene; p = p.parent) if (!p.visible || !p.parent) { vu = false; break; }
      if (!vu) continue;
      const bs = o.isInstancedMesh ? o.boundingSphere : o.geometry.boundingSphere;
      if (!bs) continue;
      _sph2.copy(bs).applyMatrix4(o.matrixWorld);
      if ((o.frustumCulled && !fr.intersectsSphere(_sph2)) || _sph2.center.distanceTo(P) - _sph2.radius > far) continue;
      n += e.tri * (o.isInstancedMesh ? o.count : 1);
    }
    return n;
  }
  _releverDecor() {
    const liste = [], sc = this.scene, sol = sc.userData.solParc && sc.userData.solParc.mesh;
    const saute = (o) => o === this.groupe || o === sol || o.userData.ciel || (o.name && (o.name.startsWith('ZONE:') || o.name.startsWith('SIL:')));
    const visiter = (o) => {
      if (saute(o)) return;
      if (o.isMesh && !o.isBatchedMesh && o.geometry && o.geometry.attributes.position) {
        const G = o.geometry;
        if (o.isInstancedMesh) { if (!o.boundingSphere) o.computeBoundingSphere(); } else if (!G.boundingSphere) G.computeBoundingSphere();
        liste.push({ o, tri: (G.index ? G.index.count : G.attributes.position.count) / 3 });
      }
      for (const c of o.children) visiter(c);
    };
    for (const c of sc.children) visiter(c);
    return liste;
  }

  // Les imposteurs dans le cadre : leur matrice (tournés vers la caméra autour de la verticale), les deux vues à lire
  // et leur mélange, l'angle de l'arbre (pour tourner les normales), sa couleur.
  _majImposteurs(camera) {
    const cx = camera.position.x, cz = camera.position.z;
    for (const M of this.modeles.values()) {
      const I = M.imp;
      if (!I) continue;
      let n = 0;
      const A = I.aImp.array, C = I.mesh.instanceColor.array;
      for (const j of M.arbres) {
        const t = this.arbres[j];
        if (t.lod !== 2 || !t.dans) continue;
        const phi = Math.atan2(cx - t.x, cz - t.z);
        let a = (phi - t.rot) / (Math.PI * 2 / VUES);
        a = ((a % VUES) + VUES) % VUES;
        const iA = Math.floor(a) % VUES;
        _p.set(t.x, t.y + ENFOUI, t.z); _q.setFromAxisAngle(_Y, phi); _s.set(I.W * t.sh, I.H * t.sv, 1);
        _m4.compose(_p, _q, _s);
        I.mesh.setMatrixAt(n, _m4);
        A[n * 4] = iA; A[n * 4 + 1] = (iA + 1) % VUES; A[n * 4 + 2] = a - Math.floor(a); A[n * 4 + 3] = t.rot;
        C[n * 3] = t.col[0]; C[n * 3 + 1] = t.col[1]; C[n * 3 + 2] = t.col[2];
        n++;
      }
      I.mesh.count = n; I.mesh.visible = n > 0;
      if (n) { I.mesh.instanceMatrix.needsUpdate = true; I.aImp.needsUpdate = true; I.mesh.instanceColor.needsUpdate = true; }
    }
  }

  // ------------------------------------------------------------------ la photo des imposteurs
  // Huit vues orthographiques du modèle (pied à l'origine, sans rotation), dans deux atlas de 4 x 2 : couleur (sRGB) et
  // normale (linéaire ; alpha = part de feuillage). Le cadre de chaque vue : largeur 2·Rmax, hauteur du pied (y = 0,
  // les racines restent sous terre) au sommet. Rendu hors de la scène du jeu, avec des matériaux d'atelier (bruts, sans
  // lumière) : rien du réglage du renderer n'est changé à la sortie. En trois temps, sur trois images au moins : les
  // programmes de l'atelier (compilés en parallèle), les seize vues (quelques millisecondes), le programme de
  // l'imposteur (en parallèle) ; il ne sert qu'ensuite.
  async _cuireImposteur(M, camJeu) {
    const r = this.renderer, cellule = this.mobile ? 128 : 256, W = cellule * 4, H = cellule * 2, saisonPhoto = this.saison, cartePhoto = carteFeuilles(M);
    try {
      const scene = new THREE.Scene(), mats = [];
      const centre = new THREE.Vector3(0, M.H * 0.62, 0);
      for (const p of M.base) {
        if (triangles(p.geo) < PIECE_MIN) continue;
        // (une pièce de saison n'est photographiée qu'à sa saison : lot C5)
        const ps = pieceDeSaison(p);
        if (ps && ps !== saisonPhoto) continue;
        const m = materiauAtelier(p, centre);
        mats.push(m);
        scene.add(new THREE.Mesh(p.geo, m));
      }
      const cam = new THREE.OrthographicCamera(-M.Rmax, M.Rmax, M.H, 0, 0.1, 6 * Math.max(M.Rmax, M.H));
      const D = 3 * Math.max(M.Rmax, M.H);
      const cible = (srgb) => {
        const rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
          generateMipmaps: true, depthBuffer: true, colorSpace: srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace });
        rt.texture.anisotropy = 4;
        return rt;
      };
      const rtC = cible(true), rtN = cible(false);
      // 1. les programmes de l'atelier, pour la cible où il dessine (les deux modes partagent le même programme : uMode
      // est un uniforme)
      await this._compiler(scene, cam, rtC, scene);
      await this._image();
      // 2. les seize vues
      const t0 = performance.now();
      const avant = { cible: r.getRenderTarget(), auto: r.autoClear, couleur: r.getClearColor(new THREE.Color()), alpha: r.getClearAlpha(), ombres: r.shadowMap.autoUpdate };
      r.autoClear = false; r.shadowMap.autoUpdate = false;
      for (const [rt, mode, fond] of [[rtC, 0, [0.07, 0.09, 0.04]], [rtN, 1, [0.5, 0.75, 0.5]]]) {
        for (const m of mats) m.uniforms.uMode.value = mode;
        rt.scissorTest = false; rt.viewport.set(0, 0, W, H);
        // (le fond : la couleur moyenne d'un feuillage, alpha 0 — là où il n'y a rien, les mipmaps fondent le bord des
        // feuilles vers ce vert, pas vers du noir. setClearColor de three multiplierait la couleur par l'alpha, nul : on
        // passe par l'état du renderer, sans prémultiplier, et setClearColor remet tout en place à la sortie)
        r.setRenderTarget(rt); r.state.buffers.color.setClear(fond[0], fond[1], fond[2], 0, false); r.clear(true, true, false);
        for (let v = 0; v < VUES; v++) {
          const a = v * Math.PI * 2 / VUES, col = v % 4, lig = Math.floor(v / 4);
          cam.position.set(Math.sin(a) * D, 0, Math.cos(a) * D); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0);
          cam.updateMatrixWorld();
          rt.viewport.set(col * cellule, lig * cellule, cellule, cellule); rt.scissor.set(col * cellule, lig * cellule, cellule, cellule); rt.scissorTest = true;
          r.setRenderTarget(rt);
          r.clearDepth();
          r.render(scene, cam);
        }
        rt.scissorTest = false; rt.viewport.set(0, 0, W, H);
      }
      r.setRenderTarget(avant.cible); r.autoClear = avant.auto; r.setClearColor(avant.couleur, avant.alpha); r.shadowMap.autoUpdate = avant.ombres;
      for (const m of mats) m.dispose();
      const I = this._imposteur(M, rtC, rtN, TRANS[M.nom] || 0.3);
      this.stats.msImposteursImage = Math.max(this.stats.msImposteursImage || 0, performance.now() - t0);
      // 3. son programme, puis il sert
      await this._compiler(I.mesh, camJeu);
      await this._image();
      M.imp = I; M.saisonImp = saisonPhoto; M.carteImp = cartePhoto;
      // (la saison a changé pendant la photo : on la refait, celle-ci sert en attendant)
      if ((saisonPhoto !== this.saison && M.pieces.some((p) => p.saison)) || cartePhoto !== carteFeuilles(M)) this._rephotographier(M);
    } catch (e) {
      console.warn(`[parc] imposteur de « ${M.nom} » impossible : ses arbres lointains restent en modèle léger`, e);
      M.impEchec = true;
    }
  }

  // L'InstancedMesh des imposteurs d'un modèle (un panneau de 1 x 1, pied au milieu du bord bas).
  _imposteur(M, rtC, rtN, trans) {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);
    const n = M.arbres.length;
    const aImp = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    aImp.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aImp', aImp);
    const mat = materiauImposteur(rtC.texture, rtN.texture, trans, this.mobile ? 128 : 256);
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.name = `arbres lointains : ${M.nom}`;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.setColorAt(0, _c.setRGB(1, 1, 1));
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
    mesh.userData.dynamique = true; mesh.userData.nofuse = true; mesh.userData.arbre = M.nom;
    this.groupe.add(mesh);
    this.registre.set.add(mesh); this.registre.version++;
    // le cadre du panneau (unités du fichier) : 2·Rmax de large, H de haut
    return { mesh, aImp, W: 2 * M.Rmax, H: M.H, rtC, rtN };
  }

  // Le coût, pour les mesures : triangles par niveau de chaque modèle.
  bilan() {
    const t = {};
    for (const M of this.modeles.values()) t[M.nom] = { arbres: M.arbres.length, pieces: M.pieces.length, lod0: M.tri0, lod1: M.tri1, imposteur: !!M.imp };
    console.table(t);
    return t;
  }
}

// La matrice d'un arbre : pied sur le sol, tourné de `rot`, hauteur `sv`, largeur `sh` (unités du fichier -> mètres).
function matrice(t, m4) {
  return m4.compose(_p.set(t.x, t.y, t.z), _q.setFromAxisAngle(_Y, t.rot), _s.set(t.sh, t.sv, t.sh));
}
function triangles(g) { return (g.index ? g.index.count : g.attributes.position.count) / 3; }
// La saison d'une pièce de modèle (lot C5) : les fleurs (matériau « …fleurs ») ne se montrent qu'au printemps.
function pieceDeSaison(p) { return /fleurs/i.test((p.mat && p.mat.name) || '') ? 'printemps' : null; }
// La carte de feuillage affichée d'un modèle (relecture du lot C5 : elle change avec la saison, voir _carteSaison)
function carteFeuilles(M) { const p = M.pieces.find((x) => x.feuille && !x.saison); return p ? p.bm.material.map : null; }

// Deux géométries (PC et légère) prêtes pour le même BatchedMesh : les mêmes attributs (ceux qu'elles ont toutes deux),
// en Float32 (un attribut entier normalisé est ramené à sa valeur), indexées. Les originales ne sont pas touchées (le
// plateau s'en sert aussi).
function accorder(geos) {
  const noms = Object.keys(geos[0].attributes).filter((k) => geos.every((g) => g.attributes[k] && g.attributes[k].itemSize === geos[0].attributes[k].itemSize));
  return geos.map((g) => {
    const c = new THREE.BufferGeometry();
    for (const k of noms) {
      const a = g.attributes[k];
      if (a.array instanceof Float32Array && !a.isInterleavedBufferAttribute) c.setAttribute(k, a);
      else {
        const f = new Float32Array(a.count * a.itemSize);
        for (let i = 0; i < a.count; i++) for (let j = 0; j < a.itemSize; j++) f[i * a.itemSize + j] = a.getComponent(i, j);
        c.setAttribute(k, new THREE.BufferAttribute(f, a.itemSize));
      }
    }
    if (g.index) c.setIndex(g.index);
    else { const n = g.attributes.position.count, ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i; c.setIndex(new THREE.BufferAttribute(ix, 1)); }
    return c;
  });
}

// LE PIED DES TRONCS (relecture R2 : des POINTES triangulaires sombres au pied des tilleuls du bosquet, PV19). Le
// tilleul du fichier plonge ses racines sous y = 0 en quelques lames minces, longues de deux mètres, qui partent du fût
// en ARÊTES jusqu'à 0,08 H au-dessus du sol. Sur le gazon plat du plateau, on n'en voit que l'évasement ; mais ici
// l'arbre est étiré en largeur (la couronne du LiDAR : jusqu'à 1,6 fois sa hauteur, le fût s'élargit d'autant) et posé
// sur un sol qui n'est jamais tout à fait plat. Dans le modèle léger surtout (celui des arbres de 25 à 60 m, et des
// proches quand le plafond de triangles les rétrograde), chaque arête est un triangle plat, une LAME qui se dresse à
// côté du fût, à l'écart de sa silhouette, du sol jusqu'à deux ou trois mètres : la pointe sombre de PV19, vue de
// profil. Et sur le coteau, tout le chevelu du côté aval sort à l'air.
// Ici, sur les copies du parc entier (le plateau garde ses modèles intacts), tout ce qui est sous `haut` est ramené
// dans l'ENVELOPPE DU FÛT, celle qu'il a juste au-dessus des arêtes, côté par côté (le fût n'est pas rond : une
// enveloppe ronde laissait passer les lames du côté étroit), avec un évasement doux qui grandit jusqu'au ras du sol,
// puis un fût qui s'enfonce droit (sur la pente, c'est ce qu'on voit d'un vrai tronc). Les lames se couchent contre
// l'écorce : il en reste les nervures de l'évasement, plus aucune pointe. Les normales des sommets rentrés sont remises
// à l'horizontale (la lame couchée ne s'éclaire plus en biais).
// `pied` = { haut, evase, rayon } (fractions de H) : au-dessus de `haut`, rien ne bouge ; en dessous, la distance à
// l'axe (le centre de la coupe juste au-dessus de `haut`) est bornée à enveloppe·(1 + evase·s), s allant de 0 à `haut`
// à 1 au ras du sol (ou 0,055 H plus bas si `haut` est déjà sous le sol), puis constant. L'enveloppe : par secteurs de
// 15°, le plus grand rayon de la coupe du fût par quatre plans, de `haut` à `haut` + 0,04 H ; ou un cercle de `rayon`.
function apprivoiserPied(g, H, { haut, evase, rayon = 0 }) {
  const P = g.attributes.position, N = g.attributes.normal, I = g.index;
  const yh = haut * H, ys = yh > 0 ? 0 : yh - 0.055 * H, NB = 24;
  // l'axe : le centre du fût, juste au-dessus de `haut`
  let cx = 0, cz = 0, n = 0;
  for (let i = 0; i < P.count; i++) {
    const y = P.getY(i);
    if (y >= yh && y < yh + 0.04 * H) { cx += P.getX(i); cz += P.getZ(i); n++; }
  }
  if (n) { cx /= n; cz /= n; }
  const secteur = (dx, dz) => ((Math.atan2(dz, dx) / (Math.PI * 2) + 1) % 1) * NB;
  // l'enveloppe, secteur par secteur
  const env = new Float32Array(NB).fill(rayon * H);
  if (!rayon && I) {
    env.fill(0);
    for (let k = 0; k < 4; k++) {
      const c = yh + (0.005 + 0.01 * k) * H;
      for (let t = 0; t < I.count; t += 3) for (let e = 0; e < 3; e++) {
        const a = I.getX(t + e), b = I.getX(t + (e + 1) % 3), ya = P.getY(a), yb = P.getY(b);
        if ((ya - c) * (yb - c) >= 0) continue;
        const f = (c - ya) / (yb - ya), dx = P.getX(a) + (P.getX(b) - P.getX(a)) * f - cx, dz = P.getZ(a) + (P.getZ(b) - P.getZ(a)) * f - cz;
        const s = Math.floor(secteur(dx, dz)) % NB;
        env[s] = Math.max(env[s], Math.hypot(dx, dz));
      }
    }
    // (un secteur sans coupe prend le plus petit de ses voisins ; puis chaque secteur, le plus grand de lui et de ses
    // deux voisins : une écorce à facettes larges ne laisse pas de creux entre deux secteurs)
    const vide = Math.max(...env) * 0.5;
    const e0 = env.map((v, s) => {
      if (v > 0) return v;
      const l = [1, 2, 3].flatMap((k) => [env[(s + k) % NB], env[(s - k + NB) % NB]]).filter((x) => x > 0);
      return l.length ? Math.min(...l) : vide;
    });
    for (let s = 0; s < NB; s++) env[s] = Math.max(e0[s], e0[(s + 1) % NB], e0[(s + NB - 1) % NB]);
  }
  // des copies : la géométrie d'origine (partagée avec le plateau) n'est pas touchée
  const Q = P.clone(), M2 = N ? N.clone() : null;
  let rentres = 0;
  for (let i = 0; i < Q.count; i++) {
    const y = Q.getY(i);
    if (y >= yh) continue;
    const dx = Q.getX(i) - cx, dz = Q.getZ(i) - cz, d = Math.hypot(dx, dz);
    if (d < 1e-9) continue;
    const u = secteur(dx, dz), s0 = Math.floor(u) % NB, w = u - Math.floor(u);
    const r0 = env[s0] * (1 - w) + env[(s0 + 1) % NB] * w;
    const t = Math.min(1, Math.max(0, (y - yh) / (ys - yh))), lim = r0 * (1 + evase * t * t * (3 - 2 * t));
    if (d <= lim) continue;
    Q.setX(i, cx + dx * lim / d); Q.setZ(i, cz + dz * lim / d);
    if (M2) { const l = Math.hypot(dx, 0.12 * d, dz); M2.setXYZ(i, dx / l, 0.12 * d / l, dz / l); }
    rentres++;
  }
  if (!rentres) return g;
  g.setAttribute('position', Q);
  if (M2) g.setAttribute('normal', M2);
  return g;
}

// Le hasard déterministe du parc (même formule que js/court_parc.js et js/parc/kit.js)
function alea(x, z, k = 0) {
  const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

// ============================================================================================ les matériaux
// L'atelier de l'imposteur : la pièce telle que son matériau la peint (carte, couleur, couleurs de sommets, teinte de la
// famille, découpe), sans lumière (uMode 0), ou sa normale dans le repère du modèle (uMode 1). Les feuilles ont une
// normale penchée vers le dehors de la couronne (centre `centre`) : vue de loin, une couronne s'éclaire comme une boule
// de feuillage, pas comme un nuage de cartes orientées au hasard.
function materiauAtelier(p, centre) {
  const m = p.mat, vcol = !!(p.geo.attributes.color && m.vertexColors);
  const teinte = (m.userData.teinte && m.userData.teinte.value) || new THREE.Matrix3();
  return new THREE.ShaderMaterial({
    uniforms: { tMap: { value: m.map || null }, uCouleur: { value: new THREE.Vector3(m.color.r, m.color.g, m.color.b) },
      uTeinte: { value: teinte }, uSeuil: { value: m.alphaTest > 0 ? m.alphaTest : 0.5 }, uMode: { value: 0 },
      uCentre: { value: centre }, uFeuille: { value: p.feuille ? 1 : 0 }, uCarte: { value: m.map ? 1 : 0 } },
    defines: vcol ? { VCOL: '' } : {},
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      #ifdef VCOL
      attribute vec3 color; varying vec3 vC;
      #endif
      void main() {
        vUv = uv; vN = normal; vP = position;
        #ifdef VCOL
        vC = color;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D tMap; uniform vec3 uCouleur; uniform mat3 uTeinte; uniform float uSeuil, uFeuille, uCarte;
      uniform int uMode; uniform vec3 uCentre;
      varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      #ifdef VCOL
      varying vec3 vC;
      #endif
      void main() {
        vec4 t = uCarte > 0.5 ? texture2D(tMap, vUv) : vec4(1.0);
        if (t.a < uSeuil) discard;
        if (uMode == 0) {
          vec3 c = t.rgb * uCouleur;
          #ifdef VCOL
          c *= vC;
          #endif
          gl_FragColor = vec4(max(uTeinte * c, 0.0), 1.0);
        } else {
          vec3 n = normalize(vN);
          if (!gl_FrontFacing) n = -n;
          if (uFeuille > 0.5) n = normalize(mix(n, normalize(vP - uCentre), 0.62));
          gl_FragColor = vec4(n * 0.5 + 0.5, uFeuille);
        }
      }`,
    side: THREE.DoubleSide,
  });
}

// L'imposteur : un MeshStandardMaterial (donc la lumière, l'ombre des nuages, la carte d'environnement et le brouillard
// de toute la scène), dont la couleur et la normale sont lues dans les atlas. Par instance (attribut aImp) : les deux
// vues (x, y), leur mélange (z), l'angle de l'arbre (w). La couleur de l'exemplaire (instanceColor) multiplie l'albédo,
// comme sur les arbres complets. Le vent : le haut du panneau oscille doucement, au même vent que les feuilles.
function materiauImposteur(tCouleur, tNormale, trans, cellule) {
  const m = new THREE.MeshStandardMaterial({ map: tCouleur, alphaTest: 0.5, roughness: 0.86, metalness: 0 });
  m.name = 'imposteur d\'arbre';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tNormImp = { value: tNormale }; sh.uniforms.uTransImp = { value: trans }; sh.uniforms.uVent = VENT;
    sh.uniforms.uCelluleImp = { value: cellule };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 aImp;
        uniform float uVent;
        varying vec2 vUvA; varying vec2 vUvB; varying float vMixImp; varying float vYawImp;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vUvA = (vec2(mod(aImp.x, 4.0), floor(aImp.x / 4.0)) + uv) * vec2(0.25, 0.5);
        vUvB = (vec2(mod(aImp.y, 4.0), floor(aImp.y / 4.0)) + uv) * vec2(0.25, 0.5);
        vMixImp = aImp.z; vYawImp = aImp.w;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 piedImp = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          float fImp = uVent * 1.2 + piedImp.x * 0.3 + piedImp.z * 0.25;
          transformed.x += (sin(fImp) * 0.012 + sin(fImp * 2.7) * 0.004) * uv.y * uv.y;
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D tNormImp; uniform float uTransImp, uCelluleImp;
        varying vec2 vUvA; varying vec2 vUvB; varying float vMixImp; varying float vYawImp;
        float feuilleImp = 1.0;`)
      .replace('#include <map_fragment>', `
        float tImp = smoothstep(0.2, 0.8, vMixImp);
        vec4 couleurImp = mix(texture2D(map, vUvA), texture2D(map, vUvB), tImp);
        // (au loin, la découpe moyennée par les mipmaps passerait sous le seuil : la couronne se trouerait)
        vec2 txImp = vUvA * vec2(4.0, 2.0) * uCelluleImp;
        float mipImp = max(0.0, 0.5 * log2(max(dot(dFdx(txImp), dFdx(txImp)), dot(dFdy(txImp), dFdy(txImp)))));
        couleurImp.a *= 1.0 + 0.3 * mipImp;
        diffuseColor *= couleurImp;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec4 nImp = mix(texture2D(tNormImp, vUvA), texture2D(tNormImp, vUvB), tImp);
          vec3 nl = normalize(nImp.xyz * 2.0 - 1.0);
          float cI = cos(vYawImp), sI = sin(vYawImp);
          vec3 nw = vec3(nl.x * cI + nl.z * sI, nl.y, -nl.x * sI + nl.z * cI);
          normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz);
          feuilleImp = nImp.a;
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * uTransImp * feuilleImp;`);
  };
  m.customProgramCacheKey = () => 'imposteur-arbre';
  return m;
}
