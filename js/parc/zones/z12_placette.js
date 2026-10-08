// =====================================================================
//  ZONE Z12 — LA PLACETTE DU THÉÂTRE, L'ORANGERIE ET LE PALIER SUD-OUEST (lot B8)
// =====================================================================
// Le bout sud de la terrasse haute, au-dessus du théâtre de verdure (x -62 à -40 ; z 140 à 172 ; conception § 1.3) :
// là où finissent l'allée haute (Z17) et l'allée sud (Z16), et d'où partent la rampe ouest (Z11) et l'escalier de 20
// marches qui descend à l'allée haute du théâtre (Z09, lot B10).
//
// CE QUE LES PHOTOS MONTRENT (tools/parc/references_gmaps/SYNTHESE.md, fiche Z12, et R4.md § Z12 : CH0 l'orangerie,
// T0 et T7 la vue sur le théâtre, T5 le garde-corps, T3 le talus vu de la scène), et ce qu'on en fait :
//  - L'ORANGERIE (le « bâtiment ancien » de la conception ; OSM 82250639, 16 x 8 m, grand axe selon z) : sa FAÇADE
//    VITRÉE REGARDE x+ (la placette, le théâtre, la Seine). Un seul niveau : SIX BAIES CINTRÉES de 1,75 x 3,3 m sous clé,
//    menuiseries de bois brun orangé à petits carreaux, impostes à petits bois rayonnants, archivoltes, trumeaux lisses,
//    soubassement ; ENDUIT CRÈME sali de coulures, un angle écorché qui montre le moellon ; CORNICHE à 5 m, puis une
//    BALUSTRADE de toiture à balustres tournés coupée de dés ; derrière elle, le toit en croupe gris qu'on ne voit pas
//    d'en bas. Devant, une GRILLE NOIRE d'1,4 m ferme une bande plantée, puis une allée où sont posés deux BANCS DE BOIS
//    brun foncé. C'est le bord du parc : la limite sud (monde.json) longe sa façade, son mur nord et son mur sud.
//  - LA PLACETTE (gabarit placette_theatre : x -53 à -46, z 150 à 165, +9,5, OSM place=square) : un sol clair (non vu de
//    près : des dalles, comme le disent les données) ; au bord, au-dessus du mur de soutènement (gabarit
//    mur_placette_theatre, 4 m), le GARDE-CORPS d'acier sombre de T5 (main courante plate, barreaux tous les 11-12 cm) ;
//    le long de lui, le TALUS PLANTÉ de T0 et T7 : palmiers de Chine de 2 à 3 m, palmier nain, graminées, fusains
//    panachés, fougères, lauriers, et une haie de buis taillée de 0,6 m côté placette. Le mur lui-même, vu du théâtre,
//    est un appareil de moellons calcaires, couvert de lierre par places.
//  - L'ESCALIER DE 20 MARCHES (gabarit escalier20_theatre) du palier au pied du mur ; le début de l'allée haute du
//    théâtre jusqu'au PORTILLON LATÉRAL (portillon PLT de monde.json, ouvert) ; l'ACCÈS dallé qui monte de la fin de
//    l'allée sud à la placette (gabarit acces_placette).
//  - les DEUX GRANDS PALMIERS de 5-6 m qui encadrent l'axe du théâtre au pied du mur (T3), que le MNH prenait pour
//    deux tilleuls : retirés de arbres.bin (tools/parc/gabarits.json), ils sont dessinés ici.
// Le croissant de sable du théâtre et ses haies sont à Z09 (lot B10), la rampe ouest et le raccourci du théâtre à Z11,
// l'allée sud à Z16, l'allée haute à Z17.
//
// RÈGLES DE ZONE (conception § 3.3) : aucun Math.random ; toute hauteur par le sol du monde ; matériaux du kit (et le
// feuillage du coteau) ; aucun arbre planté (les palmiers et les arbustes du talus sont des plantes de massif) ; tout
// dans le groupe du morceau. Les revêtements à plat sont hors de l'ombre cuite et des ombres de contact (aPlat).
import * as THREE from 'three';
import { Monde } from '../../monde.js';
import {
  alea, donnees, parId, dansPoly, lin, versTeinte, drape, aPlat, gardeCorps, lanterneMat, bancBois, unArbuste, petitArbuste,
} from './z17_allee_haute.js';
import { allee, Nappe, maillageSol, Touffes, maillageFeuillage, dansBoite, rampesEnObstacles, teinte as teinteCoteau, sol, projeter } from './coteau.js';
import { carteFond } from '../../court_parc.js';
import { outilsB2 } from './z04_butte_pin.js';

// ============================================================================================ les données
// (repère du terrain 1 ; recopiées de monde.json, gabarits de la zone Z12, et relues dans les données quand elles y sont)
const PLACETTE = [[-52.8, 150.4], [-46.4, 150.6], [-46.1, 164.7], [-53.3, 165.0]];
const MUR_REPLI = {
  ligne: [[-45.9, 148.6], [-46.3, 151.6], [-45.6, 153.51], [-45.49, 155.4], [-45.3, 157.3], [-45.7, 159.2], [-45.3, 161.1], [-45.1, 163.1],
    [-45.1, 165.01], [-45.7, 167.01], [-46.7, 168.8], [-47.2, 170.6]],
  profil: [[0, 9.36], [2.06, 9.46], [4.12, 9.5], [22.67, 9.5]],
};
const ESC20 = { de: [-48.6, 147.6, 9.5], a: [-43.4, 147.5, 5.6], largeur: 1.6, marches: 20 };
const ACCES = [[-56.5, 147.7], [-54.0, 150.5], [-50.0, 153.5]];
const ALLEE_THEATRE = [[-42.11, 147.46], [-41.14, 151.59], [-38.09, 153.37]];
const PORTILLON = { x: -41.1, z: 151.6, largeur: 1.5 };
// L'orangerie (OSM 82250639 : x -67,8 à -59,9 ; z 151 à 166,9) : la façade à x -60,1, le mur du fond à -67,8
const OR = { xF: -60.1, xB: -67.8, z0: 151.1, z1: 166.8, hC: 5.0 };
// La grille noire d'1,4 m devant la bande plantée de la façade, et l'allée des bancs entre elle et la placette
const X_GRILLE = -58.4;
const ALLEE_OR = { x0: -58.2, x1: -52.9, z0: 151.2, z1: 166.4 };
// Les deux bancs de bois devant l'orangerie (CH0), deux autres sur la placette, face au théâtre
const BANCS_BOIS = [{ x: -57.3, z: 155.4, cap: 90 }, { x: -57.3, z: 161.6, cap: 90 }, { x: -51.2, z: 155.2, cap: 90 }, { x: -51.2, z: 160.6, cap: 90 }];
const LAMPES = [{ x: -56.5, z: 150.9 }, { x: -53.8, z: 165.7 }];
// Le lit planté au haut du mur (entre la haie de buis et le garde-corps), du nord au sud de la placette
const LIT = { z0: 151.9, z1: 166.2, larg: 1.35 };
// Les palmiers de Chine du talus (Trachycarpus, 2 à 3 m) et un palmier nain
// (l'axe du théâtre, z 160,5 à 162,5, reste libre : T0 n'a qu'un palmier, « à droite », z+)
const PALMIERS = [{ z: 153.3, h: 2.6 }, { z: 157.6, h: 3.1 }, { z: 163.4, h: 2.4 }, { z: 165.7, h: 2.8 }, { z: 159.7, h: 0.9 }];
// Les DEUX GRANDS PALMIERS de 5 à 6 m au pied du mur, en haut des gradins, qui encadrent l'axe du théâtre (z 161,8 ; R4
// T3 : « deux grands Trachycarpus de 5-6 m au tronc fin »). Le MNH les avait pris pour deux tilleuls (arbres.bin), dont
// les couronnes bouchaient la vue de la placette : tools/parc/gabarits.json les retire (arbres > retirer, lot B8) et
// on les dessine ici, au pied de la face du mur (le premier, relevé sur la ligne même du mur, recule de 0,7 m vers x+).
const GRANDS_PALMIERS = [{ x: -44.8, z: 159.6, h: 5.1 }, { x: -43.5, z: 164.0, h: 5.7 }];

// Le x du mur de soutènement à la hauteur z (sa ligne avance selon z).
function xMur(z, ligne = MUR_REPLI.ligne) {
  for (let i = 1; i < ligne.length; i++) {
    const [ax, az] = ligne[i - 1], [bx, bz] = ligne[i];
    if ((z - az) * (z - bz) <= 0 && az !== bz) return ax + ((bx - ax) * (z - az)) / (bz - az);
  }
  return z < ligne[0][1] ? ligne[0][0] : ligne[ligne.length - 1][0];
}
// Le lit planté et ses plantes (pur : les obstacles s'en servent)
function plantesDuLit() {
  const L = [];
  for (let z = LIT.z0 + 0.4, k = 0; z < LIT.z1; k++) {
    z += 0.7 + 0.5 * alea(z, k, 1201);
    if (PALMIERS.some((p) => Math.abs(p.z - z) < 0.8)) continue;
    // (dans l'axe du théâtre, rien de plus haut que les graminées et les fusains : la vue plonge sur les gradins, T0)
    const axe = z > 159.2 && z < 164.8, u = alea(k, z, 1202) * (axe ? 0.72 : 1);
    const pal = u < 0.3 ? 'herbe' : u < 0.52 ? 'panache' : u < 0.72 ? 'moyen' : u < 0.87 ? 'laurier' : 'eleagnus';
    const h = pal === 'laurier' || pal === 'eleagnus' ? 1.2 + 0.6 * alea(z, k, 1203) : 0.55 + 0.35 * alea(z, k, 1203);
    L.push({ x: xMur(z) - 0.35 - (LIT.larg - 0.7) * alea(z, k, 1204), z, h, R: 0.35 + 0.25 * alea(k, z, 1205) + (h > 1 ? 0.2 : 0), pal });
  }
  return L;
}
// LE LIERRE DU MUR, côté théâtre. Dans la réalité, sous la placette, c'est un talus planté de 2 m (T0, T3) ; les
// données du monde en font un mur de 4 m (rupture 70 du MNT) : on l'habille de nappes de lierre, qui pendent du haut
// (sur 1,5 à 3,5 m) ou montent du pied, sur les deux tiers de sa longueur. Des cartes de feuilles presque plaquées sur
// la face (carteFond de js/court_parc.js, dans l'accumulateur du coteau), teintées par la palette « lierre » du coteau.
function lierreDuMur(acc, ligne) {
  for (let zc = 149.6, k = 0; zc < 167; k++) {
    const W = 1.2 + 1.4 * alea(zc, k, 1211);
    if (alea(k, zc, 1212) < 0.72) {
      const pend = alea(zc, k, 1213) < 0.65, H = pend ? 1.5 + 2.0 * alea(k, zc, 1214) : 1.0 + 1.6 * alea(k, zc, 1214);
      const n = Math.round(W * H * 22);
      for (let i = 0; i < n; i++) {
        const z = zc + (alea(i, zc, 1215) - 0.5) * W * (pend ? 1 - 0.4 * alea(zc, i, 1216) : 1);
        if (z < 148.7 || z > 167) continue;
        const xf = xMur(z, ligne) + 0.31, yT = 9.5 + 0.12, yB = sol(xf + 0.4, z);
        const v = Math.pow(alea(z, i, 1217), 0.8) * H, y = pend ? yT - v : yB + v;
        if (y < yB + 0.05 || y > yT) continue;
        const x = xf + 0.02 + 0.09 * alea(i, z, 1218), s = 0.34 + 0.16 * alea(z, i, 1219);
        const vol = { c: [x - 0.7 + Monde.dx, y, z], r: 0.9, t: 0.8 + 0.25 * alea(i, zc, 1220) };
        carteFond(acc, x + Monde.dx, y, z, (alea(i, z, 1221) - 0.5) * 0.6, Math.PI / 2 + (alea(z, i, 1222) - 0.5) * 0.5, alea(i, i + z, 1223) * 6.28, s, s * 0.9, vol, teinteCoteau('lierre', alea(z, i, 1224)));
      }
    }
    zc += W * 0.8 + 0.3;
  }
}
// LE TALUS DU PALIER, entre le haut de la rampe ouest (Z11), l'escalier de 20 marches et le raccourci du théâtre : une
// pente de 50 % que le coteau (Z11) laisse à la placette ; on y met les arbustes persistants du talus (lauriers, éléagnus,
// fusains), à 1 m au moins des allées et des marches. (Pur : les obstacles s'en servent.)
const RAMPE_HAUT = [[-56.35, 144.9], [-49.41, 131.73]];
const RACCOURCI = [[-42.11, 147.46], [-38.46, 138.88], [-49.41, 131.73]];
function talusPalier() {
  const L = [];
  // (pas à l'ouest de x -48,5 : PV18, depuis la placette, doit voir la rampe ouest descendre en diagonale)
  for (let z = 139.3; z < 146.3; z += 1.7) for (let x = -48.2; x < -43.5; x += 1.8) {
    const jx = x + (alea(x, z, 1261) - 0.5) * 1.2, jz = z + (alea(z, x, 1262) - 0.5) * 1.2;
    if (alea(jx, jz, 1263) < 0.3) continue;
    const R = 0.7 + 0.4 * alea(jz, jx, 1264);
    if (projeter(RAMPE_HAUT, jx, jz).d < 1.75 + R + 0.5 || projeter(RACCOURCI, jx, jz).d < 1.0 + R + 0.4) continue;
    if (Math.abs(jz - ESC20.de[1]) < 0.8 + 0.6 + R && jx > ESC20.de[0] - 1 && jx < ESC20.a[0] + 1) continue;
    L.push({ x: jx, z: jz, h: 1.3 + 1.1 * alea(jx, jz, 1265), R, pal: ['laurier', 'sombre', 'eleagnus', 'moyen', 'laurier'][Math.floor(alea(jz, jx, 1266) * 5)] });
  }
  return L;
}
let LIT_PLANTES = null, TALUS = null;
const preparer = () => { if (!LIT_PLANTES) { LIT_PLANTES = plantesDuLit(); TALUS = talusPalier(); } };

// ============================================================================================ petits outils
function boite(lot, cle, x, y, z, w, h, d, couleur, o = {}) {
  lot.boite(cle, w, h, d, new THREE.Matrix4().makeTranslation(x, y, z), { couleur, bande: cle === 'peinture', chanfrein: o.chanfrein || 0 });
}
// UNE VOLÉE DU KIT, avancée d'un demi-giron vers le bas (comme js/parc/zones/z06_axe_chateau.js, volee) : le nez de
// chaque marche tombe sur le plan incliné du sol des données, le giron entier est au-dessus.
// (lot C6 : un générateur — `yield* volee(kit, v, o, ctx.budget)` —, la volée faite en tranches : kit.escalierPas)
function volee(kit, v, o = {}, budget = () => false) {
  const [x0, z0, y0] = v.de, [x1, z1, y1] = v.a, L = Math.hypot(x1 - x0, z1 - z0), g = L / v.marches;
  const bas = y0 <= y1 ? 1 : -1, ux = ((x1 - x0) / L) * bas, uz = ((z1 - z0) / L) * bas, k = g / 2;
  return kit.escalierPas({
    de: [x0 - ux * k, z0 - uz * k, y0 + 0.01], a: [x1 - ux * k, z1 - uz * k, y1 + 0.01],
    marches: v.marches, largeur: v.largeur, limon: o.limon ?? true, mainCourante: o.mainCourante, materiau: 'taille', usure: 0.6,
  }, budget);
}

// ============================================================================================ 1. LA PLACETTE, LE MUR, LE TALUS
const T_DALLES = versTeinte('#cac4b8', '#a9a295');
// (le stabilisé clair des photos, dans la matière de la terre battue : voir js/parc/zones/z16_bosquet.js)
const T_STAB = versTeinte('#c2a891', '#bcab92');
function* placette(ctx) {
  const { kit, K, groupe } = ctx;
  const D = donnees(ctx), gm = parId(D && D.murs, 'mur_placette_theatre'), mur = gm || MUR_REPLI;
  const gp = parId(D && D.plans, 'placette_theatre'), poly = (gp && gp.poly) || PLACETTE;
  // les sols : les dalles de la placette (jusqu'à la haie du lit), l'allée des bancs devant l'orangerie (stabilisé clair),
  // l'accès dallé qui vient de l'allée sud, le début de l'allée du théâtre et le lit planté (terre)
  const sols = new kit.Lot('sols de la placette');
  drape(kit, sols, 'dalles#sol', [-54, 149.5, -45, 166], (x, z) => dansPoly(x, z, poly) && x < xMur(z) - LIT.larg - 0.05, { pas: 0.5, dy: 0.02,
    teinte: (x, z) => { const f = (0.93 + 0.1 * alea(Math.floor(x / 0.6), Math.floor(z / 0.6), 1221)) * (0.95 + 0.07 * Math.sin(x * 0.4 + z * 0.3)); return [T_DALLES[0] * f, T_DALLES[1] * f, T_DALLES[2] * f]; } });
  drape(kit, sols, 'terreBattue#sol', [ALLEE_OR.x0, ALLEE_OR.z0, ALLEE_OR.x1, ALLEE_OR.z1], (x, z) => !dansPoly(x, z, poly), { pas: 0.5, dy: 0.022,
    teinte: (x, z) => { const f = 0.93 + 0.1 * alea(Math.floor(x * 1.5), Math.floor(z * 1.5), 1222); return [T_STAB[0] * f, T_STAB[1] * f, T_STAB[2] * f]; } });
  if (ctx.budget()) yield;
  drape(kit, sols, 'terre#sol', [-48.5, LIT.z0 - 0.5, -45, LIT.z1 + 0.5], (x, z) => z > LIT.z0 - 0.3 && z < LIT.z1 + 0.3 && x > xMur(z) - LIT.larg - 0.3 && x < xMur(z) - 0.1,
    { pas: 0.5, dy: 0.03, teinte: () => [0.85, 0.8, 0.75] });
  groupe.add(aPlat(sols.maillages('placette · sols')));
  if (ctx.budget()) yield;
  const bandes = new Nappe();
  allee({ trace: ACCES, largeur: 2.5, boite: [-60, 140, -52.4, 160], tuile: 1.8, dy: 0.026, teinte: (x, z) => { const f = 0.93 + 0.1 * alea(Math.floor(x / 0.6), Math.floor(z / 0.6), 1223); return [T_DALLES[0] * f, T_DALLES[1] * f, T_DALLES[2] * f]; } }, bandes);
  const md = maillageSol(bandes.geometrie(), kit.materiau('dalles'), 'placette · accès');
  if (md) groupe.add(aPlat(md));
  const th = new Nappe();
  allee({ trace: ALLEE_THEATRE, largeur: 2.5, boite: [-44.5, 146, -39.5, 152.3], tuile: 3.0, dy: 0.028, teinte: (x, z) => { const f = 0.94 + 0.08 * alea(Math.floor(x * 1.5), Math.floor(z * 1.5), 1224); return [T_STAB[0] * f, T_STAB[1] * f, T_STAB[2] * f]; } }, th);
  const mt = maillageSol(th.geometrie(), kit.materiau('terreBattue'), 'placette · allée du théâtre');
  if (mt) groupe.add(aPlat(mt));
  if (ctx.budget()) yield;
  // le mur de soutènement (moellons calcaires), jusqu'à la limite du parc (z 167), en trois pièces (une seule prenait
  // 12 ms d'un tenant) : chacune reprend le profil du haut à son abscisse. Sans chaînes d'angle : le kit en pose aux
  // deux bouts de chaque pièce, et les deux coupes montraient, au milieu du mur, une colonne de gros blocs de taille
  // (vue du théâtre) ; aux vrais bouts, le mur bute contre le limon de l'escalier et contre la limite du parc.
  const ligne = mur.ligne.filter(([, z]) => z <= 167.1), prof = mur.profil.map((q) => [q[0], q[1]]);
  const coupes = [0, Math.round((ligne.length - 1) / 3), Math.round((2 * (ligne.length - 1)) / 3), ligne.length - 1];
  for (let i = 0; i < 3; i++) {
    const s0 = kit.longueur(ligne.slice(0, coupes[i] + 1));
    groupe.add(yield* kit.murPierrePas({ ligne: ligne.slice(coupes[i], coupes[i + 1] + 1), cote: 'droite', yHaut: prof.map(([a, y]) => [a - s0, y]), ep: 0.6, pierre: 'calcaire', chaperon: 0.12, chaines: false }, ctx.budget));   // (lot C6 : en tranches)
    if (ctx.budget()) yield;
  }
  // le garde-corps d'acier sombre (T5), au bord du haut du mur, sur une bordure de béton
  const fer = new kit.Lot('garde-corps de la placette');
  const lg = [];
  for (let z = 149.2; z <= 166.35; z += 0.5) lg.push([xMur(z, ligne) - 0.28, z]);
  gardeCorps(kit, fer, lg, { h: 1.0, bordure: 0.1, pas: 0.115, travee: 1.9, couleur: '#2a2a2a', rayon: 0.008 });
  if (ctx.budget()) yield;
  // les réverbères, les bancs de bois
  for (const l of LAMPES) lanterneMat(kit, fer, l.x, l.z);
  for (const b of BANCS_BOIS) bancBois(kit, fer, b.x, b.z, b.cap, { lattes: '#4a3a2e' });
  groupe.add(fer.maillages('placette · garde-corps, réverbères, bancs'));
  if (ctx.budget()) yield;
  // la haie de buis taillée qui borde le lit côté placette (relecture : teinte « haie », le vert sombre persistant de T0,
  // #465a36 ; celle du buis du kit, vert tendre de printemps, en faisait le seul vert vif de la placette)
  // (en deux tronçons : 14 m de haie et ses rameaux prenaient 11 ms d'un tenant)
  groupe.add(kit.haieTaillee({ ligne: [[xMur(LIT.z0) - LIT.larg, LIT.z0], [xMur(158.5) - LIT.larg, 158.5]], h: 0.6, ep: 0.45, essence: 'haie' }));
  if (ctx.budget()) yield;
  groupe.add(kit.haieTaillee({ ligne: [[xMur(158.5) - LIT.larg, 158.5], [xMur(LIT.z1) - LIT.larg, LIT.z1]], h: 0.6, ep: 0.45, essence: 'haie' }));
  if (ctx.budget()) yield;
  // les palmiers de Chine
  const pal = new kit.Lot('palmiers');
  for (const p of PALMIERS) { palmier(kit, pal, xMur(p.z) - 0.75, p.z, p.h); if (ctx.budget()) yield; }
  groupe.add(pal.maillages('placette · palmiers'));
  if (ctx.budget()) yield;
  // (relecture : les DEUX GRANDS, dans un maillage à part, hors des ombres de contact. Plantés au pied du mur, leurs
  // têtes arrivent à 1 ou 2 m au-dessus de la placette : la carte fixe des ombres de contact (js/ombres_contact.js), une
  // fenêtre PLATE à la hauteur du joueur tant que son drapé sur le relief n'est pas fait, les prenait pour du décor posé
  // sur la placette et tendait, en l'air au-dessus du vide, des taches noires le long de la haie — vues de T0.)
  const grands = new kit.Lot('grands palmiers');
  for (const p of GRANDS_PALMIERS) { palmier(kit, grands, p.x, p.z, p.h); if (ctx.budget()) yield; }
  const mg = grands.maillages('placette · grands palmiers');
  mg.userData.nofuse = true;
  mg.traverse((m) => { if (m.isMesh) { m.userData.dynamique = true; m.userData.nofuse = true; } });
  groupe.add(mg);
  if (ctx.budget()) yield;
  // le lit planté et le lierre du mur ; ses GRAMINÉES (pennisetum, stipa : T0) en fontaines de brins, comme celles des
  // terrasses du bas (outilsB2 de js/parc/zones/z04_butte_pin.js) — en petits arbustes, c'étaient des boules sombres
  preparer();
  const feu = new Touffes(), T = outilsB2(kit, Monde), herbes = new kit.Lot('graminées du lit');
  let k = 0;
  for (const a of [...LIT_PLANTES, ...TALUS]) {
    if (a.pal === 'herbe') T.graminees(herbes, [[a.x, a.z, a.h]], { y: kit.sol(a.x, a.z) - 0.02, eventails: 6 });
    else (a.h < 1 ? petitArbuste : unArbuste)(feu, a);
    if (++k % 8 === 0 && ctx.budget()) yield;
  }
  // et une rangée de fontaines de graminées derrière la haie, qui la dépassent de 20 à 40 cm (T0, T7 : la paille des
  // pennisetums tient tout le devant du talus), hors des palmiers
  for (let z = LIT.z0 + 0.5, k = 0; z < LIT.z1 - 0.3; z += 1.05 + 0.35 * alea(z, k, 1206), k++) {
    if (PALMIERS.some((p) => Math.abs(p.z - z) < 0.7)) continue;
    const x = xMur(z) - LIT.larg + 0.42 + 0.15 * alea(k, z, 1207);
    T.graminees(herbes, [[x, z, 0.78 + 0.2 * alea(z, k, 1208)]], { y: kit.sol(x, z) - 0.02, eventails: 6 });
  }
  if (herbes.parts.size) groupe.add(T.maillages(herbes, 'placette · graminées du lit'));
  lierreDuMur(feu, ligne);
  const m = maillageFeuillage(feu, K, 'placette · talus planté', true);
  if (m) groupe.add(m);
  yield;
}

// UN PALMIER DE CHINE (Trachycarpus fortunei, T0 et T7) : un stipe brun fibreux, un peu évasé au pied, et une tête de
// feuilles EN ÉVENTAIL (des pétioles fins, puis un demi-disque plissé de 0,5 à 0,6 m), les jeunes dressées, les vieilles
// retombantes et brunies. `h` : hauteur du stipe. Les éventails sont des polygones du matériau « peinture » (vert),
// dessinés des deux côtés ; les plis alternent clair et sombre.
function palmier(kit, lot, x, z, h) {
  const y0 = kit.sol(x, z), stipe = lin('#4a3a2c', 1.6), nf = h < 1.2 ? 10 : 18;
  if (h >= 1.2) lot.tour('bois', [[0.16, -0.05], [0.13, 0.25], [0.11, h * 0.6], [0.12, h]], 8, new THREE.Matrix4().makeTranslation(x, y0, z), { couleur: stipe });
  const T = new THREE.Vector3(x, y0 + (h < 1.2 ? 0.3 : h), z), uv = (xx, yy, zz, out) => { out[0] = 0.25; out[1] = 0.5; };
  for (let i = 0; i < nf; i++) {
    const th = i * 2.39996 + alea(x, z, 1231) * 6.28, age = (i % 6) / 5;                  // (angle d'or : pas deux feuilles l'une sur l'autre)
    const el = 1.05 - age * 1.5 + (alea(i, x, 1232) - 0.5) * 0.3, lp = (h < 1.2 ? 0.35 : 0.55) + 0.2 * alea(z, i, 1233);
    const d = new THREE.Vector3(Math.cos(el) * Math.cos(th), Math.sin(el), Math.cos(el) * Math.sin(th));
    const P = T.clone().addScaledVector(d, lp);
    lot.barre(T.toArray(), P.toArray(), 0.02, 0.012, { couleur: lin('#5a6a3a') });
    // l'éventail : dans le plan de d et de l'horizontale p, qui s'ouvre sur 200° autour de d. Un CŒUR plissé (les
    // folioles y sont soudées sur le premier tiers du rayon), puis des FOLIOLES LIBRES, étroites, séparées par des
    // jours, dont la pointe retombe (T7 : « palmes en éventail » ; un éventail plein, d'un seul tenant, faisait de loin
    // un parapluie de papier plié)
    const p = new THREE.Vector3(-Math.sin(th), 0, Math.cos(th)), n = new THREE.Vector3().crossVectors(d, p).normalize();
    const R = (h < 1.2 ? 0.42 : 0.6) + 0.12 * alea(i, z, 1234), nF = h < 1.2 ? 12 : 16, rc = 0.34 * R;
    const vert = age > 0.75 ? lin('#96904e') : lin(i % 2 ? '#5f8a3a' : '#76a046');
    const dirs = [];
    for (let k = 0; k <= nF; k++) {
      const b = -1.75 + (3.5 * k) / nF, dir = d.clone().multiplyScalar(Math.cos(b)).addScaledVector(p, Math.sin(b));
      dir.y -= 0.25 * age * Math.abs(Math.sin(b));                                         // (les vieilles feuilles pendent)
      dirs.push(dir.normalize());
    }
    const face = (pts, c) => {
      const V = pts.map((q) => q.toArray());
      const nn = new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0])).normalize();
      if (nn.y < 0) nn.negate();
      lot.polygone('peinture', V, nn.toArray(), { couleur: c, uv });
      lot.polygone('peinture', V, nn.clone().negate().toArray(), { couleur: [c[0] * 0.92, c[1] * 0.95, c[2] * 0.85], uv });
    };
    const coeur = dirs.map((dir, k) => P.clone().addScaledVector(dir, rc).addScaledVector(n, k % 2 ? 0.02 : -0.02));
    for (let k = 0; k < nF; k++) face([P, coeur[k], coeur[k + 1]], k % 2 ? vert : [vert[0] * 0.8, vert[1] * 0.8, vert[2] * 0.8]);
    const w0 = rc * (3.5 / nF) * 0.42;                                                     // (demi-largeur au départ)
    for (let k = 0; k <= nF; k++) {
      const dir = dirs[k], t = new THREE.Vector3().crossVectors(n, dir).normalize();
      const m = P.clone().addScaledVector(dir, 0.68 * R), bout = P.clone().addScaledVector(dir, R);
      m.y -= 0.05 * R * (1 + age); bout.y -= (0.24 + 0.3 * age) * R + 0.06 * alea(k, i + x, 1235);
      const c = (k + i) % 2 ? vert : [vert[0] * 0.86, vert[1] * 0.86, vert[2] * 0.86];
      face([coeur[k].clone().addScaledVector(t, w0), coeur[k].clone().addScaledVector(t, -w0), m.clone().addScaledVector(t, -0.8 * w0), m.clone().addScaledVector(t, 0.8 * w0)], c);
      face([m.clone().addScaledVector(t, 0.8 * w0), m.clone().addScaledVector(t, -0.8 * w0), bout], c);
    }
  }
}

// ============================================================================================ 2. L'ESCALIER, LE PORTILLON
function* escalierEtPortillon(ctx) {
  const { kit, groupe } = ctx;
  const D = donnees(ctx), e = parId(D && D.escaliers, 'escalier20_theatre') || ESC20;
  groupe.add(yield* volee(kit, e, { limon: true, mainCourante: 'deux' }, ctx.budget));
  if (ctx.budget()) yield;
  // le portillon latéral (ouvert, rabattu vers le théâtre) entre deux piles, et deux bouts de grille
  const lot = new kit.Lot('portillon latéral');
  const { x, z, largeur } = PORTILLON, xa = x - largeur / 2 - 0.08, xb = x + largeur / 2 + 0.08, y = kit.sol(x, z), fer = lin('#1c1c1c');
  for (const xp of [xa, xb]) boite(lot, 'peinture', xp, kit.sol(xp, z) + 0.8, z, 0.1, 1.6, 0.1, fer);
  // le vantail, ouvert à 90° le long de x = xa (du côté du théâtre, z+)
  const hv = 1.35;
  for (let k = 0; k <= 12; k++) lot.barre([xa + 0.06, y + 0.08, z + 0.05 + (k * (largeur - 0.1)) / 12], [xa + 0.06, y + hv, z + 0.05 + (k * (largeur - 0.1)) / 12], 0.016, 0.016, { couleur: fer, haut: [1, 0, 0] });
  for (const h of [0.12, hv - 0.05]) lot.barre([xa + 0.06, y + h, z + 0.05], [xa + 0.06, y + h, z + largeur - 0.05], 0.03, 0.03, { couleur: fer });
  groupe.add(lot.maillages('placette · portillon latéral'));
  for (const [x0, x1] of [[xa - 1.3, xa - 0.05], [xb + 0.05, xb + 1.3]]) groupe.add(kit.grilleBarreaux({ ligne: [[x0, z], [x1, z]], h: 1.4, muret: 0.15, ep: 0.2, pas: 0.12, pointes: true }));
}

// ============================================================================================ 3. L'ORANGERIE
const C = { enduit: '#e4ddcf', moellon: '#b9a57e', menuiserie: '#8a5a34', vitre: '#1f2629', pierre: '#dcd5c6', toit: '#6b7078' };
const T_ENDUIT = versTeinte('#ded9ca', C.enduit);
// La patine de l'enduit : taches lentes, pied grisé, COULURES sous la corniche (CH0 : « sali de coulures grises »).
function enduit(y0) {
  const out = [0, 0, 0];
  return (x, y, z) => {
    const h = y - y0, tache = 0.95 + 0.08 * Math.sin(z * 0.9 + x * 0.3) * Math.sin(z * 0.37 + 1.3);
    const coul = Math.max(0, Math.sin(z * 7.3 + Math.sin(z * 1.7) * 2) * 1.6 - 0.9) * Math.exp(-(OR.hC - h) / 1.8);
    const pied = 1 - 0.14 * (1 - Math.min(1, h / 0.8));
    const f = tache * pied * (1 - 0.3 * coul);
    out[0] = T_ENDUIT[0] * f; out[1] = T_ENDUIT[1] * f; out[2] = T_ENDUIT[2] * f * 0.98;
    return out;
  };
}
// Les baies : leurs axes le long de la façade (u = z - z0), largeur, appui, naissance de l'arc
const BAIE = { l: 1.75, appui: 0.5, naissance: 2.85 };
function baies() {
  const L = OR.z1 - OR.z0, tr = 0.75, bout = (L - 6 * BAIE.l - 5 * tr) / 2, out = [];
  for (let i = 0; i < 6; i++) out.push(bout + BAIE.l / 2 + i * (BAIE.l + tr));
  return out;
}
// La glycine de la façade : ses ceps (brins : points [x, y, z] et rayon) et ses bouquets de feuilles (petits arbustes
// posés à hauteur). Un cep par trumeau choisi (le 1er, le 2e, le 3e et le 5e, comme sur CH0), qui sort de la bande
// plantée, se colle au mur à 0,6 m et monte en ondulant ; sous la corniche, deux bras de 0,9 à 1,4 m.
function glycine(U, y0) {
  const brins = [], feuilles = [], xF = OR.xF, yH = y0 + OR.hC - 0.36;
  for (const i of [0, 1, 2, 4]) {
    const zc = OR.z0 + U[i] + BAIE.l / 2 + 0.375, pts = [[xF + 0.32, y0 - 0.05, zc + 0.05], [xF + 0.14, y0 + 0.35, zc - 0.03]];
    for (let v = 0.8; v < OR.hC - 0.45; v += 0.45) pts.push([xF + 0.07, y0 + v, zc + 0.09 * Math.sin(v * 2.3 + i)]);
    pts.push([xF + 0.08, yH, zc]);
    brins.push({ pts, r: 0.045 });
    for (const s of [-1, 1]) {
      const L = 0.9 + 0.5 * alea(zc, s, 1271), bras = [[xF + 0.08, yH, zc]];
      for (let t = 0.25; t <= 1.001; t += 0.25) bras.push([xF + 0.09, yH - 0.06 * Math.sin(t * Math.PI) + 0.03 * Math.sin(t * 9 + i), zc + s * L * t]);
      brins.push({ pts: bras, r: 0.028 });
      // (relecture : trois boules de 70 cm par bras faisaient, sur chaque cep, un arbre en sucette collé à la façade ;
      // des bouquets plus petits et serrés, qui pendent plus ou moins sous le bras, font la guirlande feuillue)
      for (let t = 0.12, q = 0; t <= 1.001; t += 0.13, q++) {
        const pend = 0.25 * alea(zc + t, s + q, 1273);
        feuilles.push({ x: xF + 0.22, z: zc + s * L * t, y0: yH - 0.3 - pend, h: 0.38 + 0.12 * alea(zc + t, s, 1272) + pend, R: 0.22 + 0.06 * alea(q, zc, 1274), pal: 'moyen' });
      }
      feuilles.push({ x: xF + 0.2, z: zc, y0: yH - 0.45, h: 0.5, R: 0.26, pal: 'moyen' });
    }
  }
  return { brins, feuilles };
}
function* orangerie(ctx) {
  const { kit, groupe } = ctx;
  const lot = new kit.Lot('orangerie');
  const L = OR.z1 - OR.z0, xF = OR.xF;
  let y0 = Infinity;
  for (let z = OR.z0; z <= OR.z1; z += 1) y0 = Math.min(y0, kit.sol(xF + 0.4, z));
  y0 -= 0.05;
  const pat = enduit(y0), hC = OR.hC, r = BAIE.l / 2, U = baies();
  // LA FAÇADE : une forme percée de six baies cintrées, extrudée sur 0,4 m (les embrasures) ; repère (u, v, profondeur)
  // → (x = xF - p, y = y0 + v, z = z0 + u)
  const forme = new THREE.Shape();
  forme.moveTo(0, -0.3); forme.lineTo(L, -0.3); forme.lineTo(L, hC); forme.lineTo(0, hC); forme.lineTo(0, -0.3);
  for (const u of U) {
    const t = new THREE.Path();
    t.moveTo(u - r, BAIE.appui); t.lineTo(u + r, BAIE.appui); t.lineTo(u + r, BAIE.naissance);
    t.absarc(u, BAIE.naissance, r, 0, Math.PI, false); t.lineTo(u - r, BAIE.appui);
    forme.holes.push(t);
  }
  const g = new THREE.ExtrudeGeometry(forme, { depth: 0.42, bevelEnabled: false, curveSegments: 10 });
  const M = new THREE.Matrix4().set(0, 0, -1, xF, 0, 1, 0, y0, 1, 0, 0, OR.z0, 0, 0, 0, 1);
  lot.geo('taille', g, M, { couleur: pat, uvBoite: true, tuile: 2.0 });
  g.dispose();
  if (ctx.budget()) yield;
  // le corps du bâtiment derrière la façade (murs nord et sud, fond), et le soubassement de pierre qui la borde
  lot.boite('taille', OR.xF - 0.42 - OR.xB, hC + 0.3, L, new THREE.Matrix4().makeTranslation((OR.xF - 0.42 + OR.xB) / 2, y0 + (hC - 0.3) / 2, (OR.z0 + OR.z1) / 2), { couleur: pat, uvBoite: true, tuile: 2.0 });
  boite(lot, 'taille', xF + 0.03, y0 + 0.2, (OR.z0 + OR.z1) / 2, 0.08, 0.55, L + 0.06, lin(C.pierre, 1.0), { chanfrein: 0.015 });
  // l'angle écorché, au bout nord de la façade : le moellon sous l'enduit tombé (CH0)
  lot.polygone('moellons', [[xF + 0.006, y0 + 0.9, OR.z0 + 0.12], [xF + 0.006, y0 + 0.75, OR.z0 + 0.55], [xF + 0.006, y0 + 1.5, OR.z0 + 0.62],
    [xF + 0.006, y0 + 2.4, OR.z0 + 0.4], [xF + 0.006, y0 + 2.6, OR.z0 + 0.12]], [1, 0, 0], { couleur: lin(C.moellon, 1.1) });
  if (ctx.budget()) yield;
  // LES BAIES : vitre sombre en retrait, dormant et petits bois brun orangé (deux vantaux de deux carreaux de large et
  // quatre de haut, imposte à rayons), archivolte et clé de pierre en saillie, appui
  const men = lin(C.menuiserie, 1.0), vit = lin(C.vitre);
  const P = (u, v, p) => [xF - p, y0 + v, OR.z0 + u];
  const B = (a, b, w = 0.045) => lot.barre(a, b, w, w, { couleur: men, haut: [1, 0, 0] });
  for (const u of U) {
    if (ctx.budget()) yield;
    const pv = 0.24;
    const vitre = new THREE.Shape();
    vitre.moveTo(-r, 0); vitre.lineTo(r, 0); vitre.lineTo(r, BAIE.naissance - BAIE.appui); vitre.absarc(0, BAIE.naissance - BAIE.appui, r, 0, Math.PI, false); vitre.lineTo(-r, 0);
    const gv = new THREE.ShapeGeometry(vitre, 10);
    // (repère miroir : la normale de la forme, +z, devient +x, vers le dehors)
    lot.geo('peinture', gv, new THREE.Matrix4().set(0, 0, 1, xF - pv - 0.02, 0, 1, 0, y0 + BAIE.appui, 1, 0, 0, OR.z0 + u, 0, 0, 0, 1), { couleur: vit, bande: true });
    gv.dispose();
    // le dormant (le long du bord), le meneau, les petits bois
    B(P(u - r + 0.03, BAIE.appui, pv), P(u - r + 0.03, BAIE.naissance, pv), 0.07); B(P(u + r - 0.03, BAIE.appui, pv), P(u + r - 0.03, BAIE.naissance, pv), 0.07);
    B(P(u - r, BAIE.appui + 0.03, pv), P(u + r, BAIE.appui + 0.03, pv), 0.07); B(P(u - r, BAIE.naissance, pv), P(u + r, BAIE.naissance, pv), 0.06);
    B(P(u, BAIE.appui, pv), P(u, BAIE.naissance, pv), 0.06);
    for (const du of [-r / 2, r / 2]) B(P(u + du, BAIE.appui, pv), P(u + du, BAIE.naissance, pv), 0.03);
    for (let k = 1; k < 4; k++) { const v = BAIE.appui + ((BAIE.naissance - BAIE.appui) * k) / 4; B(P(u - r, v, pv), P(u + r, v, pv), 0.03); }
    const arc = [];
    for (let k = 0; k <= 10; k++) { const a = (Math.PI * k) / 10; arc.push(P(u + Math.cos(a) * (r - 0.03), BAIE.naissance + Math.sin(a) * (r - 0.03), pv)); }
    lot.prisme('peinture', [[-0.035, -0.035], [0.035, -0.035], [0.035, 0.035], [-0.035, 0.035]], arc, { bande: true, couleur: men, haut: [1, 0, 0] });
    for (let k = 1; k < 6; k++) { const a = (Math.PI * k) / 6; B(P(u, BAIE.naissance, pv), P(u + Math.cos(a) * (r - 0.05), BAIE.naissance + Math.sin(a) * (r - 0.05), pv), 0.025); }
    // l'archivolte (moulure en saillie qui suit l'arc) et la clé
    const archi = [];
    for (let k = 0; k <= 12; k++) { const a = (Math.PI * k) / 12; archi.push(P(u + Math.cos(a) * (r + 0.07), BAIE.naissance + Math.sin(a) * (r + 0.07), -0.025)); }
    lot.prisme('taille', [[-0.07, -0.03], [0.07, -0.03], [0.07, 0.03], [-0.07, 0.03]], archi, { couleur: lin(C.pierre, 1.02), haut: [1, 0, 0] });
    boite(lot, 'taille', xF + 0.04, y0 + BAIE.naissance + r + 0.08, OR.z0 + u, 0.1, 0.32, 0.24, lin(C.pierre, 1.02), { chanfrein: 0.01 });
    boite(lot, 'taille', xF + 0.02, y0 + BAIE.appui - 0.04, OR.z0 + u, 0.2, 0.08, BAIE.l + 0.12, lin(C.pierre, 0.98), { chanfrein: 0.01 });
  }
  if (ctx.budget()) yield;
  // LA CORNICHE (deux bandeaux en encorbellement), sur la façade et le mur nord, que l'on voit de l'allée sud
  const pierre = lin(C.pierre, 1.0);
  boite(lot, 'taille', xF + 0.06, y0 + hC - 0.12, (OR.z0 + OR.z1) / 2, 0.2, 0.16, L + 0.2, pierre, { chanfrein: 0.02 });
  boite(lot, 'taille', xF + 0.13, y0 + hC + 0.08, (OR.z0 + OR.z1) / 2, 0.34, 0.24, L + 0.34, pierre, { chanfrein: 0.03 });
  boite(lot, 'taille', (xF + OR.xB) / 2, y0 + hC + 0.08, OR.z0 - 0.13, xF - OR.xB + 0.34, 0.24, 0.34, pierre, { chanfrein: 0.03 });
  if (ctx.budget()) yield;
  // LA BALUSTRADE DE TOITURE : socle, dés au droit des trumeaux, balustres tournés, tablette
  const yB = y0 + hC + 0.2, xb = xF - 0.05;
  boite(lot, 'taille', xb, yB + 0.06, (OR.z0 + OR.z1) / 2, 0.3, 0.12, L, pierre);
  boite(lot, 'taille', xb, yB + 0.78, (OR.z0 + OR.z1) / 2, 0.34, 0.1, L + 0.04, pierre, { chanfrein: 0.015 });
  const des = [0.2, ...U.slice(0, 5).map((u) => u + BAIE.l / 2 + 0.375), L - 0.2];
  for (const u of des) boite(lot, 'taille', xb, yB + 0.4, OR.z0 + u, 0.36, 0.76, 0.36, pierre, { chanfrein: 0.015 });
  const balustre = [[0.05, 0], [0.05, 0.05], [0.035, 0.08], [0.06, 0.22], [0.065, 0.3], [0.04, 0.44], [0.03, 0.5], [0.045, 0.54], [0.045, 0.6]];
  for (let i = 0; i + 1 < des.length; i++) {
    const a = des[i] + 0.3, b = des[i + 1] - 0.3, n = Math.max(1, Math.round((b - a) / 0.24));
    for (let k = 0; k <= n; k++) lot.tour('taille', balustre, 8, new THREE.Matrix4().makeTranslation(xb, yB + 0.12, OR.z0 + a + ((b - a) * k) / n), { couleur: lin(C.pierre, 0.97 + 0.05 * alea(k, i, 1241)) });
  }
  // (côté nord : le même socle et la même tablette, sans balustres, que l'on ne voit que de biais)
  boite(lot, 'taille', (xF + OR.xB) / 2, yB + 0.35, OR.z0 + 0.1, xF - OR.xB, 0.7, 0.3, pierre);
  // LE TOIT EN CROUPE, gris, en retrait derrière la balustrade
  const e = 0.6, yT = y0 + hC + 0.25, yF = y0 + hC + 1.9, xa = xF - e, xr = OR.xB + e, za = OR.z0 + e, zb = OR.z1 - e, xm = (xa + xr) / 2;
  const d = (xa - xr) / 2, fa = [za + d, zb - d], ardoise = lin(C.toit, 1.15);
  const pan = (pts) => {
    const a = new THREE.Vector3(...pts[0]), b = new THREE.Vector3(...pts[1]), c = new THREE.Vector3(...pts[2]);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    if (n.y < 0) n.negate();
    lot.polygone('ardoise', pts, n.toArray(), { couleur: ardoise });
  };
  pan([[xa, yT, za], [xa, yT, zb], [xm, yF, fa[1]], [xm, yF, fa[0]]]);
  pan([[xr, yT, za], [xr, yT, zb], [xm, yF, fa[1]], [xm, yF, fa[0]]]);
  pan([[xa, yT, za], [xr, yT, za], [xm, yF, fa[0]]]);
  pan([[xa, yT, zb], [xr, yT, zb], [xm, yF, fa[1]]]);
  if (ctx.budget()) yield;
  // LA GLYCINE (CH0 : de vieux ceps tordus dans quatre trumeaux, qui montent de la bande plantée jusque sous la corniche
  // et s'y partagent en deux bras qui courent le long de la façade, au-dessus des clés)
  const cep = lin('#5a4a3c', 1.5), GLY = glycine(U, y0);
  for (const brin of GLY.brins) lot.geo('bois', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(brin.pts.map((p) => new THREE.Vector3(...p))), 24, brin.r, 5, false), null, { couleur: cep });
  if (ctx.budget()) yield;
  groupe.add(lot.maillages('orangerie'));
  if (ctx.budget()) yield;
  // LA BANDE PLANTÉE devant la façade et sa GRILLE NOIRE d'1,4 m (fermée aux deux bouts contre le bâtiment)
  const bande = new kit.Lot('bande plantée');
  drape(kit, bande, 'terre#sol', [OR.xF, OR.z0, X_GRILLE, OR.z1], () => true, { pas: 0.5, dy: 0.025, teinte: () => [0.8, 0.76, 0.72] });
  groupe.add(aPlat(bande.maillages('orangerie · bande plantée')));
  if (ctx.budget()) yield;
  const zm = (OR.z0 + OR.z1) / 2;
  for (const [a, b] of [[OR.z0 + 0.05, zm], [zm, OR.z1 - 0.1]]) { groupe.add(kit.grilleBarreaux({ ligne: [[X_GRILLE, a], [X_GRILLE, b]], h: 1.4, muret: 0.15, ep: 0.2, pas: 0.12, pointes: true })); if (ctx.budget()) yield; }
  for (const zz of [OR.z0 + 0.05, OR.z1 - 0.1]) groupe.add(kit.grilleBarreaux({ ligne: [[OR.xF + 0.05, zz], [X_GRILLE, zz]], h: 1.4, muret: 0.15, ep: 0.2, pas: 0.12, pointes: true }));
  if (ctx.budget()) yield;
  // et la grille qui ferme la placette au sud, jusqu'au mur de soutènement (limite du parc, monde.json)
  groupe.add(kit.grilleBarreaux({ ligne: [[X_GRILLE, 166.72], [-52, 166.65], [-46.0, 166.6]], h: 1.4, muret: 0.15, ep: 0.2, pas: 0.12, pointes: true }));
  if (ctx.budget()) yield;
  const feu = new Touffes();
  for (let z = OR.z0 + 0.6, k = 0; z < OR.z1 - 0.4; z += 0.9, k++) unArbuste(feu, { x: (OR.xF + X_GRILLE) / 2 + 0.3 * (alea(z, k, 1251) - 0.5), z, h: 0.5 + 0.5 * alea(k, z, 1252), R: 0.45, pal: alea(z, k, 1253) < 0.5 ? 'moyen' : 'sombre' });
  // le feuillage de la glycine en fin septembre : des bouquets clairsemés le long des bras, sous la corniche
  for (const f of GLY.feuilles) petitArbuste(feu, f);
  const m = maillageFeuillage(feu, ctx.K, 'orangerie · bande plantée', true);
  if (m) groupe.add(m);
}
// La silhouette de l'orangerie (vue de loin : du théâtre, de la rampe ouest) : un volume crème, ses six baies sombres,
// la ligne claire de la balustrade, le toit gris.
function* silhouetteOrangerie(ctx) {
  const { kit, groupe } = ctx;
  const lot = new kit.Lot('orangerie (silhouette)');
  const L = OR.z1 - OR.z0, y0 = kit.sol(OR.xF + 0.4, (OR.z0 + OR.z1) / 2) - 0.05, cz = (OR.z0 + OR.z1) / 2;
  lot.boite('taille', OR.xF - OR.xB, OR.hC + 0.3, L, new THREE.Matrix4().makeTranslation((OR.xF + OR.xB) / 2, y0 + (OR.hC - 0.3) / 2, cz), { couleur: T_ENDUIT });
  for (const u of baies()) lot.boite('peinture', 0.04, 3.1, BAIE.l, new THREE.Matrix4().makeTranslation(OR.xF + 0.01, y0 + 2.1, OR.z0 + u), { couleur: lin(C.vitre), bande: true });
  lot.boite('taille', 0.3, 0.9, L, new THREE.Matrix4().makeTranslation(OR.xF - 0.05, y0 + OR.hC + 0.6, cz), { couleur: lin(C.pierre) });
  lot.boite('ardoise', OR.xF - OR.xB - 1.2, 1.2, L - 1.2, new THREE.Matrix4().makeTranslation((OR.xF + OR.xB) / 2, y0 + OR.hC + 0.8, cz), { couleur: lin(C.toit, 1.15) });
  groupe.add(lot.maillages('orangerie (silhouette)'));
  yield;
}

// ============================================================================================ la zone
const BOITES = { Z12a: [-58.5, 140.0, -38.5, 172.0], Z12b: [-68.5, 146.0, -52.5, 168.0] };
export default {
  id: 'Z12', nom: 'Placette du théâtre et palier sud-ouest',
  emprise: [[-62, 140], [-40, 140], [-40, 172], [-62, 172]],
  morceaux: [
    { id: 'Z12a', nom: 'placette, mur, talus, escalier de 20 marches', boite: BOITES.Z12a,
      construire: function* (ctx) { yield* placette(ctx); yield* escalierEtPortillon(ctx); } },
    { id: 'Z12b', nom: 'orangerie', boite: BOITES.Z12b, construire: orangerie, silhouette: silhouetteOrangerie },
  ],
  // PUR : la grille de l'orangerie et celle du sud de la placette, les bancs, les réverbères, les palmiers et le lit
  // (on ne marche pas dans les plantes), les rampes de l'escalier, le portillon. Le garde-corps du haut du mur et le
  // bâtiment sont déjà dans monde.json.
  obstacles(o) {
    preparer();
    const dur = (h) => ({ h, type: 'dur' });
    o.segment(X_GRILLE, OR.z0, X_GRILLE, OR.z1, { e: 0.12, h: 1.55, type: 'grille' });
    o.segment(X_GRILLE, 166.72, -46.0, 166.6, { e: 0.12, h: 1.55, type: 'grille' });
    for (const b of BANCS_BOIS) o.boite(b.x, b.z, 0.3, 0.9, 0, dur(0.9));
    for (const l of LAMPES) o.cercle(l.x, l.z, 0.12, dur(4.2));
    for (const p of PALMIERS) o.cercle(xMur(p.z) - 0.75, p.z, p.h < 1.2 ? 0.45 : 0.2, dur(Math.max(1, p.h)));
    for (const p of GRANDS_PALMIERS) o.cercle(p.x, p.z, 0.18, dur(p.h));
    for (const a of [...LIT_PLANTES, ...TALUS]) if (a.h > 0.9) o.cercle(a.x, a.z, a.R * 0.6, { h: a.h, type: 'haie' });
    // la haie de buis du bord du lit (on l'enjambe pas : 0,6 m) : un segment le long du lit
    o.segment(xMur(LIT.z0) - LIT.larg, LIT.z0, xMur(158.5) - LIT.larg, 158.5, { e: 0.45, h: 0.6, type: 'haie' });
    o.segment(xMur(158.5) - LIT.larg, 158.5, xMur(LIT.z1) - LIT.larg, LIT.z1, { e: 0.45, h: 0.6, type: 'haie' });
    rampesEnObstacles(o, ESC20);
    const { x, z, largeur } = PORTILLON, xa = x - largeur / 2 - 0.08, xb = x + largeur / 2 + 0.08;
    o.cercle(xa, z, 0.08, dur(1.6)); o.cercle(xb, z, 0.08, dur(1.6));
    o.segment(xa + 0.06, z + 0.05, xa + 0.06, z + largeur, { e: 0.05, h: 1.35, type: 'grille' });
    o.segment(xa - 1.3, z, xa - 0.05, z, { e: 0.1, h: 1.55, type: 'grille' });
    o.segment(xb + 0.05, z, xb + 1.3, z, { e: 0.1, h: 1.55, type: 'grille' });
  },
  bancs(b) {
    for (const x of BANCS_BOIS) { const a = (x.cap * Math.PI) / 180; b.push({ x: x.x + Math.sin(a) * 0.1, z: x.z + Math.cos(a) * 0.1, cap: x.cap, y: 0.45, source: 'Z12' }); }
  },
  lieux: [],
};
