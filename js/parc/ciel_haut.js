// =====================================================================
//  LA SECONDE CARTE D'ENVIRONNEMENT : « TERRAIN DÉGAGÉ » POUR LE HAUT DU PARC (lot C5 du chantier « parc complet »)
// =====================================================================
// La lumière du ciel du parc est une vraie photo HDR (js/court.js carteHDR, assets/parc/ciel_berge.hdr), PRÉPARÉE pour
// le plateau : le plateau est un fond de cuvette, cerné d'arbres jusqu'à 30-45° au-dessus de l'horizon (le pin, les
// platanes, le rideau du quai). Sous 32° (`arbres.haut`), la photo devient un feuillage sombre (preparerHDR). C'est ce
// qui donne au plateau ses haies sombres et son enrobé gris, calés sur les photos.
//
// Le HAUT DU PARC n'est pas une cuvette : la perspective, ses parterres et ses allées de gravier (zone Z13), le
// belvédère, la boucle des jeux, sont des terrasses DÉGAGÉES, au niveau des couronnes du coteau ; le ciel y descend
// jusqu'à 10-15° de l'horizon (photos 1, 7 et 8 ; sphère S1 de 2018). Avec la carte du plateau, ils recevaient la
// lumière d'un fond de cuvette. La conception (§ 3.7) prévoyait une seconde préparation, `arbres.haut = 12`, sur la
// terrasse haute, avec un fondu de 20 m : la voici.
//
// COMMENT, SANS RIEN RECOMPILER. three compile chaque matériau pour UNE carte d'environnement (sa taille). On ne change
// donc pas de carte : on la RÉÉCRIT EN PLACE (la cible que js/court.js garde, `sortie`), comme js/court.js le fait déjà
// pour désaturer la carte prise sur place (desaturerCarte). Trois cartes filtrées de même taille : celle du plateau
// (copiée une fois à son arrivée, `base`), celle du terrain dégagé (préparée ici, filtrée une fois), et la carte du jeu,
// qui reçoit leur mélange : mix(base, dégagée, f), deux passes plein cadre sur la carte filtrée (moins d'un dixième de
// milliseconde), refaites seulement quand f a bougé de plus de 1/50.
//
// f, LE FONDU (repère du terrain 1) : 0 sur le plateau, le coteau et tout le bas du parc ; il monte de 0 à 1 sur les
// 20 m qui suivent la crête vers l'ouest (x de -55 à -75), là où le sol est au niveau haut (+9 et plus). En match, au
// plateau, la carte est celle d'avant le lot, à l'octet près.
//
// MESURÉ AVANT / APRÈS en PV09 (préréglage haute, beau temps ; luminance sRGB, contre les couleurs relevées dans
// tools/parc/references_gmaps/SYNTHESE.md, fiche Z13) : le gravier des allées passe de 176 à 189 (#c8bca6 : 189), sa
// couleur de (183, 176, 160) à (196, 188, 173) pour (200, 188, 166) ; les boules de buis de 35 et 30 à 53 et 51
// (#2f4a26 : 66) ; la haie basse de 48 à 70 ; le ciel affiché ne bouge pas. Tout se rapproche des relevés : la carte est
// gardée, sans réglage dans l'écran Options (c'est la lumière du lieu, pas un choix).
//
// Mesures et essais (?debug=1) : window.__cielHaut — .f (le fondu en cours), .forcer(0 | 1 | null).
import * as THREE from 'three';
import { Monde } from '../monde.js';
import { MOBILE } from '../monde_charge.js';

const HAUT_DEGAGE = 12;                 // degrés : sous cette hauteur, le feuillage sombre (32 au plateau)
const CRETE = -55, FONDU = 20;          // x de la crête, longueur du fondu vers l'ouest (m)
const SOL_HAUT = [7, 9.5];              // le niveau haut : le fondu ne vaut que là où le sol monte de +7 à +9,5
const PAS_F = 0.02;                     // on ne refait le mélange que si f a bougé d'au moins autant

let _melange = null;
function atelierMelange() {
  if (_melange) return _melange;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uA: { value: null }, uB: { value: null }, uF: { value: 0 }, uTaille: { value: new THREE.Vector2() } },
    vertexShader: 'void main() { gl_Position = vec4( position.xy, 0.0, 1.0 ); }',
    // (lu au centre exact de chaque texel : la copie est exacte, quel que soit le filtrage)
    fragmentShader: `uniform sampler2D uA; uniform sampler2D uB; uniform float uF; uniform vec2 uTaille;
      void main() {
        vec2 uv = gl_FragCoord.xy / uTaille;
        gl_FragColor = mix( texture2D( uA, uv ), texture2D( uB, uv ), uF );
      }`,
    depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
  const sc = new THREE.Scene(); sc.add(quad);
  _melange = { mat, sc, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  return _melange;
}

export class CielHaut {
  constructor({ scene, renderer, dx = 0 }) {
    this.scene = scene; this.r = renderer; this.dx = dx;
    this.f = 0; this.fEcrit = 0; this.force = null;
    this.sortie = null; this.base = null; this.degagee = null; this.enCours = false; this.echec = false;
    this.maj = (dt, camera) => this._maj(camera);
    if (typeof window !== 'undefined') window.__cielHaut = this;
  }

  forcer(v) { this.force = v === null || v === undefined ? null : Math.max(0, Math.min(1, +v)); return this.force; }

  _maj(camera) {
    const env = this.scene.userData.envTerrain;
    if (!env || !env.photo || !env.sortie || this.echec || !this.r || !camera) return;
    // la carte du plateau vient d'arriver (ou a été refaite) : on la copie, puis on prépare la carte dégagée
    if (env.sortie !== this.sortie) {
      this.sortie = env.sortie; this.fEcrit = 0;
      this._copierBase();
      if (!this.degagee && !this.enCours) this._preparer();
    }
    if (!this.degagee) return;
    const x = camera.position.x - this.dx, z = camera.position.z;
    let f = this.force;
    if (f === null) {
      const t = Math.min(1, Math.max(0, (CRETE - x) / FONDU)), ys = Monde.sol(camera.position.x, z);
      const h = Math.min(1, Math.max(0, (ys - SOL_HAUT[0]) / (SOL_HAUT[1] - SOL_HAUT[0])));
      f = t * t * (3 - 2 * t) * h * h * (3 - 2 * h);
    }
    this.f = f;
    if (Math.abs(f - this.fEcrit) < PAS_F && !(f === 0 && this.fEcrit !== 0) && !(f === 1 && this.fEcrit !== 1)) return;
    this._melanger(f);
  }

  // Une cible de la taille de la carte (copie exacte, sans mipmaps : on la lit texel à texel)
  _cible() {
    const S = this.sortie;
    return new THREE.WebGLRenderTarget(S.width, S.height, { type: S.texture.type, format: S.texture.format, depthBuffer: false,
      generateMipmaps: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  }
  _passe(src, srcB, f, cible) {
    const r = this.r, M = atelierMelange(), u = M.mat.uniforms, avant = r.getRenderTarget(), auto = r.autoClear;
    // (PMREMGenerator laisse sa cible sur la dernière fenêtre de flou, ciseaux allumés : on la rouvre en entier)
    cible.viewport.set(0, 0, cible.width, cible.height); cible.scissor.set(0, 0, cible.width, cible.height); cible.scissorTest = false;
    r.autoClear = false;
    u.uTaille.value.set(cible.width, cible.height); u.uA.value = src; u.uB.value = srcB || src; u.uF.value = f;
    r.setRenderTarget(cible); r.render(M.sc, M.cam);
    u.uA.value = null; u.uB.value = null;
    r.setRenderTarget(avant); r.autoClear = auto;
  }
  _copierBase() {
    if (this.base && (this.base.width !== this.sortie.width || this.base.height !== this.sortie.height)) { this.base.dispose(); this.base = null; }
    if (!this.base) this.base = this._cible();
    this._passe(this.sortie.texture, null, 0, this.base);
  }
  _melanger(f) {
    // (deux passes : le mélange dans une cible d'appoint, puis recopié dans la carte, qui doit rester le même objet)
    if (!this.appoint) this.appoint = this._cible();
    this._passe(this.base.texture, this.degagee.texture, f, this.appoint);
    this._passe(this.appoint.texture, null, 0, this.sortie);
    this.fEcrit = f;
  }

  // La seconde préparation : la même photo, le même réglage (balance des blancs, rotation, couleur du feuillage), le
  // feuillage sombre ramené à 12° ; filtrée une fois, à la taille de la carte du plateau.
  _preparer() {
    const lum = this.scene.userData.lumiere, def = lum && lum.env;
    if (!def) { this.echec = true; return; }
    this.enCours = true;
    // (js/court.js chargé à la demande : il importe lui-même js/parc/index.js, qui importe ce module)
    // (relecture du lot C5 : les trois étapes lourdes — décoder la photo, la préparer, la filtrer — sont faites chacune
    // dans sa propre image, et non d'un bloc : mesuré d'un bloc, une tâche de plus d'une demi-seconde sur la machine de
    // test chargée, juste après celle de la carte du plateau)
    const image = () => new Promise((ok) => { requestAnimationFrame(() => setTimeout(ok, 0)); setTimeout(ok, 250); });
    let preparerHDR = null;
    import('../court.js')
      .then((c) => { preparerHDR = c.preparerHDR; return import('three/addons/loaders/RGBELoader.js'); })
      .then(({ RGBELoader }) => new RGBELoader().loadAsync(def.url))
      .then((tex) => image().then(() => tex))
      .then((tex) => {
        const large = MOBILE ? 512 : 1024;
        preparerHDR(tex, { ...def, arbres: { ...def.arbres, haut: HAUT_DEGAGE } }, Math.max(1, Math.round(tex.image.width / large)));
        return image().then(() => tex);
      })
      .then((tex) => {
        const pmrem = new THREE.PMREMGenerator(this.r);
        const rt = pmrem.fromEquirectangular(tex);
        pmrem.dispose(); tex.dispose();
        if (rt.width !== this.sortie.width || rt.height !== this.sortie.height) {
          rt.dispose(); this.echec = true;
          console.warn('[parc] carte « terrain dégagé » : taille différente de la carte du plateau, abandonnée');
          return;
        }
        this.degagee = rt;
      })
      .catch((e) => { this.echec = true; console.warn('[parc] carte « terrain dégagé » indisponible :', e && e.message); })
      .finally(() => { this.enCours = false; });
  }
}
