# Scènes démo jouables

> **ARCHIVE TECHNIQUE — NON DISTRIBUÉE COMME JEU.** Les jeux et scènes décrits ci-dessous étaient des prototypes historiques. Depuis le 20 novembre 2026, WarLike Engine ne les propose plus dans ses menus ou ses nouveaux projets. Les références aux anciens menus ci-dessous documentent uniquement le fonctionnement historique. Les fixtures sont conservées pour certifier les contrôleurs, l'Animator, les modèles, les collisions et l'export, sans présenter ces prototypes comme des jeux aboutis.


## CHAMBRE 07 · La Voix — scène 3D native et éditable

Créer ou ouvrir un projet **3D**, puis ouvrir **Game → Scènes démo jouables… → CHAMBRE 07 · Scène 3D native → Charger cette scène**. Dans le **Hub du moteur**, le raccourci CHAMBRE 07 ouvre ce même navigateur. La scène charge de véritables objets de l'éditeur ; ce n'est **pas** une iframe.

La scène utilise des primitives polygonales 3D et les composants natifs : **Transform**, **collisions**, **contrôleur 3D**, **caméra FPS**, **éclairage**, **IA**, **objectifs**, **dialogues** et **Blueprint Sequences**. Les entités apparaissent dans Hierarchy et sont modifiables dans Inspector. Le sol possède une collision physique et le tag `ai-walkable` : il soutient le joueur sans devenir un obstacle artificiel pour le calcul de chemin de l'IA.

**Parcours :** récupérer la photographie dans le salon, la cassette près des archives et la lettre dans la chambre ; parler à Lia ; choisir une réponse ; rejoindre la porte de sortie pendant que l'ombre poursuit le joueur. Les deux réponses mènent à deux conclusions différentes.

**Commandes :** ZQSD/WASD, souris, **Maj** pour courir, **E** pour interagir, **J** pour le journal, **F5/F9** pour sauvegarder/charger. Ces commandes passent par le runtime habituel du moteur.

**Source native :** `js/core/chambre-07-scene.js`. **Régressions :** `tests/chambre-07-native.test.mjs`. Tester avec `node --test tests/chambre-07-native.test.mjs`.

**Limites à valider :** le prologue utilise pour l'instant des personnages et du mobilier génériques, sans doublages, cinématiques ni animation faciale dédiée. Le trajet du poursuivant entre cloisons, les collisions réelles, le déclenchement des signaux de dialogue et l'export web complet exigent un test navigateur et un test de build. La scène n'est pas encore une reproduction complète de l'expérience du prototype HTML ; elle est la première conversion native.


## Politique officielle : démos uniquement natives

Une démo distribuée dans **Game → Scènes démo jouables** doit charger ses entités avec `loadAuthoredDemo` et utiliser **Hierarchy, Inspector, WarNode/Blueprint, Play/Stop et export Web** de WarLike Engine. Il est interdit de présenter un jeu autonome dans une iframe ou un lien externe comme une démo faite avec Engine.

**État actuel :**
- **CHAMBRE 07 · Scène 3D native** : scène éditable, mais critères de validation finale du moteur 3D encore ouverts.
- **Iron Defiance · Academy native** : entraînement de 12 soldats utilisant le runtime natif, pas la bataille CENDRE-01 complète.
- **Iron Defiance · Compagnie** : 108 soldats éditables par faction et ordres RTS natifs, sans conversion complète de la bataille.
- **CENDRE-01 autonome** (`examples/iron-defiance/`) : prototype historique **non conforme au catalogue Engine**, maintenu comme source de logique à migrer.
- **Worldforge autonome** (`examples/worldforge/`) : prototype historique **non conforme au catalogue Engine**, maintenu pour migrer ses règles de simulation vers des composants natifs 2D.
- **CHAMBRE 07 HTML historique** (`examples/chambre-07/`) : référence non distribuée comme démo Engine ; poursuivre la conversion native.

**Règle de validation** : le rendu seul n'est pas une preuve d'intégration. Tout nouveau jeu doit être modifiable depuis Hierarchy/Inspector, conserver son gameplay en Play, restaurer l'état après Stop, persister au rechargement et fonctionner dans l'export Web sans moteur parallèle.

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
