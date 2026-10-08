// =====================================================================
//  ZONE Z11 — LE COTEAU BOISÉ SUD ET LA RAMPE OUEST (lot B5)
// =====================================================================
// Du jardin de la fontaine à l'allée haute (x -60 à -25 ; z 54 à 150 ; conception, § 1.3) : un sous-bois dense sur
// une pente de 30 % et plus, sous de grands arbres (ceux de arbres.bin, lot A5 : aucun n'est planté ici), le front raide
// au-dessus des pelouses basses, et ce qu'on y parcourt :
//  - LA RAMPE OUEST (OSM 121309573) : asphalte gris de 3,5 m, régularisée à 8,6 % par l'outil de données (tools/parc :
//    elle part de l'allée haute, au-dessus du théâtre, et descend en diagonale jusqu'au seuil du jardin de la fontaine),
//    bordures de béton des deux côtés, sauf aux carrefours ;
//  - LE CHEMIN x = -43 (OSM 362240526), asphalte de 2,5 m, du carrefour de la rampe au palier sud des caves (+5,8) ;
//  - LE RACCOURCI du théâtre (OSM 362567246), 2 m, raide (15 à 25 %, à pied), de l'allée haute du théâtre à la rampe ;
//  - deux candélabres, aux carrefours ; le sous-bois : lierre et feuilles au sol, arbustes le long des allées.
// Chaque allée est coupée net au bord de l'emprise de la zone qui la continue : la rampe s'arrête à x = -25 (le seuil,
// zone Z07) et à x = -54,6 (le bord de l'allée haute, Z17). Rien n'est posé sur la placette du théâtre (Z12 : x < -40,
// z > 140).
import {
  alea, surLigne, projeter, surAllee, dansBoite, Nappe, allee, maillageSol, bordures, fondreEtProteger, Touffes,
  maillageFeuillage, arbuste, couvreSol, candelabre,
} from './coteau.js';

// ============================================================================================ les données
// Les tracés, repère du terrain 1, tels que tools/parc/gabarits.json les donne à l'outil de données (monde.json) ; les
// hauteurs viennent de Monde.sol.
export const RAMPE_OUEST = [[-56.35, 144.9], [-49.41, 131.73], [-43.79, 119.18], [-41.7, 103.65], [-41.7, 94.36], [-42.53, 88.58],
  [-36.78, 66.49], [-33.45, 61.1], [-30.4, 58.41], [-24.67, 57.05], [-18.63, 56.56], [9.0, 56.81]];
const LR = 3.5;
const CHEMIN_X43 = [[-42.5, 88.6], [-42.8, 52.5], [-41.8, 50.4]];
const RACCOURCI = [[-42.11, 147.46], [-38.46, 138.88], [-49.41, 131.73]];
// Les allées voisines (le sous-bois s'en écarte) : l'allée haute (Z17), l'allée haute du théâtre et l'escalier de 20
// marches (Z12)
const ALLEE_HAUTE = [[-56.4, 144.9], [-57.1, 50.9]];
const ALLEE_THEATRE = [[-38.18, 169.64], [-39.35, 161.18], [-38.09, 153.37], [-41.14, 151.59], [-42.11, 147.46]];
const ESC20 = [[-48.6, 147.6], [-43.4, 147.5]];
const ALLEES = [
  { trace: RAMPE_OUEST, demi: LR / 2 }, { trace: CHEMIN_X43, demi: 1.25 }, { trace: RACCOURCI, demi: 1.0 },
  { trace: ALLEE_HAUTE, demi: 1.75 }, { trace: ALLEE_THEATRE, demi: 1.25 }, { trace: ESC20, demi: 1.1 },
];
// Hors du coteau : le niveau bas (Z07, x > -27), la placette du théâtre (Z12), le terre-plein et le palier des caves (Z06)
function horsCoteau(x, z) {
  if (x > -27) return true;
  if (x < -40 && z > 140) return true;
  return x > -47 && z < 53.5;
}
// Les morceaux (monde.json > morceaux). Z11a descend à z = 50 : le chemin x = -43 finit au palier sud des caves (+50,4).
// (Relecture : trois morceaux de 33 à 34 m, et non deux, dont Z11a de 52 m de côté : la conception, § 3.3 et D9, en
// veut 48 au plus.)
const BOITES = { Z11a: [-60, 50, -25, 83], Z11b: [-60, 83, -25, 116.5], Z11c: [-60, 116.5, -25, 150] };

// ============================================================================================ arbustes, candélabres (pur)
function arbustes() {
  const L = [], R = RAMPE_OUEST;
  const poser = (a) => {
    if (horsCoteau(a.x, a.z) || surAllee(ALLEES, a.x, a.z, a.R * 0.75 + 0.25)) return;
    for (const b of L) if (Math.hypot(b.x - a.x, b.z - a.z) < (a.R + b.R) * 0.55) return;
    L.push(a);
  };
  // le long de la rampe : un arbuste tous les 2,5 à 5 m, de part et d'autre, au ras de la bordure ou un peu en retrait
  const sFin = projeter(R, -27, 57.6).s;
  for (let s = 6, k = 0; s < sFin; s += 2.5 + 2.5 * alea(s, k, 521), k++) {
    const p = surLigne(R, s), cote = alea(s, k, 522) < 0.5 ? 1 : -1, e = LR / 2 + 0.6 + 2.2 * alea(s, k, 523);
    poser({ x: p.x - p.tz * e * cote, z: p.z + p.tx * e * cote, h: 1.4 + 1.6 * alea(s, k, 524), R: 0.8 + 0.7 * alea(s, k, 525),
      pal: ['sombre', 'moyen', 'laurier', 'sombre'][Math.floor(alea(s, k, 526) * 4)] });
  }
  // le sous-étage du bois : une maille de 5,5 m, un arbuste sur deux et demi (le sous-bois est plus dense qu'au nord)
  for (let z = 52; z < 150; z += 5.5) for (let x = -58.5; x < -27; x += 5.5) {
    const jx = x + (alea(x, z, 531) - 0.5) * 4, jz = z + (alea(z, x, 532) - 0.5) * 4;
    if (alea(jx, jz, 533) > 0.42) continue;
    poser({ x: jx, z: jz, h: 1.3 + 2.0 * alea(jx, jz, 534), R: 0.8 + 0.9 * alea(jx, jz, 535), pal: ['sombre', 'moyen', 'laurier', 'sombre', 'eleagnus'][Math.floor(alea(jx, jz, 536) * 5)] });
  }
  return L;
}
// Un candélabre à chaque carrefour (le chemin x = -43, le raccourci du théâtre), du côté aval de la rampe
function candelabres() {
  const L = [];
  for (const [x, z] of [[-42.5, 88.6], [-49.41, 131.73]]) {
    const s = projeter(RAMPE_OUEST, x, z).s, p = surLigne(RAMPE_OUEST, s - 3), e = LR / 2 + 0.5;
    // (la rampe descend vers le jardin, à abscisse croissante, vers z- et x+ : l'aval, côté est, est à sa droite)
    L.push({ x: p.x - p.tz * e, z: p.z + p.tx * e, vers: [p.x, p.z] });
  }
  return L;
}
let ARBUSTES = null, CANDELABRES = null;
function preparer() { if (!ARBUSTES) { ARBUSTES = arbustes(); CANDELABRES = candelabres(); } }

// ============================================================================================ le dessin
function* allees(ctx, id) {
  const { kit, groupe } = ctx, B = BOITES[id], gris = new Nappe();
  allee({ trace: RAMPE_OUEST, largeur: LR, boite: [Math.max(B[0], -54.6), B[1], Math.min(B[2], -25), B[3]], tuile: 4.04, dy: 0.03 }, gris);
  allee({ trace: CHEMIN_X43, largeur: 2.5, boite: B, tuile: 4.04, dy: 0.025 }, gris);
  allee({ trace: RACCOURCI, largeur: 2.0, boite: [B[0], B[1], B[2], Math.min(B[3], 147.4)], tuile: 4.04, dy: 0.028 }, gris);
  const m = maillageSol(gris.geometrie(), kit.materiau('asphalte'), 'asphalte');
  if (m) groupe.add(m);
  yield;
  const autres = (moi) => ALLEES.filter((a) => a.trace !== moi);
  const garder = (moi) => (x, z) => dansBoite(B, x, z) && !horsCoteau(x, z) && !surAllee(autres(moi), x, z, 0.05);
  for (const [trace, larg] of [[RAMPE_OUEST, LR], [CHEMIN_X43, 2.5], [RACCOURCI, 2.0]]) {
    for (const cote of [1, -1]) yield* bordures(kit, groupe, trace, larg, cote, garder(trace), { budget: ctx.budget });
    yield;
  }
}
function* construireMorceau(ctx, id) {
  const T = ctx.groupe.userData.tranches = [];
  let t0 = performance.now();
  const noter = (nom) => { const t = performance.now(); T.push([nom, Math.round((t - t0) * 10) / 10]); t0 = t; };
  const { K, groupe } = ctx, B = BOITES[id], budget = ctx.budget || (() => false);
  preparer();
  yield* allees(ctx, id); noter('allees');
  for (const c of CANDELABRES) if (dansBoite(B, c.x, c.z)) candelabre(ctx.kit, groupe, c);
  noter('candelabres');
  // les arbustes (ils portent ombre), par paquets de huit
  const feu = new Touffes();
  let k = 0;
  for (const a of ARBUSTES) {
    if (!dansBoite(B, a.x, a.z)) continue;
    arbuste(feu, a);
    if (++k % 8 === 0 && budget()) yield;
  }
  const m = maillageFeuillage(feu, K, 'arbustes du coteau', true);
  if (m) groupe.add(m);
  noter('arbustes ' + feu.n);
  yield;
  // le couvre-sol (il ne porte pas d'ombre)
  const couvre = new Touffes();
  // (relecture du lot B8 : le couvre-sol s'arrête à la crête. Au-dessus, c'est la terrasse haute — la terre battue du
  // bosquet (Z16), l'allée haute, le massif de la crête et la pelouse de la rupture 37 (Z17) — : ses touffes de lierre y
  // faisaient des plaques vert sombre sur la terre battue et le gazon, jusqu'à x -60)
  const crete = (x, z) => x < (z > 58.5 && z < 71.5 ? -52.6 : -53.8);   // (le centre de la touffe : ses feuilles s'étalent de 50 cm)
  yield* couvreSol(couvre, B, ALLEES, { pas: ctx.mobile ? 1.6 : 1.05, budget, garder: (x, z) => !horsCoteau(x, z) && !crete(x, z), graine: 37 + id.charCodeAt(3) });
  const s = maillageFeuillage(couvre, K, 'couvre-sol du coteau', false);
  if (s) groupe.add(s);
  noter('couvre-sol ' + couvre.n);
  yield* fondreEtProteger(ctx);
  noter('fusion');
}

// ============================================================================================ la zone
export default {
  id: 'Z11', nom: 'Coteau boisé sud et rampe ouest',
  emprise: [[-60, 54], [-25, 54], [-25, 150], [-60, 150]],
  morceaux: Object.keys(BOITES).map((id) => ({ id, boite: BOITES[id], construire: (ctx) => construireMorceau(ctx, id) })),
  // PUR : les obstacles, déclarés à l'installation, avant le relief (voir coteau.js)
  obstacles(o) {
    preparer();
    for (const a of ARBUSTES) if (a.R >= 0.9) o.cercle(a.x, a.z, a.R * 0.55, { h: a.h, type: 'arbuste' });
    for (const c of CANDELABRES) o.cercle(c.x, c.z, 0.15, { h: 3.6, type: 'dur' });
  },
  bancs() {},
  lieux: [],
};
