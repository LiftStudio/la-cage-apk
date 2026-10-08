// =====================================================================
//  LE SKATE (lot C4) — planche, trucks, roues, poussée, carving et ollie
// =====================================================================
// Une planche « popsicle » de 80 x 20,5 cm, en érable sept plis : nose et tail relevés à 18°, creux en travers (le
// concave), grip noir dessus, dessin peint dessous. Deux trucks d'aluminium à 38 cm d'entraxe, gommes de couleur, quatre
// roues de 54 mm. Tout est construit ici (Lots, js/monture_cavalier.js ; chaque pièce calculée une seule fois pour tous
// les skates, poserPiece), sans fichier : sept appels de dessin.
//
// CE QUI BOUGE : la planche penche dans les virages — moins que le skateur, les gommes encaissent : c'est le CARVING —
// et les trucks braquent en sens opposés quand elle penche (c'est ce qui fait tourner une planche) ; les roues
// tournent ; à l'OLLIE (touche de tir), le tail claque, la planche monte avec le skateur et retombe à plat.
//
// LA CONDUITE (conception § 2.5) : AUCUNE marche (12 mm tolérés, voir AGENTS.skate_dur), pas d'escalier, pas de
// gravier, d'herbe ni de sable (refusés comme « pas un chemin ») ; les petites roues dures freinent beaucoup sur le
// stabilisé et la terre. On pousse du pied ARRIÈRE, de côté, le pied avant tourné vers le nose ; puis on glisse les
// deux pieds en travers de la planche (js/monture_cavalier.js). Le skateur est REGULAR : pied gauche devant, il
// regarde du côté droit de la planche, la tête tournée vers où il va.
//
// Le skate est celui du joueur : acheté chez le marchand (js/shop.js), il le pose par terre et monte dessus, et le
// reprend sous le bras en descendant (js/game.js). Pas de skate posé dans le parc.
import * as THREE from 'three';
import { Monde, SURFACE } from './monde.js';
import { MontureDebout, GENRES, Lots, poserPiece, bandage, poserPied, lisse } from './monture_cavalier.js';

const deg = Math.PI / 180;
export const ROUE_R = 0.027;                 // roues de 54 mm
const ROUE_L = 0.032;
const ENTRAXE = 0.38;                        // entre les deux trucks
const PLANCHE = { long: 0.80, larg: 0.205, ep: 0.012, bas: 0.090, kick: 18 * deg, zKick: 0.245, concave: 0.006 };
const Y_AXE = ROUE_R;
const X_ROUE = 0.085;
// LES PIEDS du skateur sur la planche (repère de la planche) : le pied avant sur les vis du truck avant, l'arrière sur
// le tail.
const PIED_AV = { z: 0.15 }, PIED_AR = { z: -0.18 };
// L'OLLIE : sa durée (s) et sa hauteur (m)
const OLLIE = { T: 0.62, h: 0.26 };

export const PARAMS_SKATE = {
  nom: 'skate', article: 'le skate',
  agent: 'skate', agentDur: 'skate_dur',
  // (l'empattement « de carving » : une planche ne tourne pas comme un vélo de 38 cm d'empattement — les trucks
  // braquent peu ; c'est celui-ci qui donne un rayon de virage de skate, 1,5 m au pas, 5 m lancé)
  empattement: 0.9, roueR: ROUE_R, hSelle: 0,
  vmax: 4.0, vmaxDanseuse: 5.3, force: 1.8, forceDanseuse: 2.3, frein: 2.2, vmaxRelief: 6.5,
  roulement: 0.14, air: 0.0075,
  contacts: [-0.22, 0, 0.22], rayonContact: 0.12,
  sols: { [SURFACE.DALLES]: 2.4, [SURFACE.TROTTOIR]: 1.3, [SURFACE.STABILISE]: 7, [SURFACE.TERRE_BATTUE]: 8 },
  grossier: null,
  interdits: new Set([SURFACE.GRAVIER, SURFACE.HERBE, SURFACE.SOUS_BOIS, SURFACE.COPEAUX, SURFACE.SABLE, SURFACE.MASSIF]),
};

// ---------------------------------------------------------------- matériaux
let M = null;
function materiaux(couleur, dessin) {
  if (!M) {
    M = {
      grip: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.98, metalness: 0 }),
      bois: new THREE.MeshStandardMaterial({ color: 0xd8b98a, roughness: 0.7, metalness: 0 }),
      alu: new THREE.MeshStandardMaterial({ color: 0xbfc3c9, roughness: 0.32, metalness: 0.85 }),
      noir: new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.5, metalness: 0.4 }),
      roue: new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.45, metalness: 0 }),
      gomme: new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.6, metalness: 0 }),
    };
  }
  return { ...M, peinture: new THREE.MeshStandardMaterial({ color: 0xffffff, map: textureDessous(couleur, dessin), roughness: 0.42, metalness: 0.05 }) };
}

// Le dessin du dessous de la planche : un fond de couleur, des bandes en biais et LA CAGE au milieu.
function textureDessous(couleur, dessin = 0) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d'), col = new THREE.Color(couleur);
  g.fillStyle = '#' + col.getHexString(); g.fillRect(0, 0, 256, 64);
  const clair = col.clone().lerp(new THREE.Color(0xffffff), 0.55), fonce = col.clone().multiplyScalar(0.45);
  g.fillStyle = '#' + (dessin % 2 ? fonce : clair).getHexString();
  for (let i = -2; i < 12; i++) { g.beginPath(); g.moveTo(i * 26, 64); g.lineTo(i * 26 + 10, 64); g.lineTo(i * 26 + 30, 0); g.lineTo(i * 26 + 20, 0); g.fill(); }
  g.fillStyle = '#' + col.getHexString(); g.fillRect(64, 14, 128, 36);
  g.fillStyle = '#' + (dessin % 2 ? clair : fonce).getHexString();
  g.font = 'bold 26px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('LA CAGE', 128, 33);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// La hauteur du dessus de la planche en (z, travers v de -1 à 1), au-dessus de son dessous au repos.
function releve(z) {
  const k = Math.abs(z) - PLANCHE.zKick, t = Math.tan(PLANCHE.kick);
  return k <= 0 ? 0 : (k < 0.08 ? (k * k) / 0.16 : k - 0.04) * t;
}
// La demi-largeur à l'abscisse z : droite au milieu, arrondie aux deux bouts.
function demiLargeur(z) {
  const a = Math.abs(z), w = PLANCHE.larg / 2, r = w, z0 = PLANCHE.long / 2 - r;
  return a <= z0 ? w : Math.max(0.004, w * Math.sqrt(Math.max(0, 1 - ((a - z0) / r) ** 2)));
}

// La planche : dessus (grip), dessous (peint, UV le long de la planche), chant (bois). Une grille suit le relevé des
// bouts et le concave.
function construirePlanche(m) {
  const NZ = 56, NV = 8, L = PLANCHE.long / 2 - 0.0005;
  const dessus = [], dessous = [], uv = [], idx = [];
  for (let i = 0; i <= NZ; i++) {
    const z = -L + (2 * L) * (i / NZ), hw = demiLargeur(z), y0 = PLANCHE.bas + releve(z);
    for (let j = 0; j <= NV; j++) {
      const v = -1 + 2 * (j / NV), x = v * hw, c = PLANCHE.concave * v * v;
      dessus.push(x, y0 + PLANCHE.ep + c, z);
      dessous.push(x, y0 + c, z);
      uv.push(i / NZ, j / NV);
    }
  }
  for (let i = 0; i < NZ; i++) for (let j = 0; j < NV; j++) {
    const a = i * (NV + 1) + j, b = a + NV + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const surface = (pos, inverse) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(inverse ? idx.map((_, k) => idx[k - (k % 3) + [0, 2, 1][k % 3]]) : idx);
    g.computeVertexNormals();
    return g;
  };
  // le chant : une bande entre les bords du dessus et du dessous, tout autour
  const bord = [], bIdx = [];
  const tour = [];
  for (let i = 0; i <= NZ; i++) tour.push([i, NV]);
  for (let i = NZ; i >= 0; i--) tour.push([i, 0]);
  for (const [i, j] of tour) {
    const k = (i * (NV + 1) + j) * 3;
    bord.push(dessus[k], dessus[k + 1], dessus[k + 2], dessous[k], dessous[k + 1], dessous[k + 2]);
  }
  for (let s = 0; s < tour.length - 1; s++) { const a = s * 2; bIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const chant = new THREE.BufferGeometry();
  chant.setAttribute('position', new THREE.Float32BufferAttribute(bord, 3));
  chant.setIndex(bIdx); chant.computeVertexNormals();
  return { dessus: surface(dessus, true), dessous: surface(dessous, false), chant };
}

// Un truck (sans les roues) dans son repère : origine au sol sous le pivot. `sens` = +1 avant, -1 arrière (le pivot
// est tourné vers le milieu de la planche).
function construireTruck(m, L) {
  const base = new THREE.BoxGeometry(0.056, 0.007, 0.072); base.translate(0, PLANCHE.bas - 0.0035, 0); L.add(m.alu, base);
  const gomme = new THREE.CylinderGeometry(0.013, 0.013, 0.02, 12); gomme.translate(0, PLANCHE.bas - 0.018, 0); L.add(m.gomme, gomme);
  const king = new THREE.CylinderGeometry(0.004, 0.004, 0.05, 8); king.translate(0, PLANCHE.bas - 0.025, 0); L.add(m.noir, king);
}
function construireHanger(m, L) {
  // le corps du hanger : un trapèze épais, puis l'axe qui le traverse
  const s = new THREE.Shape();
  s.moveTo(-0.07, -0.006); s.lineTo(0.07, -0.006); s.lineTo(0.03, 0.03); s.lineTo(-0.03, 0.03); s.lineTo(-0.07, -0.006);
  const h = new THREE.ExtrudeGeometry(s, { depth: 0.024, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1 });
  h.translate(0, Y_AXE, -0.012); L.add(m.alu, h);
  const axe = new THREE.CylinderGeometry(0.004, 0.004, 0.205, 8); axe.rotateZ(Math.PI / 2); axe.translate(0, Y_AXE, 0); L.add(m.alu, axe);
  for (const sx of [-1, 1]) { const e = new THREE.CylinderGeometry(0.0055, 0.0055, 0.008, 6); e.rotateZ(Math.PI / 2); e.translate(sx * 0.104, Y_AXE, 0); L.add(m.noir, e); }
}
// Les deux roues d'un truck (elles tournent ensemble, autour de l'axe x).
// (relecture C4 : chaque pièce est calculée une fois pour tous les skates, voir poserPiece)
function construireRoues(m) {
  const g = poserPiece('skate.roues', m, new THREE.Group(), (L) => {
    for (const sx of [-1, 1]) {
      const r = bandage(ROUE_R, ROUE_L, 20); r.translate(sx * X_ROUE, 0, 0); L.add(m.roue, r);
      const roul = new THREE.CylinderGeometry(0.011, 0.011, ROUE_L + 0.002, 12); roul.rotateZ(Math.PI / 2); roul.translate(sx * X_ROUE, 0, 0); L.add(m.noir, roul);
    }
  });
  g.position.y = Y_AXE;
  return g;
}

export class Skate extends MontureDebout {
  static PARAMS = PARAMS_SKATE;
  static _reserve = [];
  constructor(scene, { x = 0, z = 0, cap = 0, couleur = 0xc1272d, dessin = 0, conduisible = true, appui = null } = {}) {
    super({ x, z, cap, penche: 0, conduisible, appui: null }, PARAMS_SKATE);
    this.genre = 'skate';
    this.scene = scene;
    this.m = materiaux(couleur, dessin);
    this.couleur = couleur; this.dessin = dessin;
    this.saut = -1;                 // temps écoulé dans l'ollie (s), -1 = au sol
    this.claque = false;            // la planche vient de retomber (le jeu en fait un claquement)
    this._htAff = { y: 0, pente: 0, tangage: 0 };
    // ---- modèle ----
    this.racine = new THREE.Group(); this.racine.name = 'skate';
    this.racine.userData.nofuse = true; this.racine.userData.dynamique = true;
    this.tangage = new THREE.Group(); this.racine.add(this.tangage);
    this.envol = new THREE.Group(); this.tangage.add(this.envol);          // l'ollie : hauteur et bascule
    this.roulis = new THREE.Group(); this.envol.add(this.roulis);          // la planche penche (carving)
    const m = this.m;
    poserPiece('skate.planche', m, this.roulis, (L) => {
      const P = construirePlanche(m);
      L.add(m.grip, P.dessus); L.add(m.peinture, P.dessous); L.add(m.bois, P.chant);
      // les vis des trucks, sur le grip
      for (const zt of [-ENTRAXE / 2, ENTRAXE / 2]) for (const [vx, vz] of [[-0.02, -0.027], [0.02, -0.027], [-0.02, 0.027], [0.02, 0.027]]) {
        const v = new THREE.CylinderGeometry(0.0035, 0.0035, 0.002, 6); v.translate(vx, PLANCHE.bas + PLANCHE.ep + 0.0015 + PLANCHE.concave * (vx / 0.1) ** 2, zt + vz); L.add(m.alu, v);
      }
      // les embases des trucks et leurs gommes, solidaires de la planche
      for (const zt of [-ENTRAXE / 2, ENTRAXE / 2]) {
        const t = new Lots(); construireTruck(m, t);
        for (const [mat, geos] of t.m) for (const geo of geos) { geo.translate(0, 0, zt); L.add(mat, geo); }
      }
    });
    // les hangers (ils braquent) et leurs roues (elles tournent), qui ne penchent pas avec la planche
    this.hangers = []; this.roues = [];
    for (const [zt, sens] of [[ENTRAXE / 2, 1], [-ENTRAXE / 2, -1]]) {
      const h = new THREE.Group(); h.position.z = zt; h.userData.sens = sens; this.envol.add(h);
      poserPiece('skate.hanger', m, h, (HL) => construireHanger(m, HL));
      const r = construireRoues(m); h.add(r);
      this.hangers.push(h); this.roues.push(r);
    }
    scene.add(this.racine);
    this.presenter(1);
  }

  // ======================================================================== CONDUITE
  // l'ollie (touche de tir) : seulement lancé, et pas déjà en l'air ; le pied qui poussait remonte d'un coup sur le tail
  ollie() {
    if (this.saut >= 0 || Math.abs(this.v) <= 0.4) return false;
    this.saut = 0; this.pousse = false; this.pied = 0; this._repartir();
    return true;
  }
  conduire(e, dt, bornes, obstacles = []) {
    // en l'air, on ne pousse pas
    super.conduire(this.saut >= 0 ? { x: e.x, y: Math.min(0, e.y || 0), sprint: e.sprint } : e, dt, bornes, obstacles);
    if (this.saut >= 0) { this.saut += dt; if (this.saut >= OLLIE.T) { this.saut = -1; this.claque = true; } }
  }
  _animer(dt) { this.roue += (this.v / ROUE_R) * dt; }
  // pas de béquille : garé, la planche est à plat, roues droites
  garerSec() { this.garer(); this.bequille = 0; this.penche = 0; this.braq = 0; this.arret = 0; this.saut = -1; this.memoriser(); }
  garer() { super.garer(); this.appui = null; }
  reposer(dt) { const k = 1 - Math.exp(-dt * 5); this.penche += (0 - this.penche) * k; this.braq += (0 - this.braq) * k; }
  // (réseau : l'ollie voyage dans la case du frein, en négatif — voir monture_cavalier.etatReseau)
  etatReseau() { const e = super.etatReseau(); if (this.saut >= 0) e[7] = -Math.max(0.01, Math.round((this.saut / OLLIE.T) * 100) / 100); return e; }
  appliquerReseau(vl, pos, cap, dt) {
    if (vl && vl[7] < 0) { const t = -vl[7] * OLLIE.T; if (this.saut < 0 || Math.abs(this.saut - t) > 0.15) this.saut = t; vl = [...vl]; vl[7] = 0; }
    else if (this.saut >= 0) { this.saut += dt; if (this.saut >= OLLIE.T) this.saut = -1; }
    super.appliquerReseau(vl, pos, cap, dt);
  }
  // La hauteur et la bascule de la planche dans l'ollie : le tail claque (nez levé), elle monte à plat, retombe.
  _envol() {
    if (this.saut < 0) return { y: 0, rx: 0 };
    const s = Math.min(1, this.saut / OLLIE.T);
    const y = OLLIE.h * Math.sin(Math.PI * Math.min(1, s * 1.05)) ** 0.9;
    const rx = -0.42 * Math.sin(Math.PI * Math.min(1, s / 0.32)) * (s < 0.32 ? 1 : 0) + 0.12 * Math.sin(Math.PI * Math.max(0, (s - 0.55) / 0.45));
    return { y: Math.max(0, y), rx };
  }

  // ======================================================================== AFFICHAGE
  presenter(a, oeil = null) {
    const p = this.prec, Lp = (x, y) => x + (y - x) * a;
    let dc = this.cap - p.cap; dc = Math.atan2(Math.sin(dc), Math.cos(dc));
    const x = Lp(p.x, this.pos.x), z = Lp(p.z, this.pos.z), cap = p.cap + dc * a;
    if (Monde.plat) { this.racine.position.set(x, 0, z); this.tangage.rotation.x = 0; }
    else {
      const h = this._hauteurEtTangage(x, z, cap, this._htAff);
      this.racine.position.set(x, h.y, z);
      this.tangage.rotation.x = -h.tangage;
    }
    this.racine.rotation.y = cap;
    const env = this._envol();
    this.envol.position.y = env.y; this.envol.rotation.x = env.rx;
    // le carving : la planche penche à 45 % du skateur ; les trucks braquent en sens opposés (l'avant vers l'intérieur)
    const pen = Lp(p.penche, this.penche), incl = pen * 0.45;
    this.roulis.rotation.z = -incl;
    const roue = Lp(p.roue, this.roue);
    for (let i = 0; i < 2; i++) {
      const h = this.hangers[i];
      h.rotation.y = h.userData.sens * incl * 0.55;
      this.roues[i].rotation.x = roue;
    }
    this.racine.updateMatrixWorld(true);
  }

  // ======================================================================== LE CAVALIER (js/monture_cavalier.js)
  // La pose de base : genoux fléchis, buste un peu penché, bras écartés pour l'équilibre (ils balancent avec la poussée
  // et compensent le carving), le buste tourné vers le nose.
  poseCavalier(P, k, REST) {
    const mx = (r, v) => r + (v - r) * k, pi = this.pied, ph = this.phase * Math.PI * 2;
    const bal = 0.25 * Math.sin(ph) * pi, eq = this.penche;
    P.torsoX = mx(REST.torsoX, 0.16 + 0.12 * pi);
    P.torsoY = mx(REST.torsoY || 0, 0.32 - 0.2 * pi);
    P.headX = mx(REST.headX, -0.12);
    P.tL = mx(REST.tL, -0.3); P.tR = mx(REST.tR, -0.3); P.kL = mx(REST.kL, 0.55); P.kR = mx(REST.kR, 0.55);
    P.aL = mx(REST.aL, 0.1 + bal - 0.25 * eq); P.aR = mx(REST.aR, 0.1 - bal + 0.25 * eq);
    P.aLz = mx(REST.aLz, 0.42 + 0.2 * eq); P.aRz = mx(REST.aRz, -0.42 + 0.2 * eq);
    P.eL = mx(REST.eL, -0.35); P.eR = mx(REST.eR, -0.35);
    P.bob = 0;
  }

  // Où vont les hanches et les pieds (coordonnées MONDE) :
  //  - EN GLISSE, les deux pieds en travers de la planche — l'avant sur les vis du truck avant, l'arrière sur le tail —,
  //    le corps tourné vers le côté droit de la planche (regular), la tête vers le nose ;
  //  - EN POUSSÉE, le pied avant pivote vers le nose, le corps aussi (aux trois quarts), et le pied arrière pousse par
  //    terre à droite de la planche, comme celui de la trottinette ;
  //  - AU FREIN, le pied arrière traîne par terre derrière ;
  //  - À L'OLLIE, les pieds suivent la planche (ils sont posés dessus), les hanches montent moins qu'elle : les genoux
  //    se replient sous le skateur.
  poseDebout(J, D) {
    const V = J.velo, L = V.jambe > 0.3 ? V.jambe : 0.88 * (J.mesh.scale.y || 1);
    const R = this.racine, O = R.position, cap = R.rotation.y, pi = lisse(Math.min(1, this.pied));
    const fx = Math.sin(cap), fz = Math.cos(cap), gx = Math.cos(cap), gz = -Math.sin(cap);
    this.roulis.getWorldQuaternion(_qR);
    _haut.set(0, 1, 0).applyQuaternion(_qR);
    // le corps : le cap, le roulis du SKATEUR (tout l'angle d'équilibre, plus que la planche), un quart de tour à droite
    _qY.setFromAxisAngle(_Yv, cap); _qZ.setFromAxisAngle(_Zv, -this.penche);
    D.qCorps.copy(_qY).multiply(_qZ).multiply(_qT.setFromAxisAngle(_Yv, -Math.PI / 2 + 0.85 * pi));
    _fC.set(0, 0, 1).applyQuaternion(D.qCorps); _gC.set(1, 0, 0).applyQuaternion(D.qCorps);
    const surPlanche = (lx, lz, out) => this.roulis.localToWorld(out.set(lx, PLANCHE.bas + PLANCHE.ep + releve(lz), lz));
    const dirPlanche = (ang, out) => out.set(Math.sin(ang), 0, Math.cos(ang)).applyQuaternion(_qR);
    const parTerre = (lx, lz, lift, out) => {
      out.set(O.x + gx * lx + fx * lz, 0, O.z + gz * lx + fz * lz);
      out.y = Monde.sol(out.x, out.z) + lift;
      return out;
    };
    // pied avant (gauche) : en travers, puis tourné vers le nose pour pousser
    const pg = D.pieds.Left;
    surPlanche(0.0, PIED_AV.z, _s1);
    poserPied(pg, _s1, dirPlanche((-78 + 70 * pi) * deg, _d1), _haut, _g1);
    // pied arrière (droit) : sur le tail ; au frein, il traîne par terre ; en poussée, il pousse
    const pd = D.pieds.Right;
    surPlanche(0.0, PIED_AR.z + 0.05 * pi, _s1);
    poserPied(pd, _s1, dirPlanche(-100 * deg, _d1), _haut, _g1);
    if (this.frein > 0.01 && this.saut < 0) {
      poserPied(_pA, parTerre(-0.16, -0.24, 0, _s2), _d2.set(Math.sin(cap - 0.5), 0, Math.cos(cap - 0.5)), _Yv, _g1);
      melanger(pd, _pA, lisse(Math.min(1, this.frein)));
    }
    if (this.pied > 0.01) { this._piedPousse(_pA, cap, O, fx, fz, gx, gz); melanger(pd, _pA, pi); }
    // les hanches : au-dessus du milieu des pieds, un peu côté talons ; la plus haute qui laisse chaque pied à portée
    surPlanche(0.04, (PIED_AV.z + PIED_AR.z) / 2, _hc);
    _hc.y = 0;
    const portee = 0.97 * L;
    let h = Math.max(pg.cheville.y, pd.cheville.y) + 0.86 * L;          // genoux fléchis : on est souple sur une planche
    for (const [p, sg] of [[pg, 1], [pd, -1]]) {
      _s3.copy(_hc).addScaledVector(_gC, sg * 0.09);
      const dxz = Math.hypot(_s3.x - p.cheville.x, _s3.z - p.cheville.z);
      if (dxz < portee) h = Math.min(h, p.cheville.y + Math.sqrt(portee * portee - dxz * dxz));
    }
    // à l'ollie, les genoux se replient : les hanches montent de 45 % de la planche
    const env = this._envol();
    h -= env.y * 0.55;
    D.hanche.copy(_hc); D.hanche.y = h;
    for (const [p, sg] of [[pg, 1], [pd, -1]]) p.genou.copy(D.hanche).addScaledVector(_fC, 0.65).addScaledVector(_gC, sg * 0.18).addScaledVector(_Yv, -0.12);
    D.bassin = 0.14 + 0.1 * pi; D.bassinLacet = 0;
    D.teteLacet = (Math.PI / 2 - 0.85 * pi) * 0.8;
    D.mains.Left.ok = false; D.mains.Right.ok = false;
    return D;
  }

  _piedPousse(p, cap, O, fx, fz, gx, gz) {
    const c = this.partContact, ph = this.phase, v = Math.abs(this.v);
    const foulee = Math.max(0.3, Math.min(0.62, v * this.tc));
    const zc = -0.06, zPose = zc + foulee / 2, zFin = zc - foulee / 2;
    let lz, lift, lx = -0.19, inc = 0;
    if (ph < c) { const s = ph / c; lz = zPose - foulee * s; lift = 0; inc = 0.35 * s * s; }
    else {
      const s = (ph - c) / (1 - c);
      lz = zFin + (zPose - zFin) * lisse(s);
      lift = 0.11 * Math.sin(Math.PI * Math.min(1, s * 1.15)) + 0.02 * (1 - s);
      lx -= 0.03 * Math.sin(Math.PI * s);
      inc = 0.35 * (1 - s) * (1 - s);
    }
    const sol = _s2.set(O.x + gx * lx + fx * lz, 0, O.z + gz * lx + fz * lz);
    sol.y = Monde.sol(sol.x, sol.z) + lift;
    const d = _d2.set(Math.sin(cap - 6 * deg), -Math.sin(inc), Math.cos(cap - 6 * deg)).normalize();
    p.cheville.copy(sol).addScaledVector(_Yv, 0.08).addScaledVector(d, -0.035);
    p.orteil.copy(p.cheville).addScaledVector(d, 0.15).addScaledVector(_Yv, -0.06);
    return p;
  }

  aide(manette, tactile, touche) {
    if (tactile) return 'skate · joystick : haut = pousser, bas = freiner du pied, côtés = carver, au bord = poussées rapides · OLLIE · DESCENDRE';
    return `skate · ${touche('forward')} = pousser · ${touche('back')} = freiner · ${touche('left')} ${touche('right')} = carver · ${touche('sprint')} = poussées rapides · ${touche('shoot')} = ollie · ${touche('interact')} = descendre`;
  }
  aideManette(touche) {
    return `skate · stick gauche : haut = pousser, bas = freiner, côtés = carver · ${touche('sprint')} = poussées rapides · ${touche('shoot')} = ollie · ${touche('interact')} = descendre`;
  }

  peindre(couleur, dessin = this.dessin) {
    if (couleur === this.couleur && dessin === this.dessin) return;
    this.couleur = couleur; this.dessin = dessin;
    const ancienne = this.m.peinture.map;
    this.m.peinture.map = textureDessous(couleur, dessin); this.m.peinture.needsUpdate = true;
    if (ancienne) ancienne.dispose();
  }
  retirer() { this.scene.remove(this.racine); }
}
GENRES.skate = Skate;

function melanger(p, q, k) { p.cheville.lerp(q.cheville, k); p.orteil.lerp(q.orteil, k); }
const _pA = { cheville: new THREE.Vector3(), orteil: new THREE.Vector3(), genou: new THREE.Vector3() };
const _qR = new THREE.Quaternion(), _qY = new THREE.Quaternion(), _qZ = new THREE.Quaternion(), _qT = new THREE.Quaternion();
const _Yv = new THREE.Vector3(0, 1, 0), _Zv = new THREE.Vector3(0, 0, 1);
const _haut = new THREE.Vector3(), _fC = new THREE.Vector3(), _gC = new THREE.Vector3();
const _s1 = new THREE.Vector3(), _s2 = new THREE.Vector3(), _s3 = new THREE.Vector3(), _hc = new THREE.Vector3();
const _d1 = new THREE.Vector3(), _d2 = new THREE.Vector3(), _g1 = new THREE.Vector3();
