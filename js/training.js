// Entraînement : des ateliers courts, jouables en balade libre, qui rapportent des pièces et surtout des points
// d'entraînement (l'XP qui paie les caractéristiques et les capacités chez Pierrick).
//
// Chaque atelier est une petite machine d'état pilotée par `update(dt)` depuis Game.updateLobby. Un atelier pose des
// cibles au sol (anneaux verts), compte les réussites, et s'arrête au chrono. Les records sont gardés dans
// localStorage : battre son record donne un bonus.
//
// Le joueur entre dans l'atelier par le cercle orange devant le panier, ou depuis la boutique (« va t'entraîner »).
import * as THREE from 'three';
import { COURT, BOUNDS } from './config.js';

const KEY = 'hoops.training.v1';

// Position du cercle d'entraînement : devant le panier A, du côté opposé au cercle bleu des matchs.
export const TRAIN_POS = new THREE.Vector3(4.6, 0, -6.2);
export const TRAIN_R = 1.15;

export const DRILLS = [
  { id: 'three', name: 'Concours à 3 points', icon: '🎯', dur: 50,
    desc: 'Cinq positions autour de l\'arc. Marque un maximum de paniers.',
    coins: 3, xp: 4, bonus: 'Lâcher parfait : double.' },
  { id: 'ft', name: 'Lancers francs', icon: '🎽', dur: 45,
    desc: 'Depuis la ligne. C\'est la régularité du lâcher qui compte.',
    coins: 3, xp: 4, bonus: 'Trois de suite : série doublée.' },
  { id: 'dribble', name: 'Parcours de dribble', icon: '🌀', dur: 45,
    desc: 'Passe dans les anneaux le plus vite possible, balle en main.',
    coins: 2, xp: 3, bonus: 'Chaque anneau rapporte.' },
  { id: 'dunk', name: 'Concours de dunk', icon: '💥', dur: 45,
    desc: 'Enchaîne les dunks. Il faut de l\'élan et de la détente.',
    coins: 5, xp: 6, bonus: 'Un dunk vaut plus qu\'un layup.' },
  { id: 'cardio', name: 'Navette', icon: '🫁', dur: 40,
    desc: 'Touche les anneaux aux deux bouts du terrain, en sprint.',
    coins: 2, xp: 3, bonus: 'Entraîne aussi ton endurance.' },
];
export const drillById = (id) => DRILLS.find((d) => d.id === id) || null;

// cinq positions de tir réparties autour de l'arc du panier A
const SPOTS_3 = [[-6.0, -6.4], [-4.2, -9.6], [0, -11.0], [4.2, -9.6], [6.0, -6.4]];
const SPOTS_DRIB = [[-5.2, -3.0], [3.8, -4.4], [5.6, -9.2], [-1.2, -10.4], [-5.6, -8.0], [0, -5.2]];

export class Training {
  constructor(scene, game) {
    this.scene = scene; this.g = game;
    this.drill = null; this.t = 0; this.score = 0; this.hits = 0; this.streak = 0;
    this.idx = 0; this.spots = []; this.ended = 0;
    this.records = {};
    try { const raw = localStorage.getItem(KEY); if (raw) this.records = JSON.parse(raw) || {}; } catch (e) { /* stockage indisponible */ }
    this.marks = [];
    for (let i = 0; i < 6; i++) {
      const g0 = new THREE.RingGeometry(0.55, 0.78, 40);
      const m = new THREE.Mesh(g0, new THREE.MeshBasicMaterial({ color: 0x4dff88, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.visible = false; m.renderOrder = 3;
      scene.add(m); this.marks.push(m);
    }
    // cercle d'entrée de l'atelier, façon cercle bleu des matchs mais orange
    const ring = new THREE.Mesh(new THREE.RingGeometry(TRAIN_R - 0.16, TRAIN_R, 48),
      new THREE.MeshBasicMaterial({ color: 0xffa62b, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(TRAIN_POS.x, 0.02, TRAIN_POS.z); ring.renderOrder = 3;
    scene.add(ring); this.ring = ring;
  }

  get active() { return !!this.drill; }
  record(id) { return this.records[id] || 0; }
  saveRecord(id, v) {
    if (v <= (this.records[id] || 0)) return false;
    this.records[id] = v;
    try { localStorage.setItem(KEY, JSON.stringify(this.records)); } catch (e) { /* ignore */ }
    return true;
  }

  start(id) {
    const d = drillById(id);
    if (!d) return false;
    this.drill = d; this.t = d.dur; this.score = 0; this.hits = 0; this.streak = 0; this.idx = 0; this.ended = 0;
    // Les cibles sont ecrites pour 28 x 15 : on les met a l'echelle du terrain (identiques sur 28 x 15). Sur le
    // parc de Becon (18,2 m) la cible du haut de l'arc tombait derriere le grillage et l'atelier restait bloque.
    // (petits terrains seulement : ailleurs les cibles restent celles d'origine)
    const petit = COURT.L < 20;
    const kx = COURT.W / 15, kz = Math.abs(COURT.HOOP_Z) / 12.425, zMax = BOUNDS.zMax - 0.5;
    const ech = (a) => petit ? a.map(([x, z]) => [x * kx, Math.max(-zMax, Math.min(zMax, z * kz))]) : a.slice();
    this.spots = id === 'three' ? ech(SPOTS_3) : id === 'dribble' ? ech(SPOTS_DRIB)
      : id === 'cardio' ? (petit ? [[1.3, -zMax], [1.3, zMax]] : [[0, -11.5], [0, 11.5]]) : [];
    this.place();
    return true;
  }

  stop() {
    this.drill = null;
    for (const m of this.marks) m.visible = false;
  }

  // pose les anneaux : une seule cible pour les ateliers à étapes, toutes pour le parcours
  place() {
    const id = this.drill && this.drill.id;
    for (const m of this.marks) m.visible = false;
    if (!this.spots.length) return;
    if (id === 'dribble') {
      this.spots.forEach((s, i) => { const m = this.marks[i]; if (!m) return; m.position.set(s[0], 0.02, s[1]); m.visible = i === this.idx % this.spots.length; });
    } else {
      const s = this.spots[this.idx % this.spots.length];
      this.marks[0].position.set(s[0], 0.02, s[1]); this.marks[0].visible = true;
    }
  }

  // le joueur doit être sur la cible pour que le tir compte (ateliers de tir)
  onSpot(p) {
    if (!this.spots.length) return true;
    const s = this.spots[this.idx % this.spots.length];
    return Math.hypot(p.pos.x - s[0], p.pos.z - s[1]) < 1.35;
  }

  // appelé par Game quand un panier est marqué en balade pendant un atelier
  onBasket(shot) {
    const d = this.drill;
    if (!d) return null;
    if (d.id === 'three') {
      if (!this.onSpot(shot.shooter)) return { txt: 'HORS POSITION', coins: 0, xp: 0 };
      const g = shot.green ? 2 : 1;
      this.hits++; this.score += 2 * g; this.idx++; this.place();
      return { txt: shot.green ? 'PARFAIT ! ×2' : 'DEDANS', coins: d.coins * g, xp: d.xp * g };
    }
    if (d.id === 'ft') {
      this.streak = shot.green ? this.streak + 1 : 0;
      const g = this.streak >= 3 ? 2 : 1;
      this.hits++; this.score += g;
      return { txt: g > 1 ? `SÉRIE ×${this.streak}` : 'DEDANS', coins: d.coins * g, xp: d.xp * g };
    }
    if (d.id === 'dunk') {
      const dk = shot.type === 'dunk';
      this.hits++; this.score += dk ? 3 : 1;
      return { txt: dk ? 'DUNK !' : 'layup', coins: dk ? d.coins : 1, xp: dk ? d.xp : 1 };
    }
    return null;
  }

  update(dt, user) {
    if (!this.drill) return null;
    this.t -= dt;
    const d = this.drill;
    // parcours et navette : on valide en passant dans l'anneau
    if ((d.id === 'dribble' || d.id === 'cardio') && this.spots.length) {
      const s = this.spots[this.idx % this.spots.length];
      const ok = Math.hypot(user.pos.x - s[0], user.pos.z - s[1]) < 0.95
        && (d.id !== 'dribble' || this.g.ball.holder === user);
      if (ok) {
        this.idx++; this.hits++; this.score++;
        this.place();
        this.g.reward(d.id === 'dribble' ? 'ANNEAU' : 'NAVETTE', d.coins, d.xp);
        this.g.audio.catchBall?.(user.pos);
      }
    }
    if (this.t <= 0) return this.finish();
    return null;
  }

  finish() {
    const d = this.drill;
    const rec = this.saveRecord(d.id, this.score);
    const bonus = rec ? 25 + this.score * 2 : 0;
    this.stop();
    return { drill: d, score: this.score, hits: this.hits, record: rec, bonus };
  }
}
