// Le marchand : PNJ de la balade libre, debout devant la haie à gauche du platane (côté opposé à la rue), sans étal.
// Il s'appelle Pierrick et porte son maillot de foot. Son avatar 3D (assets/marchand.glb, export Avaturn au squelette
// Mixamo comme les joueurs) remplace le bonhomme en primitives et joue les animations d'attente ; si le GLB ne charge
// pas, le bonhomme en primitives (tablier crème, « € ») reprend sa place tout seul.
import * as THREE from 'three';

export const MERCHANT = {
  x: -8.4, z: 5.8, facing: new THREE.Vector3(1, 0, 0), reach: 2.4,   // à gauche du platane (-8.9, 4.2) vu du terrain
  model: 'assets/marchand.glb',
  modelHeight: 1.838,       // hauteur réelle du GLB (m), mesurée sur sa boîte englobante : sert au ratio d'échelle
};

export const MERCHANT_DEF = {
  id: 'marchand', name: 'Pierrick', pos: 'Marchand', number: '€', height: 1.73, style: 'Nourriture et skins',
  spd: 50, hdl: 50, in: 50, mid: 50, tp: 50, dnk: 50, def: 50, color1: '#f3e7cf', color2: '#3b2f2f', skin: '#c68642',
};

// Charge le modèle 3D du marchand (sinon on garde le bonhomme). UN MODÈLE PAR TERRAIN : le marchand d'un autre
// terrain n'est pas Pierrick (règle de l'auteur, js/game.js) — un terrain qui a SON personnage le déclare dans ses
// repères (`reperes.marchand.modele = { url, hauteur }`, la hauteur du GLB relevée sur sa boîte englobante), et
// il arrive ici. Sans rien, c'est Pierrick (assets/marchand.glb), le marchand de La Cage.
export function probeMerchantModel(player, url = MERCHANT.model, hauteur = MERCHANT.modelHeight) {
  if (!url) return;
  player.avatarUrl = url; player._loadAvatar(url, hauteur);
}

// repère « 🪙 PIERRICK » qui flotte au-dessus de sa tête (visible en balade seulement). Le nom vient du terrain
// (`m.nom`, celui de son marchand) : pas de « PIERRICK » au-dessus de quelqu'un d'autre.
export function buildMerchantMarker(scene, m = MERCHANT) {
  const g = new THREE.Group(); g.position.set(m.x, 0, m.z); scene.add(g);
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const ctx = c.getContext('2d');
  // « PIERRICK » fait deux lettres de plus que « PIERRE », et la police de secours (Arial Black) est bien
  // plus large qu'Impact : selon la machine, le texte pouvait deborder du canevas et se retrouver rogne.
  // On le MESURE et on reduit le corps juste ce qu'il faut — un nom plus long s'ecrit un peu plus petit,
  // comme sur un vrai maillot.
  const LIBELLE = '🪙 ' + (m.nom || MERCHANT_DEF.name).toUpperCase(), MARGE = 24;
  let corps = 64;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 8; i++) {
    ctx.font = `bold ${corps}px Impact, "Arial Black", sans-serif`;
    if (ctx.measureText(LIBELLE).width <= c.width - 2 * MARGE) break;
    corps -= 4;
  }
  ctx.shadowColor = '#000'; ctx.shadowBlur = 12; ctx.fillStyle = '#ffb347'; ctx.fillText(LIBELLE, 256, 66);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); tag.scale.set(1.9, 0.48, 1); tag.position.set(0, 2.45, 0); g.add(tag);
  g.userData.tag = tag;
  return g;
}
