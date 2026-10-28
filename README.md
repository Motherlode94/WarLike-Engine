# WarLike Studio — Moteur et éditeur de jeux 2D / 3D

Éditeur de jeux web expérimental, avec **WarLike Hub**, bibliothèques d'assets 2D/3D, mode Play, Inspector, séquences logiques sans code et import de modèles 3D glTF binaires.

**[Lire la documentation complète en français](./docs/index.html)** · [Démonstration en ligne](https://warlike-engine.pages.dev/) · [Guide des vrais prefabs 3D](./REAL-3D-PREFABS-BETA72.md) · [Logic Sequences](./LOGIC-SEQUENCES-BETA7.md)

## Blueprint Studio — construire, tester et exporter un jeu

Un espace dédié réunit **Graphe**, **Instructions**, **Bibliothèque**, **Projet & export** et **Débogage**. Chaque objet peut porter plusieurs comportements indépendants. Les graphes exécutent des conditions Oui/Non, avec paramètres de nœud dans un inspecteur séparé.

Objectifs à progression, comptes à rebours, dialogues, menus de pause/victoire/défaite, checkpoints, sauvegardes et changements de scène composent une boucle de jeu complète. **Projet & export → Créer un exemple de jeu complet** installe une mission de collecte en conservant la scène existante. **Exporter le jeu Web (.zip)** produit un petit jeu jouable avec son menu et son runtime, à servir en HTTP.

**[Guide de création de A à Z](./docs/blueprint-game-builder.md)**. Le build Web est expérimental : les modèles distants demandent Internet, les GLB locaux sans ressource durable bloquent l’export et les scripts C#/.NET ne s’exécutent pas dans ce build.

## Communauté — WarLike Open Ecosystem

Le moteur accepte désormais des **packs communautaires JSON déclaratifs** via **Assets → Communauté · Plugins**. Les recettes Blueprint importées apparaissent dans l'Inspector, sans exécuter de JavaScript tiers. Cette première version du SDK est locale et limitée ; elle ne constitue pas encore une Marketplace hébergée.

**[Guide du SDK communautaire](./docs/community-sdk.md)** · [Exemple de pack](./examples/community/field-tools.json)

## Démarrer

1. Ouvrir `index.html` depuis un serveur statique ou utiliser la version Cloudflare Pages.
2. Dans **WarLike Hub**, créer un projet nommé et choisir **2D** ou **3D**.
3. Dans **Project / Assets**, sélectionner un asset puis le glisser dans la scène.
4. Ajuster les propriétés dans **Inspector**, puis lancer **Play**.
5. Exporter la scène en JSON pour conserver une sauvegarde externe.

## Prefabs réels 3D

La Beta.7.2 référence des modèles GLB de démonstration du catalogue Khronos et permet l'import temporaire de modèles personnels `.glb` (jusqu'à 25 Mo). Les personnages, armes, véhicules et autres GLB sont affichés par leurs triangles lorsque leur format est pris en charge, mais le moteur ne gère pas encore tous les matériaux, les textures, les animations ou la physique d'un moteur professionnel. Les binaires GLB locaux **ne sont pas inclus dans l'export JSON**.

## Tests

```bash
npm install
npm test
npm run typecheck
```

La couverture est partielle : des contrôles d'intégration dans les navigateurs restent nécessaires.

## Déploiement

Le dépôt peut être hébergé sur Cloudflare Pages en site statique (framework : None, répertoire de sortie : `/`). La sauvegarde dans le Hub repose principalement sur le stockage local du navigateur.

## Licences et provenance

Le code WarLike Studio est un prototype original. Certains modèles de démonstration sont chargés à distance depuis [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) ; **leurs licences propres doivent être vérifiées pour tout usage ou redistribution**. L'import local exige que l'utilisateur dispose des droits sur ses modèles.

## Gameplay Components (prototype)

### IA et Blueprints — perception et interactions

L'IA configurable fonctionne en Play 2D et 3D : champ de vision, obstacles, mémoire de la dernière position observée, investigation, recherche et retour en patrouille. L'Inspector expose ces paramètres et les séquences peuvent activer l'IA ou lui désigner une cible. Les factions communes protègent les alliés.

Les conditions d'inventaire vérifient les objets réellement ramassés ; les actions de santé synchronisent Stats et `hp`. La bibliothèque comprend une porte à clé réelle, une alerte de vie basse et des commandes de suspension/reprise IA. [Guide et limites](./docs/reference-gameplay-runtime.md).

Depuis **Inspector > Gameplay Components**, ajoute **Stats**, **Inventaire**, **AI State Machine** ou **Character Controller 3D** à un objet. Le moteur dispose désormais de points de vie, endurance, sauts, sprint et esquive (**Ctrl**), d'une IA simple avec patrouille/poursuite/attaque et d'attaques 3D de proximité (**F**). Une arme équipée via l'Inspector augmente la portée et les dégâts de l'attaque ; il ne s'agit pas encore d'une représentation animée de l'arme ni d'un système de projectiles.

Dans **Logic Sequences**, les instructions peuvent donner/retirer un objet, équiper une arme/armure, soigner et infliger des dégâts. **Blueprint Studio** permet de déplacer les nœuds, de connecter les ports, de créer des branches Oui/Non et de consulter les paramètres et l’exécution. Les graphes invalides sont signalés avant Play.

La navigation IA utilise une **recherche A* sur grille avec évitement local simplifié** ; elle ne dispose pas de NavMesh. Les collisions 3D et animations restent expérimentales. Les tests ajoutés au dépôt doivent être exécutés avec `npm test`, et l'ensemble doit être vérifié en navigateur avant utilisation dans un projet de production.

## Développement en C# (SDK .NET 8 expérimental)

Un premier runtime C# autonome est disponible dans [`csharp/`](./csharp/README.md), avec `GameWorld`, `Actor`, `WarLikeBehaviour`, les callbacks `Awake`, `Start`, `Update`, `FixedUpdate`, `OnDestroy` et un exemple exécutable. Pour démarrer : `dotnet run --project csharp/WarLike.Demo`. Le SDK peut importer les entités depuis un export JSON du studio. **Attention : les scripts C# ne s'exécutent pas encore dans le navigateur / Play Mode WebGL** ; ce runtime .NET est une base indépendante en vue d'une intégration future.

## C++ natif dans le moteur 3D (WebAssembly)

Un nouveau module **C++17** de navigation A* est disponible dans [`native/`](./native/README.md). Le moteur 3D charge son **WebAssembly** lors du démarrage et utilise automatiquement la navigation JavaScript si le binaire compilé n'a pas été déployé. Compiler avec Emscripten : `sh native/build-wasm.sh`. Le C++ n'est pas encore un langage de scripts attachables aux objets dans l'Inspector ; il accélère actuellement une fonction interne du moteur. Le build `.wasm` n'est pas inclus par défaut.

Made by Hardi Victor MBANVU
