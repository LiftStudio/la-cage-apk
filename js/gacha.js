// Vœux : les personnages ne sont pas tous débloqués en ligne, on les obtient en tirant, façon Genshin ou Clash Royale.
//
// Quatre raretés, chacune avec sa couleur et son nombre d'étoiles :
//   NORMAL     bleu        ★★★      le gros du roster
//   ÉPIQUE     violet      ★★★★
//   LÉGENDAIRE doré        ★★★★★
//   IMMORTEL   arc-en-ciel ★★★★★★   un seul personnage
//
// Deux garanties, comme dans tous les jeux du genre, pour qu'une mauvaise série ne dure pas éternellement :
//   - au plus tard au 10e vœu sans épique, l'épique est garanti ;
//   - au plus tard au 60e vœu sans légendaire, le légendaire (ou mieux) est garanti.
// Les compteurs sont gardés dans le porte-monnaie, donc ils survivent aux parties.
//
// Un doublon n'est jamais perdu : il monte d'un cran une capacité signature du personnage (dans la limite d'Or) et
// rapporte des pièces. C'est le seul moyen d'amener un perso à son maximum.

export const RARETES = {
  normal: { id: 'normal', nom: 'Normal', etoiles: 3, couleur: '#3b82f6', couleur2: '#60a5fa', taux: 0.740, doublon: 40 },
  epique: { id: 'epique', nom: 'Épique', etoiles: 4, couleur: '#a855f7', couleur2: '#c084fc', taux: 0.200, doublon: 90 },
  legendaire: { id: 'legendaire', nom: 'Légendaire', etoiles: 5, couleur: '#ffc93c', couleur2: '#ffe08a', taux: 0.050, doublon: 220 },
  immortel: { id: 'immortel', nom: 'Immortel', etoiles: 6, couleur: '#ff4fa3', couleur2: '#4dd0ff', taux: 0.010, doublon: 600, arc: true },
};
export const ORDRE = ['normal', 'epique', 'legendaire', 'immortel'];
export const rarete = (id) => RARETES[id] || RARETES.normal;

// Rareté de chaque personnage, choisie par Haythem. Si une rareté n'a aucun personnage, les tirages qui tombent
// dessus redescendent d'un cran (voir `raretePleine`). Le panier épique est resté vide jusqu'à Marc Antoine
// (04/10/2026) : depuis, la garantie « épique » s'affiche et le vœu ×10 donne bien un vrai 4 étoiles.
export const RARETE_PERSO = {
  haythem: 'immortel',
  koji: 'immortel',                 // (02/10/2026) choisi par Haythem
  ethan: 'legendaire',
  antoine: 'legendaire',            // (04/10/2026) choisi par Haythem
  marcantoine: 'epique',            // (04/10/2026) choisi par Haythem : le premier épique
  nemanja: 'legendaire',            // (04/10/2026) choisi par Haythem
  imad: 'epique',                   // (04/10/2026) choisi par Haythem
  gabriel: 'epique',                // (04/10/2026) choisi par Haythem
  yazid: 'epique',                  // (06/10/2026) choisi par Haythem
  clovis: 'normal', lamine: 'normal', djafar: 'normal', haris: 'normal',
  aiden: 'normal', titouan: 'normal', nico: 'normal', massyl: 'normal',
  boateng: 'normal', haddad: 'normal', novak: 'normal', dasilva: 'normal',
};
// Haythem est l'avatar du joueur : il est acquis d'entrée, même en immortel. Ses doublons servent à monter
// ses capacités signature au maximum.
export const PERSO_DEPART = 'haythem';

// Prix des vœux, en jetons. Le vœu à dix en coûte neuf : le dixième est offert, et il garantit au moins un épique.
export const COUT_1 = 1;
export const COUT_10 = 9;
export const PRIX_JETON = 220;        // achat d'un jeton chez Pierrick, en pièces
export const GARANTIE_EPIQUE = 10;    // vœux sans épique avant de l'avoir d'office
export const GARANTIE_LEGENDAIRE = 60;

// Gains de jetons en jouant : c'est la boucle qui fait vivre les vœux sans passer par la boutique.
export const JETONS = { matchJoue: 1, matchGagne: 2, record: 1, premierPanierDuJour: 0 };

// Y a-t-il au moins un personnage de cette rareté ? Sinon on redescend d'un cran, jusqu'à en trouver une pleine.
// Ça évite d'avoir à réécrire les taux chaque fois qu'une rareté est vide, et ça absorbe l'ajout d'un perso plus tard.
export function raretePleine(roster, r) {
  let i = ORDRE.indexOf(r);
  while (i >= 0 && !roster.some((p) => (RARETE_PERSO[p.id] || 'normal') === ORDRE[i])) i--;
  return ORDRE[Math.max(0, i)];
}

// Taux réellement appliqués : ceux d'une rareté vide sont reversés à la rareté pleine juste en dessous.
export function tauxReels(roster) {
  const out = {};
  for (const id of ORDRE) out[id] = 0;
  for (const id of ORDRE) out[raretePleine(roster, id)] += RARETES[id].taux;
  return out;
}

// Tire une rareté. `sansEpique` et `sansLegendaire` sont les compteurs de garantie.
function tirerRarete(rnd, sansEpique, sansLegendaire) {
  if (sansLegendaire >= GARANTIE_LEGENDAIRE - 1) return rnd() < 0.12 ? 'immortel' : 'legendaire';
  if (sansEpique >= GARANTIE_EPIQUE - 1) {
    const r = rnd();
    return r < 0.02 ? 'immortel' : r < 0.14 ? 'legendaire' : 'epique';
  }
  const r = rnd();
  let acc = 0;
  for (const id of ORDRE) { acc += RARETES[id].taux; if (r < acc) return id; }
  return 'normal';
}

// Un vœu. `etat` porte les compteurs de garantie et la collection ; il est modifié sur place.
// Renvoie { perso, rarete, doublon, pieces, capacite } — `capacite` = la capacité montée d'un cran par le doublon.
export function voeu(roster, etat, rnd = Math.random) {
  const r = tirerRarete(rnd, etat.sansEpique || 0, etat.sansLegendaire || 0);
  // compteurs de garantie
  etat.sansEpique = r === 'normal' ? (etat.sansEpique || 0) + 1 : 0;
  etat.sansLegendaire = r === 'legendaire' || r === 'immortel' ? 0 : (etat.sansLegendaire || 0) + 1;

  const rp = raretePleine(roster, r);
  const pool = roster.filter((p) => (RARETE_PERSO[p.id] || 'normal') === rp);
  if (!pool.length) return null;                                 // aucun personnage du tout : rien à tirer
  const perso = pool[Math.floor(rnd() * pool.length)];
  const deja = etat.persos.includes(perso.id);
  if (!deja) etat.persos.push(perso.id);

  const out = { perso, rarete: rp, doublon: deja, pieces: 0, capacite: null };
  if (deja) {
    out.pieces = rarete(rp).doublon;
    // le doublon monte une capacité signature du personnage, au maximum Or
    const sig = Object.keys(perso.badges || {});
    const dispo = sig.filter((b) => ((etat.plus[perso.id] || {})[b] || 0) + (perso.badges[b] || 0) < 3);
    if (dispo.length) {
      const b = dispo[Math.floor(rnd() * dispo.length)];
      etat.plus[perso.id] = { ...(etat.plus[perso.id] || {}), [b]: ((etat.plus[perso.id] || {})[b] || 0) + 1 };
      out.capacite = b;
    }
  }
  return out;
}

// Dix vœux d'un coup, avec au moins un épique garanti dans le lot.
export function voeuX10(roster, etat, rnd = Math.random) {
  const out = [];
  for (let i = 0; i < 10; i++) { const v = voeu(roster, etat, rnd); if (v) out.push(v); }
  if (!out.some((v) => v.rarete !== 'normal')) {
    // aucun épique sorti : on remplace le dernier par un épique, comme le fait le vœu à dix partout ailleurs
    // « au moins un épique » devient « au moins la rareté pleine juste au-dessus de normal » tant qu'aucun
    // personnage 4 étoiles n'existe : la promesse du vœu à dix reste tenue.
    const cible = ORDRE.find((id) => id !== 'normal' && roster.some((p) => RARETE_PERSO[p.id] === id)) || null;
    const pool = cible ? roster.filter((p) => RARETE_PERSO[p.id] === cible) : [];
    if (pool.length) {
      const perso = pool[Math.floor(rnd() * pool.length)];
      const deja = etat.persos.includes(perso.id);
      if (!deja) etat.persos.push(perso.id);
      out[9] = { perso, rarete: cible, doublon: deja, pieces: deja ? RARETES[cible].doublon : 0, capacite: null, garanti: true };
      etat.sansEpique = 0;
    }
  }
  return out;
}

// Regroupe la collection pour l'affichage : par rareté, du plus rare au plus commun.
export function collection(roster, persos) {
  return [...ORDRE].reverse().map((id) => ({
    rarete: RARETES[id],
    persos: roster.filter((p) => (RARETE_PERSO[p.id] || 'normal') === id)
      .map((p) => ({ def: p, possede: persos.includes(p.id) })),
  })).filter((g) => g.persos.length);
}

export const etoiles = (r) => '★'.repeat(rarete(r).etoiles);
