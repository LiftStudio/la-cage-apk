import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// =====================================================================
//  L'OMBRE DU DÉCOR GARDÉE EN CACHE (04/10/2026)
// =====================================================================
// La carte d'ombre du soleil était redessinée EN ENTIER à chaque image : platanes, grillages, poteaux, bancs, vélos
// garés... alors que seuls les joueurs et le ballon bougent. Mesuré en 5 contre 5, au téléphone (?tel=1) : la moitié
// des appels de dessin de l'image (311 sur 583) et la moitié des triangles (700 000 sur 1,44 million).
//
// LA MÉTHODE, celle des ombres de contact (js/ombres_contact.js) : le décor fixe est dessiné UNE fois dans une copie
// (`cache`). Ensuite, à chaque image où three met la carte à jour :
//   1. la copie est recopiée dans la carte d'ombre, profondeur comprise (gl_FragDepth, lue dans le RGBA de la carte) ;
//   2. three dessine la carte comme d'habitude, mais sans l'effacer, et seulement avec ce qui bouge : les objets de la
//      couche des mobiles (COUCHE, posée par js/ombres_contact.js : joueurs, marchand, ballon). Le décor fixe a
//      `castShadow` coupé le temps de ce rendu. Un joueur sous un platane reçoit donc bien l'ombre du platane, et le
//      test de profondeur garde, texel par texel, ce qui est le plus près du soleil.
// Les vélos GARÉS comptent comme décor (36 pièces chacun) : la clé du cache comprend leur position, si bien qu'un vélo
// qu'on déplace refait le cache (à vélo, c'est donc le coût d'avant, pas plus).
//
// LA CLÉ : taille et identité de la carte, position du soleil et de sa cible, cadrage de la caméra d'ombre, signal
// « décor arrivé » (scene.userData.solCuit, celui de l'ombre cuite au sol), nombre d'objets qui projettent, vélos
// garés. Elle est relue à chaque image (le nombre d'objets, deux fois par seconde) ; si elle change, le cache est
// refait — une image où les mobiles n'ont pas d'ombre, invisible.
//
// OÙ : partout où la carte est FIXE (terrains plats, plateau seul du parc) ; pas au parc entier, où elle suit le joueur
// (scene.userData.ombreSuivie, js/monde_ombres.js). Les feuillages dont l'ombre suit le vent (venteEnOmbre) étaient
// redessinés à chaque image à tous les préréglages ; ils ont maintenant leur cadence (voir plus bas, `cadVent`). Vérifié
// en lisant la carte d'ombre, image figée : identique à l'octet près à celle d'avant, en basse, moyenne, haute et ultra.
// ?ombrecache=0 dans l'adresse coupe le cache (comparaisons).
//
// LE FEUILLAGE AU VENT, À SA CADENCE (07/10/2026). Redessiner à chaque image l'ombre des feuillages qui bougent coûtait
// cher : les platanes, les haies et le lierre de La Cage sont des milliers de découpes, dessinées dans une carte de 3072².
// Le cache a maintenant DEUX étages :
//   - `cache` (le décor fixe, comme avant), refait seulement quand la clé change ;
//   - `cacheVent` = le décor fixe + les feuillages au vent, refait toutes les `cadVent` images.
// Chaque image recopie `cacheVent` dans la carte, puis three n'y dessine que les vrais mobiles (joueurs, marchand, ballon,
// voitures qui roulent) : leurs ombres ne sont JAMAIS en retard, seule celle des feuilles l'est, de deux images au plus.
// `cadVent` (js/fx.js, PRESETS.ventOmbre) : 1 = à chaque image (machine costaude en ultra et extrême, comme avant) ; 3 =
// une image sur trois (haute et moyenne d'un PC) ; 0 = figé DANS le cache du décor (basse, téléphone : l'ombre des
// feuilles ne frémit plus, la carte ne redessine plus que les joueurs).
const COUCHE = 7;
// La couche du second étage : les feuillages au vent et les lumières de la scène (toutes : le nombre de lumières entre dans
// la clé des programmes de profondeur), la seule que regarde la caméra « à vide » quand il est refait. three ne fait alors
// qu'un test de masque par objet, au lieu d'élaguer les 2 000 objets de la scène par la caméra (2,1 ms mesurées sur PC,
// une image sur trois). (6, 7 et 30 servent déjà : js/monde_ombres.js, js/ombres_contact.js, js/fx.js)
const COUCHE_VENT = 29;
// UNE OMBRE QUI BOUGE TOUTE SEULE : un feuillage dont le matériau d'ombre suit le vent (windify / windifyWorld de
// js/court.js, feuillages et arbres du parc). Il est redessiné à chaque image comme un mobile : son ombre continue de
// frémir, et le reste du décor (troncs, grillages, poteaux, bancs, murs) reste en cache.
const VENT = /wind|vent|feuilles-ombre|arbre-parc-ombre/;
function venteEnOmbre(o) {
  const d = o.customDepthMaterial;
  if (!d || typeof d.customProgramCacheKey !== 'function' || d.customProgramCacheKey === THREE.Material.prototype.customProgramCacheKey) return false;
  try { return VENT.test(d.customProgramCacheKey()); } catch (e) { return false; }
}

const COPIE_PROFONDEUR = {
  uniforms: { tCache: { value: null } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }',
  fragmentShader: `
    #include <packing>
    uniform sampler2D tCache; varying vec2 vUv;
    void main() { vec4 c = texture2D( tCache, vUv ); gl_FragColor = c; gl_FragDepth = unpackRGBAToDepth( c ); }`,
};
const COPIE = {
  uniforms: { tCache: { value: null } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }',
  fragmentShader: 'uniform sampler2D tCache; varying vec2 vUv; void main() { gl_FragColor = texture2D( tCache, vUv ); }',
};

// LES PROGRAMMES DE LA CARTE D'OMBRE, PRÉCOMPILÉS (06/10/2026). three dessine la carte d'ombre avec ses propres matériaux
// de profondeur (WebGLShadowMap, getDepthMaterial), compilés au premier dessin de chaque objet dans la carte — jamais par
// compileAsync, qui ne voit que le matériau de l'objet. Mesuré en 5 contre 5 : 11 programmes de profondeur (squelettes,
// morphes des visages, découpes des cheveux) à la PREMIÈRE image du match, 2 s d'image figée ; et ceux du décor entier à
// la première baisse de préréglage (le type d'ombre fait partie de la clé de TOUS les programmes). `avecProfondeur` pose,
// le temps d'un appel à `compiler(racine)`, le matériau de profondeur que three prendra, aux mêmes règles : celui de
// l'objet (customDepthMaterial), sinon une profondeur empaquetée en RGBA qui reprend la carte, la découpe et le
// déplacement du matériau, sur la face inverse (shadowSide). Mêmes clés de programme : three les trouve prêts.
// (Une copie par matériau source, gardée : jetée, elle libérerait son programme avant que three ne s'en serve ; partagée,
// elle n'aurait que les réglages du dernier objet au moment de la compilation, qui vient après la pose de toutes.)
const _prof = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
const _profParMat = new WeakMap();
const FACE_OMBRE = { [THREE.FrontSide]: THREE.BackSide, [THREE.BackSide]: THREE.FrontSide, [THREE.DoubleSide]: THREE.DoubleSide };
function materiauProfondeur(o, m) {
  if (o.customDepthMaterial !== undefined) return o.customDepthMaterial;
  let d = _profParMat.get(m);
  if (!d) { d = _prof.clone(); _profParMat.set(m, d); }
  d.side = m.shadowSide !== null && m.shadowSide !== undefined ? m.shadowSide : FACE_OMBRE[m.side];
  d.wireframe = m.wireframe;
  d.alphaMap = m.alphaMap; d.alphaTest = m.alphaTest; d.map = m.map;
  d.displacementMap = m.displacementMap; d.displacementScale = m.displacementScale; d.displacementBias = m.displacementBias;
  d.clipShadows = m.clipShadows; d.clippingPlanes = m.clippingPlanes; d.clipIntersection = m.clipIntersection;
  return d;
}
// La « scène » à donner à compile() pour ces programmes-là : three dessine la carte d'ombre SANS scène (_emptyScene de
// WebGLRenderer : ni brouillard ni environnement — le brouillard entre dans la clé), mais avec les lumières de la vraie.
// Ceci n'est pas une scène (isScene faux : compile() prend alors la scène vide), et on y relève les lumières de la vraie.
// À compiler dans une cible (jamais l'écran : la carte d'ombre est une cible, sans tone mapping).
// (06/10/2026) `traverse` : pour compiler la scène ENTIÈRE, on passe cette doublure comme objet ET comme scène —
// compile(scène, caméra, doublure) relève les lumières dans les deux, et chaque programme de profondeur avait sa
// variante à lumières doublées (11 programmes de plus, jamais dessinés). Voir Game._compilerTout.
export function sceneOmbre(scene) { return { isScene: false, traverseVisible: (f) => scene.traverseVisible(f), traverse: (f) => scene.traverse(f) }; }
export function avecProfondeur(racine, compiler) {
  const poses = [];
  racine.traverse((o) => {
    if (!(o.isMesh || o.isPoints || o.isLine) || !o.castShadow || !o.material) return;
    const src = o.material, ms = Array.isArray(src) ? src : [src];
    const prof = ms.map((m) => (m && m.visible ? materiauProfondeur(o, m) : m));
    poses.push([o, src]);
    o.material = Array.isArray(src) ? prof : prof[0];
  });
  try { return poses.length ? compiler(racine) : null; }
  finally { for (const [o, src] of poses) o.material = src; }
}

export class OmbreCache {
  constructor(renderer, scene, camera = null) {
    this.r = renderer; this.scene = scene; this.camera = camera;
    this.velos = () => [];             // les vélos du terrain (posé par js/game.js) : décor tant qu'ils sont garés
    this.cache = null; this.cle = ''; this.pret = false;
    this.fixes = []; this.mobiles = []; this.vent = [];
    this.cadVent = 1;                  // cadence des feuillages au vent (voir l'en-tête) ; posée par js/fx.js setQuality
    this.cacheVent = null; this._iVent = 0; this._cadTriee = -1;
    this._tCompte = 0; this._compte = -1;
    this._cuire = false; this._incr = false;
    this.quadProf = new FullScreenQuad(new THREE.ShaderMaterial({ ...COPIE_PROFONDEUR, depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth }));
    this.quadCopie = new FullScreenQuad(new THREE.ShaderMaterial({ ...COPIE, depthTest: false, depthWrite: false }));
    const r = renderer, self = this, clear = r.clear;
    // pendant le rendu incrémental, three efface la carte avant d'y dessiner : on garde ce qu'on vient d'y recopier
    r.clear = function (c, d, s) { if (self._incr && self.sun && r.getRenderTarget() === self.sun.shadow.map) return; return clear.call(this, c, d, s); };
    this.stats = { cuissons: 0, fixes: 0, mobiles: 0, vent: 0, ventes: 0 };
    if (typeof window !== 'undefined') window.__ombreCache = this;
  }

  // Ce qui projette une ombre, rangé en fixe et mobile. Un vélo garé est fixe ; un vélo pris, mobile.
  // LES VOITURES QUI ROULENT (scene.userData.traffic, La Cage) sont mobiles elles aussi : elles n'ont pas
  // userData.dynamique (l'ombre cuite au sol les écarte à part, js/court.js), et le cache les figeait à leur place du
  // moment — une ombre de voiture arrêtée restait sur la chaussée, les voitures qui passaient n'en avaient aucune.
  _trier() {
    const fixes = [], mobiles = [], vent = [];
    const cad = this.cadVent;
    const racinesMobiles = this._roulantes();
    for (const b of this.velos() || []) if (b && b.pris && b.racine) racinesMobiles.add(b.racine);
    // mobile : sous un objet `dynamique` de la scène (joueurs, marchand, passants...) sauf un vélo garé, le ballon, ou
    // sur la couche des mobiles — sans attendre que js/ombres_contact.js l'ait posée (un joueur pris pour du décor
    // laisserait une ombre fantôme dans le cache et n'en aurait plus lui-même)
    const balle = this.scene.userData.ball && this.scene.userData.ball.mesh;
    const parcourir = (o, mobile) => {
      if (!o.visible) return;
      if (o === balle || racinesMobiles.has(o) || (o.parent === this.scene && o.userData.dynamique && !this._velosGares.has(o))) mobile = true;
      if ((o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) && o.castShadow) {
        if (mobile || (o.layers.isEnabled(COUCHE) && !this._estVeloGare(o))) mobiles.push(o);
        // (le feuillage au vent : à chaque image avec les mobiles, à sa cadence dans le second étage, ou figé dans le décor)
        else if (venteEnOmbre(o)) (cad === 1 ? mobiles : cad > 1 ? vent : fixes).push(o);
        else fixes.push(o);
      }
      for (const c of o.children) parcourir(c, mobile);
    };
    this._velosGares = new Set();
    for (const b of this.velos() || []) if (b && !b.pris && b.racine) this._velosGares.add(b.racine);
    parcourir(this.scene, false);
    this.fixes = fixes; this.mobiles = mobiles; this.vent = vent; this._cadTriee = cad;
    for (const o of vent) o.layers.enable(COUCHE_VENT);
    if (vent.length) this.scene.traverse((o) => { if (o.isLight) o.layers.enable(COUCHE_VENT); });
    this.stats.fixes = fixes.length; this.stats.mobiles = mobiles.length; this.stats.vent = vent.length;
  }
  _estVeloGare(o) {
    for (let p = o; p; p = p.parent) if (this._velosGares.has(p)) return true;
    return false;
  }
  _roulantes() {
    const s = new Set();
    for (const c of this.scene.userData.traffic || []) if (c && c.mesh) s.add(c.mesh);
    return s;
  }
  // Le nombre d'objets du DÉCOR qui projettent une ombre (pas ce qui bouge : joueurs, passants, ballon, vélos — ceux-là
  // sont redessinés à chaque image, ou suivis par la clé des vélos). (05/10 : on comptait tout ce qui est visible ; un
  // passant ou un accessoire qui paraissait ou disparaissait refaisait le cache — six fois en 20 s à La Cage)
  _nombreProjetants() {
    let n = 0;
    const balle = this.scene.userData.ball && this.scene.userData.ball.mesh, roulantes = this._roulantes();
    for (const top of this.scene.children) {
      if (!top.visible || top.userData.dynamique || top === balle || roulantes.has(top)) continue;
      top.traverseVisible((o) => { if (o.castShadow && (o.isMesh || o.isInstancedMesh) && !o.layers.isEnabled(COUCHE)) n++; });
    }
    return n;
  }
  // La clé a-t-elle changé depuis la dernière cuisson ? (06/10/2026 : des nombres, arrondis au millième comme avant,
  // comparés un à un dans deux tableaux gardés — au lieu d'une chaîne d'une vingtaine de nombres refaite à chaque image.
  // L'identité de la carte est celle de sa texture : une WebGLRenderTarget n'a pas d'`id` — la chaîne d'avant y lisait
  // « undefined », toujours égal à lui-même ; un nombre indéfini, lui, ne serait jamais égal.)
  _cleChangee(sun, dt) {
    const s = sun.shadow, c = s.camera, m = s.map;
    this._tCompte -= dt;
    if (this._tCompte <= 0) { this._tCompte = 0.5; this._compte = this._nombreProjetants(); }
    const k = this._k || (this._k = []);
    k.length = 0;
    k.push(m.texture.id, m.width, m.height, sun.position.x, sun.position.y, sun.position.z,
      sun.target.position.x, sun.target.position.y, sun.target.position.z,
      c.left, c.right, c.top, c.bottom, c.near, c.far, c.up.x, c.up.y, c.up.z,
      this.scene.userData.solCuit || 0, this._compte);
    for (const b of this.velos() || []) if (b && b.racine) { const p = b.racine.position; k.push(b.pris ? 1 : 0, p.x, p.z, b.racine.rotation.y); }
    const prec = this._kPrec;
    let change = !prec || prec.length !== k.length;
    for (let i = 0; !change && i < k.length; i++) if (Math.round(k[i] * 1000) !== Math.round(prec[i] * 1000)) change = true;
    if (change) { this._k = prec || []; this._kPrec = k; }
    return change;
  }

  // Avant le rendu de la scène. `actif` : le cache est demandé (voir l'en-tête). `dt` : pour la relecture du décor.
  avant(actif, dt = 0) {
    const r = this.r, sc = this.scene, env = sc.userData.env, sun = env && env.sun;
    this._cuire = false; this._incr = false;
    const ok = actif && sun && sun.castShadow && r.shadowMap.enabled && !sc.userData.ombreSuivie;
    if (!ok) { this.pret = false; this._kPrec = null; return; }
    this.sun = sun;
    const s = sun.shadow;
    // three mettra-t-il la carte à jour à cette image ? (basse : une image sur deux, js/fx.js)
    const maj = (r.shadowMap.autoUpdate || r.shadowMap.needsUpdate) && (s.autoUpdate || s.needsUpdate);
    if (!maj || !s.map) return;                       // (pas encore de carte : three la crée au premier rendu)
    // (la cadence du vent a changé de classe — figé, à part, ou avec les mobiles : le tri et le cache sont à refaire)
    const classe = (c) => (c > 1 ? 2 : c);
    const change = this._cleChangee(sun, dt) || classe(this._cadTriee) !== classe(this.cadVent);
    let ventFrais = false;
    if (!this.pret || change) {
      // CUISSON, À PART (05/10/2026) : le décor seul (mobiles éteints) est dessiné dans la carte par three lui-même
      // (shadowMap.render, sur le seul soleil), copié dans le cache, puis on enchaîne comme d'habitude. Avant, la
      // cuisson se faisait PENDANT le rendu de l'image : à cette image-là, joueurs et ballon n'avaient pas d'ombre — un
      // clignotement à chaque cuisson.
      this._trier();
      for (const o of this.mobiles) o.castShadow = false;
      for (const o of this.vent) o.castShadow = false;
      // (three ne sait dessiner ses cartes d'ombre que dans un rendu : on lui fait rendre la scène vue par une caméra qui
      // ne voit RIEN — profondeur de champ nulle — dans une cible d'un pixel ; seule la passe d'ombre travaille)
      const sm = r.shadowMap, auto = sm.autoUpdate, nu = sm.needsUpdate, fond = sc.background, cible = r.getRenderTarget();
      if (!this._vide) {
        this._vide = { rt: new THREE.WebGLRenderTarget(1, 1), cam: new THREE.PerspectiveCamera(1, 1, 0.001, 0.0011) };
      }
      const V = this._vide; if (this.camera) V.cam.layers.mask = this.camera.layers.mask;
      V.cam.position.set(0, -1000, 0); V.cam.lookAt(0, -2000, 0); V.cam.updateMatrixWorld();
      try { sm.autoUpdate = true; sc.background = null; r.setRenderTarget(V.rt); r.render(sc, V.cam); }
      finally {
        sm.autoUpdate = auto; sm.needsUpdate = nu; sc.background = fond; r.setRenderTarget(cible);
        for (const o of this.mobiles) o.castShadow = true;
        for (const o of this.vent) o.castShadow = true;
      }
      this.cache = this._copierVersCache(s.map, this.cache);
      this.pret = true; this.stats.cuissons++;
      this._iVent = 0;                                // (le second étage est à refaire tout de suite)
    }
    // LE SECOND ÉTAGE : toutes les `cadVent` images, le décor fixe recopié dans la carte, les seuls feuillages au vent
    // dessinés par-dessus (même rendu « à vide » que la cuisson, sans effacer la carte), puis le tout gardé dans cacheVent.
    // La carte contient alors déjà décor + feuillages : à cette image-là, pas de seconde recopie.
    if (this.vent.length && this.cadVent > 1 && (this._iVent++ % this.cadVent) === 0) {
      this._recopier(s.map, this.cache);
      const sm = r.shadowMap, auto = sm.autoUpdate, nu = sm.needsUpdate, fond = sc.background, cible = r.getRenderTarget(), maj = sc.matrixWorldAutoUpdate;
      const V = this._vide, masque = V.cam.layers.mask;
      this._incr = true;                              // (three n'efface pas la carte : voir r.clear dans le constructeur)
      // (les feuillages ne bougent que dans leur shader : leurs matrices sont celles de l'image d'avant, rien à recalculer ;
      // la caméra à vide ne voit que la couche du second étage : feuillages au vent et lumières)
      try { V.cam.layers.set(COUCHE_VENT); sm.autoUpdate = true; sc.background = null; sc.matrixWorldAutoUpdate = false; r.setRenderTarget(V.rt); r.render(sc, V.cam); }
      finally {
        this._incr = false; V.cam.layers.mask = masque;
        sm.autoUpdate = auto; sm.needsUpdate = nu; sc.background = fond; sc.matrixWorldAutoUpdate = maj; r.setRenderTarget(cible);
      }
      this.cacheVent = this._copierVersCache(s.map, this.cacheVent);
      this.stats.ventes++;
      ventFrais = true;
    }
    // INCRÉMENTAL : la copie du décor dans la carte, puis three n'y ajoute que les mobiles
    // (06/10/2026 : essayé, une copie par blitFramebuffer — couleur et profondeur sans shader : carte identique à l'octet
    // près, mais 2,97 ms contre 1,80 pour ce quad, mesurées à la carte graphique sur la Radeon intégrée en 3072² ; on
    // garde le quad)
    const etage2 = !!(this.vent.length && this.cadVent > 1 && this.cacheVent);
    if (!ventFrais) this._recopier(s.map, etage2 ? this.cacheVent : this.cache);
    for (const o of this.fixes) o.castShadow = false;
    if (etage2) for (const o of this.vent) o.castShadow = false;
    this._ventCoupe = etage2;
    this._incr = true;
  }

  // la copie (couleur ET profondeur) d'un étage du cache dans la carte d'ombre
  _recopier(carte, src) {
    const r = this.r, avant = r.getRenderTarget(), ac = r.autoClear;
    this.quadProf.material.uniforms.tCache.value = src.texture;
    r.autoClear = false; r.setRenderTarget(carte);
    this.quadProf.render(r);
    r.setRenderTarget(avant); r.autoClear = ac;
  }

  // Après le rendu de la scène (la carte d'ombre est faite).
  apres() {
    if (this._incr) {
      this._incr = false;
      for (const o of this.fixes) o.castShadow = true;
      if (this._ventCoupe) { this._ventCoupe = false; for (const o of this.vent) o.castShadow = true; }
    }
  }

  // la carte d'ombre `m` copiée dans `cible` (refaite à sa taille au besoin) : rend la cible
  _copierVersCache(m, cible) {
    const r = this.r;
    if (!cible || cible.width !== m.width || cible.height !== m.height) {
      if (cible) cible.dispose();
      cible = new THREE.WebGLRenderTarget(m.width, m.height, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: false });
    }
    const avant = r.getRenderTarget(), ac = r.autoClear;
    this.quadCopie.material.uniforms.tCache.value = m.texture;
    r.autoClear = false; r.setRenderTarget(cible);
    this.quadCopie.render(r);
    r.setRenderTarget(avant); r.autoClear = ac;
    return cible;
  }
}
