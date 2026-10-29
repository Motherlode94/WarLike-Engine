# WarLike C# · composants et escouades tactiques

Le runtime **.NET 8** exécute les comportements C# dans un processus local. Studio communique avec lui par un bridge HTTP sur `127.0.0.1:8765`. Le Play Web reste indépendant.

## Démarrer

Installer le SDK .NET 8, mettre le dépôt à jour puis lancer depuis sa racine :

```bash
dotnet run --project csharp/WarLike.Bridge
```

Sous Windows, `start-warlike-csharp.cmd` lance la même commande. Dans Studio : **Window → C# Runtime (.NET 8)**, **Connexion locale**, puis **Envoyer la scène**. Après une mise à jour du code C#, redémarrer le bridge.

## Inspector C# typé

Sélectionner un objet puis **Inspecter la sélection** affiche les composants réellement chargés dans .NET, leur activation et leur état de démarrage.

- Champs numériques, entiers, booléens et Vector3, avec validation des types et bornes côté .NET.
- **Appliquer** modifie le composant natif. Quand le composant provient de `csharpComponents`, ses paramètres sont aussi enregistrés dans la scène et dans son export JSON.
- Les propriétés sans setter public restent en lecture seule : vitesse du véhicule, munitions, temps de course, etc.
- Les composants créés implicitement, sans définition dans la scène, sont indiqués comme modifiés dans la session .NET uniquement.
- **Actif** arrête ou reprend le composant avec `OnDisable` / `OnEnable`. `Start` s'exécute une seule fois, avant son premier traitement actif.

Les propriétés exposées utilisent `[InspectorField]`. Seuls les membres explicitement annotés de composants déjà compilés sont accessibles ; aucun code arbitraire n'est chargé par ce mécanisme.

```csharp
[InspectorField("Vitesse", SceneKeys = "speed", Min = 0, Max = 30)]
public float Speed { get; set; } = 3;
```

Pour un Vector3, `SceneKeys = "vx,vy,vz"` conserve les trois valeurs dans la définition JSON. Les paramètres incluent les véhicules, le mouvement, le suivi, la régénération, le Rigidbody simple, les équipes, les armes et les escouades.

## Escouades · référence tactique Gostomel

**Ukrainian Warfare: Gostomel Heroes** sert de référence de conception pour le commandement tactique : [fiche officielle du jeu](https://store.steampowered.com/app/3902520/). Le code C# ci-dessous est propre à WarLike ; aucun code ni modèle du jeu n'est distribué.

1. Ouvrir un projet **3D** puis **Window → C# Runtime**.
2. Cliquer **＋ Exemple escouade 3D** : Studio ajoute un chef, quatre soldats et un véhicule, sans supprimer la scène. Les personnages et le camion utilisent les GLB Kenney déjà intégrés : [Mini Characters](https://kenney.nl/assets/mini-characters), [Car Kit](https://kenney.nl/assets/car-kit), licence CC0.
3. Connecter le bridge et envoyer la scène. Le chef est sélectionné et possède `TacticalSquad`.
4. Inspecter le chef. Les ID des membres peuvent être affectés dans le panneau ou dans la définition du composant.
5. **Déplacer** utilise des coordonnées X/Y en unités de scène. **Maintenir** interrompt le mouvement. **Suivre** accepte l'ID d'un acteur vivant extérieur à l'escouade, notamment le véhicule de l'exemple.
6. Lancer **Exécuter 1/60 s**, **Simuler 1 seconde** ou **Aperçu C# continu**. Sélectionner le véhicule et lui envoyer une commande de conduite permet de tester le suivi.

Le composant gère jusqu'à **64 membres**, une formation en deux colonnes, l'espacement, la vitesse, le suivi et le maintien des altitudes. Les unités désactivées ou mortes ne se déplacent pas. Un acteur ne peut appartenir qu'à une escouade. Les membres et paramètres restent dans la scène ; les ordres sont temporaires et ne constituent pas une sauvegarde de partie.

**Limite actuelle :** le déplacement C# suit directement la destination sur un plan. Il n'utilise pas encore A*, les collisions Rapier, les couvertures, le moral ou les dégâts modulaires des véhicules. Cette brique de commandement ne constitue pas une reproduction complète de Gostomel.

## Simulation et cycle de vie

`GameWorld`, `Actor` et `WarLikeBehaviour` proposent `Awake`, `OnEnable`, `Start`, `Update`, `FixedUpdate`, `LateUpdate`, `OnDisable`, `OnDestroy`, ainsi que `GetComponent<T>`, `TryGetComponent<T>` et `AddComponent<T>`.

Les acteurs ou composants inactifs attendent leur activation avant `Start`. Les composants ajoutés pendant un traitement rejoignent la boucle au tick suivant. Les destructions sont différées jusqu'à la fin du tick et chaque composant est détruit une seule fois.

L'aperçu exécute au plus 30 requêtes séquentielles par seconde. Fermer le panneau ou démarrer le Play Web l'arrête. **Restaurer avant aperçu** remet les poses précédentes ; une nouvelle synchronisation est ensuite nécessaire. Une modification de scène invalide les requêtes en cours avant application. Les endpoints d'Inspector et d'escouade vérifient également la révision de scène native.

Les scripts enregistrés dans les GameObjects restent exportables en `.cs`. Pour les exécuter, les intégrer et les compiler dans le projet .NET, puis enregistrer leur instanciation dans l'import de scène. Le navigateur ne compile pas le C#.

## API du bridge

| Route | Rôle |
| --- | --- |
| `GET /health` | Protocole 2 et capacités disponibles |
| `POST /scene` | Import atomique, réponse avec `revision` |
| `POST /tick` | Simulation et poses en unités de scène |
| `POST /components/inspect` | `{id, revision}` : composants et schémas typés |
| `POST /components/set` | `{id, revision, index, property, value}` : mutation validée |
| `POST /squad/command` | `{id, revision, action, ...}` : `members`, `move`, `hold`, `follow` |
| `POST /vehicle/input` | Conduite arcade, throttle/steer dans [-1,1] |
| `POST /genre/action` | Actions RP, Racing, Simulation, RPG et 4X |

C# emploie des mètres : X/Z au sol, Y vertical. Dans la scène Web, X/Y sont au sol, à raison de 64 unités par mètre ; `elevation3d` est déjà en mètres. Le bridge n'écoute que sur loopback et accepte les origines prévues. Les scènes sont limitées à 2 Mio, les commandes à 32 Kio.

## Vérifier

```bash
dotnet build csharp/WarLike.Bridge --configuration Release
dotnet run --project csharp/WarLike.Tests --configuration Release
dotnet run --project csharp/WarLike.Demo --configuration Release
node --test tests/csharp-inspector.test.mjs tests/csharp-integration.test.mjs
WARLIKE_DOTNET_BRIDGE=1 node --test tests/csharp-bridge-live.mjs
```

Le dernier test démarre le bridge compilé, teste les vrais échanges HTTP puis l'arrête. Le port 8765 doit être libre. Ces vérifications s'exécutent aussi dans GitHub Actions avec .NET 8.
