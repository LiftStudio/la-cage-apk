import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { COURT, BALL_R, G } from './config.js';
import { recolorTexture } from './util.js';
import { eclairerMateriau } from './eclairage_perso.js';
import { Monde, SURFACE } from './monde.js';
import { COLLISIONS, faceDeNappe } from './monde_collisions.js';

// Modèle 3D de ballon (assets/ball.glb, Sketchfab) : sphère de rayon ~17 unités non centrée
const BALL_MODEL = { url: 'assets/ball.glb', radius: 17.0, center: [-2.0, -0.75, 17.09] };

function hautDuProfil(profil, x) {
  for (let i = 1; i < profil.length; i++) {
    const [x1, y1] = profil[i];
    if (x <= x1) { const [x0, y0] = profil[i - 1]; return y0 + (y1 - y0) * (x - x0) / Math.max(1e-6, x1 - x0); }
  }
  return profil[profil.length - 1][1];
}

function ballTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#d2691e'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(Math.random() * 512, Math.random() * 256, 2, 2); }
  g.strokeStyle = '#1a0d05'; g.lineWidth = 6;
  for (const x of [0, 128, 256, 384]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  g.beginPath(); g.moveTo(0, 128); g.lineTo(512, 128); g.stroke();
  g.beginPath(); g.moveTo(64, 0); g.quadraticCurveTo(190, 128, 64, 256); g.stroke();
  g.beginPath(); g.moveTo(320, 0); g.quadraticCurveTo(446, 128, 320, 256); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const _q = new THREE.Vector3(), _n = new THREE.Vector3(), _axis = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

// recolore une texture en gardant ses nuances (composition « color » du canvas) ; résultat mis en cache par couleur

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,200,120,0.9)'); gr.addColorStop(0.6, 'rgba(255,110,20,0.35)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const _pA = new THREE.Vector3();

// ---------------------------------------------------------------- la balle sur le relief (lot A3)
// Rien de ce qui suit ne sert en match, ni sur un terrain plat : seulement EN BALADE dans le parc entier (js/monde.js).
// LE ROULEMENT selon la surface (conception, § 2.5) : la décélération d'une balle qui roule, en m/s² — elle file sur
// l'enrobé, s'arrête vite dans l'herbe et presque aussitôt dans les copeaux ou le sable.
const ROULEMENT = new Float32Array(16).fill(1.0);
for (const [s, a] of [[SURFACE.ENROBE, 0.3], [SURFACE.ASPHALTE_ROUGE, 0.3], [SURFACE.STABILISE, 0.6], [SURFACE.TERRE_BATTUE, 0.6],
  [SURFACE.GRAVIER, 0.9], [SURFACE.DALLES, 0.3], [SURFACE.HERBE, 1.5], [SURFACE.SOUS_BOIS, 1.8], [SURFACE.COPEAUX, 2.5],
  [SURFACE.SABLE, 3.5], [SURFACE.BETON_CLAIR, 0.3], [SURFACE.MASSIF, 2.5], [SURFACE.EAU, 3.0], [SURFACE.CHAUSSEE, 0.3],
  [SURFACE.TROTTOIR, 0.3]]) ROULEMENT[s] = a;
// Une balle qui ROULE sur une pente n'y glisse pas : une sphère creuse (I = 2/3·m·R²) n'y prend que 3/5 de la gravité
// le long de la pente — sur 30 %, 1,7 m/s², à peine plus que ce que l'herbe lui retire.
const PART_ROULEE = 0.6;
// La plus haute marche que la balle franchit en roulant (le quart d'un rebord de trottoir) : au-delà, c'est une face
// sur laquelle elle rebondit.
const MARCHE_BALLE = 0.06;
const _nrm = { x: 0, y: 1, z: 0 }, _face = { nx: 0, nz: 0 };

export class Ball {
  constructor(scene, audio) {
    this.audio = audio; this.scene = scene;
    // vitesse réelle au dernier pas, quel que soit l'état (tenue, vol, au sol) : voir Game.updateBall
    this.vEst = new THREE.Vector3(); this._pEst = new THREE.Vector3(); this._pEstOk = false;
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 24, 18), new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.6 }));
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; scene.add(this.mesh);   // il passe dans l'ombre des joueurs et du panneau
    // remplace la sphère par le vrai modèle dès qu'il est chargé (la sphère reste le support de position/rotation)
    new GLTFLoader().load(BALL_MODEL.url, (gltf) => {
      // centrage + mise à l'échelle mesurés sur la géométrie réelle (le fichier a des transformations internes)
      const box = new THREE.Box3().setFromObject(gltf.scene, true);
      const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
      const s = BALL_R / (Math.max(size.x, size.y, size.z) / 2);
      const wrap = new THREE.Group(); wrap.scale.setScalar(s);
      gltf.scene.position.sub(center);
      gltf.scene.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        o.castShadow = true; o.receiveShadow = true;
        // Composite granuleux : ni la craie de 0,8 (aucun éclat du soleil) ni un vernis. Le lustre rasant (sheen) est
        // celui d'un ballon patiné ; les grains viennent de la carte de normales. Plus la découpe des personnages.
        const s = o.material;
        o.material = new THREE.MeshPhysicalMaterial({
          map: s.map, normalMap: s.normalMap, normalScale: s.normalScale ? s.normalScale.clone().multiplyScalar(1.25) : undefined,
          roughness: 0.6, metalness: 0, side: s.side, envMapIntensity: 0.9,
          sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xd98a52).multiplyScalar(0.4) });
        eclairerMateriau(o.material, { teinte: 0.5 });
        s.dispose();
      });
      wrap.add(gltf.scene);
      this.mesh.add(wrap);
      this.mesh.material.visible = false;
      this.model = gltf.scene; if (this.skin) this.setSkin(this.skin);   // skin choisi avant le chargement
    }, undefined, (e) => console.warn('Ballon 3D non chargé, on garde la sphère', e));
    this.pos = new THREE.Vector3(0, BALL_R, 0);
    this.vel = new THREE.Vector3();
    this.prevY = BALL_R;
    this.prevPos = new THREE.Vector3(0, BALL_R, 0);   // position au début de l'image : sert au test de panier
    this.state = 'loose'; // held | flight | loose
    this.holder = null; this.lastTouch = null;
    this.shot = null; this.touchedFloor = false;
    this.pass = null;                 // passe en cours : { from, to, team, t, T, target }
    // LE RELIEF (js/monde.js) ne concerne la balle qu'EN BALADE (Game.updateBall tient `enBalade` à jour) : en match
    // elle joue sur le plateau, à y = 0, avec le grillage d'aujourd'hui. `nappe` : la nappe de sol où elle a rebondi
    // la dernière fois (au pied d'un mur, elle lit le sol de son côté).
    this.enBalade = false; this.nappe = 0;
    // Un choc sur le cercle ou la planche (`k` : 'rim' ou 'bd', `sgn` : le panier, `f` : la force sur le ressort du
    // cercle, `v` : le volume du son). Posé par js/game.js : l'hôte d'un match en ligne le fait voir à ses invités, qui ne
    // simulent plus le ballon libre (js/enligne.js, choc).
    this.choc = null;
    // halo + traînée de feu (porteur "en feu")
    this.fire = false; this._trailT = 0; this._prev = this.pos.clone();
    this.posPrec = this.pos.clone(); this.posAff = this.pos.clone();   // interpolation de rendu
    this.local = new THREE.Vector3(); this.attache = null; this.wAttache = 0;   // balle tenue : repère du porteur
    this.greenT = 0;                  // lâcher parfait : traînée verte le temps du vol (green release)
    const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff7a1a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.glow = new THREE.Sprite(glowMat); this.glow.scale.setScalar(0.75); this.glow.visible = false; scene.add(this.glow);
    this.trail = [];
    for (let i = 0; i < 14; i++) {
      const sp = new THREE.Sprite(glowMat.clone()); sp.visible = false; sp.scale.setScalar(0.35); scene.add(sp);
      this.trail.push({ sp, life: 0 });
    }
  }

  setFire(on) { this.fire = on; }

  // skin de ballon (boutique) : texture recolorée (nuances gardées), assombrissement `mul`, halo émissif `emissive`
  setSkin(skin) {
    this.skin = skin || null;
    const tint = skin && skin.tint ? skin.tint : null;
    const apply = (mat) => {
      if (!mat) return;
      const ud = mat.userData;
      if (!ud.orig) ud.orig = { map: mat.map || null, color: mat.color ? mat.color.clone() : new THREE.Color(1, 1, 1) };
      const rec = tint && ud.orig.map ? recolorTexture(ud.orig.map, tint) : null;
      mat.map = rec || ud.orig.map;
      if (mat.color) { mat.color.copy(ud.orig.color); if (tint && !rec) mat.color.set(tint); mat.color.multiplyScalar(skin && skin.mul ? skin.mul : 1); }
      if (mat.emissive) { mat.emissive.set(skin && skin.emissive ? skin.emissive : 0x000000); mat.emissiveIntensity = skin && skin.emissive ? 0.45 : 0; }
      if (mat.sheenColor) mat.sheenColor.set(tint || 0xd98a52).multiplyScalar(0.4);   // le lustre prend la teinte du cuir
      mat.needsUpdate = true;
    };
    apply(this.mesh.material);
    if (this.model) this.model.traverse((o) => { if (o.isMesh) apply(o.material); });
  }

  // effets visuels (appelé chaque image, quel que soit l'état de la balle)
  updateFx(dt) {
    const moving = this._prev.distanceToSquared(this.pos) > 1e-6;
    if (this.greenT > 0) this.greenT -= dt;
    if (this.fire || this.greenT > 0) {
      const vert = !this.fire && this.greenT > 0;
      this.glow.visible = true; this.glow.position.copy(this.pos);
      this.glow.material.color.setHex(vert ? 0x4dff88 : 0xff7a1a);
      this.glow.material.opacity = (vert ? 0.75 : 0.55) + 0.25 * Math.sin(performance.now() * 0.02);
      this.glow.scale.setScalar(0.7 + 0.12 * Math.sin(performance.now() * 0.013));
      this._trailT += dt;
      if (this._trailT > 0.028 && moving) {
        this._trailT = 0;
        const t = this.trail.find((e) => e.life <= 0) || this.trail[0];
        t.life = 0.45; t.sp.visible = true; t.sp.position.copy(this.pos);
        t.sp.material.color.setHSL(vert ? 0.33 : 0.06 + Math.random() * 0.05, 1, vert ? 0.6 : 0.55);
      }
    } else if (this.glow.visible) { this.glow.visible = false; }
    for (const t of this.trail) {
      if (t.life <= 0) continue;
      t.life -= dt; const k = Math.max(0, t.life / 0.45);
      t.sp.material.opacity = k * 0.7; t.sp.scale.setScalar(0.12 + (1 - k) * 0.4); t.sp.position.y += dt * 0.5;
      if (t.life <= 0) t.sp.visible = false;
    }
    this._prev.copy(this.pos);
  }

  hold(player) {
    this.attache = null; this.wAttache = 0;
    this.state = 'held'; this.holder = player; this.lastTouch = player;
    this.shot = null; this.pass = null; this.vel.set(0, 0, 0); this.touchedFloor = false;
    // (relief : la nappe du dernier rebond ne vaut plus rien une fois la balle en main — le porteur a pu marcher
    // jusqu'au pied d'un mur. 0 = inconnue : au prochain contact, le sol du nœud le plus proche, comme sol())
    this.nappe = 0;
  }

  // trajectoire parabolique exacte : passe par `target` au bout de T secondes (shot = null pour une passe)
  launch(from, target, T, shot) {
    this.attache = null; this.wAttache = 0;
    this.pos.copy(from);
    this.vel.subVectors(target, from).divideScalar(T);
    this.vel.y = (target.y - from.y) / T + 0.5 * G * T;
    this.state = 'flight'; this.holder = null; this.touchedFloor = false; this.pass = null;
    this.shot = shot;
    if (shot) { shot.t = 0; shot.scored = false; shot.passedRim = false; shot.rimHit = false; this.lastTouch = shot.shooter; }
  }

  // passe : trajectoire tendue vers `target` (hauteur poitrine) en T secondes ; la balle reste "en vol" jusqu'à la réception
  throwPass(from, target, T, passer, receiver) {
    this.launch(from, target, T, null);
    this.lastTouch = passer;
    this.pass = { from: passer, to: receiver, team: passer.team, t: 0, T, target: target.clone() };
  }

  deflect(from, dir, by) {
    this.attache = null; this.wAttache = 0;
    this.pos.copy(from);
    this.vel.set(dir.x * 3.5 + (Math.random() - 0.5) * 2, 1.2 + Math.random() * 1.5, dir.z * 3.5 + (Math.random() - 0.5) * 2);
    this.state = 'loose'; this.holder = null; this.shot = null; this.pass = null; this.lastTouch = by; this.touchedFloor = false;
  }

  update(dt) {
    if (this.state === 'held') return;
    this.prevY = this.pos.y;
    this.prevPos.copy(this.pos);
    const n = 3, h = dt / n;
    for (let i = 0; i < n; i++) this._step(h);
    // rotation visuelle
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > 0.05) {
      _axis.crossVectors(UP, this.vel).normalize();
      this.mesh.rotateOnWorldAxis(_axis, (sp / BALL_R) * dt * 0.6);
    }
    this.syncMesh();
  }

  syncMesh() { this.mesh.position.copy(this.pos); this.posAff.copy(this.pos); }

  // Meme interpolation que les joueurs (voir Player.presenter) : sans elle la balle sautillerait par rapport
  // a la main qui la tient, puisque celle-ci, elle, serait lissee.
  memoriser() { this.posPrec.copy(this.pos); }
  // (Game.balleEnMain) la balle tenue par `h` : sa position dans le repère du porteur, et le poids avec lequel
  // on l'y pose à l'affichage (1 dans la main, 0 en vol : un vol s'interpole dans le monde)
  attacher(h, cible) {
    this.attache = h; if (h && h.versLocal) h.versLocal(this.pos, this.local);
    this.wAttache += Math.max(-0.25, Math.min(0.25, cible - this.wAttache));
  }
  presenter(a) {
    if (this.posPrec.distanceToSquared(this.pos) > 4.0) this.posPrec.copy(this.pos);   // passe, tir, remise en jeu
    this.posAff.set(
      this.posPrec.x + (this.pos.x - this.posPrec.x) * a,
      this.posPrec.y + (this.pos.y - this.posPrec.y) * a,
      this.posPrec.z + (this.pos.z - this.posPrec.z) * a);
    // BALLE DANS LA MAIN : on la pose dans le repère AFFICHÉ du porteur, comme sa main. Interpoler sa position
    // monde entre deux pas la faisait décoller de la paume de 2 à 4 cm à chaque poussée.
    const h = this.attache;
    if (h && this.state === 'held' && this.holder === h && h._presente && this.wAttache > 0 && h.versMondeAff) {
      h.versMondeAff(this.local, _pA);
      this.posAff.lerp(_pA, this.wAttache);
    }
    this.mesh.position.copy(this.posAff);
  }

  _step(h) {
    const x0 = this.pos.x, z0 = this.pos.z;          // d'où part le sous-pas (traversée du grillage sur le relief)
    this.vel.y -= G * h;
    this.pos.addScaledVector(this.vel, h);
    // DUNK : la balle est plantée dans le cercle. Le choc (cercle qui plie, son, secousse) part exactement au moment où
    // elle franchit le plan du cercle, pas au lâcher — sinon l'arceau réagit avant que la balle soit arrivée.
    {
      const s = this.shot;
      if (s && s.type === 'dunk' && s.made && !s.slammed && this.vel.y < 0 && this.pos.y <= COURT.HOOP_Y) {
        const hp = s.shooter.hoop;
        if (Math.hypot(this.pos.x - hp.x, this.pos.z - hp.z) < COURT.RIM_R + 0.06) {
          s.slammed = true;
          this.scene.userData.dunkSlam?.(hp.sgn, Math.min(8, -this.vel.y * 1.3), this.pos, s.shooter);
        }
      }
    }
    if (this.shot) this.shot.t += h;
    if (this.pass) this.pass.t += h;

    // sol : y = 0 (le plateau, tout match, tous les terrains plats), sauf en balade sur le relief du parc entier
    if (this.enBalade && !Monde.plat) this._solRelief(h, x0, z0);
    else if (this.pos.y < BALL_R) {
      this.pos.y = BALL_R;
      if (this.vel.y < 0) {
        if (Math.abs(this.vel.y) > 1.2) this.audio.bounce(Math.min(1, Math.abs(this.vel.y) / 7), this.pos);
        this.vel.y = -this.vel.y * 0.62; this.vel.x *= 0.85; this.vel.z *= 0.85;
      }
      if (Math.abs(this.vel.y) < 0.7) { this.vel.y = 0; this.vel.x *= 1 - 2.5 * h; this.vel.z *= 1 - 2.5 * h; }
      this.touchedFloor = true;
      if (this.state === 'flight') this.state = 'loose';
      this.pass = null;                                   // passe manquée : balle libre
    }

    for (const sgn of [-1, 1]) this._collideHoop(sgn, h);
    this._collideTroncs();
    this._collideGrillage(x0, z0);
  }

  // LE GRILLAGE, sur les terrains qui le declarent (reperes.grillage : le parc de Becon, ou la cloture de fond
  // passe a dix centimetres de la ligne). Partout ailleurs la balle sortait bien avant d'atteindre la
  // cloture ; ici elle la traversait et s'arretait dans la haie, hors d'atteinte. Rebond mou : c'est un
  // treillis souple, pas un mur.
  _collideGrillage(x0, z0) {
    // SUR LE RELIEF, EN BALADE : les grillages du plateau sont des obstacles du monde comme les autres (déclarés par
    // js/court_parc.js avec leurs portillons), voir _obstaclesRelief ; plus de rectangle où l'on ramène la balle.
    if (this.enBalade && !Monde.plat) { this._obstaclesRelief(x0, z0); return; }
    const g = (this.scene.userData.reperes || {}).grillage;
    if (!g) return;
    // une hauteur par cote (`hx0`, `hx1`, `hz0`, `hz1`, sinon `h`) : au-dessus, la balle passe
    // `pente`, `y1` (La Cage) : au-dessus de y1, le filet penche vers l'intérieur (tangente de l'inclinaison, depuis le
    // pied : les mâts partent du sol, js/court.js buildFence). Au haut des panneaux, le filet est donc déjà 14 cm en
    // dedans : pris d'un coup, ce retrait faisait faire un bond de 9 à 14 cm à la balle qui longeait le panneau en
    // montant. Il s'installe sur les 25 cm au-dessus de y1 : la balle est repoussée en douceur, et ne traverse plus le
    // filet ensuite.
    const p = this.pos, v = this.vel, H = (k) => (g[k] !== undefined ? g[k] : g.h);
    const r = g.pente && p.y > g.y1 ? g.pente * p.y * Math.min(1, (p.y - g.y1) / 0.25) : 0;
    if (p.x < g.xMin + r && p.y <= H('hx0')) { p.x = g.xMin + r; if (v.x < 0) { v.x = -v.x * 0.3; v.z *= 0.8; } }
    else if (p.x > g.xMax - r && p.y <= H('hx1')) { p.x = g.xMax - r; if (v.x > 0) { v.x = -v.x * 0.3; v.z *= 0.8; } }
    if (p.z < g.zMin + r && p.y <= H('hz0')) { p.z = g.zMin + r; if (v.z < 0) { v.z = -v.z * 0.3; v.x *= 0.8; } this.toucheGrillage = true; }
    else if (p.z > g.zMax - r && p.y <= H('hz1')) { p.z = g.zMax - r; if (v.z > 0) { v.z = -v.z * 0.3; v.x *= 0.8; } this.toucheGrillage = true; }
  }

  // ---------------------------------------------------------------- le relief (js/monde.js), en balade seulement
  // LE SOL DU PARC ENTIER, pour un sous-pas qui vient de mener la balle de (x0, z0) à this.pos.
  //  1. LES FACES DE MUR. Le relief est fait de nappes (js/monde.js) : un mur de soutènement, un bord de terrasse, une
  //     contremarche sont des frontières entre deux nappes. Si la balle entre dans une autre nappe dont le sol est
  //     plus haut que son bas (de plus d'une petite marche), elle vient de heurter la face : on la ramène d'où elle
  //     vient et on renvoie sa vitesse selon la normale de la face (faceDeNappe), en gardant sa nappe. Sinon elle
  //     passe au-dessus du bord, ou suit un sol continu (bout d'un escalier sur son palier) : la nappe change.
  //  2. LE SOL DE SA NAPPE. En dessous, on la remet dessus, puis selon la normale du sol : un REBOND (0,62 de la
  //     vitesse normale, 0,85 de la tangentielle), ou, quand le rebond ne la décollerait plus de 0,7 m/s, elle
  //     ROULE — la vitesse normale est retirée, la pente ne l'entraîne que des 3/5 de la gravité (PART_ROULEE) et la
  //     surface la freine (ROULEMENT : enrobé 0,3 m/s², herbe 1,5, copeaux 2,5). Sur une pente plus douce que ce que
  //     la surface retient (25 % dans l'herbe), elle s'arrête et y reste.
  _solRelief(h, x0, z0) {
    const p = this.pos, v = this.vel, R = BALL_R;
    if (!this.nappe) {
      // Balle qu'on vient de lâcher (nappe inconnue depuis hold) : la nappe du nœud sous elle — sauf si ce sol-là est
      // AU-DESSUS d'elle. C'est la balle lâchée le bras tendu contre la face d'un mur de soutènement (au pied du mur des
      // caves, le joueur arrêté par la balustrade à 34 cm de la face, la main déjà au-dessus du terre-plein) : on la
      // posait d'un coup sur le terre-plein, 4 m plus haut, hors d'atteinte. Elle reste alors du côté de celui qui l'a
      // lâchée (et, lâchée dans l'épaisseur du mur, plus d'un mètre sous le sol du nœud, Game._balleRendueMonde la lui
      // rend aussitôt).
      this.nappe = Monde.nappe(x0, z0);
      const t = this.lastTouch;
      if (t && t.pos && Monde.solNappe(x0, z0, this.nappe) > p.y - R + MARCHE_BALLE) this.nappe = Monde.nappe(t.pos.x, t.pos.z) || this.nappe;
    }
    const n1 = Monde.nappe(p.x, p.z);
    if (n1 !== this.nappe) {
      if (n1 === 0 || Monde.solNappe(p.x, p.z, n1) > p.y - R + MARCHE_BALLE) {
        const f = faceDeNappe(Monde, x0, z0, p.x, p.z, p.y - R, this.nappe, MARCHE_BALLE, _face);
        p.x = x0; p.z = z0;
        const vn = v.x * f.nx + v.z * f.nz;
        if (vn < 0) {
          if (-vn > 1.5) this.audio.bounce?.(Math.min(1, -vn / 7), p);
          v.x = (v.x - vn * f.nx) * 0.9 - vn * 0.5 * f.nx; v.z = (v.z - vn * f.nz) * 0.9 - vn * 0.5 * f.nz;
        }
      } else this.nappe = n1;
    }
    const ySol = Monde.solNappe(p.x, p.z, this.nappe);
    if (!(p.y < ySol + R)) return;
    p.y = ySol + R;
    const N = Monde.normale(p.x, p.z, _nrm);
    const vn = v.x * N.x + v.y * N.y + v.z * N.z;
    if (vn < 0) {
      if (-vn > 1.2) this.audio.bounce(Math.min(1, -vn / 7), p);
      const tx = v.x - vn * N.x, ty = v.y - vn * N.y, tz = v.z - vn * N.z, sortie = -vn * 0.62;
      if (sortie >= 0.7) { v.set(tx * 0.85 + N.x * sortie, ty * 0.85 + N.y * sortie, tz * 0.85 + N.z * sortie); }
      else {
        // elle roule : plus de vitesse normale ; de la gravité de ce sous-pas (0, -G·h, 0), la part tangentielle
        // (G·h·(ny·nx, ny² - 1, ny·nz)) est déjà dans la vitesse : on n'en garde que PART_ROULEE
        const k = (1 - PART_ROULEE) * G * h;
        v.set(tx - k * N.y * N.x, ty - k * (N.y * N.y - 1), tz - k * N.y * N.z);
        // (une surface que la table ne connaît pas encore — de nouvelles données — freine comme la moyenne, 1 m/s², au
        // lieu de rendre NaN et d'envoyer la balle nulle part)
        const s = v.length(), c = (ROULEMENT[Monde.surface(p.x, p.z)] || 1.0) * h;
        if (s <= c) v.set(0, 0, 0); else v.multiplyScalar(1 - c / s);
      }
    }
    this.touchedFloor = true;
    if (this.state === 'flight') this.state = 'loose';
    this.pass = null;                                   // passe manquée : balle libre
  }

  // LES OBSTACLES DU MONDE (js/monde_collisions.js) : grillages et filets du plateau avec leurs portillons, grilles,
  // haies, balustrades et parapets du parc, troncs, bâtiments. Chacun à sa hauteur : la balle passe au-dessus d'une
  // balustrade de 1 m, sous le filet tendu au-dessus du trou du grillage du pin, et par ce trou.
  _obstaclesRelief(x0, z0) {
    const choc = COLLISIONS.balle(Monde, this.pos, this.vel, x0, z0, BALL_R);
    if (!choc) return;
    const o = COLLISIONS.dernier;
    if (o && (o.type === 'grille' || o.type === 'filet' || o.type === 'portillon')) this.toucheGrillage = true;
    if (choc > 1.5) this.audio.bounce?.(Math.min(1, choc / 7), this.pos);
  }

  // Les platanes plantes dans l'enceinte (Jemmapes) arretent la balle comme n'importe quel obstacle. On ne
  // teste que sous la naissance des branches : au-dessus, la balle passe dans le feuillage.
  _collideTroncs() {
    const obs = (this.scene.userData.reperes || {}).obstacles;
    if (!obs || !obs.length) return;
    for (const o of obs) {
      // Plafond de l'obstacle : au-dessus, la balle passe. Sans `h` on garde l'ancien plafond de 2,60 m,
      // qui est la naissance des branches des platanes. C'est ce champ qui laisse la balle SURVOLER un
      // gradin de 1,32 m tout en rebondissant sur un container de 2,40 : sans lui, un mur invisible se
      // dresserait au-dessus des bancs, en plein dans la trajectoire d'un tir du coin.
      if (this.pos.y > (o.h !== undefined ? o.h : 2.6) + BALL_R) continue;
      let nx = 0, nz = 0;
      if (o.box) {
        // hx / hz sont les demi-cotes REELS : la balle s'arrete a son propre rayon, la carrure du joueur
        // (`pad`) ne la concerne pas. On ressort par la face la plus proche.
        const hx = o.hx + BALL_R, hz = o.hz + BALL_R;
        const dx = this.pos.x - o.x, dz = this.pos.z - o.z;
        if (Math.abs(dx) >= hx || Math.abs(dz) >= hz) continue;
        if (hx - Math.abs(dx) < hz - Math.abs(dz)) { nx = dx < 0 ? -1 : 1; this.pos.x = o.x + nx * hx; }
        else { nz = dz < 0 ? -1 : 1; this.pos.z = o.z + nz * hz; }
      } else if (o.r !== undefined) {
        // Avec `pad`, `r` est le rayon reel du solide ; sans lui c'est l'ancienne convention, ou `r`
        // englobe la carrure d'un joueur et pas celle du tronc.
        const R = (o.pad !== undefined ? o.r : o.r - 0.3) + BALL_R;
        let dx = this.pos.x - o.x, dz = this.pos.z - o.z;
        const d = Math.hypot(dx, dz);
        if (!(d < R)) continue;
        if (d < 1e-4) { dx = 1; dz = 0; }
        nx = dx / (d || 1); nz = dz / (d || 1);
        this.pos.x = o.x + nx * R; this.pos.z = o.z + nz * R;
      } else continue;
      const vn = this.vel.x * nx + this.vel.z * nz;
      if (vn < 0) {
        this.vel.x -= 1.5 * vn * nx; this.vel.z -= 1.5 * vn * nz;   // rebond mou
        if (Math.abs(vn) > 1.5) this.audio.bounce?.(Math.min(1, Math.abs(vn) / 7), this.pos);
      }
    }
  }


  _collideHoop(sgn) {
    const hz = sgn * Math.abs(COURT.HOOP_Z), bz = sgn * Math.abs(COURT.BOARD_Z), hy = COURT.HOOP_Y;
    // --- cercle (tore) --- ignoré pour un tir "rentré" tant qu'il n'a pas franchi le plan du cercle
    const skipRim = this.shot && this.shot.made && !this.shot.passedRim;
    if (!skipRim && Math.abs(this.pos.y - hy) < 0.5) {
      let hx = this.pos.x, hzz = this.pos.z - hz;
      let hd = Math.hypot(hx, hzz);
      if (hd < 1e-4) { hx = 1; hzz = 0; hd = 1; }
      _q.set((hx / hd) * COURT.RIM_R, hy, hz + (hzz / hd) * COURT.RIM_R);
      _n.subVectors(this.pos, _q);
      const dist = _n.length(), minD = BALL_R + COURT.RIM_TUBE;
      if (dist < minD) {
        _n.divideScalar(dist || 1);
        this.pos.copy(_q).addScaledVector(_n, minD);
        const vn = this.vel.dot(_n);
        if (vn < 0) {
          // le cercle encaisse le choc : impulsion sur son ressort (js/hoopfx.js), d'autant plus forte que la balle tombe vite
          const f = Math.min(4, (-vn) * 0.5 + Math.max(0, -this.vel.y) * 0.25), v = Math.min(1, -vn / 5);
          this.scene.userData.rimHit?.(sgn, f);
          this.vel.addScaledVector(_n, -(1 + 0.5) * vn); this.vel.multiplyScalar(0.88); this.audio.rim(v, this.pos);
          this.choc?.('rim', sgn, f, v);
        }
        if (this.shot) this.shot.rimHit = true;
        if (this.state === 'flight') this.state = 'loose';
      }
    }
    // --- panneau --- (face avant tournée vers le milieu du terrain)
    // La taille du rectangle qui arrête la balle était écrite en dur pour le panneau en éventail de Bécon
    // (1,24 m de large). Elle vaut maintenant ce que le TERRAIN déclare : Levallois a un vrai panneau
    // réglementaire de 1,80 m, et avec l'ancienne valeur ses 28 cm de bord étaient traversables de part en
    // part — un tir sur le coin du panneau passait au travers comme si de rien n'était.
    // `parSgn` : un terrain dont les deux panneaux ne sont pas identiques publie un rectangle par panier (le
    // parc de Becon, terrain 1 : deux panneaux de 1,80 x 1,05, mais le bas de D2 est a 2,90 m et celui de D1 a
    // 2,93 m ; terrain 2 : deux 1,20 x 0,90). Les autres gardent l'objet racine.
    const PU = this.scene.userData.panneau;
    const PL = (PU && PU.parSgn && PU.parSgn[sgn]) || PU || { demiL: 0.62, bas: 2.93, haut: 3.88 };
    const front = bz - sgn * 0.02;
    // `profil` : haut d'une planche en arc, [[|x|, y], ...] croissant en x — sans lui les coins du haut rebondissent dans le vide
    const haut = PL.profil ? hautDuProfil(PL.profil, Math.abs(this.pos.x)) : PL.haut;
    const inRect = Math.abs(this.pos.x) < PL.demiL && this.pos.y > PL.bas && this.pos.y < haut;
    if (inRect) {
      // la planche transmet le choc au cercle ; l'hôte d'un match en ligne le fait voir à ses invités (choc)
      const cogne = (z) => {
        const f = Math.min(1.2, Math.abs(this.vel.z) * 0.22);
        this.scene.userData.rimHit?.(sgn, f);
        this.pos.z = z; this.vel.z = -this.vel.z * 0.6; this.vel.x *= 0.9;
        const v = Math.min(1, Math.abs(this.vel.z) / 3);
        this.audio.board(v, this.pos); this.choc?.('bd', sgn, f, v);
        if (this.state === 'flight') this.state = 'loose';
      };
      if (sgn === -1 && this.vel.z < 0 && this.pos.z - BALL_R < front && this.pos.z > bz - 0.15) cogne(front + BALL_R);
      else if (sgn === 1 && this.vel.z > 0 && this.pos.z + BALL_R > front && this.pos.z < bz + 0.15) cogne(front - BALL_R);
    }
  }
}
