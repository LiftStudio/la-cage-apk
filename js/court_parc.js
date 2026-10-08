import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { COURT } from './config.js';
import { texCuite, texCuiteAppel, declarerOutils } from './tex_cuites.js';
import { Monde } from './monde.js';
import { geometrieDrapee } from './monde_sol.js';
import { mipmapsFeuillage } from './mipmaps_feuillages.js';
import { TELEPHONE } from './appareil.js';
import { materiauPlateau, masquesPlateau, brancherPluie, feuillesPlateau } from './parc/sol_plateau.js';

// =====================================================================
//  TERRAIN N°4 — LE PARC DE BÉCON, COURBEVOIE
//  Le plateau du parc, au bord de la Seine. Reconstitué d'après les photos envoyées par Haythem (22/09,
//  vers 19 h 40) et la vue aérienne de l'IGN.
//
//  LE PLATEAU RÉEL (analyse des cinq photos et de l'orthophoto IGN) : 30 m du mur de meulière au quai,
//  18,2 m du grillage du pin à celui des platanes, et DEUX petits terrains en travers, côte à côte, sans
//  une ligne au sol. Quatre paniers, tous sur les longs côtés :
//    - terrain 1, côté quai : une potence à grand panneau 1,80 x 1,05 à cadre noir côté pin (D2), un col de
//      cygne à panneau 1,80 x 1,05 et liseré bleu côté platanes (D1) ;
//    - terrain 2, côté mur : deux potences à petit panneau 1,20 x 0,90.
//  Entre les deux, contre le grillage du pin : la cage de hand et le banc blanc, sur la terre sous le pin.
//  Autour : le mur de soutènement (2,30 m) et ses trois bancs verts au nord, et à son bout côté pin l'escalier de cinq
//  marches qui monte au chemin entre lui et le grillage (photo du 07/10, voir ESCALIER) ; le rideau d'arbres taillés et
//  la haie côté quai, avec la route et la Seine deux mètres plus bas ; le pin parasol qui déborde au-dessus
//  du plateau côté pin ; la voûte des platanes, le stabilisé et le pavillon côté platanes.
//
//  Repère du jeu : l'axe des paniers est Z ; z+ = côté PIN, z- = côté PLATANES, x- = côté MUR, x+ = côté
//  QUAI. Le repère de three est direct : face au mur, la droite est z- (les platanes), comme sur la photo.
//  Le terrain du match est toujours à l'origine : 'parc' joue sur le terrain 1, 'parc2' sur le terrain 2
//  (tout le décor glisse alors de 16,1 m, voir PLATEAU).
// =====================================================================

const rnd = (a, b) => a + Math.random() * (b - a);
// (rnd sert à presque toutes les textures cuites : js/tex_cuites.js suit son empreinte, voir « LES OUTILS COMMUNS »)
declarerOutils({ rnd });

// LE PLATEAU, dans le repère du TERRAIN 1 (le terrain côté quai, à l'origine quand on joue dessus) :
// `mur` = distance de son axe au pied du mur de meulière, `quai` = au grillage du quai, `t2` = x de l'axe du
// terrain 2 (côté mur). Relevés sur l'orthophoto et les photos : 30 m du mur au quai, les axes des deux
// terrains à 16,1 m l'un de l'autre. js/config.js en déduit les enceintes de 'parc' et de 'parc2'.
const PLATEAU = { mur: 23.7, quai: 6.3, t2: -16.1 };
// DERRIÈRE LA CAGE, LE TREILLIS DU PIN EST OUVERT (photos 185623, 185625, 185626) : entre deux piquets verts, un
// panneau manque sur 1,9 m ; il ne reste que le filet fin, et l'on voit le talus nu et le couchant. Mesuré sur les
// photos, de 18 % à 80 % de la cage à partir de son montant côté quai ; centré sur la cage du jeu (x = -7,65), en x1.
const TROU_PIN = [-8.6, -6.65];
// L'ESCALIER DU BOUT DU MUR (photo de Haythem du 07/10/2026, 18 h 49, prise du plateau : tools/photos_reference/
// parc_escalier_2026-10-07/20261007_184901.jpg ; sa capture du jeu, jeu_avant.webp, montrait le coin FERMÉ — « tu as oublié
// de mettre l'escalier ») : le grillage du pin ne va PAS jusqu'au mur. Il s'arrête à un grand mât gris qui porte le filet,
// à 1,5 m de la face du mur, et entre les deux CINQ marches de béton montent du plateau au chemin du bout du mur. Repère du
// terrain 1 : `xM` le mât ; `xL` le limon de gauche (béton, de xL[0] à xL[1]) ; `xD` le bord du petit limon de droite,
// contre le mur, le long des trois marches du haut ; `z0` la première contremarche (au bord de l'enrobé) ; `n` marches de
// `h` sur un giron `g` ; `palier` : la profondeur du palier du haut. Le sol, derrière, est à +0,85 / +0,95 (MNT LiDAR
// recalé comme tools/parc/construire_monde.py) : cinq marches de 17 cm. Voir escalierMur.
// PLATEAU SEUL SEULEMENT, pour l'instant : au PARC ENTIER (js/parc/index.js), le monde (assets/parc/monde, gabarit
// rampe_est de tools/parc/gabarits.json) fait passer la rampe est À CET ENDROIT, à +1,9 m — son bord d'asphalte coupe en
// diagonale le haut de l'escalier, de (-23,65 ; 9,81) à (-22,3 ; 10,76) —, alors que le vrai chemin y est à +0,9 (LiDAR) :
// l'outil l'a relevée d'un mètre pour garder la pente de la boucle vélo sous 11 % (conception § 2.7). Cinq marches n'y
// mènent nulle part et s'enfoncent dans le talus ; le coin reste donc fermé au parc entier, comme avant, jusqu'à ce que
// le lot du coteau (Z10 / Z04) redescende la rampe à son coin. Voir coinOuvert.
// CE QU'IL FAUT AU MONDE (08/10, relevé pour l'équipe des données). Le sol du monde à x = -22,9 : 0,05 à z = 9,25,
// 0,91 à 9,75, 1,74 à 10, 1,80-1,87 au-delà ; le MNT raccordé : 0,74 à 0,88 de z = 10,5 à 14, un replat. Le haut
// de l'escalier, (-22,97 ; 10,33), est au bord de l'asphalte de la rampe, à +1,9 (1,71 m de sa trace, 1,35 côté mur ;
// demi-largeur 1,75) : aucun palier ni seconde volée n'y tient sans couper la rampe ou la boucle vélo, et le sol du
// monde (un maillage, js/monde_sol.js) recouvrirait des marches dessinées sous lui. Et la rampe ne peut pas descendre
// là à +0,9 avec son tracé : de +10,6 à son coin (-25 ; 11) il y a 81,5 m ; à 11 % au plus sur 4 m, elle y est au
// mieux à +1,64. Pour +0,9 au droit du haut de l'escalier (82,7 m), il lui en faut 88 : son tracé allongé de 5,5 m
// en amont (ce qui déplace aussi l'îlot, l'allée du mur, la pelouse et les copies de la trace dans
// js/parc/zones/z10_coteau_nord.js et z04_butte_pin.js), ou, sur la dizaine de mètres avant le coin, la pente vraie du
// MNT (14 %), ce morceau sorti du contrôle de la boucle vélo. Une fois la rampe à +0,9 : le gabarit
// { type: 'escalier', de: [-22.97, 9.10, 0], a: [-22.97, 10.33, 0.85], largeur: 1.26, marches: 5 }, puis
// tools/parc/construire_monde.py, et coinOuvert rend vrai. En attendant, sur PC : Options > Graphismes > Parc de
// Bécon > « Plateau seul » pour voir l'escalier.
const ESCALIER = { xM: -22.2, xL: [-22.44, -22.29], xD: -23.56, z0: 9.095, n: 5, h: 0.17, g: 0.3, palier: 0.6 };
// le coin du bout du mur est-il ouvert (l'escalier) ? Au plateau seul (monde plat), oui ; au parc entier, pas encore.
// (Lu pendant buildParc, une fois le monde installé ou remis à plat.)
const coinOuvert = () => Monde.plat;

const C = {
  bitume: '#7c7b7d',        // le liant de l'enrobé : gris neutre, un rien froid (photos 340, 341, 601) ; voir bitumeParc
  stabilise: '#c2ad86',     // le sable compacté sous les platanes
  // le vert des bancs de la Ville : un vert PÉTROLE, qui tire vers le bleu (photos 341, 600 à 602 : ~#304750 à
  // l'ombre, teinte 195°) — le vert bouteille d'avant (0x2f5348) les faisait passer pour des bancs de jardin anglais
  vertBanc: 0x2f4c56,
};
// (les couleurs des clôtures, des mâts et de la meulière sont dans cloturesParc et meuliereTexture)

export function buildParc(scene, K, variante = 1) {
  const { ENC } = K;
  // LE PLATEAU RÉEL : 30 m du mur au quai, 18,2 m du pin aux platanes, et DEUX petits terrains en travers,
  // côte à côte (relevés de l'analyse des photos et de l'orthophoto IGN). Tout est écrit dans le repère du
  // TERRAIN 1 (côté quai) ; le terrain 2 (côté mur) est à 16,1 m de lui vers x-. Quand on joue sur le
  // terrain 2, c'est tout le décor qui glisse de DX pour que ce terrain-là tombe à l'origine.
  //   XN = pied du mur, XS = grillage du quai (-0,1), ZO = grillage du pin (z+), ZE = grillage des platanes (z-).
  const XN = -ENC.X, XS = ENC.XP, ZO = ENC.Z, ZE = -ENC.Z;
  const DX = XN + PLATEAU.mur;
  const cx = (x) => x + DX;
  const XBIT = XS - 0.7;                 // l'enrobé s'arrête ici côté quai : bande de terre et bordure ensuite
  const X_T2 = cx(PLATEAU.t2);           // axe du terrain 2
  const X_T1 = cx(0);                    // axe du terrain 1
  // LE PARC EN ENTIER (js/parc/index.js, drapeau D8 de la conception) : quand il est installé, le monde n'est plus
  // plat AVANT que ce décor se construise. On garde alors le plateau et tout ce qui le borde (grillages, mur de
  // meulière, bancs, paniers, cage, talus et pin, platanes, rideau du quai), posés sur le relief ; on saute ce que le
  // parc entier remplace, et qui ne tiendrait pas sur le vrai relief : la pelouse de 300 m, le talus et le faux « parc
  // haut » à 5,30 m derrière le mur, le jardin supposé derrière le pin, le fond des platanes, le quai et la Seine
  // d'aujourd'hui (le quai sera remis à sa vraie place par le lot B1). Drapeau baissé : ENTIER est faux et rien ne
  // change, pas même l'ordre des tirages au hasard.
  const ENTIER = !Monde.plat;

  // ---------------------------------------------------------------
  //  1. LE SOL
  // ---------------------------------------------------------------
  const LB = XBIT - XN, LZ = ZO - ZE;
  // (07/10, demande de Haythem : « trop lisse, pas ouf ») L'ENROBÉ DU PLATEAU a son propre matériau (js/parc/sol_plateau.js) :
  // la toile dessinée (bitumeParc) garde la couleur, la photo d'un vrai enrobé à gravillons (asphalt_02, celle de La Cage)
  // donne le grain, le relief et la rugosité, et les masques du plateau (masquesPlateau, cuits) l'usure des zones de jeu,
  // la gomme sous les cercles, les taches, les auréoles des flaques séchées (07/10 au soir : plus de fissures ni de
  // rustines, « enlève les traces de fissure et les grosses traces rectangle », Haythem). Il ne
  // passe plus par le détail générique de js/surfaces_parc.js (asphalt_04, un enrobé si fin qu'il faisait un béton lisse).
  // L'ombre douce cuite au sol (planifierOcclusionSol, js/court.js) se pose toujours sur ce plan.
  const court = new THREE.Mesh(new THREE.PlaneGeometry(LB, LZ),
    materiauPlateau(bitumeParc(K.canvasTex), masquesPlateau(K.canvasTex, LB, LZ, PLATEAU.mur, PLATEAU.t2, Math.abs(K.COURT.HOOP_Z)), LB, LZ));
  court.material.map.repeat.set(LB / 4, LZ / 4);
  court.material.userData.solPlateau = true;
  brancherPluie(court, scene);
  // LA CLARTÉ DU PARC : un facteur sur le contraste local de l'étalonnage (js/fx.js : 0,25 en ultra et en extrême),
  // lu par l'étalonnage — 1 sur les terrains qui ne le posent pas. Ce terrain est un grand enrobé fin vu d'en haut :
  // mesuré le 30/09 en extrême, caméra TV, l'enrobé corrigé (bitumeParc) sortait encore à pleine clarté à 10,7-11,4
  // d'écart-type près des pieds (10 au plus) ; à 0,6, 9,5 à 10 près et 6,8 à mi-distance, comme la photo 601 (6,8 ;
  // avant tout le lot L4 : 10,4 et 13,4). À 0,8, 10,1-10,7 près.
  scene.userData.clarte = 0.6;
  court.rotation.x = -Math.PI / 2; court.position.set((XN + XBIT) / 2, 0, 0); court.receiveShadow = true; scene.add(court);
  // Les bords : la terre du côté du pin (étroite côté quai, un gros renflement entre les deux terrains, puis un
  // mètre jusqu'au mur), le liseré gris au pied du treillis des platanes, les feuilles, et les marques de l'enrobé
  // (plaques, usure, tag : voir bordsParc).
  // (bord mesuré sur la photo 42 : 0,88 m à x = -3,33, 1,63 à -4,77, 2,32 à -5,99 ; confirmé le 26/09 sur les photos
  // 185623 et 185625 recalées : 1,25 m à x = -4, plus de 1,7 m à -5,4. Le détail de la terre est dans terreCoin.
  // Vers le coin du quai (photos 1000051339 et 342), plus qu'une lisière de 18 cm au pied du grillage : l'enrobé va
  // presque jusqu'à la maille ; elle s'élargit d'x = -1 à -2,4 pour rejoindre les 40 cm d'avant)
  const profilPin = (x) => {
    const x1 = x - DX;                                   // repère du terrain 1
    if (x1 > -1) return 0.18;
    if (x1 > -2.4) return 0.18 + (-1 - x1) / 1.4 * 0.22;
    if (x1 > -4.9) return 0.4 + (-2.4 - x1) / 2.5 * 1.3;
    if (x1 > -9.9) return 1.7 + Math.sin(Math.PI * (-4.9 - x1) / 5) * 1.0;
    if (x1 > -11) return 1.7 - (-9.9 - x1) / 1.1 * 0.5;
    return 1.2;
  };
  // les débris épars sur tout le plateau : gravillons, bouts de feuilles, taches (photos 1000051600 à 602)
  debrisPlateau(scene, XN, XBIT, ZE, ZO, profilPin);
  // et les feuilles mortes photographiées des bords, des coins, de la lisière du pin (js/parc/sol_plateau.js) — hors de la
  // passe des normales de l'occlusion, comme les autres feuillages à trous (sinon, des carrés sombres)
  declarerFeuillage(scene, feuillesPlateau(scene, { cx, XN, XBIT, ZE, ZO, profil: profilPin, t2: PLATEAU.t2, hz: Math.abs(K.COURT.HOOP_Z) }));
  const bords = new THREE.Mesh(new THREE.PlaneGeometry(LB, LZ),
    new THREE.MeshStandardMaterial({ map: bordsParc(K.canvasTex, XN, LB, LZ, profilPin), transparent: true, roughness: 1, depthWrite: false }));
  bords.rotation.x = -Math.PI / 2; bords.position.set((XN + XBIT) / 2, 0.004, 0); bords.renderOrder = 1; bords.receiveShadow = true; scene.add(bords);
  // côté quai : la bande de terre gris-brun et la petite bordure de béton. Toutes deux continuent au-delà du coin
  // des platanes, dans le passage qui longe le grillage du quai (photos 1000051603 et 1000051340 : le grillage des
  // platanes s'arrête à 90 cm du quai, et la terre, la bordure et le grillage du quai filent vers le bosquet), puis
  // le long de toute l'esplanade, jusqu'au bout du grillage du quai (Z_FIN_QUAI, voir cloturesParc) ; la bordure
  // finit dix centimètres après son dernier piquet. La bande change de forme passé le coin : voir bandeQuai.
  const zB0 = Z_FIN_QUAI - 0.1, zB1 = ZO + 0.2;
  const matTerre = new THREE.MeshStandardMaterial({ map: terreQuai(K.canvasTex), roughness: 1 });
  matTerre.userData.surfaceParc = 'solForet';
  const bande = new THREE.Mesh(bandeQuai(cx, XBIT, XS, ZE, zB0, zB1), matTerre);
  bande.receiveShadow = true; scene.add(bande);
  // (parc entier : ce qui longe le grillage du quai — la bande, la bordure, le lierre, le grillage, sa haie — est posé
  // ensuite sur le vrai sol, voir draperQuai ; `surQuai` en garde la liste, `n0` compte ce que chaque appel ajoute)
  const surQuai = ENTIER ? [bande] : null;
  let n0 = scene.children.length;
  // la bordure de béton est AU PIED du grillage (photo 1000051603 : les piquets sont juste derrière), 15 cm, 8 de
  // haut, et le liseré de béton qui borde l'enrobé, affleurant : voir bordureQuai
  bordureQuai(scene, K, XS - 0.03, XBIT + 0.03, zB0, ZO, ZE);
  if (surQuai) surQuai.push(...scene.children.slice(n0));
  coinCaniveau(scene, K, XBIT, ZE, matTerre.map);
  n0 = scene.children.length;
  lierreQuai(scene, K, XS + 0.1, ZE);
  if (surQuai) surQuai.push(...scene.children.slice(n0));
  // la bordure de béton du côté du pin, au pied de sa maille, près du coin du quai (photos 39 et 1000051342)
  bordurePin(scene, K, cx, XS, ZO);

  // le parc tout autour : pelouse, allées de stabilisé
  const matHerbe = new THREE.MeshStandardMaterial({ map: pelouseParc(K.canvasTex), roughness: 1 });
  matHerbe.map.repeat.set(60, 60); matHerbe.userData.surfaceParc = 'herbe';
  // la pelouse s'arrête à la crête du talus du quai : au-delà, tout est en contrebas (route, Seine)
  const XCRETE = cx(10.8), LH = XCRETE - (DX - 150);
  // (parc entier : le sol à relief de js/monde_sol.js la remplace)
  if (!ENTIER) {
    const herbe = new THREE.Mesh(new THREE.PlaneGeometry(LH, 300), matHerbe);
    herbe.rotation.x = -Math.PI / 2; herbe.position.set(XCRETE - LH / 2, -0.03, 0); herbe.receiveShadow = true; scene.add(herbe);
  }
  // au-delà du talus du pin (z > 20) : le jardin du parc, voir jardinBecon()
  const matStab = new THREE.MeshStandardMaterial({ map: stabiliseTexture(K.canvasTex), roughness: 1 });
  matStab.userData.surfaceParc = 'gravier';

  // ---------------------------------------------------------------
  //  2. LES CLÔTURES
  // ---------------------------------------------------------------
  // LES OBSTACLES DU DÉCOR, pour le parc entier (lot A3) : ce qu'on ne traverse plus une fois sorti du plateau — les
  // trois grillages et leurs portillons, le grillage du haut du mur, les troncs qu'on garde (platanes, pin, rideau du
  // quai), la haie du quai. Chaque fonction qui les dessine les déclare ici, dans le repère du JEU (x + DX), avec les
  // mêmes cotes que le dessin : js/parc/index.js les passe au monde (js/monde_collisions.js) une fois buildParc fini.
  // Drapeau baissé (monde plat) : pas de liste, rien n'est déclaré, rien ne change. (Le plateau, lui, garde ses
  // obstacles d'aujourd'hui, reperes.obstacles : bancs, cage, poteaux.)
  scene.userData.obstaclesDecor = ENTIER ? [] : undefined;
  // Les trois grillages et leurs mâts, placés un par un d'après les photos 39 à 43 (voir cloturesParc)
  n0 = scene.children.length;
  cloturesParc(scene, K, cx, XN, XS, ZO, ZE);
  if (surQuai) surQuai.push(...scene.children.slice(n0));

  // ---------------------------------------------------------------
  //  3. LE MUR DE MEULIÈRE (le fond, côté nord), SES BANCS, LE TALUS
  // ---------------------------------------------------------------
  // Il ferme le plateau ; le long du bosquet, c'est le mur en ligne brisée de fondPlatanes() qui le prolonge ;
  // du côté du pin, il s'arrête un mètre après le grillage (photos du 28/09 : un bloc sous son chaperon).
  murMeuliere(scene, K, XN, ZE - 0.1, ABORDS.ZB - 0.3, matHerbe, { abords: true });
  // (parc entier : le talus et ce qui y pousse (fondMur) cèdent la place au vrai coteau, tools/parc/LISEZMOI.md § 9)
  if (!ENTIER) fondMur(scene, K, XN);
  // DERRIÈRE LUI (photos du 28/09, 17 h 17) : l'allée rouge au pied de sa face arrière, un mètre sous sa crête, le
  // grillage posé sur son chaperon, la fourche et l'îlot, la rampe est, le biais vers le chemin du jardin (abordsMur).
  // Au parc entier, le sol, l'allée et l'îlot viennent du relief et des zones Z10 et Z04 : il ne reste que le mur (son
  // parement arrière, son bout) et le grillage de son chaperon (murArriere).
  if (ENTIER) { const lot = lotPieces(); lot.poser(scene, new Set([murArriere(scene, K, cx, XN, ZE, lot, true)])); }
  else abordsMur(scene, K, cx, XN, ZE, matHerbe);
  // AU BOUT DU MUR, CÔTÉ PIN (photo du 07/10, 18 h 49) : le coin du plateau n'est pas fermé. Le grillage du pin s'arrête à
  // un grand mât gris, et cinq marches de béton montent entre lui et le mur jusqu'au chemin (voir escalierMur ; plateau
  // seul pour l'instant : voir ESCALIER)
  if (coinOuvert()) escalierMur(scene, K, cx, XN, matHerbe);
  // les trois bancs verts adossés, dossier à 11 cm du mur (z du centre, longueur)
  const BANCS_MUR = [[5.2, 2.1], [-0.2, 2.2], [-5.8, 2.35]];
  for (const [z, l] of BANCS_MUR) banc(scene, K, XN + 0.4, z, Math.PI / 2, C.vertBanc, l);

  // ---------------------------------------------------------------
  //  4. LES QUATRE PANIERS
  // ---------------------------------------------------------------
  // Relevés au pixel sur les photos 40, 41 et 42 (voir panierReel). Terrain 1 : D2, potence à grand panneau
  // 1,80 x 1,05 à cadre noir côté pin ; D1, col de cygne en tube rond et panneau 1,80 x 1,05 à liseré bleu
  // côté platanes. Terrain 2 : D3 et D4, potences à petit panneau 1,20 x 0,90 et long bras plat.
  const T1 = [
    { sgn: 1, type: 'potence', LB: 1.8, HB: 1.05, bas: 2.9, coude: 2.4, avance: 0.85, arrivee: 0.06, peinture: 'cadre',
      carre: [0.59, 0.45, 0.045, 0.1], etiquette: 2.16, boulons: true, filet: { L: 0.42, dechire: true } },
    { sgn: -1, type: 'cygne', LB: 1.8, HB: 1.05, bas: 2.93, pied: 0.6, peinture: 'bleu',
      carre: [0.59, 0.45, 0.035, 0.1], etiquette: 2.15, filet: { L: 0.42 } },
  ];
  // (D3, côté platanes, n'a PAS de cadre noir : photos 341, 601 et 602, un panneau blanc nu, chants clairs et carré
  // gris ; D4, côté pin, garde le sien)
  const T2 = [
    { sgn: -1, type: 'potence', LB: 1.2, HB: 0.9, bas: 2.95, coude: 2.5, avance: 1.1, arrivee: 0.07, peinture: 'nu',
      carre: [0.59, 0.45, 0.04, 0.08], etiquette: 2.1, filet: { L: 0.35 } },
    { sgn: 1, type: 'potence', LB: 1.2, HB: 0.9, bas: 2.95, coude: 2.5, avance: 1.1, arrivee: 0.07, peinture: 'cadre',
      carre: [0.59, 0.45, 0.04, 0.08], etiquette: 2.05, filet: { L: 0.42 } },
  ];
  const [jeu, decor, xDecor] = variante === 2 ? [T2, T1, X_T1] : [T1, T2, X_T2];
  for (const p of jeu) panierReel(scene, K, p, 0, true);
  K.installerPaniers(scene, Math.abs(COURT.BOARD_Z) - Math.abs(COURT.HOOP_Z), 0xcf3b2a);
  for (const p of decor) panierReel(scene, K, p, xDecor, false);

  // ---------------------------------------------------------------
  //  5. CÔTÉ PIN (z+) : la cage de hand, les bancs, le talus et ses arbustes, le pin parasol, le jardin
  // ---------------------------------------------------------------
  // LE COIN DE LA CAGE (photos du 26/09, 18 h 56, recalées sur la cage, le mât et le panier D2) : la cage collée
  // à la maille (cadre à z = 9,0) et, devant elle, dossier contre la cage, le banc BLANC à pieds de fonte, qui
  // regarde le terrain. Le 22/09 (photos 41 et 42) deux bancs verts l'entouraient ; le 26 il n'y en avait plus un
  // seul — là où ils étaient, de la terre et des mégots —, mais le 27/09 (photo 600) un banc vert est revenu contre
  // le grillage du pin, à côté du banc blanc, du côté du mur : on le garde. Sur place la cage est centrée en
  // x = -6,45 ; on la garde décalée d'un bloc vers le mur (-7,65), sinon son montant mordrait dans le coin du
  // terrain 1 (|x| < 5,5).
  const XG = cx(-7.65);                               // axe de la cage (réel : -6,45)
  const XB = XG - 0.8;                                // le banc blanc (même place relative que sur les photos)
  cageHand(scene, K, XG, ZO - 0.1, -1);
  banc(scene, K, XB, ZO - 0.5, Math.PI, 0xe9ecea, 1.9, { ecaille: true });
  affairesBanc(scene, XB, ZO - 0.5);                  // sur le banc et à son pied
  // le banc vert, dos au grillage, à 35 cm du banc blanc ; seulement quand on joue sur le terrain 1 (quand on joue
  // sur le terrain 2, tout le décor glisse de 16,1 m et il tomberait au milieu du terrain joué)
  const BANC_VERT = variante !== 2;
  if (BANC_VERT) banc(scene, K, cx(-10.8), ZO - 0.5, Math.PI, C.vertBanc, 2.1);
  // LA TERRE SOUS LE PIN : terre rouge-brun, aiguilles, brindilles, mégots, capsules et papiers (voir terreCoin)
  const matCoin = terreCoin(scene, K, cx, ZO, profilPin);
  // DERRIÈRE LE GRILLAGE DU PIN, pas une haie taillée : le talus de terre (de 0 à 1,48 m entre le grillage et
  // z = 20), un fouillis d'arbustes de 1 à 3,5 m avec une trouée derrière D2, le lierre au pied de la maille,
  // les filets tombés, et l'arbre léger à gauche du panier (voir vegetationPin).
  vegetationPin(scene, K, XN, XS, ZO, cx, matHerbe, XCRETE - LH, XCRETE);
  // LE PIN PARASOL : pied à (-8,1 ; 12,0) sur le talus, fourche vers 5 m, dôme de 5,5 à 14,3 m qui déborde
  // au-dessus du plateau ; la boîte de la caméra de diffusion reste vide (vérifié sommet par sommet).
  pinParasol(scene, K, cx);
  // (parc entier : son fût, Ø 0,90 m à hauteur d'homme, et ceux du saule et de l'arbre léger sur le talus ; les
  // arbustes du talus, de 1,4 m, sont des masses qu'on contourne)
  if (ENTIER) {
    const obs = scene.userData.obstaclesDecor;
    obs.push({ t: 'c', x: cx(-8.1), z: 12.0, r: 0.5, h: 5.0, qui: 'tous', type: 'arbre', source: 'pin parasol' });
    obs.push({ t: 'c', x: cx(4.0), z: SAULE_Z_ENTIER, r: 0.2, h: 2.6, qui: 'tous', type: 'arbre', source: 'saule' });
    obs.push({ t: 'c', x: cx(3.3), z: 11.8, r: 0.12, h: 2.6, qui: 'tous', type: 'arbre', source: 'arbre léger' });
    for (const [x1, z] of [[5.0, 10.9], [2.4, 10.95], [-4.8, 10.95]]) obs.push({ t: 'c', x: cx(x1), z, r: 0.55, h: 1.4, qui: 'tous', type: 'arbuste', source: 'arbustes du pin' });
  }
  // DERRIÈRE LE TALUS, LE JARDIN DU PARC (photos du 26/09) : pelouses en pente, allées rouges, bassin à trois
  // jets, ifs en cône, et au fond le mur de la grande terrasse avec son double escalier, ses lanternes et
  // son drapeau (parc entier : les vraies terrasses viennent des zones Z04 à Z06)
  if (!ENTIER) jardinBecon(scene, K, cx, XN);

  // ---------------------------------------------------------------
  //  6. CÔTÉ QUAI (x+) : haie, rideau d'arbres, allée, talus, route, le car, la Seine
  // ---------------------------------------------------------------
  // le rideau de mûriers-platanes (fûts en candélabre, feuillage collé au filet jusqu'à 5,3 m, qui s'arrête
  // en arrondi au coin du pin), la haie de troène d'un mètre et l'arbuste pourpre du coin (photos 39 et 43)
  tilleulsEnRideau(scene, K, cx);
  n0 = scene.children.length;
  haieQuai(scene, K, cx);
  arbustePourpre(scene, K, cx, 6.95, 7.4);
  if (surQuai) { surQuai.push(...scene.children.slice(n0)); draperQuai(surQuai, DX, ZE); }
  // le banc blanc, sur la bande de terre, tourné vers le terrain. x = 5,85 : ses pieds avant (patin à 0,30 m
  // de l'axe) restent à 5,55, hors du terrain 1 (|x| < 5,5) ; à 5,6 ils étaient à 5,30 et l'assise à 5,44.
  banc(scene, K, cx(5.85), 5.45, -Math.PI / 2, 0xe4e9ec, 2.1, { retrait: 0.33, fonte: 0x3a3c40 });
  // (parc entier : la promenade, le quai et la Seine reviennent à leur vraie place avec les zones Z03 et Z19)
  if (!ENTIER) lesQuais(scene, K, cx(7.3), matStab);

  // ---------------------------------------------------------------
  //  7. CÔTÉ PLATANES (z-) : le stabilisé, les platanes, le pavillon
  // ---------------------------------------------------------------
  const LS = cx(7.3) - XN;                           // jusqu'au début de l'allée du quai, pas plus loin
  // (parc entier : le même plan, drapé sur le relief de l'esplanade — de -0,3 à +0,4 m —, mêmes UV : js/monde_sol.js)
  const stab = new THREE.Mesh(ENTIER ? geometrieDrapee(XN, ZE - 40, XN + LS, ZE, 0.006) : new THREE.PlaneGeometry(LS, 40), matStab.clone());
  stab.material.map = matStab.map.clone(); stab.material.map.repeat.set(LS / 5, 8);
  // (sous la voûte, à l'ombre, le sable n'est pas beige : photo 40, #736b64, 0,81 de l'enrobé et saturation 0,14 ;
  // la texture dessinée en sortait à 1,14 et 0,26. Filtre gris sur ce seul plan : l'allée du quai garde le sien.
  // Il était trop bleu (0xb0b3dc) : le sable sortait mauve (rendu rp_340). Photos 1000051340, 602 et 603 : un
  // beige-gris CHAUD, #726660 à l'ombre (teinte 22 à 30°, saturation 0,10 à 0,16). Avec la texture reprise (feuilles
  // sombres), mesuré le 28/09 à l'ombre des platanes : 0xb0b6d0 donnait #71695e (35°, 0,17), trop jaune ; 0xb0b2d5
  // le ramène vers 22° et 0,15, entre d4 (25° et 0,161) et d6 (#6b615c, 20° et 0,14))
  stab.material.color.setHex(0xb0b2d5);
  if (!ENTIER) { stab.rotation.x = -Math.PI / 2; stab.position.set(XN + LS / 2, 0.006, ZE - 20); }   // (drapé : déjà en place)
  stab.receiveShadow = true; scene.add(stab);
  // au pied du treillis, côté stabilisé, les touffes d'herbe que le râteau n'atteint pas (photos 1000051340, 602, 603)
  herbesPiedPlatanes(scene, K, cx, ZE);
  // les platanes : un quinconce relevé sur les photos 40 et 41 — trois gros fûts crème seulement au premier
  // rang, contre le grillage, les autres plus loin, plus minces et plus sombres (voir piedsPlatanes)
  platanes(scene, K, piedsPlatanes(cx), cx);
  // LE FOND (photos 40 et 41) : le mur du bosquet en ligne brisée, sa grille et son talus, le pavillon, son
  // perron et son parvis, les haies et les arbustes, et les grands arbres qui débordent de la voûte (cèdre,
  // hêtre pourpre, feuillu qui jaunit) — parc entier : l'esplanade, la façade Charras et le coteau les remplacent
  if (!ENTIER) fondPlatanes(scene, K, cx, matHerbe);
  // (l'immeuble qui était posé en cx(-33,7), z = -62 dépassait au-dessus du coin du mur : sur les photos du 27/09, on
  // n'y voit que des arbres — enlevé)

  // ---------------------------------------------------------------
  //  8. AU LOIN, DERRIÈRE LE MUR : les arbres du parc qui monte, les immeubles du boulevard
  // ---------------------------------------------------------------
  // (posés sur le talus du mur : 2,35 m à son pied, +0,25 m par mètre, 5,30 m sur le parc haut)
  // Ce sont des TILLEULS (assets/parc/tilleul.glb), variés en taille et en orientation ; l'arbre générique du
  // kit (K.modelTree) reste en place tant que le modèle n'est pas arrivé, et pour de bon s'il ne vient pas.
  // (parc entier : ni ces tilleuls ni ces immeubles, posés sur le faux parc haut à 5,30 m ; les vrais arbres du coteau
  // viennent de arbres.bin au lot A5, les immeubles du boulevard du lot B11)
  const tilleuls = [];
  // (photos du 27/09 : par-dessus le mur on ne voit QUE des arbres, jusqu'au ciel — le bois du parc monte sur cent
  // mètres, orthophoto. Le deuxième rang, de 55 à 70 m, bouche les trous par où passaient les immeubles.)
  // (les deux premiers, en x = -28,7 et -31, montraient leurs fûts blancs nus juste derrière le mur, à la place du
  // cèdre pleureur et du hêtre pourpre des photos 600 et 601 (fondMur) : reculés d'une quinzaine de mètres)
  for (const [x, z, h, s] of ENTIER ? [] : [[-46, 14, 14, 5.5], [-47, 2, 13, 5], [-36, -2, 15, 6],
                              [-44, 6, 22, 7], [-48, -8, 24, 7.5], [-40, -18, 18, 6.5],
                              [-56, 16, 23, 8], [-58, -1, 25, 8], [-60, -16, 24, 8], [-66, 30, 22, 8], [-68, 8, 26, 8.5],
                              [-70, -30, 23, 8]]) {
    const y = Math.min(5.3, 2.35 + Math.max(0, -PLATEAU.mur - x - 0.45) * 0.25);
    const xa = cx(x) + rnd(-1, 1), za = z + rnd(-1, 1);
    const spot = K.modelTree(scene, xa, za, h * 0.85, s, { fat: rnd(0.9, 1.1), y });
    // (version légère au-delà de 33 m du terrain 1 — vingt du terrain 2 — : tous le sont désormais)
    if (spot) tilleuls.push({ x: xa, y: y - 0.05, z: za, h: h * 0.85 * (0.94 + 0.12 * alea(x, z)), rot: 6.283 * alea(x, z, 1),
      loin: x < -33, repli: [spot] });
  }
  if (!ENTIER) planter(scene, 'tilleul', tilleuls);
  // le vent des vrais arbres suit l'horloge du décor
  const animer = scene.userData.animate;
  scene.userData.animate = (t) => { VENT.value = t; if (animer) animer(t); };
  // (les deux qu'on voyait au-dessus du mur, face au plateau, sont enlevés : les photos n'en montrent aucun ; celui
  // de x = -90, z = -52 aussi : sur 341 et 602, au-dessus de la pelouse du talus, il n'y a que des arbres)
  // DERRIÈRE LA TERRASSE DU JARDIN (j5, j6) : l'immeuble moderne blanc, à droite du drapeau, dont on ne voit que les
  // derniers étages par-dessus la terrasse — dalles de balcon blanches, grands vitrages, hublots au dernier niveau
  // (facadeModerneTex). Et au loin côté platanes, un immeuble de pierre, derrière les arbres.
  if (!ENTIER) {
    const facades = { pierre: K.windowsTexture(8, 6, '#d2cabb', '#34414e', false), moderne: facadeModerneTex(K.canvasTex) };
    for (const [x, z, w, h, d, f] of [[-75, 34, 30, 14, 16, 'moderne'], [-75, -80, 30, 18, 16, 'pierre']]) {
      K.building(scene, cx(x), z, w, h, d, facades[f]);
    }
  }

  // ---------------------------------------------------------------
  //  9. REPÈRES DU TERRAIN
  // ---------------------------------------------------------------
  // Les bancs sont des places assises (js/game.js updateBancs). Chacun est une place à part : `rang` 99 =
  // pas de « rang au-dessus », la touche d'action relève. `x` = les hanches du joueur assis (le milieu de
  // l'assise), `sx`/`sz` = où il se relève, devant le banc et hors de sa boîte d'obstacle.
  const bancs = BANCS_MUR.map(([z, l]) => ({ x: XN + 0.36, z0: z - l / 2 + 0.4, z1: z + l / 2 - 0.4, y: 0.47, sx: XN + 1.25,
    fx: 1, fz: 0, rang: 99, nom: 'le banc' }));
  bancs.push({ x: cx(5.9), z0: 4.95, z1: 5.95, y: 0.47, sx: cx(5.1), fx: -1, fz: 0, rang: 99, nom: 'le banc blanc' });
  // (le banc blanc de la cage : la place libre est côté mur, les affaires sont côté quai)
  bancs.push({ x: XB - 0.45, z0: ZO - 0.45, z1: ZO - 0.45, y: 0.47, sx: XB - 0.45, sz: ZO - 1.15, fx: 0, fz: -1, rang: 99, nom: 'le banc blanc' });
  // (le banc vert du pin, à côté : terrain 1 seulement)
  if (BANC_VERT) bancs.push({ x: cx(-10.8) - 0.45, z0: ZO - 0.45, z1: ZO - 0.45, y: 0.47, sx: cx(-10.8) - 0.45, sz: ZO - 1.15, fx: 0, fz: -1, rang: 99, nom: 'le banc' });
  // OBSTACLES : ce qu'on ne traverse pas en balade, et sur quoi la balle rebondit (`h` = hauteur).
  const obstacles = [
    ...BANCS_MUR.map(([z, l]) => ({ box: true, x: XN + 0.4, z, hx: 0.3, hz: l / 2, pad: 0.12, h: 0.9 })),
    { box: true, x: cx(5.85), z: 5.45, hx: 0.3, hz: 1.05, pad: 0.12, h: 0.9 },
    { box: true, x: XB, z: ZO - 0.53, hx: 0.95, hz: 0.24, pad: 0.12, h: 0.9 },            // banc blanc de la cage
    ...(BANC_VERT ? [{ box: true, x: cx(-10.8), z: ZO - 0.53, hx: 1.05, hz: 0.24, pad: 0.12, h: 0.9 }] : []),   // banc vert du pin
    // la cage : deux montants et la barre (la balle passe dessous, entre les poteaux)
    { x: XG + 1.54, z: ZO - 0.1, r: 0.06, pad: 0.12, h: 2.05 },
    { x: XG - 1.54, z: ZO - 0.1, r: 0.06, pad: 0.12, h: 2.05 },
    // les poteaux des quatre paniers (le fût d'une potence s'arrête au coude, le col de cygne quitte l'aplomb
    // de son pied au-dessus de 2,3 m)
    ...[[X_T1, T1], [X_T2, T2]].flatMap(([x, t]) => t.map((p) => obstaclePoteau(x, p))),
  ];
  // Ce que le jeu doit savoir d'un terrain dont les grillages touchent presque les lignes (js/game.js,
  // js/ball.js) :
  //  - camTV : la caméra de diffusion se met du côté où il y a de la place. Terrain 1 : entre les deux
  //    terrains (x-), le grillage du quai est à 80 cm de la touche ; terrain 2 : de l'autre côté (x+), le mur
  //    est à 2 m ;
  //  - remiseX : les poteaux des paniers sont DANS le terrain, la remise depuis la ligne de fond se fait à côté ;
  //  - borneCam : la caméra de balade ne passe pas derrière les grillages ;
  //  - grillage : la balle rebondit dessus (sinon elle filait dans la haie, hors d'atteinte).
  // hauteurs : le mur (2,3 m, le talus derrière), le filet du quai (4,9 m, sa lisse de tête : voir
  // cloturesParc), le treillis des platanes SANS filet au-dessus (2,05 m), le filet du pin (5,1 m)
  const grillage = { xMin: XN + 0.12, xMax: XS + 0.1 - 0.12, zMin: ZE - 0.1 + 0.12, zMax: ZO + 0.1 - 0.12, h: 5.0,
    hx0: 2.4, hx1: 4.9, hz0: 2.05, hz1: 5.1 };
  scene.userData.reperes = { sansMarchand: true, bancs, obstacles, camTV: variante === 2 ? 1 : -1, remiseX: 1.4,
    borneCam: true, grillage, plateau: variante };
  // L'AMBIANCE DES PHOTOS. Deux séries : le 22/09 à 19 h 38 (soleil couché derrière le pin) et le 26/09 à
  // 18 h 56 (soleil bas et doré qui passe à travers le pin, en contre-jour). Dans les DEUX, tout le plateau est
  // à l'ombre, sans une ombre portée, sous un ciel pâle ; ce qui les distingue, c'est l'or sur le haut des
  // arbres d'en face et la lueur entre les branches du pin. Le « beau temps » du parc est donc cette fin de
  // journée (18 h 56), qui rend aussi la série de 19 h 38 :
  //  - LE SOLEIL est bas (5°) et vient du pin (z+, un peu vers le mur) : le pin, le talus et ses arbustes
  //    ombragent tout le plateau, il ne reste de lui que l'or sur les platanes, le haut du rideau du quai et
  //    les fûts, la lueur derrière le pin et les rayons quand on regarde de ce côté ;
  //  - LE CIEL qui éclaire tout le reste : une vraie carte HDR (js/court.js carteHDR, préréglages haute et
  //    plus), tournée pour que sa lueur tombe derrière le pin, et ramenée au gris par la balance des blancs
  //    comme sur les photos. En basse et en moyenne, l'hémisphère prend le relais (`hemiSansEnv`) ;
  //  - LE CIEL AFFICHÉ est peint (cielSoir) : bleu pâle, blanchi vers l'horizon, doré du côté du soleil. Le bleu
  //    profond et les cumulus de midi faisaient un autre lieu, et la carte HDR (1K, une berge de Berlin) serait
  //    floue en fond et montrerait la tour de la télévision ;
  //  - l'étalonnage : un peu moins saturé et presque sans vignette, comme les photos.
  // MESURÉ (poses recalées des photos 40, 42 et 43, préréglage haute, luminance sRGB médiane) : enrobé 126 / 121 /
  // 123 pour 127 / 99 / 182 sur les photos (leur exposition varie, le jeu non) ; platanes 135 pour 135 ; ciel 216 /
  // 225 pour 220 / 219 ; haies et feuillages au même rapport à l'enrobé que sur les photos (0,6 à 0,8). Avant :
  // enrobé 77 à 79, ciel bleu profond à 58, feuillages deux fois trop saturés. En moyenne (sans carte), l'enrobé
  // tombe à 2 % de la haute ; couvert et pluie : 111 et 83 en haute, 111 et 82 en moyenne.
  // LE CALAGE DU 30/09 (lot L7), après les lots de la vague 1 : l'enrobé a été éclairci de 25 % (L4, enrobé / panneau
  // 0,54 -> 0,64, celui de la photo 340) après que le feuillage avait été calé contre lui (L3). En extrême, le rideau du
  // quai était retombé à 0,44 fois l'enrobé vu de la caméra de match (0,50 à 0,58 visés, photos 343 et 185558), la
  // voûte des platanes à 0,77-0,90 (0,95 à 1,05, photo 340) et le massif du pin à 0,49 (0,55 à 0,63). En moyenne, sans
  // la carte du ciel (Radeon intégrée : js/fx.js envMoyenne), c'était l'inverse : mur des bancs 1,36 (1,1 à 1,2), rideau
  // 0,57-0,59 vu du match et 0,70 en balade, panneau trop blanc (enrobé / panneau 0,59), enrobé neutre (B - R 0, +4 en
  // extrême). Seules les INTENSITÉS bougent :
  //  - `transEnv`, `transSansEnv` 1,5 : la part du ciel transmise par tous les feuillages (js/weather.js, lue par
  //    materiauFeuilles au travers de CIEL_TRANSMIS), avec et sans la carte ;
  //  - sans carte, 36 % de l'hémisphère passe dans le remplissage levé à 85° (`versFill`, `elevFill` : l'enrobé garde sa
  //    lumière, les faces verticales et le dessous des feuillages en perdent), et la lumière du ciel bleuit un peu
  //    (`froidSansEnv`, rien sous la pluie). Le soleil garde sa couleur : la voûte est à 90-97° de teinte, au-dessus des
  //    85° en deçà desquels on l'aurait pâli (plan L7). (`versFill` 0,32 -> 0,36 à la relecture : à 0,32, le mur des
  //    bancs sortait encore à 1,20-1,25 en moyenne selon le tirage des pierres, au-dessus des 1,1 à 1,2 visés.)
  // MESURÉ (luminance sRGB rapportée à l'enrobé du même cadre, balade et caméra de match ; extrême / haute / moyenne,
  // avant entre parenthèses) :
  //  - parc : voûte 1,00 / 1,00 / 0,99 (0,77-0,90 / — / 0,87) ; rideau vu du match 0,52 / 0,51 / 0,53 (0,44 / — /
  //    0,57-0,59), en balade 0,62 / 0,63 / 0,64 (0,53 / — / 0,70) ; massif du pin 0,56 / 0,56 / 0,58 (0,49 / — / 0,58) ;
  //    mur des bancs 1,16 / 1,16 / 1,18 (1,15 / — / 1,36) ; enrobé / panneau 0,65 / 0,65 / 0,65 (0,64 / — / 0,59) ;
  //    B - R de l'enrobé +4 / +4 / +2 (+4 / — / 0) ; (la voûte dépend du tirage des couronnes, qui change à chaque
  //    chargement : de 0,93 à 1,05 en extrême selon le tirage, ciel masqué — à tirage égal, +14 % sur l'avant) ;
  //  - parc2, caméra de match : massif du pin 0,58 / — / 0,54 (0,53 / — / 0,49) ; mur 1,14 / — / 1,15 (1,15 / — / 1,34) ;
  //  - téléphone (moyenne, sans carte) : le haut de la caméra de match 0,64 fois l'enrobé (0,75), enrobé inchangé ;
  //  - couvert et pluie, moyenne : enrobé 119 et 79 (117 et 78), rideau 0,54 et 0,82 (0,59 et 0,87).
  const CALAGE_L7 = { transEnv: 1.5, transSansEnv: 1.5, versFill: 0.36, elevFill: 85 };
  // PLEIN JOUR (05/10/2026, PARC_JOUR) : un soleil d'après-midi, blanc chaud, qui éclaire le plateau à travers les
  // arbres ; moins de lumière du ciel, pour que les ombres se lisent. Le soleil couchant d'avant reste plus bas.
  const JOUR = PARC_JOUR ? { label: 'Plein jour', sun: 2.5, sunCol: 0xfff1dc, hemi: 0.22, envI: 0.8, sat: 1.0, flou: 1.0,
    rays: 0.15, courbe: 0.08, splitO: 0.14, tonO: 0x7f9cc4, splitL: 0.04, tonL: 0xffe2b8 } : {};
  scene.userData.meteo = {
    soleil: { label: 'Fin de journée', sun: 1.2, sunCol: 0xffc47e, hemi: 0.35, hemiSky: 0xe2e2e0, fog: 0xdfe3e2,
      fogNear: 60, fogFar: 300, cloud: 0.25, cirrus: 0.35, rays: 0.3, expo: 1.0,
      envI: 1.1, fillK: 0.3, hemiSansEnv: 3.1, sat: 0.92, vig: 0.1, ombre: 1, flou: 1.3,
      nuOmbre: 0,     // (photos du 22, 26 et 27/09 : pas un nuage)
      // l'or du couchant dans les lumières, le bleu du ciel pâle dans l'ombre du plateau. `splitL` 0,18 -> 0,06 (lot L7,
      // 30/09) : le virage des lumières s'appliquait d'abord au CIEL (tout ce qui dépasse 0,45 de luminance), et la bande
      // qu'on voit vers le pin, de 0 à 15° au-dessus des arbres, sortait crème (#e6e0d7, saturation 0,06) là où la photo
      // 342 est bleu pâle (#cbdbed). L'or du couchant est déjà dans `sunCol` et dans l'auréole ; les bleus sont en plus
      // protégés du virage (js/fx.js, lot L2).
      courbe: 0.06, splitO: 0.14, tonO: 0x7f9cc4, splitL: 0.06, tonL: 0xffc98a,
      ...CALAGE_L7, froidSansEnv: 0.1, ...JOUR },
    // (ombre : 1 partout — l'écran du pin doit rester opaque, sinon le soleil traverserait le plateau)
    nuages: { sun: 0.5, hemi: 0.8, envI: 0.95, fillK: 0.35, hemiSansEnv: 3.2, cloudCol: 0xc4ccd6, sat: 0.92, vig: 0.14, ombre: 1, flou: 2, nuOmbre: 0.4, nuCouv: 0.55,
      ...CALAGE_L7, froidSansEnv: 0.05 },
    pluie: { sun: 0.15, hemi: 1.0, envI: 0.9, fillK: 0.35, hemiSansEnv: 4.0, cloudCol: 0x959ca6, sat: 0.9, vig: 0.18, ombre: 1, flou: 2,
      ...CALAGE_L7 },
  };
  // `rot` : la lueur de la carte HDR est à l'azimut 0,782 (colonne 639 sur 1024) ; on la tourne derrière le pin
  // (azimut relevé sur les photos : la lueur du couchant est à 57° de x+ vers z+ sur la photo 42 (19 h 38), à 63-66°
  // sur 185623 et 185625 (18 h 56) — celui de DIR_CJ. L'ancien (-0,12 ; 1) la posait 35° trop vers le mur : l'auréole
  // sortait au milieu des arbustes derrière D2, et rien ne brillait par le coin du quai ni à travers la cage)
  // (PARC_JOUR : 45° au-dessus de l'horizon, venu du côté des platanes — essayé vu du dessus à quatre azimuts : celui-ci
  // jette les ombres des feuillages en taches sur le plateau, comme sur la capture de l'ancien parc de Haythem)
  const S = (PARC_JOUR ? new THREE.Vector3(-0.123, 0.707, 0.696) : new THREE.Vector3(0.405, 0.09, 0.904)).normalize(), azS = Math.atan2(S.z, S.x);
  scene.userData.lumiere = {
    soleil: S,
    // le ciel peint passe par la courbe ACES comme tout le reste : ses couleurs sont celles qui, multipliées par
    // `cielLum`, en ressortent aux teintes mesurées sur les photos (#c9daea à 30°, #dce9f4 au plus clair)
    ciel: cielSoir(K.canvasTex, azS),
    cielLum: 3.34,
    // Poly Haven « Spree Bank » (1K), CC0 : une berge de rivière un soir d'été, soleil derrière les arbres ;
    // `attente` = la carte uniforme du temps du chargement, `arbres` = voir js/court.js preparerHDR
    env: { url: 'assets/parc/ciel_berge.hdr', rot: 0.782 - azS, azS, blanc: [1.08, 0.97], attente: 0.6,
      arbres: { haut: 32, couleur: [0.045, 0.06, 0.04], jour: 0.35 } },
  };
  scene.userData.solsParc = [matStab, stab.material, matTerre, matCoin];
  // L'ÉCRAN DU PIN. Sur toutes les photos le plateau est à l'ombre d'un bout à l'autre, sans une tache de soleil.
  // Avec un soleil à 5°, la carte d'ombre est étirée onze fois le long de ses rayons : le pin et le talus y
  // devenaient une dentelle de texels, et le soleil passait par les trous — des taches dorées sur le mur, au pied
  // des bancs, qui clignotaient avec le vent. Un écran invisible, dressé face au soleil derrière le grillage du pin,
  // garantit l'ombre jusqu'à 4 à 5 m de haut sur tout le plateau (7,5 m à l'écran, qui s'abaissent de 9 cm par mètre
  // vers les platanes) et laisse au soleil le haut des platanes et du rideau du quai, comme sur la photo 602. Il
  // n'écrit ni couleur ni profondeur : l'image passe au travers. Pas de couche à part — three teste la couche des
  // ombres avec la caméra PRINCIPALE, un écran caché sur sa couche ne portait donc aucune ombre. Il est retiré de la
  // passe de normales de l'occlusion comme le feuillage (declarerFeuillage), sinon GTAO y voyait un mur.
  const Sh = new THREE.Vector3(S.x, 0, S.z).normalize();
  const ecran = new THREE.Mesh(new THREE.PlaneGeometry(42, 8.5),
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
  ecran.position.set(court.position.x + Sh.x * 17, 3.25, court.position.z + Sh.z * 17);
  ecran.lookAt(ecran.position.x + Sh.x, 3.25, ecran.position.z + Sh.z);
  ecran.castShadow = true; ecran.receiveShadow = false; ecran.frustumCulled = false;
  Object.assign(ecran.userData, { dynamique: true, nofuse: true, ombreToujours: true });
  // PARC ENTIER (lot A6, js/monde_ombres.js) : l'écran n'est plus un objet, mais une ZONE D'OMBRE FORCÉE — le même écran
  // (42 x 8,5 m, à la même place), calculé dans le shader et seulement dans une boîte autour du plateau (bords doux de
  // 2 m) : posé dans la scène, il jetait son ombre sur 80 m à travers l'esplanade et la promenade. La boîte (repère du
  // terrain 1) : le plateau, le rideau du quai et le premier rang des platanes, que l'écran mettait à l'ombre sur PV01 et
  // PV02 ; au-delà, ce sont les vrais arbres qui ombrent.
  // (PARC_JOUR : ni écran ni zone d'ombre forcée — le soleil de plein jour DOIT atteindre le plateau)
  if (PARC_JOUR) { /* rien */ }
  else if (!ENTIER) { scene.add(ecran); declarerFeuillage(scene, ecran); }
  else scene.userData.zoneOmbreForcee = { centre: ecran.position.toArray(), demiLargeur: 21, haut: 3.25 + 4.25, bas: 3.25 - 4.25,
    soleil: S.clone(), boite: [cx(-26), -22, cx(13), 12], bord: 2 };
  // la carte d'ombre du soleil est cadrée sur le plateau et ses abords (js/fx.js _cadrerOmbre), jusqu'à 24 m de haut :
  // l'or sur la cime des platanes (au parc entier, elle suit le joueur : js/monde_ombres.js)
  scene.userData.zoneOmbre = { min: [XN - 6, 0, ZE - 8], max: [XS + 6, 24, ZO + 6] };
  // Les ombres de contact (js/ombres_contact.js) : ici il n'y a plus de soleil sur le plateau, seulement le ciel, et
  // c'est la seule ombre qu'ont les joueurs et les bancs — leur seul ancrage au sol, dans tous les préréglages. Mais
  // les photos (1000051600 et 601, 20260926_185558) ne montrent sous les pieds qu'un voile collé à la semelle, le
  // bitume a la même valeur à 30 cm que plus loin ; sous l'assise d'un banc du mur, on devine encore les moellons
  // (0,4 à 0,45 fois l'enrobé), ce n'est pas un pavé noir. L'ancien réglage (0,6 / 2,3 / 0,5 / 2,0) laissait 1 à 5 %
  // du ciel entre les pieds (10e centile à 0,03-0,1 fois le sol), 0,7 fois le sol sous un ballon à 1 m de haut, et
  // 0,07 fois l'enrobé sous l'assise. `borne` : les joueurs et le ballon retirent au plus 55 % du ciel ; `expo` 3 et
  // `hContact` 10 cm : un bassin, des bras tendus, un ballon à plus d'un mètre ne comptent presque plus, seuls le bas
  // des jambes et les semelles font l'ombre ; `fixeOcclusion` 0,65 : le dessous des bancs. MESURÉ le 30/09 (parc et
  // parc2, extrême et moyenne, match TV et balade) : entre les pieds 0,74 à 0,88 fois le sol, 0,69 avec le ballon posé
  // contre un pied (10e centile 0,49 à 0,77), 0,94 à 0,99 à 50 cm, 0,98 à 0,99 sous un ballon à 1,1 m, 0,40 à 0,49
  // sous l'assise (0,43 en extrême, 0,45 en moyenne, pour les trois bancs).
  scene.userData.ombreContact = { contact: 0.5, occlusion: 1.2, borne: 0.55, hContact: 0.1, expo: 3, fixeContact: 0.35, fixeOcclusion: 0.65 };
  // la voûte ne borde les silhouettes que de peu : le ciel de basse et moyenne vaut 3,45 ici, 0,45 doublait le bord, et
  // 0,3 cernait encore d'un liseré gris les t-shirts et les jeans noirs (41 au bord pour 12 au milieu du dos)
  scene.userData.rimCiel = 0.15;
  // L'OMBRE DU CIEL AU SOL (js/court.js cuireOcclusionSol, lot L7 du 30/09). Le plateau est un fond de cuvette : sur la
  // photo 340, l'enrobé est de 15 à 25 % plus sombre côté rideau qu'au centre. L'horizon cherché à 2,2 m laissait la
  // carte à 1,00 partout au-delà de 2 m des bords. Rayon 5 m (16 pas), un troisième anneau de canopée à 5 m pour que
  // le rideau, la haie, le pin et ses arbustes (du feuillage : vus du ciel, pas comme des murs) se sentent à quelques
  // mètres, et la canopée à 0,65 (0,25 avant, quand elle ne voyait qu'à 3 m) ; la carte est normalisée sur le centre
  // du plan, qui reste à 1 — tout l'enrobé baissait sinon, alors qu'en basse et en moyenne il n'a que cette lumière.
  // MESURÉ (texture lue) : centre 1,00 ; pied du rideau 0,89 (0,96 avant), 0,92 à 1-2 m, 0,96 à 2-4 m ; pied du talus
  // du pin 0,60 / 0,78 / 0,90 à 0-1, 1-2, 2-4 m (0,67 / 0,89 / 0,99) ; pied du mur 0,57 (0,60), 0,89 à 2-4 m (1,00).
  scene.userData.occlusionSol = { rayon: 5, pas: 16, anneau: 5, normaliser: true };
  scene.userData.canopee = 0.65;
  // la part du ciel transmise par les feuillages, que la météo règle (transEnv, transSansEnv : voir plus haut)
  scene.userData.cielTransmis = CIEL_TRANSMIS;
  return { court };
}

// LES TEXTURES DU SOL DU PARC ENTIER (js/monde_sol.js, materiauSolParc) : les dessins du décor d'aujourd'hui, lus dans
// leurs images cuites — la pelouse du parc ; la terre du talus du pin (humus, aiguilles, feuilles mortes) pour le
// sous-bois ; la terre du quai (gravillons, feuilles sèches) pour la terre nue ; pour les massifs, la haie taillée du
// jardin (vert grisé, pousses bronze) piquée du massif orange et jaune de la terrasse (l'automne).
export function texturesSolParc(K) {
  return { herbe: pelouseParc(K.canvasTex), sousBois: terreTalusPin(K.canvasTex), terre: terreQuai(K.canvasTex),
    massif: feuillageIf(K.canvasTex, true, true), fleurs: massifFleurs(K.canvasTex, true) };
}

// LE CIEL D'UNE FIN DE JOURNÉE CLAIRE, pour le dôme du ciel (js/court.js domeCiel : l'image couvre la voûte du
// zénith à 9° sous l'horizon ; dôme non tourné, la colonne u regarde l'azimut π - 2πu). Les photos des deux
// soirs n'ont pas un nuage : bleu pâle en haut (#a8cae7 sur le panorama de 18 h 56), blanchi vers l'horizon
// (#c5e0f5 à 40° sur la photo 40, #dde3e4 au ras des arbres) et doré du côté où le soleil descend (photo 42 à
// gauche, lueur derrière la cage le 26/09). `azS` = azimut du soleil, atan2(z, x).
// LA BANDE BASSE (lot L7, 30/09). En jouant, on ne voit du ciel que la bande de 0 à 15-20° au-dessus des arbres, vers
// le pin (balade). Elle sortait crème et brûlée (#e6e0d7, saturation 0,06, luminance 225) : peinte trop claire (HOR et
// E10 multipliés par `cielLum` tombaient dans l'épaule de la courbe ACES, qui blanchit et désature tout ce qui passe
// 1) et dorée trop loin du soleil. Sur la photo 342, elle est bleu pâle (#c6d7f1 en haut, #dbe9f9 plus bas ; #cbdbed
// en moyenne, saturation 0,11 à 0,17), et seule la lueur au ras de l'horizon, à gauche, est dorée. D'où : HOR et E10
// plus sombres et plus bleus (sortis de l'épaule), le blanchiment vers le soleil vers un bleu très pâle (BLANC) et non
// plus vers l'horizon, l'or resserré (0,45 rad au lieu de 0,6), et E25 un peu plus bleu. MESURÉ (extrême, balade vers
// le pin, ciel isolé en masquant le dôme ; avant entre parenthèses) : le haut de la bande #cbd8e8, saturation 0,13,
// luminance 215 (#e4e0da, 0,04, 225) ; hors de la lueur #cdd8e4 (#e6e0d7) ; au ras des arbres, loin du soleil, un gris
// clair #dadadc, comme sur la photo (#dddcdc) ; la lueur garde son or (#e5dfda). En moyenne : #cad6e6, 0,12, 213.
function cielSoir(canvasTex, azS) {
  const cuite = texCuite(cielSoir, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(512, 128, (g, w, h) => {
    const img = g.createImageData(w, h), d = img.data;
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const ZEN = [66, 110, 190], E45 = [67, 136, 255], E25 = [78, 138, 255], E10 = [72, 124, 214], HOR = [96, 126, 178], OR = [219, 160, 105];
    const BLANC = [120, 145, 182];
    for (let y = 0; y < h; y++) {
      const el = 90 - (y + 0.5) / h * 99;                // élévation, en degrés
      const e = Math.max(0, el);
      const base = el > 45 ? mix(E45, ZEN, (el - 45) / 45) : el > 25 ? mix(E25, E45, (el - 25) / 20)
        : el > 10 ? mix(E10, E25, (el - 10) / 15) : mix(HOR, E10, e / 10);
      for (let x = 0; x < w; x++) {
        let dp = Math.abs(Math.PI - 2 * Math.PI * (x + 0.5) / w - azS) % (2 * Math.PI);
        if (dp > Math.PI) dp = 2 * Math.PI - dp;
        // le ciel blanchit largement du côté du soleil, et se dore au ras de l'horizon
        let c = mix(base, BLANC, 0.35 * Math.exp(-((dp / 1.2) ** 2)) * Math.exp(-e / 35));
        c = mix(c, OR, 0.8 * Math.exp(-((dp / 0.45) ** 2)) * Math.exp(-e / 12));
        const o = (y * w + x) * 4;
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
}

// =====================================================================
//  TEXTURES DU SOL
// =====================================================================
// L'ENROBÉ DU PLATEAU (photos 1000051600 à 602, prises au ras du sol le 27/09, et 185558) : un liant gris NEUTRE,
// ni bleu ni violet, semé de gravillons clairs de 1 à 3 mm, de quelques cailloux plus gros, de petits creux sombres là
// où un grain est parti, et de quelques chewing-gums. Au ras du sol, c'est un mouchetis blanc sur gris ; VU DEBOUT
// (photos 340, 341, 343 et 601, et la caméra du jeu), un enrobé lisse et fin, qui se fond de loin en un gris moyen
// uniforme : les gravillons y sont à peine posés (voir 2.). La tuile ne porte QUE ce grain : les taches (plaques,
// usure du jeu) et le tag sont dessinés une seule fois, à leur place, dans le calque des bords
// (bordsParc) — répétés tous les 4 m, ils revenaient en damier (les taches) ou en zigzags identiques (les
// craquelures), et leur quinconce violet-rose se voyait sur la photo d'ensemble du plateau.
// Toile de 2048 px pour 4 m (2 mm par pixel) sur ordinateur ; 1024 et quatre fois moins de grains sur téléphone.
// Pour tenir le temps de dessin (plus de 500 000 grains), les grains de même teinte et de même opacité partent en un
// seul tracé : une couleur et une opacité par paquet (globalAlpha), au lieu d'une chaîne de couleur par grain.
function bitumeParc(canvasTex) {
  const cuite = texCuite(bitumeParc, arguments, [C]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  // (sur téléphone, quatre fois moins de pixels et quatre fois moins de grains : la même densité par pixel. La toile
  // y finit à 512 px — canvasTex la réduit —, 8 mm par pixel : les gravillons, adoucis (`kA`), y feraient sinon des
  // pavés blancs d'un pixel au pied du joueur)
  const T = LEGER ? 1024 : 2048, n = (N) => Math.round(N * (LEGER ? 0.25 : 1)), kA = LEGER ? 0.62 : 1;
  return canvasTex(T, T, (g, w, h) => {
    g.fillStyle = C.bitume; g.fillRect(0, 0, w, h);
    // dessine `N` grains répartis en paquets : `teinte(u)` rend la couleur du paquet, `alpha` sa plage d'opacité,
    // `forme(x, y)` ajoute un grain au tracé courant. Les grains près d'un bord sont redessinés de l'autre côté
    // (la tuile se répète : pas de couture).
    const semer = (N, nT, nA, teinte, alpha, forme, marge) => {
      const parPaquet = Math.max(1, Math.round(N / (nT * nA)));
      for (let a = 0; a < nA; a++) for (let t = 0; t < nT; t++) {
        g.fillStyle = teinte((t + Math.random()) / nT);
        g.globalAlpha = alpha[0] + (alpha[1] - alpha[0]) * (a + 0.5) / nA;
        g.beginPath();
        for (let i = 0; i < parPaquet; i++) {
          const x = Math.random() * w, y = Math.random() * h;
          forme(x, y);
          if (marge && (x < marge || x > w - marge || y < marge || y > h - marge)) {
            for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) if (dx || dy) forme(x + dx, y + dy);
          }
        }
        g.fill();
      }
      g.globalAlpha = 1;
    };
    const rond = (r0, r1) => (x, y) => { const r = rnd(r0, r1); g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832); };
    // (LA TEINTE. Le liant est dessiné un rien CHAUD — rouge +1 à +2, bleu -2 à -3 — parce que la lumière du soir le
    // bleuit : le ciel qui l'éclaire et l'étalonnage, qui teinte les ombres de bleu. Dessiné neutre (#68686a, grain
    // en v, v, v + 1), il sortait à l'écran à B - R = +5, mesuré au ras du sol ; ainsi il sort gris, B - R = +0,4
    // (préréglage haute, œil adapté), comme sur les photos 600 à 602. L'ancien grain en v + 5 de bleu faisait tout le
    // violet de l'enrobé. Mesures au même endroit : médiane 105 pour 114 avant, p95/p5 1,79, 6,8 % de pixels clairs.)
    // (30/09, LOT L4 : le liant passe de #636160 à #7c7b7d, presque NEUTRE au dessin — B - R de +1 —, soit +2 à +4 à
    // l'écran en extrême, comme les photos 340, 341, 601 et 602, un rien plus froides que le jeu ; pas #706e73, qui
    // irait au violet. Et plus clair : l'enrobé sortait à 0,54 fois le panneau blanc à la vue de départ, pour 0,68
    // sur la photo 340 prise dans la même direction ; #6c6b6c, sans les gravillons blancs, n'en donnait que 0,55,
    // #777576 0,61.) (Relecture : #7e7b7d, deux points de rouge de plus, rapprochait l'extrême du gris mauve des photos
    // 340 et 341 — B - R de +4 à +3,2 —, mais sans carte d'environnement, en moyenne et sur téléphone, l'enrobé
    // repartait vers le jaune, B - R de -1,8 à -3,6 : on garde #7c7b7d.)
    // 1. le grain fin du liant : 400 000 éclats de 1 à 2,2 px, gris de 85 à 135 (de 70 à 125 sous l'ancien liant, plus
    //    sombre : sous le nouveau, ils piquaient l'enrobé de points noirs au pied du joueur)
    semer(n(400000), 14, 4, (u) => { const v = Math.round(85 + 50 * u); return `rgb(${v + 1},${v},${v - 3})`; }, [0.2, 0.6],
      (x, y) => g.rect(x, y, rnd(1, 2.2), rnd(1, 2.2)), 0);
    // 2. les gravillons clairs : 30 000 grains ronds de 0,6 à 1,5 px de rayon (1,2 à 3 mm), gris clair NEUTRE, à peine
    //    posés (15 à 35 %). (Ils étaient 85 000 à 45-80 %, un rien chauds, calés sur les photos 600 à 602 prises ASSISES
    //    au ras du sol : vu debout — photos 340, 341, 343 et 601 — ou de la caméra du match, l'enrobé est lisse et fin,
    //    et ce semis faisait un granito moucheté, écart-type 10,4 à mi-distance en extrême pour 6,8 sur la 601. Le grain
    //    vrai vient maintenant du détail photographique d'asphalt_04, js/surfaces_parc.js.)
    semer(n(30000), 8, 4, (u) => { const v = Math.round(170 + 45 * u); return `rgb(${v},${v},${v})`; },
      [0.15 * kA, 0.35 * kA], rond(0.6, 1.5), 2);
    // 3. quelques cailloux plus gros (2 à 4 px de rayon, 4 à 8 mm), moins blancs : 3 000 au lieu de 8 000
    semer(n(3000), 6, 3, (u) => { const v = Math.round(140 + 45 * u); return `rgb(${v},${v},${v - 1})`; },
      [0.5 * kA, 0.8 * kA], rond(2, 4), 5);
    // 4. les petits creux sombres où un grain s'est détaché
    semer(n(20000), 1, 1, () => 'rgb(38,38,40)', [0.5, 0.5], rond(0.6, 1.2), 2);
    // 5. LES CHEWING-GUMS (photos 1000051340 et 602) : des pastilles aplaties de 2 à 4 cm, noircies par les semelles
    //    pour la plupart, quelques-unes restées gris pâle ; un peu ovales et au bord plus doux que le cœur. Une douzaine
    //    par tuile de 4 m (la tuile est lue deux fois, tournée : voir `antiRepet`, js/surfaces_parc.js), à la même
    //    taille réelle sur téléphone (`mm` : pixels par millimètre de la toile).
    const mm = w / 4000;
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = rnd(10, 20) * mm, e = rnd(0.7, 1), a = Math.random() * 3.14;
      const pale = Math.random() < 0.25, v = pale ? rnd(135, 150) : rnd(48, 66);
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
        const px = x + dx, py = y + dy;
        if (px < -r || px > w + r || py < -r || py > h + r) continue;
        g.fillStyle = `rgba(${v | 0},${v | 0},${(v + 1) | 0},${pale ? 0.3 : 0.45})`;
        g.beginPath(); g.ellipse(px, py, r * 1.2, r * 1.2 * e, a, 0, 6.2832); g.fill();
        g.fillStyle = `rgba(${v | 0},${v | 0},${(v + 1) | 0},${pale ? 0.45 : 0.75})`;
        g.beginPath(); g.ellipse(px, py, r, r * e, a, 0, 6.2832); g.fill();
      }
    }
  }, [1, 1], false, 16);
  // (la répétition est posée par l'appelant)
}

// LE CALQUE DES BORDS ET DES MARQUES DU PLATEAU, transparent, posé sur l'enrobé et dessiné UNE fois (24 px par mètre,
// sans répétition : chaque chose y est à sa place). La toile couvre l'enrobé : son x va du pied du mur (x0) vers le
// quai, son y du grillage des platanes (en haut, z-) à celui du pin (en bas, z+).
//  - sur l'enrobé : de grandes plaques neutres à peine marquées, l'usure plus claire au milieu de chaque terrain et le
//    petit tag rose (photos 1000051340, 341, 602 ; les taches vivaient dans la tuile de 4 m de bitumeParc et revenaient
//    en quinconce violet-rose) ; plus la fissure colmatée de x = -5,7, retirée le 07/10 ;
//  - côté pin, la LISIÈRE de la terre du coin, dont la largeur suit `profilPin(x)` : sous le plan de terreCoin, qui la
//    recouvre, et au-delà sur 0,5 à 0,8 m, un voile de poussière gris clair — plus de halo brun ni de traîne
//    d'aiguilles (30/09) ; vers le coin du quai, le lierre qui rampe au pied du grillage ;
//  - au pied du mur, un liseré continu à peine plus sombre ; au pied du treillis des platanes, un liseré gris neutre ;
//  - le long du treillis des platanes, des feuilles de platane sèches, pâles et rares.
function bordsParc(canvasTex, x0, W, L, profilPin) {
  const cuite = texCuite(bordsParc, arguments, [PLATEAU], [W, L]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  const PX = 24, w = Math.round(W * PX), h = Math.round(L * PX);
  // passages entre la toile et le repère du terrain 1 (x1 = abscisse du terrain 1 ; z = 0 au milieu du plateau)
  const X1 = (x) => x / PX - PLATEAU.mur, XT = (x1) => (x1 + PLATEAU.mur) * PX, YT = (z) => h / 2 + z * PX;
  const t = canvasTex(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    // une tache de terre ou de poussière : `R`, `G`, `B` = plages de couleur, `s` = échelle de l'ellipse
    const tache = (x, y, a, R, G, B, s = 1) => {
      g.fillStyle = `rgba(${Math.floor(rnd(R[0], R[1]))},${Math.floor(rnd(G[0], G[1]))},${Math.floor(rnd(B[0], B[1]))},${a})`;
      g.beginPath(); g.ellipse(x, y, rnd(2, 9) * s, rnd(2, 7) * s, Math.random() * 3, 0, 6.29); g.fill();
    };
    // une plaque en dégradé radial, étirée en ellipse (`rx`, `ry` en pixels)
    const plaque = (x, y, rx, ry, couleur) => {
      g.save(); g.translate(x, y); g.scale(1, ry / rx);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      gr.addColorStop(0, couleur); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(-rx, -rx, 2 * rx, 2 * rx); g.restore();
    };
    // 4. CÔTÉ PIN, LA LISIÈRE DE LA TERRE (photos 1000051341, 342, 185623 et 1856230), posée la première, pixel par
    //    pixel (la toile est encore vide) : tout le reste passe par-dessus. Sur la photo 341, la terre ne déborde pas sur
    //    l'enrobé en frange brune et sombre : l'enrobé qui la borde est POUDRÉ, un voile de poussière gris clair (0,05 de
    //    saturation, 1,1 fois l'enrobé voisin) qui s'efface sur 0,5 à 0,8 m. Ici : un voile rgba(158,146,138) — le gris
    //    rosé de rgba(140,128,120), éclairci comme le liant (#7c7b7d) : plus sombre, il ne se distinguait plus de lui —,
    //    continu, de 26 à 40 % au bord de la terre selon l'endroit (bruit lent le long du grillage, et des plaques de
    //    60 cm), qui s'efface ensuite sur 0,5 à 0,8 m — moins loin au coin du quai, où la bande n'a plus que 18 cm ; au
    //    milieu de sa portée, il n'est plus qu'à 8-20 %. (À 8-22 % dès le bord, on ne le voyait pas : la lisière sortait à
    //    0,9 fois l'enrobé, la terre passait sans transition à l'enrobé.) Sous la terre, le même voile : c'est lui qui se
    //    voit par les trous et dans les plaques tassées du plan de terreCoin (qui va maintenant jusqu'au mur : la terre
    //    n'est plus dessinée ici).
    //    (Avant : 6 300 taches brunes de 8 à 40 cm à 20-50 %, plus sombres que l'enrobé, et une traîne de 2 800 traits
    //    d'aiguilles rousses de 17 à 42 cm sur 4 : un halo d'huile rayé, 0,88 fois l'enrobé, saturation 0,22.)
    {
      const img = g.createImageData(w, h), d = img.data, lisse = (t) => t * t * (3 - 2 * t);
      // bruits de valeur : le long du grillage (un point tous les 1,5 m) et en plaques (cellules de 0,6 m)
      const n1 = Math.ceil(W / 1.5) + 3, gA = Float32Array.from({ length: n1 }, Math.random), gF = Float32Array.from({ length: n1 }, Math.random);
      const b1 = (G, t) => { const i = Math.floor(t), f = lisse(t - i); return G[i] + (G[i + 1] - G[i]) * f; };
      const NX = Math.ceil(W / 0.6) + 3, NY = Math.ceil(L / 0.6) + 3, gP = Float32Array.from({ length: NX * NY }, Math.random);
      const b2 = (u, v) => {
        const i = Math.floor(u), j = Math.floor(v), fu = lisse(u - i), fv = lisse(v - j), q = (a, b) => gP[b * NX + a];
        return (q(i, j) * (1 - fu) + q(i + 1, j) * fu) * (1 - fv) + (q(i, j + 1) * (1 - fu) + q(i + 1, j + 1) * fu) * fv;
      };
      // (relecture L4) et des plaques plus petites, de 0,3 m, pour le bord extérieur du voile
      const NX3 = Math.ceil(W / 0.3) + 3, gQ = Float32Array.from({ length: NX3 * (Math.ceil(L / 0.3) + 3) }, Math.random);
      const b3 = (u, v) => {
        const i = Math.floor(u), j = Math.floor(v), fu = lisse(u - i), fv = lisse(v - j), q = (a, b) => gQ[b * NX3 + a];
        return (q(i, j) * (1 - fu) + q(i + 1, j) * fu) * (1 - fv) + (q(i, j + 1) * (1 - fu) + q(i + 1, j + 1) * fu) * fv;
      };
      // (le plan de terreCoin va jusqu'à 1,06 fois `profilPin`, plus 25 cm de frange mitée : le voile garde toute sa
      // force jusque-là, `B`, puis s'efface sur sa portée `F`)
      // (relecture L4 : la portée varie aussi d'un endroit à l'autre, de 0,55 à 1,45 fois, par plaques de 30 cm, et le
      // voile s'y fait pommelé en s'effaçant. D'une portée égale partout, son bord extérieur suivait celui de la terre
      // à distance fixe, en auréole claire bien dessinée ; sur la photo 341, la poussière s'éparpille sur l'enrobé.
      // Sa couleur ne bouge pas : plus chaude, 161 / 147 / 135, la lisière montait à 0,08 de saturation en extrême et à
      // 0,11 en moyenne, au-delà des 0,08 de la photo 341.)
      for (let x = 0; x < w; x++) {
        const xm = (x + 0.5) / PX, larg = profilPin(x0 + xm) * PX, B = larg * 1.06 + 0.25 * PX;
        const A = 0.26 + 0.14 * b1(gA, xm / 1.5);                                     // le voile au bord de la terre
        const F = (0.5 + 0.3 * b1(gF, xm / 1.5)) * PX * Math.min(1, Math.max(0.5, larg / (0.6 * PX)));   // sa portée
        for (let dd = 0; dd < h; dd++) {
          const e = dd + 0.5;                                    // distance au grillage du pin, en pixels
          if (e > B + 1.45 * F) break;
          const p = b2(xm / 0.6, e / PX / 0.6), q = b3(xm / 0.3, e / PX / 0.3), Fq = F * (0.55 + 0.9 * q);
          const f = e < B ? 0 : Math.min(1, (e - B) / Fq);      // 0 au bord de la terre, 1 au bout de la portée
          const a = A * (1 - lisse(f)) * (0.8 + 0.4 * p) * (1 - 0.5 * f * (1 - q));
          const o = ((h - 1 - dd) * w + x) * 4, t = (p - 0.5) * 10;
          d[o] = 158 + t; d[o + 1] = 146 + t; d[o + 2] = 138 + t; d[o + 3] = Math.round(Math.min(0.45, a) * 255);
        }
      }
      g.putImageData(img, 0, 0);
    }
    // 1. LES TACHES DE L'ENROBÉ, neutres et très douces (5 %) : dix grandes plaques de 1,5 à 4 m de rayon, reprises
    //    plus sombres ou plus claires, et l'usure du jeu, plus claire, en ellipse de 6 x 10 m (la grande longueur dans
    //    l'axe des paniers) au milieu de chacun des deux terrains
    for (let i = 0; i < 10; i++) {
      const r = rnd(1.5, 4) * PX;
      plaque(Math.random() * w, Math.random() * h, r, r * rnd(0.6, 1), Math.random() < 0.5 ? 'rgba(60,60,62,0.05)' : 'rgba(150,150,148,0.05)');
    }
    for (const x1 of [0, PLATEAU.t2]) plaque(XT(x1), YT(0), 3 * PX, 5 * PX, 'rgba(160,160,158,0.04)');
    // (2. LA FISSURE COLMATÉE qui traversait le plateau vers x = -5,7, du grillage des platanes à celui du pin, une bande
    //    claire et sinueuse de 8 à 12 cm : retirée le 07/10 avec toutes les fissures du plateau, voir js/parc/sol_plateau.js,
    //    la cinquième passe.)
    // 3. LE TAG (photos 1000051340 et 341) : au milieu du plateau, à x = -1,8, z = 0,8. Sur les deux photos, une grappe
    //    serrée de 50 cm sur 30 : cinq ou six coups de bombe à peu près parallèles, de 20 à 45 cm, larges de 2 à 3 pixels
    //    (8 à 12 cm), d'un rose beige DÉLAVÉ, à peine plus clair que l'enrobé et presque sans couleur (saturation 0,05
    //    sur la zone), deux traits fins plus sombres, et un brouillard de peinture très léger autour. (Avant : des traits
    //    rose vif de 15 à 30 cm à 70 %, sur une toile de 4 cm par pixel : une pastille rose, 1,33 fois l'enrobé. Des
    //    traits de 30 à 60 cm en tous sens, rose clair à 35 %, faisaient une croix ; mauve sombre, une tache.)
    {
      const tx = XT(-1.8), ty = YT(0.8), a0 = rnd(-0.4, 0.4);
      for (let i = 0, nT = 5 + Math.floor(Math.random() * 2); i < nT; i++) {
        const l = rnd(0.2, 0.45) * PX, a = a0 + rnd(-0.3, 0.3), x = tx + rnd(-0.15, 0.15) * PX, y = ty + rnd(-0.12, 0.12) * PX;
        g.lineWidth = rnd(2, 3);
        g.strokeStyle = `rgba(154,138,144,${rnd(0.28, 0.36).toFixed(2)})`;
        g.beginPath(); g.moveTo(x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2);
        g.quadraticCurveTo(x + rnd(-2, 2), y + rnd(-2, 2), x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2); g.stroke();
      }
      g.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const l = rnd(0.25, 0.4) * PX, a = a0 + rnd(-0.2, 0.2), x = tx + rnd(-0.1, 0.1) * PX, y = ty + rnd(-0.1, 0.1) * PX;
        g.strokeStyle = 'rgba(92,84,88,0.25)';
        g.beginPath(); g.moveTo(x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2); g.lineTo(x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2); g.stroke();
      }
      for (let i = 0; i < 60; i++) {
        const r = Math.pow(Math.random(), 0.7) * 0.35 * PX, u = Math.random() * 6.28;
        g.fillStyle = 'rgba(154,138,144,0.12)';
        g.fillRect(tx + Math.cos(u) * r, ty + Math.sin(u) * r * 0.7, 1, 1);
      }
    }
    g.lineWidth = 1;
    // (4. CÔTÉ PIN, LA LISIÈRE : posée pixel par pixel avant tout le reste, voir plus haut)
    // le lierre qui rampe au sol contre le grillage, vers le coin du quai (x1 > 2) : des taches vert sombre
    g.fillStyle = 'rgba(70,85,60,0.5)';
    for (let i = 0; i < 260; i++) {
      const x = XT(rnd(2, X1(w))), d = Math.pow(Math.random(), 2) * 0.15 * PX;
      g.beginPath(); g.ellipse(x, h - d, rnd(1, 4), rnd(0.8, 3), Math.random() * 3, 0, 6.29); g.fill();
    }
    // 5. PIED DU MUR (x = 0) : l'enrobé va jusqu'aux moellons, UNI (photo 601) : seulement un liseré continu, un rien plus
    //    sombre contre la pierre (0,94 fois l'enrobé) et qui s'efface sur 30 cm. (Avant : des ellipses claires et
    //    sombres de 6 à 28 cm, étirées au rendu en taches molles de la taille des moellons — des auréoles d'eau.)
    {
      const gr = g.createLinearGradient(0, 0, 0.3 * PX, 0);
      gr.addColorStop(0, 'rgba(36,33,30,0.08)'); gr.addColorStop(0.5, 'rgba(36,33,30,0.03)'); gr.addColorStop(1, 'rgba(36,33,30,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 0.3 * PX, h);
    }
    // 6. PIED DU TREILLIS DES PLATANES (y = 0 ; photos 1000051340, 602, 603) : un liseré de 25 cm gris neutre — la
    //    poussière du stabilisé —, pas brun ; les touffes d'herbe sont de l'autre côté (herbesPiedPlatanes)
    for (let i = 0; i < w * 2; i++) {
      const d = Math.pow(Math.random(), 2) * 0.25 * PX;
      tache(Math.random() * w, d, rnd(0.15, 0.35), [96, 110], [90, 100], [88, 96], 0.6);
    }
    // 7. LE LONG DU TREILLIS DES PLATANES, à moins de 60 cm (photos 39 et 43 : au-delà l'enrobé est propre) : des
    //    feuilles de platane sèches, PÂLES et rares (photos 602 et 603 : gris-beige, à peine plus clair que l'enrobé ;
    //    les bruns d'avant faisaient un tapis de feuilles mortes). Plus rien au pied du mur (photo 601 : l'enrobé y est
    //    uni ; à 4 cm par pixel ces feuilles y faisaient des taches pâles et floues), ni côté pin : ses traits d'aiguilles
    //    de 17 à 34 cm sur 4 étaient des rayures — les aiguilles sont dans terreCoin, à 256 px par mètre. Rien côté quai :
    //    la toile s'y arrête 70 cm avant le grillage.
    for (let i = 0; i < (w + h) * 1.38; i++) {                  // (autant de feuilles qu'avant de ce côté)
      const x = Math.random() * w, y = Math.pow(Math.random(), 2.2) * 0.6 * PX;
      g.save(); g.translate(x, y); g.rotate(Math.random() * 3.14);
      g.fillStyle = i % 2 ? '#7a7064' : '#8a7e6c'; g.globalAlpha = rnd(0.2, 0.45);
      g.beginPath(); g.ellipse(0, 0, rnd(1.4, 3.2), rnd(0.9, 2), 0, 0, 6.29); g.fill(); g.restore();
    }
    g.globalAlpha = 1;
    // 8. (07/10, « plus de détails ») LA CRASSE DES RIVES, là où personne ne marche : au pied du mur, dans l'angle avec
    //    les moellons, des traînées brun-gris (#4e4740, photos 1000051340 et 343) ; au pied du treillis des platanes, la
    //    terre noire tassée autour des piquets. (La MOUSSE n'est plus ici : à 24 px/m, ses coussinets sortaient en un
    //    voile flou vert-gris ; elle est dans les masques du plateau, à 48 px/m, en coussinets au cœur sombre — voir
    //    masquesPlateau, js/parc/sol_plateau.js.)
    {
      for (let i = 0; i < L * 2; i++) {
        g.fillStyle = `rgba(78,71,64,${rnd(0.12, 0.3).toFixed(2)})`;
        g.beginPath(); g.ellipse(rnd(0, 3), Math.random() * h, rnd(1, 3), rnd(3, 10), 0, 0, 6.29); g.fill();
      }
      for (const p of [4.28, 2.18, -0.02, -2.06, -4.22, -6.38, -8.47, -10.62, -12.73, -14.83, -16.93, -19.03, -21.13, -23.62]) {
        const x = XT(p);
        if (x < 0 || x > w) continue;
        g.fillStyle = `rgba(70,64,58,${rnd(0.25, 0.4).toFixed(2)})`;
        g.beginPath(); g.ellipse(x, 1.5, rnd(6, 12), rnd(1.5, 3), 0, 0, 6.29); g.fill();
      }
    }
  }, null, true, 8);
  return t;
}

// (photo 1000051603 du 27/09, le coin des platanes : terre brun sombre tassée, semée de petits graviers BLANCS, de
// brindilles et de quelques feuilles de platane sèches — la première version, rose-gris jonchée de feuilles, lisait
// comme un tapis de feuilles mortes)
// (Sombre de près, mais sèche : sur les photos 1000051343, 339 et 603, au soir, c'est un brun POUSSIÉREUX, gris rosé,
// à 0,76-0,81 fois l'enrobé — la version #4f4641 sortait au rendu en une bande presque noire au pied de la haie.
// Fond et taches éclaircis, et un voile de poussière gris rosé piqué de gravillons blancs par-dessus. Pas plus :
// avec un fond #6d645e et des taches de 80 à 135, elle sortait à 0,95 fois l'enrobé, aussi claire que lui.)
function terreQuai(canvasTex) {
  const cuite = texCuite(terreQuai, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#615852'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = Math.floor(rnd(72, 120));
      g.fillStyle = `rgba(${v},${Math.floor(v * 0.9)},${Math.floor(v * 0.86)},${rnd(0.2, 0.6)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), rnd(1, 3));
    }
    for (let i = 0; i < 2000; i++) {                     // la poussière (2 à 5 mm)
      g.fillStyle = 'rgba(170,155,150,0.25)';
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, rnd(1, 2.5), rnd(1, 2.5), 0, 0, 6.29); g.fill();
    }
    for (let i = 0; i < 300; i++) {                      // les gravillons les plus blancs (1 à 3 mm)
      g.fillStyle = 'rgba(215,210,200,0.8)';
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, rnd(0.5, 1.5), rnd(0.5, 1.5), 0, 0, 6.29); g.fill();
    }
    for (let i = 0; i < 1400; i++) {                     // les graviers blancs (5 à 15 mm)
      const v = Math.floor(rnd(190, 235));
      g.fillStyle = `rgba(${v},${v - 4},${v - 10},${rnd(0.6, 1)})`;
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, rnd(0.8, 2.2), rnd(0.6, 1.6), Math.random() * 3, 0, 6.29); g.fill();
    }
    g.lineCap = 'round';
    for (let i = 0; i < 90; i++) {                       // brindilles
      const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.28, l = rnd(8, 30);
      g.strokeStyle = `rgba(${Math.floor(rnd(95, 130))},${Math.floor(rnd(75, 100))},${Math.floor(rnd(55, 75))},0.85)`;
      g.lineWidth = rnd(0.8, 1.8); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    for (let i = 0; i < 110; i++) {                      // feuilles sèches, éparses
      g.save(); g.translate(Math.random() * w, Math.random() * h); g.rotate(Math.random() * 3.14);
      g.fillStyle = ['#9c7a52', '#b0925e', '#7d6443', '#6f5a3d'][i % 4]; g.globalAlpha = rnd(0.55, 0.9);
      g.beginPath(); g.ellipse(0, 0, rnd(3, 7), rnd(2, 4), 0, 0, 6.29); g.fill(); g.restore();
    }
  }, [1, 1], false, 8);
}

// LES BORDURES DE BÉTON DU QUAI (photos 1000051339, 340, 342, 343 et 603). Au pied du grillage, une bordure de
// 15 x 8 cm d'un gris SALE, pas le gris clair d'une bordure neuve : au rendu elle sortait à 1,45 fois l'enrobé,
// contre 1,0 à 1,1 sur les photos (son dessus est maintenant à 1,05, pose de la photo 339 ; le flanc, vertical, reste
// plus sombre, comme sur la photo 603). Le pied bruni par la terre sur trois centimètres, des points de mousse, les
// arêtes épaufrées, un joint tous les mètres. Le long de l'enrobé, le liseré de béton de 6 cm, affleurant.
// (30/09, lot L4 : l'enrobé éclairci — voir bitumeParc — a remis la bordure à sa place sans la toucher : son dessus,
// qui sortait à 1,33 fois l'enrobé en balade vers le quai, y est à 1,06. Éclaircie avec lui, elle restait à 1,16.)
// Les deux en UN maillage et UNE toile : chaque face prend sa bande de la toile par des coordonnées de texture
// posées ici en mètres (une tuile tous les deux mètres) — la boîte de three étirait sa toile sur toute la longueur.
// `xB` : l'axe de la bordure, de `z0` à `z1` ; `xL` : l'axe du liseré, qui ne longe que l'enrobé (de `ZE` à `z1`).
function bordureQuai(scene, K, xB, xL, z0, z1, ZE) {
  const T = 2;
  // la toile, de haut en bas : le liseré (v 0,85 à 1), le DESSUS de la bordure (0,55 à 0,85), son FLANC (0 à 0,55)
  const tex = K.canvasTex(512, 128, (g, w, h) => {
    const yL = h * 0.15, yA = h * 0.45;                  // bas du liseré ; l'arête dessus / flanc côté terrain
    g.fillStyle = '#8a8983'; g.fillRect(0, 0, w, yL);
    g.fillStyle = '#7c7a75'; g.fillRect(0, yL, w, h - yL);
    for (let i = 0; i < 7000; i++) {                     // le grain du béton
      const v = rnd(-1, 1), c = v > 0 ? '250,248,240' : '30,28,26';
      g.fillStyle = `rgba(${c},${Math.abs(v) * 0.14})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 2.5), rnd(1, 2.5));
    }
    // le pied du flanc, bruni par la terre sur 3 cm (26 px), et quelques éclaboussures au-dessus
    const gr = g.createLinearGradient(0, h - 26, 0, h);
    gr.addColorStop(0, 'rgba(80,65,50,0)'); gr.addColorStop(0.4, 'rgba(80,65,50,0.35)'); gr.addColorStop(1, 'rgba(80,65,50,0.5)');
    g.fillStyle = gr; g.fillRect(0, h - 26, w, 26);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(80,65,50,${rnd(0.15, 0.4)})`;
      g.beginPath(); g.ellipse(Math.random() * w, h - Math.pow(Math.random(), 1.6) * 40, rnd(0.8, 2.5), rnd(0.6, 1.8), 0, 0, 6.29); g.fill();
    }
    // les joints, tous les mètres (sur le flanc et le dessus : le liseré est coulé d'un seul tenant)
    for (const x of [0, w / 2]) { g.fillStyle = 'rgba(40,38,35,0.55)'; g.fillRect(x - 1, yL + 2, 2.5, h - yL); }
    // la mousse, vert-gris #6b7358 : au pied du flanc, et sur le dessus côté grillage (à l'ombre de la haie)
    for (let i = 0; i < 420; i++) {
      const y = i < 260 ? h - Math.pow(Math.random(), 1.5) * 34 : yL + Math.pow(Math.random(), 1.5) * 16;
      g.fillStyle = `rgba(107,115,88,${rnd(0.5, 0.9)})`;
      g.beginPath(); g.ellipse(Math.random() * w, y, rnd(0.7, 2.4), rnd(0.6, 1.8), Math.random() * 3, 0, 6.29); g.fill();
    }
    // l'arête côté terrain, ÉPAUFRÉE : des éclats où le béton plus clair apparaît, des creux sombres
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * w, l = rnd(3, 14), p = rnd(2, 7);
      g.fillStyle = Math.random() < 0.6 ? `rgba(160,156,148,${rnd(0.5, 0.85)})` : `rgba(52,50,46,${rnd(0.35, 0.6)})`;
      g.beginPath(); g.moveTo(x, yA - p * rnd(0.3, 0.7));
      g.lineTo(x + l * 0.5, yA - p * rnd(0.1, 0.5)); g.lineTo(x + l, yA + p * rnd(0, 0.4));
      g.lineTo(x + l * 0.4, yA + p * rnd(0.5, 1)); g.closePath(); g.fill();
    }
  }, [1, 1], false, 8);
  const geos = [];
  // une boîte de largeur `w` et de hauteur `hh`, et ses bandes de toile : `flanc` [v du pied, v du haut], `dessus`
  // [v côté terrain, v côté grillage]
  const piece = (w, hh, x, zA, zB, flanc, dessus) => {
    // (parc entier : recoupée tous les 50 cm en long, pour suivre le vrai sol, voir draperQuai)
    const g = new THREE.BoxGeometry(w, hh, zB - zA, 1, 1, Monde.plat ? 1 : Math.max(1, Math.ceil((zB - zA) / 0.5)));
    g.translate(x, hh / 2, (zA + zB) / 2);
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let k = 0; k < p.count; k++) {
      const X = p.getX(k), Y = p.getY(k), Z = p.getZ(k), vf = flanc[0] + Y / hh * (flanc[1] - flanc[0]);
      if (n.getY(k) > 0.5) uv.setXY(k, Z / T, dessus[0] + (X - x + w / 2) / w * (dessus[1] - dessus[0]));
      else if (Math.abs(n.getZ(k)) > 0.5) uv.setXY(k, X / T, vf);
      else uv.setXY(k, Z / T, vf);
    }
    geos.push(g);
  };
  piece(0.15, 0.08, xB, z0, z1, [0.01, 0.55], [0.55, 0.85]);
  piece(0.06, 0.012, xL, ZE, z1, [0.86, 0.9], [0.88, 0.99]);
  const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  m.castShadow = true; m.receiveShadow = true; scene.add(m);
  for (const g of geos) g.dispose();
}

// LA BANDE DE TERRE DU QUAI, en UN maillage (toile terreQuai, coordonnées de texture en tuiles : 0,9 m en travers,
// 2 m en long, comme le plan d'avant). Deux rubans :
//  - SUR LE PLATEAU, du coin des platanes (ZE) à 20 cm derrière le grillage du pin : de l'enrobé (XBIT) à 20 cm
//    derrière le grillage du quai, à 2 mm du sol — inchangée ;
//  - AU-DELÀ DU COIN, jusqu'au bout du stabilisé (ZE - 40). Le plan du stabilisé (6 mm) passait par-dessus l'ancienne
//    bande : elle est ici à 9 mm, sous le caniveau (12 à 15 mm). D'après la photo 1000051603 : entre le bout du
//    caniveau et la bordure, la terre ; puis, le long du passage et de l'esplanade, plus qu'une lisière de terre et
//    de feuilles de 15 à 30 cm au pied de la bordure, au bord irrégulier (là où le râteau ne passe pas) ; derrière
//    le grillage, la terre sous la haie jusqu'à l'allée (x = 7,3), comme lesQuais la pose de l'autre côté du coin.
//    Passé le bout de la bordure (`zB0`), il ne reste que la terre derrière la ligne du grillage.
// `cx` : du repère du terrain 1 au repère du jeu ; XBIT, XS, ZE : les bornes de buildParc ; `zB1` : le bout côté pin.
function bandeQuai(cx, XBIT, XS, ZE, zB0, zB1) {
  const pos = [], uv = [], nor = [], idx = [];
  // un ruban à la hauteur y, décrit par ses rangées [z, xa, xb] (z croissants, xa < xb), faces vers le haut
  const ruban = (y, rangees) => {
    const n0 = pos.length / 3;
    for (const [z, xa, xb] of rangees) {
      pos.push(xa, y, z, xb, y, z); nor.push(0, 1, 0, 0, 1, 0);
      uv.push((xa - XBIT) / 0.9, z / 2, (xb - XBIT) / 0.9, z / 2);
    }
    for (let i = 0, a = n0; i + 1 < rangees.length; i++, a += 2) idx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
  };
  ruban(0.002, [[ZE, XBIT, XS + 0.2], [zB1, XBIT, XS + 0.2]]);
  // le bord intérieur (côté stabilisé), dans le repère du terrain 1 : 5,62 au bout du caniveau (ZE - 0,8), qui se
  // resserre sur 1,6 m vers une lisière de 5,80 à 5,95 (la bordure commence à 6,10), puis, sur le dernier mètre
  // avant le bout de la bordure, rejoint la ligne du grillage (6,30)
  const bord = (z) => {
    if (z < zB0) return 6.3;
    if (z > ZE - 0.8) return 5.8;
    const lisiere = 5.87 + 0.04 * Math.sin(z * 0.83 + 1.3) + rnd(-0.035, 0.035);
    if (z > ZE - 2.4) { const u = (ZE - 0.8 - z) / 1.6; return 5.62 + (lisiere - 5.62) * u; }
    if (z < zB0 + 1.0) { const u = (z - zB0) / 1.0; return 6.3 + (lisiere - 6.3) * u; }
    return lisiere;
  };
  const rangees = [], zFin = ZE - 40;
  for (let z = zFin; z < ZE - 0.001; z += rnd(0.09, 0.15)) rangees.push([z, cx(bord(z)), cx(7.3)]);
  rangees.push([ZE, cx(bord(ZE)), cx(7.3)]);
  ruban(0.009, rangees);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// PARC ENTIER : LE BORD DU QUAI POSÉ SUR LE VRAI SOL (lot B1). Le grillage du quai (treillis, filet, piquets, jambes
// de force, mâts, lisse de tête), sa haie, son lierre, sa bordure et sa bande de terre sont dessinés à y = 0, le sol
// du plateau. Au-delà du coin des platanes, le long du passage et de l'esplanade, le vrai sol (Monde.sol) descend vers
// la promenade basse, jusqu'à -0,65 m à z = -30 : ils flottaient. Chaque SOMMET de ce qui y longe le quai (z < ZE - 0,15
// et x ≥ 5,5 dans le repère du terrain 1 : grillage, haie, lierre, bande, bordure) descend de la hauteur du sol sous
// lui. Le long du plateau, rien ne bouge : c'est l'image validée photo par photo (derrière la haie, le sol ne descend
// que de 5 à 20 cm, et la zone Z03 lui fait un dos posé sur le vrai sol). Le coin du pin, le grillage des platanes et
// son poteau rouillé non plus : un maillage dont aucun sommet n'est concerné n'est pas touché.
// Les grands plans du grillage (treillis et filet, d'un seul tenant sur 57 m) sont d'abord recoupés tous les 50 cm,
// avec les mêmes coordonnées de texture (elles sont linéaires) ; la bordure l'est dès sa construction (bordureQuai),
// la lisse de tête d'un mât à l'autre (cloturesParc). Là où le sol descend, 1,5 cm de plus : la pièce ne s'y enfonce
// pas entre deux sommets du sol. `DX` : le décalage du décor (parc2) ; Monde.sol prend les coordonnées affichées.
function draperQuai(objets, DX, ZE) {
  const dans = (x, z) => z < ZE - 0.15 && x - DX >= 5.5;
  const v = new THREE.Vector3();
  for (const o of objets) o.traverse((m) => {
    if (!m.isMesh || !m.geometry || !m.geometry.attributes.position) return;
    m.updateMatrix();
    let p = m.geometry.attributes.position, touche = false;
    for (let i = 0; i < p.count && !touche; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrix); touche = dans(v.x, v.z); }
    if (!touche) return;
    // un plan d'un seul tenant : recoupé (mêmes dimensions, mêmes coordonnées de texture)
    const P = m.geometry.parameters;
    if (m.geometry.type === 'PlaneGeometry' && P.widthSegments === 1 && P.width > 1) {
      m.geometry.dispose();
      m.geometry = new THREE.PlaneGeometry(P.width, P.height, Math.ceil(P.width / 0.5), 1);
    }
    // la pose du maillage passe dans la géométrie (les plans du grillage sont tournés et placés)
    const g = m.geometry;
    g.applyMatrix4(m.matrix);
    m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); m.updateMatrix();
    p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      if (!dans(x, z)) continue;
      const s = Monde.sol(x, z);
      p.setY(i, p.getY(i) + s + 0.015 * Math.min(1, Math.max(0, -s / 0.05)));
    }
    p.needsUpdate = true;
    g.computeBoundingSphere(); g.computeBoundingBox();
  });
}

// LE CANIVEAU DU COIN DES PLATANES (photo 1000051603) : le long du bord de l'enrobé, une grille d'acier de 20 cm à
// mailles rectangulaires, dans un cadre de béton de 5 cm, un rien en creux. Elle entre dans le passage du coin,
// 80 cm au-delà du grillage des platanes ; de l'autre côté, à 1,60 m du grillage, la terre de la bande l'a
// recouverte sur un mètre et demi, en bord dentelé. Pas noire : sur la photo, le fond des mailles est brun-gris
// (la terre et les feuilles tombées dedans), les barres gris-brun, le cadre un béton sale à peine plus clair que
// l'enrobé. (La première version — fond #16171a, cadre clair de 38 cm sur 3,1 m — dessinait un rail noir bordé
// de blanc.) `texTerre` : la toile de la bande de terre (terreQuai), reprise sans être redessinée.
function coinCaniveau(scene, K, XBIT, ZE, texTerre) {
  const zA = ZE - 0.8, zC = ZE + 1.6, zB = ZE + 3.15, L = zB - zA;
  const LC = 0.3, LG = 0.2, xm = XBIT + 0.06 + LC / 2;   // (le liseré de l'enrobé occupe les 6 premiers centimètres)
  const cadre = new THREE.MeshStandardMaterial({ color: 0x77746f, roughness: 0.95 });
  K.box(LC, 0.012, L + 0.06, cadre, xm, 0.006, (zA + zB) / 2, scene, false);
  const tex = K.canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#2e2b27'; g.fillRect(0, 0, w, h);
    // barres porteuses (le long du caniveau) et entretoises : mailles de 3 x 1,2 cm
    for (let x = 0; x < w; x += 8) { g.fillStyle = '#6b655d'; g.fillRect(x, 0, 3, h); }
    for (let y = 0; y < h; y += 20) { g.fillStyle = '#5e5951'; g.fillRect(0, y, w, 3); }
    for (let i = 0; i < 480; i++) {                     // rouille, terre, feuilles coincées
      g.fillStyle = ['rgba(110,78,52,0.5)', 'rgba(70,60,50,0.6)', 'rgba(150,120,80,0.45)'][i % 3];
      g.fillRect(Math.random() * w, Math.random() * h, rnd(2, 6), rnd(2, 8));
    }
  }, [1, L / 0.8], false, 8);
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(LG, L),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.3 }));
  grille.rotation.x = -Math.PI / 2; grille.position.set(xm, 0.013, (zA + zB) / 2); grille.receiveShadow = true;
  scene.add(grille);
  // la terre qui recouvre le bout côté pin : 38 cm de large, de zC jusqu'au-delà du cadre, bords dentelés (le bout
  // côté grille profondément, en langues de terre ; les côtés et l'autre bout à peine, pour se fondre dans la bande)
  const LT = zB + 0.1 - zC;
  const bord = K.canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.beginPath();
    g.moveTo(rnd(0, 5), h - rnd(0, 6));
    for (let y = h - 8; y > 30; y -= 8) g.lineTo(rnd(0, 5), y);
    for (let x = 0; x <= w; x += 4) g.lineTo(x, Math.random() < 0.2 ? rnd(0, 8) : rnd(12, 30));   // (en haut : zC)
    for (let y = 30; y < h - 8; y += 8) g.lineTo(w - rnd(0, 5), y);
    for (let x = w; x >= 0; x -= 6) g.lineTo(x, h - rnd(0, 6));
    g.closePath(); g.fill();
  }, null, false, 1);
  const mapTerre = texTerre.clone(); mapTerre.repeat.set(0.38 / 0.9, LT / 2);
  const terre = new THREE.Mesh(new THREE.PlaneGeometry(0.38, LT),
    new THREE.MeshStandardMaterial({ map: mapTerre, alphaMap: bord, alphaTest: 0.5, roughness: 1 }));
  terre.rotation.x = -Math.PI / 2; terre.position.set(xm, 0.015, zC + LT / 2); terre.receiveShadow = true;
  scene.add(terre);
}

// LE LIERRE DU GRILLAGE DU QUAI, au coin des platanes (photos 1000051603, 1000051343 et 185558) : un VOILE BAS,
// collé à la maille, sur les cinq mètres qui partent de l'angle — plus dense sous 90 cm, jamais plus haut que
// 1,80 m, et de moins en moins haut en s'éloignant du coin. Au-dessus, à travers le treillis, on voit les fûts du
// rideau, l'allée et le fourgon blanc. (La première version montait à 3,30 m sur huit mètres, en plans de 35 à
// 70 cm décollés de 14 cm et tournés de 25° : de face, photo 343, elle bouchait le coin gauche d'une masse
// vert-noir.) Quatre-vingt-dix petits plans de 18 à 35 cm, à 1-5 cm de la maille côté extérieur, tournés de
// 0,25 rad au plus ; des feuilles de lierre à lobes, sur leurs tiges (feuillesLierre).
// AU-DELÀ DU COIN, le long du passage et de l'esplanade (photo 1000051603) : la maille est prise de lierre sur toute
// sa longueur, mais PAR PLAQUES — un voile de tiges et de feuilles éparses sous 1,5 m, et, à 0,6-2,2 m d'intervalle,
// une plaque dense de 1,2 à 3,2 m, bombée, qui monte à 1,3-1,9 m ; une sur quatre déborde du treillis sur le bas du
// filet (2,1 à 2,5 m), comme celle qui grimpe au mât du coin sur la photo. La première part du coin même : sans
// elle, le lierre du plateau s'arrêtait net à l'angle. Jusqu'au bout du grillage (Z_FIN_QUAI).
// (Relecture du 29/09 : avec des plaques de 1 à 3 m tous les 1,5 à 4 m, 18 à 24 plans par mètre, tirés vers le sol,
// et un voile tous les 20 à 50 cm sous 1,3 m, la maille du passage restait nue aux deux tiers — on y voyait la haie
// pâle, les bancs et la grille du talus au travers, là où la photo 603 montre un treillis vert, pris de lierre du
// pied jusqu'à hauteur d'homme. Plaques plus longues et plus rapprochées, plus fournies, qui montent dans la maille
// au lieu de s'entasser au pied : 2 000 triangles environ au lieu de 1 100, dans le même maillage.)
function lierreQuai(scene, K, xQ, ZE) {
  const acc = accFeuillage();
  const PAL = paletteFond([[0x587246, 3], [0x4a6340, 3], [0x6a8452, 2], [0x3f5636, 2]]);
  // un plan de lierre en z, sous hMax, tiré vers le bas (plus dense près du sol ; `raide` : plus il est grand, plus
  // les plans s'entassent au pied) ; son bas pose sur y, son haut ne passe pas hMax. `lacet` : l'écart de cap à la
  // maille. Au coin, 0,25 rad ; le long du passage, on le regarde en enfilade, presque par la tranche : des feuilles
  // plus décollées (jusqu'à 0,65 rad, reculées d'autant côté haie pour ne pas traverser la maille) s'y lisent encore,
  // comme les touffes qui sortent du grillage sur la photo 603.
  const feuille = (z, hMax, lacet = 0.25, s = rnd(0.18, 0.35), raide = 2.2) => {
    const y = hMax * Math.pow(Math.random(), raide), a = rnd(-lacet, lacet);
    const vol = { c: [xQ + 0.3, y, z], r: 1.2, t: rnd(0.85, 1.1) };
    const recul = lacet > 0.25 ? Math.abs(Math.sin(a)) * s * 0.5 : 0;
    carteFond(acc, xQ + rnd(0.01, 0.05) + recul, Math.min(y + s * 0.5, hMax - s * 0.5), z,
      rnd(-0.25, 0.25), Math.PI / 2 + a, rnd(-0.25, 0.25), s, s, vol, PAL());
  };
  // (a) le coin, côté plateau
  for (let i = 0; i < 90; i++) {
    const z = ZE + Math.pow(Math.random(), 1.4) * 5.0;
    feuille(z, Math.min(1.8, 2.2 - (z - ZE) * 0.25));
  }
  // (b) le voile du passage et de l'esplanade, entre les plaques : un plan tous les 12 à 30 cm
  for (let z = ZE - 0.2; z > Z_FIN_QUAI + 0.2; z -= rnd(0.12, 0.3)) feuille(z, rnd(0.7, 1.5), 0.5);
  // (c) les plaques denses, vingt-six à trente-deux plans par mètre, de 22 à 40 cm, plus hautes en leur milieu, et
  // qui remplissent la maille sur leur hauteur (raide = 1,5 : moins tassées au pied que le voile)
  for (let z = ZE, k = 0; z > Z_FIN_QUAI + 0.6; k++) {
    const L = Math.min(k ? rnd(1.2, 3.2) : rnd(2.4, 3.2), z - Z_FIN_QUAI - 0.3);
    const h = k && Math.random() < 0.25 ? rnd(2.1, 2.5) : rnd(1.3, 1.9);
    for (let i = 0, n = Math.round(L * rnd(26, 32)); i < n; i++) {
      const u = Math.random();
      feuille(z - u * L, h * (0.7 + 0.3 * Math.sin(Math.PI * u)), 0.65, rnd(0.22, 0.4), 1.5);
    }
    z -= L + rnd(0.6, 2.2);
  }
  const mat = materiauFeuilles(feuillesLierre(K.canvasTex), { trans: 0.15, rugosite: 0.8 });
  const m = new THREE.Mesh(coudreTeinte(acc), mat);
  m.castShadow = true; m.receiveShadow = false; m.customDepthMaterial = mat.userData.ombre;
  scene.add(m); declarerFeuillage(scene, m);
}

// Feuilles de lierre, NEUTRES comme celles du fond (la couleur vient des sommets, paletteFond) : sur une tuile
// de 18 à 35 cm, des feuilles palmées de 4 à 7 cm à trois ou cinq lobes pointus, échancrées en cœur à la base,
// nervures claires, accrochées par leur pétiole à quatre tiges brunes qui traversent la tuile.
function feuillesLierre(canvasTex) { return avecTeinte(feuillesLierreBrut(canvasTex), TEINTES_FEUILLES.fond); }
function feuillesLierreBrut(canvasTex) {
  const cuite = texCuite(feuillesLierreBrut, arguments, [saigner]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.lineCap = 'round'; g.lineJoin = 'round';
    // une feuille centrée en (x, y), pointe vers `a` (0 = vers le haut), de rayon `R`, de gris `v` ; les lobes :
    // [angle en degrés, longueur relative]
    const feuille = (x, y, a, R, v) => {
      const lobes = Math.random() < 0.6 ? [[-105, 0.62], [-52, 0.86], [0, 1], [52, 0.86], [105, 0.62]] : [[-68, 0.78], [0, 1], [68, 0.78]];
      const P = (deg, r) => { const t = a + deg * Math.PI / 180; return [x + Math.sin(t) * r * R, y - Math.cos(t) * r * R]; };
      const pts = lobes.map(([d, r]) => [d + rnd(-6, 6), r * rnd(0.9, 1.05)]);
      g.fillStyle = `rgb(${v + 6 | 0},${v | 0},${v - 8 | 0})`;
      g.beginPath(); g.moveTo(...P(...pts[0]));
      for (let i = 1; i < pts.length; i++) g.quadraticCurveTo(...P((pts[i - 1][0] + pts[i][0]) / 2, 0.32), ...P(...pts[i]));
      const dern = pts[pts.length - 1][0];
      g.quadraticCurveTo(...P((dern + 180) / 2, 0.62), ...P(180, 0.12));             // le cœur de la base
      g.quadraticCurveTo(...P((pts[0][0] - 180) / 2, 0.62), ...P(...pts[0]));
      g.fill();
      g.strokeStyle = 'rgba(255,255,240,0.28)'; g.lineWidth = 1;                      // les nervures
      for (const [d, r] of pts) { g.beginPath(); g.moveTo(...P(180, 0.1)); g.lineTo(...P(d, r * 0.8)); g.stroke(); }
    };
    // les tiges, et le long d'elles les points d'attache des pétioles, alternés de part et d'autre
    const attaches = [];
    for (let i = 0; i < 4; i++) {
      let x = rnd(20, w - 20), y = h + 4, a = rnd(-0.5, 0.5);
      g.strokeStyle = 'rgba(96,84,70,0.9)'; g.lineWidth = rnd(2, 3.2);
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 9; k++) {
        a += rnd(-0.35, 0.35); x += Math.sin(a) * 30; y -= Math.cos(a) * 30; g.lineTo(x, y);
        if (x > 20 && x < w - 20 && y > 20 && y < h - 20) attaches.push([x, y, a + (k % 2 ? 1 : -1) * rnd(0.6, 1.2)]);
      }
      g.stroke();
    }
    // un tiers de feuilles du fond, plus sombres, d'abord ; puis celles de devant
    attaches.sort(() => Math.random() - 0.5);
    attaches.forEach(([x0, y0, a], i) => {
      const R = rnd(17, 29), l = rnd(6, 12);
      const x = Math.min(w - R - 2, Math.max(R + 2, x0 + Math.sin(a) * (l + R * 0.2)));
      const y = Math.min(h - R - 2, Math.max(R + 2, y0 - Math.cos(a) * (l + R * 0.2)));
      g.strokeStyle = 'rgba(96,84,70,0.9)'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke();
      feuille(x, y, a + rnd(-0.4, 0.4), R, i < attaches.length * 0.35 ? rnd(112, 150) : rnd(158, 236));
    });
    saigner(g);                                                  // (lot L8 : la couleur sous l'alpha nul, voir saigner)
  }, [1, 1], true, 8);
}

// La pelouse du parc (la terrasse au-dessus du mur, le talus du pin, les abords). Lot L8 : elle était FLUO — fond
// #4f6f37 et mouchetures jusqu'à 150 de vert : #54703c au rendu, saturation 0,46 à 0,53, contre #425541 et 0,24 sur la
// photo 602 (et, sur le terrain 2, elle est dans le haut de la caméra de diffusion pendant tout le match). Fond gris-vert
// #52624c, mouchetures désaturées de moitié : au rendu (caméra de diffusion du terrain 2, extrême), saturation 0,53 ->
// 0,27, 0,69 -> 0,6 fois l'enrobé (cible 0,56 à 0,65). (Le plan partait de #45583f et d'une couleur de matériau
// (0,6 ; 0,65 ; 0,6) : c'était sur la mesure d'avant la lumière recalée du lot L7, 0,92 fois l'enrobé ; aujourd'hui,
// #45583f seul la sortait déjà à 0,52 — trop sombre —, et la couleur de matériau la descendait à 0,4.)
function pelouseParc(canvasTex) {
  const cuite = texCuite(pelouseParc, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#52624c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16000; i++) {
      const v = Math.random();
      g.fillStyle = v < 0.5 ? `rgba(${Math.floor(rnd(65, 90))},${Math.floor(rnd(84, 106))},${Math.floor(rnd(60, 80))},0.5)` : `rgba(${Math.floor(rnd(96, 120))},${Math.floor(rnd(112, 134))},${Math.floor(rnd(88, 106))},0.4)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1, rnd(2, 5));
    }
  }, [60, 60], false, 8);
}

function stabiliseTexture(canvasTex) {
  const cuite = texCuite(stabiliseTexture, arguments, [C]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = C.stabilise; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60000; i++) {
      const v = Math.floor(rnd(150, 215));
      g.fillStyle = `rgba(${v},${Math.floor(v * 0.9)},${Math.floor(v * 0.72)},${rnd(0.2, 0.55)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), rnd(1, 3));
    }
    // feuilles de platane tombées : deux fois plus nombreuses, et un tiers de feuilles sombres, humides ou à l'envers
    // (photos 1000051340, 602 et 603 : le stabilisé sous la voûte est moucheté de brun foncé autant que de beige)
    for (let i = 0; i < 1400; i++) {
      g.save(); g.translate(Math.random() * w, Math.random() * h); g.rotate(Math.random() * 3.14);
      g.fillStyle = ['#8a6a3c', '#a5824a', '#5a4a38', '#6f552f', '#b99a61', '#6f5a44'][i % 6]; g.globalAlpha = rnd(0.4, 0.85);
      g.beginPath(); g.ellipse(0, 0, rnd(3, 7), rnd(2, 5), 0, 0, 6.29); g.fill(); g.restore();
    }
    for (let i = 0; i < 18; i++) {                      // zones plus sombres (humidité, ombre des couronnes)
      const r = rnd(40, 140), gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, 'rgba(120,100,70,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      // (en boucle sur les bords : sinon chaque tuile de 5 m avait sa couture droite, bien visible à travers le grillage)
      const x = Math.random() * w, y = Math.random() * h; g.fillStyle = gr;
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.save(); g.translate(x + dx, y + dy); g.fillRect(-r, -r, 2 * r, 2 * r); g.restore(); }
    }
  }, [1, 1], false, 8);
}

// =====================================================================
//  CLÔTURES (reprises d'après les photos 39 à 43, 26/09)
// =====================================================================
// Ce que les photos montrent, et que la version précédente ne rendait pas :
//  - des mâts à des places précises, pas au pas régulier : côté quai cinq mâts galvanisés reliés en tête par
//    une lisse, côté pin huit mâts au pas de 4,35 m (le poteau du panier D2 tombe au milieu d'une travée),
//    côté platanes des poteaux BLANCS en T, sans filet ni lisse, et au coin des platanes un poteau au pied
//    rouillé qui porte un petit boîtier au bout d'un bras ;
//  - un treillis soudé de 5 x 10 cm, gris-vert, qui se lit comme un VOILE fin et régulier — il rendait trois
//    lignes de pointillés noirs ;
//  - des filets pare-ballons presque invisibles (cordes fines, on ne les voit bien que sur le ciel) ;
//  - les jambes de force là où elles sont : un A à chaque clôture du coin du pin (pieds à 1,40 m), un A sur le
//    quai à z = -6,5, une oblique près du banc blanc, une jambe au coin des platanes.
// Toutes les positions sont écrites dans le repère du terrain 1 et passent par cx().

// LA TEXTURE D'UN GRILLAGE, fil par fil. Pas une toile 2D : le canvas garde ses pixels prémultipliés, un texel
// vide y est NOIR, et en réduisant la texture (mipmaps) la carte graphique mêle ce noir aux fils — de loin le
// treillis tournait au pointillé sombre. Ici la couleur est celle du fil PARTOUT et seul l'alpha dessine les
// mailles : réduite, la texture devient un voile de la couleur du fil dont l'opacité est la part de fil (un
// quart pour le treillis soudé), ce que l'œil voit à dix mètres. Chaque fil est rastérisé par couverture
// exacte du pixel : pas d'escalier de près, pas de moiré à mi-distance.
// `T` : côté en pixels ; `nV`, `nH` : fils verticaux et horizontaux par tuile ; `eV`, `eH` : leur épaisseur (px).
function texFils(T, nV, nH, eV, eH, rgb) {
  const couverture = (n, e) => {
    const c = new Float32Array(T), pas = T / n;
    for (let k = 0; k < n; k++) {
      const a = (k + 0.5) * pas - e / 2, b = a + e;
      for (let i = Math.floor(a); i < Math.ceil(b); i++) c[((i % T) + T) % T] += Math.max(0, Math.min(i + 1, b) - Math.max(i, a));
    }
    return c;
  };
  const cv = couverture(nV, eV), ch = couverture(nH, eH), d = new Uint8Array(T * T * 4);
  for (let j = 0; j < T; j++) {
    for (let i = 0; i < T; i++) {
      const k = (j * T + i) * 4, a = 1 - (1 - Math.min(1, cv[i])) * (1 - Math.min(1, ch[j]));
      d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = Math.round(a * 255);
    }
  }
  const t = new THREE.DataTexture(d, T, T, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.anisotropy = 16; t.needsUpdate = true;
  return t;
}

// Treillis soudé : mailles de 5 x 10 cm (20 fils verticaux et 10 horizontaux par mètre, mesuré sur la photo 43),
// fil gris-vert #3e524d, les verticaux un peu plus marqués. Une tuile = 1 m (seul cloturesParc s'en sert).
// (`canvasTex` n'est plus utilisé : voir texFils ; on garde la signature pour les appelants.)
function grillageSoude(canvasTex) { return texFils(320, 20, 10, 2.8, 2.3, [62, 82, 77]); }

// Le treillis des platanes n'est pas celui du quai (photos 1000051603, 340 et 602) : maille CARRÉE de 5 x 5 cm
// (20 fils par mètre dans les deux sens), fil fin de 5 mm, vert-gris clair #5c6c64 — de près un quadrillage serré,
// de loin un voile clair à travers lequel on lit le stabilisé et les fûts. Une tuile = 1 m.
function grillagePlatanes(canvasTex) { return texFils(320, 20, 20, 1.6, 1.6, [92, 108, 100]); }

// Filet pare-ballons : maille carrée de 15 cm, cordes fines #3a3d3c. Une tuile = 1,2 m (huit mailles).
function filetFin() { return texFils(256, 8, 8, 2.4, 2.4, [58, 61, 60]); }

// Le matériau d'un grillage : un voile TRANSPARENT (mélangé, pas découpé), qui n'écrit pas la profondeur. En
// découpe alpha, les fils sous-pixel passaient ou non le seuil selon la distance : d'où les pointillés. Une face
// plane ne se recouvre pas elle-même : un seul passage suffit en double face.
function materiauGrillage(map, teinte = 0xffffff, opacite = 1) {
  return new THREE.MeshStandardMaterial({ map, color: teinte, transparent: true, opacity: opacite, depthWrite: false,
    alphaTest: 0.004, side: THREE.DoubleSide, forceSinglePass: true, roughness: 0.72, metalness: 0 });
}

// Le filet, lui, n'est pas éclairé : une corde d'un centimètre ne se voit que par contraste, sombre sur le ciel
// ou sur les feuilles claires, invisible sur le feuillage sombre (photos 42 et 43). Éclairée, elle prenait la
// lumière du ciel et dessinait un quadrillage gris clair sur le bleu.
function materiauFilet(map, opacite) {
  return new THREE.MeshBasicMaterial({ map, transparent: true, opacity: opacite, depthWrite: false, alphaTest: 0.004,
    side: THREE.DoubleSide, forceSinglePass: true });
}

// UN LOT DE PIÈCES : les dizaines de mâts, piquets, lisses et jambes de force des trois clôtures sont cousus en
// UN maillage par matériau — une dizaine d'appels de dessin au lieu de trois cents.
function lotPieces() {
  const parMat = new Map(), UP = new THREE.Vector3(0, 1, 0), o = new THREE.Object3D(), d = new THREE.Vector3();
  const mettre = (mat, geo) => { let l = parMat.get(mat); if (!l) parMat.set(mat, (l = [])); l.push(geo); };
  return {
    // un tube de a (rayon r0) à b (rayon r1)
    tube(mat, a, b, r0, r1 = r0, seg = 8) {
      d.subVectors(b, a); const l = d.length();
      o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
      o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(UP, d.normalize()); o.updateMatrix();
      mettre(mat, new THREE.CylinderGeometry(r1, r0, l, seg).applyMatrix4(o.matrix));
    },
    // une boîte w x h x p, centrée en (x, y, z), tournée de rotY autour de la verticale
    boite(mat, w, h, p, x, y, z, rotY = 0) {
      o.scale.set(1, 1, 1); o.position.set(x, y, z); o.rotation.set(0, rotY, 0); o.updateMatrix();
      mettre(mat, new THREE.BoxGeometry(w, h, p).applyMatrix4(o.matrix));
    },
    // `sansOmbre` : les matériaux dont les pièces ne portent pas d'ombre (piquets, jambes de force, bagues)
    poser(scene, sansOmbre = new Set()) {
      for (const [mat, geos] of parMat) {
        const m = new THREE.Mesh(mergeGeometries(geos), mat);
        m.castShadow = !sansOmbre.has(mat); m.receiveShadow = true; scene.add(m);
        for (const g of geos) g.dispose();
      }
    },
  };
}

// UN GRILLAGE : le treillis soudé, ses piquets verts, ses jambes de force et, au-dessus, le filet. Les grands
// mâts n'y sont pas : ils sont posés un par un par cloturesParc (les mâts d'angle servent à deux grillages).
//  o.axe : 'x' (le grillage court le long de x : pin, platanes) ou 'z' (quai) ; o.c : sa coordonnée fixe ;
//  o.de, o.a : ses deux bouts (de < a) ; o.dehors : +1 / -1, le côté extérieur ; o.hB : hauteur du treillis ;
//  o.tex : la texture du treillis ; o.teinte : sa teinte ; o.vert : le matériau des piquets et des jambes ;
//  o.piquets : leurs positions le long de l'axe ; o.gros : ceux qui sont des piquets d'angle (Ø 6 cm), hauts
//  de o.hGros ; o.jambes : [haut, pied, hauteur d'attache, matériau] — le matériau est facultatif, sinon
//  o.jambeMat, sinon o.vert (la jambe du coin des platanes est d'un autre vert que ses piquets) ;
//  o.filet : { tex, h0, h1, opacite }.
function cloture(scene, K, lot, o) {
  const L = o.a - o.de, mil = (o.de + o.a) / 2;
  const pt = (s, y, dec = 0) => (o.axe === 'x' ? new THREE.Vector3(s, y, o.c + dec) : new THREE.Vector3(o.c + dec, y, s));
  const rotY = o.axe === 'x' ? 0 : Math.PI / 2;
  // (`s0`, `s1` : un morceau seulement du grillage ; `o.trous` : [[s0, s1], ...] les panneaux de treillis qui manquent,
  // le filet, lui, continue au-dessus)
  const plan = (h0, h1, mat, dec, s0 = o.de, s1 = o.a) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s1 - s0, h1 - h0), mat);
    m.position.copy(pt((s0 + s1) / 2, (h0 + h1) / 2, dec)); m.rotation.y = rotY; m.receiveShadow = true;
    scene.add(m);
    // la passe de normales de l'occlusion (GTAO) dessinerait le grillage comme un mur plein : on l'en retire
    declarerFeuillage(scene, m);
    return m;
  };
  const bouts = [o.de, ...(o.trous || []).flat(), o.a];
  for (let k = 0; k < bouts.length; k += 2) {
    const l = bouts[k + 1] - bouts[k];
    if (l > 0.01) plan(0, o.hB, materiauGrillage(K.tiled(o.tex, l, o.hB, 1.0), o.teinte), 0, bouts[k], bouts[k + 1]);
  }
  if (o.filet) {
    const f = o.filet;
    plan(f.h0, f.h1, materiauFilet(K.tiled(f.tex, L, f.h1 - f.h0, 1.2), f.opacite), o.dehors * 0.05);
  }
  for (const s of o.piquets) {
    const gros = (o.gros || []).includes(s);
    lot.tube(o.vert, pt(s, 0), pt(s, gros ? o.hGros || o.hB + 0.05 : o.hB + 0.04), gros ? 0.03 : 0.022, gros ? 0.03 : 0.022, 6);
  }
  // les jambes de force, côté terrain du treillis (photo 39 : on les voit devant la maille)
  for (const [s0, s1, h, m] of o.jambes || []) {
    lot.tube(m || o.jambeMat || o.vert, pt(s1, 0, -o.dehors * 0.04), pt(s0, h, -o.dehors * 0.04), 0.022, 0.02, 6);
  }
  // PARC ENTIER : le grillage est aussi un obstacle du monde (voir buildParc, obstaclesDecor), avec les mêmes bouts et
  // les mêmes TROUS que le dessin — le panneau qui manque derrière la cage de hand (TROU_PIN) est le portillon du pin :
  // on y passe, la balle aussi, sous le filet qui continue au-dessus. Le treillis arrête tout le monde jusqu'à sa
  // hauteur ; le filet, seulement la balle (on passe dessous). On les voit au travers : ils ne retiennent pas la
  // caméra (sur le plateau, borneCam la tient déjà en deçà, comme aujourd'hui).
  const obs = scene.userData.obstaclesDecor;
  if (obs) {
    const a = pt(o.de, 0), b = pt(o.a, 0);
    const trous = (o.trous || []).map(([s0, s1]) => [s0 - o.de, s1 - o.de]);
    obs.push({ t: 's', x0: a.x, z0: a.z, x1: b.x, z1: b.z, e: 0.06, h: o.hB, qui: 'tous', type: 'grille', camera: false,
      source: 'plateau', ...(trous.length ? { trous } : {}) });
    if (o.filet) obs.push({ t: 's', x0: a.x, z0: a.z, x1: b.x, z1: b.z, e: 0.04, bas: o.filet.h0, h: o.filet.h1, qui: 'balle',
      type: 'filet', camera: false, source: 'plateau' });
  }
}

// La rouille du pied du poteau d'angle des platanes (photos 40 et 43) : brun-violacé #6f5a52, taches
// sombres #584747 et quelques coulures orangées ; en haut, la limite déchiquetée avec la peinture.
function rouilleTexture(canvasTex) {
  const cuite = texCuite(rouilleTexture, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#6f5a52'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 110; i++) {
      const t = Math.random();
      g.fillStyle = t < 0.55 ? 'rgba(88,71,71,0.75)' : t < 0.85 ? 'rgba(128,84,58,0.55)' : 'rgba(160,150,140,0.35)';
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, rnd(2, 6), rnd(3, 12), 0, 0, 6.29); g.fill();
    }
    g.fillStyle = '#b9bcba';
    for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 4, rnd(1, 7));
  }, [1, 1], false, 4);
}

// LE BOUT DU GRAND GRILLAGE DU QUAI (z, le même pour 'parc' et 'parc2'). Il ne s'arrête pas au coin des platanes :
// sur la photo 1000051603 il file, couvert de lierre, le long du passage puis de toute l'esplanade des platanes, et
// la double rangée d'arbres du quai continue bien au-delà (OSM : de z = 8 à -74, et jusqu'à -103 pour la seconde).
// On le mène au bout de l'esplanade — un mètre avant la fin du stabilisé (ZE - 40), trois mètres après le dernier
// fût du rideau du quai (-45) ; plus loin, le décor n'existe pas encore (la promenade du quai du parc complet).
// Le grillage (cloturesParc), sa haie (haieQuai), son lierre (lierreQuai), sa bordure et sa bande de terre
// (buildParc, bandeQuai) s'arrêtent tous ici.
const Z_FIN_QUAI = -48.1;

// LES TROIS GRILLAGES DU PLATEAU ET LEURS MÂTS. `XN`, `XS`, `ZO`, `ZE` : les bornes de buildParc (pied du mur,
// grillage du quai -0,1, grillages du pin et des platanes -0,1) ; `cx` : du repère du terrain 1 au repère du jeu.
function cloturesParc(scene, K, cx, XN, XS, ZO, ZE) {
  const xQ = XS + 0.1, zP = ZO + 0.1, zE = ZE - 0.1;     // les plans des trois grillages
  const xM1 = -23.62;                                    // le dernier piquet et le dernier mât des platanes, contre la face du mur
                                                         // (le grillage du pin s'arrête avant, au haut de l'escalier : ESCALIER.xM)
  const lot = lotPieces(), V = (x, y, z) => new THREE.Vector3(x, y, z);
  const std = (c, r = 0.55, m = 0.3) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const M = {
    // les mâts du quai et du pin, galvanisés : sur les photos 1000051343, 340, 603 et 185558 ce sont les verticales
    // les PLUS CLAIRES de la vue (1,0 à 1,1 fois l'enrobé), gris argent mat. Métallisés à 0,3, ils ne reflétaient
    // que la bande sombre du rideau d'arbres et sortaient en traits gris foncé.
    galva: std(0xd2d6d4, 0.45, 0.05),
    blanc: std(0xe2e3dd, 0.6, 0.1),               // les poteaux en T des platanes, peints en blanc
    manchon: std(0x1b1c1d, 0.7, 0.2),             // la bague noire au pied des mâts galvanisés
    piedT: std(0x2c2d30, 0.7, 0.2),               // le pied noir des poteaux en T
    boitier: std(0x4d5256, 0.6, 0.3),
    rouille: new THREE.MeshStandardMaterial({ map: rouilleTexture(K.canvasTex), roughness: 0.9, metalness: 0.15 }),
    // piquets et jambes de force : vert-gris côté quai (photos 39 et 43 : à 0,55 fois l'enrobé, on les lit contre la
    // haie — #45575b métallisé les noyait dans l'ombre), vert sombre au pin et aux platanes
    vertQuai: std(0x5a7264, 0.7, 0), vertPin: std(0x2f4a3a, 0.6, 0.2), vertPlat: std(0x2d4a34, 0.6, 0.2),
    // la jambe de force du coin des platanes, vert d'eau (photos 603, 340 et 602 : plus claire que ses piquets)
    jambePlat: std(0x7d9f9c, 0.6, 0.2),
  };
  const treillis = grillageSoude(K.canvasTex), filet = filetFin();

  // --- CÔTÉ QUAI : treillis de 1,90 m, filet de 1,90 m à la lisse (4,90 m) ---
  // piquets relevés sur la photo 43 (1,8 à 2 m d'écart) ; une jambe en A au piquet z = -6,5, une oblique du haut
  // du piquet z = 6,0 au sol en 6,9, et au coin du pin la branche quai du A d'angle (pied à 1,40 m).
  // Il ne s'arrête pas au coin des platanes (photos 1000051603 et 340) : le grillage des platanes finit à 90 cm de
  // lui, et il file le long du passage qui mène au bosquet, puis tout le long de l'esplanade des platanes jusqu'à
  // Z_FIN_QUAI — treillis, filet et lisse compris. (Il s'arrêtait six mètres après le coin : en balade, au coin du
  // quai, on le voyait finir au milieu de l'esplanade, la haie aussi, et au-delà l'allée du quai à découvert —
  // capture de Haythem du 28/09.) Dans le passage, les piquets de la photo 603, tous les deux mètres depuis le coin
  // (zP0 : l'ancien bout) ; au-delà, le même pas (1,93 m), un rien irrégulier ; deux jambes en A le long de
  // l'esplanade, comme celle du plateau ; au bout, un gros piquet d'extrémité et sa jambe de force, vers le coin.
  // (La balle, elle, reste retenue au coin : voir reperes.grillage.)
  const zQ0 = Z_FIN_QUAI, zP0 = zE - 6;
  const pasQ = [];
  { const n = Math.round((zP0 - zQ0) / 1.95);
    for (let i = 1; i < n; i++) pasQ.push(zP0 - i * (zP0 - zQ0) / n + rnd(-0.06, 0.06)); }
  // (un piquet sur sept, à partir du quatrième : aujourd'hui les piquets 3 et 10, z ≈ -22,9 et -36,5. Écrit en dur,
  // [pasQ[3], pasQ[10]] tombait sur un piquet absent — une jambe en NaN dans tout le lot fusionné — si l'on
  // raccourcissait un jour Z_FIN_QUAI ; prolongé, le grillage gagne ses jambes tout seul)
  const jambesA = pasQ.filter((_, i) => i % 7 === 3).flatMap((z) => [[z, z - 0.9, 1.85], [z, z + 0.9, 1.85]]);
  cloture(scene, K, lot, { axe: 'z', c: xQ, de: zQ0, a: zP, dehors: 1, hB: 1.9, tex: treillis, vert: M.vertQuai,
    piquets: [zQ0, ...pasQ, zP0, zP0 + 2.0, zP0 + 4.0, zE, -7.85, -6.5, -4.6, -2.8, -1.0, 0.85, 2.7, 4.6, 6.0, 7.65, zP],
    gros: [zQ0, zP], hGros: 2.15,
    jambes: [[zQ0, zQ0 + 1.4, 1.95], ...jambesA, [-6.5, -7.4, 1.85], [-6.5, -5.6, 1.85], [6.0, 6.9, 1.85], [zP, zP - 1.4, 1.95]],
    filet: { tex: filet, h0: 1.9, h1: 4.9, opacite: 0.45 } });

  // --- CÔTÉ PIN : treillis de 2,10 m ajouré (le lierre n'en tient que le pied : voir la végétation du pin),
  // filet presque invisible jusqu'à 5,10 m ---
  // (07/10, photo 20261007_184901 : il ne va pas jusqu'au mur. Treillis, filet et lisse s'arrêtent au grand mât gris
  // d'ESCALIER.xM, 1,5 m avant la face du mur : entre les deux, l'escalier du bout du mur, voir escalierMur. Pas de
  // jambe de force à ce bout — la photo n'en montre pas, côté plateau ; le gros piquet vert est collé au mât.) Au parc
  // entier, le coin reste fermé (voir ESCALIER) : le grillage va jusqu'au mur, comme avant.
  const ouvert = coinOuvert(), xFinPin = ouvert ? ESCALIER.xM : xM1, xPiq = ouvert ? xFinPin + 0.06 : xM1;
  const pinP = [];
  const trou = TROU_PIN.map(cx);
  for (let x = 6.3 - 2.3; x > xFinPin + 1.0; x -= 2.3) {
    const p = cx(x + rnd(-0.08, 0.08));
    if (p < trou[0] - 0.3 || p > trou[1] + 0.3) pinP.push(p);           // pas de piquet dans le trou : un de chaque côté
  }
  pinP.push(trou[0], trou[1], cx(xPiq));
  cloture(scene, K, lot, { axe: 'x', c: zP, de: ouvert ? cx(xFinPin) : XN + 0.005, a: xQ, dehors: 1, hB: 2.1, tex: treillis, teinte: 0xe4ede6,
    trous: [trou], vert: M.vertPin, piquets: pinP, gros: [cx(xPiq)], hGros: 2.15,
    jambes: ouvert ? [[xQ, xQ - 1.4, 1.95]] : [[xQ, xQ - 1.4, 1.95], [cx(xM1), cx(xM1 + 1.0), 1.9]],
    filet: { tex: filet, h0: 2.1, h1: 5.1, opacite: 0.32 } });

  // --- CÔTÉ PLATANES : treillis de 2,05 m, AUCUN filet (on voit les platanes en entier) ---
  // piquets tous les 2,1 m environ depuis l'angle (relevés de la photo 40). Il s'arrête à 90 cm du grillage du
  // quai, au poteau rouillé (P1) : le passage vers le bosquet (photos 1000051603 et 340). Sa maille est carrée et
  // fine (grillagePlatanes), et sa jambe de force du coin vert d'eau.
  const platP = [4.28, 2.18, -0.02, -2.06, -4.22, -6.38, -8.47, -10.62, -12.73, -14.83, -16.93, -19.03, -21.13, xM1];
  cloture(scene, K, lot, { axe: 'x', c: zE, de: XN + 0.005, a: xQ - 0.9, dehors: -1, hB: 2.05, tex: grillagePlatanes(K.canvasTex),
    teinte: 0xf0f3ee, vert: M.vertPlat, piquets: platP.map(cx), gros: [cx(xM1)], hGros: 2.1,
    jambes: [[xQ - 0.9, xQ - 1.9, 1.95, M.jambePlat], [cx(xM1), cx(xM1 + 1.0), 1.9]] });

  // --- LES MÂTS ---
  // (parc entier : chaque mât est aussi un obstacle du monde, voir buildParc. La plupart sont dans le plan de leur
  // grillage et n'ajoutent rien, mais celui du pin à x = -7,45 est planté AU MILIEU du trou TROU_PIN : sans lui, on
  // traversait le poteau en passant le portillon depuis le talus, et la balle aussi. Au-dessus des treillis, ce sont
  // eux que la balle heurte. Ils ne retiennent pas la caméra, comme les grillages.)
  const obsDecor = scene.userData.obstaclesDecor;
  const poteau = (x, z, r, h) => { if (obsDecor) obsDecor.push({ t: 'c', x, z, r, h, qui: 'tous', type: 'poteau', camera: false, source: 'plateau' }); };
  // mât galvanisé : Ø 9,6 cm, bague noire au pied ; `penche` : décalage de la tête
  const mat = (x, z, h, bague, penche = [0, 0]) => {
    lot.tube(M.galva, V(x, 0, z), V(x + penche[0], h, z + penche[1]), 0.048, 0.047, 10);
    lot.tube(M.manchon, V(x, 0, z), V(x, bague, z), 0.056, 0.056, 10);
    poteau(x, z, 0.056, h);
  };
  // quai : z = -5,2 / -0,7 / 4,0 (photo 43 : le mât de 4,0 est à 50 cm du bout du banc blanc)
  for (const z of [-5.2, -0.7, 4.0]) mat(xQ + 0.07, z, 5.0, rnd(0.35, 0.45));
  // le coin des platanes : un mât simple, au droit du grillage des platanes ; puis, depuis l'ancien bout du passage
  // (zP0), ceux qui tiennent le filet et la lisse le long de l'esplanade, au pas du plateau (4,7 m, photos 603 et
  // 340 : les verticales claires qui s'enfilent vers le bosquet), jusqu'à celui du bout
  mat(xQ + 0.07, zE - 0.06, 5.0, rnd(0.35, 0.45));
  { const n = Math.round((zP0 - zQ0) / 4.5);
    for (let i = 0; i <= n; i++) mat(xQ + 0.07, zP0 - i * (zP0 - zQ0) / n, 5.0, rnd(0.35, 0.45)); }
  // le coin du pin : juste derrière le piquet d'angle, un rien penché vers l'extérieur
  mat(xQ + 0.09, zP + 0.09, 5.2, 0.3, [0.05, 0.05]);
  // pin : au pas de 4,35 m après une première travée de 4,2 (le poteau de D2 est au milieu d'une travée). Le
  // troisième suit le décalage de la cage de hand (cageHand, posée à -7,65 au lieu de -6,45) : à -7,45, dans le trou
  // du treillis (TROU_PIN), à 43 % de la largeur de la cage depuis son montant côté quai, comme sur les photos
  // 185625, 185626 et 1000051342. (vegetationPin garde la même valeur pour sa trouée : XM.)
  // Le dernier n'est plus contre le mur : c'est le grand mât gris du haut de l'escalier (ESCALIER.xM, photo
  // 20261007_184901), à 2,65 m du précédent (au parc entier, toujours contre le mur : voir ESCALIER).
  for (const x of [2.2, -2.15, -7.45, -10.85, -15.2, -19.55, xFinPin]) mat(cx(x), zP + 0.07, 5.2, 0.35);
  // LE POTEAU ROUILLÉ DES PLATANES (P1), au bout du grillage des platanes, à 90 cm du quai (photo 1000051603 : le
  // passage file entre lui et le grillage du quai) : Ø 11 cm, 5,30 m (il dépasse la lisse), pied rouillé sur 80 cm,
  // et en tête un bras de 55 cm tourné vers le mur — un peu vers les platanes — qui porte un petit boîtier gris
  const p1 = V(xQ - 0.9, 0, zE - 0.06);
  // (parc entier : c'est le montant du PASSAGE DU COIN, l'entrée du plateau côté platanes — photos 1000051603 et 340 :
  // le stabilisé de l'esplanade entre sur l'enrobé entre lui et le grillage du quai, 90 cm de large ; voir cloture)
  poteau(p1.x, p1.z, 0.06, 5.3);
  lot.tube(M.rouille, p1, V(p1.x, 0.8, p1.z), 0.058, 0.058, 10);
  lot.tube(M.galva, V(p1.x, 0.8, p1.z), V(p1.x, 5.3, p1.z), 0.055, 0.054, 10);
  const dir = V(-0.95, 0, -0.3).normalize(), bout = V(p1.x, 5.1, p1.z).addScaledVector(dir, 0.55);
  lot.tube(M.galva, V(p1.x, 5.1, p1.z), bout, 0.022, 0.022, 6);
  lot.boite(M.boitier, 0.35, 0.12, 0.12, bout.x + dir.x * 0.12, 5.08, bout.z + dir.z * 0.12, Math.atan2(-dir.z, dir.x));
  // la lisse de tête du quai (4,90 m), du bout du grillage au mât d'angle du pin — droite sur les mâts de
  // l'esplanade, puis, du passage au coin du pin, comme avant —, et celle du pin (5,10 m)
  // (parc entier : d'un mât à l'autre, pour que chaque tronçon suive le sol du pied de ses deux mâts, voir draperQuai)
  if (Monde.plat) lot.tube(M.galva, V(xQ + 0.07, 4.9, zQ0), V(xQ + 0.07, 4.9, zP0), 0.025, 0.025, 8);
  else {
    const n = Math.round((zP0 - zQ0) / 4.5);
    for (let i = 0; i < n; i++) lot.tube(M.galva, V(xQ + 0.07, 4.9, zP0 - i * (zP0 - zQ0) / n), V(xQ + 0.07, 4.9, zP0 - (i + 1) * (zP0 - zQ0) / n), 0.025, 0.025, 8);
  }
  lot.tube(M.galva, V(xQ + 0.07, 4.9, zP0), V(xQ + 0.13, 4.9, zP + 0.13), 0.025, 0.025, 8);
  lot.tube(M.galva, V(cx(xFinPin), 5.1, zP + 0.07), V(xQ + 0.14, 5.1, zP + 0.14), 0.025, 0.025, 8);
  // platanes : poteaux blancs de 5,20 m, Ø 10 cm, pied noir de 25 cm surmonté d'un fin anneau blanc, et en tête
  // une traverse de 3,60 m parallèle au grillage — sauf le dernier, contre le mur
  const poteauBlanc = (x, z, traverse) => {
    poteau(x, z, 0.06, 5.2);
    lot.tube(M.piedT, V(x, 0, z), V(x, 0.25, z), 0.06, 0.06, 10);
    lot.tube(M.blanc, V(x, 0.25, z), V(x, 0.28, z), 0.064, 0.064, 10);
    lot.tube(M.blanc, V(x, 0.25, z), V(x, 5.2, z), 0.05, 0.05, 10);
    if (traverse) lot.tube(M.blanc, V(x - 1.8, 5.2, z), V(x + 1.8, 5.2, z), 0.025, 0.025, 8);
  };
  for (const x of [1.8, -2.8, -7.45, -12.1, -16.7, -21.3]) poteauBlanc(cx(x), zE - 0.07, true);
  poteauBlanc(cx(xM1), zE - 0.07, false);

  lot.poser(scene, new Set([M.vertQuai, M.vertPin, M.vertPlat, M.jambePlat, M.manchon, M.piedT, M.boitier]));
}

// LA BORDURE DE BÉTON du côté du pin, près du coin du quai (photos 39 et 1000051342) : elle est AU PIED de la
// maille, pas à 45 cm devant, gris sale (0x8c8a86 : à 1,0-1,1 fois l'enrobé, comme celle du quai), 10 cm de large,
// et presque enterrée — trois centimètres qui dépassent de la terre. Du coin du quai jusqu'à x = -2,4, juste
// passé le deuxième mât du pin ; elle passe sous la bordure du quai.
function bordurePin(scene, K, cx, XS, ZO) {
  const x0 = cx(-2.4), x1 = XS;
  K.box(x1 - x0, 0.03, 0.1, new THREE.MeshStandardMaterial({ color: 0x8c8a86, roughness: 0.95 }), (x0 + x1) / 2, 0.015, ZO + 0.02, scene, false);
}

// =====================================================================
//  LES VÉHICULES GARÉS, LES ARBRES DE LA BERGE
// =====================================================================
// Le car bleu et les deux fourgons blancs le long du parc (photos 39, 42 et 43). Le car va de z = 12 à 24 :
// sur la photo 43 on le voit à droite du tronc de z = 12,5, et son logo est à z = 18,7 sur la photo 39.
// `xr` : le bord de la route côté parc ; `yRoute` : sa hauteur.
function vehiculesGares(scene, K, xr, yRoute) {
  busBleu(scene, K, xr + 1.4, 18, 1).position.y = yRoute;
  // le grand fourgon blanc : son toit dépasse le plateau d'un mètre (photo 43), on le voit au-dessus de la haie
  fourgonBlanc(scene, K, xr + 1.3, -6.6, 1).position.y = yRoute;
  voiture(scene, K, xr + 1.3, -22, 0xd9dfdb, 1, true).position.y = yRoute;
}

// LE GRAND FOURGON BLANC (photo 43) : 5,6 m de long, caisse haute de 2,6 m sur 35 cm de garde au sol (toit à
// 2,95 m au-dessus de la chaussée), cabine et capot plus bas devant. Il regarde vers +z quand dir > 0.
function fourgonBlanc(scene, K, x, z, dir) {
  const g = new THREE.Group();
  const blanc = new THREE.MeshStandardMaterial({ color: 0xe8ebe6, roughness: 0.4, metalness: 0.3 });
  const vitre = new THREE.MeshStandardMaterial({ color: 0x1d2630, roughness: 0.15, metalness: 0.6 });
  const noir = new THREE.MeshStandardMaterial({ color: 0x1a1b1c, roughness: 0.8 });
  K.box(1.95, 2.6, 4.4, blanc, 0, 1.65, -0.6, g);                         // la caisse, de z -2,8 à 1,6
  K.box(1.95, 2.3, 0.7, blanc, 0, 1.5, 1.95, g);                          // la cabine
  K.box(1.95, 0.95, 0.5, blanc, 0, 0.825, 2.55, g);                       // le capot
  const pb = K.box(1.8, 1.25, 0.04, vitre, 0, 1.9, 2.42, g, false);       // le pare-brise, couché vers l'arrière
  pb.rotation.x = -0.42;
  K.box(1.97, 0.62, 0.62, vitre, 0, 2.1, 1.95, g, false);                 // les vitres des portières
  K.box(2.0, 0.24, 0.14, noir, 0, 0.5, 2.83, g, false);                   // le pare-chocs
  const roues = [], o = new THREE.Object3D();
  for (const sx of [-0.9, 0.9]) {
    for (const sz of [1.95, -1.8]) {
      o.position.set(sx, 0.36, sz); o.rotation.set(0, 0, Math.PI / 2); o.updateMatrix();
      roues.push(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 14).applyMatrix4(o.matrix));
    }
  }
  g.add(new THREE.Mesh(mergeGeometries(roues), noir));
  g.position.set(x, 0, z); g.rotation.y = dir > 0 ? 0 : Math.PI; scene.add(g);
  return g;
}

// LES ARBRES DE LA BERGE, le long du parapet (photo 39) : de grands feuillus de 14 à 18 m, un tous les huit
// mètres, dont on voit les houppiers clairs au-dessus du car. Sans eux, sous le rideau du quai et au-dessus du
// car on voyait le ciel et les immeubles de l'île, à 130 m. Troncs et feuillages cousus en deux maillages.
// `x` : l'alignement ; `y` : le niveau du trottoir de la berge.
function arbresBerge(scene, K, x, y) {
  const bois = [], touffes = [], infos = [], UP = new THREE.Vector3(0, 1, 0), o = new THREE.Object3D(), plan = new THREE.PlaneGeometry(1, 1);
  const tronc = (a, b, r0, r1) => {
    const d = new THREE.Vector3().subVectors(b, a);
    o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
    o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(UP, d.clone().normalize()); o.updateMatrix();
    bois.push(new THREE.CylinderGeometry(r1, r0, d.length(), 7).applyMatrix4(o.matrix));
  };
  // un tous les huit mètres, et deux de plus en face du car (z = 8 et 16 : voir plus bas)
  const ZB = [8, 16];
  for (let z = -60; z <= 60; z += 8) ZB.push(z);
  for (const z of ZB) {
    // en face du jardin (z 30 à 52), la berge est dégagée : de la terrasse on voit la Seine (photo du jardin). Les
    // arbres de z = 20 et 28 restent : sans eux, depuis le plateau, entre la haie et le bas du rideau côté pin, on
    // voyait les façades blanches de l'île (photos 1000051343 et 339 : des feuillages, pas un immeuble)
    if (z > 30 && z < 52) continue;
    // En face du car (z 4 à 20), des couronnes BASSES et serrées (un arbre tous les quatre mètres), qui descendent
    // à deux mètres au-dessus du trottoir de la berge. Depuis le plateau, par-dessus le car et sous le rideau (entre
    // 1,5 et 2 m au droit du grillage), le regard passait SOUS des couronnes à 4-6 m et entre elles, et filait
    // jusqu'aux immeubles de l'île ; la photo 343 n'y montre que des feuillages clairs. (Pas celui de z = 28 : sur la
    // photo 342, au-dessus du car, le ciel du couchant passe sous les couronnes.)
    const h = rnd(14, 18), R = rnd(3.3, 4.1), fut = z > 0 && z < 23 ? rnd(2.4, 3.2) : rnd(4.5, 6);
    const pied = new THREE.Vector3(x + rnd(-0.3, 0.3), y, z + rnd(-1, 1));
    const tete = new THREE.Vector3(pied.x + rnd(-0.2, 0.2), y + fut, pied.z + rnd(-0.2, 0.2));
    tronc(pied, tete, 0.28, 0.21);
    for (let k = 0; k < 3; k++) {
      const a = Math.random() * 6.28;
      tronc(tete, new THREE.Vector3(tete.x + Math.cos(a) * 1.6, y + fut + rnd(2.5, 4), tete.z + Math.sin(a) * 1.6), 0.13, 0.06);
    }
    // le houppier : un ovoïde de sept à huit mètres de large, du haut du fût à la cime
    const yc = y + (fut + h) / 2, HV = (h - fut) / 2 + 0.4, c = [tete.x, yc, tete.z];
    for (let i = 0; i < 52; i++) {
      const u = Math.random() * 6.28, v = Math.acos(rnd(-1, 1)), rr = Math.pow(Math.random(), 0.4);
      const px = tete.x + Math.cos(u) * Math.sin(v) * R * rr, pz = tete.z + Math.sin(u) * Math.sin(v) * R * rr;
      const py = yc + Math.cos(v) * HV * rr, s = rnd(2.2, 3.2), ry = Math.random() * Math.PI, t = rnd(0.9, 1.12);
      for (const [dry, sy] of [[0, 1], [Math.PI / 2, 0.9]]) {
        o.quaternion.identity(); o.position.set(px, py, pz); o.rotation.set(rnd(-0.3, 0.3), ry + dry, rnd(-0.3, 0.3));
        o.scale.set(s, s * sy, 1); o.updateMatrix();
        touffes.push(plan.clone().applyMatrix4(o.matrix));
        infos.push({ c, r: Math.max(R, HV), t });
      }
    }
  }
  const t = new THREE.Mesh(mergeGeometries(bois), new THREE.MeshStandardMaterial({ color: 0x8a8272, roughness: 0.9 }));
  t.castShadow = true; scene.add(t);
  const feuilles = materiauFeuilles(feuillageBerge(K.canvasTex), { trans: 0.28 });
  const c = new THREE.Mesh(coudre(touffes, infos), feuilles);
  c.castShadow = true; c.receiveShadow = false; c.customDepthMaterial = feuilles.userData.ombre;
  scene.add(c); declarerFeuillage(scene, c);
}

// Feuillage de la berge : petites feuilles serrées, vert clair éclairé (#8a9978), vert d'ombre (#5c6854) au fond
// de la touffe, quelques pointes plus claires (#a4af92). Désaturé (0,35 -> 0,2) : au-dessus du car et au bout
// du rideau côté pin (photos 39 et 42), ces houppiers faisaient des sucettes vert vif.
function feuillageBerge(canvasTex) { return avecTeinte(feuillageBergeBrut(canvasTex), TEINTES_FEUILLES.berge); }
function feuillageBergeBrut(canvasTex) {
  const cuite = texCuite(feuillageBergeBrut, arguments, [saigner]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 620; i++) {
      const fond = i < 240, t = Math.random();
      const c = fond ? [92, 104, 84] : t < 0.75 ? [138, 153, 120] : [164, 175, 146];
      const k = rnd(0.88, 1.1);
      // les feuilles restent dans un disque : la touffe a un contour arrondi, pas celui de la tuile
      const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * w * 0.44;
      g.fillStyle = `rgb(${c[0] * k | 0},${c[1] * k | 0},${c[2] * k | 0})`;
      g.save(); g.translate(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); g.rotate(Math.random() * 6.28);
      g.beginPath(); g.ellipse(0, 0, rnd(3, 6), rnd(5, 10), 0, 0, 6.29); g.fill(); g.restore();
    }
    saigner(g);                                                  // (lot L8 : la couleur sous l'alpha nul, voir saigner)
  }, [1, 1], true, 8);
}

// =====================================================================
//  LE MUR DE MEULIÈRE
// =====================================================================
// Moellons de calcaire beige-crème en assises irrégulières, joints gris en creux, chaperon sombre (photo du 07/10 :
// voir meuliereTexture). C'est un mur de SOUTÈNEMENT : derrière,
// le talus part de sa crête (2,30 m) et monte vers le parc. Il ne longe que le plateau (de zMin à zMax) : le
// long du bosquet, c'est le mur en ligne brisée de fondPlatanes() (murBosquet) qui le prolonge. Au-dessus du
// plateau, un grillage de panneaux verts à 60 cm en retrait, sur toute la longueur ; quatre touffes de fleurs
// jaunes derrière le chaperon. Ce qui pousse sur le talus est dans fondMur. `o.zTalus0` / `o.zTalus` : les deux bouts du
// talus et du parc haut. `o.abords` : le mur seul — ce qui est derrière lui (l'allée, le grillage sur le chaperon)
// vient des photos du 28/09 et de abordsMur. (Le mur va de zMin - 0,3 à zMax + 0,3.)
// PARC ENTIER (`o.zFin`, js/parc/index.js) : le mur s'arrête à zFin côté pin (la rampe est contourne son bout), le talus
// et le faux parc haut cèdent la place au relief (le replat à +1,45 derrière le mur), et le grillage du haut descend
// jusqu'à ce replat. Vu du plateau, rien ne bouge : la toile du parement est celle du mur entier, et la partie gardée
// garde ses coordonnées de texture (même pierre au même endroit, au moellon près), de même pour la maille du grillage.
// (Avec `o.abords`, le mur finit déjà là où les photos le montrent, et zFin n'a plus lieu d'être.)
function murMeuliere(scene, K, XN, zMin, zMax, matHerbe, o = {}) {
  const H = 2.3, EP = 0.45, L = zMax - zMin + 0.6, zc = (zMin + zMax) / 2, x = XN - EP / 2;
  const entier = o.zFin !== undefined;
  const tex = meuliereTexture(K.canvasTex, L, H);
  // (relief : les joints en creux, la pierre presque plate — 0,5 depuis le 30/09, pour que le creux des joints tienne
  // sous la lumière rasante ; à 1,2, avec la pierre bombée d'alors, chaque pierre sortait en bosse, comme un galet)
  // UNE PAROI VERTICALE ne voit que la moitié du ciel : même avec la pierre claire, le mur sortait à 0,94 fois
  // l'enrobé (pose de la photo 601), 1,03 avec une émission de 0,06. Sur les photos 341 et 601 il est un peu plus
  // clair que lui : une émission prise dans la pierre elle-même (0,09) le porte à 1,09, sans le saturer (0,08).
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, bumpMap: tex.userData.relief, bumpScale: 0.5,
    emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.09 });
  mat.userData.surfaceParc = 'meuliere';
  // la longueur montée (Lm, centrée en zm) : tout le mur, ou jusqu'à zFin
  const zB = entier ? Math.min(zc + L / 2, o.zFin) : zc + L / 2;
  const Lm = entier ? zB - (zc - L / 2) : L, zm = entier ? (zB + zc - L / 2) / 2 : zc;
  const geoFace = new THREE.PlaneGeometry(Lm, H);
  if (entier) {
    // u = 0 au bout côté pin : la partie gardée reprend les u qu'elle avait sur le mur entier (de u0 à 1)
    const u0 = (zc + L / 2 - zB) / L, uv = geoFace.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * (1 - u0));
  }
  const face = new THREE.Mesh(geoFace, mat);
  face.rotation.y = Math.PI / 2; face.position.set(XN + 0.002, H / 2, zm); face.receiveShadow = true; scene.add(face);
  K.box(EP, H, Lm, new THREE.MeshStandardMaterial({ color: 0xa8967a, roughness: 0.95 }), x - 0.01, H / 2, zm, scene);
  // chaperon : une dalle de béton de 12 cm qui déborde de 7 cm (photos 341 et 601 : la bande lisse du haut, détachée de
  // la pierre par son ombre — dessinée en tête du parement, meuliereTexture). SOMBRE (07/10, photo 20261007_184901 : un
  // gris d'ardoise, au niveau de l'enrobé, sur la pierre crème ; le gris moyen d'avant, 0x9d9c96, la fondait dans le mur)
  K.box(EP + 0.14, 0.12, Lm, new THREE.MeshStandardMaterial({ color: 0x6b6a66, roughness: 0.9 }), x, H + 0.06, zm, scene);
  // `o.abords` (photos du 28/09, voir abordsMur) : derrière le mur, ce n'est pas un talus qui part de la crête mais
  // une allée un mètre plus bas, et le grillage est posé SUR le chaperon. Le sol, l'allée, le parement arrière et le
  // grillage sont alors construits par abordsMur ; il n'y a plus ici que le mur, sa face et son chaperon.
  if (o.abords) return;
  // le talus : il part de la crête et monte de trois mètres sur douze, puis le parc est à plat
  const PENTE = Math.atan2(3.0, 12);
  const LT = 12 / Math.cos(PENTE);
  // `o.zTalus0` / `o.zTalus` : le talus et le parc haut vont de l'un à l'autre (côté platanes, le talus du mur
  // du bosquet prend le relais ; côté pin, le jardin)
  const zT0 = o.zTalus0 ?? zc - (L + 60) / 2, zT1 = o.zTalus ?? zc + (L + 60) / 2, LZT = zT1 - zT0, zTc = (zT0 + zT1) / 2;
  if (!entier) {
    const talus = new THREE.Mesh(new THREE.PlaneGeometry(LZT, LT), matHerbe);
    talus.rotation.order = 'YXZ'; talus.rotation.y = Math.PI / 2; talus.rotation.x = -Math.PI / 2 + PENTE;
    talus.position.set(XN - EP - 6, H + 1.5 - 0.02, zTc); talus.receiveShadow = true; scene.add(talus);
    const haut = new THREE.Mesh(new THREE.PlaneGeometry(80, LZT), matHerbe);
    haut.rotation.x = -Math.PI / 2; haut.position.set(XN - EP - 12 - 40, H + 3.0 - 0.02, zTc); haut.receiveShadow = true; scene.add(haut);
  }
  const yT = (d) => H + 0.05 + d * Math.tan(PENTE);                  // hauteur du talus à d m derrière le mur
  // LE GRILLAGE DU HAUT DU MUR (photos du 27/09 : 601, 600 à droite) : pas une grille de fer noire, des panneaux
  // de treillis soudé vert sombre de 1,3 m sur des poteaux fins, à 60 cm derrière le chaperon, sur toute la longueur.
  const xg = XN - EP - 0.6, yg = yT(0.6), lg = zMax - zMin;
  if (!entier) {
    const panneau = new THREE.Mesh(new THREE.PlaneGeometry(lg, 1.3),
      materiauGrillage(K.tiled(grillageSoude(K.canvasTex), lg, 1.3, 1.0), 0x7f9a86));
    panneau.rotation.y = Math.PI / 2; panneau.position.set(xg, yg + 0.65, (zMin + zMax) / 2); scene.add(panneau);
    declarerFeuillage(scene, panneau);
    const vertPot = new THREE.MeshStandardMaterial({ color: 0x2c3a30, roughness: 0.6, metalness: 0.3 });
    const nP = Math.floor(lg / 2.5) + 1, poteaux = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), vertPot, nP);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < nP; i++) { m4.makeTranslation(xg, yg + 0.66, zMin + i * lg / (nP - 1)); poteaux.setMatrixAt(i, m4); }
    scene.add(poteaux);
  } else {
    // le haut du panneau reste à yg + 1,3 ; il descend jusqu'au plus bas du replat sous lui. La maille garde sa place
    // (décalage de la texture : sa tuile de 1 m repart du bout côté pin et du bas d'avant, comme sur le mur entier)
    const z1 = Math.min(zMax, o.zFin - 0.3), lgm = z1 - zMin;
    let ys = Infinity;
    for (let z = zMin; z <= z1 + 1e-6; z += 0.5) ys = Math.min(ys, Monde.sol(xg, z) - 0.05);
    const hp = yg + 1.3 - ys, tg = K.tiled(grillageSoude(K.canvasTex), lgm, hp, 1.0);
    // (c'est aussi un obstacle du monde, voir buildParc : on ne le traverse pas en venant de l'allée du mur, et la balle
    // lobée par-dessus le mur y rebondit ; on le voit au travers. Sa hauteur est comptée depuis le replat sous lui, qui
    // monte de +1,45 à +2,25 vers le pin, alors que le haut du panneau reste à yg + 1,3 : on le déclare par tronçons de
    // 2 m, chacun à sa hauteur, pour que la balle soit arrêtée jusqu'au haut du panneau dessiné, pas 1 m plus bas.)
    const obs = scene.userData.obstaclesDecor;
    if (obs) {
      for (let za = zMin; za < z1 - 1e-3; za += 2) {
        const zb = Math.min(z1, za + 2), h = Math.round((yg + 1.3 - Monde.sol(xg, (za + zb) / 2)) * 100) / 100;
        obs.push({ t: 's', x0: xg, z0: za, x1: xg, z1: zb, e: 0.06, h, qui: 'tous', type: 'grille', camera: false, source: 'grillage du haut du mur' });
      }
    }
    tg.offset.set(zMax - z1, ys - yg);
    const panneau = new THREE.Mesh(new THREE.PlaneGeometry(lgm, hp), materiauGrillage(tg, 0x7f9a86));
    panneau.rotation.y = Math.PI / 2; panneau.position.set(xg, (ys + yg + 1.3) / 2, (zMin + z1) / 2); scene.add(panneau);
    declarerFeuillage(scene, panneau);
    // les poteaux aux mêmes places, chacun du replat jusqu'à la même tête
    const vertPot = new THREE.MeshStandardMaterial({ color: 0x2c3a30, roughness: 0.6, metalness: 0.3 });
    const nP = Math.floor(lg / 2.5) + 1, places = [];
    for (let i = 0; i < nP; i++) { const z = zMin + i * lg / (nP - 1); if (z <= z1 + 0.01) places.push(z); }
    const poteaux = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), vertPot, places.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    places.forEach((z, i) => {
      const bas = Monde.sol(xg, z) - 0.05, tete = yg + 0.66 + 0.7;
      m4.compose(p.set(xg, (bas + tete) / 2, z), q, s.set(1, (tete - bas) / 1.4, 1)); poteaux.setMatrixAt(i, m4);
    });
    scene.add(poteaux);
  }
  // les fleurs jaunes derrière le chaperon : pas un massif continu, QUATRE touffes clairsemées (photos 341 et 601 :
  // quatre taches jaune d'or espacées au ras du chaperon, du milieu du mur vers les platanes)
  const fleurs = [], ob = new THREE.Object3D(), plan = new THREE.PlaneGeometry(1, 1);
  for (const zt of [2.0, 0.5, -1.2, -4.3]) {
    for (let i = 0; i < 25; i++) {
      const d = rnd(0.2, 0.7);
      ob.position.set(XN - EP - d, yT(d) + rnd(0.05, 0.3), zt + rnd(-0.45, 0.45)); ob.rotation.set(rnd(-0.5, 0.5), rnd(0, 3.14), 0);
      const s = rnd(0.2, 0.35); ob.scale.set(s, s, 1); ob.updateMatrix(); fleurs.push(plan.clone().applyMatrix4(ob.matrix));
    }
  }
  const matFleurs = new THREE.MeshStandardMaterial({ map: fleursTexture(K.canvasTex), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
  scene.add(new THREE.Mesh(mergeGeometries(fleurs), matFleurs));
}

// Touffes de fleurs jaune d'or (#c9a33a, photo 601 : un jaune chaud, pas citron) sur leur feuillage, clairsemées.
function fleursTexture(canvasTex) {
  const cuite = texCuite(fleursTexture, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgb(${Math.floor(rnd(50, 80))},${Math.floor(rnd(90, 120))},${Math.floor(rnd(40, 55))})`;
      g.beginPath(); g.ellipse(rnd(0.1, 0.9) * w, rnd(0.3, 0.95) * h, rnd(3, 7), rnd(2, 4), Math.random() * 3, 0, 6.29); g.fill();
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = Math.random() < 0.7 ? '#c9a33a' : '#d9b24a';
      g.beginPath(); g.arc(rnd(0.1, 0.9) * w, rnd(0.1, 0.8) * h, rnd(2, 4), 0, 6.29); g.fill();
    }
  }, [1, 1], true, 4);
}

// LE MUR DE MOELLONS (photo de Haythem du 07/10/2026, 18 h 49, prise du plateau par temps couvert : tools/photos_reference/
// parc_escalier_2026-10-07/20261007_184901.jpg ; sa capture du jeu, jeu_avant.webp). Des moellons de CALCAIRE BEIGE-CRÈME
// équarris grossièrement : des rectangles aux coins cassés et émoussés, de 20 à 50 cm de long sur 15 à 28 de haut, montés
// en ASSISES irrégulières — à peu près horizontales, de hauteurs inégales, quelques gros moellons à cheval sur deux
// assises, de petites pierres de calage —, et des joints de mortier GRIS, LARGES (3 à 5 cm) et EN CREUX, dans l'ombre de
// l'arête de la pierre du dessus. La pierre n'est pas d'un seul ton : crème, beige, paille, gris chaud ; plus grise et
// plus sale vers le pied. (Le chaperon, une dalle sombre, et le grillage posé dessus : voir murMeuliere.)
// MESURÉ sur la photo : la pierre (son tiers le plus clair) à 35-40° de teinte, saturation 0,08 à 0,16 ; le mortier à
// 0,75 fois la pierre, le fond des joints à 0,45 ; six à huit pierres par 2,5 m de mur, huit à neuf assises sur sa hauteur.
// L'ANCIEN DESSIN (jusqu'au 07/10, d'après les photos du 27/09 prises à contre-jour) : un calcaire presque blanc et froid,
// en cellules d'un diagramme de puissance — des polygones convexes à arêtes droites, aux joints sombres et réguliers :
// à l'écran, un « dallage » gris en opus incertum, sans assises ni couleur (la capture de Haythem).
// LE DESSIN : les assises d'abord (16 à 29 cm), puis chaque assise remplie de gauche à droite de pierres de largeur tirée
// au hasard (un gros moellon sur cinq ou six descend dans l'assise suivante) ; chaque pierre est un quadrilatère aux coins
// secoués (±1,6 cm), aux côtés souvent en BIAIS de 3 à 6° (un trapèze, une pierre penchée), dont un ou deux coins sont
// cassés, émoussé de 1 à 3 cm, lu par sa DISTANCE SIGNÉE (négative dedans). Un pixel ne lit que les pierres de son assise
// et des deux voisines (des seaux de 8 px), au point déplacé d'un bruit lent (±2 cm : des arêtes taillées au marteau, pas
// tirées à la règle) et d'une onde plus lente encore (±3 cm sur 70 cm : les assises ondulent). Deux images sortent du
// même dessin : la COULEUR et le RELIEF (texture à part, `tex.userData.relief` : joints en creux, pierre presque plate,
// bombée sur ses bords).
// LA LUMINANCE MOYENNE (08/10, second juge : la première version du 07/10 assombrissait le mur de 10 à 12 % à l'écran,
// mur / enrobé 0,74 au lieu de 0,81, quand la photo le montre bien plus clair que l'enrobé) : la toile du mur du plateau à
// 197 de luminance moyenne (l'opus incertum d'avant : 194, la version du 07/10 : 176). Mesuré à l'écran, soleil, qualité
// haute, plateau seul : de face 117,6 (avant le 07/10 : 114,8 ; le 07/10 : 100,8), mur / enrobé 0,81 ; vue de la capture
// de Haythem 115,5 (113,1 ; 100,7), 0,87. Dessinée un rien moins chaude que la photo (rouge / bleu 1,10 en moyenne, 1,13
// sur la photo) : le soleil de l'après-midi la réchauffe à l'écran.
function meuliereTexture(canvasTex, L, H) {
  const cuite = texCuite(meuliereTexture, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  const PX = 110, cm = PX / 100, w = Math.min(8192, Math.round(L * PX)), h = Math.round(H * PX);
  // la pierre : crème, beige clair, beige, beige sombre, paille, gris chaud, gris beige, pâle, beige ombré. (08/10, second
  // juge : 9 % plus claire, et les deux gris réchauffés — presque neutres, ils viraient au gris bleu sous le ciel du jeu)
  const PIERRES = [[250, 241, 226], [245, 235, 218], [240, 229, 211], [234, 221, 202], [246, 232, 206], [238, 232, 220],
                   [231, 224, 212], [249, 243, 231], [226, 215, 199]];
  // une pointe de crème (3 fois sur 10) ou de gris froid (1,5 sur 10), en plus de l'écart de clarté de chaque pierre
  const NUANCES = [[5, 2, -5], [-3, -1, 3]];
  // ---- LES ASSISES, du chaperon au pied ----
  const assises = [];
  for (let y = 0; y < h + 1;) { const ha = rnd(16, 29) * cm; assises.push({ y0: y, y1: y + ha }); y += ha; }
  const nA = assises.length, rang = new Int16Array(h);
  for (let k = 0, y = 0; y < h; y++) { while (k < nA - 1 && y >= assises[k].y1) k++; rang[y] = k; }
  // ---- LES PIERRES ----
  const SEAU = 8, NB = Math.ceil(w / SEAU) + 2, seaux = assises.map(() => Array.from({ length: NB }, () => []));
  const pierres = [];
  const poser = (k0, k1, x0, x1, ya, yb) => {
    const r = rnd(1, 3) * cm, j = rnd(1.4, 2.5) * cm + r, e = () => rnd(-1.6, 1.6) * cm;
    if (x1 - x0 < 2 * j + 3 * cm || yb - ya < 2 * j + 3 * cm) return;
    const P = [[x0 + j + e(), ya + j + e()], [x1 - j + e(), ya + j + e()], [x1 - j + e(), yb - j + e()], [x0 + j + e(), yb - j + e()]];
    // (08/10, second juge : les pierres de la photo ne sont pas des briques) DES CÔTÉS EN BIAIS, de 3 à 6° : un coin
    // rentre vers l'intérieur le long d'un côté — le joint s'ouvre en coin, la pierre devient un trapèze ou un
    // quadrilatère penché. Toujours vers l'intérieur : la pierre ne mord jamais sur sa voisine.
    const lp = P[1][0] - P[0][0], hp = P[3][1] - P[0][1], biais = (a, b) => Math.tan(rnd(a, b) * Math.PI / 180);
    if (Math.random() < 0.4) P[Math.random() < 0.5 ? 0 : 3][0] += Math.min(0.2 * lp, hp * biais(3, 6));      // côté gauche
    if (Math.random() < 0.4) P[Math.random() < 0.5 ? 1 : 2][0] -= Math.min(0.2 * lp, hp * biais(3, 6));      // côté droit
    if (Math.random() < 0.3) P[Math.random() < 0.5 ? 0 : 1][1] += Math.min(0.25 * hp, lp * biais(2, 5));     // le dessus
    if (Math.random() < 0.2) P[Math.random() < 0.5 ? 3 : 2][1] -= Math.min(0.25 * hp, lp * biais(2, 5));     // le dessous
    // un ou deux coins cassés en biais (des éclats de 2 à 7 cm)
    const nc = Math.random() < 0.5 ? 1 : Math.random() < 0.55 ? 2 : 0;
    for (let c = 0; c < nc; c++) {
      const i = Math.floor(Math.random() * P.length), a = P[i], b = P[(i + P.length - 1) % P.length], d = P[(i + 1) % P.length];
      const la = Math.hypot(b[0] - a[0], b[1] - a[1]), ld = Math.hypot(d[0] - a[0], d[1] - a[1]);
      const ta = Math.min(0.4, rnd(2, 7) * cm / la), td = Math.min(0.4, rnd(2, 7) * cm / ld);
      P.splice(i, 1, [a[0] + (b[0] - a[0]) * ta, a[1] + (b[1] - a[1]) * ta], [a[0] + (d[0] - a[0]) * td, a[1] + (d[1] - a[1]) * td]);
    }
    const c = PIERRES[Math.floor(Math.random() * PIERRES.length)], v = rnd(-11, 9);
    const tn = Math.random(), nu = tn < 0.3 ? NUANCES[0] : tn < 0.45 ? NUANCES[1] : [0, 0, 0], kn = rnd(0.5, 1.3);
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]), rs = Math.random();
    const s = {
      P: Float64Array.from(P.flat()), n: P.length, r,
      bx0: Math.min(...xs), bx1: Math.max(...xs), by0: Math.min(...ys), by1: Math.max(...ys),
      cx: (x0 + x1) / 2, cy: (ya + yb) / 2,
      c: [c[0] + v + nu[0] * kn, c[1] + v + nu[1] * kn, c[2] + v + nu[2] * kn],
      // une pierre sur dix grisée par les pluies, une sur dix un rien plus terne ; et sa FACE, dressée au marteau : un
      // peu plus claire d'un côté que de l'autre (±3 %)
      sale: rs < 0.1 ? rnd(0.85, 0.92) : rs < 0.2 ? rnd(0.94, 0.98) : 1, fx: rnd(-0.03, 0.03), fy: rnd(-0.03, 0.03),
    };
    pierres.push(s);
    const m = 3 * cm, i0 = Math.max(0, Math.floor((s.bx0 - m) / SEAU) + 1), i1 = Math.min(NB - 1, Math.floor((s.bx1 + m) / SEAU) + 1);
    for (let k = Math.max(0, k0 - 1); k <= Math.min(nA - 1, k1 + 1); k++) for (let i = i0; i <= i1; i++) seaux[k][i].push(pierres.length - 1);
  };
  // les gros moellons d'une assise qui descendent dans la suivante : [x0, x1, bas]
  const occupe = assises.map(() => []);
  for (let k = 0; k < nA; k++) {
    const A = assises[k];
    for (let x = -rnd(0, 30) * cm; x < w + 10 * cm;) {
      const lw = (Math.random() < 0.13 ? rnd(10, 18) : rnd(22, 50)) * cm;
      const occ = occupe[k].find(([a, b]) => x < b - 1e-6 && x + lw > a);
      if (occ) {
        // la place qui reste avant le gros moellon, puis une pierre plate sous lui (s'il en reste la hauteur)
        if (occ[0] - x > 9 * cm) poser(k, k, x, occ[0], A.y0, A.y1);
        if (A.y1 - occ[2] > 8 * cm) poser(k, k, occ[0], occ[1], occ[2], A.y1);
        x = Math.max(x, occ[1]);
        continue;
      }
      const gros = lw > 30 * cm && k + 1 < nA && Math.random() < 0.18;
      const B = gros ? assises[k + 1] : null, yb = gros ? B.y0 + rnd(0.45, 0.75) * (B.y1 - B.y0) : A.y1;
      poser(k, gros ? k + 1 : k, x, x + lw, A.y0, yb);
      if (gros) occupe[k + 1].push([x, x + lw, yb]);
      x += lw;
    }
  }
  // distance signée à un polygone convexe (négative dedans), émoussée de r
  const distance = (s, px, py) => {
    const P = s.P, n = s.n;
    let d = Infinity, sg = 1;
    for (let i = 0, j = n - 1; i < n; j = i, i++) {
      const xi = P[2 * i], yi = P[2 * i + 1], ex = P[2 * j] - xi, ey = P[2 * j + 1] - yi, wx = px - xi, wy = py - yi;
      const t = Math.min(1, Math.max(0, (wx * ex + wy * ey) / (ex * ex + ey * ey))), bx = wx - ex * t, by = wy - ey * t;
      d = Math.min(d, bx * bx + by * by);
      const c1 = py >= yi, c2 = py < P[2 * j + 1], c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) sg = -sg;
    }
    return sg * Math.sqrt(d) - s.r;
  };
  // les arêtes cassées : un bruit lent de ±2 cm en x et ±1,5 cm en y, plus un bruit fin de ±0,7 cm ; la face des pierres,
  // un grain de 5 cm (±5 %) — un moellon brut, pas une dalle sciée
  const lisseW = (t) => t * t * (3 - 2 * t);
  const grilleW = (c) => { const gx = Math.ceil(w / c) + 3, gy = Math.ceil(h / c) + 3; return { c, gx, v: Float32Array.from({ length: gx * gy }, () => rnd(-1, 1)) }; };
  const bruitW = (G, x, y) => {
    const u = x / G.c + 1, v = y / G.c + 1, i = Math.floor(u), j = Math.floor(v), fu = lisseW(u - i), fv = lisseW(v - j), o = j * G.gx + i, t = G.v;
    return (t[o] * (1 - fu) + t[o + 1] * fu) * (1 - fv) + (t[o + G.gx] * (1 - fu) + t[o + G.gx + 1] * fu) * fv;
  };
  // (08/10) et une ONDE lente des assises, ±3 cm sur 70 cm : elles ne filent plus droit comme des rangs de briques, les
  // pierres y penchent de quelques degrés avec elles
  const WX1 = grilleW(9), WY1 = grilleW(9), WX2 = grilleW(3), WY2 = grilleW(3), FACE = grilleW(5.5), ONDE = grilleW(75);
  const qui = new Int32Array(w * h), dist = new Float32Array(w * h), dessus = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const xw = x + 2.2 * bruitW(WX1, x, y) + 0.8 * bruitW(WX2, x, y);
      const yw = y + 1.6 * bruitW(WY1, x, y) + 0.8 * bruitW(WY2, x, y) + 3.3 * bruitW(ONDE, x, y);
      const k = rang[Math.min(h - 1, Math.max(0, Math.round(yw)))], b = Math.min(NB - 1, Math.max(0, Math.floor(xw / SEAU) + 1));
      let best = Infinity, bi = -1;
      for (const idx of seaux[k][b]) {
        const s = pierres[idx];
        const dx = Math.max(s.bx0 - xw, 0, xw - s.bx1), dy = Math.max(s.by0 - yw, 0, yw - s.by1);
        if (Math.hypot(dx, dy) - s.r > best) continue;
        const d = distance(s, xw, yw);
        if (d < best) { best = d; bi = idx; }
      }
      const o = y * w + x;
      qui[o] = bi; dist[o] = bi < 0 ? 6 * cm : best;
      dessus[o] = bi >= 0 && pierres[bi].cy < yw ? 1 : 0;                  // la pierre la plus proche est au-dessus
    }
  }
  const tex = canvasTex(w, h, (g) => {
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0, o = 0; y < h; y++) {
      // vers le pied, la pierre grisée et salie (dernier tiers du mur)
      const pied = Math.min(1, Math.max(0, (y / h - 0.62) / 0.38));
      for (let x = 0; x < w; x++, o++) {
        const k = o * 4, e = dist[o];
        if (e >= 0) {
          // le MORTIER : gris clair, grenu, proche du ton de la pierre (photo) ; dans l'ombre sous l'arête de la pierre du
          // dessus, plus clair contre celle du dessous (08/10, second juge : 174 et une ombre à 0,66 faisaient une bande
          // brune et sombre entre les pierres)
          const ombre = dessus[o] ? 0.78 + 0.18 * Math.min(1, e / (2.2 * cm)) : 0.88 + 0.08 * Math.min(1, e / (1.5 * cm));
          const gr = rnd(-9, 9);
          d[k] = (190 + gr) * ombre; d[k + 1] = (186 + gr) * ombre; d[k + 2] = (178 + gr) * ombre;
        } else {
          const s = pierres[qui[o]], ei = -e;
          const bord = Math.min(1, ei / (4 * cm));                           // émoussée, un peu plus sombre au bord
          const face = 1 + s.fx * (x - s.cx) / (30 * cm) + s.fy * (y - s.cy) / (20 * cm) + 0.05 * bruitW(FACE, x, y);
          const k0 = (0.94 + 0.06 * bord) * face * s.sale * (1 - 0.07 * pied);
          const gr = rnd(-10, 10), pore = Math.random() < 0.012 ? -38 : 0;
          let r = s.c[0] * k0 + gr + pore, gg = s.c[1] * k0 + gr + pore, b = s.c[2] * k0 + gr + pore;
          const lum = 0.3 * r + 0.59 * gg + 0.11 * b, des = 0.45 * pied;      // (et désaturée vers le pied)
          r += (lum - r) * des; gg += (lum - gg) * des; b += (lum - b) * des;
          d[k] = r; d[k + 1] = gg; d[k + 2] = b;
        }
        d[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    // L'OMBRE DU CHAPERON (photos 341, 601 et 20261007_184901) : la dalle déborde, les dix premiers centimètres du parement
    // sont dans son ombre — une ligne sombre qui détache le chaperon de la pierre claire
    const oc = g.createLinearGradient(0, 0, 0, 0.1 * PX);
    oc.addColorStop(0, 'rgba(35,33,30,0.6)'); oc.addColorStop(1, 'rgba(35,33,30,0)');
    g.fillStyle = oc; g.fillRect(0, 0, w, 0.1 * PX);
    // le pied du mur, plus sombre (terre, éclaboussures) ; des coulures grises sous le chaperon ; lichens noirs
    const gr = g.createLinearGradient(0, h * 0.78, 0, h);
    gr.addColorStop(0, 'rgba(70,64,54,0)'); gr.addColorStop(1, 'rgba(70,64,54,0.26)');
    g.fillStyle = gr; g.fillRect(0, h * 0.78, w, h * 0.22);
    for (let i = 0; i < w / 50; i++) {
      const x = Math.random() * w, l = rnd(0.1, 0.45) * h;
      const c = g.createLinearGradient(0, 0, 0, l);
      c.addColorStop(0, 'rgba(90,88,82,0.16)'); c.addColorStop(1, 'rgba(90,88,82,0)');
      g.fillStyle = c; g.fillRect(x, 0, rnd(3, 9), l);
    }
    for (let i = 0; i < w / 6; i++) {
      g.fillStyle = `rgba(42,40,34,${rnd(0.08, 0.22)})`;
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, rnd(0.6, 2.2), 0, 6.29); g.fill();
    }
  }, null, false, 16);
  tex.userData.relief = canvasTex(w, h, (g) => {
    const img = g.createImageData(w, h), d = img.data;
    for (let o = 0, n = w * h; o < n; o++) {
      const e = dist[o];
      // des joints EN CREUX (95 au ras de la pierre, 60 au fond, atteint à 2 cm de son arête) ; la pierre presque plate,
      // bombée sur ses quatre premiers centimètres (150 -> 175) et grenue
      const v = (e >= 0 ? 95 - 35 * Math.min(1, e / (2 * cm)) : 150 + 25 * Math.min(1, -e / (4 * cm))) + rnd(-8, 8), k = o * 4;
      d[k] = d[k + 1] = d[k + 2] = Math.max(0, Math.min(255, v)); d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, null, false, 16);
  tex.userData.relief.colorSpace = THREE.NoColorSpace;
  return tex;
}

// =====================================================================
//  L'ESCALIER DU BOUT DU MUR (photo de Haythem du 07/10/2026, 18 h 49)
// =====================================================================
// Entre le grand mât gris où s'arrête le grillage du pin et la face du mur de soutènement, le coin du plateau est
// OUVERT : cinq marches de béton montent au chemin du bout du mur (voir ESCALIER). Ce que montre la photo 20261007_184901
// (tools/photos_reference/parc_escalier_2026-10-07/), prise du plateau, et sa vue agrandie :
//  - cinq contremarches de 16 à 17 cm, des girons d'une trentaine de centimètres ; un béton gris, sale, les NEZ USÉS ET
//    ARRONDIS, plus clairs, la terre et les feuilles mortes au fond de chaque giron ;
//  - à gauche, contre le mât, un LIMON de béton qui suit la pente ; à droite, les deux premières marches vont jusqu'au
//    mur, les trois du haut sont bordées d'un petit limon contre lui ;
//  - en haut, un palier de béton plus clair, au niveau du chemin, puis la pelouse ; la haie dense à gauche, derrière le
//    mât.
// Un seul maillage (marches, palier, limons : une seule toile, betonMarchesTex ; deux matériaux, les faces verticales à part).
// Repère du terrain 1, `cx` vers le jeu.
// PLATEAU SEUL : le palier rejoint le biais de l'allée du mur (abordsMur) par une bande de pelouse en pente douce ; on ne
// monte pas l'escalier (la balade reste sur le plateau ; la balle rebondit sur le plan du grillage, reperes.grillage).
// PARC ENTIER : pas encore (voir ESCALIER : la rampe est du monde passe là, un mètre trop haut).
function escalierMur(scene, K, cx, XN, matHerbe) {
  const E = ESCALIER, n = E.n, h = E.h, g = E.g, CH = 0.025;            // CH : le chanfrein du nez usé (2,5 cm)
  const zT = E.z0 + (n - 1) * g, zF = zT + E.palier, yT = n * h;           // la dernière contremarche, le bout du palier
  const xG = cx(E.xL[0]), xD = cx(E.xD), xL1 = cx(E.xL[1]);
  // deux lots de faces : celles qui regardent le ciel (girons, nez, palier, dessus des limons) et les faces VERTICALES
  // (contremarches, joues et bouts des limons, dos du palier), qui ont leur matériau (voir plus bas)
  const pos = [], uv = [], posV = [], uvV = [];
  // une face à quatre coins (a, b, c, d dans l'ordre du tour) et leurs UV, tournée vers `nrm` quel que soit le sens
  const face = (P, U, nrm) => {
    const [a, b, c] = P, ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const dir = (uy * vz - uz * vy) * nrm[0] + (uz * vx - ux * vz) * nrm[1] + (ux * vy - uy * vx) * nrm[2];
    const o = dir >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    const [Pp, Uu] = Math.abs(nrm[1]) < 0.5 ? [posV, uvV] : [pos, uv];
    for (const k of o) { Pp.push(...P[k]); Uu.push(...U[k]); }
  };
  // LA TOILE : v de 0 à 0,5, la contremarche (de son pied à son haut) ; v de 0,5 à 1, le giron (du nez au fond). u : le
  // mètre, décalé d'une marche à l'autre pour que les feuilles et les taches ne se répètent pas.
  const vC = (y) => 0.5 * Math.min(1, Math.max(0, y));                     // contremarche : y (m) depuis son pied
  for (let i = 0; i < n; i++) {
    const zi = E.z0 + i * g, yi = (i + 1) * h, za = i < n - 1 ? zi + g : zF;
    const xa = i < 2 ? XN : xD, du = i * 0.37;
    const U = (x) => x - xa + du;
    // la contremarche (de la marche d'en dessous au chanfrein), le chanfrein, le giron
    face([[xa, yi - h, zi], [xG, yi - h, zi], [xG, yi - CH, zi], [xa, yi - CH, zi]],
      [[U(xa), 0], [U(xG), 0], [U(xG), vC((h - CH) / h)], [U(xa), vC((h - CH) / h)]], [0, 0, -1]);
    face([[xa, yi - CH, zi], [xG, yi - CH, zi], [xG, yi, zi + CH], [xa, yi, zi + CH]],
      [[U(xa), vC((h - CH) / h)], [U(xG), vC((h - CH) / h)], [U(xG), 0.5], [U(xa), 0.5]], [0, 0.7, -0.7]);
    const vF = i < n - 1 ? 1 : 0.5 + 0.5 * Math.min(1, (za - zi) / (2 * g));   // (le palier : la toile du giron, étirée)
    face([[xa, yi, zi + CH], [xG, yi, zi + CH], [xG, yi, za], [xa, yi, za]],
      [[U(xa), 0.5], [U(xG), 0.5], [U(xG), vF], [U(xa), vF]], [0, 1, 0]);
  }
  // le dos du palier (il ne se voit que du chemin)
  face([[XN, 0, zF], [xG, 0, zF], [xG, yT, zF], [XN, yT, zF]], [[0, 0], [xG - XN, 0], [xG - XN, 0.45], [0, 0.45]], [0, 0, 1]);
  // LES LIMONS : le dessus suit la ligne des nez, 8 cm au-dessus (gauche) ou 5 cm (droite, plus bas sur la photo), puis
  // le palier. Faces vues : celle qui regarde les marches, le dessus, le bout ; le dos du limon de gauche (côté haie).
  const haut = (z, dy) => Math.min(yT, h + Math.max(0, z - E.z0) * h / g) + dy;
  const limon = (x0, x1, zA, dy, dos) => {
    const zs = [zA, Math.max(zA, E.z0), zT, zF].filter((z, k, t) => k === 0 || z > t[k - 1] + 1e-6);
    for (let k = 0; k + 1 < zs.length; k++) {
      const a = zs[k], b = zs[k + 1], ya = haut(a, dy), yb = haut(b, dy);
      // la joue (vers les marches : vers x- pour celui de gauche, x+ pour celui de droite)
      const sens = x0 > XN + 0.5 ? -1 : 1, xj = sens < 0 ? x0 : x1;
      face([[xj, 0, a], [xj, 0, b], [xj, yb, b], [xj, ya, a]], [[a, 0], [b, 0], [b, vC(yb)], [a, vC(ya)]], [sens, 0, 0]);
      if (dos) face([[x1, 0, a], [x1, 0, b], [x1, yb, b], [x1, ya, a]], [[a, 0], [b, 0], [b, vC(yb)], [a, vC(ya)]], [1, 0, 0]);
      face([[x0, ya, a], [x1, ya, a], [x1, yb, b], [x0, yb, b]], [[a, 0.5], [a, 0.62], [b, 0.62], [b, 0.5]], [0, 1, 0]);
    }
    const y0 = haut(zA, dy);
    face([[x0, 0, zA], [x1, 0, zA], [x1, y0, zA], [x0, y0, zA]], [[0, 0], [x1 - x0, 0], [x1 - x0, vC(y0)], [0, vC(y0)]], [0, 0, -1]);
    face([[x0, 0, zF], [x1, 0, zF], [x1, yT + dy, zF], [x0, yT + dy, zF]], [[0, 0], [x1 - x0, 0], [x1 - x0, 0.45], [0, 0.45]], [0, 0, 1]);
  };
  limon(xG, xL1, E.z0 - 0.03, 0.08, true);
  limon(XN, xD, E.z0 + 2 * g - 0.02, 0.05, false);
  const geo = new THREE.BufferGeometry(), nH = pos.length / 3;
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos.concat(posV), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv.concat(uvV), 2));
  geo.addGroup(0, nH, 0); geo.addGroup(nH, posV.length / 3, 1);
  geo.computeVertexNormals();
  const tex = betonMarchesTex(K.canvasTex);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
  // LES FACES VERTICALES ne voient que la moitié du ciel (comme le parement du mur, voir murMeuliere), et les
  // contremarches moins encore, sous le nez de la marche du dessus ; le soleil bas du parc passe derrière le pin, dans
  // leur dos. Elles sortaient presque noires sous des girons au soleil (08/10, second juge : 0,40 de leur clarté, des
  // touches de piano ; 0,19 mesuré face à l'escalier). Une émission prise dans le béton lui-même les relève, sans
  // toucher aux girons : face à l'escalier (caméra à 1,6 m, 4 m devant), les contremarches passent de 29 à 72 (avec la
  // toile plus claire), les girons restent à 152 — un béton gris à l'ombre du soleil bas (0,47), plus un escalier noir
  // et blanc. (À 0,09, celle du mur : 54 ; 0,2 éclaire à peine la joue du limon au soleil, 94 -> 99.)
  const mat = { map: tex, roughness: 0.93, metalness: 0 };
  const beton = new THREE.Mesh(geo, [new THREE.MeshStandardMaterial(mat),
    new THREE.MeshStandardMaterial({ ...mat, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 })]);
  beton.castShadow = true; beton.receiveShadow = true; scene.add(beton);
  pelouseEscalier(scene, cx, matHerbe, zT, yT);
}

// La PELOUSE du haut de l'escalier (photo 20261007_184901 : derrière le palier, une bande de gazon), entre
// le palier et le biais de l'allée du mur (abordsMur, 1,20 m), qui passe là un peu plus haut que lui. Une nappe au pas de
// 12,5 cm : à plat au niveau du palier tout autour de lui, puis un talus de gazon qui monte jusqu'à la bordure du biais
// (sous le biais, elle reste cachée sous l'asphalte) ; à gauche du limon, elle retombe vers la terre du talus du pin, sous
// la haie. Mêmes UV que la nappe de gazon des abords (x / 5, -z / 5). `zT`, `yT` : le début et la hauteur du palier.
function pelouseEscalier(scene, cx, matHerbe, zT, yT) {
  const A = ABORDS, E = ESCALIER, bord = [[A.XD, A.ZB], ...A.BIAIS_IN];
  // l'écart signé au bord du biais (positif côté plateau) et la hauteur de l'allée au point le plus proche du bord
  const auBiais = (x1, z) => {
    let best = null;
    for (let i = 0; i + 1 < bord.length; i++) {
      const [ax, az] = bord[i], [bx, bz] = bord[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
      const t = Math.min(1, Math.max(0, ((x1 - ax) * dx + (z - az) * dz) / L2)), px = ax + dx * t, pz = az + dz * t;
      const d = Math.hypot(x1 - px, z - pz);
      if (!best || d < best.d) best = { d, s: Math.sign((x1 - ax) * dz - (z - az) * dx) || 1, y: yAllee(pz) };
    }
    return best;
  };
  const hauteur = (x1, z) => {
    const b = auBiais(x1, z);
    if (b.s < 0) return b.y - 0.03;                                     // sous le biais
    const yL = yT - 0.015, gauche = Math.max(0, x1 - E.xL[1]);
    // le talus de gazon jusqu'à la bordure (pente de 0,9), jamais sous le palier ; à gauche, la chute vers la terre du pin
    const y = Math.max(b.y - 0.02 - 0.9 * b.d, yL) - 1.1 * gauche;
    return Math.max(y, hauteurTalusPin(z) - 0.03);
  };
  const xs = [], zs = [];
  for (let x1 = A.XD; x1 < -21.4 + 1e-6; x1 += 0.125) xs.push(x1);
  for (let z = zT; z < 12.3 + 1e-6; z += 0.125) zs.push(z);
  const pos = [], uv = [], idx = [], n = xs.length;
  for (const z of zs) for (const x1 of xs) { const x = cx(x1); pos.push(x, hauteur(x1, z), z); uv.push(x / 5, -z / 5); }
  for (let j = 0; j + 1 < zs.length; j++) {
    for (let i = 0; i + 1 < n; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; idx.push(a, c, b, b, c, d); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) { g.index.array.reverse(); g.computeVertexNormals(); }
  const mat = matHerbe.clone(); mat.map = matHerbe.map.clone(); mat.map.repeat.set(1, 1);
  const pelouse = new THREE.Mesh(g, mat); pelouse.receiveShadow = true; scene.add(pelouse);
}

// LE BÉTON DES MARCHES DU COIN (photo 20261007_184901) : un béton gris, usé, sale. Une toile de 256 x 256 px pour un mètre
// de large, en deux moitiés (voir escalierMur) : en haut de l'image le GIRON — du fond (terre, feuilles mortes, une pointe
// de mousse dans l'angle) au NEZ, poli par les semelles, plus clair, écorné ; en bas la CONTREMARCHE — plus sombre,
// des coulures, le pied noirci. Raccordée en largeur (u se répète).
function betonMarchesTex(canvasTex) {
  const cuite = texCuite(betonMarchesTex, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h), d = img.data;
    // le gris du béton : giron #8f8c87 vers le nez #9b9893, fond #6b6760 ; contremarche #918e89, pied #827f7a. (08/10,
    // second juge : la contremarche à 128, noircie de 36 au pied et striée de coulures à 0,28, faisait sous le soleil du
    // jeu un escalier de touches de piano, noir et blanc ; sur la photo, contremarches et girons sont du même béton gris
    // usé. La contremarche à 145, son pied à -15, les coulures à 0,13 ; le nez du giron un peu moins clair, +12.)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let c;
        if (y < h / 2) {
          const t = y / (h / 2);                                             // 0 au fond du giron, 1 au nez
          c = 143 - 38 * Math.pow(1 - t, 3) + 12 * Math.pow(Math.max(0, t - 0.72) / 0.28, 1.5);
        } else {
          const t = (y - h / 2) / (h / 2);                                   // 0 en haut de la contremarche, 1 au pied
          c = 145 + 18 * Math.pow(Math.max(0, 0.12 - t) / 0.12, 1.2) - 15 * Math.pow(Math.max(0, t - 0.6) / 0.4, 1.4);
        }
        const k = (y * w + x) * 4, gr = rnd(-9, 9);
        d[k] = c + gr + 1; d[k + 1] = c + gr - 1; d[k + 2] = c + gr - 5; d[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const tache = (x, y, rx, ry, couleur) => {
      for (const dx of [-w, 0, w]) { g.fillStyle = couleur; g.beginPath(); g.ellipse(x + dx, y, rx, ry, rnd(0, 3.14), 0, 6.29); g.fill(); }
    };
    // des plaques plus sombres ou plus claires (le béton reprisé, l'eau qui a stagné)
    for (let i = 0; i < 18; i++) tache(rnd(0, w), rnd(0, h), rnd(8, 30), rnd(4, 14), Math.random() < 0.6 ? 'rgba(60,58,54,0.10)' : 'rgba(190,188,182,0.10)');
    // les gravillons du béton, les trous
    for (let i = 0; i < 1600; i++) tache(rnd(0, w), rnd(0, h), rnd(0.4, 1.2), rnd(0.4, 1.0), Math.random() < 0.5 ? 'rgba(40,38,35,0.35)' : 'rgba(200,198,190,0.35)');
    // le NEZ écorné : des éclats sombres sur la bande du nez (lignes 112 à 140)
    for (let i = 0; i < 26; i++) tache(rnd(0, w), rnd(118, 138), rnd(1.5, 5), rnd(1, 2.5), 'rgba(55,52,48,0.45)');
    // les COULURES de la contremarche, depuis le nez
    for (let i = 0; i < 22; i++) {
      const x = rnd(0, w), l = rnd(20, 90), gr = g.createLinearGradient(0, 132, 0, 132 + l);
      gr.addColorStop(0, 'rgba(50,48,44,0.13)'); gr.addColorStop(1, 'rgba(50,48,44,0)');
      g.fillStyle = gr; g.fillRect(x, 132, rnd(2, 6), l);
    }
    // au FOND du giron (lignes 0 à 40) : la terre, la mousse dans l'angle, les feuilles mortes ; quelques-unes au pied
    // de la contremarche (sa ligne du bas est le fond du giron d'en dessous)
    for (let i = 0; i < 40; i++) tache(rnd(0, w), rnd(0, 18), rnd(3, 12), rnd(1.5, 5), 'rgba(70,58,40,0.30)');
    for (let i = 0; i < 25; i++) tache(rnd(0, w), rnd(0, 10), rnd(2, 7), rnd(1, 3), 'rgba(72,88,46,0.40)');
    for (let i = 0; i < 16; i++) tache(rnd(0, w), rnd(240, 256), rnd(3, 9), rnd(1.5, 4), 'rgba(60,52,38,0.35)');
    const FEUILLES = ['rgba(122,82,42,0.85)', 'rgba(150,108,52,0.8)', 'rgba(96,66,38,0.85)', 'rgba(170,132,62,0.75)'];
    for (let i = 0; i < 14; i++) {
      const y = Math.random() < 0.75 ? rnd(4, 46) : rnd(60, 110);
      tache(rnd(0, w), y, rnd(4, 8), rnd(2.2, 4), FEUILLES[Math.floor(Math.random() * FEUILLES.length)]);
    }
  }, [1, 1], false, 8);
}

// =====================================================================
//  DERRIÈRE LE MUR : L'ALLÉE ROUGE, LA FOURCHE, LA RAMPE EST, LE BOUT DU MUR
//  (photos de Haythem du 28/09/2026, 17 h 17 : tools/parc_becon_references.md, § 11 à 13)
// =====================================================================
// Haythem est passé de L'AUTRE CÔTÉ du mur de meulière. Toutes ses photos sont prises du même coin, derrière le bout
// du mur côté pin (vers x = -26,3, z = +10,4 dans le repère du terrain 1, 2,2 m derrière le mur), en tournant sur place :
//  - 171705 et 171706, le regard le long du mur vers les platanes : vu de dos, le mur ne dépasse que d'un mètre environ
//    d'une allée d'asphalte rouge brique de 3,5 m qui le longe TOUT CONTRE sa face arrière ; le parement arrière est en
//    gros moellons calcaires jaune-beige posés en tous sens, à joints gris clair ; le chaperon, en dalles de béton gris ;
//    et le GRILLAGE du plateau est posé SUR le chaperon (treillis soudé vert sombre, poteaux tous les 2,4 m, quatre
//    lisses). Côté platanes, le grillage continue quelques panneaux au-delà de l'angle du plateau, puis une grille
//    noire basse prolonge la clôture sur le chaperon (171706) ;
//    L'ALLÉE N'EST PAS PLATE (relevé LiDAR HD à 0,5 m, scratchpad parc_complet/relief, et 171717 : « elle descend vers
//    le quai ») : +1,07 au-dessus du pied du mur au bout côté pin (z = 10), +1,45 à z = 4, +1,54 à z = 0, +1,72 à
//    l'angle des platanes. Voir yAllee.
//    LES PROPORTIONS (relecture) : sur 171705 et 171706, le grillage fait 1,45 fois ce qui dépasse du mur au-dessus
//    de l'allée ; vu du plateau (600, 601), 0,72 fois la hauteur du mur. Avec le mur du jeu (2,42 m chaperon compris),
//    c'est un grillage de 1,75 m (28 rangées de mailles, qui se comptent sur 171717) et une allée vers 1,2 m au bout
//    côté pin : ce que fait yAllee (1,20 au coin, 1,70 à l'angle des platanes, la pente du LiDAR un peu adoucie).
//    Un grillage de 2 m au-dessus d'une allée plate à 1,43 donnait 2,0 au lieu de 1,45 : le grillage écrasait le mur ;
//  - 171709, le regard vers z- : l'allée se divise autour d'un ÎLOT en pointe (palissade de rondins, fleurs jaunes et
//    violettes, un épicéa bleu, deux grands arbres à fût gris, une rangée de bancs noirs) ; la branche de gauche MONTE
//    dans le sous-bois (la rampe est), celle de droite longe le mur ; à gauche, un talus d'arbustes denses (cognassier
//    aux fruits jaunes, éléagnus gris-vert, lauriers) sous de grands arbres ;
//  - 171717 et 171718, le regard vers le quai : le mur finit par un bloc et son chaperon, le grillage par un poteau,
//    à côté du grand mât gris du grillage du pin ; derrière le bout du mur, une masse d'arbustes sous le pin parasol ;
//    l'allée file en biais vers le quai et rejoint le chemin rouge qui passe entre le plateau et le jardin.
// Avant ces photos, le jeu faisait monter un talus planté dès la crête du mur, posait un grillage de 1,30 m à 60 cm en
// retrait sur ce talus, et faisait filer le mur derrière le grillage du pin jusqu'à z = 17,2.
// CALAGE. Les poses des photos se retrouvent par les paniers vus à travers le grillage (D1, D3 et D4 sur 171705, D1
// et D4 sur 171717) et par les points de fuite du mur ; l'orthophoto IGN reprojetée (ortho_jeu.jpg) met l'allée du mur
// à x ≈ -27, et le bout du mur juste après l'angle du plateau. LA RAMPE (relecture, ortho agrandie au pas de 25 cm) :
// les deux branches ne font qu'une large allée de z = 10 à z = 2 (x de -31 à -25,5) ; là, la rampe tourne franchement
// vers le coteau — son axe passe à x = -32,5 à z = -2, -34 à z = -4, -35,5 à z = -6 — et la palissade de la pointe
// de l'îlot se lit vers (-28,5 ; +1). Le LiDAR le long de cet axe : +1,36 au coin, +1,94 à la fourche, puis 17 à 18 %.
// Le CHEMIN ROUGE du jardin (jardinBecon, z 17,4 à 19,6) reste où il est :
// l'orthophoto le met trois mètres plus près du plateau et PLUS BAS que le plateau (il descend de +1,4 au bout du mur à
// -1 au quai, derrière la butte du pin), mais le jardin du jeu est, lui, au-dessus du plateau ; le rapprocher seul
// l'aurait montré par la trouée derrière D2, où la photo 342 ne montre que le talus. C'est la zone Z04 du parc entier
// qui le posera à sa vraie place, avec le vrai relief.
// PARC ENTIER : tout ceci est la zone Z10 (allée du mur, rampe est) et le bout de la zone Z04 (raccord au chemin du
// jardin) du chantier « parc entier » (js/monde.js, js/parc/zones/), qui reprendront ce sol, ces allées et ces
// plantations sur le vrai relief. Drapeau éteint, c'est ce décor qui s'affiche. Le joueur, lui, ne vient pas ici :
// les bornes de la balade restent celles du plateau, on voit tout ceci à travers le grillage.
// (Drapeau levé, js/parc/zones/z10_coteau_nord.js le redessine sur le relief du monde avec les pièces d'ici, exportées
// pour elle — asphalteRougeTex, bancDansLot, epiceaBleu, et le feuillage : carteFond, teinteFond, paletteFond,
// arbusteFond, materiauFeuilles, feuillesFondTex.)
const ABORDS = {
  // l'allée, au-dessus de l'enrobé (voir yAllee) : 1,20 au bout du mur côté pin (le mur, 2,30 m + 12 cm de chaperon,
  // en dépasse de 1,22 m), qui monte à 1,70 vers l'angle des platanes (il n'en dépasse plus que de 0,72 m)
  YA0: 1.20, YA1: 1.70,
  LA: 3.5,         // sa largeur (171706 : du pied du mur à la bordure des bancs)
  XD: -24.15,      // le dos du mur (terrain 1) : sa face côté plateau est à -23,7, il fait 45 cm
  ZB: 10.3,        // le bout du mur côté pin (171717 : un mètre au-delà du grillage du pin)
  TG: 7.0,         // le grillage continue sept mètres sur le mur du bosquet, puis la grille noire basse (171706)
  ZR: 17.2,        // le mur de retour de la terrasse (murTerrasse) : le sol des abords s'arrête là
  XF: -44,         // au-delà, le parc haut à plat (5,28 m)
  // l'axe de la rampe est : du coin du pin jusqu'à la fourche (2e point), elle ne fait qu'une avec l'allée du mur et
  // suit sa hauteur (yAllee) ; puis elle tourne vers le coteau et, passé la pointe de l'îlot (sMontee), monte à 19 %
  // (LiDAR : 17 à 18 % le long de cet axe, mais dès le coude, deux mètres plus tôt).
  // Calée sur l'orthophoto (voir CALAGE) et sur 171709 : au premier plan, les deux branches font une seule allée de six
  // mètres ; les bords des deux branches se séparent à z = +1,5, l'arrondi de la pointe de l'îlot est vers z = 0.
  // (Avant la relecture : [-28,8 ; 1,5], [-32,2 ; -4,5], [-36,6 ; -9,5] — deux mètres trop à l'est vers z = -3.)
  RAMPE: [[-28.3, 10.0], [-28.9, 3.0], [-31.4, -0.8], [-34.0, -3.8], [-36.8, -7.6]],
  // LE BIAIS (171717, 171718) : au bout du mur, l'allée tourne vers le quai et rejoint le chemin rouge du jardin.
  // Son bord intérieur (côté plateau) frôle le bout du mur et la masse d'arbustes ; son bord extérieur, 3,4 m plus
  // loin ; entre lui et le chemin du jardin, de la pelouse (171718 : la pelouse et sa plaque d'égout à droite).
  BIAIS_IN: [[-24.0, 10.75], [-23.0, 11.3], [-21.5, 12.05], [-19.5, 13.1], [-17.4, 14.35], [-15.8, 15.6], [-14.6, 16.8], [-14.1, 17.45]],
  BIAIS_EX: [[-18.2, 17.45], [-19.6, 16.7], [-21.5, 15.7], [-23.6, 14.6], [-25.6, 13.4], [-27.0, 12.2], [-27.65, 11.0]],
  PR: 0.19, LR: 3.5,
  FIN_R: -6.2,     // la rampe dessinée s'arrête là (z) : au-delà, elle entre dans le bois
  DY_BOSQUET: 0.60,   // le long du mur du bosquet, l'allée reste 0,60 m sous la crête (qui baisse de 2,30 à 1,80) :
                      // à l'angle des platanes, elle est à YA1 (2,30 - 0,60), comme l'allée du mur droit
  YJ: 1.42,        // le chemin rouge du jardin, où le biais le rejoint (hauteurTalusPin(17,45) + 3 cm, jardinBecon)
};
const ssA = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
// minimum adouci (k : largeur du raccord)
function sminA(a, b, k) { const h = Math.min(1, Math.max(0, 0.5 + 0.5 * (b - a) / k)); return b + (a - b) * h - k * h * (1 - h); }

// LA HAUTEUR DE L'ALLÉE DU MUR selon z (repère du terrain 1). Relevé LiDAR HD le long de l'allée (x = -25,9), au-dessus
// du pied du mur : +1,07 à z = 10, 1,16 à 8, 1,30 à 6, 1,45 à 4, 1,52 à 2, 1,54 à 0, 1,61 à -4, 1,67 à -8, 1,72 à -10.
// Le jeu garde la forme (une montée franche de z = 8,5 à 2,5, puis une pente douce jusqu'aux platanes) sur 0,5 m au
// lieu de 0,65. Au-delà du bout du mur (z > ZB), c'est LE BIAIS : il file vers le chemin rouge du jardin, qui est à
// 1,42 dans le jeu (en vrai, il descend vers le quai : le jardin du jeu est plus haut que le vrai, voir CALAGE) —
// une pente régulière de 1,8 %, et linéaire en z, pour que la plaque du biais, triangulée d'un seul tenant, la suive.
function yAllee(z) {
  const A = ABORDS;
  if (z > A.ZB) return A.YA0 + (A.YJ - A.YA0) * Math.min(1, (z - A.ZB) / (17.45 - A.ZB));
  return A.YA0 + (A.YA1 - A.YA0) * (0.72 * ssA(8.5, 2.5, z) + 0.28 * ssA(2.5, -9.2, z));
}

// LE TALUS DERRIÈRE UN MUR, à d0 m de son dos : l'allée, plate, puis une pente qui RATTRAPE l'ancien talus (celui qui
// partait de la crête : hMur - 0,02 + `pente` par mètre, `yMax` au plus) six à sept mètres derrière le mur. Au-delà,
// rien ne change : les arbres et les massifs du fond restent où les photos prises du plateau les ont calés. Sert au mur
// droit (pente 0,25) et au mur du bosquet (sa pente varie le long du mur : voir talusY). `yA` : la hauteur de l'allée
// (derrière le mur droit, yAllee(z) ; derrière le mur du bosquet, DY_BOSQUET sous sa crête).
function profilDos(d0, hMur = 2.3, pente = 0.25, yMax = 5.28, yA = hMur - ABORDS.DY_BOSQUET) {
  const ancien = Math.min(yMax, hMur - 0.02 + pente * Math.max(0, d0));
  const dA = d0 - ABORDS.LA;
  return dA <= 0 ? yA : sminA(ancien, yA + 0.8 * dA, 0.45);
}

// LA RAMPE EST : son axe en segments, l'abscisse `s` le long de l'axe, l'écart signé `q` (positif du côté de l'îlot,
// vers x+ ; au-delà des bouts, la distance au bout), sa hauteur `h`.
const _rampe = (() => {
  const P = ABORDS.RAMPE, seg = [];
  let s = 0;
  for (let i = 0; i + 1 < P.length; i++) {
    const [ax, az] = P[i], [bx, bz] = P[i + 1], L = Math.hypot(bx - ax, bz - az);
    seg.push({ ax, az, ux: (bx - ax) / L, uz: (bz - az) / L, L, s0: s });
    s += L;
  }
  return { seg, L: s, sF: seg[0].L, sM: null, zM: 0 };
})();
// (jusqu'à la pointe de l'îlot, la rampe ne fait qu'une avec l'allée du mur : elle en suit la hauteur ; après, elle
// monte. Relecture : partie du coude (sF), elle était déjà 25 cm au-dessus de l'allée au coin où leurs bords se
// coupent, et la plate-bande de la pointe faisait une marche de gazon entre les deux enrobés)
function hRampe(s) {
  const sM = sMontee();
  if (s <= sM) return yAllee(pointRampe(Math.max(0, s)).z);
  return yAllee(_rampe.zM) + ABORDS.PR * (s - sM);
}
// l'abscisse où la rampe commence à monter : deux mètres après le coin où son bord (q = 1,8) quitte l'allée du mur,
// c'est-à-dire à l'arrondi de la pointe de l'îlot (contourIlot)
function sMontee() {
  if (_rampe.sM == null) {
    let sT = _rampe.sF;
    for (let s = 0; s < _rampe.L; s += 0.02) { const p = pointRampe(s); if (p.x + p.nx * 1.8 < -27.72) { sT = s; break; } }
    _rampe.sM = sT + 2.0; _rampe.zM = pointRampe(_rampe.sM).z;
  }
  return _rampe.sM;
}
function rampeEst(x1, z) {
  let best = null;
  for (const g of _rampe.seg) {
    const rx = x1 - g.ax, rz = z - g.az, u = Math.min(g.L, Math.max(0, rx * g.ux + rz * g.uz));
    const d = Math.hypot(rx - g.ux * u, rz - g.uz * u), q = -rx * g.uz + rz * g.ux;
    if (!best || d < best.d) best = { d, s: g.s0 + u, q: (q < 0 ? -1 : 1) * d };
  }
  best.h = hRampe(best.s);
  return best;
}
// Un point de l'axe de la rampe à l'abscisse s, sa direction et sa normale côté îlot (bissectrice aux sommets).
function pointRampe(s) {
  const S = _rampe.seg;
  let i = 0;
  while (i < S.length - 1 && s > S[i].s0 + S[i].L) i++;
  const g = S[i], u = s - g.s0;
  let ux = g.ux, uz = g.uz;
  // (à moins d'un mètre d'un sommet, la direction passe doucement d'un segment à l'autre)
  const lisser = (h, k) => { const a = 0.5 * (1 - Math.min(1, h)); ux = ux * (1 - a) + k.ux * a; uz = uz * (1 - a) + k.uz * a; };
  if (i > 0 && u < 1) lisser(u, S[i - 1]);
  if (i < S.length - 1 && g.L - u < 1) lisser(g.L - u, S[i + 1]);
  const l = Math.hypot(ux, uz);
  return { x: g.ax + g.ux * u, z: g.az + g.uz * u, ux: ux / l, uz: uz / l, nx: -uz / l, nz: ux / l };
}

// LE SOL DERRIÈRE LE MUR, dans le repère du terrain 1 (x1 au plus au dos du mur, z de l'angle des platanes au mur de
// retour du jardin) : l'allée, le talus qui la rattrape, la rampe taillée dedans (côté îlot une pente douce, côté
// coteau un talus raide, et la rampe qui se fond dans le talus vers le mur du bosquet), la plate-bande surélevée à la
// pointe de l'îlot. Servent de lui : la nappe de gazon (abordsMur), les plantations du fond (fondMur), la crête du mur
// de retour du jardin (murTerrasse), le pied des arbres du bosquet (solFond).
function solDerriereMur(x1, z) {
  const A = ABORDS, d0 = A.XD - x1;
  const y = profilDos(d0, 2.3, 0.25, 5.28, yAllee(z));
  if (d0 <= A.LA + 0.02) return y;                       // l'allée reste à sa hauteur en travers, sous la rampe comprise
  const r = rampeEst(x1, z);
  // (côté coteau, le talus est raide le long de la montée, mais près du coin il laisse une bande de pelouse presque à
  // plat avant les arbustes : 171709, en bas à gauche)
  // (devant l'arrondi de la pointe de l'îlot, entre les bords des deux allées, c'est de l'enrobé : le sol y reste à la
  // hauteur de la rampe, sinon la pente de l'îlot perçait le bouchon d'asphalte — voir abordsMur)
  const I = ilotContour();
  const eperon = z > I.C[1] && x1 < -27.6 && r.q > 1.6 && Math.hypot(x1 - I.C[0], z - I.C[1]) > I.r - 0.05;
  const w = eperon ? 0 : ssA(A.LR / 2, A.LR / 2 + (r.q > 0 ? 2.8 : 1.4 + 3.2 * ssA(-2, 5, z)), Math.abs(r.q));
  const k = 1 - (1 - w) * ssA(-9.0, -6.0, z);
  return r.h * (1 - k) + y * k + 0.22 * ilotAbords(x1, z, r);
}
// La plate-bande de la pointe de l'îlot (0 à 1) : entre la palissade du côté de l'allée (x = -27,7), celle du côté de
// la rampe, et quatre mètres derrière la pointe (vers z = +1,5).
// (relecture : pas devant l'arrondi de la pointe — entre lui et le coin où se coupent les bords des deux allées, c'est
// de l'enrobé ; la plate-bande y faisait un éperon de gazon de 1,3 m, plus haut que l'allée)
function ilotAbords(x1, z, r = rampeEst(x1, z)) {
  const I = ilotContour(), devant = z > I.C[1] ? ssA(I.r + 0.1, I.r - 0.15, Math.hypot(x1 - I.C[0], z - I.C[1])) : 1;
  // (la plate-bande ne monte qu'à 20 cm derrière les rondins : la nappe de gazon, maillée à 50 cm, la faisait sinon
  // déborder devant eux, en liseré sur l'enrobé de la rampe)
  return ssA(-27.9, -28.2, x1) * ssA(ABORDS.LR / 2 + 0.25, ABORDS.LR / 2 + 0.55, r.q) * ssA(-4.0, -1.8, z) * devant;
}
let _ilot = null;
function ilotContour() { return _ilot || (_ilot = contourIlot()); }

// Le parement ARRIÈRE du mur (171705, 171706, 171717) : de gros moellons calcaires en tous sens (« opus incertum »),
// 25 à 50 cm, beige-jaune chaud (#c4a47e à #e0d2ac, quelques-uns plus ocre ou plus pâles), joints de mortier gris clair
// (#b3aea3) de 3 à 4 cm, bien visibles. Une tuile de 4 x 1,2 m (110 px par mètre), raccordée en x : les pierres du
// bord droit continuent au bord gauche.
function moellonsDosTex(canvasTex) {
  const cuite = texCuite(moellonsDosTex, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  const PX = 110, W = 4 * PX, H = Math.round(1.2 * PX);
  // (à l'ombre du soir, sur 171705 et 171706, la pierre sort beige-jaune pâle, #c8b48c en moyenne, peu saturée)
  const PIERRES = [[204, 180, 136], [212, 190, 146], [218, 200, 158], [196, 172, 126], [224, 210, 172], [206, 184, 140],
                   [188, 164, 120], [214, 194, 150]];
  const germes = [], PAS_X = 0.4 * PX, PAS_Y = 0.32 * PX, nx = Math.round(W / PAS_X), ny = Math.ceil(H / PAS_Y) + 1;
  for (let j = -1; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = PIERRES[Math.floor(Math.random() * PIERRES.length)], v = rnd(-10, 10);
      germes.push({ x: (i + rnd(0.1, 0.9)) * PAS_X, y: (j + rnd(0.1, 0.9)) * PAS_Y,
        p: (rnd(0.5, 1.5) - 1) * 0.3 * PAS_X * PAS_X, c: [c[0] + v, c[1] + v, c[2] + v * 0.8] });
    }
  }
  const JOINT = 2.0;                                   // demi-joint en pixels (3,6 cm de joint)
  const qui = new Int32Array(W * H), ecart = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let p1 = 1e18, p2 = 1e18, b1 = 0, b2 = 0, g1x = 0, g1y = 0, g2x = 0, g2y = 0;
      for (let k = 0; k < germes.length; k++) {
        const s = germes[k];
        if (Math.abs(s.y - y) > 2.2 * PAS_Y) continue;
        // (raccord en x : chaque germe compte aussi une tuile à gauche et à droite)
        for (const dx of [-W, 0, W]) {
          const ex = x - (s.x + dx), ey = y - s.y;
          if (Math.abs(ex) > 2.2 * PAS_X) continue;
          const pp = ex * ex + ey * ey - s.p;
          if (pp < p1) { p2 = p1; b2 = b1; g2x = g1x; g2y = g1y; p1 = pp; b1 = k; g1x = s.x + dx; g1y = s.y; }
          else if (pp < p2) { p2 = pp; b2 = k; g2x = s.x + dx; g2y = s.y; }
        }
      }
      const o = y * W + x;
      qui[o] = b1; ecart[o] = (p2 - p1) / (2 * Math.hypot(g1x - g2x, g1y - g2y) || 1);
    }
  }
  const tex = canvasTex(W, H, (g) => {
    const img = g.createImageData(W, H), d = img.data;
    for (let o = 0; o < W * H; o++) {
      const k = o * 4, e = ecart[o];
      if (e < JOINT) {
        const v = rnd(-10, 10);
        d[k] = 179 + v; d[k + 1] = 174 + v; d[k + 2] = 163 + v;
      } else {
        const s = germes[qui[o]], bord = 0.9 + 0.1 * Math.min(1, (e - JOINT) / 6), gr = rnd(-12, 12);
        d[k] = s.c[0] * bord + gr; d[k + 1] = s.c[1] * bord + gr; d[k + 2] = s.c[2] * bord + gr;
      }
      d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // salissures : coulures grises sous le chaperon, lichens sombres, le pied plus terreux
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * W, l = rnd(0.1, 0.5) * H, c = g.createLinearGradient(0, 0, 0, l);
      c.addColorStop(0, 'rgba(96,94,88,0.28)'); c.addColorStop(1, 'rgba(96,94,88,0)');
      g.fillStyle = c; g.fillRect(x, 0, rnd(3, 10), l);
    }
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(52,50,44,${rnd(0.06, 0.2)})`;
      g.beginPath(); g.arc(Math.random() * W, Math.random() * H, rnd(0.6, 2.2), 0, 6.29); g.fill();
    }
    const pied = g.createLinearGradient(0, H * 0.75, 0, H);
    pied.addColorStop(0, 'rgba(80,70,54,0)'); pied.addColorStop(1, 'rgba(80,70,54,0.3)');
    g.fillStyle = pied; g.fillRect(0, H * 0.75, W, H * 0.25);
  }, [1, 1], false, 8);
  tex.userData.relief = canvasTex(W, H, (g) => {
    const img = g.createImageData(W, H), d = img.data;
    for (let o = 0; o < W * H; o++) {
      const e = ecart[o], v = (e < JOINT ? 105 + 30 * e / JOINT : 150 + 30 * Math.min(1, (e - JOINT) / 8)) + rnd(-8, 8), k = o * 4;
      d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, [1, 1], false, 8);
  tex.userData.relief.colorSpace = THREE.NoColorSpace;
  return tex;
}

// L'asphalte rouge brique des allées du parc (171705 à 171718) : un rouge brique ÉTEINT (#8a5a58 à l'ombre, #a26d69
// au jour), plus sombre et plus rouge que l'enrobé rosé des allées du jardin (allees), sans joints ; un grain serré de
// gravillons clairs et sombres, et des plaques d'usure à peine plus claires. Une tuile = 4 m.
export function asphalteRougeTex(canvasTex) {
  const cuite = texCuite(asphalteRougeTex, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#98625e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = rnd(40, 120), c = g.createRadialGradient(x, y, 0, x, y, r);
      const clair = Math.random() < 0.5;
      c.addColorStop(0, clair ? 'rgba(176,128,122,0.22)' : 'rgba(110,68,66,0.2)'); c.addColorStop(1, 'rgba(0,0,0,0)');
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.save(); g.translate(dx, dy); g.fillStyle = c; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore(); }
    }
    for (let i = 0; i < 26000; i++) {
      const t = Math.random(), v = rnd(0.85, 1.12);
      g.fillStyle = t < 0.45 ? `rgba(${176 * v | 0},${136 * v | 0},${130 * v | 0},${rnd(0.3, 0.7)})`
        : t < 0.85 ? `rgba(${112 * v | 0},${70 * v | 0},${68 * v | 0},${rnd(0.3, 0.6)})` : `rgba(${196 * v | 0},${184 * v | 0},${176 * v | 0},0.5)`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(0.8, 2.2), rnd(0.8, 2.2));
    }
  }, [1, 1], false, 8);
}

// Le treillis du grillage posé sur le mur (171705, 171706, 171717) : un fil VERT SOMBRE (#2c3e32) — de l'allée on le
// lit presque noir sur le ciel —, et une maille plus LARGE QUE HAUTE : 171717, de près, compte 28 rangées de mailles
// sur la hauteur du grillage (6,25 cm pour 1,75 m), et des mailles qui paraissent carrées alors que le panneau est vu
// de biais (171705 : 1,2 à 1,7 fois plus larges que hautes). D'où 12 fils verticaux (8,3 cm) et 16 horizontaux par
// mètre. (Ce n'est donc pas le 5 x 10 cm en hauteur des grillages du plateau : la relecture l'a retourné.)
// Une tuile = 1 m.
function treillisMur() { return texFils(320, 12, 16, 1.9, 1.6, [48, 68, 55]); }

// Un banc cousu dans un lot : banc() le construit à part, on recopie ses pièces, déjà placées, dans `parMat` (une liste
// de géométries par couleur de matériau) — les bancs de l'allée coûtent ainsi deux appels de dessin, pas quarante.
export function bancDansLot(K, parMat, x, y, z, rotY, couleur, L, o = {}) {
  const tmp = new THREE.Group(), g = banc(tmp, K, x, z, rotY, couleur, L, o);
  g.position.y = y; tmp.updateMatrixWorld(true);
  g.traverse((m) => {
    if (!m.isMesh) return;
    const cle = m.material.color.getHex();
    if (!parMat.has(cle)) parMat.set(cle, { mat: m.material, geos: [] });
    parMat.get(cle).geos.push(m.geometry.clone().applyMatrix4(m.matrixWorld));
  });
}

// Une plaque posée à plat au niveau `y` (ou selon `fy(x, z)`), d'après un contour [[x, z], ...] dans le plan du sol ;
// UV en mètres divisés par `tuile`. Faces tournées vers le ciel quel que soit le sens du contour.
function plaqueSol(pts, fy, tuile = 4) {
  const forme = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ShapeGeometry(forme, 4), p = g.attributes.position, uv = g.attributes.uv;
  for (let k = 0; k < p.count; k++) {
    const x = p.getX(k), z = p.getY(k);
    p.setXYZ(k, x, typeof fy === 'function' ? fy(x, z) : fy, z); uv.setXY(k, x / tuile, z / tuile);
  }
  // (le contour tracé dans le plan (x, z) retourne les faces : on les remet vers le haut)
  const ix = g.index;
  for (let k = 0; k < ix.count; k += 3) { const a = ix.getX(k + 1); ix.setX(k + 1, ix.getX(k + 2)); ix.setX(k + 2, a); }
  g.computeVertexNormals();
  return g;
}

// Un ruban le long d'une suite de points { x, z, nx, nz, y } (n : la normale du ruban dans le plan du sol) : de
// `a` à `b` mètres de part et d'autre de l'axe (a < b), hauteur y + dy ; UV en mètres / tuile.
function rubanSol(pts, a, b, dy = 0, tuile = 4, ya = null) {
  const pos = [], uv = [], idx = [];
  for (const p of pts) {
    for (const [o, yy] of [[a, ya ? ya(p, a) : p.y], [b, ya ? ya(p, b) : p.y]]) {
      const x = p.x + p.nx * o, z = p.z + p.nz * o;
      pos.push(x, yy + dy, z); uv.push(x / tuile, z / tuile);
    }
  }
  for (let i = 0; i + 1 < pts.length; i++) { const k = 2 * i; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // (normales vers le ciel, quel que soit le sens du ruban)
  g.computeVertexNormals();
  const n = g.attributes.normal;
  if (n.count && n.getY(0) < 0) {
    for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
    g.setIndex(idx); g.computeVertexNormals();
  }
  return g;
}

// LES ABORDS DU MUR : le sol derrière lui (allée, talus, îlot, rampe), l'asphalte rouge, les bordures, la palissade de
// rondins et la plate-bande de l'îlot, les bancs noirs, le parement arrière et le bout du mur, le grillage posé sur le
// chaperon (il continue sur le mur du bosquet jusqu'à la grille noire), la masse d'arbustes du bout du mur, l'épicéa
// bleu et les deux grands arbres de l'îlot. (Ce qui pousse sur le talus et le coteau est dans fondMur.)
// `XN` : le pied du mur (côté plateau) ; `ZE` : le grillage des platanes (-0,1) ; `matHerbe` : la pelouse du parc.
// Zone Z10 / Z04 du parc entier : voir l'en-tête de ce bloc.
function abordsMur(scene, K, cx, XN, ZE, matHerbe) {
  const A = ABORDS, DX = XN + PLATEAU.mur, X = (x1) => x1 + DX;      // X : du repère du terrain 1 à celui du jeu
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const zE = ZE - 0.1;                                    // l'angle des platanes : le mur du bosquet part de là
  const M = ligneMurBosquet(cx);
  const sol = (x1, z) => solDerriereMur(x1, z);
  const lot = lotPieces();
  const std = (c, r = 0.9, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

  // ---- 1. LE SOL : une nappe de gazon, de l'allée au parc haut (plus fine là où la rampe est taillée) ----
  // (plus serrée, 25 cm, autour de la pointe de l'îlot : à 50 cm, un triangle de gazon qui touchait la plate-bande
  // débordait sur l'enrobé de la rampe en un liseré vert — relecture)
  const pasZ = LEGER ? 1.0 : 0.5, D0 = [0, A.LA / 2, A.LA, A.LA + 0.08];
  for (let d = A.LA + 0.25; d < 14; d += LEGER ? 1.0 : d < 7.5 ? 0.25 : 0.5) D0.push(d);
  D0.push(15.5, 17.5, A.XD - A.XF);
  const Z = [];
  for (let z = zE; z < A.ZR - 1e-6; z += !LEGER && z > -4.5 && z < 3 ? 0.25 : pasZ) Z.push(z);
  Z.push(A.ZR);
  const pos = [], uvs = [], idx = [], nC = D0.length;
  for (const z of Z) for (const d of D0) { const x1 = A.XD - d; pos.push(X(x1), sol(x1, z) - 0.01, z); uvs.push(X(x1) / 5, -z / 5); }
  for (let j = 0; j + 1 < Z.length; j++) {
    // (i le long de d0, donc vers x- ; j vers z+ : a, b, c tourne vers le ciel)
    for (let i = 0; i + 1 < nC; i++) { const a = j * nC + i, b = a + 1, c = a + nC, d = c + 1; idx.push(a, b, c, b, d, c); }
  }
  const gSol = new THREE.BufferGeometry();
  gSol.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  gSol.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  gSol.setIndex(idx); gSol.computeVertexNormals();
  const matSol = matHerbe.clone(); matSol.map = matHerbe.map.clone(); matSol.map.repeat.set(1, 1);
  const nappe = new THREE.Mesh(gSol, matSol); nappe.receiveShadow = true; scene.add(nappe);
  // au-delà, le parc haut à plat (comme l'ancien plateau haut de murMeuliere)
  const haut = new THREE.Mesh(new THREE.PlaneGeometry(80, A.ZR - zE), matHerbe);
  haut.rotation.x = -Math.PI / 2; haut.position.set(X(A.XF) - 40, 5.27, (zE + A.ZR) / 2); haut.receiveShadow = true; scene.add(haut);

  // ---- 2. L'ASPHALTE ROUGE : l'allée du mur, son biais vers le chemin du jardin, la rampe, l'allée du bosquet ----
  // (posé 2 cm au-dessus de la nappe, SANS décalage de profondeur : vu du plateau, rasant, le décalage faisait passer
  // le bord de l'allée DEVANT le mur — un trait rouge à 1,4 m sur toute sa longueur)
  const matRouge = new THREE.MeshStandardMaterial({ map: asphalteRougeTex(K.canvasTex), roughness: 0.92 });
  matRouge.map.wrapS = matRouge.map.wrapT = THREE.RepeatWrapping;
  matRouge.userData.surfaceParc = 'asphalte';
  // l'allée du mur : un ruban qui suit sa hauteur (yAllee, un point tous les 50 cm), du pied du mur à 3,5 m ; puis LE
  // BIAIS (171717 : du bout du mur, l'allée file vers le quai, la masse d'arbustes à sa gauche) jusqu'au chemin rouge
  // du jardin, une plaque d'un seul tenant (sa hauteur est linéaire en z : la triangulation la suit exactement) ; son
  // bord intérieur part du coin du mur
  const biais = [[A.XD, A.ZB], ...A.BIAIS_IN];
  const xG = A.XD - A.LA;                                 // le bord de l'allée côté talus
  const pA = [], ptA = (z) => ({ x: X(A.XD), z, nx: -1, nz: 0, y: yAllee(z) });
  for (let z = zE; z < A.ZB - 0.25; z += 0.5) pA.push(ptA(z));
  pA.push(ptA(A.ZB));
  const contour = [...biais, ...A.BIAIS_EX, [xG, A.ZB]].map(([x1, z]) => [X(x1), z]);
  const asphalte = [rubanSol(pA, 0, A.LA, 0.012), plaqueSol(contour, (x, z) => yAllee(z) + 0.012)];
  // la rampe : un ruban le long de son axe, de 80 cm dans l'allée jusqu'à son entrée dans le bois
  const pR = [], sFin = (() => { for (let s = 0; s < _rampe.L; s += 0.1) if (pointRampe(s).z < A.FIN_R) return s; return _rampe.L; })();
  for (let s = -0.8; s <= sFin + 1e-6; s += LEGER ? 1.0 : 0.5) {
    const p = s < 0 ? { ...pointRampe(0), x: A.RAMPE[0][0] + _rampe.seg[0].ux * s, z: A.RAMPE[0][1] + _rampe.seg[0].uz * s } : pointRampe(s);
    pR.push({ x: X(p.x), z: p.z, nx: p.nx, nz: p.nz, y: hRampe(Math.max(0, s)) });
  }
  asphalte.push(rubanSol(pR, -A.LR / 2, A.LR / 2, 0.02));
  // l'allée du bosquet : elle suit le mur du bosquet, 0,60 m sous sa crête, jusqu'au bout de ses cinq segments
  const pB = [];
  for (let t = 0; t <= M.T + 1e-6; t += 0.75) {
    const tt = Math.min(t, M.T), [x0, z0] = talusXZ(M, tt, M.EP), [x3, z3] = talusXZ(M, tt, M.EP + A.LA), l = Math.hypot(x3 - x0, z3 - z0);
    pB.push({ x: x0, z: z0, nx: (x3 - x0) / l, nz: (z3 - z0) / l, y: murPoint(M, tt).h - A.DY_BOSQUET });
  }
  asphalte.push(rubanSol(pB, -0.02, A.LA, 0.016));
  // la pointe de l'îlot (contourIlot) : l'asphalte va jusqu'à la palissade arrondie. Les deux rubans s'arrêtent à
  // leurs bords, qui se coupent 1,3 m devant l'arrondi : sans ce bouchon, un éperon de gazon pointait devant la
  // palissade (relecture, 171709 : de l'enrobé jusqu'aux rondins)
  // (le bouchon déborde de 12 cm sous les deux rubans, et son coin de 30 cm au-delà du leur : bord à bord, un liseré
  // de gazon restait visible de part et d'autre)
  const ptsIlot = ilotContour(), [cI, zI] = ptsIlot.C, [t0x, t0z] = ptsIlot.T0, tA = ptsIlot.pts[1], tR = ptsIlot.pts[9];
  // (côté rampe, le bouchon suit le vrai bord du ruban, qui tourne encore après le coin : une droite de tR au coin
  // laissait un coin de gazon)
  const lb = Math.hypot(cI - t0x, zI - t0z), nRx = (tR[0] - cI) / ptsIlot.r, nRz = (tR[1] - zI) / ptsIlot.r;
  const bordR = [], sR1 = rampeEst(tR[0], tR[1]).s, sR0 = rampeEst(t0x, t0z).s;
  for (let s = sR1 - 0.2; s > sR0 + 0.1; s -= 0.2) { const p = pointRampe(s); bordR.push([p.x + p.nx * 1.62, p.z + p.nz * 1.62]); }
  const eperon = [[t0x - (cI - t0x) / lb * 0.3, t0z - (zI - t0z) / lb * 0.3], [tA[0] + 0.12, tA[1]], ...ptsIlot.pts.slice(2, 9),
    [tR[0] + nRx * 0.12, tR[1] + nRz * 0.12], ...bordR].map(([x1, z]) => [X(x1), z]);
  asphalte.push(plaqueSol(eperon, (x, z) => Math.max(yAllee(z), hRampe(rampeEst(x - DX, z).s), sol(x - DX, z)) + 0.018));
  const route = new THREE.Mesh(mergeGeometries(asphalte), matRouge); route.receiveShadow = true; scene.add(route);
  // une plaque d'égout au pied du mur (171706, en bas de la photo)
  const plaque = new THREE.Mesh(new THREE.CircleGeometry(0.3, 18).rotateX(-Math.PI / 2), std(0x3b3634, 0.55, 0.45));
  plaque.position.set(X(-26.2), yAllee(8.4) + 0.02, 8.4); plaque.receiveShadow = true; scene.add(plaque);

  // ---- 3. LES TALUS DU BIAIS : l'allée y est au-dessus du talus du pin (1,20 à 1,42 m contre 0,4 à 1,4 m) ----
  // côté plateau, sous la masse d'arbustes, un talus de terre de 1,5 m jusqu'au talus du pin ; côté jardin, une pente
  // de gazon d'un mètre jusqu'à sa pelouse, et le long du dos du mur prolongé, là où la pelouse des abords (au niveau
  // de l'allée) touche celle du pin
  const normales = (pts, sens) => pts.map(([x, z], i) => {
    const [xa, za] = pts[Math.max(0, i - 1)], [xb, zb] = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(xb - xa, zb - za);
    return { x: X(x), z, nx: sens * (zb - za) / l, nz: -sens * (xb - xa) / l, y: yAllee(z) };
  });
  const versPin = (p, o) => (o === 0 ? p.y - 0.02 : hauteurTalusPin(p.z + p.nz * o) - 0.07);
  const matPente = new THREE.MeshStandardMaterial({ map: terreTalusPin(K.canvasTex), roughness: 1 });
  matPente.map.wrapS = matPente.map.wrapT = THREE.RepeatWrapping; matPente.userData.surfaceParc = 'solForet';
  // (07/10 : pas devant le bout du mur — le palier de l'escalier du coin et sa pelouse y montent au biais, voir
  // escalierMur ; le talus de terre ne part qu'à l'est de la haie)
  const talusBout = new THREE.Mesh(rubanSol(normales(biais.filter(([x1]) => x1 > ESCALIER.xM + 0.6), 1), 0, 1.5, 0, 2, versPin), matPente);
  talusBout.receiveShadow = true; scene.add(talusBout);
  const exterieur = A.BIAIS_EX.filter(([x]) => x > A.XD - 0.6);
  const zCroise = 14.3;                                   // (le bord extérieur du biais passe le dos du mur vers z = 14,3)
  const dosPrl = [];
  for (let z = zCroise; z <= A.ZR + 1e-6; z += 0.5) dosPrl.push([A.XD, Math.min(z, A.ZR)]);
  const pentesJardin = [rubanSol(normales(exterieur, 1), 0, 1.0, 0, 5, versPin), rubanSol(normales(dosPrl, 1), 0, 0.9, 0, 5, versPin)];
  const pelouseBiais = new THREE.Mesh(mergeGeometries(pentesJardin), matSol); pelouseBiais.receiveShadow = true; scene.add(pelouseBiais);

  // ---- 4. LES BORDURES de béton (12 cm, 6 cm au-dessus de l'asphalte) ----
  const beton = std(0x9b9993, 0.9);
  const bordure = (pts, fy) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [xa, za] = pts[i], [xb, zb] = pts[i + 1], L = Math.hypot(xb - xa, zb - za);
      if (L < 0.02) continue;
      const xm = (xa + xb) / 2, zm = (za + zb) / 2;
      lot.boite(beton, L + 0.02, 0.16, 0.12, X(xm), fy(xm, zm) - 0.02, zm, Math.atan2(-(zb - za), xb - xa));
    }
  };
  bordure(biais, (x1, z) => yAllee(z));                                             // côté plateau, le long du biais
  bordure(A.BIAIS_EX, (x1, z) => yAllee(z));                                        // côté jardin, le long du biais
  const bordRampe = (cote, s0, s1) => {
    const pts = [];
    for (let s = s0; s <= s1 + 1e-6; s += 0.6) { const p = pointRampe(s); pts.push([p.x + p.nx * cote * (A.LR / 2 + 0.06), p.z + p.nz * cote * (A.LR / 2 + 0.06)]); }
    bordure(pts, (x1, z) => hRampe(rampeEst(x1, z).s));
  };
  bordRampe(-1, 0.4, sFin);                                                         // la rampe, côté coteau
  // L'ÎLOT : la pointe entre l'allée et la rampe (pointe arrondie, rayon 70 cm), la palissade de rondins autour
  // (171709 : elle fait la pointe et longe les deux branches sur quelques mètres), puis des bordures
  bordRampe(1, ptsIlot.sRampe + 0.2, sFin);                                        // la rampe, côté îlot, après la palissade
  // l'allée, côté îlot, après la palissade (par bouts d'un mètre : l'allée monte vers les platanes)
  const bordAllee = [];
  for (let z = ptsIlot.zAllee - 0.1; z > zE + 0.5; z -= 1) bordAllee.push([-27.72, z]);
  bordAllee.push([-27.72, zE]);
  bordure(bordAllee, (x1, z) => yAllee(z));
  // la palissade : des rondins de 12 cm, jointifs, de 42 à 55 cm hors sol, gris-brun délavés
  const bois = std(0x857766, 0.95);
  const pasR = LEGER ? 0.2 : 0.13;
  let reste = 0;
  for (let i = 0; i + 1 < ptsIlot.pts.length; i++) {
    const [xa, za] = ptsIlot.pts[i], [xb, zb] = ptsIlot.pts[i + 1], L = Math.hypot(xb - xa, zb - za);
    for (let u = reste; u < L; u += pasR) {
      const x1 = xa + (xb - xa) * u / L, z = za + (zb - za) * u / L;
      // (le haut du rondin dépasse la plate-bande qu'il retient : on la lit 25 cm vers l'intérieur de l'îlot)
      const cx0 = ptsIlot.C[0] - x1, cz0 = ptsIlot.C[1] + 1.5 - z, lc = Math.hypot(cx0, cz0) || 1;
      const pied = Math.min(yAllee(z), hRampe(rampeEst(x1, z).s)) - 0.06;
      const haut = Math.max(sol(x1 - 0.25, z), sol(x1 + cx0 / lc * 0.25, z + cz0 / lc * 0.25)) + rnd(0.1, 0.2);
      lot.tube(bois, V(X(x1), pied, z), V(X(x1) + rnd(-0.02, 0.02), Math.max(pied + 0.4, haut), z + rnd(-0.02, 0.02)),
        0.062, 0.058, 7);
    }
    reste = (reste + Math.ceil((L - reste) / pasR) * pasR) - L;
  }
  // la plate-bande : fleurs jaunes et violettes derrière la palissade (171709, 171706), en touffes
  const fleursJ = [], fleursV = [], plan = new THREE.PlaneGeometry(1, 1), ob = new THREE.Object3D();
  for (let n = 0, essais = 0; n < (LEGER ? 50 : 120) && essais < 3000; essais++) {
    const x1 = rnd(-31, -27.7), z = rnd(-3.8, ptsIlot.C[1] + 0.4);
    if (ilotAbords(x1, z) < 0.9 || !dansIlot(x1, z, ptsIlot, 0.25)) continue;
    n++;
    const y = sol(x1, z), s = rnd(0.25, 0.42), ry = Math.random() * Math.PI, liste = Math.random() < 0.72 ? fleursJ : fleursV;
    for (const dr of [0, Math.PI / 2]) {
      ob.position.set(X(x1), y + s * 0.4, z); ob.rotation.set(rnd(-0.2, 0.2), ry + dr, 0); ob.scale.set(s * 1.2, s, 1); ob.updateMatrix();
      liste.push(plan.clone().applyMatrix4(ob.matrix));
    }
  }
  // (un seul maillage : les violettes sont les mêmes touffes, teintées par leurs couleurs de sommet)
  const teindre = (geos, c) => geos.map((gg) => {
    const n = gg.attributes.position.count, a = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { a[k * 3] = c[0]; a[k * 3 + 1] = c[1]; a[k * 3 + 2] = c[2]; }
    return gg.setAttribute('color', new THREE.BufferAttribute(a, 3));
  });
  const touffesFl = [...teindre(fleursJ, [1, 1, 1]), ...teindre(fleursV, [0.69, 0.48, 0.88])];
  if (touffesFl.length) {
    const m = new THREE.Mesh(mergeGeometries(touffesFl), new THREE.MeshStandardMaterial({ map: fleursTexture(K.canvasTex), vertexColors: true,
      alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 }));
    scene.add(m); declarerFeuillage(scene, m);
  }

  // ---- 5. LES BANCS NOIRS, dos à l'îlot, face au mur (171709 : trois à la file après la plate-bande ; 171706) ----
  const parMat = new Map();
  for (let z = ptsIlot.zAllee - 1.05; z > zE + 0.9; z -= 2.1) {
    bancDansLot(K, parMat, X(-27.28), yAllee(z), z, Math.PI / 2, 0x2b2f31, 1.9, { fonte: 0x161718 });
  }
  for (const { mat, geos } of parMat.values()) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  }

  const vertG = murArriere(scene, K, cx, XN, ZE, lot);

  // ---- 8. LES ARBUSTES DU BOUT DU MUR ET LES ARBRES DE L'ÎLOT ----
  // derrière le bout du mur, côté plateau, la masse sombre de cotonéaster et de laurier (171717, 171718) qui monte
  // du talus du pin jusqu'à la bordure du biais ; sur l'îlot, un épicéa bleu (171709) et deux grands arbres à fût gris
  const feu = accFeuillage();
  const LAURIER = paletteFond([[0x2e3f2c, 3], [0x33462f, 2], [0x3b5034, 2], [0x28382a, 1]]);
  const COTO = paletteFond([[0x435a36, 3], [0x4d6439, 2], [0x3a4f31, 2], [0x6a6a3a, 1]]);
  // (entre le grillage du pin et le bord du biais : ils prolongent, plus hauts, les massifs de vegetationPin. Sur 171717
  // leur sommet est aux deux tiers du grillage, 1,1 m au-dessus du chaperon, et le pin parasol dépasse franchement
  // derrière : 3,3 à 3,5 m au-dessus de l'enrobé — à 4,3 m, relecture, ils cachaient le pin)
  // (07/10, photo 20261007_184901 : ils s'arrêtent au grand mât du grillage — entre lui et le mur, l'escalier et son
  // palier, voir escalierMur ; taillés contre le limon de gauche)
  arbusteFond(feu, X(-21.3), hauteurTalusPin(10.5) - 0.05, 10.5, 3.0, 0.95, LAURIER, 1e9, X(ESCALIER.xL[1]) + 0.03);
  arbusteFond(feu, X(-20.6), hauteurTalusPin(11.2) - 0.05, 11.2, 2.9, 1.0, LAURIER, 1e9, X(ESCALIER.xL[1]) + 0.1);
  // et le petit buisson rond de la photo, sur la pelouse derrière le palier, à gauche (voir pelouseEscalier)
  arbusteFond(feu, X(-22.15), 0.93, 11.45, 1.0, 0.5, COTO, 1e9, -1e9, 0.95);
  arbusteFond(feu, X(-20.2), hauteurTalusPin(11.1) - 0.05, 11.1, 2.6, 1.0, COTO);
  const matFeu = materiauFeuilles(feuillesFondTex(K.canvasTex), { trans: 0.2, rugosite: 0.85 });
  const massifs = new THREE.Mesh(coudreTeinte(feu), matFeu);
  massifs.castShadow = true; massifs.receiveShadow = false; massifs.customDepthMaterial = matFeu.userData.ombre;
  scene.add(massifs); declarerFeuillage(scene, massifs);
  // (171709 : l'épicéa derrière la plate-bande, à gauche des deux grands arbres, dont les fûts sont du côté du mur)
  epiceaBleu(scene, K, X(-29.6), sol(-29.6, -5.0), -5.0);
  const tilleuls = [];
  for (const [x1, z, h, s] of [[-28.5, -6.7, 15, 5.5], [-30.7, -8.8, 17, 6]]) {
    const y = sol(x1, z), spot = K.modelTree(scene, X(x1), z, h * 0.85, s, { fat: 1, y });
    // (version légère et sans ombre : on ne les voit que de loin, à travers le grillage, et le plateau est déjà à
    // l'ombre du pin ; en version pleine avec leur ombre, c'était cent mille triangles de plus par image)
    if (spot) tilleuls.push({ x: X(x1), y: y - 0.05, z, h: h * 0.85, rot: 6.283 * alea(x1, z, 3), loin: true, repli: [spot] });
  }
  planter(scene, 'tilleul', tilleuls, { ombre: false });

  // (piquets, lisses, bordures et rondins ne portent pas d'ombre : ils sont petits et le plateau est à l'ombre du pin)
  lot.poser(scene, new Set([vertG, beton, bois]));
}

// LE DOS DU MUR ET SON GRILLAGE (abordsMur, sections 6 et 7) : le parement arrière du mur droit et du mur du bosquet, le
// bout du mur, le grillage posé sur le chaperon et ses poteaux et lisses (pièces ajoutées à `lot`). Seuls au parc entier,
// où le sol et le reste des abords viennent du relief. Rend le matériau des poteaux (il ne porte pas d'ombre).
// `droit` (parc entier) : le mur droit seul — le mur du bosquet (fondPlatanes) n'y est pas construit.
function murArriere(scene, K, cx, XN, ZE, lot, droit = false) {
  const A = ABORDS, DX = XN + PLATEAU.mur, X = (x1) => x1 + DX;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const zE = ZE - 0.1;
  const M = ligneMurBosquet(cx);
  const std = (c, r = 0.9, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

  // ---- 6. LE PAREMENT ARRIÈRE DU MUR ET SON BOUT ----
  const tDos = moellonsDosTex(K.canvasTex);
  const matDos = new THREE.MeshStandardMaterial({ map: tDos, roughness: 0.95, bumpMap: tDos.userData.relief, bumpScale: 0.4 });
  matDos.userData.surfaceParc = 'meuliere';
  const dos = [];
  // le mur droit : sa face arrière, de l'allée au chaperon (u le long du mur, v en hauteur ; une tuile de 4 x 1,2 m)
  // (un quadrilatère a, b, c, d — a-b en bas, c-d en haut — dont la face regarde vers `n` = [nx, nz])
  const quad = (a, b, c, d, ua, ub, va, vb, n) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([ua, va, ub, va, ua, vb, ub, vb], 2));
    const ux = b[0] - a[0], uz = b[2] - a[2];               // (b - a) x (haut) = (-uz, 0, ux) : la face de [0, 1, 2]
    g.setIndex(-uz * n[0] + ux * n[1] >= 0 ? [0, 1, 2, 1, 3, 2] : [0, 2, 1, 1, 2, 3]); g.computeVertexNormals();
    return g;
  };
  // (2 cm devant le dos de la boîte du mur de murMeuliere, dont la face nue, couleur de pierre, le cachait ; il part
  // du point le plus bas de l'allée, au bout côté pin : plus haut, son pied est sous l'asphalte)
  const xDos = X(A.XD) - 0.03, yb = A.YA0 - 0.06;
  dos.push(quad([xDos, yb, A.ZB], [xDos, yb, zE - 0.3], [xDos, 2.3, A.ZB], [xDos, 2.3, zE - 0.3], A.ZB / 4, (zE - 0.3) / 4, yb / 1.2, 2.3 / 1.2, [-1, 0]));
  // le BOUT du mur (171717 : un bloc de moellons sous son chaperon), du sol du talus au chaperon
  dos.push(quad([X(A.XD), 0, A.ZB + 0.004], [XN, 0, A.ZB + 0.004], [X(A.XD), 2.3, A.ZB + 0.004], [XN, 2.3, A.ZB + 0.004], 0, 0.45 / 4, 0, 2.3 / 1.2, [0, 1]));
  // le mur du bosquet : sa face arrière, de l'allée à sa crête (elle regarde le talus : la direction des colonnes)
  for (let t = 0; !droit && t < M.T - 1e-6; t += 1.5) {
    const t2 = Math.min(M.T, t + 1.5), [xa, za] = talusXZ(M, t, M.EP - 0.006), [xb, zb] = talusXZ(M, t2, M.EP - 0.006);
    const ha = murPoint(M, t).h, hb = murPoint(M, t2).h, dm = murDirection(M, (t + t2) / 2);
    dos.push(quad([xa, ha - A.DY_BOSQUET - 0.06, za], [xb, hb - A.DY_BOSQUET - 0.06, zb], [xa, ha, za], [xb, hb, zb], t / 4, t2 / 4,
      (ha - A.DY_BOSQUET - 0.06) / 1.2, ha / 1.2, [dm.x, dm.z]));
  }
  const parement = new THREE.Mesh(mergeGeometries(dos), matDos); parement.castShadow = true; parement.receiveShadow = true; scene.add(parement);

  // ---- 7. LE GRILLAGE POSÉ SUR LE CHAPERON (171705, 171706 ; de l'intérieur, photos 1000051600 et 601) ----
  // Treillis soudé vert sombre de 1,75 m (relecture : sur 600 et 601, prises du plateau, il fait 0,72 fois la hauteur
  // du mur ; sur 171705 et 171706, 1,45 fois ce qui dépasse de l'allée — 2 m, c'était 0,83 et 2,0), sur la moitié du
  // chaperon côté plateau ; un poteau tous les 2,4 m (tube carré de 4,5 cm), celui du bout côté pin à peine plus fort
  // (171717 : le même que les autres, à côté du grand mât gris du grillage du pin) ; QUATRE lisses (171717, de près : à
  // 5, 25, 58 et 91 % de la hauteur ; 171705 et 171706 les montrent aussi). Il court du bout du mur à l'angle des
  // platanes, puis sur les sept premiers mètres du mur du bosquet, où la grille noire basse prend le relais
  // (murBosquet). Son tracé : `ligne(S)` donne, à S mètres du bout du mur, le point du chaperon et sa hauteur.
  const HG = 1.75, LDROIT = A.ZB - 0.05 - zE, LTOT = LDROIT + (droit ? 0 : A.TG);
  const ligne = (S) => {
    if (S <= LDROIT) return { x: XN - 0.13, z: A.ZB - 0.05 - S, y: 2.42 };
    const t = S - LDROIT, [x, z] = talusXZ(M, t, 0.13);
    return { x, z, y: murPoint(M, t).h + 0.11 };
  };
  const pts = [];
  for (let S = 0; S <= LTOT + 1e-6; S += 0.5) pts.push(Math.min(S, LTOT));
  if (pts[pts.length - 1] < LTOT) pts.push(LTOT);
  pts.push(LDROIT); pts.sort((a, b) => a - b);
  for (let i = pts.length - 1; i > 0; i--) if (pts[i] - pts[i - 1] < 0.05) pts.splice(i, 1);
  const gp = [], gu = [], gi = [];
  pts.forEach((S, i) => {
    const p = ligne(S);
    gp.push(p.x, p.y, p.z, p.x, p.y + HG, p.z); gu.push(S, 0, S, HG);
    if (i) { const k = 2 * (i - 1); gi.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  });
  const gG = new THREE.BufferGeometry();
  gG.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  gG.setAttribute('uv', new THREE.Float32BufferAttribute(gu, 2));
  gG.setIndex(gi); gG.computeVertexNormals();
  const grillage = new THREE.Mesh(gG, materiauGrillage(treillisMur(), 0xffffff));
  grillage.receiveShadow = true; scene.add(grillage); declarerFeuillage(scene, grillage);
  // (parc entier : c'est aussi un obstacle du monde, comme l'était le grillage du haut du mur de murMeuliere — on ne le
  // traverse pas en venant de l'allée, la balle lobée par-dessus le mur y rebondit. Sa hauteur est comptée depuis le sol
  // sous lui, par tronçons de 2 m ; il couvre aussi le bout du mur, que le parapet de monde.json arrête à z = 9,5)
  const obs = droit && scene.userData.obstaclesDecor;
  if (obs) {
    for (let S = 0; S < LDROIT - 1e-3; S += 2) {
      const a = ligne(S), b = ligne(Math.min(LDROIT, S + 2)), h = Math.round((a.y + HG - Monde.sol(a.x, (a.z + b.z) / 2)) * 100) / 100;
      obs.push({ t: 's', x0: a.x, z0: a.z, x1: b.x, z1: b.z, e: 0.06, h, qui: 'tous', type: 'grille', camera: false, source: 'grillage du chaperon' });
    }
  }
  const vertG = std(0x2a3e31, 0.6, 0.25);
  const poteaux = [];
  for (let S = 0.02; S < LTOT + 0.3; S += 2.4) poteaux.push(Math.min(S, LTOT - 0.02));
  poteaux.forEach((S, i) => {
    const p = ligne(S), e = i === 0 ? 0.06 : 0.045;
    lot.boite(vertG, e, HG + 0.02, e, p.x, p.y + (HG + 0.02) / 2, p.z);
  });
  // (les lisses : une seule pièce sur le mur droit, qui est droit ; tous les 50 cm sur le mur du bosquet, qui tourne)
  const ptsL = [0, ...pts.filter((S) => S >= LDROIT - 1e-6)];
  for (let i = 0; i + 1 < ptsL.length; i++) {
    const a = ligne(ptsL[i]), b = ligne(ptsL[i + 1]);
    for (const f of [0.05, 0.25, 0.58, 0.91]) {
      const h = f * HG;
      lot.tube(vertG, V(a.x - 0.03, a.y + h, a.z), V(b.x - 0.03, b.y + h, b.z), 0.016, 0.016, 6);
    }
  }
  return vertG;
}

// Le contour de la pointe de l'îlot (repère du terrain 1) : la palissade longe l'allée (x = -27,7) depuis `zAllee`,
// fait la pointe (arc de 70 cm tangent aux deux bords — 171709 : un bout bien rond, pas une pointe ; 45 cm avant la
// relecture) et redescend le long de la rampe jusqu'à l'abscisse `sRampe`.
function contourIlot() {
  const r = 0.7, xA = -27.72;
  // le bord de la rampe côté îlot (q = 1,8) coupe la ligne de l'allée : c'est le sommet du coin
  let sT = 0;
  for (let s = 0; s < _rampe.L; s += 0.02) { const p = pointRampe(s); if (p.x + p.nx * 1.8 < xA) { sT = s; break; } }
  const pT = pointRampe(sT), T0 = [xA, pT.z + pT.nz * 1.8];
  const u = [pT.ux, pT.uz], b0 = [u[0], u[1] - 1], lb = Math.hypot(b0[0], b0[1]), b = [b0[0] / lb, b0[1] / lb];
  const sinA = Math.abs(u[0] * b[1] - u[1] * b[0]), dC = r / Math.max(0.05, sinA);
  const C = [T0[0] + b[0] * dC, T0[1] + b[1] * dC];
  const tA = [xA, C[1]], nR = [-pT.nx, -pT.nz], tR = [C[0] + nR[0] * r, C[1] + nR[1] * r];
  const a0 = Math.atan2(tA[1] - C[1], tA[0] - C[0]), a1 = Math.atan2(tR[1] - C[1], tR[0] - C[0]);
  let da = a1 - a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  // (l'arc passe par l'avant de la pointe, du côté opposé à la bissectrice)
  if (Math.cos(a0 + da / 2) * -b[0] + Math.sin(a0 + da / 2) * -b[1] < 0) da = da > 0 ? da - 2 * Math.PI : da + 2 * Math.PI;
  const zAllee = C[1] - 1.8, pts = [[xA, zAllee], tA];
  for (let i = 1; i < 8; i++) { const a = a0 + da * i / 8; pts.push([C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r]); }
  pts.push(tR);
  // puis le long de la rampe, 3,5 m
  const sR0 = rampeEst(tR[0], tR[1]).s, sRampe = sR0 + 3.5;
  for (let s = sR0 + 0.5; s <= sRampe + 1e-6; s += 0.5) { const p = pointRampe(s); pts.push([p.x + p.nx * 1.8, p.z + p.nz * 1.8]); }
  return { pts, zAllee, sRampe, C, T0, r };
}
// Un point est-il dans la pointe de l'îlot, à `m` m au moins de la palissade ?
function dansIlot(x1, z, I, m) {
  if (x1 > -27.72 - m || rampeEst(x1, z).q < ABORDS.LR / 2 + 0.05 + m) return false;
  // (devant le centre de l'arrondi, seulement dans l'arrondi)
  return z < I.C[1] || Math.hypot(x1 - I.C[0], z - I.C[1]) < I.r - m;
}

// L'ÉPICÉA BLEU de l'îlot (171709) : un cône étroit et sombre, bleu-gris (#4f6674), étages de rameaux retombants, 7 m.
// Les cartes d'aiguilles du cèdre, teintées bleu ; un seul maillage.
const _epicea = { mat: null, ecorce: null };
export function epiceaBleu(scene, K, x, y0, z) {
  const acc = accFeuillage(), bois = [], H = 7.0, un = [1, 1, 1];
  rameauFond(bois, new THREE.Vector3(x, y0 - 0.3, z), new THREE.Vector3(x, y0 + H - 0.4, z), 0.2, 0.04, teinteFond(0x4a4038, 0.58));
  // (relecture : à 45 cm d'étage et sept cartes par mètre de rayon, on voyait le ciel entre des plateaux empilés — une
  // échelle, pas le cône dense de 171709. Étages de 30 cm, deux fois plus de cartes, une sur deux plus redressée, qui
  // bouche le jour entre les étages)
  for (let y = y0 + 0.5; y < y0 + H; y += LEGER ? 0.55 : 0.3) {
    const f = (y - y0) / H, R = 0.25 + 1.55 * (1 - f), n = Math.max(4, Math.round(R * (LEGER ? 6 : 13)));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + rnd(-0.3, 0.3), r = R * rnd(0.5, 1.0), s = rnd(0.9, 1.3) * (0.6 + 0.6 * (1 - f));
      const vol = { c: [x, y, z], r: R + 0.3, t: rnd(0.85, 1.05) }, pente = i % 2 ? 0.55 : 1.05;
      carteFond(acc, x + Math.cos(a) * r, y - r * 0.25, z + Math.sin(a) * r, -Math.PI / 2 + pente, Math.PI / 2 - a, 0, s, s * 0.8, vol, un);
    }
  }
  // (lot C6 : les deux matériaux gardés d'un appel à l'autre — le parc entier rebâtit l'épicéa à chaque construction du
  // morceau Z10c, et sa texture d'aiguilles, quand elle n'est pas cuite, se redessinait à chaque fois : 0,3 à 1,8 s
  // d'une traite sur un tour à vélo. Même dessin, au hasard fixé : la même image.)
  const mat = _epicea.mat || (_epicea.mat = materiauFeuilles(aiguillesCedreTex(K.canvasTex), { trans: 0.12, rugosite: 0.9,
    teinte: { sat: 0.55, teinte: [0.85, 1.0, 1.35], clair: 1.25 } }));
  const m = new THREE.Mesh(coudreTeinte(acc), mat);
  m.castShadow = true; m.receiveShadow = false; m.customDepthMaterial = mat.userData.ombre;
  scene.add(m); declarerFeuillage(scene, m);
  const t = new THREE.Mesh(mergeGeometries(bois), _epicea.ecorce || (_epicea.ecorce = new THREE.MeshStandardMaterial({ map: ecorceFondTex(K.canvasTex), vertexColors: true, roughness: 0.95 })));
  t.castShadow = true; scene.add(t);
}

// L'IMMEUBLE MODERNE BLANC derrière la grande terrasse du jardin (photo j5, à droite du drapeau) : un enduit blanc
// (#f0efec), quatre niveaux soulignés chacun par sa dalle de balcon blanche de 25 cm qui porte une ombre sous elle,
// de grands vitrages gris-bleu (#3b4755) à menuiseries fines derrière des garde-corps de verre, une rangée de
// HUBLOTS ronds au dernier niveau, et un acrotère plat. K.windowsTexture (fenêtres percées dans une façade
// d'enduit, appuis, volets) fait un immeuble des années 1900, pas celui-là. Dessinée pour la façade de 16 x 14 m
// qui regarde le jardin (32 px par mètre).
function facadeModerneTex(canvasTex) {
  const cuite = texCuite(facadeModerneTex, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  const PX = 32, ACRO = 0.9 * PX, DALLE = 0.25 * PX;
  return canvasTex(16 * PX, 14 * PX, (g, w, h) => {
    const NIV = (h - ACRO) / 4;
    g.fillStyle = '#f0efec'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = `rgba(0,0,0,${rnd(0.012, 0.04).toFixed(3)})`; g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 2), rnd(1, 2));
    }
    // l'acrotère : sa couvertine grise en tête, et l'ombre qu'il porte sur le dernier niveau
    g.fillStyle = '#c4c6c7'; g.fillRect(0, 0, w, 3);
    const vitre = (x, y, lw, lh) => {                  // le verre : reflet du ciel en haut, plus sombre en bas
      const gr = g.createLinearGradient(0, y, 0, y + lh);
      gr.addColorStop(0, '#6d7f90'); gr.addColorStop(0.4, '#3b4755'); gr.addColorStop(1, '#2b343e');
      g.fillStyle = gr; g.fillRect(x, y, lw, lh);
    };
    for (let n = 0; n < 4; n++) {
      const y0 = ACRO + n * NIV, y1 = y0 + NIV, yD = y1 - DALLE;     // haut de l'étage, bas, dessus de sa dalle
      if (n === 0) {
        // le dernier niveau : une rangée de hublots d'un mètre, cerclés de blanc
        for (let x = PX; x < w; x += 2 * PX) {
          const cy = y0 + (yD - y0) * 0.45, r = 0.45 * PX;
          g.fillStyle = '#e4e5e3'; g.beginPath(); g.arc(x, cy, r + 3, 0, 6.29); g.fill();
          const gr = g.createLinearGradient(0, cy - r, 0, cy + r);
          gr.addColorStop(0, '#6d7f90'); gr.addColorStop(0.5, '#3b4755'); gr.addColorStop(1, '#2b343e');
          g.fillStyle = gr; g.beginPath(); g.arc(x, cy, r, 0, 6.29); g.fill();
        }
      } else {
        // les grands vitrages, du plafond à la dalle : quatre travées de 4 m, trois vantaux à menuiseries fines
        for (let b = 0; b < 4; b++) {
          const fx = (b * 4 + 0.45) * PX, fw = 3.1 * PX, fy = y0 + 0.3 * PX, fh = yD - fy;
          vitre(fx, fy, fw, fh);
          g.fillStyle = '#d6d8d9';
          for (const k of [0, 1 / 3, 2 / 3, 1]) g.fillRect(fx + k * fw - 1, fy, 2, fh);
          g.fillRect(fx, fy + fh * 0.18, fw, 2);
        }
      }
      // le garde-corps de verre (1 m) sur la dalle, sa lisse fine
      g.fillStyle = 'rgba(170,186,198,0.22)'; g.fillRect(0, yD - PX, w, PX);
      g.fillStyle = '#cfd2d4'; g.fillRect(0, yD - PX, w, 2);
      // la dalle de balcon, blanche, et l'ombre qu'elle porte sur l'étage du dessous
      g.fillStyle = '#f7f6f3'; g.fillRect(0, yD, w, DALLE);
      g.fillStyle = 'rgba(120,122,126,0.5)'; g.fillRect(0, y1 - 2, w, 2);
      if (n < 3) {
        const om = g.createLinearGradient(0, y1, 0, y1 + 0.4 * PX);
        om.addColorStop(0, 'rgba(60,62,66,0.35)'); om.addColorStop(1, 'rgba(60,62,66,0)');
        g.fillStyle = om; g.fillRect(0, y1, w, 0.4 * PX);
      }
    }
    const oa = g.createLinearGradient(0, ACRO, 0, ACRO + 0.3 * PX);
    oa.addColorStop(0, 'rgba(60,62,66,0.3)'); oa.addColorStop(1, 'rgba(60,62,66,0)');
    g.fillStyle = oa; g.fillRect(0, ACRO, w, 0.3 * PX);
  }, null, false, 8);
}

// =====================================================================
//  BANCS
// =====================================================================
// LE BANC DE LA VILLE DE PARIS (photos 39 à 43) : trois lattes d'assise et deux planches de dossier peintes,
// flasques de fonte noire — pied avant cintré, pied arrière presque droit, support d'assise et patin au sol.
// Repère local : l'avant est +z, `rotY` le tourne. `o.retrait` : place des flasques depuis les bouts ;
// `o.dos = '5lattes'` : le banc brun de l'allée du quai (cinq lattes partout) ; `o.fonte` : couleur de la
// fonte ; `o.y` : hauteur du sol.
function banc(scene, K, x, z, rotY, couleur, L = 1.9, o = {}) {
  const g = new THREE.Group();
  const bois = new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.7 });
  // `o.ecaille` : la peinture usée du banc blanc (photos du 26/09) — éclats où le bois gris reparaît, surtout sur
  // les arêtes, points de rouille des vis, crasse grise le long des lattes
  if (o.ecaille) bois.map = K.canvasTex(256, 64, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 34; i++) {
      const y = Math.random() < 0.6 ? (Math.random() < 0.5 ? rnd(0, 7) : rnd(h - 7, h)) : rnd(0, h);
      c.fillStyle = Math.random() < 0.7 ? `rgba(88,84,80,${rnd(0.5, 0.9)})` : `rgba(140,120,100,${rnd(0.4, 0.7)})`;
      c.beginPath(); c.ellipse(rnd(0, w), y, rnd(0.6, 3.2), rnd(0.5, 2), rnd(0, 3), 0, 6.29); c.fill();
    }
    for (let i = 0; i < 6; i++) {
      const x0 = rnd(0, w), l = rnd(30, 90), gr = c.createLinearGradient(x0, 0, x0 + l, 0);
      gr.addColorStop(0, 'rgba(150,150,145,0)'); gr.addColorStop(0.5, `rgba(150,150,145,${rnd(0.08, 0.2)})`); gr.addColorStop(1, 'rgba(150,150,145,0)');
      c.fillStyle = gr; c.fillRect(x0, 0, l, h);
    }
    // le LISERÉ d'écailles noires le long de l'arête haute de chaque face — sur le chant avant de l'assise, là où
    // les mollets et les sacs frottent, la peinture est partie jusqu'à l'apprêt noir (photos 185625 et 185626)
    for (let i = 0; i < 70; i++) {
      c.fillStyle = `rgba(24,24,26,${rnd(0.7, 0.95)})`;
      c.beginPath(); c.ellipse(rnd(0, w), rnd(0.5, 6.5), rnd(0.8, 3), rnd(0.6, 2), rnd(-0.3, 0.3), 0, 6.29); c.fill();
    }
  }, [1, 1], false, 4);
  const fonte = new THREE.MeshStandardMaterial({ color: o.fonte ?? 0x1c1c1e, roughness: 0.6, metalness: 0.5 });
  if (o.dos === '5lattes') {
    for (let i = 0; i < 5; i++) K.box(L, 0.03, 0.06, bois, 0, 0.42, 0.14 - i * 0.068, g);
    for (let i = 0; i < 5; i++) {
      const y = 0.5075 + i * 0.07875;
      K.box(L - 0.05, 0.055, 0.03, bois, 0, y, -0.24 - (y - 0.5) * 0.12, g).rotation.x = -0.12;
    }
  } else {
    for (const zl of [0.11, -0.01, -0.13]) K.box(L, 0.035, 0.1, bois, 0, 0.42, zl, g);
    K.box(L - 0.05, 0.13, 0.035, bois, 0, 0.585, -0.24, g).rotation.x = -0.12;
    K.box(L - 0.05, 0.13, 0.035, bois, 0, 0.735, -0.26, g).rotation.x = -0.12;
  }
  const r = o.retrait ?? 0.3, sx0 = L / 2 - r;
  if (o.ecaille) {
    // LE BANC BLANC DE LA CAGE (photos 185625, 185626 et 600) : ses flasques de fonte sont MASSIVES — de face, un
    // pied avant de 12 cm, épais de 7, qui part en biais du patin (0,5 rad sur les 25 premiers centimètres) puis
    // monte droit jusqu'à l'assise, au ras de son chant ; un pied arrière de 7 x 8 cm, un gros patin. Les tubes
    // de 5 cm des autres bancs en faisaient un banc de jardin léger. (Le pied arrière, plus épais, est reculé de
    // 4 cm : il reste DERRIÈRE les planches du dossier, qui sont boulonnées devant lui, et le support d'assise
    // s'allonge pour le rejoindre.)
    const a = 0.5, hB = 0.25, zH = 0.1;                // biais du bas du pied avant, sa hauteur, z du haut du pied
    for (const sx of L > 2.2 ? [-sx0, 0, sx0] : [-sx0, sx0]) {
      K.box(0.07, hB / Math.cos(a), 0.12, fonte, sx, hB / 2, zH + (hB / 2) * Math.tan(a), g).rotation.x = -a;   // pied avant, le biais
      K.box(0.07, 0.19, 0.12, fonte, sx, 0.325, zH, g);                             // puis droit (0,23 à 0,42 : il couvre la jointure)
      K.box(0.07, 0.84, 0.08, fonte, sx, 0.42, -0.305, g).rotation.x = -0.036;      // pied arrière
      K.box(0.07, 0.05, 0.52, fonte, sx, 0.4, -0.035, g);                            // support d'assise
      K.box(0.08, 0.06, 0.62, fonte, sx, 0.03, 0.01, g);                             // patin
    }
    // LES TÊTES DE BOULON du dossier (photos 185625 et 185626 : deux par flasque sur chaque planche, rondes, grises
    // là où la peinture a sauté) : Ø 2 cm, 8 mm de saillie sur la face avant de la planche, posées dans son repère
    // (elle penche de 0,12 rad). Toutes fondues en un seul maillage.
    const tetes = [], m4 = new THREE.Matrix4();
    for (const [yl, zl] of [[0.585, -0.24], [0.735, -0.26]]) {
      m4.makeRotationX(-0.12).setPosition(0, yl, zl);
      for (const sx of L > 2.2 ? [-sx0, 0, sx0] : [-sx0, sx0]) for (const dy of [-0.035, 0.035]) {
        tetes.push(new THREE.CylinderGeometry(0.01, 0.01, 0.008, 8).rotateX(Math.PI / 2).translate(sx, dy, 0.0175 + 0.004).applyMatrix4(m4));
      }
    }
    g.add(new THREE.Mesh(mergeGeometries(tetes), new THREE.MeshStandardMaterial({ color: 0x8e8a83, roughness: 0.5, metalness: 0.4 })));
  } else for (const sx of L > 2.2 ? [-sx0, 0, sx0] : [-sx0, sx0]) {
    K.box(0.05, 0.449, 0.05, fonte, sx, 0.21, 0.2, g).rotation.x = -0.364;      // pied avant cintré
    K.box(0.05, 0.84, 0.05, fonte, sx, 0.42, -0.265, g).rotation.x = -0.036;    // pied arrière
    K.box(0.05, 0.05, 0.45, fonte, sx, 0.4, 0, g);                               // support d'assise
    K.box(0.06, 0.05, 0.58, fonte, sx, 0.025, 0.01, g);                          // patin
  }
  g.position.set(x, o.y || 0, z); g.rotation.y = rotY; scene.add(g);
  return g;
}

// =====================================================================
//  LES PANIERS
// =====================================================================
// LES QUATRE PANIERS DU PLATEAU, relevés au pixel sur les photos 40, 41 et 42 en pleine résolution :
//  - D2 (terrain 1, côté pin) : potence en tube CARRÉ galvanisé de 10 cm, coudée à 2,40 m ; le bras, droit,
//    monte à 35° et vient buter au dos du panneau AU RAS DE SON BORD BAS. Panneau 1,80 x 1,05 à cadre noir
//    de 4 cm (chants compris), carré de visée 0,59 x 0,45, deux têtes de boulon, filet déchiré.
//    On l'avait cru en 1,50 x 0,90 : c'est le cercle, seule cote normalisée de la photo, qui tranche. Sur la
//    photo 42 en 4000 px il fait 125 px de diamètre extérieur (49 cm) pour un panneau de 430 px, un rapport
//    de 3,44 — un 1,50 x 0,90 n'en donnerait que 2,9, et sa hauteur (260 à 282 px) n'irait pas non plus.
//  - D1 (terrain 1, côté platanes) : col de cygne en tube ROND de 9 cm, pied 60 cm derrière le panneau,
//    bague blanche à 2,15 m ; panneau 1,80 x 1,05 peint (liseré bleu écaillé de noir, carré bleu et bleu nuit).
//  - D3 / D4 (terrain 2) : potences coudées vers 2,5 m, bras long et plat (25 à 28°) qui avance de 1,10 m ;
//    petit panneau 1,20 x 0,90 à cadre noir.
// Partout : cercle rouge-orangé à 3,05 m sur une platine-boîte rouge, bas du panneau entre 2,90 et 2,95 m, et de
// l'acier gris clair MAT — très métallique, il ne renvoyait que le sombre du décor et les poteaux sortaient noirs.
// Descripteur `p` : sgn, type ('potence' | 'cygne'), LB x HB (panneau), bas (hauteur du bas du panneau), coude +
// avance + arrivee (potence : hauteur du coude, avancée du pied derrière le panneau, hauteur de l'axe du bras
// au-dessus du bas du panneau là où il le touche), pied (col de cygne : recul du pied), peinture ('cadre' |
// 'bleu'), carre [largeur, hauteur, trait, écart au bas du panneau], etiquette (hauteur de l'étiquette ou de la
// bague), boulons, filet { L, dechire }.
// `x` : l'axe du terrain. `jouable` : un des deux paniers du match — sa taille de panneau est publiée pour la
// collision de la balle (scene.userData.panneau.parSgn, lu par js/ball.js), le cercle et le filet viennent de
// K.installerPaniers. Sinon on pose un cercle et un filet fixes.

// Distance du pied du poteau à l'axe du terrain (en z) : l'avancée de la potence, ou le recul du col de cygne.
function poteauZ(p) { return Math.abs(COURT.BOARD_Z) + (p.type === 'potence' ? p.avance : p.pied); }

// L'obstacle que fait le poteau (repères du terrain) : le fût d'une potence s'arrête au coude ; le col de
// cygne, lui, quitte l'aplomb de son pied en montant — au-dessus de 2,3 m il est déjà 20 cm plus loin.
function obstaclePoteau(x, p) {
  const z = p.sgn * poteauZ(p);
  // (col de cygne : le cercle est centré 11 cm vers le panneau et fait 16 cm de rayon, pour tenir le tube de son
  // pied, à l'aplomb, jusqu'à 2,3 m, où son axe est déjà 22 cm plus loin)
  return p.type === 'potence' ? { x, z, r: 0.08, pad: 0.12, h: p.coude } : { x, z: z - p.sgn * 0.11, r: 0.16, pad: 0.12, h: 2.3 };
}

function panierReel(scene, K, p, x, jouable) {
  const g = new THREE.Group();
  const sgn = p.sgn, bz = sgn * Math.abs(COURT.BOARD_Z), hz = sgn * Math.abs(COURT.HOOP_Z);
  const yBas = p.bas || 2.9, yB = yBas + p.HB / 2;
  const zDos = bz + sgn * 0.02;                  // le dos du panneau (4 cm d'épaisseur, face avant à bz - sgn·0,02)
  if (jouable) {
    const P = { demiL: p.LB / 2, bas: yBas + 0.02, haut: yBas + p.HB - 0.02 };
    const parSgn = { ...((scene.userData.panneau && scene.userData.panneau.parSgn) || {}), [sgn]: P };
    scene.userData.panneau = { ...P, parSgn };
  }
  g.add(panneauReel(K, p, bz, yB));

  // --- le support : tout l'acier d'un panier en un seul maillage ---
  const galva = new THREE.MeshStandardMaterial({ color: 0xa9afb2, roughness: 0.55, metalness: 0.25, vertexColors: true });
  // l'étiquette blanche : son propre matériau, un peu émissif (à l'ombre elle reste la tache claire de la photo)
  const blanc = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.6, emissive: 0xf4f4f0, emissiveIntensity: 0.2 });
  const acier = [], zP = sgn * poteauZ(p);
  let marque;
  if (p.type === 'potence') {
    const C = 0.10, CB = 0.10;                                   // sections du poteau et du bras (même tube)
    const zA = zP + sgn * (C / 2 - 0.005);                       // le bras part du dos du poteau (5 mm dedans)...
    const zB = zDos + sgn * 0.03;                                // ... et s'arrête contre la platine
    const yArr = yBas + p.arrivee;
    const pente = (yArr - p.coude) / Math.abs(zB - zP);
    const axe = (z) => p.coude + pente * sgn * (zP - z);         // hauteur de l'axe du bras
    const epV = CB * Math.sqrt(1 + pente * pente);               // épaisseur verticale du bras incliné
    // Le fût monte jusqu'au dessous du bras sur sa face avant : à l'arrière son sommet reste noyé dans le bras,
    // si bien que le coude se lit comme un onglet net, sans jour ni pièce rapportée.
    const hP = axe(zP - sgn * C / 2) - epV / 2;
    acier.push(new THREE.BoxGeometry(C, hP, C, 1, 6, 1).translate(0, hP / 2, zP));
    acier.push(brasIncline(zA, axe(zA), zB, yArr, CB));
    // la platine soudée au bout du bras et boulonnée au dos du panneau (cachée de face)
    acier.push(new THREE.BoxGeometry(0.3, 0.3, 0.03).translate(0, yBas + 0.15, zDos + sgn * 0.015));
    // l'étiquette du fabricant, sous le coude, sur la face tournée vers le terrain
    marque = new THREE.BoxGeometry(0.09, 0.17, 0.006).translate(0, p.etiquette, zP - sgn * (C / 2 + 0.003));
  } else {
    // Col de cygne : le tube part d'aplomb et se couche vers le panneau en montant (dérive croissante vers
    // le terrain sur la photo 40). De face il disparaît derrière le bas du panneau.
    const yFin = yBas + 0.1, zFin = zDos + sgn * 0.04;
    const courbe = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, zP), new THREE.Vector3(0, 2.3, zP), new THREE.Vector3(0, yFin, zFin));
    acier.push(new THREE.TubeGeometry(courbe, 24, 0.045, 12, false));
    acier.push(new THREE.SphereGeometry(0.046, 12, 8).translate(0, yFin, zFin));               // bout du tube, bouché
    acier.push(new THREE.BoxGeometry(0.06, 0.8, 0.03).translate(0, yBas + 0.45, zDos + sgn * 0.015));   // fer plat au dos
    // la bague blanche : on cherche sur la courbe le point à la bonne hauteur (le tube n'y est plus vertical)
    let t0 = 0, t1 = 1;
    for (let i = 0; i < 24; i++) { const t = (t0 + t1) / 2; if (courbe.getPoint(t).y < p.etiquette) t0 = t; else t1 = t; }
    const q = courbe.getPoint(t0), tg = courbe.getTangent(t0);
    marque = new THREE.CylinderGeometry(0.048, 0.048, 0.16, 14)
      .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg)).translate(q.x, q.y, q.z);
  }
  const support = new THREE.Mesh(mergeGeometries(acier.map(teinteAcier)), galva);
  support.castShadow = true; support.receiveShadow = true; g.add(support);
  const etiq = new THREE.Mesh(marque, blanc); etiq.receiveShadow = true; g.add(etiq);

  // --- le cercle ---
  // Rouge-orangé peu métallique : à 0,5 de métal il ne renvoyait que le sombre du décor et disparaissait. Il
  // paraît rose sur les photos, c'est la lumière bleue du soir.
  // LA FERRURE AJOURÉE (30/09). Sous l'arrière de l'anneau, c'était une boîte rouge PLEINE de 15 x 12 x 14 cm :
  // vue à travers le filet, un seau rouge au fond du cercle, face à la caméra de balade. Sur la photo 185558, le
  // cercle tient au panneau par une ferrure qu'on voit à travers : une platine plaquée au panneau, une courte
  // fourche plate du haut de la platine à l'arrière de l'anneau, et deux tubes en diagonale du bas de la
  // platine au dessous de l'anneau. Même rouge ; le tout fusionné (un seul appel de dessin) et projetant son
  // ombre. La collision du cercle n'est pas touchée.
  const rouge = new THREE.MeshStandardMaterial({ color: 0xcf3b2a, roughness: 0.5, metalness: 0.15, emissive: 0x2a0806 });
  const HY = COURT.HOOP_Y, zFace = bz - sgn * 0.02;                     // face peinte du panneau
  const UP = new THREE.Vector3(0, 1, 0), _qT = new THREE.Quaternion();
  const tube = (a, b, r) => {
    const d = new THREE.Vector3().subVectors(b, a), l = d.length();
    return new THREE.CylinderGeometry(r, r, l, 8, 1, true).applyQuaternion(_qT.setFromUnitVectors(UP, d.normalize()))
      .translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  };
  const zAnneau = (x) => hz + sgn * Math.sqrt(Math.max(0, COURT.RIM_R * COURT.RIM_R - x * x));   // arrière de l'anneau en x
  const ferrure = [
    // la platine, 12 x 17 cm sur 12 mm, plaquée au panneau, son haut au niveau du cercle (à 16 x 20, vue de
    // face à travers le filet, elle refaisait presque la surface de l'ancienne boîte)
    new THREE.BoxGeometry(0.12, 0.17, 0.012).translate(0, HY - 0.065, zFace - sgn * 0.006),
    // la fourche : deux fers plats de 3 x 0,8 cm, du haut de la platine à l'arrière de l'anneau, qui s'écartent
    ...[-1, 1].map((s) => {
      const a = new THREE.Vector3(s * 0.045, HY - 0.012, zFace - sgn * 0.012), b = new THREE.Vector3(s * 0.085, HY - 0.012, zAnneau(s * 0.085));
      const d = new THREE.Vector3().subVectors(b, a), l = d.length();
      return new THREE.BoxGeometry(0.03, 0.008, l).rotateY(Math.atan2(d.x, d.z)).translate((a.x + b.x) / 2, a.y, (a.z + b.z) / 2);
    }),
    // les deux tubes de 2 cm, du bas de la platine (HY - 0,15) au dessous de l'anneau (HY - 0,01), un peu en avant
    ...[-1, 1].map((s) => tube(new THREE.Vector3(s * 0.04, HY - 0.14, zFace - sgn * 0.012),
      new THREE.Vector3(s * 0.15, HY - 0.01, zAnneau(s * 0.15)), 0.01)),
  ];
  if (jouable) {
    // le cercle du match (il fléchit, K.installerPaniers) : la ferrure reste fixe, elle est sur la charnière
    const fe = new THREE.Mesh(mergeGeometries(ferrure), rouge); fe.castShadow = true; g.add(fe);
  } else {
    const anneau = new THREE.TorusGeometry(COURT.RIM_R + 0.009, 0.009, 8, 32).rotateX(Math.PI / 2).translate(0, COURT.HOOP_Y, hz);
    const cercle = new THREE.Mesh(mergeGeometries([anneau, ...ferrure]), rouge);
    cercle.castShadow = true; g.add(cercle);
    const filet = new THREE.Mesh(filetCorde(p.filet || {}, sgn).translate(0, COURT.HOOP_Y, hz),
      new THREE.MeshStandardMaterial({ color: 0xf2f0e8, roughness: 0.95, emissive: 0x303030 }));
    // cordes de 3,5 mm : hors de la passe de normales de l'occlusion (drapeau lu par js/fx.js), sinon le
    // filet blanc sort gris comme une chaîne, avec une auréole sale sur la planche (haute et au-dessus)
    filet.userData.sansNormales = true;
    g.add(filet);
  }
  g.position.x = x;
  scene.add(g);
  return g;
}

// LE PANNEAU : une boîte de 4 cm dont la face avant porte une peinture dessinée (cadre, liseré, carré, boulons)
// — des filets de 6 mm posés devant se battaient avec la face (z-fighting) et faisaient un carré trop grand.
// Blanc qui reste l'objet le plus CLAIR de la scène même à l'ombre, comme sur les photos : une émission prise
// dans la peinture elle-même (le blanc s'allume, le noir du cadre reste noir). Chants noirs (potences), bleus
// (D1) ou blanc cassé (D3, le panneau 'nu' sans cadre). La face avant regarde toujours le milieu du terrain.
function panneauReel(K, p, bz, yB) {
  const tex = texturePanneau(K, p);
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.36 });
  // (panneau 'nu', D3 : pas de cadre, les chants sont du même blanc cassé que le dos)
  const chant = new THREE.MeshStandardMaterial(p.peinture === 'bleu'
    ? { color: 0x3f73a8, roughness: 0.55, emissive: 0x3f73a8, emissiveIntensity: 0.12 }
    : p.peinture === 'nu' ? { color: 0xc9ccca, roughness: 0.6, emissive: 0xc9ccca, emissiveIntensity: 0.1 }
      : { color: 0x1f2328, roughness: 0.5 });
  const dos = new THREE.MeshStandardMaterial({ color: 0xdfe2e2, roughness: 0.7, emissive: 0xdfe2e2, emissiveIntensity: 0.12 });
  // Les faces d'une boîte se suivent dans l'index : +x, -x, +y, -y, puis +z (la face peinte) et -z (le dos). On
  // regroupe les quatre chants : trois appels de dessin au lieu de six.
  const geo = new THREE.BoxGeometry(p.LB, p.HB, 0.04);
  geo.clearGroups(); geo.addGroup(0, 24, 0); geo.addGroup(24, 6, 1); geo.addGroup(30, 6, 2);
  const m = new THREE.Mesh(geo, [chant, face, dos]);
  m.position.set(0, yB, bz); m.rotation.y = p.sgn > 0 ? Math.PI : 0;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// La peinture de la face avant, vue du terrain (la gauche de la toile est la gauche du joueur). 512 px de large.
function texturePanneau(K, p) {
  const cuite = texCuite(texturePanneau, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  const W = 512, H = Math.round(W * p.HB / p.LB), px = W / p.LB, m = (v) => v * px;
  const bleu = p.peinture === 'bleu', nu = p.peinture === 'nu';
  return K.canvasTex(W, H, (g, w, h) => {
    g.fillStyle = '#eef0ef'; g.fillRect(0, 0, w, h);
    // le voile : traînées verticales grises laissées par la pluie, et le bas plus gris (poussière, ballons)
    for (let i = 0; i < 40; i++) {
      const l = rnd(0.25, 0.9) * h, y0 = rnd(0, h - l), x0 = Math.random() * w;
      const gr = g.createLinearGradient(0, y0, 0, y0 + l);
      gr.addColorStop(0, 'rgba(206,210,209,0)'); gr.addColorStop(0.6, `rgba(206,210,209,${rnd(0.1, 0.3).toFixed(2)})`);
      gr.addColorStop(1, 'rgba(206,210,209,0)');
      g.fillStyle = gr; g.fillRect(x0, y0, rnd(3, 16), l);
    }
    const bas = g.createLinearGradient(0, h * 0.6, 0, h);
    bas.addColorStop(0, 'rgba(188,192,190,0)'); bas.addColorStop(1, 'rgba(188,192,190,0.35)');
    g.fillStyle = bas; g.fillRect(0, h * 0.6, w, h * 0.4);
    // le pourtour, 4 cm
    const E = m(0.04);
    if (bleu) {
      // D1 : liseré bleu écaillé, des tronçons noirs de 5 à 25 cm — beaucoup à gauche et en bas, peu à droite
      for (const [x0, y0, lw, lh, noir] of [[0, 0, w, E, 0.3], [w - E, 0, E, h, 0.15], [0, h - E, w, E, 0.5], [0, 0, E, h, 0.8]]) {
        g.fillStyle = '#3f73a8'; g.fillRect(x0, y0, lw, lh);
        const horiz = lw > lh, long = horiz ? lw : lh;
        for (let s = 0; s < long;) {
          const l = m(rnd(0.05, 0.25));
          if (Math.random() < noir) { g.fillStyle = '#1b1e23'; if (horiz) g.fillRect(x0 + s, y0, l, lh); else g.fillRect(x0, y0 + s, lw, l); }
          s += l;
        }
      }
    } else if (!nu) {
      g.fillStyle = '#1f2328';
      g.fillRect(0, 0, w, E); g.fillRect(0, h - E, w, E); g.fillRect(0, 0, E, h); g.fillRect(w - E, 0, E, h);
    }
    // (panneau 'nu', D3 : pas de pourtour du tout, et un carré gris ardoise délavé plutôt que noir)
    // le carré de visée, cotes EXTÉRIEURES, bord bas de 8 à 10 cm au-dessus du bas du panneau (vers 3,00 m, au
    // niveau du cercle) ; sur D1 le côté haut est bleu et les trois autres bleu nuit
    const [CL, CH, ep, ecart = 0.1] = p.carre, x0 = (w - m(CL)) / 2, y1 = h - m(ecart), y0 = y1 - m(CH), e = m(ep);
    const noirCarre = nu ? '#3a3d40' : '#1e2126';
    g.fillStyle = bleu ? '#1f2a3a' : noirCarre;
    g.fillRect(x0, y1 - e, m(CL), e); g.fillRect(x0, y0, e, m(CH)); g.fillRect(x0 + m(CL) - e, y0, e, m(CH));
    g.fillStyle = bleu ? '#3f73a8' : noirCarre; g.fillRect(x0, y0, m(CL), e);
    // D2 : deux têtes de boulon dans les coins hauts du carré, un trou à gauche (photo 42)
    if (p.boulons) {
      const rond = (bx, by, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(bx, by, r, 0, 6.29); g.fill(); };
      for (const s of [-1, 1]) {
        const bx = w / 2 + s * m(CL / 2 - ep - 0.022), by = y0 + e + m(0.022);
        rond(bx, by, m(0.016), '#5c6166'); rond(bx, by, m(0.011), '#8a8f94');
      }
      rond(m(0.42), h - m(0.33), m(0.012), '#3a3d40');
    }
  }, null, false, 8);
}

// Un tube carré incliné dans le plan x = 0, de (z1, y1) à (z2, y2), coupé D'APLOMB aux deux bouts : il s'appuie
// contre le poteau et contre la platine sans dépasser. Une boîte dont on cisaille les sommets. `c` : sa section ;
// elle est 4 mm moins large que le poteau, pour que leurs flancs ne soient pas dans le même plan (scintillement).
function brasIncline(z1, y1, z2, y2, c) {
  // toujours vers z croissant : dans l'autre sens la boîte serait retournée, faces vers l'intérieur
  const [za, ya, zb, yb] = z1 < z2 ? [z1, y1, z2, y2] : [z2, y2, z1, y1];
  const geo = new THREE.BoxGeometry(c - 0.004, c * Math.hypot(zb - za, yb - ya) / (zb - za), 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getZ(i) + 0.5;
    pos.setXYZ(i, pos.getX(i), pos.getY(i) + ya + (yb - ya) * t, za + (zb - za) * t);
  }
  geo.computeVertexNormals();
  return geo;
}

// Le galva vieilli, en couleurs de sommets (tout l'acier d'un panier tient ainsi en un maillage) : plus sombre
// au pied (terre, éclaboussures), un rien plus clair sur les faces tournées vers le ciel.
function teinteAcier(geo) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    let v = 0.8 + 0.2 * Math.min(1, Math.max(0, (pos.getY(i) - 0.05) / 0.6));
    if (nor.getY(i) > 0.6) v *= 1.06;
    col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v * 1.01;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// LE FILET DES PANIERS DE DÉCOR : de vraies cordes (prismes de 3,5 mm cousus en un seul maillage), en losanges,
// avec la forme du filet simulé du panier du match (js/hoopfx.js) — un cône texturé faisait un abat-jour gris.
// `o.L` : sa longueur (0,35 à 0,42 m selon les photos) ; `o.dechire` : le tiers avant-gauche arraché et des
// brins qui pendent jusqu'à 0,6 m (D2, photo 42). Repère : centre du cercle à l'origine.
function filetCorde(o = {}, sgn = 1) {
  const R = [0.2255, 0.2, 0.176, 0.153, 0.133, 0.12, 0.117, 0.124], k = (o.L || 0.42) / 0.412;
  const Y = [0, -0.065, -0.13, -0.195, -0.26, -0.322, -0.372, -0.412].map((y) => y * k);
  const N = 12, n = R.length, cordes = [], UP = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
  const noeud = (r, j) => {
    const a = (j + (r % 2 ? 0.5 : 0)) * Math.PI * 2 / N;
    return new THREE.Vector3(Math.cos(a) * R[r], Y[r], Math.sin(a) * R[r]);
  };
  const corde = (a, b) => {
    const d = new THREE.Vector3().subVectors(b, a), l = d.length();
    q.setFromUnitVectors(UP, d.multiplyScalar(1 / l));
    cordes.push(new THREE.CylinderGeometry(0.0035, 0.0035, l, 3, 1, true).applyQuaternion(q)
      .translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2));
  };
  // le trou : 120° centrés sur l'avant-gauche vu du terrain (avant = -sgn·z, gauche = +sgn·x), sous le 2e rang
  const aTrou = Math.atan2(-sgn, sgn);
  const arrache = (v, r) => {
    if (!o.dechire || r < 2) return false;
    const d = Math.atan2(v.z, v.x) - aTrou;
    return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < Math.PI / 3;
  };
  for (let r = 0; r < n - 1; r++) {
    for (let j = 0; j < N; j++) {
      const a = noeud(r, j);
      if (arrache(a, r)) continue;
      for (const jj of r % 2 ? [j, j + 1] : [j - 1, j]) { const b = noeud(r + 1, jj); if (!arrache(b, r + 1)) corde(a, b); }
    }
  }
  for (let j = 0; j < N; j++) {
    const a = noeud(n - 1, j), b = noeud(n - 1, j + 1);
    if (!arrache(a, n - 1) && !arrache(b, n - 1)) corde(a, b);
  }
  if (o.dechire) {
    // les brins arrachés : au bord du trou, et quelques-uns plus longs sous l'ourlet, du côté resté entier
    const pendre = (a, l) => {
      const b = a.clone().add(new THREE.Vector3(rnd(-0.03, 0.03), -l * 0.55, rnd(-0.03, 0.03)));
      const c = b.clone().add(new THREE.Vector3(rnd(-0.02, 0.02), -l * 0.45, rnd(-0.02, 0.02)));
      corde(a, b); corde(b, c);
    };
    for (let r = 2; r < n; r += 2) {
      for (let j = 0; j < N; j++) {
        const a = noeud(r, j);
        if (!arrache(a, r) && (arrache(noeud(r, j - 1), r) || arrache(noeud(r, j + 1), r))) pendre(a, rnd(0.12, 0.24));
      }
    }
    for (let j = 0; j < N; j += 2) { const a = noeud(n - 1, j); if (!arrache(a, n - 1) && Math.random() < 0.6) pendre(a, rnd(0.1, 0.19)); }
  }
  return mergeGeometries(cordes);
}

// =====================================================================
//  LA CAGE DE HAND
// =====================================================================
// LA CAGE DE HAND (photos du 26/09, vues à 1,5 m) : un simple cadre de 3 x 2 m (ouverture intérieure), SANS
// filet ni arceaux, en TUBE ROND de 8 cm cintré aux deux angles (rayon 10 cm), peint en bandes rouges et
// GRIS ACIER (le galvanisé à nu, pas du blanc) d'une vingtaine de centimètres, rouge sur tout le cintrage ;
// « SPORT FRANCE » en bleu, à la verticale, sur le montant côté mur (celui de droite vu du terrain), lu de bas
// en haut. Un seul tube le long du cadre : les bandes suivent l'abscisse curviligne, les coudes compris.
// `zCadre` = le plan du cadre ; `sens` = le côté vers lequel elle s'ouvre (-1 : vers -z).
function cageHand(scene, K, x, zCadre, sens) {
  const g = new THREE.Group();
  const R = 0.04, RC = 0.1, XA = 1.5 + R, YA = 2.0 + R;           // tube, cintrage, axes des montants et de la barre
  const V = (a, b) => new THREE.Vector3(a, b, 0);
  const cadre = new THREE.CurvePath();
  cadre.add(new THREE.LineCurve3(V(XA, 0), V(XA, YA - RC)));
  cadre.add(new THREE.QuadraticBezierCurve3(V(XA, YA - RC), V(XA, YA), V(XA - RC, YA)));
  cadre.add(new THREE.LineCurve3(V(XA - RC, YA), V(-XA + RC, YA)));
  cadre.add(new THREE.QuadraticBezierCurve3(V(-XA + RC, YA), V(-XA, YA), V(-XA, YA - RC)));
  cadre.add(new THREE.LineCurve3(V(-XA, YA - RC), V(-XA, 0)));
  const L = cadre.getLength(), lm = YA - RC, lc = cadre.curves[1].getLength();
  const s1 = lm + lc / 2, s2 = L - lm - lc / 2, DEMI = 0.17;          // milieux des deux cintrages
  const nb = Math.max(1, Math.round((s2 - s1 - 2 * DEMI) / 0.2) | 1), pas = (s2 - s1 - 2 * DEMI) / nb;
  const rouge = (s) => {
    if (Math.abs(s - s1) < DEMI || Math.abs(s - s2) < DEMI) return true;
    if (s < s1) return Math.floor((s1 - DEMI - s) / 0.2) % 2 === 1;
    if (s > s2) return Math.floor((s - s2 - DEMI) / 0.2) % 2 === 1;
    return Math.floor((s - s1 - DEMI) / pas) % 2 === 1;
  };
  // couleur, et dans une seconde carte la rugosité (vert) et le métal (bleu) : la peinture rouge est mate et
  // diélectrique, le galvanisé brille un peu. Le rouge est PASSÉ par le soleil (photos 42, 185625 et 185626 : un
  // rouge rosé, #8a3440 à l'ombre, jamais le noir-rouge qu'en tirait un rouge vif) et l'acier est un gris bleuté
  const bandes = K.canvasTex(1024, 4, (c, w) => {
    for (let i = 0; i < w; i++) { c.fillStyle = rouge((i + 0.5) / w * L) ? '#cc4a55' : '#b3bcc8'; c.fillRect(i, 0, 1, 4); }
  }, null, false, 4);
  const orm = K.canvasTex(1024, 4, (c, w) => {
    for (let i = 0; i < w; i++) { c.fillStyle = rouge((i + 0.5) / w * L) ? 'rgb(0,128,0)' : 'rgb(0,100,90)'; c.fillRect(i, 0, 1, 4); }
  }, null, false, 4);
  orm.colorSpace = THREE.NoColorSpace;
  const tube = new THREE.Mesh(new THREE.TubeGeometry(cadre, 180, R, 10, false),
    new THREE.MeshStandardMaterial({ map: bandes, roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1 }));
  tube.castShadow = true; tube.receiveShadow = true; g.add(tube);
  // l'inscription, sur le montant côté mur (local -x), tournée vers le terrain (-z local) : une portion de
  // cylindre collée au tube, lue de bas en haut
  const texte = K.canvasTex(64, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.save(); c.translate(w / 2, h / 2); c.rotate(-Math.PI / 2);
    c.fillStyle = '#2f55a8'; c.font = 'bold 44px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('SPORT FRANCE', 0, 0); c.restore();
  }, null, true, 4);
  const ins = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.0015, R + 0.0015, 0.62, 10, 1, true, Math.PI - 0.75, 1.5),
    new THREE.MeshStandardMaterial({ map: texte, transparent: true, roughness: 0.6, depthWrite: false }));
  ins.position.set(-XA, 1.45, 0); g.add(ins);
  g.position.set(x, 0, zCadre); g.rotation.y = sens > 0 ? Math.PI : 0; scene.add(g);
}

// =====================================================================
//  LA VÉGÉTATION
// =====================================================================
// COUDRE UN FEUILLAGE. Des plans de touffes cousus en un maillage s'éclairent comme autant de petits
// panneaux : chacun prend la lumière selon SA propre orientation, et la couronne se lit comme un tas de
// cartes à facettes — c'était le défaut majeur de tous les arbres du parc. On leur donne donc l'éclairage
// d'un VOLUME : la normale de chaque sommet sort du centre de sa couronne (un peu relevée vers le ciel), si
// bien que la couronne entière s'éclaire comme une boule de feuilles, claire au soleil, sombre à l'ombre.
// Et une teinte par sommet (vertexColors) : plus sombre au cœur et en bas de la couronne (la lumière n'y
// entre pas), plus claire en surface, avec une variation propre à chaque touffe.
// `infos[i]` = { c: [x, y, z] centre du volume, r: rayon, t: teinte de la touffe (0,85 à 1,15) }.
// Deux réglages, pour les feuillages denses qu'on voit de près (le rideau du quai, le massif du talus du pin) :
//  - `o.coeur` : un cœur plus sombre, plancher 0,45 au lieu de 0,62. Contre-examen du 30/09, ciel neutralisé : ce
//    qui manque à ces deux-là, c'est le creux sombre entre les grappes (le rideau de la photo 343 est noir au fond,
//    entre deux chapelets de feuilles claires) ; 0,62 en faisait une tenture unie ;
//  - `o.jaunies` : la part de touffes vert-jaune (7 % par défaut). Le rideau en porte 12 % : sur les photos 343 et
//    185558, ce sont ces feuilles translucides, éparses, qui l'éclairent de l'intérieur — portées par la teinte de
//    TOUFFE, jamais par la tuile, où une feuille jaune se répétait trois mille fois en camouflage.
function coudre(touffes, infos, o = {}) {
  // (repères relevés sur les photos : plancher d'ombre 0,62 au cœur ; 7 % de touffes jaunies, 10 % bleutées ;
  // +12 % sur la face tournée vers le soleil)
  const SX = 0.52, SY = 0.85, SZ = 0.28;                // direction du soleil (js/court.js SUN_DIR, normée)
  const plancher = o.coeur ? 0.45 : 0.62, jaunies = o.jaunies || 0.07;
  for (let i = 0; i < touffes.length; i++) {
    const g = touffes[i], f = infos[i], p = g.attributes.position, n = g.attributes.normal;
    const col = new Float32Array(p.count * 3);
    const tir = Math.random(), teinte = tir < jaunies ? [1.08, 1.02, 0.8] : tir < jaunies + 0.1 ? [0.94, 1.0, 1.04] : [1, 1, 0.96];
    // le centre de la touffe par rapport au volume : face au soleil ou non
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < p.count; k++) { cx += p.getX(k); cy += p.getY(k); cz += p.getZ(k); }
    cx = cx / p.count - f.c[0]; cy = cy / p.count - f.c[1]; cz = cz / p.count - f.c[2];
    const soleil = (cx * SX + cy * SY + cz * SZ) > 0.4 * f.r ? 1.12 : 1;
    for (let k = 0; k < p.count; k++) {
      const dx = p.getX(k) - f.c[0], dy = p.getY(k) - f.c[1], dz = p.getZ(k) - f.c[2];
      const ny = dy + f.r * 0.45, l = Math.hypot(dx, ny, dz) || 1;
      n.setXYZ(k, dx / l, ny / l, dz / l);
      const prof = Math.min(1, Math.hypot(dx, dy, dz) / f.r);             // 0 au cœur, 1 en surface
      const haut = Math.min(1, Math.max(0, dy / f.r * 0.5 + 0.5));          // 0 dessous, 1 dessus
      const v = f.t * soleil * (plancher + (1 - plancher) * prof) * (0.85 + 0.15 * haut);
      col[k * 3] = v * teinte[0]; col[k * 3 + 1] = v * teinte[1]; col[k * 3 + 2] = v * teinte[2];
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  return mergeGeometries(touffes);
}

// Le soleil couchant des photos du 26/09 (vers lui : 24° de z+ vers x+, 8° au-dessus de l'horizon — un peu plus
// que les 4-5° réels, pour que le dôme vu d'en dessous en prenne), et l'intensité de son contre-jour, que la
// météo baisse (voir pinParasol).
const DIR_CJ = new THREE.Vector3(0.405, 0.139, 0.904).normalize();
// LE PARC EN PLEIN JOUR (05/10/2026). Depuis le lot L7 (30/09), le parc était calé sur les photos de fin de journée : un
// soleil à 5°, derrière le pin, et tout le plateau tenu à l'ombre (écran invisible, puis zone d'ombre forcée) — juste,
// mais plat : plus une ombre sur le terrain. Haythem préférait de loin l'image d'avant, son soleil et ses ombres de
// feuillage découpées sur l'enrobé. `false` rend le soleil couchant.
const PARC_JOUR = true;
const CONTRE_JOUR = { value: 0.22 };
// La part du ciel transmise par TOUS les feuillages dessinés (× leur `trans`), posée par la météo selon qu'il y a une
// carte d'environnement ou non (js/weather.js, `transEnv` / `transSansEnv` des préréglages du parc) : lot L7, voir
// scene.userData.meteo dans buildParc.
const CIEL_TRANSMIS = { value: 1 };

// LE MATÉRIAU DE FEUILLAGE, partagé par tous les arbres du parc. Trois corrections de rendu, relevées en
// comparant les images du jeu aux photos :
//  - DoubleSide RETOURNE la normale des faces vues de dos (`normal *= faceDirection` dans three) : la moitié
//    des plans prenaient une normale tournée vers l'intérieur de la couronne et sortaient NOIRS. On garde la
//    normale « volume » de coudre() des deux côtés ;
//  - la LUMIÈRE TRANSMISE : une feuille à contre-jour laisse passer la lumière. Sans elle, le dessous des
//    couronnes et le rideau du quai (qui tourne le dos au soleil) ne recevaient que le ciel et viraient au
//    vert-noir. Voir plus bas (« la lumière transmise ») ;
//  - les MIPMAPS : à distance, l'alpha moyenné passe sous le seuil et la couronne se troue ; on le remonte
//    avec le niveau de mip (`o.taille` : largeur de la texture, en texels par unité d'UV — 512 par défaut).
// `o.trans` : part de la lumière du CIEL transmise ; `o.rugosite`. Le matériau d'ombre découpée est dans
// userData.ombre : il suit le vent et la tranche (plus bas), sinon les ombres restaient figées, en planches.
// LA LUMIÈRE TRANSMISE (lot L3, 30/09). Ce n'est plus une émission constante : c'était la même lueur partout, au cœur
// comme au faîte, à l'ombre de l'écran du pin comme au soleil, par tous les temps — d'où le rideau du quai en papier
// peint pâle (0,72 fois l'enrobé en extrême, 0,35 à 0,6 sur les photos 340, 343 et 185558). Deux parts :
//  - le CIEL, diffus, qui passe au travers de partout : `trans` × l'albédo (la teinte par sommet de coudre() y met déjà
//    le cœur sombre), un peu moins quand on plonge sur le feuillage (on en voit alors le dessus). Les valeurs de chaque
//    famille sont recalées sur ce ciel (rideau, platanes, arbustes du talus : voir leurs réglages) ; `o.contreCiel` :
//    un surcroît quand on regarde le feuillage en face du couchant (les arbustes du talus du pin) ;
//  - le SOLEIL, là seulement où il arrive — la carte d'ombre du soleil, lue à chaque sommet avec un recul de 50 cm vers
//    lui (une feuille ne s'ombre pas elle-même), et nulle hors de la carte : le plateau, à l'ombre de l'écran du pin, n'en
//    reçoit rien — et seulement vu À CONTRE-JOUR : une part suit le dos du volume tourné au soleil, l'autre le regard
//    qui file vers lui (diffusion vers l'avant, la feuille « lanterne »). Il prend la couleur et la force de la lumière
//    de la scène : l'or du couchant par beau temps, presque rien sous la pluie. Sur la photo 185558, c'est lui qui
//    dore le faîte du rideau et ses grappes du haut, quand tout le bas est dans l'ombre bleutée du soir.
//    `o.soleil` : son gain (× trans ; SOLEIL_TRANSMIS par défaut, 0 pour le pin, qui a son propre contre-jour).
// Et deux corrections de forme :
//  - LA TRANCHE : un plan de touffe vu presque par la tranche dessine un trait de feuilles, une « planche » (le
//    massif du talus du pin, le bord du fond : contre-examen du 30/09). Il s'efface en fondu passé 60° de face (plus
//    rien à 77°) : un de ses voisins, tourné autrement, prend le relais. La normale du plan se lit dans les dérivées
//    écran de la position (le plan est plat : c'est exact), sans attribut de plus — la règle vaut donc aussi pour les
//    cartes des zones du parc entier. `o.tranche === false` l'éteint ;
//  - LE VENT : rafales (l'amplitude respire de 0,3 à 1 sur 30 à 50 s) et frémissement (un rameau, 1 Hz, 3,5 cm),
//    en espace monde comme windifyWorld (js/court.js), le balancement seulement au-dessus de 2,5 m ; `o.vent` :
//    amplitude de la famille (rideau taillé 0,6, arbustes 0,8, platanes 0,5, fond 0,7). Les feuillages dessinés
//    étaient les seuls du jeu à ne pas bouger.
// Deux réglages de plus, pour le pin parasol vu d'en dessous (photos du 26/09) :
//  - `o.dessous` : quand on LÈVE LES YEUX vers la couronne (regard à plus de 17° au-dessus de l'horizon, plein
//    effet passé 58°), l'albédo des touffes tombe à ce facteur : on voit alors leur face à l'ombre, dessus
//    compris — sous un dôme aussi dense le dessous ne reçoit presque rien, il est noir sur le ciel. De loin, vu
//    depuis le terrain (photo 42), le bas du dôme ne bouge pas et son haut perd environ 12 % ;
//  - `o.contreJour` : le soleil couchant derrière le pin (18 h 56 : 4 à 5° au-dessus de l'horizon, vers z+ et
//    un peu x+, relevé sur les photos) traverse les aiguilles : vu d'en dessous, le bord des touffes (là où la
//    carte s'amincit) s'allume en or du côté du soleil. Ce soleil-là n'est pas la lumière de la scène (SUN_DIR,
//    haute et commune à tous les terrains) : c'est une émission qui dépend de la direction du regard, nulle
//    tant qu'on ne lève pas les yeux (la caméra de diffusion, à hauteur de la couronne, n'en voit rien), et que
//    la météo éteint (CONTRE_JOUR, voir pinParasol).
// Un troisième, pour le rideau du quai :
//  - `o.silhouette` : quand on regarde VERS le soleil bas du parc (DIR_CJ) à travers le feuillage, on voit la face
//    à l'ombre des feuilles : la lumière diffuse (directe et du ciel) tombe de cette part, les reflets s'éteignent,
//    il ne reste que la lumière transmise. Sans lui, vu depuis le terrain vers le coin du pin (photos 39 et 42), le
//    bout du rideau renvoyait en reflet rasant le couchant (le soleil et la lueur de la carte HDR) : des feuilles
//    « lanterne en papier » blanc crème, là où les photos montrent une silhouette sombre à contre-jour ;
//  - `o.reflet` (0 à 1 ; 1 dès qu'il y a une silhouette) : n'éteint QUE le reflet à contre-jour, sans toucher au
//    diffus. Les arbustes du talus du pin, vus du plateau vers le couchant, sortaient en papier kraft doré (4,5 à
//    11,5 % de pixels dorés dans le massif, 0,22 % sur la photo 342) : c'était le reflet rasant de GGX sous le soleil
//    à 5°, pas leur couleur. Éteindre aussi le diffus (`silhouette` 0,85) les rendait trop sombres (0,45 de
//    l'enrobé, 0,63 sur la photo) : on éteint le reflet, et un peu seulement du diffus.
export function materiauFeuilles(map, o = {}) {
  const m = new THREE.MeshStandardMaterial({ map, alphaTest: o.alpha || 0.42, side: THREE.DoubleSide,
    roughness: o.rugosite || 0.8, vertexColors: true });
  const trans = o.trans || 0.2, dessous = o.dessous || 1, cj = !!o.contreJour, sil = o.silhouette || 0;
  const sansReflet = o.reflet !== undefined ? o.reflet : (sil ? 1 : 0);
  const soleil = o.soleil !== undefined ? o.soleil : (cj ? 0 : SOLEIL_TRANSMIS);
  const vent = o.vent !== undefined ? o.vent : 0.6, tranche = o.tranche !== false, taille = o.taille || 512, cc = o.contreCiel || 0;
  // (la teinte de la famille : `o.teinte`, sinon celle que porte la texture — voir TEINTES_FEUILLES)
  const uTeinte = { value: matriceTeinte(o.teinte || (map && map.userData.teinte)) };
  m.userData.teinte = uTeinte;
  const special = dessous !== 1 || cj;
  const uVentA = { value: vent };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTrans = { value: trans }; sh.uniforms.uTeinte = uTeinte; sh.uniforms.uCielT = CIEL_TRANSMIS;
    sh.uniforms.uVent = VENT; sh.uniforms.uVentA = uVentA; sh.uniforms.uSoleilT = { value: trans * soleil };
    let silh = '';
    if (sil || sansReflet) {
      sh.uniforms.uSil = { value: sil }; sh.uniforms.uReflet = { value: sansReflet }; sh.uniforms.uDirSil = { value: DIR_CJ };
      // (le reflet, lui, s'éteint TOUT À FAIT, et dès 45° du soleil : sous un regard rasant, à contre-jour, le terme
      // spéculaire de GGX est cinq à dix fois la lumière diffuse, et 15 % de lui laissaient encore des feuilles
      // beige clair sous la branche du coin, photo 39)
      silh = '\n{ float dd = dot(normalize(-vViewPosition), normalize(mat3(viewMatrix) * uDirSil));\n'
        + '  float sil = uSil * smoothstep(0.5, 0.9, dd), mir = uReflet * smoothstep(0.3, 0.75, dd);\n'
        + '  reflectedLight.directDiffuse *= 1.0 - sil; reflectedLight.indirectDiffuse *= 1.0 - 0.6 * sil;\n'
        + '  reflectedLight.directSpecular *= 1.0 - mir; reflectedLight.indirectSpecular *= 1.0 - mir; }';
    }
    // la part du ciel, puis (après l'éclairage, là où `normal` est connue) celle du soleil. Le ciel est AU-DESSUS : sa
    // lumière traverse les feuilles vers le bas, on la voit en levant les yeux ou à l'horizontale, pas d'en haut — vu
    // de la caméra de diffusion, qui plonge sur le massif du pin et sur la haie, on voit surtout le dessus éclairé des
    // feuilles (la moitié en plongée franche, passé 45° ; 0,57 à 30° ; 0,9 à 10° ; 1 à l'horizontale ; 1,05 en levant
    // les yeux)
    // (`o.contreCiel` : vu en face du couchant — à moins de 50° de lui —, c'est le ciel le plus clair, la lueur autour
    // du soleil, qui est derrière le feuillage : il en passe jusqu'à 1 + contreCiel fois plus)
    let bloc = 'totalEmissiveRadiance += diffuseColor.rgb * uTrans * uCielT * mix(0.5, 1.05, smoothstep(-0.7, 0.2, dot(normalize(-vViewPosition), mat3(viewMatrix)[1])))'
      + (cc ? ' * (1.0 + uCielCJ * smoothstep(0.6, 0.95, dot(normalize(-vViewPosition), normalize(mat3(viewMatrix) * uDirCC))))' : '') + ';';
    if (cc) { sh.uniforms.uCielCJ = { value: cc }; sh.uniforms.uDirCC = { value: DIR_CJ }; }
    // (vu d'en dessous, la touffe montre son revers, que la normale « volume » ne sait pas dire : on éteint aussi
    // son reflet — sinon le reflet rasant du ciel, que Fresnel pousse au blanc, peignait le dôme en beige)
    let reflet = '';
    if (special) {
      sh.uniforms.uDessous = { value: dessous }; sh.uniforms.uCJ = CONTRE_JOUR; sh.uniforms.uDirCJ = { value: DIR_CJ };
      bloc = 'vec3 vdPin = normalize(-vViewPosition);\n'
        + 'float basPin = smoothstep(0.3, 0.85, dot(vdPin, mat3(viewMatrix)[1]));\n'
        + 'diffuseColor.rgb *= mix(1.0, uDessous, basPin);\n'
        + '{ float cj = ' + (cj ? 'pow(max(dot(vdPin, normalize(mat3(viewMatrix) * uDirCJ)), 0.0), 6.0) * smoothstep(0.2, 0.6, dot(vdPin, mat3(viewMatrix)[1]))' : '0.0') + ', bord = 1.0 - smoothstep(0.45, 1.0, diffuseColor.a);\n'
        + '  totalEmissiveRadiance += vec3(1.0, 0.72, 0.38) * uCJ * cj * bord; }\n' + bloc;
      reflet = '\nreflectedLight.directSpecular *= 1.0 - basPin * (1.0 - uDessous);\nreflectedLight.indirectSpecular *= 1.0 - basPin * (1.0 - uDessous);';
    }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uVent, uVentA;')
      .replace('#include <shadowmap_pars_vertex>', '#include <shadowmap_pars_vertex>' + (soleil ? SOLEIL_OMBRE_PARS : ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>' + (vent ? VENT_FEUILLES : ''))
      .replace('#include <shadowmap_vertex>', '#include <shadowmap_vertex>' + (soleil ? SOLEIL_OMBRE_SOMMET : ''));
    sh.fragmentShader = 'uniform float uTrans, uCielT;\n' + (special ? 'uniform float uDessous, uCJ;\nuniform vec3 uDirCJ;\n' : '')
      + (silh ? 'uniform float uSil, uReflet;\nuniform vec3 uDirSil;\n' : '')
      + (soleil ? 'uniform float uSoleilT;\nvarying float vSoleilVis;\n' : '') + (cc ? 'uniform float uCielCJ;\nuniform vec3 uDirCC;\n' : '') + sh.fragmentShader
      .replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''))
      .replace('#include <alphatest_fragment>',
        '#ifdef USE_MAP\n{ vec2 tx = vMapUv * ' + taille.toFixed(1) + '; float mip = max(0.0, 0.5 * log2(max(dot(dFdx(tx), dFdx(tx)), dot(dFdy(tx), dFdy(tx))))); diffuseColor.a *= 1.0 + 0.25 * mip; }\n#endif\n'
        + (tranche ? TRANCHE_GLSL('vViewPosition', 'normalize(vViewPosition)') : '') + '#include <alphatest_fragment>')
      .replace('#include <common>', '#include <common>\n' + TEINTE_DECL).replace('#include <color_fragment>', '#include <color_fragment>\n' + TEINTE_GLSL)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + bloc)
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>' + reflet + silh + (soleil ? SOLEIL_TRANSMIS_GLSL : ''));
  };
  // (la clé ne décrit que ce qui change le CODE ; les réglages — trans, silhouette, reflet, soleil, vent — sont des
  // uniformes, propres à chaque matériau)
  m.customProgramCacheKey = () => 'feuilles-' + trans + (special ? '-' + dessous + (cj ? '-cj' : '') : '') + (sil || sansReflet ? '-sil' : '')
    + (soleil ? '-sol' : '') + (tranche ? '-tr' : '') + (vent ? '-v' : '') + (cc ? '-cc' : '') + (taille !== 512 ? '-t' + taille : '');
  // l'ombre découpée : même vent, même tranche (vue, cette fois, depuis le soleil : caméra orthographique)
  const ombre = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: o.alpha || 0.42, side: THREE.DoubleSide });
  ombre.onBeforeCompile = (sh) => {
    sh.uniforms.uVent = VENT; sh.uniforms.uVentA = uVentA;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uVent, uVentA;' + (tranche ? '\nvarying vec3 vPosTr;' : ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>' + (vent ? VENT_FEUILLES : ''))
      .replace('#include <project_vertex>', '#include <project_vertex>' + (tranche ? '\nvPosTr = mvPosition.xyz;' : ''));
    if (tranche) {
      sh.fragmentShader = 'varying vec3 vPosTr;\n' + sh.fragmentShader.replace('#include <alphatest_fragment>',
        TRANCHE_GLSL('vPosTr', '(isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(vPosTr))') + '#include <alphatest_fragment>');
    }
  };
  ombre.customProgramCacheKey = () => 'feuilles-ombre' + (tranche ? '-tr' : '') + (vent ? '-v' : '');
  m.userData.ombre = ombre;
  m.userData.vent = uVentA;
  return m;
}

// Le gain de la lumière transmise du SOLEIL (× trans), voir materiauFeuilles.
const SOLEIL_TRANSMIS = 3.5;
// Le vent des feuillages dessinés (voir materiauFeuilles) : le code de windifyWorld (js/court.js, VENT_MONDE), en
// espace monde — instances et lots compris —, sur l'horloge du parc (VENT), mis à l'échelle de la famille (`uVentA`).
// Le frémissement vaut à toute hauteur (un arbuste frémit aussi), le balancement seulement au-dessus de 2,5 m.
const VENT_FEUILLES = `
  { vec4 vfP = vec4( transformed, 1.0 ); float vfS = length( modelMatrix[ 0 ].xyz );
    #ifdef USE_INSTANCING
      vfP = instanceMatrix * vfP; vfS *= length( instanceMatrix[ 0 ].xyz );
    #endif
    #ifdef USE_BATCHING
      vfP = batchingMatrix * vfP; vfS *= length( batchingMatrix[ 0 ].xyz );
    #endif
    vfP = modelMatrix * vfP;
    float vfK = smoothstep( 2.5, 8.0, vfP.y );
    float vfPh = uVent * 1.2 + vfP.x * 0.3 + vfP.z * 0.25;
    float vfR = 0.65 + 0.35 * sin( uVent * 0.21 + vfP.x * 0.015 ) * sin( uVent * 0.13 + 1.3 );
    float vfF = uVent * 6.3 + dot( vfP.xyz, vec3( 4.1, 3.3, 3.7 ) );
    vec3 vfD = vec3( sin( vfF ), 0.6 * sin( vfF * 1.37 + 1.7 ), cos( vfF * 0.83 ) ) * 0.035;
    vfD.x += ( sin( vfPh ) * 0.08 + sin( vfPh * 2.7 ) * 0.03 ) * vfK;
    vfD.z += cos( vfPh * 0.8 ) * 0.06 * vfK;
    transformed += vfD * ( uVentA * vfR / max( vfS, 0.0001 ) ); }`;
// La tranche (voir materiauFeuilles) : `p` est la position dans le repère de la caméra (ses dérivées écran donnent le
// plan de la carte), `v` la direction du regard dans ce repère. Fondu de 60° (cos 0,5) à 77° (cos 0,22).
const TRANCHE_GLSL = (p, v) => `{ vec3 tpN = cross( dFdx( ${p} ), dFdy( ${p} ) );
  diffuseColor.a *= smoothstep( 0.22, 0.5, abs( dot( tpN, ${v} ) ) * inversesqrt( max( dot( tpN, tpN ), 1e-30 ) ) ); }
`;
// LE SOLEIL VU DEPUIS LA FEUILLE, lu dans la carte d'ombre du soleil PAR SOMMET (et non par pixel : une carte de touffe
// fait un mètre, la lumière y varie lentement, et quatre lectures par pixel, sur tout le feuillage et ses
// recouvrements, coûtaient un demi-milliseconde sur la puce intégrée ; par sommet, c'est deux cent mille lectures, rien).
// La position monde est avancée de 50 cm vers le soleil (le long de son rayon : la carte, orthographique, n'y voit qu'un
// recul de profondeur) — la feuille ne s'ombre pas elle-même ; le reste du feuillage et l'écran du pin, si. La
// direction du soleil se lit dans la matrice de la carte (sa ligne de profondeur). Une seule lecture : le fondu entre
// les sommets de la carte fait le bord doux. Hors de la carte, ou sans carte, le soleil ne passe PAS : on ne rallume
// jamais un feuillage que l'écran du pin met à l'ombre.
const SOLEIL_OMBRE_PARS = `
varying float vSoleilVis;
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
#include <packing>
uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
float feuilleAuSoleil( vec3 soW ) {
  mat4 soM = directionalShadowMatrix[ 0 ];
  vec3 soV = - normalize( vec3( soM[ 0 ][ 2 ], soM[ 1 ][ 2 ], soM[ 2 ][ 2 ] ) );
  vec4 soH = soM * vec4( soW + soV * 0.5, 1.0 ); vec3 soC = soH.xyz / soH.w;
#ifdef OMBRE_MONDE
  // parc entier (js/monde_ombres.js) : la carte qui suit le joueur, la carte lointaine cuite au-delà, la zone forcée du pin
  return ombreMondeFeuille( soW, step( soC.z, unpackRGBAToDepth( textureLod( directionalShadowMap[ 0 ], clamp( soC.xy, 0.0, 1.0 ), 0.0 ) ) ), soC );
#endif
  vec2 soB = min( soC.xy, 1.0 - soC.xy ); float soBord = min( soB.x, soB.y );
  if ( soBord <= 0.0 || soC.z >= 1.0 ) return 0.0;
  return step( soC.z, unpackRGBAToDepth( textureLod( directionalShadowMap[ 0 ], soC.xy, 0.0 ) ) ) * smoothstep( 0.0, 0.03, soBord );
}
#endif`;
const SOLEIL_OMBRE_SOMMET = `
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
  vSoleilVis = feuilleAuSoleil( worldPosition.xyz );
#else
  vSoleilVis = 0.0;
#endif`;
// La lumière transmise du soleil (voir materiauFeuilles), ajoutée après l'éclairage : `normal` est alors la normale
// « volume » (en espace vue), `directionalLights[ 0 ]` le soleil (three range les lumières qui portent ombre en tête).
const SOLEIL_TRANSMIS_GLSL = `
#if NUM_DIR_LIGHTS > 0
{ vec3 soL = directionalLights[ 0 ].direction;
  float soA = max( dot( normalize( - vViewPosition ), soL ), 0.0 );
  float soT = vSoleilVis * ( 0.35 * max( - dot( normal, soL ), 0.0 ) + 0.65 * soA * soA );
  totalEmissiveRadiance += diffuseColor.rgb * uSoleilT * soT * directionalLights[ 0 ].color; }
#endif`;

// Tout maillage de feuillage est déclaré ici : js/fx.js le masque pendant la passe de normales de
// l'occlusion ambiante (GTAO), qui dessine chaque touffe comme un carré PLEIN — d'où des damiers sombres.
function declarerFeuillage(scene, m) { (scene.userData.feuillages = scene.userData.feuillages || []).push(m); return m; }

// LES TEINTES DES FEUILLAGES, par famille. Relevées zone par zone sur les photos 39, 40, 42 et 43 contre le rendu
// aux mêmes poses (lumière du soir, qualité haute, post-traitement compris) : les buissons et les haies sortaient
// 1,5 à 2 fois trop saturés. Plutôt que de retoucher chaque palette dessinée — elles sont partagées avec les
// couleurs de sommet de coudre() et leurs ombres —, la correction s'applique à l'albédo dans le shader
// (materiauFeuilles, habillerFeuillage) : une matrice par matériau, qui ne coûte rien et ne dépend pas de la forme
// des arbres.
// ATTENTION au gris-bleu des photos 40, 42 et 43 : il vient des TROUS du feuillage (le quai, le ciel, le filet, la
// brume du soir), pas des feuilles, qui restent vertes (chroma 8 à 10 sur les photos). Virer au bleu l'albédo pour
// rattraper la couleur MOYENNE d'une zone donne des feuilles lavande (essayé sur le rideau : rejeté).
//  `sat` : saturation de l'albédo (1 = inchangée, 0 = gris) ; `teinte` : filtre [r, g, b], ramené à une
//  luminance de 1 (il ne fait que virer la couleur) ; `clair` : facteur de luminance.
// Chaque texture de feuillage porte sa famille (avecTeinte) ; materiauFeuilles la lit sur sa texture, ou dans
// `o.teinte`. Sans famille (le pin parasol), rien ne change. Les vrais arbres (GLB) : voir ESSENCES (`sat`, `vire`).
const TEINTES_FEUILLES = {
  // arbustes, massifs et lierre du talus du pin (p42 : vert sombre, chroma 8 ; p39 : 11 — le rendu : 15). Revu
  // d'après les photos 39, 42 et 1856230 : un VERT très sombre (0,45 à 0,55 de l'enrobé, teinte 110 à 125°), pas le
  // gris bleuté clair qu'en tiraient 0,78 et le filtre bleu — d'où moins de lumière, un peu plus de vert.
  // Relecture du lot L3 : depuis que le ciel les traverse (trans 0,85, voir vegetationPin), c'est la couleur de leurs
  // feuilles qu'on voit, et elle sortait vert pomme — saturation 0,31 (moyenne des pixels), teinte 93°, contre 0,14 et
  // 111 à 120° sur la photo 342, même zone du massif, où les arbustes à contre-jour sont d'un gris-vert sombre. Moins de
  // saturation (0,85 -> 0,55) et le filtre coupe moins de bleu, à même luminance : 0,22 à 0,27 et 104 à 120° vers le
  // pin, depuis les deux terrains. (0,45 sans coupe de bleu tombait plus près encore de profil, mais vu d'en haut, par la
  // caméra de diffusion du terrain 2, le massif virait au gris-bleu.)
  arbustes: { sat: 0.55, teinte: [0.94, 1.03, 0.97], clair: 0.56 },
  // l'arbre léger, repli du saule : les réglages du saule (ESSENCES)
  leger: { sat: 0.85, teinte: [1, 1, 1], clair: 1.1 },
  // le rideau du quai : sa palette (feuillesMurier) est déjà recalée d'après les photos 39, 40 et 43 (saturation
  // 0,15 à 0,18 contre 0,13) ; la désaturer encore le faisait virer au gris bleuté
  rideau: { sat: 1, teinte: [1, 1, 1], clair: 1 },
  // la haie de troène : sa palette (feuillesTroene) est déjà recalée sur la photo 43 (saturation 0,14 contre 0,13).
  // Mais trop claire : photo 185558, la haie vaut 0,72 fois le rideau au-dessus d'elle, le rendu 0,89 (lot L3)
  haie: { sat: 0.9, teinte: [1, 1, 1], clair: 0.75 },
  // l'arbuste pourpre (p43, p39 : un gris brun-mauve, ni roux comme le brun dessiné, ni bleu). Plus clair et un peu
  // plus coloré depuis qu'il est aéré (arbustePourpre) : ses plans, plus petits et plus épars, sortaient en taches
  // brun-noir. Ainsi, au rendu de la pose 339 : 0,55 fois l'enrobé (photos : 0,55 à 0,7)
  pourpre: { sat: 0.5, teinte: [1.08, 1, 1.02], clair: 2.1 },
  // la voûte des platanes. Recalée d'abord sur la photo 40 (contre-jour, saturation 0,11), elle sortait grise et
  // presque blanche là où le soleil du soir la prend de face : sur la photo 602 du 27/09 (18 h 43), vue depuis le
  // terrain 2, la voûte éclairée est vert-jaune franc — moyenne #65693a, saturation 0,30 (0,11 dans ses parties à
  // l'ombre), contre 0,13 partout au rendu. Réglée entre les deux.
  // Revue au lot L3 (30/09) : x1,4 de saturation et 20 % de bleu en moins en avaient fait un KAKI (saturation 0,48 à
  // 0,52, teinte 72°, contre 0,21 et 101° sur la photo 602, même vue). Le jaune vient d'abord du soleil orange du
  // couchant, qui la prend de face : l'albédo n'a pas à en rajouter. Un vert de platane, un rien bleuté. (Relecture :
  // clair 1,1 -> 1,17. Vue du départ de balade du terrain 1, la voûte restait à 0,92-0,94 fois l'enrobé sur la plupart
  // des parties, pour 1,03 sur la photo 340 ; elle varie de ±5 % d'une partie à l'autre, avec les couronnes tirées.)
  platanes: { sat: 0.75, teinte: [0.9, 1.05, 1.06], clair: 1.17 },
  // les arbres et haies du fond, la berge : pas de pose photo où les mesurer seuls, désaturés sans virage (0,7 puis 0,5
  // au lot L3 : au-dessus du mur, saturation 0,34 au rendu, 0,19 à 0,20 sur les photos 600 et 601)
  fond: { sat: 0.5, teinte: [1, 1, 1], clair: 1 },
  // le cèdre du fond (repli du modèle) : les réglages du cèdre (ESSENCES)
  cedreFond: { sat: 0.2, teinte: [1.1, 1.05, 0.7], clair: 1.9 },
  // la berge : sa palette (feuillageBerge) est déjà désaturée (0,35 -> 0,2)
  berge: { sat: 1, teinte: [1, 1, 1], clair: 1 },
};
function avecTeinte(tex, t) { tex.userData.teinte = t; return tex; }
// la matrice (espace linéaire) : clair × filtre × (luminance + sat × (couleur − luminance))
function matriceTeinte(t) {
  const M = new THREE.Matrix3();
  if (!t) return M;
  const s = t.sat === undefined ? 1 : t.sat, k = t.clair || 1, c = t.teinte || [1, 1, 1];
  const W = [0.2126, 0.7152, 0.0722], n = W[0] * c[0] + W[1] * c[1] + W[2] * c[2], e = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) e.push(k * c[i] / n * ((i === j ? s : 0) + (1 - s) * W[j]));
  return M.set(...e);
}
const TEINTE_DECL = 'uniform mat3 uTeinte;';
const TEINTE_GLSL = 'diffuseColor.rgb = max(uTeinte * diffuseColor.rgb, 0.0);';

// =====================================================================
//  LES VRAIS ARBRES : modèles 3D d'arbres réels (assets/parc/, décrits par assets/parc/manifeste.json)
// =====================================================================
// Le tilleul, le saule argenté, le cèdre du Liban et l'oranger du Mexique (arbuste), allégés pour le jeu. Licence
// CC BY 4.0 : leurs auteurs sont crédités dans le menu CRÉDITS (index.html) et dans CREDITS.md. Deux autres
// modèles du dossier ne sont PAS posés, après comparaison aux photos : l'if du parc de Sceaux (topiaire.glb) est
// taillé en cloches superposées dans une vasque, ceux du jardin de Bécon sont des pains de sucre (photos du
// jardin) — les cônes restent ; le platane (platane.glb) est un jeune arbre au feuillage d'automne, la voûte
// reste celle, calée sur les photos, de platanes(), qui reçoit seulement les vraies écorce et feuilles.
// Tous se posent de la même façon :
//  - DEUX FICHIERS par modèle : `nom.glb` (PC) et `nom_mobile.glb` (deux à trois fois moins de triangles,
//    textures 512) sur téléphone. Le PC prend AUSSI la version légère pour les arbres lointains (`loin` : le
//    jardin, le parc haut, à 50 m et plus) : à cette distance on ne les distingue pas, et c'est 60 % de
//    triangles en moins ;
//  - Y en haut, PIED DU TRONC À L'ORIGINE, racines sous y = 0 : position.y = hauteur du sol, et l'échelle vaut
//    hauteur voulue / hauteur du fichier (ESSENCES.h, dans l'unité du fichier) ;
//  - UN InstancedMesh par maillage du fichier et par lot : les onze tilleuls du jardin coûtent deux appels de
//    dessin, pas vingt-deux. Géométries et matériaux sont chargés une fois et partagés par tous les exemplaires ;
//  - le feuillage est découpé (alphaTest, deux faces), son ombre aussi, il bouge au vent, il laisse passer la
//    lumière et ne se troue pas au loin (comme materiauFeuilles), et il est déclaré à l'occlusion ambiante ;
//  - REPLI : l'arbre procédural d'avant est construit comme avant et ne s'efface qu'à l'ARRIVÉE du modèle
//    (retirerRepli). Si le fichier ne charge pas — hors ligne, fichier absent —, le décor reste celui d'avant.
const MOBILE_DECOR = TELEPHONE;   // js/appareil.js : la même détection pour tout le jeu (et `?tel=1`)
// `h` : hauteur du pied au sommet dans l'unité du fichier (manifeste : hauteurFichier) ; `trans` : part de lumière
// transmise par le feuillage ; `clair` : facteur sur la couleur du feuillage, calé par des rendus depuis les poses
// des photos (sous la lumière du soir du parc, les textures d'origine sortaient trop sombres) ; `teinte` : un
// filtre de plus (l'oranger du Mexique, vert vif et luisant, jurait avec les massifs gris-vert du talus) ;
// `sat` et `vire` : saturation de l'albédo et filtre ramené à une luminance de 1, appliqués dans le shader comme
// les TEINTES_FEUILLES des arbres dessinés (relevés sur les photos 39, 40 et 42 : voir ce bloc)
const ESSENCES = {
  tilleul: { h: 15.417, trans: 0.3, clair: 1.12 },
  saule: { h: 12.693, trans: 0.35, clair: 1.32, sat: 0.85 },               // (p42, p39 : luminance +10 %, un peu moins saturé)
  cedre: { h: 14.112, trans: 0.2, clair: 2.47, sat: 0.2, vire: [1.1, 1.05, 0.7] },   // (p40 : gris dans la brume, pas bleu nuit)
  arbuste: { h: 0.986, trans: 0.3, clair: 0.7, teinte: [1.0, 0.86, 0.94], sat: 0.65, vire: [1, 1, 1.05] },   // (= TEINTES_FEUILLES.arbustes)
};
// l'horloge du vent (mise à jour par buildParc, dans scene.userData.animate) ; exportée pour les arbres du parc entier
// (js/monde_vegetation.js), qui ondulent au même vent
export const VENT = { value: 0 };
// Le vent, calculé en espace MONDE comme windifyWorld (js/court.js) — instances comprises — et nul au pied :
// il monte de 1,5 m à 9 m au-dessus du pied de l'arbre (un arbuste d'un mètre et demi ne bouge pas). Le
// déplacement est ramené à l'échelle de l'exemplaire, pour faire autant de centimètres sur un grand tilleul
// que sur un petit. (USE_BATCHING : les arbres du parc entier, un BatchedMesh par pièce, js/monde_vegetation.js ;
// ailleurs la définition n'existe pas et ce bloc ne compile rien.) Les RAFALES de windifyWorld en plus (lot L3) :
// l'amplitude respire de 0,3 à 1 sur 30 à 50 s, décalée d'un arbre à l'autre — une sinusoïde pure faisait du saule
// un métronome.
const VENT_GLSL = `
  vec4 vtP = vec4(transformed, 1.0);
  float vtS = length(modelMatrix[0].xyz);
  #ifdef USE_INSTANCING
    vtP = instanceMatrix * vtP; vtS *= length(instanceMatrix[0].xyz);
  #endif
  #ifdef USE_BATCHING
    vtP = batchingMatrix * vtP; vtS *= length(batchingMatrix[0].xyz);
  #endif
  vtP = modelMatrix * vtP;
  float vtK = smoothstep(1.5, 9.0, transformed.y * vtS);
  float vtF = uVent * 1.2 + vtP.x * 0.3 + vtP.z * 0.25;
  vtK *= 0.65 + 0.35 * sin(uVent * 0.21 + vtP.x * 0.015) * sin(uVent * 0.13 + 1.3);
  transformed.x += (sin(vtF) * 0.08 + sin(vtF * 2.7) * 0.03) * vtK / vtS;
  transformed.z += cos(vtF * 0.8) * 0.06 * vtK / vtS;
  transformed.y += sin(vtF * 1.9) * 0.02 * vtK / vtS;`;

// Un modèle, chargé UNE fois (promesse gardée) : ses pièces { geo, mat, feuille }, une par maillage.
// Exporté pour les arbres du parc entier (js/monde_vegetation.js) : mêmes fichiers, mêmes matériaux, même vent. `E` :
// les réglages d'un modèle que ESSENCES ne décrit pas (le platane, que le plateau ne pose pas).
const _modeles = new Map();
export function chargerModele(nom, leger, E = ESSENCES[nom]) {
  const url = 'assets/parc/' + nom + (leger ? '_mobile' : '') + '.glb';
  if (!_modeles.has(url)) {
    // (lot G11 : le modèle n'est rendu qu'une fois les mipmaps de ses feuillages refaites — voir habillerFeuillage —,
    // sans quoi il apparaîtrait un instant avec les anciennes, plus sombres au loin, et sa texture partirait deux fois)
    _modeles.set(url, new Promise((ok, ko) => new GLTFLoader().load(url, ok, undefined, ko))
      .then((gltf) => piecesModele(gltf, E))
      .then((pieces) => Promise.all(pieces.map((pc) => pc.mat.userData.mips)).then(() => pieces)));
  }
  return _modeles.get(url);
}
function piecesModele(gltf, E) {
  const pieces = [], id = new THREE.Matrix4();
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    // (un seul niveau de nœuds, transformations déjà cuites dans ces fichiers : on applique quand même la
    // matrice, au cas où un fichier refait n'aurait pas été aplati)
    if (!o.matrixWorld.equals(id)) o.geometry.applyMatrix4(o.matrixWorld);
    const mat = o.material, feuille = mat.alphaTest > 0;
    mat.metalness = 0;
    if (feuille) habillerFeuillage(mat, E);
    pieces.push({ geo: o.geometry, mat, feuille });
  });
  return pieces;
}
// Le matériau de feuillage d'un modèle : découpe, deux faces, lumière transmise (une feuille à contre-jour laisse
// passer le jour ; sans elle le dessous des couronnes sortait vert-noir), des mipmaps qui gardent la couleur et la
// couverture du feuillage (lot G11 ; avant, l'alpha était relevé avec le niveau de mipmap : au loin, l'alpha moyenné
// passait sous le seuil et la couronne se trouait — ce relevé reste en secours), vent, et son ombre découpée qui
// bouge avec lui. Le programme est partagé par tous les modèles : ce qui change est dans les uniformes.
function habillerFeuillage(m, E) {
  if (m.userData.ombre) return;
  m.side = THREE.DoubleSide; m.transparent = false; m.depthWrite = true;
  m.roughness = Math.max(0.8, m.roughness);
  if (E.clair) m.color.multiplyScalar(E.clair);
  if (E.teinte) m.color.multiply(new THREE.Color(E.teinte[0], E.teinte[1], E.teinte[2]));
  const uTeinte = { value: matriceTeinte({ sat: E.sat, teinte: E.vire }) };
  m.userData.teinte = uTeinte;
  const trans = E.trans || 0.25, taille = (m.map && m.map.image && m.map.image.width) || 512;
  // LOT G11 : les mipmaps de la carte sont refaites à son arrivée (js/mipmaps_feuillages.js : couleur saignée et
  // moyennée sous l'alpha, couverture du niveau 0 gardée à chaque niveau). Le relevé d'alpha par niveau (uMipA, un
  // quart par niveau) s'éteint alors : il ne reste qu'en secours, si la chaîne n'a pas pu être faite. La promesse
  // (userData.mips) est attendue par chargerModele avant que le modèle soit posé.
  const uMipA = { value: 0.25 };
  m.userData.mipA = uMipA;
  m.userData.mips = mipmapsFeuillage(m.map, m.alphaTest).then((ok) => { if (ok) uMipA.value = 0; });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uVent = VENT; sh.uniforms.uTrans = { value: trans }; sh.uniforms.uTaille = { value: taille }; sh.uniforms.uTeinte = uTeinte;
    sh.uniforms.uMipA = uMipA;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uVent;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>' + VENT_GLSL);
    sh.fragmentShader = 'uniform float uTrans;\nuniform float uTaille;\nuniform float uMipA;\n' + TEINTE_DECL + '\n' + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + TEINTE_GLSL)
      .replace('#include <alphatest_fragment>',
        '#ifdef USE_MAP\n{ vec2 tx = vMapUv * uTaille; float mip = max(0.0, 0.5 * log2(max(dot(dFdx(tx), dFdx(tx)), dot(dFdy(tx), dFdy(tx))))); diffuseColor.a *= 1.0 + uMipA * mip; }\n#endif\n#include <alphatest_fragment>')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uTrans;');
  };
  m.customProgramCacheKey = () => 'arbre-parc';
  const ombre = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: m.map, alphaTest: m.alphaTest, side: THREE.DoubleSide });
  ombre.onBeforeCompile = (sh) => {
    sh.uniforms.uVent = VENT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uVent;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>' + VENT_GLSL);
  };
  ombre.customProgramCacheKey = () => 'arbre-parc-ombre';
  m.userData.ombre = ombre;
}

// PLANTER : pose une essence en un ou plusieurs exemplaires.
//  `spots` : [{ x, y, z, h, etire, rot, loin, repli }] — pied (y = le sol), hauteur voulue en mètres (multipliée
//  par `etire`, qui n'étire que la hauteur), rotation autour de la verticale, `loin` : version légère même sur
//  PC, `repli` : les objets procéduraux (ou les arbres du kit, K.modelTree) que cet exemplaire remplace ;
//  `o.repli` : idem pour tout le lot ; `o.ombre` : porte ombre (oui par défaut) ;
//  `o.retouche(geo, piece, spot)` : l'exemplaire a SA géométrie (copiée, déjà tournée et mise à l'échelle, pied à
//  l'origine), que la fonction corrige — le saule, repoussé derrière le grillage du pin.
// On attend TOUS les fichiers du lot avant de poser quoi que ce soit : jamais un arbre en double, jamais un trou.
function planter(scene, nom, spots, o = {}) {
  if (!spots.length) return Promise.resolve();
  const lots = [false, true].map((leger) => [leger, spots.filter((s) => (MOBILE_DECOR || !!s.loin) === leger)]).filter(([, l]) => l.length);
  return Promise.all(lots.map(([leger]) => chargerModele(nom, leger))).then((modeles) => {
    lots.forEach(([, l], i) => poserLot(scene, nom, modeles[i], l, o));
    for (const r of o.repli || []) retirerRepli(scene, r);
    for (const s of spots) for (const r of s.repli || []) retirerRepli(scene, r);
  }).catch((e) => console.warn('[parc] modèle « ' + nom + ' » non chargé : le décor procédural reste', e));
}
const _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _p4 = new THREE.Vector3(), _s4 = new THREE.Vector3(), _Y4 = new THREE.Vector3(0, 1, 0);
function matriceArbre(s, E, m4) {
  const k = s.h / E.h;
  return m4.compose(_p4.set(s.x, s.y, s.z), _q4.setFromAxisAngle(_Y4, s.rot || 0), _s4.set(k, k * (s.etire || 1), k));
}
function poserLot(scene, nom, pieces, spots, o) {
  // PARC ENTIER (lot A5, js/monde_charge.js) : UN LOT PAR CELLULE de 32 m (celles de monde.json > cellules). Un
  // InstancedMesh est jugé par three sur la sphère de TOUS ses exemplaires : des arbres épars d'un bout à l'autre du parc
  // ne seraient jamais écartés du cadre, ni dans l'image ni dans la passe d'ombre. (Monde plat : un seul lot, comme avant.)
  if (!Monde.plat && !o.retouche && o.cellule === undefined && spots.length > 1) {
    const parCellule = new Map();
    for (const s of spots) {
      const cle = Math.floor((s.x - Monde.dx - CELLULE_LOT.x0) / CELLULE_LOT.taille) + ':' + Math.floor((s.z - CELLULE_LOT.z0) / CELLULE_LOT.taille);
      if (!parCellule.has(cle)) parCellule.set(cle, []);
      parCellule.get(cle).push(s);
    }
    for (const [cle, l] of parCellule) poserLot(scene, nom, pieces, l, { ...o, cellule: cle });
    return;
  }
  const E = ESSENCES[nom];
  for (const pc of pieces) {
    let objets;
    if (o.retouche) {
      objets = spots.map((s) => {
        const g = pc.geo.clone();
        g.applyMatrix4(matriceArbre({ ...s, x: 0, y: 0, z: 0 }, E, new THREE.Matrix4()));
        o.retouche(g, pc, s);
        g.computeBoundingSphere(); g.computeBoundingBox();
        const me = new THREE.Mesh(g, pc.mat); me.position.set(s.x, s.y, s.z);
        return me;
      });
    } else {
      const im = new THREE.InstancedMesh(pc.geo, pc.mat, spots.length);
      spots.forEach((s, i) => im.setMatrixAt(i, matriceArbre(s, E, _m4)));
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
      objets = [im];
    }
    // L'OMBRE : un lot ne la porte que si l'un de ses arbres est à portée de la carte d'ombre, 34 m du terrain
    // (elle en couvre une trentaine autour de lui). Un InstancedMesh n'est écarté de la passe d'ombre que si TOUT
    // le lot est hors champ : les onze tilleuls du jardin, qui débordent à peine dedans, y coûtaient 100 000
    // triangles pour une ombre qui tombe hors de la carte. Sur téléphone, 24 m : c'est la règle de js/fx.js pour
    // le décor lointain en basse et moyenne qualité (_ombresDecor), qui, elle, se trompe sur un InstancedMesh —
    // elle le juge au centre de sa géométrie, le pied de l'arbre du fichier, à l'origine.
    const portee = MOBILE_DECOR ? 24 : 34;
    const ombre = o.ombre !== false && spots.some((s) => Math.hypot(s.x, s.z) < portee);
    for (const me of objets) {
      // le feuillage porte son ombre (découpée) mais ne la reçoit pas, comme les couronnes procédurales : une
      // couronne dense s'ombrerait de part en part
      me.castShadow = ombre; me.receiveShadow = !pc.feuille;
      if (pc.feuille) me.customDepthMaterial = pc.mat.userData.ombre;
      me.userData.nofuse = true; me.userData.arbre = nom;
      me.matrixAutoUpdate = false; me.updateMatrix();
      scene.add(me);
      if (pc.feuille) declarerFeuillage(scene, me);
      // PARC ENTIER : l'ombre ne dépend plus de la distance à l'ORIGINE (34 m, ci-dessus : le premier choix, qui vaut au
      // plateau) mais de celle du JOUEUR au lot, que l'ordonnanceur (js/monde_charge.js) relit en chemin : le lot est
      // rangé ici avec son emprise (repère du monde affiché)
      if (!Monde.plat) {
        let cx = 0, cz = 0, r = 0;
        for (const s of spots) { cx += s.x / spots.length; cz += s.z / spots.length; }
        for (const s of spots) r = Math.max(r, Math.hypot(s.x - cx, s.z - cz));
        (scene.userData.lotsArbres || (scene.userData.lotsArbres = [])).push({ mesh: me, ombre: o.ombre !== false, x: cx, z: cz, r });
      }
    }
  }
}
// Les cellules des lots d'arbres au parc entier : celles de monde.json (> cellules : origine x -24,7, z -16, 32 m de
// côté, repère du terrain 1), calées pour que le plateau tienne dans une seule
const CELLULE_LOT = { x0: -24.7, z0: -16, taille: 32 };
// Retire ce qu'un modèle remplace : un objet procédural (et sa déclaration de feuillage), ou un arbre du kit
// (K.modelTree de js/court.js) — marqué `remplace`, loadTreeModel ne le pose plus, et on l'enlève s'il est déjà là.
// (Les géométries retirées sont libérées sur la carte graphique : si une autre copie s'en sert encore, three les
// renvoie à son prochain affichage.)
function retirerRepli(scene, r) {
  if (!r) return;
  const jeter = (o) => {
    if (!o) return;
    if (o.parent) o.parent.remove(o);
    const f = scene.userData.feuillages, i = f ? f.indexOf(o) : -1;
    if (i >= 0) f.splice(i, 1);
    o.traverse((c) => { if (c.geometry) c.geometry.dispose(); });
  };
  if (r.isObject3D) { jeter(r); return; }
  r.remplace = true;
  jeter(r.arbre); jeter(r.fallback);
}
// Un tirage stable, lié à la position (et non à Math.random) : il ne décale pas la suite des tirages du décor.
function alea(x, z, k = 0) {
  const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
  return s - Math.floor(s);
}
// Une vraie écorce (tex/<nom>_couleur, _normale, _rugosite ; en 512 sur téléphone) posée sur un matériau
// existant quand elle arrive : ses UV ne changent pas, on règle la répétition (`rep`) pour que la tuile garde
// ses proportions sur les tubes. `o.normale` : force du relief ; `o.emissive` : l'émission reprend la nouvelle
// couleur (les platanes) ; `o.melange` : voir plus bas. Sans les fichiers, le matériau garde sa texture dessinée.
function ecorceReelle(mat, nom, rep, o = {}) {
  const base = 'assets/parc/tex/' + nom + '_', suf = MOBILE_DECOR ? '_512.jpg' : '.jpg', L = new THREE.TextureLoader();
  const charger = (k) => new Promise((ok, ko) => L.load(base + k + suf, ok, undefined, ko));
  Promise.all(['couleur', 'normale', 'rugosite'].map(charger)).then(([c, n, r]) => {
    for (const t of [c, n, r]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; }
    c.colorSpace = THREE.SRGBColorSpace;
    const ancien = mat.map;
    // `o.melange` : la couleur reste celle de la texture dessinée (calée sur les photos), la photo n'apporte que
    // son grain et ses fissures (sa luminance, ramenée à sa moyenne) ; relief et rugosité viennent de la photo
    if (o.melange && ancien && ancien.image) c = grainSur(ancien.image, c.image, rep, o.melange, ancien.flipY === false);
    mat.map = c; mat.normalMap = n; mat.roughnessMap = r;
    if (o.normale) mat.normalScale.set(o.normale, o.normale);
    if (o.emissive) mat.emissiveMap = c;
    mat.needsUpdate = true;
    if (ancien && ancien !== c) ancien.dispose();
  }).catch((e) => console.warn('[parc] écorce « ' + nom + ' » non chargée : texture dessinée conservée', e));
}
// La texture dessinée `dessin`, qui couvre une tuile d'UV, multipliée par le grain de la photo `photo`, répétée
// rep[0] x rep[1] fois dans cette tuile : sa luminance, divisée par sa moyenne, adoucie par `force` (0 à 1).
// `retourne` : `dessin` est rangé à l'envers (texture cuite en ImageBitmap, déjà retournée pour la carte graphique, à
// flipY false : voir js/tex_cuites.js) ; on le redresse en le recopiant, sinon l'écorce sortait la tête en bas.
function grainSur(dessin, photo, rep, force, retourne = false) {
  const W = MOBILE_DECOR ? 256 : 512, H = Math.round(W * rep[1] / rep[0]);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  for (let i = 0; i < rep[0]; i++) for (let j = 0; j < rep[1]; j++) g.drawImage(photo, i * W / rep[0], j * H / rep[1], W / rep[0], H / rep[1]);
  const ph = g.getImageData(0, 0, W, H).data;
  if (retourne) { g.save(); g.translate(0, H); g.scale(1, -1); g.drawImage(dessin, 0, 0, W, H); g.restore(); }
  else g.drawImage(dessin, 0, 0, W, H);
  const im = g.getImageData(0, 0, W, H), d = im.data;
  let moy = 0;
  for (let i = 0; i < ph.length; i += 4) moy += 0.3 * ph[i] + 0.59 * ph[i + 1] + 0.11 * ph[i + 2];
  moy /= ph.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    const l = (0.3 * ph[i] + 0.59 * ph[i + 1] + 0.11 * ph[i + 2]) / moy;
    const k = Math.pow(Math.min(1.7, Math.max(0.3, l)), force);
    d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k); d[i + 2] = Math.min(255, d[i + 2] * k);
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

// LES VRAIES FEUILLES DE LA VOÛTE. Quatre feuilles de platane photographiées (tex/feuilles_platane.webp) sont
// recomposées dans le même atlas de rameaux que les feuilles dessinées (rameauxPlatane : mêmes tuiles, mêmes
// brindilles), à la même taille que lui. La photo apporte le limbe, les nervures, le bord, le pétiole ; la
// couleur reste la palette calée sur les photos 40 et 41 (chaque feuille est désaturée puis ramenée à une teinte
// de la palette), sinon la voûte sortait vert pomme. La carte d'ombre prend la même texture. Sans le fichier,
// les feuilles dessinées restent.
function feuillesReelles(mat) {
  const img = new Image();
  img.src = 'assets/parc/tex/feuilles_platane' + (MOBILE_DECOR ? '_512' : '') + '.webp';
  img.decode().then(() => {
    const ancien = mat.map, t = atlasPlatane(img, (ancien && ancien.image && ancien.image.width) || 1024);
    mat.map = t; if (mat.userData.ombre) mat.userData.ombre.map = t;
    if (ancien) ancien.dispose();
  }).catch((e) => console.warn('[parc] feuilles de platane non chargées : feuilles dessinées conservées', e));
}
function atlasPlatane(img, largeur) {
  // 1. les feuilles de la photo, une par quart, réduites à 128 px et teintées dans chaque couleur de la palette
  const S = 128, lutins = [];
  for (let q = 0; q < 4; q++) {
    const sw = img.width / 2, sh = img.height / 2;
    const base = document.createElement('canvas'); base.width = base.height = S;
    const bg = base.getContext('2d', { willReadFrequently: true });
    bg.drawImage(img, (q % 2) * sw, Math.floor(q / 2) * sh, sw, sh, 0, 0, S, S);
    const src = bg.getImageData(0, 0, S, S).data;
    // luminance moyenne du limbe. On ne garde de la photo QUE sa luminance (le limbe, les nervures, le bord) : avec
    // un tiers de sa couleur, la voûte vue de dessous virait au vert vif, deux fois plus saturée que la palette
    let m = 0, n = 0;
    for (let i = 0; i < src.length; i += 4) if (src[i + 3] > 128) { m += 0.3 * src[i] + 0.59 * src[i + 1] + 0.11 * src[i + 2]; n++; }
    m /= Math.max(1, n);
    lutins.push(PAL_PLATANE.map(([c]) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = S;
      const g = cv.getContext('2d'), im = g.createImageData(S, S), d = im.data;
      for (let i = 0; i < src.length; i += 4) {
        const l = 0.3 * src[i] + 0.59 * src[i + 1] + 0.11 * src[i + 2];
        for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, l / m * c[k]);   // luminance de la photo, teinte de la palette
        d[i + 3] = src[i + 3];
      }
      g.putImageData(im, 0, 0);
      return cv;
    }));
  }
  // 2. l'atlas, mis en page comme les feuilles dessinées (toujours dessiné en 1024, recopié à la taille voulue).
  // Chaque feuille passe par un calque où l'on règle sa clarté sans toucher aux autres ; le bout de son pétiole
  // (aux 93 % de la hauteur du lutin) tombe sur la brindille.
  const W = 1024, cv = document.createElement('canvas'); cv.width = cv.height = W;
  const g = cv.getContext('2d');
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = 256;
  const tg = tmp.getContext('2d');
  rameauxPlatane(g, W, (x, y, L, rot, ton, k) => {
    const f = L / 0.85, c = 128;
    k *= 1.06;                                           // (la photo a déjà son ombre : un peu moins sombre)
    tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, 256, 256);
    tg.save(); tg.translate(c, c); tg.rotate(rot); tg.scale(rnd(0.75, 1), 1);
    tg.drawImage(lutins[Math.floor(Math.random() * 4)][ton], -f / 2, -0.93 * f, f, f); tg.restore();
    tg.globalCompositeOperation = 'source-atop';
    tg.fillStyle = k < 1 ? `rgba(0,0,0,${1 - k})` : `rgba(255,255,255,${Math.min(1, (k - 1) * 0.6)})`; tg.fillRect(0, 0, 256, 256);
    g.drawImage(tmp, x - c, y - c);
  });
  let src = cv;
  if (largeur < W) {
    src = document.createElement('canvas'); src.width = src.height = largeur;
    src.getContext('2d').drawImage(cv, 0, 0, largeur, largeur);
  }
  const t = new THREE.CanvasTexture(src);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// =====================================================================
//  LE CÔTÉ DU PIN (photos 39, 41 et 42 recalées) : TALUS DE TERRE, ARBUSTES, LIERRE, FILETS TOMBÉS,
//  ARBRE LÉGER, PIN PARASOL, ET LE COIN DE LA CAGE
// =====================================================================
// Ce que montrait le jeu et que les photos démentent : un mur vert-noir uniforme de 3 m derrière le grillage,
// un lierre plaqué sur toute la maille, un pin en galette mince posé sur un tronc en Y. Sur place, c'est un
// fouillis d'arbustes ronds de 1 à 3,5 m, avec une trouée derrière D2 où l'on voit la terre nue du talus
// monter jusqu'à la pelouse, et au-dessus le dôme bleu-vert, épais, d'un vrai pin parasol.

// LE TALUS DU PIN, en coupe : il part du pied du grillage (z = 9,4), monte RAIDE en terre nue (23° au départ)
// puis s'adoucit jusqu'au parc haut (1,48 m à z = 20, là où commence le plan `hautPin`). Relevé par la
// trouée derrière D2 (photo 42) : la pelouse y est vers 1,3 m entre z = 15 et 18. Tout ce qui se pose sur
// le talus (arbustes, arbre léger, pied du pin) passe par ici, sinon les pieds flottent ou s'enterrent.
// (le pied du saule argenté au parc entier : voir vegetationPin)
const SAULE_Z_ENTIER = 12.45;
function hauteurTalusPin(z) {
  if (z <= 9.4) return 0;
  if (z >= 20) return 1.48;
  return 1.563 * (1 - Math.exp(-(z - 9.4) / 3.6));
}

// Un tube EFFILÉ le long d'une courbe (charpentières, tiges) : la TubeGeometry de three a un rayon constant,
// on ramène chaque anneau au rayon voulu (r0 au départ, r1 au bout). Les UV sont remises dans le sens des
// cylindres du reste du décor (u autour, v le long, une tuile d'écorce pour 1,5 m), sinon l'écorce d'une
// branche est couchée à 90° de celle du fût sur lequel elle est cousue.
function tubeEffile(pts, r0, r1, nL = 8, nR = 6) {
  const courbe = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(courbe, nL, 1, nR, false);
  const p = g.attributes.position, uv = g.attributes.uv, L = courbe.getLength(), c = new THREE.Vector3();
  for (let i = 0; i <= nL; i++) {
    const t = i / nL, r = r0 + (r1 - r0) * t;
    courbe.getPointAt(t, c);
    for (let j = 0; j <= nR; j++) {
      const k = i * (nR + 1) + j;
      p.setXYZ(k, c.x + (p.getX(k) - c.x) * r, c.y + (p.getY(k) - c.y) * r, c.z + (p.getZ(k) - c.z) * r);
      uv.setXY(k, j / nR, (t * L) / 1.5);
    }
  }
  return g;
}

// ---------------------------------------------------------------------
//  PARC ENTIER (lot B2) : LA TERRE DU PIN POSÉE SUR LE MAILLAGE DU SOL
// ---------------------------------------------------------------------
// Monde.sol interpole ses quatre nœuds en BILINÉAIRE ; le maillage du sol (js/monde_sol.js, niveau fin, celui de la
// cellule du plateau, qui ne le quitte jamais) coupe chaque carré de 0,5 m en deux triangles, diagonale du coin (x+, z-)
// au coin (x-, z+), et insère les bords du plateau dans sa trame. Sur une cassure (la crête de la butte), les deux
// lectures diffèrent de 10 à 20 cm au milieu d'un carré. solDuMaillage rend la hauteur du TRIANGLE que l'on voit ; une
// nappe dont les sommets sont les nœuds du sol et qui suit sa diagonale le double exactement (+ dy).
function solDuMaillage(x, z) {                       // x : repère du jeu (décalage de parc2 compris)
  const R = Monde.repere, d = Monde.dx, P = R.plateau || [-23.7, -9.1, 6.3, 9.1], xr = x - d;
  // (les bords du plateau ne sont insérés que dans sa cellule de 32 m, calée sur la trame de 2 m : x -24…8, z -15…17)
  const cale = (v, o) => o + 2 * Math.round((v - o) / 2);
  const dansCellule = xr >= cale(-24.7, R.x0) && xr <= cale(7.3, R.x0) && z >= cale(-16, R.z0) && z <= cale(16, R.z0);
  const carre = (v, v0, bords) => {
    let a = v0 + R.pas * Math.floor((v - v0) / R.pas + 1e-9), b = a + R.pas;
    if (dansCellule) for (const e of bords) if (e > a + 1e-6 && e < b - 1e-6) { if (v >= e) a = e; else b = e; }
    return [a, b];
  };
  const [x0, x1] = carre(xr, R.x0, [P[0], P[2]]), [z0, z1] = carre(z, R.z0, [P[1], P[3]]);
  const h = (a, b) => Monde.sol(a + d, b);
  // un carré à cheval sur un mur (deux nappes à plus de 0,35 m) est découpé en quarts par le maillage : Monde.sol
  // (règle du coin le plus proche) en est la meilleure lecture
  const na = Monde.nappe(x0 + d, z0), nd = Monde.nappe(x1 + d, z1);
  if (na !== nd || na !== Monde.nappe(x1 + d, z0) || na !== Monde.nappe(x0 + d, z1)) {
    const ys = [h(x0, z0), h(x1, z0), h(x0, z1), h(x1, z1)];
    if (Math.max(...ys) - Math.min(...ys) >= 0.35) return Monde.sol(x, z);
  }
  const u = (xr - x0) / (x1 - x0), v = (z - z0) / (z1 - z0);
  const ha = h(x0, z0), hb = h(x1, z0), hc = h(x0, z1), hd = h(x1, z1);
  return u + v <= 1 ? ha + u * (hb - ha) + v * (hc - ha) : hd + (1 - u) * (hc - hd) + (1 - v) * (hb - hd);
}
// La TERRE sous les arbustes du pin, au parc entier : colonnes sur les nœuds du sol (plus les deux bouts et les bords
// du plateau), rangées au bord du plateau (ZO) puis sur les nœuds, jusqu'au bord du chemin rouge (la rampe est, lue
// dans les drapeaux du monde : 128 = allée) ; au-delà, la litière le long de sa bordure est dessinée par la zone Z04
// (js/parc/zones/z04_butte_pin.js). Mêmes UV que la nappe d'avant (x / 2, -z / 2).
function terreSurLeSol(xa, xb, ZO, dy) {
  const R = Monde.repere, d = Monde.dx, P = R.plateau || [-23.7, -9.1, 6.3, 9.1];
  const xs = new Set([xa, xb]);
  for (let x = R.x0 + R.pas * Math.ceil((xa - d - R.x0) / R.pas); x + d < xb; x += R.pas) xs.add(+(x + d).toFixed(4));
  for (const e of [P[0], P[2]]) if (e + d > xa && e + d < xb) xs.add(e + d);
  const X = [...xs].sort((a, b) => a - b);
  // le bord du chemin, colonne par colonne (le nœud le plus proche porte le drapeau : à 0,25 m près, la zone Z04 le reprend)
  const fin = X.map((x) => {
    let z = ZO + 0.6;
    while (z < ZO + 7 && !(Monde.drapeaux(x, z) & 128)) z += 0.1;
    return z - 0.15;
  });
  const zMax = Math.max(...fin), Z = [ZO];
  for (let z = R.z0 + R.pas * (Math.floor((ZO - R.z0) / R.pas + 1e-9) + 1); z < zMax + R.pas; z += R.pas) Z.push(+z.toFixed(4));
  const nX = X.length, pos = [], uv = [], idx = [];
  for (let j = 0; j < Z.length; j++) for (let i = 0; i < nX; i++) {
    const x = X[i], z = Math.min(Z[j], fin[i]);
    pos.push(x, solDuMaillage(x, z) + dy(z), z); uv.push(x / 2, -z / 2);
  }
  // (même diagonale que le sol : triangles (a, c, b) et (b, c, d))
  for (let j = 0; j < Z.length - 1; j++) for (let i = 0; i < nX - 1; i++) {
    const a = j * nX + i, b = a + 1, c = a + nX, e = c + 1;
    idx.push(a, c, b, b, c, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------
//  TALUS, ARBUSTES, LIERRE, FILETS ET DÉTRITUS, derrière le grillage du pin
// ---------------------------------------------------------------------
// `matHerbe` : la pelouse du parc ; `xT0`/`xT1` : l'emprise en x de la pelouse (celle de `herbe`), pour que
// le talus la prolonge sans raccord. Remplace l'ancien talusPlan(11 → 20), qui commençait 1,6 m trop loin.
function vegetationPin(scene, K, XN, XS, ZO, cx, matHerbe, xT0, xT1) {
  const ZG = ZO + 0.1;                                   // le plan du grillage du pin
  // Y(z, x) : la hauteur du talus. PARC ENTIER (le monde à relief installé, js/parc/index.js) : celle du vrai sol,
  // Monde.sol — il suit hauteurTalusPin jusqu'à z = 12, puis rejoint le relief relevé (le chemin de la rampe est,
  // la terrasse du bassin) ; la pelouse du talus, elle, est alors le sol lui-même (js/monde_sol.js).
  const entier = !Monde.plat;
  const Y = entier ? (z, x) => Monde.sol(x, z) : hauteurTalusPin, X1 = (x) => x - cx(0);      // X1 : retour au repère du terrain 1
  // une nappe (i le long de x, j le long de z) : f renvoie [x, y, z, u, v] ; normales vers le ciel
  const nappe = (nx, nz, f) => {
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const s = f(i / nx, j / nz); pos.push(s[0], s[1], s[2]); uv.push(s[3], s[4]); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  };

  // ---- 1. LE TALUS ----
  // la pelouse, sur toute la largeur du parc (mêmes UV que `herbe` : la tuile garde sa taille) ; rangées
  // serrées en bas, là où la pente tourne
  // (CÔTÉ QUAI, le talus s'arrête à l'allée : sur les photos 39, 42 et 43, au-delà du coin du pin, c'est le trottoir
  // du quai, son banc brun, puis la route et le car bleu en contrebas — le talus les cachait sous une pente de gazon.
  // Il retombe en 60 cm de x = 6,8 à 7,4 et ne rejoint l'allée qu'à z = 15 -> 17,3, avant le chemin rouge du jardin)
  const LH = xT1 - xT0, XP = [xT0, cx(6.8), cx(7.4), xT1];
  // (une pelouse À L'OMBRE du pin et des arbustes, pas le gazon vif du jardin : photos 42 et 185625, un vert
  // éteint et grisé au fond des trouées. Même tuile que `herbe`, filtrée)
  if (!entier) {
    const matTalus = matHerbe.clone(); matTalus.color.setRGB(0.75, 0.78, 0.7);
    const pelouse = new THREE.Mesh(nappe(3, 30, (a, b) => {
      const x = XP[Math.round(a * 3)], z = ZO + (20 - ZO) * Math.pow(b, 1.35);
      const k = x < cx(7.0) ? 1 : Math.min(1, Math.max(0, (z - 15) / 2.3));
      return [x, Y(z) * k - 0.02, z, (x - xT0) / LH, -z / 300];
    }), matTalus);
    pelouse.receiveShadow = true; scene.add(pelouse);
  }
  // la TERRE NUE sous les arbustes (#5b4538 à l'écran, feuilles et aiguilles) : du grillage à z ≈ 12,5, bord haut
  // déchiqueté, et bien plus haut dans les deux trouées — derrière D2 et derrière la cage —, où les photos 42,
  // 185625 et 185626 la montrent grimper, brune et nue, jusque vers z = 16,5 : pas de gazon au fond de la trouée
  // (parc entier : drapée sur le vrai sol et plus serrée en z ; au pied du grillage à 12 mm au-dessus de lui comme
  // avant, puis à 25 mm dès le premier mètre : le sol n'est pas coupé aux mêmes endroits qu'elle, et entre deux de
  // ses rangées elle ne doit jamais passer dessous)
  const xa = XN - 0.3, xb = XS + 0.6;
  const dyTerre = (z) => (entier ? 0.012 + 0.013 * Math.min(1, Math.max(0, (z - ZO) / 0.9)) : 0.012);
  // (PARC ENTIER, lot B2 : la terre était une nappe à elle, 60 colonnes et 24 rangées qui ne tombaient pas sur celles
  // du maillage du sol ; là où le talus casse — la crête, à z ≈ 11,5, qui retombe de 0,8 m sur le chemin rouge — ses
  // triangles coupaient la cassure en biais : la terre flottait à 15 cm au-dessus du sol sur toute sa lisière, une
  // plaque posée sur la butte (vue du bout du mur). Elle est désormais posée sur les nœuds MÊMES du sol : voir
  // terreSurLeSol, plus bas. Drapeau baissé, rien ne change.)
  const terre = new THREE.Mesh(entier ? terreSurLeSol(xa, xb, ZO, dyTerre) : nappe(60, 9, (a, b) => {
    const x = xa + a * (xb - xa), x1 = X1(x);
    const trouD2 = Math.max(0, 1 - Math.abs(x1 + 2.3) / 1.4), trouPin = Math.max(0, 1 - Math.abs(x1 + 7.5) / 1.3);
    // (parc entier : le chemin rouge de la rampe est passe là, de z = 12,5 à 16,5 ; la terre s'arrête à son bord)
    const zf = entier ? 11.9 + 0.3 * Math.sin(x * 1.7) + 0.2 * Math.sin(x * 4.1 + 1)
      : 12.3 + 0.45 * Math.sin(x * 1.7) + 0.3 * Math.sin(x * 4.1 + 1) + 4.2 * trouD2 + 3.5 * trouPin;
    const z = ZO + (zf - ZO) * b;
    return [x, Y(z, x) + dyTerre(z), z, x / 2, -z / 2];
  }), new THREE.MeshStandardMaterial({ map: terreTalusPin(K.canvasTex), roughness: 1 }));
  terre.receiveShadow = true; scene.add(terre); terre.material.userData.surfaceParc = 'solForet';
  // sa CONTREMARCHE, le long de l'enrobé : la terre part 12 mm plus haut que lui, au bord même du terrain (z = ZO) ;
  // sans face entre les deux, on voyait en rasant, par la fente, la pelouse 3 cm plus bas (un liseré vert au pied
  // du grillage). Au-delà de l'enrobé (x > XS - 0,7), la bande de terre du quai passe dessous et ferme la fente.
  const contremarche = new THREE.Mesh(new THREE.PlaneGeometry(XS - 0.7 - xa, 0.035), terre.material);
  contremarche.rotation.y = Math.PI; contremarche.position.set((xa + XS - 0.7) / 2, -0.005, ZO); scene.add(contremarche);
  // (en haut du talus, le chemin rouge du jardin : voir jardinBecon)

  // ---- 2. LES ARBUSTES ET LE LIERRE : un seul maillage, un atlas de quatre feuillages ----
  // (quart 0 : laurier à grandes feuilles ; 1 : arbuste à petites feuilles ; 2 : sous-bois clair ; 3 : lierre)
  // (lot L3 : vus vers le couchant, ils sortaient en papier kraft doré — le reflet rasant du soleil à 5°, qu'ils
  // prennent faute de recevoir l'ombre de l'écran du pin. On éteint ce REFLET à contre-jour, un quart seulement du
  // diffus, et le ciel qui passe au travers remonte de 0,38 à 0,85 (le cœur plus sombre de coudre le reprend en
  // partie), jusqu'à trois fois plus vu en face du couchant, la lueur derrière eux (`contreCiel`) : 0,3 à 1,5 % de
  // pixels dorés dans le massif au lieu de 6 à 11 % (photo 342 : 0,22 %), et vu du plateau vers le pin, le massif sort
  // à 0,55-0,57 fois l'enrobé (0,45-0,49 avant ; photo 342 : 0,58 à 0,64), avec ses creux et ses bosses — mais pas
  // d'en haut, depuis la caméra de diffusion du terrain 2, qui ne le voit pas contre le couchant (0,61 à 0,64 fois
  // l'enrobé, 0,60 avant) — voir materiauFeuilles)
  const mat = materiauFeuilles(atlasArbustesPin(K.canvasTex), { trans: 0.85, rugosite: 0.75, alpha: 0.45, reflet: 1, silhouette: 0.25,
    contreCiel: 2.0, vent: 0.8 });
  const touffes = [], infos = [], teintes = [];
  const plan = new THREE.PlaneGeometry(1, 1), o = new THREE.Object3D(), e = new THREE.Euler(), q = new THREE.Quaternion();
  const Z = new THREE.Vector3(0, 0, 1), n = new THREE.Vector3(), q2 = new THREE.Quaternion();
  // les nuances propres à chaque essence (le laurier est plus sombre et bleuté, le sous-bois plus frais)
  const NUANCE = [[0.9, 0.97, 0.95], [1, 1, 1], [1.0, 1.02, 0.95], [0.92, 1.0, 0.92]];
  const carte = (quart, px, py, pz, sx, sy, info, zMin = ZG + 0.1) => {
    o.position.set(px, py, pz); o.quaternion.copy(q); o.scale.set(sx, sy, 1); o.updateMatrix();
    const g = plan.clone().applyMatrix4(o.matrix);
    const uv = g.attributes.uv, ou = (quart % 2) * 0.5, ov = quart < 2 ? 0.5 : 0;
    for (let k = 0; k < 4; k++) uv.setXY(k, ou + uv.getX(k) * 0.5, ov + uv.getY(k) * 0.5);
    // jamais devant le grillage : une carte qui le traverse est repoussée derrière son plan
    g.computeBoundingBox();
    const dz = zMin - g.boundingBox.min.z;
    if (dz > 0) g.translate(0, 0, dz);
    touffes.push(g); infos.push(info); teintes.push(NUANCE[quart]);
  };
  // UN MASSIF : un ellipsoïde de h de haut (rx, rz de demi-largeurs) et deux ou trois lobes qui le
  // déforment — des boules irrégulières, pas une haie taillée. 60 % des cartes en surface, dont 60 %
  // tournées vers l'extérieur (vues de face, elles couvrent) ; `aere` < 1 : moins dense, on voit au travers.
  // (Avec 80 % en surface, presque toutes tournées vers le dehors, chaque massif se lisait comme un ROCHER lisse
  // et clair, d'une seule coquille — photos 39 et 42 : un contour déchiqueté, des trous d'ombre. D'où 40 % des
  // cartes tombées au cœur du massif (coudre les y assombrit) et, en surface, une carte tournée sur trois qui prend
  // une rotation libre et casse la coquille.)
  let tournees = 0;
  const massif = (x1, z, h, rx, rz, quart, t, aere = 1, k = 1) => {
    // (PARC ENTIER, lot B2 : le chemin rouge de la rampe est longe les arbustes à z ≈ 12,5 - 16 ; un massif qui
    // mordait dessus recule vers le grillage jusqu'à ce que son front en reste au bord — photos 171717 et 171718 : la
    // masse d'arbustes vient mourir sur la bordure de l'allée, elle ne la couvre pas. 128 = drapeau « allée » du monde)
    if (entier) for (let n = 0; n < 20 && (Monde.drapeaux(cx(x1), z + rz * 0.85) & 128); n++) z -= 0.15;
    const x = cx(x1), ry = h / 2, yc = Y(z, x) + ry * 0.85;
    const lobes = [[x, yc, z, rx, ry, rz]];
    const nl = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < nl; i++) {
      lobes.push([x + rnd(-0.55, 0.55) * rx, yc + rnd(-0.05, 0.35) * ry, z + rnd(-0.4, 0.5) * rz,
        rx * rnd(0.5, 0.75), ry * rnd(0.5, 0.8), rz * rnd(0.5, 0.75)]);
    }
    // aire d'un ellipsoïde (Knud Thomsen) : le nombre de cartes suit la surface qu'on voit
    const P = 1.6, a = Math.pow(rx, P), b = Math.pow(ry, P), c = Math.pow(rz, P);
    const aire = 4 * Math.PI * Math.pow((a * b + a * c + b * c) / 3, 1 / P);
    const N = Math.round((aire * 4.4 * aere) / (k * k));
    const taille = (quart === 0 ? [0.6, 0.92] : [0.45, 0.75]).map((v) => v * k);
    const info = { c: [x, yc, z], r: Math.max(rx, ry, rz), t };
    for (let i = 0; i < N; i++) {
      const L = Math.random() < 0.55 ? lobes[0] : lobes[1 + Math.floor(Math.random() * nl)];
      const u = Math.random() * Math.PI * 2, cv = rnd(-0.7, 1), sv = Math.sqrt(1 - cv * cv);
      const surface = Math.random() < 0.6, rr = surface ? rnd(0.82, 1.02) : rnd(0.35, 0.8);
      const ux = Math.cos(u) * sv, uz = Math.sin(u) * sv;
      const px = L[0] + ux * L[3] * rr, pz = L[2] + uz * L[5] * rr;
      let py = L[1] + cv * L[4] * rr;
      // (PARC ENTIER, lot B2 : le massif était posé à la hauteur du sol sous son CENTRE ; sur la butte, qui tombe de
      // 0,8 m en deux mètres vers le chemin, son bas flottait côté chemin et s'enterrait côté grillage. Chaque carte
      // suit désormais le sol sous elle, entièrement au pied du massif, de moins en moins vers son sommet)
      if (entier) {
        const b0 = yc - ry * 0.85, rel = Math.min(1, Math.max(0, (py - b0) / h));
        py += (Y(pz, px) - b0) * (1 - 0.7 * rel);
      }
      if (py < Y(pz, px) + 0.05) continue;
      if (Math.random() < 0.6 * aere && !(surface && ++tournees % 3 === 0)) {
        n.set(ux / L[3], cv / L[4], uz / L[5]).normalize();
        q.setFromUnitVectors(Z, n); q2.setFromAxisAngle(n, Math.random() * Math.PI * 2); q.premultiply(q2);
        e.set(rnd(-0.35, 0.35), rnd(-0.35, 0.35), 0); q2.setFromEuler(e); q.multiply(q2);
      } else { e.set(rnd(-1.1, 1.1), Math.random() * Math.PI, rnd(-0.8, 0.8), 'YXZ'); q.setFromEuler(e); }
      const s = rnd(taille[0], taille[1]);
      carte(quart, px, py, pz, s, s * rnd(0.85, 1.1), { ...info, t: t * rnd(0.92, 1.08) });
    }
  };
  // Du coin du quai vers le mur (repère du terrain 1), relevé sur les photos 39, 41 et 42 :
  //  - arbustes bas de 1 à 1,8 m au coin du quai, du lierre au sol ;
  //  - sous-bois clair et aéré sous l'arbre léger (on voit ses tiges et le ciel) ;
  //  - UN gros laurier sombre, boule de 3,3 m, juste derrière le poteau de D2 ;
  //  - la TROUÉE de x = -1,3 à -3,3 : rien au-dessus de 50 cm, le talus nu et la pelouse au fond ;
  //  - puis des masses denses de 2 à 3,5 m jusqu'au mur, une deuxième rangée plus haute derrière.
  const MASSIFS = [
    [5.6, 10.0, 1.1, 0.95, 0.7, 2, 1.05], [4.4, 10.2, 1.6, 1.0, 0.8, 2, 1.0],
    [5.2, 11.6, 2.3, 1.1, 0.9, 1, 0.95], [3.9, 12.2, 2.2, 1.0, 0.9, 2, 1.0, 0.7],
    [3.0, 10.5, 2.0, 1.1, 0.9, 2, 1.08, 0.6], [1.6, 10.3, 2.4, 1.0, 0.9, 2, 1.02, 0.65],
    [-0.4, 10.45, 3.3, 1.25, 1.1, 0, 0.9],
    [-1.9, 10.2, 0.35, 0.4, 0.35, 2, 0.95], [-2.8, 10.5, 0.45, 0.35, 0.35, 1, 0.9],
    // le laurier sombre à droite de la trouée : vu du terrain (photo 42), le fût du pin ne se montre que sous la
    // fourche ; plus bas il est caché par une masse de feuillage sombre de plus de 4 m — ce laurier-ci (4,2 m) et,
    // derrière lui, le premier de la deuxième rangée (4,6 m). Ils s'arrêtent à x = -7,1, au bord du couloir qui
    // laisse voir la terrasse derrière la cage ; du banc blanc, plus à gauche, on voit toujours le fût (photos
    // 185625 et 185626)
    [-4.3, 10.3, 2.4, 1.1, 0.9, 1, 0.95], [-5.8, 10.6, 4.2, 1.1, 1.1, 0, 0.8],
    // derrière la cage (photos 185625 et 185626) : entre le mât et le tronc du pin, le talus nu où passe le
    // soleil couchant, sous une touffe haute et claire ; de l'autre côté du tronc, les arbustes reprennent,
    // mais BAS (1,2 à 1,4 m) et aérés : au-dessus de la barre de la cage, la photo 42 et celle du 27/09 (600)
    // montrent la terrasse du jardin — son mur crème, la rampe de l'escalier en diagonale, la haie et le drapeau
    [-7.0, 10.9, 3.1, 0.8, 0.7, 2, 1.05, 0.45], [-9.6, 10.5, 1.2, 0.9, 0.9, 0, 0.88, 0.7],
    [-10.1, 10.3, 1.2, 1.0, 0.9, 1, 0.96, 0.7], [-11.6, 10.8, 1.4, 1.2, 1.2, 0, 0.86, 0.7],
    [-13.2, 10.4, 2.8, 1.0, 1.0, 1, 0.95], [-14.8, 10.9, 3.2, 1.2, 1.2, 0, 0.88],
    [-16.5, 10.4, 2.6, 1.1, 1.0, 1, 0.97], [-18.2, 10.8, 3.0, 1.2, 1.1, 0, 0.9],
    [-19.9, 10.3, 2.5, 1.0, 0.9, 1, 0.95],
    // (07/10, photo 20261007_184901 : au bout du mur, plus d'arbuste — l'escalier y monte, voir escalierMur. La haie
    // s'arrête au grand mât gris où finit le grillage, dense et haute, jusqu'à lui ; ses boules restent à l'est de
    // ESCALIER.xL[1] : un lobe déborde au plus de 1,3 fois le rayon de son massif. Au parc entier, le coin reste fermé
    // et garde ses deux massifs d'avant : voir ESCALIER)
    ...(coinOuvert() ? [[-20.95, 10.75, 2.9, 0.95, 1.1, 0, 0.88], [-21.5, 9.95, 2.9, 0.5, 0.75, 0, 0.9], [-21.0, 10.35, 3.2, 0.7, 0.8, 1, 0.92]]
      : [[-21.5, 10.7, 2.9, 1.1, 1.1, 0, 0.88], [-23.0, 10.3, 2.4, 0.75, 0.9, 1, 0.94]]),
    // la deuxième rangée : plus haute, elle dépasse des premières et donne la profondeur — sauf dans l'axe de la
    // cage, où elle ne passe pas 1,5 m au-dessus du talus (la trouée vers la terrasse)
    [-5.9, 12.6, 4.6, 1.2, 1.2, 0, 0.8], [-10.4, 12.6, 1.5, 1.2, 1.1, 0, 0.82], [-13.9, 12.2, 1.4, 1.3, 1.2, 1, 0.85],
    // (celui de x = -21 recule vers le grillage : l'allée des photos du 28/09 passe en biais juste derrière, voir abordsMur)
    [-17.4, 12.5, 3.6, 1.4, 1.3, 0, 0.82], [-20.6, 11.5, 3.3, 1.3, 0.9, 1, 0.85],
  ];
  for (const [x1, z, h, rx, rz, quart, t, aere] of MASSIFS) {
    if (cx(x1) < XN + 0.3 || cx(x1) > XS + 0.6) continue;
    massif(x1 + rnd(-0.15, 0.15), z + rnd(-0.1, 0.1), h * rnd(0.93, 1.07), rx, rz, quart, t, aere);
  }
  // en haut du talus, du côté du pin : des arbres ensoleillés, entre les arbustes et le chemin rouge
  // (z < 17). Au milieu et vers le quai, rien : par la trouée et au-dessus des arbustes, on voit le chemin et
  // le JARDIN (jardinBecon), comme sur place. Les deux grands sont repoussés contre le mur (x = -21,5 et -24) :
  // à -12,5 et -16 ils bouchaient, vus du terrain, le mur de la terrasse et le drapeau au-dessus de la cage
  // (PHOTOS DU 28/09, 171717 : du bout du mur, l'allée rouge file en biais vers le chemin du jardin (abordsMur), là où se
  // tenaient ces deux grands. Il n'en reste qu'un, entre la masse d'arbustes et le biais, un peu moins large, toujours
  // à l'écart de la vue du mur de la terrasse et du drapeau au-dessus de la cage)
  // (PARC ENTIER, lot B2 : le premier, à z = 15,2, est en plein sur le chemin rouge de la rampe est ; reculé hors de
  // l'allée, il tomberait sur le fût du pin : il n'est pas planté. Le second recule jusqu'au bord de l'allée.)
  for (const [x1, z, h, rx, rz] of [[-8.2, 15.2, 5.0, 2.2, 1.4], [-18.0, 12.8, 6.8, 1.8, 1.0]]) {
    if (entier && z > 15) continue;
    massif(x1, z, h, rx, rz, 1, rnd(1.05, 1.15), 0.8, 2);
  }
  // le bas des massifs : des touffes basses (0,7 à 1,1 m) qui bouchent le pied entre les boules, sauf dans
  // la trouée — sans elles on voyait la terre sous chaque arbuste, alors que la photo n'en montre que là
  // (pas devant l'escalier du bout du mur : elles partent 1,1 m après son limon)
  for (let x1 = coinOuvert() ? ESCALIER.xL[1] + 1.1 : X1(XN) + 0.8; x1 < X1(XS) - 0.2; x1 += rnd(0.9, 1.3)) {
    if ((x1 > -3.6 && x1 < -1.0) || (x1 > -8.4 && x1 < -6.7)) continue;      // la trouée de D2, celle du pin
    massif(x1, rnd(9.75, 10.1), rnd(0.7, 1.1), rnd(0.6, 0.85), 0.45, x1 > 1 ? 2 : 1, rnd(0.9, 1.0));
  }
  // et trois vrais arbustes (assets/parc/arbuste.glb, un oranger du Mexique : feuilles luisantes, boule lâche),
  // au premier rang, là où les massifs sont bas, du coin du quai à la trouée ; ils s'ajoutent aux massifs (sans
  // le fichier, il n'y a rien à remplacer). 1,3 m de rayon au plus pour 1,4 m de haut : posés à z = 10,9, ils
  // restent derrière le grillage. Version légère même sur PC — de près on ne la distingue pas de l'autre, et
  // c'est six appels de dessin au lieu de huit, 9 000 triangles au lieu de 23 000 —, et sans ombre, comme les
  // massifs qui les entourent (et qui n'en reçoivent pas).
  planter(scene, 'arbuste', [[5.0, 10.9, 1.35], [2.4, 10.95, 1.4], [-4.8, 10.95, 1.35]].map(([x1, z, h]) =>
    ({ x: cx(x1), y: Y(z, cx(x1)) - 0.04, z, h, rot: 6.283 * alea(x1, z, 2), loin: true })), { ombre: false });
  // LE LIERRE : seulement au pied de la maille basse (0 à 0,6 m), par plaques sur 60 % de la longueur, plus
  // dense près du coin du quai et derrière les bancs de la cage. La maille reste ajourée au-dessus.
  // (il commence au grand mât du haut de l'escalier — plus de maille entre lui et le mur —, à une demi-carte de lui :
  // une plaque de lierre déborde de 50 cm de part et d'autre de son pied, elle tombait sur le limon)
  for (let x = coinOuvert() ? cx(ESCALIER.xM) + 0.6 : XN + 0.4; x < XS - 0.1;) {
    const x1 = X1(x), dense = x1 > 3 || (x1 < -4.5 && x1 > -10.5), long = rnd(0.8, 2.6);
    if (Math.random() < (dense ? 0.85 : 0.5)) {
      for (let s = x; s < Math.min(x + long, XS - 0.1); s += rnd(0.45, 0.7)) {
        if (X1(s) > TROU_PIN[0] - 0.3 && X1(s) < TROU_PIN[1] + 0.3) continue;   // pas de maille, pas de lierre accroché
        const h = rnd(0.32, 0.62) * (dense ? 1.1 : 1), w = rnd(0.7, 1.0);
        e.set(rnd(-0.1, 0.1), rnd(-0.2, 0.2), rnd(-0.08, 0.08), 'YXZ'); q.setFromEuler(e);
        carte(3, s, h * 0.55 - 0.03, ZG + rnd(0.03, 0.08), w, h * 1.15, { c: [s, 0.1, ZG + 0.9], r: 1.0, t: rnd(0.85, 1.05) }, ZG + 0.02);
      }
    }
    x += long + rnd(0.3, 1.2);
  }
  // du lierre AU SOL au coin du quai, et quelques plaques sur la terre ailleurs
  for (let i = 0; i < 110; i++) {
    const coin = i < 26, x = coin ? cx(rnd(3.4, 6.4)) : rnd(XN + 0.5, XS - 3), z = ZG + rnd(0.25, coin ? 1.6 : 1.2);
    if (!coin && Math.abs(X1(x) + 2.3) < 1.1) continue;                    // pas dans la trouée : la terre y est nue
    if (coinOuvert() && X1(x) < ESCALIER.xL[1] + 0.5) continue;             // ni sur l'escalier du bout du mur
    e.set(-Math.PI / 2 + 0.38 + rnd(-0.2, 0.2), Math.random() * Math.PI, 0, 'YXZ'); q.setFromEuler(e);
    const s = rnd(0.6, 0.95);
    carte(3, x, Y(z, x) + 0.06, z, s, s, { c: [x, -0.6, z], r: 1.0, t: rnd(0.9, 1.1) }, ZG + 0.05);
  }
  const geo = coudre(touffes, infos, { coeur: true });   // (lot L3 : le creux sombre entre les boules)
  const col = geo.attributes.color;
  for (let i = 0; i < teintes.length; i++) {
    const h = teintes[i];
    for (let k = i * 4; k < i * 4 + 4; k++) col.setXYZ(k, col.getX(k) * h[0], col.getY(k) * h[1], col.getZ(k) * h[2]);
  }
  const arbustes = new THREE.Mesh(geo, mat);
  arbustes.castShadow = true; arbustes.receiveShadow = false; arbustes.customDepthMaterial = mat.userData.ombre;
  scene.add(arbustes); declarerFeuillage(scene, arbustes);
  // (lot L12 : la LISTE EXPLICITE du feuillage qui reçoit l'occlusion ambiante, sur machine costaude — ce massif, et
  // lui seul : js/options_rendu.js normalesFeuillage)
  // `compAO` : sa couleur x 1,35 tant qu'elle reçoit l'occlusion, qui n'y pèse que moitié (js/options_rendu.js ; mesuré
  // le 01/10 en extrême, du plateau vers le pin : 0,547 fois l'enrobé sans occlusion ; avec, 0,464 à x 1 et 0,519 à
  // x 1,25 — le pied du massif à 23 au lieu de 31, plus jamais noir. Calage L7 visé, caméra de match de parc2 : 0,55 à 0,63)
  arbustes.userData.compAO = 1.35;
  (scene.userData.feuillageAO = scene.userData.feuillageAO || []).push(arbustes);

  // ---- 3. LES FILETS TOMBÉS ----
  // Une seule toile verte pour les deux : le filet de 8 cm décroché qui traîne au pied du grillage (x = 0,3 à
  // -3) en poche et remonte en voile le long du mât de x = -2,15 jusqu'à 1,8 m ; et le grillage plastique de 5 cm
  // affaissé contre la maille basse, de x = -2,2 à -4,6. Tous deux DERRIÈRE le grillage : rien ne dépasse sur le
  // terrain. Les UV sont en mètres : la même texture sert aux deux mailles. Sur les photos 42 et 1856230 la toile
  // est TRANSLUCIDE — un vert moyen (#4f6e54) à fils fins et mailles larges, à travers lequel on voit la terre du
  // talus —, pas le rideau vert-noir que faisaient un fil sombre et une maille serrée.
  const tFilet = K.netTexture('#4f6e54', 6); tFilet.repeat.set(1, 1);
  const T8 = 1 / (1.2 * 1.7), T5 = 1 / 1.2;
  const poche = nappe(18, 5, (a, b) => {
    const x = cx(0.3) - a * 3.3, z = ZG + 0.04 + b * 0.45 * (0.7 + 0.3 * Math.sin(a * 7));
    const y = Y(z, x) + 0.02 + 0.13 * Math.sin(b * Math.PI) * (0.55 + 0.45 * Math.sin(a * 11 + 1)) + (a > 0.6 && a < 0.86 ? b * 0.35 : 0);
    return [x, y, z, x * T8, z * T8];
  });
  // LA VOILE, en TRIANGLE (photo 42, à droite du poteau de D2) : accrochée en haut du mât (1,8 m), elle descend en
  // diagonale vers le quai et touche le sol vers x = -0,15, deux mètres plus loin ; son bord libre fait un peu
  // ventre. (a le long du sol vers le quai, b vers le haut : la rangée b = 1 se resserre sur le point d'attache.
  // La forme x = -2,15 + 2a(1-b), y = 1,8b(1-a) proposée se repliait sur elle-même le long de a + b = 1 : deux
  // épaisseurs de toile superposées, d'où un moiré ; celle-ci couvre le même triangle, une seule fois)
  const voile = nappe(8, 10, (a, b) => {
    const x = cx(-2.15) + a * 2.0 * (1 - b), y = 1.8 * b * (1 - 0.35 * a * (1 - b));
    const z = ZG + 0.05 + 0.12 * Math.sin(a * Math.PI) * (1 - b) + 0.03 * Math.sin(b * 9 + a * 4);
    return [x, Math.max(y, Y(z, x) + 0.02), z, x * T8, y * T8];
  });
  const affaisse = nappe(16, 9, (a, b) => {
    // accroché en haut à la maille, il fait ventre vers l'arrière et repose au sol. Son bord haut DESCEND en
    // s'éloignant du mât (photo 42) : 1,5 m à x = -2,25, 0,8 m à -4,6, avec 25 cm de creux entre les deux
    const x = cx(-2.25) - a * 2.35, haut = 1.5 - 0.7 * a - 0.25 * Math.sin(a * Math.PI);
    const y = haut * (1 - b), z = ZG + 0.04 + 0.34 * Math.pow(Math.sin(b * Math.PI * 0.5), 2) * (0.4 + 0.6 * Math.sin(a * Math.PI));
    return [x, Math.max(y, Y(z, x) + 0.02), z, x * T5, y * T5];
  });
  // le grillage plastique noué au mât du pin derrière la cage (photos 185625 et 185626) : il pend du collier à
  // 1,25 m et s'évase en jupe sur le talus, côté pin seulement (le treillis est 7 cm devant le mât). Le mât est à
  // x = -7,45 (43 % de la largeur de la cage depuis son montant côté quai, dans la trouée du treillis) : même
  // valeur que dans cloturesParc, sinon le manchon pend à côté de son mât
  const XM = cx(-7.45), ZM = ZG + 0.07;
  const manchon = nappe(14, 8, (a, b) => {
    const th = -0.1 * Math.PI + a * 1.2 * Math.PI, r = 0.06 + 0.42 * Math.pow(b, 1.3) * (0.85 + 0.15 * Math.sin(a * 9));
    const x = XM + Math.cos(th) * r, z = Math.max(ZG + 0.03, ZM + Math.sin(th) * r);
    const y = Math.max(Y(z, x) + 0.02, (1.25 + 0.1 * Math.sin(a * 5)) * (1 - b));
    return [x, y, z, (x + z) * T5, y * T5];
  });
  const filets = new THREE.Mesh(mergeGeometries([poche, voile, affaisse, manchon]),
    new THREE.MeshStandardMaterial({ map: tFilet, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.9 }));
  // (déclarés comme un feuillage : pour l'occlusion ambiante, une toile à trous est un panneau plein)
  filets.castShadow = true; scene.add(filets); declarerFeuillage(scene, filets);

  // ---- 4. LE SAC KRAFT ET LES PAPIERS ----
  // le sac froissé derrière le grillage, au pied du laurier ; des papiers blancs au pied de la maille
  const debris = [];
  const teinter = (g, hex) => {
    const c = new THREE.Color(hex), a = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < a.length; i += 3) { const v = rnd(0.9, 1.05); a[i] = c.r * v; a[i + 1] = c.g * v; a[i + 2] = c.b * v; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
  };
  const sac = new THREE.BoxGeometry(0.3, 0.15, 0.2, 3, 2, 2);
  const ps = sac.attributes.position;
  for (let i = 0; i < ps.count; i++) ps.setXYZ(i, ps.getX(i) + rnd(-0.02, 0.02), ps.getY(i) * (ps.getX(i) > 0.1 ? 0.5 : 1) + rnd(-0.015, 0.015), ps.getZ(i) + rnd(-0.02, 0.02));
  sac.computeVertexNormals();
  sac.rotateZ(0.25); sac.rotateY(0.6); sac.translate(cx(-1.0), Y(9.6, cx(-1.0)) + 0.06, 9.6);
  debris.push(teinter(sac, 0xc9a878));
  for (const [x1, z, r] of [[-1.6, 9.14, 0.3], [-2.1, 9.16, 1.2], [-2.7, 9.13, 2.0], [-3.1, 9.5, 0.7], [-1.4, 9.8, 2.6], [1.7, 9.15, 1.9]]) {
    const p = new THREE.PlaneGeometry(rnd(0.1, 0.18), rnd(0.12, 0.22));
    p.rotateX(-Math.PI / 2 + rnd(-0.15, 0.15)); p.rotateY(r); p.translate(cx(x1), Y(z, cx(x1)) + 0.015, z);
    p.computeBoundingBox(); if (p.boundingBox.min.z < ZO + 0.01) p.translate(0, 0, ZO + 0.01 - p.boundingBox.min.z);   // pas sur l'enrobé
    debris.push(teinter(p, 0xe8e6df));
  }
  const detritus = new THREE.Mesh(mergeGeometries(debris), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }));
  detritus.receiveShadow = true; scene.add(detritus);

  // ---- 5. L'ARBRE LÉGER, au-dessus du sous-bois clair : un vrai SAULE ARGENTÉ (assets/parc/saule.glb) ----
  // Le modèle est un saule large (14 m pour 12,7 m de haut) ; celui des photos 39 et 42 est une cépée haute et
  // étroite (6,5 m de large, 9,5 m de haut), où l'on voit le ciel au travers. On le prend donc à 7,4 m de large
  // et on l'étire en hauteur (x1,3 : les rameaux pendants du saule s'allongent sans que ça se voie), et on
  // retire un quart de ses rameaux. Pied reculé à z = 12,9, vers le quai ; le fichier étale déjà sa couronne,
  // dissymétrique, vers +x et +z (le quai, le jardin) : elle s'arrête au-dessus de D2 comme sur la photo 42.
  // Un rameau qui passerait devant le plan du grillage serait repoussé derrière lui, d'un bloc (garde-fou : à
  // cette taille, rien ne dépasse). L'arbre procédural reste en place jusqu'à son arrivée.
  const leger = arbreLeger(scene, K, cx(3.3), 11.8, ZG, Y(11.8, cx(3.3)));
  // (PARC ENTIER, lot B2 : à z = 12,9 son fût tombait sur la bordure du chemin rouge, qui passe là à z = 12,85 ; il
  // recule de 45 cm, son obstacle aussi — SAULE_Z_ENTIER, dans buildParc)
  const zS = entier ? SAULE_Z_ENTIER : 12.9;
  planter(scene, 'saule', [{ x: cx(4.0), y: Y(zS, cx(4.0)) - 0.1, z: zS, h: 6.7, etire: 1.3, rot: 0 }],
    { repli: leger, retouche: (g, pc, s) => { if (pc.feuille) eclaircir(g, 0.25); repousserDerriere(g, ZG + 0.12 - s.z, pc.feuille); } });
}

// Les CARTES d'un feuillage de modèle : ses morceaux connexes (union-find sur les triangles). Rend la racine de
// chaque sommet.
function cartesDe(g) {
  const n = g.attributes.position.count, par = new Int32Array(n);
  for (let i = 0; i < n; i++) par[i] = i;
  const rac = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const unir = (a, b) => { a = rac(a); b = rac(b); if (a !== b) par[b] = a; };
  const idx = g.index.array;
  for (let t = 0; t < idx.length; t += 3) { unir(idx[t], idx[t + 1]); unir(idx[t], idx[t + 2]); }
  for (let i = 0; i < n; i++) par[i] = rac(i);
  return par;
}
// Rien d'un modèle devant le plan z = zMin (dans le repère de l'exemplaire, pied à l'origine) : une carte de
// feuillage qui le franchit est repoussée derrière lui D'UN BLOC, comme les touffes de l'arbre procédural ; le
// bois, lui, est aplati contre le plan.
function repousserDerriere(g, zMin, cartes) {
  const p = g.attributes.position, n = p.count;
  if (!cartes || !g.index) {
    for (let i = 0; i < n; i++) if (p.getZ(i) < zMin) p.setZ(i, zMin);
    p.needsUpdate = true; return;
  }
  const r = cartesDe(g), bas = new Float32Array(n).fill(Infinity);
  for (let i = 0; i < n; i++) bas[r[i]] = Math.min(bas[r[i]], p.getZ(i));
  for (let i = 0; i < n; i++) { const d = zMin - bas[r[i]]; if (d > 0) p.setZ(i, p.getZ(i) + d); }
  p.needsUpdate = true;
}
// Retire une part `frac` des cartes, tirées d'après leur position (le même saule d'une partie à l'autre).
function eclaircir(g, frac) {
  if (!g.index) return;
  const r = cartesDe(g), p = g.attributes.position, idx = g.index.array, garde = [];
  for (let t = 0; t < idx.length; t += 3) {
    const k = r[idx[t]];
    if (alea(p.getX(k), p.getZ(k), p.getY(k)) >= frac) garde.push(idx[t], idx[t + 1], idx[t + 2]);
  }
  g.setIndex(garde);
}

// LA SAIGNÉE DES COULEURS (lot L8), à la fin de chaque dessin de feuillage découpé (les *Brut transparents).
// Une toile 2D garde ses pixels PRÉMULTIPLIÉS : sous un alpha nul, la couleur est perdue, et three envoie la texture
// non prémultipliée — du NOIR (0, 0, 0, 0) tout autour des feuilles, relevé dans chaque image cuite. Les mipmaps
// moyennent ce noir avec le bord des feuilles : au loin, les feuillages s'assombrissent et se cernent de noir.
// Simulé sur les dix textures de feuillage du parc (moyenne non prémultipliée, comme generateMipmap, rapportée à la
// couleur juste) : de 5 à 45 % plus sombres au niveau 3, de 20 à 60 % au niveau 5 — les franges noires du fond et du
// massif du pin (contre-examen végétation, D8).
// La saignée donne à chaque pixel vide la couleur moyenne, pondérée par l'alpha, du plus petit bloc de 2^k pixels qui
// le contient et qui porte des feuilles : la couleur même que les mipmaps y trouveront (une « pyramide » : dès le
// bloc de 2 x 2 au bord des feuilles, et jusqu'au loin, là où quelques pixels de voisinage n'y suffiraient pas). Avec
// un ALPHA DE 12/255, pas 0 : c'est le plus petit qui garde la couleur à ±10 niveaux près dans une toile
// prémultipliée (à 0 elle est perdue, à 1 ou 2 arrondie au noir ou au blanc). 0,047, dix fois sous le seuil de
// découpe des feuillages (0,4 à 0,45 ; même remonté par la compensation de mip de materiauFeuilles, ×3 au plus, il ne
// l'atteint jamais) : un pixel saigné ne se voit pas. Au loin, il épaissit à peine les couronnes : au niveau 4, un
// texel passe le seuil à 17 % de feuilles au lieu de 21 %.
// Simulé après : moins de 2 % d'écart jusqu'au niveau 4 (le lierre et l'arbuste pourpre gardent 3 à 6 % au niveau 4 :
// leurs tiges sombres, dessinées demi-transparentes, pèsent plus dans une moyenne non prémultipliée — c'est le
// dessin, pas la frange).
// Elle se fait DANS la toile, à la fin du dessin : l'image cuite et le dessin de secours restent la même image
// (et elle entre dans l'empreinte des textures qui l'appellent : voir leur texCuite).
function saigner(g) {
  const w = g.canvas.width, h = g.canvas.height, AB = 12, img = g.getImageData(0, 0, w, h), d = img.data;
  // la pyramide des sommes (couleur × alpha, alpha), du bloc de 2 x 2 à celui qui couvre toute la toile ; au premier
  // niveau, seuls comptent les pixels qu'on garde (alpha ≥ AB : ceux d'en dessous sont repeints)
  const niveaux = [];
  let lw = w, lh = h, src = null;
  while (lw > 1 || lh > 1) {
    const nw = Math.ceil(lw / 2), nh = Math.ceil(lh / 2), s = new Float32Array(nw * nh * 4);
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const o = ((y >> 1) * nw + (x >> 1)) * 4;
        if (src) {
          const i = (y * lw + x) * 4;
          s[o] += src[i]; s[o + 1] += src[i + 1]; s[o + 2] += src[i + 2]; s[o + 3] += src[i + 3];
        } else {
          const i = (y * w + x) * 4, a = d[i + 3];
          if (a >= AB) { s[o] += d[i] * a; s[o + 1] += d[i + 1] * a; s[o + 2] += d[i + 2] * a; s[o + 3] += a; }
        }
      }
    }
    niveaux.push([nw, s]); src = s; lw = nw; lh = nh;
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] >= AB) continue;
      for (let k = 0; k < niveaux.length; k++) {
        const [nw, s] = niveaux[k], o = ((y >> (k + 1)) * nw + (x >> (k + 1))) * 4, a = s[o + 3];
        if (a > 0) { d[i] = s[o] / a; d[i + 1] = s[o + 1] / a; d[i + 2] = s[o + 2] / a; d[i + 3] = AB; break; }
      }
    }
  }
  g.putImageData(img, 0, 0);
}

// Le feuillage des arbustes du pin, en ATLAS de quatre quarts de 256 px (un seul matériau, un seul appel de
// dessin pour toute la rangée). Chaque quart est une TOUFFE aux bords arrondis, pas une tuile pleine : vue de
// près, une carte ne doit pas montrer son bord droit. Six pixels vides autour de chaque quart, sinon les
// mipmaps mélangent les quarts voisins. Ce sont des ALBÉDOS, plus clairs que les couleurs relevées à l'écran
// sur les photos (#252827 à #5e5754 pour les arbustes, #424848 pour le laurier : un gris-vert très peu saturé
// au crépuscule) ; calés par des rendus depuis la pose de la photo 42, rapportés à l'enrobé.
//  0 : laurier / viorne, grandes feuilles ovales luisantes, le plus sombre ;
//  1 : arbuste à petites feuilles (troène, fusain) ;
//  2 : sous-bois clair et aéré sous l'arbre léger et au coin du quai (#4d5f3d, éclairé #7e9460) ;
//  3 : lierre à feuilles lobées (#2e4a2a), dense en bas et effiloché en haut (il pousse depuis le sol).
// LOT L8 (30/09). Chaque quart était un DISQUE plein de feuilles, en palettes très étalées, le laurier luisant de
// reflets en ellipse : vu d'en haut par la caméra de diffusion du terrain 2 (le quart gauche de l'image pendant tout le
// match), chaque carte se lisait comme une boule et le massif comme un camouflage de choux — contraste moyen (3 à 16 px)
// de 13,8 à 14,2, grain de 12,4 à 12,9, contre 8,6 et 8,9 sur la photo 342, même zone. Désormais :
//  - un cœur plus petit (rayon 96 px au lieu de 112), qui garde un peu plus de la moitié des feuilles, et des RAMEAUX
//    qui en partent jusqu'au bord du quart, les autres feuilles groupées le long d'eux : un contour cassé, du vide entre
//    les rameaux, la carte ne se lit plus. (Des rameaux seuls, un cœur réduit au tiers : le massif se trouait et
//    montrait la terre, vu du plateau vers le pin — la tuile ne couvrait plus que 40 % du quart, 53 % avant) ;
//  - l'écart des couleurs de feuilles est DIVISÉ PAR DEUX : palettes resserrées autour de leur moyenne (même teinte ;
//    3 % plus sombres, voir `serre`), sous-couche moins sombre, variations par feuille réduites de moitié ;
//  - plus de reflets en ellipse sur le laurier (nervures adoucies partout).
// Mesuré (caméra de diffusion du terrain 2, extrême, même pose avant et après) : contraste moyen 13,2 -> 9,6, grain
// 12,7 -> 8,0, à la même clarté (0,58 fois l'enrobé).
function atlasArbustesPin(canvasTex) { return avecTeinte(atlasArbustesPinBrut(canvasTex), TEINTES_FEUILLES.arbustes); }
function atlasArbustesPinBrut(canvasTex) {
  const cuite = texCuite(atlasArbustesPinBrut, arguments, [saigner]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(512, 512, (g) => {
    g.clearRect(0, 0, 512, 512);
    const quart = (qx, qy, dessin) => {
      g.save(); g.beginPath(); g.rect(qx + 6, qy + 6, 244, 244); g.clip(); g.translate(qx, qy); dessin(); g.restore();
    };
    const pioche = (T) => { let r = Math.random(); for (const [p, c] of T) { if ((r -= p) <= 0) return c; } return T[T.length - 1][1]; };
    const rgb = (c, k) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
    // une palette [[poids, [r, g, b]], ...] resserrée de moitié autour de sa moyenne pondérée, et 3 % plus sombre : sans
    // les franges noires que la saignée efface, le massif vu du plateau vers le pin passait de 0,61 à 0,64 fois
    // l'enrobé (cible du lot L3 : 0,55 à 0,63)
    const serre = (T) => {
      const m = [0, 0, 0];
      for (const [p, c] of T) for (let k = 0; k < 3; k++) m[k] += p * c[k];
      return T.map(([p, c]) => [p, c.map((v, k) => 0.97 * (m[k] + (v - m[k]) / 2))]);
    };
    // `n` rameaux du cœur (128, 128) vers le bord du quart (longueur l0 à l1 px), un peu tordus, tracés en brun sombre,
    // en éventail inégal (sinon, de longueurs égales et régulièrement espacés, ils dessinaient une étoile)
    const rameaux = (n, l0, l1, trait) => {
      const rs = [], a0 = Math.random() * 6.283;
      g.strokeStyle = trait; g.lineWidth = 1.4; g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        let b = a0 + ((i + rnd(-0.45, 0.45)) * 6.283) / n;
        const L = rnd(l0, l1), pts = [[128 + rnd(-10, 10), 128 + rnd(-10, 10)]];
        for (let k = 1; k <= 6; k++) { b += rnd(-0.25, 0.25); const p = pts[k - 1]; pts.push([p[0] + (Math.cos(b) * L) / 6, p[1] + (Math.sin(b) * L) / 6]); }
        rs.push(pts);
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.stroke();
      }
      return rs;
    };
    // une place le long d'un rameau (plutôt vers son bout), à `e` px près — un peu moins vers le bout, qui s'effile
    const surRameau = (rs, e) => {
      const r = rs[Math.floor(Math.random() * rs.length)], t = Math.pow(Math.random(), 0.75) * 6;
      const k = Math.min(5, Math.floor(t)), f = t - k, p = r[k], q = r[k + 1], ee = e * (1 - 0.3 * t / 6);
      return [p[0] + (q[0] - p[0]) * f + rnd(-ee, ee), p[1] + (q[1] - p[1]) * f + rnd(-ee, ee)];
    };
    const dansTouffe = (R) => { const a = Math.random() * 6.283, r = R * Math.sqrt(Math.random()); return [128 + Math.cos(a) * r, 128 + Math.sin(a) * r * 0.95]; };
    const feuilleOvale = (x, y, L, W, a, c) => {
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = c; g.beginPath(); g.moveTo(0, -L / 2); g.quadraticCurveTo(W, 0, 0, L / 2); g.quadraticCurveTo(-W, 0, 0, -L / 2); g.fill();
      g.restore();
    };
    // 0 : LAURIER — le cœur et sept rameaux, les grandes feuilles groupées le long d'eux
    quart(0, 0, () => {
      const T = serre([[0.3, [60, 68, 62]], [0.4, [76, 86, 74]], [0.22, [100, 110, 94]], [0.08, [128, 138, 120]]]);
      const rs = rameaux(7, 92, 124, 'rgba(44,44,36,0.8)');
      for (let i = 0; i < 320; i++) {
        const [x, y] = i % 20 < 11 ? dansTouffe(96) : surRameau(rs, 24), L = rnd(26, 44), fond = i < 120 ? 0.93 : 1;
        const c = pioche(T), a = Math.random() * 6.283;
        feuilleOvale(x, y, L, L * rnd(0.36, 0.46), a, rgb(c, fond * rnd(0.95, 1.05)));
        // la nervure claire (plus de reflet luisant en ellipse : vu d'en haut, un pois clair par feuille)
        g.save(); g.translate(x, y); g.rotate(a);
        g.strokeStyle = 'rgba(160,180,130,0.15)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -L * 0.42); g.lineTo(0, L * 0.42); g.stroke();
        g.restore();
      }
    });
    // 1 : ARBUSTE À PETITES FEUILLES — le cœur et dix rameaux fins, les feuilles en grappes le long d'eux
    quart(256, 0, () => {
      const T = serre([[0.35, [68, 74, 64]], [0.4, [86, 96, 78]], [0.2, [110, 120, 94]], [0.05, [136, 146, 114]]]);
      const rs = rameaux(10, 92, 124, 'rgba(42,42,34,0.8)');
      for (let i = 0; i < 860; i++) {
        const [x, y] = i % 20 < 11 ? dansTouffe(96) : surRameau(rs, 18), fond = i < 300 ? 0.93 : 1;
        g.fillStyle = rgb(pioche(T), fond * rnd(0.94, 1.06));
        g.save(); g.translate(x, y); g.rotate(Math.random() * 6.283);
        g.beginPath(); g.ellipse(0, 0, rnd(3.5, 6.5), rnd(7, 12), 0, 0, 6.283); g.fill(); g.restore();
      }
    });
    // 2 : SOUS-BOIS CLAIR — rameaux visibles, feuilles plus claires et plus lâches, toutes le long des rameaux
    quart(0, 256, () => {
      const T = serre([[0.35, [78, 90, 70]], [0.35, [94, 108, 80]], [0.2, [120, 134, 98]], [0.1, [140, 152, 116]]]);
      const rameaux = [];
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + rnd(-1.1, 1.1), l = rnd(70, 115), pts = [[128 + rnd(-10, 10), 236]];
        for (let k = 1; k <= 6; k++) pts.push([pts[0][0] + Math.cos(a) * l * k / 6 + rnd(-4, 4), 236 + Math.sin(a) * l * k / 6 * 1.8]);
        rameaux.push(pts);
        g.strokeStyle = '#4a4a3c'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts) g.lineTo(p[0], p[1]);
        g.stroke();
      }
      for (let i = 0; i < 360; i++) {
        const r = rameaux[i % rameaux.length], p = r[1 + Math.floor(Math.random() * 6)], e = i % 3 ? 16 : 24;
        const x = p[0] + rnd(-e, e), y = p[1] + rnd(-e, e);
        g.fillStyle = rgb(pioche(T), rnd(0.95, 1.05));
        g.save(); g.translate(x, y); g.rotate(Math.random() * 6.283);
        g.beginPath(); g.ellipse(0, 0, rnd(3.5, 6), rnd(8, 14), 0, 0, 6.283); g.fill(); g.restore();
      }
    });
    // 3 : LIERRE — cinq lobes pointus, nervures claires ; serré en bas de la tuile, épars en haut. Palette baissée
    // de 20 % (photos 39 et 42 : au pied de la maille, le lierre est presque noir-vert, plus sombre que les arbustes)
    quart(256, 256, () => {
      const T = serre([[0.4, [48, 64, 45]], [0.35, [59, 77, 53]], [0.15, [42, 54, 38]], [0.1, [80, 98, 70]]]);
      g.strokeStyle = 'rgba(58,58,44,0.8)'; g.lineWidth = 1.4;
      for (let i = 0; i < 8; i++) { const x = rnd(20, 236); g.beginPath(); g.moveTo(x, 250); g.bezierCurveTo(x + rnd(-30, 30), 180, x + rnd(-40, 40), 120, x + rnd(-40, 40), rnd(40, 120)); g.stroke(); }
      for (let i = 0; i < 440; i++) {
        const x = rnd(12, 244), y = 250 - Math.pow(Math.random(), 1.7) * 232, r = rnd(9, 15);
        const c = pioche(T);
        g.save(); g.translate(x, y); g.rotate(rnd(-0.7, 0.7) + Math.PI);
        g.fillStyle = rgb(c, rnd(0.94, 1.05)); g.beginPath();
        for (let k = 0; k <= 10; k++) {
          const t = (k / 10) * Math.PI * 2, rr = r * (k % 2 ? 0.52 : k === 0 || k === 10 ? 1.0 : 0.85);
          if (k === 0) g.moveTo(Math.sin(t) * rr, -Math.cos(t) * rr); else g.lineTo(Math.sin(t) * rr, -Math.cos(t) * rr);
        }
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(190,210,170,0.18)'; g.lineWidth = 0.9; g.beginPath();
        for (const a of [0, 1.2, -1.2]) { g.moveTo(0, r * 0.3); g.lineTo(Math.sin(a) * r * 0.75, -Math.cos(a) * r * 0.75); }
        g.stroke(); g.restore();
      }
    });
    saigner(g);                                                  // (la couleur sous l'alpha nul, voir saigner)
  }, [1, 1], true, 8);
}

// La terre nue du talus : brun #5b4538 à l'ombre, feuilles mortes, aiguilles de pin, brindilles.
// Une tuile = 2 m.
function terreTalusPin(canvasTex) {
  const cuite = texCuite(terreTalusPin, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4a382e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const v = rnd(0.7, 1.3);
      g.fillStyle = `rgba(${(84 * v) | 0},${(66 * v) | 0},${(54 * v) | 0},${rnd(0.25, 0.6)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 2.5), rnd(1, 2.5));
    }
    for (let i = 0; i < 10; i++) {                        // plaques plus sombres (humidité, humus)
      const r = rnd(18, 50), gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, 'rgba(50,38,30,0.35)'); gr.addColorStop(1, 'rgba(50,38,30,0)');
      g.save(); g.translate(Math.random() * w, Math.random() * h); g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); g.restore();
    }
    g.lineCap = 'round';
    for (let i = 0; i < 260; i++) {                       // aiguilles de pin tombées
      const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.283, l = rnd(7, 13);
      g.strokeStyle = Math.random() < 0.6 ? 'rgba(122,92,64,0.8)' : 'rgba(150,118,80,0.75)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    for (let i = 0; i < 170; i++) {                       // feuilles mortes
      g.save(); g.translate(Math.random() * w, Math.random() * h); g.rotate(Math.random() * 3.14);
      g.fillStyle = ['#7a5a38', '#8e6c44', '#5e4630', '#a07d52', '#6b5a3a'][i % 5]; g.globalAlpha = rnd(0.55, 0.95);
      g.beginPath(); g.ellipse(0, 0, rnd(2.5, 6), rnd(1.5, 3.5), 0, 0, 6.283); g.fill(); g.restore();
    }
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(48,38,30,0.7)';
    for (let i = 0; i < 14; i++) {                        // brindilles
      let x = Math.random() * w, y = Math.random() * h; g.lineWidth = rnd(1, 2); g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += rnd(-9, 9); y += rnd(-9, 9); g.lineTo(x, y); }
      g.stroke();
    }
  }, [1, 1], false, 8);
}

// ---------------------------------------------------------------------
//  L'ARBRE LÉGER (saule ou olivier de Bohême, photos 39 et 42)
// ---------------------------------------------------------------------
// Une CÉPÉE : sept tiges fines qui partent d'une même souche et s'ouvrent en vase (12 à 23° de la verticale,
// puis moitié moins), jusqu'à 7,5-9,4 m ; un houppier ovoïde TRÈS aéré de 6,5 m de large, de 2,5 à 9,8 m,
// où l'on voit 40 % de ciel au travers (210 cartes). Des cartes SIMPLES (pas de croix) : en croix, la couronne se
// bouchait. `x`, `z` : la souche ; `zG` : le plan du grillage du pin, qu'aucune feuille ne franchit.
// `ySol` : la hauteur du sol à la souche (le talus du pin ; le vrai sol quand le parc entier est installé).
function arbreLeger(scene, K, x, z, zG, ySol = hauteurTalusPin(z)) {
  const y0 = ySol - 0.12, V = THREE.Vector3;
  const bois = [];
  const n = 7, a0 = Math.random() * 6.283;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * 6.283 + rnd(-0.3, 0.3);
    // l'éventail est étiré le long de x : le houppier fait 6,5 m de large pour 4,8 m de profondeur
    const dx = Math.cos(a), dz = Math.sin(a) * 0.7;
    const p0 = new V(x + dx * 0.22, y0, z + dz * 0.22);
    const t1 = rnd(0.21, 0.4), h1 = rnd(2.6, 3.6), t2 = t1 * rnd(0.45, 0.7), h2 = rnd(6.4, 8.2) - y0 - h1;
    const p1 = new V(p0.x + dx * Math.tan(t1) * h1, p0.y + h1, p0.z + dz * Math.tan(t1) * h1);
    const p2 = new V(p1.x + dx * Math.tan(t2) * h2 * 0.6, p1.y + h2 * 0.6, p1.z + dz * Math.tan(t2) * h2 * 0.6);
    const p3 = new V(p2.x + dx * (Math.tan(t2) * h2 * 0.4 + 0.25), p2.y + h2 * 0.4, p2.z + dz * (Math.tan(t2) * h2 * 0.4 + 0.25));
    const r0 = rnd(0.045, 0.065);
    bois.push(tubeEffile([p0, p1, p2, p3], r0, 0.012, 8, 5));
    // trois ou quatre rameaux qui partent vers l'extérieur et le haut
    const courbe = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
    for (let k = 0; k < 3 + (i % 2); k++) {
      const t = rnd(0.35, 0.85), d = courbe.getPointAt(t), b = rnd(-0.9, 0.9), l = rnd(1.0, 1.8);
      const ex = Math.cos(a + b), ez = Math.sin(a + b) * 0.7;
      const f = new V(d.x + ex * l * 0.8, d.y + l * rnd(0.4, 0.8), d.z + ez * l * 0.8);
      const m = new V((d.x + f.x) / 2 + ex * 0.1, (d.y + f.y) / 2 + 0.12, (d.z + f.z) / 2 + ez * 0.1);
      bois.push(tubeEffile([d, m, f], r0 * 0.4, 0.006, 3, 4));
    }
  }
  const tiges = new THREE.Mesh(mergeGeometries(bois), new THREE.MeshStandardMaterial({ color: 0x5e5a52, roughness: 0.9 }));
  tiges.castShadow = true; tiges.receiveShadow = true; scene.add(tiges);
  // le houppier : 130 cartes (70 % en coque), presque verticales — des rameaux qui pendent — et une frange
  // basse jusqu'à 1,5 m côté grillage (photo 42)
  const CX = x + 0.1, CY = y0 + 5.9, CZ = z - 0.1, RX = 3.2, RY = 3.7, RZ = 2.4;
  const touffes = [], infos = [], o = new THREE.Object3D(), plan = new THREE.PlaneGeometry(1, 1);
  const poser = (px, py, pz, s, t) => {
    o.position.set(px, py, pz); o.rotation.set(rnd(-0.45, 0.45), Math.random() * Math.PI, rnd(-0.3, 0.3), 'YXZ');
    o.scale.set(s, s * rnd(1.0, 1.3), 1); o.updateMatrix();
    const g = plan.clone().applyMatrix4(o.matrix);
    g.computeBoundingBox();
    const dz = zG + 0.12 - g.boundingBox.min.z;
    if (dz > 0) g.translate(0, 0, dz);
    touffes.push(g); infos.push({ c: [CX, CY, CZ], r: 3.5, t });
  };
  for (let i = 0; i < 210; i++) {
    const u = Math.random() * 6.283, cv = rnd(-1, 1), sv = Math.sqrt(1 - cv * cv);
    const rr = i < 147 ? rnd(0.75, 1.0) : rnd(0.3, 0.75), vase = 0.72 + 0.28 * (cv + 1) / 2;   // plus large en haut
    poser(CX + Math.cos(u) * sv * RX * rr * vase, CY + cv * RY * rr, CZ + Math.sin(u) * sv * RZ * rr * vase, rnd(1.0, 1.5), rnd(0.9, 1.12));
  }
  for (let i = 0; i < 14; i++) poser(x + rnd(-2.4, 2.2), y0 + rnd(1.4, 2.8), zG + rnd(0.5, 1.2), rnd(0.7, 1.0), rnd(0.95, 1.1));
  // (lot L3 : comme les arbustes du talus, le reflet rasant du couchant éteint à contre-jour)
  const mat = materiauFeuilles(feuillesEtroites(K.canvasTex), { trans: 0.4, rugosite: 0.85, alpha: 0.4, reflet: 1, silhouette: 0.25, vent: 0.8 });
  const houppier = new THREE.Mesh(coudre(touffes, infos), mat);
  houppier.castShadow = true; houppier.receiveShadow = false; houppier.customDepthMaterial = mat.userData.ombre;
  scene.add(houppier); declarerFeuillage(scene, houppier);
  // (rendus, et protégés de la fusion du décor : le saule 3D les remplace à son arrivée)
  tiges.userData.nofuse = true; houppier.userData.nofuse = true;
  return [tiges, houppier];
}

// Feuilles lancéolées (6-9 x 1,5 cm) sur douze rameaux fins qui pendent : 35 % de la tuile seulement est
// couverte, c'est ce qui laisse passer le ciel. Vert-gris (#6f8266) avec le revers argenté (#a3ad9c) et les
// feuilles à contre-jour plus claires (#8a9b7a).
function feuillesEtroites(canvasTex) { return avecTeinte(feuillesEtroitesBrut(canvasTex), TEINTES_FEUILLES.leger); }
function feuillesEtroitesBrut(canvasTex) {
  const cuite = texCuite(feuillesEtroitesBrut, arguments, [saigner]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.save(); g.beginPath(); g.rect(8, 8, w - 16, h - 16); g.clip();
    const T = [[0.45, '#7c8f74'], [0.25, '#98a888'], [0.2, '#5c6a55'], [0.1, '#b0baa8']];
    const pioche = () => { let r = Math.random(); for (const [p, c] of T) { if ((r -= p) <= 0) return c; } return T[0][1]; };
    g.lineCap = 'round';
    // une touffe de rameaux courts qui partent d'une branche et s'écartent, un peu retombants au bout
    for (let i = 0; i < 26; i++) {
      let x = rnd(70, 442), y = rnd(70, 442), a = rnd(0, 6.283);
      const pts = [[x, y]];
      for (let k = 0; k < 6; k++) { a += rnd(-0.2, 0.2) + (Math.PI / 2 - a) * 0.06; x += Math.cos(a) * 22; y += Math.sin(a) * 22; pts.push([x, y]); }
      g.strokeStyle = '#55564a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts) g.lineTo(p[0], p[1]);
      g.stroke();
      for (let k = 0; k < 13; k++) {
        const s = pts[1 + Math.floor((k / 13) * 6)], cote = k % 2 ? 1 : -1;
        const L = rnd(27, 40), W = rnd(3, 4), b = a + cote * rnd(0.5, 1.1) + 0.3;
        g.save(); g.translate(s[0] + rnd(-5, 5), s[1] + rnd(-5, 5)); g.rotate(b - Math.PI / 2);
        g.fillStyle = pioche(); g.beginPath(); g.moveTo(0, 0);
        g.quadraticCurveTo(W, L * 0.45, 0, L); g.quadraticCurveTo(-W, L * 0.45, 0, 0); g.fill();
        g.restore();
      }
    }
    g.restore();
    saigner(g);                                                  // (lot L8 : la couleur sous l'alpha nul, voir saigner)
  }, [1, 1], true, 8);
}

// ---------------------------------------------------------------------
//  LE PIN PARASOL (photos 41 et 42, recalées ; photos du 26/09 prises sous lui, au coin de la cage)
// ---------------------------------------------------------------------
// LE TRONC, triangulé sur trois photos (la 42 depuis le terrain 1, et 185625 / 185626 depuis le banc blanc,
// dont les poses sont résolues à moins de 10 px) : il est à 2,7 m derrière le grillage, en (-7,3 ; 11,9) sur
// place — PAS en (-10,5 ; 15,5) — et vu du banc il se tient juste derrière le montant de la cage côté mur ; on
// le décale donc de 0,8 m vers le mur avec la cage (-8,1 ; 12,0). Un gros fût gris-brun de 0,9 m de diamètre
// à hauteur d'homme, qui FOURCHE vers 5 m en une dizaine de charpentières : la longue branche basse vers le quai
// (à 4,3 m, derrière le grillage, jusque derrière D2), une qui monte par-dessus la caméra de diffusion vers le
// plateau, deux vers le mur, une qui contourne la boîte côté mur, deux vers le quai et l'arrière, la flèche.
// Et la couronne : un DÔME ÉPAIS de pompons bleu-vert, de 5,5 m (franges jusqu'à 4-5 m) à 14,3 m, de x = -0,8
// à -20,6, point haut vers x = -7. On la construit en COUSSINS (ellipsoïdes aplatis) garnis de croix de
// pompons : coudre() part du centre de chaque coussin, d'où le dessus clair et le dessous sombre « en nuages »
// de la photo 42. Les cartes enfouies dans un coussin voisin ne sont pas posées (on ne les verrait pas).
// VU DE DESSOUS (photos du 26/09) le pin est presque NOIR : #1a1e24 à #363c42 à l'écran, découpé sur un ciel
// blanc, et ses aiguilles s'allument en or là où le soleil couchant passe au travers — voir materiauFeuilles
// (`dessous`, `contreJour`).
// LA BOÎTE DE LA CAMÉRA DE DIFFUSION : x de -13,5 à -2,5, y de 4,5 à 10,5, z < 9,4 (repère du terrain 1).
// Ni aiguille ni branche n'y entre, pour 'parc' comme pour 'parc2' : au-dessus du plateau, le pin ne déborde
// que plus haut que 10,5 m, ou côté mur (x < -13,5) au-dessus du coin du terrain 2 ; au-dessus du coin de la
// cage, ses branches basses restent derrière le grillage (z > 9,4).
function pinParasol(scene, K, cx) {
  const DX = cx(0);
  const boiteCamera = (b, m) => b.max.x - DX > -13.5 - m && b.min.x - DX < -2.5 + m && b.max.y > 4.5 - m && b.min.y < 10.5 + m && b.min.z < 9.4 + m;
  // et au-dessus des deux terrains, rien sous 6 m : le débord ne descend pas dans la trajectoire des tirs
  const surTerrain = (b) => b.min.z < 9.1 && b.min.y < 6.0 && [0, -16.1].some((xa) => b.max.x - DX > xa - 5.5 && b.min.x - DX < xa + 5.5);
  const V = THREE.Vector3, P = (x, y, z) => new V(cx(x), y, z);
  const b0 = new THREE.Box3();
  const libre = (pts, m) => pts.every((p) => !boiteCamera(b0.setFromPoints([p]), m));
  // ---- le bois : fût, charpentières, branches secondaires, cousus en un maillage ----
  const bois = [];
  const TX = -8.1, TZ = 12.0, yPied = hauteurTalusPin(TZ) - 0.3;
  // l'empattement, le fût (Ø 0,90 m à 2,4 m de haut sur les photos 185625 et 185626), la fourche vers 5 m. Le fût
  // est RUGUEUX (voir rugueux : son contour n'est plus un cylindre lisse) et le bois s'assombrit en montant
  // (teinteTube : le fût un peu plus clair en bas ; les bras restent gris-brun, plus clairs que les aiguilles comme sur
  // les photos prises sous le pin — luminance 68 pour 43 sur 185625 —, noirs seulement en silhouette sur le ciel)
  bois.push(teinteTube(rugueux(tubeEffile([P(TX, yPied - 0.15, TZ), P(TX, yPied + 0.35, TZ), P(TX - 0.02, yPied + 0.95, TZ - 0.02)], 0.64, 0.47, 6, 48), 0.1), 1.2, 1.2));
  bois.push(teinteTube(rugueux(tubeEffile([P(TX - 0.02, yPied + 0.85, TZ - 0.02), P(TX - 0.07, 2.8, TZ - 0.05), P(TX - 0.16, 4.1, TZ - 0.12), P(-8.35, 5.2, 11.8)], 0.46, 0.37, 24, 48), 0.08), 1.2, 1.0));
  // et la FOURCHE : le fût ne s'arrête pas en coupe plate à 5,2 m (vu du banc, une souche d'où sortaient les bras) ;
  // il s'effile en cône jusque vers 6,5 m, un peu plus large que lui à la jonction (qui disparaît dedans)
  bois.push(teinteTube(rugueux(tubeEffile([P(-8.35, 4.9, 11.8), P(-8.33, 5.7, 11.85), P(-8.3, 6.5, 11.9)], 0.44, 0.1, 8, 24), 0.06), 1.0, 0.95));
  const F = [-8.35, 5.0, 11.82], charps = [];
  const CHARP = [
    // la longue branche basse vers le quai, à 4,3 m derrière le grillage, qui finit derrière D2
    [F, [-6.9, 4.75, 11.55], [-5.2, 4.45, 11.4], [-3.6, 4.25, 11.35], [-2.3, 4.3, 11.5]],
    // celle qui monte vers le plateau, assez raide pour passer au-dessus de la boîte (y > 10,8 dès z < 9,7)
    [[-8.3, 5.6, 11.85], [-7.7, 7.3, 11.05], [-7.0, 9.4, 10.3], [-6.3, 11.2, 9.65], [-5.6, 12.2, 9.0]],
    // deux vers le mur, l'une au-dessus du talus
    [[-8.35, 5.5, 11.9], [-10.2, 6.4, 12.3], [-12.4, 7.4, 12.6], [-14.6, 8.2, 12.5], [-16.6, 8.8, 12.3]],
    [F, [-10.0, 5.4, 13.4], [-12.2, 6.4, 14.8], [-14.8, 7.3, 15.8], [-17.4, 8.0, 16.4]],
    // celle qui contourne la boîte côté mur et déborde au-dessus du coin du terrain 2, haut
    [[-8.3, 5.2, 11.8], [-10.3, 5.9, 11.1], [-12.6, 6.6, 10.4], [-14.3, 7.2, 9.6], [-15.3, 7.8, 8.7]],
    // vers le quai en montant (l'épaule du dôme derrière D2), vers le quai et l'arrière
    [[-8.3, 5.3, 11.85], [-7.0, 6.3, 12.2], [-5.4, 7.5, 12.4], [-3.8, 8.7, 12.6], [-2.6, 9.7, 12.5]],
    [F, [-6.8, 5.7, 13.1], [-5.0, 6.7, 14.1], [-3.4, 7.9, 14.6]],
    // vers l'arrière, et la flèche qui porte le point haut du dôme
    [[-8.3, 6.0, 12.1], [-8.6, 7.4, 13.8], [-8.9, 9.0, 16.0], [-8.7, 10.3, 18.2]],
    [[-8.3, 5.9, 11.95], [-8.0, 8.4, 12.3], [-7.6, 10.4, 12.7], [-7.1, 12.0, 13.1]],
  ];
  for (const [i, c] of CHARP.entries()) {
    // un peu de hasard dans le tracé ; s'il fait entrer la branche dans la boîte, on garde le tracé relevé
    let pts = c.map(([x, y, z], k) => P(x + (k ? rnd(-0.15, 0.15) : 0), y + (k ? rnd(-0.1, 0.1) : 0), z + (k ? rnd(-0.1, 0.1) : 0)));
    if (!libre(new THREE.CatmullRomCurve3(pts).getSpacedPoints(30), 0.3)) pts = c.map(([x, y, z]) => P(x, y, z));
    bois.push(teinteTube(tubeEffile(pts, i === 0 ? 0.21 : rnd(0.16, 0.21), 0.05, 12, 8), 1.1, 0.95));
    // les branches secondaires, noires sur le ciel vues du banc (photos 185625 et 185626 : un parapluie de
    // rameaux) : elles partent de la charpentière vers l'extérieur et montent se perdre dans les coussins, et
    // chacune porte deux rameaux plus fins. Quatre par charpentière, sur ses six premiers dixièmes seulement :
    // neuf, jusqu'au bout, sortaient au-dessus et autour du dôme en bois de cerf (photo 42 : le dôme est continu,
    // on ne voit du bois qu'en dessous)
    const courbe = new THREE.CatmullRomCurve3(pts), tg = new V(); charps.push(courbe);
    for (let k = 0; k < 4; k++) {
      const t = rnd(0.2, 0.6), d = courbe.getPointAt(t);
      courbe.getTangentAt(t, tg);
      const cote = k % 2 ? 1 : -1, ang = Math.atan2(tg.z, tg.x) + cote * rnd(0.4, 1.0), l = rnd(1.2, 2.6);
      const f = new V(d.x + Math.cos(ang) * l, d.y + l * rnd(0.3, 0.7), d.z + Math.sin(ang) * l);
      const m = new V((d.x + f.x) / 2, (d.y + f.y) / 2 - 0.12, (d.z + f.z) / 2);
      // (le long de la courbe, pas seulement aux trois points : une branche droite coupait le coin de la boîte ;
      // et au-dessus des terrains, pas de bois sous 6 m, comme pour les aiguilles)
      const brin = new THREE.CatmullRomCurve3([d, m, f]).getPoints(8);
      if (!libre(brin, 0.2) || surTerrain(b0.setFromPoints(brin))) continue;
      bois.push(teinteTube(tubeEffile([d, m, f], 0.075 * (1.1 - t * 0.5), 0.018, 4, 5), 1.0, 0.9));
      for (let j = 0; j < 2; j++) {
        const u = rnd(0.35, 0.85), a0 = new V().lerpVectors(d, f, u), b2 = ang + (j ? 1 : -1) * rnd(0.5, 1.1), l2 = rnd(0.6, 1.2);
        const e = new V(a0.x + Math.cos(b2) * l2, a0.y + l2 * rnd(0.2, 0.6), a0.z + Math.sin(b2) * l2);
        const r3 = [a0, new V().lerpVectors(a0, e, 0.5), e];
        if (libre(r3, 0.2) && !surTerrain(b0.setFromPoints(r3))) bois.push(teinteTube(tubeEffile([a0, e], 0.028, 0.008, 2, 4), 0.9, 0.9));
      }
    }
  }
  // LES BRAS (photos 185625 et 185626, prises sous le pin : au-dessus de la fourche, le fût ÉCLATE en bras de 10 à
  // 25 cm qui montent raides, puis s'étalent sous le dôme ; gris-brun, plus clairs que les aiguilles, noirs seulement
  // en silhouette sur le ciel). Les neuf charpentières n'en donnaient pas l'idée : on en ajoute DIX, la moitié partie
  // du haut du fût (4,4 à 5,6 m), l'autre greffée au départ d'une charpentière et qui s'en écarte. COURTS (2,2 à 3,6 m)
  // et RAIDES : ils restent dans les aiguilles. Vingt-deux bras de 3 à 6 m, plus couchés, crevaient le dôme et se
  // lisaient, vus du terrain (photo 42), comme des bois de cerf clairs au-dessus des coussins. (Le modèle 3D
  // « Umbrella Pine », essayé à la place de ce pin, n'en a que huit, épais et tortueux : il ressemblait moins aux
  // photos.) Un bras qui entrerait dans la boîte de la caméra, ou descendrait sous 6 m au-dessus d'un terrain, est
  // redressé (plus raide, plus court) jusqu'à passer, sinon abandonné.
  for (let k = 0; k < 10; k++) {
    let az = (k + rnd(-0.4, 0.4)) / 10 * 6.283, d;
    if (k % 2 && charps.length) {
      const c = charps[Math.floor(Math.random() * charps.length)], t = rnd(0.08, 0.4), tg = c.getTangentAt(t);
      d = c.getPointAt(t); az = Math.atan2(tg.z, tg.x) + rnd(-0.9, 0.9);
    } else d = P(-8.3 + Math.cos(az) * 0.18, rnd(4.4, 5.6), 11.9 + Math.sin(az) * 0.18);
    let L = rnd(2.2, 3.6), el = rnd(0.7, 1.1), pts = null;
    for (let essai = 0; essai < 5 && !pts; essai++, el = Math.min(1.3, el + 0.22), L *= 0.85) {
      // raide en quittant le fût (le premier tiers), puis il s'étale
      const e1 = Math.min(1.45, el + 0.45);
      const p1 = d.clone().add(new V(Math.cos(e1) * Math.cos(az), Math.sin(e1), Math.cos(e1) * Math.sin(az)).multiplyScalar(L * 0.35));
      const f = p1.clone().add(new V(Math.cos(el) * Math.cos(az), Math.sin(el) * 0.8, Math.cos(el) * Math.sin(az)).multiplyScalar(L * 0.65));
      const m = new V().lerpVectors(p1, f, 0.5); m.y += L * 0.05;
      const brin = new THREE.CatmullRomCurve3([d, p1, m, f]).getPoints(16);
      if (libre(brin, 0.3) && !surTerrain(b0.setFromPoints(brin))) pts = [d, p1, m, f];
    }
    if (!pts) continue;
    bois.push(teinteTube(tubeEffile(pts, rnd(0.07, 0.12), 0.025, 10, 6), 1.05, 0.9));
    // et au bout, deux ou trois rameaux qui s'écartent
    for (let j = 0; j < 3; j++) {
      const a2 = az + rnd(-1.2, 1.2), l2 = rnd(0.8, 1.6), a0 = new V().lerpVectors(pts[2], pts[3], rnd(0.3, 1));
      const e = new V(a0.x + Math.cos(a2) * l2, a0.y + rnd(0.1, 0.6), a0.z + Math.sin(a2) * l2);
      const r3 = [a0, new V().lerpVectors(a0, e, 0.5), e];
      if (libre(r3, 0.2) && !surTerrain(b0.setFromPoints(r3))) bois.push(teinteTube(tubeEffile([a0, e], 0.035, 0.01, 2, 4), 0.9, 0.9));
    }
  }
  // AU-DESSUS DE 6 M, le bois se découpe sur le ciel ou sur le dessous sombre du dôme : vu du terrain (photos 42 et
  // 600), c'est une silhouette presque noire, pas le gris-brun clair du bas. La teinte des tubes y perd 0,45 — celle
  // des bras passe de 1,05 / 0,9 à 0,6 / 0,45 —, en fondu de 5,6 à 6,4 m. Le fût et la branche basse (4,3 m) gardent
  // le gris-brun que montrent les photos prises sous le pin.
  for (const g of bois) {
    const p = g.attributes.position, c = g.attributes.color;
    for (let k = 0; k < p.count; k++) {
      const d = 0.45 * THREE.MathUtils.smoothstep(p.getY(k), 5.6, 6.4);
      c.setXYZ(k, c.getX(k) - d, c.getY(k) - d, c.getZ(k) - d);
    }
  }
  // (vertexColors : la teinte de teinteTube multiplie l'écorce ; le fond d'émission, lui, reste le même partout)
  const ecorce = new THREE.MeshStandardMaterial({ map: ecorcePin(K.canvasTex), roughness: 0.95, emissive: 0x2a2520, vertexColors: true });
  // la vraie écorce de pin (tex/ecorce_pin : plaques brun-rouge et fissures grises), à son arrivée ; une tuile
  // fait un demi-tour de fût sur 1,5 m de long
  // `melange` : la couleur reste celle d'ecorcePin, grisée d'après les photos du 26/09 ; la photo (brun-rouge)
  // n'apporte que son grain, son relief et sa rugosité, comme pour le platane
  ecorceReelle(ecorce, 'ecorce_pin', [2, 1], { normale: 1.5, melange: 0.8 });
  const troncs = new THREE.Mesh(mergeGeometries(bois), ecorce);
  // pas d'ombre reçue, et un fond d'émission : vues d'en dessous, à contre-jour et sous un dôme aussi dense,
  // les charpentières sortaient NOIRES, alors que la photo 42 les montre gris-brun (#444440 à #5a4c40)
  troncs.castShadow = true; troncs.receiveShadow = false; scene.add(troncs);

  // ---- la couronne ----
  const COUSSINS = [
    // [x, y, z, rx, ry, rz, croix] — le dessus, éclairé : le point haut vers x = -7, l'épaule côté quai
    // derrière D2, l'épaule côté mur, l'arrière, et le débord HAUT au-dessus du plateau (au-dessus de 10,5 m)
    [-7.0, 11.9, 13.4, 4.4, 2.3, 3.8, 95], [-11.8, 11.4, 15.4, 4.4, 2.3, 4.0, 90], [-3.4, 10.9, 12.8, 2.6, 1.8, 2.8, 48],
    [-15.5, 11.6, 12.4, 3.8, 2.0, 2.8, 60],
    [-16.2, 10.4, 15.8, 3.6, 1.8, 3.6, 54], [-8.6, 11.0, 18.6, 3.8, 1.7, 2.6, 44], [-8.5, 12.0, 10.2, 3.8, 1.3, 2.2, 38],
    // le CŒUR du dôme, vers 9,5 m, entre le dessus et le dessous : sans lui on voyait le jour entre les deux étages
    // (photos 42 et 600 : un dôme continu, d'un seul tenant, où les bras disparaissent). Au-dessus de la boîte de la
    // caméra seulement par l'arrière (z ≥ 9,6)
    [-5.0, 9.6, 11.8, 2.6, 1.4, 2.2, 40], [-11.0, 9.8, 12.2, 2.8, 1.4, 2.4, 40], [-8.0, 9.4, 14.6, 3.0, 1.4, 2.6, 40],
    // le dessous, sombre : au-dessus de la fourche, côté plateau derrière le grillage (deux coussins, qui
    // descendent vers 6 m au-dessus de la cage), au bout de la branche basse, le débord au-dessus du plateau
    // entre la cage et D4, le bout côté mur, l'arrière
    [-9.0, 7.6, 12.9, 3.2, 1.5, 2.6, 46], [-6.4, 7.3, 11.4, 2.6, 1.3, 1.9, 34], [-3.4, 6.2, 11.9, 1.9, 1.0, 1.4, 22],
    [-10.6, 7.0, 10.7, 2.4, 1.1, 1.2, 26],
    [-15.0, 8.4, 9.9, 1.6, 1.2, 2.0, 22], [-18.4, 8.6, 15.4, 2.2, 1.3, 2.8, 26], [-12.6, 8.8, 18.2, 2.6, 1.3, 2.4, 26],
    // les branches basses au-dessus du coin de la cage, derrière le grillage (photos 185625 et 185626)
    [-7.2, 5.9, 11.0, 2.0, 0.8, 1.1, 20],
  ].map(([x, y, z, rx, ry, rz, n]) => ({ x: cx(x), y, z, rx, ry, rz, n }));
  const enfoui = (p, k0) => COUSSINS.some((c, k) => k !== k0 &&
    ((p.x - c.x) / c.rx) ** 2 + ((p.y - c.y) / c.ry) ** 2 + ((p.z - c.z) / c.rz) ** 2 < 0.6);
  const touffes = [], infos = [], o = new THREE.Object3D(), plan = new THREE.PlaneGeometry(1, 1), p = new V();
  let info = null;
  // L'ÉCLAIRCIE : au cœur du dôme, au-dessus de la fourche, presque pas d'aiguilles — le pin les porte au bout de ses
  // bras (photos 185625 et 185626 : vu du banc, on voit le fût éclater en bras sur le jour ; le modèle « Umbrella
  // Pine » est fait de même). Sous 8 m, une touffe à moins de 1,3 m de l'axe du fût n'est pas posée, et de moins en
  // moins jusqu'à 2,6 m (tirage lié à la position : il ne décale pas les autres tirages du décor).
  const xF = cx(-8.3), zF = 11.85;
  const poser = (px, py, pz, rx, ry, rz, sx, sy) => {
    if (py < 8 && alea(px, pz, 7) > THREE.MathUtils.smoothstep(Math.hypot(px - xF, pz - zF), 1.3, 2.6)) return;
    o.position.set(px, py, pz); o.rotation.set(rx, ry, rz, 'YXZ'); o.scale.set(sx, sy, 1); o.updateMatrix();
    const g = plan.clone().applyMatrix4(o.matrix);
    g.computeBoundingBox();
    if (boiteCamera(g.boundingBox, 0.15) || surTerrain(g.boundingBox)) return;
    touffes.push(g); infos.push(info);
  };
  for (const [k, c] of COUSSINS.entries()) {
    const R = Math.max(c.rx, c.ry, c.rz);
    for (let i = 0, essais = 0; i < c.n && essais < c.n * 6; essais++) {
      const u = Math.random() * 6.283, cv = rnd(-1, 1), sv = Math.sqrt(1 - cv * cv);
      const rr = Math.random() < 0.85 ? rnd(0.8, 1.02) : rnd(0.3, 0.8);
      p.set(c.x + Math.cos(u) * sv * c.rx * rr, c.y + cv * c.ry * rr, c.z + Math.sin(u) * sv * c.rz * rr);
      if (rr > 0.5 && enfoui(p, k)) continue;
      i++;
      info = { c: [c.x, c.y, c.z], r: R, t: rnd(0.86, 1.12) };
      // une croix : un plan à plat (vu du dessous) et deux debout, qui se lisent sous tous les angles
      const s = rnd(1.6, 2.4), yaw = Math.random() * Math.PI;
      poser(p.x, p.y, p.z, -Math.PI / 2 + rnd(-0.25, 0.25), yaw, rnd(0, 6.283), s, s);
      poser(p.x, p.y + 0.1, p.z, rnd(-0.2, 0.2), yaw, 0, s, s * 0.62);
      poser(p.x, p.y + 0.1, p.z, rnd(-0.2, 0.2), yaw + Math.PI / 2, 0, s, s * 0.62);
    }
  }
  // les FRANGES : des rameaux qui pendent de 0,4 à 1 m sous les coussins du dessous, surtout côté plateau
  // (les dix premiers sont le dessus et le cœur du dôme)
  const BAS = COUSSINS.slice(10);
  for (let i = 0; i < 64; i++) {
    const c = BAS[i % BAS.length], a = Math.random() < 0.7 ? rnd(Math.PI, 2 * Math.PI) : rnd(0, Math.PI);
    const rr = Math.sqrt(Math.random()) * 0.85;
    info = { c: [c.x, c.y, c.z], r: Math.max(c.rx, c.ry, c.rz), t: rnd(0.85, 1.05) };
    const s = rnd(0.8, 1.4);
    poser(c.x + Math.cos(a) * c.rx * rr, c.y - c.ry * Math.sqrt(1 - rr * rr) * 0.9 - rnd(0.4, 1.0), c.z + Math.sin(a) * c.rz * rr,
      rnd(-0.15, 0.15), Math.random() * Math.PI, 0, s * 0.8, s * 1.35);
  }
  const mat = materiauFeuilles(aiguillesTexture(K.canvasTex), { trans: 0.36, rugosite: 0.85, alpha: 0.4, dessous: DOME_PIN.dessous, contreJour: true });
  // LE DÔME SOMBRE : vu du terrain (pose de la photo 42), il sortait 14 % trop clair et trop vert (médiane #53635e à
  // l'écran pour #4c5457 sur la photo) ; vu d'en dessous (185625), un peu trop noir (luminance 41 pour 54) — d'où un
  // filtre gris bleuté sur l'albédo, et un dessous un peu moins éteint
  mat.color.setRGB(...DOME_PIN.filtre);
  const couronne = new THREE.Mesh(coudre(touffes, infos), mat);
  // le contre-jour s'éteint quand le ciel se couvre (voile couvert du ciel photographique) ou qu'il pleut
  couronne.onBeforeRender = () => {
    const ciel = scene.userData.ciel, couvert = ciel && ciel.couvert ? ciel.couvert.material.opacity : 0;
    CONTRE_JOUR.value = 0.22 * (1 - couvert) * (1 - (scene.userData.wet || 0));
  };
  // Elle PORTE son ombre mais ne la REÇOIT pas : une couronne aussi dense s'ombrait elle-même de part en part
  // et rendait noire, une silhouette découpée dans le ciel.
  couronne.castShadow = true; couronne.receiveShadow = false; couronne.customDepthMaterial = mat.userData.ombre;
  scene.add(couronne); declarerFeuillage(scene, couronne);
}

// LES POMPONS D'AIGUILLES du pin parasol (photo 42, recadrée) : une carte = un bout de rameau, une touffe
// arrondie d'une cinquantaine de pompons de 25 à 35 cm. Sous chaque pompon, une pastille pleine #2c3a33 :
// sans elle on voyait le jour au cœur des pompons et le dôme tournait à la dentelle. Puis 45 aiguilles
// rayonnantes, fines et un peu arquées vers le bas. GRIS BLEU-VERT (b ≥ r), jamais le vert-jaune d'un
// feuillu : à l'écran la photo donne #3f4548 / #535d5b / #75887c ; en albédo, quatre teintes de #445450 à
// #a8bab0 (25 / 45 / 22 / 8 %), calées par des rendus depuis la pose de la photo 42.
function aiguillesTexture(canvasTex) {
  const cuite = texCuite(aiguillesTexture, arguments, [saigner]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const T = [[0.25, [68, 84, 80]], [0.45, [100, 120, 114]], [0.22, [136, 156, 148]], [0.08, [168, 186, 176]]];
    const pioche = () => { let r = Math.random(); for (const [p, c] of T) { if ((r -= p) <= 0) return c; } return T[1][1]; };
    const pompons = [];
    for (let i = 0; i < 56; i++) {
      const a = Math.random() * 6.283, r = 0.37 * w * Math.sqrt(Math.random());
      pompons.push([w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r * 0.9, rnd(32, 46)]);
    }
    pompons.sort((a, b) => a[1] - b[1]);
    // les rameaux qui portent les pompons, du cœur de la carte vers chacun d'eux
    g.lineCap = 'round'; g.strokeStyle = 'rgba(72,68,58,0.85)';
    for (const [x, y] of pompons) { g.lineWidth = rnd(2, 3.5); g.beginPath(); g.moveTo(w / 2, h / 2); g.quadraticCurveTo((x + w / 2) / 2, (y + h / 2) / 2 + 12, x, y); g.stroke(); }
    for (const [x, y, R] of pompons) {
      const k = rnd(0.85, 1.12) * (y < h / 2 ? 1.05 : 0.96);
      g.fillStyle = '#4a5c55'; g.beginPath(); g.arc(x, y, R * 0.35, 0, 6.283); g.fill();
      for (let i = 0; i < 55; i++) {
        const a = Math.random() * 6.283, l = rnd(0.72, 1.0) * R, r0 = R * 0.08;
        const c = pioche();
        g.strokeStyle = `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
        g.lineWidth = rnd(1.2, 2.0);
        const x0 = x + Math.cos(a) * r0, y0 = y + Math.sin(a) * r0, x1 = x + Math.cos(a) * l, y1 = y + Math.sin(a) * l;
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + l * 0.12, x1, y1 + l * 0.08); g.stroke();
      }
    }
    saigner(g);                                                  // (lot L8 : la couleur sous l'alpha nul, voir saigner)
  }, [1, 1], true, 8);
}

// Le dôme du pin : filtre sur l'albédo des aiguilles (r, v, b) et facteur `dessous` de materiauFeuilles
const DOME_PIN = { filtre: [0.86, 0.8, 0.9], dessous: 0.26 };

// L'ÉCORCE RUGUEUSE du fût (photos 185625 et 185626) : de grosses plaques séparées de fissures profondes, qui
// découpent le contour du tronc. On creuse chaque anneau du tube (tubeEffile) de sept fissures profondes et onze plus
// légères, qui dérivent le long du fût, recoupées de fentes en travers ; `amp` : profondeur relative des fissures.
// (Les fréquences sont entières : le contour se referme sans marche sur la couture du tube.)
function rugueux(g, amp) {
  const nL = g.parameters.tubularSegments, nR = g.parameters.radialSegments, p = g.attributes.position;
  const ph = [rnd(0, 6.283), rnd(0, 6.283), rnd(0, 6.283)];
  const fissure = (s, n) => Math.pow(1 - Math.abs(s), n);
  for (let i = 0; i <= nL; i++) {
    let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < nR; j++) { const k = i * (nR + 1) + j; cx += p.getX(k) / nR; cy += p.getY(k) / nR; cz += p.getZ(k) / nR; }
    for (let j = 0; j <= nR; j++) {
      const k = i * (nR + 1) + j, a = (j % nR) / nR * 6.283, y = p.getY(k);
      const f7 = fissure(Math.sin(3.5 * a + 0.9 * Math.sin(0.8 * y + ph[0])), 2.5);
      const f11 = fissure(Math.sin(5.5 * a + 1.3 * Math.sin(1.1 * y + ph[1])), 1.5);
      const fT = fissure(Math.sin(2.6 * y + 2 * Math.sin(3 * a + ph[2])), 2);
      const r = 1 - amp * (f7 + 0.45 * f11 + 0.3 * fT) + amp * 0.2 * Math.sin(2 * a + 1.7 * y + ph[2]);
      p.setXYZ(k, cx + (p.getX(k) - cx) * r, cy + (p.getY(k) - cy) * r, cz + (p.getZ(k) - cz) * r);
    }
  }
  g.computeVertexNormals();
  // la couture : les deux sommets confondus prennent la même normale (sinon un trait d'ombre court le long du fût)
  const n = g.attributes.normal;
  for (let i = 0; i <= nL; i++) {
    const k0 = i * (nR + 1), k1 = k0 + nR;
    const x = n.getX(k0) + n.getX(k1), y = n.getY(k0) + n.getY(k1), z = n.getZ(k0) + n.getZ(k1), l = Math.hypot(x, y, z) || 1;
    n.setXYZ(k0, x / l, y / l, z / l); n.setXYZ(k1, x / l, y / l, z / l);
  }
  return g;
}
// La teinte du bois le long d'un tube (couleur de sommet, qui multiplie l'écorce) : v0 au départ, v1 au bout
function teinteTube(g, v0, v1) {
  const nL = g.parameters.tubularSegments, nR = g.parameters.radialSegments, N = g.attributes.position.count;
  const c = new Float32Array(N * 3);
  for (let k = 0; k < N; k++) { const v = v0 + (v1 - v0) * Math.floor(k / (nR + 1)) / nL; c[k * 3] = c[k * 3 + 1] = c[k * 3 + 2] = v; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

// Écorce du pin parasol : brun-rouge sombre (#4a3f36), en PLAQUES allongées séparées par des fissures
// presque noires. Une tuile = 1,5 m de fût (voir tubeEffile) sur UN TOUR ENTIER (2,8 m au pied) : d'où 512 x 256,
// des pixels presque carrés. En 128 x 256, les plaques sortaient couchées (étirées 4 fois en largeur) et leurs
// interstices faisaient de grandes taches sombres en travers du fût. Plaques éclaircies et grisées d'après les
// photos du 26/09, prises sous le pin.
function ecorcePin(canvasTex) {
  const cuite = texCuite(ecorcePin, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#433b36'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 460; i++) {
      const cx = Math.random() * w, cy = Math.random() * h, rx = rnd(8, 18), ry = rnd(14, 34);
      g.fillStyle = ['#7a7068', '#86796c', '#6e665e', '#90847a', '#7c756e'][i % 5];
      g.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2, rr = rnd(0.75, 1.05);
        const px = cx + Math.cos(a) * rx * rr, py = cy + Math.sin(a) * ry * rr;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.fill();
    }
    for (let i = 0; i < 6000; i++) {
      const v = rnd(0.7, 1.3); g.fillStyle = `rgba(${(90 * v) | 0},${(74 * v) | 0},${(62 * v) | 0},${rnd(0.1, 0.35)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), rnd(1, 4));
    }
  }, [1, 1], false, 4);
}

// =====================================================================
//  LA TERRE DU COIN DE LA CAGE (photos du 26/09, 18 h 56)
// =====================================================================
// Autour de la cage et des bancs, pas d'enrobé : une terre rouge-brun tassée, sablée de clair, sous un feutre
// d'aiguilles de pin rousses (en touffes et en traînées), avec des brindilles, des mégots, des capsules et des
// bouts de papier ou de plastique. Mesuré sur les photos recalées 185623 et 185625 (poses résolues sur la cage,
// le mât et le panier D2, à moins de 10 px près) : la terre couvre tout le devant des bancs, descend jusqu'à
// z = 7,4 à x = -5,4 et 7,85 à x = -4, puis ne fait plus qu'une lisière le long du grillage devant D2 — le
// profil de profilPin, relevé sur la photo 42, s'en trouve confirmé. On le recouvre de près d'un plan au bord
// NATUREL (dentelé, mité : l'enrobé reparaît par plaques), à la couleur dessinée en tuile de 2 m, qui reçoit le
// détail photo « terre » de js/court.js (relief, rugosité, grain). Médianes à l'écran sur les photos (à l'ombre) :
// #785e52, soit 0,88 / 0,74 / 0,67 de l'enrobé voisin. L'albédo #8e6e66 en sortait à 1,07 / 0,88 / 0,77 : une terre
// ROSE, plus claire que l'enrobé (rendus rp_341, rp_185623). Il passe à #6a5a52, brun-rouge grisâtre, sous un feutre
// d'aiguilles rousses éparses (photos 185623, 185626, 1000051341 et 342 : peu de touffes, des aiguilles partout).
// (Mesuré le 28/09 devant la cage, préréglage haute, œil adapté, contre l'enrobé repris : #74594f et ses aiguilles
// donnaient encore 1,01 / 0,79 / 0,70, trop rouge ; toutes les couleurs de la tuile ont été reprises d'un facteur
// 0,92 / 1,0 / 1,03, pour viser les 0,88 / 0,75 / 0,68 des photos.)
// (30/09, lot L4 : le plan va jusqu'au pied du mur, x0 = -23,55. Au-delà de -13,4, la bande de terre d'un mètre qui
// longe le grillage jusqu'au mur — profilPin — n'était faite que des taches brunes du calque des bords, floues à 4 cm
// par pixel : le « halo » brun du bord gauche de la caméra TV sur le terrain 2. Le calque n'y met plus qu'un voile
// de poussière ; la terre elle-même est celle-ci, à 256 px par mètre, au bord dentelé.)
const COIN = { x0: -23.55, x1: -1.6, z0: 5.9 };          // emprise du plan (repère du terrain 1) ; il va jusqu'au grillage
const LEGER = TELEPHONE;   // js/appareil.js : la même détection pour tout le jeu (et `?tel=1`)
function terreCoin(scene, K, cx, ZO, profil) {
  const LX = COIN.x1 - COIN.x0, LZ = ZO - COIN.z0, PXM = 40, W = Math.round(LX * PXM), H = Math.round(LZ * PXM);
  // (les deux toiles du coin, le masque et la couleur, sont des textures cuites : voir js/tex_cuites.js. Le masque est
  // cuit avec ses bruits et ses plaques, tirés au même hasard fixé que son dessin, d'où la fonction qui les englobe)
  const masque = texCuiteAppel('terreCoinMasque', [W, H, LZ], [terreCoin, profil, cx, COIN, ESCALIER], () => {
  // bruits de valeur lissés (bord, plaques)
  const lisse = (t) => t * t * (3 - 2 * t);
  const g1 = Float32Array.from({ length: 64 }, Math.random), g2 = Float32Array.from({ length: 128 }, Math.random);
  const b1 = (g, t) => { const i = Math.floor(t), f = t - i, n = g.length, a = g[((i % n) + n) % n], b = g[(((i + 1) % n) + n) % n]; return a + (b - a) * lisse(f); };
  const NX = Math.ceil(LX / 0.28) + 2, NZ = Math.ceil(LZ / 0.28) + 2, g3 = Float32Array.from({ length: NX * NZ }, Math.random);
  const b2 = (x, z) => {
    const u = x / 0.28, v = z / 0.28, i = Math.floor(u), j = Math.floor(v), fu = lisse(u - i), fv = lisse(v - j);
    const q = (a, b) => g3[Math.min(NZ - 1, b) * NX + Math.min(NX - 1, a)];
    return (q(i, j) * (1 - fu) + q(i + 1, j) * fu) * (1 - fv) + (q(i, j + 1) * (1 - fu) + q(i + 1, j + 1) * fu) * fv;
  };
  // LE MASQUE : blanc = terre. Largeur de profilPin, un peu élargie (le calque des bords, plus flou, reste dessous),
  // dentelée à deux échelles (0,7 et 0,25 m) ; une frange de 0,55 m où la terre se mite par plaques ; fondu aux deux
  // bouts (sur 0,9 m côté quai, sur 25 cm contre le mur : la terre va jusqu'à sa pierre).
  // Et douze PLAQUES DE TERRE TASSÉE, là où l'on piétine devant les bancs et la cage (surtout entre x = -10 et -5) :
  // l'enrobé y reparaît sous un voile de terre (le masque y perd jusqu'à 45 %, en dégradé radial : c'est le gris de
  // l'enrobé lui-même, #6a6866, qui fait le voile gris d'environ (104, 100, 100) de ces plaques). Rayon 0,2 à 0,45 m.
  const plaques = [];
  for (let i = 0; i < 12; i++) {
    const x1 = i < 9 ? rnd(-10, -5) : rnd(COIN.x0 + 1.2, COIN.x1 - 0.8);
    plaques.push([x1, rnd(0.25, Math.max(0.3, profil(cx(x1)) - 0.35)), rnd(0.2, 0.45)]);
  }
  const masque = K.canvasTex(W, H, (c) => {
    const img = c.createImageData(W, H), d = img.data;
    for (let i = 0; i < W; i++) {
      const x1 = COIN.x0 + (i + 0.5) / PXM;
      const larg = profil(cx(x1)) * 1.06 + (b1(g1, x1 / 0.7) - 0.5) * 0.34 + (b1(g2, x1 / 0.25) - 0.5) * 0.14;
      // (07/10, photo 20261007_184901 : devant l'escalier du bout du mur, c'est l'enrobé, jusqu'à la première marche ; la
      // terre et ses feuilles reprennent au pied de la haie, passé le grand mât — fondu sur 35 cm après le limon)
      const bout = lisse(Math.min(1, Math.max(0, (x1 - ESCALIER.xL[1] - 0.05) / 0.35))) * lisse(Math.min(1, Math.max(0, (COIN.x1 - x1) / 0.9)));
      for (let j = 0; j < H; j++) {
        const dz = LZ - (j + 0.5) / PXM;                   // distance au grillage
        const t = Math.min(1, Math.max(0, (dz - larg + 0.3) / 0.55));
        const p = b2(x1 - COIN.x0, (j + 0.5) / PXM);
        const a = Math.min(1, Math.max(0, 1 - t + (p - 0.5) * 2.2 * Math.min(t, 1 - t))) * bout;
        let tasse = 0;
        for (const [px, pz, r] of plaques) {
          const e = Math.hypot(x1 - px, dz - pz);
          if (e < r) tasse = Math.max(tasse, 0.45 * (1 - e / r));
        }
        const k = (j * W + i) * 4, v = Math.round(lisse(a) * (1 - tasse) * 255);
        d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
  }, null, false, 4);
  masque.colorSpace = THREE.NoColorSpace;
  return masque;
  });
  // LA COULEUR, une tuile de 2 m : terre, sable, plaques d'humus et de terre plus rouge, puis les aiguilles — surtout
  // éparses, quelques petites touffes couchées dans un même sens — et quelques brindilles et graviers
  const T = 512, M2 = T / 2;                                 // 256 px par mètre
  const couleur = texCuiteAppel('terreCoinCouleur', [LX, LZ], [terreCoin], () => K.canvasTex(T, T, (g) => {
    g.fillStyle = '#6a5a52'; g.fillRect(0, 0, T, T);
    const partout = (x, y, m, f) => {                        // dessin qui se raccorde d'une tuile à l'autre
      for (const dx of [0, -T, T]) for (const dy of [0, -T, T]) {
        if ((dx && Math.abs(x + dx - T / 2) > T / 2 + m) || (dy && Math.abs(y + dy - T / 2) > T / 2 + m)) continue;
        f(x + dx, y + dy);
      }
    };
    for (let i = 0; i < 16; i++) {
      const r = rnd(40, 130), x = rnd(0, T), y = rnd(0, T), k = Math.random();
      const col = k < 0.4 ? 'rgba(84,66,55,0.28)' : k < 0.75 ? 'rgba(143,98,76,0.22)' : 'rgba(156,147,133,0.2)';
      partout(x, y, r, (px, py) => {
        const gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(px - r, py - r, 2 * r, 2 * r);
      });
    }
    for (let i = 0; i < 30000; i++) {                        // sable gris-brun (le beige rosé d'avant éclaircissait tout), grains sombres
      const s = Math.random() < 0.72, v = rnd(0.85, 1.15);
      g.fillStyle = s ? `rgba(${(121 * v) | 0},${(109 * v) | 0},${(97 * v) | 0},${rnd(0.2, 0.5)})` : `rgba(${(77 * v) | 0},${(64 * v) | 0},${(55 * v) | 0},${rnd(0.3, 0.55)})`;
      g.fillRect(Math.random() * T, Math.random() * T, rnd(0.8, 1.8), rnd(0.8, 1.8));
    }
    for (let i = 0; i < 160; i++) {                          // graviers clairs
      g.fillStyle = `rgba(${rnd(150, 190) | 0},${rnd(140, 170) | 0},${rnd(130, 160) | 0},0.85)`;
      g.beginPath(); g.ellipse(Math.random() * T, Math.random() * T, rnd(0.8, 2.2), rnd(0.7, 1.8), rnd(0, 3), 0, 6.29); g.fill();
    }
    // les aiguilles de pin parasol : rousses et brun-gris (feutre sec), plus sombres que la terre en moyenne
    const TEINTES = [[0.34, [117, 84, 59]], [0.26, [134, 100, 68]], [0.2, [90, 70, 53]], [0.12, [109, 102, 92]], [0.08, [147, 119, 87]]];
    const teinte = () => { let r = Math.random(); for (const [p, c] of TEINTES) { if ((r -= p) <= 0) return c; } return TEINTES[0][1]; };
    g.lineCap = 'round';
    const aiguille = (x, y, a, l) => {
      const c = teinte(), k = rnd(0.85, 1.12), b = rnd(-0.25, 0.25) * l;
      g.strokeStyle = `rgba(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0},${rnd(0.7, 0.95)})`;
      g.lineWidth = rnd(0.8, 1.3);
      partout(x, y, l, (px, py) => {
        const ex = px + Math.cos(a) * l, ey = py + Math.sin(a) * l;
        g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo((px + ex) / 2 - Math.sin(a) * b, (py + ey) / 2 + Math.cos(a) * b, ex, ey); g.stroke();
      });
    };
    // douze petites touffes seulement (les 46 grosses d'avant faisaient un paillis en paquets, que les photos n'ont pas)
    for (let t = 0; t < 12; t++) {
      const x = rnd(0, T), y = rnd(0, T), a0 = rnd(0, Math.PI), R = rnd(8, 20), n = Math.round(rnd(10, 20));
      for (let i = 0; i < n; i++) {
        const u = rnd(0, 6.283), r = R * Math.sqrt(Math.random());
        aiguille(x + Math.cos(u) * r, y + Math.sin(u) * r, a0 + rnd(-0.5, 0.5), rnd(0.08, 0.15) * M2);
      }
    }
    // le feutre : 2500 bouts d'aiguilles épars de 4 à 10 cm, dans tous les sens, et les aiguilles entières
    for (let i = 0; i < 2500; i++) aiguille(rnd(0, T), rnd(0, T), rnd(0, 6.283), rnd(0.04, 0.10) * M2);
    for (let i = 0; i < 750; i++) aiguille(rnd(0, T), rnd(0, T), rnd(0, 6.283), rnd(0.08, 0.18) * M2);
    // brindilles fines, gris-brun (le brun presque noir d'avant faisait des traits d'encre)
    g.strokeStyle = 'rgba(84,74,59,0.7)';
    for (let i = 0; i < 11; i++) {
      const x = rnd(0, T), y = rnd(0, T), a = rnd(0, 6.283), l = rnd(0.08, 0.25) * M2, k = rnd(-0.4, 0.4);
      g.lineWidth = rnd(1.4, 2.6);
      partout(x, y, l, (px, py) => {
        g.beginPath(); g.moveTo(px, py); const mx = px + Math.cos(a) * l / 2, my = py + Math.sin(a) * l / 2; g.lineTo(mx, my);
        g.lineTo(mx + Math.cos(a + k) * l / 2, my + Math.sin(a + k) * l / 2); g.stroke();
      });
    }
    // (30/09, lot L4) toute la tuile DÉSATURÉE de 10 % : le cœur de la terre sortait à 0,30 de saturation en
    // extrême, pour 0,27-0,28 sur la photo 341, à l'ombre. Pas plus : désaturée de 35 %, elle perdait le brun-rouge des
    // photos 185623 et 1856230. Et éclaircie de 10 % : l'enrobé l'a été (liant #7c7b7d, voir bitumeParc), la terre
    // garde ainsi sa place à côté de lui — 0,78 fois l'enrobé en luminance (sans cela, 0,70 : une tache sombre).
    const img = g.getImageData(0, 0, T, T), p = img.data;
    for (let o = 0; o < p.length; o += 4) {
      const y = 0.2126 * p[o] + 0.7152 * p[o + 1] + 0.0722 * p[o + 2];
      p[o] = 1.1 * (y + 0.9 * (p[o] - y)); p[o + 1] = 1.1 * (y + 0.9 * (p[o + 1] - y)); p[o + 2] = 1.1 * (y + 0.9 * (p[o + 2] - y));
    }
    g.putImageData(img, 0, 0);
  }, [LX / 2, LZ / 2], false, 16));
  // (décalage de profondeur réduit de -2 à -1 : en vue rasante, le -2 avançait le plan au-dessus des détritus posés
  // dessus, et les mégots disparaissaient sous la terre — rendu rp_185623 ; à 7 mm au-dessus de l'enrobé, -1 suffit)
  const mat = new THREE.MeshStandardMaterial({ map: couleur, alphaMap: masque, transparent: true, depthWrite: false,
    roughness: 0.97, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  mat.userData.detailPhoto = { cle: 'terre', w: LX, h: LZ };     // relief, rugosité et grain : loadDetailsPhoto
  // LA TUILE DE COULEUR, TOURNÉE DE 35° (relecture du lot L4). Posée droite, ses rangées étaient parallèles au grillage :
  // le long du terrain 2, où la terre n'est qu'une bande de 1,2 m jusqu'au mur, le bord du masque tombait toujours
  // sur la même rangée de la tuile de 2 m, et ses plaques d'humus sombres revenaient tous les deux mètres juste au bord
  // de la terre, en un liseré brun festonné, jusqu'à 10 % plus sombre que la terre (une auréole de café, bord gauche
  // de la caméra TV ; mesuré en ôtant le masque : la bande sombre restait, et bougeait avec un décalage de la tuile). Tournée, chaque plaque tombe à une autre distance du grillage, et la tuile ne se répète plus en file le
  // long de la bande. Les coordonnées tournées sont un second jeu d'UV (`uv1`, canal 1 de la couleur) : le masque, lui,
  // garde les UV du plan. (Les aiguilles vont dans tous les sens : la rotation ne se voit pas.)
  const geoSol = new THREE.PlaneGeometry(LX, LZ), pSol = geoSol.attributes.position, uv1 = new Float32Array(pSol.count * 2);
  const cr = Math.cos(0.61), sr = Math.sin(0.61);
  for (let i = 0; i < pSol.count; i++) {
    const x = pSol.getX(i), y = pSol.getY(i);                  // en mètres, depuis le centre du plan
    uv1[2 * i] = (x * cr - y * sr) / LX; uv1[2 * i + 1] = (x * sr + y * cr) / LZ;   // la répétition LX / 2 x LZ / 2 : 2 m
  }
  geoSol.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
  couleur.channel = 1;
  const sol = new THREE.Mesh(geoSol, mat);
  sol.rotation.x = -Math.PI / 2; sol.position.set(cx(COIN.x0) + LX / 2, 0.007, COIN.z0 + LZ / 2);
  sol.renderOrder = 2; sol.receiveShadow = true; scene.add(sol);
  detritusCoin(scene, cx, ZO, profil);
  return mat;
}

// LES DÉTRITUS DU COIN, instanciés (une géométrie, un appel de dessin par sorte) : mégots à filtre liège, bouts de
// papier et de plastique, capsules, brindilles, bouteilles écrasées. Petits, à plat, sans ombre portée, sur la terre
// entre les deux terrains (x de -12,5 à -3,5, repère du terrain 1), avec un gros paquet devant le banc blanc et la
// cage, autour de (-8,5 ; ZO - 0,8), là où l'on se tient (photos 185623, 1856230, 185625, 185626 : des centaines de
// mégots et une trentaine de papiers blancs sur quelques mètres carrés). Moitié moins sur un téléphone.
// (Avant : 120 mégots à 11 mm du sol, noyés sous le plan de terre en vue rasante — on n'en voyait aucun.)
function detritusCoin(scene, cx, ZO, profil) {
  const q = LEGER ? 0.5 : 1, o = new THREE.Object3D(), c = new THREE.Color();
  const tirer = () => {
    for (let essai = 0; essai < 60; essai++) {
      const x1 = rnd(-12.5, -3.5), larg = profil(cx(x1)) * 0.92, dz = 0.06 + Math.pow(Math.random(), 1.4) * (larg - 0.06);
      const pres = Math.exp(-((x1 + 8.5) ** 2) / 3.5) * Math.exp(-((dz - 0.8) ** 2) / 0.8);
      if (Math.random() < 0.2 + 0.8 * pres) return [cx(x1), ZO - dz];
    }
    return [cx(-8.5), ZO - 0.8];
  };
  const semer = (geo, mat, n, poser, couleurs) => {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, Math.round(n * q)));
    for (let i = 0; i < m.count; i++) {
      const [x, z] = tirer(); poser(o, x, z); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      const [p, hex] = couleurs[Math.floor(Math.random() * couleurs.length)];
      m.setColorAt(i, c.setHex(hex).multiplyScalar(p * rnd(0.85, 1.08)));
    }
    m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.computeBoundingSphere();
    m.castShadow = false; m.receiveShadow = true; scene.add(m);
    return m;
  };
  // les mégots : 3 cm, filtre liège de 1,2 cm, papier blanc ; posés à 16 mm (leur axe), bien au-dessus du plan de terre
  const filtre = new THREE.CylinderGeometry(0.0041, 0.0041, 0.012, 6); filtre.translate(0, -0.009, 0);
  const papier = new THREE.CylinderGeometry(0.0039, 0.0039, 0.019, 6); papier.translate(0, 0.0065, 0);
  const peindre = (g, hex) => { const k = new THREE.Color(hex), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = k.r; a[i + 1] = k.g; a[i + 2] = k.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const megot = mergeGeometries([peindre(filtre, 0xc98a52), peindre(papier, 0xf4f2ec)]); megot.rotateZ(Math.PI / 2);
  semer(megot, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), 350, (o, x, z) => {
    o.position.set(x, 0.016, z); o.rotation.set(rnd(-0.15, 0.15), rnd(0, 6.283), rnd(-0.1, 0.1), 'YXZ'); o.scale.set(rnd(0.8, 1.1), 1, 1);
  }, [[1, 0xffffff], [0.92, 0xfff4e8], [0.75, 0xf0e8dc]]);
  // les brindilles de pin : 8 à 30 cm, gris-brun clair
  const brin = new THREE.CylinderGeometry(1, 0.6, 1, 5); brin.rotateZ(Math.PI / 2);
  semer(brin, new THREE.MeshStandardMaterial({ roughness: 0.95 }), 70, (o, x, z) => {
    const r = rnd(0.0025, 0.006); o.position.set(x, 0.011 + r, z); o.rotation.set(0, rnd(0, 6.283), rnd(-0.06, 0.06), 'YXZ'); o.scale.set(rnd(0.08, 0.3), r, r);
  }, [[1, 0x8a7664], [1, 0x9c8a78], [1, 0x6e5a48], [1, 0xa89684]]);
  // les papiers et les bouts de plastique : 4 à 15 cm, à plat, un peu froissés ; blancs surtout, quelques bleus
  const feuille = new THREE.PlaneGeometry(1, 1, 2, 2); feuille.rotateX(-Math.PI / 2);
  const pf = feuille.attributes.position; for (let i = 0; i < pf.count; i++) pf.setY(i, (i % 3 === 1 ? 0.12 : 0) * rnd(-1, 1));
  feuille.computeVertexNormals();
  semer(feuille, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), 70, (o, x, z) => {
    const s = rnd(0.04, 0.15); o.position.set(x, 0.013, z); o.rotation.set(rnd(-0.12, 0.12), rnd(0, 6.283), rnd(-0.12, 0.12), 'YXZ'); o.scale.set(s, s, s * rnd(0.4, 0.9));
  }, [[1, 0xeeede8], [1, 0xf4f3ef], [1, 0xeeede8], [1, 0xd9dcde], [0.9, 0xc9ccd0], [1, 0x3d6fc0], [1, 0x8fb4e0]]);
  // les capsules : Ø 2,6 cm
  semer(new THREE.CylinderGeometry(0.013, 0.013, 0.005, 10), new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.55 }), 14,
    (o, x, z) => { o.position.set(x, 0.012, z); o.rotation.set(rnd(-0.1, 0.1), rnd(0, 6.283), rnd(-0.1, 0.1), 'YXZ'); o.scale.set(1, 1, 1); },
    [[1, 0xc9a23a], [1, 0xb9bcc0], [1, 0xb8302a], [1, 0x2d58a8], [1, 0x2f7a3a]]);
  // six bouteilles plastique écrasées (20 x 7 cm, aplaties à 2,5 cm, un goulot), blanc bleuté translucide ; dessinées
  // après le plan de terre (ordre 3), sans écrire la profondeur, comme la bouteille du banc
  const bout = new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10, 4), pb = bout.attributes.position;
  for (let i = 0; i < pb.count; i++) {
    const y = pb.getY(i), goulot = y > 0.07 ? 0.45 : 1, k = goulot * rnd(0.85, 1.12);
    pb.setXYZ(i, pb.getX(i) * k, y, pb.getZ(i) * k * 0.36);        // aplatie : 7 cm de large, 2,5 cm d'épaisseur
  }
  bout.computeVertexNormals(); bout.rotateX(Math.PI / 2);          // couchée : l'épaisseur passe à la verticale
  const bouteilles = semer(bout, new THREE.MeshStandardMaterial({ roughness: 0.25, transparent: true, opacity: 0.7, depthWrite: false }), 6,
    (o, x, z) => { o.position.set(x, 0.02, z); o.rotation.set(rnd(-0.08, 0.08), rnd(0, 6.283), rnd(-0.1, 0.1), 'YXZ'); o.scale.set(1, 1, 1); },
    [[1, 0xe6eef4], [1, 0xdce8f2], [0.95, 0xeef2f4]]);
  bouteilles.renderOrder = 3;
}

// LES DÉBRIS ÉPARS DU PLATEAU (photos 1000051600 à 602, prises au ras du sol) : sur tout l'enrobé, des gravillons
// détachés, des bouts de feuilles sèches et quelques taches sombres (chewing-gums écrasés, gouttes d'huile) — rares,
// mais c'est à eux qu'on voit un vrai sol et pas une texture. Tirés au hasard de x = XN + 0,5 à XBIT - 0,3 et de
// z = ZE + 0,3 à ZO - 0,3, deux fois plus serrés à moins de 3 m du mur et du treillis des platanes (le vent les y
// pousse). Trois maillages instanciés (trois appels de dessin), sans ombre portée ; moitié moins sur un téléphone.
// `profil` : la largeur de la terre du pin (profilPin), où l'on ne pose pas de tache.
function debrisPlateau(scene, XN, XBIT, ZE, ZO, profil) {
  const q = LEGER ? 0.5 : 1, o = new THREE.Object3D(), c = new THREE.Color();
  const xa = XN + 0.5, xb = XBIT - 0.3, za = ZE + 0.3, zb = ZO - 0.3;
  const tirer = (surTerre) => {
    for (let essai = 0; essai < 40; essai++) {
      const x = rnd(xa, xb), z = rnd(za, zb);
      if (Math.random() > (x - XN < 3 || z - ZE < 3 ? 1 : 0.5)) continue;
      if (!surTerre && ZO - z < profil(x) + 0.15) continue;
      return [x, z];
    }
    return [rnd(xa, xb), rnd(za, zb - 3)];
  };
  const semer = (geo, mat, n, poser, teinte, surTerre = true) => {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, Math.round(n * q)));
    for (let i = 0; i < m.count; i++) {
      const [x, z] = tirer(surTerre); poser(o, x, z); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, teinte(c));
    }
    m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.computeBoundingSphere();
    m.castShadow = false; m.receiveShadow = true; scene.add(m);
    return m;
  };
  // 700 gravillons détachés de 6 à 16 mm, aplatis (0,6), à demi enfoncés ; gris, beige clair, gris foncé
  const GRAVIERS = [0x9a968e, 0xb8b2a6, 0x6e6a64];
  semer(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), 700, (o, x, z) => {
    const r = rnd(0.003, 0.008);
    o.position.set(x, r * 0.3, z); o.rotation.set(rnd(-0.3, 0.3), rnd(0, 6.283), rnd(-0.3, 0.3), 'YXZ'); o.scale.set(r, r * 0.6, r);
  }, (c) => c.setHex(GRAVIERS[Math.floor(Math.random() * GRAVIERS.length)]).multiplyScalar(rnd(0.9, 1.08)));
  // 200 fragments de feuilles de platane sèches, de 2 à 4 cm, beige-gris pâle : un hexagone au bord déchiqueté
  const frag = new THREE.CircleGeometry(0.5, 6), pfr = frag.attributes.position;
  for (let i = 1; i < pfr.count; i++) { const k = rnd(0.55, 1.1); pfr.setXY(i, pfr.getX(i) * k, pfr.getY(i) * k); }
  frag.rotateX(-Math.PI / 2);
  semer(frag, new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.DoubleSide }), 200, (o, x, z) => {
    const s = rnd(0.02, 0.04);
    o.position.set(x, 0.009, z); o.rotation.set(rnd(-0.15, 0.15), rnd(0, 6.283), rnd(-0.15, 0.15), 'YXZ'); o.scale.set(s, s, s * rnd(0.55, 1));
  }, (c) => c.setHSL(0.08 + rnd(-0.012, 0.012), 0.15, 0.45 * rnd(0.88, 1.1)));
  // 60 taches sombres de 3 à 6 cm, à moitié transparentes : dessinées après le calque des bords (ordre 1,5), avant la
  // terre du pin (2), sur laquelle on n'en pose pas
  const disque = new THREE.CircleGeometry(0.5, 12); disque.rotateX(-Math.PI / 2);
  const taches = semer(disque, new THREE.MeshStandardMaterial({ color: 0x2e2e2e, roughness: 0.7, transparent: true, opacity: 0.5,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), 60, (o, x, z) => {
    const s = rnd(0.03, 0.06);
    o.position.set(x, 0.006, z); o.rotation.set(0, rnd(0, 6.283), 0); o.scale.set(s, 1, s * rnd(0.7, 1));
  }, (c) => c.setScalar(rnd(0.8, 1.15)), false);
  taches.renderOrder = 1.5;
}

// LES TOUFFES D'HERBE AU PIED DU TREILLIS DES PLATANES (photos 1000051340, 602, 603) : côté stabilisé, là où le
// râteau ne passe pas, une herbe maigre en touffes de 12 à 28 cm, vert olive terne, trois fois plus drue autour des
// piquets (on ne désherbe pas contre un poteau). Jamais sur l'enrobé : de z = ZE - 0,05 à ZE - 0,45 (le treillis est
// en ZE - 0,1), de x = -23,5 à 5,0 (repère du terrain 1). Deux plans croisés par touffe, sur un atlas de brins dessiné
// ici, en UN maillage instancié ; normales tournées vers le ciel (une touffe s'éclaire comme le sol qui la porte), sans
// ombre portée, et moitié moins sur un téléphone.
function herbesPiedPlatanes(scene, K, cx, ZE) {
  // les piquets du treillis, dans le repère du terrain 1 : les mêmes que `platP` dans cloturesParc
  const PIQUETS = [4.28, 2.18, -0.02, -2.06, -4.22, -6.38, -8.47, -10.62, -12.73, -14.83, -16.93, -19.03, -21.13, -23.62];
  const N = Math.round(220 * (LEGER ? 0.5 : 1));
  // l'atlas : des brins clairs (la couleur vient de chaque touffe), plus sombres au pied, qui s'écartent en gerbe
  const tex = K.canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      const x0 = rnd(38, 90), H = rnd(55, 124), dx = (x0 - 64) * rnd(0.6, 1.4) + rnd(-18, 18), v = rnd(170, 255) | 0;
      const gr = g.createLinearGradient(0, h, 0, h - H);
      gr.addColorStop(0, `rgb(${(v * 0.55) | 0},${(v * 0.55) | 0},${(v * 0.55) | 0})`); gr.addColorStop(1, `rgb(${v},${v},${v})`);
      g.strokeStyle = gr; g.lineWidth = rnd(1.6, 3.2);
      g.beginPath(); g.moveTo(x0, h); g.quadraticCurveTo(x0 + dx * 0.3, h - H * 0.6, x0 + dx, h - H); g.stroke();
    }
  }, null, true, 4);
  // deux plans croisés de 1 x 1, pied à y = 0, chacun en double dos à dos : avec des normales verticales, un plan
  // vu de dos en double face aurait sa normale retournée vers le sol (touffe noire) — chaque face garde la sienne
  const plans = [];
  for (const a of [0.3, 0.3 + Math.PI / 2]) for (const dos of [0, Math.PI]) plans.push(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateY(a + dos));
  const geo = mergeGeometries(plans), nrm = geo.attributes.normal;
  for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.4, roughness: 0.95 });
  const m = new THREE.InstancedMesh(geo, mat, N), o = new THREE.Object3D(), c = new THREE.Color();
  const VERTS = [0x4f6a38, 0x6b7d45, 0x5c6b3c];
  for (let i = 0; i < N; i++) {
    let x1 = rnd(-23.5, 5.0);
    for (let essai = 0; essai < 20; essai++) {
      if (PIQUETS.some((p) => Math.abs(x1 - p) < 0.3) || Math.random() < 1 / 3) break;
      x1 = rnd(-23.5, 5.0);
    }
    const s = rnd(0.12, 0.28);
    o.position.set(cx(x1), 0, ZE - rnd(0.05, 0.45)); o.rotation.set(rnd(-0.12, 0.12), rnd(0, 6.283), rnd(-0.12, 0.12), 'YXZ');
    o.scale.set(s * rnd(0.8, 1.3), s, s * rnd(0.8, 1.3)); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    m.setColorAt(i, c.setHex(VERTS[Math.floor(Math.random() * VERTS.length)]).multiplyScalar(rnd(0.85, 1.12)));
  }
  m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.computeBoundingSphere();
  m.castShadow = false; m.receiveShadow = true; scene.add(m);
  declarerFeuillage(scene, m);                 // hors de la passe de normales de l'occlusion (sinon, des carrés sombres)
}

// LES AFFAIRES POSÉES SUR LE BANC BLANC (photos du 26/09) : un sweat noir roulé en boule au bout côté quai, les
// clés et un téléphone, une bouteille d'eau debout, et au pied du banc un sac plastique à fleurs. Tout est côté
// quai : la moitié côté mur reste la place où l'on s'assoit. `x`, `z` : le milieu du banc (qui regarde -z).
function affairesBanc(scene, x, z) {
  const boule = (sx, sy, sz, px, py, pz, alea) => {
    const g = new THREE.SphereGeometry(1, 12, 8), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * sx + rnd(-alea, alea), Math.max(-0.55, p.getY(i)) * sy + rnd(-alea, alea) * 0.6, p.getZ(i) * sz + rnd(-alea, alea));
    g.computeVertexNormals(); g.translate(px, py, pz); return g;
  };
  // le sweat (le banc regarde -z : son bout côté quai est en +x monde), les clés, le téléphone
  const tel = new THREE.BoxGeometry(0.075, 0.009, 0.155).toNonIndexed(); tel.rotateY(0.4); tel.translate(x + 0.47, 0.442, z - 0.06);
  const noir = [boule(0.2, 0.07, 0.15, x + 0.72, 0.475, z + 0.01, 0.018), boule(0.1, 0.05, 0.08, x + 0.58, 0.47, z - 0.08, 0.012)].map((g) => g.toNonIndexed());
  noir.push(tel);
  for (const g of noir) g.deleteAttribute('uv');
  const noirs = new THREE.Mesh(mergeGeometries(noir), new THREE.MeshStandardMaterial({ color: 0x19191b, roughness: 0.95 }));
  noirs.castShadow = true; noirs.receiveShadow = true; scene.add(noirs);
  // la bouteille : corps transparent bleuté, étiquette bleue, bouchon blanc
  const corps = new THREE.CylinderGeometry(0.037, 0.037, 0.2, 12); corps.translate(x + 0.3, 0.54, z - 0.03);
  const col = new THREE.CylinderGeometry(0.016, 0.035, 0.06, 12); col.translate(x + 0.3, 0.67, z - 0.03);
  const bouteille = new THREE.Mesh(mergeGeometries([corps, col]), new THREE.MeshStandardMaterial({ color: 0xdfe9ee, roughness: 0.12, transparent: true, opacity: 0.6, depthWrite: false }));
  const etiquette = new THREE.Mesh(new THREE.CylinderGeometry(0.0375, 0.0375, 0.055, 12, 1, true).translate(x + 0.3, 0.55, z - 0.03),
    new THREE.MeshStandardMaterial({ color: 0x2c58a6, roughness: 0.5, side: THREE.DoubleSide }));
  const bouchon = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.022, 10).translate(x + 0.3, 0.71, z - 0.03), new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.5 }));
  for (const m of [bouteille, etiquette, bouchon]) { m.castShadow = true; scene.add(m); }
  // le sac plastique à fleurs, affaissé au pied du bout côté quai, devant le banc
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = '#cfcbd0'; g.fillRect(0, 0, 128, 128);
  const P = ['#d8457a', '#4a7fc8', '#58a060', '#f0a030', '#8a4aa0', '#3a3a44'];
  for (let i = 0; i < 90; i++) { g.fillStyle = P[i % P.length]; g.beginPath(); g.ellipse(rnd(0, 128), rnd(0, 128), rnd(4, 13), rnd(3, 9), rnd(0, 3), 0, 6.29); g.fill(); }
  const fleurs = new THREE.CanvasTexture(cv); fleurs.colorSpace = THREE.SRGBColorSpace;
  const sac = new THREE.Mesh(boule(0.21, 0.1, 0.14, 0, 0, 0, 0.045), new THREE.MeshStandardMaterial({ map: fleurs, roughness: 0.5 }));
  sac.position.set(x + 1.05, 0.085, z - 0.45); sac.rotation.set(0, 0.5, 0.15);
  sac.castShadow = true; sac.receiveShadow = true; scene.add(sac);
}

// =====================================================================
//  LES PLATANES DU STABILISÉ
// =====================================================================
// LE BOSQUET RÉEL (photos 40 et 41, recalées au pixel) : un QUINCONCE de platanes taillés sur le stabilisé.
// Au premier rang, contre le grillage, TROIS gros fûts crème seulement, à près de dix mètres l'un de
// l'autre ; les autres, plus minces et plus sombres, en quinconce derrière jusqu'au pavillon. L'ancienne
// colonnade de six fûts tous les cinq mètres, aux branches en V dressées, faisait échafaudage.
// Chaque arbre : un fût court, évasé au pied, qui fourche vers trois mètres ; trois charpentières SINUEUSES
// presque horizontales, qu'on ne voit qu'entre 3 et 4 m ; au-dessus, une couronne en DÔME dont la jupe
// retombe à 3 m au bord. Les couronnes se soudent en une voûte continue, bosselée en chou-fleur, d'où
// pendent quelques festons. Côté plateau le premier rang est taillé : deux mètres de débord au plus, entre
// 4 et 7 m de haut. Fûts et branches sont cousus en UN maillage, toutes les couronnes en un autre.

// La trame des pieds (x du repère du terrain 1, z, rang). Rang 1 : les trois fûts clairs, recoupés sur les
// photos 40 (x ≈ +3,0 / -6,7 / -15,6) et 41 (x ≈ -7,4 / -17,0). Les rangs suivants tombent dans les creux
// du précédent — c'est eux qu'on voit entre les fûts, plus loin et plus sombres. Plus rien à l'angle du mur
// ni au bout du quai : la photo y montre du vide ou le mur.
// Au premier rang, chaque fût a SON diamètre (4e champ, k : le multiplicateur des rayons de futPlatane), mesuré
// sur la photo 40 contre le rendu : celui du milieu (-6,9) est de loin le plus mince (0,45 à 0,5 m sur la photo ;
// à k = 1 il sortait à 0,78 m), celui du quai (+3,0) et celui du mur (-16,6) plus forts (k 0,9 et 0,85). Celui du
// mur penche franchement vers le mur (5e champ : 6° vers x-), au lieu de 3 à 5° dans un sens tiré au hasard.
function piedsPlatanes(cx) {
  const T = [
    [3.0, -10.3, 1, 0.9], [-6.9, -10.0, 1, 0.6], [-16.6, -10.1, 1, 0.85, 6],
    [-1.9, -14.5, 2], [-11.8, -14.4, 2],
    [-5.9, -17.8, 3], [-14.6, -17.9, 3], [3.2, -19.8, 3],
    [-1.2, -22.2, 4], [-10.5, -22.3, 4],
    [-5.5, -26.2, 5], [-14.0, -26.5, 5], [3.0, -27.5, 5],
    [-0.8, -30.6, 6], [-10.0, -31.0, 6],
  ];
  // un peu de désordre, moins au premier rang : son pied évasé doit rester derrière le grillage (z = -9,2)
  // (parc entier : les fûts sont des obstacles, au même endroit chez tous les joueurs — le désordre est tiré de la
  // place de l'arbre, alea, et non plus de Math.random. Lot G11 : drapeau baissé aussi — la voûte est la même à chaque
  // chargement, et ses mesures avec elle ; tirée dans Math.random, elle passait de 0,94 à 0,98 fois l'enrobé d'une
  // partie à l'autre)
  const j = (a, b, x, z, k) => a + (b - a) * alea(x, z, k);
  return T.map(([x, z, rang, k, penche]) => rang === 1 ? [cx(x) + j(-0.15, 0.15, x, z, 11), z + j(-0.1, 0.1, x, z, 12), rang, k, penche]
    : [cx(x) + j(-0.2, 0.2, x, z, 11), z + j(-0.2, 0.2, x, z, 12), rang]);
}

// `pieds` : [x, z, rang, k, penche] dans le repère du jeu (déjà passés dans cx ; k et penche au premier rang
// seulement, voir piedsPlatanes) ; `cx` sert aux limites, écrites dans le repère du terrain 1 (caméra de
// diffusion, paniers).
function platanes(scene, K, pieds, cx) {
  // (parc entier : les fûts sont des obstacles du monde, voir buildParc — 0,30 m au pied au premier rang, 0,22 derrière)
  const obs = scene.userData.obstaclesDecor;
  if (obs) for (const [x, z, rang] of pieds) obs.push({ t: 'c', x, z, r: rang === 1 ? 0.3 : 0.22, h: 2.6, qui: 'tous', type: 'arbre', source: 'platanes' });
  const tex = ecorcePlatane(K.canvasTex);
  // Le fût reste CRÈME, même à l'ombre de la voûte (photo 40 : #cfc3ba au jour, #988b82 à l'ombre) : un
  // peu de sa propre couleur en émission. La teinte par sommet assombrit le pied et les rangs du fond.
  // (0,12 jusqu'au lot L3 : le fût sortait à 1,31 fois l'enrobé en moyenne sans carte du ciel, 1,08 sur la photo 340)
  const ecorce = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, vertexColors: true,
    emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.09 });
  // (cette émission ne vaut que pour les fûts clairs du premier rang : elle est multipliée par la teinte par
  // sommet, et s'éteint en dessous de 0,5 — les rangs du fond (teinte 0,44 à 0,52) et les bras sous la voûte n'en
  // ont plus. Sinon le fond de la voûte restait aussi pâle que le premier rang, alors que sur la photo 40 et celle
  // du 27/09 (602) les fûts du fond sont des ombres gris-brun, vers #57504a)
  ecorce.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n'
      + 'totalEmissiveRadiance *= vColor * smoothstep(0.5, 0.8, dot(vColor, vec3(0.3333)));');
  };
  ecorce.customProgramCacheKey = () => 'ecorce-platane-emission';
  // (l'atlas des rameaux : 1024 px sur PC, 512 sur téléphone — voir feuillagePlatane)
  const atlas = feuillagePlatane(K.canvasTex);
  // (lot L3 : le ciel transmis 0,4 -> 0,3 — la voûte sortait 1,20 fois l'enrobé en moyenne sans carte du ciel, 1,03
  // sur la photo 340 ; avec sa teinte (TEINTES_FEUILLES, clair 1,17), elle sort à 0,94-0,98 selon les couronnes tirées,
  // au départ de balade des deux terrains ; les plans vus par la tranche s'effacent dans materiauFeuilles, pour tous
  // les feuillages : tranchePlatane n'est plus)
  const feuilles = materiauFeuilles(atlas, { trans: 0.3, rugosite: 0.85, alpha: 0.4, vent: 0.5, taille: atlas.image.width });
  soleilPlatane(feuilles);
  // LA VRAIE ÉCORCE ET LES VRAIES FEUILLES, à leur arrivée : la photo d'écorce de platane (tex/ecorce_platane)
  // donne le grain, les fissures et le relief par-dessus les plaques crème dessinées (et les teintes par sommet),
  // une tuile carrée par tour de fût ; les feuilles photographiées remplacent les feuilles dessinées. (Grain à
  // moitié seulement : à 0,8, la luminance de la photo, plus sombre dans ses fissures verdâtres, grisait les
  // plaques crème et leur amenait du vert)
  ecorceReelle(ecorce, 'ecorce_platane', [1, 2], { emissive: true, melange: 0.5, normale: 0.9 });
  feuillesReelles(feuilles);
  const bois = [], cartes = cartesPlatane();
  const contraindre = limitesPlatanes(cx(0));
  // (chaque arbre tire la forme de ses bras et de sa couronne d'un hasard À LUI, fixé par son rang dans la liste. Lot
  // G11 : son fût aussi, d'un second hasard à lui, et le pied (piedsPlatanes) et les limites (limitesPlatanes) d'un
  // tirage lié à la place, alea — plus rien ne puise dans Math.random : la voûte est IDENTIQUE d'un chargement à
  // l'autre, et sur les deux terrains (le même arbre, au même endroit du parc). Avant, un seul tirage qui changeait
  // faisait bifurquer la suite de l'arbre, et la voûte changeait à chaque partie)
  // (PARC ENTIER : l'esplanade n'est pas plate, de -0,3 à +0,4 m sous la voûte ; chaque arbre, fût, bras et couronne,
  // est levé ou baissé d'un bloc à la hauteur du sol sous son pied. Monde plat : dy = 0, rien ne bouge)
  const P = new THREE.Vector3();
  pieds.forEach(([x, z, rang, k, penche], i) => {
    const R = hasardPlatane(9173 + i * 7919);
    const dy = Monde.plat ? 0 : Monde.sol(x, z), b0 = bois.length;
    const t = futPlatane(x, z, rang, bois, k, penche, hasardPlatane(5381 + i * 7919));
    brasPlatane(t, bois, x - cx(0), R);
    if (dy) for (let j = b0; j < bois.length; j++) bois[j].translate(0, dy, 0);
    couronnePlatane(t, dy ? { ajouter: (Q, ...r) => cartes.ajouter(P.copy(Q).setY(Q.y + dy), ...r) } : cartes, contraindre, x - cx(0), R);
  });
  const t = new THREE.Mesh(mergeGeometries(bois), ecorce); t.castShadow = true; t.receiveShadow = true; scene.add(t);
  // les couronnes portent leur ombre (découpée) mais ne la reçoivent pas : sinon la voûte s'ombre de part en part
  // (le soleil bas n'éclaire que leurs dessus : voir soleilPlatane)
  const c = new THREE.Mesh(cartes.geometrie(), feuilles);
  c.castShadow = true; c.receiveShadow = false; c.customDepthMaterial = feuilles.userData.ombre;
  scene.add(c); declarerFeuillage(scene, c);
}

// Un hasard reproductible (mulberry32) : R() dans [0, 1[, R(a, b) dans [a, b[.
function hasardPlatane(graine) {
  let a = graine >>> 0;
  return (lo = 0, hi = 1) => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return lo + (hi - lo) * (((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}

// LES LIMITES DU FEUILLAGE, dans le repère du terrain 1 (`DX` = décalage du plateau). Une touffe est un disque
// de feuilles d'environ 0,46 fois sa taille de rayon : c'est ce bord-là qu'on retient, pas son centre.
//  - le front côté plateau : deux mètres de débord au plus (z = -7,3), mais RIEN au-dessus du plateau là où
//    vole la caméra de diffusion (x de -13,5 à -2,5, 4,5 à 10,5 m de haut) : elle s'y poserait dans les
//    feuilles. La coupe se raccorde au débord sur un mètre et demi ;
//  - au-dessus du plateau, le dessous de la voûte REMONTE : 3,8 m au grillage, 4,6 m au bout du débord, et
//    4,4 m au moins au-dessus des deux panneaux de ce côté (photo 40 : les feuilles juste au-dessus) ;
//  - rien au-dessus de 7 m à moins de 1,2 m du grillage (photo 40 : le front est taillé bas).
// Rend [x, y, z] corrigé, ou null quand la touffe est trop loin dans la zone interdite pour être repoussée.
function limitesPlatanes(DX) {
  const PANIERS = [0, -16.1];                // axes des paniers du côté des platanes (repère du terrain 1)
  return (x, y, z, s) => {
    const x1 = x - DX, e = 0.46 * s, zFront = Math.min(frontPlatane(x1 - e), frontPlatane(x1 + e));
    // (les petits décalages sont tirés de la place de la touffe, alea — lot G11 : plus de Math.random dans la voûte)
    if (z + e > zFront) {
      if (z + e - zFront > 0.9) return null;
      z = zFront - e - 0.25 * alea(x1, z, 21);
    }
    const au = z + e + 9.3;                    // avancée au-dessus du plateau
    if (au > 0) {
      const panier = PANIERS.some((a) => Math.abs(x1 - a) < 1.4 + e);
      // au-dessus d'un des deux terrains, pas une feuille sous 4,5 m (la balle y monte)
      const terrain = PANIERS.some((a) => Math.abs(x1 - a) < 5.5 + e) && z + e > -9.1;
      const yMin = Math.max(3.8 + au * 0.4, panier ? 4.4 : 0, terrain ? 4.5 + 0.3 * e : 0);
      if (y - e * 0.8 < yMin) y = yMin + e * 0.8 + 0.2 * alea(x1, z, 22);
      if (z + e > -8.0 && y + e * 0.8 > 7.0) y = 7.0 - e * 0.8;
    }
    return [x, y, z];
  };
}

// Le front des couronnes à l'abscisse x1 (repère du terrain 1) : -9,4 dans la boîte de la caméra de
// diffusion, -7,3 à un mètre et demi de ses bords.
function frontPlatane(x1) {
  const dBoite = Math.max(-13.5 - x1, x1 + 2.5, 0);
  return -9.4 + Math.min(1, dBoite / 1.5) * 2.1;
}

// LE FÛT : court (fourche à 3,0-3,3 m au premier rang), évasé au pied (r 0,38 au sol, 0,285 à 45 cm), un peu
// penché (3 à 5°, dans un sens tiré au hasard ; ou `penche` degrés vers x-) et galbé ; des contreforts à peine
// marqués au ras du sol ; la tête s'élargit un peu à la fourche, où les charpentières sortent DU fût. Plus de
// calotte sur le haut du fût : bombée, elle en faisait un moignon (sur le rendu de la photo 40, une rangée de
// chandelles coupées net). Le fût se referme en épaule, en cône, autour du bras DROIT (brasPlatane) qui le
// prolonge jusque dans les feuilles. `k` : le multiplicateur des rayons, propre à chaque fût du premier rang
// (piedsPlatanes). Les rangs du fond : fûts plus minces (r 0,16 à 0,2 à 1,3 m) et bien plus sombres (x 0,44 à
// 0,52 : sur les photos 40 et 602, des ombres gris-brun sous la voûte, #504e49 à #605851, là où le premier rang est
// crème). Rend ce que la charpente et la couronne ont besoin de savoir. `HF` : le hasard du fût (lot G11 : un
// hasardPlatane propre à l'arbre, voir platanes ; Math.random sans lui).
function futPlatane(x, z, rang, bois, kFut, penche, HF = rnd) {
  const r1 = rang === 1;
  const k = r1 ? (kFut || HF(0.95, 1.05)) : HF(0.62, 0.78);
  const h0 = r1 ? HF(3.0, 3.3) : HF(2.8, 3.2);
  const ai = penche ? Math.PI : HF(0, Math.PI * 2), inc = Math.tan((penche || HF(3, 5)) * Math.PI / 180) * h0;
  const ag = HF(0, Math.PI * 2), galbe = HF(0.04, 0.1);
  // (le dernier anneau, 20 cm au-dessus de la tête, se resserre à 0,05 : l'épaule que le bras droit, de rayon
  // 0,2, recouvre — le haut du fût n'est jamais un tube ouvert)
  const H = [-0.05, 0.12, 0.45, 1.0, 1.3, 2.2, h0 - 0.25, h0 + 0.1, h0 + 0.3];
  const R = [0.38, 0.32, 0.285, 0.27, 0.26, 0.245, 0.25, 0.23, 0.05];
  const pts = H.map((y) => {
    const f = Math.max(0, y) / h0, b = Math.sin(Math.PI * Math.min(1, f)) * galbe;
    const p = new THREE.Vector3(x + Math.cos(ai) * inc * f + Math.cos(ag) * b, y, z + Math.sin(ai) * inc * f + Math.sin(ag) * b);
    p.z = Math.min(p.z, -9.75);                // jamais contre le grillage des platanes
    return p;
  });
  const teinte = r1 ? [1, 1, 1] : rang <= 3 ? [0.52, 0.5, 0.48] : [0.44, 0.42, 0.4];
  const couleur = teintePlatane(teinte);
  const p1 = HF(0, 6.28), p2 = HF(0, 6.28);
  const rayon = (i, a) => R[i] * k * (1 + 0.1 * Math.sin(3 * a + p1) * Math.max(0, 1 - H[i] / 0.6)
    + 0.05 * Math.sin(5 * a + p2) * Math.max(0, 1 - H[i] / 0.3));
  bois.push(tubePlatane(pts, rayon, r1 ? 12 : 9, couleur));
  const fourche = pts[6];
  return { x, z, rang, k, h0, fourche, couleur, axe: [pts[5], fourche] };
}

// La teinte du bois, par sommet : `teinte` (le rang), le pied gris-brun (#a99e90 sur fond crème) sur 80 cm —
// la terre, les éclaboussures —, et au-dessus de la fourche le demi-jour de la voûte, que l'ombre portée ne
// rend qu'à moitié (le ciel éclaire encore les bras par-dessous) : les bras sont gris-brun, leur dessous plus
// sombre (photo 40 : bras #8a8070 sous les feuilles, fût crème en dessous).
function teintePlatane(teinte) {
  return (p, n) => {
    const b = Math.min(1, Math.max(0, p.y / 0.8));
    const h = Math.min(1, Math.max(0, (p.y - 2.5) / 1.6)), o = h * h * (3 - 2 * h);
    const v = (1 - 0.42 * o) * (0.78 + 0.22 * (n.y * 0.5 + 0.5));
    // (et plus haut, de 4,3 à 4,6 m, dans la couronne, le bois vire au vert sombre du feuillage, x [0,55 ; 0,62 ;
    // 0,5] : le peu qui dépasse encore — les pousses des têtes de chat, jusqu'à 5 m — se fond dans les feuilles. Gris
    // assombri, il flottait entre les grappes en traits pâles, qu'on ne voit pas sur la photo 40)
    const f = Math.min(1, Math.max(0, (p.y - 4.3) / 0.3)), vert = f * f * (3 - 2 * f);
    return [teinte[0] * (0.78 + 0.22 * b) * v * (1 - 0.45 * vert),
      teinte[1] * (0.75 + 0.25 * b) * v * (1 - 0.03 * o) * (1 - 0.38 * vert),
      teinte[2] * (0.75 + 0.25 * b) * v * (1 - 0.08 * o) * (1 - 0.5 * vert)];
  };
}

// LES CHARPENTIÈRES. Photos 40, 602 et 603 : le fût fourche vers 3,1 m en deux à quatre GROSSES branches presque à
// plat, sinueuses, qu'on suit sous les feuilles entre 3 et 4,5 m, tendues d'un fût vers l'autre ; au bout, les têtes
// de chat des tailles successives, noueuses et sombres, hérissées de pousses (photo 603, au fond). Chaque
// charpentière est faite de trois tronçons coudés de 5 à 15° de côté, en alternance — c'est ce qui la rend sinueuse :
//  - le bras DROIT prolonge le fût (rayon 0,2·k jusqu'à 4,3 m, presque vertical en sortant) : c'est lui qui ferme le
//    haut du fût (voir futPlatane) ;
//  - au premier rang, JAMAIS vers le plateau (taillé). DEUX bras LONGENT le grillage, un de chaque côté (à 0,1 rad
//    près de +x et de -x ; 8 à 15°, puis à plat, puis 12 à 25° ; 4,4 à 5,8 m de long) : ce sont eux qu'on voit sur la
//    photo 40, sous la voûte, d'un fût à l'autre. Leur premier coude part vers le bosquet : ils restent derrière le
//    grillage (z ≤ -9,6). Un bras BAS part vers le bosquet (8 à 18°, presque à plat, puis 30 à 45° dans la
//    couronne), un autre MONTE en biais (25 à 38°, 32 à 45°, 50 à 65°) et se perd dans les feuilles — la fourche ;
//  - au fond, trois ou quatre bras BAS dans tous les sens, qui retombent en arc (10 à 20°, 0 à 8°, -5 à 15° ; 3,5 à
//    5 m de long). Sombres comme leur fût, ils ne barrent plus le jour d'un trait pâle ;
//  - aucun ne s'approche du filet du quai (le bout du bras à x = 5,3 au plus, pour que tête et pousses restent en
//    deçà de 6,3 : le bras de l'arbre du quai qui part vers la Seine est raccourci, il s'arrêtait dans le rideau,
//    dont les feuilles descendent contre le filet, x = 6,5), ni à moins de 0,8 m du mur du bosquet.
// Pas de bois au-dessus de 4,6 m environ (1,4 m au-dessus de la tête du fût) : chaque tube y est COUPÉ, avec un
// dernier point interpolé — plus haut, les bras traversaient le haut des couronnes, alors que sur la photo 40 on ne
// voit le bois que sous les feuilles. Chaque bras finit SANS POINTE (rayon 0,085·k) sur une TÊTE DE CHAT : un nœud
// écrasé, plus sombre, d'où partent quatre à six pousses de 0,5 à 0,9 m (deux sur téléphone), dont le bout ne dépasse
// jamais 5 m. Elles remplacent les deux rameaux qui montaient à 45-65° et ressortaient du haut des couronnes.
// `x1` : x du pied dans le repère du terrain 1 ; `R` : le hasard de l'arbre (hasardPlatane).
function brasPlatane(t, bois, x1, R) {
  const r1 = t.rang === 1, PI = Math.PI, deg = PI / 180;
  const kb = r1 ? t.k : t.k * 1.1;                  // (au premier rang, les bras suivent le diamètre de leur fût)
  const yCoupe = Math.min(4.65, t.h0 + 1.4), Y_POUSSES = 5.0;
  // le pied du mur du bosquet, repère du terrain 1 (les sommets de ligneMurBosquet) : son x à la profondeur z,
  // retour compris
  const MUR = [[-23.7, -9.2], [-21.9, -14.3], [-19.8, -19.7], [-16.5, -25.7], [-14.5, -31.0]];
  const murX = (z) => {
    if (z >= MUR[0][1]) return MUR[0][0];
    for (let i = 1; i < MUR.length; i++) {
      const [xa, za] = MUR[i - 1], [xb, zb] = MUR[i];
      if (z >= zb) return xa + (xb - xa) * (z - za) / (zb - za);
    }
    return -14.5 + (z + 31.0) * 0.75 / 0.66;
  };
  // [azimut, genre] : 'long' (le long du grillage), 'bas' (à plat), 'monte' (en biais), 'droit' (le prolongement du fût)
  let az;
  if (r1) {
    const s = x1 > 0 ? -1 : (R() < 0.5 ? -1 : 1);
    // (dans la boîte de la caméra de diffusion, où les feuilles reculent derrière le grillage, le bras en biais et le
    // bras droit partent plus vers le fond)
    const b = frontPlatane(x1) < -8.5 ? 0.45 : 0;
    az = [[R(-0.1, 0.1), 'long'], [PI + R(-0.1, 0.1), 'long'], [-PI / 2 + R(-0.35, 0.35), 'bas'],
      [(s > 0 ? -0.75 * PI : -0.25 * PI) + R(-0.25, 0.25) * (b ? 0.4 : 1), 'monte'],
      [-PI / 2 + R(-1.2, 1.2) * (b ? 0.4 : 1), 'droit']];
  } else {
    const n = R() < 0.35 ? 3 : 4, a0 = R() * 2 * PI;
    az = [];
    for (let i = 0; i < n; i++) az.push([a0 + i * 2 * PI / n + R(-25, 25) * deg, 'bas']);
    az.push([R() * 2 * PI, 'droit']);
  }
  const couleur = t.couleur;
  // la tête de chat : le bois de taille, bosselé, 0,6 fois plus sombre que la branche qui la porte
  const sombre = (p, n) => couleur(p, n).map((c) => c * 0.6);
  // (sur téléphone, moins d'anneaux et de côtés : le double de branches et leurs têtes y coûtent moins que les
  // anciennes charpentes)
  const NS = LEGER ? 10 : 16, cotes = LEGER ? (r1 ? 6 : 5) : (r1 ? 8 : 6);
  const RK = [0.2, 0.17, 0.14, 0.11, 0.085].map((r) => r * kb);
  const rK = (i) => { const u = (i / NS) * 4, j = Math.min(3, Math.floor(u)); return RK[j] + (RK[j + 1] - RK[j]) * (u - j); };
  // (le bras droit sort du fût à son rayon, 0,235·k, pour cacher l'épaule qui le ferme — plus mince, il y dessinait
  // une pointe de crayon —, passe à 0,2·k un demi-mètre plus haut, le garde jusqu'à 4,3 m, puis s'amincit jusqu'à
  // la coupe)
  const rDroit = (y) => t.k * (0.235 - 0.035 * Math.min(1, Math.max(0, (y - t.h0 - 0.1) / 0.5))
    - 0.06 * Math.min(1, Math.max(0, (y - 4.3) / 0.35)));
  const UP = new THREE.Vector3(), D = new THREE.Vector3(), P = new THREE.Vector3(), Nn = new THREE.Vector3();
  for (const [phi, genre] of az) {
    let L, E;
    if (genre === 'long') { L = [R(1.6, 2.0), R(1.6, 2.2), R(1.2, 1.6)]; E = [R(8, 15), R(-5, 5), R(12, 25)]; }
    else if (genre === 'bas' && !r1) {
      const tot = R(3.5, 5), f1 = R(0.3, 0.4), f2 = R(0.33, 0.4);
      L = [tot * f1, tot * f2, tot * (1 - f1 - f2)]; E = [R(10, 20), R(0, 8), R(-5, 15)];
    } else if (genre === 'bas') { L = [R(1.4, 1.8), R(1.5, 2.0), R(1.0, 1.4)]; E = [R(8, 18), R(-6, 4), R(30, 45)]; }
    else if (genre === 'droit') { L = [R(0.7, 0.9), R(0.9, 1.2), R(0.8, 1.0)]; E = [R(80, 86), R(62, 75), R(68, 80)]; }
    else { L = [R(0.9, 1.2), R(1.0, 1.3), R(0.8, 1.0)]; E = [R(25, 38), R(32, 45), R(50, 65)]; }
    E = E.map((e) => e * deg);
    // la portée, bornée par le grillage du quai et par le mur du bosquet (tous les tronçons raccourcis d'autant)
    const portee = L[0] * Math.cos(E[0]) + L[1] * Math.cos(E[1]) + L[2] * Math.cos(E[2]);
    const xb = x1 + Math.cos(phi) * portee, xm = murX(t.z + Math.sin(phi) * portee) + 0.8;
    let f = 1;
    if (xb > 5.3) f = (5.3 - x1) / (xb - x1);
    if (xb < xm && x1 > xm) f = Math.min(f, (x1 - xm) / (x1 - xb));
    f = Math.max(0.35, f);
    for (let i = 0; i < 3; i++) L[i] *= f;
    // (les bras du grillage coudent d'abord vers le bosquet, jamais vers le plateau)
    const sg = genre === 'long' ? (Math.cos(phi) > 0 ? -1 : 1) : (R() < 0.5 ? -1 : 1);
    const d1 = sg * R(5, 15) * deg, d2 = -sg * R(5, 15) * deg;
    const A = [phi, phi + d1, phi + d1 + d2];
    const [a0, a1] = t.axe, dans = a1.clone().lerp(a0, 0.35 / a0.distanceTo(a1));
    // (le bras droit sort dans l'axe du fût, les autres par son flanc)
    const e0 = genre === 'droit' ? 0.03 : 0.18;
    const sortie = t.fourche.clone().add(UP.set(Math.cos(phi) * e0 * t.k, 0.12, Math.sin(phi) * e0 * t.k));
    const pts = [dans, sortie];
    for (let i = 0; i < 3; i++) {
      const p = pts[i + 1].clone();
      p.x += Math.cos(A[i]) * Math.cos(E[i]) * L[i]; p.y += Math.sin(E[i]) * L[i]; p.z += Math.sin(A[i]) * Math.cos(E[i]) * L[i];
      pts.push(p);
    }
    for (const p of pts) p.z = Math.min(p.z, -9.6);           // rien au-dessus du plateau, écorce comprise
    const courbe = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const ech = [], rs = [];
    for (let i = 0; i <= NS; i++) {
      const p = courbe.getPoint(i / NS);
      if (i > 2 && i < NS) { p.x += R(-0.035, 0.035); p.y += R(-0.03, 0.03); p.z = Math.min(-9.6, p.z + R(-0.035, 0.035)); }
      ech.push(p); rs.push(genre === 'droit' ? rDroit(p.y) : rK(i));
    }
    // la coupe sous la voûte : le premier échantillon au-dessus de yCoupe est ramené sur elle — ou lâché s'il y
    // tomberait à moins d'un dixième du précédent (deux anneaux confondus : le tube n'aurait plus de direction)
    for (let i = 1; i < ech.length; i++) {
      if (ech[i].y <= yCoupe) continue;
      const u = (yCoupe - ech[i - 1].y) / (ech[i].y - ech[i - 1].y);
      if (u < 0.1) { ech.length = i; rs.length = i; }
      else {
        ech[i] = ech[i - 1].clone().lerp(ech[i], u); rs[i] = rs[i - 1] + (rs[i] - rs[i - 1]) * u;
        ech.length = i + 1; rs.length = i + 1;
      }
      break;
    }
    bois.push(tubePlatane(ech, (i) => rs[i], cotes, couleur));
    // (les bras presque à plat, gardés pour les grappes qui pendent entre eux : voir couronnePlatane)
    if (genre === 'long' || genre === 'bas') (t.bras || (t.bras = [])).push(ech.slice());

    // LA TÊTE DE CHAT, au bout : un nœud écrasé (1,3 x 0,9), assez gros pour coiffer le bout coupé
    const n = ech.length, bout = ech[n - 1];
    D.subVectors(bout, ech[n - 2]).normalize();
    const rn = Math.max(R(0.11, 0.14), rs[n - 1] * 0.85);
    const c = bout.clone().addScaledVector(D, rn * 0.4);
    c.z = Math.min(c.z, -9.6);
    const tete = new THREE.SphereGeometry(rn, LEGER ? 6 : 8, LEGER ? 4 : 6);
    tete.scale(1.3, 0.9, 1.3); tete.translate(c.x, c.y, c.z);
    const nv = tete.attributes.position.count, col = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) {
      col.set(sombre(P.fromBufferAttribute(tete.attributes.position, i), Nn.fromBufferAttribute(tete.attributes.normal, i)), i * 3);
    }
    tete.setAttribute('color', new THREE.BufferAttribute(col, 3));
    bois.push(tete);
    // et ses POUSSES : quatre à six brins de 0,5 à 0,9 m (rayon 0,012 à 0,004), en éventail autour du bras, qui
    // montent de 30 à 70° — moins quand leur bout passerait 5 m
    const nP = LEGER ? 2 : 4 + Math.floor(R(0, 3)), aB = Math.atan2(D.z, D.x);
    for (let j = 0; j < nP; j++) {
      const a = aB + R(-1.3, 1.3), l = R(0.5, 0.9);
      const b0 = c.clone().add(UP.set(Math.cos(a) * rn, rn * 0.4, Math.sin(a) * rn));
      const e = Math.min(R(30, 70) * deg, Math.asin(Math.max(-0.4, Math.min(1, (Y_POUSSES - b0.y) / l))));
      const pb = b0.clone().add(UP.set(Math.cos(a) * Math.cos(e) * l, Math.sin(e) * l, Math.sin(a) * Math.cos(e) * l));
      const m = b0.clone().lerp(pb, 0.5); m.y += 0.04 * l * Math.cos(e);
      for (const p of [b0, m, pb]) p.z = Math.min(p.z, -9.6);
      bois.push(tubePlatane([b0, m, pb], (i) => [0.012, 0.008, 0.004][i], LEGER ? 3 : 4, couleur));
    }
  }
}

// Un tube de bois le long d'une polyligne : anneaux orientés par transport parallèle (pas de torsion d'un
// tronçon à l'autre, contrairement à des cylindres posés bout à bout), rayon par anneau `rayon(i, angle)`,
// couleur par sommet `couleur(point, normale)`. L'écorce est plaquée sans étirement : une tuile de texture
// fait un tour en largeur et deux circonférences en longueur.
function tubePlatane(pts, rayon, cotes, couleur) {
  const n = pts.length, pos = [], nor = [], uv = [], col = [], idx = [];
  const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), d = new THREE.Vector3();
  const vEch = 2 * Math.PI * rayon(0, 0) * 2;
  let v = 0;
  for (let i = 0; i < n; i++) {
    T.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
    if (i === 0) N.crossVectors(T, Math.abs(T.y) < 0.9 ? d.set(0, 1, 0) : d.set(1, 0, 0)).normalize();
    else { N.addScaledVector(T, -N.dot(T)).normalize(); v += pts[i].distanceTo(pts[i - 1]) / vEch; }
    B.crossVectors(T, N);
    for (let j = 0; j <= cotes; j++) {
      const a = (j / cotes) * Math.PI * 2;
      d.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      const r = rayon(i, a), c = couleur(pts[i], d);
      pos.push(pts[i].x + d.x * r, pts[i].y + d.y * r, pts[i].z + d.z * r);
      nor.push(d.x, d.y, d.z); uv.push(j / cotes, v); col.push(c[0], c[1], c[2]);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < cotes; j++) {
      const a = i * (cotes + 1) + j, b = a + cotes + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);                 // faces tournées vers l'extérieur
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

// LA COURONNE : des GRAPPES, pas une nappe. Sur les photos 40 et 41, chaque platane est un dôme bosselé à lui, que
// l'on distingue de ses voisins par les creux sombres entre les bosses et par le ciel entre les sommets ; le
// feuillage s'y groupe en grappes éclairées dessus, sombres dessous et au cœur. On bâtit donc :
//  - une ENVELOPPE en œuf : dessous presque plat à 3,1-3,6 m, ventre vers 40 % de la hauteur, sommet arrondi à
//    9,3-10,1 m au premier rang, 9,6-10,6 m derrière (photo 40 : la ligne de faîte). Rayon de 3,7 à 4,5 m : les
//    couronnes se touchent au ventre, pas au sommet — le ciel descend entre elles ;
//  - sur elle, 12 à 15 GRAPPES (boules de 1 à 1,9 m, plus petites au sommet), au pas de l'angle d'or, plus quatre
//    grappes aplaties dessous (elles ferment la voûte vue du plateau) et deux au cœur (on ne voit pas au travers) ;
//  - sur chaque grappe, des RAMEAUX (plans de 0,8 à 1,3 m, feuilles de 13 à 18 cm) : couchés sur sa face externe,
//    quelques-uns en travers (le bord de la grappe se découpe en dentelle au lieu de s'effacer), des TOUPETS
//    debout sur les grappes du haut (la silhouette en flammes sur le ciel), des rameaux PENDANTS dessous ;
//  - l'ÉCLAIRAGE d'une grappe : normale tirée de SON centre (60 %) et de celui de la couronne (40 %), teinte plus
//    sombre sur sa face interne et au bas de la couronne, teinte propre à chaque arbre (plus jaune, plus gris) ;
//    et le SOLEIL du soir ne touche que le haut (voir soleilPlatane).
// Au premier rang le centre est reculé de 0,9 m dans le bosquet (1,6 m là où la caméra de diffusion interdit le
// débord, frontPlatane) et le rayon avant se resserre jusqu'au front permis : c'est le dôme qui se resserre, pas
// une coupe (tronquées au ras du grillage, les couronnes faisaient une falaise). Chaque plan passe ensuite par
// `contraindre` (limitesPlatanes), coins compris. Festons : trois ou quatre rameaux pendent du bord jusqu'à
// 2,8-3,1 m, derrière le grillage ; l'arbre du mur (x ≈ -16,6) en a un plus long vers x = -13, jusqu'à 2,5 m
// (photo 40). `x1` : x du pied dans le repère du terrain 1 ; `R` : le hasard de l'arbre.
function couronnePlatane(t, cartes, contraindre, x1, R) {
  const r1 = t.rang === 1, PI = Math.PI;
  const lisse = (a, b, v) => { const u = Math.min(1, Math.max(0, (v - a) / (b - a))); return u * u * (3 - 2 * u); };
  const yB = r1 ? R(3.3, 3.6) : R(3.1, 3.5);
  const yT = (r1 ? 9.7 : t.rang === 2 ? 10.0 : 10.2) + R(-0.4, 0.4);
  const Rh = r1 ? R(4.0, 4.5) : R(3.7, 4.4);
  const zF = frontPlatane(x1), boite = zF < -8.5;
  const xc = t.x + R(-0.25, 0.25), zc = t.z + (r1 ? (boite ? -1.6 : -0.9) : R(-0.4, 0.4));
  const Rf = r1 ? Math.max(1.7, Math.min(Rh, zF - 0.35 - zc)) : Rh * R(0.92, 1.05), Rb = Rh * R(0.95, 1.1);
  const H = yT - yB, ym = yB + 0.42 * H;
  // le profil de l'œuf (rayon relatif à la hauteur relative s) et un point de l'enveloppe (q : 0 à l'axe, 1 au bord)
  const prof = (s) => s < 0.42 ? 0.8 + 0.2 * Math.sin(s / 0.42 * PI / 2) : Math.pow(Math.max(0, 1 - ((s - 0.42) / 0.58) ** 2), 0.8);
  const pt = (q, a) => { const s = Math.sin(a); return [xc + Math.cos(a) * q * Rh, zc + s * q * (s > 0 ? Rf : Rb)]; };
  // la teinte de l'arbre : 30 % plus jaunes, 25 % plus gris ; les rangs du fond un peu plus sombres. Le fond est
  // tiré vers l'olive : à l'ombre du soir (ciel et carte HDR), la palette sortait gris-bleu (teinte 105 à 150 sur
  // la pose de la photo 40, contre 80 à 90 sur la photo)
  const tir = R(), teinte = tir < 0.3 ? [1.07, 1.02, 0.8] : tir < 0.55 ? [1.0, 1.0, 0.92] : [1.04, 1.0, 0.86];
  const clair = 1.5 * R(0.93, 1.07) * (r1 ? 1 : t.rang <= 3 ? 0.96 : 0.92);
  // la hauteur où le soleil du soir arrive (voir soleilPlatane) : côté mur, par-dessus le plateau, il prend les deux
  // tiers de la couronne (photo 40 : les couronnes de gauche dorées) ; côté quai, le rideau et les arbres de la
  // berge le lui prennent jusqu'au sommet
  const yS = 4.6 + 3.4 * lisse(-14, -2, x1);

  const grappes = [];
  const nC = r1 ? 15 : 12;
  for (let i = 0; i < nC; i++) {
    const s = 0.18 + 0.78 * Math.pow((i + R(0.15, 0.85)) / nC, 0.75);
    const rc = (s > 0.8 ? R(1.05, 1.45) : R(1.35, 1.9)) * (r1 ? 1 : 1.05);
    const [x, z] = pt(Math.max(0, prof(s) - 0.72 * rc / Rh), i * 2.39996 + R(-0.35, 0.35));
    grappes.push({ x, y: yB + s * H - (s > 0.8 ? 0.45 : 0.25) * rc, z, r: rc, s, genre: 'coque', ey: 0.85 });
  }
  { const [x, z] = pt(R(0, 0.2), R(0, 2 * PI)); grappes.push({ x, y: yT - 1.0, z, r: R(1.1, 1.4), s: 0.97, genre: 'coque', ey: 0.85 }); }
  for (let i = 0; i < 4; i++) {
    const [x, z] = pt(R(0.25, 0.62), i * PI / 2 + R(-0.5, 0.5));
    grappes.push({ x, y: yB + 0.5, z, r: R(1.4, 1.8), s: 0.04, genre: 'dessous', ey: 0.5 });
  }
  for (let i = 0; i < 2; i++) {
    const [x, z] = pt(R(0, 0.3), R(0, 2 * PI));
    grappes.push({ x, y: yB + H * R(0.35, 0.6), z, r: R(1.6, 2.0), s: 0.5, genre: 'coeur', ey: 0.85 });
  }

  const O = new THREE.Vector3(), D = new THREE.Vector3(), P = new THREE.Vector3();
  const Hh = new THREE.Vector3(), T1 = new THREE.Vector3(), A1 = new THREE.Vector3(), A2 = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3();
  // l'éclairage d'une grappe `g`, de dehors `o` : rend, pour un sommet V, sa normale dans Nv et [r, g, b, soleil]
  const lumiere = (g, o) => {
    const varC = R(0.92, 1.08), ySol = yS + R(-1.1, 1.1);
    const tir = R(), tg = tir < 0.07 ? [1.06, 1.02, 0.84] : tir < 0.15 ? [0.95, 1.0, 1.05] : [1, 1, 1];
    const k = g.genre === 'coeur' ? 0.6 : g.genre === 'dessous' ? 0.84 : 1;
    const oe = o.clone();
    return (V, Nv) => {
      A1.set(V.x - g.x, (V.y - g.y) / g.ey, V.z - g.z).normalize();
      A2.set(V.x - xc, (V.y - ym) * 0.7, V.z - zc).normalize();
      Nv.copy(A1).multiplyScalar(0.6).addScaledVector(A2, 0.4); Nv.y += 0.22; Nv.normalize();
      const face = A1.dot(oe);                                          // -1 face interne, +1 face externe
      // (la couronne entière est une boule éclairée d'en haut et du côté du plateau : ses flancs du fond et le bas de
      // ses côtés s'assombrissent, et c'est ce creux sombre entre deux dômes qui sépare les arbres — photos 40, 41)
      const dome = 0.8 + 0.2 * lisse(-0.5, 0.8, A2.x * 0.28 + A2.y * 0.8 + A2.z * 0.52);
      // (le ventre de la couronne, de 5 à 7 m, est le plus clair : le dessous est à l'ombre, le sommet ne voit que le
      // ciel ; photo 40, luminance 135 au ventre pour 139 au sommet et 80 dessous)
      const v = clair * varC * k * dome * (0.5 + 0.5 * lisse(-0.6, 0.8, face))
        * (0.9 + 0.2 * lisse(yB, yB + 2.5, V.y) - 0.18 * lisse(yB + 4, yT, V.y));
      const sol = 0.1 + 0.9 * lisse(ySol - 1.4, ySol + 1.4, V.y) * lisse(-0.3, 0.5, face) * (g.genre === 'coeur' ? 0.25 : 1);
      return [v * teinte[0] * tg[0], v * teinte[1] * tg[1], v * teinte[2] * tg[2], sol];
    };
  };
  // pose un plan de centre P, normale n, « haut » de texture h (perpendiculaire à n), après contrôle des limites
  // (`contraindre` compte un demi-plan de 0,46 s : on lui passe 1,55 fois le côté, sa demi-diagonale). Un plan du
  // bas de la couronne qui déborde un peu au-dessus du plateau est RECULÉ derrière le grillage plutôt que relevé
  // à 4,5 m : relevé, il vidait tout le bas du front et les charpentières sortaient nues jusqu'à 5 m (photo 40 :
  // les feuilles descendent à 3,3 m juste derrière le grillage)
  const poser = (n, h, w, hh, tuile, ecl) => {
    // (autour du fût, rien sous 3,5 m à l'aplomb, 3,25 m à 0,9 m de lui : la fourche ne se cache pas dans une touffe
    // posée dessus — un moignon —, mais on ne voit pas non plus, sous chaque couronne, le fût coupé net ni un
    // candélabre de bras nus : sur les photos 40 et 41 les feuilles prennent la fourche presque tout de suite)
    const dT = Math.hypot(P.x - t.x, P.z - t.z), yF = 3.25 + 0.25 * Math.max(0, 1 - dT / 0.9);
    if (P.y - 0.4 * hh < yF) P.y = yF + 0.4 * hh;
    const s2 = Math.max(w, hh) * 1.55, e = 0.46 * s2, au = P.z + e + 9.3;
    // (tout entier sous la boîte de la caméra de diffusion — 4,5 m — un plan ne craint que le plateau : il se
    // range derrière le grillage, jusqu'à 2,4 m de recul ; il n'a pas à reculer jusqu'au front de la boîte)
    if (P.y + 0.8 * e < 4.45) {
      if (au > 2.4) return;
      if (au > -0.05) P.z -= au + 0.05 + R(0, 0.2);
      cartes.ajouter(P, n, h, w, hh, tuile, R() < 0.5, ecl);
      return;
    }
    let lim = contraindre(P.x, P.y, P.z, s2);
    if (lim && lim[1] > P.y + 0.3 && au > 0 && au < 1.8) {
      const recul = contraindre(P.x, P.y, P.z - au - R(0.05, 0.3), s2);
      if (recul && recul[1] < P.y + 0.3) lim = recul;
    }
    if (!lim) return;
    P.set(lim[0], lim[1], lim[2]);
    cartes.ajouter(P, n, h, w, hh, tuile, R() < 0.5, ecl);
  };
  const hasard = (v) => { do v.set(R(-1, 1), R(-1, 1), R(-1, 1)); while (v.lengthSq() > 1 || v.lengthSq() < 0.02); return v.normalize(); };

  for (const g of grappes) {
    O.set(g.x - xc, (g.y - ym) * 0.8, g.z - zc);
    if (g.genre === 'dessous') O.set(O.x * 0.4, -Math.hypot(O.x, O.z) * 0.4 - 1, O.z * 0.4);
    if (O.lengthSq() < 1e-4) O.set(0, 1, 0);
    O.normalize();
    const ecl = lumiere(g, O);
    const n = Math.round((g.genre === 'coeur' ? 5 : g.genre === 'dessous' ? 10 : 13) * g.r * g.r);
    for (let k = 0; k < n; k++) {
      hasard(D);
      if (g.genre !== 'coeur') for (let e = 0; e < 4 && D.dot(O) < -0.25; e++) hasard(D);
      if (g.genre !== 'coeur' && D.dot(O) < -0.25) continue;
      const rr = g.r * R(0.72, 1.0);
      P.set(g.x + D.x * rr, g.y + D.y * rr * g.ey, g.z + D.z * rr);
      const u = R();
      if (g.s > 0.7 && D.y > 0.35 && u < 0.38) {
        // un toupet debout : la silhouette en flammes sur le ciel
        const a = Math.atan2(D.z, D.x) + PI / 2 + R(-0.9, 0.9);
        nrm.set(Math.cos(a), 0, Math.sin(a)); Hh.set(0, 1, 0);
        const w = R(0.85, 1.1), hh = R(0.85, 1.1);
        P.y += hh * 0.1;
        poser(nrm, Hh, w, hh, 2, ecl);
      } else if ((g.genre === 'dessous' || D.y < -0.45) && u < 0.45) {
        // un rameau pendant
        const a = R(0, 2 * PI);
        nrm.set(Math.cos(a), 0, Math.sin(a)); Hh.set(0, 1, 0);
        const w = R(0.75, 1.0), hh = R(0.95, 1.25);
        P.y -= hh * 0.3;
        poser(nrm, Hh, w, hh, 3, ecl);
      } else if (g.genre === 'dessous' || D.y < -0.45) {
        // dessous : une grappe DEBOUT, tournée vers le dehors — couchées sur le dessous de la boule, les grappes se
        // voyaient par la tranche depuis le plateau, et la couronne semblait s'arrêter à 5 m
        const a = Math.atan2(D.z, D.x) + R(-0.6, 0.6);
        nrm.set(Math.cos(a), 0, Math.sin(a)); Hh.set(0, 1, 0);
        const w = R(1.0, 1.3), hh = R(0.9, 1.15);
        poser(nrm, Hh, w, hh, 0, ecl);
      } else if (u < 0.14) {
        // un rameau en travers de la coque, pointe vers le dehors : le bord de la grappe en dentelle
        nrm.crossVectors(D, hasard(T1)).normalize(); Hh.copy(D);
        const w = R(0.8, 1.05), hh = R(0.9, 1.2);
        P.addScaledVector(D, hh * 0.25);
        poser(nrm, Hh, w, hh, 1, ecl);
      } else {
        // un rameau couché sur la coque, le haut de la texture vers le ciel (ou vers le dehors s'il est à plat)
        nrm.copy(D).addScaledVector(hasard(T1), 0.45).normalize();
        Hh.copy(UP).addScaledVector(nrm, -nrm.y);
        if (Hh.lengthSq() < 0.06) Hh.copy(O).addScaledVector(nrm, -nrm.dot(O));
        if (Hh.lengthSq() < 1e-4) Hh.set(1, 0, 0).addScaledVector(nrm, -nrm.x);
        Hh.normalize();
        const tuile = D.dot(O) > 0.45 ? 1 : 0, s = tuile ? R(0.85, 1.1) : R(1.0, 1.3);
        poser(nrm, Hh, s, s, tuile, ecl);
      }
    }
  }

  // les festons, derrière le grillage et loin des paniers
  const festons = [];
  for (let f = 0, nf = 3 + (R() < 0.5 ? 1 : 0); f < nf; f++) {
    for (let e = 0; e < 12; e++) {
      const [x, z] = pt(R(0.72, 0.9), R(0, 2 * PI));
      if (z < -9.9) { festons.push([x, z, R(2.8, 3.1)]); break; }
    }
  }
  if (r1 && x1 < -15) { const [x, z] = pt(0.62, R(-0.3, 0)); festons.push([x, z, 2.5]); }
  for (const [x, z, bas] of festons) {
    const g = { x, y: yB, z, r: 1.2, genre: 'dessous', ey: 0.6 };
    O.set(x - xc, -0.3, z - zc).normalize();
    const ecl = lumiere(g, O);
    for (let y = yB + 0.25; y - 0.45 > bas;) {
      const hh = R(0.9, 1.15), a = R(0, 2 * PI);
      P.set(x + R(-0.12, 0.12), y - hh * 0.5, z + R(-0.12, 0.12));
      nrm.set(Math.cos(a), 0, Math.sin(a)); Hh.set(0, 1, 0);
      poser(nrm, Hh, R(0.7, 0.9), hh, 3, ecl);
      P.set(x + R(-0.12, 0.12), y - hh * 0.5, z + R(-0.12, 0.12));
      nrm.set(-Math.sin(a), 0, Math.cos(a));
      poser(nrm, Hh, R(0.6, 0.8), hh * 0.9, 3, ecl);
      y -= hh * 0.62;
    }
  }

  // LES GRAPPES DES BRAS (lot L3). Photos 340 et 603 : entre les charpentières, des rameaux pendent jusqu'à 2,8-3 m ;
  // dans le jeu, les bras filaient nus sous une voûte qui commençait net au-dessus d'eux, comme une pergola. Deux ou
  // trois rameaux pendants (tuile 3) par bras presque à plat (brasPlatane, `t.bras`), accrochés au bras, tous
  // derrière le grillage (les bras le sont : z ≤ -9,6). Posés sans passer par `poser`, dont la règle « rien sous
  // 3,25 m » vaut pour la couronne, pas pour ces rameaux. En dernier : le hasard de la couronne ne change pas.
  for (const bras of t.bras || []) {
    for (let k = 0, nb = r1 ? 3 : 2; k < nb; k++) {
      const p = bras[Math.min(bras.length - 1, Math.floor(bras.length * R(0.3, 0.95)))];
      if (p.y < 3.25) continue;
      const bas = R(2.8, 3.05), hh = Math.min(1.35, Math.max(0.8, p.y + 0.1 - bas)), w = R(0.6, 0.85), a = R(0, 2 * PI);
      P.set(p.x + R(-0.12, 0.12), p.y + 0.1 - hh * 0.5, Math.min(p.z + R(-0.12, 0.12), -9.65 - 0.5 * w));
      O.set(p.x - xc, -0.3, p.z - zc).normalize();
      const ecl = lumiere({ x: p.x, y: p.y - 0.4, z: p.z, r: 1.0, genre: 'dessous', ey: 0.6 }, O);
      nrm.set(Math.cos(a), 0, Math.sin(a)); Hh.set(0, 1, 0);
      cartes.ajouter(P, nrm, Hh, w, hh, 3, R() < 0.5, ecl);
    }
  }
}

// L'ACCUMULATEUR DES PLANS DE LA VOÛTE : un seul maillage pour toutes les couronnes, écrit directement dans des
// tableaux (des milliers de petits plans : pas de géométrie par plan à fusionner ensuite). Chaque plan prend une
// tuile de l'atlas (feuillagePlatane) — 0 grappe, 1 rameau, 2 toupet, 3 pendant —, retournée une fois sur deux.
// Attributs : `normal` (celle du volume, pour l'éclairage), `color` (occlusion et teinte), `sol` (la part de soleil
// direct, pour soleilPlatane). (L'attribut `pn`, la normale du plan pour l'ancien tranchePlatane, n'est plus : voir
// materiauFeuilles, la tranche.)
function cartesPlatane() {
  const pos = [], nor = [], uv = [], col = [], sol = [], idx = [];
  const A = new THREE.Vector3(), V = new THREE.Vector3(), N = new THREE.Vector3();
  return {
    ajouter(P, n, h, w, hh, tuile, miroir, eclairer) {
      A.crossVectors(h, n).normalize();
      const i0 = pos.length / 3, u0 = (tuile % 2) * 0.5, v0 = 0.5 - Math.floor(tuile / 2) * 0.5;
      for (const [su, sv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        V.copy(P).addScaledVector(A, su * w / 2).addScaledVector(h, sv * hh / 2);
        pos.push(V.x, V.y, V.z);
        const c = eclairer(V, N);
        nor.push(N.x, N.y, N.z); col.push(c[0], c[1], c[2]); sol.push(c[3]);
        const uu = (miroir ? -su : su) * 0.5 + 0.5, vv = sv * 0.5 + 0.5;
        uv.push(u0 + 0.004 + uu * 0.492, v0 + 0.004 + vv * 0.492);
      }
      idx.push(i0, i0 + 1, i0 + 2, i0 + 2, i0 + 1, i0 + 3);
    },
    geometrie() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setAttribute('sol', new THREE.Float32BufferAttribute(sol, 1));
      g.setIndex(idx);
      g.computeBoundingSphere();
      return g;
    },
  };
}

// LE SOLEIL DU SOIR SUR LA VOÛTE. Les couronnes ne reçoivent pas d'ombre portée (elles s'ombreraient de part en
// part) : le soleil bas (5°, depuis le pin et le quai) les éclairait donc de face, du dessous au sommet, et la
// voûte sortait en aplat uniforme. Sur les photos, le pin, le talus et le rideau du quai leur prennent ce soleil :
// seul le HAUT des couronnes est doré (panorama de 18 h 56), le ventre et le dessous sont dans l'ombre bleutée du
// soir. L'attribut `sol` (0 à 1, par sommet : la hauteur, la face de la grappe) multiplie la lumière directe.
// Le reflet du ciel (spéculaire indirect) est ramené au tiers : les feuilles de platane sont mates, et ce reflet
// bleu, que Fresnel pousse au blanc sur les plans de biais, glaçait la voûte de cyan (photos : vert-de-gris).
// (L'atlas est plus large que 512 texels : materiauFeuilles le sait par `taille`, voir platanes.)
// (Les plans vus par la tranche — les « balafres » diagonales des couronnes — s'effacent en fondu dans
// materiauFeuilles, pour tous les feuillages depuis le lot L3 : l'ancien tranchePlatane lisait la normale du plan dans
// un attribut `pn`, elle se lit maintenant dans les dérivées écran de la position, sans attribut.)
function soleilPlatane(m) {
  const base = m.onBeforeCompile, cle = m.customProgramCacheKey();
  m.onBeforeCompile = (sh, r) => {
    base(sh, r);
    sh.vertexShader = 'attribute float sol;\nvarying float vSol;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSol = sol;');
    sh.fragmentShader = 'varying float vSol;\n' + sh.fragmentShader
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.directDiffuse *= vSol;\n'
        + 'reflectedLight.directSpecular *= vSol;\nreflectedLight.indirectSpecular *= 0.35;');
  };
  m.customProgramCacheKey = () => cle + '-soleil';
}

// Écorce de platane (256 x 512, environ 6 mm par pixel sur le fût) : fond CRÈME ROSÉ #d6ccc4 (teinte 25° ; photos
// 40, 602 et 603 : le fût clair du premier rang tire au rose-beige, pas au jaune), de grandes marbrures à peine plus
// sombres, puis 85 GRANDES plaques de 5 à 12 cm sur 7 à 21 cm aux bords dentelés, qui couvrent à peu près la
// moitié — gris rosé #b3a79d (50 %), #948880 (32 %), brun-gris #6e625b (18 %), chacune au cœur plus clair — et des
// écailles fraîches presque blanches #ece6df. Les plaques olive d'avant (#aaa58b...) faisaient un fût gris-vert ;
// petites (3 à 8 cm), un moucheté, là où la photo montre de larges pans d'écorce tombée. Plus sombres et unies, les
// plaques faisaient un pelage de girafe ; la première version, qui couvrait tout le fond de grandes taches, un fût
// gris-olive de camouflage. Les plaques sont recopiées de l'autre côté des bords : la tuile se raccorde en largeur
// (le tour du fût) comme en hauteur.
function ecorcePlatane(canvasTex) {
  const cuite = texCuite(ecorcePlatane, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#d6ccc4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {                     // grain
      const v = Math.floor(rnd(180, 225));
      g.fillStyle = `rgba(${v},${v - 7},${v - 13},${rnd(0.15, 0.4)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 2.5), rnd(1, 4));
    }
    const plaque = (cx, cy, rx, ry, fond, cerne, coeur = '#c9beb5') => {
      const n = 11, P = [];
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, rr = rnd(0.62, 1.1); P.push([Math.cos(a) * rx * rr, Math.sin(a) * ry * rr]); }
      const dx = [0], dy = [0];
      if (cx - rx * 1.1 < 0) dx.push(w); if (cx + rx * 1.1 > w) dx.push(-w);
      if (cy - ry * 1.1 < 0) dy.push(h); if (cy + ry * 1.1 > h) dy.push(-h);
      for (const ox of dx) for (const oy of dy) {
        g.beginPath();
        for (let k = 0; k <= n; k++) {                   // courbes par les milieux : un bord arrondi et dentelé
          const a = P[k % n], b = P[(k + 1) % n];
          const mx = cx + ox + (a[0] + b[0]) / 2, my = cy + oy + (a[1] + b[1]) / 2;
          if (k === 0) g.moveTo(mx, my); else g.quadraticCurveTo(cx + ox + a[0], cy + oy + a[1], mx, my);
        }
        g.closePath(); g.fillStyle = fond; g.fill();
        if (cerne) { g.strokeStyle = 'rgba(92,80,74,0.28)'; g.lineWidth = 1; g.stroke(); }
      }
      // un cœur plus clair, décentré : l'écaille est bombée et pâlit au milieu (sinon un pelage à taches unies)
      if (rx > 6) {
        const a = g.globalAlpha; g.globalAlpha = a * 0.45;
        g.beginPath(); g.ellipse(cx + rnd(-0.25, 0.25) * rx, cy + rnd(-0.25, 0.25) * ry, rx * 0.5, ry * 0.5, 0, 0, Math.PI * 2);
        g.fillStyle = coeur; g.fill(); g.globalAlpha = a;
      }
    };
    for (let i = 0; i < 22; i++) {                       // marbrures
      g.globalAlpha = rnd(0.2, 0.35);
      plaque(Math.random() * w, Math.random() * h, rnd(25, 45), rnd(40, 80), Math.random() < 0.5 ? '#bdb2a9' : '#c9bfb6', false);
    }
    // (85 plaques : trois fois plus grandes qu'avant, elles couvrent toujours à peu près la moitié du fond)
    for (let i = 0; i < 85; i++) {
      const u = Math.random();
      g.globalAlpha = rnd(0.5, 0.8);
      plaque(Math.random() * w, Math.random() * h, rnd(8, 20), rnd(12, 35), u < 0.5 ? '#b3a79d' : u < 0.82 ? '#948880' : '#6e625b', Math.random() < 0.5);
    }
    for (let i = 0; i < 45; i++) {                       // écailles fraîches, presque blanches
      g.globalAlpha = rnd(0.55, 0.85);
      plaque(Math.random() * w, Math.random() * h, rnd(5, 12), rnd(8, 20), '#ece6df', false, '#f5f1ec');
    }
    g.globalAlpha = 1;
  }, [1, 1], false, 4);
}

// L'ATLAS DES RAMEAUX DE PLATANE (1024 x 1024 ; 512 sur téléphone, voir canvasTex) : quatre tuiles pour les plans
// de 0,7 à 1,3 m des couronnes (couronnePlatane) — 0 GRAPPE (huit brindilles en éventail sur un fond de feuilles,
// dense), 1 RAMEAU (cinq brindilles, plus ajouré : le bord des grappes), 2 TOUPET (quatre brindilles dressées : la
// silhouette sur le ciel), 3 PENDANT (quatre brindilles qui retombent : le dessous et les festons). Les feuilles
// sont PALMÉES à cinq lobes — trois grands pointus à échancrure profonde, deux petits à la base —, bord denté,
// nervures claires, attachées aux brindilles par leur pétiole, d'une vingtaine de centimètres près de la base à
// 12 cm au bout (les rameaux s'affinent vers le dehors : feuilles plus petites au bord, plus grandes au cœur).
// Celles du fond sont plus sombres, la tuile plus claire en haut qu'en bas. Palette vert-de-gris PEU SATURÉE,
// recalée sur le rendu contre l'enrobé (les couleurs relevées sur les photos 40 et 41, posées telles quelles,
// sortaient deux fois trop vertes sous la lumière du soir et l'ACES), et deux fois moins de feuilles jaunies ou
// brunes qu'avant : semées une à une, elles faisaient une tenue de camouflage. Sous les feuilles, un voile
// presque transparent de la couleur moyenne : le mipmap moyenne alors du vert, pas le noir des pixels vides.
// Ces feuilles dessinées ne restent que si la photo (tex/feuilles_platane) ne charge pas : voir feuillesReelles.
const PAL_PLATANE = [[[132, 150, 128], 0.36], [[106, 124, 104], 0.31], [[152, 170, 142], 0.19], [[160, 160, 124], 0.06],
                     [[86, 100, 84], 0.07], [[128, 122, 100], 0.01]];
function tirerTonPlatane() { let u = Math.random(); for (let i = 0; i < PAL_PLATANE.length; i++) { u -= PAL_PLATANE[i][1]; if (u < 0) return i; } return 0; }
function feuillagePlatane(canvasTex) { return avecTeinte(feuillagePlataneBrut(canvasTex), TEINTES_FEUILLES.platanes); }
function feuillagePlataneBrut(canvasTex) {
  const cuite = texCuite(feuillagePlataneBrut, arguments, [rameauxPlatane, PAL_PLATANE, tirerTonPlatane]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(1024, 1024, (g, w) => {
    const rgb = (c, k) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
    // le contour, en (angle depuis la pointe, rayon) autour de l'attache du pétiole : lobe basal, sinus, lobe
    // latéral, sinus, lobe central, et le symétrique
    const BORD = [[-Math.PI, 0.1], [-1.95, 0.46], [-1.5, 0.27], [-0.98, 0.9], [-0.52, 0.5], [0, 1.0],
                  [0.52, 0.5], [0.98, 0.9], [1.5, 0.27], [1.95, 0.46], [Math.PI, 0.1]];
    // (x, y) : le bout du pétiole, sur la brindille ; L : la feuille entière ; rot : 0 = pointe vers le haut
    rameauxPlatane(g, w, (x, y, L, rot, ton, k) => {
      const c = PAL_PLATANE[ton][0].map((v) => v * k), R = 0.75 * L;
      g.save(); g.translate(x, y); g.rotate(rot); g.translate(0, -0.25 * L); g.scale(1, rnd(0.75, 1));
      const gr = g.createLinearGradient(0, R * 0.25, 0, -R);
      gr.addColorStop(0, rgb(c, 0.8)); gr.addColorStop(1, rgb(c, 1.1));
      g.fillStyle = gr; g.beginPath();
      for (let i = 0; i < BORD.length; i++) {
        const [a, r] = BORD[i], px = Math.sin(a) * r * R, py = -Math.cos(a) * r * R;
        if (i === 0) { g.moveTo(px, py); continue; }
        const [a0, r0] = BORD[i - 1], am = (a0 + a) / 2, rm = (r0 + r) / 2 * 1.08;   // une dent à mi-côté
        g.lineTo(Math.sin(am) * rm * R, -Math.cos(am) * rm * R); g.lineTo(px, py);
      }
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(40,50,30,0.45)'; g.lineWidth = 1; g.stroke();
      g.strokeStyle = 'rgba(220,225,180,0.3)'; g.lineWidth = 1.2; g.beginPath();
      for (const [a, r] of [[-1.95, 0.46], [-0.98, 0.9], [0, 1.0], [0.98, 0.9], [1.95, 0.46]]) {
        g.moveTo(0, 0); g.lineTo(Math.sin(a) * r * R * 0.85, -Math.cos(a) * r * R * 0.85);
      }
      g.stroke();
      g.strokeStyle = rgb(c, 0.7); g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, R * 0.38); g.stroke();
      g.restore();
    });
  }, null, true, 8);
}

// LA MISE EN PAGE DES QUATRE TUILES, commune aux feuilles dessinées et aux feuilles photographiées : `feuille(x, y,
// L, rot, ton, k)` pose une feuille (bout du pétiole en x, y ; longueur L, pétiole compris ; rot = 0 pointe en
// haut ; ton = indice de PAL_PLATANE ; k = clarté). Les brindilles partent d'un point de base (en bas, ou en haut
// pour la tuile pendante), en éventail, et se courbent un peu vers le dehors ; les feuilles y sont par paires
// alternées, écartées de 30 à 70° de la brindille, de plus en plus petites vers le bout (x 0,6), une feuille au
// bout. Le fond : des feuilles plus sombres semées dans l'ovale de la tuile, plus serrées au centre. Il faut que
// ce soit DENSE : une platane en été est une masse de feuilles qui se recouvrent (panorama de 18 h 56) ; semées
// à claire-voie, les feuilles faisaient un olivier moucheté de ciel.
function rameauxPlatane(g, W, feuille) {
  const T = W / 2, deg = Math.PI / 180, marge = 0.04 * T;
  // by : base des brindilles (fraction de tuile) ; sens : 1 dressé, -1 pendant ; n brindilles dans ± ouv degrés,
  // de longueur lg (fraction de tuile), m nœuds ; L0 : la feuille à la base ; fond : feuilles dans l'ovale ov
  const TUILES = [
    { by: 0.93, sens: 1, n: 8, ouv: 70, lg: [0.4, 0.62], m: 7, L0: 0.2, fond: 70, ov: [0.5, 0.5, 0.4, 0.4] },
    { by: 0.96, sens: 1, n: 5, ouv: 42, lg: [0.6, 0.84], m: 8, L0: 0.17, fond: 22, ov: [0.5, 0.48, 0.3, 0.34] },
    { by: 0.97, sens: 1, n: 4, ouv: 20, lg: [0.7, 0.88], m: 8, L0: 0.17, fond: 20, ov: [0.5, 0.45, 0.24, 0.36] },
    { by: 0.04, sens: -1, n: 4, ouv: 30, lg: [0.62, 0.86], m: 8, L0: 0.18, fond: 20, ov: [0.5, 0.56, 0.28, 0.36] },
  ];
  TUILES.forEach((o, k) => {
    const ox = (k % 2) * T, oy = Math.floor(k / 2) * T;
    const dedans = (x, y) => x > ox + marge && x < ox + T - marge && y > oy + marge && y < oy + T - marge;
    const clarte = (y) => o.sens > 0 ? 1.12 - 0.3 * (y - oy) / T : 0.9 + 0.12 * (y - oy) / T;
    const bout = (x, y, L, rot) => dedans(x + Math.sin(rot) * L, y - Math.cos(rot) * L);
    const avant = [], brins = [];
    // le fond, plus serré au centre
    for (let i = 0; i < o.fond; i++) {
      const a = Math.random() * 2 * Math.PI, d = Math.pow(Math.random(), 0.7);
      const x = ox + T * (o.ov[0] + Math.cos(a) * d * o.ov[2]), y = oy + T * (o.ov[1] + Math.sin(a) * d * o.ov[3]);
      const L = o.L0 * T * rnd(0.8, 1.05) * (1 - 0.3 * d), rot = (o.sens > 0 ? 0 : Math.PI) + Math.cos(a) * 1.2 + rnd(-0.5, 0.5);
      if (bout(x, y, L, rot)) feuille(x, y, L, rot, tirerTonPlatane(), 0.74 * clarte(y) * rnd(0.9, 1.05));
    }
    // les brindilles et leurs feuilles
    for (let i = 0; i < o.n; i++) {
      let th = (o.sens > 0 ? 0 : Math.PI) + ((o.n === 1 ? 0.5 : i / (o.n - 1)) - 0.5) * 2 * o.ouv * deg + rnd(-8, 8) * deg;
      const cote = Math.sign(th - (o.sens > 0 ? 0 : Math.PI)) || 1;
      const lg = rnd(o.lg[0], o.lg[1]) * T;
      let x = ox + 0.5 * T + rnd(-0.03, 0.03) * T, y = oy + o.by * T;
      const brin = [[x, y]];
      for (let j = 1; j <= o.m; j++) {
        th += cote * rnd(1, 6) * deg * (o.sens > 0 ? 1 : 0.6);
        const nx = x + Math.sin(th) * lg / o.m, ny = y - Math.cos(th) * lg / o.m;
        if (!dedans(nx, ny)) break;
        x = nx; y = ny; brin.push([x, y]);
        const t = j / o.m;
        if (t < 0.12) continue;
        for (const s of j === o.m ? [0, 1, -1] : [1, -1]) {
          const rot = th + s * rnd(30, 70) * deg * (o.sens > 0 ? 1 : 0.7);
          let L = o.L0 * T * (1 - 0.4 * t) * rnd(0.85, 1.15);
          if (!bout(x, y, L, rot)) L *= 0.7;
          if (bout(x, y, L, rot)) avant.push([x, y, L, rot, tirerTonPlatane(), clarte(y) * rnd(0.9, 1.06)]);
        }
      }
      brins.push(brin);
    }
    // les brindilles sous les feuilles d'avant, affinées vers le bout
    g.strokeStyle = 'rgb(96,90,74)'; g.lineCap = 'round';
    for (const b of brins) {
      for (let j = 1; j < b.length; j++) {
        g.lineWidth = Math.max(1, T * 0.01 * (1 - j / (b.length + 1)));
        g.beginPath(); g.moveTo(b[j - 1][0], b[j - 1][1]); g.lineTo(b[j][0], b[j][1]); g.stroke();
      }
    }
    // (dans le désordre : les feuilles d'une brindille passent tantôt sur, tantôt sous celles de la voisine)
    for (let i = avant.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [avant[i], avant[j]] = [avant[j], avant[i]]; }
    for (const f of avant) feuille(...f);
  });
  // le voile sous les feuilles (voir plus haut)
  g.globalCompositeOperation = 'destination-over';
  g.fillStyle = 'rgba(124,132,104,0.04)'; g.fillRect(0, 0, W, W);
  g.globalCompositeOperation = 'source-over';
}

// =====================================================================
//  CÔTÉ QUAI : LE RIDEAU DE MÛRIERS-PLATANES, LA HAIE DE TROÈNE, L'ARBUSTE POURPRE (photos 43 et 39)
// =====================================================================
// Ce que les photos montrent et que la version précédente ratait :
//  - des FÛTS gris clair de 60 cm qui fourchent vers 2,5 m en CANDÉLABRE, dans le plan du rideau ;
//  - un rideau de GRANDES feuilles pendantes (16 à 26 cm), gris-vert désaturé et luisant — il renvoie le
//    ciel gris —, collé au filet jusqu'à 5,3 m, qui s'avance en marquise au-dessus, et dont l'intérieur est
//    SOMBRE : pas une trouée de ciel ;
//  - une haie basse (1 m) de troène à petites feuilles, ajourée par endroits, un arbuste pourpre près du coin
//    du pin, et une longue branche basse de l'arbre du coin qui passe au-dessus de l'angle des grillages.
// Tout le plateau est à l'ombre sur les photos (19 h 38) : ni le rideau, ni la haie, ni les troncs ne portent
// d'ombre, sinon l'enrobé du bord quai se tachait de soleil.

// Un tuyau de rayon variable le long d'une courbe : fûts, charpentières, branches. Plus juste qu'une suite
// de cylindres (pas de cassure aux coudes), et tout se coud en UN maillage. `pts` : points de passage
// (Vector3), `rs` : rayon à chacun ; `n` anneaux, `rad` côtés ; `bosse(t, a)` : facteur de rayon selon la
// hauteur relative t et l'angle a (les contreforts du pied) ; `teinte` : couleur de sommet de base.
// Les couleurs de sommet assombrissent le DESSOUS des branches et le pied des fûts (l'occlusion que la
// lumière d'ambiance ne fait pas) : sans elles, une branche horizontale sortait blanche sur le ciel.
function tuyauQuai(pts, rs, n = 8, rad = 8, bosse = null, teinte = 1) {
  const courbe = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const P = [], T = [];
  for (let i = 0; i <= n; i++) { P.push(courbe.getPoint(i / n)); T.push(courbe.getTangent(i / n).normalize()); }
  // repère TRANSPORTÉ le long de la courbe (celui de Frenet vrille dans les virages et tord l'écorce)
  const ref = Math.abs(T[0].y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const B0 = new THREE.Vector3().crossVectors(T[0], ref).normalize();
  const N = new THREE.Vector3().crossVectors(B0, T[0]).normalize(), B = new THREE.Vector3(), ax = new THREE.Vector3();
  const pos = [], nor = [], uv = [], col = [], idx = [];
  let s = 0;
  for (let i = 0; i <= n; i++) {
    if (i) {
      s += P[i].distanceTo(P[i - 1]);
      ax.crossVectors(T[i - 1], T[i]);
      const l = ax.length();
      if (l > 1e-6) N.applyAxisAngle(ax.divideScalar(l), Math.acos(Math.min(1, Math.max(-1, T[i - 1].dot(T[i])))));
    }
    B.crossVectors(T[i], N).normalize(); N.crossVectors(B, T[i]).normalize();
    const f = (i / n) * (rs.length - 1), k = Math.min(rs.length - 2, Math.floor(f));
    const r0 = rs[k] + (rs[k + 1] - rs[k]) * (f - k);
    for (let j = 0; j <= rad; j++) {
      const a = (j / rad) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      const r = bosse ? r0 * bosse(i / n, a) : r0;
      const nx = c * N.x + sn * B.x, ny = c * N.y + sn * B.y, nz = c * N.z + sn * B.z;
      pos.push(P[i].x + r * nx, P[i].y + r * ny, P[i].z + r * nz); nor.push(nx, ny, nz);
      const k = teinte * (0.76 + 0.24 * (ny * 0.5 + 0.5)) * (0.84 + 0.16 * Math.min(1, Math.max(0, P[i].y) / 1.2));
      col.push(k, k, k);
      uv.push((j / rad) * 2, s / 1.4);                  // deux tuiles d'écorce autour, une tous les 1,4 m
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

// À L'OMBRE. Sur les photos, tout le bord quai est à l'ombre : le soleil est couché. Dans le jeu, le soleil
// du soir (chaud, venu du quai et d'en haut) accrochait les normales « volume » relevées de coudre() et
// virait le rideau et la haie au jaune-vert, là où la photo est gris-vert froid. On couche donc les normales
// vers le terrain (`recul`, vers -x) et on plafonne leur composante vers le soleil (`plafond`) : il ne reste
// que le ciel, le remplissage bleuté venu de -x et la lumière transmise.
// Deux soleils à plafonner : le haut (SUN_DIR des autres terrains) et le soleil BAS du parc, qui vient du pin
// (DIR_CJ, même azimut que la lumière de la scène). Sans le second, le bout arrondi du rideau et le houppier de
// l'arbre du coin, dont les normales « volume » regardent z+, prenaient le couchant en plein (et la lueur de la
// carte HDR) : des feuilles « lanterne en papier » presque blanches là où les photos 39 et 42 montrent une
// silhouette sombre à contre-jour.
function aLOmbre(g, recul, plafond) {
  const n = g.attributes.normal;
  const SOLEILS = [[0.502, 0.821, 0.274], [DIR_CJ.x, DIR_CJ.y, DIR_CJ.z]];   // js/court.js SUN_DIR (22, 36, 12), normé
  for (let k = 0; k < n.count; k++) {
    let x = n.getX(k) - recul, y = n.getY(k), z = n.getZ(k), l = Math.hypot(x, y, z) || 1;
    x /= l; y /= l; z /= l;
    for (const S of SOLEILS) {
      const d = x * S[0] + y * S[1] + z * S[2] - plafond;
      if (d > 0) { x -= d * S[0]; y -= d * S[1]; z -= d * S[2]; l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l; }
    }
    n.setXYZ(k, x, y, z);
  }
  n.needsUpdate = true;
  return g;
}

// LE RIDEAU D'ARBRES DU QUAI. Tout est écrit dans le repère du terrain 1 et passe par cx().
//  - dix fûts à x = 7,7 (1,4 m derrière le grillage), aux z relevés (7,0 / 1,0 / -4,7 / -10,4) puis tous
//    les 5,7 m ; fourche à 2,4-2,8 m ; l'arbre du coin porte une branche basse au-dessus de l'angle ;
//  - le rideau : face à x = 6,6 jusqu'à 4,6 m, contre le filet (6,5) jusqu'à 5,3 m, marquise qui s'avance à
//    5,95 vers 6,3 m puis 6,1 à 7,6 m, faîte à 8,2-8,8 m bombé au droit de chaque tronc ; trois mètres
//    d'épaisseur, les deux tiers des plans dans le premier mètre ; il s'arrête en arrondi vers z = 10,8 ;
//  - entre les troncs, une frange clairsemée de rameaux qui pend jusqu'à 2,2 m ; derrière, un fond sombre ajouré ;
//  - au faîte, les pousses de l'année, dressées (le bord en dents de scie du panorama).
function tilleulsEnRideau(scene, K, cx) {
  const V = (x, y, z) => new THREE.Vector3(cx(x), y, z);

  // ---------- 1. LES FÛTS ET LEUR CHARPENTE ----------
  const zT = [7.0, 1.0, -4.7, -10.4];
  // (parc entier : les fûts sont des obstacles, placés d'après leur rang et non par Math.random, comme les platanes)
  const j = (a, b, x, z, k) => (Monde.plat ? rnd(a, b) : a + (b - a) * alea(x, z, k));
  for (let z = -16.1; z >= -45; z -= 5.7) zT.push(z + j(-0.2, 0.2, 7.7, z, 13));
  const bois = [], pieds = [], charp = [];
  // la branche basse de l'arbre du coin (photos 39, 42, 43 et 185558) : elle sort du fût à 2,2 m et MONTE, vers le
  // coin du pin, jusqu'à 4,3 m — une charpentière oblique qui entre dans le houppier. (Elle filait à plat à 2,2 m
  // au-dessus de l'angle des grillages puis derrière celui du pin : de la photo 339 on voyait un boudin gris en
  // travers de toute la vue, que les photos ne montrent pas.)
  const BRANCHE_COIN = [[7.7, 2.2, 7.0], [7.5, 2.6, 7.5], [7.3, 3.4, 8.0], [7.1, 4.3, 8.4]];
  zT.forEach((z0, i) => {
    const x0 = 7.7 + j(-0.1, 0.1, 7.7, z0, 14), z = z0 + j(-0.08, 0.08, 7.7, z0, 15), yF = rnd(2.4, 2.8);
    const F = [x0 + rnd(-0.05, 0.1), yF, z + rnd(-0.1, 0.1)];
    pieds.push({ x: x0, z });
    // le fût : pied évasé (r 0,46) à trois contreforts qui s'effacent vers 60 cm, 0,31 à un mètre, 0,27 à la
    // fourche — soit les 55 à 65 cm de diamètre mesurés à hauteur d'homme
    const phi = rnd(0, 6.28);
    const contreforts = (t, a) => 1 + 0.13 * Math.max(0, 1 - t * 4.5) * Math.cos(3 * a + phi) + 0.04 * Math.cos(2 * a + 2 * phi);
    // (parc entier : le sol descend vers la promenade, un demi-mètre plus bas au pied des fûts ; le fût y descend aussi)
    const yPied = Monde.plat ? -0.15 : Math.min(0, Monde.sol(cx(x0), z)) - 0.15;
    bois.push(tuyauQuai([V(x0, yPied, z), V(x0, 0.35, z), V(x0 + 0.02, 1.1, z + 0.02), V(F[0], yF, F[2])],
      [0.46, 0.37, 0.31, 0.27], 8, 12, contreforts));
    // LA FOURCHE, ASYMÉTRIQUE (lot L3). Photos 343 et 185558 : le fût se divise en un bras MAÎTRE, un peu plus gros
    // et moins penché (17 à 29° de la verticale), dans le plan du rideau, et des bras secondaires plus penchés et plus
    // minces : l'un de l'autre côté du plan (37 à 52°), qui part AVEC lui (à 8 cm près), un vers le quai, parfois
    // un quatrième, étagé, qui part du bras maître 55 à 90 cm plus haut. L'ancien candélabre — deux charpentières
    // symétriques du même point, à 35-50° — faisait de chaque fût un lance-pierre. Chacun se redresse après 1,6-2 m,
    // puis file dans les feuilles.
    // (Relecture du lot : le bras de l'autre côté partait d'abord 10 à 40 cm plus haut, et le maître, presque droit
    // (14 à 24°) et 1,15 fois plus gros, prolongeait le fût. Deux bras de 17 à 23 cm de rayon, 50 à 65° d'écart, ne se
    // séparent à l'œil que 30 à 40 cm au-dessus de leur départ : l'entrejambe remontait vers 3,1-3,4 m, sous les
    // feuilles, et chaque fût devenait, vu de la caméra de diffusion, un poteau penché qui entre dans le rideau — alors
    // que la photo 343 montre, sous les feuilles, un V franc à chaque arbre.)
    const cote = Math.random() < 0.5 ? -1 : 1, thM = rnd(0.3, 0.5), exM = rnd(-0.15, 0.25), hnM = Math.hypot(exM, cote);
    const surMaitre = (dy) => {
      const l = dy / Math.cos(thM);
      return [F[0] + Math.sin(thM) * exM / hnM * l, yF + dy, F[2] + Math.sin(thM) * cote / hnM * l];
    };
    // [côté dans le plan (0 : vers le quai), écart à la verticale, départ au-dessus de la fourche, rayon relatif]
    const BRAS = [[cote, thM, 0, 1.05], [-cote, rnd(0.65, 0.9), rnd(0, 0.08), 0.9], [0, rnd(0.3, 0.45), rnd(0.05, 0.3), 0.8]];
    if (Math.random() < 0.45) BRAS.push([Math.random() < 0.5 ? -1 : 1, rnd(0.5, 0.75), rnd(0.55, 0.9), 0.6]);
    BRAS.forEach(([sz, th, dy, kr], b) => {
      const ex = b === 0 ? exM : sz === 0 ? 1 : rnd(-0.15, 0.25), ez = sz === 0 ? rnd(-0.3, 0.3) : sz, hn = Math.hypot(ex, ez);
      const dir = (t) => [Math.sin(t) * ex / hn, Math.cos(t), Math.sin(t) * ez / hn];
      const d1 = dir(th), d2 = dir(th * 0.55), d3 = dir(th * 0.35);
      const l1 = rnd(1.6, 2.0) * (b ? 0.85 : 1), l2 = rnd(1.5, 2.5), l3 = rnd(1.4, 2.0);
      const S = dy ? surMaitre(dy) : F;
      const P1 = [S[0] + d1[0] * l1, S[1] + d1[1] * l1, S[2] + d1[2] * l1];
      const P2 = [P1[0] + d2[0] * l2, P1[1] + d2[1] * l2, P1[2] + d2[2] * l2];
      const P3 = [P2[0] + d3[0] * l3, P2[1] + d3[1] * l3, P2[2] + d3[2] * l3];
      charp.push([P1, P2]);
      // (le premier point, 35 cm plus bas, est DANS le fût ou le bras maître : pas de jour à l'attache)
      bois.push(tuyauQuai([V(S[0], S[1] - 0.35, S[2]), V(...S), V(...P1), V(...P2), V(...P3)],
        (sz === 0 ? [0.18, 0.16, 0.12, 0.07, 0.03] : [0.2, 0.18, 0.14, 0.08, 0.035]).map((r) => r * kr), 10, 8));
    });
    // un arbre sur deux porte une longue branche qui monte doucement vers -z, de 2,6 à 3,6 m sur 3,6 m : on la voit
    // sous le feuillage, en travers entre deux troncs (photo 43) — mais pas en face du terrain 1 (photos 1000051343
    // et 185558 : entre les fûts du plateau, rien qu'une fourche et des rameaux ; la branche plate de 15 cm à 2,6 m
    // se lisait au milieu de la vue). Plus fine, et seulement à partir du quatrième arbre (z = -10,4, au-delà des
    // platanes).
    if (i % 2 === 1 && i >= 3) {
      bois.push(tuyauQuai([V(x0, 2.6, z), V(x0 - 0.05, 2.85, z - 0.5), V(x0 - 0.15, 3.1, z - 1.8), V(x0 - 0.1, 3.35, z - 3.0),
        V(x0, 3.6, z - 3.6)], [0.09, 0.08, 0.06, 0.045, 0.03], 10, 7));
    }
    // (plus sombre que les fûts : à contre-jour sur les photos 39 et 42, elle se détache en gris ; à 0,42, au rendu
    // de la pose 339, elle sortait presque noire)
    if (i === 0) bois.push(tuyauQuai(BRANCHE_COIN.map((p) => V(...p)), [0.13, 0.11, 0.08, 0.05], 10, 8, null, 0.6));
  });
  // (parc entier : chaque fût est un obstacle du monde, voir buildParc — 0,46 m au pied, 0,31 à un mètre)
  const obs = scene.userData.obstaclesDecor;
  if (obs) for (const p of pieds) obs.push({ t: 'c', x: cx(p.x), z: p.z, r: 0.34, h: 2.4, qui: 'tous', type: 'arbre', source: 'rideau du quai' });
  // LES FÛTS À L'OMBRE, MAIS RONDS (lot L3). Couchées vers le terrain et plafonnées à 0,05 vers le soleil (aLOmbre
  // 0,15 / 0,05), leurs normales ne laissaient aucun modelé : un tube gris clair uniforme, contraste de l'écorce 14 à
  // 15 contre 30 à 32 sur la photo 343. Ils reçoivent désormais l'ombre portée (l'écran du pin les met à l'ombre, comme
  // le reste du bord du quai) : le plafond peut remonter à 0,3 et le recul tomber à 0,05, le fût redevient un cylindre.
  // Ils portent aussi leur ombre. Et la vraie écorce : la photo d'écorce de platane (tex/ecorce_platane) pour le grain,
  // les fissures, le relief et la rugosité, sur la couleur gris clair dessinée d'après la photo (ecorceQuai), comme
  // pour les platanes (`melange`).
  const texEcorce = ecorceQuai(K.canvasTex);
  const matTroncs = new THREE.MeshStandardMaterial({ map: texEcorce, bumpMap: texEcorce, bumpScale: 1.0, roughness: 0.9, vertexColors: true });
  ecorceReelle(matTroncs, 'ecorce_platane', [1, 1.5], { melange: 0.6, normale: 1.2 });
  const troncs = new THREE.Mesh(aLOmbre(mergeGeometries(bois), 0.05, 0.3), matTroncs);
  troncs.castShadow = true; troncs.receiveShadow = true; scene.add(troncs);

  // ---------- 2. LE PROFIL DU RIDEAU ----------
  // le faîte : 8,25 m entre les arbres, une bosse de +0,45 au droit de chaque tronc, un peu d'irrégularité
  const bosse = (z) => { let b = 0; for (const p of pieds) b = Math.max(b, Math.exp(-(((z - p.z) / 2.1) ** 2))); return b; };
  const faite = (z) => 8.25 + 0.45 * bosse(z) + 0.1 * Math.sin(z * 1.3 + 0.7) + 0.06 * Math.sin(z * 3.1);
  // la face côté terrain selon la hauteur (x du repère du terrain 1) ; au-dessus de 7,6 m, elle s'arrondit
  // et repart vers 7,5 au faîte
  const PROFIL = [[2.9, 6.8], [4.6, 6.62], [5.3, 6.5], [6.3, 5.95], [7.6, 6.1]];
  const face = (y, z) => {
    if (y >= 7.6) { const u = Math.min(1, (y - 7.6) / Math.max(0.4, faite(z) - 7.6)); return 6.1 + 1.4 * Math.pow(u, 1.7); }
    for (let i = 1; i < PROFIL.length; i++) {
      if (y < PROFIL[i][0]) { const [y0, x0] = PROFIL[i - 1], [y1, x1] = PROFIL[i]; return x0 + (x1 - x0) * Math.max(0, (y - y0) / (y1 - y0)); }
    }
    return 6.1;
  };
  // le bout côté pin, arrondi : au-delà de z = 8, une demi-ellipse de 2,8 m de long
  const dedans = (y, z) => z <= 8 || ((z - 8) / 2.8) ** 2 + ((y - 5.9) / 3.1) ** 2 <= 1;

  // ---------- 3. LES PLANS DE FEUILLES ----------
  const touffes = [], infos = [], o = new THREE.Object3D(), plan = new THREE.PlaneGeometry(1, 1);
  o.rotation.order = 'YXZ';                        // roulis, puis tangage, puis cap : le cap reste « face au terrain »
  // Personne ne traverse un grillage : sous la lisse du filet (5 m), rien en deçà de x = 6,36 ; au-dessus,
  // la marquise peut avancer jusqu'à 5,6 (jamais au-dessus du terrain, qui s'arrête à 5,5) ; derrière le
  // grillage du pin (z > 9,3), jusqu'à 5,5.
  const garde = (g) => {
    g.computeBoundingBox();
    const b = g.boundingBox, lim = cx(b.min.z >= 9.3 ? 5.5 : b.min.y >= 5.05 ? 5.6 : 6.36);
    if (b.min.x < lim) g.translate(lim - b.min.x, 0, 0);
  };
  // LES MASSES (lot L3) : chaque touffe prend, en plus de sa teinte, la lumière de sa MASSE — un bruit lent, de 2 à
  // 4 m de période (0,75 à 1,2), un peu plus clair au droit des fûts (la bosse de l'arbre) et plus sombre entre eux.
  // Les photos 343 et 185558 montrent des arbres, des bosses et des creux ; trois mille plans de même valeur faisaient
  // une tenture. (Modéré : le contre-examen du 30/09, ciel neutralisé, ne trouve que 0 à 30 % de masses en moins.)
  const ph = [rnd(0, 6.28), rnd(0, 6.28), rnd(0, 6.28)];
  const masse = (y, z) => {
    const n = 0.5 * Math.sin(z * 1.6 + y * 0.7 + ph[0]) + 0.3 * Math.sin(z * 2.7 - y * 1.1 + ph[1]) + 0.2 * Math.sin(z * 0.8 + y * 1.9 + ph[2]);
    return Math.min(1.2, Math.max(0.75, 0.975 + 0.2 * n + 0.1 * (bosse(z) - 0.4)));
  };
  // L'ATLAS (feuillesMurier, quatre tuiles) : `info.tuile` si l'appel la choisit, sinon au hasard 0 grappe (60 %),
  // 1 clairsemée (30 %), 2 pendante (10 %, et jamais sous 4,3 m : ses longs chapelets descendaient le rideau sur les
  // fourches) ; 3, la tuile ajourée du faîte, n'est posée qu'au faîte. Un pas d'UV de 0,492 dans son quart, à
  // 4 millièmes du bord (le filtrage ne prend pas la tuile voisine).
  const poser = (x, y, z, tangage, cap, roulis, s, info, sy = s) => {
    o.position.set(cx(x), y, z); o.rotation.set(tangage, cap, roulis); o.scale.set(s, sy, 1); o.updateMatrix();
    const g = plan.clone(), u = Math.random();
    const tu = info.tuile !== undefined ? info.tuile : u < 0.6 ? 0 : u < 0.9 || y < 4.3 ? 1 : 2, miroir = Math.random() < 0.5;
    const uv = g.attributes.uv, u0 = (tu % 2) * 0.5, v0 = 0.5 - Math.floor(tu / 2) * 0.5;
    for (let k = 0; k < uv.count; k++) {
      const uu = miroir ? 1 - uv.getX(k) : uv.getX(k);
      uv.setXY(k, u0 + 0.004 + uu * 0.492, v0 + 0.004 + uv.getY(k) * 0.492);
    }
    g.applyMatrix4(o.matrix); garde(g);
    info.t *= masse(y, z);
    touffes.push(g); infos.push(info);
  };
  const FACE = -Math.PI / 2;                       // un plan tourné de -90° regarde vers -x : le terrain
  // (a) le corps du rideau : 42 plans par mètre, de 1,1 à 1,6 m. Le « volume » de coudre() est une tranche
  // dont le centre est 1,6 m derrière la face, à 5,8 m de haut.
  const Z0 = -45, Z1 = 10.8;
  const N = Math.round((Z1 - Z0) * 42);
  for (let i = 0; i < N; i++) {
    const z = rnd(Z0, Z1), top = faite(z);
    // le bas du corps (centre des plans) : 3,5 m au droit des troncs, 3,0 entre eux — le feuillage plein descend
    // jusqu'au haut du treillis entre les fûts, et au droit des fûts on voit encore la fourche et le départ des
    // charpentières (photos 43, 1000051343 et 185558 : entre les couronnes, pas de jour sous 2,5 m)
    // (3,7 m et non plus 3,5 au droit des troncs, depuis la fourche asymétrique du lot L3 : sur la photo 343, on voit
    // sous les feuilles le V de chaque fourche et le départ de ses bras, pas seulement l'entrejambe)
    const y0 = 3.0 + 0.7 * bosse(z) + 0.25 * Math.sin(z * 1.1 + 2) + rnd(-0.15, 0.15), y = y0 + Math.random() * (top - 0.45 - y0);
    if (!dedans(y, z)) continue;
    const f = face(y, z) + rnd(-0.12, 0.12);
    // deux tiers des plans dans le premier mètre ; un peu moins en bas, où l'on voit les charpentières au travers
    const devant = Math.random() < (y < 4.3 ? 0.45 : 0.68);
    const d = devant ? 0.9 * Math.pow(Math.random(), 1.15) : rnd(0.9, 2.8);
    let tangage = rnd(-0.44, 0.44);
    if (y > 5.1 && y < 6.5 && d < 0.6) tangage = rnd(0.1, 0.45);     // le dessous de la marquise, vu d'en bas
    if (y > top - 1.0) tangage = rnd(-0.8, -0.3);                      // le faîte, qu'on voit de loin (pas de
                                                                       // plan à plat : vu d'en bas, il ferait un trait)
    let t = rnd(0.92, 1.18);
    if (d > 1.0) t *= 0.62;                                            // le fond du rideau, dans l'ombre
    else if (d < 0.45 && y > 3 && y < 6.5 && Math.random() < 0.22) t = rnd(1.22, 1.35);   // rameaux au soleil (photo 43 : grappes claires, creux sombres)
    // (le dernier mètre sous le faîte prend la tuile ajourée : le ciel passe au travers, 12 à 13 % sur les photos)
    poser(f + 0.22 + d, y, z, tangage, FACE + rnd(-0.61, 0.61), rnd(-0.35, 0.35), rnd(1.1, 1.6),
      { c: [cx(f + 1.6), 5.8, z], r: 3.2, t, tuile: y > top - 1.0 ? 3 : undefined });
  }
  // (b) la frange : entre deux troncs, des rameaux qui pendent jusqu'à 2,1-2,3 m, juste au-dessus du treillis (au
  // droit des troncs, le dessous du rideau reste vers 3 m et on voit la fourche)
  const zs = pieds.map((p) => p.z).sort((a, b) => a - b);
  for (let i = 0; i + 1 < zs.length; i++) {
    const za = zs[i] + 0.9, zb = zs[i + 1] - 0.9;
    // (serrée contre le filet : sur les photos 1000051343 et 185558, le feuillage descend en rideau jusqu'au haut du
    // treillis entre les fûts. Clairsemée — un plan tous les 1,25 m, derrière les fûts — elle laissait sous les
    // couronnes une bande de jour où l'on voyait l'allée et l'île.) Rien sous 2 m.
    for (let k = 0, n = Math.round((zb - za) * 3); k < n; k++) {
      // des longueurs et des attaches variées, à des profondeurs variées : alignés, ces rameaux faisaient
      // une rangée de pompons sous le rideau
      const z = rnd(za, zb), s = rnd(0.8, 1.2), y = Math.max(rnd(2.9, 3.4) - s / 2, 2.0 + s / 2);
      poser(rnd(6.45, 7.3), y, z, rnd(-0.15, 0.15), FACE + rnd(-0.5, 0.5), rnd(-0.2, 0.2), s,
        { c: [cx(8.3), 5.8, z], r: 3.2, t: rnd(0.9, 1.1), tuile: 2 });
    }
  }
  // (c) la jupe, CLAIRSEMÉE : quelques rameaux sombres entre 1,1 et 2,4 m, derrière les troncs, qui cassent
  // l'aplat du fond. (Pleine, un plan tous les 0,7 m devant l'ancien fond vert, elle faisait sous les couronnes
  // une bande vert-noir opaque : saturation 0,27 contre 0,12 sur la photo 43, où l'on voit à cette hauteur
  // l'allée, les fourgons blancs, le car et les arbres de la berge.)
  for (let z = -44; z < 6.5; z += rnd(1.2, 2.6)) {
    poser(rnd(8.6, 9.3), rnd(1.6, 1.95), z, rnd(-0.2, 0.2), FACE + rnd(-0.5, 0.5), rnd(-0.3, 0.3), rnd(0.7, 1.0),
      { c: [cx(8.3), 5.8, z], r: 3.2, t: rnd(0.5, 0.62), tuile: 1 });
  }
  // (d) le houppier de l'arbre du coin : il monte à 9,3 m et déborde au-dessus de l'angle des grillages
  // (photo 42 : son bas descend à 2,5 m juste au-dessus du mât d'angle)
  const CC = [7.0, 6.0, 9.0];
  for (let i = 0; i < 190; i++) {
    const u = Math.random() * 6.2832, v = Math.acos(rnd(-1, 1)), rr = Math.pow(Math.random(), 0.4);
    const dx = Math.cos(u) * Math.sin(v), dz = Math.sin(u) * Math.sin(v), dy = Math.cos(v);
    const y = CC[1] + dy * 3.3 * rr;
    if (y < 2.6) continue;
    poser(CC[0] + dx * 1.5 * rr, y, CC[2] + dz * 2.1 * rr, rnd(-0.45, 0.45) - dy * 0.6, Math.atan2(dx, dz) + rnd(-0.5, 0.5),
      rnd(-0.35, 0.35), rnd(1.1, 1.5), { c: [cx(CC[0]), CC[1], CC[2]], r: 2.8, t: rr > 0.8 ? rnd(0.92, 1.12) : rnd(0.7, 0.9) });
  }
  // sous le houppier du coin, entre le dernier tronc et l'angle, quelques rameaux de 2,3 à 3,4 m (photo 43 :
  // au-dessus du car, du feuillage sombre et pas le ciel)
  for (let i = 0; i < 14; i++) {
    const z = rnd(7.6, 9.6), s = rnd(0.7, 1.0);
    poser(rnd(6.9, 7.7), rnd(3.1, 3.5) - s / 2, z, rnd(-0.15, 0.15), FACE + rnd(-0.6, 0.6), rnd(-0.2, 0.2), s,
      { c: [cx(CC[0]), CC[1], CC[2]], r: 2.8, t: rnd(0.75, 1.05) });
  }
  // (e) seize rameaux qui pendent de la branche basse, jusqu'au haut du treillis. Ils restent du côté du quai
  // (x ≥ 6,4) et en deçà du grillage du pin (z ≤ 9,0) : la branche ne passe plus au-dessus de l'angle, et ses
  // rameaux ne doivent pas tomber derrière la maille du pin, dans les arbustes du talus. Tournés face au terrain,
  // à ±0,6 rad près (tournés au hasard, ils débordaient de 45 cm de chaque côté).
  const courbeCoin = new THREE.CatmullRomCurve3(BRANCHE_COIN.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  for (let i = 0; i < 16; i++) {
    const p = courbeCoin.getPoint(rnd(0.2, 0.97)), s = rnd(0.85, 0.95);
    const x = Math.max(6.4 + s * 0.3, p.x + rnd(-0.15, 0.15)), z = Math.min(9.0 - s * 0.5, p.z + rnd(-0.2, 0.2));
    poser(x, Math.max(p.y - 0.45, 1.9 + s / 2), z, rnd(-0.12, 0.12), FACE + rnd(-0.6, 0.6), rnd(-0.1, 0.1), s,
      { c: [cx(6.8), 3.5, 9.0], r: 2.5, t: rnd(0.85, 1.0), tuile: 2 });
  }
  // (f) le DESSOUS de la marquise : des plans presque à plat entre 5,25 et 5,7 m, au-dessus de la lisse du
  // filet. Sans eux, vu d'en bas, on voyait par-dessous la marquise jusqu'au fond sombre du rideau.
  // (inclinés de 45 à 65° seulement : tout à plat, vus de la caméra de diffusion, ils faisaient une étagère)
  for (let i = 0, n = Math.round((8 - Z0) * 7); i < n; i++) {
    const z = rnd(Z0, 8);
    poser(rnd(6.15, 6.95), rnd(5.3, 5.75), z, (Math.random() < 0.5 ? -1 : 1) * rnd(0.75, 1.1), FACE + rnd(-0.6, 0.6), rnd(-0.3, 0.3),
      rnd(1.0, 1.4), { c: [cx(8.0), 5.8, z], r: 3.2, t: rnd(0.8, 0.95) });
  }
  // (g) entre les troncs, sous le rideau : une couche de rameaux plus sombres, à mi-profondeur, qui cache le
  // fond derrière la frange (la photo y montre des feuilles dans l'ombre et quelques éclats clairs)
  for (let z = -44.5; z < 6.8; z += rnd(0.7, 1.4)) {
    if (bosse(z) > 0.75) continue;
    poser(rnd(7.8, 9.0), rnd(3.0, 3.5), z, rnd(-0.2, 0.2), FACE + rnd(-0.5, 0.5), rnd(-0.2, 0.2), rnd(0.8, 1.15),
      { c: [cx(8.3), 5.8, z], r: 3.2, t: rnd(0.55, 0.7), tuile: 1 });
  }
  // (i) des rameaux feuillés le long des charpentières, de 3 à 4,5 m : le feuillage ne commençait qu'au-dessus
  // d'elles, et chaque fût finissait en Y aux bras tranchés net (sur les photos, les bras entrent dans des
  // grappes qui pendent autour d'eux)
  for (const [P1, P2] of charp) {
    for (let k = 0; k < 4; k++) {
      const t = rnd(0, 1), x = P1[0] + (P2[0] - P1[0]) * t, y = P1[1] + (P2[1] - P1[1]) * t, z = P1[2] + (P2[2] - P1[2]) * t;
      if (y < 3.0) continue;
      const s = rnd(0.55, 0.85);
      // (la tuile clairsemée : on voit le bras entrer dans les feuilles, pas un moignon qui s'arrête net)
      poser(Math.max(6.95, x + rnd(-0.25, 0.3)), y - s * 0.3, z + rnd(-0.35, 0.35), rnd(-0.2, 0.2), FACE + rnd(-0.6, 0.6), rnd(-0.3, 0.3), s,
        { c: [cx(8.3), 5.8, z], r: 3.2, t: rnd(0.8, 1.05), tuile: 1 });
    }
  }
  // (h) LES POUSSES DU FAÎTE : le rideau est taillé chaque hiver, et à la fin de l'été les rameaux de l'année
  // dépassent le faîte de 0,4 à 1 m, dressés, en touffes serrées (panorama du 26/09 : un bord en dents de scie
  // sur le ciel, pas une crête arrondie). Des plans étroits, tête-bêche (les grappes de la tuile montent alors
  // au lieu de pendre), plantés dans le faîte.
  // (étroites, 30 à 50 cm, et de hauteurs inégales : plus larges, régulières, elles faisaient de loin une rangée de
  // choux sur le faîte)
  for (let z = Z0 + 0.3; z < 10.2; z += rnd(0.16, 0.38)) {
    let top = faite(z);
    if (z > 8) top = Math.min(top, 5.9 + 3.1 * Math.sqrt(Math.max(0, 1 - ((z - 8) / 2.8) ** 2)));
    const h = rnd(0.8, 1.7);   // (le bas de la tuile retournée est vide : on l'enfonce dans le faîte)
    poser(face(top - 0.5, z) + rnd(0.2, 1.3), top - 0.8 + rnd(-0.15, 0.15) + h / 2, z, rnd(-0.25, 0.15), FACE + rnd(-0.6, 0.6),
      Math.PI + rnd(-0.4, 0.4), rnd(0.3, 0.5), { c: [cx(face(top, z) + 1.6), 5.8, z], r: 3.2, t: rnd(0.95, 1.15), tuile: 3 }, h);
  }
  // (lot L3 : le cœur plus sombre et 12 % de touffes vert-jaune, voir coudre ; le ciel transmis ramené de 0,3 à 0,25 et
  // le soleil transmis au faîte, voir rideauFeuilles)
  const texRideau = feuillesMurier(K.canvasTex);
  const mat = materiauFeuilles(texRideau, rideauFeuilles(texRideau));
  const geo = aLOmbre(coudre(touffes, infos, { coeur: true, jaunies: 0.12 }), 0.35, 0.1);
  // le haut du rideau est plus clair et plus froid (photo 43 : il prend tout le ciel gris, L 0,72 de l'enrobé
  // contre 0,48 à mi-hauteur ; +55 % et non plus +70 % depuis que ses grappes sont ajourées et plus claires)
  const pp = geo.attributes.position, cc = geo.attributes.color;
  for (let k = 0; k < pp.count; k++) {
    const s = Math.min(1, Math.max(0, (pp.getY(k) - 4.6) / 4.0)), e = s * s * (3 - 2 * s), f = 1 + 0.55 * e;
    cc.setXYZ(k, cc.getX(k) * f, cc.getY(k) * f, cc.getZ(k) * f * (1 + 0.07 * e));
  }
  const rideau = new THREE.Mesh(geo, mat);
  rideau.castShadow = false; rideau.receiveShadow = false; rideau.customDepthMaterial = mat.userData.ombre;
  scene.add(rideau); declarerFeuillage(scene, rideau);

  // ---------- 4. LE FOND SOMBRE ----------
  // Un voile vertical à x = 9,35, tourné vers le terrain : entre les feuilles on voit le cœur sombre du
  // rideau (et, par ses jours, un peu de la berge), pas un aplat de ciel ni les immeubles blancs de l'île.
  // Son bord bas est déchiqueté (une ligne droite se lirait sous la frange), son haut reste sous le faîte.
  // Il descend à 0,6 m, derrière la haie, et s'efface en fondu sur 35 cm ; sa toile gris-vert neutre est percée
  // de jours (voir fondRideau). Ne pas le remonter : à 1,0-1,4 m, on voyait à hauteur d'œil, entre la haie et
  // les couronnes, une bande blanche continue (l'île dans la brume : 0,76 de l'enrobé, 35 % de pixels clairs,
  // contre 0,50 et 5 % sur la photo 43). En face du car, près du coin du pin, il ne descend qu'à 2 m : on y
  // voit le car et, au-dessus, les arbres de la berge (photos 39 et 42).
  // PARC ENTIER (lot B1) : pas de voile. Il est planté au bord de la promenade basse (x = 9,35, qu'elle longe de
  // z = 0 à 10), et de la promenade on le voyait de face, plaque sombre suspendue à 1,4 m au-dessus de l'allée ; derrière
  // le rideau, il y a maintenant le vrai décor (le second rideau, le quai, la berge : zones Z03 et Z19).
  if (!Monde.plat) return;
  const pos = [], col = [], uv = [], idx = [], XF = cx(9.35);
  let n = 0;
  for (let z = Z0; z <= 10.2; z += 0.5, n++) {
    let bas = (z < 4.5 ? 0.6 : 2.0) + rnd(0, 0.15) + (Math.random() < 0.12 ? rnd(0.25, 0.4) : 0), haut = faite(z) - 1.2;
    if (z > 7) bas = Math.max(bas, 2.0 + (z - 7) * 0.9);                   // il remonte vers le bout arrondi
    if (z > 8) haut = Math.min(haut, 5.9 + 3.1 * Math.sqrt(Math.max(0, 1 - ((z - 8) / 2.8) ** 2)) - 0.6);
    // (fondu court : 35 cm, sinon une brume sombre ; plus long vers le bout arrondi, et le voile s'efface sur son
    // dernier mètre — entre des cartes plus ajourées, son bord se lisait, vu du coin, comme une plaque peinte)
    const plein = Math.min(haut, bas + 0.35 + Math.max(0, z - 7) * 0.3), a = Math.min(1, Math.max(0, (10.2 - z) / 1.2));
    haut = Math.max(haut, plein);
    pos.push(XF, bas, z, XF, plein, z, XF, haut, z);
    col.push(1, 1, 1, 0, 1, 1, 1, a, 1, 1, 1, a);
    uv.push(z / 3.1, bas / 4, z / 3.1, plein / 4, z / 3.1, haut / 4);
    if (n) {
      const a = (n - 1) * 3;
      idx.push(a, a + 3, a + 1, a + 3, a + 4, a + 1, a + 1, a + 4, a + 2, a + 4, a + 5, a + 2);
    }
  }
  const gf = new THREE.BufferGeometry();
  gf.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  gf.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  gf.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  gf.setIndex(idx);
  // matériau SANS éclairage : un fond éclairé tombait au noir (#030604 mesuré), bien plus sombre que le
  // cœur du rideau sur la photo (#292e29, le quart de l'enrobé)
  // Un aplat se lisait comme un mur peint : il porte une toile de feuillage dans l'ombre, avec quelques
  // éclats de ciel entre 2,3 et 4 m (sous la voûte, la photo en montre toujours quelques-uns).
  const fond = new THREE.Mesh(gf, new THREE.MeshBasicMaterial({ map: fondRideau(K.canvasTex), vertexColors: true, transparent: true, depthWrite: false }));
  fond.castShadow = false; fond.receiveShadow = false; scene.add(fond);
  // Déclaré avec le feuillage : la passe de normales de l'occlusion (js/fx.js) masque les feuilles mais
  // voyait ce voile, et l'occlusion calculée SUR LUI assombrissait tout le haut du rideau posé devant
  // (vu de la caméra de diffusion, une grande plaque noire au-dessus du filet).
  declarerFeuillage(scene, fond);
}

// LE RIDEAU DU QUAI, POUR LES ZONES DU PARC ENTIER (lot B1 : js/parc/zones/z03_promenade.js et z19_quai_seine.js).
// La double rangée d'arbres taillés de la promenade basse, et le rideau du plateau prolongé au-delà de l'esplanade,
// portent les MÊMES feuilles (feuillesMurier, et le matériau de tilleulsEnRideau, mêmes réglages : même programme) et
// la même écorce que le rideau du plateau : on passe de l'un à l'autre sans couture. Avec eux, les outils qui les
// posent (tuyauQuai, aLOmbre) et la déclaration du feuillage (GTAO). Jamais appelé drapeau baissé : rien ne change.
// (lot L3 : les cartes des zones — js/parc/zones/z03_promenade.js, Cartes — couvrent la tuile ENTIÈRE, en UV 0 à 1 ;
// feuillesMurier est devenue un atlas de quatre tuiles. Elles reçoivent donc une copie de la texture cadrée sur la
// tuile 0, la grappe, celle d'avant : même image, même texture sur la carte graphique — three la partage par sa
// source —, seul le cadrage change. Et la même écorce réelle que les fûts du plateau.)
export function rideauQuaiPourZones(K) {
  const tuile0 = feuillesMurier(K.canvasTex).clone();
  tuile0.repeat.set(0.492, 0.492); tuile0.offset.set(0.004, 0.504);
  const feuilles = materiauFeuilles(tuile0, rideauFeuilles(tuile0));
  const tex = ecorceQuai(K.canvasTex);
  const ecorce = new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 1.0, roughness: 0.9, vertexColors: true });
  ecorceReelle(ecorce, 'ecorce_platane', [1, 1.5], { melange: 0.6, normale: 1.2 });
  return { feuilles, ecorce, tuyau: tuyauQuai, aLOmbre, declarerFeuillage };
}
// LE FEUILLAGE DU RIDEAU (le plateau et les zones du parc entier : même programme). Lot L3 :
//  - le ciel transmis ramené de 0,3 à 0,25 : le rideau sortait à 0,72 fois l'enrobé en extrême, 0,87 à 0,93 en
//    moyenne, pour 0,35 à 0,6 sur les photos 340, 343 et 185558. Avec le cœur plus sombre (coudre), les tuiles plus
//    ajourées (feuillesMurier) et la plongée de la caméra de diffusion (materiauFeuilles), il sort à 0,5-0,55 en match,
//    en extrême comme en moyenne avec la carte du ciel (0,12, la valeur du plan, le laissait à 0,45) ;
//  - le soleil transmis (materiauFeuilles) : le faîte, que l'écran du pin laisse au soleil, se dore à contre-jour ;
//  - l'atlas : sa largeur en texels par unité d'UV, pour l'alpha des mipmaps (1024 sur PC ; 512 sur téléphone, où
//    canvasTex et les textures cuites « tel » le réduisent de moitié) ;
//  - le vent d'une haie taillée : 0,6.
function rideauFeuilles(tex) {
  const l = (tex.image && tex.image.width) || 1024;
  return { trans: 0.25, rugosite: 0.56, alpha: 0.42, silhouette: 0.85, vent: 0.6, taille: l };
}

// Écorce des mûriers-platanes du quai : lisse, GRIS CLAIR (#787772 en moyenne sur la photo), fines
// fissures verticales sombres, crêtes plus claires, plaques de lichen vert-gris. Sert aussi de relief.
function ecorceQuai(canvasTex) {
  const cuite = texCuite(ecorceQuai, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#afaca3'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const v = Math.floor(rnd(105, 160));
      g.fillStyle = `rgba(${v},${v - 2},${v - 8},${rnd(0.12, 0.35)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 4), rnd(2, 10));
    }
    // plaques de lichen et zones plus pâles
    for (let i = 0; i < 26; i++) {
      g.fillStyle = Math.random() < 0.6 ? 'rgba(125,133,108,0.35)' : 'rgba(163,165,150,0.3)';
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, rnd(8, 26), rnd(14, 50), rnd(-0.3, 0.3), 0, 6.2832); g.fill();
    }
    // fissures verticales ondulées, recopiées de part et d'autre du bord pour que la tuile se raccorde
    for (let i = 0; i < 34; i++) {
      const x0 = Math.random() * w, lw = rnd(1.2, 3.6), pts = [];
      let x = x0;
      for (let y = -20; y < h + 20; y += rnd(14, 34)) { x += rnd(-4, 4); pts.push([x, y]); }
      for (const dx of [-w, 0, w]) {
        g.strokeStyle = 'rgba(75,74,69,0.6)'; g.lineWidth = lw; g.beginPath();
        pts.forEach(([px, py], k) => (k ? g.lineTo(px + dx, py) : g.moveTo(px + dx, py))); g.stroke();
        g.strokeStyle = 'rgba(155,153,144,0.35)'; g.lineWidth = 1.2; g.beginPath();
        pts.forEach(([px, py], k) => (k ? g.lineTo(px + dx + lw, py) : g.moveTo(px + dx + lw, py))); g.stroke();
      }
    }
  }, [1, 1], false, 4);
}

// Le cœur du rideau, vu entre les feuilles : un gris-vert sombre et neutre (#383e3c ; #2e3831 saturait la bande
// sous les couronnes à 0,25) moucheté de petites feuilles dans l'ombre, et percé de jours. Une tuile couvre
// 3,1 m x 4 m : ses 200 premières lignes sont la bande de 0,8 à 4 m, sous la voûte, où la lumière passe.
function fondRideau(canvasTex) {
  const cuite = texCuite(fondRideau, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#383e3c'; g.fillRect(0, 0, w, h);
    // (des feuilles de 5 à 12 cm : à 6-16 px, elles faisaient de grosses taches, un décor peint derrière les troncs)
    for (let i = 0; i < 900; i++) {
      const v = rnd(0.7, 1.3);
      g.fillStyle = `rgba(${56 * v | 0},${62 * v | 0},${60 * v | 0},0.85)`;
      g.save(); g.translate(Math.random() * w, Math.random() * h); g.rotate(rnd(-0.8, 0.8));
      g.beginPath(); g.ellipse(0, 0, rnd(2.5, 5), rnd(3.5, 7), 0, 0, 6.2832); g.fill(); g.restore();
    }
    // les éclats sont de VRAIS trous (le quai, la berge, le ciel au travers, à leur couleur du moment), et non plus
    // des taches gris clair peintes : sous les couronnes, le panorama en montre des dizaines, de 0,8 à 3,9 m
    // (par grappes de 3 à 8 éclats de 1 à 3 px, de plus en plus nombreuses vers le bas : un semis régulier
    // d'ovales se lisait comme des pois)
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 44; i++) {
      const x0 = Math.random() * w, y0 = 4 + 200 * Math.pow(Math.random(), 0.55);
      for (let k = 0, n = 3 + Math.floor(Math.random() * 6); k < n; k++) {
        g.globalAlpha = rnd(0.35, 0.85);   // plus ou moins ouverts : pas des pois blancs, des jours
        g.beginPath(); g.ellipse(x0 + rnd(-12, 12), y0 + rnd(-9, 9), rnd(0.8, 2.8), rnd(1, 3.2), rnd(0, 3), 0, 6.2832); g.fill();
      }
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }, [1, 1], false, 4);
}

// FEUILLES DE MÛRIER-PLATANE (photo 43, recadrages t43_leaves_close et p43_leaves) : grandes feuilles en cœur
// à pointe effilée, un tiers à trois lobes, bord denté, pétiole visible, qui PENDENT en chapelets le long de
// rameaux. La tuile couvre un plan de 1,35 m : 380 px par mètre ; les feuilles y font 23 à 33 cm (86 à 124 px),
// comme sur la photo mesurée contre l'écartement des mâts (4,6 m).
// Palette désaturée relevée sur les photos : sombre, moyen, clair, gris-bleu (le ciel renvoyé par les
// feuilles luisantes), vert clair (à contre-jour). Les sombres sont dessinées d'abord, les claires par-dessus.
// UN ATLAS DE QUATRE TUILES (lot L3 ; 1024 px, deux fois 512 — une tuile garde ses 380 px par mètre). Une seule tuile
// répétée sur trois mille plans, c'était le papier peint : même grappes, même taille, même jour. Quatre :
//  0 GRAPPE : la tuile d'avant, des chapelets de 5 à 9 feuilles, la moitié couverte ;
//  1 CLAIRSEMÉE : moins de feuilles, plus de biais (36 %) — on voit le cœur sombre du rideau au travers ;
//  2 PENDANTE : de longs chapelets presque droits (8 à 12 feuilles), pour la frange et le dessous des bras ;
//  3 FAÎTE : ajourée (30 %), pour le dernier mètre et les pousses de l'année — c'est par elle que le ciel passe au
//    faîte (12 à 13 % sur les photos 343 et 185558 ; il n'y en avait aucun).
// La répartition est dans tilleulsEnRideau (`tuile`). Le même jeu de couleurs est distribué aux quatre.
function feuillesMurier(canvasTex) { return avecTeinte(feuillesMurierBrut(canvasTex), TEINTES_FEUILLES.rideau); }
function feuillesMurierBrut(canvasTex) {
  const cuite = texCuite(feuillesMurierBrut, arguments, [tuileMurier, saigner]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(1024, 1024, (gA, wA) => {
    gA.clearRect(0, 0, wA, wA);
    const T = wA / 2;
    // [couverture visée, rameaux au moins, feuilles par rameau (min, + jusqu'à), départ des rameaux (fraction haute de
    //  la tuile), écart à la verticale, feuilles sombres au cœur, part de feuilles de biais]
    const STYLES = [
      { couv: 0.5, min: 6, n: [5, 5], y0: 0.42, a: 1.0, sombres: 18, biais: 0.35 },
      { couv: 0.36, min: 4, n: [4, 4], y0: 0.5, a: 1.1, sombres: 10, biais: 0.55 },
      { couv: 0.44, min: 5, n: [8, 5], y0: 0.15, a: 0.45, sombres: 14, biais: 0.35 },
      { couv: 0.3, min: 3, n: [3, 4], y0: 0.55, a: 1.2, sombres: 6, biais: 0.45 },
    ];
    STYLES.forEach((S, k) => {
      gA.save(); gA.translate((k % 2) * T, Math.floor(k / 2) * T);
      gA.beginPath(); gA.rect(0, 0, T, T); gA.clip();
      tuileMurier(gA, T, T, S);
      gA.restore();
    });
    saigner(gA);                                                 // (lot L8 : la couleur sous l'alpha nul, voir saigner)
  }, [1, 1], true, 8);
}
// Une tuile de l'atlas (w x h, déjà placée et découpée), dessinée selon son style `S` (voir feuillesMurierBrut).
function tuileMurier(g, w, h, S) {
  {
    const gt = g;
    // Chaque tuile habille des centaines de plans (une seule en habillait 3 000) : une feuille jaune s'y répète des
    // centaines de fois, en motif régulier (le rideau paraissait roussi, tacheté comme un camouflage). Les couleurs sont
    // donc distribuées d'un JEU de cartes battu, aux proportions exactes, et sans jaunie : les touffes jaunies
    // viennent de la teinte par touffe de coudre().
    const PAL = [['#47524c', 18], ['#64716a', 32], ['#7a887f', 22], ['#95a39c', 14], ['#9fae99', 14]];
    const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
    const jeu = [];
    for (const [c, n] of PAL) for (let i = 0; i < n; i++) jeu.push(hex(c));
    for (let i = jeu.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [jeu[i], jeu[j]] = [jeu[j], jeu[i]]; }
    let carte = 0;
    const tirer = () => jeu[carte++ % jeu.length];
    const rgb = (c, k) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
    const bez = (p0, p1, p2, p3, n, out) => {
      for (let i = 1; i <= n; i++) {
        const t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
      }
    };
    // contour du limbe, base en (0, 0), pointe en (0, L) : l'axe +y DESCEND sur la toile, la feuille pend
    const contour = (L, W, lobes) => {
      const pts = [];
      if (!lobes) {
        // en cœur : deux oreillettes de part et d'autre du pétiole, la pointe étirée
        const g0 = [0, 0.1 * L], a = [-0.5 * W, 0.14 * L], b = [-0.36 * W, 0.62 * L], tip = [0, L];
        pts.push(g0);
        bez(g0, [-0.14 * W, -0.1 * L], [-0.46 * W, -0.1 * L], a, 7, pts);
        bez(a, [-0.56 * W, 0.34 * L], [-0.5 * W, 0.5 * L], b, 7, pts);
        bez(b, [-0.22 * W, 0.76 * L], [-0.05 * W, 0.84 * L], tip, 7, pts);
        for (let i = pts.length - 2; i >= 1; i--) pts.push([-pts[i][0], pts[i][1]]);     // l'autre moitié, en miroir
      } else {
        // trois lobes : la pointe, deux lobes latéraux, les oreillettes de la base
        const cy = 0.42 * L, G = (x, m, s) => Math.exp(-(((x - m) / s) ** 2));
        for (let i = 0; i < 44; i++) {
          const f = -Math.PI + (i / 44) * 2 * Math.PI, af = Math.abs(f);
          const r = L * (0.3 + 0.28 * G(af, 0, 0.42) + 0.17 * G(af, 1.75, 0.38) + 0.06 * G(af, 2.6, 0.3) - 0.1 * G(af, Math.PI, 0.22));
          pts.push([Math.sin(f) * r * (W / L) * 1.1, cy + Math.cos(f) * r]);
        }
      }
      // les dents : un point sur deux rentré de 3 % vers le centre du limbe
      const cyc = 0.45 * L;
      return pts.map(([x, y], i) => (i % 2 === 0 || y < 0.15 * L ? [x, y] : [x * 0.97, cyc + (y - cyc) * 0.97]));
    };
    // `x, y` : l'attache du pétiole ; `a` : l'écart à la verticale ; `k` : assombrissement (feuilles du fond)
    // (`fx` : la feuille vue de biais, rétrécie en largeur)
    const feuille = (f, k, g = gt) => {
      const { x, y, a, L, W, pl, c, lobes } = f;
      g.save(); g.translate(x, y); g.rotate(a); g.scale(f.fx || 1, 1);
      g.strokeStyle = 'rgba(92,86,62,0.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, pl + 0.15 * L); g.stroke();
      g.translate(0, pl);
      const pts = contour(L, W, lobes);
      g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath();
      const gr = g.createLinearGradient(0, 0, 0, L);
      gr.addColorStop(0, rgb(c, 0.88 * k)); gr.addColorStop(1, rgb(c, 1.03 * k));
      g.fillStyle = gr; g.fill();
      // la feuille est un peu pliée sur sa nervure : une moitié plus sombre
      g.save(); g.clip(); g.fillStyle = 'rgba(15,25,18,0.14)'; g.fillRect(-L, -0.2 * L, L, 1.4 * L); g.restore();
      g.strokeStyle = 'rgba(215,230,190,0.28)'; g.lineWidth = 1.3; g.beginPath();
      g.moveTo(0, 0.12 * L); g.lineTo(0, 0.92 * L);
      for (const s of [-1, 1]) {
        g.moveTo(0, 0.14 * L); g.quadraticCurveTo(s * 0.2 * W, 0.25 * L, s * 0.36 * W, 0.42 * L);
        g.moveTo(0, 0.4 * L); g.lineTo(s * 0.26 * W, 0.62 * L);
      }
      g.stroke(); g.restore();
    };
    // une feuille n'est posée que si elle tient entière dans la tuile : coupée au bord, elle ferait un trait
    // droit au bord de chaque plan
    const nouvelle = (x, y, a) => {
      const L = rnd(58, 84);                       // (15 à 22 cm sur un plan de 1,35 m : photos 39 et 43)
      return { x, y, a, L, W: L * rnd(0.72, 0.88), pl: L * rnd(0.12, 0.28), c: tirer(), lobes: Math.random() < 0.35 };
    };
    const tient = (f) => {
      const ca = Math.cos(f.a), sa = Math.sin(f.a), hw = 0.6 * f.W * (f.fx || 1), lo = f.pl + f.L;
      for (const [px, py] of [[-hw, 0], [hw, 0], [-hw, lo], [hw, lo], [-hw, f.pl], [hw, f.pl]]) {
        const X = f.x + px * ca - py * sa, Y = f.y + px * sa + py * ca;
        if (X < 3 || X > w - 3 || Y < 3 || Y > h - 3) return false;
      }
      return true;
    };
    const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
    // DES GRAPPES, PAS UN TAPIS. La tuile était remplie bord à bord (64 feuilles de fond, 95 pour « boucher les
    // vides ») : trois mille plans jointifs faisaient un mur d'écailles uniforme. Sur les photos 43 et du
    // panorama, le rideau RESPIRE : des chapelets de feuilles qui pendent au bout de rameaux arqués, chacun
    // d'une même teinte, des feuilles vues de biais (étroites), et entre eux des trous où l'on voit le cœur
    // sombre du rideau — ou le ciel, au faîte. Ici : des rameaux de 5 à 9 feuilles, quelques feuilles sombres
    // au cœur des grappes, et la tuile laissée VIDE entre elles.
    // La COUVERTURE est tenue : une seule tuile habille tout le rideau, et au hasard de neuf grappes elle allait
    // de 36 à 55 % d'une partie à l'autre (le rideau passait du plein au clairsemé, 0,33 à 0,47 de l'enrobé à
    // mi-hauteur). On ajoute des grappes jusqu'à la moitié de la tuile, mesurée sur un masque au quart.
    g.lineCap = 'round';
    const masque = document.createElement('canvas'); masque.width = masque.height = 128;
    const mg = masque.getContext('2d', { willReadFrequently: true }); mg.scale(128 / w, 128 / h);
    const couverture = () => {
      const d = mg.getImageData(0, 0, 128, 128).data; let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 107) n++;
      return n / 16384;
    };
    // (les chiffres de la tuile d'avant sont ceux du style 0 ; les autres tuiles les varient, voir feuillesMurierBrut)
    const grappes = [];
    while (grappes.length < 24 && (grappes.length < S.min || couverture() < S.couv)) {
      let x = rnd(70, w - 70), y = rnd(8, h * S.y0), a = rnd(-S.a, S.a);   // `a` : écart du rameau à la verticale
      const c0 = tirer(), pts = [[x, y]], fe = [];
      for (let k = 0, n = S.n[0] + Math.floor(Math.random() * S.n[1]); k < n; k++) {
        const pas = rnd(26, 40);
        x += Math.sin(a) * pas; y += Math.cos(a) * pas; a *= 0.8;   // il retombe en s'allongeant
        pts.push([x, y]);
        const f = nouvelle(x, y, -a + (k % 2 ? 1 : -1) * rnd(0.3, 0.85));
        f.c = c0.map((v) => v * rnd(0.92, 1.08)); f.fx = Math.random() < S.biais ? rnd(0.45, 0.75) : rnd(0.82, 1);
        if (tient(f)) fe.push(f);
      }
      for (const f of fe) feuille(f, 1, mg);
      grappes.push({ pts, fe, l: lum(c0) });
    }
    // 1) au cœur des grappes, des feuilles assombries (la profondeur)
    for (let i = 0; i < S.sombres; i++) {
      const G = grappes[i % grappes.length], p = G.pts[1 + Math.floor(Math.random() * (G.pts.length - 1))];
      const f = nouvelle(p[0] + rnd(-25, 25), p[1] + rnd(-30, 10), rnd(-0.7, 0.7));
      f.fx = rnd(0.6, 1);
      if (tient(f)) feuille(f, 0.66);
    }
    // 2) les rameaux, puis leurs feuilles, les grappes sombres d'abord
    grappes.sort((a, b) => a.l - b.l);
    for (const G of grappes) {
      g.strokeStyle = 'rgba(78,70,56,0.85)'; g.lineWidth = rnd(1.6, 2.6); g.beginPath();
      G.pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
      for (const f of G.fe) feuille(f, 1);
    }
  }
}

// LA HAIE BASSE DU QUAI (photo 43) : du troène à petites feuilles, 1 m de haut, de x = 6,36 (contre le
// treillis) à 7,0, de z = -9,3 à 6,5. Elle n'est PAS une boîte : on voit ses tiges au pied, elle est plus
// maigre au bout des platanes, ouverte devant le banc brun (une trouée d'un mètre où l'on voit le banc et le
// fourgon blanc), plus basse derrière le banc blanc. Ni ombre portée, ni ombre reçue (elle rendait noire).
// Au-delà du coin des platanes, elle suit le grand grillage jusqu'à son bout (Z_FIN_QUAI) : sur les photos
// 1000051340 et 603, sa masse sombre file derrière la maille couverte de lierre, le long du passage et de
// l'esplanade. Elle s'arrêtait à -9,3 et laissait voir, du coin, l'allée du quai nue sous le rideau.
function haieQuai(scene, K, cx) {
  // tronçons relevés sur la photo 43 : [z0, z1, densité, hauteur] ; les sept premiers longent le passage et
  // l'esplanade, et gardent la même recette (le premier du plateau, clairsemé, s'y raccorde sans couture : même
  // densité et même hauteur de part et d'autre de z = -9,3), avec des maigres, des creux et un bout plus bas
  const TRONCONS = [
    [Z_FIN_QUAI + 0.15, -45.6, 0.65, 0.9],   // le bout, contre le dernier piquet : plus maigre et plus bas
    [-45.6, -33.4, 1.0, 1.0],
    [-33.4, -32.3, 0.45, 0.85],   // un creux
    [-32.3, -21.9, 1.0, 1.03],
    [-21.9, -20.8, 0.5, 0.9],     // un pied mort, les tiges se voient
    [-20.8, -12.2, 1.0, 1.0],
    [-12.2, -9.3, 0.55, 0.95],    // en approchant du coin, elle s'éclaircit comme au bout des platanes
    [-9.3, -7.0, 0.55, 0.95],     // bout des platanes : clairsemé, les tiges se voient
    [-7.0, -2.6, 1.0, 1.0],
    [-2.6, -1.6, 0.08, 0.35],     // la trouée devant le banc brun
    [-1.6, -0.8, 0.45, 1.1],      // un arbuste léger, plus haut
    [-0.8, 5.2, 1.0, 1.02],
    [5.2, 6.5, 0.7, 0.85],        // derrière le banc blanc
  ];
  // (parc entier : la haie pleine est un obstacle du monde, de la maille à sa face côté quai — pas la trouée)
  const obs = scene.userData.obstaclesDecor;
  if (obs) for (const [z0, z1, dens, H] of TRONCONS) if (dens >= 0.4) obs.push({ t: 's', x0: cx(6.7), z0, x1: cx(6.7), z1, e: 0.66, h: H, qui: 'tous', type: 'haie', source: 'haie du quai' });
  const touffes = [], infos = [], o = new THREE.Object3D(), plan = new THREE.PlaneGeometry(1, 1);
  o.rotation.order = 'YXZ';
  const XF = cx(6.36);
  // `tige` : le plan prend la moitié basse de la tuile (des tiges et quelques feuilles), sinon la moitié haute
  const poser = (x, y, z, tangage, cap, roulis, s, tige, info) => {
    o.position.set(cx(x), y, z); o.rotation.set(tangage, cap, roulis); o.scale.set(s, s, 1); o.updateMatrix();
    const g = plan.clone(), uv = g.attributes.uv, m = Math.random() < 0.5;
    for (let k = 0; k < uv.count; k++) { const u = uv.getX(k), v = uv.getY(k); uv.setXY(k, m ? 1 - u : u, tige ? v * 0.5 : 0.5 + v * 0.5); }
    g.applyMatrix4(o.matrix); g.computeBoundingBox();
    const b = g.boundingBox;
    if (b.min.x < XF) g.translate(XF - b.min.x, 0, 0);                 // jamais à travers le treillis
    if (b.min.y < 0) g.translate(0, -b.min.y, 0);
    touffes.push(g); infos.push(info);
  };
  // UNE HAIE TAILLÉE, VUE DE PRÈS (photo 43). Les plans posés en tous sens (cap ±40°, roulis ±35°, 40 par
  // mètre) faisaient une file de coussins gris-vert. Une haie de troène taillée, c'est une SURFACE : des
  // centaines de petites touffes presque dans le plan de la face (à ±20° près), un dessus à plat, quelques
  // pousses qui dépassent, du sombre dans les creux, et un cœur plein où l'œil ne traverse pas (sauf à la
  // trouée et au bout des platanes, plus maigres).
  const FACE = -Math.PI / 2, coeur = [];
  for (const [z0, z1, dens, H] of TRONCONS) {
    const L = z1 - z0;
    const haut = (z) => H + 0.06 * Math.sin(z * 2.1) + 0.035 * Math.sin(z * 5.3 + 1) + 0.02 * Math.sin(z * 13.7);   // dessus pas au cordeau
    const info = (z, h, t) => ({ c: [cx(6.72), h * 0.35, z], r: 0.75, t });
    // (1) la face côté terrain : 70 touffes par mètre, plus claires en haut (elles prennent le ciel)
    for (let i = 0, n = Math.round(L * 70 * dens); i < n; i++) {
      const z = rnd(z0, z1), h = haut(z), y = rnd(0.3, h - 0.08);
      poser(rnd(6.4, 6.5), y, z, rnd(-0.35, 0.35), FACE + rnd(-0.35, 0.35), rnd(0, 6.283), rnd(0.3, 0.44), false,
        info(z, h, rnd(0.88, 1.06) * (0.88 + 0.14 * y / h)));
    }
    // (2) le dessus, à plat à ±23°
    for (let i = 0, n = Math.round(L * 34 * dens); i < n; i++) {
      const z = rnd(z0, z1), h = haut(z);
      poser(rnd(6.44, 6.95), h - rnd(0, 0.07), z, -Math.PI / 2 + rnd(-0.4, 0.4), rnd(0, 6.283), rnd(-0.3, 0.3), rnd(0.34, 0.5), false,
        info(z, h, rnd(0.98, 1.12)));
    }
    // (3) les pousses de l'année, qui dépassent de 10 à 20 cm
    for (let i = 0, n = Math.round(L * 3 * dens); i < n; i++) {
      const z = rnd(z0, z1), h = haut(z);
      poser(rnd(6.45, 6.9), h + rnd(0.02, 0.08), z, rnd(-0.3, 0.3), rnd(0, 6.283), rnd(-0.4, 0.4), rnd(0.18, 0.26), false, info(z, h, rnd(0.95, 1.05)));
    }
    // (4) les creux, plus sombres, un peu en retrait
    for (let i = 0, n = Math.round(L * 18 * dens); i < n; i++) {
      const z = rnd(z0, z1), h = haut(z);
      poser(rnd(6.55, 6.85), rnd(0.3, Math.max(0.31, h - 0.2)), z, rnd(-0.5, 0.5), rnd(0, Math.PI), rnd(0, 6.283), rnd(0.35, 0.5), false, info(z, h, rnd(0.5, 0.62)));
    }
    // (5) le pied : des tiges, peu de feuilles
    for (let i = 0, n = Math.round(L * 7 * dens); i < n; i++) {
      const z = rnd(z0, z1), h = haut(z);
      poser(rnd(6.42, 6.8), rnd(0.18, 0.3), z, rnd(-0.1, 0.1), FACE + rnd(-0.6, 0.6), rnd(-0.1, 0.1), rnd(0.4, 0.55), true, info(z, h, rnd(0.8, 1.0)));
    }
    // (6) le cœur plein, là où la haie est dense : une bande vert-noir au bord haut déchiqueté, 25 cm derrière la face
    if (dens >= 0.9) {
      for (let z = z0; z < z1 - 0.01; z += 0.2) {
        const za = z, zb = Math.min(z1, z + 0.2), ha = haut(za) - rnd(0.1, 0.22), hb = haut(zb) - rnd(0.1, 0.22);
        coeur.push(cx(6.68), 0.25, za, cx(6.68), ha, za, cx(6.68), 0.25, zb, cx(6.68), 0.25, zb, cx(6.68), ha, za, cx(6.68), hb, zb);
      }
    }
  }
  const mat = materiauFeuilles(feuillesTroene(K.canvasTex), { trans: 0.3, rugosite: 0.75, alpha: 0.45 });
  const m = new THREE.Mesh(aLOmbre(coudre(touffes, infos), 0.45, 0.05), mat);          // sous le rideau : à l'ombre
  m.castShadow = false; m.receiveShadow = false; m.customDepthMaterial = mat.userData.ombre;
  scene.add(m); declarerFeuillage(scene, m);
  const gc = new THREE.BufferGeometry();
  gc.setAttribute('position', new THREE.Float32BufferAttribute(coeur, 3)); gc.computeVertexNormals();
  const plein = new THREE.Mesh(gc, new THREE.MeshLambertMaterial({ color: 0x2b2c27, side: THREE.DoubleSide }));
  plein.castShadow = false; plein.receiveShadow = false; scene.add(plein); declarerFeuillage(scene, plein);
}

// Troène : petites feuilles elliptiques de 4 à 6 cm (20 à 30 px pour un plan de 0,5 m), gris-vert, quelques
// brunes sèches, sur de fines tiges. Moitié HAUTE de la tuile : le feuillage ; moitié BASSE : le pied de la
// haie, des tiges et quelques feuilles. Rien ne déborde d'une moitié sur l'autre.
// (Lot L8 : moins contrastée. Sous le rideau, dans la caméra de diffusion du terrain 1, la haie sortait mouchetée de
// feuilles presque noires et de feuilles claires, là où la photo 185558 montre une masse gris-vert égale. La palette
// est resserrée de 40 % autour de sa moyenne pondérée — (83, 85, 77), inchangée : même teinte, même clarté —, la
// sous-couche d'ombre rapprochée de moitié de cette moyenne (#2e2f2a -> #41423c), les nervures adoucies. Avant :
// #383934, #4c4e47, #5c5e56, #6d6f62, #6a6b64, #6b5f4f.)
function feuillesTroene(canvasTex) { return avecTeinte(feuillesTroeneBrut(canvasTex), TEINTES_FEUILLES.haie); }
function feuillesTroeneBrut(canvasTex) {
  const cuite = texCuite(feuillesTroeneBrut, arguments, [saigner]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const H2 = h / 2;
    const PAL = [['#43443e', 0.21], ['#4f5149', 0.31], ['#595a52', 0.23], ['#63645a', 0.14], ['#61625b', 0.08], ['#625b4e', 0.03]];
    const tirer = () => { let r = Math.random(); for (const [c, p] of PAL) { if ((r -= p) < 0) return c; } return PAL[1][0]; };
    const lum = (c) => parseInt(c.slice(1, 3), 16) * 0.3 + parseInt(c.slice(3, 5), 16) * 0.59 + parseInt(c.slice(5, 7), 16) * 0.11;
    const feuille = (x, y, a, l, c) => {
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, l * 0.5, l * 0.24, 0, 0, 6.2832); g.fill();
      g.strokeStyle = 'rgba(200,210,170,0.08)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-0.42 * l, 0); g.lineTo(0.42 * l, 0); g.stroke();
      g.restore();
    };
    const tiges = (y0, y1, n, lw, col) => {
      g.strokeStyle = col; g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        let x = rnd(10, w - 10), y = y1;
        g.lineWidth = rnd(lw[0], lw[1]); g.beginPath(); g.moveTo(x, y);
        while (y > y0) { y = Math.max(y0, y - rnd(12, 26)); x = Math.min(w - 4, Math.max(4, x + rnd(-7, 7))); g.lineTo(x, y); }
        g.stroke();
      }
    };
    // HAUT : une touffe au contour DÉCHIQUETÉ (un carré plein bord à bord faisait, plan contre plan, des
    // coussins à coins ronds) : sous-couche de feuilles dans l'ombre, puis 460 feuilles, les sombres d'abord
    const R = (a) => 116 * (0.8 + 0.12 * Math.sin(a * 3 + 1) + 0.08 * Math.sin(a * 7 + 2));
    const dansTouffe = (l) => {
      const a = Math.random() * 6.2832, r = Math.sqrt(Math.random()) * (R(a) - l / 2);
      return [128 + Math.cos(a) * r, H2 / 2 + Math.sin(a) * r];
    };
    tiges(8, H2 - 8, 12, [1, 2], 'rgba(92,82,66,0.8)');
    for (let i = 0; i < 140; i++) { const l = rnd(20, 28), [x, y] = dansTouffe(l); feuille(x, y, rnd(0, 6.28), l, '#41423c'); }
    const f = [];
    for (let i = 0; i < 460; i++) { const l = rnd(20, 30), [x, y] = dansTouffe(l); f.push([x, y, rnd(0, 6.28), l, tirer()]); }
    f.sort((a, b) => lum(a[4]) - lum(b[4]));
    for (const [x, y, a, l, c] of f) feuille(x, y, a, l, c);
    // BAS : le pied, des tiges brunes qui montent du sol, quelques feuilles vers le haut
    tiges(H2 + 8, h - 3, 26, [1.5, 3], 'rgba(90,80,70,0.9)');
    for (let i = 0; i < 90; i++) { const l = rnd(20, 28); feuille(rnd(l / 2 + 2, w - l / 2 - 2), rnd(H2 + l / 2 + 4, H2 + 130), rnd(0, 6.28), l, tirer()); }
    saigner(g);                                                  // (lot L8 : la couleur sous l'alpha nul, voir saigner)
  }, [1, 1], true, 4);
}

// L'ARBUSTE POURPRE entre la haie et le coin du pin (photos 39 et 43) : un prunus à feuillage pourpre-brun,
// 1,25 m, 1,6 m de large, AÉRÉ — on voit ses tiges et, au travers, le banc brun et le car. Au-delà (z 8,2 à
// 9,1), plus rien : le coin reste ouvert. `x`, `z` : son pied, dans le repère du terrain 1.
function arbustePourpre(scene, K, cx, x, z) {
  const bois = [], touffes = [], infos = [], o = new THREE.Object3D(), plan = new THREE.PlaneGeometry(1, 1);
  const V = (a, b, c) => new THREE.Vector3(cx(a), b, c);
  for (let i = 0; i < 8; i++) {
    const bx = x + rnd(-0.12, 0.12), bz = z + rnd(-0.2, 0.2), hh = rnd(0.9, 1.25);
    const lx = rnd(-0.25, 0.3), lz = rnd(-0.55, 0.55);
    bois.push(tuyauQuai([V(bx, -0.02, bz), V(bx + lx * 0.4, hh * 0.5, bz + lz * 0.45), V(bx + lx, hh, bz + lz)], [0.024, 0.016, 0.006], 4, 5));
    const t0 = rnd(0.35, 0.6), dz = rnd(-0.4, 0.4);
    bois.push(tuyauQuai([V(bx + lx * t0 * 0.8, hh * t0, bz + lz * t0), V(bx + lx * t0 + rnd(-0.2, 0.2), hh * t0 + rnd(0.25, 0.45), bz + lz * t0 + dz)], [0.01, 0.004], 2, 4));
  }
  const tiges = new THREE.Mesh(mergeGeometries(bois), new THREE.MeshStandardMaterial({ color: 0x4a3f38, roughness: 0.9 }));
  tiges.castShadow = false; scene.add(tiges);
  // 55 plans dans un ellipsoïde (0,5 x 0,55 x 0,8 m), tirés vers la surface ; jamais à travers le treillis.
  // (Photos 1000051343 et 339 : on devine le car bleu au travers. Avec 80 plans de 32 à 50 cm, c'était une boule
  // pleine, brun-noir.)
  const XF = cx(6.36);
  for (let i = 0; i < 55; i++) {
    const u = Math.random() * 6.2832, v = Math.acos(rnd(-1, 1)), rr = Math.pow(Math.random(), 0.55);
    const y = 0.72 + Math.cos(v) * 0.55 * rr;
    if (y < 0.28) continue;
    o.position.set(cx(x + Math.cos(u) * Math.sin(v) * 0.5 * rr), y, z + Math.sin(u) * Math.sin(v) * 0.8 * rr);
    o.rotation.set(rnd(-0.7, 0.7), rnd(0, 6.28), rnd(-0.6, 0.6)); o.scale.setScalar(rnd(0.25, 0.4)); o.updateMatrix();
    const g = plan.clone().applyMatrix4(o.matrix);
    g.computeBoundingBox(); if (g.boundingBox.min.x < XF) g.translate(XF - g.boundingBox.min.x, 0, 0);
    touffes.push(g); infos.push({ c: [cx(x), 0.7, z], r: 0.75, t: rnd(0.85, 1.15) });
  }
  const mat = materiauFeuilles(feuillesPourpres(K.canvasTex), { trans: 0.22, rugosite: 0.7, alpha: 0.45 });
  const m = new THREE.Mesh(aLOmbre(coudre(touffes, infos), 0.35, 0.1), mat);
  m.castShadow = false; m.receiveShadow = false; m.customDepthMaterial = mat.userData.ombre;
  scene.add(m); declarerFeuillage(scene, m);
}

// Feuilles de prunus pourpre : ovales pointues de 4 à 6 cm, pourpre-brun (#5b4640, #735a50), un quart encore
// vert (#566048), sur des rameaux fins. La tuile n'est couverte qu'au tiers : l'arbuste est aéré (130 feuilles,
// et non plus 190 qui la couvraient à moitié).
function feuillesPourpres(canvasTex) { return avecTeinte(feuillesPourpresBrut(canvasTex), TEINTES_FEUILLES.pourpre); }
function feuillesPourpresBrut(canvasTex) {
  const cuite = texCuite(feuillesPourpresBrut, arguments, [saigner]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const PAL = [['#4e3d38', 0.2], ['#5b4640', 0.3], ['#735a50', 0.2], ['#566048', 0.25], ['#8a6f62', 0.05]];
    const tirer = () => { let r = Math.random(); for (const [c, p] of PAL) { if ((r -= p) < 0) return c; } return PAL[1][0]; };
    g.strokeStyle = 'rgba(74,63,56,0.9)'; g.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      let x = rnd(10, w - 10), y = h - rnd(0, 20);
      g.lineWidth = rnd(1, 2); g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x = Math.min(w - 4, Math.max(4, x + rnd(-18, 18))); y -= rnd(20, 40); g.lineTo(x, Math.max(4, y)); }
      g.stroke();
    }
    for (let i = 0; i < 130; i++) {
      const l = rnd(22, 34), x = rnd(l / 2 + 3, w - l / 2 - 3), y = rnd(l / 2 + 3, h - l / 2 - 3);
      g.save(); g.translate(x, y); g.rotate(rnd(0, 6.28)); g.fillStyle = tirer();
      g.beginPath(); g.moveTo(0, -l / 2); g.quadraticCurveTo(0.4 * l, -0.1 * l, 0, l / 2); g.quadraticCurveTo(-0.4 * l, -0.1 * l, 0, -l / 2); g.fill();
      g.strokeStyle = 'rgba(190,160,150,0.25)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, -0.42 * l); g.lineTo(0, 0.42 * l); g.stroke();
      g.restore();
    }
    saigner(g);                                                  // (lot L8 : la couleur sous l'alpha nul, voir saigner)
  }, [1, 1], true, 4);
}

// =====================================================================
//  LE QUAI, LA SEINE, L'ÎLE
// =====================================================================
// LE QUAI, EN CONTREBAS. Le plateau est à près de deux mètres au-dessus de la chaussée : derrière la haie et
// le rideau d'arbres, une allée de parc (bancs bruns tournés vers la Seine), puis la crête d'un talus avec
// sa grille noire, le trottoir, la grande route (le car bleu garé, des utilitaires blancs, la circulation),
// le parapet, l'enrochement, la Seine, et en face l'île, ses arbres et ses immeubles crème.
// `x0` = le début de l'allée (repère du jeu) ; tout le reste s'en déduit. (`matStab` ne sert plus : l'allée est
// en enrobé.)
function lesQuais(scene, K, x0, matStab) {
  const { box, M } = K;
  const Y_BAS = -1.8, Y_ROUTE = -1.9, Y_EAU = -6.5;
  // L'ALLÉE ET SES BANCS BRUNS. Elle n'est pas en stabilisé : sur les photos 1000051339, 343 et 185558, entre les
  // bancs, c'est un ENROBÉ gris neutre, aussi clair que celui du plateau (le stabilisé rosé d'avant faisait, sous la
  // haie, une bande beige). La toile de l'enrobé du plateau, reprise telle quelle (même image, rien à redessiner :
  // 1 024 px et 300 000 grains), une tuile tous les 4 m, SANS teinte : vue du coin du pin à travers le treillis
  // (pose de la photo 339), elle sort alors à 1,0 fois l'enrobé du plateau, gris neutre (saturation 0,02) — la photo,
  // où le soleil la prend encore, en donne 1,26. Teintée 0xb4b4b4, elle tombait à 0,72.
  const plateau = scene.children.find((m) => m.isMesh && m.material && m.material.userData.solPlateau);
  const mapAllee = plateau ? plateau.material.map.clone() : bitumeParc(K.canvasTex);
  mapAllee.repeat.set(3.5 / 4, 160 / 4);
  const matAllee = new THREE.MeshStandardMaterial({ map: mapAllee, roughness: 0.93 });
  const allee = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 160), matAllee);
  allee.rotation.x = -Math.PI / 2; allee.position.set(x0 + 1.75, 0.005, 0); allee.receiveShadow = true; scene.add(allee);
  // sous la haie, de x = 6,4 (le bout de la bande de terre du plateau) à l'allée : de la terre et des feuilles, pas
  // du gazon (photos 1000051343 et 185558 : entre les pieds de la haie, on voit le sol nu)
  const matSousHaie = new THREE.MeshStandardMaterial({ map: terreQuai(K.canvasTex), roughness: 1 });
  matSousHaie.map.repeat.set(1, 80);
  const sousHaie = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 160), matSousHaie);
  sousHaie.rotation.x = -Math.PI / 2; sousHaie.position.set(x0 - 0.45, 0.003, 0); sousHaie.receiveShadow = true; scene.add(sousHaie);
  // (le banc du coin à z = 8,4 et non 9,6 : au-delà de z = 9,4 le talus du pin de vegetationPin, qui couvre
  // toute la largeur jusqu'à XCRETE, monte sur l'allée — à 9,6 le bout +z du banc était enterré de 0,41 m)
  for (const z of [8.4, -2.1, -14, -20]) banc(scene, K, x0 + 1.3, z, Math.PI / 2, 0x3a3431, 1.9, { dos: '5lattes' });
  // le talus qui descend à la route, et la grille noire sur la crête
  const xc = x0 + 3.5, xp = x0 + 5.0;
  const matHerbe = new THREE.MeshStandardMaterial({ color: 0x7f9a6e, roughness: 1 });
  const pente = Math.atan2(-Y_BAS, xp - xc), lp = Math.hypot(xp - xc, Y_BAS);
  const talus = new THREE.Mesh(new THREE.PlaneGeometry(lp, 160), matHerbe);
  // à plat (x -> x, y -> -z), puis penché autour de z : le côté +x descend
  talus.rotation.order = 'ZYX'; talus.rotation.x = -Math.PI / 2; talus.rotation.z = -pente;
  talus.position.set((xc + xp) / 2, Y_BAS / 2, 0); talus.receiveShadow = true; scene.add(talus);
  const fer = new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.5, metalness: 0.6 });
  for (const y of [0.1, 1.1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 160, 6), fer); r.rotation.x = Math.PI / 2; r.position.set(xc, y, 0); scene.add(r); }
  const nb = Math.floor(160 / 0.14), barreaux = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 1.0, 3, 1, true), fer, nb);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < nb; i++) { m4.makeTranslation(xc, 0.6, -80 + i * 0.14); barreaux.setMatrixAt(i, m4); }
  scene.add(barreaux);
  // trottoir, bordure, route
  const matTrottoir = new THREE.MeshStandardMaterial({ color: 0xb8b4b0, roughness: 0.95 });
  const tr = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 240), matTrottoir);
  tr.rotation.x = -Math.PI / 2; tr.position.set(xp + 1.25, Y_BAS, 0); tr.receiveShadow = true; scene.add(tr);
  box(0.2, 0.14, 240, new THREE.MeshStandardMaterial({ color: 0x9d9a92, roughness: 0.9 }), xp + 2.5, Y_BAS - 0.05, 0, scene);
  const xr = xp + 2.5, LR = 16.5;
  const route = new THREE.Mesh(new THREE.PlaneGeometry(LR, 240), M.road);
  route.rotation.x = -Math.PI / 2; route.position.set(xr + LR / 2, Y_ROUTE, 0); route.receiveShadow = true; scene.add(route);
  const marque = new THREE.MeshBasicMaterial({ color: 0xd8d8d2 });
  for (let z = -118; z < 118; z += 9) {
    for (const dx of [5.5, 11]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 4.5), marque); m.rotation.x = -Math.PI / 2; m.position.set(xr + dx, Y_ROUTE + 0.01, z); scene.add(m); }
  }
  // mâts d'éclairage gris sur le trottoir (celui de z = 22 est passé à 34 : depuis le coin du pin, photo 1000051339,
  // il se dressait en plein milieu de la vue, au-dessus du car, où la photo n'en montre aucun)
  for (const z of [34, -3, -28, 47, -53]) {
    const lp2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 8.5, 8), M.pole);
    lp2.position.set(xp + 1.9, Y_BAS + 4.25, z); lp2.castShadow = true; scene.add(lp2);
    box(1.1, 0.14, 0.3, M.pole, xp + 1.4, Y_BAS + 8.5, z, scene, false);
  }
  // LE CAR BLEU et les deux fourgons blancs garés le long du parc (photos 39, 42 et 43)
  vehiculesGares(scene, K, xr, Y_ROUTE);
  // la circulation, sur les voies du milieu
  const traffic = [];
  const couleurs = [0xd9d9d9, 0x1d1e20, 0x6b6f75, 0xb9bcc0, 0x7a1e1e, 0xe8e8e8];
  for (const [dx, dir, z0] of [[7, -1, 30], [7, -1, -24], [9.8, -1, 5], [13, 1, -40], [13, 1, 12], [15, 1, 44]]) {
    const v = voiture(scene, K, xr + dx, z0, couleurs[traffic.length % couleurs.length], dir);
    v.position.y = Y_ROUTE;
    traffic.push({ mesh: v, dir, speed: rnd(8, 12), z: z0, x: xr + dx });
  }
  scene.userData.traffic = traffic;
  // la rive : trottoir, parapet, enrochement jusqu'à l'eau
  const xq = xr + LR;
  const q = new THREE.Mesh(new THREE.PlaneGeometry(3, 240), matTrottoir); q.rotation.x = -Math.PI / 2; q.position.set(xq + 1.5, Y_BAS, 0); q.receiveShadow = true; scene.add(q);
  box(0.4, 0.7, 240, new THREE.MeshStandardMaterial({ color: 0xb3ab98, roughness: 0.9 }), xq + 3.0, Y_BAS + 0.35, 0, scene);
  // les arbres de la berge, le long du parapet : on voit leurs houppiers clairs au-dessus du car
  arbresBerge(scene, K, xq + 1.5, Y_BAS);
  const enroc = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(7, Y_BAS - Y_EAU), 300), new THREE.MeshStandardMaterial({ color: 0xb9b2a3, roughness: 1 }));
  const pe = Math.atan2(Y_BAS - Y_EAU, 7);
  enroc.rotation.order = 'ZYX'; enroc.rotation.x = -Math.PI / 2; enroc.rotation.z = -pe;
  enroc.position.set(xq + 3.2 + 3.5, (Y_BAS + Y_EAU) / 2, 0); scene.add(enroc);
  const xe = xq + 10.2;
  const eau = new THREE.Mesh(new THREE.PlaneGeometry(100, 400), new THREE.MeshStandardMaterial({ color: 0x4a5f5a, roughness: 0.25, metalness: 0.25 }));
  eau.rotation.x = -Math.PI / 2; eau.position.set(xe + 50, Y_EAU, 0); scene.add(eau);
  // l'île en face : une berge boisée, puis des immeubles crème de six étages
  const ile = xe + 98;
  box(3, 3, 400, new THREE.MeshStandardMaterial({ color: 0x6f6a58, roughness: 0.95 }), ile, Y_EAU + 1.5, 0, scene, false);
  const herbeIle = new THREE.Mesh(new THREE.PlaneGeometry(80, 400), new THREE.MeshStandardMaterial({ color: 0x4d6437, roughness: 1 }));
  herbeIle.rotation.x = -Math.PI / 2; herbeIle.position.set(ile + 40, Y_EAU + 3, 0); scene.add(herbeIle);
  for (let z = -150; z <= 150; z += rnd(8, 12)) K.modelTree(scene, ile + rnd(3, 14), z, rnd(15, 20), rnd(6, 8.5));
  const facade = K.windowsTexture(9, 6, '#d6cfbd', '#3a4756', true);
  for (let z = -140; z <= 140; z += rnd(28, 40)) K.building(scene, ile + rnd(30, 48), z, rnd(14, 20), rnd(18, 22), rnd(18, 26), facade);
}

// Une voiture simple (caisse, habitacle vitré, roues) : la circulation n'est vue que de loin, en contrebas.
// `utilitaire` : une fourgonnette haute (les utilitaires blancs garés le long du parc).
function voiture(scene, K, x, z, couleur, dir, utilitaire = false) {
  const g = new THREE.Group();
  const caisse = new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.35, metalness: 0.5 });
  const vitre = new THREE.MeshStandardMaterial({ color: 0x1d2630, roughness: 0.15, metalness: 0.6 });
  if (utilitaire) {
    K.box(1.95, 1.85, 5.2, caisse, 0, 1.25, 0, g);
    K.box(1.8, 0.55, 0.9, vitre, 0, 1.75, 2.2, g);
  } else {
    K.box(1.75, 0.62, 4.3, caisse, 0, 0.55, 0, g);
    K.box(1.6, 0.5, 2.2, vitre, 0, 1.1, -0.15, g);
  }
  const pneu = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
  for (const sx of [-0.8, 0.8]) for (const sz of [-1.35, 1.35]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14), pneu);
    r.rotation.z = Math.PI / 2; r.position.set(sx, 0.32, sz * (utilitaire ? 1.3 : 1)); g.add(r);
  }
  g.position.set(x, 0, z); g.rotation.y = dir > 0 ? 0 : Math.PI; scene.add(g);
  g.userData.nofuse = true;                    // il roule : js/court.js ne doit pas le fondre dans le decor fixe
  return g;
}

// LE CAR BLEU (photos 39 et 42) : 12 x 2,55 x 3,4 m. Liseré de toit blanc, un bandeau vitré gris de 0,9 m
// où l'on devine les appuie-têtes, une caisse bleu vif (#2a64c8), et un grand anneau blanc à cheval sur la
// limite vitres / caisse, sur le flanc côté parc à 0,7 m devant le milieu. Il regarde vers +z quand dir > 0.
function busBleu(scene, K, x, z, dir) {
  const g = new THREE.Group();
  // flanc : 512 px pour 12 m, 128 px pour 3 m. Côté parc (face -x), u va de l'arrière (z-) à l'avant (z+).
  // (photos 1000051339, 342 et 343 : au-dessus du bord de l'allée on voit DEUX FOIS plus de bleu que de vitre, et
  // les vitres sont grises — elles reflètent le ciel et les arbres —, pas noires. Le bandeau vitré descend à 47 px
  // (0,9 m), et non plus à 60 : il mangeait le haut de la caisse, et avec lui la moitié de l'anneau.)
  const flanc = K.canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = '#2a64c8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d8dcd8'; c.fillRect(0, 0, w, 9);                       // liseré de toit
    c.fillStyle = '#6f7772'; c.fillRect(0, 9, w, 38);                       // bandeau vitré (0,9 m)
    for (let u = 10; u < w - 40; u += 36) {                                 // appuie-têtes
      c.fillStyle = Math.random() < 0.5 ? '#50575a' : '#636a6b';
      c.beginPath(); c.ellipse(u + rnd(-3, 3), 33, 8, 9, 0, 0, 6.29); c.fill();
    }
    c.fillStyle = '#565c5a';
    for (let u = 0; u < w; u += 62) c.fillRect(u, 9, 3, 38);               // montants des vitres
    c.fillStyle = '#35393a'; c.fillRect(w * 0.9, 9, 22, 110);             // la porte avant
    c.fillStyle = '#1f3f7c'; c.fillRect(0, 112, w, 2);                     // le trait des soutes
    c.fillStyle = '#23272a'; c.fillRect(0, 121, w, 7);                     // la jupe
    for (let u = 150; u < 380; u += 90) { c.fillStyle = 'rgba(20,30,50,0.35)'; c.fillRect(u, 68, 2, 44); }   // portes de soute
    c.strokeStyle = '#ffffff'; c.lineWidth = 5;                            // l'anneau, Ø 0,9 m, à cheval sur la limite
    c.beginPath(); c.arc(w * 0.558, 47, 19, 0, 6.29); c.stroke();
    c.font = 'italic bold 20px Arial, sans-serif'; c.fillStyle = '#ffffff'; c.textBaseline = 'middle';
    c.fillText('voyages', w * 0.1, 90);
  }, null, false, 4);
  const avant = K.canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#2a64c8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d8dcd8'; c.fillRect(0, 0, w, 9);
    c.fillStyle = '#3c4246'; c.fillRect(6, 12, w - 12, 62);               // le pare-brise
    c.fillStyle = '#23272a'; c.fillRect(0, 118, w, 10);
    c.fillStyle = '#eef0ea'; c.fillRect(8, 100, 18, 8); c.fillRect(w - 26, 100, 18, 8);   // les phares
  }, null, false, 4);
  const arriere = K.canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#2a64c8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d8dcd8'; c.fillRect(0, 0, w, 9);
    c.fillStyle = '#3c4246'; c.fillRect(10, 14, w - 20, 34);
    c.fillStyle = '#8a2020'; c.fillRect(6, 96, 10, 16); c.fillRect(w - 16, 96, 10, 16);
    c.fillStyle = '#23272a'; c.fillRect(0, 118, w, 10);
  }, null, false, 4);
  // Une caisse peinte, pas un métal : à 0,2 de métallisation et 0,4 de rugosité, le flanc tourné vers le parc
  // reflétait le talus et le rideau sombres et virait au bleu nuit. Il est à l'ombre, le couchant dans le dos : une
  // lumière propre (émission = sa couleur) lui rend le bleu vif des photos. Mesuré à travers le treillis depuis le coin
  // du pin (pose de la photo 339) : la photo donne #3c76be à 0,79 fois l'enrobé (#5485cc à 0,70 sur la 343) ; à 0,28
  // d'émission le rendu sortait #1b4d8c à 0,49, à 1,0 #4877b5 à 0,81. Réglée entre les deux.
  const mat = (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.65, metalness: 0,
    emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.85 });
  const cote = mat(flanc), toit = new THREE.MeshStandardMaterial({ color: 0xe6ebe5, roughness: 0.5 });
  const dessous = new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.9 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(2.55, 3.0, 12), [cote, cote, toit, dessous, mat(avant), mat(arriere)]);
  b.position.y = 1.9; b.castShadow = true; b.receiveShadow = true; g.add(b);
  // les roues : un essieu avant, deux à l'arrière, cousus en une pièce
  const roues = [], o = new THREE.Object3D();
  for (const sx of [-1.2, 1.2]) {
    for (const sz of [4.3, -2.9, -4.1]) {
      o.position.set(sx, 0.5, sz); o.rotation.set(0, 0, Math.PI / 2); o.updateMatrix();
      roues.push(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16).applyMatrix4(o.matrix));
    }
  }
  g.add(new THREE.Mesh(mergeGeometries(roues), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 })));
  g.position.set(x, 0, z); g.rotation.y = dir > 0 ? 0 : Math.PI; scene.add(g);
  return g;
}

// =====================================================================
//  LE FOND CÔTÉ PLATANES : LE MUR DU BOSQUET, LE PAVILLON, LES GRANDS ARBRES (photos 40 et 41)
// =====================================================================
// Ce que montrent les photos recalées, derrière la voûte des platanes :
//  - le mur de meulière ne s'arrête pas au coin du plateau : il longe le bosquet en LIGNE BRISÉE, de plus en
//    plus bas (2,30 m au coin, 1,80 m au bout), une grille vert-noir un mètre en retrait, et derrière un talus
//    qui monte vite — herbe près du coin, terre nue, deux bancs et des arbustes sombres plus loin ;
//  - au-dessus de la voûte, trois grands arbres : un cèdre sombre, un hêtre pourpre et, au centre de la
//    photo 41, le grand feuillu qui jaunit ;
//  - au fond du bosquet, le pavillon de pierre, son perron, son parvis dallé et ses haies basses ; à sa droite
//    une haie, des arbustes et des arbres ; à sa gauche l'échiffre de l'escalier du talus et des arbres sombres.
//    But : depuis le plateau, à hauteur d'yeux, ni pelouse ni ciel entre les troncs.
// Tout est écrit dans le repère du terrain 1 et passe par `cx`.
//
// Le feuillage tient en DEUX maillages : tous les feuillus du fond (arbres, arbustes, haies) partagent une
// texture de feuilles NEUTRE, grise, et chaque essence reçoit sa couleur par les couleurs de sommet ; le cèdre
// a ses aiguilles. Les troncs de tous ces arbres sont cousus en un troisième maillage.
// DERRIÈRE LE MUR (photos du 27/09, 18 h 43 : 1000051341, 600, 601 et 602). Le talus n'est PAS planté d'un bout à
// l'autre :
//  - CÔTÉ PIN (z > 0), il est planté serré jusqu'au chaperon : un rang d'arbustes vert sombre franc (lauriers,
//    fusains) collé au grillage, du feuillage bas à son pied — pas une bande de pelouse entre le chaperon et eux —,
//    un second rang plus haut, et au milieu trois touffes de BAMBOUS, des plumets verticaux vert moyen de 6 à 7 m ;
//  - CÔTÉ PLATANES (z < 0), c'est une PELOUSE ouverte qui monte, deux arbustes isolés, et tout en haut de la
//    pente une bande d'arbustes sombres (sur 341 et 602 : la ligne noire au-dessus de la pelouse ; elle ferme aussi
//    la vue vers le boulevard) ;
//  - les grands arbres : le CÈDRE PLEUREUR, sombre, qui retombe en rideaux, derrière le bout du mur côté pin (vu du
//    terrain, 600 et 601, comme du jardin, j6) ; le HÊTRE POURPRE, brun-bronze, haut et ajouré, à sa droite ; et
//    côté platanes le grand feuillu qui jaunit (celui de arbresDuFond, au coin du bosquet). Entre le hêtre et lui,
//    au-dessus du milieu du mur, du ciel.
// Avant, une haie continue courait d'un bout à l'autre, et deux tilleuls à fûts blancs tenaient la place du cèdre.
// DEPUIS LES PHOTOS DU 28/09 (171705 à 171718, voir abordsMur) : derrière le mur passe d'abord une allée de 3,5 m, un
// mètre sous sa crête, puis, du côté du pin, la rampe est qui monte en diagonale ; le talus ne commence qu'au-delà
// (solDerriereMur). Le premier rang n'est donc plus collé au grillage : c'est le talus d'arbustes denses qui borde
// la rampe côté coteau (171709 : lauriers, cognassier aux fruits jaunes, éléagnus gris-vert) ; vu du plateau, il
// dépasse du mur comme avant. Le second rang et les bambous reculent d'autant ; le cèdre et le hêtre, qui tombaient au
// coin même de l'allée, reculent dans l'axe de la photo 601 : vus du plateau, ils restent où ils étaient.
// Repère : `d` = distance derrière le parement arrière du mur ; `sol(x, z)` : le sol des abords (solDerriereMur).
function fondMur(scene, K, XN) {
  const DX = XN + PLATEAU.mur, X = (d) => XN - 0.45 - d;
  const sol = (x, z) => solDerriereMur(x - DX, z), ancien = (d) => Math.min(5.3, 2.35 + d * 0.25);
  // trois maillages : les massifs (leur teinte à eux, un vert sombre franc), le hêtre et les bambous (la teinte
  // commune des arbres du fond), le cèdre (ses aiguilles, bleu-gris)
  const feu = accFeuillage(), feu2 = accFeuillage(), ced = accFeuillage(), bois = [];
  // (mesuré sur la photo 601 : les massifs à #2f3a30, vert franc et sombre, 0,5 fois l'enrobé)
  const SOMBRE = paletteFond([[0x2a3d2b, 3], [0x243625, 2], [0x324a31, 2], [0x1f2e20, 1], [0x3a5236, 1]]);
  const MOYEN = paletteFond([[0x3a5633, 3], [0x445e37, 2], [0x334e30, 2], [0x4e663b, 1]]);
  // (les bambous : vert moyen, #505e42 à #53614e sur la photo 601, teinte 90 à 100° — le vert tendre d'avant sortait
  // en chou-fleur jaune. Palette à 100-110° et peu saturée : le couchant doré la ramène vers 90°)
  const BAMBOU = paletteFond([[0x57744f, 3], [0x62805b, 2], [0x4d6948, 2], [0x6f8a63, 1]]);
  const CHAUME = teinteFond(0x6f7d4c, 0.58);
  // CÔTÉ PIN — LE TALUS D'ARBUSTES qui borde la rampe côté coteau (171709, à gauche : des masses de 3 à 4 m qui
  // descendent jusqu'à la bordure), du coin du pin jusqu'à l'entrée de la rampe dans le bois ; leur feuillage descend
  // jusqu'au sol (yMin). Puis, au bout du mur, sur le talus qui borde l'allée jusqu'au chemin du jardin.
  // (le matériau des massifs éclaircit et bleuit : ces deux-là sont dessinés plus sombres que sur la photo 171709,
  // sinon ils sortaient en taches blanchâtres au-dessus du mur, vus du plateau — photo 601 : des verts sombres)
  const COGNASSIER = paletteFond([[0x4f5c2e, 3], [0x58642f, 2], [0x45522a, 2], [0x66662c, 1]]);
  const ELEAGNUS = paletteFond([[0x4a5647, 3], [0x535f50, 2], [0x404b3f, 2]]);
  // (relecture, 171709 : au coin, entre la bordure et les arbustes, une pelouse de trois mètres — la plaque d'égout,
  // en bas à gauche de la photo — ; posés à un mètre de la bordure, ils la couvraient et bouchaient la moitié gauche
  // de l'image à cinq mètres de l'objectif. Ils reculent donc au bord de cette pelouse tant que la rampe est plate.)
  const talusRampe = [];
  for (let s = 0.3; s < _rampe.L - 1; s += rnd(1.5, 2.1)) {
    const p = pointRampe(s), e = ABORDS.LR / 2 + (s < _rampe.sF - 0.5 ? rnd(2.9, 3.6) : rnd(0.8, 1.7));
    if (p.z < ABORDS.FIN_R - 2.5) break;
    talusRampe.push([p.x - p.nx * e, p.z - p.nz * e]);
  }
  for (const z of [11.6, 13.4, 15.2, 16.6]) talusRampe.push([ABORDS.XD - ABORDS.LA - rnd(0.9, 1.4), z]);
  for (const [x1, z] of talusRampe) {
    const x = x1 + DX, y0 = sol(x, z) - 0.1, t = Math.random();
    arbusteFond(feu, x, y0, z, rnd(2.8, 4.2), rnd(1.3, 1.8), t < 0.7 ? SOMBRE : t < 0.87 ? COGNASSIER : ELEAGNUS, 1e9, -1e9, y0 + 0.02);
  }
  // ... au pied de ce talus, dès que la rampe monte, une rangée plus basse (1,4 à 2,2 m) au ras de la bordure — vus du
  // plateau, par-dessus le mur, ils cachent la pente de gazon (photo 601 : des massifs sombres au ras du grillage) —,
  // et de l'autre côté de la rampe, au dos de l'îlot, derrière ses grands arbres, quelques boules de plus
  for (let s = 5; s < _rampe.L; s += rnd(1.1, 1.6)) {
    const p = pointRampe(s);
    if (p.z < ABORDS.FIN_R - 1.5) break;
    for (const cote of [-1, 1]) {
      if (cote === 1 && p.z > -4.5) continue;
      const e = ABORDS.LR / 2 + rnd(0.45, 0.9), x = p.x + p.nx * cote * e + DX, z = p.z + p.nz * cote * e, y0 = sol(x, z) - 0.05;
      arbusteFond(feu, x, y0, z, rnd(1.4, 2.2), rnd(0.8, 1.1), Math.random() < 0.6 ? SOMBRE : MOYEN, 1e9, -1e9, y0 + 0.02);
    }
  }
  // le second rang, plus haut et plus varié, cinq mètres plus loin qu'avant (au-delà de la rampe ; là où elle tourne
  // vers le coteau, vers z = 0 à 3, un mètre et demi plus loin encore)
  for (let z = 0.0; z < 9.4; z += rnd(2.0, 2.8)) {
    const d = z < 3.5 ? rnd(10.5, 12.5) : rnd(8.8, 11.2);
    arbusteFond(feu, X(d), sol(X(d), z) - 0.1, z, rnd(3.4, 5.2), rnd(1.5, 2.1), Math.random() < 0.5 ? MOYEN : SOMBRE);
  }
  // CÔTÉ PLATANES — deux arbustes isolés, sur l'îlot entre l'allée et la rampe...
  arbusteFond(feu, X(6.1), sol(X(6.1), -5.2) - 0.1, -5.2, 1.6, 0.9, SOMBRE);
  arbusteFond(feu, X(7), sol(X(7), -7.4) - 0.1, -7.4, 2.2, 1.2, MOYEN);
  // ... et la bande sombre du haut de la pente : des arbustes de 3 m, serrés, sur le parc haut (jamais sur la rampe :
  // là où elle entre dans le bois, ils reculent au-delà de sa bordure)
  for (let z = -9; z <= 0; z += rnd(1.6, 2.2)) {
    let d = rnd(13, 16);
    while (z > ABORDS.FIN_R - 1 && rampeEst(X(d) - DX, z).d < ABORDS.LR / 2 + 1.4) d += 0.5;
    arbusteFond(feu, X(d), sol(X(d), z) - 0.1, z, rnd(2.7, 3.3), rnd(1.1, 1.5), SOMBRE);
  }
  // LES BAMBOUS (photo 601, au milieu) : trois touffes étroites de plumets DEBOUT — des cartes hautes et minces,
  // sans plan à plat — sur huit chaumes chacune ; sur le talus au-dessus de la rampe
  // (lot L8 : dans leur maillage à eux, feu3, avec leur tuile de chaumes — voir chaumesBambou)
  const feu3 = accFeuillage();
  for (const [z, d] of [[0.8, 8.8], [2.8, 9.4], [4.8, 9.0]]) {
    const y = sol(X(d), z), vol = { c: [X(d), y + 4.0, z], r: 1.0 };
    paquetFond(feu3, new THREE.Vector3(X(d), y + 4.2, z), 0.8, 3.4, 60, 0.5, 0.7, vol, BAMBOU, y + 0.4,
      1e9, -1e9, { h: [1.4, 2.0], rx: 0.15 });
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * 6.283, r = rnd(0.05, 0.35), hc = rnd(5, 7), pen = rnd(0.03, 0.09);
      const pied = new THREE.Vector3(X(d) + Math.cos(a) * r, y - 0.2, z + Math.sin(a) * r);
      rameauFond(bois, pied, new THREE.Vector3(pied.x + Math.cos(a) * hc * pen, y + hc, pied.z + Math.sin(a) * hc * pen),
        0.02, 0.02, CHAUME, 5);
    }
  }
  // LE CÈDRE PLEUREUR, seul de son espèce : derrière le bout du mur côté pin, à 23° à gauche de l'axe sur la photo
  // 601 ; sommet vers 17 m au-dessus du plateau (11,5 m d'étages sur l'ancien talus, et la flèche qui penche).
  // (Photos du 28/09 : posé à 5,5 m du mur, il tombait au coin même de l'allée, au-dessus de la tête du photographe
  // de 171709, où il n'y a que des arbustes. Il recule de cinq mètres dans l'axe de la photo 601 — vu du plateau, il
  // reste à la même place — et grandit d'autant : son sommet garde la même hauteur apparente.)
  const vx = X(5.5) - (DX - 5.5), vz = 12 - 0.4, vl = Math.hypot(vx, vz), kc = 31.8 / vl;
  const xCed = DX - 5.5 + vx * kc, zCed = 0.4 + vz * kc, yCed = sol(xCed, zCed);
  cedreSombre(ced, bois, xCed, yCed, zCed, 0.5 + (ancien(5.5) + 11.5 - 0.5) * kc - yCed);
  // LE HÊTRE POURPRE, à sa droite, ajouré : on voit le ciel au travers et à côté de lui. (Photos du 28/09 : à 7,4 m du
  // mur, son fût se dressait au bord de la rampe, à six mètres du coin de 171709, où l'on ne voit que des arbustes ; il
  // recule de trois mètres et demi dans l'axe de la photo 601 — le hêtre de 171709 est « au fond ».)
  const hx = X(7.4) - (DX - 5.5), hz = 7.5 - 0.4, kh = 1 + 3.5 / Math.hypot(hx, hz);
  const xH = DX - 5.5 + hx * kh, zH = 0.4 + hz * kh;
  hetrePourpre(feu2, bois, xH, sol(xH, zH), zH);
  // (une seule texture de feuilles pour les deux maillages de feuillus : seule leur teinte diffère. Celle des
  // massifs est mesurée au rendu, pose de la photo 601 : #334034, teinte 125°, 0,47 fois l'enrobé, pour #2f3831 et
  // 0,49 sur la photo. Le couchant doré jaunit tout : le filtre tire donc vers le bleu — un filtre jaune [1 ; 1,03 ;
  // 0,85] les sortait à 99°, vert olive, et trop sombres, 0,40)
  // (lot L8 : sat 0,65 -> 0,4. Vus du plateau, les massifs au-dessus du mur sortaient à 0,34 de saturation, pour 0,19
  // à 0,20 sur les photos 600 et 601. Remesuré avec la nouvelle tuile, en extrême : 0,30 -> 0,19 vus de la caméra de
  // diffusion du terrain 2, 0,31 -> 0,24 pose de la photo 601 ; teinte médiane inchangée, 99° et 120°, pour 120 à
  // 147° sur les photos)
  // (relecture du lot L8 : sat 0,5 et un filtre presque neutre [0,94 ; 1 ; 1,02], clair 1,15. Le filtre bleu
  // [0,88 ; 1 ; 1,15] s'applique APRÈS la désaturation : à 0,4, il ne restait presque plus de vert à tirer vers le bleu,
  // il bleuissait le gris — des massifs gris-bleu, en lichen, où la photo 601 montre un vert franc. Mesuré par tiers de
  // clarté, pose de la photo 601 : les tons clairs à B − R = +1 et 10 de vert en excès, pour −9 et 19 sur la photo ;
  // désormais −7 et 14, et −2 et 11 dans les tons moyens (photo −1 et 14). Saturation 0,21 (pose 601) et 0,23-0,24
  // (caméra de diffusion du terrain 2), dans la cible de 0,20 à 0,24 ; même clarté, 0,55 et 0,62 fois l'enrobé)
  const texFeu = feuillesFondTex(K.canvasTex);
  const matFeu = materiauFeuilles(texFeu, { trans: 0.2, rugosite: 0.85, teinte: { sat: 0.5, teinte: [0.94, 1.0, 1.02], clair: 1.15 } });
  const matFeu2 = materiauFeuilles(texFeu, { trans: 0.2, rugosite: 0.85 });
  // (les bambous : la teinte de la famille du fond, comme le hêtre dont ils partageaient le maillage)
  const matBam = materiauFeuilles(chaumesBambou(K.canvasTex), { trans: 0.2, rugosite: 0.85 });
  // (le cèdre : bleu-gris sombre, #485254 sur la photo 601 — la teinte du repli du modèle le sortait vert-jaune
  // clair. Mesuré au rendu : #465052, teinte 190° ; le filtre [0,95 ; 1 ; 1,06] à 0,8 le laissait vert-gris,
  // #353a35, beaucoup trop sombre)
  const matCed = materiauFeuilles(aiguillesCedreTex(K.canvasTex), { trans: 0.12, rugosite: 0.9,
    teinte: { sat: 0.45, teinte: [0.85, 1.0, 1.3], clair: 1.5 } });
  for (const [acc, mat] of [[feu, matFeu], [feu2, matFeu2], [feu3, matBam], [ced, matCed]]) {
    const m = new THREE.Mesh(coudreTeinte(acc), mat);
    m.castShadow = true; m.receiveShadow = false; m.customDepthMaterial = mat.userData.ombre;
    scene.add(m); declarerFeuillage(scene, m);
  }
  const troncs = new THREE.Mesh(mergeGeometries(bois),
    new THREE.MeshStandardMaterial({ map: ecorceFondTex(K.canvasTex), vertexColors: true, roughness: 0.95 }));
  troncs.castShadow = true; troncs.receiveShadow = true; scene.add(troncs);
}

function fondPlatanes(scene, K, cx, matHerbe) {
  const M = ligneMurBosquet(cx);
  murBosquet(scene, K, M, matHerbe);
  pavillon(scene, K, cx(-8.5), -39.6, 1);
  const feu = accFeuillage(), ced = accFeuillage(), bois = [], boisCed = [];
  abordsPavillon(scene, K, cx, feu, bois);
  plantesTalus(M, feu);
  arbresDuFond(M, cx, feu, ced, bois, boisCed);
  const matFeu = materiauFeuilles(feuillesFondTex(K.canvasTex), { trans: 0.2, rugosite: 0.85 });
  const matCed = materiauFeuilles(aiguillesCedreTex(K.canvasTex), { trans: 0.12, rugosite: 0.9 });
  const cedre = [];
  for (const [acc, mat] of [[feu, matFeu], [ced, matCed]]) {
    const m = new THREE.Mesh(coudreTeinte(acc), mat);
    // il porte son ombre (découpée) mais ne la reçoit pas : une couronne dense s'ombrerait de part en part
    m.castShadow = true; m.receiveShadow = false; m.customDepthMaterial = mat.userData.ombre;
    scene.add(m); declarerFeuillage(scene, m);
    if (acc === ced) cedre.push(m);
  }
  const matBois = new THREE.MeshStandardMaterial({ map: ecorceFondTex(K.canvasTex), vertexColors: true, roughness: 0.95 });
  for (const b of [bois, boisCed]) {
    const troncs = new THREE.Mesh(mergeGeometries(b), matBois);
    troncs.castShadow = true; troncs.receiveShadow = true; scene.add(troncs);
    if (b === boisCed) cedre.push(troncs);
  }
  // LE CÈDRE : le vrai cèdre du Liban (assets/parc/cedre.glb) remplace le procédural à son arrivée. Même
  // hauteur (16 m au-dessus du talus : sur la photo 40 il dépasse de loin la voûte, en haut à gauche), mais un
  // vieux cèdre est plus large que haut — 22 m de couronne ici. Son pied recule donc de quatre mètres dans le
  // talus, et il garde l'orientation du fichier, qui envoie ses plus longues branches vers le fond et vers le
  // mur : sa couronne s'arrête derrière le grillage des platanes (z < -12) et loin du terrain 2.
  for (const m of cedre) m.userData.nofuse = true;
  const xc = cx(-27.5), zc = -21.5;
  // (version légère, même sur PC : on ne voit que sa tête, par-dessus la voûte, à 25 m et plus. Le talus est plus bas
  // depuis que l'allée longe le mur : le pied descend, la hauteur s'allonge d'autant, la tête reste où la photo 40 l'a mise)
  const yc = solFond(M, xc, zc), yv = solFond(M, xc, zc, true);
  planter(scene, 'cedre', [{ x: xc, y: yc - 0.1, z: zc, h: 16 + (yv - yc), rot: 0, loin: true }], { repli: cedre });
}

// ---------------------------------------------------------------
//  LE TRACÉ DU MUR DU BOSQUET
// ---------------------------------------------------------------
// Le pied du mur relevé sur la photo 40 : (x, z, hauteur). Il repart du coin du plateau (le mur droit s'arrête
// au grillage des platanes) et s'incline vers le quai. `t` = abscisse le long du mur depuis le coin.
// Le talus derrière est un maillage en colonnes : chaque colonne part du mur dans une direction qui tourne
// doucement — celle du talus du mur droit au coin (-x, pour s'y raccorder sans couture), la bissectrice à
// chaque sommet, la direction du RETOUR au bout (le mur y tourne vers l'arrière et ferme le talus).
// `pente` : la raideur du talus selon t — 0,25 au coin comme le talus du mur droit, 0,38 là où la photo montre
// la pelouse qui grimpe, puis presque plat derrière le bout (terre nue, bancs, arbustes).
function ligneMurBosquet(cx) {
  const P = [[-23.7, -9.2, 2.3], [-21.9, -14.3, 2.25], [-19.8, -19.7, 2.1], [-16.5, -25.7, 1.95], [-14.5, -31.0, 1.8]]
    .map(([x, z, h]) => ({ x: cx(x), z, h, t: 0 }));
  const seg = [];
  let T = 0;
  for (let i = 0; i + 1 < P.length; i++) {
    const a = P[i], b = P[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z);
    const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
    a.t = T;
    seg.push({ a, b, L, t0: T, dx, dz, nx: dz, nz: -dx });            // n : vers le talus
    T += L;
  }
  P[P.length - 1].t = T;
  const lr = Math.hypot(0.75, 0.66), ret = { x: -0.75 / lr, z: -0.66 / lr };
  const cles = [{ t: 0, x: -1, z: 0 }];
  for (let i = 1; i < seg.length; i++) {
    const u = seg[i - 1], v = seg[i], mx = u.nx + v.nx, mz = u.nz + v.nz, l = Math.hypot(mx, mz);
    cles.push({ t: v.t0, x: mx / l, z: mz / l });
  }
  cles.push({ t: T, x: ret.x, z: ret.z });
  // `allee` : l'allée rouge des photos du 28/09 longe aussi ce mur (171705, 171706 : elle file le long du mur jusqu'à
  // la façade de pierre du fond) ; le talus ne part plus de la crête mais de son bord (talusY, voir abordsMur)
  return { P, seg, T, ret, cles, EP: 0.45, YMAX: 5.28, allee: true,
    pente: [[0, 0.25], [3, 0.38], [7.5, 0.36], [12, 0.2], [16, 0.13], [T, 0.12]] };
}

// Interpolation linéaire dans une table [[t, valeur], ...].
function interpFond(tab, t) {
  if (t <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) {
    if (t <= tab[i][0]) {
      const [a, va] = tab[i - 1], [b, vb] = tab[i];
      return va + (vb - va) * (t - a) / Math.max(1e-6, b - a);
    }
  }
  return tab[tab.length - 1][1];
}

// Le pied du mur à l'abscisse t : position, hauteur du mur, segment.
function murPoint(M, t) {
  const g = M.seg.find((s) => t <= s.t0 + s.L + 1e-6) || M.seg[M.seg.length - 1];
  const u = Math.min(1, Math.max(0, (t - g.t0) / g.L));
  return { x: g.a.x + (g.b.x - g.a.x) * u, z: g.a.z + (g.b.z - g.a.z) * u, h: g.a.h + (g.b.h - g.a.h) * u, g };
}

// La direction de la colonne de talus qui part du mur en t.
function murDirection(M, t) {
  const k = M.cles;
  let i = 1;
  while (i < k.length - 1 && t > k[i].t) i++;
  const a = k[i - 1], b = k[i], u = Math.min(1, Math.max(0, (t - a.t) / Math.max(1e-6, b.t - a.t)));
  const x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u, l = Math.hypot(x, z);
  return { x: x / l, z: z / l };
}

// Le talus, à s mètres du parement : il part de la crête (dos du mur, s = EP) et monte jusqu'au niveau du parc
// (5,28 m, celui du haut du talus du mur droit), sans jamais le dépasser. Avec l'allée (M.allee, photos du 28/09) :
// d'abord l'allée, 0,87 m sous la crête, sur 3,5 m, puis une pente qui rattrape ce talus-là (profilDos) ; `ancien` :
// le talus d'avant, pour garder la hauteur des arbres calés sur les photos du plateau.
function talusY(M, t, s, ancien = false) {
  const p = murPoint(M, t), k = interpFond(M.pente, t);
  if (M.allee && !ancien) return profilDos(s - M.EP, p.h, k, M.YMAX);
  return p.h - 0.02 + Math.min(k * Math.max(0, s - M.EP), M.YMAX - p.h + 0.02);
}
function talusXZ(M, t, s) {
  const p = murPoint(M, t), d = murDirection(M, t);
  return [p.x + d.x * s, p.z + d.z * s];
}

// Hauteur du sol derrière le mur en un point du monde (pour planter un arbre) : au-delà du coin, le talus
// droit du mur de meulière ; ailleurs, le talus du bosquet, pris à la perpendiculaire du segment le plus proche.
// (Avec l'allée, derrière le mur droit : le sol des abords, solDerriereMur ; `ancien` : le talus d'avant.)
function solFond(M, x, z, ancien = false) {
  const P0 = M.P[0];
  if (z >= P0.z && M.allee && !ancien) return solDerriereMur(x - (P0.x + PLATEAU.mur), z);
  if (z >= P0.z) return P0.h - 0.02 + 0.25 * Math.min(12, Math.max(0, P0.x - M.EP - x));
  let best = null;
  for (const g of M.seg) {
    const rx = x - g.a.x, rz = z - g.a.z;
    const u = Math.min(g.L, Math.max(0, rx * g.dx + rz * g.dz)), s = rx * g.nx + rz * g.nz;
    const d = Math.hypot(rx - g.dx * u, rz - g.dz * u);
    if (!best || d < best.d) best = { d, t: g.t0 + u, s: Math.max(s, M.EP) };
  }
  return talusY(M, best.t, best.s, ancien);
}

// ---------------------------------------------------------------
//  LE MUR DU BOSQUET, SON CHAPERON, SON TALUS, SA GRILLE, SES BANCS
// ---------------------------------------------------------------
function murBosquet(scene, K, M, matHerbe) {
  const { EP, T } = M;
  // LE PAREMENT : un seul ruban sur toute la ligne brisée (même meulière que le mur droit, une texture pour
  // toute la longueur : pas de raccord visible), puis le retour, dont le parement regarde le pavillon — on ne le
  // voit jamais du plateau, il réutilise donc le début de la texture.
  const LT = T + 0.3;
  const tex = meuliereTexture(K.canvasTex, LT, 2.3);
  // (relief : le même que le mur des bancs, joints en creux et pierre plate — à 1,2, avec la pierre bombée d'alors, le
  // relief tiré de la texture bosselait chaque moellon comme un galet)
  // SOUS LA VOÛTE DES PLATANES, le mur est à l'ombre : sur la photo 340, prise dans la même direction que la vue
  // d'entrée, il vaut 0,69 fois l'enrobé ; la pierre presque blanche le sortait à 1,09 (l'occlusion de la canopée ne
  // touche que le sol). Il prend une teinte d'ombre grise, comme le stabilisé devant lui (0xb0b2d5, voir buildParc),
  // pour viser 0,65 à 0,75 fois l'enrobé ; le retour du mur est dans le même maillage. (0xa19d97, essayé d'abord, le
  // sortait à 0,53 : la couleur multiplie l'albédo LINÉAIRE, 0xa1 n'en garde que 36 %.)
  const matMur = new THREE.MeshStandardMaterial({ map: tex, color: 0xd6d1ca, roughness: 0.95, bumpMap: tex.userData.relief, bumpScale: 0.5 });
  matMur.userData.surfaceParc = 'meuliere';
  const pos = [], uv = [], nor = [];
  const quad = (ax, az, ha, bx, bz, hb, ua, ub, vk) => {
    const L = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / L, nz = (bx - ax) / L;       // vers le bosquet
    const A0 = [ax, -0.05, az, ua, 0], B0 = [bx, -0.05, bz, ub, 0];
    const A1 = [ax, ha, az, ua, (ha + 0.05) * vk], B1 = [bx, hb, bz, ub, (hb + 0.05) * vk];
    for (const p of [A0, B0, A1, A1, B0, B1]) { pos.push(p[0], p[1], p[2]); uv.push(p[3], p[4]); nor.push(nx, 0, nz); }
  };
  for (const g of M.seg) quad(g.a.x, g.a.z, g.a.h, g.b.x, g.b.z, g.b.h, g.a.t / LT, (g.a.t + g.L) / LT, 1 / 2.35);
  // le retour : il monte avec le talus qu'il retient, sur 13,5 m (avec l'allée, il ne part que de son bord : elle file
  // au-delà du bout du mur)
  const fin = M.P[M.P.length - 1], ret = [];
  for (let s = M.allee ? EP + ABORDS.LA : 0; s <= 13.51; s += 1.5) ret.push({ x: fin.x + M.ret.x * s, z: fin.z + M.ret.z * s, h: talusY(M, T, s) + 0.02, s });
  for (let i = 0; i + 1 < ret.length; i++) {
    const a = ret[i], b = ret[i + 1];
    quad(a.x, a.z, a.h, b.x, b.z, b.h, a.s / LT, b.s / LT, 1 / 3.6);
  }
  const gf = new THREE.BufferGeometry();
  gf.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  gf.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  gf.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const face = new THREE.Mesh(gf, matMur);
  face.castShadow = true; face.receiveShadow = true; scene.add(face);

  // LE CHAPERON : la même assise grise que sur le mur droit (le matériau se confond avec le sien), une pierre
  // par segment, qui suit la pente du mur ; il couvre aussi l'épaisseur du mur jusqu'au talus.
  const matChap = new THREE.MeshStandardMaterial({ color: 0x8e8d86, roughness: 0.92 });
  const chaperon = (ax, az, ha, bx, bz, hb) => {
    const L = Math.hypot(bx - ax, bz - az), nx = (bz - az) / L, nz = -(bx - ax) / L;       // vers le talus
    const X = new THREE.Vector3(bx - ax, hb - ha, bz - az).normalize(), Z = new THREE.Vector3(-nx, 0, -nz);
    const Y = new THREE.Vector3().crossVectors(Z, X);
    const b = new THREE.Mesh(new THREE.BoxGeometry(L + 0.06, 0.11, EP + 0.08), matChap);
    b.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    b.position.set((ax + bx) / 2 + nx * EP / 2, (ha + hb) / 2 + 0.055, (az + bz) / 2 + nz * EP / 2);
    b.castShadow = true; b.receiveShadow = true; scene.add(b);
  };
  for (const g of M.seg) chaperon(g.a.x, g.a.z, g.a.h, g.b.x, g.b.z, g.b.h);
  for (let i = 0; i + 1 < ret.length; i++) chaperon(ret[i].x, ret[i].z, ret[i].h, ret[i + 1].x, ret[i + 1].z, ret[i + 1].h);

  // LE TALUS : colonnes tous les 1,5 m le long du mur, rangées de plus en plus espacées en s'éloignant. Il
  // prolonge exactement le talus du mur droit au coin (même pente, même crête, même herbe), puis se raidit.
  // Couleurs de sommet : la pelouse près du coin, la terre nue plus loin, derrière la grille (elle arrive entre
  // t = 3,5 et 6 m le long du mur, et couvre les six premiers mètres du talus, fondue jusqu'à dix). L'herbe y est
  // MÉLANGÉE vers la terre, x [0,95 ; 0,62 ; 0,78] x 1,15 (#4f6f37 vers #5b4d44) : l'ancien multiplicateur (1,75 ;
  // 0,62 ; 1,45) virait au mauve.
  const ts = [];
  for (const g of M.seg) {
    const n = Math.max(1, Math.ceil(g.L / 1.5));
    for (let k = 0; k < n; k++) ts.push(g.t0 + (g.L * k) / n);
  }
  ts.push(T);
  // (avec l'allée : des rangées à ses deux bords, et serrées sur la pente qui la borde)
  const eA = EP + ABORDS.LA;
  const SS = M.allee ? [EP, EP + ABORDS.LA / 2, eA, eA + 0.35, eA + 0.9, eA + 1.6, eA + 2.5, 8.2, 10, 12.5, 16, 21, 28, 40, 60, 80]
    : [EP, 0.8, 1.45, 2.2, 3.0, 4.0, 5.2, 6.6, 8.2, 10, 12.5, 16, 21, 28, 40, 60, 80];
  const NR = SS.length, vp = [], vu = [], vc = [], idx = [];
  const lisse = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  for (const t of ts) {
    for (const s of SS) {
      const [x, z] = talusXZ(M, t, s), y = talusY(M, t, s);
      vp.push(x, y, z); vu.push(x / 300, z / 300);                   // l'herbe du parc : une tuile de 5 m
      const e = lisse(3.5, 6, t) * (1 - lisse(6, 10, s)) * rnd(0.8, 1.0);
      const k = rnd(0.92, 1.06);
      vc.push((1 + (0.95 * 1.15 - 1) * e) * k, (1 + (0.62 * 1.15 - 1) * e) * k, (1 + (0.78 * 1.15 - 1) * e) * k);
    }
  }
  for (let i = 0; i + 1 < ts.length; i++) {
    for (let j = 0; j + 1 < NR; j++) {
      const a = i * NR + j, b = (i + 1) * NR + j, c = i * NR + j + 1, d = (i + 1) * NR + j + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const gt = new THREE.BufferGeometry();
  gt.setAttribute('position', new THREE.Float32BufferAttribute(vp, 3));
  gt.setAttribute('uv', new THREE.Float32BufferAttribute(vu, 2));
  gt.setAttribute('color', new THREE.Float32BufferAttribute(vc, 3));
  gt.setIndex(idx); gt.computeVertexNormals();
  const talus = new THREE.Mesh(gt, new THREE.MeshStandardMaterial({ map: matHerbe.map, roughness: 1, vertexColors: true }));
  talus.material.userData.surfaceParc = 'herbe';
  talus.receiveShadow = true; scene.add(talus);

  // LA GRILLE vert-noir de 1,10 m, un mètre derrière le mur : barreaux tous les 12 cm. Un ruban TRANSPARENT
  // (pas en test alpha) : de loin, les barreaux se fondent en un voile sombre, comme sur la photo, au lieu de
  // scintiller ou de disparaître.
  // (sa base est à la hauteur de celle de la grille du mur droit, pour que les deux se raccordent au coin)
  // PHOTOS DU 28/09 (171706) : vue de l'allée, cette grille noire basse est posée SUR le chaperon, dans l'alignement du
  // grillage du plateau, qu'elle prolonge là où il s'arrête (sept mètres après l'angle des platanes, voir abordsMur).
  // Avec l'allée, elle part donc de là, sur le chaperon (s = 0,13, comme le grillage), et plus sur le talus.
  const T_GRILLE = M.allee ? ABORDS.TG : 0, S_GRILLE = M.allee ? 0.13 : 1.45;
  const baseGrille = (t) => (M.allee ? murPoint(M, t).h + 0.11 : talusY(M, t, 1.45) + 0.07);
  const tg = M.allee ? [T_GRILLE, ...ts.filter((t) => t > T_GRILLE + 0.05)] : ts;
  const gp = [], gu = [], gi = [];
  for (const t of tg) {
    const [x, z] = talusXZ(M, t, S_GRILLE), y = baseGrille(t);
    gp.push(x, y, z, x, y + 1.1, z); gu.push(t / 0.96, 0, t / 0.96, 1);
  }
  for (let i = 0; i + 1 < tg.length; i++) { const a = 2 * i; gi.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  gg.setAttribute('uv', new THREE.Float32BufferAttribute(gu, 2));
  gg.setIndex(gi); gg.computeVertexNormals();
  const grille = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ map: grilleBosquetTex(K.canvasTex), transparent: true,
    depthWrite: false, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.3 }));
  scene.add(grille);
  const fer = new THREE.MeshStandardMaterial({ color: 0x3b5a3a, roughness: 0.55, metalness: 0.4 });   // (le vert de la grille)
  for (let t = T_GRILLE + 0.6; t < T; t += 2.4) {
    const [x, z] = talusXZ(M, t, S_GRILLE);
    K.box(0.045, 1.2, 0.045, fer, x, baseGrille(t) + 0.55, z, scene, false);
  }

  // LES DEUX BANCS VERTS du talus, juste derrière la grille, tournés vers le bosquet (photo 40, entre les
  // troncs du premier rang). Avec l'allée, au bord de l'allée, dos au talus (171706 : les bancs la bordent).
  const sBanc = M.allee ? EP + ABORDS.LA - 0.35 : 2.35;
  for (const [t, l] of [[12.0, 1.8], [14.0, 2.0]]) {
    const [x, z] = talusXZ(M, t, sBanc), g = murPoint(M, t).g;
    const b = banc(scene, K, x, z, Math.atan2(-g.nx, -g.nz), C.vertBanc, l);
    b.position.y = talusY(M, t, sBanc) - (M.allee ? 0 : 0.03);
  }
}

// Grille de barreaux : une tuile = 0,96 m (huit barreaux) sur 1,10 m, lisses haute et basse. Vert bouteille
// #3b5a3a (photos 40 et 602 : on la lit verte sur la pelouse ; #2e4a2e la faisait noire).
function grilleBosquetTex(canvasTex) {
  const cuite = texCuite(grilleBosquetTex, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#3b5a3a';
    for (let i = 0; i < 8; i++) g.fillRect(i * 8 + 3, 0, 2, h);
    g.fillRect(0, 3, w, 3); g.fillRect(0, h - 8, w, 3);
  }, [1, 1], true, 4);
}

// ---------------------------------------------------------------
//  LE PAVILLON
// ---------------------------------------------------------------
// LE PAVILLON au fond du bosquet (photo 40, calée : façade de px 1485 à 1990, porte à px 1702-1780, pied du
// perron juste à gauche du poteau du grand panier). 15 x 8 m, 5,5 m de haut, pierre claire à REFENDS (un joint
// creux tous les 0,35 m), socle de 0,5 m, toit d'ardoise en croupe. Au centre, la porte double en bois de
// 2,30 x 2,60 en haut d'un perron de trois marches ; une seule fenêtre de chaque côté, à 4,90 m de l'axe ; la
// petite plaque blanche à droite de la porte. Les pignons sont nus (photo 41 : un mur beige sans fenêtre).
// `x` = l'axe de la porte, `z` = le plan de la façade, `sens` = le côté vers lequel elle regarde (+1 : vers +z).
function pavillon(scene, K, x, z, sens = 1) {
  const W = 15, H = 5.5, D = 8;
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(W, H, D),
    new THREE.MeshStandardMaterial({ map: pierrePavillonTex(K.canvasTex), roughness: 0.9 }));
  corps.position.set(0, H / 2, -D / 2); corps.castShadow = true; corps.receiveShadow = true; g.add(corps);
  // la façade peinte, un rien devant le corps. Sur la photo 40 elle est CLAIRE et lumineuse au fond du bosquet
  // (#a1978b, une fois et demie le stabilisé devant elle, alors que tout autour est à l'ombre de la voûte) : la
  // pierre crème, tournée vers le couchant, renvoie le ciel du soir. Sans émission ni ombre reçue, l'ombre des
  // platanes la rendait grise et terne, et ses joints la faisaient lire comme un bardage de bois. Un quart de sa
  // propre couleur en émission, pas d'ombre portée sur elle (le corps, derrière, garde les siennes).
  const texFacade = facadePavillonTex(K.canvasTex);
  const facade = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: texFacade, roughness: 0.88,
    emissive: 0xffffff, emissiveMap: texFacade, emissiveIntensity: 0.25 }));
  facade.position.set(0, H / 2, 0.012); facade.receiveShadow = false; g.add(facade);
  // la corniche, qui déborde de 18 cm
  K.box(W + 0.36, 0.3, D + 0.36, new THREE.MeshStandardMaterial({ color: 0xe3d8c2, roughness: 0.85 }), 0, H - 0.1, -D / 2, g);
  // le toit en croupe : quatre pans de même pente (34°), faîtage de 7 m, débord de 30 cm
  const yb = H + 0.05, yr = yb + 2.9, W2 = W / 2 + 0.3, F = (W - D) / 2;
  const B = [[-W2, yb, -D - 0.3], [W2, yb, -D - 0.3], [W2, yb, 0.3], [-W2, yb, 0.3]];   // AR-G, AR-D, AV-D, AV-G
  const R = [[-F, yr, -D / 2], [F, yr, -D / 2]];
  const kPente = 1 / Math.sin(Math.atan2(2.9, D / 2 + 0.3)) / 1.2;
  const pos = [], uv = [];
  const tri = (a, b, c, long) => {
    for (const p of [a, b, c]) { pos.push(...p); uv.push((long ? p[0] : p[2]) / 1.2, (p[1] - yb) * kPente); }
  };
  tri(B[3], B[2], R[1], true); tri(B[3], R[1], R[0], true);          // long pan avant
  tri(B[1], B[0], R[0], true); tri(B[1], R[0], R[1], true);          // long pan arrière
  tri(B[2], B[1], R[1], false); tri(B[0], B[3], R[0], false);        // les croupes
  const gt = new THREE.BufferGeometry();
  gt.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  gt.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  gt.computeVertexNormals();
  const toit = new THREE.Mesh(gt, new THREE.MeshStandardMaterial({ map: ardoiseTex(K.canvasTex), roughness: 0.72,
    metalness: 0.1, side: THREE.DoubleSide }));
  toit.castShadow = true; toit.receiveShadow = true; g.add(toit);
  K.box(2 * F + 0.1, 0.1, 0.16, new THREE.MeshStandardMaterial({ color: 0x8c9196, roughness: 0.5, metalness: 0.4 }), 0, yr + 0.03, -D / 2, g);
  // le perron : trois marches de 19 cm, 4,60 m de large, pierre gris clair (photo 40 : on lit les trois nez de
  // marche sous la porte ; plus sombres, elles se fondaient dans le parvis) ; le seuil est à 0,57 m
  const marche = new THREE.MeshStandardMaterial({ color: 0xc9c3ba, roughness: 0.9 });
  for (let i = 0; i < 3; i++) K.box(4.6, 0.19, 0.34 * (3 - i), marche, 0, 0.095 + 0.19 * i, 0.17 * (3 - i), g);
  g.position.set(x, 0, z); g.rotation.y = sens > 0 ? 0 : Math.PI; scene.add(g);
  return g;
}

// La façade (15 x 5,5 m, 34 px/m). Couleurs relevées sur la photo 40 et corrigées du crépuscule : pierre
// #d8c3a0, refends #b8a88f à peine marqués, bois #947a6b, menuiseries #f1ede3, vitres #35404a.
function facadePavillonTex(canvasTex) {
  const cuite = texCuite(facadePavillonTex, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  const W = 15, H = 5.5;
  return canvasTex(512, 192, (g, w, h) => {
    const sx = w / W, sy = h / H;
    const X = (x) => (x + W / 2) * sx, Y = (y) => h - y * sy;        // x depuis l'axe de la porte, y depuis le sol
    const rect = (x0, y0, x1, y1, c) => { g.fillStyle = c; g.fillRect(X(x0), Y(y1), (x1 - x0) * sx, (y1 - y0) * sy); };
    rect(-7.5, 0, 7.5, 5.5, '#d8c3a0');
    for (let i = 0; i < 9000; i++) {                               // le grain et les nuances de la pierre
      const v = rnd(-22, 16);
      g.fillStyle = `rgba(${216 + v | 0},${195 + v | 0},${160 + v | 0},${rnd(0.15, 0.45)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), rnd(1, 2));
    }
    // les refends : un joint creux tous les 0,35 m, à peine plus sombre que la pierre ; joints montants décalés,
    // plus discrets encore. (Sombres et soulignés d'un fil clair, ils rayaient la façade comme un bardage de bois :
    // de loin, sur la photo 40, les refends ne se lisent presque pas)
    for (let y = 0.85, r = 0; y < 5.1; y += 0.35, r++) {
      g.fillStyle = 'rgba(184,168,143,0.35)'; g.fillRect(0, Y(y) - 1, w, 1.4);
      g.fillStyle = 'rgba(184,168,143,0.2)';
      for (let x = -7.5 + (r % 2) * 0.55; x < 7.5; x += 1.1) g.fillRect(X(x), Y(y + 0.35), 1, 0.35 * sy);
    }
    // les chaînes d'angle : blocs clairs alternés, longs et courts
    for (const s of [-1, 1]) {
      for (let y = 0.5, r = 0; y < 5.1; y += 0.35, r++) {
        const l = r % 2 ? 0.45 : 0.75, x0 = s < 0 ? -7.5 : 7.5 - l;
        rect(x0, y + 0.02, x0 + l, y + 0.33, '#e2d1b1');
      }
    }
    // le socle, le bandeau à 3,85 m, la corniche
    rect(-7.5, 0, 7.5, 0.5, '#c6b596'); rect(-7.5, 0.47, 7.5, 0.5, 'rgba(120,102,80,0.6)');
    rect(-7.5, 3.8, 7.5, 3.84, 'rgba(118,98,74,0.6)'); rect(-7.5, 3.84, 7.5, 4.0, '#e6d7b8');
    rect(-7.5, 5.1, 7.5, 5.16, 'rgba(110,92,70,0.55)'); rect(-7.5, 5.16, 7.5, 5.5, '#e8dcc2');
    // la porte double en haut du perron : chambranle clair, deux vantaux à panneaux haut et bas
    const P0 = 0.57, PH = 2.6, PW = 2.3;
    rect(-PW / 2 - 0.2, P0, PW / 2 + 0.2, P0 + PH + 0.22, '#e7dbc2');
    rect(-PW / 2, P0, PW / 2, P0 + PH, '#947a6b');
    g.strokeStyle = '#6b5344'; g.lineWidth = 2;
    for (const x0 of [-PW / 2, 0]) {
      const l = PW / 2;
      g.fillStyle = '#9d8374';
      g.fillRect(X(x0 + 0.15), Y(P0 + PH - 0.15), (l - 0.3) * sx, (PH - 1.2) * sy);
      g.strokeRect(X(x0 + 0.15), Y(P0 + PH - 0.15), (l - 0.3) * sx, (PH - 1.2) * sy);
      g.fillRect(X(x0 + 0.15), Y(P0 + 0.85), (l - 0.3) * sx, 0.68 * sy);
      g.strokeRect(X(x0 + 0.15), Y(P0 + 0.85), (l - 0.3) * sx, 0.68 * sy);
    }
    rect(-0.025, P0, 0.025, P0 + PH, '#4e3c30');
    rect(-PW / 2, P0 + PH - 0.05, PW / 2, P0 + PH, 'rgba(60,45,35,0.5)');
    // la petite plaque blanche, à droite de la porte
    rect(1.45, 1.8, 1.75, 2.2, '#f1efe8');
    g.fillStyle = 'rgba(90,90,95,0.6)';
    for (let k = 0; k < 3; k++) g.fillRect(X(1.5), Y(2.1 - k * 0.09), 0.2 * sx, 1);
    // les deux fenêtres : encadrement, appui, menuiserie blanche à deux vantaux de quatre carreaux
    for (const s of [-1, 1]) {
      const xc = s * 4.9, y0 = 1.2, fw = 1.0, fh = 2.0;
      rect(xc - fw / 2 - 0.15, y0, xc + fw / 2 + 0.15, y0 + fh + 0.18, '#e5d8bd');
      rect(xc - fw / 2 - 0.2, y0 - 0.1, xc + fw / 2 + 0.2, y0, '#efe5ce');
      rect(xc - fw / 2 - 0.2, y0 - 0.14, xc + fw / 2 + 0.2, y0 - 0.1, 'rgba(110,92,70,0.5)');
      rect(xc - fw / 2, y0, xc + fw / 2, y0 + fh, '#f1ede3');
      const cw = (fw - 0.07 * 2 - 0.06) / 2, ch = (fh - 0.07 * 2 - 0.04 * 3) / 4;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 4; j++) {
          const gx = xc - fw / 2 + 0.07 + i * (cw + 0.06), gy = y0 + 0.07 + j * (ch + 0.04);
          rect(gx, gy, gx + cw, gy + ch, j === 3 ? '#4a5661' : '#35404a');
        }
      }
      // la coulure sous l'appui
      const c = g.createLinearGradient(0, Y(y0 - 0.14), 0, Y(y0 - 0.9));
      c.addColorStop(0, 'rgba(120,108,90,0.3)'); c.addColorStop(1, 'rgba(120,108,90,0)');
      g.fillStyle = c; g.fillRect(X(xc - 0.4), Y(y0 - 0.14), 0.8 * sx, 0.76 * sy);
    }
    // salissures : coulures grises sous la corniche, pied plus sombre
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w, l = rnd(0.3, 1.2) * sy, c = g.createLinearGradient(0, Y(5.1), 0, Y(5.1) + l);
      c.addColorStop(0, 'rgba(95,88,78,0.22)'); c.addColorStop(1, 'rgba(95,88,78,0)');
      g.fillStyle = c; g.fillRect(x, Y(5.1), rnd(2, 5), l);
    }
    const pied = g.createLinearGradient(0, Y(0.9), 0, h);
    pied.addColorStop(0, 'rgba(80,68,52,0)'); pied.addColorStop(1, 'rgba(80,68,52,0.3)');
    g.fillStyle = pied; g.fillRect(0, Y(0.9), w, 0.9 * sy);
  }, null, false, 8);
}

// Les pignons et l'arrière : la même pierre à refends discrets (comme la façade), sans ouverture.
function pierrePavillonTex(canvasTex) {
  const cuite = texCuite(pierrePavillonTex, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 96, (g, w, h) => {
    const sy = h / 5.5, Y = (y) => h - y * sy;
    g.fillStyle = '#d8c3a0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) {
      const v = rnd(-22, 16);
      g.fillStyle = `rgba(${216 + v | 0},${195 + v | 0},${160 + v | 0},${rnd(0.15, 0.45)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), 1);
    }
    g.fillStyle = 'rgba(184,168,143,0.35)';
    for (let y = 0.85; y < 5.1; y += 0.35) g.fillRect(0, Y(y), w, 1);
    g.fillStyle = '#c6b596'; g.fillRect(0, Y(0.5), w, 0.5 * sy);
    g.fillStyle = '#e6d7b8'; g.fillRect(0, Y(4.0), w, 0.16 * sy);
    g.fillStyle = '#e8dcc2'; g.fillRect(0, 0, w, 0.34 * sy);
  }, null, false, 4);
}

// Ardoise : rangs de 15 cm, décalés d'un demi-module, une tuile = 1,20 m.
function ardoiseTex(canvasTex) {
  const cuite = texCuite(ardoiseTex, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#34393f'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) {
      for (let c = -1; c < 9; c++) {
        const v = rnd(-8, 10);
        g.fillStyle = `rgb(${76 + v | 0},${81 + v | 0},${88 + v | 0})`;
        g.fillRect(c * 16 + (r % 2) * 8 + 1, r * 16 + 1, 14, 14);
      }
    }
    for (let i = 0; i < 40; i++) {                                 // quelques lichens clairs
      g.fillStyle = `rgba(150,150,120,${rnd(0.1, 0.3)})`; g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 4), rnd(1, 3));
    }
  }, [1, 1], false, 4);
}

// ---------------------------------------------------------------
//  LES ABORDS DU PAVILLON : PARVIS, HAIES, ARBUSTES, ARBRES, ÉCHIFFRE
// ---------------------------------------------------------------
function abordsPavillon(scene, K, cx, feu, bois) {
  // LE PARVIS dallé gris, de z = -33,5 à la façade, de x = -18 à +2
  const parvis = new THREE.Mesh(new THREE.PlaneGeometry(20, 6.1), new THREE.MeshStandardMaterial({ map: parvisTex(K.canvasTex),
    roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  parvis.rotation.x = -Math.PI / 2; parvis.position.set(cx(-8), 0.015, -36.55); parvis.receiveShadow = true; scene.add(parvis);
  // les haies basses taillées (0,5 m), vert vif, au pied de la façade de part et d'autre du perron
  const VIF = paletteFond([[0x7a9a48, 3], [0x86a650, 2], [0x6b8a40, 2]]);
  haieFond(scene, K, feu, cx(-15.7), cx(-11.6), -38.8, 0.8, 0.5, VIF, 0x557234);
  haieFond(scene, K, feu, cx(-5.7), cx(-1.6), -38.8, 0.8, 0.5, VIF, 0x557234);
  // À DROITE DU PAVILLON : la haie de 1,20 m jusqu'à l'allée du quai, des arbustes de 2 à 3 m juste derrière,
  // puis des arbres de 10 à 12 m dont les couronnes descendent à 3 m. (Leurs couronnes restent à x > -2,5 :
  // la caméra de diffusion passe au-dessus du plateau dans cet axe.)
  haieFond(scene, K, feu, cx(-1.0), cx(7.2), -38.5, 0.9, 1.2, paletteFond([[0x3c4d2f, 3], [0x465a36, 2], [0x34442a, 2]]), 0x2f3d25);
  // (les arbustes contre le pignon droit s'arrêtent à son aplomb, x = -1)
  const ARB = paletteFond([[0x5f7a3f, 3], [0x52703a, 2], [0x6b8446, 2], [0x48633a, 1]]);
  for (const [x, z, h, r] of [[-0.1, -40.3, 2.4, 1.2], [1.2, -40.7, 2.9, 1.5], [2.7, -40.0, 2.2, 1.2], [4.1, -40.8, 3.0, 1.5],
                              [5.5, -40.1, 2.5, 1.3], [6.8, -40.7, 2.8, 1.4]]) arbusteFond(feu, cx(x), 0, z, h, r, ARB, 1e9, cx(-0.95));
  const VERT = paletteFond([[0x4e6a3c, 3], [0x5a7743, 2], [0x43603a, 2]]), eco = teinteFond(0x5d574e, 0.58);
  arbreFond(feu, bois, cx(2.9), 0, -43.4, 10.5, 3.6, VERT, eco);
  arbreFond(feu, bois, cx(5.3), 0, -46.8, 11.8, 3.7, VERT, eco);     // (à 2,5 m du rideau du quai, x = 7,7)
  arbreFond(feu, bois, cx(3.9), 0, -49.0, 12.5, 4.2, VERT, eco);
  // À GAUCHE, contre le pignon : l'escalier de pierre grise qui monte vers le talus, six marches de 20 cm, et
  // son échiffre en pente (1,35 m qui descend à 0,35 m vers la façade) — photo 40, px 1420-1500, entre le bout
  // du mur et l'angle du pavillon. Derrière, des arbustes et deux arbres sombres : sans eux, cette fenêtre
  // laissait voir la pelouse du fond et le ciel.
  const pierreG = new THREE.MeshStandardMaterial({ color: 0xb9b2a8, roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const x0 = cx(-19.1), x1 = cx(-16.1 - 0.5 * i);
    K.box(x1 - x0, 0.2, 2.0, pierreG, (x0 + x1) / 2, 0.1 + 0.2 * i, -39.9, scene);
  }
  const f = new THREE.Shape();
  f.moveTo(0, 0); f.lineTo(3.0, 0); f.lineTo(3.0, 0.35); f.lineTo(0, 1.35); f.closePath();
  const ech = new THREE.Mesh(new THREE.ExtrudeGeometry(f, { depth: 0.3, bevelEnabled: false }), pierreG);
  ech.position.set(cx(-19.1), 0, -38.9); ech.castShadow = true; ech.receiveShadow = true; scene.add(ech);
  const NOIR = paletteFond([[0x3a4a34, 3], [0x33422f, 2], [0x45553b, 2]]), ecoN = teinteFond(0x4a4540, 0.58);
  for (const [x, z, h, r] of [[-17.2, -42.1, 2.8, 1.2], [-19.0, -42.5, 3.2, 1.4], [-20.6, -38.4, 2.6, 1.3], [-22.4, -40.4, 3.0, 1.4]]) {
    arbusteFond(feu, cx(x), 0, z, h, r, NOIR, cx(-16.1));
  }
  arbreFond(feu, bois, cx(-21.4), 0, -43.6, 11, 3.9, NOIR, ecoN);
  arbreFond(feu, bois, cx(-24.0), 0, -47.2, 13, 4.4, NOIR, ecoN);
}

// Le parvis (20 x 6,1 m) : dalles de 50 cm #b3aeaa aux joints plus sombres, une bande plus claire #c4bfb8 côté
// bosquet et devant le perron. Le haut de la toile est côté façade.
function parvisTex(canvasTex) {
  const cuite = texCuite(parvisTex, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(512, 160, (g, w, h) => {
    const px = w / 20, d = 0.5 * px;
    g.fillStyle = '#9b9690'; g.fillRect(0, 0, w, h);
    for (let r = 0, y = 0; y < h; y += d, r++) {
      for (let x = (r % 2) * d * 0.5 - d; x < w; x += d) {
        const v = rnd(-9, 9), clair = y > h - 1.2 * px || (Math.abs(x + d / 2 - 9.5 * px) < 2.3 * px && y < 2.4 * px);
        const b = clair ? [196, 191, 184] : [179, 174, 170];
        g.fillStyle = `rgb(${b[0] + v | 0},${b[1] + v | 0},${b[2] + v | 0})`;
        g.fillRect(x + 1, y + 1, d - 1.5, d - 1.5);
      }
    }
    for (let i = 0; i < 26; i++) {                                 // taches d'humidité et de mousse
      const r = rnd(8, 30), gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, `rgba(${Math.random() < 0.5 ? '95,100,80' : '120,112,100'},0.18)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); g.translate(Math.random() * w, Math.random() * h); g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); g.restore();
    }
  }, null, false, 8);
}

// ---------------------------------------------------------------
//  LES GRANDS ARBRES DERRIÈRE LE MUR, LES ARBUSTES DU TALUS
// ---------------------------------------------------------------
// Positions relevées sur les photos 40 et 41 recalées (le pied de chacun est posé sur le talus) :
//  - le cèdre sombre (#3e4a3c), 16,5 m, houppier de 10 m, qui ferme le ciel en haut à gauche de la photo 40 ;
//  - le hêtre pourpre (brun-bronze), houppier de 12 m, sommet à 18 m, entre le cèdre et la voûte ;
//  - le grand feuillu qui jaunit (vert-jaune olive, #6a6955 sur la photo 601), au centre de la photo 41, sur le
//    talus du mur droit, trois mètres derrière la grille ; une de ses charpentières part vers le pin, et vu du
//    terrain (341, 601, 602) sa couronne couvre le bout du mur côté platanes. Elle est TAILLÉE à l'aplomb du mur
//    (x = -22,9) : sinon elle passait à 13 m au-dessus du terrain 2.
function arbresDuFond(M, cx, feu, ced, bois, boisCed = bois) {
  // (le bois du cèdre à part : le vrai cèdre le remplace, voir fondPlatanes)
  // DEPUIS LES PHOTOS DU 28/09 (l'allée au pied du mur, voir abordsMur) le talus est plus bas près du mur : chaque arbre
  // garde la hauteur de sa couronne, calée sur les photos du plateau — son fût part du nouveau sol et s'allonge
  // d'autant (`fut`). Le feuillu qui jaunit, qui était sur le tracé de l'allée, recule au bord de celle-ci : c'est
  // l'un des grands arbres qui penchent au-dessus d'elle (171706), sa couronne ne change pas (xMax).
  const fut = (x, z, r, eco) => {
    const y = solFond(M, x, z), yv = solFond(M, x, z, true);
    if (yv - y > 0.05) rameauFond(bois, new THREE.Vector3(x, y - 0.3, z), new THREE.Vector3(x, yv, z), r * 1.05, r, eco);
    return yv;
  };
  const yCed = solFond(M, cx(-25.5), -18.0);
  cedreSombre(ced, boisCed, cx(-25.5), yCed, -18.0, 16.5 + solFond(M, cx(-25.5), -18.0, true) - yCed);
  hetrePourpre(feu, bois, cx(-23.0), fut(cx(-23.0), -27.5, 0.6, teinteFond(0x8d8a82, 0.58)), -27.5);
  feuilluJaunissant(feu, bois, cx(-28.3), fut(cx(-28.3), -8.2, 0.5, teinteFond(0x8a8479, 0.58)), -8.2, cx(-22.9));
}

// Les arbustes sombres du talus, derrière la grille du bout du mur (photo 40, px 1000-1400) : une rangée basse,
// qui laisse la place aux deux bancs, et une rangée plus haute derrière, vers le bout. La rangée basse ne commence
// qu'à t = 11 et ne garde qu'un pied sur deux : sur les photos 40 et 602 on voit, derrière la grille, la terre nue
// du talus et les bancs entre des touffes espacées, pas une haie continue.
function plantesTalus(M, acc) {
  const PAL = paletteFond([[0x3f5236, 3], [0x37482f, 2], [0x4a5c3b, 2], [0x55653f, 1]]);
  // (avec l'allée des photos du 28/09, les deux rangées reculent de sa largeur : elles poussent sur la pente qui la borde)
  const dS = M.allee ? ABORDS.LA : 0;
  const pose = (t, s0, h, r) => { const s = s0 + dS, [x, z] = talusXZ(M, t, s); arbusteFond(acc, x, talusY(M, t, s) - 0.1, z, h, r, PAL); };
  for (let t = 11, i = 0; t < M.T - 0.4; t += rnd(1.3, 1.9), i++) {
    if (i % 2) continue;
    const bancs = Math.abs(t - 12) < 1.7 || Math.abs(t - 14) < 1.7;
    pose(t, bancs ? rnd(4.4, 5.6) : rnd(3.4, 5.2), rnd(1.6, 2.5) + (t > 17 ? 0.7 : 0), rnd(1.0, 1.35));
  }
  for (let t = 14; t < M.T + 1; t += rnd(1.8, 2.6)) pose(Math.min(t, M.T), rnd(6.5, 9), rnd(2.6, 3.6), rnd(1.4, 1.8));
}

// ---------------------------------------------------------------
//  LA FABRIQUE DES ARBRES DU FOND
// ---------------------------------------------------------------
// Un accumulateur de feuillage : les plans (touffes), leur volume d'éclairage (pour coudre) et leur teinte.
function accFeuillage() {
  const o = new THREE.Object3D();
  o.rotation.order = 'YXZ';                    // on couche d'abord le plan (x), puis on le fait tourner sur place (y)
  return { touffes: [], infos: [], teintes: [], o, plan: new THREE.PlaneGeometry(1, 1) };
}
export function carteFond(acc, x, y, z, rx, ry, rz, sx, sy, vol, teinte) {
  const o = acc.o;
  o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, 1); o.updateMatrix();
  acc.touffes.push(acc.plan.clone().applyMatrix4(o.matrix)); acc.infos.push(vol); acc.teintes.push(teinte);
}
// Une touffe en CROIX : un plan à plat et deux debout, qui se lit sous tous les angles.
function croixFond(acc, x, y, z, s, vol, teinte) {
  const ry = Math.random() * Math.PI;
  carteFond(acc, x, y, z, -Math.PI / 2 + rnd(-0.3, 0.3), ry, 0, s, s, vol, teinte);
  carteFond(acc, x, y + 0.05, z, rnd(-0.25, 0.25), ry, 0, s, s * 0.72, vol, teinte);
  carteFond(acc, x, y + 0.05, z, rnd(-0.25, 0.25), ry + Math.PI / 2, 0, s, s * 0.72, vol, teinte);
}
// coudre(), puis la couleur de l'essence : chaque plan a quatre sommets, dans l'ordre des touffes.
function coudreTeinte(acc) {
  const g = coudre(acc.touffes, acc.infos), col = g.attributes.color;
  for (let i = 0; i < acc.teintes.length; i++) {
    const t = acc.teintes[i];
    for (let k = i * 4; k < i * 4 + 4; k++) col.setXYZ(k, col.getX(k) * t[0], col.getY(k) * t[1], col.getZ(k) * t[2]);
  }
  col.needsUpdate = true;
  return g;
}
// La couleur de sommet qui donne la teinte visée (sRGB) sur une texture neutre : la texture et coudre()
// assombrissent ensemble d'environ `norme` (en linéaire), on la divise d'autant.
export function teinteFond(hex, norme = 0.44) {
  const c = new THREE.Color(hex);
  return [c.r / norme, c.g / norme, c.b / norme];
}
// Une palette pondérée [[couleur, poids], ...] -> un tirage au sort de teintes.
export function paletteFond(liste) {
  const sac = [];
  for (const [hex, n] of liste) { const t = teinteFond(hex); for (let i = 0; i < n; i++) sac.push(t); }
  return () => sac[Math.floor(Math.random() * sac.length)];
}
// Un tronçon de bois (cylindre ouvert) de a à b, teinté par sommet.
function rameauFond(bois, a, b, r0, r1, teinte, seg = 7) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1, true);
  const uvs = g.attributes.uv;
  for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * Math.max(1, Math.round(r0 * 8)), uvs.getY(i) * L / 1.5);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  const n = g.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = teinte[0]; c[i * 3 + 1] = teinte[1]; c[i * 3 + 2] = teinte[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  bois.push(g);
}
// Un paquet de croix dans un ellipsoïde (rayon r, demi-hauteur ry), tirées plus souvent vers la surface.
// `xMax`, `xMin` : une taille (le bord des croix, pas leur centre, s'y arrête) — côté plateau, contre un mur.
// `debout` (facultatif) : au lieu de croix, des cartes DEBOUT, hautes et minces, sans plan à plat — les plumets des
// bambous. { h: [min, max] } leur hauteur (la largeur est tirée entre s0 et s1), `rx` leur inclinaison. Leur volume
// d'éclairage est une COLONNE (le centre suit la hauteur de la carte) : avec une boule, toute la moitié haute d'une
// touffe de sept mètres regardait le ciel et sortait blanche.
// (Lot L8 : les touffes tirées en rr^0,7 et non plus rr^0,4. Relecture : rr^0,4 ne les poussait pas à la surface —
// c'est à peu près le tirage uniforme dans le volume (rr^1/3), rayon médian 0,76 —, mais il donnait à chaque massif une
// densité égale jusqu'à son bord, donc une silhouette nette de boule. rr^0,7 (rayon médian 0,62) les resserre vers le
// centre : le bord de la touffe s'éclaircit et se découpe, que les rameaux de feuillesFondTex ajourent. L'effet, mesuré
// sur les massifs au-dessus du mur, reste faible — saturation et clarté à ±0,01, grain à ±0,3 de rr^0,4 ; c'est la
// tuile qui a changé leur allure. Il dégarnit en revanche le bas des couronnes : voir hetrePourpre.)
function paquetFond(acc, c, r, ry, n, s0, s1, vol, pal, yMin = -1e9, xMax = 1e9, xMin = -1e9, debout = null) {
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 6.283, v = Math.acos(rnd(-1, 1)), rr = Math.pow(Math.random(), 0.7), s = rnd(s0, s1);
    const y = Math.max(yMin, c.y + Math.cos(v) * ry * rr), m = s * 0.5 + rnd(0, 0.3);
    const x = Math.max(xMin + m, Math.min(xMax - m, c.x + Math.cos(u) * Math.sin(v) * r * rr));
    const z = c.z + Math.sin(u) * Math.sin(v) * r * rr, info = { c: vol.c, r: vol.r, t: rnd(0.88, 1.12) };
    if (debout) {
      const rx = debout.rx || 0;
      info.c = [vol.c[0], y, vol.c[2]];
      carteFond(acc, x, y, z, rnd(-rx, rx), Math.random() * Math.PI, rnd(-rx, rx) * 0.5, s, rnd(debout.h[0], debout.h[1]), info, pal());
    } else croixFond(acc, x, y, z, s, info, pal());
  }
}

// LE GRAND FEUILLU QUI JAUNIT (photos 41, 341, 601 et 602) : 15 m, fût fourchu dès 4 m, trois charpentières qui
// montent en éventail et un houppier OUVERT de 12 m — des paquets de feuilles au bout des branches, du ciel entre
// eux dans le tiers bas. Vert-jaune OLIVE, des plaques plus jaunes. L'une des charpentières part vers z+, longue et
// couchée : vu du terrain (601), sa couronne s'étend au-dessus du mur jusque vers le milieu (z ≈ +1).
// `xMax` : la taille côté plateau.
function feuilluJaunissant(acc, bois, x, y0, z, xMax = 1e9) {
  const V = (a, b, c) => new THREE.Vector3(a, b, c), eco = teinteFond(0x8a8479, 0.58);
  // (cible #6a6955 sur la photo 601, saturation ~0,2, 0,58 fois le ciel : un vert-jaune olive, moins pâle et moins
  // gris que la palette d'avant, qui sortait crème. Les teintes [0x98a052, 0x86904c, 0x74843f, 0xb3a24a, 0x6a7042]
  // rapprochées aux deux cinquièmes de leur gris : pures, elles sortaient à 0,31 de saturation sous le soleil doré)
  const pal = paletteFond([[0x989d6e, 3], [0x868d64, 3], [0x778157, 2], [0xaba16c, 1], [0x6b6e53, 1]]);
  const vol = { c: [x, y0 + 10.5, z], r: 6.2 };
  const fourche = V(x + 0.2, y0 + 4.2, z - 0.15);
  rameauFond(bois, V(x, y0 - 0.4, z), V(x, y0 + 0.6, z), 0.5, 0.37, eco);
  rameauFond(bois, V(x, y0 + 0.5, z), fourche, 0.37, 0.28, eco);
  const a0 = Math.PI / 2;                                         // la première charpentière part vers z+
  for (let i = 0; i < 3; i++) {
    const az = a0 + i * 2.094 + rnd(-0.3, 0.3);
    const tilt = i === 0 ? 0.65 : rnd(0.42, 0.6), L = i === 0 ? 7.5 : rnd(6.2, 7.2);
    const bout = V(fourche.x + Math.sin(tilt) * Math.cos(az) * L, fourche.y + Math.cos(tilt) * L, fourche.z + Math.sin(tilt) * Math.sin(az) * L);
    bout.x = Math.min(bout.x, xMax - 1.0);
    rameauFond(bois, fourche, bout, 0.2, 0.08, eco);
    paquetFond(acc, bout, 2.6, 2.0, 18, 1.8, 2.6, vol, pal, -1e9, xMax);
    for (const f of [0.5, 0.78]) {
      const p = fourche.clone().lerp(bout, f), az2 = az + (Math.random() < 0.5 ? -1 : 1) * rnd(0.6, 1.1);
      const t2 = rnd(0.9, 1.2), L2 = rnd(2.6, 3.6);
      const q = V(p.x + Math.sin(t2) * Math.cos(az2) * L2, p.y + Math.cos(t2) * L2, p.z + Math.sin(t2) * Math.sin(az2) * L2);
      q.x = Math.min(q.x, xMax - 0.5);
      rameauFond(bois, p, q, 0.1, 0.04, eco, 5);
      paquetFond(acc, q, 2.0, 1.5, 13, 1.6, 2.3, vol, pal, -1e9, xMax);
    }
  }
  paquetFond(acc, V(x, y0 + 13.0, z), 2.6, 1.8, 16, 1.8, 2.5, vol, pal, -1e9, xMax);
}

// LE HÊTRE POURPRE : fût gris lisse, cinq charpentières qui MONTENT, un houppier haut et AJOURÉ brun-bronze —
// sur les photos 600 et 601, derrière le mur, on voit le ciel entre ses paquets de feuilles — dont le bord
// retombe ; quelques plaques bronze-vert.
function hetrePourpre(acc, bois, x, y0, z) {
  const V = (a, b, c) => new THREE.Vector3(a, b, c), eco = teinteFond(0x8d8a82, 0.58);
  // (brun-bronze, plus du tout mauve : en fin d'été, contre le ciel du soir, il sort sur les photos 600 et 601 en
  // brun sombre un peu olive ; la palette pourpre d'avant le faisait lie-de-vin)
  const pal = paletteFond([[0x5e5046, 3], [0x544a42, 3], [0x4a433a, 2], [0x6a5c48, 2], [0x5c5e48, 1]]);
  const vol = { c: [x, y0 + 9.5, z], r: 6.5 };
  const fourche = V(x, y0 + 2.8, z);
  rameauFond(bois, V(x, y0 - 0.4, z), V(x, y0 + 0.6, z), 0.6, 0.45, eco);
  rameauFond(bois, V(x, y0 + 0.5, z), fourche, 0.45, 0.36, eco);
  const a0 = Math.random() * 6.283;
  for (let i = 0; i < 5; i++) {
    const az = a0 + i * 1.257 + rnd(-0.25, 0.25), tilt = rnd(0.35, 0.6), L = rnd(7, 8.5);
    const bout = V(x + Math.sin(tilt) * Math.cos(az) * L, fourche.y + Math.cos(tilt) * L, z + Math.sin(tilt) * Math.sin(az) * L);
    rameauFond(bois, fourche, bout, 0.22, 0.08, eco);
    paquetFond(acc, bout, 2.8, 2.2, 20, 1.9, 2.7, vol, pal);
    paquetFond(acc, fourche.clone().lerp(bout, 0.6), 1.8, 1.4, 8, 1.7, 2.3, vol, pal);
    // (relecture du lot L8 : un paquet de plus au bas de chaque charpentière. Avec la tuile du fond en rameaux, plus
    // ajourée, et ses touffes resserrées vers le centre des paquets, le bas de la couronne ne cachait plus les cinq
    // charpentières : vues du plateau (pose de la photo 601, caméra de diffusion du terrain 2), elles sortaient en
    // éventail de perches claires sous la couronne, là où la photo ne montre qu'une masse sombre)
    paquetFond(acc, fourche.clone().lerp(bout, 0.32), 1.3, 1.1, 6, 1.5, 2.0, vol, pal);
  }
  // (le cœur de la couronne, moitié moins fourni et plus haut qu'avant : il bouchait tout le ciel)
  paquetFond(acc, V(x, y0 + 11.5, z), 5.2, 5.5, 35, 2.0, 2.8, vol, pal);
  // le bord qui retombe, plus haut et plus serré qu'avant (à 5-6 m du fût et 5 m du sol, il élargissait la couronne à
  // 15 m et cachait le cèdre pleureur voisin, photos 600 et 601)
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * 6.283, r = rnd(4.2, 5.0);
    croixFond(acc, x + Math.cos(a) * r, y0 + rnd(5.5, 7.5), z + Math.sin(a) * r, rnd(1.8, 2.4), { c: vol.c, r: vol.r, t: rnd(0.85, 1.0) }, pal());
  }
}

// LE CÈDRE PLEUREUR (photos 600 et 601, derrière le bout du mur côté pin ; j6, vu du jardin) : fût droit, et des
// ÉTAGES de rameaux qui RETOMBENT — chaque plateau penche vers l'extérieur, et de son bord pendent des rideaux de
// rameaux, si bien que la silhouette est une cloche sombre et frangée, non une pagode de plateaux horizontaux. La
// flèche, au sommet, penche (vers z-). Chaque plateau s'éclaire comme un disque — clair dessus, sombre dessous.
// `H` : hauteur des étages au-dessus du pied (la flèche en ajoute 1,8 m).
function cedreSombre(acc, bois, x, y0, z, H = 16.5) {
  const V = (a, b, c) => new THREE.Vector3(a, b, c), eco = teinteFond(0x524840, 0.58), un = [1, 1, 1];
  rameauFond(bois, V(x, y0 - 0.4, z), V(x, y0 + 1.0, z), 0.62, 0.45, eco);
  rameauFond(bois, V(x, y0 + 0.9, z), V(x + 0.3, y0 + H * 0.6, z - 0.2), 0.45, 0.28, eco);
  rameauFond(bois, V(x + 0.3, y0 + H * 0.6 - 0.1, z - 0.2), V(x + 0.1, y0 + H, z), 0.28, 0.06, eco);
  for (let y = y0 + 3.4; y < y0 + H - 0.5; y += rnd(1.2, 1.55)) {
    // (max : au premier étage, y - y0 - 3,4 vaut parfois -4e-16 selon y0, et la puissance d'un négatif rendait NaN)
    const f = Math.max(0, (y - y0 - 3.4) / (H - 3.4)), R = 0.6 + 3.2 * (1 - Math.pow(f, 1.25));
    const np = f > 0.8 ? 2 : 3, a0 = Math.random() * 6.283;
    for (let p = 0; p < np; p++) {
      const az = a0 + (p * 6.283) / np + rnd(-0.4, 0.4), d = R * rnd(0.45, 0.6);
      const px = x + Math.cos(az) * d, pz = z + Math.sin(az) * d, py = y + rnd(-0.2, 0.2), rp = R * rnd(0.55, 0.7);
      rameauFond(bois, V(x, py - 0.4, z), V(px, py - 0.35, pz), 0.1, 0.04, eco, 5);
      const vol = { c: [px, py - 0.35, pz], r: rp + 0.4, t: rnd(0.9, 1.1) };
      // le plateau, PENCHÉ vers l'extérieur de 0,35 à 0,6 rad : ses cartes le suivent, plus bas à mesure qu'elles
      // s'éloignent du fût (ry = π/2 - az tourne la pente de la carte vers l'extérieur)
      const pente = rnd(0.35, 0.6);
      for (let i = 0; i < 10; i++) {
        const u = Math.random() * 6.283, r = Math.sqrt(Math.random()) * rp, s = rnd(1.3, 1.9);
        const qx = px + Math.cos(u) * r, qz = pz + Math.sin(u) * r;
        const chute = (Math.hypot(qx - x, qz - z) - d) * Math.tan(pente) * 0.8;
        carteFond(acc, qx, py - chute + rnd(-0.12, 0.15), qz, -Math.PI / 2 + pente + rnd(-0.12, 0.12),
          Math.PI / 2 - az + rnd(-0.3, 0.3), 0, s, s * rnd(0.8, 1), vol, un);
      }
    }
    // les RIDEAUX qui pendent du bord de l'étage : 6 à 8 cartes debout de 1,2 x 2,4 m, face à l'extérieur, leur bas
    // deux mètres sous l'étage — c'est ce qui fait le « pleureur ». Chacune est doublée d'une carte en travers : vue de
    // biais, une carte seule n'est qu'un trait, et la cloche du cèdre se lisait comme la flèche étroite d'un sapin
    const nR = 6 + Math.floor(Math.random() * 3), b0 = Math.random() * 6.283;
    for (let i = 0; i < nR; i++) {
      const u = b0 + (i * 6.283) / nR + rnd(-0.3, 0.3), r = R * rnd(0.65, 1.0);
      const volR = { c: [x + Math.cos(u) * r * 0.5, y - 1.0, z + Math.sin(u) * r * 0.5], r: R + 0.6, t: rnd(0.85, 1.0) };
      // (le centre du rideau : 1,2 m sous l'étage, pour que son bas pende à 2 m)
      const xR = x + Math.cos(u) * r, yR = y - 2.0 + 1.2 + rnd(-0.2, 0.2), zR = z + Math.sin(u) * r, face = Math.PI / 2 - u + rnd(-0.35, 0.35);
      carteFond(acc, xR, yR, zR, rnd(-0.06, 0.06), face, rnd(-0.08, 0.08), rnd(1.1, 1.3), rnd(2.2, 2.6), volR, un);
      carteFond(acc, xR, yR + 0.1, zR, rnd(-0.06, 0.06), face + Math.PI / 2, rnd(-0.08, 0.08), rnd(0.9, 1.1), rnd(2.0, 2.4), volR, un);
    }
    // le cœur de l'étage, contre le fût : sans lui on voyait le ciel entre les plateaux, et le cèdre (une masse
    // sombre sur les photos 40 et 601) devenait une dentelle — et son fût, nu, un poteau
    const volC = { c: [x, y - 0.3, z], r: R + 0.4, t: rnd(0.8, 0.95) };
    for (let i = 0; i < 3; i++) croixFond(acc, x + rnd(-0.8, 0.8), y + rnd(-0.5, 0.3), z + rnd(-0.8, 0.8), rnd(1.6, 2.2), volC, un);
  }
  // LA FLÈCHE : 2 m, penchée de 25° vers z-, une touffe à son pied et trois petits rideaux le long d'elle
  const tete = V(x + 0.1, y0 + H + 2 * Math.cos(0.436), z - 2 * Math.sin(0.436));
  rameauFond(bois, V(x + 0.1, y0 + H - 0.1, z), tete, 0.06, 0.02, eco, 5);
  const volP = { c: [x, y0 + H - 0.6, z - 0.4], r: 1.6, t: 1 };
  for (let i = 0; i < 3; i++) croixFond(acc, x + rnd(-0.4, 0.4), y0 + H - rnd(0, 1.0), z + rnd(-0.4, 0.4), rnd(1.2, 1.5), volP, un);
  for (let i = 0; i < 3; i++) {
    const k = (i + 1) / 3, u = rnd(0, 6.283);
    carteFond(acc, x + 0.1 + Math.cos(u) * 0.25, y0 + H + k * 1.6 - 0.6, z - k * 0.85 + Math.sin(u) * 0.25, rnd(-0.1, 0.1),
      Math.PI / 2 - u, 0, rnd(0.7, 0.9), rnd(1.3, 1.6), volP, un);
  }
}

// Un feuillu générique du fond, dense : fût jusqu'au tiers, trois ou quatre branches, couronne ellipsoïdale
// (dessous vers 0,3 h). `pal` : sa palette, `eco` : la teinte de son écorce.
function arbreFond(acc, bois, x, y0, z, h, R, pal, eco) {
  const V = (a, b, c) => new THREE.Vector3(a, b, c), yf = y0 + h * 0.3;
  rameauFond(bois, V(x, y0 - 0.3, z), V(x, yf, z), 0.26 + h * 0.008, 0.2, eco);
  const nb = 3 + Math.floor(Math.random() * 2), a0 = Math.random() * 6.283;
  for (let i = 0; i < nb; i++) {
    const a = a0 + (i * 6.283) / nb + rnd(-0.3, 0.3);
    rameauFond(bois, V(x, yf - 0.1, z), V(x + Math.cos(a) * R * 0.5, y0 + h * 0.58, z + Math.sin(a) * R * 0.5), 0.13, 0.05, eco, 5);
  }
  const vol = { c: [x, y0 + h * 0.6, z], r: Math.max(R, h * 0.36) };
  paquetFond(acc, V(x, y0 + h * 0.6, z), R, h * 0.34, Math.round(R * h * 2.6), 1.6, 2.4, vol, pal);
}

// Un arbuste arrondi posé au sol (ou sur le talus) : `h` de haut, `R` de rayon ; `xMax`/`xMin` le taillent
// contre un mur ; `yMin` : le plus bas de ses touffes (25 cm au-dessus du sol par défaut — au ras du sol pour les
// massifs collés au grillage du mur, qui ne laissent pas voir l'herbe dessous).
export function arbusteFond(acc, x, y0, z, h, R, pal, xMax = 1e9, xMin = -1e9, yMin = y0 + 0.25) {
  const vol = { c: [x, y0 + h * 0.45, z], r: Math.max(R, h * 0.5) };
  paquetFond(acc, new THREE.Vector3(x, y0 + h * 0.5, z), R, h * 0.5, Math.round(10 * R * h), 0.9, 1.4, vol, pal, yMin, xMax, xMin);
}

// Une haie taillée qui court le long de x, de x0 à x1, centrée sur zc : un noyau plein (on ne voit pas au
// travers) et des plans de feuilles plaqués sur ses faces et son dessus, qui cassent l'arête de la boîte.
function haieFond(scene, K, acc, x0, x1, zc, ep, H, pal, coeur) {
  K.box(x1 - x0 - 0.1, H - 0.06, ep - 0.16, new THREE.MeshStandardMaterial({ color: coeur, roughness: 1 }), (x0 + x1) / 2, (H - 0.06) / 2, zc, scene);
  const L = x1 - x0, n = Math.round(L * (H + ep) * (H > 0.8 ? 16 : 26)), k = H > 0.8 ? 1.35 : 1;
  const vol = { c: [(x0 + x1) / 2, H * 0.35, zc], r: Math.max(ep, H) * 0.9 };
  for (let i = 0; i < n; i++) {
    const xx = rnd(x0 + 0.05, x1 - 0.05), cote = Math.random(), s = rnd(0.35, 0.55) * k;
    const info = { c: [xx, vol.c[1], zc], r: vol.r, t: rnd(0.95, 1.2) };
    if (cote < 0.34) {
      carteFond(acc, xx, H + rnd(-0.08, 0.04), zc + rnd(-ep / 2 + 0.08, ep / 2 - 0.08), -Math.PI / 2 + rnd(-0.5, 0.5), rnd(0, Math.PI), 0, s, s, info, pal());
    } else {
      const sg = cote < 0.72 ? 1 : -1;                              // plus de feuilles côté bosquet (+z)
      carteFond(acc, xx, rnd(0.12, H - 0.05), zc + sg * (ep / 2 - rnd(0, 0.06)), rnd(-0.5, 0.5), (sg > 0 ? 0 : Math.PI) + rnd(-0.6, 0.6),
        rnd(-0.6, 0.6), s, s, info, pal());
    }
  }
  for (const [xe, sg] of [[x0, -1], [x1, 1]]) {                    // les deux bouts
    for (let i = 0; i < Math.round(ep * H * 30); i++) {
      carteFond(acc, xe + sg * rnd(0, 0.05), rnd(0.12, H - 0.05), zc + rnd(-ep / 2, ep / 2), rnd(-0.5, 0.5), sg * Math.PI / 2 + rnd(-0.5, 0.5),
        rnd(-0.5, 0.5), 0.45 * k, 0.45 * k, { c: [xe - sg * ep / 2, vol.c[1], zc], r: vol.r, t: rnd(0.95, 1.15) }, pal());
    }
  }
}

// ---------------------------------------------------------------
//  LES TEXTURES DU FEUILLAGE ET DES ÉCORCES DU FOND
// ---------------------------------------------------------------
// Feuilles NEUTRES (gris, un peu plus chaudes ou plus froides) : la couleur vient des sommets. Feuilles du fond plus
// sombres, dessinées d'abord.
// LOT L8 (30/09) : un RAMEAU IRRÉGULIER, plus un disque. La tuile d'avant était « un paquet arrondi, plein au cœur, qui
// s'effiloche au bord » : sur des centaines de croix, chaque carte se lisait comme une boule, et les massifs au-dessus
// du mur (le haut de la caméra de diffusion du terrain 2) comme des choux-fleurs, cernés de noir au loin (voir saigner).
// Désormais cinq à sept branches maîtresses partent d'un nœud pris au bas du cœur, s'écartent en éventail inégal (des
// trous francs entre elles) et vont jusqu'au bord, chacune avec deux à quatre ramilles ; les feuilles se groupent le
// long d'elles. Le contour est celui d'un rameau, jamais le même d'un côté à l'autre, et on voit au travers.
// Et la tuile est PLUS SOMBRE (feuilles d'ombre 110 à 140, de devant 140 à 195, au lieu de 115 à 160 et 168 à 250) :
// les franges noires que la saignée efface assombrissaient ces feuillages de 15 à 25 % à la distance où on les voit
// (niveaux de mip 3 et 4), et toutes leurs teintes avaient été calées AVEC elles. Sans cette retouche, les massifs
// au-dessus du mur passaient de 0,51 à 0,58 fois l'enrobé, pâles et laiteux (photo 601 : 0,47 à 0,5).
export function feuillesFondTex(canvasTex) { return avecTeinte(feuillesFondTexBrut(canvasTex), TEINTES_FEUILLES.fond); }
function feuillesFondTexBrut(canvasTex) {
  const cuite = texCuite(feuillesFondTexBrut, arguments, [saigner]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.lineCap = 'round'; g.lineJoin = 'round';
    // les brins : [x0, y0, x1, y1] ; les feuilles se posent le long d'eux (au prorata de leur longueur)
    const brins = [];
    // (un rameau s'arrête avant le bord : ses feuilles ne doivent jamais être coupées par le bord de la tuile, qui
    // redessinerait le carré du plan)
    const branche = (x, y, a, L, n, lw) => {
      g.strokeStyle = 'rgba(96,88,78,0.9)'; g.lineWidth = lw; g.beginPath(); g.moveTo(x, y);
      const pts = [[x, y]];
      for (let k = 0; k < n; k++) {
        a += rnd(-0.28, 0.28);
        const nx = x + (Math.cos(a) * L) / n, ny = y + (Math.sin(a) * L) / n;
        if (nx < 44 || nx > w - 44 || ny < 44 || ny > h - 44) break;
        brins.push([x, y, nx, ny]); x = nx; y = ny; pts.push([x, y]); g.lineTo(x, y);
      }
      g.stroke();
      return pts;
    };
    // le nœud, au bas du cœur ; les maîtresses en éventail INÉGAL (l'écart entre deux d'entre elles va du simple au
    // triple), de 170 à 250 px : elles vont jusqu'au bord (ou s'arrêtent avant, voir branche)
    const x0 = w / 2 + rnd(-30, 30), y0 = h * 0.54 + rnd(-25, 25), nb = 5 + Math.floor(Math.random() * 3);
    const ecarts = []; for (let i = 0; i < nb; i++) ecarts.push(rnd(1, 3));
    const somme = ecarts.reduce((s, e) => s + e, 0);
    let a = Math.random() * 6.283;
    for (let i = 0; i < nb; i++) {
      const pts = branche(x0, y0, a, rnd(170, 250), 5, rnd(2.5, 4));
      for (let j = 0; j < 2 + Math.floor(Math.random() * 3); j++) {                     // les ramilles
        const p = pts[Math.min(pts.length - 1, 1 + Math.floor(Math.random() * 3))];
        branche(p[0], p[1], a + (Math.random() < 0.5 ? -1 : 1) * rnd(0.5, 1.1), rnd(60, 115), 3, rnd(1.2, 2.2));
      }
      a += (ecarts[i] / somme) * 6.283;
    }
    const long = brins.map((b) => Math.hypot(b[2] - b[0], b[3] - b[1])), total = long.reduce((s, l) => s + l, 0);
    const surBrin = () => {
      let r = Math.random() * total, i = 0;
      while (i < brins.length - 1 && (r -= long[i]) > 0) i++;
      const [bx0, by0, bx1, by1] = brins[i], t = Math.random(), e = rnd(6, 34);
      const ang = Math.random() * 6.283, cl = (v, m) => Math.min(m - 28, Math.max(28, v));
      return [cl(bx0 + (bx1 - bx0) * t + Math.cos(ang) * e, w), cl(by0 + (by1 - by0) * t + Math.sin(ang) * e, h)];
    };
    // un tiers des feuilles au CŒUR, autour du nœud, dans un contour bosselé (rayon de 90 à 165 px selon la direction :
    // jamais un cercle) — des rameaux seuls faisaient une étoile de découpures ajourées, pâle, qui ne se lisait plus
    // comme un massif ; les deux autres tiers le long des rameaux : le bord de la touffe, cassé, qui va jusqu'au bord
    const ph1 = Math.random() * 6.283, ph2 = Math.random() * 6.283;
    const bosse = (t) => 128 * (1 + 0.17 * Math.sin(3 * t + ph1) + 0.12 * Math.sin(5 * t + ph2));
    const auCoeur = () => {
      const t = Math.random() * 6.283, r = Math.sqrt(Math.random()) * bosse(t);
      return [x0 + Math.cos(t) * r, y0 + Math.sin(t) * r * 0.9];
    };
    // (1300 feuilles et non plus 900 : 34 % de la tuile passe le seuil de découpe, contre 46 % au disque plein. Le
    // massif n'en est pas plus troué : paquetFond met plus de cartes dans l'épaisseur, et ses 10 % les plus sombres
    // restent à 38 sur 255, vus du plateau, pose de la photo 601, hors grillage — 35 à 41 sur les photos 600 et 601)
    for (let i = 0; i < 1300; i++) {
      const [x, y] = i % 3 ? surBrin() : auCoeur();
      const fond = i < 470, v = fond ? rnd(110, 140) : rnd(140, 195), ch = rnd(-12, 14);
      g.fillStyle = `rgb(${v + ch | 0},${v | 0},${v - ch * 0.5 - 8 | 0})`;
      const L = rnd(14, 26), l = L * rnd(0.42, 0.58);
      g.save(); g.translate(x, y); g.rotate(Math.random() * 6.283);
      g.beginPath(); g.moveTo(0, -L); g.quadraticCurveTo(l, -L * 0.15, 0, L * 0.7); g.quadraticCurveTo(-l, -L * 0.15, 0, -L); g.fill();
      if (!fond) { g.strokeStyle = 'rgba(255,255,240,0.18)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, L * 0.6); g.lineTo(0, -L * 0.8); g.stroke(); }
      g.restore();
    }
    saigner(g);                                                  // (la couleur sous l'alpha nul, voir saigner)
  }, [1, 1], true, 8);
}

// LES PLUMETS DES BAMBOUS (lot L8 ; photo 601, au milieu : une masse vert moyen, fine et plumeuse, de 6 à 7 m). Ils
// portaient la tuile des feuillus du fond, un paquet rond étiré deux à trois fois en hauteur : des artichauts pâles.
// Leur tuile à eux, NEUTRE comme celle du fond (la couleur vient des sommets, BAMBOU) : trois ou quatre chaumes à
// nœuds qui montent, et à leurs nœuds des ramilles qui portent des éventails de feuilles longues et étroites
// (5 à 9 cm sur 1), retombantes — denses dans le haut, clairsemées au pied, où l'on voit les chaumes.
function chaumesBambou(canvasTex) { return avecTeinte(chaumesBambouBrut(canvasTex), TEINTES_FEUILLES.fond); }
function chaumesBambouBrut(canvasTex) {
  const cuite = texCuite(chaumesBambouBrut, arguments, [saigner]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.lineCap = 'round';
    const feuille = (x, y, a, L, W, v) => {
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = `rgb(${v + 4 | 0},${v | 0},${v - 8 | 0})`;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(W, L * 0.35, 0, L); g.quadraticCurveTo(-W, L * 0.35, 0, 0); g.fill();
      g.restore();
    };
    const nc = 3 + Math.floor(Math.random() * 2), noeuds = [];
    for (let c = 0; c < nc; c++) {
      // un chaume : du pied (hors de la tuile) au sommet, à peine penché, un nœud tous les 40 à 60 px
      const xb = w * (0.2 + (0.6 * (c + rnd(0.2, 0.8))) / nc), pen = rnd(-0.08, 0.08), ep = rnd(3, 4.5);
      g.strokeStyle = `rgb(${rnd(150, 175) | 0},${rnd(150, 175) | 0},${rnd(130, 150) | 0})`; g.lineWidth = ep;
      const yh = rnd(10, 60);
      g.beginPath(); g.moveTo(xb, h + 2); g.lineTo(xb + pen * (h - yh), yh); g.stroke();
      for (let y = h - rnd(20, 50); y > yh + 20; y -= rnd(40, 60)) {
        const x = xb + pen * (h - y);
        g.strokeStyle = 'rgba(80,78,64,0.8)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - ep * 0.7, y); g.lineTo(x + ep * 0.7, y); g.stroke();
        noeuds.push([x, y]);
      }
    }
    // les ramilles et leurs éventails : plus on monte, plus il y en a (le pied reste ajouré)
    noeuds.sort(() => Math.random() - 0.5);
    for (const [x, y] of noeuds) {
      const haut = 1 - y / h, nr = Math.random() < 0.45 + 0.55 * haut ? 1 + Math.floor(Math.random() * (2 + 2.5 * haut)) : 0;
      for (let r = 0; r < nr; r++) {
        const cote = Math.random() < 0.5 ? -1 : 1, a = -Math.PI / 2 + cote * rnd(0.5, 1.1), L = rnd(25, 55);
        const xr = x + Math.cos(a) * L, yr = y + Math.sin(a) * L;
        g.strokeStyle = 'rgba(120,118,98,0.85)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(x, y); g.lineTo(xr, yr); g.stroke();
        // l'éventail : six à dix feuilles qui partent du bout de la ramille et retombent vers l'extérieur
        const nf = 6 + Math.floor(Math.random() * 5);
        for (let f = 0; f < nf; f++) {
          const b = -cote * rnd(0.2, 1.6) + rnd(-0.3, 0.3), fond = Math.random() < 0.3;   // (0 : pendante ; vers son côté)
          feuille(xr + rnd(-5, 5), yr + rnd(-5, 5), b, rnd(38, 70), rnd(3.5, 5.5), fond ? rnd(135, 160) : rnd(165, 215));
        }
      }
    }
    saigner(g);                                                  // (la couleur sous l'alpha nul, voir saigner)
  }, [1, 1], true, 8);
}

// Rameaux de cèdre : des axes aplatis garnis de pinceaux d'aiguilles courtes, vert bleuté sombre, quelques
// pousses plus claires ; serrés au centre pour que le plateau se lise comme une masse.
function aiguillesCedreTex(canvasTex) { return avecTeinte(aiguillesCedreTexBrut(canvasTex), TEINTES_FEUILLES.cedreFond); }
function aiguillesCedreTexBrut(canvasTex) {
  const cuite = texCuite(aiguillesCedreTexBrut, arguments, [saigner]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * 6.283, r = Math.pow(Math.random(), 0.6) * 0.4 * w;
      const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r * 0.75;
      const dir = rnd(-0.6, 0.6) + (Math.random() < 0.5 ? 0 : Math.PI), L = rnd(30, 60);
      const clair = Math.random() < 0.22, v = rnd(0.85, 1.15), c = clair ? [106, 126, 114] : [70, 88, 78];
      g.strokeStyle = `rgba(${c[0] * v | 0},${c[1] * v | 0},${c[2] * v | 0},0.95)`;
      for (let k = 0; k < 16; k++) {
        const px = x + (Math.cos(dir) * L * k) / 16, py = y + (Math.sin(dir) * L * k) / 16;
        for (let j = 0; j < 7; j++) {
          const b = Math.random() * 6.283, l = rnd(4, 9);
          g.lineWidth = rnd(1.3, 2.2);
          g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(b) * l, py + Math.sin(b) * l * 0.6); g.stroke();
        }
      }
    }
    saigner(g);                                                  // (lot L8 : la couleur sous l'alpha nul, voir saigner)
  }, [1, 1], true, 4);
}

// Écorce neutre (gris clair, stries verticales) : chaque arbre la teinte par ses sommets.
function ecorceFondTex(canvasTex) {
  const cuite = texCuite(ecorceFondTex, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      const v = rnd(150, 235) | 0;
      g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), rnd(3, 12));
    }
    g.strokeStyle = 'rgba(90,90,90,0.45)';
    for (let i = 0; i < 10; i++) {
      let x = Math.random() * w, y = 0;
      g.lineWidth = rnd(1, 2); g.beginPath(); g.moveTo(x, y);
      while (y < h) { y += rnd(8, 24); x += rnd(-2, 2); g.lineTo(x, y); }
      g.stroke();
    }
  }, [1, 1], false, 4);
}

// =====================================================================
//  LE DRAPEAU
// =====================================================================

// Le drapeau tricolore sur son mât blanc de 7,5 m, sur la terrasse haute du côté du pin. Il PEND (le
// soir des photos il n'y avait pas de vent) : 1,0 m de large pour 1,4 de haut. `y0` : la base du mât.
function drapeau(scene, K, x, z, y0 = 0) {
  const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 7.5, 10), new THREE.MeshStandardMaterial({ color: 0xf0f0ee, roughness: 0.5 }));
  mat.position.set(x, y0 + 3.75, z); mat.castShadow = true; scene.add(mat);
  const tex = K.canvasTex(96, 128, (g, w, h) => {
    g.fillStyle = '#1f3a8a'; g.fillRect(0, 0, w / 3, h);
    g.fillStyle = '#f2f2f2'; g.fillRect(w / 3, 0, w / 3, h);
    g.fillStyle = '#d0302f'; g.fillRect((2 * w) / 3, 0, w / 3, h);
  }, null, false, 4);
  const d = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4, 6, 6), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 }));
  const p = d.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) + 0.5) * 5) * 0.05 * (0.7 - p.getY(i)));
  d.geometry.computeVertexNormals();
  d.position.set(x + 0.55, y0 + 7.5 - 0.75, z); scene.add(d);
}

// =====================================================================
//  LE JARDIN DU PARC DE BÉCON, DERRIÈRE LE GRILLAGE DU PIN
// =====================================================================
// Les photos du parc (envoyées par Haythem le 26/09, et celles du jardin j1 à j6) montrent ce qu'on voit à travers
// le grillage du pin : un jardin à la française dont l'axe va du quai à la grande terrasse. Au fond, le MUR DE
// TERRASSE en pierre claire, percé de fenêtres cintrées, avec son DOUBLE ESCALIER en diagonale, sa balustrade de fer
// forgé, et au-dessus le MUR HAUT, la haie taillée, les lanternes, la statue et le DRAPEAU ; devant lui l'ancien
// BASSIN rectangulaire — sur la photo la plus récente (j4), une pelouse encaissée plantée de graminées — entouré
// d'ALLÉES ROUGES et de bandes grises ; de part et d'autre des pelouses en pente, des massifs de fleurs collés aux
// escaliers de pierre ; des ifs taillés en CÔNE aux angles, côté quai, et la grille noire du quai. Le terrain de
// basket est dans l'angle, au bord du quai, sur le flanc du jardin.
// Repère du terrain 1 (cx) ; l'axe du jardin est parallèle à x, à z = ZJ. Côté terrain, juste derrière les
// arbustes du grillage, le CHEMIN ROUGE longe le haut du talus du pin (hauteurTalusPin, 1,40 à 1,48 m) sur
// toute la longueur, du quai au pied de la terrasse ; puis la pelouse descend aux allées du bassin. Le haut
// de la terrasse est au niveau du parc haut, derrière le mur de meulière (5,30 m).
function jardinBecon(scene, K, cx, XN) {
  const ZJ = 35;                                   // axe du jardin
  const XT = cx(-34);                              // pied du mur de terrasse
  const XQ = cx(8.6);                              // bout côté quai : l'allée rouge, puis la grille du quai
  const XG = XQ + 0.3;                             // le dos du soubassement de la grille : les sols du jardin vont jusque-là
  const YA = 0.5, YH = 1.48;                       // niveau des allées et du bassin ; haut des pelouses
  const Z0 = 20, Z1 = 24.5, Z2 = 45.5, Z3 = 50;    // pelouse côté terrain (Z0 -> Z1), parterre, pelouse d'en face
  const ZR = 17.2;                                 // le mur de retour de la terrasse (le parc haut s'arrête là)
  const XE = cx(-26.5);                            // l'axe des deux escaliers des pelouses
  const rouge = new THREE.MeshStandardMaterial({ map: allees(K.canvasTex), roughness: 0.9 });
  rouge.map.repeat.set((XG - XT) / 3, (Z2 - Z1) / 3);          // (une tuile de 3 m : un joint clair tous les 3 m)
  const herbe = new THREE.MeshStandardMaterial({ map: gazonJardin(K.canvasTex), roughness: 1 });
  herbe.map.repeat.set(12, 12);
  rouge.userData.surfaceParc = 'terreRouge'; herbe.userData.surfaceParc = 'herbe';    // (les autres allées rouges sont des clones)
  const pierre = new THREE.MeshStandardMaterial({ color: 0xcdc6b6, roughness: 0.85 });
  // le troène taillé (la haie basse d'en face) : le feuillage des ifs, en plus clair
  const taille = new THREE.MeshStandardMaterial({ map: feuillageIf(K.canvasTex, true), roughness: 0.95 });
  // LE FEUILLAGE DU JARDIN — arbres du parc haut, sous-bois, massif d'en face, lierre et buissons du mur de terrasse —
  // tient en UN maillage, comme le fond des platanes (fondPlatanes) : une texture de feuilles neutre, la couleur de
  // chaque essence par sommet ; les troncs en un second. Les deux palettes d'arbustes sont celles des abords du
  // pavillon : vert sombre (laurier, if libre) et vert moyen (troène, fusain).
  const feu = accFeuillage(), bois = [];
  const SOMBRE = paletteFond([[0x3a4a34, 3], [0x33422f, 2], [0x45553b, 2]]);
  const MOYEN = paletteFond([[0x5f7a3f, 3], [0x52703a, 2], [0x6b8446, 2], [0x48633a, 1]]);
  const plan = (w, l, mat, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat);
    m.rotation.order = 'YXZ'; m.rotation.y = ry; m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m);
    return m;
  };
  // pente de pelouse le long de x, de (z0, y0) à (z1, y1)
  const pente = (x0, x1, z0, z1, y0, y1, mat = herbe) => {
    const L = Math.hypot(z1 - z0, y1 - y0), a = Math.atan2(y1 - y0, z1 - z0);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, L), mat);
    m.rotation.x = -Math.PI / 2 - a; m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m);
    return m;
  };
  // le sol du jardin le long du quai : le haut des pelouses aux deux bouts, les allées au milieu
  const solJardin = (z) => (z <= Z0 || z >= Z3 ? YH : z < Z1 ? YH + (YA - YH) * (z - Z0) / (Z1 - Z0)
    : z <= Z2 ? YA : YA + (YH - YA) * (z - Z2) / (Z3 - Z2));
  // le talus gazonné qui prolonge le mur de terrasse au-delà de la pelouse d'en face (murTerrasse) : 5,30 m au bord du
  // parc haut (XT - 1,2), YH - 0,02 à son pied (XT + 5)
  const solTalus = (x) => YH - 0.02 + (5.32 - YH) * Math.min(1, Math.max(0, (XT + 5 - x) / 6.2));

  // ---- le sol : les allées rouges au niveau du bassin, les pelouses qui montent de chaque côté (côté quai, jusqu'au
  // soubassement de la grille)
  plan(XG - XT, Z2 - Z1, rouge, (XT + XG) / 2, YA, ZJ);                        // le grand parterre d'allées
  pente(XT, XG, Z0, Z1, YH, YA);                                                // pelouse côté terrain
  pente(XT, XG, Z2, Z3, YA, YH);                                                // pelouse d'en face
  plan(XQ + 2 - XT, 40, herbe, (XT + XQ + 2) / 2, YH - 0.01, Z3 + 20);         // au-delà, le parc à plat
  // LE CHEMIN DU HAUT (photo prise de la terrasse : l'allée rouge qui longe le haut de la pelouse, au pied
  // des arbustes et du pin) : 2,2 m d'enrobé rouge qui suit le talus, bordé côté pelouse d'un caniveau de
  // dalles grises. Du quai jusqu'au pied de la terrasse.
  const nappeTalus = (z0, z1, mat, dy) => {
    const g = new THREE.PlaneGeometry(XQ + 0.9 - XT, z1 - z0, 1, 6);
    g.rotateX(-Math.PI / 2); g.translate((XT + XQ + 0.9) / 2, 0, (z0 + z1) / 2);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) p.setY(k, hauteurTalusPin(p.getZ(k)) + dy);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m);
    return m;
  };
  const rougeChemin = rouge.clone(); rougeChemin.map = rouge.map.clone(); rougeChemin.map.repeat.set((XQ + 0.9 - XT) / 3, 1);
  rougeChemin.polygonOffset = true; rougeChemin.polygonOffsetFactor = -2; rougeChemin.polygonOffsetUnits = -2;
  nappeTalus(17.4, 19.6, rougeChemin, 0.03);
  const caniveau = new THREE.MeshStandardMaterial({ color: 0x9a9894, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  caniveau.userData.surfaceParc = 'dalles';
  nappeTalus(19.6, 20.0, caniveau, 0.03);        // même niveau que le chemin : sa première rangée est la dernière du chemin
  for (const z of [17.35, 20.05]) {
    // (12 cm, dont 4 dans le sol : la pelouse du talus est 2 cm SOUS hauteurTalusPin, une bordure de 8 cm posée
    // sur hauteurTalusPin flottait au-dessus d'elle)
    // (côté plateau, la bordure s'interrompt là où l'allée du mur arrive en biais : photos du 28/09, voir abordsMur)
    const tr = z < 18 ? [[XT, cx(ABORDS.BIAIS_EX[0][0])], [cx(ABORDS.BIAIS_IN[ABORDS.BIAIS_IN.length - 1][0]), XQ + 0.9]] : [[XT, XQ + 0.9]];
    for (const [xa, xb] of tr) {
      const b = K.box(xb - xa, 0.12, 0.1, pierre, (xa + xb) / 2, hauteurTalusPin(z) + 0.02, z, scene);
      b.castShadow = false;
    }
  }
  // bordures de pierre au pied des pelouses
  for (const z of [Z1 + 0.08, Z2 - 0.08]) K.box(XG - XT, 0.1, 0.16, pierre, (XT + XG) / 2, YA + 0.05, z, scene);

  // ---- CÔTÉ QUAI, LA GRILLE NOIRE (photos j4 et j1 : au bout du jardin, une allée rouge de 3 m, puis une grille de fer
  // noire d'1,10 m sur un soubassement de pierre, et le trottoir du quai ; plus de haie de troène). Le soubassement
  // suit le sol du jardin et le ferme côté quai (de 0,5 à 1,5 m au-dessus de la pelouse du parc) ; la grille est UN
  // plan à texture ajourée (barreaux de 2 cm tous les 12 cm, lisses haute et basse), cisaillé pour suivre le sol,
  // barreaux d'aplomb ; poteaux tous les 2,5 m.
  const sb = new THREE.Shape();
  sb.moveTo(Z0, -0.05); sb.lineTo(Z3, -0.05);
  for (const z of [Z3, Z2, Z1, Z0]) sb.lineTo(z, solJardin(z) + 0.15);
  sb.closePath();
  const geoSb = new THREE.ExtrudeGeometry(sb, { depth: 0.35, bevelEnabled: false });
  // profil : x du dessin -> z du monde, y -> y, épaisseur -> x- (de XQ + 0,65 à XG)
  geoSb.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0)));
  geoSb.translate(XQ + 0.65, 0, 0);
  const soub = new THREE.Mesh(geoSb, pierre); soub.castShadow = true; soub.receiveShadow = true; scene.add(soub);
  const sommets = [], uvG = [], faces = [];
  [Z0, Z1, Z2, Z3].forEach((z, i) => {
    const y = solJardin(z) + 0.15;
    sommets.push(XQ + 0.5, y, z, XQ + 0.5, y + 1.1, z);
    uvG.push((z - Z0) / 0.12, 0, (z - Z0) / 0.12, 1);
    if (i) { const a = 2 * (i - 1); faces.push(a, a + 2, a + 3, a, a + 3, a + 1); }
  });
  const geoG = new THREE.BufferGeometry();
  geoG.setAttribute('position', new THREE.Float32BufferAttribute(sommets, 3));
  geoG.setAttribute('uv', new THREE.Float32BufferAttribute(uvG, 2));
  geoG.setIndex(faces); geoG.computeVertexNormals();
  scene.add(new THREE.Mesh(geoG, new THREE.MeshStandardMaterial({ map: grilleQuaiTex(K.canvasTex), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 })));
  const poteaux = [];
  for (let z = Z0; z <= Z3 + 0.01; z += 2.5) poteaux.push(new THREE.BoxGeometry(0.06, 1.2, 0.06).translate(XQ + 0.5, solJardin(z) + 0.75, z));
  const pot = new THREE.Mesh(mergeGeometries(poteaux), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.5 }));
  pot.castShadow = true; scene.add(pot);

  // ---- LE BASSIN, 22 x 9 m : sa margelle de pierre, et dedans, sur la photo la plus récente (j4, prise de la terrasse),
  // plus d'eau : une PELOUSE ENCAISSÉE, et au milieu un lit de terre en fuseau planté de touffes de GRAMINÉES en rangées
  // décalées. (j1 et j5, plus anciennes, montrent encore l'eau et les trois jets : partis avec elle, comme la colonne
  // blanche qu'on voyait par la trouée derrière D2.)
  const BX0 = cx(-27), BX1 = cx(-5), BZ0 = ZJ - 4.5, BZ1 = ZJ + 4.5, BXC = (BX0 + BX1) / 2;
  const herbeB = herbe.clone(); herbeB.map = herbe.map.clone(); herbeB.map.repeat.set((BX1 - BX0) / 2, (BZ1 - BZ0) / 2);
  plan(BX1 - BX0, BZ1 - BZ0, herbeB, BXC, YA + 0.05, ZJ);
  // le lit : 15 x 4,5 m, un fuseau aux bouts arrondis (demi-largeur à l'abscisse `u` depuis son milieu)
  const demiLit = (u) => 2.25 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u) / 7.5, 2.5)), 0.6);
  const fuseau = new THREE.Shape();
  for (let i = 0; i <= 40; i++) { const u = -7.5 + (15 * i) / 40; if (i) fuseau.lineTo(u, demiLit(u)); else fuseau.moveTo(u, 0); }
  for (let i = 39; i > 0; i--) { const u = -7.5 + (15 * i) / 40; fuseau.lineTo(u, -demiLit(u)); }
  fuseau.closePath();
  const matLit = new THREE.MeshStandardMaterial({ color: 0x6b5a45, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  matLit.userData.surfaceParc = 'solForet';
  const lit = new THREE.Mesh(new THREE.ShapeGeometry(fuseau).rotateX(-Math.PI / 2).translate(BXC, YA + 0.06, ZJ), matLit);
  lit.receiveShadow = true; scene.add(lit);
  // environ 120 touffes : une rangée tous les 45 cm le long du lit, une touffe tous les 90 cm en travers, décalée
  // d'une demi-maille d'une rangée à l'autre (deux fois moins sur téléphone)
  const pieds = [];
  const pasLit = LEGER ? 0.9 : 0.45;
  for (let i = 0, u = -7.3; u <= 7.3; u += pasLit, i++) {
    for (let v = -2.25 + (i % 2) * 0.45; v <= 2.25; v += 0.9) {
      if (Math.abs(v) > demiLit(u) - 0.2) continue;
      pieds.push([BXC + u + rnd(-0.06, 0.06), ZJ + v + rnd(-0.06, 0.06)]);
    }
  }
  graminees(scene, K, pieds, YA + 0.06);
  const EP = 0.45, HM = 0.25;
  K.box(BX1 - BX0 + 2 * EP, HM, EP, pierre, BXC, YA + HM / 2, BZ0 - EP / 2, scene);
  K.box(BX1 - BX0 + 2 * EP, HM, EP, pierre, BXC, YA + HM / 2, BZ1 + EP / 2, scene);
  K.box(EP, HM, BZ1 - BZ0, pierre, BX0 - EP / 2, YA + HM / 2, ZJ, scene);
  K.box(EP, HM, BZ1 - BZ0, pierre, BX1 + EP / 2, YA + HM / 2, ZJ, scene);
  // l'allée de dalles grises qui entoure la margelle (photo j4 : une bande grise avant le rouge), cernée d'une bordure
  // de pavés clairs
  const gris = new THREE.MeshStandardMaterial({ color: 0x8f8d8a, roughness: 0.9 });
  gris.userData.surfaceParc = 'dalles';
  for (const z of [BZ0 - EP - 1.1, BZ1 + EP + 1.1]) plan(BX1 - BX0 + 2 * EP + 4.4, 2.2, gris, BXC, YA + 0.004, z);
  for (const x of [BX0 - EP - 1.1, BX1 + EP + 1.1]) plan(2.2, BZ1 - BZ0 + 2 * EP, gris, x, YA + 0.004, ZJ);
  const paves = new THREE.MeshStandardMaterial({ color: 0xc9c4b8, roughness: 0.85 });
  const GX = BX1 - BX0 + 2 * EP + 4.4, GZ = BZ1 - BZ0 + 2 * EP + 4.4;
  for (const s of [-1, 1]) {
    plan(GX + 0.3, 0.15, paves, BXC, YA + 0.006, ZJ + s * (GZ / 2 + 0.075));
    plan(0.15, GZ + 0.3, paves, BXC + s * (GX / 2 + 0.075), YA + 0.006, ZJ);
  }
  // AU PIED DES PELOUSES, une bande grise CONTINUE de 2,4 m (photos j4, j1, j6), lisse — ce n'est pas le dallage du
  // bassin —, interrompue devant chaque escalier par 4 m de rouge ; un liseré de pavés clairs de 15 cm la sépare du
  // rouge sur ses trois autres côtés. (Sa rugosité diffère d'un cheveu de celle des dalles : à réglages égaux,
  // l'optimiseur du décor, js/court.js dedupliquerMateriaux, en faisait un seul matériau, qui recevait alors le
  // détail photo des dalles.)
  const grisLisse = new THREE.MeshStandardMaterial({ color: 0x8f8d8a, roughness: 0.88 });
  const LBG = 2.4, bandes = [], liseres = [];
  const bande = (w, l, x, z, y) => new THREE.PlaneGeometry(w, l).rotateX(-Math.PI / 2).translate(x, y, z);
  for (const [zp, sg] of [[Z1, 1], [Z2, -1]]) {
    for (const [xa, xb] of [[XT + 1, XE - 2], [XE + 2, XQ - 3]]) {
      const zb = zp + sg * LBG / 2;
      bandes.push(bande(xb - xa, LBG, (xa + xb) / 2, zb, YA + 0.005));
      liseres.push(bande(xb - xa + 0.3, 0.15, (xa + xb) / 2, zp + sg * (LBG + 0.075), YA + 0.007));
      for (const xe of [xa - 0.075, xb + 0.075]) liseres.push(bande(0.15, LBG, xe, zb, YA + 0.007));
    }
  }
  for (const [geos, mat] of [[bandes, grisLisse], [liseres, paves]]) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat); m.receiveShadow = true; scene.add(m);
  }

  // ---- LES MASSIFS DE FLEURS, collés aux escaliers (photos j1, j4, j6) : un de chaque côté de chaque escalier, près
  // de ses murets, 2 x 3,6 m, le grand axe dans la pente ; plantés par taches (jaune, orange, blanc, rouge, violet).
  // Rien plus loin vers le quai.
  const fleursC = new THREE.MeshStandardMaterial({ map: massifFleurs(K.canvasTex, 'court'), roughness: 0.9, alphaTest: 0.5 });
  const penteL = Z1 - Z0, pa = Math.atan2(YH - YA, penteL);
  for (const z of [Z0 + 2.2, Z3 - 2.2]) {
    const cote = z < ZJ ? 1 : -1;
    const t = cote === 1 ? (z - Z0) / penteL : (Z3 - z) / penteL;
    for (const s of [-1, 1]) {
      const m = plan(2.0, 3.6, fleursC, XE + s * 3.3, YH - (YH - YA) * t + 0.04, z);
      m.rotation.x = -Math.PI / 2 + cote * pa;
    }
  }
  // LE BOUT CÔTÉ QUAI (photos j4 et j1) : un tapis de gazon au bout de l'axe, son long massif de fleurs, deux massifs
  // ronds de 1,6 m à ses bouts ; entre lui et la grille, l'allée rouge (3 m)
  const fleurs = new THREE.MeshStandardMaterial({ map: massifFleurs(K.canvasTex), roughness: 0.9, alphaTest: 0.5 });
  const XB0 = cx(1.2), XB1 = XG - 2.8, XBC = (XB0 + XB1) / 2;
  plan(XB1 - XB0, 18, herbe, XBC, YA + 0.01, ZJ);
  plan(12, 2.6, fleurs, XBC + 0.4, YA + 0.03, ZJ, Math.PI / 2);
  // (les massifs ronds prennent le milieu de la tuile du long massif — des fleurs, sans son liseré — et un anneau
  // de buis)
  const ronds = [], anneaux = [];
  for (const s of [-1, 1]) {
    const g = new THREE.CircleGeometry(0.8, 24), uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, 0.4 + uv.getX(k) * 0.13, 0.2 + uv.getY(k) * 0.6);
    ronds.push(g.rotateX(-Math.PI / 2).translate(XBC, YA + 0.03, ZJ + s * 8));
    anneaux.push(new THREE.RingGeometry(0.8, 0.9, 24).rotateX(-Math.PI / 2).translate(XBC, YA + 0.03, ZJ + s * 8));
  }
  scene.add(new THREE.Mesh(mergeGeometries(ronds), fleurs));
  scene.add(new THREE.Mesh(mergeGeometries(anneaux), new THREE.MeshStandardMaterial({ color: 0x3c5a2b, roughness: 0.95 })));

  // ---- les escaliers de pierre qui montent aux pelouses, du côté de la terrasse (photos j4, j1, j3, j6) : douze
  // marches grises au nez clair entre deux murets bas de rocaille ; côté terrain il débouche sur le chemin du haut
  const texMuret = meuliereTexture(K.canvasTex, 8.2, 0.6);
  texMuret.wrapS = texMuret.wrapT = THREE.RepeatWrapping; texMuret.repeat.set(1 / 8.2, 1 / 0.6);   // (UV en mètres)
  const matEsc = {
    marche: new THREE.MeshStandardMaterial({ color: 0x9d9a92, roughness: 0.9 }),
    nez: new THREE.MeshStandardMaterial({ color: 0xcfccc4, roughness: 0.85 }),
    // les moellons sombres des murets (#6e6960) : la meulière du mur rembrunie, avec son relief photo
    muret: new THREE.MeshStandardMaterial({ map: texMuret, color: 0x8f9199, roughness: 0.95 }),
  };
  matEsc.muret.userData.surfaceParc = 'meuliere';
  for (const [zBas, sens] of [[Z1, -1], [Z2, 1]]) escalierPelouse(scene, K, XE, zBas, sens, YA, YH, penteL, matEsc);

  // ---- les deux ifs taillés en pain de sucre, aux coins des pelouses côté quai (2,6 m)
  const ifMat = new THREE.MeshStandardMaterial({ map: feuillageIf(K.canvasTex), roughness: 0.95 });
  const profil = [[0.02, 0], [0.34, 0.02], [0.37, 0.12], [0.33, 0.36], [0.24, 0.62], [0.12, 0.86], [0.02, 1]].map(([r, y]) => new THREE.Vector2(r, y));
  for (const z of [Z1 + 1.0, Z2 - 1.0]) {
    const c = new THREE.Mesh(new THREE.LatheGeometry(profil, 16), ifMat);
    c.scale.setScalar(2.6); c.position.set(cx(5.4), YA, z); c.castShadow = true; scene.add(c);
  }

  // ---- LE MUR DE TERRASSE, au fond du jardin, tourné vers le quai : 24 m (photos j3, j5, j6), de ZJ - 12 à ZJ + 12 ;
  // la pelouse côté terrain bute contre son pan de retour, celle d'en face contre le pan plein qui le prolonge jusqu'au
  // talus gazonné (à Z3)
  murTerrasse(scene, K, XT, ZJ, YA, XN, ZJ - 12, ZR, YH, Z3, feu);

  // ---- CÔTÉ OPPOSÉ AU TERRAIN, au-delà de la pelouse d'en face (photos j5, j1, j3) : une allée rouge de 2,5 m bordée
  // de pierre, une haie taillée basse, puis un MASSIF CONTINU d'arbustes vert moyen et vert sombre, de 2 à 4 m, qui
  // ferme le jardin (il monte aussi sur le talus gazonné, dont XA est le pied) ; les tilleuls passent derrière
  const XA = XT + 5;
  const rougeAllee = rougeChemin.clone(); rougeAllee.map = rouge.map.clone(); rougeAllee.map.repeat.set((XQ - XA) / 3, 2.5 / 3);
  plan(XQ - XA, 2.5, rougeAllee, (XA + XQ) / 2, YH + 0.005, Z3 + 1.25);
  for (const z of [Z3 + 0.06, Z3 + 2.44]) K.box(XQ - XA, 0.1, 0.12, pierre, (XA + XQ) / 2, YH + 0.01, z, scene);
  const haieBasse = new THREE.Mesh(uvMetres(new THREE.BoxGeometry(XQ - XA, 0.8, 0.8), XQ - XA, 0.8, 0.8), taille);
  haieBasse.position.set((XA + XQ) / 2, YH - 0.01 + 0.4, Z3 + 3.0); haieBasse.castShadow = true; haieBasse.receiveShadow = true; scene.add(haieBasse);
  // (un arbuste tous les 1,5 à 2 m, sur deux rangs un pas sur deux et au milieu sinon : le rang de derrière ne se voit
  // qu'entre ceux de devant ; un seul rang, plus lâche, sur téléphone)
  for (let x = XT + 0.6, rang = 0; x < XQ - 0.4; x += LEGER ? rnd(2.2, 2.8) : rnd(1.5, 2), rang++) {
    for (const z of LEGER || rang % 2 ? [56] : [54.9, 57.2]) {
      const xx = x + rnd(-0.3, 0.3);
      arbusteFond(feu, xx, solTalus(xx) - 0.05, z + rnd(-0.4, 0.4), rnd(2, 4), rnd(1.0, 1.5), Math.random() < 0.5 ? MOYEN : SOMBRE);
    }
  }

  // ---- LE PARC HAUT, derrière la terrasse (photos j5, j6, j3 et 1000051342) : au-dessus de la haie, le HÊTRE POURPRE
  // et le grand FEUILLU QUI JAUNIT (pas de tilleul ici), et entre leurs fûts un SOUS-BOIS continu d'arbustes qui bouche
  // le ciel. Au premier rang, un arbuste tous les 1,5 à 2 m ; au second, un sur deux, qu'on ne voit qu'entre ceux du
  // premier (un seul rang, plus lâche, sur téléphone). (Le seul cèdre, au coin du mur et du pin, est posé ailleurs.)
  hetrePourpre(feu, bois, cx(-42), 5.3, 45);
  feuilluJaunissant(feu, bois, cx(-41), 5.3, 38);
  const couleur = () => (Math.random() < 0.55 ? SOMBRE : MOYEN);
  for (let z = 18 + rnd(0, 0.6), rang = 0; z < 50; z += LEGER ? rnd(2.2, 2.8) : rnd(1.5, 2), rang++) {
    arbusteFond(feu, cx(rnd(-40.5, -43.5)), 5.3, z, rnd(3, 5), rnd(1.3, 2), couleur());
    if (!LEGER && rang % 2 === 0) arbusteFond(feu, cx(rnd(-44.5, -48)), 5.3, z + rnd(-0.7, 0.7), rnd(3, 5), rnd(1.3, 2), couleur());
  }

  // ---- autour : de grands arbres de parc, qui ferment le jardin
  // (ceux de derrière la terrasse sont posés sur le parc haut, à 5,30 m, le premier sur le talus gazonné ; au-delà
  // du massif d'en face, deux rangs ferment l'horizon qu'on voyait, nu, à travers le grillage)
  const tilleuls = [];
  for (const [x, z, h, s, y] of [[-30, 61, 16, 6.5, 'talus'], [-17, 60.5, 17, 7, YH], [-5, 61.5, 14, 6, YH], [5, 60.5, 13, 5.5, YH],
                                 [-24, 66.5, 15, 6, YH], [-11, 67, 16, 6.5, YH], [1, 66.5, 14, 6, YH],
                                 [-50, 22, 17, 6.5, 5.3], [-52, 34, 19, 7.5, 5.3], [-45, 58, 16, 6.5, 5.3]]) {
    // sur le talus gazonné (y = 'talus'), le pied suit la pente
    const xa = cx(x) + rnd(-1, 1);
    const ya = y === 'talus' ? solTalus(xa) : y;
    const za = z + rnd(-1, 1);
    const spot = K.modelTree(scene, xa, za, h, s, { fat: rnd(0.9, 1.1), y: ya });
    // ce sont des TILLEULS (version légère : ils sont à plus de cinquante mètres du terrain)
    if (spot) tilleuls.push({ x: xa, y: ya - 0.05, z: za, h: h * (0.92 + 0.14 * alea(x, z)), rot: 6.283 * alea(x, z, 1), loin: true, repli: [spot] });
  }
  // deux lots, qu'on ne dessine que s'ils sont dans le champ : ceux qui ferment le jardin, et ceux du parc haut
  // (derrière la terrasse, qu'on voit aussi en regardant le mur de meulière)
  const parcHaut = (t) => t.x < cx(-40);
  planter(scene, 'tilleul', tilleuls.filter((t) => !parcHaut(t)));
  planter(scene, 'tilleul', tilleuls.filter(parcHaut));

  // ---- le feuillage cousu, et les troncs. Sans ombre portée : tout ceci est à plus de 35 m du terrain, hors de la
  // carte d'ombre du soleil (js/court.js : ±28 x ±30 m)
  const matFeu = materiauFeuilles(feuillesFondTex(K.canvasTex), { trans: 0.2, rugosite: 0.85 });
  const feuillage = new THREE.Mesh(coudreTeinte(feu), matFeu);
  feuillage.castShadow = false; feuillage.receiveShadow = false; scene.add(feuillage); declarerFeuillage(scene, feuillage);
  const troncs = new THREE.Mesh(mergeGeometries(bois), new THREE.MeshStandardMaterial({ map: ecorceFondTex(K.canvasTex), vertexColors: true, roughness: 0.95 }));
  troncs.receiveShadow = true; scene.add(troncs);
}

// Le mur de soutènement de la grande terrasse : long de 2 x (zc - zDebut) (24 m avec ZJ = 35 et zDebut = 23 : sur les
// photos de face j3 et j5, il ne tient que les deux tiers de la largeur du jardin), haut de 5,30 - y0 (4,8 m : des
// allées au parc haut). Relevé sur la photo prise de face : calcaire CRÈME en assises réglées ; grandes fenêtres à
// petits carreaux à ±7,5 m (1,05 x 1,70, appui à 2,30 m), petites fenêtres à ±3,4 m au-dessus des volées, oculi à
// ±5 m sous les volées, soupiraux grillés à ±3,8 m au ras des allées, porte grillagée en plein cintre sur le palier,
// portes basses en bois à ±7,5 m, du lierre sur les bouts. Le DOUBLE ESCALIER EST EN X : de chaque bout du chemin de
// ronde une volée descend vers le milieu jusqu'au PALIER de la porte centrale (1,80 m) ; de ce palier, deux volées
// plus courtes, en avant des premières, redescendent vers l'extérieur (±3,4 m). Au-dessus du couronnement, la
// balustrade de fer forgé ; derrière le chemin de ronde, le MUR HAUT et, sur le plateau haut, la haie, les lanternes,
// la statue et le drapeau.
// `zDebut` : le bout du mur côté terrain ; de là au mur de retour (`zRetour`, là où le parc haut s'arrête, un peu
// avant le chemin du haut du talus), un pan de mur plein dont la crête descend sur ses deux derniers mètres (photo
// j6) ; `zTalus` : de l'autre bout du mur jusque-là, un autre pan plein, puis le talus gazonné dont `yPelouse` est le
// pied ; `feu` : l'accumulateur de feuillage du jardin (le lierre des bouts, les buissons du pan qui descend).
function murTerrasse(scene, K, x, zc, y0, XN, zDebut, zRetour, yPelouse, zTalus, feu) {
  const L = 2 * (zc - zDebut), H = 5.3 - y0, P = 1.2;
  const YP = 1.8, LG = 1.3, ZP = 1.0, ZH = 6.5, ZB = 3.4;  // palier ; largeur d'une volée ; bouts du palier, des volées hautes, des volées basses
  // l'appareil : assises réglées de 20 à 30 cm, moellons de 40 cm à 1 m (crème, blanc cassé, beige), grain et taches
  // d'usure — à 42 px par mètre, sur la façade comme sur la tuile des pans
  const assises = (g, w, h) => {
    g.fillStyle = '#e2d8c2'; g.fillRect(0, 0, w, h);
    let yy = 0;
    while (yy < h) {
      const hh = rnd(8, 12); let xx = -rnd(0, 20);
      while (xx < w) {
        const ww = rnd(14, 36), v = rnd(0.92, 1.05), j = rnd(-7, 7);
        g.fillStyle = `rgb(${230 * v + j | 0},${220 * v | 0},${197 * v - j | 0})`; g.fillRect(xx + 1, yy + 1, ww - 1.5, hh - 1.5);
        xx += ww;
      }
      yy += hh;
    }
    for (let i = 0; i < (w * h) / 22; i++) { const v = Math.floor(rnd(150, 235)); g.fillStyle = `rgba(${v},${v * 0.96 | 0},${v * 0.86 | 0},0.12)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    // taches d'usure plus grises ou plus blondes
    for (let i = 0; i < (w * h) / 7500; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(150,140,120,0.10)' : 'rgba(250,240,215,0.14)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, rnd(20, 70), rnd(15, 50), 0, 0, 6.29); g.fill(); }
  };
  const tex = K.canvasTex(1024, 190, (g, w, h) => {
    assises(g, w, h);
    // traînées sous le couronnement, pied sali
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(90,80,60,0.18)'); gr.addColorStop(0.2, 'rgba(90,80,60,0)'); gr.addColorStop(0.82, 'rgba(90,80,60,0)'); gr.addColorStop(1, 'rgba(80,70,50,0.22)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const px = w / L, py = h / H;
    // une baie : `zm` son axe depuis le milieu du mur, `lw` x `lh`, `bas` la hauteur de l'appui ; `sorte` : 'fenetre'
    // (arc surbaissé, petits carreaux blancs), 'grille' (plein cintre, grille de fer), 'bois' (porte de planches),
    // 'soupirail' (arc surbaissé, cinq barreaux d'aplomb)
    const baie = (zm, lw, lh, bas, sorte) => {
      const fx = (L / 2 + zm - lw / 2) * px, fw = lw * px, fh = lh * py, fy = h - (bas + lh) * py;
      const f = sorte === 'grille' ? fw / 2 : fw * 0.16;
      const arc = (e) => { g.beginPath(); g.moveTo(fx - e, fy + fh + e); g.lineTo(fx - e, fy + f); g.quadraticCurveTo(fx + fw / 2, fy - f - 2 * e, fx + fw + e, fy + f); g.lineTo(fx + fw + e, fy + fh + e); g.closePath(); };
      g.fillStyle = '#f1e9d6'; arc(4); g.fill();  // l'encadrement de pierre de taille
      g.fillStyle = sorte === 'bois' ? '#6e5a44' : sorte === 'fenetre' ? '#2e3438' : '#24272a'; arc(0); g.fill();
      g.save(); arc(0); g.clip();
      if (sorte === 'bois') {
        g.strokeStyle = 'rgba(40,30,20,0.6)'; g.lineWidth = 1;
        for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(fx + fw * k / 5, fy); g.lineTo(fx + fw * k / 5, fy + fh); g.stroke(); }
      } else if (sorte === 'soupirail') {
        g.strokeStyle = '#5d6264'; g.lineWidth = 1.6;
        for (let k = 1; k <= 5; k++) { g.beginPath(); g.moveTo(fx + fw * k / 6, fy - f); g.lineTo(fx + fw * k / 6, fy + fh); g.stroke(); }
      } else {
        const nc = sorte === 'grille' ? 4 : 3, nr = sorte === 'grille' ? 7 : Math.max(2, Math.round(lh / 0.3));
        g.strokeStyle = sorte === 'grille' ? '#5d6264' : '#e6e6e0'; g.lineWidth = sorte === 'grille' ? 1.2 : 1.6;
        for (let k = 1; k < nc; k++) { g.beginPath(); g.moveTo(fx + fw * k / nc, fy - f); g.lineTo(fx + fw * k / nc, fy + fh); g.stroke(); }
        for (let k = 1; k < nr; k++) { g.beginPath(); g.moveTo(fx, fy + fh * k / nr); g.lineTo(fx + fw, fy + fh * k / nr); g.stroke(); }
      }
      g.restore();
    };
    for (const s of [-1, 1]) {
      baie(s * 7.5, 1.05, 1.7, 2.3, 'fenetre');  // les grandes fenêtres
      baie(s * 3.4, 0.95, 0.8, 3.25, 'fenetre');  // les petites, au-dessus des volées hautes
      baie(s * 7.5, 0.9, 1.15, 0.05, 'bois');  // les portes basses
      baie(s * 3.8, 0.85, 0.6, 0.3, 'soupirail');  // les soupiraux, au pied des volées basses (photo j3)
    }
    baie(0, 1.0, 2.0, YP, 'grille');  // la porte du palier
    // les oculi, sous les volées hautes
    for (const c of [-5, 5]) {
      g.fillStyle = '#f1e9d6'; g.beginPath(); g.arc((L / 2 + c) * px, h - 3.0 * py, 0.26 * px, 0, 6.29); g.fill();
      g.fillStyle = '#2e3438'; g.beginPath(); g.arc((L / 2 + c) * px, h - 3.0 * py, 0.17 * px, 0, 6.29); g.fill();
    }
  }, null, false, 8);
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  const calc = new THREE.MeshStandardMaterial({ color: 0xe2d8c2, roughness: 0.9 });
  // la même pierre en tuile de 6 m (UV en mètres) : les pans qui prolongent le mur, le mur haut, les paliers
  const appareil = new THREE.MeshStandardMaterial({ map: K.canvasTex(256, 256, assises, [1 / 6, 1 / 6], false, 8), roughness: 0.9 });
  face.userData.surfaceParc = 'gres'; calc.userData.surfaceParc = 'gres'; appareil.userData.surfaceParc = 'gres';
  const bloc = (w, h, d, bx, by, bz) => {
    const m = new THREE.Mesh(uvMetres(new THREE.BoxGeometry(w, h, d), w, h, d), appareil);
    m.position.set(bx, by, bz); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    return m;
  };
  // la face regarde +x (vers le quai) : BoxGeometry range +X en premier
  const mur = new THREE.Mesh(new THREE.BoxGeometry(P, H, L), [face, calc, calc, calc, calc, calc]);
  mur.position.set(x - P / 2, y0 + H / 2, zc); mur.castShadow = true; mur.receiveShadow = true; scene.add(mur);
  // retours d'angle et couronnement
  K.box(P + 0.2, 0.18, L + 0.2, new THREE.MeshStandardMaterial({ color: 0xebe3d0, roughness: 0.85 }), x - P / 2, y0 + H + 0.09, zc, scene);
  // la terrasse haute, derrière : le parc haut, au niveau de celui qui est derrière le mur de meulière
  // (murMeuliere s'arrête à zRetour, la terrasse prend le relais au-delà)
  const zH0 = zRetour, zH1 = zTalus + 25;
  const haut = new THREE.Mesh(new THREE.PlaneGeometry(90, zH1 - zH0), new THREE.MeshStandardMaterial({ map: gazonJardin(K.canvasTex), color: 0xc8d0b8, roughness: 1 }));
  haut.material.map.repeat.set(24, 16); haut.material.userData.surfaceParc = 'herbe';
  haut.rotation.x = -Math.PI / 2; haut.position.set(x - P - 45, y0 + H - 0.02, (zH0 + zH1) / 2); haut.receiveShadow = true; scene.add(haut);
  // LE RETOUR du mur : entre la terrasse et le mur de meulière, le parc haut s'arrête sur un mur de pierre
  // tourné vers le jardin, dont la crête suit le talus de meulière (2,35 m au mur, 5,30 m à la terrasse).
  // Profil tracé dans le plan (x, y), extrudé sur 0,6 m le long de z.
  // (PHOTOS DU 28/09 : l'allée rouge longe le dos du mur de meulière et rejoint ici le chemin du jardin — voir
  // abordsMur. Le retour ne part donc plus du dos du mur mais du bord de l'allée, et sa crête suit le talus qui la
  // borde, solDerriereMur, au lieu de la crête d'avant, 2,35 m + 0,25 par mètre)
  const DXj = XN + PLATEAU.mur, xm = XN - 0.45 - ABORDS.LA, pr = new THREE.Shape();
  // (le profil part de la crête du talus du mur, 12 m derrière son dos, là où commence le parc haut de
  // murMeuliere : arrêté au dos du mur à baies (x - P), il laissait sous le bord du parc haut de la terrasse une
  // fente triangulaire de 0,95 m sur 0,24 m, vue du plateau par-dessus le mur)
  const xh = Math.min(XN - 0.45 - 12, x - P);
  pr.moveTo(xh, 0); pr.lineTo(xm, 0);
  for (let xx = xm; xx > x + 1e-6; xx -= 0.5) pr.lineTo(xx, solDerriereMur(xx - DXj, zRetour) + 0.02);
  pr.lineTo(x, solDerriereMur(x - DXj, zRetour) + 0.02); pr.lineTo(x - P, y0 + H); pr.lineTo(xh, y0 + H); pr.closePath();
  // (en assises, comme les pans : vu du jardin, sa face de 10 m qui descend vers le chemin était un aplat crème)
  const ret = new THREE.Mesh(new THREE.ExtrudeGeometry(pr, { depth: 0.6, bevelEnabled: false }), appareil);
  ret.position.z = zRetour - 0.6; ret.castShadow = true; ret.receiveShadow = true; scene.add(ret);
  // LES DEUX PANS PLEINS qui prolongent le mur, de la même pierre. Côté terrain, entre le retour et le bout du mur,
  // au-dessus du chemin : sa crête descend de 5,30 à 2,50 m sur ses deux derniers mètres (photo j6 : le bout du mur
  // plonge vers le chemin, sous les buissons). Profil tracé dans le plan (z, y), extrudé de x à x - P.
  const pan = new THREE.Shape();
  pan.moveTo(zRetour, 0); pan.lineTo(zDebut, 0); pan.lineTo(zDebut, y0 + H); pan.lineTo(zRetour + 2, y0 + H); pan.lineTo(zRetour, 2.5); pan.closePath();
  const geoPan = new THREE.ExtrudeGeometry(pan, { depth: P, bevelEnabled: false });
  geoPan.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0)));
  geoPan.translate(x, 0, 0);
  const panM = new THREE.Mesh(geoPan, appareil); panM.castShadow = true; panM.receiveShadow = true; scene.add(panM);
  // derrière le creux, le parc haut descend en pente gazonnée jusqu'à la crête (un triangle : ailleurs, le plan du
  // parc haut le couvre), et trois buissons sombres débordent au-dessus
  const gazon = new THREE.MeshStandardMaterial({ map: gazonJardin(K.canvasTex), roughness: 1 });
  gazon.map.repeat.set(0.28, 0.28); gazon.userData.surfaceParc = 'herbe';   // (UV en mètres : une tuile de 3,6 m)
  const creux = new THREE.BufferGeometry();
  creux.setAttribute('position', new THREE.Float32BufferAttribute([x - P, 2.5, zRetour, x - P - 3, y0 + H - 0.02, zRetour, x - P, y0 + H, zRetour + 2], 3));
  creux.setAttribute('uv', new THREE.Float32BufferAttribute([zRetour, x - P, zRetour, x - P - 3, zRetour + 2, x - P], 2));
  creux.computeVertexNormals();
  const creuxM = new THREE.Mesh(creux, gazon); creuxM.receiveShadow = true; scene.add(creuxM);
  const SOMBRE = paletteFond([[0x3a4a34, 3], [0x33422f, 2], [0x45553b, 2]]);
  for (const [dx, dz, yb, hb, rb] of [[0.9, 0.5, 3.4, 2.4, 1.1], [2.3, 1.1, 4.4, 2.6, 1.3], [1.2, 2.3, 5.0, 2.2, 1.2]]) {
    arbusteFond(feu, x - P - dx, yb, zRetour + dz, hb, rb, SOMBRE, x - 0.05);
  }
  // de l'autre côté, du bout du mur au talus gazonné (la pelouse d'en face bute contre lui)
  bloc(P, y0 + H + 0.1, zTalus - zc - L / 2, x - P / 2, (y0 + H - 0.1) / 2, (zc + L / 2 + zTalus) / 2);
  // au-delà de la pelouse d'en face, le parc haut descend au jardin par un TALUS gazonné (photo prise de face : à côté du
  // mur, la pelouse monte jusqu'au parc haut) et non par un mur nu de 3,80 m ; `yPelouse` : le plat de la pelouse
  const tl = new THREE.Shape();
  tl.moveTo(-P, yPelouse - 0.02); tl.lineTo(5, yPelouse - 0.02); tl.lineTo(-P, y0 + H); tl.closePath();
  const geoL = new THREE.ExtrudeGeometry(tl, { depth: 24, bevelEnabled: false });
  geoL.translate(x, 0, zTalus);
  const talusG = new THREE.Mesh(geoL, gazon); talusG.receiveShadow = true; scene.add(talusG);
  // LE DOUBLE ESCALIER EN X : chaque volée est un seul maillage (marches et limon extrudés sur sa largeur) ; les
  // volées hautes contre le mur, les basses devant elles ; rampes et balustrade sont des panneaux de fer forgé
  const marche = new THREE.MeshStandardMaterial({ color: 0xd6cdb8, roughness: 0.9 });
  const forge = new THREE.MeshStandardMaterial({ map: ferForge(K.canvasTex), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.55 });  // pas de métal : sous l'éclairage d'ambiance, des franges rouges
  const yP = y0 + YP, yH = y0 + H;
  for (const s of [-1, 1]) {
    scene.add(volee(marche, x, LG, zc + s * ZP, yP, zc + s * ZH, yH, y0, 18));  // volée haute
    scene.add(volee(marche, x + LG, LG, zc + s * ZB, y0, zc + s * ZP, yP, y0, 11));  // volée basse
    K.box(LG, 0.3, 1.2, marche, x + LG / 2, yH - 0.15, zc + s * (ZH + 0.6), scene);  // palier d'arrivée en haut
    scene.add(rampe(forge, x + LG, zc + s * ZP, yP, zc + s * ZH, yH, 0.9));
    scene.add(rampe(forge, x + LG, zc + s * ZH, yH, zc + s * (ZH + 1.2), yH, 0.9));
    scene.add(rampe(forge, x + 2 * LG, zc + s * ZP, yP, zc + s * ZB, y0, 0.9));
  }
  K.box(2 * LG, YP, 2 * ZP, marche, x + LG, y0 + YP / 2, zc, scene);  // le palier, massif
  scene.add(rampe(forge, x + 2 * LG, zc - ZP, yP, zc + ZP, yP, 0.9));
  // la balustrade du couronnement, ouverte là où arrivent les volées
  for (const [za, zb] of [[-L / 2 + 0.1, -ZH - 1.2], [-ZH, ZH], [ZH + 1.2, L / 2 - 0.1]]) scene.add(rampe(forge, x - 0.1, zc + za, yH + 0.13, zc + zb, yH + 0.13, 0.95));
  // LE LIERRE DES BOUTS (photos j3, j5, j6) : sur les 3,8 derniers mètres de chaque bout de la façade, des PLAQUES de
  // feuilles vert sombre plaquées sur la pierre — un tiers de la surface environ —, plus serrées vers le bout et sous
  // le couronnement, d'où il retombe en coulées. Chaque plaque est un paquet de cartes de 0,3 à 0,5 m qui se
  // recouvrent (des cartes semées une à une faisaient des pois sur le mur).
  const LIERRE = paletteFond([[0x3b5a2c, 3], [0x4d6b35, 2]]);
  for (const s of [-1, 1]) {
    for (let p = 0; p < (LEGER ? 4 : 6); p++) {
      // les deux premières courent sous le couronnement ; les autres, n'importe où, plutôt vers le bout et en haut
      const haut = p < 2;
      const pz = L / 2 - 0.35 - (haut ? rnd(0.3, 2.6) : 3.1 * Math.pow(Math.random(), 1.4));
      const py = haut ? y0 + H - rnd(0.25, 0.45) : y0 + 0.5 + (H - 1.1) * (1 - Math.pow(Math.random(), 1.8));
      const rz = haut ? rnd(0.9, 1.4) : rnd(0.4, 0.8), ry = haut ? rnd(0.25, 0.4) : rnd(0.35, 0.7);
      const nc = Math.round(rz * ry * Math.PI * (LEGER ? 10 : 16));
      for (let i = 0; i < nc; i++) {
        const a = Math.random() * 6.283, r = Math.sqrt(Math.random());
        const dz = Math.min(L / 2 - 0.15, pz + Math.cos(a) * r * rz), yy = Math.min(y0 + H - 0.12, py + Math.sin(a) * r * ry);
        const t = rnd(0.3, 0.5), zz = zc + s * dz;
        carteFond(feu, x + rnd(0.02, 0.08), yy, zz, rnd(-0.2, 0.2), Math.PI / 2, Math.random() * 6.283, t, t * rnd(0.9, 1.2),
          { c: [x - 1.5, yy, zz], r: 1.6, t: rnd(0.85, 1.05) }, LIERRE());
      }
    }
  }

  // ---- LE HAUT DE LA TERRASSE (photos j3, j5, j6, 1000051600, 1000051342). Derrière le chemin de ronde, pas un talus
  // fleuri : un MUR HAUT de 1,20 m, de la même pierre, couronné d'une grille, sa plaque au milieu ; on le franchit par
  // deux volées de huit marches, aux bouts, qui montent vers l'extérieur. Dessus, le plateau haut : une bordure de
  // fleurs orange et jaunes au pied d'une HAIE TAILLÉE vert sombre de 1,60 m (face d'aplomb, dessus arrondi), les
  // lanternes devant elle, la statue blanche et le drapeau derrière. Vu du terrain, par-dessus le mur de meulière,
  // c'est cette haie sombre qu'on voit, et plus un talus orange.
  const yM = yH + 1.2;                             // le plateau haut
  const xM = x - P - 1.0;                          // la face du mur haut (le chemin de ronde : 1 m, plus le couronnement)
  const zV = L / 2 - 4, zA = L / 2 - 1, zF = L / 2 - 0.7;   // depuis zc : pied et arrivée des volées, bout du plateau
  // le mur haut (0,6 m) et le terre-plein qu'il retient sous la bordure et la haie, entre les deux volées : un bloc de 2 m
  bloc(2.0, yM - yH + 0.02, 2 * zV, xM - 1.0, (yH - 0.02 + yM) / 2, zc);
  // derrière, le plateau haut sur toute la longueur ; son dessus gazonné, et sa pente qui redescend au parc haut
  bloc(2.2, yM - yH + 0.02, 2 * zF, xM - 3.1, (yH - 0.02 + yM) / 2, zc);
  const uvM = (g, w, l) => { const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w, uv.getY(k) * l); return g; };
  const dessus = new THREE.Mesh(uvM(new THREE.PlaneGeometry(2.2, 2 * zF), 2.2, 2 * zF).rotateX(-Math.PI / 2).translate(xM - 3.1, yM + 0.005, zc), gazon);
  dessus.receiveShadow = true; scene.add(dessus);
  const lp = Math.hypot(1.5, yM - yH + 0.3);
  const penteH = new THREE.Mesh(uvM(new THREE.PlaneGeometry(lp, 2 * zF), lp, 2 * zF).rotateX(-Math.PI / 2).rotateZ(Math.atan2(yM - yH + 0.3, 1.5))
    .translate(xM - 4.95, (yM + yH - 0.3) / 2, zc), gazon);
  penteH.receiveShadow = true; scene.add(penteH);
  for (const s of [-1, 1]) {
    // les deux bouts de la pente (le profil est tracé à l'envers pour le bout z-, puis retourné : il regarde vers z-)
    const bout = new THREE.Shape();
    bout.moveTo(s * (xM - 4.2), yH - 0.3); bout.lineTo(s * (xM - 4.2), yM); bout.lineTo(s * (xM - 5.7), yH - 0.3); bout.closePath();
    const gb = new THREE.ShapeGeometry(bout);
    if (s < 0) gb.rotateY(Math.PI);
    const mb = new THREE.Mesh(gb.translate(0, 0, zc + s * zF), appareil); mb.receiveShadow = true; scene.add(mb);
    // LES VOLÉES D'EXTRÉMITÉ : du chemin de ronde au plateau haut, huit marches de 15 cm qui montent vers le bout du
    // mur ; un palier en haut, la rampe du côté du vide (le chemin de ronde)
    scene.add(volee(marche, xM - 2.0, 2.0, zc + s * zV, yH, zc + s * zA, yM, yH, 8));
    bloc(2.0, yM - yH + 0.02, zF - zA, xM - 1.0, (yH - 0.02 + yM) / 2, zc + s * (zA + zF) / 2);
    scene.add(rampe(forge, xM + 0.02, zc + s * zV, yH, zc + s * zA, yM, 0.9));
    scene.add(rampe(forge, xM + 0.02, zc + s * zA, yM, zc + s * zF, yM, 0.9));
  }
  // la grille du mur haut, ouverte à l'arrivée des volées
  scene.add(rampe(forge, xM - 0.05, zc - zV, yM, zc + zV, yM, 0.9));
  // sa plaque, au milieu : un cadre de pierre blanche et une plaque de bronze
  K.box(0.05, 0.8, 0.7, new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.8 }), xM + 0.025, yH + 0.75, zc, scene);
  K.box(0.03, 0.5, 0.4, new THREE.MeshStandardMaterial({ color: 0x7a3a28, roughness: 0.5, metalness: 0.3 }), xM + 0.065, yH + 0.75, zc, scene);
  // la bordure de fleurs (0,5 x 0,3 m, en bourrelet) et la haie taillée (1,0 x 1,6 m, face d'aplomb, dessus arrondi de
  // 0,4 m de rayon), extrudées sur la longueur du mur haut (UV en mètres)
  const lh = 2 * zV - 0.3;
  const bord = new THREE.Shape();
  bord.moveTo(0, 0); bord.lineTo(0.5, 0); bord.lineTo(0.5, 0.18); bord.quadraticCurveTo(0.25, 0.4, 0, 0.18); bord.closePath();
  const matB = new THREE.MeshStandardMaterial({ map: massifFleurs(K.canvasTex, true), roughness: 0.95 });
  const mB = new THREE.Mesh(new THREE.ExtrudeGeometry(bord, { depth: lh, bevelEnabled: false, curveSegments: 4 }).translate(xM - 1.1, yM - 0.02, zc - lh / 2), matB);
  mB.receiveShadow = true; scene.add(mB);
  const hp = new THREE.Shape();
  hp.moveTo(0, 0); hp.lineTo(1.0, 0); hp.lineTo(1.0, 1.2); hp.absarc(0.6, 1.2, 0.4, 0, Math.PI / 2, false);
  hp.lineTo(0.4, 1.6); hp.absarc(0.4, 1.2, 0.4, Math.PI / 2, Math.PI, false); hp.closePath();
  const haie = new THREE.MeshStandardMaterial({ map: feuillageIf(K.canvasTex, true, true), roughness: 0.95 });
  const mH = new THREE.Mesh(new THREE.ExtrudeGeometry(hp, { depth: lh, bevelEnabled: false, curveSegments: 5 }).translate(xM - 2.1, yM - 0.02, zc - lh / 2), haie);
  mH.castShadow = true; mH.receiveShadow = true; scene.add(mH);
  // les lanternes dans la bordure, devant la haie ; le mât du drapeau et la statue derrière elle
  for (const dz of [-2.4, 2.4, -7.2, 7.2]) lanterne(scene, K, xM - 0.85, zc + dz, yM - 0.02);
  // (parc entier, drapeau D8 levé : le drapeau n'est plus posé ici, il flotte sur le vrai belvédère, zone Z06 —
  // js/parc/zones/z06_axe_chateau.js ; ce jardin supposé n'y est d'ailleurs pas construit, voir buildParc)
  if (Monde.plat) drapeau(scene, K, xM - 2.6, zc - 1.2, yM - 0.02);
  // LA STATUE BLANCHE (photo j5, près du drapeau) : un piédestal, et une figure debout d'1,80 m, tournée d'un bloc
  const piedestal = K.box(0.6, 1.0, 0.6, new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.85 }), xM - 2.9, yM + 0.48, zc - 2.4, scene);
  piedestal.castShadow = true;
  const silhouette = [[0, 0], [0.2, 0], [0.22, 0.08], [0.2, 0.45], [0.17, 0.85], [0.19, 1.1], [0.22, 1.3], [0.21, 1.42], [0.11, 1.48],
    [0.07, 1.53], [0.1, 1.58], [0.11, 1.68], [0.08, 1.76], [0.03, 1.8], [0, 1.8]].map(([r, y]) => new THREE.Vector2(r, y));
  const figure = new THREE.Mesh(new THREE.LatheGeometry(silhouette, 12), new THREE.MeshStandardMaterial({ color: 0xece8de, roughness: 0.8 }));
  figure.position.set(xM - 2.9, yM + 0.98, zc - 2.4); figure.castShadow = true; scene.add(figure);
  // EN BAS : les lanternes basses au pied des volées, les haies taillées en rampant devant le palier, deux boules
  // de buis aux bouts du mur, et deux bancs verts adossés sous les volées hautes
  for (const s of [-1, 1]) lanterne(scene, K, x + 2 * LG + 0.45, zc + s * (ZB + 0.45), y0, 1.1);
  const buis = new THREE.MeshStandardMaterial({ map: feuillageIf(K.canvasTex, true), roughness: 0.95 });
  const hs = new THREE.Shape();
  hs.moveTo(0, 0); hs.lineTo(2.6, 0); hs.lineTo(2.6, 0.85); hs.lineTo(0, 1.5); hs.closePath();
  for (const s of [-1, 1]) {
    const gh = new THREE.ExtrudeGeometry(hs, { depth: 0.9, bevelEnabled: false });
    gh.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, s), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-s, 0, 0)));
    gh.translate(s > 0 ? x + 2 * LG + 1.0 : x + 2 * LG + 0.1, y0, zc + s * 0.2);
    const hm = new THREE.Mesh(gh, buis); hm.castShadow = true; hm.receiveShadow = true; scene.add(hm);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), buis);
    b.scale.set(1, 0.85, 1); b.position.set(x + 0.9, y0 + 0.6, zc + s * 9.6); b.castShadow = true; scene.add(b);
    banc(scene, K, x + 0.42, zc + s * 5.4, Math.PI / 2, C.vertBanc, 1.9, { y: y0 });
  }
}

// Une volée de marches d'un seul tenant, adossée entre `xa` et `xa + larg` : `(zA, yA)` son bas, `(zB, yB)` son haut,
// `n` marches ; dessous, un limon de 35 cm parallèle aux nez de marches, arrêté au sol `ySol`.
function volee(mat, xa, larg, zA, yA, zB, yB, ySol, n) {
  const run = Math.abs(zB - zA), d = run / n, h = (yB - yA) / n, ep = 0.35, pente = (yB - yA) / run;
  const s = new THREE.Shape();
  s.moveTo(0, yA);
  for (let i = 0; i < n; i++) { s.lineTo(i * d, yA + (i + 1) * h); s.lineTo((i + 1) * d, yA + (i + 1) * h); }
  s.lineTo(run, yB - ep);
  if (yA - ep >= ySol) s.lineTo(0, yA - ep);
  else { s.lineTo((ySol - yA + ep) / pente, ySol); s.lineTo(0, ySol); }
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: larg, bevelEnabled: false });
  // profil : x du dessin -> z du monde (dans le sens de la montée), y -> y, épaisseur -> x
  const dz = Math.sign(zB - zA);
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, dz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-dz, 0, 0)));
  geo.translate(dz > 0 ? xa + larg : xa, 0, zA);
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}

// Un panneau de fer forgé tendu de (zA, yA) à (zB, yB) dans le plan x = `xr`, haut de `hh` : les montants restent
// d'aplomb, la main courante suit la pente (une travée de la texture = 1,30 m).
function rampe(mat, xr, zA, yA, zB, yB, hh) {
  const n = Math.hypot(zB - zA, yB - yA) / 1.3, geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([xr, yA + 0.05, zA, xr, yB + 0.05, zB, xr, yB + 0.05 + hh, zB, xr, yA + 0.05 + hh, zA], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, n, 0, n, 1, 0, 1], 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

// Une lanterne parisienne sur son fût de fonte noire (photos j1, j3, j5) : lanterne hexagonale évasée vers le haut,
// SIX MONTANTS noirs aux arêtes d'un verre dépoli blanc (sans émission : c'est le jour), une bague au pied, un chapeau
// à six pans et son épi ; un socle au pied du fût. `hf` : hauteur du fût (1,1 m pour les bornes du bas des
// escaliers). Deux maillages : la fonte (toutes ses pièces cousues) et le verre.
function lanterne(scene, K, x, z, y0, hf = 3.2) {
  const Y = y0 + hf, fonte = [];
  fonte.push(new THREE.CylinderGeometry(0.05, hf > 2 ? 0.09 : 0.11, hf, 8).translate(x, y0 + hf / 2, z));   // le fût
  fonte.push(new THREE.CylinderGeometry(0.13, 0.16, 0.5, 10).translate(x, y0 + 0.25, z));                 // son socle
  fonte.push(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 12).translate(x, Y + 0.03, z));                 // la bague
  // les montants suivent les arêtes du verre, qui s'évase de 0,135 à 0,235 m de rayon sur 0,56 m
  const incl = Math.atan2(0.1, 0.56);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    fonte.push(new THREE.BoxGeometry(0.025, 0.56, 0.025).rotateX(incl).rotateY(a).translate(x + Math.sin(a) * 0.19, Y + 0.34, z + Math.cos(a) * 0.19));
  }
  fonte.push(new THREE.ConeGeometry(0.3, 0.28, 6).translate(x, Y + 0.76, z));                            // le chapeau
  fonte.push(new THREE.SphereGeometry(0.05, 8, 6).translate(x, Y + 0.93, z));                              // l'épi
  const mf = new THREE.Mesh(mergeGeometries(fonte), new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.45, metalness: 0.5 }));
  mf.castShadow = true; scene.add(mf);
  const verre = new THREE.Mesh(new THREE.CylinderGeometry(0.232, 0.132, 0.56, 6).translate(x, Y + 0.34, z),
    new THREE.MeshStandardMaterial({ color: 0xd9d8d0, roughness: 0.35 }));
  scene.add(verre);
}

// Un escalier de pierre qui monte de l'allée à la pelouse (photos j4, j1, j3, j6) : DOUZE marches grises (#9d9a92) au
// nez souligné d'un liseré clair, entre deux MURETS BAS de rocaille (18 cm, moellons sombres) qui suivent la pente.
// `sens` : -1 = la pelouse est vers z- (on monte vers z-), +1 vers z+ ; `L` : la longueur de la pente ; `mats` :
// { marche, nez, muret }, partagés par les deux escaliers. Trois maillages.
function escalierPelouse(scene, K, x, zBas, sens, y0, y1, L, mats) {
  const n = 12, larg = 3.2, h = (y1 - y0) / n, d = L / n;
  const marches = [], nez = [], murets = [];
  for (let i = 0; i < n; i++) {
    const yh = y0 + h * (i + 1);
    marches.push(new THREE.BoxGeometry(larg, yh - y0 + 0.02, d).translate(x, (yh + y0 - 0.02) / 2, zBas + sens * (i + 0.5) * d));
    // (6 cm de pierre claire, qui dépassent d'un centimètre sur la contremarche et sur le dessus)
    nez.push(new THREE.BoxGeometry(larg - 0.02, 0.03, 0.06).translate(x, yh - 0.005, zBas + sens * (i * d + 0.02)));
  }
  const lp = Math.hypot(L, y1 - y0);
  for (const s of [-1, 1]) {
    // (centré 9 cm au-dessus de la pente : il en sort de 18 cm)
    const g = uvMetres(new THREE.BoxGeometry(0.4, 0.18, lp + 0.1), 0.4, 0.18, lp + 0.1, 1, true);
    g.rotateX(-sens * Math.atan2(y1 - y0, L)).translate(x + s * (larg / 2 + 0.2), (y0 + y1) / 2 + 0.09, zBas + sens * L / 2);
    murets.push(g);
  }
  for (const [geos, mat] of [[marches, mats.marche], [nez, mats.nez], [murets, mats.muret]]) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  }
}

// Des UV en MÈTRES sur une BoxGeometry (w, h, d) : chaque face reçoit ses dimensions réelles divisées par `tuile`, une
// texture répétée y garde partout sa taille (les faces d'une boîte ont sinon toutes des UV de 0 à 1). `long` : sur le
// dessus et le dessous, la texture est tournée d'un quart pour courir le long de z (un muret, une haie).
function uvMetres(g, w, h, d, tuile = 1, long = false) {
  const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let k = 0; k < uv.count; k++) {
    const f = Math.floor(k / 4), u = uv.getX(k), v = uv.getY(k);
    if (long && (f === 2 || f === 3)) uv.setXY(k, (v * d) / tuile, (u * w) / tuile);
    else uv.setXY(k, (u * dims[f][0]) / tuile, (v * dims[f][1]) / tuile);
  }
  return g;
}

// La grille du quai (photos j4 et j1) : barreaux ronds de 2 cm tous les 12 cm, à pointe, entre une lisse haute et une
// lisse basse, noirs (#15161a). Une tuile par barreau (32 x 256 px pour 0,12 x 1,10 m), répétée le long de la grille.
function grilleQuaiTex(canvasTex) {
  const cuite = texCuite(grilleQuaiTex, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(32, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#15161a';
    g.fillRect(0, 18, w, 8);                       // la lisse haute, 8 cm sous les pointes
    g.fillRect(0, h - 14, w, 8);                   // la lisse basse
    g.fillRect(w / 2 - 3, 8, 6, h - 8);            // le barreau
    g.beginPath(); g.moveTo(w / 2 - 4, 10); g.lineTo(w / 2, 0); g.lineTo(w / 2 + 4, 10); g.closePath(); g.fill();   // sa pointe
  }, [1, 1], true, 4);
}

// Les touffes de GRAMINÉES du lit de l'ancien bassin (photo j4) : deux cartes croisées par touffe, Ø 0,35 à 0,5 m, 0,4 m
// de haut, vert #6f8a3a, cousues en UN maillage au matériau du feuillage (sans lui, la passe d'occlusion dessinait des
// carrés pleins). Normales tournées vers le ciel : une touffe s'éclaire comme le gazon qui l'entoure, pas comme deux
// plans dont l'un tourne le dos au soleil. `pieds` : [[x, z], ...] ; `y0` : le sol.
function graminees(scene, K, pieds, y0) {
  if (!pieds.length) return;
  const cartes = [];
  for (const [x, z] of pieds) {
    const d = rnd(0.35, 0.5), h = rnd(0.36, 0.44), a = Math.random() * Math.PI;
    for (const b of [a, a + Math.PI / 2]) cartes.push(new THREE.PlaneGeometry(d, h).translate(0, h / 2 - 0.02, 0).rotateY(b).translate(x, y0, z));
  }
  const geo = mergeGeometries(cartes), n = geo.attributes.normal, col = new Float32Array(n.count * 3);
  for (let k = 0; k < n.count; k += 8) {                 // (huit sommets par touffe : une teinte par touffe)
    const v = rnd(0.85, 1.1), j = rnd(0.95, 1.08);
    for (let i = k; i < k + 8; i++) { n.setXYZ(i, 0, 1, 0); col[i * 3] = v * j; col[i * 3 + 1] = v; col[i * 3 + 2] = v * 0.95; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, materiauFeuilles(gramineesTex(K.canvasTex), { trans: 0.25, rugosite: 0.9, alpha: 0.45 }));
  m.castShadow = false; m.receiveShadow = false; scene.add(m); declarerFeuillage(scene, m);
}
// (relecture du lot L8 : saignée elle aussi — ses brins de 1,5 à 3 px, cernés de noir, s'assombrissaient de 12 % au
// niveau de mip 2 et de 20 % au niveau 3 ; après, moins de 1 % à tous les niveaux)
function gramineesTex(canvasTex) {
  const cuite = texCuite(gramineesTex, arguments, [saigner]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const x0 = w / 2 + rnd(-10, 10), a = rnd(-0.85, 0.85), L = rnd(0.55, 0.98) * h;
      const v = rnd(0.75, 1.2), paille = Math.random() < 0.12;
      g.strokeStyle = paille ? `rgba(${170 * v | 0},${158 * v | 0},${98 * v | 0},0.95)` : `rgba(${111 * v | 0},${138 * v | 0},${58 * v | 0},0.95)`;
      g.lineWidth = rnd(1.5, 3);
      g.beginPath(); g.moveTo(x0, h); g.quadraticCurveTo(x0 + Math.sin(a) * L * 0.25, h - L * 0.6, x0 + Math.sin(a) * L, h - Math.cos(a) * L); g.stroke();
    }
    saigner(g);                                                  // (la couleur sous l'alpha nul, voir saigner)
  }, [1, 1], true, 4);
}

// L'enrobé des allées du jardin : un rouge ROSÉ et poudreux (#a9766e ; mesuré sur les photos : 150-190 / 113-145 /
// 108-140), pas un rouge brique, avec son grain. La tuile fait 3 m : un joint clair de 3 cm à son bord, le trait de
// pavés sciés qui recoupe les allées tous les 3 m (photo j4).
function allees(canvasTex) {
  const cuite = texCuite(allees, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#a9766e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16000; i++) {
      const v = rnd(0.8, 1.15);
      g.fillStyle = `rgba(${169 * v | 0},${118 * v | 0},${110 * v | 0},${rnd(0.2, 0.6)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 2.5), rnd(1, 2.5));
    }
    g.fillStyle = 'rgba(214,204,194,0.85)'; g.fillRect(0, 0, 3, h);
  }, [1, 1], false, 8);
}

// Le gazon tondu du jardin : plus frais que la pelouse du parc, mais pas fluo (photos : 65-90 / 95-107 / 41-56).
function gazonJardin(canvasTex) {
  const cuite = texCuite(gazonJardin, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5f7d3c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14000; i++) {
      const v = Math.random();
      g.fillStyle = v < 0.5 ? `rgba(${rnd(70, 95) | 0},${rnd(105, 130) | 0},${rnd(45, 62) | 0},0.5)` : `rgba(${rnd(95, 120) | 0},${rnd(125, 148) | 0},${rnd(58, 74) | 0},0.4)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1, rnd(2, 5));
    }
  }, [1, 1], false, 8);
}

// Un massif de fleurs : terre, feuillage vert et fleurs plantées PAR TACHES, aux bouts arrondis et cerné d'un liseré
// de buis. `sorte` : false, le long massif du bout du jardin (tuile 4:1, sept couleurs) ; 'court', ceux des escaliers
// (2 x 3,6 m, le grand axe en v : jaune, orange, blanc, rouge, violet — photos j1, j4, j6) ; true ('terrasse'), la
// bordure du plateau haut, au pied de la haie (photo j5 : orange et jaune, serrée), en tuile répétée d'un mètre.
function massifFleurs(canvasTex, sorte = false) {
  const cuite = texCuite(massifFleurs, arguments, [], [sorte]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  const terrasse = sorte === true || sorte === 'terrasse', court = sorte === 'court';
  const W = terrasse || court ? 256 : 512, Hc = terrasse ? 256 : court ? 460 : 128, R = court ? 118 : 56;
  // rectangle à coins arrondis, tracé à la main (ctx.roundRect manque aux Safari d'avant la 16)
  const arrondi = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  return canvasTex(W, Hc, (g, w, h) => {
    if (!terrasse) { g.clearRect(0, 0, w, h); g.save(); arrondi(g, 3, 3, w - 6, h - 6, R); g.clip(); }
    g.fillStyle = terrasse ? '#3e4a2a' : '#4a3b2c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < (terrasse ? 900 : court ? 1100 : 1300); i++) {
      g.fillStyle = `rgb(${rnd(40, 70) | 0},${rnd(80, 120) | 0},${rnd(40, 55) | 0})`;
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, rnd(2, 5), rnd(2, 4), Math.random() * 3, 0, 6.29); g.fill();
    }
    if (terrasse) {
      const cols = ['#e08a30', '#f2c318', '#e08a30', '#f2c318', '#d97a26', '#f4d040'];
      for (let i = 0; i < 1100; i++) { g.fillStyle = cols[Math.floor(Math.random() * cols.length)]; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, rnd(2, 4.5), 0, 6.29); g.fill(); }
      return;
    }
    const cols = court ? ['#f2c318', '#f08a1c', '#ece8f0', '#c8243a', '#7a4ab0'] : ['#f2c318', '#f08a1c', '#c8243a', '#7a4ab0', '#f6e27a', '#ece8f0', '#e0433a'];
    const n = court ? 10 : 14;
    for (let k = 0; k < n; k++) {
      // (le long massif : les taches en file ; les courts : en deux files décalées le long du grand axe)
      const c = cols[k % cols.length], R2 = court ? rnd(36, 50) : rnd(26, 44);
      const x0 = court ? (k % 2 ? 0.68 : 0.32) * w + rnd(-10, 10) : (k + rnd(0.1, 0.9)) * w / 14;
      const y0 = court ? ((k + 0.5) / n) * h + rnd(-10, 10) : rnd(0.25, 0.75) * h;
      g.fillStyle = c;
      for (let i = 0; i < 150; i++) {
        const a = Math.random() * 6.28, r = R2 * Math.sqrt(Math.random());
        g.beginPath(); g.arc(x0 + Math.cos(a) * r * (court ? 1 : 1.3), y0 + Math.sin(a) * r * (court ? 1.3 : 1), rnd(1.8, 3.6), 0, 6.29); g.fill();
      }
    }
    g.restore();
    g.lineWidth = 7; g.strokeStyle = '#3c5a2b'; arrondi(g, 6.5, 6.5, w - 13, h - 13, R - 4); g.stroke();
  }, [1, 1], !terrasse, 8);
}

// If taillé : aiguilles vert sombre très serrées, quelques pousses plus claires. `clair` : le buis et le troène
// taillés (haies basses, boules), d'un vert plus franc (photo du mur : 72 / 92 / 32 au soleil). `haie` : la haie du
// plateau haut de la terrasse (photo j5), vert sombre et grisé (#4a5a3a), piquée de 5 à 10 % de jeunes pousses bronze
// (#8a3a2a), par petites grappes.
function feuillageIf(canvasTex, clair = false, haie = false) {
  const cuite = texCuite(feuillageIf, arguments, [], [clair, haie]); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(128, 128, (g, w, h) => {
    const [r0, g0, b0] = haie ? [74, 90, 58] : clair ? [74, 108, 50] : [46, 80, 44];
    g.fillStyle = haie ? '#4a5a3a' : clair ? '#4a6a36' : '#2f4a2c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) {
      const v = rnd(0.8, 1.4);
      g.fillStyle = `rgba(${r0 * v | 0},${g0 * v | 0},${b0 * v | 0},0.8)`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 2), rnd(2, 4));
    }
    for (let i = 0; i < 260; i++) { g.fillStyle = haie ? 'rgba(112,130,84,0.5)' : 'rgba(120,150,80,0.55)'; g.fillRect(Math.random() * w, Math.random() * h, 1, rnd(1, 3)); }
    if (haie) {
      for (let i = 0; i < 70; i++) {
        const x0 = Math.random() * w, y0 = Math.random() * h, v = rnd(0.85, 1.15);
        g.fillStyle = `rgba(${138 * v | 0},${58 * v | 0},${42 * v | 0},0.85)`;
        for (let k = 0; k < 6; k++) g.fillRect(x0 + rnd(-3, 3), y0 + rnd(-3, 3), rnd(1, 2), rnd(2, 4));
      }
    }
  }, [2, 2], false, 4);
}

// Fer forgé de balustrade (photos du mur et de la terrasse) : main courante et lisse basse, un montant par travée
// de 1,30 m, et dans chaque travée quatre volutes adossées autour d'un médaillon ovale, entre deux paires de barreaux.
function ferForge(canvasTex) {
  const cuite = texCuite(ferForge, arguments); if (cuite) return cuite;   // texture cuite (js/tex_cuites.js)
  return canvasTex(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#15161a'; g.lineCap = 'round';
    g.lineWidth = 7; g.beginPath(); g.moveTo(0, 5); g.lineTo(w, 5); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(0, h - 5); g.lineTo(w, h - 5); g.moveTo(4, 0); g.lineTo(4, h); g.moveTo(w - 4, 0); g.lineTo(w - 4, h); g.stroke();
    g.lineWidth = 3.5;
    for (const x of [22, 38, 218, 234]) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x, h - 8); g.stroke(); }
    // une volute : spirale d'Archimède qui s'enroule de `r` vers son œil, tournée vers l'extérieur de la travée
    const volute = (x0, y0, r, sx, sy) => {
      g.beginPath();
      for (let a = 0; a <= 3 * Math.PI; a += 0.15) { const rr = r * (1 - a / (3.4 * Math.PI)); g.lineTo(x0 + sx * Math.cos(a) * rr, y0 + sy * Math.sin(a) * rr); }
      g.stroke();
    };
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const x0 = 128 + sx * 52, y0 = 64 + sy * 26;
      volute(x0, y0, 22, sx, sy);
      g.beginPath(); g.moveTo(x0 - sx * 22, y0); g.quadraticCurveTo(128 - sx * 14, 64 + sy * 34, 128 - sx * 4, 64 + sy * 52); g.stroke();
    }
    g.beginPath(); g.ellipse(128, 64, 17, 28, 0, 0, 6.29); g.stroke();
    g.beginPath(); g.ellipse(128, 64, 6, 10, 0, 0, 6.29); g.stroke();
  }, [1, 1], true, 4);
}
