// =====================================================================
//  L'APPLI « PLAN » DU TÉLÉPHONE (lot C2 du chantier « parc complet »)
// =====================================================================
// Au parc de Bécon EN ENTIER, le téléphone du jeu (js/phone.js) a une seconde appli à côté du groupe de messages :
// le plan du parc. On y voit où l'on est, où sont ses amis connectés, et l'on choisit un lieu où « aller » : un fondu
// au noir, et l'on y est, posé sur le sol. Sur téléphone, traverser les 300 m du parc à pied prend presque une minute
// (conception, § 3.9) : c'est le raccourci.
//
// LA CARTE N'EST PAS DESSINÉE À LA MAIN : elle est LUE dans les données du monde (js/monde_donnees.js, déjà chargées
// par le parc entier — aucun fichier de plus, sauf batiments.json, 7 Ko) :
//   - le FOND, un pixel par nœud de la grille de 0,5 m (441 x 671) : la surface de chaque nœud (surfaces.bin : pelouse,
//     sous-bois, massif, eau, allée…), le dehors du parc éteint (drapeau « balle perdue » de drapeaux.bin), un ombrage
//     du relief tiré de sol.bin (le coteau se lit d'un coup d'œil) et un trait sombre partout où le sol saute de plus de
//     40 cm d'un nœud au suivant, c'est-à-dire aux murs de soutènement, aux bords de terrasse et aux rangs de gradins
//     (les frontières des nappes de nappes.bin) ;
//   - par-dessus, en VECTEURS (nets à tous les zooms) : les allées et les rampes de monde.json à leur vraie largeur et
//     dans la teinte de leur matériau, le graphe des allées (les passages que seuls les promeneurs connaissent), les
//     escaliers marche par marche, les murs, les garde-corps et les grilles de l'enceinte, les bâtiments
//     (batiments.json), les contours des zones et leurs noms, les lieux (monde.json > lieux, plus ceux des zones) ;
//   - enfin, ce qui bouge : les vélos là où ils sont garés, les amis (js/presence.js) avec leur pseudo, et soi-même
//     en flèche, tournée vers son cap, avec le cône de ce que regarde la caméra.
// (sols.webp n'y sert pas : c'est une carte de mélange dont l'alpha vaut 0 presque partout, et un canevas 2D jette les
// couleurs d'un pixel transparent. surfaces.bin dit la même chose, nœud par nœud.)
//
// L'ORIENTATION. Celle du repère du jeu, comme vue d'avion : x+ (le quai, la Seine) à DROITE, z+ (le pin, la pointe
// sud-ouest) en BAS — le parc, long de 307 m sur 158, tient debout dans l'écran du téléphone. Le nord n'est donc pas en
// haut : la boussole le montre (l'axe x+ est au cap 150,75°, conception § 0, D1 : le nord est en haut à gauche).
//
// « ALLER À » (aller) : le lieu choisi n'est qu'un point. On cherche autour de lui, en spirale, le premier endroit où
// un promeneur tient debout (pointDePose) : sur une nappe de terrain (jamais un escalier, un gradin, le fond d'un
// bassin), marchable, sans eau, dans le parc, à plat, loin d'un bord, et hors de tout obstacle déclaré du monde — un
// mur, une grille, un tronc, un BÂTIMENT (le sol du monde est celui du LiDAR débarrassé du bâti : un toit n'est jamais
// une hauteur de sol ; ce sont les boîtes des bâtiments, dans les obstacles, qui disent où ils sont). Puis : téléphone
// rangé, fondu au noir (0,2 s), le joueur est posé à Monde.sol, la caméra derrière lui dans le cap du lieu, on laisse
// l'ordonnanceur (js/monde_charge.js) construire ce qui est tout près (40 images ou 3 s au plus, 50 images ou 4 s sur
// téléphone : voir attendreDecor), et l'image revient (0,25 s). (Relecture, mesuré sur le GPU partagé : le noir dure de
// 3 à 6 s à la première visite d'une zone, dont 2 à 4 s pour UNE image — la première où ses matériaux se compilent —,
// que le fondu cache ; l'ordonnanceur, lui, n'y prend jamais plus de 30 ms d'affilée.)
//
// HORS DU PARC ENTIER (La Cage, Levallois, Jemmapes, et le parc drapeau baissé : Monde.plat), l'appli dit simplement
// que le plan n'existe qu'au parc (au parc lui-même, en plateau seul, elle dit où lever le parc entier : htmlHors).
// Rien n'est chargé.
//
// AU DOIGT : glisser = déplacer la carte, pincer = zoomer, toucher un repère = le choisir. À LA SOURIS : la molette
// zoome. À LA MANETTE (js/manette_menus.js) : la croix parcourt la liste des lieux, A choisit puis « Y aller », le stick
// droit déplace la carte, Y / X zooment, R3 recentre sur soi, LB / RB passent d'une appli à l'autre.
import { Monde, DRAPEAU } from './monde.js';
import { chargerMonde } from './monde_donnees.js';
import { TELEPHONE } from './appareil.js';

const DOSSIER = 'assets/parc/monde/';
// (la détection du téléphone vient de js/appareil.js, la même pour tout le jeu)

// LE NORD dans le repère du jeu : le cap de l'axe x+ est de 150,75° (D1). Une direction qui fait un angle θ (sens des
// aiguilles d'une montre, vu d'avion) avec x+ est au cap 150,75° + θ ; le nord (cap 0) est donc à θ = -150,75°.
const ANGLE_NORD = -150.75 * Math.PI / 180;

// Les zooms (pixels de l'écran du téléphone par mètre). Au plus serré, une allée de 3 m fait 24 pixels.
const ZOOM_MAX = 8, ZOOM_DEPART = 2.2;
// La recherche d'un point de pose autour d'un lieu : jusqu'à 14 m, par anneaux de 0,5 m.
const POSE_RAYON = 14, POSE_PAS = 0.5;
// Les nappes où l'on peut être posé (monde.json > nappes[].type) : pas les escaliers, ni les gradins, ni le bassin ; et
// pas une nappe de moins de NAPPE_MIN nœuds (50 m²).
const NAPPES_POSABLES = new Set(['terrain', 'plateau', 'scene']), NAPPE_MIN = 200;
// Le départ de la balade sur le plateau (Game.enterLobby) : c'est là que ramène le lieu « Plateau », face au panier,
// hors du cercle bleu et de celui des ateliers.
const DEPART_BALADE = { x: 0, z: 3.5 };
// Le fondu (s) et l'attente, au noir, que le décor tout proche soit construit (s) ; « tout proche » : à moins de 25 m.
// (La première image du nouvel endroit est souvent longue — le sol y passe au détail, les matériaux d'une zone encore
// jamais vue se compilent — : mieux vaut qu'elle passe au noir. D'où une attente bornée en IMAGES, et en temps en dernier
// recours.)
const FONDU_NOIR = 0.2, FONDU_RETOUR = 0.25, PROCHE = 25;
const ATTENTE_IMAGES = TELEPHONE ? 50 : 40, ATTENTE_MAX = TELEPHONE ? 4 : 3;
// Au noir, le temps de construction accordé par image (ms), au lieu des 2 à 4 ms du jeu (voir attendreDecor)
const BUDGET_NOIR = TELEPHONE ? 26 : 22;

// ---------------------------------------------------------------------------------------------------------------------
//  LES COULEURS DE LA CARTE (un plan de parc clair, comme une appli de cartes)
// ---------------------------------------------------------------------------------------------------------------------
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// Le fond, par surface (surfaces.bin, js/monde.js > SURFACE), dans le parc puis au dehors (plus éteint)
const FOND_PARC = [
  '#c9c7cf', // 0 enrobé (le plateau)
  '#e3bdb0', // 1 asphalte rouge
  '#eee0cc', // 2 stabilisé
  '#e6d0bf', // 3 terre battue
  '#f3eee4', // 4 gravier blanc
  '#e9e3d9', // 5 dalles
  '#bcd9a0', // 6 herbe
  '#a6c98f', // 7 sous-bois
  '#dcc2a5', // 8 copeaux
  '#f1e3bd', // 9 sable
  '#f4f1ea', // 10 béton clair
  '#e9c3cd', // 11 massif
  '#9fcde8', // 12 eau
  '#fbfbfb', // 13 chaussée
  '#e7e4df', // 14 trottoir
].map(hex);
const FOND_DEHORS = FOND_PARC.map((c, i) => (i === 12 ? c : i === 13 ? hex('#fdfdfd') : i === 14 ? hex('#dedbd5')
  : i === 6 || i === 7 ? hex('#d3dcc6') : hex('#e4e1da')));
const HORS_MONDE = '#e4e1da';
const EAU = hex('#9fcde8');
const MUR = hex('#6f6456');
const MARCHES = hex('#e2dbcf');
// Les allées vectorielles : [remplissage, bordure], par matériau (monde.json > allees[].surface)
const ALLEES = {
  asphalte_rouge: ['#e6c0b3', '#c79787'], asphalte: ['#dedee3', '#b4b4bc'], stabilise: ['#f1e5d3', '#d2bea2'],
  terre_battue: ['#ead6c5', '#cdb19b'], gravier_blanc: ['#f7f3ea', '#d5ccbb'], beton_clair: ['#f8f6f1', '#d6d1c6'],
  dalles: ['#eee8df', '#cbc2b4'], enrobe: ['#d4d2d8', '#adabb3'],
};
const ALLEE_DEFAUT = ['#f4efe6', '#d3cabb'];
// Les repères : lieux, lieu choisi, vélos, soi-même
const C_LIEU = '#e8622a', C_CHOIX = '#e0245e', C_VELO = '#1f5fbf', C_MOI = '#1a73e8';

// Le nom court d'une zone : ce qui précède la première virgule, le premier « et » ou la première parenthèse
// (« Esplanade des platanes et façade Charras » -> « Esplanade des platanes »).
const nomCourt = (nom) => String(nom || '').split(/,| et | \(/)[0].trim();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const distTexte = (d) => (d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`);
const idDom = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_');

export class PlanParc {
  // `racine` : le conteneur de l'appli dans le téléphone (#phone-plan). Options : `jeu()` rend la partie (js/game.js),
  // `ranger()` range le téléphone, `ouvert()` dit s'il est sorti (rouvert pendant le fondu, il garde les commandes du
  // jeu bloquées), `couleur(nom)` la couleur d'un ami (la même que dans le groupe de messages).
  constructor(racine, { jeu = () => null, ranger = () => {}, ouvert = () => false, couleur = () => '#6fb7ff' } = {}) {
    this.racine = racine; this.jeu = jeu; this.ranger = ranger; this.ouvert = ouvert; this.couleur = couleur;
    this.visible = false;
    this.etat = 'rien';                  // rien | hors | chargement | pret | erreur
    this.D = null;                       // les données du monde (chargerMonde)
    this.vue = { cx: -8.7, cz: 0, s: ZOOM_DEPART };      // centre (repère du terrain 1) et zoom affichés
    this.cible = { cx: -8.7, cz: 0, s: ZOOM_DEPART };    // ... et ceux vers lesquels on glisse
    this.suivre = true;                  // la carte suit le joueur (jusqu'à ce qu'on la déplace)
    this.sel = null;                     // le repère choisi : { cle } ('lieu:belvedere', 'ami:<id>')
    this.pointeurs = new Map();
    this.raf = 0; this._t = 0; this._tDessin = 0; this._tListe = 0;
    this.enRoute = false;                // une téléportation est en cours (fondu)
    this._boucle = (t) => this.boucle(t);
    // au téléphone (écran bas en paysage, étroit en portrait : la même règle que css/style.css), les écritures de la
    // carte ne descendent pas sous 12 px — elles étaient en 9,5 à 11 px, sur un téléphone du jeu à sa taille réelle
    this.petit = window.matchMedia ? window.matchMedia('(max-height: 520px), (max-width: 520px)') : null;
    if (racine) racine.addEventListener('click', (e) => this.clic(e));
  }

  // ------------------------------------------------------------------------------------------------ ouvrir / fermer
  montrer() {
    this.visible = true;
    if (Monde.plat) { this.etat = 'hors'; this.racine.innerHTML = this.htmlHors(); return; }
    if (this.etat === 'pret') { this.mesurer(); this.majListe(true); this.demarrer(); return; }
    if (this.etat === 'chargement') return;
    this.etat = 'chargement';
    this.racine.innerHTML = '<div class="plan-msg"><b>Plan du parc</b><span>Chargement de la carte…</span></div>';
    this.preparer().then(() => {
      this.etat = 'pret';
      this.racine.innerHTML = this.htmlCarte();
      this.lier();
      this.majListe(true);
      if (this.visible) { this.mesurer(); this.demarrer(); }
    }).catch((e) => {
      console.warn('[plan] carte du parc indisponible :', e);
      this.etat = 'erreur';
      this.racine.innerHTML = '<div class="plan-msg"><b>Plan du parc</b><span>La carte n\'a pas pu se charger.</span></div>';
    });
  }
  cacher() {
    this.visible = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    this.pointeurs.clear();
  }
  demarrer() { if (!this.raf) { this._t = 0; this.raf = requestAnimationFrame(this._boucle); } }

  // Le sous-titre de l'en-tête du téléphone (js/phone.js) quand l'appli est ouverte
  sousTitre() { return Monde.plat ? (this.auParc() ? 'Parc de Bécon · plateau seul' : 'Seulement au parc de Bécon') : 'Parc de Bécon · Courbevoie'; }

  // AU PARC DE BÉCON EN PLATEAU SEUL (le réglage par défaut au téléphone, donc dans l'APK), le joueur EST au parc :
  // « le plan n'existe qu'au parc de Bécon, en entier » le laissait sans issue (recette finale, B6). On lui dit alors
  // où lever le parc entier (js/ui.js, onglet Graphismes, groupe PARC DE BÉCON, ligne « Parc en entier »). Le terrain
  // se lit dans les réglages de la partie (js/game.js : this.settings).
  auParc() {
    const g = this.jeu(), t = g && g.settings && g.settings.game && g.settings.game.terrain;
    return t === 'parc' || t === 'parc2';
  }

  htmlHors() {
    if (this.auParc()) {
      return `<div class="plan-msg"><i class="plan-msg-ic">🗺️</i><b>Plan du parc</b>`
        + `<span>Le plan couvre le parc de Bécon en entier ; ici, seul le plateau est chargé.</span>`
        + `<span>Pour le parc entier : <span style="color:#eef1f6;font-weight:700">Options › Graphismes › Parc de Bécon › Parc en entier : EN ENTIER</span></span>`
        + `<span class="plan-msg-pt">Plus lourd, surtout pour un téléphone. La page se recharge.</span></div>`;
    }
    return `<div class="plan-msg"><i class="plan-msg-ic">🗺️</i><b>Plan du parc</b>`
      + `<span>Le plan n'existe qu'au parc de Bécon, en entier.</span>`
      + `<span class="plan-msg-pt">Ici, tout est à portée de vue : le terrain, le cercle bleu et la balade autour.</span></div>`;
  }

  htmlCarte() {
    return `<div class="plan-carte" id="plan-carte">
        <canvas class="plan-canvas" id="plan-canvas" aria-label="Carte du parc de Bécon"></canvas>
        <div class="plan-zoom"><button id="plan-plus" aria-label="Zoomer">+</button><button id="plan-moins" aria-label="Dézoomer">−</button></div>
        <button class="plan-moi on" id="plan-moi" aria-label="Recentrer sur moi"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M10 1.5 17 18l-7-3.6L3 18z" fill="currentColor"/></svg></button>
        <div class="plan-echelle" id="plan-echelle"><i></i><span></span></div>
        <div class="plan-note" id="plan-note" hidden></div>
      </div>
      <div class="plan-liste" id="plan-liste"></div>`;
  }

  // ------------------------------------------------------------------------------------------------ les données
  // Une fois : les données du monde (la promesse déjà tenue du parc entier : rien n'est rechargé), les bâtiments, puis
  // le fond de carte et les tracés.
  async preparer() {
    const D = await chargerMonde();
    let bat = null;
    try {
      const r = await fetch(DOSSIER + 'batiments.json');
      if (r.ok) bat = await r.json();
    } catch (e) { /* sans bâtiments : les boîtes des obstacles les remplacent */ }
    this.D = D;
    this.typeNappe = []; this.tailleNappe = [];
    for (const n of D.nappes || []) { this.typeNappe[n.id] = n.type; this.tailleNappe[n.id] = n.noeuds || 0; }
    this.construireFond(D);
    this.construireTraces(D, bat);
    this.construireZones(D);
    this.lieux = (Monde.lieux.length ? Monde.lieux : D.lieux || []).filter((l) => Number.isFinite(l.x) && Number.isFinite(l.z));
    const R = D.repere;
    this.borne = { x0: R.x0, z0: R.z0, x1: R.x0 + R.pas * (R.nx - 1), z1: R.z0 + R.pas * (R.nz - 1) };
  }

  // LE FOND : un pixel par nœud. Couleur de la surface (dans le parc ou au dehors), eau, marches ; ombrage du relief
  // (lumière venue du haut à gauche de la carte, l'usage des cartes) ; trait sombre là où le sol saute de plus de 40 cm.
  construireFond(D) {
    const R = D.repere, nx = R.nx, nz = R.nz, G = D.grilles, pas = R.pas;
    const sol = G.sol, nap = G.nappes, dra = G.drapeaux, sur = G.surfaces;
    const cv = document.createElement('canvas');
    cv.width = nx; cv.height = nz;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(nx, nz), px = img.data;
    const hors = hex(HORS_MONDE), escalier = [];
    for (let id = 0; id < this.typeNappe.length; id++) escalier[id] = this.typeNappe[id] === 'escalier';
    // la lumière (vers la source) : du haut à gauche de la carte (x-, z-) et d'en haut
    const lx = -0.5, ly = 0.75, lz = -0.5, l0 = ly;
    for (let k = 0; k < nz; k++) {
      for (let i = 0; i < nx; i++) {
        const n = k * nx + i, o = n * 4, f = dra[n];
        let c;
        if (!nap[n]) c = hors;
        else if (f & DRAPEAU.EAU) c = EAU;
        else if (escalier[nap[n]]) c = MARCHES;
        else c = (f & DRAPEAU.BALLE_PERDUE ? FOND_DEHORS : FOND_PARC)[sur[n]] || hors;
        // l'ombrage : la pente (bornée, un mur n'est pas une pente) éclairée par la lumière
        const h = sol[n];
        const hg = sol[i > 0 ? n - 1 : n], hd = sol[i < nx - 1 ? n + 1 : n], hh = sol[k > 0 ? n - nx : n], hb = sol[k < nz - 1 ? n + nx : n];
        let gx = (hd - hg) / (200 * pas), gz = (hb - hh) / (200 * pas);
        gx = gx > 1.2 ? 1.2 : gx < -1.2 ? -1.2 : gx; gz = gz > 1.2 ? 1.2 : gz < -1.2 ? -1.2 : gz;
        const ln = Math.sqrt(gx * gx + 1 + gz * gz);
        let e = ((-gx * lx + ly - gz * lz) / ln) / l0;
        e = 1 + (e - 1) * 0.55;
        e = e < 0.72 ? 0.72 : e > 1.12 ? 1.12 : e;
        let r = c[0] * e, g = c[1] * e, b = c[2] * e;
        // le saut de sol (cm) avec un voisin d'une AUTRE nappe : un mur, un bord de terrasse, un rang de gradin. (Dans
        // une même nappe, c'est une pente — le talus fleuri du belvédère, à 100 % — et l'ombrage suffit ; seule une
        // falaise de plus d'un mètre d'un nœud au suivant y est tracée.)
        const nn = nap[n];
        const saut = Math.max(
          Math.abs(h - hg) - (i > 0 && nap[n - 1] === nn ? 60 : 0), Math.abs(h - hd) - (i < nx - 1 && nap[n + 1] === nn ? 60 : 0),
          Math.abs(h - hh) - (k > 0 && nap[n - nx] === nn ? 60 : 0), Math.abs(h - hb) - (k < nz - 1 && nap[n + nx] === nn ? 60 : 0));
        if (saut > 40 && nn) { const m = saut > 120 ? 0.7 : 0.45; r += (MUR[0] - r) * m; g += (MUR[1] - g) * m; b += (MUR[2] - b) * m; }
        px[o] = r > 255 ? 255 : r; px[o + 1] = g > 255 ? 255 : g; px[o + 2] = b > 255 ? 255 : b; px[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.fond = cv;
  }

  // LES TRACÉS, une fois, en Path2D dans le repère du terrain 1 (en mètres) : la transformation de la vue les met à
  // l'échelle à chaque image.
  construireTraces(D, bat) {
    const ligne = (pts) => { const p = new Path2D(); pts.forEach(([x, z], j) => (j ? p.lineTo(x, z) : p.moveTo(x, z))); return p; };
    // les allées et les rampes, par matériau et par largeur (une épaisseur de trait par chemin)
    this.allees = [];
    for (const a of [...(D.allees || []), ...(D.rampes || [])]) {
      if (!a.trace || a.trace.length < 2) continue;
      const [rem, bord] = ALLEES[a.surface] || ALLEE_DEFAUT;
      this.allees.push({ p: ligne(a.trace), l: a.largeur || 2.5, rem, bord });
    }
    // le graphe des allées (monde.json > graphe) : tous les passages, même ceux qu'aucune allée maillée ne dessine
    const g = D.graphe;
    this.graphe = new Path2D(); this.grapheEsc = new Path2D();
    if (g && g.noeuds && g.aretes) {
      const tEsc = (g.types || []).indexOf('escalier');
      for (const [a, b, t] of g.aretes) {
        const A = g.noeuds[a], B = g.noeuds[b];
        if (!A || !B) continue;
        const p = t === tEsc ? this.grapheEsc : this.graphe;
        p.moveTo(A[0], A[1]); p.lineTo(B[0], B[1]);
      }
    }
    // les escaliers : le rectangle de la volée et ses marches
    this.escaliers = [];
    for (const e of D.escaliers || []) {
      if (!e.de || !e.a) continue;
      const dx = e.a[0] - e.de[0], dz = e.a[1] - e.de[1], L = Math.hypot(dx, dz);
      if (L < 0.2) continue;
      const ux = dx / L, uz = dz / L, w = (e.largeur || 1.5) / 2, vx = -uz * w, vz = ux * w;
      const cadre = new Path2D();
      cadre.moveTo(e.de[0] + vx, e.de[1] + vz); cadre.lineTo(e.a[0] + vx, e.a[1] + vz);
      cadre.lineTo(e.a[0] - vx, e.a[1] - vz); cadre.lineTo(e.de[0] - vx, e.de[1] - vz); cadre.closePath();
      const marches = new Path2D(), n = Math.max(2, e.marches || Math.round(L / 0.3));
      for (let j = 1; j < n; j++) {
        const t = j / n, x = e.de[0] + dx * t, z = e.de[1] + dz * t;
        marches.moveTo(x + vx, z + vz); marches.lineTo(x - vx, z - vz);
      }
      this.escaliers.push({ cadre, marches, giron: L / n });
    }
    // les murs (épaisseur réelle), les garde-corps et balustrades, les grilles de l'enceinte
    this.murs = [];
    for (const m of D.murs || []) if (m.ligne && m.ligne.length > 1) this.murs.push({ p: ligne(m.ligne), e: m.epaisseur || 0.4 });
    this.gardes = new Path2D();
    for (const m of D.gardes || []) if (m.ligne && m.ligne.length > 1) this.gardes.addPath(ligne(m.ligne));
    this.grilles = new Path2D();
    let grilles = 0;
    for (const c of D.clotures || []) for (const morceau of c.morceaux || []) if (morceau.length > 1) { this.grilles.addPath(ligne(morceau)); grilles++; }
    if (!grilles) for (const poly of D.enceinte || []) { const p = ligne(poly); p.closePath(); this.grilles.addPath(p); }
    // les bâtiments : les polygones de batiments.json, sinon les boîtes des obstacles
    this.batiments = [];
    const liste = bat && Array.isArray(bat.batiments) ? bat.batiments : [];
    for (const b of liste) {
      if (!b.poly || b.poly.length < 3) continue;
      const p = ligne(b.poly); p.closePath();
      this.batiments.push({ p, parc: !!b.parc });
    }
    if (!this.batiments.length) {
      for (const o of D.obstacles || []) {
        if (o.t !== 'b') continue;
        const c = Math.cos(o.a || 0), s = Math.sin(o.a || 0), p = new Path2D();
        [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([a, b], j) => {
          const x = o.x + o.hx * a * c - o.hz * b * s, z = o.z + o.hx * a * s + o.hz * b * c;
          if (j) p.lineTo(x, z); else p.moveTo(x, z);
        });
        p.closePath();
        this.batiments.push({ p, parc: true });
      }
    }
  }

  // LES ZONES DU PARC (monde.json > zones, Z01 à Z18 : Z19 et Z20 sont au dehors) : leurs emprises se chevauchent (le
  // musée est dans le parc haut, l'allée haute longe les coteaux), alors chaque nœud du parc va à la PLUS PETITE emprise
  // qui le contient — une partition, dont les frontières sont des morceaux de côtés de rectangles. On garde ces
  // frontières (traits fins pointillés) et, pour chaque zone, un point où écrire son nom.
  construireZones(D) {
    const R = D.repere, nx = R.nx, nz = R.nz, pas = R.pas, dra = D.grilles.drapeaux;
    const zones = (D.zones || []).filter((z) => Array.isArray(z.emprise) && z.emprise.length === 4 && !/^Z(19|20)$/.test(z.id));
    const ordre = zones.map((z, j) => ({ z, j, aire: (z.emprise[2] - z.emprise[0]) * (z.emprise[3] - z.emprise[1]) }))
      .sort((a, b) => b.aire - a.aire);
    const zg = new Uint8Array(nx * nz);
    const dansParc = (n) => !(dra[n] & DRAPEAU.BALLE_PERDUE);
    for (const { z, j } of ordre) {                      // de la plus grande à la plus petite : la petite recouvre
      const [x0, z0, x1, z1] = z.emprise;
      const i0 = Math.max(0, Math.ceil((x0 - R.x0) / pas)), i1 = Math.min(nx - 1, Math.floor((x1 - R.x0) / pas));
      const k0 = Math.max(0, Math.ceil((z0 - R.z0) / pas)), k1 = Math.min(nz - 1, Math.floor((z1 - R.z0) / pas));
      for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) { const n = k * nx + i; if (dansParc(n)) zg[n] = j + 1; }
    }
    // les frontières : entre deux voisins du parc de zones différentes, un côté de case ; les côtés alignés se suivent
    // et se fondent en un seul trait
    const p = new Path2D();
    const ouvertV = new Int32Array(nx).fill(-1), ouvertH = new Int32Array(nz).fill(-1);
    for (let k = 0; k <= nz; k++) {
      for (let i = 0; i < nx - 1; i++) {                 // frontières verticales (entre i et i + 1), le long de z
        const n = k * nx + i, diff = k < nz && zg[n] && zg[n + 1] && zg[n] !== zg[n + 1];
        if (diff && ouvertV[i] < 0) ouvertV[i] = k;
        else if (!diff && ouvertV[i] >= 0) {
          const x = R.x0 + pas * (i + 0.5);
          p.moveTo(x, R.z0 + pas * (ouvertV[i] - 0.5)); p.lineTo(x, R.z0 + pas * (k - 0.5));
          ouvertV[i] = -1;
        }
      }
    }
    for (let i = 0; i <= nx; i++) {
      for (let k = 0; k < nz - 1; k++) {                 // frontières horizontales (entre k et k + 1), le long de x
        const n = k * nx + i, diff = i < nx && zg[n] && zg[n + nx] && zg[n] !== zg[n + nx];
        if (diff && ouvertH[k] < 0) ouvertH[k] = i;
        else if (!diff && ouvertH[k] >= 0) {
          const z = R.z0 + pas * (k + 0.5);
          p.moveTo(R.x0 + pas * (ouvertH[k] - 0.5), z); p.lineTo(R.x0 + pas * (i - 0.5), z);
          ouvertH[k] = -1;
        }
      }
    }
    this.frontieres = p;
    // le nom de chaque zone, au barycentre de ses nœuds (ou, s'il tombe hors d'elle, au nœud de la zone le plus proche)
    const S = zones.map(() => ({ x: 0, z: 0, n: 0 }));
    for (let k = 0; k < nz; k += 2) for (let i = 0; i < nx; i += 2) {
      const v = zg[k * nx + i];
      if (v) { const s = S[v - 1]; s.x += R.x0 + pas * i; s.z += R.z0 + pas * k; s.n++; }
    }
    this.nomsZones = [];
    zones.forEach((z, j) => {
      const s = S[j];
      if (s.n < 40) return;                               // (une bande trop mince pour un nom)
      let x = s.x / s.n, cz = s.z / s.n;
      const ic = Math.round((x - R.x0) / pas), kc = Math.round((cz - R.z0) / pas);
      if (zg[kc * nx + ic] !== j + 1) {
        let best = Infinity;
        for (let k = 0; k < nz; k += 2) for (let i = 0; i < nx; i += 2) {
          if (zg[k * nx + i] !== j + 1) continue;
          const d = (i - ic) ** 2 + (k - kc) ** 2;
          if (d < best) { best = d; x = R.x0 + pas * i; cz = R.z0 + pas * k; }
        }
      }
      this.nomsZones.push({ id: z.id, nom: nomCourt(z.nom), x, z: cz, aire: s.n * 4 * pas * pas });
    });
    this.nomsZones.sort((a, b) => b.aire - a.aire);
  }

  // ------------------------------------------------------------------------------------------------ l'interface
  lier() {
    const cv = this.racine.querySelector('#plan-canvas');
    this.cv = cv; this.ctx = cv.getContext('2d');
    const carte = this.racine.querySelector('#plan-carte');
    cv.addEventListener('pointerdown', (e) => this.pDown(e));
    cv.addEventListener('pointermove', (e) => this.pMove(e));
    cv.addEventListener('pointerup', (e) => this.pUp(e));
    cv.addEventListener('pointercancel', (e) => this.pUp(e, true));
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = this.local(e);
      this.zoomer(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0018)), p.x, p.y, true);
    }, { passive: false });
    cv.addEventListener('dblclick', (e) => { const p = this.local(e); this.zoomer(2, p.x, p.y); });
    // la manette (js/manette_menus.js) : le stick droit déplace la carte, Y / X zooment, R3 recentre
    const tel = this.racine.closest('#phone') || this.racine;
    tel.addEventListener('pad-stick', (e) => {
      if (!this.visible || this.etat !== 'pret') return;
      e.preventDefault();
      const { x, y, dt } = e.detail, v = 300 * dt / this.cible.s;
      this.suivre = false; this.majMoi();
      this.cible.cx += x * v; this.cible.cz += y * v; this.borner(this.cible);
    });
    tel.addEventListener('pad-bouton', (e) => {
      if (!this.visible || this.etat !== 'pret') return;
      const b = e.detail && e.detail.nom;
      if (b === 'Y') this.zoomer(1.6);
      else if (b === 'X') this.zoomer(1 / 1.6);
      else if (b === 'R3') this.recentrer();
      else return;
      e.preventDefault();
    });
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (this.visible) this.mesurer(); }).observe(carte);
    // (le zoom du téléphone change avec la fenêtre, après js/phone.js > taille : on remesure juste derrière)
    window.addEventListener('resize', () => { if (this.visible) setTimeout(() => this.mesurer(), 0); });
  }

  // Les boutons de l'appli (un seul écouteur, sur le conteneur : la liste est redessinée sans perdre ses clics)
  clic(e) {
    const b = e.target.closest('button');
    if (!b || !this.racine.contains(b)) return;
    if (b.id === 'plan-plus') this.zoomer(1.6);
    else if (b.id === 'plan-moins') this.zoomer(1 / 1.6);
    else if (b.id === 'plan-moi') this.recentrer();
    else if (b.dataset.choix) this.choisir(b.dataset.choix, true);
    else if (b.dataset.aller) this.aller(b.dataset.aller);
  }

  // La taille du canevas : celle qu'il occupe VRAIMENT à l'écran — le téléphone est réduit d'un bloc par un zoom CSS sur
  // les petits écrans (js/phone.js > taille) — fois la densité de l'écran ; on dessine en pixels CSS du téléphone. (Pas
  // d'après getBoundingClientRect : le téléphone est penché de 1,5°, et pendant qu'il sort de la poche, de 9°, ce qui
  // agrandit son cadre englobant.)
  mesurer() {
    const cv = this.cv;
    if (!cv) return;
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    let z = 1;
    for (let e = cv; e && e.nodeType === 1; e = e.parentElement) { const v = parseFloat(getComputedStyle(e).zoom); if (v > 0) z *= v; }
    const dpr = Math.min(2, window.devicePixelRatio || 1), k = z * dpr;
    const w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    this.W = W; this.H = H; this.k = k; this.zoomCss = z;
    this.zoomMin = Math.min(W / (this.borne.x1 - this.borne.x0), H / (this.borne.z1 - this.borne.z0)) * 0.96;
    this.cible.s = Math.max(this.zoomMin, Math.min(ZOOM_MAX, this.cible.s));
    this._tDessin = 0;
  }

  // Le point de l'événement, en pixels CSS du canevas. offsetX / offsetY sont déjà dans le repère du canevas, téléphone
  // penché compris, mais en pixels ZOOMÉS : on retire le zoom. (À défaut, le cadre englobant, à quelques pixels près.)
  local(e) {
    if (e.target === this.cv && Number.isFinite(e.offsetX)) {
      const z = this.zoomCss || 1;
      return { x: e.offsetX / z, y: e.offsetY / z };
    }
    const r = this.cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (this.W / r.width), y: (e.clientY - r.top) * (this.H / r.height) };
  }
  // écran <-> monde (repère du terrain 1), avec la vue affichée
  versMonde(sx, sy, v = this.vue) { return { x: v.cx + (sx - this.W / 2) / v.s, z: v.cz + (sy - this.H / 2) / v.s }; }
  versEcran(x, z, v = this.vue) { return { x: this.W / 2 + (x - v.cx) * v.s, y: this.H / 2 + (z - v.cz) * v.s }; }
  borner(v) {
    const B = this.borne;
    v.cx = Math.max(B.x0, Math.min(B.x1, v.cx)); v.cz = Math.max(B.z0, Math.min(B.z1, v.cz));
  }

  // Zoomer de `f` autour du point d'écran (sx, sy) — le centre de la carte par défaut — qui reste sous le doigt.
  zoomer(f, sx = this.W / 2, sy = this.H / 2, direct = false) {
    if (!this.W) return;
    const v = this.cible, s = Math.max(this.zoomMin, Math.min(ZOOM_MAX, v.s * f));
    if (this.suivre) { sx = this.W / 2; sy = this.H / 2; }      // en suivant le joueur, on zoome sur lui
    const m = this.versMonde(sx, sy, v);
    v.cx = m.x - (sx - this.W / 2) / s; v.cz = m.z - (sy - this.H / 2) / s; v.s = s;
    this.borner(v);
    if (direct) Object.assign(this.vue, v);
  }
  recentrer() {
    this.suivre = true; this.majMoi();
    if (this.cible.s < 1.6) this.cible.s = ZOOM_DEPART;
  }
  majMoi() { const b = this.racine.querySelector('#plan-moi'); if (b) b.classList.toggle('on', this.suivre); }

  // ---------------- le doigt et la souris ----------------
  pDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.cv.setPointerCapture?.(e.pointerId);
    const p = this.local(e);
    this.pointeurs.set(e.pointerId, { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: performance.now() });
    this.geste = this.pointeurs.size === 1 ? { tap: true } : { tap: false, pince: this.pince() };
  }
  pince() {
    const [a, b] = [...this.pointeurs.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, s: this.vue.s };
  }
  pMove(e) {
    const q = this.pointeurs.get(e.pointerId);
    if (!q) return;
    const p = this.local(e), dx = p.x - q.x, dy = p.y - q.y;
    q.x = p.x; q.y = p.y;
    const g = this.geste || {};
    if (this.pointeurs.size === 1) {
      if (g.tap && Math.hypot(p.x - q.x0, p.y - q.y0) < 6) return;
      g.tap = false;
      this.suivre = false; this.majMoi();
      this.vue.cx -= dx / this.vue.s; this.vue.cz -= dy / this.vue.s; this.borner(this.vue);
      Object.assign(this.cible, this.vue);
    } else if (this.pointeurs.size === 2 && g.pince) {
      const P = g.pince, n = this.pince(), s = Math.max(this.zoomMin, Math.min(ZOOM_MAX, P.s * n.d / P.d));
      // le point du monde sous le milieu des deux doigts au début du geste reste sous leur milieu actuel
      const m = this.versMonde(P.mx, P.my, { cx: this.vue.cx, cz: this.vue.cz, s: this.vue.s });
      this.suivre = false; this.majMoi();
      this.vue.s = s; this.vue.cx = m.x - (n.mx - this.W / 2) / s; this.vue.cz = m.z - (n.my - this.H / 2) / s;
      this.borner(this.vue); Object.assign(this.cible, this.vue);
      g.pince = { ...n, s };
    }
    this._tDessin = 0;
  }
  pUp(e, annule = false) {
    const q = this.pointeurs.get(e.pointerId);
    if (!q) return;
    this.pointeurs.delete(e.pointerId);
    const g = this.geste || {};
    if (!annule && g.tap && this.pointeurs.size === 0 && performance.now() - q.t0 < 500) this.toucher(q.x, q.y);
    if (this.pointeurs.size === 1) this.geste = { tap: false };       // un doigt levé d'un pincement : on continue à glisser
  }
  // Un toucher sur la carte : le repère le plus proche (à moins de 24 pixels) est choisi.
  toucher(sx, sy) {
    let best = null, bd = 24;
    for (const r of this.reperes()) {
      if (r.velo && this.vue.s < 1.4) continue;          // (les parcs à vélos ne sont pas dessinés à ce zoom : voir dessiner)
      const p = this.versEcran(r.x, r.z), d = Math.hypot(p.x - sx, p.y - sy);
      if (d < bd) { bd = d; best = r; }
    }
    if (best) this.choisir(best.cle, false);
  }

  // ---------------- la liste ----------------
  // Les repères qu'on peut choisir : les lieux (vélos à part) et les amis, dans le repère du terrain 1.
  reperes() {
    const L = [];
    for (const l of this.lieux || []) L.push({ cle: 'lieu:' + l.id, type: 'lieu', x: l.x, z: l.z, nom: l.nom, velo: /^velo_/.test(l.id), lieu: l });
    for (const a of this.amis()) L.push({ cle: 'ami:' + a.id, type: 'ami', x: a.x, z: a.z, nom: a.nom, ami: a });
    return L;
  }
  amis() {
    const g = this.jeu(), P = g && g.presence;
    if (!P || !P.actif) return [];
    const L = [];
    for (const [id, o] of P.others) L.push({ id: String(id), nom: o.nom || 'Joueur', x: o.player.pos.x - Monde.dx, z: o.player.pos.z, velo: !!o.player.velo });
    return L;
  }
  moi() {
    const g = this.jeu(), u = g && g.user;
    return u ? { x: u.pos.x - Monde.dx, z: u.pos.z, fx: u.facing.x, fz: u.facing.z, yaw: g.camYaw } : null;
  }

  // La liste (lieux, amis, vélos), redessinée quand les amis changent ; sinon seules les distances sont réécrites
  // (la manette garde son focus : chaque ligne a un identifiant stable, js/manette_menus.js > signature).
  majListe(force = false) {
    const el = this.racine.querySelector('#plan-liste');
    if (!el) return;
    const amis = this.amis(), cleAmis = amis.map((a) => a.id + ':' + a.nom).join('|');
    if (force || cleAmis !== this._cleAmis) {
      this._cleAmis = cleAmis;
      const lieux = (this.lieux || []).filter((l) => !/^velo_/.test(l.id)), velos = (this.lieux || []).filter((l) => /^velo_/.test(l.id));
      const ligne = (cle, nom, ic, fond, aller = 'Y aller') => {
        const sel = this.sel && this.sel.cle === cle;
        return `<div class="plan-lieu${sel ? ' sel' : ''}" data-cle="${esc(cle)}">`
          + `<button class="plan-nom" id="plan-${idDom(cle)}" data-choix="${esc(cle)}"><i class="ic" style="background:${fond}">${ic}</i>`
          + `<span class="n">${esc(nom)}</span><span class="d" data-dist="${esc(cle)}"></span></button>`
          + `<button class="plan-go" id="plan-go-${idDom(cle)}" data-aller="${esc(cle)}">${aller}</button></div>`;
      };
      let h = '<div class="plan-sec">Lieux du parc</div>';
      for (const l of lieux) h += ligne('lieu:' + l.id, l.nom, l.id === 'plateau' ? '🏀' : '●', l.id === 'plateau' ? '#3a2a1e' : C_LIEU);
      if (amis.length) {
        h += '<div class="plan-sec">Amis en ligne</div>';
        for (const a of amis) h += ligne('ami:' + a.id, a.nom, esc(a.nom.slice(0, 1).toUpperCase()), this.couleur(a.nom), 'Rejoindre');
      }
      if (velos.length) {
        h += '<div class="plan-sec">Vélos en libre service</div>';
        for (const l of velos) h += ligne('lieu:' + l.id, l.nom.replace(/^Vélos\s*:\s*/i, ''), '🚲', C_VELO);
      }
      el.innerHTML = h;
    }
    this.majDistances();
  }
  majDistances() {
    const m = this.moi();
    if (!m) return;
    for (const r of this.reperes()) {
      const d = this.racine.querySelector(`[data-dist="${CSS.escape(r.cle)}"]`);
      if (d) d.textContent = distTexte(Math.hypot(r.x - m.x, r.z - m.z));
    }
  }

  // Choisir un repère : la ligne s'ouvre sur son bouton « Y aller », la carte glisse jusqu'à lui.
  choisir(cle, centrer) {
    const r = this.reperes().find((x) => x.cle === cle);
    if (!r) return;
    this.sel = { cle };
    for (const ligne of this.racine.querySelectorAll('.plan-lieu')) ligne.classList.toggle('sel', ligne.dataset.cle === cle);
    if (centrer || !this.dansLaVue(r.x, r.z)) {
      this.suivre = false; this.majMoi();
      this.cible.cx = r.x; this.cible.cz = r.z;
      if (this.cible.s < 1.6) this.cible.s = 2.4;
      this.borner(this.cible);
    }
    const ligne = this.racine.querySelector(`.plan-lieu[data-cle="${CSS.escape(cle)}"]`);
    if (ligne && !centrer) ligne.scrollIntoView({ block: 'nearest' });
    this.note('');
  }
  dansLaVue(x, z) { const p = this.versEcran(x, z); return p.x > 20 && p.y > 20 && p.x < this.W - 20 && p.y < this.H - 20; }

  // Un message bref sur la carte (pas pendant un match, endroit introuvable…)
  note(txt) {
    const n = this.racine.querySelector('#plan-note');
    if (!n) return;
    n.textContent = txt; n.hidden = !txt;
    clearTimeout(this._noteT);
    if (txt) this._noteT = setTimeout(() => { n.hidden = true; }, 2600);
  }

  // ------------------------------------------------------------------------------------------------ chaque image
  boucle(t) {
    if (!this.visible || this.etat !== 'pret') { this.raf = 0; return; }
    this.raf = requestAnimationFrame(this._boucle);
    const dt = this._t ? Math.min(0.1, (t - this._t) / 1000) : 0;
    this._t = t;
    const m = this.moi();
    if (this.suivre && m) { this.cible.cx = m.x; this.cible.cz = m.z; this.borner(this.cible); }
    // la vue glisse vers sa cible (zoom, recentrage, lieu choisi)
    const v = this.vue, c = this.cible, k = dt > 0 ? 1 - Math.exp(-dt * 10) : 1;
    const bouge = Math.abs(v.cx - c.cx) * v.s > 0.3 || Math.abs(v.cz - c.cz) * v.s > 0.3 || Math.abs(v.s - c.s) / c.s > 0.002;
    if (bouge) {
      // le zoom en logarithme : il paraît régulier
      v.s = Math.exp(Math.log(v.s) + (Math.log(c.s) - Math.log(v.s)) * k);
      v.cx += (c.cx - v.cx) * k; v.cz += (c.cz - v.cz) * k;
    } else Object.assign(v, c);
    // une image tous les 33 ms (50 sur téléphone) quand rien n'est en mouvement que les repères
    if (bouge || t - this._tDessin >= (TELEPHONE ? 50 : 33)) { this._tDessin = t; this.dessiner(t); }
    if (t - this._tListe > 500) { this._tListe = t; this.majListe(); }
  }

  dessiner(t) {
    const c = this.ctx, W = this.W, H = this.H, k = this.k, v = this.vue, s = v.s, R = this.D.repere;
    if (!c || !W) return;
    const lisible = (t) => (this.petit && this.petit.matches ? Math.max(12, t) : t);      // (constructeur)
    c.setTransform(k, 0, 0, k, 0, 0);
    c.fillStyle = HORS_MONDE; c.fillRect(0, 0, W, H);
    // ---- le monde, en mètres
    c.save();
    c.setTransform(k * s, 0, 0, k * s, k * (W / 2 - v.cx * s), k * (H / 2 - v.cz * s));
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(this.fond, R.x0 - R.pas / 2, R.z0 - R.pas / 2, R.nx * R.pas, R.nz * R.pas);
    c.lineJoin = 'round'; c.lineCap = 'round';
    // le graphe des allées sous les allées maillées : un passage de 1,6 m
    c.strokeStyle = '#efe8dc'; c.lineWidth = Math.max(1.6, 1.4 / s); c.stroke(this.graphe);
    // les allées : la bordure, puis le remplissage
    const px = 1 / s;
    for (const a of this.allees) { c.strokeStyle = a.bord; c.lineWidth = Math.max(a.l, 1.2 * px) + 1.4 * px; c.stroke(a.p); }
    for (const a of this.allees) { c.strokeStyle = a.rem; c.lineWidth = Math.max(a.l, 1.2 * px); c.stroke(a.p); }
    // les escaliers
    for (const e of this.escaliers) {
      c.fillStyle = '#e8e1d5'; c.fill(e.cadre);
      c.strokeStyle = '#a99d8b'; c.lineWidth = 1 * px; c.stroke(e.cadre);
      if (e.giron * s >= 2.5) { c.lineWidth = 0.8 * px; c.stroke(e.marches); }
    }
    // le graphe aux escaliers (ceux qu'aucun gabarit d'escalier ne dessine : gradins, perrons)
    c.setLineDash([2 * px, 2 * px]); c.strokeStyle = '#a99d8b'; c.lineWidth = 1.2 * px; c.stroke(this.grapheEsc); c.setLineDash([]);
    // les bâtiments : une ombre portée d'un pixel et demi, le toit, son contour
    c.save(); c.translate(1.5 * px, 1.5 * px); c.fillStyle = 'rgba(60,50,40,.18)';
    for (const b of this.batiments) c.fill(b.p);
    c.restore();
    for (const b of this.batiments) { c.fillStyle = b.parc ? '#dccfbe' : '#d7d3cc'; c.fill(b.p); }
    c.strokeStyle = '#a69c8f'; c.lineWidth = 1 * px; for (const b of this.batiments) c.stroke(b.p);
    // les murs, les garde-corps, les grilles de l'enceinte
    c.strokeStyle = '#7d705f';
    for (const m of this.murs) { c.lineWidth = Math.max(m.e, 1.3 * px); c.stroke(m.p); }
    c.strokeStyle = '#4c4f55'; c.lineWidth = 1 * px; c.stroke(this.gardes);
    c.strokeStyle = '#3f5a43'; c.lineWidth = 1.6 * px; c.stroke(this.grilles);
    // les contours des zones
    if (s >= 1.1) {
      c.setLineDash([5 * px, 4 * px]); c.strokeStyle = 'rgba(78,96,70,.5)'; c.lineWidth = 1 * px;
      c.stroke(this.frontieres); c.setLineDash([]);
    }
    c.restore();

    // ---- les écritures et les repères, en pixels
    c.setTransform(k, 0, 0, k, 0, 0);
    // les cadres déjà occupés : la boussole, les boutons de zoom et de recentrage, l'échelle, puis chaque écriture
    const pris = [[0, 0, 42, 42], [W - 46, 0, W, 76], [W - 46, H - 46, W, H], [0, H - 24, 96, H]];
    const libre = (x0, y0, x1, y1) => { for (const r of pris) if (x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1]) return false; return true; };
    const ecrire = (txt, x, y, { taille = 11, gras = 600, couleur = '#1f2a36', italique = false, centre = true, halo = 3, majuscules = false } = {}) => {
      const T = majuscules ? txt.toUpperCase() : txt;
      c.font = `${italique ? 'italic ' : ''}${gras} ${taille}px -apple-system, "Segoe UI", Roboto, system-ui, sans-serif`;
      const w = c.measureText(T).width, x0 = centre ? x - w / 2 : x, y0 = y - taille * 0.6;
      if (x0 < 2 || x0 + w > W - 2 || y0 < 2 || y0 + taille * 1.2 > H - 2) return false;     // en entier, ou pas du tout
      if (!libre(x0 - 2, y0 - 1, x0 + w + 2, y0 + taille * 1.2 + 1)) return false;
      pris.push([x0 - 2, y0 - 1, x0 + w + 2, y0 + taille * 1.2 + 1]);
      c.textAlign = 'left'; c.textBaseline = 'middle';
      if (halo) { c.lineWidth = halo; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineJoin = 'round'; c.strokeText(T, x0, y); }
      c.fillStyle = couleur; c.fillText(T, x0, y);
      return true;
    };
    const moi = this.moi(), sel = this.sel && this.sel.cle;
    // (les cadres du joueur et des amis sont réservés d'abord : aucune écriture ne passe dessous)
    const amis = this.amis();
    if (moi) { const p = this.versEcran(moi.x, moi.z); pris.push([p.x - 11, p.y - 11, p.x + 11, p.y + 11]); }
    for (const a of amis) { const p = this.versEcran(a.x, a.z); pris.push([p.x - 8, p.y - 8, p.x + 8, p.y + 8]); }
    // les lieux : le repère, puis son nom à côté
    const lieux = this.lieux || [];
    const choix = lieux.find((l) => 'lieu:' + l.id === sel);
    for (const l of lieux) {
      const velo = /^velo_/.test(l.id), p = this.versEcran(l.x, l.z);
      if (velo && s < 1.4 && 'lieu:' + l.id !== sel) continue;
      if (p.x < -20 || p.y < -20 || p.x > W + 20 || p.y > H + 20) continue;
      if (l === choix) continue;
      this.pastille(c, p.x, p.y, velo ? C_VELO : C_LIEU, velo ? 4.5 : 5.5, l.id === 'plateau');
      pris.push([p.x - 6, p.y - 6, p.x + 6, p.y + 6]);
    }
    if (choix) {
      const p = this.versEcran(choix.x, choix.z), a = (t || 0) / 1000;
      c.beginPath(); c.arc(p.x, p.y, 10 + 5 * ((a * 1.2) % 1), 0, Math.PI * 2);
      c.strokeStyle = `rgba(224,36,94,${0.6 * (1 - ((a * 1.2) % 1))})`; c.lineWidth = 2; c.stroke();
      this.epingle(c, p.x, p.y, C_CHOIX);
      pris.push([p.x - 8, p.y - 24, p.x + 8, p.y + 2]);
      ecrire(choix.nom, p.x, p.y + 12, { taille: 12, gras: 700, couleur: '#7a1236' });
    }
    // les pseudos des amis passent avant les noms des lieux (au-dessus du point, sinon dessous). (Relecture : à 15 px
    // du point, le cadre de l'écriture mordait de 0,3 px sur celui que l'ami s'est réservé plus haut — ±8 px — et
    // `ecrire` refusait les deux places : aucun pseudo ne s'affichait jamais. À 17 px, il reste 1,7 px de jeu.)
    for (const a of amis) {
      const p = this.versEcran(a.x, a.z), nom = a.nom + (a.velo ? ' 🚲' : ''), o = { taille: lisible(10.5), gras: 700, couleur: '#10141b' };
      ecrire(nom, p.x, p.y - 17, o) || ecrire(nom, p.x, p.y + 17, o);
    }
    for (const l of lieux) {
      if (l === choix) continue;
      const velo = /^velo_/.test(l.id);
      if (velo && s < 2.6) continue;
      const p = this.versEcran(l.x, l.z);
      const nom = velo ? l.nom.replace(/^Vélos\s*:\s*/i, 'Vélos · ') : l.nom;
      // à droite du repère, sinon à gauche, sinon dessous, sinon dessus. (Relecture : « dessous » était à 12 px, son
      // cadre mordait sur celui de la pastille — ±6 px — et ne passait jamais ; « dessus » manquait. À 14 px, les deux
      // passent : au zoom 3, l'esplanade Charras et la promenade du quai, voisines, restaient sans nom.)
      // (en 12 px, « dessous » et « dessus » s'écartent d'un pixel de plus, pour la même raison)
      const o = { taille: lisible(velo ? 10 : 11), couleur: velo ? '#173f7a' : '#1f2a36', centre: false }, dy = Math.max(14, o.taille + 3);
      c.font = `600 ${o.taille}px -apple-system, "Segoe UI", Roboto, system-ui, sans-serif`;
      const w = c.measureText(nom).width;
      ecrire(nom, p.x + 8, p.y, o) || ecrire(nom, p.x - 8 - w, p.y, o) || ecrire(nom, p.x - w / 2, p.y + dy, o)
        || ecrire(nom, p.x - w / 2, p.y - dy, o);
    }
    // les noms des zones, pour finir (ils cèdent la place aux lieux)
    if (s >= 1.2 && s < 7) {
      for (const z of this.nomsZones) {
        const p = this.versEcran(z.x, z.z);
        if (z.aire * s * s < 2500) continue;              // une zone trop petite à l'écran pour son nom
        ecrire(z.nom, p.x, p.y, { taille: lisible(9.5), gras: 600, couleur: 'rgba(63,84,55,.85)', italique: true, majuscules: true, halo: 2.5 });
      }
    }
    // les vélos du jeu, là où ils sont garés en ce moment (un vélo pris ne se montre pas : il est sous son cycliste)
    const g = this.jeu();
    if (g && s >= 1.4) {
      for (const b of g.velos || []) {
        if (!b.racine || !b.racine.visible || !b.pos) continue;
        const p = this.versEcran(b.pos.x - Monde.dx, b.pos.z);
        if (p.x < -10 || p.y < -10 || p.x > W + 10 || p.y > H + 10) continue;
        this.velo(c, p.x, p.y);
      }
    }
    // les amis
    for (const a of amis) {
      const p = this.versEcran(a.x, a.z), col = this.couleur(a.nom);
      const cle = 'ami:' + a.id;
      c.beginPath(); c.arc(p.x, p.y, cle === sel ? 8.5 : 7, 0, Math.PI * 2);
      c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke();
      c.font = '700 9px -apple-system, "Segoe UI", Roboto, system-ui, sans-serif';
      c.fillStyle = '#10141b'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(a.nom.slice(0, 1).toUpperCase(), p.x, p.y + 0.5);
    }
    // soi : le cône de la caméra, puis la flèche du cap
    if (moi) {
      const p = this.versEcran(moi.x, moi.z);
      const av = Math.atan2(-Math.cos(moi.yaw), -Math.sin(moi.yaw));     // la caméra regarde vers (-sin yaw, -cos yaw)
      const gr = c.createRadialGradient(p.x, p.y, 2, p.x, p.y, 46);
      gr.addColorStop(0, 'rgba(26,115,232,.38)'); gr.addColorStop(1, 'rgba(26,115,232,0)');
      c.beginPath(); c.moveTo(p.x, p.y); c.arc(p.x, p.y, 46, av - 0.55, av + 0.55); c.closePath();
      c.fillStyle = gr; c.fill();
      const cap = Math.atan2(moi.fz, moi.fx);
      c.save(); c.translate(p.x, p.y); c.rotate(cap);
      c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,.95)'; c.fill();
      c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 3;
      c.beginPath(); c.moveTo(8.5, 0); c.lineTo(-6, 6.2); c.lineTo(-2.8, 0); c.lineTo(-6, -6.2); c.closePath();
      c.fillStyle = C_MOI; c.fill();
      c.restore();
    }
    // la boussole (le nord est en haut à gauche : voir ANGLE_NORD) et l'échelle
    this.boussole(c, 23, 23);
    this.echelle(s);
  }

  // La boussole : une aiguille, rouge vers le nord, et un N au bout
  boussole(c, x, y) {
    const a = ANGLE_NORD, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
    c.save();
    c.shadowColor = 'rgba(0,0,0,.28)'; c.shadowBlur = 4; c.shadowOffsetY = 1;
    c.beginPath(); c.arc(x, y, 15, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,.94)'; c.fill();
    c.restore();
    c.beginPath(); c.moveTo(x + ux * 6, y + uy * 6); c.lineTo(x + vx * 3.6, y + vy * 3.6); c.lineTo(x - vx * 3.6, y - vy * 3.6); c.closePath();
    c.fillStyle = '#e0245e'; c.fill();
    c.beginPath(); c.moveTo(x - ux * 10, y - uy * 10); c.lineTo(x + vx * 3.6, y + vy * 3.6); c.lineTo(x - vx * 3.6, y - vy * 3.6); c.closePath();
    c.fillStyle = '#a3aab4'; c.fill();
    c.font = '800 9px -apple-system, "Segoe UI", Roboto, system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#c4174d';
    c.fillText('N', x + ux * 10.5, y + uy * 10.5);
  }

  // Une pastille de lieu (le plateau : un ballon)
  pastille(c, x, y, col, r, ballon) {
    c.beginPath(); c.arc(x, y, r + 1.6, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = ballon ? '#e8762a' : col; c.fill();
    if (ballon) {
      c.strokeStyle = '#2a1a10'; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.moveTo(x, y - r); c.lineTo(x, y + r); c.stroke();
    }
  }
  // L'épingle du lieu choisi, pointe sur le lieu
  epingle(c, x, y, col) {
    c.save(); c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 4; c.shadowOffsetY = 1;
    c.beginPath(); c.moveTo(x, y);
    c.bezierCurveTo(x - 3, y - 7, x - 8, y - 10, x - 8, y - 16);
    c.arc(x, y - 16, 8, Math.PI, 0);
    c.bezierCurveTo(x + 8, y - 10, x + 3, y - 7, x, y);
    c.fillStyle = col; c.fill(); c.restore();
    c.beginPath(); c.arc(x, y - 16, 3.2, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
  }
  // Un petit vélo (deux roues, un cadre)
  velo(c, x, y) {
    c.beginPath(); c.arc(x, y, 7.5, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,.92)'; c.fill();
    c.strokeStyle = C_VELO; c.lineWidth = 1.3;
    c.beginPath(); c.arc(x - 3.2, y + 1.5, 2.3, 0, Math.PI * 2); c.moveTo(x + 5.5, y + 1.5); c.arc(x + 3.2, y + 1.5, 2.3, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(x - 3.2, y + 1.5); c.lineTo(x - 0.6, y - 2.2); c.lineTo(x + 2.2, y - 2.2); c.lineTo(x + 3.2, y + 1.5);
    c.moveTo(x - 0.6, y - 2.2); c.lineTo(x, y + 1.5); c.lineTo(x + 2.2, y - 2.2); c.stroke();
  }
  // La barre d'échelle : une longueur ronde (5, 10, 20, 50, 100 m…) qui fait de 40 à 90 pixels
  echelle(s) {
    const el = this.racine.querySelector('#plan-echelle');
    if (!el) return;
    let m = 5;
    for (const c of [5, 10, 20, 25, 50, 100, 200]) { m = c; if (c * s >= 40) break; }
    const w = Math.round(m * s);
    if (this._ech !== w) { this._ech = w; el.firstElementChild.style.width = w + 'px'; el.lastElementChild.textContent = `${m} m`; }
  }

  // ------------------------------------------------------------------------------------------------ aller à
  // Le point où poser un promeneur près de (x, z) — repère du terrain 1 —, en commençant à `rMin` (à côté d'un vélo,
  // pas dessus) : le premier qui convient, anneau par anneau, et sur chaque anneau en partant de la direction (dx, dz)
  // si elle est donnée. null si rien ne convient à moins de POSE_RAYON.
  // Deux passes : d'abord sur la NAPPE du lieu lui-même (le même niveau : au pied d'un mur, on reste de son côté), puis
  // sur n'importe quelle nappe posable.
  pointDePose(x, z, rMin = 0, dir = null) {
    const a0 = dir ? Math.atan2(dir.z, dir.x) : 0, n0 = Monde.nappe(x + Monde.dx, z);
    for (const nappe of (this.nappeOk(n0) ? [n0, 0] : [0])) {
      for (let r = rMin; r <= POSE_RAYON; r += POSE_PAS) {
        const n = r < 1e-6 ? 1 : Math.max(8, Math.round(2 * Math.PI * r / POSE_PAS));
        for (let j = 0; j < n; j++) {
          // 0, +1, -1, +2, -2… : d'abord la direction voulue, puis de part et d'autre
          const q = j === 0 ? 0 : (j % 2 ? 1 : -1) * Math.ceil(j / 2);
          const a = a0 + q * 2 * Math.PI / n, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
          if (this.posable(px, pz, nappe)) return { x: px, z: pz };
        }
      }
    }
    return null;
  }
  // Une nappe où poser quelqu'un : un terrain, le plateau ou la scène du théâtre, et assez grande (pas un recoin isolé
  // de quelques mètres carrés derrière une façade)
  nappeOk(n) { return !!n && NAPPES_POSABLES.has(this.typeNappe[n]) && (this.tailleNappe[n] || 0) >= NAPPE_MIN; }

  // Peut-on poser un promeneur en (x, z) — repère du terrain 1 — sans qu'il soit dans un mur, sur un toit, au bord d'un
  // vide, dans l'eau ou dans un massif ? `nappe` : celle qu'on exige (0 : toute nappe posable). (Monde.* prend des
  // coordonnées du monde affiché : + Monde.dx.)
  posable(x, z, nappe = 0) {
    const wx = x + Monde.dx, f = Monde.drapeaux(wx, z), n = Monde.nappe(wx, z);
    if (!this.nappeOk(n) || (nappe && n !== nappe)) return false;
    if (!(f & DRAPEAU.MARCHABLE) || (f & (DRAPEAU.EAU | DRAPEAU.ESCALIER | DRAPEAU.REBORD | DRAPEAU.BALLE_PERDUE))) return false;
    const y = Monde.sol(wx, z);
    // à plat (moins de 18 % de pente)…
    if (Monde.normale(wx, z).y < 0.985) return false;
    // … et loin d'un bord : tout autour, à 0,6 et 1,2 m, le même sol, sans marche ni vide, marchable et sec
    for (let j = 0; j < 8; j++) {
      const a = j * Math.PI / 4, cx = Math.cos(a), cz = Math.sin(a);
      for (const r of [0.6, 1.2]) {
        const qx = wx + cx * r, qz = z + cz * r, fq = Monde.drapeaux(qx, qz);
        if (!(fq & DRAPEAU.MARCHABLE) || (fq & DRAPEAU.EAU)) return false;
        if (Math.abs(Monde.sol(qx, qz) - y) > 0.25 * r + 0.05) return false;
        if (Monde.franchir(wx, z, y, qx, qz, 'pieton')) return false;
      }
    }
    // hors de tout obstacle déclaré (murs, grilles, troncs, bancs, bâtiments) : un disque de 0,6 m que rien ne pousse
    const p = { x: wx, z };
    if (Monde.resoudre(p, 0.6, 'pieton')) return false;
    // ni sur un vélo garé, ni sur le marchand
    const g = this.jeu();
    for (const b of (g && g.velos) || []) if (b.pos && Math.hypot(b.pos.x - wx, b.pos.z - z) < 1.3) return false;
    if (g && g.merchant && Math.hypot(g.merchant.pos.x - wx, g.merchant.pos.z - z) < 1.2) return false;
    return true;
  }

  // Où mène un repère : { x, z } (repère du terrain 1), le cap d'arrivée (degrés, 0 = z+, 90 = x+ ; null = garder le
  // sien), son nom. Le plateau ramène au départ de la balade ; un vélo et un ami, à côté d'eux, tourné vers eux.
  destination(cle) {
    const r = this.reperes().find((x) => x.cle === cle);
    if (!r) return null;
    const m = this.moi();
    if (r.type === 'lieu' && r.lieu.id === 'plateau') {
      const x = DEPART_BALADE.x - Monde.dx, z = DEPART_BALADE.z;
      return { ...(this.pointDePose(x, z) || { x: NaN, z: NaN }), cap: 180, nom: r.nom };
    }
    if (r.velo || r.type === 'ami') {
      // à 1,6 m au moins, du côté d'où l'on vient
      const dir = m ? { x: m.x - r.x, z: m.z - r.z } : null;
      const p = this.pointDePose(r.x, r.z, 1.6, dir);
      if (!p) return null;
      return { ...p, cap: Math.atan2(r.x - p.x, r.z - p.z) * 180 / Math.PI, nom: r.nom };
    }
    const p = this.pointDePose(r.x, r.z);
    if (!p) return null;
    return { ...p, cap: Number.isFinite(r.lieu.cap) ? r.lieu.cap : null, nom: r.nom };
  }

  // Y ALLER : le téléphone se range, fondu au noir, le joueur est posé, le décor proche se construit, l'image revient.
  aller(cle) {
    if (this.enRoute) return;
    const g = this.jeu();
    if (!g || !g.user || Monde.plat) return;
    if (g.mode !== 'lobby') { this.note('Pas pendant un match : finis-le d\'abord.'); return; }
    if (g.training && g.training.active) { this.note('Termine d\'abord ton atelier.'); return; }
    if (g.paused || g.setupOpen) return;
    const d = this.destination(cle);
    if (!d || !Number.isFinite(d.x)) { this.note('Impossible de s\'y poser pour l\'instant.'); return; }
    this.enRoute = true;
    this.ranger();
    const voile = voileFondu();
    voile.querySelector('span').textContent = d.nom || '';
    voile.style.transitionDuration = FONDU_NOIR + 's';
    voile.classList.add('on');
    g.input.blocked = true;
    setTimeout(() => {
      // (un match en ligne a pu partir pendant le fondu : on ne déplace plus personne, on rend juste l'image)
      if (g.mode === 'lobby') { try { this.poser(g, d); } catch (e) { console.warn('[plan] téléportation :', e); } }
      // rouvert, le plan est centré sur le joueur arrivé, sans lieu choisi (on y est)
      this.sel = null; this.suivre = true; this.majMoi();
      const m = this.moi();
      if (m) { this.cible.cx = this.vue.cx = m.x; this.cible.cz = this.vue.cz = m.z; }
      for (const ligne of this.racine.querySelectorAll('.plan-lieu.sel')) ligne.classList.remove('sel');
      this.attendreDecor(g).then(() => {
        voile.style.transitionDuration = FONDU_RETOUR + 's';
        voile.classList.remove('on');
        // (le téléphone ressorti pendant le fondu garde les commandes du jeu bloquées, comme à son ouverture)
        g.input.blocked = !!(g.setupOpen || g.paused || this.ouvert());
        this.enRoute = false;
        if (g.hud && g.mode === 'lobby') g.hud.feedback(String(d.nom || '').toUpperCase(), 'info');
      });
    }, FONDU_NOIR * 1000 + 30);
  }

  // Le joueur, posé : sur Monde.sol, vitesse nulle, au sol (ni saut ni marche à rattraper), descendu du vélo et levé
  // du banc, le ballon en main, la caméra derrière lui dans le cap d'arrivée.
  poser(g, d) {
    const u = g.user;
    if (u.velo) g.lacherVeloLocal();
    if (u.assis) u.assis = null;                        // (au noir : personne ne le voit se lever)
    u.stopEmote();
    const wx = d.x + Monde.dx, z = d.z, y = Monde.sol(wx, z);
    u.pos.set(wx, y, z); u.posPrec.copy(u.pos); u.vel.set(0, 0, 0);
    u.airborne = false; u.jumpY = 0; u.jumpVel = 0; u.yLisse = 0;
    // (relecture : debout et libre, comme au retour en balade — Game.enterLobby — : un tir armé, un crossover ou un
    // spin en cours ne reprend pas à l'arrivée)
    u.state = 'idle'; u.windup = 0; u.stun = 0; u.spinT = 0; u.crossT = -1; u.released = false;
    if (d.cap !== null && d.cap !== undefined) {
      const c = d.cap * Math.PI / 180;
      u.setFacing(Math.sin(c), Math.cos(c));
      g.camYaw = Math.atan2(-Math.sin(c), -Math.cos(c));   // la caméra regarde vers (-sin yaw, -cos yaw) : dans le cap
    }
    // le ballon en main. (Relecture : un tir encore en l'air en restait là — `!pendingShot` — et le joueur arrivait les
    // mains vides, son ballon retombant à l'autre bout du parc. Le tir est abandonné, comme en rentrant en balade.)
    if (g.ball) { g.pendingShot = null; if (g.ball.holder !== u) g.ball.hold(u); }
    const sy = Math.sin(g.camYaw), cy = Math.cos(g.camYaw);
    g.camPos.set(wx + sy * 4.3, y + 2.4, z + cy * 4.3); g.lookCur.set(wx, y + 1.4, z); g._camLibre = 1;
    g.camera.position.copy(g.camPos); g.camera.lookAt(g.lookCur);
  }

  // Au noir, l'ordonnanceur (js/monde_charge.js) construit les morceaux de zone à moins de PROCHE mètres de la caméra,
  // ATTENTE_IMAGES images ou ATTENTE_MAX secondes au plus (et deux images au moins : le sol change ses niveaux de détail
  // à la première). Son budget de
  // 2 à 4 ms par image (§ 3.6) est fait pour qu'on ne voie pas la construction ; au noir, personne ne voit rien : on le
  // relance plusieurs fois par image (début d'image, puis une passe, par son interface publique), JUSQU'À BUDGET_NOIR ms
  // par image. Ce qui n'est pas fini à temps s'achève ensuite en jouant, comme d'habitude (silhouettes en attendant).
  attendreDecor(g) {
    const O = g.scene && g.scene.userData.ordonnanceur, t0 = performance.now();
    let images = 0;
    const pousser = () => {
      if (!O || typeof O.debutImage !== 'function' || typeof O.maj !== 'function') return;
      const ti = performance.now();
      while (performance.now() - ti < BUDGET_NOIR && proches() > 0) { O.debutImage(); O.maj(0, g.camera, g.user); }
    };
    const proches = () => {
      if (!O) return 0;
      const cx = g.camera.position.x - Monde.dx, cz = g.camera.position.z;
      let n = 0;
      for (const m of O.morceaux) {
        if (m.erreur || m.etat === 'detail') continue;
        const b = m.boite, ex = cx < b[0] ? b[0] - cx : cx > b[2] ? cx - b[2] : 0, ez = cz < b[1] ? b[1] - cz : cz > b[3] ? cz - b[3] : 0;
        if (Math.hypot(ex, ez) < PROCHE) n++;
      }
      return n;
    };
    return new Promise((ok) => {
      const tic = () => {
        images++;
        if ((images >= 3 && proches() === 0) || images > ATTENTE_IMAGES || performance.now() - t0 > ATTENTE_MAX * 1000) { ok(); return; }
        pousser();
        requestAnimationFrame(tic);
      };
      requestAnimationFrame(tic);
      setTimeout(ok, ATTENTE_MAX * 1000 + 400);       // (onglet caché : plus d'images, on n'attend pas)
    });
  }
}

// Le voile du fondu : un seul, par-dessus tout le jeu, créé au premier voyage.
let _voile = null;
function voileFondu() {
  if (_voile) return _voile;
  _voile = document.createElement('div');
  _voile.id = 'plan-fondu';
  _voile.innerHTML = '<span></span>';
  document.body.appendChild(_voile);
  void _voile.offsetWidth;                               // (la transition part bien de l'opacité 0)
  return _voile;
}
