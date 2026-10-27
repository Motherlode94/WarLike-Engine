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
