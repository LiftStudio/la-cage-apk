// LES GESTES DE DRIBBLE EN RYTHME — données pures, lues par js/dribble.js.
//
// Un geste n'est pas un clip : c'est une suite d'ÉTAPES, et une étape = UN rebond du planificateur de dribble
// (même poussée résolue, même rebond physique, même reprise calée sur les appuis) dont on change les points :
// où la main lâche la balle, par où elle la fait passer, où elle rebondit, quelle main la reprend et à quelle
// hauteur, combien de temps la main la garde, à quelle vitesse elle la pousse. Les jambes restent celles de
// la course : c'est ce qui fait un dribble « à la 2K » — on ne s'arrête plus pour faire un geste.
//
// NOTATION (valeurs pour un joueur de 1,90 m, multipliées par s = taille / 1,90) :
//   - repère G du joueur : +x = sa GAUCHE, +z = devant, y = hauteur (centre du ballon, R = 0,12 au sol) ;
//   - x d'un point est donné du côté de la main de DÉPART : x > 0 = côté où est la balle au départ, x < 0 =
//     côté de la nouvelle main. `dx` = écart vers l'extérieur de la poche (poche = geo.lat) ;
//   - zRef : 'C' = poche de reprise (geo.zC + z), 'R' = poche de lâcher (geo.zR + z), 'A' = z absolu ;
//   - lâcher : dy = écart à la hauteur de lâcher normale (geo.yR), ou yA = hauteur absolue ;
//   - reprise : fenêtre de hauteur [yR + bas ; yCat + haut], ou [yMin ; yMax] absolus, ou autour du sommet
//     de la poche (sommet : [yTop + min ; yTop + max]) ;
//   - pied : 'oppose' = rythme normal (pied opposé à la main), 'libre' = le premier appui qui convient ;
//   - vit : facteur de vitesse du joueur [avant, après] ; la bascule a lieu à l'impact (ou au lâcher) ;
//   - corps : courbes du buste sur les quatre instants [lancement, lâcher, impact, reprise] — ry > 0 = buste
//     tourné vers le côté de départ, rz > 0 = penché vers lui, rx > 0 = fléchi en avant.
//
// `change` : le geste fait passer la balle dans l'autre main. `duree` : durée annoncée (réseau, repli).
// `cd` : délai avant le geste suivant. `repli` : clip de mocap joué si le module n'a pas la balle.

export const GESTES = {
  // CROSSOVER : la balle traverse devant le corps en V, l'autre main la cueille. Les épaules « vendent »
  // l'ancien côté puis passent.
  cross: {
    change: true, duree: 0.45, cd: 0.30,
    etapes: [{
      pied: 'libre', garde: [0, 0.08], vDes: 4.2,
      lacher: { x: 0.18, zRef: 'C', z: 0.02, dy: -0.08 },
      rebond: { x: -0.05, zRef: 'C', z: 0.10 },
      reprise: { dx: 0.02, zRef: 'C', z: 0, bas: 0.02, haut: -0.12 },
      vit: [0.92, 0.95],
      corps: { ry: [0.08, 0, -0.12, 0], rz: [0, 0, -0.05, 0], rx: [0, 0.06, 0.06, 0] },
    }],
  },
  // GRAND CROSSOVER (casse-chevilles, déclenché par croiserDevant) : la balle est tenue haut un instant
  // (le « hang »), tirée vers l'extérieur, puis claquée large de l'autre côté. Le buste vend fort.
  ankle: {
    change: true, duree: 0.50, cd: 0.35, apres: { t: 0.35, k: 1.12 },
    etapes: [{
      pied: 'libre', garde: [0.04, 0.12], vDes: 4.2,
      via: { t: 0.40, x: 0.32, zRef: 'C', z: -0.02 },
      lacher: { x: 0.20, zRef: 'C', z: 0.02, dy: -0.10 },
      rebond: { x: -0.10, zRef: 'C', z: 0.14 },
      reprise: { dx: 0.06, zRef: 'C', z: 0.04, bas: -0.02, haut: -0.06 },
      vit: [0.86, 1.12],
      corps: { ry: [0.16, 0.10, -0.16, 0], rz: [0.06, 0.04, -0.10, 0], rx: [0, 0.10, 0.18, 0] },
    }],
  },
  // ENTRE LES JAMBES : la balle rebondit entre les pieds (le pied de la nouvelle main est devant, c'est le
  // rythme normal) et remonte derrière la jambe avant, dans l'autre main. Au-delà de 4,5 m/s : dans le dos.
  legs: {
    change: true, duree: 0.50, cd: 0.35, vMax: 4.5, sinon: 'back',
    etapes: [{
      pied: 'oppose', garde: [0, 0.08], vDes: 4.0,
      lacher: { x: 0.22, zRef: 'A', z: 0.10, dy: -0.02 },
      rebond: { x: 0, zRef: 'A', z: 0.03 },
      reprise: { x: -0.32, zRef: 'A', z: -0.06, yMin: 0.80, yMax: 0.92 },
      vit: [0.80, 0.90],
      corps: { ry: [0.06, 0.06, 0, 0], rx: [0.04, 0.12, 0.12, 0] },
    }],
    surPlace: [{
      pied: 'oppose', garde: [0.08, 0.16], vDes: 4.0,
      lacher: { x: 0.24, zRef: 'A', z: 0.12, yA: 0.74 },
      rebond: { x: 0, zRef: 'A', z: 0.04 },
      reprise: { x: -0.28, zRef: 'A', z: -0.04, yMin: 0.72, yMax: 0.84 },
      corps: { ry: [0.06, 0.08, 0, 0], rx: [0.04, 0.14, 0.14, 0] },
      ciseau: true,
    }],
  },
  // DANS LE DOS : la main enroule la balle autour du bassin, elle rebondit dehors et derrière le pied de la
  // nouvelle main et remonte dans cette main. Le buste tourne (ça rapproche l'épaule de la balle).
  back: {
    change: true, duree: 0.55, cd: 0.35,
    etapes: [{
      pied: 'oppose', garde: [0.10, 0.16], vDes: 3.6,
      via: { t: 0.45, x: 0.05, zRef: 'A', z: -0.20 },
      lacher: { x: -0.14, zRef: 'A', z: -0.16, yA: 0.86 },
      rebond: { x: -0.30, zRef: 'A', z: -0.05 },
      reprise: { dx: 0.04, zRef: 'C', z: 0, bas: 0, haut: -0.04 },
      vit: [0.90, 0.95],
      corps: { ry: [0.12, 0.30, 0.05, -0.06], rx: [0, 0.06, 0.04, 0] },
    }],
    surPlace: [{
      pied: 'oppose', garde: [0.10, 0.18], vDes: 3.6,
      via: { t: 0.50, x: 0.02, zRef: 'A', z: -0.24 },
      lacher: { x: -0.12, zRef: 'A', z: -0.22, yA: 0.84 },
      rebond: { x: -0.18, zRef: 'A', z: -0.30 },
      reprise: { x: -0.30, zRef: 'A', z: -0.08, yMin: 0.74, yMax: 0.86 },
      corps: { ry: [0.12, 0.30, 0.05, -0.06], rx: [0, 0.08, 0.06, 0] },
    }],
  },
  // IN-AND-OUT : la main rentre la balle vers le milieu comme pour un crossover (les épaules y croient),
  // la paume roule dessus et la ressort du même côté. Même main.
  inout: {
    change: false, duree: 0.45, cd: 0.30, apres: { t: 0.30, k: 1.08 },
    etapes: [{
      pied: 'oppose', garde: [0.04, 0.12], vDes: 3.8,
      via: { t: 0.45, x: 0.08, zRef: 'C', z: 0.06 },
      lacher: { dx: 0.02, zRef: 'R', z: 0, dy: 0 },
      rebond: { dx: 0.10, zRef: 'R', z: 0.10 },
      reprise: { dx: 0, zRef: 'C', z: 0, bas: 0.02, haut: 0 },
      vit: [0.85, 1.08],
      corps: { ry: [-0.05, -0.16, 0.06, 0], rz: [0, -0.05, 0, 0], rx: [0, 0.04, 0.02, 0] },
    }],
  },
  // HÉSITATION : on freine, on se redresse, la balle monte haut et reste un instant dans la main (on vend
  // le tir, les yeux sur le cercle)... puis on la repousse loin devant et on repart plus vite.
  hesi: {
    change: false, duree: 0.95, cd: 0.40, vMin: 2.5, sinon: 'pound', apres: { t: 0.40, k: 1.15 },
    etapes: [{
      pied: 'oppose', garde: [0, 0.08], vDes: 'apex', apex: 0.12,
      lacher: { dx: 0, zRef: 'R', z: 0, dy: 0 },
      rebond: { dx: 0.04, zRef: 'R', z: 0.02 },
      reprise: { dx: 0, zRef: 'C', z: 0, sommet: [-0.02, 0.06] },
      vit: [0.45, 0.45],
      corps: { rx: [-0.06, -0.12, -0.12, -0.10] },
      regardPanier: true,
    }, {
      pied: 'oppose', garde: [0.10, 0.16], vDes: 5.5,
      lacher: { dx: 0, zRef: 'R', z: 0, dy: -0.08 },
      rebond: { dx: 0.04, zRef: 'R', z: 0.10, avance: true },
      reprise: { dx: 0, zRef: 'C', z: 0, bas: 0.02, haut: -0.06 },
      vit: [0.45, 1.15], bascule: 'lacher',
      corps: { ry: [0, -0.04, -0.08, 0], rx: [-0.10, 0.10, 0.16, 0.08] },
    }],
  },
  // RECUL PROTÉGÉ : on se redonne de l'air face au défenseur — on recule (cap figé, voir Player.move), la
  // balle basse sur le côté, un rebond par pas, le buste tourné pour la cacher, le bras libre en barrière.
  retr: {
    change: false, duree: 0.8, cd: 0.30, recul: 0.8,
    etapes: [1, 2].map(() => ({
      pied: 'oppose', garde: [0, 0.06], vDes: 3.4,
      lacher: { dx: 0.06, zRef: 'A', z: 0.02, yA: 0.70 },
      rebond: { dx: 0.08, zRef: 'A', z: -0.06 },
      reprise: { dx: 0.06, zRef: 'A', z: 0, yMin: 0.62, yMax: 0.76 },
      corps: { ry: [0.30, 0.35, 0.35, 0.30], rx: [0.10, 0.14, 0.14, 0.12] }, barre: true,
    })),
  },
  // STEP-BACK : un dribble appuyé et un saut en arrière d'environ 0,8 m (Player.move) — l'espace pour tirer.
  step: {
    change: false, duree: 0.45, cd: 1.0, pas: 0.30,
    etapes: [{
      pied: 'libre', garde: [0.02, 0.08], vDes: 6.0,
      lacher: { dx: 0, zRef: 'R', z: 0, dy: 0.02 },
      rebond: { dx: 0.04, zRef: 'A', z: 0.12 },
      reprise: { dx: 0.02, zRef: 'C', z: 0, bas: 0.04, haut: 0 },
      corps: { rx: [0.10, 0.16, -0.06, -0.04] }, plonge: 2, barre: true,
    }],
  },
  // POUND : un dribble sec et appuyé — la main tient la balle en haut un instant, puis la frappe.
  pound: {
    change: false, duree: 0.45, cd: 0.20,
    etapes: [{
      pied: 'oppose', garde: [0.04, 0.12], vDes: 6.0, apex: 0.10,
      lacher: { dx: 0, zRef: 'R', z: 0, dy: 0.04 },
      rebond: { dx: 0.02, zRef: 'R', z: 0 },
      reprise: { dx: 0.02, zRef: 'C', z: 0, bas: 0.02, haut: 0 },
      corps: { rx: [0, 0.05, 0.06, 0] }, plonge: 2,
    }],
  },
};

// SIZE-UP (dribble sur place, touche de feinte maintenue) : un élément par rebond.
export const COMBOS = [
  ['pound', 'cross'], ['cross', 'cross'], ['legs', 'cross'], ['inout', 'cross'],
  ['legs', 'legs'], ['back', 'cross'], ['pound', 'pound', 'legs'], ['cross', 'legs', 'back'],
];
