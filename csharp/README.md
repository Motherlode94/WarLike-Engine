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

Les propriétés exposées utilisent `[InspectorField]`. Les composants intégrés exposent leurs propriétés annotées. Les MonoBehaviour compilés exposent aussi leurs champs sérialisés, comme décrit plus bas.

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

Les scripts enregistrés dans les GameObjects restent exportables en `.cs`. Le bridge compile désormais les sources avant Play C# local et instancie leurs MonoBehaviour. Le navigateur transmet les sources ; la compilation et l’exécution ont lieu dans .NET.

## API du bridge

| Route | Rôle |
| --- | --- |
| `GET /health` | Protocole 3 et capacités disponibles |
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

## MonoBehaviour et compilation C# native

Les `.cs` sont désormais compilés en véritables assemblies .NET par Roslyn, dans le processus local du bridge. Le SDK .NET 8 fournit le compilateur ; aucun service distant ni interpréteur JavaScript n’exécute le C#. WarScript `.wls` reste utilisable dans le même projet et dans l’export Web.

```csharp
using WarLike.Runtime;
using System.Numerics;

public sealed class MyBehaviour : MonoBehaviour
{
    public float Speed = 45f;
    [SerializeField] private bool reverse = false;

    void Start() { Debug.Log(gameObject.name); }

    void Update()
    {
        transform.Rotate(0, (reverse ? -Speed : Speed) * Time.deltaTime, 0);
        if (Input.GetKeyDown(KeyCode.E))
            transform.Translate(new Vector3(1, 0, 0));
    }
}
```

**Workflow :** lancer `start-warlike-csharp.cmd`, sélectionner un objet puis **Ajouter un composant → C# local → Script C# local**, créer/enregistrer le `.cs` dans Script Studio, puis **Utiliser Play C# natif** dans son Inspector. **Vérifier / compiler** affiche les diagnostics Roslyn ; Play et **C# Runtime → Envoyer la scène** compilent aussi les sources avant l’import. Le nom du fichier attaché doit correspondre à sa classe MonoBehaviour, éventuellement qualifiée par son namespace. Les sources C# du projet sont compilées ensemble, ce qui permet les classes auxiliaires et les références entre scripts.

Les méthodes privées ou publiques `void Awake()`, `OnEnable()`, `Start()`, `FixedUpdate()`, `Update()`, `LateUpdate()`, `OnDisable()` et `OnDestroy()` sont reconnues sans `override`. `Awake` attend qu’un GameObject inactif soit activé ; `Start` attend que le composant soit actif et ne se répète pas. La destruction d’un composant ou objet est différée jusqu’à la fin du tick. Stop et le remplacement de scène détruisent les instances natives. Les anciens `WarLikeBehaviour` et leurs `Update(float deltaTime)` restent compatibles.

`gameObject.SetActive`, `enabled`, `isActiveAndEnabled`, `GetComponent<T>`, `GetComponents<T>`, `TryGetComponent<T>`, `AddComponent<T>()`, `Destroy`, `transform`, `Time` et `Input.GetKey/GetKeyDown` sont disponibles. `GetComponent<Transform>()` retourne le même wrapper que `transform`. Les vecteurs utilisent **System.Numerics.Vector3** et ses membres `X/Y/Z`, pas `UnityEngine.Vector3`. Les transformations sont mondiales ; aucun parent natif n’est encore résolu, donc `activeInHierarchy` suit `activeSelf`. Les callbacks doivent être synchrones ; les coroutines et les callbacks de collision Unity ne sont pas implémentés.

Les champs publics modifiables et les champs privés `[SerializeField]` de type `float`, `int`, `bool`, `string` ou `Vector3` apparaissent dans **C# Runtime → Inspecter la sélection**. Les remplacements sont enregistrés dans `csharpScript.values` avant `Awake`. Les membres retirés d’un script ne cassent pas une ancienne scène. Les propriétés annotées `[InspectorField]` des composants natifs existants gardent leur validation.

Le C# s’exécute avec les droits du processus local : utiliser des sources de confiance. L’export Web bloque les scripts natifs actifs et explique comment revenir à WarScript. Cette API rapproche le workflow d’Unity, sans fournir `UnityEngine` ni rendre tous ses packages compatibles. Référence : [ordre des événements Unity](https://docs.unity3d.com/6000.1/Documentation/Manual/execution-order.html).

Le bridge ajoute `POST /scripts/compile` (sources, classes, diagnostics) et `POST /stop` (révision attendue). `GET /health` reste au protocole 3 et annonce `native-script-compiler` et `mono-behaviour`. Les sources compilées sont limitées à 32 fichiers de 64 Ko ; les erreurs de compilation conservent la dernière compilation réussie. La position, la rotation Y, la santé et l’activation des acteurs sont synchronisées par `/frame`, avec les touches de l’image. Les transformations X/Z de rotation et les champs privés arbitraires ne constituent pas une sauvegarde native complète.
