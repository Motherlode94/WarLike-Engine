# WarLike C# SDK — première étape

Un runtime **.NET 8** autonome pour programmer des comportements en C# avec un modèle inspiré des composants Unity.

## Démarrer
Installer .NET 8 SDK, puis à la racine du dépôt :

```bash
dotnet run --project csharp/WarLike.Demo
dotnet run --project csharp/WarLike.Demo -- warlike-scene.json
dotnet build csharp/WarLike.Runtime
```

## API

- `GameWorld` : acteurs, composants et boucle à pas fixe.
- `WarLikeBehaviour` : `Awake`, `Start`, `Update`, `FixedUpdate`, `OnDestroy`.
- `Actor` : identifiant, position `System.Numerics.Vector3`, santé et propriétés.
- `GameWorld.FromWarLikeJson` : importe les entités d'un export JSON de scène WarLike, avec la convention x/y sol et elevation3d hauteur.

## Utiliser C# depuis WarLike Studio (Windows)

Le dépôt comprend maintenant un **pont local .NET 8 relié à l’éditeur web**. À la racine du dépôt, double-clique sur `start-warlike-csharp.cmd`, ou lance :

```powershell
dotnet run --project csharp/WarLike.Bridge
```

Puis, dans l'éditeur WarLike : **Window → C# Runtime (.NET 8)**.

1. **Connexion locale** vérifie `http://127.0.0.1:8765/health`.
2. **Envoyer la scène** charge les objets et les composants `csharpComponents` dans le runtime.
3. **Exécuter 1/60 s** exécute une étape dans le processus .NET, puis met à jour les positions, rotations et points de vie des objets correspondants dans l'éditeur.
4. **Simuler 1 seconde** exécute quatre étapes natives de 0,25 seconde pour voir un déplacement ou une régénération.
5. **Éditer le script C# du GameObject sélectionné** (dans le panneau C# ou via le bouton **C# Script** de l'Inspector) permet de saisir du C#, de conserver le code dans l'objet de la scène et de l'exporter en `.cs` (sans compilation automatique).
6. **Exemple de script .cs** exporte un comportement `WarLikeBehaviour` à inclure dans un projet .NET qui référence `WarLike.Runtime`.

Composants C# native reconnus dans la scène : `AutoRotate`, `Health`, `LinearMotion`, `Rigidbody`, `FollowActor` et certains composants FPS/Deathmatch, disponibles dans l'Inspector sous « Components • Gameplay & Scripts ».

**Ce mode est une exécution par étapes, pas un Play Mode C# continu**. Les scripts C# personnalisés ne sont pas compilés ni chargés par le navigateur. Pour les faire fonctionner dans le pont local, il faut les compiler dans l'application .NET et déclarer leur instanciation dans `GameWorld.FromWarLikeJson`. Un processus .NET local est nécessaire ; le site hébergé seul ne peut pas le lancer. N'importe quel changement dans l'éditeur après synchronisation nécessite un nouvel envoi de scène avant l'étape suivante. Sauvegarde ton projet avant d'appliquer des résultats C#.

## Limites importantes

**La page WebGL n'exécute pas encore les scripts C#**. Le C# tourne pour l'instant dans un processus .NET indépendant. Ce SDK est une base réelle compilable pour développer ensuite un pont WASM ou une application native ; il ne fournit pas Roslyn, hot reload, Unity MonoBehaviour, PhysX ni liaison directe au rendu WebGL. Ne pas exécuter du code C# non fiable sans sandbox.

## Architecture Unity-like recommandée (sans prétendre être Unity)

La priorité est un contrat de composants cohérent entre le navigateur et le runtime .NET :
- `GameObject` / `Transform` / `Component` / `Behaviour` : hiérarchie et activation ;
- `Awake`, `OnEnable`, `Start`, `Update`, `FixedUpdate`, `LateUpdate`, `OnDisable`, `OnDestroy` : ordre de cycle de vie déterministe ;
- `GetComponent<T>()`, `TryGetComponent<T>()`, `AddComponent<T>()` : API de composition ;
- `SerializeField` et propriétés éditables : données d'Inspector, sérialisation avec version ;
- `Time.DeltaTime`, événements, collisions et entrées : services injectés plutôt que dépendances globales.

**Attention :** il ne suffit pas d'ajouter ces noms en C# pour les faire fonctionner dans le Play Mode Web. Il faudra un runtime .NET WebAssembly isolé, un pont de commandes vers la scène JS et une synchronisation des composants. Le chargement de DLL ou de scripts C# arbitraires n'est pas autorisé par défaut.

## Roadmap de compatibilité

1. Stabiliser la hiérarchie, l'Inspector, les prefabs et l'Undo/Redo dans l'éditeur existant.
2. Établir les schémas JSON versionnés pour composants et propriétés, puis les tests de round-trip.
3. Étendre le runtime .NET et ses tests de cycle de vie.
4. Développer et sécuriser le pont navigateur/WASM, avec Play/Stop et diagnostics.
5. Ajouter un debugger, des exceptions localisées et des outils de profiling.

Le SDK actuel reste autonome tant que l'étape 4 n'a pas été validée en navigateur.


## Conduite des véhicules en C# (.NET 8)

Le runtime propose `VehicleControllerComponent` : accélération progressive, freinage, marche arrière, direction sensible à la vitesse et frein à main. Les calculs s'exécutent dans `FixedUpdate` avec un pas de simulation fixe. Les unités sont cohérentes avec le contrôleur JS : positions C# en mètres, paramètres de vitesse en unités de scène par seconde.

**Utilisation depuis WarLike Studio :**

1. Sélectionne un véhicule 3D dans la Hierarchy.
2. Inspector → Components • Gameplay & Scripts → **Vehicles / C# → VehicleController**. Les objets configurés via **Course · Véhicule** sont également reconnus depuis leurs tags.
3. Lance `start-warlike-csharp.cmd` sur ton ordinateur.
4. Dans **Window → C# Runtime**, clique **Connexion locale**, puis **Envoyer la scène**.
5. Choisis **Accélérer**, **Freiner**, **Gauche**, **Droite**, **Frein à main** ou **Neutre**, puis clique **Simuler 1 seconde** pour visualiser le résultat. Synchronise à nouveau après toute modification de la scène ou des paramètres Inspector.

La connexion passe par le pont HTTP local `POST /vehicle/input` avec `{"id":2,"throttle":1,"steer":0,"handbrake":false}`. L'API refuse les valeurs non finies ou hors intervalle [-1,1], ainsi que les ID sans composant VehicleController.

**Limitations** : cette exécution C# est une simulation native à la demande, **pas le Play Mode Web en temps réel**. Le navigateur continue à utiliser le contrôleur JavaScript pour la conduite normale. La physique C# ne comporte pas encore de collision de carrosserie, de roues, de suspension ni de trafic autonome. Le transfert des poses vers l'éditeur reste manuel.


## Aperçu continu dans Studio

Démarrer le bridge avec `python3 python/warlike.py csharp` ou `dotnet run --project csharp/WarLike.Bridge`. Le serveur Python standard du projet utilise `http://127.0.0.1:8000`, autorisé par le bridge. Dans Window → C# Runtime : connecter, synchroniser puis lancer **Aperçu C# continu**. Les requêtes restent séquentielles, à 30 étapes/s maximum ; la fermeture du panneau ou le démarrage du Play Web arrête l’aperçu. **Restaurer avant aperçu** rétablit les positions puis exige une nouvelle synchronisation. Les fichiers C# doivent être compilés dans le projet .NET pour être exécutés.
