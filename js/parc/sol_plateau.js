import * as THREE from 'three';
import { TELEPHONE } from '../appareil.js';
import { texCuite } from '../tex_cuites.js';
import { RASANT } from '../surfaces_parc.js';
import { saisonParc } from './options.js';

// =====================================================================
//  LE SOL DU PLATEAU DU PARC DE BÉCON : un vrai enrobé de terrain public, usé et taché — sans fissures ni rustines
// =====================================================================
// LA DEMANDE (Haythem, 07/10) : « le béton me paraît trop lisse et pas ouf ; mets un sol plus réaliste avec des
// détails ». Il avait raison : le plateau était UNE toile de 4 m répétée (bitumeParc, js/court_parc.js), le détail
// photographique d'asphalt_04 (js/surfaces_parc.js, entrée « asphalte ») et ±4 % de nuances. Or asphalt_04 est un
// enrobé très fin, presque un béton taloché : vu debout ou de la caméra du match, le sol sortait en aplat gris clair,
// sans relief sous le soleil, sans une marque — un parking neuf, pas un terrain où l'on joue depuis vingt ans.
//
// LE VRAI SOL (photos 1000051340 à 343 du 26/09, et 600 à 602 au ras du sol) : un ENROBÉ (BBSG 0/10), pas un béton —
// un liant gris neutre semé de gravillons clairs qu'on voit nettement à hauteur d'homme, des pastilles de chewing-gum,
// des plages un peu plus sombres ou plus claires sur un à trois mètres, la fissure colmatée qui traverse le plateau,
// le tag rose, des aiguilles et des feuilles le long des bords. Sans une ligne au sol, et pas de joints : pas de dalles.
//
// LA TROISIÈME PASSE (07/10 au soir : « je ne vois aucune correction sur le sol du parc de Bécon »). Mesuré côte à côte
// avec main aux vues de jeu (caméra du match, au cercle, à hauteur d'homme, sous le panier, en balade ; PC et ?tel=1) :
// il avait raison. À plus de 4 m, le grain de la photo, trois fois plus fin en texels que celui d'asphalt_04, était fondu
// par les mipmaps — le plateau sortait PLUS lisse que celui de main ; la gomme (-9 %) et les rustines (-17 % au masque,
// -10 % à l'écran) fondaient dans le pommelé ; la teinte, recentrée en entier, éclaircissait tout le reste à chaque zone
// sombre ajoutée. D'où : la photo agrandie à 4,4 m et un grain qui TIENT LA DISTANCE (1. ci-dessous), la gomme et les
// rustines nettement plus sombres, des bords salis, huit longues fissures colmatées de plus, la patine plus marquée, la
// teinte recentrée à moitié et la clarté rattrapée. Mesuré contre main (moyenne sRGB du sol à l'écran, au soleil des
// deux côtés) : vu d'en haut, de -1,4 à +0,1 % ; aux vues de jeu, de -0,5 à -4,3 % sur PC et de +1 à -6 % au téléphone
// (les plus sombres sont les vues des paniers : la gomme et les rustines y sont, et l'ombre des platanes, qui bouge d'une
// capture à l'autre, y pèse jusqu'à 3 %).
//
// LA QUATRIÈME PASSE (07/10, nuit ; revue côte à côte avec main, PC et ?tel=1). Le PC changeait nettement à toutes les
// vues ; le TÉLÉPHONE seulement à la caméra TV, en balade et sous le panier — à hauteur d'homme et au cercle, un gris pâle
// à grain fin, des rustines en taches pâles sans contour, des fissures ouvertes effacées (la toile y est réduite de
// moitié : un trait d'un pixel n'y est plus qu'un demi-texel). La gomme ne se lisait que d'en haut, en nuage ; sous le
// panier, le sol sortait de 7 à 13 % plus sombre que celui de main (le voile de gomme, et une rustine noire dans la
// raquette du terrain 2) ; et le grain regonflé faisait, de la caméra du match, une neige d'un ou deux pixels 1,7 fois
// plus contrastée que celle de main. D'où :
//  - au téléphone, les traits des fissures ouvertes trois fois plus larges et le trait de scie des rustines quatre fois
//    (EP_OUV : un texel et demi à deux), la PATINE de 10 à 60 cm renforcée (x 1,6 : patineTel) ; partout, des rustines
//    plus noires (30-40), et les GRAPPES de gravillons de 3 à 8 cm (la photo relue en grand, floutée : l'échelle qu'on
//    voit de 5 à 15 m) ;
//  - la gomme en CŒUR : un croissant à bord net de 0,45 à 2 m de l'aplomb du cercle, gris 40, strié dans le sens du jeu,
//    poli (rugosité 0,52 au plus bas) et plus brillant en rasant — sombre vu d'en haut, lustré à hauteur d'homme ; le
//    voile large presque effacé, les traces de semelles moins noires ; les rustines des raquettes sorties sur les ailes ;
//  - le gain du grain PLAFONNÉ (1,6 niveau de mipmap) et rendu passé un texel huit fois plus petit que le pixel ;
//  - au premier plan des vues de jeu de chaque terrain, une fissure ouverte, un pontage et deux taches d'huile.
// Mesuré contre main (les vues de la revue, 1280 x 720, la moyenne du sol comparée soleil contre soleil et ombre contre
// ombre) : PC de -4,0 à +3,7 % (parc) et de +1,0 à +3,3 % (parc2) ; téléphone de -1,7 à +2,8 % (parc) et de -4,0 à
// +3,4 % (parc2) ; sous le panier, de -3,4 à +3,7 % (de -7 à -13 % avant). Sans l'ombre des platanes : de -2,1 à +5,0 %,
// le haut de la fourchette sous le panier, face au soleil, où la raquette polie le renvoie. Le cœur de gomme, vu de la
// caméra du cercle : 12 à 16 % plus sombre que l'enrobé qui l'entoure (main : 1 %). Le grain fin de la caméra du match
// (écart-type sous 1,5 px) : 1,5 à 1,6 fois celui de main sur PC, 1,5 au téléphone (1,7 avant) ; la caméra décalée d'un
// quart de pixel, l'image y bouge de 15 % de moins qu'avant. Les tons moyens (1,5 à 12 px) : 1,7 à 2,3 fois ceux de main.
//
// LA CINQUIÈME PASSE (07/10, Haythem : « pour le sol du parc de Bécon c'est très bien, juste enlève les traces de fissure
// et les grosses traces rectangle […] tout ce qui est petite trace tu peux laisser »). RETIRÉS, sur les deux terrains, PC
// et téléphone : toutes les FISSURES — ouvertes, colmatées au goudron (les pontages, les huit longues du colmatage des
// années, celles du premier plan des vues de jeu), le faïençage du coin du quai, la fissure transversale de l'hiver, la
// longue fissure colmatée de x = -5,7 du calque des bords (bordsParc, js/court_parc.js), et même celle que portait la
// PHOTO du granulat (un trait fin de 2,7 m, revenu tous les 4,4 m, 25 fois sur le plateau : gommée avec six petits bouts
// autour d'elle par tools/enrobe_plateau.py, le 08/10) —, avec leur relief, leur rugosité, l'eau qu'elles gardaient
// sous la pluie et la mousse qui les suivait ; les TRAITS en ligne : les joints de
// reprise entre les bandes du finisseur (il n'en reste que le changement de ton, FONDU sur un mètre : net, il dessinait
// encore une ligne d'un bout à l'autre du plateau) et les traces de pneus ; les GRANDES TRACES CARRÉES : les six
// rustines, leurs traits de scie et la tranchée côté quai. GARDÉS : le grain et le relief de l'enrobé, la rugosité et
// l'usure des zones de jeu, les plages et la patine, la gomme et les traces de semelles sous les cercles, les taches
// d'huile et de soda, les auréoles des flaques séchées, la crasse et la mousse des bords, les feuilles mortes, les débris,
// les chewing-gums et le petit tag rose. Le reste du masque est le même au pixel près, à un niveau de teinte près (son
// recentrage) : les tirages au hasard des rustines et des traces de pneus sont sautés (voir 2d) ; seules les limites
// des bandes, fondues, la forme des quatre taches du premier plan et la mousse des rives, retirée au sort, changent. Le canal G des masques est vide ; le shader ne lit plus le
// relief des fissures (deux lectures de texture de moins, de près, sur PC), ne cherche plus les rustines (une boucle de
// six, sur PC) ni le bord du goudron (un bruit), et le téléphone n'a plus ni goudron ni fissure à teinter.
// Mesuré contre main le 07/10 au soir (1280 x 720, soleil des deux côtés, la moyenne du sol à l'écran ; caméra du
// match, la même près d'un panier, à hauteur d'homme, sous chaque cercle, d'en haut) : sur PC de -0,6 à +1,5 % (parc)
// et de -0,2 à +1,7 % (parc2), au téléphone de +1,0 à +1,9 % (parc) et de -1,1 à +1,0 % (parc2) — la clarté
// (SOL_PLATEAU.clarte) ne bouge pas. Le plan d'enrobé seul (rendu attendu par la lecture d'un pixel, moins le même rendu
// sans lui, minimum de 8 ; ce soir encore par le pilote logiciel de Windows : un ordre de grandeur du travail du shader,
// pas un temps de carte graphique), caméra du match, à hauteur d'homme, sous le panier, d'en haut, en ms : PC (haute)
// main 77-79 ; 107-110 ; 126 ; 66-69 -> 74 ; 104 ; 118 ; 66 ; téléphone simulé (moyenne) main 41 ; 48 ; 56 ; 39 -> 41 ;
// 47-48 ; 56-58 ; 38. Les masques cuits pèsent 770 Ko sur PC (841 avant) et 175 Ko au téléphone (200).
//
// CE QUE FAIT CE MODULE, en un seul matériau (le plan d'enrobé de buildParc, qui garde sa toile dessinée et sa couleur) :
//  1. LA PHOTO DU GRANULAT : celle de La Cage (Poly Haven asphalt_02, 3 m, CC0), NETTOYÉE pour le plateau par
//     tools/enrobe_plateau.py (assets/parc/tex/enrobe_*) : coutures raccordées, sa fissure gommée, tons de plus de
//     15 cm et lignes qui suivent ses axes retirés — telle quelle, elle revenait en DAMIER de cases de 3 m sur tout le
//     plateau (net vu d'en haut, léger de la caméra du match). Il n'en reste que le grain fin, qui ne se reconnaît plus d'une case à l'autre :
//     les tons du plateau viennent des masques (4.), dessinés une fois, à leur place. Deux images : le grain, et les
//     normales avec l'occlusion ; la rugosité suit le grain (un gravillon clair est poli). Lue UNE fois, à la position
//     du MONDE, avec un filtrage anisotrope de 4 (à 8, les vues rasantes coûtaient 0,6 à 0,7 ms de plus pour une
//     différence qu'on ne voit pas ; une seconde lecture tournée, 0,3 à 0,9 ms, ne se voyait plus une fois la photo
//     nettoyée). Le relief répond au soleil : les têtes de gravillons accrochent la lumière. La photo est posée sur
//     4,4 m (ses 3 m réels : des gravillons de 6 à 15 mm, un enrobé usé jusqu'au gros granulat) et son grain, comme ses
//     pentes, est REGONFLÉ selon le niveau de mipmap lu (PG_COULEUR) : passé 4 m, il ne fond plus en aplat — plafonné et
//     rendu au loin depuis la quatrième passe ; la photo du grain est relue une seconde fois, en grand et floutée, pour
//     les GRAPPES de gravillons de 3 à 8 cm, l'échelle qui porte le grain de 5 à 15 m.
//  2. LA RUGOSITÉ QUI VARIE : celle du grain, PLUS celle de l'usure — là où l'on joue (sous les paniers, dans l'axe des
//     terrains), le liant est parti, les gravillons sont polis : plus lisses, plus brillants en rasant, leur grain plus
//     marqué. L'usure ne fait QUE du contraste : clarté, rugosité et brillance sont rapportées à l'usure moyenne, et la
//     teinte du masque est recentrée à la cuisson — la clarté moyenne du plateau est celle d'avant (le premier jet
//     l'éclaircissait de 4 à 17 niveaux).
//  3. LES ONDULATIONS (PC) : un enrobé n'est jamais plan. Une pente de l'ordre du degré, sur deux échelles (2,5 m et
//     60 cm), tirée d'un bruit dont on connaît la dérivée (aucune lecture de texture) : de loin, la brillance du sol se
//     moire comme sur les photos 340 et 343. Sa valeur donne aussi des nuances lentes (±3 %).
//  4. LES MASQUES DU PLATEAU (masquesPlateau, 48 px/m, dessinés UNE fois et cuits, tools/cuire_textures.py) :
//       R = la teinte (128 neutre) : les bandes du finisseur (leurs limites fondues), les plages lentes (±8 %) et la
//           PATINE de 10 à 60 cm (±10 à 14 % : elle passe les mipmaps, c'est elle qu'on voit de la caméra du match), les
//           bords salis sur 0,6 à 1 m, le CŒUR DE GOMME sous chaque cercle (un croissant à bord net, strié, 16 à 20 %
//           plus sombre à l'écran vu de la caméra du cercle) et les traces de semelles, taches d'huile ou de soda,
//           auréoles des flaques séchées ;
//       G = vide (les fissures, les pontages, les traits de scie et les joints y étaient : retirés, cinquième passe) ;
//       B = l'usure (0 à 1), qui pilote couleur, rugosité et relief (voir 2.) ;
//       A = la mousse (255 : aucune) : des coussinets de 4 à 11 cm, au cœur plus sombre, au pied du mur et des
//           grillages.
//     Les flaques sont à des places fixées (FLAQUES) : le shader les retrouve, pour y remettre l'eau quand il pleut.
//  5. LA BRILLANCE RASANTE (celle de js/surfaces_parc.js, SP_RASANT, lot L7) : reprise telle quelle, plus forte sur
//     les zones polies.
// Les feuilles mortes photographiées des bords sont plus bas (feuillesPlateau).
//
// COÛT. Aucun maillage de plus pour le sol (le même plan) ; un appel de dessin de plus pour les feuilles. Lectures de
// texture par pixel : 6 (toile x 2, masque, grain, normales + occlusion, et depuis la quatrième passe les grappes — la
// photo du grain relue à un niveau de mipmap grossier, peu de mémoire lue) ; jusqu'à la cinquième passe, 2 de plus près
// d'une fissure sur PC (son relief). Sur téléphone, pas un bruit calculé hors de celui de la toile (ni ondulations, ni
// eau des flaques au bord bruité). MESURÉ le 07/10 au matin (Radeon intégrée, partagée, requêtes de temps
// de la carte graphique, le plan d'enrobé SEUL, minimum sur 2 x 60 images, en ms ; d'une séance à l'autre, cela bouge
// de 0,2 à 0,3 ms : main et ce module mesurés dans la même séance, ce module deux fois, d'où les fourchettes) :
//   PC, haute, 1791 x 1007 — main -> premier jet -> maintenant : caméra du match 3,11-3,16 -> 3,69 -> 3,41-3,69 ; à
//     hauteur d'homme 3,70-3,74 -> 5,87 -> 3,97-4,15 ; rasant au soleil 3,06-3,12 -> 4,88 -> 3,56-3,59 ; regard aux
//     pieds 3,97-4,18 -> 6,00 -> 5,09-5,12 (l'image entière en coûte 50 à 150 ici) ;
//   téléphone simulé (?tel=1), moyenne, 1398 x 786 — main -> maintenant : 0,86 -> 0,81 ; 0,77 -> 0,86 ; 0,73 -> 0,79 ;
//     1,15 -> 1,18 (le premier jet : 1,08 ; 1,17 ; 0,92 ; 1,54, contre 1,06 ; 0,92 ; 0,81 ; 1,26 pour main ce jour-là).
//   (Depuis, la gomme, ses traces de semelles refaites et les rustines plus sombres ne changent que le masque — même
//   taille, même format, pas une ligne de shader —, et le grain des rustines du téléphone n'ajoute qu'un smoothstep.)
//   La troisième passe n'ajoute AUCUNE lecture de texture : le gain du grain et des pentes (un log2 et quelques
//   multiplications, tirés des dérivées déjà calculées), l'adoucissement des clairs ; le reste est dans le masque.
//   Mesuré le 07/10 au soir, autrement (le panneau caché ne rend pas les requêtes de temps : le plan d'enrobé seul,
//   rendu puis attendu par une lecture d'un pixel, moins le même rendu sans lui ; minimum de 25, 1280 x 720, en ms ;
//   main et cette version dans la même demi-heure) — caméra du match, au cercle, à hauteur d'homme, sous le panier :
//   PC (auto) main 4,2 ; 3,4 ; 3,8 ; 4,6 -> 3,3-3,5 ; 2,8 ; 3,3 ; 3,8 (moins cher que main : asphalt_04 en coûtait deux
//   lectures et deux bruits) ; téléphone simulé (?tel=1, moyenne) main 3,2 ; 2,7 ; 3,1 ; 3,7 -> 3,3 ; 2,6 ; 3,1 ; 3,6.
//   La quatrième passe ajoute la lecture des grappes et une poignée d'opérations (le fondu du gain, la patine du
//   téléphone, la gomme) ; PAS MESURÉE sur la carte : le panneau rendait ce soir-là par le pilote logiciel de Windows
//   (« Microsoft Basic Render Driver »), dont les temps ne disent rien du coût sur une vraie carte graphique.
// Mémoire : sur PC, le grain en 2048 (on le voit à ses pieds), normales et occlusion en 1024 ; sur téléphone 1024 et
// 512 (2,8 Mo à télécharger sur PC, 0,64 Mo sur téléphone) ; le masque (1402 x 874, 701 x 437 sur téléphone). Si les
// photos ne chargent pas, des textures neutres d'un texel tiennent leur place : le sol garde ses masques et sa toile.

const MOBILE = TELEPHONE;
const TEX_PARC = 'assets/parc/tex/';
const TEX_CAGE = 'assets/tex/cage/';     // (les feuilles mortes, celles de La Cage)
// les moyennes des photos nettoyées, et la rugosité tirée du grain (tools/enrobe_plateau.py les écrit)
const GRAIN_MOYEN = 0.467;
const AO_MOYEN = 0.724;
const RUGO_A = 0.598, RUGO_B = -0.212;    // rugosité de la photo = RUGO_A + RUGO_B x grain (corrélation 0,82)
const PX_M = 48;                    // pixels des masques par mètre (PC ; la moitié sur téléphone, voir canvasTex)
// pendant la cuisson des textures (tools/cuire_textures.html), on ne charge aucune photo : seule la toile compte
const CUISSON = typeof globalThis !== 'undefined' && !!globalThis.__CUISSON_TEXTURES__;

// Texture neutre d'un texel, le temps que la photo arrive : le shader tourne tout de suite, sans flash.
function texNeutre(r, g, b) {
  const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true;
  return t;
}
// Les photos du granulat, chargées une fois dans leurs uniformes : sur PC, le grain en 2048 et les normales (+ occlusion)
// en 1024 ; sur téléphone, 1024 et 512.
let _photos = null;
function photosGranulat() {
  if (_photos) return _photos;
  const g0 = Math.round(GRAIN_MOYEN * 255);
  const P = _photos = { uPgGrain: { value: texNeutre(g0, g0, g0) }, uPgNao: { value: texNeutre(128, 128, Math.round(AO_MOYEN * 255)) } };
  if (CUISSON || typeof document === 'undefined') return P;
  for (const [u, nom] of [[P.uPgGrain, 'enrobe_grain' + (MOBILE ? '_1k' : '')], [P.uPgNao, 'enrobe_nao' + (MOBILE ? '_512' : '')]]) {
    new THREE.TextureLoader().load(TEX_PARC + nom + '.jpg', (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.colorSpace = THREE.NoColorSpace;
      const avant = u.value; u.value = t; if (avant && avant.isDataTexture) avant.dispose();
    }, undefined, (e) => console.warn('[parc] photo du granulat non chargée (' + nom + '), le plateau reste sans grain', e));
  }
  return P;
}

// =====================================================================
//  LES MASQUES DU PLATEAU (R : teinte, G : vide, B : usure, A : mousse)
// =====================================================================
// LES FLAQUES SÉCHÉES (x1, z : leur centre dans le repère du terrain 1 ; rayon, aplatissement, angle ; la quatrième, sous
// un cercle du terrain 2, est à x1 = t2 + 1,2). Fixées ici, pas tirées au hasard : le shader les retrouve.
// (Les RUSTINES, des plaques d'enrobé refait de 1 à 2,4 m découpées à la scie, et la tranchée de 6 m côté quai, étaient
// fixées ici aussi : retirées le 07/10, cinquième passe — « les grosses traces rectangle ».)
const FLAQUES = [[-22.6, 2.8, 1.1, 0.5, 0.2], [-8.4, -2.6, 1.5, 0.6, -0.3], [4.7, -7.6, 1.2, 0.55, 0.1], [null, -6.2, 1.0, 0.65, -0.15],
  [-12.5, 6.9, 0.9, 0.5, 0.35], [2.2, 3.6, 0.8, 0.7, -0.05]];

// La toile couvre le plan d'enrobé de buildParc (`LB` x `LZ` m) : son x va du pied du mur (x = 0) vers le quai, son y
// du grillage des platanes (en haut, z-) à celui du pin (en bas, z+), comme le calque des bords (bordsParc). Les cotes
// sont celles du repère du TERRAIN 1 : `mur` = distance de son axe au pied du mur (23,7), `t2` = x de l'axe du
// terrain 2 (-16,1), `hz` = distance des cercles au milieu (7,525). Tout ce qui est tiré au hasard l'est au hasard
// FIXÉ de js/tex_cuites.js : la toile cuite est exactement celle que le jeu dessinerait.
// Chaque canal a sa toile (R sur fond gris 128, l'usure et la mousse sur fond noir), puis tout est rangé dans une image.
// La texture garde dans ses userData (cuits avec elle) l'usure moyenne et les flaques en mètres de la toile, pour le
// shader (materiauPlateau).
export function masquesPlateau(canvasTex, LB, LZ, mur, t2, hz) {
  const cuite = texCuite(masquesPlateau, arguments, [PX_M, FLAQUES]); if (cuite) return cuite;
  const S = PX_M, w = Math.round(LB * S), h = Math.round(LZ * S);
  const X = (x1) => (x1 + mur) * S, Y = (z) => h / 2 + z * S;           // repère du terrain 1 -> toile
  const al = (a, b) => a + Math.random() * (b - a);
  const donnees = {};
  const tex = canvasTex(w, h, (g0) => {
    const toile = (fond) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = fond; g.fillRect(0, 0, w, h);
      g.lineCap = 'round'; g.lineJoin = 'round';
      return [c, g];
    };
    const [cR, gR] = toile('rgb(128,128,128)');      // la teinte
    const [cB, gB] = toile('#000');                  // l'usure
    const [cM, gM] = toile('#000');                  // la mousse

    // ---- les outils ----
    // une tache en dégradé radial, étirée et tournée (`r` en pixels)
    const tache = (g, x, y, r, couleur, sx = 1, sy = 1, rot = 0) => {
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, couleur); gr.addColorStop(1, couleur.replace(/[\d.]+\)$/, '0)'));
      g.save(); g.translate(x, y); g.rotate(rot); g.scale(sx, sy); g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); g.restore();
    };
    const gris = (v, a) => `rgba(${v | 0},${v | 0},${v | 0},${a.toFixed(3)})`;
    // UN HASARD À PART (mulberry32 à graine fixe, comme js/tex_cuites.js) pour ce qui s'ajoute au plateau déjà validé :
    // la suite des tirages de Math.random, et donc la place de tout le reste, ne bouge pas
    const aPart = (graine, f) => {
      const hasard = Math.random; let a = graine | 0;
      Math.random = () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      try { f(); } finally { Math.random = hasard; }
    };
    // une forme fermée irrégulière : rayon de base `R` (px), aplatie de `k`, tournée de `rot`
    const contour = (g, x, y, R, k, rot, bosse = 0.15) => {
      const p1 = al(0, 6.28), p2 = al(0, 6.28), p3 = al(0, 6.28);
      g.beginPath();
      for (let i = 0; i <= 48; i++) {
        const t = i / 48 * Math.PI * 2;
        const r = R * (1 + bosse * Math.sin(2 * t + p1) + bosse * 0.55 * Math.sin(3 * t + p2) + bosse * 0.35 * Math.sin(5 * t + p3));
        const px = Math.cos(t) * r, py = Math.sin(t) * r * k;
        const qx = x + px * Math.cos(rot) - py * Math.sin(rot), qy = y + px * Math.sin(rot) + py * Math.cos(rot);
        i ? g.lineTo(qx, qy) : g.moveTo(qx, qy);
      }
      g.closePath();
    };
    // UN COUSSINET DE MOUSSE (`r` en px) : plein au cœur (le shader l'y fait plus sombre), qui s'éclaircit au bord ; on
    // garde le plus fort de deux coussinets qui se touchent
    gM.globalCompositeOperation = 'lighten';
    const coussin = (x, y, r) => {
      const gr = gM.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(190,190,190,0.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      gM.fillStyle = gr; gM.fillRect(x - r, y - r, 2 * r, 2 * r);
    };
    // une touffe : 3 à 9 coussinets de 4 à 11 cm serrés autour d'un point (`ex`, `ey` : son étendue en m)
    const touffe = (x, y, ex = 0.08, ey = 0.08, n = 3 + Math.floor(Math.random() * 7)) => {
      for (let i = 0; i < n; i++) coussin(x + al(-ex, ex) * S, y + al(-ey, ey) * S, al(0.02, 0.055) * S);
    };

    // ---- 1. L'USURE (B) ----
    // Partout un fond de 12 % pommelé (le plateau a vingt ans) ; puis, sur chacun des deux terrains, la zone de tir
    // devant chaque cercle (une ellipse de 7 x 6 m, plus forte sous le cercle, là où l'on pivote, où l'on retombe), les
    // couloirs de double-pas de part et d'autre de la raquette, et l'axe du terrain d'un panier à l'autre. Les bords
    // de chaque zone sont mités par des taches de 40 cm à 1,2 m : une usure n'a pas un contour d'ellipse.
    gB.fillStyle = 'rgb(30,30,30)'; gB.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) tache(gB, Math.random() * w, Math.random() * h, al(0.8, 3) * S, gris(Math.random() < 0.5 ? 0 : 70, al(0.15, 0.35)));
    gB.globalCompositeOperation = 'lighter';
    for (const xt of [0, t2]) {
      tache(gB, X(xt), Y(0), 3.4 * S, gris(60, 0.9), 1, 2.2);                    // l'axe du terrain, d'un cercle à l'autre
      for (const sgn of [-1, 1]) {
        const zc = sgn * (hz - 2.3);
        tache(gB, X(xt), Y(zc), 3.6 * S, gris(105, 0.95), 1, 0.85);               // la zone de tir
        tache(gB, X(xt), Y(sgn * (hz - 1.0)), 1.9 * S, gris(95, 0.95), 1.15, 0.8);  // sous le cercle
        for (const cote of [-1, 1]) tache(gB, X(xt + cote * 1.7), Y(sgn * (hz - 1.6)), 1.1 * S, gris(50, 0.9), 0.8, 1.3);   // double-pas
        for (let i = 0; i < 26; i++) {
          const a = al(0, 6.28), r = Math.sqrt(Math.random()) * 3.6;
          tache(gB, X(xt + Math.cos(a) * r), Y(zc + Math.sin(a) * r * 0.85), al(0.4, 1.2) * S, gris(al(15, 40), 0.9));
        }
      }
    }
    // le passage entre les deux terrains (on y attend son tour, on va au banc et à la cage de hand)
    tache(gB, X(-8), Y(1), 2.2 * S, gris(35, 0.9), 1, 2.6);
    gB.globalCompositeOperation = 'source-over';

    // ---- 2. LA TEINTE (R, 128 = la couleur dessinée) ----
    // 2a. LES BANDES DU FINISSEUR : l'enrobé a été posé en bandes de 3,6 à 4,2 m le long du plateau (en x), chacune de sa
    //     gâchée — d'un ton à l'autre, ±2 %. La limite est FONDUE sur un mètre environ (un flou de 50 cm) : nette, avec
    //     le fil sombre du joint de reprise par-dessus, elle traçait une ligne droite d'un bout à l'autre du plateau —
    //     joints et fil retirés le 07/10 (cinquième passe). Chaque bande déborde de la toile de 2 m de tous côtés : le
    //     flou ne l'éteint pas au bord du plateau. (Le léger tremblé du bord, fondu lui aussi, garde ses tirages : tout ce
    //     qui suit reste à sa place.)
    {
      const joints = [];
      let z = -LZ / 2 + al(3.4, 4.2);
      while (z < LZ / 2 - 2) { joints.push(z); z += al(3.6, 4.2); }
      const bords = [-LZ / 2 - 2, ...joints, LZ / 2 + 2];
      gR.filter = `blur(${0.5 * S}px)`;
      for (let i = 0; i + 1 < bords.length; i++) {
        gR.fillStyle = gris(Math.random() < 0.5 ? 118 : 138, al(0.25, 0.55));
        gR.beginPath(); gR.moveTo(-2 * S, Y(bords[i]));
        for (let x = 0; x <= w + 0.5 * S; x += 0.5 * S) gR.lineTo(x, Y(bords[i]) + al(-0.5, 0.5));
        gR.lineTo(w + 2 * S, Y(bords[i])); gR.lineTo(w + 2 * S, Y(bords[i + 1]));
        for (let x = w + 0.5 * S; x >= 0; x -= 0.5 * S) gR.lineTo(x, Y(bords[i + 1]) + al(-0.5, 0.5));
        gR.lineTo(-2 * S, Y(bords[i + 1]));
        gR.closePath(); gR.fill();
      }
      gR.filter = 'none';
    }
    // 2b. des plages lentes, de 0,8 à 4 m, jusqu'à ±8 % (un enrobé lessivé par endroits, ou resté plus noir ; à ±5 %,
    //     on ne les voyait pas de la caméra du match : « aucune correction », 07/10)
    for (let i = 0; i < 70; i++) tache(gR, Math.random() * w, Math.random() * h, al(0.8, 4) * S, gris(Math.random() < 0.55 ? 80 : 174, al(0.16, 0.4)), 1, al(0.6, 1.2), al(0, 3));
    //     et LA PATINE, de 10 à 60 cm : des plaques de liant resté gras (plus sombres) et des plages où le grain est à nu
    //     (plus claires), ±6 à 9 % — sur les photos 340 et 341, c'est ce pommelé qui fait le vieil enrobé. C'est l'échelle
    //     qui passe les mipmaps : de la caméra du match (un pixel pour 2 à 4 cm), c'est elle qu'on voit, pas le grain.
    //     Des formes IRRÉGULIÈRES à bord net, en grappes de deux à six (des taches rondes en dégradé faisaient des bulles,
    //     et à ±2 % la première version ne se voyait qu'à ses pieds) ; les claires plus serrées dans les zones de jeu, où
    //     l'usure met le grain à nu.
    const grappe = (x, y, sombre, n) => {
      for (let k = 0; k < n; k++) {
        contour(gR, x + al(-0.25, 0.25) * S, y + al(-0.25, 0.25) * S, al(0.04, 0.22) * S, al(0.45, 1), al(0, 3.14), 0.3);
        gR.fillStyle = gris(sombre ? al(46, 68) : al(184, 206), al(0.22, 0.38)); gR.fill();
      }
    };
    for (let i = 0; i < 520; i++) grappe(Math.random() * w, Math.random() * h, Math.random() < 0.55, 2 + Math.floor(Math.random() * 5));
    for (const xt of [0, t2]) for (const sgn of [-1, 1]) for (let i = 0; i < 45; i++) {
      const a = al(0, 6.28), rr = Math.sqrt(Math.random()) * 3.4;
      grappe(X(xt + Math.cos(a) * rr), Y(sgn * (hz - 2.3) + Math.sin(a) * rr * 0.85), Math.random() < 0.35, 2 + Math.floor(Math.random() * 4));
    }
    //     et, plus doux, des taches en dégradé de 5 à 30 cm entre elles
    for (let i = 0; i < 700; i++) tache(gR, Math.random() * w, Math.random() * h, al(0.05, 0.3) * S, gris(Math.random() < 0.55 ? 70 : 188, al(0.24, 0.4)), 1, al(0.45, 1), al(0, 3));
    // 2c. LES BORDS, OÙ L'ON NE JOUE PAS : le pied du mur plus sombre (l'humidité qui remonte), le bord côté quai sali par
    //     la terre, le pied des deux grillages où la poussière et les feuilles pourries s'arrêtent, et les coins, où tout
    //     s'accumule — une bande de 0,6 à 1 m, de 12 à 20 % plus sombre au ras du bord, mitée de taches de crasse.
    //     (Sur 30 à 45 cm et à 6-8 %, le premier jet ne se voyait qu'en cherchant.)
    {
      const bande = (x0, y0, x1, y1, v, a) => {
        const gr = gR.createLinearGradient(x0, y0, x1, y1);
        gr.addColorStop(0, gris(v, a)); gr.addColorStop(0.45, gris(v, a * 0.45)); gr.addColorStop(1, gris(v, 0));
        gR.fillStyle = gr; gR.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) || w, Math.abs(y1 - y0) || h);
      };
      bande(0, 0, 0.95 * S, 0, 66, 0.6);              // le pied du mur
      bande(w, 0, w - 0.7 * S, 0, 72, 0.55);          // le bord du quai
      bande(0, 0, 0, 0.8 * S, 74, 0.5);               // le grillage des platanes
      bande(0, h, 0, h - 0.7 * S, 78, 0.45);          // le grillage du pin
      for (const [cx, cy] of [[0, 0], [w, 0], [0, h], [w, h]]) tache(gR, cx, cy, 2.0 * S, gris(70, 0.55));
      // la crasse en lobes le long des bords (hasard à part : le reste du plateau ne bouge pas)
      aPart(0x51c0, () => {
        for (let i = 0; i < 90; i++) {
          const cote = Math.random(), r = al(0.25, 0.9) * S, d = al(0, 0.5) * S;
          const [x, y] = cote < 0.35 ? [d, Math.random() * h] : cote < 0.6 ? [w - d, Math.random() * h] : cote < 0.82 ? [Math.random() * w, d] : [Math.random() * w, h - d];
          tache(gR, x, y, r, gris(al(58, 80), al(0.2, 0.4)), al(0.6, 1.6), al(0.6, 1.6), al(0, 3));
        }
      });
    }
    // 2d. LA GOMME SOUS LES CERCLES : un VOILE sombre de 3 m là où l'on freine et où l'on pivote (gris 80 à 50 %, plus
    //     noir encore sous le cercle), et les traces de semelles. (À gris 96 et 32 %, avec 70 traces, le premier voile ne
    //     se voyait pas de la caméra.)
    //     UNE TRACE DE SEMELLE est COURTE (8 à 30 cm) et EFFILÉE : une tête en virgule, plus noire, là où la semelle a
    //     mordu, puis une queue qui s'amincit et pâlit en 4 à 6 tronçons ; à peine courbe (0,6 rad au plus d'un bout à
    //     l'autre). Elles suivent le jeu : la plupart TANGENTES au cercle, à 1-3 m du panier (les appuis, les pivots,
    //     les changements de pied autour de la raquette), d'autres dans l'AXE de la raquette (les entrées vers le panier),
    //     quelques-unes en tous sens, et quelques traînées DROITES de freinage dans le sens de l'attaque, leur bout noir
    //     côté panier. 80 à 120 par cercle. (Avant : 230 arcs et crochets de 15 à 60 cm, tous de la même largeur, sur
    //     toute l'ellipse de 3,6 m — de la caméra du match et d'en haut, un gribouillis de vers gris, pas de la gomme.)
    {
      // (les anciennes traces tiraient ici leur hasard, 8 à 9 tirages chacune : on en consomme autant, pour que la suite
      // du plateau — taches, flaques, mousse — reste exactement celle qu'on a validée ; les nouvelles ont leur propre
      // générateur, un mulberry32 comme celui de js/tex_cuites.js, à graine fixe. Même chose, depuis la cinquième passe,
      // pour ce qui est retiré autour d'elles : les six rustines, posées juste avant, 75 tirages chacune — sautés AVANT
      // ceux des anciennes traces, dont le compte dépend des valeurs tirées —, et les trois traces de pneus, juste
      // après, 7 chacune)
      for (let i = 0; i < 6 * 75; i++) Math.random();
      for (let i = 0; i < 4 * 230; i++) { for (let k = 0; k < 5; k++) Math.random(); for (let k = Math.random() < 0.6 ? 3 : 2; k > 0; k--) Math.random(); }
      for (let i = 0; i < 110 * 8 + 3 * 7; i++) Math.random();
      const hasard = Math.random;
      let a32 = 0x9e3779b1;
      Math.random = () => {
        a32 = (a32 + 0x6d2b79f5) | 0;
        let t = Math.imul(a32 ^ (a32 >>> 15), 1 | a32);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      try {
        // une trace : sa tête en (x, y) px, partant au cap `cap` (rad, sur la toile), `L` en m, qui tourne en tout de
        // `courbe` rad ; `larg` : la largeur de la tête en px ; `v`, `a` : son gris et son opacité à la tête. Un seul
        // ruban (les tronçons se touchent sans se recouvrir : pas de nœud plus sombre à leurs joints), rempli d'un dégradé
        // qui pâlit vers la queue ; la virgule de la tête par-dessus. Dessous, un FROTTIS deux fois et demie plus large et
        // très pâle (la poussière de gomme étalée autour) : c'est lui qui reste quand les mipmaps fondent la trace, de la
        // caméra du match (sans lui, des traces de 2 à 4 texels de large s'y perdaient dans le grain).
        const semelle = (x, y, cap, L, courbe, larg, v, a, virgule = true) => {
          const n = 4 + Math.floor(Math.random() * 3), pas = L * S / n, gauche = [], droite = [], milieu = [];
          let px = x, py = y, c = cap;
          for (let k = 0; k <= n; k++) {
            const lk = larg * (1 - 0.55 * Math.pow(k / n, 1.4)) * al(0.88, 1.12) / 2, nx = -Math.sin(c), ny = Math.cos(c);
            gauche.push([px + nx * lk, py + ny * lk]); droite.push([px - nx * lk, py - ny * lk]); milieu.push([px, py]);
            if (k < n) { c += courbe / n; px += Math.cos(c) * pas; py += Math.sin(c) * pas; }
          }
          const bx = px + Math.cos(c) * pas * 0.35, by = py + Math.sin(c) * pas * 0.35;      // la pointe de la queue
          gR.strokeStyle = gris(v + 30, a * 0.15); gR.lineWidth = larg * 2.5;
          gR.beginPath(); milieu.forEach(([qx, qy], k) => (k ? gR.lineTo(qx, qy) : gR.moveTo(qx, qy))); gR.stroke();
          const gr = gR.createLinearGradient(x, y, bx, by);
          gr.addColorStop(0, gris(v, a)); gr.addColorStop(0.55, gris(v + 6, a * 0.88)); gr.addColorStop(1, gris(v + 20, a * 0.3));
          gR.fillStyle = gr; gR.beginPath(); gR.moveTo(gauche[0][0], gauche[0][1]);
          for (const [qx, qy] of gauche) gR.lineTo(qx, qy);
          gR.lineTo(bx, by);
          for (let k = droite.length - 1; k >= 0; k--) gR.lineTo(droite[k][0], droite[k][1]);
          gR.closePath(); gR.fill();
          // (la virgule : une ellipse couchée dans le sens de la trace, pas plus large qu'elle — ronde et plus large, la
          // tête faisait des têtards)
          if (virgule) {
            const lv = larg * al(0.45, 0.7);
            gR.fillStyle = gris(Math.max(0, v - 6), Math.min(0.85, a * 1.12));
            gR.beginPath(); gR.ellipse(x + Math.cos(cap) * lv * 0.6, y + Math.sin(cap) * lv * 0.6, lv, larg * al(0.3, 0.42), cap, 0, 6.29); gR.fill();
          }
        };
        const signe = () => (Math.random() < 0.5 ? -1 : 1);
        for (const xt of [0, t2]) for (const sgn of [-1, 1]) {
          const zc = sgn * (hz - 1.5);
          // (en plateau, pas en cône : plein jusqu'à mi-rayon, puis il s'éteint)
          const voile = (x, y, r, v, a, sx, sy) => {
            const gr = gR.createRadialGradient(0, 0, 0, 0, 0, r);
            gr.addColorStop(0, gris(v, a)); gr.addColorStop(0.5, gris(v, a * 0.9)); gr.addColorStop(0.8, gris(v, a * 0.4)); gr.addColorStop(1, gris(v, 0));
            gR.save(); gR.translate(x, y); gR.scale(sx, sy); gR.fillStyle = gr; gR.fillRect(-r, -r, 2 * r, 2 * r); gR.restore();
          };
          // LA GOMME, QUATRIÈME PASSE (07/10). Un voile large et sombre (gris 30 à 66 % sur 3 m, gris 22 sous le cercle)
          // ne se lisait que d'en haut, en nuage flou ; de la caméra du match, il fondait dans le pommelé et l'ombre des
          // platanes, et sous le panier il assombrissait la vue de 7 à 13 % (main en face). D'où : un CŒUR plus petit, à
          // bord net, là où l'on retombe, pivote et freine — un croissant de 0,45 à 2,05 m de l'aplomb du cercle, face au
          // terrain et sur ses côtés (±75°) —, rempli de gris 40 et strié dans le sens du jeu ; poli (l'usure y est au
          // plus haut), c'est aussi un sol plus lisse et plus brillant en rasant (le shader le reconnaît : usure haute ET
          // teinte sombre, voir pgGomme). Le voile large n'est plus qu'un soupçon : à gris 84 et 22 %, la vue sous le
          // panier restait de 7 % plus sombre que celle de main au téléphone ; ce sont le cœur, les traces et les frottis
          // qui font la gomme.
          voile(X(xt), Y(zc), 2.6 * S, 90, 0.08, 1.15, 0.9);
          // le pied du cercle, et l'angle autour de lui (0 : face au terrain ; la direction vers le terrain est -sgn en z)
          const cx = X(xt), cy = Y(sgn * hz);
          const autour = (th, d) => [cx + Math.sin(th) * d * S, cy - sgn * Math.cos(th) * d * S];
          // (hasard à part, une graine par cercle : les traces qui suivent ne bougent pas)
          aPart(0x60e0 + (xt ? 2 : 0) + (sgn > 0 ? 1 : 0), () => {
            const TH = 1.3, N = 48, f1 = al(0, 6.28), f2 = al(0, 6.28), f3 = al(0, 6.28), bord = [];
            for (let i = 0; i <= N; i++) {         // le bord extérieur, effilé vers les côtés
              const th = -TH + 2 * TH * i / N, u = Math.abs(th) / TH;
              const r = 0.45 + 1.6 * Math.sqrt(Math.max(0, 1 - Math.pow(u, 2.5))) * (1 + 0.08 * Math.sin(3 * th + f1) + 0.05 * Math.sin(7 * th + f2) + 0.03 * Math.sin(13 * th + f3));
              bord.push(autour(th, r));
            }
            for (let i = N; i >= 0; i--) { const th = -TH + 2 * TH * i / N; bord.push(autour(th, 0.45 + 0.08 * Math.sin(4 * th + f2))); }
            const trace = (g) => { g.beginPath(); bord.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
            trace(gR); gR.fillStyle = gris(40, 0.5); gR.fill();
            gB.save(); gB.globalCompositeOperation = 'lighter'; trace(gB); gB.fillStyle = gris(50, 1); gB.fill(); gB.restore();
            gR.save(); trace(gR); gR.clip();
            // des stries dans le sens du jeu : vers le cercle (les entrées, les retombées) ou en travers (les appuis, les
            // pivots), de 25 à 80 cm, de 3 à 9 cm de large, pleines (pas en dégradé : un bord net)
            for (let i = 0; i < 120; i++) {
              const th = (Math.random() + Math.random() - 1) * TH, [x, y] = autour(th, al(0.6, 2.05));
              const vers = Math.atan2(cy - y, cx - x), cap = Math.random() < 0.6 ? vers + al(-0.2, 0.2) : vers + Math.PI / 2 + al(-0.3, 0.3);
              gR.fillStyle = gris(al(30, 50), al(0.08, 0.18));
              gR.beginPath(); gR.ellipse(x, y, al(0.12, 0.4) * S, al(0.015, 0.045) * S, cap, 0, 6.29); gR.fill();
            }
            // et des plages plus denses, là où l'on retombe le plus
            for (let i = 0; i < 6; i++) { const [x, y] = autour(al(-0.8, 0.8), al(1.1, 2.0)); tache(gR, x, y, al(0.3, 0.6) * S, gris(40, al(0.15, 0.25)), 1, al(0.6, 1), al(0, 3)); }
            gR.restore();
          });
          const n = 100 + Math.floor(Math.random() * 21);
          for (let i = 0; i < n; i++) {
            // (gris 14 à 34 au lieu de 4 à 24 depuis la quatrième passe : cent dix virgules presque noires faisaient,
            // fondues par les mipmaps, un voile de plus sur toute la raquette)
            const t = Math.random(), v = al(14, 34), a = al(0.44, 0.7);
            if (t < 0.55) {
              // tangentes, à 1-3 m du cercle, surtout face au terrain (l'angle va jusqu'aux côtés, rarement derrière)
              const th = Math.max(-1.75, Math.min(1.75, (Math.random() + Math.random() + Math.random() - 1.5) * 1.5));
              const d = al(1, 3), [x, y] = autour(th, d);
              const cap = Math.atan2(Math.sin(th), sgn * Math.cos(th)) + (Math.random() < 0.5 ? 0 : Math.PI) + al(-0.3, 0.3);
              semelle(x, y, cap, al(0.14, 0.3), signe() * al(0, 0.55), al(2.6, 4.4), v, a);
            } else if (t < 0.83) {
              // dans l'axe de la raquette, de 0,6 à 4 m du cercle, vers lui ou en revenant
              const [x, y] = [cx + (Math.random() + Math.random() - 1) * 1.1 * S, cy - sgn * al(0.6, 4) * S];
              const cap = (sgn < 0 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() < 0.6 ? Math.PI : 0) + al(-0.25, 0.25);
              semelle(x, y, cap, al(0.12, 0.28), signe() * al(0, 0.4), al(2.2, 3.8), v, a);
            } else {
              // en tous sens dans la zone de tir
              const r = Math.sqrt(Math.random()) * 3.2 * S, b = al(0, 6.28);
              semelle(X(xt) + Math.cos(b) * r, Y(zc) + Math.sin(b) * r * 0.8, al(0, 6.28), al(0.1, 0.22), signe() * al(0, 0.5), al(2, 3.2), v + 6, a * 0.85);
            }
          }
          // les traînées de freinage : droites, de 30 à 60 cm, dans le sens de l'attaque (vers le cercle), leur bout noir
          // côté panier (c'est là que la semelle s'arrête) ; plus fines et plus pâles
          for (let i = 0, m = 5 + Math.floor(Math.random() * 3); i < m; i++) {
            const th = al(-0.9, 0.9), d = al(1.4, 4), [x, y] = autour(th, d);
            const cap = Math.atan2(-sgn * Math.cos(th), Math.sin(th)) + al(-0.15, 0.15);      // du cercle vers le terrain
            semelle(x, y, cap, al(0.35, 0.6), 0, al(1.8, 2.8), al(14, 30), al(0.34, 0.5), false);
          }
        }
        // ailleurs, quelques traces isolées, plus pâles
        for (let i = 0; i < 45; i++) semelle(Math.random() * w, Math.random() * h, al(0, 6.28), al(0.1, 0.24), signe() * al(0, 0.5), al(1.8, 3), al(24, 50), al(0.16, 0.32));
        // LE VOILE N'EST PAS UNE ELLIPSE : des frottis de gomme de 30 cm à 1,1 m, étirés dans le sens du jeu, qui le
        // mitent et le débordent (là où l'on s'arrête, où l'on repart), plus serrés sous le cercle
        for (const xt of [0, t2]) for (const sgn of [-1, 1]) for (let i = 0; i < 34; i++) {
          // (sur 2,6 m et plus pâles depuis la quatrième passe : sur 3,6 m, ils faisaient le voile large qui fondait)
          const a = al(0, 6.28), r = Math.pow(Math.random(), 0.7) * 2.6, z = sgn * (hz - 1.6) + Math.sin(a) * r * 0.8;
          tache(gR, X(xt + Math.cos(a) * r), Y(z), al(0.3, 1.1) * S, gris(al(36, 62), al(0.08, 0.15)), al(0.5, 0.9), al(1.1, 1.8), al(-0.4, 0.4));
        }
      } finally { Math.random = hasard; }
    }
    // (2e. les traces de pneus, de longues courbes de 2 cm : des traits, retirés le 07/10, cinquième passe)
    // 2f. LES TACHES : huile d'un scooter, soda renversé, café — des grappes de 3 à 6 ellipses qui se chevauchent,
    //     et quelques gouttes autour
    for (let i = 0; i < 11; i++) {
      const x = al(0.04, 0.96) * w, y = al(0.06, 0.94) * h, r0 = al(0.12, 0.35) * S;
      const v = Math.random() < 0.8 ? al(70, 95) : al(150, 165);
      for (let k = 0; k < 3 + Math.floor(Math.random() * 4); k++) {
        gR.fillStyle = gris(v, al(0.1, 0.22));
        gR.beginPath(); gR.ellipse(x + al(-1, 1) * r0, y + al(-1, 1) * r0 * 0.7, r0 * al(0.4, 1), r0 * al(0.3, 0.8), al(0, 3), 0, 6.29); gR.fill();
      }
      for (let k = 0; k < 8; k++) {
        gR.fillStyle = gris(v, al(0.15, 0.3));
        gR.beginPath(); gR.arc(x + al(-2.5, 2.5) * r0, y + al(-2.5, 2.5) * r0, al(0.6, 1.6), 0, 6.29); gR.fill();
      }
    }
    // 2g. LES AURÉOLES DES FLAQUES SÉCHÉES, dans les creux du plateau (FLAQUES) : au pied du mur, entre les deux terrains,
    //     dans le coin du quai côté platanes (là où le caniveau ne suffit pas), sous un cercle du terrain 2, et au bord de
    //     la terre du pin. Le fond de la cuvette voilé de limon clair, pommelé, et un liseré plus net là où l'eau s'est
    //     arrêtée la dernière fois ; les retraits plus anciens à peine marqués. Quand il pleut, l'eau y revient (shader).
    donnees.flaques = [];
    for (const [x0, z, R, k, rot] of FLAQUES) {
      const x1 = x0 === null ? t2 + 1.2 : x0;
      donnees.flaques.push([+(x1 + mur).toFixed(3), +(z + LZ / 2).toFixed(3), +(1 / R).toFixed(4), +(1 / (R * k)).toFixed(4), +Math.cos(rot).toFixed(4), +Math.sin(rot).toFixed(4)]);
      contour(gR, X(x1), Y(z), R * S * 0.96, k, rot); gR.fillStyle = gris(150, 0.16); gR.fill();
      for (let i = 0; i < 14; i++) {
        const a = al(0, 6.28), r = Math.sqrt(Math.random()) * R * 0.75;
        tache(gR, X(x1) + Math.cos(a) * r * S, Y(z) + Math.sin(a) * r * k * S, al(0.1, 0.3) * S, gris(Math.random() < 0.5 ? 165 : 112, 0.25));
      }
      contour(gR, X(x1), Y(z), R * S, k, rot, 0.16);
      gR.strokeStyle = gris(176, 0.32); gR.lineWidth = al(1.4, 2.2); gR.stroke();
      for (const f of [0.78, 0.55]) {
        contour(gR, X(x1) + al(-0.1, 0.1) * S, Y(z) + al(-0.06, 0.06) * S, R * S * f, k * al(0.85, 1.15), rot + al(-0.2, 0.2), 0.22);
        gR.strokeStyle = gris(168, al(0.08, 0.14)); gR.lineWidth = al(1, 1.8); gR.stroke();
      }
    }

    //     Autour de celle du coin du quai côté platanes (4,7 ; -7,6), là où l'eau stagne, l'enrobé plus sale
    tache(gR, X(4.4), Y(-7.4), 0.8 * S, gris(100, 0.35), 1.2, 0.8);

    // ---- 4. LES TACHES DU PREMIER PLAN (quatrième passe, 07/10) ----
    // À hauteur d'homme, sur le terrain 2 surtout, le sol au soleil devant le joueur n'avait rien qui se lise sur un
    // téléphone : un gris pâle et un grain fin. Sur chaque terrain, là où l'on regarde en jouant (entre le rond central
    // et la raquette), deux taches d'huile ou de soda de 40 à 90 cm. (Hasard à part : le reste du plateau ne bouge pas.)
    // LES FISSURES ne sont plus là (cinquième passe, 07/10 : « enlève les traces de fissure ») : ni les ouvertes, ni
    // celles des rives et leur mousse, ni la transversale de l'hiver, ni les pontages et le colmatage des années, ni le
    // faïençage du coin du quai, ni les joints de reprise entre les bandes, ni les traits de scie des rustines.
    aPart(0x4f1e, () => {
      const huile = (x1, z, r, v) => {
        const x = X(x1), y = Y(z), r0 = r * S;
        for (let k = 0; k < 5; k++) {
          gR.fillStyle = gris(v + al(-6, 6), al(0.22, 0.34));
          gR.beginPath(); gR.ellipse(x + al(-0.6, 0.6) * r0, y + al(-0.5, 0.5) * r0, r0 * al(0.45, 0.9), r0 * al(0.3, 0.6), al(0, 3), 0, 6.29); gR.fill();
        }
        tache(gR, x, y, r0 * 0.5, gris(v - 12, 0.35), 1, al(0.5, 0.8), al(0, 3));          // le cœur, plus noir
        for (let k = 0; k < 10; k++) {                                                       // les gouttes autour
          gR.fillStyle = gris(v, al(0.2, 0.35));
          gR.beginPath(); gR.arc(x + al(-1.8, 1.8) * r0, y + al(-1.8, 1.8) * r0, al(1, 2.6), 0, 6.29); gR.fill();
        }
      };
      for (const xt of [0, t2]) {
        const t2e = xt !== 0;
        huile(xt + (t2e ? -2.5 : -2.6), t2e ? -1.6 : -1.3, al(0.3, 0.42), al(48, 60));
        huile(xt + (t2e ? -2.3 : -2.4), t2e ? 4.8 : 4.6, al(0.2, 0.3), al(52, 66));
      }
    });

    // ---- 5. LA MOUSSE DES RIVES (A) ----
    // Des touffes au pied du mur (dans le joint, où l'eau ruisselle), au pied du treillis des platanes (à l'ombre), et
    // plus rares côté quai — de petits coussinets au cœur sombre, pas un voile. (Celle qui suivait les fissures des rives,
    // en chapelets, est partie avec elles : cinquième passe.)
    for (let i = 0; i < 110; i++) touffe(al(0, 0.08) * S, Math.random() * h, 0.06, al(0.06, 0.22));
    for (let i = 0; i < 90; i++) touffe(Math.random() * w, al(0, 0.08) * S, al(0.06, 0.22), 0.06);
    for (let i = 0; i < 22; i++) touffe(w - al(0, 0.06) * S, Math.random() * h, 0.05, al(0.06, 0.15));

    // ---- 6. L'ASSEMBLAGE : une image, un canal par couche (G vide) ----
    gR.filter = 'blur(0.6px)'; gR.drawImage(cR, 0, 0); gR.filter = 'none';   // (adoucit les traces d'un pixel)
    const dR = gR.getImageData(0, 0, w, h).data, dB = gB.getImageData(0, 0, w, h).data;
    const dM = gM.getImageData(0, 0, w, h).data;
    // LA CLARTÉ MOYENNE NE BOUGE PAS : on décale la teinte de ce qu'il faut pour que sa moyenne sur le plateau soit le
    // neutre (128) — le gommage, la patine, les bords salis ne sont que du contraste ; l'usure moyenne va au shader,
    // qui rapporte à elle la clarté, la rugosité et la brillance des zones usées. (Le premier jet éclaircissait tout le
    // plateau, de 4 à 17 niveaux au soleil comme à l'ombre.)
    let sU = 0, sR = 0;
    for (let i = 0; i < dR.length; i += 4) { sR += dR[i]; sU += dB[i] / 255; }
    // (à moitié seulement depuis le 07/10 : recentrée en entier, chaque zone sombre ajoutée — gomme, rustines, bords —
    // éclaircissait d'autant tout le reste, et le plateau restait pâle ; la clarté d'ensemble est rattrapée par
    // SOL_PLATEAU.clarte, mesurée contre main)
    const n = dR.length / 4, dec = Math.round((128 - sR / n) * 0.5);
    donnees.usureMoy = +(sU / n).toFixed(4);
    const img = g0.createImageData(w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.max(0, Math.min(255, dR[i] + dec)); d[i + 1] = 0; d[i + 2] = dB[i];
      d[i + 3] = 255 - Math.round(dM[i] * 140 / 255);                     // (la mousse : alpha de 255 à 115)
    }
    g0.putImageData(img, 0, 0);
    for (const c of [cR, cB, cM]) c.width = c.height = 0;                 // libère les couches tout de suite
  }, null, false, 16);
  tex.colorSpace = THREE.NoColorSpace;                                      // des masques, lus tels quels
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  Object.assign(tex.userData, donnees);
  return tex;
}

// =====================================================================
//  LE SHADER
// =====================================================================
const PG_ENTETE = /* glsl */`
varying vec3 vPosSol;
varying vec2 vUvSol;
uniform sampler2D uPgGrain;   // le grain de la photo (gris)
uniform sampler2D uPgNao;     // ses normales (x, y) et son occlusion (b)
uniform sampler2D uPgMasq;    // teinte (r), usure (b), mousse (a)
uniform vec4 uPgA;            // 1 / côté de la photo (m), force du grain, force du relief, moyenne du grain
uniform vec4 uPgC;            // brillance rasante, sol mouillé (0 à 1), force des teintes, force de l'usure
uniform float uPgRasK;        // part de la brillance laissée par la météo (js/surfaces_parc.js RASANT)
uniform vec4 uPgDim;          // largeur (x) et longueur (z) du plan d'enrobé, m ; usure moyenne ; clarté
uniform vec4 uPgE;            // le grain qui tient la distance (grain, relief : gain par niveau de mipmap), polissage,
                              // force des ondulations
uniform vec4 uPgG;            // les grappes (force), le plafond du gain du grain (niveaux), la patine du téléphone
uniform vec4 uPgFl[ 6 ];      // les flaques : centre (m de la toile), 1 / demi-axes
uniform vec2 uPgFr[ 6 ];      // ... et leur angle (cos, sin)
float pgHash( vec2 p ) { p = fract( p * vec2( 0.1031, 0.1030 ) ); p += dot( p, p.yx + 33.33 ); return fract( ( p.x + p.y ) * p.x ); }
float pgBruit( vec2 p ) {
  vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( pgHash( i ), pgHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( pgHash( i + vec2( 0.0, 1.0 ) ), pgHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}
// le même bruit et sa dérivée (x : valeur, yz : pente), sans une lecture de plus
vec3 pgBruitD( vec2 p ) {
  vec2 i = floor( p ), f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f ), du = 6.0 * f * ( 1.0 - f );
  float a = pgHash( i ), b = pgHash( i + vec2( 1.0, 0.0 ) ), c = pgHash( i + vec2( 0.0, 1.0 ) ), d = pgHash( i + vec2( 1.0, 1.0 ) );
  float k1 = b - a, k2 = c - a, k4 = a - b - c + d;
  return vec3( a + k1 * u.x + k2 * u.y + k4 * u.x * u.y, du * vec2( k1 + k4 * u.y, k2 + k4 * u.x ) );
}
float pgRugo, pgAO, pgUsure, pgLent, pgMousse, pgFlaque, pgGainN, pgGomme;
vec3 pgNormT;
vec2 pgOnd;                 // pente des ondulations lentes (x et z du monde)
float pgGrappe;             // les grappes de gravillons (écart à la moyenne, voir PG_COULEUR)
`;

const PG_COULEUR = /* glsl */`
#ifdef USE_MAP
  // la toile dessinée (bitumeParc), lue deux fois — la seconde tournée de 37° et décalée — avec un bruit lent qui passe
  // de l'une à l'autre : ses taches ne reviennent pas en damier (même règle qu'avant, js/surfaces_parc.js SP_MAP)
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  {
    vec2 uv2 = mat2( 0.8, - 0.6, 0.6, 0.8 ) * vMapUv + vec2( 0.37, 0.61 );
    sampledDiffuseColor = mix( sampledDiffuseColor, texture2D( map, uv2 ), smoothstep( 0.3, 0.7, pgBruit( vMapUv * 0.93 + 3.1 ) ) );
  }
  diffuseColor *= sampledDiffuseColor;
#endif
{
  // ---- les masques ----
  vec4 mq = texture2D( uPgMasq, vUvSol );
  pgUsure = mq.b * uPgC.w;
  // ---- la photo du granulat, posée sur 4,4 m (SOL_PLATEAU.tuile), lue à la position du monde ----
  vec2 p = vec2( vPosSol.x, - vPosSol.z ) * uPgA.x;
  vec2 dpx = dFdx( p ), dpy = dFdy( p );
  float g1 = textureGrad( uPgGrain, p, dpx, dpy ).r;
  vec3 nao = textureGrad( uPgNao, p, dpx, dpy ).rgb;
  pgRugo = ${RUGO_A.toFixed(3)} + ${RUGO_B.toFixed(3)} * g1;
  pgAO = nao.b;
  // LE GRAIN QUI TIENT LA DISTANCE. Les mipmaps moyennent les gravillons : l'écart du grain à sa moyenne tombe de 62 à
  // 32 niveaux deux mipmaps plus loin, à 19 au troisième, à 10 au quatrième (mesuré sur la photo) — passé 4 m, l'enrobé
  // sortait en aplat lisse, plus lisse que le béton de main (asphalt_04, 4 m sur 1024 px : des grains quatre fois plus
  // gros en texels). On rend à l'écart une part de ce que le filtrage lui a pris : un gain qui croît avec le niveau de
  // mipmap lu (celui du filtrage anisotrope de 4, tiré des dérivées déjà calculées : aucune lecture de plus). La
  // photo filtrée garde ses taches à la taille du pixel : c'est un grain, pas un bruit qui scintille. Même chose pour
  // ses pentes (deux fois moins de texels : un niveau plus tôt) : les têtes de gravillons accrochent encore le soleil
  // à 10 m.
  float pgLod;
  {
    vec2 tx = vec2( length( dpx ), length( dpy ) ) * ${MOBILE ? '1024.0' : '2048.0'};
    pgLod = log2( max( max( max( tx.x, tx.y ) * 0.25, min( tx.x, tx.y ) ), 1.0 ) );
  }
  // (quatrième passe : PLAFONNÉ à 1,6 niveau, et rendu peu à peu au-delà de 3 — un texel huit fois plus petit que le
  // pixel. Sans plafond, de la caméra du match, le grain sortait en neige d'un ou deux pixels, 1,7 fois plus
  // contrastée que celle de main, du sable ou de la neige de télévision plus qu'un enrobé, et qui pouvait grouiller
  // en bougeant ; c'est l'échelle de 3 à 8 cm, plus bas — les grappes de gravillons —, qui porte maintenant le grain de
  // loin.)
  // (le fondu se règle sur la taille du pixel en mètres : la photo du téléphone, deux fois moins fine, y est un niveau
  // plus haut)
  float pgLodM = pgLod + ${MOBILE ? '1.0' : '0.0'};
  float pgGainG = 1.0 + uPgE.x * min( pgLod, uPgG.y ) * ( 1.0 - uPgG.w * smoothstep( 1.5, 3.0, pgLodM ) );
  pgGainN = 1.0 + uPgE.y * clamp( pgLod - 1.0, 0.0, 2.5 ) * ( 1.0 - 0.5 * smoothstep( 2.0, 3.5, pgLodM ) );
  pgNormT.xy = nao.xy * 2.0 - 1.0; pgNormT.z = sqrt( max( 1.0 - dot( pgNormT.xy, pgNormT.xy ), 0.0625 ) );
  float gm = g1 / uPgA.w;
  // LES GRAPPES DE GRAVILLONS, de 3 à 8 cm (quatrième passe) : la même photo relue trois fois et demie plus grande,
  // tournée, et floutée d'un niveau et demi — ses gravillons y deviennent des grappes douces, l'échelle qu'on voit de
  // 5 à 15 m (un à cinq pixels à la caméra du match) sans rien qui scintille : jamais regonflée, toujours filtrée.
  // Une lecture de plus (un niveau de mipmap grossier : peu de mémoire lue).
  {
    const mat2 RQ = mat2( 0.6, 0.8, - 0.8, 0.6 );
    pgGrappe = textureGrad( uPgGrain, RQ * p * ${(1 / 3.5).toFixed(4)} + vec2( 0.31, 0.77 ), RQ * dpx * ${(2.83 / 3.5).toFixed(4)}, RQ * dpy * ${(2.83 / 3.5).toFixed(4)} ).r / uPgA.w - 1.0;
  }
  // (le grain vu, pour la couleur : ses clairs adoucis — les têtes de gravillons, de loin, faisaient une neige de
  // points blancs, un bruit plus qu'un enrobé, et un sol plus pâle)
  float gmV = ( gm - 1.0 ) * pgGainG;
  gmV = 1.0 + ( gmV > 0.0 ? gmV / ( 1.0 + 0.6 * gmV ) : gmV );
  pgMousse = clamp( ( 1.0 - mq.a ) * 1.82, 0.0, 1.0 );
  // SOUS LA PLUIE, l'eau revient dans les cuvettes des flaques séchées : elles grandissent avec la pluie, leur bord suit
  // les auréoles du masque (et, sur PC, un bruit) ; l'eau est plus sombre, lisse et plane (PG_RUGO, PG_RELIEF)
  pgFlaque = 0.0;
  if ( uPgC.y > 0.05 ) {
    vec2 pgM = vec2( vUvSol.x, 1.0 - vUvSol.y ) * uPgDim.xy;          // le point, en mètres de la toile des masques
    float rempli = 0.92 * smoothstep( 0.05, 0.8, uPgC.y ) + ( mq.r - 0.5 ) * 0.5;
    #ifdef PG_PC
      rempli += ( pgBruit( pgM * 2.7 ) - 0.5 ) * 0.3;
    #endif
    for ( int i = 0; i < 6; i ++ ) {
      vec2 d = pgM - uPgFl[ i ].xy;
      d = vec2( dot( d, uPgFr[ i ] ), dot( d, vec2( - uPgFr[ i ].y, uPgFr[ i ].x ) ) ) * uPgFl[ i ].zw;
      pgFlaque = max( pgFlaque, smoothstep( 0.05, 0.0, length( d ) - rempli ) );
    }
    pgMousse *= 1.0 - 0.7 * pgFlaque;
  }
  pgLent = 0.5; pgOnd = vec2( 0.0 );
  #ifdef PG_PC
    // les ondulations lentes (un seul bruit, dont on a la pente) : leur pente va au relief, leur valeur aux nuances
    // lentes de la teinte et de la rugosité
    vec3 o1 = pgBruitD( vPosSol.xz * 0.42 + 1.7 );
    pgLent = o1.x; pgOnd = o1.yz * 0.42 * 0.025;
  #endif
  // ---- la couleur ----
  // la teinte du masque (128 : la couleur dessinée ; ±0,5 par unité d'écart ; recentrée à la cuisson, voir masquesPlateau)
  float tR = mq.r - 0.502;
  #ifndef PG_PC
    // (sur téléphone, la PATINE de 10 à 60 cm plus marquée — les écarts de moins de 0,1 : pas la gomme ni les
    // bords — : c'est elle, et non le grain d'un ou deux pixels, qui se lit sur un écran de six pouces)
    tR *= 1.0 + uPgG.z * smoothstep( 0.2, 0.08, abs( tR ) );
  #endif
  float teinte = 1.0 + tR * uPgC.z;
  // LE CŒUR DE LA GOMME (masquesPlateau, 2d) : usure au plus haut ET teinte sombre — la gomme bouche le grain (moins
  // de contraste, moins de relief), et elle est polie : plus lisse, plus brillante en rasant (PG_RUGO, PG_RASANT)
  pgGomme = smoothstep( 0.68, 0.85, mq.b ) * smoothstep( 0.42, 0.33, mq.r );
  // l'usure : le liant parti, les gravillons à nu — leur grain plus marqué, un rien plus clair que la moyenne (et le
  // reste un rien plus sombre : la clarté moyenne du plateau ne bouge pas ; c'est surtout la rugosité et la brillance
  // qui la montrent : à +10 % par unité d'usure, l'éclaircie annulait le voile de gomme sous les cercles, qu'on ne
  // voyait plus d'en haut). uPgDim.w : la clarté, réglée sur l'enrobé d'avant (main : asphalt_04 sur la même toile),
  // mesurée à l'ombre comme au soleil.
  float grain = uPgA.y * ( 1.0 + 0.3 * pgUsure ) * ( 1.0 - 0.4 * pgGomme );
  // (au téléphone, 0,15 par unité d'usure : sans carte d'environnement, les zones polies n'y reçoivent pas le reflet du
  // ciel qu'elles ont sur PC — la raquette sortait de 6 % plus sombre que celle de main sous le panier, 8 % sous le PC)
  vec3 c = diffuseColor.rgb * max( mix( 1.0, gmV, grain ), 0.08 ) * teinte * ( 1.0 + ${MOBILE ? '0.15' : '0.04'} * ( pgUsure - uPgDim.z ) ) * uPgDim.w;
  // les grappes (plus fortes au téléphone : son grain fin se lit moins), plus douces dans la gomme
  c *= 1.0 + clamp( pgGrappe, - 0.6, 0.6 ) * uPgG.x * ( 1.0 - 0.5 * pgGomme );
  // des nuances lentes encore, à ±3 %, sous les plages dessinées : celles des ondulations (un creux se salit)
  c *= mix( 0.97, 1.03, pgLent );
  // la mousse : des coussinets vert olive, plus sombres en leur cœur
  if ( pgMousse > 0.01 ) {
    vec3 mousse = mix( vec3( 0.105, 0.12, 0.045 ), vec3( 0.032, 0.042, 0.018 ), smoothstep( 0.45, 0.95, pgMousse ) ) * ( 0.75 + 0.5 * gm );
    c = mix( c, mousse, smoothstep( 0.0, 0.5, pgMousse ) );
  }
  if ( pgFlaque > 0.0 ) c *= mix( 1.0, 0.82, pgFlaque );
  diffuseColor.rgb = c;
}
`;

const PG_RUGO = /* glsl */`
// la rugosité de la photo (un gravillon poli brille, un creux est mat), l'usure qui polit — rapportée à l'usure moyenne :
// les zones de jeu sont plus lisses, le reste plus mat, la moyenne ne bouge pas —, une nuance lente ; la météo
// (js/weather.js) règle toujours la valeur de base (sol mouillé)
roughnessFactor *= mix( 1.0, pgRugo * 2.0, 0.55 );
// (le poli plafonné à 0,5 depuis la quatrième passe : à 0,42, face au soleil, toute la raquette en renvoyait le reflet —
// sous le panier, le sol au soleil sortait 5 % plus clair que celui de main, quand l'ombre l'avait 6 % plus sombre)
roughnessFactor *= clamp( 1.0 - uPgE.z * ( pgUsure - uPgDim.z ), 0.5, 1.25 );
roughnessFactor *= 0.93 + 0.14 * ( 1.0 - pgLent );
// (la gomme polie a un PLANCHER : à l'usure la plus haute, sa rugosité tombait à 0,27 et le soleil y faisait une
// flaque blanche, vue face à lui ; à 0,52, un lustre doux qui suit le regard — sauf mouillée)
roughnessFactor = max( roughnessFactor, 0.52 * smoothstep( 0.0, 0.5, pgGomme ) * ( 1.0 - uPgC.y ) );
roughnessFactor = mix( roughnessFactor, 1.0, smoothstep( 0.0, 0.5, pgMousse ) );
// sous la pluie, une flaque est un miroir
roughnessFactor = mix( roughnessFactor, 0.04, pgFlaque );
roughnessFactor = clamp( roughnessFactor, 0.04, 1.0 );
`;

const PG_RELIEF = /* glsl */`
{
  // repère du sol dans la vue : x du monde, -z du monde (le sens de la photo), et la normale du plan
  vec3 pgT = normalize( ( viewMatrix * vec4( 1.0, 0.0, 0.0, 0.0 ) ).xyz );
  vec3 pgB = normalize( ( viewMatrix * vec4( 0.0, 0.0, - 1.0, 0.0 ) ).xyz );
  // LES ONDULATIONS de l'enrobé (PC) : la pente d'un relief de ±1 cm sur 2,5 m, et de ±2,5 mm sur 60 cm
  vec2 pente = pgOnd;
  #ifdef PG_PC
    const mat2 R2 = mat2( 0.8, - 0.6, 0.6, 0.8 );
    vec3 o2 = pgBruitD( R2 * vPosSol.xz * 1.7 + 9.1 );
    pente += ( o2.yz * R2 ) * 1.7 * 0.005;
  #endif
  // (pente en x et en z du monde -> repère de la photo : x, -z)
  vec2 ond = vec2( - pente.x, pente.y ) * uPgE.w;
  float k = uPgA.z * pgGainN * ( 1.0 - 0.5 * pgUsure ) * ( 1.0 - 0.5 * pgGomme );
  vec2 nxy = ( pgNormT.xy * k + ond ) * ( 1.0 - pgFlaque );
  normal = normalize( pgT * nxy.x + pgB * nxy.y + normal * max( pgNormT.z, 0.25 ) );
}
`;

// La brillance rasante (js/surfaces_parc.js, SP_RASANT : voir là pour la mesure sur les photos 340, 341 et 343),
// plus forte sur les zones polies par le jeu (rapportée à l'usure moyenne : la moyenne ne bouge pas).
const PG_RASANT = /* glsl */`
if ( uPgC.x > 0.0 ) {
  float pgNV = clamp( dot( nonPerturbedNormal, normalize( vViewPosition ) ), 0.0, 1.0 );
  float pgF = pow( 1.0 - pgNV, 5.0 );
  vec3 pgCiel = ( reflectedLight.indirectDiffuse + reflectedLight.directDiffuse ) / max( material.diffuseColor, vec3( 0.02 ) );
  // (la gomme polie brille davantage en rasant : sombre vue d'en haut — la caméra du match —, lustrée vue à hauteur
  // d'homme ou sous le panier. Sans carte d'environnement — téléphone, préréglages bas et moyen —, ce terme est le
  // seul reflet du ciel qu'elle ait : plus fort, sinon elle n'y était qu'un sol plus sombre, de 8 à 13 % sous le panier)
  #ifdef USE_ENVMAP
    float pgLustre = 1.0 + 2.0 * pgGomme;
  #else
    float pgLustre = 1.0 + 5.0 * pgGomme;
  #endif
  reflectedLight.indirectDiffuse += pgCiel * vec3( 0.9, 0.87, 0.93 ) * ( uPgC.x * uPgRasK * pgF * max( 1.0 + 0.6 * ( pgUsure - uPgDim.z ), 0.5 ) * pgLustre );
}
`;

const PG_AO = /* glsl */`
{
  // les creux entre les gravillons voient moins de ciel (l'occlusion de la photo, centrée sur sa moyenne)
  float pgO = clamp( mix( 1.0, pgAO / ${AO_MOYEN.toFixed(3)}, 0.55 ), 0.35, 1.12 );
  reflectedLight.indirectDiffuse *= pgO;
  reflectedLight.indirectSpecular *= mix( 1.0, pgO, 0.6 );
  reflectedLight.directDiffuse *= mix( 1.0, pgO, 0.3 );
}
`;

// Les réglages (PC / téléphone) : la photo, le grain, le relief, les ondulations, la brillance.
export const SOL_PLATEAU = {
  tuile: 4.4,            // m : le côté de la photo asphalt_02 (Poly Haven : 3 m) — agrandie de moitié, voir PG_COULEUR
  // (sur téléphone, 0,6 depuis la quatrième passe : un grain d'un ou deux pixels ne se lit pas sur un écran de six
  // pouces — c'est la patine et les grappes qui y portent l'enrobé ; à 0,75, de la caméra du match, sa neige était 1,7
  // fois plus contrastée que celle de main, 1,5 fois à 0,6)
  grain: MOBILE ? 0.6 : 0.65,    // force du grain de la photo (0 : la toile seule)
  relief: 1.5,           // force des normales de la photo
  ondulations: 1.0,      // force des ondulations (1 : ~1°)
  rasant: 0.09,          // brillance rasante (0,1 avant, sur l'enrobé fin d'asphalt_04)
  teinte: 1.15,          // force des teintes du masque (R)
  usure: 1.0,            // force de l'usure (B)
  // clarté de l'ensemble (1 : la toile dessinée telle quelle ; voir masquesPlateau, la teinte) — mesurée contre main aux six
  // vues (07/10) : à 1,03, le PC reste à ±3 % ; le téléphone, sans ondulations ni brillance des rustines, sortait 2 à 4 %
  // plus sombre que le PC : 1,06. (Quatrième passe : le grain moins regonflé éclaircit le PC de 2 % — 1,01 ; le cœur de
  // gomme, à l'ombre des platanes, assombrit les vues des paniers du téléphone — 1,07.)
  clarte: MOBILE ? 1.07 : 1.01,
  grainLoin: 0.25,       // gain du grain par niveau de mipmap (PG_COULEUR : le grain qui tient la distance ; plafonné)
  reliefLoin: 0.6,       // ... et des pentes de la photo
  polissage: 0.9,        // l'usure polit : rugosité x (1 - polissage x l'écart d'usure à la moyenne)
  grappes: MOBILE ? 0.3 : 0.22,   // force des grappes de gravillons (3 à 8 cm, PG_COULEUR)
  plafondGrain: 1.6,     // niveaux de mipmap au-delà desquels le grain n'est plus regonflé
  patineTel: 0.6,        // sur téléphone, la patine de 10 à 60 cm renforcée d'autant
  fondu: 1.0,            // part du gain du grain rendue quand un texel tombe sous le huitième de pixel
};

// LE MATÉRIAU DU PLAN D'ENROBÉ. `map` : la toile dessinée (bitumeParc), répétée par l'appelant ; `masq` : les masques
// (masquesPlateau, avec leurs userData : usure moyenne, flaques). `roughness`, `metalness` et `color` restent
// ceux que la météo pilote (js/weather.js, wetMats).
export function materiauPlateau(map, masq, LB, LZ) {
  const R = SOL_PLATEAU, P = photosGranulat(), D = masq.userData || {};
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.9, metalness: 0.0 });
  const v4 = (L, f) => Array.from({ length: 6 }, (_, i) => (L && L[i] ? f(L[i]) : new THREE.Vector4(-99, -99, 1, 0)));
  const u = {
    uPgGrain: P.uPgGrain, uPgNao: P.uPgNao, uPgMasq: { value: masq },
    uPgA: { value: new THREE.Vector4(1 / R.tuile, R.grain, R.relief, GRAIN_MOYEN) },
    uPgC: { value: new THREE.Vector4(R.rasant, 0, R.teinte, R.usure) },
    uPgE: { value: new THREE.Vector4(R.grainLoin, R.reliefLoin, R.polissage, R.ondulations) },
    uPgG: { value: new THREE.Vector4(R.grappes, R.plafondGrain, R.patineTel, R.fondu) },
    uPgRasK: RASANT, uPgDim: { value: new THREE.Vector4(LB, LZ, (D.usureMoy ?? 0.2) * R.usure, R.clarte) },
    uPgFl: { value: v4(D.flaques, (f) => new THREE.Vector4(f[0], f[1], f[2], f[3])) },
    uPgFr: { value: Array.from({ length: 6 }, (_, i) => (D.flaques && D.flaques[i] ? new THREE.Vector2(D.flaques[i][4], D.flaques[i][5]) : new THREE.Vector2(1, 0))) },
  };
  m.__solPlateau = u;
  if (!MOBILE) m.defines = { PG_PC: '' };
  m.onBeforeCompile = (sh) => {
    for (const k in u) sh.uniforms[k] = u[k];
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPosSol;\nvarying vec2 vUvSol;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvPosSol = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\nvUvSol = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + PG_ENTETE)
      .replace('#include <map_fragment>', PG_COULEUR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + PG_RUGO)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + PG_RELIEF)
      .replace('#include <aomap_fragment>', PG_RASANT + '#include <aomap_fragment>\n' + PG_AO);
  };
  m.customProgramCacheKey = () => 'sol-plateau-parc-5' + (MOBILE ? '-m' : '');
  return m;
}
// Le sol mouillé (js/weather.js le range dans scene.userData.wet), passé au shader à chaque image.
export function brancherPluie(mesh, scene) {
  const u = mesh.material.__solPlateau;
  if (u) mesh.onBeforeRender = () => { u.uPgC.value.y = scene.userData.wet || 0; };
}

// =====================================================================
//  LES FEUILLES MORTES DES BORDS (instances)
// =====================================================================
// Des feuilles PHOTOGRAPHIÉES (l'atlas de La Cage : ambientCG LeafSet028, CC0, seize feuilles palmées, comme celles des
// platanes), recourbées (une feuille sèche n'est jamais plate), DÉCOLORÉES vers le gris-beige des photos 602 et 603
// (au soir, à l'ombre des platanes, une feuille sèche sur l'enrobé est pâle, pas brune). Là où le vent les pousse :
// au pied du treillis des platanes (elles en tombent), au pied du mur, en lisière de la terre du pin, en congères dans
// les coins et contre la cage de hand, et quelques égarées sur le terrain — hors des zones de tir. Au printemps, trois
// fois moins. Un seul maillage instancié, sans ombre portée (une feuille à plat n'en fait pas qui se voie).
// `cadre` : { cx (repère du terrain 1 -> monde), XN, XBIT, ZE, ZO, profil (largeur de la terre du pin en x monde), t2, hz }.
let _matFeuilles = null;
function matFeuilles() {
  if (_matFeuilles) return _matFeuilles;
  const m = new THREE.MeshStandardMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
  m.visible = false;                                  // en attendant l'atlas (sinon : des carrés)
  const suf = MOBILE ? '_1k' : '';
  if (!CUISSON && typeof document !== 'undefined') {
    const charger = (url) => new Promise((ok, ko) => new THREE.TextureLoader().load(url, ok, undefined, ko));
    Promise.all([charger(TEX_CAGE + 'feuilles_mortes' + suf + '.webp'), charger(TEX_CAGE + 'feuilles_mortes_n' + suf + '.jpg')]).then(([c, n]) => {
      c.colorSpace = THREE.SRGBColorSpace; n.colorSpace = THREE.NoColorSpace; c.anisotropy = n.anisotropy = 4;
      m.map = c; m.normalMap = n; m.visible = true; m.needsUpdate = true;
    }).catch((e) => console.warn('[parc] atlas des feuilles mortes non chargé', e));
  }
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aCase;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        { vec2 cUv = ( uv + vec2( mod( aCase, 4.0 ), 3.0 - floor( aCase / 4.0 ) ) ) * 0.25;
        #ifdef USE_MAP
          vMapUv = cUv;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = cUv;
        #endif
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        // décolorées : 70 % vers leur gris, un peu éclaircies (gris-beige des photos 602 et 603)
        diffuseColor.rgb = mix( diffuseColor.rgb, vec3( dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) ) * vec3( 1.06, 1.0, 0.92 ), 0.7 ) * 1.2;`)
      .replace('#include <alphatest_fragment>', `#ifdef USE_MAP
        { vec2 tx = vMapUv * vec2( textureSize( map, 0 ) ); float mip = max( 0.0, 0.5 * log2( max( dot( dFdx( tx ), dFdx( tx ) ), dot( dFdy( tx ), dFdy( tx ) ) ) ) ); diffuseColor.a *= 1.0 + 0.2 * mip; }
        #endif
        #include <alphatest_fragment>`);
  };
  m.customProgramCacheKey = () => 'feuilles-plateau-parc';
  _matFeuilles = m;
  return m;
}
function feuilleRecourbee() {
  const g = new THREE.PlaneGeometry(1, 1, 2, 2);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, 0.44 * x * x + 0.06 * Math.pow(Math.abs(z) * 2, 2.2) + (z < 0 ? -0.03 * z : 0));
  }
  g.computeVertexNormals();
  return g;
}
export function feuillesPlateau(scene, cadre) {
  const { cx, XN, XBIT, ZE, ZO, profil, t2, hz } = cadre;
  const al = (a, b) => a + Math.random() * (b - a);
  // (07/10 : 420 et 180 au lieu de 300 et 140 — fin septembre, sous huit platanes, le plateau en a plus que ses rives)
  const N = Math.round((MOBILE ? 180 : 420) * (saisonParc() === 'printemps' ? 0.35 : 1));
  const geo = feuilleRecourbee(), cases = new Float32Array(N);
  geo.setAttribute('aCase', new THREE.InstancedBufferAttribute(cases, 1));
  const inst = new THREE.InstancedMesh(geo, matFeuilles(), N);
  const d = new THREE.Object3D(), c = new THREE.Color();
  // le plateau dans le repère du terrain 1 : du pied du mur (xa) à la fin de l'enrobé côté quai (xb)
  const xa = XN - cx(0), xb = XBIT - cx(0);
  // la lisière de la terre du pin en x1 (au-delà, la terre de terreCoin recouvre l'enrobé : rien n'y est posé)
  const lisiere = (x1) => ZO - profil(cx(x1));
  // les congères (repère du terrain 1, z ou « au bord de la terre » si null, rayon) : les deux coins des platanes, le
  // coin du mur côté pin, le pied de la cage de hand et le bout du banc blanc (au bord de la terre), un poteau des platanes
  const tas = [[xa + 0.4, -8.75, 0.9], [xb - 0.3, -8.75, 0.7], [xa + 0.4, null, 0.7], [-7.65, null, 0.8], [-3.6, null, 0.6], [-11.8, -8.8, 0.6]];
  // (hors des zones de tir : le vent ne les y laisse pas, les semelles les emportent)
  const enJeu = (x1, z) => [0, t2].some((xt) => Math.abs(x1 - xt) < 3 && Math.abs(z) > hz - 4.5 && Math.abs(z) < hz + 0.3);
  for (let i = 0; i < N; i++) {
    let x1 = 0, z = 0, enTas = false;
    for (let essai = 0; essai < 12; essai++) {
      const r = Math.random();
      enTas = false;
      if (r < 0.32) { x1 = al(xa, xb); z = ZE + 0.06 + Math.pow(Math.random(), 2) * 0.7; }               // treillis des platanes
      else if (r < 0.5) { x1 = xa + 0.06 + Math.pow(Math.random(), 2.2) * 0.6; z = al(ZE + 0.2, ZO - 1.2); }  // pied du mur
      else if (r < 0.68) { x1 = al(xa + 0.5, xb - 0.5); z = lisiere(x1) - Math.pow(Math.random(), 1.8) * 0.8; }   // lisière du pin
      else if (r < 0.86) {                                                                                    // congères
        const t = tas[Math.floor(Math.random() * tas.length)], a = al(0, 6.28), rr = t[2] * Math.sqrt(-Math.log(1 - Math.random() * 0.95)) * 0.5;
        x1 = t[0] + Math.cos(a) * rr; z = (t[1] === null ? lisiere(t[0]) - t[2] * 0.5 : t[1]) + Math.sin(a) * rr; enTas = true;
      } else { x1 = al(xa + 0.5, xb - 0.5); z = al(ZE + 0.5, ZO - 1); }                                       // égarées
      x1 = Math.max(xa + 0.05, Math.min(xb - 0.05, x1));
      z = Math.max(ZE + 0.05, Math.min(lisiere(x1) - 0.04, z));
      if (!enJeu(x1, z)) break;
    }
    const s = al(0.1, 0.19) * (Math.random() < 0.25 ? 0.6 : 1);
    d.position.set(cx(x1), 0.006 + (enTas ? al(0, 0.02) : 0), z);
    d.rotation.set(al(-0.12, 0.12), Math.random() * Math.PI * 2, al(-0.12, 0.12));
    d.scale.set(s, s * al(0.3, 1.4), s);
    d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
    cases[i] = Math.floor(Math.random() * 16);
    const v = al(0.75, 1.1); c.setRGB(v * al(0.97, 1.05), v, v * al(0.9, 1.0)); inst.setColorAt(i, c);
  }
  inst.instanceMatrix.needsUpdate = true; inst.instanceColor.needsUpdate = true;
  inst.castShadow = false; inst.receiveShadow = true;
  inst.computeBoundingSphere();
  inst.userData.nofuse = true;
  scene.add(inst);
  return inst;
}
