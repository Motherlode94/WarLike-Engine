# Langages de scripts dans WarLike

Le noyau Web reste en JavaScript/TypeScript. **WarScript est le langage principal de gameplay simplifié**, et les comportements peuvent aussi être écrits en JavaScript, TypeScript ou C# natif.

| Langage | Exécution | Play Web | Export Web |
| --- | --- | --- | --- |
| WarScript `.wls` | Interpréteur intégré, champs publics et callbacks simples | Oui | Oui |
| JavaScript `.js` / `.mjs` | Modules ES natifs du navigateur | Oui | Oui |
| TypeScript `.ts` | Compilation dans Script Studio, puis module JavaScript conservé dans le projet | Oui, après compilation | Oui, avec le JavaScript produit |
| C# `.cs` | Roslyn et .NET 8 dans le bridge local, MonoBehaviour | Choisir Play C# local | Les composants natifs actifs sont signalés et bloquent cet export |

## Attacher un script

Sélectionner un GameObject, ouvrir **Ajouter un composant** puis choisir WarScript ou **JavaScript / TypeScript** dans l’onglet Jeu Web, ou **Script C# local** dans l’onglet C# local. **Modifier le script** ouvre Script Studio intégré. Créer un fichier avec la bonne extension puis Ctrl+S l’attache à l’objet depuis lequel l’éditeur a été ouvert. Plusieurs scripts peuvent cohabiter sur un objet ; leurs données d’instance sont séparées.

Les fichiers liés sont relus après leur sauvegarde externe. Arrêter Play avant de synchroniser un changement de source. Les versions non enregistrées restent dans les brouillons de Script Studio.

## JavaScript et TypeScript

Ces langages utilisent des exports ES nommés pour le cycle de vie. L’objet `ctx` donne accès à la scène courante ; `ctx.fields` conserve les données propres à l’instance.

```javascript
export const fields = { speed: 45 };

export function Start(ctx) {
    ctx.Log("JavaScript prêt");
}

export function Update(ctx) {
    ctx.Rotate(ctx.fields.speed * ctx.Time.deltaTime);
    if (ctx.Input.GetKeyDown("e")) {
        ctx.Set("activated", true);
        ctx.Signal("script:activated");
    }
}
```

L’Inspector affiche les **remplacements des champs en JSON** : par exemple `{"speed":120}` remplace la valeur déclarée par `fields`. Le module est chargé au lancement de Play ; les valeurs ne sont pas obtenues en exécutant le code pendant l’édition.

Les exports `Awake`, `Start`, `FixedUpdate`, `Update`, `LateUpdate`, `OnEnable`, `OnDisable` et `OnDestroy` sont reconnus, ainsi que leur forme commençant par une minuscule (`update`, `fixedUpdate`, `onEnable`, etc.). Les callbacks doivent être synchrones ; les fonctions `async` sont refusées. Pour stocker une progression sauvegardable, utiliser `ctx.fields` et des données JSON finies, sans fonctions ni références cycliques. Des variables au niveau du module restent communes aux objets qui partagent le fichier ; elles ne constituent pas une sauvegarde de partie.

| Contexte | Rôle |
| --- | --- |
| `ctx.enabled`, `ctx.isActiveAndEnabled` | Activer le composant courant et lire son état combiné avec celui de l’objet |
| `ctx.gameObject.activeSelf`, `.SetActive(bool)` | Lire ou changer l’activation de l’objet, sans changer sa préférence de rendu |
| `ctx.entity`, `ctx.entities` | Objets réellement utilisés par le moteur et Blueprint |
| `ctx.fields` | Données propres à ce composant, issues de `fields` puis des remplacements Inspector |
| `ctx.Time.deltaTime/time/fixedDeltaTime` | Horloges en secondes |
| `ctx.Input.GetKey/GetKeyDown` | Entrées filtrées par les menus et journaux |
| `ctx.Move(x,y,z)`, `ctx.Rotate(angle)` | Mouvements avec collision et rotations sur l’objet courant |
| `ctx.transform.position`, `.Translate`, `.Rotate` | Position en mètres et alias des transformations |
| `ctx.GetComponent("controller2d")` | Référence directe à un composant Web de l’objet courant |
| `ctx.Get`, `ctx.Set`, `ctx.Signal` | Variables et signaux partagés avec Blueprint et WarScript |
| `ctx.Log` | Console du moteur |

Les champs `ctx.entity.x/y` conservent les unités internes de scène (64 par mètre) ; `ctx.transform.position` et `ctx.Move` utilisent les mètres, comme le C# natif.

Les modules s’exécutent nativement dans le navigateur. Ils constituent du code de projet de confiance et ne sont pas soumis au budget d’opérations de WarScript. L’API attend des callbacks synchrones ; programmer des mutations différées de scène par des timers ou Promises n’appartient pas au contrat de simulation. Cette première intégration charge des modules autonomes ; elle ne fournit pas encore de bundler pour résoudre des imports relatifs entre fichiers ou des paquets npm.

### TypeScript

Créer un `.ts` dans Script Studio. **Vérifier / compiler** et **Ctrl+S** utilisent le véritable compilateur TypeScript fourni par Monaco, avec diagnostic syntaxique et sémantique. Monaco doit être disponible pour compiler ; cette étape nécessite l’accès à son CDN lors du chargement initial.

Le JavaScript produit et la source exacte correspondante sont conservés dans le projet. Le jeu exporté utilise ce JavaScript sans compiler de TypeScript et sans charger Monaco pour exécuter le gameplay. Une modification externe invalide le résultat précédent : recompiler et enregistrer avant Play ou l’export. Le contrôle d’export refuse un `.ts` attaché sans résultat de compilation à jour.

## Un état de scène partagé

Sur chaque image autorisée de simulation, le moteur applique d’abord les écritures C# natives éventuelles, puis les callbacks JS/TS, WarScript, composants et gameplay/Blueprint Web. Les callbacks tardifs Web passent après le gameplay. La pause suspend ces mises à jour. En coop, l’hôte exécute les scripts Web. Stop restaure la copie de scène d’édition.

WarScript et JS/TS utilisent le même cycle d’activation. `Awake` s’exécute une fois quand l’objet est actif, puis `OnEnable` à chaque activation du composant ; `Start` ne s’exécute qu’une fois avant ses premières mises à jour. Les instances d’un même runtime sont éveillées avant sa première passe de `Start`. `OnDisable` précède `OnDestroy` au retrait ou à Stop pour un composant encore actif. Le nettoyage reste possible après une erreur de mise à jour. Un script désactivé au chargement reste disponible pour une activation ultérieure. Dans l’Inspector, la case d’activation de chaque WarScript ou script JS/TS reste utilisable pendant Play ; les autres propriétés restent protégées. Ces changements de simulation sont rétablis à Stop. Pause suspend ces callbacks. L’ajout d’un nouveau module JS/TS après le chargement nécessite de relancer Play.

Les détails des API et de leurs limites figurent dans [WarScript](warscript.md) et [C# MonoBehaviour natif](../csharp/README.md). L’objectif est un workflow familier ; le runtime ne distribue pas `UnityEngine` et ne rend pas automatiquement compatibles tous les packages Unity.
