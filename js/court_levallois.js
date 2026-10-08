import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COURT } from './config.js';
import { Pedestrians } from './pedestrians.js';
// les photos CC0 des sols du parc de Becon (herbe, stabilise, terre) : memes fichiers, aucune image de plus
import { poserSurfacesParc } from './surfaces_parc.js';
import { horizonLevallois } from './horizon_levallois.js';      // lot L12 : immeubles et rideau d'arbres à l'horizon
// moitie moins de passants sur telephone : ce sont des bonshommes articules mis a jour a chaque image
const MOBILE_DECOR = TELEPHONE;   // js/appareil.js : la même détection pour tout le jeu (et `?tel=1`)

// =====================================================================
//  TERRAIN N°2 — PLAYGROUND RUDY GOBERT, LEVALLOIS-PERRET
//  Quai Michelet, au bord de la Seine. Reconstitué d'après les photos envoyées : la vue aérienne, les deux
//  vues depuis le terrain et celle de la berge.
//
//  Ce qui définit ce terrain et qu'il fallait rendre :
//    - le SOL PEINT. Pas des lignes sur du bitume : une fresque qui couvre toute l'enceinte, murets compris —
//      aplats rouge / jaune / bleu / sarcelle, bandes de « passage piéton » blanches lancées en biais, taches
//      rouges avec une étoile, et par-dessus le grand dessin au trait blanc d'un joueur qui va dunker.
//    - les MURETS peints tout autour, et le GRADIN jaune d'un côté avec « WRITE YOUR OWN STORY » au pochoir.
//    - le GRILLAGE vert foncé avec sa bâche noire, et les MÂTS BLANCS COURBES, très reconnaissables.
//    - la SEINE juste derrière, la péniche à quai, la berge d'en face et ses immeubles, La Défense au loin.
//
//  Les dimensions de jeu ne changent pas (mêmes ENC, mêmes paniers, mêmes repères) : on change de décor, pas
//  de règles. Tout ce qui est calibré sur le terrain — l'IA, les caméras, le cercle bleu, l'entraînement, le
//  marchand — continue de marcher à l'identique.
// =====================================================================

const rnd = (a, b) => a + Math.random() * (b - a);
import { TELEPHONE } from './appareil.js';

// ---------------------------------------------------------------------
//  L'EMPRISE DU BORD DE TERRAIN — la contrainte qui commande tout le reste.
//
//  Entre la ligne de touche (x = 7,5) et le grillage (ENC.X + 0,55 = 10,15) il n'y a que 2,65 m. Or les photos
//  demandent, du meme cote, un gradin de quatre rangs (pres de 2 m de profondeur) et, sur les trois autres
//  cotes, des murets BANQUES dont la pente mange encore un metre. Autrement dit : sur ce terrain-la on ne peut
//  pas se promener partout, exactement comme dans la realite — on ne marche pas sur les gradins.
//
//  Ces constantes sont donc la source unique de verite : le decor s'y cale, et la ZONE DE BALADE s'y cale
//  aussi (scene.userData.reperes.yard, lu par js/game.js). Elles doivent rester coherentes entre elles.
// ---------------------------------------------------------------------
// `x0` (la face avant) est RECALCULEE au moment de la construction : le gradin est adosse au grillage, donc
// sa position depend de la largeur de l'enceinte, qui n'est connue qu'apres appliquerTerrain() (js/config.js).
// La valeur ecrite ici n'est qu'un defaut ; voir calerGradin().
// QUATRE rangs, et le dernier est different des autres. J'etais passe de quatre a trois parce que le
// gradin depassait le haut du mur ; c'etait la mauvaise correction. Sur place il y a bien quatre
// niveaux — mais le DERNIER n'est pas un banc : c'est le couronnement, une bande pleine sans planche
// d'assise claire. De face on lit donc trois liserés blancs et une quatrieme bande unie, et c'est
// exactement ce qu'on comptait a tort pour trois rangs.
// `long` remonte ici depuis buildGradin : la boite d'obstacle doit avoir EXACTEMENT la longueur du
// gradin dessine, sinon l'une des deux bouge sans l'autre le jour ou on le raccourcit.
const GRADIN = { x0: -9.5, rangs: 4, h: 0.42, p: 0.74, long: 25.4 };   // face avant, rangs, contremarche, giron, longueur
// Le container remonte ici pour la meme raison : il est pose par murets() et bloque depuis
// buildLevallois(), deux fonctions differentes. Une seule source, sinon le solide et sa boite divergent.
// Tourne d'un quart de tour, sa LONGUEUR est sur Z et sa PROFONDEUR sur X.
const CONT = { L: 3.05, H: 2.28, P: 2.1, z: -14.4 };
// La poubelle du coin. Sur la photo elle est posee SUR LA BANDE DE BETON, adossee au mur du fond, a peu
// pres au droit de l'endroit ou le rouge du mur passe au blanc — donc a un metre et demi du bas des bancs,
// pas collee contre eux. Elle marque la fin de la bande claire.
// Elle est COLLEE AU BOUT DES BANCS, dans l'angle, pas au milieu du degagement. Depuis que le gradin a
// avance a 9,50 m de l'axe, la laisser a -9,92 la mettait en plein passage, a deux metres des bancs.
// On la recale au droit du gradin, contre le mur du fond.
// Recalee sur la photo du coin (20/09, 20 h 05) : devant le pan BLANC du retour, dos au mur, a une
// soixantaine de centimetres de la rampe du gradin — pas devant le rouge de l'angle.
const POU = { x: -11.84, z: 13.6 };
// Adosse au grillage a 45 cm pres, le gradin laisse devant lui tout le reste : c'est LE degagement qu'on voit
// sur les photos entre les bancs et la ligne de touche.
// LE GRADIN SE CALE PAR L'AVANT, ET SUR LE PLAN. Je le calais par l'ARRIERE, en l'adossant au grillage,
// et je deduisais la face avant — ce qui le repoussait a trois metres et demi de la ligne de touche.
//
// Le plan dessine donne les trois planches d'assise au pixel : elles sont a 9,50 / 10,27 / 10,98 metres de
// l'axe du terrain. Trois planches pour QUATRE rangs, et c'est cohérent : le dernier rang est le
// couronnement, il n'a pas de planche claire (voir buildGradin). On en tire les deux seules cotes qui
// comptent — la face avant a 9,50 m, et un giron de 74 cm, pas 46. Un giron de 46 cm n'etait pas une
// marche de gradin mais une marche d'escalier ; on ne s'y assied pas.
//
// Le dos du dernier rang tombe alors a 12,46 m, pour un grillage a 12,95 : il reste un demi-metre, ce que
// le plan montre aussi — le revetement peint continue derriere les bancs avant de buter sur la cloture.
const GRADIN_AVANT = 9.5;                               // distance de la face avant a l'axe du terrain
function calerGradin() {
  GRADIN.x0 = -GRADIN_AVANT;
  return GRADIN.x0;
}
// Le muret est un MUR DROIT, pas un bank : la vue Street View de novembre 2021 est sans appel, la face est
// verticale et lisse, le dessus est un chant plat et mince. J'avais lu de la pente sur une photo prise en
// contre-plongee. Un mur droit ne mange donc que son epaisseur, et la zone de balade y regagne un metre.
// 1,12 m, pas 1,36. La photo de nuit prise dans l'angle donne l'echelle sans ambiguite : la poubelle
// (95 cm couvercle compris) arrive presque au chant du mur. A 1,36 le muret montait a hauteur de
// poitrine, il ecrasait le coin et cachait le bas du brise-vue.
const MUR = { h: 1.12, ep: 0.30 };
// Le portail et l'ouverture du mur se calent sur les MEMES deux valeurs : sinon l'un finit toujours par
// glisser par rapport a l'autre et le vantail se retrouve plaque devant du beton.
// Le portail fait 2,60 m, pas 3,60 : deux vantaux de 1,30. A 3,60 c'etait une entree de parking, alors
// que sur place c'est un portillon de service — on y passe a pied, ou avec un velo a la main.
// Et il est plus A DROITE : sur les photos il ouvre franchement du cote de la Seine, pas au milieu du mur.
// 4,5 et non plus 6,3 depuis que les angles du quai sont arrondis : sur la vue Street View il reste, a
// droite du portail, deux bons metres de mur jaune avant que le rouge ne tourne avec l'arc de l'angle.
const PORTAIL_X = 4.5, PORTAIL_L = 2.6;
// Le mur du fond +Z passe du rouge au blanc a cette distance de son debut, c'est-a-dire du bout +X.
// La bande de beton du sol commence au MEME endroit : sur la photo les deux changements sont a
// l'aplomb l'un de l'autre, ce qui est logique — la reprise de sol et la reprise de peinture ont ete
// faites ensemble. Une seule constante, donc, et ils ne peuvent plus glisser l'un par rapport a l'autre.
// Le mur du fond +Z : distance, depuis son bout +X, ou il se REHAUSSE et passe au rouge. Les trois
// autres coupures (rouge -> sarcelle a 2,4 m, sarcelle -> blanc a 10,6 m) restent dans le meme repere
// et sont ecrites sur place.
const PZ_HAUT = 15.35;
// Longueur de l'oblique par laquelle le mur +Z monte a sa hauteur haute. Elle commence donc a
// PZ_HAUT - PZ_RAMPE et c'est elle, pas une marche, qu'on voit sur la photo.
const PZ_RAMPE = 2.4;
// LE MUR DU FOND -Z, releve au pixel sur la photo de face (profil du bord superieur colonne par colonne,
// echelle donnee par les etoiles peintes, qui font une vingtaine de centimetres).
//  - SARCELLE puis JAUNE sont a la MEME hauteur, la haute : le petit decrochement que je croyais voir entre
//    les deux n'est que la fuite du mur, six pixels sur quatre cents.
//  - le vrai ressaut est PLUS LOIN, au milieu du pan jaune : le mur y perd soixante-deux pixels d'un coup,
//    soit deux tiers de sa hauteur courante. Un quart de metre, comme je l'avais mis, ne se voyait pas.
//  - le passage au rouge est une oblique qui penche dans l'autre sens que ce que j'avais : le rouge mord
//    plus TOT en bas qu'en haut.
// Distances en metres depuis le bout -X du mur.
// L'angle du quai, bout +Z : longueur du pan rouge BAS avant le pilastre, et sa hauteur.
const ANGLE_QUAI = 2.4;
const MUR_BAS = 0.68;
// LES DEUX ANGLES COTE SEINE SONT ARRONDIS. Le plan de la fresque a des coins en quart de cercle, et le
// terrain aussi : la bordure du quai ne bute pas a angle droit contre le mur du fond, elle tourne avec lui.
// Rayon releve sur le plan (l'arc du contour, tangent au bord du quai et au fond) : 2,6 m.
const ARC_R = 2.6;
const ARC_EP = 0.32;          // epaisseur de l'arc : entre la bordure (34 cm) et le mur (30 cm)
const BORD_H = 0.36;          // hauteur de la bordure du quai
const SARC_F = 4.5;        // fin du pan sarcelle
const HAUT_F = 8.9;        // fin de la partie REHAUSSEE (sarcelle + debut du jaune)
const REHAUSSE = 0.66;     // de combien elle domine le reste du mur
// Au bout +Z (cote gradin) le pan rouge rehausse est MOINS haut qu'au bout -Z : 1,56 m. Mesure sur la
// photo du coin du 20/09 : au droit du pilastre, le mur fait 365 px pour 450 au pilastre (1,90 m).
const REHAUSSE_PZ = 0.44;
// Le pilastre rouge de l'angle gradin / fond +Z, et le caisson vert fonce pose dessus (meme photo).
const PILASTRE = { L: 1.0, P: 0.28, H: 1.9, HV: 3.3 };

// LES QUATRE MATS. Deux par long cote, a l'INTERIEUR de l'enceinte : cote gradin ils se dressent au ras
// de la premiere marche, cote Seine au ras de la bordure basse. Une seule source, parce que la meme
// paire de coordonnees sert a poser le mat ET a poser son obstacle — et que si les deux divergent on
// traverse un poteau de huit metres sans rien comprendre.
// `x` du cote gradin se DEDUIT du gradin (calerGradin) : il n'est connu qu'au moment de la construction,
// d'ou la fonction plutot qu'un tableau fige.
// LES QUATRE MATS. Ils ne sont ni au meme endroit ni poses de la meme facon.
//
// COTE GRADIN, le fut est PLANTE DANS les bancs — pas pose dessus. Sur la photo prise a son pied il n'y a
// ni massif ni platine : un tube droit sort du gradin comme un piquet enfonce dedans. Il part donc du SOL
// et traverse la maconnerie ; ce qu'on en voit commence a la troisieme marche. D'ou `plaque: false` — la
// semelle carree que je lui donnais se serait plantee en plein milieu d'une assise.
//
// COTE SEINE, les trois autres sont DEHORS, derriere le grillage, sur le quai. Ils n'eclairent pas moins
// pour autant : c'est la faucille qui porte au-dessus du terrain, pas le poteau.
//
// `rot` est un CAP FIXE et non plus un regard vers le centre. Vises sur l'origine, les quatre lames
// partaient chacune dans sa diagonale ; sur place elles sont toutes perpendiculaires au grand cote, et
// c'est cet alignement qu'on reconnait de loin.
const MATS = [];
function calerMats(encXP) {
  MATS.length = 0;
  // rotation.y = t envoie le -Z local vers (-sin t, -cos t). Cote gradin la lame doit filer vers +X.
  // Les deux mats du gradin sont au tiers de la longueur ; ceux du quai, eux, sont pres des DEUX COINS —
  // on les voit par-dessus le mur depuis chaque bout du terrain, jamais au milieu du long cote.
  for (const z of [-8.6, 8.6]) MATS.push({ x: GRADIN.x0 - 2.5 * GRADIN.p, z, y: 0, rot: -Math.PI / 2, plaque: false });
  // Cote Seine, TROIS mats alignes : un pres de chaque coin et un au MILIEU, face au portillon (photo de nuit
  // prise du bout du terrain : les lumieres se succedent tout le long du quai ; Haythem, 26/09 : « il faut
  // mettre aussi un poteau de lumiere ici », au milieu du cote Seine). Dehors comme les deux autres.
  for (const z of [-13.2, 0, 13.2]) MATS.push({ x: encXP + 1.7, z, y: 0, rot: Math.PI / 2, plaque: true });
  return MATS;
}

// LES SURFACES QUE LA PLUIE MOUILLE. js/weather.js prend chaque materiau de cette liste et, a mesure que
// l'averse arrive, le lisse (roughness vers 0,30), le fonce d'un quart et lui donne un soupcon de
// metallicite : c'est ce qui fait briller le sol et refleter le ciel.
//
// Levallois n'en declarait qu'UNE, la fresque du sol. Sous l'averse, le terrain devenait un miroir au
// milieu d'un decor parfaitement sec — les murets, le gradin, la bande de beton, le quai et le container
// gardaient leur mat de plein soleil. C'est exactement ce qui faisait dire que la meteo « est trop
// simple » ici alors qu'elle est riche a Becon, ou toute la rue est recensee.
//
// On enregistre au moment de la CREATION du materiau, jamais apres coup : la plupart sont clones ou
// locaux a une fonction, et les retrouver par un parcours de scene reviendrait a deviner.
const MOUILLE = [];
const mouille = (m) => { MOUILLE.push(m); return m; };

// =====================================================================
//  LES MATIERES PHOTO (Poly Haven, CC0 — assets/tex/levallois, fabriquees par tools/textures_levallois.py)
// =====================================================================
// Meme principe que le detail photo de La Cage et les surfaces du parc de Becon : la COULEUR reste celle qu'on a
// reglee d'apres les photos du lieu — les aplats de la fresque, le rouge des murets, le jaune du gradin, le bleu
// petrole du container. La photo n'apporte que ce qu'un dessin ne sait pas faire : le RELIEF (normales), la
// BRILLANCE qui varie d'un point a l'autre (rugosite) et le GRAIN de la couleur, un multiplicateur centre sur 1.
//
// Chaque matiere est une paire de fichiers : `_nor` (normales, convention OpenGL) et `_pack`, lue comme donnee :
// R = grain (0,5 = neutre), G = rugosite, B = occlusion des creux, ou masque de rouille pour le metal. Deux lectures
// par pixel au lieu de quatre cartes. Sur telephone, les versions `_1k` (moitie de la taille PC).
//   tuile : cote reel de la surface photographiee (dimensions Poly Haven) ; rugo : moyenne du canal G, pour que la
//   rugosite SCALAIRE du materiau reste sa moyenne (la meteo la fait descendre sous l'averse, js/weather.js) ;
//   relief, grain : reglages par defaut, qu'un materiau peut surcharger.
const TEX_LEV = 'assets/tex/levallois/';
const MATIERES = {
  // rubberized_track, 2 m : le granulat de caoutchouc du sol souple
  caoutchouc: { fichier: 'caoutchouc', tuile: 2.0, rugo: 0.924, relief: 0.8, grain: 1.0 },
  // painted_concrete_02, 4 m : un beton lisse peint, avec ses reprises, ses rayures et ses pores
  betonPeint: { fichier: 'beton_peint', tuile: 4.0, rugo: 0.653, relief: 0.55, grain: 0.7 },
  // container_side, 1,94 m : la tole ondulee verticale (pas de 28 cm), ses bosses et ses coulures
  container: { fichier: 'container', tuile: 1.94, rugo: 0.666, relief: 1.0, grain: 0.8 },
  // green_metal_rust, 1 m : une tole peinte, piquee de rouille (canal B)
  // `rouilleB` : ici le canal B est le MASQUE DE ROUILLE, pas l'occlusion. Il vaut presque zero partout (quelques
  // taches, 0,7 % de la surface) : lu comme une occlusion, il assombrissait d'un quart TOUT le metal peint — mats
  // blancs, portail, poteaux, paniers — a la place des teintes reglees. Pas de cavites pour cette matiere-la.
  metal: { fichier: 'metal_peint', tuile: 1.0, rugo: 0.504, relief: 0.6, grain: 0.7, rouilleB: true },
};

// LE CHARGEMENT. Chaque photo commence par un pixel NEUTRE (normale droite, grain 0,5, rugosite pleine) : les
// shaders sont compiles une seule fois, avec leurs cartes, et l'arrivee de l'image ne recompile rien.
// On ne remplace PAS l'image de la texture d'attente : three alloue la memoire video une fois pour toutes a la
// premiere envoi (texStorage2D, immuable), et une photo de 2048 versee dans un pixel ne passe pas — la carte
// restait neutre sans un mot. On remplace donc la texture ELLE-MEME, partout ou elle est branchee (une carte de
// materiau, un uniforme) : meme type de carte, meme programme, seul le lien change.
const _photos = new Map();
// LE FILTRAGE ANISOTROPE DES PHOTOS SUIT LE PREREGLAGE. js/fx.js (setAniso) le regle sur les cartes des materiaux
// (map, normalMap...) mais ne voit pas les uniformes de nos shaders. Or three range dans UNE texture du GPU les copies
// d'une meme image qui ont les memes reglages — anisotropie comprise. En ultra et en extreme (16), ou des qu'on
// changeait de qualite en cours de partie, la carte du sol (un clone, reglee par fx.js) et l'uniforme du revetement
// souple (l'original, reste a 8) devenaient deux textures de 2048 en memoire video : 44 Mo de doublons. Et en basse, le
// telephone filtrait toutes les photos a 8 au lieu de 2. On recopie donc sur les originaux, a chaque image, la valeur
// que fx.js a posee sur la carte de normales du sol (voir synchroAniso et buildLevallois).
const ANISO = { v: 8 };
function synchroAniso(ref) {
  const v = ref && ref.anisotropy;
  if (!v || v === ANISO.v) return;
  ANISO.v = v;
  for (const e of _photos.values()) if (e.vraie) { e.vraie.anisotropy = v; e.vraie.needsUpdate = true; }
}
function _entreePhoto(nom) {
  const url = TEX_LEV + nom + (MOBILE_DECOR ? '_1k' : '') + '.jpg';
  let e = _photos.get(url);
  if (e) return e;
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const g = c.getContext('2d');
  // neutres : normale droite ; grain 0,5 / rugosite 1 / creux ouverts ; pour la trame d'usure, rien d'use.
  // La houle de la Seine (eau_normale) est une carte de NORMALES elle aussi : avec le neutre des photos packees
  // (128, 255, 255), l'eau penchait toute d'un bloc tant que l'image n'etait pas la — et pour de bon si elle manquait.
  const normale = /_nor(male)?$/.test(nom);
  g.fillStyle = normale ? 'rgb(128,128,255)' : nom.startsWith('usure') ? 'rgb(128,128,0)' : 'rgb(128,255,255)';
  g.fillRect(0, 0, 1, 1);
  const attente = new THREE.Texture(c);
  attente.wrapS = attente.wrapT = THREE.RepeatWrapping; attente.colorSpace = THREE.NoColorSpace;
  attente.needsUpdate = true;
  e = { attente, vraie: null, branchements: [] };
  _photos.set(url, e);
  new THREE.ImageLoader().load(url, (img) => {
    const t = new THREE.Texture(img);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = ANISO.v;
    t.needsUpdate = true;
    e.vraie = t;
    for (const b of e.branchements) b(t);
    e.branchements.length = 0;
    attente.dispose();
  }, undefined, () => console.warn('[levallois] photo absente, on garde le rendu dessine :', url));
  return e;
}
// Branche la photo `nom` sur cible[cle] (une carte de materiau ou la `value` d'un uniforme), avec sa propre
// repetition (une copie partage la meme image en memoire video) ; la rebranche quand la vraie image arrive.
function brancherPhoto(nom, cible, cle, rx = 1, ry = 1) {
  const e = _entreePhoto(nom);
  const poser = (t) => {
    const c = (rx === 1 && ry === 1) ? t : t.clone();
    if (c !== t) { c.repeat.set(rx, ry); c.needsUpdate = true; }
    // Sur une carte de materiau, le filtrage anisotrope est celui que le prereglage graphique (js/fx.js setAniso) a
    // deja pose sur la texture d'attente : on le reprend TEL QUEL, meme plus bas (2 en basse), et non le plus fort
    // des deux — sinon le clone et l'original ne se ressemblent plus et le GPU en garde deux copies. L'original
    // partage (les uniformes) suit, lui, par synchroAniso.
    const avant = cible[cle];
    if (cible.isMaterial && c !== t && avant && avant.anisotropy !== c.anisotropy) c.anisotropy = avant.anisotropy;
    cible[cle] = c;
  };
  poser(e.vraie || e.attente);
  if (!e.vraie) e.branchements.push(poser);
  return cible[cle];
}

// LA PROJECTION DANS LE MONDE. Les murets, le gradin, le container, la peniche ont des UV de toutes sortes (une
// face de boite fait 0..1 qu'elle mesure 30 cm ou 25 m), et l'optimiseur du decor (optimiserDecor, js/court.js)
// coud plusieurs maillages en un seul bloc. Le detail se lit donc a la position MONDE du fragment, a l'echelle
// reelle de la photo. Deux facons :
//  - PLAN (par defaut) : vue de dessus pour un sol, de face pour un mur. Une lecture par carte ;
//  - TRIPLANAIRE (`tri`) : trois projections melangees selon l'orientation, pour tout ce qui TOURNE — les arcs
//    d'angle, les futs des mats, la coque de la peniche. Une projection « de face » s'y ecrasait : la tangente
//    tourne avec la surface et la coordonnee le long du mur ne suit plus la distance parcourue. Six lectures par
//    pixel ; sur telephone (`LEV_LEGER`), deux : on ne lit que la projection qui fait face.
// Et deux effets calcules, pour ce qui n'a pas de texture dessinee a salir :
//  - `pied` : la salissure au pied (hauteur en m) — la terre et l'eau qui rejaillissent, plus foncees en bas ;
//  - `rouille` : la teinte de la rouille la ou le canal B de la photo en montre (metal seulement).
const LEV_ENTETE = `
varying vec3 vPosLev;
uniform sampler2D uLevNor;
uniform sampler2D uLevPack;
uniform vec4 uLevA;     // 1 / tuile, relief, grain, 1 / rugosite moyenne de la photo
uniform vec4 uLevB;     // part de la carte de rugosite, force de la rouille, hauteur de la salissure, cavites
uniform vec3 uLevRouille;
`;
const LEV_FRAGMENT = `
{
  vec3 lvG = inverseTransformDirection( nonPerturbedNormal, viewMatrix );
  vec3 lvN = inverseTransformDirection( normal, viewMatrix );
  vec4 lvK; vec3 lvW;
  #if defined( LEV_TRI ) && defined( LEV_LEGER )
    // TELEPHONE : la seule projection DOMINANTE, deux lectures au lieu de six. Les UV sont choisis avant la lecture,
    // hors de tout test, pour que les derivees (le choix du niveau de mipmap) restent justes ; la couture a 45 degres
    // ne tombe que sur des futs, des tubes et des arrondis, et ne se voit pas a la taille d'un ecran de poche.
    vec3 lvP = vPosLev * uLevA.x, lvA = abs( lvG );
    float lvX = step( max( lvA.y, lvA.z ), lvA.x ), lvY = ( 1.0 - lvX ) * step( lvA.z, lvA.y );
    vec2 lvU = lvX > 0.5 ? lvP.zy : ( lvY > 0.5 ? lvP.xz : lvP.xy );
    lvK = texture2D( uLevPack, lvU );
    vec3 lvD = texture2D( uLevNor, lvU ).xyz * 2.0 - 1.0;
    lvD.xy *= uLevA.y;
    // le meme melange « whiteout » que les trois projections du PC, pour la seule qui compte
    if ( lvX > 0.5 ) lvW = vec3( abs( lvD.z ) * lvN.x, lvD.y + lvN.y, lvD.x + lvN.z );
    else if ( lvY > 0.5 ) lvW = vec3( lvD.x + lvN.x, abs( lvD.z ) * lvN.y, lvD.y + lvN.z );
    else lvW = vec3( lvD.xy + lvN.xy, abs( lvD.z ) * lvN.z );
    lvW = normalize( lvW );
  #elif defined( LEV_TRI )
    // trois projections, ponderees par l'orientation (puissance 4 : des transitions courtes)
    vec3 lvP = vPosLev * uLevA.x;
    vec3 lvB = pow( abs( lvG ), vec3( 4.0 ) ); lvB /= ( lvB.x + lvB.y + lvB.z );
    lvK = texture2D( uLevPack, lvP.zy ) * lvB.x + texture2D( uLevPack, lvP.xz ) * lvB.y + texture2D( uLevPack, lvP.xy ) * lvB.z;
    // normales melangees « whiteout » (Golus) : chaque projection ramene la sienne dans l'axe du monde
    vec3 tX = texture2D( uLevNor, lvP.zy ).xyz * 2.0 - 1.0, tY = texture2D( uLevNor, lvP.xz ).xyz * 2.0 - 1.0, tZ = texture2D( uLevNor, lvP.xy ).xyz * 2.0 - 1.0;
    tX.xy *= uLevA.y; tY.xy *= uLevA.y; tZ.xy *= uLevA.y;
    tX = vec3( tX.xy + lvN.zy, abs( tX.z ) * lvN.x );
    tY = vec3( tY.xy + lvN.xz, abs( tY.z ) * lvN.y );
    tZ = vec3( tZ.xy + lvN.xy, abs( tZ.z ) * lvN.z );
    lvW = normalize( tX.zyx * lvB.x + tY.xzy * lvB.y + tZ.xyz * lvB.z );
  #else
    vec3 lvT, lvBt; vec2 lvP;
    if ( abs( lvG.y ) > 0.7 ) {
      float s = sign( lvG.y );
      lvT = normalize( vec3( 1.0, 0.0, 0.0 ) - lvG * lvG.x );
      lvBt = cross( lvG, lvT );
      lvP = vec2( vPosLev.x, - vPosLev.z * s );
    } else {
      lvT = normalize( cross( vec3( 0.0, 1.0, 0.0 ), lvG ) );
      lvBt = cross( lvG, lvT );
      lvP = vec2( dot( vPosLev, lvT ), vPosLev.y );
    }
    lvP *= uLevA.x;
    lvK = texture2D( uLevPack, lvP );
    vec3 lvD = texture2D( uLevNor, lvP ).xyz * 2.0 - 1.0;
    lvW = normalize( lvT * lvD.x * uLevA.y + lvBt * lvD.y * uLevA.y + lvN * max( lvD.z, 0.05 ) );
  #endif
  // LA COULEUR : le grain (1 en moyenne), et l'ombre des creux, discrete
  diffuseColor.rgb *= max( 1.0 + ( lvK.r - 0.5 ) * 2.0 * uLevA.z, 0.0 ) * mix( 1.0, lvK.b, uLevB.w );
  // LA ROUILLE : elle suit le masque de la photo, et le grain la marbre
  diffuseColor.rgb = mix( diffuseColor.rgb, uLevRouille * ( 0.55 + lvK.r ), clamp( lvK.b * uLevB.y, 0.0, 1.0 ) );
  // LA SALISSURE DU PIED : plus foncee et plus brune en bas, dechiquetee par le grain
  if ( uLevB.z > 0.0 ) {
    float lvS = 1.0 - smoothstep( 0.0, uLevB.z, vPosLev.y + ( lvK.r - 0.5 ) * uLevB.z * 0.8 );
    diffuseColor.rgb *= mix( vec3( 1.0 ), vec3( 0.62, 0.56, 0.48 ), lvS * 0.75 );
  }
  // LA RUGOSITE : la carte de la photo, ramenee a sa moyenne (la rugosite scalaire reste celle du materiau)
  roughnessFactor = clamp( roughnessFactor * mix( 1.0, lvK.g * uLevA.w, uLevB.x ), 0.04, 1.0 );
  normal = normalize( ( viewMatrix * vec4( lvW, 0.0 ) ).xyz );
}
`;
// Les materiaux a traiter portent `userData.photoLev` = { cle, relief, grain, rugo, pied, rouille, tri, cavite }.
// Leur `envMapIntensity` est decale d'un cheveu (0,999) : l'optimiseur fond les materiaux IDENTIQUES en un seul,
// sans regarder userData, et un materiau marque ne doit pas se perdre dans un jumeau ordinaire.
function marquerPhoto(mat, cle, o = {}) {
  mat.userData.photoLev = { cle, ...o };
  mat.envMapIntensity = 0.999;
  return mat;
}
function injecterPhoto(mat) {
  const o = mat.userData.photoLev, D = MATIERES[o.cle];
  if (!D || mat.__photoLev) return;
  const rouille = o.rouille ?? 0;
  // les cavites lisent le canal B comme une occlusion : jamais sur le metal, ou B est la rouille (voir MATIERES)
  const cavite = D.rouilleB ? 0 : (o.cavite ?? 0.25);
  const u = {
    uLevNor: { value: null }, uLevPack: { value: null },
    uLevA: { value: new THREE.Vector4(1 / (o.tuile ?? D.tuile), o.relief ?? D.relief, o.grain ?? D.grain, 1 / D.rugo) },
    uLevB: { value: new THREE.Vector4(o.rugo ?? 0.8, rouille, o.pied ?? 0, cavite) },
    uLevRouille: { value: new THREE.Color(o.teinteRouille ?? 0x6b3a1f) },
  };
  brancherPhoto(D.fichier + '_nor', u.uLevNor, 'value');
  brancherPhoto(D.fichier + '_pack', u.uLevPack, 'value');
  mat.__photoLev = u;                         // hors de userData : Material.copy le passerait au JSON
  if (o.tri) {
    mat.defines = mat.defines || {}; mat.defines.LEV_TRI = '';
    if (MOBILE_DECOR) mat.defines.LEV_LEGER = '';   // telephone : la projection dominante seule (voir LEV_FRAGMENT)
  }
  mat.bumpMap = null;                         // le relief dessine cede la place au vrai
  const avant = mat.onBeforeCompile, natif = avant === THREE.Material.prototype.onBeforeCompile;
  const cleAvant = mat.customProgramCacheKey;
  mat.onBeforeCompile = (sh, r) => {
    if (!natif) avant.call(mat, sh, r);
    for (const k in u) sh.uniforms[k] = u[k];
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPosLev;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        {
          vec4 lvPos = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            lvPos = instanceMatrix * lvPos;
          #endif
          vPosLev = ( modelMatrix * lvPos ).xyz;
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + LEV_ENTETE)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + LEV_FRAGMENT);
  };
  // cle CONSTANTE : le source injecte ne change pas (la projection triplanaire passe par `defines`)
  mat.customProgramCacheKey = () => (natif ? '' : cleAvant.call(mat) + '|') + 'lev-photo-1';
  mat.needsUpdate = true;
}
// Les sols du parc (herbe, stabilise, terre) prennent les photos deja livrees pour le parc de Becon
// (assets/parc/tex) par le module qui les pose la-bas, js/surfaces_parc.js. Meme marque d'unicite que les
// matieres photo, pour la meme raison.
function surfaceParc(mat, cle) {
  mat.userData.surfaceParc = cle;
  mat.envMapIntensity = 0.998;
  return mat;
}

// Pose les matieres photo sur tous les materiaux marques. Appelee APRES optimiserDecor (voir la fin de
// buildLevallois) : le decor a alors sa forme definitive, fusionne ou non, et chaque materiau survivant est traite
// une fois. Aucun appel de dessin en plus : le detail arrive dans les shaders existants.
function poserPhotos(scene) {
  scene.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m && m.userData.photoLev) injecterPhoto(m);
  });
}
// Zone ou le joueur peut marcher en balade. Cote -X on s'arrete devant le gradin ; sur les trois autres cotes
// au pied du mur. La marge de 12 cm est la demi-largeur d'epaules d'un joueur.
// Cote -X on ne s'arrete PLUS devant le gradin : on ouvre jusqu'au mur, et c'est le GRADIN LUI-MEME qui
// devient un obstacle (voir `obstacles` plus bas). Ce qu'on gagne n'est pas « derriere le gradin » — il est
// adosse au grillage a 45 cm, il n'y a rien derriere lui — mais LE BOUT +Z : le coin de la photo, avec son
// caoutchouc rouge, sa bande de beton, sa poubelle et le bout des bancs.
//
// La limite n'est pas -(encX - 0.4) : le RETOUR D'ANGLE ROUGE presente sa face interieure a -encX + MUR.ep,
// et s'arreter 40 cm avant le grillage laisserait le joueur DANS le mur. On se cale donc sur ce mur-la.
//
// DEUX parametres, et pas un : l'enceinte est DISSYMETRIQUE (12,4 cote gradin, 10,0 cote Seine) et cette
// fonction etait appelee avec la demi-largeur cote SEINE. Calculer le xMin dessus aurait RETRECI la zone.
const MARGE = 0.12;                                     // demi-largeur d'epaules
const YARD_LEVALLOIS = (encXP, encX) => ({
  xMin: -encX + MUR.ep + MARGE,   // au ras de la face interieure du retour d'angle rouge
  xMax: encXP - MARGE,            // cote Seine : simple bordure basse, on peut aller jusqu'au bord
  zMin: -(16.0 - MARGE),
  zMax: 16.0 - MARGE,
});

// La palette de la fresque, relevée sur les photos.
// La palette, relevee sur la VUE AERIENNE — la seule image ou l'on voit la fresque entiere, a plat, sans
// perspective ni contre-jour. Elle corrige deux erreurs que toutes les vues au sol entretenaient :
//  - le sol est NOIR, un enrobe tres sombre, et non le gris-bleu clair que je lisais sur les photos prises
//    de biais (c'etait le ciel qui s'y refletait) ;
//  - il n'y a pas de sarcelle ni de bleu roi : les seuls bleus sont un BLEU PALE de bandes et un CYAN de
//    bloc, tous deux froids et desatures.
const C = {
  bitume: '#232427',      // enrobe noir : c'est le fond de TOUTE la fresque
  jaune: '#f2c318',
  rouge: '#d81f26',
  blanc: '#eceae3',
  bleuPale: '#9fc3dc',    // les bandes bleu pale, cote Seine surtout
  cyan: '#4bb3d4',        // le bloc franc du bout, pres du panier nord
  ardoise: '#46566e',     // le bleu-gris sourd des murs, et de la grande tache du fond
  noir: '#141416',
  // conservees parce que le DECOR (murets, gradin, container) les utilise encore
  sarcelle: '#13566a',   // le petrole sombre du bout du mur -Z, releve au pixel sur la photo de face
  vert: '#17553a',
  grisBleu: '#5d6b74',
  turquoise: '#12a89b',
  bleu: '#1d4ea8',
  bleuClair: '#7fa8c9',
};


export function buildLevallois(scene, K) {
  const { canvasTex, tiled, netTexture, noiseBump, M, box, ENC, modelTree, treeSoil, buildShrub,
          building, windowsTexture, concreteTexture, leafMat, leafDepth } = K;
  // Le « grand soleil » de js/weather.js remplacait le brouillard de bord de Seine pose par js/court.js
  // (0xcedcea, 130 a 460 m) par celui de Becon (0xd8e3ee, 110 a 380 m) : La Defense se noyait, et la brume
  // d'horizon, restee a la teinte de Levallois, ne raccordait plus. Comme au parc de Becon, le terrain garde
  // son air (js/weather.js lit scene.userData.meteo) ; le ciel couvert et la pluie ne changent pas.
  scene.userData.meteo = { soleil: { fog: 0xcedcea, fogNear: 130, fogFar: 460 } };

  // ---------------------------------------------------------------
  //  1. LE SOL PEINT
  // ---------------------------------------------------------------
  // Le gradin se cale AVANT la peinture : la bande jaune du sol s'arrete a sa face avant, et la zone de
  // balade part de la aussi. Si on peignait d'abord, les deux se retrouveraient decales.
  calerGradin();
  calerMats(ENC.XP);
  ENCEINTE_SOL.X = ENC.X; ENCEINTE_SOL.XP = ENC.XP; ENCEINTE_SOL.Z = ENC.Z;
  // L'enceinte etant dissymetrique, son centre n'est plus sur l'axe du terrain : tout ce qui l'epouse est
  // decale de ENC.CX. Sur les deux autres terrains CX vaut zero et rien ne change.
  // LE SOL EST LE PLAN DE L'ARTISTE, pas un dessin de ma main. J'ai passe plusieurs allers-retours a le
  // reproduire au canvas et il restait toujours une interpretation : les immeubles n'avaient pas le bon
  // nombre d'etages, les fleurs pas les bonnes decoupes, le joueur pas la bonne pose. Le plan existe, il
  // est a plat et rectifie : autant le poser tel quel.
  //
  // tools/decoupe_sol_levallois.py le recadre a l'emprise EXACTE de l'enceinte. Le calage vient de la
  // LIGNE MEDIANE, qui tombe pile au milieu des deux lignes de fond du plan (au pixel pres) : c'est elle
  // qui donne l'echelle et le centre. Deux echelles differentes en x et en z, parce que le terrain du plan
  // est un peu plus large que 15 m pour sa longueur — mieux vaut 14 % d'anisotropie sur des motifs
  // abstraits, qui ne se voit pas, que des lignes de terrain DEDOUBLEES, qui sautent aux yeux.
  //
  // Le marquage n'est donc plus dessine : celui du plan EST le marquage, et il tombe sur les vraies lignes.
  // LE `?v=` N'EST PAS DECORATIF. L'APK est une WebView Capacitor : les fichiers sont bien dans le
  // paquet, mais le service worker les sert CACHE D'ABORD et se moque de savoir que le paquet a
  // change. Une texture refaite restait donc l'ancienne sur l'appareil, livraison apres livraison.
  // Changer l'URL change la cle de cache : la nouvelle image passe a coup sur, sans dependre de la
  // version du service worker. A INCREMENTER A CHAQUE FOIS QU'ON REGENERE LE SOL.
  // v=3 : le prolongement recopie la PEINTURE et non plus le trait de contour du plan (tools/plan_sol_levallois.py).
  // Et c'est ce sol, une fois charge, qui donne ses couleurs a la bordure du quai (peindreBordure).
  // LA FRESQUE EN NET (PC). Le plan etait pose a 71 px/m : de loin c'est assez, mais a hauteur d'yeux, en balade,
  // les bords des aplats bavaient sur trois centimetres, la ou une peinture au pochoir est franche. La version
  // d'assets/tex/levallois est agrandie a 128 px/m et reaffutee (tools/textures_levallois.py) : memes couleurs,
  // meme calage au pixel, bords nets. 4096 px de long, la limite sure des cartes graphiques de PC ; le telephone
  // garde l'ancien fichier, quatre fois plus leger en memoire video.
  const solTex = new THREE.TextureLoader().load(MOBILE_DECOR ? 'assets/levallois_sol.jpg?v=3' : TEX_LEV + 'sol_fresque.jpg?v=1', (t) => {
    peindreBordure(t.image);
    calerRougeGradin(t.image);
  });
  solTex.colorSpace = THREE.SRGBColorSpace;
  solTex.anisotropy = 16;
  solTex.wrapS = solTex.wrapT = THREE.ClampToEdgeWrapping;
  // LE SOL EST UNE MOUSSE, et c'est maintenant une vraie : le granulat photographie d'une piste en caoutchouc
  // (rubberized_track, Poly Haven, tuile de 2 m, un millimetre par pixel). Il remplace la trame dessinee au
  // canvas (grainMousse) et sert trois fois : il creuse (normales), il fait varier la brillance d'un grain a
  // l'autre (rugosite, canal G) et il colore (grain, canal R — un multiplicateur, la fresque garde ses teintes).
  // C'est ce scintillement qui dit « caoutchouc » plutot que « peinture ». La rugosite de la photo est ramassee
  // dans le haut (0,73 a 1) : un granulat n'est jamais un miroir, et a 0,2 avec un environnement la fresque
  // virait au bleu delave.
  const repG = [ENC.W / MATIERES.caoutchouc.tuile, (ENC.Z * 2) / MATIERES.caoutchouc.tuile];
  const courtMat = new THREE.MeshStandardMaterial({
    map: solTex, roughness: 0.9, metalness: 0.0, normalScale: new THREE.Vector2(0.75, 0.75),
  });
  brancherPhoto('caoutchouc_nor', courtMat, 'normalMap', ...repG);
  brancherPhoto('caoutchouc_pack', courtMat, 'roughnessMap', ...repG);
  poserUsureSol(courtMat, K);
  const court = new THREE.Mesh(new THREE.PlaneGeometry(ENC.W, ENC.Z * 2), courtMat);
  court.rotation.x = -Math.PI / 2; court.position.x = ENC.CX; court.receiveShadow = true; scene.add(court);

  // AUTOUR DU TERRAIN, C'EST UN PARC. Le revêtement souple bleu ne couvre qu'une bande de quelques mètres le
  // long de l'enceinte — c'est l'aire de jeux. Tout le reste est de la pelouse.
  //
  // Il tenait auparavant sur 200 x 200 m : depuis le bout du terrain, ce grand aplat bleu-gris se lisait
  // exactement comme de l'eau, et on avait l'impression que la Seine faisait le tour. Elle ne passe que d'UN
  // côté, à l'est ; les trois autres donnent sur le parc.
  // La pelouse s'ARRETE au bord du quai. Posee sur 400 x 400 m elle recouvrait la Seine, qui est un metre plus
  // bas : le fleuve disparaissait purement et simplement sous l'herbe.
  const matHerbe = new THREE.MeshStandardMaterial({ map: pelouseTexture(canvasTex), roughness: 1 });
  // les brins d'herbe photographies du parc de Becon (js/surfaces_parc.js), par-dessus la couleur dessinee
  surfaceParc(matHerbe, 'herbe');
  const XQ = ENC.XP + 7.5;                     // bord du quai (voir laSeine)
  const rive = (x0, x1) => {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 400), matHerbe);
    h.rotation.x = -Math.PI / 2; h.position.set((x0 + x1) / 2, -0.05, 0); h.receiveShadow = true; scene.add(h);
  };
  rive(-220, XQ);                             // la rive du terrain : le parc
  rive(XQ + 120, XQ + 320);                   // la berge d'en face, derriere les immeubles

  // C'est la meme mousse que le sol de jeu : elle recoit le meme granulat photo (projete dans le monde, a sa
  // taille reelle : aucune image de plus), et elle se mouille sous l'averse comme le terrain qu'elle borde.
  const WS = ENC.W + 7.5, LS = ENC.Z * 2 + 7.5;
  const souple = new THREE.Mesh(new THREE.PlaneGeometry(WS, LS),
    mouille(marquerPhoto(new THREE.MeshStandardMaterial({ map: revetementSouple(canvasTex), roughness: 0.9 }),
      'caoutchouc', { grain: 0.8, rugo: 1.0 })));
  souple.rotation.x = -Math.PI / 2; souple.position.set(ENC.CX, -0.03, 0); souple.receiveShadow = true; scene.add(souple);

  // ---------------------------------------------------------------
  //  2. MURETS PEINTS + GRADIN
  // ---------------------------------------------------------------
  murets(scene, K);
  const gradin = buildGradin(scene, K);

  // ---------------------------------------------------------------
  //  3. GRILLAGE VERT, BÂCHE NOIRE, MÂTS COURBES
  // ---------------------------------------------------------------
  grillage(scene, K);
  // Sur la photo du quai, trois mats sont ALIGNES le long de la Seine et un quatrieme ferme le fond : ils ne
  // sont pas aux quatre coins. C'est cet alignement qui fait la silhouette du lieu vu depuis le terrain.
  // ILS SONT DEDANS, et c'est tout le sujet. Je les avais plantes quatre metres DERRIERE le grillage, comme
  // des lampadaires de rue : la lame ne portait alors sur rien et le terrain n'etait pas eclaire. La vue
  // aerienne est sans appel — les quatre mats sont A L'INTERIEUR de l'enceinte, au ras des murets, et c'est
  // pour ca que leur faucille passe au-dessus du jeu. C'est aussi ce qui fait la silhouette du lieu.
  // Comme ils sont dedans, ce sont des OBSTACLES : voir la liste plus bas, qui repart des memes valeurs.
  for (const m of MATS) matCourbe(scene, K, m);

  // ---------------------------------------------------------------
  //  3 bis. LES PANIERS — noirs, panneau rectangulaire, structure en A
  // ---------------------------------------------------------------
  panierLevallois(scene, K, -1);
  panierLevallois(scene, K, 1);
  // La mecanique (cercle qui flechit, filet simule, cercle 3D) est la meme que sur Becon : seul le panneau et
  // son support changent. `boardDist` = distance du centre du cercle au plan du panneau.
  // Cercles ORANGE VIF : c'est la couleur des arceaux sur les photos du playground, bien plus claire que
  // le rouge sombre des paniers de Becon.
  K.installerPaniers(scene, Math.abs(K.COURT.BOARD_Z) - Math.abs(K.COURT.HOOP_Z), 0xf06a12);

  // ---------------------------------------------------------------
  //  4. LA SEINE, LA PÉNICHE, LA BERGE D'EN FACE
  // ---------------------------------------------------------------
  laSeine(scene, K);

  // ---------------------------------------------------------------
  //  5. VÉGÉTATION — saule pleureur, bouleaux jaunes d'automne, haies
  // ---------------------------------------------------------------
  // Le grand saule de la photo, juste derrière le panier côté -Z : c'est lui qu'on voit pendre sur le terrain.
  // Le saule : 7,5 m de demi-envergure, il lui faut donc plus de huit metres de recul. A 2,6 m il
  // pendait litteralement au-dessus du panier sud.
  const XS = -ENC.X - 9.0;                          // le saule est derriere le grillage, pas dessus
  treeSoil(scene, XS, -17.6, 1.3);
  modelTree(scene, XS, -17.6, 13.5, 7.5, { fat: 1.0 });
  saulePleureur(scene, K, XS, -17.6, 11.5);
  // LES ARBRES DU PARC. Le cinquieme parametre est la DEMI-ENVERGURE de la couronne, et c'est lui qui
  // decide de tout : un arbre plante a 1,2 m derriere le grillage avec six metres de branches pousse
  // cinq metres A L'INTERIEUR de l'enceinte, et on voit ses charpentieres sortir du mur au-dessus du
  // gradin. Le tronc etait bien dehors, le feuillage non.
  //
  // Regle : distance au grillage > demi-envergure + 1 m. Le grillage est a ENC.X + 0,55 d'un cote et
  // ENC.XP + 0,55 de l'autre. On garde des arbres hauts — ils font la toile de fond du terrain — mais
  // plantes assez loin pour qu'aucune branche ne franchisse la cloture.
  treeSoil(scene, -20.2, 9, 1.0);
  modelTree(scene, -20.2, 9, 12, 6);
  modelTree(scene, -21.0, -4, 11, 5.5);
  modelTree(scene, 17.8, -19, 12.5, 6);
  modelTree(scene, -19.4, 20.5, 11.5, 5.5);
  modelTree(scene, 17.6, 21, 12, 6);
  // Quelques arbres derriere le mur du fond -Z : sur la vue Street View ils font la toile de fond du panier
  // sud. Mais ils doivent rester DERRIERE et DISCRETS — a huit arbres de 13 m plantes a 18 m, vu du ciel la
  // couronne recouvrait la moitie du terrain et on ne voyait plus la fresque.
  for (const x of [-6.0, 0.5, 6.5]) modelTree(scene, x + rnd(-0.5, 0.5), -20.5 + rnd(-0.8, 0.8), rnd(8.5, 10.5), rnd(3.6, 4.6));
  modelTree(scene, 2.0, 21.0, 9, 4);
  // Ces massifs sont DEHORS, derriere le grillage : ecrits en dur a -11,6 ils se retrouvaient maintenant
  // a l'interieur de l'enceinte, au milieu du gradin.
  for (let z = -15; z <= 15; z += 3.6) buildShrub(scene, -ENC.X - 3.2 + rnd(-0.2, 0.2), z, 5.4, 1.25, 1.2);
  for (const z of [-19.5, -16, 17, 20.5]) buildShrub(scene, ENC.XP + 2.8, z, 5.2, 1.2, 1.1);

  // ---------------------------------------------------------------
  //  6. LE PARC ET LE MOBILIER DE QUAI
  // ---------------------------------------------------------------
  parc(scene, K);
  cheminDeHalage(scene, K);
  // (lot L12 : l'horizon fermé derrière le gradin et au-delà du panier +Z — rue, platanes d'alignement, immeubles de
  // Levallois — js/horizon_levallois.js, option « Décor détaillé »)
  horizonLevallois(scene, K);

  // Reperes lus par js/game.js : ou l'on peut marcher, et ou se tient le marchand. Sans ca, le joueur traverse
  // le gradin de part en part et Pierrick se retrouve enterre dedans jusqu'a la taille.
  // DE LA VIE AUTOUR DU TERRAIN, comme a Becon. Ici ce n'est pas une rue mais un parc de bord de Seine :
  // les gens passent sur le CHEMIN DE HALAGE le long du fleuve, sur l'ALLEE du parc derriere le gradin, et
  // ils coupent entre les deux. Les trajets longent l'enceinte sans jamais y entrer.
  //
  // Comme a Becon, on divise par deux sur telephone : ce sont des bonshommes articules mis a jour a chaque
  // image, et ils ne servent qu'a ce qu'on sente du monde quand on leve les yeux du terrain.
  scene.userData.pedestrians = new Pedestrians(scene, [
    { ax: ENC.XP + 6.2, az: -34, bx: ENC.XP + 6.2, bz: 34 },     // le quai, le long de la Seine
    { ax: -ENC.X - 7.0, az: -30, bx: -ENC.X - 7.0, bz: 30 },     // l'allee du parc, derriere le gradin
    { ax: -ENC.X - 6.4, az: -24, bx: ENC.XP + 5.6, bz: -24 },    // la traverse au bout du terrain
    { ax: ENC.XP + 5.6, az: 26, bx: -ENC.X - 6.4, bz: 26 },      // l'autre traverse
  ], MOBILE_DECOR ? 5 : 12);

  // OBSTACLES. Maintenant que la zone de balade va jusqu'au mur, il faut empecher de traverser le decor.
  // `r` / `hx` / `hz` sont les cotes REELS du solide, `pad` la marge de carrure du joueur ; js/ball.js lit
  // le meme tableau et ignore `pad`. `h` est la hauteur : c'est elle qui laisse la balle passer par-dessus
  // le gradin tout en rebondissant sur le container.
  // Tout est deduit du gradin : s'il rebouge, le container, la poubelle, la zone et ces boites suivent.
  const PROF = GRADIN.rangs * GRADIN.p;
  const obstacles = [
    // LE GRADIN. Boite PLEINE : on ne monte pas s'asseoir dessus, le moteur ne sait pas gravir une marche
    // et un joueur pose a 42 cm flotterait. Sa face avant plus la marge retombe exactement sur l'ancienne
    // limite de balade : cote terrain, rien ne change.
    { box: true, x: GRADIN.x0 - PROF / 2, z: 0,
      hx: PROF / 2, hz: GRADIN.long / 2 + 0.06, pad: MARGE, h: GRADIN.rangs * GRADIN.h + 0.06 },
    // LE CONTAINER. C'est une CORRECTION autant qu'une contrainte : son nez depassait deja dans l'ancienne
    // zone de balade, on pouvait entrer dedans.
    { box: true, x: GRADIN.x0 - PROF / 2, z: CONT.z,
      hx: CONT.P / 2 + 0.07, hz: CONT.L / 2 + 0.07, pad: MARGE, h: CONT.H + 0.12 },
    // LA POUBELLE du coin : rayon du couvercle, qui est la partie la plus large. Elle etait dans la zone
    // depuis toujours, donc deja traversee.
    { x: POU.x, z: POU.z, r: 0.225, pad: MARGE, h: 0.95 },
    // LES DEUX MATS DE PANIER. Hors des bornes de MATCH : seule la balade les sent — et la balle, qui
    // rebondit desormais dessus au lieu de les traverser.
    { x: 0, z: -14.35, r: 0.14, pad: MARGE, h: 4.20 },
    { x: 0, z: 14.35, r: 0.14, pad: MARGE, h: 4.20 },
    // LE PILASTRE ROUGE de l'angle gradin
    { box: true, x: -ENC.X + MUR.ep + PILASTRE.L / 2, z: ENC.Z - PILASTRE.P / 2, hx: PILASTRE.L / 2, hz: PILASTRE.P / 2,
      pad: MARGE, h: PILASTRE.HV },
    // LES ARCS D'ANGLE : un chapelet de poteaux invisibles le long de l'arc, assez serres (45 cm, rayon
    // 20 cm plus la carrure) pour qu'on ne passe pas entre deux, et a la hauteur locale du chant.
    ...ARCS.flatMap((a) => Array.from({ length: 11 }, (_, i) => {
      const t = (i / 10) * Math.PI / 2;
      return { x: a.cx + a.r * Math.cos(t), z: a.cz + a.sz * a.r * Math.sin(t), r: 0.2, pad: MARGE, h: a.haut(t) };
    })),
  ];

  // LES BANCS. Un rang = un segment d'assise ou le joueur peut se poser (js/game.js, js/player.js).
  //  - `x` est recule de 17 cm derriere le nez de la marche : on s'assoit les fesses en arriere, cuisses
  //    debordant sur le vide, sinon le joueur a l'air perche sur l'arete.
  //  - `sx` est le point de SORTIE, devant le gradin. Il doit etre HORS de la boite d'obstacle du gradin
  //    (face avant + marge), sans quoi se lever declencherait la repoussee et expedierait le joueur de cote.
  //  - on laisse 60 cm a chaque bout : au ras du container d'un cote et de la rampe de l'autre, le joueur
  //    serait assis dans le decor.
  const bancs = [];
  for (let i = 0; i < GRADIN.rangs; i++) {
    bancs.push({
      x: GRADIN.x0 - i * GRADIN.p - 0.17,
      z0: -GRADIN.long / 2 + 0.6, z1: GRADIN.long / 2 - 0.6,
      y: (i + 1) * GRADIN.h,
      sx: GRADIN.x0 + 0.42, fx: 1, fz: 0, rang: i,
    });
  }

  // La liste des surfaces mouillables remonte au moteur par le meme canal que les reperes : c'est
  // js/court.js qui la recopie dans scene.userData.env.wetMats, la ou js/weather.js va la chercher.
  scene.userData.solsLevallois = MOUILLE;

  // LE MARCHAND DE LEVALLOIS. Ce n'est pas Pierrick — c'est quelqu'un d'autre, et Haythem n'a pas encore son
  // personnage (sa consigne du 20/09 : ne rien poser la-bas, ni modele 3D ni bonhomme de secours). Le bonhomme en
  // primitives qui tenait la place depuis (un mannequin d'atelier assis au milieu du gradin, en plein centre de la
  // camera de match) etait le seul personnage du jeu dans ce style : on revient a sa consigne, et la boutique passe
  // par le menu pause, comme a Jemmapes. LE CHOIX EST A HAYTHEM, et il tient dans la constante qui suit :
  //   null                                  aucun marchand (la boutique au menu pause) ;
  //   { url, hauteur, nom }                 son personnage, assis au gradin : un GLB Avaturn au squelette Mixamo
  //                                         (hauteur relevee sur sa boite englobante), par exemple un avatar de
  //                                         passant — `sasseoir` (js/player.js) marche avec tous les avatars du jeu ;
  //   'mannequin'                           le bonhomme en primitives d'avant.
  const MARCHAND_LEVALLOIS = null;
  // Il s'assoit sur le PREMIER rang, a mi-longueur du cote de la poubelle : c'est la que le joueur passe, et il
  // reste accessible depuis le terrain sans avoir a grimper. Un bonhomme debout a l'air d'attendre le bus, un
  // bonhomme assis sur le gradin a l'air d'etre du quartier.
  const MARCHAND_Z = 4.2;
  const placeMarchand = {
    x: bancs[0].x, z: MARCHAND_Z, y: bancs[0].y, sx: bancs[0].sx, sz: MARCHAND_Z,
    fx: 1, fz: 0, rang: 0,
  };
  const MQ = MARCHAND_LEVALLOIS;

  scene.userData.reperes = {
    obstacles,
    bancs,
    // `sansModele` : on ne charge pas assets/marchand.glb (le bonhomme reste) ; `modele` : le GLB de ce terrain ;
    // `nom` : le nom affiche (repere flottant, aides) ; `assis` : le point d'assise, lu par js/game.js.
    sansMarchand: !MQ,
    marchand: MQ ? { x: placeMarchand.x, z: MARCHAND_Z, fx: 1, fz: 0, assis: placeMarchand,
      ...(MQ === 'mannequin' ? { sansModele: true, nom: 'Marchand' } : { modele: { url: MQ.url, hauteur: MQ.hauteur }, nom: MQ.nom || 'Marchand' }) } : undefined,
    yard: YARD_LEVALLOIS(ENC.XP, ENC.X),
  };
  // Les matieres photo se posent une fois le decor OPTIMISE : buildArena (js/court.js) appelle optimiserDecor des
  // notre retour, dans la meme tache ; une micro-tache passe juste apres, avant la premiere image.
  queueMicrotask(() => poserPhotos(scene));
  // Les surfaces du parc demandent le moteur de rendu (une passe de preparation sur le GPU) : on le recoit au
  // premier dessin du terrain. Ensuite, a chaque image, les photos partagees reprennent le filtrage anisotrope que
  // js/fx.js a pose sur la carte de normales du sol (voir synchroAniso) : une comparaison, rien de plus tant que le
  // prereglage ne change pas.
  let surfacesPosees = false;
  court.onBeforeRender = (renderer) => {
    if (!surfacesPosees) { surfacesPosees = true; poserSurfacesParc(scene, renderer); }
    synchroAniso(courtMat.normalMap);
  };
  return { court, gradin };
}

// étoile à quatre branches, très effilée : le motif qu'on retrouve partout sur les murets
function etoile(g, cx, cy, r, col) {
  g.fillStyle = col; g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, rr = i % 2 === 0 ? r : r * 0.22;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath(); g.fill();
}

// revêtement souple bleu de l'aire de jeux, autour de l'enceinte
function revetementSouple(canvasTex) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#3a5f79'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90000; i++) {                       // granulés de caoutchouc
      const c = Math.random() < 0.18 ? [86, 120, 142] : Math.random() < 0.3 ? [38, 62, 80] : [56, 92, 116];
      g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${rnd(0.3, 0.9)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(2, 5), rnd(2, 5));
    }
  }, [22, 22], false, 8);
}

// Un hasard REPRODUCTIBLE (mulberry32) : les salissures et les usures sont redessinees a l'identique d'un
// chargement a l'autre, et d'un redessin a l'autre du meme canvas (voir calerRougeGradin).
function hasard(graine) {
  let a = graine >>> 0;
  return (lo = 0, hi = 1) => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return lo + (((t ^ (t >>> 14)) >>> 0) / 4294967296) * (hi - lo);
  };
}

// =====================================================================
//  L'USURE DU SOL PEINT
// =====================================================================
// Un terrain de quartier n'a jamais le sol d'un plan d'architecte. Sur les photos du playground, trois choses
// se lisent des qu'on regarde a hauteur d'yeux, et aucune n'est dans la fresque :
//  - L'USURE. La couche de peinture part par plaques la ou l'on court, freine et retombe : sous les paniers
//    surtout, dans la raquette, sur le rond central, sur le chemin du portillon et au pied du gradin, ou l'on
//    pose les pieds en s'asseyant. Dessous reapparait le granulat sombre ;
//  - LE DELAVE. Le soleil ternit la peinture par grandes zones, le noir tourne au gris d'anthracite ;
//  - LA SALISSURE. Terre, poussiere et feuilles pourries s'accumulent au pied des murs et dans les angles.
// Et par-dessus, les empreintes poussiereuses des semelles, plus nombreuses la ou l'on joue.
//
// Deux cartes : un MASQUE a l'echelle du terrain (10 px/m, dessine ici a partir des vraies cotes — paniers,
// portillon, gradin), qui dit OU ; et une TRAME tuilable de 3 m (assets/tex/levallois/usure_sol.jpg : deux
// bruits fractals et les semelles), qui dit COMMENT — le bord dechiquete d'une plaque, la forme d'un pas. Le
// masque seul donnerait des ronds flous, la trame seule un sol use partout pareil.
function masqueUsure(K) {
  const { ENC, COURT } = K;
  const PX = 10, w = Math.round(ENC.W * PX), h = Math.round(ENC.Z * 2 * PX);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'lighter';               // chaque canal s'additionne independamment
  // le haut du canvas est le bout -Z (meme repere que la texture de la fresque)
  const X = (x) => (x - (ENC.CX - ENC.W / 2)) * PX, Y = (z) => (z + ENC.Z) * PX;
  const tache = (canal, x, z, rx, rz, a) => {
    const col = canal === 0 ? '255,0,0' : canal === 1 ? '0,255,0' : '0,0,255';
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(0.55, `rgba(${col},${a * 0.6})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.save(); g.translate(X(x), Y(z)); g.scale(rx * PX, rz * PX); g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore();
  };
  const bande = (canal, x0, z0, x1, z1, a) => {         // degrade lineaire du bord (x0,z0) vers l'interieur (x1,z1)
    const col = canal === 1 ? '0,255,0' : canal === 0 ? '255,0,0' : '0,0,255';
    const gr = g.createLinearGradient(X(x0), Y(z0), X(x1), Y(z1));
    gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  };
  const hz = Math.abs(COURT.HOOP_Z), R = 0, S = 1, D = 2;
  const alea = hasard(1789);
  // ---- R : l'USURE ----
  // (sous le cercle et dans la raquette, moitié moins qu'au premier jet : 0,85 et 0,55 y faisaient de grandes
  // plaques grises de près de trois mètres, en plein milieu de la caméra de match, sur une fresque refaite il y a peu)
  for (const s of [-1, 1]) {
    tache(R, 0, s * (hz - 1.0), 1.5, 1.4, 0.45);        // la reception sous le cercle
    tache(R, 0, s * (hz - 1.9), 2.7, 2.9, 0.3);         // la raquette
    tache(R, 0, s * (hz - 4.6), 1.1, 0.9, 0.35);        // la ligne des lancers francs
    tache(R, 0, s * (hz - 7.4), 1.9, 1.4, 0.3);         // le haut de l'arc, d'ou l'on shoote
    for (const sx of [-1, 1]) tache(R, sx * 4.6, s * (hz - 3.4), 1.7, 1.9, 0.26);   // les ailes
  }
  tache(R, 0, 0, 2.5, 2.5, 0.45);                       // le rond central, l'entre-deux
  tache(R, 0, 0, 4.2, 10.5, 0.16);                      // le couloir qu'on remonte d'un panier a l'autre
  // le chemin du portillon (mur du fond -Z, PORTAIL_X) jusqu'au jeu, et le passage cote quai
  for (let t = 0; t <= 1.001; t += 0.25) tache(R, PORTAIL_X - 2.2 * t, -ENC.Z + 0.6 + 5.5 * t, 1.1, 1.3, 0.34 * (1 - 0.4 * t));
  tache(R, ENC.XP - 1.0, 0, 1.3, 1.8, 0.24);
  tache(R, GRADIN.x0 + 0.45, 0, 0.55, 12.4, 0.38);      // les pieds de ceux qui s'assoient
  tache(R, POU.x + 0.8, POU.z - 0.6, 1.4, 1.3, 0.26);   // l'angle de la poubelle, ou l'on entre
  // ---- G : la SALISSURE ----
  bande(S, 0, -ENC.Z, 0, -ENC.Z + 0.8, 0.6);
  bande(S, 0, ENC.Z, 0, ENC.Z - 0.8, 0.6);
  bande(S, ENC.XP, 0, ENC.XP - 0.55, 0, 0.4);
  bande(S, GRADIN.x0, 0, GRADIN.x0 + 0.5, 0, 0.5);      // le pied du gradin
  bande(S, -ENC.X, 0, -ENC.X + 0.6, 0, 0.5);
  for (const [x, z] of [[-ENC.X, -ENC.Z], [-ENC.X, ENC.Z], [ENC.XP, -ENC.Z], [ENC.XP, ENC.Z]]) tache(S, x, z, 2.6, 2.6, 0.65);
  tache(S, POU.x, POU.z, 1.1, 1.0, 0.55);               // le pied de la poubelle
  tache(S, GRADIN.x0 + 0.2, CONT.z, 0.8, 1.9, 0.4);     // le devant du container
  for (let i = 0; i < 12; i++) {                        // des flaques seches, la ou l'eau stagne
    tache(S, alea(-ENC.X + 3, ENC.XP - 1), alea(-ENC.Z + 1, ENC.Z - 1), alea(0.6, 1.8), alea(0.5, 1.5), alea(0.12, 0.3));
  }
  // ---- B : le DELAVE ----
  for (let i = 0; i < 16; i++) {
    tache(D, alea(-ENC.X, ENC.XP), alea(-ENC.Z, ENC.Z), alea(2.5, 6.5), alea(2.5, 6.5), alea(0.25, 0.65));
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;                    // c'est une donnee, pas une couleur
  t.anisotropy = 4;
  return t;
}

const SOL_ENTETE = `
uniform sampler2D uMasque;    // R usure, G salissure, B delave : a l'echelle du terrain
uniform sampler2D uUsure;     // R bruit large, G bruit fin, B semelles : tuile de 3 m
uniform vec2 uRepU;           // repetitions de cette tuile sur le terrain
uniform vec4 uSolA;           // force du grain, de l'usure, du delave, de la salissure
float levUse = 0.0, levSale = 0.0, levPas = 0.0;
`;
const SOL_COULEUR = `
{
  vec4 pk = texture2D( roughnessMap, vRoughnessMapUv );                          // le granulat, tuile de 2 m
  vec4 ms = texture2D( uMasque, vMapUv );
  vec4 br = texture2D( uUsure, vMapUv * uRepU );                                 // 3 m : le bord des plaques, les pas
  vec4 bl = texture2D( uUsure, vMapUv * uRepU * 0.43 + vec2( 0.37, 0.71 ) );     // 7 m : les grandes plaques
  vec3 c = diffuseColor.rgb;
  float lum = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  // 1. le grain du granulat, et la houle du coulage — deux echelles, le millimetre et le metre
  c *= max( 1.0 + ( pk.r - 0.5 ) * 2.0 * uSolA.x, 0.0 ) * ( 1.0 + ( bl.r - 0.5 ) * 0.14 );
  // 2. le delave : la peinture ternit et s'eclaircit par grandes zones
  float del = ms.b * smoothstep( 0.3, 0.7, bl.g ) * uSolA.z;
  c = mix( c, vec3( lum ) * 1.08 + 0.018, del );
  // 3. l'usure : la peinture part par plaques ; dessous, le granulat nu, sombre et grenu. Une peinture de sol qui
  // s'use se TERNIT d'abord, par grandes zones au bord flou : la fenetre de +-0,10 autour du seuil donne ce fondu
  // (a +-0,035 le bord etait net et tachete, une moisissure grise sur le noir de la fresque)
  float seuil = bl.r * 0.62 + br.g * 0.38;
  levUse = smoothstep( seuil - 0.10, seuil + 0.10, ms.r * uSolA.y );
  vec3 nu = c * 0.45 + vec3( 0.040, 0.038, 0.036 ) * ( 0.5 + pk.r );
  c = mix( c, nu, levUse * 0.72 );
  // 4. les semelles poussiereuses, plus nombreuses la ou l'on joue
  levPas = clamp( br.b * ( 0.3 + ms.r * 1.4 ), 0.0, 1.0 );
  c = mix( c, vec3( 0.22, 0.205, 0.18 ), levPas * 0.2 );
  // 5. la salissure des pieds de murs et des angles : terre et poussiere, brunes, par plaques
  levSale = ms.g * smoothstep( 0.15, 0.75, bl.r * 0.45 + br.g * 0.35 + ms.g * 0.45 ) * uSolA.w;
  c = mix( c, c * vec3( 0.6, 0.54, 0.45 ) + vec3( 0.028, 0.023, 0.016 ), levSale );
  diffuseColor.rgb = c;
}
`;
// L'usure est plus mate que la peinture (le granulat nu n'a plus de liant), la poussiere aussi.
const SOL_RUGOSITE = `
roughnessFactor = min( 1.0, roughnessFactor + levUse * 0.07 + levSale * 0.08 + levPas * 0.05 );
`;
function poserUsureSol(mat, K) {
  const { ENC } = K;
  const u = {
    uMasque: { value: masqueUsure(K) },
    uUsure: { value: null },
    uRepU: { value: new THREE.Vector2(ENC.W / 3, (ENC.Z * 2) / 3) },
    // grain, usure, delave, salissure. Le delave reste leger : la fresque a ete refaite il y a peu, ses aplats sont
    // encore francs sur les photos — a 0,42 le jaune tournait au beurre. L'usure aussi, pour la meme raison : a 1,0
    // elle rongeait le noir des raquettes par plaques gris clair (66 contre 41 en sRGB, camera TV, extreme) ; a 0,55
    // il reste un voile use, doux, sous le cercle (47 contre 41, sans bord) : elle ne mord plus que la ou le trafic et
    // la trame se rejoignent. A 0,4 on ne la voyait plus (45) ; a 0,7 les plaques revenaient. (Ne pas la « plafonner »
    // sur le noir : un noir use laisse bien voir un granulat plus clair — invisible, autant la retirer.)
    uSolA: { value: new THREE.Vector4(0.9, 0.55, 0.28, 0.85) },
  };
  brancherPhoto('usure_sol', u.uUsure, 'value');
  mat.__usureSol = u;
  mat.onBeforeCompile = (sh) => {
    for (const k in u) sh.uniforms[k] = u[k];
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + SOL_ENTETE)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + SOL_COULEUR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + SOL_RUGOSITE);
  };
  mat.customProgramCacheKey = () => 'lev-sol-1';
  mat.needsUpdate = true;
}

// =====================================================================
//  MURETS PEINTS
// =====================================================================
// Ce sont des MURS DROITS — face verticale, chant plat en haut, environ 1,35 m. Je les avais faits en bank de
// skatepark d'apres une photo en contre-plongee : la vue Street View montre qu'il n'en est rien.
//
// Ce qui fait leur allure, ce n'est pas la forme mais la PEINTURE : de grands aplats coupes EN DIAGONALE (le
// jaune passe au rouge sur une oblique franche, jamais sur une verticale) et de petits losanges a quatre
// branches semes dessus, noirs et rouges sur le jaune, blancs et noirs sur le rouge. Tout ca se peint dans une
// texture : une seule boite par cote, la diagonale est exacte et les motifs sont poses au bon endroit du
// premier coup. Trois douzaines de meshes de couleurs differentes ne donnaient qu'un damier.
function murets(scene, K) {
  const { ENC, box, canvasTex } = K;
  const E = MUR.ep;

  // `bandes` : le bord GAUCHE de chaque aplat, en metres depuis le debut du mur, en haut puis en bas. Quand
  // les deux different, la coupe est oblique — c'est exactement ce qu'on voit sur la photo.
  // `trouee` : { de, a } en metres depuis le DEBUT du mur. Le mur est alors construit en DEUX troncons avec un
  // vide entre les deux — c'est comme ca qu'on menage l'ouverture du portail. Sans elle, le portail etait
  // simplement plaque DEVANT un mur continu : on voyait le rouge au travers de ses barreaux, et il ne servait
  // plus a rien puisqu'il n'ouvrait sur rien.
  const poser = (axe, long, cx, cz, retourne, bandes, hauteur, trouee, uniCol, emi = 0.09) => {
    if (trouee) {
      const debut = (axe === 'x' ? cx : cz) - long / 2;
      // chaque troncon garde les bandes a leur place ABSOLUE le long du mur : les diagonales se raccordent
      // d'un cote a l'autre de l'ouverture, comme sur un vrai mur perce apres coup.
      const seg = (d0, d1) => {
        if (d1 - d0 < 0.2) return;
        const bd = bandes.map((b) => ({ col: b.col, haut: b.haut - d0, bas: b.bas - d0 }));
        const c = debut + (d0 + d1) / 2;
        poser(axe, d1 - d0, axe === 'x' ? c : cx, axe === 'x' ? cz : c, retourne, bd, hauteur, null, uniCol, emi);
      };
      seg(0, trouee.de); seg(trouee.a, long);
      return null;
    }
    const H = hauteur || MUR.h;
    const tex = murTexture(canvasTex, long, H, bandes);
    const mats = [];
    // Les faces qu'on ne peint pas. Sur un mur qui fait un RETOUR D'ANGLE, on voit forcement un chant et le
    // dessus : les laisser en beton nu posait au milieu du coin un gros bloc gris clair qui n'existe nulle
    // part. Un muret d'angle est peint sur toutes ses faces visibles.
    // (le beton de ces faces-la recoit la meme photo que la face peinte, et la salissure du pied)
    const uni = mouille(marquerPhoto(new THREE.MeshStandardMaterial({ color: uniCol || 0xb9b5aa, roughness: 0.75 }),
      'betonPeint', { pied: 0.3 }));
    // Le soleil du terrain vient du cote +X/+Z : la face peinte du mur du fond lui tourne le dos et se
    // retrouve en permanence a l'ombre, ou le rouge vif descend au bordeaux et le blanc au beige. Sur les
    // photos, prises sous un ciel couvert, la peinture garde sa couleur. On rend donc la face legerement
    // emissive de sa PROPRE texture : les zones eclairees ne bougent pas, les zones a l'ombre remontent juste
    // assez pour qu'on reconnaisse la couleur.
    // L'EMISSION BAISSE DE MOITIE. Je l'avais montee a 0,17 parce que la face peinte tourne le dos au
    // soleil et virait au bordeaux ; depuis, une lumiere de remplissage venue de l'autre bord (js/court.js)
    // fait ce travail proprement. A 0,17 par-dessus, le mur ne recevait plus aucune ombre — ni celle du
    // grillage, ni celle des arbres — et se lisait comme un aplat decoupe.
    // Et il a du GRAIN : un muret peint au rouleau garde la trame de l'enduit, qui accroche la lumiere
    // rasante du soir. Sans elle, c'est une surface de synthese.
    const face = mouille(new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.74, metalness: 0.02,
      emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: emi,
    }));
    // LE BETON PEINT PHOTOGRAPHIE (painted_concrete_02) : les pores, les reprises de talochage et les rayures
    // d'un vrai mur peint, a leur taille reelle. Relief DOUX : sur les photos le muret est peint lisse, a fort
    // relief il tournait au crepi. Grain retenu : au-dela, le rouge et le jaune se tachent.
    marquerPhoto(face, 'betonPeint', { relief: 0.45, grain: 0.35, rugo: 0.7 });
    // BoxGeometry range ses faces dans l'ordre +X, -X, +Y, -Y, +Z, -Z. Seule la face tournee vers le terrain
    // porte la peinture ; le reste est du beton nu, comme a l'arriere d'un vrai muret.
    if (axe === 'x') mats.push(uni, uni, uni, uni, retourne ? uni : face, retourne ? face : uni);
    else mats.push(retourne ? uni : face, retourne ? face : uni, uni, uni, uni, uni);
    const geo = new THREE.BoxGeometry(axe === 'x' ? long : E, H, axe === 'x' ? E : long);
    const m = new THREE.Mesh(geo, mats);
    m.position.set(cx, H / 2, cz); m.castShadow = true; m.receiveShadow = true;
    scene.add(m);

    // LES BOUTS SONT ARRONDIS. Sur les photos, la ou un muret s'interrompt — de part et d'autre du portail
    // surtout — il ne se termine pas par une aretre vive : le beton est coule en DEMI-ROND, du rayon de
    // l'epaisseur du mur. Ca se voit tout de suite quand on passe le portail, et c'est ce qui donne a ces
    // murets leur air d'ouvrage de ville plutot que de cloison posee.
    //
    // On prend la couleur de la bande qui touche chaque bout : a gauche la premiere, a droite la derniere.
    // Un simple cylindre de rayon E/2 suffit, puisqu'il a exactement l'epaisseur du mur.
    // On prend la couleur qui COUVRE reellement l'extremite, pas la premiere ou la derniere de la liste :
    // un troncon issu d'une trouee herite des bandes du mur entier, avec leurs positions d'origine, donc la
    // derniere de la liste peut tres bien commencer bien apres la fin du troncon. C'est ce qui donnait un
    // bout jaune au mur rouge, juste a cote du portail.
    const boutCol = (fin) => {
      if (!bandes || !bandes.length) return uniCol || 0xb9b5aa;
      const pos = fin ? long : 0;
      let col = bandes[0].col;
      for (const b2 of bandes) if (pos >= (b2.haut + b2.bas) / 2) col = b2.col;
      return new THREE.Color(col).getHex();
    };
    for (const fin of [false, true]) {
      const t = (fin ? 1 : -1) * long / 2;
      const rond = new THREE.Mesh(new THREE.CylinderGeometry(E / 2, E / 2, H, 14),
        marquerPhoto(new THREE.MeshStandardMaterial({ color: boutCol(fin), roughness: 0.7 }), 'betonPeint',
          { tri: true, relief: 0.45, grain: 0.35, pied: 0.2 }));
      rond.position.set(axe === 'x' ? cx + t : cx, H / 2, axe === 'x' ? cz : cz + t);
      rond.castShadow = true; rond.receiveShadow = true; scene.add(rond);
    }
    return m;
  };

  const LX = ENC.W + E * 2, LZ = ENC.Z * 2;

  // ---- fond -Z : c'est le mur qu'on a derriere le panier sud. Jaune a gauche, grande diagonale, puis rouge.
  // Une SEULE grande diagonale, comme sur la photo : le jaune occupe la moitie gauche, puis une oblique
  // franche fait passer au rouge jusqu'au bout. Enchainer deux obliques de sens contraire dessinait un
  // chevron qui n'existe nulle part sur le terrain reel.
  // PORTAIL : le mur est perce a son endroit. `PORTAIL_X` est la seule source de verite, partagee avec la
  // construction du portail lui-meme, pour que l'ouverture et le vantail ne puissent pas se desynchroniser.
  const trouX = PORTAIL_X + LX / 2 - ENC.CX;      // position de l'ouverture, en metres depuis le debut du mur
  // LA PHOTO DE FACE DONNE TOUT, et en trois points.
  //  1. La sequence est SARCELLE, JAUNE, ROUGE, lue depuis le cote gradin (ce mur-ci n'est pas pose
  //     retourne : son index 0 tombe au bout -X). Le jaune que je remettais au bout n'existe pas, et le
  //     sarcelle manquait completement.
  //  2. Le pan jaune est PLUS HAUT que ses deux voisins, d'un bon quart de metre, et le ressaut tombe
  //     exactement la ou commence le rouge. C'est ce decrochement qui donne son relief au fond du terrain.
  //  3. Le passage du jaune au rouge est une longue OBLIQUE, le jaune descendant plus loin en bas qu'en
  //     haut.
  // Une hauteur n'etant pas une bande, on ne peut pas la peindre : on construit donc le mur en TROIS
  // troncons. L'oblique vit a l'interieur du troisieme, sinon elle serait coupee par un joint.
  const murZ = (d0, d1, bandes, hauteur, trouee) =>
    poser('x', d1 - d0, ENC.CX - LX / 2 + (d0 + d1) / 2, -ENC.Z - E / 2, false,
          bandes, hauteur, trouee);
  // DEUX troncons, pas trois : le sarcelle et le debut du jaune partagent la meme hauteur, on les peint
  // donc d'un seul tenant. Un joint de plus aurait mis un bout arrondi en plein milieu d'un aplat.
  murZ(0, HAUT_F, [
    { col: C.sarcelle, haut: 0, bas: 0 },
    { col: C.jaune, haut: SARC_F, bas: SARC_F },
  ], MUR.h + REHAUSSE);
  // LE ROUGE NE VA PAS JUSQU'AU BOUT. Passe le portail, le mur REDEVIENT JAUNE jusqu'a l'angle du quai —
  // c'est le petit troncon qu'on a devant soi quand on entre sur le terrain. Je l'avais dans la premiere
  // version, je l'ai retire en refaisant ce mur sur une photo qui, justement, s'arrete avant. Les offsets
  // sont comptes depuis le debut de CE troncon, qui commence lui-meme a HAUT_F.
  // Le mur droit s'arrete ou commence l'arc de l'angle (FIN_Z, compte depuis le bout -X).
  const FIN_Z = LX - E - ARC_R, finRel = FIN_Z - HAUT_F;
  const trouDe = trouX - HAUT_F - PORTAIL_L / 2, trouA = trouX - HAUT_F + PORTAIL_L / 2;
  murZ(HAUT_F, FIN_Z, [
    { col: C.jaune, haut: 0, bas: 0 },
    { col: C.rouge, haut: 3.7, bas: 1.3 },       // l'oblique : le rouge mord plus tot EN BAS
    // passe le portail, le mur redevient JAUNE (la coupure tombe dans l'ouverture, on ne la voit pas)
    { col: C.jaune, haut: trouA - 0.05, bas: trouA - 0.05 },
    // ... et le ROUGE revient dans l'angle du quai. La vue Street View de novembre 2021 le montre a droite
    // du portail : un pan jaune, puis une oblique (le rouge mord plus tot EN HAUT) et le rouge qui tourne
    // avec l'arc. C'est aussi la couleur du sol et de la bordure a cet endroit.
    { col: C.rouge, haut: finRel - 0.45, bas: finRel - 0.2 },
  ], MUR.h, { de: trouDe, a: trouA });
  // ---- fond +Z ----
  // Le fond +Z : grande section ROUGE, puis BLANCHE sous le gradin, puis jaune au bout. C'est le mur qu'on a
  // dans le dos quand on arrive sur le terrain par ce cote-la.
  // Ce mur est pose RETOURNE : l'index des bandes part donc du bout +X et croit vers le coin du gradin.
  // Les photos du 20/09, prises depuis ce coin, montrent du ROUGE au ras de l'angle puis du BLANC apres une
  // oblique — et pas la moindre trace de jaune. J'avais l'ordre inverse, donc un grand aplat jaune juste la
  // ou se tient le joueur quand il entre sur le terrain.
  // Les deux photos de nuit prises depuis le terrain donnent la sequence complete de ce mur, du bout le plus
  // eloigne jusqu'au coin du gradin : BLEU ARDOISE, puis BLANC apres une oblique, puis un grand ROUGE
  // jusqu'a l'angle. Le mur etant pose retourne, l'index part du bout +X. Je terminais par du jaune, qui
  // n'existe nulle part sur ce mur.
  // Le ROUGE ne tient que deux metres dans l'angle, et le BLANC occupe tout le reste jusqu'au bleu ardoise
  // du bout. J'en mettais huit metres : depuis le coin on ne voyait que du rouge, alors que la photo montre
  // un petit retour rouge puis un grand pan blanc, celui qui porte les etoiles et devant lequel se tient la
  // poubelle. Le mur etant pose retourne, l'index part du bout +X.
  // L'ordre des bandes de CE mur croit avec x, et non l'inverse — verifie a l'ecran, pas deduit de
  // `retourne`. Le ROUGE doit donc venir EN PREMIER pour tomber dans l'angle du gradin, suivi du grand pan
  // BLANC qui porte les etoiles et devant lequel se tient la poubelle, puis du bleu ardoise au bout. Je
  // l'avais dans l'autre sens : depuis le coin on avait du blanc, et le rouge etait parti a l'autre bout.
  // Repere etabli A L'ECRAN, apres deux essais rates : sur ce mur pose `retourne`, l'index 0 tombe au bout
  // +X (cote Seine) et CROIT vers le coin du gradin. La derniere bande est donc celle qu'on voit depuis
  // l'angle. Sequence de la photo, lue depuis le coin : un retour ROUGE de deux metres et demi, puis le
  // grand pan BLANC qui porte les etoiles et devant lequel se tient la poubelle, puis le bleu ardoise au
  // bout. Donc rouge EN DERNIER.
  // LE PANORAMA DU 20/09 TRANCHE, et dans l'autre sens que ce que j'avais compris. Il balaye tout le bout
  // +Z d'un seul tenant : a gauche le garde-corps en fer forge du QUAI, donc le cote Seine (+X) ; a droite
  // le bout du gradin, sa rampe verte et le velo, donc le cote -X. Entre les deux, le mur du fond passe du
  // ROUGE au BLANC par une coupure FRANCHE ET VERTICALE, a peu pres au milieu. Le rouge est du cote SEINE,
  // le blanc du cote GRADIN — c'est devant le blanc que se tient la poubelle, et c'est le blanc qui porte
  // les etoiles rouge et ardoise. Je l'avais exactement a l'envers, avec en plus un bleu ardoise au bout
  // qui n'existe pas, et la coupure en oblique alors qu'elle est au cordeau.
  // Sens verifie A L'ECRAN, et non deduit de `retourne` : sur ce mur l'index 0 tombe au bout +X, celui de
  // la SEINE, et croit vers le gradin. Le ROUGE vient donc en premier, et le BLANC couvre toute la moitie
  // cote gradin — c'est lui qui porte la poubelle et les etoiles rouge et ardoise.
  // La photo de nuit prise depuis le terrain donne enfin ce mur en entier, d'un bout a l'autre, et il a
  // QUATRE pans, pas deux. Lus depuis le quai (l'index 0 de ce mur-ci tombe au bout +X) :
  //   un court retour ROUGE dans l'angle du quai, puis un grand pan SARCELLE — c'est lui qui manquait
  //   completement —, puis le BLANC qui porte les etoiles, puis le ROUGE jusqu'au gradin.
  // Et comme sur le mur d'en face, la hauteur n'est pas constante : le dernier pan rouge est REHAUSSE. On
  // le voit tout de suite sur la photo, il cache les gens qui passent derriere alors qu'au-dessus du
  // sarcelle on voit les massifs. Le rapport mesure sur l'image est de 1,8 ; on reprend le meme ressaut
  // qu'au bout -Z plutot que d'inventer une seconde valeur.
  // Le passage du blanc au rouge est une OBLIQUE : le rouge mord plus tot en bas.
  // Sa face peinte regarde -Z, a l'oppose du soleil : sur la photo du coin gradin elle reste d'un rouge vif,
  // dans le jeu elle tombait au bordeaux. Un peu plus d'emission, pour ce mur-la seulement.
  const murPZ = (d0, d1, bandes, hauteur) =>
    poser('x', d1 - d0, ENC.CX + LX / 2 - (d0 + d1) / 2, ENC.Z + E / 2, true, bandes, hauteur, null, null, 0.24);
  // L'ANGLE DU QUAI, d'apres la photo prise depuis le terrain le 26/09 (la Seine a gauche, le pont au
  // fond). Les murs n'y ont PAS tous la meme hauteur :
  //  - le pan ROUGE de l'angle est BAS, a peine plus haut que le genou (0,68 m : 58 px contre 95 pour le
  //    sarcelle, a la meme distance) ;
  //  - il se termine par un PILASTRE rouge qui remonte d'un coup a la hauteur du sarcelle, surmonte d'un
  //    poteau carre couleur rouille ;
  //  - le SARCELLE a etoiles repart de la a hauteur pleine jusqu'au poteau du panier, puis le BLANC.
  // Je les avais tous a la meme hauteur : le coin avait l'air d'une boite, sans le decrochement qui le
  // caracterise.
  // Le pan bas commence ou finit l'arc de l'angle (E + ARC_R depuis le bout +X).
  const DEB_PZ = E + ARC_R, PIL = DEB_PZ + ANGLE_QUAI;
  murPZ(DEB_PZ, PIL, [{ col: C.rouge, haut: 0, bas: 0 }], MUR_BAS);
  murPZ(PIL, PZ_HAUT - PZ_RAMPE, [
    { col: C.sarcelle, haut: 0, bas: 0 },
    { col: C.blanc, haut: 10.6 - PIL, bas: 10.6 - PIL },
  ], MUR.h);
  {
    const xP = ENC.CX + LX / 2 - PIL, zP = ENC.Z + E / 2;
    const rougeP = mouille(marquerPhoto(new THREE.MeshStandardMaterial({ color: 0xd42a24, roughness: 0.74 }), 'betonPeint',
      { relief: 0.45, grain: 0.35, pied: 0.25 }));
    box(0.38, MUR.h + 0.04, E + 0.06, rougeP, xP, (MUR.h + 0.04) / 2, zP, scene);
    // le poteau carre couleur rouille : de l'acier peint qui s'ecaille, la rouille dans les eclats
    const rouille = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x7c3a2b, roughness: 0.8, metalness: 0.25 }), 'metal',
      { rouille: 0.8, teinteRouille: 0x5a2e18, pied: 0.4 });
    box(0.16, 3.3, 0.16, rouille, xP, 1.65, ENC.Z + E + 0.12, scene);
  }
  // LA MONTEE EST UNE RAMPE, PAS UNE MARCHE. Sur la photo, le mur ne saute pas d'un coup : son chant
  // s'eleve en une longue oblique de deux metres et demi, et c'est cette oblique qui fait tout le caractere
  // du mur. Je n'avais qu'un decrochement vertical, qui donnait un mur coupe a la scie.
  // `poser` ne sait construire que des troncons a hauteur constante. Un escalier de huit marches se lisait
  // bien de loin mais montrait ses dents de pres ; on extrude donc un vrai TRAPEZE. Le profil est dessine
  // dans le plan XY puis extrude sur l'epaisseur du mur, ce qui donne un chant parfaitement droit.
  // Attention au sens : l'offset croit vers -X, donc x = debut - offset. Le profil part de son bout HAUT
  // (x = 0) et s'etend vers +x, c'est-a-dire vers le bout bas.
  const rampeMat = mouille(marquerPhoto(new THREE.MeshStandardMaterial({ color: 0xd42a24, roughness: 0.74,
    emissive: 0xd42a24, emissiveIntensity: 0.12 }), 'betonPeint', { tri: true, relief: 0.45, grain: 0.35, pied: 0.25 }));
  const prof = new THREE.Shape();
  prof.moveTo(0, 0);
  prof.lineTo(PZ_RAMPE, 0);
  prof.lineTo(PZ_RAMPE, MUR.h);
  prof.lineTo(0, MUR.h + REHAUSSE_PZ);
  const talus = new THREE.Mesh(new THREE.ExtrudeGeometry(prof, { depth: E, bevelEnabled: false }), rampeMat);
  talus.position.set(ENC.CX + LX / 2 - PZ_HAUT, 0, ENC.Z);
  talus.castShadow = true; talus.receiveShadow = true;
  scene.add(talus);
  murPZ(PZ_HAUT, LX, [{ col: C.rouge, haut: 0, bas: 0 }], MUR.h + REHAUSSE_PZ);

  // LE RETOUR D'ANGLE ROUGE, CONTRE LA CLOTURE. Le mur du fond ne s'arrete pas net : il TOURNE et longe le
  // cote du gradin. Mais il le longe A LA LIMITE DE L'ENCEINTE, pas a l'aplomb de la face avant du gradin.
  // Je le posais a GRADIN.x0, c'est-a-dire 2,15 m A L'INTERIEUR : il se dressait en plein milieu du
  // degagement, et c'est ce pan rouge qu'on avait devant soi en arrivant dans l'angle — avec, derriere lui,
  // le vrai coin qu'on apercevait par-dessus. Sur la photo il n'y a rien dans cet espace : du caoutchouc,
  // une bande de beton, la poubelle.
  //
  // Il ne commence qu'apres le gradin (qui finit a z = 12,7), donc il peut descendre jusqu'au muret sans le
  // traverser. Le terrain est a DROITE de ce retour (x positif) : la face peinte est celle qui regarde +X.
  // RIEN A L'ANGLE DU QUAI. J'y avais mis un retour de mur, un pilastre rehausse et un coffret technique,
  // d'apres une photo rapprochee — mais cette photo-la montrait L'AUTRE angle. Celle prise depuis le
  // terrain, avec le garde-corps du quai et la Seine derriere, est sans appel : le mur passe du ROUGE au
  // SARCELLE dans le MEME PLAN, a la meme hauteur et a la meme epaisseur. Aucun decrochement. Le gros bloc
  // rouge qui depassait cassait la ligne et ne ressemblait a rien de ce qu'on voit sur place.

  // IL EST BLANC, pas rouge. Les trois photos du coin sont formelles : le grand pan blanc du mur du fond
  // — celui qui porte les etoiles rouge et ardoise et devant lequel est posee la poubelle — TOURNE et
  // continue le long du gradin. Le pan rouge, lui, est a l'autre bout, du cote du quai. Peint en rouge,
  // ce retour se lisait comme un bloc plante en travers du degagement, et c'est ce que Haythem pointait
  // depuis le debut en disant « enleve-moi ce mur rouge ».
  const RET_Z0 = 13.0, RET_Z1 = ENC.Z + E, RET_X = -ENC.X + E / 2;
  // LA PHOTO DU COIN (20/09, 20 h 05) : ce retour n'est pas blanc d'un bout a l'autre. Dans l'angle il est
  // ROUGE sur 1,2 m, puis une oblique (le rouge mord plus loin EN BAS) le fait passer au BLANC jusqu'au
  // gradin. Et ses etoiles sont a des places precises : une jaune sur le rouge, une rouge et une bleue sur
  // le blanc. L'index 0 de ce mur tombe dans l'angle (+Z).
  const bandesRet = [{ col: C.rouge, haut: 0, bas: 0 }, { col: C.blanc, haut: 1.2, bas: 1.45 }];
  bandesRet.etoiles = [
    { x: 0.57, y: 0.24, r: 0.07, col: '#f0c33c' },
    { x: 1.78, y: 0.42, r: 0.12, col: '#d03a3a' },
    { x: 2.28, y: 0.32, r: 0.075, col: '#46566e' },
  ];
  poser('z', RET_Z1 - RET_Z0, RET_X, (RET_Z0 + RET_Z1) / 2, false, bandesRet, null, null, 0xe9e6dc);

  // PALISSADE VERT SAPIN, tendue sur le grillage derriere le mur. Deux corrections par rapport a l'essai
  // precedent, toutes deux visibles sur la photo rapprochee :
  //  - elle commence AU-DESSUS du mur et s'arrete assez bas pour qu'on voie les immeubles et les arbres par
  //    dessus. Elle partait du sol sur 2,60 m et, combinee a la bache Nike posee juste derriere, elle formait
  //    un grand rectangle noir qui mangeait tout le fond du terrain ;
  //  - sa teinte etait trop sombre pour survivre au contre-jour : a 0x14372a elle rendait NOIRE. Un vert
  //    franc garde sa couleur meme a l'ombre.
  // Le brise-vue est un VERT SAPIN PRESQUE NOIR, et il est POSE SUR le chant du mur — pas suspendu plus
  // haut. Les photos du 20/09 le montrent : la bande verte commence exactement la ou le rouge s'arrete, elle
  // monte de 85 cm, et au-dessus c'est la maille noire a ciel ouvert. Je l'avais mise en vert d'eau clair,
  // flottant 70 cm au-dessus du mur, ce qui laissait une fente et donnait un vert de terrain de tennis.
  // LE BRISE-VUE NE COURT PAS SUR LE MUR DU FOND. Les deux photos de nuit, prises face a ce mur, montrent
  // de la maille NUE au-dessus de lui : on voit les arbres, les immeubles et le ciel au travers. Le tissu
  // vert est sur le cote du GRADIN, la ou les photos de jour le montrent — c'est le meme cote que la bache
  // noire. Je le tendais sur toute la largeur du fond, ce qui bouchait l'horizon et verdissait tout l'angle.
  // LE BRISE-VUE VERT EXISTE, mais seulement DANS L'ANGLE. Sur la photo du coin il couvre le bas de la
  // cloture au-dessus des deux murets qui s'y rejoignent, sur quelques metres. Ce qu'il ne fait pas, c'est
  // courir au-dessus des BANCS : la-bas il y a la bache noire, puis la maille nue et les arbres. Je le
  // tendais sur toute la longueur, ce qui barrait la vue de tout le cote.
  const vertTissu = new THREE.MeshStandardMaterial({ color: 0x1c4534, roughness: 0.95, side: THREE.DoubleSide,
    emissive: 0x1c4534, emissiveIntensity: 0.14 });
  // Il monte a 1,15 m au-dessus du chant : sur la photo il fait a peu pres la hauteur du mur lui-meme,
  // et c'est lui qui donne au coin sa profondeur sombre.
  const palZ = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.9), vertTissu);
  palZ.position.set(RET_X - E / 2 - 0.02, MUR.h + 0.45, 13.8); palZ.rotation.y = Math.PI / 2; scene.add(palZ);
  // (plus de tissu le long du mur +Z : sur la photo du coin, au-dessus de ce mur-la, c'est la maille nue)

  // AU COIN, ce n'est pas un poteau mais un PANNEAU plein vert tres sombre, large et haut, plaque contre la
  // cloture : c'est lui qu'on voit monter au-dessus de tout sur la photo prise depuis l'angle. Un montant
  // carre de 42 cm ne rendait pas du tout la meme chose.
  // Les deux grands panneaux verts de l'angle sautent aussi : ils fermaient le coin qu'on cherche justement
  // a ouvrir, et ils cachaient le mur peint.

  // LE PILASTRE EXISTE BIEN — on voit ses deux aretes verticales sur la photo, le mur s'epaissit sur une
  // cinquantaine de centimetres. Mais il est DANS LE PLAN du mur, il deborde juste vers le terrain : pose
  // en avant et plus large, il creait un decrochement et une fente d'ombre a l'endroit meme ou les deux
  // murs doivent se rejoindre franchement. Il est aussi un peu en retrait du coin, pas dedans.
  // Le pilastre de CE coin-ci est blanc lui aussi : il n'est que l'epaississement du mur blanc.
  // LE PILASTRE EST ROUGE, ET IL EST SUR LE MUR DU FOND. La photo du coin le montre sans ambiguite : un gros
  // massif rouge d'un metre de large, colle dans l'angle contre le retour, qui avance de 28 cm et monte a
  // 1,90 m — plus haut que le mur rouge a sa gauche. Au-dessus, un CAISSON VERT FONCE de la meme largeur
  // monte encore d'un metre et demi. Le petit pilastre blanc que j'avais sur le retour n'existe pas.
  {
    const x0 = -ENC.X + E, xc = x0 + PILASTRE.L / 2, zc = ENC.Z + (E - PILASTRE.P) / 2;
    const rougeP = mouille(marquerPhoto(new THREE.MeshStandardMaterial({ color: new THREE.Color(C.rouge), roughness: 0.74,
      emissive: new THREE.Color(C.rouge), emissiveIntensity: 0.12 }), 'betonPeint', { relief: 0.45, grain: 0.35, pied: 0.25 }));
    box(PILASTRE.L, PILASTRE.H, PILASTRE.P + E, rougeP, xc, PILASTRE.H / 2, zc, scene);
    const caisson = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x1d4436, roughness: 0.8, metalness: 0.1 }), 'metal',
      { rouille: 0.35, relief: 0.5 });
    box(PILASTRE.L - 0.04, PILASTRE.HV - PILASTRE.H, PILASTRE.P + E - 0.08, caisson, xc,
        (PILASTRE.H + PILASTRE.HV) / 2, zc + 0.04, scene);
    // le boulon et sa rondelle, en haut du caisson : c'est le detail qu'on remarque sur la photo
    const boulon = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 10),
      new THREE.MeshStandardMaterial({ color: 0x2a6fa0, roughness: 0.5, metalness: 0.4 }));
    boulon.rotation.x = Math.PI / 2; boulon.position.set(xc + 0.1, PILASTRE.HV - 0.25, ENC.Z - PILASTRE.P + 0.02); scene.add(boulon);
  }

  // Pas de rampe ici : la barriere verte que j'avais dressee entre la poubelle et le gradin coupait le
  // degagement en deux, alors que tout l'interet de ce coin est qu'il soit justement degage.
  // ---- long cote riviere (+X) : PAS de grand muret ----
  // Sur la photo grand angle du bord de Seine, ce cote n'a qu'une BORDURE BLANCHE BASSE, de la hauteur d'une
  // marche, et le grillage vert juste derriere. C'est ce qui donne la vue degagee sur le fleuve. Un mur peint
  // de 1,36 m comme aux deux bouts bouchait completement l'horizon.
  // ELLE N'EST PAS BLANCHE : ELLE PREND LA COULEUR DU SOL. Sur la photo de l'angle du quai, la bordure
  // est JAUNE le long de l'aplat jaune, puis bleu ardoise, puis rouge au pied du mur : la peinture du sol
  // monte dessus sans interruption. Toute blanche, elle tracait un liseré de chantier le long du grillage.
  // Les couleurs sont LUES sur la texture du sol, colonne du bord, une fois l'image chargee
  // (peindreBordure) : si la fresque change, la bordure suit toute seule.
  const bordFace = bordureCanvas(1024, 16), bordDessus = bordureCanvas(16, 1024);
  const bordMat = (c) => {
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return mouille(marquerPhoto(new THREE.MeshStandardMaterial({ map: t, roughness: 0.72 }), 'betonPeint',
      { relief: 0.45, grain: 0.4, rugo: 0.7 }));
  };
  const matFace = bordMat(bordFace), matDessus = bordMat(bordDessus);
  const matDos = mouille(marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x9d9a92, roughness: 0.85 }), 'betonPeint',
    { grain: 0.8, pied: 0.2 }));
  // BoxGeometry : +X, -X, +Y, -Y, +Z, -Z. La face peinte est -X (tournee vers le terrain) et le dessus ;
  // les deux bouts butent contre les murs du fond, on ne les voit pas.
  // Elle s'arrete aux deux arcs d'angle : les textures, peintes sur les 32 m, sont recadrees d'autant.
  const LB = LZ - 2 * ARC_R;
  matFace.map.repeat.set(LB / LZ, 1); matFace.map.offset.set(ARC_R / LZ, 0);
  matDessus.map.repeat.set(1, LB / LZ); matDessus.map.offset.set(0, ARC_R / LZ);
  const bordure = new THREE.Mesh(new THREE.BoxGeometry(0.34, BORD_H, LB),
    [matDos, matFace, matDessus, matDos, matDos, matDos]);
  bordure.position.set(ENC.XP + 0.17, BORD_H / 2, 0); bordure.castShadow = true; bordure.receiveShadow = true;
  scene.add(bordure);
  BORDURE.face = { canvas: bordFace, mat: matFace };
  BORDURE.dessus = { canvas: bordDessus, mat: matDessus };
  if (BORDURE.image) peindreBordure(BORDURE.image);
  // LES DEUX ARCS D'ANGLE. Cote -Z le mur est a pleine hauteur, cote +Z c'est le pan rouge bas : l'arc part
  // de cette hauteur-la et descend en tournant jusqu'a celle de la bordure.
  arcAngle(scene, K, -1, MUR.h);
  arcAngle(scene, K, 1, MUR_BAS);

  // Pas de mur noir « WRITE » : les grandes capitales sont peintes SUR LE GRADIN lui-meme (voir buildGradin).
  // Je les avais mises sur un pan de mur a part parce que, sur une photo cadree serre, on ne voyait pas les nez
  // de marche blancs qui les traversent — c'est pourtant bien le gradin, en deux couleurs, blanc puis jaune.

  // Le CONTAINER SARCELLE : le local a materiel du playground. Il est DANS l'enceinte, dans le prolongement du
  // gradin, a l'oppose du retour d'angle rouge. Et ce n'est pas un 20 pieds : c'est un module COURT, d'environ
  // trois metres. Mesure a la sienne, il ne tenait evidemment pas dans le degagement et je l'avais sorti
  // derriere le mur, ou il n'a rien a faire.
  // Sa position se DEDUIT du gradin : ecrite en dur a -8,5 m elle etait juste tant que la face avant du
  // gradin etait a -7,72 ; des que l'enceinte s'est elargie et que le gradin a recule, le container est
  // reste sur place et s'est retrouve pose en plein degagement, a cheval sur la peinture. Il est DANS le
  // prolongement du gradin, donc centre sur la meme emprise que lui.
  container(scene, K, GRADIN.x0 - (GRADIN.rangs * GRADIN.p) / 2, CONT.z, Math.PI / 2,
            { L: CONT.L, H: CONT.H, P: CONT.P });

  // poubelle noire contre le muret, a l'angle : elle est sur toutes les vues de ce coin-la
  // Poubelle : ADOSSEE AU MUR DU FOND, sur la bande claire, juste a cote de l'escalier du gradin. Elle etait
  // plantee en plein terrain a 90 cm du gradin, et trop grosse : 1,05 m de haut sur 54 de diametre, on ne
  // voyait plus qu'elle.
  // (POU est declare en tete de fichier : la poubelle est posee ici, mais sa boite de collision est
  // construite dans buildLevallois, une autre fonction. Une seule source, sinon les deux divergent.)
  // 42 cm de diametre pour 78 de haut : a 47 elle faisait la taille d'un fut et mangeait tout le coin.
  const pou = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.78, 18),
    marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.55 }), 'metal',
      { tri: true, rouille: 0.25, relief: 0.5, pied: 0.3 }));
  pou.position.set(POU.x, 0.39, POU.z); pou.castShadow = true; scene.add(pou);
  // Couvercle CHROME et bombe : c'est la premiere chose qui accroche l'oeil sur les deux photos.
  // INOX BROSSE, pas miroir. A metalness 0,95 et roughness 0,12 le couvercle ne renvoyait que le coin,
  // qui est sombre : il rendait NOIR a l'ecran alors que c'est la chose la plus claire de la photo. Un peu
  // de diffus et beaucoup plus de rugosite, et il retrouve son eclat d'acier brosse.
  const couvercle = new THREE.Mesh(new THREE.SphereGeometry(0.225, 20, 8, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.34, metalness: 0.55,
      emissive: 0x3a3e44, emissiveIntensity: 0.35 }));
  couvercle.position.set(POU.x, 0.80, POU.z); couvercle.castShadow = true; scene.add(couvercle);

  // ---- PAS D'HABILLAGE DE SOL DANS LE DEGAGEMENT ----
  // J'y avais pose une bande de beton et un tapis de caoutchouc, d'apres les photos rapprochees du coin.
  // Le PLAN DESSINE de la fresque, lui, ne montre ni l'un ni l'autre : la peinture va d'un muret a
  // l'autre, et le degagement est peint comme le reste. C'est le plan qui fait foi — il couvre l'emprise
  // entiere et c'est la seule source ou l'on voit le terrain d'un seul tenant, sans ombre ni perspective.
  // Tout ce que je rajoutais par-dessus ne faisait que masquer la fresque et remettre du gris la ou il
  // n'y en a jamais eu.

  // ---- LA RAMPE VERTE DU BOUT DES BANCS ----
  // Deux tubes verts montent en biais au bout du gradin, avec une lisse horizontale : c'est le garde-corps
  // de la volee de marches, et sur le panoramique c'est la premiere chose qu'on voit a droite.
  const tubeVert = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x1f5b3a, roughness: 0.45, metalness: 0.5 }), 'metal',
    { tri: true, rouille: 0.35, relief: 0.4 });
  const PROF_G = GRADIN.rangs * GRADIN.p, HAUT_G = GRADIN.rangs * GRADIN.h;
  const rampe = new THREE.Group();
  const tube = (x0, y0, x1, y1, r) => {
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 10), tubeVert);
    t.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    t.rotation.z = Math.atan2(-dx, dy);
    t.castShadow = true; rampe.add(t);
  };
  tube(0, 0, 0, HAUT_G + 0.95, 0.032);                          // montant bas, cote terrain
  tube(-PROF_G, HAUT_G, -PROF_G, HAUT_G + 0.95, 0.032);         // montant haut, contre le grillage
  tube(0, HAUT_G + 0.95, -PROF_G, HAUT_G + 0.95, 0.030);        // lisse
  tube(0, HAUT_G * 0.45, -PROF_G, HAUT_G * 0.45 + 0.52, 0.026); // lisse intermediaire, en biais
  rampe.position.set(GRADIN.x0, 0, GRADIN.long / 2 + 0.16);
  scene.add(rampe);

  // PAS DE POTEAU RAYE dans l'angle du quai. La photo de cet angle, prise depuis le terrain, n'en montre
  // aucun : la bordure jaune y rejoint directement le pan rouge bas. Le mat de barbier plante la n'existait
  // que dans le jeu.

  // ---- LE PORTAIL ----
  // Il est dans le mur du FOND, a droite du panier sud, et pas sur le long cote riviere : sur la premiere vue
  // Street View on le voit se detacher juste a cote du panneau, avec la Seine au travers de ses barreaux.
  portail(scene, K, PORTAIL_X, -ENC.Z - MUR.ep / 2, 0);
}

// =====================================================================
//  LA BORDURE DU QUAI, PEINTE COMME LE SOL
// =====================================================================
// La texture du sol se charge en differe : la bordure est construite avant, avec un gris de beton, puis
// repeinte quand l'image arrive. Les deux ordres sont possibles (l'image peut sortir d'un cache), d'ou ce
// petit etat partage : celui qui arrive le second fait le travail.
const BORDURE = { image: null, face: null, dessus: null };

function bordureCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = '#cfcac0'; g.fillRect(0, 0, w, h);
  return c;
}

// Lit la couleur du sol le long du bord +X, la decoupe en aplats et la reporte sur la bordure. Le bord de
// l'image est bien de la peinture depuis que tools/plan_sol_levallois.py prolonge la fresque et non plus
// son trait de contour. On lit une colonne a 12 px du bord, soit 17 cm, et on moyenne sur quatre pixels.
function peindreBordure(img) {
  BORDURE.image = img;
  if (!BORDURE.face || !img || !img.width) return;
  const N = 512;                                          // un echantillon tous les 6 cm sur 32 m
  const c = document.createElement('canvas'); c.width = 4; c.height = N;
  const g = c.getContext('2d');
  // 12 px sur l'image de 1600 : l'echelle suit la resolution (la fresque nette en fait 2867)
  // (`echPx` et non `k` : la boucle de moyenne plus bas a deja son propre `k`)
  const echPx = img.width / 1600;
  g.drawImage(img, img.width - Math.round(12 * echPx), 0, Math.max(1, Math.round(4 * echPx)), img.height, 0, 0, 4, N);
  const d = g.getImageData(0, 0, 4, N).data;
  const ech = [];
  for (let y = 0; y < N; y++) {
    const m = [0, 0, 0];
    for (let x = 0; x < 4; x++) for (let k = 0; k < 3; k++) m[k] += d[(y * 4 + x) * 4 + k] / 4;
    ech.push(m);
  }
  // Aplats : on coupe quand la couleur s'ecarte franchement de la moyenne de l'aplat en cours, et on
  // rend au voisin tout aplat de moins de 20 cm (le trait blanc d'une ligne, un reste d'anticrenelage).
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const aplats = [];
  let cur = null;
  for (let y = 0; y < N; y++) {
    const e = ech[y];
    if (cur && dist(e, cur.moy) < 70) {
      cur.n++; for (let k = 0; k < 3; k++) cur.moy[k] += (e[k] - cur.moy[k]) / cur.n; cur.y1 = y + 1;
    } else {
      cur = { y0: y, y1: y + 1, n: 1, moy: e.slice() }; aplats.push(cur);
    }
  }
  const MIN = Math.ceil(0.2 / 32 * N);
  for (let i = 0; i < aplats.length; i++) {
    const a = aplats[i];
    if (a.y1 - a.y0 >= MIN || aplats.length === 1) continue;
    const v = aplats[i - 1] || aplats[i + 1];
    v.y0 = Math.min(v.y0, a.y0); v.y1 = Math.max(v.y1, a.y1);
    aplats.splice(i, 1); i--;
  }
  const css = (m) => `rgb(${Math.round(m[0])},${Math.round(m[1])},${Math.round(m[2])})`;
  // `lelong` : la face tournee vers le terrain, u le long de z (u = 0 au bout -Z) ; sinon le dessus, dont
  // la texture court le long de z en v (le haut de l'image au bout -Z).
  const peindre = (cible, lelong) => {
    const cv = cible.canvas, gg = cv.getContext('2d'), L = lelong ? cv.width : cv.height;
    for (const a of aplats) {
      gg.fillStyle = css(a.moy);
      const p0 = Math.floor(a.y0 / N * L), p1 = Math.ceil(a.y1 / N * L);
      if (lelong) gg.fillRect(p0, 0, p1 - p0, cv.height); else gg.fillRect(0, p0, cv.width, p1 - p0);
    }
    // la peinture au rouleau n'est pas un aplat de synthese : un grain, et le pied sali par le sol
    for (let i = 0; i < cv.width * cv.height * 0.05; i++) {
      gg.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
      gg.fillRect(Math.random() * cv.width, Math.random() * cv.height, 1, 1);
    }
    if (lelong) {
      const sale = gg.createLinearGradient(0, cv.height, 0, cv.height * 0.55);
      sale.addColorStop(0, 'rgba(70,60,48,0.35)'); sale.addColorStop(1, 'rgba(70,60,48,0)');
      gg.fillStyle = sale; gg.fillRect(0, 0, cv.width, cv.height);
    }
    cible.mat.map.needsUpdate = true;
  };
  peindre(BORDURE.face, true);
  peindre(BORDURE.dessus, false);
}

// =====================================================================
//  LES ANGLES ARRONDIS COTE SEINE
// =====================================================================
// Un quart de cercle de rayon ARC_R, tangent au bord du quai (x = ENC.XP) et au fond (z = sz * ENC.Z). Sa
// face interieure suit exactement le contour du sol peint. C'est l'AILE DU MUR ROUGE du fond qui tourne avec
// l'angle : elle garde la hauteur du mur (hFond) sur les trois quarts de l'arc, le dessus bien droit, et ne
// descend a la hauteur de la bordure que dans le dernier quart, contre le quai. (Haythem, 26/09 : l'arc
// « est bas et ensuite il monte » — il descendait en pente douce sur tout le quart de cercle, et l'angle
// rouge avait l'air d'une rampe au lieu d'un mur.) Peint en rouge, comme le sol et la bordure a ces endroits.
const ARCS = [];          // la geometrie de chaque arc, pour les obstacles (buildLevallois)
function arcAngle(scene, K, sz, hFond) {
  const { ENC } = K;
  const cx = ENC.XP - ARC_R, cz = sz * (ENC.Z - ARC_R);
  const N = 28, pos = [], uv = [];
  const pt = (t, r) => [cx + r * Math.cos(t), cz + sz * r * Math.sin(t)];
  // k = 0 contre le quai, 1 contre le fond : pleine hauteur de k = 0,26 a 1, raccord doux de 0,06 a 0,26
  const haut = (t) => {
    const k = Math.min(1, Math.max(0, (t / (Math.PI / 2) - 0.06) / 0.2)), s = k * k * (3 - 2 * k);
    return BORD_H + (hFond - BORD_H) * s;
  };
  const quad = (a, b, c, d, u0, u1) => {           // a b c d dans l'ordre, deux triangles
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    uv.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
  };
  const Ri = ARC_R, Re = ARC_R + ARC_EP;
  for (let i = 0; i < N; i++) {
    const t0 = (i / N) * Math.PI / 2, t1 = ((i + 1) / N) * Math.PI / 2;
    const [xi0, zi0] = pt(t0, Ri), [xi1, zi1] = pt(t1, Ri), [xe0, ze0] = pt(t0, Re), [xe1, ze1] = pt(t1, Re);
    const h0 = haut(t0), h1 = haut(t1), u0 = i / N, u1 = (i + 1) / N;
    // face interieure (vers le terrain), dessus, face exterieure — l'ordre des sommets depend du bout
    if (sz < 0) {
      quad([xi0, 0, zi0], [xi1, 0, zi1], [xi1, h1, zi1], [xi0, h0, zi0], u0, u1);
      quad([xi0, h0, zi0], [xi1, h1, zi1], [xe1, h1, ze1], [xe0, h0, ze0], u0, u1);
      quad([xe1, 0, ze1], [xe0, 0, ze0], [xe0, h0, ze0], [xe1, h1, ze1], u1, u0);
    } else {
      quad([xi1, 0, zi1], [xi0, 0, zi0], [xi0, h0, zi0], [xi1, h1, zi1], u1, u0);
      quad([xi1, h1, zi1], [xi0, h0, zi0], [xe0, h0, ze0], [xe1, h1, ze1], u1, u0);
      quad([xe0, 0, ze0], [xe1, 0, ze1], [xe1, h1, ze1], [xe0, h0, ze0], u0, u1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  // l'arc TOURNE : projection triplanaire, sinon la photo s'ecrasait le long de la courbe
  // Sa face interieure regarde le terrain, donc tourne le dos au soleil : sans la legere emission des murets
  // droits (voir poser), le rouge y tombait au bordeaux, tache sombre dans l'angle. Meme reglage que la rampe.
  const mat = mouille(marquerPhoto(new THREE.MeshStandardMaterial({ color: new THREE.Color(C.rouge), roughness: 0.74,
    emissive: new THREE.Color(C.rouge), emissiveIntensity: 0.12, side: THREE.DoubleSide }), 'betonPeint',
    { tri: true, relief: 0.45, grain: 0.35, pied: 0.25 }));
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true; scene.add(m);
  // Derriere l'arc, le coin de l'enceinte n'est pas peint : de la terre et quelques herbes hautes, comme
  // au pied du grillage de ce cote-la.
  const coin = new THREE.Shape();
  const n2 = 16;
  for (let i = 0; i <= n2; i++) {
    const [x, z] = pt((i / n2) * Math.PI / 2, Re);
    if (i === 0) coin.moveTo(x, -z); else coin.lineTo(x, -z);       // le plan XY sera couche : y -> -z
  }
  coin.lineTo(ENC.XP + 0.6, -sz * (ENC.Z + MUR.ep));
  coin.lineTo(ENC.XP + 0.6, -cz);
  const terre = new THREE.Mesh(new THREE.ShapeGeometry(coin),
    surfaceParc(new THREE.MeshStandardMaterial({ color: 0x4a3f33, roughness: 1 }), 'solForet'));
  terre.rotation.x = -Math.PI / 2; terre.position.y = 0.012; terre.receiveShadow = true; scene.add(terre);
  K.buildShrub(scene, ENC.XP - 0.15, sz * (ENC.Z - 0.1), 1.5, 0.55, 0.8);
  ARCS.push({ cx, cz, sz, r: ARC_R + ARC_EP / 2, haut });
}

// La peinture d'un mur : aplats coupes en oblique + losanges semes dessus.
function murTexture(canvasTex, longM, hautM, bandes) {
  const PX = 96;
  const w = Math.round(longM * PX), h = Math.round(hautM * PX);
  return canvasTex(w, h, (g) => {
    for (let i = 0; i < bandes.length; i++) {
      const b = bandes[i], n = bandes[i + 1];
      const hg = b.haut * PX, bg = b.bas * PX;
      const hd = n ? n.haut * PX : w, bd = n ? n.bas * PX : w;
      g.fillStyle = b.col; g.beginPath();
      g.moveTo(hg, 0); g.lineTo(hd, 0); g.lineTo(bd, h); g.lineTo(bg, h);
      g.closePath(); g.fill();
    }
    // PAS DE PLINTHE. Je croyais lire un soubassement clair de vingt centimetres au pied des murets ; ce
    // n'etait que le reflet du sol sur la peinture, sur des photos prises en contre-plongee. Les photos
    // rapprochees du coin sont nettes : l'aplat de couleur descend jusqu'au caoutchouc, sans rien entre.
    // Le bas du mur est sali par la terre et les gravillons du pied : sans ca le mur a l'air pose sur le sol,
    // pas plante dedans.
    const sale = g.createLinearGradient(0, h, 0, h - 0.22 * PX);
    sale.addColorStop(0, 'rgba(90,80,62,0.45)'); sale.addColorStop(1, 'rgba(90,80,62,0)');
    g.fillStyle = sale; g.fillRect(0, h - 0.22 * PX, w, 0.22 * PX);
    patine(g, w, h, PX, Math.round(longM * 1000 + hautM * 77 + bandes.length * 13));
    // losanges a quatre branches : la couleur est choisie pour trancher avec l'aplat qui est dessous
    const couleurDe = (xm) => {
      for (let i = bandes.length - 1; i >= 0; i--) if (xm >= (bandes[i].haut + bandes[i].bas) / 2) return bandes[i].col;
      return bandes[0].col;
    };
    // Sur les photos elles font une vingtaine de centimetres et il y en a une tous les trois ou quatre
    // metres : petites et rares. Les miennes en faisaient le double et couraient tous les 2,4 m, ce qui
    // transformait le mur en papier cadeau. Elles ne sont pas non plus toutes noires : j'ai releve du gris
    // ardoise, du jaune, du rouge et du bleu-gris, y compris sur le mur rouge.
    // Quatre couleurs, relevees une par une sur le panoramique : ardoise et jaune sur les pans rouges,
    // rouge et ardoise sur les pans blancs. Le bleu-gris pale que j'avais en cinquieme couleur rendait
    // CYAN a l'ecran — c'est l'etoile turquoise qu'on voyait dans l'angle, et elle n'existe pas.
    const PALETTE = ['#4d5561', '#f0c33c', '#d03a3a', '#efe8d8'];
    if (bandes.etoiles) {
      for (const e of bandes.etoiles) etoile(g, e.x * PX, e.y * hautM * PX, e.r * PX, e.col);
      return;
    }
    const n = Math.max(1, Math.round(longM / 3.6));
    for (let i = 0; i < n; i++) {
      const xm = longM * (i + 0.5) / n + rnd(-0.8, 0.8);
      const fond = couleurDe(xm);
      // on evite seulement la couleur qui disparaitrait sur son fond
      const cols = PALETTE.filter((c) => c !== fond);
      etoile(g, xm * PX, rnd(0.30, 0.66) * hautM * PX, rnd(0.085, 0.115) * PX, cols[(i * 3) % cols.length]);
    }
  }, null, false, 16);
}

// LA PATINE D'UN MUR PEINT DE PLAYGROUND. Les aplats restent ceux des photos ; par-dessus, ce que cinq ans de
// matchs, de pluie et de soleil y ont laisse, et qu'on voit des qu'on s'approche d'un vrai muret :
//  - le PIED eclabousse : la pluie fait rejaillir la terre du sol sur les vingt premiers centimetres, en
//    gouttes et en trainees, pas en degrade propre ;
//  - les COULURES sous le chant : l'eau qui ruisselle du dessus du mur laisse des traces verticales grises ;
//  - les EPAUFRURES : le beton peint s'ecaille sur l'arete du chant et au pied, ou les coups portent — de
//    petits eclats gris a bord irregulier, avec l'ombre de l'epaisseur de peinture ;
//  - les TRACES DE BALLON : des ronds de poussiere de 24 cm, pointilles comme le cuir picote d'un ballon ;
//  - les SEMELLES : des traits noirs de caoutchouc en bas, la ou l'on prend appui du pied.
// Le hasard est seme (`graine`) : un mur redessine l'est a l'identique.
function patine(g, w, h, PX, graine) {
  const r = hasard(graine);
  g.save();
  // 0. les REPRISES : un pan repeint au rouleau apres un tag ou un choc n'a jamais tout a fait la teinte du
  //    reste — un rectangle a peine plus vif, aux bords flous
  for (let i = 0; i < Math.max(1, Math.round(w / PX / 5)); i++) {
    const x = r(0, w), y = r(0.05, 0.5) * h, rw = r(0.5, 1.6) * PX, rh = r(0.3, 0.8) * h;
    g.filter = 'blur(3px)';
    g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${r(0.03, 0.06)})` : `rgba(0,0,0,${r(0.03, 0.06)})`;
    g.fillRect(x, y, rw, rh);
    g.filter = 'none';
  }
  // 1. le pied eclabousse
  for (let i = 0; i < w * 0.9; i++) {
    const x = r(0, w), y = h - Math.pow(r(), 2.2) * 0.26 * PX;
    g.fillStyle = `rgba(${Math.round(r(70, 100))},${Math.round(r(60, 84))},${Math.round(r(44, 62))},${r(0.08, 0.3)})`;
    g.fillRect(x, y, r(0.6, 2.2), r(0.6, 3));
  }
  // 2. les coulures sous le chant
  const nc = Math.round(w / PX * 2.2);
  for (let i = 0; i < nc; i++) {
    const x = r(0, w), L = r(0.08, 0.7) * PX, lw = r(0.6, 3.2);
    const gr = g.createLinearGradient(0, 0, 0, L);
    const a = r(0.05, 0.16);
    gr.addColorStop(0, `rgba(58,56,52,${a})`); gr.addColorStop(1, 'rgba(58,56,52,0)');
    g.fillStyle = gr; g.fillRect(x, 0, lw, L);
  }
  // 3. les epaufrures : sur l'arete du haut, au pied, et quelques coups au milieu
  const eclat = (cx, cy, rr) => {
    g.beginPath();
    const n = 7 + Math.floor(r(0, 6));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, d = rr * r(0.45, 1.15);
      const x = cx + Math.cos(a) * d * r(0.8, 1.6), y = cy + Math.sin(a) * d;
      if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fillStyle = 'rgba(40,36,32,0.35)'; g.fill();              // l'ombre du bord de la couche de peinture
    g.save(); g.translate(0.8, 0.8); g.fillStyle = `rgb(${Math.round(r(150, 176))},${Math.round(r(146, 170))},${Math.round(r(136, 158))})`; g.fill(); g.restore();
  };
  for (let x = r(0, 0.4) * PX; x < w; x += r(0.25, 1.4) * PX) eclat(x, r(0, 0.02) * PX, r(0.012, 0.035) * PX);
  for (let x = r(0, 0.6) * PX; x < w; x += r(0.5, 2.2) * PX) eclat(x, h - r(0.0, 0.05) * PX, r(0.01, 0.03) * PX);
  for (let i = 0; i < w / PX * 0.35; i++) eclat(r(0, w), r(0.15, 0.9) * h, r(0.006, 0.018) * PX);
  // 4. les traces de ballon
  for (let i = 0; i < w / PX * 0.45; i++) {
    const cx = r(0, w), cy = r(0.2, 0.85) * h, rr = 0.12 * PX * r(0.9, 1.05), a = r(0.05, 0.14);
    const clair = r() < 0.6;
    for (let k = 0; k < 90; k++) {                                 // le cuir picote : des points, pas un disque
      const t = r(0, Math.PI * 2), d = rr * Math.sqrt(r());
      g.fillStyle = clair ? `rgba(196,188,170,${a * 1.6})` : `rgba(40,34,30,${a * 1.4})`;
      g.fillRect(cx + Math.cos(t) * d, cy + Math.sin(t) * d * r(0.85, 1), 1.2, 1.2);
    }
  }
  // 5. les semelles
  g.lineCap = 'round';
  for (let i = 0; i < w / PX * 0.45; i++) {
    const x = r(0, w), y = h - r(0.03, 0.35) * PX, L = r(0.03, 0.1) * PX;
    g.strokeStyle = `rgba(22,20,20,${r(0.12, 0.36)})`; g.lineWidth = r(0.8, 1.8);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y + r(-2, 2)); g.stroke();
  }
  g.restore();
}

// Portillon vert a barreaux verticaux : c'est lui que j'avais pris pour une structure de panier sur une photo
// ou il se detachait juste derriere le panneau.
function portail(scene, K, x, z, rotY) {
  const { box } = K;
  const vert = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x17442e, roughness: 0.48, metalness: 0.5 }), 'metal',
    { tri: true, rouille: 0.3, relief: 0.4, pied: 0.3 });
  const tole = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x1d5238, roughness: 0.6, metalness: 0.35 }), 'metal',
    { tri: true, rouille: 0.35, relief: 0.6, pied: 0.3 });
  const g0 = new THREE.Group();
  const L = PORTAIL_L - 0.3, H = 2.55, BAS = 0.62;   // deux battants, tole pleine sur le bas ; 15 cm de jeu de chaque cote

  // montants d'encadrement, plus epais que les barreaux : ce sont eux qui donnent l'echelle du portail
  for (const sx of [-1, 1]) box(0.13, H + 0.25, 0.13, vert, sx * (L / 2 + 0.09), (H + 0.25) / 2, 0, g0);
  for (const sx of [-1, 1]) {
    const cx = sx * L / 4;
    // cadre du battant
    for (const dx of [-L / 4, L / 4]) box(0.075, H, 0.075, vert, cx + dx, H / 2, 0, g0, false);
    for (const y of [0.05, BAS, H - 0.04]) box(L / 2, 0.075, 0.075, vert, cx, y, 0, g0, false);
    // tole pleine en bas du battant
    box(L / 2 - 0.08, BAS - 0.1, 0.03, tole, cx, BAS / 2 + 0.02, 0, g0, false);
    // barreaux verticaux serres au-dessus
    for (let t = -L / 4 + 0.13; t < L / 4 - 0.05; t += 0.115) {
      box(0.032, H - BAS - 0.06, 0.032, vert, cx + t, (H + BAS) / 2 - 0.02, 0, g0, false);
    }
  }
  // le grand disque noir accroche sur le battant droit : c'est le detail qui fait reconnaitre ce portail-la
  const d = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24),
    new THREE.MeshStandardMaterial({ color: 0x131518, roughness: 0.62, side: THREE.DoubleSide }));
  d.position.set(L / 4 + 0.1, 1.62, 0.05); g0.add(d);
  g0.position.set(x, 0, z); g0.rotation.y = rotY; scene.add(g0);
  return g0;
}

let _etoileTex = null, _etoileMat = null;
function etoileMat(K, col) {
  if (!_etoileTex) { _etoileTex = {}; _etoileMat = {}; }
  if (!_etoileMat[col]) {
    _etoileTex[col] = K.canvasTex(64, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h); etoile(g, w / 2, h / 2, w / 2 - 2, col);
    }, null, true, 8);
    // Le materiau AUSSI est mis en cache : l'ancien code ne gardait que la texture et fabriquait un materiau
    // neuf a chaque motif, soit une compilation de nuancier par etoile.
    _etoileMat[col] = new THREE.MeshStandardMaterial({
      map: _etoileTex[col], transparent: true, alphaTest: 0.4, roughness: 0.7, side: THREE.DoubleSide,
    });
  }
  return _etoileMat[col];
}

// =====================================================================
//  LE GRADIN JAUNE — « WRITE YOUR OWN STORY »
// =====================================================================
// LA SECTION ROUGE DU GRADIN SUIT LE SOL, comme la bordure du quai. Sa place et sa teinte etaient ecrites
// a la main (centree sur z = -3,25, 3,63 m, un rouge a moi) ; le sol, lui, a son aplat rouge de z = -5,30 a
// -1,30 au pied du gradin, dans SON rouge. Une fois l'image du sol chargee, on lit la colonne qui longe la
// face avant, on y cherche l'aplat rouge, et on repeint la section a cet endroit et de cette couleur. Le
// blanc et le jaune ne bougent pas : seule la partie rouge est synchronisee.
const GRADIN_PEINT = { tex: null, clones: [], sections: null, long: 0, image: null };
// les demi-dimensions de l'enceinte, recopiees a la construction : l'image du sol arrive plus tard
const ENCEINTE_SOL = { X: 12.4, XP: 10, Z: 16 };
function calerRougeGradin(img) {
  GRADIN_PEINT.image = img;
  const G = GRADIN_PEINT;
  if (!G.tex || !img || !img.width) return;
  const E = ENCEINTE_SOL;
  // colonne a 20 cm devant la face avant du gradin
  const u = (GRADIN.x0 + 0.2 + E.X) / (E.X + E.XP);
  const N = 640, c = document.createElement('canvas'); c.width = 3; c.height = N;
  const g = c.getContext('2d');
  g.drawImage(img, Math.round(u * img.width) - 1, 0, 3, img.height, 0, 0, 3, N);
  const d = g.getImageData(0, 0, 3, N).data;
  const zDe = (y) => -E.Z + (y + 0.5) / N * 2 * E.Z;       // le haut de l'image est le bout -Z
  const rouge = (r, v, b) => r > 150 && v < 95 && b < 95;
  // la plus longue suite de rouge le long du gradin
  let best = null, cur = null;
  for (let y = 0; y < N; y++) {
    let r = 0, v = 0, b = 0;
    for (let x = 0; x < 3; x++) { const k = (y * 3 + x) * 4; r += d[k] / 3; v += d[k + 1] / 3; b += d[k + 2] / 3; }
    const z = zDe(y), dedans = Math.abs(z) < G.long / 2;
    if (dedans && rouge(r, v, b)) {
      if (!cur) cur = { y0: y, y1: y, n: 0, r: 0, v: 0, b: 0 };
      cur.y1 = y; cur.n++; cur.r += r; cur.v += v; cur.b += b;
      if (!best || cur.n > best.n) best = cur;
    } else cur = null;
  }
  if (!best || best.n < 8) return;
  const zA = zDe(best.y0) - 0.5 / N * 2 * E.Z, zB = zDe(best.y1) + 0.5 / N * 2 * E.Z;
  // index 0 de la texture au bout +Z du gradin, qui croit vers -Z
  const L = G.long, uB = (L / 2 - zB) / L, uA = (L / 2 - zA) / L;
  const hex = (v) => Math.round(v).toString(16).padStart(2, '0');
  const col = '#' + hex(best.r / best.n) + hex(best.v / best.n) + hex(best.b / best.n);
  const [blanc, , jaune] = G.sections;
  const sections = [
    { col: blanc.col, part: uB },
    { col, part: uA - uB },
    { col: jaune.col, part: 1 - uA },
  ];
  // on redessine a pleine taille puis on recopie dans l'image de la texture (reduite de moitie sur
  // telephone par canvasTex)
  const { w, h, txt } = G.tex.userData.pochoir;
  const plein = document.createElement('canvas'); plein.width = w; plein.height = h;
  dessinerPochoir(plein.getContext('2d'), w, h, txt, sections);
  const cible = G.tex.image;
  cible.getContext('2d').drawImage(plein, 0, 0, cible.width, cible.height);
  G.tex.needsUpdate = true;
  for (const t of G.clones) t.needsUpdate = true;
}

function buildGradin(scene, K) {
  const { ENC, box, canvasTex } = K;
  const g0 = new THREE.Group();
  // Le gradin ne court pas sur toute la longueur du terrain : il s'arrete avant les deux bouts, et c'est dans
  // le degagement du coin qu'on trouve le container maritime des photos.
  const LONG = GRADIN.long;   // raccourci aux deux bouts : le container d'un cote, le retour d'angle de l'autre
  // Chaque rang est plus court que celui d'en dessous : vu de cote, le gradin descend en marches jusqu'au sol
  // aux deux extremites. C'est ce qui manquait — le gradin se terminait par une joue verticale de 1,68 m, et
  // la section rouge du bout se lisait comme un bloc pose la par erreur.
  // LES RANGS SONT DE MEME LONGUEUR, et le gradin se termine par une JOUE VERTICALE. Je les raccourcissais
  // de 62 cm par rang, ce qui faisait descendre l'ouvrage en biais a ses deux bouts : vu du terrain, les
  // bancs partaient en diagonale. Les photos montrent l'inverse — quatre rangs parfaitement alignes, coupes
  // net. Ce n'est plus un retrait mais un leger fruit de 4 cm, juste ce qu'il faut pour que les chants ne
  // se confondent pas en un seul plan.
  const RETRAIT = 0.04;
  const { x0, rangs: N, h: hM, p: pM } = GRADIN;
  const FACE = N * hM;                                  // hauteur totale de la face avant : 1,68 m

  // Beton peint, comme les murets (painted_concrete_02) ; les assises, qu'on use du fond de culotte et des
  // semelles, gardent plus de grain et la salissure des creux.
  const jaune = mouille(marquerPhoto(new THREE.MeshStandardMaterial({ color: 0xefc020, roughness: 0.6 }), 'betonPeint',
    { relief: 0.45, grain: 0.35, pied: 0.2 }));
  const assise = mouille(marquerPhoto(new THREE.MeshStandardMaterial({ color: 0xdedbd0, roughness: 0.45 }), 'betonPeint',
    { relief: 0.5, grain: 0.9, cavite: 0.6 }));
  // Le gradin n'est pas jaune sur toute sa longueur : une grande section BLANCHE, puis le jaune, puis le
  // rouge au bout. Les sections sont peintes dans la texture de la face avant, comme les lettres — c'est la
  // meme couche de peinture dans la realite, autant la traiter pareil.
  //
  // LE ROUGE EST AU MILIEU, pas au bout. Je le mettais en derniere position, donc a l'extremite cote
  // container — Haythem, qui a le terrain sous les yeux, dit deux choses qui se recoupent : a cette
  // extremite-la les bancs sont JAUNES, et la section rouge se trouve plus loin le long du gradin. La
  // sequence, lue depuis le bout de la poubelle : un grand pan BLANC, la coupure ROUGE, puis tout le
  // JAUNE jusqu'au container.
  // Le texte, lui, ne bouge pas : il est dessine PAR-DESSUS les sections et etale sur toute la longueur,
  // donc il reste lisible dans le meme sens.
  // La coupure rouge est CALEE SUR LA FRESQUE : Haythem la veut en face de l'aplat rouge du sol, celui qui
  // touche le bloc bleu. Cet aplat-la, releve dans la texture sur la bande qui longe le gradin, va de
  // z = -5,06 a z = -1,44 — trois metres soixante, exactement la largeur de la section rouge. On centre
  // donc la section sur z = -3,25.
  // L'index 0 tombe au bout de la POUBELLE (z = +12,7) et croit vers le container ; la fraction cherchee
  // vaut donc (12,7 - z) / 25,4, soit 0,628 pour le centre, moins la demi-largeur.
  const SECTIONS = [
    { col: '#eeece2', part: 0.558 },
    { col: '#d42a24', part: 0.143 },
    { col: '#efc020', part: 0.299 },
  ];

  // UNE SEULE texture pour toute la face avant du gradin. Chaque contremarche n'en montre que sa tranche, ce
  // qui reproduit le detail signature des photos : les lettres sont TRANCHEES par les assises blanches, on les
  // lit en bandes. Poser le texte contremarche par contremarche donnerait des lettres entieres, et il faudrait
  // les rapetisser pour qu'elles tiennent dans 42 cm — alors que sur place elles font 70 cm.
  const texFace = pochoirTexte(canvasTex, 'WRITE YOUR OWN STORY', LONG, FACE, SECTIONS);
  GRADIN_PEINT.tex = texFace; GRADIN_PEINT.clones = []; GRADIN_PEINT.sections = SECTIONS; GRADIN_PEINT.long = LONG;
  // MOUILLE est vide au moment ou ce fichier se charge : buildGradin est appele PENDANT la construction,
  // donc la liste existe deja et le tableau est le meme objet que celui qu'on publiera a la fin.

  for (let i = 0; i < N; i++) {
    // rang i : le plus BAS est le plus proche du terrain. Le gradin monte donc en s'eloignant, comme un gradin.
    const yHaut = (i + 1) * hM;
    const xAvant = x0 - i * pM, xArriere = x0 - (i + 1) * pM;
    const L = LONG - 2 * i * RETRAIT;                    // le rang se raccourcit en montant

    // masse pleine sous le rang : une seule boite du SOL jusqu'au niveau de l'assise. L'ancienne version ne
    // faisait qu'une boite de la hauteur d'une marche, donc les rangs du haut flottaient au-dessus du vide.
    box(pM, yHaut, L, jaune, (xAvant + xArriere) / 2, yHaut / 2, 0, g0).receiveShadow = true;

    // Contremarche : elle regarde le TERRAIN (+X) et porte sa tranche de texte. Comme les rangs n'ont pas tous
    // la meme longueur, on decale AUSSI l'origine en u — sinon le texte serait etire differemment a chaque
    // rang et les lettres ne se raccorderaient plus d'une bande a l'autre.
    const tex = texFace.clone();
    tex.needsUpdate = true;
    GRADIN_PEINT.clones.push(tex);
    tex.repeat.set(L / LONG, 1 / N);
    tex.offset.set((1 - L / LONG) / 2, i / N);
    // Meme traitement que les murets : moins d'emission maintenant qu'il y a une lumiere de remplissage,
    // et le grain du beton peint. Les contremarches sont la surface qu'on a le plus souvent sous les yeux
    // en balade — un aplat parfaitement lisse s'y voit tout de suite.
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(L, hM),
      mouille(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72,
        emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.08 })));
    // le beton peint photographie, comme les murets : projete dans le monde, il ignore la repetition et le
    // decalage de la tranche de texte, et garde partout sa taille reelle
    marquerPhoto(cm.material, 'betonPeint', { relief: 0.45, grain: 0.35, rugo: 0.7 });
    cm.rotation.y = Math.PI / 2;                        // normale vers +X : face au terrain
    cm.position.set(xAvant + 0.006, i * hM + hM / 2, 0);
    cm.receiveShadow = true;                            // l'ombre des joueurs et des mats monte sur les marches
    g0.add(cm);

    // assise : une vraie planche claire sur presque toute la profondeur du giron, pas un liseré de 10 cm.
    // C'est elle qui tranche les lettres et qui donne la lecture « gradin » de loin.
    // SAUF LE DERNIER RANG : lui n'a pas de planche. C'est le couronnement adosse au grillage, peint
    // d'un seul tenant, et c'est ce qui fait qu'on compte trois liserés blancs pour quatre niveaux.
    if (i < N - 1) {
      box(pM - 0.07, 0.07, L, assise, (xAvant + xArriere) / 2 - 0.02, yHaut + 0.025, 0, g0, false);
      // nez d'about : la petite joue claire de chaque marche, visible en bout de gradin
      for (const s2 of [-1, 1]) box(pM - 0.07, hM, 0.06, assise, (xAvant + xArriere) / 2 - 0.02, yHaut - hM / 2, s2 * (L / 2 + 0.03), g0, false);
    }
  }

  if (GRADIN_PEINT.image) calerRougeGradin(GRADIN_PEINT.image);     // le sol est deja la

  // Garde-corps sur le flanc du gradin : deux lisses obliques qui suivent la pente des marches, plus les
  // montants. Je n'avais qu'une seule barre et des poteaux isoles, ce qui se lisait comme une rangee de pieux
  // plantes dans les marches.
  const rampe = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x2c3237, roughness: 0.45, metalness: 0.6 }), 'metal',
    { tri: true, rouille: 0.3, relief: 0.4 });
  for (const s2 of [-1, 1]) {
    const zc = s2 * (LONG / 2 - 0.35 - 2 * 0 * RETRAIT);
    for (let i = 0; i <= N; i++) {
      const zz = s2 * ((LONG - 2 * Math.min(i, N - 1) * RETRAIT) / 2 - 0.35);
      box(0.055, 0.98, 0.055, rampe, x0 - i * pM + 0.08, i * hM + 0.49, zz, g0, false);
    }
    for (const dy of [0.94, 0.56]) {
      const bar = box(Math.hypot(N * pM, N * hM) + 0.18, 0.045, 0.045, rampe,
        x0 - (N * pM) / 2 + 0.08, (N * hM) / 2 + dy, zc, g0, false);
      bar.rotation.z = -Math.atan2(N * hM, N * pM);
    }
  }

  // Plus de joue verticale aux extremites : le profil en escalier se termine tout seul, chaque rang montrant
  // son about. C'est ce qu'on voit sur la photo, ou le gradin redescend jusqu'au sol a ses deux bouts.
  // Bande de copeaux d'ecorce au pied du gradin : sur la photo elle fait bien une soixantaine de centimetres
  // et c'est elle qui separe le gradin du bitume peint. A 34 cm elle passait pour un simple joint.
  // PAS DE BANDE au pied du gradin. J'y avais mis des copeaux d'ecorce, puis du caoutchouc rouge apres
  // avoir relu les photos — mais la vue d'en haut tranche : sous les bancs il n'y a rien, le sol peint
  // vient buter directement contre la premiere marche.

  scene.add(g0);

  // bache noire tendue sur le grillage : elle COMMENCE au-dessus du gradin (1,68 m), elle ne le chevauche pas
  const LB2 = ENC.Z * 2 - 0.4;
  const bache = new THREE.Mesh(froisser(new THREE.PlaneGeometry(LB2, 1.4, Math.round(LB2 * (MOBILE_DECOR ? 2 : 4)), 8), 2.46, 0.045, 11),
    new THREE.MeshStandardMaterial({ map: bacheTexture(canvasTex, LB2, 1.4), roughness: 0.85, side: THREE.DoubleSide }));
  bache.rotation.y = Math.PI / 2; bache.position.set(-ENC.X - 0.52, FACE + 0.75, 0); scene.add(bache);
  // bache de la ville, au bout du gradin : blason + « Levallois » en blanc sur noir
  const ville = new THREE.Mesh(froisser(new THREE.PlaneGeometry(5.4, 2.4, MOBILE_DECOR ? 12 : 24, 10), 2.7, 0.03, 12),
    new THREE.MeshStandardMaterial({ map: bacheVille(canvasTex), roughness: 0.85, side: THREE.DoubleSide }));
  // Elle et la bache Nike sont attachees DERRIERE le grillage (la longue bache « Courtside », devant, les
  // recouvre en partie) : maintenant qu'elles gonflent, poses a un centimetre l'une de l'autre elles se
  // traversaient.
  ville.rotation.y = Math.PI / 2; ville.position.set(-ENC.X - 0.61, 1.6, -10.6); scene.add(ville);   // meme coin que le container

  // LA BACHE NOIRE N'EST PAS SUR LE FOND. Les deux photos de nuit prises face a ce mur montrent de la maille
  // nue jusqu'en haut : on voit les arbres, les immeubles et le ciel au travers. Elle est sur le cote du
  // GRADIN, avec l'autre bache — c'est la que toutes les photos de jour la montrent. Tendue a +Z elle
  // flottait au-dessus du mur, au milieu du champ de vision du joueur qui remonte le terrain.
  const nike = new THREE.Mesh(froisser(new THREE.PlaneGeometry(9.0, 2.2, MOBILE_DECOR ? 18 : 36, 10), 2.46, 0.03, 13),
    new THREE.MeshStandardMaterial({ map: bacheNike(canvasTex), roughness: 0.85, side: THREE.DoubleSide }));
  nike.rotation.y = Math.PI / 2; nike.position.set(-ENC.X - 0.61, MUR.h + 1.35, 4.2); scene.add(nike);
  return g0;
}

// UNE BACHE N'EST PAS UNE PLANCHE. Tendue sur le grillage par des colliers a chaque poteau (`pas` m), elle gonfle
// entre deux attaches et se plisse en diagonale vers elles. On deforme le plan dans son epaisseur : un ventre au
// milieu de chaque travee, des plis obliques qui s'y croisent, et les normales recalculees pour que la lumiere
// rasante les dessine.
function froisser(geo, pas, ampl, graine) {
  const p = geo.attributes.position, h = geo.parameters.height, r = hasard(graine);
  const ph = [r(0, 6.3), r(0, 6.3), r(0.8, 1.2)];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const u = (((x / pas) % 1) + 1) % 1, v = y / h + 0.5;
    const ventre = Math.sin(Math.PI * u) ** 2 * Math.sin(Math.PI * v);
    const plis = Math.sin(x * 6.1 * ph[2] + y * 4.3 + ph[0]) * Math.sin(x * 2.2 - y * 8.7 + ph[1]);
    p.setZ(i, ampl * ventre * (0.75 + 0.35 * plis));
  }
  geo.computeVertexNormals();
  return geo;
}

// Le pochoir de la face avant du gradin. `longM` x `hautM` = les metres reels de la face : la taille de police
// est calee dessus, donc les lettres font vraiment 70 cm quelle que soit la resolution du canvas. L'ancienne
// version raisonnait en pixels sur un canvas 4096 x 128 etire sur 30 m x 0,46 m, soit un rapport de 2,1 : les
// lettres sortaient ecrasees.
function pochoirTexte(canvasTex, txt, longM, hautM, sections) {
  const PX = 110;                                   // pixels par metre, isotrope
  const w = Math.round(longM * PX), h = Math.round(hautM * PX);
  const t = canvasTex(w, h, (g) => dessinerPochoir(g, w, h, txt, sections), null, false, 16);
  t.userData.pochoir = { w, h, txt };
  return t;
}
function dessinerPochoir(g, w, h, txt, sections) {
  const PX = 110;
  {
    let x0 = 0;
    for (const s of sections) { g.fillStyle = s.col; g.fillRect(x0, 0, Math.ceil(s.part * w) + 1, h); x0 += s.part * w; }
    // Vert tres fonce, presque noir : c'est la couleur qu'on lit sur la Street View, aussi bien sur le blanc
    // que sur le jaune. Un vrai noir serait trop dur, et le sarcelle clair que j'avais mis disparaissait
    // completement sur la section blanche.
    g.fillStyle = '#12352c';
    g.font = `bold ${Math.round(0.70 * PX)}px Impact, "Arial Black", sans-serif`;
    g.textBaseline = 'middle'; g.textAlign = 'left';
    // UNE seule occurrence, ETIREE sur presque toute la longueur du gradin : c'est ce qu'on voit sur la photo,
    // des lettres tres espacees qui courent d'un bout a l'autre. Repeter le texte laissait au contraire de
    // grands pans nus au milieu, la ou on passe justement le plus clair du temps.
    const lettres = txt.split('');
    const brut = lettres.reduce((a, c) => a + g.measureText(c).width, 0);
    const util = w * 0.90;
    const esp = Math.max(0.06 * PX, (util - brut) / Math.max(1, lettres.length - 1));
    let x = (w - (brut + esp * (lettres.length - 1))) / 2;
    for (const c of lettres) { g.fillText(c, x, h * 0.52); x += g.measureText(c).width + esp; }
  }
  patineGradin(g, w, h, PX);
}

// LA PATINE DES CONTREMARCHES. Un gradin de quartier, on s'y assoit, on y pose les pieds, on y remonte en
// courant : chaque contremarche porte en bas les coups de talon de ceux qui sont assis au rang du dessous
// (des traits noirs de semelle), un liseré de poussiere a la jonction de l'assise, et son nez est epaufre par
// les chocs. Le hasard est SEME : calerRougeGradin redessine ce canvas quand la fresque arrive, et la patine
// doit retomber exactement au meme endroit, sinon elle sauterait sous les yeux du joueur.
function patineGradin(g, w, h, PX) {
  const r = hasard(4242), N = GRADIN.rangs, hr = h / N;
  g.save();
  for (let i = 0; i < N; i++) {
    const bas = h - i * hr, haut = bas - hr;                      // le rang 0 est en bas du canvas
    // la poussiere au pied de la contremarche, contre l'assise du dessous
    const gr = g.createLinearGradient(0, bas, 0, bas - 0.12 * PX);
    gr.addColorStop(0, 'rgba(84,74,58,0.4)'); gr.addColorStop(1, 'rgba(84,74,58,0)');
    g.fillStyle = gr; g.fillRect(0, bas - 0.12 * PX, w, 0.12 * PX);
    // les coups de talon, GROUPES la ou l'on s'assoit (une place tous les 60 cm, occupee une fois sur deux) :
    // de courts traits presque horizontaux, jamais des arabesques
    g.lineCap = 'round';
    for (let x0 = r(0, 0.6) * PX; x0 < w; x0 += 0.6 * PX) {
      if (r() < 0.5) continue;
      const n = Math.floor(r(1, 5));
      for (let k = 0; k < n; k++) {
        const x = x0 + r(-0.15, 0.15) * PX, y = bas - r(0.04, 0.2) * PX, L = r(0.02, 0.08) * PX;
        g.strokeStyle = `rgba(24,22,22,${r(0.12, 0.38)})`; g.lineWidth = r(0.8, 1.8);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y + r(-1.5, 1.5)); g.stroke();
      }
    }
    // le nez epaufre : de petits eclats gris sur l'arete du haut
    for (let x = r(0, 0.5) * PX; x < w; x += r(0.2, 1.1) * PX) {
      const cx = x, cy = haut + r(0, 0.02) * PX, rr = r(0.01, 0.03) * PX;
      g.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2, d = rr * r(0.5, 1.2);
        const px = cx + Math.cos(a) * d * 1.5, py = cy + Math.sin(a) * d;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.fillStyle = 'rgba(40,36,32,0.3)'; g.fill();
      g.save(); g.translate(0.7, 0.7); g.fillStyle = `rgb(${Math.round(r(150, 172))},${Math.round(r(146, 166))},${Math.round(r(136, 154))})`; g.fill(); g.restore();
    }
    // les coulures sous le nez
    for (let k = 0; k < w / PX * 1.4; k++) {
      const x = r(0, w), L = r(0.04, 0.25) * PX, a = r(0.04, 0.12);
      const gc = g.createLinearGradient(0, haut, 0, haut + L);
      gc.addColorStop(0, `rgba(60,58,54,${a})`); gc.addColorStop(1, 'rgba(60,58,54,0)');
      g.fillStyle = gc; g.fillRect(x, haut, r(0.6, 2.5), L);
    }
  }
  g.restore();
}

// Bache publicitaire noire. Comme pour le pochoir, les tailles sont calees sur les METRES de la bache.
function bacheTexture(canvasTex, longM, hautM) {
  const PX = 150;
  const w = Math.round(longM * PX), h = Math.round(hautM * PX);
  return canvasTex(w, h, (g) => {
    g.fillStyle = '#131316'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 12000; i++) {               // tissage de la bache
      g.fillStyle = `rgba(255,255,255,${rnd(0.01, 0.05)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), 1);
    }
    g.fillStyle = '#f0efe9'; g.textBaseline = 'middle'; g.textAlign = 'left';
    const motif = (x0) => {
      g.font = `italic ${Math.round(0.30 * PX)}px Georgia, serif`;
      g.fillText('Courtside', x0, h * 0.5);
      const t = 0.26 * PX;
      g.beginPath(); g.moveTo(x0 + 1.55 * PX, h * 0.5 + t * 0.6); g.lineTo(x0 + 1.55 * PX + t, h * 0.5 - t * 0.7);
      g.lineTo(x0 + 1.55 * PX + 2 * t, h * 0.5 + t * 0.6); g.closePath(); g.fill();
      g.font = `bold ${Math.round(0.22 * PX)}px Impact, sans-serif`;
      g.fillText('RUBIS ÉTENDART', x0 + 2.35 * PX, h * 0.5 + 0.01 * PX);
      g.font = `italic ${Math.round(0.19 * PX)}px Georgia, serif`;
      g.fillText('write your own story', x0 + 4.6 * PX, h * 0.5);
    };
    const pas = 8.0 * PX;
    for (let x = 0.4 * PX; x < w - 6 * PX; x += pas) motif(x);
  }, null, false, 16);
}

// =====================================================================
//  GRILLAGE VERT
// =====================================================================
// Pas de panneau bas ni de filet de toit ici : sur les photos c'est une clôture rigide verte qui monte d'un
// seul tenant à 4 m, avec un brise-vue vert tendu en bas du côté de la Seine.
function grillage(scene, K) {
  const { ENC, netTexture, tiled, box } = K;
  const H = 4.2;
  // Panneau rigide vert, pas un filet souple : maille serrée et fil épais, sinon la clôture disparaît à trois
  // mètres et le terrain a l'air ouvert sur le vide.
  const maille = new THREE.MeshStandardMaterial({ map: netTexture('#1e4d2f', 5), transparent: true,
    alphaTest: 0.03, depthWrite: false, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.35 });
  const poteau = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x1d4a2b, roughness: 0.5, metalness: 0.45 }), 'metal',
    { tri: true, rouille: 0.25, relief: 0.4, grain: 0.4, pied: 0.35 });
  const brise = new THREE.MeshStandardMaterial({ color: 0x2e6b46, roughness: 0.92, side: THREE.DoubleSide });

  // PAS DE BRISE-VUE cote Seine ni au bout +Z : sur la photo de l'angle du quai la maille est nue du sol
  // au sommet, on voit les roseaux au travers et, par-dessus le pan rouge bas, le garde-corps du quai. Le
  // tissu vert que je tendais sur le premier metre faisait une bande sombre derriere la bordure et
  // au-dessus du mur bas.
  // Cote Seine, les deux angles sont ARRONDIS comme les murets (arcAngle) : le grillage tourne avec eux, sur
  // un quart de cercle concentrique a l'arc du mur (rayon ARC_R + 0,55, tangent aux deux cotes droits). Les
  // cotes droits s'arretent donc ARC_R avant l'angle.
  const XA = ENC.XP - ARC_R, X0 = ENC.CX - (ENC.W + 1.1) / 2, LZA = ENC.Z - ARC_R;
  const cotes = [
    { w: ENC.Z * 2, x: -ENC.X - 0.55, z: 0, rot: Math.PI / 2, tv: false },
    { w: LZA * 2, x: ENC.XP + 0.55, z: 0, rot: Math.PI / 2, tv: true },
    { w: XA - X0, x: (X0 + XA) / 2, z: -ENC.Z - 0.55, rot: 0, tv: false },
    { w: XA - X0, x: (X0 + XA) / 2, z: ENC.Z + 0.55, rot: 0, tv: false },
  ];
  for (const c of cotes) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(c.w, H), maille.clone());
    m.material.map = tiled(maille.map, c.w, H, 0.85);
    m.position.set(c.x, H / 2, c.z); m.rotation.y = c.rot; scene.add(m);
    if (c.tv) scene.userData.sideNetTV = m;         // masqué quand la caméra TV passe derrière
    if (c.brise) {                                  // brise-vue vert tendu sur le premier mètre
      const b = new THREE.Mesh(new THREE.PlaneGeometry(c.w, 1.25), brise);
      b.position.set(c.x + (c.rot ? 0.02 * Math.sign(c.x) : 0), 0.66, c.z + (c.rot ? 0 : 0.02 * Math.sign(c.z)));
      b.rotation.y = c.rot; scene.add(b);
    }
    const n = Math.round(c.w / 2.5);
    for (let i = 0; i <= n; i++) {
      const t = -c.w / 2 + (c.w / n) * i;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, H + 0.18, 10), poteau);
      p.position.set(c.rot ? c.x : c.x + t, (H + 0.18) / 2, c.rot ? c.z + t : c.z);
      p.castShadow = true; scene.add(p);
    }
    for (const y of [H, H * 0.55]) {                // lisses horizontales
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, c.w, 6), poteau);
      r.rotation.z = Math.PI / 2; r.rotation.y = c.rot; r.position.set(c.x, y, c.z); scene.add(r);
    }
  }
  // LES DEUX ANGLES ARRONDIS : la maille en quart de cylindre, un poteau au milieu de l'arc, les deux lisses
  // cintrees. (CylinderGeometry : x = r sin(theta), z = r cos(theta) ; TorusGeometry couche : l'arc part de +x.)
  const RF = ARC_R + 0.55, LA = RF * Math.PI / 2;
  for (const sz of [-1, 1]) {
    const cz = sz * LZA;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(RF, RF, H, 20, 1, true, sz > 0 ? 0 : Math.PI / 2, Math.PI / 2), maille.clone());
    m.material.map = tiled(maille.map, LA, H, 0.85);
    m.position.set(XA, H / 2, cz); scene.add(m);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, H + 0.18, 10), poteau);
    p.position.set(XA + RF * Math.cos(Math.PI / 4), (H + 0.18) / 2, cz + sz * RF * Math.sin(Math.PI / 4));
    p.castShadow = true; scene.add(p);
    for (const y of [H, H * 0.55]) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(RF, 0.025, 6, 20, Math.PI / 2), poteau);
      r.rotation.x = sz > 0 ? Math.PI / 2 : -Math.PI / 2; r.position.set(XA, y, cz); scene.add(r);
    }
  }
  // portillon vert au milieu du côté rivière
  for (const dz of [-0.6, 0.6]) {
    for (const ddz of [-0.55, 0.55]) box(0.06, 2.1, 0.06, poteau, ENC.XP + 0.58, 1.05, dz + ddz, scene, false);
    for (const y of [0.08, 2.08]) box(0.06, 0.06, 1.16, poteau, ENC.XP + 0.58, y, dz, scene, false);
  }
}

// =====================================================================
//  MÂTS D'ÉCLAIRAGE COURBES
// =====================================================================
// Les mâts blancs en demi-lune de la photo : un fût droit, un grand arc qui se referme vers le terrain, et la
// rampe de projecteurs suspendue au bout. C'est la silhouette la plus reconnaissable du lieu après la fresque.
function matCourbe(scene, K, m) {
  const { x, z, y = 0, rot, plaque = true } = m;
  const { box } = K;
  const g0 = new THREE.Group();
  // LE MAT EST DE L'ACIER PEINT, laque blanche : un vernis qui brille (couche de vernis, clearcoat) sur une
  // peinture qui, elle, ne l'est pas — et non un metal blanc a 45 % de metallicite, qui renvoyait le ciel
  // en gris et rendait le fut sale de loin. La photo (tole peinte) lui donne ses micro-bosses et, au pied,
  // la salissure grise que laissent la pluie et les chiens sur tous les mats de ville.
  // Vu d'en dessous, contre le ciel, un blanc de peinture ne recoit que le rebond du sol : dans le jeu il virait au
  // noir, alors que sur toutes les photos la lame reste blanche — le sol clair du quai et l'air diffus l'eclairent.
  // Une legere emission de sa propre couleur tient lieu de ce rebond, comme pour la face peinte des murets.
  const blanc = marquerPhoto(new THREE.MeshPhysicalMaterial({ color: 0xeceeee, roughness: 0.34, metalness: 0.0,
    clearcoat: 0.7, clearcoatRoughness: 0.16, emissive: 0xe6e6e2, emissiveIntensity: 0.16 }), 'metal',
    { tri: true, rouille: 0.06, relief: 0.22, grain: 0.14, pied: 1.1 });
  const gris = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x9fa4a8, roughness: 0.35, metalness: 0.7 }), 'metal',
    { tri: true, relief: 0.3, grain: 0.3 });
  const HFUT = 8.1;

  // Le mat de Levallois n'est pas un lampadaire a crosse. C'est un FUT BLANC DROIT, coiffe d'une petite BOULE,
  // d'ou partent des HAUBANS qui tiennent une LAME COURBE en porte-a-faux au-dessus du terrain — une sorte de
  // faucille suspendue. Les projecteurs sont repartis LE LONG de la lame, pas plantes au bout. C'est la
  // silhouette qu'on reconnait a des centaines de metres sur toutes les photos du quai.
  const fut = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.13, HFUT, 16), blanc);
  fut.position.y = HFUT / 2; fut.castShadow = true; g0.add(fut);
  // La semelle carree n'existe que pour les mats poses sur une dalle. Celui qui traverse le gradin n'en a
  // pas : elle se serait plantee en plein milieu d'une assise.
  if (plaque) box(0.5, 0.14, 0.5, blanc, 0, 0.07, 0, g0);
  const boule = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), blanc);
  boule.position.y = HFUT + 0.1; boule.castShadow = true; g0.add(boule);

  // LA LAME EST UN CROISSANT, et le fut la traverse au quart. La photo prise au pied du mat le montre
  // sans ambiguite : l'arc DEBORDE en arriere du poteau d'un bon metre et demi avant de plonger, puis il
  // repart en montant loin au-dessus du terrain. Je n'en dessinais que la moitie — la lame partait du fut
  // comme un bras de lampadaire, et toute la silhouette de faucille se perdait.
  // Elle est APLATIE en X (scale 2,4) pour se lire comme une lame et non comme un tuyau.
  const lame = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, HFUT - 2.65, 2.25),     // le bout arriere, bas, derriere le poteau
    new THREE.Vector3(0, HFUT - 1.30, 0.75),     // le sommet du croissant, juste avant le fut
    new THREE.Vector3(0, HFUT - 1.95, -1.30),    // le creux, au-dessus de la ligne de touche
    new THREE.Vector3(0, HFUT - 0.70, -3.70),    // le bout avant, haut, au-dessus du terrain
  ], false, 'catmullrom', 0.5);
  const arc = new THREE.Mesh(new THREE.TubeGeometry(lame, 40, 0.072, 8, false), blanc);
  arc.scale.x = 2.4; arc.castShadow = true; g0.add(arc);
  // les deux bouts de la lame sont fermes (un tube ouvert laissait voir le vide par en dessous)
  for (const t of [0, 1]) {
    const bout = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), blanc);
    bout.position.copy(lame.getPoint(t)); bout.scale.x = 2.4; g0.add(bout);
  }
  // la trappe de visite du fut, a hauteur de main, et les boulons de la platine : ce qui dit « mat d'eclairage »
  box(0.1, 0.34, 0.03, blanc, 0, plaque ? 0.75 : 1.95, 0.105, g0, false);
  if (plaque) for (const [bx, bz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 6), gris);
    b.position.set(bx, 0.16, bz); g0.add(b);
  }

  // haubans : de la boule vers deux points de la lame. Ce sont eux qui expliquent qu'elle tienne en l'air.
  for (const t of [0.52, 0.99]) {
    const a = new THREE.Vector3(0, HFUT + 0.05, 0), b = lame.getPoint(t);
    const d = new THREE.Vector3().subVectors(b, a);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, d.length(), 6), gris);
    cab.position.copy(a).addScaledVector(d, 0.5);
    cab.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    g0.add(cab);
  }

  // Projecteurs SUSPENDUS sous la lame et non poses dessus : sur la photo on voit quatre boitiers pendre
  // sous le croissant, tous du cote du terrain. Aucun sur le tiers arriere, qui ne sert qu'a l'equilibre.
  for (const t of [0.42, 0.58, 0.74, 0.90]) {
    const pt = lame.getPoint(t), tg = lame.getTangent(t).normalize();
    const b = new THREE.Group();
    b.position.copy(pt);
    b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), tg);
    box(0.62, 0.1, 0.26, blanc, 0, -0.12, 0, b);
    box(0.5, 0.15, 0.22, marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x33373c, roughness: 0.45, metalness: 0.5 }), 'metal',
      { tri: true, relief: 0.3, grain: 0.25 }), 0, -0.24, 0, b);
    box(0.42, 0.02, 0.17, new THREE.MeshStandardMaterial({
      color: 0xfff6dd, emissive: 0xfff0cc, emissiveIntensity: 0.32, roughness: 0.3,
    }), 0, -0.32, 0, b, false);
    g0.add(b);
  }

  // Le mat regarde le centre du terrain : son -Z local doit pointer vers l'origine.
  // `y` : la hauteur du PIED. `rot` : le cap, fixe, perpendiculaire au grand cote (voir MATS).
  g0.position.set(x, y, z);
  g0.rotation.y = rot === undefined ? Math.atan2(x, z) : rot;
  scene.add(g0);
}

// =====================================================================
//  LA SEINE
// =====================================================================
const EAU_Y = -0.85;                   // le niveau du fleuve : 85 cm sous le quai
function laSeine(scene, K) {
  const { ENC, box, building, windowsTexture, M } = K;
  const BORD = ENC.XP + 7.5;            // bord du quai
  const LARGE = 120;                   // largeur du fleuve
  const PEN = { x: BORD + 9, z: 6 };   // la peniche, a sa place validee
  const Z_PASS = PEN.z + 9.5;          // la passerelle qui y mene, a hauteur de la timonerie

  // quai en béton + garde-corps
  // La dalle commence APRES le grillage (ENC.X + 0,55). Posee a y = 0,02 et large de 9 m centree sur
  // BORD - 4,5, elle recouvrait 1,5 m de fresque peinte sur toute la longueur de la ligne de touche.
  const xQuai = ENC.XP + 0.75, LQ = BORD - xQuai;
  // Meme travers qu'ailleurs : une tuile de beton etiree sur 140 m de quai. On la repete tous les 4 m.
  const matQuai = mouille(new THREE.MeshStandardMaterial({ map: K.dalleTexture(1), roughness: 0.95 }));
  // Tuile de 4 m exactement (dalles carrees de 50 cm), joints en relief et beton photo, comme les trottoirs
  // de Becon — et il se mouille sous l'averse comme le reste du quai.
  matQuai.map.repeat.set(LQ / 4, 35);
  if (K.avecRelief) K.avecRelief(matQuai, K.normalesDalles());
  matQuai.userData.detailPhoto = { cle: 'beton', w: LQ, h: 140, normal: false };
  const quai = new THREE.Mesh(new THREE.PlaneGeometry(LQ, 140), matQuai);
  quai.rotation.x = -Math.PI / 2; quai.position.set(xQuai + LQ / 2, 0.02, 0); quai.receiveShadow = true; scene.add(quai);
  // La margelle : de la pierre de taille grise, epaufree, tachee par les amarres et la pluie.
  const margelle = box(0.5, 0.55, 140, mouille(marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x9a978c, roughness: 0.9 }),
    'betonPeint', { relief: 0.9, grain: 1.0, cavite: 0.6 })), BORD, 0.27, 0, scene);
  margelle.receiveShadow = true;
  // LE GARDE-CORPS S'OUVRE sur la passerelle de la peniche : deux troncons, et deux poteaux plus forts de part
  // et d'autre de l'ouverture.
  for (let z = -68; z <= 68; z += 2.4) {
    if (Math.abs(z - Z_PASS) < 0.7) continue;
    box(0.07, 1.05, 0.07, M.railing, BORD - 0.1, 1.05, z, scene, false);
  }
  for (const s of [-1, 1]) box(0.1, 1.1, 0.1, M.railing, BORD - 0.1, 1.1, Z_PASS + s * 0.72, scene, false);
  for (const [z0, z1] of [[-70, Z_PASS - 0.72], [Z_PASS + 0.72, 70]]) {
    for (const y of [1.0, 0.6]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, z1 - z0, 6), M.railing);
      r.rotation.x = Math.PI / 2; r.position.set(BORD - 0.1, y + 0.55, (z0 + z1) / 2); scene.add(r);
    }
  }
  // les bittes d'amarrage, en fonte, sur la margelle : ou la peniche est tenue
  const fonte = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.55, metalness: 0.5 }), 'metal',
    { tri: true, rouille: 0.6, teinteRouille: 0x5c3420 });
  for (const z of [PEN.z - 17, PEN.z + 17]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.42, 14), fonte);
    b.position.set(BORD + 0.1, 0.55 + 0.21, z); b.castShadow = true; scene.add(b);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.07, 14), fonte);
    t.position.set(BORD + 0.1, 0.55 + 0.45, z); scene.add(t);
  }

  // mur de quai sous la margelle : du beton, noirci par l'eau
  box(0.6, 1.6, 140, marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x6f6c63, roughness: 0.95 }), 'betonPeint',
    { relief: 0.9, grain: 1.0, cavite: 0.6 }), BORD + 0.35, -0.8, 0, scene);
  // Palplanches de la berge, comme sur la photo : une tole ondulee verticale au ras de l'eau. Le relief est celui
  // de la tole du container, agrandi a l'onde d'une palplanche (60 cm).
  const palpl = new THREE.Mesh(new THREE.PlaneGeometry(140, 1.6),
    marquerPhoto(new THREE.MeshStandardMaterial({ map: palplancheTexture(K.canvasTex), roughness: 0.8, metalness: 0.4, side: THREE.DoubleSide }),
      'container', { tuile: 4.2, relief: 1.2, grain: 0.6 }));
  palpl.rotation.y = -Math.PI / 2; palpl.position.set(BORD + 0.67, -0.55, 0); scene.add(palpl);

  const boites = peniche(scene, K, PEN.x, PEN.z, BORD, Z_PASS);

  // BERGE D'EN FACE : un FRONT BATI, bas et irregulier. Les immeubles etaient poses de profil (leur longueur
  // courait vers le fleuve et leur petite face regardait l'eau) : on voyait une rangee de cubes separes par
  // de grands vides, posee sur une prairie. Tournes d'un quart, ils font enfin une rive de ville continue.
  // Leur silhouette est notee au passage : l'eau s'en sert pour refleter la berge (voir eauSeine).
  const opp = BORD + LARGE;
  box(3, 2.2, 240, marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x8a8779, roughness: 0.95 }), 'betonPeint',
    { relief: 0.9, grain: 1.0 }), opp, -0.2, 0, scene);
  const facades = [
    windowsTexture(9, 6, '#d9d5c8', '#39485a', true),
    windowsTexture(7, 5, '#c9c2b2', '#2f3d4c', false),
    windowsTexture(11, 7, '#e2dcc9', '#44536a', true),
  ];
  const SIL = 256, silhouette = new Uint8Array(SIL * 4);    // 1 texel par metre, de z = -128 a 128
  const XF = opp + 10;                                       // l'alignement des facades
  let zz = -120;
  while (zz < 120) {
    const larg = rnd(14, 30), haut = rnd(11, 22), prof = rnd(10, 16), ton = rnd(0.8, 1.05);
    // les toits ont leur acrotere et leurs edicules, la facade sur le fleuve sa porte et ses descentes d'eau
    building(scene, XF + prof / 2 + rnd(-1.0, 1.0), zz + larg / 2, prof, haut, larg, facades[Math.floor(Math.random() * 3)],
      { roof: true, front: 'x-' });
    for (let k = Math.max(0, Math.floor(zz + 128)); k < Math.min(SIL, Math.ceil(zz + larg + 128)); k++) {
      silhouette[k * 4] = Math.min(255, Math.round(haut / 40 * 255));
      silhouette[k * 4 + 1] = Math.round(ton * 200);
      silhouette[k * 4 + 2] = 255;
      silhouette[k * 4 + 3] = 255;
    }
    zz += larg + rnd(1.5, 7);
  }
  // le pont metallique qu'on voit en enfilade sur la photo
  pontSeine(scene, K, BORD + LARGE * 0.5, -96);

  const eau = eauSeine(scene, BORD, LARGE, { silhouette, XF, mur: opp - 1.5, murHaut: 0.9, boites });
  scene.userData.eauLevallois = eau;

  // Roseaux hauts entre le grillage et l'eau : c'est eux qu'on a au premier plan quand on regarde la Seine.
  roseaux(scene, K, BORD - 2.6);
  // La Défense sur l'horizon : quelques volumes bleutés, noyés dans la brume
  const lointain = new THREE.MeshStandardMaterial({ color: 0x8fa2b4, roughness: 0.9 });
  for (const [dx, dz, w, hh, d] of [[0, -150, 26, 62, 26], [34, -176, 22, 48, 22], [-30, -190, 30, 74, 26],
                                    [62, -160, 20, 40, 20], [14, -210, 24, 90, 24]]) {
    box(w, hh, d, lointain, opp + 150 + dx, hh / 2, dz, scene, false);
  }
}

// =====================================================================
//  L'EAU DE LA SEINE
// =====================================================================
// L'eau etait un plan presque noir : un materiau standard ne peut refleter que la carte d'environnement, et
// celle du jeu est un simple degrade (js/fx.js) — vue de biais, la Seine renvoyait un gris sans rien dedans.
// C'est pourtant ce qu'on regarde par-dessus le grillage, et une eau se reconnait a trois choses : elle
// REFLETE ce qui est au-dessus d'elle, ce reflet est BRISE par les rides qui bougent, et il est d'autant plus
// fort qu'on la regarde de biais (Fresnel : un fleuve vu du pont est sombre, vu de loin c'est un miroir).
//
// D'ou un shader a elle, sans aucun rendu de plus :
//  - LE CIEL REFLETE EST LE VRAI CIEL : on lit les deux photographies du dome (grand soleil et couvert, js/court.js
//    buildSky) dans la direction du rayon reflechi, avec leur rotation et leur fondu meteo. Les nuages qu'on voit
//    en l'air sont ceux qu'on voit dans l'eau. Un niveau de mipmap plus flou selon l'agitation ;
//  - LES RIDES : trois lectures d'une carte de normales tuilable (tools/textures_levallois.py), a trois
//    echelles, qui derivent avec le courant vers l'aval. Des bandes plus CALMES, allongees dans le sens du
//    courant, renvoient un ciel plus net : ce sont les veines lisses qu'on voit toujours sur un fleuve ;
//  - LA BERGE D'EN FACE ET LA PENICHE se refletent aussi, calculees et non rendues : la silhouette des
//    immeubles est notee dans une texture d'un pixel de haut (hauteur, teinte), la peniche est decrite par trois
//    boites. Le rayon reflechi est intersecte avec eux ; les facades ont leurs rangees de fenetres ;
//  - le corps de l'eau : un vert-brun de fleuve charge, eclaire comme le reste du decor, assombri au pied du mur
//    de quai ; les eclats du soleil sur les rides tournees vers lui ; sous la pluie, des ronds qui s'ouvrent ;
//  - le brouillard du decor, comme tout le reste.
// Cout : cinq lectures de texture et quelques intersections par pixel d'eau, un seul appel de dessin.
const EAU_VS = `
varying vec3 vW;
#include <common>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vW = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <logdepthbuf_vertex>
  #include <fog_vertex>
}`;
const EAU_FS = `
uniform sampler2D tNormale;
uniform sampler2D tCiel;
uniform sampler2D tCouvert;
uniform sampler2D tSilhouette;
uniform float uTemps, uCouvert, uRotCiel, uRotCouv, uPluie, uLum, uLumFac, uSoleilVu, uQuai;
uniform vec3 uSoleilDir, uSoleilCol, uCouvertCol, uFond;
uniform vec4 uBerge;            // x des facades, x du mur de berge, haut du mur, hauteur maximale codee
uniform vec3 uBoiteMin[ 3 ];
uniform vec3 uBoiteMax[ 3 ];
uniform vec3 uBoiteCol[ 3 ];
varying vec3 vW;
#include <common>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
// (sans brouillard lineaire — la passe d'ombrage cuit, un autre terrain — des valeurs de repli)
#if !defined( USE_FOG )
  const vec3 fogColor = vec3( 0.8, 0.85, 0.9 );
#endif
#if !defined( USE_FOG ) || defined( FOG_EXP2 )
  const float fogNear = 130.0;
  const float fogFar = 460.0;
#endif

// meme projection que le dome (SphereGeometry coupee a 55 %, tournee de rot autour de y)
vec2 uvCiel( vec3 d, float rot ) {
  float c = cos( rot ), s = sin( rot );
  vec3 l = vec3( d.x * c - d.z * s, d.y, d.x * s + d.z * c );
  float phi = atan( l.z, - l.x );
  float th = acos( clamp( l.y, - 1.0, 1.0 ) );
  return vec2( fract( phi / 6.2831853 ), clamp( 1.0 - th / ( 0.55 * 3.1415927 ), 0.004, 0.996 ) );
}
vec3 ciel( vec3 d, float flou ) {
  vec3 a = textureLod( tCiel, uvCiel( d, uRotCiel ), flou ).rgb;
  vec3 b = textureLod( tCouvert, uvCiel( d, uRotCouv ), flou ).rgb * uCouvertCol;
  return mix( a, b, uCouvert );
}
float boite( vec3 o, vec3 d, vec3 bmin, vec3 bmax ) {
  vec3 inv = 1.0 / d;
  vec3 t0 = ( bmin - o ) * inv, t1 = ( bmax - o ) * inv;
  vec3 tn3 = min( t0, t1 ), tf3 = max( t0, t1 );
  float tn = max( max( tn3.x, tn3.y ), tn3.z ), tf = min( min( tf3.x, tf3.y ), tf3.z );
  return ( tf > max( tn, 0.0 ) ) ? max( tn, 0.0 ) : 1e9;
}
float hachage( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }

void main() {
  #include <logdepthbuf_fragment>
  vec3 V = cameraPosition - vW;
  float dist = length( V ); V /= dist;
  vec2 p = vW.xz;
  // LES RIDES : trois echelles qui derivent vers l'aval, et des veines calmes dans le sens du courant
  vec3 n1 = texture2D( tNormale, p / 6.5 + vec2( 0.011, - 0.042 ) * uTemps ).xyz * 2.0 - 1.0;
  vec3 n2 = texture2D( tNormale, mat2( 0.8, - 0.6, 0.6, 0.8 ) * p / 2.3 + vec2( - 0.028, - 0.021 ) * uTemps ).xyz * 2.0 - 1.0;
  vec3 n3 = texture2D( tNormale, p / 17.0 + vec2( 0.0, - 0.013 ) * uTemps ).xyz * 2.0 - 1.0;
  float calme = smoothstep( 0.46, 0.6, texture2D( tNormale, p * vec2( 0.011, 0.0032 ) + vec2( 0.0, - 0.0011 ) * uTemps ).x );
  float force = mix( 1.0, 0.3, calme ) / ( 1.0 + dist * 0.011 ) * ( 1.0 + uPluie * 0.5 );
  // des pentes de riviere, pas de mer : au-dela de 0,2 le reflet se hache en paillettes a deux pas du quai
  vec2 pente = ( n1.xy * 0.17 + n2.xy * 0.1 + n3.xy * 0.14 ) * force;
  // la pluie : sur chaque cellule, un rond qui s'ouvre et s'efface
  if ( uPluie > 0.01 ) {
    for ( int k = 0; k < 2; k ++ ) {
      vec2 q = p * ( 2.2 + float( k ) * 1.4 ) + float( k ) * 7.13;
      vec2 cel = floor( q ), f = fract( q ) - 0.5;
      float h = hachage( cel );
      vec2 ctr = vec2( fract( h * 13.7 ), fract( h * 71.3 ) ) - 0.5;
      float age = fract( uTemps * 0.9 + h );
      vec2 dv = f - ctr * 0.6;
      float d = length( dv ), r = age * 0.45;
      float onde = sin( ( d - r ) * 55.0 ) * smoothstep( 0.07, 0.0, abs( d - r ) ) * ( 1.0 - age );
      pente += dv / max( d, 1e-3 ) * onde * 0.35 * uPluie;
    }
  }
  vec3 N = normalize( vec3( pente.x, 1.0, pente.y ) );
  vec3 R = reflect( - V, N );
  R.y = max( R.y, 0.015 );
  R = normalize( R );
  float cosT = max( dot( N, V ), 0.0 );
  float F = 0.02 + 0.98 * pow( 1.0 - cosT, 5.0 );

  // CE QUE L'EAU REFLETE : le ciel (un peu flou), voile de brume au ras de l'horizon...
  float flou = 1.6 + uPluie * 1.8 - calme * 0.9;
  vec3 refl = ciel( R, flou );
  refl = mix( refl, fogColor, exp( - R.y * 9.0 ) * 0.5 );
  float vu = 1.0;                                          // le soleil n'est visible que dans le ciel reflete
  vec3 o = vW;
  vec3 Rd = vec3( abs( R.x ) < 1e-4 ? 1e-4 : R.x, R.y, abs( R.z ) < 1e-4 ? 1e-4 : R.z );
  // ... les facades d'en face, avec leurs rangees de fenetres ...
  if ( R.x > 0.004 ) {
    float t = ( uBerge.x - o.x ) / R.x;
    vec3 H = o + R * t;
    vec4 sil = texture2D( tSilhouette, vec2( ( H.z + 128.0 ) / 256.0, 0.5 ) );
    if ( sil.b > 0.5 && H.y < sil.r * uBerge.w ) {
      float etage = fract( H.y / 3.0 ), trav = fract( H.z / 2.6 );
      float fen = step( 0.32, etage ) * step( etage, 0.76 ) * step( 0.22, trav ) * step( trav, 0.78 );
      // les facades regardent le fleuve, donc l'ouest : a contre-soleil, eclairees par le ciel seul (uLumFac)
      vec3 fac = mix( vec3( 0.56, 0.53, 0.47 ) * sil.g, vec3( 0.05, 0.065, 0.08 ), fen * 0.85 ) * uLumFac;
      refl = mix( fac, fogColor, smoothstep( fogNear, fogFar, t + dist ) );
      vu = 0.0;
    }
    // ... le mur de la berge ...
    float t2 = ( uBerge.y - o.x ) / R.x;
    if ( o.y + R.y * t2 < uBerge.z ) {
      refl = mix( vec3( 0.3, 0.29, 0.26 ) * uLumFac, fogColor, smoothstep( fogNear, fogFar, t2 + dist ) );
      vu = 0.0;
    }
  }
  // ... et la peniche, trois boites (coque, bache, timonerie)
  float tb = 1e9; vec3 cb = vec3( 0.0 );
  for ( int i = 0; i < 3; i ++ ) {
    float ti = boite( o, Rd, uBoiteMin[ i ], uBoiteMax[ i ] );
    if ( ti < tb ) { tb = ti; cb = uBoiteCol[ i ]; }
  }
  if ( tb < 1e8 ) { refl = cb * uLum; vu = 0.0; }

  // LE CORPS DE L'EAU : un vert-brun de fleuve charge ; un peu plus clair sur les rides qui regardent le soleil ;
  // assombri au pied du mur de quai, dont l'eau recoit l'ombre et moins de ciel
  float crete = max( dot( N, uSoleilDir ), 0.0 );
  vec3 corps = uFond * uLum * ( 0.8 + 0.4 * crete );
  float bordQ = 1.0 - smoothstep( 0.0, 1.4, vW.x - uQuai );
  corps *= 1.0 - bordQ * 0.4;
  vec3 col = mix( corps, refl, F );
  // l'ecume grise des remous, en liseré contre le mur
  float ecume = smoothstep( 0.55, 0.85, n2.x * 0.5 + 0.5 ) * ( 1.0 - smoothstep( 0.0, 0.3, vW.x - uQuai ) );
  col += vec3( 0.16, 0.16, 0.15 ) * uLum * ecume;
  // LES ECLATS DU SOLEIL : un point brulant sur chaque ride bien orientee, et une nappe plus large
  float sd = max( dot( R, uSoleilDir ), 0.0 );
  col += uSoleilCol * ( pow( sd, 900.0 ) * 24.0 + pow( sd, 60.0 ) * 0.3 ) * uSoleilVu * vu;
  gl_FragColor = vec4( col, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
function eauSeine(scene, BORD, LARGE, o) {
  const sil = new THREE.DataTexture(o.silhouette, o.silhouette.length / 4, 1, THREE.RGBAFormat);
  sil.magFilter = THREE.LinearFilter; sil.minFilter = THREE.LinearFilter; sil.needsUpdate = true;
  const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    tNormale: { value: null }, tCiel: { value: null }, tCouvert: { value: null }, tSilhouette: { value: null },
    uTemps: { value: 0 }, uCouvert: { value: 0 }, uRotCiel: { value: 0 }, uRotCouv: { value: 0 }, uPluie: { value: 0 },
    uLum: { value: 1 }, uLumFac: { value: 0.3 }, uSoleilVu: { value: 1 }, uQuai: { value: BORD + 0.66 },
    uSoleilDir: { value: new THREE.Vector3(0, 1, 0) }, uSoleilCol: { value: new THREE.Color(1, 1, 1) },
    uCouvertCol: { value: new THREE.Color(1, 1, 1) },
    // le vert-brun d'un fleuve charge (lineaire) : c'est lui qu'on voit en regardant l'eau de haut
    uFond: { value: new THREE.Color().setRGB(0.034, 0.05, 0.042) },
    uBerge: { value: new THREE.Vector4(o.XF, o.mur, o.murHaut, 40) },
    uBoiteMin: { value: o.boites.map((b) => b.min) }, uBoiteMax: { value: o.boites.map((b) => b.max) },
    uBoiteCol: { value: o.boites.map((b) => b.col) },
  }]);
  // (merge clone les valeurs : les textures se posent apres)
  u.tSilhouette.value = sil;
  brancherPhoto('eau_normale', u.tNormale, 'value');
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: EAU_VS, fragmentShader: EAU_FS, fog: true });
  // l'optimiseur fond les materiaux de meme signature sans regarder les uniformes : on le rend unique
  mat.envMapIntensity = 0.997;
  const eau = new THREE.Mesh(new THREE.PlaneGeometry(LARGE, 240), mat);
  eau.rotation.x = -Math.PI / 2; eau.position.set(BORD + LARGE / 2, EAU_Y, 0);
  eau.userData.nofuse = true;
  // Chaque image : le temps, la meteo (couverture, pluie, soleil), les deux photos du ciel et leur rotation.
  const tmp = new THREE.Color();
  eau.onBeforeRender = () => {
    const d = scene.userData, ciel = d.ciel, env = d.env;
    u.uTemps.value = performance.now() / 1000;
    if (ciel) {
      u.tCiel.value = ciel.soleil.material.map; u.uRotCiel.value = ciel.soleil.rotation.y;
      u.tCouvert.value = ciel.couvert.material.map; u.uRotCouv.value = ciel.couvert.rotation.y;
      u.uCouvert.value = ciel.couvert.material.opacity; u.uCouvertCol.value.copy(ciel.couvert.material.color);
      u.uSoleilVu.value = 1 - ciel.couvert.material.opacity;
    }
    if (d.sunDir) u.uSoleilDir.value.copy(d.sunDir);
    if (env && env.sun) {
      const sy = Math.max(0, u.uSoleilDir.value.y);
      const ciel = (env.hemi ? env.hemi.intensity : 0.5) * 1.3;
      u.uLum.value = (env.sun.intensity * sy + ciel) / Math.PI + 0.12;
      // une facade tournee vers -x ne recoit le soleil que s'il vient de l'ouest
      u.uLumFac.value = (env.sun.intensity * Math.max(0, -u.uSoleilDir.value.x) + ciel * 0.8) / Math.PI + 0.05;
      u.uSoleilCol.value.copy(tmp.copy(env.sun.color).multiplyScalar(env.sun.intensity * 0.35));
    }
    u.uPluie.value = Math.max(0, ((d.wet || 0) - 0.3) / 0.7);
  };
  scene.add(eau);
  return eau;
}

function palplancheTexture(canvasTex) {
  return canvasTex(256, 64, (g, w, h) => {
    for (let x = 0; x < w; x += 16) {
      const grd = g.createLinearGradient(x, 0, x + 16, 0);
      grd.addColorStop(0, '#4a5148'); grd.addColorStop(0.5, '#707567'); grd.addColorStop(1, '#3c4239');
      g.fillStyle = grd; g.fillRect(x, 0, 16, h);
    }
    for (let i = 0; i < 2000; i++) {                       // rouille et algues
      g.fillStyle = Math.random() < 0.5 ? `rgba(120,74,40,${rnd(0.05, 0.3)})` : `rgba(60,88,52,${rnd(0.05, 0.25)})`;
      g.fillRect(Math.random() * w, rnd(h * 0.4, h), rnd(2, 8), rnd(2, 10));
    }
  }, [40, 1], false, 8);
}

// =====================================================================
//  LA PENICHE
// =====================================================================
// Une FREYCINET, le gabarit des canaux francais : 38,50 m sur 5,05 m, la silhouette de presque toutes les
// peniches de Paris. Elle remplace une boite noire coiffee d'un cylindre, qui ne se lisait comme un bateau
// que parce qu'elle etait sur l'eau. Ce qui fait une peniche, et qu'on reconnait de loin :
//  - la COQUE : des flancs droits, une etrave ARRONDIE a l'avant, un cul plus carre a l'arriere ; peinte en
//    noir, raclee par les ecluses (des griffures claires a l'horizontale), coulures de rouille sous le
//    plat-bord, un liseré clair le long du bord, les algues a la flottaison, le nom et l'echelle de tirant
//    d'eau ;
//  - le PLAT-BORD ou l'on marche, les deux LISTONS qui encaissent les chocs, les bittes d'amarrage ;
//  - la BACHE sur arceaux au-dessus de la cale : une toile qui retombe entre chaque arceau, tenue par des
//    sangles ;
//  - la TIMONERIE a l'arriere, vitree, son toit, sa cheminee, sa bouee, et le pavillon ;
//  - et ce qui la relie au quai : les pneus en defenses, les amarres, la passerelle.
// Tout est construit dans le repere du bateau (y = 0 a la flottaison), avec quelques materiaux seulement :
// l'optimiseur du decor coud ensuite les pieces qui les partagent. Rend les trois boites que l'eau reflete.
function peniche(scene, K, x, z, BORD, zPasserelle) {
  const L = 38.5, B = 5.05, FR = 0.85, TI = 1.3, H = FR + TI;       // longueur, largeur, franc-bord, tirant d'eau
  const g0 = new THREE.Group();
  const mesh = (geo, mat, px = 0, py = 0, pz = 0, ombre = false) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = ombre; m.receiveShadow = true; g0.add(m); return m;
  };
  const boite = (w, h, d, mat, px, py, pz, ombre = false) => mesh(new THREE.BoxGeometry(w, h, d), mat, px, py, pz, ombre);
  const tube = (a, b, r, mat, seg = 8) => {              // un cylindre de a a b
    const d = new THREE.Vector3().subVectors(b, a);
    const m = mesh(new THREE.CylinderGeometry(r, r, d.length(), seg), mat);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  };
  // --- les materiaux ---
  const coque = marquerPhoto(new THREE.MeshStandardMaterial({ map: coqueTexture(K.canvasTex, L, H, TI), roughness: 0.55, metalness: 0.25 }),
    'metal', { tri: true, rouille: 0.35, relief: 0.7, grain: 0.45 });
  coque.map.repeat.set(1 / L, -1 / H); coque.map.offset.set(0.5, 1 / H);
  const pont = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x4f2a24, roughness: 0.72, metalness: 0.2 }), 'metal', { rouille: 0.4, relief: 0.6 });
  const noir = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.5, metalness: 0.4 }), 'metal', { tri: true, rouille: 0.5 });
  const toile = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0xdad8cf, roughness: 0.9 }), 'betonPeint', { tri: true, relief: 0.35, grain: 0.45 });
  const sangle = new THREE.MeshStandardMaterial({ color: 0x2c3a4c, roughness: 0.85 });
  const blanc = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0xe4e1d8, roughness: 0.45, metalness: 0.1 }), 'metal', { tri: true, rouille: 0.12, relief: 0.35, grain: 0.35 });
  const toit = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x6a2620, roughness: 0.6, metalness: 0.2 }), 'metal', { rouille: 0.25 });
  const vitre = new THREE.MeshStandardMaterial({ color: 0x0c1319, roughness: 0.05, metalness: 0.75 });
  const corde = new THREE.MeshStandardMaterial({ color: 0x9a8864, roughness: 0.95 });
  const pneu = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });
  const alu = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0xa4a9ac, roughness: 0.35, metalness: 0.85 }), 'metal', { tri: true, relief: 0.3, grain: 0.3 });
  const rougeB = new THREE.MeshStandardMaterial({ color: 0xc8352a, roughness: 0.6 });
  const blancB = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.6 });

  // --- la coque : le plan du pont, extrude vers le haut. L'etrave (arrondie) est vers -z, le cul vers +z.
  // Dans le plan de la forme, y court le long du bateau ; apres rotation, y devient -z : l'etrave est donc a +y.
  const hb = B / 2, Rn = 2.3, Ra = 0.9;
  const forme = new THREE.Shape();
  forme.moveTo(-hb, -L / 2 + Ra);
  forme.quadraticCurveTo(-hb, -L / 2, -hb + Ra, -L / 2);
  forme.lineTo(hb - Ra, -L / 2);
  forme.quadraticCurveTo(hb, -L / 2, hb, -L / 2 + Ra);
  forme.lineTo(hb, L / 2 - Rn);
  forme.bezierCurveTo(hb, L / 2 - Rn * 0.35, hb * 0.55, L / 2, 0, L / 2);
  forme.bezierCurveTo(-hb * 0.55, L / 2, -hb, L / 2 - Rn * 0.35, -hb, L / 2 - Rn);
  forme.lineTo(-hb, -L / 2 + Ra);
  const gCoque = new THREE.ExtrudeGeometry(forme, { depth: H, bevelEnabled: false, curveSegments: 10 });
  gCoque.rotateX(-Math.PI / 2); gCoque.translate(0, -TI, 0);
  // groupes de l'extrusion : 0 = les deux faces planes (le pont, le fond), 1 = les flancs
  mesh(gCoque, [pont, coque], 0, 0, 0, true);
  // le plat-bord : une lisse basse tout autour du pont (on la fait sur les deux flancs droits et l'arriere)
  for (const s of [-1, 1]) boite(0.1, 0.16, L - Rn - Ra, noir, s * (hb - 0.05), FR + 0.08, (Ra - Rn) / 2 * -1);
  boite(B - 2 * Ra, 0.16, 0.1, noir, 0, FR + 0.08, L / 2 - 0.05);
  // les deux listons, qui encaissent les chocs contre les quais et les portes d'ecluse
  for (const s of [-1, 1]) for (const y of [FR - 0.22, 0.18]) boite(0.08, 0.1, L - Rn - Ra - 0.6, noir, s * (hb + 0.03), y, (Rn - Ra) / 2);
  // --- la cale : son hiloire, et la BACHE sur arceaux ---
  const LC = 25.5, zC = -1.6, WC = B - 1.1, HC = 0.38;             // longueur, centre, largeur, hauteur de l'hiloire
  boite(WC, HC, LC, pont, 0, FR + HC / 2, zC, true);
  const bache = tunnelBache(WC / 2 + 0.03, 1.32, LC, 1.25, 0.05);
  mesh(bache, toile, 0, FR + HC, zC, true);
  // les sangles : une tous les 2,5 m, un anneau un peu plus large que la toile
  const sangles = [];
  for (let zs = -LC / 2 + 1.2; zs < LC / 2 - 0.5; zs += 2.5) sangles.push(tunnelBache(WC / 2 + 0.05, 1.35, 0.06, 10, 0, zs));
  mesh(mergeGeometries(sangles), sangle, 0, FR + HC, zC);
  // --- la timonerie, a l'arriere ---
  const TL = 4.4, TW = 3.3, TH = 2.05, zT = L / 2 - 3.2 - TL / 2;     // 3,2 m de plage arriere derriere elle
  boite(TW, TH, TL, blanc, 0, FR + TH / 2, zT, true);
  boite(TW + 0.35, 0.12, TL + 0.5, toit, 0, FR + TH + 0.06, zT + 0.1, true);
  // les vitres : un bandeau sur les deux flancs et la face avant, dans des cadres noirs
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const zz = zT - TL / 2 + 0.75 + k * 1.35;
    boite(0.06, 0.72, 0.95, noir, s * (TW / 2 + 0.01), FR + 1.45, zz);
    boite(0.05, 0.62, 0.85, vitre, s * (TW / 2 + 0.03), FR + 1.45, zz);
  }
  for (const s of [-1, 1]) { boite(1.25, 0.72, 0.06, noir, s * 0.72, FR + 1.45, zT - TL / 2 - 0.01); boite(1.15, 0.62, 0.05, vitre, s * 0.72, FR + 1.45, zT - TL / 2 - 0.03); }
  boite(0.06, 1.8, 0.8, noir, -(TW / 2 + 0.01), FR + 0.9, zT + TL / 2 - 0.55);                 // la porte, cote quai
  // la bouee couronne, rouge et blanche, accrochee au flanc cote quai
  for (let k = 0; k < 4; k++) {
    const q = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.065, 8, 12, Math.PI / 2), k % 2 ? blancB : rougeB);
    q.rotation.set(0, Math.PI / 2, k * Math.PI / 2); q.position.set(-(TW / 2 + 0.09), FR + 1.1, zT - 0.2); g0.add(q);
  }
  // la cheminee, et le mat du pavillon a la poupe
  mesh(new THREE.CylinderGeometry(0.11, 0.12, 1.0, 12), noir, 0.9, FR + TH + 0.6, zT + 1.2);
  mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 12), noir, 0.9, FR + TH + 1.12, zT + 1.2);
  tube(new THREE.Vector3(0, FR, L / 2 - 0.4), new THREE.Vector3(0, FR + 3.6, L / 2 - 0.4), 0.035, alu);
  const drap = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({
    map: pavillonTexture(K.canvasTex), roughness: 0.8, side: THREE.DoubleSide }));
  drap.rotation.y = Math.PI / 2; drap.position.set(0, FR + 3.25, L / 2 - 0.4 + 0.47); g0.add(drap);
  // le garde-corps de la plage arriere
  const pa = [];
  for (let zz = zT + TL / 2 + 0.3; zz < L / 2 - 0.2; zz += 0.9) for (const s of [-1, 1]) pa.push([s * (hb - 0.15), zz]);
  for (const [px, pz] of pa) tube(new THREE.Vector3(px, FR, pz), new THREE.Vector3(px, FR + 0.9, pz), 0.02, alu, 6);
  for (const s of [-1, 1]) tube(new THREE.Vector3(s * (hb - 0.15), FR + 0.9, zT + TL / 2 + 0.3), new THREE.Vector3(s * (hb - 0.15), FR + 0.9, L / 2 - 0.3), 0.025, alu, 6);
  // quelques pots de fleurs sur la plage arriere : on y vit
  for (const [px, pz] of [[1.5, L / 2 - 1.0], [1.5, L / 2 - 1.8], [-1.6, L / 2 - 1.3]]) {
    mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 10), new THREE.MeshStandardMaterial({ color: 0xa65a38, roughness: 0.9 }), px, FR + 0.16, pz);
    const f = mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: 0x3e6a2f, roughness: 0.95 }), px, FR + 0.48, pz);
    f.scale.y = 0.75;
  }
  // --- les bittes, le guindeau d'avant, le feu de mat ---
  const bittes = [];
  for (const zb of [-L / 2 + 3.0, L / 2 - 1.0]) for (const s of [-1, 1]) {
    bittes.push(new THREE.Vector3(s * (hb - 0.35), FR + 0.35, zb));
    for (const dz of [-0.14, 0.14]) mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.35, 10), noir, s * (hb - 0.35), FR + 0.17, zb + dz);
  }
  const guind = mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.0, 12), noir, 0, FR + 0.3, -L / 2 + 1.9);
  guind.rotation.z = Math.PI / 2;
  tube(new THREE.Vector3(0, FR, -L / 2 + 1.1), new THREE.Vector3(0, FR + 1.6, -L / 2 + 1.1), 0.03, alu, 6);
  mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0xfff2d8, emissive: 0xffe8c0, emissiveIntensity: 0.4 }), 0, FR + 1.65, -L / 2 + 1.1);
  // --- les defenses : des pneus pendus cote quai ---
  for (const zp of [-12, -4, 4, 12]) {
    const t = mesh(new THREE.TorusGeometry(0.3, 0.11, 8, 14), pneu, -(hb + 0.13), 0.25, zp);
    t.rotation.y = Math.PI / 2;
    tube(new THREE.Vector3(-(hb + 0.13), 0.55, zp), new THREE.Vector3(-(hb - 0.1), FR + 0.12, zp), 0.012, corde, 4);
  }
  g0.position.set(x, EAU_Y, z); scene.add(g0);
  g0.updateMatrixWorld(true);

  // --- ce qui la relie au quai : les amarres et la passerelle (dans le repere du monde) ---
  const monde = (v) => v.clone().applyMatrix4(g0.matrixWorld);
  const quaiBittes = [new THREE.Vector3(BORD + 0.1, 0.55 + 0.42, z - 17), new THREE.Vector3(BORD + 0.1, 0.55 + 0.42, z + 17)];
  const amarres = [];
  for (const [ib, iq] of [[0, 0], [2, 1]]) {                // bitte cote quai de l'avant et de l'arriere
    const a = monde(bittes[ib]), b = quaiBittes[iq];
    // une amarre n'est pas une barre : elle pend un peu entre ses deux points
    const mil = a.clone().lerp(b, 0.5); mil.y -= 0.35;
    amarres.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mil, b), 16, 0.022, 5, false));
  }
  const mA = new THREE.Mesh(mergeGeometries(amarres), corde); scene.add(mA);
  // la passerelle : un tablier d'aluminium strie, deux mains courantes, du quai au plat-bord
  const p0 = new THREE.Vector3(BORD + 0.2, 0.56, zPasserelle), p1 = new THREE.Vector3(x - hb + 0.25, EAU_Y + FR + 0.02, zPasserelle);
  const dir = new THREE.Vector3().subVectors(p1, p0), long = dir.length();
  const pas = new THREE.Group();
  const tablier = new THREE.Mesh(new THREE.BoxGeometry(long, 0.05, 0.8), alu); pas.add(tablier);
  for (const s of [-1, 1]) {
    const mc = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, long, 6), alu);
    mc.rotation.z = Math.PI / 2; mc.position.set(0, 0.95, s * 0.38); pas.add(mc);
    for (let k = 0; k <= 4; k++) {
      const pt = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.95, 6), alu);
      pt.position.set(-long / 2 + k * long / 4, 0.475, s * 0.38); pas.add(pt);
    }
  }
  pas.position.copy(p0).addScaledVector(dir, 0.5);
  pas.rotation.z = Math.atan2(dir.y, dir.x);
  scene.add(pas);

  // Les trois boites que l'eau reflete (repere du monde), avec leur teinte moyenne eclairee
  const bw = (x0, y0, z0, x1, y1, z1, col) => ({ min: new THREE.Vector3(x0, y0, z0), max: new THREE.Vector3(x1, y1, z1), col: new THREE.Color().setRGB(...col) });
  return [
    bw(x - hb, EAU_Y - 0.3, z - L / 2, x + hb, EAU_Y + FR, z + L / 2, [0.018, 0.02, 0.024]),
    bw(x - WC / 2, EAU_Y + FR, z + zC - LC / 2, x + WC / 2, EAU_Y + FR + HC + 1.2, z + zC + LC / 2, [0.42, 0.41, 0.38]),
    bw(x - TW / 2, EAU_Y + FR, z + zT - TL / 2, x + TW / 2, EAU_Y + FR + TH, z + zT + TL / 2, [0.46, 0.45, 0.42]),
  ];
}

// La bache de cale : une demi-ellipse extrudee le long du bateau, qui RETOMBE entre les arceaux (tous les
// `pasArceau` m). `z0` decale le troncon (les sangles sont des troncons tres courts de la meme forme).
function tunnelBache(demiLarg, haut, long, pasArceau, affaisse, z0 = 0) {
  const nz = Math.max(2, Math.round(long / 0.25)), na = 18;
  const pos = [], idx = [];
  for (let i = 0; i <= nz; i++) {
    const z = z0 - long / 2 + (i / nz) * long;
    const s = affaisse > 0 ? (1 - Math.cos(2 * Math.PI * (z + long / 2) / pasArceau)) / 2 : 0;
    const k = 1 - affaisse * s;
    for (let j = 0; j <= na; j++) {
      const a = (j / na) * Math.PI;
      pos.push(Math.cos(a) * demiLarg * (1 - 0.3 * affaisse * s), Math.sin(a) * haut * k, z);
    }
  }
  for (let i = 0; i < nz; i++) for (let j = 0; j < na; j++) {
    const a = i * (na + 1) + j, b = a + na + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  // les deux bouts, fermes par un demi-disque
  for (const i of [0, nz]) {
    const c = pos.length / 3;
    pos.push(0, 0, z0 - long / 2 + (i / nz) * long);
    for (let j = 0; j < na; j++) {
      const a = i * (na + 1) + j;
      if (i === 0) idx.push(c, a + 1, a); else idx.push(c, a, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Le flanc de la peniche, deplie : `L` m de long sur `H` m de haut, la flottaison a `TI` m du bas. Le cote quai
// est vu de -x, ou l'axe du bateau se lit de droite a gauche : le nom y est donc peint en miroir.
function coqueTexture(canvasTex, L, H, TI) {
  // 64 px/m : a 40 le nom, haut de 34 cm, tenait en quatorze pixels et crenelait des qu'on longeait le quai
  const PX = 64, w = Math.round(L * PX), h = Math.round(H * PX);
  return canvasTex(w, h, (g) => {
    const r = hasard(1905);
    const Y = (m) => h - m * PX;                                // hauteur depuis le bas de la coque
    g.fillStyle = '#1a1e24'; g.fillRect(0, 0, w, h);
    // les oeuvres vives, sous l'eau : l'antifouling brun-rouge, et la bande d'algues a la flottaison
    g.fillStyle = '#3b2621'; g.fillRect(0, Y(TI - 0.02), w, TI * PX);
    const alg = g.createLinearGradient(0, Y(TI + 0.16), 0, Y(TI - 0.08));
    alg.addColorStop(0, 'rgba(58,70,40,0)'); alg.addColorStop(0.5, 'rgba(58,70,40,0.75)'); alg.addColorStop(1, 'rgba(40,46,30,0.9)');
    g.fillStyle = alg; g.fillRect(0, Y(TI + 0.16), w, 0.24 * PX);
    // les griffures des ecluses : des traits clairs horizontaux, par paquets
    for (let i = 0; i < L * 9; i++) {
      const x = r(0, w), y = Y(r(TI + 0.05, H - 0.2)), l = r(0.2, 2.5) * PX;
      g.strokeStyle = `rgba(${Math.round(r(110, 150))},${Math.round(r(105, 140))},${Math.round(r(100, 130))},${r(0.05, 0.22)})`;
      g.lineWidth = r(0.5, 1.6);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + r(-2, 2)); g.stroke();
    }
    // les coulures de rouille sous le plat-bord, et sous chaque dalot
    for (let i = 0; i < L * 1.6; i++) {
      const x = r(0, w), l = r(0.1, 0.6) * PX;
      const gr = g.createLinearGradient(0, Y(H), 0, Y(H) + l);
      gr.addColorStop(0, `rgba(122,62,30,${r(0.25, 0.6)})`); gr.addColorStop(1, 'rgba(122,62,30,0)');
      g.fillStyle = gr; g.fillRect(x, Y(H), r(1, 4), l);
    }
    // le liseré clair qui souligne le bord
    g.fillStyle = '#b9b3a3'; g.fillRect(0, Y(H - 0.08), w, 0.045 * PX);
    // l'echelle de tirant d'eau, a l'avant et a l'arriere : des traits blancs tous les 10 cm
    for (const xm of [2.2, L - 1.8]) {
      g.fillStyle = 'rgba(230,228,220,0.85)';
      for (let k = 0; k < 7; k++) g.fillRect(xm * PX, Y(TI + 0.1 * k) - 1, (k % 5 === 0 ? 0.14 : 0.08) * PX, 2);
    }
    // le nom, en miroir (voir plus haut), vers l'etrave (qui est au bout +y de la forme, donc a droite ici)
    g.save(); g.translate(w - 4.5 * PX, Y(H - 0.42)); g.scale(-1, 1);
    g.fillStyle = '#e8e4d8'; g.font = `bold ${Math.round(0.34 * PX)}px Georgia, serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ALCYON', 0, 0);
    g.font = `${Math.round(0.14 * PX)}px Arial, sans-serif`; g.fillText('PARIS', 0, 0.3 * PX);
    g.restore();
  }, null, false, 8);
}

function pavillonTexture(canvasTex) {
  return canvasTex(96, 64, (g, w, h) => {
    g.fillStyle = '#23408e'; g.fillRect(0, 0, w / 3, h);
    g.fillStyle = '#f2f2ee'; g.fillRect(w / 3, 0, w / 3, h);
    g.fillStyle = '#d4202b'; g.fillRect(2 * w / 3, 0, w / 3, h);
  }, null, false, 4);
}

// =====================================================================
//  SAULE PLEUREUR
// =====================================================================
// Le modèle d'arbre du jeu est un platane : ses feuillages montent. Pour le saule de la photo il fallait des
// rideaux qui TOMBENT — on ajoute donc des voiles de feuilles suspendus, séparés du modèle.
function saulePleureur(scene, K, x, z, h) {
  const { leafMat, leafDepth } = K;
  if (!leafMat) return;
  const geos = [], quad = new THREE.PlaneGeometry(1, 1);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2, r = rnd(1.6, 5.4);
    const haut = h * rnd(0.55, 0.85);
    const bas = haut - rnd(2.5, 6.0);                       // longueur du rideau
    for (let y = bas; y < haut; y += rnd(0.5, 0.8)) {
      const t = (y - bas) / Math.max(0.1, haut - bas);
      const size = rnd(0.5, 0.95) * (0.55 + 0.45 * t);
      e.set(rnd(-0.25, 0.25), rnd(0, 6.28), rnd(-0.2, 0.2)); q.setFromEuler(e); sc.set(size, size * 1.6, size);
      mtx.compose(new THREE.Vector3(x + Math.cos(a) * r * (0.6 + 0.4 * t), y, z + Math.sin(a) * r * (0.6 + 0.4 * t)), q, sc);
      geos.push(quad.clone().applyMatrix4(mtx));
    }
  }
  // (Material.clone ne recopie ni onBeforeCompile ni la clé de programme : le saule restait figé pendant que son
  // ombre, elle, ondulait. On lui remet le vent.)
  const mat = leafMat.clone(); if (K.windify) K.windify(mat, K.transmissionSoleil ? (sh) => K.transmissionSoleil(sh, 0.4) : null);
  const m = new THREE.Mesh(mergeGeometries(geos), mat);
  m.material.color.setHex(0xc9c765);                         // feuillage doré : la photo est prise en automne
  m.castShadow = true; if (leafDepth) m.customDepthMaterial = leafDepth;
  scene.add(m);
}

// =====================================================================
//  CHEMIN DE HALAGE ET MOBILIER
// =====================================================================
function cheminDeHalage(scene, K) {
  const { ENC, box, M, canvasTex } = K;
  // la piste rouge des coureurs, le long du terrain côté ville
  // une piste de course est un revetement en caoutchouc coule : le meme granulat photo que le terrain
  const piste = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 150),
    mouille(marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x9c4a3c, roughness: 0.95 }), 'caoutchouc', { grain: 1.0, rugo: 1.0 })));
  piste.rotation.x = -Math.PI / 2; piste.position.set(-ENC.X - 4.4, 0.01, 0); piste.receiveShadow = true; scene.add(piste);
  // bordure en pierre entre la piste et la pelouse
  box(0.25, 0.14, 150, marquerPhoto(new THREE.MeshStandardMaterial({ color: 0xb0aca0, roughness: 0.95 }), 'betonPeint',
    { relief: 0.9, grain: 1.0, cavite: 0.6 }), -ENC.X - 6.1, 0.07, 0, scene, false);
  // pelouse au-delà
  const herbe = new THREE.Mesh(new THREE.PlaneGeometry(26, 150),
    surfaceParc(new THREE.MeshStandardMaterial({ color: 0x53703f, roughness: 1 }), 'herbe'));
  herbe.rotation.x = -Math.PI / 2; herbe.position.set(-ENC.X - 19.2, 0.005, 0); herbe.receiveShadow = true; scene.add(herbe);

  // bancs et corbeilles le long de la piste
  for (const z of [-14, 2, 17]) {
    const b = new THREE.Group();
    for (const dz of [-0.7, 0.7]) box(0.42, 0.42, 0.08, M.pole, 0, 0.21, dz, b);
    box(0.5, 0.07, 1.7, M.benchWood, 0, 0.45, 0, b);
    b.position.set(-ENC.X - 6.9, 0, z); b.rotation.y = Math.PI / 2; scene.add(b);
  }
  // panneau du playground à l'entrée
  const pan = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.0),
    new THREE.MeshStandardMaterial({ map: panneauTexture(canvasTex), roughness: 0.6, side: THREE.DoubleSide }));
  pan.position.set(ENC.XP + 0.62, 1.55, -4.2); pan.rotation.y = -Math.PI / 2; scene.add(pan);
  for (const dz of [-0.75, 0.75]) box(0.07, 2.1, 0.07, M.pole, ENC.XP + 0.62, 1.05, -4.2 + dz, scene, false);
}

function panneauTexture(canvasTex) {
  return canvasTex(680, 400, (g, w, h) => {
    g.fillStyle = '#f2f0e9'; g.fillRect(0, 0, w, h);
    g.fillStyle = C.rouge; g.fillRect(0, 0, w, 86);
    g.fillStyle = '#f2f0e9'; g.font = 'bold 48px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('PLAYGROUND', w / 2, 44);
    g.fillStyle = '#17171a'; g.font = 'bold 62px Impact, sans-serif';
    g.fillText('RUDY GOBERT', w / 2, 150);
    g.font = '26px Arial, sans-serif'; g.fillStyle = '#4a4a4a';
    g.fillText('Quai Michelet · Levallois-Perret', w / 2, 210);
    g.fillStyle = C.jaune; g.fillRect(w / 2 - 150, 244, 300, 8);
    g.fillStyle = '#4a4a4a'; g.font = '22px Arial, sans-serif';
    g.fillText('Terrain ouvert à tous · 8h - 22h', w / 2, 296);
    g.fillText('Respecte le terrain, respecte les autres', w / 2, 332);
  }, null, false, 16);
}


// =====================================================================
//  LE PANIER DE LEVALLOIS
// =====================================================================
// Rien a voir avec le panier de parc de Becon (panneau en eventail blanc sur poteau gris). Ici : panneau
// RECTANGULAIRE gris clair a gros cadre NOIR, poteau noir, grande structure en A qui le tient par l'arriere,
// et un panneau grillage noir derriere le cercle. C'est la silhouette qu'on voit sur toutes les photos.
//
// LARGEUR DU PANNEAU : 1,30 m, et pas les 1,80 m reglementaires. Ce n'est pas un oubli. La collision du
// panneau est ecrite en dur dans js/ball.js (|x| < 0,62, y de 2,93 a 3,88) et elle vaut pour les deux
// terrains ; un panneau plus large serait TRAVERSABLE sur ses bords, ce qui se verrait immediatement en jeu.
// On dessine donc exactement ce qui arrete la balle, a trois centimetres pres.
function panierLevallois(scene, K, sgn) {
  const { box, COURT } = K;
  const g = new THREE.Group();
  const bz = sgn * Math.abs(COURT.BOARD_Z);
  const noir = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.5 }), 'metal',
    { tri: true, rouille: 0.2, relief: 0.4 });
  // l'acier galvanise du mat : gris mat, marbre (le grain de la photo), un peu de rouille aux soudures
  const acier = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0xa9adb2, roughness: 0.35, metalness: 0.75 }), 'metal',
    { tri: true, rouille: 0.1, relief: 0.3, grain: 0.35, pied: 0.4 });
  const blanc = new THREE.MeshStandardMaterial({ color: 0xf3f3ef, roughness: 0.4 });
  // Verre du panneau : on voit les arbres au travers sur la photo. depthWrite reste a false, sinon la vitre
  // cache le cercle et le filet qui sont juste devant.
  const verre = new THREE.MeshPhysicalMaterial({
    color: 0xdce6ea, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.26,
    side: THREE.DoubleSide, depthWrite: false,
  });
  // PANNEAU REGLEMENTAIRE : 1,80 x 1,05. Il etait a 1,30 x 1,00 — presque carre — parce que la collision de
  // js/ball.js etait ecrite en dur a 1,24 m de large et que je ne voulais pas dessiner plus large que ce qui
  // arrete la balle. C'est maintenant le terrain qui declare la taille du panneau, donc on peut le faire juste.
  // PANNEAU AGRANDI. 1,80 x 1,05 etait la cote reglementaire au millimetre, mais sur un playground les
  // panneaux sont plus grands que ca et, en jeu, la planche paraissait etroite derriere le cercle. On monte
  // a 2,05 x 1,22. La collision suit toute seule : elle est publiee plus bas dans scene.userData.panneau
  // et js/ball.js la lit, donc la balle rebondit exactement sur ce qu'on voit.
  const LB = 2.05, HB = 1.22, yB = 3.47, CAD = 0.055;
  const zPied = sgn * 14.35;
  scene.userData.panneau = { demiL: LB / 2, bas: yB - HB / 2 + 0.03, haut: yB + HB / 2 - 0.03 };

  // ---- panneau : une vitre prise dans un cadre NOIR fin ----
  // Le cadre est noir et mince sur la photo, pas blanc et epais : c'est ce qui fait qu'on voit surtout le
  // verre et les arbres derriere, et que le panneau parait large.
  const vitre = new THREE.Mesh(new THREE.PlaneGeometry(LB - CAD, HB - CAD), verre);
  vitre.position.set(0, yB, bz); vitre.renderOrder = -1; g.add(vitre);
  box(LB, CAD, 0.06, noir, 0, yB + HB / 2, bz, g);
  box(LB, CAD * 1.5, 0.06, noir, 0, yB - HB / 2, bz, g);        // traverse basse, plus epaisse
  for (const sx of [-1, 1]) box(CAD, HB, 0.06, noir, sx * (LB - CAD) / 2, yB, bz, g);

  // ---- LA MOUSSE DE PROTECTION BLEUE, SOUS LE PANNEAU ----
  // C'est la piece qu'on retrouve sur tous les paniers de playground : un boudin de mousse epaisse ferme
  // le chant BAS du panneau et remonte sur une quinzaine de centimetres de chaque cote, en U. Elle est la
  // pour qu'on ne s'ouvre pas le crane en montant au dunk, et visuellement c'est elle qui donne au panier
  // son air d'equipement de terrain plutot que de maquette.
  // Elle deborde de la vitre des deux cotes : c'est une piece rapportee, sanglee par-dessus le cadre.
  const mousse = new THREE.MeshStandardMaterial({ color: 0x1f46c8, roughness: 0.78, metalness: 0.02 });
  const MO_E = 0.075;                                  // epaisseur du boudin, vers le terrain
  box(LB + 0.07, 0.16, MO_E, mousse, 0, yB - HB / 2 - 0.02, bz - sgn * (0.03 + MO_E / 2), g);
  for (const sx of [-1, 1]) {
    box(0.10, 0.34, MO_E, mousse, sx * (LB + 0.07 - 0.10) / 2, yB - HB / 2 + 0.15,
        bz - sgn * (0.03 + MO_E / 2), g);
  }

  // ---- carre de visee blanc, juste au-dessus du cercle ----
  const CL = 0.59, CH = 0.45, cy = COURT.HOOP_Y + CH / 2 - 0.01;
  for (const y of [cy - CH / 2, cy + CH / 2]) box(CL, 0.035, 0.014, blanc, 0, y, bz - sgn * 0.016, g, false);
  for (const x of [-CL / 2, CL / 2]) box(0.035, CH, 0.014, blanc, x, cy, bz - sgn * 0.016, g, false);

  // ---- le losange noir au logo, en haut du panneau ----
  // Grand et bien centre en haut : c'est le seul aplat opaque de la vitre, il porte tout le caractere du
  // panneau. A 42 cm il se perdait dans le verre.
  // Attention a la taille : tourne de 45 degres, un carre de cote c a ses pointes a c x 0,71 du centre. A
  // 60 cm le losange descendait donc jusqu'a 3,25 m et recouvrait le carre de visee, qui commence a 3,49.
  const los = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshStandardMaterial({
    map: logoLosange(K.canvasTex), transparent: true, alphaTest: 0.25, roughness: 0.55, side: THREE.DoubleSide,
  }));
  los.position.set(0, yB + 0.28, bz - sgn * 0.02); los.rotation.z = Math.PI / 4; g.add(los);

  // ---- mat gris droit + bras coude ----
  // Sur la photo il n'y a aucune structure en A : juste un poteau clair plante derriere le muret et un bras
  // coude. Ce que j'avais pris pour une charpente noire, c'est LE PORTAIL, qui passait juste derriere.
  const HP = yB + 0.80;
  const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, HP, 14), acier);
  mat.position.set(0, HP / 2, zPied); mat.castShadow = true; g.add(mat);
  box(0.5, 0.13, 0.5, acier, 0, 0.065, zPied, g);
  const dz = Math.abs(zPied - bz);
  const bras = box(0.09, 0.09, dz + 0.12, acier, 0, HP - 0.2, (zPied + bz) / 2, g);
  bras.castShadow = true;
  // triangle de renfort derriere la vitre : on le voit par transparence sur la photo
  for (const s2 of [-1, 1]) {
    const haut = new THREE.Vector3(s2 * 0.34, yB + 0.30, bz + sgn * 0.09);
    const bas = new THREE.Vector3(0, yB - 0.34, bz + sgn * 0.62);
    const d = new THREE.Vector3().subVectors(haut, bas);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, d.length(), 8), acier);
    br.position.copy(bas).addScaledVector(d, 0.5);
    br.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    g.add(br);
  }
  // jambe de force oblique sous le bras
  const haut = new THREE.Vector3(0, HP - 0.28, bz + sgn * 0.62);
  const bas = new THREE.Vector3(0, yB - 0.62, zPied - sgn * 0.02);
  const dir = new THREE.Vector3().subVectors(haut, bas);
  const jf = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, dir.length(), 10), acier);
  jf.position.copy(bas).addScaledVector(dir, 0.5);
  jf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  jf.castShadow = true; g.add(jf);
  // protection de mousse au pied du poteau : un simple manchon serre autour du fut
  const prot = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.125, 1.45, 14),
    new THREE.MeshStandardMaterial({ color: 0xa8442a, roughness: 0.88 }));
  prot.position.set(0, 0.74, zPied); g.add(prot);
  // platine noire du cercle
  box(0.24, 0.19, 0.045, noir, 0, COURT.HOOP_Y, bz - sgn * 0.035, g, false);

  scene.add(g);
  return g;
}

// le losange noir du haut du panneau, avec son logo geometrique blanc
function logoLosange(canvasTex) {
  return canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#15171a'; g.fillRect(0, 0, w, h);
    // Le logo doit se lire depuis le milieu du terrain, a dix metres : trait epais, formes simples.
    g.strokeStyle = '#f2f0e9'; g.lineWidth = 15; g.lineJoin = 'round'; g.lineCap = 'round';
    const c = w / 2, r = w * 0.26;
    g.beginPath(); g.moveTo(c, c - r); g.lineTo(c + r * 0.82, c); g.lineTo(c, c + r); g.lineTo(c - r * 0.82, c);
    g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(c - r * 0.44, c + r * 0.34); g.lineTo(c, c - r * 0.40); g.lineTo(c + r * 0.44, c + r * 0.34);
    g.stroke();
    g.beginPath(); g.moveTo(c - r * 0.44, c + r * 0.62); g.lineTo(c + r * 0.44, c + r * 0.62); g.stroke();
  }, null, true, 16);
}


// Pont metallique en enfilade sur la Seine : deux culees, un tablier, et une poutre treillis au-dessus.
function pontSeine(scene, K, xc, z) {
  const { box } = K;
  const g0 = new THREE.Group();
  const beton = new THREE.MeshStandardMaterial({ color: 0xa8a49a, roughness: 0.9 });
  const acier = new THREE.MeshStandardMaterial({ color: 0x5d666c, roughness: 0.6, metalness: 0.6 });
  // Le tablier ne fait que la largeur du fleuve, plus une culee de chaque cote. A 150 m il debordait largement
  // sur la berge ET sur le parc : depuis le bout du terrain on voyait une poutre blanche traverser le ciel
  // au-dessus de la pelouse, ce qui n'a aucun sens.
  const L = 132;
  box(L, 1.4, 9, beton, 0, 6.2, 0, g0);
  for (const dx of [-L / 2 + 4, -18, 18, L / 2 - 4]) box(7, 7, 10, beton, dx, 3, 0, g0);
  for (const dz of [-4.4, 4.4]) {
    box(L, 0.18, 0.2, acier, 0, 8.2, dz, g0, false);
    for (let t = -L / 2; t <= L / 2; t += 4.5) box(0.2, 2.0, 0.2, acier, t, 7.9, dz, g0, false);
  }
  g0.position.set(xc, 0, z); scene.add(g0);
}

// Roseaux de berge : de hautes touffes verticales, denses, qu'on a au premier plan derriere le grillage.
function roseaux(scene, K, x) {
  const { canvasTex } = K;
  const tex = canvasTex(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x0 = Math.random() * w, hh = rnd(0.45, 1.0) * h;
      const v = Math.floor(rnd(90, 170));
      g.strokeStyle = `rgba(${v},${v + 22},${Math.floor(v * 0.55)},${rnd(0.55, 1)})`;
      g.lineWidth = rnd(1.5, 3.2);
      g.beginPath(); g.moveTo(x0, h);
      g.quadraticCurveTo(x0 + rnd(-12, 12), h - hh * 0.6, x0 + rnd(-22, 22), h - hh);
      g.stroke();
    }
  }, null, true, 8);
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, roughness: 0.9 });
  const geos = [], quad = new THREE.PlaneGeometry(1, 1), mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
  for (let z = -60; z < 60; z += 0.85) {
    for (let k = 0; k < 2; k++) {
      // Plus bas et plus clairsemes : a 2,9 m ils formaient un rideau opaque et on ne voyait plus une goutte
      // de Seine depuis le terrain, alors que c'est justement la vue qui fait ce lieu.
      const hh = rnd(1.0, 1.8);
      e.set(0, rnd(0, Math.PI), rnd(-0.06, 0.06)); q.setFromEuler(e); sc.set(rnd(1.0, 1.6), hh, 1);
      mtx.compose(new THREE.Vector3(x + rnd(-1.1, 1.1), hh / 2 - 0.2, z + rnd(-0.3, 0.3)), q, sc);
      geos.push(quad.clone().applyMatrix4(mtx));
    }
  }
  const m = new THREE.Mesh(mergeGeometries(geos), mat);
  m.castShadow = true; scene.add(m);
}


// Bache noire au logo Nike (virgule blanche), tendue sur le grillage du fond.
function bacheNike(canvasTex) {
  const PX = 130, w = Math.round(9.0 * PX), h = Math.round(2.2 * PX);
  return canvasTex(w, h, (g) => {
    g.fillStyle = '#131316'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14000; i++) {
      g.fillStyle = `rgba(255,255,255,${rnd(0.01, 0.05)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), 1);
    }
    // la virgule : une pointe fine a gauche qui s'epaissit et remonte a droite
    g.fillStyle = '#f5f4ef'; g.beginPath();
    const cx = w * 0.62, cy = h * 0.56, L = w * 0.30;
    g.moveTo(cx - L * 0.48, cy + L * 0.10);
    g.quadraticCurveTo(cx + L * 0.10, cy + L * 0.22, cx + L * 0.52, cy - L * 0.30);
    g.quadraticCurveTo(cx + L * 0.10, cy + L * 0.06, cx - L * 0.44, cy + L * 0.18);
    g.closePath(); g.fill();
  }, null, false, 16);
}


// Container maritime 20 pieds, sarcelle, avec le losange blanc du playground sur le flanc.
function container(scene, K, x, z, rotY, dim = {}) {
  const { box } = K;
  const g0 = new THREE.Group();
  const L = dim.L || 6.06, H = dim.H || 2.59, P = dim.P || 2.44;
  // Il n'est pas sarcelle : c'est un BLEU PETROLE sourd, et sa moitie basse porte une grande DIAGONALE
  // JAUNE qui monte de gauche a droite — la meme jaune que les marches du gradin a cote. C'est ce qui le
  // fait lire comme un element du terrain et non comme une caisse posee la.
  // BoxGeometry range ses faces dans l'ordre +X, -X, +Y, -Y, +Z, -Z. Les deux premieres sont les BOUTS
  // (la face des portes et celle d'en face), les deux dernieres les LONGS COTES. Un seul materiau habillait
  // les six, d'ou le jaune sur la face des portes, ou il n'a rien a faire.
  // BoxGeometry range ses faces dans l'ordre +X, -X, +Y, -Y, +Z, -Z. Le module etant tourne d'un quart de
  // tour, ce sont les deux PREMIERES qu'on voit de biais depuis le terrain — c'est la, A GAUCHE du losange,
  // que se trouve la diagonale jaune. La face qui porte le losange, elle, est entierement bleue.
  // LA TOLE ONDULEE EST UNE VRAIE TOLE : la photo d'un flanc de container (container_side, Poly Haven), son onde
  // de 28 cm, ses bosses et ses coulures, projetee a sa taille reelle. Les couleurs restent celles du dessin.
  // Une tole PEINTE : c'est la peinture qui renvoie la lumiere, pas le metal (metallicite basse).
  const tolePhoto = { relief: 1.1, grain: 0.55, rugo: 0.8, pied: 0.25 };
  const toleJaune = marquerPhoto(new THREE.MeshStandardMaterial({
    map: toleOnduleeTexture(K.canvasTex, P, H, true), roughness: 0.52, metalness: 0.15,
  }), 'container', tolePhoto);
  const toleUnie = marquerPhoto(new THREE.MeshStandardMaterial({
    map: toleOnduleeTexture(K.canvasTex, L, H, false), roughness: 0.52, metalness: 0.15,
  }), 'container', tolePhoto);
  const tole = [toleJaune, toleJaune, toleUnie, toleUnie, toleUnie, toleUnie];
  const cadre = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x2c4c66, roughness: 0.5, metalness: 0.3 }), 'metal',
    { tri: true, rouille: 0.55, relief: 0.6 });
  const corps = new THREE.Mesh(new THREE.BoxGeometry(L, H, P), tole);
  corps.position.y = H / 2 + 0.12; corps.castShadow = true; corps.receiveShadow = true; g0.add(corps);
  // longerons et montants d'angle : sans eux un container n'est qu'une boite
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) box(L + 0.04, 0.14, 0.14, cadre, 0, H / 2 + 0.12 + sy * H / 2, sz * P / 2, g0, false);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.14, H, 0.14, cadre, sx * L / 2, H / 2 + 0.12, sz * P / 2, g0, false);
  for (const sx of [-1, 1]) box(0.45, 0.24, P + 0.1, cadre, sx * (L / 2 - 0.35), 0.12, 0, g0, false);
  // les huit pieces de coin, par ou on le leve et on l'arrime : des blocs d'acier moule
  const fonte = marquerPhoto(new THREE.MeshStandardMaterial({ color: 0x23282c, roughness: 0.6, metalness: 0.4 }), 'metal',
    { tri: true, rouille: 0.7 });
  for (const sx of [-1, 1]) for (const sy of [0, 1]) for (const sz of [-1, 1]) {
    box(0.18, 0.12, 0.17, fonte, sx * (L / 2 - 0.02), 0.12 + sy * H + (sy ? -0.02 : 0.02), sz * (P / 2 - 0.01), g0, false);
  }
  // le losange blanc du logo, sur le flanc tourne vers le terrain
  const dLos = Math.min(0.95, L * 0.30);                 // le logo suit la taille du module
  const los = new THREE.Mesh(new THREE.PlaneGeometry(dLos, dLos), new THREE.MeshStandardMaterial({
    map: logoLosange(K.canvasTex), transparent: true, alphaTest: 0.2, roughness: 0.6, side: THREE.DoubleSide,
  }));
  // Le losange etait DEJA a sa place : je l'avais deplace pour rien. Il reste sur cette face-ci, qui est
  // maintenant entierement bleue, et c'est la face d'a cote qui porte le jaune.
  los.position.set(L * 0.18, H / 2 + 0.2, P / 2 + 0.02); los.rotation.z = Math.PI / 4; g0.add(los);
  g0.position.set(x, 0, z); g0.rotation.y = rotY; scene.add(g0);
  return g0;
}

// tole ondulee verticale d'un container
function toleOnduleeTexture(canvasTex, L, H, jaune = true) {
  const PX = 120, w = Math.round(L * PX), h = Math.round(H * PX);
  return canvasTex(w, h, (g) => {
    // Teinte de depart CLAIRE et ombres d'ondulation legeres : a #17696b avec des creux a 30 % de noir, le
    // container ressortait quasiment noir une fois l'etalonnage applique. L'ondulation doit se lire, pas
    // assombrir la tole.
    // BLEU PETROLE, pas sarcelle. La diagonale jaune est peinte AVANT l'ondulation, pour que les creux et
    // les aretes de la tole passent par-dessus : peinte apres, elle a l'air d'un autocollant plat pose sur
    // des vagues.
    //
    // ELLE N'EST QUE SUR LES LONGS COTES. La face des portes, celle qui porte le losange, est entierement
    // bleue — je l'avais peinte partout parce qu'un seul materiau habillait les six faces de la boite. Et
    // le jaune monte vers la GAUCHE, c'est-a-dire vers le gradin : son angle droit est en bas a gauche.
    g.fillStyle = '#39627e'; g.fillRect(0, 0, w, h);
    if (jaune) {
      g.fillStyle = '#e7bf1e';
      g.beginPath(); g.moveTo(0, h * 0.26); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
    }
    // L'ONDULATION N'EST PLUS PEINTE : c'est le relief photo qui la donne (voir container), et il la donne dans
    // la lumiere du moment. On n'en garde qu'un soupcon, l'encrassement du fond des creux.
    const pas = 0.28 * PX;
    for (let x = 0; x < w; x += pas) {
      const grd = g.createLinearGradient(x, 0, x + pas, 0);
      grd.addColorStop(0, 'rgba(0,0,0,0.06)'); grd.addColorStop(0.5, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.05)');
      g.fillStyle = grd; g.fillRect(x, 0, pas, h);
    }
    const r = hasard(Math.round(L * 100 + (jaune ? 7 : 0)));
    // la peinture passee par plaques, plus claire la ou le soleil tape
    for (let i = 0; i < 6; i++) {
      const cx = r(0, w), cy = r(0, h * 0.7), rr = r(0.3, 0.9) * PX;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
      gr.addColorStop(0, 'rgba(210,220,225,0.10)'); gr.addColorStop(1, 'rgba(210,220,225,0)');
      g.fillStyle = gr; g.fillRect(cx - rr, cy - rr, 2 * rr, 2 * rr);
    }
    // la rouille qui sort du longeron du bas et coule des rivets du haut
    for (let i = 0; i < w / PX * 22; i++) {
      const x = r(0, w), y = h - Math.pow(r(), 2.5) * 0.35 * PX;
      g.fillStyle = `rgba(${Math.round(r(92, 140))},${Math.round(r(50, 76))},${Math.round(r(26, 40))},${r(0.15, 0.55)})`;
      g.fillRect(x, y, r(1, 4), r(1, 5));
    }
    for (let i = 0; i < w / PX * 3; i++) {
      const x = r(0, w), l = r(0.1, 0.8) * PX;
      const gr = g.createLinearGradient(0, 0, 0, l);
      gr.addColorStop(0, `rgba(118,62,30,${r(0.2, 0.5)})`); gr.addColorStop(1, 'rgba(118,62,30,0)');
      g.fillStyle = gr; g.fillRect(x, 0, r(1, 3.5), l);
    }
    // eclats de peinture et griffures, un peu partout
    for (let i = 0; i < w / PX * 60; i++) {
      g.fillStyle = `rgba(${Math.floor(r(80, 150))},${Math.floor(r(55, 95))},${Math.floor(r(35, 60))},${r(0.05, 0.3)})`;
      g.fillRect(r(0, w), r(0, h), r(1, 4), r(1, 4));
    }
    g.strokeStyle = 'rgba(190,196,200,0.18)'; g.lineWidth = 1;
    for (let i = 0; i < w / PX * 4; i++) {
      const x = r(0, w), y = r(h * 0.3, h * 0.95);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + r(-0.3, 0.3) * PX, y + r(-0.05, 0.05) * PX); g.stroke();
    }
    // la terre qui rejaillit au pied
    const sale = g.createLinearGradient(0, h, 0, h - 0.3 * PX);
    sale.addColorStop(0, 'rgba(70,60,46,0.45)'); sale.addColorStop(1, 'rgba(70,60,46,0)');
    g.fillStyle = sale; g.fillRect(0, h - 0.3 * PX, w, 0.3 * PX);
  }, null, false, 16);
}

// bache noire de la ville : blason stylise + « Levallois »
function bacheVille(canvasTex) {
  const PX = 150, w = Math.round(5.4 * PX), h = Math.round(2.4 * PX);
  return canvasTex(w, h, (g) => {
    g.fillStyle = '#121214'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(255,255,255,${rnd(0.01, 0.045)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), 1);
    }
    // blason : un ecusson simple surmonte d'une couronne de traits
    g.strokeStyle = '#f2f0e9'; g.fillStyle = '#f2f0e9'; g.lineWidth = 5;
    const cx = w * 0.30, cy = h * 0.40, r = 0.44 * PX;
    g.beginPath();
    g.moveTo(cx - r, cy - r); g.lineTo(cx + r, cy - r); g.lineTo(cx + r, cy + r * 0.3);
    g.quadraticCurveTo(cx, cy + r * 1.5, cx - r, cy + r * 0.3);
    g.closePath(); g.stroke();
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(cx + i * r * 0.36, cy - r); g.lineTo(cx + i * r * 0.36, cy - r * 1.45); g.stroke(); }
    g.font = `italic ${Math.round(0.62 * PX)}px Georgia, serif`;
    g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillText('Levallois', w * 0.44, h * 0.44);
    g.font = `${Math.round(0.17 * PX)}px Arial, sans-serif`;
    g.fillText('L A   V I L L E', w * 0.45, h * 0.70);
  }, null, false, 16);
}


// Texture de pelouse : un vert qui n'est pas plat. Une couleur unie sur 400 m se lit comme du carton.
function pelouseTexture(canvasTex) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#4e6e38'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70000; i++) {
      const v = Math.random();
      const r = Math.floor(58 + v * 46), vv = Math.floor(88 + v * 62), b = Math.floor(38 + v * 34);
      g.fillStyle = `rgba(${r},${vv},${b},${rnd(0.25, 0.8)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 4), rnd(2, 7));
    }
    for (let i = 0; i < 60; i++) {                       // plaques plus claires / plus sombres
      const r = rnd(30, 140), gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, Math.random() < 0.5 ? 'rgba(130,160,90,0.18)' : 'rgba(40,58,30,0.2)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); g.translate(Math.random() * w, Math.random() * h); g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); g.restore();
    }
  }, [46, 46], false, 8);
}

// LE PARC. Le terrain est pose dans un parc de bord de Seine : allees de sable stabilise, bosquets, haies,
// bancs. Sans ca, la moitie de ce qu'on voit par-dessus l'enceinte est un aplat vide.
function parc(scene, K) {
  const { ENC, box, canvasTex, modelTree, treeSoil, buildShrub, M } = K;
  const sable = surfaceParc(new THREE.MeshStandardMaterial({ map: alleeTexture(canvasTex), roughness: 0.97 }), 'gravier');

  // deux allees qui contournent le terrain, cote parc
  const a1 = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 150), sable);
  a1.rotation.x = -Math.PI / 2; a1.position.set(-ENC.X - 9.5, 0.005, 0); a1.receiveShadow = true; scene.add(a1);
  // Elle s'arrete au quai : longue de 64 m et centree a 7,6 m, elle filait 22 m au-dessus de la Seine.
  const a2x0 = -ENC.X - 12, a2x1 = ENC.XP + 7.2;
  const a2 = new THREE.Mesh(new THREE.PlaneGeometry(a2x1 - a2x0, 3.0), sable);
  a2.rotation.x = -Math.PI / 2; a2.position.set((a2x0 + a2x1) / 2, 0.005, -ENC.Z - 9.0); a2.receiveShadow = true; scene.add(a2);

  // bosquets : deux rangees d'arbres derriere le fond -Z, et des massifs epars dans la pelouse
  for (let i = 0; i < 9; i++) {
    const x = -26 + i * 6.4 + rnd(-1.2, 1.2);
    treeSoil(scene, x, -ENC.Z - 13.5 + rnd(-1.5, 1.5), 0.9);
    modelTree(scene, x, -ENC.Z - 13.5 + rnd(-1.5, 1.5), rnd(9, 14), rnd(4, 6));
  }
  for (const [x, z] of [[-24, -4], [-27, 12], [-21, 22], [-16, -26], [4, -30], [16, -28], [-33, 2]]) {
    treeSoil(scene, x, z, 0.85);
    modelTree(scene, x, z, rnd(9, 13.5), rnd(4, 5.6));
  }
  // massifs bas, le long des allees
  for (let z = -34; z <= 34; z += 4.2) buildShrub(scene, -ENC.X - 11.6 + rnd(-0.3, 0.3), z, 4.6, 1.15, 1.1);
  for (let x = -30; x <= 10; x += 4.6) buildShrub(scene, x, -ENC.Z - 7.2 + rnd(-0.3, 0.3), 4.4, 1.1, 1.0);

  // bancs de parc le long de l'allee
  for (const z of [-22, -6, 10, 24]) {
    const b = new THREE.Group();
    for (const dz of [-0.7, 0.7]) box(0.44, 0.44, 0.09, M.pole, 0, 0.22, dz, b);
    box(0.52, 0.07, 1.75, M.benchWood, 0, 0.46, 0, b);
    box(0.07, 0.42, 1.75, M.benchWood, -0.22, 0.68, 0, b);
    b.position.set(-ENC.X - 7.8, 0, z); b.rotation.y = Math.PI / 2; scene.add(b);
  }
  // corbeilles
  for (const [x, z] of [[-ENC.X - 8.4, -14], [-ENC.X - 8.4, 18], [-4, -ENC.Z - 8.2]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.8, 12),
      new THREE.MeshStandardMaterial({ color: 0x2c3b2c, roughness: 0.7 }));
    c.position.set(x, 0.4, z); c.castShadow = true; scene.add(c);
  }
  // lampadaires de parc : simples, pour ne pas concurrencer les mats du terrain
  for (const [x, z] of [[-ENC.X - 9.5, -20], [-ENC.X - 9.5, 4], [-ENC.X - 9.5, 28], [-8, -ENC.Z - 9.0], [12, -ENC.Z - 9.0]]) {
    const g0 = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x2f3438, roughness: 0.45, metalness: 0.6 }));
    m.position.y = 2.1; m.castShadow = true; g0.add(m);
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfdf6e0, emissive: 0xfff2cc, emissiveIntensity: 0.25, roughness: 0.4 }));
    t.position.y = 4.32; g0.add(t);
    g0.position.set(x, 0, z); scene.add(g0);
  }
}

// allee de sable stabilise
function alleeTexture(canvasTex) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b8a583'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) {
      const v = Math.floor(rnd(140, 215));
      g.fillStyle = `rgba(${v},${v - 16},${v - 48},${rnd(0.2, 0.7)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), rnd(1, 3));
    }
  }, [12, 40], false, 8);
}


// Copeaux d'ecorce : des eclats bruns allonges, orientes au hasard.

