// =====================================================================
//  LES DONNÉES DU MONDE DU PARC DE BÉCON (lot A2 du chantier « parc complet »)
// =====================================================================
// Le parc entier n'est pas dessiné par le jeu : il est LU. Un outil hors du jeu (tools/parc/construire_monde.py)
// fabrique, à partir du relief LiDAR de l'IGN, d'OpenStreetMap et de gabarits dessinés à la main, les fichiers de
// assets/parc/monde/ (format exact : tools/parc/LISEZMOI.md). Ce module les charge, une fois, et rend l'objet que
// Monde.installer (js/monde.js) attend :
//
//   { ...monde.json,                                       le repère, les nappes, les obstacles, les lieux…
//     grilles: { sol, nappes, drapeaux, surfaces },        une valeur par nœud de la grille de 0,5 m (441 x 671)
//     tableArbres,                                         arbres.bin : 6 Float32 par arbre (lot A5)
//     sols,                                                sols.webp décodée (ImageBitmap, ou <img> à défaut)
//     msChargement }                                       pour les mesures
//
// UNE SEULE PROMESSE : chargerMonde() rend toujours la même, quel que soit le nombre d'appelants.
//
// JAMAIS DEUX VERSIONS MÉLANGÉES. monde.json est servi « réseau d'abord » par le service worker (sw.js), les binaires
// « cache d'abord » (ce sont des fichiers lourds) : après une mise à jour des données, on aurait pu lire le monde.json
// neuf avec un sol.bin de l'ancienne version — un sol faux, et des murs au mauvais endroit. Les binaires sont donc
// demandés avec l'EMPREINTE des données dans l'adresse (`?v=<hash>`, le `hash` de monde.json change dès qu'un
// fichier change) : une autre empreinte, c'est une autre adresse, jamais servie depuis un ancien cache.
//
// PETIT-BOUTISTE. sol.bin est en Int16 petit-boutiste, l'ordre natif de tous les navigateurs d'aujourd'hui ; on le
// vérifie quand même, et on retourne les octets sur une machine gros-boutiste (le coût est nul sinon).

const DOSSIER = 'assets/parc/monde/';

let _promesse = null;

// Le relief, les grilles, la carte de mélange du sol : tout ce que le parc entier lit au démarrage.
export function chargerMonde(dossier = DOSSIER) {
  if (!_promesse) _promesse = charger(dossier);
  return _promesse;
}

async function charger(dossier) {
  const t0 = performance.now();
  const rep = await fetch(dossier + 'monde.json');
  if (!rep.ok) throw new Error(`monde.json illisible (${rep.status})`);
  const meta = await rep.json();
  const R = meta.repere;
  if (!R || !R.nx || !R.nz) throw new Error('monde.json sans repère');
  const v = '?v=' + encodeURIComponent(meta.hash || meta.version || '0');
  const binaire = (nom) => fetch(dossier + nom + v).then((r) => {
    if (!r.ok) throw new Error(`${nom} illisible (${r.status})`);
    return r.arrayBuffer();
  });
  const [sol, nappes, drapeaux, surfaces, arbres, sols] = await Promise.all([
    binaire('sol.bin'), binaire('nappes.bin'), binaire('drapeaux.bin'), binaire('surfaces.bin'),
    binaire('arbres.bin').catch(() => new ArrayBuffer(0)),          // (les arbres ne servent qu'au lot A5)
    chargerCarte(dossier + 'sols.webp' + v),
  ]);
  const n = R.nx * R.nz;
  const verifier = (nom, buf, octets) => {
    if (buf.byteLength !== n * octets) throw new Error(`${nom} : ${buf.byteLength} octets au lieu de ${n * octets} (${R.nx} x ${R.nz})`);
  };
  verifier('sol.bin', sol, 2); verifier('nappes.bin', nappes, 1); verifier('drapeaux.bin', drapeaux, 1); verifier('surfaces.bin', surfaces, 1);
  const sol16 = new Int16Array(sol);
  if (!petitBoutiste()) for (let i = 0; i < sol16.length; i++) { const x = sol16[i]; sol16[i] = ((x & 0xff) << 8) | ((x >> 8) & 0xff); }
  return {
    ...meta,
    grilles: { sol: sol16, nappes: new Uint8Array(nappes), drapeaux: new Uint8Array(drapeaux), surfaces: new Uint8Array(surfaces) },
    tableArbres: new Float32Array(arbres.byteLength >= 24 ? arbres.slice(0, arbres.byteLength - (arbres.byteLength % 24)) : new ArrayBuffer(0)),
    sols,
    msChargement: Math.round(performance.now() - t0),
  };
}

function petitBoutiste() {
  return new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
}

// LA CARTE DE MÉLANGE DU SOL (sols.webp, RGBA sans perte : R herbe, G sous-bois, B terre nue, A massifs). Ce sont des
// DONNÉES, pas une image : aucune conversion de couleur, aucune prémultiplication par l'alpha (sinon le rouge, le vert
// et le bleu disparaîtraient sous chaque pixel sans massif, dont l'alpha vaut 0). Décodée hors du fil principal quand
// le navigateur le permet (createImageBitmap). La ligne 0 est z = z0 : la texture se charge SANS retournement.
async function chargerCarte(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`sols.webp illisible (${r.status})`);
  const blob = await r.blob();
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }); } catch (e) { /* on passe par <img> */ }
  }
  return new Promise((ok, ko) => {
    const img = new Image(), lien = URL.createObjectURL(blob);
    img.onload = () => { URL.revokeObjectURL(lien); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(lien); ko(new Error('sols.webp : décodage impossible')); };
    img.src = lien;
  });
}
