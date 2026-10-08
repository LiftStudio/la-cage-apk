// =====================================================================
//  LES OPTIONS DU PARC ENTIER (lot C5 du chantier « parc complet »)
// =====================================================================
// Deux choix que la conception (§ 6) laissait à Haythem, avec leur valeur par défaut, réglables dans l'écran Options
// (onglet Graphismes, bloc « PARC DE BÉCON ») et lus ici par les zones et les arbres :
//
//   bassin  le bassin de la terrasse (zone Z05) : 'plante' (aujourd'hui : gazon et graminées, photo 171721 du 28/09,
//           par défaut) ou 'eau' (le MIROIR D'EAU À TROIS JETS d'avant 2016, photos j1 et j5) ;
//   saison  'automne' (fin septembre, par défaut : les feuillus jaunissent un peu, les marronniers roussissent, les
//           parterres sont en vivaces et graminées) ou 'printemps' (les cerisiers 'Kanzan' en fleurs roses, les
//           parterres de la perspective et le massif de la terrasse en tulipes : photos 1, 7 et 8).
//
// Les réglages sont dans settings.graphics (parcBassin, parcSaison : js/settings.js), sauvegardés avec les autres et remis
// par le bouton « Réinitialiser » de l'onglet. Pour les essais et les captures, l'adresse les force sans les écrire :
// ?bassin=eau, ?saison=printemps (comme ?parc=entier pour le drapeau du parc).
//
// CHANGER EN JOUANT. Rien n'est à recharger : brancherOptionsParc (appelé par js/parc/index.js une fois le parc installé)
// écoute les réglages et, quand une option change, fait refaire par l'ordonnanceur (js/monde_charge.js, refaire) les
// seuls morceaux de zone qui en dépendent — ceux qui le déclarent dans leur définition (`options: ['saison']`) — et
// change la saison des arbres (js/monde_vegetation.js, appliquerSaison). L'ancien décor d'un morceau reste affiché
// jusqu'à ce que le nouveau soit construit : on ne voit jamais de trou.
import { settings } from '../settings.js';

export const OPTIONS_PARC = {
  bassin: { reglage: 'graphics.parcBassin', valeurs: ['plante', 'eau'], defaut: 'plante' },
  saison: { reglage: 'graphics.parcSaison', valeurs: ['automne', 'printemps'], defaut: 'automne' },
};

// L'adresse (lue une fois) : ?bassin=eau, ?saison=printemps
const FORCEES = (() => {
  const f = {};
  try {
    const q = new URLSearchParams(location.search);
    for (const [nom, o] of Object.entries(OPTIONS_PARC)) { const v = q.get(nom); if (o.valeurs.includes(v)) f[nom] = v; }
  } catch (e) { /* hors navigateur (outils) */ }
  return f;
})();

// La valeur d'une option : l'adresse, sinon le réglage, sinon la valeur par défaut.
export function optionParc(nom) {
  const o = OPTIONS_PARC[nom];
  if (!o) return undefined;
  if (FORCEES[nom]) return FORCEES[nom];
  const v = settings.get(o.reglage);
  return o.valeurs.includes(v) ? v : o.defaut;
}
export const saisonParc = () => optionParc('saison');
export const bassinEnEau = () => optionParc('bassin') === 'eau';

// LE SON DES TROIS JETS (relecture du lot C5). Les sons du parc (lot C3, js/audio_parc.js, mené en même temps que
// celui-ci) ont une source pour les jets du bassin, qui ne joue que si le lot qui les construit l'annonce :
// `SONS_PARC.jetsBassin`, exporté par js/audio.js. On le lui dit, au branchement et à chaque changement du bassin. Par un
// import à la demande, et sans rien exiger : tant que js/audio.js n'a pas cet export, il ne se passe rien.
function sonDesJets() {
  import('../audio.js')
    .then((a) => { if (a.SONS_PARC) a.SONS_PARC.jetsBassin = bassinEnEau(); })
    .catch(() => { /* hors navigateur (outils) */ });
}

// Branche les options sur le parc installé : `ordonnanceur` (js/monde_charge.js), `vegetation` (js/monde_vegetation.js).
// Rend la fonction qui débranche.
export function brancherOptionsParc({ ordonnanceur = null, vegetation = null } = {}) {
  let avant = Object.fromEntries(Object.keys(OPTIONS_PARC).map((n) => [n, optionParc(n)]));
  sonDesJets();
  return settings.onChange(() => {
    const change = [];
    for (const n of Object.keys(OPTIONS_PARC)) { const v = optionParc(n); if (v !== avant[n]) { change.push(n); avant[n] = v; } }
    if (!change.length) return;
    if (change.includes('bassin')) sonDesJets();
    if (change.includes('saison') && vegetation && vegetation.appliquerSaison) vegetation.appliquerSaison(avant.saison);
    // les morceaux qui dépendent d'une option changée (leur définition le déclare : options: ['bassin'] ...)
    if (ordonnanceur && ordonnanceur.refaire) ordonnanceur.refaire((m) => Array.isArray(m.def.options) && m.def.options.some((o) => change.includes(o)));
  });
}
