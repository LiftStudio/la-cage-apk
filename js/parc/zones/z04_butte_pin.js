// =====================================================================
//  ZONE Z04 : LA BUTTE DU PIN ET LA FIN DE LA RAMPE EST (lot B2 du chantier « parc complet »)
// =====================================================================
// Derrière le grillage du pin (z = 9,1), la butte monte à +0,8 / +1,1 (z 11-12) puis retombe sur le CHEMIN ROUGE : la
// fin de la rampe est, qui arrive du coteau au bout du mur de meulière (x -23,7, +1,9) et DESCEND vers la promenade du
// quai (x 10, -0,8). De l'autre côté du chemin, la pelouse du talus descend vers la terrasse du bassin (zone Z05), par
// un large escalier de 13 marches.
//
// CE QUE LES PHOTOS MONTRENT (tools/parc_becon_references.md § 13 ; photos 20260928_171717 et 171718, j1, j4, j6 ;
// ortho IGN agrandie) :
//  - au bout du mur, une MASSE D'ARBUSTES (cotonéaster, laurier) sous le pin parasol, qui vient mourir sur la bordure
//    de l'allée : ce sont les massifs de vegetationPin (js/court_parc.js), gardés ; au parc entier ils suivent le sol et
//    reculent hors de l'allée (voir là-bas) ; ici, la bande de litière brune entre leur pied et la bordure ;
//  - l'ALLÉE d'asphalte rouge brique, 3,5 m, bordée côté arbustes d'une bordure de béton haute d'une dizaine de
//    centimètres, côté pelouse d'une bordure presque affleurante ; elle descend en pente douce, sans dévers ;
//  - l'ESCALIER de 13 marches vers la terrasse : une large volée de béton gris clair (4,2 m, ortho : x -20,8 à -16,5)
//    entre deux limons, qui part du bord de l'allée ; à côté, sur le talus, une MOSAÏCULTURE (j1, j4, j6) ;
//  - au bout côté quai, dans la pelouse entre le chemin et le cadre de la terrasse, un IF taillé en cône (ortho : tache
//    sombre de 2 m en (5,8 ; 17,9) ; j1, j4, 171718) ; son jumeau est au bout sud de la terrasse (zone Z05).
//
// LA LIMITE AVEC Z10 (lot B5) : la rampe est est à Z10 jusqu'au bout du mur (conception § 1.3 : « (-23 ; 11 ; +1,4),
// puis Z04 ») ; Z04 en dessine la suite à partir de x = -23,7 (le bord de son emprise, le point de la trace le plus
// proche de (-23 ; 11)). La fourche, l'îlot et l'allée du mur sont à Z10. AVEC Z03 (lot B1) : le chemin s'arrête au bord
// de la promenade (sa largeur lue dans monde.json), qui le recouvre.
//
// Le sol, la pelouse du talus, les collisions (nappes, drapeaux) viennent des données (assets/parc/monde) ; la zone ne
// dessine que ce qui est posé dessus, avec le kit (js/parc/kit.js). Aucun Math.random : le hasard est kit.alea.
//
// Ce fichier offre aussi, à la zone Z05 (même lot), les OUTILS des deux terrasses (outilsB2 : sol du maillage, bandes,
// plaques, pavés, graminées, mosaïcultures, limons de rocaille) : ils ne dépendent que du kit et du monde, passés en
// paramètres (et de three, pour orienter les blocs des limons).
import * as THREE from 'three';

// ============================================================================================ données du monde
// monde.json (tools/parc/LISEZMOI.md § 4) tel que le parc entier l'a chargé : le contexte du lot A5 le donnera
// (ctx.donnees) ; en attendant, c'est celui du sol du parc (scene.userData.solParc.d, js/parc/index.js).
export function donneesDuMonde(ctx) {
  if (ctx && ctx.donnees) return ctx.donnees;
  const s = ctx && ctx.scene && ctx.scene.userData && ctx.scene.userData.solParc;
  return (s && s.d) || null;
}
export function parId(liste, id) { return (liste || []).find((e) => e && e.id === id) || null; }

// Les valeurs de monde.json dont la zone a besoin, recopiées (empreinte 7df1b2b4ca28ee7b) : elles ne servent que si
// les données manquent (outil, page de démonstration).
const REPLI = {
  rampe: { trace: [[-25.0, 11.0], [-21.0, 13.8], [-18.1, 14.2], [-8.0, 14.4], [10.0, 14.7]], largeur: 3.5 },
  escalier: { de: [-18.6, 15.95, 1.3], a: [-18.6, 21.6, -0.8], largeur: 4.2, marches: 13 },
  promenade: { trace: [[10.4, 0.0], [10.0, 14.7], [9.9, 23.6], [9.1, 47.8], [9.0, 56.8]], largeur: 3.0 },
};
// l'if taillé du bout nord (ortho, photos j1, j4, 171718) : pied, hauteur, rayon
// (relecture du lot B2 : 3,2 m et 1,15 m de rayon au pied — sur 171721 et j4, un cône trapu, large de près de deux
// mètres et demi à la base ; obstacle de 0,95 m)
const IF_NORD = { x: 5.8, z: 17.9, h: 3.2, r: 1.15 };
const X_DEBUT = -23.7;                                  // la rampe est passe de Z10 à Z04 (voir l'en-tête)

// ============================================================================================ outils des deux terrasses
// outilsB2(kit, Monde) : les pièces que le kit n'a pas, communes aux zones Z04 et Z05. Tout est dans le repère du
// terrain 1 (le Lot du kit ajoute Monde.dx aux maillages) ; hauteurs par Monde.sol, jamais écrites en dur, sauf sur la
// terrasse du bassin, plane (-0,8) par construction (gabarit « terrasse_bassin »), où une surface posée à hauteur fixe
// ne suit pas le creux du bassin.
export function outilsB2(kit, Monde) {
  const T = {};
  const { alea, bruit } = kit;
  const borne = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lisse = (a, b, x) => { const t = borne((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  T.lisse = lisse;

  // LE SOL TEL QU'ON LE VOIT. Monde.sol interpole ses quatre nœuds en bilinéaire ; le maillage du sol (js/monde_sol.js,
  // niveau fin) coupe chaque carré de 0,5 m en deux triangles (diagonale du coin x+ z- au coin x- z+) et insère les
  // bords du plateau dans sa trame. Sur un talus qui casse, les deux lectures diffèrent de 10 à 20 cm au milieu d'un
  // carré : ce qui est drapé à 2 cm au-dessus du sol doit suivre le TRIANGLE. Un carré à cheval sur un mur (découpé en
  // quarts par le maillage) garde la lecture de Monde.sol. Même calcul que solDuMaillage (js/court_parc.js).
  // (les bords du plateau ne sont insérés que dans la cellule du plateau : celle de 32 m qui part de (-24,7 ; -16),
  // calée sur la trame de 2 m comme le fait js/monde_sol.js, soit x -24…8 et z -15…17)
  const cale = (v, o) => o + 2 * Math.round((v - o) / 2);
  T.sol = (x, z) => {
    const R = Monde.repere;
    if (Monde.plat || !R) return 0;
    const d = Monde.dx, P = R.plateau || [-23.7, -9.1, 6.3, 9.1];
    const dansCellule = x >= cale(-24.7, R.x0) && x <= cale(7.3, R.x0) && z >= cale(-16, R.z0) && z <= cale(16, R.z0);
    const carre = (v, v0, bords) => {
      let a = v0 + R.pas * Math.floor((v - v0) / R.pas + 1e-9), b = a + R.pas;
      if (dansCellule) for (const e of bords) if (e > a + 1e-6 && e < b - 1e-6) { if (v >= e) a = e; else b = e; }
      return [a, b];
    };
    const [x0, x1] = carre(x, R.x0, [P[0], P[2]]), [z0, z1] = carre(z, R.z0, [P[1], P[3]]);
    const h = (a, b) => Monde.sol(a + d, b);
    const ha = h(x0, z0), hb = h(x1, z0), hc = h(x0, z1), hd = h(x1, z1);
    const na = Monde.nappe(x0 + d, z0);
    if ((na !== Monde.nappe(x1 + d, z1) || na !== Monde.nappe(x1 + d, z0) || na !== Monde.nappe(x0 + d, z1))
      && Math.max(ha, hb, hc, hd) - Math.min(ha, hb, hc, hd) >= 0.35) return Monde.sol(x + d, z);
    const u = (x - x0) / (x1 - x0), v = (z - z0) / (z1 - z0);
    return u + v <= 1 ? ha + u * (hb - ha) + v * (hc - ha) : hd + (1 - u) * (hc - hd) + (1 - v) * (hb - hd);
  };

  // ---------------------------------------------------------------- lignes
  // La partie d'une ligne qui avance en x (la rampe est, du mur au quai) comprise entre x = xa et x = xb.
  T.couperEnX = (ligne, xa, xb) => {
    const out = [];
    for (let i = 0; i < ligne.length - 1; i++) {
      const [ax, az] = ligne[i], [bx, bz] = ligne[i + 1];
      if (bx <= xa || ax >= xb || bx <= ax) continue;
      const en = (x) => [x, az + ((bz - az) * (x - ax)) / (bx - ax)];
      if (!out.length) out.push(ax < xa ? en(xa) : [ax, az]);
      out.push(bx > xb ? en(xb) : [bx, bz]);
    }
    return out;
  };
  // Une ligne décalée de `d` m à DROITE de son sens (négatif : à gauche), coudes en onglet (même règle que le kit).
  T.decaler = (ligne, d) => {
    const n = ligne.length, out = [];
    for (let i = 0; i < n; i++) {
      const A = ligne[Math.max(0, i - 1)], B = ligne[i], C = ligne[Math.min(n - 1, i + 1)];
      let rx = 0, rz = 0;
      if (i > 0) { const l = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1; rx += -(B[1] - A[1]) / l; rz += (B[0] - A[0]) / l; }
      if (i < n - 1) { const l = Math.hypot(C[0] - B[0], C[1] - B[1]) || 1; rx += -(C[1] - B[1]) / l; rz += (C[0] - B[0]) / l; }
      const l = Math.hypot(rx, rz) || 1; rx /= l; rz /= l;
      let m = 1;
      if (i > 0 && i < n - 1) { const l1 = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1; m = 1 / Math.max(0.35, (rx * -(B[1] - A[1])) / l1 + (rz * (B[0] - A[0])) / l1); }
      out.push([B[0] + rx * d * m, B[1] + rz * d * m]);
    }
    return out;
  };

  // ---------------------------------------------------------------- surfaces
  const hauteur = (o, x, z, nrm) => {
    if (o.y !== undefined) { nrm.x = 0; nrm.y = 1; nrm.z = 0; return typeof o.y === 'function' ? o.y(x, z) : o.y; }
    Monde.normale(x + Monde.dx, z, nrm);
    return T.sol(x, z) + (o.dy ?? 0.03);
  };
  // La hauteur d'une ALLÉE SANS DÉVERS (une rampe, tools/parc/LISEZMOI.md § 6 : y ne dépend que de l'abscisse le long de
  // sa trace) : celle du sol sur son axe, la même sur toute sa largeur. Drapée point par point, l'allée suivait aussi
  // l'accotement qui commence à son bord, là où les nœuds de la grille tombent déjà dans la pente : son bord plongeait
  // et le sol perçait (vues du bout du mur).
  T.solAxe = (Q) => T.sol(Q.x, Q.z);
  // UNE BANDE de `larg` m le long d'une ligne (allée, bande de dalles, litière), coudes en onglet (ni arrondis ni
  // chevauchements : une zone qui veut des coudes arrondis passe kit.arrondir(ligne, r)).
  //  o.y : hauteur fixe (nombre ou fonction (x, z)) ; sinon le sol + o.dy (0,03) ; o.decalage : axe de la bande à tant
  //  de mètres à droite de la ligne ; o.pas (0,5 m) le long, o.travers (0,45 m) en travers ; o.tuile ; o.couleur(x, z, t,
  //  s) → [r, g, b] (t : écart à l'axe de la bande, s : abscisse) ; UV : u en travers, v le long, en tuiles.
  // (DRAPÉE, une bande ne coïncide jamais avec les triangles du sol : là où il casse — le bord d'une allée qui retombe
  // sur son talus, un virage de rampe, dont la surface est gauche —, la corde de ses triangles passe sous lui et le sol
  // perce. D'où 3 cm au-dessus du sol, des sommets tous les 0,5 m, et deux colonnes de plus à 12 cm de chaque bord,
  // là où la cassure est la plus forte : relevé sur les premières vues du bout du mur, le sol perçait le long des deux
  // bords du chemin rouge.)
  T.bande = (lot, cle, ligne, larg, o = {}) => {
    const pts = kit.reechantillonner(ligne, o.pas ?? 0.5), n = pts.length;
    if (n < 2) return;
    const nA = Math.max(2, Math.ceil(larg / (o.travers ?? 0.45)) + 1), p = lot.part(cle);
    const tu = o.tuile ?? kit.TUILES[cle.split('#')[0]] ?? 1, off = o.decalage ?? 0, nrm = { x: 0, y: 1, z: 0 }, blanc = [1, 1, 1];
    const ts = [];
    for (let k = 0; k < nA; k++) ts.push(-larg / 2 + (larg * k) / (nA - 1));
    if (o.y === undefined && !o.axe && larg > 0.6) ts.splice(1, 0, -larg / 2 + 0.12), ts.splice(ts.length - 1, 0, larg / 2 - 0.12);
    let prev = null;
    for (let j = 0; j < n; j++) {
      const Q = pts[j];
      let tx = 0, tz = 0;
      if (j > 0) { const A = pts[j - 1], l = Math.hypot(Q.x - A.x, Q.z - A.z) || 1; tx += (Q.x - A.x) / l; tz += (Q.z - A.z) / l; }
      if (j < n - 1) { const B = pts[j + 1], l = Math.hypot(B.x - Q.x, B.z - Q.z) || 1; tx += (B.x - Q.x) / l; tz += (B.z - Q.z) / l; }
      const lt = Math.hypot(tx, tz) || 1; tx /= lt; tz /= lt;
      const rx = -tz, rz = tx;
      let m = 1;
      if (j > 0 && j < n - 1) { const A = pts[j - 1], l1 = Math.hypot(Q.x - A.x, Q.z - A.z) || 1; m = 1 / Math.max(0.35, (rx * -(Q.z - A.z)) / l1 + (rz * (Q.x - A.x)) / l1); }
      const rang = [], yA = o.axe ? T.solAxe(Q) + (o.dy ?? 0.03) : 0;
      if (o.axe) Monde.normale(Q.x + Monde.dx, Q.z, nrm);
      for (const t of ts) {
        const x = Q.x + rx * (t + off) * m, z = Q.z + rz * (t + off) * m;
        const y = o.axe ? yA : hauteur(o, x, z, nrm), c = o.couleur ? o.couleur(x, z, t, Q.s) : blanc;
        rang.push(lot.s(p, x, y, z, nrm.x, nrm.y, nrm.z, (t + larg / 2) / tu + (o.uDecal || 0), Q.s / tu + (o.vDecal || 0), c));
      }
      if (prev) for (let k = 0; k < ts.length - 1; k++) lot.quad(p, prev[k], prev[k + 1], rang[k + 1], rang[k]);
      prev = rang;
    }
  };
  // UNE PLAQUE : le quadrilatère C = [[x, z] x 4] (dans l'ordre du tour), découpé en nu x nv (interpolation
  // bilinéaire des coins) ; hauteur comme T.bande ; UV projetées sur le sol (x / tuile, z / tuile) : deux plaques
  // voisines se continuent sans couture de texture.
  T.plaque = (lot, cle, C, nu, nv, o = {}) => {
    const p = lot.part(cle), tu = o.tuile ?? kit.TUILES[cle.split('#')[0]] ?? 1, nrm = { x: 0, y: 1, z: 0 }, blanc = [1, 1, 1], id = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv;
      const x = (C[0][0] * (1 - u) + C[1][0] * u) * (1 - v) + (C[3][0] * (1 - u) + C[2][0] * u) * v;
      const z = (C[0][1] * (1 - u) + C[1][1] * u) * (1 - v) + (C[3][1] * (1 - u) + C[2][1] * u) * v;
      const y = hauteur(o, x, z, nrm), c = o.couleur ? o.couleur(x, z) : blanc;
      id.push(lot.s(p, x, y, z, nrm.x, nrm.y, nrm.z, x / tu + (o.uDecal || 0), z / tu + (o.vDecal || 0), c));
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      lot.quad(p, id[a], id[a + 1], id[a + nu + 2], id[a + nu + 1]);
    }
  };
  // UNE BORDURE qui suit une allée sans dévers : des blocs de béton de 0,9 m (joints de 5 mm), à `decalage` m à droite
  // de l'axe (négatif : à gauche), leur dessus `h` au-dessus de l'ALLÉE (pas du sol : kit.bordure pose le sien sur le sol,
  // qui plonge déjà dans l'accotement au bord d'une rampe), leur pied 0,4 m plus bas — la face côté talus descend dans
  // la pente et ferme le dessous du bord de l'allée. `exclure` : [xa, xb], pas de bordure entre ces x (un escalier).
  T.bordureAxe = (lot, axe, decalage, h, o = {}) => {
    const pts = kit.reechantillonner(axe, 0.9), w = o.large ?? 0.14, c = 0.012, prof = 0.4;
    const pr = [[-w / 2, -h - prof], [w / 2, -h - prof], [w / 2, -c], [w / 2 - c, 0], [-w / 2 + c, 0], [-w / 2, -c]];
    const surBord = (i) => {
      const Q = pts[i], A = pts[Math.max(0, i - 1)], B = pts[Math.min(pts.length - 1, i + 1)];
      const l = Math.hypot(B.x - A.x, B.z - A.z) || 1, rx = -(B.z - A.z) / l, rz = (B.x - A.x) / l;
      return [Q.x + rx * decalage, T.solAxe(Q) + h, Q.z + rz * decalage];
    };
    const P = pts.map((q, i) => surBord(i));
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[2] - a[2]);
      if (L < 0.05 || (o.exclure && (a[0] + b[0]) / 2 > o.exclure[0] && (a[0] + b[0]) / 2 < o.exclure[1])) continue;
      const g = 0.0025 / L, e = Math.min(0.012, L / 6) / L, t = alea(a[0], a[2], 61) * 0.08 + 0.9;
      const col = (x, y, z) => { const f = t * (0.94 + 0.1 * bruit(x * 1.3, z * 1.3, 62)) * (0.72 + 0.28 * lisse(-0.25, 0, y - a[1])); return [f, f * 0.99, f * 0.96]; };
      const lerp = (u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
      lot.prisme('beton', pr, [lerp(g), lerp(g + e), lerp(1 - g - e), lerp(1 - g)], { vertical: true, echelles: [0.9, 1, 1, 0.9], couleur: col,
        uDecal: alea(a[0], a[2], 63), vDecal: alea(a[0], a[2], 64) });
    }
  };
  // UNE LIGNE DE PAVÉS (pavés de granit, joints de dalles) : des carreaux plats de o.long x o.large, séparés par un
  // joint de o.joint où la surface d'en dessous se montre ; chacun sa teinte (alea). o.y fixe ou sol + o.dy (0,03).
  T.paves = (lot, ligne, o = {}) => {
    const L = o.long ?? 0.16, w = (o.large ?? 0.14) / 2, J = o.joint ?? 0.02, cle = o.cle || 'beton#sol';
    const p = lot.part(cle), tu = kit.TUILES[cle.split('#')[0]] ?? 1, teinte = o.teinte || [0.8, 0.79, 0.77], nrm = { x: 0, y: 1, z: 0 };
    for (let i = 0; i < ligne.length - 1; i++) {
      const [ax, az] = ligne[i], [bx, bz] = ligne[i + 1], l = Math.hypot(bx - ax, bz - az);
      if (l < 0.05) continue;
      const ux = (bx - ax) / l, uz = (bz - az) / l, rx = -uz, rz = ux, nb = Math.max(1, Math.round(l / L)), Lb = l / nb;
      for (let k = 0; k < nb; k++) {
        const s0 = k * Lb + J / 2, s1 = (k + 1) * Lb - J / 2, cxp = ax + ux * (s0 + s1) / 2, czp = az + uz * (s0 + s1) / 2;
        const v = (o.variation ?? 0.24) * (alea(cxp * 3.1, czp * 3.1, 51) - 0.5) + 1, c = [teinte[0] * v, teinte[1] * v, teinte[2] * v];
        const base = p.n;
        for (const [s, t] of [[s0, -w], [s1, -w], [s1, w], [s0, w]]) {
          const x = ax + ux * s + rx * t, z = az + uz * s + rz * t, y = hauteur({ y: o.y, dy: o.dy ?? 0.03 }, x, z, nrm);
          lot.s(p, x, y, z, nrm.x, nrm.y, nrm.z, x / tu, z / tu, c);
        }
        lot.quad(p, base, base + 1, base + 2, base + 3);
      }
    }
  };

  // ---------------------------------------------------------------- végétal
  // LES GRAMINÉES (pennisetum, fin septembre : des fontaines de 0,8 à 1,2 m, paille et vert passé, serrées au point de
  // ne faire qu'un long massif : photo 171721). Chaque touffe : cinq CARTES croisées de l'atlas des vivaces (ses deux
  // cases « graminée », des éventails de brins fins : tools/parc/textures_kit.py), plus deux cartes basses et larges,
  // vertes, qui bouchent le pied. Normales tournées vers le ciel : la touffe s'éclaire comme le sol, comme les massifs
  // du kit. `points` : [[x, z, échelle]] (1 = 1 m de haut) ; o.y : le pied (sinon le sol).
  // (La première version avait un cœur plein — un dôme de gazon teinté — : vu du bout du mur, un tas de galets ; et
  // 80 triangles de plus par touffe, hors du budget du morceau.)
  const CARTE = [[-0.5, 0, 0.004, 0.004], [0.5, 0, 0.246, 0.004], [0.5, 1, 0.246, 0.246], [-0.5, 1, 0.004, 0.246]];
  T.graminees = (lot, points, o = {}) => {
    const pF = lot.part('fleurs_vivaces#sol'), c = [0, 0, 0];
    const carte = (x, y, z, a, W, H, cell, t, paille, pied) => {
      const ca = Math.cos(a), sa = Math.sin(a), u0 = (cell % 4) / 4, v0 = 1 - (Math.floor(cell / 4) + 1) / 4, b = pF.n;
      for (const [du, dv, uu, vv] of CARTE) {
        const ao = pied + (1 - pied) * dv;
        c[0] = t * ao * (1 + 0.1 * paille); c[1] = t * ao; c[2] = t * ao * (1 - 0.12 * paille);
        lot.s(pF, x + ca * du * W, y - 0.05 + dv * H, z + sa * du * W, -sa * 0.25, 1, ca * 0.25, u0 + uu, v0 + vv, c);
      }
      lot.quad(pF, b, b + 1, b + 2, b + 3);
    };
    for (const [x, z, s] of points) {
      const y = o.y !== undefined ? o.y : T.sol(x, z), k = alea(x, z, 81);
      // la teinte : du vert passé à la paille, par plaques (une touffe sur deux a viré)
      const paille = borne(0.3 + 0.9 * bruit(x / 2.2, z / 2.2, 82) + 0.3 * (k - 0.5), 0, 1);
      const a0 = alea(x, z, 85) * Math.PI;
      // cinq éventails (o.eventails), qui retombent en fontaine ; la case paille (6) domine quand la touffe a viré
      const ne = o.eventails || 5;
      for (let q = 0; q < ne; q++) {
        const W = 1.35 * s * (0.85 + 0.3 * alea(x + q, z, 86)), H = 1.0 * s * (0.85 + 0.3 * alea(x, z + q, 87));
        const cell = alea(x, z, 88 + q) < 0.45 + 0.45 * paille ? 6 : 7, t = (0.85 + 0.3 * alea(x, z, 91 + q)) * (0.92 + 0.18 * paille);
        carte(x, y, z, a0 + (q * Math.PI) / ne, W, H, cell, t, paille, 0.5);
      }
      // le pied : deux éventails verts, bas et larges, plus sombres
      for (let q = 0; q < 2; q++) carte(x, y, z, a0 + Math.PI / 10 + (q * Math.PI) / 2, 1.2 * s, 0.55 * s, 7, 0.7 + 0.15 * alea(x, z, 95 + q), 0, 0.45);
    }
  };
  // UN MASSIF DÉCOUPÉ : kit.massifFleurs subdivise la terre de son contour jusqu'à des arêtes de 0,6 m, sur cinq
  // niveaux au plus ; pour un long massif, c'est mille triangles par triangle de départ (le massif fleuri de 4 x 16 m
  // en coûtait 22 000, un tiers du budget du morceau). Découpé en carreaux de `pas` m au plus, chacun ne descend que de
  // deux ou trois niveaux. `palette(x, z)` : la palette de chaque carreau (le motif d'une mosaïculture).
  //  x0, x1, z0, z1 : le rectangle (repère du terrain 1) ; o.arrondi : rayon des quatre coins (m) ; o.budget : le
  //  budget() du contexte de la zone. C'est un GÉNÉRATEUR (yield* T.massifDecoupe(...)) : il rend la main entre deux
  //  carreaux quand le budget de l'image est épuisé (une mosaïculture de vingt carreaux prenait 10 à 25 ms d'un bloc).
  //  o.ovale (relecture du lot B2) : au lieu du rectangle, le « superellipse » |u|^p + |v|^p = 1 qui y est inscrit
  //  (p = o.ovale : 2, une ellipse ; 3 et plus, un rectangle de plus en plus carré) ; chaque carreau est alors ce
  //  rectangle-là rogné par l'ovale, et palette() reçoit en plus rho, la « distance » normalisée de son centre au
  //  centre du massif (0 au milieu, 1 sur le bord).
  // Rogne le polygone convexe `poly` par le demi-plan s·(v - v0) >= 0 sur l'axe k (0 : x, 1 : z) — Sutherland-Hodgman.
  const rogner = (poly, k, v0, s) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length], da = s * (A[k] - v0), db = s * (B[k] - v0);
      if (da >= 0) out.push(A);
      if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
    }
    return out;
  };
  const aire = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const A = p[i], B = p[(i + 1) % p.length]; s += A[0] * B[1] - B[0] * A[1]; } return Math.abs(s) / 2; };
  T.massifDecoupe = function* (groupe, x0, x1, z0, z1, palette, o = {}) {
    const pas = o.pas ?? 1.6, nx = o.nx || Math.max(1, Math.round((x1 - x0) / pas)), nz = o.nz || Math.max(1, Math.round((z1 - z0) / pas));
    const r = Math.min(o.arrondi ?? 0, (x1 - x0) / nx / 2, (z1 - z0) / nz / 2);
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, hx = (x1 - x0) / 2, hz = (z1 - z0) / 2, p = o.ovale || 0;
    let ovale = null;
    if (p) {
      ovale = [];
      for (let k = 0; k < 64; k++) {
        const t = (k / 64) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
        ovale.push([mx + hx * Math.sign(c) * Math.pow(Math.abs(c), 2 / p), mz + hz * Math.sign(s) * Math.pow(Math.abs(s), 2 / p)]);
      }
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = x0 + ((x1 - x0) * i) / nx, b = x0 + ((x1 - x0) * (i + 1)) / nx, c = z0 + ((z1 - z0) * j) / nz, d = z0 + ((z1 - z0) * (j + 1)) / nz;
      let poly = [];
      if (ovale) {
        poly = rogner(rogner(rogner(rogner(ovale, 0, a, 1), 0, b, -1), 1, c, 1), 1, d, -1);
        if (poly.length < 3 || aire(poly) < 0.06) continue;
      } else {
        // les coins du grand rectangle sont arrondis, pas ceux des carreaux entre eux
        const coins = [[b, c, i === nx - 1 && j === 0, -Math.PI / 2], [b, d, i === nx - 1 && j === nz - 1, 0], [a, d, i === 0 && j === nz - 1, Math.PI / 2], [a, c, i === 0 && j === 0, Math.PI]];
        for (const [px, pz, rond, a0] of coins) {
          if (!rond || r < 0.05) { poly.push([px, pz]); continue; }
          const qx = px - Math.sign(Math.cos(a0 + Math.PI / 4)) * r, qz = pz - Math.sign(Math.sin(a0 + Math.PI / 4)) * r;
          for (let k = 0; k <= 4; k++) { const t = a0 + (k / 4) * Math.PI / 2; poly.push([qx + Math.cos(t) * r, qz + Math.sin(t) * r]); }
        }
      }
      const cx = (a + b) / 2, cz = (c + d) / 2, rho = p ? Math.pow(Math.pow(Math.abs(cx - mx) / hx, p) + Math.pow(Math.abs(cz - mz) / hz, p), 1 / p) : 0;
      groupe.add(kit.massifFleurs({ poly, palette: palette(cx, cz, i, j, nx, nz, rho), densite: o.densite ?? 1.3, bombe: o.bombe ?? 0.04 }));
      if (o.budget && o.budget()) yield;
    }
  };
  // UNE MOSAÏCULTURE sur le talus (j1, j4, j6 ; 171721 : un tapis de plantes basses à motif, bordé) : un rectangle de
  // demi-côtés rx, rz, centré en (cx, cz), en carreaux d'environ 0,9 x 0,8 m : le rang du bord en rouge d'automne
  // (bégonias, sauges), le cœur en losanges de deux palettes (o.coeur, 'vivaces' par défaut, et o.coeur2, 'rouge').
  // Rend dans `groupe` une vingtaine de massifs, trois matériaux (la terre et deux atlas de fleurs) : la fusion du
  // morceau les coud en trois blocs. Générateur, comme T.massifDecoupe (o.budget).
  // (Relecture du lot B2 : le second cœur était en 'tulipes', la palette de PRINTEMPS du kit — tulipes, narcisses, sur
  // de hautes tiges jaunes — ; la conception (§ 6) fixe la saison à la fin septembre, massifs d'automne, et les
  // photos de ce jour-là (171718, 171721) montrent des tapis rouges, blancs et pourpres, ras. Un atlas de moins par
  // morceau, aussi : un appel de dessin de moins.)
  // (Et sa FORME : sur 171721, les deux massifs du talus sud sont des coussins OVALES, en losange arrondi, de 3 à 4 m,
  // pas des rectangles : o.ovale, l'exposant du superellipse de T.massifDecoupe — 2,4 par défaut ; 0 pour le
  // rectangle aux coins arrondis de la première version. En ovale, le bord est l'anneau extérieur, rho > 0,7.)
  T.mosaique = function* (groupe, cx, cz, rx, rz, o = {}) {
    const nx = Math.max(3, Math.round((2 * rx) / 0.9)), nz = Math.max(3, Math.round((2 * rz) / 0.8)), p = o.ovale ?? 2.4;
    yield* T.massifDecoupe(groupe, cx - rx, cx + rx, cz - rz, cz + rz, (x, z, i, j, _nx, _nz, rho) => {
      if (p ? rho > 0.7 : (i === 0 || j === 0 || i === nx - 1 || j === nz - 1)) return o.bordure || 'rouge';
      return (Math.abs(i - (nx - 1) / 2) + Math.abs(j - (nz - 1) / 2)) % 2 < 1 ? (o.coeur || 'vivaces') : (o.coeur2 || 'rouge');
    }, { nx, nz, arrondi: 0.35, ovale: p, densite: 1.5, bombe: 0.03, budget: o.budget });
  };

  // LES LIMONS DE ROCAILLE des escaliers de 13 marches (relecture du lot B2). Sur les photos (j3 de face, les deux
  // volées ; j4 et j1 d'en haut ; j6 de biais), chaque volée est bordée, des deux côtés, non d'un muret d'échiffre lisse
  // (celui de kit.escalier) mais d'une BANDE DE BLOCS de calcaire gris clair, bruts, de 35 à 40 cm de large, posés en
  // file sur la pente du talus : leur dessus suit la ligne des nez, 15 à 20 cm plus haut, chacun un peu de travers,
  // et ils débordent d'une demi-marche sur le gazon en bas ; en haut, ils s'arrêtent au bord du chemin (dont la
  // bordure, ouverte devant la volée, les laisse passer). Ici, des boîtes à arêtes
  // abattues de la matière « taille » (calcaire bouchardé du kit), de trois longueurs et deux largeurs (la géométrie
  // de boîte du kit est gardée par dimensions : on les arrondit), teinte, dévers et lacet tirés de kit.alea. Leur
  // pied descend 18 cm sous le plus bas du sol et du nez : ils ne flottent jamais sur le talus, qui les enterre en
  // partie là où il est plus haut que la volée.
  //  esc : le gabarit (de, a, marches, largeur) ; ce sont les MÊMES nez que kit.escalier (plan incliné de `de` à `a`).
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
  T.limonsRocaille = (lot, esc, larg) => {
    let [x0, z0, y0] = esc.de, [x1, z1, y1] = esc.a;
    if (y0 > y1) [x0, z0, y0, x1, z1, y1] = [x1, z1, y1, x0, z0, y0];
    const L = Math.hypot(x1 - x0, z1 - z0) || 1, dx = (x1 - x0) / L, dz = (z1 - z0) / L, rx = -dz, rz = dx;
    const n = Math.max(1, esc.marches | 0), h = (y1 - y0) / n, g = L / n;
    const nez = (s) => borne(y0 + (s / g + 0.5) * h, y0, y1), pente = Math.atan2(y1 - y0, L), cap = Math.atan2(dx, dz);
    // (la file s'arrête 25 cm avant le haut de la volée : la première marche mord de 20 cm sur le chemin rouge, dont la
    // bordure, ouverte devant l'escalier, reprend là)
    const fin = L - 0.25;
    for (const cote of [-1, 1]) {
      const tc = cote * (larg / 2 + 0.17);
      for (let s = -0.25; s < fin - 0.2;) {
        const lb = Math.min([0.38, 0.48, 0.6][Math.floor(alea(x0 + cote, s, 171) * 3)], fin - s), sm = s + lb / 2;
        const tj = tc + 0.06 * (alea(sm, cote, 181) - 0.5);
        const cx = x0 + dx * sm + rx * tj, cz = z0 + dz * sm + rz * tj;
        const haut = nez(sm) + 0.13 + 0.08 * alea(cx, cz, 172), pied = Math.min(T.sol(cx, cz), nez(sm)) - 0.18;
        const hb = Math.min(1.2, Math.max(0.3, Math.ceil((haut - pied) / 0.1) * 0.1)), wb = alea(cx, cz, 173) < 0.5 ? 0.34 : 0.4;
        _e.set(-pente + 0.08 * (alea(cx, cz, 174) - 0.5), cap + 0.16 * (alea(cx, cz, 175) - 0.5), 0.1 * (alea(cx, cz, 176) - 0.5));
        _p.set(cx, haut - hb / 2, cz);
        _m4.compose(_p, _q.setFromEuler(_e), _s);
        // calcaire GRIS clair (la matière « taille » est blonde : on la refroidit), un bloc plus clair ou plus sombre
        // que l'autre ; le pied, dans l'herbe, plus sombre
        const t = 0.72 + 0.2 * alea(cx, cz, 177), chaud = 0.03 * (alea(cx, cz, 178) - 0.5);
        const pb = haut - hb;
        lot.boite('taille', wb, hb, Math.round((lb - 0.04) * 20) / 20, _m4, { chanfrein: 0.05, uvDecal: [alea(cx, cz, 179) * 3, alea(cz, cx, 180) * 3],
          couleur: (x, y) => { const f = t * (0.62 + 0.38 * lisse(pb + 0.05, pb + 0.35, y)); return [f * (0.86 + chaud), f * 0.87, f * (0.88 - chaud)]; } });
        s += lb;
      }
    }
  };

  // Les maillages d'un Lot de zone. Les cartes détourées (graminées : matériau à alphaTest) ne portent pas d'ombre et
  // sont déclarées comme du feuillage, comme celles de kit.massifFleurs : la fusion du morceau, qui les coud ensemble,
  // garde alors le drapeau quel que soit l'ordre des maillages.
  T.maillages = (lot, nom) => {
    const g = lot.maillages(nom);
    for (const m of g.children) if (m.material && m.material.alphaTest > 0) { m.castShadow = false; m.userData.feuillage = true; }
    return g;
  };

  // ---------------------------------------------------------------- teintes
  // Une surface de sol (enrobé, dalles) : des taches lentes de 3 à 4 m qui cassent la répétition de la photo, et les
  // bords un peu plus sombres (terre, feuilles) quand on donne la demi-largeur `demi` (t : écart à l'axe).
  T.taches = (base, graine, ampl = 0.1, demi = 0) => {
    const c = [0, 0, 0];
    return (x, z, t = 0) => {
      const e = demi ? Math.abs(t) / demi : 0;
      const f = (1 - 0.14 * lisse(0.78, 1, e)) * (1 + ampl * (bruit(x / 3.5, z / 3.5, graine) - 0.5)) * (1 + 0.5 * ampl * (bruit(x / 0.9, z / 0.9, graine + 1) - 0.5));
      c[0] = base[0] * f; c[1] = base[1] * f; c[2] = base[2] * f;
      return c;
    };
  };
  return T;
}

// ============================================================================================ la zone
function* construire(ctx) {
  const { kit, Monde, groupe } = ctx, T = outilsB2(kit, Monde), D = donneesDuMonde(ctx);
  const lot = new kit.Lot('Z04');
  // ---- 1. LE CHEMIN ROUGE : la fin de la rampe est, du bout du mur au bord de la promenade ----
  const rampe = parId(D && D.rampes, 'rampe_est') || REPLI.rampe, larg = rampe.largeur || 3.5;
  // (le bord ouest de la promenade, à la hauteur où le chemin la rejoint : il s'arrête là, elle le recouvre)
  const prom = parId(D && D.allees, 'promenade_basse') || REPLI.promenade;
  const zFin = rampe.trace[rampe.trace.length - 1][1];
  const xFin = prom.trace.reduce((best, p, i, t) => {
    if (i === 0) return best;
    const [ax, az] = t[i - 1], [bx, bz] = p;
    return zFin >= Math.min(az, bz) && zFin <= Math.max(az, bz) && bz !== az ? ax + ((bx - ax) * (zFin - az)) / (bz - az) : best;
  }, 10) - (prom.largeur || 3) / 2 + 0.05;
  // (les coudes arrondis comme le kit arrondit ses allées : rayon 1,5 fois la largeur, 4 m au plus)
  const axe = kit.arrondir(T.couperEnX(rampe.trace, X_DEBUT, xFin), Math.min(larg * 1.5, 4));
  // asphalte rouge brique (photos 171717 et 171718 : #8a5a58 à l'ombre, plus chaud au soleil), usé au milieu, bords
  // plus sombres ; un peu éteint (-7 % de rouge) : à la même lumière que le cadre de j4, le matériau du kit sortait
  // plus vif que la photo
  const rouge = T.taches([0.9, 0.9, 0.93], 41, 0.12, larg / 2);
  T.bande(lot, 'asphalteRouge#sol', axe, larg, { axe: true, dy: 0.03, couleur: rouge });
  yield;
  // les BORDURES : côté arbustes (à gauche en allant vers le quai), une bordure de béton haute (171717 : elle tient la
  // litière des arbustes) ; côté pelouse, presque affleurante, ouverte devant l'escalier
  const esc = parId(D && D.escaliers, 'escalier13_pin') || REPLI.escalier;
  const xe = esc.de[0], le = esc.largeur || 4.2;
  T.bordureAxe(lot, T.couperEnX(axe, -22.9, xFin), -(larg / 2 + 0.07), 0.1);
  if (ctx.budget()) yield;
  // (ouverte aussi au droit des limons de rocaille, qui débordent de 37 cm de chaque côté de la volée)
  T.bordureAxe(lot, axe, larg / 2 + 0.07, 0.05, { exclure: [xe - le / 2 - 0.45, xe + le / 2 + 0.45] });
  yield;
  // la LITIÈRE entre la bordure et le pied des arbustes : feuilles, aiguilles du pin, terre (le bord du talus de
  // vegetationPin, qui s'arrête un peu avant l'allée, glisse dessous)
  T.bande(lot, 'terre#sol', T.couperEnX(axe, -22.6, xFin - 0.4), 0.9, { decalage: -(larg / 2 + 0.14 + 0.45), dy: 0.04, travers: 0.3,
    couleur: T.taches([0.78, 0.66, 0.56], 43, 0.22) });
  yield;
  // ---- 2. L'ESCALIER DE 13 MARCHES vers la terrasse (marches de béton gris : j1, j4, j6) ----
  // (il part du bord même du chemin : gabarit « escalier13_pin », dont la première marche est à z 15,95, là où la
  // rampe finit ; plus loin, l'accotement de la rampe creusait un fossé entre les deux)
  // Ses limons ne sont pas ceux du kit (murets lisses) : des blocs de calcaire brut, voir T.limonsRocaille.
  groupe.add(kit.escalier({ de: esc.de, a: esc.a, marches: esc.marches || 13, largeur: le, limon: false, materiau: 'beton', usure: 0.6 }));
  if (ctx.budget()) yield;
  T.limonsRocaille(lot, esc, le);
  yield;
  // ---- 3. LA MOSAÏCULTURE du talus, à l'est de l'escalier (j1, j4, j6), et sa sœur à l'ouest (j1) ----
  // (j4 : des rectangles aux angles très arrondis, d'où un ovale presque carré, exposant 3,2)
  yield* T.mosaique(groupe, xe + le / 2 + 5.4, 18.95, 3.1, 1.25, { budget: ctx.budget, ovale: 3.2 });
  yield;
  yield* T.mosaique(groupe, xe - le / 2 - 4.6, 19.05, 2.6, 1.15, { budget: ctx.budget, ovale: 3.2 });
  yield;
  // ---- 4. L'IF TAILLÉ en cône du bout nord, dans la pelouse côté quai ----
  groupe.add(kit.ifConique({ x: IF_NORD.x, z: IF_NORD.z, h: IF_NORD.h, r: IF_NORD.r }));
  groupe.add(T.maillages(lot, 'butte du pin'));
}

export default {
  id: 'Z04', nom: 'Butte du pin et fin de la rampe est',
  emprise: [[-23.7, 9.1], [10, 9.1], [10, 22], [-23.7, 22]],
  // (la boîte déborde de l'emprise vers x- : la mosaïculture ouest est sur le même talus, à l'ouest de l'escalier, dans
  // le coin que ni Z05 ni Z06 ni Z10 ne dessinent)
  morceaux: [{ id: 'Z04a', boite: [-28.5, 9.1, 10, 22.5], construire }],
  // (pur, sans three : lu pour toutes les zones à l'installation)
  obstacles(o) {
    o.cercle(IF_NORD.x, IF_NORD.z, 0.95, { h: IF_NORD.h, type: 'arbuste', source: 'if taillé du bout nord (Z04)' });
  },
  bancs() {},
  lieux: [],
};
