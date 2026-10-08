// Portraits des personnages. Dans la collection et dans les vœux on ne voyait que des prénoms : on ne savait pas à
// quoi ressemblait le personnage qu'on venait de tirer.
//
// Plutôt que d'ajouter onze images à la main, on rend le VRAI avatar 3D du jeu dans un petit rendu hors écran :
// cadrage buste, lumière de studio, fond transparent. Le résultat est mis en cache dans localStorage, donc le coût
// n'est payé qu'une fois par personnage et par machine ; ensuite c'est une image instantanée.
//
// Les fiches sans avatar 3D (les joueurs fictifs) reçoivent une vignette dessinée : initiale sur fond dégradé aux
// couleurs du joueur. Personne ne se retrouve avec un carré vide.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { NUAGES } from './nuages.js';
import { urlAvatar } from './player.js';

const KEY = 'hoops.portraits.v1';
const TAILLE = 192;

let cache = {};
try { cache = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { cache = {}; }

let rendu = null;     // le petit renderer, créé à la première demande et gardé
// LE PETIT RENDU EST RENDU (06/10/2026). C'est un SECOND contexte WebGL : sur iPhone, Safari n'en tolère que quelques-uns
// et, à court de mémoire, retire celui qu'il veut — parfois celui du jeu. prechauffer() le libérait à la fin, mais un
// portrait demandé seul le gardait ouvert pour toute la session. Il est libéré 3 s après le dernier portrait (jamais
// pendant qu'un portrait se fait : `enCours`).
let tLiberer = null, enCours = 0;
function liberer() {
  clearTimeout(tLiberer); tLiberer = null;
  if (rendu && !enCours) { rendu.renderer.dispose(); rendu.renderer.forceContextLoss?.(); rendu = null; }
}
function libererBientot() { clearTimeout(tLiberer); tLiberer = setTimeout(liberer, 3000); }
function atelier() {
  clearTimeout(tLiberer); tLiberer = null;
  if (rendu) return rendu;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(TAILLE, TAILLE);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  // lumière de studio : une clé chaude devant-droite, un remplissage froid derrière-gauche, un contre-jour
  scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x40464f, 1.35));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.5); key.position.set(1.4, 2.2, 2.6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xbfd4ff, 1.0); fill.position.set(-2.2, 1.2, -1.4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.5); rim.position.set(-0.6, 1.6, -2.4); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(26, 1, 0.05, 20);
  rendu = { renderer, scene, cam, loader: new GLTFLoader() };
  return rendu;
}

// Vignette de secours : initiale sur un dégradé aux couleurs du joueur.
function vignette(def) {
  const c = document.createElement('canvas');
  c.width = c.height = TAILLE;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, TAILLE, TAILLE);
  grd.addColorStop(0, def.color1 || '#444'); grd.addColorStop(1, def.color2 || '#111');
  g.fillStyle = grd; g.fillRect(0, 0, TAILLE, TAILLE);
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, TAILLE * 0.62, TAILLE, TAILLE * 0.38);
  g.font = `bold ${Math.round(TAILLE * 0.46)}px Inter, system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,255,255,.92)';
  g.fillText((def.name || '?')[0].toUpperCase(), TAILLE / 2, TAILLE * 0.46);
  return c.toDataURL('image/png');
}

// Rend le buste d'un avatar GLB. Renvoie une image en data URL, ou null si le modèle ne charge pas.
async function rendreAvatar(def) {
  const { renderer, scene, cam, loader } = atelier();
  let gltf;
  // (sur téléphone, l'avatar allégé : une vignette de quelques pixels n'a pas besoin des textures en 1024)
  try { gltf = await loader.loadAsync(urlAvatar(def.model)).catch(() => loader.loadAsync(def.model)); } catch (e) { return null; }
  const model = gltf.scene;
  scene.add(model);
  model.updateMatrixWorld(true);

  // On cadre sur la tête : on la trouve par l'os, sinon par le haut de la boîte englobante.
  let tete = null;
  model.traverse((o) => { if (o.isBone && /(^|:)Head$/.test(o.name)) tete = o; });
  const cible = new THREE.Vector3();
  if (tete) tete.getWorldPosition(cible);
  else { const b = new THREE.Box3().setFromObject(model); cible.set((b.min.x + b.max.x) / 2, b.max.y - 0.16, (b.min.z + b.max.z) / 2); }

  cam.position.set(cible.x + 0.30, cible.y + 0.05, cible.z + 1.28);
  cam.lookAt(cible.x, cible.y - 0.06, cible.z);
  cam.updateProjectionMatrix();
  // pas d'ombre de nuage sur un portrait : il resterait à moitié à l'ombre dans le cache
  const nu = NUAGES[3]; NUAGES[3] = 0;
  renderer.render(scene, cam);
  NUAGES[3] = nu;
  const url = renderer.domElement.toDataURL('image/webp', 0.86);
  scene.remove(model);
  // on libère : onze avatars en mémoire vive pour rien, ce serait 40 Mo
  model.traverse((o) => {
    if (o.isMesh) {
      o.geometry?.dispose?.();
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) { if (!m) continue; m.map?.dispose?.(); m.normalMap?.dispose?.(); m.dispose?.(); }
    }
  });
  return url;
}

// Portrait d'un personnage : depuis le cache, sinon rendu puis mis en cache.
export async function portrait(def) {
  if (cache[def.id]) return cache[def.id];
  let url = null;
  if (def.model) { enCours++; try { url = await rendreAvatar(def); } finally { enCours--; libererBientot(); } }
  cache[def.id] = url || vignette(def);
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { /* quota : on garde en mémoire */ }
  return cache[def.id];
}

// Portrait déjà connu, sans rien déclencher (pour un rendu synchrone).
export const portraitCache = (id) => cache[id] || null;

// Prépare tous les portraits en tâche de fond, un par un pour ne pas bloquer l'affichage.
// `onOne` est appelé après chaque portrait prêt, ce qui permet de redessiner l'écran au fur et à mesure.
export async function prechauffer(roster, onOne) {
  for (const def of roster) {
    if (cache[def.id]) { onOne?.(def.id); continue; }
    await portrait(def);
    onOne?.(def.id);
    await new Promise((r) => setTimeout(r, 0));    // on rend la main entre deux rendus
  }
  liberer();
}

export function viderCache() {
  cache = {};
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}
