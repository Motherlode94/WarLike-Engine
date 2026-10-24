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
