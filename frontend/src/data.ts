export type PrioLevel = 0 | 1 | 2 | 4;
export type GlobalPrio = 0 | 1 | 2 | 3;
export type FlagKey = 'need' | 'solo' | 'abandon';

export interface PlayerAnnotation {
  prio: Record<string, PrioLevel>;
  flags: Record<string, FlagKey>;
}

export type Annotations = Record<string, PlayerAnnotation>;

export type SortState = 'default' | 'global' | 'flag' | `p:${string}`;

export interface Triumph {
  id: string;
  section?: string;
  cat: string;
  catFr?: string;
  sub: string;
  subFr?: string;
  groupKey: string;
  en: string;
  fr: string;
  pt?: string;
  done?: boolean;
  descEn: string;
  descFr: string;
  descPt?: string;
  icon?: string;
  titleEn?: string;
  titleFr?: string;
  titlePt?: string;
}

export interface NodeMeta {
  hash: number;
  level: 0 | 1 | 2;
  sectionId: string;
  catKey?: string;
  groupKey?: string;
  nameEn: string;
  nameFr: string;
  namePt?: string;
  descEn: string;
  descFr: string;
  descPt?: string;
  icon?: string;
  rankIndex?: number;
}

export interface ObjectiveProgress {
  current: number;
  completionValue: number;
}

export interface RecordProgress {
  completed: boolean;
  redeemed?: boolean;  // true when reward has been claimed (Bungie RecordRedeemed bit)
  objectives: ObjectiveProgress[];
  completedAt?: string; // ISO date string YYYY-MM-DD
}

export interface Group {
  section: string;
  cat: string;
  catFr: string;
  sub: string;
  subFr: string;
  groupKey: string;
  items: Triumph[];
}

export interface Section {
  id: string;
  label: string;
  hasData: boolean;
}

export interface ProgressSnapshot {
  player: string;
  date: string;       // YYYY-MM-DD
  level: 0 | 1 | 2;
  nodeKey: string;
  count: number;
}

export const CAT_FR: Record<string, string> = {
  Worlds: "Mondes",
  Stories: "Histoires",
  Combat: "Combat",
  Teamwork: "Travail d'équipe",
  Competitions: "Compétitions",
};

export const SUB_FR: Record<string, string> = {
  "Worlds|Vistas": "Panoramas",
  "Worlds|Patrol": "Patrouille",
  "Worlds|Treasure Hunting": "Chasse au trésor",
  "Worlds|Distortions": "Distorsions",
  "Stories|Tower": "La Tour",
  "Stories|Allies": "Alliés",
  "Stories|Campaigns": "Campagnes",
  "Stories|The Nine": "Les Neuf",
  "Combat|Targets": "Cibles",
  "Combat|Armaments": "Armement",
  "Combat|Exotic Missions": "Missions exotiques",
  "Teamwork|Strikes and Battlegrounds": "Assauts et champs de bataille",
  "Teamwork|Raid Challenges": "Défis de raid",
  "Teamwork|Dungeon Challenges": "Défis de donjon",
  "Competitions|PvP": "JcJ",
  "Competitions|Gambit": "Gambit",
  "Competitions|Sparrow Racing League": "Ligue de course de Sparrows",
};

const RAW: [string, string, [string, string, boolean][]][] = [
  ["Worlds","Vistas",[
    ["Worlds: Vistas","Mondes : Panoramas",false],
    ["Rendezvous: Nessus","Rendez-vous : Nessus",false],
    ["The Monument","Le Monument",true],
    ["Greetings from the Cosmodrome","Salutations du Cosmodrome",false],
    ["A Dreamy View","Une vue de rêve",true],
    ["Changed Perspective","Changement de perspective",false],
    ["A Window to Eternity","Une fenêtre sur l'Éternité",false],
    ["Cloudy Skies and Mountains Bare","Ciel nuageux et montagnes nues",false],
    ["The Silver of the Moon","L'argent de la Lune",true],
    ["A Futuristic Vision","Une vision futuriste",false],
    ["Lost Hope","Espoir perdu",false],
    ["An Impossible View","Une vue impossible",false],
    ["Witch Queen's Point of View","Le point de vue de la Reine Sorcière",true]
  ]],
  ["Worlds","Patrol",[
    ["Worlds: Patrol","Mondes : Patrouille",false],
    ["Rendezvous: Moon","Rendez-vous : Lune",false],
    ["Don't Even Slow Down","Ne ralentis même pas",false],
    ["Forcible Disconnect","Déconnexion forcée",false],
    ["Loot Goblin","Gobelin du butin",false],
    ["Jump Starter","Démarrage en trombe",false],
    ["Vent Core: Frog Blasted","Noyau de ventilation : Grenouille explosée",false],
    ["No Free Lunch","Rien n'est gratuit",false],
    ["Mine Now","À moi maintenant",false],
    ["Spider Tanks Defeated","Char-araignées vaincus",false],
    ["Intercepted Call","Appel intercepté",false],
    ["Handle Randal the Vandal","Gérer Randal le Vandale",false],
    ["I'm Tired, Boss","Je suis fatigué, patron",false],
    ["Doomed Hydra","Hydre condamnée",false],
    ["I've Got This","Je gère",false],
    ["Queqiao-41","Queqiao-41",true],
    ["Laid to Rest… Again","Mis en terre… à nouveau",false],
    ["Have You Lost Your Mind","As-tu perdu la tête",false]
  ]],
  ["Worlds","Treasure Hunting",[
    ["Worlds: Treasure Hunting","Mondes : Chasse au trésor",false],
    ["Imbaru Chest","Coffre Imbaru",true],
    ["Pieces of the Whole","Morceaux d'un tout",false],
    ["Pale Heart Navigator","Navigateur du Cœur Pâle",false],
    ["Treasure Hunt","Chasse au trésor",false],
    ["My Preciousssss","Mon préciieuuux",true],
    ["Maxed Out","Au maximum",false],
    ["Mara's Cipher","Le chiffre de Mara",false],
    ["Hidden Treasures","Trésors cachés",false]
  ]],
  ["Worlds","Distortions",[
    ["Worlds: Distortions","Mondes : Distorsions",false],
    ["Rendezvous: Europa","Rendez-vous : Europe",false],
    ["Distortion Denier","Négateur de distorsion",false],
    ["Too Big for Your Breaches","Trop grand pour tes brèches",false],
    ["Cache Chaser","Chasseur de caches",false],
    ["Master of Strange Matter","Maître de la matière étrange",false],
    ["Cosmodrome Case File Collector","Collectionneur de dossiers : Cosmodrome",false],
    ["EDZ Case File Collector","Collectionneur de dossiers : ZED",false],
    ["Nessus Case File Collector","Collectionneur de dossiers : Nessus",false],
    ["Europa Case File Collector","Collectionneur de dossiers : Europe",false],
    ["Luna Case File Collector","Collectionneur de dossiers : Lune",false],
    ["Dreaming City Case File Collector","Collectionneur de dossiers : Cité Onirique",false],
    ["Throneworld Case File Collector","Collectionneur de dossiers : Monde du Trône",false]
  ]],
  ["Stories","Tower",[
    ["Stories: The Tower","Histoires : La Tour",false],
    ["Rendezvous: EDZ","Rendez-vous : ZED",false],
    ["7th Column","7e Colonne",true],
    ["Birdfeeder","Mangeoire à oiseaux",true],
    ["Can You Pet the Dog?","Peut-on caresser le chien ?",true],
    ["Tower Spending Spree","Folie des dépenses à la Tour",false],
    ["GOOOAAAALLL!!!","BUUUUUT !!!",true],
    ["Sweeper, No Sweeping","Balayeur sans balayage",true],
    ["Reset The Clock!","Remets l'horloge à zéro !",true],
    ["Who Needs Floors Anyways","Qui a besoin d'étages de toute façon",false],
    ["Traveler's Manifestation","Manifestation du Voyageur",false]
  ]],
  ["Stories","Allies",[
    ["Stories: Allies","Histoires : Alliés",false],
    ["Nine-Touched Pact","Pacte touché par les Neuf",true],
    ["Sortie Send-Off","Départ en sortie",false],
    ["Me and You, Big Blue","Toi et moi, grand bleu",false],
    ["Right on the Marc","En plein dans le Marc",false],
    ["Hooked on the Look","Accroché au style",false],
    ["Key for Free","Une clé gratuite",true],
    ["Fragments of Light","Fragments de Lumière",true],
    ["Fragments of Stasis","Fragments de Stase",true],
    ["Fragments of Strand","Fragments de Trame",false],
    ["Daydreaming","Rêvasser",false],
    ["For The Bird","Pour l'oiseau",false]
  ]],
  ["Stories","Campaigns",[
    ["Stories: Campaigns","Histoires : Campagnes",false],
    ["Rendezvous: Dreaming City","Rendez-vous : Cité Onirique",false],
    ["Full Deck","Jeu complet",false],
    ["Just a Dream","Juste un rêve",true],
    ["Above and Beyond","Au-delà des attentes",false],
    ["Into Darkness","Dans les ténèbres",false],
    ["Reality Check","Retour à la réalité",true],
    ["Cunning Is Strength","La ruse est une force",true],
    ["Relics of the Past","Reliques du passé",true],
    ["Just Stand Riiiight There","Reste juste làààà",false],
    ["Count on Khvostov","Compte sur le Khvostov",false],
    ["Play Nice","Joue gentiment",false],
    ["Where'd We Park?","Où est-ce qu'on s'est garé ?",false],
    ["Still Have Reserves?","Encore des réserves ?",false],
    ["Dry Feet","Les pieds secs",false],
    ["Who Needs Roads?","Qui a besoin de routes ?",false],
    ["Last Grasp for Glory","Dernier élan vers la gloire",false]
  ]],
  ["Stories","The Nine",[
    ["Stories: The Nine","Histoires : Les Neuf",false],
    ["Rendezvous: Eternity","Rendez-vous : Éternité",false],
    ["Ak-Baral, Nine-Touched","Ak-Baral, touché par les Neuf",false],
    ["Yann, Nine-Touched","Yann, touché par les Neuf",false],
    ["Talas, Nine-Touched","Talas, touché par les Neuf",false],
    ["Nightmare of Arguth, Nine-Touched","Cauchemar d'Arguth, touché par les Neuf",true],
    ["Inkasi, Nine-Touched","Inkasi, touché par les Neuf",false],
    ["Teliks, Nine-Touched","Teliks, touché par les Neuf",false],
    ["Bar-Zel, Nine-Touched","Bar-Zel, touché par les Neuf",false],
    ["Have a Blast","Amuse-toi bien",false],
    ["Strange Coinage","Monnaie étrange",false],
    ["Cosmic Feed","Flux cosmique",false],
    ["What Came Before","Ce qui précédait",false],
    ["I'll Go High","Je vais en haut",false],
    ["Called It","Je l'avais dit",false],
    ["Thunderstruck","Frappé par la foudre",false]
  ]],
  ["Combat","Targets",[
    ["Combat: Targets","Combat : Cibles",false],
    ["Rendezvous: Throne World","Rendez-vous : Monde du Trône",true],
    ["Vex Invalidated","Vex invalidés",false],
    ["Step Into the War","Entrer en guerre",false],
    ["Fallen Galvanized","Déchus galvanisés",false],
    ["Hive Torpor","Torpeur de l'Essaim",false],
    ["Dread Unraveled","Effroi dévoilé",false],
    ["Scorn Calcination","Calcination des Désolés",false],
    ["Taken Resorption","Résorption des Pris",false],
    ["Are You Sure About This","Es-tu sûr de toi",true],
    ["A Poke in the Eye","Un coup dans l'œil",false],
    ["That Wizard…","Cette sorcière…",false],
    ["Hidden Thorn","Épine cachée",true],
    ["Fireteam's Shadow","L'ombre de l'escouade",true],
    ["Hurry Up","Dépêche-toi",false]
  ]],
  ["Combat","Armaments",[
    ["Combat: Armaments","Combat : Armement",false],
    ["A Bit Much, Really","Un peu trop, franchement",true],
    ["That's More Like It","Voilà qui est mieux",true],
    ["Prismatic Heart","Cœur prismatique",false],
    ["Don't Tell The Order","Ne le dis pas à l'Ordre",false],
    ["Stranded on Neomuna","Coincé sur Neomuna",false],
    ["Telesto Report","Rapport Telesto",false],
    ["Knife of My Slaying","Le couteau de mon massacre",false]
  ]],
  ["Combat","Exotic Missions",[
    ["Combat: Exotic Missions","Combat : Missions exotiques",false],
    ["Pinnacle Operative","Agent d'élite",false],
    ["Familiar Territory","Terrain familier",false],
    ["Pure Perfection","Pure perfection",false],
    ["Nimble Zero Hour","Heure Zéro agile",false],
    ["Tell the Tale","Raconte l'histoire",false],
    ["On the Double","Au pas de course",false],
    ["Cull's Shadow","L'ombre de l'Éradication",true],
    ["It's My Turn","C'est mon tour",true],
    ["Secret Triumph","Triomphe secret",false],
    ["Oh Worm?","Ah ouais ?",false],
    ["Darkest Depths","Profondeurs les plus sombres",false]
  ]],
  ["Teamwork","Strikes and Battlegrounds",[
    ["Teamwork: Strikes and Battlegrounds","Travail d'équipe : Assauts et champs de bataille",false],
    ["Battle-Forged","Forgé au combat",false],
    ["Champions Overcome","Champions vaincus",false],
    ["Perks of the Job","Les avantages du métier",true],
    ["A Legend Rises","Une légende s'élève",false],
    ["Mind Games","Jeux d'esprit",false],
    ["Spoiler Free","Sans divulgâcher",false],
    ["Old School","À l'ancienne",false],
    ["The Line Between Light and Dark","La frontière entre Lumière et Ténèbres",false],
    ["The Light of Dawn","La lumière de l'aube",false]
  ]],
  ["Teamwork","Raid Challenges",[
    ["Teamwork: Raid Challenges","Travail d'équipe : Défis de raid",false],
    ["Under the Rug","Sous le tapis",false],
    ["Editor's Choice: Raid","Choix de la rédaction : Raid",false],
    ["Eyes, Mouth, Heart","Yeux, bouche, cœur",false],
    ["Travel Advisory","Avis de voyage",false],
    ["The Great Usurper","Le grand usurpateur",false],
    ["Deicide","Déicide",false],
    ["At the Zenith","Au zénith",false],
    ["His Own Petard","Pris à son propre piège",false],
    ["Brilliant Instability","Brillante instabilité",false],
    ["Bone of the King","Os du roi",false],
    ["Deepsight Detective","Détective Vision Profonde",false]
  ]],
  ["Teamwork","Dungeon Challenges",[
    ["Teamwork: Dungeon Challenges","Travail d'équipe : Défis de donjon",false],
    ["In Every Corner","Dans chaque coin",false],
    ["Editor's Choice: Dungeon","Choix de la rédaction : Donjon",false],
    ["Warlord's Jailbreak","L'évasion du seigneur de guerre",false],
    ["Overbalanced","Déséquilibré",false],
    ["Burden of the Wealthy","Le fardeau des riches",false],
    ["Synchronized Breathing","Respiration synchronisée",false],
    ["One-Person Wrecking Crew","Équipe de démolition à lui seul",false],
    ["Do Not Worship Me","Ne m'adore pas",false],
    ["Sword Logic Supreme","Logique de l'épée suprême",false]
  ]],
  ["Competitions","PvP",[
    ["Competitions: PvP","Compétitions : JcJ",false],
    ["Scrapper","Bagarreur",false],
    ["Crowd Control","Contrôle de foule",false],
    ["A Little Friendly Competition","Une petite compétition amicale",false],
    ["Rite of Passage","Rite de passage",false],
    ["Boop","Boup",false],
    ["Medal Medley","Pot-pourri de médailles",false],
    ["Thrice-Ordained","Trois fois consacré",false],
    ["Recluse Atop the Mountain","Recluse au sommet de la montagne",false],
    ["Striking Stare","Regard frappant",false],
    ["Lunar Prophecy","Prophétie lunaire",false],
    ["Deadly Furnace","Fournaise mortelle",false]
  ]],
  ["Competitions","Gambit",[
    ["Competitions: Gambit","Compétitions : Gambit",false],
    ["Frozen Due to Suspicious Activity","Gelé pour activité suspecte",false],
    ["Two Sides, Same Coin","Deux faces, une pièce",false],
    ["No One Lives Forever","Personne ne vit éternellement",false],
    ["Elite Executioner","Exécuteur d'élite",false],
    ["Envoy While It Lasts","Envoyé tant que ça dure",false]
  ]],
  ["Competitions","Sparrow Racing League",[
    ["Competitions: SRL","Compétitions : LCS",false],
    ["Podium Placement","Place sur le podium",false],
    ["Built To Win","Conçu pour gagner",false],
    ["Racetrack Runway","Piste de course",false],
    ["Gate Lord","Seigneur des portails",false],
    ["Defensive Driver","Conducteur défensif",false],
    ["Don't Mess With The Honk","Ne plaisante pas avec le klaxon",false],
    ["SRL Tricky","LCS Acrobatique",false],
    ["Furiously Fast","Furieusement rapide",false],
    ["Light Speed","Vitesse de la lumière",false]
  ]]
];

let _id = 0;
export const DATA: Triumph[] = [];
export const GROUPS: Group[] = [];

RAW.forEach(([cat, sub, items]) => {
  const catSubKey = `${cat}|${sub}`;
  const groupKey = `triumphs|${cat}|${sub}`;
  const groupItems: Triumph[] = [];
  items.forEach(([en, fr, done]) => {
    const item: Triumph = { id: `t${_id++}`, section: 'triumphs', cat, sub, groupKey, en, fr, done, descEn: "", descFr: "" };
    DATA.push(item);
    groupItems.push(item);
  });
  GROUPS.push({ section: 'triumphs', cat, catFr: CAT_FR[cat] ?? cat, sub, subFr: SUB_FR[catSubKey] ?? sub, groupKey, items: groupItems });
});

export type Player = string;

export type FilterStatus = 'all' | 'none' | 'partial' | 'done';

export interface FilterState {
  status: FilterStatus;
  missing: Set<Player>;
}

export const DEFAULT_FILTER: FilterState = { status: 'all', missing: new Set() };

export function isFilterActive(f: FilterState): boolean {
  return f.status !== 'all' || f.missing.size > 0;
}

export const SECTIONS: Section[] = [
  { id: 'triumphs', label: 'Triomphes',        hasData: true },
  { id: 'titles',   label: 'Titres',           hasData: true },
  { id: 'ranks',    label: 'Rangs de Gardien', hasData: true },
];
