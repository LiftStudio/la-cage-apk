// =====================================================================
//  LE MENU PRÊT AVANT DE LEVER LE RIDEAU (06/10/2026) — la fin de l'écran de chargement (js/chargement.js)
// =====================================================================
// Une fois les fichiers là et le terrain construit (js/main.js), il restait trois choses que le joueur voyait PAR-DESSUS
// le menu : les modèles et les clips qui finissaient d'arriver (le marchand en bonhomme de blocs, puis figé), et surtout
// la PREMIÈRE IMAGE, qui compilait d'un bloc tous les programmes de la scène — mesuré sur la Radeon intégrée : 12 s
// d'image figée, menu affiché mais inerte. On fait donc tout cela DERRIÈRE l'écran de chargement, barre à l'appui :
//
//   1. JOUEURS ET ANIMATIONS : tout ce que les chargeurs de three ont en cours (DefaultLoadingManager, suivi dès l'import
//      de ce module, donc avant la construction du terrain), le marchand et ses clips, le joueur choisi au menu.
//   2. EFFETS : Game.prechaufferScene, les programmes de la scène compilés EN PARALLÈLE par le pilote
//      (KHR_parallel_shader_compile) : le fil principal reste libre, la barre avance programme par programme.
//      (Lancer cette compilation dès le terrain construit, pendant les joueurs, n'a rien fait gagner : mesuré au deuxième
//      lancement, les avatars qui arrivent font alors la queue derrière les programmes du décor.)
//   3. PREMIÈRE IMAGE : la boucle du jeu démarre ici ; ce qui restait (passes du post-traitement) se compile dans cette
//      image-là, encore sous l'écran de chargement.
// Chaque attente a son plafond : un fichier qui ne vient pas, un pilote lent, jamais un écran bloqué pour de bon.
import * as THREE from 'three';

const M = THREE.DefaultLoadingManager;
const suivi = { lances: 0, finis: 0, t: performance.now() };
{
  // (itemStart / itemEnd sont des méthodes de l'instance : on les enveloppe, le gestionnaire garde son comportement —
  // js/court.js chaîne déjà son onLoad)
  const debut = M.itemStart, fin = M.itemEnd;
  M.itemStart = function (url) { suivi.lances++; suivi.t = performance.now(); return debut.call(this, url); };
  M.itemEnd = function (url) { suivi.finis++; suivi.t = performance.now(); return fin.call(this, url); };
}

const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));
// l'image suivante, ou 250 ms au plus (onglet caché : pas d'image)
const imageSuivante = () => new Promise((ok) => {
  let f = false; const fin = () => { if (!f) { f = true; ok(); } };
  requestAnimationFrame(() => requestAnimationFrame(fin)); setTimeout(fin, 250);
});

const CALME_MS = 500;            // plus rien en cours depuis... : les chargements en chaîne (clips après le modèle) ont démarré
const PLAFOND_JOUEURS = 30000, PLAFOND_MARCHAND = 8000, PLAFOND_SHADERS = 30000;

// LES TEXTURES DU JOUEUR CHOISI, envoyées à la carte graphique dès maintenant. Son aperçu (JOUER) clone les matériaux du
// fichier en cache, qui gardent les mêmes textures (js/player.js _loadAvatar) : elles sont alors déjà sur la carte. Mesuré
// sur PC (Radeon intégrée, deux passages de chaque) : la plus longue image après JOUER passe de 231-382 ms à 182-225 ms,
// et de 134-273 ms à 115 ms en entrant sur le terrain.
// (même filtrage que Player.preparerRendu, js/game.js : la texture n'aura pas à repartir)
function envoyerTextures(game, o) {
  const r = game.renderer;
  if (!o || !r || !r.initTexture) return;
  const an = (game.fx && game.fx._aniso) || 1, vues = new Set();
  o.traverse((m) => {
    if (!m.isMesh || !m.material) return;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
        const t = mat[k];
        if (!t || vues.has(t)) continue;
        vues.add(t);
        if (t.anisotropy < an) t.anisotropy = an;
        try { r.initTexture(t); } catch (e) { /* elle partira au premier dessin, comme avant */ }
      }
    }
  });
}

// `avatar` : la promesse du joueur choisi au menu (js/player.js prechargerModele), ou null
export async function preparerMenu(game, ch, { avatar = null } = {}) {
  // ---- 1. joueurs et animations ----
  ch.etape('joueurs', 0);
  let avatarPret = !avatar;
  if (avatar) Promise.resolve(avatar).then((gltf) => { avatarPret = true; envoyerTextures(game, gltf && gltf.scene); }, () => { avatarPret = true; });
  const t0 = performance.now();
  for (;;) {
    const enCours = suivi.lances - suivi.finis, ecoule = performance.now() - t0;
    ch.avance(suivi.lances ? suivi.finis / suivi.lances : 1);
    // le marchand : son modèle puis ses clips (Player._loadAnims) ; s'il n'en a pas, ou s'ils tardent, on n'insiste pas
    const m = game.merchant;
    const marchand = !m || !m.avatarUrl || !!m.anim || ecoule > PLAFOND_MARCHAND;
    const calme = enCours <= 0 && performance.now() - suivi.t > CALME_MS;
    if (calme && avatarPret && marchand) break;
    if (ecoule > PLAFOND_JOUEURS) { console.warn('[chargement] des modèles se chargent encore, on n\'attend plus :', enCours); break; }
    await pause(80);
  }
  ch.avance(1);

  // ---- 2. effets (programmes compilés en parallèle) ----
  ch.etape('shaders', 0);
  await ch.souffle();                      // le libellé peint avant la partie synchrone de la compilation
  const progs = game.renderer.info.programs, avant = new Set(progs);
  try { game.prechaufferScene(); } catch (e) { console.warn('[chargement] préchauffe :', e); }
  const neufs = progs.filter((p) => !avant.has(p));
  const t1 = performance.now();
  for (;;) {
    let prets = 0;
    for (const p of neufs) { try { if (p.isReady()) prets++; } catch (e) { prets++; } }
    ch.avance(neufs.length ? prets / neufs.length : 1);
    if (prets >= neufs.length) break;
    if (performance.now() - t1 > PLAFOND_SHADERS) { console.warn('[chargement] compilation encore en cours, on n\'attend plus :', neufs.length - prets); break; }
    await pause(50);
  }
  // (la préchauffe du menu de js/game.js repassera à 1,5 s, 4 s... : seulement pour ce qui arrive ensuite — les passants)

  // ---- 3. première image ----
  ch.etape('image', 0);
  await ch.souffle();
  ch.figerTrace?.();
  game.start();                            // la première image est rendue tout de suite (Game.start)
  ch.avance(0.6);
  await imageSuivante();
  ch.avance(1);
}
