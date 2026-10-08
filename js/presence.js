// Présence en ligne : les autres joueurs connectés se promènent sur le terrain avec toi, comme dans le hub de
// NBA 2K. Ce n'est pas un écran de salon, c'est la cour elle-même.
//
// Chaque client diffuse sa position ~12 fois par seconde. À la réception, on crée (ou on réutilise) un avatar pour
// l'expéditeur, on lisse son déplacement entre deux paquets, et on affiche son pseudo au-dessus de sa tête.
// Un joueur qui ne dit plus rien pendant 6 s disparaît.
//
// Le lancement d'un match se fait sur le terrain : on entre dans le cercle bleu, et ceux qui sont dans le cercle
// au moment du départ jouent le match. C'est `inRing()` qui les liste.
//
// LE PARC ENTIER EN LIGNE (lot A7 du chantier « parc complet », conception § 3.8), drapeau levé seulement (`ter` non
// nul, posé par js/game.js : au parc entier, sur tout terrain quand le parc entier est le réglage, et AU PARC EN PLATEAU
// SEUL — voir plus bas). Drapeau baissé, rien de ce qui suit n'existe : les paquets sont, octet pour octet, ceux
// d'avant, et l'on voit tous les connectés comme aujourd'hui.
//  - UN MONDE PAR PAQUET : `ter` dit dans quel monde on est. Le parc et le parc2 sont UN SEUL monde ('parc'), et
//    chacun voit l'autre à sa vraie place, un terrain plus loin. Les autres terrains gardent leur nom ('becon' pour La
//    Cage, 'levallois'...) : un joueur de La Cage n'apparaît plus au parc, ni l'inverse. Un paquet SANS `ter` (ancien
//    client, drapeau baissé) vient d'un monde plat dont on ne sait rien : superposé comme avant sur un terrain plat (et
//    au plateau seul), invisible dans le parc entier.
//  - LE REPÈRE DES POSITIONS : celui que l'expéditeur a sous les yeux, SON terrain à l'origine — le repère d'avant le
//    lot, le seul que lisent les anciens clients (l'APK d'avant la recette du 02/10 : sur parc2, elle voit ainsi à sa
//    place un joueur du parc2, entier ou non). `pl` dit quel terrain est à l'origine, et le receveur ramène la position
//    au sien (decalage : 16,1 m entre les deux). Le cercle bleu, les matchs et le plan ne lisent que les positions
//    affichées : rien d'autre ne change. (Seuls les garages des six vélos voyagent dans le repère du terrain 1 : voir
//    publierGarage dans js/game.js.)
//  - LES MÊMES DONNÉES : `mh`, l'empreinte des données du monde (monde.json > hash). Deux joueurs d'empreintes
//    différentes n'ont pas le même sol ni les mêmes murs : ils ne se voient pas, et l'on dit une fois « mettre à jour »
//    (onAutreVersion). Seulement entre deux parcs ENTIERS : le plateau seul n'a pas ces données.
//  - LE PLATEAU SEUL AU PARC (`plat`, recette du 02/10, défaut A6) : c'est le réglage par défaut du téléphone et de
//    l'APK, quand l'ordinateur est au parc entier. Sans monde dans ses paquets, l'ordinateur le prenait pour un ancien
//    client d'un terrain inconnu et ne le voyait pas, alors que lui voyait l'ordinateur et pouvait l'embarquer dans un
//    match. Il dit maintenant 'parc', son terrain (`pl`) et `plat` (pas d'empreinte à comparer). Chez lui, un joueur du
//    parc entier sorti du plateau (belvédère, allées) est caché : il marcherait dans le décor d'avant (horsPlateau).
//  - LE VRAI SOL : la hauteur ne voyage pas, chacun la lit sur SON sol ; mais on envoie sa NAPPE (`pn`, js/monde.js) :
//    au bord d'un mur (le terre-plein des caves au-dessus de ses volées, les terrasses), un avatar lissé ou anticipé
//    qui dépasse le bord de 30 cm garde la hauteur du haut au lieu de plonger d'un étage (mesuré au terre-plein des
//    caves : +5,7 gardé, au lieu de +3,3 lu par Monde.sol). Au belvédère, on le voit à +10,6 comme chez lui.
//  - LE VÉLO PRIS (`vi`, V1 à V6) : les autres cachent ce vélo-là à sa place de garage tant qu'on roule dessus.
//  - SON TERRAIN (`pl`, 1 ou 2 : le repère `plateau` du décor) : on se voit d'un terrain à l'autre, mais le cercle bleu
//    de l'un ne lance pas un match avec un joueur de l'autre (il le refuserait : voir inRing).
//  - DE LOIN : animation une image sur trois au-delà de 40 m, avatar caché au-delà de 90 m (LOD_AVATAR) ; et, même de
//    près, pas plus d'avatars animés à pleine cadence que le préréglage n'en permet (AVATARS_PLEINS, conception § 3.6).
//    Un cycliste qu'on voit garde la pleine cadence : c'est elle qui fait suivre son vélo (voir pasDeLoin).
//  - SA PLAQUE : hors de la passe de normales de l'occlusion ambiante (le registre des découpes de js/fx.js) : sans ça,
//    le rectangle entier du pseudo y passait pour un panneau plein, et un cadre sombre l'entourait vu de face.
//
// LE TAMPON D'INTERPOLATION (06/10/2026). Chaque paquet porte l'heure de son émetteur (`ts`, ms). Le récepteur ne
// court plus après la dernière position reçue : il garde la dernière seconde de paquets et montre chaque joueur tel
// qu'il était un peu plus de 100 ms plus tôt, entre deux paquets déjà arrivés (Tampon et Horloge, js/net.js). Les
// gestes (état, animation, saut) sont rejoués au même instant que la position, pas à l'arrivée du paquet : sinon un
// tir partait avant que le tireur soit arrivé à sa place. Un paquet SANS heure (client d'avant) garde le lissage
// d'avant. Un départ du salon (`leave`) retire l'avatar tout de suite (retirerJoueur), sans attendre OUBLI.
import * as THREE from 'three';
import { Player } from './player.js';
import { YARD } from './config.js';
import { EMOTES } from './emotes.js';
import { Monde } from './monde.js';
import { MOBILE } from './monde_charge.js';
import { Horloge, Tampon, heurePas } from './net.js';

const TAUX = 1 / 12;          // cadence MAXIMALE d'émission de sa propre position (quand on bouge)
// Un joueur qui ne bouge pas n'a rien à dire. Mais il ne peut pas se taire complètement : au bout de OUBLI
// secondes de silence, les autres le retirent du terrain. D'où un signe de vie régulier, bien plus lent.
const BATTEMENT = 2;          // secondes entre deux signes de vie quand rien ne change
const OUBLI = 6;              // secondes sans nouvelles avant de retirer un joueur
const LISSAGE = 0.16;         // constante de temps de l'interpolation des joueurs distants
// Le niveau de détail des avatars distants dans le parc entier (conception § 3.4 et § 3.6), en mètres de la caméra :
// au-delà d'`anim`, le squelette n'est animé qu'une image sur trois (la position, elle, suit à chaque image) ; au-delà
// de `cache`, l'avatar, sa plaque, son ballon et son vélo ne sont plus dessinés (5 m d'hystérésis). Sur un terrain
// plat (quelques dizaines de mètres de balade), rien de tout ça.
const LOD_AVATAR = { anim: 40, cache: 90, hysteresis: 5 };
// Combien d'avatars distants, au plus, gardent la pleine cadence (les plus proches de la caméra, à moins de 40 m), selon
// le préréglage en service (scene.userData.qualite, js/fx.js) : le tableau du § 3.6 de la conception. Les suivants
// passent à une image sur trois comme ceux de loin — neuf joueurs réunis sur le plateau ne coûtent pas neuf squelettes
// complets à un téléphone.
const AVATARS_PLEINS = { pc: { extreme: 10, ultra: 10, high: 10, medium: 6, low: 6 }, tel: { high: 4, medium: 3, low: 3 } };
// Au-delà de cet écart (m) entre l'avatar et la position reçue, c'est un saut (téléportation, longue coupure) : dans le
// parc entier, on le pose d'un coup (voir onPos). À 10 m/s, deux paquets sont à moins d'un mètre l'un de l'autre.
// Sur un terrain plat, 4 m suffisent (retour du menu, sortie d'un match, vélo posé) : on n'y glisse plus en travers.
const SAUT = 12, SAUT_PLAT = 4;
// L'écart entre les axes des deux terrains du parc (m) : de combien tout le décor glisse sur `parc2` pour y mettre le
// terrain 2 à l'origine. C'est repere.dxParc2 des données du parc entier (Monde.dx sur parc2) et -PLATEAU.t2 de
// js/court_parc.js pour le plateau seul ; on prend celui des données quand elles sont là.
const ECART_PARC2 = 16.1;
// Plateau seul au parc : un joueur du parc entier à plus de HORS_PLATEAU m de notre zone de balade est caché (voir
// horsPlateau) ; il réapparaît en revenant à moins de `retour` (l'écart évite qu'il clignote au portillon).
const HORS_PLATEAU = { sortie: 1.5, retour: 1.0 };

function plaque(nom) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.font = 'bold 60px Inter, system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#000'; g.shadowBlur = 14;
  g.fillStyle = '#ffffff';
  g.fillText(String(nom || 'Joueur').slice(0, 16), 256, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Presence {
  // roster : pour retrouver la fiche du personnage choisi par chaque joueur distant
  constructor(scene, roster, yard = null) {
    this.scene = scene; this.roster = roster; this.yard = yard;
    this.others = new Map();     // id -> { player, tag, cible, nom, vu, char }
    this.t = 0;
    this.silence = 0;               // temps ecoule depuis le dernier paquet reellement envoye
    this.dernier = null;                 // dernier paquet envoye, pour savoir si quelque chose a change
    this.room = null;
    this.actif = false;
    // Branchés par le jeu : le maillage du ballon (copié pour chaque joueur distant qui dribble) et la
    // mécanique de dribble du jeu (Game.balleEnMain), pour que la balle des autres rebondisse comme la sienne.
    this.modeleBalle = null;
    this.dribbler = null;
    // Le vélo du terrain : où on l'a garé la dernière fois [x, z, cap, numéro]. Branché par le jeu, qui
    // reçoit aussi celui des autres par `onVelo`.
    this.veloGare = null;
    this.onVelo = null;
    // LE MONDE où l'on est (lot A7, voir l'en-tête) : null drapeau baissé — rien n'est alors ajouté aux paquets ni
    // filtré à la réception. Posé par le jeu, comme `onAutreVersion(nom, paquet)`, appelé une fois par joueur dont les
    // données du monde diffèrent des nôtres (il rend false s'il n'a pas pu le dire : on réessaiera au paquet suivant).
    this.ter = null;
    this.onAutreVersion = null;
    this._avertis = new Set();
    // Le numéro de NOTRE terrain au parc, entier ou plateau seul (reperes.plateau : 1 pour `parc`, 2 pour `parc2`), posé
    // par le jeu avec `ter` ; 0 ailleurs. Voyage dans `pl`, dit le repère de nos positions (decalage) et trie le cercle
    // bleu (inRing).
    this.plateau = 0;
    this._rangs = [];                 // (update : les avatars triés par distance, tableau réutilisé d'une image à l'autre)
  }

  // On branche le salon : tout passe par le même transport que le chat, il n'y a rien de plus à ouvrir.
  attach(room) {
    this.room = room;
    this.actif = !!room || this.demoOn;
    if (!room && !this.demoOn) this.clear();
  }
  // la démonstration fait vivre la présence même sans salon branché
  setDemoOn(v) { this.demoOn = !!v; this.actif = !!this.room || this.demoOn; if (!this.actif) this.clear(); }

  clear() {
    for (const o of this.others.values()) this.retirer(o);
    this.others.clear();
  }

  retirer(o) {
    if (o.player) { o.player.dispose ? o.player.dispose() : this.scene.remove(o.player.mesh); this.scene.remove(o.player.mesh); o.player.retirerVelo?.(); }
    if (o.tag) { this.scene.remove(o.tag); this.horsNormales(o.tag, false); }
    if (o.balle) this.scene.remove(o.balle.mesh);
  }

  // LA PLAQUE ET L'OCCLUSION AMBIANTE (parc entier). La passe de normales de GTAO (js/fx.js) redessine toute la scène
  // avec un seul matériau opaque : la plaque, un sprite de 2,1 × 0,5 m (jusqu'à trois fois plus grand de loin), y
  // devenait un panneau plein, et l'occlusion traçait un cadre sombre tout autour du pseudo dès qu'on le voyait de face
  // (au belvédère, en regardant le long de la terrasse). Le registre des découpes que js/fx.js masque pendant cette
  // passe (scene.userData.registreDecoupes, tenu par js/monde_charge.js) la prend comme un feuillage. Il n'existe qu'au
  // parc entier : ailleurs, rien ne change.
  horsNormales(tag, oui) {
    const R = this.scene.userData.registreDecoupes;
    if (!R) return;
    if (oui) R.set.add(tag); else R.set.delete(tag);
    R.version++;
  }

  // ---------- émission : douze fois par seconde quand on bouge, toutes les deux secondes sinon ----------
  // Ce n'est pas de l'économie pour l'économie. Un hébergeur gratuit compte les messages ENTRANTS : douze par
  // seconde et par joueur, c'est ce qui décide combien d'heures par jour le terrain reste ouvert. Or sur un hub,
  // la plupart des gens sont arrêtés à discuter — et envoyer soixante fois la même position ne dessine rien de
  // plus à l'écran. On n'émet donc que ce qui a changé, et le reste du temps un simple signe de vie.
  //
  // Le seuil de position (2 cm) est celui en dessous duquel l'avatar distant ne bouge pas d'un pixel : le
  // lissage à la réception l'absorbe entièrement.
  // `ball` : le ballon local. Quand on ne l'a pas en main (tir, balle posée), on transmet sa position pour
  // que les autres voient partir le tir.
  //
  // LE REPÈRE DES POSITIONS (voir l'en-tête) : celui qu'on a sous les yeux, notre terrain à l'origine, comme avant le
  // lot A7 — c'est ce que lisent les anciens clients ; `pl` (completer) dit lequel des deux terrains du parc, et le
  // receveur ramène la position au sien (onPos). La hauteur ne voyage pas, chacun la lit dans son sol (Monde.sol).
  // (Jusqu'à la recette du 02/10, le parc entier envoyait x - Monde.dx, le repère du terrain 1 : sur parc2, l'APK
  // d'avant, qui ne connaît pas `pl`, voyait alors l'ordinateur à 16,1 m de sa place, contre le mur.)
  // `tn` : la tenue portée (Game.tenueIds), envoyée seulement si l'on porte quelque chose de la boutique.
  emit(u, dt, charId, ball = null, tn = null) {
    if (!this.actif || !this.room) return;
    this.t += dt;
    if (this.t < TAUX) return;

    const msg = {
      t: 'pos', id: this.room.ident.id, name: this.room.ident.display, char: charId || null, ts: Math.round(performance.now()),
      p: [r(u.pos.x), r(u.pos.z)], f: [r(u.facing.x), r(u.facing.z)], v: [r(u.vel.x), r(u.vel.z)],
      st: u.state, sp: r(u.speedNow), jy: r(u.jumpY), jv: r(u.jumpVel), b: u.hasBall ? 1 : 0, sprint: u.sprinting ? 1 : 0,
      an: u.etatAnim(),
    };
    if (Array.isArray(tn) && tn.some(Boolean)) msg.tn = tn;
    if (!u.hasBall && ball && ball.mesh.visible) msg.bp = [r(ball.pos.x), r(ball.pos.y), r(ball.pos.z)];
    if (this.veloGare) msg.vg = this.veloGare;
    if (this.ter) this.completer(msg, u);            // le parc entier en ligne (drapeau levé seulement)
    const v = this.dernier;
    const bouge = !v
      || Math.abs(msg.p[0] - v.p[0]) > 0.02 || Math.abs(msg.p[1] - v.p[1]) > 0.02
      || Math.abs(msg.f[0] - v.f[0]) > 0.03 || Math.abs(msg.f[1] - v.f[1]) > 0.03
      || msg.st !== v.st || msg.b !== v.b || msg.sprint !== v.sprint || Math.abs(msg.jy - v.jy) > 0.02
      || JSON.stringify(msg.an) !== JSON.stringify(v.an) || JSON.stringify(msg.bp) !== JSON.stringify(v.bp)
      || JSON.stringify(msg.vg) !== JSON.stringify(v.vg)
      || msg.char !== v.char || JSON.stringify(msg.tn) !== JSON.stringify(v.tn);   // changer de perso ou de tenue se voit tout de suite
    if (!bouge && this.silence + this.t < BATTEMENT) { this.silence += this.t; this.t = 0; return; }

    this.t = 0; this.silence = 0; this.dernier = msg;
    this.room.tr.send(msg);
  }

  // Ce que le parc entier ajoute au paquet (lot A7, voir l'en-tête) : le monde, l'empreinte de ses données et la nappe
  // sous nos pieds quand il est installé, le vélo qu'on a pris, notre terrain. Au plateau seul du parc, `plat` à la
  // place de l'empreinte et de la nappe : on n'a pas ces données (voir accepter). (La position du vélo pendant qu'on
  // monte en selle ou qu'on en descend, `an.vl[9]` de Player.etatAnim, est dans le même repère que `p` : rien à faire.)
  completer(msg, u) {
    msg.ter = this.ter;
    if (!Monde.plat) {
      msg.mh = Monde.hash;
      msg.pn = Monde.nappe(u.pos.x, u.pos.z);
    } else if (this.plateau) msg.plat = 1;              // plateau seul au parc (ailleurs, le paquet reste celui d'avant)
    const vi = u.velo && u.velo.v && u.velo.v.id;
    if (vi) msg.vi = vi;
    if (this.plateau) msg.pl = this.plateau;            // son terrain du parc : le repère de `p` (onPos) et le cercle (inRing)
  }

  // Où est le terrain 1 dans le monde que voit un joueur du terrain `pl` : 0 sur `parc` (et hors du parc), l'écart des
  // deux terrains sur `parc2`, où tout le décor a glissé pour mettre le terrain 2 à l'origine (Monde.dx au parc entier).
  decalage(pl) { return pl === 2 ? (Monde.repere?.dxParc2 ?? ECART_PARC2) : 0; }

  // LE MÊME MONDE ? (lot A7 ; seulement drapeau levé, voir l'en-tête.) Un joueur refusé qu'on voyait encore (il vient
  // de changer de terrain) disparaît tout de suite au lieu de rester planté 6 s.
  // L'empreinte des données ne se compare qu'entre deux parcs ENTIERS : un joueur au plateau seul (`plat`) n'en a pas,
  // et chez un joueur au plateau seul, l'empreinte de l'autre ne dit rien (pas de sol à comparer). Sans cette garde, le
  // plateau seul et le parc entier se refusaient l'un l'autre en se disant « une autre version du parc ».
  accepter(m) {
    let ok = true;
    if (m.ter === undefined) ok = Monde.plat;                  // ancien client ou drapeau baissé : un monde plat inconnu
    else if (m.ter !== this.ter) ok = false;                   // un autre terrain
    else if (!m.plat && !Monde.plat && (m.mh || null) !== (Monde.hash || null)) { ok = false; this.avertir(m); }   // d'autres données du monde
    if (!ok && this.others.has(m.id)) { this.retirer(this.others.get(m.id)); this.others.delete(m.id); }
    return ok;
  }
  avertir(m) {
    if (this._avertis.has(m.id) || !this.onAutreVersion) return;
    if (this.onAutreVersion(m.name || 'Joueur', m) !== false) this._avertis.add(m.id);
  }

  // La fiche du personnage d'un joueur distant. Un identifiant inconnu (perso ajouté dans une version plus récente du
  // jeu que la nôtre) prend un personnage FIXE pour ce joueur — tiré de son identifiant — au lieu d'en changer selon
  // l'ordre d'arrivée des autres.
  ficheDe(char, id) {
    const def = this.roster.find((r0) => r0.id === char);
    if (def) return def;
    const avatars = this.roster.filter((r0) => r0.model);
    let h = 0;
    for (const c of String(id || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return avatars.length ? avatars[h % avatars.length] : this.roster[0];
  }
  creerAvatar(m, x, z) {
    const p = new Player(this.ficheDe(m.char, m.id), this.scene, false);
    // Les avatars distants suivent les MEMES bornes que le joueur local : sur Levallois, sans ca, ils
    // se promenent a l'interieur du gradin.
    p.bounds = this.yard || YARD; p.remote = true;
    p.pos.set(x, Monde.solNappe(x, z, m.pn || 0), z);     // (sans nappe connue, c'est Monde.sol ; 0 à plat)
    return p;
  }

  // ---------- réception ----------
  onPos(m) {
    if (!this.actif || !m) return;
    if (this.room && m.id === this.room.ident.id) return;          // on ignore l'écho de ses propres paquets
    if (this.ter && !this.accepter(m)) return;                     // parc entier : un autre monde (voir accepter)
    // SON terrain à l'origine -> le nôtre (voir l'en-tête et emit) : au parc, son décalage retiré, le nôtre ajouté
    // (+16,1 m pour un joueur du parc vu du parc2). Un paquet sans monde (ancien client), ou drapeau baissé chez nous :
    // pris tel quel, superposé comme avant. (accepter garantit qu'un paquet AVEC monde est du nôtre.)
    const dx = this.ter && m.ter !== undefined ? this.decalage(this.plateau) - this.decalage(m.pl) : 0;
    const x = m.p[0] + dx, z = m.p[1];
    // le vélo pendant qu'il monte ou descend (Player.etatAnim, `an.vl[9]`) : même repère que `p`
    if (dx && m.an && m.an.vl && m.an.vl[9] !== undefined) m.an.vl[9] += dx;
    let o = this.others.get(m.id);
    if (!o) {
      const p = this.creerAvatar(m, x, z);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: plaque(m.name), transparent: true, depthWrite: false, depthTest: false }));
      tag.scale.set(2.1, 0.525, 1); tag.renderOrder = 8;
      this.scene.add(tag);
      this.horsNormales(tag, true);                        // (parc entier : voir horsNormales)
      if (this.visible === false) { p.mesh.visible = false; tag.visible = false; }
      o = { player: p, tag, cible: new THREE.Vector3(x, 0, z), nom: m.name, vu: 0, char: m.char };
      this.others.set(m.id, o);
    } else if (m.char && m.char !== o.char && !o.player.velo) {
      // IL A CHANGÉ DE PERSONNAGE (04/10/2026). L'avatar n'était créé qu'au premier paquet : quelqu'un qui changeait
      // de joueur ensuite (menu, vœu tout juste obtenu) gardait chez les autres son ancien perso — autre visage, autre
      // taille, et le mauvais personnage dans le cercle bleu. On refait l'avatar, à la même place. (À vélo, on attend
      // qu'il en descende : le vélo est accroché à l'avatar.)
      const avant = o.player;
      avant.disposed = true; this.scene.remove(avant.mesh);   // (disposed : un GLB encore en route ne s'y accroche plus)
      avant.retirerVelo?.();
      const p = this.creerAvatar(m, avant.pos.x, avant.pos.z);
      p.pos.y = avant.pos.y; p.facing.copy(avant.facing); p.faceWant.copy(avant.faceWant);
      if (this.visible === false || o.loin) p.mesh.visible = false;
      o.player = p; o.char = m.char; o.tn = undefined;     // la tenue est remise ci-dessous sur le nouvel avatar
    }
    // SA TENUE (Game.tenueIds) : rejouée seulement quand elle change. Un paquet sans `tn` = la tenue de la fiche.
    const tn = Array.isArray(m.tn) ? m.tn.slice(0, 3).map((v) => (typeof v === 'string' ? v : null)) : null;
    const cleTn = tn ? tn.join('|') : '';
    if (o.tn !== cleTn && this.habiller) { o.tn = cleTn; o.tenue = tn; this.habiller(o.player, tn || []); }
    if (m.name && m.name !== o.nom) { o.nom = m.name; o.tag.material.map = plaque(m.name); o.tag.material.needsUpdate = true; }
    const bp = m.bp ? (dx ? [m.bp[0] + dx, m.bp[1], m.bp[2]] : m.bp) : null;
    o.vu = 0;
    // parc entier : sa nappe (le sol de SON côté d'un mur) et le vélo qu'il a pris ; `viVu` garde ce vélo le temps
    // qu'il finisse d'en descendre chez nous (le paquet n'en parle plus, l'avatar est encore dessus)
    if (this.ter) { o.pn = m.pn || 0; o.vi = m.vi || null; if (m.vi) o.viVu = m.vi; o.pl = m.pl || 0; }
    // un ancien client (sans monde : on ne sait pas sur quel terrain il est, voir inRing) ; un joueur du parc ENTIER
    // vu du plateau seul (il peut sortir du plateau : voir horsPlateau)
    o.ancien = m.ter === undefined;
    o.entier = m.ter === 'parc' && !m.plat;
    if (m.vg && this.onVelo) this.onVelo(m.vg, m.id);
    if (Number.isFinite(m.ts)) {
      // PAQUET HORODATÉ : dans le tampon (voir l'en-tête). Sa position est lue par update à l'heure d'affichage, et ses
      // gestes attendent dans la file d'être rejoués au même instant. Une téléportation (plus de 2,5 m entre deux
      // paquets) y est un pas net, pas une glissade.
      if (!o.tampon) { o.tampon = new Tampon(1000, 2.5, 300); o.horl = new Horloge(); o.file = []; }
      o.horl.echantillon(m.ts);
      const v = m.v || [0, 0], f = m.f || [0, 1];
      if (o.tampon.ajouter({ t: m.ts, x, z, vx: v[0], vz: v[1], fx: f[0], fz: f[1] })) {
        o.file.push({ t: m.ts, m, bp });
        if (o.file.length > 40) { const g = o.file.shift(); this.etat(o, g.m, g.bp); }
      }
      return;
    }
    // UN SAUT : téléporté loin (à l'autre bout du parc, ou de 4 m sur un terrain plat), il y APPARAÎT au lieu d'y
    // glisser en une demi-seconde par-dessus les murs et les terrasses (le lissage de 0,16 s ne vaut que pour une
    // marche ou un vélo lancé)
    if (Math.hypot(x - o.player.pos.x, z - o.player.pos.z) > (this.ter && !Monde.plat ? SAUT : SAUT_PLAT)) {
      o.player.pos.set(x, Monde.solNappe(x, z, m.pn || 0), z); o.player.posPrec.copy(o.player.pos);
    }
    o.cible.set(x, 0, z);
    o.vit = m.v || null; o.recu = 0;
    this.etat(o, m, bp);
  }

  // Les gestes d'un paquet : état, saut, ballon, animation. Tout de suite pour un client d'avant, à l'heure
  // d'affichage pour un paquet horodaté (update).
  etat(o, m, bp) {
    o.face = m.f; o.st = m.st; o.sp = m.sp; o.jy = m.jy; o.ball = !!m.b; o.sprint = !!m.sprint; o.bp = bp;
    // Le saut : hauteur ET vitesse verticale, pour que la parabole continue entre deux paquets au lieu de
    // monter par marches de 80 ms.
    const p = o.player;
    p.jumpY = m.jy || 0; p.jumpVel = m.jv || 0; p.airborne = p.jumpY > 0.005 || p.jumpVel > 0.01;
    // Tout ce qui choisit l'animation (gestes, variante tirée au sort, emote, banc, chute...)
    p.hasBall = !!m.b;
    p.appliquerAnim(m.an || {}, EMOTES);
  }

  // Il a quitté le salon (le relais l'a dit) : son avatar disparaît tout de suite au lieu de rester planté OUBLI secondes.
  retirerJoueur(id) {
    const o = this.others.get(id);
    if (!o) return;
    this.retirer(o); this.others.delete(id);
  }

  // L'heure locale des pas de simulation (ms) : voir heurePas, js/net.js.
  heure(dt) { return (this.tLoc = heurePas(this.tLoc, dt, this.jeu)); }

  // ---------- animation des avatars distants ----------
  update(dt, camPos) {
    if (!this.actif) return;
    const k = 1 - Math.exp(-dt / LISSAGE);
    const tL = this.heure(dt), S = this._lu || (this._lu = {});
    if (!Monde.plat && camPos) this.classer(camPos);    // (parc entier : qui garde la pleine cadence, voir pasDeLoin)
    for (const [id, o] of [...this.others]) {
      o.vu += dt;
      if (o.vu > OUBLI) { this.retirer(o); this.others.delete(id); continue; }
      const p = o.player;
      if (o.tampon && o.tampon.n) {
        // TAMPON (voir l'en-tête) : l'heure de l'émetteur à montrer, les gestes arrivés jusque-là, puis la position
        // interpolée entre deux paquets. 100 à 200 ms de retard selon la régularité de ses paquets (12 par seconde).
        const tR = o.horl.affichage(tL, 100, 200);
        while (o.file.length && o.file[0].t <= tR) { const g = o.file.shift(); this.etat(o, g.m, g.bp); }
        o.tampon.lire(tR, S);
        p.pos.x = S.x; p.pos.z = S.z;
        p.vel.set(S.vx, 0, S.vz);
        if (!Monde.plat) p.pos.y = Monde.solNappe(p.pos.x, p.pos.z, o.pn || 0);
        p.faceWant.set(S.fx, 0, S.fz);
        if (p.faceWant.lengthSq() > 1e-6) p.faceWant.normalize(); else p.faceWant.set(0, 0, 1);
      } else {
        // (client d'avant, sans heure) lissage : on rattrape la dernière position connue au lieu de sauter dessus à
        // chaque paquet. La cible avance avec la vitesse transmise (au plus 0,15 s) : sans ça l'avatar courait toujours
        // un paquet en retard.
        o.recu = (o.recu || 0) + dt;
        const av = Math.min(o.recu, 0.15), cx = o.cible.x + (o.vit ? o.vit[0] * av : 0), cz = o.cible.z + (o.vit ? o.vit[1] * av : 0);
        const px = p.pos.x, pz = p.pos.z;
        p.pos.x += (cx - p.pos.x) * k;
        p.pos.z += (cz - p.pos.z) * k;
        // chacun pose les autres sur SON sol, du côté du mur où ils sont (leur nappe, `pn`) : voir l'en-tête
        if (!Monde.plat) p.pos.y = Monde.solNappe(p.pos.x, p.pos.z, o.pn || 0);
        if (o.vit) p.vel.set(o.vit[0], 0, o.vit[1]);
        // sans vitesse dans le paquet (joueurs de démonstration), on la déduit du déplacement lissé : sinon
        // les couches (inclinaison, pas) les croyaient immobiles pendant qu'ils marchaient
        else if (dt > 0) p.vel.set((p.pos.x - px) / dt, 0, (p.pos.z - pz) / dt);
        if (o.face) p.faceWant.set(o.face[0], 0, o.face[1]).normalize();
      }
      if (!p.clipSpin) p.turnTo(p.faceWant, dt);
      p.state = o.st || 'idle';
      p.speedNow = o.sp || 0; p.sprinting = !!o.sprint;
      p.hasBall = !!o.ball;
      // DE LOIN (parc entier seulement, LOD_AVATAR) : caché au-delà de 90 m, squelette animé une image sur trois au-delà
      // de 40 m — avec le temps accumulé, l'animation ne ralentit pas, elle avance par à-coups là où l'on ne la détaille pas
      const pas = Monde.plat || !camPos ? dt : this.pasDeLoin(o, camPos, dt);
      if (Monde.plat && this.ter === 'parc') this.horsPlateau(o);    // (plateau seul au parc, voir horsPlateau)
      if (pas > 0) p.update(pas);
      this.balleDe(o, dt);
      o.tag.position.set(p.pos.x, p.h * 1.06 + p.jumpY + 0.42 + p.pos.y, p.pos.z);   // (+ le sol : 0 à plat)
      // taille constante a l'ecran : la plaque grossit avec la distance pour rester lisible de loin
      if (camPos) { const k2 = Math.max(0.7, Math.min(3, o.tag.position.distanceTo(camPos) / 7)); o.tag.scale.set(2.1 * k2, 0.525 * k2, 1); }
    }
  }

  // Le rang de chaque avatar distant par distance à la caméra (0 = le plus proche), et combien gardent la pleine cadence
  // avec le préréglage en service (AVATARS_PLEINS). Parc entier seulement ; au plus neuf joueurs, un tri par image.
  classer(cam) {
    const L = this._rangs;
    L.length = 0;
    for (const o of this.others.values()) { o.dCam = Math.hypot(o.player.pos.x - cam.x, o.player.pos.z - cam.z); L.push(o); }
    L.sort((a, b) => a.dCam - b.dCam);
    for (let i = 0; i < L.length; i++) L[i].rang = i;
    const T = MOBILE ? AVATARS_PLEINS.tel : AVATARS_PLEINS.pc;
    this.pleins = T[this.scene.userData.qualite] || T.high;
  }

  // Le pas d'animation de l'avatar `o` vu de la caméra `cam` (0 : pas d'animation à cette image), et son affichage
  // selon la distance (voir LOD_AVATAR). Parc entier seulement. Pleine cadence à moins de 40 m, pour les `pleins` plus
  // proches (classer) ; une image sur trois pour tous les autres.
  // SAUF À VÉLO, tant qu'on le voit : c'est Player.update qui recolle le vélo sous la position lissée (Velo.appliquerReseau),
  // et le corps est posé sur la selle à chaque image. Une image sur trois, cycliste et vélo avançaient par bonds de trois
  // pas pendant que la plaque glissait au-dessus d'eux : mesuré à 60 m, à 6 m/s, de 5,8 à 15 cm par image au lieu de 10
  // réguliers (à 20 m : 10 cm, réguliers). Un cycliste ne coûte presque rien de plus : son squelette est posé par
  // cinématique inverse à l'affichage, pas par les clips.
  pasDeLoin(o, cam, dt) {
    const p = o.player, L = LOD_AVATAR, d = Math.hypot(p.pos.x - cam.x, p.pos.z - cam.z);
    const loin = d > L.cache - (o.loin ? L.hysteresis : 0);
    if (loin !== !!o.loin) { o.loin = loin; this.montrer(o); }
    if ((d <= L.anim && (o.rang || 0) < (this.pleins || AVATARS_PLEINS.pc.high)) || (p.velo && !o.loin)) { o.lodDt = 0; return dt; }
    o.lodDt = (o.lodDt || 0) + dt;
    // (la phase de départ suit le rang : trois avatars ralentis ne se mettent pas à jour tous à la même image)
    o.lodN = ((o.lodN ?? o.rang ?? 0) + 1) % 3;
    if (o.lodN) return 0;
    const pas = o.lodDt; o.lodDt = 0;
    return pas;
  }

  // PLATEAU SEUL AU PARC : un joueur du parc entier parti hors du plateau (au belvédère, dans les allées, au bord de
  // l'eau) n'a rien à faire dans notre décor, qui n'est pas le sien au-delà des grillages (pelouse, talus, faux parc
  // haut, tout à la hauteur du plateau) : il y marcherait dans le vide ou dans la terre. On le cache dès qu'il est à plus
  // de HORS_PLATEAU.sortie de notre zone de balade, et on le remontre à son retour. Même mécanique que l'éloignement du
  // parc entier (`o.loin`, montrer), qui n'existe pas ici (pasDeLoin ne tourne qu'au parc entier). Caché, il n'est pas
  // non plus dans le cercle bleu : il en est loin.
  // Appelé pour TOUS les avatars, pas seulement ceux du parc entier : un joueur caché hors du plateau qui repasse au
  // plateau seul sans qu'on l'ait oublié (rechargement de moins de OUBLI secondes, même identifiant) n'est plus du parc
  // entier, et il resterait caché pour de bon si l'on ne baissait pas son drapeau ici.
  horsPlateau(o) {
    const Y = this.yard || YARD, p = o.player.pos, m = o.loin ? HORS_PLATEAU.retour : HORS_PLATEAU.sortie;
    const dehors = !!o.entier && (p.x < Y.xMin - m || p.x > Y.xMax + m || p.z < Y.zMin - m || p.z > Y.zMax + m);
    if (dehors !== !!o.loin) { o.loin = dehors; this.montrer(o); }
  }

  // Dessiné ou non : le match cache tout le monde (setVisible), l'éloignement ceux qui sont au-delà de LOD_AVATAR.cache
  // (ou, au plateau seul du parc, hors du plateau : horsPlateau).
  montrer(o) {
    const v = this.visible !== false && !o.loin, p = o.player;
    if (p.mesh) p.mesh.visible = v;
    o.tag.visible = v;
    if (o.balle) o.balle.mesh.visible = v && (o.ball || !!o.bp);
    if (p.velo && p.veloDistant && p.velo.v === p.veloDistant) p.veloDistant.racine.visible = v;
  }

  // Son ballon : dans la main, il dribble avec la mécanique du jeu ; lâché (tir, balle posée), il suit la
  // position transmise.
  balleDe(o, dt) {
    const veut = o.ball || !!o.bp;
    if (!veut || !this.modeleBalle) { if (o.balle) o.balle.mesh.visible = false; return; }
    if (!o.balle) {
      const mesh = this.modeleBalle.clone();
      mesh.visible = true; this.scene.add(mesh);
      o.balle = { pos: mesh.position.clone(), mesh, syncMesh() { this.mesh.position.copy(this.pos); } };
      o.balle.pos.set(o.player.pos.x, 1 + o.player.pos.y, o.player.pos.z);
    }
    const B = o.balle;
    B.mesh.visible = this.visible !== false && !o.loin;
    if (o.ball && this.dribbler) this.dribbler(o.player, B, dt);
    else if (o.bp) { const k = 1 - Math.exp(-dt / 0.06); B.pos.x += (o.bp[0] - B.pos.x) * k; B.pos.y += (o.bp[1] - B.pos.y) * k; B.pos.z += (o.bp[2] - B.pos.z) * k; B.syncMesh(); }
  }

  // ---------- qui est dans le cercle de lancement ----------
  // Renvoie les joueurs DISTANTS présents dans le cercle : ce sont eux qui partent en match avec toi.
  inRing(centre, rayon) {
    const out = [];
    for (const [id, o] of this.others) {
      if (o.player.velo) continue;                            // il passe à vélo : il ne vient pas jouer
      // parc entier : il est venu jusqu'à NOTRE terrain, mais il a choisi l'autre dans le menu (`pl`) — il refuserait le
      // match (Game.recevoirMatch : le repère `plateau` des dimensions diffère) et l'ordinateur jouerait à sa place.
      // (Un ancien client ne dit pas son terrain : on le garde, comme avant ; s'il est sur l'autre, il refusera.)
      if (this.ter && !o.ancien && (o.pl || 0) !== (this.plateau || 0)) continue;
      if (Math.hypot(o.player.pos.x - centre.x, o.player.pos.z - centre.z) < rayon) out.push({ id, nom: o.nom, char: o.char, tn: o.tenue || null, def: o.player.baseDef || o.player.def });
    }
    return out;
  }
  // TOUS LES JOUEURS QUI PEUVENT VENIR JOUER (04/10/2026), où qu'ils soient sur NOTRE terrain : plus besoin de se
  // retrouver tous dans le cercle au même moment, l'écran du match les propose et un toucher les ajoute. Mêmes règles
  // que le cercle (même terrain du parc), sans la distance ; ceux qui sont dans le cercle viennent en premier.
  // (Un joueur en match ne publie plus sa position : au bout de OUBLI secondes il n'est plus là, donc plus proposé.)
  disponibles(centre = null, rayon = 0) {
    const out = [];
    for (const [id, o] of this.others) {
      if (this.ter && !o.ancien && (o.pl || 0) !== (this.plateau || 0)) continue;
      const d = centre ? Math.hypot(o.player.pos.x - centre.x, o.player.pos.z - centre.z) : Infinity;
      out.push({ id, nom: o.nom, char: o.char, tn: o.tenue || null, def: o.player.baseDef || o.player.def, cercle: d < rayon, d });
    }
    return out.sort((a, b) => (b.cercle - a.cercle) || (a.d - b.d));
  }
  // Les avatars du hub n'existent qu'en balade : pendant un match ils resteraient plantés sur le terrain,
  // puisque `update()` n'est appelé que depuis la balade.
  setVisible(v) {
    for (const o of this.others.values()) {
      const w = !!v && !o.loin;              // (trop loin dans le parc entier : il reste caché, voir pasDeLoin)
      if (o.player.mesh) o.player.mesh.visible = w; o.tag.visible = w; if (o.balle) o.balle.mesh.visible = w;
      if (o.player.veloDistant && !v) o.player.veloDistant.racine.visible = false;
    }
    this.visible = !!v;
  }

  get count() { return this.others.size; }
  noms() { return [...this.others.values()].map((o) => o.nom); }
}

// ---------- démonstration ----------
// Sans serveur on est seul sur le terrain, ce qui rend le hub impossible à voir. `demo(n)` fabrique n joueurs
// fictifs qui se promènent et qui passent par EXACTEMENT le même chemin que de vrais joueurs distants (messages
// `pos` -> onPos -> interpolation). C'est donc aussi la façon de vérifier le pipeline sans réseau.
export class Demo {
  constructor(presence, roster, n = 3) {
    this.p = presence; this.t = 0;
    this.faux = [];
    const noms = ['Ethan', 'Clovis', 'Lamine', 'Djafar', 'Aiden', 'Haris'];
    for (let i = 0; i < n; i++) {
      const def = roster[(i + 1) % roster.length];
      this.faux.push({
        id: 'demo_' + i, name: noms[i % noms.length], char: def.id,
        x: -4 + i * 2.6, z: 4 + (i % 2) * 2.5, a: i * 1.7, r: 2.2 + i * 0.6, v: 0.5 + i * 0.12,
      });
    }
  }
  update(dt) {
    this.t += dt;
    if (this.t < 1 / 12) return;
    this.t = 0;
    // Parc entier (lot A7) : ils tournent autour de NOTRE terrain, dans notre repère comme tout paquet (Presence.emit),
    // et ils sont du même monde et du même terrain que nous (`ter`, `mh` ou `plat`, `pl`). Drapeau baissé, le paquet
    // reste celui d'avant.
    const ter = this.p.ter;
    for (const f of this.faux) {
      f.a += f.v * (1 / 12);
      const x = f.x + Math.cos(f.a) * f.r, z = f.z + Math.sin(f.a) * f.r;
      const fx = -Math.sin(f.a), fz = Math.cos(f.a);
      const m = { t: 'pos', id: f.id, name: f.name, char: f.char, p: [x, z], f: [fx, fz], st: 'idle', sp: f.v * f.r, jy: 0, b: 0, sprint: 0 };
      if (ter) { m.ter = ter; if (!Monde.plat) m.mh = Monde.hash; else if (this.p.plateau) m.plat = 1; if (this.p.plateau) m.pl = this.p.plateau; }
      this.p.onPos(m);
    }
  }
}

const r = (v) => Math.round(v * 100) / 100;
