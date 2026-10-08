// =====================================================================
//  LA TROTTINETTE (lot C4) — modèle articulé, poussée du pied, cavalier debout
// =====================================================================
// Une trottinette d'adulte, de ville : roues de 200 mm en polyuréthane sur moyeux d'aluminium, plateau bas de
// 47 x 13 cm recouvert de grip, frein arrière à garde-boue (on appuie dessus avec le talon), potence télescopique
// inclinée de 14° qui porte un guidon en T à poignées de mousse, béquille latérale à gauche. Tout est construit ici,
// en primitives fondues par matière, calculées une seule fois pour toutes les trottinettes (poserPiece,
// js/monture_cavalier.js : la deuxième se construit en moins d'une milliseconde) : pas de fichier à télécharger, 13 appels de dessin
// quand on la conduit, 4 quand elle attend garée sur sa béquille (_figer), plus rien au-delà de 120 m.
//
// MESURES (parc entier, 01/10) : la rampe est descendue de bout en bout en 18,8 s, 7 m/s au plus (le cavalier tient sa
// vitesse), sans un arrêt ; montée depuis T1 en 50 s (2,5 m/s dans les 10,6 %) ; garée près du plateau, elle coûte
// 12 appels et 7 300 triangles toutes passes comprises.
//
// LES ARTICULATIONS : la potence, la fourche et la roue avant tournent ENSEMBLE autour de l'axe de direction incliné
// (le groupe `rotor`, comme sur le vélo) ; la partie haute de la potence COULISSE pour mettre le guidon à hauteur de
// hanche du cavalier (`tige`) ; les deux roues tournent sur leur axe ; la béquille se replie sous le plateau. Toute la
// trottinette penche dans les virages (`roulis`) et bascule d'une roue à l'autre sur le relief (`tangage`).
//
// LA CONDUITE (conception § 2.5, ligne « Trottinette ») : marche de 3 cm au plus à la montée, 10 cm à la descente, pas
// d'escalier ; la pente de 10 % au plus sur le gravier grossier (agent « trottinette » de js/monde.js), celle des
// allées ailleurs (la rampe est se descend). Pas de pédalier : on POUSSE DU PIED droit, le gauche reste sur le
// plateau (js/monture_cavalier.js). La gravité, les collisions, le réseau : js/monture.js.
//
// REPÈRE : comme le vélo et le joueur, +z devant, +y en haut, +x à GAUCHE ; origine au sol, au milieu des deux roues.
//
// OÙ L'ON EN TROUVE : posées dans le parc entier aux points T1 et T2 de monde.json (trottinettesDepuisDonnees), et
// en vente chez le marchand (la trottinette pliante du joueur, qu'il sort de son sac : js/shop.js, js/game.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Monde, SURFACE } from './monde.js';
import { MontureDebout, GENRES, poserPiece, tube, boule, bandage, V3, poserPied, couleurDe, lisse } from './monture_cavalier.js';

const deg = Math.PI / 180;
export const ROUE_R = 0.100;                  // roues de 200 mm
const ROUE_L = 0.030;
const EMPATTEMENT = 0.71;
const Z_AR = -EMPATTEMENT / 2, Z_AV = EMPATTEMENT / 2, Y_AXE = ROUE_R;
const PL = { zAr: -0.255, zAv: 0.215, larg: 0.13, haut: 0.105, ep: 0.030 };      // le plateau (dessus à 10,5 cm)
// l'axe de direction : par l'axe de la roue avant, incliné de 14° vers l'arrière
const INCL = 14 * deg;
const AXE_DIR = new THREE.Vector3(0, Math.cos(INCL), -Math.sin(INCL));
const AXE_AV = new THREE.Vector3(0, Math.sin(INCL), Math.cos(INCL));
const S_TUBE = [0.12, 0.27];                  // la douille de direction, le long de l'axe depuis l'axe de roue
const S_BARRE_BASE = 0.90;                    // le guidon, potence rentrée (dessus de barre à ~97 cm du sol)
const BARRE = { demi: 0.27, poignee: [0.16, 0.27] };

// Les constantes de conduite (js/monture.js, js/monture_cavalier.js). Vitesses en m/s, forces en m/s² (moyenne sur un
// cycle de poussée), roulement en m/s² sur l'enrobé, multiplié selon le sol.
export const PARAMS_TROTTINETTE = {
  nom: 'trottinette', article: 'la trottinette',
  agent: 'trottinette', agentDur: 'trottinette_dur', empattement: EMPATTEMENT, roueR: ROUE_R, hSelle: 0,
  vmax: 4.4, vmaxDanseuse: 5.9, force: 2.0, forceDanseuse: 2.6, frein: 3.2, vmaxRelief: 7.0,
  roulement: 0.12, air: 0.0075,
  contacts: [-0.36, 0, 0.36], rayonContact: 0.13,
  // le roulement selon le sol (× celui de l'enrobé) : de petites roues pleines sentent chaque gravillon
  sols: { [SURFACE.DALLES]: 1.6, [SURFACE.TROTTOIR]: 1.15, [SURFACE.STABILISE]: 2.6, [SURFACE.TERRE_BATTUE]: 3,
    [SURFACE.GRAVIER]: 6, [SURFACE.HERBE]: 9, [SURFACE.SOUS_BOIS]: 9, [SURFACE.COPEAUX]: 14, [SURFACE.SABLE]: 16 },
  // le gravier grossier : la pente y est bornée à 10 % (agent « trottinette » de js/monde.js)
  grossier: new Set([SURFACE.GRAVIER]),
  interdits: new Set([SURFACE.COPEAUX, SURFACE.SABLE]),
};

// ---------------------------------------------------------------- matériaux (partagés, sauf la peinture)
let M = null;
function materiaux(couleur) {
  if (!M) {
    M = {
      alu: new THREE.MeshStandardMaterial({ color: 0xc4c8ce, roughness: 0.28, metalness: 0.9 }),
      grip: new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.9, metalness: 0.05 }),
      pneu: new THREE.MeshStandardMaterial({ color: 0x2c2d31, roughness: 0.62, metalness: 0 }),
    };
    // (les plastiques noirs — garde-boue, collier, embouts — prennent la matière du grip : de près on ne les distingue
    // pas, et c'est un appel de dessin de moins par pièce articulée)
    M.noir = M.grip;
  }
  // la peinture est À CHAQUE trottinette : on la change d'un appel (couleur de celle qu'un autre joueur a prise)
  return { ...M, peinture: new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.32, metalness: 0.5 }) };
}

// Une roue : bandage, moyeu à six bâtons, roulements. Dans le repère de la roue (axe x).
// (relecture C4 : chaque pièce est calculée une fois pour toutes les trottinettes, voir poserPiece)
function construireRoue(m) {
  return poserPiece('trottinette.roue', m, new THREE.Group(), (L) => {
    L.add(m.pneu, bandage(ROUE_R, ROUE_L, 32));
    const jante = new THREE.TorusGeometry(0.062, 0.007, 6, 28); jante.rotateY(Math.PI / 2); L.add(m.alu, jante);
    const moyeu = new THREE.CylinderGeometry(0.019, 0.019, 0.034, 14); moyeu.rotateZ(Math.PI / 2); L.add(m.alu, moyeu);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      L.add(m.alu, tube(V3(0, Math.cos(a) * 0.017, Math.sin(a) * 0.017), V3(0, Math.cos(a + 0.25) * 0.058, Math.sin(a + 0.25) * 0.058), 0.0055, 0.0045, 6));
    }
    for (const s of [-1, 1]) { const b = new THREE.CylinderGeometry(0.008, 0.008, 0.004, 10); b.rotateZ(Math.PI / 2); b.translate(s * 0.019, 0, 0); L.add(m.noir, b); }
  });
}

export class Trottinette extends MontureDebout {
  static PARAMS = PARAMS_TROTTINETTE;
  static _reserve = [];
  constructor(scene, { x = 0, z = 0, cap = 0, couleur = 0x2e9c5a, penche = 0.12, conduisible = true, appui = 'bequille' } = {}) {
    super({ x, z, cap, penche, conduisible, appui }, PARAMS_TROTTINETTE);
    this.genre = 'trottinette';
    this.scene = scene;
    this.m = materiaux(couleur);
    this._peinture = this.m.peinture;           // la sienne (voir peindre)
    this.couleur = couleur;
    this.sBarre = S_BARRE_BASE;
    this._htAff = { y: 0, pente: 0, tangage: 0 };
    this._niveau = 0;
    // ---- modèle ----
    this.racine = new THREE.Group(); this.racine.name = 'trottinette';
    this.racine.userData.nofuse = true;
    this.racine.userData.dynamique = true;       // elle bouge : pas d'ombre cuite à sa place de départ
    this.tangage = new THREE.Group(); this.racine.add(this.tangage);
    this.roulis = new THREE.Group(); this.tangage.add(this.roulis);
    this._construirePlateau(this.m);
    this._construireDirection(this.m);
    this.roueAr = construireRoue(this.m); this.roueAr.position.set(0, Y_AXE, Z_AR); this.roulis.add(this.roueAr);
    this._construireBequille(this.m);
    scene.add(this.racine);
    this.presenter(1);
  }

  // ======================================================================== PLATEAU, ROUE ARRIÈRE, FREIN
  _construirePlateau(m) {
    poserPiece('trottinette.plateau', m, this.roulis, (L) => {
      // le plateau : un rectangle aux coins arrondis, extrudé (aluminium peint), le grip par-dessus
      const forme = (l, z0, z1, r) => {
        const s = new THREE.Shape(), x = l / 2;
        s.moveTo(-x + r, z0); s.lineTo(x - r, z0); s.quadraticCurveTo(x, z0, x, z0 + r); s.lineTo(x, z1 - r);
        s.quadraticCurveTo(x, z1, x - r, z1); s.lineTo(-x + r, z1); s.quadraticCurveTo(-x, z1, -x, z1 - r);
        s.lineTo(-x, z0 + r); s.quadraticCurveTo(-x, z0, -x + r, z0);
        return s;
      };
      const plateau = new THREE.ExtrudeGeometry(forme(PL.larg, PL.zAr, PL.zAv, 0.03), { depth: PL.ep - 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.004, bevelSegments: 2, curveSegments: 6 });
      plateau.rotateX(Math.PI / 2);          // la forme (x, y) se couche dans (x, z) ; l'épaisseur descend en -y
      plateau.translate(0, PL.haut - 0.003, 0);
      L.add(m.peinture, plateau);
      // (le grip, face vers le haut : la forme est tracée en -z, puis couchée par -90° — couchée par +90°, elle regardait
      // le sol et l'on ne voyait que la peinture)
      const grip = new THREE.ShapeGeometry(forme(PL.larg - 0.018, -(PL.zAv - 0.012), -(PL.zAr + 0.012), 0.024), 4);
      grip.rotateX(-Math.PI / 2); grip.translate(0, PL.haut + 0.0015, 0); L.add(m.grip, grip);
      // le capot de la charnière de pliage, devant, et le cou qui monte vers la douille de direction
      const pied = (s) => V3(0, Y_AXE, Z_AV).addScaledVector(AXE_DIR, s);
      L.add(m.peinture, tube(V3(0, PL.haut - 0.012, PL.zAv - 0.03), pied(S_TUBE[0] + 0.02), 0.026, 0.022, 14));
      L.add(m.alu, boule(V3(0, PL.haut - 0.008, PL.zAv - 0.02), 0.03, 14));
      const charn = new THREE.CylinderGeometry(0.012, 0.012, 0.075, 12); charn.rotateZ(Math.PI / 2); charn.translate(0, PL.haut + 0.02, PL.zAv - 0.0); L.add(m.noir, charn);
      // la douille de direction (fixe ; ce qui tourne dedans est dans le rotor)
      L.add(m.peinture, tube(pied(S_TUBE[0]), pied(S_TUBE[1]), 0.024, 0.024, 16));
      for (const s of S_TUBE) L.add(m.noir, tube(pied(s - 0.008), pied(s + 0.008), 0.027, 0.027, 16));
      // les pattes arrière qui tiennent l'axe de la roue, de chaque côté
      for (const sx of [-1, 1]) {
        const p = new THREE.BoxGeometry(0.007, 0.034, 0.13); p.translate(sx * 0.026, Y_AXE + 0.004, Z_AR + 0.06); L.add(m.peinture, p);
        const vis = new THREE.CylinderGeometry(0.009, 0.009, 0.006, 10); vis.rotateZ(Math.PI / 2); vis.translate(sx * 0.031, Y_AXE, Z_AR); L.add(m.alu, vis);
      }
      // LE FREIN : un garde-boue cintré sur la roue arrière, à ressort, qu'on écrase du talon
      const fr = new THREE.CylinderGeometry(ROUE_R + 0.016, ROUE_R + 0.016, 0.05, 20, 1, true, 0, 118 * deg);
      fr.rotateZ(Math.PI / 2); fr.rotateX(-20 * deg); fr.translate(0, Y_AXE, Z_AR); L.add(m.noir, fr);
      const sabot = new THREE.BoxGeometry(0.05, 0.012, 0.05); sabot.translate(0, Y_AXE + ROUE_R + 0.016, Z_AR + 0.035); L.add(m.noir, sabot);
      const ressort = new THREE.BoxGeometry(0.03, 0.03, 0.03); ressort.translate(0, PL.haut + 0.01, PL.zAr + 0.01); L.add(m.alu, ressort);
    });
  }

  // ======================================================================== DIRECTION, POTENCE, GUIDON
  _construireDirection(m) {
    // le groupe posé sur l'axe de direction : son Y local EST l'axe incliné, son origine l'axe de la roue avant
    this.direction = new THREE.Group();
    const base = new THREE.Matrix4().makeBasis(V3(1, 0, 0), AXE_DIR, AXE_AV).setPosition(0, Y_AXE, Z_AV);
    base.decompose(this.direction.position, this.direction.quaternion, this.direction.scale);
    this.roulis.add(this.direction);
    this.rotor = new THREE.Group(); this.direction.add(this.rotor);
    poserPiece('trottinette.rotor', m, this.rotor, (L) => {
      // la fourche (deux fourreaux droits jusqu'à l'axe), sa tête, la partie basse de la potence
      for (const s of [-1, 1]) {
        L.add(m.peinture, tube(V3(s * 0.025, 0, 0), V3(s * 0.025, S_TUBE[0] - 0.01, 0), 0.0085, 0.011, 10));
        const vis = new THREE.CylinderGeometry(0.009, 0.009, 0.006, 10); vis.rotateZ(Math.PI / 2); vis.translate(s * 0.031, 0, 0); L.add(m.alu, vis);
      }
      const tete = new THREE.BoxGeometry(0.07, 0.022, 0.03); tete.translate(0, S_TUBE[0] - 0.012, 0); L.add(m.peinture, tete);
      L.add(m.peinture, tube(V3(0, S_TUBE[1], 0), V3(0, 0.62, 0), 0.0175, 0.0175, 14));
      // le collier de serrage de la potence télescopique
      L.add(m.noir, tube(V3(0, 0.60, 0), V3(0, 0.645, 0), 0.021, 0.021, 14));
      const levier = new THREE.BoxGeometry(0.012, 0.05, 0.016); levier.translate(0.024, 0.62, 0.012); L.add(m.noir, levier);
      // garde-boue avant, court
      const gb = new THREE.CylinderGeometry(ROUE_R + 0.014, ROUE_R + 0.014, 0.04, 14, 1, true, 0, 70 * deg);
      gb.rotateZ(Math.PI / 2); gb.rotateX(20 * deg); L.add(m.noir, gb);
    });
    // la roue avant, à l'origine du rotor
    this.roueAv = construireRoue(m); this.rotor.add(this.roueAv);
    // ---- la partie haute de la potence et le guidon : un groupe qui COULISSE le long de l'axe ----
    this.tige = new THREE.Group(); this.rotor.add(this.tige);
    const H = S_BARRE_BASE;
    // les points où se posent les mains (au milieu de chaque poignée) : à chaque trottinette les siens
    this.ancresPoignee = {};
    for (const s of [-1, 1]) {
      const o = new THREE.Object3D(); o.position.set(s * (BARRE.poignee[0] + BARRE.poignee[1]) / 2, H, 0); this.tige.add(o);
      this.ancresPoignee[s > 0 ? 'G' : 'D'] = o;
    }
    poserPiece('trottinette.tige', m, this.tige, (T) => {
      T.add(m.alu, tube(V3(0, 0.42, 0), V3(0, H - 0.02, 0), 0.0145, 0.0145, 12));
      // le T : une barre horizontale (l'axe x du rotor reste horizontal), son raccord, les poignées de mousse
      T.add(m.alu, boule(V3(0, H, 0), 0.022, 12));
      T.add(m.alu, tube(V3(-BARRE.demi, H, 0), V3(BARRE.demi, H, 0), 0.0112, 0.0112, 12));
      for (const s of [-1, 1]) {
        const a = V3(s * BARRE.poignee[0], H, 0), b = V3(s * BARRE.poignee[1], H, 0);
        T.add(m.grip, tube(a, b, 0.0185, 0.0185, 14));
        T.add(m.noir, boule(b, 0.019, 10));
      }
      // la sonnette, à gauche
      const son = new THREE.SphereGeometry(0.018, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); son.translate(0.1, H + 0.012, 0.0); T.add(m.alu, son);
    });
  }

  // ======================================================================== BÉQUILLE (à gauche)
  _construireBequille(m) {
    this.bequilleG = new THREE.Group();
    this.bequilleG.position.set(0.062, PL.haut - 0.022, -0.04);
    this.roulis.add(this.bequilleG);
    poserPiece('trottinette.bequille', m, this.bequilleG, (L) => {
      L.add(m.alu, tube(V3(0, 0, 0), V3(0, 0, -0.135), 0.0055, 0.0045, 8));
      L.add(m.noir, boule(V3(0, 0, -0.135), 0.008, 8));
    });
  }

  // Le guidon à hauteur de hanche (moins 3 cm) du cavalier : la potence coulisse.
  reglerBarre(hHanche) {
    const h = Math.max(0.86, Math.min(1.12, hHanche - 0.03));
    this.sBarre = (h - Y_AXE) / Math.cos(INCL);
  }

  // Ce qui tourne en roulant (appelé par Monture.conduire à la fin de chaque pas) : les roues.
  _animer(dt) { this.roue += (this.v / ROUE_R) * dt; }

  // ======================================================================== AFFICHAGE
  presenter(a, oeil = null) {
    const p = this.prec, Lp = (x, y) => x + (y - x) * a;
    let dc = this.cap - p.cap; dc = Math.atan2(Math.sin(dc), Math.cos(dc));
    const x = Lp(p.x, this.pos.x), z = Lp(p.z, this.pos.z), cap = p.cap + dc * a;
    // DE LOIN (garée, posée dans le parc) : au-delà de 120 m, rien (moins de dix pixels)
    if (oeil && !this.pris) {
      const d = Math.hypot(oeil.x - x, oeil.z - z), cache = this._niveau === 2 ? d > 118 : d > 122;
      this._niveau = cache ? 2 : 0;
      this.tangage.visible = !cache;
      if (cache) return;
    } else if (this._niveau) { this._niveau = 0; this.tangage.visible = true; }
    if (Monde.plat) { this.racine.position.set(x, 0, z); this.tangage.rotation.x = 0; }
    else {
      // posée sur le relief : chaque roue sur le sol sous elle (js/monture.js), nez levé en montée
      const h = this._hauteurEtTangage(x, z, cap, this._htAff);
      this.racine.position.set(x, h.y, z);
      this.tangage.rotation.x = -h.tangage;
    }
    this.racine.rotation.y = cap;
    this.roulis.rotation.z = -Lp(p.penche, this.penche);
    this.rotor.rotation.y = Lp(p.braq, this.braq);
    const roue = Lp(p.roue, this.roue);
    this.roueAr.rotation.x = roue; this.roueAv.rotation.x = roue;
    this.tige.position.y = this.sBarre - S_BARRE_BASE;
    // béquille : repliée sous le plateau (vers l'arrière), dépliée vers le sol et un peu en dehors
    const b = this.bequille;
    this.bequilleG.rotation.set(-1.02 * b, 0, 0.42 * b);
    // GARÉE SUR SA BÉQUILLE (posée dans le parc, ou laissée là) : la version fondue, un appel par matière
    const fige = !this.pris && this.appui === 'bequille' && b > 0.999 && Math.abs(this.penche - 0.13) < 2e-3 && Math.abs(this.braq - 0.18) < 3e-3
      && Math.abs(p.penche - this.penche) < 1e-4 && Math.abs(p.braq - this.braq) < 1e-4;
    this._figer(fige);
    this.racine.updateMatrixWorld(true);
  }

  // LA TROTTINETTE GARÉE, FONDUE PAR MATIÈRE : les 13 pièces articulées (plateau, direction, guidon, deux roues,
  // béquille) ramenées dans le repère du tangage et réunies par matière — 4 appels de dessin au lieu de 13, pour les
  // trottinettes du parc qui attendent qu'on les prenne. Refaite si la pose garée n'est plus la même (potence réglée à
  // un autre cavalier, roues tournées) ; dès qu'elle bouge, le modèle articulé reprend la main.
  _figer(fige) {
    if (fige) {
      const cle = `${this.sBarre.toFixed(3)}|${(this.roue % (Math.PI * 2)).toFixed(2)}`;
      if (!this._fondue || this._fondue.cle !== cle) this._cuire(cle);
    }
    if (this._fondue) this._fondue.groupe.visible = fige;
    this.roulis.visible = !fige;
  }
  _cuire(cle) {
    if (this._fondue) { this._fondue.groupe.removeFromParent(); this._fondue.groupe.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }
    this.roulis.visible = true;
    this.tangage.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(this.tangage.matrixWorld).invert(), rel = new THREE.Matrix4();
    const lots = new Map();
    this.roulis.traverse((o) => {
      if (!o.isMesh) return;
      const s = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, g = new THREE.BufferGeometry(), n = s.attributes.position.count;
      g.setAttribute('position', s.attributes.position.clone()); g.setAttribute('normal', s.attributes.normal.clone());
      g.setAttribute('uv', s.attributes.uv ? s.attributes.uv.clone() : new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
      g.applyMatrix4(rel.multiplyMatrices(inv, o.matrixWorld));
      if (!lots.has(o.material)) lots.set(o.material, []);
      lots.get(o.material).push(g);
    });
    const groupe = new THREE.Group(); groupe.name = 'trottinette garée';
    for (const [mat, geos] of lots) {
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
      for (const x of geos) x.dispose();
      mesh.castShadow = true; mesh.receiveShadow = true;
      groupe.add(mesh);
    }
    this.tangage.add(groupe);
    this._fondue = { cle, groupe };
  }

  // ======================================================================== LE CAVALIER (js/monture_cavalier.js)
  // La pose de base (Player._pose) : debout, un peu penché vers le guidon, la tête droite. Les jambes et les bras sont
  // repris par la cinématique inverse ; on ne leur donne qu'un départ plausible.
  poseCavalier(P, k, REST) {
    const mx = (r, v) => r + (v - r) * k, pi = this.pied;
    P.torsoX = mx(REST.torsoX, 0.2 + 0.12 * pi + 0.05 * this.frein);
    P.headX = mx(REST.headX, -0.16 - 0.08 * pi);
    P.tL = mx(REST.tL, -0.15); P.tR = mx(REST.tR, -0.1); P.kL = mx(REST.kL, 0.3); P.kR = mx(REST.kR, 0.25);
    P.aL = mx(REST.aL, -0.7); P.aR = mx(REST.aR, -0.7); P.eL = mx(REST.eL, -0.5); P.eR = mx(REST.eR, -0.5);
    P.aLz = mx(REST.aLz, 0.2); P.aRz = mx(REST.aRz, -0.2);
    P.bob = 0;
  }

  // Où vont les hanches, les pieds et les mains (coordonnées MONDE), d'après la pose affichée de la trottinette.
  //  - le pied GAUCHE sur le plateau, devant, orteils un peu en dehors ;
  //  - le pied DROIT sur le plateau derrière lui en glissant ; par terre à droite quand on est arrêté ; sur le
  //    garde-boue quand on freine ; et quand on pousse, il suit le cycle : posé devant, il recule à la vitesse de la
  //    trottinette (planté au sol) pendant le contact, puis se relève et revient se poser devant ;
  //  - les hanches au-dessus du plateau, à 95,5 % de la jambe au-dessus des chevilles, BAISSÉES autant qu'il faut pour
  //    que le pied qui pousse touche le sol (la jambe d'appui plie : c'est le geste) ;
  //  - les mains sur les poignées.
  poseDebout(J, D) {
    const V = J.velo, L = V.jambe > 0.3 ? V.jambe : 0.88 * (J.mesh.scale.y || 1);
    const R = this.racine, O = R.position, cap = R.rotation.y;
    const fx = Math.sin(cap), fz = Math.cos(cap), gx = Math.cos(cap), gz = -Math.sin(cap);     // devant, gauche (sol)
    this.roulis.getWorldQuaternion(_qR);
    _haut.set(0, 1, 0).applyQuaternion(_qR);
    // le corps : le cap, le roulis de la trottinette (on penche avec elle), tourné un peu vers le pied qui pousse
    _qY.setFromAxisAngle(_Yv, cap); _qZ.setFromAxisAngle(_Zv, this.roulis.rotation.z);
    D.qCorps.copy(_qY).multiply(_qZ).multiply(_qT.setFromAxisAngle(_Yv, -0.08 - 0.1 * this.pied));
    _fC.set(0, 0, 1).applyQuaternion(D.qCorps); _gC.set(1, 0, 0).applyQuaternion(D.qCorps);
    const surPlateau = (lx, ly, lz, out) => this.roulis.localToWorld(out.set(lx, ly, lz));
    const parTerre = (lx, lz, lift, out) => {
      out.set(O.x + gx * lx + fx * lz, 0, O.z + gz * lx + fz * lz);
      out.y = Monde.sol(out.x, out.z) + lift;
      return out;
    };
    const dirPlateau = (ang, out) => out.set(Math.sin(ang), 0, Math.cos(ang)).applyQuaternion(_qR);
    const dirSol = (ang, out) => out.set(Math.sin(cap + ang), 0, Math.cos(cap + ang));
    // ---- hanches : leur emplacement au sol (avant de choisir la hauteur) ----
    parTerre(-0.03, -0.07, 0, _hc);
    const hancheD = (out) => out.copy(_hc).addScaledVector(_gC, -0.09);
    const hancheG = (out) => out.copy(_hc).addScaledVector(_gC, 0.09);
    // ---- pied gauche : sur le plateau ----
    const pg = D.pieds.Left;
    surPlateau(0.012, PL.haut, 0.05, _s1);
    poserPied(pg, _s1, dirPlateau(10 * deg, _d1), _haut, _g1.set(0, 0, 0));
    // ---- pied droit : plateau, sol (arrêt), garde-boue (frein), poussée ----
    const pd = D.pieds.Right;
    surPlateau(-0.012, PL.haut, -0.17, _s1);
    poserPied(pd, _s1, dirPlateau(-28 * deg, _d1), _haut, _g1);
    const ar = Math.max(0, this.arret * (1 - this.pied) - this.frein);
    if (ar > 0.01) { poserPied(_pA, parTerre(-0.25, -0.02, 0, _s2), dirSol(-12 * deg, _d2), _Yv, _g1); melanger(pd, _pA, lisse(Math.min(1, ar))); }
    if (this.frein > 0.01) {
      surPlateau(0, Y_AXE + ROUE_R + 0.026, Z_AR + 0.06, _s2);
      poserPied(_pA, _s2, dirPlateau(-6 * deg, _d2), _haut, _g1);
      melanger(pd, _pA, lisse(Math.min(1, this.frein)));
    }
    if (this.pied > 0.01) { this._piedPousse(_pA, cap, O, fx, fz, gx, gz); melanger(pd, _pA, lisse(Math.min(1, this.pied))); }
    // ---- hauteur des hanches : la plus haute qui laisse chaque pied à portée ----
    let h = pg.cheville.y + 0.955 * L;
    const portee = 0.975 * L;
    for (const [p, hj] of [[pg, hancheG], [pd, hancheD]]) {
      hj(_s3);
      const dxz = Math.hypot(_s3.x - p.cheville.x, _s3.z - p.cheville.z);
      if (dxz < portee) h = Math.min(h, p.cheville.y + Math.sqrt(portee * portee - dxz * dxz));
    }
    // (la trottinette en descente : le corps reste à la verticale du plateau, les hanches ne plongent pas)
    D.hanche.copy(_hc); D.hanche.y = h;
    // genoux : devant les hanches, un peu en dehors
    for (const [p, sg] of [[pg, 1], [pd, -1]]) p.genou.copy(D.hanche).addScaledVector(_fC, 0.65).addScaledVector(_gC, sg * 0.12).addScaledVector(_Yv, -0.15);
    D.bassin = 0.1 + 0.12 * this.pied; D.bassinLacet = 0; D.teteLacet = 0;
    // le guidon à la hauteur des hanches de CE cavalier (la potence coulisse ; elle suit sur les autres écrans aussi)
    this.reglerBarre(h - O.y);
    // ---- mains sur les poignées ----
    this.rotor.getWorldQuaternion(_qG);
    _gAv.set(0, 0, 1).applyQuaternion(_qG); _gHa.set(0, 1, 0).applyQuaternion(_qG); _gGa.set(1, 0, 0).applyQuaternion(_qG);
    for (const [cote, sg] of [['Left', 1], ['Right', -1]]) {
      const m = D.mains[cote], anc = this.ancresPoignee[sg > 0 ? 'G' : 'D'];
      anc.getWorldPosition(m.poignet);
      m.poignet.addScaledVector(_gHa, 0.03).addScaledVector(_gAv, -0.045);
      m.doigts.copy(_gAv).multiplyScalar(0.9).addScaledVector(_gGa, sg * 0.22).addScaledVector(_gHa, -0.18).normalize();
      m.paume.copy(_gHa).multiplyScalar(-1).addScaledVector(_gGa, -sg * 0.25).normalize();
      m.coude.copy(m.poignet).addScaledVector(_gGa, sg * 0.4).addScaledVector(_Yv, -0.3).addScaledVector(_fC, -0.3);
      m.ok = true;
    }
    return D;
  }

  // Le pied droit dans son cycle de poussée (voir js/monture_cavalier.js) : planté devant au début du contact, il recule
  // de la longueur de la foulée (la trottinette avance au-dessus de lui), puis se relève et revient.
  _piedPousse(p, cap, O, fx, fz, gx, gz) {
    const c = this.partContact, ph = this.phase, v = Math.abs(this.v);
    const foulee = Math.max(0.3, Math.min(0.68, v * this.tc));
    const zc = -0.1, zPose = zc + foulee / 2, zFin = zc - foulee / 2;
    let lz, lift, lx = -0.2, inc = 0;
    if (ph < c) { const s = ph / c; lz = zPose - foulee * s; lift = 0; inc = 0.35 * s * s; }      // orteils qui poussent en fin de contact
    else {
      const s = (ph - c) / (1 - c);
      lz = zFin + (zPose - zFin) * lisse(s);
      lift = 0.12 * Math.sin(Math.PI * Math.min(1, s * 1.15)) + 0.02 * (1 - s);
      lx -= 0.035 * Math.sin(Math.PI * s);
      inc = 0.35 * (1 - s) * (1 - s);
    }
    const sol = _s2.set(O.x + gx * lx + fx * lz, 0, O.z + gz * lx + fz * lz);
    sol.y = Monde.sol(sol.x, sol.z) + lift;
    const d = _d2.set(Math.sin(cap - 8 * deg), -Math.sin(inc), Math.cos(cap - 8 * deg)).normalize();
    p.cheville.copy(sol).addScaledVector(_Yv, 0.08).addScaledVector(d, -0.035);
    p.orteil.copy(p.cheville).addScaledVector(d, 0.15).addScaledVector(_Yv, -0.06);
    p.genou.set(0, 0, 0);
    return p;
  }

  aide(manette, tactile, touche) {
    if (tactile) return 'trottinette · joystick : haut = pousser du pied, bas = freiner, côtés = tourner, au bord = poussées rapides · SONNETTE · DESCENDRE';
    return `trottinette · ${touche('forward')} = pousser du pied · ${touche('back')} = freiner · ${touche('left')} ${touche('right')} = tourner · ${touche('sprint')} = poussées rapides · ${touche('shoot')} = sonnette · ${touche('interact')} = descendre`;
  }
  aideManette(touche) {
    return `trottinette · stick gauche : haut = pousser du pied, bas = freiner, côtés = tourner · ${touche('sprint')} = poussées rapides · ${touche('shoot')} = sonnette · ${touche('interact')} = descendre`;
  }

  // Repeindre (la trottinette de la réserve prend la couleur de celle du cavalier distant). Si sa peinture est celle
  // d'une trottinette du parc (Game.velosPrisAilleurs la lui prête), on lui rend d'abord la sienne : sinon on
  // repeindrait la trottinette du parc pour tout le monde.
  peindre(couleur) {
    const propre = this._peinture || (this._peinture = this.m.peinture);
    if (this.m.peinture !== propre) {
      const pretee = this.m.peinture;
      this.racine.traverse((o) => { if (o.isMesh && o.material === pretee) o.material = propre; });
      this.m = { ...this.m, peinture: propre };
    }
    this.couleur = couleur; propre.color.set(couleur);
  }
  retirer() { this.scene.remove(this.racine); }
}
GENRES.trottinette = Trottinette;

// mélange une pose de pied vers une autre (cheville et orteil)
function melanger(p, q, k) { p.cheville.lerp(q.cheville, k); p.orteil.lerp(q.orteil, k); }
const _pA = { cheville: new THREE.Vector3(), orteil: new THREE.Vector3(), genou: new THREE.Vector3() };
const _qR = new THREE.Quaternion(), _qG = new THREE.Quaternion(), _qY = new THREE.Quaternion(), _qZ = new THREE.Quaternion(), _qT = new THREE.Quaternion();
const _Yv = new THREE.Vector3(0, 1, 0), _Zv = new THREE.Vector3(0, 0, 1);
const _haut = new THREE.Vector3(), _fC = new THREE.Vector3(), _gC = new THREE.Vector3();
const _gAv = new THREE.Vector3(), _gHa = new THREE.Vector3(), _gGa = new THREE.Vector3();
const _s1 = new THREE.Vector3(), _s2 = new THREE.Vector3(), _s3 = new THREE.Vector3(), _hc = new THREE.Vector3();
const _d1 = new THREE.Vector3(), _d2 = new THREE.Vector3(), _g1 = new THREE.Vector3();

// LES TROTTINETTES DU PARC ENTIER (monde.json > trottinettes : `{ id, x, z, cap, nom }`, repère du terrain 1, cap en
// degrés) : posées sur leur béquille, conduisibles, décalées de `dx` sur le terrain 2. Rend la liste : le constructeur
// de Game (js/game.js) l'ajoute à ses engins (le réseau les suit par leur identifiant, comme les vélos du lot A7).
export function trottinettesDepuisDonnees(scene, liste, { dx = 0 } = {}) {
  const out = [];
  for (const d of liste || []) {
    if (!d || !Number.isFinite(d.x) || !Number.isFinite(d.z)) continue;
    const t = new Trottinette(scene, { x: d.x + dx, z: d.z, cap: (Number(d.cap) || 0) * deg, couleur: couleurDe(d.couleur, 0x2e9c5a), appui: 'bequille' });
    t.id = d.id || null; t.nom = d.nom || '';
    t.garerSec(); t.presenter(1);
    out.push(t);
  }
  return out;
}
