// js/fit.js — VRAIES TENUES (survetements, maillots, sweats) sans le moindre fichier 3D en plus.
//
// Le probleme : les dix avatars n'ont PAS le meme vetement. Le mesh « avaturn_look_0 » existe en SIX
// geometries differentes (784 a 4654 sommets) et chacune a son propre depliage UV. Un motif dessine une
// fois en espace UV tomberait donc au hasard d'un personnage a l'autre. Et la recoloration existante
// (js/util.js recolorTexture, composite « color ») ne sait teinter qu'un atlas EN BLOC : d'ou des tenues
// qui sont des aplats de couleur.
//
// La solution : on peint le motif dans l'ESPACE DU MODELE, pas dans l'espace UV. Trois reperes suffisent,
// et tous les trois sont communs aux dix avatars :
//   1. `position` (attribut brut) = la POSE DE LIAISON (T-pose), en metres du rig, Y vers le haut.
//      Dans le vertex shader de three r170, <begin_vertex> est place AVANT <skinning_vertex> : `position`
//      n'a donc pas encore ete deforme par le squelette. Le motif est « peint sur le tissu » et suit le
//      corps pendant toute l'animation au lieu de flotter dans la scene.
//   2. la NORMALE de liaison (capturee a <beginnormal_vertex>, avant <skinnormal_vertex>) : elle dit sur
//      QUELLE FACE du vetement on est. La face exterieure d'une jambe a une normale le long de X et du
//      meme signe que X. Aucune mesure de largeur n'est necessaire, donc aucune calibration par avatar.
//   3. les POIDS D'OS : ils disent sur quel MEMBRE on est. Indispensable, parce qu'en T-pose l'axe X ne
//      mesure pas la largeur du corps mais la MANCHE (lamine va a +/-0,73 m, titouan a +/-0,20 m) : une
//      bande pilotee par x brut partirait le long des bras.
//
// Les hauteurs sont normalisees par le SQUELETTE (hanche, poitrine, cou) et non par la boite englobante,
// pour la meme raison. Les reperes sont lus dans skeleton.boneInverses, donc dans la pose de liaison
// exacte et independamment de l'animation en cours.
//
// Cout : un seul programme GLSL pour toutes les tenues (uniformes uniquement, cle de cache constante),
// zero octet d'APK, zero canvas 1024x1024 en memoire, zero cout par image.
import * as THREE from 'three';

// ---------------------------------------------------------------- masque de membre (par geometrie)
// Les 52 os portent les memes NOMS sur les dix avatars, mais pas forcement les memes indices : on lit
// donc skeleton.bones plutot que de coder des numeros en dur.
const OS_BRAS = /^(Left|Right)(Shoulder|Arm|ForeArm|Hand)/;
const OS_JAMBE = /^(Left|Right)(UpLeg|Leg|Foot|ToeBase)/;

// Ajoute l'attribut `cageMask` = (part de bras, part de jambe) a la geometrie du vetement.
// La geometrie est PARTAGEE entre tous les joueurs issus du meme GLB, et c'est tres bien : le masque ne
// depend que du squelette, pas de la tenue. On le calcule donc une seule fois par fichier.
export function poserMasque(mesh) {
  const geo = mesh.geometry, sk = mesh.skeleton;
  if (!geo || !sk || geo.getAttribute('cageMask')) return false;
  const bi = geo.getAttribute('skinIndex'), bw = geo.getAttribute('skinWeight');
  if (!bi || !bw) return false;
  // 0 = buste, 1 = bras, 2 = jambe
  const classe = sk.bones.map((b) => (OS_BRAS.test(b.name) ? 1 : OS_JAMBE.test(b.name) ? 2 : 0));
  const n = geo.getAttribute('position').count, out = new Uint8Array(n * 2);
  for (let i = 0; i < n; i++) {
    let bras = 0, jambe = 0, somme = 0;
    for (let k = 0; k < 4; k++) {
      const w = bw.getComponent(i, k);
      if (!(w > 0)) continue;
      somme += w;
      const c = classe[bi.getComponent(i, k) | 0] | 0;
      if (c === 1) bras += w; else if (c === 2) jambe += w;
    }
    if (somme > 0) { bras /= somme; jambe /= somme; }   // GLTFLoader ne lit que 4 influences : on renormalise
    out[i * 2] = Math.round(Math.min(1, bras) * 255);
    out[i * 2 + 1] = Math.round(Math.min(1, jambe) * 255);
  }
  geo.setAttribute('cageMask', new THREE.BufferAttribute(out, 2, true));
  return true;
}

// ---------------------------------------------------------------- reperes anatomiques
// Position des os dans la POSE DE LIAISON, c'est-a-dire exactement le repere de l'attribut `position`
// (verifie : les quatre a six noeuds de mesh des GLB ont une matrice monde identite, et bindMatrix vaut
// donc l'identite). boneInverses^-1 donne cette pose quelle que soit l'animation en cours.
const _m = new THREE.Matrix4(), _v = new THREE.Vector3();
export function reperes(mesh) {
  const sk = mesh && mesh.skeleton;
  if (!sk) return null;
  const y = {};
  sk.bones.forEach((b, i) => {
    if (!/^(Hips|Spine2|Neck)$/.test(b.name)) return;
    _m.copy(sk.boneInverses[i]).invert();
    y[b.name] = _v.setFromMatrixPosition(_m).y;
  });
  if (!(y.Hips > 0) || !(y.Neck > y.Hips)) return null;
  // hanche, poitrine, cou (metres du modele). Sur les dix avatars : ~0,97 / ~1,34 / ~1,53.
  return { hanche: y.Hips, poitrine: y.Spine2 || (y.Hips + y.Neck) / 2, cou: y.Neck };
}

// ---------------------------------------------------------------- couper la tenue
// Le shader ne sait que REPEINDRE. Or plusieurs avatars sont livres en costume — manches longues, pantalon,
// parfois chapeau — et un maillot de football n'a ni manches longues ni jambes : il faut donc RACCOURCIR,
// c'est-a-dire couper la geometrie. Le corps (`avaturn_body`) est un maillage complet sous les vetements :
// ce qu'on enleve laisse voir la peau, pas un trou.
//
// On coupe dans la POSE DE LIAISON, en T, ou le bras court le long de X et la jambe le long de Y. Les
// seuils ne sont PAS ecrits en dur : ils sont lus sur le SQUELETTE (epaule, coude, hanche, genou), parce
// que les six geometries de vetement n'ont ni la meme echelle ni le meme gabarit — l'envergure va de
// 0,20 m a 0,73 m d'un personnage a l'autre. Un seuil en metres marcherait sur l'un et raserait l'autre.
//
// On ne touche QUE l'index : les attributs, dont le masque de membre pose juste avant, restent valides.
// Et comme la geometrie est PARTAGEE entre tous les exemplaires d'un meme GLB, on ne coupe qu'une fois.
const _mm = new THREE.Matrix4(), _vv = new THREE.Vector3();
function osPos(sk, nom) {
  const i = sk.bones.findIndex((b) => b.name === nom);
  if (i < 0) return null;
  _mm.copy(sk.boneInverses[i]).invert();
  return _vv.setFromMatrixPosition(_mm).clone();
}

// `opt` : { haut, manche, jambe }
//   haut   — hauteur (m, repere du modele) au-dessus de laquelle on jette tout : le couvre-chef.
//   manche — 0 a 1 : part du BRAS (epaule -> coude) que la manche garde. 0,6 = manche courte de maillot.
//   jambe  — 0 a 1 : part de la CUISSE (genou -> hanche) ou s'arrete le short. 0,2 = juste au-dessus du genou.
//   bas    — part de la hauteur de HANCHE ou s'arrete le vetement du haut. 0,92 = maillot rentre a la taille.
export function couperTenue(mesh, opt) {
  const geo = mesh.geometry, sk = mesh.skeleton;
  if (!geo || !sk || !opt || geo.userData.cageCoupe) return false;
  const pos = geo.attributes.position, idx = geo.index;
  if (!pos || !idx) return false;

  let xManche = Infinity, yJambe = -Infinity, yBas = -Infinity;
  if (opt.manche > 0) {
    const ep = osPos(sk, 'LeftArm'), co = osPos(sk, 'LeftForeArm');
    // On mesure sur le bras GAUCHE et on applique en valeur absolue : le rig est symetrique, et prendre les
    // deux cotes ne ferait que doubler le risque qu'un os manque.
    if (ep && co) xManche = Math.abs(ep.x) + (Math.abs(co.x) - Math.abs(ep.x)) * opt.manche;
  }
  if (opt.jambe > 0) {
    const ha = osPos(sk, 'LeftUpLeg'), ge = osPos(sk, 'LeftLeg');
    if (ha && ge) yJambe = ge.y + (ha.y - ge.y) * opt.jambe;
  }
  // `bas` raccourcit le VETEMENT DU HAUT : c'est ce qui transforme une veste longue, un kimono ou un
  // manteau en simple maillot. Il se mesure en part de la hauteur de HANCHE, la seule cote comparable d'un
  // avatar a l'autre : 0,92 tombe juste sous la ceinture, 1,0 a l'os de la hanche.
  if (opt.bas > 0) {
    const hi = osPos(sk, 'Hips');
    if (hi) yBas = hi.y * opt.bas;
  }
  // Le masque de membre evite les deux confusions qui sautent aux yeux : sans lui, le seuil de manche
  // couperait les FLANCS du buste (qui sont aussi loin de l'axe qu'un bras chez les gabarits etroits), et
  // le seuil de jambe emporterait le BAS DU MAILLOT, qui descend sous la hanche.
  const mk = geo.getAttribute('cageMask');
  const a = idx.array, gardes = [];
  for (let t = 0; t < a.length; t += 3) {
    const i0 = a[t], i1 = a[t + 1], i2 = a[t + 2];
    if (opt.haut > 0) {
      const y = Math.min(pos.getY(i0), pos.getY(i1), pos.getY(i2));
      if (y > opt.haut) continue;                                   // entierement dans le couvre-chef
    }
    if (mk) {
      // bras : on jette le triangle s'il est ENTIEREMENT au-dela du seuil. Le bord garde donc au plus un
      // rang de triangles de trop — c'est ce qui donne une coupe nette plutot qu'une dentelle.
      if (xManche < Infinity) {
        const br = Math.min(mk.getX(i0), mk.getX(i1), mk.getX(i2));
        if (br > 0.5) {
          const dx = Math.min(Math.abs(pos.getX(i0)), Math.abs(pos.getX(i1)), Math.abs(pos.getX(i2)));
          if (dx > xManche) continue;
        }
      }
      if (yJambe > -Infinity) {
        const ja = Math.min(mk.getY(i0), mk.getY(i1), mk.getY(i2));
        if (ja > 0.5) {
          const yh = Math.max(pos.getY(i0), pos.getY(i1), pos.getY(i2));
          if (yh < yJambe) continue;
        }
      }
      // pan de veste : buste, et entierement sous la ceinture. Le short, lui, est pondere par les jambes
      // et passe donc a travers ce test sans y toucher.
      if (yBas > -Infinity) {
        const bu = Math.min(1 - mk.getX(i0) - mk.getY(i0), 1 - mk.getX(i1) - mk.getY(i1),
                            1 - mk.getX(i2) - mk.getY(i2));
        if (bu > 0.35) {
          const yh = Math.max(pos.getY(i0), pos.getY(i1), pos.getY(i2));
          if (yh < yBas) continue;
        }
      }
    }
    gardes.push(i0, i1, i2);
  }
  geo.setIndex(gardes);
  geo.userData.cageCoupe = true;
  return true;
}

// ---------------------------------------------------------------- rendre ses jambes a l'avatar
// PIEGE, et il ne se voit qu'une fois la coupe faite : les avatars Avaturn sont livres avec le corps
// AMPUTE. `avaturn_body` ne contient que la tete, le cou et les bras — l'histogramme de ses 11 093
// triangles est vide en dessous de 1,40 m. Tout ce que le vetement cachait a ete jete a l'export, ce qui
// est tres economique tant qu'on ne touche pas au vetement.
//
// Couper le pantalon pour en faire un short laisse donc le vide : le maillot s'arrete a mi-cuisse et les
// chaussures flottent quarante centimetres plus bas. On REMET les jambes, avec deux troncs de cone par
// jambe — cuisse et mollet — accroches DIRECTEMENT aux os. Etant enfants de l'os, ils heritent de sa
// matrice monde : ils suivent la course, le dribble et le saut sans une ligne de code d'animation, et sans
// skinning, donc pour rien.
//
// On les taille sur la LONGUEUR DE L'OS et non en metres absolus : c'est la seule mesure qui suive
// l'echelle du personnage.
const MEMBRES = [
  // os, os enfant (pour la longueur et la direction), rayon en haut, rayon en bas (en part de la longueur)
  // Mesures prises sur des proportions humaines : une cuisse fait environ 0,15 de sa longueur de rayon au
  // pli de l'aine et 0,11 au genou, un mollet 0,10 au genou et 0,06 a la cheville. Avec le double de ca —
  // mon premier essai — on obtient des cuissots de dessin anime.
  { os: 'LeftUpLeg', fils: 'LeftLeg', r0: 0.185, r1: 0.138 },
  { os: 'RightUpLeg', fils: 'RightLeg', r0: 0.185, r1: 0.138 },
  { os: 'LeftLeg', fils: 'LeftFoot', r0: 0.128, r1: 0.074 },
  { os: 'RightLeg', fils: 'RightFoot', r0: 0.128, r1: 0.074 },
];

// La couleur de peau, prise sur l'ATLAS DU CORPS et non sur la fiche du joueur. `def.skin` sert a colorer
// le bonhomme en primitives : c'est une teinte de convention, souvent plus orangee que le visage du modele
// 3D, et une jambe de cette couleur-la sous un vrai visage se voit immediatement. On moyenne donc la
// texture reelle, en sautant les pixels tres sombres (sourcils, cils, interieur de la bouche) et tres
// clairs (le blanc des yeux) qui tireraient la moyenne.
const _cc = new THREE.Color();
function tonDePeau(mat, secours) {
  const img = mat && mat.map && mat.map.image;
  if (!img || !img.width) return _cc.set(secours || '#c68642').clone();
  try {
    const c = document.createElement('canvas'); c.width = c.height = 24;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, 24, 24);
    const d = g.getImageData(0, 0, 24, 24).data;
    let r = 0, v = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const L = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (L < 40 || L > 235 || d[i + 3] < 128) continue;
      r += d[i]; v += d[i + 1]; b += d[i + 2]; n++;
    }
    if (n > 8) return _cc.setRGB(r / n / 255, v / n / 255, b / n / 255).convertSRGBToLinear().clone();
  } catch (e) { /* atlas non lisible (CORS) : on retombe sur la fiche */ }
  return _cc.set(secours || '#c68642').clone();
}

const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
export function poserJambes(rig, couleur, matCorps) {
  if (!rig || rig.jambesPosees) return false;
  const peau = new THREE.MeshStandardMaterial({ color: tonDePeau(matCorps, couleur), roughness: 0.72 });
  peau.name = 'peau_jambes';                      // reconnue comme de la peau par js/eclairage_perso.js
  let n = 0;
  for (const m of MEMBRES) {
    const os = rig.bone(m.os), fils = rig.bone(m.fils);
    if (!os || !fils) continue;
    // `fils.position` est deja exprimee dans le repere de l'os parent : c'est exactement le vecteur du
    // segment. Rien a convertir, et ca reste juste meme si le rig a des echelles par os.
    const L = fils.position.length();
    if (!(L > 1e-4)) continue;
    const g = new THREE.CylinderGeometry(m.r0 * L, m.r1 * L, L, 12, 1, false);
    // CylinderGeometry est centre sur l'origine et dresse le long de +Y : on le descend d'une demi-longueur
    // puis on aligne +Y sur la direction de l'os.
    g.translate(0, -L / 2, 0);
    const mesh = new THREE.Mesh(g, peau);
    _d.copy(fils.position).normalize();
    mesh.quaternion.setFromUnitVectors(_up, _d.negate());
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.frustumCulled = false;                 // un os anime sort vite de sa boite englobante de repos
    os.add(mesh); n++;
  }
  rig.jambesPosees = n > 0;
  return rig.jambesPosees;
}

// ---------------------------------------------------------------- shader
// ---------------------------------------------------------------- shader
// ---------------------------------------------------------------- shader
// UN SEUL programme pour toutes les tenues : tout passe par des uniformes, le GLSL injecte est toujours
// identique. C'est ce qui rend la cle de cache constante LEGITIME — si le source variait d'une tenue a
// l'autre, r170 reutiliserait le premier programme compile pour toutes (piege signale dans l'inventaire).
const CLE = 'cage-fit-2';

const GLSL_TETE = `
varying vec3 vFitPos;
varying vec3 vFitNrm;
varying vec2 vFitMask;
uniform vec3 uFitA;     // couleur du haut
uniform vec3 uFitB;     // couleur du bas
uniform vec3 uFitC;     // couleur des bandes, du col, des poignets
uniform vec4 uFitCorps; // y hanche, y poitrine, y cou, force (0 = tenue eteinte)
uniform vec4 uFitCoupe; // coupure haut/bas, centre du bandeau, demi-hauteur du bandeau, depart du col
uniform vec4 uFitBande; // largeur bande de jambe, largeur bande de manche, hauteur des bas, lisere
uniform vec2 uFitTissu; // luminance MOYENNE de l'atlas d'origine, garde de contraste
uniform vec3 uFitD;     // couleur de la bande verticale centrale (maillot de foot)
uniform vec2 uFitCentre; // demi-largeur de la bande centrale, demi-largeur de ses liseres (metres)

float fitLum(vec3 c) { return dot(c, vec3(0.30, 0.59, 0.11)); }
// sRGB approche (gamma 2) : deux instructions, pas un pow
vec3 fitS(vec3 c) { return sqrt(max(c, 0.0)); }
vec3 fitL(vec3 c) { return c * c; }

// Repeindre en gardant la LUMINANCE du tissu (ce que fait le composite « color » du Canvas dans
// js/util.js) ne marche PAS ici : un maillot blanc garde sa luminance 0,95 et reste blanc quelle que
// soit la teinte demandee, un jogging noir reste noir. C'est exactement pour ca que les entrees
// actuelles de SKINS ont besoin de lift et de mul.
// On garde donc le CONTRASTE LOCAL du tissu (plis, coutures, ombrage peint, surpiqures) mais on recale
// son niveau moyen sur celui de la couleur voulue : ecart a la moyenne de l'atlas, comprime, puis
// reporte autour de la luminance de la couleur. Une valeur plus claire que la couleur tire vers le
// blanc (reflet du tissu), une valeur plus sombre assombrit la couleur : la teinte ne derive jamais.
vec3 fitTeinte(vec3 tissu, vec3 couleur) {
  float L = fitLum(tissu), Lc = fitLum(couleur);
  float Lp = clamp(Lc + (L - uFitTissu.x) * uFitTissu.y, 0.015, 1.0);
  return Lp >= Lc ? mix(couleur, vec3(1.0), (Lp - Lc) / max(1.0 - Lc, 1e-3))
                  : couleur * (Lp / max(Lc, 1e-3));
}

// smoothstep(e, e, x) est une DIVISION PAR ZERO : la specification GLSL definit smoothstep par
// clamp((x - edge0) / (edge1 - edge0)), donc edge0 == edge1 donne NaN. Et NaN x 0 = NaN, si bien que le
// garde step() qui multiplie APRES ne garde rien du tout : le fragment part en noir ou clignote. Or c'est
// le cas de toute tenue SANS bandeau ou SANS bande laterale — la moitie du catalogue. Les GPU de bureau
// saturent souvent le quotient et masquent le probleme ; Mali et Adreno, eux, ne le masquent pas, et ce
// sont precisement les puces de l'APK. On force donc edge1 strictement au-dessus d'edge0.
float ss(float a, float b, float x) { return smoothstep(a, max(b, a + 1e-4), x); }

vec3 fitPeindre(vec3 src) {
  if (uFitCorps.w <= 0.0) return src;
  float bras = vFitMask.x, jambe = vFitMask.y;
  float buste = clamp(1.0 - bras - jambe, 0.0, 1.0);
  vec3 n = normalize(vFitNrm);

  // Hauteur normalisee par le SQUELETTE : 0 = sol, 1 = hanche, 2 = poitrine, 3 = cou. Le meme nombre
  // designe le meme endroit du corps sur les six geometries de vetement, alors que la boite englobante,
  // elle, mesure la manche (lamine +/-0,73 m contre titouan +/-0,20 m).
  float y = vFitPos.y;
  float h = y < uFitCorps.x ? y / max(uFitCorps.x, 1e-3)
          : y < uFitCorps.y ? 1.0 + (y - uFitCorps.x) / max(uFitCorps.y - uFitCorps.x, 1e-3)
          :                   2.0 + (y - uFitCorps.y) / max(uFitCorps.z - uFitCorps.y, 1e-3);

  // 1) coupure haut / bas : c'est CA qui fait lire « survetement » plutot que « combinaison »
  vec3 col = mix(uFitB, uFitA, smoothstep(uFitCoupe.x - 0.02, uFitCoupe.x + 0.02, h));

  // 2) bandeau horizontal (poitrine ou ceinture), buste seulement
  float bandeau = (1.0 - ss(uFitCoupe.z * 0.7, uFitCoupe.z, abs(h - uFitCoupe.y))) * buste * step(0.01, uFitCoupe.z);

  // 3) BANDE LATERALE, la signature du survetement. Pilotee par la NORMALE de liaison et jamais par x :
  //    la face exterieure d'une jambe a une normale le long de x, de meme signe que x. La largeur est
  //    donc une part de CIRCONFERENCE, juste sur un mollet comme sur une cuisse, sur tous les gabarits.
  float dehors = step(0.0, n.x * vFitPos.x) * ss(1.0 - uFitBande.x, 1.0 - uFitBande.x * 0.45, abs(n.x));
  float bJambe = dehors * jambe * step(0.02, uFitBande.x);
  //    Sur la manche, l'exterieur est le DESSUS du bras en T-pose : une fois les bras baisses par
  //    AvatarRig (js/avatar.js:49-55), ce cote se retrouve dehors, des deux cotes a la fois.
  float bManche = ss(1.0 - uFitBande.y, 1.0 - uFitBande.y * 0.45, n.y) * bras * step(0.02, uFitBande.y);

  // 4) col, et bas de jambe resserre (cheville)
  float colRev = smoothstep(uFitCoupe.w, uFitCoupe.w + 0.10, h) * buste * step(0.01, uFitCoupe.w);
  float bas = (1.0 - ss(uFitBande.z * 0.6, uFitBande.z, h)) * jambe * step(0.01, uFitBande.z);

  // 5) lisere fin a la couture haut/bas
  float lisere = (1.0 - ss(uFitBande.w * 0.5, uFitBande.w, abs(h - uFitCoupe.x))) * step(0.004, uFitBande.w);

  col = mix(col, uFitC, clamp(bandeau + bJambe + bManche + colRev + bas + lisere, 0.0, 1.0));

  // 6) BANDE VERTICALE CENTRALE — le maillot de football. Elle est pilotee par |x| de la pose de liaison
  //    et non par la normale : contrairement a la bande de survetement, celle-ci doit tomber au MEME
  //    endroit devant et derriere, et une bande « exterieure » ferait le tour du buste. Le masque de
  //    membre suffit a la retenir sur le torse ; sans lui elle descendrait sur l'entrejambe.
  //    Les deux liseres l'encadrent, un de chaque cote, en couleur de col (uFitC).
  if (uFitCentre.x > 0.005) {
    float dx = abs(vFitPos.x);
    float centre = (1.0 - ss(uFitCentre.x * 0.90, uFitCentre.x, dx)) * buste;
    float lis = (1.0 - ss(uFitCentre.y * 0.90, uFitCentre.y, abs(dx - uFitCentre.x))) * buste
                * step(0.004, uFitCentre.y);
    col = mix(col, uFitD, clamp(centre, 0.0, 1.0));
    col = mix(col, uFitC, clamp(lis, 0.0, 1.0));
  }
  return mix(src, fitL(fitTeinte(fitS(src), fitS(col))), uFitCorps.w);
}
`;

// Installe le shader sur un materiau de vetement. A appeler UNE fois par materiau (ils sont deja clones
// par joueur dans js/player.js:146-156, donc repeindre un joueur ne touche personne d'autre).
// onBeforeCompile est rappele une fois PAR MATERIAU (three r170, WebGLRenderer ligne 30552 : la Map
// `programs` est propre a chaque materiau), mais acquireProgram tape dans le cache GLOBAL : chaque
// materiau recoit bien ses propres uniformes et il n'y a qu'UNE compilation pour tout le jeu.
export function equiperShader(mat) {
  if (mat.__cage) return mat.__cage;
  const u = {
    uFitA: { value: new THREE.Color(0xffffff) },
    uFitB: { value: new THREE.Color(0xffffff) },
    uFitC: { value: new THREE.Color(0xffffff) },
    uFitCorps: { value: new THREE.Vector4(0.97, 1.34, 1.53, 0) },
    uFitCoupe: { value: new THREE.Vector4(1.1, 2.3, 0.0, 3.2) },
    uFitBande: { value: new THREE.Vector4(0, 0, 0, 0) },
    uFitTissu: { value: new THREE.Vector2(0.5, 0.85) },
    uFitD: { value: new THREE.Color(0xffffff) },
    uFitCentre: { value: new THREE.Vector2(0, 0) },
  };
  // On ne range RIEN dans material.userData : Material.copy y fait un JSON.parse(JSON.stringify(...))
  // (three.module.js:2170) qui transformerait Color et Vector4 en bouillie au premier clone.
  mat.__cage = u;
  mat.onBeforeCompile = (sh) => {
    for (const k in u) sh.uniforms[k] = u[k];
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 cageMask;\nvarying vec3 vFitPos;\nvarying vec3 vFitNrm;\nvarying vec2 vFitMask;')
      // objectNormal est pose ici et deforme juste apres par <skinnormal_vertex> : on le prend AVANT
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvFitNrm = objectNormal;')
      // <begin_vertex> precede <skinning_vertex> : `position` est encore la pose de liaison
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFitPos = position;\nvFitMask = cageMask;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL_TETE)
      // sur diffuseColor, donc AVANT le bloc PBR : le motif recoit l'eclairage, l'IBL et les ombres.
      // Ecrit en fin de fragment, il aurait l'air d'un autocollant plat.
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = fitPeindre(diffuseColor.rgb);');
  };
  mat.customProgramCacheKey = () => CLE;
  mat.needsUpdate = true;
  return u;
}

// Applique (ou eteint) une tenue. `f` est le sous-objet `fit` d'une entree de SKINS, `rep` les reperes.
export function appliquerFit(mat, f, rep) {
  const u = mat.__cage || equiperShader(mat);
  if (!f || !rep) { u.uFitCorps.value.w = 0; mat.needsUpdate = true; return; }
  u.uFitA.value.set(f.haut || '#ffffff');
  u.uFitB.value.set(f.bas || f.haut || '#ffffff');
  u.uFitC.value.set(f.bande || '#ffffff');
  u.uFitD.value.set(f.centre || f.bande || '#ffffff');
  u.uFitCentre.value.set(f.centreL || 0, f.centreLis || 0);
  u.uFitCorps.value.set(rep.hanche, rep.poitrine, rep.cou, f.force === undefined ? 1 : f.force);
  u.uFitCoupe.value.set(f.coupe === undefined ? 1.10 : f.coupe, f.bandeauY || 2.3, f.bandeau || 0, f.col || 0);
  u.uFitBande.value.set(f.jambe || 0, f.manche || 0, f.cheville || 0, f.lisere || 0);
  u.uFitTissu.value.set(moyenne(mat.userData && mat.userData.srcMap) || moyenne(mat.map) || 0.5,
                        f.contraste === undefined ? 0.85 : f.contraste);
  mat.needsUpdate = true;
}

// Luminance moyenne de l'atlas d'origine, lue une fois et mise en cache SUR LA TEXTURE (jamais dans
// userData : Material.copy passerait par JSON, three.module.js:2170). Sert de niveau de reference pour
// que le contraste du tissu soit conserve sans son niveau absolu. Cout : un canvas de 8x8.
export function moyenne(tex) {
  const img = tex && tex.image;
  if (!img || !img.width) return 0;
  if (tex.userData.moyFit !== undefined) return tex.userData.moyFit;
  let m = 0.5;
  try {
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, 8, 8);
    const d = g.getImageData(0, 0, 8, 8).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += (0.30 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
    m = s / (d.length / 4);   // deja en sRGB, comme l'espace de travail du shader (fitS)
  } catch (e) { /* texture non lisible (CORS) : on garde 0,5 */ }
  return (tex.userData.moyFit = m);
}

// ---------------------------------------------------------------- apercu 2D pour la boutique
// La boutique n'a qu'une pastille de 54 px (css/style.css:330) : vendre un survetement sans le montrer,
// c'est vendre a l'aveugle. Plutot que de rallumer le renderer hors ecran de js/portraits.js (qui cadre
// le buste et se dispose a la fin de prechauffer), on dessine la MEME recette en SVG. Instantane, aucun
// WebGL, aucun cache, et ca tient dans une carte de 190 px comme dans une demi-largeur de telephone.
export function silhouette(f) {
  if (!f) return '';
  const A = f.haut || '#888', B = f.bas || A, C = f.bande || '#fff';
  const bandeJ = f.jambe > 0.02, bandeM = f.manche > 0.02;
  const p = [];
  p.push(`<circle cx="30" cy="11" r="7.5" fill="#2a2f3a"/>`);                                  // tete
  p.push(`<rect x="21" y="19" width="18" height="21" rx="3" fill="${A}"/>`);                   // buste
  if (f.col > 0) p.push(`<rect x="24" y="19" width="12" height="3" rx="1.5" fill="${C}"/>`);   // col
  if (f.bandeau > 0) p.push(`<rect x="21" y="26" width="18" height="4" fill="${C}"/>`);        // bandeau
  for (const s of [-1, 1]) {                                                                   // manches
    const x = s < 0 ? 15.5 : 39.5;
    p.push(`<rect x="${x}" y="19.5" width="5" height="17" rx="2.5" fill="${A}"/>`);
    if (bandeM) p.push(`<rect x="${s < 0 ? x : x + 3.6}" y="20" width="1.4" height="16" fill="${C}"/>`);
  }
  p.push(`<rect x="21" y="39" width="18" height="3" fill="${C}" opacity="${f.lisere > 0 ? 1 : 0}"/>`);
  for (const s of [-1, 1]) {                                                                   // jambes
    const x = s < 0 ? 22 : 31;
    p.push(`<rect x="${x}" y="41" width="7" height="22" rx="2" fill="${B}"/>`);
    if (bandeJ) p.push(`<rect x="${s < 0 ? x : x + 5.4}" y="41" width="1.6" height="21" fill="${C}"/>`);
    if (f.cheville > 0) p.push(`<rect x="${x}" y="59" width="7" height="3.5" rx="1.5" fill="${C}"/>`);
  }
  return `<svg class="shop-fit" viewBox="0 0 60 66" aria-hidden="true">${p.join('')}</svg>`;
}
