// Joueurs (aucun vrai joueur NBA : droits à l'image / marques).
// spd = vitesse, hdl = dribble, in = intérieur/layup, mid = mi-distance,
// tp = 3 points, dnk = dunk, def = défense (vol + contre), reb = rebond. height en mètres.
// badges = capacités signature (voir js/badges.js) : { idCapacité: niveau 1 à 3 }. À stats égales, c'est ce qui
// fait qu'un joueur ne joue pas comme un autre.
export const ROSTER = [
  // Haythem : spécialiste de la FINITION (24/09). Dribble et vitesse monstrueux, layup très haut, tir un peu
  // au-dessus de la moyenne, pas de dunk (dnk < 60 : game.js ne le déclenche jamais), rebond au niveau d'Ethan.
  { id: 'haythem', name: 'Haythem',        pos: 'Meneur',       number: 1,  height: 1.73, style: 'Fusée, finisseur au cercle',
    spd: 99, hdl: 99, in: 95, mid: 82, tp: 80, dnk: 40, def: 66, reb: 94, color1: '#e63946', color2: '#ffffff', skin: '#c68642', badges: { fusee: 3, chevilles: 3, acrobate: 3 },
    model: 'assets/haythem.glb', modelHeight: 1.84 },   // avatar 3D Avaturn (squelette Mixamo)
  // Ethan : spécialiste SOUS LA RAQUETTE (24/09). Jeu au poste et rebond très hauts, bon tir, dribble moyen,
  // vitesse un peu sous la moyenne, pas de dunk (dnk < 60).
  { id: 'ethan',   name: 'Ethan',          pos: 'Pivot',        number: 10, height: 1.85, style: 'Poste bas, il domine la raquette',
    spd: 80, hdl: 78, in: 90, mid: 86, tp: 80, dnk: 40, def: 68, reb: 94, color1: '#1d3557', color2: '#f1faee', skin: '#f1c27d', badges: { costaud: 3, aspirateur: 3, poignet: 2 },
    model: 'assets/ethan.glb', modelHeight: 1.88 },     // avatar 3D Avaturn
  { id: 'clovis',  name: 'Clovis',         pos: 'Ailier',       number: 5,  height: 1.65, style: 'Slasher, finit au cercle',
    spd: 88, hdl: 84, in: 86, mid: 78, tp: 72, dnk: 84, def: 74, reb: 72, color1: '#2f6b3a', color2: '#ffffff', skin: '#e0ac69', badges: { acrobate: 3, chevilles: 2, fusee: 1 },
    model: 'assets/clovis.glb', modelHeight: 1.90 },    // avatar 3D Avaturn
  { id: 'lamine',  name: 'Lamine',         pos: 'Ailier fort',  number: 8,  height: 1.80, style: 'Costaud, défense de fer',
    spd: 80, hdl: 76, in: 88, mid: 74, tp: 64, dnk: 90, def: 88, reb: 88, color1: '#f4a261', color2: '#1a1a1a', skin: '#5c3a1e', badges: { muraille: 3, aspirateur: 2, costaud: 2 },
    // EN TENUE DE SPORT (30/09, À FAIRE VALIDER PAR HAYTHEM). Son avatar est livré en COSTUME-CRAVATE (veste
    // noire, chemise blanche, cravate, pochette) et ses mains sortaient gris clair sous un visage brun foncé :
    // sur le terrain, c'était le seul joueur en costume, et on lui croyait des gants.
    // PAS le traitement de Massyl (t-shirt et short) : essayé, il ne tient pas. Chez Lamine, le corps livré par
    // Avaturn n'a NI avant-bras NI jambes sous le costume, seulement les mains — manche coupée au coude, les
    // mains flottaient dans le vide, et le short laissait des tubes gris sous un ourlet déchiqueté. On garde
    // donc les manches longues et le pantalon, et on ne touche qu'à ce qui fait « costume » :
    //   - `coupeManche` 2 : le seuil passe au POIGNET (deux fois la distance épaule-coude, fit.js : couperTenue) —
    //     seul le poignet de chemise part, la main du corps sort de la manche ;
    //   - `coupeBas` : la veste s'arrête à la taille (plus de pans de costume sur les hanches) ;
    //   - `mainsVisage` : les « gants » n'en sont pas, c'est l'atlas du corps qui peint les mains en gris beige ;
    //     elles reprennent la teinte du visage (js/player.js : accorderMains).
    // La tenue est repeinte par le shader (js/fit.js) en haut uni à manches longues ANTHRACITE et jogging noir, au
    // contraste quasi nul (0,05) pour que chemise blanche, cravate et pochette ne se lisent plus dans le tissu ;
    // les plis restent, ils sont dans l'occlusion et la carte de normales du vêtement. Les revers, eux, sont
    // dans la géométrie, et c'est ce qui décide de la couleur (relecture du 30/09, essais anthracite, marine,
    // gris et bordeaux à la même pose) : sur un tissu clair ou vif, la lumière dessine les revers, le col de
    // chemise et même le contour de la cravate — en bordeaux, on lisait une veste de costume de soirée, plus
    // étrange encore sur un terrain que le costume noir. Sombre, tout cela s'efface dans le tissu : il reste une
    // veste noire sur un jogging noir, la tenue des joueurs de la photo 185558 (hauts noirs, bas sombres). Pas
    // d'orangé non plus (celui de sa fiche) : l'orange est la couleur des anneaux de l'équipe A (game.js).
    // Pour lui rendre le costume : retirer coupeManche, coupeBas et fit (mainsVisage peut rester : ses mains
    // gardent alors la couleur du visage).
    coupeManche: 2.0, coupeBas: 0.93, mainsVisage: true,
    // (sans col ni liseré : un col sombre refaisait le col de chemise et la cravate autour du cou)
    fit: { haut: '#232327', bas: '#1b1b1e', bande: '#1b1b1e', coupe: 1.04, jambe: 0, manche: 0, col: 0, lisere: 0, contraste: 0.05 },
    model: 'assets/lamine.glb', modelHeight: 1.88 },    // avatar 3D Avaturn
  { id: 'djafar',  name: 'Djafar',         pos: 'Arrière',      number: 3,  height: 1.65, style: 'Vif, contre-attaque éclair',
    spd: 91, hdl: 86, in: 74, mid: 82, tp: 79, dnk: 64, def: 73, reb: 60, color1: '#ffd166', color2: '#1a1a1a', skin: '#c68642', badges: { fusee: 2, chevilles: 2, pickpocket: 2 },
    model: 'assets/djafar.glb', modelHeight: 1.886 },   // avatar 3D Avaturn (même taille que Clovis)
  { id: 'haris',   name: 'Haris',          pos: 'Meneur',       number: 11, height: 1.65, style: 'Créateur, il voit tout le terrain',
    spd: 90, hdl: 91, in: 74, mid: 83, tp: 81, dnk: 61, def: 71, reb: 57, color1: '#1f2024', color2: '#3f5f8f', skin: '#c68642', badges: { meneur: 3, mains: 2, comedien: 2 },
    model: 'assets/haris.glb', modelHeight: 1.892 },   // avatar 3D Avaturn (même gabarit que Clovis)
  { id: 'aiden',   name: 'Aiden',          pos: 'Ailier',       number: 23, height: 1.65, style: 'Explosif, il finit au-dessus du cercle',
    spd: 89, hdl: 80, in: 87, mid: 75, tp: 68, dnk: 88, def: 80, reb: 78, color1: '#15151a', color2: '#e04a3c', skin: '#5c3a1e', badges: { posterizer: 3, ressort: 2, acrobate: 1 },
    model: 'assets/aiden.glb', modelHeight: 1.883 },   // avatar 3D Avaturn (dnk 88 : il dunke même à l'arrêt)
  // TITOUAN et NICO : tailles donnees par Haythem, 1,68 m et 1,85 m. Je les avais devinees a l'envers — grand
  // pivot pour Titouan, arriere pour Nico — en me fiant a la taille de leur MODELE, qui ne veut rien dire :
  // tous les exports Avaturn sortent autour de 1,85 m quelle que soit la personne.
  //
  // `height` est la taille EN JEU : elle met le modele a l'echelle (player.js:160) et elle commande la portee
  // (game.js:1714), le poids au rebond (game.js:1718) et la force au contact (game.js:1117). `modelHeight`,
  // lui, est la taille du GLB relevee sur sa boite englobante — c'est le rapport des deux qui donne l'echelle.
  //
  // Les deux comblent un trou du groupe : personne ne harcelait le porteur, et aucun copain ne tenait la
  // raquette (les sept autres sont des exterieurs, tous les interieurs etaient des personnages fictifs).
  { id: 'titouan', name: 'Titouan',        pos: 'Arrière',      number: 33, height: 1.68, style: 'Harceleur, il colle au porteur',
    spd: 91, hdl: 84, in: 74, mid: 79, tp: 76, dnk: 56, def: 87, reb: 56, color1: '#5a189a', color2: '#e0d7f5', skin: '#e0ac69', badges: { harceleur: 3, pickpocket: 2, moteur: 2 },
    model: 'assets/titouan.glb', modelHeight: 1.867 },  // avatar 3D Avaturn (hauteur relevee sur sa boite englobante)
  { id: 'nico',    name: 'Nico',           pos: 'Ailier fort',  number: 9,  height: 1.85, style: 'Tient la raquette, protege le cercle',
    spd: 79, hdl: 66, in: 87, mid: 72, tp: 58, dnk: 80, def: 89, reb: 86, color1: '#e0115f', color2: '#f7f4ea', skin: '#c68642', badges: { muraille: 3, ressort: 2, costaud: 1 },
    model: 'assets/nico.glb', modelHeight: 1.825 },     // avatar 3D Avaturn
  // MASSYL, 1,65 m : le plus petit du groupe, et le premier vrai MANIEUR DE BALLON. Personne n'avait
  // `chevilles` au maximum — le casse-chevilles etait une capacite que le roster ne portait pas.
  //
  // ATTENTION A `modelHeight` : il se mesure sur le mesh du CORPS, pas sur la boite englobante de tout le
  // GLB. Le vetement de Massyl monte a 2,017 m alors que son corps s'arrete a 1,840, soit 23 cm d'ecart
  // (les huit autres avatars sont a 2 ou 3 cm pres, d'ou l'habitude). Avec 2,069 le rapport h/modelHeight
  // l'aurait rapetisse a 1,47 m au lieu de 1,65.
  { id: 'massyl',  name: 'Massyl',         pos: 'Meneur',       number: 4,  height: 1.65, style: 'Casse-chevilles, ballon colle a la main',
    spd: 92, hdl: 94, in: 70, mid: 80, tp: 78, dnk: 52, def: 68, reb: 52, color1: '#8ac926', color2: '#1f2024', skin: '#c68642', badges: { chevilles: 3, mains: 2, comedien: 1 },
    // Son avatar est livre en COSTUME, chapeau compris, et le chapeau fait partie du meme maillage que les
    // vetements. `coupeHaut` jette les triangles entierement au-dessus de 1,66 m : l'histogramme des
    // hauteurs du maillage montre un creux franc entre 1,60 et 1,70 — le col s'arrete en dessous, le
    // chapeau commence au-dessus. On voit donc ses cheveux, qui montent a 1,87.
    // Le reste du costume est repeint par le shader de tenues (js/fit.js) ; le costume d'origine est
    // en vente a la boutique.
    // Sa tenue de base est un MAILLOT DE FOOT parisien : bleu marine, large bande rouge verticale
    // encadree de deux liseres blancs. C'est la bande centrale du shader (centreL/centreLis), qui
    // tombe au meme endroit devant et derriere, contrairement a la bande laterale du survetement.
    // Pas d'ecusson ni de floquage : le jeu part en APK publique, on garde la coupe et les couleurs.
    coupeHaut: 1.66,
    // Un maillot du Parc n'a ni manches longues ni pantalon : on coupe la manche aux deux tiers du
    // bras et le bas juste au-dessus du genou. Le corps de l'avatar est complet sous le vetement,
    // donc ce qu'on enleve laisse voir des bras et des jambes, pas un trou.
    coupeManche: 0.45, coupeJambe: 0.40, coupeBas: 0.93,
    fit: { haut: '#0f1a45', bas: '#0f1a45', bande: '#f2f3f0', centre: '#cf1230', centreL: 0.078, centreLis: 0.013, coupe: 1.04, jambe: 0, manche: 0.13, col: 3.02, lisere: 0.03, contraste: 0.80 },
    model: 'assets/massyl.glb', modelHeight: 1.836 },   // avatar 3D Avaturn (hauteur du CORPS, pas du GLB entier)
  { id: 'boateng', name: 'Kwame Boateng',  pos: 'Ailier',       number: 7,  height: 2.01, style: 'Complet, athlète',
    spd: 85, hdl: 82, in: 84, mid: 80, tp: 74, dnk: 88, def: 80, reb: 82, color1: '#2a9d8f', color2: '#e9c46a', skin: '#5c3a1e', badges: { moteur: 2, harceleur: 2, acrobate: 1 } },
  { id: 'haddad',  name: 'Idris Haddad',   pos: 'Ailier fort',  number: 21, height: 2.06, style: 'Dunkeur, bulldozer',
    spd: 74, hdl: 62, in: 90, mid: 66, tp: 42, dnk: 96, def: 84, reb: 92, color1: '#6a040f', color2: '#ffba08', skin: '#8d5524', badges: { posterizer: 2, costaud: 3, aspirateur: 2 } },
  { id: 'novak',   name: 'Viktor Novak',   pos: 'Pivot',        number: 50, height: 2.13, style: 'Mur, roi de la raquette',
    spd: 62, hdl: 50, in: 95, mid: 58, tp: 30, dnk: 88, def: 92, reb: 94, color1: '#3a0ca3', color2: '#f72585', skin: '#ffdbac', badges: { muraille: 3, aspirateur: 3, costaud: 2 } },
  { id: 'dasilva', name: 'Hugo Da Silva',  pos: 'Arrière',      number: 24, height: 1.90, style: 'Mi-distance chirurgicale',
    spd: 86, hdl: 88, in: 74, mid: 92, tp: 80, dnk: 50, def: 70, reb: 66, color1: '#0b2545', color2: '#eef4ed', skin: '#e0ac69', badges: { poignet: 3, sangfroid: 2, meneur: 1 } },
  // KOJI (02/10/2026) : avatar Avaturn donné par Haythem (Downloads/model (2).glb → assets/koji.glb), 1,75 m, rareté
  // IMMORTEL (js/gacha.js). Même squelette de 52 os que les autres avatars (vérifié os par os) : toutes les
  // animations lui vont telles quelles. modelHeight = boîte du GLB, cheveux compris (le corps seul monte à 1,878).
  // Ajouté EN FIN de tableau : le joueur choisi et les compositions sont sauvegardés par INDEX (js/ui.js, fixSaved),
  // une fiche insérée au milieu les décalerait. Tresses plaquées, t-shirt blanc, jean noir, baskets rouge et noir :
  // ses couleurs. Spécialiste du TIR, pour compléter les deux autres « monstres » (Haythem à la finition, Ethan sous
  // la raquette) : tir à 3 points et mi-distance d'élite, vitesse et dribble très hauts, pas de dunk (dnk < 60).
  { id: 'koji',    name: 'Koji',           pos: 'Arrière',      number: 0,  height: 1.75, style: 'Sniper, la main la plus chaude du parc',
    spd: 95, hdl: 94, in: 86, mid: 97, tp: 99, dnk: 45, def: 80, reb: 70, color1: '#f2f2ef', color2: '#c4161c', skin: '#4a2c1a', badges: { sniper: 3, sangfroid: 3, clutch: 3 },
    model: 'assets/koji.glb', modelHeight: 1.888 },
  // ANTOINE et MARC ANTOINE (04/10/2026) : avatars Avaturn donnés par Haythem (Downloads/model (2).glb →
  // assets/antoine.glb, Downloads/model (1).glb → assets/marcantoine.glb). Antoine, c'est le BLOND (t-shirt blanc,
  // jean noir) ; Marc Antoine, le brun en bleu marine. Tailles données par Haythem : 1,85 m (corrigée le 04/10, d'abord 1,80) et 1,83 m. Raretés :
  // Antoine LÉGENDAIRE, Marc Antoine ÉPIQUE (js/gacha.js) — le premier personnage épique, le panier violet n'est plus vide.
  // Même squelette de 52 os que les autres avatars (vérifié os par os). modelHeight = boîte du GLB, cheveux compris
  // (le corps seul monte à 1,849 pour Antoine et à 1,837 pour Marc Antoine : moins de 3 cm d'écart, pas le piège de Massyl).
  // Ajoutés EN FIN de tableau, comme Koji : les choix sauvegardés sont des index.
  // Antoine : un ailier COMPLET, au niveau d'Ethan (l'autre légendaire) — rien de faible, rien d'immortel non plus.
  { id: 'antoine', name: 'Antoine',        pos: 'Ailier',       number: 6,  height: 1.85, style: 'Complet, il fait tout bien',
    spd: 88, hdl: 86, in: 88, mid: 87, tp: 85, dnk: 62, def: 82, reb: 80, color1: '#f2f2ef', color2: '#d9b25f', skin: '#e8b49a', badges: { meneur: 3, poignet: 3, moteur: 2 },
    model: 'assets/antoine.glb', modelHeight: 1.85 },
  // Marc Antoine : un ailier fort DÉFENSEUR, un cran sous les légendaires (épique : capacités 2-2-2).
  { id: 'marcantoine', name: 'Marc Antoine', pos: 'Ailier fort', number: 13, height: 1.83, style: 'Défenseur, il ferme la raquette',
    spd: 80, hdl: 74, in: 85, mid: 77, tp: 70, dnk: 76, def: 87, reb: 85, color1: '#14284b', color2: '#ffffff', skin: '#e8b49a', badges: { muraille: 2, aspirateur: 2, ressort: 2 },
    model: 'assets/marcantoine.glb', modelHeight: 1.861 },
  // IMAD et NEMANJA (04/10/2026) : avatars Avaturn donnés par Haythem (Downloads/model (3).glb → assets/imad.glb,
  // Downloads/model (4).glb → assets/nemanja.glb), même squelette de 52 os. Tailles données par Haythem : 1,89 m et
  // 1,95 m. Raretés : Imad ÉPIQUE, Nemanja LÉGENDAIRE (js/gacha.js). modelHeight = boîte du GLB, cheveux ou casquette
  // compris (corps seul : 1,839 et 1,852, moins de 3 cm d'écart). En fin de tableau, comme toujours (index sauvegardés).
  // Imad : débardeur gris, jean, baskets rouges — un ailier athlétique qui attaque le cercle (épique : capacités 2-2-2).
  { id: 'imad',    name: 'Imad',           pos: 'Ailier',       number: 2,  height: 1.89, style: 'Athlète, il attaque le cercle',
    spd: 86, hdl: 82, in: 85, mid: 79, tp: 76, dnk: 82, def: 76, reb: 74, color1: '#2b2b2e', color2: '#c4161c', skin: '#e8b49a', badges: { posterizer: 2, ressort: 2, fusee: 2 },
    model: 'assets/imad.glb', modelHeight: 1.864 },
  // Nemanja : « un joueur comme Ethan, très fort au poste et en physique » (Haythem). Le profil d'Ethan — poste bas,
  // rebond, bon tir de près — en plus costaud et plus grand : intérieur et rebond au sommet, défense solide, et à
  // 1,95 m il finit au dunk. Casquette, costume noir, baskets orange.
  { id: 'nemanja', name: 'Nemanja',        pos: 'Pivot',        number: 15, height: 1.95, style: 'Poste bas, un mur physique sous le cercle',
    spd: 76, hdl: 74, in: 95, mid: 85, tp: 74, dnk: 84, def: 86, reb: 96, color1: '#141414', color2: '#f5a623', skin: '#e8b49a', badges: { costaud: 3, aspirateur: 3, muraille: 2 },
    model: 'assets/nemanja.glb', modelHeight: 1.861 },
  // GABRIEL (04/10/2026) : avatar Avaturn donné par Haythem (Downloads/model.glb → assets/gabriel.glb), même squelette de
  // 52 os. 1,79 m, 63 kg, rareté ÉPIQUE (js/gacha.js). « Un très bon shooter à 3 points » : tir à 3 points au niveau des
  // meilleurs, mi-distance solide. Le jeu n'a pas de champ de poids (taille = portée, poids au rebond et force au
  // contact) : ses 63 kg sont dans la fiche — vif, mais léger au rebond et en défense, pas de dunk.
  // Costume noir, baskets rouges. modelHeight = boîte du GLB, cheveux compris (corps seul : 1,841).
  { id: 'gabriel', name: 'Gabriel',        pos: 'Arrière',      number: 30, height: 1.79, style: 'Shooteur, il punit de loin',
    spd: 87, hdl: 83, in: 70, mid: 87, tp: 95, dnk: 45, def: 68, reb: 55, color1: '#161618', color2: '#c4161c', skin: '#e8b49a', badges: { sniper: 2, portee: 2, sangfroid: 2 },
    model: 'assets/gabriel.glb', modelHeight: 1.865 },
  // YAZID (06/10/2026) : avatar Avaturn donné par Haythem (Downloads/1000052212.bin — un GLB malgré son extension →
  // assets/yazid.glb), même squelette de 52 os. 1,84 m, rareté ÉPIQUE (js/gacha.js). « Moyen en tout » : 80 partout, ni
  // point fort ni point faible, et des capacités d'épique (2-2-2) prises une par famille — tir, dribble, athlétisme.
  // Qamis blanc, keffieh rouge et blanc, baskets noir et rouge. modelHeight = haut du GLB : le corps monte à 1,851 et le
  // vêtement (keffieh compris) à 1,852 (pas le piège de Massyl). En fin de tableau, comme toujours (index sauvegardés).
  { id: 'yazid',   name: 'Yazid',          pos: 'Ailier',       number: 12, height: 1.84, style: 'Polyvalent, il fait un peu de tout',
    spd: 80, hdl: 80, in: 80, mid: 80, tp: 80, dnk: 80, def: 80, reb: 80, color1: '#f2f2ef', color2: '#c4161c', skin: '#c68642', badges: { poignet: 2, mains: 2, moteur: 2 },
    model: 'assets/yazid.glb', modelHeight: 1.852 },
];
