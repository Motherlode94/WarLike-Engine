# Templates et genres de jeu

Depuis **WarLike Hub → Nouveau projet**, choisir **2D ou 3D**, puis **Type de jeu compatible avec le projet**. Le sélecteur affiche les types disponibles pour ce mode, avec une fiche des systèmes présents et de leur état. **Plateforme** est réservé au 2D ; l’action 2D est indiquée comme vue du dessus, et le FPS/TPS comme 3D.

| Type de jeu | 2D | 3D | Base fournie |
| --- | --- | --- | --- |
| Liens de vie · Simulation | Oui | — | Quartier jouable : besoins, activités, travail, amitié, confiance, affection et sauvegarde |
| WarLike Company | — | Oui | Escarmouche RTS : escouades, couvertures, suppression, retraite, économie reliée aux secteurs et recrutement |
| WarLike Front | — | Oui | FPS Conquête : deux équipes de six, secteurs, blindés, munitions et réapparition |
| Hero Forge · Super-héros | Oui | Oui | Mission jouable : pouvoirs, FX, progression, secours, destruction et escouade |
| Aventure | Oui | Oui | Deux chapitres jouables : dialogues, journal, énigmes, pont à réparer et progression persistante |
| Survival · Survie | Oui | Oui | Scène jouable : besoins, récolte, fabrication, feu, abri et nuit |
| Plateforme | Oui | — | Scène jouable : sprites Kenney, saut, gravité, plateformes et colliders |
| Action | Vue du dessus | FPS / TPS | Base à compléter : couverture, adversaire, véhicule armé et capture |
| RPG | Oui | Oui | Base à compléter : quête, inventaire, marchand, expérience et soin |
| RTS | Oui | Oui | Base à compléter : escouade, ressources, déplacement et capture |
| Course | Oui | Oui | Prototype jouable : véhicule, départ, checkpoint et arrivée |
| Simulation | Oui | Oui | Base à compléter : atelier, matériaux, commande et maintenance |
| Monde ouvert | Oui | Oui | Base à compléter : véhicule, PNJ et livraison |
| Horreur | Oui | Oui | Base à compléter : traque, cachette et génératrice |
| RP / Roleplay | Oui | Oui | Base à compléter : PNJ, emploi, commerce, monnaie et réputation |
| Stratégie 4X | Oui | Oui | Prototype : exploration, colonisation, ressources et fin de tour |

**Projet libre** est une scène minimale. **Field Lab** est un circuit de diagnostic, classé parmi les outils.

Le genre fait partie de la configuration du jeu : il est conservé dans les sauvegardes du projet, les espaces 2D/3D et les exports Web. Les anciens projets utilisent leur métadonnée de genre ; sans cette information, certains composants caractéristiques permettent de reconnaître Survival, Hero Forge, Plateforme et les templates C#. Un choix de genre explicite reste prioritaire.

Dans la liste des projets, ouvrir **⋮ → Type de jeu** pour changer le classement et le HUD d’un projet existant. Ses objets et ses scènes sont conservés ; ce réglage n’installe pas une nouvelle scène de template. Pour obtenir une scène complète de départ, créer un nouveau projet avec le type souhaité, ou utiliser les commandes de scène Hero Forge / Aventure / Survival.

## Utilisation

1. Créer un projet depuis le Hub, choisir le **moteur 2D ou 3D** et le **genre**.
2. Ouvrir la scène générée; les GameObjects peuvent être déplacés ou remplacés.
3. Lancer **Play**, se déplacer avec **ZQSD/WASD**, puis interagir via **E** près des marqueurs.
4. Ouvrir **Inspector → Gameplay Recipes** ou **Blueprint** pour personnaliser les comportements.
5. Le HUD correspondant au genre apparaît pendant Play et dans le jeu exporté. En coop LAN, l’invité reçoit le genre et les variables du monde de l’hôte pour afficher les mêmes indicateurs ; son projet local retrouve ses réglages lorsqu’il quitte.

Le preset Racing 3D utilise le contrôleur automobile arcade déjà disponible. Le chronomètre utilise les variables `raceStarted`, `raceElapsed`, `raceCheckpoint`, `raceFinished` du runtime Blueprint. Pour le 4X, « Fin du tour » est une interaction (E), pas encore un moteur global de stratégie au tour par tour. Le camp ennemi exige au moins une armée et ne propose pas d'IA adverse pour le moment.

## À ne pas confondre avec des systèmes terminés

Les scènes contiennent **des exemples fonctionnels de logique**, pas des jeux complets. La coop LAN partage les déplacements et les états de scène, mais le RP n’a pas encore de protocole complet de métiers, de dialogues à choix et de transactions indépendantes par joueur. La simulation n'a pas encore de chaînes de production approfondies. Le composant Progression RPG partagé ajoute trois branches de compétences ; le template RPG conserve ses exemples de quêtes et d’économie. Il n’existe pas encore d’éditeur graphique de grand arbre de talents. Le 4X n'a pas encore de diplomatie, brouillard de guerre, terrain hexagonal ou adversaires stratégiques autonomes. Les séquences utilisées ici sont exécutées par le runtime JavaScript du navigateur; le runtime C# .NET local est séparé.

La disponibilité d’un type de jeu dépend du mode 2D/3D et le thème de l'éditeur reste indépendant des données du projet.


## Composants C# natifs (runtime .NET 8 local)

Chaque template fournit aussi un composant préconfiguré dans `csharpComponents`, lisible par `GameWorld.FromWarLikeJson`. Les composants sont **Roleplay**, **RacingRules**, **SimulationEconomy**, **RpgProgression** et **FourXEmpire**.

Pour tester un composant natif : démarrer le pont avec `start-warlike-csharp.cmd`, ouvrir **Window → C# Runtime**, se connecter, envoyer la scène, sélectionner le GameObject qui porte le composant, puis utiliser **Genres C# → Exécuter action C#**. Le résultat du composant (économie, progression, temps de course ou ressources de l'empire) s'affiche dans le panneau. `POST /genre/action` n'accepte que les actions prédéfinies.

**Important :** les états natifs sont distincts des variables Blueprint du Play Web. Les commandes C# restent des appels au processus .NET local, sans synchronisation automatique du RPG, RP, 4X ou économie avec le Play navigateur. Les composants sont une base pour leur future unification.

## Survival · Survie

Le template Survival est désormais une boucle jouable avec besoins, récolte, recettes, feu alimenté et abri, en 2D/3D et en coop LAN. Voir le [guide Survival](survival.md). Les anciens presets basés sur des variables restent disponibles.

## Aventure · Le phare et la vallée

Le template 2D/3D contient deux chapitres jouables et onze objectifs, un pont à réparer et une mélodie à résoudre. Les voyages et sauvegardes conservent les objets des deux scènes et les inventaires du groupe. Il contient une quête complète et des dialogues à réponses éditables, un journal et des objets de quête partagés. Les interactions sont ciblées et contrôlent les obstacles. Voir le [guide Aventure](adventure.md) pour le parcours, les composants, les sauvegardes et la coop LAN.
