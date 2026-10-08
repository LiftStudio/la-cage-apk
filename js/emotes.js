// Emotes (danses, chambrage, célébrations) : roue ouverte avec la touche « emote » (T par défaut).
// clip = nom dans assets/anims/manifest.json (les danses sont des clips Mixamo retargetés) ; proc = pose de secours
// pour les bonshommes procéduraux (fiches sans avatar 3D) ; loop = la danse continue jusqu'à ce qu'on bouge.
// procOnly = pas de clip du tout : la chorégraphie maison pilote aussi les avatars 3D (Player._pose).
// price = emote à acheter chez le marchand (onglet EMOTES) ; sans price, elle est là dès le départ.
export const EMOTES = [
  // ---- offertes ----
  { id: 'hiphop',  label: 'Hip-hop',   icon: '🕺', clip: 'dance_hiphop',  proc: 'dance', loop: true,  cat: 'Danses' },
  { id: 'gangnam', label: 'Gangnam',   icon: '🐎', clip: 'dance_gangnam', proc: 'dance', loop: true,  cat: 'Danses' },
  { id: 'break',   label: 'Break',     icon: '🌀', clip: 'dance_break',   proc: 'dance', loop: true,  cat: 'Danses' },
  { id: 'chicken', label: 'Poulet',    icon: '🐔', clip: 'dance_chicken', proc: 'flap',  loop: true,  cat: 'Danses' },
  { id: 'ymca',    label: 'YMCA',      icon: '🙌', clip: 'dance_ymca',    proc: 'arms',  loop: true,  cat: 'Danses' },
  { id: 'taunt',   label: 'Chambrer',  icon: '😏', clip: 'taunt',         proc: 'taunt', loop: false, cat: 'Chambrage' },
  { id: 'clap',    label: 'Applaudir', icon: '👏', clip: 'celebrate_2',   proc: 'clap',  loop: false, cat: 'Célébrations' },
  { id: 'victory', label: 'Victoire',  icon: '🏆', clip: 'victory',       proc: 'victory', loop: false, cat: 'Célébrations' },

  // ---- à acheter chez Pierrick ----
  { id: 'ovation',  label: 'Ovation',     icon: '📣', clip: 'celebrate_3', proc: 'clap', loop: false, price: 60,  cat: 'Célébrations', desc: 'Tu salues la foule.' },
  { id: 'muscles',  label: 'Muscles',     icon: '💪', proc: 'muscles',  procOnly: true, loop: true,  price: 90,  cat: 'Style', desc: 'Double biceps face au défenseur.' },
  { id: 'robot',    label: 'Le robot',    icon: '🤖', proc: 'robot',    procOnly: true, loop: true,  price: 120, cat: 'Style', desc: 'Saccadé, très sérieux.' },
  { id: 'facepalm', label: 'Facepalm',    icon: '🤦', proc: 'facepalm', procOnly: true, loop: false, price: 70,  cat: 'Chambrage', desc: 'Quand ton coéquipier rate tout seul.' },
  { id: 'sleep',    label: 'Trop facile', icon: '😴', proc: 'sleep',    procOnly: true, loop: true,  price: 100, cat: 'Chambrage', desc: 'Tu t’endors sur le terrain.' },
  { id: 'moonwalk', label: 'Moonwalk',    icon: '🌙', proc: 'moonwalk', procOnly: true, loop: true,  price: 150, cat: 'Danses', desc: 'Le grand classique, sur place.' },

  // RÉPARÉES. Ces quatre-là étaient vendues mais rejouaient l'animation d'une AUTRE emote du même rayon :
  // « Pompes » rejouait « Muscles », « Salut » rejouait « Applaudir », « Appelle-moi » rejouait
  // « Chambrer », et « La couronne » désignait une pose qui n'existe pas, donc retombait sur le repli.
  { id: 'couronne',  label: 'La couronne',  icon: '👑', proc: 'couronne',  procOnly: true, loop: false, price: 130, cat: 'Célébrations', desc: 'Tu poses la couronne sur ta tête.' },
  { id: 'telephone', label: 'Appelle-moi',  icon: '🤙', proc: 'telephone', procOnly: true, loop: false, price: 80,  cat: 'Chambrage', desc: 'Tu mimes le téléphone au défenseur.' },
  { id: 'salut',     label: 'Salut',        icon: '🫡', proc: 'salut',     procOnly: true, loop: false, price: 60,  cat: 'Célébrations', desc: 'Respect, l’ami.' },
  // « Flexions » est restée : c'était le repli quand les vraies pompes étaient impossibles (aucun tangage
  // sur le mesh). Depuis js/couches.js le corps entier peut basculer, et les POMPES existent (plus bas).
  { id: 'squat',     label: 'Flexions',     icon: '🏋', proc: 'squat',     procOnly: true, loop: true,  price: 110, cat: 'Style', desc: 'Tu t’échauffes en plein match.' },

  // ---- NOUVELLES : aucune n'a besoin du moindre fichier ----
  { id: 'croise',    label: 'Bras croisés',   icon: '🧘', proc: 'croise',    procOnly: true, loop: true,  price: 80,  cat: 'Chambrage', desc: 'Tu attends qu’il finisse.' },
  { id: 'pointer',   label: 'Je te vois',     icon: '👉', proc: 'pointer',   procOnly: true, loop: false, price: 70,  cat: 'Chambrage', desc: 'Le bras tendu vers le défenseur.' },
  { id: 'chrono',    label: 'Il est l’heure', icon: '⏱️', proc: 'chrono',    procOnly: true, loop: false, price: 90,  cat: 'Chambrage', desc: 'Tu tapes ton poignet : le temps passe.' },
  { id: 'epaule',    label: 'J’époussette',   icon: '🧹', proc: 'epaule',    procOnly: true, loop: false, price: 100, cat: 'Chambrage', desc: 'Tu balaies la poussière sur ton épaule.' },
  { id: 'troppetit', label: 'Trop petit',     icon: '🤏', proc: 'troppetit', procOnly: true, loop: false, price: 110, cat: 'Chambrage', desc: 'Il manquait un tout petit peu.' },
  { id: 'nonnon',    label: 'Non, non',       icon: '☝️', proc: 'nonnon',    procOnly: true, loop: false, price: 90,  cat: 'Chambrage', desc: 'Après un contre : non.' },
  { id: 'shimmy',    label: 'Shimmy',         icon: '✨', proc: 'shimmy',    procOnly: true, loop: true,  price: 140, cat: 'Danses', desc: 'Les épaules parlent pour toi.' },
  { id: 'mainor',    label: 'Main chaude',    icon: '🔥', proc: 'mainor',    procOnly: true, loop: false, price: 130, cat: 'Célébrations', desc: 'Tir imaginaire, poignet cassé, tu regardes.' },
  { id: 'lacets',    label: 'Mes lacets',     icon: '👟', proc: 'lacets',    procOnly: true, loop: false, price: 80,  cat: 'Style', desc: 'Tu renoues tranquillement.' },
  { id: 'etirement', label: 'Échauffement',   icon: '🙆', proc: 'etirement', procOnly: true, loop: true,  price: 70,  cat: 'Style', desc: 'Tu étires les épaules, l’air de rien.' },
  { id: 'ymca2',     label: 'YMCA (l’autre)', icon: '🙋', clip: 'dance_ymca_a', proc: 'arms', loop: true,  price: 120, cat: 'Danses', desc: 'La deuxième chorégraphie du même fichier.' },
  { id: 'pompes',    label: 'Pompes',          icon: '🏋️', proc: 'pompes',    procOnly: true, loop: true,  price: 120, cat: 'Style', desc: 'De vraies pompes, en plein terrain.' },
  { id: 'tourne',    label: 'Le tour complet', icon: '🔄', clip: 'spin_alt',    proc: 'dance', loop: false, price: 90, cat: 'Style', desc: 'Un tour sur toi-même, plein axe.' },
];

// Huit emplacements : c'est EXACTEMENT les touches 1 à 8, et c'est aussi ce que la roue peut afficher sans
// que les secteurs se chevauchent. À trente emotes elle devenait illisible, sur téléphone surtout.
export const EMOTE_SLOTS = 8;
export const EMOTE_CATS = ['Danses', 'Chambrage', 'Célébrations', 'Style'];

// La roue montre EXACTEMENT ce que le joueur a équipé. Surtout pas de remplissage automatique ici : l'emote
// qu'on vient de retirer serait remise dans la foulée et le bouton RETIRER ne ferait rien. Le premier
// remplissage se fait une seule fois, à l'assainissement du portefeuille (js/shop.js).
export const roueEmotes = (wallet) => {
  const eq = (wallet && wallet.data && wallet.data.equipped.emotes) || [];
  const l = eq.map((id) => EMOTES.find((e) => e.id === id)).filter(Boolean);
  return l.length ? l : EMOTES.filter((e) => !e.price).slice(0, EMOTE_SLOTS);
};

export const EMOTE_MAX = 14;   // durée max d'une emote en boucle (s)

// emotes disponibles dans la roue : celles d'origine + celles achetées
export const ownedEmotes = (wallet) => EMOTES.filter((e) => !e.price || (wallet && wallet.owns('emote_' + e.id)));
