// LE VÉLO DE LA CAGE — modèle articulé et conduite.
//
// Haythem voulait deux choses : que le vélo posé contre le grillage soit « bien modélisé », et qu'on puisse
// le conduire. Les deux se tiennent : un vélo qu'on conduit doit ÊTRE ARTICULÉ, sinon rien ne bouge quand
// on roule. L'ancien était une poignée de cylindres fondus d'un bloc dans le décor — impossible d'en faire
// tourner une roue.
//
// LE MODÈLE. Un vélo de ville, taille M, roues de 700 × 40. La géométrie est celle d'un vrai cadre, pas
// une approximation : angle de chasse 71°, angle de selle 73°, déport de fourche 45 mm, bases de 455 mm,
// empattement 1,08 m, boîtier de pédalier à 28 cm du sol. C'est ce qui fait qu'il « a l'air vrai » — un
// cadre aux mauvais angles se voit tout de suite, même sans savoir pourquoi. Tout est construit ici, sans
// fichier à télécharger : 36 rayons croisés par roue, plateau et cassette dentés, chaîne à maillons qui
// défile, étriers, câbles, garde-boue, porte-bagages, béquille, catadioptres.
//
// LES ARTICULATIONS. La fourche, la roue avant, la potence et le guidon tournent ENSEMBLE autour de l'axe
// de direction, qui est INCLINÉ (c'est lui qui donne l'angle de chasse). Les deux roues tournent sur leur
// axe, le pédalier aussi, et les pédales tournent en sens inverse pour rester à plat sous le pied. Tout le
// vélo penche dans les virages autour de la ligne des deux points de contact au sol.
//
// REPÈRE. Comme le joueur : +z devant, +y en haut, +x à GAUCHE. L'origine est au sol, à mi-chemin entre
// les deux points de contact des pneus.
//
// LA CONDUITE (propulsion, direction, collisions, pente et gravité, réseau) est dans js/monture.js, la classe de
// base de tous les engins : ce fichier-ci donne le modèle, ses constantes (PARAMS_VELO) et sa pose à l'écran. Sur
// le relief du parc entier, le cadre bascule d'une roue à l'autre : un groupe `tangage` est glissé entre `racine`
// (le cap) et `inclinaison` (le roulis) — l'ordre cap, tangage, roulis est celui d'un vrai vélo, et les ancres du
// cycliste le suivent d'elles-mêmes (elles se lisent dans le monde). Sur un terrain plat, ce groupe n'existe pas.
//
// LES VÉLOS DU PARC ENTIER (veloDepuisDonnees, monde.json > velos) : six vélos posés d'après les données. Pour ne
// pas payer six fois un vélo de 36 maillages et 2,3 Mo de géométrie, le premier est construit, les autres le
// COPIENT (géométries partagées, chacun sa peinture), et tant qu'un vélo n'a jamais été pris il s'affiche GARÉ :
// toutes ses pièces fondues par matière (7 appels de dessin au lieu de 36), une seule fois pour les six. De loin, un
// vélo garé n'est plus qu'une silhouette (1 appel), et de très loin plus rien.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Monde } from './monde.js';
import { Monture } from './monture.js';

// ---------------------------------------------------------------- géométrie du cadre
const deg = Math.PI / 180;
export const ROUE_R = 0.35;                 // rayon extérieur du pneu (700 × 40 : 0,70 m de diamètre)
const PNEU_TUBE = 0.021;                    // demi-section du pneu
const JANTE_R = ROUE_R - PNEU_TUBE * 1.6;   // rayon de la jante (le talon du pneu)
export const EMPATTEMENT = 1.08;
const Z_AR = -EMPATTEMENT / 2, Z_AV = EMPATTEMENT / 2, Y_AXE = ROUE_R;
const BOITIER = new THREE.Vector3(0, 0.28, -0.09);          // boîtier de pédalier
const MANIVELLE = 0.17;                                       // longueur de manivelle
const PLATEAU_R = 0.090, PIGNON_R = 0.036;                    // rayons primitifs (42 et 16 dents)
const X_CHAINE = -0.047;                                      // la transmission est à DROITE (-x)
const DIR_SELLE = new THREE.Vector3(0, Math.sin(73 * deg), -Math.cos(73 * deg));   // tube de selle
const AXE_DIR = new THREE.Vector3(0, Math.sin(71 * deg), -Math.cos(71 * deg));     // axe de direction
const AXE_AV = new THREE.Vector3(0, Math.cos(71 * deg), Math.sin(71 * deg));       // perpendiculaire, vers l'avant
const H_SELLE_BASE = 0.70;                  // boîtier -> dessus de selle, le long du tube (réglable)
// Où tombe la cheville quand le pied est à plat sur la pédale : au-dessus de l'axe, et en arrière (c'est
// l'avant du pied, pas le talon, qui appuie).
export const CHEVILLE = { haut: 0.075, arriere: 0.085 };

// Les constantes de conduite du vélo (js/monture.js) : vitesses de pointe assis et en danseuse (m/s), forces de
// pédalage (m/s²), les trois points qui touchent le décor (roue arrière, milieu, roue avant, en m le long du cadre)
// et leur rayon, l'agent de js/monde.js (marche de 8 cm, pas d'escalier, drapeau « cyclable »).
export const PARAMS_VELO = {
  agent: 'velo', empattement: EMPATTEMENT, roueR: ROUE_R, hSelle: H_SELLE_BASE,
  vmax: 5.9, vmaxDanseuse: 8.4, force: 2.3, forceDanseuse: 3.3,
  contacts: [-0.62, 0, 0.62], rayonContact: 0.18,
};

// Points clés de la direction, calculés comme sur un plan de cadre : on part de l'axe de roue avant, on
// recule du déport, on remonte le long de l'axe de direction.
const AXE_AV_ROUE = new THREE.Vector3(0, Y_AXE, Z_AV);
const A0 = AXE_AV_ROUE.clone().addScaledVector(AXE_AV, -0.045);
const TE_FOURCHE = A0.clone().addScaledVector(AXE_DIR, 0.39);     // té de fourche
const DOUILLE_BAS = TE_FOURCHE.clone().addScaledVector(AXE_DIR, 0.02);
const DOUILLE_HAUT = DOUILLE_BAS.clone().addScaledVector(AXE_DIR, 0.155);
const PIVOT_HAUT = DOUILLE_HAUT.clone().addScaledVector(AXE_DIR, 0.055);
const POTENCE = PIVOT_HAUT.clone().addScaledVector(new THREE.Vector3(0, 0.36, 0.93).normalize(), 0.075);

// ---------------------------------------------------------------- matériaux (partagés)
let M = null;
function materiaux(couleur) {
  if (!M) {
    M = {
      alu: new THREE.MeshStandardMaterial({ color: 0xc9cdd3, roughness: 0.26, metalness: 0.92 }),
      chrome: new THREE.MeshStandardMaterial({ color: 0xe4e6ea, roughness: 0.12, metalness: 1.0 }),
      noir: new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.5, metalness: 0.35 }),
      mat: new THREE.MeshStandardMaterial({ color: 0x131416, roughness: 0.85, metalness: 0.05 }),     // poignées, selle
      caoutchouc: new THREE.MeshStandardMaterial({ color: 0x1c1c1d, roughness: 0.93, metalness: 0,
        map: texturePneu(), bumpMap: texturePneu(), bumpScale: 1.2 }),
      chaine: new THREE.MeshStandardMaterial({ color: 0x4a4d53, roughness: 0.42, metalness: 0.85 }),
      rouge: new THREE.MeshStandardMaterial({ color: 0xb4130f, roughness: 0.3, metalness: 0.1, emissive: 0x3a0402 }),
      blanc: new THREE.MeshStandardMaterial({ color: 0xf1f1f1, roughness: 0.3, metalness: 0.1 }),
      orange: new THREE.MeshStandardMaterial({ color: 0xe0801a, roughness: 0.35, metalness: 0.1 }),
      gaine: new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.6, metalness: 0.1 }),
      peintures: new Map(),
    };
  }
  if (!M.peintures.has(couleur)) {
    // Peinture laquée : une couche de couleur, et un vernis par-dessus qui prend les reflets du ciel.
    M.peintures.set(couleur, new THREE.MeshPhysicalMaterial({ color: couleur, roughness: 0.34, metalness: 0.45,
      clearcoat: 1, clearcoatRoughness: 0.07 }));
  }
  return { ...M, peinture: M.peintures.get(couleur) };
}

// Bande de roulement : des pavés au centre, lisse sur les flancs. Sur un tore, u fait le tour de la roue et
// v le tour de la section : les pavés ne vont donc que sur la bande du milieu de v.
let _texPneu = null;
function texturePneu() {
  if (_texPneu) return _texPneu;
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#262627'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#3a3a3c';
  for (let i = 0; i < 4; i++) {
    const y0 = 20 + (i % 2) * 6;
    g.fillRect(i * 16 + 2, y0, 11, 8); g.fillRect(i * 16 + 6, 64 - y0 - 8, 11, 8);
  }
  g.fillStyle = '#1e1e1f'; g.fillRect(0, 0, 64, 6); g.fillRect(0, 58, 64, 6);   // flancs lisses
  _texPneu = new THREE.CanvasTexture(c);
  _texPneu.wrapS = _texPneu.wrapT = THREE.RepeatWrapping;
  _texPneu.repeat.set(96, 1);
  return _texPneu;
}

// ---------------------------------------------------------------- outils de construction
// On accumule les géométries par matériau, puis on les FOND : un vélo de trois cents pièces doit coûter
// une vingtaine d'appels de dessin, pas trois cents.
class Lots {
  constructor() { this.m = new Map(); }
  add(mat, geo) { if (!this.m.has(mat)) this.m.set(mat, []); this.m.get(mat).push(geo); return geo; }
  poser(groupe, ombre = true) {
    for (const [mat, geos] of this.m) {
      const g = geos.length === 1 ? geos[0] : mergeGeometries(geos.map((x) => (x.index ? x.toNonIndexed() : x)), false);
      const mesh = new THREE.Mesh(g, mat);
      mesh.castShadow = ombre; mesh.receiveShadow = true;
      groupe.add(mesh);
    }
    this.m.clear();
  }
}
const _Y = new THREE.Vector3(0, 1, 0), _qT = new THREE.Quaternion();

// Tube droit de a à b (rayon r1 en a, r2 en b : les fourreaux et les manivelles s'affinent).
function tube(a, b, r1, r2 = r1, seg = 10) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r2, r1, L, seg, 1, false);
  _qT.setFromUnitVectors(_Y, d.normalize());
  g.applyQuaternion(_qT);
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}
// Tube courbe qui suit des points (fourreaux, guidon, câbles, haubans).
function courbe(pts, r, seg = 24, rad = 8) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rad, false);
}
// Rotule de soudure / raccord.
function boule(p, r, seg = 10) { const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg - 3)); g.translate(p.x, p.y, p.z); return g; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Couronne dentée plate dans le plan (y, z), épaisseur le long de x. `trou` = rayon intérieur (0 = plein).
function dente(r, n, prof, ep, trou = 0) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n * 4; i++) {
    const a = (i / (n * 4)) * Math.PI * 2;
    const k = i % 4, rr = k === 0 || k === 3 ? r - prof : r + prof * 0.35;
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  if (trou > 0) { const h = new THREE.Path(); h.absarc(0, 0, trou, 0, Math.PI * 2, true); s.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -ep / 2);
  g.rotateY(Math.PI / 2);                    // le plan (x, y) de la forme devient (z, y) : on est dans le plan de la roue
  return g;
}

// ---------------------------------------------------------------- la roue
// Pneu, jante, moyeu à flasques, et 36 rayons CROISÉS en trois : chaque rayon part tangent au flasque, un
// sur deux de chaque côté. C'est ce croisement qui fait qu'une roue de vélo a l'air d'une roue de vélo —
// des rayons en étoile, comme sur l'ancien modèle, font jouet.
function construireRoue(m, avant) {
  const L = new Lots(), g = new THREE.Group();
  const pneu = new THREE.TorusGeometry(ROUE_R - PNEU_TUBE, PNEU_TUBE, 14, 96);
  pneu.rotateY(Math.PI / 2); L.add(m.caoutchouc, pneu);
  // jante : profil en caisson, plus large que haut
  const jante = new THREE.TorusGeometry(JANTE_R, 0.0105, 8, 96);
  jante.rotateY(Math.PI / 2); jante.applyMatrix4(new THREE.Matrix4().makeScale(1.55, 1, 1)); L.add(m.alu, jante);
  // flancs de freinage (bandes brillantes)
  for (const s of [-1, 1]) {
    const f = new THREE.TorusGeometry(JANTE_R + 0.004, 0.0035, 4, 96); f.rotateY(Math.PI / 2); f.translate(s * 0.0125, 0, 0); L.add(m.chrome, f);
  }
  // moyeu : corps, deux flasques, axe
  const prof = [V(0.009, -0.05, 0), V(0.017, -0.043, 0), V(0.013, -0.03, 0), V(0.012, 0, 0), V(0.013, 0.03, 0), V(0.017, 0.043, 0), V(0.009, 0.05, 0)]
    .map((p) => new THREE.Vector2(p.x, p.y));
  const moyeu = new THREE.LatheGeometry(prof, 18); moyeu.rotateZ(Math.PI / 2); L.add(m.alu, moyeu);
  const FL = 0.031, RFL = 0.026;
  for (const s of [-1, 1]) {
    const fl = new THREE.CylinderGeometry(RFL, RFL, 0.003, 22); fl.rotateZ(Math.PI / 2); fl.translate(s * FL, 0, 0); L.add(m.alu, fl);
  }
  const axe = new THREE.CylinderGeometry(0.0045, 0.0045, 0.14, 8); axe.rotateZ(Math.PI / 2); L.add(m.chrome, axe);
  // rayons
  const N = 36, rJ = JANTE_R - 0.004;
  for (let i = 0; i < N; i++) {
    const cote = i % 2 === 0 ? 1 : -1;
    const aM = (i / N) * Math.PI * 2;
    const sens = (Math.floor(i / 2) % 2 === 0) ? 1 : -1;       // tirant / poussant
    const aJ = aM + sens * (3 * (Math.PI * 2) / (N / 2)) * 0.5;
    const pM = V(cote * FL, Math.cos(aM) * RFL, Math.sin(aM) * RFL);
    const pJ = V(cote * 0.0035, Math.cos(aJ) * rJ, Math.sin(aJ) * rJ);
    L.add(m.chrome, tube(pM, pJ, 0.0010, 0.0010, 3));
  }
  // valve
  const valve = tube(V(0, JANTE_R - 0.01, 0), V(0, JANTE_R - 0.045, 0), 0.0035); L.add(m.chrome, valve);
  L.poser(g);
  return g;
}

// ---------------------------------------------------------------- le vélo
export class Velo extends Monture {
  static _reserve = [];
  // `penche` au repos : < 0 = appuyé sur son flanc droit (contre le grillage), > 0 = sur sa béquille.
  // `modele` : un autre vélo dont on COPIE le modèle au lieu de le reconstruire (vélos du parc entier, voir
  // veloDepuisDonnees) : mêmes géométries, sa propre peinture.
  constructor(scene, { x = 0, z = 0, cap = 0, couleur = 0x1f5fbf, penche = 0.13, conduisible = true, appui = 'bequille', modele = null } = {}) {
    super({ x, z, cap, penche, conduisible, appui }, PARAMS_VELO);     // l'état et la conduite : js/monture.js
    this.scene = scene;
    const m = materiaux(couleur);
    this.m = m;
    this.statique = null;          // le vélo garé, fondu par matière (vélos du parc entier, voir _poserStatique)
    this.silhouette = null;        // ... et sa silhouette, vue de loin
    this._niveau = 0;              // niveau de détail affiché : 0 en entier, 1 silhouette, 2 caché (voir presenter)
    this._htAff = { y: 0, pente: 0, tangage: 0 };

    // ---- modèle ----
    if (modele) this._copier(modele);
    else {
      this.racine = new THREE.Group(); this.racine.name = 'velo';
      this.racine.userData.nofuse = true;
      this.racine.userData.dynamique = true;       // il bouge : pas d'ombre cuite dans le bitume à sa place de départ
      // le tangage, puis le roulis. Le groupe du tangage n'existe que sur le relief : sur un terrain plat, le vélo est
      // exactement celui d'avant (même hiérarchie ; et chaque objet de three tire son identifiant au hasard — un groupe de
      // plus décalait tout le hasard du décor qui suit, jusqu'aux passants de La Cage dans le banc de non-régression)
      this.tangage = Monde.plat ? null : new THREE.Group();
      if (this.tangage) this.racine.add(this.tangage);
      this.inclinaison = new THREE.Group(); (this.tangage || this.racine).add(this.inclinaison);
      this._construireCadre(m);
      this._construireDirection(m);
      this.roueAr = construireRoue(m, false); this.roueAr.position.set(0, Y_AXE, Z_AR); this.inclinaison.add(this.roueAr);
      this._construirePedalier(m);
      this._construireChaine(m);
      this._construireBequille(m);
    }
    scene.add(this.racine);
    this.presenter(1);
  }

  // COPIER LE MODÈLE d'un autre vélo : la hiérarchie clonée partage ses géométries et ses matières (Object3D.clone),
  // la chaîne a ses propres maillons (InstancedMesh.copy recopie les matrices), et l'on retrouve chaque pièce
  // articulée en parcourant les deux arbres ensemble. Seule la peinture change.
  _copier(modele) {
    this.racine = modele.racine.clone(true);
    const paire = new Map(), suivre = (a, b) => { paire.set(a, b); a.children.forEach((c, i) => suivre(c, b.children[i])); };
    suivre(modele.racine, this.racine);
    for (const cle of ['tangage', 'inclinaison', 'tige', 'ancreSelle', 'ancreHanche', 'direction', 'rotor', 'roueAv', 'roueAr', 'pedalier', 'maillons', 'bequilleG']) {
      this[cle] = paire.get(modele[cle]) ?? null;
    }
    this.ancresPoignee = { G: paire.get(modele.ancresPoignee.G), D: paire.get(modele.ancresPoignee.D) };
    this.pedales = {};
    for (const c of ['G', 'D']) this.pedales[c] = { groupe: paire.get(modele.pedales[c].groupe), ancre: paire.get(modele.pedales[c].ancre) };
    this.chaine = modele.chaine; this._chaineDecalage = -1;
    if (modele.statique) this.statique = paire.get(modele.statique);
    const pm = modele.m.peinture, p = this.m.peinture;
    if (p !== pm) this.racine.traverse((o) => { if (o.isMesh && o.material === pm) o.material = p; });
    // la silhouette a SES couleurs (dans la géométrie) : on ne la copie pas, _poserStatique en pose une à la bonne peinture
    if (modele.silhouette) paire.get(modele.silhouette).removeFromParent();
  }

  // ======================================================================== CADRE
  _construireCadre(m) {
    const L = new Lots(), g = this.inclinaison;
    const bb = BOITIER;
    const hautSelle = bb.clone().addScaledVector(DIR_SELLE, 0.50);        // haut du tube de selle
    const selleTT = bb.clone().addScaledVector(DIR_SELLE, 0.465);          // raccord du tube horizontal
    const douilleTT = DOUILLE_BAS.clone().addScaledVector(AXE_DIR, 0.125);
    const douilleDT = DOUILLE_BAS.clone().addScaledVector(AXE_DIR, 0.03);
    const P = m.peinture;
    // tubes principaux : oblique (le plus gros), selle, horizontal (tombant, comme sur un vélo de ville)
    L.add(P, tube(bb, douilleDT, 0.0185, 0.0190, 14));
    L.add(P, tube(bb, hautSelle, 0.0145, 0.0145, 14));
    L.add(P, tube(selleTT, douilleTT, 0.0145, 0.0150, 14));
    L.add(P, tube(DOUILLE_BAS, DOUILLE_HAUT, 0.0205, 0.0205, 16));               // douille de direction
    // bases et haubans, dédoublés de part et d'autre de la roue arrière
    const drop = (s) => V(s * 0.066, Y_AXE, Z_AR);
    for (const s of [-1, 1]) {
      L.add(P, courbe([V(s * 0.022, bb.y, bb.z - 0.02), V(s * 0.05, bb.y + 0.02, bb.z - 0.20), drop(s)], 0.0098, 16, 8));
      L.add(P, courbe([V(s * 0.020, hautSelle.y - 0.03, hautSelle.z - 0.01), V(s * 0.052, 0.55, Z_AR + 0.16), drop(s)], 0.0078, 16, 8));
      // pattes arrière
      const pa = new THREE.BoxGeometry(0.006, 0.05, 0.045); pa.translate(s * 0.066, Y_AXE + 0.005, Z_AR + 0.012); L.add(P, pa);
    }
    // boîtier de pédalier (manchon en travers) et raccords soudés
    const man = new THREE.CylinderGeometry(0.021, 0.021, 0.072, 18); man.rotateZ(Math.PI / 2); man.translate(bb.x, bb.y, bb.z); L.add(P, man);
    for (const p of [selleTT, douilleTT, douilleDT]) L.add(P, boule(p, 0.017, 12));
    // collier de selle
    const col = new THREE.CylinderGeometry(0.018, 0.018, 0.022, 16); _qT.setFromUnitVectors(_Y, DIR_SELLE); col.applyQuaternion(_qT);
    col.translate(hautSelle.x, hautSelle.y, hautSelle.z); L.add(m.noir, col);
    // jeu de direction : cuvettes haute et basse
    for (const [p, h] of [[DOUILLE_BAS, -0.008], [DOUILLE_HAUT, 0.008]]) {
      const c = new THREE.CylinderGeometry(0.024, 0.024, 0.012, 18); _qT.setFromUnitVectors(_Y, AXE_DIR); c.applyQuaternion(_qT);
      const q = p.clone().addScaledVector(AXE_DIR, h); c.translate(q.x, q.y, q.z); L.add(m.noir, c);
    }
    // ---- garde-boue arrière (bande cintrée) et ses tringles ----
    L.add(m.noir, gardeBoue(V(0, Y_AXE, Z_AR), ROUE_R + 0.022, 70 * deg, 205 * deg, 0.052));
    for (const s of [-1, 1]) L.add(m.alu, tube(drop(s).clone().add(V(0, -0.005, -0.01)), V(s * 0.03, Y_AXE + Math.sin(170 * deg) * (ROUE_R + 0.02), Z_AR + Math.cos(170 * deg) * (ROUE_R + 0.02)), 0.0022));
    // ---- porte-bagages ----
    const yR = 0.785, z0 = Z_AR + 0.30, z1 = Z_AR - 0.13;
    for (const s of [-1, 1]) {
      L.add(m.noir, tube(V(s * 0.062, yR, z0), V(s * 0.062, yR, z1), 0.0045));
      L.add(m.noir, tube(V(s * 0.062, yR, z1), drop(s).clone().add(V(0, 0.015, -0.02)), 0.0048));      // jambes
      L.add(m.noir, tube(V(s * 0.062, yR, z1 + 0.14), drop(s).clone().add(V(0, 0.02, 0.02)), 0.0040));
      L.add(m.noir, tube(V(s * 0.062, yR, z0), V(s * 0.03, hautSelle.y - 0.05, hautSelle.z - 0.04), 0.0035));   // attaches
    }
    for (const z of [z0, z0 - 0.12, z0 - 0.25, z1]) L.add(m.noir, tube(V(0.062, yR, z), V(-0.062, yR, z), 0.004));
    L.add(m.noir, tube(V(0, yR, z0), V(0, yR, z1), 0.0035));
    // catadioptre arrière et feu
    const cata = new THREE.BoxGeometry(0.07, 0.03, 0.008); cata.translate(0, yR - 0.012, z1 - 0.012); L.add(m.rouge, cata);
    // ---- frein arrière (étrier en V sur les haubans) ----
    const yF = Y_AXE + Math.sin(65 * deg) * JANTE_R, zF = Z_AR + Math.cos(65 * deg) * JANTE_R;
    for (const s of [-1, 1]) {
      L.add(m.alu, tube(V(s * 0.045, yF - 0.03, zF + 0.01), V(s * 0.04, yF + 0.07, zF + 0.035), 0.004));
      const pat = new THREE.BoxGeometry(0.008, 0.034, 0.01); pat.translate(s * 0.022, yF - 0.004, zF + 0.006); L.add(m.noir, pat);
    }
    L.add(m.alu, tube(V(0.04, yF + 0.07, zF + 0.035), V(-0.04, yF + 0.07, zF + 0.035), 0.0018));
    // câble du frein arrière, le long du tube horizontal
    L.add(m.gaine, courbe([douilleTT.clone().add(V(0.02, 0.02, -0.02)), selleTT.clone().add(V(0.018, 0.022, 0.08)), selleTT.clone().add(V(0.02, 0.01, -0.02)), V(0.03, yF + 0.09, zF + 0.05)], 0.0022, 30, 5));
    // câble de dérailleur sous le tube oblique
    L.add(m.gaine, courbe([douilleDT.clone().add(V(-0.015, -0.02, 0)), bb.clone().add(V(-0.012, -0.025, 0.05)), bb.clone().add(V(-0.03, 0.0, -0.18)), V(-0.06, Y_AXE - 0.04, Z_AR + 0.05)], 0.0018, 30, 5));
    // dérailleur arrière (chape sous le pignon)
    const der = new THREE.BoxGeometry(0.01, 0.07, 0.022); der.translate(-0.066, Y_AXE - 0.065, Z_AR + 0.012); L.add(m.noir, der);
    for (const dy of [-0.02, -0.075]) { const gl = new THREE.CylinderGeometry(0.011, 0.011, 0.006, 12); gl.rotateZ(Math.PI / 2); gl.translate(-0.058, Y_AXE + dy, Z_AR + 0.01); L.add(m.noir, gl); }
    L.poser(g);

    // ---- tige et selle : un groupe qui COULISSE le long du tube, pour régler la hauteur au cycliste ----
    this.tige = new THREE.Group(); g.add(this.tige);
    const T = new Lots();
    const dessus = bb.clone().addScaledVector(DIR_SELLE, H_SELLE_BASE);
    T.add(m.alu, tube(bb.clone().addScaledVector(DIR_SELLE, 0.38), dessus.clone().addScaledVector(DIR_SELLE, -0.045), 0.0135, 0.0135, 12));
    const chariot = new THREE.BoxGeometry(0.03, 0.022, 0.05); chariot.translate(dessus.x, dessus.y - 0.035, dessus.z); T.add(m.noir, chariot);
    // la selle : contour vu de dessus (bec étroit, arrière large), épaisseur, arrondi
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.145);
    sh.bezierCurveTo(0.028, 0.145, 0.032, 0.06, 0.042, 0.0);
    sh.bezierCurveTo(0.06, -0.06, 0.09, -0.08, 0.088, -0.11);
    sh.bezierCurveTo(0.085, -0.135, 0.03, -0.14, 0, -0.14);
    sh.bezierCurveTo(-0.03, -0.14, -0.085, -0.135, -0.088, -0.11);
    sh.bezierCurveTo(-0.09, -0.08, -0.06, -0.06, -0.042, 0.0);
    sh.bezierCurveTo(-0.032, 0.06, -0.028, 0.145, 0, 0.145);
    const selle = new THREE.ExtrudeGeometry(sh, { depth: 0.028, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.012, bevelSegments: 4, curveSegments: 16 });
    selle.rotateX(-Math.PI / 2);                 // la forme (x, y) se couche dans (x, -z) ; l'épaisseur monte en +y
    // Le dessus d'une selle est bombé en travers et creusé en long : on le sculpte après coup.
    const pa = selle.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
      if (y > 0.015) pa.setY(i, y - 0.018 * (x / 0.09) * (x / 0.09) - 0.008 * Math.max(0, -z - 0.02) / 0.12 + 0.006 * Math.max(0, z - 0.05) / 0.1);
    }
    selle.computeVertexNormals();
    selle.translate(dessus.x, dessus.y - 0.042, dessus.z - 0.01);
    T.add(m.mat, selle);
    for (const s of [-1, 1]) T.add(m.chrome, courbe([V(s * 0.02, dessus.y - 0.03, dessus.z + 0.11), V(s * 0.03, dessus.y - 0.045, dessus.z), V(s * 0.05, dessus.y - 0.035, dessus.z - 0.12)], 0.003, 12, 5));
    T.poser(this.tige);
    // ancres : là où s'assoient les ischions, et la hanche du cycliste juste au-dessus
    this.ancreSelle = new THREE.Object3D(); this.ancreSelle.position.set(dessus.x, dessus.y - 0.005, dessus.z - 0.055); this.tige.add(this.ancreSelle);
    this.ancreHanche = new THREE.Object3D(); this.ancreHanche.position.set(dessus.x, dessus.y + 0.085, dessus.z - 0.02); this.tige.add(this.ancreHanche);
  }

  // ======================================================================== DIRECTION
  _construireDirection(m) {
    // Groupe posé sur l'axe de direction : son Y local EST l'axe incliné, son Z le perpendiculaire avant.
    // Tourner le rotor autour de Y local, c'est tourner le guidon — et la roue suit, penchée comme il faut.
    this.direction = new THREE.Group();
    const base = new THREE.Matrix4().makeBasis(V(1, 0, 0), AXE_DIR, AXE_AV).setPosition(DOUILLE_BAS);
    this.direction.matrix.copy(base); this.direction.matrix.decompose(this.direction.position, this.direction.quaternion, this.direction.scale);
    this.inclinaison.add(this.direction);
    this.rotor = new THREE.Group(); this.direction.add(this.rotor);
    const inv = base.clone().invert();
    const L = new Lots();
    const ici = (geo) => geo.applyMatrix4(inv);
    const P = m.peinture;
    // pivot, té, fourreaux cintrés vers l'avant (le déport)
    L.add(m.noir, ici(tube(TE_FOURCHE.clone().addScaledVector(AXE_DIR, 0.01), PIVOT_HAUT, 0.0145, 0.0145, 12)));
    const te = new THREE.BoxGeometry(0.13, 0.03, 0.05); _qT.setFromUnitVectors(_Y, AXE_DIR); te.applyQuaternion(_qT); te.translate(TE_FOURCHE.x, TE_FOURCHE.y, TE_FOURCHE.z);
    L.add(P, ici(te));
    for (const s of [-1, 1]) {
      const haut = TE_FOURCHE.clone().add(V(s * 0.05, 0, 0));
      const mi = A0.clone().addScaledVector(AXE_DIR, 0.18).add(V(s * 0.052, 0, 0)).addScaledVector(AXE_AV, 0.006);
      const bas = AXE_AV_ROUE.clone().add(V(s * 0.052, 0.004, 0));
      L.add(P, ici(courbe([haut, mi, bas.clone().addScaledVector(AXE_AV, -0.012), bas], 0.0125, 20, 10)));
      const pat = new THREE.BoxGeometry(0.006, 0.045, 0.03); pat.translate(bas.x, bas.y, bas.z); L.add(P, ici(pat));
    }
    // entretoises, potence, capot
    L.add(m.noir, ici(tube(DOUILLE_HAUT.clone().addScaledVector(AXE_DIR, 0.012), PIVOT_HAUT.clone().addScaledVector(AXE_DIR, -0.018), 0.0165, 0.0165, 14)));
    L.add(m.noir, ici(tube(PIVOT_HAUT.clone().addScaledVector(AXE_DIR, -0.03), POTENCE, 0.016, 0.017, 14)));
    L.add(m.noir, ici(boule(POTENCE, 0.022, 14)));
    // guidon « city » : relevé et cintré vers l'arrière, pour une position droite
    const B = POTENCE;
    const pts = [[-0.31, 0.058, -0.155], [-0.23, 0.052, -0.12], [-0.13, 0.024, -0.045], [-0.05, 0.004, -0.006], [0, 0, 0]];
    const cintre = pts.map(([x, y, z]) => V(x, y, z).add(B)).concat(pts.slice(0, 4).reverse().map(([x, y, z]) => V(-x, y, z).add(B)));
    L.add(m.alu, ici(courbe(cintre, 0.0112, 60, 10)));
    // poignées ergonomiques, leviers de frein, sonnette
    this.ancresPoignee = {};
    for (const s of [-1, 1]) {
      const a = V(s * 0.205, 0.046, -0.098).add(B), b = V(s * 0.315, 0.058, -0.158).add(B);
      L.add(m.mat, ici(tube(a, b, 0.0165, 0.0175, 14)));
      L.add(m.mat, ici(boule(b, 0.0185, 12)));
      for (let k = 1; k < 6; k++) L.add(m.mat, ici(tube(a.clone().lerp(b, k / 6 - 0.012), a.clone().lerp(b, k / 6 + 0.012), 0.0178, 0.0178, 14)));
      // levier : lame devant la poignée
      const pv = V(s * 0.19, 0.05, -0.085).add(B);
      L.add(m.alu, ici(courbe([pv, pv.clone().add(V(s * 0.05, -0.018, 0.045)), pv.clone().add(V(s * 0.11, -0.02, 0.028))], 0.004, 12, 6)));
      const cl = new THREE.BoxGeometry(0.03, 0.03, 0.035); cl.translate(pv.x, pv.y + 0.005, pv.z - 0.005); L.add(m.noir, ici(cl));
      // câble du frein avant (gauche) jusqu'à l'étrier ; le droit part vers l'arrière (câble du cadre)
      if (s > 0) {
        const yF = Y_AXE + Math.sin(115 * deg) * JANTE_R, zF = Z_AV + Math.cos(115 * deg) * JANTE_R;
        L.add(m.gaine, ici(courbe([pv.clone().add(V(0, 0.01, -0.01)), pv.clone().add(V(-0.05, 0.035, 0.05)), B.clone().add(V(0.03, -0.01, 0.07)), B.clone().add(V(0.03, -0.12, 0.10)), V(0.03, yF + 0.09, zF + 0.02)], 0.0022, 30, 5)));
      }
      // ancre : le centre de la poignée (on y pose la main)
      const o = new THREE.Object3D(); o.position.copy(a.clone().lerp(b, 0.5)).applyMatrix4(inv); this.rotor.add(o);
      this.ancresPoignee[s > 0 ? 'G' : 'D'] = o;
    }
    const son = new THREE.SphereGeometry(0.02, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); son.translate(0.12, 0.018, -0.03); son.translate(B.x, B.y, B.z); L.add(m.chrome, ici(son));
    // frein avant (étrier en V sur la fourche)
    const yF = Y_AXE + Math.sin(115 * deg) * JANTE_R, zF = Z_AV + Math.cos(115 * deg) * JANTE_R;
    for (const s of [-1, 1]) {
      L.add(m.alu, ici(tube(V(s * 0.047, yF - 0.03, zF - 0.01), V(s * 0.042, yF + 0.07, zF - 0.035), 0.004)));
      const pat = new THREE.BoxGeometry(0.008, 0.034, 0.01); pat.translate(s * 0.022, yF - 0.004, zF - 0.006); L.add(m.noir, ici(pat));
    }
    L.add(m.alu, ici(tube(V(0.04, yF + 0.07, zF - 0.035), V(-0.04, yF + 0.07, zF - 0.035), 0.0018)));
    // garde-boue avant et catadioptre blanc
    L.add(m.noir, ici(gardeBoue(AXE_AV_ROUE, ROUE_R + 0.022, -15 * deg, 150 * deg, 0.05)));
    for (const s of [-1, 1]) L.add(m.alu, ici(tube(AXE_AV_ROUE.clone().add(V(s * 0.056, 0, 0.008)), AXE_AV_ROUE.clone().add(V(s * 0.03, Math.sin(-10 * deg) * (ROUE_R + 0.02), Math.cos(-10 * deg) * (ROUE_R + 0.02))), 0.0022)));
    const cata = new THREE.BoxGeometry(0.05, 0.035, 0.008); cata.translate(B.x, B.y - 0.04, B.z + 0.05); L.add(m.blanc, ici(cata));
    L.poser(this.rotor);
    // la roue avant, dans le repère du rotor
    this.roueAv = construireRoue(m, true);
    this.roueAv.position.copy(AXE_AV_ROUE).applyMatrix4(inv);
    this.rotor.add(this.roueAv);
  }

  // ======================================================================== PÉDALIER
  _construirePedalier(m) {
    this.pedalier = new THREE.Group(); this.pedalier.position.copy(BOITIER); this.inclinaison.add(this.pedalier);
    const L = new Lots();
    // plateau denté 42 dents, étoile à cinq branches, côté droit
    L.add(m.alu, (() => { const g = dente(PLATEAU_R, 42, 0.0045, 0.003, 0.058); g.translate(X_CHAINE - 0.002, 0, 0); return g; })());
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      L.add(m.alu, tube(V(X_CHAINE + 0.004, 0, 0), V(X_CHAINE - 0.001, Math.cos(a) * 0.062, Math.sin(a) * 0.062), 0.006, 0.0045, 6));
    }
    // axe
    const axe = new THREE.CylinderGeometry(0.009, 0.009, 0.15, 12); axe.rotateZ(Math.PI / 2); L.add(m.chrome, axe);
    // manivelles effilées : la droite pointe vers l'avant à 0, la gauche à l'opposé
    const bras = (x, sens) => L.add(m.alu, tube(V(x, 0, 0), V(x, 0, sens * MANIVELLE), 0.0115, 0.0085, 10));
    bras(-0.074, 1); bras(0.074, -1);
    L.poser(this.pedalier);
    // pédales plateformes : elles tournent en sens inverse du pédalier pour rester à plat
    this.pedales = {};
    for (const [cote, x, sens] of [['D', -0.105, 1], ['G', 0.105, -1]]) {
      const pg = new THREE.Group(); pg.position.set(x, 0, sens * MANIVELLE); this.pedalier.add(pg);
      const P = new Lots();
      const cadre = new THREE.BoxGeometry(0.075, 0.018, 0.085); P.add(m.noir, cadre);
      for (const dz of [-0.038, 0.038]) { const d = new THREE.BoxGeometry(0.079, 0.006, 0.006); d.translate(0, 0.011, dz); P.add(m.alu, d); }
      const cat = new THREE.BoxGeometry(0.006, 0.012, 0.03); cat.translate(Math.sign(x) * 0.04, 0, 0); P.add(m.orange, cat);
      const ax = new THREE.CylinderGeometry(0.006, 0.006, 0.05, 8); ax.rotateZ(Math.PI / 2); ax.translate(-Math.sign(x) * 0.035, 0, 0); P.add(m.chrome, ax);
      P.poser(pg);
      const o = new THREE.Object3D(); o.position.set(0, 0.012, 0); pg.add(o);
      this.pedales[cote] = { groupe: pg, ancre: o };
    }
  }

  // ======================================================================== CHAÎNE
  // Une vraie chaîne à maillons : le trajet (deux arcs, deux brins tendus) est calculé à partir des deux
  // pignons, puis on y place un maillon tous les 12,7 mm. Quand on pédale, les maillons AVANCENT le long du
  // trajet — c'est un détail, mais une chaîne figée pendant qu'on pédale se voit.
  _construireChaine(m) {
    const c1 = new THREE.Vector2(BOITIER.z, BOITIER.y), c2 = new THREE.Vector2(Z_AR, Y_AXE);
    const r1 = PLATEAU_R, r2 = PIGNON_R;
    const d = c2.clone().sub(c1), D = d.length(); d.normalize();
    const p = new THREE.Vector2(-d.y, d.x);                         // normale « au-dessus » du trajet
    const k = (r1 - r2) / D, s = Math.sqrt(1 - k * k);
    const nH = d.clone().multiplyScalar(k).add(p.clone().multiplyScalar(s));      // tangente du haut
    const nB = d.clone().multiplyScalar(k).add(p.clone().multiplyScalar(-s));     // tangente du bas
    const pts = [];
    const arc = (c, r, a0, a1, n) => { for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push(new THREE.Vector2(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r)); } };
    const ang = (v) => Math.atan2(v.y, v.x);
    // plateau : du point bas au point haut en passant par l'AVANT (loin du pignon)
    let a0 = ang(nB), a1 = ang(nH); if (a1 < a0) a1 += Math.PI * 2;
    // on fait le tour par le côté opposé au pignon : si l'arc court passe côté pignon, on prend le long
    const milieu = (a0 + a1) / 2;
    if (Math.cos(milieu) * d.x + Math.sin(milieu) * d.y > 0) { a1 -= Math.PI * 2; }
    arc(c1, r1, a0, a1, 40);
    // brin du haut, arc du pignon par l'arrière, brin du bas
    const t2H = c2.clone().add(nH.clone().multiplyScalar(r2)), t2B = c2.clone().add(nB.clone().multiplyScalar(r2));
    pts.push(t2H.clone());
    let b0 = ang(nH), b1 = ang(nB); if (b1 < b0) b1 += Math.PI * 2;
    const mi2 = (b0 + b1) / 2;
    if (Math.cos(mi2) * d.x + Math.sin(mi2) * d.y < 0) b1 -= Math.PI * 2;
    arc(c2, r2, b0, b1, 20);
    pts.push(c1.clone().add(nB.clone().multiplyScalar(r1)));
    // longueurs cumulées
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    this.chaine = { pts, cum, L: cum[cum.length - 1] };
    const n = Math.floor(this.chaine.L / 0.0127);
    const geo = new THREE.BoxGeometry(0.0086, 0.0078, 0.0122);   // plaques d'une vraie chaine 1/2 x 3/32
    this.maillons = new THREE.InstancedMesh(geo, m.chaine, n);
    this.maillons.castShadow = false;
    this.inclinaison.add(this.maillons);
    this._chaineDecalage = -1;
    // pignons de la cassette (fixes au moyeu arrière : ils tournent avec la roue)
    const L = new Lots();
    [0.036, 0.041, 0.047, 0.053, 0.060, 0.067, 0.074].forEach((r, i) => { const g = dente(r, Math.round(r * 450), 0.003, 0.0022, 0.012); g.translate(-0.040 - i * 0.0042, 0, 0); L.add(m.alu, g); });
    L.poser(this.roueAr);
  }
  _placerMaillons(man) {
    const C = this.chaine, n = this.maillons.count;
    const dec = ((man * PLATEAU_R) % C.L + C.L) % C.L;
    if (Math.abs(dec - this._chaineDecalage) < 1e-4) return;
    this._chaineDecalage = dec;
    const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), un = new THREE.Vector3(1, 1, 1);
    const tg = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
    let j = 0;
    for (let i = 0; i < n; i++) {
      // le brin du haut va du plateau vers le pignon : pédaler fait donc RECULER le paramètre
      let s = ((i * C.L) / n - dec) % C.L; if (s < 0) s += C.L;
      while (j > 0 && C.cum[j] > s) j--;
      while (j < C.cum.length - 2 && C.cum[j + 1] < s) j++;
      const a = C.pts[j], b = C.pts[j + 1], t = (s - C.cum[j]) / Math.max(1e-6, C.cum[j + 1] - C.cum[j]);
      pos.set(X_CHAINE, a.y + (b.y - a.y) * t, a.x + (b.x - a.x) * t);
      tg.set(0, b.y - a.y, b.x - a.x).normalize();
      q.setFromUnitVectors(Z, tg);
      mat.compose(pos, q, un);
      this.maillons.setMatrixAt(i, mat);
    }
    this.maillons.instanceMatrix.needsUpdate = true;
  }

  // ======================================================================== BÉQUILLE
  _construireBequille(m) {
    this.bequilleG = new THREE.Group();
    this.bequilleG.position.set(0.045, BOITIER.y + 0.005, BOITIER.z - 0.12);
    this.inclinaison.add(this.bequilleG);
    const L = new Lots();
    L.add(m.alu, tube(V(0, 0, 0), V(0, -0.305, 0), 0.0075, 0.006, 10));
    const pied = new THREE.BoxGeometry(0.03, 0.008, 0.045); pied.translate(0, -0.307, 0); L.add(m.noir, pied);
    L.poser(this.bequilleG);
  }

  // ======================================================================== CE QUI TOURNE EN ROULANT
  // (appelé par Monture.conduire à la fin de chaque pas : la conduite elle-même est dans js/monture.js)
  _animer(dt) {
    // ---- pédalier et roues ----
    this.roue += (this.v / ROUE_R) * dt;
    if (this.effort > 0.05) {
      // cadence : un tour de pédalier pour 2,2 tours de roue ; au démarrage on mouline quand même
      const w = Math.max(3.2, (this.v / ROUE_R) / 2.2) * this.effort;
      this.manivelle += w * dt;
    } else if (this.arret > 0.5) {
      // à l'arrêt : on remonte la pédale droite en haut et devant, prête à repartir (« pédale armée »)
      const cibleM = -0.78;
      let dm = cibleM - this.manivelle; dm = Math.atan2(Math.sin(dm), Math.cos(dm));
      this.manivelle += dm * (1 - Math.exp(-dt * 4));
    } else {
      // roue libre : les pédales se mettent à l'horizontale, comme quand on se laisse descendre
      const cibleM = Math.round(this.manivelle / Math.PI) * Math.PI;
      this.manivelle += (cibleM - this.manivelle) * (1 - Math.exp(-dt * 2.2));
    }
  }

  // RÉSERVE pour les cyclistes DISTANTS. Construire un vélo (36 rayons par roue, chaîne, pédalier...) prend
  // quelques dizaines de millisecondes : le faire dans le gestionnaire d'un paquet réseau figeait l'image de
  // tous les joueurs du terrain au moment où quelqu'un montait en selle, et chaque joueur parti laissait
  // derrière lui deux mégaoctets de géométrie. On en prépare un au chargement et on les recycle.
  static emprunter(scene) {
    const v = Velo._reserve.find((x) => x.scene === scene);
    if (v) Velo._reserve.splice(Velo._reserve.indexOf(v), 1);
    const b = v || new Velo(scene, { conduisible: false, appui: null });
    b.v = 0; b.braq = 0; b.penche = 0; b.bequille = 0; b.effort = 0; b.arret = 1; b.danseuse = 0; b.appui = null;
    b.racine.visible = true;
    return b;
  }
  static rendre(b) { b.racine.visible = false; b.pris = false; Velo._reserve.push(b); }
  static preparer(scene, n = 1) {
    // (au parc entier, les vélos du parc sont déjà là : la réserve en COPIE un, 1 ms au lieu de 70 ; ailleurs, rien ne
    // change, le vélo de réserve est construit comme avant)
    const modele = Monde.plat ? null : (scene.userData.velos || []).find((x) => x instanceof Velo) || null;
    while (Velo._reserve.filter((x) => x.scene === scene).length < n) {
      const b = new Velo(scene, { conduisible: false, appui: null, modele });
      b.racine.visible = false; Velo._reserve.push(b);
    }
  }

  // Hauteur de selle réglée au cycliste (la tige coulisse dans le tube).
  regler(h) { this.hSelle = Math.max(0.58, Math.min(0.86, h)); }

  // ======================================================================== AFFICHAGE
  // `a` : la fraction du pas de simulation à interpoler ; `oeil` : la position de la caméra, pour le niveau de détail
  // des vélos garés du parc entier (sans elle, ou pour tout autre vélo, le vélo est dessiné en entier).
  presenter(a, oeil = null) {
    // (vélo garé caché de loin, voir plus bas : rien à poser tant qu'il le reste — 16 µs par vélo et par image)
    if (this._niveau === 2 && oeil && !this.pris && Math.hypot(oeil.x - this.pos.x, oeil.z - this.pos.z) > LOD_VELO.cache - 2) return;
    const p = this.prec, L = (x, y) => x + (y - x) * a;
    let dc = this.cap - p.cap; dc = Math.atan2(Math.sin(dc), Math.cos(dc));
    const x = L(p.x, this.pos.x), z = L(p.z, this.pos.z), cap = p.cap + dc * a;
    if (Monde.plat) this.racine.position.set(x, 0, z);
    else {
      // POSÉ SUR LE RELIEF : chaque roue sur le sol sous elle, le cadre bascule de l'une à l'autre (js/monture.js). Nez
      // levé en montée : une rotation positive autour de +x baisserait le nez (+z vers -y), d'où le signe.
      const h = this._hauteurEtTangage(x, z, cap, this._htAff);
      this.racine.position.set(x, h.y, z);
      if (this.tangage) this.tangage.rotation.x = -h.tangage;
    }
    this.racine.rotation.y = cap;
    const roue = L(p.roue, this.roue);
    this.roueAr.rotation.x = roue; this.roueAv.rotation.x = roue;
    const man = L(p.manivelle, this.manivelle);
    // EN DANSEUSE, le vélo se balance sous le cycliste : on le couche du côté opposé à la pédale qu'on
    // écrase. La manivelle droite pointe vers l'avant à 0 : cos(man) vaut 1 quand le pied droit appuie.
    const dans = L(p.danseuse ?? this.danseuse, this.danseuse);
    this.balancier = 0.11 * dans * Math.cos(man);
    // penche > 0 = vers la gauche (+x) : une rotation positive autour de +z pencherait vers -x
    this.inclinaison.rotation.z = -(L(p.penche, this.penche) + this.balancier);
    this.rotor.rotation.y = L(p.braq, this.braq) - 0.5 * this.balancier;
    this.pedalier.rotation.x = man;
    // les pédales restent à plat (légère cheville en bas de course)
    for (const c of ['D', 'G']) {
      const ph = man + (c === 'G' ? Math.PI : 0);
      this.pedales[c].groupe.rotation.x = -man + 0.18 * Math.sin(ph);
    }
    this.tige.position.copy(DIR_SELLE).multiplyScalar(this.hSelle - H_SELLE_BASE);
    // béquille : repliée le long de la base (vers l'arrière), dépliée vers le sol et un peu en dehors
    const b = this.bequille;
    this.bequilleG.rotation.set(1.25 * (1 - b) + 0.12 * b, 0, 0.30 * b);
    this._placerMaillons(man);
    // GARÉ COMME AU CHARGEMENT (vélos du parc entier) : la version fondue, 7 appels de dessin au lieu de 36. Dès
    // qu'il bouge (pris, roulé, béquille qui se déplie, guidon qui retombe), le modèle articulé reprend la main ; un
    // vélo roulé puis garé ailleurs le garde (ses pédales et ses roues ne sont plus dans la pose fondue).
    // DE LOIN (vélos du parc entier garés, `oeil` = la caméra) : au-delà de 30 m sa SILHOUETTE (un appel de dessin, un
    // millier de triangles), au-delà de 110 m plus rien — un vélo y fait moins de dix pixels, et chaque vélo garé coûtait
    // sinon ses appels dans chaque passe de rendu, même à 190 m (2 m d'hystérésis pour ne pas clignoter).
    if (this.statique) {
      let niveau = 0;
      if (oeil && !this.pris) {
        const d = Math.hypot(oeil.x - x, oeil.z - z), n0 = this._niveau, H = 2;
        niveau = d > LOD_VELO.cache + (n0 === 2 ? -H : H) ? 2 : d > LOD_VELO.silhouette + (n0 >= 1 ? -H : H) ? 1 : 0;
      }
      if (!this.tangage || (niveau === 1 && !this.silhouette)) niveau = 0;   // (terrain plat, ou pas de silhouette : en entier)
      this._niveau = niveau;
      const S = this._poseFigee;                   // la pose dans laquelle CE vélo a été fondu (figerPose)
      const fige = niveau === 0 && !this.pris && (S
        ? b === S.b && man === S.man && roue === S.roue && this.balancier === S.bal && Math.abs(L(p.penche, this.penche) - S.penche) < 1e-4
          && Math.abs(L(p.braq, this.braq) - S.braq) < 1e-4 && this.hSelle === S.hSelle
        : b === 1 && man === POSE_GAREE.manivelle && roue === 0 && this.balancier === 0
          && Math.abs(L(p.penche, this.penche) - POSE_GAREE.penche) < 1e-4 && Math.abs(L(p.braq, this.braq) - POSE_GAREE.braq) < 1e-4
          && this.hSelle === H_SELLE_BASE);
      this.statique.visible = fige; this.inclinaison.visible = niveau === 0 && !fige;
      if (this.silhouette) this.silhouette.visible = niveau === 1;
      if (this.tangage) this.tangage.visible = niveau !== 2;
    }
    this.racine.updateMatrixWorld(true);
  }

  // Le vélo garé fondu (voir cuireGare) posé dans le groupe du tangage de CE vélo, avec sa peinture. Caché tant que
  // presenter() ne l'a pas choisi.
  _poserStatique() {
    const lots = this._lots || _gare;            // sa propre pose fondue (figerPose), sinon celle des vélos du parc entier
    if (lots && !this.statique) {
      const g = new THREE.Group(); g.name = 'velo garé';
      if (!_petitesMat) _petitesMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.4 });
      for (const [cle, geo] of lots) {
        const mesh = new THREE.Mesh(geo, cle === 'peinture' ? this.m.peinture : cle === 'petites' ? _petitesMat : this.m[cle]);
        mesh.castShadow = true; mesh.receiveShadow = true;
        g.add(mesh);
      }
      g.visible = false;
      (this.tangage || this.racine).add(g); this.statique = g;
    }
    // la silhouette (voir cuireSilhouette) : la géométrie commune, recolorée à la peinture de ce vélo. Elle ne porte pas
    // d'ombre (à plus de 30 m, l'ombre d'un vélo tient dans deux texels de la carte d'ombre).
    if (_silhouette && this.statique && !this.silhouette) {
      const geo = _silhouette.geo.clone(), col = geo.getAttribute('color'), c = new THREE.Color(this.m.peinture.color);
      for (const i of _silhouette.peints) col.setXYZ(i, c.r, c.g, c.b);
      const s = new THREE.Mesh(geo, _silhouette.mat);
      s.name = 'velo (silhouette)'; s.castShadow = false; s.receiveShadow = true; s.visible = false;
      this.tangage.add(s); this.silhouette = s;
    }
  }

  // Points du monde dont le cycliste a besoin, après presenter().
  ancres(out) {
    this.ancreHanche.getWorldPosition(out.hanche);
    this.ancresPoignee.G.getWorldPosition(out.poigneeG);
    this.ancresPoignee.D.getWorldPosition(out.poigneeD);
    this.pedales.G.ancre.getWorldPosition(out.pedaleG);
    this.pedales.D.ancre.getWorldPosition(out.pedaleD);
    this.inclinaison.getWorldQuaternion(out.qCadre);
    this.rotor.getWorldQuaternion(out.qGuidon);
    // la pose « debout » du cycliste en danseuse : le cadre sans son roulis (sur le relief, avec son tangage : dans une
    // côte, on se tient droit par rapport au vélo, pas par rapport à l'horizon)
    if (out.qSol) { if (Monde.plat || !this.tangage) out.qSol.copy(this.racine.quaternion); else this.tangage.getWorldQuaternion(out.qSol); }
    return out;
  }

  // HAUTEUR DE SELLE réglée à la jambe du cycliste — comme chez un vélociste : jambe presque tendue, genou
  // encore un peu fléchi, quand la pédale est tout en bas. Sans ce réglage, un grand joueur pédalait les
  // genoux dans le menton et un petit ne touchait plus les pédales (la cinématique inverse tendait alors la
  // jambe au maximum et le pied flottait au-dessus de la pédale).
  // On résout |hanche(h) - cheville_bas| = 0,965 × jambe, avec hanche(h) = boîtier + h·tube + décalage
  // de la hanche au-dessus de la selle : une équation du second degré en h.
  static hauteurSellePour(jambe) {
    const c = new THREE.Vector3(0, 0.085, -0.02)                                     // hanche au-dessus de la selle
      .sub(new THREE.Vector3(0, -MANIVELLE + 0.012 + CHEVILLE.haut, -CHEVILLE.arriere));   // cheville, pédale en bas
    const cs = c.dot(DIR_SELLE), t = 0.965 * jambe;
    const disc = cs * cs - c.lengthSq() + t * t;
    return disc > 0 ? -cs + Math.sqrt(disc) : H_SELLE_BASE;
  }

  retirer() { this.scene.remove(this.racine); }

  // LE VÉLO GARÉ FONDU DANS SA PROPRE POSE (04/10/2026). Les vélos des terrains plats (les deux de La Cage : l'un
  // appuyé au grillage, l'autre sur le trottoir) n'étaient pas dans la pose garée du parc entier : ils restaient en
  // 36 pièces, 72 appels de dessin par passe pour deux vélos immobiles. On fond CE vélo tel qu'il est posé, par
  // matière (7 appels) ; dès qu'il bouge — pris, poussé, béquille, guidon —, le modèle articulé reprend la main, comme
  // pour ceux du parc (presenter). À appeler une fois le vélo posé.
  figerPose() {
    if (this.statique) return;
    this.presenter(1);
    this._lots = fondre(this);
    this._poseFigee = { b: this.bequille, man: this.manivelle, roue: this.roue, bal: this.balancier, penche: this.penche, braq: this.braq, hSelle: this.hSelle };
    this._poserStatique();
    this.presenter(1);
  }
}

// ======================================================================== LES VÉLOS DU PARC ENTIER
// La pose d'un vélo garé sur sa béquille, telle que garerSec() la donne (et que reposer() garde) : c'est dans cette
// pose, pédalier et roues comme au sortir du constructeur, que le vélo est fondu (cuireGare).
const POSE_GAREE = { penche: 0.13, braq: 0.18, manivelle: 0.6 };
// Le vélo garé, FONDU PAR MATIÈRE : clé de matière (celles de materiaux() : 'alu', 'chrome', 'peinture'...) ->
// géométrie de toutes les pièces de cette matière, dans le repère du groupe `tangage`. Le cap, la position et la
// bascule sur la pente restent donc à chaque vélo ; tout le reste est commun aux six (un seul exemplaire en mémoire).
// Les PETITES PIÈCES (catadioptres, câbles, chaîne) partagent une matière à couleurs par sommet : 7 appels de dessin
// par passe au lieu de 11, pour des pièces de quelques centimètres.
let _gare = null;
const PETITES = new Set(['rouge', 'blanc', 'orange', 'gaine', 'chaine']);
let _petitesMat = null;

// Fondre le vélo `b` (pris dans la pose garée) : chaque pièce de son `inclinaison` — les maillons de la chaîne un par
// un — ramenée dans le repère du tangage, puis toutes les pièces d'une même matière réunies en une géométrie.
function cuireGare(b) { _gare = fondre(b); }
// (le repère : le groupe du tangage au parc entier ; sur un terrain plat, où il n'existe pas, la racine du vélo)
function fondre(b) {
  b.racine.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy((b.tangage || b.racine).matrixWorld).invert(), rel = new THREE.Matrix4(), mi = new THREE.Matrix4();
  const cles = new Map();
  for (const [cle, mat] of Object.entries(b.m)) if (mat && mat.isMaterial) cles.set(mat, cle);
  const lots = new Map();
  // (mêmes attributs pour toutes les pièces, sans index : c'est ce que la fusion exige ; les petites pièces ont en plus
  // la couleur de leur matière, par sommet)
  const piece = (geo, m, couleur) => {
    const s = geo.index ? geo.toNonIndexed() : geo, g = new THREE.BufferGeometry(), nb = s.getAttribute('position').count;
    for (const a of ['position', 'normal', 'uv']) {
      const at = s.getAttribute(a);
      g.setAttribute(a, at ? at.clone() : new THREE.Float32BufferAttribute(new Float32Array(nb * 2), 2));
    }
    if (couleur) {
      const col = new Float32Array(nb * 3);
      for (let i = 0; i < nb; i++) { col[i * 3] = couleur.r; col[i * 3 + 1] = couleur.g; col[i * 3 + 2] = couleur.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    return g.applyMatrix4(m);
  };
  b.inclinaison.traverse((o) => {
    let cle = o.isMesh && cles.get(o.material);
    if (!cle) return;
    const couleur = PETITES.has(cle) ? o.material.color : null;
    if (couleur) cle = 'petites';
    if (!lots.has(cle)) lots.set(cle, []);
    rel.multiplyMatrices(inv, o.matrixWorld);
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, mi); lots.get(cle).push(piece(o.geometry, mi.premultiply(rel), couleur)); }
    } else lots.get(cle).push(piece(o.geometry, rel, couleur));
  });
  const fondu = new Map();
  for (const [cle, geos] of lots) {
    const g = mergeGeometries(geos, false);
    for (const x of geos) x.dispose();
    if (g) { g.computeBoundingSphere(); fondu.set(cle, g); }
  }
  return fondu;
}

// Le niveau de détail d'un vélo garé du parc entier, selon sa distance à la caméra (m) : silhouette au-delà de
// `silhouette`, rien au-delà de `cache`.
const LOD_VELO = { silhouette: 30, cache: 110 };
// LA SILHOUETTE : { geo, peints, mat }. Un vélo en quelques volumes — pneus et jantes en anneaux, tubes du cadre, fourche,
// guidon, selle, porte-bagages, béquille —, posés sur les articulations du vélo `b` (dans sa pose garée) et ramenés
// dans le repère de son tangage, comme le vélo fondu. Couleurs par sommet (une seule matière, un seul appel de
// dessin) ; `peints` : les sommets du cadre, que chaque vélo recolore à sa peinture.
let _silhouette = null;
function cuireSilhouette(b) {
  b.racine.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(b.tangage.matrixWorld).invert(), rel = new THREE.Matrix4();
  // (la fourche et le guidon sont décrits dans le repère du vélo : on les ramène d'abord dans celui de la direction)
  const invBase = new THREE.Matrix4().makeBasis(V(1, 0, 0), AXE_DIR, AXE_AV).setPosition(DOUILLE_BAS).invert();
  const geos = [], peints = [];
  let n = 0;
  const poser = (geo, groupe, couleur, depuisVelo = false) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
    rel.multiplyMatrices(inv, groupe.matrixWorld);
    if (depuisVelo) rel.multiply(invBase);
    g.applyMatrix4(rel);
    const nb = g.getAttribute('position').count, c = new THREE.Color(couleur ?? 0xffffff), col = new Float32Array(nb * 3);
    for (let i = 0; i < nb; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; if (couleur === null) peints.push(n + i); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(g); n += nb;
  };
  const NOIR = 0x17181b, ALU = 0xc9cdd3, PNEU = 0x1c1c1d, PEINT = null;
  const t = (a, bb, r) => tube(a, bb, r, r, 5);
  // les roues : le pneu et la jante, en anneaux (dans le repère de chaque roue)
  for (const roue of [b.roueAr, b.roueAv]) {
    const pneu = new THREE.TorusGeometry(ROUE_R - PNEU_TUBE, PNEU_TUBE * 1.1, 4, 20); pneu.rotateY(Math.PI / 2); poser(pneu, roue, PNEU);
    const jante = new THREE.TorusGeometry(JANTE_R, 0.012, 3, 20); jante.rotateY(Math.PI / 2); poser(jante, roue, ALU);
  }
  // le cadre (dans le repère de l'inclinaison, celui où il est construit)
  const bb = BOITIER, hautSelle = bb.clone().addScaledVector(DIR_SELLE, 0.50), selleTT = bb.clone().addScaledVector(DIR_SELLE, 0.465);
  const douilleTT = DOUILLE_BAS.clone().addScaledVector(AXE_DIR, 0.125), douilleDT = DOUILLE_BAS.clone().addScaledVector(AXE_DIR, 0.03);
  const I = b.inclinaison;
  poser(t(bb, douilleDT, 0.02), I, PEINT); poser(t(bb, hautSelle, 0.016), I, PEINT); poser(t(selleTT, douilleTT, 0.016), I, PEINT);
  poser(t(DOUILLE_BAS, DOUILLE_HAUT, 0.022), I, PEINT);
  for (const s of [-1, 1]) {
    const drop = V(s * 0.066, Y_AXE, Z_AR);
    poser(t(V(s * 0.022, bb.y, bb.z), drop, 0.011), I, PEINT);
    poser(t(V(s * 0.02, hautSelle.y - 0.03, hautSelle.z), drop, 0.009), I, PEINT);
  }
  const yR = 0.785, rack = new THREE.BoxGeometry(0.13, 0.012, 0.43); rack.translate(0, yR, Z_AR + 0.085); poser(rack, I, NOIR);
  const gb = new THREE.BoxGeometry(0.05, 0.012, 0.5); gb.rotateX(-0.35); gb.translate(0, Y_AXE + ROUE_R + 0.01, Z_AR - 0.12); poser(gb, I, NOIR);
  // la selle et sa tige (dans le repère de la tige)
  const dessus = bb.clone().addScaledVector(DIR_SELLE, H_SELLE_BASE);
  poser(t(hautSelle, dessus, 0.013), b.tige, ALU);
  const selle = new THREE.BoxGeometry(0.15, 0.05, 0.27); selle.translate(dessus.x, dessus.y - 0.02, dessus.z - 0.01); poser(selle, b.tige, NOIR);
  // la fourche, la potence, le guidon et ses poignées (dans le repère de la direction, qui porte le braquage)
  for (const s of [-1, 1]) poser(t(TE_FOURCHE.clone().add(V(s * 0.05, 0, 0)), AXE_AV_ROUE.clone().add(V(s * 0.052, 0, 0)), 0.012), b.rotor, PEINT, true);
  poser(t(DOUILLE_HAUT, POTENCE, 0.016), b.rotor, NOIR, true);
  const B0 = POTENCE, gauche = V(0.31, 0.058, -0.155).add(B0), droite = V(-0.31, 0.058, -0.155).add(B0);
  poser(t(gauche, B0, 0.011), b.rotor, ALU, true); poser(t(B0, droite, 0.011), b.rotor, ALU, true);
  for (const s of [-1, 1]) poser(t(V(s * 0.205, 0.046, -0.098).add(B0), V(s * 0.315, 0.058, -0.158).add(B0), 0.017), b.rotor, NOIR, true);
  // le pédalier (un disque) et la béquille (dans leurs repères)
  const plateau = new THREE.CylinderGeometry(PLATEAU_R, PLATEAU_R, 0.01, 10); plateau.rotateZ(Math.PI / 2); plateau.translate(X_CHAINE, 0, 0); poser(plateau, b.pedalier, ALU);
  poser(t(V(0, 0, 0), V(0, -0.305, 0), 0.008), b.bequilleG, ALU);
  _silhouette = {
    geo: mergeGeometries(geos, false), peints,
    mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.35 }),
  };
  _silhouette.geo.computeBoundingSphere();
}

// LES SIX VÉLOS du parc entier (conception § 2.7 ; monde.json > velos : `{ id, x, z, cap, couleur, nom }`, repère du
// terrain 1, cap en degrés, couleur '#rrggbb'). Garés sur leur béquille, conduisibles comme celui de La Cage, décalés
// de `dx` sur le terrain 2. Le premier est construit, les suivants le copient (voir Velo._copier) ; tous partagent le
// vélo garé fondu. Rend la liste : le constructeur de Game (js/game.js) l'ajoute à scene.userData.velos et à ses vélos.
export function veloDepuisDonnees(scene, liste, { dx = 0 } = {}) {
  const velos = [];
  // (temps de construction, en ms, pour __parcEntier : le modèle complet, la fusion du vélo garé, les copies)
  velos.ms = { modele: 0, cuisson: 0, copies: 0 };
  let modele = null;
  for (const d of liste || []) {
    if (!d || !Number.isFinite(d.x) || !Number.isFinite(d.z)) continue;
    let couleur = typeof d.couleur === 'string' ? parseInt(d.couleur.replace('#', ''), 16) : d.couleur;
    if (!Number.isFinite(couleur)) couleur = 0x1f5fbf;
    const t0 = performance.now();
    const b = new Velo(scene, { x: d.x + dx, z: d.z, cap: (Number(d.cap) || 0) * deg, couleur, appui: 'bequille', modele });
    b.id = d.id || null; b.nom = d.nom || '';
    b.garerSec(); b.presenter(1);                   // guidon retombé, béquille dépliée : la pose garée
    const t1 = performance.now();
    if (!modele) {
      modele = b; velos.ms.modele = t1 - t0;
      if (!_gare) cuireGare(b);
      if (!_silhouette) cuireSilhouette(b);
      b._poserStatique(); b.presenter(1);
      velos.ms.cuisson = performance.now() - t1;
    } else { b._poserStatique(); b.presenter(1); velos.ms.copies += performance.now() - t0; }
    velos.push(b);
  }
  return velos;
}

// Garde-boue : une bande cintrée autour de la roue, légèrement creusée en U. `a0`, `a1` = angles dans le plan
// de la roue, comptés depuis l'avant (+z) vers le haut (+y).
function gardeBoue(centre, r, a0, a1, larg) {
  const N = 40, K = 5;
  const pos = [], idx = [], uv = [];
  for (let i = 0; i <= N; i++) {
    const a = a0 + (a1 - a0) * (i / N);
    for (let j = 0; j <= K; j++) {
      const u = (j / K) * 2 - 1;
      const rr = r - 0.008 * u * u;           // les bords se replient vers la roue
      pos.push(centre.x + u * larg / 2, centre.y + Math.sin(a) * rr, centre.z + Math.cos(a) * rr);
      uv.push(i / N, j / K);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < K; j++) {
    const a = i * (K + 1) + j, b = a + K + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
    idx.push(a, a + 1, b, a + 1, b + 1, b);    // double face : on voit le dessous depuis la roue
  }
  const g = new THREE.BufferGeometry();
  // Les UV ne servent a rien a l'affichage, mais la fusion par materiau exige les MEMES attributs pour toutes
  // les pieces : sans elles, la fusion avec les autres pieces noires echouait.
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
