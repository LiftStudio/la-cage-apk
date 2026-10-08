// Capacités (façon badges NBA 2K) : à stats égales, deux joueurs ne jouent plus pareil.
//
// Chaque capacité a trois niveaux (bronze, argent, or). Le niveau multiplie l'effet. Les joueurs du roster ont des
// capacités « signature » (champ `badges` de leur fiche) ; le joueur, lui, débloque les siennes avec ses points
// d'entraînement, dans l'onglet CAPACITÉS du marchand.
//
// Tout passe par `badgeFx(joueur)` qui aplatit les capacités en un seul objet de coefficients. Les formules de jeu
// lisent ce cumul (voir Game.doShot, contestBall, attemptSteal, pumpFake, Player.move...). Une capacité absente vaut
// zéro partout : le jeu se comporte exactement comme avant si personne n'a de capacité.

export const TIERS = ['', 'Bronze', 'Argent', 'Or'];
export const TIER_COLOR = ['#666', '#c88b52', '#c9ccd4', '#ffc93c'];
export const BADGE_MAX = 3;

// coût en points d'entraînement pour passer au niveau n (1, 2 puis 3)
export const badgeCost = (n) => [60, 150, 320][n] ?? 999;

export const BADGES = [
  // ---------------- tir ----------------
  { id: 'sniper', name: 'Sniper', icon: '🎯', cat: 'Tir',
    desc: 'Plus adroit de loin quand personne ne te gêne.',
    fx: (t) => ({ openThree: 0.04 * t }) },
  { id: 'sangfroid', name: 'Sang-froid', icon: '🧊', cat: 'Tir',
    desc: 'Tu tires aussi bien avec une main dans la figure.',
    fx: (t) => ({ contested: 0.07 * t }) },
  { id: 'portee', name: 'Portée illimitée', icon: '📡', cat: 'Tir',
    desc: 'Ta zone de confort recule : les bombes coûtent moins cher.',
    fx: (t) => ({ range: 0.6 * t }) },
  { id: 'poignet', name: 'Poignet sûr', icon: '⌚', cat: 'Tir',
    desc: 'La fenêtre du lâcher parfait s\'élargit.',
    fx: (t) => ({ meter: 0.10 * t }) },
  { id: 'clutch', name: 'Clutch', icon: '⏱️', cat: 'Tir',
    desc: 'Tu montes en puissance dans les derniers points du match.',
    fx: (t) => ({ clutch: 0.05 * t }) },

  // ---------------- finition ----------------
  { id: 'acrobate', name: 'Acrobate', icon: '🤸', cat: 'Finition',
    desc: 'Tes layups passent même dans le trafic.',
    fx: (t) => ({ finish: 0.06 * t }) },
  { id: 'posterizer', name: 'Posterizer', icon: '💥', cat: 'Finition',
    desc: 'Tu dunkes plus facilement, même à l\'arrêt.',
    fx: (t) => ({ dunk: 0.05 * t, dunkSeuil: 5 * t }) },
  { id: 'costaud', name: 'Costaud', icon: '🪨', cat: 'Finition',
    desc: 'Le contact ne te sort plus de ton axe.',
    fx: (t) => ({ contact: 0.12 * t }) },

  // ---------------- dribble ----------------
  { id: 'mains', name: 'Mains sûres', icon: '🧤', cat: 'Dribble',
    desc: 'Beaucoup plus dur de te prendre la balle.',
    fx: (t) => ({ hands: 0.045 * t }) },
  { id: 'chevilles', name: 'Casse-chevilles', icon: '🌀', cat: 'Dribble',
    desc: 'Ton changement de main peut déséquilibrer le défenseur.',
    fx: (t) => ({ ankle: 0.07 * t }) },
  { id: 'comedien', name: 'Comédien', icon: '🎭', cat: 'Dribble',
    desc: 'Tes feintes de tir font mordre beaucoup plus souvent.',
    fx: (t) => ({ fake: 0.07 * t }) },
  { id: 'meneur', name: 'Meneur de jeu', icon: '🎁', cat: 'Dribble',
    desc: 'Tes passes sont plus difficiles à intercepter.',
    fx: (t) => ({ pass: 0.025 * t }) },

  // ---------------- défense ----------------
  { id: 'muraille', name: 'Muraille', icon: '🛡️', cat: 'Défense',
    desc: 'Tu contres nettement plus.',
    fx: (t) => ({ block: 0.035 * t }) },
  { id: 'pickpocket', name: 'Pickpocket', icon: '🖐️', cat: 'Défense',
    desc: 'Tes tentatives de vol aboutissent plus souvent.',
    fx: (t) => ({ steal: 0.035 * t }) },
  { id: 'aspirateur', name: 'Aspirateur', icon: '🧲', cat: 'Défense',
    desc: 'Tu gagnes plus de rebonds et tu montes plus haut.',
    fx: (t) => ({ reb: 0.15 * t, reach: 0.07 * t }) },
  { id: 'harceleur', name: 'Harceleur', icon: '👣', cat: 'Défense',
    desc: 'Ta présence gêne davantage le tireur.',
    fx: (t) => ({ contest: 0.04 * t }) },

  // ---------------- athlétisme ----------------
  { id: 'moteur', name: 'Moteur', icon: '🫁', cat: 'Athlétisme',
    desc: 'Ton endurance descend beaucoup moins vite.',
    fx: (t) => ({ stamina: 0.16 * t }) },
  { id: 'fusee', name: 'Fusée', icon: '⚡', cat: 'Athlétisme',
    desc: 'Tu cours plus vite balle en main.',
    fx: (t) => ({ speed: 0.035 * t }) },
  { id: 'ressort', name: 'Ressort', icon: '🦘', cat: 'Athlétisme',
    desc: 'Tu sautes plus haut, au contre comme au rebond.',
    fx: (t) => ({ jump: 0.06 * t }) },
];

export const badgeById = (id) => BADGES.find((b) => b.id === id) || null;
export const BADGE_CATS = [...new Set(BADGES.map((b) => b.cat))];

// Aplatit un dictionnaire { idCapacité: niveau } en un seul objet de coefficients cumulés.
export function badgeFx(map) {
  const out = {};
  if (!map) return out;
  for (const [id, t] of Object.entries(map)) {
    const b = badgeById(id);
    if (!b || !t) continue;
    for (const [k, v] of Object.entries(b.fx(Math.min(BADGE_MAX, t)))) out[k] = (out[k] || 0) + v;
  }
  return out;
}

// Liste lisible pour l'interface : [{ badge, tier }] triée par niveau décroissant.
export function badgeList(map) {
  if (!map) return [];
  return Object.entries(map)
    .map(([id, t]) => ({ badge: badgeById(id), tier: Math.min(BADGE_MAX, t) }))
    .filter((e) => e.badge && e.tier > 0)
    .sort((a, b) => b.tier - a.tier || a.badge.name.localeCompare(b.badge.name));
}
