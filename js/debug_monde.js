// =====================================================================
//  OUTILS DE VÉRIFICATION DU MONDE (chargés seulement avec ?debug=1)
// =====================================================================
// Ce que chaque équipe du « parc entier » utilise pour regarder son travail (conception, § 4.0). Tout se tape dans
// la console du navigateur, les coordonnées sont celles du TERRAIN 1 (x+ vers le quai, z+ vers le pin, en mètres ;
// sur parc2 le décalage de 16,1 m est ajouté tout seul) :
//
//   __tp(x, z)          téléporte le joueur (en balade) et la caméra avec lui
//   __pv('PV07')        caméra libre sur un point de vue numéroté ; __pv() rend la caméra du jeu ; __pv.liste
//   await __perf()      appels de dessin et triangles (passe principale et passe d'ombre), porteurs d'ombre,
//                       maillages dont la sphère dépasse 35 m, morceaux construits et temps de construction (lot A5)
//   await __perf('Z06a')  le budget d'un morceau de zone (≤ 25 appels, ≤ 60 000 triangles, ≤ 16 Mo)
//   await __ortho(true) drape l'orthophoto IGN sur le sol (outil de développement : le fichier reste hors du jeu)
//   __drapeaux(true)    colore le sol : vert marchable, bleu cyclable, orange escalier, rouge bloqué
//   __sol(x, z)         hauteur du sol, nappe, drapeaux et surface en ce point (sans argument : sous le joueur)
//   __monde             le module js/monde.js lui-même
import * as THREE from 'three';
import { Monde, DRAPEAU, SURFACE } from './monde.js';

// Le terrain 2 du parc est à 16,1 m du terrain 1 vers x- : sur « parc2 » tout le décor glisse de +16,1 m.
const DX_PARC2 = 16.1;
// L'orthophoto de travail (tools/parc/sources/, versionnée avec l'outil de données, jamais chargée par le jeu livré) :
// 1 pixel = 0,25 m, pixel (0, 0) au coin (x -205 ; z -185), 1140 x 1720 pixels.
const ORTHO = { url: 'tools/parc/sources/ortho_jeu.jpg', x0: -205, z0: -185, pas: 0.25 };

// Les points de vue (conception, § 4.0) : caméra et cible en mètres, repère du terrain 1, œil à Monde.sol + 1,7.
export const POINTS_DE_VUE = {
  PV01: { lieu: 'plateau, vers le mur', cam: [2, 1.7, 0], cible: [-40, 6, 0], voir: 'mur de meulière, puis le coteau boisé qui monte jusqu’à +10,7' },
  PV02: { lieu: 'plateau, vers le pin', cam: [-8, 1.7, -6], cible: [-8, 1, 30], voir: 'portillon du grillage du pin, butte, pin parasol, terrasse du bassin en contrebas' },
  PV03: { lieu: 'pied de la rampe est', cam: [-18, 2.8, 14], cible: [-41, 6.4, -19], voir: 'la rampe rouge qui monte sous les arbres' },
  PV04: { lieu: 'rampe est à mi-pente', cam: [-41, 8.1, -19], cible: [-8.7, 0, 0], voir: 'le plateau vu d’en haut à travers les troncs' },
  PV05: { lieu: 'promenade basse vers le sud-ouest', cam: [10.4, 0.9, -30], cible: [9, 0, 80], voir: 'allée rouge entre les deux rideaux, grille et quai à gauche' },
  PV06: { lieu: 'promenade, bout nord-est', cam: [10, -1.6, -105], cible: [10, -0.8, 0], voir: 'descente régularisée, portillon nord-est' },
  PV07: { lieu: 'terrasse du bassin vers le mur des caves', cam: [2, 0.9, 35], cible: [-45, 5, 35], voir: 'photo j5 : bassin, ifs, mur, volées en V, drapeau et statue en haut' },
  PV08: { lieu: 'belvédère vers la Seine', cam: [-60, 12.3, 36], cible: [40, -3, 40], voir: 'photos 6 et j4 : balustrade, bassin en contrebas, quai, Seine, île, tour Eiffel' },
  PV09: { lieu: 'grille 156 vers la perspective', cam: [-128, 13.9, 36.4], cible: [-57, 11.5, 36], voir: 'photos 1 et 7 : parterres, allées de gravier, drapeau au fond' },
  PV10: { lieu: 'fontaine des Antiquités', cam: [-106, 13.1, -17.7], cible: [-115.5, 12, -17.7], voir: 'photo 2' },
  PV11: { lieu: 'manège et jeux nord-est', cam: [-95, 13, -45], cible: [-113, 12, -37], voir: 'manège, boucle des jeux' },
  PV12: { lieu: 'musée Roybet-Fould', cam: [-85, 13, -85], cible: [-68, 13, -103], voir: 'chalet de bois peint' },
  PV13: { lieu: 'esplanade, façade Charras', cam: [-14, 1.9, -25], cible: [-14, 6, -54], voir: 'voûte de platanes, façade à fronton' },
  PV14: { lieu: 'haut de l’escalier de 34 marches', cam: [-52, 12.6, -49], cible: [-22, 0.5, -43], voir: 'volée qui plonge vers l’esplanade' },
  PV15: { lieu: 'jardin de la fontaine', cam: [0, 0.9, 104.5], cible: [-17.5, 0, 104.5], voir: 'hémicycle, bassin octogonal, pavillon des Douceurs' },
  PV16: { lieu: 'city-stade', cam: [-8, 0.9, 132], cible: [-26, 0, 132], voir: 'pare-ballons, sol beige' },
  PV17: { lieu: 'théâtre, haut des gradins', cam: [-36, 6.0, 162], cible: [-15, 0, 162], voir: 'photo 5 : gradins en arc, scène, quai et Seine derrière' },
  PV18: { lieu: 'placette, haut de la rampe ouest', cam: [-52, 11.5, 150], cible: [-37, 3.5, 66], voir: 'rampe ouest qui descend en diagonale' },
  PV19: { lieu: 'bosquet ouest', cam: [-100, 13.2, 80], cible: [-118, 12, 130], voir: 'photo 10 : terre battue rose, bancs verts' },
  PV20: { lieu: 'kiosque La Voisine', cam: [-70, 13, 118], cible: [-76.7, 12, 126.9], voir: 'photo 9' },
  PV21: { lieu: 'drone (photo 3)', cam: [10, 45, -90], cible: [-40, 0, 60], voir: 'Seine à gauche, plateau, terrasse, manège, La Défense au loin' },
  PV22: { lieu: 'vue zénithale', cam: [-60, 400, 30], cible: [-60, 0, 30.01], fov: 50, sansBrouillard: true, voir: 'à superposer à l’orthophoto avec __ortho(true) : écart de moins de 1,5 m partout' },
};

const NOMS_DRAPEAUX = Object.entries(DRAPEAU);
const NOMS_SURFACES = Object.fromEntries(Object.entries(SURFACE).map(([k, v]) => [v, k.toLowerCase()]));
// la prochaine image (ou 250 ms : un onglet caché ne dessine plus d'images)
const image = () => new Promise((r) => { requestAnimationFrame(() => r()); setTimeout(r, 250); });
const m2 = (v) => (Math.round(v * 100) / 100).toFixed(2);

// Un maillage « drapé » sur le sol : grille de pas `pas` sur [xa, xb] x [za, zb] (repère du terrain 1), chaque
// sommet à Monde.sol + dy ; les UV couvrent le rectangle (v inversé pour une image chargée, droit pour une DataTexture).
function drape(xa, za, xb, zb, pas, dy, dec, vInverse) {
  const nx = Math.max(2, Math.ceil((xb - xa) / pas) + 1), nz = Math.max(2, Math.ceil((zb - za) / pas) + 1);
  const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), idx = [];
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    const x = xa + (xb - xa) * i / (nx - 1), z = za + (zb - za) * k / (nz - 1), n = k * nx + i;
    pos[n * 3] = x + dec; pos[n * 3 + 1] = Monde.sol(x + dec, z) + dy; pos[n * 3 + 2] = z;
    uv[n * 2] = i / (nx - 1); uv[n * 2 + 1] = vInverse ? 1 - k / (nz - 1) : k / (nz - 1);
    if (i < nx - 1 && k < nz - 1) idx.push(n, n + nx, n + 1, n + 1, n + nx, n + nx + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(nx * nz > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  return g;
}
function calque(geo, map, opacite) {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map, transparent: true, opacity: opacite, depthWrite: false,
    fog: false, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  m.renderOrder = 3; m.frustumCulled = false;
  m.userData.dynamique = true; m.userData.nofuse = true;       // ni ombre cuite, ni fusion, ni ombre de contact
  return m;
}
function retirer(scene, m) {
  if (!m) return;
  scene.remove(m); m.geometry.dispose(); if (m.material.map) m.material.map.dispose(); m.material.dispose();
}

export function installerDebug(game) {
  const scene = game.scene, cam = game.camera, renderer = game.renderer;
  // décalage du décor : celui du monde installé, sinon celui de parc2 (le décor y glisse même quand le monde est plat)
  const dec = () => (!Monde.plat ? Monde.dx : ((scene.userData.reperes || {}).plateau === 2 ? DX_PARC2 : 0));
  const etat = { ortho: null, drapeaux: null, fog: undefined, fov: null };

  window.__monde = Monde;

  // ---------------------------------------------------------------- __tp
  window.__tp = (x, z) => {
    const u = game.user;
    if (!u || game.mode !== 'lobby') return 'la téléportation se fait en balade (JOUER, puis le terrain)';
    if (u.velo) game.lacherVeloLocal();
    const wx = x + dec(), y = Monde.sol(wx, z);
    u.pos.set(wx, y, z); u.posPrec.copy(u.pos); u.vel.set(0, 0, 0);
    u.airborne = false; u.jumpY = 0; u.jumpVel = 0; u.yLisse = 0;
    const sy = Math.sin(game.camYaw), cy = Math.cos(game.camYaw);
    game.camPos.set(wx + sy * 4.3, y + 2.4, z + cy * 4.3); game.lookCur.set(wx, y + 1.4, z); game._camLibre = 1;
    cam.position.copy(game.camPos);
    // sur un terrain plat, la zone de balade (le « yard ») reste la même : le prochain pas y ramène le joueur
    const Y = u.bounds, dehors = Y && (wx < Y.xMin || wx > Y.xMax || z < Y.zMin || z > Y.zMax);
    // posé dans un massif, sur l'eau… : il n'y est pas prisonnier (Monde.franchir le laisse sortir), mais on le dit
    const interdit = !Monde.plat && !(Monde.drapeaux(wx, z) & DRAPEAU.MARCHABLE);
    return `joueur en (${m2(x)} ; ${m2(z)}), sol ${m2(y)} m${interdit ? ' — endroit NON MARCHABLE (massif, talus, eau) : il peut en sortir, pas y revenir' : ''}`
      + `${dehors ? ' — hors de la zone de balade de ce terrain : il y sera ramené' : ''}`;
  };

  // ---------------------------------------------------------------- __pv
  window.__pv = (id) => {
    if (!id) {
      game.freeCam = false;
      if (etat.fog !== undefined) { scene.fog = etat.fog; etat.fog = undefined; }
      if (etat.fov !== null) { cam.fov = etat.fov; etat.fov = null; }
      cam.up.set(0, 1, 0); cam.updateProjectionMatrix();
      return 'caméra du jeu';
    }
    const cle = String(id).toUpperCase(), v = POINTS_DE_VUE[cle];
    if (!v) return `inconnu : ${id} (voir __pv.liste)`;
    const d = dec();
    if (etat.fov === null) etat.fov = cam.fov;
    game.freeCam = true;
    cam.position.set(v.cam[0] + d, v.cam[1], v.cam[2]); cam.up.set(0, 1, 0);
    cam.lookAt(v.cible[0] + d, v.cible[1], v.cible[2]);
    cam.fov = v.fov || 58; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    // la vue zénithale est à 400 m : le brouillard du parc (60-300 m) l'effacerait, on le retire le temps de la vue
    if (v.sansBrouillard) { if (etat.fog === undefined) etat.fog = scene.fog; scene.fog = null; }
    else if (etat.fog !== undefined) { scene.fog = etat.fog; etat.fog = undefined; }
    return `${cle} · ${v.lieu} — on doit voir : ${v.voir}`;
  };
  window.__pv.liste = POINTS_DE_VUE;

  // ---------------------------------------------------------------- __perf
  window.__perf = async (id) => {
    if (id) return mesurerMorceau(scene, id);
    const sm = renderer.shadowMap, rendreOmbre = sm.render;
    const ombre = { appels: 0, triangles: 0 };
    sm.render = function (...a) {
      const c = renderer.info.render.calls, t = renderer.info.render.triangles;
      rendreOmbre.apply(this, a);
      ombre.appels += renderer.info.render.calls - c; ombre.triangles += renderer.info.render.triangles - t;
    };
    let total;
    try {
      await image();                                       // entre deux images du jeu...
      renderer.info.autoReset = false; renderer.info.reset(); ombre.appels = 0; ombre.triangles = 0;
      // ... on en dessine UNE nous-mêmes, sans faire avancer le jeu (dt = 0) : toutes les passes comptent (ombre du
      // soleil, ombres de contact, occlusion, post-traitement), et la mesure marche aussi quand la boucle est arrêtée
      const t0 = performance.now();
      game.frame(0);
      total = { appels: renderer.info.render.calls, triangles: renderer.info.render.triangles, ms: performance.now() - t0 };
    } finally { renderer.info.autoReset = true; sm.render = rendreOmbre; }
    // la scène : porteurs d'ombre visibles, et les blocs dont la sphère englobante empêche le tri par distance
    let maillages = 0, porteurs = 0;
    const grosses = [], s = new THREE.Sphere();
    scene.traverseVisible((o) => {
      if (!o.isMesh || !o.geometry) return;
      maillages++; if (o.castShadow) porteurs++;
      // (un BatchedMesh — le sol du parc — est élagué instance par instance, cellule par cellule : sa sphère d'ensemble
      // ne dit rien du tri par distance)
      // (le ciel — dôme, brume d'horizon, jupe de brume du parc entier — n'est pas du décor : userData.ciel)
      if (o.isBatchedMesh || o.userData.ciel) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      s.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      if (s.radius > 35) grosses.push({ nom: o.name || o.material?.name || o.type, rayon: Math.round(s.radius) });
    });
    grosses.sort((a, b) => b.rayon - a.rayon);
    const S = Monde.stats || {};
    const r = {
      appels: total.appels, triangles: total.triangles, msImageCpu: +total.ms.toFixed(2),
      appelsOmbre: ombre.appels, trianglesOmbre: ombre.triangles,
      appelsHorsOmbre: total.appels - ombre.appels, trianglesHorsOmbre: total.triangles - ombre.triangles,
      maillagesVisibles: maillages, porteursOmbre: porteurs,
      spheresPlusDe35m: grosses.length, pires: grosses.slice(0, 12),
      morceaux: S.morceaux ?? '—', msConstructionParImage: S.msParImage ?? '—',
      // (lot A5 : l'ordonnanceur — temps de l'image, pic récent — et les arbres par niveau de détail)
      charge: S.charge ?? '—', vegetation: S.vegetation ?? '—',
      monde: Monde.plat ? 'plat' : `installé (empreinte ${Monde.hash || '?'})`,
    };
    console.table({ appels: r.appels, 'dont ombre': r.appelsOmbre, triangles: r.triangles, 'dont ombre ': r.trianglesOmbre,
      'porteurs d’ombre': r.porteursOmbre, 'sphères > 35 m': r.spheresPlusDe35m });
    return r;
  };

  // ---------------------------------------------------------------- __ortho
  window.__ortho = (on = true, url = ORTHO.url) => {
    retirer(scene, etat.ortho); etat.ortho = null;
    if (!on) return Promise.resolve('orthophoto retirée');
    return new Promise((ok) => {
      new THREE.TextureLoader().load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
        const W = tex.image.width * ORTHO.pas, H = tex.image.height * ORTHO.pas;
        // drapée sur le sol du monde (tous les 2 m), ou à plat au ras du plateau sur un terrain plat
        const geo = drape(ORTHO.x0, ORTHO.z0, ORTHO.x0 + W, ORTHO.z0 + H, Monde.plat ? Math.max(W, H) : 2, 0.05, dec(), true);
        etat.ortho = calque(geo, tex, 0.85); etat.ortho.name = 'debug : orthophoto';
        scene.add(etat.ortho);
        ok(`orthophoto posée : x ${ORTHO.x0} à ${ORTHO.x0 + W}, z ${ORTHO.z0} à ${ORTHO.z0 + H} (1 px = ${ORTHO.pas} m)`);
      }, undefined, () => ok(`orthophoto introuvable (${url}) : copier ortho_jeu.jpg (1140 x 1720 px, coin x -205 z -185, `
        + `0,25 m/px) dans tools/parc/sources/, ou donner son adresse : __ortho(true, 'adresse')`));
    });
  };

  // ---------------------------------------------------------------- __drapeaux
  window.__drapeaux = (on = true) => {
    retirer(scene, etat.drapeaux); etat.drapeaux = null;
    if (!on) return 'drapeaux retirés';
    // l'emprise : la grille du monde, ou 90 x 80 m autour du plateau quand le monde est plat
    const R = Monde.repere;
    const pas = R ? R.pas : 1, x0 = R ? R.x0 : -54, z0 = R ? R.z0 : -40;
    const nx = R ? R.nx : 91, nz = R ? R.nz : 81, d = dec();
    const px = new Uint8Array(nx * nz * 4);
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
      const x = x0 + i * pas + d, z = z0 + k * pas, f = Monde.drapeaux(x, z), n = (k * nx + i) * 4;
      const c = Monde.nappe(x, z) === 0 ? null
        : (f & DRAPEAU.ESCALIER) ? [255, 140, 0] : (f & DRAPEAU.CYCLABLE) ? [40, 110, 255]
          : (f & DRAPEAU.MARCHABLE) ? [40, 200, 70] : [230, 40, 40];
      if (c) { px[n] = c[0]; px[n + 1] = c[1]; px[n + 2] = c[2]; px[n + 3] = 255; }
    }
    const tex = new THREE.DataTexture(px, nx, nz, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.needsUpdate = true;
    const geo = drape(x0 - pas / 2, z0 - pas / 2, x0 + (nx - 0.5) * pas, z0 + (nz - 0.5) * pas, Monde.plat ? 1000 : 1, 0.06, d, false);
    etat.drapeaux = calque(geo, tex, 0.55); etat.drapeaux.name = 'debug : drapeaux';
    scene.add(etat.drapeaux);
    return Monde.plat ? 'monde PLAT : tout est marchable et cyclable (bleu)' : 'vert marchable · bleu cyclable · orange escalier · rouge bloqué';
  };

  // ---------------------------------------------------------------- __sol
  window.__sol = (x, z) => {
    const u = game.user;
    if (x === undefined && u) { x = u.pos.x - dec(); z = u.pos.z; }
    const wx = x + dec(), y = Monde.sol(wx, z), n = Monde.nappe(wx, z), f = Monde.drapeaux(wx, z), s = Monde.surface(wx, z);
    const noms = NOMS_DRAPEAUX.filter(([, b]) => f & b).map(([k]) => k.toLowerCase()).join(', ') || 'aucun';
    console.info(`[monde] (${m2(x)} ; ${m2(z)}) : sol ${m2(y)} m · nappe ${n} · drapeaux ${f} (${noms}) · surface ${s} (${NOMS_SURFACES[s] || '?'})${Monde.plat ? ' · monde PLAT' : ''}`);
    return y;
  };

  // La page de démonstration du KIT DU PARC (lot A8, js/parc/kit.js) : avec ?debug=1&kit=1, toutes ses pièces sont
  // posées sur le plateau (__kit.vue(n), __kit.bilan()). Le kit n'est téléchargé que dans ce cas.
  if (new URLSearchParams(location.search).get('kit') === '1') {
    import('./parc/kit.js').then((k) => k.demoKit(game)).catch((e) => console.warn('[debug] kit du parc indisponible :', e));
  }

  console.info('[debug] outils du monde : __tp(x, z) · __pv(\'PV07\') · await __perf() · await __ortho(true) · __drapeaux(true) · __sol(x, z) · __monde');
}

// Le budget d'un morceau de zone (conception, § 3.3, règle 6) : appels de dessin après fusion, triangles hors
// végétation, mémoire de géométrie. On cherche l'objet par son nom ou par userData.morceau.
// (Lot A5 : un morceau construit s'appelle `ZONE:<id>`, sa silhouette `SIL:<id>` — même userData.morceau. On prend le
// détail d'abord : la silhouette, posée dès le démarrage, était trouvée la première et mesurée à sa place.
// __perf('SIL:Z06a') mesure la silhouette. Un morceau loin du joueur n'est pas construit : il est alors introuvable.)
function mesurerMorceau(scene, id) {
  let racine = scene.getObjectByName(id) || scene.getObjectByName('ZONE:' + id);
  if (!racine) scene.traverse((o) => { if (!racine && o.userData && o.userData.morceau === id && !o.userData.silhouette) racine = o; });
  if (!racine) return `morceau introuvable : ${id} (pas construit : trop loin de la caméra ? __tp ou __pv à côté, puis quelques images)`;
  let appels = 0, triangles = 0, vegetation = 0, octets = 0;
  const vues = new Set();
  racine.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.visible) return;
    appels++;
    const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3, inst = o.isInstancedMesh ? o.count : 1;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && (m.alphaTest > 0 || o.userData.feuillage)) vegetation += n * inst; else triangles += n * inst;
    if (vues.has(g)) return;
    vues.add(g);
    for (const a of Object.values(g.attributes)) octets += a.array.byteLength;
    if (g.index) octets += g.index.array.byteLength;
  });
  const r = { morceau: id, appels, triangles: Math.round(triangles), vegetation: Math.round(vegetation), mo: +(octets / 1048576).toFixed(2) };
  r.dansLeBudget = appels <= 25 && triangles <= 60000 && octets <= 16 * 1048576;
  return r;
}
