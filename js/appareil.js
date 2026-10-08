// =====================================================================
//  L'APPAREIL : téléphone ou pas (06/10/2026) — UNE seule détection pour tout le jeu.
//
//  Une quinzaine de modules la refaisaient chacun à sa façon (agent du navigateur, pointeur grossier, nombre de points
//  de contact, puce graphique), et ne tombaient pas toujours d'accord : sur une tablette avec clavier, ou sous `?tel=1`
//  — que seuls js/fx.js et js/player.js écoutaient —, le décor se croyait sur PC pendant que le rendu se croyait au
//  téléphone. La règle retenue est celle de la majorité d'entre eux :
//    - un agent de téléphone ou de tablette (Android, iPhone, iPad, iPod, « Mobile ») ;
//    - ou un écran tactile dont le pointeur PRINCIPAL est grossier (l'iPad d'iPadOS se dit « Macintosh ») ;
//    - et l'adresse a le dernier mot : `?tel=1` fait passer un PC pour un téléphone (tester la branche mobile sans
//      téléphone), `?tel=0` l'inverse.
//  (07/10/2026, régression n° 7) UN PC À ÉCRAN TACTILE n'est pas un téléphone. Un portable Windows tactile annonce des points
//  de contact ET un pointeur principal grossier dès que son écran tactile est l'entrée principale (mode tablette, clavier
//  détaché) : il prenait toute la branche mobile (rendu au téléphone, plafond de texture, commandes à l'écran). Il faut
//  désormais aussi qu'AUCUN pointeur fin ne soit présent (`any-pointer: fine` : souris ou pavé tactile) — un téléphone ou
//  une tablette sans souris n'en a pas.
//  Ce module n'importe rien : tout le monde peut l'importer, sans boucle d'imports (js/player.js ne pouvait pas importer
//  js/monde_charge.js). Les modules qui ont encore leur propre test (court*.js, monde_*.js, pedestrians.js,
//  eclairage_perso.js, tex_cuites.js, player.js...) peuvent le remplacer par `import { TELEPHONE } from './appareil.js'`.
// =====================================================================
export const TELEPHONE = (() => {
  try {
    const q = new URLSearchParams(location.search).get('tel');
    if (q === '1') return true;
    if (q === '0') return false;
  } catch (e) { /* pas d'adresse (outils) */ }
  try {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
      || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches);
  } catch (e) { return false; }                     // hors navigateur (outils)
})();
