import * as THREE from 'three';
import { COURT, HOOPS } from './config.js';

// Paniers sous forme de Vector3 (avec .sgn) : HOOP_VEC[0] côté z<0, HOOP_VEC[1] côté z>0
export const HOOP_VEC = HOOPS.map((h) => Object.assign(new THREE.Vector3(h.x, h.y, h.z), { sgn: h.sgn }));
export const ZERO = new THREE.Vector3(0, 0, 0);

export function hdist(a, b) {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
// facteur de lissage indépendant du framerate
export function damp(rate, dt) { return 1 - Math.exp(-rate * dt); }

// Position derrière la ligne à 3 points du panier `hoop` ?
export function isThree(p, hoop) {
  const lz = (p.z - hoop.z) * -hoop.sgn;                       // distance "vers le milieu du terrain"
  const cornerLen = Math.abs(COURT.HOOP_Z) - Math.abs(COURT.CORNER_Z); // 2,975 m de ligne droite
  if (lz <= cornerLen) return Math.abs(p.x) > COURT.CORNER_X;
  return hdist(p, hoop) > COURT.THREE_R;
}

// SORTIR LA BALLE (demi-terrain, js/game.js majSortie) : la même ligne que isThree, mais franchie d'au moins `marge`
// mètres. Un pied posé SUR la ligne ne compte pas : on veut voir le porteur vraiment dehors.
export function horsArc(p, hoop, marge = 0.25) {
  const lz = (p.z - hoop.z) * -hoop.sgn;
  const cornerLen = Math.abs(COURT.HOOP_Z) - Math.abs(COURT.CORNER_Z);
  if (lz <= cornerLen) return Math.abs(p.x) > COURT.CORNER_X + marge;
  return hdist(p, hoop) > COURT.THREE_R + marge;
}

// Recolore une texture en gardant ses nuances : on repeint la teinte (composite « color ») sans toucher aux
// ombres. `lift` eclaircit d'abord, sinon un tissu presque noir reste presque noir quelle que soit la teinte.
// Le resultat est mis en cache par (teinte, lift) sur la texture d'origine : un skin ne recalcule rien.
export function recolorTexture(tex, hex, lift = 0) {
  const img = tex && tex.image;
  if (!img || !img.width) return null;
  const cle = hex + '|' + lift;
  tex.userData.recolored = tex.userData.recolored || {};
  if (tex.userData.recolored[cle]) return tex.userData.recolored[cle];
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  try { g.drawImage(img, 0, 0); } catch (e) { return null; }
  if (lift > 0) { g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,255,255,${Math.min(0.95, lift)})`; g.fillRect(0, 0, c.width, c.height); }
  g.globalCompositeOperation = 'color'; g.fillStyle = hex; g.fillRect(0, 0, c.width, c.height);
  // « color » et « lighter » se composent en source-over : un fillRect opaque ECRASE la transparence, et
  // un pixel vide ressort plein. Les cheveux sont faits de cartes decoupees a l'alpha — huit avatars sur
  // neuf — donc toute teinte appliquee aux cheveux transformait la coupe en casque. `destination-in`
  // remultiplie le resultat par l'alpha de la source : deux lignes, et aucun effet sur l'opaque.
  g.globalCompositeOperation = 'destination-in';
  try { g.drawImage(img, 0, 0); } catch (e) { /* image non lisible : on garde le resultat opaque */ }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = tex.colorSpace; t.flipY = tex.flipY; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT;
  t.needsUpdate = true;
  return (tex.userData.recolored[cle] = t);
}
