# WarScript · C# simplifié

WarScript est le langage `.wls` de WarLike. Il s’inspire de C# mais s’exécute directement dans le navigateur via un interpréteur dédié, sans traduction en JavaScript ni .NET obligatoire. Le même runtime accompagne le jeu exporté. Le C# natif `.cs` reste disponible en parallèle via le bridge .NET.

## Créer et utiliser un comportement

1. Sélectionner un GameObject, **Ajouter un composant → Jeu Web → WarScript · C# simplifié**.
2. Déplier le composant **WarScript** puis **Modifier le WarScript**. On peut aussi ouvrir **Window → Script Studio** et créer un `.wls`.
3. Écrire le code, utiliser **Vérifier / compiler** et enregistrer avec Ctrl+S. Le script est attaché à l’objet depuis lequel Script Studio a été ouvert.
4. Régler ses champs publics dans l’Inspector puis lancer Play. Arrêter Play avant de changer les sources. Les fichiers liés suivent leurs sauvegardes externes, comme les autres scripts de Script Studio.
5. Enregistrer le projet puis exporter le jeu Web. Les erreurs WarScript bloquent Play et l’export avec le nom de l’objet, la ligne et la colonne.

```csharp
public float speed = 45;
private float elapsed = 0;

Start() {
    Log("Comportement prêt");
}

Update() {
    elapsed += Time.deltaTime;
    Rotate(speed * Time.deltaTime);
    if (Input.GetKeyDown("e")) {
        Set("lastInteraction", elapsed);
        Signal("script:interaction");
    }
}
```

`class Nom { … }`, `public` et `void` sont facultatifs. Les points-virgules peuvent être remplacés par un retour à la ligne à la fin d’une instruction. Les noms des champs et méthodes sont sensibles à la casse. Les commentaires `//` et `/* … */` sont acceptés.

## Syntaxe v1

Types : `float`, `int`, `bool`, `string`, `Vector3`, `var`. Les champs déclarés en tête de script sont publics par défaut ; `private` les masque dans l’Inspector. Les variables locales appartiennent à leur méthode ou leur bloc. Les valeurs publiques enregistrées sont propres à chaque GameObject, même lorsque plusieurs objets partagent le même fichier.

Les conditions `if` / `else`, `return`, affectations `=`, `+=`, `-=`, `*=`, `/=`, `++`, `--`, calculs, comparaisons et opérateurs `&&`, `||`, `!` sont disponibles. Des méthodes personnelles sans paramètre peuvent être appelées depuis d’autres méthodes. Un `Vector3` se crée avec `Vector3(x,y,z)` ou `new Vector3(x,y,z)` ; l’addition, la soustraction et la multiplication/division par un nombre sont prises en charge.

| Méthode | Appel par le moteur |
| --- | --- |
| `Awake()` | Une fois quand l’objet devient actif, même si le composant est désactivé |
| `OnEnable()` | À chaque activation du composant sur un objet actif |
| `OnDisable()` | À chaque désactivation, avant le nettoyage final |
| `Start()` | Une fois avant les mises à jour |
| `FixedUpdate()` | Pas de simulation de 0,02 s |
| `Update()` | Une fois par image de simulation active |
| `LateUpdate()` | Après les composants et le gameplay de cette image |
| `OnDestroy()` | À la suppression du composant, au remplacement de scène ou à Stop |

`Awake` et `Start` ne se répètent pas lors d’une réactivation. `enabled = false` suspend uniquement ce script ; `gameObject.SetActive(false)` suspend l’objet et tous ses scripts. Le moteur observe ces changements aux frontières des callbacks. Un changement dans `Awake`, `OnEnable` ou `Start` peut donc empêcher les callbacks suivants de cette image. `OnDestroy` est appelé une seule fois pour les instances déjà éveillées, même si elles ont été désactivées ou mises en erreur. Un objet resté inactif depuis le chargement n’est pas éveillé et ne reçoit pas `OnDestroy`.

Un composant désactivé ne reçoit plus les mises à jour. Pause suspend le traitement ; les menus et journaux filtrent les touches lorsque l’interface accapare les entrées. Les champs d’instance sont sérialisés dans la sauvegarde de partie, et Stop restaure la scène d’édition. En coop, seul l’hôte exécute les WarScripts.

## API v1

| API | Utilisation |
| --- | --- |
| `Time.deltaTime`, `Time.fixedDeltaTime`, `Time.time` | Temps en secondes ; le pas fixe utilise 0,02 s |
| `Rotate(angle)` / `Rotate(x,y,z)` | Rotation en degrés ; la forme courte agit autour de l’axe principal 2D/3D |
| `Move(x,y,z)` | Déplacement avec collisions, en mètres ; en 2D utiliser X/Y, en 3D X/Z au sol et Y vertical |
| `transform.Translate(x,y,z)`, `transform.Rotate(…)` | Alias de Move et Rotate |
| `transform.position` / `.x`, `.y`, `.z` | Position en mètres ; une affectation directe téléporte l’objet |
| `transform.rotation.x/y/z` | Angles en degrés |
| `Input.GetKey("d")`, `Input.GetKeyDown("e")` | Touche maintenue ou pressée cette image |
| `Get("nom")`, `Set("nom", valeur)` | Variables globales partagées avec Blueprint ; une variable absente vaut 0 |
| `Signal("nom")` | Déclenche les comportements Blueprint qui écoutent ce signal |
| `Log(valeur)`, `Debug.Log(valeur)` | Console du moteur |
| `SetVisible(bool)`, `SetLight(bool)`, `SetHealth(nombre)` | Rendu, activation de la lumière et santé |
| `enabled`, `isActiveAndEnabled` | Activation du script courant (booléen modifiable) et état combiné script/objet en lecture seule |
| `gameObject.activeSelf`, `gameObject.SetActive(bool)` | État et activation de l’objet ; le choix de visibilité du Renderer est conservé |
| `light.intensity`, `light.enabled`, `health`, `gameObject.active` | Propriétés modifiables de l’objet courant |
| `vehicle.maxSpeed/acceleration/brakeForce/turnRate` | Paramètres du véhicule, en unités de scène/s et degrés/s selon le champ |
| `controller.walkSpeed/sprintSpeed/jumpSpeed` | Contrôleur 2D existant, en unités de scène/s |
| `world.timeScale` | Cycle de survie existant, secondes de jeu par seconde réelle |
| `Mathf.Sin/Cos/Abs/Min/Max/Clamp` | Calculs numériques ; angles trigonométriques en radians |

Le moteur conserve 64 unités de scène par mètre. WarScript agit sur les mêmes entités que les composants et Blueprint ; il ne crée pas un deuxième état de scène. Dans Play C# local, les écritures natives arrivent avant WarScript et le gameplay Web.

## Périmètre

WarScript v1 n’est pas un compilateur C#. Il n’implémente pas les imports, bibliothèques .NET, boucles, tableaux, héritage, paramètres de méthodes, coroutines ni callbacks de collision. Pour du C# complet, choisir `.cs` et `MonoBehaviour` dans le runtime .NET.

Chaque script est limité à 64 Ko, 64 champs et 32 méthodes ; chaque appel de cycle de vie a un budget de 4096 opérations et une profondeur de 8 appels. Maximum : 8 scripts attachés par objet et 64 actifs par scène. Une erreur arrête le composant concerné et s’affiche dans Console ; les autres composants continuent. Corriger puis relancer Play.

Voir aussi : [Animation Studio et API Animator](animation-studio.md).
