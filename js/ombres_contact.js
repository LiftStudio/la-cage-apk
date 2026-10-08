import * as THREE from 'three';
import { Monde, DRAPEAU } from './monde.js';
import { dataTextureHauteurs } from './monde_sol.js';
import { OMBRE_MONDE_ACTIF, GLSL_OMBRE_MONDE, uniformesOmbreMonde } from './monde_ombres.js';
import { TELEPHONE } from './appareil.js';

// =====================================================================
//  OMBRES DE CONTACT : ce que le ciel ne voit pas sous les joueurs, le ballon, les bancs, les poteaux
// =====================================================================
// Le soleil ne dessine qu'UNE ombre, la sienne. Or au parc de Bécon tout le plateau est à l'ombre du pin (photos du
// 22, 26 et 27/09) : il n'y a plus de soleil, rien que le ciel, et le ciel éclaire de partout — on ne voyait donc
// AUCUNE ombre sous les joueurs, qui avaient l'air posés sur l'image. Sur les photos, chacun a pourtant sa tache
// sombre et douce sous les pieds : là, le ciel est masqué par le corps. Même chose sous un banc, au pied d'un poteau.
// Aux autres terrains, en plein soleil, la même tache manquait sur le côté éclairé des pieds.
//
// LA MÉTHODE (celle des « contact shadows » de three.js, étendue) : une caméra orthographique posée AU SOL, tournée
// vers le ciel, rend ce qui est au-dessus du plateau en une carte vue de dessous. Chaque fragment y écrit le CONTACT
// (R : ce qui touche presque le sol — les semelles, le ballon qui rebondit, les pieds d'un banc) et sa PRÉSENCE
// (G et B : tout ce qui est à moins de `HAUT` mètres, d'autant plus que c'est bas). Trois flous emboîtés : R sur 7 cm
// (la tache foncée qui déborde à peine des semelles), G sur 15 cm (l'ombre qui colle aux pieds, sous l'assise d'un
// banc), B sur 40 cm (le ciel masqué autour : un corps debout en cache encore un peu à un mètre de lui). Un plan posé
// sur l'enrobé en fait un voile noir : contact en opacité, présence en 1 - exp(-k · présence), qui sature doucement.
// La profondeur garde le fragment le plus BAS de chaque colonne, qui est aussi celui qui assombrit le plus : pas
// besoin de mélange.
//
// DEUX CARTES : la carte FIXE (bancs, poteaux, pied des murs, cage de hand, troncs) est calculée une fois, quand le décor
// a fini d'arriver (au même signal que l'ombre cuite au sol de js/court.js) ; la carte MOBILE (joueurs, ballon, vélo)
// l'est à chaque image, mais elle ne voit que ce qui est sur la couche COUCHE (posée ici sur ce qui bouge) : une passe
// de profondeur de quelques personnages, puis six passes de flou sur une image de 0,5 Mpx — 0,5 ms mesurée sur une
// Radeon intégrée (image entière : 26 ms).
//
// Le plateau (centre, taille) est déclaré par planifierOcclusionSol (js/court.js) dans scene.userData.solContact, et la
// force par terrain dans scene.userData.ombreContact (sinon DEFAUT).
//
// AU PARC ENTIER (lot A6), hors du plateau : la fenêtre SUIT le joueur et le voile se DRAPE sur le relief (voir _suivre).
// Sur le plateau, rien ne change.
//
// LA BORNE DES MOBILES. Un corps debout ne cache au sol, entre ses pieds, que 20 à 40 % du ciel ; sur les photos du
// parc à l'ombre (1000051600, 601, 20260926_185558), le bitume a la même valeur à 30 cm des pieds que plus loin, et
// seul un voile collé aux semelles, jamais noir, trahit le contact. Or 1 - exp(-k · présence) ne connaît pas de
// plafond : sous un joueur, la présence floutée vaut 2 à 2,6 et il ne restait que 1 à 5 % du ciel — une tache
// d'encre d'un mètre. La part MOBILE (joueurs, ballon, vélo) est donc bornée : elle retire au plus `borne` du ciel
// (occM = 1 - borne · (1 - exp(...))) ; le contact des semelles, lui, reste entier. La carte FIXE (bancs, poteaux,
// pied des murs) garde sa loi : sous l'assise d'un banc, le ciel est vraiment caché de partout.

const COUCHE = 7;
// contact : opacité de la tache sous les semelles ; occlusion : coefficient k de 1 - exp(-k · présence floutée) ;
// borne : part du ciel que les MOBILES peuvent retirer au plus (1 = sans borne) ; hContact : hauteur sous laquelle un
// mobile « touche » le sol (semelles, ballon qui rebondit) ; expo : loi de la présence des mobiles avec la hauteur.
// borne 0,6 hors du parc (mesuré le 30/09 à Bécon, temps « nuages » où l'allègement du soleil ne joue plus : sans
// borne, médiane de 0,33 à 0,53 fois le sol entre les pieds et 10e centile à 0,1 ; avec, 0,62 à 0,74 et 0,35 à 0,58.
// Au soleil, le cœur de l'ombre propre du joueur s'éclaircit un peu : 0,53-0,64 -> 0,65-0,77, la tache reste)
const DEFAUT = { contact: 0.45, occlusion: 1.6, borne: 0.6, hContact: 0.22, expo: 0.5, fixeContact: 0.35, fixeOcclusion: 1.2 };
const TEXELS_M = { pc: 32, tel: 16 };
const HAUT = 2.2;           // au-delà, un objet ne masque plus assez de ciel pour qu'on le voie au sol
const HAUT_FIXE = 1.6;      // décor fixe : un banc, une poubelle, le pied d'un mur (le haut d'un mur n'y change rien)
const PIED = 0.02;          // sous 2 cm : le sol lui-même, les liserés peints
// PARC ENTIER, hors du plateau : la fenêtre qui suit le joueur (conception, § 3.6 : côté en m, texels par m), selon le
// préréglage ; et, pour le décor fixe, ce qui est sous 6 cm du sol n'est pas un obstacle (les allées posées à 2 cm, les
// bordures au ras : la carte des hauteurs, au pas de 0,5 m, ne les sépare pas du sol à mieux que quelques centimètres)
const FENETRE = { pc: { extreme: [24, 32], ultra: [24, 32], high: [24, 24], medium: [16, 16], low: [16, 16] },
  tel: { high: [16, 16], medium: [12, 12], low: [12, 12] } };
const PIED_RELIEF = 0.06;
const PAS_FENETRE = 4;      // m : la fenêtre se recentre par pas de 4 m (un nombre entier de texels : rien ne glisse)
const CASE = 8;             // m : les cases de la liste des objets fixes (parc entier, voir _cuireFixeParCases)

// (le téléphone : la détection de tout le jeu, js/appareil.js — même règle qu'ici avant, plus `?tel=1`)

// Matériau de profondeur : il garde tout ce que three sait faire d'un maillage (squelette, instances, morphes) et ne
// change que la sortie. La caméra est orthographique, posée au sol et tournée vers le haut : la profondeur est donc la
// hauteur du fragment, à l'échelle près — hauteur = près + z * (loin - près).
// `expo` : la présence décroît avec la hauteur en (1 - h / loin)^expo. 0,5 (la racine) pour le décor fixe, partout :
// sous l'assise d'un banc à 45 cm, elle vaut encore 0,85. Un terrain peut en demander une plus raide pour les
// MOBILES seuls (ombreContact.expo) : un bassin à 1 m, des bras tendus, un ballon en l'air ne masquent presque rien
// du ciel au sol, alors que la racine leur donnait encore 0,74 — d'où le halo d'un mètre et la tache sous le ballon.
// SUR LE RELIEF (parc entier, `R` : les uniformes de la fenêtre qui suit, voir _suivre) : la caméra est sous le point le
// plus bas de la fenêtre et la hauteur qui compte est celle au-dessus du SOL de chaque colonne, lue dans la carte des
// hauteurs du monde (js/monde_sol.js) ; ce qui est sous le sol ou trop haut est écarté. `presR` : sous cette hauteur, on
// écarte aussi (le décor fixe : les allées posées à 2 cm, les bordures plates — sinon toute une allée ferait « contact »).
// Sans `R` (tous les autres cas), le shader est mot pour mot celui d'avant.
// `revetements` (le décor fixe) : sont écartés aussi, à moins de 25 cm du sol, les REVÊTEMENTS — ce qui est parallèle au
// sol (une allée posée à 2 cm qui s'en écarte de quelques centimètres entre ses sommets, le dessus d'une bordure, deux
// allées qui se chevauchent) ou horizontal (le giron d'une marche, au-dessus du plan incliné que la carte des hauteurs
// donne à un escalier) : sans cela, ils faisaient « contact » et le voile dessinait sous le joueur leurs contours en
// dents de scie. La pente se lit dans les dérivées de l'image (la caméra regarde droit vers le haut).
// LE SOL D'UNE COLONNE, AU PIED DES MURS (lot R1). La carte des hauteurs est filtrée linéairement : au bord d'une terrasse,
// entre deux nœuds de part et d'autre d'un mur, elle lisait une pente de 4 m sur 50 cm — la balustrade du belvédère y
// semblait flotter, un banc au pied du mur des caves s'y enfonçait, et le voile y prenait l'ombre de ce qui est en bas.
// `solC` lit les quatre nœuds et applique la règle de Monde.sol (js/monde.js, _hauteur) : le coin le plus proche donne le
// côté du mur ; un coin à 0,35 m ou plus de lui (une frontière dure) prend sa hauteur au lieu de la sienne.
const GLSL_SOL_C = `
float solC( vec2 p ) {
  vec2 f = ( p - uHautC.xy ) * uHautC.zw * uTexC - 0.5, i0 = floor( f ), u = f - i0, t = 1.0 / uTexC;
  float h00 = texture2D( tHautC, ( i0 + vec2( 0.5, 0.5 ) ) * t ).r, h10 = texture2D( tHautC, ( i0 + vec2( 1.5, 0.5 ) ) * t ).r;
  float h01 = texture2D( tHautC, ( i0 + vec2( 0.5, 1.5 ) ) * t ).r, h11 = texture2D( tHautC, ( i0 + vec2( 1.5, 1.5 ) ) * t ).r;
  float r = u.y < 0.5 ? ( u.x < 0.5 ? h00 : h10 ) : ( u.x < 0.5 ? h01 : h11 );
  h00 = abs( h00 - r ) < 0.35 ? h00 : r; h10 = abs( h10 - r ) < 0.35 ? h10 : r;
  h01 = abs( h01 - r ) < 0.35 ? h01 : r; h11 = abs( h11 - r ) < 0.35 ? h11 : r;
  return mix( mix( h00, h10, u.x ), mix( h01, h11, u.x ), u.y );
}
`;
function materiauHauteur(pres, loin, contact, expo = 0.5, R = null, presR = -0.15, revetements = false) {
  const m = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });
  m.blending = THREE.NoBlending;
  const loi = expo === 0.5 ? 'sqrt(t)' : expo === 1 ? 't' : expo === 2 ? 't * t' : `pow(t, ${expo.toFixed(4)})`;
  m.onBeforeCompile = (sh) => {
    let hh = `float hh = ${pres.toFixed(4)} + fragCoordZ * ${(loin - pres).toFixed(4)};`;
    if (R) {
      Object.assign(sh.uniforms, R);
      sh.fragmentShader = 'uniform float uRelief;\nuniform sampler2D tHautC;\nuniform vec4 uHautC, uFenC, uCamC;\nuniform vec2 uTexC;\n' + GLSL_SOL_C + sh.fragmentShader;
      hh = `float hh;
        if ( uRelief > 0.5 ) {
          vec2 xzC = uFenC.xy + gl_FragCoord.xy * uCamC.zw * uFenC.zw;
          float yC = uCamC.x + fragCoordZ * uCamC.y;
          hh = yC - solC( xzC );${revetements ? `
          float pasC = uFenC.z * uCamC.z;
          float penteY = length( vec2( dFdx( yC ), dFdy( yC ) ) ) / pasC, penteH = length( vec2( dFdx( hh ), dFdy( hh ) ) ) / pasC;
          if ( hh < 0.25 && min( penteY, penteH ) < 0.25 ) discard;` : ''}
          if ( hh < ${presR.toFixed(4)} || hh > ${loin.toFixed(4)} ) discard;
          hh = max( hh, 0.0 );
        } else ${hh}`;
    }
    sh.fragmentShader = sh.fragmentShader.replace(/gl_FragColor = vec4\( vec3\( 1\.0 - fragCoordZ \), opacity \);/,
      `${hh}
        float cont = 1.0 - smoothstep(0.0, ${contact.toFixed(4)}, hh);
        float t = max(0.0, 1.0 - hh / ${loin.toFixed(4)});
        float pres = ${loi};
        gl_FragColor = vec4(cont, pres, pres, 1.0);`);
  };
  m.customProgramCacheKey = () => `ombre-contact-${pres}-${loin}-${contact}-${expo}${R ? '-relief2' + presR + (revetements ? '-rev' : '') : ''}`;
  return m;
}

// Flou gaussien séparable à 9 prises. `uCanaux` dit quels canaux sont floutés ; les autres sont recopiés tels quels.
const VS_PLEIN = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
function materiauFlou() {
  return new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uPas: { value: new THREE.Vector2() }, uCanaux: { value: new THREE.Vector3(1, 1, 1) } },
    vertexShader: VS_PLEIN,
    fragmentShader: `uniform sampler2D tSrc; uniform vec2 uPas; uniform vec3 uCanaux; varying vec2 vUv;
      void main() {
        const float W0 = 0.2270270, W1 = 0.1945946, W2 = 0.1216216, W3 = 0.0540541, W4 = 0.0162162;
        vec4 c = texture2D(tSrc, vUv);
        vec3 s = c.rgb * W0;
        s += (texture2D(tSrc, vUv + uPas).rgb + texture2D(tSrc, vUv - uPas).rgb) * W1;
        s += (texture2D(tSrc, vUv + 2.0 * uPas).rgb + texture2D(tSrc, vUv - 2.0 * uPas).rgb) * W2;
        s += (texture2D(tSrc, vUv + 3.0 * uPas).rgb + texture2D(tSrc, vUv - 3.0 * uPas).rgb) * W3;
        s += (texture2D(tSrc, vUv + 4.0 * uPas).rgb + texture2D(tSrc, vUv - 4.0 * uPas).rgb) * W4;
        gl_FragColor = vec4(mix(c.rgb, s, uCanaux), 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
}

// LE VOILE D'AFFICHAGE : le plan du plateau (tous les terrains), ou, au parc entier hors du plateau, la fenêtre qui suit le
// joueur, DRAPÉE sur le sol (`drape` : la position du monde vient du sommet, posé sur Monde.sol, voir draper). `monde` : le
// parc entier (js/monde_ombres.js) — « au soleil » tient compte de la zone d'ombre forcée du plateau et, sur le voile
// drapé, de la carte lointaine (un arbre à 100 m met aussi le joueur à l'ombre). Sans option : mot pour mot le shader
// d'avant.
function fragmentPlan(o = {}) {
  const litMonde = !o.monde ? '' : o.drape
    ? '\n              lit = min(lit, omLoinUn(vMondeP, omPortee(vMondeP)).y) * (1.0 - omForcee(vMondeP));'
    : '\n              lit *= 1.0 - omForcee(vec3(vMonde.x, 0.03, vMonde.y));';
  return `#include <packing>
        uniform sampler2D tMobile, tFixe, tSoleil; uniform vec4 uForce; uniform vec2 uMin, uTaille; uniform float uFixe, uBorne;
        uniform mat4 mSoleil; uniform vec3 uSoleil;
        ${o.drape ? 'varying vec3 vMondeP;\n        #define vMonde vMondeP.xz' : 'varying vec2 vMonde;'}${o.monde ? '\n' + GLSL_OMBRE_MONDE : ''}
        void main() {
          vec2 uv = (vMonde - uMin) / uTaille;
          // les bords de la carte : on s'éteint sur 20 cm au lieu de couper net
          vec2 b = min(uv, 1.0 - uv) * uTaille;
          float bord = smoothstep(0.0, 0.2, min(b.x, b.y));
          // contact : une tache foncée qui déborde à peine des semelles ; occlusion : 1 - exp(-k · présence floutée),
          // qui sature doucement (deux joueurs collés ne font pas une tache deux fois plus noire). La part des
          // mobiles est bornée (uBorne, voir l'en-tête) : un corps debout ne cache jamais tout le ciel au sol ;
          // celle du décor fixe ne l'est pas. Avec uBorne = 1, c'est exactement l'ancienne loi.
          vec3 m = texture2D(tMobile, uv).rgb, f = texture2D(tFixe, uv).rgb * uFixe;
          float occM = 1.0 - uBorne * (1.0 - exp(-uForce.y * (1.6 * m.g + m.b)));
          float occF = exp(-uForce.w * (1.6 * f.g + f.b));
          float occ = occM * occF;
          // AU SOLEIL, le ciel masqué ne pèse que sa part de l'éclairement : la grande tache n'assombrit que cette
          // part (plus de halo sale autour des pieds sur l'enrobé ensoleillé, où l'ombre du soleil fait déjà le
          // travail). Dans l'ombre — celle du joueur, d'un arbre, tout le plateau du parc — elle reste entière.
          if (uSoleil.x > 0.5 && occ < 0.995) {
            vec4 sc = mSoleil * vec4(${o.drape ? 'vMondeP.x, vMondeP.y + 0.03, vMondeP.z' : 'vMonde.x, 0.03, vMonde.y'}, 1.0);
            if (all(greaterThan(sc.xy, vec2(0.0))) && all(lessThan(sc.xy, vec2(1.0)))) {
              float lit = step(sc.z + uSoleil.z, unpackRGBAToDepth(texture2D(tSoleil, sc.xy)));${litMonde}
              occ = mix(occ, 1.0 - (1.0 - occ) * uSoleil.y, lit);
            }
          }
          float a = 1.0 - (1.0 - uForce.x * min(1.0, 1.5 * m.r)) * (1.0 - uForce.z * min(1.0, 1.5 * f.r)) * occ;
          gl_FragColor = vec4(0.0, 0.0, 0.0, a * bord);
        }`;
}

// Le voile drapé : une grille au pas de la carte des hauteurs (0,5 m), ses sommets sur les nœuds du monde et ses
// triangles coupés dans le même sens que ceux du sol (js/monde_sol.js, geometrieDrapee), posée à DY_DRAPE au-dessus de
// Monde.sol à chaque recentrage (2 401 lectures du sol pour 24 m : moins d'un dixième de milliseconde). Les sommets sont
// écrits dans le repère du monde, et non déplacés par le shader : les passes qui dessinent la scène avec leur propre
// matériau (les normales de l'occlusion ambiante, js/fx.js) voient le voile où il est — déplacé par le seul shader, il
// y restait à plat à y = 0, flottant au-dessus des pentes, et l'occlusion noircissait tout le sol en dessous.
//
// AU PIED DES MURS (lot R1). Une grille continue enjambait les murs : entre le nœud du haut d'une terrasse et celui du
// bas, deux triangles tendus en rideau, de biais devant le mur — et le voile y dessinait EN L'AIR l'ombre de contact de
// ce qui est au pied (un banc, une jardinière, le limon d'une volée), au-dessus de la tête de qui passait dessous. Le
// voile est maintenant découpé comme le sol (js/monde_sol.js, _carreDur) : un carré de la grille à cheval sur une
// frontière DURE entre deux nappes (0,35 m ou plus) garde, à chacun de ses coins, le quart qui l'entoure, à la hauteur
// de SA nappe (Monde.solNappe) ; rien ne relie les quarts. Le bord du plateau (l'enrobé à 0, rectangle de Monde.sol)
// suit la même règle. Le maillage est refait à chaque recentrage (un dixième de milliseconde de plus, au pied des murs
// seulement), et agrandi si un recentrage compte plus de carrés coupés que prévu.
const DY_DRAPE = 0.035;          // au-dessus des allées des zones (rubans posés à 2 cm, js/parc/kit.js)
function grilleDrapee(W, coupes = 512) {
  const n = Math.round(W / 0.5) + 1, nv = n * n + 16 * coupes, ni = 6 * (n - 1) * (n - 1) + 24 * coupes;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(ni), 1).setUsage(THREE.DynamicDrawUsage));
  g.userData.n = n; g.userData.coupes = coupes;
  return g;
}
// Le voile sur le sol de la fenêtre dont le coin est (x0, z0) (repère du monde affiché, sur un nœud de la grille).
// `sol` : le sol du parc (js/monde_sol.js), qui sait si un carré est à cheval sur un mur. Rend le nombre de carrés coupés
// (au-delà de la place prévue : -1, le maillage doit être agrandi).
function draper(g, x0, z0, sol) {
  const n = g.userData.n, P = g.attributes.position.array, I = g.index.array;
  const R = Monde.repere, dx = Monde.dx, pl = R && R.plateau;
  for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) {
    const j = (r * n + q) * 3, x = x0 + q * 0.5, z = z0 + r * 0.5;
    P[j] = x; P[j + 1] = Monde.sol(x, z) + DY_DRAPE; P[j + 2] = z;
  }
  let nv = n * n, ni = 0, coupes = 0;
  const i0 = R ? Math.round((x0 - dx - R.x0) / R.pas) : 0, k0 = R ? Math.round((z0 - R.z0) / R.pas) : 0;
  const dansPlateau = (x, z) => pl && x - dx >= pl[0] && x - dx <= pl[2] && z >= pl[1] && z <= pl[3];
  for (let r = 0; r < n - 1; r++) for (let q = 0; q < n - 1; q++) {
    const j = r * n + q, a = j, b = j + 1, c = j + n, d = j + n + 1;
    // à cheval sur un mur ? (une frontière dure de la grille du monde, ou le bord du plateau là où il fait marche)
    let dur = false;
    if (sol && R) {
      const x = x0 + q * 0.5, z = z0 + r * 0.5, ii = i0 + q, kk = k0 + r;
      const ins = pl ? dansPlateau(x, z) + dansPlateau(x + 0.5, z) + dansPlateau(x, z + 0.5) + dansPlateau(x + 0.5, z + 0.5) : 0;
      // (dans le plateau, tout est à 0 : rien à couper ; à cheval sur son bord, la marche se mesure)
      if (ins === 0 && ii >= 0 && kk >= 0 && ii < R.nx - 1 && kk < R.nz - 1) dur = sol._dur(kk * R.nx + ii);
      else if (ins > 0 && ins < 4) {
        const ys = [P[a * 3 + 1], P[b * 3 + 1], P[c * 3 + 1], P[d * 3 + 1]];
        dur = Math.max(...ys) - Math.min(...ys) >= 0.35;
      }
    }
    if (!dur) { I[ni++] = a; I[ni++] = c; I[ni++] = b; I[ni++] = b; I[ni++] = c; I[ni++] = d; continue; }
    if (++coupes > g.userData.coupes) return -1;
    // les quatre quarts, chacun à la hauteur de la nappe de son coin
    const X0 = x0 + q * 0.5, Z0 = z0 + r * 0.5, xm = X0 + 0.25, zm = Z0 + 0.25;
    for (let s = 0; s < 4; s++) {
      const X = s & 1 ? X0 + 0.5 : X0, Z = s & 2 ? Z0 + 0.5 : Z0;
      const np = Monde.nappe(X, Z), base = P[[a, b, c, d][s] * 3 + 1];
      // (au bord du plateau, le coin du dedans reste à 0 : Monde.sol y rend 0 quelle que soit la nappe)
      const h = (x, z) => (dansPlateau(X, Z) ? DY_DRAPE : Monde.solNappe(x, z, np) + DY_DRAPE);
      const xa = Math.min(X, xm), xb = Math.max(X, xm), za = Math.min(Z, zm), zb = Math.max(Z, zm);
      const hy = (x, z) => (x === X && z === Z ? base : h(x, z));
      const v = nv;
      for (const [x, z] of [[xa, za], [xb, za], [xa, zb], [xb, zb]]) { P[nv * 3] = x; P[nv * 3 + 1] = hy(x, z); P[nv * 3 + 2] = z; nv++; }
      I[ni++] = v; I[ni++] = v + 2; I[ni++] = v + 1; I[ni++] = v + 1; I[ni++] = v + 2; I[ni++] = v + 3;
    }
  }
  g.setDrawRange(0, ni);
  g.attributes.position.needsUpdate = true; g.index.needsUpdate = true;
  return coupes;
}

export class OmbresContact {
  constructor(renderer, scene) {
    this.renderer = renderer; this.scene = scene;
    this.actif = false; this.pret = false; this.cuisson = -1; this.n = 0; this.tRamasse = 0;
    this.dynamiques = new WeakSet();
  }

  // prépare cartes, caméra et plan d'affichage une fois le plateau connu
  _installer(S) {
    const R = TELEPHONE ? TEXELS_M.tel : TEXELS_M.pc;
    const w = Math.min(2048, Math.round(S.W * R)), h = Math.min(2048, Math.round(S.L * R));
    const cible = () => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter, depthBuffer: true, generateMipmaps: false });
    this.w = w; this.h = h; this.texelM = S.W / w;
    this.brut = cible(); this.tmp = cible(); this.mobile = cible(); this.fixe = cible();
    // sous le sol, tournée vers le ciel : +x à droite, +z en haut de l'image (le plan relit en coordonnées monde)
    this.cam = new THREE.OrthographicCamera(-S.W / 2, S.W / 2, S.L / 2, -S.L / 2, 0, HAUT);
    this.cam.position.set(S.cx, 0, S.cz); this.cam.up.set(0, 0, 1); this.cam.lookAt(S.cx, 1, S.cz);
    this.cam.layers.set(COUCHE); this.cam.updateMatrixWorld();
    const F = { ...DEFAUT, ...(this.scene.userData.ombreContact || {}) };
    // la loi des mobiles est celle du terrain (hContact : hauteur de la bande de contact ; expo : voir materiauHauteur) ;
    // celle du décor fixe est commune
    this.matMobile = materiauHauteur(0, HAUT, F.hContact, F.expo);
    this.matFixe = materiauHauteur(PIED, HAUT_FIXE, 0.3);
    this.flou = materiauFlou();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.flou);
    this.sceneQuad = new THREE.Scene(); this.sceneQuad.add(this.quad);
    this.camQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.plan = new THREE.Mesh(new THREE.PlaneGeometry(S.W, S.L), new THREE.ShaderMaterial({
      uniforms: { tMobile: { value: this.mobile.texture }, tFixe: { value: this.fixe.texture },
        uForce: { value: new THREE.Vector4(F.contact, F.occlusion, F.fixeContact, F.fixeOcclusion) },
        uBorne: { value: F.borne },
        uMin: { value: new THREE.Vector2(S.cx - S.W / 2, S.cz - S.L / 2) }, uTaille: { value: new THREE.Vector2(S.W, S.L) },
        uFixe: { value: 0 },
        // la carte d'ombre du soleil : x = actif, y = part du ciel dans l'éclairement, z = biais
        tSoleil: { value: null }, mSoleil: { value: new THREE.Matrix4() }, uSoleil: { value: new THREE.Vector3(0, 0.3, -0.0006) },
        // (parc entier : la zone d'ombre forcée du plateau et la carte lointaine, js/monde_ombres.js)
        ...(OMBRE_MONDE_ACTIF ? uniformesOmbreMonde() : {}) },
      vertexShader: `varying vec2 vMonde; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vMonde = wp.xz;
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: fragmentPlan({ monde: OMBRE_MONDE_ACTIF }),
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    // SUR LE RELIEF (parc entier) : les uniformes de la fenêtre qui suit le joueur, partagés par les deux matériaux de
    // hauteur et par le voile drapé (voir _suivre)
    if (!Monde.plat) {
      const H = dataTextureHauteurs(), c = H && H.userData.cadre;
      if (c) {
        this.RU = { uRelief: { value: 0 }, tHautC: { value: H },
          uHautC: { value: new THREE.Vector4(c.x0 - c.pas / 2, c.z0 - c.pas / 2, 1 / (c.pas * c.nx), 1 / (c.pas * c.nz)) },
          uTexC: { value: new THREE.Vector2(c.nx, c.nz) },
          uFenC: { value: new THREE.Vector4() }, uCamC: { value: new THREE.Vector4() } };
        this._cadreH = c;
        this.matMobile = materiauHauteur(0, HAUT, F.hContact, F.expo, this.RU, -0.15);
        this.matFixe = materiauHauteur(PIED, HAUT_FIXE, 0.3, 0.5, this.RU, PIED_RELIEF, true);
      }
    }
    // Juste au-dessus du plus haut revêtement opaque qui couvre le plateau : la fresque de Jemmapes est un calque
    // posé à 1,4 cm, sous lequel l'ombre disparaissait. Pas plus haut que nécessaire : ce qui est sous le plan (le
    // bas des semelles) est assombri avec le sol.
    let yRev = 0;
    const bb = new THREE.Box3(), aire = 0.15 * S.W * S.L;
    this.scene.traverse((o) => {
      if (!o.isMesh || o.userData.dynamique) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.transparent) return;
      bb.setFromObject(o);
      if (bb.max.y < 0.06 && bb.max.y - bb.min.y < 0.01 && (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z) > aire) yRev = Math.max(yRev, bb.max.y);
    });
    this._yPlan = Math.max(0.012, yRev + 0.004); this._cx = S.cx; this._cz = S.cz;   // (hauteur et centre : voir _suivre)
    this.plan.rotation.x = -Math.PI / 2; this.plan.position.set(S.cx, this._yPlan, S.cz);
    this.plan.renderOrder = 2; this.plan.frustumCulled = false;
    this.plan.userData.dynamique = true;        // pas un obstacle pour l'ombre cuite au sol
    this.plan.name = 'ombres de contact';
    this.scene.add(this.plan);
    this.pret = true;
  }

  // Ce qui bouge passe sur la couche COUCHE : les racines marquées `dynamique` au premier niveau de la scène
  // (joueurs, vélo, passants), et le ballon. Seuls les maillages opaques qui portent une ombre y vont (pas les
  // anneaux, étiquettes et marqueurs, qui flotteraient en tache sous le joueur).
  _ramasser() {
    const marquer = (racine) => racine.traverse((o) => {
      if (!(o.isMesh || o.isSkinnedMesh) || !o.castShadow) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.transparent) return;
      o.layers.enable(COUCHE);
    });
    for (const o of this.scene.children) if (o.userData.dynamique && !o.userData.ombreToujours && o !== this.plan) marquer(o);
    const balle = this.scene.userData.ball && this.scene.userData.ball.mesh;
    if (balle) marquer(balle);
  }

  // SES PROGRAMMES PRÉCOMPILÉS (06/10/2026 ; voir avecProfondeur de js/ombre_cache.js). Un avatar qui arrive (squelette,
  // morphes du visage) faisait compiler SA variante du matériau de hauteur à la première image où il entrait dans la carte
  // des mobiles — à la première image d'un match, pour dix joueurs d'un coup. On pose matMobile sur ses maillages
  // opaques qui portent une ombre (ceux que _ramasser met sur la couche), le temps de `compiler(racine, caméra)` avec
  // NOTRE caméra : elle ne voit pas la couche des lumières, la clé est donc celle du vrai rendu.
  avecContact(racine, compiler) {
    if (!this.pret || !this.matMobile) return null;
    const poses = [];
    racine.traverse((o) => {
      if (!(o.isMesh || o.isSkinnedMesh) || !o.castShadow || !o.material) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.transparent) return;
      poses.push([o, o.material]); o.material = this.matMobile;
    });
    try { return poses.length ? compiler(racine, this.cam) : null; }
    finally { for (const [o, m] of poses) o.material = m; }
  }

  _flouter(src, dst, sigmaM, canaux) {
    const pas = Math.max(0.6, sigmaM / this.texelM * 0.6);
    this.flou.uniforms.uCanaux.value.set(canaux[0], canaux[1], canaux[2]);
    this.flou.uniforms.tSrc.value = src.texture; this.flou.uniforms.uPas.value.set(pas / this.w, 0);
    this.renderer.setRenderTarget(this.tmp); this.renderer.render(this.sceneQuad, this.camQuad);
    this.flou.uniforms.tSrc.value = this.tmp.texture; this.flou.uniforms.uPas.value.set(0, pas / this.h);
    this.renderer.setRenderTarget(dst); this.renderer.render(this.sceneQuad, this.camQuad);
  }

  // Une passe complète : la vue de dessous dans `brut`, puis trois flous emboîtés. R = le contact (flou de 7 cm) ;
  // G = la présence au-dessus du sol floutée sur 15 cm (l'ombre qui colle aux pieds, sous l'assise d'un banc) ; B = la
  // même floutée sur 40 cm (le ciel masqué autour : un corps debout en cache encore un peu à un mètre de lui).
  _carte(dst, materiau, mobiles = false) {
    const r = this.renderer, sc = this.scene;
    const fond = sc.background, surcharge = sc.overrideMaterial, cible = r.getRenderTarget();
    const auto = r.shadowMap.autoUpdate, couleur = r.getClearColor(this._couleur || (this._couleur = new THREE.Color())), alpha = r.getClearAlpha();
    // PARC ENTIER (lot R1) : three remettait à jour les matrices de TOUTE la scène avant ce rendu (1 à 2 ms, à chaque
    // image pour la carte des mobiles) ; le décor ne bouge pas, et la passe principale les remet à jour juste après. On
    // ne refait que celles de ce qui bouge — ce que la couche des mobiles contient (voir _ramasser).
    // (04/10/2026) Sur les terrains plats aussi, pour la carte des MOBILES (`mobiles`) : 2 500 objets à Bécon, 0,27 ms
    // par image sur PC, le tiers de ce poste — un millième de seconde sur un téléphone. La cuisson du décor fixe, elle,
    // garde la mise à jour complète : un objet tout juste arrivé n'a pas encore de matrice monde.
    const majAuto = sc.matrixWorldAutoUpdate;
    if (!Monde.plat || mobiles) {
      sc.matrixWorldAutoUpdate = false;
      for (const o of sc.children) if (o.userData.dynamique) o.updateMatrixWorld();
      const balle = sc.userData.ball && sc.userData.ball.mesh;
      if (balle) balle.updateWorldMatrix(true, true);
    }
    sc.background = null; sc.overrideMaterial = materiau; r.shadowMap.autoUpdate = false;
    try { r.setRenderTarget(this.brut); r.setClearColor(0x000000, 0); r.clear(); r.render(sc, this.cam); }
    finally { sc.matrixWorldAutoUpdate = majAuto; }
    sc.background = fond; sc.overrideMaterial = surcharge; r.shadowMap.autoUpdate = auto;
    // chaque flou lit une cible et en écrit une autre (brut -> tmp -> dst, puis dst -> tmp -> dst)
    this._flouter(this.brut, dst, 0.07, [1, 1, 1]);
    this._flouter(dst, dst, 0.13, [0, 1, 1]);
    this._flouter(dst, dst, 0.38, [0, 0, 1]);
    r.setRenderTarget(cible); r.setClearColor(couleur, alpha);
  }

  // Le décor fixe, une fois : tout ce qui est opaque, posé, et pas gigantesque (le ciel, le sol de 500 m). Le
  // feuillage découpé et les grillages (alphaTest) n'y vont pas : rendus pleins, ils feraient des murs d'ombre.
  _cuireFixe() {
    // PARC ENTIER (lot R1) : la liste des objets fixes PAR CASE, au lieu de deux parcours de toute la scène à chaque
    // recentrage de la fenêtre (2 à 6 ms, des milliers d'objets) ; même choix d'objets, donc même carte
    if (!Monde.plat && this.RU) { this._cuireFixeParCases(); return; }
    const sc = this.scene, cache = new Map();
    sc.traverse((o) => {
      cache.set(o, o.layers.mask);
      if (!o.isMesh || o.isSkinnedMesh || o === this.plan || o.userData.dynamique) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.transparent || m.alphaTest > 0 || m.fog === false) return;
      if (o.geometry.boundingSphere === null) o.geometry.computeBoundingSphere();
      if (o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() > 60) return;
      // (fenêtre drapée : les sols des zones — allées, dallages, pelouses —, que le kit du parc pose sans ombre portée,
      // ne sont pas des obstacles, même là où deux d'entre eux se chevauchent à quelques décimètres du sol)
      if (this.mode === 'suivi' && !o.castShadow && !o.userData.ombreKit) return;
      o.layers.enable(COUCHE);
    });
    // les objets qui bougent sont déjà sur la couche : on les en retire le temps de la cuisson
    for (const o of sc.children) if (o.userData.dynamique) o.traverse((d) => d.layers.disable(COUCHE));
    const balle = sc.userData.ball && sc.userData.ball.mesh;
    if (balle) balle.traverse((d) => d.layers.disable(COUCHE));
    // (fenêtre drapée : la caméra garde sa tranche, du sol le plus bas au plus haut ; le shader écarte ce qui n'est pas
    // entre PIED_RELIEF et HAUT_FIXE au-dessus du sol de chaque colonne)
    if (this.mode === 'suivi') this._carte(this.fixe, this.matFixe);
    else {
      this.cam.near = PIED; this.cam.far = HAUT_FIXE; this.cam.updateProjectionMatrix();
      this._carte(this.fixe, this.matFixe);
      this.cam.near = 0; this.cam.far = HAUT; this.cam.updateProjectionMatrix();
    }
    sc.traverse((o) => { if (cache.has(o)) o.layers.mask = cache.get(o); });
    this.plan.material.uniforms.uFixe.value = 1;
    if (this.drape) this.drape.material.uniforms.uFixe.value = 1;
    this._ramasser();
  }

  // LA LISTE DES OBJETS FIXES PAR CASE (parc entier, lot R1). Chaque objet que la carte fixe peut prendre (les règles de
  // _cuireFixe : opaque, sans découpe, dans le brouillard, sphère de 60 m au plus, ni ce qui bouge) est rangé, une fois,
  // dans les cases de 8 m que touche sa sphère englobante (le décor ne bouge plus). Un recentrage ne regarde que les cases
  // de la fenêtre. La liste est faite au premier usage, refaite quand le décor a fini d'arriver (solCuit : le signal de
  // la recuisson), et complétée par les objets apparus depuis au premier niveau de la scène (les morceaux des zones, à
  // mesure que l'ordonnanceur les construit) ; un objet retiré de la scène (morceau libéré) en sort à son prochain passage.
  // (rend les entrées faites, chacune avec ses cases : voir _purger)
  _indexer(racine, cases) {
    const s = this._sph || (this._sph = new THREE.Sphere()), faites = [];
    racine.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || o === this.plan || o === this.drape || o.userData.dynamique) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.transparent || m.alphaTest > 0 || m.fog === false) return;
      if (o.geometry.boundingSphere === null) o.geometry.computeBoundingSphere();
      s.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      if (s.radius > 60) return;
      // (un InstancedMesh — les poteaux d'un grillage, les barreaux d'une grille — ou un BatchedMesh — les fûts des arbres
      // du parc, js/monde_vegetation.js — garde la règle des 60 m sur sa géométrie, comme _cuireFixe, mais il est rangé
      // dans les cases de TOUS ses exemplaires : sa propre sphère)
      if (o.isInstancedMesh || o.isBatchedMesh) {
        if (o.boundingSphere === null) o.computeBoundingSphere();
        s.copy(o.boundingSphere).applyMatrix4(o.matrixWorld);
      }
      const e = { o, x0: s.center.x - s.radius, z0: s.center.z - s.radius, x1: s.center.x + s.radius, z1: s.center.z + s.radius, tour: 0, cles: [] };
      for (let i = Math.floor(e.x0 / CASE); i <= Math.floor(e.x1 / CASE); i++) for (let k = Math.floor(e.z0 / CASE); k <= Math.floor(e.z1 / CASE); k++) {
        const c = (i + 4096) * 8192 + (k + 4096);
        let l = cases.get(c);
        if (!l) cases.set(c, l = []);
        l.push(e); e.cles.push(c);
      }
      faites.push(e);
    });
    return faites;
  }
  // (relecture du lot R1) Les racines indexées, avec leurs entrées : une racine sortie de la scène (un morceau libéré
  // par l'ordonnanceur) est retirée de TOUTES ses cases au recentrage suivant. Sans cela, ses entrées restaient dans les
  // cases que la fenêtre ne revisitait pas, et avec elles ses maillages et leurs tableaux de sommets : 116 Mo de
  // géométrie de morceaux libérés gardés en mémoire après un seul tour du parc à vélo.
  _majIndex() {
    const sc = this.scene;
    if (!this._cases) {
      sc.updateMatrixWorld(true);
      this._cases = new Map(); this._racinesIdx = new Map(); this._tour = 0;
      for (const o of sc.children) this._racinesIdx.set(o, o.userData.dynamique ? null : this._indexer(o, this._cases));
      return;
    }
    for (const [o, l] of this._racinesIdx) if (o.parent !== sc) { this._racinesIdx.delete(o); if (l) this._purger(l); }
    for (const o of sc.children) {
      if (this._racinesIdx.has(o)) continue;
      if (o.userData.dynamique) { this._racinesIdx.set(o, null); continue; }
      o.updateMatrixWorld(true);
      this._racinesIdx.set(o, this._indexer(o, this._cases));
    }
  }
  _purger(entrees) {
    for (const e of entrees) {
      for (const c of e.cles) {
        const l = this._cases.get(c);
        const j = l ? l.indexOf(e) : -1;
        if (j < 0) continue;
        l[j] = l[l.length - 1]; l.pop();
        if (!l.length) this._cases.delete(c);
      }
      e.cles.length = 0;
    }
  }
  _cuireFixeParCases() {
    const t0 = performance.now(), sc = this.scene, S = sc.userData.solContact;
    this._majIndex();
    // la fenêtre : celle qui suit le joueur, ou le plateau
    let x0, z0, x1, z1;
    if (this.mode === 'suivi') { const f = this.RU.uFenC.value; x0 = f.x; z0 = f.y; x1 = f.x + f.z; z1 = f.y + f.w; }
    else { x0 = S.cx - S.W / 2; z0 = S.cz - S.L / 2; x1 = S.cx + S.W / 2; z1 = S.cz + S.L / 2; }
    const tour = ++this._tour, liste = this._listeFixe || (this._listeFixe = []), suivi = this.mode === 'suivi';
    liste.length = 0;
    let morts = 0;
    for (let i = Math.floor(x0 / CASE); i <= Math.floor(x1 / CASE); i++) for (let k = Math.floor(z0 / CASE); k <= Math.floor(z1 / CASE); k++) {
      const l = this._cases.get((i + 4096) * 8192 + (k + 4096));
      if (!l) continue;
      for (let j = 0; j < l.length; j++) {
        const e = l[j];
        if (e.tour === tour) continue;
        e.tour = tour;
        if (e.x1 < x0 || e.x0 > x1 || e.z1 < z0 || e.z0 > z1) continue;
        // (retiré de la scène depuis : un morceau libéré ; il sort de la case)
        let n = e.o;
        while (n && n !== sc) n = n.parent;
        if (!n) { l[j] = l[l.length - 1]; l.pop(); j--; e.tour = 0; morts++; continue; }
        // (fenêtre drapée : les sols des zones, posés sans ombre portée, ne sont pas des obstacles — voir _cuireFixe)
        if (suivi && !e.o.castShadow && !e.o.userData.ombreKit) continue;
        e.o.layers.enable(COUCHE);
        liste.push(e.o);
      }
    }
    // les objets qui bougent sont sur la couche : on les en retire le temps de la cuisson (_ramasser les y remet)
    for (const o of sc.children) if (o.userData.dynamique) o.traverse((d) => d.layers.disable(COUCHE));
    const balle = sc.userData.ball && sc.userData.ball.mesh;
    if (balle) balle.traverse((d) => d.layers.disable(COUCHE));
    if (suivi) this._carte(this.fixe, this.matFixe);
    else {
      this.cam.near = PIED; this.cam.far = HAUT_FIXE; this.cam.updateProjectionMatrix();
      this._carte(this.fixe, this.matFixe);
      this.cam.near = 0; this.cam.far = HAUT; this.cam.updateProjectionMatrix();
    }
    for (const o of liste) o.layers.disable(COUCHE);
    this.plan.material.uniforms.uFixe.value = 1;
    if (this.drape) this.drape.material.uniforms.uFixe.value = 1;
    this._ramasser();
    const st = this.stats || (this.stats = { cuissons: 0 });
    st.cuissons++; st.objets = liste.length; st.retires = (st.retires || 0) + morts; st.msCuisson = +(performance.now() - t0).toFixed(2);
  }

  // SUR LE RELIEF (js/monde.js, parc entier ; jamais appelé sur un terrain plat, où la fenêtre reste le plateau). Sur le
  // plateau, rien ne change : la fenêtre est le plateau, à plat. Dès que le joueur en sort, la fenêtre le SUIT (§ 3.6 :
  // 24 m à 32 texels par mètre en extrême, 16 m en moyenne, 12 m sur téléphone en basse), recentrée par pas de 4 m sur
  // la grille du monde, et le voile se DRAPE sur le sol : une grille au pas de la carte des hauteurs, posée sur Monde.sol
  // à chaque recentrage (draper). La caméra de dessous prend toute la tranche de la fenêtre, du sol le plus bas au plus haut plus HAUT ; les
  // matériaux de hauteur lisent la hauteur au-dessus du sol de chaque colonne. Avant (un plan à la hauteur du sol au
  // centre, la tranche de 2,2 m au-dessus de lui) : sur une pente, le sol lui-même et les allées entraient dans la
  // tranche, et une tache noire à bords nets s'étalait près du joueur dès qu'il sortait du plateau.
  // La carte fixe (bancs, pieds de murs) est recuite à chaque recentrage (lot R1 : sur la liste des objets fixes de la
  // fenêtre, voir _cuireFixeParCases).
  _suivre(S, j, qualite) {
    if (!this.RU || !j || (Monde.drapeaux(j.pos.x, j.pos.z) & DRAPEAU.PLATEAU)) { if (this.mode === 'suivi') this._modePlateau(S); return; }
    const T = TELEPHONE ? FENETRE.tel : FENETRE.pc, [W, Rt] = T[qualite] || T.high;
    if (this.mode !== 'suivi' || this._fen[0] !== W || this._fen[1] !== Rt) this._modeSuivi(W, Rt);
    // (recentrée sur les nœuds de la grille du monde : les sommets du voile tombent sur ceux du sol)
    const c = this._cadreH, cx = c.x0 + PAS_FENETRE * Math.round((j.pos.x - c.x0) / PAS_FENETRE);
    const cz = c.z0 + PAS_FENETRE * Math.round((j.pos.z - c.z0) / PAS_FENETRE);
    if (cx === this._cx && cz === this._cz) return;
    this._cx = cx; this._cz = cz;
    // la tranche : du sol le plus bas de la fenêtre (moins 30 cm) au plus haut plus HAUT
    let a = Infinity, b = -Infinity;
    for (let k = 0; k <= 12; k++) for (let i = 0; i <= 12; i++) {
      const y = Monde.sol(cx - W / 2 + i * W / 12, cz - W / 2 + k * W / 12); if (y < a) a = y; if (y > b) b = y;
    }
    const y0 = a - 0.3, span = b - a + 0.3 + HAUT + 0.2;
    this.cam.left = -W / 2; this.cam.right = W / 2; this.cam.top = W / 2; this.cam.bottom = -W / 2; this.cam.near = 0; this.cam.far = span;
    this.cam.updateProjectionMatrix();
    this.cam.position.set(cx, y0, cz); this.cam.lookAt(cx, y0 + 1, cz); this.cam.updateMatrixWorld();
    this.RU.uFenC.value.set(cx - W / 2, cz - W / 2, W, W);
    this.RU.uCamC.value.set(y0, span, 1 / this.w, 1 / this.h);
    // (lot R1 : découpé au pied des murs ; agrandi si la place prévue pour les carrés coupés ne suffit pas)
    const sol = this.scene.userData.solParc;
    while (draper(this.drape.geometry, cx - W / 2, cz - W / 2, sol) < 0) {
      const g = this.drape.geometry;
      this.drape.geometry = grilleDrapee(W, 2 * g.userData.coupes); g.dispose();
    }
    this.drape.material.uniforms.uMin.value.set(cx - W / 2, cz - W / 2);
    this._cuireFixe();
  }

  // Les cibles à la taille de la fenêtre (setSize : three les réalloue au prochain usage)
  _tailler(w, h, texelM) {
    this.w = w; this.h = h; this.texelM = texelM;
    for (const t of [this.brut, this.tmp, this.mobile, this.fixe]) t.setSize(w, h);
  }

  _modeSuivi(W, Rt) {
    this.mode = 'suivi'; this._fen = [W, Rt]; this._cx = this._cz = NaN;
    const n = Math.round(W * Rt);
    this._tailler(n, n, W / n);
    if (!this.drape) {
      const U = this.plan.material.uniforms;
      this.drape = new THREE.Mesh(grilleDrapee(W), new THREE.ShaderMaterial({
        uniforms: { ...U, uMin: { value: new THREE.Vector2() }, uTaille: { value: new THREE.Vector2(W, W) } },
        vertexShader: `varying vec3 vMondeP; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vMondeP = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp; }`,
        fragmentShader: fragmentPlan({ monde: OMBRE_MONDE_ACTIF, drape: true }),
        transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      }));
      this.drape.renderOrder = 2; this.drape.frustumCulled = false;
      this.drape.userData.dynamique = true;
      this.drape.name = 'ombres de contact (drapées)';
      this.scene.add(this.drape);
      // (l'occlusion ambiante ne le voit pas : js/fx.js masque ce qui est déclaré ici pendant sa passe de normales)
      (this.scene.userData.feuillages || (this.scene.userData.feuillages = [])).push(this.drape);
    } else if (this.drape.material.uniforms.uTaille.value.x !== W) {
      this.drape.geometry.dispose(); this.drape.geometry = grilleDrapee(W);
      this.drape.material.uniforms.uTaille.value.set(W, W);
    }
    this.drape.visible = true; this.plan.visible = false;
    this.RU.uRelief.value = 1;
  }

  _modePlateau(S) {
    this.mode = 'plateau';
    const R = TELEPHONE ? TEXELS_M.tel : TEXELS_M.pc;
    this._tailler(Math.min(2048, Math.round(S.W * R)), Math.min(2048, Math.round(S.L * R)), S.W / Math.min(2048, Math.round(S.W * R)));
    this.cam.left = -S.W / 2; this.cam.right = S.W / 2; this.cam.top = S.L / 2; this.cam.bottom = -S.L / 2; this.cam.near = 0; this.cam.far = HAUT;
    this.cam.updateProjectionMatrix();
    this.cam.position.set(S.cx, 0, S.cz); this.cam.lookAt(S.cx, 1, S.cz); this.cam.updateMatrixWorld();
    this._cx = S.cx; this._cz = S.cz;
    this.RU.uRelief.value = 0;
    if (this.drape) this.drape.visible = false;
    this.plan.visible = true;
    this._cuireFixe();
  }

  update(dt, qualite, ombres, joueur = null) {
    const S = this.scene.userData.solContact;
    if (!S) return;
    if (!this.pret) this._installer(S);
    if (!Monde.plat) this._suivre(S, joueur, qualite);
    // (fenêtre qui suit : un morceau de zone qui vient d'être construit sous elle — un banc, un muret — entre dans la carte
    // fixe ; deux fois par seconde au plus)
    if (this.mode === 'suivi' && (this._tMorceaux = (this._tMorceaux || 0) - dt) <= 0) {
      this._tMorceaux = 0.5;
      const ord = this.scene.userData.ordonnanceur, f = this.RU.uFenC.value, dx = Monde.dx;
      const vus = this._morceauxVus || (this._morceauxVus = new WeakSet());
      let neuf = false;
      for (const m of ord ? ord.morceaux : []) {
        if (!m.groupe || vus.has(m.groupe)) continue;
        vus.add(m.groupe);
        const b = m.boite;
        if (b[0] + dx < f.x + f.z && b[2] + dx > f.x && b[1] < f.y + f.w && b[3] > f.y) neuf = true;
      }
      if (neuf) this._cuireFixe();
    }
    // réglage « ombres : non » : on garde le décor (c'est de l'éclairage, pas une carte d'ombre), plus les joueurs
    const mobiles = ombres !== 'off';
    // le décor fixe se recuit quand l'ombre du sol l'a été (même signal : tous les chargements finis)
    const cuit = this.scene.userData.solCuit || 0;
    if (cuit !== this.cuisson) { this.cuisson = cuit; this._cases = null; this._cuireFixe(); }
    if (!mobiles) { this.plan.material.uniforms.uForce.value.x = 0; this.plan.material.uniforms.uForce.value.y = 0; return; }
    // (les réglages du terrain fondus une fois, pas à chaque image : relus seulement si le terrain en pose d'autres)
    const oc = this.scene.userData.ombreContact;
    if (!this._F || this._ocVu !== oc) { this._ocVu = oc; this._F = { ...DEFAUT, ...(oc || {}) }; }
    const F = this._F;
    this.plan.material.uniforms.uForce.value.x = F.contact; this.plan.material.uniforms.uForce.value.y = F.occlusion;
    this.plan.material.uniforms.uBorne.value = F.borne;
    // où est le soleil : la carte est RECRÉÉE à chaque changement de taille (js/fx.js), on la relit à chaque image
    const env = this.scene.userData.env, sun = env && env.sun, U = this.plan.material.uniforms;
    const actif = !!(sun && sun.castShadow && sun.shadow.map && this.renderer.shadowMap.enabled);
    U.uSoleil.value.x = actif ? 1 : 0;
    if (actif) {
      U.tSoleil.value = sun.shadow.map.texture;
      U.mSoleil.value.copy(sun.shadow.matrix);
      const sd = this.scene.userData.sunDir;
      const ciel = env.hemi.intensity + (this.scene.environment ? Math.PI * 0.65 * this.scene.environmentIntensity : 0);
      U.uSoleil.value.y = ciel / Math.max(1e-3, ciel + sun.intensity * sun.shadow.intensity * Math.max(0, sd ? sd.y : 1));
      U.uSoleil.value.z = sun.shadow.bias - 0.0003;     // environ 3,5 cm sur 119 m de profondeur
      // (parc entier : la carte qui suit le joueur est plus profonde, js/monde_ombres.js ; on garde les 3,5 cm)
      if (!Monde.plat) U.uSoleil.value.z = sun.shadow.bias - 0.0003 * 119 / Math.max(1, sun.shadow.camera.far - sun.shadow.camera.near);
    }
    // un nouvel avatar, un vélo enfourché, un joueur en ligne qui arrive : on ramasse deux fois par seconde
    this.tRamasse -= dt;
    if (this.tRamasse <= 0) { this.tRamasse = 0.5; this._ramasser(); }
    // en « basse », une image sur deux : l'ombre suit avec 16 ms de retard, invisible sous un joueur qui court
    this.n++;
    if (qualite === 'low' && (this.n & 1)) return;
    this._carte(this.mobile, this.matMobile, true);
  }
}
