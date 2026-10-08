// Boutique du marchand (balade libre) : nourriture = boosts de compétence valables jusqu'à la fin du prochain match,
// skins (ballons dès maintenant, tenues à compléter avec un GLB). Porte-monnaie en pièces gagnées en jouant
// (+5 par panier en balade, +40 par match joué, +100 si victoire, +3 par point marqué), sauvegardé dans localStorage.
import { PERSO_DEPART } from './gacha.js';
import { EMOTES, EMOTE_SLOTS } from './emotes.js';   // pour ne pas effacer les emotes achetees (voir plus bas)

export const SHOP_KEY = 'hoops.shop.v1';
export const BOOST_CAP = 20;          // cumul maximal par stat
export const COINS = { basket: 5, matchPlayed: 40, matchWon: 100, perPoint: 3, start: 100 };
// progression facon mode carriere : on gagne des points d'entrainement en jouant et on les dépense en +1 sur une stat
export const XP = { basket: 2, matchPlayed: 25, matchWon: 60, perPoint: 2 };
export const UP_MAX = 15;                                   // +15 maximum par caractéristique
export const UP_STATS = [['spd', 'Vitesse'], ['hdl', 'Dribble'], ['in', 'Intérieur'], ['mid', 'Mi-distance'], ['tp', '3 points'], ['dnk', 'Dunk'], ['def', 'Défense'], ['reb', 'Rebond'], ['sta', 'Endurance']];
export const upCost = (n) => 30 + 22 * n;                   // le +1 suivant coûte de plus en plus cher

// stats : spd vitesse, hdl dribble, in intérieur/layup, mid mi-distance, tp 3 pts, dnk dunk, def défense, sta endurance (sprint)
export const STAT_LABEL = { spd: 'VIT', hdl: 'DRIBBLE', in: 'INT', mid: 'MID', tp: '3PT', dnk: 'DUNK', def: 'DEF', reb: 'REBOND', sta: 'ENDURANCE' };

export const FOODS = [
  { id: 'banane',   emoji: '🍌', name: 'Banane',              price: 30, desc: 'Un coup de fouet dans les jambes.',             bonus: { spd: 8 } },
  { id: 'sandwich', emoji: '🥪', name: 'Sandwich poulet',     price: 45, desc: 'Du costaud pour finir au cercle.',              bonus: { in: 8, dnk: 8 } },
  { id: 'energy',   emoji: '🥤', name: 'Boisson énergisante', price: 50, desc: 'Le poignet chaud : adresse de loin.',           bonus: { tp: 10, mid: 8 } },
  { id: 'pates',    emoji: '🍝', name: 'Pâtes du marchand',   price: 45, desc: 'De la réserve : défense et endurance.',         bonus: { def: 10, sta: 25 } },
  { id: 'gaufre',   emoji: '🧇', name: 'Gaufre sucrée',       price: 35, desc: 'Les mains qui collent au ballon.',              bonus: { hdl: 10 } },
  { id: 'kebab',    emoji: '🌯', name: 'Kebab complet',       price: 90, desc: 'Le repas des champions : tout monte.',         bonus: { spd: 5, hdl: 5, in: 5, mid: 5, tp: 5, dnk: 5, def: 5 } },
  { id: 'cafe',     emoji: '☕', name: 'Café serré',        price: 25, desc: 'Les yeux ouverts : meilleur timing.',          bonus: { mid: 6, tp: 6 } },
  { id: 'pizza',    emoji: '🍕', name: 'Part de pizza',     price: 40, desc: 'Du lourd pour tenir sous le cercle.',          bonus: { in: 10, reb: 10 } },
  { id: 'eau',      emoji: '💧', name: 'Grande bouteille',  price: 20, desc: 'Le plus bête et le plus utile.',               bonus: { sta: 20 } },
  { id: 'barre',    emoji: '🍫', name: 'Barre protéinée',   price: 55, desc: 'Du muscle : contre et rebond.',                bonus: { def: 8, reb: 12 } },
  { id: 'glace',    emoji: '🍦', name: 'Glace du camion',   price: 35, desc: 'Sang-froid : tu gardes la tête.',              bonus: { hdl: 6, mid: 6 } },
];

// Skins. Ballons : `tint` recolore la texture du ballon (nuances conservées), `mul` assombrit, `emissive` fait luire.
// Tenues et chaussures : recoloration des matériaux de l'avatar (Player.applyOutfit), aucun fichier 3D en plus.
// Un skin décrit ce qu'il fait à chaque partie : `look` (vêtements), `shoes` (chaussures), `hair` (cheveux).
// Chaque partie accepte tint (teinte), lift (éclaircit avant de teinter), mul (assombrit), glow (émissif),
// metal et rough (aspect métallique). Une tenue peut aussi porter `model` pour un vrai GLB de rechange.
export const SKINS = [
  { id: 'ball_classic', type: 'ball',   name: 'Ballon classique', price: 0,   desc: 'Le cuir orange du playground.',   swatch: '#d2691e' },
  { id: 'ball_gold',    type: 'ball',   name: 'Ballon doré',      price: 150, desc: 'Pour ceux qui brillent.',          swatch: '#ffcc33', tint: '#ffcc33' },
  { id: 'ball_black',   type: 'ball',   name: 'Ballon noir mat',  price: 120, desc: 'Sobre et classe.',                 swatch: '#2a2a2a', tint: '#8a8a8a', mul: 0.35 },
  { id: 'ball_blue',    type: 'ball',   name: 'Ballon bleu',      price: 120, desc: 'Le ballon de Bécon.',              swatch: '#2b6cff', tint: '#2b6cff' },
  { id: 'ball_pink',    type: 'ball',   name: 'Ballon rose',      price: 120, desc: 'On te verra de loin.',             swatch: '#ff4fa3', tint: '#ff4fa3' },
  { id: 'ball_neon',    type: 'ball',   name: 'Ballon néon',      price: 200, desc: 'Vert fluo, il éclaire la nuit.',   swatch: '#39ff14', tint: '#39ff14', emissive: '#1f7a0c' },
  { id: 'ball_cuir',    type: 'ball',   name: 'Cuir usé',         price: 90,  desc: 'Celui qui traîne dans le sac depuis dix ans.', swatch: '#8b5a2b', tint: '#8b5a2b', mul: 0.85 },
  { id: 'ball_blanc',   type: 'ball',   name: 'Ballon blanc',     price: 140, desc: 'On dirait un ballon de match.',   swatch: '#f0f0f0', tint: '#ffffff' },
  { id: 'ball_violet',  type: 'ball',   name: 'Ballon violet',    price: 140, desc: 'Rare sur un playground.',         swatch: '#7b2cbf', tint: '#7b2cbf' },
  { id: 'ball_feu',     type: 'ball',   name: 'Ballon de feu',    price: 260, desc: 'Il chauffe même sans série.',     swatch: '#ff5400', tint: '#ff5400', emissive: '#6b1f00' },
  { id: 'ball_glace',   type: 'ball',   name: 'Ballon de glace',  price: 260, desc: 'Sang-froid absolu.',              swatch: '#7fe3ff', tint: '#7fe3ff', emissive: '#0d3a4a' },
  // ---- Tenues : recoloration des matériaux de l'avatar (aucun fichier 3D en plus). `look` = vêtements,
  // `shoes` = chaussures, `hair` = cheveux. `lift` éclaircit avant de teinter, sinon un tissu noir reste noir.
  { id: 'outfit_origin', type: 'outfit', name: 'Tenue d\'origine',  price: 0,   desc: 'Celle de ton avatar.',                 swatch: '#8d8d93' },
  { id: 'outfit_rouge',  type: 'outfit', name: 'Rouge Bécon',       price: 180, desc: 'Le rouge du quartier.',                swatch: '#e63946', look: { tint: '#c1121f', lift: 0.26 }, shoes: { tint: '#1a1a1a', lift: 0.15 } },
  { id: 'outfit_bleu',   type: 'outfit', name: 'Bleu nuit',         price: 180, desc: 'Sobre, propre, efficace.',             swatch: '#2b4d8f', look: { tint: '#2b4d8f', lift: 0.30 }, shoes: { tint: '#ffffff', lift: 0.55 } },
  { id: 'outfit_vert',   type: 'outfit', name: 'Vert terrain',      price: 180, desc: 'La couleur du grillage.',              swatch: '#2f8f5b', look: { tint: '#2f8f5b', lift: 0.32 } },
  { id: 'outfit_blanc',  type: 'outfit', name: 'Total blanc',       price: 220, desc: 'À ne pas tomber dedans.',              swatch: '#f2f2f2', look: { tint: '#ffffff', lift: 0.78 }, shoes: { tint: '#ffffff', lift: 0.7 } },
  { id: 'outfit_noir',   type: 'outfit', name: 'Total noir',        price: 220, desc: 'On ne te voit venir qu\'au dernier moment.', swatch: '#141414', look: { tint: '#7a7a7a', mul: 0.32 }, shoes: { tint: '#7a7a7a', mul: 0.3 } },
  { id: 'outfit_or',     type: 'outfit', name: 'Tenue dorée',       price: 480, desc: 'Le roi du terrain.',                   swatch: '#c9a227', look: { tint: '#ffcc33', lift: 0.5, metal: 0.45, rough: 0.3 }, shoes: { tint: '#ffcc33', lift: 0.5, metal: 0.5, rough: 0.25 } },
  { id: 'outfit_neon',   type: 'outfit', name: 'Néon',              price: 520, desc: 'Fluo de la tête aux pieds.',           swatch: '#39ff14', look: { tint: '#39ff14', lift: 0.55, glow: '#123f08' }, shoes: { tint: '#39ff14', lift: 0.5, glow: '#123f08' }, hair: { tint: '#39ff14', lift: 0.4 } },
  { id: 'outfit_rose',   type: 'outfit', name: 'Rose bonbon',       price: 260, desc: 'Assumé.',                              swatch: '#ff4fa3', look: { tint: '#ff4fa3', lift: 0.5 }, hair: { tint: '#ff4fa3', lift: 0.35 } },
  { id: 'outfit_violet', type: 'outfit', name: 'Violet royal',      price: 260, desc: 'Un peu de classe sur le bitume.',      swatch: '#7b2cbf', look: { tint: '#7b2cbf', lift: 0.34 }, shoes: { tint: '#ffcc33', lift: 0.5 } },
  { id: 'outfit_orange', type: 'outfit', name: 'Orange chantier',   price: 200, desc: 'Comme le bungalow d\'en face.',        swatch: '#ff7b00', look: { tint: '#ff7b00', lift: 0.38 } },
  { id: 'outfit_camo',   type: 'outfit', name: 'Kaki',              price: 240, desc: 'Discret mais pas trop.',               swatch: '#6b7a4a', look: { tint: '#8a9a5b', lift: 0.3 }, shoes: { tint: '#2a2a2a', lift: 0.2 } },
  // ---- VRAIES TENUES (js/fit.js). Celles du dessus ne font que TEINTER l'atlas en bloc : une couleur
  //      unie, donc un pyjama. Celles-ci sont peintes par un shader dans l'espace du CORPS et non dans
  //      celui de la texture — coupure haut/bas, bandes laterales, col, chevilles, lisere. C'est ce qui
  //      permet un vrai survetement sur les dix avatars alors qu'ils portent six vetements differents,
  //      dont aucun n'a le meme depliage UV. Aucun fichier, que des uniformes.
  //
  //      `coupe` = hauteur de la couture haut/bas (1 = hanche, 2 = poitrine, 3 = cou) ; `jambe` et
  //      `manche` = largeur de la bande laterale en part de circonference ; `contraste` = combien du
  //      motif d'origine reste visible sous la peinture (0,9 garde les plis, 0,4 les efface).
  { id: 'fit_becon',    type: 'outfit', name: 'Survêtement Bécon',    price: 220, desc: 'Bleu nuit, bandes orange. Le club du quartier.', swatch: '#1b2436',
    fit: { haut: '#1b2436', bas: '#e9e4d8', bande: '#e7502a', coupe: 1.12, jambe: 0.16, manche: 0.18, cheville: 0.14, col: 3.18, lisere: 0.05, contraste: 0.7 } },
  { id: 'fit_grillage', type: 'outfit', name: 'Survêtement Grillage', price: 220, desc: 'Gris béton et vert cage. La couleur du terrain.', swatch: '#5a6068',
    fit: { haut: '#5a6068', bas: '#33383f', bande: '#3fbf6a', coupe: 1.10, jambe: 0.15, manche: 0.15, cheville: 0.16, col: 3.20, lisere: 0.04, contraste: 0.65 } },
  { id: 'fit_bitume',   type: 'outfit', name: 'Deux-pièces Bitume',   price: 180, desc: 'Noir sur noir, un seul liséré gris. Discret, propre.', swatch: '#15171b',
    fit: { haut: '#15171b', bas: '#0f1114', bande: '#9aa0a8', coupe: 1.08, jambe: 0.10, lisere: 0.05, contraste: 0.40 } },
  { id: 'fit_quai',     type: 'outfit', name: 'Survêtement Quai Michelet', price: 240, desc: 'Écru et bordeaux, façon vestiaire d’époque.', swatch: '#e3dcc9',
    fit: { haut: '#e3dcc9', bas: '#c9c0a8', bande: '#7a1f2b', coupe: 1.10, jambe: 0.22, manche: 0.12, col: 3.00, lisere: 0.05, contraste: 0.9 } },
  { id: 'fit_maillot1', type: 'outfit', name: 'Maillot Cage n°1',     price: 260, desc: 'Haut rouge, short blanc, bandeau de poitrine. Tenue de match.', swatch: '#c1121f',
    fit: { haut: '#c1121f', bas: '#f2f0ea', bande: '#f2f0ea', coupe: 1.02, bandeauY: 2.30, bandeau: 0.18, jambe: 0.12, contraste: 0.75 } },
  { id: 'fit_maillot2', type: 'outfit', name: 'Maillot Cage n°2',     price: 260, desc: 'Blanc cassé et vert playground. L’autre maillot du club.', swatch: '#f2f0ea',
    fit: { haut: '#f2f0ea', bas: '#2f8f5b', bande: '#2f8f5b', coupe: 1.04, bandeauY: 2.34, bandeau: 0.16, jambe: 0.14, lisere: 0.04, contraste: 0.75 } },
  { id: 'fit_sweat',    type: 'outfit', name: 'Sweat Pont de Levallois', price: 260, desc: 'Coupe longue, manches contrastées.', swatch: '#24406b',
    fit: { haut: '#24406b', bas: '#2c3038', bande: '#e3dcc9', coupe: 1.20, manche: 0.45, lisere: 0.05, contraste: 0.6 } },
  { id: 'fit_chantier', type: 'outfit', name: 'Survêtement Chantier', price: 280, desc: 'Orange haute visibilité, bandes argent.', swatch: '#ff7b00',
    fit: { haut: '#ff7b00', bas: '#e06800', bande: '#d9dde2', coupe: 1.09, jambe: 0.26, manche: 0.26, cheville: 0.18, col: 3.16, lisere: 0.05, contraste: 0.6 } },
  { id: 'fit_creme',    type: 'outfit', name: 'Tenue Crème',          price: 240, desc: 'Écru et caramel. Personne ne joue en crème. Toi si.', swatch: '#efe6d2',
    fit: { haut: '#efe6d2', bas: '#b07d3f', bande: '#b07d3f', coupe: 1.06, col: 3.22, lisere: 0.06, contraste: 0.9 } },
  { id: 'fit_nuit',     type: 'outfit', name: 'Nuit Blanche',         price: 420, desc: 'Noir mat, liserés fluo. On te voit de l’autre bout du terrain.', swatch: '#141414',
    fit: { haut: '#141414', bas: '#141414', bande: '#39ff14', glow: '#123f08', coupe: 1.15, jambe: 0.24, manche: 0.26, cheville: 0.16, col: 3.15, lisere: 0.05, contraste: 0.45 } },
  { id: 'fit_massyl',   type: 'outfit', name: 'Maillot de Paris',    price: 300, desc: 'Bleu marine, large bande rouge et liseres blancs. Le maillot de Massyl.', swatch: '#0f1a45',
    fit: { haut: '#0f1a45', bas: '#0f1a45', bande: '#f2f3f0', centre: '#cf1230', centreL: 0.078, centreLis: 0.013, coupe: 1.04, jambe: 0, manche: 0.13, col: 3.02, lisere: 0.03, contraste: 0.80 } },
  { id: 'fit_cuir',     type: 'outfit', name: 'Cuir du Quartier',    price: 340, desc: 'Cuir sombre et rouge profond, col monte.', swatch: '#5a3a28',
    fit: { haut: '#5a3a28', bas: '#3a2a20', bande: '#8e2230', coupe: 1.16, jambe: 0.12, manche: 0.20, cheville: 0.14, col: 3.10, lisere: 0.06, contraste: 0.85 } },
  { id: 'fit_or',       type: 'outfit', name: 'Or du Quartier',       price: 560, desc: 'Doré et noir. Le roi du terrain, version tissu.', swatch: '#c9a227',
    fit: { haut: '#ffcc33', bas: '#141414', bande: '#141414', metal: 0.45, rough: 0.30, coupe: 1.12, jambe: 0.18, manche: 0.14, cheville: 0.12, col: 3.18, lisere: 0.05, contraste: 0.55 } },


  // ---- COUVRE-CHEFS ET COULEURS DE CHEVEUX (type 'chef', js/headwear.js) ----
  // La COUPE elle-meme est figee dans le GLB de chaque personnage : on ne peut pas la remplacer, et je ne
  // pretends pas le faire. On peut en revanche la COIFFER (geometrie montee en primitives et accrochee a
  // l'os Head, qui suit donc l'animation sans rien couter par image) ou la TEINDRE. D'ou le nom du rayon.
  { id: 'chef_nu',      type: 'chef', name: 'Tête nue',              price: 0,   desc: 'Ta coupe d’origine.', swatch: '#8d8d93' },
  { id: 'chef_bandeau', type: 'chef', name: 'Bandeau de la Cage',    price: 110, desc: 'Le front au sec, les cheveux dehors.', swatch: '#e7502a',
    coif: { forme: 'bandeau', couleur: '#e7502a', accent: '#efe8d8', cache: false } },
  { id: 'chef_eponge',  type: 'chef', name: 'Serre-tête éponge',     price: 120, desc: 'Vieille école, très efficace.', swatch: '#f2f0ea',
    coif: { forme: 'bandeau', couleur: '#f2f0ea', accent: '#24406b', epais: 1.35, cache: false } },
  { id: 'chef_casq',    type: 'chef', name: 'Casquette Bécon',       price: 200, desc: 'Visière à plat, comme au city.', swatch: '#1b2436',
    coif: { forme: 'casquette', couleur: '#1b2436', accent: '#e7502a', cache: true } },
  { id: 'chef_envers',  type: 'chef', name: 'Casquette à l’envers', price: 200, desc: 'Visière derrière : là, tu joues.', swatch: '#2f8f5b',
    coif: { forme: 'casquette', couleur: '#2f8f5b', accent: '#15151a', envers: true, cache: true } },
  { id: 'chef_bonnet',  type: 'chef', name: 'Bonnet de novembre',    price: 180, desc: 'Le playground en hiver.', swatch: '#5b3a8f',
    coif: { forme: 'bonnet', couleur: '#5b3a8f', accent: '#efe8d8', cache: true } },
  { id: 'chef_durag',   type: 'chef', name: 'Durag noir',            price: 160, desc: 'Noué serré, pans dans le dos.', swatch: '#15151a',
    coif: { forme: 'durag', couleur: '#15151a', accent: '#2c3038', cache: true } },
  { id: 'chef_platine', type: 'chef', name: 'Décoloration platine',  price: 130, desc: 'Deux heures chez le coiffeur, zéro pour toi.', swatch: '#efe8d8',
    hair: { tint: '#efe8d8', lift: 0.62 } },
  { id: 'chef_rouge',   type: 'chef', name: 'Cheveux rouge Bécon',   price: 130, desc: 'Assumé, et ça se voit de loin.', swatch: '#c1121f',
    hair: { tint: '#c1121f', lift: 0.38 } },

  // ---- Chaussures seules : elles se cumulent avec la tenue ----
  { id: 'shoes_origin', type: 'shoes', name: 'Chaussures d\'origine', price: 0,   desc: 'Celles de ton avatar.',   swatch: '#8d8d93' },
  { id: 'shoes_blanc',  type: 'shoes', name: 'Blanches',              price: 90,  desc: 'Toujours propres.',       swatch: '#f4f4f4', shoes: { tint: '#ffffff', lift: 0.72 } },
  { id: 'shoes_rouge',  type: 'shoes', name: 'Rouges',                price: 110, desc: 'Ça va vite.',             swatch: '#e63946', shoes: { tint: '#e63946', lift: 0.45 } },
  { id: 'shoes_bleu',   type: 'shoes', name: 'Bleues',                price: 110, desc: 'Le bleu de la cage.',     swatch: '#2b6cff', shoes: { tint: '#2b6cff', lift: 0.45 } },
  { id: 'shoes_or',     type: 'shoes', name: 'Dorées',                price: 300, desc: 'Pour marcher sur l\'eau.', swatch: '#ffcc33', shoes: { tint: '#ffcc33', lift: 0.5, metal: 0.5, rough: 0.25 } },
  { id: 'shoes_neon',   type: 'shoes', name: 'Néon',                  price: 320, desc: 'Elles éclairent le sol.',  swatch: '#39ff14', shoes: { tint: '#39ff14', lift: 0.5, glow: '#123f08' } },

  // ---- LA GLISSE (lot C4, rayon GLISSE) : en balade seulement, jamais en match ----
  // `engin` : ce qu'on sort de son sac avec la touche d'action, quand rien d'autre n'est à portée (js/game.js,
  // updateEnginPerso) — un skate (js/monture_skate.js : `couleur` du dessous, `dessin` = motif clair ou foncé) ou une
  // trottinette pliante (js/monture_trottinette.js). Les trottinettes du parc entier, elles, sont posées là, gratuites.
  { id: 'engin_aucun',  type: 'engin', emoji: '🎒', name: 'Rien dans le sac', price: 0, desc: 'À pied, comme d’habitude.', swatch: '#8d8d93' },
  { id: 'skate_cage',   type: 'engin', genre: 'skate', emoji: '🛹', name: 'Skate LA CAGE', price: 260, couleur: '#c1272d', dessin: 0, swatch: '#c1272d',
    desc: 'Érable sept plis, dessous rouge, trucks alu, roues de 54 mm. Tir = ollie.' },
  { id: 'skate_nuit',   type: 'engin', genre: 'skate', emoji: '🛹', name: 'Skate Bitume', price: 280, couleur: '#1b2436', dessin: 1, swatch: '#1b2436',
    desc: 'Dessous bleu nuit à bandes claires. Il ne roule que sur le dur.' },
  { id: 'skate_quai',   type: 'engin', genre: 'skate', emoji: '🛹', name: 'Skate Quai Michelet', price: 280, couleur: '#2f8f5b', dessin: 0, swatch: '#2f8f5b',
    desc: 'Vert playground, pour descendre la rampe du parc.' },
  { id: 'trott_pliante', type: 'engin', genre: 'trottinette', emoji: '🛴', name: 'Trottinette pliante', price: 320, couleur: '#2a2c30', swatch: '#2a2c30',
    desc: 'Roues de 200 mm, frein au talon, guidon réglé à ta taille. Elle se plie dans le sac.' },
  { id: 'trott_becon',  type: 'engin', genre: 'trottinette', emoji: '🛴', name: 'Trottinette Bécon', price: 340, couleur: '#e7502a', swatch: '#e7502a',
    desc: 'Orange du club. Tir = sonnette.' },
  // `rollers` : chaussés en balade (js/rollers.js) — plus vite et plus d'élan sur le dur, on glisse en s'arrêtant
  { id: 'rollers_aucun', type: 'rollers', emoji: '👟', name: 'Baskets', price: 0, desc: 'Tes chaussures, sans roues.', swatch: '#8d8d93' },
  { id: 'rollers_noirs', type: 'rollers', emoji: '🛼', name: 'Rollers noirs', price: 240, couleur: '#1c1d21', swatch: '#1c1d21',
    desc: 'Quatre roues en ligne de 60 mm. +30 % de vitesse sur le dur, et il faut savoir s’arrêter.' },
  { id: 'rollers_fluo', type: 'rollers', emoji: '🛼', name: 'Rollers fluo', price: 260, couleur: '#39ff14', swatch: '#39ff14',
    desc: 'On te voit arriver de l’autre bout du parc.' },
  { id: 'rollers_rose', type: 'rollers', emoji: '🛼', name: 'Rollers rose bonbon', price: 260, couleur: '#ff4fa3', swatch: '#ff4fa3',
    desc: 'La coque rose, les roues noires. Assumé.' },
];
// (lot C4) le rayon GLISSE de la boutique : ses deux types, dans l'ordre d'affichage
export const GLISSE = [['engin', 'Skates et trottinettes · touche d’action pour le sortir du sac'], ['rollers', 'Rollers · chaussés en balade']];
export const skinById = (id) => SKINS.find((s) => s.id === id) || null;
export const bonusText = (bonus) => Object.entries(bonus).map(([k, v]) => `+${v} ${STAT_LABEL[k]}`).join(' · ');

export class Wallet {
  constructor() {
    this.data = { coins: COINS.start, owned: ['ball_classic'], equipped: { ball: 'ball_classic', outfit: null, shoes: null, chef: null, engin: null, rollers: null, emotes: [] },
      boosts: [], earned: 0, xp: 0, up: {}, badges: {},
      // vœux : collection de personnages, jetons de tirage, compteurs de garantie, capacités gagnées en doublon
      persos: [PERSO_DEPART], jetons: 5, sansEpique: 0, sansLegendaire: 0, plus: {} };
    // Fusion en profondeur : une sauvegarde d'avant n'a ni `equipped.shoes` ni `badges`, et un simple spread
    // de premier niveau les aurait écrasés par l'objet enregistré, sans les nouvelles sous-clés.
    try {
      const raw = localStorage.getItem(SHOP_KEY);
      if (raw) {
        const v = JSON.parse(raw) || {};
        this.data = { ...this.data, ...v, equipped: { ...this.data.equipped, ...(v.equipped || {}) },
          up: { ...(v.up || {}) }, badges: { ...(v.badges || {}) },
          persos: [...new Set([PERSO_DEPART, ...(v.persos || [])])], plus: { ...(v.plus || {}) } };
      }
    } catch (e) { /* stockage indisponible */ }
    // Les trois tenues « bientôt » ont disparu du catalogue : une sauvegarde qui en équipait une pointerait dans
    // le vide. On remappe ce qui a un équivalent et on oublie le reste.
    const MIGR = { outfit_gold: 'outfit_or', outfit_street: 'outfit_noir', outfit_retro: 'outfit_rouge' };
    // Ce filtre ne connaissait que SKINS. Or buyEmote range ses achats dans le MEME tableau sous
    // « emote_<id> » : chaque emote payante etait donc effacee au rechargement suivant, et les pieces
    // perdues. Le joueur payait, faisait F5, et son achat n'existait plus.
    this.data.owned = [...new Set(this.data.owned.map((id) => MIGR[id] || id).filter((id) => (
      id.startsWith('emote_') ? EMOTES.some((e) => 'emote_' + e.id === id) : SKINS.some((s) => s.id === id)
    )))];
    // 'chef' DOIT etre dans cette liste : sans lui le couvre-chef serait bien sauvegarde, mais remis a
    // null a chaque chargement — et personne ne comprendrait pourquoi il faut le rééquiper au lancement.
    // (lot C4 : 'engin' et 'rollers' aussi, le rayon GLISSE)
    for (const t of ['ball', 'outfit', 'shoes', 'chef', 'engin', 'rollers']) {
      const cur = this.data.equipped[t];
      const mapped = cur && (MIGR[cur] || cur);
      this.data.equipped[t] = mapped && SKINS.some((s) => s.id === mapped) ? mapped : (t === 'ball' ? 'ball_classic' : null);
    }
    // La roue est a part : c'est un TABLEAU, la boucle ci-dessus le remettrait a null. On ne garde que des
    // emotes qui existent encore et qu'on possede, et on la remplit une SEULE fois, au premier lancement.
    const aEmote = (e) => !e.price || this.data.owned.includes('emote_' + e.id);
    let em = [...new Set(this.data.equipped.emotes || [])]
      .filter((id) => EMOTES.some((e) => e.id === id && aEmote(e))).slice(0, EMOTE_SLOTS);
    if (!em.length) em = EMOTES.filter(aEmote).slice(0, EMOTE_SLOTS).map((e) => e.id);
    this.data.equipped.emotes = em;
    for (const s of SKINS) if (s.price === 0 && !this.data.owned.includes(s.id)) this.data.owned.push(s.id);
    this.listeners = [];
  }
  get coins() { return this.data.coins; }
  onChange(fn) { this.listeners.push(fn); }
  save() {
    try { localStorage.setItem(SHOP_KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
    for (const f of this.listeners) f(this);
  }
  add(n) { this.data.coins = Math.max(0, Math.round(this.data.coins + n)); if (n > 0) this.data.earned += n; this.save(); return this.data.coins; }

  // ---------- progression ----------
  get xp() { return this.data.xp || 0; }
  addXp(n) { this.data.xp = Math.max(0, Math.round((this.data.xp || 0) + n)); this.save(); }
  up(stat) { return (this.data.up && this.data.up[stat]) || 0; }
  upTotal() { return UP_STATS.reduce((n, [k]) => n + this.up(k), 0); }
  canUp(stat) { return this.up(stat) < UP_MAX && this.xp >= upCost(this.up(stat)); }
  upgrade(stat) {
    const n = this.up(stat);
    if (n >= UP_MAX) return { ok: false, reason: 'Déjà au maximum sur cette caractéristique.' };
    const c = upCost(n);
    if (this.xp < c) return { ok: false, reason: `Il te manque ${c - this.xp} points d'entraînement.` };
    this.data.xp -= c; this.data.up = { ...this.data.up, [stat]: n + 1 };
    this.save(); return { ok: true, cost: c };
  }
  // ---------- capacités (voir js/badges.js) ----------
  badge(id) { return (this.data.badges && this.data.badges[id]) || 0; }
  badges() { return { ...(this.data.badges || {}) }; }
  upgradeBadge(id, cost, max) {
    const n = this.badge(id);
    if (n >= max) return { ok: false, reason: 'Cette capacité est déjà au maximum.' };
    if (this.xp < cost) return { ok: false, reason: `Il te manque ${cost - this.xp} points d'entraînement.` };
    this.data.xp -= cost; this.data.badges = { ...this.data.badges, [id]: n + 1 };
    this.save(); return { ok: true, cost };
  }

  // ---------- vœux (voir js/gacha.js) ----------
  get jetons() { return this.data.jetons || 0; }
  get persos() { return this.data.persos || [PERSO_DEPART]; }
  aPerso(id) { return this.persos.includes(id); }
  addJetons(n) { this.data.jetons = Math.max(0, (this.data.jetons || 0) + n); this.save(); }
  // achat d'un jeton avec des pièces, chez Pierrick
  acheterJeton(prix) {
    if (this.data.coins < prix) return { ok: false, reason: `Il te manque ${prix - this.data.coins} pièces.` };
    this.data.coins -= prix; this.data.jetons = (this.data.jetons || 0) + 1; this.save();
    return { ok: true };
  }
  // état passé au tirage : il est modifié sur place, on le range ensuite
  etatVoeux() {
    return { persos: [...this.persos], plus: { ...(this.data.plus || {}) },
      sansEpique: this.data.sansEpique || 0, sansLegendaire: this.data.sansLegendaire || 0 };
  }
  rangerVoeux(etat, cout, pieces) {
    this.data.persos = etat.persos; this.data.plus = etat.plus;
    this.data.sansEpique = etat.sansEpique; this.data.sansLegendaire = etat.sansLegendaire;
    this.data.jetons = Math.max(0, (this.data.jetons || 0) - cout);
    if (pieces) this.data.coins += pieces;
    this.save();
  }
  // capacités gagnées en doublon sur un personnage donné
  plusPerso(id) { return { ...((this.data.plus || {})[id] || {}) }; }

  // bonus permanents de progression (à ajouter à la fiche de base, avant la nourriture)
  upBonus() { const b = {}; for (const [k] of UP_STATS) if (this.up(k)) b[k] = this.up(k); return b; }

  // emotes achetées (id préfixé pour ne pas se mélanger avec les skins)
  // Les emotes EQUIPEES, c'est-a-dire la roue et les touches 1 a 8.
  emoteSlots() { return this.data.equipped.emotes || []; }
  toggleEmote(e) {
    const cur = [...(this.data.equipped.emotes || [])], i = cur.indexOf(e.id);
    if (i >= 0) cur.splice(i, 1);
    else {
      if (e.price && !this.owns('emote_' + e.id)) return { ok: false, reason: 'Tu ne possèdes pas cette emote.' };
      if (cur.length >= EMOTE_SLOTS) return { ok: false, reason: `Ta roue est pleine (${EMOTE_SLOTS}). Retires-en une d’abord.` };
      cur.push(e.id);
    }
    this.data.equipped.emotes = cur; this.save(); return { ok: true, on: i < 0 };
  }

  buyEmote(e) {
    const id = 'emote_' + e.id;
    if (this.owns(id)) return { ok: true, already: true };
    if (this.data.coins < e.price) return { ok: false, reason: `Il te manque ${e.price - this.data.coins} pièces.` };
    this.data.coins -= e.price; this.data.owned.push(id); this.save(); return { ok: true };
  }
  owns(id) { return this.data.owned.includes(id); }
  equipped(type) { return this.data.equipped[type] || null; }
  // nourriture : mangée tout de suite, bonus valable jusqu'à la fin du prochain match (cumul plafonné par stat)
  eat(food) {
    if (this.data.coins < food.price) return { ok: false, reason: `Il te manque ${food.price - this.data.coins} pièces.` };
    this.data.coins -= food.price;
    this.data.boosts.push({ id: food.id, bonus: { ...food.bonus } });
    this.save(); return { ok: true };
  }
  buySkin(skin) {
    if (this.owns(skin.id)) { this.data.equipped[skin.type] = skin.id; this.save(); return { ok: true, already: true }; }
    if (this.data.coins < skin.price) return { ok: false, reason: `Il te manque ${skin.price - this.data.coins} pièces.` };
    this.data.coins -= skin.price; this.data.owned.push(skin.id); this.data.equipped[skin.type] = skin.id;
    this.save(); return { ok: true };
  }
  equip(skin) { if (!this.owns(skin.id)) return false; this.data.equipped[skin.type] = skin.id; this.save(); return true; }
  // bonus cumulé par stat (plafonné)
  bonus() {
    const b = {};
    for (const bo of this.data.boosts) for (const [k, v] of Object.entries(bo.bonus)) b[k] = Math.min(BOOST_CAP, (b[k] || 0) + v);
    return b;
  }
  boostText() { const b = this.bonus(); return Object.keys(b).length ? bonusText(b) : ''; }
  clearBoosts() { if (this.data.boosts.length) { this.data.boosts = []; this.save(); } }
}
