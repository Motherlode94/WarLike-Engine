# Templates et genres de jeu

Depuis **WarLike Hub → Nouveau projet**, choisir **2D ou 3D**, puis le **Genre / template du projet**. Le Hub crée un ensemble d'objets, de composants et de séquences Blueprint modifiables. Le genre est enregistré dans les données et les métadonnées du projet; les projets existants sans champ `genre` restent des projets vierges.

| Genre | Scène et premières interactions | État |
| --- | --- | --- |
| Hero Forge · Super-héros | Six pouvoirs, FX, progression, secours, réseau énergétique et escouade RTS | Mission jouable 2D / 3D ; [guide](hero-forge.md) |
| RP / Roleplay | Joueur, quartier, PNJ, emploi, commerce, monnaie et réputation | Prototype interactif |
| Racing | Véhicule pilotable, départ, checkpoint, arrivée, chronomètre via Blueprint | Prototype jouable |
| Simulation | Atelier, production de matériaux, commande rémunérée et maintenance | Prototype interactif |
| RPG | Donneur de quête, zone d'objectif, expérience, marchand, sanctuaire et inventaire | Prototype interactif |
| Stratégie 4X | Capitale, exploration, colonisation, mines, camp ennemi, armée et fin de tour avec production | Prototype simplifié (pas un vrai jeu de stratégie complet) |

## Utilisation

1. Créer un projet depuis le Hub, choisir le **moteur 2D ou 3D** et le **genre**.
2. Ouvrir la scène générée; les GameObjects peuvent être déplacés ou remplacés.
3. Lancer **Play**, se déplacer avec **ZQSD/WASD**, puis interagir via **E** près des marqueurs.
4. Ouvrir **Inspector → Gameplay Recipes** ou **Blueprint** pour personnaliser les comportements.
5. Les indicateurs de RP / Simulation / RPG / 4X apparaissent pendant Play.

Le preset Racing 3D utilise le contrôleur automobile arcade déjà disponible. Le chronomètre utilise les variables `raceStarted`, `raceElapsed`, `raceCheckpoint`, `raceFinished` du runtime Blueprint. Pour le 4X, « Fin du tour » est une interaction (E), pas encore un moteur global de stratégie au tour par tour. Le camp ennemi exige au moins une armée et ne propose pas d'IA adverse pour le moment.

## À ne pas confondre avec des systèmes terminés

Les scènes contiennent **des exemples fonctionnels de logique**, pas des jeux complets. Le RP n'a pas encore de synchronisation multijoueur ni de système persistant de métiers. La simulation n'a pas encore de chaînes de production approfondies. Le composant Progression RPG partagé ajoute trois branches de compétences ; le template RPG conserve ses exemples de quêtes et d’économie. Il n’existe pas encore d’éditeur graphique de grand arbre de talents. Le 4X n'a pas encore de diplomatie, brouillard de guerre, terrain hexagonal ou adversaires stratégiques autonomes. Les séquences utilisées ici sont exécutées par le runtime JavaScript du navigateur; le runtime C# .NET local est séparé.

Le type de projet 2D/3D reste indépendant du genre et le thème de l'éditeur reste indépendant des données du projet.


## Composants C# natifs (runtime .NET 8 local)

Chaque template fournit aussi un composant préconfiguré dans `csharpComponents`, lisible par `GameWorld.FromWarLikeJson`. Les composants sont **Roleplay**, **RacingRules**, **SimulationEconomy**, **RpgProgression** et **FourXEmpire**.

Pour tester un composant natif : démarrer le pont avec `start-warlike-csharp.cmd`, ouvrir **Window → C# Runtime**, se connecter, envoyer la scène, sélectionner le GameObject qui porte le composant, puis utiliser **Genres C# → Exécuter action C#**. Le résultat du composant (économie, progression, temps de course ou ressources de l'empire) s'affiche dans le panneau. `POST /genre/action` n'accepte que les actions prédéfinies.

**Important :** les états natifs sont distincts des variables Blueprint du Play Web. Les commandes C# restent des appels au processus .NET local, sans synchronisation automatique du RPG, RP, 4X ou économie avec le Play navigateur. Les composants sont une base pour leur future unification.
