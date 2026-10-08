// js/headwear.js — COIFFURES ET COUVRE-CHEFS, sans un seul fichier 3D en plus.
//
// Recolorer le mesh `avaturn_hair_0` par le canal `hair` deja cable (js/player.js:175) ne donne que des
// COULEURS de cheveux : la coupe, elle, est figee dans le GLB du personnage. Pour de vraies coiffures il
// faut de la geometrie — mais pas forcement un fichier : casquette, bandeau, bonnet et serre-tete se
// montent en primitives Three.js en une quinzaine de lignes chacun.
//
// Accrochage : les dix avatars partagent EXACTEMENT les 52 memes os, sans prefixe mixamorig. `Head` est
// un Object3D ordinaire, .add() dessus fonctionne, et le renderer met a jour les enfants d'os dans
// scene.updateMatrixWorld : cout par image ZERO (contrairement au ballon, qui est suivi par lecture de
// position monde chaque image, js/player.js:646-651).
//
// Echelle : l'accessoire herite de root.scale = h/2 puis de model.scale = 2/modelHeight, soit exactement
// player.avatarScale. Il doit donc etre modelise en unites du MODELE (rig d'environ 1,84 m), pas en
// metres du monde.
import * as THREE from 'three';

// ---------------------------------------------------------------- mesure du crane
// On lit la boite englobante du mesh de CHEVEUX : elle est en pose de liaison et en espace du modele
// (les noeuds de mesh des GLB ont une matrice monde identite), donc directement exploitable.
// Reperes mesures : haythem cheveux y 1,590..1,843 x +/-0,082 ; titouan 1,629..1,864 ; djafar 1,693..1,883.
function crane(model) {
  const b = new THREE.Box3();
  let trouve = false;
  model.traverse((o) => {
    if (!o.isMesh || !/hair/i.test((o.material && o.material.name) || o.name || '')) return;
    o.geometry.computeBoundingBox();                       // GLTFLoader ne la remplit pas
    b.union(o.geometry.boundingBox); trouve = true;
  });
  if (!trouve) return null;
  return { cx: (b.min.x + b.max.x) / 2, cz: (b.min.z + b.max.z) / 2,
           bas: b.min.y, haut: b.max.y, r: Math.max(0.075, (b.max.x - b.min.x) / 2) };
}

// ---------------------------------------------------------------- pieces
function anneau(rInt, epais, haut, mat) {
  const g = new THREE.CylinderGeometry(rInt + epais, rInt + epais, haut, 22, 1, true);
  return new THREE.Mesh(g, mat);
}
function calotte(r, mat, ouverture = 0.52) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 22, 14, 0, Math.PI * 2, 0, Math.PI * ouverture), mat);
}

// Construit l'accessoire EN ESPACE MODELE (metres du rig), puis on le bascule dans l'os.
function monter(def, ck) {
  const g = new THREE.Group();
  // DoubleSide des la CREATION, pour les deux. La calotte d'une casquette est une demi-sphere ouverte par
  // en dessous : en FrontSide on voit au travers par le bas, et `cache: true` vient justement de supprimer
  // les cheveux qui bouchaient le trou. Le regler apres coup sur `mat2` mutait un materiau PARTAGE par le
  // bord, le bouton et la visiere.
  const opt = { roughness: 0.82, metalness: 0.02, side: THREE.DoubleSide };
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(def.couleur || '#222'), ...opt });
  const mat2 = new THREE.MeshStandardMaterial({ color: new THREE.Color(def.accent || def.couleur || '#fff'), ...opt, roughness: 0.8 });
  const r = ck.r, cx = ck.cx, cz = ck.cz;

  if (def.forme === 'bandeau') {
    const h = 0.030 * (def.epais || 1);
    const a = anneau(r * 0.99, 0.006, h, mat);
    a.position.set(cx, ck.haut - (ck.haut - ck.bas) * 0.30, cz);
    g.add(a);
    // un lisere a l'avant, pour que ce ne soit pas un simple tube de couleur
    const l = anneau(r * 0.99, 0.009, h * 0.28, mat2);
    l.position.set(cx, a.position.y + h * 0.30, cz);
    g.add(l);
  } else if (def.forme === 'bonnet') {
    const c = calotte(r * 1.12, mat, 0.56);
    c.position.set(cx, ck.haut - r * 0.62, cz);
    g.add(c);
    const rev = anneau(r * 1.10, 0.008, 0.042, mat2);
    rev.position.set(cx, ck.haut - r * 0.62 + 0.004, cz);
    g.add(rev);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(r * 0.30, 12, 10), mat2);
    pom.position.set(cx, ck.haut - r * 0.62 + r * 1.12 + r * 0.10, cz);
    g.add(pom);
  } else if (def.forme === 'durag') {
    const c = calotte(r * 1.06, mat, 0.58);
    c.position.set(cx, ck.haut - r * 0.66, cz);
    c.scale.set(1, 0.92, 1.06);
    g.add(c);
    // les deux pans, derriere la tete
    for (const s of [-1, 1]) {
      const pan = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.20, 0.010), mat2);
      pan.position.set(cx + s * 0.028, ck.haut - r * 1.35, cz - r * 1.02);
      pan.rotation.x = -0.22; pan.rotation.z = s * 0.12;
      g.add(pan);
    }
  } else if (def.forme === 'casquette') {
    const sgn = def.envers ? -1 : 1;
    const c = calotte(r * 1.10, mat, 0.52);
    c.position.set(cx, ck.haut - r * 0.60, cz);
    c.scale.set(1, 0.88, 1.04);
    g.add(c);
    const bord = anneau(r * 1.08, 0.008, 0.024, mat);
    bord.position.set(cx, ck.haut - r * 0.60 + 0.008, cz);
    g.add(bord);
    // visiere : demi-disque aplati, devant (ou derriere si a l'envers)
    const v = new THREE.Mesh(new THREE.CircleGeometry(r * 1.18, 20, Math.PI, Math.PI), mat2);
    v.rotation.x = -Math.PI / 2 + 0.16 * sgn;
    v.rotation.z = def.envers ? Math.PI : 0;
    v.position.set(cx, ck.haut - r * 0.58, cz + sgn * r * 0.34);
    v.material = mat2;    // deja en DoubleSide : ne le remets pas ici, tu muterais le materiau partage
    g.add(v);
    const bouton = new THREE.Mesh(new THREE.SphereGeometry(r * 0.10, 10, 8), mat2);
    bouton.position.set(cx, ck.haut - r * 0.60 + r * 1.10 * 0.88, cz);
    g.add(bouton);
  }
  return g;
}

// ---------------------------------------------------------------- pose sur l'os
const _mm = new THREE.Matrix4();
// Retire l'accessoire precedent, pose le nouveau, cache ou non les cheveux.
// `rig` = AvatarRig, `model` = l'avatar GLB du joueur.
export function poserCoiffure(model, rig, def) {
  if (!model) return null;
  // 1) on enleve l'ancien
  const vieux = model.userData.cageCoif;
  if (vieux) {
    // Un seul dispose par MATERIAU : les trois ou quatre meshes d'un couvre-chef partagent deux materiaux,
    // et disposer deux fois le meme jette un avertissement WebGL a chaque changement d'article.
    vieux.removeFromParent();
    const vus = new Set();
    vieux.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      if (o.material && !vus.has(o.material)) { vus.add(o.material); o.material.dispose(); }
    });
    model.userData.cageCoif = null;
  }
  // 2) cheveux d'origine visibles ou non
  model.traverse((o) => { if (o.isMesh && /hair/i.test((o.material && o.material.name) || '')) o.visible = !(def && def.cache); });
  if (!def || !def.forme) return null;

  const tete = rig && rig.bone('Head');
  const ck = crane(model);
  if (!tete || !ck) return null;
  const g = monter(def, ck);

  // 3) espace MODELE -> espace de l'os Head, dans la POSE DE LIAISON : on passe par boneInverses,
  //    donc le resultat est juste meme si on equipe la casquette pendant un dunk.
  let sk = null, idx = -1;
  model.traverse((o) => { if (!sk && o.isSkinnedMesh && o.skeleton) { const i = o.skeleton.bones.indexOf(tete); if (i >= 0) { sk = o.skeleton; idx = i; } } });
  if (sk) g.applyMatrix4(_mm.copy(sk.boneInverses[idx]));   // boneInverses = monde -> os, en pose de liaison

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  tete.add(g);
  model.userData.cageCoif = g;
  return g;
}
