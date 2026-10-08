// Sons synthétisés en WebAudio (aucun fichier audio à charger)
// … sauf au parc de Bécon EN ENTIER (lot C3) : les pas sur un autre sol que l'enrobé, l'eau des fontaines, les oiseaux
// et la rue du quai viennent de quelques enregistrements CC0 (assets/sons/, 535 Ko, chargés au premier passage), et
// l'atelier de ces sons — avec le roulement du vélo et l'orgue du manège, synthétisés — est dans js/audio_parc.js.
import { Monde } from './monde.js';
import { SonsParc, SONS_PARC, FAMILLE_SOL } from './audio_parc.js';
export { SONS_PARC };
const DEBUG_SONS = (() => { try { return new URLSearchParams(location.search).has('debug'); } catch (e) { return false; } })();

export class AudioFX {
  constructor() { this.ctx = null; this.master = null; this.lastRim = 0; this.lastBounce = 0; this.crowd = null; this.crowdBase = 0; this.listener = null; this.vol = { master: 0.5, sfx: 1, crowd: 1, ambiance: 1 }; this.parc = null; }

  // volumes du menu Options > Audio (0..1) ; `ambiance` : les sons du parc entier (fontaines, oiseaux, manège, rue)
  setVolumes(v) {
    this.vol = { master: v.master ?? 0.5, sfx: v.sfx ?? 1, crowd: v.crowd ?? 1, ambiance: v.ambiance ?? 1 };
    if (this.master) this.master.gain.setTargetAtTime(this.vol.master, this.t, 0.05);
    if (this.crowd) { this._crowdV = undefined; this.setCrowd(this.crowdBase); }   // (un volume changé repasse toujours)
    if (this.parc) this.parc.volumes(this.vol);
  }

  // ---------- le parc entier (lot C3, js/audio_parc.js) ----------
  // L'atelier des sons du parc, créé avec le contexte audio (il lui faut ses bus sous le volume général).
  _atelier() { if (!this.parc && this.ctx) this.parc = new SonsParc(this); return this.parc; }
  // Une fois par image (Game.frame) : l'oreille suit la caméra, l'ambiance du parc entier (qui se tait ailleurs) et le
  // roulement du vélo (partout). Rien tant que le joueur n'a pas encore touché l'écran (pas de contexte audio).
  majMonde(dt, game) {
    const P = this._atelier(); if (!P) return;
    P.maj(dt, game);
    if (DEBUG_SONS && !window.__sons) window.__sons = () => this.parc.bilan();
  }
  // La famille de sol sous un pas (FAMILLE_SOL) : 'enrobe' partout ailleurs qu'au parc entier (Monde.surface y rend
  // l'enrobé), et sur l'enrobé, l'asphalte, la chaussée, le trottoir et le béton du parc entier.
  _famille(pos) {
    const fam = (pos && FAMILLE_SOL[Monde.surface(pos.x, pos.z)]) || 'enrobe';
    if (this.parc) this.parc.noter(fam);
    return fam;
  }
  // Un pas enregistré (js/audio_parc.js) ; rend la part du coup sourd synthétisé à y ajouter, ou false si les sons du
  // parc ne sont pas (encore) chargés : on joue alors le pas d'enrobé.
  _pasParc(fam, a, f, genre) { const P = this._atelier(); return P ? P.pas(fam, a, f, genre) : false; }
  // le coup sourd de la semelle, sans le frottement de la gomme (celui de l'enrobé, en dessous des pas enregistrés)
  _sourd(a, f) {
    if (a < 0.004) return;
    this._noise(0.05, 0.15 * a, 'lowpass', 300 + 300 * f, 0.002, 0, 0.7);
    this._osc('sine', 92 + Math.random() * 12, 58, 0.07, 0.09 * a);
  }

  // position de l'auditeur (caméra) : les sons du terrain s'atténuent avec la distance
  setListener(p) { this.listener = p; }
  _att(pos) {
    if (!pos || !this.listener) return 1;
    const d = Math.hypot(pos.x - this.listener.x, pos.y - this.listener.y, pos.z - this.listener.z);
    return Math.max(0.3, Math.min(1, 1 - (d - 6) / 28));
  }

  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.vol.master;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.crowd) this._startCrowd();
  }

  // Foule : bruit filtré en boucle (murmure grave + brouhaha aigu), dont le niveau suit le momentum du match
  _startCrowd() {
    const sr = this.ctx.sampleRate, len = sr * 4;
    const buf = this.ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let b0 = 0, b1 = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.995 * b0 + 0.005 * w; b1 = 0.95 * b1 + 0.05 * w; d[i] = b0 * 9 + b1 * 1.2 + w * 0.08; }
    }
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.5;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.6;
    const g = this.ctx.createGain(); g.gain.value = 0.0001;
    const g2 = this.ctx.createGain(); g2.gain.value = 0.0001;
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.connect(bp); bp.connect(g2); g2.connect(this.master);
    src.start();
    this.crowd = { src, g, g2, lp, bp };
  }
  // niveau de fond 0..1 (momentum) : lissé
  // (06/10/2026) Appelé à CHAQUE PAS de la simulation pendant un match (js/game.js _checkFire, 120 fois par seconde) : trois
  // rampes programmées à chaque appel, 360 par seconde, pour un niveau qui ne bouge que de quelques millièmes. On ne
  // reprogramme que si le gain change d'au moins 0,002 (un pour cent du momentum) ou le niveau d'au moins 0,01.
  setCrowd(level) {
    if (!this.crowd) return;
    this.crowdBase = level;
    const v = (0.02 + level * 0.22) * this.vol.crowd;
    if (this._crowdV !== undefined && Math.abs(v - this._crowdV) < 0.002 && Math.abs(level - this._crowdN) < 0.01) return;
    this._crowdV = v; this._crowdN = level;
    this.crowd.g.gain.setTargetAtTime(v, this.t, 0.6);
    this.crowd.g2.gain.setTargetAtTime(v * 0.5, this.t, 0.6);
    this.crowd.bp.frequency.setTargetAtTime(1200 + level * 900, this.t, 0.8);
  }
  // montée brutale de la foule (panier, contre...) puis retour au niveau de fond
  swell(v = 0.6, dur = 1.6) {
    if (!this.crowd) return;
    const base = (0.02 + this.crowdBase * 0.22) * this.vol.crowd, peak = Math.min(0.6, base + v * 0.45 * this.vol.crowd);
    const g = this.crowd.g, g2 = this.crowd.g2;
    g.gain.cancelScheduledValues(this.t); g2.gain.cancelScheduledValues(this.t);
    g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), this.t); g.gain.linearRampToValueAtTime(peak, this.t + 0.12); g.gain.setTargetAtTime(base, this.t + 0.12 + dur * 0.4, dur * 0.35);
    g2.gain.setValueAtTime(Math.max(0.0001, g2.gain.value), this.t); g2.gain.linearRampToValueAtTime(peak * 0.9, this.t + 0.12); g2.gain.setTargetAtTime(base * 0.5, this.t + 0.12 + dur * 0.4, dur * 0.35);
  }
  // "Ooooh" de foule qui monte (contre, action chaude)
  ooh() { this._noise(0.9, 0.3, 'bandpass', 650, 0.25); this._osc('sine', 280, 420, 0.7, 0.05); }
  // impact sourd (dunk qui secoue le cercle)
  boom() { this._osc('sine', 70, 38, 0.5, 0.7); this._noise(0.25, 0.5, 'lowpass', 300, 0.01); this._osc('triangle', 1000, 700, 0.4, 0.15); }
  // "ding" de momentum (jauge pleine)
  fire() { this._osc('sine', 660, 990, 0.25, 0.18); this._osc('sine', 990, 1320, 0.35, 0.12); this._noise(0.5, 0.15, 'highpass', 3000, 0.05); }

  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  // when : départ différé (s), vol déjà atténué par l'appelant
  _osc(type, f0, f1, dur, vol, when = 0) {
    vol *= this.vol.sfx; if (vol <= 0.0005) return;
    if (!this.ctx || vol <= 0.0011) return;
    const t0 = this.t + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  _noise(dur, vol, filterType, freq, attack = 0.005, when = 0, q = 0.8) {
    vol *= this.vol.sfx; if (vol <= 0.0005) return;
    if (!this.ctx || vol <= 0.0011) return;
    const t0 = this.t + when;
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.ceil(sr * dur), sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  // rebond de balle (dribble, balle au sol) : claquement sec + coup sourd, v = force 0..1, pos = position monde (atténuation)
  bounce(v = 0.6, pos = null) {
    if (this.t - this.lastBounce < 0.06) return;
    this.lastBounce = this.t;
    const a = this._att(pos) * Math.min(1, v);
    this._noise(0.025, 0.55 * a, 'bandpass', 1900, 0.002, 0, 1.2);      // claquement du cuir
    this._noise(0.07, 0.35 * a, 'lowpass', 520, 0.003);                  // impact sourd
    this._osc('sine', 135, 58, 0.16, 0.6 * a);                           // "boum" du ballon
  }
  // cercle : cloche métallique (plusieurs partiels détonés) + attaque, v = force 0..1
  rim(v = 1, pos = null, when = 0) {
    if (when === 0 && this.t - this.lastRim < 0.08) return;
    if (when === 0) this.lastRim = this.t;
    const a = this._att(pos) * Math.min(1, Math.max(0.25, v));
    this._noise(0.02, 0.35 * a, 'highpass', 2800, 0.001, when);
    this._osc('triangle', 1180, 1120, 0.5, 0.28 * a, when);
    this._osc('triangle', 1770, 1700, 0.4, 0.16 * a, when);
    this._osc('sine', 2650, 2500, 0.3, 0.09 * a, when);
    this._osc('sine', 420, 380, 0.25, 0.14 * a, when);                   // vibration grave du cercle
  }
  // dunk : impact sourd + cercle qui vibre plusieurs fois
  dunkHit(pos = null) {
    this.boom();
    this.rim(1, pos); this.rim(0.55, pos, 0.11); this.rim(0.3, pos, 0.24); this.rim(0.15, pos, 0.4);
  }
  board(v = 1, pos = null) { const a = this._att(pos) * Math.min(1, Math.max(0.3, v)); this._noise(0.12, 0.45 * a, 'lowpass', 900); this._osc('sine', 230, 120, 0.22, 0.3 * a); this._osc('triangle', 640, 600, 0.15, 0.08 * a); }
  swish(pos = null) { const a = this._att(pos); this._noise(0.28, 0.5 * a, 'bandpass', 2500, 0.02); this._noise(0.18, 0.2 * a, 'bandpass', 900, 0.03, 0.05); }
  buzzer()  { this._osc('square', 210, 210, 0.9, 0.18); this._osc('square', 214, 214, 0.9, 0.12); }
  // geste refusé (tir avant d'avoir ressorti la balle, js/game.js refuserTir) : le buzzer en bref, plus grave
  refus()   { this._osc('square', 150, 146, 0.16, 0.11); this._osc('square', 153, 149, 0.16, 0.07); }
  // BRUITS DE CORPS. Ils ne portent pas comme un rebond de ballon : au-delà d'une vingtaine de mètres on ne
  // les entend plus du tout (l'atténuation générale garde toujours 30 % du volume, c'est trop pour des pas).
  _attCorps(pos) {
    if (!pos || !this.listener) return 1;
    const d = Math.hypot(pos.x - this.listener.x, (pos.y || 0) - this.listener.y, pos.z - this.listener.z);
    const k = Math.max(0, 1 - Math.max(0, d - 3) / 17);
    return k * k;
  }
  // un pas de basket sur l'enrobé : le coup sourd de la semelle et le frottement de la gomme
  // (Au parc entier, sur un autre sol — gravier, herbe, dalles… —, c'est un pas enregistré, avec ce coup sourd dessous.)
  pas(pos, f = 0.5) {
    const a = this._attCorps(pos) * f; if (a < 0.02) return;
    const fam = this._famille(pos);
    if (fam !== 'enrobe') { const sourd = this._pasParc(fam, a, f, 'pas'); if (sourd !== false) { this._sourd(a * sourd, f); return; } }
    this._noise(0.05, 0.15 * a, 'lowpass', 480 + 420 * f, 0.002, 0, 0.7);
    this._noise(0.022, 0.045 * a, 'bandpass', 2400 + Math.random() * 600, 0.001, 0.004, 1.4);
    this._osc('sine', 92 + Math.random() * 12, 58, 0.07, 0.09 * a);
  }
  // crissement de semelle sur un appui sec : un petit glissando aigu qui accroche deux fois, et la gomme
  // (Une gomme ne crisse que sur un sol dur et lisse : enrobé, béton, dalles. Sur le gravier, le stabilisé, la terre ou
  // le sable, le pied qui pivote RACLE ; sur l'herbe, il froisse : c'est le début d'un pas enregistré, ralenti.)
  crissement(pos, f = 0.6) {
    const a = this._attCorps(pos) * f; if (a < 0.03) return;
    const fam = this._famille(pos);
    if (fam !== 'enrobe' && fam !== 'dalles') { this._pasParc(fam, a, f, 'glisse'); return; }
    const f0 = 1650 + Math.random() * 900;
    this._osc('triangle', f0, f0 * 1.22, 0.10, 0.045 * a);
    this._osc('triangle', f0 * 1.08, f0 * 1.3, 0.08, 0.035 * a, 0.045);
    this._osc('sine', f0 * 2.02, f0 * 2.3, 0.07, 0.012 * a);
    this._noise(0.09, 0.05 * a, 'bandpass', 3200, 0.003, 0, 2.2);
  }
  // réception d'un saut : les deux pieds ensemble, plus lourd qu'un pas
  reception(pos, f = 0.7) {
    const a = this._attCorps(pos) * f; if (a < 0.02) return;
    const fam = this._famille(pos);
    if (fam !== 'enrobe') {
      const sourd = this._pasParc(fam, a, f, 'reception');
      if (sourd !== false) { this._noise(0.09, 0.26 * a * sourd, 'lowpass', 420, 0.002, 0, 0.7); this._osc('sine', 78, 44, 0.13, 0.22 * a * sourd); return; }
    }
    this._noise(0.09, 0.26 * a, 'lowpass', 420, 0.002, 0, 0.7);
    this._osc('sine', 78, 44, 0.13, 0.22 * a);
    this._noise(0.03, 0.06 * a, 'bandpass', 2200, 0.001, 0.006, 1.2);
  }
  // sonnette de vélo : le « dring », un petit timbre frappé six fois très vite, deux partiels et un clic
  sonnette(pos = null) {
    const a = this._att(pos);
    for (let i = 0; i < 6; i++) {
      const w = i * 0.043, v = (i % 2 ? 0.65 : 1) * a;
      this._osc('triangle', 2390, 2360, 0.30, 0.10 * v, w);
      this._osc('sine', 3640, 3600, 0.22, 0.05 * v, w);
      this._noise(0.012, 0.05 * v, 'highpass', 5200, 0.001, w);
    }
  }
  whistle() { this._osc('sine', 2300, 2500, 0.35, 0.2); }
  // passe : sifflement bref de la balle qui part ; réception : claquement mat dans les mains
  pass(pos = null) { const a = this._att(pos); this._noise(0.16, 0.22 * a, 'bandpass', 1800, 0.01); this._osc('triangle', 420, 260, 0.12, 0.06 * a); }
  catchBall(pos = null) { const a = this._att(pos); this._noise(0.07, 0.35 * a, 'lowpass', 1400, 0.004); this._osc('sine', 190, 120, 0.1, 0.18 * a); }
  cheer()   { this._noise(1.4, 0.35, 'lowpass', 1400, 0.15); }
  boo()     { this._noise(1.0, 0.2, 'lowpass', 500, 0.2); }
  block()   { this._noise(0.08, 0.5, 'lowpass', 400); this._osc('sine', 120, 60, 0.15, 0.4); }
}
