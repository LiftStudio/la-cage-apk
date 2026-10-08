// =====================================================================
//  LES MIPMAPS DES FEUILLAGES DÉCOUPÉS (lot G11)
// =====================================================================
// Les feuillages des arbres 3D (modèles GLB du parc : tilleul, saule, cèdre, oranger du Mexique ; platane du parc
// entier ; arbre des rues tree2.glb, son rameau de platane, et le lierre de La Cage) FONÇAIENT AU LOIN. De loin, la
// carte graphique lit leur texture dans ses versions réduites (les mipmaps), qu'elle fabrique elle-même en
// moyennant chaque canal SÉPARÉMENT : la couleur des pixels vides entre les feuilles (alpha nul) entre dans la
// moyenne au même titre que celle des feuilles. Or cette couleur est du NOIR dans les textures légères (les
// versions « _mobile » — que le PC prend aussi pour les arbres lointains —, tree2.glb, le rameau et le lierre de
// téléphone), et une couleur quelconque dans les autres (jaune vif sous les feuilles sèches de l'oranger, gris-vert
// clair sous le saule). Mesuré sur la carte graphique, niveau par niveau (luminance des texels qui passent la
// découpe, rapportée au niveau 0) : de -6 à -26 % au niveau 3, jusqu'à -60 % plus loin ; le saule, lui, s'ÉCLAIRCIT
// (+8 à +13 %). Rendue à 64 pixels de large au lieu de 1 024, une couronne de tilleul sort 33 % plus sombre, les
// arbres de l'île 57 % — et le saule deux fois plus clair.
// Et la découpe (alphaTest) se trompait de couverture : les shaders relevaient l'alpha d'un quart par niveau (le
// « 1 + 0,25 × mip » de materiauFeuilles), une règle unique pour des seuils de découpe de 0,16 (saule) à 0,76
// (rameaux du cèdre) : au niveau 5, 2,3 à 2,7 fois trop de feuilles pour le tilleul et le saule, 0,6 fois pour les
// rameaux du cèdre.
//
// On refait donc la chaîne des mipmaps AU CHARGEMENT de la texture, une fois pour toutes :
//  1. la SAIGNÉE (comme saigner, js/court_parc.js, lot L8) : chaque pixel presque vide reçoit la couleur moyenne,
//     pondérée par l'alpha, du plus petit bloc de 2^k pixels qui l'entoure et qui porte des feuilles. Au niveau 0,
//     le filtrage bilinéaire au bord d'une feuille ne va plus chercher de noir (le liseré sombre des découpes de
//     près). L'alpha, lui, ne change pas : l'image vue de près reste la même ;
//  2. chaque niveau est la moyenne (en lumière linéaire, comme la carte graphique filtre une texture sRVB) des seuls
//     texels du niveau 0 qui PASSENT LA DÉCOUPE dans son bloc : la couleur d'un texel lointain est celle des feuilles
//     qu'il résume, ni celle du vide, ni celle du liseré à demi transparent que la découpe jette ;
//  3. l'alpha de chaque niveau est MIS À L'ÉCHELLE pour que la part de l'écran couverte reste celle du niveau 0
//     (préservation de la couverture, le procédé de « The Witness », I. Castaño 2010), comptée sur des échantillons
//     lus comme la carte graphique les lit (bilinéaire) : une couronne vue de loin est la même couronne réduite, ni
//     trouée ni bouchée. Le relevé d'alpha des shaders (uMipA) est alors éteint pour ces textures ; il reste en
//     secours si la chaîne n'a pas pu être faite (pas d'alpha-to-coverage : l'image n'est pas multi-échantillonnée,
//     et le MSAA coûterait trop sur la Radeon et le téléphone) ;
//  4. la couleur moyenne des texels qui passent, à chaque niveau, est ramenée à celle du niveau 0.
// Mesuré sur la carte graphique après (luminance des texels qui passent la découpe, rapportée au niveau 0, pour
// toutes les cartes de feuillage des cinq terrains) : à ±1 % jusqu'aux niveaux de 8 texels ; couverture à ±2 %
// (sauf les 2 à 4 derniers niveaux, de 4 x 4 texels et moins, où la part ne peut plus tomber juste).
// Et la couronne entière, rendue seule à 1 024, 256 puis 128 px de large au lieu de 2 048 (même caméra, même lumière :
// le même arbre, de plus en plus loin), cinq terrains, extrême et moyenne, pire écart : tilleul -20 % -> -2 %, arbres
// de l'île -48 à -53 % -> -3 à -4 %, cèdre -31 à -33 % -> +2 à +4 %, saule +32 % -> +1 %, oranger du Mexique -45 à
// -48 % -> -2 à -4 %, platanes des rues (rameau) -8 à -19 % -> -4 à -5 %. Restent au-delà de 5 %, à 128 px seulement,
// deux pièces clairsemées réduites à quelques pixels : les feuilles sèches de l'oranger (+4 % -> -6 à -7 %) et les
// rameaux du cèdre (-48 à -54 % -> -5 à -18 % selon le vent ; ils disparaissaient entièrement à 64 px, ils restent).
//
// COÛT : rien à l'image (la même texture, les mêmes lectures ; un relevé d'alpha en moins dans le shader). Mesuré dans
// la même page, la chaîne contre les mipmaps de la carte graphique sur les mêmes feuillages (parc, extrême, 1080, trois
// vues) : de -0,9 à +0,6 ms sur 70 à 80 ms, dans le bruit ; mêmes appels de dessin, mêmes triangles. Au
// chargement : le calcul se fait dans des Workers (hors du fil du jeu) — 70 à 300 ms par carte de 512 à 1 024 px
// sur le PC, 1,2 s pour l'atlas du lierre (2 048 px) — ; le fil du jeu ne fait que lire les pixels (drawImage +
// getImageData) et envoyer la chaîne à la carte graphique. Un modèle d'arbre n'est posé qu'une fois ses cartes
// prêtes (voir chargerModele, js/court_parc.js) : au parc, en téléphone simulé sur le PC, les arbres arrivent 1,5 s
// plus tard (le décor dessiné tient la place jusque-là). La chaîne reste en mémoire (ImageData, 1,33 fois l'image) : three
// la renvoie à la carte graphique quand l'anisotropie change (fx.setAniso). Sans Worker, le même calcul se fait
// sur le fil du jeu.
import * as THREE from 'three';

// LE CALCUL, sans rien d'extérieur : la fonction est recopiée telle quelle dans le Worker (toString).
// `d` : RVBA 8 bits non prémultipliés (w x h) ; `seuil` : le seuil de découpe du matériau. Rend les niveaux
// [{ w, h, d }] du niveau 0 (la saignée) jusqu'à 1 x 1.
function chaineMipmaps(d, w, h, seuil) {
  // les deux sens de la courbe sRVB (tables)
  const LIN = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  const NS = 16384, SRGB = new Uint8Array(NS + 1);
  for (let i = 0; i <= NS; i++) { const c = i / NS; SRGB[i] = Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); }
  const enS = (v) => SRGB[v <= 0 ? 0 : v >= 1 ? NS : Math.round(v * NS)];
  const n0 = w * h, AB = 12;                  // un pixel d'alpha < 12/255 est « vide » : sa couleur est refaite
  // 1. LA SAIGNÉE : pyramide des sommes (couleur linéaire x alpha, alpha) des pixels pleins, du bloc de 2 x 2 à la
  // toile entière ; un pixel vide prend la couleur du plus petit bloc qui porte des feuilles
  const pyr = [];
  let lw = w, lh = h, src = null;
  while (lw > 1 || lh > 1) {
    const nw = Math.max(1, (lw + 1) >> 1), nh = Math.max(1, (lh + 1) >> 1), s = new Float32Array(nw * nh * 4);
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const o = ((y >> 1) * nw + (x >> 1)) * 4;
        if (src) { const i = (y * lw + x) * 4; s[o] += src[i]; s[o + 1] += src[i + 1]; s[o + 2] += src[i + 2]; s[o + 3] += src[i + 3]; }
        else {
          const i = (y * w + x) * 4, a = d[i + 3];
          if (a >= AB) { const k = a / 255; s[o] += LIN[d[i]] * k; s[o + 1] += LIN[d[i + 1]] * k; s[o + 2] += LIN[d[i + 2]] * k; s[o + 3] += k; }
        }
      }
    }
    pyr.push([nw, nh, s]); src = s; lw = nw; lh = nh;
  }
  // (de la toile entière au bloc de 2 x 2, chaque bloc reçoit sa couleur moyenne — ou, vide, celle de son parent :
  // le quatrième nombre dit s'il en a une)
  for (let k = pyr.length - 1; k >= 0; k--) {
    const [nw, nh, s] = pyr[k], par = pyr[k + 1];
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        const o = (y * nw + x) * 4, sa = s[o + 3];
        if (sa > 0) { s[o] /= sa; s[o + 1] /= sa; s[o + 2] /= sa; s[o + 3] = 1; }
        else if (par) { const q = ((y >> 1) * par[0] + (x >> 1)) * 4, ps = par[2]; s[o] = ps[q]; s[o + 1] = ps[q + 1]; s[o + 2] = ps[q + 2]; s[o + 3] = ps[q + 3]; }
      }
    }
  }
  const d0 = new Uint8ClampedArray(d);
  // couleur linéaire, alpha et poids de travail du niveau 0 (le point de départ des moyennes). Le POIDS d'un texel
  // dans les moyennes : 1 s'il passe la découpe, presque rien sinon (son alpha, au millième, plus un rien pour les
  // vides) — de près, on ne voit QUE les texels qui passent : un texel lointain doit avoir leur couleur moyenne, pas
  // celle du liseré à demi transparent qui les borde et que la découpe jette (plus sombre sous les rameaux du cèdre,
  // découpés à 0,76 : pondérée par l'alpha, la couleur y perdait 11 à 19 % aux niveaux de 8 et 4 texels)
  let R = new Float32Array(n0), V = new Float32Array(n0), B = new Float32Array(n0), A = new Float32Array(n0), P = new Float32Array(n0);
  let cible = 0;                                // la part de texels qui passent la découpe au niveau 0
  const m0 = [0, 0, 0];                         // et leur couleur moyenne (linéaire)
  const p0w = pyr.length ? pyr[0][0] : 0, p0 = pyr.length ? pyr[0][2] : null;   // (les blocs de 2 x 2, saignés)
  for (let y = 0, j = 0; y < h; y++) {
    for (let x = 0; x < w; x++, j++) {
      const i = j * 4, a = d[i + 3];
      A[j] = a / 255;
      if (a / 255 >= seuil) { cible++; P[j] = 1; m0[0] += LIN[d[i]]; m0[1] += LIN[d[i + 1]]; m0[2] += LIN[d[i + 2]]; }
      else P[j] = (A[j] + 1 / 1024) / 1024;
      if (a >= AB) { R[j] = LIN[d[i]]; V[j] = LIN[d[i + 1]]; B[j] = LIN[d[i + 2]]; continue; }
      if (!p0) continue;
      const o = ((y >> 1) * p0w + (x >> 1)) * 4;
      if (p0[o + 3] > 0) {
        R[j] = p0[o]; V[j] = p0[o + 1]; B[j] = p0[o + 2];
        d0[i] = enS(R[j]); d0[i + 1] = enS(V[j]); d0[i + 2] = enS(B[j]);
      }
    }
  }
  if (cible) for (let c = 0; c < 3; c++) m0[c] /= cible;
  // LA COUVERTURE VUE À TRAVERS LE FILTRAGE. La carte graphique ne lit pas les texels à leur centre mais entre eux,
  // en mélangeant les quatre voisins (bilinéaire) : un texel lointain qui passe tout juste la découpe, entouré de
  // texels qui ne la passent pas, ne couvre presque rien à l'écran. Compter les texels qui passent ne suffisait pas :
  // vue à travers le filtrage, la couverture fondait de 15 à 30 % aux niveaux 4 à 6 (saule, tilleul, rameaux du
  // cèdre), et les couronnes lointaines s'éclaircissaient en dentelle. On compte donc des ÉCHANTILLONS : k x k par
  // texel, lus comme la carte graphique (bilinéaire, texture répétée). `lire(A, w, h, k, f)` appelle f(ligne, n) pour
  // chaque ligne d'échantillons (valeurs dans ligne[0..n[) et rend leur nombre total ; `compter` rend le nombre
  // d'échantillons qui passent la découpe, alphas plafonnés à 1 après mise à l'échelle par `sx`.
  const grille = (n, k) => {
    const a = new Int32Array(n * k), b = new Int32Array(n * k), t = new Float32Array(n * k);
    for (let i = 0; i < n * k; i++) { const p = (i + 0.5) / k - 0.5, i0 = Math.floor(p); t[i] = p - i0; a[i] = (i0 + n) % n; b[i] = (i0 + 1) % n; }
    return { a, b, t };
  };
  const lire = (Aa, ww, hh, k, f) => {
    const gx = grille(ww, k), gy = grille(hh, k), rangee = new Float32Array(ww), ligne = new Float32Array(ww * k);
    for (let y = 0; y < hh * k; y++) {
      const ya = gy.a[y] * ww, yb = gy.b[y] * ww, ty = gy.t[y];
      for (let x = 0; x < ww; x++) rangee[x] = Aa[ya + x] * (1 - ty) + Aa[yb + x] * ty;
      for (let x = 0; x < ww * k; x++) { const tx = gx.t[x]; ligne[x] = rangee[gx.a[x]] * (1 - tx) + rangee[gx.b[x]] * tx; }
      f(ligne, ww * k);
    }
    return ww * hh * k * k;
  };
  const compter = (Aa, ww, hh, k, sx) => {
    const Ac = sx === 1 ? Aa : Aa.map((v) => Math.min(1, v * sx));
    let c = 0;
    lire(Ac, ww, hh, k, (ligne, n) => { for (let x = 0; x < n; x++) if (ligne[x] >= seuil) c++; });
    return c;
  };
  // la cible : la part d'échantillons du niveau 0 qui passent la découpe (2 x 2 par texel)
  cible = compter(A, w, h, 2, 1) / (n0 * 4);
  const niveaux = [{ w, h, d: d0 }];
  // 2, 3 et 4. LES NIVEAUX : moyenne pondérée (les poids ci-dessus, cumulés d'un niveau à l'autre : la couleur d'un
  // texel lointain est la moyenne exacte des texels du niveau 0 qui passent dans son bloc ; un bloc sans aucun
  // garde la couleur pondérée par l'alpha, ou la couleur saignée), alpha moyen mis à l'échelle de la couverture du
  // niveau 0, et couleur moyenne des texels qui passent ramenée à celle du niveau 0
  const HB = 2048, hist = new Uint32Array(HB);
  // (la découpe se décide sur l'OCTET de l'alpha : un texel qui doit passer reçoit au moins qPasse, un texel qui ne
  // doit pas passer au plus qJete. Arrondi au plus près, le texel calé pile sur le seuil tombait un cran dessous, et
  // les niveaux de 2 x 2 et 1 x 1 du tilleul ne gardaient plus une feuille)
  const qPasse = Math.ceil(255 * seuil + 1e-3), qJete = Math.floor(255 * seuil - 1e-3);
  // (et le texel que l'échelle pose PILE sur le seuil passe : alpha x (seuil / alpha) retombe parfois un cheveu
  // dessous en calcul flottant — le dernier niveau, 1 x 1, des feuilles de dos de l'oranger du Mexique était jeté, et
  // leurs feuilles s'éteignaient d'un coup au loin : 0,57 de la couverture rendue à 128 px, 0,01 à 64 ; 1,24 et 1,47
  // depuis, comme les feuilles de face)
  const seuilT = seuil * (1 - 1e-6);
  let cw = w, ch = h;
  while (cw > 1 || ch > 1) {
    const nw = Math.max(1, cw >> 1), nh = Math.max(1, ch >> 1), nn = nw * nh;
    const R2 = new Float32Array(nn), V2 = new Float32Array(nn), B2 = new Float32Array(nn), A2 = new Float32Array(nn), P2 = new Float32Array(nn);
    const fx = cw > 1 ? 2 : 1, fy = ch > 1 ? 2 : 1;
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        let sr = 0, sv = 0, sb = 0, sp = 0, sa = 0;
        for (let dy = 0; dy < fy; dy++) {
          for (let dx = 0; dx < fx; dx++) {
            const j = (y * fy + dy) * cw + x * fx + dx, p = P[j];
            sr += R[j] * p; sv += V[j] * p; sb += B[j] * p; sp += p; sa += A[j];
          }
        }
        const k = y * nw + x;
        R2[k] = sr / sp; V2[k] = sv / sp; B2[k] = sb / sp; A2[k] = sa / (fx * fy); P2[k] = sp / (fx * fy);
      }
    }
    // l'échelle : le quantile (1 - cible) des échantillons du niveau (lus à travers le filtrage, 4 x 4 par texel,
    // 2 x 2 au-delà de 256 x 256) doit tomber sur le seuil — le filtrage bilinéaire est linéaire : multiplier les
    // alphas multiplie les échantillons. `coupe` : l'alpha moyen à partir duquel un échantillon passe — lu sur un
    // histogramme, ou, pour les petits niveaux, sur les échantillons triés : la part y tombe juste (au moins un
    // échantillon, pour qu'un arbre réduit à quelques texels ne disparaisse pas d'un coup)
    let coupe = Infinity, s = 1;
    if (cible > 0 && seuil > 0) {
      const k = nn > 65536 ? 2 : 4, M = nn * k * k, veut = Math.min(M, Math.max(1, Math.round(cible * M)));
      if (M <= 262144) {
        const tri = new Float32Array(M);
        let i = 0;
        lire(A2, nw, nh, k, (ligne, n) => { tri.set(ligne.subarray(0, n), i); i += n; });
        tri.sort();
        coupe = tri[M - veut];
      } else {
        hist.fill(0);
        lire(A2, nw, nh, k, (ligne, n) => { for (let x = 0; x < n; x++) hist[Math.min(HB - 1, Math.floor(ligne[x] * HB))]++; });
        let cum = 0, b = HB - 1;
        for (; b >= 0; b--) { if (cum + hist[b] >= veut) break; cum += hist[b]; }
        // (dans la case b, la part qu'il faut encore prendre, du haut de la case vers le bas)
        coupe = b < 0 ? 0 : (b + 1 - (veut - cum) / Math.max(1, hist[b])) / HB;
      }
      coupe = Math.max(coupe, seuil / 64, 1e-6);
      s = seuil / coupe;
      // (un alpha mis à l'échelle ne dépasse pas 1 : là où il plafonne, le filtrage ne monte plus aussi haut et la part
      // d'échantillons qui passent retombe — beaucoup quand le seuil est haut : rameaux du cèdre, découpés à 0,76,
      // -15 à -25 % aux niveaux 2 à 4. L'échelle est alors cherchée entre deux bornes, alphas plafonnés — fausse
      // position, à 0,3 % près ou en huit essais au plus)
      const tol = Math.max(1, 0.003 * M);
      let c = compter(A2, nw, nh, k, s);
      if (c < veut - tol) {
        let lo = s, clo = c, hi = s * 2, chi = compter(A2, nw, nh, k, hi);
        while (hi < 64 && chi < veut) { lo = hi; clo = chi; hi *= 2; chi = compter(A2, nw, nh, k, hi); }
        for (let it = 0; it < 8 && chi > clo; it++) {
          const mi = Math.min(hi - (hi - lo) * 0.02, Math.max(lo + (hi - lo) * 0.02, lo + (hi - lo) * (veut - clo) / (chi - clo)));
          const cm = compter(A2, nw, nh, k, mi);
          if (Math.abs(cm - veut) <= tol) { hi = mi; chi = cm; break; }
          if (cm < veut) { lo = mi; clo = cm; } else { hi = mi; chi = cm; }
        }
        s = Math.min(64, hi);
      }
    }
    // 4. LA COULEUR MOYENNE de ce qu'on voit : les texels qui passent à ce niveau ne sont pas, en moyenne, de la
    // couleur de ceux qui passent au niveau 0 — les blocs les plus couverts gagnent, et le cœur d'un rameau n'a pas la
    // couleur de ses brindilles (rameaux du cèdre : +6 % au niveau 4, -15 % au niveau 7). Chaque niveau est ramené,
    // canal par canal, à la couleur moyenne du niveau 0 (à ±25 % au plus) : vue de loin, la couronne garde la teinte
    // et la clarté qu'elle a de près. (Ce qui sert au niveau suivant reste la moyenne exacte, sans cette correction.)
    const passe = new Uint8Array(nn), mL = [0, 0, 0];
    let np = 0;
    for (let k = 0; k < nn; k++) {
      if (A2[k] > 0 && A2[k] * s >= seuilT) { passe[k] = 1; np++; mL[0] += R2[k]; mL[1] += V2[k]; mL[2] += B2[k]; }
    }
    const f = [1, 1, 1];
    if (np) for (let c = 0; c < 3; c++) f[c] = mL[c] > 0 ? Math.min(1.25, Math.max(0.8, m0[c] * np / mL[c])) : 1;
    const dn = new Uint8ClampedArray(nn * 4);
    for (let k = 0; k < nn; k++) {
      const i = k * 4;
      dn[i] = enS(R2[k] * f[0]); dn[i + 1] = enS(V2[k] * f[1]); dn[i + 2] = enS(B2[k] * f[2]);
      const q = Math.round(255 * Math.min(1, A2[k] * s));
      dn[i + 3] = passe[k] ? Math.max(q, qPasse) : Math.min(q, qJete);
    }
    niveaux.push({ w: nw, h: nh, d: dn });
    R = R2; V = V2; B = B2; A = A2; P = P2; cw = nw; ch = nh;
  }
  return niveaux;
}

// LES WORKERS : deux ou trois (un cœur sur deux, le fil du jeu et le chargeur gardent le leur), créés à la première
// texture depuis le texte de chaineMipmaps (pas de fichier de plus à servir ni à mettre en cache) ; chaque texture va
// au moins chargé. Un parc pose une quinzaine de cartes de feuillage (versions pleines et légères) : à la file sur
// un seul Worker, les arbres attendaient 4 s de plus sur le PC. S'ils manquent ou échouent, le calcul se fait sur
// le fil du jeu.
let _travailleurs = null, _numero = 0;
const _attentes = new Map();
function travailleurs() {
  if (_travailleurs !== null) return _travailleurs;
  _travailleurs = [];
  try {
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined') return _travailleurs;
    const code = 'const chaineMipmaps = ' + chaineMipmaps.toString() + ';\n'
      + 'onmessage = (e) => { const { id, d, w, h, seuil } = e.data; let n = null;'
      + ' try { n = chaineMipmaps(d, w, h, seuil); } catch (err) { postMessage({ id, n: null }); return; }'
      + ' postMessage({ id, n }, n.map((x) => x.d.buffer)); };';
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    const nb = Math.max(1, Math.min(3, ((typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2) >> 1));
    for (let i = 0; i < nb; i++) {
      const t = new Worker(url);
      t.charge = 0;
      t.onmessage = (e) => { t.charge--; const p = _attentes.get(e.data.id); if (p) { _attentes.delete(e.data.id); p.ok(e.data.n); } };
      t.onerror = () => {
        // (le Worker ne se lance pas — politique de sécurité, vieux navigateur : ceux qui l'attendent repassent sur
        // le fil du jeu, et il ne reçoit plus rien)
        t.terminate();
        _travailleurs = _travailleurs.filter((x) => x !== t);
        for (const [id, p] of _attentes) if (p.t === t) { _attentes.delete(id); p.ok(null); }
      };
      _travailleurs.push(t);
    }
  } catch (e) { /* (le fil du jeu fera le calcul) */ }
  return _travailleurs;
}
function calculer(d, w, h, seuil) {
  const ts = travailleurs();
  if (!ts.length) return Promise.resolve(chaineMipmaps(d, w, h, seuil));
  const t = ts.reduce((a, b) => (b.charge < a.charge ? b : a));
  return new Promise((ok, ko) => {
    const id = ++_numero;
    t.charge++;
    // (rien du Worker : le fil du jeu refait le calcul ; s'il échoue aussi, la promesse est rejetée — jamais en attente)
    _attentes.set(id, { t, ok: (n) => { try { ok(n || chaineMipmaps(d, w, h, seuil)); } catch (e) { ko(e); } } });
    // (les pixels sont COPIÉS pour le Worker, pas transférés : s'il échoue, le fil du jeu les a encore)
    t.postMessage({ id, d, w, h, seuil });
  });
}

// Une chaîne par image (texture.source), calculée une fois même si plusieurs textures la partagent.
const _chaines = new WeakMap();
// La lecture des pixels : l'image (ImageBitmap du chargeur GLTF, <img> du TextureLoader) posée sur une toile.
function lirePixels(im) {
  const w = im.width, h = im.height;
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0);
  return g.getImageData(0, 0, w, h).data;
}

// mipmapsFeuillage(texture, seuil) : refait la chaîne de la texture (voir plus haut). Rend une promesse de vrai
// (la texture porte sa chaîne : le relevé d'alpha du shader doit être éteint) ou de faux (texture inchangée, le
// relevé reste). Ne rejette jamais. `seuil` : l'alphaTest du matériau qui la découpe.
export function mipmapsFeuillage(tex, seuil) {
  if (!tex) return Promise.resolve(false);
  if (tex.userData.mipsFeuillage) return Promise.resolve(true);
  const src = tex.source;
  if (!_chaines.has(src)) {
    let p;
    try {
      const im = tex.image;
      if (!im || !(im.width > 1) || !(im.height > 1)) throw new Error('image absente');
      p = calculer(lirePixels(im), im.width, im.height, seuil)
        .then((n) => n.map((x) => new ImageData(x.d, x.w, x.h)));
    } catch (e) { p = Promise.reject(e); }
    _chaines.set(src, p);
  }
  return _chaines.get(src).then((niveaux) => {
    // (ImageData est une source d'image que WebGL envoie telle quelle : ni prémultipliée, ni convertie ; three la
    // monte niveau par niveau et ne génère plus rien)
    tex.image = niveaux[0];
    tex.mipmaps = niveaux;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.userData.mipsFeuillage = true;
    tex.needsUpdate = true;
    return true;
  }).catch((e) => {
    console.warn('[feuillages] mipmaps non refaites (relevé d\'alpha du shader gardé)', e);
    return false;
  });
}
