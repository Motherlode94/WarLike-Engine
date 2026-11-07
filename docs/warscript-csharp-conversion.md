# WarLike Script Bridge — conversion WarScript → C#

Cette bibliothèque est **propre à WarLike Engine**. Elle ne copie pas l'API Unity ; elle convertit les instructions effectivement reconnues par notre parser WarScript v1 en code `WarLike.Runtime.MonoBehaviour` utilisable par le backend C# natif.

## Utilisation

1. Ouvre **WarLike Script Studio** (`script-editor/index.html`) et un fichier `.wls`.
2. Clique **WarScript → C#**.
3. Si la conversion est possible, un nouveau fichier `.cs` s'ouvre dans un onglet éditable. Tu peux ensuite le télécharger ou l'enregistrer.
4. Compile le C# dans le backend .NET WarLike (ou un projet qui référence `csharp/WarLike.Runtime`). Une conversion réussie **n'exécute pas** le C# dans le navigateur.

En cas d'API WarScript incompatible, la conversion échoue **sans générer un faux script compilable**. Les diagnostics indiquent les lignes concernées. Ton fichier `.wls` reste intact.

## Architecture

| Fichier | Rôle |
|---|---|
| `script-editor/warscript.js` | Parser et validation WarScript d'origine |
| `script-editor/warscript-to-csharp.js` | Transpileur depuis l'AST validé, avec erreurs explicites |
| `csharp/WarLike.Runtime/WarScriptCompat.cs` | Petits adaptateurs natifs de propriétés de transformation |
| `script-editor/app.js` | Commande UI et création de fichier C# |
| `tests/warscript-to-csharp.test.mjs` | Tests de génération et de refus des incompatibilités |
| `csharp/WarLike.Tests/GeneratedWarScriptSmoke.cs` | Compilation .NET d'un script **produit par le transpileur** |

## Correspondances principales

| WarScript | C# natif |
|---|---|
| `Update() { ... }` | `private void Update() { ... }` |
| `public float speed = 2;` | `public float speed = 2;` |
| `Move(x, y, z)` | `transform.Translate(x, y, z)` |
| `Rotate(x, y, z)` | `transform.Rotate(x, y, z)` |
| `Time.deltaTime` | `Time.deltaTime` |
| `Vector3(x,y,z)` | `new Vector3(x,y,z)` |
| `transform.position.x += 1` | `WarScriptCompat.SetPositionAxis(this, 'X', transform.position.X + 1)` |
| `Animator.SetTrigger("Attack")` | `GetComponent<Animator>()?.SetTrigger("Attack")` |
| `Log("Hello")` | `Debug.Log("Hello")` |

## Limites explicites

- L'API WarScript des variables globales `Get` / `Set` / `Signal` n'a pas d'équivalent garanti dans `WarLike.Runtime` : **refus de conversion**.
- Les paramètres directs `vehicle.*`, `controller.*`, `world.timeScale`, `light.*` et la visibilité graphique `SetVisible` ne sont pas traduits sans bridge natif équivalent.
- Les champs `var` n'ont pas de type statique sûr à émettre. Déclare `float`, `int`, `bool`, `string` ou `Vector3`.
- Les scripts C# ont besoin de la connexion au runtime .NET natif. Les différences de comportement des physiques et des scènes entre les deux backends doivent être testées.
- L'AST v1 ne propose pas les boucles `for` / `while`, fonctions avec paramètres, ni les closures : le transpileur ne les invente pas.

La priorité est **un résultat correct et vérifiable**, pas un pourcentage de conversion artificiel.
