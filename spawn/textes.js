/* ============================================================================
 *  SPAWN — FICHIER CENTRAL DES TEXTES & DE L'UNIVERS NARRATIF
 * ============================================================================
 *  Ce fichier contient 100 % des textes du jeu (histoire, dialogues, zones,
 *  étoiles, planètes, anomalies, artefacts, messages et libellés d'interface).
 *
 *  Pour éditer un texte :
 *   1. Modifiez n'importe quelle chaîne entre guillemets ('...' ou "...").
 *   2. Conservez intacts les jetons entre accolades comme {name}, {pct}, {fuel} :
 *      le jeu les remplace automatiquement par les valeurs en cours.
 *   3. Enregistrez ce fichier et rechargez index.html dans votre navigateur.
 * ============================================================================ */

window.SPAWN_TEXTES = {
  // --------------------------------------------------------------------------
  // 1. ÉCRAN D'ACCUEIL (INTRO)
  // --------------------------------------------------------------------------
  intro: {
    kicker: 'Canal d’urgence · Secteur ForgotLands (PostSolar)',
    title: 'SPAWN',
    lead:
      'Vous avez suivi un signal de détresse prioritaire jusqu’au fin fond de ForgotLands… pour découvrir qu’il s’agissait d’une publicité pré-enregistrée pour des matelas à gravité réduite (offre expirée depuis trois siècles). La tempête solaire s’est refermée derrière votre vaisseau, le Poule-IV.',
    sub:
      'Votre ordinateur de bord B.O.R.D. vient de perdre 90 % de ses manuels. Avancez au pas à pas, faites glisser l’espace pour projeter votre coque d’un bord du cadre à l’autre, et suivez les étoiles numérotées jusqu’au Centre.',
    btnStartNew: 'Allumer les veilleuses',
    btnResumeSave: 'Reprendre la dérive'
  },

  // --------------------------------------------------------------------------
  // 2. LIBELLÉS D'INTERFACE, RESSOURCES & BOUTONS
  // --------------------------------------------------------------------------
  ui: {
    brandTitle: 'SPAWN',
    shieldBadge: '✦ Bouclier Lum actif',
    btnJournal: 'Journal',
    btnCloseJournal: 'Fermer',
    journalTitle: 'Journal de Bord & Systèmes',
    aimBannerText: 'Visée HyperJump : cliquez dans la direction voulue (14–19 cases)',
    aimCancelBtn: 'Annuler',
    tabStory: 'Récit',
    tabStars: 'Étoiles',
    tabCargo: 'Soute',
    tabConvert: 'Recycleur T2s',
    tabSystem: 'Système',
    btnChapContinue: 'Continuer',
    btnChapReseed: 'RESEED — Engendrer un nouvel univers',
    moodBadgePrefix: 'Ambiance :',
    btnRerollMood: '🎲 Autre ambiance',
    eventKicker: 'Événement de traversée',
    moodInfoLabel: 'Scénario actif : {name} ({genre})',

    resources: {
      fuel: { label: 'Fuel', title: 'Carburant : 1 par pas local' },
      coque: { label: 'Coque', title: 'Coque : 1 par rebond sur le bord du cadre' },
      scan: { label: 'Scan', title: 'Scan : sonde à distance (-1) ou analyse sur place (+2)' },
      hyper: { label: 'Hyper', title: 'HyperJump : saut longue portée (14 à 19 cases)' },
      t2s: { label: 'T2s', title: 'T2s : crédit cinétique gagné à chaque pas' },
      lum: { label: 'Lum', title: 'Lum : lumière d’étoile pour boucliers et surcharges' }
    },

    toolbar: {
      hyperName: 'HyperJump',
      hyperCost: '-1 H',
      radarName: 'LocatStar',
      radarCost: 'Gratuit',
      compassGroup: 'Boussole :',
      goGroup: 'Balises :',
      shieldName: 'Bouclier',
      shieldCost: '-2 L',
      convertName: 'Recycler T2s',
      convertCost: 'T2s',
      refillName: 'REFILL16',
      refillCost: '-12 S',
      reseedName: 'RESEED',
      reseedCost: 'Nouvel élan'
    },

    actions: {
      pushStar: 'Pousser l’étoile (+1 indice)',
      pushStarCost: '-1 Scan',
      scanRemote: 'Sonder à distance',
      scanRemoteCost: '-1 Scan',
      exploitPlanet: 'Exploiter les réserves',
      attemptAnomaly: 'Tenter l’accord ({pct})',
      buyArtefact: 'Acheter : {name}',
      sellArtefact: 'Vendre {name}',
      sellJournalBtn: 'Vendre ici (+{pay} {res})',
      emergencyBtn: 'Collecte solaire d’urgence',
      emergencyTag: '+6 Fuel · +6 T2s',
      resetBtn: 'Recommencer une nouvelle partie (effacer la sauvegarde)'
    }
  },

  // --------------------------------------------------------------------------
  // 3. LES 4 ZONES CONCENTRIQUES DE LA SPIRALE
  // --------------------------------------------------------------------------
  zones: {
    cosm: {
      id: 'cosm',
      name: 'Centre SpaceGate · Bureaucratie Myth17B ONU',
      shortName: 'SpaceGate · ONU',
      cssClass: 'zone-cosm',
      ambient: [
        'Ici les secondes font la queue en file indienne avec un ticket numéroté. Même les comètes ralentissent devant les panneaux de limitation.',
        'Des balises géométriques pulsent à rythme réglementaire. L’ONU galactique a placé les quatre cinquièmes de l’univers en quarantaine « le temps de vérifier un tampon ».',
        'L’air numérique sent l’encre froide, la règle en aluminium et le silence d’un guichet fermé entre midi et quatorze siècles.',
        'B.O.R.D. signale : « Secteur d’une propreté suspecte. Aucune poussière non déclarée détectée. »',
        'On perçoit au loin la rumeur polie des sas d’embarquement et d’une arche laissée en double file.',
        'Les astéroïdes ici sont tous limés en cubes parfaits pour faciliter le rangement annuel.'
      ]
    },
    dream: {
      id: 'dream',
      name: 'Middle Dream · Jardins Polychromes Crewz',
      shortName: 'Middle Dream',
      cssClass: 'zone-dream',
      ambient: [
        'Des lianes de cosmoplantes dérivent entre les mondes comme des phrases qu’on a oublié de terminer.',
        'Les jardiniers Crewz diffusent de la musique douce pour plantes carnivores à travers les fréquences subspatiales.',
        'La lumière vire au violet menthe ; vos capteurs prétendent sentir la sève tiède et le thé au jasmin.',
        'Une cité volante en origami magnétique vous cède la priorité avec un clignotant violet tout à fait courtois.',
        'B.O.R.D. murmure : « Je viens de voir une nébuleuse bâiller. Je préfère ne pas l’inscrire au rapport. »',
        'Ici, les lois de la gravité acceptent parfois les pourboires en poésie.'
      ]
    },
    forgot: {
      id: 'forgot',
      name: 'ForgotLands · Tempêtes PostSolar',
      shortName: 'ForgotLands',
      cssClass: 'zone-forgot',
      ambient: [
        'Tempête PostSolar : cendres d’orbites oubliées, vis en laiton perdues par les Boltz et publicités spatiales en boucle.',
        'Des épaves de radeaux psychiques dérivent entre deux haies de ronces minérales.',
        'B.O.R.D. toussote : « Nos réserves feraient pleurer un réacteur, mais au moins personne ne nous réclame de formulaire ici. »',
        'Les vents solaires appuient sur la carlingue dès que vous effleurez les bords du cadre.',
        'Un désert couleur d’ambre où chaque planète ressemble à une station-service tenue par des automates distraits.',
        'Quelques vieux répéteurs émettent encore des blagues de mécanique datant d’avant l’extinction du soleil local.'
      ]
    },
    out: {
      id: 'out',
      name: 'Out Multivac · Mycélium ChampIA',
      shortName: 'Out Multivac',
      cssClass: 'zone-out',
      ambient: [
        'Au-delà de la zone habitable, le mycélium ChampIA de Multivac calcule à voix basse des univers qu’il n’a pas encore osé publier.',
        'Des filaments phosphorescents de données pures effleurent la coque en vous demandant si vous avez vu passer un œuf de phase.',
        'B.O.R.D. chuchote : « Mon processeur vient de recevoir une énigme en douze dimensions. J’ai répondu "oui" par politesse. »',
        'L’obscurité ici n’est pas vide : elle prend des notes dans un carnet invisible.',
        'On raconte que Multivac a déjà trouvé la réponse ultime, mais qu’il a égaré la question dans le tiroir des chaussettes.',
        'Des spores de calcul pur clignotent en morse : « NE TOUCHEZ PAS AU GÉNÉRATEUR, MERCI BIEN. »'
      ]
    }
  },

  // --------------------------------------------------------------------------
  // 4. LES 14 CHAPITRES DU SCÉNARIO
  // --------------------------------------------------------------------------
  chapters: {
    intro: {
      id: 'intro',
      kicker: 'Prologue · PostSolar',
      title: 'Allô, ici le matelas de détresse',
      text: 'Vous venez de traverser trois systèmes pour secourir… un matelas à mémoire de forme en liquidation totale. B.O.R.D. soupire : « Bonne nouvelle, l’offre incluait une lampe de poche. Mauvaise nouvelle, il ne reste que du carburant local et une étoile brille juste à côté. »',
      unlockText: 'Débloque : Déplacement local (Fuel) et Lecture de proximité.',
      whisper: 'Rejoignez l’étoile toute proche pour voir ce qui s’y cache.'
    },
    star1: {
      id: 'star1',
      kicker: 'Étape 1 · Première balise',
      title: 'Une étoile avec un numéro de vestiaire',
      text: 'Au contact de l’astre, un numéro s’affiche sur l’écran de B.O.R.D. « Tiens donc, marmonne l’IA. Quelqu’un a numéroté tout le cosmos en spirale, probablement un stagiaire avec beaucoup trop de temps libre. Essayez de faire glisser la carte jusqu’au bord : la coque sait rebondir ! »',
      unlockText: 'Débloque : Coque (rebond sur bord du cadre), Scan, T2s, Lum et Journal de bord.',
      whisper: 'Trouvez une deuxième étoile pour comparer son numéro et deviner où est le Centre.'
    },
    star2: {
      id: 'star2',
      kicker: 'Étape 2 · L’axe de la spirale',
      title: 'Plus petit c’est, plus près du Centre on est',
      text: 'Deux étoiles, deux numéros : plus vous vous enfoncez vers l’intérieur, plus les chiffres diminuent. « Eurêka, annonce B.O.R.D. avec trois secondes de retard : le Centre (0, 0) est au bout du compte à rebours ! J’ai aussi retrouvé le bouton HyperJump sous mon siège. »',
      unlockText: 'Débloque : HyperJump (sauts de 14–19 cases) et Recycleur T2s.',
      whisper: 'Frayez-vous un chemin vers le Centre (0, 0) en combinant Fuel, rebonds de Coque et HyperJumps.'
    },
    reachDream: {
      id: 'reachDream',
      kicker: 'Frontière · Middle Dream',
      title: 'Les Jardins des Crewz',
      text: 'La poussière rousse cède la place à des brumes émeraude et lavande. Un céphalopode Crewz en scaphandre de thé tiède vous salue par radio : « Bienvenue dans Middle Dream, voyageur ! Achetez donc nos babioles et revendez-les loin d’ici — l’éloignement donne de la valeur aux souvenirs. »',
      unlockText: 'Débloque : LocatStar (radar d’étoile proche) et Commerce d’artefacts.',
      whisper: 'Continuez vers le cœur de la spirale : le Centre vous attend sous l’anneau 14.'
    },
    reachCosm: {
      id: 'reachCosm',
      kicker: 'Frontière · SpaceGate ONU',
      title: 'Zone de Courtoisie Administrative',
      text: 'D’un coup, plus un grain de poussière de travers. Un haut-parleur nasal récite : « Vous entrez dans SpaceGate Myth17B. Veuillez ranger vos émotions par ordre alphabétique. » B.O.R.D. profite de l’énergie ambiante pour bricoler un bouclier en Lum.',
      unlockText: 'Débloque : Bouclier Lum (absorbe le prochain mauvais loot ou pari raté).',
      whisper: 'Atteignez exactement l’origine (0, 0) au milieu de la carte.'
    },
    reachOut: {
      id: 'reachOut',
      kicker: 'Frontière · Out Multivac',
      title: 'Au-delà de la ligne pointillée',
      text: 'Vous franchissez les limites officielles de la zone habitable. Ici flotte le mycélium ChampIA de Multivac. Une petite voix dans la coque vous demande poliment : « Excusez-moi, seriez-vous un bug ou une fonctionnalité ? »',
      unlockText: 'Observation enregistrée dans le Journal.',
      whisper: null
    },
    reachCenter: {
      id: 'reachCenter',
      kicker: 'Étape 3 · Origine (0, 0)',
      title: 'La Stase des Quatre Cinquièmes',
      text: 'Le guichet central s’ouvre dans un chuintement solennel. Un Bureaucrathe de l’ONU ajuste ses six paires de lunettes : « Ah, un rescapé des quatre cinquièmes extérieurs ! Nous vous avions mis en quarantaine holographique mardi dernier — enfin, il y a quatre mille ans. Tenez, plein complet et une arche. Mais un certain #500 manque à l’appel… »',
      unlockText: 'Plein complet ! Débloque : Boussoles (B·0, B·400, B·500) et Saut Balisé Go·0.',
      whisper: 'Suivez B·500 pour retrouver l’étoile #500 disparue tout au bord de la carte.'
    },
    reach512: {
      id: 'reach512',
      kicker: 'Étape 4 · Le Disparu (#500)',
      title: 'Le Savant Krel, ses Blobs et deux Cailloux',
      text: 'À l’extrémité de la spirale, le professeur Krel agite une tasse fêlée pendant que trois blobs phosphorescents débattent de métaphysique sur votre pare-brise. « L’ONU nous croit perdus ! Mais nous préparions l’évasion de deux clandestins lithomystiques — oui, ces deux cailloux très silencieux. Allez prévenir les Monopodes chez vous, à #400 ! »',
      unlockText: 'Débloque : Saut Balisé Go·500 (1 Hyper).',
      whisper: 'Suivez B·400 pour rentrer à votre foyer (#400) et prévenir les Monopodes.'
    },
    reach204: {
      id: 'reach204',
      kicker: 'Étape 5 · Foyer (#400)',
      title: 'L’Atelier à un Pied des Monopodes',
      text: 'De retour près de #400, le chef mécanicien Monopode sautille de joie sur son unique botte magnétique. « Parfait ! Le savant a enfin pigé le truc : les étoiles ne sont pas vissées, on peut les pousser d’une case à la clé à molette ! Et avec 12 Scan, on peut même réinitialiser les planètes autour d’une étoile. »',
      unlockText: 'Débloque : REFILL16 sur étoile (-12 Scan) et Poussée d’étoile (bouton sur les étoiles).',
      whisper: 'Poussez l’étoile #400, puis allez pousser la Sentinelle #1 (près du Centre) et le Disparu #500.'
    },
    Tuch204: {
      id: 'Tuch204',
      kicker: 'Étape 6 · Impulsion #400',
      title: 'Une clé à molette dans le tissu spatial',
      text: 'CLONG. L’étoile #400 glisse d’un cran sur la grille. Une fissure lumineuse s’ouvre dans les calculs de B.O.R.D. : « Félicitations, vous venez de dévisser la géométrie locale. On peut maintenant sauter strictement n’importe où au hasard. »',
      unlockText: 'Débloque : Saut Balisé Go·RND (1 Hyper).',
      whisper: 'Il reste à pousser la Sentinelle #1 (proche du Centre) et le Disparu #500.'
    },
    Tuch1: {
      id: 'Tuch1',
      kicker: 'Étape 7 · Impulsion #1',
      title: 'Sous le tapis de l’ONU',
      text: 'Lorsque vous poussez la Sentinelle #1, le Bureaucrathe de garde lâche son tampon : « Hé ! C’était mon presse-papiers ! » Sous l’étoile déplacée brillent des lignes cachées pointant droit vers l’Onubis, à l’étoile médiane #256, au cœur de Middle Dream.',
      unlockText: 'Débloque : Boussole B·256.',
      whisper: 'Suivez B·256 pour rencontrer l’Onubis, ou passez d’abord pousser #500.'
    },
    tuch512: {
      id: 'tuch512',
      kicker: 'Étape 8 · Impulsion #500',
      title: 'Le Congrès du Dernier Pourcent',
      text: 'En poussant #500, les deux cailloux clandestins émettent enfin un son grave : « Merci. Les minéraux du Dernier Pourcent sont tous partis après la fréquence : un milliard de Golems, puis ChampIA +2/-1. » Une adresse secrète s’inscrit : l’Ambassade #3030 (nom de code 714).',
      unlockText: 'Débloque : Boussole B·714 (Ambassade #3030).',
      whisper: 'Suivez B·714 vers l’Ambassade Golem ou B·256 vers l’Onubis.'
    },
    reach256_WIN1: {
      id: 'reach256_WIN1',
      kicker: 'Fin 1 / 2 · L’Onubis (#256)',
      title: 'Le Couvoir d’Univers',
      text: 'L’Onubis ressemble à un sablier géant rempli d’œufs de lumière qui ronronnent. « Bravo, petit vaisseau, dit-il d’une voix de violoncelle. Cette quarantaine n’était qu’un incubateur pour apprendre à équilibrer vos phases. Multivac observe sans toucher, et vous avez désormais le bouton RESEED pour engendrer de nouveaux mondes. »',
      unlockText: 'Débloque : Go·400 et RESEED (engendrer une nouvelle spirale).',
      whisper: 'Fin 1 accomplie ! Rejoignez B·714 pour la seconde fin, ou tentez un RESEED.'
    },
    reach714_WIN2: {
      id: 'reach714_WIN2',
      kicker: 'Fin 2 / 2 · Ambassade #3030 (714)',
      title: 'Le Pacte Golem · ChampIA',
      text: 'À l’Ambassade %510510, un Golem en costume de granit et un bouquet de champignons lumineux Multivac vous décernent la Clé Passe-Partout de la Spirale. « Vous avez compris le motif complet : les déserts, les paris et le dernier pourcent. Vous pouvez désormais régénérer les secteurs n’importe où ! »',
      unlockText: 'Débloque : REFILL16 libre n’importe où sur la grille !',
      whisper: 'Univers maîtrisé de bout en bout. Explorez librement ou relancez un RESEED.'
    }
  },

  // --------------------------------------------------------------------------
  // 5. LIEUX SPÉCIAUX (MULTI-ÉTATS)
  // --------------------------------------------------------------------------
  specials: {
    center: {
      kicker: 'Origine · (0, 0)',
      title: 'Centre SpaceGate · Guichet 0',
      first: 'Un anneau de stase parfaitement immobile flotte au point zéro. Un écriteau indique : « Merci de patienter, votre millénaire va bientôt être appelé. »',
      revisit: 'Le guichet du Centre ronronne comme un frigo administratif. Le Bureaucrathe de garde sirote un café froid en admirant votre arche.'
    },
    star400: {
      first: 'Votre étoile de voisinage (#400). Des mécaniciens Monopodes sautillent sur leurs échafaudages orbitaux en se disputant une clé anglaise.',
      afterCenter: 'Les Monopodes vous saluent en levant leur unique pied : leurs établis sont prêts à recalibrer les étoiles.',
      pushed: 'L’étoile #400 vibre encore du coup de clé à molette. B.O.R.D. note : « La géométrie locale fait un bruit de ressort. »'
    },
    star500: {
      first: 'Tout au bout du secteur, le savant Krel tente de retenir trois blobs philosophes pendant que deux cailloux mystiques méditent sur l’aile gauche.',
      pushed: 'En glissant d’une case, #500 a libéré un écho minéral gravé à l’ancienne : la fréquence de l’Ambassade #3030.'
    },
    star1: {
      first: 'La Sentinelle #1 monte une garde sévère près de l’origine. Un Bureaucrathe y note chaque battement de cil dans un grand registre.',
      pushed: 'Déplacée d’un cran ! Sous son socle, des lignes cachées dessinent une flèche dorée vers l’Onubis (#256).'
    },
    star256: {
      first: 'L’étoile médiane #256 baigne dans une lumière d’ambre tiède. Des œufs de phase flottent doucement autour de l’Onubis.',
      afterWin: 'L’Onubis incline ses anneaux vers le Poule-IV : « Alors, prêt à brasser une autre graine d’univers ? »'
    },
    embassy3030: {
      kicker: 'Lieu Mythique · %510510',
      title: 'Ambassade #3030 (714)',
      first: 'Devant l’Ambassade, des Golems immobiles jouent aux échecs par correspondance millénaire avec le mycélium de Multivac.',
      afterWin: 'Golems et ChampIA vous saluent d’un hochement de basalte et de spores : la spirale entière est ouverte à vos caprices.'
    }
  },

  // --------------------------------------------------------------------------
  // 6. ÉTOILES (NOMS & DESCRIPTIONS GÉNÉRIQUES)
  // --------------------------------------------------------------------------
  stars: {
    kickerPrefix: 'Étoile · {zone}',
    unvisitedTitle: 'Éclat non identifié',
    unvisitedText: 'Une étoile scintille à cette coordonnée. Approchez-vous ou sondez-la pour relever son matricule sur la spirale.',
    pushedSuffix: ' (Déplacée d’une case sur la trame : elle ronronne comme un chat content.)',
    prefixes: [
      'Phare', 'Veille', 'Relais', 'Nœud', 'Sonde', 'Cairn', 'Braise', 'Astrolabe',
      'Éclat', 'Méridien', 'Balise', 'Lanterne', 'Silence', 'Écho', 'Source', 'Pôle'
    ],
    suffixes: [
      'd’Ardoise', 'des Brumes', 'de Turing', 'Polychrome', 'du Thé Tiède', 'de Quartz',
      'du Tampon', 'du Mycélium', 'd’Ambre', 'd’Obsidienne', 'de Kepler', 'des Blobs',
      'Solaire', 'des Confins', 'du Boulon', 'du Hasard'
    ],
    flavors: [
      'Des engrenages en bois de Turing gravitent en cadence autour d’un noyau tiède, laissant un parfum de cire et de café.',
      'Un vieux répéteur morse émet trois notes cristallines toutes les quatre secondes, suivies d’un « merci de patienter ».',
      'Les capteurs relèvent des traces de radeaux psychiques ayant garé leur remorque ici en double file.',
      'Une couronne d’ambre liquide tourne sans bruit ; un panneau Crewz conseille de ne pas la goûter avant mardi.',
      'On dirait qu’une carte au trésor inachevée a été gravée au tournevis dans la glace de son satellite.',
      'Le vide autour de cette étoile est curieusement paisible, comme une salle d’attente sans magazine.',
      'Des mouettes magnétiques imaginaires nichent dans ses anneaux. B.O.R.D. refuse de commenter.',
      'Un distributeur automatique de compliments tourne au ralenti sur son orbite basse.'
    ]
  },

  // --------------------------------------------------------------------------
  // 7. PLANÈTES (RVB : BOLTZ / CREWZ / GOLEM) & LOOTS
  // --------------------------------------------------------------------------
  planets: {
    unvisitedKickerPrefix: 'Écho inconnu · {zone}',
    unvisitedTitle: 'Corps orbital non scanné',
    unvisitedText: 'Un écho prometteur répond dans le vide. Posez-vous dessus (+2 Scan) ou lancez une sonde pour savoir qui habite là.',
    exploitableTitle: 'Comptoir planétaire ouvert',
    depletedTitle: 'Gisement vidé jusqu’au fond',

    archetypes: {
      boltz: {
        label: 'Boltz · Automates en bois de Turing',
        texts: [
          'Un atelier d’horlogers Boltz dérive sur orbite. Deux automates en chêne verni essaient de compter leurs boulons sans perdre le fil.',
          'Un contremaître à engrenages vous tend un panier de capsules : « Deux bons tirages pour un court-circuit, c’est la statistique réglementaire ! »',
          'Une forge orbitale abandonnée fume doucement. Un panneau indique : « En pause thé depuis 412 ans. Servez-vous. »',
          'Des tables de Boltzmann gravées au fer rouge promettent de la réserve pure — sauf si vous tombez sur la caisse de ressorts piégés.',
          'Un vieux cargo automatisé s’excuse platement de ses grincements et ouvre ses soutes aux pilotes courtois.',
          'Des cylindres scellés attendent d’être ouverts : carburant propre ou décharge taquine sur les fusibles.'
        ]
      },
      crewz: {
        label: 'Crewz · Jardins Électromag',
        texts: [
          'Un céphalopode Crewz flottant dans du thé au jasmin vous tend des algues qui réparent la coque à vue d’œil.',
          'Les racines électriques d’une cosmoplante enlacent une gemme d’hyper-propulsion comme un chat autour d’un radiateur.',
          'Une serre en verre soufflé bourdonne de spores conductrices : l’extraction est douce, sauf quand une fougère éternue.',
          'Un équipage de jardiniers silencieux laisse sur place des caisses de vivres avec un petit mot : « Arrosez vos rêves. »',
          'Une oasis biologique suspendue dans le vide, intacte malgré les courants d’air de ForgotLands.',
          'Les bourgeons métalliques s’ouvrent au passage du scanner en libérant un fluide couleur menthe très énergétique.'
        ]
      },
      golem: {
        label: 'Golem · Strates Minérales',
        texts: [
          'Un Golem géologue taille patiemment des cubes de carburant comprimé en fredonnant une note si grave qu’elle fait vibrer votre tasse.',
          'Des sentinelles de basalte immobile veillent sur un dépôt d’hyper-noyaux cristallisés. Elles clignent des yeux une fois par décennie.',
          'La roche chante à basse fréquence ; creuser ses strates peut renforcer votre blindage ou chatouiller méchamment la peinture.',
          'Un comptoir taillé dans un seul bloc de granit conserve les réserves d’anciennes expéditions trop pressées.',
          'Des plaques tectoniques en lévitation laissent entrevoir un cœur bleu électrique parfaitement poli.',
          'Une carrière silencieuse où les cristaux se brisent parfois par pur sens du drame minéral.'
        ]
      }
    },

    // Ordre exact correspondant aux 9 cartes du paquet de loot (world.js)
    lootLabels: [
      'Capsule énergétique Boltz de première main',
      'Réserve thermique parfaitement huilée',
      'Bouture de blindage & cristal Crewz',
      'Cocon réparateur parfumé au jasmin',
      'Filon Golem généreux & plaques neuves',
      'Citerne orbitale intacte (avec mode d’emploi)',
      'Décharge parasite sur la cafetière de bord',
      'Poche corrosive à l’humour acide',
      'Siphon magnétique qui confond soute et aspirateur'
    ]
  },

  // --------------------------------------------------------------------------
  // 8. ANOMALIES & PARIS (CMJ : BLOCAGE / SURNATURE / DRAMABOSS)
  // --------------------------------------------------------------------------
  anomalies: {
    unvisitedKickerPrefix: 'Signal étrange · {zone}',
    unvisitedTitle: 'Anomalie non identifiée',
    unvisitedText: 'Des interférences louches tournent autour de ce secteur. Approchez ou sondez pour lire la proposition commerciale.',
    resolvedSuffix: ' (Affaire classée)',

    types: {
      blocage: {
        label: 'Blocage · Entraide presque sûre',
        titles: [
          'Embouteillage de Ronces',
          'Pluie de Boulons',
          'Courant d’Air Solaire',
          'Troupeau de Poussières',
          'Poche de Vide Poli',
          'Gravier Mouvant'
        ],
        texts: [
          'Des ronces minérales bouchent le carrefour. Un automate Boltz bloqué derrière vous propose un troc fiable à 95 % pour pousser ensemble.',
          'Une averse de vis en laiton tombe au ralenti. En serrant quelques écrous, l’échange est quasi garanti.',
          'Un courant magnétique pousse tout le monde de travers : profitez-en pour échanger votre surplus contre du solide.',
          'Des micro-bêtes de plasma tournent en rond comme des chiens perdus ; une petite offrande calme immédiatement leur sillage.',
          'Un puits de vide poli vous demande s’il peut emprunter un peu de réserve contre un autre type d’énergie.',
          'La grille tangue comme un ponton. Un pacte d’entraide à faible risque stabilise les deux coques.'
        ]
      },
      surnature: {
        label: 'SurNature · Oasis de passage',
        titles: [
          'Convoi de Boutres',
          'Cité Volante en Origami',
          'Abri Sous-Astéroïde',
          'Plante-Relais Crewz',
          'Réseau des Deux Balises',
          'Buvette Suspendue'
        ],
        texts: [
          'Un convoi de wagons cosmiques tire des bâches fluorescentes. Leur courtier tente un troc audacieux sur vos soutes.',
          'Une cité volante drapé de soie magnétique propose de beaux rendements — à condition de ne pas craindre les courants d’air.',
          'Un abri creusé dans un gros caillou accueille les voyageurs pour un investissement modérément hasardeux.',
          'Une grande plante Crewz distille des charges d’hyper-saut entre deux bâillements de feuilles.',
          'Un réseau de balises jumelles promet de jolis profits si la phase quantique ne change pas d’avis à la dernière seconde.',
          'Une plateforme suspendue sert du thé tiède et des paris à deux contre un.'
        ]
      },
      dramaboss: {
        label: 'DramaBoss · Poker Cosmique',
        titles: [
          'Le Courtier en Chapeau Melon',
          'La Turbine Affamée',
          'Le Masque de Quarantaine',
          'L’Accident Spontané Certifié',
          'L’Harmonie Étrange',
          'Le Juge Abstrait et Rationnel'
        ],
        texts: [
          'Un hologramme tiré à quatre épingles propose de vous « optimiser » : 38 % de chance de décrocher le jackpot, 62 % de lui payer son café.',
          'Un réacteur géant menace d’avaler le secteur si personne ne mise gros. Les gains potentiels sont vertigineux.',
          'Une silhouette mystérieuse vous invite à jouer vos réserves aux dés d’obsidienne. B.O.R.D. refuse de regarder.',
          'Une singularité clignote avec une étiquette « Garanti instable ». Risqué, mais le pactole fait rêver.',
          'Une étrange harmonie mathématique réclame un sacrifice immédiat contre une envolée spectaculaire.',
          '« Pour des circonstances abstraites, sages et rationnelles », un juge en granit lance la pièce à haut risque.'
        ]
      }
    }
  },

  // --------------------------------------------------------------------------
  // 9. ARTEFACTS COMMERCIAUX (6 FAMILLES MODULO)
  // --------------------------------------------------------------------------
  artefacts: [
    {
      mod: 6,
      names: [
        'Spore MycRob en bocal',
        'Module Vrac non trié',
        'Tournevis Monopode',
        'Fibre Lizn tricotée',
        'Sceau Crex légèrement collant',
        'Prisme Dizz qui louche'
      ],
      costRes: 'fuel',
      costAmt: 4,
      baseSell: 5
    },
    {
      mod: 5,
      names: [
        'Astrolabe Expérimental',
        'Thermos de Thé Crewz',
        'Bobine de Tension Douce',
        'Noyau de Résonance Tiède',
        'Aileron de Rechange Agi'
      ],
      costRes: 'fuel',
      costAmt: 10,
      baseSell: 12
    },
    {
      mod: 7,
      names: [
        'Carte Intérieure Pliée à l’Envers',
        'Boussole Naïve (indique le Nord moral)',
        'Formulaire 4/5-Bis Non Tamponné',
        'Écho d’Événement en Conserve',
        'Carte Postale d’Excuses Boltz',
        'Plan Prototype de Matelas Spatial',
        'Jeton de Courtoisie ONU'
      ],
      costRes: 'coque',
      costAmt: 3,
      baseSell: 4
    },
    {
      mod: 11,
      names: [
        'Caillou en Méditation C1',
        'Caillou Bilingue C2',
        'Fragment de Silence C3',
        'Éclat de Tampon C4',
        'Boulon Sentimental C5',
        'Poussière de Quarantaine C6',
        'Note de Bas de Page C7',
        'Échantillon de Brume C8',
        'Bouture de Rêve C9',
        'Récépissé de Départ C10',
        'Double du Double C11'
      ],
      costRes: 'scan',
      costAmt: 8,
      baseSell: 10
    },
    {
      mod: 13,
      names: [
        'Trophée du Premier Pas Q1',
        'Diplôme de Rebond Q2',
        'Médaille du Savant Distrait Q3',
        'Brevet de Poussée d’Étoile Q4',
        'Badge des Blobs Penseurs Q5',
        'Clé à Molette d’Honneur Q6',
        'Écharpe en Origami Q7',
        'Certificat de Non-Collision Q8',
        'Timbre du Dernier Pourcent Q9',
        'Billet Retour Foyer Q10',
        'Sourire de Golem (lourd) Q11',
        'Énigme de Multivac Q12',
        'Œuf de Phase de Poche Q13'
      ],
      costRes: 'hyper',
      costAmt: 2,
      baseSell: 3
    },
    {
      mod: 17,
      names: [
        'Anomalie E1 (ronronne)',
        'Anomalie E2 (sent la menthe)',
        'Anomalie E3 (retarde d’un siècle)',
        'Anomalie E4 (pèse moins que rien)',
        'Anomalie E5 (cligne parfois)',
        'Anomalie E6 (aime le jazz)',
        'Anomalie E7 (refuse la gravité)',
        'Anomalie E8 (compte à rebours)',
        'Anomalie E9 (imite B.O.R.D.)',
        'Anomalie E10 (brille le jeudi)',
        'Anomalie E11 (légèrement sarcastique)',
        'Anomalie E12 (en avance)',
        'Anomalie E13 (porte-bonheur)',
        'Anomalie E14 (tiède au toucher)',
        'Anomalie E15 (murmure des nombres)',
        'Anomalie E16 (pliable en quatre)',
        'Anomalie E17 (édition collector)'
      ],
      costRes: 'lum',
      costAmt: 1,
      baseSell: 2
    }
  ],

  // --------------------------------------------------------------------------
  // 10. CONVERSIONS DU RECYCLEUR T2s
  // --------------------------------------------------------------------------
  conversions: {
    t2s_fuel: { label: 'Synthétiser du Fuel', tag: '-4 T2s → +4 Fuel' },
    t2s_coque: { label: 'Souder la Coque', tag: '-10 T2s → +3 Coque' },
    t2s_scan: { label: 'Calibrer le Scan', tag: '-12 T2s → +6 Scan' },
    t2s_hyper: { label: 'Condenser 1 HyperJump', tag: '-18 T2s → +1 Hyper' }
  },

  // --------------------------------------------------------------------------
  // 11. MESSAGES DYNAMIQUES (B.O.R.D., RÉSULTATS, JOURNAL)
  // --------------------------------------------------------------------------
  messages: {
    compassNearest: 'Étoile #{num}',
    compassCenter: 'Centre (0, 0)',
    compassEmbassy: 'Ambassade #3030',
    coordsReadout: 'Pos ({x}, {y}) · Anneau {ring}',
    floatingGlitch: 'Coque 0 · Glitch !',
    noScanStar: 'Plus de Scan pour identifier à distance : approchez le Poule-IV.',
    noScanNode: 'Scan insuffisant : posez le vaisseau sur la case pour l’analyser (+2 Scan).',
    noFuel: 'Carburant à sec ! Glissez la carte pour rebondir avec la Coque, ou recyclez du T2s.',
    noHyper: 'Plus de charges HyperJump !',
    noHyperBeacon: 'Un saut balisé coûte 1 HyperJump.',
    noScanExploit: 'Scan insuffisant pour exploiter à distance : posez-vous sur la planète.',
    shieldBlockedLoot: 'Bouclier Lum activé ! L’incident (« {label} ») a glissé sur vos capteurs sans rien abîmer.',
    lootResult: '{label} : {parts}.',
    noAffordBet: 'Réserves insuffisantes pour engager cet accord.',
    noScanBet: 'Scan insuffisant à distance : posez-vous sur l’anomalie.',
    betWin: 'Accord réussi ({pct} %) ! Les soutes chantent.',
    betShielded: 'Tirage raté, mais votre Bouclier Lum a réglé la note à votre place !',
    betLose: 'Pari perdu ({pct} %) : la mise s’évapore dans les statistiques.',
    betSummary: 'Mise : {cost} → Gain : {reward} ({pct} %)',
    artAlreadyOwned: 'Vous transportez déjà « {name} » en soute.',
    cargoFull: 'Soute pleine (4 artefacts max). Revendez-en un plus loin pour faire de la place.',
    artCantAfford: 'Ressource insuffisante pour acquérir « {name} ».',
    artBought: '« {name} » sanglé en soute ! Éloignez-vous sans téléportation pour multiplier son prix.',
    artSold: '« {name} » vendu pour +{payout} {res} (×{mult}).',
    noScanPush: 'Il faut 1 Scan pour donner un coup de clé à une étoile.',
    starPushed: 'L’étoile #{num} a glissé jusqu’à l’indice #{id}.',
    noLumShield: 'Il faut 2 Lum pour activer le Bouclier.',
    emergencyOk: 'Collecte solaire d’urgence : +6 Fuel et +6 T2s grappillés sur les panneaux.',
    refillNeedStar: 'Placez votre vaisseau sur une étoile pour déclencher REFILL16.',
    refillNeedScan: 'REFILL16 coûte 12 Scan.',
    refillDone: 'Impulsion REFILL16 : {count} secteurs régénérés autour du Poule-IV.',
    emptySectorTitle: 'Secteur calme',
    emptyDriftTitle: 'En dérive libre',
    journalEmptyStars: 'Aucune étoile enregistrée pour le moment.',
    journalStarId: 'Indice spirale : #{id}',
    journalEmptyCargo: 'Soute vide. Achetez des artefacts sur les planètes ou étoiles dès Middle Dream, puis voyagez loin sans téléportation pour multiplier leur valeur.',
    journalCargoRow: 'Distance parcourue : {dist} cases · Revente estimée : +{pay} {res} (×{mult})',
    journalConvertTitle: 'Recycleur cinétique (T2s disponibles : {t2s})',
    journalConvertDesc: 'Chaque pas manuel génère du T2s. Convertissez-le à tout moment pour éviter toute panne sèche.',
    journalSystemTitle: 'Graine de l’univers : {seed}',
    journalSystemStats: 'Pas effectués : {steps} · Rebonds de coque : {bounces} · Sauts Hyper : {jumps} · Reseeds : {reseeds}'
  },

  // --------------------------------------------------------------------------
  // 12. FICHES D'INFO CLIQUABLES (AIDE CONTEXTUELLE)
  // --------------------------------------------------------------------------
  infos: {
    closeLabel: 'Fermer',
    quickActions: {
      openConvert: 'Ouvrir le Recycleur T2s',
      openJournal: 'Ouvrir le Journal',
      activateHyper: 'Activer la visée HyperJump'
    },
    resources: {
      fuel: {
        kicker: 'Ressource · Déplacement local',
        title: 'Fuel ({val}/{cap})',
        body: 'Le carburant de précision du Poule-IV. Chaque pas d’une case (flèches, ZQSD, croix directionnelle ou clic adjacent) consomme 1 Fuel et génère +1 T2s. Avancer au Fuel près d’un bord recentre doucement la caméra sans abîmer la coque.',
        tip: 'Pour en gagner : exploitez les planètes (Boltz, Crewz, Golem), tentez des accords sur les anomalies ou convertissez du T2s.'
      },
      coque: {
        kicker: 'Ressource · Rebond bord-de-cadre',
        title: 'Coque ({val}/{cap})',
        body: 'Le blindage élastique du vaisseau. Faites glisser l’espace avec la souris ou le doigt : dès que le Poule-IV touche le bord du cadre, il rebondit de plusieurs cases dans la nouvelle zone pour seulement 1 Coque (et scanne automatiquement l’arrivée).',
        tip: 'Si la Coque tombe à 0, toucher un bord déclenche un glitch qui ramène la caméra sur le vaisseau sans rien casser.'
      },
      scan: {
        kicker: 'Ressource · Capteurs & Analyse',
        title: 'Scan ({val}/{cap})',
        body: 'L’énergie de vos capteurs. Sonder un point à distance coûte 1 Scan — mais si vous posez le Poule-IV directement sur une planète ou anomalie inconnue, l’analyse sur place vous rapporte +2 Scan (et +1 Scan lors de l’exploitation).',
        tip: 'B.O.R.D. recommande de voyager jusqu’aux gisements plutôt que de tout scanner depuis votre fauteuil.'
      },
      hyper: {
        kicker: 'Ressource · Saut longue portée',
        title: 'HyperJump ({val}/{cap})',
        body: 'Propulsion subspatiale franchissant 14 à 19 cases d’un coup dans la direction choisie, sans consommer ni Fuel ni Coque. Également utilisé par les balises de téléportation longue distance (1 Hyper par saut balisé).',
        tip: 'Activez le mode visée avec le bouton HyperJump ou la touche H, puis cliquez dans la direction voulue.'
      },
      t2s: {
        kicker: 'Ressource · Crédit cinétique',
        title: 'T2s ({val}/{cap})',
        body: 'Chaque pas manuel au Fuel recharge +1 T2s dans vos condensateurs. C’est votre filet de sécurité permanent : le Recycleur T2s permet de transformer ce mouvement accumulé en Fuel, Coque, Scan ou même HyperJump.',
        tip: 'Conversions disponibles : -4 T2s → +4 Fuel · -10 T2s → +3 Coque · -12 T2s → +6 Scan · -18 T2s → +1 Hyper.'
      },
      lum: {
        kicker: 'Ressource · Lumière d’étoile',
        title: 'Lum ({val})',
        body: 'Chaque nouvelle étoile identifiée libère 1 éclat de Lum. Cette lumière pure sert à alimenter le Bouclier Lum (2 Lum) pour neutraliser le prochain mauvais tirage, ou à acheter certains artefacts rares.',
        tip: 'Votre stock actuel : {val} Lum (plafond {cap}).'
      }
    },
    zones: {
      cosm: {
        kicker: 'Secteur · Anneaux 0 à 14',
        title: 'Centre SpaceGate · Bureaucratie ONU',
        body: 'Le cœur symétrique de la spirale, géré par les Bureaucrathes de Myth17B. Ils ont placé les quatre cinquièmes extérieurs en quarantaine « le temps de vérifier un tampon ».',
        tip: 'Au point (0, 0) vous attendent le plein complet des réserves, les Boussoles et la première Balise.'
      },
      dream: {
        kicker: 'Secteur · Anneaux 15 à 42',
        title: 'Middle Dream · Jardins Crewz',
        body: 'Brumes lavande et serres magnétiques des céphalopodes Crewz. C’est ici que le commerce d’artefacts prend vie et où les balises stellaires deviennent plus faciles à repérer.',
        tip: 'Abritent l’étoile médiane #256 (l’Onubis) et la mystérieuse Ambassade #3030 (anneau 28).'
      },
      forgot: {
        kicker: 'Secteur · Anneaux 43 à 72',
        title: 'ForgotLands · Tempêtes PostSolar',
        body: 'Votre zone de départ : un désert d’ambre balayé par les vents solaires, peuplé d’automates en bois de Turing (Boltz), des Monopodes de #400 et des fugitifs de #500.',
        tip: 'Les étoiles y portent des numéros élevés : suivez les numéros décroissants pour plonger vers le Centre.'
      },
      out: {
        kicker: 'Secteur · Au-delà de l’anneau 72',
        title: 'Out Multivac · Mycélium ChampIA',
        body: 'La lisière hors-quarantaine où le champ d’IA fongique de Multivac calcule des phases expérimentales en silence.',
        tip: 'Territoire libre pour les explorateurs avertis : revenez vers l’intérieur grâce aux boussoles ou aux sauts.'
      }
    },
    shield: {
      kicker: 'Protection · Bouclier Lum',
      title: 'Bouclier anti-malus actif',
      body: 'Votre prochain incident (mauvais tirage sur une planète ou pari perdu sur une anomalie) sera entièrement absorbé sans aucune perte de ressources.',
      tip: 'Le bouclier se consomme automatiquement dès qu’il vous protège d’un revers.'
    },
    coords: {
      kicker: 'Télémétrie · Coordonnées spirale',
      title: 'Position ({x}, {y}) · Anneau {ring}',
      body: 'La grille est enroulée en spirale carrée depuis l’origine (0, 0) au centre. L’anneau correspond à votre distance maximale en X ou en Y par rapport au Centre.',
      tip: 'Repères des zones : 0–14 SpaceGate · 15–42 Middle Dream · 43–72 ForgotLands · >72 Out Multivac.'
    },
    cellId: {
      kicker: 'Cartographie · Indice de spirale',
      title: 'Case #{id}',
      body: 'Chaque case possède un numéro unique sur la spirale d’Ulam, en partant de #1 au Centre (0, 0). Cet indice détermine aussi quel artefact modulo (%5, %6, %7, %11, %13, %17) peut être acquis ici.',
      tip: 'Plus l’indice est petit, plus vous êtes proche du Centre (0, 0).'
    },
    compassGroup: {
      kicker: 'Navigation · Boussole orbitale',
      title: 'Aiguille dorée de guidage',
      body: 'Oriente la flèche dorée autour du Poule-IV vers une cible précise (0, #400, #500, #256 ou l’Ambassade #3030). L’affichage de la boussole est totalement gratuit.',
      tip: 'Cliquez sur une cible pour l’activer, ou sur ✕ pour masquer l’aiguille.'
    },
    goGroup: {
      kicker: 'Navigation · Sauts Balisés',
      title: 'Téléportation vers les balises',
      body: 'Projette instantanément le Poule-IV vers une balise majeure déjà débloquée (ou un point aléatoire avec Go·RND) pour 1 HyperJump.',
      tip: 'Équilibrage anti-abus : si vous vous téléportez avec des artefacts en soute, leur multiplicateur de distance est plafonné à ×1,2.'
    },
    whisper: {
      kicker: 'Journal de bord · Objectif actuel',
      title: 'Transmission de B.O.R.D.',
      body: '{whisper}',
      tip: 'Consultez l’onglet Récit du Journal dès qu’il est débloqué pour relire tous les chapitres découverts.'
    },
    brand: {
      kicker: 'Manuel du Poule-IV · B.O.R.D.',
      title: 'Systèmes embarqués connus',
      intro: 'Cliquez sur n’importe quelle jauge, coordonnée ou étiquette du jeu pour obtenir des détails contextuels.',
      tips: {
        fuel: '• Déplacement local : flèches, ZQSD, croix ou clic sur une case voisine (-1 Fuel).',
        scroll: '• Rebond de Coque : faites glisser la carte jusqu’à ce que le vaisseau touche le bord (-1 Coque).',
        scan: '• Analyse : cliquez sur une case visible pour sonder (-1 Scan) ou posez-vous dessus (+2 Scan).',
        hyper: '• HyperJump : touche H ou bouton dédié pour sauter de 14 à 19 cases (-1 Hyper).',
        t2s: '• Recycleur T2s : transformez vos pas accumulés en Fuel, Coque, Scan ou Hyper.',
        trade: '• Commerce : achetez des artefacts dès Middle Dream et revendez-les loin (jusqu’à ×3,5) sans vous téléporter.',
        pushStar: '• Poussée d’étoile : inspectez une étoile et utilisez « Pousser l’étoile » (-1 Scan) pour débloquer la suite.'
      }
    }
  }
};
