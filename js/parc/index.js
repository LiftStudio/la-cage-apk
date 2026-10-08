// =====================================================================
//  LE PARC DE BÉCON EN ENTIER : l'installation (chantier « parc complet »)
// =====================================================================
// Le point d'entrée du parc entier, appelé par js/court.js (buildArena) pour les terrains `parc` et `parc2`, et
// seulement quand le DRAPEAU est levé (settings.game.parcEntier, ou ?parc=entier dans l'adresse : js/settings.js,
// PARC_ENTIER). Drapeau baissé, ce module ne charge rien, n'installe rien et rend null : le parc garde exactement
// le décor d'aujourd'hui.
//
// Drapeau levé, dans l'ordre (lot A2) :
//   1. AU CHARGEMENT DU MODULE, les données du monde (js/monde_donnees.js : relief, nappes, drapeaux, carte des sols).
//      Le décor du parc se construit d'un bloc au démarrage (constructeur de Game) : elles doivent être là AVANT. On
//      les attend donc au premier niveau du module (await : l'écran de chargement reste affiché, comme pour les
//      textures cuites de js/tex_cuites.js), au plus ATTENTE_MAX ; au-delà, ou si un fichier manque, le parc garde
//      son décor d'aujourd'hui et le dit dans la console.
//   2. installerParcComplet, AVANT le décor du plateau (buildParc) : le monde à relief (Monde.installer, js/monde.js)
//      et son sol (js/monde_sol.js). Le décor du plateau s'y pose ensuite : js/court_parc.js lit `!Monde.plat` pour
//      sauter ce que le parc entier remplace (la pelouse de 300 m, le faux parc haut derrière le mur, le jardin supposé,
//      le fond des platanes, le quai et la Seine d'aujourd'hui) et pour poser sur le relief ce qu'il garde (talus du
//      pin, stabilisé et platanes de l'esplanade, pied du rideau du quai).
//   3. apresDecor, juste après buildParc : ce qui dépend des repères que buildParc vient d'écrire — la balade s'étend
//      à tout le monde, les obstacles du décor du plateau rejoignent ceux du monde, le sol se mouille sous la pluie.
//
// LES OBSTACLES (lot A3, js/monde_collisions.js), TOUS dès l'installation (conception, § 0, D10) : ceux de monde.json
// (grilles de l'enceinte, balustrades, parapets, portillons, bâtiments, manège), ceux de TOUTES les zones enregistrées
// (zone.obstacles(o), construites ou non), les troncs des arbres de arbres.bin ; puis, dans apresDecor, ceux que le
// décor du plateau déclare en se construisant (grillages et leurs portillons, troncs des platanes, du pin et du rideau
// du quai, haie du quai, grillage du haut du mur : scene.userData.obstaclesDecor, js/court_parc.js).
//
// LES ZONES (lots B) s'enregistrent dans ZONES (conception, § 3.3) : leurs obstacles, bancs et lieux sont lus dès
// l'installation, leurs morceaux construits en jouant (lot A5).
//
// LE CHARGEMENT (lot A5) : l'ordonnanceur de js/monde_charge.js construit les morceaux des zones en tranches, du plus
// proche au plus lointain, en jouant, et les défait derrière le joueur ; au démarrage, les silhouettes et ce qui touche
// la cellule du plateau et ses huit voisines. LES ARBRES (js/monde_vegetation.js) : tous ceux de arbres.bin, en trois
// niveaux de détail ; leurs modèles sont demandés dès le chargement de ce module, en même temps que les données.
import { Monde } from '../monde.js';
import { obstaclesDesZones, troncsDesArbres } from '../monde_collisions.js';
import { chargerMonde } from '../monde_donnees.js';
import { SolParc } from '../monde_sol.js';
import { Ordonnanceur, reglages } from '../monde_charge.js';
import { OmbresMonde } from '../monde_ombres.js';
import { VueMonde } from '../monde_vue.js';
import { Vegetation, prechargerArbres } from '../monde_vegetation.js';
import { PARC_ENTIER, settings } from '../settings.js';
import { texturesSolParc } from '../court_parc.js';
import { PassantsParc } from '../pedestrians.js';
import { brancherOptionsParc } from './options.js';
import { CielHaut } from './ciel_haut.js';

// Au-delà, on n'attend plus les données (réseau coupé, hors ligne sans cache) : le parc garde son décor d'aujourd'hui.
const ATTENTE_MAX = 12000;
const TERRAIN = settings.game.terrain || 'becon';
const ACTIF = PARC_ENTIER && (TERRAIN === 'parc' || TERRAIN === 'parc2');
// le kit du parc (js/parc/kit.js), pour les zones : chargé seulement drapeau levé (drapeau baissé, rien ne change)
const kit = ACTIF ? await import('./kit.js') : null;

// Les zones du parc (lots B) : { id, nom, emprise, morceaux, obstacles(o), bancs(b), lieux } — voir la conception.
// Chaque lot de zone ajoute UNE ligne d'import en tête de la liste ci-dessous et son nom dans ZONES (ordre des numéros).
// ZONES — (les lots B ajoutent ici leurs imports : import zNN from './zones/zNN_nom.js';)
import z02 from './zones/z02_esplanade_charras.js';
import z03 from './zones/z03_promenade.js';
import z04 from './zones/z04_butte_pin.js';
import z05 from './zones/z05_terrasse_bassin.js';
import z06 from './zones/z06_axe_chateau.js';
import z07 from './zones/z07_jardin_fontaine.js';
import z08 from './zones/z08_city_stade.js';
import z09 from './zones/z09_theatre.js';
import z10 from './zones/z10_coteau_nord.js';
import z11 from './zones/z11_coteau_sud.js';
import z12 from './zones/z12_placette.js';
import z13 from './zones/z13_perspective.js';
import z14 from './zones/z14_haut_nord_est.js';
import z15 from './zones/z15_musee.js';
import z16 from './zones/z16_bosquet.js';
import z17 from './zones/z17_allee_haute.js';
import z18 from './zones/z18_boulevard.js';
import z19 from './zones/z19_quai_seine.js';
import z20 from './zones/z20_pourtour.js';
export const ZONES = [
  // ZONES — (et ici leurs noms, un par ligne : zNN,)
  z02,
  z03,
  z04,
  z05,
  z06,
  z07,
  z08,
  z09,
  z10,
  z11,
  z12,
  z13,
  z14,
  z15,
  z16,
  z17,
  z18,
  z19,
  z20,
];

// Diagnostic : window.__parcEntier (drapeau, données, temps de chargement et d'installation).
const etat = { drapeau: PARC_ENTIER, actif: ACTIF, donnees: null, msChargement: 0, erreur: null };
if (typeof window !== 'undefined') window.__parcEntier = etat;

let DONNEES = null;
if (ACTIF) {
  // les modèles des arbres (lot A5) : en route tout de suite, sans les attendre (les arbres paraissent à leur arrivée)
  prechargerArbres();
  const t0 = performance.now();
  let minuterie = 0;
  const chargement = chargerMonde(), delai = new Promise((_, ko) => {
    minuterie = setTimeout(() => ko(new Error(`plus de ${ATTENTE_MAX / 1000} s d'attente`)), ATTENTE_MAX);
  });
  chargement.catch(() => {}); delai.catch(() => {});          // (le perdant de la course n'a plus d'importance)
  try {
    DONNEES = await Promise.race([chargement, delai]);
    etat.donnees = DONNEES.hash || '?';
  } catch (e) {
    etat.erreur = String((e && e.message) || e);
    console.warn('[parc] données du parc entier indisponibles, le parc garde son décor d\'aujourd\'hui :', etat.erreur);
  }
  clearTimeout(minuterie);
  etat.msChargement = Math.round(performance.now() - t0);
}

// Le monde à relief et son sol, avant le décor du plateau. `variante` : 1 (terrain `parc`) ou 2 (`parc2`, tout le décor
// décalé de repere.dxParc2). Rend null quand le parc entier n'est pas actif (drapeau baissé, données absentes) : rien
// n'a été touché. Sinon, un objet dont on appelle apresDecor() une fois buildParc passé. `renderer` : celui du jeu (les
// imposteurs des arbres lointains sont photographiés avec lui ; sans lui, ces arbres restent en modèle léger).
export function installerParcComplet(scene, K, variante = 1, renderer = null) {
  if (!DONNEES) return null;
  const t0 = performance.now();
  const dx = variante === 2 ? (DONNEES.repere.dxParc2 ?? 16.1) : 0;
  // le monde et TOUS ses obstacles connus avant le décor (voir plus haut) ; les bancs et les lieux des zones aussi
  const obstacles = [...(DONNEES.obstacles || [])];
  obstaclesDesZones(ZONES, obstacles);
  troncsDesArbres(DONNEES.tableArbres, DONNEES.essences, obstacles);
  const bancs = [...(DONNEES.bancs || [])], lieux = [...(DONNEES.lieux || [])];
  for (const z of ZONES) {
    if (typeof z.bancs === 'function') { try { z.bancs(bancs); } catch (e) { console.warn(`[parc] bancs de la zone ${z.id} ignorés :`, e); } }
    if (Array.isArray(z.lieux)) lieux.push(...z.lieux);
  }
  const monde = { ...DONNEES, obstacles, bancs, lieux };
  Monde.installer(monde, { dx });
  scene.userData.trottinettesMonde = DONNEES.trottinettes || [];     // (lot C4 : T1 et T2, posées par js/game.js)
  const sol = new SolParc(scene, DONNEES, { dx, textures: texturesSolParc(K) });
  // l'ordonnanceur des morceaux (lot A5) : son début d'image passe AVANT le sol, pour que le budget de construction de
  // l'image compte aussi le temps que le sol vient de prendre
  const ordonnanceur = new Ordonnanceur({ scene, K, kit, zones: ZONES, donnees: DONNEES, dx, lod: settings.graphics?.quality || 'auto' });
  Monde.taches.push(ordonnanceur.debutImage);
  Monde.taches.push(sol.maj);
  scene.userData.solParc = sol;
  scene.userData.ordonnanceur = ordonnanceur;
  // CE QUE LA CAMÉRA DESSINE (lot R1, js/monde_vue.js) : les lots de dessin des morceaux et des silhouettes, l'occultation
  // par le relief, le décor du plateau au loin. Créée avant le démarrage de l'ordonnanceur (les silhouettes y entrent).
  const vue = new VueMonde({ scene, renderer, ordonnanceur, dx });
  ordonnanceur.vue = vue;
  scene.userData.vueMonde = vue;
  etat.msInstallation = Math.round(performance.now() - t0);
  console.info(`[parc] parc entier installé (données ${DONNEES.hash}, ${DONNEES.msChargement} ms de chargement) : sol de ${sol.cellules.length} cellules en ${sol.msInstallation} ms`);
  return {
    sol,
    apresDecor() {
      const rep = scene.userData.reperes || (scene.userData.reperes = {});
      // LA BALADE S'ÉTEND À TOUT LE MONDE : la grille de sol, 1 m de marge (le joueur y est ramené, comme au bord de
      // la zone de balade d'un terrain ordinaire). Ce qui l'arrête en route (murs, massifs, eau, grilles déclarées dans
      // les données), c'est js/monde.js (franchir, resoudre) ; les obstacles des zones et les portillons : lot A3.
      const R = DONNEES.repere, m = 1;
      rep.yard = { xMin: R.x0 + dx + m, xMax: R.x0 + R.pas * (R.nx - 1) + dx - m, zMin: R.z0 + m, zMax: R.z0 + R.pas * (R.nz - 1) - m };
      rep.parcEntier = true;
      // LES OBSTACLES DU DÉCOR DU PLATEAU (repère du jeu : x - dx pour le repère des données), ajoutés à ceux du monde
      // en le réinstallant (même sol, mêmes listes : seule la grille des obstacles est refaite, quelques millisecondes)
      const decor = scene.userData.obstaclesDecor || [];
      if (decor.length) {
        const t1 = performance.now();
        const enRepere = decor.map((o) => (o.t === 's' ? { ...o, x0: o.x0 - dx, x1: o.x1 - dx } : { ...o, x: o.x - dx }));
        Monde.installer({ ...monde, obstacles: [...obstacles, ...enRepere] }, { dx });
        etat.obstacles = { monde: obstacles.length, decor: decor.length, ms: Math.round(performance.now() - t1) };
      }
      // le sol du parc se mouille sous la pluie comme les autres (js/court.js le range dans env.wetMats)
      (scene.userData.solsParc || (scene.userData.solsParc = [])).push(sol.materiau);
      // LES MORCEAUX DES ZONES (lot A5) : au démarrage, les silhouettes et le voisinage du plateau ; le reste en jouant
      const t1 = performance.now();
      ordonnanceur.demarrer();
      Monde.taches.push(ordonnanceur.maj);
      // LES ARBRES de arbres.bin (lot A5), posés dès que leurs modèles sont là
      const vegetation = new Vegetation(scene, DONNEES, { dx, renderer, kit });
      Monde.taches.push(vegetation.maj);
      scene.userData.vegetation = vegetation;
      // LES OPTIONS DU PARC (lot C5, js/parc/options.js : bassin en eau, saison) se changent en jouant
      brancherOptionsParc({ ordonnanceur, vegetation });
      // LES PROMENEURS (lot C1, js/pedestrians.js : PassantsParc) sur le graphe des allées de monde.json, à la hauteur du
      // sol, jusqu'aux bancs des zones (Monde.bancs, complet ici ; l'ordonnanceur dit lesquels sont construits). Rangés où
      // La Cage range ses passants : l'animation de la scène (js/court.js) les fait avancer et optimiserDecor protège leur
      // groupe ; Monde.maj leur donne la caméra.
      if (DONNEES.graphe && DONNEES.graphe.noeuds && DONNEES.graphe.noeuds.length) {
        const passants = new PassantsParc(scene, DONNEES.graphe, { dx, reglages: () => reglages(scene), ordonnanceur });
        scene.userData.pedestrians = passants;
        Monde.taches.push(passants.suivre);
      }
      // LES OMBRES SUR 300 M (lot A6, js/monde_ombres.js) : la carte du soleil qui suit le joueur, la carte lointaine
      // cuite, la zone d'ombre forcée du plateau, le sol cuit par cellule. En dernier : elles lisent ce que l'ordonnanceur
      // et les arbres viennent de décider (qui porte une ombre).
      if (renderer) {
        const ombres = new OmbresMonde({ scene, renderer, donnees: DONNEES, dx, ordonnanceur, vegetation, sol, reglages });
        Monde.taches.push(ombres.maj);
        scene.userData.ombresMonde = ombres;
        // LA CARTE « TERRAIN DÉGAGÉ » du haut du parc (lot C5, js/parc/ciel_haut.js), fondue dans celle du plateau
        const ciel = new CielHaut({ scene, renderer, dx });
        Monde.taches.push(ciel.maj);
        scene.userData.cielHaut = ciel;
      }
      // (lot R1) la vue en dernier : elle lit ce que l'ordonnanceur vient d'afficher
      Monde.taches.push(vue.maj);
      etat.msZones = Math.round(performance.now() - t1);
    },
  };
}
