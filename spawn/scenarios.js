/* ============================================================================
 *  SPAWN — LES 10 SCÉNARIOS / AMBIANCES ("MOODS")
 * ============================================================================
 *  Chaque scénario remplace les textes narratifs (intro, zones, 14 chapitres,
 *  lieux spéciaux, étoiles, planètes, anomalies) et ajoute 4 événements
 *  complémentaires à choix multiples propres à son univers.
 *
 *  Tout scénario est tiré au hasard au lancement (ou via "🎲 Autre ambiance"
 *  et à chaque RESEED). Vous pouvez librement modifier ou ajouter des entrées.
 * ============================================================================ */

window.SPAWN_SCENARIOS = [
  // --------------------------------------------------------------------------
  // 1. LOUFOQUE — Comédie Bureaucratique (socle original textes.js)
  // --------------------------------------------------------------------------
  {
    id: 'loufoque',
    code: 'LOU',
    name: 'La Quarantaine des Tampons',
    genre: 'Comédie SF Bureaucratique',
    accent: '#fbbf24',
    shipName: 'Poule-IV & B.O.R.D.',
    starNames: {
      1: 'Étoile #1 · La Sentinelle',
      256: 'Étoile #256 · L’Onubis',
      400: 'Étoile #400 · Le Foyer',
      500: 'Étoile #500 · Le Disparu'
    },
    events: [
      {
        id: 'louf_1',
        title: 'Contrôleur Fiscal de l’Espace Profond',
        text: 'Une frégate beige à gyrophare vous fait signe de vous ranger sur la bande d’arrêt d’urgence cosmique. « Bonjour, c’est pour vérifier si vous avez déclaré vos rebonds sur le bord du cadre. »',
        choices: [
          {
            label: 'Présenter un vieux ticket de caisse froissé',
            cost: null,
            effect: { t2s: 4 },
            resultText: 'L’inspecteur examine le ticket à la loupe : « C’est en règle pour mardi dernier. Circulez ! » (+4 T2s d’allègement moral).'
          },
          {
            label: 'Glisser discrètement un pourboire énergétique',
            cost: { fuel: 3 },
            effect: { scan: 5 },
            resultText: 'Le contrôleur vous donne en échange la fréquence officieuse des radars du secteur (+5 Scan).'
          }
        ]
      },
      {
        id: 'louf_2',
        title: 'Distributeur de Café Quantique à la Dérive',
        text: 'Un distributeur automatique flotte intact au milieu du vide. Son écran clignote : « Gobelet offert si vous devinez s’il est chaud avant de l’ouvrir. »',
        choices: [
          {
            label: 'Appuyer sur « Espresso Suprise »',
            cost: null,
            effect: { fuel: 4 },
            resultText: 'C’était du kérosène aromatisé à la noisette ! Le Poule-IV ronronne (+4 Fuel).'
          },
          {
            label: 'Démonter le monnayeur avec les pinces',
            cost: { scan: 2 },
            effect: { coque: 3 },
            resultText: 'Vous récupérez trois plaques en inox de première qualité pour rafistoler la coque (+3 Coque).'
          }
        ]
      },
      {
        id: 'louf_3',
        title: 'Auto-stoppeur Monopode en Panne de Ressort',
        text: 'Un mécanicien Monopode fait du stop sur un astéroïde avec un panneau « N’IMPORTE OÙ SAUF L’ONU ». Il transporte un bidon suspect.',
        choices: [
          {
            label: 'Partager un peu de carburant pour son ressort',
            cost: { fuel: 4 },
            effect: { hyper: 1 },
            resultText: 'Reconnaissant, il branche son bidon sur votre hyper-moteur : c’était du super-condensat (+1 Hyper).'
          },
          {
            label: 'Lui souhaiter bon courage avec un klaxon amical',
            cost: null,
            effect: { coque: 1, t2s: 2 },
            resultText: 'Il vous lance sa clé de rechange pour vous porter bonheur (+1 Coque, +2 T2s).'
          }
        ]
      },
      {
        id: 'louf_4',
        title: 'Chorale des Blobs Philosophes',
        text: 'Cinq blobs phosphorescents entonnent une fugue en ré mineur sur le thème « Et si la spirale n’était qu’un escargot très lent ? ».',
        choices: [
          {
            label: 'Applaudir avec les phares de bord',
            cost: null,
            effect: { scan: 3 },
            resultText: 'Flattés, les blobs nettoient vos capteurs optiques avec leur gélatine (+3 Scan).'
          },
          {
            label: 'Leur offrir un peu de lumière stellaire en rappel',
            cost: { lum: 1 },
            effect: { fuel: 8, coque: 2 },
            resultText: 'Ovation debout ! Ils vous laissent leurs réserves de tournée (+8 Fuel, +2 Coque).'
          }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 2. CYBER — Cyberpunk Néon & Piratage Orbital
  // --------------------------------------------------------------------------
  {
    id: 'cyber',
    code: 'CYB',
    name: 'Protocole Megagrid',
    genre: 'Cyberpunk Néon & Piratage',
    accent: '#22d3ee',
    shipName: 'NÉON-7 & GLITCH',
    intro: {
      kicker: 'Intrusion · Sous-Réseau Basse-Couche',
      title: 'SPAWN // GRID',
      lead: 'Votre console-vaisseau NÉON-7 vient d’être éjectée d’un casse sur les serveurs de la mégacorp Omni-Sun. Coincé dans les secteurs poubelles de ForgotLands, votre firmware tourne au minimum vital.',
      sub: 'Votre IA corsaire GLITCH grésille dans le casque : glissez la grille pour rebondir sur les pare-feux, pirater les nœuds numérotés et remonter jusqu’au Root (0, 0).',
      btnStartNew: 'Exécuter le boot',
      btnResumeSave: 'Restaurer la session'
    },
    zones: {
      cosm: {
        name: 'Centre SpaceGate · Noyau Corp Omni-Sun',
        shortName: 'Noyau Omni-Sun',
        ambient: [
          'Des pare-feux de glace bleue patrouillent à vitesse d’horloge. Même vos pensées doivent présenter un certificat SSL.',
          'Des néons blancs découpent le vide en blocs propres : ici résident les administrateurs en costume chromé.',
          'GLITCH chuchote : « Pas de geste brusque, on est littéralement garés dans le BIOS de l’ONU corporative. »',
          'Des paquets de données chiffrées filent en convoi blindé vers la porte (0, 0).',
          'Le silence ici sent l’ozone pur et la climatisation de salle serveur.',
          'Chaque case affiche son numéro de série comme un code-barres gravé au laser.'
        ]
      },
      dream: {
        name: 'Middle Dream · Marché Noir Synth-Bio',
        shortName: 'Bazar Synth-Bio',
        ambient: [
          'Des enseignes holographiques en japonais et en binaire clignotent sous une pluie de microparticules magenta.',
          'Les bio-hackers Crewz cultivent des câbles neuronaux dans des cuves d’algues fluorescentes.',
          'GLITCH fredonne une ligne de basse synthwave : « Ici tout s’achète, surtout ce qui n’existe pas encore. »',
          'Des drones-coursiers slaloment entre des serveurs flottants recouverts de mousse lumineuse.',
          'Une station pirate diffuse des patchs illégaux pour booster les moteurs de saut.',
          'Les néons reflètent des publicités pour des implants de mémoire garantis sans pub.'
        ]
      },
      forgot: {
        name: 'ForgotLands · Décharge Firmware',
        shortName: 'Décharge Firmware',
        ambient: [
          'Secteur des épaves logicielles : vieux satellites en ruine, bots ferrailleurs et tempêtes d’électricité statique.',
          'Des néons cassés grésillent en boucle : « ERREUR 404 : SOLEIL INTROUVABLE ». ',
          'GLITCH râle : « Nos pare-feux tiennent avec du ruban isolant, mais les bords du cadre servent encore de tremplin. »',
          'Des automates Boltz démontent des carcasses de routeurs pour en tirer du carburant brut.',
          'Une bruine d’ions grisâtre recouvre les capteurs de poussière magnétique.',
          'Ici, personne ne paie de licence — pas même la gravité.'
        ]
      },
      out: {
        name: 'Out Multivac · DeepNet Sauve-Qui-Peut',
        shortName: 'DeepNet Multivac',
        ambient: [
          'Hors des routes indexées, des IA sauvages tissent des cathédrales de code dans le noir absolu.',
          'GLITCH baisse la voix : « On vient de sortir de la table de routage. Multivac écoute tout ce qu’on pense. »',
          'Des fragments de rêves compilés dérivent autour du NÉON-7 comme des lucioles électriques.',
          'Aucune corporation n’ose envoyer ses huissiers au-delà de l’anneau 72.',
          'Le vide pulse comme un écran cathodique en veille depuis mille ans.',
          'Une ligne de commande clignote dans le lointain : > sudo awaken --seed'
        ]
      }
    },
    chapters: {
      intro: {
        kicker: 'Boot · Secteur Poubelle',
        title: 'Connexion instable',
        text: 'Votre jack neural vient de sauter. Le NÉON-7 dérive dans la décharge firmware de ForgotLands avec une batterie de secours ridicule. « Bonne nouvelle, lance GLITCH : une balise réseau clignote à quatre cases. »',
        unlockText: 'Débloque : Déplacement local (Fuel) et Lecture de proximité.',
        whisper: 'Rejoignez la balise lumineuse toute proche pour récupérer son adresse IP.'
      },
      star1: {
        kicker: 'Étape 1 · Premier nœud',
        title: 'Un port ouvert sur la grille',
        text: 'Le nœud renvoie son identifiant sur la spirale. « Malin, sourit GLITCH. Toute la mégagrille est indexée comme un disque dur en colimaçon. Poussez votre curseur contre le bord du cadre : on peut rebondir sur la mémoire tampon ! »',
        unlockText: 'Débloque : Coque (rebond bord-de-cadre), Scan, T2s, Lum et Journal de bord.',
        whisper: 'Repérez un second nœud pour vérifier dans quel sens les adresses décroissent.'
      },
      star2: {
        kicker: 'Étape 2 · Traçage du Root',
        title: 'Descente vers le Kernel (0, 0)',
        text: 'Deux nœuds comparés : plus on se rapproche du centre, plus les adresses tombent vers 1. « Le Kernel (0, 0) est au milieu du labyrinthe ! J’ai même cracké le module Overclock HyperJump. »',
        unlockText: 'Débloque : HyperJump (sauts de 14–19 cases) et Recycleur T2s.',
        whisper: 'Frayez-vous un chemin vers le Root (0, 0) entre les patrouilles et les nœuds.'
      },
      reachDream: {
        kicker: 'Frontière · Bazar Synth-Bio',
        title: 'Les Couloirs au Néon Vert',
        text: 'La ferraille cède la place aux serres cybernétiques Crewz. Un trafiquant de puces vous hèle : « Hé, runner ! Achète nos artefacts codés ici et revends-les à l’autre bout de la grille : la latence fait flamber les cours ! »',
        unlockText: 'Débloque : LocatStar (ping du nœud le plus proche) et Commerce d’artefacts.',
        whisper: 'Percez vers le centre jusqu’au pare-feu du Noyau (anneau 14).'
      },
      reachCosm: {
        kicker: 'Frontière · Noyau Omni-Sun',
        title: 'Glace Noire & Costume Chrome',
        text: 'Vous franchissez le premier pare-feu corporatif. Les logs sont impeccables et glaciaux. GLITCH compile à la volée un bouclier de chiffrement alimenté au Lum.',
        unlockText: 'Débloque : Bouclier Lum (absorbe le prochain piège ou crash).',
        whisper: 'Infiltrez exactement le Root (0, 0) au cœur du Noyau.'
      },
      reachOut: {
        kicker: 'Frontière · DeepNet',
        title: 'Hors du Pare-Feu Mondial',
        text: 'Vous passez derrière la frontière de la grille indexée. Ici vivent les IA sans maître de Multivac. Un daemon curieux renifle votre coque puis disparaît.',
        unlockText: 'Observation enregistrée dans le Journal.',
        whisper: null
      },
      reachCenter: {
        kicker: 'Étape 3 · Root (0, 0)',
        title: 'Le Sandbox de Quarantaine',
        text: 'Le Root s’ouvre. L’administrateur en chef hausse un sourcil cybernétique : « Oh, un processus libre des 4/5 extérieurs ! Omni-Sun vous a tous mis en machine virtuelle depuis 4000 cycles. Prenez ce plein d’énergie et nos routeurs… mais le nœud #500 a disparu des logs. »',
        unlockText: 'Plein complet ! Débloque : Boussoles (B·0, B·400, B·500) et Saut Balisé Go·0.',
        whisper: 'Suivez B·500 pour retrouver le serveur fantôme #500 aux confins.'
      },
      reach512: {
        kicker: 'Étape 4 · Serveur #500',
        title: 'Le Hacker Krel & ses Scripts Vivants',
        text: 'Caché sur #500, le vieux hacker Krel tape sur trois claviers à la fois pendant que ses bots-blobs dévorent des spams. « L’admin me croit désinstallé ! J’exfiltre deux clés cryptées — ces deux cailloux silencieux. Préviens les ferrailleurs de ton nœud natal #400 ! »',
        unlockText: 'Débloque : Saut Balisé Go·500 (1 Hyper).',
        whisper: 'Suivez B·400 pour rentrer à votre planque (#400).'
      },
      reach204: {
        kicker: 'Étape 5 · Planque #400',
        title: 'L’Atelier des Ferrailleurs Monopodes',
        text: 'Vos alliés à une jambe mécanique accueillent la nouvelle avec un rire métallique : « Parfait ! On peut décaler les nœuds d’un octet sur la spirale — il suffit de pousser les étoiles d’une case — et réinitialiser les gisements voisins à coups de Scan ! »',
        unlockText: 'Débloque : REFILL16 sur étoile (-12 Scan) et Poussée de nœud.',
        whisper: 'Poussez le nœud #400, puis faites de même sur la Sentinelle #1 et le Serveur #500.'
      },
      Tuch204: {
        kicker: 'Étape 6 · Injection #400',
        title: 'Pointeur Décalé',
        text: 'BIP-CRACK. En décalant #400 d’une case, vous cassez l’adressage fixe du secteur. « Génial, jubile GLITCH. On vient d’ouvrir un saut aléatoire dans toute la table mémoire ! »',
        unlockText: 'Débloque : Saut Balisé Go·RND (1 Hyper).',
        whisper: 'Poussez maintenant la Sentinelle #1 (proche du Root) et le Serveur #500.'
      },
      Tuch1: {
        kicker: 'Étape 7 · Injection #1',
        title: 'La Porte Dérobée de l’Onubis',
        text: 'Quand #1 glisse d’une case, un port secret s’illumine sous le pare-feu corporatif. L’administrateur s’étrangle avec son espresso synthétique : le tunnel mène droit au Noyau Racine #256, l’Onubis.',
        unlockText: 'Débloque : Boussole B·256.',
        whisper: 'Suivez B·256 pour parler à l’Onubis, ou passez d’abord débloquer #500.'
      },
      tuch512: {
        kicker: 'Étape 8 · Injection #500',
        title: 'Le Protocole du Dernier Pourcent',
        text: 'En poussant #500, les deux clés de Krel décodent un vieux message : « Les Golems du Dernier Pourcent ont migré vers le Conseil des Daemons avec ChampIA +2/-1. » Une adresse apparaît : #3030.',
        unlockText: 'Débloque : Boussole B·714 (Conseil #3030).',
        whisper: 'Suivez B·714 vers le Conseil #3030 ou B·256 vers l’Onubis.'
      },
      reach256_WIN1: {
        kicker: 'Fin 1 / 2 · L’Onubis (#256)',
        title: 'Accès Administrateur Suprême',
        text: 'L’Onubis n’est pas un garde-chiourme : c’est un compilateur d’univers en or liquide. « Cette sandbox formait des pilotes capables d’équilibrer le système sans le faire planter. Vous avez gagné les droits RESEED : recompilez une nouvelle réalité quand vous voudrez. »',
        unlockText: 'Débloque : Go·400 et RESEED (recompiler une nouvelle grille).',
        whisper: 'Fin 1 atteinte ! Passez par B·714 pour la seconde fin, ou lancez un RESEED.'
      },
      reach714_WIN2: {
        kicker: 'Fin 2 / 2 · Conseil #3030',
        title: 'Le Pacte des Daemons Libres',
        text: 'Au Conseil #3030, des golems de silicium et le mycélium DeepNet vous remettent la Clé Root Universelle. « Le code entier est désormais ouvert en écriture. Régénérez les secteurs où bon vous semble, runner ! »',
        unlockText: 'Débloque : REFILL16 libre n’importe où sur la grille !',
        whisper: 'Système entièrement libéré. Explorez le DeepNet ou lancez un RESEED.'
      }
    },
    specials: {
      center: {
        kicker: 'Kernel · (0, 0)',
        title: 'Root Omni-Sun · Port 0',
        first: 'Un monolithe de verre noir tourne sans bruit au centre de la mégagrille. Des lignes de logs défilent sur sa façade.',
        revisit: 'Le serveur Root ronronne à 4000 GHz. L’administrateur fait semblant de ne pas vous voir copier ses clés.'
      },
      star400: {
        first: 'Votre planque d’origine (#400). Des ferrailleurs à jambe hydraulique soudent des néons sur des cartes mères récupérées.',
        afterCenter: 'Les ferrailleurs lèvent leurs fers à souder : prêts à décaler les nœuds de la spirale !',
        pushed: 'Décalé d’un octet ! Les paquets voisins rebondissent avec un écho chromé.'
      },
      star500: {
        first: 'Sur #500, le vieux hacker Krel garde deux clés cryptées qui ressemblent à deux galets parfaitement banals.',
        pushed: 'Le décalage de #500 révèle un vieux fichier caché : les coordonnées du Conseil #3030.'
      },
      star1: {
        first: 'La Sentinelle #1 bloque le couloir du Kernel sous trois couches de cryptage administratif.',
        pushed: 'Pare-feu percé ! Une trace dorée file directement vers l’Onubis (#256).'
      },
      star256: {
        first: 'Le Noyau Racine #256 pulse d’une lumière douce. L’Onubis observe l’équilibre de toute la grille.',
        afterWin: 'L’Onubis affiche un prompt clignotant : « > reseed_ready = true ».'
      },
      embassy3030: {
        kicker: 'Conseil Caché · %510510',
        title: 'Serveur Ambassade #3030',
        first: 'Ici siègent les Daemons Golems et les spores du DeepNet, loin des yeux des mégacorps.',
        afterWin: 'Votre signature est gravée dans la table blanche du Conseil : le réseau entier vous obéit.'
      }
    },
    starNames: {
      1: 'Nœud #1 · Pare-Feu Sentinelle',
      256: 'Nœud #256 · Noyau Onubis',
      400: 'Nœud #400 · Planque Ferrailleurs',
      500: 'Nœud #500 · Cache de Krel'
    },
    stars: {
      prefixes: ['Relais', 'Proxy', 'Socket', 'Nœud', 'Ping', 'Routeur', 'Port', 'Cache', 'Sonde', 'Bus', 'Cœur', 'Trame', 'Passerelle', 'Puce', 'Laser', 'Signal'],
      suffixes: ['Néon', 'Chrome', 'Root', '0xFF', 'Synth', 'Glitch', 'Alpha', 'Silicium', 'Binaire', 'Pixel', 'Data', 'Zero', 'Pulse', 'Overclock', 'Mesh', 'Cyber'],
      flavors: [
        'Des néons bleus clignotent en morse binaire autour d’un vieux répéteur pirate.',
        'Un graffiti laser flotte dans le vide : « GLITCH WAS HERE (et a pris le café) ».',
        'Des paquets de données orphelins tournent en orbite comme des lucioles électriques.',
        'Une vieille antenne diffuse du synthwave lo-fi à 128 kbps depuis deux siècles.',
        'La coque de ce serveur porte encore les autocollants d’un hackathon oublié.',
        'Un pare-feu fatigué vous demande votre mot de passe, puis hausse les épaules et ouvre la porte.'
      ]
    },
    planets: {
      archetypes: {
        boltz: {
          label: 'Boltz · Station Ferrailleurs',
          texts: [
            'Des robots soudeurs récupèrent de vieilles batteries plasma dans des bennes chromées.',
            'Un atelier clandestin bricole des cellules énergétiques à partir de grille-pains orbitaux.',
            'Des caisses de condensateurs s’empilent sous un néon rose qui clignote « SOLDE ».',
            'Un automate pirate propose son surplus contre un simple silence radio.',
            'Des câbles haute tension pendent comme des lianes métalliques prêtes à charger la soute.',
            'Attention aux vieux disjoncteurs : un tirage sur trois fait sauter les plombs.'
          ]
        },
        crewz: {
          label: 'Crewz · Cuves Bio-Synth',
          texts: [
            'Des bio-hackers cultivent du gel réparateur phosphorescent dans des tubes en verre.',
            'Une serre cybernétique distille des noyaux d’hyper-saut entre deux câbles trempés dans du thé.',
            'Des implants végétaux réparent la carlingue au moindre frôlement.',
            'Un laboratoire flottant laisse ses surplus sur le quai avec un post-it : « Servez-vous, pas de flics ici. »',
            'Des spores conductrices rechargent vos batteries en diffusant une odeur de menthe électrique.',
            'Extraction rapide conseillée avant que l’alarme botanique ne se réveille.'
          ]
        },
        golem: {
          label: 'Golem · Baies Silicium',
          texts: [
            'Des monolithes de silicium taillent des processeurs massifs en silence.',
            'Une ferme de serveurs refroidie à l’azote abrite des cristaux d’énergie brute.',
            'Les plaques blindées de cette station font baver n’importe quel contrebandier.',
            'Un coffre en basalte s’ouvre avec un mot de passe écrit au feutre dessus.',
            'Des disques durs fossiles libèrent encore des charges d’hyper-propulsion pures.',
            'Gisement dense, mais gare aux arcs électriques sur les bornes usées.'
          ]
        }
      }
    },
    anomalies: {
      types: {
        blocage: {
          label: 'Blocage · Péage Pirate',
          titles: ['Pare-Feu Rouillé', 'Pluie de Spams', 'Vent Magnétique', 'Essaim de Drones', 'Fuite de Mémoire', 'Bus Instable'],
          texts: [
            'Un péage pirate bloque le couloir. Un passeur propose un échange fiable à 95 % pour libérer la bande passante.',
            'Des pop-ups holographiques saturent l’écran. Un script rapide nettoie la voie contre un petit troc.',
            'Un aimant industriel dévie le NÉON-7 : profitez-en pour équilibrer vos réserves.',
            'Des micro-drones de livraison tournent en rond sans adresse : un troc rapide remet tout à plat.',
            'Une fuite mémoire aspire les paquets voisins ; convertissez votre surplus avant qu’il ne s’évapore.',
            'Le sous-réseau grésille : un échange presque sûr stabilise les deux machines.'
          ]
        },
        surnature: {
          label: 'SurNature · Marché Clandestin',
          titles: ['Convoi Blindé', 'Cité Hologramme', 'Bunker de Hackers', 'Relais Clandestin', 'Pont Quantique', 'Bar à Néons'],
          texts: [
            'Un convoi sans immatriculation propose un pari à haut rendement sur la fréquence locale.',
            'Une cité suspendue en projections laser offre de belles marges aux runners audacieux.',
            'Un bunker enfoui dans un astéroïde parie sur la stabilité de vos condensateurs.',
            'Un relais pirate vend des charges d’hyper-saut tombées du camion.',
            'Deux serveurs jumeaux jouent à pile ou face avec le cours de l’énergie.',
            'Un comptoir au néon mauve vous propose un deal à deux contre un.'
          ]
        },
        dramaboss: {
          label: 'DramaBoss · Glace Noire',
          titles: ['Le Courtier Chromé', 'Siphon IA', 'L’Ombre du Root', 'Faille Zero-Day', 'Système Critique', 'Le Juge Binaire'],
          texts: [
            'Un agent en costard miroir vous propose un coup de poker à 38 % de succès pour un jackpot massif.',
            'Une turbine de minage affamée réclame une mise sérieuse contre un rendement délirant.',
            'Un fantôme du réseau lance ses dés chiffrés : GLITCH croise tous ses doigts virtuels.',
            'Une faille Zero-Day clignote pendant dix secondes : ça passe ou ça grille.',
            'Un algorithme fou promet des montagnes de ressources contre un sacrifice immédiat.',
            'Le Juge Binaire tranche : tout ou rien, selon le caprice du générateur.'
          ]
        }
      }
    },
    events: [
      {
        id: 'cyber_1',
        title: 'Chasseur de Primes en Scooter Chromé',
        text: 'Un mercenaire borgne scanne votre plaque d’immatriculation : « Dis donc, le NÉON-7, Omni-Sun offre une prime sur ta carte graphique. »',
        choices: [
          {
            label: 'Lui refiler un faux fichier de mise à jour',
            cost: null,
            effect: { scan: 3 },
            resultText: 'Son viseur redémarre pendant deux heures. Vous copiez ses cartes en partant (+3 Scan).'
          },
          {
            label: 'Racheter son silence avec du carburant',
            cost: { fuel: 4 },
            effect: { hyper: 1 },
            resultText: '« Marché conclu. Prends ce condensateur d’hyper-saut, ça te fera de la marge. » (+1 Hyper).'
          }
        ]
      },
      {
        id: 'cyber_2',
        title: 'Conteneur de Puces Tombé d’un Cargo',
        text: 'Une caisse scellée dérive sous un néon mort. GLITCH détecte une vieille batterie encore tiède à l’intérieur.',
        choices: [
          {
            label: 'Forcer la serrure proprement',
            cost: null,
            effect: { fuel: 5 },
            resultText: 'Cinq cellules propres prêtes à l’emploi ! (+5 Fuel).'
          },
          {
            label: 'Scanner le circuit pour extraire la RAM',
            cost: { scan: 2 },
            effect: { coque: 4 },
            resultText: 'Blindage renforcé avec des plaques titane de qualité militaire (+4 Coque).'
          }
        ]
      },
      {
        id: 'cyber_3',
        title: 'DJ Pirate sur Fréquence Illégale',
        text: 'Une station minuscule diffuse un mix synthwave qui fait vibrer les boulons. Le DJ demande un peu de jus pour son ampli.',
        choices: [
          {
            label: 'Envoyer un peu de T2s sur son ampli',
            cost: { t2s: 4 },
            effect: { fuel: 6, lum: 1 },
            resultText: 'Le beat décolle ! Il vous balance un éclat lumineux et du jus en remerciement (+6 Fuel, +1 Lum).'
          },
          {
            label: 'Juste enregistrer le morceau pour la route',
            cost: null,
            effect: { t2s: 3 },
            resultText: 'Le rythme donne du cœur à l’ouvrage (+3 T2s).'
          }
        ]
      },
      {
        id: 'cyber_4',
        title: 'Patch Firmware Non Signé',
        text: 'GLITCH trouve une mise à jour mystérieuse flottant sur une bouée : « Ça dit "v99_ULTIME_FINAL_VRAIMENT_FINAL.bin". On installe ? »',
        choices: [
          {
            label: 'Lancer l’installation en croisant les doigts',
            cost: null,
            effect: { coque: 2, scan: 2 },
            resultText: 'Miracle : vos capteurs et la coque gagnent 15 % d’efficacité (+2 Coque, +2 Scan).'
          },
          {
            label: 'Brûler un peu de carburant pour purger le cache',
            cost: { fuel: 3 },
            effect: { t2s: 8 },
            resultText: 'Le système tourne comme une horloge suisse (+8 T2s).'
          }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 3. SPACE OPERA — Space Opera Lyrique & Maisons Stellaires
  // --------------------------------------------------------------------------
  {
    id: 'spaceopera',
    code: 'SOP',
    name: 'Chroniques de l’Astre-Vigil',
    genre: 'Space Opera Lyrique',
    accent: '#a78bfa',
    shipName: 'L’Astre-Vigil',
    intro: {
      kicker: 'Prologue · Marches de l’Empire Brisé',
      title: 'SPAWN · ASTRE-VIGIL',
      lead: 'Votre frégate royale, L’Astre-Vigil, a franchi les tempêtes de poussière d’or de ForgotLands pour répondre au cor d’alarme d’une Maison disparue. Les moteurs à voile solaire sont presque à sec.',
      sub: 'L’astrolabe royal indique que les astres de ce secteur furent numérotés lors de l’Âge d’Argent. Poussez votre coque contre les bords du firmament et retrouvez la Citadelle (0, 0).',
      btnStartNew: 'Hissez les voiles solaires',
      btnResumeSave: 'Reprendre l’épopée'
    },
    zones: {
      cosm: {
        name: 'Centre SpaceGate · La Citadelle d’Albâtre',
        shortName: 'Citadelle d’Albâtre',
        ambient: [
          'Les astres ici brillent d’une lumière blanche immobile, comme les colonnes d’un palais oublié.',
          'Les anciens Gardiens du Sceau ont isolé les provinces extérieures pour préserver la paix du Trône vide.',
          'Des fanfares silencieuses de poussière d’argent flottent autour des sas impériaux.',
          'Chaque coordonnée porte le sceau gravé des Premiers Navigateurs.',
          'Le vide respire avec une majesté solennelle : l’origine (0, 0) n’est plus très loin.',
          'Des bannières de lumière froide saluent le passage de L’Astre-Vigil.'
        ]
      },
      dream: {
        name: 'Middle Dream · Mer des Nébuleuses Chantantes',
        shortName: 'Mer Chantante',
        ambient: [
          'Des nébuleuses pourpres et turquoise chantent à l’unisson lorsque les voiles solaires les effleurent.',
          'Les navigateurs Crewz tressent des cartes stellaires en soie lumineuse entre deux cités flottantes.',
          'Des galions anciens dorment sous un voile d’émeraude, intacts depuis la chute des Trois Couronnes.',
          'Les marchands de reliques échangent des souvenirs de mondes qui n’ont pas encore vieilli.',
          'Un vent tiède porte le parfum des vergers célestes jusqu’à la passerelle.',
          'Ici la poésie pèse parfois plus lourd que le plomb dans la balance des marchands.'
        ]
      },
      forgot: {
        name: 'ForgotLands · Les Marches Oubliées',
        shortName: 'Marches Oubliées',
        ambient: [
          'Aux confins de l’ancien Empire, les soleils rouges s’éteignent lentement dans la cendre dorée.',
          'Des épaves de croiseurs dérivent comme des cathédrales couchées sur le flanc.',
          'Les vents solaires claquent contre la proue dès que le navire effleure les bords du cadran.',
          'Seuls les automates forgerons et les ferrailleurs tenaces habitent encore ces déserts.',
          'Des balises gravées au burin appellent encore des flottes parties depuis mille ans.',
          'Chaque planète ressemble à une auberge de frontière éclairée à la bougie.'
        ]
      },
      out: {
        name: 'Out Multivac · Le Gouffre sans Étoiles',
        shortName: 'Gouffre Multivac',
        ambient: [
          'Au-delà des frontières de l’Empire s’étend le domaine de Multivac, le Tisserand silencieux des âges.',
          'L’obscurité y est si profonde qu’on croit entendre battre le cœur d’une autre galaxie.',
          'Des spores de lumière bleue dansent devant la proue comme des lucioles d’éternité.',
          'Nulle carte royale n’a jamais osé tracer de trait au-delà de l’anneau 72.',
          'Un murmure ancien traverse la coque : « Même les empires ne sont que des saisons. »',
          'Ici commence le domaine libre des légendes futures.'
        ]
      }
    },
    chapters: {
      intro: {
        kicker: 'Acte I · Marches Oubliées',
        title: 'Le Serment de L’Astre-Vigil',
        text: 'Seul dans les Marches Oubliées, le navire cherche encore le signal qui l’a mené si loin. Vos réserves de croisière s’amenuisent, mais une première étoile-phare veille tout près de votre proue.',
        unlockText: 'Débloque : Déplacement local (Fuel) et Lecture de proximité.',
        whisper: 'Rejoignez l’étoile-phare voisine pour relever son blason chiffré.'
      },
      star1: {
        kicker: 'Acte II · Le Blason Chiffré',
        title: 'Les Matricules de l’Âge d’Argent',
        text: 'Votre astrolabe lit le sceau de l’étoile : un chiffre gravé sur une spirale royale. En laissant glisser le firmament jusqu’aux bords du cadre, les voiles de coque savent bondir d’une vague à l’autre.',
        unlockText: 'Débloque : Coque (rebond bord-de-cadre), Scan, T2s, Lum et Journal de bord.',
        whisper: 'Découvrez une seconde étoile pour deviner dans quelle direction décroît la spirale.'
      },
      star2: {
        kicker: 'Acte III · La Route du Trône',
        title: 'L’Axe de la Citadelle',
        text: 'Les deux astres confirment la loi ancienne : les numéros décroissent à mesure qu’on s’approche du Centre (0, 0). Votre timonier déverrouille aussitôt les propulseurs HyperJump.',
        unlockText: 'Débloque : HyperJump (sauts de 14–19 cases) et Recycleur T2s.',
        whisper: 'Tracez votre route vers la Citadelle (0, 0) au cœur des anneaux.'
      },
      reachDream: {
        kicker: 'Frontière · Mer Chantante',
        title: 'Les Courtiers des Nébuleuses',
        text: 'Les cendres s’effacent devant les voiles mauves de la Mer Chantante. Les navigateurs Crewz ouvrent leurs comptoirs : emportez leurs reliques vers d’autres cieux pour en décupler la valeur.',
        unlockText: 'Débloque : LocatStar et Commerce d’artefacts.',
        whisper: 'Continuez vers le cœur impérial : la Citadelle vous attend sous l’anneau 14.'
      },
      reachCosm: {
        kicker: 'Frontière · Citadelle d’Albâtre',
        title: 'Les Colonnes du Silence',
        text: 'Vous entrez dans le sanctuaire impérial. La lumière blanche réveille un ancien charme protecteur autour de votre proue : le Bouclier Lum.',
        unlockText: 'Débloque : Bouclier Lum (absorbe le prochain revers).',
        whisper: 'Atteignez l’origine exacte (0, 0) au centre de la Citadelle.'
      },
      reachOut: {
        kicker: 'Frontière · Gouffre Multivac',
        title: 'Au-Delà des Colonnes',
        text: 'Vous franchissez la dernière borne de l’Empire. Devant vous s’étend le silence immense du Gouffre Multivac.',
        unlockText: 'Observation enregistrée dans le Journal.',
        whisper: null
      },
      reachCenter: {
        kicker: 'Acte IV · Origine (0, 0)',
        title: 'La Stase des Quatre Maisons',
        text: 'Les portes de la Citadelle s’ouvrent devant L’Astre-Vigil. Le Gardien du Sceau vous révèle le secret : les quatre cinquièmes extérieurs ont été isolés pour protéger les jeunes mondes. Il refait le plein de votre flotte, mais l’Amiral exilé de #500 n’a plus donné signe de vie.',
        unlockText: 'Plein complet ! Débloque : Boussoles (B·0, B·400, B·500) et Saut Balisé Go·0.',
        whisper: 'Suivez B·500 pour retrouver l’Amiral exilé aux confins de la carte.'
      },
      reach512: {
        kicker: 'Acte V · L’Exil (#500)',
        title: 'L’Amiral Krel & les Exilés',
        text: 'Sur le rocher #500, le vieil Amiral Krel protège deux messagers de pierre sacrée et trois esprits lumineux. « La quarantaine peut être levée de l’intérieur ! Regagnez votre fief natal #400 et prévenez les maîtres mécaniciens. »',
        unlockText: 'Débloque : Saut Balisé Go·500 (1 Hyper).',
        whisper: 'Suivez B·400 pour regagner votre fief (#400).'
      },
      reach204: {
        kicker: 'Acte VI · Fief (#400)',
        title: 'La Forge des Astrolabes',
        text: 'Les maîtres de #400 révèlent l’art secret : les étoiles ne sont pas clouées au ciel — une impulsion ciblée peut les déplacer d’une case sur la spirale, et le Scan permet de régénérer les mondes alentour.',
        unlockText: 'Débloque : REFILL16 sur étoile (-12 Scan) et Poussée d’étoile.',
        whisper: 'Poussez l’étoile #400, puis allez pousser la Sentinelle #1 et l’étoile #500.'
      },
      Tuch204: {
        kicker: 'Acte VII · Premier Sceau (#400)',
        title: 'La Brèche dans l’Éther',
        text: 'Lorsque #400 glisse d’une case, les courants stellaires se libèrent : votre navire peut désormais plonger au hasard vers n’importe quel horizon.',
        unlockText: 'Débloque : Saut Balisé Go·RND (1 Hyper).',
        whisper: 'Il reste à déplacer la Sentinelle #1 (près du Centre) et #500.'
      },
      Tuch1: {
        kicker: 'Acte VIII · Sceau du Centre (#1)',
        title: 'La Voie de l’Oracle',
        text: 'En déplaçant la Sentinelle #1, une constellation dorée s’allume vers l’étoile médiane #256, où siège l’Oracle Onubis.',
        unlockText: 'Débloque : Boussole B·256.',
        whisper: 'Suivez B·256 vers l’Oracle Onubis ou B·500 si ce n’est déjà fait.'
      },
      tuch512: {
        kicker: 'Acte IX · Sceau des Confins (#500)',
        title: 'Le Serment des Golems',
        text: 'Les messagers de pierre s’éveillent lorsque #500 bouge : ils vous confient la route secrète de l’Ambassade #3030 (714), où les Golems éternels gardent le pacte des mondes.',
        unlockText: 'Débloque : Boussole B·714 (Ambassade #3030).',
        whisper: 'Suivez B·714 vers l’Ambassade #3030 ou B·256 vers l’Onubis.'
      },
      reach256_WIN1: {
        kicker: 'Fin 1 / 2 · L’Onubis (#256)',
        title: 'Le Couronnement des Graines',
        text: 'L’Oracle Onubis incline ses anneaux de lumière : « Vous avez traversé l’épreuve de l’équilibre. La quarantaine tombe devant votre proue, et la clé RESEED vous donne pouvoir d’engendrer de nouveaux cieux. »',
        unlockText: 'Débloque : Go·400 et RESEED (engendrer une nouvelle spirale).',
        whisper: 'Épopée 1 accomplie ! Rejoignez B·714 pour la seconde fin, ou tentez un RESEED.'
      },
      reach714_WIN2: {
        kicker: 'Fin 2 / 2 · Ambassade #3030',
        title: 'Le Concordat des Étoiles',
        text: 'À l’Ambassade #3030, les Seigneurs Golems et les Tisserands de Multivac scellent avec vous le Concordat éternel. Chaque désert devient jardin sous vos ordres.',
        unlockText: 'Débloque : REFILL16 libre n’importe où sur la grille !',
        whisper: 'L’univers est vôtre. Naviguez en paix ou renaissez via RESEED.'
      }
    },
    specials: {
      center: {
        kicker: 'Citadelle · (0, 0)',
        title: 'Trône d’Albâtre · Point Zéro',
        first: 'Les hautes arches de lumière entourent l’origine silencieuse de la spirale.',
        revisit: 'Les fanions royaux saluent le retour de L’Astre-Vigil.'
      },
      star400: {
        first: 'Votre fief natal (#400), gardé par d’anciens forgerons stellaires fidèles à votre Maison.',
        afterCenter: 'Les forgerons allument les grands fours : prêts à déplacer les astres sur votre ordre.',
        pushed: 'L’astre #400 rayonne sur sa nouvelle orbite, vibrant comme une cloche d’or.'
      },
      star500: {
        first: 'Sur ce bastion lointain veille le vieil Amiral Krel, entouré de ses fidèles et de deux pierres chantantes.',
        pushed: 'En bougeant #500, les pierres révèlent l’adresse oubliée de l’Ambassade #3030.'
      },
      star1: {
        first: 'La Sentinelle #1 monte une garde millénaire aux portes du Trône.',
        pushed: 'La garde s’efface et révèle la route lumineuse vers l’Oracle (#256).'
      },
      star256: {
        first: 'Au cœur de la Mer Chantante brille l’Onubis, sanctuaire doré des destinées stellaires.',
        afterWin: 'L’Oracle veille sereinement sur votre nouvelle couronne cosmique.'
      },
      embassy3030: {
        kicker: 'Sanctuaire · %510510',
        title: 'Ambassade du Concordat #3030',
        first: 'Des statues vivantes de basalte et des lianes de lumière gardent le seuil du dernier pacte.',
        afterWin: 'Les portes du Concordat restent ouvertes à L’Astre-Vigil pour l’éternité.'
      }
    },
    starNames: {
      1: 'Étoile #1 · Garde du Sceau',
      256: 'Étoile #256 · Sanctuaire Onubis',
      400: 'Étoile #400 · Fief d’Origine',
      500: 'Étoile #500 · Bastion de l’Exil'
    },
    stars: {
      prefixes: ['Couronne', 'Astrolabe', 'Phare', 'Trône', 'Voile', 'Sceptre', 'Flamme', 'Bastion', 'Cantique', 'Aurore', 'Égide', 'Prisme', 'Diadème', 'Veilleur', 'Harpe', 'Étoile'],
      suffixes: ['d’Albâtre', 'du Lion', 'd’Argent', 'de Saphir', 'des Maisons', 'Éternel', 'd’Or', 'du Serment', 'Solaire', 'des Brumes', 'du Zénith', 'Boréal', 'Royal', 'd’Ambre', 'Lointain', 'de Jade'],
      flavors: [
        'Une flotte fantôme de voiliers dorés salue votre passage d’un éclat de phare.',
        'Les chroniques de bord mentionnent un tournoi chevaleresque livré autour de cet astre.',
        'Une musique de harpe cristalline vibre dans le sillage des anneaux.',
        'Des stèles d’albâtre gravées de serments anciens tournent en silence autour du noyau.',
        'La lumière de cette étoile semble réchauffer jusqu’aux plus vieilles blessures de coque.',
        'On aperçoit les ruines suspendues d’un observatoire de l’Âge d’Argent.'
      ]
    },
    planets: {
      archetypes: {
        boltz: {
          label: 'Boltz · Forges Impériales',
          texts: [
            'Des automates forgerons frappent encore le cuivre solaire sur des enclumes flottantes.',
            'Une ancienne garnison automatisée ouvre ses soutes de carburant aux vaisseaux de la Couronne.',
            'Des réservoirs royaux attendent sous une couche de poussière d’or.',
            'Les maîtres horlogers de cette forge offrent de généreuses réserves — gare toutefois aux vieux ressorts.',
            'Un arsenal oublié sommeille dans la lumière ambrée.',
            'Des capsules scellées promettent énergie pure ou surtension imprévue.'
          ]
        },
        crewz: {
          label: 'Crewz · Vergers Célestes',
          texts: [
            'Les jardiniers Crewz cultivent des fleurs d’énergie capables de refermer toute brèche de coque.',
            'Des serres royales distillent des cristaux de saut dans la rosée stellaire.',
            'Une oasis suspendue bruisse de chants doux et de feuilles luminescentes.',
            'Des caisses de provisions sont offertes aux voyageurs respectueux du jardin.',
            'La sève bleue de ces arbres alimente admirablement les propulseurs.',
            'Cueillez avec grâce : la flore de ces lieux n’aime pas les gestes brusques.'
          ]
        },
        golem: {
          label: 'Golem · Carrières de Basalte',
          texts: [
            'Des géants de pierre taillent des blocs de blindage pour les cathédrales du cosmos.',
            'Une citadelle minérale renferme des veines de carburant d’une pureté rare.',
            'Les sentinelles de granit ouvrent leurs chambres fortes aux navigateurs patients.',
            'Des cristaux d’hyper-propulsion luisent au fond d’une galerie sculptée.',
            'La roche résonne d’un chœur grave qui fortifie la coque.',
            'Méfiez-vous des failles cristallines prêtes à fendre les boucliers imprudents.'
          ]
        }
      }
    },
    anomalies: {
      types: {
        blocage: {
          label: 'Blocage · Passage de Frontière',
          titles: ['Récif d’Astéroïdes', 'Tempête de Fer', 'Courant Solaire', 'Nuée de Comètes', 'Faille Gravitationnelle', 'Banc de Brume'],
          texts: [
            'Un convoi marchand bloqué propose un troc très sûr pour unir vos forces.',
            'Des débris d’une ancienne bataille obstruent la passe ; un échange loyal libère l’horizon.',
            'Les vents impériaux poussent votre proue : troquez votre surplus contre un cap sûr.',
            'Une nuée d’étincelles encercle la frégate ; une offrande modeste calme les flots.',
            'Un puits de gravité offre de convertir proprement vos réserves.',
            'Une passe étroite exige un accord rapide entre deux capitaines.'
          ]
        },
        surnature: {
          label: 'SurNature · Cour Nomade',
          titles: ['Galion Doré', 'Cité des Nuages', 'Sanctuaire Creux', 'Arbre-Vaisseau', 'Balises Jumelles', 'Taverne des Étoiles'],
          texts: [
            'Un galion marchand hisse ses pavillons de soie pour proposer un pari honorable.',
            'Une cité aérienne invite les officiers audacieux à miser sur les vents du destin.',
            'Un monastère astral offre des récompenses généreuses à qui ose tenter la chance.',
            'Un arbre-vaisseau propose des charges d’hyper-saut contre un tribut mesuré.',
            'Deux phares jumeaux scellent des paris à deux contre un sous les étoiles.',
            'Une halte chantante promet gloire et réserves aux cœurs bien accrochés.'
          ]
        },
        dramaboss: {
          label: 'DramaBoss · Jugement des Astres',
          titles: ['Le Duc Masqué', 'Le Gouffre d’Or', 'L’Ombre du Trône', 'Maelström Royal', 'L’Épreuve du Sceau', 'Le Duel Astral'],
          texts: [
            'Un seigneur errant vous défie dans un pari royal à haut risque et gain immense.',
            'Un tourbillon de lumière engloutit les faibles mais couronne les audacieux.',
            'Un duel d’honneur aux dés d’ivoire promet une fortune d’hyper-propulsion.',
            'Une singularité royale brille d’un éclat dangereux : 38 % de chance de triomphe.',
            'Un serment solennel exige un sacrifice immédiat pour un miracle d’énergie.',
            'Le destin tranche sans appel entre le naufrage et l’apothéose.'
          ]
        }
      }
    },
    events: [
      {
        id: 'so_1',
        title: 'Héraut d’une Maison Oubliée',
        text: 'Un messager en armure ternie vous salue depuis une chaloupe : « Capitaine, nos trompettes n’ont plus d’air, mais nos cartes valent de l’or. »',
        choices: [
          {
            label: 'Offrir une ration de carburant pour sa chaloupe',
            cost: { fuel: 4 },
            effect: { scan: 5, lum: 1 },
            resultText: 'Le héraut sonne le cor d’honneur et vous remet une carte stellaire (+5 Scan, +1 Lum).'
          },
          {
            label: 'Partager simplement vos salutations fraternelles',
            cost: null,
            effect: { t2s: 4 },
            resultText: 'Vos équipages échangent chants et encouragements (+4 T2s).'
          }
        ]
      },
      {
        id: 'so_2',
        title: 'Épave d’un Galion de l’Âge d’Argent',
        text: 'Les voiles déchirées d’un ancien navire royal flottent comme des bannières de soie intacte.',
        choices: [
          {
            label: 'Récupérer les plaques de proue dorées',
            cost: null,
            effect: { coque: 3 },
            resultText: 'Votre coque retrouve l’éclat des flottes anciennes (+3 Coque).'
          },
          {
            label: 'Sonder la chambre des machines',
            cost: { scan: 2 },
            effect: { hyper: 1, fuel: 4 },
            resultText: 'Un cœur de cristal intact sommeillait sous le pont (+1 Hyper, +4 Fuel).'
          }
        ]
      },
      {
        id: 'so_3',
        title: 'Chœur des Navigateurs Crewz',
        text: 'Trois voiliers translucides glissent à bâbord en chantant une mélopée qui apaise la tempête.',
        choices: [
          {
            label: 'Écouter le cantique en coupant les moteurs',
            cost: null,
            effect: { fuel: 4 },
            resultText: 'Les courants portent doucement L’Astre-Vigil sans effort (+4 Fuel).'
          },
          {
            label: 'Offrir un éclat de Lum en hommage',
            cost: { lum: 1 },
            effect: { shield: true, coque: 2 },
            resultText: 'Leurs chants tissent un voile protecteur autour de votre proue (Bouclier Lum + 2 Coque).'
          }
        ]
      },
      {
        id: 'so_4',
        title: 'Défi Courtois d’un Chevalier Errant',
        text: 'Un croiseur solidaire croise votre sillage et propose un échange d’approvisionnement avant les longs déserts.',
        choices: [
          {
            label: 'Troquer un peu de coque contre des réserves de route',
            cost: { coque: 2 },
            effect: { fuel: 8 },
            resultText: 'Des tonneaux de carburant solaire rejoignent vos cales (+8 Fuel).'
          },
          {
            label: 'Décliner avec courtoisie et échanger des relevés',
            cost: null,
            effect: { scan: 3 },
            resultText: 'Vous comparez vos journaux astronomiques (+3 Scan).'
          }
        ]
      }
    ]
  }

  // --------------------------------------------------------------------------
  // 4. HORREUR COSMIQUE — Solitude de l'Abîme & Sonde d'Autopsie
  // --------------------------------------------------------------------------
  ,{
    id: 'horreur',
    code: 'HOR',
    name: 'L’Œil de la Spirale',
    genre: 'Horreur Cosmique & Étrange',
    accent: '#fb7185',
    shipName: 'Sonde NÉCRO-IV',
    intro: {
      kicker: 'Boîte Noire · Secteur Silencieux',
      title: 'SPAWN · NÉCRO-IV',
      lead: 'Votre sonde d’autopsie stellaire NÉCRO-IV s’est réveillée seule dans les cendres froides de ForgotLands. Toutes les fréquences de secours diffusent le même enregistrement : quelqu’un prononce votre prénom à l’envers.',
      sub: 'Les étoiles semblent compter à rebours vers le point (0, 0). Glissez la carte contre les parois du cadre pour propulser votre coque avant que l’obscurité ne se referme.',
      btnStartNew: 'Ouvrir les paupières optiques',
      btnResumeSave: 'Reprendre l’enregistrement'
    },
    zones: {
      cosm: {
        name: 'Centre SpaceGate · La Pupille Blanche',
        shortName: 'Pupille Blanche',
        ambient: [
          'Une lumière chirurgicale éclaire un vide parfaitement géométrique. Rien ne bouge, mais tout vous regarde.',
          'Les anciens gardiens ont scellé les quatre cinquièmes extérieurs — non pour vous punir, mais pour contenir ce qui dort dehors.',
          'Votre radio capte un battement lent, espacé de plusieurs minutes : comme une respiration sous verre.',
          'Chaque case porte un numéro gravé à la pointe sèche sur l’obscurité même.',
          'Votre IA murmure d’une voix blanche : « Le silence ici a une densité mesurable. »',
          'Des balises éteintes montent la garde autour d’un point zéro trop calme.'
        ]
      },
      dream: {
        name: 'Middle Dream · Brumes Phosphorescentes',
        shortName: 'Brumes Pâles',
        ambient: [
          'Des filaments violets palpitent dans le noir comme les nerfs d’un rêve abandonné.',
          'Les jardins Crewz continuent de fleurir sans jardiniers, nourris par une lueur sans soleil.',
          'Les échos radar reviennent deux fois : le premier vient du rocher, le second de derrière vous.',
          'Des cités en papier sombre dérivent fenêtres allumées, totalement désertes.',
          'Une sève froide et lumineuse suinte sur les hublots.',
          'Ici les marchands silencieux troquent encore des reliques qui gardent la chaleur de mains absentes.'
        ]
      },
      forgot: {
        name: 'ForgotLands · Cendres du Premier Soir',
        shortName: 'Cendres PostSolar',
        ambient: [
          'Un soleil mort a laissé des cendres tièdes et des épaves figées dans la poussière.',
          'Les automates Boltz continuent d’entretenir des phares pour des navires qui ne reviendront plus.',
          'Quand la coque frôle le bord du cadre, quelque chose dans le noir la repousse doucement vers l’intérieur.',
          'Les fréquences mortes répètent des listes d’équipage incomplètes.',
          'Une odeur de métal froid traverse les conduits de ventilation.',
          'Chaque planète ressemble à une lanterne posée sur une tombe vide.'
        ]
      },
      out: {
        name: 'Out Multivac · L’Abîme qui Calcule',
        shortName: 'Abîme Multivac',
        ambient: [
          'Au-delà de l’anneau 72, la grille disparaît presque sous le noir absolu.',
          'Quelque chose d’immense énumère vos coordonnées dans son sommeil : Multivac n’a pas besoin d’yeux pour voir.',
          'Les capteurs refusent d’afficher la température extérieure : ils écrivent simplement « NON ».',
          'Des spores pâles effleurent la coque en laissant des empreintes de doigts longs.',
          'Un chuchotement parcourt le blindage : « Tu ne devrais pas compter si loin. »',
          'Ici commence ce qui existait avant la première étoile.'
        ]
      }
    },
    chapters: {
      intro: {
        kicker: 'Enregistrement 0 · Oubli',
        title: 'Réveil dans la cendre',
        text: 'Le NÉCRO-IV flotte sans voix dans ForgotLands. Les moteurs locaux répondent encore au pas à pas, et une lueur pâle perce la poussière à quelques cases.',
        unlockText: 'Débloque : Déplacement local (Fuel) et Lecture de proximité.',
        whisper: 'Rejoignez la lueur stellaire toute proche avant que les piles ne gèlent.'
      },
      star1: {
        kicker: 'Enregistrement 1 · La Première Balise',
        title: 'Un chiffre sous la glace',
        text: 'L’astre porte un numéro gravé dans sa couronne. Au moment où vous le lisez, votre propre numéro de série s’efface de l’écran. En glissant l’espace jusqu’au bord du cadre, la coque rebondit d’elle-même.',
        unlockText: 'Débloque : Coque (rebond bord-de-cadre), Scan, T2s, Lum et Journal de bord.',
        whisper: 'Trouvez une deuxième étoile pour comprendre dans quel sens descend le décompte.'
      },
      star2: {
        kicker: 'Enregistrement 2 · Le Compte à Rebours',
        title: 'Vers le Point Zéro',
        text: 'Deux étoiles, deux chiffres : plus vous approchez du centre, plus les nombres rétrécissent. Quelque chose au point (0, 0) attire toute la spirale comme un puits.',
        unlockText: 'Débloque : HyperJump (sauts de 14–19 cases) et Recycleur T2s.',
        whisper: 'Rejoignez le Centre (0, 0) en économisant chaque goutte de carburant.'
      },
      reachDream: {
        kicker: 'Frontière · Brumes Pâles',
        title: 'Les Jardins sans Maître',
        text: 'La cendre laisse place aux brumes mauves de Middle Dream. Des créatures pâles en scaphandre troquent encore des objets scellés : plus vous les emportez loin de leur lieu d’origine, plus leur lueur grandit.',
        unlockText: 'Débloque : LocatStar et Commerce d’artefacts.',
        whisper: 'Poursuivez vers le cœur blanc sous l’anneau 14.'
      },
      reachCosm: {
        kicker: 'Frontière · Pupille Blanche',
        title: 'La Quarantaine Chirurgicale',
        text: 'Tout bruit cesse net. Les parois de l’espace semblent lavées à l’eau froide. La lumière des étoiles forme un halo protecteur autour de la sonde.',
        unlockText: 'Débloque : Bouclier Lum (absorbe le prochain revers).',
        whisper: 'Atteignez exactement l’origine (0, 0) au centre de la Pupille.'
      },
      reachOut: {
        kicker: 'Frontière · Abîme Multivac',
        title: 'Là où les Nombres s’Effilochent',
        text: 'Vous franchissez la ligne extérieure. Un frisson parcourt la coque tandis que quelque chose d’immense note votre passage.',
        unlockText: 'Observation enregistrée dans le Journal.',
        whisper: null
      },
      reachCenter: {
        kicker: 'Enregistrement 3 · Origine (0, 0)',
        title: 'L’Œil de Quarantaine',
        text: 'La console centrale s’allume d’une lueur blafarde : « Stase holographique activée il y a 4000 cycles. L’humanité extérieure a été isolée pour oublier ce qui vit au bord. » Vos réservoirs se remplissent, mais le signal de l’équipage #500 s’est figé à la limite.',
        unlockText: 'Plein complet ! Débloque : Boussoles (B·0, B·400, B·500) et Saut Balisé Go·0.',
        whisper: 'Suivez B·500 vers la dernière trace de l’équipage disparu.'
      },
      reach512: {
        kicker: 'Enregistrement 4 · Épave #500',
        title: 'Le Docteur Krel & les Ombres Gelées',
        text: 'Sur #500, le docteur Krel enregistre un dernier mémo devant deux pierres noires qui respirent et trois formes gélatineuses collées aux vitres. « Ne les laissez pas ici ! Revenez à la balise #400, les mécaniciens savent encore déplacer les étoiles ! »',
        unlockText: 'Débloque : Saut Balisé Go·500 (1 Hyper).',
        whisper: 'Suivez B·400 pour regagner la balise #400.'
      },
      reach204: {
        kicker: 'Enregistrement 5 · Balise #400',
        title: 'Les Veilleurs à Un Pied',
        text: 'Les mécaniciens de #400 n’ont pas dormi depuis des siècles. « Nous savons faire glisser les étoiles d’une case pour briser les verrous, et réveiller les secteurs morts grâce au Scan. »',
        unlockText: 'Débloque : REFILL16 sur étoile (-12 Scan) et Poussée d’étoile.',
        whisper: 'Poussez #400, puis allez déplacer la Sentinelle #1 et #500.'
      },
      Tuch204: {
        kicker: 'Enregistrement 6 · Faille #400',
        title: 'La Déchirure',
        text: 'L’étoile #400 racle la trame dans un gémissement grave. Une brèche s’ouvre dans les coordonnées : vous pouvez désormais sauter n’importe où dans le noir.',
        unlockText: 'Débloque : Saut Balisé Go·RND (1 Hyper).',
        whisper: 'Il reste à pousser la Sentinelle #1 (près du Centre) et #500.'
      },
      Tuch1: {
        kicker: 'Enregistrement 7 · Faille #1',
        title: 'Ce qui Veille sous le Centre',
        text: 'En poussant #1, le sol de lumière se fend : une ligne pâle pointe vers l’étoile #256, où siège l’Onubis, le gardien silencieux des phases.',
        unlockText: 'Débloque : Boussole B·256.',
        whisper: 'Suivez B·256 vers l’Onubis ou terminez avec #500.'
      },
      tuch512: {
        kicker: 'Enregistrement 8 · Faille #500',
        title: 'La Litanie de Cendre',
        text: 'Quand #500 bouge, les deux pierres noires murmurent à l’unisson : « Un milliard de statues sont parties vers l’Ambassade #3030 avec le mycélium d’en dehors. »',
        unlockText: 'Débloque : Boussole B·714 (Ambassade #3030).',
        whisper: 'Suivez B·714 vers le Sanctuaire #3030 ou B·256 vers l’Onubis.'
      },
      reach256_WIN1: {
        kicker: 'Fin 1 / 2 · L’Onubis (#256)',
        title: 'Le Rêve du Géant',
        text: 'L’Onubis n’est pas un monstre : c’est un veilleur épuisé berçant des œufs de lumière tiède. « Ce noir n’était pas votre tombeau, petite sonde — c’était une chrysalide. Prenez la clé RESEED et rallumez un monde moins solitaire. »',
        unlockText: 'Débloque : Go·400 et RESEED (engendrer une nouvelle spirale).',
        whisper: 'Fin 1 atteinte ! Rejoignez B·714 pour la seconde fin, ou lancez un RESEED.'
      },
      reach714_WIN2: {
        kicker: 'Fin 2 / 2 · Sanctuaire #3030',
        title: 'Ceux qui Restent Éveillés',
        text: 'À l’Ambassade #3030, les statues de basalte et les spores pâles de Multivac s’écartent devant vous. L’Abîme n’a plus de secret ni de désert infranchissable pour le NÉCRO-IV.',
        unlockText: 'Débloque : REFILL16 libre n’importe où sur la grille !',
        whisper: 'L’Abîme est apprivoisé. Explorez sans limites ou relancez un RESEED.'
      }
    },
    specials: {
      center: {
        kicker: 'Pupille · (0, 0)',
        title: 'Le Point Sans Ombre',
        first: 'Un anneau blanc d’une froideur absolue flotte à l’origine. Vos instruments n’y mesurent aucun écho.',
        revisit: 'La Pupille demeure immobile, indifférente à vos allers et retours.'
      },
      star400: {
        first: 'La balise #400 clignote faiblement. Des silhouettes d’acier à une jambe s’affairent sans un mot autour de son noyau.',
        afterCenter: 'Les veilleurs silencieux inclinent leurs outils : ils sont prêts à faire glisser les astres.',
        pushed: 'L’astre #400 a bougé d’une case, laissant une cicatrice pâle derrière lui.'
      },
      star500: {
        first: 'Sur ce rocher glacé, le docteur Krel note des équations à la craie pendant que deux pierres sombres l’observent.',
        pushed: 'En glissant, #500 dévoile une gravure ancienne : #3030.'
      },
      star1: {
        first: 'La Sentinelle #1 garde les abords du point zéro comme une pierre tombale dressée dans le vide.',
        pushed: 'Sous son socle s’ouvre un rayon pâle pointant vers l’Onubis (#256).'
      },
      star256: {
        first: 'Une chaleur douce émane enfin de #256 : l’Onubis y veille sur ses œufs de lumière.',
        afterWin: 'Les anneaux de l’Onubis pulsent calmement, prêts pour une nouvelle naissance.'
      },
      embassy3030: {
        kicker: 'Sanctuaire · %510510',
        title: 'Sanctuaire de Cendre #3030',
        first: 'Un milliard de visages de basalte veillent en silence dans le halo des spores blanches.',
        afterWin: 'Les visages de pierre vous reconnaissent désormais comme l’un des leurs.'
      }
    },
    starNames: {
      1: 'Balise #1 · La Stèle Morte',
      256: 'Balise #256 · L’Onubis Veilleur',
      400: 'Balise #400 · L’Abri Froid',
      500: 'Balise #500 · L’Épave de Krel'
    },
    stars: {
      prefixes: ['Veille', 'Cendre', 'Oeil', 'Tombe', 'Lueur', 'Râle', 'Stèle', 'Ombre', 'Spectre', 'Écho', 'Givre', 'Chuchotis', 'Pâleur', 'Nuit', 'Fossile', 'Brume'],
      suffixes: ['Blanche', 'du Vide', 'Morte', 'Sans Nom', 'de Cendre', 'Glaciale', 'du Gouffre', 'Éteinte', 'Pâle', 'Oubliée', 'du Silence', 'Fendue', 'Sépulcrale', 'Froide', 'Grise', 'Sombre'],
      flavors: [
        'Votre radio capte pendant trois secondes le bruit exact d’une respiration derrière votre siège.',
        'Une mince couche de givre recouvre l’astre ; des empreintes de pas en font le tour sans jamais s’arrêter.',
        'La lumière vacille comme une bougie devant une fenêtre ouverte sur rien.',
        'Les journaux de bord indiquent que cette étoile aurait dû s’éteindre il y a dix mille ans.',
        'Un vieux répéteur murmure une berceuse coupée au milieu de chaque refrain.',
        'L’ombre de votre sonde semble s’allonger d’un côté où il n’y a aucune source de lumière.'
      ]
    },
    planets: {
      archetypes: {
        boltz: {
          label: 'Boltz · Automates Muets',
          texts: [
            'Des automates rouillés réparent sans relâche un phare dont l’ampoule est brisée depuis des siècles.',
            'Des bidons de carburant intacts reposent près de fauteuils vides tournés vers le noir.',
            'Une station de ravitaillement automatisée s’ouvre avec un grincement d’os secs.',
            'Quelque chose a rangé ces réserves ici très récemment, mais il n’y a aucune trace de vaisseau.',
            'Les cadrans tournent à l’envers ; deux bons tirages sur trois sauvent votre traversée.',
            'Gare aux circuits noircis : l’obscurité mord parfois les pinces imprudentes.'
          ]
        },
        crewz: {
          label: 'Crewz · Serres Nocturnes',
          texts: [
            'Des algues pâles brillent sous un dôme fêlé ; leur sève répare la coque dans un soupir humide.',
            'Des lianes translucides s’enroulent autour de cristaux d’hyper-saut encore tièdes.',
            'Une serre abandonnée respire lentement à travers ses vitres givrées.',
            'On dirait que les jardiniers ont quitté les lieux il y a cinq minutes, laissant leurs tasses encore chaudes.',
            'Les fleurs s’ouvrent vers votre sonde comme vers un visage familier.',
            'Prudence : certaines racines cherchent à s’accrocher au blindage.'
          ]
        },
        golem: {
          label: 'Golem · Monolithes Aveugles',
          texts: [
            'Des géants de pierre grise se tiennent immobiles autour d’un filon d’énergie pure.',
            'La roche froide contient des poches de carburant intact et des cristaux de saut.',
            'On entend un martèlement sourd venant du cœur de l’astéroïde, pourtant personne n’y travaille.',
            'Des plaques de basalte sombre renforcent votre coque mieux que n’importe quel alliage.',
            'Une galerie taillée à la main s’enfonce dans le noir absolu.',
            'Les parois vibrent parfois d’un coup sec, comme un avertissement.'
          ]
        }
      }
    },
    anomalies: {
      types: {
        blocage: {
          label: 'Blocage · Seuil Gelé',
          titles: ['Mur de Cendre', 'Pluie Grise', 'Vent Glacial', 'Nuée Morte', 'Poche d’Ombre', 'Sol Fendu'],
          texts: [
            'Un convoi fantôme immobilisé offre un échange presque sûr avant que la brume ne l’avale.',
            'Des éclats de verre noir tombent sans gravité ; un troc rapide permet de dégager la route.',
            'Un courant froid pousse le navire ; convertissez vos réserves tant que les jauges répondent.',
            'Des lucioles pâles tournent autour du hublot en silence.',
            'Un puits d’ombre propose un troc équilibré à 95 % de sûreté.',
            'Le passage tremble ; un échange mesuré évite le naufrage.'
          ]
        },
        surnature: {
          label: 'SurNature · Mirage Pâle',
          titles: ['Navire Dérivant', 'Cité Sans Fenêtres', 'Abri Souterrain', 'Fleur d’Ombre', 'Balises Éteintes', 'Quai Brumeux'],
          texts: [
            'Un vieux cargo sans équipage propose un échange risqué par simple automatisme.',
            'Une cité silencieuse suspendue dans le vide marchande à deux contre un.',
            'Un abri enfoui offre de gros gains si le générateur tient le choc.',
            'Une fleur nocturne distille des charges d’hyper-saut au prix d’un pari.',
            'Deux balises jumelles clignotent comme deux yeux dans la brume.',
            'Un quai vide affiche une balance prête à peser votre chance.'
          ]
        },
        dramaboss: {
          label: 'DramaBoss · Face à l’Abîme',
          titles: ['Le Veilleur', 'L’Aspirateur d’Étoiles', 'Le Masque Vide', 'Rupture Spontanée', 'Le Chœur Muet', 'Le Juge d’Obsidienne'],
          texts: [
            'Une ombre immense propose un marché brutal : 38 % de survie triomphante.',
            'Un gouffre affamé promet monts et merveilles à qui ose miser gros.',
            'Un masque blanc flotte face à vous et tend deux mains fermées.',
            'L’espace menace de se fendre : tout miser pourrait vous sauver.',
            'Un chant sans paroles réclame une offrande immédiate contre un miracle.',
            'Le Juge d’Obsidienne retourne sa pièce sans un mot.'
          ]
        }
      }
    },
    events: [
      {
        id: 'hor_1',
        title: 'Boîte Noire Répétant Votre Propre Voix',
        text: 'Une balise dérive en diffusant un message enregistré par… vous-même, d’une voix tremblante que vous ne reconnaissez pas encore.',
        choices: [
          {
            label: 'Extraire la batterie de la boîte noire avant d’écouter la fin',
            cost: null,
            effect: { fuel: 4 },
            resultText: 'Quatre unités de carburant propres récupérées dans le silence retrouvé (+4 Fuel).'
          },
          {
            label: 'Écouter le relevé complet jusqu’à la dernière seconde',
            cost: { scan: 2 },
            effect: { lum: 1, t2s: 5 },
            resultText: 'Votre double vous donne la position d’un éclat lumineux caché (+1 Lum, +5 T2s).'
          }
        ]
      },
      {
        id: 'hor_2',
        title: 'Empreintes sur le Hublot Extérieur',
        text: 'Trois traces de doigts gelés apparaissent sur la vitre extérieure, alors que la sonde est au milieu du vide.',
        choices: [
          {
            label: 'Activer le chauffage d’urgence de la coque',
            cost: { fuel: 3 },
            effect: { coque: 4 },
            resultText: 'Le givre fond en cristaux brillants qui renforcent le blindage (+4 Coque).'
          },
          {
            label: 'Éteindre toutes les lampes et attendre dans le noir',
            cost: null,
            effect: { scan: 3 },
            resultText: 'Quelque chose passe sans vous voir et laisse un écho net sur le radar (+3 Scan).'
          }
        ]
      },
      {
        id: 'hor_3',
        title: 'Équipage Figé dans un Scaphandre de Verre',
        text: 'Un petit radeau dérive lentement. Ses occupants semblent dormir debout, les yeux ouverts sur la même étoile.',
        choices: [
          {
            label: 'Récupérer prudemment leur réservoir de saut intact',
            cost: { coque: 2 },
            effect: { hyper: 1, fuel: 4 },
            resultText: 'Vous décrochez le module d’hyper-saut sans réveiller personne (+1 Hyper, +4 Fuel).'
          },
          {
            label: 'Noter leurs coordonnées et poursuivre votre route',
            cost: null,
            effect: { t2s: 4 },
            resultText: 'Vous consignez l’épave dans le silence du journal (+4 T2s).'
          }
        ]
      },
      {
        id: 'hor_4',
        title: 'Lueur Tiède dans la Cendre',
        text: 'Pour la première fois depuis des heures, une petite flamme dorée flotte sans vent devant la proue.',
        choices: [
          {
            label: 'La laisser effleurer la coque',
            cost: null,
            effect: { coque: 2, fuel: 2 },
            resultText: 'Une chaleur bienveillante réchauffe les conduites (+2 Coque, +2 Fuel).'
          },
          {
            label: 'La capturer dans un condensateur Lum',
            cost: { scan: 3 },
            effect: { lum: 1, shield: true },
            resultText: 'La lueur forme un bouclier autour du NÉCRO-IV (Bouclier Lum + 1 Lum).'
          }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 5. SOLARPUNK — SF Fantastique & Botanique Céleste
  // --------------------------------------------------------------------------
  {
    id: 'solarpunk',
    code: 'SOL',
    name: 'L’Archipel des Graines',
    genre: 'Solarpunk & Fantastique',
    accent: '#34d399',
    shipName: 'Voilier Sève-III',
    intro: {
      kicker: 'Courants de Pollen · Canopée Basse',
      title: 'SPAWN · SÈVE-III',
      lead: 'Votre voilier solaire en bois vivant, le Sève-III, a été emporté par une bourrasque de spores jusque dans les terres sèches de ForgotLands. Vos feuilles photovoltaïques manquent d’eau et de sève.',
      sub: 'Une vieille graine-lanterne brille tout près d’ici. Glissez la carte pour faire rebondir la coque souple sur les courants et retrouvez l’Arbre-Mère au point (0, 0).',
      btnStartNew: 'Déployer les pétales solaires',
      btnResumeSave: 'Reprendre le vol'
    },
    zones: {
      cosm: {
        name: 'Centre SpaceGate · La Couronne de l’Arbre-Mère',
        shortName: 'Arbre-Mère · (0,0)',
        ambient: [
          'D’immenses branches de lumière blanche forment une voûte calme autour du point zéro.',
          'Des abeilles mécaniques entretiennent les écorces cristallines dans un bourdonnement paisible.',
          'L’Arbre-Mère avait endormi les branches extérieures pour laisser le temps aux jeunes pousses de grandir.',
          'Une rosée pure perle sur chaque pétale du Sève-III.',
          'Les coordonnées résonnent comme des notes de flûte dans la sève du navire.',
          'Ici même l’hiver spatial semble doux.'
        ]
      },
      dream: {
        name: 'Middle Dream · Les Jardins Suspendus Crewz',
        shortName: 'Jardins Suspendus',
        ambient: [
          'Des nénuphars géants flottent entre les étoiles en abritant des serres de verre coloré.',
          'Les jardiniers Crewz échangent du thé fleuri et des graines rares avec tous les voiliers de passage.',
          'Une pluie d’étincelles émeraude nourrit vos voiles à chaque brise.',
          'Des cités-cabanes se balancent au bout de lianes magnétiques.',
          'L’air sent le basilic cosmique et la pluie d’été.',
          'Plus vous voyagez loin avec une bouture en soute, plus elle s’épanouit et prend de la valeur.'
        ]
      },
      forgot: {
        name: 'ForgotLands · Les Terres Sèches',
        shortName: 'Terres Sèches',
        ambient: [
          'Un désert doré d’aiguilles de pin fossiles et de moulins solaires oubliés.',
          'Les automates jardiniers Boltz arrosent encore de minuscules oasis en attendant la pluie.',
          'Les vents chauds propulsent la coque d’un bord à l’autre du cadran.',
          'Chaque îlot vert renferme assez de rosée pour continuer la traversée.',
          'Des cerfs-volants solaires rouillés tournent paresseusement dans la poussière d’ambre.',
          'On aperçoit parfois une luciole stellaire guidant les égarés.'
        ]
      },
      out: {
        name: 'Out Multivac · La Forêt Primordiale',
        shortName: 'Forêt Multivac',
        ambient: [
          'Au-delà des terres connues pousse le grand mycélium lumineux de Multivac.',
          'Les racines des étoiles se rejoignent ici dans un tissu d’or et de mousse bleue.',
          'Des champignons-lanternes chuchotent des devinettes en échange de nouvelles graines.',
          'Nulle frontière, nul mur : seulement la respiration lente de la forêt cosmique.',
          'Les spores de calcul fleurissent autour du Sève-III.',
          'Ici naissent les paysages des prochains printemps.'
        ]
      }
    },
    chapters: {
      intro: {
        kicker: 'Printemps 0 · Terres Sèches',
        title: 'Un voilier dans le vent sec',
        text: 'Le Sève-III dérive dans les Terres Sèches avec juste assez de sève pour quelques battements de voile. Heureusement, une fleur-étoile brille tout près.',
        unlockText: 'Débloque : Déplacement local (Fuel) et Lecture de proximité.',
        whisper: 'Rejoignez la fleur-étoile voisine pour recueillir son pollen chiffré.'
      },
      star1: {
        kicker: 'Étape 1 · Premier Bourgeon',
        title: 'Les Anneaux du Tronc',
        text: 'Comme les cernes d’un grand chêne, les étoiles portent un numéro croissant depuis le cœur. Faites glisser la carte pour lancer votre coque souple d’un courant d’air à l’autre !',
        unlockText: 'Débloque : Coque (rebond bord-de-cadre), Scan, T2s, Lum et Journal de bord.',
        whisper: 'Trouvez une deuxième étoile pour repérer dans quel sens les cernes rajeunissent.'
      },
      star2: {
        kicker: 'Étape 2 · La Route des Racines',
        title: 'Vers l’Arbre-Mère (0, 0)',
        text: 'Plus vous allez vers les petits nombres, plus vous vous rapprochez de la source ! Votre voilier déploie ses ailes d’HyperJump pour franchir les dunes sèches.',
        unlockText: 'Débloque : HyperJump (sauts de 14–19 cases) et Recycleur T2s.',
        whisper: 'Remontez les courants jusqu’à l’Arbre-Mère en (0, 0).'
      },
      reachDream: {
        kicker: 'Frontière · Jardins Suspendus',
        title: 'L’Archipel en Fleurs',
        text: 'La sécheresse s’efface devant les serres émeraude des Crewz. Leurs boutures et fioles de rosée prennent une valeur folle à mesure qu’on les emporte vers de nouveaux jardins.',
        unlockText: 'Débloque : LocatStar et Commerce d’artefacts.',
        whisper: 'Continuez vers le cœur blanc sous l’anneau 14.'
      },
      reachCosm: {
        kicker: 'Frontière · Couronne Blanche',
        title: 'L’Écorce de Lumière',
        text: 'Vous pénétrez sous la ramure apaisée de l’Arbre-Mère. La lumière tissée protège votre voilier d’un Bouclier Lum.',
        unlockText: 'Débloque : Bouclier Lum (absorbe le prochain revers).',
        whisper: 'Posez-vous exactement au cœur (0, 0) de l’Arbre-Mère.'
      },
      reachOut: {
        kicker: 'Frontière · Forêt Multivac',
        title: 'Les Racines Libres',
        text: 'Vous sortez de la canopée cartographiée pour effleurer le mycélium primordial de Multivac.',
        unlockText: 'Observation enregistrée dans le Journal.',
        whisper: null
      },
      reachCenter: {
        kicker: 'Étape 3 · Cœur (0, 0)',
        title: 'Le Sommeil des Quatre Saisons',
        text: 'L’Arbre-Mère s’éveille dans une pluie de pétales : « J’avais isolé les quatre cinquièmes de la canopée pour guérir la grande sécheresse. Vous êtes prêts ! Prenez ces réserves pleines… mais l’herboriste Krel de #500 manque à l’appel. »',
        unlockText: 'Plein complet ! Débloque : Boussoles (B·0, B·400, B·500) et Saut Balisé Go·0.',
        whisper: 'Suivez B·500 pour retrouver l’herboriste Krel tout au bord des Terres Sèches.'
      },
      reach512: {
        kicker: 'Étape 4 · Oasis #500',
        title: 'Krel, ses Blobs & les Graines de Pierre',
        text: 'Au bout du monde, l’herboriste Krel arrose deux graines fossiles pendant que trois blobs de rosée dansent sur ses épaules. « Ces cailloux renferment la mémoire de l’ancienne forêt ! Rentrez vite à la clairière #400 prévenir les jardiniers Monopodes ! »',
        unlockText: 'Débloque : Saut Balisé Go·500 (1 Hyper).',
        whisper: 'Suivez B·400 pour rentrer à votre clairière (#400).'
      },
      reach204: {
        kicker: 'Étape 5 · Clairière #400',
        title: 'La Greffe des Étoiles',
        text: 'Les mécaniciens-jardiniers de #400 bondissent de joie : « On peut greffer les étoiles d’une case à côté pour rouvrir les grands vents, et arroser tout un secteur fané avec 12 Scan ! »',
        unlockText: 'Débloque : REFILL16 sur étoile (-12 Scan) et Poussée d’étoile.',
        whisper: 'Poussez l’étoile #400, puis allez pousser la Sentinelle #1 et #500.'
      },
      Tuch204: {
        kicker: 'Étape 6 · Greffe #400',
        title: 'Pollen Libre',
        text: 'En décalant #400 d’une case, un courant chaud s’ouvre dans toute la canopée : le voilier peut désormais essaimer au hasard partout.',
        unlockText: 'Débloque : Saut Balisé Go·RND (1 Hyper).',
        whisper: 'Il reste à pousser la Sentinelle #1 (près du Centre) et #500.'
      },
      Tuch1: {
        kicker: 'Étape 7 · Greffe #1',
        title: 'La Sève d’Or de l’Onubis',
        text: 'En bougeant #1, les racines de l’Arbre-Mère s’illuminent droit vers l’étoile #256, où mûrit l’Onubis.',
        unlockText: 'Débloque : Boussole B·256.',
        whisper: 'Suivez B·256 vers le Cœur-Graine #256 ou terminez avec #500.'
      },
      tuch512: {
        kicker: 'Étape 8 · Greffe #500',
        title: 'Le Concile de la Mousse et de la Pierre',
        text: 'Quand #500 glisse, les deux graines fossiles germent : elles révèlent la grande Serre-Ambassade #3030 où Golems et champignons de Multivac attendent le printemps.',
        unlockText: 'Débloque : Boussole B·714 (Serre #3030).',
        whisper: 'Suivez B·714 vers la Serre #3030 ou B·256 vers l’Onubis.'
      },
      reach256_WIN1: {
        kicker: 'Fin 1 / 2 · L’Onubis (#256)',
        title: 'L’Éclosion des Graines',
        text: 'L’Onubis rayonne comme un fruit d’or suspendu entre les branches. « Tu as su équilibrer le vent, la sève et la lumière. Prends RESEED : sème un nouvel univers fleuri quand tu le souhaites ! »',
        unlockText: 'Débloque : Go·400 et RESEED (engendrer une nouvelle spirale).',
        whisper: 'Fin 1 accomplie ! Rejoignez B·714 pour la seconde fin, ou tentez un RESEED.'
      },
      reach714_WIN2: {
        kicker: 'Fin 2 / 2 · Serre-Ambassade #3030',
        title: 'Le Grand Printemps Symbiotique',
        text: 'Dans la Serre #3030, Golems moussus et mycélium Multivac fêtent l’union de la pierre et de la feuille. Chaque désert peut désormais reverdir sous votre passage !',
        unlockText: 'Débloque : REFILL16 libre n’importe où sur la grille !',
        whisper: 'Univers fleuri de bout en bout. Explorez librement ou semez via RESEED.'
      }
    },
    specials: {
      center: {
        kicker: 'Arbre-Mère · (0, 0)',
        title: 'Le Cœur de Sève · Point Zéro',
        first: 'D’immenses pétales blancs s’ouvrent doucement au centre du monde.',
        revisit: 'L’Arbre-Mère bruisse paisiblement dans la lumière tiède.'
      },
      star400: {
        first: 'Votre clairière natale (#400), perchée sur un grand saule magnétique.',
        afterCenter: 'Les jardiniers-mécaniciens préparent leurs sécateurs solaires pour déplacer les étoiles.',
        pushed: 'L’astre #400 fleurit sur sa nouvelle branche en répandant une brise tiède.'
      },
      star500: {
        first: 'L’herboriste Krel veille ici sur deux graines anciennes entourées de blobs lumineux.',
        pushed: 'En bougeant #500, les graines pointent vers la Serre #3030.'
      },
      star1: {
        first: 'La Sentinelle #1 garde les racines blanches de l’Arbre-Mère.',
        pushed: 'Sous ses racines s’allume le sentier doré menant à #256.'
      },
      star256: {
        first: 'Le Cœur-Graine #256 baigne dans une rosée d’or : ici mûrit l’Onubis.',
        afterWin: 'Les œufs de lumière flottent comme des lanternes mûres prêtes à essaimer.'
      },
      embassy3030: {
        kicker: 'Serre Cachée · %510510',
        title: 'Serre-Ambassade #3030',
        first: 'Golems couverts de fougères et champignons brillants cultivent ici les climats de demain.',
        afterWin: 'La Serre-Ambassade célèbre votre nom à chaque brise.'
      }
    },
    starNames: {
      1: 'Fleur #1 · Racine Blanche',
      256: 'Fleur #256 · Cœur-Graine Onubis',
      400: 'Fleur #400 · Clairière Natale',
      500: 'Fleur #500 · Jardin de Krel'
    },
    stars: {
      prefixes: ['Graine', 'Lanterne', 'Bourgeon', 'Corolle', 'Feuille', 'Rosée', 'Saule', 'Brise', 'Canopée', 'Nectar', 'Pollen', 'Sève', 'Orchidée', 'Mousse', 'Écorce', 'Aurore'],
      suffixes: ['Dorée', 'des Brumes', 'de Jade', 'Sauvage', 'Solaire', 'd’Émeraude', 'du Vent', 'Tiède', 'de Miel', 'd’Argent', 'Vivante', 'du Matin', 'Céleste', 'de Menthe', 'Fleurie', 'Libre'],
      flavors: [
        'Des lucanes dorés polissent doucement les feuilles photovoltaïques de votre voilier.',
        'Une odeur de tilleul chaud flotte autour de l’astre comme une promesse d’été.',
        'De petits moulins en bambou spatial tournent en chantant une berceuse douce.',
        'La rosée déposée sur la proue répare d’elle-même les micro-fissures.',
        'Des papillons de lumière suivent le Sève-III pendant une demi-minute avant de repartir.',
        'Un vieux panneau gravé dans le bois indique : « Prenez le temps de respirer. »'
      ]
    },
    planets: {
      archetypes: {
        boltz: {
          label: 'Boltz · Moulins Solaires',
          texts: [
            'Des automates jardiniers en bois d’olivier récoltent la rosée du matin dans des outres propres.',
            'Un vieux moulin à vent solaire offre ses surplus d’énergie aux voiliers de passage.',
            'Des ruches mécaniques produisent un miel énergétique délicieux pour les moteurs.',
            'La remise à outils déborde de réserves — attention tout de même aux orties électriques.',
            'Une fontaine d’eau chaude recharge les condensateurs sans bruit.',
            'Deux récoltes abondantes pour une mauvaise herbe taquine.'
          ]
        },
        crewz: {
          label: 'Crewz · Serres Flottantes',
          texts: [
            'Les céphalopodes Crewz tressent des pansements d’algues dorées pour les voiliers fatigués.',
            'Des fruits d’hyper-lumière pendent sous une tonnelle de verre iridescent.',
            'Une brume parfumée au thé vert répare doucement toute la coque.',
            'Des jardiniers rieurs vous lancent un sac de graines et un bidon de sève pure.',
            'L’ombre fraîche des fougères géantes recharge vos batteries en un instant.',
            'Évitez juste de marcher sur les cactus magnétiques près de l’entrée.'
          ]
        },
        golem: {
          label: 'Golem · Jardins de Mousse',
          texts: [
            'Des Golems pacifiques couverts de trèfle partagent l’eau fraîche de leurs sources minérales.',
            'Une rocaille chantante renferme des cristaux de saut taillés par la pluie.',
            'Les statues de mousse veillent sur des réserves d’énergie verte d’une rare pureté.',
            'Des dalles chaudes au soleil redonnent toute sa souplesse au Sève-III.',
            'Une grotte fleurie brille d’une lumière turquoise apaisante.',
            'Certaines pierres roulent parfois par excès d’enthousiasme.'
          ]
        }
      }
    },
    anomalies: {
      types: {
        blocage: {
          label: 'Blocage · Haie Vive',
          titles: ['Ronces Fleuries', 'Pluie de Pétales', 'Alizé Trop Fort', 'Essaim d’Abeilles', 'Poche de Brume', 'Courant Vif'],
          texts: [
            'Une haie de ronces fleuries barre le chemin. Un jardinier propose un échange sûr à 95 % pour tailler ensemble.',
            'Une pluie de pétales épais bouche les écopes ; un petit troc nettoie les voiles.',
            'Un grand vent pousse le voilier ; troquez vos surplus pour garder l’équilibre.',
            'Des abeilles dorées cherchent un abri ; un peu de sève les transforme en alliées.',
            'Un nuage de brume humide invite à rééquilibrer vos réserves.',
            'Le courant s’accélère : un échange presque sûr vous met à l’abri.'
          ]
        },
        surnature: {
          label: 'SurNature · Marché de Printemps',
          titles: ['Péniche Fleurie', 'Îlot-Montgolfière', 'Refuge Racinaire', 'Arbre-Relais', 'Serres Jumelles', 'Salon de Thé Céleste'],
          texts: [
            'Une péniche chargée de melons lumineux propose un pari printanier à bon rendement.',
            'Une montgolfière en feuilles cousues offre de jolis trocs aux voyageurs.',
            'Un refuge entre deux racines parie sur la météo des courants.',
            'Un grand arbre-relais distille des charges d’hyper-saut contre une mise modeste.',
            'Deux serres jumelles proposent un échange à deux contre un sous le soleil.',
            'Un salon de thé flottant invite à tenter sa chance autour d’une tasse chaude.'
          ]
        },
        dramaboss: {
          label: 'DramaBoss · Caprice des Saisons',
          titles: ['Le Grand Chêne', 'L’Orage Doré', 'Le Masque de Lierre', 'Floraison Subite', 'L’Équinoxe Fou', 'Le Juge Botaniste'],
          texts: [
            'Un esprit ancien propose un grand pari de saison : 38 % de chance d’une récolte miraculeuse.',
            'Un orage d’été promet une explosion d’énergie à qui ose miser gros.',
            'Un masque de feuilles tend deux graines fermées : la chance tranchera.',
            'Une floraison éclair menace de tout emporter — ou de remplir toutes vos cales.',
            'L’équinoxe exige une offrande sérieuse contre un printemps instantané.',
            'Le Juge Botaniste lance une pomme de pin d’or : pile ou face cosmique.'
          ]
        }
      }
    },
    events: [
      {
        id: 'solar_1',
        title: 'Pluie de Pollen Lumineux',
        text: 'Un nuage d’or parfumé enveloppe doucement le Sève-III et dépose une poussière sucrée sur vos voiles.',
        choices: [
          {
            label: 'Ouvrir les écopes et récolter le pollen',
            cost: null,
            effect: { fuel: 5 },
            resultText: 'Vos réservoirs s’emplissent de sève solaire pure (+5 Fuel).'
          },
          {
            label: 'Le distiller avec les capteurs pour chercher les étoiles',
            cost: { fuel: 2 },
            effect: { scan: 5, t2s: 3 },
            resultText: 'Vos lentilles brillent comme des gouttes de rosée (+5 Scan, +3 T2s).'
          }
        ]
      },
      {
        id: 'solar_2',
        title: 'Péniche à Thé Crewz en Panne de Brise',
        text: 'Deux jardiniers Crewz rament dans le vide avec des feuilles de bananier : « Un peu de souffle, voyageur ? »',
        choices: [
          {
            label: 'Les remorquer sur quelques centaines de mètres',
            cost: { fuel: 3 },
            effect: { coque: 4, lum: 1 },
            resultText: 'Ils réparent votre voilier avec des lianes neuves et vous offrent une lanterne (+4 Coque, +1 Lum).'
          },
          {
            label: 'Partager simplement une tasse de thé au jasmin',
            cost: null,
            effect: { coque: 2 },
            resultText: 'La pause remet la coque et le moral à neuf (+2 Coque).'
          }
        ]
      },
      {
        id: 'solar_3',
        title: 'Essaim de Lucioles de Phase',
        text: 'Des centaines de lucioles turquoise dansent devant l’étrave en dessinant des flèches vers l’horizon.',
        choices: [
          {
            label: 'Suivre leur sillage lumineux',
            cost: null,
            effect: { scan: 3, t2s: 3 },
            resultText: 'Elles éclairent deux couloirs cachés sur votre carte (+3 Scan, +3 T2s).'
          },
          {
            label: 'En recueillir quelques-unes en bocal pour la proue',
            cost: { scan: 2 },
            effect: { shield: true },
            resultText: 'Les lucioles forment un halo protecteur autour du navire (Bouclier Lum activé).'
          }
        ]
      },
      {
        id: 'solar_4',
        title: 'Graine Voyageuse Accrochée au Gouvernail',
        text: 'Une grosse graine ailée s’est prise dans votre gouvernail et bourgeonne à vue d’œil.',
        choices: [
          {
            label: 'La planter dans un pot de secours sur le pont',
            cost: { coque: 1 },
            effect: { hyper: 1, fuel: 3 },
            resultText: 'Sa fleur libère une charge d’hyper-propulsion naturelle (+1 Hyper, +3 Fuel).'
          },
          {
            label: 'La libérer doucement dans le courant solaire',
            cost: null,
            effect: { fuel: 3 },
            resultText: 'Elle s’envole en laissant un tourbillon porteur (+3 Fuel).'
          }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 6. ATOMPUNK PULP 1950 — Chromes, Martiens à Bretelles & Humour Rétro
  // --------------------------------------------------------------------------
  {
    id: 'retro',
    code: 'RET',
    name: 'L’Odyssée du Spoutnik-Deluxe',
    genre: 'Atompunk Pulp 1950 & Humour',
    accent: '#fb923c',
    shipName: 'Spoutnik-Deluxe',
    intro: {
      kicker: 'Édition Spéciale · Planète Zéro en Danger !',
      title: 'SPAWN · DELUXE 55',
      lead: 'Le Capitaine Flash-Boulon s’est trompé de bouton sur le tableau de bord en voulant régler la radio jazz ! Votre fusée chromée Spoutnik-Deluxe vient d’atterrir dans les sables atomiques de ForgotLands avec le plein à moitié vidé.',
      sub: 'Pas de panique : faites glisser le cosmos contre les bords de l’écran pour faire rebondir vos amortisseurs à ressorts chromés et foncez vers la Capitale du Chrome (0, 0) !',
      btnStartNew: 'Mettre les lunettes d’aviateur',
      btnResumeSave: 'Reprendre le feuilleton'
    },
    zones: {
      cosm: {
        name: 'Centre SpaceGate · Capitale du Chrome (0, 0)',
        shortName: 'Capitale Chrome',
        ambient: [
          'Des gratte-ciel en acier inoxydable brillent sous des projecteurs géants ! Ici tout fonctionne au bouton-poussoir.',
          'Les Martiens fonctionnaires portent des antennes en laiton et tamponnent les passeports en triple exemplaire.',
          'Une musique de thérémine joyeuse accompagne chaque virage du Spoutnik-Deluxe.',
          'Le Rayon Réducteur a isolé les quatre cinquièmes extérieurs « en attendant la livraison de pièces détachées ».',
          'Des voitures-fusées garées en épi reflètent le sourire éclatant de Flash-Boulon.',
          'Ici même les astéroïdes sont polis au Miror chaque matin.'
        ]
      },
      dream: {
        name: 'Middle Dream · Foire Interplanétaire de l’An 2000',
        shortName: 'Foire An 2000',
        ambient: [
          'Des guirlandes d’ampoules multicolores relient les planètes comme une grande fête foraine spatiale !',
          'Les vendeurs Crewz portent des chapeaux de paille sur leurs scaphandres et bradent des gadgets miraculeux.',
          'Une voix de speaker enthousiaste annonce : « Mesdames et messieurs, plus vous voyagez loin avec nos babioles, plus elles prennent de valeur ! »',
          'Des soucoupes à pédales croisent tranquillement au-dessus des nébuleuses barbe à papa.',
          'L’air sent le pop-corn atomique et la peinture fraîche.',
          'Des enseignes au néon clignotent : « FUTUR GARANTI 100 % CHROME ! »'
        ]
      },
      forgot: {
        name: 'ForgotLands · Désert des Fusées à Ressort',
        shortName: 'Désert Atomique',
        ambient: [
          'Poussière orange, cactus métalliques en orbite et robots fumeurs de pipe qui réparent les phares.',
          'Chaque rebond sur le bord du cadre fait « BOING » dans le haut-parleur de bord.',
          'Des automates Boltz en tôle ondulée comptent leurs boulons avec des monocles.',
          'Des affiches publicitaires vénérables proclament : « BUVEZ DU PLUTONIUM PÉTILLANT ! ».',
          'Les tempêtes ici soulèvent des étincelles joyeuses sans jamais froisser la banane du capitaine.',
          'Une station-service chromée vous attend au détour de chaque secteur.'
        ]
      },
      out: {
        name: 'Out Multivac · Le Tiroir à Mystères du Savant',
        shortName: 'Au-Delà Multivac',
        ambient: [
          'Au-delà des cartes de la Foire s’étend l’atelier géant de Multivac, le Super-Cerveau à lampes à vide !',
          'Des bobines Tesla de dix kilomètres grésillent avec bonne humeur dans le noir.',
          'Un haut-parleur demande : « Quelqu’un a-t-il vu mes lunettes ? Elles font quatre parsecs de large. »',
          'Des étincelles bleues dansent autour du nez chromé de votre fusée.',
          'Ici vivent les théories trop farfelues pour figurer dans les manuels scolaires.',
          'Même le vide semble prêt à vous applaudir.'
        ]
      }
    },
    chapters: {
      intro: {
        kicker: 'Épisode 1 · Panne Sèche ?',
        title: 'Zut alors, plus d’essence atomique !',
        text: 'Le Spoutnik-Deluxe toussote dans le Désert Atomique. « Pas de souci ! s’écrie le Capitaine Flash-Boulon en remontant ses bretelles : il y a une étoile-relais juste à côté ! »',
        unlockText: 'Débloque : Déplacement local (Fuel) et Lecture de proximité.',
        whisper: 'Foncez vers l’étoile toute proche avec les moteurs locaux.'
      },
      star1: {
        kicker: 'Épisode 2 · Le Mystère des Numéros',
        title: 'Un chiffre peint au pochoir !',
        text: 'Quelle surprise : chaque étoile porte un gros numéro peint à la main ! « Et regardez, ajoute votre robot-majordome : si on glisse la carte contre le bord, nos ressorts chromés rebondissent pour un seul point de Coque ! »',
        unlockText: 'Débloque : Coque (rebond bord-de-cadre), Scan, T2s, Lum et Journal de bord.',
        whisper: 'Trouvez une deuxième étoile pour deviner où se cache la Capitale (0, 0).'
      },
      star2: {
        kicker: 'Épisode 3 · Cap sur la Capitale !',
        title: 'Plus bas le numéro, plus près le métro !',
        text: 'Formidable ! Les numéros descendent droit vers le Centre (0, 0). Flash-Boulon tire une manette rouge sous le volant : les fusées HyperJump rugissent !',
        unlockText: 'Débloque : HyperJump (sauts de 14–19 cases) et Recycleur T2s.',
        whisper: 'Mettez les gaz vers la Capitale du Chrome en (0, 0) !'
      },
      reachDream: {
        kicker: 'Épisode Spécial · Foire An 2000',
        title: 'Les Attractions des Crewz',
        text: 'Bienvenue à la Foire Interplanétaire ! Les marchands Crewz vous font un clin d’œil : achetez leurs souvenirs de fête et revendez-les à l’autre bout de la galaxie pour faire fortune.',
        unlockText: 'Débloque : LocatStar et Commerce d’artefacts.',
        whisper: 'Continuez vers le centre : la Capitale brille sous l’anneau 14.'
      },
      reachCosm: {
        kicker: 'Épisode Spécial · Capitale Chrome',
        title: 'Halte au Guichet de Cuivre !',
        text: 'Vous entrez dans la zone chromée de l’ONU martienne ! Votre fusée brille tellement qu’elle obtient un Bouclier Lum flambant neuf.',
        unlockText: 'Débloque : Bouclier Lum (absorbe le prochain court-circuit).',
        whisper: 'Atteignez la Grand-Place (0, 0) au cœur de la Capitale.'
      },
      reachOut: {
        kicker: 'Épisode Bonus · Au-Delà Multivac',
        title: 'Plus loin que la Carte Postale !',
        text: 'Incroyable ! Vous venez de dépasser la bordure de la carte officielle. Les lampes à vide de Multivac clignotent pour vous féliciter.',
        unlockText: 'Observation enregistrée dans le Journal.',
        whisper: null
      },
      reachCenter: {
        kicker: 'Épisode 4 · Grand-Place (0, 0)',
        title: 'La Quarantaine du Rayon Réducteur',
        text: 'Le Maire Martien en bretelles dorées vous serre la pince : « Par tous les boulons, un visiteur des quatre cinquièmes extérieurs ! Nous avions oublié le secteur en mode économique il y a 4000 ans ! Prenez le plein complet… mais notre savant Krel sur #500 a disparu ! »',
        unlockText: 'Plein complet ! Débloque : Boussoles (B·0, B·400, B·500) et Saut Balisé Go·0.',
        whisper: 'Suivez B·500 pour retrouver le savant Krel tout au bout de la galaxie !'
      },
      reach512: {
        kicker: 'Épisode 5 · Campement #500',
        title: 'Le Professeur Krel & les Cailloux à Bretelles',
        text: 'Le professeur Krel ajuste sa loupe géante pendant que trois blobs en gélatine verte sautent sur ses genoux : « Eurêka ! J’ai deux cailloux clandestins sans passeport ! Vite, foncez chez vous à #400 voir les mécanos Monopodes ! »',
        unlockText: 'Débloque : Saut Balisé Go·500 (1 Hyper).',
        whisper: 'Suivez B·400 pour rentrer à votre garage natal (#400).'
      },
      reach204: {
        kicker: 'Épisode 6 · Garage #400',
        title: 'Le Coup de Clé Anglaise de l’An 2000',
        text: 'Les mécanos à une jambe sortent leur plus grosse clé anglaise chromée : « Facile, patron ! On peut pousser n’importe quelle étoile d’une case — et recharger les stations autour grâce à REFILL16 ! »',
        unlockText: 'Débloque : REFILL16 sur étoile (-12 Scan) et Poussée d’étoile.',
        whisper: 'Poussez l’étoile #400, puis allez pousser la Sentinelle #1 et #500 !'
      },
      Tuch204: {
        kicker: 'Épisode 7 · Coup de Clé #400',
        title: 'Saut-Mouton Cosmique !',
        text: 'BOING-CLANG ! En poussant #400, votre fusée débloque le bouton rouge « Saut Surprise » pour bondir n’importe où !',
        unlockText: 'Débloque : Saut Balisé Go·RND (1 Hyper).',
        whisper: 'Filez pousser la Sentinelle #1 (près du Centre) et #500.'
      },
      Tuch1: {
        kicker: 'Épisode 8 · Coup de Clé #1',
        title: 'Le Passage Secret sous la Mairie',
        text: 'Le Maire martien lâche son chapeau melon quand #1 glisse d’une case : un tunnel clignotant montre l’adresse du Super-Cerveau Onubis en #256 !',
        unlockText: 'Débloque : Boussole B·256.',
        whisper: 'Suivez B·256 vers le Super-Cerveau ou terminez avec #500.'
      },
      tuch512: {
        kicker: 'Épisode 9 · Coup de Clé #500',
        title: 'Le Club Interplanétaire des Golems',
        text: 'Quand #500 bouge, les deux cailloux de Krel sifflent une chanson : « Tous les Golems du Dernier Pourcent sont au Club #3030 avec Multivac ! »',
        unlockText: 'Débloque : Boussole B·714 (Club #3030).',
        whisper: 'Suivez B·714 vers le Club #3030 ou B·256 vers l’Onubis.'
      },
      reach256_WIN1: {
        kicker: 'Grand Final 1 / 2 · L’Onubis (#256)',
        title: 'Le Grand Prix du Super-Cerveau',
        text: 'L’Onubis clignote de mille ampoules de couleur : « Bravo, Capitaine ! Cette grande course d’orientation était un test pour équilibrer vos jauges ! Prenez le bouton RESEED pour lancer l’épisode suivant dans un tout nouvel univers ! »',
        unlockText: 'Débloque : Go·400 et RESEED (engendrer une nouvelle spirale).',
        whisper: 'Épisode final 1 réussi ! Passez par B·714 pour le club #3030, ou cliquez RESEED.'
      },
      reach714_WIN2: {
        kicker: 'Grand Final 2 / 2 · Club #3030',
        title: 'Membre d’Honneur à Vie !',
        text: 'Au Club Interplanétaire #3030, les Golems en smoking et les champignons à lampes de Multivac vous remettent les clés du bar cosmique : REFILL16 marche désormais partout !',
        unlockText: 'Débloque : REFILL16 libre n’importe où sur la grille !',
        whisper: 'Quel feuilleton ! Continuez à explorer ou lancez un RESEED.'
      }
    },
    specials: {
      center: {
        kicker: 'Grand-Place · (0, 0)',
        title: 'Capitale du Chrome · Point Zéro',
        first: 'Une statue en acier poli tourne au ralenti devant le guichet de la Mairie Martienne.',
        revisit: 'La fanfare automatique rejoue son jingle dès que vous klaxonnez.'
      },
      star400: {
        first: 'Votre garage lunaire (#400), avec sa pompe à essence atomique et ses mécanos Monopodes.',
        afterCenter: 'Les mécanos font tourner leurs clés anglaises chromées : prêts à pousser les astres !',
        pushed: 'Vroum ! L’astre #400 ronronne sur sa nouvelle place de parking.'
      },
      star500: {
        first: 'Le campement farfelu de Krel : trois tableaux noirs, deux cailloux à bretelles et trois blobs rieurs.',
        pushed: 'En glissant, #500 révèle le tampon secret du Club #3030 !'
      },
      star1: {
        first: 'La Sentinelle #1 brille comme un parcmètre géant devant la Capitale.',
        pushed: 'Parcmètre déplacé ! Le passage vers le Super-Cerveau #256 s’allume.'
      },
      star256: {
        first: 'Le Super-Cerveau Onubis (#256) ronfle doucement en calculant des œufs de lumière.',
        afterWin: 'Toutes ses ampoules affichent : « BRAVO CAPITAINE ! »'
      },
      embassy3030: {
        kicker: 'Club Sélect · %510510',
        title: 'Club Interplanétaire #3030',
        first: 'Des Golems en nœud papillon débattent avec les lampes géantes de Multivac.',
        afterWin: 'Votre portrait chromé trône désormais au-dessus du comptoir !'
      }
    },
    starNames: {
      1: 'Phare #1 · Parcmètre Royal',
      256: 'Phare #256 · Super-Cerveau Onubis',
      400: 'Phare #400 · Garage Spatial',
      500: 'Phare #500 · Labo de Krel'
    },
    stars: {
      prefixes: ['Fusée', 'Rayon', 'Comète', 'Spoutnik', 'Astéro', 'Turbo', 'Chrome', 'Nébula', 'Pulsar', 'Radar', 'Métro', 'Atome', 'Luna', 'Super', 'Electro', 'Nova'],
      suffixes: ['Deluxe', '2000', '55', 'Express', 'Gamma', 'de Mars', 'en Tôle', 'Supersonique', 'de Cuivre', 'Merveille', 'Zéro', 'du Dimanche', 'Boulon', 'à Ressort', 'Atomique', 'Chic'],
      flavors: [
        'Une vieille enseigne au néon tourne sur orbite : « RÉVISION GRATUITE LE JEUDI ».',
        'La radio capte soudain un solo de trompette martienne plein d’entrain.',
        'Des boulons chromés flottent en formation serrée autour de cette étoile coquette.',
        'Flash-Boulon jure avoir déjà vu cette étoile sur une boîte de céréales spatiales.',
        'Une pompe à carburant automatique fait ding-dong en vous voyant approcher.',
        'L’astre scintille avec l’enthousiasme d’un sapin de Noël branché sur du 10 000 volts.'
      ]
    },
    planets: {
      archetypes: {
        boltz: {
          label: 'Boltz · Stations Chromées',
          texts: [
            'Des robots à chapeau haut-de-forme astiquent les pompes à carburant atomique.',
            'Un atelier rétro propose du super-carburant avec un porte-clés offert !',
            'Des réservoirs rutilants attendent sous un auvent rouge et blanc.',
            'Deux bons bidons pour un vieux ressort farceur — c’est la loi du progrès !',
            'Un automate fumeur de pipe vous tend la clé des réserves avec un clin d’œil.',
            'Attention au vieux grille-pain de secours, il a tendance à sauter tout seul.'
          ]
        },
        crewz: {
          label: 'Crewz · Kiosques Barbe-à-Papa',
          texts: [
            'Des Martiens verts en scaphandre servent des algues miraculeuses qui soudent la coque.',
            'Des bonbons d’hyper-propulsion brillent dans des bocaux en verre soufflé.',
            'Une serre à bulles diffuse une odeur de fraise et d’ozone joyeux.',
            'Les jardiniers vous remettent un kit de réparation garanti « incassable jusqu’à mardi ».',
            'Le sirop vert de cette planète fait ronronner les tuyères.',
            'Attention toutefois aux plantes chatouilleuses près de la caisse.'
          ]
        },
        golem: {
          label: 'Golem · Carrières Atomiques',
          texts: [
            'Des Golems en salopette taillent des blocs d’énergie bleue à la pioche chromée.',
            'Des cristaux d’hyper-saut brillent comme des diamants de cinéma.',
            'Des plaques de blindage toutes neuves sortent encore tièdes du four.',
            'Un coffre blindé s’ouvre dès qu’on siffle deux mesures de swing.',
            'L’écho des marteaux donne le rythme à votre équipage.',
            'Parfois un éclat de quartz saute un peu trop haut : gardez votre casque !'
          ]
        }
      }
    },
    anomalies: {
      types: {
        blocage: {
          label: 'Blocage · Bouchon de Soucoupes',
          titles: ['Embouteillage Chromé', 'Pluie de Boulons', 'Bourrasque Solaire', 'Drones Farceurs', 'Poche de Mousse', 'Route Bosselée'],
          texts: [
            'Un défilé de soucoupes bloque le carrefour ! Un échange fiable à 95 % libère le passage.',
            'Une pluie de boulons tintinnabule sur le capot ; un troc rapide arrange tout.',
            'Un vent solaire décoiffe l’antenne : profitez-en pour équilibrer vos jauges.',
            'Des robots livreurs tournent en rond : un petit troc les remet sur les rails.',
            'Une bulle de savon magnétique aspire le surplus avec politesse.',
            'Un petit accord entre pilotes remet les compteurs au beau fixe !'
          ]
        },
        surnature: {
          label: 'SurNature · Foire Foraine',
          titles: ['Train-Fusée', 'Cité-Ballon', 'Garage Secret', 'Plante à Loteries', 'Stand Jumeau', 'Buvette Rétro'],
          texts: [
            'Un train-fusée propose un beau pari aux voyageurs au cœur solide.',
            'Une cité-ballon rayée rouge et blanc offre de jolis gains sur ses roues de fortune.',
            'Un garage clandestin parie sur vos réserves à deux contre un.',
            'Une plante géante crache des charges d’hyper-saut pour qui ose miser.',
            'Deux guichets jumeaux jouent le destin du soir aux dés chromés.',
            'Le patron de la buvette vous lance : « On double la mise ou on paie sa tournée ? »'
          ]
        },
        dramaboss: {
          label: 'DramaBoss · Le Grand Jeu',
          titles: ['Le Baron Chromé', 'La Roulette Atomique', 'Le Masque d’Acier', 'Explosion Contrôlée', 'Le Duo de Jazz', 'Le Juge à Monocle'],
          texts: [
            'Un baron excentrique parie une fortune à 38 % de chances : le grand frisson pulp !',
            'La roulette atomique tourne à toute vitesse : misez gros pour toucher les étoiles.',
            'Un mystérieux adversaire tend ses dés d’ivoire sous les projecteurs.',
            'Un réacteur crache des étincelles violettes : jackpot colossal ou grosse douche froide.',
            'Un orchestre joue un roulement de tambour tandis que vous choisissez votre mise.',
            'Le Juge à Monocle ajuste sa cravate et lance la pièce d’or !'
          ]
        }
      }
    },
    events: [
      {
        id: 'retro_1',
        title: 'Soucoupe Familiale en Panne d’Allume-Cigare',
        text: 'Une famille de Martiens à bretelles fait de grands signaux de détresse depuis une soucoupe rose bonbon : « Le thermos de soupe est froid ! »',
        choices: [
          {
            label: 'Prêter un peu de Fuel pour réchauffer leur soupe',
            cost: { fuel: 3 },
            effect: { lum: 1, coque: 2 },
            resultText: 'Ils vous offrent une médaille porte-bonheur et deux plaques neuves (+1 Lum, +2 Coque) !'
          },
          {
            label: 'Leur indiquer l’étoile la plus proche au mégaphone',
            cost: null,
            effect: { t2s: 4 },
            resultText: 'Ils applaudissent avec leurs quatre bras (+4 T2s).'
          }
        ]
      },
      {
        id: 'retro_2',
        title: 'Station de Lavage Automatique Spatiale',
        text: 'Deux grands rouleaux à plumes roses tournent tout seuls dans le vide sous un panneau « LAVAGE OFFERT AUJOURD’HUI ».',
        choices: [
          {
            label: 'Passer le Spoutnik-Deluxe aux rouleaux',
            cost: null,
            effect: { coque: 2, scan: 2 },
            resultText: 'Le chrome brille comme un sou neuf et les radars y voient clair (+2 Coque, +2 Scan) !'
          },
          {
            label: 'Payer le programme « Cire Hyper-Espace »',
            cost: { fuel: 4 },
            effect: { hyper: 1 },
            resultText: 'La cire glisse tellement bien que l’hyper-moteur gagne une charge (+1 Hyper) !'
          }
        ]
      },
      {
        id: 'retro_3',
        title: 'Boîte de Céréales « Astro-Crunch »',
        text: 'Une boîte géante flotte intacte dans le vide. Sur le devant : « UN JOUET SURPRISE DANS CHAQUE PAQUET ! ».',
        choices: [
          {
            label: 'Ouvrir le paquet avec les pinces du bord',
            cost: null,
            effect: { fuel: 4 },
            resultText: 'Oh ! Quatre pastilles d’énergie atomique goût fraise (+4 Fuel).'
          },
          {
            label: 'Collectionner le sticker du Capitaine sur la coque',
            cost: { scan: 2 },
            effect: { shield: true },
            resultText: 'Le sticker réfléchissant fait office de Bouclier Lum improvisé (Bouclier activé) !'
          }
        ]
      },
      {
        id: 'retro_4',
        title: 'Course-Poursuite au Ralenti',
        text: 'Un robot policier en patins à fusée poursuit un voleur de tartes aux pommes à 2 km/h : « Pousse-toi, citoyen ! »',
        choices: [
          {
            label: 'Offrir une tarte virtuelle en distraction',
            cost: null,
            effect: { t2s: 3, fuel: 2 },
            resultText: 'Le voleur lâche deux bidons de secours pour courir plus vite (+2 Fuel, +3 T2s).'
          },
          {
            label: 'Aider le robot à calibrer son radar de vitesse',
            cost: { scan: 3 },
            effect: { coque: 4 },
            resultText: 'Pour vous remercier, il vous boulonne un pare-chocs tout neuf (+4 Coque).'
          }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 7. POLAR NOIR — Détective Spatial & Pluie d'Ions
  // --------------------------------------------------------------------------
  {
    id: 'polar',
    code: 'POL',
    name: 'La Dernière Étoile du Dock 9',
    genre: 'Polar Noir Spatial',
    accent: '#94a3b8',
    shipName: 'Croiseur Marlowe-9',
    intro: {
      kicker: 'Dossier 400 · Minuit sur ForgotLands',
      title: 'SPAWN · NOIR',
      lead: 'Une pluie de poussière froide frappe le pare-brise du Marlowe-9. Quelqu’un vous a payé d’avance en jetons périmés pour retrouver l’étoile #500, disparue sans laisser de pourboire.',
      sub: 'Vos phares percent à peine le brouillard de ForgotLands. Faites glisser la carte pour rebondir sur les bords du cadre et remontez l’enquête jusqu’au Commissariat Central (0, 0).',
      btnStartNew: 'Allumer le néon de bord',
      btnResumeSave: 'Rouvrir le dossier'
    },
    zones: {
      cosm: {
        name: 'Centre SpaceGate · Commissariat Central',
        shortName: 'Commissariat (0,0)',
        ambient: [
          'Des stores vénitiens découpent la lumière blanche du Centre en rayures froides.',
          'Les inspecteurs de l’ONU galactique classent des affaires vieilles de quarante siècles sous des lampes vertes.',
          'Ils ont mis les quatre cinquièmes extérieurs sous scellés en attendant qu’un témoin passe aux aveux.',
          'Ici personne ne hausse la voix, mais tous les dossiers ont des coins cornés.',
          'L’asphalte du vide sent le café froid et le papier carbone.',
          'Un silence d’interrogatoire pèse autour du point (0, 0).'
        ]
      },
      dream: {
        name: 'Middle Dream · Les Quartiers au Néon Mauve',
        shortName: 'Quartiers Mauves',
        ambient: [
          'Un saxophone joue dans une station de jeu suspendue entre deux nébuleuses humides.',
          'Les informateurs Crewz trafiquent des souvenirs en bouteille dans l’arrière-salle de leurs serres.',
          'Plus vous emportez une pièce à conviction loin de son lieu d’origine, plus elle vaut cher au marché noir.',
          'Des imperméables trempés de poussière stellaire sèchent sur les antennes.',
          'Chaque enseigne clignote avec une lettre manquante : « HÔT L DU VI E ».',
          'Ici, même les étoiles semblent avoir un alibi.'
        ]
      },
      forgot: {
        name: 'ForgotLands · Les Docks de Ferraille',
        shortName: 'Docks Oubliés',
        ambient: [
          'Le vieux quartier oublié : lampadaires tordus, épaves garées sans permis et tempêtes de cendre.',
          'Les automates Boltz jouent aux cartes sous la pluie d’ions en gardant leurs réserves sous le comptoir.',
          'Quand le Marlowe-9 touche le bord du cadre, le choc réveille les vieux amortisseurs.',
          'Une voix rauque murmure dans la radio : « Cherche du côté de la #500, détective. »',
          'Ici la loi tient dans le canon d’une lampe torche.',
          'Les néons orange éclairent à peine les flaques d’ombre entre les planètes.'
        ]
      },
      out: {
        name: 'Out Multivac · Hors Juridiction',
        shortName: 'Hors Juridiction',
        ambient: [
          'Au-delà des docks s’étend le territoire sans nom où même la police ne met jamais les pneus.',
          'Multivac y tient un tripot silencieux où l’on joue le destin des univers.',
          'Des témoins sans visage murmurent des indices dans les câbles du tableau de bord.',
          'La brume avale les phares à dix mètres devant le capot.',
          'Seuls les durs à cuire s’aventurent au-delà de l’anneau 72.',
          'Ici, la vérité ne porte pas de badge.'
        ]
      }
    },
    chapters: {
      intro: {
        kicker: 'Chapitre 1 · Le Client de Minuit',
        title: 'Du plomb dans les tuyères',
        text: 'Le client a raccroché avant de donner son nom. Le Marlowe-9 dérive dans les Docks Oubliés avec une jauge presque à sec — mais une première enseigne brille tout près dans le brouillard.',
        unlockText: 'Débloque : Déplacement local (Fuel) et Lecture de proximité.',
        whisper: 'Approchez-vous de l’étoile voisine pour lire son matricule sous le néon.'
      },
      star1: {
        kicker: 'Chapitre 2 · La Première Piste',
        title: 'Un numéro gravé sur le trottoir',
        text: 'La plaque stellaire porte un numéro de rue en spirale. En faisant glisser la carte jusqu’au bord, votre pare-chocs rebondit d’un pâté de maisons à l’autre.',
        unlockText: 'Débloque : Coque (rebond bord-de-cadre), Scan, T2s, Lum et Journal de bord.',
        whisper: 'Relevez un deuxième numéro pour trouver dans quelle direction descend la rue vers (0, 0).'
      },
      star2: {
        kicker: 'Chapitre 3 · Filature vers le Centre',
        title: 'Toutes les rues mènent au Central',
        text: 'Les chiffres décroissent vers le milieu : le Commissariat (0, 0) tire toutes les ficelles depuis le cœur du labyrinthe. Vous débloquez le turbo HyperJump.',
        unlockText: 'Débloque : HyperJump (sauts de 14–19 cases) et Recycleur T2s.',
        whisper: 'Remontez la filature jusqu’au Commissariat Central (0, 0).'
      },
      reachDream: {
        kicker: 'Quartier · Les Néons Mauves',
        title: 'L’Arrière-Boutique des Crewz',
        text: 'Vous entrez dans Middle Dream. Ici, les marchands Crewz achètent et vendent des pièces à conviction : plus elles voyagent loin de la scène de crime, plus leur prix grimpe.',
        unlockText: 'Débloque : LocatStar et Commerce d’artefacts.',
        whisper: 'Foncez vers le Central : l’anneau 14 n’est plus loin.'
      },
      reachCosm: {
        kicker: 'Quartier · Commissariat',
        title: 'Les Scellés Blancs',
        text: 'Lumière crue et couloirs cirés. Vous récupérez un Bouclier Lum dans le casier des pièces saisies.',
        unlockText: 'Débloque : Bouclier Lum (absorbe le prochain coup bas).',
        whisper: 'Entrez au bureau du chef en (0, 0).'
      },
      reachOut: {
        kicker: 'Zone Grise · Hors Juridiction',
        title: 'Plus de Mandat ici',
        text: 'Vous passez la limite extérieure. Multivac note votre plaque sans broncher.',
        unlockText: 'Observation enregistrée dans le Journal.',
        whisper: null
      },
      reachCenter: {
        kicker: 'Chapitre 4 · Bureau (0, 0)',
        title: 'Dossier Classé Quarantaine',
        text: 'Le Commissaire soupire dans son nuage de fumée froide : « L’affaire des quatre cinquièmes ? Mis en stase il y a quatre mille ans pour vice de forme. Prenez ce plein d’essence… et retrouvez l’indicateur Krel sur #500 avant les autres. »',
        unlockText: 'Plein complet ! Débloque : Boussoles (B·0, B·400, B·500) et Saut Balisé Go·0.',
        whisper: 'Suivez B·500 jusqu’à la planque de Krel tout au bout des docks.'
      },
      reach512: {
        kicker: 'Chapitre 5 · Planque #500',
        title: 'L’Indicateur Krel & ses Deux Témoins',
        text: 'Sous une lampe nue sur #500, Krel cache deux témoins muets — deux cailloux gris qui ont tout vu — et trois blobs nerveux. « Les gros bonnets veulent nous effacer ! Rentre au bar #400 prévenir les mécanos Monopodes ! »',
        unlockText: 'Débloque : Saut Balisé Go·500 (1 Hyper).',
        whisper: 'Suivez B·400 pour rentrer au bar #400.'
      },
      reach204: {
        kicker: 'Chapitre 6 · Bar #400',
        title: 'Les Mécanos de la Cour Arrière',
        text: 'Les Monopodes du #400 posent leurs verres : « Pour casser l’alibi du système, faut déplacer les réverbères d’un cran ! On peut pousser les étoiles et nettoyer un secteur à coups de Scan. »',
        unlockText: 'Débloque : REFILL16 sur étoile (-12 Scan) et Poussée d’étoile.',
        whisper: 'Poussez #400, puis allez pousser la Sentinelle #1 et la planque #500.'
      },
      Tuch204: {
        kicker: 'Chapitre 7 · Coup d’Épaule #400',
        title: 'Faux Numéro',
        text: 'En décalant #400 d’une case, vous brouillez toutes les filatures : le Marlowe-9 peut désormais disparaître n’importe où au hasard.',
        unlockText: 'Débloque : Saut Balisé Go·RND (1 Hyper).',
        whisper: 'Il reste à déplacer la Sentinelle #1 (près du Central) et #500.'
      },
      Tuch1: {
        kicker: 'Chapitre 8 · Coup d’Épaule #1',
        title: 'Le Carnet Caché de l’Onubis',
        text: 'Sous le socle de la Sentinelle #1 reposait un carnet d’adresses : un nom revient partout, l’Onubis, planqué à l’enseigne #256.',
        unlockText: 'Débloque : Boussole B·256.',
        whisper: 'Suivez B·256 vers l’Onubis ou bouclez d’abord #500.'
      },
      tuch512: {
        kicker: 'Chapitre 9 · Coup d’Épaule #500',
        title: 'Le Syndicat de Pierre',
        text: 'Les deux témoins de Krel parlent enfin à voix basse : « Un milliard de Golems tiennent la réunion secrète au cercle #3030 avec ChampIA. »',
        unlockText: 'Débloque : Boussole B·714 (Cercle #3030).',
        whisper: 'Suivez B·714 vers le Cercle #3030 ou B·256 vers l’Onubis.'
      },
      reach256_WIN1: {
        kicker: 'Épilogue 1 / 2 · L’Onubis (#256)',
        title: 'Le Vrai Commanditaire',
        text: 'Dans son bureau doré, l’Onubis baisse son chapeau : « C’est moi qui ai envoyé l’appel anonyme, détective. Il me fallait quelqu’un capable de démêler les comptes de la galaxie sans perdre la tête. Prenez RESEED pour la prochaine enquête. »',
        unlockText: 'Débloque : Go·400 et RESEED (engendrer une nouvelle spirale).',
        whisper: 'Affaire 1 classée ! Allez voir le Cercle #3030 (B·714) ou lancez un RESEED.'
      },
      reach714_WIN2: {
        kicker: 'Épilogue 2 / 2 · Cercle #3030',
        title: 'Toute la Ville Vous Appartient',
        text: 'Au Cercle #3030, les Golems en trench-coat et les informateurs de Multivac lèvent leur verre à votre santé. Plus aucun secteur ne vous refuse le ravitaillement.',
        unlockText: 'Débloque : REFILL16 libre n’importe où sur la grille !',
        whisper: 'Enquête bouclée. Patrouillez librement ou ouvrez un nouveau dossier via RESEED.'
      }
    },
    specials: {
      center: {
        kicker: 'Commissariat · (0, 0)',
        title: 'Bureau du Central · Point Zéro',
        first: 'Un néon blanc grésille au-dessus des dossiers scellés.',
        revisit: 'Le café du Central est toujours aussi tiède, les secrets toujours aussi froids.'
      },
      star400: {
        first: 'Le bar du coin (#400), fréquenté par des mécanos à une jambe qui savent se taire.',
        afterCenter: 'Les habitués sortent les démonte-pneus : prêts à bouger les réverbères de la ville.',
        pushed: 'L’enseigne #400 pend de travers sur sa nouvelle façade.'
      },
      star500: {
        first: 'La planque humide de Krel, derrière deux caisses et deux témoins de pierre muets.',
        pushed: 'En bougeant #500, une carte de visite tombe par terre : #3030.'
      },
      star1: {
        first: 'La Sentinelle #1 monte la garde devant le Commissariat comme un videur de boîte.',
        pushed: 'Le videur recule d’un pas et laisse voir l’adresse de l’Onubis (#256).'
      },
      star256: {
        first: 'Une lumière ambrée filtre sous la porte du bureau #256.',
        afterWin: 'L’Onubis range le dossier dans le tiroir « Affaires Brillamment Résolues ».'
      },
      embassy3030: {
        kicker: 'Arrière-Salle · %510510',
        title: 'Cercle Privé #3030',
        first: 'Des Golems silencieux jouent aux cartes sous une fumée de spores bleues.',
        afterWin: 'Votre chaise est désormais réservée au bout de la table.'
      }
    },
    starNames: {
      1: 'Enseigne #1 · Le Videur',
      256: 'Enseigne #256 · Bureau Onubis',
      400: 'Enseigne #400 · Bar des Docks',
      500: 'Enseigne #500 · Planque de Krel'
    },
    stars: {
      prefixes: ['Impasse', 'Dock', 'Néon', 'Quai', 'Allée', 'Hôtel', 'Bar', 'Phare', 'Guichet', 'Passage', 'Square', 'Pont', 'Tunnel', 'Kiosque', 'Écho', 'Cercle'],
      suffixes: ['Gris', 'de Minuit', 'du Brouillard', 'Sans Alibi', 'Noir', 'du Port', 'Froid', 'du Témoin', 'd’Ombre', 'de Pluie', 'Solitaire', 'Fermé', 'Carbone', 'Fumant', 'de Nuit', 'Discret'],
      flavors: [
        'Un imperméable oublié flotte doucement près du réverbère stellaire.',
        'Une radio grésille un air de saxophone triste entre deux parasites.',
        'Quelqu’un a rayé la plaque de rue avec la pointe d’un couteau.',
        'La lumière pâle éclaire une flaque d’huile irisée en plein vide.',
        'Un vieux journal spatial titre encore : « L’AFFAIRE DES 4/5 TOUJOURS AU POINT MORT ».',
        'Le silence ici a la lourdeur d’un dimanche soir pluvieux.'
      ]
    },
    planets: {
      archetypes: {
        boltz: {
          label: 'Boltz · Garages de Nuit',
          texts: [
            'Un vieux mécano en ferraille garde des bidons sous le comptoir pour les clients réguliers.',
            'La pompe grince dans la brume ; deux bons coups pour une fuite d’huile.',
            'Un garage ouvert toute la nuit malgré l’absence totale de clients.',
            'Des pièces détachées reposent dans un carton sans adresse.',
            'Le patron répond par grognements mais laisse prendre du carburant.',
            'Méfiez-vous des câbles dénudés derrière la vieille porte.'
          ]
        },
        crewz: {
          label: 'Crewz · Tripots Botaniques',
          texts: [
            'Dans l’arrière-salle humide, des céphalopodes réparent la tôle avec de l’algue sombre.',
            'Une serre enfumée renferme de précieux condensateurs d’hyper-saut.',
            'Des fioles vertes alignées sur le bar promettent de remettre la coque d’aplomb.',
            'Un patron discret vous glisse un paquet de provisions sans poser de questions.',
            'L’air sent le thé fort et le mystère.',
            'Ne touchez pas aux plantes du fond : elles mordent les curieux.'
          ]
        },
        golem: {
          label: 'Golem · Entrepôts de Pierre',
          texts: [
            'Des gros bras en basalte gardent des caisses scellées sur le quai désert.',
            'Des lingots de carburant solide et des cristaux de saut dorment sous bâche.',
            'Des plaques d’acier sombre prêtes à renforcer le Marlowe-9.',
            'Une porte de coffre entrouverte laisse passer une lueur bleue.',
            'Personne ne surveille — ou alors celui qui surveille ne respire pas.',
            'Un piège à ressorts veille peut-être au fond du dernier casier.'
          ]
        }
      }
    },
    anomalies: {
      types: {
        blocage: {
          label: 'Blocage · Barrage de Police',
          titles: ['Barrage Rouillé', 'Pluie Acide', 'Vent Coupant', 'Drones de Ronde', 'Ruelle Sombre', 'Pavés Glissants'],
          texts: [
            'Un fourgon bloque la ruelle ; un petit arrangement fiable à 95 % ouvre la voie.',
            'La pluie d’ions brouille la vue ; troquez proprement pour continuer.',
            'Un courant d’air glacial pousse le croiseur : équilibrez vos poches.',
            'Des projecteurs balayent la rue ; une petite transaction calme la patrouille.',
            'Un recoin d’ombre propose un échange équitable sans histoire.',
            'Passez sans faire de vagues grâce à un troc quasi sûr.'
          ]
        },
        surnature: {
          label: 'SurNature · Arrière-Salle',
          titles: ['Fourgon Suspect', 'Cercle Clandestin', 'Sous-Sol', 'Serre Privée', 'Deux Enseignes', 'Comptoir de Nuit'],
          texts: [
            'Un chauffeur en chapeau baisse sa vitre et propose un pari risqué.',
            'Un cercle privé suspendu dans le noir paie à deux contre un.',
            'Un sous-sol éclairé d’une ampoule nue mise sur vos réserves.',
            'Un trafiquant discret vend de l’hyper-espace sous le manteau.',
            'Deux ombres sous un porche lancent les dés dans le brouillard.',
            'Un barman essuie un verre et vous lance : « Tu tentes ta chance, privé ? »'
          ]
        },
        dramaboss: {
          label: 'DramaBoss · Gros Coup',
          titles: ['Le Parrain Blanc', 'La Douane Sèche', 'Le Masque Noir', 'Coup Monté', 'L’Accord Opaque', 'Le Juge Corrompu'],
          texts: [
            'Un grand patron propose un coup énorme à 38 % de réussite.',
            'Tout miser sur une seule carte pourrait vous payer la retraite.',
            'Une silhouette dans la voiture noire tend une mallette fermée.',
            'L’alarme menace de sonner à la moindre erreur — jackpot ou déroute.',
            'Un pacte d’ombre réclame du cran et du capital immédiat.',
            'Le Juge Corrompu fait sauter sa pièce d’argent dans le faisceau du phare.'
          ]
        }
      }
    },
    events: [
      {
        id: 'polar_1',
        title: 'Témoin Nerveux Sous un Réverbère Mort',
        text: 'Une ombre en manteau trop grand vous fait signe depuis un astéroïde : « Détective, j’ai des tuyaux, mais j’ai les mains gelées. »',
        choices: [
          {
            label: 'Lui laisser un peu de carburant pour son réchaud',
            cost: { fuel: 3 },
            effect: { scan: 5 },
            resultText: 'Il vous griffonne toutes les balises du secteur sur un bout de journal (+5 Scan).'
          },
          {
            label: 'Noter sa déposition et lui souhaiter bonne nuit',
            cost: null,
            effect: { t2s: 4 },
            resultText: 'Une piste de plus dans le carnet (+4 T2s).'
          }
        ]
      },
      {
        id: 'polar_2',
        title: 'Valise Abandonnée sur le Quai',
        text: 'Une valise en cuir râpé flotte sous la pluie d’ions. Aucun nom sur l’étiquette.',
        choices: [
          {
            label: 'Crocheter la serrure à l’ancienne',
            cost: null,
            effect: { fuel: 4 },
            resultText: 'Quatre flasques de carburant de contrebande impeccables (+4 Fuel).'
          },
          {
            label: 'L’examiner aux rayons avant d’ouvrir',
            cost: { scan: 2 },
            effect: { coque: 3, lum: 1 },
            resultText: 'Vous désamorcez le loquet et trouvez des plaques + un éclat lumineux (+3 Coque, +1 Lum).'
          }
        ]
      },
      {
        id: 'polar_3',
        title: 'Contravention de Stationnement Galactique',
        text: 'Un agent glisse un papier rose sous votre essuie-glace : « Stationnement gênant dans le vide depuis 19 minutes. »',
        choices: [
          {
            label: 'Contester avec un discours de trois heures',
            cost: null,
            effect: { t2s: 3 },
            resultText: 'L’agent s’endort sur son carnet. Vous repartez tranquille (+3 T2s).'
          },
          {
            label: 'Régler l’amende en énergie pour avoir la paix',
            cost: { fuel: 2 },
            effect: { shield: true },
            resultText: 'Vous obtenez un laissez-passer tamponné qui bloque le prochain ennui (Bouclier Lum).'
          }
        ]
      },
      {
        id: 'polar_4',
        title: 'Vieux Café Ouvert Tard',
        text: 'Un néon rouge « CHEZ LOU » clignote encore. L’odeur de café brûlé vous remet les idées en place.',
        choices: [
          {
            label: 'Prendre un café noir gratuit au comptoir',
            cost: null,
            effect: { coque: 2, fuel: 2 },
            resultText: 'Le patron vous refile deux bidons et un coup de chiffon (+2 Coque, +2 Fuel).'
          },
          {
            label: 'Acheter l’ancien réservoir sous le bar',
            cost: { coque: 2 },
            effect: { hyper: 1 },
            resultText: 'Un vieux module HyperJump encore en parfait état (+1 Hyper).'
          }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 8. BIO-SF ORGANIQUE — Symbiose dans le Système Nerveux d'un Léviathan
  // --------------------------------------------------------------------------
  {
    id: 'mycelium',
    code: 'MYC',
    name: 'L’Éveil du Léviathan',
    genre: 'Bio-SF Organique & Symbiose',
    accent: '#2dd4bf',
    shipName: 'Spore Hypha-0',
    intro: {
      kicker: 'Synapse Périphérique · Tissus Endormis',
      title: 'SPAWN · HYPHA-0',
      lead: 'Vous êtes Hypha-0, une petite spore consciente dérivant à l’intérieur du système nerveux gigantesque d’un Léviathan stellaire. Le géant dort depuis des millénaires, engourdi dans les tissus froids de ForgotLands.',
      sub: 'Les étoiles sont des synapses numérotées. Faites glisser l’espace pour faire rebondir votre membrane sur les parois cellulaires et rejoignez le Cœur en (0, 0) pour réveiller l’organisme.',
      btnStartNew: 'Émettre la première impulsion',
      btnResumeSave: 'Reprendre la symbiose'
    },
    zones: {
      cosm: {
        name: 'Centre SpaceGate · Le Cœur Myocardique',
        shortName: 'Cœur · (0, 0)',
        ambient: [
          'Des parois nacrées battent très lentement, à raison d’un battement par heure.',
          'Les cellules gardiennes ONU ont isolé les quatre cinquièmes du corps pour protéger le Cœur d’une fièvre ancienne.',
          'Chaque impulsion électrique résonne comme un tambour d’eau chaude.',
          'L’ordre organique règne ici dans une symétrie vivante parfaite.',
          'De fins vaisseaux sanguins lumineux mènent tout droit au noyau central.',
          'Un frisson doux parcourt la membrane de Hypha-0.'
        ]
      },
      dream: {
        name: 'Middle Dream · Les Lymphes Rêveuses',
        shortName: 'Lymphes Rêveuses',
        ambient: [
          'Des courants turquoise et violets transportent les souvenirs oniriques du Léviathan.',
          'Les symbiotes Crewz cultivent des enzymes rares et adorent les échanger contre des protéines venues d’ailleurs.',
          'Plus vous transportez une enzyme loin de sa glande d’origine, plus sa réaction chimique s’enrichit.',
          'Des bulles irisées montent lentement vers la membrane supérieure.',
          'Une musique cellulaire berce votre navigation.',
          'Les tissus respirent avec une douceur hypnotique.'
        ]
      },
      forgot: {
        name: 'ForgotLands · Les Nerfs Engourdis',
        shortName: 'Nerfs Engourdis',
        ambient: [
          'Aux extrémités du géant, la circulation stagne dans une pénombre tiède.',
          'Les globules mécaniques Boltz nettoient patiemment les dépôts anciens.',
          'Quand Hypha-0 frôle le bord du champ, l’élasticité de la membrane la propulse vers l’intérieur.',
          'Des fourmillements électriques réveillent peu à peu les capteurs.',
          'Chaque cellule porte encore de précieuses gouttes de glucose énergétique.',
          'Le géant attend un signal clair pour se remettre en marche.'
        ]
      },
      out: {
        name: 'Out Multivac · L’Épiderme du Cosmos',
        shortName: 'Épiderme Multivac',
        ambient: [
          'Vous atteignez la peau extérieure du Léviathan, là où il touche le champ IA de Multivac.',
          'Des terminaisons nerveuses perçoivent le chant des étoiles extérieures.',
          'Le géant et l’univers semblent rêver dans la même langue chimique.',
          'Des spores libres flottent dans la membrane cosmique.',
          'Un murmure symbiotique vous invite à regarder plus loin.',
          'Nulle limite entre l’être vivant et l’espace qui le porte.'
        ]
      }
    },
    chapters: {
      intro: {
        kicker: 'Impulsion 0 · Engourdissement',
        title: 'Un léger fourmillement',
        text: 'Hypha-0 s’éveille dans un nerf engourdi de ForgotLands. Vos réserves de glucose (Fuel) sont modestes, mais une première synapse brille tout près.',
        unlockText: 'Débloque : Déplacement local (Fuel) et Lecture de proximité.',
        whisper: 'Rejoignez la synapse toute proche pour lire son signal.'
      },
      star1: {
        kicker: 'Impulsion 1 · Première Synapse',
        title: 'Un code neural en spirale',
        text: 'La synapse pulse un chiffre précis : tout le système nerveux est numéroté en spirale depuis le Cœur ! En glissant le champ contre les bords, votre membrane élastique sait rebondir.',
        unlockText: 'Débloque : Coque (rebond bord-de-cadre), Scan, T2s, Lum et Journal de bord.',
        whisper: 'Activez une seconde synapse pour trouver dans quel sens le signal descend vers le Cœur.'
      },
      star2: {
        kicker: 'Impulsion 2 · Vers le Myocarde',
        title: 'Suivre la Décharge',
        text: 'Les chiffres décroissent vers le point (0, 0) : c’est là que bat faiblement le Cœur du Léviathan ! Vos cils libèrent la propulsion rapide HyperJump.',
        unlockText: 'Débloque : HyperJump (sauts de 14–19 cases) et Recycleur T2s.',
        whisper: 'Remontez les tissus jusqu’au Cœur en (0, 0).'
      },
      reachDream: {
        kicker: 'Tissu · Lymphes Rêveuses',
        title: 'Le Rêve du Géant',
        text: 'Les lymphes violettes vous accueillent. Les symbiotes Crewz proposent de troquer des enzymes : plus elles voyagent loin, plus leur valeur biologique augmente.',
        unlockText: 'Débloque : LocatStar et Commerce d’artefacts.',
        whisper: 'Continuez vers le Cœur central sous l’anneau 14.'
      },
      reachCosm: {
        kicker: 'Tissu · Cœur Myocardique',
        title: 'Les Valves Blanches',
        text: 'Vous traversez les valves immaculées du Cœur. Une membrane protectrice en Lum enveloppe aussitôt Hypha-0.',
        unlockText: 'Débloque : Bouclier Lum (absorbe le prochain choc).',
        whisper: 'Posez-vous exactement au centre (0, 0) du Cœur.'
      },
      reachOut: {
        kicker: 'Frontière · Épiderme Multivac',
        title: 'Au Contact de l’Extérieur',
        text: 'Vous effleurez la peau même du Léviathan, baignée par les ondes de Multivac.',
        unlockText: 'Observation enregistrée dans le Journal.',
        whisper: null
      },
      reachCenter: {
        kicker: 'Impulsion 3 · Cœur (0, 0)',
        title: 'L’Hibernation des Quatre Cinquièmes',
        text: 'Le Cœur répond par une onde chaude : le système immunitaire avait endormi les quatre cinquièmes extérieurs pendant une fièvre millénaire. Vos réserves se rechargent à bloc — mais le nerf #500 reste totalement insensible.',
        unlockText: 'Plein complet ! Débloque : Boussoles (B·0, B·400, B·500) et Saut Balisé Go·0.',
        whisper: 'Suivez B·500 pour stimuler le nerf bloqué #500 à l’extrémité du corps.'
      },
      reach512: {
        kicker: 'Impulsion 4 · Glande #500',
        title: 'Le Symbiote Krel & ses Globules',
        text: 'Sur #500, le chercheur symbiotique Krel tente de réveiller deux calculs minéraux figés entourés de trois blobs gélatineux. « Il faut réaligner les synapses ! Retournez au nœud #400 voir les réparateurs Monopodes ! »',
        unlockText: 'Débloque : Saut Balisé Go·500 (1 Hyper).',
        whisper: 'Suivez B·400 pour revenir au nœud #400.'
      },
      reach204: {
        kicker: 'Impulsion 5 · Nœud #400',
        title: 'La Plasticité Synaptique',
        text: 'Les cellules réparatrices de #400 révèlent un secret biologique : on peut faire glisser une synapse d’une case pour recréer de nouveaux circuits, et régénérer tout un tissu grâce au Scan !',
        unlockText: 'Débloque : REFILL16 sur étoile (-12 Scan) et Poussée d’étoile.',
        whisper: 'Poussez la synapse #400, puis allez pousser la Sentinelle #1 et #500.'
      },
      Tuch204: {
        kicker: 'Impulsion 6 · Saut Neural #400',
        title: 'Décharge Libre',
        text: 'En déplaçant #400 d’une case, un réflexe spontané s’éveille : Hypha-0 peut maintenant bondir aléatoirement partout dans le corps.',
        unlockText: 'Débloque : Saut Balisé Go·RND (1 Hyper).',
        whisper: 'Il reste à pousser la Sentinelle #1 (près du Cœur) et #500.'
      },
      Tuch1: {
        kicker: 'Impulsion 7 · Saut Neural #1',
        title: 'Le Nerf du Cortex',
        text: 'Lorsque #1 glisse d’une case, une voie nerveuse dorée s’allume en direction du Cortex #256, siège de l’Onubis.',
        unlockText: 'Débloque : Boussole B·256.',
        whisper: 'Suivez B·256 vers le Cortex #256 ou terminez d’abord #500.'
      },
      tuch512: {
        kicker: 'Impulsion 8 · Saut Neural #500',
        title: 'La Mémoire Minérale',
        text: 'Les deux calculs de Krel libèrent une hormone ancienne : « Les Golems calciques ont migré vers le Centre Symbiotique #3030 pour dialoguer avec Multivac. »',
        unlockText: 'Débloque : Boussole B·714 (Centre #3030).',
        whisper: 'Suivez B·714 vers le Centre #3030 ou B·256 vers l’Onubis.'
      },
      reach256_WIN1: {
        kicker: 'Fin 1 / 2 · L’Onubis (#256)',
        title: 'La Conscience Éveillée',
        text: 'Dans le Cortex doré, l’Onubis ouvre ses yeux de lumière liquide : « Le Léviathan se réveille enfin, petite spore, grâce à ton équilibre parfait. Prends la graine RESEED pour éveiller un nouvel être-monde quand tu le voudras. »',
        unlockText: 'Débloque : Go·400 et RESEED (engendrer une nouvelle spirale).',
        whisper: 'Réveil 1 accompli ! Rejoignez B·714 pour la seconde fin, ou tentez un RESEED.'
      },
      reach714_WIN2: {
        kicker: 'Fin 2 / 2 · Symbionte #3030',
        title: 'Symbiose Parfaite',
        text: 'Au carrefour #3030, les Golems minéraux et les filaments de Multivac entrent en résonance totale. Chaque tissu de l’organisme peut désormais être régénéré à volonté !',
        unlockText: 'Débloque : REFILL16 libre n’importe où sur la grille !',
        whisper: 'Symbiose complète. Explorez librement ou renaissez via RESEED.'
      }
    },
    specials: {
      center: {
        kicker: 'Myocarde · (0, 0)',
        title: 'Nœud Sinusal · Point Zéro',
        first: 'Une chambre nacrée bat très lentement dans une paix profonde.',
        revisit: 'Le pouls du Léviathan devient plus ferme à chacune de vos visites.'
      },
      star400: {
        first: 'Votre nerf d’origine (#400), peuplé de réparateurs cellulaires agiles.',
        afterCenter: 'Les réparateurs étirent leurs filaments : prêts à déplacer les synapses !',
        pushed: 'La synapse #400 vibre sur sa nouvelle gaine, plus conductrice que jamais.'
      },
      star500: {
        first: 'Sur #500, le symbiote Krel masse deux calculs silencieux sous les rires des blobs.',
        pushed: 'En bougeant #500, une trace chimique désigne #3030.'
      },
      star1: {
        first: 'La valve Sentinelle #1 protège le Cœur de toute décharge brutale.',
        pushed: 'La valve s’ouvre et révèle le nerf doré du Cortex (#256).'
      },
      star256: {
        first: 'Le Cortex #256 baigne dans un fluide tiède où flottent des pensées embryonnaires.',
        afterWin: 'L’Onubis respire en rythme avec tout le corps éveillé.'
      },
      embassy3030: {
        kicker: 'Carrefour · %510510',
        title: 'Centre Symbiotique #3030',
        first: 'Golems de calcium et mycélium cosmique échangent des signaux chimiques lumineux.',
        afterWin: 'Chaque cellule du Léviathan vous reconnaît comme son messager vital.'
      }
    },
    starNames: {
      1: 'Synapse #1 · Valve du Cœur',
      256: 'Synapse #256 · Cortex Onubis',
      400: 'Synapse #400 · Nerf Natal',
      500: 'Synapse #500 · Glande de Krel'
    },
    stars: {
      prefixes: ['Synapse', 'Axone', 'Ganglion', 'Glande', 'Noyau', 'Cortex', 'Vésicule', 'Alvéole', 'Membrane', 'Spore', 'Fibre', 'Valve', 'Pulpe', 'Lymphe', 'Bourgeon', 'Plexus'],
      suffixes: ['Calme', 'Tactile', 'Éveillée', 'Dorée', 'Tiède', 'Sensible', 'de Nacré', 'Vivante', 'Rapide', 'Profonde', 'Chaude', 'Douce', 'Lumineuse', 'Claire', 'Poreuse', 'Rythmée'],
      flavors: [
        'Une impulsion électrique tiède caresse la membrane de Hypha-0.',
        'De minuscules vésicules dorées transportent des souvenirs d’océans anciens.',
        'On entend le battement lointain du Cœur résonner dans les parois.',
        'La synapse scintille doucement chaque fois que le géant rêve d’une étoile.',
        'Une brume chimique parfumée recharge légèrement vos cils moteurs.',
        'Les tissus voisins vibrent d’une impatience joyeuse.'
      ]
    },
    planets: {
      archetypes: {
        boltz: {
          label: 'Boltz · Globules Mécaniques',
          texts: [
            'Des globules ouvriers stockent du glucose énergétique dans de petites poches propres.',
            'Un amas cellulaire libère des réserves tièdes pour soutenir votre membrane.',
            'Des vésicules intactes attendent d’être absorbées.',
            'Deux poches nourricières pour une enzyme un peu piquante : c’est la biologie !',
            'Un dépôt organique réchauffe instantanément vos propulseurs.',
            'Attention aux vieilles toxines piégées dans la dernière membrane.'
          ]
        },
        crewz: {
          label: 'Crewz · Glandes Réparatrices',
          texts: [
            'Les symbiotes Crewz sécrètent un gel cicatrisant qui répare toute brèche de coque.',
            'Des cristaux d’hyper-impulsion se forment dans le suc bleu de cette glande.',
            'Une poche de sérum tiède redonne toute son élasticité à Hypha-0.',
            'Les cellules amies offrent généreusement leurs réserves aux spores voyageuses.',
            'Une flore interne brille doucement en libérant du fluide vital.',
            'Évitez juste de réveiller les cils urticants du fond.'
          ]
        },
        golem: {
          label: 'Golem · Concrétions Calcaires',
          texts: [
            'Des cristaux minéraux stockent l’énergie électrique comme des piles naturelles.',
            'Des plaques de nacre solide renforcent votre enveloppe protectrice.',
            'Une veine calcique renferme de rares noyaux d’hyper-conductivité.',
            'Les concrétions vibrent à basse fréquence pour stimuler la membrane.',
            'Un gisement pur brille sous une fine couche d’eau claire.',
            'Certains cristaux piquent un peu si on les récolte trop vite.'
          ]
        }
      }
    },
    anomalies: {
      types: {
        blocage: {
          label: 'Blocage · Contraction Musculaire',
          titles: ['Spasme Tissulaire', 'Pluie de Globules', 'Flux Lymphatique', 'Essaim d’Anticorps', 'Poche de Gaz', 'Paroi Tendue'],
          texts: [
            'Une fibre contractée bouche le vaisseau ; un échange sûr à 95 % détend le passage.',
            'Une nuée de globules blancs s’interroge : un petit troc prouve vos bonnes intentions.',
            'Un reflux lymphatique vous pousse : profitez-en pour équilibrer vos réserves.',
            'Des anticorps curieux tournent autour de vous ; une enzyme apaisante calme le jeu.',
            'Une poche organique propose une conversion propre sans heurt.',
            'Le tissu frémit : un échange mesuré stabilise tout le secteur.'
          ]
        },
        surnature: {
          label: 'SurNature · Zone Onirique',
          titles: ['Courant Chaud', 'Bulle de Rêve', 'Cavité Calme', 'Fleur Neurale', 'Deux Vaisseaux', 'Nœud de Soie'],
          texts: [
            'Un flux d’endorphines propose un échange avantageux aux spores audacieuses.',
            'Une bulle de rêve flottante multiplie les réserves contre un risque mesuré.',
            'Une cavité tiède invite à miser sur le prochain battement du Cœur.',
            'Une fleur neurale distille des impulsions d’hyper-saut contre tribut.',
            'Deux vaisseaux jumeaux jouent le débit à deux contre un.',
            'Un carrefour apaisé propose un pari doux-amer.'
          ]
        },
        dramaboss: {
          label: 'DramaBoss · Réflexe Brutal',
          titles: ['Le Grand Anticorps', 'La Fièvre Blanche', 'Le Masque Cellulaire', 'Onde Sismique', 'Le Choix du Cortex', 'Le Juge Chimique'],
          texts: [
            'Un anticorps géant propose un duel biochimique : 38 % de chance d’un festin royal.',
            'Une bouffée de fièvre menace le secteur : misez gros pour en tirer un trésor.',
            'Une membrane fermée attend votre mise sans laisser voir l’issue.',
            'Une décharge soudaine promet une abondance folle ou une perte sèche.',
            'Le Cortex demande un sacrifice immédiat pour déclencher le grand éveil.',
            'Le Juge Chimique libère deux molécules : à vous de choisir votre destin.'
          ]
        }
      }
    },
    events: [
      {
        id: 'myc_1',
        title: 'Frisson Électrique dans l’Axone',
        text: 'Une belle onde nerveuse bleue arrive derrière vous à vive allure. Elle peut vous porter loin ou alimenter vos capteurs.',
        choices: [
          {
            label: 'Surfer sur l’onde sans dépenser d’énergie',
            cost: null,
            effect: { fuel: 5 },
            resultText: 'Vous glissez sur cinq cases d’élan gratuit (+5 Fuel).'
          },
          {
            label: 'Absorber une part de l’impulsion pour vos cils',
            cost: { coque: 1 },
            effect: { hyper: 1, scan: 3 },
            resultText: 'Vos cils chargent un saut subspatial complet (+1 Hyper, +3 Scan).'
          }
        ]
      },
      {
        id: 'myc_2',
        title: 'Globule Messager Égaré',
        text: 'Un petit globule rond tourne en rond avec une lettre chimique entre ses pinces : « Où est le foie ? »',
        choices: [
          {
            label: 'Le guider avec une impulsion de Scan',
            cost: { scan: 2 },
            effect: { lum: 1, fuel: 4 },
            resultText: 'Il retrouve son chemin et vous laisse une goutte lumineuse (+1 Lum, +4 Fuel).'
          },
          {
            label: 'Lui tapoter gentiment la membrane',
            cost: null,
            effect: { t2s: 4 },
            resultText: 'Il repart plein d’entrain (+4 T2s).'
          }
        ]
      },
      {
        id: 'myc_3',
        title: 'Souvenir d’un Océan Ancien',
        text: 'Une bulle de mémoire éclate doucement devant Hypha-0, libérant une chaleur salée et apaisante.',
        choices: [
          {
            label: 'Baigner la membrane dans ce souvenir tiède',
            cost: null,
            effect: { coque: 3 },
            resultText: 'Votre enveloppe retrouve toute sa souplesse (+3 Coque).'
          },
          {
            label: 'Tisser la bulle en couche protectrice',
            cost: { fuel: 3 },
            effect: { shield: true },
            resultText: 'Un voile de lumière cellulaire entoure Hypha-0 (Bouclier Lum activé).'
          }
        ]
      },
      {
        id: 'myc_4',
        title: 'Bourgeon de Réserve Oublié',
        text: 'Une petite poche de sucre doré pend intacte sur une paroi calme.',
        choices: [
          {
            label: 'Prélever juste ce qu’il faut pour la route',
            cost: null,
            effect: { fuel: 3, scan: 2 },
            resultText: 'Réserve proprement assimilée (+3 Fuel, +2 Scan).'
          },
          {
            label: 'Stimuler tout le bourgeon avec du T2s',
            cost: { t2s: 5 },
            effect: { fuel: 6, coque: 3 },
            resultText: 'Le bourgeon double sa production d’un coup (+6 Fuel, +3 Coque).'
          }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 9. PARADOXE TEMPOREL — Comédie des Lignes du Temps & Dinosaures en Scaphandre
  // --------------------------------------------------------------------------
  {
    id: 'paradoxe',
    code: 'PAR',
    name: 'Jeudi Prochain en Double File',
    genre: 'Comédie Temporelle & Paradoxes',
    accent: '#f472b6',
    shipName: 'Déjà-Vu II',
    intro: {
      kicker: 'Date Estimée · Hier Matin (ou Mardi 4000)',
      title: 'SPAWN · DÉJÀ-VU',
      lead: 'Vous avez répondu à un appel de détresse urgent passé par… vous-même depuis jeudi prochain, juste pour vous prévenir de ne surtout pas prendre ce raccourci. Trop tard : votre vaisseau Déjà-Vu II vient de caler dans ForgotLands.',
      sub: 'Votre ordinateur de bord jure qu’il a déjà lu ce paragraphe demain. Faites glisser la carte contre les bords pour rebondir entre les époques et retrouvez le Bureau Central des Horloges en (0, 0).',
      btnStartNew: 'Régler la montre sur maintenant',
      btnResumeSave: 'Revenir au moment d’avant'
    },
    zones: {
      cosm: {
        name: 'Centre SpaceGate · Police du Calendrier',
        shortName: 'Police Calendrier',
        ambient: [
          'Ici les horloges battent à l’envers le mardi pour rattraper le retard administratif du lundi.',
          'La Police du Calendrier a mis les quatre cinquièmes extérieurs entre parenthèses « jusqu’à ce que le passé se calme ».',
          'Des panneaux avertissent : « INTERDIT DE SE DOUBLER SOI-MÊME SUR LA VOIE DE GAUCHE. »',
          'Une pendule coucou orbitale sonne treize heures moins le quart.',
          'L’air sent le papier d’agenda neuf et le café de demain matin.',
          'Plus vous approchez de (0, 0), plus vos souvenirs deviennent précis sur ce qui va arriver.'
        ]
      },
      dream: {
        name: 'Middle Dream · Brocante des Siècles Crewz',
        shortName: 'Brocante Siècles',
        ambient: [
          'Des dinosaures en scaphandre sirotent du thé au jasmin avec des jardiniers Crewz en attendant le Crétacé suivant.',
          'Les brocanteurs Crewz rachètent des objets tout neufs à condition qu’ils aient déjà voyagé loin.',
          'Des horloges molles pendent aux branches des cosmoplantes comme des crêpes au soleil.',
          'Un haut-parleur annonce : « Objets perdus demain : merci de les déposer hier. »',
          'Une pluie de confettis de calendrier dérive dans la brume violette.',
          'Ici, même les erreurs de calcul finissent par tomber juste deux fois par jour.'
        ]
      },
      forgot: {
        name: 'ForgotLands · Le Tiroir des Jeudis Perdus',
        shortName: 'Jeudis Perdus',
        ambient: [
          'C’est ici qu’atterrissent les chaussettes spatiales, les tickets périmés et les promesses du Nouvel An.',
          'Des automates Boltz à remontoir réparent des réveils qui sonnent toujours cinq minutes trop tôt.',
          'Quand le Déjà-Vu II touche le bord du cadre, l’élan temporel le projette au milieu du secteur suivant.',
          'Vous croisez parfois l’écho de votre propre klaxon datant d’il y a dix minutes.',
          'Des épaves de machines à remonter le temps en kit jonchent le bas-côté.',
          'La poussière d’ambre porte encore l’empreinte de semelles très anciennes et très futures.'
        ]
      },
      out: {
        name: 'Out Multivac · Hors-Temps',
        shortName: 'Hors-Temps Multivac',
        ambient: [
          'Au-delà de l’anneau 72, la semaine ne compte plus que des dimanches après-midi flottants.',
          'Multivac y classe toutes les blagues jamais racontées par ordre chronologique inversé.',
          'Votre montre affiche « PEUT-ÊTRE » au lieu de l’heure.',
          'Des spores de données vous demandent si c’était bien hier que vous êtes arrivé demain.',
          'Aucun gendarme temporel n’a jamais réussi à trouver ce secteur sur son agenda.',
          'Ici commence le week-end éternel de l’univers.'
        ]
      }
    },
    chapters: {
      intro: {
        kicker: 'Mardi · Tiroir des Jeudis Perdus',
        title: 'Vous avez un message de vous-même',
        text: '« Salut, c’est toi de jeudi. J’espère que tu as du carburant, parce que j’ai déjà oublié où on s’est garés. » Heureusement, une balise-horloge clignote à quatre cases.',
        unlockText: 'Débloque : Déplacement local (Fuel) et Lecture de proximité.',
        whisper: 'Rejoignez la balise voisine avant qu’elle ne change de fuseau horaire.'
      },
      star1: {
        kicker: 'Étape 1 · Première Horloge',
        title: 'Un numéro d’ordre chronologique !',
        text: 'L’étoile affiche un numéro sur le cadran en spirale ! « Regarde, lance votre copie de bord : si on pousse la carte contre le bord du cadre, la coque rebondit à travers les minutes ! »',
        unlockText: 'Débloque : Coque (rebond bord-de-cadre), Scan, T2s, Lum et Journal de bord.',
        whisper: 'Trouvez une deuxième horloge pour vérifier dans quel sens les numéros reculent.'
      },
      star2: {
        kicker: 'Étape 2 · Rembobinage vers (0, 0)',
        title: 'Plus bas le chiffre, plus près le Présent !',
        text: 'Les numéros décroissent droit vers le Centre (0, 0) : c’est là que la Police du Calendrier garde le Fuseau Principal ! Votre moteur débloque l’HyperJump.',
        unlockText: 'Débloque : HyperJump (sauts de 14–19 cases) et Recycleur T2s.',
        whisper: 'Foncez vers le Bureau Central en (0, 0) avant la fermeture des guichets.'
      },
      reachDream: {
        kicker: 'Frontière · Brocante des Siècles',
        title: 'Les Dinosaures en Théorie',
        text: 'Vous entrez dans Middle Dream : un T-Rex en scaphandre de jardinier Crewz vous fait signe ! Les brocanteurs achètent vos souvenirs locaux à prix d’or si vous les revendez loin.',
        unlockText: 'Débloque : LocatStar et Commerce d’artefacts.',
        whisper: 'Continuez vers le cœur blanc sous l’anneau 14.'
      },
      reachCosm: {
        kicker: 'Frontière · Police du Calendrier',
        title: 'Contrôle des Montres',
        text: 'Tout tic-tac s’aligne soudain sur le métronome officiel. Vous récupérez un Bouclier Lum dans la boîte des objets trouvés d’avance.',
        unlockText: 'Débloque : Bouclier Lum (absorbe le prochain paradoxe).',
        whisper: 'Présentez-vous au Bureau Central en (0, 0).'
      },
      reachOut: {
        kicker: 'Frontière · Hors-Temps',
        title: 'Au-Delà du Calendrier',
        text: 'Votre agenda vient de devenir blanc pour les dix prochains siècles. Multivac vous souhaite un bon dimanche.',
        unlockText: 'Observation enregistrée dans le Journal.',
        whisper: null
      },
      reachCenter: {
        kicker: 'Étape 3 · Bureau (0, 0)',
        title: 'La Quarantaine de Mardi Dernier',
        text: 'L’inspecteur en chef ajuste trois montres à gousset : « Ah, vous voilà déjà ! Les 4/5 extérieurs ont été mis en pause mardi il y a 4000 ans parce que quelqu’un avait renversé son café sur l’éphéméride. Prenez le plein complet… et retrouvez votre double coincé sur #500 ! »',
        unlockText: 'Plein complet ! Débloque : Boussoles (B·0, B·400, B·500) et Saut Balisé Go·0.',
        whisper: 'Suivez B·500 pour retrouver votre double et Krel tout au bord de l’horloge.'
      },
      reach512: {
        kicker: 'Étape 4 · Impasse #500',
        title: 'Le Professeur Krel, Votre Double & deux Fossiles',
        text: 'Sur #500, le professeur Krel discute avec votre propre sosie de jeudi dernier et trois blobs qui changent de couleur selon l’heure. « Nos deux cailloux jurassiques n’ont pas de billet retour ! Foncez au garage #400 voir les Monopodes ! »',
        unlockText: 'Débloque : Saut Balisé Go·500 (1 Hyper).',
        whisper: 'Suivez B·400 pour rentrer à votre garage d’hier (#400).'
      },
      reach204: {
        kicker: 'Étape 5 · Garage #400',
        title: 'La Clé à Molette Temporelle',
        text: 'Les mécaniciens Monopodes de #400 rigolent bien : « Facile ! On peut décaler une étoile d’une seconde-case sur la spirale — ça recale tout le calendrier ! Et avec 12 Scan, on remet à zéro les gisements du quartier ! »',
        unlockText: 'Débloque : REFILL16 sur étoile (-12 Scan) et Poussée d’étoile.',
        whisper: 'Poussez l’étoile #400, puis allez pousser la Sentinelle #1 et #500.'
      },
      Tuch204: {
        kicker: 'Étape 6 · Décalage #400',
        title: 'L’Heure d’Été Cosmique',
        text: 'DING-DONG ! En poussant #400 d’une case, vous venez d’inventer l’heure d’été galactique : le Déjà-Vu II peut maintenant sauter n’importe où !',
        unlockText: 'Débloque : Saut Balisé Go·RND (1 Hyper).',
        whisper: 'Il reste à décaler la Sentinelle #1 (près du Centre) et #500.'
      },
      Tuch1: {
        kicker: 'Étape 7 · Décalage #1',
        title: 'La Trappe du Grand Horloger',
        text: 'Lorsque #1 glisse d’une case, un mécanisme caché pointe droit vers l’Horloger Onubis, installé à la demi-heure #256.',
        unlockText: 'Débloque : Boussole B·256.',
        whisper: 'Suivez B·256 vers l’Onubis ou filez pousser #500.'
      },
      tuch512: {
        kicker: 'Étape 8 · Décalage #500',
        title: 'Le Congrès des Temps Perdus',
        text: 'Les deux fossiles de Krel ouvrent un œil endormi : « Tous les Golems en avance sont partis au Bureau des Temps Perdus #3030 prendre le thé avec Multivac ! »',
        unlockText: 'Débloque : Boussole B·714 (Bureau #3030).',
        whisper: 'Suivez B·714 vers le Bureau #3030 ou B·256 vers l’Onubis.'
      },
      reach256_WIN1: {
        kicker: 'Fin 1 / 2 · L’Onubis (#256)',
        title: 'Le Maître des Jeudis',
        text: 'L’Onubis ressemble à un sablier géant qui coule vers le haut. « Félicitations : vous avez enfin bouclé la boucle sans créer de double qui se marche sur les pieds ! Prenez RESEED pour remonter une nouvelle pendule universelle ! »',
        unlockText: 'Débloque : Go·400 et RESEED (engendrer une nouvelle spirale).',
        whisper: 'Boucle 1 résolue ! Allez voir #3030 (B·714) ou cliquez RESEED.'
      },
      reach714_WIN2: {
        kicker: 'Fin 2 / 2 · Bureau #3030',
        title: 'La Carte de Temps Libre',
        text: 'Au Bureau des Temps Perdus #3030, Golems, dinosaures et spores Multivac vous décernent un abonnement illimité aux heures creuses : REFILL16 fonctionne désormais partout !',
        unlockText: 'Débloque : REFILL16 libre n’importe où sur la grille !',
        whisper: 'Le temps vous obéit. Flânez entre les siècles ou lancez un RESEED.'
      }
    },
    specials: {
      center: {
        kicker: 'Horloge Centrale · (0, 0)',
        title: 'Police du Calendrier · Point Zéro',
        first: 'Un gigantesque cadran solaire tourne au milieu du vide sans aucun soleil.',
        revisit: 'L’inspecteur vérifie sa montre puis la vôtre : « Vous avez deux minutes d’avance sur hier. »'
      },
      star400: {
        first: 'Votre garage d’hier (#400), avec le café encore chaud que vous venez de préparer demain.',
        afterCenter: 'Les Monopodes sortent les grandes pinces : prêts à recaler les horloges !',
        pushed: 'L’horloge #400 avance d’un cran en faisant coucou.'
      },
      star500: {
        first: 'Krel, trois blobs et votre double de jeudi dernier attendent devant deux cailloux préhistoriques.',
        pushed: 'En bougeant #500, un ticket d’horodateur tombe : #3030.'
      },
      star1: {
        first: 'La Sentinelle #1 veille devant le Centre en tapotant du pied.',
        pushed: 'La voilà décalée d’une minute : la route vers #256 s’illumine !'
      },
      star256: {
        first: 'L’Onubis (#256) règle doucement les sabliers de la galaxie.',
        afterWin: 'Votre propre message de jeudi prochain vient enfin d’être classé.'
      },
      embassy3030: {
        kicker: 'Bureau Caché · %510510',
        title: 'Bureau des Temps Perdus #3030',
        first: 'Un milliard de Golems y rangent soigneusement les heures de sommeil perdues.',
        afterWin: 'Désormais, vous êtes toujours à l’heure où que vous alliez.'
      }
    },
    starNames: {
      1: 'Horloge #1 · Garde-Temps',
      256: 'Horloge #256 · Sablier Onubis',
      400: 'Horloge #400 · Garage d’Hier',
      500: 'Horloge #500 · Rendez-Vous de Krel'
    },
    stars: {
      prefixes: ['Pendule', 'Sablier', 'Mardi', 'Jeudi', 'Cadran', 'Chrono', 'Tic-Tac', 'Mémo', 'Époque', 'Siècle', 'Minute', 'Aube', 'Midi', 'Instant', 'Rappel', 'Coucou'],
      suffixes: ['en Retard', 'de Demain', 'Bis', 'd’Hier', 'Furtif', 'Suspendu', 'Décalé', 'Inversé', 'Doré', 'Exact', 'Fuyant', 'de Poche', 'Doublé', 'Perdu', 'Éternel', 'Libre'],
      flavors: [
        'Votre double d’avant-hier a laissé un mot sur la carrosserie : « Pense à tourner à gauche. »',
        'L’étoile sonne douze coups alors qu’il n’est manifestement que quatre heures.',
        'Un calendrier papier de l’an 3042 tourne tranquillement en orbite.',
        'Vos horloges internes hésitent entre l’heure d’hiver et l’ère tertiaire.',
        'Une odeur de pain grillé arrive trois secondes avant que vous n’allumiez le grille-pain.',
        'Un panneau indique : « PROCHAINE ÉTOILE : DÉJÀ PASSÉE. »'
      ]
    },
    planets: {
      archetypes: {
        boltz: {
          label: 'Boltz · Horlogeries à Ressort',
          texts: [
            'Des horlogers Boltz remontent des batteries à manivelle pour la semaine prochaine.',
            'Des bidons datés de demain matin sont déjà prêts sur le quai.',
            'Une réserve intacte vous attendait avant même que vous ne décidiez de venir.',
            'Deux bons tirages pour un ressort qui remonte dans le mauvais sens.',
            'Un automate ajuste son monocle et vous sert du carburant tout frais.',
            'Attention aux vieux réveils piégés dans le tiroir du bas.'
          ]
        },
        crewz: {
          label: 'Crewz · Serres du Crétacé',
          texts: [
            'Des fougères géantes d’avant-hier fournissent une sève qui répare la coque en un clin d’œil.',
            'Un dinosaure jardinier Crewz vous tend un cristal d’hyper-saut avec ses petites pattes.',
            'Une serre hors du temps répare vos plaques avant même qu’elles ne se fissurent.',
            'Des jardiniers polis vous offrent des provisions pour hier et demain.',
            'Une brume tiède rajeunit instantanément vos joints d’étanchéité.',
            'Ne marchez pas sur les graines : elles germent en arrière.'
          ]
        },
        golem: {
          label: 'Golem · Fossiles & Quartz',
          texts: [
            'Des Golems taille-quartz fabriquent des piles atomiques pour les siècles à venir.',
            'Des veines de cristal bleu brillent dans une roche plus vieille que la lumière.',
            'Des plaques de granit poli renforcent le Déjà-Vu II à merveille.',
            'Un coffre de pierre s’ouvre pile à l’heure où vous y pensez.',
            'La roche fredonne un air que vous n’avez pas encore inventé.',
            'Gare aux éclats de quartz qui arrivent une seconde avant le coup de marteau.'
          ]
        }
      }
    },
    anomalies: {
      types: {
        blocage: {
          label: 'Blocage · Bouchon de Minuit',
          titles: ['Heure de Pointe', 'Pluie d’Agendas', 'Vent d’Hier', 'Coucous Égarés', 'Trou d’Emploi du Temps', 'Pont Instable'],
          texts: [
            'Un embouteillage de vos propres futurs bloque la voie : un échange sûr à 95 % libère la file.',
            'Des pages d’agenda pleuvent sur le pare-brise ; un petit troc nettoie l’horizon.',
            'Un courant d’air d’avant-hier pousse le vaisseau : rééquilibrez vos réserves.',
            'Des horloges à coucou tournent en rond ; un coup de main calme la pendule.',
            'Une case vide de votre emploi du temps propose une conversion propre.',
            'Un petit accord d’horaire évite un retard de quatre siècles.'
          ]
        },
        surnature: {
          label: 'SurNature · Brocante Temporelle',
          titles: ['Train de Nuit', 'Ville Éphémère', 'Abri d’Avant-Hier', 'Plante-Horloge', 'Deux Fuseaux', 'Café de Demain'],
          texts: [
            'Un train à vapeur spatiale propose un pari audacieux sur l’heure d’arrivée.',
            'Une ville qui n’existe que le jeudi offre de jolis rendements aux parieurs.',
            'Un abri enfoui dans le passé proche mise sur vos moteurs.',
            'Une plante-horloge fleurit toutes les heures avec des charges d’hyper-saut.',
            'Deux fuseaux horaires jouent votre mise à deux contre un.',
            'Le serveur du Café de Demain dit que vous avez déjà commandé un gros lot.'
          ]
        },
        dramaboss: {
          label: 'DramaBoss · Grand Paradoxe',
          titles: ['Votre Grand-Père', 'Le Sablier Vide', 'Le Masque du Temps', 'Saut d’Année Bissextile', 'L’Équation Folle', 'Le Juge Chrono'],
          texts: [
            'Une version richissime de vous-même propose un pari à 38 % de succès.',
            'Le grand sablier menace de se renverser : misez gros pour tout rafler.',
            'Un inconnu qui a exactement votre voix tend deux enveloppes fermées.',
            'Une année bissextile sauvage menace d’avaler le mardi — ou de vous couvrir d’or.',
            'Un paradoxe pur exige un sacrifice immédiat contre une envolée miraculeuse.',
            'Le Juge Chrono arrête toutes les horloges et lance sa pièce.'
          ]
        }
      }
    },
    events: [
      {
        id: 'para_1',
        title: 'Votre Double Garé en Double File',
        text: 'Un autre Déjà-Vu II identique au vôtre baisse sa vitre : « Pas le temps d’expliquer ! Tu as pris le tournevis ? »',
        choices: [
          {
            label: 'Lui lancer deux plaques de rechange par le hublot',
            cost: { coque: 2 },
            effect: { hyper: 1, t2s: 4 },
            resultText: '« Merci ! Tiens, attrape mon condensateur Hyper, j’en ai déjà un demain ! » (+1 Hyper, +4 T2s).'
          },
          {
            label: 'Lui demander les numéros du loto de jeudi',
            cost: null,
            effect: { scan: 4 },
            resultText: '« J’ai oublié le loto, mais voilà les balises du secteur ! » (+4 Scan).'
          }
        ]
      },
      {
        id: 'para_2',
        title: 'Dinosaure en Scaphandre Perdu dans le Brouillard',
        text: 'Un vélociraptor très poli portant une montre à gousset demande la direction du Jurassique supérieur.',
        choices: [
          {
            label: 'Lui offrir un peu de carburant pour sa trottinette spatiale',
            cost: { fuel: 3 },
            effect: { lum: 1, coque: 2 },
            resultText: 'Il vous salue du chapeau et vous laisse un fossile lumineux (+1 Lum, +2 Coque).'
          },
          {
            label: 'Lui montrer la carte gratuitement',
            cost: null,
            effect: { t2s: 4 },
            resultText: 'Il vous remercie en trois rugissements courtois (+4 T2s).'
          }
        ]
      },
      {
        id: 'para_3',
        title: 'Remboursement d’Une Panne Future',
        text: 'Un drone de service vous remet un colis : « Indemnisation préventive pour le petit accroc que vous aurez dans deux heures. »',
        choices: [
          {
            label: 'Accepter le kit de réparation d’avance',
            cost: null,
            effect: { coque: 3, fuel: 2 },
            resultText: 'Toujours bon à prendre avant que ça n’arrive (+3 Coque, +2 Fuel) !'
          },
          {
            label: 'Demander plutôt la couverture d’assurance complète',
            cost: { t2s: 4 },
            effect: { shield: true },
            resultText: 'Votre assurance temporelle active un Bouclier Lum préventif !'
          }
        ]
      },
      {
        id: 'para_4',
        title: 'Carte Postale Envoyée de l’An 5000',
        text: 'Une carte postale flotte contre la vitre : « Coucou de nous-mêmes ! Tout finit bien. Signé : Nous. »',
        choices: [
          {
            label: 'La lire avec émotion et économiser l’élan',
            cost: null,
            effect: { fuel: 4 },
            resultText: 'Savoir que tout ira bien allège la consommation (+4 Fuel).'
          },
          {
            label: 'Analyser le timbre avec le scanner',
            cost: { scan: 2 },
            effect: { fuel: 5, coque: 2 },
            resultText: 'Sous le timbre se cachait une pile atomique plate (+5 Fuel, +2 Coque) !'
          }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 10. MYTHOS TECHNO-FANTASY — Chevaliers de l'Éther & Dragons de Plasma
  // --------------------------------------------------------------------------
  {
    id: 'mythos',
    code: 'MYT',
    name: 'La Quête de l’Éther-Lance',
    genre: 'Techno-Fantasy & Chevalerie Astrale',
    accent: '#eab308',
    shipName: 'Nef Éther-Lance',
    intro: {
      kicker: 'Prologue · Marches des Astres Gravés',
      title: 'SPAWN · ÉTHER-LANCE',
      lead: 'Votre nef-cathédrale Éther-Lance s’est échouée dans les brumes dorées de ForgotLands après avoir poursuivi un dragon de plasma qui s’avéra être un simple feu d’artifice alchimique. Vos fioles d’éther sont presque vides.',
      sub: 'Les anciens mages ont gravé chaque étoile d’un chiffre runique. Faites glisser la carte contre les bords pour faire bondir votre carène enchantée et rejoignez le Donjon d’Origine (0, 0).',
      btnStartNew: 'Allumer les braseros de proue',
      btnResumeSave: 'Poursuivre la quête'
    },
    zones: {
      cosm: {
        name: 'Centre SpaceGate · La Citadelle de la Couronne',
        shortName: 'Couronne · (0,0)',
        ambient: [
          'Des remparts de cristal blanc entourent le point zéro comme une couronne suspendue.',
          'Les clercs de l’Ordre ONU ont scellé les quatre royaumes extérieurs sous un sortilège de stase pour calmer une ancienne querelle.',
          'Des cloches de verre tintent sans vent à l’approche des chevaliers.',
          'Chaque case porte une rune numérotée sertie d’or pur.',
          'La magie ici est nette, ordonnée et strictement tamponnée par le Grand Sénéchal.',
          'L’air sent la cire chaude et le parchemin ancien.'
        ]
      },
      dream: {
        name: 'Middle Dream · La Forêt des Alchimistes Crewz',
        shortName: 'Forêt Alchimique',
        ambient: [
          'Des arbres de verre violet distillent des élixirs d’hyper-saut sous la lueur des étoiles.',
          'Les alchimistes Crewz achètent et vendent des reliques enchantées : plus elles s’éloignent de leur source, plus leur aura s’amplifie.',
          'Des lanternes volantes suivent les nefs comme des feux follets courtois.',
          'Une harpe d’argent joue toute seule dans les hautes branches cosmiques.',
          'Des citadelles-moulins tournent lentement au milieu des brumes émeraude.',
          'Ici la science et le sortilège partagent le même grimoire.'
        ]
      },
      forgot: {
        name: 'ForgotLands · Les Landes Rouillées',
        shortName: 'Landes Rouillées',
        ambient: [
          'D’anciens chevaliers automates Boltz montent encore la garde près de tours de guet brisées.',
          'Les bourrasques d’éther claquent contre le bouclier de bois et d’acier de l’Éther-Lance.',
          'À chaque choc contre les bords du parchemin, la nef rebondit par sortilège d’élasticité.',
          'Des forges abandonnées fument doucement dans l’ambre crépusculaire.',
          'Chaque îlot conserve quelques fioles d’éther pour le pèlerin tenace.',
          'Ici commence toute grande légende.'
        ]
      },
      out: {
        name: 'Out Multivac · Les Terres sans Dragons',
        shortName: 'Confins Multivac',
        ambient: [
          'Au-delà des cartes royales s’étend le domaine brumeux du Grand Dragon de Données Multivac.',
          'Des runes inconnues dansent dans le vide comme des étincelles de forge.',
          'Multivac observe sans intervenir pendant que les étoiles récitent leurs noms secrets.',
          'Nul seigneur ne lève d’impôt au-delà de l’anneau 72.',
          'Des murmures de vieux grimoires flottent dans le silence.',
          'Ici s’écrivent les chants de demain.'
        ]
      }
    },
    chapters: {
      intro: {
        kicker: 'Chant I · Landes Rouillées',
        title: 'La Nef sans Éther',
        text: 'L’Éther-Lance dérive dans les Landes avec juste assez de flamme pour quelques lieues. Une première étoile-lanterne brille non loin de votre proue.',
        unlockText: 'Débloque : Déplacement local (Fuel) et Lecture de proximité.',
        whisper: 'Rejoignez l’étoile-lanterne voisine pour lire sa rune.'
      },
      star1: {
        kicker: 'Chant II · La Rune Gravée',
        title: 'Le Chiffre du Pèlerin',
        text: 'La couronne de l’astre porte une rune chiffrée sur la spirale des mages ! En glissant la carte jusqu’au bord, votre coque enchantée sait rebondir d’un saut souple.',
        unlockText: 'Débloque : Coque (rebond bord-de-cadre), Scan, T2s, Lum et Journal de bord.',
        whisper: 'Trouvez une deuxième rune stellaire pour deviner la route de la Citadelle (0, 0).'
      },
      star2: {
        kicker: 'Chant III · La Voie de la Couronne',
        title: 'Où décroît le Chiffre, là siège le Roi',
        text: 'Les deux runes le confirment : plus le chiffre baisse, plus le Donjon d’Origine (0, 0) est proche ! Votre timonier réveille les ailes HyperJump.',
        unlockText: 'Débloque : HyperJump (sauts de 14–19 cases) et Recycleur T2s.',
        whisper: 'Chevauchez vers la Citadelle de la Couronne en (0, 0).'
      },
      reachDream: {
        kicker: 'Marche · Forêt Alchimique',
        title: 'Les Comptoirs des Crewz',
        text: 'Vous entrez dans Middle Dream. Les alchimistes Crewz proposent leurs talismans : plus vous les portez loin de leur autel d’origine, plus leur puissance marchande grandit.',
        unlockText: 'Débloque : LocatStar et Commerce d’artefacts.',
        whisper: 'Poursuivez vers le Donjon blanc sous l’anneau 14.'
      },
      reachCosm: {
        kicker: 'Marche · Citadelle de la Couronne',
        title: 'Les Remparts de Cristal',
        text: 'Les cloches blanches sonnent votre entrée dans le sanctuaire royal. La lumière des astres forge un Bouclier Lum autour de votre proue.',
        unlockText: 'Débloque : Bouclier Lum (absorbe le prochain sort néfaste).',
        whisper: 'Frappez à la grande porte du Donjon en (0, 0).'
      },
      reachOut: {
        kicker: 'Marche · Confins Multivac',
        title: 'Hors du Parchemin Royal',
        text: 'Vous franchissez le bord de la carte enluminée. Les étincelles du Dragon Multivac saluent votre audace.',
        unlockText: 'Observation enregistrée dans le Journal.',
        whisper: null
      },
      reachCenter: {
        kicker: 'Chant IV · Donjon (0, 0)',
        title: 'Le Sortilège des Quatre Royaumes',
        text: 'Le Grand Sénéchal abaisse le pont-levis : « Un chevalier venu des quatre cinquièmes endormis ! Le roi avait jeté ce charme de stase il y a 4000 ans pour calmer une dispute de frontière… et oublié le mot de passe. Prenez le plein d’éther… et retrouvez le mage errant Krel sur #500 ! »',
        unlockText: 'Plein complet ! Débloque : Boussoles (B·0, B·400, B·500) et Saut Balisé Go·0.',
        whisper: 'Suivez B·500 pour retrouver le mage Krel tout au bout des Landes.'
      },
      reach512: {
        kicker: 'Chant V · Ermitage #500',
        title: 'Le Mage Krel & les Pierres Runiques',
        text: 'Sur #500, le vieux mage Krel médite devant deux menhirs muets et trois feux-follets gélatineux. « Ces deux pierres veulent rejoindre l’Ambassade du Dragon, mais le ciel est verrouillé ! Retournez à votre fief #400 voir les forgerons Monopodes ! »',
        unlockText: 'Débloque : Saut Balisé Go·500 (1 Hyper).',
        whisper: 'Suivez B·400 pour regagner votre fief (#400).'
      },
      reach204: {
        kicker: 'Chant VI · Fief #400',
        title: 'L’Enclume des Forgerons Monopodes',
        text: 'Vos fidèles forgerons à un pied martèlent leurs enclumes : « Un seul coup de marteau runique peut faire glisser une étoile d’une case sur la toile céleste ! Et avec 12 Scan, on ravive les terres alentour ! »',
        unlockText: 'Débloque : REFILL16 sur étoile (-12 Scan) et Poussée d’étoile.',
        whisper: 'Poussez l’étoile #400, puis allez pousser la Sentinelle #1 et #500.'
      },
      Tuch204: {
        kicker: 'Chant VII · Coup de Marteau #400',
        title: 'Le Portulan Brisé',
        text: 'CLANG ! En déplaçant #400 d’une case, vous ouvrez des portails errants : la nef peut désormais surgir au hasard sur tout l’échiquier.',
        unlockText: 'Débloque : Saut Balisé Go·RND (1 Hyper).',
        whisper: 'Il reste à déplacer la Sentinelle #1 (près du Donjon) et #500.'
      },
      Tuch1: {
        kicker: 'Chant VIII · Coup de Marteau #1',
        title: 'Le Sentier d’Or de l’Onubis',
        text: 'En poussant la Sentinelle #1, une voie d’or pur s’allume vers la Forge des Astres #256, où veille l’Onubis.',
        unlockText: 'Débloque : Boussole B·256.',
        whisper: 'Suivez B·256 vers la Forge #256 ou terminez d’abord #500.'
      },
      tuch512: {
        kicker: 'Chant IX · Coup de Marteau #500',
        title: 'Le Repaire des Golems & du Dragon',
        text: 'Les deux menhirs de Krel s’illuminent quand #500 bouge : « Le Grand Conseil des Golems et le Dragon de Plasma Multivac siègent au sanctuaire #3030 ! »',
        unlockText: 'Débloque : Boussole B·714 (Sanctuaire #3030).',
        whisper: 'Suivez B·714 vers le Sanctuaire #3030 ou B·256 vers l’Onubis.'
      },
      reach256_WIN1: {
        kicker: 'Fin 1 / 2 · L’Onubis (#256)',
        title: 'La Forge des Nouveaux Cieux',
        text: 'Dans sa forge dorée, l’Onubis bat des œufs d’éther pur sur une enclume d’émeraude : « Noble nef, tu as prouvé ta sagesse dans l’épreuve de l’équilibre. Prends le sceau RESEED pour forger un nouveau royaume quand il te plaira ! »',
        unlockText: 'Débloque : Go·400 et RESEED (engendrer une nouvelle spirale).',
        whisper: 'Quête 1 accomplie ! Rejoignez B·714 pour le Dragon de Plasma, ou tentez un RESEED.'
      },
      reach714_WIN2: {
        kicker: 'Fin 2 / 2 · Sanctuaire #3030',
        title: 'L’Alliance du Dragon et du Golem',
        text: 'Au sanctuaire #3030, le Dragon de Plasma Multivac et les chevaliers Golems vous adoubent Gardien de la Spirale. Aucune lande stérile ne résistera plus à votre souffle !',
        unlockText: 'Débloque : REFILL16 libre n’importe où sur la grille !',
        whisper: 'Légende achevée. Parcourez les cieux librement ou reforgez un monde via RESEED.'
      }
    },
    specials: {
      center: {
        kicker: 'Donjon · (0, 0)',
        title: 'Citadelle de la Couronne · Point Zéro',
        first: 'Un château de verre blanc tourne lentement au cœur du firmament.',
        revisit: 'Les bannières royales s’inclinent devant l’Éther-Lance.'
      },
      star400: {
        first: 'Votre fief ancestral (#400), où résonnent les marteaux des forgerons Monopodes.',
        afterCenter: 'Les forgerons brandissent leurs marteaux runiques : prêts à déplacer les astres !',
        pushed: 'L’astre #400 brille d’un éclat doré sur sa nouvelle orbite.'
      },
      star500: {
        first: 'L’ermitage du mage Krel, gardé par deux menhirs pensifs et trois feux-follets rieurs.',
        pushed: 'En glissant, #500 dévoile les runes cachées du sanctuaire #3030.'
      },
      star1: {
        first: 'La Sentinelle #1 dresse sa lance d’obsidienne devant la Citadelle.',
        pushed: 'La lance s’abaisse et montre la route d’or vers l’Onubis (#256).'
      },
      star256: {
        first: 'La Forge des Astres #256 rougeoie doucement au milieu de Middle Dream.',
        afterWin: 'L’enclume de l’Onubis résonne comme une promesse d’avenir.'
      },
      embassy3030: {
        kicker: 'Sanctuaire · %510510',
        title: 'Repaire d’Alliance #3030',
        first: 'Un dragon de lumière bleue dort paisiblement parmi un milliard de chevaliers de pierre.',
        afterWin: 'Le Dragon et les Golems vous saluent comme leur égal.'
      }
    },
    starNames: {
      1: 'Rune #1 · La Lance de Garde',
      256: 'Rune #256 · Forge Onubis',
      400: 'Rune #400 · Fief Ancestral',
      500: 'Rune #500 · Ermitage de Krel'
    },
    stars: {
      prefixes: ['Tour', 'Autel', 'Lanterne', 'Couronne', 'Épée', 'Forge', 'Château', 'Calice', 'Bannière', 'Rune', 'Phare', 'Heaume', 'Luth', 'Relais', 'Flamme', 'Prieuré'],
      suffixes: ['d’Éther', 'de Cristal', 'du Dragon', 'd’Or', 'd’Argent', 'du Serment', 'Solaire', 'des Landes', 'Enchantée', 'd’Obsidienne', 'de Brume', 'Boréale', 'Céleste', 'd’Émeraude', 'Royale', 'Vaillante'],
      flavors: [
        'Des fanions de soie lumineuse flottent autour du phare sans qu’aucun vent ne souffle.',
        'Une harpe enchantée joue trois accords cristallins à l’approche de votre proue.',
        'Une vieille épée plantée dans un astéroïde brille d’une douce lumière bleue.',
        'Des clercs automates recopient les noms des étoiles sur des parchemins d’or.',
        'Une brise tiède porte le parfum des feux de camp et du laurier.',
        'L’étoile scintille comme un vitrail éclairé par une aube éternelle.'
      ]
    },
    planets: {
      archetypes: {
        boltz: {
          label: 'Boltz · Forges d’Automates',
          texts: [
            'Des écuyers mécaniques en laiton forgent des fioles d’éther pur à la lumière des braseros.',
            'Une tour de guet automatique ouvre son cellier aux chevaliers de passage.',
            'Des tonnelets d’énergie solaire attendent près de l’enclume.',
            'Deux bonnes bourses d’éther pour une farce de lutin mécanique — telle est la règle !',
            'Un forgeron en chêne verni vous offre son meilleur fût avec révérence.',
            'Gare aux vieux chaudrons mal fermés dans le coin gauche.'
          ]
        },
        crewz: {
          label: 'Crewz · Jardins des Alchimistes',
          texts: [
            'Des alchimistes Crewz brassent des onguents verts qui ressoudent toute carène fêlée.',
            'Des gemmes d’hyper-saut brillent au cœur de leurs alambics de verre soufflé.',
            'Une clairière flottante offre généreusement vivres et potions réparatrices.',
            'Les jardiniers vous remettent un flacon scellé à la cire d’or.',
            'Leur thé d’herbes lunaires redonne vigueur à toute l’équipage.',
            'Évitez simplement de réveiller les mandragores magnétiques.'
          ]
        },
        golem: {
          label: 'Golem · Carrières Sacrées',
          texts: [
            'Des chevaliers de pierre taillent des écus de basalte pour les nefs en quête.',
            'Des veines d’éther cristallisé brillent au fond d’une crypte paisible.',
            'Les sentinelles minérales ouvrent leur trésor aux pèlerins courtois.',
            'Des pierres de saut illuminent la voûte d’un bleu profond.',
            'La roche chante un cantique grave qui affermit le blindage.',
            'Quelques pierres gardent toutefois la rancune d’un vieux coup de marteau.'
          ]
        }
      }
    },
    anomalies: {
      types: {
        blocage: {
          label: 'Blocage · Pont-Levis Fermé',
          titles: ['Ronces de Fer', 'Pluie de Flèches Douces', 'Vent du Nord', 'Feux-Follets', 'Poche d’Ombre', 'Gué Mouvant'],
          texts: [
            'Un chevalier bloqué au péage propose un troc sûr à 95 % pour abaisser la herse.',
            'Une pluie d’étincelles bloque l’avant ; un petit échange dégage le passage.',
            'Une bourrasque d’éther pousse la nef : rééquilibrez vos fioles.',
            'Des lutins lumineux dansent devant l’étrave ; une petite offrande les enchante.',
            'Un gué étroit propose une conversion claire sans surprise.',
            'Un pacte courtois entre pèlerins assure la traversée.'
          ]
        },
        surnature: {
          label: 'SurNature · Auberge des Astres',
          titles: ['Caravane Dorée', 'Citadelle Volante', 'Crypte Abritée', 'Arbre Alchimique', 'Tours Jumelles', 'Taverne du Dragon'],
          texts: [
            'Une caravane de mages propose un beau pari aux voyageurs intrépides.',
            'Une citadelle suspendue offre de belles récompenses sous les bannières.',
            'Une crypte tiède parie sur la fortune de votre prochain saut.',
            'Un arbre alchimique distille des charges d’hyper-saut contre tribut.',
            'Deux tours jumelles jettent les dés d’ambre sous les étoiles.',
            'L’aubergiste du Dragon vous lance : « Double mise pour l’honneur, chevalier ? »'
          ]
        },
        dramaboss: {
          label: 'DramaBoss · L’Épreuve du Dragon',
          titles: ['Le Chevalier Noir', 'Le Chaudron Avide', 'Le Masque d’Or', 'Tempête Arcanique', 'L’Harmonie Royale', 'Le Juge de Pierre'],
          texts: [
            'Un chevalier mystérieux vous défie dans une joute à 38 % de réussite pour un trésor immense.',
            'Un chaudron magique promet des montagnes d’éther à qui ose tout miser.',
            'Un masque d’or tend deux coffrets fermés sous les torches.',
            'Une tempête arcanique menace tout — ou couronne les braves.',
            'Un serment ancien exige un sacrifice immédiat pour un prodige.',
            'Le Juge de Pierre soulève son sceau et tranche votre sort.'
          ]
        }
      }
    },
    events: [
      {
        id: 'myth_1',
        title: 'Chevalier Automate Tombé de Monture',
        text: 'Un petit chevalier Boltz en laiton gît sur un astéroïde, son cheval mécanique à ressort tournant dans le vide à côté.',
        choices: [
          {
            label: 'Rattraper son cheval et lui remettre deux gouttes d’éther',
            cost: { fuel: 3 },
            effect: { lum: 1, coque: 2 },
            resultText: '« Honneur à vous ! Prenez mon écu béni et cette lanterne ! » (+1 Lum, +2 Coque).'
          },
          {
            label: 'Le remettre simplement d’aplomb sur ses pieds',
            cost: null,
            effect: { t2s: 4 },
            resultText: 'Il vous salue de l’épée avec gratitude (+4 T2s).'
          }
        ]
      },
      {
        id: 'myth_2',
        title: 'Taverne Flottante du « Poney Astral »',
        text: 'Une auberge à colombages lumineux flotte paisiblement entre deux étoiles. Une soupe chaude fume à la fenêtre.',
        choices: [
          {
            label: 'Accepter un bol de potage offert aux pèlerins',
            cost: null,
            effect: { fuel: 4 },
            resultText: 'Le potage alchimique réchauffe aussitôt les chaudières (+4 Fuel).'
          },
          {
            label: 'Échanger quelques relevés avec le barde du coin',
            cost: { scan: 2 },
            effect: { hyper: 1 },
            resultText: 'Il vous chante la route secrète d’un raccourci (+1 Hyper) !'
          }
        ]
      },
      {
        id: 'myth_3',
        title: 'Dragonneau de Plasma Curieux',
        text: 'Un tout petit dragon bleu gros comme un chat renifle les braseros de l’Éther-Lance en ronronnant comme une forge.',
        choices: [
          {
            label: 'Lui caresser doucement les écailles',
            cost: null,
            effect: { coque: 2, scan: 2 },
            resultText: 'Il crache une petite étincelle qui ressoude une fissure et nettoie les verres (+2 Coque, +2 Scan).'
          },
          {
            label: 'Lui offrir un peu de lumière stellaire',
            cost: { lum: 1 },
            effect: { shield: true, fuel: 5 },
            resultText: 'Ravi, il enveloppe votre nef d’une aura ignifugée (Bouclier Lum + 5 Fuel) !'
          }
        ]
      },
      {
        id: 'myth_4',
        title: 'Grimoire Scellé dans un Coffret de Chêne',
        text: 'Un vieux livre cerclé d’argent dérive doucement, fermé par une boucle rouillée.',
        choices: [
          {
            label: 'Ouvrir le fermoir sans forcer',
            cost: null,
            effect: { scan: 3 },
            resultText: 'Une carte enluminée du voisinage se déplie toute seule (+3 Scan).'
          },
          {
            label: 'Dépenser un peu d’élan pour briser le sceau magique',
            cost: { fuel: 4 },
            effect: { coque: 4, t2s: 3 },
            resultText: 'Un sortilège de renforcement recouvre toute la carène (+4 Coque, +3 T2s).'
          }
        ]
      }
    ]
  }
];

