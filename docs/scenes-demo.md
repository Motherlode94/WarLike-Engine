# Scènes démo jouables

## Worldforge · Forge des mondes — simulation de monde jouable

Ouvrir un projet **2D**, puis **Game → Scènes démo jouables… → Worldforge → Jouer dans Engine**. Le jeu est présenté dans une fenêtre intégrée, sans remplacer la scène de l'éditeur. Il est également disponible en ouvrant `examples/worldforge/index.html` via un serveur HTTP local.

Worldforge est un **jeu original de god game**, inspiré des simulations de mondes à la WorldBox, sans reprendre ses assets ni son code. Le joueur peut modifier le terrain (eau, plages, plaines, forêts et montagnes), créer quatre peuples, déclencher des pluies, des incendies ou des météorites, puis observer la croissance des villes. L'IA simule les ressources, la nourriture, les habitations, la natalité, la mortalité, la colonisation et les conflits frontaliers entre peuples distincts.

**Commandes :** clic gauche pour peindre ou sélectionner une ville ; clic droit ou Maj + glisser pour déplacer la carte ; molette pour zoomer ; Espace pour suspendre/reprendre ; F pour recentrer. Les boutons règlent la vitesse (pause, 1×, 2×, 5×), la taille du pinceau, le peuple et les événements. **Sauvegarder / Charger** emploie localStorage dans le navigateur ; **Exporter JSON** fournit les données du monde. La simulation ne communique avec aucun serveur.

**Portée du prototype :** c'est un exemple Web autonome lancé depuis l'interface Engine, **pas encore une scène native modifiable dans Inspector, ni un projet exportable avec le pipeline de scènes Engine**. Les agents et les guerres sont simulés au niveau des villes et des ressources, sans unités individuelles contrôlables. La physique 3D, la diplomatie approfondie, la faune et les animations de combat ne sont pas encore implémentées.

Tests de simulation : `node --test tests/worldforge-demo.test.mjs` valide notamment la reproductibilité du monde, les civilisations, le cycle économique, les outils divins, la sérialisation et la présence du jeu dans le navigateur des démos. Les résultats des tests automatisés ne remplacent pas un parcours visuel du jeu dans le navigateur.


Dans un projet 2D ou 3D, choisir **Scènes démo** dans la barre d’outils ou **Game → Scènes démo jouables…**. Le chargement remplace la scène courante et reste annulable avec Ctrl+Z. Sauvegarder le projet pour conserver ses modifications. La fiche repliable en haut de la scène ouvre Play ou un comportement Blueprint.

| Scène | Parcours | Systèmes présentés |
| --- | --- | --- |
| Quartier du Canal · 2D / 3D | Accepter la mission de Mara, prendre le fusible devant l’atelier, réparer le relais au nord, secourir l’éclaireur et revenir à Mara. | Dialogue à choix, inventaire, conditions, signal, collision de barrière, lumière, son, FX, objectifs et victoire. |
| Première aube · 2D / 3D | Récolter sur les sentiers, construire le feu et l’abri dans la clairière, cuisiner et survivre jusqu’à l’aube. | Besoins, récolte, fabrication, placement libre, dangers nocturnes, sauvegarde et progression de survie. |
| Piste d’essais · 2D / 3D | Lire le briefing aux stands, monter dans le prototype et passer est → nord → ouest → arrivée. | Conduite, freinage, collisions, quatre checkpoints ordonnés, chronomètre et victoire. Un passage à pied ne valide pas la course. |
| Courrier des toits · 2D | Sauter sur les toits pour collecter trois colis, atteindre les gemmes de reprise et livrer au bureau. | Gravité, saut, caisses dynamiques, collecte, objectifs, reprise après chute et victoire. |

**Commandes :** ZQSD / WASD ou flèches pour se déplacer, Maj pour courir, E pour interagir ou monter/descendre du véhicule. En plateforme : Q/D ou flèches horizontales et Espace/Z/W pour sauter. En conduite : Espace pour le frein à main. J ouvre le journal des scènes d’aventure ; I ouvre l’inventaire/fabrication de survie. F5/F9 sauvegardent et chargent la progression dans le navigateur.

Les scènes utilisent les composants et le runtime ordinaires du moteur. Les quêtes, checkpoint et interactions sont stockés sur leurs objets ; ouvrir leur composant **Déclencheur** ou **Blueprint** dans Inspector pour les modifier. Les décors utilisent les ressources Kenney livrées avec le dépôt et des modèles GLB intégrés en 3D. La Jeep 2D conserve son illustration SVG historique. Les sols 2D sont des compositions reproductibles de tuiles Tiny Town CC0 : `python scripts/assets/build-demo-maps.py` (Pillow nécessaire).

Pour tester l’export, enregistrer le projet puis **Exporter le jeu**, décompresser et servir le dossier en HTTP. Le contrôle de compatibilité de l’export doit rester sans erreur. Les sauvegardes du navigateur sont propres à l’adresse où le jeu est servi.

## WarScript dans les quatre scènes

Le relais du quartier possède `Relais.wls` : après le signal de quête Blueprint, le script fait varier la lumière. `Prototype.wls` applique vitesse et freinage au véhicule du garage. `PremiereAube.wls` règle la vitesse du cycle de survie. `Coursier.wls` règle saut et sprint du contrôleur 2D. Sélectionner l’objet, déplier **WarScript**, modifier un champ public ou ouvrir **Modifier le WarScript**, enregistrer puis relancer Play. Ces sources et valeurs sont incluses dans l’export Web.

## Atelier du mouvement · 3D

Personnage Kenney contrôlable avec marche/course, saut et attaque déclenchée par WarScript. Trois stations organisées montrent le montage de poses et de courbes, une main et un regard IK sur mannequin Quaternius, et un déplacement par root motion. E lit les panneaux ; Window → Squelette et Animator ouvrent les outils d’édition. Tous les modèles sont intégrés et les données de la scène sont exportables.

L’Atelier du mouvement comporte aussi deux personnages de bibliothèque. **E** près du combattant propose ses coups et réactions ; **E** près du personnage d’interactions propose ses gestes. Leurs profils Animator sont construits à partir des vrais clips intégrés, avec leurs durées et des triggers pilotés par Blueprint.

## Jouabilité et commandes

- Le HUD d’aventure garde l’objectif courant, la progression des colis et la destination. En 2D, une indication gauche/droite/haut/bas aide à se repérer ; en 3D, le nom de la destination reste indépendant de l’orientation de la caméra.
- En survie, les besoins et la prochaine étape restent visibles dans une fiche compacte. **I** ouvre ou ferme les provisions et la fabrication ; **Échap** referme cette fiche avant d’ouvrir la pause. **E** récolte la ressource à portée. Le bouton de récolte apparaît aussi dans la fiche compacte.
- Le contrôleur de plateforme accepte un saut jusqu’à 0,10 seconde après avoir quitté un bord et mémorise une pression jusqu’à 0,12 seconde avant l’atterrissage. Maintenir la touche ne provoque pas de sauts automatiques. Ces délais peuvent être configurés avec `controller2d.coyoteTime` et `controller2d.jumpBuffer` (0 à 0,25 seconde).
- Les véhicules 2D respectent les colliders de la scène, leurs dimensions et leurs décalages, y compris les barrières du circuit. Le compteur de vitesse et l’aide pour monter restent visibles dans la démo de conduite.

Validation : `node --test tests/demo-playability.test.mjs tests/physics-2d.test.mjs` rejoue la mission du canal en marchant et le parcours des trois colis avec les sauts, sans téléportation. Un cas de conduite vérifie les barrières et leur désactivation. Cela complète les tests de logique ; cela ne remplace pas une validation visuelle et un parcours manuel complet en 3D.

## Autres jeux et scènes 2D / 3D

Le navigateur **Scènes démo** propose maintenant 16 scènes en projet 2D et 17 en projet 3D, avec recherche. Il filtre les jeux selon leur compatibilité : Liens de vie reste en 2D ; Company et Front restent en 3D. Le phare et la vallée charge ses deux chapitres ensemble.

Les parcours de départ RP, RPG, simulation, monde ouvert/livraison, horreur, action, RTS et 4X ont un terrain, des chemins, des limites de site, des décors, un départ dégagé et des interactions guidées. Les versions 2D utilisent des sprites et des bâtiments PNG ; les versions 3D utilisent des modèles GLB intégrés. Ce sont toujours des scènes de départ modifiables, pas des jeux commerciaux complets.

- **Premier jour au quartier** : rencontrer le citoyen, travailler et acheter des provisions. Les crédits et la place disponible sont vérifiés avant un achat.
- **L’atelier en service** : produire, livrer une commande et effectuer la maintenance. Une livraison ne rapporte rien avant la production ou sans matériau.
- **Les ruines du messager** : accepter la quête, explorer et rapporter la découverte. La récompense est donnée au retour.
- **Livraison périphérique** : prendre le colis puis le livrer. La Jeep est pilotable dans les deux modes.
- **La génératrice** : remettre le courant puis évacuer ; la sortie refuse la fuite tant que le courant est coupé. Le profil de lampe et de peur s’active pour cette scène puis restaure les réglages précédents à Stop.
- **Mine et avant-poste** : sécuriser la mine, sélectionner une escouade et lui donner un ordre vers le poste. Le commandant seul ne valide pas la capture. Les alliés mobiles peuvent se croiser sans que les bâtiments perdent leurs collisions.
- **Expédition de frontière** : explorer, financer une colonie puis conquérir le camp avec une armée. Les prérequis et coûts sont vérifiés ; le prototype 4X n’ajoute pas d’adversaire stratégique autonome.
- **Poste d’observation** : rejoindre le poste et le capturer à pied, avec couverture, adversaire et véhicule armé.

Les panneaux Hero Forge / escouade restent compacts dans les petits viewports ; **F1** ouvre les détails, les boutons ou les ordres. Les touches **1–6** restent disponibles pour les pouvoirs. Une pression courte sur **E** est conservée pour monter dans un véhicule 3D entre deux images de simulation.

`tests/starter-scenes-playability.test.mjs` rejoue les trajets vers les interactions avec les solveurs de collision 2D et 3D, vérifie les missions et rejets d’actions prématurées, les départs, les assets et les exports. Le test RTS donne un véritable ordre de déplacement. Les tests de logique ne remplacent pas une validation visuelle WebGL, ni un combat manuel complet avec des ennemis mobiles.
